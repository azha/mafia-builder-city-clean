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
        // ⛔⛔ ÉCART AU RULING (ruling user 2026-08-25, ratifié, front.md §4) — LU EN TÊTE, PAS ENTERRÉ
        // DANS UNE DEVIATION. Le ruling dit : « posée en surimpression au-dessus de l'Empire, PUIS ON
        // TOMBE SUR LA VILLE. » CE LOT NE LIVRE QUE LA PREMIÈRE MOITIÉ — round 4 a trouvé que l'overlay
        // Accueil ne pose AUCUNE affordance de fermeture dédiée, et le contrôleur a tranché
        // (2026-08-26, en réponse à l'escalade round 4) : PAS de bouton dans ce lot de charpente.
        // Raisons : (1) aucun mécanisme de démontage n'existe dans `IShellNavigator`/`IShellTenant` —
        // `MonterLocataireEnSurimpression<T>` MONTE, rien ne DÉMONTE ; (2) le geste et sa copie ne
        // sont spécifiés NULLE PART dans ce qui est consultable depuis ce dépôt ; (3) l'item 0.5
        // construit PRÉCISÉMENT l'écran ④ (l'Accueil) — c'est SON chrome qui portera la sortie.
        // Inventer un bouton ici aurait posé du produit non ratifié dans un lot de charpente.
        //
        // Un aveu n'est pas une épingle. Ce que CE round livre à la place : DEUX falsifiables.
        //   F-A (positive) — la ville reste atteignable en UN geste, par un mécanisme EXISTANT et
        //                     non-dédié : ce n'est PAS un cul-de-sac aujourd'hui.
        //   F-B (épingle)  — l'ABSENCE d'affordance DÉDIÉE est comptée, avec son mode d'emploi de
        //                     péremption écrit dans l'assertion : elle rougira le jour où l'item 0.5
        //                     pose la sortie propre de cet écran, et ce jour-là ELLE SE RETIRE.
        // ═════════════════════════════════════════════════════════════════════════════════════════

        // F-A — LA VILLE EST ATTEIGNABLE EN UN GESTE DE PRODUCTION DEPUIS LE DÉMARRAGE, MALGRÉ
        // L'ABSENCE D'AFFORDANCE DE FERMETURE DÉDIÉE. Mécanisme EXISTANT, pas neuf : `AppShell.
        // UnmountCurrentTenant()` détruit TOUT enfant direct de `ContentSlot` avant de monter le
        // nouveau tenant d'onglet — « ContentSlot est la source de vérité unique de ce qui est
        // affiché maintenant » (son propre commentaire). L'overlay Dashboard (host + backdrop + sheet,
        // tous parentés SOUS ContentSlot par `MonterLocataireEnSurimpression`, `root = mountParent =
        // ContentSlot` dans `DashboardController.BuildLayout`) est donc DÉTRUIT par N'IMPORTE QUELLE
        // activation d'onglet — y compris re-taper la bulle Empire déjà active (`ActivateTab` est
        // « idempotent-ish : re-activating the SAME tab still remounts », son propre commentaire).
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
                      "ContentSlot ; PAS un cul-de-sac, malgré l'absence d'affordance de fermeture dédiée.");
        }

        // F-B — L'ÉPINGLE QUI SE RETOURNERA (patron `toBe(404)` du socle CLAUDE.md : un test qui
        // épingle un bug/trou RATIFIÉ, AVEC son mode d'emploi de péremption, et qui rougit le jour où
        // le trou est refermé). Épingle une VALEUR PRÉSENTE — l'ENSEMBLE NOMMÉ des `Button` sous la
        // racine VISIBLE du Dashboard (`DashboardSheet` — le host `DashboardController` lui-même n'a
        // AUCUN enfant, son UI est parentée SOUS `ContentSlot` par `BuildLayout`,
        // `root = mountParent = ContentSlot` ; `DashboardSheet` est son conteneur visible réel) —
        // JAMAIS une absence vague. Aujourd'hui : EXACTEMENT {Nav_CityMap, Nav_BuildingCard,
        // Nav_Filière, Nav_Exceptions, Nav_Autonomy}, un par appel à `AddNavButton`
        // (`DashboardController.BuildLayout`) — AUCUN n'est une affordance de FERMETURE, tous
        // mènent à une destination nommée (`NewUI("Nav_" + label.Replace(" ",""), …)` — le NOM du
        // GameObject porte le nom de la destination, pas un index).
        //
        // ⛔⛔ CORRIGÉ round 5 (revue ⊥, MAJEUR 2) — round 4 épinglait un COMPTE NU (`== 5`), avec un
        // mode d'emploi qui prescrivait, SUR LE ROUGE LE PLUS PROBABLE, exactement le mauvais geste :
        // « le compte a changé ⇒ TRÈS PROBABLEMENT l'item 0.5 a livré la sortie ⇒ retire ce test,
        // coche le ruling ». Faux sur sa propre prémisse — CE DÉPÔT ANNONCE LUI-MÊME DEUX causes
        // concurrentes, NI L'UNE NI L'AUTRE une affordance de fermeture, qui font TOUTES DEUX monter
        // ce compte au-delà de 5 :
        //   (1) le `ShortcutBar` que l'item 0.5 doit poser sur CET écran (le commentaire M1 de
        //       `DashboardController.cs:42`, « the ShortcutBar … is still NOT built here ») — des
        //       boutons de RACCOURCI, pas une sortie ;
        //   (2) le libellé « Marché » prévu pour l'onglet Filière/Pipeline au jalon 4
        //       (`AppShell.cs:776,795`, « pas avant que screen_b1 existe ») — si `screen_b1` gagne
        //       SA PROPRE destination `AddNavButton` le jour où il existe, c'est un 6ᵉ `Nav_*`, pas
        //       une sortie non plus.
        // Un compte NU ne distingue AUCUNE de ces deux causes d'une vraie fermeture — c'est la MÊME
        // classe « garde d'ENSEMBLE aveugle à la CORRESPONDANCE » que ce document a déjà été forcé de
        // fermer au round 2 (F0.2, libellés) : la ferme ICI en épinglant l'ENSEMBLE NOMMÉ, pas le
        // nombre — un rouge nomme alors EXACTEMENT ce qui est apparu/disparu.
        // ⛔⛔ MODE D'EMPLOI DE PÉREMPTION, RÉÉCRIT ICI : SI CE TEST ROUGIT, LIRE LE DIFF DE NOMS QUE
        // L'ASSERTION IMPRIME et distinguer, PAR LE NOM, LAQUELLE des causes possibles s'est
        // produite AVANT de toucher au ruling :
        //   (a) un nom NOUVEAU commençant par `Nav_` (une destination de plus, p.ex. `Nav_Marche`
        //       si screen_b1 gagne son bouton) ⇒ PAS une fermeture — ÉLARGIR l'ensemble attendu
        //       ci-dessous pour l'inclure, garder ce test ;
        //   (b) un nom NOUVEAU sous un conteneur `ShortcutBar` (ou nommé explicitement autour d'un
        //       raccourci) ⇒ PAS une fermeture — même geste que (a) ;
        //   (c) un nom NOUVEAU dont l'intitulé désigne EXPLICITEMENT une fermeture/sortie (contient
        //       « Close »/« Fermer »/« Dismiss »/« Exit » — à vérifier au cas par cas, cette liste
        //       n'est pas un motif figé) ⇒ SEUL CE CAS est la seconde moitié du ruling livrée :
        //       (1) relire cette note et § ÉCART AU RULING / Deviation 10 dans
        //       `Tools/charpente-item0-2-3-implementation-notes.md`, (2) RETIRER ce test,
        //       (3) cocher, dans front.md/le ruling, « puis on tombe sur la ville » comme livrée
        //       PAR SON PROPRE bouton.
        // ⛔ Ne JAMAIS cocher le ruling ou retirer ce test sur la seule foi d'un rouge — le nom du
        // delta décide, pas le fait qu'il y ait eu un delta.
        [UnityTest]
        public IEnumerator FB_AucuneAffordanceDeFermetureSousLOverlay_EpingleAvecSonModeDEmploiDePeremption()
        {
            yield return ChargerLaSceneDeDemarrageDuBuild();
            AppShell shell = SondeShellDansLaScene(sceneDeDemarrage);
            Assert.IsNotNull(shell, $"aucun AppShell dans la scène de démarrage du build ({sceneDeDemarrage.path})");
            yield return WaitForEmpireMounted(shell);
            yield return null;

            DashboardController dashboard = shell.ContentSlot.GetComponentInChildren<DashboardController>(false);
            Assert.IsNotNull(dashboard, "précondition : l'overlay Accueil doit être monté pour que ce compte ait un sens");

            // ⛔ MESURÉ (pas déduit) : `BuildNav()` — qui pose les 5 boutons — n'est appelée QUE
            // depuis `Render()`/`RenderError()` (après le chargement réseau du wallet), JAMAIS depuis
            // `BuildLayout()` (synchrone). Sans cette attente, le compte est pris AVANT que `BuildNav`
            // n'ait tourné — mesuré : 0 trouvé, faux négatif pur, pas le fait que ce test épingle.
            float elapsedLoad = 0f;
            while (!dashboard.DashboardLoaded && dashboard.WalletError == null && elapsedLoad < 30f)
            {
                elapsedLoad += Time.deltaTime;
                yield return null;
            }
            Assert.IsTrue(dashboard.DashboardLoaded || dashboard.WalletError != null,
                $"le Dashboard doit avoir résolu (chargé OU erreur) avant de compter ses boutons — " +
                $"walletErr={dashboard.WalletError}");

            Transform sheet = TrouverDescendant(shell.ContentSlot, "DashboardSheet");
            Assert.IsNotNull(sheet, "'DashboardSheet' (la carte visible du Dashboard) doit exister sous ContentSlot");

            // round 5 (revue ⊥, MAJEUR 2) — l'ENSEMBLE NOMMÉ, pas le compte : chaque `AddNavButton`
            // nomme son GameObject `"Nav_" + label.Replace(" ", "")` (DashboardController.cs:685) —
            // le nom PORTE la destination, jamais un index qu'un réordonnancement ferait dériver.
            var nomsAttendus = new List<string>
            {
                "Nav_CityMap", "Nav_BuildingCard", "Nav_Filière", "Nav_Exceptions", "Nav_Autonomy",
            };
            List<string> nomsTrouves = sheet.GetComponentsInChildren<Button>(true)
                .Select(b => b.gameObject.name).ToList();

            CollectionAssert.AreEquivalent(nomsAttendus, nomsTrouves,
                "ÉPINGLE round 5 (corrige round 4, décision contrôleur 2026-08-26, réponse à " +
                "l'escalade 'overlay sans sortie') — aujourd'hui, les boutons sous DashboardSheet " +
                $"sont EXACTEMENT {{{string.Join(", ", nomsAttendus)}}}, AUCUN n'est une sortie/" +
                "fermeture de l'écran d'accueil lui-même (le ruling 'puis on tombe sur la ville' n'a " +
                "QUE le mécanisme générique de F-A ci-dessus, pas d'affordance dédiée). " +
                $"SI CET ENSEMBLE A CHANGÉ (trouvé {{{string.Join(", ", nomsTrouves)}}}) : NE PAS " +
                "cocher le ruling sur ce seul rouge — DEUX causes connues et concurrentes changent " +
                "cet ensemble SANS jamais poser de sortie : (1) le ShortcutBar de l'item 0.5 " +
                "(DashboardController.cs:42, commentaire M1) ajoute des boutons de RACCOURCI ; " +
                "(2) le libellé 'Marché' au jalon 4 (AppShell.cs:776,795) peut faire gagner à " +
                "screen_b1 sa propre destination Nav_Marche. Un nom NOUVEAU préfixé 'Nav_' (ou posé " +
                "sous un conteneur de raccourcis) N'EST PAS une fermeture : ÉLARGIR nomsAttendus " +
                "ci-dessus et garder ce test. SEUL un nom NOUVEAU désignant EXPLICITEMENT une " +
                "fermeture/sortie (Close/Fermer/Dismiss/Exit) justifie de (1) relire " +
                "Tools/charpente-item0-2-3-implementation-notes.md (§ ÉCART AU RULING / Deviation " +
                "10), (2) RETIRER ce test, (3) cocher la seconde moitié du ruling comme livrée.");

            Debug.Log($"[Charpente] F-B — {{{string.Join(", ", nomsTrouves)}}} épinglés sous " +
                      "DashboardSheet (ENSEMBLE NOMMÉ, round 5), aucune affordance de fermeture " +
                      "dédiée — voir mode d'emploi de péremption dans l'assertion.");
        }
    }
}
