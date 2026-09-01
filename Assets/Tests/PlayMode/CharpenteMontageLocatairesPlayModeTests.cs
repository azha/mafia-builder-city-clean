using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.EventSystems; // F0.2-c (round 6, BLOQUANT) — EventSystem.current.RaycastAll réel
using UnityEngine.InputSystem.UI; // round 9 (revue ⊥, MINEUR m5) — InputSystemUIInputModule, contrôles négatifs 4/4
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.CityMap;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Operational.Autonomy;
using MafiaCleanCity.Operational.Exceptions;
using MafiaCleanCity.Operational.Lieutenant;
using MafiaCleanCity.Tests; // ProductionClickSupport (round 4, BLOQUANT)
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    // ITEM 0.4 de `front.md` (Tools/charpente-item0-4-design.md) — « les locataires montent DANS
    // le shell ». Avant ce lot, `DashboardController.OpenNav` et `ExceptionQueueController.OpenDetail`
    // créaient une racine de scène nue (`new GameObject($"Nav_{target}")`), jamais parentée sous
    // `ContentSlot` : le locataire qu'elle porte DÉCOUVRE alors le Canvas (`IShellTenant.cs`) et
    // étire un fond plein écran qui RECOUVRE TabBar + TopBar (design §1.1-§1.2, mesuré).
    //
    // MÊME patron que `CharpenteBootScenePlayModeTests` (scène de démarrage du build chargée PAR
    // SON INDEX, jamais par un chemin écrit à la main ; sonde scopée à la scène ; SetUp qui déclare
    // son régime ; TearDown qui décharge) — dupliqué ici plutôt que factorisé, pour ne pas toucher
    // à ce fichier existant (consigne du lot).
    [Category("Charpente")]
    public class CharpenteMontageLocatairesPlayModeTests
    {
        private Scene sceneDeDemarrage;

        // Même garde de co-tenance que CharpenteBootScenePlayModeTests.SetUp — un Canvas/AppShell
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
            // ⛔ C6 (revue ⊥ round 2) — CLASSE ENTIÈRE, pas seulement l'instance nommée : un
            // AppShell/Canvas résiduel n'est pas la SEULE pollution possible. La branche de repli
            // d'`OpenNav`/`OpenDetail` (item 0.4) crée une racine `Nav_*` NUE, jamais parentée
            // sous un AppShell — donc jamais atteinte par les deux boucles ci-dessus — qui
            // survivrait dans le domaine PlayMode et entrerait dans le balayage `IShellTenant` de
            // F0.4-a d'un test SUIVANT (rouge à tort, dépendant de l'ordre). On détruit donc TOUT
            // GameObject portant un `IShellTenant`, quelle que soit sa racine, et on IMPRIME le
            // compte (un dispositif conditionnel qui ne déclare pas son régime est indiscernable
            // d'un dispositif inerte).
            foreach (MonoBehaviour comportement in Object.FindObjectsByType<MonoBehaviour>(FindObjectsInactive.Include, FindObjectsSortMode.None))
            {
                if (comportement != null && comportement is IShellTenant)
                {
                    Object.DestroyImmediate(comportement.gameObject);
                    locatairesTues++;
                }
            }
            Debug.Log($"[Charpente] SetUp (montage locataires) — régime déclaré : {shellsTues} AppShell, " +
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

        /// <summary>L'INSTRUMENT, scopé à UNE scène par construction (même raison que
        /// CharpenteBootScenePlayModeTests.SondeShellDansLaScene) : un `FindFirstObjectByType&lt;AppShell&gt;()`
        /// nu répondrait « oui » pour n'importe quel shell construit ailleurs dans le même domaine PlayMode.</summary>
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
            // Le shell signe sa session au Start() (signin + session/open + sonde heat), et chaque
            // locataire ouvert dans ces falsifiables signe potentiellement la SIENNE (repli hors
            // shell, ou écran dont le compte démo n'est pas semé pour ce scénario précis) : ce bruit
            // est ORTHOGONAL, aucune assertion ci-dessous ne porte sur l'authentification en tant
            // que telle (même patron, même justification, que CharpenteBootScenePlayModeTests).
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

        // Même signal robuste que AppShellPlayModeTests.WaitForEmpireMounted : CurrentTab==Empire est
        // vrai sur les DEUX branches de AcquireSessionThenActivateHome (succès et repli-échec).
        // AMENDÉ (items 0.2/0.3, ruling 2026-08-25) : Empire fusionne l'ancien Home et l'ancien City.
        private static IEnumerator WaitForEmpireMounted(AppShell shell)
        {
            float elapsed = 0f;
            while (shell.CurrentTab != AppShell.Tab.Empire && elapsed < 15f) { elapsed += Time.deltaTime; yield return null; }
            Assert.AreEqual(AppShell.Tab.Empire, shell.CurrentTab,
                "acquisition de session propre du shell résolue (Empire monté) — précondition avant d'exercer les gestes de production");
        }

        // ─────────────────────────────────────────────────────────────────────────────────────────
        // F0.3 — ITEM 0.3 de `front.md` (Tools/charpente-item0-2-3-design.md §1/§4). Avant ce lot,
        // `ActivateTab(Tab.City)` n'avait qu'un appelant de production (`ExitToCityMap`, câblé
        // SEULEMENT depuis l'intérieur d'un district) et `EnterDistrict` n'était abonné qu'au
        // montage de l'onglet City : cycle fermé, `DistrictInteriorScreenController` injoignable
        // depuis un shell en marche. Le ruling (Empire EST la carte) ne referme pas ce cycle par une
        // route de navigation de plus — il le fait CESSER D'EXISTER : la première branche s'ouvre
        // par le démarrage lui-même. Ce test le PROUVE, il ne l'affirme plus en prose.
        //
        // ⛔ Réachabilité, PAS rendu — aucun pixel mesuré ici.
        // ⛔ Garde anti-tautologie (design §4) : ce test n'appelle JAMAIS `shell.EnterDistrict(...)`
        // directement — ce serait prouver que la méthode existe, pas qu'un joueur y arrive. Il
        // déclenche l'ÉVÉNEMENT DE PRODUCTION qu'un tap de district émet : sélection + clic RÉEL du
        // bouton « Entrer » (`ProductionClickSupport.Click(enterBtn)`, round 4 — PAS un
        // `onClick.Invoke()` nu, qui court-circuiterait les gardes de `Button.Press()`), exactement
        // le chemin nav-F1 (NavigationPlayModeTests.cs), rejoué ici depuis la scène du BUILD.
        // ─────────────────────────────────────────────────────────────────────────────────────────
        [UnityTest]
        public IEnumerator F0_3_LIntérieurDeDistrict_EstAtteignable_ParDesGestesDeProductionDepuisLaCarteParDefaut()
        {
            yield return ChargerLaSceneDeDemarrageDuBuild();
            AppShell shell = SondeShellDansLaScene(sceneDeDemarrage);
            Assert.IsNotNull(shell, $"aucun AppShell dans la scène de démarrage du build ({sceneDeDemarrage.path})");
            yield return WaitForEmpireMounted(shell);
            yield return null; // CityMapController.Start()/BuildLayout tourne réellement ici
            yield return null; // ... et ses propres coroutines démarrent réellement ici

            // La porte : l'onglet PAR DÉFAUT EST déjà la carte — jamais un ActivateTab manuel
            // (design §1 : « la première branche du cycle est ouverte par le démarrage lui-même »).
            Assert.AreEqual(typeof(CityMapController), shell.MountedTenantType,
                "l'onglet par défaut doit monter CityMapController — Empire EST la carte (ruling 2026-08-25)");
            var cityMap = shell.MountedTenantGameObject != null
                ? shell.MountedTenantGameObject.GetComponent<CityMapController>() : null;
            Assert.IsNotNull(cityMap, "précondition : la carte doit être montée");

            float elapsedAuth = 0f;
            while (!cityMap.IsAuthenticated && cityMap.AuthError == null && elapsedAuth < 25f)
            {
                elapsedAuth += Time.deltaTime;
                yield return null;
            }
            Assert.IsTrue(cityMap.IsAuthenticated,
                $"la carte doit être authentifiée (authErr={cityMap.AuthError}) avant de pouvoir sélectionner un district");

            const int districtId = 16; // verge-a — précédent maison doublement attesté (AppShell.HeatProbeDistrictId)
            cityMap.SelectDistrict(districtId);
            yield return null;

            Transform enterBtnT = shell.ContentSlot.Find("DetailPanel")?.Find("Footer")?.Find("EnterButton");
            Assert.IsNotNull(enterBtnT, "'Entrer' doit exister (Footer persistant, §3.2 nav-hud-design-v1.md)");
            Button enterBtn = enterBtnT.GetComponent<Button>();
            float elapsedInteractable = 0f;
            while (!enterBtn.interactable && elapsedInteractable < 10f) { elapsedInteractable += Time.deltaTime; yield return null; }
            Assert.IsTrue(enterBtn.interactable, "authentifié + district sélectionné ⇒ interactable");

            // ⛔ LE GESTE DE PRODUCTION — jamais `shell.EnterDistrict(districtId)` appelé
            // directement : l'événement qu'un tap RÉEL de district émet EST ce clic.
            // ⛔ round 4 (revue ⊥, BLOQUANT) — pas non plus `enterBtn.onClick.Invoke()` : cette
            // UnityEvent court-circuite les gardes IsActive()/IsInteractable() de Button.Press().
            // `ProductionClickSupport.Click` passe PAR l'EventSystem, comme un doigt de joueur.
            ProductionClickSupport.Click(enterBtn);

            float elapsedEnter = 0f;
            DistrictInteriorScreenController screen = null;
            while (elapsedEnter < 20f)
            {
                if (shell.MountedTenantType == typeof(DistrictInteriorScreenController))
                {
                    screen = shell.MountedTenantGameObject.GetComponent<DistrictInteriorScreenController>();
                    if (screen != null) break;
                }
                elapsedEnter += Time.deltaTime;
                yield return null;
            }
            Assert.IsNotNull(screen,
                "le clic RÉEL sur 'Entrer' doit monter un DistrictInteriorScreenController — réachabilité, pas rendu");
            Assert.IsTrue(screen.transform.IsChildOf(shell.ContentSlot),
                "le district monté doit être un descendant de ContentSlot — confinement, pas juste 'existe quelque part'");

            Debug.Log($"[Charpente] F0.3 — district {districtId} atteint depuis la scène de démarrage du build, " +
                      "par un clic réel sur 'Entrer', sans jamais appeler EnterDistrict directement.");
        }

        // ─────────────────────────────────────────────────────────────────────────────────────────
        // F0.3-bis — ITEM 0.3-BIS de `front.md`. `AppShell.cs` portait un énoncé daté affirmant, en
        // substance, que le district restait joignable même sans bulle dédiée dans le dock — motif
        // désigné par INDEX (n°2 ; sa valeur EXACTE vit UNIQUEMENT dans la constante
        // `MotifEnonceDateSurLaDestination` juste en dessous, jamais recopiée en prose ici — citer
        // l'énoncé qu'on retire le réintroduit, socle CLAUDE.md, MINEUR m3 revue ⊥ round 2). Cet
        // énoncé était FAUX à la mesure quand il a été écrit (le cycle fermé ci-dessus) et n'est
        // redevenu vrai qu'APRÈS ce lot, pour une AUTRE raison (Empire EST la porte, pas « ← Carte »
        // depuis un district déjà atteint autrement). Voir
        // Tools/charpente-item0-2-3-implementation-notes.md pour le compte AVANT/APRÈS collé :
        // mesuré sur le fichier INTACT (af9893b) — 1 occurrence, à l'ancienne ancre `:711-712`. Un 0
        // avant édition aurait signalé un motif FAUX, pas un motif satisfait.
        // ─────────────────────────────────────────────────────────────────────────────────────────
        private const string MotifEnonceDateSurLaDestination = "elle ne prend simplement plus une bulle";

        [Test]
        public void F0_3bis_LEnonceDateSurLaDestinationAtteignable_NeReapparaitPlusDansAppShell()
        {
            string chemin = Path.Combine(Application.dataPath, "Scripts", "Shell", "AppShell.cs");
            Assert.IsTrue(File.Exists(chemin), $"AppShell.cs introuvable à {chemin}");
            string texte = File.ReadAllText(chemin);

            int count = CompterOccurrencesLitterales(texte, MotifEnonceDateSurLaDestination);
            Assert.AreEqual(0, count,
                $"motif n°2 (l'énoncé daté retiré par l'item 0.3-bis) doit avoir disparu d'AppShell.cs — " +
                $"trouvé {count} fois. AVANT ce lot (mesuré sur le fichier intact, af9893b) : 1 occurrence " +
                "— un 0 avant édition aurait signalé un motif FAUX, pas un motif satisfait.");
        }

        // ─────────────────────────────────────────────────────────────────────────────────────────
        // F0.4-a — sur l'EFFET, JAMAIS sur l'appel : sous un shell, tout locataire vivant est un
        // descendant de `ContentSlot`. Design §3 : une garde sur l'APPEL de SetMountParent/SetToken
        // resterait VERTE sur un locataire dont le corps de SetToken est vide.
        // ─────────────────────────────────────────────────────────────────────────────────────────
        [UnityTest]
        public IEnumerator F0_4a_SousUnShell_ToutLocataireVivantEstDansContentSlot()
        {
            yield return ChargerLaSceneDeDemarrageDuBuild();
            AppShell shell = SondeShellDansLaScene(sceneDeDemarrage);
            Assert.IsNotNull(shell,
                $"aucun AppShell dans la scène de démarrage du build ({sceneDeDemarrage.path})");
            yield return WaitForEmpireMounted(shell);
            yield return null; // CityMapController.Start()/BuildLayout tourne réellement ici (Empire, items 0.2/0.3)

            // ⛔ MESURÉ (run réel de ce lot, corrigé sur constat) : Empire (l'onglet par DÉFAUT)
            // monte lui-même un CityMapController. Le laisser actif pendant les gestes ci-dessous
            // AJOUTE un second CityMapController (via OpenCityMap -> MonterLocataireEnSurimpression,
            // qui ne touche jamais l'onglet courant) À CÔTÉ du premier — la population mesurée
            // contenait alors DEUX CityMapController, sans rapport avec le défaut que ce test existe
            // pour attraper. On bascule sur More (§0 hors périmètre, ne monte rien) pour repartir
            // d'un ContentSlot VIDE avant d'exercer les gestes de production — ActivateTab
            // démonte inconditionnellement le tenant courant, quel qu'il soit.
            shell.ActivateTab(AppShell.Tab.More);
            yield return null;

            // AMENDÉ (items 0.2/0.3, ruling 2026-08-25) — `DashboardController` n'est plus monté par
            // AUCUN onglet (débranché, dit et non masqué : sa destination future est l'ouverture de
            // session, item 0.5). Ce test l'instancie donc ICI en pur HARNAIS, pour DÉCLENCHER
            // `OpenNav` — le mécanisme de production (item 0.4) est INCHANGÉ :
            // `ShellNavigatorLocator.Find()` trouve le shell par balayage de scène, peu importe d'où
            // l'appel part, jamais par une référence tenue par l'appelant. Ce harnais n'est PAS un
            // locataire monté PAR le shell (il n'est jamais passé par `ConstruireLocataire`) — il est
            // détruit avant l'énumération finale, pour ne pas fausser la garde de containment avec un
            // objet dont l'absence sous ContentSlot ne prouverait rien sur le défaut visé ici.
            var dashboardHarnaisGo = new GameObject("F0_4a_DashboardHarnaisHorsShell");
            DashboardController dashboard = dashboardHarnaisGo.AddComponent<DashboardController>();

            // ── Les gestes de PRODUCTION (design §3) : les 5 OpenNav du Dashboard... ──
            dashboard.OpenCityMap();
            yield return null;
            dashboard.OpenBuildingCard();
            yield return null;
            dashboard.OpenPipeline();
            yield return null;
            dashboard.OpenExceptions();
            yield return null;
            // Capturé ICI, avant que le 5e OpenNav n'écrase LastNavGameObject (c'est un hook
            // "dernier nav", pas un registre) — l'ORDRE des 5 appels reste celui du design.
            ExceptionQueueController queue = dashboard.LastNavGameObject != null
                ? dashboard.LastNavGameObject.GetComponent<ExceptionQueueController>()
                : null;
            Assert.IsNotNull(queue, "OpenExceptions doit monter un ExceptionQueueController — précondition d'OpenDetail");
            dashboard.OpenAutonomy();
            yield return null;

            // ── ...puis OpenDetail de la file d'exceptions (design §3). ──
            var carteFabriquee = new ExceptionCardDto
            {
                exception_id = "charpente-f04a-fake",
                lieutenant_id = "",
                event_descriptor = "instrument F0.4-a — carte fabriquée localement, aucune écriture réseau",
                candidate_actions = Array.Empty<CandidateActionDto>(),
                suggested_action = null,
                confidence_band = "tentative",
                priority_band = "silent",
                severity_band = "MILD",
                resolution_status = "pending",
            };
            queue.OpenDetail(carteFabriquee);
            yield return null;

            // Le harnais a fini son rôle (déclencher OpenNav/OpenDetail) — détruit AVANT
            // l'énumération, sinon il polluerait la garde de containment ci-dessous : il n'est
            // jamais passé par `ConstruireLocataire`, donc jamais parenté sous ContentSlot — un
            // rouge sur LUI ne parlerait pas du défaut que ce test existe pour attraper.
            Object.DestroyImmediate(dashboardHarnaisGo);

            // ── L'énumération, PAR BALAYAGE des objets vivants — jamais une liste écrite à la
            // main (design §3) : un locataire ajouté demain entre dans le compte tout seul.
            //
            // MESURÉ : pas de filtre de SCÈNE ici (contrairement à SondeShellDansLaScene, qui en a
            // besoin pour distinguer un AppShell de test d'un AppShell du build) — le Canvas que
            // `AppShell.BuildLayout()` construit À L'EXÉCUTION (et tout ce qui vit dessous : les 3
            // slots, tout hôte de locataire) est créé dans la scène ACTIVE du domaine PlayMode
            // (celle du runner de tests), PAS dans `sceneDeDemarrage` (seul l'OBJET `AppShell`
            // lui-même, placé dans le fichier de scène, y appartient — c'est tout ce que
            // F0.1/SondeShellDansLaScene mesurent). Le SetUp de cette fixture (destruction de tout
            // AppShell/Canvas/IShellTenant résiduel) suffit à garantir qu'aucun tenant d'un autre
            // test ne contamine ce balayage.
            var locataires = Object.FindObjectsByType<MonoBehaviour>(FindObjectsInactive.Exclude, FindObjectsSortMode.None)
                .OfType<IShellTenant>()
                .ToList();
            var noms = locataires.Select(t => ((MonoBehaviour)t).name + " (" + t.GetType().Name + ")").OrderBy(n => n).ToList();

            // ⛔⛔ CORRIGÉ (revue ⊥ round 2, C2 — finding nommé sur CE test) : un PLANCHER
            // (`>= 2`) reste VERT même si la plupart des gestes de production ci-dessus ne montent
            // plus rien. AMENDÉ (items 0.2/0.3) : `DashboardController` n'entre plus dans cet
            // ensemble — ce n'est plus un locataire monté PAR le shell (débranché, item 0.5), et il
            // a été détruit juste au-dessus. Le scénario monte EXACTEMENT 6 locataires nommés (les 5
            // OpenNav + le détail d'exception) : asserter l'ENSEMBLE des TYPES, pas un compte.
            var typesAttendus = new List<string>
            {
                nameof(CityMapController), nameof(BuildingCardController),
                nameof(LaunderingController), nameof(ExceptionQueueController), nameof(AutonomyInboxController),
                nameof(ExceptionDetailController),
                // ⚠️ 2026-09-02 (merge `pilote-B`) : ㊲ est monté par `Tab.More`, c'est donc un
                // locataire vivant de plein droit sous le shell.
                nameof(MafiaCleanCity.Operational.ReputationScreenController),
            };
            var typesTrouves = locataires.Select(t => t.GetType().Name).ToList();
            CollectionAssert.AreEquivalent(typesAttendus, typesTrouves,
                $"les locataires vivants sous le shell doivent être EXACTEMENT {{{string.Join(", ", typesAttendus)}}} " +
                $"(un de chaque) — trouvé {{{string.Join(", ", typesTrouves)}}} ({string.Join(", ", noms)}).");
            Debug.Log($"[Charpente] F0.4-a — {locataires.Count} locataire(s) vivant(s) sous le shell : {string.Join(", ", noms)}.");

            foreach (IShellTenant tenant in locataires)
            {
                Transform t = ((MonoBehaviour)tenant).transform;
                Assert.IsTrue(t.IsChildOf(shell.ContentSlot),
                    $"{((MonoBehaviour)tenant).name} ({tenant.GetType().Name}) n'est PAS un descendant de " +
                    $"ContentSlot — locataires vivants nommément : {string.Join(", ", noms)}.");
            }
        }

        // ─────────────────────────────────────────────────────────────────────────────────────────
        // F0.4-b — le jeton : expérience à UNE seule variable (design §3). ExceptionQueueController
        // partage le même identifiant démo par défaut que le shell (`operational_demo@example.test`)
        // — c'est ce qui fait de la présence du shell la SEULE variable entre monde A et monde B ;
        // CityMapController/DistrictInteriorScreenController sont exclus par le design (identité
        // démo différente / corps de SetToken vide).
        // ⚠️ Besoin de la stack (signin réel) — [Ignore] AVEC SA RAISON si elle ne peut pas tourner.
        // ─────────────────────────────────────────────────────────────────────────────────────────
        [UnityTest]
        public IEnumerator F0_4b_LeJetonDuLocataireMonteParLeShell_DiffereDeCeluiMonteSeul()
        {
            yield return ChargerLaSceneDeDemarrageDuBuild();
            AppShell shell = SondeShellDansLaScene(sceneDeDemarrage);
            Assert.IsNotNull(shell,
                $"aucun AppShell dans la scène de démarrage du build ({sceneDeDemarrage.path})");
            yield return WaitForEmpireMounted(shell);

            float elapsedShellToken = 0f;
            while (string.IsNullOrEmpty(shell.Token) && elapsedShellToken < 20f)
            {
                elapsedShellToken += Time.deltaTime;
                yield return null;
            }
            if (string.IsNullOrEmpty(shell.Token))
            {
                Assert.Ignore("le shell n'a pas acquis SON PROPRE jeton en 20 s (stack absente, ou signin en " +
                              "échec) — F0.4-b a besoin d'un signin réel (design §3) : ignoré EXPLICITEMENT, " +
                              "jamais silencieusement absent.");
                yield break;
            }

            // ── Monde A : monté PAR LE SHELL, EN TRAVERSANT LE LOCALISATEUR (revue ⊥ round 2,
            // C4/m6). CORRIGÉ : appeler `shell.MonterLocataireEnSurimpression<T>()` directement
            // (comme avant ce correctif) ne prouve RIEN sur le CÂBLAGE — aucun appelant de
            // production ne tient de référence `shell` : `DashboardController.OpenNav` et
            // `ExceptionQueueController.OpenDetail` passent tous les deux par
            // `ShellNavigatorLocator.Find()`. Le faire ici aussi est ce qui rend ce test probant
            // sur le CHEMIN réellement emprunté, pas seulement sur ce que `ConstruireLocataire`
            // sait faire. Même mécanisme que le nav du Dashboard/ExceptionQueue (F0.4-a) une fois
            // le navigateur trouvé : ConstruireLocataire donne son jeton dans la fenêtre synchrone. ──
            IShellNavigator navA = ShellNavigatorLocator.Find();
            Assert.IsNotNull(navA, "le localisateur doit trouver l'AppShell de la scène de démarrage — précondition du monde A");
            Assert.AreSame(shell, navA, "le localisateur doit trouver CE shell précisément (un seul AppShell vivant dans ce scénario)");
            ExceptionQueueController tenantA = navA.MonterLocataireEnSurimpression<ExceptionQueueController>();
            yield return null;
            Assert.IsFalse(string.IsNullOrEmpty(tenantA.Token), "monde A : le locataire monté par le shell doit avoir un jeton non vide");
            Assert.AreEqual(shell.Token, tenantA.Token,
                "monde A : le locataire monté par le shell reçoit EXACTEMENT le jeton du shell");

            // ── Monde B : monté SEUL, hors shell — repli documenté par IShellTenant.cs:24-28,
            // régime de TOUT test PlayMode existant qui monte ce contrôleur seul. ──
            var soloGo = new GameObject("CharpenteF0_4b_SoloExceptionQueue");
            ExceptionQueueController tenantB = soloGo.AddComponent<ExceptionQueueController>();
            float elapsedB = 0f;
            while (!tenantB.IsAuthenticated && tenantB.AuthError == null && elapsedB < 20f)
            {
                elapsedB += Time.deltaTime;
                yield return null;
            }
            Assert.IsFalse(string.IsNullOrEmpty(tenantB.Token),
                $"monde B : le locataire monté seul doit signer lui-même et obtenir un jeton non vide (AuthError={tenantB.AuthError})");

            // ── L'assertion qui MORD (design §3) : A ≠ B. Une égalité A==shell.Token SEULE serait
            // satisfaite par un monde où le locataire signe lui-même et tombe, par coïncidence, sur
            // le même jeton — c'est la DIFFÉRENCE entre A et B qui prouve que le repli n'a pas été
            // pris sous le shell. ──
            Assert.AreNotEqual(tenantA.Token, tenantB.Token,
                "le jeton du locataire monté SEUL doit différer de celui du locataire monté PAR LE SHELL — " +
                "une égalité prouverait que la branche de repli (auto-signature) a quand même été prise sous le shell.");

            Debug.Log("[Charpente] F0.4-b — monde A (par le shell) : jeton == shell.Token. " +
                      $"Monde B (seul) : jeton différent, longueur {tenantB.Token.Length}.");

            Object.Destroy(soloGo);
        }

        // ─────────────────────────────────────────────────────────────────────────────────────────
        // F0.4-c — le corps de montage est UNIQUE après la fusion (design §3, motif n°1). Pur
        // balayage de texte, aucun runtime Unity requis — synchrone, [Test] et non [UnityTest].
        // ─────────────────────────────────────────────────────────────────────────────────────────
        private const string MotifCorpsDeMontage = "tenant.SetMountParent(ContentSlot)";

        /// <summary>Décompte de SOUS-CHAÎNE littérale — jamais une regex à alternance (le socle :
        /// une alternance nue matche littéralement sur ce dépôt et rend un zéro silencieux ; ici un
        /// seul motif fixe, donc `IndexOf` en boucle est à la fois suffisant et sans ce risque).
        /// Même idiome que ChromeTabAccentAllowlistPlayModeTests.CountTokenAccess.</summary>
        private static int CompterOccurrencesLitterales(string texte, string motif)
        {
            if (string.IsNullOrEmpty(texte)) return 0;
            int count = 0, idx = 0;
            while ((idx = texte.IndexOf(motif, idx, StringComparison.Ordinal)) != -1)
            {
                count++;
                idx += motif.Length;
            }
            return count;
        }

        // Contrôle positif/négatif du motif LUI-MÊME (design §3 : « un motif qui rend 0 n'est pas
        // un motif satisfait, c'est un motif faux ») — sur des fixtures fabriquées, jamais sur
        // AppShell.cs réel. Le motif est qualifié par son RÉCEPTEUR (`tenant.`), ce qui l'exclut
        // PAR CONSTRUCTION d'une mention en PROSE (récepteur différent, ex. « IShellTenant.… »).
        [TestCase("            tenant.SetMountParent(ContentSlot);", 1,
            TestName = "positif — forme réceveur-qualifiée, telle qu'écrite dans ConstruireLocataire")]
        [TestCase("// … `IShellTenant.SetMountParent(ContentSlot)` sur le locataire AVANT que son Start()…", 0,
            TestName = "négatif — mention en PROSE, récepteur différent (IShellTenant, pas tenant)")]
        [TestCase("private void MountTenant<T>() where T : MonoBehaviour, IShellTenant { }", 0,
            TestName = "négatif — nom de méthode nu, absent du motif qualifié")]
        [TestCase("", 0, TestName = "anti-vacuité — texte vide ne matche jamais 1")]
        public void CompterOccurrencesLitterales_DistingueLeReceveurDeLaProse(string source, int attendu)
        {
            Assert.AreEqual(attendu, CompterOccurrencesLitterales(source, MotifCorpsDeMontage));
        }

        [Test]
        public void F0_4c_LeCorpsDeMontageEstUnique_UnSeulSiteAppelleTenantSetMountParentContentSlot()
        {
            string chemin = Path.Combine(Application.dataPath, "Scripts", "Shell", "AppShell.cs");
            Assert.IsTrue(File.Exists(chemin), $"AppShell.cs introuvable à {chemin}");
            string texte = File.ReadAllText(chemin);

            int count = CompterOccurrencesLitterales(texte, MotifCorpsDeMontage);

            // AVANT la fusion (HEAD fe00b0a, mesuré au commit du design) : ce même motif comptait 2
            // occurrences (`:211` EnterDistrict, `:375` MountTenant<T>). APRÈS : 1 seule, dans
            // ConstruireLocataire<T>, appelée par les TROIS sites. Le motif n°1 est qualifié par son
            // récepteur — voir CompterOccurrencesLitterales_DistingueLeReceveurDeLaProse ci-dessus —
            // ce qui exclut par construction la mention en prose du header de classe (récepteur
            // "IShellTenant", pas "tenant").
            Assert.AreEqual(1, count,
                $"le corps de montage (`{MotifCorpsDeMontage}`) doit exister EXACTEMENT une fois dans " +
                $"AppShell.cs après la fusion (design §1.6/§2.2) — trouvé {count} fois. AVANT la fusion, " +
                "ce motif comptait 2 (EnterDistrict + MountTenant<T> non fusionnés) ; un compte de 0 " +
                "signalerait que le motif est devenu FAUX (renommage, receveur changé), pas que la " +
                "fusion a réussi.");
        }

        // ─────────────────────────────────────────────────────────────────────────────────────────
        // C5 (revue ⊥ round 2, m4) — `DashboardController.NavTarget` compte 6 membres (`None`
        // inclus). Le `switch` STATEMENT de `OpenNav` (branche shell ET branche de repli) n'a pas
        // de `default` — et côté C#, ça n'est PAS une erreur de compilation : CS0161 ne s'applique
        // qu'à une méthode qui DOIT rendre une valeur (`OpenNav` est `void`), et une `switch`
        // EXPRESSION rendrait un avertissement CS8509 dont il y a 0 occurrence dans tout
        // `Assets/Scripts`. Le seul détecteur possible est un TEST qui énumère
        // `Enum.GetValues(typeof(NavTarget))`. Pas de scène/shell requis ici : c'est la branche de
        // repli (la plus simple des deux, et celle où la pollution était la pire — un hôte VIDE
        // créé pour rien) qui est mesurée ; le garde `None` posé dans `OpenNav` rend les deux
        // branches identiques sur ce membre, donc mesurer l'une suffit à prouver les deux.
        // ─────────────────────────────────────────────────────────────────────────────────────────
        [Test]
        public void C5_ToutMembreDeNavTarget_AUnComportementNomme()
        {
            // Même bruit orthogonal que les autres falsifiables de ce fichier (démo-auth propre
            // d'un tenant) : ce test ne yield jamais, donc AUCUN Start() ne peut s'exécuter avant
            // que la boucle ci-dessous n'ait détruit ses hôtes — mais posé ici par cohérence et
            // par défense, comme TearDown le remet à false de toute façon.
            LogAssert.ignoreFailingMessages = true;
            MethodInfo openNav = typeof(DashboardController).GetMethod("OpenNav", BindingFlags.NonPublic | BindingFlags.Instance);
            Assert.IsNotNull(openNav, "DashboardController.OpenNav (private) doit exister — sans lui ce test ne mesure rien");

            var typeParMembre = new Dictionary<DashboardController.NavTarget, Type>
            {
                { DashboardController.NavTarget.CityMap, typeof(CityMapController) },
                { DashboardController.NavTarget.BuildingCard, typeof(BuildingCardController) },
                { DashboardController.NavTarget.Pipeline, typeof(LaunderingController) },
                { DashboardController.NavTarget.Exceptions, typeof(ExceptionQueueController) },
                { DashboardController.NavTarget.Autonomy, typeof(AutonomyInboxController) },
                // NavTarget.None volontairement ABSENT de cette table : son comportement nommé est
                // « aucune destination », vérifié par la branche else ci-dessous — jamais un type monté.
            };

            Array membres = Enum.GetValues(typeof(DashboardController.NavTarget));
            // Garde de PORTÉE de l'exhaustivité elle-même (même famille que le socle sur les
            // résolveurs exhaustifs) : si un 7e membre apparaît demain, ce test doit d'abord
            // rougir ICI, pas passer silencieusement à côté d'un membre non couvert par la table.
            Assert.AreEqual(6, membres.Length,
                "DashboardController.NavTarget a changé de taille — ce test doit être relu (table " +
                "typeParMembre + branche None) AVANT d'être considéré exhaustif sur le nouveau membre");

            foreach (DashboardController.NavTarget membre in membres)
            {
                var hostGo = new GameObject($"C5_{membre}");
                DashboardController dash = hostGo.AddComponent<DashboardController>();
                openNav.Invoke(dash, new object[] { membre });

                if (membre == DashboardController.NavTarget.None)
                {
                    Assert.IsNull(dash.LastNavGameObject,
                        "NavTarget.None doit avoir le comportement NOMMÉ « aucune destination » : aucun " +
                        "hôte ne doit être créé, dans AUCUNE branche d'OpenNav");
                }
                else
                {
                    Assert.IsNotNull(dash.LastNavGameObject, $"NavTarget.{membre} doit monter un écran — aucun hôte créé");
                    Assert.IsNotNull(dash.LastNavGameObject.GetComponent(typeParMembre[membre]),
                        $"NavTarget.{membre} doit monter EXACTEMENT {typeParMembre[membre].Name} — " +
                        "aucun composant de ce type trouvé sur l'hôte");
                }
                Object.Destroy(hostGo);
            }
        }

        // ─────────────────────────────────────────────────────────────────────────────────────────
        // C7 (revue ⊥ round 2 du lot 0.2/0.3, MAJEUR M3) — `AppShell.Tab` vient d'être RE-FAÇONNÉ
        // PAR CE LOT (fusion Home/City → Empire) et n'avait AUCUN détecteur : `Enum.GetValues(typeof
        // (AppShell.Tab))` comptait 0 occurrence dans tout le dépôt avant ce test. Le `switch (tab)`
        // d'`ActivateTab` (`AppShell.cs`) n'a pas de `default` — et côté C#, une `switch` STATEMENT
        // sans `default` n'est PAS une erreur de compilation : CS0161 ne s'applique qu'à une méthode
        // qui DOIT rendre une valeur (`ActivateTab` est `void`), et une `switch` EXPRESSION rendrait
        // un avertissement CS8509 dont il y a 0 occurrence dans tout `Assets/Scripts`. Le seul
        // détecteur possible est un TEST qui énumère les membres — MÊME mécanisme, MÊME correctif
        // que C5 (`DashboardController.NavTarget`), un cran plus haut dans la même population.
        //
        // Balayage de la population « enums pilotés par un switch, dans la surface de ce lot + celle
        // du lot 0.4 » (§ implementation-notes.md pour le détail) — UN SEUL AUTRE `switch` existe
        // dans les 8 fichiers touchés par ce lot (`grep -c "switch *(" ` sur les 8 fichiers → 1, ici
        // même, sur `tab`) : `DashboardController.NavTarget` (lot 0.4), déjà fermé par C5 ci-dessus.
        // 2 enums dans le périmètre élargi, 2 détecteurs après ce test (0 avant, pour `Tab`).
        //
        // Un 5e membre ajouté à `Tab` ET à `DockRatifie` ferait déjà rougir F0.1-a/F0.2 (leurs
        // constantes énumèrent 4 noms/libellés à la main) — pas besoin d'un détecteur de plus pour
        // CE cas. Un 5e membre ajouté à L'ENUM SEUL (jamais à `DockRatifie`) est INVISIBLE à
        // F0.1-a/F0.2 (aucun des deux ne dérive sa cardinalité attendue d'`Enum.GetValues`) :
        // l'onglet existerait, `ActivateTab` l'accepterait sans erreur de compilation, mais aucun
        // bouton ne le rendrait jamais atteignable — exactement la classe que ce lot existe pour
        // fermer (F0.3), reproduite un cran plus haut, dans l'enum lui-même.
        // ─────────────────────────────────────────────────────────────────────────────────────────
        [UnityTest]
        public IEnumerator C7_ToutMembreDeTab_AUnComportementNomme_MonteParLeDockOuDocumenteHorsDock()
        {
            yield return ChargerLaSceneDeDemarrageDuBuild();
            AppShell shell = SondeShellDansLaScene(sceneDeDemarrage);
            Assert.IsNotNull(shell, $"aucun AppShell dans la scène de démarrage du build ({sceneDeDemarrage.path})");
            yield return WaitForEmpireMounted(shell);
            yield return null; // CityMapController.Start()/BuildLayout tourne réellement ici

            Array membres = Enum.GetValues(typeof(AppShell.Tab));
            // Garde de PORTÉE de l'exhaustivité elle-même (même famille que C5) : si un 5e membre
            // apparaît demain, ce test doit d'abord rougir ICI, pas passer silencieusement à côté
            // d'un membre non couvert par la table ci-dessous.
            Assert.AreEqual(4, membres.Length,
                "AppShell.Tab a changé de taille — ce test doit être relu (table typeParTab + branche " +
                "'destination vide') AVANT d'être considéré exhaustif sur le nouveau membre, ET " +
                "DockRatifie/F0.1-a/F0.2 doivent être mis à jour pour que ce membre soit ATTEIGNABLE, " +
                "pas seulement compté ici.");

            // Table ÉCRITE ICI, indépendamment du corps du `switch (tab)` qu'elle vérifie
            // (anti-tautologie, même patron que C5) : le type EXACTEMENT monté par chaque onglet.
            var typeParTab = new Dictionary<AppShell.Tab, Type>
            {
                { AppShell.Tab.Empire, typeof(CityMapController) },
                { AppShell.Tab.Org, typeof(LieutenantScreenController) },
                { AppShell.Tab.Pipeline, typeof(LaunderingController) },
                // ⚠️ MISE À JOUR 2026-09-02 (merge `pilote-B`) — `Tab.More` N'EST PLUS la
                // destination vide : il monte ㊲ La réputation. Son comportement reste NOMMÉ, il a
                // changé de NATURE — d'où une entrée dans cette table plutôt qu'une branche à part.
                // *La garde ne s'assouplit pas : elle change de propriété observée.*
                { AppShell.Tab.More, typeof(MafiaCleanCity.Operational.ReputationScreenController) },
            };

            foreach (AppShell.Tab membre in membres)
            {
                shell.ActivateTab(membre);
                yield return null;

                {
                    Assert.IsTrue(typeParTab.ContainsKey(membre),
                        $"Tab.{membre} n'a ni entrée dans typeParTab ni traitement 'destination vide' " +
                        "explicite — comportement NON NOMMÉ, exactement la classe que ce test existe " +
                        "pour attraper (un membre ajouté à l'enum seul, jamais au dock).");
                    Assert.AreEqual(typeParTab[membre], shell.MountedTenantType,
                        $"Tab.{membre} doit monter EXACTEMENT {typeParTab[membre].Name} — trouvé " +
                        $"{shell.MountedTenantType?.Name ?? "<rien>"}.");
                }
            }

            Debug.Log($"[Charpente] C7 — les {membres.Length} membres de AppShell.Tab ont chacun un " +
                      "comportement nommé (montage exact ou destination vide assumée).");
        }

        // ─────────────────────────────────────────────────────────────────────────────────────────
        // F0.2-b (revue ⊥ round 3, BLOQUANT 1) — la classe « aveugle à la CORRESPONDANCE » n'était
        // fermée QUE sur l'attribut LIBELLÉ (F0.2, `CharpenteBootScenePlayModeTests.cs`, round 2). Le
        // relecteur a armé la MÊME classe sur l'attribut DESTINATION — dans `AppShell.
        // AddTabButton(Tab, string)` (round 9, revue ⊥, MINEUR 6 : ancre par NUMÉRO corrigée d'une
        // classe distincte de « décalée de +12 » — round 11 retire le numéro de ligne pour la même
        // raison, cette classe ayant déjà glissé deux fois dans ce fichier),
        // `b.onClick.AddListener(() => ActivateTab(tab))` → `ActivateTab(Tab.Empire)`, seul site
        // touché — et mesuré que TOUTES les gardes existantes restaient VERTES (`Charpente` 15/0,
        // juge complet inchangé) : F0.1-a/F0.2 lisent le NOM et le LIBELLÉ, jamais l'`onClick` ; C7
        // ci-dessus prouve que `shell.ActivateTab` route juste, mais L'APPELLE LUI-MÊME, EN AVAL du
        // bouton — il ne prouve jamais qu'une bulle CLIQUÉE appelle le bon membre. Mesuré : 0
        // `onClick.Invoke()` sur un `Tab_*` dans tout `Assets/Tests` avant ce test.
        //
        // ★ L'erreur de méthode round 2 (consignée par le relecteur, pas seulement le résultat) :
        // le balayage de classe de F0.2 avait pris pour POPULATION « les assertions de test qui
        // comparent un ensemble de valeurs par paires », alors que la classe porte sur « les
        // CORRESPONDANCES QUE LE DOCK TRANSPORTE ». Repassé ICI sur la bonne population — pour
        // CHAQUE attribut porté par une bulle du dock, ce qui l'asserte et par quoi :
        //   nom (GameObject `Tab_{tab}`)      → F0.1-a (ensemble) + F0.2 (paire avec le libellé)
        //   libellé (texte SOUS le bouton)    → F0.2 (paire avec le nom, round 2)
        //   ordre gauche→droite               → NI F0.1-a NI F0.2 (`CollectionAssert.AreEquivalent`
        //                                        est insensible à l'ordre) — FERMÉ ICI (liste
        //                                        ORDONNÉE, `CollectionAssert.AreEqual`)
        //   destination (onClick → type monté)→ AUCUNE garde avant ce test (C7 route EN AVAL du
        //                                        bouton, jamais PAR le bouton) — FERMÉ ICI
        //   indicateur d'actif (filet visible)→ `ChromeTabBarPlayModeTests.
        //                                        ActiveTab_NeverFlatFill_OnlyThinIndicator`
        //                                        (catégorie `HUDv31`) — ⛔ MINEUR round 4 (revue ⊥) :
        //                                        `HUDv31` n'est PAS dans `MafiaCI.Categories`
        //                                        ({W4P4a, W3UDA, W3U1, W3U2, Charpente}) — « hors
        //                                        Charpente » se lisait « couvert ailleurs », c'est
        //                                        NULLE PART dans le juge. Ce test EXISTE dans le
        //                                        dépôt, mais aucun gate ne l'exécute. Par
        //                                        `shell.ActivateTab` direct LUI AUSSI (même angle
        //                                        mort que C7) — mais HORS du périmètre de
        //                                        l'ATTEIGNABILITÉ (le relecteur : « c'est le SEUL
        //                                        [attribut] qui décide de l'atteignabilité » —
        //                                        destination) : consigné honnêtement, non repris ici.
        // Compte : 5 attributs identifiés, 2 fermés par CE test (ordre, destination), 2 déjà fermés
        // (nom, libellé), 1 hors-classe consigné (indicateur d'actif — style, pas atteignabilité).
        //
        // ⛔ LE GESTE DE PRODUCTION, pour CHAQUE membre, DANS L'ORDRE du dock : trouver le bouton RÉEL
        // (`Find($"Tab_{membre}")`), prendre SON `Button`, cliquer via `ProductionClickSupport.Click`
        // (round 4 — PAS `.onClick.Invoke()` nu : voir sa doc, ça court-circuite les gardes de
        // `Button.Press()`) — jamais `shell.ActivateTab(membre)` (exactement ce que C7 fait, et
        // exactement ce que le relecteur a montré insuffisant). La liste d'ordre et la table de
        // destinations sont ÉCRITES ICI,
        // indépendamment de `AppShell.DockRatifie` (anti-tautologie, même patron que C7/F0.2).
        //
        // ⛔⛔ ROUND 5 (revue ⊥, BLOQUANT) — CE TEST ÉTAIT AVEUGLE SUR `Tab.Empire`, LA BULLE QU'IL
        // EXISTE POUR GARANTIR. `WaitForEmpireMounted` (ci-dessus) a déjà monté `CityMapController`
        // AVANT que la boucle ne commence ; la boucle CLIQUE ENSUITE sur `Tab_Empire` en premier et
        // relit `MountedTenantType == CityMapController` — un champ DÉJÀ vrai. Mesuré par le
        // relecteur, une seule variable (`if (tab == Tab.Empire) b.interactable = false;` dans
        // `AppShell.AddTabButton`) : `Charpente` passe de 19/0 à `passed=18 failed=1`, et le SEUL
        // rouge est `F-A` (fichier voisin) — `F0_2b` reste VERT, un clic AVALÉ sur la bulle n°1 est
        // indiscernable d'un clic réussi, exactement parce que le type monté ne CHANGE pas de valeur
        // dans ce cas précis.
        // ★ Pourquoi round 4 ne l'a pas vu : ses DEUX contrôles négatifs armaient `Tab_Org`, jamais
        // `Tab_Empire` — ils ont rougi EN NOMMANT la bulle fautive, donc le correctif a été déclaré
        // clos SANS repasser la classe sur la population des 4 bulles. Le silence sur Empire, dans
        // le propre contrôle (a), était le signe — et il était gratuit.
        // ⇒ La propriété manquante n'est pas « quel type est monté » (un type peut rester
        // identique d'une frame à l'autre par PURE coïncidence — ici parce qu'Empire est monté
        // deux fois de suite) : c'est « le locataire PRÉCÉDENT a-t-il été DÉTRUIT, puis un locataire
        // NEUF remonté ». Instrument déjà dans ce dépôt, déjà dans un fichier que ce lot a édité :
        // `NavigationPlayModeTests.cs:179`/`:193`, `previousDistrictHost == null` — Unity-DESTROYED,
        // jamais seulement `activeSelf==false`. `AppShell.ActivateTab` (docstring `:159-160`) est
        // « idempotent-ish » : re-cliquer le MÊME onglet remonte quand même (pas de no-op spécial-
        // casé) — donc un clic RÉEL sur Empire, MÊME quand Empire est DÉJÀ l'onglet actif, détruit
        // TOUJOURS le host précédent et en remonte un neuf. Un clic AVALÉ, lui, ne fait NI l'un ni
        // l'autre : le host précédent survit.
        // ⇒ FERMÉ ICI en mémorisant `MountedTenantGameObject` AVANT chaque clic (les 4 bulles, pas
        // seulement Empire — la classe, pas l'instance) et en assertant qu'il est DÉTRUIT après,
        // EN PLUS de ce que `MountedTenantType` affiche déjà.
        // ─────────────────────────────────────────────────────────────────────────────────────────
        [UnityTest]
        public IEnumerator F0_2b_ChaqueBoutonDuDock_ParUnClicReel_MeneALaDestinationRatifiee_EtDansLOrdre()
        {
            yield return ChargerLaSceneDeDemarrageDuBuild();
            AppShell shell = SondeShellDansLaScene(sceneDeDemarrage);
            Assert.IsNotNull(shell, $"aucun AppShell dans la scène de démarrage du build ({sceneDeDemarrage.path})");
            yield return WaitForEmpireMounted(shell);
            yield return null; // CityMapController.Start()/BuildLayout tourne réellement ici

            // L'ORDRE gauche→droite attendu, ÉCRIT ICI — indépendant de `AppShell.DockRatifie`.
            var ordreAttendu = new List<AppShell.Tab>
            {
                AppShell.Tab.Empire, AppShell.Tab.Org, AppShell.Tab.Pipeline, AppShell.Tab.More,
            };
            var nomsAttendusDansLOrdre = ordreAttendu.Select(m => $"Tab_{m}").ToList();

            // La DESTINATION attendue de chaque membre — table ÉCRITE ICI, MÊME anti-tautologie que
            // C7 (`Tab.More` volontairement absent : sa destination NOMMÉE est « vide », vérifiée
            // par `OnEmptyMoreDestination`, jamais par l'absence d'un type monté).
            var typeParTab = new Dictionary<AppShell.Tab, Type>
            {
                { AppShell.Tab.Empire, typeof(CityMapController) },
                { AppShell.Tab.Org, typeof(LieutenantScreenController) },
                { AppShell.Tab.Pipeline, typeof(LaunderingController) },
                // ⚠️ 2026-09-02 : SECONDE table du même fichier. La première a été corrigée d'abord
                // et celle-ci est restée rouge — *fermer l'instance qu'on a sous les yeux laisse la
                // classe ouverte*, y compris à onze lignes d'intervalle dans le même fichier.
                { AppShell.Tab.More, typeof(MafiaCleanCity.Operational.ReputationScreenController) },
            };

            // ── ordre gauche→droite (attribut jamais couvert par F0.1-a/F0.2). ──
            var nomsDansLOrdre = new List<string>();
            foreach (Transform enfant in shell.TabBarRoot)
            {
                if (!enfant.name.StartsWith("Tab_")) continue;
                nomsDansLOrdre.Add(enfant.name);
            }
            CollectionAssert.AreEqual(nomsAttendusDansLOrdre, nomsDansLOrdre,
                $"l'ordre gauche→droite du dock doit être EXACTEMENT {{{string.Join(", ", nomsAttendusDansLOrdre)}}} " +
                $"— trouvé {{{string.Join(", ", nomsDansLOrdre)}}} (CollectionAssert.AreEqual, PAS AreEquivalent : " +
                "l'ORDRE est l'attribut mesuré ici, jamais couvert par F0.1-a/F0.2).");

            // ── destination : un CLIC RÉEL sur chaque bouton, dans l'ordre, jamais shell.ActivateTab
            // appelé directement (exactement ce que C7 fait, et exactement ce que le relecteur a
            // montré insuffisant : « C7 appelle shell.ActivateTab(membre) EN AVAL du bouton »). ──
            foreach (AppShell.Tab membre in ordreAttendu)
            {
                Transform boutonT = shell.TabBarRoot.Find($"Tab_{membre}");
                Assert.IsNotNull(boutonT, $"le bouton Tab_{membre} doit exister dans le dock");
                Button bouton = boutonT.GetComponent<Button>();
                Assert.IsNotNull(bouton, $"Tab_{membre} doit porter un Button");

                // ⛔⛔ round 5 (revue ⊥, BLOQUANT) — mémorisé AVANT le clic : c'est CET objet, pas
                // celui que `shell.MountedTenantGameObject` pointera APRÈS (round 4 relisait
                // exactement le même champ qu'il venait d'écrire, sur Tab.Empire — voir le
                // commentaire ci-dessus, § ROUND 5).
                GameObject locataireAvantLeClic = shell.MountedTenantGameObject;
                // round 6 (revue ⊥, MINEUR 2) — `Assert.IsNotNull` est une comparaison de RÉFÉRENCE
                // NUnit : elle PASSE sur un GameObject déjà Unity-DESTROYED (== null au sens Unity,
                // mais pas au sens C#), exactement l'inverse de la charge utile de ce test un peu
                // plus bas (`locataireAvantLeClic == null`, l'opérateur UNITY). Deux sémantiques de
                // `null` dans le même bloc : cette garde anti-vacuité ne gardait pas ce qu'elle
                // nomme. `Assert.IsTrue(... != null, ...)` passe par le MÊME opérateur Unity que la
                // charge utile.
                Assert.IsTrue(locataireAvantLeClic != null,
                    $"précondition anti-vacuité avant Tab_{membre} : un locataire doit être monté " +
                    "AVANT le clic pour que sa destruction ait un sens à observer.");

                // ⛔ round 4 (revue ⊥, BLOQUANT) — `bouton.onClick.Invoke()` (round 3) N'ÉTAIT
                // PAS le geste de production : cette UnityEvent court-circuite les DEUX gardes de
                // `Button.Press()` (`IsActive()`/`IsInteractable()`). Mesuré par la revue :
                // `b.interactable = false` sur UNE bulle laissait ce test VERT — un dock mort au
                // doigt, certifié atteignable, sur la SEULE propriété que ce lot doit garantir.
                // `ProductionClickSupport.Click` passe PAR l'EventSystem — jamais
                // `shell.ActivateTab(membre)` non plus (exactement ce que C7 fait EN AVAL du
                // bouton, et ce que le relecteur round 3 a montré insuffisant).
                ProductionClickSupport.Click(bouton);
                yield return null;
                yield return null; // round 5 — laisse Object.Destroy (différé) traiter RÉELLEMENT
                                    // la destruction du locataire précédent avant de le lire (même
                                    // patron que NavigationPlayModeTests.NavF2, deux frames).

                // ⛔⛔ round 5 (revue ⊥, BLOQUANT) — LA propriété qui décide qu'un clic a RÉELLEMENT
                // porté : le locataire d'AVANT est Unity-DESTROYED (== null), jamais seulement
                // `activeSelf==false` (même garde que `NavigationPlayModeTests.cs:179/:193`). Un
                // clic AVALÉ (bulle inactive/non-interactable au doigt) laisse ce champ VIVANT —
                // `ActivateTab` n'a alors JAMAIS tourné — indépendamment de ce que
                // `shell.MountedTenantType` affiche déjà : sur `Tab.Empire`, ce type est DÉJÀ
                // `CityMapController` AVANT même le premier clic de cette boucle
                // (`WaitForEmpireMounted` plus haut), donc relire ce SEUL champ ne distingue pas
                // « clic réussi, remonté » de « clic avalé, rien n'a bougé ». Vaut pour LES 4
                // bulles, pas seulement Empire — `ActivateTab` est "idempotent-ish" (docstring
                // `AppShell.cs:159-160`) : re-cliquer le MÊME onglet détruit quand même l'ancien
                // host et en remonte un neuf, no-op spécial-casé absent.
                Assert.IsTrue(locataireAvantLeClic == null,
                    $"le CLIC RÉEL sur Tab_{membre} doit avoir DÉTRUIT (Unity-DESTROYED, == null) le " +
                    "locataire monté AVANT ce clic — trouvé VIVANT. Un clic avalé (bulle non " +
                    "interactable / masquée au doigt) laisse ce champ intact ET peut laisser " +
                    "MountedTenantType inchangé sur la MÊME valeur qu'avant (cas Tab.Empire, round 5 " +
                    "BLOQUANT) : c'est CETTE assertion, pas celle du type monté ci-dessous, qui " +
                    "détecte un clic avalé sur la bulle déjà active.");

                // ⚠️ 2026-09-02 : plus de cas particulier pour `Tab.More` — il monte ㊲ comme
                // chaque onglet monte le sien, donc il passe par la MÊME assertion que les autres.
                {
                    Assert.IsTrue(typeParTab.ContainsKey(membre), $"Tab.{membre} absent de la table de destinations — test à relire");
                    Assert.AreEqual(typeParTab[membre], shell.MountedTenantType,
                        $"le CLIC RÉEL sur Tab_{membre} doit monter EXACTEMENT {typeParTab[membre].Name} — trouvé " +
                        $"{shell.MountedTenantType?.Name ?? "<rien>"}. Un clic qui route vers une AUTRE destination " +
                        "(ou vers Tab.Empire, le défaut EXACT armé par le relecteur round 3) doit ROUGIR ICI, en " +
                        "nommant la bulle fautive.");
                }
            }

            Debug.Log($"[Charpente] F0.2-b — les {ordreAttendu.Count} bulles du dock, CLIQUÉES RÉELLEMENT dans " +
                      "l'ordre gauche→droite, mènent chacune à sa destination ratifiée.");
        }

        // ─────────────────────────────────────────────────────────────────────────────────────────
        // F0.2-c (revue ⊥ round 5, MAJEUR 1) — `ProductionClickSupport` (round 4) ferme la classe
        // « état d'activation du Selectable » (`IsActive()`/`IsInteractable()`, via `Button.
        // Press()`) mais BYPASSE VOLONTAIREMENT LE RAYCAST — `ExecuteEvents.Execute` route
        // directement sur `bouton.gameObject`, sans jamais consulter un `GraphicRaycaster`. Mesuré
        // par le relecteur, sur DEUX mécanismes distincts, chacun `Charpente` 19/0 (donc VERT à
        // travers) : `img.raycastTarget = false` sur l'`Image` posée par `AppShell.AddTabButton`
        // (round 11 — revue ⊥, BLOQUANT 1 : citation par numéro de ligne remplacée par un nom de
        // symbole, cette classe ayant déjà glissé deux fois dans ce fichier) — les 4 AUTRES enfants de chaque bulle sont DÉJÀ
        // `raycastTarget = false` : cette `Image` est l'UNIQUE surface de test de collision du
        // dock) et `CanvasGroup.blocksRaycasts = false` sur `TabBarRoot`. Un balayage confirme :
        // ZÉRO test de ce dépôt ne fait de raycast réel avant celui-ci.
        // ⇒ FERMÉ ICI, PAS en assouplissant `ProductionClickSupport` (qui doit rester fidèle à son
        // idiome « trouver le bouton par nom, jamais par une position d'écran », § doc du
        // fichier) : une garde de COLLISION séparée, un `GraphicRaycaster.Raycast` RÉEL au centre
        // ÉCRAN de chaque bulle, qui doit rendre la bulle VISÉE comme PREMIER résultat.
        //
        // ⛔⛔ CORRIGÉ round 6 (revue ⊥, BLOQUANT) — `raycaster.Raycast(...)` appelé DIRECTEMENT sur
        // le `GraphicRaycaster` du shell (round 5, ci-dessus) N'EMPRUNTE PAS le chemin d'un vrai
        // doigt. Le chemin réel est `EventSystem.RaycastAll`, qui ne consulte QUE les raycasters
        // ENREGISTRÉS ET ACTIFS (`BaseRaycaster.cs:83-86` désenregistre sur `OnDisable` ;
        // `EventSystem.cs:274` saute tout module dont `IsActive()` est faux ; `UIBehaviour.cs:26-29`).
        // Appeler directement `Raycast()` sur une référence déjà en main contourne les DEUX filtres :
        // un raycaster DÉSACTIVÉ (client entièrement intouchable au doigt) laissait ce test VERT
        // ET son message IMPRIMAIT « hit-testing RÉEL » — mesuré par le relecteur, expérience à UNE
        // variable (raycaster actif/désactivé croisé avec `raycaster.Raycast`/`EventSystem.
        // RaycastAll`) : seule la forme `EventSystem.RaycastAll` rougit quand le raycaster est
        // désactivé (19/1, message exact), les trois autres cases rendent 20/0 — y compris la
        // combinaison livrée + raycaster désactivé, LE FAUX VERT le plus dégénéré possible.
        // La CLASSE, recensée sur sa population (7 choses décident qu'un tap atteint un `Graphic`) :
        // `raycastTarget` ✅ `blocksRaycasts` ✅ tri intra-canvas ✅ point dans le viewport ✅ —
        // raycaster PARTICIPANT ❌, raycaster d'un AUTRE canvas gagnant le tri ❌ (10 sites de
        // production construisent un `Canvas+GraphicRaycaster` de repli, dormants seulement parce
        // que `FindFirstObjectByType<Canvas>()` trouve celui du shell), EventSystem + module
        // d'entrée ❌ (`EventSystem.current != null` est une garde de PARAMÈTRE, pas d'EFFET).
        // ⛔⛔ CORRIGÉ round 7 (revue ⊥, BLOQUANT 1) — cette section affirmait que
        // `EventSystem.current.RaycastAll` fermait les TROIS cases manquantes d'un coup (participant,
        // tri inter-canvas, module). **Faux, mesuré par le relecteur** : `RaycastAll`
        // (`EventSystem.cs:266-281`, package `com.unity.ugui`) ne consulte QUE
        // `RaycasterManager.GetRaycasters()` — il ne lit JAMAIS `currentInputModule`
        // (`m_CurrentInputModule`, posé dans `Update()`, où `RaycastAll` n'entre jamais). Contrôle
        // négatif exécuté (round 7) : `AppShell.EnsureEventSystem()` privée de son
        // `AddComponent<InputSystemUIInputModule>()` ⇒ `passed=20 failed=0`, **inchangé** — aucun tap
        // ne peut plus jamais être dispatché, et cette garde certifiait quand même. `RaycastAll` ferme
        // donc SEULEMENT 2 des 3 cases (participant, tri inter-canvas) ; le MODULE est fermé
        // séparément, ci-dessous, par une assertion DÉDIÉE sur `EventSystem.current.currentInputModule`
        // — jamais en le déduisant de la présence de `RaycastAll`.
        // Et c'est assertable : `AppShell.EnsureEventSystem()` ne pose le
        // module QUE `if (FindFirstObjectByType<EventSystem>() == null)` — un EventSystem HÉRITÉ (une
        // scène antérieure, un test voisin qui en aurait laissé un) sans module supporté rouvre la
        // porte, MUETTE : `EventSystem.current` existe, `RaycastAll` continue de rendre des résultats
        // non vides (les raycasters restent enregistrés indépendamment du module), et rien ne bouge.
        // ⚠️ Ce qui reste LATENT, pas vivant : rien dans `Assets/Scripts` ne désactive de raycaster
        // NI ne laisse d'EventSystem sans module aujourd'hui, et `Boot.unity` n'en contient qu'un,
        // posé par `EnsureEventSystem`. Cette garde ferme une classe de défaut qui n'a pas encore
        // d'instance connue dans ce dépôt — exactement comme F0.2-c round 5 avant elle, et round 6
        // avant elle.
        // ─────────────────────────────────────────────────────────────────────────────────────────
        //
        // round 7 — helper partagé entre l'assertion ci-dessous ET son contrôle négatif
        // (F0_2c_ControleNegatif_..., fin de fichier) : ne lit JAMAIS `EventSystem.current`, prend
        // l'instance en PARAMÈTRE — testable sur un EventSystem synthétique sans jamais devenir
        // globalement "current" (m_EventSystems n'a d'importance que pour CE QU'IL RETOURNE, ici on
        // lui passe l'instance directement).
        // ⛔⛔ round 9 (revue ⊥, BLOQUANT 2) — PROMU dans `ProductionClickSupport` (déjà importé ICI
        // via `using MafiaCleanCity.Tests;`) : la garde de collision de sortie
        // (`CharpenteOuvertureSessionOverlayPlayModeTests`, F-B round 8) en a besoin elle aussi, et
        // le socle interdit la duplication (« deux exemplaires = corriger l'un laisse l'autre »).
        // Le corps ne change pas — seul son propriétaire change ; voir `ProductionClickSupport.
        // HasActiveInputModule` pour le corps et sa doc complète.

        [UnityTest]
        public IEnumerator F0_2c_ChaqueBoutonDuDock_RepondAuHitTesting_UnRaycastAuCentreVisePileLaBulle()
        {
            yield return ChargerLaSceneDeDemarrageDuBuild();
            AppShell shell = SondeShellDansLaScene(sceneDeDemarrage);
            Assert.IsNotNull(shell, $"aucun AppShell dans la scène de démarrage du build ({sceneDeDemarrage.path})");
            yield return WaitForEmpireMounted(shell);
            yield return null;

            // round 6 — précondition d'EXISTENCE seulement : le RAYCAST réel passe par
            // `EventSystem.current.RaycastAll` ci-dessous (seul chemin qu'un vrai doigt emprunte),
            // jamais par un appel direct sur cette référence (round 5, BLOQUANT round 6).
            GraphicRaycaster raycaster = shell.ShellCanvas.GetComponent<GraphicRaycaster>();
            Assert.IsNotNull(raycaster,
                "le Canvas du shell doit porter le GraphicRaycaster qu'un vrai doigt traverse " +
                "(AppShell.BuildLayout le pose sur ShellCanvas).");
            Assert.IsNotNull(EventSystem.current,
                "aucun EventSystem.current — AppShell.EnsureEventSystem() doit avoir tourné.");
            // round 7 (revue ⊥, BLOQUANT 1) — assertion DÉDIÉE : `RaycastAll` (ci-dessous) ne
            // consulte JAMAIS le module d'entrée (voir le commentaire de méthode ci-dessus). Sans
            // cette ligne, un EventSystem sans module actif laisserait ce test VERT — mesuré :
            // `EnsureEventSystem` privée de son `AddComponent<InputSystemUIInputModule>()` ⇒
            // passed=20 failed=0, inchangé, tant que cette assertion n'existait pas.
            Assert.IsTrue(ProductionClickSupport.HasActiveInputModule(EventSystem.current, out string diagnosticModule),
                "EventSystem.current n'a AUCUN module d'entrée actif (" + diagnosticModule + ") — " +
                "EventSystem.RaycastAll (juste en dessous) ne le voit JAMAIS (EventSystem.cs:266-281 " +
                "ne consulte que RaycasterManager.GetRaycasters()), donc ce test resterait VERT même " +
                "si AUCUN tap ne pouvait jamais être dispatché en production. Voir " +
                "AppShell.EnsureEventSystem() : elle ne pose le module QUE si " +
                "aucun EventSystem n'existait déjà — un EventSystem hérité sans module supporté " +
                "rouvre la porte, muette.");

            var membres = new[] { AppShell.Tab.Empire, AppShell.Tab.Org, AppShell.Tab.Pipeline, AppShell.Tab.More };
            foreach (AppShell.Tab membre in membres)
            {
                Transform boutonT = shell.TabBarRoot.Find($"Tab_{membre}");
                Assert.IsNotNull(boutonT, $"le bouton Tab_{membre} doit exister dans le dock");
                var rect = (RectTransform)boutonT;

                // round 6 (revue ⊥, MINEUR 3) — le PIVOT n'est pas garanti être le CENTRE (juste
                // aujourd'hui parce qu'`AddTabButton` ne touche jamais `pivot`) : une grandeur qui
                // existe comme objet (le rect de la bulle) se mesure SUR l'objet, jamais reconstruite
                // depuis une hypothèse sur son pivot. `rect.rect.center` est le centre LOCAL réel,
                // `TransformPoint` le porte en MONDE, `WorldToScreenPoint(null, …)` reste la
                // conversion correcte pour un Canvas ScreenSpaceOverlay — l'affectation
                // `ShellCanvas.renderMode = RenderMode.ScreenSpaceOverlay;` dans `AppShell.
                // BuildLayout()` (round 11 — revue ⊥, BLOQUANT 1 : citation par numéro de ligne
                // remplacée par un nom de symbole, cette classe ayant déjà glissé deux fois) —
                // exactement celle que `EventSystem`/`GraphicRaycaster` utilisent en jeu.
                Vector2 centreEcran = RectTransformUtility.WorldToScreenPoint(null, rect.TransformPoint(rect.rect.center));

                var donnees = new PointerEventData(EventSystem.current) { position = centreEcran };
                var resultats = new List<RaycastResult>();
                // round 6 (revue ⊥, BLOQUANT) — `EventSystem.current.RaycastAll`, PAS
                // `raycaster.Raycast(...)` en direct : c'est le SEUL chemin qui consulte la liste des
                // raycasters ENREGISTRÉS ET ACTIFS (voir le commentaire de méthode ci-dessus), donc
                // le seul qui puisse jamais rougir si le raycaster du shell est désactivé.
                EventSystem.current.RaycastAll(donnees, resultats);

                Assert.IsTrue(resultats.Count > 0,
                    $"un raycast au centre de Tab_{membre} ({centreEcran}) ne touche RIEN — la bulle " +
                    "est invisible au hit-testing (aucun raycaster enregistré et actif ne la voit) : " +
                    "exactement l'autre moitié de l'atteignabilité que ProductionClickSupport ne " +
                    "couvre PAS (il route directement sur le GameObject, jamais par une position " +
                    "d'écran ni par la liste des raycasters actifs — voir sa doc, § MAJEUR 1 round 5).");
                Assert.AreEqual(boutonT.gameObject, resultats[0].gameObject,
                    $"le PREMIER objet touché au centre de Tab_{membre} doit être la bulle ELLE-MÊME " +
                    $"— trouvé {resultats[0].gameObject.name}. Si ce n'est PAS elle, la surface de " +
                    "test de collision réelle du dock (l'Image posée par AddTabButton — la SEULE de " +
                    "ses 4 enfants à porter raycastTarget=true) a cessé de couvrir la zone que tape " +
                    "un joueur, et F0.2-b/F0.2-c resteraient VERTS l'un comme l'autre pour un dock " +
                    "mort au doigt (round 4 l'a déjà mesuré pour IsActive()/IsInteractable() ; ceci " +
                    "est le même défaut, sur le canal du RAYCAST).");
            }

            Debug.Log($"[Charpente] F0.2-c — les {membres.Length} bulles du dock répondent au " +
                      "hit-testing RÉEL (EventSystem.current.RaycastAll au centre, round 6 — le SEUL " +
                      "chemin qu'un vrai doigt emprunte), pas seulement à un appel direct sur leur " +
                      "composant Button — ferme la moitié que ProductionClickSupport bypasse " +
                      "délibérément (round 5, MAJEUR 1).");
        }

        // ─────────────────────────────────────────────────────────────────────────────────────────
        // round 7 (revue ⊥, BLOQUANT 1) — CONTRÔLE NÉGATIF PERMANENT du helper
        // `ProductionClickSupport.HasActiveInputModule` (round 9 : promu hors de ce fichier, ce
        // contrôle négatif RESTE ICI — il couvre la fonction PARTAGÉE, donc les DEUX consommateurs
        // — le dock ici, la sortie dans `CharpenteOuvertureSessionOverlayPlayModeTests` — sans
        // avoir besoin d'être dupliqué), patron `probeGo`/`finally { Object.Destroy }` déjà établi dans ce dépôt
        // (`TopBarDoctrineV31PlayModeTests.cs:203-212`, `ChromeTabBarPlayModeTests.cs`). Reproduit le
        // monde dégénéré EXACT mesuré par le relecteur — un EventSystem SANS module d'entrée actif —
        // SANS toucher à la production ni à la scène de démarrage : un EventSystem synthétique isolé.
        //
        // ⚠️ `DestroyImmediate`, PAS `Object.Destroy` (déviation du patron ci-dessus, consignée en
        // Deviation) : `EventSystem.OnEnable` s'enregistre dans une liste STATIQUE partagée par TOUT
        // le domaine PlayMode (`m_EventSystems` ; `EventSystem.current` en retourne le premier élément)
        // — un `[Test]` synchrone ne fait tourner AUCUNE frame, donc la destruction DIFFÉRÉE
        // d'`Object.Destroy` ne se serait PAS exécutée avant que NUnit n'enchaîne le test suivant :
        // fuite possible d'un EventSystem synthétique vers un voisin qui lit `EventSystem.current`
        // (exactement la classe de co-tenance que ce dépôt paie ailleurs). `DestroyImmediate` retire
        // l'instance de la liste statique SYNCHRONEMENT, avant que ce test ne rende la main.
        // ─────────────────────────────────────────────────────────────────────────────────────────
        [Test]
        public void F0_2c_ControleNegatif_EventSystemSansModule_NestPasDetectePar_HasActiveInputModule()
        {
            GameObject esGo = new GameObject("ControleNegatifEventSystemSansModule", typeof(EventSystem));
            try
            {
                EventSystem esSansModule = esGo.GetComponent<EventSystem>();
                // précondition du contrôle négatif : cet EventSystem synthétique ne porte AUCUN
                // BaseInputModule — `currentInputModule` ne peut donc jamais être renseigné (posé
                // dans `Update()`, jamais appelé ici, un `[Test]` ne tourne aucune frame).
                Assert.IsNull(esSansModule.currentInputModule,
                    "précondition : cet EventSystem synthétique ne doit porter AUCUN module — sinon " +
                    "ce n'est pas le monde dégénéré visé par ce contrôle négatif.");

                bool ok = ProductionClickSupport.HasActiveInputModule(esSansModule, out string diagnostic);
                Assert.IsFalse(ok,
                    "CONTRÔLE NÉGATIF : un EventSystem SANS module d'entrée DOIT être détecté comme " +
                    "invalide par ProductionClickSupport.HasActiveInputModule — sinon l'assertion " +
                    "ajoutée à F0_2c (round 7, BLOQUANT 1) ET celle de F-B (round 9, BLOQUANT 2) ne " +
                    $"protègent rien, sur les DEUX consommateurs à la fois. diagnostic={diagnostic}");
            }
            finally
            {
                Object.DestroyImmediate(esGo);
            }
        }

        // ⛔⛔ round 9 (revue ⊥, MINEUR m5) — les TROIS AUTRES branches de rejet de
        // `HasActiveInputModule` : le contrôle négatif ci-dessus ne couvrait QUE `module == null`
        // (la 3ᵉ des 4 branches du corps — `es == null` · `!es.isActiveAndEnabled` ·
        // `module == null` · `!module.isActiveAndEnabled`). La revue ⊥ nomme la 4ᵉ **la
        // PORTEUSE** : un module PRÉSENT mais DÉSACTIVÉ ne dispatche aucun tap, et c'était
        // exactement le seul cas qu'aucun des trois contrôles précédents ne pouvait voir.

        [Test]
        public void F0_2c_ControleNegatif_EventSystemNull_NestPasDetectePar_HasActiveInputModule()
        {
            // Branche 1/4 : `es == null`. Aucun GameObject à créer ni détruire — rien ne fuit.
            bool ok = ProductionClickSupport.HasActiveInputModule(null, out string diagnostic);
            Assert.IsFalse(ok,
                "CONTRÔLE NÉGATIF (1/4) : un EventSystem NULL doit être détecté comme invalide par " +
                $"HasActiveInputModule. diagnostic={diagnostic}");
        }

        [Test]
        public void F0_2c_ControleNegatif_EventSystemDesactive_NestPasDetectePar_HasActiveInputModule()
        {
            // Branche 2/4 : `!es.isActiveAndEnabled`. Un EventSystem PORTANT un module, mais dont
            // le GameObject est désactivé — `isActiveAndEnabled` doit rejeter AVANT même de lire
            // `currentInputModule`.
            GameObject esGo = new GameObject("ControleNegatifEventSystemDesactive", typeof(EventSystem));
            try
            {
                EventSystem es = esGo.GetComponent<EventSystem>();
                es.gameObject.AddComponent<InputSystemUIInputModule>();
                esGo.SetActive(false);
                Assert.IsFalse(es.isActiveAndEnabled,
                    "précondition : ce GameObject doit être désactivé — sinon ce n'est pas le monde " +
                    "dégénéré visé par ce contrôle négatif.");

                bool ok = ProductionClickSupport.HasActiveInputModule(es, out string diagnostic);
                Assert.IsFalse(ok,
                    "CONTRÔLE NÉGATIF (2/4) : un EventSystem DÉSACTIVÉ (même porteur d'un module) " +
                    $"doit être détecté comme invalide par HasActiveInputModule. diagnostic={diagnostic}");
            }
            finally
            {
                Object.DestroyImmediate(esGo);
            }
        }

        [Test]
        public void F0_2c_ControleNegatif_ModuleDesactive_NestPasDetectePar_HasActiveInputModule()
        {
            // ⛔⛔ Branche 4/4, LA PORTEUSE (revue ⊥ round 9) : `!module.isActiveAndEnabled`. Un
            // module PRÉSENT (`currentInputModule` non null) mais DÉSACTIVÉ ne dispatche AUCUN
            // tap — et c'était le SEUL des 4 mondes dégénérés qu'aucun contrôle négatif de ce
            // fichier ne couvrait avant ce round.
            //
            // ⛔ REFLEXION SUR LE CHAMP, PAS UN `yield return null` — `EventSystem.
            // currentInputModule` (`com.unity.ugui`, `EventSystem.cs:84-87`) est un getter SANS
            // SETTER (`{ get { return m_CurrentInputModule; } }`) : le champ `m_CurrentInputModule`
            // n'est écrit que par `TickModules()`, dans `Update()`, qui commence par
            // `if (current != this) return;` — dans un domaine PlayMode qui peut déjà porter un
            // EventSystem résiduel d'un test voisin (m3 ci-dessus), RIEN ne garantit que CE
            // synthétique devienne "current", donc un `[UnityTest]` qui yield une frame serait
            // FLAKY, dépendant de l'ordre d'exécution. On pose le CHAMP PRIVÉ directement, comme le
            // ferait `TickModules()`, sans dépendre de l'élection globale — l'instrument mesure
            // alors EXACTEMENT ce que `HasActiveInputModule` LIT, rien de plus.
            GameObject esGo = new GameObject("ControleNegatifModuleDesactive", typeof(EventSystem));
            try
            {
                EventSystem es = esGo.GetComponent<EventSystem>();
                InputSystemUIInputModule module = esGo.AddComponent<InputSystemUIInputModule>();
                FieldInfo champCurrentInputModule = typeof(EventSystem).GetField(
                    "m_CurrentInputModule", BindingFlags.NonPublic | BindingFlags.Instance);
                Assert.IsNotNull(champCurrentInputModule,
                    "EventSystem.m_CurrentInputModule doit exister — API Unity inattendue " +
                    "(com.unity.ugui a peut-être changé son nom de champ interne).");
                champCurrentInputModule.SetValue(es, module);
                module.enabled = false;

                Assert.IsNotNull(es.currentInputModule,
                    "précondition : un module doit être PRÉSENT (sinon ce contrôle mesure la " +
                    "branche `module == null`, déjà couverte, pas celle-ci).");
                Assert.IsFalse(es.currentInputModule.isActiveAndEnabled,
                    "précondition : ce module doit être désactivé — sinon ce n'est pas le monde " +
                    "dégénéré visé par ce contrôle négatif.");

                bool ok = ProductionClickSupport.HasActiveInputModule(es, out string diagnostic);
                Assert.IsFalse(ok,
                    "CONTRÔLE NÉGATIF (4/4, LA PORTEUSE) : un module PRÉSENT mais DÉSACTIVÉ doit " +
                    $"être détecté comme invalide par HasActiveInputModule. diagnostic={diagnostic}");
            }
            finally
            {
                Object.DestroyImmediate(esGo);
            }
        }
    }
}
