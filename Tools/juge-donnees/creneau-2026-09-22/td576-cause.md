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
Outil : `orphelins-par-teardown.py p1-classes-ordre.txt` — heuristique qui CLASSE, ne tranche pas ; chaque ligne signalée est LUE.
⛔ **Version 3.** La v1 comptait les COMMENTAIRES : « `MonterEcran()` seul », écrit dans un commentaire, a fait signaler ChaineDAppro S1
comme un second montage — annoncé à l'orchestrateur comme « même forme, silencieuse » AVANT relecture du corps, puis corrigé : chaque test de
ChaineDAppro appelle `MonterEcran()` UNE fois. La v2 retirait les commentaires mais prenait tout local TYPÉ (`GameObject host = new …`)
pour un champ, et ratait les TearDown qui ne nomment pas leur type. La v3 : commentaires retirés (chaînes préservées), champ = déclaration
de classe, `Destroy(` différé = sans `yield return` après lui, émetteur lu sur la classe (`AddComponent<…Controller|Shell|Screen>`).
*Deux faux positifs de la même famille : un instrument qui lit du texte doit savoir ce qui, dans le texte, n'est pas du code.*

**Écrasement d'un champ par un second montage** : **1** — `ExceptionQueuePlayModeTests` (rang 39), LA CAUSE, corrigée (bb47e048).
Faux positifs des v1/v2, lus : ChaineDAppro S1 (commentaire), AccueilPanneauxGeometriePhoto et AppShell `StaleAbandonedShell` (locaux d'aide
qui se détruisent eux-mêmes / abandon VOULU), VuePrincipaleCapture (locaux typés).

**Hôte de navigation non démonté** : `ExceptionQueuePlayModeTests.C` (trouvé à la LECTURE, raté par l'outil ; corrigé, bb47e048) ;
`VuePrincipaleCapture.Capture_Detail_ApresTampon_SousChrome_MUTE` — le détail est monté DANS le shell, détruit avec lui (en différé) :
classe surveillée, et ce test MUTE le compte de démo (hors gate).

**Locataire LOCAL jamais détruit** : **2, dans `VuePrincipaleCapturePlayModeTests` — NON corrigés (fichier de capture : proposition à l'orchestrateur)** :
- `Capture_FicheBatiment` : `FicheCanvas` + `FicheStandalone` (`BuildingCardController`, jeton posé) — jamais détruits ;
- `Capture_EcranExceptions` : `ExceptionsCanvas` + `ExceptionsStandalone` (`ExceptionQueueController`, jeton VALIDE) — jamais détruits.
- ⚠️ Et ils ne font pas que vivre : trois tests SUIVANTS de la même classe (ordre alphabétique de NUnit) cherchent leur racine PAR NOM —
  `Capture_EcranExceptions_FileVide_SousChrome` (:1334) et `Capture_EcranExceptions_SousChrome` (:1561) font
  `GameObject.Find("ExceptionQueueRoot")`, `Capture_FicheBatiment_SousChrome` (:1254) `GameObject.Find("BuildingCardSheet")`. Avec
  l'orphelin vivant, deux racines portent ce nom, et `Find` rend l'une OU l'autre : la garde A4 (« le contenu ne passe pas sous le dock »)
  et le compte de nœuds peuvent MESURER L'ÉCRAN AUTONOME au lieu de celui du shell. Non prouvé que ce soit arrivé (l'ordre de `Find` n'est
  pas spécifié) : c'est une garde qui PEUT certifier l'objet voisin.

**`Destroy` DIFFÉRÉ au TearDown, sans `yield return` après — CLASSE SURVEILLÉE** (43 classes ; toutes à émetteur probable). La forme
du 03/09 (`lister-destructions-differees.py`). Aucune n'a produit de rouge mesuré : non corrigées ce soir, sauf `ChaineDApproScreenPlayModeTests`
(rang 37 : contrôleur qui charge par le réseau, sans `LogError` — la forme exacte de TD-576, en silence), corrigée avec la garde de sortie.
Rang dans l'ordre d'exécution :
- 2 `FicheTeteGeometriePlayModeTests`
- 3 `VuePrincipaleCapturePlayModeTests`
- 5 `CarteIconesPlayModeTests`
- 6 `CityMapDetailPlayModeTests`
- 8 `CityMapHeatPlayModeTests`
- 9 `CityMapRenderPlayModeTests`
- 13 `DistrictBackgroundPlayModeTests`
- 14 `DistrictBlocPartagePlayModeTests`
- 15 `DistrictInteriorAmbientLoopsPlayModeTests`
- 17 `DistrictInteriorDioramaPlayModeTests`
- 18 `DistrictInteriorLieutenantMarkersPlayModeTests`
- 19 `DistrictInteriorLightingPlayModeTests`
- 20 `DistrictInteriorScreenControllerPlayModeTests`
- 21 `DistrictMapNavigationPlayModeTests`
- 22 `DistrictSocleFootprintPlayModeTests`
- 25 `FicheBlanchimentPlayModeTests`
- 26 `FicheCollectePlayModeTests`
- 29 `InspectionScreenPlayModeTests`
- 32 `IconesArchetypePlayModeTests`
- 33 `ChassisVenteRectPlayModeTests`
- 34 `AutonomyInboxPlayModeTests`
- 36 `BundleReelZeroRepliPlayModeTests`
- 37 `ChaineDApproScreenPlayModeTests`
- 38 `ConflitScreenPlayModeTests`
- 40 `ForensicScreenPlayModeTests`
- 42 `LieutenantRuleEditorPlayModeTests`
- 43 `LieutenantTenureInertiaPlayModeTests`
- 44 `LieutenantUiExtensionPlayModeTests`
- 46 `LoiScreenPlayModeTests`
- 47 `RuleEditorTier2PlayModeTests`
- 48 `VenteRamassagePlayModeTests`
- 51 `AppShellPlayModeTests`
- 52 `CarteVillePlayModeTests`
- 58 `DailyReviewScreenControllerPlayModeTests`
- 59 `ExceptionQueuePanelControllerPlayModeTests`
- 61 `HighestLeverageCardControllerPlayModeTests`
- 62 `HomeChromeControllerPlayModeTests`
- 63 `HudPlayModeTests`
- 70 `NavigationPlayModeTests`
- 71 `OrgVitalsPanelControllerPlayModeTests`
- 72 `RedimensionnementSondeSeamPlayModeTests`
- 74 `ShellSurimpressionAcquisitionPlayModeTests`
- 75 `TopBarControllerPlayModeTests`

**Rien de signalé** : 43 classes.

## La classe voisine — une racine cherchée PAR NOM GLOBAL, qui peut rendre un homonyme (22/09, sur GO de l'orchestrateur)
Outil : `find-nourrit-assertion.py` — tout `GameObject.Find("nom")` assigné dont le résultat (ou une grandeur tirée de lui) nourrit un
`Assert.*` de la même méthode, dans tout `Assets/Tests`. Pour chacun : deux objets de ce nom peuvent-ils COEXISTER à cet instant ?
Sources de coexistence mesurées sur les 127 classes (classifieur v3) : locaux jamais détruits = les 2 écrans autonomes de
VuePrincipaleCapture (`BuildingCardController`, `ExceptionQueueController`) ; hôtes de nav jamais démontés = Dashboard et OperationalLoop
(`Pipeline` → `LaunderingController`, aucun des noms cherchés) ; `Destroy` différé = sursis d'UNE frame, et chaque recherche vient après
au moins une attente réseau.

**Compte avant → après : 20 → 14 sites nourrissant une assertion (13 → 12 fichiers) ; sites À COEXISTENCE POSSIBLE : 3 → 0.**

Corrigés ce soir (fichier de CAPTURE, `VuePrincipaleCapturePlayModeTests.cs`) — racine cherchée SOUS le canvas de l'écran photographié :
| site | nom | coexistence possible avant ? |
|---|---|---|
| :1100 `Capture_EcranExceptions` | ExceptionQueueRoot | non (le premier de ce nom dans l'ordre ; sous son propre `canvasGo` désormais) |
| :1168 `Capture_Horizon_SousChrome` | HorizonRoot | non (aucune fuite permanente de ce nom) |
| :1254 `Capture_FicheBatiment_SousChrome` | BuildingCardSheet | **OUI** — `FicheStandalone` de `Capture_FicheBatiment`, jamais détruit, passe avant |
| :1334 `Capture_EcranExceptions_FileVide_SousChrome` | ExceptionQueueRoot | **OUI** — `ExceptionsStandalone` de `Capture_EcranExceptions` |
| :1471 `Capture_Detail_MainDeCartes_SousChrome` | ExceptionDetailSheet | non (les fuites permanentes passent APRÈS dans l'ordre alphabétique) |
| :1561 `Capture_EcranExceptions_SousChrome` | ExceptionQueueRoot | **OUI** — idem :1334 |
Avec (i) les deux écrans autonomes inscrits et détruits en IMMÉDIAT au TearDown, et (iii) une garde de sortie (aucun BuildingCard /
ExceptionQueue / ExceptionDetail né pendant le test ne vit HORS du shell en démontage). Le MUTE et ce qui est photographié : inchangés.

**Classe surveillée — 14 sites, 12 fichiers d'écran, coexistence NON possible à la mesure** : chacun est le `RacineEcran()` de sa classe
(`GameObject.Find("<Écran>Root")` + `Assert.IsNotNull`), et le TearDown de CHAQUE classe détruit en boucle, en IMMÉDIAT, toute racine de ce
nom (`while (reste != null) DestroyImmediate`) ; aucune fuite permanente mesurée ne construit ces noms. Ils redeviendraient à risque le
jour où un test monte deux écrans du même type, ou laisse un hôte autonome : c'est ce que la garde de sortie de chaque classe corrigée
nommerait, et ce que ces classes-ci n'ont pas encore.
Carnet:50 · ChaineDAppro:92 · Conflit:48 · Delegation:48, :455 · Demolition:43 · Distribution:53, :375 (Ficelle) · Filiere:43 ·
Forensic:44 · Horizon:44 · Journal:44 · Loi:47 · Reputation:57.

**Preuve due** : aucun run ne l'a encore exercé — l'étape 8 (partie 2 ∪ recapture) est le prochain qui passe par ces six sites et par la
garde de sortie ; inscrit au runbook.

## La ligne pour TD-576 (le registre est `front.md` du back, que ce rôle ne peut pas écrire — à reporter par l'orchestrateur)
> 22/09 — **cause d'Ecran9 nommée, dans sa PROPRE classe** : `MonterFileAvecCartes` écrasait `controllerGo`, Ecran10 monte deux files, la
> première survivait avec un `LoadQueue` sans jeton (lancé par `Back()`) ; son 401 tombe pendant Ecran10 au rejeu (:50335, ignoré) et au début
> d'Ecran9 au gate p1 (:49932 → FAIL :49951). Correctif : montages inscrits, `DestroyImmediate` de chacun et de son hôte de nav, garde de
> sortie (0 locataire né pendant le test) + contrôle positif. Classe lue sur les 86 classes de la partie 1 (classifieur v3) : 1 écrasement (la cause), 2 hôtes de nav, 2 locaux jamais détruits
> (VuePrincipaleCapture, qui peuvent fausser 3 gardes par `GameObject.Find`), 43 TearDown en `Destroy` différé (classe surveillée ; ChaineDAppro corrigée).
> Rejeu : prochaine partie 1.
