using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.EventSystems; // round 8 (revue ⊥, MAJEUR 2) — garde de collision sur la sortie
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.CityMap;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Operational.Autonomy;
using MafiaCleanCity.Operational.Exceptions;
using MafiaCleanCity.Tests; // SeederSupport
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    // BLOQUANT 2 (revue ⊥ round 3 des items 0.2/0.3/0.3-bis, Tools/charpente-item0-2-3-
    // implementation-notes.md § BLOQUANT 2) — débrancher `DashboardController` de TOUT onglet (round
    // 1) a aussi débranché de TOUTE production ses 4 seuls appelants : `BuildingCardController`/
    // `ExceptionQueueController`/`AutonomyInboxController` (via `DashboardController.OpenNav`) et
    // `ExceptionDetailController` (via `ExceptionQueueController.OpenDetail`, atteignable seulement
    // depuis une file elle-même atteignable depuis le Dashboard). Forme C du socle (« les écrivains
    // existent, l'APPELANT manque ») — sur QUATRE maillons à la fois, dans un lot dont la raison
    // d'être est l'atteignabilité.
    //
    // Geste (assumé par le contrôleur, scope étendu à la décision B déjà ratifiée par l'user —
    // « l'Accueil devient l'ouverture de session, posée en surimpression au-dessus de l'Empire »,
    // front.md §4) : `AppShell.AcquireSessionThenActivateHome` monte désormais `DashboardController`
    // EN SURIMPRESSION juste après avoir activé Empire — AUCUN mécanisme nouveau
    // (`IShellNavigator.MonterLocataireEnSurimpression<T>`, déjà livré par l'item 0.4). Seul le
    // POINT D'ENTRÉE de la chaîne est rebranché ici ; le RENDU propre du Dashboard (les 4 panneaux
    // orphelins de l'écran ④) reste l'item 0.5, non repris.
    //
    // MÊME patron de scène que `CharpenteBootScenePlayModeTests`/`CharpenteMontageLocatairesPlayModeTests`
    // (scène de démarrage du build chargée PAR SON INDEX, sonde scopée à la scène, SetUp qui déclare
    // son régime, TearDown qui décharge) — dupliqué ici plutôt que factorisé, consigne du lot. SEULE
    // différence structurelle : ce fichier a besoin d'une précondition SERVEUR réelle (au moins une
    // exception SEEDÉE pour `operational_demo`, sans quoi aucun clic réel n'atteint
    // `ExceptionDetailController`) — d'où le `[OneTimeSetUp]` qui lance le seeder officiel
    // (`Tools/seed_operational_demo.mjs`, DÉJÀ le régime standard de ce dépôt pour cette
    // précondition — `SeederSupport`, réutilisé par `NavigationPlayModeTests`/`HudPlayModeTests`/
    // `DashboardPlayModeTests`/`ExceptionQueuePlayModeTests`, entre autres) — les AUTRES fichiers
    // Charpente n'en ont pas besoin (ils ne cliquent jamais jusqu'à une carte réelle) et ne le
    // portent donc pas.
    [Category("Charpente")]
    public class CharpenteOuvertureSessionOverlayPlayModeTests
    {
        private Scene sceneDeDemarrage;

        [OneTimeSetUp]
        public void SeedOperationalDemo()
        {
            // Le seeder REBÂTIT `exception_queue` pour `operational_demo` à CHAQUE run (4 cartes
            // déterministes, `Tools/seed_operational_demo.mjs` § phase-20) — précondition SERVEUR
            // réelle pour la jambe ExceptionQueue→ExceptionDetail ci-dessous. Idempotent, ~40s.
            SeederSupport.RunSeeder(SeederSupport.OperationalSeeder, SeederSupport.OperationalMarker);
        }

        // Même garde de co-tenance que les deux autres fixtures Charpente — un Canvas/AppShell
        // résiduel d'un test antérieur du MÊME domaine PlayMode ferait bâtir la barre du shell de
        // CETTE scène dans la scène du voisin. On nettoie AVANT, et on IMPRIME ce qu'on a nettoyé.
        [UnitySetUp]
        public IEnumerator SetUp()
        {
            int shellsTues = 0, canvasTues = 0, locatairesTues = 0;
            foreach (AppShell reste in Object.FindObjectsByType<AppShell>(FindObjectsInactive.Include, FindObjectsSortMode.None))
            {
                if (reste.ShellCanvas != null) { Object.DestroyImmediate(reste.ShellCanvas.gameObject); canvasTues++; }
                Object.DestroyImmediate(reste.gameObject);
                shellsTues++;
            }
            foreach (Canvas reste in Object.FindObjectsByType<Canvas>(FindObjectsInactive.Include, FindObjectsSortMode.None))
            {
                Object.DestroyImmediate(reste.gameObject);
                canvasTues++;
            }
            foreach (MonoBehaviour comportement in Object.FindObjectsByType<MonoBehaviour>(FindObjectsInactive.Include, FindObjectsSortMode.None))
            {
                if (comportement != null && comportement is IShellTenant)
                {
                    Object.DestroyImmediate(comportement.gameObject);
                    locatairesTues++;
                }
            }
            Debug.Log($"[Charpente] SetUp (ouverture de session) — régime déclaré : {shellsTues} AppShell, " +
                      $"{canvasTues} Canvas et {locatairesTues} IShellTenant résiduels détruits avant le chargement.");
            yield return null;
        }

        [UnityTearDown]
        public IEnumerator TearDown()
        {
            LogAssert.ignoreFailingMessages = false; // jamais laissé fuiter vers un test SANS RAPPORT
            if (sceneDeDemarrage.IsValid() && sceneDeDemarrage.isLoaded)
            {
                AsyncOperation dechargement = SceneManager.UnloadSceneAsync(sceneDeDemarrage);
                while (dechargement != null && !dechargement.isDone) yield return null;
            }
            sceneDeDemarrage = default;
            foreach (Canvas reste in Object.FindObjectsByType<Canvas>(FindObjectsInactive.Include, FindObjectsSortMode.None))
                Object.Destroy(reste.gameObject);
            yield return null;
        }

        private static AppShell SondeShellDansLaScene(Scene scene)
        {
            if (!scene.IsValid() || !scene.isLoaded) return null;
            foreach (GameObject racine in scene.GetRootGameObjects())
            {
                AppShell trouve = racine.GetComponentInChildren<AppShell>(true);
                if (trouve != null) return trouve;
            }
            return null;
        }

        private IEnumerator ChargerLaSceneDeDemarrageDuBuild()
        {
            // Même bruit orthogonal que les deux autres fixtures Charpente (démo-auth propre d'un
            // tenant) : aucune assertion de ce fichier ne porte sur l'authentification en tant que
            // telle, seulement sur l'ATTEIGNABILITÉ des écrans.
            LogAssert.ignoreFailingMessages = true;

            Assert.GreaterOrEqual(SceneManager.sceneCountInBuildSettings, 1,
                "Build Settings vides : aucune scène de démarrage ⇒ un build ne montrerait AUCUN écran.");
            string chemin = SceneUtility.GetScenePathByBuildIndex(0);
            Assert.IsNotEmpty(chemin, "la scène d'index de build 0 n'a pas de chemin");

            AsyncOperation chargement = SceneManager.LoadSceneAsync(0, LoadSceneMode.Additive);
            Assert.IsNotNull(chargement, "LoadSceneAsync(0) a refusé l'index de build 0");
            while (!chargement.isDone) yield return null;

            sceneDeDemarrage = SceneManager.GetSceneByBuildIndex(0);
            Assert.IsTrue(sceneDeDemarrage.IsValid() && sceneDeDemarrage.isLoaded,
                "la scène d'index de build 0 n'est pas chargée");
            Assert.AreEqual(chemin, sceneDeDemarrage.path,
                "la scène chargée n'est pas celle de l'index de build 0");

            yield return null; // Start() d'AppShell : EnsureInitialized() y bâtit tout le chrome, synchrone.
        }

        private static IEnumerator WaitForEmpireMounted(AppShell shell)
        {
            float elapsed = 0f;
            while (shell.CurrentTab != AppShell.Tab.Empire && elapsed < 15f) { elapsed += Time.deltaTime; yield return null; }
            Assert.AreEqual(AppShell.Tab.Empire, shell.CurrentTab,
                "acquisition de session propre du shell résolue (Empire monté) — précondition avant d'exercer les gestes de production");
        }

        /// <summary>Cherche un descendant par NOM, inactifs compris, où qu'il soit dans l'arbre —
        /// précédent maison `VuePrincipaleCapturePlayModeTests.TrouverEnfant` : `Transform.Find` ne
        /// descend que d'un niveau par segment de chemin et exige le chemin exact.</summary>
        private static Transform TrouverDescendant(Transform racine, string nom)
        {
            foreach (Transform t in racine.GetComponentsInChildren<Transform>(true))
                if (t.name == nom) return t;
            return null;
        }

        // ─────────────────────────────────────────────────────────────────────────────────────────
        // BLOQUANT 2 — la chaîne ENTIÈRE, par des GESTES DE PRODUCTION UNIQUEMENT : Dashboard monté
        // AU DÉMARRAGE (jamais fabriqué par ce test — ⛔ c'est exactement ce qui a rendu F0.4-a
        // AVEUGLE : construire soi-même le Dashboard prouve que le CONTRÔLEUR sait naviguer, jamais
        // qu'un joueur l'a SOUS LES YEUX), puis chacun de ses 5 boutons nav atteint son écran
        // (un CLIC RÉEL sur chaque bouton — `Nav_CityMap`/`Nav_BuildingCard`/`Nav_Filière`/
        // `Nav_Exceptions`/`Nav_Autonomy`, noms posés par `DashboardController.AddNavButton`), puis
        // ExceptionQueue → ExceptionDetail (un clic RÉEL sur la ligne d'une carte SEEDÉE — jamais une
        // `ExceptionCardDto` fabriquée localement, contrairement au harnais F0.4-a).
        //
        // Réachabilité, PAS rendu — aucun pixel mesuré ici. Anti-vacuité : chaque écran est NOMMÉ
        // (liste `ecransAttendus`/`ecransAtteints` comparée à la fin), jamais un compte nu.
        // ─────────────────────────────────────────────────────────────────────────────────────────
        [UnityTest]
        public IEnumerator BLOQUANT2_DashboardMonteEnSurimpressionAuDemarrage_SaChaineDeNavEstAtteignableJusquADetail()
        {
            yield return ChargerLaSceneDeDemarrageDuBuild();
            AppShell shell = SondeShellDansLaScene(sceneDeDemarrage);
            Assert.IsNotNull(shell, $"aucun AppShell dans la scène de démarrage du build ({sceneDeDemarrage.path})");
            yield return WaitForEmpireMounted(shell);
            yield return null; // le montage EN SURIMPRESSION du Dashboard est SYNCHRONE, dans la
                                // MÊME passe de coroutine que l'activation d'Empire (AppShell.
                                // AcquireSessionThenActivateHome) — un seul frame de marge suffit.

            var ecransAttendus = new List<string>
            {
                nameof(DashboardController), nameof(CityMapController), nameof(BuildingCardController),
                nameof(LaunderingController), nameof(ExceptionQueueController), nameof(AutonomyInboxController),
                nameof(ExceptionDetailController),
            };
            var ecransAtteints = new List<string>();

            // ⛔ NE FABRIQUE PAS LE DASHBOARD — il doit être monté PAR LA PRODUCTION
            // (`AcquireSessionThenActivateHome`), jamais construit par ce test (c'est exactement ce
            // qui a rendu F0.4-a aveugle à la classe que ce test ferme).
            // ⛔ MINEUR round 4 (revue ⊥) — `includeInactive: false` (pas `true`) : un Dashboard
            // monté mais INACTIF n'est PAS ce que ce test doit accepter comme « monté AU
            // DÉMARRAGE » — avec `true`, un tel Dashboard passerait `IsNotNull` puis ferait échouer
            // le test 30s plus tard sur `DashboardLoaded`, avec un message qui ACCUSE LE SERVEUR
            // (walletErr=...) alors que la vraie cause est que l'objet n'a jamais tourné. `false`
            // fait échouer ICI, tout de suite, en disant la bonne chose.
            DashboardController dashboard = shell.ContentSlot.GetComponentInChildren<DashboardController>(false);
            Assert.IsNotNull(dashboard,
                "le Dashboard doit être monté AUTOMATIQUEMENT en surimpression au démarrage — sans lui, " +
                "BuildingCardController/ExceptionQueueController/AutonomyInboxController/ExceptionDetailController " +
                "sont TOUS injoignables (BLOQUANT 2, revue ⊥ round 3).");
            ecransAtteints.Add(nameof(DashboardController));

            float elapsedLoad = 0f;
            while (!dashboard.DashboardLoaded && dashboard.WalletError == null && elapsedLoad < 30f)
            {
                elapsedLoad += Time.deltaTime;
                yield return null;
            }
            Assert.IsTrue(dashboard.DashboardLoaded,
                $"le Dashboard monté par la production doit charger (walletErr={dashboard.WalletError}) — " +
                "précondition serveur : Tools/seed_operational_demo.mjs (OneTimeSetUp de cette fixture).");

            void CliquerBoutonNav(string nomBouton)
            {
                Transform boutonT = TrouverDescendant(shell.ContentSlot, nomBouton);
                Assert.IsNotNull(boutonT, $"le bouton {nomBouton} du Dashboard doit exister dans ContentSlot");
                Button bouton = boutonT.GetComponent<Button>();
                Assert.IsNotNull(bouton, $"{nomBouton} doit porter un Button");
                // ⛔ round 4 (revue ⊥, BLOQUANT) — `.onClick.Invoke()` court-circuite les gardes
                // IsActive()/IsInteractable() de Button.Press(). `ProductionClickSupport.Click`
                // passe PAR l'EventSystem — jamais `dashboard.OpenXxx()` appelé directement non plus.
                ProductionClickSupport.Click(bouton); // ⛔ LE GESTE DE PRODUCTION
            }

            CliquerBoutonNav("Nav_CityMap");
            yield return null;
            Assert.IsNotNull(dashboard.LastNavGameObject?.GetComponent<CityMapController>(),
                "Nav_CityMap doit atteindre CityMapController (clic réel sur le bouton du Dashboard)");
            ecransAtteints.Add(nameof(CityMapController));

            CliquerBoutonNav("Nav_BuildingCard");
            yield return null;
            Assert.IsNotNull(dashboard.LastNavGameObject?.GetComponent<BuildingCardController>(),
                "Nav_BuildingCard doit atteindre BuildingCardController (clic réel sur le bouton du Dashboard)");
            ecransAtteints.Add(nameof(BuildingCardController));

            CliquerBoutonNav("Nav_Filière");
            yield return null;
            Assert.IsNotNull(dashboard.LastNavGameObject?.GetComponent<LaunderingController>(),
                "Nav_Filière doit atteindre LaunderingController (clic réel sur le bouton du Dashboard)");
            ecransAtteints.Add(nameof(LaunderingController));

            // Capturé ICI, AVANT que le clic Autonomy n'écrase `LastNavGameObject` (même ordre que
            // F0.4-a, précédent maison : « dernier nav », pas un registre).
            CliquerBoutonNav("Nav_Exceptions");
            yield return null;
            ExceptionQueueController queue = dashboard.LastNavGameObject?.GetComponent<ExceptionQueueController>();
            Assert.IsNotNull(queue, "Nav_Exceptions doit atteindre ExceptionQueueController (clic réel sur le bouton du Dashboard)");
            ecransAtteints.Add(nameof(ExceptionQueueController));

            CliquerBoutonNav("Nav_Autonomy");
            yield return null;
            Assert.IsNotNull(dashboard.LastNavGameObject?.GetComponent<AutonomyInboxController>(),
                "Nav_Autonomy doit atteindre AutonomyInboxController (clic réel sur le bouton du Dashboard)");
            ecransAtteints.Add(nameof(AutonomyInboxController));

            // ── ExceptionQueue → ExceptionDetail : le clic sur une carte RÉELLE, SEEDÉE — `queue`
            // reste vivant (un overlay `MonterLocataireEnSurimpression` n'est jamais démonté par le
            // montage d'un AUTRE overlay ; F0.4-a exerce déjà ce même empilement). ──
            float elapsedQueue = 0f;
            while (!queue.QueueLoaded && queue.QueueError == null && elapsedQueue < 30f)
            {
                elapsedQueue += Time.deltaTime;
                yield return null;
            }
            Assert.IsTrue(queue.QueueLoaded, $"la file d'exceptions doit charger (err={queue.QueueError})");
            Assert.Greater(queue.Cards.Length, 0,
                "précondition : au moins une carte SEEDÉE (Tools/seed_operational_demo.mjs, OneTimeSetUp) — " +
                "sans elle aucun clic réel n'atteint ExceptionDetailController, et cette jambe de la chaîne " +
                "serait vraie À VIDE (garde anti-vacuité).");

            string nomLigne = "Card_" + queue.Cards[0].exception_id;
            Transform ligne = TrouverDescendant(shell.ContentSlot, nomLigne);
            Assert.IsNotNull(ligne, $"la ligne {nomLigne} doit exister dans la file RENDUE (queue.Cards[0] réellement affichée)");
            Transform boutonOuvrir = ligne.Find("Ouvrir");
            Assert.IsNotNull(boutonOuvrir, "chaque ligne de la file doit porter un bouton 'Ouvrir' (ExceptionQueueController.AddCardRow)");
            Button ouvrir = boutonOuvrir.GetComponent<Button>();
            Assert.IsNotNull(ouvrir, "'Ouvrir' doit porter un Button");
            // ⛔ round 4 (revue ⊥, BLOQUANT) — même correctif que CliquerBoutonNav ci-dessus :
            // ProductionClickSupport.Click passe PAR l'EventSystem plutôt que d'invoquer la
            // UnityEvent nue, jamais `queue.OpenDetail(card)` appelé directement non plus.
            ProductionClickSupport.Click(ouvrir); // ⛔ LE GESTE DE PRODUCTION
            yield return null;

            Assert.IsNotNull(queue.LastDetail,
                "le clic RÉEL sur 'Ouvrir' d'une carte SEEDÉE doit monter un ExceptionDetailController");
            Assert.IsTrue(queue.LastDetail.transform.IsChildOf(shell.ContentSlot),
                "le détail monté doit être un descendant de ContentSlot — confinement, pas juste 'existe quelque part'");
            ecransAtteints.Add(nameof(ExceptionDetailController));

            // Anti-vacuité du COMPTE lui-même : la liste est NOMMÉE, comparée à une cible ÉCRITE ICI
            // (indépendante de tout code de production), jamais un nombre nu.
            CollectionAssert.AreEqual(ecransAttendus, ecransAtteints,
                $"la chaîne ENTIÈRE doit être atteinte, DANS CET ORDRE, en {ecransAttendus.Count} écrans NOMMÉS " +
                $"— atteint {{{string.Join(", ", ecransAtteints)}}}.");

            Debug.Log($"[Charpente] BLOQUANT 2 (round 3) — chaîne {string.Join(" → ", ecransAtteints)} " +
                      "atteinte par des gestes de production uniquement ; Dashboard NON fabriqué par ce test.");
        }

        // ═════════════════════════════════════════════════════════════════════════════════════════
        // ⛔⛔ FERMETURE DE L'OVERLAY ACCUEIL — LIVRÉE round 7 (revue ⊥, BLOQUANT 2 : « je change de
        // décision, et c'est la mesure qui me le fait faire »). Le ruling user 2026-08-25 (ratifié,
        // front.md §4) dit : « posée en surimpression au-dessus de l'Empire, PUIS ON TOMBE SUR LA
        // VILLE. » Rounds 4-6 ne livraient que la première moitié, sur la foi d'une raison mesurée
        // FAUSSE : « aucun mécanisme de démontage n'existe dans `IShellNavigator`/`IShellTenant` ».
        // Réfutée par TROIS artefacts DE CE LOT, déjà présents avant ce round : `AppShell.
        // ExitToCityMap()` (round 11, revue ⊥ BLOQUANT 1 : citation par numéro de ligne remplacée
        // par un nom de symbole — `=> ActivateTab(Tab.Empire)`), `Tools/charpente-item0-2-3-
        // design.md` §3.2 et §4 F0.3-bis (round 13, revue ⊥ BLOQUANT — ancre par numéro remplacée
        // par un titre de section : le design NOMME DÉJÀ le geste de fermeture par l'action de tête
        // du bandeau ; le libellé qu'il lui attribuait ALORS a depuis été abandonné, voir le
        // correctif round 8 ci-dessous — ⛔ round 9, revue ⊥, MAJEUR 2 : ce commentaire CITAIT
        // VERBATIM la clause que ce même correctif retire, le piège de citation refermé dans le
        // bloc qui le décrit — PARAPHRASÉ ICI, jamais cité), et F-A elle-même (ci-dessous), qui
        // prouve depuis longtemps qu'une activation d'onglet détruit l'overlay — le RETOUR à la
        // carte était déjà résolu pour le district, jamais rebranché ici.
        //
        // Geste, ZÉRO mécanisme neuf : `TopBar.SetLeadingAction(TopBarController.LeadingAction.
        // BackToMap, ExitToCityMap)`, DEUX lignes, posées APRÈS `MonterLocataireEnSurimpression
        // <DashboardController>()` sur les DEUX branches d'`AcquireSessionThenActivateHome`
        // (`AppShell.cs`, branche repli-échec et branche succès) — APRÈS, parce qu'`ActivateTab`
        // remet l'action de tête à `None` (son propre reset défensif) : la poser avant l'aurait
        // fait écraser. Aucune copie n'est inventée : c'est EXACTEMENT le geste déjà câblé pour
        // sortir d'un district, réutilisé tel quel.
        // ⚠️ CORRIGÉ round 8 (revue ⊥, MINEUR 2) — ce commentaire attribuait ici un libellé
        // « retour vers la carte » à `LabelFor`, en s'appuyant sur le design du lot. `LabelFor`
        // rend une FLÈCHE NUE pour cette action (`TopBarController.LabelFor`), et le commentaire du
        // cas `LeadingAction.BackToMap`, DANS `LabelFor` (round 13 : ancre par numéro remplacée par
        // un nom de symbole), documente pourquoi le libellé à deux mots a été ABANDONNÉ : il
        // revenait à la ligne depuis que le bandeau est à l'échelle du canon. ⇒ L'affordance montrée
        // au joueur est une flèche sans destination écrite. *Un énoncé daté d'un design, périmé par
        // un lot ultérieur, ressuscité comme preuve* — la découvrabilité repose sur le fait que
        // c'est le seul contrôle du coin gauche, pas sur un mot qui n'est pas affiché.
        //
        // Ce que CE round livre : F-A (inchangée, toujours vraie — un SECOND chemin de sortie,
        // générique, coexiste avec celui-ci) et F-B, REMPLACÉE : l'ancienne épingle documentait un
        // trou qui vient d'être bouché — « on n'épingle pas ce qu'on vient de livrer » — par une
        // falsifiable POSITIVE qui clique RÉELLEMENT l'action de tête et prouve la fermeture, sur
        // les DEUX branches d'acquisition (succès et repli-échec).
        // ═════════════════════════════════════════════════════════════════════════════════════════

        // F-A — LA VILLE EST ATTEIGNABLE EN UN GESTE DE PRODUCTION DEPUIS LE DÉMARRAGE, PAR UN
        // SECOND CHEMIN, GÉNÉRIQUE ET NON DÉDIÉ, QUI COEXISTE DÉSORMAIS AVEC L'ACTION DE TÊTE DÉDIÉE
        // (F-B, ci-dessous). Mécanisme EXISTANT, pas neuf : `AppShell.UnmountCurrentTenant()` détruit
        // TOUT enfant direct de `ContentSlot` avant de monter le nouveau tenant d'onglet —
        // « ContentSlot est la source de vérité unique de ce qui est affiché maintenant » (son propre
        // commentaire). L'overlay Dashboard (host + backdrop + sheet, tous parentés SOUS ContentSlot
        // par `MonterLocataireEnSurimpression`, `root = mountParent = ContentSlot` dans
        // `DashboardController.BuildLayout`) est donc DÉTRUIT par N'IMPORTE QUELLE activation d'onglet
        // — y compris re-taper la bulle Empire déjà active (`ActivateTab` est « idempotent-ish :
        // re-activating the SAME tab still remounts », son propre commentaire).
        // Ce test le PROUVE par un geste RÉEL (le dock, jamais `shell.ActivateTab` direct), pas en le
        // déduisant du code.
        // ⛔ Assertion POSITIVE : preuve que ce n'est PAS un cul-de-sac, jamais une absence.
        [UnityTest]
        public IEnumerator FA_LaVilleEstAtteignableEnUnGesteDeProductionDepuisLeDemarrage_MalgreLAbsenceDeSortieDediee()
        {
            yield return ChargerLaSceneDeDemarrageDuBuild();
            AppShell shell = SondeShellDansLaScene(sceneDeDemarrage);
            Assert.IsNotNull(shell, $"aucun AppShell dans la scène de démarrage du build ({sceneDeDemarrage.path})");
            yield return WaitForEmpireMounted(shell);
            yield return null; // le montage EN SURIMPRESSION du Dashboard est SYNCHRONE, même passe

            // ⛔ ANTI-VACUITÉ — sans cette précondition, un overlay qui ne se serait JAMAIS monté
            // rendrait ce test vrai À VIDE (rien à démonter ⇒ « la ville est là » trivialement).
            DashboardController overlayAvant = shell.ContentSlot.GetComponentInChildren<DashboardController>(false);
            Assert.IsNotNull(overlayAvant,
                "précondition anti-vacuité : l'overlay Accueil doit être RÉELLEMENT monté AVANT le " +
                "clic — sans lui, l'assertion qui suit serait vraie à vide (rien à démonter).");

            Transform boutonEmpireT = shell.TabBarRoot.Find("Tab_Empire");
            Assert.IsNotNull(boutonEmpireT, "le bouton Tab_Empire doit exister dans le dock");
            Button boutonEmpire = boutonEmpireT.GetComponent<Button>();
            Assert.IsNotNull(boutonEmpire, "Tab_Empire doit porter un Button");

            // ⛔ UN SEUL geste de production — le helper qui honore IsActive()/IsInteractable()
            // (round 4, BLOQUANT). Jamais shell.ActivateTab(Tab.Empire) appelé directement : ce
            // serait prouver que la méthode existe, pas qu'un joueur y arrive par le dock.
            ProductionClickSupport.Click(boutonEmpire);
            yield return null; // laisse le Object.Destroy déféré de UnmountCurrentTenant s'exécuter

            DashboardController overlayApres = shell.ContentSlot.GetComponentInChildren<DashboardController>(true);
            Assert.IsNull(overlayApres,
                "après le clic RÉEL sur Tab_Empire, l'overlay Accueil ne doit PLUS être sous " +
                "ContentSlot (includeInactive:true — une survivance seulement DÉSACTIVÉE compterait " +
                "encore comme un défaut de démontage, pas comme une réussite).");
            Assert.AreEqual(typeof(CityMapController), shell.MountedTenantType,
                "après le clic RÉEL sur Tab_Empire, la carte doit être le locataire d'onglet monté");
            Assert.IsNotNull(shell.MountedTenantGameObject, "un GameObject de locataire doit exister");
            Assert.IsTrue(shell.MountedTenantGameObject.transform.IsChildOf(shell.ContentSlot),
                "le locataire remonté doit être un descendant de ContentSlot — confinement, pas juste " +
                "'existe quelque part'.");

            Debug.Log("[Charpente] F-A — la ville (CityMapController) est atteinte en UN clic de " +
                      "production sur Tab_Empire, l'overlay Accueil ayant réellement disparu de " +
                      "ContentSlot ; un SECOND chemin, générique, qui coexiste désormais avec " +
                      "l'action de tête dédiée (F-B, round 7, ci-dessous).");
        }

        // F-B — REMPLACÉE round 7 (revue ⊥, BLOQUANT 2) : « une épingle qui documente un trou
        // devient inutile quand le trou est bouché — on n'épingle pas ce qu'on vient de livrer ».
        // L'ancienne épingle (F-B, rounds 4-6) comptait l'ENSEMBLE NOMMÉ des `Button` sous
        // `DashboardBackdrop`/`DashboardSheet` pour PROUVER qu'aucun n'était une fermeture — son
        // propre mode d'emploi de péremption disait : « le jour où un Button neuf y ferme l'overlay,
        // RETIRER ce test ». Ce jour est arrivé, PAR UN CHEMIN DIFFÉRENT de celui qu'elle guettait :
        // pas un `Button` neuf sous `DashboardBackdrop`/`DashboardSheet` (aucun ajouté), mais
        // l'action de tête du `TopBar` — hors du périmètre que F-B épinglait, donc son rouge
        // n'aurait JAMAIS sonné (elle serait restée VERTE à travers l'événement qu'elle guettait,
        // exactement le mode de défaillance qu'elle nommait pour un AUTRE angle round 6).
        //
        // Deux falsifiables POSITIVES la remplacent — MÊME assertion, sur les DEUX branches
        // d'acquisition d'`AcquireSessionThenActivateHome` (succès ci-dessous, repli-échec plus
        // bas) : l'action de tête du `TopBar` est `BackToMap`, interactable, et un clic RÉEL dessus
        // (`ProductionClickSupport.Click`, jamais `onClick.Invoke()` nu) démonte l'overlay Accueil
        // et révèle `CityMapController` — MÊME assertion que F-A (overlay disparu, carte montée,
        // confinement sous ContentSlot), MAIS déclenchée par le bouton DÉDIÉ, pas par le dock.
        [UnityTest]
        public IEnumerator FB_LActionDeTeteFermeLOverlayEtRevelaLaVille_BrancheSucces()
        {
            yield return ChargerLaSceneDeDemarrageDuBuild();
            AppShell shell = SondeShellDansLaScene(sceneDeDemarrage);
            Assert.IsNotNull(shell, $"aucun AppShell dans la scène de démarrage du build ({sceneDeDemarrage.path})");
            yield return WaitForEmpireMounted(shell);
            yield return null; // montage EN SURIMPRESSION du Dashboard, synchrone, même passe

            // ⛔⛔ LA PRÉMISSE — round 9 (revue ⊥, BLOQUANT 1). Sans elle, ce test est un DOUBLON
            // SILENCIEUX de la branche repli-échec, exactement le miroir du BLOQUANT que round 8 a
            // fermé sur l'AUTRE branche : `CurrentTab == Empire` est vrai sur les DEUX branches, et
            // le monde le PLUS probable qui laisse cette garde verte à travers l'événement qu'elle
            // devrait détecter est même plus facile à atteindre que celui déjà gardé — le signin
            // d'`operational_demo` échoue (back arrêté, compte purgé, 401 transitoire pendant les
            // 2-4 allers-retours réseau) et ce test, nommé « BRANCHE SUCCÈS », empruntait alors le
            // REPLI sans que rien ne le remarque : les six assertions de
            // `VerifierFermetureParActionDeTete` passent quand même (elles sont IDENTIQUES sur les
            // deux branches — `ActivateTab`/`MonterLocataireEnSurimpression`/`SetLeadingAction` sont
            // posés au MÊME endroit relatif sur les deux, dans `AppShell.
            // AcquireSessionThenActivateHome()` (round 11 — revue ⊥, BLOQUANT 1 : citation PAR
            // NUMÉRO DE LIGNE remplacée par un nom de symbole, cette classe ayant déjà glissé deux
            // fois dans CE MÊME fichier) — branche repli (garde locale `pasEncoreActiveEchec`) et
            // branche succès (garde locale `pasEncoreActive`)
            // et le `SetLeadingAction` de LA BRANCHE SUCCÈS (cette branche-ci) ne serait couvert par
            // RIEN. `Token` est
            // `public string Token { get; private set; }` (`AppShell.cs:110`), écrivain UNIQUE —
            // l'unique affectation `Token = t;` dans `AcquireSessionThenActivateHome()`
            // — APRÈS le signin, AVANT ce montage — donc c'est la grandeur qui
            // DISCRIMINE les deux chemins, exactement symétrique à la garde `IsNullOrEmpty` que
            // round 8 a posée sur la branche repli-échec.
            Assert.IsFalse(string.IsNullOrEmpty(shell.Token),
                "prémisse (BRANCHE SUCCÈS) : le signin du shell doit avoir RÉUSSI, donc `Token` doit " +
                "être renseigné — trouvé vide. S'il est vide, l'identité de démo a ÉCHOUÉ à signer " +
                "(back arrêté, compte purgé, 401 transitoire) : ce test a glissé sur la branche repli " +
                "et ne couvre plus le succès. Réparer la précondition serveur, pas l'assertion.");

            yield return VerifierFermetureParActionDeTete(shell, "BRANCHE SUCCÈS");
        }

        // round 7 (revue ⊥, BLOQUANT 2) — MÊME garde, sur la branche REPLI-ÉCHEC
        // d'`AcquireSessionThenActivateHome` : `ActivateTab(Tab.Empire)` + `MonterLocataireEnSurimpression
        // <DashboardController>()` + `TopBar.SetLeadingAction(...)` sont posés IDENTIQUEMENT sur les
        // DEUX branches (`AppShell.cs`) — round 3 avait déjà branché le Dashboard sur les deux ;
        // round 7 ne fait qu'ajouter la MÊME ligne, à la MÊME place relative, sur celle-ci aussi. La
        // preuve doit donc être répétée ici, PAS supposée par symétrie de code.
        //
        // ⛔ NE CHARGE PAS la scène de démarrage du build — son identité par défaut
        // (`operational_demo`) RÉUSSIT, ce qui n'exercerait que la branche succès. Même idiome que
        // `NavigationPlayModeTests.NavF3_...` (seul précédent de ce dépôt pour forcer la branche
        // repli-échec) : un `AppShell` construit MANUELLEMENT, `SetIdentity` posée AVANT tout
        // `yield return` (même fenêtre synchrone que `Start()`, qui lit ces champs différé d'une
        // frame), avec des identifiants DÉLIBÉRÉMENT invalides.
        [UnityTest]
        public IEnumerator FB_LActionDeTeteFermeLOverlayEtRevelaLaVille_BrancheEchec()
        {
            // round 9 (revue ⊥, MINEUR m3) — capturé AVANT toute construction : ce test ne charge
            // AUCUNE scène, donc si aucun EventSystem n'existe déjà, `AppShell.EnsureEventSystem()`
            // (appelée depuis `Start()`, dans la fenêtre synchrone d'`EnsureInitialized`) va en
            // créer un NEUF que ni ce `finally` (avant ce correctif) ni le `[UnityTearDown]` de
            // cette fixture (qui ne détruit que Canvas) ne nettoyaient — le vecteur EXACT du
            // BLOQUANT 2 : `EventSystem.current` rend le PREMIER élément d'une liste STATIQUE
            // partagée par tout le domaine PlayMode, et ce lot l'écrit lui-même
            // (`CharpenteMontageLocatairesPlayModeTests.cs:1019-1021`).
            EventSystem eventSystemAvant = EventSystem.current;
            GameObject shellGo = new GameObject("AppShell_ControleR7BrancheEchec");
            AppShell shell = shellGo.AddComponent<AppShell>();
            try
            {
                shell.SetIdentity("charpente-r7-deliberement-invalide@example.test", "not-a-real-password");
                LogAssert.ignoreFailingMessages = true; // signin délibérément raté : Error attendue

                float bootElapsed = 0f;
                while (shell.CurrentTab != AppShell.Tab.Empire && bootElapsed < 15f) { bootElapsed += Time.deltaTime; yield return null; }
                Assert.AreEqual(AppShell.Tab.Empire, shell.CurrentTab,
                    "acquisition (même ratée) du shell résolue avant toute vérification");

                // ⛔⛔ LA PRÉMISSE, et sans elle ce test est un DOUBLON SILENCIEUX de la branche
                // succès (revue ⊥ round 8, MAJEUR 3). `CurrentTab == Empire` est vrai sur les DEUX
                // branches : rien, jusqu'ici, ne dit LAQUELLE a été empruntée. Le jour où cette
                // identité cesse d'échouer — auto-signup côté back, compte créé par mégarde — ce
                // test glisserait sur la branche SUCCÈS, le `SetLeadingAction` de LA BRANCHE REPLI
                // (`AppShell.AcquireSessionThenActivateHome()`) cesserait
                // d'être couvert, et LES DEUX TESTS RESTERAIENT VERTS à travers l'événement.
                // ⚠️ CORRIGÉ round 9 (revue ⊥, MINEUR m1) — cette liste portait un 3ᵉ exemple FAUX,
                // « stack absente » : une stack absente fait ÉCHOUER le signin
                // (`AuthClient.SignIn` ne rend pas de jeton sans serveur, et `AppShell.
                // AcquireSessionThenActivateHome()` teste `string.IsNullOrEmpty(t)` juste après le
                // signin — round 11, revue ⊥ BLOQUANT 1, citation par numéro remplacée par un nom
                // de symbole) — elle RENFORCE la branche repli, elle ne la
                // quitte JAMAIS. Retiré ; les deux exemples restants ci-dessus (auto-signup, compte
                // créé par mégarde) sont les seuls qui font RÉUSSIR une identité délibérément invalide.
                // Le précédent maison que ce test invoque asserte, lui, sa prémisse
                // (`NavigationPlayModeTests.cs:247-248`) : on en copiait la forme, pas la garde.
                // `Token` n'est renseigné que par un signin RÉUSSI (`AppShell.cs`, branche succès) —
                // c'est donc la grandeur qui DISCRIMINE les deux chemins, pas l'onglet actif.
                Assert.IsTrue(string.IsNullOrEmpty(shell.Token),
                    "prémisse (BRANCHE REPLI-ÉCHEC) : le signin du shell doit avoir ÉCHOUÉ, donc " +
                    $"`Token` reste vide — trouvé « {shell.Token} ». S'il est renseigné, l'identité " +
                    "délibérément invalide a été ACCEPTÉE : ce test a glissé sur la branche succès " +
                    "et ne couvre plus le repli. Réparer l'identité, pas l'assertion.");

                yield return null; // même marge d'une frame que la branche succès

                yield return VerifierFermetureParActionDeTete(shell, "BRANCHE REPLI-ÉCHEC");
            }
            finally
            {
                // même patron que NavigationPlayModeTests.TearDown : AppShell découvre/crée SON
                // PROPRE Canvas (jamais parenté sous shellGo) — ne détruire que shellGo le laisserait
                // fuiter vers le test SUIVANT du même domaine PlayMode.
                if (shell != null && shell.ShellCanvas != null) Object.Destroy(shell.ShellCanvas.gameObject);
                if (shellGo != null) Object.Destroy(shellGo);
                // round 9 (revue ⊥, MINEUR m3) — même patron que le contrôle négatif de
                // `CharpenteMontageLocatairesPlayModeTests.F0_2c_ControleNegatif_...`
                // (`DestroyImmediate` choisi NOMMÉMENT pour retirer l'instance de la liste
                // STATIQUE `m_EventSystems` SYNCHRONEMENT, avant qu'un [UnityTest] voisin ne
                // rende la main) : ne détruire QUE l'EventSystem que CE test a fait naître — un
                // EventSystem qui existait déjà AVANT (`eventSystemAvant`) n'est pas à nous, et
                // pourrait être légitimement utilisé par un test frère dans le même domaine.
                EventSystem eventSystemApres = EventSystem.current;
                if (eventSystemApres != null && eventSystemApres != eventSystemAvant)
                    Object.DestroyImmediate(eventSystemApres.gameObject);
            }
        }

        // Corps PARTAGÉ des deux branches ci-dessus — la MÊME assertion positive que F-A (overlay
        // disparu, carte montée, confinement sous ContentSlot), déclenchée par L'ACTION DE TÊTE
        // dédiée plutôt que par le dock.
        private static IEnumerator VerifierFermetureParActionDeTete(AppShell shell, string etiquetteBranche)
        {
            // ⛔ ANTI-VACUITÉ — sans cette précondition, un overlay jamais monté rendrait la
            // fermeture vraie À VIDE (rien à démonter).
            DashboardController overlayAvant = shell.ContentSlot.GetComponentInChildren<DashboardController>(false);
            Assert.IsNotNull(overlayAvant,
                $"précondition anti-vacuité ({etiquetteBranche}) : l'overlay Accueil doit être " +
                "RÉELLEMENT monté AVANT le clic sur l'action de tête.");

            Assert.AreEqual(TopBarController.LeadingAction.BackToMap, shell.TopBar.CurrentLeadingAction,
                $"round 7 (BLOQUANT 2, {etiquetteBranche}) — l'action de tête doit être BackToMap dès " +
                "que l'overlay Accueil est monté (posée APRÈS ActivateTab, qui la remet sinon à None).");

            Transform boutonTeteT = shell.TopBar.transform.Find("LeadingAction");
            Assert.IsNotNull(boutonTeteT, $"l'action de tête ('LeadingAction') doit exister sous TopBarController ({etiquetteBranche})");
            Button boutonTete = boutonTeteT.GetComponent<Button>();
            Assert.IsNotNull(boutonTete, $"'LeadingAction' doit porter un Button ({etiquetteBranche})");
            Assert.IsTrue(boutonTete.interactable, $"l'action de tête doit être interactable ({etiquetteBranche})");

            // ⛔⛔ GARDE DE COLLISION SUR LA SORTIE (revue ⊥ round 8, MAJEUR 2). Sans elle, ce lot
            // livrait la moitié du ruling qui compte pour le joueur — « puis on tombe sur la ville » —
            // par un bouton posé SOUS un overlay plein écran NEUF, en n'en prouvant que la moitié
            // « Selectable ». `ProductionClickSupport` le dit lui-même dans sa docstring : il route
            // directement sur le GameObject et NE COUVRE PAS le hit-testing. Mesuré avant ce round :
            // `EventSystem.current.RaycastAll` n'apparaissait qu'UNE fois dans tout `Assets/Tests`,
            // scopé aux 4 bulles du dock — la classe était fermée sur les INSTANCES, pas sur la
            // POPULATION de ce sur quoi un joueur doit taper.
            //
            // ⇒ La propriété qui mord ici n'est pas « le bouton existe » : c'est que **le backdrop
            // plein écran de l'overlay n'avale PAS le tap de sortie**. `DashboardBackdrop` est
            // raycastable et couvre tout l'écran ; seul l'ordre de fratrie (ContentSlot < TopBarSlot)
            // met l'action de tête au-dessus. Cette assertion est ce qui rougirait si cet ordre
            // changeait — et l'ordre de fratrie, lui, est gardé ailleurs sans jamais tester CE tap.
            //
            // ⛔⛔ round 9 (revue ⊥, BLOQUANT 2) — LA PRÉCONDITION DE MODULE, qui manquait ICI alors
            // que le round 7 l'a rendue OBLIGATOIRE pour cette forme EXACTE (`EventSystem.current.
            // RaycastAll`) sur le site JUMEAU du dock (`CharpenteMontageLocatairesPlayModeTests.
            // cs:945-963`). Mesuré par le round 7 : `RaycastAll` (`EventSystem.cs:266-281`) ne
            // consulte QUE `RaycasterManager.GetRaycasters()` — il ne lit JAMAIS
            // `currentInputModule`. Un `EventSystem` sans module d'entrée actif rend donc des
            // résultats de raycast NON VIDES quand même (les raycasters restent enregistrés
            // indépendamment du module) : la garde ci-dessous certifierait une sortie sur laquelle
            // AUCUN tap ne pourra jamais être dispatché. Le chemin est OUVERT : `AppShell.
            // EnsureEventSystem()` ne pose le module QUE si aucun
            // `EventSystem` n'existe déjà, et `FB_..._BrancheEchec` (ci-dessus) ne charge AUCUNE
            // scène — c'est le test qui a le plus besoin de cette précondition et qui en avait le
            // moins. `ProductionClickSupport.HasActiveInputModule` est PROMU (round 9) hors de
            // `CharpenteMontageLocatairesPlayModeTests` pour être partagé ICI sans dupliquer.
            GraphicRaycaster raycasterSortie = shell.ShellCanvas.GetComponent<GraphicRaycaster>();
            Assert.IsNotNull(raycasterSortie,
                $"({etiquetteBranche}) le Canvas du shell doit porter le GraphicRaycaster qu'un vrai " +
                "doigt traverse (AppShell.BuildLayout le pose sur ShellCanvas).");
            Assert.IsNotNull(EventSystem.current,
                $"({etiquetteBranche}) aucun EventSystem.current — AppShell.EnsureEventSystem() doit avoir tourné.");
            Assert.IsTrue(ProductionClickSupport.HasActiveInputModule(EventSystem.current, out string diagnosticModuleSortie),
                $"({etiquetteBranche}) EventSystem.current n'a AUCUN module d'entrée actif " +
                $"({diagnosticModuleSortie}) — EventSystem.RaycastAll (juste en dessous) ne le voit " +
                "JAMAIS, donc cette garde de collision resterait VERTE même si AUCUN tap ne pouvait " +
                "jamais être dispatché en production (round 7, BLOQUANT 1, sur le site jumeau).");

            var rectTete = (RectTransform)boutonTeteT;
            Vector2 centreTete = RectTransformUtility.WorldToScreenPoint(
                null, rectTete.TransformPoint(rectTete.rect.center));
            var donneesTete = new PointerEventData(EventSystem.current) { position = centreTete };
            var resultatsTete = new List<RaycastResult>();
            EventSystem.current.RaycastAll(donneesTete, resultatsTete);

            Assert.IsTrue(resultatsTete.Count > 0,
                $"({etiquetteBranche}) un raycast au centre de l'action de tête ({centreTete}) ne " +
                "touche RIEN : la sortie est invisible au hit-testing, donc INATTEIGNABLE au doigt " +
                "même si son Button est interactable.");
            GameObject touche = resultatsTete[0].gameObject;
            Assert.IsTrue(touche == boutonTeteT.gameObject || touche.transform.IsChildOf(boutonTeteT),
                $"({etiquetteBranche}) le PREMIER objet touché au centre de l'action de tête doit " +
                $"être l'affordance elle-même (ou un de ses enfants graphiques) — trouvé " +
                $"« {touche.name} » — quel qu'il soit, IL avale le tap de sortie et le joueur reste " +
                "enfermé sur l'Accueil : la fermeture ne serait plus prouvée que par un clic routé " +
                "en direct, qu'aucun doigt ne peut reproduire.\n" +
                "DEUX avaleurs sont possibles et le contrôle négatif du round 8 a rencontré le " +
                "SECOND, pas celui qu'on attendait : (a) `DashboardBackdrop`, le fond plein écran " +
                "de l'overlay — c'est l'ordre de fratrie (ContentSlot < TopBarSlot) qui l'écarte ; " +
                "(b) `TopBarSlot` LUI-MÊME, dont l'Image transparente est raycastable et couvre " +
                "toute la barre — c'est le `raycastTarget` de l'affordance qui la fait gagner. " +
                "Armer le (b) rend bien ce message avec « TopBarSlot ». Ne pas conclure du nom " +
                "trouvé à la cause : les deux mondes produisent le même symptôme.");

            // ⛔⛔ ruling user 2026-08-27 (MAJEUR 4 débloqué, scope borné à CETTE affordance de
            // SORTIE) — LA GARDE PASSE DU POINT À L'AIRE. Un raycast au CENTRE (ci-dessus) reste
            // vrai quand les BORDS de la zone tactile sont avalés — c'est très exactement ce que
            // round 9 a nommé MAJEUR 4 : une garde qui prouve qu'un point mathématique atteint
            // l'affordance ne prouve jamais qu'un DOIGT (qui a une AIRE, pas un point) l'atteint.
            // Une garde qui vérifierait seulement que la zone tactile est DÉCLARÉE à ≥48 (un
            // paramètre) serait une garde sur le PARAMÈTRE, pas sur l'EFFET — socle CLAUDE.md,
            // « une garde sur les paramètres d'un effet n'est pas une garde sur son effet ».
            // ⇒ Deux assertions, jamais une seule : (a) la GRANDEUR — la zone tactile mesure ≥48
            // UNITÉS DE MAQUETTE sur les DEUX axes, lue sur `rectTete.rect` LUI-MÊME (jamais un
            // pixel d'écran) : ce sous-arbre vit ENTIÈREMENT en coordonnées de maquette
            // (`EchelleMaquette.LargeurHudBrennar = 392f`), un SEUL `localScale` le porte à
            // l'écran — dans `AppShell.BuildLayout()`, l'affectation `echelleRt.localScale = new
            // Vector3(k, k, 1f);` ; (b) l'EFFET — un raycast à CHACUN des 4 coins de cette zone
            // (retrait d'1 unité LOCALE pour ne jamais tomber pile sur la frontière) doit atterrir
            // sur l'affordance elle-même ou un de ses enfants — EXACTEMENT la même tolérance
            // `IsChildOf` que le centre ci-dessus.
            //
            // ⚠️⚠️ CORRIGÉ round 11 (revue ⊥, MAJEUR 1) — « (a) » ci-dessus écrivait « ≥48 dp … DANS
            // LE REPÈRE DE LA MAQUETTE », une contradiction dans les termes : `rect.width`/`height`
            // sont des UNITÉS DE MAQUETTE, JAMAIS des dp — elles ne le deviennent qu'après
            // multiplication par (largeurÉcranDp / 392), ET `rect.width` NE PEUT PAS varier avec la
            // résolution de test puisque `echelleRt` a une largeur locale FIXE de 392 (c'est le
            // localScale, pas le rect local, qui absorbe la largeur réelle de l'écran) — aucune
            // résolution de Game View ne peut donc faire rougir un seuil exprimé en dp ici, ce que
            // la revue a nommé « aggravant ». La conversion est ALGÉBRIQUE (même idiome que
            // `ChromeMultiResolutionPlayModeTests.cs` : invariants dérivés du modèle du
            // `CanvasScaler`, jamais un re-rendu Play Mode par résolution — cette API interne est
            // délibérément non commitée comme mécanisme de test permanent).
            Assert.GreaterOrEqual(rectTete.rect.width, 48f,
                $"({etiquetteBranche}) la zone tactile de l'action de tête doit mesurer ≥48 UNITÉS " +
                $"DE MAQUETTE de large — trouvé {rectTete.rect.width}.");
            Assert.GreaterOrEqual(rectTete.rect.height, 48f,
                $"({etiquetteBranche}) la zone tactile de l'action de tête doit mesurer ≥48 UNITÉS " +
                $"DE MAQUETTE de haut — trouvé {rectTete.rect.height}.");

            // ⚠️⚠️ CORRIGÉ round 13 (revue ⊥, MAJEUR 2) — closure PARTIELLE, et le journal explique
            // pourquoi (§ MAJEUR 2, « ce qui n'a pas pu être fermé »). Le correctif PRESCRIT
            // (mesurer via `GetWorldCorners` → `WorldToScreenPoint` → fraction de `Screen.width`) a
            // été ÉCRIT, EXÉCUTÉ, et a mis au jour une DIVERGENCE non liée à ce lot — hors périmètre
            // 0.2/0.3/0.3-bis, consignée séparément, PAS devinée ni corrigée ici. Ce qui EST fermé,
            // et c'est le cœur du MAJEUR 2 : la PRÉMISSE qui fait de « 44,1 dp » un fait physique
            // (le nœud `TopBarEchelle` existe et porte la largeur locale attendue) est désormais
            // ASSERTÉE — round 11 ne l'assertait nulle part.
            Transform echelleT = shell.TopBarSlot.Find("TopBarEchelle");
            Assert.IsNotNull(echelleT,
                $"({etiquetteBranche}) `TopBarEchelle` doit exister sous `TopBarSlot` — c'est le " +
                "SEUL nœud qui porte le `localScale` reliant les unités de maquette à l'écran ; " +
                "sans lui, « dp physiques » ne décrit RIEN de physique.");
            var echelleRect = (RectTransform)echelleT;
            float largeurMaquetteAttendue =
                ProductionClickSupport.GetPrivateConstFloat(typeof(AppShell), "TopBarLargeurCss");
            Assert.AreEqual(largeurMaquetteAttendue, echelleRect.sizeDelta.x, 0.01f,
                $"({etiquetteBranche}) `TopBarEchelle.sizeDelta.x` doit valoir `AppShell." +
                $"TopBarLargeurCss` ({largeurMaquetteAttendue}) — c'est CETTE largeur locale FIXE " +
                "qui fait que `rect.width` du bouton de tête est une unité de MAQUETTE, jamais une " +
                "unité d'écran.");
            // ⛔⛔ CORRIGÉ round 15 (revue ⊥ round 14, BLOQUANT) — `Assert.Greater(…, 0f)` (round
            // 13) durcissait sur le SIGNE là où le défaut vivait dans la MAGNITUDE : la valeur
            // FAUTIVE mesurée en production ce jour-là (`Screen.width/392 = 1,632653`) est
            // STRICTEMENT POSITIVE — l'assertion serait restée VERTE à travers l'événement exact
            // qu'elle prétendait détecter (socle CLAUDE.md, « l'aiguille inversée »). La MAGNITUDE
            // attendue est `ReferenceResolutionWidth / TopBarLargeurCss`, lue PAR RÉFLEXION sur
            // `AppShell` (jamais recopiée — un renommage doit rougir ce test, pas le rendre
            // silencieusement inerte). Contrôle positif : `TopBarEchelle_LocalScaleMagnitude_
            // PositiveControl_WrongFactorIsDetected`, plus bas dans ce fichier.
            float referenceResolutionWidthAttendue =
                ProductionClickSupport.GetPrivateConstFloat(typeof(AppShell), "ReferenceResolutionWidth");
            float facteurEchelleAttendu = referenceResolutionWidthAttendue / largeurMaquetteAttendue;
            Assert.AreEqual(facteurEchelleAttendu, echelleRect.localScale.x, 0.001f,
                $"({etiquetteBranche}) `TopBarEchelle.localScale.x` doit valoir `AppShell." +
                $"ReferenceResolutionWidth / AppShell.TopBarLargeurCss` = {facteurEchelleAttendu:F6} " +
                $"— trouvé {echelleRect.localScale.x:F6}. Une valeur proche de `Screen.width/392` " +
                "(round 14 en a mesuré 1,632653 à `Screen.width=640`) signale que `AppShell.Px()` a " +
                "de nouveau lu la géométrie du Canvas au lieu de la constante de référence.");

            // ⛔⛔ CORRIGÉ round 15 (revue ⊥ round 14, BLOQUANT 1 + finding « le message livré à
            // l'user est FAUX sur l'appareil »). Round 11 conservait ici une conversion ALGÉBRIQUE
            // pure (`rectTete.rect.width × 360/392`, JAMAIS un pixel rendu) — round 13 avait tenté
            // la mesure RÉELLE prescrite par round 12 (`GetWorldCorners` → `WorldToScreenPoint`), l'a
            // trouvée EN DÉSACCORD avec l'algèbre (22,0 dp mesuré contre 44,1 dp algébrique) et a
            // RESTAURÉ l'algèbre en attendant qu'un ⊥ frais tranche la divergence — CE round 14/15
            // vient de le faire : la divergence était `AppShell.Px()` lisant `Screen.width` au lieu
            // de `ReferenceResolutionWidth` (BLOQUANT ci-dessus, corrigé). L'algèbre ne mesurait
            // qu'un PARAMÈTRE (`rectTete.rect.width`, une constante de maquette que `k` ne touche
            // JAMAIS) — pas l'EFFET rendu (socle CLAUDE.md, « une garde sur les PARAMÈTRES d'un
            // effet n'est pas une garde sur son EFFET ») ; c'est ce qui la rendait VRAIE EN THÉORIE
            // et FAUSSE SUR L'APPAREIL tant que `k` restait cuit sur `Screen.width`.
            // ⇒ La mesure RÉELLE round 12 est donc RESTAURÉE ici — et elle est désormais SÛRE :
            // `k` n'étant plus lu sur le rect du Canvas, elle ne peut plus diverger de l'algèbre.
            // Prédiction, vérifiée par le run de ce round (§ notes) : à `Screen.width=640`
            // (batchmode), `48 × k_juste(3,265306) × scaleFactor(0,5) = 78,367 px` ⇒
            // `78,367/640 × 360 = 44,08 dp` — CONVERGE avec l'algèbre round 11, et le calcul montre
            // que cette convergence tient à N'IMPORTE QUEL `Screen.width` (le facteur s'annule :
            // `k_juste × (Screen.width/1280) / Screen.width` ne dépend plus de `Screen.width`) —
            // contrairement à AVANT ce round, où seule la coïncidence `Screen.width=1280` aurait
            // fait converger les deux méthodes.
            const float LargeurEcranDpModale = 360f; // la plus étroite couramment supportée
            var coinsMondeTete = new Vector3[4];
            rectTete.GetWorldCorners(coinsMondeTete); // [0]=bas-gauche, [2]=haut-droit (Unity, sens horaire)
            Vector2 basGaucheEcranTete = RectTransformUtility.WorldToScreenPoint(null, coinsMondeTete[0]);
            Vector2 hautDroitEcranTete = RectTransformUtility.WorldToScreenPoint(null, coinsMondeTete[2]);
            float largeurEcranPxTete = Mathf.Abs(hautDroitEcranTete.x - basGaucheEcranTete.x);
            float hauteurEcranPxTete = Mathf.Abs(hautDroitEcranTete.y - basGaucheEcranTete.y);
            float dpLargeurModale = (largeurEcranPxTete / Screen.width) * LargeurEcranDpModale;
            float dpHauteurModale = (hauteurEcranPxTete / Screen.width) * LargeurEcranDpModale;
            Assert.AreEqual(44.1f, dpLargeurModale, 0.5f,
                $"({etiquetteBranche}) ÉCART CONNU, REMONTÉ — à 360 dp de large (largeur modale " +
                $"Android), la zone tactile RENDUE (mesurée via GetWorldCorners/WorldToScreenPoint, " +
                $"pas une algèbre sur un paramètre) ne mesure QUE {dpLargeurModale:F1} dp physiques " +
                "(sous le seuil de 48). Cette assertion épingle la valeur RÉELLEMENT RENDUE : si " +
                "elle s'écarte de 44,1±0,5, la géométrie a changé — soit l'arbitrage user (grandir " +
                "la zone) a été rendu (corriger cette assertion), soit `AppShell.Px()` a régressé " +
                "vers le défaut round 14 (NE PAS corriger cette assertion — corriger `Px()`).");
            Assert.AreEqual(44.1f, dpHauteurModale, 0.5f,
                $"({etiquetteBranche}) même écart connu, sur la hauteur, MESURÉ (pas algébrique) — trouvé {dpHauteurModale:F1} dp.");

            var coinsLocauxTete = new[]
            {
                new Vector2(rectTete.rect.xMin + 1f, rectTete.rect.yMin + 1f),
                new Vector2(rectTete.rect.xMax - 1f, rectTete.rect.yMin + 1f),
                new Vector2(rectTete.rect.xMin + 1f, rectTete.rect.yMax - 1f),
                new Vector2(rectTete.rect.xMax - 1f, rectTete.rect.yMax - 1f),
            };
            foreach (Vector2 coinLocal in coinsLocauxTete)
            {
                Vector2 coinEcran = RectTransformUtility.WorldToScreenPoint(null, rectTete.TransformPoint(coinLocal));
                var donneesCoin = new PointerEventData(EventSystem.current) { position = coinEcran };
                var resultatsCoin = new List<RaycastResult>();
                EventSystem.current.RaycastAll(donneesCoin, resultatsCoin);
                Assert.IsTrue(resultatsCoin.Count > 0,
                    $"({etiquetteBranche}) un raycast au coin {coinLocal} (local) de la zone tactile " +
                    $"de l'action de tête (écran {coinEcran}) ne touche RIEN — les BORDS de la zone " +
                    "sont avalés même si son CENTRE est atteignable.");
                GameObject toucheCoin = resultatsCoin[0].gameObject;
                Assert.IsTrue(toucheCoin == boutonTeteT.gameObject || toucheCoin.transform.IsChildOf(boutonTeteT),
                    $"({etiquetteBranche}) le coin {coinLocal} (local) de la zone tactile doit " +
                    $"atteindre l'affordance elle-même (ou un de ses enfants graphiques) — trouvé " +
                    $"« {toucheCoin.name} ». Un coin avalé est un doigt qui rate la cible alors " +
                    "qu'un raycast au centre seul la certifierait quand même.");
            }

            // ⛔ LE GESTE DE PRODUCTION — jamais `shell.ExitToCityMap()` ni `.onClick.Invoke()` nu.
            ProductionClickSupport.Click(boutonTete);
            yield return null; // laisse le Object.Destroy déféré de UnmountCurrentTenant s'exécuter

            DashboardController overlayApres = shell.ContentSlot.GetComponentInChildren<DashboardController>(true);
            Assert.IsNull(overlayApres,
                $"({etiquetteBranche}) après le clic RÉEL sur l'action de tête, l'overlay Accueil ne " +
                "doit PLUS être sous ContentSlot (includeInactive:true — une survivance seulement " +
                "DÉSACTIVÉE compterait encore comme un défaut de démontage, pas comme une réussite).");
            Assert.AreEqual(typeof(CityMapController), shell.MountedTenantType,
                $"({etiquetteBranche}) après le clic RÉEL sur l'action de tête, la carte doit être le locataire d'onglet monté");
            Assert.IsNotNull(shell.MountedTenantGameObject, $"un GameObject de locataire doit exister ({etiquetteBranche})");
            Assert.IsTrue(shell.MountedTenantGameObject.transform.IsChildOf(shell.ContentSlot),
                $"({etiquetteBranche}) le locataire remonté doit être un descendant de ContentSlot — confinement, pas juste 'existe quelque part'.");

            Debug.Log($"[Charpente] F-B (round 7, {etiquetteBranche}) — le clic RÉEL sur l'action de " +
                      "tête ('←') ferme l'overlay Accueil et révèle CityMapController.");
        }

        // ══════════════════════════════════════════════════════════════════════════════════════
        // ROUND 15 (revue ⊥ round 14, BLOQUANT) — CONTRÔLE POSITIF de la garde de MAGNITUDE
        // ci-dessus. Patron déjà établi par `ChromeMultiResolutionPlayModeTests.
        // MultiRes_TopBarClusters_PositiveControl_DegenerateWidth_IsDetected` : ne PAS re-jouer
        // Play Mode avec un Canvas dégénéré (coûteux, et la classe de défaut n'a pas besoin d'un
        // Canvas réel pour être démontrée) — recalculer la MÊME comparaison, sur un jeu de valeurs
        // qui REPRODUIT EXACTEMENT le défaut mesuré en production round 14 (`k = Screen.width/392`
        // au lieu de `1280/392`), et prouver qu'elle NE PASSE PAS le seuil de tolérance. Sans ce
        // test, rien ne prouve que la garde ci-dessus PEUT rougir — elle pourrait être aveugle par
        // construction, exactement comme celle qu'elle remplace.
        // ══════════════════════════════════════════════════════════════════════════════════════
        [Test]
        public void TopBarEchelle_LocalScaleMagnitude_PositiveControl_WrongFactorIsDetected()
        {
            float referenceResolutionWidth =
                ProductionClickSupport.GetPrivateConstFloat(typeof(AppShell), "ReferenceResolutionWidth");
            float largeurMaquette =
                ProductionClickSupport.GetPrivateConstFloat(typeof(AppShell), "TopBarLargeurCss");
            float facteurAttendu = referenceResolutionWidth / largeurMaquette;

            // Le monde DÉGÉNÉRÉ à tuer : `k` calculé avec `Screen.width` (640, la valeur mesurée en
            // batchmode round 14) AU LIEU de `ReferenceResolutionWidth` — c'est-à-dire EXACTEMENT
            // le défaut round 14, rejoué en arithmétique pure plutôt qu'en Canvas réel.
            const float ScreenWidthMesureRound14 = 640f;
            float facteurFautifMesureRound14 = ScreenWidthMesureRound14 / largeurMaquette;

            // `Assert.AreNotEqual` n'a pas d'overload à tolérance fiable pour des `float` — un
            // écart calculé À LA MAIN, comparé à un plancher, évite toute ambiguïté de signature.
            Assert.Greater(Mathf.Abs(facteurAttendu - facteurFautifMesureRound14), 0.5f,
                "PRÉCONDITION du contrôle : le facteur fautif round 14 (1,632653) et le facteur " +
                "juste (3,265306) doivent différer largement — sinon ce contrôle ne prouve rien.");

            // La même assertion que `VerifierFermetureParActionDeTete`, appliquée à la valeur
            // FAUTIVE : DOIT rougir (donc on l'enveloppe et on vérifie qu'elle lève).
            Assert.Throws<AssertionException>(() =>
                Assert.AreEqual(facteurAttendu, facteurFautifMesureRound14, 0.001f),
                "CONTRÔLE POSITIF : la garde de magnitude DOIT rejeter le facteur fautif round 14 " +
                "(1,632653, mesuré en production) — sinon le 0 sur `AppShell.Px()` réel ne prouve " +
                "rien (la garde pourrait être aveugle à la classe de défaut qu'elle existe pour " +
                "attraper, exactement comme `Assert.Greater(…, 0f)` qu'elle remplace).");

            // Second monde dégénéré, à un autre point de la plage réelle (1080p, round 14 § BLOQUANT
            // 1) — pour ne pas ne prouver la détection qu'à UNE seule valeur fautive.
            const float ScreenWidth1080 = 1080f;
            float facteurFautif1080 = ScreenWidth1080 / largeurMaquette;
            Assert.Throws<AssertionException>(() =>
                Assert.AreEqual(facteurAttendu, facteurFautif1080, 0.001f),
                "CONTRÔLE POSITIF (1080p) : même garde, même exigence — le facteur fautif à " +
                "Screen.width=1080 doit lui aussi être rejeté.");
        }
    }
}
