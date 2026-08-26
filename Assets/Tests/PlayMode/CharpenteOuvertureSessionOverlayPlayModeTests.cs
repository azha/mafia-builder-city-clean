using System.Collections;
using System.Collections.Generic;
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
        // Réfutée par TROIS artefacts DE CE LOT, déjà présents avant ce round : `AppShell.cs:298`
        // (`ExitToCityMap() => ActivateTab(Tab.Empire)`), `Tools/charpente-item0-2-3-design.md:109`
        // et `:146` (F0.3-bis : « l'action de tête du bandeau (« ← Carte ») ramène à la carte »), et
        // F-A elle-même (ci-dessous), qui prouve depuis longtemps qu'une activation d'onglet détruit
        // l'overlay — le RETOUR à la carte était déjà résolu pour le district, jamais rebranché ici.
        //
        // Geste, ZÉRO mécanisme neuf : `TopBar.SetLeadingAction(TopBarController.LeadingAction.
        // BackToMap, ExitToCityMap)`, DEUX lignes, posées APRÈS `MonterLocataireEnSurimpression
        // <DashboardController>()` sur les DEUX branches d'`AcquireSessionThenActivateHome`
        // (`AppShell.cs`, branche repli-échec et branche succès) — APRÈS, parce qu'`ActivateTab`
        // remet l'action de tête à `None` (son propre reset défensif) : la poser avant l'aurait
        // fait écraser. La copie n'est pas inventée : « ← Carte » (le libellé rendu par `LabelFor`,
        // TopBarController.cs) désigne exactement la destination, EXACTEMENT le même geste déjà
        // câblé pour sortir d'un district.
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
    }
}
