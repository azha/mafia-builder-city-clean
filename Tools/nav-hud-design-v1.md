# Design — « district plein + navigation + HUD v3.1 » (v2, 2026-08-20)

Auteur : spec-writer. Relecteur ⊥ : autre agent. **Aucun fichier de code touché par ce document.** Toute ancre citée a été **ouverte et lue** ; tout compte vient
d'une commande exécutée. Dépôt Unity `/home/erutheone/project/mafia-builder-city-clean` (remote `git@github.com:azha/mafia-builder-city-clean.git`, `main`, tip
`b38bc23`) ; dépôt back `/home/erutheone/project/mafia-clean-city`. Mondes dégénérés de toutes les falsifiables : **§8** (source unique).

**Delta v1 → v2 — le texte NEUF est l'endroit le plus suspect, à relire en priorité** : §1.0 (sonde redéfinie), §1.2 (aire opaque au lieu de bbox), §1.4 (ancres),
§2.1/§2.3 (2 rangs × 2 façades), §2.6 (cibles redérivées), §2.7 (amb-F6, amb-F8), §3.4 (marges décomposées), §3.6 (nav-F5 reciblée), §4 (rue-F4), §5 (trois tokens
distincts, hd-F2), §6.1/§6.2/§6.4 (D3 mesuré, appelant heat, résolveur existant), §7 (reclassement), §8.

## 0. Périmètre et ordre

| # | chunk | ce qu'il livre | falsifiables |
|---|---|---|---|
| 1 | **Remplissage ambiant** | parcellaire + façades ambiantes sur les blocs non possédés | amb-F1..F8 |
| 2 | **Navigation** | « Entrer » / « ← Carte », insets de chrome, protocole r9 | nav-F1..F5 |
| 3 | **Rues** | gouttières, trottoirs, flaques de lampadaire | rue-F1..F4 |
| 4 | **Hors-district** | ville au loin + brume — le SUJET, pas le décor | hd-F1..F2 |
| 5 | **HUD v3.1** | câblage session→TopBar, manomètre heat, day_phase | hud-F1..F6 |

**Scellé, non rouvert** : palette, contrastes, **échelle** (`metresParBloc`), calques (convergence ⊥ r5-r6, `Tools/district-pixelperfect-notes.md` §« Round 5-6 »).
Les 51 clés de `DesignTokens` (`CanonPaletteBridgePlayModeTests.cs:46`, `ExpectedTokenCount = 51`) sont un ensemble **fermé** : aucun chunk n'ajoute de teinte.
Besoin d'une teinte hors des 51 ⇒ **STOP + remontée**.

## 1. Le territoire mesuré

### 1.0 La sonde de composition — définie ici, exécutée par moi, seule source des chiffres de §2.6 et §5

Luminance Rec.601 · image ramenée à **360 px de large** · fenêtre **7×7** · un pixel est *plat* si l'écart-type de sa fenêtre est **< 2** · régions = composantes
**4-connexes** sur la luminance quantifiée en **32 niveaux**. ⚠️ **Les chiffres de platitude qui circulaient (deux taux plein cadre, deux quantiles de sd, trois taux
intra-façade) viennent d'une sonde dont je n'ai pas les paramètres, et ma sonde ne les reproduit pas — l'écart va de 14 à 26 points sur les taux.** Je ne les recopie
donc pas ici et ne m'en sers plus : tout §2.6 est rebâti sur les valeurs ci-dessous.

| portée | platitude | sd p50 | sd p75 | sd p90 |
|---|---|---|---|---|
| référence `DISTRICT_ZO_NUIT_FINAL.png`, plein cadre | **24,0 %** | 6,31 | 17,16 | 28,72 |
| `diorama_nuit_r8.png`, plein cadre | **76,6 %** | 0,00 | 0,70 | 11,21 |
| r8, bbox de grille `(104,128)-(981,485)` | **68,7 %** | 0,00 | 6,90 | 14,03 |
| r8, **bande BÂTIE** (les 4 bâtiments) `(104,128)-(460,232)` | **43,0 %** | 6,72 | — | — |
| r8, même rangée **sans bâtiment** `(460,128)-(981,232)` | **73,7 %** | 0,00 | — | — |
| r8, 3 rangées de **sol nu** `(104,232)-(981,485)` | **79,1 %** | 0,00 | — | — |

Les trois dernières lignes sont l'**ancre empirique** de §2.6 : dans CE moteur, à CETTE échelle, avec CES sprites, une bande densément bâtie mesure **déjà 43,0 %**,
un sol nu **79,1 %**.

### 1.1 Le trou de densité, et où vit vraiment la platitude

`diorama_nuit_r8.png` (1100×577), balayage PIL, fond `(34,39,50)`, y ≥ 100 : bbox du cadre de grille `x 104..980, y 128..484` = **877×357** = **49,3 %** du cadre ;
cellule implicite **≈ 87,7 px** (877/10). Blocs occupés : **4 sur 40** (`DistrictInteriorDioramaPlayModeTests.cs:141-142`).

Régions uniformes (sonde §1.0) — j'ai réécrit et exécuté la sonde pour corroborer les valeurs transmises plutôt que les recopier : plus grande région **5,33 %** en
référence (⊥ : 4,80) contre **52,74 %** à l'écran (⊥ : 51,44) ; nombre de régions **32 629** contre **816**, facteur **×40** (⊥ : ×49). Concordance à ±0,6 pt sur la
plus grande région, même ordre de grandeur sur le facteur ⇒ **je ne me sers de la plus grande région que comme gate, du facteur que comme tendance.**

**Prédiction du ⊥ corroborée par une troisième voie, géométrique** : 51-53 % ≈ le complément de la bbox de grille (100 − 49,3 = **50,7 %**). La région dominante
**n'est pas dans la grille** : c'est le fond hors-district (`DistrictInteriorScreenController.cs:229-231`, `nightOutOfDistrictMuted` étiré sur toute la racine).
**Aucun remplissage de grille ne peut la réduire** ⇒ le hors-district est un **sujet** (§5), pas un décor.

### 1.2 Inventaire des sprites — 12 familles, 8 déjà liées, 4 libres, et l'aire OPAQUE

`Assets/Art/Sprites/Batiments/` : **39 PNG** = **12 familles**. **Aucune famille nommée au mandat ne manque.** Largeur-monde à l'échelle ppm 56, fraction de bloc à
`metresParBloc = 16` (valeur **de l'asset** `Assets/Resources/BuildingSpriteSlots.asset`, contre un défaut C# de 22 — `BuildingSpriteSlots.cs:74` ; arbitrage r3,
**décision produit déjà remontée**), et **aire opaque mesurée à l'échelle écran** (α ≥ 128, k = 87,7/(16×56)). Colonne « slot » = résolution GUID → nom de fichier :

| famille | m | frac. bbox | **aire opaque / cellule** | slot |
|---|---|---|---|---|
| usine | 21,91 | 1,37 | **0,743** | `lab` |
| bar_hero | 12,20 | 0,76 | **0,373** | `cashSafehouse` |
| hotel | 7,23 | 0,45 | **0,244** | — **libre** |
| entrepot | 10,11 | 0,63 | **0,159** | `stash` |
| residentiel3/4/5 | 6,86-6,88 | 0,43 | **0,144** | `growHouse` / **libre** / **libre** |
| residentiel2 | 6,88 | 0,43 | **0,139** | `fallback` |
| diner | 6,34 | 0,40 | **0,104** | — **libre** |
| epicerie | 5,34 | 0,33 | **0,094** | `frontShop` |
| laverie | 5,20 | 0,32 | **0,089** | `moneyHolding` |
| barbier | 4,55 | 0,28 | **0,087** | `dealerSpotFront` |

⚠️ **Correction de la v1.** J'y écrivais qu'une façade couvre « ≈ 22 % de sa cellule », par le produit des fractions de **boîte englobante**. C'est faux : une bbox
de sprite est majoritairement transparente. L'aire **opaque** pondérée par le mélange `verge` (§2.5) vaut **0,131 cellule par façade, soit 13,1 %** — presque deux
fois moins. Le remplissage de silhouette mesuré va de 0,57 (usine) à 1,00 (hotel). C'est cette valeur, et elle seule, qui entre dans l'arithmétique de §2.6. ⇒ **4
familles libres seulement** : `diner`, `hotel`, `residentiel4`, `residentiel5`.

**Ce qui manque réellement** — `find Assets/Art` sur `rue|route|trottoir|asphalte|street|road|sidewalk|skyline|ville|lampad|lamp|pool|flaque|horizon`, insensible à
la casse ⇒ **0** ; **contrôle positif** sur `nuit` ⇒ **27**. Aucun sprite de rue, trottoir, ville-au-loin, flaque : §4 et §5 les construisent avec des **tokens
existants**. Annexe : `hotel_nuit_ov_sign.png` (GUID `5af036cb…`) apparaît **0 fois** dans l'asset et `OverlaySet` ne déclare que 4 couches (`fen/neon/dev/actif`,
`BuildingSpriteSlots.cs:70`) — **asset importé sans consommateur**, consigné.

### 1.3 `ContentSlot` est PLEIN CADRE — la prédiction r7 #1 est réfutée sur sa prémisse (confirmé à la source)

**Trois sources concordantes** : (1) `AppShell.cs:169` — `Stretch(ContentSlot, Vector2.zero, Vector2.zero)`, et `Stretch` pose `anchorMin = zero / anchorMax = one /
offsets = 0` (`:273-279`) ⇒ **`ContentSlot.rect == Canvas.rect`** ; (2) `AppShell.cs:28-32` : les barres sont des frères d'indice **supérieur**, un locataire plein
écran « reste toujours **sous** les deux barres » ; (3) `Assets/Scripts/ShellContracts/IShellTenant.cs:12-14` : monté dans le shell, un fond plein écran «
**RECOUVRE** TabBar + TopBar — ni détruites ni recréées, simplement cachées ».

`TopBarSlot` = **56 px** en haut (`AppShell.cs:176-180`), `TabBarRoot` = **64 px** en bas (`:201-205`) : ils **chevauchent** `ContentSlot`. ⇒ `root.rect` est
**identique** monté ou nu ; les marges ne sont **pas** comptées deux fois. **Le défaut existe d'une autre forme** : le titre est ancré en haut de `root`,
`anchoredPosition = (0, −8)`, hauteur 32 (`DistrictInteriorScreenController.cs:236-240`) ⇒ il vit **entièrement dans les 56 px du TopBar** et est **occulté**. §3.4.

### 1.4 Deux maillons de câblage morts côté client (socle, forme C : l'appelant manque)

| symbole | appelants de PRODUCTION | seuls appelants trouvés |
|---|---|---|
| `TopBarController.Load` (`TopBarController.cs:68`) | **0** | `TopBarControllerPlayModeTests.cs:101,107,136,159` (**quatre**) |
| `SessionClient.OpenSession` (`SessionClient.cs:24`) | **0** | 8 fichiers de test |
| `OrgVitalsPanelController` (instanciation) | **0** | `OrgVitalsPanelControllerPlayModeTests.cs:41` |

`AppShell` construit le TopBar (`:190`) et **ne l'alimente jamais** : en exécution réelle il affiche pour toujours ses valeurs de construction — `"Boss"`, `"Day —"`,
`"[ ] Clear"`, `"—"` (`TopBarController.cs:178-181`). **Le chunk 5 livre le MAILLON d'abord.** *(v1 disait « trois maillons » ; `OrgVitalsPanelController` reste sans
appelant mais n'est pas sur le chemin du HUD — deux maillons sont à brancher par ce jalon, le troisième est consigné.)*

### 1.5 `day_phase` n'est pas une clé de `session/open` — le plan porte deux faits faux

`Tools/nav-hud-jalon-plan.md:27` annonce « 12 clés, dont » une clé d'horloge à la **minute**. Mesuré : (a) l'ensemble fermé de 12 clés est déclaré à
`session-open-sequence.service.ts:229-246`, la **12ᵉ est `opened_game_day`** (`:246`), miroir C# `SessionDtos.cs:99` — la clé à la minute que le plan nomme n'est la
clé d'**aucune** réponse ; (b) `day_phase` existe sur une **autre** route, `GET /v1/city/district/:id/interior` (interface `district-interior.controller.ts:68`,
alimenté `:135`, résolveur exhaustif sans `default` `:161-172`). Il est **district-scopé** ; **aucune route ne rend un `day_phase` citywide**.

## 2. Chunk 1 — remplissage ambiant

### 2.1 Décision A — le PARCELLAIRE d'abord (axe ⊥ n°1)

`Render` calcule une **partition déterministe** de la grille depuis les seules `(x, y)` de `blocks[]` : **cellule-rue** si `x % streetEveryX == 0 || y % streetEveryY
== 0`, **cellule-parcelle** sinon. Sur la grille J0 (10×4, `x∈0..9`, `y∈0..3`), la valeur retenue `streetEveryX = 5`, `streetEveryY` désactivé donne **2 colonnes × 4
= 8 cellules-rue sur 40, soit 20 %** — c'est le chiffre qui entre dans §2.6. Un bloc **possédé** reste une parcelle du joueur quelle que soit sa classe (§2.4). Les
cellules-rue restent en **sol nu** au chunk 1 et sont **habillées** au chunk 3 : c'est ce qui rend 1 et 3 composables.

### 2.2 Décision B — `AmbientSlots` dans le MÊME asset, sous un champ distinct

`BuildingSpriteSlots` est indexé par `operational_type` (`BuildingSpriteSlots.cs:12`, `Resolve` `:119-134`) ; l'ambiant n'en a pas. ⇒ **un champ nouveau dans le
ScriptableObject existant**, pas un second asset :

```
[System.Serializable] public class AmbientTemplate { public Sprite nuit; public Sprite jour; public int poids; }
[System.Serializable] public class AmbientSet { public AmbientTemplate[] templates; public int streetEveryX; public int streetEveryY; public int rangs; public int façadesParRang; }
public AmbientSet ambientVerge;    // profile == "verge"
public AmbientSet ambientDefaut;   // repli DÉCLARÉ — jamais un null silencieux
public AmbientSet ResolveAmbient(string profile)   // exhaustif, repli nommé
```

Raisons mesurées : (a) le seam `Resources.Load` **unique** du projet (`BuildingSpriteSlots.cs:39`, calqué sur `DesignTokens`) ; (b) `metresParBloc` (`:74`) est
l'échelle **commune** aux deux tables — la dupliquer créerait une valeur à deux propriétaires. **Aucun nom de fichier de sprite en C#** : C6-F3 tient par
construction.

### 2.3 Décision C — **2 rangs × 2 façades**, et pourquoi pas plus

Un rang de façades **sature** : une cellule fait 16 m de large, la largeur moyenne pondérée du mélange `verge` est **6,41 m**, donc **2,5 façades** tiennent de
front. Au-delà, l'union n'augmente plus — empiler des façades sur un seul rang n'ajoute que du recouvrement. Le second rang, **décalé vers le haut** (profondeur),
est ce qui ajoute de l'aire et des silhouettes. ⇒ `rangs = 2`, `façadesParRang = 2` ⇒ **4 façades par parcelle**, aire opaque **≈ 0,35 cellule** après recouvrement
(4 × 0,131 = 0,524 avant recouvrement — le rabais est **DÉDUIT**, et amb-F8 mesure la valeur réelle sur l'artefact).

Placement de la façade *(rang r, index i)* de la parcelle *(x, y)*, tout déterministe, **REUSE du hash maison** (`FloorTint`, `:659` — `x*73856093 ^ y*19349663`)
étendu de `(2i + r)*83492791` :

- **template** : tirage pondéré par `poids`, index `hash % Σpoids` ;
- **ancrage** : pivot bas-centre, `anchorMin = anchorMax = (fx, fy)` avec `fx = (i + 0,5)/2` et `fy = 0` (rang avant) ou `fy = 0,28` (rang arrière), plus un décalage
  latéral `±0,15 · CellSize` issu du hash ;
- **profondeur** : le rang arrière est construit **avant** le rang avant, donc occulté par lui — le tri `(y, x)` existant (`:306-321`) reste la seule autorité entre
  cellules ;
- **échelle** : **exactement** celle des bâtiments joueur, `k = CellSize / (metresParBloc · 56)` (`:401`).

### 2.4 Décision D — recouvrement et priorité (axe ⊥ n°2)

Le tri deux passes `(y, x)` puis `SetAsLastSibling` sur les occupées (`:306-321`) porte **déjà** la profondeur. Les façades ambiantes entrent **dans la passe 1** ⇒
**tout bâtiment joueur passe devant tout ambiant**, gratuitement. **Un bloc possédé ne reçoit jamais d'ambiant** : la boucle `:309-319` teste déjà
`buildingByBlockId.TryGetValue` ; l'ambiant se construit dans la branche `else`, à la place de `BuildEmptyCell` (`:318`, `:629-633`).

**L'ambiant ne porte aucune marque d'état** : ni `Socle` (`:353-386`), ni calque `*Ov` (`:512-526`), ni `LieutenantMarker`, ni `Button`. C'est **ce qui distingue**
une façade ambiante d'un bâtiment joueur quand les deux tirent la même famille — situation **réelle** (8 des 12 familles déjà liées). **Compromis assumé et
réversible** : restreindre l'ambiant aux 4 familles libres est une réassignation d'asset, zéro C#.

### 2.5 Répartition par profil — **DÉDUITE**

`map_district.py` cherché : `find /home/erutheone -maxdepth 6 -name '*map_district*'` ⇒ **0** ; `grep -rl "map_district"` sur les deux dépôts ⇒ **0**. **La référence
n'existe pas sur cette machine.** Distribution **posée** : `verge` → residentiel2/3/4/5 = 4 · epicerie/barbier/laverie/diner = 2 · hotel = 1 ·
bar_hero/entrepot/usine = 0 ; **défaut** → toutes familles à 1. C'est ce mélange qui donne les 0,131 cellule/façade de §1.2. Jour/nuit : **REUSE du résolveur
existant** `ResolveArtPhase` (`:195-205`) — `NIGHT` → `nuit`, `DAWN/DAY/DUSK` → le repli déclaré (`RenderNonHeroFallback`, `:209-221`) ⇒ **l'ambiant n'apparaît qu'au
palier NIGHT**, aucun chemin de jour nouveau.

### 2.6 Cibles chiffrées — DÉRIVÉES de l'ancre empirique, pas d'un modèle

**La cible de platitude de la v1 n'était pas produisible par sa géométrie — le ⊥ a raison, et je ne la recopie pas ici.** Deux corrections de fond : mon modèle
analytique (platitude ≈ 1 − aire couverte) **est faux** — appliqué à r8 il prédit 96,6 % là où la sonde mesure 68,7 %, parce que **la platitude est gouvernée par la
densité d'ARÊTES, pas par l'aire couverte** (les bords de tuiles de sol en produisent déjà beaucoup). Je remplace donc le modèle par une **interpolation entre deux
régimes mesurés sur l'artefact même** (§1.0) : bande bâtie **43,0 %**, sol nu **79,1 %**.

Chunk 1 : 32 parcelles bâties (4 façades chacune, aire opaque ≈ 0,35 — **au-dessus** des 0,342 de la bande bâtie de r8) et 8 cellules-rue restées nues :

> platitude ≈ (32/40) × 43,0 + (8/40) × 79,1 = 34,4 + 15,8 = **50,2 %**

Chunk 3 : les cellules-rue reçoivent bordures, passages et flaques (elles quittent le régime « sol nu ») et les gouttières ajoutent une arête autour de chaque
parcelle. En prenant les rues à 55 % et un gain de 4 pts sur les parcelles :

> platitude ≈ 0,80 × 39,0 + 0,20 × 55,0 = 31,2 + 11,0 = **42,2 %**

| après | métrique | portée | référence | r8 | **cible** | marge sur la dérivation |
|---|---|---|---|---|---|---|
| chunk 1 | platitude (sonde §1.0) | bbox de grille | 24,0 % | 68,7 % | **≤ 58 %** | 7,8 pts sur 50,2 |
| chunk 1 | aire opaque ambiante / cellule-parcelle | bbox de grille | — | — | **≥ 0,25** | 0,10 sur 0,35 |
| chunk 1 | plus grande région uniforme | plein cadre | 5,33 % | 52,74 % | **≥ 45 %** — doit **NE PAS** bouger |
| chunk 3 | platitude (sonde §1.0) | bbox de grille | 24,0 % | 68,7 % | **≤ 50 %** | 7,8 pts sur 42,2 |
| chunk 3 | sd local médian | bbox de grille | 6,31 | 0,00 | **≥ 2,0** | la bande bâtie mesure déjà 6,72 |
| chunk 4 | plus grande région uniforme | plein cadre | 5,33 % | 52,74 % | **≤ 12 %** | arithmétique en §5 |

**Le sd médian ne peut pas être une cible du chunk 1** : à ~50 % de platitude la médiane est exactement sur la frontière et n'est pas stable. Elle ne devient
exploitable qu'au chunk 3 (~42 %). *(La v1 la demandait au chunk 1 : c'était un nombre que la géométrie ne pouvait pas produire, au même titre que la cible de
platitude qu'elle se donnait.)*

**L'écart résiduel à la référence (24,0 %) que je n'essaie pas de fermer** : (1) **cadrage** — la référence est un portrait rapproché (1080×1920, mesuré) dont
**aucun pixel n'est hors-ville**, alors que notre vue a un contour fini et donc un hors-district ; (2) **substrat** — quads 2D à teinte plate contre rendu 3D
éclairé. Les cibles sont des **gates**, et leur détecteur est la sonde §1.0 rejouée après chaque chunk, valeur collée dans les notes du chunk.

### 2.7 Falsifiables du chunk 1

`[Category("W3U2")]`, PlayMode, payload **réel** (patron `DistrictInteriorDioramaPlayModeTests.cs:67-90`), `day_phase` forcé à `"NIGHT"` comme `:143`. Mondes
dégénérés : §8.

- **amb-F1** — deux `Render(dto)` ⇒ même suite de templates par parcelle ; **et** ≥ **4** templates **distincts** sur la grille.
- **amb-F2** — chacun des 4 blocs possédés du J0 porte `BuildingSprite` et **aucun** enfant `Ambient_*` ; **et** le total d'objets `Ambient_*` est **≥ 90** (borne
  basse : au pire des 12 cellules-rue admises par amb-F6, 40 − 12 − 4 possédées = 24 parcelles libres × 4 façades = **96** ; 90 garde 6 de marge d'implémentation).
  Dimensionné par `buildings.Length == 4` et `blocks.Length == 40` (`:141-142`).
- **amb-F3** — aucun `Ambient_*` ne porte de `Button` ni d'enfant `Socle`/`*Ov`/`LieutenantMarker` ; les 7 compteurs de rendu (`RenderedBuildingCount`,
  `RenderedWindowLightCount`, `RenderedNeonGlowCount`, `RenderedSmokeCount`, `RenderedMaintenanceFlickerCount`, `RenderedLieutenantMarkerCount`,
  `ActiveAmbientLoopCount`) **inchangés** à payload égal ; **et**, dans la même assertion, `RenderedBuildingCount == 4` et `RenderedCellCount == 40`.
- **amb-F4** — les sprites portés par les `Ambient_*` sont **inclus** dans `ResolveAmbient(profile).templates`, **et** cet ensemble déclaré est **non vide**.
- **amb-F5** — nombre de **paires** de façades ambiantes dont les rects monde s'**intersectent** > 0 ; **et** positions ancrées **distinctes** == nombre de façades ;
  **et** largeur moyenne ≥ **0,45 × CellSize**.
- **amb-F6** — toute cellule-rue non possédée ne porte **aucun** `Ambient_*` ; **et** `4 ≤ cellules-rue ≤ 12` (la borne haute est celle qui entre dans l'arithmétique
  de §2.6 ; au-delà, la cible de platitude n'est plus dérivable).
- **amb-F7** — `CanonPaletteBridgePlayModeTests.ExpectedTokenCount` reste **51** (`:46`). Détecteur **déjà livré**.
- **amb-F8 (NEUVE)** — l'**aire opaque** des `Ambient_*`, rapportée au nombre de cellules-parcelle, est **≥ 0,25 cellule**. C'est l'**entrée** dont dépend la cible
  de platitude : si la géométrie sous-livre, on le voit à l'entrée, pas seulement à la sortie.

## 3. Chunk 2 — navigation « Entrer » / « ← Carte »

### 3.1 Où vit le seam retour : **dans le SHELL**, à l'intérieur de `TopBarSlot`

(1) **Cycle de vie** : `UnmountCurrentTenant` (`AppShell.cs:131-146`) détruit l'hôte **et tous les enfants de `ContentSlot`** — le propriétaire du cycle de vie est
le shell. (2) **Doctrine de chrome** : les deux barres sont construites une fois et **jamais** touchées par un changement d'onglet (`AppShell.cs:186-187`). (3)
**Invariant de Canvas** : trois falsifiables livrées assertent `childCount == 3` sur la racine du Canvas (`AppShellPlayModeTests.cs:101`, `:126` ;
`DistrictInteriorDioramaPlayModeTests.cs:124`) — un bouton en **4ᵉ enfant du Canvas les ferait rougir** ; enfant de `TopBarSlot`, le compte reste 3. (4)
**Contre-preuve pour l'autre branche** : dans l'écran district, `Render` appelle `ClearContent` (`:168`, `:717-722`) qui détruit **tous** les enfants de `root`, et
`RenderNonHeroFallback` (`:209-221`) étire un panneau plein `root` qui **recouvrirait** le bouton.

⇒ **`TopBarController` gagne une action « leading »** — « étendre le TopBar, pas le remplacer » :

```
public enum LeadingAction { None, BackToMap }            // état NOMMÉ
public LeadingAction CurrentLeadingAction { get; private set; }
public void SetLeadingAction(LeadingAction a, System.Action onClick);
```

Bouton construit **une fois** dans `BuildLayout` (`TopBarController.cs:163-182`), **premier enfant** du `HorizontalLayoutGroup` (`:169`), **jamais détruit** ; seule
sa visibilité suit l'état. Les falsifiables épinglent **la valeur de `CurrentLeadingAction`**, jamais l'absence d'un objet.

### 3.2 Où se construit « Entrer » : **dans `BuildDetailPanel`**, persistant

`RenderDetail` (`CityMapController.cs:584-612`) **détruit tous les enfants de `detailContent`** (`:587`) puis les reconstruit. `BuildDetailPanel` (`:388-446`) crée
`Header` et `Content` comme enfants de `detailPanel` ; la boucle de destruction est **scopée à `detailContent`** (`:443`) ⇒ **un troisième enfant `Footer` de
`detailPanel` survit à tous les rafraîchissements.** Second argument décisif : `RenderDetail` n'est atteint qu'**après** les ~13 requêtes séquentielles de
`BuildDetail` (`:499-574`) ⇒ un bouton construit là serait **absent pendant tout le chargement**.

**Trois points de rafraîchissement de son `interactable`** : `SelectDistrict` (`:449-459`) · juste après `IsAuthenticated = true` (`:120`) · `FinishDetail`
(`:577-582`). Le second n'est pas du zèle : les cellules existent après `Populate` (`:98`), la signature ne démarre qu'à `:102` ⇒ **le panneau peut être ouvert avant
l'authentification**.

### 3.3 Qui porte l'état « on est dans un district » : **`AppShell`**

`MountedTenantGameObject` est un **champ unique** (`AppShell.cs:47`) : un seul locataire à la fois — entrer dans un district **détruit** `CityMapController`, l'état
ne peut donc pas y vivre.

```
public int CityTabDistrictId { get; private set; } = -1;   // -1 = « sur la carte », état NOMMÉ
public void EnterDistrict(int districtId);
public void ExitToCityMap();                                // → ActivateTab(Tab.City)
```

`ActivateTab(Tab.City)` remet `CityTabDistrictId = -1` **avant** de monter ⇒ **re-taper l'onglet City depuis un district ramène la carte**, par le chemin de
remontage ordinaire (`:87-88`, « re-tap = remount, no special-cased no-op ») — **aucune branche spéciale**. `EnterDistrict` réutilise **exactement** le corps de
`MountTenant<T>` (`:111-129`), puis `StartCoroutine(SetSession(token, districtId))` (`DistrictInteriorScreenController.cs:146-154`) et `Render(LastFetch)` (`:164`).

### 3.4 Les marges −100 / −160 : décomposées, sourcées, et le chrome SUBSTITUÉ à la respiration

La v1 posait un partage 80/80 **qui n'était sourcé nulle part** et coûtait 7 % de `CellSize`. Re-dérivation. La seule composante **sourcée** des 160 px est le
bandeau de titre : `anchoredPosition.y = −8`, hauteur 32 (`:236-240`) ⇒ **40 px en haut**. Le reste — **120 px** — est la « respiration » que les notes nomment sans
la répartir (`district-pixelperfect-notes.md`, §« Marges du calcul CellSize »). Elle existe pour que la grille ne touche pas les bords du cadre. **Dans le shell, les
deux barres fournissent déjà cette séparation** : la respiration doit donc leur **céder la place**, pas s'y ajouter.

```
public void SetSafeInsets(float top, float bottom);   // 0/0 hors shell
titreBand   = 40f                                     // sourcé : :236-240
respTop     = max(0f, 60f - insetTop)                 // le chrome SUBSTITUE la respiration
respBottom  = max(0f, 60f - insetBottom)
availW = rect.width  - 100f - (insetLeft + insetRight)
availH = rect.height - (titreBand + insetTop + respTop) - (insetBottom + respBottom)
```

- **Hors shell** (insets 0) : `availH = H − (40 + 0 + 60) − (0 + 60) = H − 160` ⇒ **byte-identique à aujourd'hui** (`:249-250`), les 46 falsifiables convergées ne
  bougent pas.
- **Dans le shell** (56 / 64) : `respTop = 4`, `respBottom = 0` ⇒ `availH = H − (40+56+4) − (64+0) = H − 164`. À 1280×720 sur la grille 10×4 : branche hauteur
  (720−164)/4 = **139**, branche largeur (1280−100)/10 = **118** ⇒ **`CellSize = 118`, identique au montage nu.** Le gain nommé : la grille reste **bornée par la
  largeur** dans les deux montages, au lieu de perdre 7 %.
- **Non-occlusion vérifiée par le calcul** : grille de 4×118 = 472 px centrée à 0,46·720 = 331,2 depuis le bas ⇒ elle occupe [95,2 ; 567,2] ; TabBar [0 ; 64] et
  TopBar [664 ; 720] sont **tous deux dégagés**. Le titre passe à `anchoredPosition.y = −(8 + insetTop)`. nav-F4 est le détecteur pour toute résolution où ce calcul
  ne tiendrait plus.
- **Déviation consignée** : le centrage vertical reste `0,46` ; le centre de la zone sûre serait décalé de `(insetBottom − insetTop)/2 = 4 px`. Non appliqué — 4 px
  ne valent pas un dispositif neuf non relu.

**Les replis 1180/560 deviennent dérivés** : `referenceResolution` du `CanvasScaler` en place, moins la **même** arithmétique (`1180 = 1280 − 100`, `560 = 720 − 160`
⇒ valeurs inchangées à insets nuls). *Monde dégénéré* : un `CanvasScaler` en `ConstantPixelSize` rend `referenceResolution` (0,0) ⇒ replis négatifs ⇒ `CellSize`
retombe sur son **plancher 48** (`:251`), le rendu historique minimal — un échec **nommé**, pas un crash. À écrire tel quel dans le code.

### 3.5 Protocole r9 — les 5 éléments à livrer AVEC le PNG

1. le **chrome du shell dans le cadre** (TopBar et TabBar visibles) ;
2. `root.rect.width` **et** `ContentSlot.rect.width` **en chiffres**, imprimés par le test lui-même ;
3. la **bbox du titre** en px, témoin d'invariance d'échelle canvas ;
4. la **scène** et le **point d'entrée** qui ont produit la capture ;
5. **ajout justifié par une mesure** : `CellSize` et le couple (`uiScaleMode`, `referenceResolution`) — sur `diorama_nuit_r8.png` la cellule **implicite** vaut 87,7
  px alors que la formule à la résolution de référence donne 118, et **je n'ai pas pu réconcilier les deux depuis le seul PNG**. Un chiffre irretrouvable depuis
  l'artefact s'imprime à la capture.

### 3.6 Falsifiables du chunk 2 (mondes dégénérés : §8)

- **nav-F1** — avec jeton, « Entrer » monte un `DistrictInteriorScreenController` dont `LastFetch.district_id == CityMapController.SelectedDistrictId` ; le test
  **sélectionne un district ≠ 16**.
- **nav-F2** — « ← Carte » ⇒ `MountedTenantType == typeof(CityMapController)` **et** l'hôte district précédent `== null` (Unity-destroyed), **pas** `activeSelf ==
  false`.
- **nav-F3** — sans jeton, le bouton « Entrer » **existe** et `interactable == false` ; **anti-vacuité** : après authentification réelle, `interactable == true` sur
  la **même instance**.
- **nav-F4** — monté dans le shell, le rect monde du titre n'intersecte pas celui de `TopBarSlot`, ni celui de `GridArea` celui de `TabBarRoot` ; **et** largeur de
  `GridArea` **≥ 0,6 fois la largeur de `ContentSlot`**.
- **nav-F5 (RECIBLÉE)** — la v1 assertait un `CellSize` **strictement inférieur** dans le shell : avec la substitution de §3.4 les deux valent **118**, l'assertion
  serait rouge sur un design correct. Ce que nav-F5 doit prouver, c'est que les insets sont **consommés** : `titre.anchoredPosition.y` vaut **−8** hors shell et
  **−(8 + insetTop)** dans le shell, avec `insetTop == TopBarSlot.rect.height` asserté **> 0** d'abord (sinon l'écart nul rendrait l'assertion vraie sans rien
  prouver). Dimensionnement : l'écart attendu est **56 px**.

## 4. Chunk 3 — rues, trottoirs, flaques (axes ⊥ n°1 et n°3)

Sur les cellules-rue, **aucun sprite** (il n'en existe aucun, §1.2) — des rects tokenisés : **chaussée** `nightBackground` · **trottoir** `nightFloorAlt`, bande de
`0,18 × CellSize` le long des parcelles adjacentes · **bordure** `nightSocle`.

- **gouttière** : les `Floor_{x}_{y}` sont aujourd'hui **jointifs** (`sizeDelta = (CellSize, CellSize)`, `:288`). Les cellules-**parcelle** rétrécissent de `2 ×
  gutter` (`gutter = 0,06 × CellSize`), les cellules-**rue** restent pleines ⇒ une trame de rues apparaît **sans toucher au placement des façades**, et chaque
  parcelle gagne une arête sur son pourtour.
- **flaques de lampadaire** : disques de `nightWindowLit` (`DesignTokens.cs:145`) en alpha faible, un par intersection de rues, rayon `0,7 × CellSize`, **sous** les
  façades, `raycastTarget = false`.

**Aucune teinte hors des 51.** Si la flaque s'avère illisible avec `nightWindowLit` ⇒ **STOP + remontée**, pas un 52ᵉ token.

Falsifiables : **rue-F1** nombre de rects de chaussée == nombre de cellules-rue (le même qu'amb-F6), **et** largeur d'un `Floor` de parcelle **strictement
inférieure** à celle d'un `Floor` de rue · **rue-F2** nombre de flaques == nombre d'intersections, et **≥ 1** · **rue-F3** aucune flaque n'a `raycastTarget == true`
ni n'est enfant d'une cellule possédée · **rue-F4 (NEUVE)** platitude ≤ 50 % et sd médian ≥ 2,0 dans la bbox de grille (sonde §1.0) — la cible §2.6 du chunk 3,
portée par une falsifiable et non par une note.

## 5. Chunk 4 — le hors-district est le SUJET

Mesuré §1.1 : la plus grande région uniforme (≈ 51 %) **est** le fond hors-district ; la référence n'en a aucune.

**Observation qui corrige le mandat.** `DISTRICT_ZO_NUIT_FINAL.png` (1080×1920, ouverte et regardée) **ne montre ni ciel ni ligne d'horizon** : la caméra est en
plongée, le cadre est occupé bord à bord par de la ville coupée. ⇒ **Une silhouette de skyline ajouterait un élément que la cible n'a pas.** La forme fidèle est une
**ville au loin continue**.

**Correction v1 (BLOCKING ⊥, confirmé par les valeurs de l'asset).** La v1 peignait les masses en `nightOutOfDistrictMuted` **sur un fond `nightOutOfDistrictMuted`**
(`:231`) : atténuer une couleur vers elle-même est un **no-op**, les masses auraient fusionné avec le fond en une seule région, hd-F1 aurait rougi par construction —
et hd-F2, qui ne comptait que des masses, serait **restée verte sur le défaut**. Valeurs lues dans `Assets/Resources/DesignTokens.asset` (luminance Rec.601 en 8
bits, niveau quantifié sur 32) :

| rôle | token | RGB | luminance | niveau |
|---|---|---|---|---|
| fond hors-district (inchangé) | `nightOutOfDistrictMuted` | 0,128 / 0,158 / 0,200 | **39,2** | 4 |
| rang **lointain** | `nightFloorAlt` | 0,290 / 0,325 / 0,400 | **82,4** | 10 |
| rang **médian** | `nightBase` | 0,285 / 0,228 / 0,180 | **61,1** | 7 |
| rang **proche** (au contact de la grille) | `nightSocle` | 0,062 / 0,055 / 0,047 | **14,3** | 1 |

Quatre niveaux quantifiés distincts (4 / 10 / 7 / 1) ; écarts de luminance au fond : **43,2 · 21,9 · 24,9** (le plus serré, 21,9, garde 6,9 de marge sur le seuil de
15 posé en hd-F2). Le rang **proche** est le plus sombre et reprend le token du liseré `GridBorder` (`:274-278`) : au contact de la grille il lit comme une ombre, ce
qui est le bon signe visuel. ⚠️ **Risque nommé** : `nightFloorAlt` et `nightBase` sont **aussi** deux des trois teintes de sol (`FloorTint`, `:663-665`) ; un rang
pourrait fusionner avec une tuile de sol de même niveau s'ils devenaient adjacents. Le rang lointain est le plus clair et le plus éloigné de la grille, le rang
proche (`nightSocle`) n'est pas une teinte de sol — hd-F1 reste le détecteur.

Fenêtres : semis de points `nightWindowLit` à alpha décroissant par rang — le « ville_au_loin émissif » de l'artefact, **avec des clés existantes**. Brume
`nightHaze` (`:326-330`) par-dessus tout, **inchangée** (axe scellé).

**Arithmétique de la cible ≤ 12 %.** La bande hors-district vaut **50,7 %** du cadre (§1.1). Si les masses en couvrent une fraction *c*, le fond résiduel vaut `(1 −
c) × 50,7`. Pour que ce résidu passe sous 12 % il faut `c ≥ 1 − 12/50,7 = 0,763`. ⇒ hd-F2 exige **c ≥ 0,80** (résidu 10,1 %, marge 1,9 pt), et **aucune masse seule >
6 %** du cadre pour qu'aucun rang ne devienne à son tour la plus grande région.

## 6. Chunk 5 — HUD v3.1

### 6.1 Le maillon — et D3 est MESURÉ, plus déduit

**Correction v1.** J'avais classé « `DashboardController` publie-t-il un jeton ? » en DÉDUIT décisif, faute d'avoir trouvé le fichier — je l'avais cherché à
`Assets/Scripts/Operational/`. Il est à **`Assets/Scripts/Operational/Dashboard/DashboardController.cs`**, un répertoire plus bas. Lu dans le corps : `:58-59`
`public bool IsAuthenticated` / `public string Token` ; `:152` `yield return SignIn();` depuis `Boot()` ; `:158` `public IEnumerator SignIn()`, **idempotent** (`if
(IsAuthenticated) yield break;`). ⇒ **D3 se résout favorablement** : l'onglet **Home**, activé par défaut (`AppShell.cs:68`), **possède un jeton et l'expose**. Le
second publieur est à **brancher**, pas à créer.

```
public string SessionToken { get; private set; }
public SessionOpenDto LastSessionOpen { get; private set; }
public void AdoptToken(string token);   // → SessionClient.OpenSession → TopBar.Load(token, backlog_badge, opened_game_day)
```

Deux publieurs, tous deux lus dans le corps : `DashboardController` (`:58-59`, `:152`, `:158`) et `CityMapController` (`:105-124`, `IsAuthenticated = true` à
`:120`). `AdoptToken` est **idempotent** (un second appel avec le même jeton ne rejoue pas `session/open`) — sinon deux locataires qui s'activent l'un après l'autre
ouvriraient deux sessions.

### 6.2 Clés consommées / manquantes — et la route heat a DÉJÀ un appelant de production

| élément HUD | source | statut |
|---|---|---|
| solde (or, chiffres) | `GET /v1/economy/wallet` via `DashboardClient` (`TopBarController.cs:78`) | **déjà consommé** |
| callsign | `GET /v1/me` (`:77`) | déjà consommé |
| point de notification | `backlog_badge` (clé 4/12) | **paramètre**, appelant manquant |
| jour de jeu | `opened_game_day` (clé 12/12, `SessionDtos.cs:99`) | **paramètre**, appelant manquant |
| **manomètre heat** | `citywide_bucket` (`heat.projection.service.ts:59,92`) via `GET /v1/city/district/:id/heat` (`heat.controller.ts:51-52`) | **appelé en production** — voir ci-dessous |
| **day_phase** | **aucune route citywide** (§1.5) | **manquant** |

**Correction v1.** J'y déclarais cette route sans appelant côté shell : faux, et je ne l'avais pas lue dans le corps. `DashboardController` — locataire de l'onglet
Home — **la consomme et la rend déjà** : `:225` `world.GetDistrictHeat(heatProbeDistrictId, Token, …)`, `:322-323` rend `citywide_bucket`, `:375-376` en dérive une
alerte, et `:54-55` porte `heatProbeDistrictId = 16` avec le commentaire « *Any district id 1..18 returns the same citywide_bucket* ». ⇒ Le HUD **ne doit pas ajouter
un troisième appelant** : il lit la valeur que Home a déjà récupérée, via `AppShell`, et ne sonde lui-même que si aucun locataire ne l'a fait. Le district de sonde
**16** est un précédent maison **doublement** attesté (ici et `OrgVitalsPanelController.cs:21`) — jamais un nombre neuf.

### 6.3 `day_phase` : ce que le HUD affiche, et la dette

**Le manomètre affiche `day_phase` uniquement quand le shell est dans un district**, la valeur venant du DTO déjà récupéré
(`DistrictInteriorScreenController.LastFetch`, `:85`) ; ailleurs, un état **NOMMÉ** (`"—"`). Dette back — **forme F, peu coûteuse** : `session.repository.ts:161-165`
**lit déjà** `city_sim_clock.game_minute` et en dérive `openedGameDay` dans la même transaction ; `quarterIndexForGameMinute` (`day-phase-quarter.ts`) est déjà
partagé par deux consommateurs (`deal-lek.service.ts:402`, `district-interior.controller.ts:163`). ⇒ Une 13ᵉ clé `day_phase` s'obtient **sans lecture d'horloge
supplémentaire**, sans écrivain nouveau.

### 6.4 Le manomètre : 3 zones, **4 arrêts** — et le résolveur existe déjà

`HeatBucket` a **4** membres (`city-event-bus.ts:484`). Le HUD validé demande « 3 états » ; écraser 4 en 3 perdrait `BURNING`, l'état le plus tendu. ⇒ **3 zones
peintes** au cadran et **4 arrêts d'aiguille**.

**Ce n'est pas une idée neuve** : `DashboardController.HeatGlyph` (`:460-469`) rend **déjà** une jauge à **4 niveaux** (`[#...]` → `[####]`) pour exactement cette
valeur, et `HeatLabel` (`:449-458`) nomme les 4 buckets avec un repli déclaré. Les deux sont `private static`. ⇒ **Lever la résolution des 4 buckets dans un lieu
unique et repointer les deux appelants** — laisser deux `switch` à 4 branches sur la même énumération est précisément la dérive que ce dépôt a déjà payée sur un type
homonyme. La falsifiable hud-F6 est le garde-fou, et elle reste sur un chemin que les deux surfaces empruntent.

### 6.5 Falsifiables du chunk 5 (mondes dégénérés : §8)

- **hud-F1** — après `AdoptToken(jeton réel)`, `TopBar.Loaded == true` et `RenderedCashText != "—"` ; `wallet.cash_cents` est vérifié d'abord par une requête
  **indépendante** (patron `TopBarControllerPlayModeTests.cs:138-144`).
- **hud-F2** — le résolveur rend **4 angles DISTINCTS** pour les 4 buckets (fonction pure, hors réseau).
- **hud-F3** — `GET /v1/city/district/16/heat` avec jeton réel rend **200 + `payload.data`** (corps de succès exigé), et `citywide_bucket` est **l'un des 4**
  membres.
- **hud-F4** — **REUSE** : `SessionClientPlayModeTests.C3F3_Envelope_TwoTopLevelKeys_TwelveAtPayloadData` (`:243`) compte les clés du **corps brut** et les compare
  au compte de champs du DTO (`:291`) ; `:160` épingle **12**. Le jour où le back ajoute `day_phase`, **ce test rougit en nommant le compte**.
- **hud-F5** — hors district, la valeur rendue est l'état nommé **et** `CityTabDistrictId == -1` dans la même assertion.
- **hud-F6 (NEUVE)** — pour les 4 buckets, l'angle du HUD et le glyphe de `DashboardController` désignent le **même rang** (0..3). Détecteur de dérive entre les deux
  surfaces, sur un chemin que les deux empruntent.

## 7. DÉDUIT vs COMPTÉ

**COMPTÉ** : 39 PNG / 12 familles · largeurs-monde **et aires opaques** (0,131 cellule pondérée `verge`) · 8 familles déjà liées (GUID→nom) · `metresParBloc: 16`
contre 22 en C# · bbox de grille 877×357 = 49,3 % · plus grande région 52,74 % / 5,33 % · les 6 lignes de platitude de §1.0 · `ContentSlot` plein cadre (3 sources) ·
TopBar 56 / TabBar 64 · `childCount == 3` ×3 · destruction scopée à `detailContent` · 13 requêtes de `BuildDetail` · **0** appelant de production pour `TopBar.Load`
et `OpenSession` · **4** appels de test à `Load` · les 12 clés de `session/open` · `day_phase` absent de `session/open` · `HeatBucket` à 4 membres ·
`DashboardController` : jeton public + `SignIn()` idempotent + heat citywide consommé et rendu · `HeatGlyph` déjà à 4 niveaux · les 4 valeurs de tokens de nuit et
leurs luminances · `map_district.py` inexistant · 0 sprite de rue/skyline (contrôle positif à 27).

**DÉDUIT** — **le critère ayant bougé (D3 est passé de « déduit décisif » à « mesuré »), je repasse le test sur tous les autres**, comme l'exige la règle du critère
qui change en cours de classement :

| # | déduit | ça décide ? | traitement |
|---|---|---|---|
| D1 | les cibles de §2.6 | non — **gates**, et désormais dérivées d'ancres mesurées (§1.0) | détecteur = sonde §1.0 rejouée ; amb-F8 et rue-F4 les portent |
| D2 | la distribution par profil (§2.5) | **révisé : OUI, partiellement** — elle fixe les 0,131 cellule/façade qui entrent dans §2.6 | conséquence bornée : amb-F8 mesure l'aire réelle ⇒ un mélange plus maigre est vu **à l'entrée** |
| D4 | « bâtiments contigus jamais superposés » (r7) | non — amb-F5 crée le recouvrement quoi qu'il en soit | corroboré à l'œil sur r8, non re-mesuré |
| D5 | cellule implicite 87,7 px ≠ 118 attendu | non pour le design ; **oui pour la recette** | élément 5 du protocole r9 (§3.5) |
| D6 | une famille déjà liée reste lisible en ambiant | non — compromis nommé, réversible par l'asset | §2.4 ; amb-F3 prouve la distinction structurelle |
| **D7** | l'aire opaque **après recouvrement** ≈ 0,35 (4 × 0,131 avant) | **oui** — c'est l'entrée de la cible de platitude | **amb-F8 la mesure directement** et rougit sous 0,25 |
| **D8** | les rues « dressées » tombent à ~55 % de platitude | oui pour la cible du chunk 3 | **rue-F4** mesure la sortie ; si elle rougit, la cible est révisée avec la mesure en main |

**Ce qui a changé au repassage** : D2 était classé « ne décide pas » parce que je le voyais comme un choix esthétique réversible ; depuis que §2.6 dérive ses cibles
du mélange, il **entre dans une arithmétique** — je le reclasse et je lui attache un détecteur d'entrée (amb-F8) plutôt que de le laisser en « réversible ». D4, D5
et D6 restent indifférents au verdict. **Aucun DÉDUIT décisif ne reste sans détecteur.**

## 8. Falsifiables — récapitulatif et monde dégénéré

| id | ce qu'elle prouve | monde le plus dégénéré qui la rendrait VRAIE, et ce qui le tue |
|---|---|---|
| amb-F1 | déterminisme **et** variété | « tous les blocs, le même template » satisfait le déterminisme ⇒ tué par ≥ 4 templates **distincts** (la propriété qui dégénère est la variété des VALEURS) |
| amb-F2 | priorité du joueur | zéro ambiant partout ⇒ vrai à vide ⇒ tué par le plancher **≥ 90** façades |
| amb-F3 | ambiant inerte | tous compteurs à zéro des deux côtés ⇒ tué par `RenderedBuildingCount == 4` et `RenderedCellCount == 40` dans la même assertion |
| amb-F4 | clôture de la table | table vide ⇒ inclusion triviale ⇒ tué par « ensemble déclaré non vide » |
| amb-F5 | recouvrement réel | (a) toutes les façades au même point ⇒ tué par positions **distinctes** ; (b) sprites minuscules ⇒ tué par largeur moyenne ≥ 0,45 cellule |
| amb-F6 | parcellaire réel | partition « tout ou rien » ⇒ tué par **4 ≤ cellules-rue ≤ 12** (borne haute = celle de l'arithmétique §2.6) |
| amb-F7 | les axes scellés tiennent | détecteur **déjà livré** (`ExpectedTokenCount == 51`) |
| amb-F8 | l'ENTRÉE de la cible de platitude | des façades nombreuses mais **transparentes** rendraient amb-F2 vraie ⇒ tué en mesurant l'aire **opaque**, pas le compte d'objets |
| nav-F1 | Entrer cible le bon district | un district par défaut (16) rendrait vrai un câblage qui ignore la sélection ⇒ tué par « district de test ≠ 16 » |
| nav-F2 | Retour **détruit** l'écran | un écran caché satisfait « la carte est là » ⇒ tué par l'assertion de destruction |
| nav-F3 | affordance gatée | « le bouton est absent » serait satisfait par un panneau qui n'en construit jamais ⇒ tué en épinglant la **valeur** de `interactable` sur la même instance |
| nav-F4 | non-occlusion | `CellSize` au plancher 48 rend tout minuscule et l'assertion triviale ⇒ tué par `GridArea` ≥ 0,6 fois `ContentSlot` |
| nav-F5 | insets **consommés** | hors shell l'écart de titre est nul et l'assertion serait vraie sans rien prouver ⇒ tué en exigeant `insetTop > 0` d'abord ; écart attendu **56 px** |
| rue-F1 | la trame de rues existe VRAIMENT | `gutter = 0` ⇒ rien de visible à l'écran et les comptes restent justes ⇒ tué par « largeur d'un `Floor` de parcelle **strictement inférieure** à celle d'un `Floor` de rue » |
| rue-F2 | les flaques sont posées | zéro intersection ⇒ zéro flaque, et l'égalité des comptes est vraie à vide ⇒ tué par le plancher **≥ 1** flaque |
| rue-F3 | les flaques n'interceptent rien | une flaque **absente** satisfait « aucune n'est cliquable » ⇒ tué en exigeant d'abord le compte non nul de rue-F2 |
| rue-F4 | la cible du chunk 3 est portée | une note dans un fichier ne rougit jamais ⇒ tué en faisant de la platitude une **assertion exécutée** |
| hd-F1 | le hors-district cesse d'être une nappe | — (c'est la mesure de sortie ; sa non-vacuité vient de hd-F2) |
| hd-F2 | masses **distinctes du fond** | des rects peints dans le token du FOND satisfont « ≥ 12 masses » tout en étant invisibles — c'est le défaut que la v1 aurait certifié ⇒ tué par : 4 niveaux quantifiés distincts, écart de luminance ≥ 15 sur chaque paire rang/fond, couverture **≥ 80 %** de la bande, et **aucune masse > 6 %** du cadre |
| hud-F1 | le maillon existe | un jeton vide donne `"—"` ⇒ tué par la vérification indépendante du cash |
| hud-F2 | l'aiguille discrimine | 4 constantes égales ⇒ tué par la clause de **distinction** des 4 angles |
| hud-F3 | vraie réponse | base fraîche répondant `RESOURCE_NOT_FOUND` = enveloppe d'**erreur** satisfaisant toute assertion d'absence ⇒ tué par le **corps de succès** exigé |
| hud-F4 | forme F : une clé qui apparaît | un inventaire de routes resterait vert ⇒ tué en comptant les clés du **corps brut** |
| hud-F5 | état nommé hors district | l'épingle serait vraie pour la mauvaise raison ⇒ tué par `CityTabDistrictId == -1` |
| hud-F6 | pas de dérive entre les 2 surfaces | deux résolveurs qui dérivent séparément restent chacun cohérent ⇒ tué en comparant les **rangs** des deux, sur un chemin que les deux empruntent |

## 9. Runs scopés et juge

Juge batchmode **unique**, qui **s'élargit sans se dupliquer** (`Assets/Editor/MafiaCI.cs:24`, `Categories = { "W4P4a", "W3UDA", "W3U1", "W3U2" }`). Les chunks
**restent en `W3U2`**. Par chunk : `LOG_FILE=… ./Tools/run-unity-check.sh -executeMethod MafiaCI.RunPlayModeTests`, puis lecture de `passed=`/`failed=` — **jamais le
seul code de retour** (`run-unity-check.sh:20-26` : un filtre qui ne matche rien sort aussi `RC=0`). Patron de preuve du filtre :
`Tools/test-run-unity-check-w3u2.sh` (vert / rouge injecté **à travers** le filtre / vert). **Machine calme obligatoire** : un run Unity et une stack Docker en
parallèle produisent des rouges d'environnement. Sérialiser.
