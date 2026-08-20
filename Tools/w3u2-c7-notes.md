# W3.U2 / C7 — DTO, client HTTP, et le seam de jeton — notes d'implémentation

Design : `docs/superpowers/plans/2026-08-17-w3u2-district-nuit-design.md` (repo `mafia-w3u2`), chunk C7
(§3, lignes 1444-1462), livrables **U-7** (DTO + client HTTP), **U-8** (DTO maintenance, D7), **U-14**
(le seam de jeton, D9). Design APPROVED après 7 revues ⊥ — exécuté tel quel, aucune décision de
conception rouverte ici.

⛔⛔ **MODE LÉGER** (ruling contrôleur, reconduit sur ce chunk) : aucun run Unity (batchmode compris),
aucune stack Docker, aucun `Tools/run-unity-check.sh` n'a été exécuté pour ce chunk. Tout ce qui suit
est une mesure **statique** (lecture de fichiers, oracles Python indépendants reproduisant fidèlement
la logique C#/le contrat back) — jamais une exécution PlayMode.

## Ce qui a été livré

- **U-7 — DTO + client** (`Assets/Scripts/CityMap/CityProjectionDtos.cs` +
  `Assets/Scripts/CityMap/CityProjectionsClient.cs`) : `DistrictInteriorDto`/`DistrictInteriorGridDto`/
  `DistrictInteriorBlockDto`/`DistrictInteriorBuildingDto` + `CityProjectionsClient.Interior(...)`.
  **REUSE du client existant** (pas un nouveau fichier dupliquant le `UnityWebRequest` boilerplate) :
  `Interior` appelle le MÊME helper `Get`/`D(id, leaf)` que `Flow`/`Throughput`/`Cohesion`/etc. — DRY,
  patron déjà établi par ce fichier pour toute route `city/district/:id/<leaf>`.
- **U-14 — le seam de jeton** (`Assets/Scripts/CityMap/DistrictInteriorScreenController.cs`, `.meta`) :
  `SetSession(bearer, districtId)` — injection, **aucun** appel `AuthClient.SignIn`/`SignUp`, **aucun**
  identifiant sérialisé. Vit dans l'asmdef `CityMap` (comme C8 le prescrit pour l'écran complet — cette
  classe deviendra le diorama, C8 lui ajoutera `IShellTenant`+`BuildLayout` au chunk suivant). Ce chunk
  livre UNIQUEMENT le point d'entrée data ; la construction visuelle (grille/socle/brume/sol, U-9) reste
  hors périmètre — voir § Deviations pour ce choix architectural.
- **U-8 — DTO maintenance** (`Assets/Scripts/Operational/BuildingCard/BuildingCardDtos.cs`) : 3 champs
  ajoutés à `BuildingCardDto` (`lapse_phase_bucket`/`days_until_maintenance_due`/
  `maintenance_in_progress`) — D7 : le serveur les envoie depuis 04f-A, `JsonUtility` les ignorait EN
  SILENCE faute de déclaration. **Livré en DEUX commits séparés** (voir § C7-F2 ci-dessous) : le test
  d'abord (ROUGE attendu), le correctif ensuite.
- **Tests** (`Assets/Tests/PlayMode/`, tous `[Category("W3U2")]`) :
  - `DistrictInteriorClientPlayModeTests.cs` — C7-F1.
  - `DistrictInteriorScreenControllerPlayModeTests.cs` — C7-F3 (+ un smoke fonctionnel de l'injection).
  - `BuildingCardMaintenanceKeysPlayModeTests.cs` — C7-F2.

## Falsifiables — statut

| # | quoi | statut |
|---|---|---|
| C7-F1 | le client parse une vraie réponse, rend grille+bâtiments, ground truth + jointure | ÉCRITE, différée |
| C7-F2 | les 3 clés de maintenance sont parsées — ROUGE avant correctif, VERT après | ÉCRITE, séquence commit prouvée par la source (ci-dessous) |
| C7-F3 | zéro appel signin dans le fichier du diorama, contrôle positif 8 sites | ÉCRITE + oracle Python exécuté (ci-dessous) |

## Evidence statique (obtenue SANS Unity — oracles indépendants)

pwd = `/home/erutheone/project/mafia-builder-city-clean`

### C7-F1 — parité champ-pour-champ contre le contrat back (oracle Python)

```
$ python3 -c "... regex sur DistrictInteriorBuildingDto/DistrictInteriorDto dans CityProjectionDtos.cs ..."
DistrictInteriorBuildingDto fields: ['building', 'block_id', 'operational_type', 'conversion_band',
  'shell_state', 'condition_band', 'revenue_band', 'revenue_chain', 'activity_band',
  'lapse_phase_bucket', 'maintenance_in_progress']
match backend DistrictInteriorBuildingResponse (9 content + 2 binding5): True
DistrictInteriorDto fields: ['district', 'district_id', 'profile', 'name_canonical', 'bank_side',
  'grid', 'blocks', 'day_phase', 'buildings']
match backend DistrictInteriorResponse: True
```
Comparé champ-pour-champ, dans le même ordre, contre `DistrictInteriorResponse`/
`DistrictInteriorBuildingResponse` (`district-interior.controller.ts:54-70`, repo `mafia-w3u2`) — lu
directement dans le corps du contrôleur, jamais recopié d'une note d'un chunk précédent. **Correction
en cours de route** : la première version du commentaire de `CityProjectionDtos.cs` citait
`days_until_maintenance_due` comme faisant partie de CE payload — faux, ce champ n'existe que sur la
route building-card séparée (binding 5 de `district-interior` ne porte QUE 2 des 3 clés de
maintenance) ; corrigé avant le premier commit du chunk.

### C7-F3 — balayage `.SignIn(` (oracle Python, REPRODUIT le test C# avant tout commit)

```
$ python3 -c "... os.walk('Assets/Scripts'), count('.SignIn(') ..."
total .cs files under Assets/Scripts: 50
.SignIn( hits: 8
   Assets/Scripts/Operational/BuildingCard/BuildingCardController.cs
   Assets/Scripts/Operational/Exceptions/ExceptionQueueController.cs
   Assets/Scripts/Operational/Laundering/LaunderingController.cs
   Assets/Scripts/Operational/Laundering/PipelineOverviewController.cs
   Assets/Scripts/Operational/Autonomy/AutonomyInboxController.cs
   Assets/Scripts/Operational/Lieutenant/LieutenantScreenController.cs
   Assets/Scripts/Operational/Dashboard/DashboardController.cs
   Assets/Scripts/CityMap/CityMapController.cs
diorama contains .SignIn(: False
```
Les 8 hits **coïncident exactement** avec la table mesurée par D9 (« Deux patrons coexistent… n=8 »,
design lignes 883-885) — même 8 fichiers, même ordre de découverte. `.SignIn(` est un motif **exact**
(pas d'alternance `|`, pas de troncature d'affichage — mesuré via un `python3 -c` direct, jamais un
grep nu en tête de pipe, conformément au piège de mesure du socle). Aucun champ `password`/
`identifier`/`callsign` trouvé sur `DistrictInteriorScreenController` par une extraction regex des
membres (candidats : `projections`, `initialized` — aucun suspect).

### C7-F2 — la séquence ROUGE→VERT, prouvée par mesure directe de la source (pas par exécution)

Avant le correctif (commit `1605f25`, test seul) :
```
$ python3 -c "... 'lapse_phase_bucket' in BuildingCardDto body ..."
lapse_phase_bucket -> declared: False
days_until_maintenance_due -> declared: False
maintenance_in_progress -> declared: False
```
Après le correctif (commit `86b7567`) :
```
lapse_phase_bucket -> declared: True
days_until_maintenance_due -> declared: True
maintenance_in_progress -> declared: True
```
Le test lit ces 3 champs par **réflexion** (`Type.GetField`, jamais `dto.lapse_phase_bucket` en dur) —
c'est ce qui permet au FICHIER DE TEST de **compiler dans les deux états** : avant le correctif,
`GetField(...)` rend `null` et le premier `Assert.IsNotNull` de la méthode de test rougirait à
l'exécution ; après, le champ existe et sa valeur est comparée à la valeur EXTRAITE du JSON brut
(jamais une comparaison "non-null" qui confondrait une vraie valeur et un défaut C#).

### Balance syntaxique — scanner string/commentaire-aware (tous les fichiers .cs neufs/modifiés)

```
$ python3 -c "... scanner qui suit l'état chaîne/char/commentaire, jamais un simple count('(')/count(')') ..."
CityProjectionDtos.cs                              -> parens 0/0 min 0 | braces 0/0 -> OK
CityProjectionsClient.cs                           -> parens 0/0 min 0 | braces 0/0 -> OK
DistrictInteriorScreenController.cs                -> parens 0/0 min 0 | braces 0/0 -> OK
DistrictInteriorClientPlayModeTests.cs              -> parens 0/0 min 0 | braces 0/0 -> OK
DistrictInteriorScreenControllerPlayModeTests.cs   -> parens 0/0 min 0 | braces 0/0 -> OK
BuildingCardMaintenanceKeysPlayModeTests.cs        -> parens 0/0 min 0 | braces 0/0 -> OK
BuildingCardDtos.cs (après correctif)              -> parens 0/0 min 0 | braces 0/0 -> OK
```
⚠️ Un simple `count('(') == count(')')` NU rend un faux mismatch sur 2 des fichiers (`.SignIn(` cité
comme littéral de chaîne dans C7-F3 contient une parenthèse ouvrante sans fermante DANS la chaîne) —
le scanner ci-dessus suit l'état chaîne/commentaire pour ne compter QUE les parenthèses de code réel,
et confirme un vrai équilibre sur les deux. **Aucun compilateur C# réel n'a tourné** — ce contrôle
prouve l'absence d'un déséquilibre structurel grossier, pas l'absence de toute faute de syntaxe fine
(un point-virgule oublié, une accolade au mauvais endroit) ni de faute sémantique (type incompatible,
symbole introuvable) : seul un vrai `Refresh`/compile Unity le confirmerait — voir § RUNS DIFFÉRÉS.

## RUNS DIFFÉRÉS (à la fenêtre de runs groupée du contrôleur)

1. **Compilation Unity réelle** — aucune erreur de compilation n'a pu être confirmée par le compilateur
   réel ; vérifiée seulement par relecture manuelle ligne à ligne + le scanner syntaxique ci-dessus.
   Risque résiduel identique à celui déjà consigné en C5/C6 : une faute de syntaxe/sémantique C# fine
   ne serait détectée qu'au premier `Refresh`/compile réel.
2. **La séquence ROUGE→VERT de C7-F2, VUE par un run réel** — le rouge/vert ci-dessus est prouvé par
   mesure DIRECTE de la source (le champ existe ou non dans `BuildingCardDtos.cs` à chaque commit),
   PAS par l'exécution du test. Ordre de rejeu exact à la fenêtre groupée :
   ```
   git checkout 1605f25   # le commit qui introduit BuildingCardMaintenanceKeysPlayModeTests.cs SEUL
   LOG_FILE=... ./Tools/run-unity-check.sh -executeMethod MafiaCI.RunPlayModeTests
   # attendu : ROUGE sur C7F2_MaintenanceKeys_ParsedFromRealResponse_TypedValueEqualsWireValue,
   # au premier Assert.IsNotNull(lapseField, ...) — "BuildingCardDto doit déclarer 'lapse_phase_bucket'"
   git checkout <tip du lot>   # après 86b7567 (le correctif)
   LOG_FILE=... ./Tools/run-unity-check.sh -executeMethod MafiaCI.RunPlayModeTests
   # attendu : VERT
   git checkout lot/w3.u2   # revenir sur la branche de travail
   ```
   ⚠️ L'attribution reste possible SEULEMENT si ce rejeu est fait dans cet ordre — un checkout direct
   du tip sans passer par `1605f25` ne verrait jamais le rouge, et la propriété ne serait démontrée que
   par la mesure de source ci-dessus (moins forte qu'un run réel, mais consignée honnêtement comme
   telle).
3. **Le juge lui-même** — `LOG_FILE=... ./Tools/run-unity-check.sh -executeMethod
   MafiaCI.RunPlayModeTests` sur l'arbre complet (catégorie `W3U2` incluse depuis C4). Attendu :
   `passed >= <baseline C6> + 5` — compte exact des cas neufs de ce chunk :
   `DistrictInteriorClientPlayModeTests` = 1 `UnityTest` ;
   `DistrictInteriorScreenControllerPlayModeTests` = 2 `Test` + 1 `UnityTest` = 3 ;
   `BuildingCardMaintenanceKeysPlayModeTests` = 1 `UnityTest`. Total 5 cas neufs, `failed == 0`.
4. **Les 3 tests réseau réels** (C7-F1, C7-F3 smoke, C7-F2) dépendent tous d'un backend `lot/w3.u2`
   démarré (Traefik @ `http://localhost`) — jamais vérifié cette session (mode léger). Le contrat
   consommé (routes, noms de champs, `VERGE_A_DISTRICT_ID=16`, table `buildings`/`building_operational_state`)
   a été lu directement dans le CORPS des fichiers back (`district-interior.controller.ts`,
   `real-estate.projection.service.ts`, `city_state.ts`, `operational_chain.ts`,
   `onboarding-grant.service.ts`), jamais recopié d'une note de chunk précédent sans re-vérification.
5. **Les 4 `.meta` neufs** — écrits à la main, forme minimale 2 lignes (`fileFormatVersion: 2` +
   `guid:`), suivant EXACTEMENT le format des `.meta` voisins vérifiés octet à octet en C5/C6. GUID
   générés par `uuid.uuid4().hex`, vérifiés SANS collision contre l'arbre versionné entier
   (`git grep -l <guid>` négatif pour les 4). Unity doit néanmoins confirmer l'import à la fenêtre.

## Deviations

### (a) `SetSession` retourne `IEnumerator`, pas `void`

**Quoi** : le design (D9, C7-F3) nomme la méthode `SetSession(bearer, districtId)` sans préciser son
type de retour. Les 4 précédents cités par D9 se partagent en deux formes : `LoadReview`/`FetchHeat`
retournent `IEnumerator` (ils effectuent RÉELLEMENT un fetch HTTP) ; `SetPayload`/`SetQueue` sont
`void` (ils REÇOIVENT une donnée déjà obtenue par quelqu'un d'autre — aucun fetch interne).

**Pourquoi c'est un imprévu non bloquant** : test du socle appliqué — la propriété que C7-F3 vérifie
(zéro signin, injection du porteur) est **indépendante** du type de retour ; aucune falsifiable ne
dépend de `SetSession` étant `void` vs `IEnumerator`.

**Option retenue** : `IEnumerator`, alignée sur le sous-groupe de précédents qui font RÉELLEMENT ce que
`SetSession` doit faire ici (il n'existe personne d'autre pour avoir déjà fetché `district-interior` —
contrairement à `SetPayload`/`SetQueue` qui reçoivent une donnée composée en amont par `session/open`).
Permet aussi au test d'écrire `yield return diorama.SetSession(token, id);` et d'être certain que le
fetch est TERMINÉ juste après — sans `WaitUntil`/polling, sans précédent dans ce dépôt pour cette forme.

### (b) La construction visuelle (U-9) N'EST PAS commencée dans ce chunk

**Quoi** : `DistrictInteriorScreenController` n'implémente PAS `IShellTenant`, n'a pas de `BuildLayout`,
ne construit aucune UI. Le design assigne explicitement U-9 (« l'écran — grille, socle, brume, bords,
sol ») et l'ajout d'`IShellTenant` à **C8**, jamais à C7 (§3.0 : `C7 | U-7, U-8, U-14 | 3` — pas de U-9
dans C7 ; C8 : « Locataire IShellTenant (SetMountParent avant Start()) »).

**Pourquoi c'est un imprévu non bloquant** : le graphe de dépendance (§3.0) place explicitement
`C7 ──> C8`, et la classe créée ici (`DistrictInteriorScreenController`) est nommée pour être ÉTENDUE
par C8 (même fichier, mêmes conventions `EnsureInitialized`/`[Header("Backend")]` que les 4 précédents
W3.U1). Aucune falsifiable C7 ne porte sur le rendu visuel — C8-F1..F5 le font, hors périmètre ici.

**Option retenue** : la classe la plus étroite qui satisfait C7-F1/F2/F3 — un MonoBehaviour avec
`SetSession` + état de fetch, rien de plus. C8 ajoutera `IShellTenant`/`BuildLayout` à la MÊME classe
sans qu'aucune propriété de ce chunk n'ait besoin d'être défaite.

### (c) `BuildingCardMaintenanceKeysPlayModeTests` lit les 3 champs par réflexion, jamais un accès direct

**Quoi** : le design (C7-F2) exige que l'assertion soit VUE rouge avant l'ajout des 3 champs — mais un
accès direct (`dto.lapse_phase_bucket`) est une ERREUR DE COMPILATION tant que le champ n'existe pas
sur `BuildingCardDto`, pas un échec silencieux à l'exécution. Compiler le test AVANT le correctif était
donc impossible avec un accès direct.

**Pourquoi c'est un imprévu non bloquant** : le socle demande l'option qui change le moins de surface
et documente le choix — la réflexion (`Type.GetField`) est EXACTEMENT le mécanisme qui reproduit, côté
test, la même propriété que celle que `JsonUtility` exploite côté production (une classe C# dont le
jeu de champs déclarés détermine ce qui est parsé) — donc le test PROUVE la même chose qu'un accès
direct aurait prouvé, sans exiger que le fichier de test soit lui-même réécrit entre les deux commits.

**Option retenue** : `Type.GetField(...)` + comparaison de VALEUR (jamais juste `IsNotNull` sur la
valeur elle-même, qui confondrait un défaut C# `0`/`false`/`""` avec une vraie valeur reçue) contre la
valeur EXTRAITE par regex du JSON brut — ground truth indépendante de tout DTO.

### (d) `days_until_maintenance_due` typé comme `int`, pas comme une bande qualitative

**Quoi** : R2.2 interdit en général les scalaires bruts côté projection joueur. `days_until_maintenance_
due` est un entier signé, pas une bande.

**Pourquoi ce n'est PAS une violation R2.2** : le commentaire serveur (`real-estate.projection.
service.ts:232-234`, lu directement dans le corps) le déclare explicitement : « the ONLY numeric
maintenance signal exposed (R2.2 — the raw output multiplier / failure probability / heat additive
NEVER escape) ». C'est une exception nommée et documentée côté back, pas une improvisation côté client
— le DTO se contente de typer fidèlement ce que le contrat expose déjà.

### (e) `implementation-notes.md` — REUSE de la pratique déjà établie en C5/C6

Comme en C5/C6 (`Tools/w3u2-c5-notes.md`/`w3u2-c6-notes.md` § Deviations) : `implementation-notes.md`
n'existe pas comme fichier suivi dans ce dépôt. Les déviations sont consignées ici **et** dans les
messages de commit correspondants, pour être trouvables des deux façons.

Aucun conflit avec le canon rencontré — les 6 points ci-dessus sont des choix d'implémentation
matériels (mécanisme non prescrit par le design, ou option la moins coûteuse conforme à la lettre du
design), jamais des désaccords avec la spec.
