# Inventaire des animations — maquettes ↔ Unity (CLIENT-3, 07/10/2026)

Méthode : chaque maquette est chargée dans Chromium (Playwright) ; `document.getAnimations()` énumère les animations RÉELLES, rattachées à leur cadre (`.cadre`). Rien n'est lu à l'œil. Unité = une paire (écran, `@keyframes`) appliquée à ≥ 1 élément ; « instances » = éléments animés, tous cadres de l'écran réunis.

## A. ecrans-brennar-6.html (atelier `b7d8c1a`, 146 cadres) — 554 animations réelles mesurées

| écran | @keyframes | instances | cadres animés / cadres de l'écran | gelées (paused) | cause dans la fiction | état Unity |
|---|---|---:|---:|---:|---|---|
| ③ Carte | `hl` | 3 | 3 / 3 | 0 | le halo doré du pin « VOUS ÊTES ICI » respire (6 s) : le district du joueur veille | absente — l'hôte (le pin « VOUS ÊTES ICI ») n'existe pas côté client (DistrictCellView.cs:95) |
| ② Fiche — la serre | `sf` | 202 | 3 / 3 | 202 | chaque feuille pivote sur son pétiole (amplitude = santé : une plante qui souffre PEND) | absente — AUCUNE scène de serre dans BuildingCardController (0 plante, 0 rampe, 0 goutte) |
| ② Fiche — la serre | `drip` | 18 | 3 / 3 | 18 | le goutte-à-goutte tombe | absente — AUCUNE scène de serre dans BuildingCardController (0 plante, 0 rampe, 0 goutte) |
| ② Fiche — la serre | `derive` | 15 | 3 / 3 | 15 | la brume de la serre dérive | absente — AUCUNE scène de serre dans BuildingCardController (0 plante, 0 rampe, 0 goutte) |
| ② Fiche — la serre | `led` | 9 | 3 / 3 | 9 | les rampes de culture (LED) pulsent | absente — AUCUNE scène de serre dans BuildingCardController (0 plante, 0 rampe, 0 goutte) |
| ② Fiche — la serre | `spl` | 9 | 3 / 3 | 9 | la goutte éclabousse dans le godet | absente — AUCUNE scène de serre dans BuildingCardController (0 plante, 0 rampe, 0 goutte) |
| ② Fiche — la serre | `respire` | 9 | 3 / 3 | 9 | le pot respire (balancement lent) | absente — AUCUNE scène de serre dans BuildingCardController (0 plante, 0 rampe, 0 goutte) |
| ② Fiche — la serre | `tg` | 9 | 3 / 3 | 9 | la plante entière tangue | absente — AUCUNE scène de serre dans BuildingCardController (0 plante, 0 rampe, 0 goutte) |
| ② Fiche — la serre | `clign` | 5 | 2 / 3 | 5 | l'étiquette « à soigner » clignote (alerte) | absente — AUCUNE scène de serre dans BuildingCardController (0 plante, 0 rampe, 0 goutte) |
| ② Fiche — le labo | `bl` | 52 | 2 / 6 | 52 | les bulles de l'ébullition (nucléation → éclatement) | absente — le pupitre est une silhouette de fourneau FIGÉE (BuildingCardController.AddPupitreLaboratoire:2242) : 0 ébullition, 0 vapeur |
| ② Fiche — le labo | `vp` | 14 | 2 / 6 | 14 | la vapeur monte dans la colonne | absente — le pupitre est une silhouette de fourneau FIGÉE (BuildingCardController.AddPupitreLaboratoire:2242) : 0 ébullition, 0 vapeur |
| ② Fiche — le labo | `cd` | 8 | 2 / 6 | 8 | le condensat glisse dans le réfrigérant | absente — le pupitre est une silhouette de fourneau FIGÉE (BuildingCardController.AddPupitreLaboratoire:2242) : 0 ébullition, 0 vapeur |
| ② Fiche — le labo | `fl` | 6 | 6 / 6 | 6 | l'eau du réfrigérant circule (stroke-dashoffset) | absente — le pupitre est une silhouette de fourneau FIGÉE (BuildingCardController.AddPupitreLaboratoire:2242) : 0 ébullition, 0 vapeur |
| ② Fiche — le labo | `rl` | 4 | 2 / 6 | 4 | la surface du ballon roule | absente — le pupitre est une silhouette de fourneau FIGÉE (BuildingCardController.AddPupitreLaboratoire:2242) : 0 ébullition, 0 vapeur |
| ② Fiche — le labo | `ch` | 4 | 2 / 6 | 4 | la résistance du chauffe-ballon / le témoin chauffe | absente — le pupitre est une silhouette de fourneau FIGÉE (BuildingCardController.AddPupitreLaboratoire:2242) : 0 ébullition, 0 vapeur |
| ② Fiche — le labo | `ec` | 2 | 2 / 6 | 2 | l'écume ondule en surface | absente — le pupitre est une silhouette de fourneau FIGÉE (BuildingCardController.AddPupitreLaboratoire:2242) : 0 ébullition, 0 vapeur |
| ② Fiche — le labo | `rd` | 2 | 2 / 6 | 2 | la goutte ride le collecteur | absente — le pupitre est une silhouette de fourneau FIGÉE (BuildingCardController.AddPupitreLaboratoire:2242) : 0 ébullition, 0 vapeur |
| ② Fiche — le labo | `gt` | 2 | 2 / 6 | 2 | la goutte tombe du collecteur | absente — le pupitre est une silhouette de fourneau FIGÉE (BuildingCardController.AddPupitreLaboratoire:2242) : 0 ébullition, 0 vapeur |
| ② Fiche — Ash (l'écrin) | `po` | 78 | 3 / 3 | 78 | la poussière flotte dans le faisceau | absente — VitrineAsh = socle + cloche + éclats FIGÉS (BuildingCardController.AddVitrineAsh:2318) : 0 mouvement |
| ② Fiche — Ash (l'écrin) | `sc` | 18 | 2 / 3 | 18 | les prismes d'Ash scintillent | absente — VitrineAsh = socle + cloche + éclats FIGÉS (BuildingCardController.AddVitrineAsh:2318) : 0 mouvement |
| ② Fiche — Ash (l'écrin) | `pe` | 18 | 3 / 3 | 18 | les pétales du lys de verre bougent | absente — VitrineAsh = socle + cloche + éclats FIGÉS (BuildingCardController.AddVitrineAsh:2318) : 0 mouvement |
| ② Fiche — Ash (l'écrin) | `am` | 3 | 3 / 3 | 3 | l'ampoule d'établi vacille | absente — VitrineAsh = socle + cloche + éclats FIGÉS (BuildingCardController.AddVitrineAsh:2318) : 0 mouvement |
| ② Fiche — Ash (l'écrin) | `ci` | 3 | 3 / 3 | 3 | la cire (bougie) respire | absente — VitrineAsh = socle + cloche + éclats FIGÉS (BuildingCardController.AddVitrineAsh:2318) : 0 mouvement |
| ② Fiche — Ash (l'écrin) | `cl` | 1 | 1 / 3 | 1 | le voyant clignote | absente — VitrineAsh = socle + cloche + éclats FIGÉS (BuildingCardController.AddVitrineAsh:2318) : 0 mouvement |
| ㉑ Marché | `mk-veille` | 12 | 4 / 6 | 0 | la veille des voyants allumés | absente — écran NON MONTÉ (INDEX : « Market (non monté) ») |
| ㉑ Marché | `mk-buee` | 6 | 2 / 6 | 0 | la buée du froid (marchandise réfrigérée) | absente — écran NON MONTÉ (INDEX : « Market (non monté) ») |
| ㉑ Marché | `mk-scan` | 5 | 5 / 6 | 0 | le balayage du tablo (ligne cyan 2 px, 7,5 s) | absente — écran NON MONTÉ (INDEX : « Market (non monté) ») |
| ㉑ Marché | `mk-lampe` | 3 | 3 / 6 | 0 | la lampe du tableau du Verge d'Or | absente — écran NON MONTÉ (INDEX : « Market (non monté) ») |
| ㉟ La vente | `vnt6-scan` | 5 | 5 / 6 | 0 | le balayage du tablo (ligne cyan 2 px, 7,5 s) — cause diégétique À CONFIRMER (écran de contrôle ?) | absente — l'écran est monté mais statique : 0 balayage (grep Update/coroutine : aucun) |
| ㊱ L'horizon | `hrz6-scan` | 5 | 5 / 6 | 0 | le balayage du tablo (ligne cyan 2 px, 7,5 s) — cause diégétique À CONFIRMER (écran de contrôle ?) | absente — l'écran est monté mais statique : 0 balayage (grep Update/coroutine : aucun) |
| ㊲ La réputation | `rep6-scan` | 7 | 7 / 7 | 0 | le balayage du tablo (ligne cyan 2 px, 7,5 s) — cause diégétique À CONFIRMER (écran de contrôle ?) | absente — l'écran est monté mais statique : 0 balayage (grep Update/coroutine : aucun) |
| ㊳ Le journal | `jrn6-scan` | 6 | 6 / 7 | 0 | le balayage du tablo (ligne cyan 2 px, 7,5 s) — cause diégétique À CONFIRMER (écran de contrôle ?) | absente — l'écran est monté mais statique : 0 balayage (grep Update/coroutine : aucun) |
| ㊴ Le dossier | `dos6-scan` | 6 | 6 / 7 | 0 | le balayage du tablo (ligne cyan 2 px, 7,5 s) — cause diégétique À CONFIRMER (écran de contrôle ?) | absente — l'écran est monté mais statique : 0 balayage (grep Update/coroutine : aucun) |
| ㊵ La filière | `bln6-scan` | 5 | 5 / 6 | 0 | le balayage du tablo (ligne cyan 2 px, 7,5 s) — cause diégétique À CONFIRMER (écran de contrôle ?) | absente — l'écran est monté mais statique : 0 balayage (grep Update/coroutine : aucun) |

**Total A : 34 paires (écran, @keyframes) · 554 instances · 554 animations mesurées dans le fichier · résidu non rattaché à un écran : 0.**
Somme de contrôle A (paires, instances) par écran : ③ Carte = 1, 3 ; ② Fiche — la serre = 8, 276 ; ② Fiche — le labo = 9, 94 ; ② Fiche — Ash (l'écrin) = 6, 121 ; ㉑ Marché = 4, 26 ; ㉟ La vente = 1, 5 ; ㊱ L'horizon = 1, 5 ; ㊲ La réputation = 1, 7 ; ㊳ Le journal = 1, 6 ; ㊴ Le dossier = 1, 6 ; ㊵ La filière = 1, 5 ⇒ Σ paires = 34, Σ instances = 554.
Cadres portant ≥ 1 animation : 54 sur 146. Les 92 autres sont STATIQUES.
Dont GELÉES par `figer.py` (ruling du 27/08 13h42, bloc `.serre6/.ecrin6/.labo6{animation-play-state:paused !important}`, que le ruling du soir « animé le truc » n'a pas levé dans le fichier) : 491 instances, 23 paires.

## B. hud-brennar-canon.html (atelier `b7d8c1a`) — ① Intérieur de district, lu dans le CSS (états `.tel.descente` / `.tel.jour` : le fichier ne les exerce qu'au clic)

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

**Total B : 10 lignes (4 @keyframes + 6 transitions) = 2 présentes + 1 partielles + 7 absentes.**

## C. Maquettes à animation DÉFINIE mais NON APPLIQUÉE (0 instance mesurée)

- ④ `ecrans-brennar-accueil.html` : 6 `@keyframes` définis (goutte, derive, respire, osc, pulseRose, clign), **0 animation en cours** sur les 5 cadres → ④ est statique en maquette.
- `ecrans-brennar-6.html` : **13 `@keyframes` morts**. (a) `vnt6/hrz6/rep6/jrn6/dos6/bln6-lampe` ×6 : aucune règle ne les référence. (b) `vnt6/hrz6/rep6/jrn6/dos6/bln6-veille` ×6 : la règle `.X6 .veille6{animation:…}` existe mais AUCUN élément ne porte la classe `veille6` (0 `class="…veille6…"`). (c) `mk-eclat` : la règle `.mar6 .prod .eclat` existe, 0 élément `.eclat` ⇒ sur le marché, des cinq animations annoncées par front.md (lampe, buée, éclat, veille, balayage) **quatre tournent, l'éclat des prismes n'est posé nulle part**.
- `ecrans-brennar-conflit-proposes-2026-09-24.html` : 33 noms définis, 0 animation en cours (㉙ statique).
- Série 4 (`ecrans-brennar-4.html`), `-3`, `-5`, `-navigation`, `-7-lieutenant`, `-25-tutoriel`, `-34-composeur`, `-porte` : 0 animation en cours.

## D. Animations Unity SANS maquette (le code les a inventées)

| # | où | mécanisme | quoi |
|---:|---|---|---|
| D1 | ① DistrictInteriorScreenController | `AmbientPulseLoop.Update` (Mathf.Sin sur l'alpha, ≤ 4 simultanées, `MaxAmbientLoops`) | néon d'enseigne EARNING, fumée d'activité, scintillement de dette de maintenance (3 sources) — ajouté à des images posées pour une raison de DONNÉE |
| D2 | Shell, BandeauEphemere | coroutine `Effacement` (fondu de sortie) | le bandeau éphémère (descente / ville chauffe / carte / rapport) se retire en fondu |

## E. Totaux — Unity réellement animé, compté dans Assets/Scripts (182 .cs)

Recherche exhaustive de `Animator|.anim|DOTween|LeanTween|ParticleSystem|AnimationCurve|IEnumerator qui écrit couleur/alpha/position|Update/LateUpdate qui écrit couleur, alpha, rotation, échelle, position`. 0 `.anim`, 0 `.controller`, 0 `Animator`, 0 `ParticleSystem`, 0 bibliothèque de tween dans le projet.
Mécanismes visuels : **5** — (1) TopBarController.Update [pouls + tremble, 2 effets], (2) Gyrophare.Update, (3) AmbientPulseLoop.Update [3 sources], (4) BandeauEphemere.Effacement. Les autres `Update`/`LateUpdate`/coroutines (AppShell.Update = touche retour, LongPressButton/AppuiLong = minuterie d'appui long, DistrictMapNavigation = pan/zoom au doigt, ReputationScreenController/LaSuitePanelController/ExceptionQueueController.LateUpdate = mise en page, HorlogeLegere = scrutation) ne bougent rien à l'écran.
Retour d'appui : 15 sites `Selectable.Transition.None` sur 67 créations de `Button` ; aucune animation d'appui écrite.

## F. Bilan
- **Maquette → Unity, paires comptées (A + B) : 44.** Présentes 2 · partielles 1 · absentes 41.
- A : 34 paires, toutes absentes. B : 10 lignes, 2 présentes, 1 partielle, 7 absentes. Contrôle : 34 + 10 = 44.
