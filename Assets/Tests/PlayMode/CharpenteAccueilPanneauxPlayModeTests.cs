using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.CityMap; // REUSE AuthClient — sign-in ground-truth indépendant (C6F3-style)
using MafiaCleanCity.Operational.Exceptions; // ExceptionQueueController — cible de navigation du raccourci
using MafiaCleanCity.Tests; // SeederSupport + ProductionClickSupport
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    // Item 0.5 §2 (Tools/charpente-item05-design.md) — C2 : les 4 panneaux orphelins de l'Accueil
    // (HighestLeverageCard/ExceptionQueue/OrgVitals/HomeChrome), instanciés PAR L'APPSHELL au
    // démarrage (`AppShell.MonterPanneauxAccueil`), JAMAIS construits par ce test — même discipline
    // que BLOQUANT 2 de `CharpenteOuvertureSessionOverlayPlayModeTests` : construire soi-même les
    // panneaux prouverait que LE CODE sait les nourrir, jamais qu'un joueur les a sous les yeux.
    //
    // ⛔ Il n'existe pas de garde uniforme (§2, découverte du v3/v4) — pour CHAQUE panneau, ce
    // fichier DÉCLARE lequel des deux mondes il asserte :
    //   • HighestLeverageCard : MONDE RÉEL — operational_demo porte un report d'autonomie ouvert
    //     (seedé, Tools/seed_operational_demo.mjs §Phase-21) ⇒ hl_card non-nulle, Available.
    //   • ExceptionQueue      : MONDE RÉEL — la file seedée (§Phase-20 du même seeder).
    //   • OrgVitals           : Cohesion — l'état vide DÉCLARÉ (D5, TOUJOURS vrai, imité tel quel,
    //     jamais "corrigé") ; Heat/Friction/Stress — MONDE RÉEL (Heat via sa propre requête,
    //     Friction/Stress via le payload session/open, comparés à un ground-truth INDÉPENDANT).
    //   • HomeChrome          : bandeau/pression — MONDE RÉEL (comparés au MÊME ground-truth) ; la
    //     machine à 5 états — l'état vide DÉCLARÉ, exercé DIRECTEMENT (I6 : la branche "tout est
    //     chargé" rend LA MÊME valeur que le défaut jamais câblé — indiscriminante, donc jamais
    //     assertée depuis le chemin réel ; seule la branche EmptyState est assertable).
    //
    // Même patron de scène que les DEUX autres fixtures Charpente (scène de démarrage du build
    // chargée PAR SON INDEX, sonde scopée à la scène, SetUp qui déclare son régime, TearDown qui
    // décharge) — DUPLIQUÉ ici plutôt que factorisé, consigne DÉJÀ établie par ce lot
    // (`CharpenteOuvertureSessionOverlayPlayModeTests.cs:35-37`).
    [Category("Charpente")]
    public class CharpenteAccueilPanneauxPlayModeTests
    {
        private const string BaseUrl = "http://localhost";
        private const string OperationalEmail = "operational_demo@example.test";
        private const string OperationalPassword = "operational-demo-pw";

        private Scene sceneDeDemarrage;

        [OneTimeSetUp]
        public void SeedOperationalDemo()
        {
            // I1 — la COUCHE et la précondition SEMÉE vont dans le NOM du test (ci-dessous). Le
            // seeder DELETE puis ré-INSÈRE `exception_queue` et `autonomy_reports` pour ce joueur à
            // CHAQUE run (Tools/seed_operational_demo.mjs §Phase-20/§Phase-21) — donc `session/open`
            // reflète CE seed frais, jamais un résidu d'un tour de test antérieur dans la journée.
            SeederSupport.RunSeeder(SeederSupport.OperationalSeeder, SeederSupport.OperationalMarker);
        }

        // Même garde de co-tenance que les DEUX autres fixtures Charpente — un Canvas/AppShell
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
            Debug.Log($"[Charpente] SetUp (panneaux Accueil) — régime déclaré : {shellsTues} AppShell, " +
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
                "acquisition de session propre du shell résolue (Empire monté) — précondition avant de mesurer l'Accueil");
        }

        /// <summary>Cherche un descendant par NOM, inactifs compris — précédent maison
        /// (`CharpenteOuvertureSessionOverlayPlayModeTests.TrouverDescendant`) : `Transform.Find` ne
        /// descend que d'un niveau par segment de chemin et exige le chemin exact.</summary>
        private static Transform TrouverDescendant(Transform racine, string nom)
        {
            foreach (Transform t in racine.GetComponentsInChildren<Transform>(true))
                if (t.name == nom) return t;
            return null;
        }

        // Ground-truth INDÉPENDANT (même méthode que C6F3/C6F4 : une requête RÉELLE séparée de
        // celle du shell) — un DEUXIÈME sign-in + un DEUXIÈME `POST /v1/session/open`, pour comparer
        // ce que le shell a reçu à ce que le back rend RÉELLEMENT, sans jamais recopier une valeur
        // observée dans le shell lui-même (ce qui ne prouverait rien).
        private static IEnumerator FetchGroundTruthSessionOpen(Action<SessionOpenDto> onOk)
        {
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string token = null, authErr = null;
            yield return auth.SignIn(OperationalEmail, OperationalPassword, t => token = t, e => authErr = e);
            Assert.IsNull(authErr, $"ground-truth sign-in (operational_demo) a échoué : {authErr}");
            Assert.IsFalse(string.IsNullOrEmpty(token), "ground-truth sign-in n'a rendu aucun jeton");

            var session = new SessionClient { BaseUrl = BaseUrl };
            SessionOpenDto dto = null;
            string sessionErr = null;
            yield return session.OpenSession(token, "c2-ground-truth", d => dto = d, (c, m) => sessionErr = $"{c}: {m}");
            Assert.IsNull(sessionErr, $"ground-truth session/open a échoué : {sessionErr}");
            Assert.IsNotNull(dto, "ground-truth session/open n'a rendu aucune donnée");
            onOk(dto);
        }

        [UnityTest]
        public IEnumerator C2_AccueilMonteLes4PanneauxNommes_SEEDE_OperationalDemo_ChacunDeclareSonMonde()
        {
            yield return ChargerLaSceneDeDemarrageDuBuild();
            AppShell shell = SondeShellDansLaScene(sceneDeDemarrage);
            Assert.IsNotNull(shell, $"aucun AppShell dans la scène de démarrage du build ({sceneDeDemarrage.path})");
            yield return WaitForEmpireMounted(shell);
            // AppShell.MonterPanneauxAccueil est retardé d'UN FRAME après le montage de
            // DashboardController (voir son propre commentaire, AppShell.cs — DashboardController.
            // BuildLayout() est lui-même différé d'une frame par le cycle IShellTenant, et les 4
            // panneaux doivent être montés APRÈS pour devenir les frères CADETS de son fond plein
            // écran, jamais recouverts par lui). ⇒ On NE SUPPOSE PAS un compte de frames précis
            // depuis CE test (deux coroutines indépendantes qui reprennent au même point de frame
            // n'ont pas d'ordre relatif garanti) — on ATTEND le signal réel : les 4 panneaux existent.
            HighestLeverageCardController hlCard = null;
            ExceptionQueuePanelController exceptionQueue = null;
            OrgVitalsPanelController orgVitals = null;
            HomeChromeController homeChrome = null;
            float ecouleMontage = 0f;
            while (ecouleMontage < 10f &&
                   (hlCard == null || exceptionQueue == null || orgVitals == null || homeChrome == null))
            {
                hlCard = shell.ContentSlot.GetComponentInChildren<HighestLeverageCardController>(false);
                exceptionQueue = shell.ContentSlot.GetComponentInChildren<ExceptionQueuePanelController>(false);
                orgVitals = shell.ContentSlot.GetComponentInChildren<OrgVitalsPanelController>(false);
                homeChrome = shell.ContentSlot.GetComponentInChildren<HomeChromeController>(false);
                ecouleMontage += Time.deltaTime;
                yield return null;
            }

            // ── 1. Les 4, NOMMÉS — égalité d'ENSEMBLES, jamais un compte (§2, 1ère puce de la
            //      falsifiable : « l'Accueil monte les 4, nommés »). ──
            // ⛔ NE FABRIQUE AUCUN panneau — ils doivent être trouvés MONTÉS PAR LA PRODUCTION.

            var attendus = new HashSet<string>
            {
                nameof(HighestLeverageCardController), nameof(ExceptionQueuePanelController),
                nameof(OrgVitalsPanelController), nameof(HomeChromeController),
            };
            var trouves = new HashSet<string>();
            if (hlCard != null) trouves.Add(nameof(HighestLeverageCardController));
            if (exceptionQueue != null) trouves.Add(nameof(ExceptionQueuePanelController));
            if (orgVitals != null) trouves.Add(nameof(OrgVitalsPanelController));
            if (homeChrome != null) trouves.Add(nameof(HomeChromeController));
            CollectionAssert.AreEquivalent(attendus, trouves,
                $"l'Accueil doit monter les 4 panneaux NOMMÉS — trouvé {{{string.Join(", ", trouves)}}} sur " +
                $"{{{string.Join(", ", attendus)}}}.");

            // ── I2 (revue ⊥ item05-C2, IMPORTANT-PREUVE) — garde STRUCTURELLE d'ordre de fratrie,
            //      précédent maison (W3.U2 : « le SEUL tour sans BLOCKING est celui dont le
            //      correctif porte sa garde STRUCTURELLE — un ordre de fratrie testable SANS
            //      pixel »). Le raycast du §6 plus bas ne couvre qu'1 panneau sur 4
            //      (Shortcut_Second) : un occultant PARTIEL créé APRÈS les panneaux (ex.
            //      DashboardSheet, 560×560, ancré HAUT, `Image` opaque) recouvrirait 3 panneaux sur
            //      4 sans jamais toucher les 4 coins de Shortcut_Second — cette garde-là resterait
            //      VERTE à travers ce défaut. La garde d'ordre ci-dessous ferme la CLASSE (peu
            //      importe la forme/taille de l'occultant) : les 4 panneaux doivent être des frères
            //      CADETS de DashboardBackdrop dans ContentSlot, jamais des aînés. ──
            Transform dashboardBackdrop = TrouverDescendant(shell.ContentSlot, "DashboardBackdrop");
            Assert.IsNotNull(dashboardBackdrop,
                "précondition de la garde d'ordre : DashboardBackdrop doit exister sous ContentSlot " +
                "(posé par DashboardController.BuildLayout(), monté en surimpression AVANT les " +
                "panneaux) — sinon cette garde ne défend rien.");
            int indexBackdrop = dashboardBackdrop.GetSiblingIndex();
            foreach ((string nomPanneau, Transform hote) in new[]
                     {
                         (nameof(HighestLeverageCardController), hlCard.transform),
                         (nameof(ExceptionQueuePanelController), exceptionQueue.transform),
                         (nameof(OrgVitalsPanelController), orgVitals.transform),
                         (nameof(HomeChromeController), homeChrome.transform),
                     })
            {
                Assert.Greater(hote.GetSiblingIndex(), indexBackdrop,
                    $"{nomPanneau} doit être un frère CADET de DashboardBackdrop sous ContentSlot " +
                    "(rendu ET raycasté PAR-DESSUS lui) — sinon un occultant plein écran créé " +
                    "entre-temps le recouvre, invisible à toute assertion qui ne lit que l'état C#.");
            }

            // ── B2 (revue ⊥ item05-C2, BLOQUANT-PRODUCTION) — garde GÉOMÉTRIQUE, pas seulement le
            //      hit-testing du raycast (§6 plus bas, qui ne couvre que 4 points d'UN panneau) :
            //      la BANDE de chaque panneau (son PROPRE RectTransform, pas ses descendants) doit
            //      tenir DANS la zone sûre que le shell PUBLIE (`ShellChrome.Top/BottomInsetPx`),
            //      mesurée par un canal INDÉPENDANT de l'arithmétique du correctif
            //      (`AppShell.NouveauPanneauAccueil`) : les 4 coins RÉELS du RectTransform,
            //      résolus par Unity (`GetWorldCorners`, jamais en recalculant `yMin*safeHeight` à
            //      la main — ce qui ne testerait que "le correctif est d'accord avec lui-même").
            //      ⚠️ DEUX FORMES ANTÉRIEURES RÉFUTÉES PAR CETTE MÊME SONDE (elle mesurait la
            //      grandeur voisine, pas la bonne, deux fois de suite) :
            //      (1) `RectTransformUtility.CalculateRelativeRectTransformBounds(ContentSlot,
            //          hote)` agrège TOUS les descendants — le débordement de CONTENU d'un panneau
            //          (une bande à 25 % de la zone sûre, ~390 unités, est bien plus étroite qu'à
            //          25 % de tout `ContentSlot`, 960 — Deviation 4, "empilement STRUCTUREL, pas
            //          une composition finale") se lisait comme un débordement de BANDE.
            //      (2) en lisant les coins du panneau LUI-MÊME (au lieu de ses descendants), le test
            //          comparait la position MESURÉE (dans l'espace local de `ContentSlot`, qui
            //          n'est PAS [0, hauteur] mais [`ContentSlot.rect.yMin`, `ContentSlot.rect.
            //          yMax`] — mesuré : `rect=(y:-480.00, height:960.00)`, un pivot CENTRÉ, pas
            //          coin bas-gauche) à un plancher/plafond calculés dans un repère [0, hauteur].
            //          Contrôle positif involontaire : ça a rougi À 480 UNITÉS PRÈS EXACTEMENT — la
            //          signature d'une confusion de REPÈRE, pas d'un vrai débordement (Unity, lui,
            //          référence TOUJOURS `parent.rect.min` pour une ancre à la fraction 0 : le
            //          correctif de production (`NouveauPanneauAccueil`) était donc déjà CORRECT,
            //          seul ce test comparait deux repères différents). ──
            float contentSlotYMin = shell.ContentSlot.rect.y; // Rect.y == yMin, PAS 0 (pivot centré)
            float contentSlotYMax = contentSlotYMin + shell.ContentSlot.rect.height;
            float plafondZoneSure = contentSlotYMax - ShellChrome.TopInsetPx;
            float plancherZoneSure = contentSlotYMin + ShellChrome.BottomInsetPx;
            var coinsMonde = new Vector3[4];
            foreach ((string nomPanneau, RectTransform hote) in new[]
                     {
                         (nameof(HighestLeverageCardController), (RectTransform)hlCard.transform),
                         (nameof(ExceptionQueuePanelController), (RectTransform)exceptionQueue.transform),
                         (nameof(OrgVitalsPanelController), (RectTransform)orgVitals.transform),
                         (nameof(HomeChromeController), (RectTransform)homeChrome.transform),
                     })
            {
                hote.GetWorldCorners(coinsMonde);
                float bandeYMin = float.MaxValue, bandeYMax = float.MinValue;
                foreach (Vector3 coin in coinsMonde)
                {
                    float yLocal = shell.ContentSlot.InverseTransformPoint(coin).y;
                    bandeYMin = Mathf.Min(bandeYMin, yLocal);
                    bandeYMax = Mathf.Max(bandeYMax, yLocal);
                }
                Assert.LessOrEqual(bandeYMax, plafondZoneSure + 0.5f,
                    $"{nomPanneau} : sa BANDE déborde AU-DESSUS de la zone sûre publiée par le " +
                    $"shell — haut mesuré {bandeYMax:F1}, plafond {plafondZoneSure:F1} " +
                    $"(ContentSlot.rect.yMax={contentSlotYMax:F1} − " +
                    $"ShellChrome.TopInsetPx={ShellChrome.TopInsetPx:F1}) — le bandeau recouvrirait ce panneau.");
                Assert.GreaterOrEqual(bandeYMin, plancherZoneSure - 0.5f,
                    $"{nomPanneau} : sa BANDE déborde SOUS la zone sûre publiée par le shell — bas " +
                    $"mesuré {bandeYMin:F1}, plancher {plancherZoneSure:F1} " +
                    $"(ContentSlot.rect.yMin={contentSlotYMin:F1} + " +
                    $"ShellChrome.BottomInsetPx={ShellChrome.BottomInsetPx:F1}) — le dock recouvrirait ce panneau.");
            }

            // ── Ground-truth INDÉPENDANT (C6F3/C6F4-style) — jamais recopié depuis le shell lui-même. ──
            SessionOpenDto verite = null;
            yield return FetchGroundTruthSessionOpen(dto => verite = dto);

            // ── 2. HighestLeverageCard — MONDE RÉEL : la carte SEEDÉE (§Phase-21, report d'autonomie
            //      ouvert). SEUL mécanisme du seeder qui ouvre une décision de levier — déterministe. ──
            Assert.AreEqual("AUTONOMY_REPORTS_PENDING", verite.hl_card?.decision_type_key,
                "PRÉCONDITION du ground-truth : le seed §Phase-21 doit produire cette décision — si ce " +
                "champ a changé, le seeder ou un autre décideur a changé, ré-accorder cette précondition " +
                "AVANT de lire quoi que ce soit sur le panneau.");
            Assert.AreEqual(HighestLeverageCardController.CardState.Available, hlCard.RenderedState,
                "MONDE RÉEL déclaré : hl_card non-nulle et non structurellement bloquée (structural=" +
                $"{verite.hl_card.structural}, cap_reached={verite.structural_budget?.cap_reached}) ⇒ Available.");
            Assert.IsNotNull(hlCard.CurrentCard, "la carte réelle doit être posée sur le panneau");
            Assert.AreEqual(verite.hl_card.card_id, hlCard.CurrentCard.card_id,
                "l'identifiant rendu doit ÉGALER celui du ground-truth — un identifiant ISSU DE LA RÉPONSE " +
                "BACK (§2), jamais une valeur fabriquée localement ni une coïncidence de type.");
            Assert.AreEqual(verite.hl_card.decision_type_key, hlCard.CurrentCard.decision_type_key);
            Assert.IsTrue(hlCard.RenderedTexts.Any(t => t == hlCard.CurrentCard.decision_type_key),
                "le texte RENDU doit porter la clé de décision reçue du back (pas seulement le test hook)");

            // ── 3. ExceptionQueue — MONDE RÉEL : la file SEEDÉE (§Phase-20). Anti-vacuité D'ABORD :
            //      sans au moins une carte RENDUE, chercher une ligne par nom serait vrai À VIDE. ──
            Assert.Greater(verite.queue?.Length ?? 0, 0,
                "PRÉCONDITION du ground-truth : le seed §Phase-20 doit produire au moins une carte dans " +
                "le TOP-N de session/open — sans elle cette jambe du test serait vraie À VIDE.");
            Assert.IsFalse(exceptionQueue.RenderedEmptyState,
                "précondition seedée : le ground-truth porte une file non-vide ⇒ le panneau ne doit PAS " +
                "rendre l'état vide.");
            Assert.AreEqual(verite.queue.Length, exceptionQueue.RenderedCardCount,
                "R2.3/C5-F2 : autant de lignes rendues que de cartes dans le ground-truth — JAMAIS un " +
                "compte codé en dur côté client.");
            Assert.AreEqual(verite.queue.Length, exceptionQueue.CurrentCards.Count);
            string idPremiereCarte = verite.queue[0].exception_id;
            Assert.IsFalse(string.IsNullOrEmpty(idPremiereCarte), "ground-truth : exception_id présent");
            Assert.IsTrue(exceptionQueue.CurrentCards.Any(c => c.exception_id == idPremiereCarte),
                "le panneau doit porter la carte du ground-truth parmi les siennes");
            Transform ligneRendue = TrouverDescendant(exceptionQueue.transform, "Row_" + idPremiereCarte);
            Assert.IsNotNull(ligneRendue,
                $"la ligne 'Row_{idPremiereCarte}' doit exister dans le rendu PRODUCTION du panneau — " +
                "précédent maison : \"Card_\" + exception_id (CharpenteOuvertureSessionOverlayPlayModeTests).");
            Assert.IsNotNull(ligneRendue.Find("Resolve"), "chaque ligne doit porter un bouton 'Resolve' (ExceptionQueuePanelController.AddRow)");

            // ── 4. OrgVitals — Cohesion : l'état vide DÉCLARÉ (D5), TOUJOURS vrai — imité, pas corrigé.
            //      Friction/Stress : MONDE RÉEL, comparé au ground-truth. Heat : sa PROPRE requête,
            //      best-effort — on ATTEND sa résolution (succès OU échec, jamais indéfiniment). ──
            Assert.IsTrue(orgVitals.CohesionDeclaredUnavailable,
                "D5 — Cohesion est déclarée indisponible EN PERMANENCE (aucune agrégation citywide " +
                "n'existe côté back pour elle) : ce n'est PAS un défaut à corriger ici, c'est le MODÈLE " +
                "du trou déclaré que ce chunk imite pour les 3 autres panneaux.");
            Assert.IsTrue(orgVitals.RenderedTexts.Any(t => t.Contains("Unavailable")));

            // I4 (revue ⊥ item05-C2, IMPORTANT-PREUVE) — ANTI-VACUITÉ D'ABORD : sans elle, un
            // ground-truth qui rendrait ces deux clés null satisferait l'égalité ci-dessous À VIDE
            // (null==null), pendant que le test DÉCLARE "MONDE RÉEL". Mesuré côté back (revue ⊥) :
            // ce n'est PAS vide aujourd'hui — session-open-sequence.service.ts:412 rend
            // `{ friction_bucket: 'light', penalty_active: false }` PAR DÉFAUT — même discipline que
            // l'anti-vacuité déjà posée sur la jambe ExceptionQueue (`Assert.Greater(verite.queue?.
            // Length ?? 0, 0, …)` ci-dessus).
            Assert.IsFalse(string.IsNullOrEmpty(verite.friction_glance?.friction_bucket),
                "PRÉCONDITION du ground-truth : session/open doit porter un friction_bucket non-vide " +
                "— sans lui cette jambe serait vraie À VIDE (null==null) alors que le test déclare " +
                "MONDE RÉEL.");
            Assert.IsFalse(string.IsNullOrEmpty(verite.compression_glance?.stress_bucket),
                "PRÉCONDITION du ground-truth : idem pour stress_bucket.");

            Assert.AreEqual(verite.friction_glance?.friction_bucket, orgVitals.FrictionBucketRendered,
                "Friction vient du MÊME payload session/open que ce shell a reçu (design : \"Friction et " +
                "Stress viennent, eux, du payload que C3 fournit\") — comparé au ground-truth, jamais " +
                "supposé stable d'une exécution à l'autre.");
            Assert.AreEqual(verite.compression_glance?.stress_bucket, orgVitals.StressBucketRendered);
            // I4 — et le test hook n'est pas le RENDU : sans ça, un panneau qui stockerait la valeur
            // sans jamais l'écrire dans un TextMeshProUGUI passerait quand même (précédent maison :
            // l'assertion équivalente sur HighestLeverageCard, plus haut, "le texte RENDU doit
            // porter…", pas seulement le test hook).
            Assert.IsTrue(orgVitals.RenderedTexts.Any(t => t.StartsWith("Friction:")),
                "Friction doit avoir été RENDU (un TextMeshProUGUI assigné), pas seulement stocké " +
                "dans le test hook FrictionBucketRendered.");
            Assert.IsTrue(orgVitals.RenderedTexts.Any(t => t.StartsWith("Stress:")),
                "Stress doit avoir été RENDU, pas seulement stocké dans le test hook StressBucketRendered.");

            float ecoule = 0f;
            while (orgVitals.HeatBucketRendered == null && orgVitals.LastHeatError == null && ecoule < 15f)
            { ecoule += Time.deltaTime; yield return null; }
            Assert.IsNull(orgVitals.LastHeatError, $"la sonde Heat (C6-F3, déclenchée par AppShell) a échoué : {orgVitals.LastHeatError}");
            Assert.IsFalse(string.IsNullOrEmpty(orgVitals.HeatBucketRendered),
                "AppShell doit avoir déclenché FetchHeat — sans lui la barre Heat resterait BLANCHE " +
                "(aucun état nommé de repli n'existe pour elle, contrairement à Cohesion — consigné).");

            ecoule = 0f;
            while (!orgVitals.LastCohesionSucceeded && orgVitals.LastCohesionErrorCode == 0 && ecoule < 15f)
            { ecoule += Time.deltaTime; yield return null; }
            Assert.IsTrue(orgVitals.LastCohesionSucceeded || orgVitals.LastCohesionErrorCode != 0,
                "AppShell doit avoir déclenché FetchCohesion — une VRAIE requête a dû être tentée " +
                "(succès OU échec nommé), jamais rien.");

            // ── 5. HomeChrome — bandeau/pression : MONDE RÉEL, comparé au ground-truth. ──
            Assert.AreEqual(verite.queue_pressure_band, homeChrome.PressureBandRendered);
            Assert.IsTrue(homeChrome.RenderedTexts.Any(t =>
                    t.IndexOf(homeChrome.PressureBandRendered, StringComparison.OrdinalIgnoreCase) >= 0),
                "le texte rendu doit porter la bande de pression reçue du back");
            bool bandeauAttendu = verite.compression_glance != null &&
                (verite.compression_glance.forced ||
                 (verite.compression_glance.week_state != null && verite.compression_glance.week_state != "none"));
            Assert.AreEqual(bandeauAttendu, homeChrome.BannerActive,
                "le bandeau doit refléter EXACTEMENT compression_glance du ground-truth (forced OU " +
                "week_state != 'none') — jamais une valeur supposée à l'avance.");

            // m5 (revue ⊥ item05-C2, mineur — détecteur de péremption, "le toBe(404) dans le bon
            //      sens") : Deviation 1 (Shortcut_DailyReview, C4a) n'a JAMAIS été asserté nulle
            //      part — épingle la VALEUR actuelle plutôt que de la laisser filer sans détecteur.
            //      Ce panneau EST monté PAR LA PRODUCTION (ci-dessus), donc c'est le bon objet à
            //      épingler. Le jour où C4a câble Shortcut_DailyReview identiquement à
            //      Shortcut_Second (posant LastOpenedDailyReview), CETTE assertion ROUGIRA — signal
            //      qu'il faut alors écrire la vraie garde de navigation pour ce raccourci, pas
            //      supprimer une assertion qui n'a plus de sens. ──
            Assert.IsNull(homeChrome.LastOpenedDailyReview,
                "Deviation 1 (Tools/charpente-item05-design.md) : Shortcut_DailyReview ne navigue " +
                "PAS encore (C4a, hors périmètre C2) — si ceci ROUGIT, C4a a câblé ce raccourci : " +
                "écrire ici la même garde de clic+raycast que Shortcut_Second ci-dessous, ne pas " +
                "juste retirer cette ligne.");

            // ── I6 (revue ⊥ v4) — la machine à 5 états : la branche "tout est chargé" rend LA MÊME
            //      valeur que le défaut jamais câblé (`:19`/`:56`, indiscriminante) — on ne l'asserte
            //      donc JAMAIS depuis le chemin réel. On DÉCLARE et exerce DIRECTEMENT la SEULE
            //      branche assertable (EmptyState) sur ce MÊME panneau MONTÉ PAR LA PRODUCTION. ──
            homeChrome.SetLoadCircumstances(isLoading: false, hasError: false, isOffline: false,
                hasAnyData: false, hasAllExpectedData: false);
            Assert.AreEqual(HomeChromeController.HomeState.EmptyState, homeChrome.CurrentState,
                "monde DÉCLARÉ (I6) : sans donnée, la machine à 5 états doit rendre EmptyState — jamais " +
                "LoadingState, indiscriminant du défaut jamais câblé.");

            // ── 6. Le raccourci "Exceptions" (§2, point (b), CORRIGÉ dans ce chunk) — touchable ET
            //      mène RÉELLEMENT à ExceptionQueueController (IShellNavigator, REUSE). ──
            Transform raccourciExceptions = TrouverDescendant(homeChrome.transform, "Shortcut_Second");
            Assert.IsNotNull(raccourciExceptions, "Shortcut_Second doit exister sous HomeChromeController");
            var rectRaccourci = (RectTransform)raccourciExceptions;
            Assert.IsNotNull(EventSystem.current, "aucun EventSystem.current — AppShell.EnsureEventSystem() doit avoir tourné.");
            Assert.IsTrue(ProductionClickSupport.HasActiveInputModule(EventSystem.current, out string diagModule),
                $"EventSystem.current n'a AUCUN module d'entrée actif ({diagModule}) — un tap réel ne serait " +
                "jamais dispatché, et un raycast seul certifierait quand même une cible morte au doigt.");
            // ⚠️ Rect.Contains est DEMI-OUVERT : tirer sur les 4 coins EXACTS en rate 3 sur 4 (m3,
            // revue ⊥ item05-C2 : cette note vit au §5 du design, pas "§2 point 7" — corrigé). On
            // tire sur des points EN RETRAIT des coins.
            var coinsLocaux = new[]
            {
                new Vector2(rectRaccourci.rect.xMin + 1f, rectRaccourci.rect.yMin + 1f),
                new Vector2(rectRaccourci.rect.xMax - 1f, rectRaccourci.rect.yMin + 1f),
                new Vector2(rectRaccourci.rect.xMin + 1f, rectRaccourci.rect.yMax - 1f),
                new Vector2(rectRaccourci.rect.xMax - 1f, rectRaccourci.rect.yMax - 1f),
            };
            foreach (Vector2 coinLocal in coinsLocaux)
            {
                Vector2 coinEcran = RectTransformUtility.WorldToScreenPoint(null, rectRaccourci.TransformPoint(coinLocal));
                var donneesCoin = new PointerEventData(EventSystem.current) { position = coinEcran };
                var resultatsCoin = new List<RaycastResult>();
                EventSystem.current.RaycastAll(donneesCoin, resultatsCoin);
                Assert.IsTrue(resultatsCoin.Count > 0,
                    $"un raycast au coin {coinLocal} (local) de Shortcut_Second (écran {coinEcran}) ne touche RIEN.");
                GameObject toucheCoin = resultatsCoin[0].gameObject;
                Assert.IsTrue(toucheCoin == raccourciExceptions.gameObject || toucheCoin.transform.IsChildOf(raccourciExceptions),
                    $"le coin {coinLocal} (local) doit atteindre Shortcut_Second lui-même (ou un enfant " +
                    $"graphique) — trouvé « {toucheCoin.name} ». Un coin avalé est un doigt qui rate la " +
                    "cible alors qu'un raycast au centre seul la certifierait quand même.");
            }

            Button boutonRaccourci = raccourciExceptions.GetComponent<Button>();
            Assert.IsNotNull(boutonRaccourci);
            int clicsAvant = homeChrome.ExceptionsShortcutClicks;
            ProductionClickSupport.Click(boutonRaccourci); // ⛔ LE GESTE DE PRODUCTION — jamais .onClick.Invoke()
            Assert.AreEqual(clicsAvant + 1, homeChrome.ExceptionsShortcutClicks);
            Assert.IsNotNull(homeChrome.LastOpenedExceptions,
                "le clic RÉEL sur Shortcut_Second doit monter ExceptionQueueController (IShellNavigator, REUSE)");
            Assert.IsNotNull(homeChrome.LastOpenedExceptions.GetComponent<ExceptionQueueController>(),
                "la cible montée doit être ExceptionQueueController — mène RÉELLEMENT quelque part (§2, " +
                "point (b) : \"un bouton branché sur rien est un défaut joueur\").");
            Assert.IsTrue(homeChrome.LastOpenedExceptions.transform.IsChildOf(shell.ContentSlot),
                "l'écran monté doit être un descendant de ContentSlot — confinement, pas juste 'existe quelque part'.");

            Debug.Log("[Charpente] C2 — les 4 panneaux orphelins de l'Accueil sont montés PAR LA " +
                      "PRODUCTION, nommés, et chacun a rendu le monde qu'il déclarait (SEEDE_OperationalDemo).");
        }

        // ══════════════════════════════════════════════════════════════════════════════════════
        // CONTRÔLE POSITIF (§2 : "l'Accueil monte les 4, nommés") — débrancher DÉLIBÉRÉMENT un
        // panneau (nommé) doit faire ROUGIR la garde des 4 NOMMÉS ci-dessus. Recalcule la MÊME
        // comparaison (`CollectionAssert.AreEquivalent`) sur un ensemble PRIVÉ d'un membre — patron
        // déjà établi par `CharpenteOuvertureSessionOverlayPlayModeTests.TopBarEchelle_..._
        // PositiveControl_...` (round 15) : pas besoin de rejouer Play Mode, la classe de défaut
        // (un ensemble incomplet) ne dépend pas d'un Canvas réel pour être démontrée.
        //
        // I3 (revue ⊥ item05-C2, IMPORTANT-PREUVE, CORRIGÉ) — AVANT ce correctif, cette méthode ne
        // touchait ni `MonterPanneauxAccueil`, ni `ContentSlot`, ni un `AppShell` : supprimer
        // INTÉGRALEMENT `MonterPanneauxAccueil` de `AppShell.cs` la laissait VERTE — elle prouvait
        // une propriété de NUnit (`CollectionAssert.AreEquivalent` sait détecter un ensemble
        // incomplet), pas une propriété de la garde qu'elle prétend défendre. Le précédent qu'elle
        // cite (`TopBarEchelle_..._PositiveControl_...`) lit les constantes de PRODUCTION par
        // réflexion et pose une PRÉCONDITION explicite ("sinon ce contrôle ne prouve rien") avant
        // le monde dégénéré. RECOUPLÉ ici avec la même discipline : `MonterPanneauxAccueil` n'a pas
        // de constante numérique à lire (4 `AddComponent<T>()` inlinés, pas un tableau déclaré) —
        // la précondition disponible est l'EXISTENCE et la SIGNATURE de la méthode elle-même.
        // ⚠️ Limite honnête (non fermée) : ceci prouve que le SITE existe et prend la forme
        // attendue — PAS que son corps instancie exactement les 4 types nommés. Cette dernière
        // propriété reste celle du `[UnityTest]` ci-dessus (montage RÉEL, par la production).
        // ══════════════════════════════════════════════════════════════════════════════════════
        [Test]
        public void ControlePositif_HomeChromeDebranche_FaitRougirLaGardeDes4PanneauxNommes()
        {
            // Monde dégénéré n°1 (I3) : la méthode que ce contrôle prétend défendre a disparu
            // (supprimée ou renommée) — sans cette précondition, le contrôle restait vert.
            MethodInfo methodeMontage = typeof(AppShell).GetMethod(
                "MonterPanneauxAccueil", BindingFlags.NonPublic | BindingFlags.Instance);
            Assert.IsNotNull(methodeMontage,
                "PRÉCONDITION du contrôle : AppShell.MonterPanneauxAccueil doit exister — sinon ce " +
                "contrôle positif ne défend rien de réel, seulement une propriété de NUnit.");

            // Monde dégénéré n°2 (I3) : la signature a dérivé (ex. un lot futur qui la ferait
            // prendre 2 panneaux au lieu de 4 devrait D'ABORD rougir ici, pas seulement dans le
            // [UnityTest] coûteux).
            ParameterInfo[] parametres = methodeMontage.GetParameters();
            Assert.AreEqual(1, parametres.Length,
                "PRÉCONDITION : MonterPanneauxAccueil doit prendre EXACTEMENT le DTO de session/open " +
                "— une signature qui a dérivé doit rougir ICI avant d'être découverte ailleurs.");
            Assert.AreEqual(typeof(SessionOpenDto), parametres[0].ParameterType);

            var attendus = new HashSet<string>
            {
                nameof(HighestLeverageCardController), nameof(ExceptionQueuePanelController),
                nameof(OrgVitalsPanelController), nameof(HomeChromeController),
            };
            // Le monde DÉGÉNÉRÉ à tuer : exactement ce que rendrait `MonterPanneauxAccueil` si
            // `HomeChromeController` (nommé) n'était jamais instancié.
            var troisSeulement = new HashSet<string>
            {
                nameof(HighestLeverageCardController), nameof(ExceptionQueuePanelController),
                nameof(OrgVitalsPanelController),
            };
            Assert.Throws<AssertionException>(() =>
                CollectionAssert.AreEquivalent(attendus, troisSeulement),
                "CONTRÔLE POSITIF : débrancher HomeChromeController (nommément) DOIT faire rougir la " +
                "garde d'ensemble des 4 panneaux — sinon elle ne détecterait pas un panneau manquant, " +
                "et certifierait le défaut qu'elle existe pour attraper.");
        }
    }
}
