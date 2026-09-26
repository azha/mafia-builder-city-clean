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
        // ⛔ TD-576, CLASSE « CATALOGUE » (2026-09-23) — cette classe charge le catalogue i18n (directement, ou en montant un
        // écran / le shell / la scène du build qui l'amorce) et ne le rendait JAMAIS : global statique, il passait à la classe
        // suivante. Mesuré : le 1er cas d'`ArchetypeServi_…` a hérité d'un bundle réel laissé en amont. Rendu à chaque test ;
        // la garde de sortie de MafiaCI nomme toute classe qui le laisserait encore chargé.
        [TearDown] public void OublierLeCatalogue() => MafiaCleanCity.I18n.I18nCatalog.Oublier();

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

            var handlesAvant = new HashSet<int>();
            for (int i = 0; i < SceneManager.sceneCount; i++)
                handlesAvant.Add(SceneManager.GetSceneAt(i).handle);

            AsyncOperation chargement = SceneManager.LoadSceneAsync(0, LoadSceneMode.Additive);
            Assert.IsNotNull(chargement, "LoadSceneAsync(0) a refusé l'index de build 0");
            while (!chargement.isDone) yield return null;

            sceneDeDemarrage = default;
            for (int i = 0; i < SceneManager.sceneCount; i++)
            {
                Scene candidate = SceneManager.GetSceneAt(i);
                if (candidate.path == chemin && !handlesAvant.Contains(candidate.handle))
                {
                    sceneDeDemarrage = candidate;
                    break;
                }
            }
            Assert.IsTrue(sceneDeDemarrage.IsValid() && sceneDeDemarrage.isLoaded,
                "la NOUVELLE instance de la scène d'index 0 n'est pas identifiable après chargement");
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
        // qu'un joueur l'a SOUS LES YEUX), puis chacun de ses 4 boutons nav atteint son écran
        // (un CLIC RÉEL sur chaque bouton — `Nav_CityMap`/`Nav_Filière`/
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
                // `BuildingCardController` n'est plus atteint par l'Accueil (2026-09-23, ruling A : le bouton « La fiche » la montait
                // VIDE) ; son seul geste est AMÉLIORER sur la fiche de ①, avec le bâtiment (EcranDistrict D1-D3).
                nameof(DashboardController), nameof(CityMapController),
                // ㊵ remplace ⑪ sur la nav Filière (2026-09-23, ruling de f2 : ⑪ et ⑫ sortent du chemin joueur).
                nameof(FiliereScreenController), nameof(ExceptionQueueController), nameof(AutonomyInboxController),
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
                "ExceptionQueueController/AutonomyInboxController/ExceptionDetailController " +
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

            Assert.IsNull(TrouverDescendant(shell.ContentSlot, "Nav_BuildingCard"),
                "le bouton « La fiche » est retiré (ruling A du 25/08 : un bouton qui ment est pire qu'un bouton absent)");

            CliquerBoutonNav("Nav_Filière");
            yield return null;
            Assert.IsNotNull(dashboard.LastNavGameObject?.GetComponent<FiliereScreenController>(),
                "Nav_Filière doit atteindre ㊵ FiliereScreenController (clic réel sur le bouton du Dashboard)");
            ecransAtteints.Add(nameof(FiliereScreenController));

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

            // ⛔⛔ TD-577 RÉSOLU — CE TEST ÉTAIT PÉRIMÉ, PAS L'ÉCRAN. Il cherchait une ligne
            // nommée `Card_<exception_id>`, produite par `ExceptionQueueController.AddCardRow`.
            // Mesuré le 2026-09-03 : cette méthode a **ZÉRO appelant** — la file a été redessinée
            // en « comptoir » (trois `Attendant{i}` qui attendent), et `AddCardRow` est du code mort
            // que plus personne n'exécute. Le rouge n'a donc jamais dit « la carte servie n'est pas
            // affichée » : il disait « je cherche un objet d'un design précédent ».
            // ★ CE QU'IL A FALLU POUR LE SAVOIR : l'assertion d'origine était un `IsNotNull` dont le
            //   message ne portait QUE l'identifiant cherché. Trois runs pour l'attribuer, et deux
            //   sondes successives pour trancher — d'abord « 0 ligne sous ContentSlot » (qui ne
            //   distingue pas *bâtie ailleurs* de *jamais bâtie*), puis la recherche dans TOUTE la
            //   scène : **0 partout**, donc rien n'était bâti sous CE nom. *Une assertion qui ne
            //   rapporte que ce qu'elle attendait fait payer trois runs à celui qui la trouve rouge.*
            // ⇒ La propriété que ce test doit prouver n'a pas changé : depuis la file, un geste de
            //   PRODUCTION atteint ⑩. Elle se prouve sur l'objet que l'écran construit VRAIMENT.
            Transform attendant = TrouverDescendant(shell.ContentSlot, "Attendant0");
            if (attendant == null)
            {
                var vus = new List<string>();
                foreach (Transform t in shell.ContentSlot.GetComponentsInChildren<Transform>(true))
                    if (t.name.StartsWith("Attendant")) vus.Add(t.name);
                Assert.Fail("aucun `Attendant0` sous ContentSlot — la file n'a rendu personne."
                    + " cartes servies : " + queue.Cards.Length
                    + " · `Attendant*` trouvés : " + (vus.Count == 0 ? "aucun" : string.Join(", ", vus))
                    + " · écran de file : " + (queue.gameObject.activeInHierarchy ? "actif" : "INACTIF"));
            }
            Button ouvrir = attendant.GetComponent<Button>();
            Assert.IsNotNull(ouvrir,
                "l'attendant doit PORTER le bouton qui ouvre sa carte — c'est le chemin joueur vers ⑩ "
                + "(`RendreFile` pose une cible de toucher invisible sur chaque attendant). Sans lui, "
                + "l'écran montre trois interlocuteurs dont aucun n'est joignable.");
            // ⛔ round 4 (revue ⊥, BLOQUANT) — ProductionClickSupport.Click passe PAR l'EventSystem
            // plutôt que d'invoquer la UnityEvent nue, jamais `queue.OpenDetail(card)` en direct.
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
                      "ContentSlot ; un chemin générique, qui coexiste avec le retour du système " +
                      "(F-B, ci-dessous — la flèche du bandeau est retirée, §C.14).");
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
        // ⛔ AMENDÉ (ARBITRAGES-user-2026-09-07 §C.14, passe UX du 2026-09-24) : la flèche est RETIRÉE du bandeau. Le geste dédié
        //    devient le retour du SYSTÈME (`AppShell.Depiler`) ; les deux branches prouvent en plus qu'aucune flèche n'est posée.
        //    Voir `VerifierFermetureParLeRetour`.
        [UnityTest]
        public IEnumerator FB_LeRetourFermeLOverlayEtRevelaLaVille_BrancheSucces()
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
            // `VerifierFermetureParLeRetour` passent quand même (elles sont IDENTIQUES sur les
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

            yield return VerifierFermetureParLeRetour(shell, "BRANCHE SUCCÈS");
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
        public IEnumerator FB_LeRetourFermeLOverlayEtRevelaLaVille_BrancheEchec()
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

                yield return VerifierFermetureParLeRetour(shell, "BRANCHE REPLI-ÉCHEC");
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
        // disparu, carte montée, confinement sous ContentSlot), déclenchée par LE RETOUR DU SYSTÈME
        // plutôt que par le dock.
        // ⛔ AMENDÉ (ARBITRAGES-user-2026-09-07 §C.14, passe UX du 2026-09-24) — la flèche « ← » du bandeau est RETIRÉE (« pas de
        //    domicile en série 6 »). Ce corps cliquait l'action de tête ; il prouve désormais (a) qu'elle n'est PLUS posée sur l'Accueil,
        //    (b) que le retour du système (`AppShell.Depiler`, Android/`Escape`) ferme l'overlay et révèle la ville. Les gardes de
        //    ZONE TACTILE de la flèche (raycast au centre et aux coins, ≥ 48 unités, l'écart connu de 44,1 dp) sortent avec elle ; les
        //    gardes d'ÉCHELLE du bandeau (`TopBarEchelle`, largeur du Canvas) restent : elles ne dépendaient pas de la flèche.
        private static IEnumerator VerifierFermetureParLeRetour(AppShell shell, string etiquetteBranche)
        {
            // ⛔ ANTI-VACUITÉ — sans cette précondition, un overlay jamais monté rendrait la
            // fermeture vraie À VIDE (rien à démonter).
            DashboardController overlayAvant = shell.ContentSlot.GetComponentInChildren<DashboardController>(false);
            Assert.IsNotNull(overlayAvant,
                $"précondition anti-vacuité ({etiquetteBranche}) : l'overlay Accueil doit être " +
                "RÉELLEMENT monté AVANT le retour.");
            Assert.IsTrue(shell.SurimpressionOuverte,
                $"({etiquetteBranche}) l'Accueil est une SURIMPRESSION au-dessus de l'Empire — c'est ce qui le rend dépilable.");

            // (a) §C.14 — plus de flèche : l'action de tête reste à None, son bouton est caché.
            Assert.AreEqual(TopBarController.LeadingAction.None, shell.TopBar.CurrentLeadingAction,
                $"({etiquetteBranche}) §C.14 — aucune flèche n'est posée sur l'Accueil.");
            Transform boutonTeteT = shell.TopBar.transform.Find("LeadingAction");
            Assert.IsNotNull(boutonTeteT, $"({etiquetteBranche}) le bouton de tête existe toujours (seule sa visibilité change)");
            Assert.IsFalse(boutonTeteT.gameObject.activeSelf, $"({etiquetteBranche}) §C.14 — la flèche n'est pas montrée");

            // Les gardes d'ÉCHELLE du bandeau (rounds 13-16) — inchangées, voir leur historique dans le contrôle positif plus bas.
            Transform echelleT = shell.TopBarSlot.Find("TopBarEchelle");
            Assert.IsNotNull(echelleT,
                $"({etiquetteBranche}) `TopBarEchelle` doit exister sous `TopBarSlot` — c'est le " +
                "SEUL nœud qui porte le `localScale` reliant les unités de maquette à l'écran.");
            var echelleRect = (RectTransform)echelleT;
            float largeurMaquetteAttendue =
                ProductionClickSupport.GetPrivateConstFloat(typeof(AppShell), "TopBarLargeurCss");
            Assert.AreEqual(largeurMaquetteAttendue, echelleRect.sizeDelta.x, 0.01f,
                $"({etiquetteBranche}) `TopBarEchelle.sizeDelta.x` doit valoir `AppShell." +
                $"TopBarLargeurCss` ({largeurMaquetteAttendue}).");
            float referenceResolutionWidthAttendue =
                ProductionClickSupport.GetPrivateConstFloat(typeof(AppShell), "ReferenceResolutionWidth");
            float facteurEchelleAttendu = referenceResolutionWidthAttendue / largeurMaquetteAttendue;
            Assert.AreEqual(facteurEchelleAttendu, echelleRect.localScale.x, 0.001f,
                $"({etiquetteBranche}) `TopBarEchelle.localScale.x` doit valoir `AppShell." +
                $"ReferenceResolutionWidth / AppShell.TopBarLargeurCss` = {facteurEchelleAttendu:F6} " +
                $"— trouvé {echelleRect.localScale.x:F6}. Une valeur proche de `Screen.width/392` " +
                "signale que `AppShell.Px()` a de nouveau lu la géométrie du Canvas au lieu de la constante de référence.");
            Assert.AreEqual(referenceResolutionWidthAttendue,
                ((RectTransform)shell.ShellCanvas.transform).rect.width, 0.01f,
                $"({etiquetteBranche}) le Canvas RÉEL du shell doit avoir une largeur locale == " +
                $"`AppShell.ReferenceResolutionWidth` ({referenceResolutionWidthAttendue}).");

            // (b) LE GESTE — le retour du système, tel que `AppShell.Update` le déclenche sur `Escape` (le retour d'Android).
            Assert.AreEqual("surimpression", shell.Depiler(),
                $"({etiquetteBranche}) le premier retour dépile l'overlay Accueil");
            yield return null; // laisse le Object.Destroy déféré de UnmountCurrentTenant s'exécuter

            DashboardController overlayApres = shell.ContentSlot.GetComponentInChildren<DashboardController>(true);
            Assert.IsNull(overlayApres,
                $"({etiquetteBranche}) après le retour, l'overlay Accueil ne " +
                "doit PLUS être sous ContentSlot (includeInactive:true — une survivance seulement " +
                "DÉSACTIVÉE compterait encore comme un défaut de démontage, pas comme une réussite).");
            Assert.AreEqual(typeof(CityMapController), shell.MountedTenantType,
                $"({etiquetteBranche}) après le retour, la carte doit être le locataire d'onglet monté");
            Assert.IsNotNull(shell.MountedTenantGameObject, $"un GameObject de locataire doit exister ({etiquetteBranche})");
            Assert.IsTrue(shell.MountedTenantGameObject.transform.IsChildOf(shell.ContentSlot),
                $"({etiquetteBranche}) le locataire remonté doit être un descendant de ContentSlot — confinement, pas juste 'existe quelque part'.");
            Assert.AreEqual("racine", shell.Depiler(), $"({etiquetteBranche}) sur la carte, le retour ne fait plus rien");

            Debug.Log($"[Charpente] F-B ({etiquetteBranche}) — le retour du système ferme l'overlay Accueil et révèle CityMapController ; " +
                      "aucune flèche n'est posée (§C.14).");
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

            // La même assertion que `VerifierFermetureParLeRetour`, appliquée à la valeur
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
