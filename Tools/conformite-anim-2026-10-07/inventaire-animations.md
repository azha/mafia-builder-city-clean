# Inventaire des animations — maquettes ↔ Unity (CLIENT-3, 07/10/2026)

Méthode : chaque maquette est chargée dans Chromium (Playwright) ; `document.getAnimations()` énumère les animations RÉELLES, rattachées à leur cadre (`.cadre`). Rien n'est lu à l'œil. Unité = une paire (écran, `@keyframes`) appliquée à ≥ 1 élément ; « instances » = éléments animés, tous cadres de l'écran réunis.

## A. ecrans-brennar-6.html (atelier, 147 cadres) — 529 animations réelles mesurées

| écran | @keyframes | instances | cadres animés / cadres de l'écran | gelées (paused) | cause dans la fiction | état Unity |
|---|---|---:|---:|---:|---|---|
| ③ Carte | `hl` | 3 | 3 / 3 | 0 | le halo doré du pin « VOUS ÊTES ICI » respire (6 s) : le district du joueur veille | absente — l'hôte (le pin « VOUS ÊTES ICI ») n'existe pas côté client (DistrictCellView.cs:95) |
| ② Fiche — la serre | `sf` | 202 | 3 / 3 | 0 | chaque feuille pivote sur son pétiole (amplitude = santé : une plante qui souffre PEND) | absente — AUCUNE scène de serre dans BuildingCardController (0 plante, 0 rampe, 0 goutte) |
| ② Fiche — la serre | `drip` | 18 | 3 / 3 | 0 | le goutte-à-goutte tombe | absente — AUCUNE scène de serre dans BuildingCardController (0 plante, 0 rampe, 0 goutte) |
| ② Fiche — la serre | `derive` | 15 | 3 / 3 | 0 | la brume de la serre dérive | absente — AUCUNE scène de serre dans BuildingCardController (0 plante, 0 rampe, 0 goutte) |
| ② Fiche — la serre | `led` | 9 | 3 / 3 | 0 | les rampes de culture (LED) pulsent | absente — AUCUNE scène de serre dans BuildingCardController (0 plante, 0 rampe, 0 goutte) |
| ② Fiche — la serre | `spl` | 9 | 3 / 3 | 0 | la goutte éclabousse dans le godet | absente — AUCUNE scène de serre dans BuildingCardController (0 plante, 0 rampe, 0 goutte) |
| ② Fiche — la serre | `respire` | 9 | 3 / 3 | 0 | le pot respire (balancement lent) | absente — AUCUNE scène de serre dans BuildingCardController (0 plante, 0 rampe, 0 goutte) |
| ② Fiche — la serre | `tg` | 9 | 3 / 3 | 0 | la plante entière tangue | absente — AUCUNE scène de serre dans BuildingCardController (0 plante, 0 rampe, 0 goutte) |
| ② Fiche — la serre | `clign` | 5 | 2 / 3 | 0 | l'étiquette « à soigner » clignote (alerte) | absente — AUCUNE scène de serre dans BuildingCardController (0 plante, 0 rampe, 0 goutte) |
| ② Fiche — le labo | `bl` | 52 | 2 / 6 | 0 | les bulles de l'ébullition (nucléation → éclatement) | absente — le pupitre est une silhouette de fourneau FIGÉE (BuildingCardController.AddPupitreLaboratoire:2242) : 0 ébullition, 0 vapeur |
| ② Fiche — le labo | `vp` | 14 | 2 / 6 | 0 | la vapeur monte dans la colonne | absente — le pupitre est une silhouette de fourneau FIGÉE (BuildingCardController.AddPupitreLaboratoire:2242) : 0 ébullition, 0 vapeur |
| ② Fiche — le labo | `cd` | 8 | 2 / 6 | 0 | le condensat glisse dans le réfrigérant | absente — le pupitre est une silhouette de fourneau FIGÉE (BuildingCardController.AddPupitreLaboratoire:2242) : 0 ébullition, 0 vapeur |
| ② Fiche — le labo | `fl` | 6 | 6 / 6 | 0 | l'eau du réfrigérant circule (stroke-dashoffset) | absente — le pupitre est une silhouette de fourneau FIGÉE (BuildingCardController.AddPupitreLaboratoire:2242) : 0 ébullition, 0 vapeur |
| ② Fiche — le labo | `rl` | 4 | 2 / 6 | 0 | la surface du ballon roule | absente — le pupitre est une silhouette de fourneau FIGÉE (BuildingCardController.AddPupitreLaboratoire:2242) : 0 ébullition, 0 vapeur |
| ② Fiche — le labo | `ch` | 4 | 2 / 6 | 0 | la résistance du chauffe-ballon / le témoin chauffe | absente — le pupitre est une silhouette de fourneau FIGÉE (BuildingCardController.AddPupitreLaboratoire:2242) : 0 ébullition, 0 vapeur |
| ② Fiche — le labo | `ec` | 2 | 2 / 6 | 0 | l'écume ondule en surface | absente — le pupitre est une silhouette de fourneau FIGÉE (BuildingCardController.AddPupitreLaboratoire:2242) : 0 ébullition, 0 vapeur |
| ② Fiche — le labo | `rd` | 2 | 2 / 6 | 0 | la goutte ride le collecteur | absente — le pupitre est une silhouette de fourneau FIGÉE (BuildingCardController.AddPupitreLaboratoire:2242) : 0 ébullition, 0 vapeur |
| ② Fiche — le labo | `gt` | 2 | 2 / 6 | 0 | la goutte tombe du collecteur | absente — le pupitre est une silhouette de fourneau FIGÉE (BuildingCardController.AddPupitreLaboratoire:2242) : 0 ébullition, 0 vapeur |
| ② Fiche — Ash (l'écrin) | `po` | 78 | 3 / 3 | 0 | la poussière flotte dans le faisceau | absente — VitrineAsh = socle + cloche + éclats FIGÉS (BuildingCardController.AddVitrineAsh:2318) : 0 mouvement |
| ② Fiche — Ash (l'écrin) | `sc` | 18 | 2 / 3 | 0 | les prismes d'Ash scintillent | absente — VitrineAsh = socle + cloche + éclats FIGÉS (BuildingCardController.AddVitrineAsh:2318) : 0 mouvement |
| ② Fiche — Ash (l'écrin) | `pe` | 18 | 3 / 3 | 0 | les pétales du lys de verre bougent | absente — VitrineAsh = socle + cloche + éclats FIGÉS (BuildingCardController.AddVitrineAsh:2318) : 0 mouvement |
| ② Fiche — Ash (l'écrin) | `am` | 3 | 3 / 3 | 0 | l'ampoule d'établi vacille | absente — VitrineAsh = socle + cloche + éclats FIGÉS (BuildingCardController.AddVitrineAsh:2318) : 0 mouvement |
| ② Fiche — Ash (l'écrin) | `ci` | 3 | 3 / 3 | 0 | la cire (bougie) respire | absente — VitrineAsh = socle + cloche + éclats FIGÉS (BuildingCardController.AddVitrineAsh:2318) : 0 mouvement |
| ② Fiche — Ash (l'écrin) | `cl` | 1 | 1 / 3 | 0 | le voyant clignote | absente — VitrineAsh = socle + cloche + éclats FIGÉS (BuildingCardController.AddVitrineAsh:2318) : 0 mouvement |
| ㉑ Marché | `mk-veille` | 15 | 5 / 7 | 0 | la veille des voyants allumés | absente — écran NON MONTÉ (aucun contrôleur `Market`) |
| ㉑ Marché | `mk-scan` | 6 | 6 / 7 | 0 | le balayage du tablo (ligne cyan 2 px, 7,5 s) | absente — écran NON MONTÉ (aucun contrôleur `Market`) |
| ㉑ Marché | `mk-buee` | 6 | 2 / 7 | 0 | la buée du froid (marchandise réfrigérée) | absente — écran NON MONTÉ (aucun contrôleur `Market`) |
| ㉑ Marché | `mk-lampe` | 4 | 4 / 7 | 0 | la lampe du tableau du Verge d'Or | absente — écran NON MONTÉ (aucun contrôleur `Market`) |
| ㉑ Marché | `mk-eclat` | 4 | 1 / 7 | 0 | l'éclat des prismes | absente — écran NON MONTÉ (aucun contrôleur `Market`) |

**Total A : 29 paires (écran, @keyframes) · 529 instances · 529 animations mesurées dans le fichier · résidu non rattaché à un écran : 0.**
Somme de contrôle A (paires, instances) par écran : ③ Carte = 1, 3 ; ② Fiche — la serre = 8, 276 ; ② Fiche — le labo = 9, 94 ; ② Fiche — Ash (l'écrin) = 6, 121 ; ㉑ Marché = 5, 35 ⇒ Σ paires = 29, Σ instances = 529.
Cadres portant ≥ 1 animation : 21 sur 147. Les 126 autres sont STATIQUES.
Animations en PAUSE dans ce fichier : 0 (avant le dégel du 07/10, atelier b7d8c1a : 491 sur 554, bloc `.serre6/.ecrin6/.labo6{animation-play-state:paused !important}` du ruling 27/08 13h42 ; levé par d84c6eb, ruling du soir « animé le truc »).

## B. hud-brennar-canon.html (atelier `d84c6eb`) — ① Intérieur de district, lu dans le CSS (états `.tel.descente` / `.tel.jour` : le fichier ne les exerce qu'au clic)

| # | écran | type | élément | cause dans la fiction | état Unity | preuve |
|---:|---|---|---|---|---|---|
| B1 | ① HUD | @keyframes `pouls` 1,1 s | | cerclage du médaillon + filet de la barre battent : la descente (la police est sur vous) | **présente** | TopBarController.Update:763 → Pouls() → AppliquerPouls (boitierRing, hairline) |
| B2 | ① HUD | @keyframes `tremble` .14 s | | l'aiguille du manomètre tremble (+4° vers le chaud) | **présente** | TopBarController.Update:770 (Tremblement) |
| B3 | ① HUD | @keyframes `gyroflip` .9 s | | le gyrophare de la voiture de police en planque (hue-rotate rouge↔bleu) | **partielle** | Gyrophare.cs : posé SEULEMENT sur le fond D (2 arts), la nuit, en descente (DoitSAllumer) ; 0 sur les autres fonds |
| B4 | ① HUD | @keyframes `monte` 3,2 s | | le flotteur « + $320 » monte et s'efface (l'argent encaissé) | **absente** | grep floater/Monte : 0 dans Assets/Scripts |
| B5 | ① HUD | transition `opacity .5s` (.fond) | | le fond passe du jour à la nuit en fondu | **absente** | aucun CrossFade ; le fond est choisi à la pose (DistrictInteriorScreenController) |
| B6 | ① HUD | transition `background .6s` (.barre::after) | | le filet laiton vire à la braise quand la ville chauffe | **absente** | TopBarController : couleur posée d'un coup (UpdateAlarmState) |
| B7 | ① HUD | transition `border-color .6s` (.medaillon .boitier) | | l'anneau du médaillon vire à la braise | **absente** | idem : aucune interpolation |
| B8 | ① HUD | transition `box-shadow .6s` (.lunette) | | la lunette s'éclaire | **absente** | idem |
| B9 | ① HUD | transition `opacity .5s` (.gyro) | | la lueur du gyrophare s'allume en fondu | **absente** | Gyrophare.Poser : posé plein d'un coup |
| B10 | ① HUD | transition `transform .7s` (aiguille) | | l'aiguille du manomètre balaie jusqu'à sa nouvelle bande | **absente** | SetCitywideHeatBucket:703 : localEulerAngles posé d'un coup |
| B11 | ⑭ La semaine | transition `transform .7s` (aiguille du cadran TENSION, 6 cadres 14-19) | | ⑭ : l'aiguille de « la ville serre » balaie d'une graduation à l'autre quand le stress change | **absente** | CompressionScreenController:194-204 : `stress_bucket` rendu en TEXTE, 0 cadran, 0 aiguille (déclaré par atelier 07/10, demande A2 : la maquette porte maintenant la transition) |

**Total B : 11 lignes (4 @keyframes + 7 transitions : 6 du HUD + l'aiguille de ⑭) = 2 présentes + 1 partielles + 8 absentes.**

## C. Maquettes à animation DÉFINIE mais NON APPLIQUÉE (0 instance mesurée)

- ④ `ecrans-brennar-accueil.html` : 6 `@keyframes` définis (goutte, derive, respire, osc, pulseRose, clign), **0 animation en cours** sur les 5 cadres → ④ est statique en maquette.
- `ecrans-brennar-6.html` : 13 `@keyframes` étaient morts avant d84c6eb ; 12 RETIRÉS (6 `*6-lampe`, 6 `*6-veille`) ; `mk-eclat` a maintenant son hôte : le cadre 146 (tuile Ash du marché, demande A1) porte 4 éclats — les 5 animations du marché tournent.
- **Six `*6-scan` RETIRÉS le 07/10** (㉟ ㊱ ㊲ ㊳ ㊴ ㊵, 34 instances) : `.elast` est le panneau de TEXTE du châssis (liste, papier), pas un écran ni un terminal ; aucune cause dans la fiction (ruling f2 07/10 : ㊳ ㊴ sont des papiers, ㉟ ㊱ ㊲ ㊵ ne dessinent pas de terminal). Retirés des pages ET de `chassis6.py` ; les 6 générateurs déclarent `STATIQUE = True`. `mk-scan` du marché reste : son hôte est le `.tablo`, le tableau de voyants.
- `ecrans-brennar-conflit-proposes-2026-09-24.html` : 33 noms définis, 0 animation en cours (㉙ statique).
- Série 4 (`ecrans-brennar-4.html`), `-3`, `-5`, `-navigation`, `-7-lieutenant`, `-25-tutoriel`, `-34-composeur`, `-porte` : 0 animation en cours.

## D. Animations Unity SANS maquette (le code les a inventées)

| # | où | mécanisme | quoi |
|---:|---|---|---|
| D1 | ① DistrictInteriorScreenController | `AmbientPulseLoop.Update` (Mathf.Sin sur l'alpha, ≤ 4 simultanées, `MaxAmbientLoops`) | néon d'enseigne EARNING, fumée d'activité, scintillement de dette de maintenance (3 sources) — ajouté à des images posées pour une raison de DONNÉE |
| D2 | Shell, BandeauEphemere | coroutine `Effacement` (fondu de sortie) | le bandeau éphémère (descente / ville chauffe / carte / rapport) se retire en fondu |

## E. Totaux — Unity réellement animé, compté dans Assets/Scripts (182 .cs)

Recherche exhaustive de `Animator|.anim|DOTween|LeanTween|ParticleSystem|AnimationCurve|IEnumerator qui écrit couleur/alpha/position|Update/LateUpdate qui écrit couleur, alpha, rotation, échelle, position`. 0 `.anim`, 0 `.controller`, 0 `Animator`, 0 `ParticleSystem`, 0 bibliothèque de tween dans le projet.
Mécanismes visuels : **4** (3 méthodes `Update` + 1 coroutine) pour **5 effets** — (1) TopBarController.Update [pouls + tremble, 2 effets], (2) Gyrophare.Update, (3) AmbientPulseLoop.Update [3 sources, ≤ 4 instances], (4) BandeauEphemere.Effacement. Les autres `Update`/`LateUpdate`/coroutines (AppShell.Update = touche retour, LongPressButton/AppuiLong = minuterie d'appui long, DistrictMapNavigation = pan/zoom au doigt, ReputationScreenController/LaSuitePanelController/ExceptionQueueController.LateUpdate = mise en page, HorlogeLegere = scrutation) ne bougent rien à l'écran.
Retour d'appui : 15 sites `Selectable.Transition.None` sur 67 créations de `Button` ; aucune animation d'appui écrite.

## F. Bilan
- **Maquette → Unity, paires comptées (A + B) : 40.** Présentes 2 · partielles 1 · absentes 37.
- A : 29 paires, toutes absentes. B : 11 lignes, 2 présentes, 1 partielle, 8 absentes. Contrôle : 29 + 11 = 40.
