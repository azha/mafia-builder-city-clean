# nav-hud-design-v1.md, chunk 1 — remplissage ambiant parcellaire — implementation-notes.md

Design : `Tools/nav-hud-design-v1.md` §2 (Décisions A-D, §2.1-§2.7), §8 (mondes dégénérés amb-F1..F8),
§8-bis (paramètres de sonde GELÉS), §9 (runs). Design APPROVED par gate ⊥ — exécuté tel quel côté
géométrie/décisions ; le design **n'a pas été modifié**. Repo `mafia-builder-city-clean`, branche
`main` directement (précédent du chantier).

## Ce qui a été livré

1. `Assets/Scripts/CityMap/BuildingSpriteSlots.cs` — `AmbientTemplate` (nuit/jour/poids),
   `AmbientSet` (templates[], streetEveryX, streetEveryY, facadesParParcelle, `PickWeighted(hash)`),
   champs `ambientVerge`/`ambientDefaut`, `ResolveAmbient(profile)` exhaustif à repli déclaré
   (jamais null tant que l'asset est chargé). Aucun nom de fichier sprite en C# (C6-F3 étendu).
2. `Assets/Resources/BuildingSpriteSlots.asset` — `ambientVerge` peuplé au mix §2.5
   (residentiel2/3/4/5 poids 4 · epicerie/barbier/laverie/diner poids 2 · hotel poids 1 ·
   bar_hero/entrepot/usine ABSENTS — 9 templates, Σpoids=25) ; `ambientDefaut` = 12 familles poids 1.
   `streetEveryX=5`, `streetEveryY=0` (désactivé) pour les deux — valeur RETENUE par le design lui-même
   (§2.1), vérifiée par calcul : grille J0 10×4 ⇒ **8 cellules-rue / 40 = 20 %** (dans `[4,12]`, §2.7).
   `facadesParParcelle=4` pour les deux (2 rangs × 2 — Décision C). Sprites référencés par GUID YAML,
   recopiés du format existant du même asset (patron `frontShop:`/`cashSafehouseOv:` etc.).
3. `Assets/Scripts/CityMap/DistrictInteriorScreenController.cs` — `IsStreetCell(x,y,set)` (partition
   §2.1) ; dans la passe 1 du rendu (boucle `:309-...`), la branche `else` (bloc non possédé) route
   vers `BuildEmptyCell` si cellule-rue, sinon vers la nouvelle `BuildAmbientCell` (à la place de
   `BuildEmptyCell`, §2.4). `BuildAmbientCell` : hash maison étendu (`x*73856093 ^ y*19349663 ^
   (2i+r)*83492791`), 2 rangs × 2 façades, pivot bas-centre, échelle EXACTE `k =
   CellSize/(metresParBloc*56)` (identique aux bâtiments joueur, `:401`), décalage latéral ±0,15×
   CellSize issu du hash, nommage `Ambient_{x}_{y}_{i}`. Aucun Socle/*Ov/LieutenantMarker/Button.
   N'apparaît qu'au palier NIGHT (`ResolveArtPhase` existant, inchangé). Cellules-rue : sol nu
   inchangé (`BuildEmptyCell`, non touché).
4. `Assets/Tests/PlayMode/DistrictAmbientFillPlayModeTests.cs` — amb-F1..amb-F8, `[Category("W3U2")]`,
   payload RÉEL (patron `DistrictInteriorDioramaPlayModeTests.cs:67-97`), `day_phase` forcé `"NIGHT"`.

## Falsifiables — statut (run réel, job Unity `ac6a4b75343f43039a9dcae62d3e1d20`)

54 tests dans la catégorie `W3U2` (46 existants + 8 amb-F*) : **53 verts, 1 rouge**. Les 46 existants
n'ont PAS bougé (aucun n'apparaît dans `failures_so_far`).

| # | statut | evidence |
|---|---|---|
| amb-F1 | 🟢 | déterminisme + ≥4 templates distincts observés sur 2 renders du même payload |
| amb-F2 | 🟢 | 4 possédées sans Ambient_*, total façades ≥90 (calcul indépendant : 29 parcelles libres réelles [40−8 rue−4 possédées, avec chevauchement possédé∩rue à (0,0)] × 4 = **116**, marge confortable) |
| amb-F3 | 🟢 | aucun Ambient_* ne porte Button ni enfant ; 7 compteurs stables à payload égal ; RenderedBuildingCount==4 ET RenderedCellCount==40 dans la même assertion |
| amb-F4 | 🟢 | tous les sprites rendus ∈ `ResolveAmbient("verge").templates`, table non vide |
| amb-F5 | 🔴 | **voir § CONFLIT ci-dessous** |
| amb-F6 | 🟢 | cellules-rue non possédées sans Ambient_*, 8 cellules-rue ∈ [4,12] |
| amb-F7 | 🟢 | REUSE `CanonPaletteComparator.ExpectedTokenCount == 51` (détecteur déjà livré) |
| amb-F8 | 🟢 | aire opaque/parcelle ≥0,25 (oracle PIL indépendant α≥128, corroboré à ±0,006 des colonnes §1.2 du design — ex. epicerie 0,0934 vs 0,094 mesuré design, hotel 0,2421 vs 0,244) |

## § CONFLIT — amb-F5 : la géométrie du design NE PEUT PAS satisfaire son propre seuil (STOP, remonté)

**Mesuré, pas déduit — trois voies indépendantes convergent sur le même chiffre :**

1. **PIL hors-Unity** sur les 9 PNG du mélange `verge` (dimensions réelles, poids §2.5) :
   moyenne pondérée = 0,3999 × CellSize.
2. **Unity live** (`execute_code` contre l'asset RÉELLEMENT chargé, `Sprite.rect.width` réel,
   `metresParBloc=16` réel) : moyenne pondérée = **0,3999 × CellSize** (identique à 1, aux 4 décimales).
3. **Le test réel** (`AmbF5_...`, run Unity, ~116 façades tirées par le hash de production) :
   largeur moyenne observée **39,63 px pour CellSize=100 px, soit 0,3963×CellSize**.

Les trois s'accordent à ±0,004 — ce n'est pas un bruit d'échantillonnage, c'est la géométrie.

**La chaîne du conflit, chaque maillon étant une clause EXPLICITE du design v2 approuvé :**
- §2.3 Décision C fixe l'échelle ambiante à **exactement** celle des bâtiments joueur :
  `k = CellSize/(metresParBloc·56)` — pas de marge de manœuvre.
- §2.3 elle-même calcule "la largeur moyenne pondérée du mélange verge est **6,41 m**" sur une cellule
  de 16 m — soit un ratio de **0,40**, un chiffre que le design **écrit lui-même**.
- §2.7/§8 amb-F5 exige "largeur moyenne **≥ 0,45 × CellSize**".

0,40 < 0,45. Le design a écrit, dans la MÊME version, le nombre qui réfute son propre seuil deux
paragraphes plus loin (§2.3 vs §2.7) — sans jamais les rapprocher. C'est la même famille que
"1-sexies"/"deux documents se déclarent mutuellement propriétaires" du socle : chaque section, lue
seule, est cohérente ; la contradiction n'apparaît qu'en les rapprochant.

**Je n'ai PAS :**
- changé les poids du mélange `verge` (ce qui gonflerait artificiellement la moyenne vers les
  familles les plus larges — un choix produit/esthétique qui n'est pas le mien) ;
- changé l'échelle ambiante pour qu'elle diffère de celle des bâtiments joueur (contredirait
  frontalement la Décision C, l'un des 4 axes ⊥ nommés du chunk) ;
- assoupli le seuil `0,45` dans le test (masquerait le défaut plutôt que de le documenter) ;
- modifié `nav-hud-design-v1.md` (hors mandat, explicitement interdit par la tâche).

**Ce qui a été fait à la place** : implémenter §2.1-§2.4 fidèlement, écrire amb-F5 EXACTEMENT comme
§8 le spécifie, le laisser rouge, et consigner ici la preuve à trois voies. Le choix de correction
revient à spec-writer/reviewer — options visibles depuis ce chunk, aucune tranchée : (a) revoir les
poids du mélange `verge` vers les familles plus larges (hotel, poids actuel 1, est la SEULE ≥0,45
avec 0,452 — le reste du mélange est structurellement sous le seuil) ; (b) revoir le seuil `0,45`
lui-même à la lumière de la moyenne réellement dérivable (~0,40, avec la marge de §2.3) ; (c) une
échelle ambiante distincte de celle des bâtiments (rouvrirait la Décision C).

## § Deviations (imprévus non bloquants, option conservatrice, consignés)

1. **`AmbientSet` — consolidation `rangs`/`façadesParRang` → `facadesParParcelle`.** Le design (§2.2)
   propose deux champs (`rangs`, `façadesParRang`) ; la tâche demande explicitement un champ unique
   `facadesParParcelle` (sans cédille). J'ai suivi l'instruction explicite : `facadesParParcelle=4`
   sur l'asset, avec `rangs=2`/`facadesParRang=2` fixés en `const` dans
   `BuildAmbientCell` (Décision C, §2.3, motivée comme non-arbitraire par le design lui-même —
   "pourquoi pas plus"). Aucune falsifiable ne dépend du nom/de la forme de ce champ ; option qui
   change le moins de surface par rapport à la consigne reçue.
2. **Borne haute de `amb-F6` : la tâche disait "4..20 cellules-rue", le design (§2.7/§8) dit
   "4 ≤ cellules-rue ≤ 12".** Le design fait foi — implémenté et testé avec 12, pas 20. La valeur
   RETENUE par le design (`streetEveryX=5`, `streetEveryY` désactivé) donne 8, dans les deux bornes,
   donc ceci n'a pas changé le comportement livré — seule la borne testée dans amb-F6 diffère de la
   paraphrase de la tâche.
3. **Plancher de `amb-F2` : la tâche disait "≥36 façades", le design (§2.7) dit "≥90".** Implémenté
   et testé avec 90 (design fait foi). Observé/calculé : 116, large marge des deux côtés.
4. **`AmbientTemplate.jour` peuplé mais non consommé ce chunk.** Le design déclare le champ ; §2.5
   dit explicitement que l'ambiant n'apparaît qu'au palier NIGHT (aucun chemin de rendu jour ce
   chunk). Peuplé dans l'asset par cohérence de contrat (GUIDs déjà connus, coût nul) plutôt que
   laissé vide — pas un champ sans consommateur permanent, un champ dont le consommateur est un
   chunk futur (le repli DAWN/DAY/DUSK reste le panneau nommé existant, inchangé).
5. **amb-F8 — méthode de calcul de "l'aire opaque" non prescrite par le design au niveau du test.**
   Les textures sources sont `isReadable: 0` (vérifié dans les `.meta`) — `Texture2D.GetPixels()`
   échouerait au runtime. Le test utilise donc un oracle mesuré OFFLINE (PIL, seuil α≥128, même
   méthodologie que §1.2) indexé par `Image.sprite.name`, combiné à la taille RÉELLEMENT rendue
   (`RectTransform.rect`) — analytique, pas de lecture pixel au runtime, pas de nom de fichier en
   production (l'oracle vit dans le fichier de TEST, C6-F3 ne porte que sur le code de production).
   Pas de correction de recouvrement pairwise (le design qualifie lui-même le rabais de recouvrement
   comme DÉDUIT, §2.3) : somme non rebâtue, borne supérieure honnête, marge suffisante (~0,51 observé
   analytiquement contre un plancher de 0,25) pour que l'omission ne change pas le verdict.

## Evidence — commandes et sorties

```
$ python3 -c "... calcul cellules-rue streetEveryX=5/streetEveryY=0 sur grille 10x4 ..."
street cells: 8 of 40 = 20.0 %
```

```
run_tests PlayMode category=W3U2 (job ac6a4b75343f43039a9dcae62d3e1d20)
completed=54 total=54
failures_so_far: [AmbF5_FacadesOverlapSomewhere_DistinctPositions_AverageWidthFloor
  "amb-F5 — largeur moyenne ≥ 0,45×CellSize (observé 39.63px, CellSize 100.00px, seuil 45.00px)"]
```

## Sonde de composition (§1.0/§8-bis, rendu de contrôle)

Rendu : `Assets/Screenshots/diorama_nuit_chunk1.png` (1100×577), payload réel district 16 (profile
`verge`), `day_phase` réécrit `NIGHT`, hôte nu (pas de shell). bbox de grille détectée par balayage
PIL (fond `(34,39,50)`, y≥100, même méthodologie que §1.1) : **x 104..989, y 128..484** (886×357),
cohérent avec le bbox r8 du design (104..980/981, 128..484/485) à la largeur de grille près (CellSize
100 ici contre ≈87,7 sur r8).

Sonde réimplémentée indépendamment (Rec.601, resize 360px large, fenêtre 7×7, plat=sd<2,
quantification 32 niveaux, régions 4-connexes — paramètres GELÉS §8-bis). **Calibration** contre le
chiffre cité par le design pour r8 bbox-grille (68,7 %) : ma sonde y mesure **65,9 %** — écart de
2,8 pts, dans l'ordre de grandeur des divergences inter-sondes déjà documentées par le design lui-même
(§1.0 : "l'écart va de 14 à 26 points" entre sondes non alignées ; ma réimplémentation, non copiée,
fait mieux que cette référence historique mais n'est pas bit-exacte).

**Chunk 1, bbox de grille : platitude = 28,8 %** (gate ≤58 %, attendu ≈50,2 % par le modèle du
design — observé nettement EN DESSOUS du modèle, marge de 29,2 pts sur le gate). Écart au modèle
plausible : le modèle §2.6 suppose une bande bâtie à 43,0 % de platitude (mesurée sur les 4
bâtiments joueur SEULS, r8) ; les façades ambiantes réellement rendues (silhouettes détaillées,
fenêtres, toitures) introduisent visuellement plus d'arêtes que ce que 4 échantillons pouvaient
prédire pour ~29 parcelles. Confirmé visuellement (capture jointe) : parcellaire rue/parcelle net,
2 rangs visibles, variété de gabarits, aucune façade sur les 4 possédées ni sur les colonnes-rue
(x=0, x=5).

## Deviations non liées au code (ménage de fin de tâche)

- `Assets/InitTestScene<guid>.unity(.meta)` — scratch scene auto-générée par le test-runner Unity
  pendant les runs PlayMode, supprimée avant commit (jamais trackée, jamais référencée).
- Un test temporaire de capture d'écran (`ZZ_Scratch_CaptureControlScreenshot`) a été ajouté,
  exécuté une fois pour produire `diorama_nuit_chunk1.png`, puis RETIRÉ avant le commit final — il
  ne fait pas partie des 8 falsifiables du chunk et aurait ajouté une dépendance de capture d'écran
  non nécessaire à la suite permanente.
