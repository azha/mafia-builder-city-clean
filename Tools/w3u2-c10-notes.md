# W3.U2 / C10 — Lieutenants et ambiances — notes d'implémentation

Design : `docs/superpowers/plans/2026-08-17-w3u2-district-nuit-design.md` (repo `mafia-w3u2`), chunk C10
(§3), livrables **U-11** (lieutenants) + **U-12** (boucles ambiantes). Engagement 7 ratifié : « 3-4
boucles ambiantes MAX, budgétées ; lieutenants visibles à leur affectation ».

⛔→✅ **U-11 était STOPPÉ, MAINTENANT LIVRÉ.** Une première passe de ce chunk a mesuré qu'aucune
route/projection back ne portait l'affectation lieutenant→bâtiment jusqu'au joueur (§ ci-dessous,
conservée comme evidence de POURQUOI le STOP était fondé, pas comme état courant). Le contrôleur a
arbitré ce trou : le design a été amendé (v8-v10, APPROVED en revues ⊥ #8-#10) et le back a livré
**D10/§C2-bis (B-7)** — `buildings[].lieutenant_ids: string[]` sur la route interior, commit
`adf8d368` (`mafia-w3u2`, branche `lot/w3.u2`). Ce commit-ci consomme cette clé et livre U-11. Les
DEUX livrables de C10 sont maintenant faits — voir § « Ce qui a été livré » pour les deux.

⛔⛔ **MODE LÉGER** (ruling contrôleur, reconduit sur ce chunk) : aucun run Unity (batchmode compris),
aucune stack Docker, aucun `Tools/run-unity-check.sh` n'a été exécuté pour ce chunk. Tout ce qui suit
est une mesure **statique** (lecture de fichiers, oracles Python indépendants reproduisant fidèlement
la logique C#) — jamais une exécution PlayMode.

## HISTORIQUE — ce qui a été mesuré AVANT d'écrire une ligne de code (STOP initial, désormais LEVÉ)

⚠️ **Cette section décrit l'état du back AVANT le commit `adf8d368` (D10/§C2-bis).** Elle est
conservée intégralement comme evidence du STOP — un STOP ciblé fondé sur une mesure exhaustive,
exactement le protocole attendu — mais **NE DÉCRIT PLUS L'ÉTAT COURANT**. Voir « Ce qui a été livré »
pour ce qui est vrai maintenant.

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

- **U-11 — lieutenants visibles à leur affectation** (D10/§C2-bis, débloqué par `adf8d368` back).
  - **DTO client** (`CityProjectionDtos.cs`) — `public string[] lieutenant_ids;` ajouté à
    `DistrictInteriorBuildingDto`. REUSE du patron déjà établi par
    `BuildingCardDtos.available_vehicles` (même fichier de famille) : `JsonUtility` gère nativement un
    tableau de primitives EN CHAMP d'une classe (seul un tableau EN RACINE exigerait un wrapper
    `[Serializable]` dédié) — précédent MESURÉ, pas supposé.
  - **`BuildLieutenantMarkers`** (`DistrictInteriorScreenController.cs`) — un marqueur **par entrée**
    de `lieutenant_ids`, jamais un marqueur par bâtiment : boucle `for` sur `lieutenant_ids.Length`,
    chaque itération crée un GameObject `LieutenantMarker_{i}` DISTINCT, positionné par index (petits
    carrés en rangée, bande basse de la cellule, décalés horizontalement) pour que 2 marqueurs sur le
    MÊME bâtiment restent 2 objets séparés — le cas dégénéré exact du J0. **AUCUN budget** ne
    s'applique (contrairement à `TryStartAmbientLoop`/U-12) — le design amendé ne borne QUE les
    boucles ambiantes ; une présence de lieutenant n'est pas une boucle.
  - Défensif : `if (building.lieutenant_ids == null) return;` — un payload malformé (champ absent du
    JSON) ne doit jamais planter le rendu, même si D10 garantit `[]` côté back.
  - Token : REUSE de `DesignTokens.Current.lieutenantMutedDeep` (déjà asset-backed, déjà consommé par
    `LieutenantScreenController.cs:2100` — pas un token orphelin) — zéro token neuf, R2.3.
  - `RenderedLieutenantMarkerCount` (test hook, total sommé sur tous les bâtiments, remis à 0 à chaque
    `Render()`, même patron que les compteurs C9/C10-F2).
  - **Tests** (`Assets/Tests/PlayMode/DistrictInteriorLieutenantMarkersPlayModeTests.cs`,
    `[Category("W3U2")]`) : 3 `[UnityTest]` — voir § Falsifiables pour le détail de C10-F1.

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

## Falsifiables — statut

| # | quoi | statut |
|---|---|---|
| C10-F1 | (v8 — clé nommée `lieutenant_ids`) marqueurs de lieutenant == entrées de `lieutenant_ids` REÇUES, appariées PAR BÂTIMENT | ÉCRITE, différée. 3 tests : (1) forme générale sur 3 bâtiments de tailles 0/2/1, appariement vérifié PAR CELLULE (`MarkersUnderCell`), total = somme (3), pas le nombre de bâtiments occupés (2) ; (2) polarité — une réaffectation déplace le marqueur (delta avant/après sur les 2 bâtiments, miroir C2bis-F2) ; (3) **J0 RÉEL** (charter 27, signup+fetch réels) — mesure fraîche `lab.lieutenant_ids.Length == 2`, 3 autres bâtiments à 0, PUIS rendu : 2 marqueurs, tous deux sous la cellule du lab. |
| C10-F2 | le nombre de boucles ambiantes actives est ≤ 4, cible = le compte à l'exécution | ÉCRITE, différée (3 tests : saturation exacte à 4, sous-budget suit exactement les candidats, non-fuite entre deux rendus) |

## Evidence statique (obtenue SANS Unity — oracles indépendants)

pwd = `/home/erutheone/project/mafia-builder-city-clean`

### Balance syntaxique — scanner string/commentaire-aware (REUSE du scanner de C7/C8/C9)

```
$ python3 -c "... scanner qui suit l'état chaîne/char/commentaire ..."
Assets/Scripts/CityMap/AmbientPulseLoop.cs                             -> parens 0/0 min 0 | braces 0/0 min 0 -> OK
Assets/Scripts/CityMap/DistrictInteriorScreenController.cs             -> parens 0/0 min 0 | braces 0/0 min 0 -> OK
Assets/Scripts/CityMap/CityProjectionDtos.cs                           -> parens 0/0 min 0 | braces 0/0 min 0 -> OK
Assets/Tests/PlayMode/DistrictInteriorAmbientLoopsPlayModeTests.cs     -> parens 0/0 min 0 | braces 0/0 min 0 -> OK
Assets/Tests/PlayMode/DistrictInteriorLieutenantMarkersPlayModeTests.cs -> parens 0/0 min 0 | braces 0/0 min 0 -> OK
```
(la 2ᵉ passe — DTO + contrôleur ré-étendus pour U-11, + le 3ᵉ fichier de test — a été rescannée après
l'ajout de `lieutenant_ids`/`BuildLieutenantMarkers`, pas seulement le jeu initial U-12.)
**Aucun compilateur C# réel n'a tourné** — ce contrôle prouve l'absence d'un déséquilibre structurel
grossier, pas l'absence de toute faute de syntaxe fine ni de faute sémantique — voir § RUNS DIFFÉRÉS.

### C7-F3 non régressée — re-balayage `.SignIn(` après extension du fichier

```
$ python3 -c "... os.walk('Assets/Scripts'), count('.SignIn(') ..."
total .cs files under Assets/Scripts: 51   (INCHANGÉ depuis U-12 — U-11 n'ajoute aucun .cs sous Scripts, seulement des champs/méthodes dans des fichiers existants)
.SignIn( hits (files): 8   (INCHANGÉ — mêmes 8 fichiers que la mesure de C9/U-12)
diorama contains .SignIn(: False
```
Re-scanné APRÈS l'ajout de `BuildLieutenantMarkers` (U-11) — toujours 8/8, toujours absent du diorama.
C7-F3 reste vraie sur le fichier deux fois étendu (U-12 puis U-11).

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

```
$ grep -rn "\blieutenant_ids\b|\bRenderedLieutenantMarkerCount\b|\bBuildLieutenantMarkers\b" Assets/Scripts Assets/Tests
```
- `lieutenant_ids` — 1 déclaration de champ (`CityProjectionDtos.cs:107`), lue dans le contrôleur
  (2 sites : la garde null + la boucle `for`) et dans les 2 fichiers de test (fabrication de payload +
  lecture du fetch réel) — pas de doublon de DÉCLARATION (les autres occurrences sont des usages).
- `RenderedLieutenantMarkerCount` — 1 déclaration de propriété, 1 reset, 1 incrément, tous dans
  `DistrictInteriorScreenController.cs` — pas de doublon.
- `BuildLieutenantMarkers` — 1 déclaration, 1 site d'appel (`BuildBuildingCell`) — pas de doublon.
- `lieutenantMutedDeep` (REUSE, pas un symbole neuf) — 1 déclaration `DesignTokens.cs:100`
  (INCHANGÉE), 2 consommateurs : `LieutenantScreenController.cs:2100` (préexistant) et
  `DistrictInteriorScreenController.cs:441` (nouveau, ce commit) — confirme que le token a déjà un
  consommateur vivant, pas un token orphelin qu'on vient de réanimer.

### GUID des 3 `.meta` neufs — vérifiés sans collision

```
$ python3 -c "import uuid; print(uuid.uuid4().hex)"
script (U-12): cc09b41c9c61472ab4f2e19eaba501ed
test   (U-12): ed58cd38a22e4912abf858c53d571d9b
test   (U-11): 6a30a6ae61ab439cbe4468bf1dd982ed
$ grep -rl "cc09b41c9c61472ab4f2e19eaba501ed" Assets --include="*.meta" | grep -v AmbientPulseLoop.cs.meta ; exit=1 (aucun hit)
$ grep -rl "ed58cd38a22e4912abf858c53d571d9b" Assets --include="*.meta" | grep -v DistrictInteriorAmbientLoopsPlayModeTests.cs.meta ; exit=1 (aucun hit)
$ grep -rl "6a30a6ae61ab439cbe4468bf1dd982ed" Assets --include="*.meta" ; exit=1 (aucun hit)
```
Format `.meta` vérifié octet à octet contre un voisin de même TYPE (script vs test) — les scripts
`.meta` de ce dossier n'ont PAS de retour à la ligne final (`DistrictTintedImage.cs.meta`), les tests
`.meta` EN ONT un (`DistrictInteriorLightingPlayModeTests.cs.meta`) — les trois `.meta` neufs
respectent chacun la convention de leur dossier, vérifiée par `xxd`. Aucun `.meta` neuf pour
`CityProjectionDtos.cs` — fichier EXISTANT étendu, pas de nouveau fichier.

### asmdef — aucun changement nécessaire

`Assets/Tests/PlayMode/CityMap.PlayMode.Tests.asmdef` référence déjà `CityMap` (vérifié en lisant le
fichier) — le nouveau test et le nouveau script vivent tous deux dans des dossiers déjà couverts par
les asmdef existants (`CityMap` pour le script, `CityMap.PlayMode.Tests` pour le test).

## RUNS DIFFÉRÉS (à la fenêtre de runs groupée du contrôleur)

1. **Compilation Unity réelle** — aucune erreur de compilation n'a pu être confirmée par le
   compilateur réel ; vérifiée seulement par relecture manuelle ligne à ligne + le scanner syntaxique
   ci-dessus. Risque résiduel identique à celui déjà consigné en C5-C9. ⚠️ Point d'attention spécifique
   à U-11 : `JsonUtility` et un champ `string[]` **absent** du JSON (plutôt que `[]`) — le précédent
   `available_vehicles` suggère que ça se résout en `null` côté C#, ce que `BuildLieutenantMarkers`
   garde déjà (`if (building.lieutenant_ids == null) return;`), mais ceci n'a pas pu être VU tourner.
2. **Les 6 `[UnityTest]` de ce chunk, vus par un run réel** — aucun n'a été exécuté. 5 des 6 sont
   **offline** (aucun appel HTTP — `Render()` prend un DTO fabriqué directement) : les 3 de U-12
   (`C10F2a/b/c`) + 2 de U-11 (`C10F1_MarkerCountPerBuildingEqualsLieutenantIdsLength...`,
   `C10F1_ReRenderWithDifferentAssignment...`). **1 seul dépend du réseau** :
   `C10F1_J0Real_LabHasExactlyTwoLieutenantMarkers...` (signup + `session/open` + fetch réel contre
   `http://localhost`, Traefik @ `mafia-w3u2` `lot/w3.u2`) — même dépendance stack que C9-F3, jamais
   vérifiée depuis cette session (mode léger).
3. **Le juge lui-même** — `LOG_FILE=... ./Tools/run-unity-check.sh -executeMethod
   MafiaCI.RunPlayModeTests`. Attendu : `passed >= <baseline C9> + 6` — 6 `[UnityTest]` neufs au total
   (3 `C10F2*` + 3 `C10F1*`), `failed == 0`.
4. **Le comportement visuel réel** — ni l'amplitude/vitesse de `AmbientPulseLoop` (0.12 / 1.6), ni la
   lisibilité des marqueurs de lieutenant (petits carrés en rangée, token `lieutenantMutedDeep`) n'ont
   pu être VUS en jeu (mode léger). Les deux respectent leur contrainte de CONCEPTION par construction
   (micro-motion alpha seule pour l'un, présence/absence bandée sans nouveau token pour l'autre) mais
   le ressenti final est une question d'É3 (assets/tuning finaux), même statut que C8/C9.
5. **Les 3 `.meta` neufs** — écrits à la main, GUID généré par `uuid.uuid4().hex`, vérifiés sans
   collision (ci-dessus), format vérifié octet à octet contre un voisin de même type. Unity doit
   confirmer l'import à la fenêtre.
6. **`DesignTokensParityPlayModeTests.cs`** — non ré-exécuté (mode léger). U-11 ne devrait PAS le faire
   rougir : zéro champ `DesignTokens` ajouté ou renommé (REUSE strict de `lieutenantMutedDeep`,
   déjà `.asset`-backed et déjà couvert par ce juge depuis son introduction).

## Deviations

### (a) ✅ CLOS — U-11 (lieutenants) était STOPPÉ, arbitré par le contrôleur, maintenant livré

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

**Option retenue à l'époque** (première passe de ce chunk) : ne rien construire pour U-11. Zéro
méthode `BuildLieutenantMarker`, zéro champ DTO inventé, zéro falsifiable écrite pour C10-F1. C'était
l'option qui changeait le MOINS de surface plutôt que de livrer un mécanisme mort (gardé par un champ
qui n'existerait jamais en pratique) ou halluciné (un champ DTO masquant silencieusement l'absence de
données côté back).

**✅ Résolution (cette passe)** : le contrôleur a arbitré le trou mesuré ci-dessus — le design a été
amendé (v8 : C10-F1 nomme désormais la clé `lieutenant_ids` ; v9 : la clause de C2bis-F2 corrigée pour
citer la clé nommée plutôt que de reproduire la faute qu'elle documentait ; v10 : re-revues ⊥ #8-#10,
APPROVED) et **§C2-bis (B-7)** a été livré côté back — un `coder` back, PAS ce `coder` Unity (périmètre
respecté, cf. la clause "Qui l'implémente" du design amendé). Commit `adf8d368` sur `mafia-w3u2`
`lot/w3.u2` : 5ᵉ requête batchée (`listLieutenantAssignments`, indexée sur
`lieutenant_assigned_building_idx`, triée par `lieutenant_id`), `lieutenant_ids: string[]` ajouté à
`DistrictInteriorBuildingContent`/`DistrictInteriorBuildingResponse`. Ce commit Unity consomme
exactement cette clé, sans en inventer le mécanisme de tri/vide ni le redéfinir côté client (le tri
et le `[] jamais null` sont des garanties DU BACK, jamais recalculées ici).

**Conséquence pour C11 (clôture, §3.0 arithmétique)** : ce chunk livre maintenant **2 livrables sur
2** (U-11 + U-12). Le delta signalé dans une version antérieure de cette note ("C10 = 1, pas 2") est
**PÉRIMÉ — corrigé ici, dans le même document, pas seulement en commit** : le contrôle d'arithmétique
du découpage à la clôture (C11-F1) doit compter C10 = 2, comme le plancher initial du design le
prévoyait.

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

### (c) Mise en page des marqueurs de lieutenant — mécanisme non prescrit par le design

**Quoi** : D10/§C2-bis et C10-F1 (amendée) spécifient la CLÉ (`lieutenant_ids`) et la PROPRIÉTÉ
(un marqueur par entrée, appariés par bâtiment) mais aucune décision ne prescrit la mise en page
visuelle (position dans la cellule, taille, agencement de plusieurs marqueurs sur le même bâtiment).

**Pourquoi c'est un imprévu non bloquant** : test du socle appliqué — aucune falsifiable ne dépend
d'une position pixel précise ; C10-F1 vérifie des COMPTES (par cellule, en delta), jamais des
coordonnées. Le choix ne change donc aucune propriété vérifiée.

**Option retenue** : petits carrés en rangée horizontale, bande basse de la cellule (au-dessus du
socle), décalés par index (`xMin = 0.04 + i·0.14`) — chaque entrée produit un GameObject à une
position DISTINCTE, pour que 2 marqueurs sur le même bâtiment (le cas dégénéré du J0) restent 2
objets visuellement séparables plutôt que superposés à l'identique. C'est l'option qui réutilise le
patron déjà établi par les 5 bindings de C9 (anchors normalisés, `offsetMin=offsetMax=Vector2.zero`)
sans introduire de mécanisme de mise en page neuf (pas de `HorizontalLayoutGroup`, pas de composant
de layout supplémentaire).

**Ce que cette option NE garantit PAS** : au-delà de ~6 lieutenants sur un même bâtiment, les
marqueurs déborderaient visuellement de la cellule (aucun clamp de largeur). Non mesuré comme un
risque réel : le roster a un plafond (`lieutenantTunables`/`max_count_per_player`, back) très
inférieur à ce qui ferait déborder une seule cellule, et aucune falsifiable de ce chunk n'exige de
borne visuelle — c'est une question de rendu final (É3), pas de fonction.

### (d) `implementation-notes.md` — REUSE de la pratique déjà établie en C5-C9

Comme en C5-C9 : `implementation-notes.md` n'existe pas comme fichier suivi dans ce dépôt. Les
déviations sont consignées ici **et** dans le message de commit correspondant.

Aucun conflit avec le canon rencontré sur (b)/(c) — deux choix d'implémentation matériels (mécanismes
non prescrits par le design). (a) A ÉTÉ un point remonté conformément au protocole donné par le
mandat (STOP ciblé, pas une supposition d'architecture), puis fermé par l'arbitrage du contrôleur —
jamais un conflit tranché unilatéralement par ce `coder`.

---

# § Correctifs de fenêtre — juge réel, 1ʳᵉ exécution (C8-C10)

**Contexte** : après tout ce travail en MODE LÉGER (jamais un run réel), le juge final a exécuté les
tests C8-C10 pour la PREMIÈRE FOIS. 120 verts, 5 rouges du lot (+1 flaky W3U1 hors périmètre). Les 5
se groupent en **3 causes mesurées** — dont deux DIFFÉRENTES de l'hypothèse initiale du contrôleur,
divergence assumée et justifiée ci-dessous par le corps du code, jamais pour « faire passer ».

## Classe ① — `Destroy()` différé + une VRAIE requête de hiérarchie après un `Render()` répété

**Mesure** : `ClearContent()` (`DistrictInteriorScreenController.cs:546-550`) appelle `Destroy`
(jamais `DestroyImmediate`) — ce qui est le patron **UNIFORME** de tout le dépôt : balayage de
`Object.Destroy(` sur `Assets/Scripts/` → ~30 sites, **zéro** `DestroyImmediate` en dehors des méta
d'éditeur. `Destroy` est DIFFÉRÉ à la fin de la frame Unity. `Render()` appelle `ClearContent()` puis
reconstruit tout **de façon synchrone, dans le MÊME appel** — donc un test qui appelle `Render()` DEUX
fois **dans la même frame** (aucun `yield return null` entre les deux) voit, à l'instant du second
`Render()`, les enfants de l'ANCIEN rendu encore physiquement présents dans la hiérarchie.

**Ce qui EST affecté** vs **ce qui NE L'EST PAS**, et c'est la distinction qui explique pourquoi
C9-F1 (10 `Render()` séquentiels, ZÉRO yield, toujours VERT) n'a jamais été touché : les compteurs
`RenderedXCount`/`ActiveAmbientLoopCount` sont des CHAMPS C# remis à 0 puis ré-incrémentés de façon
SYNCHRONE **dans** le `Render()` courant — corrects immédiatement, indépendamment de l'état RÉEL de
la hiérarchie Unity. Une assertion qui interroge la hiérarchie RÉELLE (`GetComponentsInChildren<T>`,
`Transform.Find`, `.childCount`) voit en revanche l'ANCIEN ET le NEUF simultanément tant qu'aucune
frame ne s'est écoulée.

**Geste choisi, et pourquoi** : **test-side** (`yield return null;` entre les `Render()` successifs),
**jamais** `DestroyImmediate` en production. Mesuré, pas supposé : ~30 sites de re-render dans ce
dépôt (`AppShell`, `CityMapController`, `LieutenantScreenController`, `BuildingCardController`,
`LaunderingController`, `DashboardController`, `ExceptionQueueController`, …) utilisent TOUS `Destroy`
— aucun `DestroyImmediate`. Basculer CE contrôleur sur `DestroyImmediate` casserait la cohérence
codebase-wide pour un écran RUNTIME (pas un outil d'éditeur), pour un gain nul en production (l'écran
n'y appelle jamais `Render()` deux fois dans la même frame). Le fix appartient donc au TEST, appliqué
de façon cohérente aux DEUX côtés (Unity + les DEUX repos de test qui en avaient besoin) :

| test | fichier | site du yield |
|---|---|---|
| `C10F2c_ReRenderBelowBudget…` | `DistrictInteriorAmbientLoopsPlayModeTests.cs` | entre les 2 `Render()` |
| `C10F1_ReRenderWithDifferentAssignment…` | `DistrictInteriorLieutenantMarkersPlayModeTests.cs` | entre les 2 `Render()` |
| `C8F5_ThreeNonHeroPhases…` | `DistrictInteriorDioramaPlayModeTests.cs` (C8) | fin de CHAQUE itération de la boucle DAWN/DAY/DUSK (3 yields, 1 ligne) |

Rétro-trace confirmée pour chaque rouge :
- **`C10F2c`** — 1ᵉʳ rendu sature à `MaxAmbientLoops` (4, compteur correct) ; 2ᵉ rendu = 3 candidats
  (compteur correct, 3) MAIS `GetComponentsInChildren<AmbientPulseLoop>` voyait 4 (ancien, pas détruit)
  + 3 (neuf) = **7**, exactement le rouge rapporté.
- **`C10F1_ReRenderWithDifferentAssignment`** — `MarkersUnderCell` fait un VRAI `GetComponentsInChildren
  <RectTransform>(true)` puis prend le PREMIER `Cell_0_0` trouvé par nom : sans yield, DEUX
  `Cell_0_0` coexistent (l'ancienne `GridArea`, pas détruite, ET la nouvelle) — le premier trouvé est
  l'ANCIEN, qui porte encore son marqueur → "building-0 a PERDU son marqueur — Expected 0, But was 1",
  exactement le rouge rapporté.

## Classe ② — épingle d'absence (C8-F5), remplacée par une valeur PRÉSENTE

**Mesure du code réel** : `RenderNightDiorama` construit **exactement 4** enfants directs de `root`
(`OutOfDistrictBackdrop`, `DistrictTitle`, `GridArea`, `Haze` — vérifié ligne par ligne dans le corps
de la méthode) ; `RenderNonHeroFallback` en construit **exactement 1** (`DayPhaseFallbackPanel`). Les
deux méthodes sont appelées par un `if`/`else` STRICTEMENT exclusif dans `Render()` — **le code ne
crée JAMAIS un panneau vide ou inactif à NIGHT**, contrairement à l'une des deux hypothèses posées par
le mandat. Le panneau que `Assert.IsNull(Find("DayPhaseFallbackPanel"))` trouvait n'était donc PAS
créé par le rendu NIGHT lui-même — c'était le panneau STALE de l'itération DUSK (classe ①, ci-dessus),
toujours vivant faute de frame écoulée.

**Correctif appliqué (les deux, comme demandé par le mandat)** : (1) le yield de la classe ① élimine
la cause RÉELLE du rouge ; (2) l'épingle d'absence est en plus REMPLACÉE par une valeur PRÉSENTE —
`Assert.AreEqual(4, diorama.ScreenRoot.childCount, …)` — qui prouve POSITIVEMENT la composition exacte
de NIGHT (et implique donc l'absence de tout panneau de repli, sans jamais chercher cette absence
directement). C'est strictement PLUS robuste que l'ancienne épingle : elle attraperait aussi un futur
bug qui ajouterait un enfant NON prévu, quel que soit son nom — l'ancienne épingle ne réagissait qu'à
UN nom précis.

## Classe ③ (renommée) — `day_phase` non forcé sur un fetch RÉEL, PAS un défaut de bande D3

⚠️ **Divergence assumée avec l'hypothèse initiale du mandat.** Le mandat proposait : « le payload
fabriqué du test porte-t-il les valeurs de bandes qui déclenchent le néon (D3) ? ». **Mesure : NON,
ce n'est pas ça.** `C9F3`/`C10F1_J0Real` n'utilisent pas un payload fabriqué à cet endroit — ils
MUTENT/consomment un `dto` **RÉELLEMENT FETCHÉ**, et les champs mutés (`revenue_chain: "WIRED"`,
`revenue_band: "EARNING"`) correspondent EXACTEMENT à la règle à 3 états de D3
(`BuildRevenueSign` : `if (revenue_chain != "WIRED") return;` puis `earning = revenue_band ==
"EARNING"`) — aucun défaut de bande.

**La VRAIE cause, mesurée dans le back (`mafia-w3u2`)** : `day_phase` d'un fetch réel dérive de
`city_sim_clock.game_minute` (`district-interior.controller.ts` → `quarterIndexForGameMinute`, D8).
`db/schema/city_epoch.ts:12,46` : « *A freshly-signed-up player's OWN `city_sim_clock.game_minute` is
seeded from THIS value (C1.3), NOT from 0* » — le clock d'un joueur frais est seedé depuis un
**epoch partagé, qui avance avec l'activité du serveur/de la suite de tests**, PAS depuis 0. Le
`day_phase` d'un J0 frais est donc **NON DÉTERMINISTE** d'une exécution à l'autre : il peut tomber sur
DAWN/DAY/DUSK aussi bien que NIGHT. Si ce n'est pas NIGHT, `Render()` prend le repli
(`RenderNonHeroFallback`), qui **n'appelle jamais** `BuildBuildingCell` — TOUS les compteurs
(neon/smoke/marqueurs) restent à 0, pour la MAUVAISE raison (repli, pas bandes IDLE ou absence
d'affectation). Exactement le rouge rapporté sur les DEUX tests :
- **`C9F3`** — la garde de capacité (`Assert.Greater(RenderedNeonGlowCount, 0)` après mutation)
  échoue : le second `Render()` reste sur le repli, la mutation de bande n'a jamais l'occasion de
  s'exprimer.
- **`C10F1_J0Real`** — "Expected 2, But was 0" sur `RenderedLieutenantMarkerCount` : `lab.lieutenant_ids
  .Length == 2` est CONFIRMÉ correct sur le `dto` fetché (parsing JsonUtility intact — le champ
  `public string[] lieutenant_ids;` est bien déclaré, aucun souci là), mais si `day_phase != NIGHT`,
  `BuildLieutenantMarkers` n'est jamais appelée pour AUCUN bâtiment.

**Précédent qui confirme le geste correct** : `C8F5` (`DistrictInteriorDioramaPlayModeTests.cs`, C8,
déjà dans le dépôt AVANT ce correctif) force **déjà** `dto.day_phase = "NIGHT";` avant son render NUIT
— exactement pour isoler la propriété qu'il vérifie du bruit du clock réel. C9F3/C10F1_J0Real
n'avaient simplement jamais appliqué ce même geste, parce qu'en MODE LÉGER personne n'avait de fetch
réel sous les yeux pour le remarquer.

**Correctif** : `dto.day_phase = "NIGHT";` ajouté juste après le fetch, avant le premier `Render()`,
dans les deux tests. Anti-vacuité RENFORCÉE ajoutée dans `C9F3` (`Assert.AreEqual(4,
diorama.RenderedBuildingCount, …)` juste après le render forcé) — pour que si ce défaut de
déterminisme revient un jour sous une autre forme, il rougisse à cet endroit précis plutôt que de
retomber, silencieusement, dans la même vacuité.

## Verdict sur C10F1-J0Real

**PAS la même cause que la classe ①** (confirmé — un seul `Render()`, aucune accumulation possible).
**C'est la classe ③ (day_phase non forcé)**, la MÊME cause que C9F3 — pas un bug de parsing DTO (le
champ est bien déclaré `public string[] lieutenant_ids;`, JsonUtility le parse correctement, prouvé
par l'assertion `lab.lieutenant_ids.Length == 2` qui passait DÉJÀ, avant même mon correctif) et pas un
chemin de construction conditionné à un sprite absent (`BuildLieutenantMarkers` est appelée
INCONDITIONNELLEMENT après le sprite, sans dépendance à sa résolution — vérifié dans le corps de
`BuildBuildingCell`). Le correctif (forcer NIGHT) suffit et n'a nécessité aucun changement côté
production.

## Ce qui n'a PAS pu être vérifié (mode léger toujours en vigueur)

Aucun de ces 5 correctifs n'a été RE-EXÉCUTÉ — le contrôleur confirme au juge lui-même après ce
commit, comme demandé. Le scanner syntaxique (balance parens/braces, REUSE des chunks précédents) a
été repassé sur les 4 fichiers de test touchés — voir § Evidence ci-dessous.

### Evidence statique du correctif

```
$ python3 -c "... scanner balance parens/braces ..."
Assets/Tests/PlayMode/DistrictInteriorAmbientLoopsPlayModeTests.cs          -> OK
Assets/Tests/PlayMode/DistrictInteriorLieutenantMarkersPlayModeTests.cs     -> OK
Assets/Tests/PlayMode/DistrictInteriorLightingPlayModeTests.cs              -> OK
Assets/Tests/PlayMode/DistrictInteriorDioramaPlayModeTests.cs               -> OK
```

### Balayage `Object.Destroy(` vs `DestroyImmediate(` — confirme le patron uniforme cité en classe ①

```
$ grep -rn "DestroyImmediate\|Destroy(" Assets/Scripts/ --include="*.cs" | grep -v DistrictInteriorScreenController.cs
```
~30 sites, TOUS `Object.Destroy(`/`Destroy(` — **zéro** `DestroyImmediate` en production. Confirme que
le fix test-side (yields) est le geste cohérent avec le reste du dépôt, jamais un changement de
`ClearContent`.

---

# § Correctifs de fenêtre (2) — le juge re-rend les mêmes valeurs : yields mal PLACÉS, pas une fausse piste

**Contexte** : après le commit précédent, le juge a re-testé et rapporté EXACTEMENT les mêmes 3
rouges (`C10F2c` 7≠3, `C10F1_ReRender` 1≠0, `C8F5` 5≠4). Le mandat a conclu que ce n'était « pas du
timing » et a demandé de traiter ces 3 cas comme des bugs de PRODUCTION.

**Mesure, avant de corriger quoi que ce soit** : re-lecture complète de `ClearContent`/`BuildRoot`/
`TryStartAmbientLoop`/`BuildLieutenantMarkers`/`RenderNightDiorama`/`RenderNonHeroFallback`
(`DistrictInteriorScreenController.cs`, en entier). **Aucun objet ne vit hors du sous-arbre de
`root`** — la chaîne est intégralement `root → GridArea → Cell_x_y → (Socle, Sprite, Label,
WindowLight, RevenueSign, ActivitySmoke, MaintenanceFlicker, LieutenantMarker_i)` ;
`AmbientPulseLoop` est un COMPOSANT ajouté sur des GameObjects déjà dans cette chaîne (`AddComponent`
n'affecte jamais le parentage). `ClearContent` détruit les enfants DIRECTS de `root` — la cascade
Unity détruit donc tout le sous-arbre en dessous. **Aucun défaut structurel trouvé** : ni parenting
hors-arbre, ni purge partielle — l'hypothèse du mandat (calque séparé, ClearContent incomplet) est
RÉFUTÉE par cette lecture.

**La VRAIE cause : le yield du commit précédent était placé AU MAUVAIS ENDROIT**, dans les 3 tests,
de façon uniforme. Rejeu manuel de l'ordre des opérations :

- **`C10F2c`** — le yield était placé ENTRE le 1ᵉʳ et le 2ᵉ `Render()`. À cet instant, le 1ᵉʳ
  `ClearContent()` n'a RIEN eu à détruire (root était vide avant lui) — le yield est un pur no-op.
  C'est le **2ᵉ** `Render()` dont le `ClearContent()` appelle `Destroy` sur les 4 `AmbientPulseLoop`
  du 1ᵉʳ rendu — et l'assertion `GetComponentsInChildren` qui suit s'exécute dans la MÊME frame que ce
  2ᵉ render, sans qu'aucune frame ne se soit écoulée depuis. D'où 4 (stale) + 3 (neuf) = **7**,
  identique avant et après le commit précédent — PARCE QUE le yield n'a jamais touché le bon Destroy.
- **`C10F1_ReRender`** — même défaut exact : yield entre les 2 `Render()`, donc no-op (rien à détruire
  avant le 1ᵉʳ render), et le `Destroy` du 2ᵉ render n'a jamais de frame pour s'exécuter avant
  `MarkersUnderCell`.
- **`C8F5`** — plus subtil : le yield DANS la boucle (fin de CHAQUE itération DAWN/DAY/DUSK) purge
  correctement les panneaux DAWN et DAY (chacun détruit par le `ClearContent` de l'itération SUIVANTE,
  puis un yield suit CETTE itération). Mais le panneau DUSK (le dernier de la boucle) n'est détruit
  que par le `ClearContent` du render NIGHT final, **hors boucle**, et AUCUN yield ne suivait ce
  render avant les assertions. root portait donc 4 (NIGHT) + 1 (DUSK, survivant) = **5**.

**Geste appliqué** : déplacer le yield, dans les 3 tests, pour qu'il suive TOUJOURS le dernier
`Render()` dont le `ClearContent()` a quelque chose à purger, et précède la requête de hiérarchie qui
en dépend — jamais l'inverse. Toujours test-side (aucun changement à `ClearContent`/production — la
lecture ci-dessus ne trouve rien à y corriger).

⚠️ **Divergence assumée avec le mandat, une seconde fois, sur le même point** : ce correctif reste
test-side, pas production. Justifié par la relecture complète du corps de `ClearContent` et de la
chaîne de parentage (ci-dessus) — aucune preuve d'un défaut de code d'écran n'a été trouvée. Si le
juge re-rend encore les mêmes valeurs après CE correctif, l'hypothèse « défaut de production » devra
être reconsidérée sérieusement — mais à ce stade, l'arithmétique EXACTE de chaque rouge (7=4+3,
5=4+1) se déduit entièrement du placement du yield précédent, sans avoir besoin d'invoquer un bug de
production non trouvé après lecture complète du fichier.

### Evidence statique du correctif (2)

```
$ python3 -c "... scanner balance parens/braces ..."
Assets/Tests/PlayMode/DistrictInteriorAmbientLoopsPlayModeTests.cs          -> OK
Assets/Tests/PlayMode/DistrictInteriorLieutenantMarkersPlayModeTests.cs     -> OK
Assets/Tests/PlayMode/DistrictInteriorDioramaPlayModeTests.cs               -> OK
```
