using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using MafiaCleanCity.CityMap;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Operational.Autonomy;
using MafiaCleanCity.Operational.Exceptions;
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

        // Même signal robuste que AppShellPlayModeTests.WaitForHomeMounted : CurrentTab==Home est
        // vrai sur les DEUX branches de AcquireSessionThenActivateHome (succès et repli-échec).
        private static IEnumerator WaitForHomeMounted(AppShell shell)
        {
            float elapsed = 0f;
            while (shell.CurrentTab != AppShell.Tab.Home && elapsed < 15f) { elapsed += Time.deltaTime; yield return null; }
            Assert.AreEqual(AppShell.Tab.Home, shell.CurrentTab,
                "acquisition de session propre du shell résolue (Home monté) — précondition avant d'exercer les gestes de production");
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
            yield return WaitForHomeMounted(shell);
            yield return null; // DashboardController.Start()/BuildLayout tourne réellement ici

            DashboardController dashboard = shell.MountedTenantGameObject != null
                ? shell.MountedTenantGameObject.GetComponent<DashboardController>()
                : null;
            Assert.IsNotNull(dashboard, "Home ne monte pas DashboardController — précondition d'OpenNav");

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

            // ── L'énumération, PAR BALAYAGE des objets vivants — jamais une liste écrite à la
            // main (design §3) : un locataire ajouté demain entre dans le compte tout seul.
            //
            // MESURÉ : pas de filtre de SCÈNE ici (contrairement à SondeShellDansLaScene, qui en a
            // besoin pour distinguer un AppShell de test d'un AppShell du build) — le Canvas que
            // `AppShell.BuildLayout()` construit À L'EXÉCUTION (et tout ce qui vit dessous : les 3
            // slots, tout hôte de locataire) est créé dans la scène ACTIVE du domaine PlayMode
            // (celle du runner de tests), PAS dans `sceneDeDemarrage` (seul l'OBJET `AppShell`
            // lui-même, placé dans le fichier de scène, y appartient — c'est tout ce que
            // F0.1/SondeShellDansLaScene mesurent). Un filtre `gameObject.scene == sceneDeDemarrage`
            // ici aurait donc exclu TOUS les locataires, y compris Dashboard — mesuré : 0/2 avant
            // ce correctif. Le SetUp de cette fixture (destruction de tout AppShell/Canvas résiduel)
            // suffit à garantir qu'aucun tenant d'un autre test ne contamine ce balayage.
            var locataires = Object.FindObjectsByType<MonoBehaviour>(FindObjectsInactive.Exclude, FindObjectsSortMode.None)
                .OfType<IShellTenant>()
                .ToList();
            var noms = locataires.Select(t => ((MonoBehaviour)t).name + " (" + t.GetType().Name + ")").OrderBy(n => n).ToList();

            // ⛔⛔ CORRIGÉ (revue ⊥ round 2, C2 — finding nommé sur CE test) : un PLANCHER
            // (`>= 2`) reste VERT même si 5 des 6 gestes de production ci-dessus ne montent plus
            // rien — un monde dégénéré où seul Dashboard (le tenant de l'onglet Home, jamais
            // touché par ces gestes) et UN SEUL des 6 nav/detail survivent satisferait encore
            // `Count >= 2`, sans que la garde de non-occlusion mesure les 5 autres. Le scénario
            // ci-dessus monte EXACTEMENT 7 locataires nommés (Dashboard + les 5 OpenNav + le
            // détail d'exception) : asserter l'ENSEMBLE des TYPES, pas un compte.
            var typesAttendus = new List<string>
            {
                nameof(DashboardController), nameof(CityMapController), nameof(BuildingCardController),
                nameof(LaunderingController), nameof(ExceptionQueueController), nameof(AutonomyInboxController),
                nameof(ExceptionDetailController),
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
            yield return WaitForHomeMounted(shell);

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
    }
}
