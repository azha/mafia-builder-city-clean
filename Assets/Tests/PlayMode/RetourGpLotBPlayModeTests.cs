using System.Collections;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.Account.Profile;
using MafiaCleanCity.Account.Settings;
using MafiaCleanCity.CitySim.Inspection;
using MafiaCleanCity.CoreLoops.Compression;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Mouvements;
using MafiaCleanCity.Onboarding;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Operational.Exceptions;
using MafiaCleanCity.Operational.Tests;   // AdresseDuBackPlayModeTests.Racines
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Tests
{
    // E-R6 (design retour d'appui v5, §4) — GP, lot B : les SCÉNARIOS qui relèvent la population RÉELLE de boutons, hors réseau, sur les
    // écrans du lot B (inventaire §1 du design). Même squelette que `RetourGpLotAPlayModeTests` : un test par écran / état ; chacun monte
    // l'écran, appelle `RetourGpReleve.Relever` (un seul relevé, un seul verdict par bouton), publie, puis asserte
    //   · aucun rouge (0 / 2 attachements, handle nul, effet sous le plancher, hors cadre) ;
    //   · l'anti-vacuité : N pressables relevés > 0, N LU du relevé (jamais écrit à une valeur devinée) et journalisé.
    // Écrans montés : Exceptions (détail ⑩ ; file ⑨ avec son tampon), panneau de file du shell (liste ; ligne de l'Accueil), Revue du jour,
    // HomeChrome, TopBar, Réglages, Carte à fort levier (3 états), Bandeau éphémère, Décision ⑤ (après-geste), Écran d'échec de démarrage,
    // La suite, PiedDEcran (le geste), Tutoriel, Compression, Dashboard (les « Aller à »), Inspection (le registre, « DÉPOSER » pressable), et le VRAI shell (Accueil sans carte / avec carte ; menu Plus ; coffre fermé : « Rouvrir le coffre »).
    //
    // NON MONTÉ — le relevé n'invente rien ; la ligne « couverture sites k / N » (`PublicationGp`) nommera les sites que ces écrans portent :
    // // NON COUVRABLE : Operational/Journal/JournalScreenController (BoutonAssister, :923) — `interactable = false` par construction
    //    (TD-848, aucune route « assister »). Monté et relevé NON PRESSABLE (`GP_Journal_PiedNonPressable`), jamais « couvert ».
    //
    // Les tests rendent par `RenderTexture` à la résolution des vrais écrans : ils exigent un périphérique graphique (pas `-nographics`).
    [Category("RetourAppui")]
    public class RetourGpLotBPlayModeTests
    {
        /// <summary>La résolution à laquelle les vrais écrans se rendent (les captures de contrôle sont à 1080 × 1920).</summary>
        private const int LargeurEcran = 1080, HauteurEcran = 1920;
        /// <summary>L'attente d'un rendu qui détruit puis recrée ses enfants (`Destroy` est DIFFÉRÉ d'une frame : sans attente, la génération
        /// précédente est encore dans l'arbre et serait relevée avec la neuve).</summary>
        private const int FramesDAttente = 3;
        /// <summary>L'adresse d'un port FERMÉ : l'acquisition du shell échoue vite, aucune requête n'aboutit.</summary>
        private const string PortFerme = "http://127.0.0.1:9";

        private readonly List<GameObject> montes = new List<GameObject>();
        private HashSet<GameObject> racinesAvant;
        private Regie regie;
        private GameObject shellGo;
        private AppShell shell;

        [SetUp]
        public void Monter()
        {
            racinesAvant = new HashSet<GameObject>(AdresseDuBackPlayModeTests.Racines());
            AdresseDuBack.PoserPourTest(PortFerme);
            I18nCatalog.Oublier();
            Libelle.RemettreLesCompteurs();
            RegieMouvement.Oublier();
            regie = RegieMouvement.PourTest();   // AVANT le montage : les contrôleurs attachent leurs ambiances à la régie courante
        }

        [TearDown]
        public void Demonter()
        {
            DetruireLeShell();
            DetruireMontes();
            RegieMouvement.Oublier();
            if (racinesAvant != null)
            {
                foreach (GameObject g in AdresseDuBackPlayModeTests.Racines().Where(g => g != null && !racinesAvant.Contains(g)).ToList())
                    Object.DestroyImmediate(g);   // le Canvas et l'EventSystem créés par un écran nu
                racinesAvant = null;
            }
            AdresseDuBack.Oublier();
            EtatPublieParLeShell.RendrePourTest();
            I18nCatalog.Oublier();
            Libelle.RemettreLesCompteurs();
            LogAssert.ignoreFailingMessages = false;
        }

        private void DetruireMontes()
        {
            foreach (GameObject g in montes) if (g != null) Object.DestroyImmediate(g);
            montes.Clear();
        }

        private void DetruireLeShell()
        {
            if (shell != null && shell.ShellCanvas != null) Object.DestroyImmediate(shell.ShellCanvas.gameObject);
            if (shellGo != null) Object.DestroyImmediate(shellGo);
            shell = null; shellGo = null;
        }

        private static IEnumerator Attendre(int frames = FramesDAttente)
        {
            for (int i = 0; i < frames; i++) yield return null;
        }

        // ------------------------------------------------------------------------------ le verdict commun
        /// <summary>Publie, puis asserte l'anti-vacuité (N pressables lu du relevé, journalisé) et l'absence de rouge.</summary>
        private static void Verifier(string scenario, List<LigneGp> lignes, List<string> rougesSupplementaires = null)
        {
            PublicationGp.Publier(lignes);
            int n = RetourGpReleve.Pressables(lignes);
            Debug.Log("[GP] " + scenario + " : N pressables relevés = " + n + " sur " + lignes.Count + " boutons montés");
            Assert.Greater(n, 0, scenario + " — anti-vacuité : " + n + " pressable relevé sur " + lignes.Count + " boutons montés");
            List<string> rouges = RetourGpReleve.Rouges(lignes);
            if (rougesSupplementaires != null) rouges.AddRange(rougesSupplementaires);
            Assert.IsEmpty(rouges, scenario + " — " + rouges.Count + " rouge(s) sur " + n + " pressables :\n" + string.Join("\n", rouges));
        }

        private List<LigneGp> Relever(string ecran, string etat, GameObject racine, Canvas canvas) =>
            RetourGpReleve.Relever(ecran, etat, racine, canvas, regie, LargeurEcran, HauteurEcran);

        // ------------------------------------------------------------------------------ montage : un canvas à nous, un écran dessous
        private Canvas NouveauCanvas(string nom)
        {
            var racine = new GameObject(nom + "Canvas", typeof(RectTransform), typeof(Canvas));
            montes.Add(racine);
            Canvas canvas = racine.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            return canvas;
        }

        /// <summary>L'écran `T` monté SOUS un canvas neuf, étiré à lui : un contrôleur nu (hôte à la racine) ne dessinerait rien.</summary>
        private T MonterSousCanvas<T>(string nom, out Canvas canvas) where T : Component
        {
            canvas = NouveauCanvas(nom);
            var hote = new GameObject(nom, typeof(RectTransform));
            hote.transform.SetParent(canvas.transform, false);
            var rt = (RectTransform)hote.transform;
            rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one; rt.offsetMin = Vector2.zero; rt.offsetMax = Vector2.zero;
            return hote.AddComponent<T>();
        }

        // ------------------------------------------------------------------------------ Exceptions : le détail ⑩
        private static CandidateActionDto A(string id, string method) => new CandidateActionDto { id = id, label = id, method = method };

        private static ExceptionCardDto Chaleur() => new ExceptionCardDto
        {
            exception_id = "heat", lieutenant_id = "", lieutenant = new ExceptionLieutenantDto(),
            event_descriptor = "Citywide heat is high — your operations are under pressure.",
            severity_band = "SEVERE", priority_band = "urgent", confidence_band = "confident",
            candidate_actions = new[] { A("acknowledge", "ONE_TIME"), A("escalate", "ESCALATE"), A("lay_low", "LAY_LOW") },
            suggested_action = A("acknowledge", "ONE_TIME"),
        };

        private static ExceptionCardDto Raid() => new ExceptionCardDto
        {
            exception_id = "raid", lieutenant_id = "lt-kane", lieutenant = new ExceptionLieutenantDto { id = "lt-kane", name = "Lt. Kane" },
            event_descriptor = "exc_demo_raid_style",
            severity_band = "SEVERE", priority_band = "critical", confidence_band = "likely",
            candidate_actions = new[] { A("fix_quiet", "ONE_TIME"), A("pay_off", "ONE_TIME"), A("lay_low", "LAY_LOW") },
            suggested_action = A("fix_quiet", "ONE_TIME"),
        };

        // Hors shell (`mountParent` nul) : le détail pose son propre Canvas (sous l'hôte) et garde « Retour » (Btn_back).
        private ExceptionDetailController MonterDetail(ExceptionCardDto carte, out Canvas canvas)
        {
            var go = new GameObject("Nav_ExceptionDetailGp");
            montes.Add(go);
            var d = go.AddComponent<ExceptionDetailController>();
            d.Init(carte, "t", null, onBack: () => { });
            Assert.IsNotNull(d.FeuillePourTest, "le détail n'a pas de feuille");
            canvas = d.FeuillePourTest.GetComponentInParent<Canvas>(true).rootCanvas;
            return d;
        }

        [UnityTest]
        public IEnumerator GP_ExceptionDetail_Chaleur()
        {
            List<LigneGp> lignes;
            try
            {
                // la carte de chaleur : trois issues servies (une ESCALATE) + le talon (lay_low) ; talon replié ; « Retour » hors shell
                ExceptionDetailController d = MonterDetail(Chaleur(), out Canvas canvas);
                Assert.IsNotNull(d.TalonPourTest, "précondition : le talon est monté (lay_low y est)");
                lignes = Relever("ExceptionDetail", "chaleur, talon replié", d.FeuillePourTest, canvas);
            }
            finally { DetruireMontes(); }
            Verifier("ExceptionDetail/chaleur, talon replié", lignes);
            yield break;
        }

        [UnityTest]
        public IEnumerator GP_ExceptionDetail_RaidTalonDeplie()
        {
            // le raid démo n'a pas d'issue ESCALATE : le talon déplié porte la carte « Escalader » en plus de `lay_low`
            ExceptionDetailController d = MonterDetail(Raid(), out Canvas canvas);
            Assert.IsNotNull(d.TalonPourTest, "précondition : le talon est monté");
            d.TalonPourTest.onClick.Invoke();   // re-rend : `Destroy` différé, d'où l'attente avant le relevé
            Assert.IsTrue(d.TalonDeplie, "précondition : le talon est déplié");
            yield return Attendre();
            List<LigneGp> lignes = Relever("ExceptionDetail", "raid, talon déplié", d.FeuillePourTest, canvas);
            Verifier("ExceptionDetail/raid, talon déplié", lignes);
        }

        // ------------------------------------------------------------------------------ Exceptions : la file ⑨ (ses attendants, son tampon)
        private static ExceptionCardDto[] CartesDeLaFile(params string[] ids) => ids.Select(id => new ExceptionCardDto
        {
            exception_id = id,
            event_descriptor = "descripteur " + id,
            severity_band = "MILD", priority_band = "SILENT", confidence_band = "LIKELY",
            resolution_status = "pending",
            suggested_action = new CandidateActionDto { id = "s_" + id, label = "Agir" },
            candidate_actions = new[] { new CandidateActionDto { id = "s_" + id, label = "Agir" } },
        }).ToArray();

        [UnityTest]
        public IEnumerator GP_ExceptionQueue_FileGarnie()
        {
            List<LigneGp> lignes;
            try
            {
                // montage SYNCHRONE : `RendrePourTest` pose le drapeau avant `Start`, qui ne lance donc jamais `Boot()` (réseau) ; l'hôte est
                // détruit avant la première image. Trois cartes : trois attendants (ExceptionQueueController:605) et le tampon de la tête
                // (TamponAuComptoir:92, `surTap` posé).
                var hote = new GameObject("ExceptionQueueGp");
                montes.Add(hote);
                var ctl = hote.AddComponent<ExceptionQueueController>();
                ctl.RendrePourTest(CartesDeLaFile("a", "b", "c"));
                Assert.IsNotNull(ctl.FilePourTest, "la file n'est pas montée");
                Assert.AreEqual(3, ctl.AttendantsPourTest().Count, "précondition : trois attendants touchables");
                Canvas canvas = ctl.FilePourTest.GetComponentInParent<Canvas>(true).rootCanvas;
                lignes = Relever("ExceptionQueue", "file de trois cartes", canvas.gameObject, canvas);
            }
            finally { DetruireMontes(); }
            Verifier("ExceptionQueue/file de trois cartes", lignes);
            yield break;
        }

        // ------------------------------------------------------------------------------ Shell : le panneau de file de l'Accueil
        [UnityTest]
        public IEnumerator GP_ExceptionQueuePanel_Liste()
        {
            List<LigneGp> lignes;
            try
            {
                var panneau = MonterSousCanvas<ExceptionQueuePanelController>("PanneauDeFileGp", out Canvas canvas);
                panneau.SetQueue("jeton-de-test", CartesDeLaFile("a", "b"));
                Assert.AreEqual(2, panneau.CurrentCards.Count, "précondition : deux cartes rendues");
                lignes = Relever("ExceptionQueuePanel", "liste de deux cartes", panneau.gameObject, canvas);
            }
            finally { DetruireMontes(); }
            Verifier("ExceptionQueuePanel/liste de deux cartes", lignes);
            yield break;
        }

        [UnityTest]
        public IEnumerator GP_ExceptionQueuePanel_LigneDeLAccueil()
        {
            List<LigneGp> lignes;
            try
            {
                var panneau = MonterSousCanvas<ExceptionQueuePanelController>("PanneauLigneGp", out Canvas canvas);
                panneau.PoserEnLigneDeLAccueil();   // file vide : rien à détruire au rendu suivant
                panneau.SetQueue("jeton-de-test", CartesDeLaFile("a"));
                Assert.IsTrue(panneau.LigneDeLAccueil, "précondition : le panneau est la ligne de l'Accueil");
                lignes = Relever("ExceptionQueuePanel", "ligne de l'Accueil", panneau.gameObject, canvas);
            }
            finally { DetruireMontes(); }
            Verifier("ExceptionQueuePanel/ligne de l'Accueil", lignes);
            yield break;
        }

        // ------------------------------------------------------------------------------ Shell : la revue du jour
        private static FlagReviewResponseDto Revue(int cartes, int enAttente, bool feuVert)
        {
            var liste = new FlagCardDto[cartes];
            for (int i = 0; i < cartes; i++)
                liste[i] = new FlagCardDto { flag_id = "f" + i, flagged_game_day = 11, trust_budget_bucket = "standard" };
            return new FlagReviewResponseDto { cards = liste, routine_pending_count = enAttente, batch_confirm_available = feuVert };
        }

        [UnityTest]
        public IEnumerator GP_DailyReview_TroisBillets()
        {
            var ecran = MonterSousCanvas<DailyReviewScreenController>("RevueGp", out Canvas canvas);
            ecran.AppliquerRevue(Revue(3, 17, true));   // trois billets : un jeton « RENDRE » chacun (DailyReviewScreenController:590)
            Assert.AreEqual(3, ecran.RenderedCardCount, "précondition : trois billets");
            yield return Attendre();
            List<LigneGp> lignes = Relever("DailyReview", "trois billets", ecran.gameObject, canvas);
            Verifier("DailyReview/trois billets", lignes);
        }

        [UnityTest]
        public IEnumerator GP_DailyReview_JoueurNeuf()
        {
            var ecran = MonterSousCanvas<DailyReviewScreenController>("RevueVideGp", out Canvas canvas);
            ecran.AppliquerRevue(Revue(0, 0, false));   // 0 carte, 0 routine : « donnez-leur une première règle » devient un geste (:1101)
            Assert.IsTrue(ecran.RienATenir, "précondition : rien à tenir (le geste vers la Famille est interactif)");
            yield return Attendre();
            List<LigneGp> lignes = Relever("DailyReview", "joueur neuf", ecran.gameObject, canvas);
            Verifier("DailyReview/joueur neuf", lignes);
        }

        // ------------------------------------------------------------------------------ Shell : HomeChrome, TopBar
        [UnityTest]
        public IEnumerator GP_HomeChrome_Raccourcis()
        {
            List<LigneGp> lignes;
            try
            {
                var chrome = MonterSousCanvas<HomeChromeController>("HomeChromeGp", out Canvas canvas);
                lignes = Relever("HomeChrome", "raccourcis", chrome.gameObject, canvas);
            }
            finally { DetruireMontes(); }
            Verifier("HomeChrome/raccourcis", lignes);
            yield break;
        }

        [UnityTest]
        public IEnumerator GP_TopBar_ActionDeTeteRetourALaCarte()
        {
            List<LigneGp> lignes;
            try
            {
                var barre = MonterSousCanvas<TopBarController>("TopBarGp", out Canvas canvas);
                barre.SetLeadingAction(TopBarController.LeadingAction.BackToMap, () => { });   // sans cela le bouton est caché (non pressable)
                Assert.AreEqual(TopBarController.LeadingAction.BackToMap, barre.CurrentLeadingAction, "précondition : l'action de tête est posée");
                lignes = Relever("TopBar", "retour à la carte", barre.gameObject, canvas);
            }
            finally { DetruireMontes(); }
            Verifier("TopBar/retour à la carte", lignes);
            yield break;
        }

        // ------------------------------------------------------------------------------ Journal : le pied éteint
        [UnityTest]
        public IEnumerator GP_Journal_PiedNonPressable()
        {
            // ⚠️ Le seul `Button` du Journal (BoutonAssister) est NON INTERACTIF par construction (TD-848). Ce test ne peut donc PAS passer par
            // `Verifier` (N pressables > 0 est faux ici, et l'écrire autrement serait ajuster l'assertion pour passer) : il asserte ce qui est
            // vrai — le bouton est MONTÉ et relevé, NON PRESSABLE, sans rouge — et le publie. Le site n'est jamais « couvert ».
            List<LigneGp> lignes;
            try
            {
                var journal = MonterSousCanvas<JournalScreenController>("JournalGp", out Canvas canvas);
                journal.RendrePourTest(new GetNewsFeedResponseDto { beats = new NewsBeatDto[0] });
                lignes = Relever("Journal", "pied (Y PRÊTER ATTENTION)", canvas.gameObject, canvas);   // la feuille est bâtie sous le canvas RACINE (comme Lieutenant) : le relevé porte sur le canvas, pas sur l'hôte (run 8 : 0 bouton relevé sous l'hôte)
            }
            finally { DetruireMontes(); }
            PublicationGp.Publier(lignes);
            Debug.Log("[GP] Journal/pied : " + lignes.Count + " bouton(s) monté(s), " + RetourGpReleve.Pressables(lignes) + " pressable(s)");
            Assert.Greater(lignes.Count, 0, "Journal/pied — anti-vacuité : le bouton du pied est monté et relevé");
            Assert.AreEqual(0, RetourGpReleve.Pressables(lignes), "Journal/pied — le bouton du pied est non interactif (TD-848) : s'il devient pressable, ce test doit passer par `Verifier`");
            List<string> rouges = RetourGpReleve.Rouges(lignes);
            Assert.IsEmpty(rouges, "Journal/pied — " + rouges.Count + " rouge(s) :\n" + string.Join("\n", rouges));
            yield break;
        }

        // ------------------------------------------------------------------------------ Account : les réglages
        [UnityTest]
        public IEnumerator GP_Settings_ProfilServi()
        {
            List<LigneGp> lignes;
            try
            {
                var reglages = MonterSousCanvas<SettingsScreenController>("ReglagesGp", out Canvas canvas);
                // profil fr, tutoriels non refusés : trois bascules (:283), les autres langues (:374), « Fermer le coffre » (:302)
                reglages.RendrePourTest(new ProfilData { locale = "fr", meta_market_visibility_enabled = true },
                                        new TutorielData { tutorials_opt_out = false });
                lignes = Relever("Settings", "profil servi", reglages.gameObject, canvas);
            }
            finally { DetruireMontes(); }
            Verifier("Settings/profil servi", lignes);
            yield break;
        }

        // ------------------------------------------------------------------------------ Shell : la carte à fort levier (trois états)
        [UnityTest]
        public IEnumerator GP_HighestLeverageCard_CarteDisponible()
        {
            List<LigneGp> lignes;
            try
            {
                var carte = MonterSousCanvas<HighestLeverageCardController>("CarteGp", out Canvas canvas);
                carte.SetPayload(null, new HlCardDto { card_id = "carte-gp", decision_type_key = "DAMAGED_BUILDING_REPAIR", impact_bucket = "moderate",
                                                       urgency_bucket = "elevated", options = new DecisionOptionDto[0] },
                                 new StructuralBudgetDto { cap_reached = false });
                Assert.AreEqual(HighestLeverageCardController.CardState.Available, carte.RenderedState, "précondition : une carte ordinaire");
                lignes = Relever("HighestLeverageCard", "carte disponible", carte.gameObject, canvas);   // la surface du verre (:471)
            }
            finally { DetruireMontes(); }
            Verifier("HighestLeverageCard/carte disponible", lignes);
            yield break;
        }

        [UnityTest]
        public IEnumerator GP_HighestLeverageCard_CarteDesRapports()
        {
            List<LigneGp> lignes;
            try
            {
                var carte = MonterSousCanvas<HighestLeverageCardController>("CarteRapportsGp", out Canvas canvas);
                // sans jeton : pas de lecture du nom du rapport (réseau) ; « Lire maintenant » (:513) est monté avec la carte des rapports
                carte.SetPayload(null, new HlCardDto { card_id = "carte-rapports-gp", decision_type_key = "AUTONOMY_REPORTS_PENDING",
                                                       impact_bucket = "moderate", urgency_bucket = "low" },
                                 new StructuralBudgetDto { cap_reached = false });
                Assert.IsTrue(carte.EstCarteDesRapports, "précondition : la carte des rapports");
                lignes = Relever("HighestLeverageCard", "carte des rapports", carte.gameObject, canvas);
            }
            finally { DetruireMontes(); }
            Verifier("HighestLeverageCard/carte des rapports", lignes);
            yield break;
        }

        [UnityTest]
        public IEnumerator GP_HighestLeverageCard_SaisieRevelee()
        {
            List<LigneGp> lignes;
            try
            {
                var carte = MonterSousCanvas<HighestLeverageCardController>("CarteSaisieGp", out Canvas canvas);
                carte.SetPayload(null, new HlCardDto { card_id = "carte-saisie-gp", decision_type_key = "DAMAGED_BUILDING_REPAIR", impact_bucket = "moderate",
                                                       urgency_bucket = "elevated", options = new DecisionOptionDto[0] },
                                 new StructuralBudgetDto { cap_reached = false });
                carte.RevelerLaSaisie(0);   // un appui COURT sur un geste : la saisie et son bouton (:544) apparaissent
                Assert.IsTrue(carte.SaisieVisible, "précondition : la saisie est révélée");
                lignes = Relever("HighestLeverageCard", "saisie révélée", carte.gameObject, canvas);
            }
            finally { DetruireMontes(); }
            Verifier("HighestLeverageCard/saisie révélée", lignes);
            yield break;
        }

        // ------------------------------------------------------------------------------ Shell : le bandeau éphémère
        [UnityTest]
        public IEnumerator GP_BandeauEphemere_Descente()
        {
            List<LigneGp> lignes;
            try
            {
                Canvas canvas = NouveauCanvas("BandeauGp");
                var barre = new GameObject("Barre", typeof(RectTransform));
                barre.transform.SetParent(canvas.transform, false);
                ((RectTransform)barre.transform).sizeDelta = new Vector2(392f, 52f);
                BandeauEphemere bandeau = BandeauEphemere.Construire(barre.transform);
                var carte = new ExceptionCardDto { exception_id = "e-1", lieutenant_id = "lt-1", lieutenant = new ExceptionLieutenantDto { id = "lt-1", name = "Sal" } };
                AnnonceDuBandeau annonce = AnnonceDuBandeau.Choisir(true, "district-16", "BURNING", carte, "Rook");
                Assert.IsNotNull(annonce, "précondition : une annonce (la descente passe devant tout)");
                Assert.IsTrue(bandeau.Annoncer(annonce, () => { }), "précondition : le bandeau s'affiche");
                lignes = Relever("BandeauEphemere", "descente", bandeau.gameObject, canvas);
            }
            finally { DetruireMontes(); }
            Verifier("BandeauEphemere/descente", lignes);
            yield break;
        }

        // ------------------------------------------------------------------------------ Shell : ⑤ la décision, après le geste
        private static HlCardDto CarteDeLaDecision() => new HlCardDto
        {
            card_id = "c1", decision_type_key = "DAMAGED_BUILDING", impact_bucket = "major", urgency_bucket = "pressing", structural = false, target_count = 2,
        };

        [UnityTest]
        public IEnumerator GP_DecisionDetail_ApresGeste()
        {
            var ecran = MonterSousCanvas<DecisionDetailScreenController>("DecisionGp", out Canvas canvas);
            ecran.Afficher(CarteDeLaDecision(), new StructuralBudgetDto { used = 0, cap_reached = false });
            yield return Attendre(4);
            // la `.ligne-or` « Retour à l'accueil » (DecisionDetailScreenController:743) n'est active qu'APRÈS le geste
            ecran.AfficherApresGeste(CarteDeLaDecision(), new ApresGesteHl.VueApres
            {
                Issue = ApresGesteHl.Issue.Executee, Grave = "Vous avez tranché", Mot = "Les travaux sont lancés et payés pour 2 locaux.",
                CarteTranchee = true, Tampon = true, Action = "Retour à l’accueil", SousLigne = "Rien d’autre à trancher pour l’instant.",
                Jeton = ApresGesteHl.EtatDuJeton.Libre,
            });
            Assert.IsTrue(ecran.EnApres, "précondition : l'écran est en mode après-geste");
            yield return Attendre(4);
            List<LigneGp> lignes = Relever("DecisionDetail", "après le geste", ecran.gameObject, canvas);
            Verifier("DecisionDetail/après le geste", lignes);
        }

        // ------------------------------------------------------------------------------ Shell : l'écran d'échec de démarrage
        [UnityTest]
        public IEnumerator GP_EcranEchecDeDemarrage_Reessayer()
        {
            List<LigneGp> lignes;
            try
            {
                Canvas canvas = NouveauCanvas("EchecGp");
                EcranEchecDeDemarrage echec = EcranEchecDeDemarrage.Construire(canvas.transform, null, () => { });
                Assert.IsNotNull(echec.BoutonReessayer, "précondition : « Réessayer » est monté (une action de relance est fournie)");
                lignes = Relever("EcranEchecDeDemarrage", "réessayer", echec.gameObject, canvas);
            }
            finally { DetruireMontes(); }
            Verifier("EcranEchecDeDemarrage/réessayer", lignes);
            yield break;
        }

        // ------------------------------------------------------------------------------ Shell : « La suite »
        private static EtatDeLaSuite JoueurNeuf() => new EtatDeLaSuite
        {
            Palier = 1, LaboId = "labo-1", Cuisson = "IDLE", PrecurseurType = "PYRALIN", Stock = "NONE",
            Dealers = new MafiaCleanCity.Operational.Selling.DealerDto[0],
            Lieutenants = new[] { new MafiaCleanCity.Operational.Lieutenant.RosterRow { lieutenant_id = "lt-1", name = "Lt. Tull", rule_count_band = "NONE" } },
        };

        [UnityTest]
        public IEnumerator GP_LaSuite_JoueurNeuf()
        {
            List<LigneGp> lignes;
            try
            {
                var suite = MonterSousCanvas<LaSuitePanelController>("LaSuiteGp", out Canvas canvas);
                suite.Rendre(JoueurNeuf());   // palier 1 : A1 « Commander », puis les gestes suivants (LaSuitePanelController:234)
                Assert.IsTrue(suite.Visible, "précondition : au moins une ligne est montrée");
                lignes = Relever("LaSuite", "joueur neuf", suite.gameObject, canvas);
            }
            finally { DetruireMontes(); }
            Verifier("LaSuite/joueur neuf", lignes);
            yield break;
        }

        // ------------------------------------------------------------------------------ ShellContracts : le pied d'écran
        [UnityTest]
        public IEnumerator GP_PiedDEcran_GesteAllume()
        {
            List<LigneGp> lignes;
            try
            {
                Canvas canvas = NouveauCanvas("PiedGp");
                var bande = new GameObject("BandeGp", typeof(RectTransform));
                bande.transform.SetParent(canvas.transform, false);
                var rt = (RectTransform)bande.transform;
                rt.anchorMin = new Vector2(0f, 0f); rt.anchorMax = new Vector2(1f, 0f); rt.pivot = new Vector2(0.5f, 0f);
                rt.sizeDelta = new Vector2(0f, 200f);
                var pile = bande.AddComponent<VerticalLayoutGroup>();
                pile.childControlWidth = true; pile.childControlHeight = true; pile.childForceExpandWidth = true; pile.childForceExpandHeight = false;
                // le geste de la bande basse (PiedDEcran:152), allumé et câblé : pressable
                Button geste = PiedDEcran.Geste(bande.transform, px => px * 4.2f, DesignTokens.Current.primaryFont, "Lancer", "la légende",
                                                PiedDEcran.Etat.Allume, () => { });
                Assert.IsTrue(geste.IsInteractable(), "précondition : le geste allumé et câblé est interactif");
                lignes = Relever("PiedDEcran", "geste allumé", bande, canvas);
            }
            finally { DetruireMontes(); }
            Verifier("PiedDEcran/geste allumé", lignes);
            yield break;
        }

        // ------------------------------------------------------------------------------ Onboarding : le tutoriel
        [UnityTest]
        public IEnumerator GP_Tutorial_UnTutorielDisponible()
        {
            List<LigneGp> lignes;
            try
            {
                var tuto = MonterSousCanvas<TutorialScreenController>("TutorielGp", out Canvas canvas);
                const string id = "tutorial.queue_runs_dry";
                // un suivant non nommé, non vu : « Compris » (:321) ; la bascule « On vous explique encore » (:365) est toujours offerte
                tuto.RendrePourTest(new TutorielData { next_tutorial_id = id, eligible_tutorial_ids = new[] { id }, shown_tutorial_ids = new string[0] });
                lignes = Relever("Tutorial", "un tutoriel disponible", tuto.gameObject, canvas);
            }
            finally { DetruireMontes(); }
            Verifier("Tutorial/un tutoriel disponible", lignes);
            yield break;
        }

        // ------------------------------------------------------------------------------ CoreLoops : la compression
        [UnityTest]
        public IEnumerator GP_Compression_ProblemeEtBudget()
        {
            List<LigneGp> lignes;
            try
            {
                var ecran = MonterSousCanvas<CompressionScreenController>("CompressionGp", out Canvas canvas);
                // un problème non traité, trois décisions restantes : les trois gestes RÉGLER / ÉCARTER / PASSER (:335) sont pressables
                ecran.RendrePourTest(new EtatData { stress_bucket = "calm", week_state = "none" }, new BoardData
                {
                    entries = new[] { new ProblemeDto { id = "p1", source_kind = "exception", tier = "MODERATE", addressed = false } },
                    decisions_used = 0, decisions_remaining = 3,
                });
                lignes = Relever("Compression", "un problème, budget restant", ecran.gameObject, canvas);
            }
            finally { DetruireMontes(); }
            Verifier("Compression/un problème, budget restant", lignes);
            yield break;
        }

        // ------------------------------------------------------------------------------ Dashboard : les boutons « Aller à »
        [UnityTest]
        public IEnumerator GP_Dashboard_AllerA()
        {
            List<LigneGp> lignes;
            try
            {
                var ecran = MonterSousCanvas<DashboardController>("DashboardGp", out Canvas canvas);
                // la couture rend un portefeuille fabriqué par le MÊME `Render()` que `LoadDashboard()` : les quatre « Aller à » (:797) naissent
                ecran.RendrePourTest(new WalletDto { wallet_band = "MODERATE" });
                // le fond, la feuille et le bandeau sont sous le canvas (pas sous l'hôte) : on relève le canvas entier
                lignes = Relever("Dashboard", "portefeuille servi, boutons Aller à", canvas.gameObject, canvas);
            }
            finally { DetruireMontes(); }
            Verifier("Dashboard/portefeuille servi, boutons Aller à", lignes);
            yield break;
        }

        // ------------------------------------------------------------------------------ Inspection : le registre et « DÉPOSER »
        [UnityTest]
        public IEnumerator GP_Inspection_RegistreEtDeposer()
        {
            List<LigneGp> lignes;
            try
            {
                var ecran = MonterSousCanvas<InspectionScreenController>("InspectionGp", out Canvas canvas);
                // dix-huit files servies, un bâtiment visé et un jeton : la couture les pose puis appelle le MÊME `Rendre()` que `Charger()`
                FileData[] files = Enumerable.Range(1, InspectionScreenController.NombreDeDistricts).Select(i => new FileData
                {
                    district = "district-" + i, queue_load = i % 2 == 0 ? "EMPTY" : "LIGHT", dispatcher_regime = "NOMINAL",
                    severity_distribution = new BandesSeverite(), type_distribution = new BandesSource { SCHEDULED = "SOME" },
                }).ToArray();
                ecran.RendrePourTest(files, new BatimentPossedeDto { building = "b-1", district_id = 1, district_name = "La Lisière" }, "jeton-de-test");
                Assert.IsTrue(ecran.PeutDeposer, "précondition : « DÉPOSER » est pressable (cible ET jeton posés)");
                Assert.AreEqual(InspectionScreenController.NombreDeDistricts, ecran.LignesRendues, "précondition : le registre rend ses 18 lignes");
                lignes = Relever("Inspection", "registre, cible et jeton posés", ecran.gameObject, canvas);
            }
            finally { DetruireMontes(); }
            Verifier("Inspection/registre, cible et jeton posés", lignes);
            yield break;
        }

        // ------------------------------------------------------------------------------ le VRAI shell (Accueil ; menu Plus)
        private sealed class TransportTemoin : ITransportDeSession
        {
            public SessionOpenDto Reponse;
            public IEnumerator Fermer(string jeton, System.Action<long, string> echec) { yield break; }
            public IEnumerator Ouvrir(string jeton, System.Action<SessionOpenDto> ok, System.Action<long, string> echec)
            {
                ok(Reponse);
                yield break;
            }
        }

        private sealed class SourceTemoin : ISourceDeLaSuite
        {
            public EtatDeLaSuite Etat;
            public IEnumerator Lire(string jeton, bool carteDeTete, System.Action<EtatDeLaSuite> ok)
            {
                if (Etat != null) Etat.CarteDeTete = carteDeTete;
                ok(Etat);
                yield break;
            }
        }

        private static void Poser<T>(object cible, string propriete, T valeur) =>
            typeof(AppShell).GetField($"<{propriete}>k__BackingField", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)
                .SetValue(cible, valeur);

        private static SessionOpenDto Session(string idCarte, params string[] file) => new SessionOpenDto
        {
            session_id = "s",
            hl_card = idCarte == null ? null : new HlCardDto { card_id = idCarte, decision_type_key = "AUTONOMY_REPORTS_PENDING",
                                                               impact_bucket = "moderate", urgency_bucket = "low" },
            queue = file.Select(id => new ExceptionCardDto { exception_id = id, severity_band = "MODERATE" }).ToArray(),
        };

        private IEnumerator AttendreLAccueil()
        {
            float t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 15f
                   && (shell.ContentSlot == null || shell.ContentSlot.GetComponentInChildren<ExceptionQueuePanelController>(false) == null))
                yield return null;
            yield return null;
            yield return null;   // deux frames de plus : un panneau de TROP monté après les attendus serait vu
            Canvas.ForceUpdateCanvases();
        }

        /// <summary>La régie du SHELL a une horloge réelle (son `Update` la fait avancer) : elle se croiserait avec l'horloge PROPRE du relevé
        /// (la régie ne vieillit pas une piste quand le temps recule). On publie donc une régie de test à horloge figée AVANT le relevé ;
        /// `RetourAppui` consulte la régie COURANTE à chaque appui. Le relevé est synchrone : le shell n'a pas d'`Update` entre deux appuis.</summary>
        private Regie RemplacerLaRegieDuShell()
        {
            RegieMouvement.Oublier();
            regie = RegieMouvement.PourTest();
            return regie;
        }

        /// <summary>L'Accueil rouvert par l'onglet Empire (un clic de production), comme `AccueilCanonPlayModeTests`.</summary>
        private IEnumerator MonterLAccueil(SessionOpenDto session)
        {
            LogAssert.ignoreFailingMessages = true;   // l'acquisition échoue sur le port fermé : la branche d'échec monte l'Accueil
            shellGo = new GameObject("AppShell_GpAccueil");
            shell = shellGo.AddComponent<AppShell>();
            yield return AttendreLAccueil();
            Poser(shell, "Token", "jeton-de-test");
            shell.TransportDeSessionPourTest = new TransportTemoin { Reponse = session };
            shell.SourceDeLaSuitePourTest = new SourceTemoin { Etat = JoueurNeuf() };
            if (shell.SurimpressionOuverte) Assert.AreEqual("surimpression", shell.Depiler());
            yield return null;
            ProductionClickSupport.Click(shell.TabBarRoot.Find("Tab_Empire").GetComponent<Button>());
            yield return AttendreLAccueil();
        }

        [UnityTest]
        public IEnumerator GP_AppShell_Accueil_SansCarteAvecFileEtSuite()
        {
            // sans carte de tête, deux cartes en file : le dock (AppShell:2502), la ligne de file (Trancher, ViewAll), La suite (ses gestes)
            yield return MonterLAccueil(Session(null, "e-1", "e-2"));
            Assert.IsNotNull(shell.ContentSlot.GetComponentsInChildren<ExceptionQueuePanelController>(false).LastOrDefault(), "précondition : la file est montée");
            Assert.IsNotNull(shell.ContentSlot.GetComponentsInChildren<LaSuitePanelController>(false).LastOrDefault(), "précondition : La suite est montée");
            RemplacerLaRegieDuShell();
            List<LigneGp> lignes = Relever("AppShell", "Accueil sans carte, file de deux, suite", shell.ShellCanvas.gameObject, shell.ShellCanvas);
            Verifier("AppShell/Accueil sans carte, file de deux, suite", lignes);
        }

        [UnityTest]
        public IEnumerator GP_AppShell_Accueil_AvecCarteDeTeteEtFile()
        {
            // une carte de tête et deux cartes en file : la tête (surface, « Lire maintenant » : carte des rapports), la ligne haute de la file, le dock
            yield return MonterLAccueil(Session("c-tete", "e-1", "e-2"));
            Assert.IsNotNull(shell.ContentSlot.GetComponentsInChildren<HighestLeverageCardController>(false).LastOrDefault(), "précondition : la tête est montée");
            RemplacerLaRegieDuShell();
            List<LigneGp> lignes = Relever("AppShell", "Accueil avec carte de tête et file", shell.ShellCanvas.gameObject, shell.ShellCanvas);
            Verifier("AppShell/Accueil avec carte de tête et file", lignes);
        }

        [UnityTest]
        public IEnumerator GP_AppShell_CoffreFerme()
        {
            List<LigneGp> lignes;
            try
            {
                // AUCUNE couture neuve : `CoffreFerme()` est public et ne touche pas le réseau (c'est `SettingsScreenController` qui l'appelle après la sortie
                // confirmée ; `CoffrePlayModeTests.K1` le joue de même). Synchrone, dans la frame de création : `Start()` (qui signe) ne tourne jamais.
                shellGo = new GameObject("AppShell_GpCoffre");
                shell = shellGo.AddComponent<AppShell>();
                shell.CoffreFerme();
                Assert.IsTrue(shell.CoffreFermeAffiche, "précondition : le coffre est fermé");
                Transform panneau = shell.ContentSlot.Find("CoffreFerme");
                Assert.IsNotNull(panneau, "le panneau du coffre fermé n'est pas monté");
                Assert.IsNotNull(panneau.Find("RouvrirLeCoffre"), "précondition : « Rouvrir le coffre » (:1647) est monté");
                RemplacerLaRegieDuShell();
                lignes = Relever("AppShell", "coffre fermé", panneau.gameObject, shell.ShellCanvas);
            }
            finally { DetruireLeShell(); }
            Verifier("AppShell/coffre fermé", lignes);
            yield break;
        }

        private Transform PiedDeLaCarte() =>
            shell.ContentSlot.GetComponentsInChildren<Transform>(true).FirstOrDefault(t => t.name == "Pied" && t.parent != null && t.parent.name == "ZoneLibre");

        // Revue ⊥ du lot (11/11) : le Pied de la carte (bascule « Chaleur ») est masqué sous l'Accueil (il tombait sous la plaque) MAIS reste la porte de la
        // bascule sur la carte NUE — qu'on retrouve en refermant l'Accueil. Le masquer à l'ouverture de l'onglet l'en retirait aussi.
        [UnityTest]
        public IEnumerator GP_AppShell_CarteNue_LePiedDeLaCarteReste_SousLAccueilIlSeMasque()
        {
            yield return MonterLAccueil(Session(null, "e-1", "e-2"));
            Transform pied = PiedDeLaCarte();
            Assert.IsNotNull(pied, "précondition : le Pied de la ville peinte est dans l'arbre (activé ou non)");
            yield return Attendre();
            Assert.IsFalse(pied.gameObject.activeSelf, "Accueil ouvert : le Pied est masqué (il serait sous la plaque de la file)");
            Assert.AreEqual("surimpression", shell.Depiler());   // referme l'Accueil : la carte NUE
            yield return Attendre();
            Assert.IsFalse(shell.SurimpressionOuverte, "précondition : plus de surimpression");
            Assert.IsTrue(PiedDeLaCarte().gameObject.activeSelf, "carte nue : le Pied (la porte de la bascule « Chaleur ») est visible");
            RemplacerLaRegieDuShell();
            List<LigneGp> lignes = Relever("AppShell", "carte nue", shell.ShellCanvas.gameObject, shell.ShellCanvas);
            Assert.IsTrue(lignes.Any(l => l.Chemin.EndsWith("/HeatToggle") && l.Pressable), "la bascule « Chaleur » est pressable sur la carte nue");
            Verifier("AppShell/carte nue", lignes);
        }

        [UnityTest]
        public IEnumerator GP_AppShell_MenuPlus()
        {
            List<LigneGp> lignes;
            try
            {
                // montage SYNCHRONE du vrai shell (comme `RetourSerie6PlayModeTests`) : l'onglet Plus monte le menu ; chaque entrée est un bouton (:1488)
                shellGo = new GameObject("AppShell_GpMenuPlus");
                shell = shellGo.AddComponent<AppShell>();
                shell.ActivateTab(AppShell.Tab.More);
                Assert.Greater(shell.MenuPlusEntrees, 0, "précondition : le menu Plus porte des entrées");
                Transform menu = null;
                for (int i = shell.ContentSlot.childCount - 1; i >= 0 && menu == null; i--)
                    if (shell.ContentSlot.GetChild(i).name == "MenuPlus") menu = shell.ContentSlot.GetChild(i);   // le plus RÉCENT
                Assert.IsNotNull(menu, "le menu Plus n'est pas monté");
                RemplacerLaRegieDuShell();
                lignes = Relever("AppShell", "menu Plus", menu.gameObject, shell.ShellCanvas);
            }
            finally { DetruireLeShell(); }
            Verifier("AppShell/menu Plus", lignes);
            yield break;
        }
    }
}
