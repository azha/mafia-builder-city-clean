using System.Collections;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
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
            DashboardController dashboard = shell.ContentSlot.GetComponentInChildren<DashboardController>(true);
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
                bouton.onClick.Invoke(); // ⛔ LE GESTE DE PRODUCTION — jamais dashboard.OpenXxx() appelé directement
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
            ouvrir.onClick.Invoke(); // ⛔ LE GESTE DE PRODUCTION — jamais queue.OpenDetail(card) appelé directement
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
    }
}
