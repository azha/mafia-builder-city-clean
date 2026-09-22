# TD-576 — la cause d'Ecran9, et la classe par lecture des TearDown de la partie 1 (2026-09-22, statique, sans porte)

## La cause — mesurée sur les deux journaux, sans rejeu
Ecran9 n'avait pas de voisin fautif dans une AUTRE classe : l'orphelin naît dans **sa propre classe**, au test qui court juste avant lui.
- `MonterFileAvecCartes` écrivait le champ `controllerGo`. `Ecran10_LesRolesDeLaMainViennentDeLaDonnee` l'appelle **deux fois** (« riche »,
  puis « pauvre ») : le `[TearDown]` — pourtant en `DestroyImmediate` — ne détruisait que le second. Le premier survivait au test.
- Ce survivant avait un `LoadQueue` EN VOL : `ctl.LastDetail.Back()` → `onBack` → `StartCoroutine(LoadQueue())`, avec `Token=VIDE`
  (la file de ces tests n'est jamais authentifiée : `[DIAG-OPEN] … Token=VIDE`). Sa réponse est un 401, journalisé en erreur
  (`ExceptionQueueController.cs:183`), suivi d'un `NullReferenceException` dans `RenderError`.
- **Où tombe le 401, c'est la latence qui le décide** :
  - `rejeu-p1.log` :50335 — PENDANT Ecran10 (RUN :50200, PASSED :50408), qui porte `ignoreFailingMessages` ⇒ vert ;
  - `gate-p1.log` :49932 — APRÈS Ecran10 (PASSED), au tout début d'Ecran9 (RUN juste avant, aucune ligne d'Ecran9 entre les deux :
    ni `DemoIdentityResolver`, ni `DIAG-OPEN`), avant que son `MonterFileAvecCartes` ne pose `ignoreFailingMessages` ⇒ **FAIL :49951**.
  Même ordre d'exécution dans les deux runs (…, C, Ecran10, Ecran9, …). *Le vert du rejeu est une course gagnée, pas un correctif.*
- Attribution par élimination : le second contrôleur (« pauvre ») est détruit en IMMÉDIAT, ce qui arrête ses coroutines ; il n'a pas
  appelé `Back()`. Le seul `ExceptionQueueController` vivant avec une requête SANS jeton en vol est « riche ».
- Même forme, silencieuse, dans `C_DashboardSurfaces_…` : `dash.OpenExceptions()` monte un hôte `Nav_Exceptions` (repli sans shell,
  à la racine) que personne ne démonte. Authentifié, il ne rend pas de 401 — mais il vit tout le reste du run.

## Le correctif (`ExceptionQueuePlayModeTests.cs`) — état de sortie déterministe
- Tout ce qu'un test monte est INSCRIT (`montes`) ; `MonterFileAvecCartes` n'écrase plus rien.
- `[TearDown]` : pour CHAQUE montage, l'hôte de navigation (file ou tableau de bord) puis l'hôte, en `DestroyImmediate`.
- **Garde de sortie** : en fin de `[TearDown]`, zéro `ExceptionQueueController` / `ExceptionDetailController` / `DashboardController`
  né pendant le test (relevé au `[SetUp]` : un résidu d'une autre classe n'accuse pas celle-ci). Rouge ⇒ c'est le test FAUTIF qui est
  nommé, plus la victime.
- Contrôle positif : `LaGardeDeSortie_NommeUnLocataireOrphelin` (hôte INACTIF, aucune requête) — la garde nomme un contrôleur monté hors
  de `montes`, et plus rien une fois détruit. EcranExceptions 19 → 20 ; partie 1 435 → 436 ; filtre 493 → 494.
- Pas de rejeu ce soir : il ira dans la prochaine partie 1 (Ecran9 ET la garde sur les 20 tests de la classe).

## La classe, par lecture des TearDown de la partie 1 dans l'ordre d'exécution (`gate-p1.log`, 86 classes)
Outil : `orphelins-par-teardown.py <classes dans l'ordre>` — heuristique qui CLASSE, ne tranche pas ; chaque ligne signalée a été lue.
Mesuré AVANT le correctif (arbre 159f7398) ; APRÈS, la ligne `ExceptionQueuePlayModeTests` passe à « rien » — l'outil voit la correction.
⚠️ Il rate l'hôte de nav de `C` (le TearDown mentionnait `LastNav…` pour la file) : trouvé à la lecture, pas par l'outil.

**Écrasement d'un champ par un second montage dans le même test** (4 signalés) :
- `ChaineDApproScreenPlayModeTests` (rang 37) : **même forme, SILENCIEUSE** — `EcranApproS1_…` appelle `MonterEcran()` deux fois (`hostGo` écrasé) ; le contrôleur charge par le réseau (`Charger()`), mais n'écrit AUCUN `LogError` : son orphelin ne peut pas accuser un voisin. Et le TearDown détruit `hostGo` en DIFFÉRÉ. Même correctif applicable — non fait ici, signalé.
- `ExceptionQueuePlayModeTests` (rang 39) : **LA CAUSE** — corrigée ci-dessus.
- `AccueilPanneauxGeometriePhotoPlayModeTests` (rang 49) : faux positif : les deux montages sont LOCAUX à une aide qui les détruit elle-même ; le TearDown attend une frame (`yield return null`) après son `Destroy`, et le SetUp balaie les résidus.
- `AppShellPlayModeTests` (rang 51) : voulu : `StaleAbandonedShell_…` abandonne un shell EXPRÈS pour prouver qu'il ne fuit pas ; mais son TearDown détruit en différé (voir plus bas).

**`Object.Destroy` DIFFÉRÉ au TearDown, sans frame d'attente** (16 classes, hors les écrasements) — la forme du 03/09
(`lister-destructions-differees.py`). Aucune n'a produit le 401 d'Ecran9 : `gate-p1.log` ne porte qu'UN journal « [ExceptionQueue] load failed »
(:49932, l'orphelin d'Ecran10 — la seconde occurrence du texte est la ligne FAIL :49951 qui le cite) ; `rejeu-p1.log` en porte deux (:50335, le même orphelin ; :50675, le `Back()` d'Ecran9 dans Ecran9). Elles restent des sursis partagés : shells (`shellGo` + `ShellCanvas`), dioramas de quartier
(`bareHostGo`), `AutonomyInbox` (`controllerGo` + `LastNavGameObject`). Rang dans l'ordre d'exécution :
- 2 `FicheTeteGeometriePlayModeTests`
- 3 `VuePrincipaleCapturePlayModeTests`
- 5 `CarteIconesPlayModeTests`
- 13 `DistrictBackgroundPlayModeTests`
- 14 `DistrictBlocPartagePlayModeTests`
- 15 `DistrictInteriorAmbientLoopsPlayModeTests`
- 17 `DistrictInteriorDioramaPlayModeTests`
- 18 `DistrictInteriorLieutenantMarkersPlayModeTests`
- 19 `DistrictInteriorLightingPlayModeTests`
- 21 `DistrictMapNavigationPlayModeTests`
- 22 `DistrictSocleFootprintPlayModeTests`
- 34 `AutonomyInboxPlayModeTests`
- 63 `HudPlayModeTests`
- 70 `NavigationPlayModeTests`
- 72 `RedimensionnementSondeSeamPlayModeTests`
- 74 `ShellSurimpressionAcquisitionPlayModeTests`

**Rien de signalé** : 66 classes.

## La ligne pour TD-576 (le registre est `front.md` du back, que ce rôle ne peut pas écrire — à reporter par l'orchestrateur)
> 22/09 — **cause d'Ecran9 nommée, dans sa PROPRE classe** : `MonterFileAvecCartes` écrasait `controllerGo`, Ecran10 monte deux files, la
> première survivait avec un `LoadQueue` sans jeton (lancé par `Back()`) ; son 401 tombe pendant Ecran10 au rejeu (:50335, ignoré) et au début
> d'Ecran9 au gate p1 (:49932 → FAIL :49951). Correctif : montages inscrits, `DestroyImmediate` de chacun et de son hôte de nav, garde de
> sortie (0 locataire né pendant le test) + contrôle positif. Classe lue sur les 86 classes de la partie 1 : 1 autre écrasement (ChaineDAppro
> S1, silencieux), 16 TearDown en `Destroy` différé sans attente. Rejeu : prochaine partie 1.
