# Découpe de la gouttière du district — design

**Statut** : spec. Aucune ligne de C# ici, aucun test lancé, aucun éditeur touché.
**Source du mandat** : `Tools/juge-visuel-2026-08-21-verdict-et-suites.md` §A (« Le contenu de
district déborde dans la gouttière — MESURÉ, NON CORRIGÉ »).
**Cible mesurée** : `/home/erutheone/project/mafia-builder-city-clean` — remote
`git@github.com:azha/mafia-builder-city-clean.git`, le dépôt que le plan maître du programme nomme
(`docs/superpowers/plans/2026-08-07-tout-terminer-master-plan.md:112`). Identifié AVANT de mesurer :
il existe au moins 5 arbres Unity sur cette machine (`find / -name RectMask2D.cs` en rend 5).

Toutes les mesures ci-dessous sont **les miennes**, refaites, pas reprises du verdict.

---

## 1. Le défaut, re-mesuré — et un chiffre de plus que le verdict

### 1.1 La géométrie, calculée depuis les sources (pas depuis la capture)

Le fond `VERGE_D_NUIT_FINAL.json` déclare `image = 1080×1920`, `pas_parcelle_m = 6.5`,
`ppm_plan = 24.0`, **60 parcelles** (x 0..9, y 0..5). Le kit J0 pose ses 4 bâtiments sur les blocs
(0,0)…(3,0) — ordre `GRANT_BUILDINGS` (`services/game-back/src/onboarding/onboarding-grant.service.ts:120-125`,
dépôt back `mafia-clean-city`), appariement confirmé en dur par la falsifiable existante
(`DistrictMapNavigationPlayModeTests.cs:213` : « Cell_3_0 == cash_safehouse »).

Chaque cellule est dimensionnée sur la taille NATIVE du sprite
(`DistrictInteriorScreenController.cs:555-557`), pivot bas-centre (`:569`), posée au `pivot_px`
de sa parcelle (`:559`, `:564`, `:571`). En **pixels natifs du fond** (origine haut-gauche, fond
= 0..1080 × 0..1920) :

| bâtiment | bloc | sprite | pivot_px | rect x | rect y | débord G | D | H | B |
|---|---|---|---|---|---|---|---|---|---|
| lab (`usine_nuit_base_ppm24.0.png`) | (0,0) | 712×515 | 150.87, 547.45 | **−205.13 … 506.87** | 32.45 … 547.45 | **205.13** | 0 | 0 | 0 |
| stash (`entrepot_nuit_base_ppm24.0.png`) | (1,0) | 244×235 | 150.67, 639.07 | 28.67 … 272.67 | 404.07 … 639.07 | 0 | 0 | 0 | 0 |
| front_shop (`epicerie_…`) | (2,0) | 175×200 | 150.48, 730.68 | 62.98 … 237.98 | 530.68 … 730.68 | 0 | 0 | 0 | 0 |
| cash_safehouse (`residentiel3_…`) | (3,0) | 226×511 | 150.28, 822.30 | 37.28 … 263.28 | 311.30 … 822.30 | 0 | 0 | 0 | 0 |

⇒ **Un seul bâtiment déborde, sur un seul côté** : le lab, 205.13 px à gauche. Aucun débord haut,
bas ou droite. C'est ce qui autorise, plus bas, un correctif **purement horizontal** pour les
marqueurs : le défaut n'a pas de composante verticale à ce jour.

### 1.2 Le marqueur perdu — l'inférence du mandat est CONFIRMÉE, et son index est inversé

`BuildLieutenantMarkers` (`:846-866`) ancre le marqueur `i` sur des fractions de la CELLULE :
`xMin = 0.04 + i·(0.12 + 0.02)`, largeur `0.12`, bande verticale `0.02 … 0.18` (`:856-859`).
Les marqueurs sont donc **dans** le rect de la cellule et **rangés de gauche à droite**. Pour le
lab (712×515, cell x = −205.13 … 506.87 en px de fond) :

    LieutenantMarker_0  x[−176.65, −91.21]  (85.44 large)   ⇒ 100 % HORS du fond
    LieutenantMarker_1  x[ −76.97,   8.47]  (85.44 large)   ⇒ 8.47 px dans le fond (9.9 %)

Vérification indépendante sur la capture `Assets/Screenshots/vue_principale_batiments_hud.png`
(1200×1600, oracle PIL, teinte `(242,209,143)`, composantes 4-connexes) : **15 composantes, une
seule de plus de 2 px** — `n=5727, x 0..68 (w=69), y 454..536 (h=83)`, et `69 × 83 = 5727`
exactement (rectangle plein, aucun anticrénelage). Le modèle prédit, à 1200 de large (fond en
x 60..1140) et avec le pan initial calculé (`ClampPan` sature X à 0 et Y à −160) :
`marqueur_1 → x[−16.97, 68.47], y[454.75, 537.15]`. **Mesuré 0..68 / 454..536.** Le modèle est
juste au pixel.

⇒ **C'est `LieutenantMarker_0` qui est entièrement hors écran, pas le second** : la cellule
déborde à GAUCHE, donc c'est l'index le plus à gauche qui est perdu. Le mandat disait « le second
marqueur serait entièrement hors écran » — la conséquence est la bonne, l'index ne l'est pas.
Preuve arithmétique indépendante de tout sprite : si le marqueur visible était l'index 0, l'index 1
serait à `[68 + 0.02·W, 68 + 0.14·W]`, donc **entièrement à l'écran** ⇒ on verrait deux amas. On en
voit un.

### 1.3 Ce que la découpe seule ferait — et pourquoi elle ne suffit pas

Découper au rect du fond, sans rien d'autre :

| | aujourd'hui (1200×1600) | après découpe seule |
|---|---|---|
| `LieutenantMarker_0` | 0 px visible (hors écran) | 0 px |
| `LieutenantMarker_1` | 69 px sur 85 (dont 60 sur la gouttière) | **8.47 px sur 85 (9.9 %)** |

⇒ La découpe seule fait passer le seul marqueur visible de 69 px à 8 px. **Elle range le défaut au
lieu de le corriger** : l'affordance « lieutenants visibles à leur affectation » (U-11, en-tête du
contrôleur `:58`) disparaît proprement. Le mandat l'avait pressenti ; la mesure le chiffre.

⇒ **Le lot doit contenir DEUX gestes** : la découpe (§4) *et* le replacement des marqueurs (§5).

### 1.4 Ce que la découpe coupera du bâtiment — assumé, chiffré, consigné

`labFootprint` mesuré (`Assets/Resources/BuildingSpriteSlots.asset:96-99`) :
`widthPx 523`, `centerOffsetPx −75`. Le contenu OPAQUE du lab occupe donc, en px de fond,
`[−185.63, 337.37]` ⇒ **185.63 px sur 523 (35.5 %) du bâtiment lui-même sont hors du fond.**
Aujourd'hui, 145 de ces 186 px sont déjà perdus (bord d'écran) et ~60 sont peints sur la
gouttière ; après découpe, les 186 sont coupés au bord du fond.

Ce n'est pas un défaut Unity : le sprite du lab fait 712 px = **29.7 m** à ppm 24, posé sur une
parcelle dont le pas est **6.5 m**, à **150.87 px (6.29 m)** du bord gauche du fond. L'art ne rentre
pas sur cette parcelle. C'est un arbitrage **DA / choix de blocs du grant**, hors rayon de ce lot —
consigné en §8 **avec son détecteur** (F5), jamais en aveu.

---

## 2. La forme retenue

    DistrictScene                    (sceneRt, Stretch(root), porte DistrictMapNavigation)
    ├── DistrictBackgroundImage      (fondRt)          ← INCHANGÉ, bit-exactitude intacte
    └── DistrictCells                (cellsRt)  NEW    ← calque EXACT du fond + RectMask2D
        ├── Cell_0_0 …

`DistrictCells` **recopie le fond** : `anchorMin = anchorMax = pivot = (0.5,0.5)`,
`sizeDelta` = celui du fond, `anchoredPosition` = celle du fond **lue APRÈS son
`SnapToScreenPixel`** (`:436`). Frère POSTÉRIEUR du fond (dessiné au-dessus). Il porte le
`RectMask2D`, `softness = (0,0)`, `padding = zéro`.

Dans la branche de repli (aucun fond réel, `:443-463`), `DistrictCells` existe aussi mais en
**clone `Stretch(0,0)` de `DistrictScene`** et **sans `RectMask2D`** : il n'y a pas de rect de
référence à découper, donc rien à promettre. Conséquence heureuse et voulue : son
`anchoredPosition` y vaut `(0,0)`, ce qui fait retomber la correction du §3.1 sur sa valeur
historique **par la formule, sans branche**.

### 2.1 Deux formes concurrentes, essayées et RÉFUTÉES par lecture du code

**(a) `RectMask2D` posé sur `DistrictScene`, découpe rétrécie par `padding`.** Séduisant : l'espace
local des cellules resterait byte-identique (§3.1 deviendrait vide). **Réfuté** :
`Clipping.cs:25-30` (`Library/PackageCache/com.unity.ugui@96898ecd6c63/Runtime/UGUI/UI/Core/Culling/Clipping.cs`)
ajoute `padding` au `canvasRect` du masque — et `canvasRect` vient de
`RectangularVertexClipper.GetCanvasRect` (`Culling/RectangularVertexClipper.cs:8-19`), donc des
**coins MONDE** du masque, qui **suivent `sceneRt.localScale`**. Aux paliers de zoom ×2/×3
(`DistrictMapNavigation.cs:62`, `:186`) le rect du masque double ou triple pendant que `padding`
reste en unités canvas non échelonnées ⇒ la découpe rate le bord du fond dès qu'on zoome. Il
faudrait recalculer `padding` à chaque `ZoomTo`/`PanBy` : une garde **solidaire de la
transformation qu'elle surveille**, exactement la faute payée le 2026-08-21 avec
`DistrictSceneBackdrop` (`DistrictInteriorScreenController.cs:412-418`). Écarté.

**(b) Les cellules enfants du fond.** Réfuté par le canon : `DistrictBackgroundPlayModeTests.cs:419-421`
asserte `fondT.childCount == 0` avec sa raison écrite (« pp-F6 — le fond est un LEAF … les bâtiments
sont des FRÈRES du fond sous DistrictScene »). Ce n'est pas un nombre à amender, c'est une propriété
ratifiée.

**(c) `RectMask2D` sur `DistrictScene` sans padding.** Ne découpe rien : `Stretch(sceneRt, zéro, zéro)`
(`:377`) sur un `root` lui-même `Stretch(0,0)` (`:940`) monté dans `ContentSlot`, lui-même
`Stretch(0,0)` (`AppShell.cs:471`) ⇒ le rect de `DistrictScene` **est** le viewport. (Prémisse du
mandat, vérifiée.)

### 2.2 Ce que le masque découpe réellement — vérifié, pas supposé

- `RectMask2D : UIBehaviour, IClipper, ICanvasRaycastFilter` (`RectMask2D.cs:25`) ⇒ **aucun `Graphic`
  requis** sur son nœud. Le nœud reste un conteneur nu.
- `maskable` vaut **true par défaut** (`MaskableGraphic.cs:21-22`) et **0 site** ne l'écrase :
  `grep -rF 'maskable' Assets/Scripts Assets/Tests` → **0** (contrôle positif dans le même passage :
  `AddComponent<Image>` → 92, `SnapToScreenPixel` → 11).
- Le **matériau additif** des calques d'état est découpé : `Assets/Shaders/UIAdditive.shader:50`
  applique `UnityGet2DClipping(i.worldPosition.xy, _ClipRect)` **sans condition**, et son
  commentaire de tête (`:1-3`) dit qu'il a été écrit exprès pour « garder le contrat UI/Default
  (stencil + ClipRect) » pour « tout Mask/RectMask2D futur ». C'est le point qui aurait pu faire
  une découpe *partielle* et donc une garde qui certifie un défaut ⇒ **F3 l'exerce nommément**
  (§4, garde de capacité).
- **TextMeshPro** : `TMP_Text : MaskableGraphic` (`…/Runtime/TMP/TMP_Text.cs:115`) et
  `Assets/TextMesh Pro/Shaders/TMP_SDF.shader` déclare `UNITY_UI_CLIP_RECT`. Le seul TMP sous une
  cellule est `TypeLabel` (`:654`), rendu **uniquement** quand le sprite est le repli partagé
  (`:652`) — jamais au J0.
- **Raycast** : `IsRaycastLocationValid` (`RectMask2D.cs:178-184`) rejette les points hors rect pour
  les descendants. Sans effet sur le pan : `DistrictMapNavigation.IsOverInteractiveUI` (`:357-366`)
  ne regarde que les `Selectable`, et aucune cellule n'en porte (le fichier le dit lui-même,
  `:250-256`).
- `ApplyFilterModeForZoom` (`DistrictMapNavigation.cs:239`) balaie
  `sceneRt.GetComponentsInChildren<Image>(true)` — **récursif** ⇒ un nœud de plus ne lui échappe pas.
- `ClearContent` (`:943-948`) détruit les enfants de `root` ⇒ le masque meurt avec la scène à chaque
  `Render()`, comme tout le reste.
- **Aucun précédent maison** : `grep -rF 'RectMask2D' Assets/Scripts Assets/Tests` → **0**. Les deux
  masques existants (`AppShell.cs:548`, `TopBarController.cs:553`) sont des `Mask` stencil, pas des
  `RectMask2D`. Le coder n'a donc **rien à copier** — c'est la raison pour laquelle §2.2 énumère les
  six points ci-dessus au lieu de renvoyer à un patron.

---

## 3. Les quatre invariants

### 3.1 Invariant 1 — l'espace local du cadrage initial

`DistrictMapNavigation.Configure` documente sa prémisse (`:112-115`) : `initialFocusLocal` est
« dans les unités locales de CETTE RectTransform, le même espace que `Cell_x_y.anchoredPosition`,
**puisque ces cellules sont ses enfants directs** ». Cette dernière clause **cesse d'être vraie**.

Ce qui est collecté (`:497`) est `cellRt.anchoredPosition`, désormais relatif au centre de
`DistrictCells` — c'est-à-dire au centre du **fond**. Ce qui est attendu est un point dans l'espace
de `DistrictScene`. La conversion est exactement l'offset entre les deux repères :

> **Geste** : au site de collecte `:497`, pousser `cellsRt.anchoredPosition + cellRt.anchoredPosition`,
> en **lisant `cellsRt` vivant** — jamais en recopiant le delta de snap du fond, jamais une constante.
> Et amender la clause `:115` de `Configure` (elle dit « enfants directs » ; elle devient
> « descendants, via `DistrictCells` ») — une prose laissée intacte dans un fichier corrigé devient
> fausse dès que la correction déplace ce qu'elle référence.

Préconditions à écrire dans la falsifiable (F1) : `cellsRt.localScale == Vector3.one` et
`anchorMin == anchorMax == pivot == (0.5,0.5)`. Sans elles, la somme n'est pas une somme.

**Et la conséquence en pixels, qu'il ne faut pas maquiller.** Le mandat écrit que
« `SnapToScreenPixel` snappe la position MONDE, donc reparenter une cellule ne déplace pas son pixel ».
**Vérifié dans le corps (`:1063-1073`) — et c'est vrai à un cran près qu'il faut nommer.** Cette
méthode ne *préserve* pas une position à travers un reparentage : elle **arrondit** la position
monde telle qu'elle sort du parent courant, et réinjecte le delta en unités locales via `lossyScale`.
Avec `C` = centre monde de `DistrictScene` et `d = localPos · scaleFactor` :

    aujourd'hui : round(C + d)
    après       : round(round(C) + d)        (car le fond est déjà snappé, `:436`)

Les deux ne diffèrent que si `C` a une partie fractionnaire, donc **uniquement sur un viewport de
dimension IMPAIRE** sur cet axe (`root` est plein écran ⇒ `C = (Screen.width/2, Screen.height/2)`),
et alors **d'au plus 1 px**. Mieux : la nouvelle valeur est à **≤ 0.5 px** de la vérité
fond-relative `fondWorld + d` (arrondi exact d'un entier + `d`), là où l'ancienne était à **≤ 1.0 px**.
⇒ **Le reparentage ne dégrade jamais le calage ; il le resserre.** C'est cohérent avec ce que
`PixelToFondLocal` déclare produire : une position « relative au CENTRE du fond »
(`DistrictBackgroundAnchorDto.cs:68-71`) — que le code appliquait jusqu'ici dans l'espace de la
scène. Le lot fait dire au code ce qu'il voulait dire.

### 3.2 Invariant 2 — les ancres de test : **recomptées, 10 exactement**

Comptées moi-même, motif par motif, dans un `$( )` :

| motif | portée | compte AVANT |
|---|---|---|
| 1 · `scene.Find($"Cell_` | `Assets/Tests` | **9** (Background 2 · Socle 2 · Diorama 2 · Nav 3) |
| 2 · `scene.Find("Cell_3_0")` | `Assets/Tests` | **1** (Nav) |

**Total 10**, répartition identique à celle du mandat (Background 2 · Socle 2 · Nav 4 · Diorama 2).
Contrôle positif du même passage : `Cell_` dans `Assets/Tests` → **17**.

**Geste** : `scene.Find($"Cell_{x}_{y}")` → `scene.Find($"DistrictCells/Cell_{x}_{y}")`.
`Transform.Find` accepte un CHEMIN, et le dépôt s'en sert déjà :
`DistrictMapNavigationPlayModeTests.cs:126` fait `Find("DistrictScene/DistrictBackgroundImage")`
(motif `DistrictScene/` → 2 occurrences dans `Assets/Tests`).

Les 10 sites : `DistrictBackgroundPlayModeTests.cs:183,283` ·
`DistrictSocleFootprintPlayModeTests.cs:130,184` ·
`DistrictMapNavigationPlayModeTests.cs:215,304,458,467` ·
`DistrictInteriorDioramaPlayModeTests.cs:170,186`.

> ⛔ **Le piège, et c'est le seul endroit de ce lot où un coder discipliné se fera avoir.**
> Le 10ᵉ site — `DistrictInteriorDioramaPlayModeTests.cs:186` — est une assertion **NÉGATIVE** :
> `Assert.IsNull(scene.Find($"Cell_{b.x}_{b.y}"))`, jouée sur les 36 blocs non possédés. Elle **ne
> rougira pas** après le reparentage : elle deviendra **vraie à vide** pour tous les blocs, possédés
> compris. Son garde anti-vacuité voisin (`:190`, `uncheckedEmpty == 36`) compte des **itérations**,
> pas des recherches — il ne la rattrape pas. Un coder qui répare « ce qui est rouge » corrigera
> `:170` et laissera `:186` verte et creuse. **Elle se corrige dans la MÊME édition**, et son message
> doit dire qu'elle porte sur un chemin, pas sur un nom.

> ⚠️ **Un 11ᵉ site, que le mandat ne liste pas, et c'est un amendement de SENS, pas de chemin.**
> `NavD5_InitialFraming_CentersOnBuildingBarycenter_MeasuredAgainstJson`
> (`DistrictMapNavigationPlayModeTests.cs:306`) somme `cell.anchoredPosition` et compare à
> `nav.PanPosition` à **0.6 près** (`:318-319`). Après le lot, la somme est fond-relative et
> `PanPosition` scène-relative : il reste un terme systématique égal à
> `cellsRt.anchoredPosition` (≤ 0.5 px écran ⇒ ≤ 0.5/scaleFactor en unités locales), auquel s'ajoute
> le ré-arrondi de `SnapToScreenPixel(sceneRt)` (`DistrictMapNavigation.cs:146`).
> Aux deux résolutions connues du dépôt (1200×1600 de la capture ; 1080×2400 mesuré
> `DistrictMapNavigationPlayModeTests.cs:140`) les deux axes de `ClampPan` **saturent** et le terme
> disparaît — le test resterait vert **par chance**. Il ne sature pas partout : pour une hauteur de
> viewport ≤ 1369.75 (p. ex. 1280×720), l'axe Y n'est pas borné, `|desired.y| = 275.125 < 960 − H/2`,
> et le terme passe dans l'assertion.
> **Geste** : ajouter `cellsRt.anchoredPosition` à `expectedFocus`, NOMMÉMENT, avec cette raison.
> Ne PAS élargir la tolérance : élargir un seuil pour absorber un décalage systématique, c'est
> changer de sujet.

Non concernés, vérifiés dans le corps : `DistrictInteriorLieutenantMarkersPlayModeTests.MarkersUnderCell`
(`:86-97`) cherche par `GetComponentsInChildren<RectTransform>(true)` + nom ⇒ récursif ;
`DistrictSocleFootprintPlayModeTests` (`:139-144`, `:187-195`) lit des `anchoredPosition` **relatives
à la cellule** ⇒ inchangées ; `DistrictBackgroundPlayModeTests` pp-F2 second volet (`:208-232`) est
de l'arithmétique JSON pure.

★ `PpF2` (`DistrictBackgroundPlayModeTests.cs:189-194`) compare `cell.anchoredPosition` à
`PixelToFondLocal(...)` avec une tolérance de **2 px**. Cette comparaison devient **plus exacte**
après le lot (§3.1) : elle passait en absorbant le delta de snap du fond, elle passera sans lui.
Aucun geste — mais c'est la falsifiable qui prouve que le nouveau parent est le BON.

### 3.3 Invariant 3 — la branche de repli

`:443-463` : profil sans fond ⇒ `DistrictBackgroundPlaceholder`, `fondRt` reste `null`, et
`MapNavigation` reste `null` (`:509-510`). C'est le chemin de `nav-F4` (district 3, profil
`tidewater`) et de tous les payloads fabriqués `profile = "lattice"`
(`DistrictInteriorLieutenantMarkersPlayModeTests.cs:74`).

**Décision** : `DistrictCells` est créé dans les DEUX branches (chemin de recherche uniforme ⇒ un
seul amendement pour les 10 ancres), mais **le `RectMask2D` n'est attaché que si `fondRt != null`** —
même règle que `MapNavigation`, et même raison écrite : rien à borner, rien à promettre.
En repli, `DistrictCells` est un `Stretch(0,0)` de `DistrictScene` ⇒ **même rect, même centre** ⇒
espace local des cellules **byte-identique à l'historique**, et `cellsRt.anchoredPosition == (0,0)`
neutralise la correction du §3.1 sans aucune branche dans la formule.

La garde ne doit pas y être vide : F2 (§4) asserte **positivement** ce qu'est le repli (nœud présent,
cellules dessous, **aucun** `RectMask2D`, `MapNavigation == null`, `DistrictBackgroundPlaceholder`
présent, `RenderedBuildingCount > 0`).

### 3.4 Invariant 4 — comptes de nœuds et bit-exactitude

- **`root.childCount == 3`** (`DistrictInteriorDioramaPlayModeTests.cs:277-280`) : **ne bouge pas**.
  Le nœud neuf est enfant de `DistrictScene`, pas de la racine. Aucune des trois assertions nominales
  (`:279`, backdrop) n'est touchée.
- **`fondT.childCount == 0`** (`DistrictBackgroundPlayModeTests.cs:419-421`, pp-F6) : **ne bouge pas** —
  `DistrictCells` est un FRÈRE du fond. C'est la raison pour laquelle la forme (b) du §2.1 est écartée.
- **Aucune falsifiable n'asserte `DistrictScene.childCount`** : balayage `childCount` sur
  `Assets/Tests` + `Assets/Scripts` — les seuls comptes assertés sont `ScreenRoot`(3),
  `ShellCanvas`(3), `zoneRow`(3), `fondT`(0). ⇒ **rien à amender**, et c'est précisément le trou :
  la structure neuve n'est surveillée par rien.
  **Geste (F1)** : ajouter une garde qui asserte **QUELS** enfants `DistrictScene` porte (les deux
  noms, dans l'ordre `DistrictBackgroundImage` puis `DistrictCells`), pas seulement combien —
  « un compte nu ne dit pas ce qu'il compte » (socle, 2026-08-21).
- **Bit-exactitude du transport** : le nœud du fond n'est ni reparenté, ni redimensionné, ni
  masqué (il n'est pas descendant de `DistrictCells`). La propriété est préservée **par
  construction**, pas par une mesure à refaire.

---

## 4. Les falsifiables

### F1 — la structure (chunk C1)

- **Propriété** : `DistrictScene` porte exactement `DistrictBackgroundImage` puis `DistrictCells` ;
  `DistrictCells` recopie le rect du fond ; toutes les `Cell_x_y` sont ses enfants directs ; ses
  préconditions d'espace (`localScale == 1`, ancres/pivot au centre) tiennent.
- **Mécanisme** : lecture de la hiérarchie et comparaison des `GetWorldCorners` de `cellsRt` et
  `fondRt` (≤ 0.01 d'écart sur les 4 coins).
- **Scénario dimensionné** : J0 réel verge-a, `RenderedBuildingCount == 4`, et
  `cellsRt.childCount == 4`.
- **Anti-vacuité** : `Assert.AreEqual(4, …)` sur le nombre de `Cell_*` trouvés **sous
  `DistrictCells`** — un nœud vide satisferait « tous les enfants sont des cellules ».
- **Contrôle positif** : reparenter une seule cellule sous `DistrictScene` dans le test, puis
  ré-asserter. **Attendu : 4 → 3.**

### F2 — le repli (chunk C1)

- **Propriété** : profil sans fond ⇒ `DistrictCells` existe, porte les cellules, **ne porte pas** de
  `RectMask2D`, et `MapNavigation == null`.
- **Scénario dimensionné** : payload fabriqué `profile = "lattice"` avec ≥ 2 bâtiments (le patron
  `WrapGrid` existe déjà, `DistrictInteriorLieutenantMarkersPlayModeTests.cs:67-81`).
- **Anti-vacuité** : `DistrictBackgroundPlaceholder` présent **et** `RenderedBuildingCount > 0` —
  sans quoi « pas de masque » serait vrai parce que rien n'a été rendu.
- **Contrôle positif** : rejouer le MÊME corps sur verge-a (profil AVEC fond) ⇒ le masque **doit**
  être présent. **Attendu : absent (lattice) / présent (verge-a).** Une seule variable : le profil.

### F3 — ★ la falsifiable d'EFFET : **aucun pixel de premier plan hors du rect du fond** (chunk C3)

C'est la pièce que le mandat regardera en premier. Elle est écrite contre trois leçons du
2026-08-21, dans l'ordre.

**L'ÉVÉNEMENT qui doit la faire rougir, nommé avant de l'écrire** :
> « une `Cell_x_y`, ou n'importe lequel de ses calques (socle, sprite, calque additif, marqueur),
> peint ne serait-ce qu'un pixel dans la région du viewport que le fond ne couvre pas ».
Classe de l'événement : **rendu**. ⇒ Ni un résolveur exhaustif, ni une lecture de champ ne peut la
voir. **Le seul dispositif capable est de rendre et de compter les pixels.**

**Ce qu'elle N'EST PAS** : elle n'asserte **jamais** qu'un `RectMask2D` existe, ni qu'il est activé,
ni que son rect égale celui du fond. Ces trois propriétés étaient vraies dans la version du halo de
titre qui ne produisait **aucun pixel** (`DistrictInteriorScreenController.cs:976-989`).

**Mécanisme — sonde hors écran DÉTERMINISTE** (patron maison :
`DistrictMapNavigationPlayModeTests.NavD13`, `:742-826`, qui monte déjà `Camera` +
`RenderTexture` + `Canvas` en `ScreenSpaceCamera` + `ReadPixels`) :

1. `RenderTexture` **1200×1600** — la résolution EXACTE à laquelle le défaut a été mesuré.
2. `Camera` orthographique, `targetTexture = rt`, `clearFlags = SolidColor`.
3. `Canvas` en `RenderMode.ScreenSpaceCamera`, `worldCamera = cam`, avec un `CanvasScaler` en
   **`ConstantPixelSize`, `scaleFactor = 1`**. ⇒ le rect du canvas vaut le RT, `canvas.scaleFactor`
   vaut 1, et **plus rien ne dépend de `Screen`**. (C'est le point qui rend cette falsifiable
   indépendante de la fenêtre du runner — voir §8, D-C.)
4. `diorama.SetMountParent(canvas.transform)` **AVANT** `Render(dto)`, pour que `BuildRoot`,
   `SnapToScreenPixel` et `Configure` travaillent tous sur ce viewport-là.
5. `dto.day_phase = "NIGHT"` ; **et `lab.activity_band = "ACTIVE"`** — voir « garde de capacité ».
6. `yield return null; yield return new WaitForEndOfFrame();` puis `cam.Render()` + `ReadPixels`.

**La bande** (calculée depuis les rects VIVANTS, jamais depuis un nombre écrit ici) :
`bande = rect(rootRt) \ dilate(rect(fondRt), +1 px)` — le +1 px est une marge contre
l'anticrénelage du **bord du fond**, pas une tolérance sur le défaut (qui fait 60 px de large).
On en **retire** le rect de `DistrictTitle` dilaté de 4 px (le halo) : le titre est du chrome et
traverse l'écran légitimement (`:315-323`, et le juge l'a classé LÉGITIME).

**Assertions, dans cet ordre** :
- **(a) scénario dimensionné** : `aire(bande) > 0` **et** largeur de bande ≥ 10 px sur au moins un
  axe. Si 0 ⇒ **échec explicite « sonde non dimensionnée »**, jamais un vert.
  *(Attendu ici : deux bandes verticales de 60 px, x∈[0,60) et x∈[1140,1200).)*
- **(b) le défaut est ATTEIGNABLE** : le rect écran de **la cellule du lab** (retrouvée par le DTO) **intersecte** la bande.
  Sans cette assertion, « 0 pixel dans la bande » serait vrai le jour où plus rien ne déborde — et
  la falsifiable serait devenue creuse sans que personne ne le sache.
  *(Attendu : intersection de 205.13 px de large.)*
- **(c) garde de capacité — le matériau additif** : `<cellule du lab>/ActivitySmoke` existe (c'est ce que
  `lab.activity_band = "ACTIVE"` provoque : `:794-795`, `labOv.actif` est câblé
  `BuildingSpriteSlots.asset:39-43`), il porte bien `AdditiveMat` (`:711`), et **son rect intersecte la
  bande** (il est `Stretch(0,0)` sur la cellule, `:708`, donc il déborde autant qu'elle).
  ⇒ Sans ce point, la falsifiable ne prouverait la découpe que du matériau uGUI par défaut, et
  resterait verte si le shader additif traversait le masque.
- **(d) l'exclusion du titre ne mange pas la preuve** : `aire(exclusion) < 25 % de aire(bande)`.
  *(Attendu ≈ 2 % : le juge a mesuré 31 lignes de titre pour 1600 lignes de bande.)*
- **(e) la capture n'est pas dégénérée** : **≥ 1000** pixels DANS le rect du fond diffèrent de la
  couleur du backdrop ⇒ le fond a réellement été rendu.
- **(f) LA PROPRIÉTÉ** : `pixels de la bande dont la couleur diffère de
  `DesignTokens.Current.nightOutOfDistrictMuted` (le token du backdrop, `:423`) de plus de ε` == **0**.

**Contrôle positif — intégré à la falsifiable, une seule variable, dans le même run** :
`mask.enabled = false` ; `yield return null; yield return new WaitForEndOfFrame();` ; **même caméra,
même RT, même bande déjà calculée** ; recapturer.

| grandeur | masque ACTIVÉ | masque DÉSACTIVÉ |
|---|---|---|
| (f) pixels non-backdrop dans la bande | **0** (attendu) | **> 0** (attendu) |
| (a) aire de la bande | identique | identique |
| (b) intersection cellule du lab × bande | identique | identique |

C'est la forme exacte qui a fermé le halo : *« en remettant le paramètre à sa valeur inerte, la
garde d'EFFET rougit pendant que la garde de FORME reste VERTE »*. Ici le contrôle est
**permanent**, pas un geste manuel : il ne peut pas se périmer. `RectMask2D.IsRaycastLocationValid`
rend `true` quand `!isActiveAndEnabled` (`RectMask2D.cs:178-183`) ⇒ désactiver ne change **que** la
découpe, rien d'autre. Une seule variable.

> Le coder **consigne la valeur mesurée** du cas DÉSACTIVÉ dans ses notes. Le seuil asserté reste
> `> 0` : un `> 0` ne se lit sur aucune courbe et n'a donc pas à être choisi.

### F4 — les marqueurs restent dans le fond (chunk C2)

- **ÉVÉNEMENT** : « un marqueur de lieutenant est placé là où la découpe le mangera ». Classe :
  **géométrie**, pas rendu ⇒ une assertion sur les rects suffit, et elle est indépendante de la
  résolution.
- **Propriété** : pour CHAQUE `LieutenantMarker_*` de l'arbre, son rect monde est **contenu** dans
  le rect monde du fond.
- **Scénario dimensionné, deux volets** :
  - **J0 réel** : verge-a, `RenderedLieutenantMarkerCount == 2`, les deux sur la cellule du lab — le pire
    cas mesuré, et le SEUL bâtiment qui déborde.
  - **N grand** : même fetch, `lab.lieutenant_ids` remplacé par **12** identifiants fabriqués — le
    cas que l'écrêtage (§5) existe pour tenir. Assertions : les 12 rects contenus, `x` **strictement
    croissants** (tuer le monde dégénéré « tous empilés au même point »), largeur de chaque rect
    > 0 (tuer « 12 marqueurs de largeur nulle »), et `RenderedLieutenantMarkerCount == 12` (C10-F1
    n'est pas dégradée par l'écrêtage).
- **Anti-vacuité, et c'est celle qui compte** : asserter que le rect de la cellule du lab **n'est PAS**
  contenu dans celui du fond. Le jour où l'art ou le choix de blocs change et où la cellule rentre,
  « les marqueurs sont dedans » redevient vrai pour une raison sans rapport ⇒ ce garde le dit.
- **Contrôle positif, dans le même run** : recalculer, depuis les MÊMES rects vivants, où l'ancienne
  formule aurait posé l'index 0 (bord gauche de la cellule + 4 % de sa largeur) et asserter que
  **CE** rect n'est **pas** contenu dans le fond.
  **Attendu — nouvelle formule : 2/2 contenus. Ancienne formule : 0/2 contenus** (index 0 à
  `x[−176.65, −91.21]`, index 1 à `x[−76.97, 8.47]`, fond = `[0, 1080]`, en px natifs de fond).

### F5 — le détecteur du différé « le lab ne rentre pas sur sa parcelle » (chunk C2)

Ce n'est pas un aveu, c'est une épingle qui rougira à l'événement.

- **Propriété assertée (VERTE aujourd'hui)** : sur le J0 verge-a, **exactement UNE** cellule déborde
  du rect du fond, c'est celle du `lab`, et son débord vaut **205.1 px natifs de fond à gauche
  (± 1)**, **0 sur les trois autres côtés**.
- **Mécanisme** : `GetWorldCorners` de chaque cellule et du fond, converti en px natifs de fond par
  `1080 / fondRt.rect.width * (1/lossyScale)` — donc indépendant de la résolution et du scaleFactor.
- **Anti-vacuité** : `RenderedBuildingCount == 4` et le débord mesuré `> 100` px (un débord nul
  rendrait « exactement une cellule déborde » faux, donc le test rougirait ; un débord *minuscule*
  passerait pour le même fait — le plancher l'interdit).
- **Ce qui la fait rougir, et c'est exactement quand la dette doit être rouverte** : un nouveau
  rendu du sprite `usine` à un autre ppm, un autre `pivot_px` dans la carte d'ancrage, ou un autre
  choix de blocs par `GRANT_BUILDINGS`. **Le message d'échec doit renvoyer à §8 D-A de ce document.**
- **Contrôle positif** : asserter dans le même run que la cellule du `stash` **ne** déborde **pas** —
  sinon « exactement une » pourrait être vrai parce que la mesure de débord est cassée pour tout le
  monde.

> ⚠️ **`Cell_0_0` ne se code pas en dur dans F3/F4/F5.** J'ai établi l'appariement
> lab → bloc (0,0) par recoupement (ordre de `GRANT_BUILDINGS` · la falsifiable existante qui
> déclare `Cell_3_0 == cash_safehouse`, `DistrictMapNavigationPlayModeTests.cs:213` · l'arithmétique
> de la capture au pixel) — c'est solide mais c'est un fait de **données**, pas de code. Les trois
> falsifiables retrouvent la cellule du lab **par le DTO**, comme le fait déjà
> `DistrictSocleFootprintPlayModeTests.cs:179-184` (`Array.Find(dto.buildings, b =>
> b.operational_type == "lab")` puis son `block_id`). Les valeurs `[−205.13 … ]` de ce document
> restent des ATTENDUS à confronter, jamais des constantes à recopier dans une assertion.

---

## 5. Le replacement des marqueurs (chunk C2) — le QUOI et le POURQUOI

**Ce qui ne change pas** : la taille (`0.12 × largeur de cellule`, `0.16 × hauteur`), la bande
verticale (`0.02 … 0.18`), le nombre (un par entrée de `lieutenant_ids`, C10-F1 intacte), la
couleur (`nightLieutenantMarker`, dont la garde `DistrictNightTokensPlayModeTests.cs:73-83` ne porte
que sur des COULEURS ⇒ non touchée). **La mesure justifie ce minimalisme** : le tableau §1.1 montre
`débord H = B = 0` sur les 4 bâtiments ⇒ **le défaut n'a aucune composante verticale**.

**Ce qui change — l'axe X seulement** : la rangée n'est plus **alignée à gauche à 4 % de la
cellule** ; elle est **centrée sur le centre horizontal de la cellule**. Or `cellRt.pivot = (0.5, 0)`
(`:569`) et `cellRt.anchoredPosition = PixelToFondLocal(pivot_px)` (`:564`, `:571`) ⇒ **le centre
horizontal de la cellule EST le point-sol de la parcelle**. Centrer la rangée, c'est la poser sur la
parcelle, quelle que soit la largeur du sprite.

**Pourquoi pas les deux alternatives moins invasives — chacune essayée, chacune réfutée par le calcul** :

| variante | position de l'index 0 (px natifs de fond) | dans le fond ? |
|---|---|---|
| rangée à 4 % du bord de la **cellule** (actuelle) | `[−176.65, −91.21]` | **non** |
| rangée à 4 % du bord de l'**empreinte opaque** (`labFootprint` 523 / −75, l'asset) | `[−164.71, −101.95]` | **non** |
| rangée **centrée sur le point-sol** (retenue) | `[58.31, 143.75]` | **oui**, marge 58.31 px |

**L'écrêtage, pour que la propriété soit STRUCTURELLE et pas chanceuse.** À N=2 la demi-rangée vaut
`0.13 × 712 = 92.56` px et la marge la plus courte de la carte livrée vaut **149.11** px
(min `pivot_px.x` = 149.11 ; `1080 − max pivot_px.x` = 149.13) ⇒ 56.5 px de mou. À N=3 il reste
8.5 px ; **à N=4 la rangée sort** (−41.3). Et `lieutenant_assigned_building_idx` est un index
ORDINAIRE, pas unique (`services/game-back/src/db/schema/lieutenant.ts:179`) ⇒ **rien ne borne N
côté base**.

> **Geste** : la demi-largeur de la rangée est **écrêtée à la distance du centre de la cellule au
> bord VERTICAL le plus proche du fond, moins 1 px**, lue sur les rects vivants (`cellRt`, `fondRt`).
> Au-delà, c'est le **pas** entre marqueurs qui se réduit (les marqueurs se chevauchent), jamais leur
> taille ni leur nombre. `BuildLieutenantMarkers` reçoit donc `fondRt` (nullable) ; en repli,
> **aucun écrêtage** — il n'y a pas de rect de référence.
> À N ≤ 3 sur le J0 l'écrêtage est **inactif** : la disposition est celle du cas nominal, byte pour
> byte. F4 volet « N grand » l'exerce à 12.

⚠️ **Conséquence DA à signaler, pas à trancher ici** : recentrés, les marqueurs du lab passent de
`x[−177, +8]` à `x[118, 304]`, c'est-à-dire **sur le pied du bâtiment** (l'empreinte opaque du lab
couvre `[−185.63, 337.37]`). Ils restent dessinés au-dessus (`BuildLieutenantMarkers` est le dernier
appel de `BuildBuildingCell`, `:673`) et dans la bande du socle. La variante « rangée SOUS la ligne
de sol » existe et n'est pas retenue ici : elle poserait les marqueurs sur la parcelle voisine.
⇒ §9, point 2.

---

## 6. Découpage en chunks

L'ordre est choisi pour qu'**aucun commit intermédiaire ne dégrade l'écran** et pour que le contrôle
positif de F3 soit littéralement « le monde d'avant C3 ».

### C1 — le conteneur `DistrictCells`, **inerte** (pas encore de masque)
Contenu : création du nœud dans les deux branches (§2, §3.3) ; repointage de l'unique site
`BuildBuildingCell(sceneRt, …)` (`:495`) ; correction du site de collecte `:497` (§3.1) ; amendement
de la clause `Configure` `:115` ; les **10** ancres de test (§3.2) **plus** `NavD5` (§3.2, 11ᵉ) ;
amendement nominal de `:186` **dans la même édition**.
Falsifiables : **F1**, **F2**. Aucun `RectMask2D` n'est écrit dans ce chunk.
Pourquoi inerte : tout rouge de C1 est un vrai bris de structure, jamais un effet de bord de
découpe. Le diff est relisible.

### C2 — les marqueurs, **avant** la découpe
Contenu : rangée centrée + écrêtage (§5) ; `fondRt` transmis à `BuildLieutenantMarkers`.
Falsifiables : **F4**, **F5**.
Pourquoi avant : après C3, un marqueur mal placé ne serait plus « mal visible » mais **invisible**.
Aucun commit de ce lot ne doit rendre l'affordance pire qu'aujourd'hui.

### C3 — la découpe
Contenu : `RectMask2D` sur `DistrictCells` **si et seulement si** `fondRt != null`.
Falsifiable : **F3**, contrôle positif intégré.

---

## 7. Contrôles de forme (à exécuter sur l'arbre INTACT d'abord)

Motifs désignés **par index**, jamais par leur littéral dans la prose de compte-rendu. Les valeurs
AVANT sont **mesurées maintenant**, sur l'arbre intact, dans un `$( )` — un motif qui rend déjà `0`
avant l'édition est un motif faux, pas un motif satisfait.

| # | sens | portée | AVANT (mesuré) | APRÈS (attendu) |
|---|---|---|---|---|
| 1 | retrait | `Assets/Tests` | **9** | **0** |
| 2 | retrait | `Assets/Tests` | **1** | **0** |
| 3 | retrait | `Assets/Scripts` | **1** | **0** |
| 4 | ajout | `Assets/Tests` | **0** | **10** |
| 5 | ajout | `Assets/Scripts` + `Assets/Tests` | **0** | **≥ 3** |
| 6 | contrôle positif de forme (chemin déjà en usage) | `Assets/Tests` | **2** | **2** |
| 7 | contrôle positif de l'instrument | `Assets/Tests` | **17** | **≥ 17** |

Motif 1 = la forme interpolée de recherche de cellule **sans** chemin ; motif 2 = sa variante
littérale (le bloc (3,0)) ; motif 3 = l'expression d'abscisse **alignée à gauche** de
`BuildLieutenantMarkers` (`:857`) ; motif 4 = le nom du nœud neuf suivi d'une barre oblique ;
motif 5 = `RectMask2D` ; motif 6 = la forme « chemin » **déjà** employée sous `DistrictScene`
(`DistrictMapNavigationPlayModeTests.cs:126`) ; motif 7 = le préfixe de cellule, nu.

⚠️ **Les motifs 4 et 5 valent `0` AVANT, et c'est correct** : ce sont des motifs d'**AJOUT**. La
règle « un motif qui rend déjà 0 avant l'édition est un motif faux » vise les motifs de **RETRAIT**
(1, 2, 3) — ceux-là valent 9, 1 et 1, donc ils mordent vraiment sur la cible.

⚠️ **Portée** : les sept comptes sont scopés à `Assets/…`. Ce document vit dans `Tools/` et cite
volontairement les littéraux des motifs 1 et 2 pour dire au coder quoi remplacer ; il n'entre dans
aucune de ces portées. Un balayage lancé à la racine du dépôt rendrait `9+k` au lieu de `9` — dire la
portée à côté du compte, toujours.

⚠️ `grep` est proxifié vers **`ugrep`** ici (le message d'erreur le dit : `ugrep: warning:`) : **une
alternance `\|` rend `0` en silence**. Mesuré dans cette passe même : un balayage à quatre motifs
alternés sur `Assets/Scripts` + `Assets/Tests` a rendu **0 pour les quatre**, alors que deux d'entre
eux ont des occurrences réelles (1 et 2 respectivement) — recomptés un par un juste après. Le nom du
nœud neuf et `RectMask2D` valent bien **0** partout dans `Assets/` : recomptés motif par motif, pas
hérités du balayage fautif. **Un motif par commande, dans un `$( )`.**

---

## 8. Ce qui reste DÉDUIT — avec le test « si ça se résolvait défavorablement ? »

**D-A · Le lab ne rentre pas sur sa parcelle (35.5 % de son empreinte opaque hors du fond).**
Résolution défavorable ⇒ le joueur voit son bâtiment principal tronqué net au bord du fond.
*Une décision de CE lot changerait-elle ?* **Non** — la découpe reste le bon geste dans tous les cas
(l'alternative est de peindre un bâtiment sur la bande de letterbox, ce que le juge a classé
DÉFAUT). Ce qui change, c'est un arbitrage DA/back hors rayon : re-rendre le sprite à une autre
échelle, ou faire choisir au grant des blocs non périphériques. ⇒ **différé légitime, et il porte
son détecteur : F5.** Remonté en §9.

**D-B · La taille des marqueurs varie de 29×38 à 85×82 px selon le type de bâtiment** (fraction du
fichier sprite). *Une décision de ce lot changerait-elle ?* **Non** : le défaut mesuré est
horizontal et positionnel ; fixer une taille est un choix DA sans mesure pour le trancher, et le
faire ici serait inventer de la DA. ⇒ différé, §9 point 3. Pas de détecteur dédié : F4 (rects
contenus) reste vraie quelle que soit la taille, et l'écrêtage la rend vraie **par construction**.

**D-C · `CanvasScaler` sous une caméra à `targetTexture`.** Je n'ai pas pu mesurer si
`ScaleWithScreenSize` suit la taille du RT plutôt que celle de `Screen`. *Résolution défavorable ⇒
une décision changerait-elle ?* **Oui** — la sonde F3 mesurerait la mauvaise géométrie. ⇒ **ce
n'était pas un différé, c'était une mesure due** : le doute est **supprimé par conception**, pas
documenté — la sonde impose `ConstantPixelSize` + `scaleFactor = 1` (§4, F3, point 3), où la
question ne se pose plus. Et si le montage échouait quand même, l'assertion (a) « sonde non
dimensionnée » **rougit** au lieu de passer.

**D-D · Le comportement de `_ClipRect` quand aucun masque n'est présent.** `UIAdditive.shader:50`
applique la découpe sans garde `#ifdef`. Les calques additifs sont pourtant visibles aujourd'hui
(`nav-district-F10`, `DistrictMapNavigationPlayModeTests.cs:467-471`, exige un `WindowLight` à
sprite réel sur `cash_safehouse`) ⇒ la valeur par défaut fournie par `CanvasRenderer` est permissive.
*Décision changée si faux ?* **Non** — et F3 point (c) l'exerce dans les deux états du contrôle
positif.

**D-E · Ce que la découpe change en repli (profils sans fond).** La branche `:443-463` ne pose
**aucun** backdrop (`:419` est dans l'autre branche) : du contenu hors placeholder s'y dessine sur
le fond du shell. *Décision changée ?* **Non** — sans fond il n'y a pas de letterbox, donc pas le
défaut de ce lot. **Non mesuré** : je n'ai pas quantifié le débord des cellules de repli (grille de
secours `(x·100, −y·100)`, `:564`). Consigné tel quel.

**Explicitement NON déduit, parce que je l'ai compté** : la répartition des 10 ancres · le fait
qu'aucun test n'asserte `DistrictScene.childCount` · le débord de chacune des 4 cellules · l'index
du marqueur perdu · l'effet de `padding` sur la découpe · le support `_ClipRect` du shader additif
et de TMP · l'absence de tout `RectMask2D` préexistant.

---

## 9. Ce qui remonte à l'user (arbitrages PRODUIT, pas techniques)

1. **Le lab tronqué de 35.5 %** au bord gauche du fond (D-A). Options : re-rendre `usine` à une
   échelle qui tienne sur une parcelle de 6.5 m ; ou faire choisir au grant des blocs non
   périphériques ; ou accepter la troncature. Aucune n'est tranchable par la mesure.
2. **Les marqueurs de lieutenant passent sur le pied du bâtiment** (§5). Variante possible : sous la
   ligne de sol — mais elle empiète sur la parcelle voisine.
3. **La taille des marqueurs varie du simple au triple selon le bâtiment** (D-B). Une taille fixe
   est un choix DA.

---

## 10. Ce que ce design N'A PAS fait

Aucun test lancé, aucun éditeur Unity touché, aucune stack Docker montée : une suite PlayMode
tournait, et un seul éditeur ⇒ un seul pilote. Toutes les mesures ci-dessus sont **statiques** :
lecture de sources, du JSON d'ancrage, des `.meta`/`.asset`, des PNG (PIL), du paquet uGUI, et de la
capture déjà commitée. Aucune n'exige un run.
