# Design — « district plein + navigation + HUD v3.1 » (v1, 2026-08-20)

Auteur : spec-writer. Relecteur ⊥ : autre agent. **Aucun fichier de code touché par ce document.** Toute ancre citée a été
**ouverte et lue** pendant la rédaction ; tout compte vient d'une commande exécutée. Dépôt Unity
`/home/erutheone/project/mafia-builder-city-clean` (remote `git@github.com:azha/mafia-builder-city-clean.git`, `main`, tip
`b38bc23`) ; dépôt back `/home/erutheone/project/mafia-clean-city`. Les mondes dégénérés de toutes les falsifiables sont
rassemblés en **§8** (source unique — les sections de chunk ne portent que l'assertion et son dimensionnement).

## 0. Périmètre et ordre

| # | chunk | ce qu'il livre | falsifiables |
|---|---|---|---|
| 1 | **Remplissage ambiant** | parcellaire + façades ambiantes sur les blocs non possédés | amb-F1..F7 |
| 2 | **Navigation** | « Entrer » / « ← Carte », insets de chrome, protocole r9 | nav-F1..F5 |
| 3 | **Rues** | gouttières, trottoirs, flaques de lampadaire | rue-F1..F3 |
| 4 | **Hors-district** | ville au loin + brume — le SUJET, pas le décor | hd-F1..F2 |
| 5 | **HUD v3.1** | câblage session→TopBar, manomètre heat, day_phase | hud-F1..F5 |

**Scellé, non rouvert** : palette, contrastes, échelle, calques (convergence ⊥ r5-r6, `Tools/district-pixelperfect-notes.md`
§« Round 5-6 »). Les 51 clés de `DesignTokens` (`CanonPaletteBridgePlayModeTests.cs:46`, `ExpectedTokenCount = 51`,
gdd/14 @6e91edd1) sont un ensemble **fermé** : aucun chunk n'ajoute de teinte. Besoin d'une teinte hors des 51 ⇒ **STOP +
remontée**, jamais un token de plus.

## 1. Le territoire mesuré

### 1.1 Le trou de densité, et où vit vraiment la platitude

`Assets/Screenshots/diorama_nuit_r8.png` (1100×577, capture de recette r8), balayage PIL, fond `(34,39,50)`, y ≥ 100 : bbox du
cadre de grille `x 104..980, y 128..484` = **877×357** = **49,3 %** du cadre ; cellule implicite **≈ 87,7 px** (877/10). Blocs
occupés : **4 sur 40** (`DistrictInteriorDioramaPlayModeTests.cs:141-142`).

Sonde de composition (PIL, luminance quantifiée 32 niveaux, largeur normalisée 360 px, régions 4-connexes) — **réécrite et
exécutée par moi**, pour corroborer les valeurs transmises plutôt que les recopier (un nombre repris d'un rapport reste un fait
déduit) :

| grandeur | référence `DISTRICT_ZO_NUIT_FINAL.png` | écran r8 |
|---|---|---|
| plus grande région uniforme — ⊥ / **ma sonde** | 4,80 % / **5,33 %** | 51,44 % / **52,74 %** |
| nombre de régions — ⊥ / **ma sonde** | 65 672 / **32 629** | 1 350 / **816** |
| facteur de fragmentation | ⊥ : ×49 · **ma sonde : ×40** | |

⇒ Concordance à ±0,6 pt sur la **plus grande région**, même ordre de grandeur sur le facteur, écart ×2 sur le compte absolu de
régions (connexité/quantification différentes). **Je n'utilise donc la plus grande région que comme gate, et le facteur de
fragmentation que comme tendance.**

**La prédiction du ⊥ est corroborée par une troisième voie, géométrique** : 51-53 % ≈ le complément de la bbox de grille
(100 − 49,3 = **50,7 %**). La région dominante **n'est pas dans la grille** : c'est le fond hors-district
(`DistrictInteriorScreenController.cs:229-231`, `nightOutOfDistrictMuted` étiré sur toute la racine). **Aucun remplissage de
grille ne peut la réduire** ⇒ le hors-district est un **sujet** de ce design (§5), pas un décor.

### 1.2 Inventaire des sprites — 12 familles, 8 déjà liées, 4 libres

`Assets/Art/Sprites/Batiments/` : **39 PNG** = **12 familles** × (jour + nuit + 1 à 3 calques). **Aucune famille nommée au
mandat ne manque.** Largeur-monde à l'échelle commune ppm 56 (PIL sur les `*_nuit.png`), fraction d'un bloc à
`metresParBloc = 16` — valeur **de l'asset** (`Assets/Resources/BuildingSpriteSlots.asset`), contre un défaut C# de 22
(`BuildingSpriteSlots.cs:74`) ; arbitrage r3 consigné, **décision produit remontée à l'user**. Colonne « slot » = résolution
GUID → nom de fichier (`BuildingSpriteSlots.asset` ↔ les 39 `.meta`) :

| famille | m | frac. | slot | | famille | m | frac. | slot |
|---|---|---|---|---|---|---|---|---|
| usine | 21,91 | **1,37** | `lab` | | residentiel5 | 6,86 | 0,43 | — **libre** |
| bar_hero | 12,20 | 0,76 | `cashSafehouse` | | diner | 6,34 | 0,40 | — **libre** |
| entrepot | 10,11 | 0,63 | `stash` | | epicerie | 5,34 | 0,33 | `frontShop` |
| hotel | 7,23 | 0,45 | — **libre** | | laverie | 5,20 | 0,32 | `moneyHolding` |
| residentiel2 | 6,88 | 0,43 | `fallback` | | barbier | 4,55 | 0,28 | `dealerSpotFront` |
| residentiel3 | 6,88 | 0,43 | `growHouse` | | residentiel4 | 6,86 | 0,43 | — **libre** |

**Moyenne 8,36 m = 0,52 bloc de large ; hauteur moyenne 6,93 m = 0,43 bloc.** ⇒ **Une façade ambiante par cellule couvre ≈ 22 %
de sa cellule** (0,52 × 0,43). Remplir les 36 blocs vides à raison d'**un** sprite par bloc laisserait ≈ 78 % de la grille en
sol nu : la platitude ne bougerait presque pas. **C'est cette mesure qui commande la forme du chunk 1 (§2.3).** ⇒ **4 familles
libres seulement** : `diner`, `hotel`, `residentiel4`, `residentiel5`.

**Ce qui manque réellement** — `find Assets/Art` sur
`rue|route|trottoir|asphalte|street|road|sidewalk|skyline|ville|lampad|lamp|pool|flaque|horizon`, insensible à la casse ⇒ **0** ;
**contrôle positif** sur `nuit` ⇒ **27** (le zéro n'est donc pas un artefact de motif). Aucun sprite de rue, trottoir,
ville-au-loin, flaque. §4 et §5 les construisent avec des **tokens existants**, jamais avec des PNG à produire.

Annexe : `hotel_nuit_ov_sign.png` (GUID `5af036cb…`) apparaît **0 fois** dans l'asset, et `OverlaySet` ne déclare que 4 couches
(`fen/neon/dev/actif`, `BuildingSpriteSlots.cs:70`) — **un asset importé sans consommateur**. Consigné, hors périmètre.

### 1.3 `ContentSlot` est PLEIN CADRE — la prédiction r7 #1 est réfutée sur sa prémisse

Prédiction transmise : *les marges −100/−160 comptent le chrome deux fois, « chrome DÉJÀ à l'extérieur »*. **Trois sources
concordantes disent l'inverse** : (1) `AppShell.cs:169` — `Stretch(ContentSlot, Vector2.zero, Vector2.zero)`, et `Stretch` pose
`anchorMin = zero / anchorMax = one / offsets = 0` (`:273-279`) ⇒ **`ContentSlot.rect == Canvas.rect`** ; (2) `AppShell.cs:28-32` :
les barres sont des frères d'indice **supérieur**, donc rendues au-dessus, et un locataire plein écran « reste toujours **sous**
les deux barres » ; (3) `IShellTenant.cs:12-14` : monté dans le shell, un fond plein écran « **RECOUVRE** TabBar + TopBar — ni
détruites ni recréées, simplement cachées ».

`TopBarSlot` = **56 px** en haut (`AppShell.cs:176-180`), `TabBarRoot` = **64 px** en bas (`:201-205`) : ils **chevauchent**
`ContentSlot`, ils ne l'insèrent pas. ⇒ `root.rect` est **identique** monté ou nu, les marges ne sont **pas** comptées deux fois.

**Mais le défaut existe, d'une autre forme** : le titre du district est ancré en haut de `root`, `anchoredPosition = (0, −8)`,
hauteur 32 (`DistrictInteriorScreenController.cs:236-240`) ⇒ il vit **entièrement dans les 56 px du TopBar** et est **occulté**.
§3.4 pose la bonne forme.

### 1.4 Trois maillons de câblage morts côté client (socle, forme C : l'appelant manque)

Balayage `Assets/Scripts` + `Assets/Tests` :

| symbole | appelants de PRODUCTION | seuls appelants trouvés |
|---|---|---|
| `TopBarController.Load` (`TopBarController.cs:68`) | **0** | `TopBarControllerPlayModeTests.cs:97,119,155` |
| `SessionClient.OpenSession` (`SessionClient.cs:24`) | **0** | 8 fichiers de test |
| `OrgVitalsPanelController` (instanciation) | **0** | `OrgVitalsPanelControllerPlayModeTests.cs:41` |

`AppShell` construit le TopBar (`:190`) et **ne l'alimente jamais** : en exécution réelle il affiche pour toujours ses valeurs de
construction — `"Boss"`, `"Day —"`, `"[ ] Clear"`, `"—"` (`TopBarController.cs:178-181`). **Le chunk 5 livre donc le MAILLON
d'abord, la jauge ensuite.**

### 1.5 `day_phase` n'est pas une clé de `session/open` — le plan porte deux faits faux

`Tools/nav-hud-jalon-plan.md:27` annonce « 12 clés, dont » une clé d'horloge à la **minute**. Mesuré : (a) l'ensemble fermé de
12 clés est déclaré à `session-open-sequence.service.ts:229-246`, et la **12ᵉ est `opened_game_day`** (`:246`), miroir C#
`SessionDtos.cs:99` — la clé à la minute que le plan nomme n'est la clé d'**aucune** réponse (ses 94 occurrences back sont des
colonnes et des repositories) ; (b) `day_phase` **existe**, sur une **autre** route,
`GET /v1/city/district/:id/interior` (interface `district-interior.controller.ts:68`, alimenté `:135`, résolveur exhaustif sans
`default` `:161-172`). Il est **district-scopé** ; **aucune route ne rend un `day_phase` citywide**. Conséquence : §6.3.

## 2. Chunk 1 — remplissage ambiant

### 2.1 Décision A — le PARCELLAIRE d'abord (axe ⊥ n°1)

Le rendu ne pose **pas** un template par cellule. `Render` calcule d'abord une **partition déterministe** de la grille à partir
des seules `(x, y)` de `blocks[]` : **cellule-rue** si `x % streetEveryX == 0 || y % streetEveryY == 0`, **cellule-parcelle**
sinon. `streetEveryX/Y` viennent de la **table ambiante** (§2.2), jamais d'une constante C#. Un bloc **possédé** reste une
parcelle du joueur quelle que soit sa classe (§2.4). Les cellules-rue restent en **sol nu** au chunk 1 (identique à aujourd'hui)
et sont **habillées** au chunk 3 — c'est ce qui rend 1 et 3 composables : le chunk 3 ne déplace aucune façade.

### 2.2 Décision B — `AmbientSlots` dans le MÊME asset, sous un champ distinct

`BuildingSpriteSlots` est indexé par `operational_type` (`BuildingSpriteSlots.cs:12`, `Resolve` `:119-134`). L'ambiant n'en a
pas : mélanger les deux tables ferait d'un template décoratif un type de jeu. ⇒ **un champ nouveau dans le ScriptableObject
existant**, pas un second asset :

```
[System.Serializable] public class AmbientTemplate { public Sprite nuit; public Sprite jour; public int poids; }
[System.Serializable] public class AmbientSet { public AmbientTemplate[] templates; public int streetEveryX; public int streetEveryY; public int façadesParParcelle; }
public AmbientSet ambientVerge;    // profile == "verge"
public AmbientSet ambientDefaut;   // repli DÉCLARÉ — jamais un null silencieux
public AmbientSet ResolveAmbient(string profile)   // exhaustif, repli nommé
```

Raisons mesurées : (a) le seam `Resources.Load` **unique** du projet (`BuildingSpriteSlots.cs:39`, calqué sur `DesignTokens`) —
un second asset créerait un second seam que rien n'oblige ; (b) `metresParBloc` (`:74`) est l'échelle **commune** aux deux
tables : la dupliquer créerait une valeur à deux propriétaires. **Aucun nom de fichier de sprite en C#** — C6-F3 tient par
construction.

### 2.3 Décision C — plusieurs façades par parcelle (commandée par §1.2)

Une façade moyenne fait **0,52 bloc** ⇒ `façadesParParcelle = 2` par défaut : deux façades côte à côte occupent ≈ 1,04 bloc et
**se touchent ou se recouvrent** (sert aussi l'axe ⊥ n°2). Trois petites (barbier 0,28 + epicerie 0,33 + laverie 0,32 = 0,93)
restent admissibles ; la valeur vit dans l'asset, donc **réversible sans code**. Placement d'une façade *i* de la parcelle
*(x, y)*, tout déterministe, **REUSE du hash maison** (`FloorTint`, `:659` — `x*73856093 ^ y*19349663`) étendu d'un terme
`i*83492791` pour que deux façades d'une même parcelle diffèrent :

- **template** : tirage pondéré par `poids`, index `hash % Σpoids` ;
- **ancrage** : pivot bas-centre, `anchorMin = anchorMax = (fx, 0)` avec `fx = (i + 0,5) / façadesParParcelle`, plus un décalage
  latéral `±0,15 · CellSize` issu du hash ;
- **échelle** : **exactement** celle des bâtiments joueur, `k = CellSize / (metresParBloc · 56)` (`:401`) — jamais une échelle
  ambiante distincte (l'axe « échelle » est scellé).

### 2.4 Décision D — recouvrement et priorité (axe ⊥ n°2)

Le tri deux passes `(y, x)` puis `SetAsLastSibling` sur les occupées (`:306-321`) porte **déjà** la profondeur. Le chunk 1 insère
les façades ambiantes **dans la passe 1**, même ordre `(y, x)`, et laisse la passe 2 intacte ⇒ **tout bâtiment joueur passe
devant tout ambiant**, gratuitement. **Un bloc possédé ne reçoit jamais d'ambiant** : la boucle `:309-319` teste déjà
`buildingByBlockId.TryGetValue` ; l'ambiant se construit dans la branche `else`, à la place de `BuildEmptyCell`
(`:318`, `:629-633`).

**L'ambiant ne porte aucune marque d'état** : ni `Socle` (`:353-386`), ni calque `*Ov` (`:512-526`), ni `LieutenantMarker`, ni
`Button`, ni compteur. C'est **ce qui distingue** une façade ambiante d'un bâtiment joueur quand les deux tirent la même famille
— situation **réelle**, puisque 8 des 12 familles sont déjà liées (§1.2). **Compromis assumé et réversible** : restreindre
l'ambiant aux 4 familles libres est une réassignation d'asset, zéro C#.

### 2.5 Répartition par profil — **DÉDUITE, et je le dis**

`map_district.py` a été cherché : `find /home/erutheone -maxdepth 6 -name '*map_district*'` ⇒ **0** ; `grep -rl "map_district"`
sur les deux dépôts ⇒ **0**. **La référence de composition n'existe pas sur cette machine.** La distribution est donc **posée** :
`verge` → residentiel2/3/4/5 = 4 · epicerie/barbier/laverie/diner = 2 · hotel = 1 · bar_hero/entrepot/usine = 0 (mandat :
« résidentiel bas + commerces de rue ») ; **défaut** → toutes familles à 1, repli déclaré, jamais un vide.

Règle jour/nuit : `AmbientTemplate` porte les deux, et la sélection **réutilise le résolveur existant** `ResolveArtPhase`
(`:195-205`) — `NIGHT` → `nuit` ; `DAWN/DAY/DUSK` → le repli déclaré du chunk (`RenderNonHeroFallback`, `:209-221`). **L'ambiant
n'apparaît donc qu'au palier NIGHT** : aucun nouveau chemin de jour n'est ouvert ici.

### 2.6 Cibles chiffrées de composition — et l'écart que j'assume

La prédiction du ⊥ est **acceptée** : le chunk 1 ne déplacera pas la plus grande région uniforme. Je pose donc des cibles **par
chunk**, et pour le chunk 1 une métrique **scopée à la bbox de grille** — la seule zone qu'il touche.

| après | métrique | portée | référence | écran r8 | **cible posée** |
|---|---|---|---|---|---|
| chunk 1 | platitude locale (7×7, sd<2) | bbox de grille | 50,3 % | 90,4 % | **≤ 60 %** |
| chunk 1 | médiane du sd local | bbox de grille | 1,97 | 0,00 | **≥ 1,0** |
| chunk 1 | plus grande région uniforme | plein cadre | 4,80 % | 51,44 % | **≥ 45 %** — doit **NE PAS** bouger |
| chunk 3 | nombre de régions | bbox de grille | ×49 vs écran | — | **≥ ×6** vs chunk 1 |
| chunk 4 | plus grande région uniforme | plein cadre | 4,80 % | 51,44 % | **≤ 12 %** |

**L'écart assumé, et pourquoi je ne vise ni 4,80 % ni 1,97.** (1) **Cadrage** : la référence est un **portrait rapproché**
(1080×1920, mesuré) dont **aucun pixel n'est hors-ville** — les masses sont coupées aux 4 bords. Notre écran est une **vue de
district** au contour fini : un hors-district existe *par construction*, et une ville au loin lue à travers la brume **est** plus
plate qu'une façade au premier plan. Cette part d'écart est compositionnellement légitime — je la borne à 12 %, pas à 51 %.
(2) **Substrat** : nos façades sont des quads 2D à teinte plate, la référence un rendu 3D éclairé dont la médiane de sd (1,97)
contient du grain qu'aucun sprite plat ne produira ; viser 1,0 demande de la **structure** (fenêtres, arêtes, ombres), pas du
bruit.

Ces cibles sont **DÉDUITES** (je ne peux pas rendre l'écran depuis ce document) ; leur **détecteur** est la sonde rejouée après
chaque chunk, valeur collée dans les notes du chunk. La ligne « chunk 1 : ≥ 45 % » est délibérément une **prédiction qui doit
tenir** : si le remplissage faisait tomber ce nombre, c'est mon modèle du cadre qui serait faux, et il faudrait le comprendre
avant d'aller plus loin.

### 2.7 Falsifiables du chunk 1

`[Category("W3U2")]`, PlayMode, payload **réel** (`SignUpAndOpenSession` + fetch interior, patron
`DistrictInteriorDioramaPlayModeTests.cs:67-90`), `day_phase` forcé à `"NIGHT"` comme `:143`. Mondes dégénérés : §8.

- **amb-F1** — deux `Render(dto)` ⇒ même suite de templates par parcelle ; **et** ≥ **4** templates **distincts** sur les
  36 blocs libres.
- **amb-F2** — chacun des 4 blocs possédés du J0 porte `BuildingSprite` et **aucun** enfant `Ambient_*` ; **et** le total
  d'objets `Ambient_*` est **≥ 36**. Dimensionné par `buildings.Length == 4` et `blocks.Length == 40` assertés d'abord
  (`:141-142`).
- **amb-F3** — aucun `Ambient_*` ne porte de `Button` ni d'enfant `Socle`/`*Ov`/`LieutenantMarker` ; `RenderedBuildingCount`,
  `RenderedWindowLightCount`, `RenderedNeonGlowCount`, `RenderedSmokeCount`, `RenderedMaintenanceFlickerCount`,
  `RenderedLieutenantMarkerCount`, `ActiveAmbientLoopCount` **inchangés** à payload égal ; **et**, dans la même assertion,
  `RenderedBuildingCount == 4` et `RenderedCellCount == 40`.
- **amb-F4** — les sprites portés par les `Ambient_*` sont **inclus** dans `ResolveAmbient(profile).templates`, **et** cet
  ensemble déclaré est **non vide**.
- **amb-F5** — nombre de **paires** de façades ambiantes dont les rects monde s'**intersectent** > 0 ; **et** nombre de positions
  ancrées **distinctes** == nombre de façades ; **et** largeur moyenne des façades ≥ **0,45 × CellSize**.
- **amb-F6** — toute cellule-rue non possédée ne porte **aucun** `Ambient_*` ; **et** `4 ≤ cellules-rue ≤ 20`.
- **amb-F7** — `CanonPaletteBridgePlayModeTests.ExpectedTokenCount` reste **51** (`:46`). Détecteur **déjà livré**, réutilisé.

## 3. Chunk 2 — navigation « Entrer » / « ← Carte »

### 3.1 Où vit le seam retour : **dans le SHELL**, à l'intérieur de `TopBarSlot`

(1) **Cycle de vie** : `UnmountCurrentTenant` (`AppShell.cs:131-146`) détruit l'hôte **et tous les enfants de `ContentSlot`** —
un écran ne peut pas se démonter puis remonter un frère, le propriétaire du cycle de vie est le shell. (2) **Doctrine de
chrome** : les deux barres sont construites une fois et **jamais** touchées par un changement d'onglet (`AppShell.cs:186-187`) ;
un retour est du chrome. (3) **Invariant de Canvas** : trois falsifiables livrées assertent `childCount == 3` sur la racine du
Canvas (`AppShellPlayModeTests.cs:101`, `:126` ; `DistrictInteriorDioramaPlayModeTests.cs:124`) — un bouton en **4ᵉ enfant du
Canvas les ferait rougir** ; enfant de `TopBarSlot`, le compte reste 3. (4) **Contre-preuve pour l'autre branche** : dans l'écran
district, `Render` appelle `ClearContent` (`:168`, `:717-722`) qui détruit **tous** les enfants de `root` ⇒ un bouton posé là
disparaît à chaque rendu ; et au palier non-héros `RenderNonHeroFallback` (`:209-221`) étire un panneau plein `root` qui le
**recouvrirait**.

⇒ **`TopBarController` gagne une action « leading »** — « étendre le TopBar, pas le remplacer » :

```
public enum LeadingAction { None, BackToMap }            // état NOMMÉ
public LeadingAction CurrentLeadingAction { get; private set; }
public void SetLeadingAction(LeadingAction a, System.Action onClick);
```

Le bouton est construit **une fois** dans `BuildLayout` (`TopBarController.cs:163-182`), **premier enfant** du
`HorizontalLayoutGroup` (`:169`), et n'est **jamais détruit** ; seule sa visibilité suit l'état. Les falsifiables épinglent **la
valeur de `CurrentLeadingAction`**, jamais l'absence d'un objet.

### 3.2 Où se construit « Entrer » : **dans `BuildDetailPanel`**, persistant

`RenderDetail` (`CityMapController.cs:584-612`) **détruit tous les enfants de `detailContent`** (`:587`) puis les reconstruit.
`BuildDetailPanel` (`:388-446`) crée `Header` et `Content` comme enfants de `detailPanel` ; la boucle de destruction est **scopée
à `detailContent`** (`:443`) ⇒ **un troisième enfant `Footer` de `detailPanel` survit à tous les rafraîchissements.** Second
argument, décisif : `RenderDetail` n'est atteint qu'**après** les ~13 requêtes séquentielles de `BuildDetail` (`:499-574`) ⇒ un
bouton construit là serait **absent pendant tout le chargement**.

**Trois points de rafraîchissement de son `interactable`**, tous mesurés nécessaires : `SelectDistrict` (`:449-459`) · juste
après `IsAuthenticated = true` (`:120`) · `FinishDetail` (`:577-582`). Le second n'est pas du zèle : les cellules existent après
`Populate` (`:98`) et la signature ne démarre qu'à `:102` ⇒ **le panneau peut être ouvert avant l'authentification**, et sans ce
point le bouton resterait grisé alors que le jeton est arrivé.

### 3.3 Qui porte l'état « on est dans un district » : **`AppShell`**

`MountedTenantGameObject` est un **champ unique** (`AppShell.cs:47`) : un seul locataire à la fois. Entrer dans un district
**détruit** `CityMapController` — l'état ne peut donc pas y vivre.

```
public int CityTabDistrictId { get; private set; } = -1;   // -1 = « sur la carte », état NOMMÉ
public void EnterDistrict(int districtId);
public void ExitToCityMap();                                // → ActivateTab(Tab.City)
```

`ActivateTab(Tab.City)` remet `CityTabDistrictId = -1` **avant** de monter. Conséquence voulue : **re-taper l'onglet City depuis
un district ramène la carte**, par le chemin de remontage ordinaire (`:87-88`, « re-tap = remount, no special-cased no-op ») —
**aucune branche spéciale**. `EnterDistrict` réutilise **exactement** le corps de `MountTenant<T>` (`:111-129`) : hôte parenté
sous `ContentSlot`, `AddComponent`, `SetMountParent` **synchrone** avant le `Start()` différé ; puis
`StartCoroutine(SetSession(token, districtId))` (`DistrictInteriorScreenController.cs:146-154`) et `Render(LastFetch)` (`:164`).
**Pas de second mécanisme de montage.**

### 3.4 Les marges −100 / −160 et les replis 1180 / 560

Elles ne comptent pas le chrome deux fois (§1.3) — elles l'**ignorent**, et le titre est occulté :

```
public void SetSafeInsets(float top, float bottom);   // 0/0 hors shell — comportement inchangé
availW = rect.width  - 100f - (insetLeft + insetRight)
availH = rect.height - (80f + insetTop) - (80f + insetBottom)
```

`80 + 80 = 160` ⇒ **hors shell l'arithmétique est byte-identique à aujourd'hui** (`:249-250`), donc les 46 falsifiables
convergées ne bougent pas. `AppShell.EnterDistrict` appelle `SetSafeInsets(TopBarSlot.rect.height, TabBarRoot.rect.height)` — les
**hauteurs réelles**, jamais 56/64 recopiés. Le titre passe à `anchoredPosition.y = -(8 + insetTop)` (`:240`).

**Les replis 1180/560 deviennent dérivés, pas des littéraux** : `referenceResolution` du `CanvasScaler` réellement en place,
moins la **même** arithmétique de réserve (`1180 = 1280 − 100`, `560 = 720 − 160` ⇒ à insets nuls et résolution de référence par
défaut, valeurs **inchangées**). *Monde dégénéré de ce dérivé* : un `CanvasScaler` en `ConstantPixelSize` rend
`referenceResolution` (0,0) ⇒ replis négatifs ⇒ `CellSize` retombe sur son **plancher 48** (`:251`), c'est-à-dire le rendu
historique minimal — un échec **nommé**, pas un crash. À écrire tel quel dans le code.

### 3.5 Protocole r9 — les 5 éléments à livrer AVEC le PNG

1. le **chrome du shell dans le cadre** (TopBar et TabBar visibles sur la capture) ;
2. `root.rect.width` **et** `ContentSlot.rect.width` **en chiffres**, imprimés par le test lui-même ;
3. la **bbox du titre** en px, témoin d'invariance d'échelle canvas ;
4. la **scène** et le **point d'entrée** qui ont produit la capture ;
5. **ajout justifié par une mesure** : `CellSize` et le couple (`uiScaleMode`, `referenceResolution`). Raison : sur
   `diorama_nuit_r8.png` la cellule **implicite** vaut 87,7 px (§1.1) alors que la formule à la résolution de référence donne
   118 — **je n'ai pas pu réconcilier les deux depuis le seul PNG.** Un chiffre irretrouvable depuis l'artefact doit être
   **imprimé au moment de la capture**.

### 3.6 Falsifiables du chunk 2 (mondes dégénérés : §8)

- **nav-F1** — avec jeton, taper « Entrer » monte un `DistrictInteriorScreenController` dont
  `LastFetch.district_id == CityMapController.SelectedDistrictId` ; le test **sélectionne un district ≠ 16**.
- **nav-F2** — « ← Carte » ⇒ `MountedTenantType == typeof(CityMapController)` **et** l'hôte district précédent `== null`
  (Unity-destroyed), **pas** `activeSelf == false`.
- **nav-F3** — sans jeton, le bouton « Entrer » **existe** et `interactable == false` ; **anti-vacuité** : après
  authentification réelle, `interactable == true` sur la **même instance**.
- **nav-F4** — monté dans le shell, le rect monde du titre n'intersecte pas celui de `TopBarSlot`, ni celui de `GridArea` celui
  de `TabBarRoot` ; **et** largeur de `GridArea` **≥ 0,6 fois la largeur de `ContentSlot`**.
- **nav-F5** — à payload et Canvas identiques, `CellSize` monté dans le shell est **strictement inférieur** à `CellSize` monté
  nu. *Dimensionnement* : à 1280×720 sur la grille 10×4, la branche hauteur passe de (720−160)/4 = 140 à (720−280)/4 = 110, la
  branche largeur (inchangée) vaut 118 ⇒ **118 nu contre 110 monté**, l'écart existe.

## 4. Chunk 3 — rues, trottoirs, flaques (axes ⊥ n°1 et n°3)

Sur les cellules-rue posées au chunk 1, **aucun sprite** (il n'en existe aucun, §1.2) — des rects tokenisés : **chaussée**
`nightBackground` · **trottoir** `nightFloorAlt`, bande de `0,18 × CellSize` le long des parcelles adjacentes · **bordure**
`nightSocle` (déjà le liseré `GridBorder`, `:274-278`).

- **gouttière** : les `Floor_{x}_{y}` sont aujourd'hui **jointifs** (`sizeDelta = (CellSize, CellSize)`, `:288`). Les
  cellules-**parcelle** rétrécissent de `2 × gutter` (`gutter = 0,06 × CellSize`), les cellules-**rue** restent pleines ⇒ une
  trame de rues apparaît **sans toucher au placement des façades**.
- **flaques de lampadaire** (axe n°3) : disques de `nightWindowLit` (`DesignTokens.cs:145`) en alpha faible, un par intersection
  de rues, rayon `0,7 × CellSize`, **sous** les façades (indice de fratrie inférieur), `raycastTarget = false`.

**Aucune teinte hors des 51.** Si la flaque s'avère illisible avec `nightWindowLit` ⇒ **STOP + remontée**, pas un 52ᵉ token.

Falsifiables : **rue-F1** nombre de rects de chaussée == nombre de cellules-rue (le même qu'amb-F6) · **rue-F2** nombre de
flaques == nombre d'intersections, et **≥ 1** · **rue-F3** aucune flaque n'a `raycastTarget == true` ni n'est enfant d'une
cellule possédée ; **et** la largeur mesurée d'un `Floor` de parcelle est **strictement inférieure** à celle d'un `Floor` de rue.

## 5. Chunk 4 — le hors-district est le SUJET

Mesuré §1.1 : la plus grande région uniforme (≈ 51 %) **est** le fond hors-district, et la référence n'en a **aucune** — elle est
de la ville bord à bord. Aucun remplissage de grille n'y touche.

**Observation qui corrige le mandat.** La référence `DISTRICT_ZO_NUIT_FINAL.png` (1080×1920, ouverte et regardée) **ne montre ni
ciel ni ligne d'horizon** : caméra en plongée, cadre entièrement occupé par de la ville coupée aux 4 bords. ⇒ **Une silhouette de
skyline ajouterait un élément que la cible n'a pas.** La forme fidèle est une **ville au loin continue** : (a) **masses de
toits** — rects `nightOutOfDistrictMuted` (teinte déjà en place, `:231`) de hauteurs variées, posées par le **même hash** que
§2.3, en 3 rangs de plus en plus atténués ; (b) **fenêtres** — semis de points `nightWindowLit` à alpha décroissant par rang,
c'est le « ville_au_loin émissif » de l'artefact d'origine rendu **avec des clés existantes** ; (c) **brume** `nightHaze`
(`:326-330`) par-dessus tout, **inchangée** (axe scellé).

Falsifiables : **hd-F1** plus grande région uniforme plein cadre **≤ 12 %** (sonde §1.1, valeur collée) · **hd-F2** nombre de
masses **≥ 12** et nombre de **hauteurs distinctes ≥ 4**.

## 6. Chunk 5 — HUD v3.1

### 6.1 Le maillon d'abord (§1.4)

`AppShell` gagne un porteur de session minimal — **pas** une seconde authentification :

```
public string SessionToken { get; private set; }
public SessionOpenDto LastSessionOpen { get; private set; }
public void AdoptToken(string token);   // → SessionClient.OpenSession → TopBar.Load(token, backlog_badge, opened_game_day)
```

Publieur câblé par ce chunk : `CityMapController`, dont le chemin de signature est **lu dans le corps** (`:105-124`,
`IsAuthenticated = true` à `:120`). ⚠️ **`DashboardController` (onglet par défaut, `AppShell.cs:68`) émet lui aussi sa propre
tentative de signature** — attesté par `DistrictInteriorDioramaPlayModeTests.cs:104-106` et `AppShellPlayModeTests.cs:44`. **Je
n'ai pas lu son corps** (le fichier n'est pas à `Assets/Scripts/Operational/DashboardController.cs`). ⇒ **DÉDUIT, et il
décide** : si Home ne publie pas, le TopBar reste vide jusqu'à la première visite de City. **Mesure due au premier geste du
chunk 5** : localiser le fichier, lire le corps, câbler le second publieur si le chemin existe.

### 6.2 Clés consommées / manquantes

| élément HUD | source | statut |
|---|---|---|
| solde (or, chiffres) | `GET /v1/economy/wallet` via `DashboardClient` (`TopBarController.cs:78`) | **déjà consommé** |
| callsign | `GET /v1/me` (`:77`) | déjà consommé |
| point de notification | `backlog_badge` (clé 4/12) | **paramètre**, appelant manquant |
| jour de jeu | `opened_game_day` (clé 12/12, `SessionDtos.cs:99`) | **paramètre**, appelant manquant |
| **manomètre heat** | `citywide_bucket` (`heat.projection.service.ts:59,92`) via `GET /v1/city/district/:id/heat` (`heat.controller.ts:51-52`, `JwtAuthGuard`) | **route jamais appelée par le shell** |
| **day_phase** | **aucune route citywide** (§1.5) | **manquant** |

Le citywide n'est atteignable qu'en **nommant un district** — précédent maison `OrgVitalsPanelController.cs:21`,
`probeDistrictId = 16` (verge-a, kit de départ). Le HUD réutilise **ce même district de sonde**, jamais un nombre neuf.

### 6.3 `day_phase` : ce que le HUD affiche, et la dette

**Le manomètre affiche `day_phase` uniquement quand le shell est dans un district**, la valeur venant du DTO déjà récupéré
(`DistrictInteriorScreenController.LastFetch`, `:85`) ; ailleurs, un état **NOMMÉ** (`"—"`), jamais une valeur inventée côté
client. Dette à déposer côté back — **c'est une forme F, et elle est peu coûteuse** : `session.repository.ts:161-165` **lit
déjà** `city_sim_clock.game_minute` et en dérive `openedGameDay` dans la même transaction ; `quarterIndexForGameMinute`
(`day-phase-quarter.ts`) est déjà partagé par deux consommateurs (`deal-lek.service.ts:402`,
`district-interior.controller.ts:163`). ⇒ Une 13ᵉ clé `day_phase` s'obtient **sans lecture d'horloge supplémentaire**, sans
écrivain nouveau.

### 6.4 Le manomètre : 3 zones, **4 arrêts**

`HeatBucket` a **4** membres — `'COLD' | 'WARM' | 'HOT' | 'BURNING'` (`city-event-bus.ts:484`). Le HUD validé demande
« 3 états ». Écraser 4 en 3 perdrait `BURNING`, l'état le plus tendu. ⇒ **3 zones peintes** au cadran (calme / tension / alarme)
et **4 arrêts d'aiguille**, par un résolveur **exhaustif sans `default`** — patron déjà en production côté back
(`district-interior.controller.ts:161-172`) et côté client (`ResolveArtPhase`, `:195-205`, qui distingue le repli des 3 nommés
d'une 5ᵉ valeur inconnue).

### 6.5 Falsifiables du chunk 5 (mondes dégénérés : §8)

- **hud-F1** — après `AdoptToken(jeton réel)`, `TopBar.Loaded == true` et `RenderedCashText != "—"` ; `wallet.cash_cents` est
  vérifié d'abord par une requête **indépendante** (patron `TopBarControllerPlayModeTests.cs:138-144`).
- **hud-F2** — le résolveur rend **4 angles DISTINCTS** pour les 4 buckets (fonction pure, hors réseau).
- **hud-F3** — `GET /v1/city/district/16/heat` avec jeton réel rend **200 + `payload.data`** (corps de succès exigé, pas « pas
  d'erreur »), et `citywide_bucket` est **l'un des 4** membres.
- **hud-F4** — **REUSE, ne pas réinventer** : `SessionClientPlayModeTests.C3F3_Envelope_TwoTopLevelKeys_TwelveAtPayloadData`
  (`:243`) compte les clés de premier niveau du **corps brut** reçu et les compare au compte de champs du DTO (`:291`) ; `:160`
  épingle **12**. Le jour où le back ajoute `day_phase`, **ce test rougit en nommant le compte**.
- **hud-F5** — hors district, la valeur rendue est l'état nommé **et** `CityTabDistrictId == -1` dans la même assertion.

## 7. DÉDUIT vs COMPTÉ

**COMPTÉ** (commande exécutée, sortie lue) : 39 PNG / 12 familles · largeurs-monde et moyenne 0,52 bloc · 8 familles déjà liées
(résolution GUID→nom) · `metresParBloc: 16` dans l'asset contre 22 en C# · bbox de grille 877×357 = 49,3 % · plus grande région
52,74 % / 5,33 % · `ContentSlot` plein cadre (3 sources) · TopBar 56 px / TabBar 64 px · `childCount == 3` asserté 3 fois ·
boucle de destruction scopée à `detailContent` · 13 requêtes de `BuildDetail` · **0** appelant de production pour `TopBar.Load`,
`OpenSession`, `OrgVitalsPanelController` · les 12 clés de `session/open` et laquelle est la 12ᵉ · `day_phase` absent de
`session/open`, présent sur `interior` · `HeatBucket` à 4 membres · `map_district.py` inexistant · 0 sprite de rue/skyline
(contrôle positif à 27).

**DÉDUIT** — test appliqué à chacun : « si ça se résolvait défavorablement, une décision changerait-elle ? »

| # | déduit | ça décide ? | traitement |
|---|---|---|---|
| D1 | les cibles chiffrées de composition (§2.6) | non — ce sont des **gates**, pas des prémisses | détecteur = sonde rejouée par chunk, valeur collée |
| D2 | la distribution par profil (§2.5) | non — vit dans l'asset, réversible sans code | déclaré DÉDUIT ; référence cherchée, **0 hit** |
| D3 | `DashboardController` publie-t-il un jeton ? | **OUI** — sans lui le TopBar reste vide sur l'onglet par défaut | **mesure due au 1ᵉʳ geste du chunk 5** (§6.1) |
| D4 | « bâtiments contigus jamais superposés » (mesure r7 du ⊥) | non — amb-F5 crée le recouvrement quoi qu'il en soit | corroboré à l'œil sur r8, non re-mesuré |
| D5 | cellule implicite 87,7 px ≠ 118 attendu | non pour le design ; **oui pour la recette** | raison de l'élément 5 du protocole r9 (§3.5) |
| D6 | une famille déjà liée reste lisible en ambiant | non — compromis nommé, réversible par l'asset | §2.4 ; amb-F3 prouve la distinction structurelle |

**Point faible nommé sans maquillage** : D3 est le seul déduit qui décide, et il est **mesurable en une commande** — il est donc
dû *au premier geste du chunk 5*, jamais différé.

## 8. Falsifiables — récapitulatif et monde dégénéré

| id | ce qu'elle prouve | monde le plus dégénéré qui la rendrait VRAIE, et ce qui le tue |
|---|---|---|
| amb-F1 | déterminisme **et** variété | « tous les blocs, le même template » satisfait le déterminisme ⇒ tué par ≥ 4 templates **distincts** (la propriété qui dégénère est la variété des VALEURS, pas l'occupation du contenant) |
| amb-F2 | priorité du joueur | zéro ambiant partout ⇒ vrai à vide ⇒ tué par le plancher ≥ 36 façades |
| amb-F3 | ambiant inerte | tous compteurs à zéro des deux côtés ⇒ tué par `RenderedBuildingCount == 4` et `RenderedCellCount == 40` dans la même assertion |
| amb-F4 | clôture de la table | table vide ⇒ inclusion triviale ⇒ tué par « ensemble déclaré non vide » |
| amb-F5 | recouvrement réel | (a) toutes les façades empilées au même point ⇒ tué par positions **distinctes** ; (b) sprites minuscules ⇒ zéro intersection ⇒ tué par largeur moyenne ≥ 0,45 cellule (la plus étroite des 12 familles fait 0,28 bloc) |
| amb-F6 | parcellaire réel | partition « tout ou rien » ⇒ tué par 4 ≤ cellules-rue ≤ 20 |
| amb-F7 | les 4 axes scellés tiennent | détecteur **déjà livré** (`ExpectedTokenCount == 51`), rien de neuf à faire rougir |
| nav-F1 | Entrer cible le bon district | un district par défaut (16) rendrait vrai un câblage qui ignore la sélection ⇒ tué par « district de test ≠ 16 » |
| nav-F2 | Retour **détruit** l'écran | un écran simplement caché satisfait « la carte est là » ⇒ tué par l'assertion de destruction |
| nav-F3 | affordance gatée | « le bouton est absent » serait satisfait par un panneau qui n'en construit jamais ⇒ tué en épinglant la **valeur** de `interactable` sur la même instance |
| nav-F4 | non-occlusion | `CellSize` au plancher 48 rend tout minuscule et l'assertion triviale ⇒ tué par `GridArea` ≥ 0,6 fois `ContentSlot` |
| nav-F5 | insets consommés | deux valeurs égales ⇒ rouge, c'est le point ; dimensionné : 118 nu contre 110 monté |
| rue-F1/F2/F3 | rues, flaques, inertie | `gutter = 0` ⇒ rien de visible, comptes justes ⇒ tué par `Floor` parcelle < `Floor` rue ; et ≥ 1 flaque |
| hd-F1/F2 | hors-district traité | 12 masses de hauteur identique = une bande plate que des joints suffiraient à découper ⇒ tué par ≥ 4 hauteurs **distinctes** |
| hud-F1 | le maillon existe | un jeton vide donne `"—"` et l'assertion rougirait pour la mauvaise raison ⇒ tué par la vérification indépendante du cash |
| hud-F2 | l'aiguille discrimine | 4 constantes égales ⇒ tué par la clause de **distinction** des 4 angles |
| hud-F3 | vraie réponse | base fraîche répondant `RESOURCE_NOT_FOUND` = enveloppe d'**erreur** satisfaisant toute assertion d'absence ⇒ tué par le **corps de succès** exigé |
| hud-F4 | forme F : une clé qui apparaît | un inventaire de routes resterait vert à l'ajout d'une clé ⇒ tué en comptant les clés du **corps brut** |
| hud-F5 | état nommé hors district | l'épingle serait vraie pour la mauvaise raison ⇒ tué par `CityTabDistrictId == -1` dans la même assertion |

## 9. Runs scopés et juge

Le juge batchmode est **unique** et **s'élargit, jamais ne se duplique** (`Assets/Editor/MafiaCI.cs:24`,
`Categories = { "W4P4a", "W3UDA", "W3U1", "W3U2" }`). Les chunks ci-dessus **restent en `W3U2`** : ils prolongent le même lot
d'écran. Aucun 5ᵉ nom, aucun second point d'entrée. Par chunk :
`LOG_FILE=… ./Tools/run-unity-check.sh -executeMethod MafiaCI.RunPlayModeTests`, puis lecture de `passed=`/`failed=` — **jamais
le seul code de retour** (`run-unity-check.sh:20-26` : un filtre qui ne matche rien sort aussi `RC=0`). Le patron de preuve du
filtre reste celui de `Tools/test-run-unity-check-w3u2.sh` (vert / rouge injecté **à travers** le filtre / vert). **Machine calme
obligatoire** : un run Unity et une stack Docker en parallèle produisent des rouges d'environnement (socle, mesuré). Sérialiser.
