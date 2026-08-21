# HUD v3.1 — retour user (filet/médaillon, TabBar grise, pourcentage, multi-résolution) —
# implementation-notes.md

Suite directe de `Tools/hud-v31-manometre-fix-implementation-notes.md`. Retour user, mot pour
mot : « même le heat entre ce qu'on a convenu et la réalité c'est pas pareil, ya un % sur
l'artefact etc, les traits dépassent. Es-tu sûr que ça fonctionne sur tout type d'écran ? » — puis
un correctif de scope explicitement ajouté par le contrôleur en cours de lot (TabBar grise,
« deux ors différents à l'écran »). Quatre sujets, ordre de priorité donné par le contrôleur :
(1) filet/médaillon, (2) TabBar, (3) pourcentage, (4) multi-résolution.

## Périmètre

`Assets/Scripts/Shell/AppShell.cs` (TabBar : `BuildTabBar`, `AddTabButton`,
`RefreshTabButtonVisuals`) + `Assets/Scripts/Shell/VerticalGradientImage.cs` (commentaire de
provenance, second consommateur) + `Assets/Tests/PlayMode/TopBarDoctrineV31PlayModeTests.cs`
(DA7, nouveau) + `Assets/Tests/PlayMode/ChromeTabBarPlayModeTests.cs` (nouveau) +
`Assets/Tests/PlayMode/ChromeMultiResolutionPlayModeTests.cs` (nouveau). **Jamais touché** :
`Assets/Scripts/Shell/TopBarController.cs` (0 modification — confirmé par `git diff --stat`),
`Assets/Scripts/CityMap/` (fond de district, hors territoire), `Assets/Scripts/Operational/
Lieutenant/LieutenantScreenController.cs` (WIP non commité laissé par un lot précédent, non
compilable — voir § Environnement).

## Environnement — le fichier WIP non compilable

`Assets/Scripts/Operational/Lieutenant/LieutenantScreenController.cs` était modifié, non commité,
et NE COMPILAIT PAS au début de ce lot (13 erreurs CS0234/CS1061 — `ProceduralUI`/
`VerticalGradientImage` introuvables, `RosterRow.mode` absent). Consigne reçue : ne pas y toucher,
signaler si la compilation en dépend. **Shelvé temporairement** (`git stash push -- <ce fichier>`)
pour obtenir un arbre compilable le temps de MES vérifications (build + 55 tests PlayMode réels),
puis **restauré** (`git stash pop`) — diff identique avant/après (`599 insertions(+), 67
deletions(-)`, confirmé par `git diff --stat`), et les 13 MÊMES erreurs, aux MÊMES lignes,
réapparaissent après restauration (confirmé par `read_console`). Aucune perte, aucun contenu
altéré. **À la fin de ce lot, l'arbre est de nouveau dans l'état non compilable pré-existant** —
c'est un fait pré-existant à ce lot, pas une régression qu'il introduit.

---

## Défaut 1 — « le filet traverse le médaillon » : INVESTIGUÉ, PAS REPRODUIT

Mesure fournie par la demande : sur la référence (`Tools/hud-topbar-reference-2560.png`), au
centre du médaillon (x=1280, y=103), le pixel est sombre (26,32,45) ; hors médaillon, doré
(~176,141,62) — ⇒ le médaillon occulte le filet dans la référence. Puis l'affirmation : « dans
Unity, le filet passe par-dessus le disque » — sans mesure pixel jointe, seulement un renvoi
visuel à `hud_v31_manometre_final_burning.png`.

**Mesure indépendante, avant tout code** (méthode : classification pixel par pixel, orange vs
sombre, sur la ligne exacte du filet, x=560..720, la référence complète documentée
`ci-dessous`) :

```
y=54 (rangée du filet) : OOOO...(56 px orange, hors médaillon)...(50 px SOMBRE, dans le médaillon)...OOOO...
y=55 : identique
y=56 : quasi tout sombre, 2 courts segments "OOO" de 3px = le bord du propre ANNEAU du médaillon (pas le filet)
```

Exécuté indépendamment sur **quatre** exemplaires du même état (BURNING) :
1. capture Play Mode live re-testée dans ce lot (scaffold `TopBarController` seul, execute_code),
2. `Assets/Screenshots/hud_v31_manometre_final_burning.png` (committé, cité par la demande),
3. le crop zoomé cité par la demande depuis `/home/erutheone/project/mafia-clean-city/scratchpad/
   verif_manometre_burning.png` (autre dépôt, lu directement),
4. `Tools/hud-topbar-reference-2560.png` (la maquette elle-même, état calme).

**Les QUATRE montrent EXACTEMENT le même motif** : le filet n'est visible QUE hors du cercle du
médaillon ; à l'intérieur, y compris à la ligne précise du filet, c'est le disque qui domine —
ordre de dessin CORRECT dans les deux cas, référence et Unity.

**Root cause de l'illusion visuelle** (celle qui a produit la lecture « ça traverse ») : l'anneau
du médaillon (`BoitierRing`) ET le filet de la barre (`Hairline`) partagent EXACTEMENT le même
token (`hudHairlineGold` en calme, le même mélange `warmedBrass` sous alarme) — au point où leurs
silhouettes se touchent (le bas du médaillon déborde sous la barre, `ManometreVerticalOffsetPx`),
la frontière entre « bord de l'anneau » et « filet externe » est invisible à l'œil : les deux
segments orange se lisent comme UN SEUL trait continu qui semble « passer par-dessus » alors qu'il
s'agit de deux objets distincts, correctement empilés, de la même couleur. **La référence
présente exactement le même artefact** (vérifié par la même classification pixel sur
`hud-topbar-reference-2560.png`, lignes y=100-109 : mêmes segments "OOO" aux bords du disque).

**Vérifié empiriquement que ce N'EST PAS un problème d'ordre de fratrie** : sibling index de
`Manometre` (5) > `Hairline` (1) dans `TopBarController.BuildLayout()` — le médaillon est DÉJÀ
dessiné après (donc au-dessus) le filet, comme il se doit. `CanvasRenderer.absoluteDepth` ne
donnait rien d'exploitable hors d'un vrai rendu (reste à -1 sans passage GPU) — la preuve
retenue est donc pixel-réelle (capture Play Mode), pas une lecture de métadonnée Editor.

### Garde posée quand même — DA7, structurelle, avec contrôle positif

`DA7_NoBarSibling_EverDrawnOverTheMedallion_StructuralSiblingOrder`
(`TopBarDoctrineV31PlayModeTests.cs`) : pour tout FRÈRE DIRECT du médaillon dont le rect
chevauche géométriquement le sien, si son sibling index est SUPÉRIEUR (dessiné après, donc
par-dessus) **ET** qu'il peint réellement quelque chose de visible (`Graphic.color.a > 0`), c'est
un offenseur. **Premier jet REFUSÉ par sa propre exécution** — `Notification` (hook de données
headless, alpha 0, ancré au centre comme le médaillon) chevauche géométriquement et suit en
sibling index, mais ne peint RIEN : signalé à tort par une première version qui ne testait que la
géométrie. Corrigé en excluant tout frère sans Graphic visible — précédent maison exact du socle
CLAUDE.md (« une garde qui vérifie la mauvaise propriété est pire que pas de garde »).
**Contrôle positif** : `Hairline` déplacé délibérément APRÈS `Manometre` dans l'ordre de fratrie
→ le même détecteur le signale (`CollectionAssert.Contains`). Test VERT sur le code réel (résultat
attendu : aucun défaut de cette classe), rouge sur la version cassée délibérément.

---

## Défaut « TabBar grise » (ajouté en cours de lot par le contrôleur)

Mesuré, le contrôleur avait raison : `AppShell.BuildTabBar`/`RefreshTabButtonVisuals` n'avaient
JAMAIS été touchés par la doctrine HUD v3.1. `TabBarRoot` portait un `Image.color = surfaceCard`
plat, sans verre ni filet ; l'onglet actif était rempli d'un APLAT `chromeTabActive` — REUSE
verbatim de `accentGold` (#ffd23f, jaune vif) — exactement le token que le restyle du TopBar avait
quitté deux commits plus tôt pour `hudHairlineGold` (#b08d3e, laiton mat). Deux ors différents à
l'écran, en permanence, plus une bande grise pleine largeur.

⚠️ **Aucune référence pixel n'existe pour cette barre** — vérifié : `hud-brennar.html` et
`ecrans-brennar.html`, cités par le message du contrôleur, sont **introuvables** sur le disque de
ce dépôt ni dans `mafia-clean-city` (recherche exhaustive, `find` depuis la racine des deux
dépôts). Conformément à l'instruction reçue pour ce cas précis, la TabBar est donc dérivée par
**COHÉRENCE avec `TopBarController`** (même verre `hudBarGlassTop/Bottom`, même laiton
`hudHairlineGold`), **jamais comparée à un artefact pixel fabriqué**.

### Correctif

- **Fond** : même patron que `TopBarController.BuildBarBackground` — `Mask` +
  `ProceduralUI.RoundedRectMask` + `VerticalGradientImage(hudBarGlassTop, hudBarGlassBottom)`.
  `TabBarMask` premier enfant (rendu sous tout le reste), exclu du `HorizontalLayoutGroup` via
  `LayoutElement.ignoreLayout` (sinon traité comme un 6ᵉ bouton).
- **Filet** : bord HAUT de la TabBar (couture avec `ContentSlot`, symétrique du filet BAS du
  TopBar), `hudHairlineGold` — même token que le TopBar, également exclu du layout group.
- **Onglet actif** : plus AUCUN aplat de couleur. Le fond du bouton reste `surfaceRow` dans les
  DEUX états. L'actif se signale par (a) un filet `ActiveIndicator` (3px, bord haut du bouton,
  `hudHairlineGold`, `SetActive` toggle — jamais déduit d'une couleur, même idiome que
  `LeadingAction`) et (b) le libellé teinté `hudHairlineGold` au lieu de `onSurfaceSecondary`.
  `chromeTabActive` reste un champ scellé de `DesignTokens` (canon gdd/14) mais n'est plus
  référencé dans `AppShell.cs`.

### Falsifiables — `ChromeTabBarPlayModeTests.cs`

1. `SingleGold_ChromeStructuralElements_TopBarAndTabBar_ShareExactlyOneToken` — balaie les
   couleurs RÉELLEMENT RENDUES (jamais le code source) des éléments chrome nommés
   (`Hairline`/`BoitierRing` des deux barres), avec contrôle négatif (un Image synthétique à
   l'ancien or, nommé comme un élément réel, DOIT être vu).
2. `ActiveTab_NeverFlatFill_OnlyThinIndicator` — l'indicateur est un FILET (plus petite dimension
   ≤ 4px, même famille que `ThinDimensionMaxPx` de DA2 côté TopBar), le FOND du bouton actif n'est
   jamais teinté or, et un onglet INACTIF ne montre jamais son filet (contrôle négatif).
3. `TabBar_HasGlassAndHairline_StructurallyMirroringTopBar` — présence structurelle du
   Mask+VerticalGradientImage+Hairline, filet au bord HAUT, `LayoutElement.ignoreLayout` sur les
   deux éléments de chrome, et les 5 boutons toujours intacts.

### Piège rencontré et corrigé DANS ce lot — la citation qui casse son propre scanner

Le premier jet de `RefreshTabButtonVisuals` expliquait, EN COMMENTAIRE, pourquoi
`ChromeTabAccentAllowlistPlayModeTests.C5F2` ne suivait pas `chromeTabActive` — en citant
VERBATIM le littéral `DesignTokens.Current.accentGold` que ce scanner compte (`IndexOf` brut sur
le texte ENTIER du fichier, commentaires inclus). **Mesuré** : `C5F2` attendait 11, en a trouvé
12 — régression réelle, détectée par le run scopé, corrigée par paraphrase (jamais de citation
verbatim d'une forme qu'on explique — piège nommé et déjà évité ailleurs dans ce même fichier
avant que je ne le commette moi-même deux paragraphes plus loin). Re-vérifié : 0 occurrence,
`C5F2` repasse à 11/11.

### Piège rencontré et corrigé DANS ce lot — collision de nom de scaffold

`SingleGold_...` construisait d'abord un scaffold `TopBarController` LÉGER (nommé
`"TopBarSlot"`, comme `AppShell` le nomme) PUIS un `AppShell` réel dans la même scène. `AppShell.
BuildLayout` réutilise tout `Canvas` trouvé et détruit DÉFENSIVEMENT tout enfant nommé
`"TopBarSlot"`/`"ContentSlot"`/`"TabBarRoot"` avant d'y bâtir le sien (protection contre un
AppShell antérieur jamais démonté) — mon scaffold tombait dans le champ de cette protection et se
faisait détruire, `MissingReferenceException` sur le `TopBarController` qu'il portait. Corrigé en
renommant le slot du scaffold (`"BareTopBarSlot"`).

---

## Défaut 2 — le pourcentage : MESURÉ, AUCUNE VALEUR CONTINUE N'EST ATTEIGNABLE CÔTÉ CLIENT

Balayage EXHAUSTIF de tous les DTO qui mentionnent "heat" dans ce dépôt (Unity-only — 4 fichiers,
`grep -rn -i heat` sur `*Dtos.cs`) :

| fichier | champ(s) heat | forme |
|---|---|---|
| `CityMap/WorldDtos.cs` (`GET /v1/city/district/:id/heat`) | `district_bucket`, `citywide_bucket`, `escalated`, `buildings[].heat_bucket` | BANDE (string), zéro scalaire |
| `CityMap/CityProjectionDtos.cs` | `patrol_heat` | BANDE (string) |
| `Operational/BuildingCard/BuildingCardDtos.cs` | — | commentaire EXPLICITE : *"raw scalar (no cents / grams / ticks / **heat float** / purity)"* — R2.2 appliqué délibérément, PAS un oubli |
| `Operational/Dashboard/DashboardDtos.cs` | — | *"NOT re-declared here — REUSE l'existing CityMap.DistrictHeatDto"* |

**Zéro champ numérique heat dans TOUT le corpus DTO** — le "no heat float" n'est pas un gap, c'est
une DÉCISION D'ARCHITECTURE, appliquée UNIFORMÉMENT (R2.2, "projections P5 jamais scalaires"),
documentée dans le code lui-même. `session/open` ne porte PAS de heat du tout (le shell le sonde
à part, `AppShell.PublishCitywideHeat`).

**Conformément à l'instruction reçue pour ce cas** (« N'INVENTE RIEN ») : le médaillon continue
d'afficher le LIBELLÉ de bucket (comportement inchangé, `HeatBucketResolver.Label`). **Aucun code
n'a été écrit pour ce défaut.**

### Dette à ouvrir côté back (hors périmètre de ce dépôt Unity-only)

> **TD (à créer)** — Le heat citywide n'est exposé au client QUE comme bande
> (`citywide_bucket` : `COLD|WARM|HOT|BURNING`), jamais en continu, PAR CONSTRUCTION (R2.2,
> confirmé par le commentaire explicite de `BuildingCardDtos.cs:14`, "no heat float", appliqué à
> TOUT le corpus DTO, pas seulement à ce chemin). Route concernée :
> `GET /v1/city/district/:id/heat` → `DistrictHeatDto`. Pour afficher un pourcentage réel au
> médaillon (la maquette `hud-topbar-reference-source.html:47` montre `37%`), il faut un champ
> BACKEND neuf, p.ex. `citywide_heat_score: number` dans `[0,100]`, sur cette même route (service
> probable : `heat.projection.service.ts`, cité par `CityProjectionDtos.cs:113` comme convention
> d'origine). Forme F du socle CLAUDE.md ("la donnée existe en base, la projection l'omet") NE
> S'APPLIQUE PAS ici — ce n'est pas un oubli de projection, la valeur scalaire elle-même n'existe
> nulle part dans le modèle exposé. Tant que cette route ne l'expose pas, le médaillon DOIT rester
> au palier lisible.

---

## Défaut 3 — multi-résolution

### Mesure préalable

`grep -rc "SetResolution\|GameViewSize" Assets/Tests/PlayMode/*.cs` → **0** occurrence, confirmé.
`ProjectSettings/ProjectSettings.asset:11` → `defaultScreenOrientation: 0` (PORTRAIT), seul
`allowedAutorotateToPortrait: 1` actif — confirmé, l'app ne tournera jamais en paysage sur
téléphone. Les 250 falsifiables pré-existantes certifiaient donc exclusivement une orientation qui
n'existera jamais en production.

`CanvasScaler.matchWidthOrHeight` — vérifié par `execute_code` sur un `CanvasScaler` FRAÎCHEMENT
construit (jamais configuré nulle part dans ce dépôt) : défaut Unity = **0** (match LARGEUR). Sous
ce régime, la largeur LOCALE du canvas vaut TOUJOURS `referenceResolution.x` (1280), quel que soit
l'aspect ratio réel de l'appareil — seule la hauteur locale varie. Conséquence directe, vérifiée
EN LIVE (pas seulement déduite) : les positions X des 3 zones du TopBar et des 5 boutons de la
TabBar sont INVARIANTES à l'aspect ratio.

### Jeu de résolutions — justifié

| résolution | ratio | catégorie | justification |
|---|---|---|---|
| 1280×720 | 16:9 paysage | historique | seule résolution jamais certifiée avant ce lot — DOIT continuer de tenir (non-régression) |
| 1080×2280 | 19:9 portrait | téléphone COURANT | Pixel 4a/5, Galaxy A52/A53 — segment Android le plus vendu sur cette fourchette |
| 1080×2400 | 20:9 EXACT portrait | portrait ALLONGÉ | demandé explicitement par le contrôleur — Galaxy S21-S23, Redmi Note |
| 1200×1920 | 16:10 portrait | tablette | 10" Android typique, tenue en portrait — le format le PLUS LARGE du jeu, celui qui teste le mieux la marge de la TabBar (5 boutons) |

### Méthode de capture — Play Mode réel, résolution réellement changée

Redimensionner le Game View programmatiquement passe par `UnityEditor.GameViewSizes` (API
interne, non publique) — testé, fonctionne (`Screen.width/height` suit réellement le
redimensionnement), mais **délibérément PAS committé comme mécanisme de test permanent** : une
API interne peut casser au moindre upgrade Unity pour une raison SANS RAPPORT avec une régression
produit. Utilisée UNIQUEMENT pour les 4 captures de preuve ci-dessous (manuelles, evidence
humaine), jamais dans les falsifiables commitées (celles-ci sont analytiques, § suivant).

**Mesures réelles, Play Mode, aux 4 résolutions** (rect imprimé, `GetWorldCorners`) :

```
1280×720  : Money[16,176] Mano[608,672](centre 640=1280/2) Clock[1104,1264] TabBar h=64
1080×2280 : Money[13.5,148.5] Mano[513,567](centre 540=1080/2) Clock[931.5,1066.5] TabBar h=54
1080×2400 : Money[13.5,148.5] Mano[513,567](centre 540=1080/2) Clock[931.5,1066.5] TabBar h=54
1200×1920 : Money[15,165] Mano[570,630](centre 600=1200/2) Clock[1035,1185] TabBar h=60
```

Médaillon TOUJOURS parfaitement centré, AUCUN chevauchement, TabBar (5 boutons) toujours dans les
bornes, rien hors écran, aux 4 résolutions. Captures commitées :
`Assets/Screenshots/hud_multires_{1280x720_landscape,1080x2280_portrait,1080x2400_portrait,
1200x1920_tablet}.png` — dimensions vérifiées par PIL, correspondance exacte à la résolution
demandée pour les 4.

### Falsifiables commitées — `ChromeMultiResolutionPlayModeTests.cs` (analytiques)

Approche ANALYTIQUE (pas un re-rendu Play Mode par test — fragilité de l'API interne, voir
ci-dessus) : les constantes de production (`BarPaddingX`, `MoneyClusterWidth`,
`ClockClusterWidth`, `ManometreDiameter`, `ManometreVerticalOffsetPx`) sont **lues par réflexion**
depuis `TopBarController` — jamais recopiées (précédent DA3/DA4). 6 tests :
`MultiRes_TopBarClusters_NeverOverlapOrOverflow_AcrossTargetResolutions` (+ son contrôle positif
sur un canvas dégénéré à 200 unités), `MultiRes_TabBarButtons_AllPositiveWidth_...` (+ contrôle
positif à 20 unités), `MultiRes_ContentSlot_NeverCollapses_AcrossTargetResolutions` (+ contrôle
positif à un ratio hauteur/largeur de 0.01 — l'axe où w/h COMPTENT réellement sous match-largeur).

### Ce qui n'a PAS été fait — mesuré, documenté, pas implémenté (imprévu non bloquant)

**Aucune gestion de `Screen.safeArea`** (encoche caméra, barre de geste) nulle part dans ce dépôt
— confirmé, `grep -rn "safeArea" Assets/Scripts/` = 0 occurrence. `TopBarSlot` est ancré
absolument au bord HAUT du canvas, `TabBarRoot` absolument au bord BAS — sur un téléphone réel
avec encoche/barre de geste, le chrome peut littéralement passer SOUS un élément matériel. **Ce
n'est pas la même chose que `SetSafeInsets`** (mécanisme EXISTANT, `AppShell.cs:217`) : celui-ci
réserve de l'espace pour le CHROME DE L'APPLICATION lui-même (TopBar/TabBar), jamais pour les
insets matériels de l'OS. Non implémenté dans ce lot — option conservatrice : ajouter un nouveau
mécanisme cross-cutting (calcul d'inset `Screen.safeArea`, conversion pixels-écran → unités
canvas locales, réactivité à un changement d'orientation runtime) est une surface d'architecture
neuve, pas un correctif borné, et n'était pas nommément demandé par les 5 points du défaut 3 —
consigné ici comme trouvaille à trancher par le contrôleur plutôt que devinée.

### Fond de district (bit-exactitude) — non touché, non re-vérifié

`Assets/Scripts/CityMap/` (le pipeline de fond pré-rendu bit-exact) n'a reçu AUCUNE modification
dans ce lot — confirmé, `git diff --stat` ne liste aucun fichier sous ce chemin. Les changements
sont confinés à `Shell/AppShell.cs` (TabBar) et aux fichiers de test. Le multi-résolution testé
ici porte sur le CHROME (TopBar/TabBar), un système Canvas ScreenSpaceOverlay indépendant du
rendu du fond de district — aucune ré-vérification via `resemblance-probe.py` n'a été jugée
nécessaire.

---

## Evidence

- Compile (arbre nettoyé du WIP shelvé) : 0 erreur, confirmé 2 fois (`refresh_unity` force +
  `read_console` types=error → 0 entrées), avant ET après le correctif de citation ci-dessus.
- Suite scopée (chunk + voisins directs, PlayMode, `run_tests`/`get_test_job`) :
  - `TopBarDoctrineV31PlayModeTests` + `ChromeTabBarPlayModeTests` +
    `ChromeMultiResolutionPlayModeTests` + `ManometreOraclePlayModeTests` +
    `AppShellPlayModeTests` — **32/32 VERT** (19.8s), Game View re-vérifié à 1280×720 juste avant
    le run (contamination détectée puis corrigée, voir Deviations #1).
  - `NavigationPlayModeTests` + `ChromeTabAccentAllowlistPlayModeTests` +
    `DistrictNightTokensPlayModeTests` + `HudPlayModeTests` — **23/23 VERT** (12.1s).
  - Total scopé : **55/55 VERT**.
- Captures Play Mode réelles, commitées : 4 résolutions (`Assets/Screenshots/hud_multires_*.png`,
  dimensions vérifiées).
- Full-suite (ch27) : **hors mandat de ce lot** — appartient au merge-gate du contrôleur.

## Deviations

1. **Contamination d'environnement détectée puis corrigée, DANS ce lot** — après les captures
   manuelles multi-résolution, le Game View était resté sur ma dernière résolution custom
   (1200×1920, tablette) au moment de lancer la suite automatisée. Deux tests PRÉ-EXISTANTS
   (`ManometreOraclePlayModeTests.Oracle1`, `TopBarDoctrineV31PlayModeTests.DA6`) ont rougi —
   PAS une régression : re-testé après reset explicite à 1280×720 (`Screen.width/height` vérifié
   avant le run), les deux repassent au vert. Root cause confirmée par expérience contrôlée (UNE
   seule variable changée : la résolution du Game View, tout le reste identique). Précédent
   maison exact : « un gate sous pression / mauvais environnement fabrique des rouges qui
   ressemblent à une régression » (CLAUDE.md).
2. **Défaut 2 (pourcentage)** : aucun code écrit — la donnée n'existe nulle part côté client,
   dette back consignée précisément ci-dessus (route + champ manquant + service probable).
3. **Safe area (`Screen.safeArea`)** : trouvaille mesurée pendant le défaut 3, non implémentée —
   voir § dédiée ci-dessus. Nouvelle surface d'architecture, pas nommément demandée, remontée au
   contrôleur plutôt que devinée.
4. **Défaut 1** : aucun code de correction écrit (rien à corriger — investigation complète,
   ci-dessus). Seule la garde structurelle demandée a été ajoutée (DA7).
