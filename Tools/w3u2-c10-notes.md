# W3.U2 / C10 — Lieutenants et ambiances — notes d'implémentation

Design : `docs/superpowers/plans/2026-08-17-w3u2-district-nuit-design.md` (repo `mafia-w3u2`), chunk C10
(§3, lignes 1519-1529), livrables **U-11** (lieutenants) + **U-12** (boucles ambiantes). Engagement 7
ratifié : « 3-4 boucles ambiantes MAX, budgétées ; lieutenants visibles à leur affectation ». Design
APPROVED après 7 revues ⊥ — exécuté tel quel pour ce qui est livrable ; **U-11 ne l'est PAS** ce chunk
(voir § Deviations, candidat forme F).

⛔⛔ **MODE LÉGER** (ruling contrôleur, reconduit sur ce chunk) : aucun run Unity (batchmode compris),
aucune stack Docker, aucun `Tools/run-unity-check.sh` n'a été exécuté pour ce chunk. Tout ce qui suit
est une mesure **statique** (lecture de fichiers, oracles Python indépendants reproduisant fidèlement
la logique C#) — jamais une exécution PlayMode.

## Ce qui a été mesuré AVANT d'écrire une ligne de code — U-11 (lieutenants)

Le mandat du contrôleur demandait explicitement : si C10 consomme une clé d'affectation lieutenant
que le payload ne porte pas, STOP sur ce point, consigner l'écart, implémenter le reste. Mesure faite
sur le dépôt back (`/home/erutheone/project/mafia-w3u2`, branche `lot/w3.u2`, C1-C3 livrés) :

- **`GET /v1/city/district/:id/interior`** — le DTO complet (`district-interior.controller.ts:54-70`,
  `DistrictInteriorBuildingResponse`/`DistrictInteriorResponse`) et son DTO Unity miroir
  (`CityProjectionDtos.cs:89-116`, `DistrictInteriorBuildingDto`/`DistrictInteriorDto`) : **zéro**
  champ lieutenant, zéro champ `assigned_building_id`, zéro champ `lieutenant_id`. Vérifié dans les
  DEUX corps (repository, projection service, controller) — pas seulement le commentaire d'en-tête.
- **`GET /v1/lieutenants`** (`lieutenant.controller.ts:317-323`) — rend `{ lieutenants: RosterRow[] }`.
  `RosterRow` (`lieutenant.projection.service.ts:196-210`) porte EXACTEMENT 4 champs :
  `lieutenant_id, archetype, op_state_band, rule_count_band` — le commentaire du type le dit
  **verbatim** : « *NO role_id, NO building id, NO raw rules count* ».
- **`GET /v1/lieutenants/:id`** (`lieutenant.controller.ts:334-346`) — `LieutenantBands`
  (`lieutenant.projection.service.ts:131-186`) : 14 champs, tous des bandes qualitatives + le
  `script_source` authored par le joueur. `assigned_building_id` est cité dans le commentaire de TÊTE
  du fichier comme un des champs RAW consommés en interne (pour dériver `op_state_band` via
  `hasCookInProgress`) — **jamais projeté**. R2.2 le redacte par conception, pas par oubli.
- **Aucune troisième route ne joint lieutenant → bâtiment de façon générale, exploitable pour un
  ROSTER de marqueurs.** Balayage large (`grep -rl "lieutenant" --include="*.ts" | grep -v spec |
  grep -v test` sur tout `services/game-back/src` → **274 fichiers**) puis CLASSIFICATION des hits
  qui portent À LA FOIS `lieutenant_id` et un champ `*building_id*` dans une réponse joueur (pas
  seulement comptés — chaque hit ouvert) :
  - `exceptions.projection.service.ts:99` — `ExceptionCardProjection.lieutenant_id` (nullable) EXISTE
    sur la carte d'exception, et certaines `candidate_actions`/`suggested_action` (les cartes de type
    raid — REPAIR/BRIBE/LAY_LOW/…, `:52-58`) portent un `target_building_id`. **Ce n'est PAS la même
    donnée** : `target_building_id` est le bâtiment CIBLE d'une action de résolution de raid, pas le
    bâtiment d'AFFECTATION du lieutenant ; et la file d'exceptions est PENDING-only, sparse et
    événementielle — pas un roster stable des affectations courantes. Utiliser cette route pour
    peupler des marqueurs de district serait un contournement sémantiquement faux (la leçon du socle
    "un précédent non lu dans le corps peut prouver l'inverse de ce qu'on lui fait dire", appliquée en
    CLASSIFIANT le hit avant de l'écarter, pas en le citant après coup comme un précédent favorable).
  - `recruitment.controller.ts:149-155` — `assigned_building_id` y apparaît, mais UNIQUEMENT comme
    champ de CORPS DE REQUÊTE (`POST .../hire`, ce que le joueur ENVOIE pour choisir où affecter le
    lieutenant recruté) ; la RÉPONSE (`:144`) ne rend que `{ quest_id, outcome, lieutenant_id,
    hire_quality, … }` — aucun `assigned_building_id` en sortie.
  - Les autres hits (`*-admin.controller.ts`, `*-test.controller.ts`, `meta_progression/*`,
    `core_loops/*`) sont soit BO-only (jamais joueur), soit `_test`, soit sans rapport de domaine
    (delegation-ratchet, horizon-tier, flag-discipline — aucun ne porte de paire
    lieutenant/bâtiment).
  `common/lieutenant-building-id-hash.ts` existe mais sert un sous-système SANS RAPPORT
  (forensic/legal `lieutenantBuildingIdHash` — un pseudo-id 31-bit dérivé de l'UUID, jamais un vrai
  `block_id`/`buildings.building_id` de city-state ; l'utiliser aurait été inventer un contournement,
  explicitement interdit par le mandat).

**Conclusion** : la donnée existe en base (`lieutenant.assigned_building_id`, colonne réelle,
`schema_lieutenant.md` §2), a un écrivain de production (recruit/reassign), mais **aucune route ou
projection ne la porte jusqu'au joueur**. Ni un maillon mort classique (le maillon écrit et se lit
très bien côté serveur) ni un défaut d'appelant — c'est un TROU DE PROJECTION au sens strict du socle
(forme F : "la donnée est en base, relue, passée au COMPOSITEUR interne — c'est la SURFACE JOUEUR qui
l'omet, PARTOUT, pas seulement sur cette route"). Ce candidat forme F **n'a pas de réparation côté
Unity** — le geste correct est d'ajouter un champ à une projection back (district-interior ou
lieutenants), hors périmètre de ce chunk (`coder` = implémentation Unity de ce lot).

## Ce qui a été livré

- **U-12 — les boucles ambiantes budgétées** (`Assets/Scripts/CityMap/DistrictInteriorScreenController.cs`,
  étendu ; `Assets/Scripts/CityMap/AmbientPulseLoop.cs`, nouveau). Mécanisme :
  - `AmbientPulseLoop` (MonoBehaviour) — une micro-animation d'alpha (`Mathf.Sin`, amplitude 0.12,
    vitesse 1.6, déphasage aléatoire par instance pour éviter un pulse synchronisé qui LIRAIT comme
    un effet plein écran) sur le `Graphic` (`Image`) du GameObject porteur. Il ne connaît rien du
    budget — c'est un exécutant, pas un décideur.
  - `TryStartAmbientLoop(GameObject)` — le SEUL point d'entrée qui attache `AmbientPulseLoop`. Garde
    le budget : `if (ActiveAmbientLoopCount >= MaxAmbientLoops) return;` — au-delà, la source reste
    RENDUE (C9-F2 intact, la présence de la lumière reste un fait du back) mais SANS micro-motion.
  - 3 sites d'appel, choisis parmi les 5 bindings de C9 : `BuildRevenueSign` (néon `EARNING` — pas
    l'enseigne sombre), `BuildActivitySmoke` (`activity_band == ACTIVE`), `BuildMaintenanceFlicker`
    (dette en retard non prise en charge). Binding 1+2 (fenêtre ambre, la possession) N'EST PAS
    candidat — voir § Deviations pour la justification.
  - `ActiveAmbientLoopCount` (test hook, remis à 0 à chaque `Render()`, comme les compteurs C9) +
    `MaxAmbientLoops` (const public = 4, pour que le test ne duplique pas le nombre en dur).
- **Tests** (`Assets/Tests/PlayMode/DistrictInteriorAmbientLoopsPlayModeTests.cs`, `[Category("W3U2")]`) :
  3 `[UnityTest]` couvrant C10-F2 (saturation, sous-budget, non-fuite entre deux `Render()`).
- **R2.3** : zéro nouveau tunable/token — `AmbientPulseLoop` module en dur ses 2 constantes
  (amplitude/vitesse, une propriété de mise en page comme `CellSize`, pas un tunable de jeu R2.3, même
  raisonnement que C8's `CellSize`).

## Ce qui N'A PAS été livré — U-11 (lieutenants)

⛔ Aucun marqueur de lieutenant n'est construit. Aucune méthode `BuildLieutenantMarker` n'existe.
C10-F1 n'est ni implémentée ni testée. Voir § Deviations pour la mesure complète qui fonde ce STOP.

## Falsifiables — statut

| # | quoi | statut |
|---|---|---|
| C10-F1 | marqueurs de lieutenant == affectations reçues, appariés par bâtiment | ⛔ **NON LIVRÉE** — aucune route/projection ne porte l'affectation jusqu'au joueur (candidat forme F, § Deviations). Ni le code ni le test n'existent pour cette falsifiable. |
| C10-F2 | le nombre de boucles ambiantes actives est ≤ 4, cible = le compte à l'exécution | ÉCRITE, différée (3 tests : saturation exacte à 4, sous-budget suit exactement les candidats, non-fuite entre deux rendus) |

## Evidence statique (obtenue SANS Unity — oracles indépendants)

pwd = `/home/erutheone/project/mafia-builder-city-clean`

### Balance syntaxique — scanner string/commentaire-aware (REUSE du scanner de C7/C8/C9)

```
$ python3 -c "... scanner qui suit l'état chaîne/char/commentaire ..."
Assets/Scripts/CityMap/AmbientPulseLoop.cs                             -> parens 0/0 min 0 | braces 0/0 min 0 -> OK
Assets/Scripts/CityMap/DistrictInteriorScreenController.cs             -> parens 0/0 min 0 | braces 0/0 min 0 -> OK
Assets/Tests/PlayMode/DistrictInteriorAmbientLoopsPlayModeTests.cs     -> parens 0/0 min 0 | braces 0/0 min 0 -> OK
```
**Aucun compilateur C# réel n'a tourné** — ce contrôle prouve l'absence d'un déséquilibre structurel
grossier, pas l'absence de toute faute de syntaxe fine ni de faute sémantique — voir § RUNS DIFFÉRÉS.

### C7-F3 non régressée — re-balayage `.SignIn(` après extension du fichier

```
$ python3 -c "... os.walk('Assets/Scripts'), count('.SignIn(') ..."
total .cs files under Assets/Scripts: 51   (50 en sortie de C9, +1 = AmbientPulseLoop.cs)
.SignIn( hits (files): 8   (INCHANGÉ — mêmes 8 fichiers que la mesure de C9)
diorama contains .SignIn(: False
```
L'extension du contrôleur pour C10 (1 méthode de gouvernance, 3 sites d'appel, 2 champs de test) n'a
introduit AUCUN appel signin — C7-F3 reste vraie sur le fichier étendu.

### Unicité des symboles neufs

```
$ grep -rn "\bAmbientPulseLoop\b|\bActiveAmbientLoopCount\b|\bMaxAmbientLoops\b|\bTryStartAmbientLoop\b" Assets/Scripts Assets/Tests
```
- `AmbientPulseLoop` — 1 déclaration de classe (`AmbientPulseLoop.cs:14`), 1 site d'attache
  (`DistrictInteriorScreenController.cs:415`), 3 lectures dans le test (`GetComponentsInChildren`) —
  pas de doublon.
- `ActiveAmbientLoopCount` — 1 déclaration de propriété, 1 reset, 1 lecture en garde, 1 incrément —
  tous dans `DistrictInteriorScreenController.cs` — pas de doublon.
- `MaxAmbientLoops` — 1 déclaration `public const int`, 1 usage en garde — pas de doublon.
- `TryStartAmbientLoop` — 1 déclaration, 3 sites d'appel — pas de doublon.

### GUID des 2 `.meta` neufs — vérifiés sans collision

```
$ python3 -c "import uuid; print(uuid.uuid4().hex)"
script: cc09b41c9c61472ab4f2e19eaba501ed
test:   ed58cd38a22e4912abf858c53d571d9b
$ grep -rl "cc09b41c9c61472ab4f2e19eaba501ed" Assets --include="*.meta" | grep -v AmbientPulseLoop.cs.meta ; exit=1 (aucun hit)
$ grep -rl "ed58cd38a22e4912abf858c53d571d9b" Assets --include="*.meta" | grep -v DistrictInteriorAmbientLoopsPlayModeTests.cs.meta ; exit=1 (aucun hit)
```
Format `.meta` vérifié octet à octet contre un voisin de même TYPE (script vs test) — les scripts
`.meta` de ce dossier n'ont PAS de retour à la ligne final (`DistrictTintedImage.cs.meta`), les tests
`.meta` EN ONT un (`DistrictInteriorLightingPlayModeTests.cs.meta`) — les deux `.meta` neufs
respectent chacun la convention de leur dossier, vérifiée par `xxd`.

### asmdef — aucun changement nécessaire

`Assets/Tests/PlayMode/CityMap.PlayMode.Tests.asmdef` référence déjà `CityMap` (vérifié en lisant le
fichier) — le nouveau test et le nouveau script vivent tous deux dans des dossiers déjà couverts par
les asmdef existants (`CityMap` pour le script, `CityMap.PlayMode.Tests` pour le test).

## RUNS DIFFÉRÉS (à la fenêtre de runs groupée du contrôleur)

1. **Compilation Unity réelle** — aucune erreur de compilation n'a pu être confirmée par le
   compilateur réel ; vérifiée seulement par relecture manuelle ligne à ligne + le scanner syntaxique
   ci-dessus. Risque résiduel identique à celui déjà consigné en C5-C9.
2. **Les 3 `[UnityTest]` de ce chunk, vus par un run réel** — aucun n'a été exécuté. Les 3 sont
   **offline** (aucun appel HTTP — `Render()` prend un DTO fabriqué directement), donc leur dépendance
   stack est nulle.
3. **Le juge lui-même** — `LOG_FILE=... ./Tools/run-unity-check.sh -executeMethod
   MafiaCI.RunPlayModeTests`. Attendu : `passed >= <baseline C9> + 3` — 3 `[UnityTest]` neufs
   (`C10F2a_...`, `C10F2b_...`, `C10F2c_...`), `failed == 0`.
4. **Le comportement visuel réel de `AmbientPulseLoop`** — l'amplitude/vitesse choisies
   (0.12 / 1.6) n'ont pu être VUES en jeu (mode léger). "Micro-motion discrète, jamais de VFX plein
   écran" est une contrainte de CONCEPTION respectée par construction (une seule composante — alpha —
   dans une bande étroite, sur un `Graphic` existant, jamais un GameObject/particle system neuf) mais
   son ressenti final est une question d'É3 (assets/tuning finaux), même statut que le rendu visuel de
   C8/C9.
5. **Les 2 `.meta` neufs** — écrits à la main, GUID généré par `uuid.uuid4().hex`, vérifiés sans
   collision (ci-dessus), format vérifié octet à octet contre un voisin de même type. Unity doit
   confirmer l'import à la fenêtre.
6. **U-11 (lieutenants) — le vrai différé de ce chunk.** Contrairement aux runs différés habituels
   (mode léger → exécution), celui-ci est un DIFFÉRÉ DE PÉRIMÈTRE : aucune ligne de code Unity ne
   comblera ce trou tant qu'aucune route/projection back ne porte l'affectation lieutenant→bâtiment.
   Geste attendu, hors ce chunk : router `spec-writer` sur un correctif de projection back (candidat :
   ajouter aux clés déjà projetées de `DistrictInteriorBuildingResponse` un champ bandé R2.2, p.ex.
   `has_lieutenant: boolean` ou `lieutenant_archetype_band` — jamais l'UUID/l'id brut — OU étendre
   `RosterRow`/`LieutenantBands` d'un champ de bâtiment bandé). Ce chunk ne tranche PAS ce choix
   d'architecture (rôle du `spec-writer`, pas du `coder`) — il se contente de mesurer et de consigner.

## Deviations

### (a) U-11 (lieutenants) NON livré — conflit avec la spec, remonté conformément au mandat

**Quoi** : C10-F1 exige que le nombre de marqueurs de lieutenant rendus soit égal au nombre
d'affectations REÇUES, appariées par bâtiment. Le design ne précise à aucun endroit (D1-D9, §1, §2,
prémisse) quelle route ou quelle clé porte cette affectation jusqu'au client — un examen complet du
back livré (C1-C3 : `district-interior.*`, ET `lieutenant.controller.ts`/`.projection.service.ts`,
seules routes du dépôt qui touchent "lieutenant") montre qu'**aucune n'expose la paire
(lieutenant, bâtiment) au joueur** — `RosterRow`/`LieutenantBands` la redactent explicitement par
conception R2.2 (« *NO building id* », verbatim dans le commentaire du type).

**Pourquoi ce n'est pas un imprévu à trancher par l'implémenteur** : le mandat du contrôleur anticipait
exactement ce cas et a donné le protocole exact — STOP sur ce point précis (pas sur tout le chunk),
consigner comme candidat forme F, implémenter le reste, n'inventer ni la clé ni un contournement.
Inventer une clé côté DTO Unity sans écrivain back ferait planter le parse `JsonUtility` en silence
(le champ resterait toujours à sa valeur par défaut — exactement le piège D7 documente pour
`lapse_phase_bucket` avant C7). Utiliser `lieutenantBuildingIdHash` (le seul symbole du dépôt qui
associe "lieutenant" et "building id" dans son nom) aurait été un contournement déguisé en précédent —
lu dans le corps, c'est un hash 31-bit PSEUDO pour un sous-système forensic/legal SANS RAPPORT, jamais
un vrai lien vers `buildings.building_id`/`block_id` de city-state (la leçon du socle "un précédent
non lu dans le corps peut prouver l'inverse de ce qu'on lui fait dire", appliquée ici en la CHERCHANT
avant de s'en servir plutôt qu'en la citant après coup).

**Option retenue** : ne rien construire pour U-11. Zéro méthode `BuildLieutenantMarker`, zéro champ
DTO inventé, zéro falsifiable écrite pour C10-F1. C'est l'option qui change le MOINS de surface (le
chunk livre U-12 seul, proprement) plutôt que de livrer un mécanisme mort (gardé par un champ qui
n'existera jamais en pratique) ou halluciné (un champ DTO qui masquerait silencieusement l'absence de
données côté back).

**Conséquence pour C11 (clôture, §3.0 arithmétique)** : ce chunk livre 1 livrable sur 2 (U-12 seul).
Le contrôle d'arithmétique du découpage à la clôture (C11-F1, "somme des livrables par chunk = plancher
compté") DOIT compter C10 = 1, pas 2, tant qu'U-11 n'est pas livré par un lot ultérieur (back +
Unity). Signalé ici explicitement pour que ce delta ne se perde pas entre ce commit et C11.

### (b) Candidats du budget d'ambiances — binding 1+2 exclu, mécanisme non prescrit par le design

**Quoi** : le design nomme le nombre ("3-4 boucles ambiantes maximum") mais ne dit nulle part QUELLES
sources sont candidates à une boucle ambiante — au-delà de la BUDGET GUIDANCE donnée par le
contrôleur (« l'intensité du feedback proportionnelle à l'importance… jamais de VFX plein écran »).

**Pourquoi c'est un imprévu non bloquant** : test du socle appliqué — aucune décision D1-D9 ne
tranche ce point, et le choix ne change aucune propriété que C10-F2 vérifie (le budget tient quel que
soit l'ensemble de candidats choisi).

**Option retenue** : les 3 bindings DYNAMIQUES de C9 (néon EARNING, fumée ACTIVE, grésillement de
maintenance) sont candidats — ce sont les 3 états qui varient dans le temps et signalent un
événement réel (D2/D3 : "classe DONNÉE"). Binding 1+2 (fenêtre ambre, la possession — TYPE, invariant
tant que le bâtiment reste possédé et sain) est EXCLU : c'est l'état le plus commun et le moins
événementiel de l'écran (100% des bâtiments rendus l'ont, prémisse §3), donc l'animer violerait
"l'intensité proportionnelle à l'importance" — tout finirait par pulser, ce qui LIT exactement comme
le VFX plein écran que la consigne interdit.

**Alternative rejetée** : animer TOUS les 5 bindings (y compris fenêtre ambre) et laisser le budget
départager — rejetée parce qu'au J0 (4 bâtiments, tous SOUND) les 4 fenêtres auraient consommé le
budget ENTIER sans qu'aucun événement réel (revenu/activité/dette) ne soit visible — l'inverse de
"proportionnel à l'importance".

### (c) `implementation-notes.md` — REUSE de la pratique déjà établie en C5-C9

Comme en C5-C9 : `implementation-notes.md` n'existe pas comme fichier suivi dans ce dépôt. Les
déviations sont consignées ici **et** dans le message de commit correspondant.

Aucun conflit avec le canon rencontré sur (b) — c'est un choix d'implémentation matériel (mécanisme
non prescrit par le design). (a) EST un point remonté conformément au protocole donné par le mandat
(STOP ciblé, pas une supposition d'architecture) — pas un conflit tranché unilatéralement.
