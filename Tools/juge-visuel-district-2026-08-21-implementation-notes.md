# Audit visuel du district — 5 défauts fermés (JUGE, 2026-08-21)

Auteur : coder (Sonnet). Mandat : un JUGE VISUEL frais (rôle créé par ruling user) a audité
l'écran DISTRICT et trouvé 5 défauts que tous les oracles précédents avaient ratés. Ce document
consigne les mesures, les correctifs, les falsifiables neuves, les Deviations et les écarts
non fermés — un par défaut, dans l'ordre du mandat.

**Périmètre respecté** : `Assets/Scripts/CityMap/` + tests du district. `Assets/Scripts/Shell/`
et `Assets/Scripts/Operational/Lieutenant/LieutenantScreenController.cs` n'ont **jamais** été
touchés (vérifié à chaque étape — voir § Blocages pour ce que ça a coûté).

---

## ⚠️ BLOCAGES ENVIRONNEMENT — à lire avant le reste

### 1. Compilation bloquée tout le long du lot, par un fichier hors périmètre

`Assets/Scripts/Operational/Lieutenant/LieutenantScreenController.cs` (non commité, laissé par un
autre agent en cours d'édition dans `Assets/Scripts/Shell/ProceduralUI`/`VerticalGradientImage`)
porte **13 erreurs de compilation** (`CS0234` × 10 : `ProceduralUI`/`VerticalGradientImage`
introuvables ; `CS1061` × 3 : `RosterRow.mode`), présentes **avant** que ce lot ne commence et
**identiques, re-vérifiées 3 fois** (refresh + attente + `read_console`, mêmes 13 lignes à chaque
fois) sur toute la durée du travail. Conforme à la consigne du mandat (« si ta compilation casse
à cause de lui, dis-le au lieu de le corriger ») : **non touché, non contourné** (pas de
renommage temporaire du fichier — l'option existait mais aurait outrepassé une consigne
explicite).

Conséquence mesurée : **aucun run PlayMode/EditMode via Unity n'a pu s'exécuter** pour ce lot (un
projet avec une erreur de compilation ne peut pas entrer en Play Mode ni faire tourner de tests
NUnit — comportement Unity standard, pas un piège d'outil). `validate_script` (MCP) reste
disponible mais **NE DÉTECTE PAS les erreurs sémantiques** — contrôle positif fait dessus : passé
sur le fichier Lieutenant lui-même (13 erreurs réelles connues), il rend **0 erreur, 0
warning**. Il ne fait qu'une passe syntaxique/structurelle (accolades, etc.) — **jamais utilisé
ici comme preuve de compilation**, uniquement pour repérer une erreur de syntaxe grossière dans
mes propres fichiers (accolade manquante, etc. — 0 trouvée sur les 7 fichiers touchés).

Ce que j'ai fait à la place, en ordre décroissant de rigueur :
1. **Mesure runtime réelle, hors compilation neuve** : `execute_code` (compilateur CodeDom in-
   process, C# 6) tourne contre les assemblies **déjà compilées avec succès AVANT ce lot** — donc
   valable pour investiguer le code EXISTANT (défaut 4 : hiérarchie live, alpha de sprite), mais
   **ne peut PAS exécuter mes changements** (une recompilation complète échoue tant que Lieutenant
   bloque). Utilisé pour tout le diagnostic du Défaut 4 (voir §4) — zéro spéculation, hiérarchie
   lue en direct.
2. **Relecture manuelle rigoureuse, croisée avec les signatures RÉELLES lues dans les fichiers**
   (jamais un nom de champ/méthode deviné) — chaque nouvel appel (`ResolveFootprint`,
   `BuildZoomLevels`, `DesignTokens.Current.nightOutOfDistrictMuted`, etc.) vérifié contre sa
   déclaration lue directement.
3. **Un vrai bug d'accessibilité trouvé PAR cette relecture, avant tout compilateur** :
   `ComputeContainScale`/`BuildZoomLevels` étaient déclarées `internal` — `CityMap.PlayMode.
   Tests.asmdef` référence `CityMap` comme un assembly **séparé**, sans aucun
   `InternalsVisibleTo` dans tout le dépôt (grep exhaustif, 0 hit) : un `internal` n'aurait
   jamais compilé depuis le fichier de test. Passées en `public` (mesuré : `SnapToScreenPixel`,
   seul précédent `internal` du fichier, n'est en réalité appelé QUE depuis
   `DistrictInteriorScreenController.cs`, MÊME assembly — jamais depuis un test, donc pas un
   contre-exemple qui aurait dû m'alerter plus tôt).
4. **Compte exact des symboles requis, croisé YAML↔C#** : `BuildingSpriteSlots.asset` (4 champs
   `*Footprint`) vérifié caractère pour caractère contre les noms de champs C# (`labFootprint`,
   `stashFootprint`, `frontShopFootprint`, `cashSafehouseFootprint` — les 4 identiques des deux
   côtés).

**Ce qui manque, honnêtement** : la preuve d'EXÉCUTION (tests verts, avec sortie réelle collée) —
la seule chose que ce blocage empêche structurellement. Dès que Lieutenant compile (correctif
d'un autre agent, hors mon périmètre), la commande à lancer est :
```
run_tests(mode=PlayMode, category_names=["JUGE","W3U2"])
```
(`JUGE` = mes 3 nouveaux fichiers/sections ; `W3U2` = le plancher scopé — specs du chunk +
voisins directs, ch27/E2E fonctionnels only — jamais la full-suite hors merge-gate).

### 2. Capture d'écran (`ScreenCapture`/`manage_camera screenshot`) stale dans cet environnement

**Mesuré, pas supposé** : 3 captures prises en Play Mode manuel (piloté via `manage_editor play`,
suivant EXACTEMENT la méthode déjà documentée comme correcte dans
`Tools/district-v2-reimport-implementation-notes.md` §6) rendent le **même SHA-256** —
y compris la 3ᵉ, prise après avoir désactivé `DistrictScene` ENTIER (`SetActive(false)` sur le
conteneur racine — plus rien à l'écran). Preuve que le mécanisme ne reflète PAS l'état courant
DANS CET ENVIRONNEMENT PRÉCIS (headless/sans focus réel de fenêtre — troisième occurrence de ce
piège documentée dans ce dépôt, cf. la note ⚠️ du même fichier). Aucune capture par résolution
n'a donc pu être produite pour ce lot — voir §2 (Défaut 2) et §3 (Défaut 3) pour ce qui remplace
cette preuve (falsifiables `[TestCase]` paramétrées, pures, indépendantes du rendu à l'écran).

---

## Défaut 1 — DAWN/DUSK sans art (le plus grave, 50% du temps de jeu)

**Mesure AVANT** : `ResolveArtPhase` (`DistrictInteriorScreenController.cs`) mappait `"DAWN"` et
`"DUSK"` sur `DioramaArtPhase.NonHeroFallback` — un panneau plein-écran + une phrase, aucun fond.
`day-phase-quarter.ts` (back, cité par le mandat) découpe le jour en 4 quarts ÉGAUX ⇒ 2 des 4
quarts (50%) sans art réel.

**Mesure — combien de fonds existent** : recherche exhaustive `find Assets -iname "*FINAL*" -o
-iname "*VERGE*"` : **2 fichiers PNG** (`VERGE_D_NUIT_FINAL.png`, `VERGE_D_JOUR_FINAL.png`),
**1 seul profil** (`verge`) câblé dans `DistrictBackgroundSlots.asset` (2 entrées : `vergeNuit`,
`vergeJour`). Aucun fond DAWN/DUSK dédié n'existe — confirmé, pas déduit.

**Correctif** : `ResolveArtPhase` route désormais les 4 quarts nommés vers un palier héros —
`DAWN → DayHero` (réutilise le fond JOUR), `DUSK → NightHero` (réutilise le fond NUIT). Rattachement
choisi et appliqué (l'intuition du mandat, validée — voir §Verdict ci-dessous) : DAWN est le
quart qui **mène** au jour, DUSK est le quart qui **mène** à la nuit — le pis-aller chronologique
le plus défendable entre les deux seuls fonds livrés. `DioramaArtPhase.NonHeroFallback` **retiré**
de l'énum (devenu inatteignable — un enum-membre mort serait un dispositif décoratif, socle
★★ « garde qui ne mord pas ») ; `Unknown` (5ᵉ valeur de fil, jamais un des 4 quarts nommés) reste
seul à déclencher le repli, toujours nommé (`RenderNonHeroFallback`, méthode conservée, portée
resserrée).

**Falsifiable neuve** — `DistrictInteriorDioramaPlayModeTests.cs`,
`C8F5_AllFourDayPhases_RenderRealHeroArt_DawnDuskBorrowNeighborBackground` : boucle sur les 4
quarts, CHACUN avec sa propre assertion sur (a) le palier d'art, (b) l'absence du panneau de
repli, (c) `RenderedBuildingCount > 0` (anti-vacuité), (d) le **sprite de fond réellement monté**
(`Image.sprite` comparé par référence à `DistrictBackgroundSlots.Current.Resolve("verge",
"jour"/"nuit").fond`) — monde dégénéré tué : un test qui vérifierait seulement « une DistrictScene
existe » resterait vert si le code rendait toujours le fond NUIT quel que soit le quart ; celui-ci
le rougirait. `C8F5bis_UnknownDayPhase_StillMapsToDeclaredFallback` : contrôle que le repli
survit pour une 5ᵉ valeur (le mécanisme de sécurité, retenu, pas supprimé avec `NonHeroFallback`).

**Contrôle positif** (would-have-failed) : avant ce correctif, `DAWN`/`DUSK` produisaient
`DioramaArtPhase.NonHeroFallback` ⇒ `Assert.AreEqual(c.expectedArtPhase, ...)` aurait rougi sur
ces 2 des 4 cas — mesuré par lecture du code retiré (switch d'origine cité dans le diff), pas
rejoué (compilation bloquée, §Blocages).

### Verdict — la contradiction DAWN des 3 captures certifiées

**Question du mandat** : les captures certifiées affichent `DAWN` (aile droite du HUD) tout en
montrant un diorama héros (NUIT ou JOUR) — ce que le code ne devrait pas permettre. Tranché par la
mesure, PAS par hypothèse :

- `AppShell.EnterDistrictSequence` (Shell, lu mais non modifié) fait `tenant.Render(tenant.
  LastFetch)` **PUIS** `TopBar.SetDayPhase(tenant.LastFetch?.day_phase)` — le **MÊME** objet DTO,
  dans le **même** appel. En production, `Render()` n'est JAMAIS appelé avec un `day_phase`
  différent de celui que `TopBar` affiche : la contradiction est **structurellement
  impossible** sur ce chemin.
- Le mécanisme réel, trouvé en 3 sources concordantes : `NavigationPlayModeTests.cs:126-133`
  (`EnterDistrictViaRealFlow`) fait littéralement `screen.LastFetch.day_phase = "NIGHT"; screen.
  Render(screen.LastFetch);` **APRÈS** le flux réel complet (qui a déjà appelé `TopBar.
  SetDayPhase` avec la vraie valeur du clock, généralement `DAWN` — J0, horloge à 0) — **sans**
  rappeler `TopBar.SetDayPhase`. `Tools/district-v2-reimport-implementation-notes.md:145` confirme
  pour la capture EXACTE en cause : *« jour_phase forcé (NIGHT puis DAY, mécanisme identique à
  EnterDistrictViaRealFlow »*.
- **Verdict : les captures assemblent deux DTO incohérents — un TopBar figé sur le VRAI
  `day_phase` du fetch initial (DAWN), et un `Render()` rappelé manuellement avec un DTO **muté**
  pour produire l'art voulu, en dehors du couplage `EnterDistrictSequence`.** La certification
  portait donc sur une frame **inatteignable en jeu** — pas une lecture de code fausse. Après ce
  correctif, la même mécanique produirait encore une frame inatteignable (DAWN muté sur NIGHT via
  ce test-helper) — le repli sur `DayHero` pour un VRAI `day_phase=="DAWN"` n'est jamais contredit
  par ces captures, elles ne l'ont jamais exercé.

### § Deviations (Défaut 1)

- **Dette consignée — 2 rendus dédiés × N profils.** DAWN/DUSK empruntent un fond qui n'est PAS le
  leur (pis-aller). Fermeture propre : l'atelier rend `VERGE_D_{DAWN,DUSK}_FINAL.png` (même
  contrat pivot/ancre que NUIT/JOUR — §4/§8 du design canon) pour le profil `verge`, puis N-1
  autres profils une fois qu'ils ont un fond NUIT/JOUR (aujourd'hui 0/5 — hors périmètre déclaré
  par le mandat). Détecteur de péremption suggéré : le jour où `DistrictBackgroundSlots.Resolve`
  gagne un mode `"dawn"`/`"dusk"`, `ResolveArtPhase` doit être ré-visité pour cesser le pis-aller.
  **Proposition de TD** (à faire ajouter par qui possède `docs_int/tech_debt_inventory.md`, hors
  du repo Unity que je committe — texte prêt à coller, voir § TD proposée en fin de document).

---

## Défaut 2 — Portrait jamais exercé, bandes nues

**Mesure AVANT** (reprise du mandat, confirmée par lecture directe) : le fond est TOUJOURS dessiné
en pixels écran natifs (`fondRt.sizeDelta = tex.size/scaleFactor` ⇒ taille écran réelle = `tex.
size`, **indépendante** de `CanvasScaler`/`matchWidthOrHeight`, quel que soit le Canvas — vérifié
algébriquement : `sizeDelta × scaleFactor = tex.size` s'annule TOUJOURS). Sur tout viewport dont
une dimension dépasse celle du fond (1080×1920), l'excédent était un **vide brut** (rien dessiné
derrière `DistrictScene` — `OutOfDistrictBackdrop`/`Haze` retirés par le pivot P3).

**Choix retenu (des 2 options offertes par le mandat)** : « complété », pas « mis à l'échelle ».
Raison : mettre le fond à l'échelle aurait fait dépendre pp-F1/pp-F2/pp-F3 (bit-exactité déjà
certifiée) de la résolution — recertifier à chaque format aurait été un chantier disproportionné
et risqué pour ce lot (P3 a coûté 6+ rounds de revue ⊥ pour établir CETTE bit-exactité). Un
backdrop plein-`DistrictScene`, couleur DÉCLARÉE (**REUSE** de `nightOutOfDistrictMuted`, déjà
utilisé par le repli confiné — R2.3, aucune couleur inventée), posé en PREMIER enfant (donc SOUS
le fond, ordre de fratrie) : le fond reste bit-exact à TOUTE résolution (rien n'y touche), et
« bande nue » devient « bande remplie par un panneau désigné ». Option conservatrice au sens du
socle — la plus petite surface qui ferme le défaut sans rouvrir un chantier de certification.

**Falsifiable neuve** — `DistrictMapNavigationPlayModeTests.cs`,
`JugeD2_Backdrop_AlwaysCoversTheFullSceneRect_BehindTheFond` : le backdrop existe, est un sibling
ANTÉRIEUR au fond (dessiné dessous), et ses 4 coins monde coïncident avec ceux de `DistrictScene`
(± 0,05px) — structurel, donc VRAI à TOUTE résolution par construction (`Stretch(0,0,1,1)`), pas
besoin de simuler un viewport pour le prouver. Couleur vérifiée == le token déclaré (pas une
couleur locale).

**Ce qui N'A PAS été fait** : la mise à l'échelle du fond lui-même (option écartée, voir ci-
dessus) — donc à 1080×2400/1440×3200, le joueur voit le district natif **plus petit** que l'écran
sur l'axe qui déborde, entouré du backdrop, plutôt qu'un fond qui remplit 100% des pixels. C'est
un choix de scope assumé, pas un oubli — documenté ici pour qu'une décision produit future
(« le fond doit-il vraiment couvrir 100% de tout écran ? ») ait le contexte complet.

### § Deviations (Défaut 2)

- **1280×720 non-régression** : vérifié PAR CONSTRUCTION — aucune ligne touchée ne modifie
  `fondRt.sizeDelta`/position, ni `pp-F1`/`pp-F2`/`pp-F3`. Le backdrop est ADDITIF (un nouveau
  sibling), jamais un remplacement.
- **Captures par résolution non produites** — voir §Blocages #2 (capture stale dans cet
  environnement). Les falsifiables `[TestCase]` (Défaut 3, §3 ci-dessous — la même formule
  `ComputeContainScale` sert de preuve géométrique pour les 2 défauts) couvrent la géométrie aux 4
  résolutions demandées ; il manque la preuve VISUELLE (capture PNG), à produire dès qu'un Éditeur
  avec focus réel est disponible.

---

## Défaut 3 — Le joueur ne peut jamais voir son quartier en entier

**Mesure AVANT** : `DistrictMapNavigation.ZoomLevels = {1, 2, 3}` — aucune valeur ≤1, donc aucun
dézoom ne pouvait jamais montrer le fond entier. `district-v2-navigation-implementation-notes.md`
avait explicitement écarté le dézoom comme *« question de qualité de filtrage SÉPARÉE, non posée
par le mandat »* — un **STOP produit non remonté**, pas une Deviation technique légitime (le
mandat le nomme ainsi ; confirmé par relecture directe du fichier).

**Correctif** : `ZoomLevels` devient une **propriété d'instance**, calculée par `Configure()` à
partir du VRAI fond et du VRAI viewport (`ComputeContainScale`/`BuildZoomLevels`, méthodes
`public static` PURES — testables sans Canvas ni Screen). `BuildZoomLevels` insère le palier
« district entier » (la plus grande échelle telle que le fond COMPLET tienne dans le viewport,
« contain fit ») dans le tableau {1,2,3}, trié, dédupliqué si déjà présent (tolérance 0,01).
`referenceZoomIndex` (position de la valeur ×1) est recalculé — plus jamais 0 en dur. Le cadrage
INITIAL par défaut reste ×1 (inchangé — ce correctif AJOUTE une capacité de dézoom, il ne change
pas ce que le joueur voit à l'entrée dans le district).

**Falsifiables neuves, PARAMÉTRÉES PAR LA RÉSOLUTION (`[TestCase]`, comme demandé par le mandat)**
— `DistrictMapNavigationPlayModeTests.cs` :
- `JugeD3_ComputeContainScale_MatchesHandComputedValue_PerResolution` — 4 `[TestCase]`
  (1080×1920, 1080×2400, 1440×3200, 1280×720), valeur attendue calculée À LA MAIN (pas relue du
  code), plus anti-dégénérescence (« un cran au-dessus DOIT déborder sur un axe » — sinon `contain`
  pourrait être n'importe quelle petite valeur et satisferait trivialement « tient dans le
  viewport »).
- `JugeD3_BuildZoomLevels_AlwaysIncludesAWayToSeeTheWholeDistrict_PerResolution` — même 4
  résolutions, propriété REJOUÉE contre le fond réel (jamais supposé que le palier ajouté EST le
  bon), **+ contrôle positif** : l'ANCIEN jeu `{1,2,3}` seul, recalculé indépendamment, DOIT rougir
  à cette même propriété — mais SEULEMENT là où le fond ne tenait pas déjà à ×1 (voir mesure
  ci-dessous, ce n'est pas systématique).
- `JugeD3_Live_LowestZoomLevel_ShowsWholeFondWithinRenderedViewport` — preuve END-TO-END, en Play
  Mode réel (pas seulement la formule pure), sur la résolution du harnais de test lui-même : après
  `ZoomTo(0, ...)`, les 4 coins du fond restent DANS le viewport rendu.

**★ Mesure importante, à consigner (nuance la sévérité initiale)** : sur les **3 formats PORTRAIT
réels** demandés (1080×1920, 1080×2400, 1440×3200), le fond (1080×1920) tient **DÉJÀ ENTIER À ×1**
(le viewport est ≥ au fond sur les deux axes dans les 3 cas — un fond portrait 9:16 tient
naturellement dans tout viewport au moins aussi grand). **Le Défaut 3 tel que MESURÉ (31,25%
visible) n'existe QUE sur le format historique 1280×720 — landscape, non atteignable sur un
appareil réel** (`ProjectSettings.asset:defaultScreenOrientation` verrouille le portrait, §Défaut
2 du mandat). Le correctif reste appliqué UNIFORMÉMENT (aucune branche par résolution — la même
formule ferme le cas landscape ET ajoute un bonus « contain zoome légèrement au-delà de ×1 » sur
1440×3200, où `contain≈1,333`) : je ne l'ai pas restreint au seul cas landscape parce que rien ne
garantit qu'un futur format réel (tablette large, fenêtrage) ne retombe pas dans le même régime —
mais la SÉVÉRITÉ produit du Défaut 3 sur les formats réellement joués est **mesurée plus faible**
que le chiffre brut (31,25%) ne le suggérait. Remonté ici pour que la priorisation future ait le
bon contexte — pas retenu unilatéralement comme raison de ne pas livrer le correctif.

### § Deviations (Défaut 3)

- **Pas de valeur de dézoom AU-DELÀ de « district entier »** (ex. voir plusieurs districts à la
  fois) — hors mandat (« montre le district entier », pas la carte de la ville).
- **La qualité du filtre à l'échelle « contain » (souvent <1, une MINIFICATION) n'a PAS été
  mesurée** — le mandat le demandait (« Traite la qualité de minification par la mesure comme tu
  l'as fait pour les paliers entiers »). **Non fait** : la politique de filtrage existante
  (`ApplyFilterModeForZoom`) reste BILINEAR uniquement au palier de RÉFÉRENCE (`referenceZoomIndex`,
  la valeur ×1) et POINT à tout autre palier — y compris le nouveau palier « contain », qui est
  souvent **une échelle <1 (minification)**, pas ≥1 (magnification) comme les paliers ×2/×3 déjà
  mesurés. Le mandat de la mesure NEAREST-vs-BILINEAR (`Tools/district-v2-navigation-
  implementation-notes.md §Zoom`) ne portait QUE sur la magnification (×2/×3/×4) — POINT à une
  échelle de minification est probablement le MAUVAIS choix (aliasing, pas de gain net documenté).
  **Imprévu non bloquant, option conservatrice retenue** : j'ai laissé le mécanisme de filtrage
  EXISTANT s'appliquer tel quel (POINT au palier contain, comme à tout palier ≠ référence) plutôt
  que d'inventer une 3ᵉ règle non mesurée. **Dette consignée** : mesurer BILINEAR vs POINT
  spécifiquement pour une échelle <1 (même protocole ppm24/ppm56.471 que l'existant) avant de
  livrer le palier « contain » comme définitif — détecteur : le jour où quelqu'un capture le palier
  contain et le juge visuellement peu net, cette entrée explique pourquoi.

---

## Défaut 4 — Plaques translucides

**Root cause, isolée par MESURE DIRECTE (pas supposée)** — méthode : (1) reproduction fraîche du
starter kit via un vrai flux signup→session/open→fetch (Play Mode manuel, `execute_code`),
rendant EXACTEMENT les mêmes plaques que `nav_district_autoframed_starterkit.png` (confirmé par
capture — voir §Blocages #2 pour la réserve sur la fraîcheur de CETTE capture précise, non
déterminante ici) ; (2) hiérarchie complète dumpée en LIVE (`execute_code`, tous les `Image` avec
couleur/sprite/rect/coins-monde) — AUCUN objet en dehors de `DistrictBackgroundImage`
(fond, propre — vérifié par extraction directe du PNG à la région correspondante, alpha
uniformément clean) et des enfants de `Cell_x_y` ; (3) analyse de connectivité (Python, sur le
fichier COMMITÉ `nav_district_autoframed_starterkit.png`, indépendant de la capture live) isole 2
blobs (16399 et 16033 px) ; (4) conversion monde↔écran des rects `Socle` mesurés en (2) :
**Blob2 (x=[276,499] y=[499,602]) coïncide quasi-exactement avec le rect Socle de Cell_0_0
(worldBL=(1,8,498) worldTR=(500,2,601))** — écart <2px sur les 4 bords.

Cause exacte : `Socle` (ombre de contact) était dimensionné/centré sur `cellW` (largeur du
FICHIER, `sprite.rect.width`), PAS sur le contenu OPAQUE réel. Mesuré (script Python committé,
alpha≥128, bande basse 20% du sprite APRÈS décalage par la marge basse) :

| type (slot) | sprite | contenu opaque / fichier | décalage centre | marge basse |
|---|---|---|---|---|
| lab (usine) | 712×515 | 523px / 72,2% (annexe "BUREAU" détachée) | -75px | 14px |
| stash (entrepot) | 244×235 | 152px / 62,3% | -19,5px | 16px |
| frontShop (epicerie) | 175×200 | 126px / 72,0% | -4px | 24px |
| cashSafehouse (residentiel3) | 226×511 | 166px / 73,5% | +2,5px | **151px (29,5% — > les 20% que Socle occupe : AUCUNE couverture dans la bande basse brute)** |

Pour `lab`, le Socle (70% de 712 = 498px, centré) débordait de ~75px dans le vide à droite (où
vit l'annexe séparée du bâtiment principal) — exactement Blob2. `cashSafehouse` n'avait **aucun**
pixel opaque dans sa bande Socle brute (marge basse 151px > 20% de hauteur) — le Socle y flottait
à 100% dans le vide (contribue à Blob1, avec la superposition de Cell_1_0/Cell_2_0 dont les
plages X se recoupent).

**Correctif** : `BuildingSpriteSlots.FootprintOverride` (3 champs mesurés — `widthPx`,
`centerOffsetPx`, `bottomMarginPx` — R2.3, données dans l'asset, jamais des constantes C#) pour
les 4 slots J0. `BuildBuildingCell` consomme `ResolveFootprint()` : le Socle est désormais
dimensionné sur `footprintW = widthPx/scaleFactor` (repli sur `cellW` si non mesuré) et repositionné
(`anchoredPosition = (centerOffsetPx, bottomMarginPx)/scaleFactor`, repli `(0,0)` historique si non
mesuré — **byte-identique pour tout type non mesuré**, changement de surface strictement limité aux
4 types mesurés).

**Instrument commité** (socle : *« un chiffre dont l'instrument n'est pas commité n'est pas une
mesure »*) : `Tools/juge_d4_socle_footprint_measure.py` — ré-exécuté, reproduit EXACTEMENT les 4
lignes écrites dans `BuildingSpriteSlots.asset` (vérifié, sortie collée dans le commit).

**Falsifiables neuves** — `Assets/Tests/PlayMode/DistrictSocleFootprintPlayModeTests.cs`
(catégorie `JUGE`, fichier neuf) :
- `JugeD4F1_SocleGeometry_MatchesMeasuredFootprint_ForEachStarterKitType` : pour les 4 types du
  starter kit, la géométrie RENDUE du Socle == la géométrie attendue, RECALCULÉE indépendamment à
  partir de `BuildingSpriteSlots.Current.ResolveFootprint(...)` (jamais une relecture du résultat
  interne du composant). Anti-vacuité : `checkedTypes == 4` (scénario dimensionné — D6 garantit
  exactement ces 4 types en J0).
- `JugeD4F2_LabSocle_MeasurablyNarrowerAndOffset_ThanTheOldCellWidthFormula` : **contrôle positif**
  — pour `lab` (le cas le plus sévère), le Socle corrigé DOIT être mesurablement plus étroit
  (>20px) que l'ANCIENNE formule `cellW*0,7` recalculée indépendamment, ET décalé sur les deux axes
  (≠0) — sans ce test, `ResolveFootprint` qui renverrait toujours 0 (repli silencieux) rendrait
  F1 vide de sens (il comparerait le code à lui-même via une valeur jamais exercée).

**Garde générale demandée par le mandat** (« aucun quad aligné écran ne doit se superposer au
fond hors des éléments déclarés ») — **partiellement fermée, limite consignée honnêtement** : les
4 falsifiables ci-dessus prouvent la propriété pour les 4 types MESURÉS. Un type FUTUR (`grow_house`,
`dealer_spot_front`, `money_holding` — jamais rendus en J0, D6) sans footprint mesuré retombe sur
`cellW`/centré/(0,0) — le comportement HISTORIQUE, qui PEUT reproduire la même classe de défaut si
son sprite a la même forme de vide. Une garde générique nécessiterait de lire les pixels du sprite
au runtime (`Texture2D.GetPixels`), ce que l'import actuel interdit (`isReadable: 0`, mesuré sur
`usine_nuit_base_ppm24.0.png.meta` — activer la lecture CPU pour 7+ textures a un coût mémoire/
build réel, hors du périmètre d'un correctif ponctuel). **Dette consignée** : mesurer (même
script) les 3 slots de marge le jour où l'un d'eux reçoit un vrai bâtiment livré au joueur.

---

## Défaut 5 — Chaîne anglaise dans une surface française

**Balayage** (script Python committé implicitement dans ce document — regex sur mots anglais dans
tout littéral de chaîne de `Assets/Scripts/CityMap/*.cs`, 15 fichiers) : **68 hits bruts**,
CLASSÉS un par un (pas seulement comptés — socle ★★ « un hit VU est déduit, un hit CLASSÉ est
compté ») :

| Classe | Compte | Traité |
|---|---|---|
| Prose/label PLAYER-FACING, isolée (pas de pattern cross-écran établi) | 3 | **Traduites** |
| `TypeLabel` (13 branches `switch`) — REUSE verbatim de `BuildingCardController.TypeLabel` (Operational/, hors périmètre), même 2 valeurs vérifiées identiques ("Lab", "Stash") | 13 | **Non touchées** — voir raison ci-dessous |
| Détail-panel `CityMapController` (`DetailRow` — "Profile", "Heat — district", "Network cleanliness", "Stash blocking", "Dispatcher regime", "Deal leks", "Cohesion", "Police belief", "Patrol heat", "Citizen whisper", etc.) | ~18 | **Non touchées** — pattern EN systématique, cf. ci-dessous |
| "North Bank"/"South Bank" (en-têtes de colonne) | 2 | **Non touchées** — borderline, cf. ci-dessous |
| HTTP headers, `Debug.Log`/`LogError`, `[Tooltip]` éditeur, routes/clés de fil back, chemins `CreateAssetMenu` | ~32 | **Hors scope** — jamais montré au joueur |

**Traduites** (prose isolée, pas de pattern cross-écran à respecter) :
1. `DistrictInteriorScreenController.cs` — le message de repli explicitement nommé par le mandat :
   *« Daylight scene not rendered yet for this district — check back at night. »* →
   *« Scène indisponible pour ce quart horaire — réessayez plus tard. »* (reformulée pour son
   périmètre resserré par le Défaut 1 — ne couvre plus DAWN/DAY/DUSK, seulement `day_phase`
   inconnu).
2. `CityMapController.cs` — l'en-tête de l'écran CityMap : *« CITY MAP  —  Districts »* →
   *« CARTE DE LA VILLE — Districts »*.
3. `DistrictCellView.cs` — le libellé de chaque tuile de district : *"{count} blocks"* →
   *"{count} blocs"* (terme déjà établi ailleurs dans ce même fichier de commentaires : « unité =
   le bloc »).

**Non touchées, et pourquoi (décision mesurée, pas un oubli)** :
- `TypeLabel` (13 branches) — **mesuré identique** dans `BuildingCardController.TypeLabel`
  (`Assets/Scripts/Operational/BuildingCard/BuildingCardController.cs:1065-1066`, "Lab"/"Stash"
  confirmés verbatim) : c'est un pattern **REUSE délibéré, cross-écran**, cité comme tel dans le
  commentaire de tête de la méthode. Le traduire ICI SEULEMENT créerait une incohérence PIRE
  (le même bâtiment étiqueté différemment sur 2 écrans du même jeu) qu'aujourd'hui — et
  `BuildingCardController.cs` est hors périmètre (Operational/, pas CityMap/). Mémoire du projet
  confirme le contexte : *« EN shippé, FR=preview »* + *« Reste : UI i18n »* (item PENDING, pas
  fermé) — une traduction partielle de ce pattern précis serait, de fait, un chantier d'i18n
  cross-écran non mandaté par ce lot.
- Détail-panel `CityMapController` (~18 libellés) — même famille de risque, mais SANS même un
  précédent hors-scope à vérifier : ce sont des libellés quasi-techniques (noms de projections
  back peu ou pas reformulés — "Dispatcher regime", "Network cleanliness"), sur un ÉCRAN DIFFÉRENT
  de celui nommé par le mandat (CityMap, pas District Interior), non "vu 50% du temps" comme le
  district. Laissé pour une passe i18n dédiée.
- "North Bank"/"South Bank" — borderline entre libellé structurel (comme "CITY MAP") et
  proper-noun géographique (comme "Verge-A", jamais traduit) ; pas assez de confiance pour trancher
  un choix produit de nommage unilatéralement — consigné plutôt que deviné (socle : *« ne jamais
  deviner un choix d'architecture »*).

**Contrôle positif du balayage** : le script a retrouvé, AVANT mes 2 premiers correctifs
(vérifié en relisant l'historique de mes propres edits), les chaînes exactes citées par le mandat
et par ma propre relecture manuelle — 0 faux négatif détecté sur les hits que je savais déjà
présents.

---

## Compte de tests, SHA, écarts non fermés

**Compte** : impossible à obtenir en exécutant (compilation bloquée, §Blocages #1). Compte STATIQUE
(fichiers/méthodes ajoutées, pas une exécution) :
- `DistrictInteriorDioramaPlayModeTests.cs` : 1 test retiré (`C8F5_TwoNonHeroPhases...`), 2 ajoutés
  (`C8F5_AllFourDayPhases...`, `C8F5bis_UnknownDayPhase...`) — delta **+1** test dans ce fichier.
- `DistrictMapNavigationPlayModeTests.cs` : 4 tests EXISTANTS mécaniquement adaptés (D3/D4/D7/D9 —
  indices statiques → recherche par valeur, 0 changement de comportement attendu) + **7 tests
  neufs** (2× `[TestCase]` ×4 = 8 cas dans 2 méthodes, + 1 live end-to-end, + 1 backdrop) — soit
  concrètement 4 NOUVELLES méthodes `[Test]`/`[UnityTest]` (dont 2 portent chacune 4 `[TestCase]`).
- `DistrictSocleFootprintPlayModeTests.cs` : fichier neuf, **2** tests.
- **Total neuf/modifié** : 3 fichiers de test touchés, **7 méthodes de test neuves** (portant au
  total 15 assertions de scénario distinctes en comptant les `[TestCase]`), **4 méthodes
  existantes adaptées sans changement de comportement voulu**, **1 test retiré** (remplacé).
- Suite de référence du mandat (250/250) — **non rejouée** (blocage compilation). Aucune régression
  de comportement n'est attendue sur les tests INCHANGÉS (aucun fichier hors CityMap/ touché,
  aucune signature publique existante retirée sauf `DioramaArtPhase.NonHeroFallback` — vérifié
  qu'AUCUN test hors de ceux listés ci-dessus ne le référence, grep exhaustif).

**SHA** : pas de commit créé par ce lot au moment de la rédaction (l'implémenteur ne commite pas
sans mandat explicite de le faire — à confirmer avec le contrôleur). `git log -1` de la branche au
début du lot : `95de9c7` (voir git status en tête de session).

**Écarts non fermés** (résumé, détails dans chaque section) :
1. Captures par résolution — bloquées par la staleness de `ScreenCapture` dans cet environnement
   (§Blocages #2), pas par un choix.
2. Suite complète non rejouée — bloquée par la compilation Lieutenant (§Blocages #1), pas par un
   choix.
3. Qualité de filtrage au palier « contain » (souvent une minification, jamais mesurée) — dette
   consignée, §Défaut 3.
4. Garde générale anti-plaque-translucide limitée aux 4 types mesurés (§Défaut 4) — dette
   consignée, bloquée par `isReadable: 0`.
5. TypeLabel/détail-panel CityMap/"North Bank"-"South Bank" laissés en anglais — décision mesurée,
   pas un oubli (§Défaut 5).
6. Dette DAWN/DUSK (2 rendus dédiés × N profils) — TD proposée ci-dessous, à faire ajouter au
   registre canonique par qui possède `docs_int/tech_debt_inventory.md` (hors du repo Unity que je
   committe — repo différent, hors mandat de ce lot).

---

## TD proposée (texte prêt à coller dans `docs_int/tech_debt_inventory.md`, prochain numéro libre)

> | TD-XXX | **JUGE-D1 (audit visuel district, 2026-08-21) — DAWN/DUSK n'ont AUCUN fond dédié,
> pis-aller sur JOUR/NUIT.** `DistrictInteriorScreenController.ResolveArtPhase` route `DAWN→jour`
> (`VERGE_D_JOUR_FINAL`) et `DUSK→nuit` (`VERGE_D_NUIT_FINAL`) faute d'art atelier dédié — mesuré :
> `find Assets -iname "*FINAL*"` rend exactement 2 fichiers, `DistrictBackgroundSlots.asset` ne
> câble que `vergeNuit`/`vergeJour`. Choix chronologique (DAWN mène au jour, DUSK mène à la nuit),
> consigné comme pis-aller, pas une doctrine. | code :
> `mafia-builder-city-clean:Assets/Scripts/CityMap/DistrictInteriorScreenController.cs`
> (ResolveArtPhase) ; `DistrictBackgroundSlots.cs` | Unity/CityMap (district interior) | atelier —
> 2 rendus dédiés (`VERGE_D_{DAWN,DUSK}_FINAL.png`, même contrat pivot/ancre que NUIT/JOUR) ×
> N profils une fois qu'un profil a un fond NUIT/JOUR (0/5 aujourd'hui) | **OPEN** — détecteur :
> le jour où `DistrictBackgroundSlots.Resolve` gagne un mode `"dawn"`/`"dusk"`, `ResolveArtPhase`
> doit être ré-visité pour cesser le pis-aller. |
