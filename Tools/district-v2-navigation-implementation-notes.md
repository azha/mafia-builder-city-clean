# Navigation dans le district (pan + zoom) — notes d'implémentation

Auteur : coder (Sonnet). Mandat : ajouter le déplacement + zoom au diorama district (pièce
manquante mesurée — le fond fait 1080×1920, la fenêtre n'en montre que 720px de haut, sans aucun
mécanisme de défilement, `Tools/district-v2-reimport-implementation-notes.md` §6 Défaut 2 — preuve
`Assets/Screenshots/district_v2_starter_kit_4buildings.png`, obtenue par décalage manuel en Play
Mode, PAS un geste joueur).

## Ce qui a été livré

- `Assets/Scripts/CityMap/DistrictMapNavigation.cs` (neuf) — pan + zoom, attaché sur
  `DistrictScene` lui-même par `DistrictInteriorScreenController.RenderHeroDiorama` (uniquement si
  un fond réel existe — `fondRt != null`, sinon aucune navigation n'est attachée : rien à borner
  sur le repli confiné). Similitude 2D pure : `anchoredPosition` (pan) + `localScale` UNIFORME
  (zoom) sur SA PROPRE RectTransform — jamais de rotation, jamais de shear, aucune Camera 3D
  touchée (il n'y en a pas dans ce pipeline UI). Fond ET bâtiments sont ses enfants
  directs/indirects : "les bâtiments suivent le fond" est une propriété de la HIÉRARCHIE, pas une
  synchronisation ajoutée après coup.
- `DistrictInteriorScreenController.cs` : `SnapToScreenPixel` élargi `private`→`internal` (REUSE
  explicite, R9.3 généralisé — jamais dupliqué) ; `fondRt` hissé hors du bloc `if` pour survivre à
  la construction des bâtiments ; barycentre des `Cell_x_y` accumulé pendant la boucle de
  construction ; `DistrictTitle` repoussé en DERNIER sibling de `root` en fin de
  `RenderHeroDiorama` (le titre est du chrome, protégé nulle part ailleurs — voir § Artefact,
  volet 3) ; nouvelle propriété test-hook `MapNavigation`.
- `Assets/Tests/PlayMode/DistrictMapNavigationPlayModeTests.cs` (neuf, catégorie `W3U2`) — 10
  falsifiables (nav-district-F1..F10), patron "bare" REUSE de `DistrictBackgroundPlayModeTests.cs`.
- `Assets/Resources/BuildingSpriteSlots.asset` : `labOv.fen`/`stashOv.fen`/`cashSafehouseOv.neon`/
  `cashSafehouseOv.dev` re-câblés de références LEGACY pré-P3 vers `{fileID: 0}` (§ Artefact).
- `DistrictInteriorScreenController.BuildWindowLight` : `lab`/`stash` exemptés du repli
  rectangle-plein (§ Artefact, volet 2).

## Politique de zoom — MESURÉE, pas présumée

**Question posée par le mandat** : à échelle entière, un filtrage POINT donne-t-il un meilleur
résultat qu'un BILINEAR ? Méthode : chaque sprite livré existe en 2 PPM (24.0 et 56.471,
ratio ≈2,35×) — le PPM56.471 sert de "vérité terrain" haute résolution pour ce qu'un rendu à cette
échelle DEVRAIT montrer. Procédure, par paire (template, état) : bbox alpha de chaque fichier
(même seuil que `PpF3_Part2`, `p.a>=128`) ; `ground_truth` = bbox ppm56.471 redimensionnée en
LANCZOS à la taille cible (bbox ppm24.0 × Z) ; `candidat` = bbox ppm24.0 redimensionnée en NEAREST
puis en BILINEAR à la même taille ; MAE(candidat, ground_truth) comparé.

| paire (base) | Z=1,5 | Z=2,0 | Z=3,0 | Z=4,0 |
|---|---|---|---|---|
| residentiel3_nuit_base | BILINEAR (Δ0,154) | **NEAREST** (Δ0,257) | BILINEAR (Δ0,011, quasi-nul) | **NEAREST** (Δ0,083) |
| epicerie_nuit_base | BILINEAR (Δ0,329) | **NEAREST** (Δ0,793) | **NEAREST** (Δ0,340) | **NEAREST** (Δ0,543) |
| hotel_nuit_base | BILINEAR (Δ0,284) | **NEAREST** (Δ0,336) | **NEAREST** (Δ0,077) | **NEAREST** (Δ0,182) |
| diner_nuit_base | BILINEAR (Δ0,230) | **NEAREST** (Δ0,590) | **NEAREST** (Δ0,187) | **NEAREST** (Δ0,396) |
| usine_nuit_base (Z=4 seul) | — | — | — | BILINEAR (Δ0,081, quasi-nul) |
| entrepot_nuit_base (Z=4 seul) | — | — | — | **NEAREST** (Δ0,275) |

**Motif net et constant** : à échelle NON entière (1,5×), BILINEAR gagne toujours (4/4). À échelle
ENTIÈRE (2×, 3×, 4×), NEAREST gagne 10 fois sur 12, les 2 exceptions étant des écarts quasi-nuls
(0,011 et 0,081 — pas des contre-exemples significatifs). Conforme à l'argument géométrique : à
échelle entière exacte, NEAREST reproduit chaque texel source sans aucun flou d'interpolation aux
bords, BILINEAR en introduit un.

**Décision, tranchée par le chiffre** : paliers CONTRAINTS aux valeurs entières `{×1, ×2, ×3}`
(`DistrictMapNavigation.ZoomLevels`) plutôt qu'un zoom continu — c'est CE choix qui rend le
filtrage POINT applicable en toute sécurité (jamais d'échelle non-entière où BILINEAR serait
mesuré meilleur). `FilterMode.Bilinear` à ×1 (référence, indifférent à l'échantillonnage exact
1:1 — c'est aussi le réglage d'IMPORT déjà certifié bit-exact, aucun changement) ; `FilterMode.
Point` à ×2/×3 (mesuré meilleur). Appliqué au runtime sur `Texture2D.filterMode` (état PARTAGÉ,
jamais persisté sur l'asset), ré-appliqué à CHAQUE changement de palier ET à `Configure()` pour ne
jamais hériter d'un mode `Point` laissé par une visite de district précédente.

**Borne max = ×3, justifiée** : (a) le signe NEAREST-gagne est net à ×2/×3, plus marginal à ×4 (2
sorties sur 6 quasi-nulles) ; (b) le fond est une image FIXE — au-delà d'un certain zoom, aucun
détail supplémentaire n'existe à révéler, seulement moins de contexte visible ; (c) à ×3 sur un
fond 1080×1920, la fenêtre visible reste assez grande pour situer un bâtiment dans son quartier.
**Borne min = ×1** (l'alternative "fond entier visible" nécessiterait résoudre une question de
MINIFICATION séparée — non posée par le mandat, non nécessaire : ×1 est déjà certifié bit-exact,
c'est l'option qui change le moins de surface — Deviation #1).

## Falsifiables (nav-district-F1..F10) — DistrictMapNavigationPlayModeTests.cs

Toutes contre le payload RÉEL district 16 (verge-a, starter kit J0 : lab/stash/front_shop/
cash_safehouse), signup frais par test (charter 27).

| # | Ce qu'elle prouve | Monde dégénéré tué |
|---|---|---|
| F1 | Pan borné — delta ÉNORME (1 000 000px), les deux sens, comparé à une borne RECALCULÉE indépendamment (pas le résultat interne du composant) + preuve géométrique (fond couvre le viewport sur Y) | un delta trop petit n'atteint jamais la vraie borne |
| F2 | Bit-exactité (condition nécessaire, C#) — position ÉCRAN entière après un pan à delta non-entier, à l'échelle de référence | — (complété par la certification empirique § ci-dessous) |
| F3 | Un bâtiment suit EXACTEMENT le fond — vecteur écran fond→bâtiment invariant par pan, scale EXACTEMENT ×2 puis ×3, mesuré à CHAQUE palier + 2 positions de pan différentes | un seul point de mesure ne prouverait rien sur "à travers" plusieurs états |
| F4 | Aucune perspective — matrice (rotation==identity, scale.x==scale.y, scale.z==1) à CHAQUE palier de zoom, après pan | une impression visuelle au lieu de la matrice |
| F5 | Cadrage initial == barycentre des 4 bâtiments (borné), recalculé indépendamment depuis le JSON/DTO | — |
| F6 | Monde dégénéré : 0 bâtiment ⇒ repli au centre du fond (0,0), byte-identique à l'historique | un cadrage qui planterait ou dériverait sans donnée |
| F7 | Filtrage POINT/BILINEAR bascule dans LES DEUX sens (×1→×2→×1) | rester bloqué sur POINT après un retour à la référence |
| F8 | Le titre reste TOUJOURS au-dessus de DistrictScene (sibling), y compris après un pan extrême | un ordre figé au premier `Render()` seulement |
| F9 | Palier de zoom borné (`ZoomTo(999,…)`→sature à ×3 ; `ZoomTo(-999,…)`→sature à ×1) | — |
| F10 | RÉGRESSION de l'artefact (§ ci-dessous) — voir ce paragraphe |

**Contrôles positifs exécutés (pas seulement écrits)** — la règle du socle appliquée à la lettre :
- F1 : `ClampPan` remplacée temporairement par `return pos;` (aucun bornage) → F1 ROUGE
  (`Expected: 0.0 ±0.05, But was: 1000390.0`) → code restauré → re-testé VERT. Preuve que la
  falsifiable détecte réellement une absence de bornage, pas un artefact de calcul.
- F10 : l'exemption `!BakedLightingTemplates.Contains(...)` temporairement retirée → F10 ROUGE
  (`Expected: null, But was: <empty>` — un objet WindowLight existe à nouveau pour lab) → code
  restauré → re-testé VERT.

**Falsifiable (b) — preuve SUFFISANTE, empirique, hors C#** (un `UnityTest` ne peut pas invoquer
`resemblance-probe.py`) : capture Play Mode manuelle, district 16, day_phase forcé NIGHT, PUIS un
`PanBy(37.3, -12.7)` — delta délibérément NON entier en pixels écran, exactement le cas que
`SnapToScreenPixel` existe pour corriger — à l'échelle de référence (×1). Diff PIXEL-À-PIXEL brut
(plus strict que la sonde à échantillonnage épars — même méthode que ROUND 6 du pivot précédent),
masquant les 4 empreintes `Cell_x_y` (façades bâtiment légitimes, pas un défaut de transport) :

```
rect fond dans la capture (imprimé au moment de la capture) : x=100 yTop=-312 w=1080 h=1920
compared (hors empreintes cellule) = 594 649 px
nonzero = 0   maxdiff = 0
```

**BIT-EXACT — confirmé APRÈS un pan à delta non-entier**, capture commitée
`Assets/Screenshots/nav_district_bitexact_v2.png`. ⚠️ Une première tentative (`nav_district_
bitexact_v1.png`) a rendu un faux résidu (32 776 px non-nuls, bbox dans la bande titre) — root
cause : DEUX `Canvas` orphelins laissés par des diagnostics ANTÉRIEURS dans la même session Play
Mode (`BuildRoot()`'s `FindFirstObjectByType<Canvas>()` a trouvé l'un d'eux — un AppShell avec son
TopBar/manomètre — au lieu d'en créer un propre). Root-caused par mesure (crop visuel de la bbox
de diff → "Warm HEAT" lisible), scène nettoyée (`canvasCount` vérifié à 0 avant de refaire la
capture), reproduit PROPRE. Fichier v1 supprimé (diagnostic contaminé, pas une preuve).

## L'artefact (§6 du mandat) — DEUX volets, mesurés, pas présumés

**Ce qui a été observé sur `district_v2_starter_kit_4buildings.png`, quart supérieur gauche** : un
bâtiment "en double / semi-transparent, on y lit une enseigne" par-dessus un autre.

### Volet 1 — root cause : câblage fantôme legacy pré-P3

Mesuré (execute_code, hiérarchie réelle) : `Cell_0_0/WindowLight` (lab) portait un sprite nommé
`usine_nuit_ov_actif`, matériau `UIAdditive`, couvrant TOUTE la cellule (712×515px). Recherche du
GUID correspondant : `Assets/Art/Sprites/Batiments/usine_nuit_ov_actif.png` — un fichier LEGACY
d'AVANT le réimport P3 (répertoire différent, convention de nommage différente, une DUPLICATION
INTÉGRALE du bâtiment avec fumée/éclairage, pas un calque "fenêtres"). Même défaut pour `stashOv.
fen` → `entrepot_nuit_ov_actif.png` (legacy). `BuildingSpriteSlots.asset` : `labOv.fen`/`stashOv.
fen` pointaient sur ces fichiers legacy au lieu d'être `{fileID: 0}` — jamais mis à jour au
réimport P3 (les 5 autres slots `Ov.fen` pointent correctement sur les fichiers `_ppm24.0` de
`Assets/Art/District/Sprites/`). Balayage complet de l'asset (tous les GUID base+overlay résolus
contre l'inventaire de fichiers) : 2 AUTRES champs legacy trouvés au passage, `cashSafehouseOv.
neon`/`cashSafehouseOv.dev` → `Assets/Art/Sprites/Batiments/bar_hero_nuit_ov_{neon,dev}.png` (un
gabarit DIFFÉRENT, jamais consommé par le code actuel — `couche="dev"` n'est appelée nulle part —
mais donnée fausse latente si `cash_safehouse` devient un jour `revenue_chain=="WIRED"`).
**Correctif** : les 4 champs mis à `{fileID: 0}` (contrat "calque absent ⇒ repli", déjà le cas
pour 5 des 7 slots). Vérifié par balayage GUID→fichier : plus aucune référence hors
`Assets/Art/District/{Sprites,Backgrounds}`. Run scopé W3U2 (68/68) avant/après : 0 régression.

### Volet 2 — décision du contrôleur (⊥, après mesure demandée) : exempter lab/stash du repli

Nuller `labOv.fen`/`stashOv.fen` a démasqué (pas créé) un second défaut, latent avant ce lot : le
repli générique de `BuildWindowLight` (rectangle plein `nightWindowLit`, RGBA(1,0.717,0.15,1) —
mesuré, ~146×47px sur `stash`) viole la doctrine ratifiée ("l'or jamais en aplat") — c'est
exactement ce qu'un joueur voyait sur le toit de la cellule `stash` dans la capture originale (une
FOIS le fantôme du volet 1 retiré, ce second défaut restait visible et a été signalé par le
contrôleur). Mesuré : `usine_nuit_base`/`entrepot_nuit_base` bakent DÉJÀ un éclairage dans leur
art de base (vérifié visuellement) — l'atelier n'a produit AUCUN état "fenêtres" pour ces deux
gabarits (seulement `base`/`actif`, confirmé par inventaire de fichiers). Décision prise (lisible
dans le code/l'art/la doctrine, ne remonte pas à l'user) : `lab`/`stash` EXEMPTÉS du repli — aucun
objet `WindowLight` n'est créé pour eux (`BakedLightingTemplates`, `DistrictInteriorScreenController.
cs`). Le FAIT (binding 1+2, `RenderedWindowLightCount`) reste compté — SEULE la REPRÉSENTATION
disparaît — pour ne pas rompre 3 falsifiables scellées (`C9F1`, `C9F1Bis`, `C9F2` de
`DistrictInteriorLightingPlayModeTests.cs`) dont le fixture synthétique par défaut
(`MakeBuilding()`) utilise `operational_type="lab"` et mesure l'ÉGALITÉ fait↔compte, jamais la
présence d'un objet précis — vérifié en lisant leur corps AVANT de coder l'exemption (le compte
aurait cassé 3 tests scellés pour un motif sans rapport : COMMENT le fait est dessiné, pas SI il
est vrai). Falsifiable : `NavD10` (contrôle positif exécuté, voir tableau ci-dessus), avec un
CONTRÔLE POSITIF supplémentaire dans le même test — `cash_safehouse` (calque `fen` réel, non
exempté) doit toujours porter un `WindowLight` avec un VRAI sprite, pour prouver que "aucun objet"
n'est pas un mécanisme cassé pour tout le monde.

**Dette consignée** (pas mon outillage, même famille que le précédent `laverie` de ce dépôt) : un
vrai état "fenêtres allumées" pour usine/entrepot, s'il est un jour voulu, se RENDRAIT à l'atelier
(`sprites_batch.py` n'a pas d'état `fen` pour ces deux gabarits), jamais bricolé côté Unity.

### Marqueurs de lieutenant (les 2 aplats beiges) — PAS un défaut de ce lot

Mesuré : `Cell_0_0/LieutenantMarker_0`/`_1` (lab, 2 COOK — cas dégénéré J0), 85,4×82,4px chacun,
couleur RGBA(0,950,0,820,0,560,1,000) = `DesignTokens.Current.nightLieutenantMarker` exactement.
`BuildLieutenantMarkers` n'assigne JAMAIS de sprite, pour AUCUN marqueur — un `Image` à couleur
plate est le SEUL mécanisme qui existe dans le code pour ce binding. Confirme le verdict antérieur
(v1), re-vérifié ici sur la géométrie/les sprites v2 : par conception, sans rapport avec le
réimport P3 ni avec ce lot. Non touché (question de DA remontée par le contrôleur à l'user).

## § Deviations (imprévus non bloquants, options conservatrices)

1. **Bornes de pan calculées contre `rootRt.rect` ENTIER, pas la fenêtre rétrécie par
   `safeInsetTop`/`safeInsetBottom`.** Le vide caché derrière TopBar/TabBar (opaques, ordre de
   fratrie du shell, `AppShell.cs:29-33`) est de toute façon invisible au joueur — borner contre le
   rect ENTIER est PLUS STRICT que nécessaire (jamais moins), au prix d'un peu de marge de pan
   inexploitée sous les barres. Option qui change le moins de surface : ce composant ne lit AUCUNE
   hauteur de chrome — conforme à la remarque ultérieure du contrôleur ("consommer la portée
   EFFECTIVE comme une valeur LUE, jamais une constante recopiée") : je ne recopie RIEN, donc rien
   à faire diverger le jour où la portée effective du chrome change côté Shell.
2. **Palier min = ×1, pas "fond entier visible".** Le mandat offrait les deux ; "fond entier
   visible" impliquerait une échelle < 1 (minification, ~0,375 pour un viewport 720 sur un fond
   1920) — une question de qualité de filtrage SÉPARÉE, non posée par le mandat. ×1 est déjà
   certifié bit-exact : option qui ne rouvre aucun risque neuf.
3. **Zoom en PALIERS DISCRETS plutôt que continu pendant le geste.** Le pincement/la molette
   avancent directement d'un cran (`ZoomStep`), sans état intermédiaire non-entier rendu. Choix
   délibéré, pas une simplification paresseuse : c'est CE choix qui rend le filtrage POINT
   applicable en toute sécurité (§ Politique de zoom) — un zoom continu aurait traversé des
   échelles non-entières où BILINEAR est mesuré meilleur, rendant le choix de filtre par palier
   incohérent avec l'échelle réellement affichée à mi-geste.
4. **Gestes bruts (Update(), EnhancedTouch/Mouse) non couverts par les falsifiables PlayMode.**
   Aucun précédent dans ce dépôt pour simuler un événement Input System brut dans un `UnityTest`
   (vérifié : aucun `InputTestFixture`/`InputSystem.QueueEvent` nulle part). La surface TESTABLE
   est `PanBy`/`ZoomTo`/`Configure` — MÊME patron que tous les test hooks de
   `DistrictInteriorScreenController` (jamais un clic simulé bas niveau, sauf quand "le chemin
   RÉEL" est explicitement exigé, ex. `enterBtn.onClick.Invoke()` dans `NavigationPlayModeTests`).
   Vérifié manuellement en Éditeur (souris : drag = pan, molette = zoom au curseur — voir capture
   finale) mais pas automatisé.
5. **"Appartient à l'UI" redéfini** : un `Selectable` dans la chaîne de hits, PAS
   `EventSystem.IsPointerOverGameObject` seul. Mesuré : les sprites bâtiment ont `raycastTarget==
   true` par défaut (aucun `Button`) — le patron générique de la skill `unity-input-touch` aurait
   bloqué le pan sur la quasi-totalité de la surface visible. Aucun `raycastTarget` existant n'a
   été modifié (option qui change le moins de surface) ; le tri se fait entièrement côté lecture
   de geste.

## § Evidence (build/tests)

- Compilation (`refresh_unity(compile=request, force, all)`) : 0 erreur à chaque étape (7
  cycles — ajout `DistrictMapNavigation.cs`, wiring contrôleur, ajout tests, exemption
  `BuildWindowLight`, + 3 cycles de contrôle positif/retour arrière). Warnings : uniquement
  `CS0618 FindFirstObjectByType obsolete`, pré-existants dans TOUT le projet (11 fichiers
  non touchés par ce lot), aucun nouveau.
- PlayMode, catégorie `W3U2` (plancher prescrit) : **78/78 VERT** (68 pré-existants + 10
  nav-district neufs), run répété 3 fois à des étapes différentes du lot (après wiring initial,
  après ajout des 10 falsifiables, après l'exemption `BuildWindowLight`) — 0 régression à chaque
  fois. ⚠️ Deux runs ultérieurs ont montré des rouges **HORS SCOPE**, tous les deux dans
  `NavigationPlayModeTests.cs` (`MafiaCleanCity.Shell.Tests`, pas `CityMap.Tests`) :
  `NavF4_TitleClearsTopBar_BackgroundExistsAtNativeResolution` puis, au run suivant,
  `NavF4` (déjà amendée entre-temps par l'autre agent — le message d'assertion a changé pour citer
  "17,0px de débordement du médaillon", confirmant leur travail en vol) **et**
  `NavF5_TitleOffsetConsumesInsetTop_56pxDelta_InsetAssertedPositiveFirst` (nouveau rouge,
  `Expected: -64.0, But was: -81.0` — cohérent avec un chrome dont la hauteur effective grandit
  pendant leur correctif). Root cause confirmée, PAS la mienne : `git diff --stat
  Assets/Scripts/Shell/` montre des modifications LOCALES NON COMMITÉES dans
  `TopBarController.cs` (réparation du manomètre, un autre agent — `ManometreVerticalOffsetPx =
  -13f`, leur propre commentaire prédit "le bord BAS déborde de ~17px", exactement le chiffre
  mesuré). Confirmé par le contrôleur : le débordement est VOULU par la maquette (`Tools/hud-
  topbar-reference-2560.png`), ces deux falsifiables portent une prémisse périmée ("la barre
  s'arrête à sa hauteur nominale") que l'autre agent amende chez lui. **Aucun fichier
  `Assets/Scripts/Shell/` touché par ce lot** (vérifié, à aucun moment). Vérifié à CHAQUE run
  intermédiaire : mes 4 classes de tests (24 tests — `DistrictMapNavigationPlayModeTests`,
  `DistrictBackgroundPlayModeTests`, `DistrictInteriorDioramaPlayModeTests`,
  `DistrictInteriorLightingPlayModeTests`) tournent **24/24 vert** isolément, à chaque étape,
  y compris le tout dernier run avant ce commit.
- Bit-exactité (échelle de référence, après pan à delta non-entier) : **0/594649 px différents**
  (diff brut, masqué par empreinte de cellule) — voir § falsifiable (b) ci-dessus.
- Contrôles positifs (F1, F10) : exécutés, pas seulement écrits — voir tableau falsifiables.

## Captures livrées

- `Assets/Screenshots/nav_district_bitexact_v2.png` — capture de certification bit-exacte (district
  16, après `PanBy(37.3,-12.7)` à l'échelle de référence), rect imprimé au moment de la capture
  `x=100 yTop=-312 w=1080 h=1920`, capture 1280×720.
- `Assets/Screenshots/nav_district_autoframed_starterkit.png` — LE LIVRABLE : district 16, flux
  réel (signup → session/open → `Render()`), **AUCUN pan manuel** — le cadrage vient uniquement de
  `MapNavigation.Configure()` auto-centré sur le barycentre des 4 bâtiments du starter kit. Le
  titre lit "Verge-A" EN ENTIER (plus de troncature "Ver" — § artefact volet 3/titre-on-top), le
  bâtiment lab (BRENNAR COAL & ICE) est rendu proprement, opaque, sans double-image.
- `Assets/Screenshots/artifact_fixed_v1.png` — comparaison directe avec
  `Assets/Screenshots/district_v2_starter_kit_4buildings.png` (déjà commité, référence AVANT ce
  lot) : même cadrage manuel de démonstration, fantôme du volet 1 disparu.
