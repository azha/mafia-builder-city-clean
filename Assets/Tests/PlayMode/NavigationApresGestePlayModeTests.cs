using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using MafiaCleanCity.Operational.Autonomy;
using MafiaCleanCity.Operational.Exceptions;
using MafiaCleanCity.Operational.Tests;   // AdresseDuBackPlayModeTests.Racines
using MafiaCleanCity.Tests;               // ProductionClickSupport
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    /// <summary>TD-938 (a) — un AGIR que le back répond `outcome: "navigate"` MÈNE à l'écran servi (design `Tools/td-938-navigate/DESIGN.md` v3,
    /// approuvé, revue ⊥ ×3 ; rulings f2 11/11). Vrai shell hors réseau (port fermé + transport témoin, patron d'`AccueilCanon` A13) ; la réponse de
    /// `commit` passe par le MÊME chemin que le réseau (`HlCardClient.ReponsePourTest` ne remplace que le transport).
    ///   G1  la table client CLASSE les 4 valeurs du back (3 menées + 1 inconnue assumée, TD-981) — contrôle positif : liste amputée ⇒ rouge
    ///   G2  EFFET : `exceptions_queue` / `exceptions_escalations` ⇒ ⑨ monté, `autonomy_reports` ⇒ c7 monté ; ④ refermé, l'Accueil NON relu par-dessus,
    ///       aucun `session/open` ; anti-vacuité sur la cible INERTE `ExceptionQueuePanelController` (la ligne de l'Accueil)
    ///   G3  INCONNU (`supply_chain_trace`, hors table, null, vide) ⇒ rien de monté, compté, journalisé, Accueil relu — contrôle : écran CONNU ⇒ 0 inconnu
    ///   G4  DÉTECTEUR TD-983 : ⑤ poste `{}` (le back lit « n'agit pas ») ⇒ sa branche navigate est dormante
    ///   G5  [Lire maintenant] (Q1) : (a) 200 navigate ⇒ UN commit(0), c7 monté par le shell ; (b) refus servi ⇒ c7 monté QUAND MÊME avec la phrase
    ///       SERVIE, jamais ⑤ ; (b') refus muet ⇒ aucune phrase, jamais le littéral du client ; (c) EFFET du puits : la ligne `Error` de c7 porte la phrase.
    /// ⚠️ Écart au design (G5 (b), consigné) : l'effet « la ligne `Error` porte la phrase » ne peut pas se mesurer DANS le shell hors réseau (c7 n'y
    /// charge jamais : son `SignIn` échoue) ; il est scindé en une CHAÎNE (④ ⇒ `c7.PhraseDuRefus`, G5 b) et un EFFET (`PhraseDuRefus` ⇒ ligne
    /// `Error` rendue par le même `Render()` qu'un chargement réussi, G5 c).</summary>
    [Category("DecisionCarte")]
    public class NavigationApresGestePlayModeTests
    {
        private GameObject shellGo, bancGo;
        private AppShell shell;
        private TransportTemoin transport;
        private HashSet<GameObject> racinesAvant;

        /// <summary>Les QUATRE `navigate_screen` du back, écrits ICI À LA MAIN (anti-tautologie), recopiés de `hl-option-table.ts:89-110`
        /// (lot back `hl-card-apres-geste` @35bdd6cb) : 103, 104, 106, 108.</summary>
        private static readonly string[] ServisParLeBack = { "exceptions_escalations", "autonomy_reports", "supply_chain_trace", "exceptions_queue" };

        [SetUp]
        public void SetUp()
        {
            racinesAvant = new HashSet<GameObject>(AdresseDuBackPlayModeTests.Racines());
            AdresseDuBack.PoserPourTest("http://127.0.0.1:9");   // port FERMÉ : aucun appel réseau n'aboutit
        }

        [TearDown]
        public void TearDown()
        {
            if (shell != null && shell.ShellCanvas != null) Object.DestroyImmediate(shell.ShellCanvas.gameObject);
            if (shellGo != null) Object.DestroyImmediate(shellGo);
            if (bancGo != null) Object.DestroyImmediate(bancGo);
            shell = null; shellGo = null; bancGo = null; transport = null;
            if (racinesAvant != null)
                foreach (GameObject g in AdresseDuBackPlayModeTests.Racines().Where(g => g != null && !racinesAvant.Contains(g)).ToList())
                    Object.DestroyImmediate(g);
            racinesAvant = null;
            AdresseDuBack.Oublier();
            EtatPublieParLeShell.RendrePourTest();
            MafiaCleanCity.I18n.I18nCatalog.Oublier();
            LogAssert.ignoreFailingMessages = false;
        }

        // ═══ G1 — la table classe les 4 valeurs du back ═══════════════════════════════════════════════════════════════════

        /// <summary>Les écarts de classement d'une table (vide = juste) : même compte et mêmes membres que le back, menées ∪ inconnues = servies,
        /// intersection vide, chaque menée a un écran, chaque inconnue assumée n'en a pas.</summary>
        private static List<string> EcartsDeClassement(IReadOnlyList<string> servis, IReadOnlyList<string> menes, IReadOnlyList<string> inconnus, IReadOnlyList<string> back)
        {
            var e = new List<string>();
            if (servis.Count != back.Count) e.Add($"compte : {servis.Count} servis côté client, {back.Count} au back");
            foreach (string v in back) if (!servis.Contains(v)) e.Add($"« {v} » (back) manque à la table client");
            foreach (string v in servis) if (!back.Contains(v)) e.Add($"« {v} » (client) n'est pas servi par le back");
            foreach (string v in servis) if (!menes.Contains(v) && !inconnus.Contains(v)) e.Add($"« {v} » n'est NI menée NI inconnue assumée : non classée");
            foreach (string v in menes.Concat(inconnus)) if (!servis.Contains(v)) e.Add($"« {v} » classée mais pas servie");
            foreach (string v in menes) if (inconnus.Contains(v)) e.Add($"« {v} » menée ET inconnue assumée");
            foreach (string v in menes) if (NavigationApresGeste.Pour(v) == NavigationApresGeste.Cible.Aucune) e.Add($"« {v} » menée mais sans écran");
            foreach (string v in inconnus) if (NavigationApresGeste.Pour(v) != NavigationApresGeste.Cible.Aucune) e.Add($"« {v} » inconnue assumée mais menée");
            return e;
        }

        [Test]
        public void G1_LaTableClasseLesQuatreValeursDuBack_TroisMeneesUneInconnueAssumee()
        {
            var ecarts = EcartsDeClassement(NavigationApresGeste.EcransServis, NavigationApresGeste.EcransMenes, NavigationApresGeste.EcransInconnusAssumes, ServisParLeBack);
            Assert.IsEmpty(ecarts, string.Join(" · ", ecarts));
            Assert.AreEqual(3, NavigationApresGeste.EcransMenes.Count, "3 menées (ruling f2 : 103 et 108 → ⑨, 104 → c7)");
            Assert.AreEqual(1, NavigationApresGeste.EcransInconnusAssumes.Count, "1 inconnue assumée (106, TD-981)");
            Assert.AreEqual(NavigationApresGeste.Cible.FileDesExceptions, NavigationApresGeste.Pour("exceptions_escalations"), "103 → ⑨, qui porte le total des escalades");
            Assert.AreEqual(NavigationApresGeste.Cible.Aucune, NavigationApresGeste.Pour(null));
            Assert.AreEqual(NavigationApresGeste.Cible.Aucune, NavigationApresGeste.Pour(""));

            // CONTRÔLE POSITIF : le même corps rougit sur une table amputée d'une valeur, et sur une inconnue assumée oubliée
            Assert.IsNotEmpty(EcartsDeClassement(NavigationApresGeste.EcransServis.Skip(1).ToList(), NavigationApresGeste.EcransMenes,
                NavigationApresGeste.EcransInconnusAssumes, ServisParLeBack), "CONTRÔLE POSITIF : une valeur du back retirée de la table est VUE");
            Assert.IsNotEmpty(EcartsDeClassement(NavigationApresGeste.EcransServis, NavigationApresGeste.EcransMenes, new string[0], ServisParLeBack),
                "CONTRÔLE POSITIF : `supply_chain_trace` non classée est VUE");
        }

        [Test]
        public void G1b_EstUneNavigation_LitOutcome_JamaisNavigateScreen()
        {
            Assert.IsTrue(NavigationApresGeste.EstUneNavigation(Navigation(null)), "un navigate à écran NUL part sur le chemin navigate (branche inconnue, comptée)");
            Assert.IsTrue(NavigationApresGeste.EstUneNavigation(Navigation("exceptions_queue")));
            Assert.IsFalse(NavigationApresGeste.EstUneNavigation(new CommitResponseDto { committed = true, outcome = "noted", navigate_screen = "exceptions_queue" }),
                "CONTRÔLE : un écran servi sans `outcome: navigate` n'est pas une navigation");
            Assert.IsFalse(NavigationApresGeste.EstUneNavigation(null));
        }

        // ═══ G4 — détecteur TD-983 : ⑤ poste `{}` ═════════════════════════════════════════════════════════════════════════

        [Test]
        public void G4_Detecteur_TD983_LeDetailPosteUnCorpsVide_SaBrancheNavigateEstDormante()
        {
            Assert.AreEqual("{}", HlCardClient.CorpsDuCommit(null), "sans option, le corps est `{}` (le back lit « n'agit pas » ⇒ `noted`)");
            string source = File.ReadAllText(Path.Combine(Application.dataPath, "Scripts/Shell/DecisionDetailScreenController.cs"));
            int i = source.IndexOf("client.Commit(", StringComparison.Ordinal);
            Assert.GreaterOrEqual(i, 0, "anti-vacuité : ⑤ appelle `client.Commit(`");
            int fin = source.IndexOf(");", i, StringComparison.Ordinal);
            string appel = source.Substring(i, fin - i);
            StringAssert.Contains("CarteAffichee.card_id", appel, "anti-vacuité : c'est bien l'appel du commit de ⑤");
            Assert.IsFalse(Regex.IsMatch(appel, @"Option(Agir|Laisser)|optionChoisie"),
                "TD-983 SE FERME : ⑤ poste désormais une option — sa branche navigate (`OnNavigate`) devient vivante ; écrire sa garde d'EFFET, puis retirer ce détecteur");
        }

        // ═══ G2 — EFFET : l'écran servi est monté ═════════════════════════════════════════════════════════════════════════

        [UnityTest]
        public IEnumerator G2a_NavigateFileDesExceptions_LaFileEstMontee_LAccueilNEstPasRelu() =>
            Mener("AppShell_G2a", "CUE_CASCADE_FALLOUT", "exceptions_queue", () => Montes<ExceptionQueueController>());

        [UnityTest]
        public IEnumerator G2b_NavigateEscalades_LaFileQuiPorteLeurTotalEstMontee() =>
            Mener("AppShell_G2b", "ESCALATION_BACKLOG_REVIEW", "exceptions_escalations", () => Montes<ExceptionQueueController>());

        [UnityTest]
        public IEnumerator G2c_NavigateRapports_LaBoiteDesRapportsEstMontee() =>
            Mener("AppShell_G2c", "AUTONOMY_REPORTS_PENDING", "autonomy_reports", () => Montes<AutonomyInboxController>());

        private IEnumerator Mener(string nom, string typeDeCarte, string ecran, Func<int> compteDeLaCible)
        {
            yield return MonterLeShellAvecUneCarte(nom, typeDeCarte);
            HighestLeverageCardController tete = Tete();
            Assert.IsNotNull(tete != null ? tete.CurrentCard : null, "précondition : une carte est montrée");
            Assert.AreEqual(0, compteDeLaCible(), "anti-vacuité : l'écran servi n'est pas monté avant le geste");
            Assert.AreEqual(1, Montes<ExceptionQueuePanelController>(), "la cible INERTE (la ligne de file de l'Accueil) est là — un compte qui la confondrait avec ⑨ serait vrai sans rien monter");
            int relectures = shell.RelecturesApresDecision, inconnues = shell.NavigationsInconnues, ouvertures = transport.Ouvertures;

            tete.DecisionAccepteePourTest(Navigation(ecran));
            Assert.AreEqual(1, tete.NavigationsSuivies, "la carte a levé `OnNavigate`");
            Assert.AreEqual(1, tete.DecisionsTranchees, "la décision acceptée est comptée (toute décision 200 `committed`)");
            for (int f = 0; f < 6; f++) yield return null;

            Assert.AreEqual(1, compteDeLaCible(), $"EFFET : « {ecran} » a monté son écran");
            Assert.AreEqual(0, Montes<HighestLeverageCardController>(), "④ est refermé (l'Accueil s'est dépilé)");
            Assert.AreEqual(0, Montes<ExceptionQueuePanelController>(), "la ligne de l'Accueil est partie avec lui");
            Assert.AreEqual(relectures, shell.RelecturesApresDecision, "l'Accueil n'est PAS relu par-dessus l'écran servi");
            Assert.AreEqual(inconnues, shell.NavigationsInconnues, "écran connu : aucune navigation inconnue");
            Assert.AreEqual(ouvertures, transport.Ouvertures, "aucun `session/open` sur le chemin mené");
        }

        // ═══ G3 — INCONNU ═════════════════════════════════════════════════════════════════════════════════════════════════

        [UnityTest]
        public IEnumerator G3_EcranInconnu_RienDeMonte_CompteJournaliseEtAccueilRelu_ControleEcranConnu()
        {
            yield return MonterLeShellAvecUneCarte("AppShell_G3", "BACKPRESSURE_CRITICAL_TRACE");
            foreach (string ecran in new[] { "supply_chain_trace", "ecran_qui_n_existe_pas", null, "" })
            {
                HighestLeverageCardController tete = Tete();
                Assert.IsNotNull(tete != null ? tete.CurrentCard : null, $"précondition « {ecran ?? "null"} » : une carte est montrée");
                int relectures = shell.RelecturesApresDecision, inconnues = shell.NavigationsInconnues;
                LogAssert.Expect(LogType.Warning, new Regex(Regex.Escape($"navigate_screen « {ecran ?? "null"} »")));
                tete.DecisionAccepteePourTest(Navigation(ecran));
                yield return AttendreQue(() => shell.RelecturesApresDecision > relectures);
                yield return AttendreLAccueil();

                Assert.AreEqual(inconnues + 1, shell.NavigationsInconnues, $"« {ecran ?? "null"} » : UNE navigation inconnue comptée");
                Assert.AreEqual(relectures + 1, shell.RelecturesApresDecision, $"« {ecran ?? "null"} » : l'Accueil est relu (comportement d'avant)");
                Assert.AreEqual(0, Montes<ExceptionQueueController>(), $"« {ecran ?? "null"} » : aucune file devinée");
                Assert.AreEqual(0, Montes<AutonomyInboxController>(), $"« {ecran ?? "null"} » : aucune boîte devinée");
            }

            // CONTRÔLE POSITIF (B3) : un écran CONNU ⇒ AUCUNE inconnue, et sa cible montée
            HighestLeverageCardController derniere = Tete();
            Assert.IsNotNull(derniere != null ? derniere.CurrentCard : null, "précondition du contrôle : une carte est montrée");
            int avant = shell.NavigationsInconnues;
            derniere.DecisionAccepteePourTest(Navigation("exceptions_queue"));
            for (int f = 0; f < 6; f++) yield return null;
            Assert.AreEqual(avant, shell.NavigationsInconnues, "CONTRÔLE : un écran connu n'est jamais compté inconnu");
            Assert.AreEqual(1, Montes<ExceptionQueueController>(), "CONTRÔLE : un écran connu monte sa cible");
        }

        // ═══ G5 — [Lire maintenant] passe par commit(0) ═══════════════════════════════════════════════════════════════════

        [UnityTest]
        public IEnumerator G5a_LireMaintenant_UnCommitAgir_LeShellMonteLesRapports()
        {
            yield return MonterLeShellAvecUneCarte("AppShell_G5a", "AUTONOMY_REPORTS_PENDING");
            HighestLeverageCardController tete = Tete();
            Assert.IsTrue(tete != null && tete.EstCarteDesRapports, "précondition : la carte des RAPPORTS est montrée");
            var chemins = new List<string>();
            tete.ClientPourTest.ReponsePourTest = chemin => { chemins.Add(chemin); return (200, CorpsNavigation("autonomy_reports")); };
            int commits = tete.CommitRequestCount;

            yield return tete.LireLesRapports();
            Assert.AreEqual(commits + 1, tete.CommitRequestCount, "UN commit");
            Assert.AreEqual(HlCardClient.OptionAgir, tete.DerniereOptionPosee, "…avec l'option AGIR (0) : le back navigue ET réclame la carte");
            CollectionAssert.AreEqual(new[] { "/v1/session/hl-card/c-rapports/commit" }, chemins, "la route du commit de CETTE carte");
            Assert.AreEqual(1, tete.NavigationsSuivies, "la réponse `navigate` a levé `OnNavigate`");
            Assert.IsFalse(tete.RapportsOuverts, "chemin heureux : ce n'est PAS le repli de ④ qui monte les rapports");
            for (int f = 0; f < 6; f++) yield return null;

            Assert.AreEqual(1, Montes<AutonomyInboxController>(), "EFFET : les rapports sont montés (par le shell)");
            Assert.AreEqual(0, Montes<HighestLeverageCardController>(), "④ est refermé");
            Assert.AreEqual(0, Montes<DecisionDetailScreenController>(), "aucune table feutre");
        }

        [UnityTest]
        public IEnumerator G5b_LireMaintenant_RefusServi_LesRapportsSOuvrentQuandMeme_AvecLaPhraseServie_JamaisLeDetail()
        {
            yield return MonterLeShellAvecUneCarte("AppShell_G5b", "AUTONOMY_REPORTS_PENDING");
            const string phrase = "C’était déjà tranché.";
            MafiaCleanCity.I18n.I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string> { { ApresGesteHl.CleDejaTranchee, phrase } });
            HighestLeverageCardController tete = Tete();
            Assert.IsTrue(tete != null && tete.EstCarteDesRapports, "précondition : la carte des RAPPORTS est montrée");
            tete.ClientPourTest.ReponsePourTest = _ => (409, CorpsDeRefus(ApresGesteHl.CleDejaTranchee));
            int commits = tete.CommitRequestCount;

            yield return tete.LireLesRapports();
            Assert.AreEqual(commits + 1, tete.CommitRequestCount, "UN commit");
            Assert.AreNotEqual(true, tete.LastCommitCommitted, "refusé : la carte RESTE");
            Assert.AreEqual(phrase, tete.ClientPourTest.DernierePhraseDeRefus, "anti-vacuité : le refus porte bien une phrase SERVIE");
            Assert.AreEqual(tete.ClientPourTest.DernierePhraseDeRefus, tete.RefusRendu, "la carte dit la phrase servie");
            Assert.IsTrue(tete.RapportsOuverts, "le repli de ④ a ouvert les rapports");
            Assert.AreEqual(0, tete.NavigationsSuivies, "aucune navigation sur un refus");
            for (int f = 0; f < 4; f++) yield return null;

            Assert.AreEqual(1, Montes<AutonomyInboxController>(), "EFFET : les rapports sont montés QUAND MÊME (le joueur a demandé à lire), une fois");
            AutonomyInboxController boite = shell.ContentSlot.GetComponentsInChildren<AutonomyInboxController>(false).LastOrDefault();
            Assert.AreEqual(tete.ClientPourTest.DernierePhraseDeRefus, boite.PhraseDuRefus, "la phrase SERVIE du refus est annoncée aux rapports");
            Assert.AreEqual(0, Montes<DecisionDetailScreenController>(), "jamais la table feutre de ⑤ sous les rapports (deux écrans pour un geste)");
        }

        [UnityTest]
        public IEnumerator G5bControle_LireMaintenant_RefusMuet_AucunePhrase_JamaisLeLitteralDuClient()
        {
            yield return MonterLeShellAvecUneCarte("AppShell_G5b2", "AUTONOMY_REPORTS_PENDING");
            HighestLeverageCardController tete = Tete();
            Assert.IsTrue(tete != null && tete.EstCarteDesRapports, "précondition : la carte des RAPPORTS est montrée");
            tete.ClientPourTest.ReponsePourTest = _ => (503, "{\"payload\":{\"error\":{\"code\":\"SERVICE_UNAVAILABLE\",\"message\":\"down\"}}}");

            yield return tete.LireLesRapports();
            Assert.IsNull(tete.ClientPourTest.DernierePhraseDeRefus, "précondition : aucun refus SERVI");
            Assert.IsNotNull(tete.RefusRendu, "anti-vacuité : la carte, elle, a retombé sur sa phrase (la phrase qui ne DOIT PAS passer aux rapports)");
            for (int f = 0; f < 4; f++) yield return null;

            Assert.AreEqual(1, Montes<AutonomyInboxController>(), "les rapports s'ouvrent quand même, une fois");
            AutonomyInboxController boite = shell.ContentSlot.GetComponentsInChildren<AutonomyInboxController>(false).LastOrDefault();
            Assert.IsNull(boite.PhraseDuRefus, "refus MUET : aucune phrase annoncée — jamais la phrase de repli du client");
            Assert.AreNotEqual(tete.RefusRendu, boite.PhraseDuRefus);
        }

        /// <summary>G5 (d) — revue ⊥ du code (IMPORTANT) : une décision ACCEPTÉE qui n'est PAS `navigate` a déjà sa suite (`TrancheePourDeBon`) ; le repli
        /// de [Lire maintenant] ne monte PAS les rapports en plus (deux écrans pour un geste). Inatteignable au back @35bdd6cb (104 : option 0 ⇒ toujours
        /// `navigate`) : garde DÉFENSIVE du repli, pas un scénario de jeu.</summary>
        [UnityTest]
        public IEnumerator G5d_LireMaintenant_AccepteeSansNavigation_LeRepliNeMontePasLesRapportsEnPlus()
        {
            yield return MonterLeShellAvecUneCarte("AppShell_G5d", "AUTONOMY_REPORTS_PENDING");
            HighestLeverageCardController tete = Tete();
            Assert.IsTrue(tete != null && tete.EstCarteDesRapports, "précondition : la carte des RAPPORTS est montrée");
            tete.ClientPourTest.ReponsePourTest = _ => (200, CorpsNavigation("autonomy_reports").Replace("\"navigate\",", "\"noted\",").Replace("\"autonomy_reports\"", "null"));
            int relectures = shell.RelecturesApresDecision;

            yield return tete.LireLesRapports();
            Assert.AreEqual(true, tete.LastCommitCommitted, "précondition : la décision est ACCEPTÉE");
            Assert.AreEqual("noted", tete.DerniereReponse != null ? tete.DerniereReponse.outcome : null, "précondition : la réponse n'est pas une navigation");
            Assert.IsFalse(tete.RapportsOuverts, "le repli ne monte PAS les rapports sur une décision acceptée");
            yield return AttendreQue(() => shell.RelecturesApresDecision > relectures);
            Assert.AreEqual(relectures + 1, shell.RelecturesApresDecision, "la suite de la décision acceptée a eu lieu (l'Accueil est relu)");
            for (int f = 0; f < 4; f++) yield return null;
            Assert.AreEqual(0, Montes<AutonomyInboxController>(), "aucun écran des rapports en plus");
        }

        /// <summary>G5 (c) — l'EFFET du puits : la phrase annoncée AVANT le premier rendu est dans la ligne `Error` du MÊME `Render()` qu'un chargement
        /// réussi ; annoncée APRÈS (mise en page existante), elle re-rend. Contrôle : sans phrase servie, aucune ligne `Error`. Le texte est asserté
        /// (pas la présence) : `RenderError` fabrique un homonyme `Error` avec un autre littéral (TD-987).</summary>
        [UnityTest]
        public IEnumerator G5c_LaPhraseAnnonceeEstRendueDansLaLigneErrorDesRapports()
        {
            LogAssert.ignoreFailingMessages = true;   // le `Start()` de c7 tente sa connexion au tour suivant : port fermé, il échoue (attendu)
            const string phrase = "C’était déjà tranché.";
            bancGo = new GameObject("BancRapports", typeof(RectTransform), typeof(Canvas));

            var avecGo = new GameObject("RapportsAvecPhrase", typeof(RectTransform));
            avecGo.transform.SetParent(bancGo.transform, false);
            AutonomyInboxController avec = avecGo.AddComponent<AutonomyInboxController>();
            var parentAvec = new GameObject("MontageAvec", typeof(RectTransform)); parentAvec.transform.SetParent(bancGo.transform, false);
            avec.SetMountParent(parentAvec.transform);
            avec.AnnoncerUnRefus(phrase);                 // fenêtre synchrone du montage : la mise en page n'existe pas encore
            avec.RendrePourTest(new AutonomyReportDto[0]);   // le premier Render, celui d'un chargement réussi
            Assert.AreEqual(new[] { phrase }, TextesError(parentAvec.transform), "EFFET : la ligne `Error` porte EXACTEMENT la phrase servie annoncée avant le rendu");

            var sansGo = new GameObject("RapportsSansPhrase", typeof(RectTransform));
            sansGo.transform.SetParent(bancGo.transform, false);
            AutonomyInboxController sans = sansGo.AddComponent<AutonomyInboxController>();
            var parentSans = new GameObject("MontageSans", typeof(RectTransform)); parentSans.transform.SetParent(bancGo.transform, false);
            sans.SetMountParent(parentSans.transform);
            sans.AnnoncerUnRefus(null);
            sans.AnnoncerUnRefus("   ");
            sans.RendrePourTest(new AutonomyReportDto[0]);
            Assert.IsEmpty(TextesError(parentSans.transform), "CONTRÔLE : sans phrase servie, aucune ligne `Error`");

            sans.AnnoncerUnRefus(phrase);                 // annoncée APRÈS : la mise en page existe, on re-rend
            yield return null;                            // les rangées d'avant sont détruites en fin d'image
            Assert.AreEqual(new[] { phrase }, TextesError(parentSans.transform), "annoncée après le rendu : la ligne apparaît au re-rendu");
        }

        // ═══ Banc ═════════════════════════════════════════════════════════════════════════════════════════════════════════

        private static string[] TextesError(Transform racine) =>
            racine.GetComponentsInChildren<TMPro.TextMeshProUGUI>(true).Where(t => t != null && t.name == "Error").Select(t => t.text).ToArray();

        private static CommitResponseDto Navigation(string ecran) => new CommitResponseDto
        {
            committed = true, structural = false, outcome = "navigate", executed_ids = new string[0],
            navigate_screen = ecran, navigate_ids = new string[0], outcome_i18n_key = null,
        };

        /// <summary>Le corps 200 de `commit` sur une navigation — les DIX clés, toutes présentes (`hl-commit-response.ts`, back @35bdd6cb).</summary>
        private static string CorpsNavigation(string ecran) =>
            "{\"payload\":{\"data\":{\"committed\":true,\"structural\":false,\"outcome\":\"navigate\",\"executed_ids\":[],\"stopped_at_id\":null,"
            + "\"stopped_at_error\":null,\"navigate_screen\":\"" + ecran + "\",\"navigate_ids\":[\"r-1\"],\"outcome_i18n_key\":null,\"stopped_at_i18n_key\":null}}}";

        private static string CorpsDeRefus(string cle) =>
            "{\"payload\":{\"error\":{\"code\":\"HL_CARD_ALREADY_RESOLVED\",\"message\":\"already resolved\",\"user_facing_i18n_key\":\"" + cle + "\"}}}";

        private int Montes<T>() where T : Component => shell.ContentSlot.GetComponentsInChildren<T>(false).Length;

        private HighestLeverageCardController Tete() =>
            shell.ContentSlot.GetComponentsInChildren<HighestLeverageCardController>(false).LastOrDefault();

        /// <summary>Vrai shell, hors réseau ; l'Accueil rouvert par EMPIRE lit le transport témoin, qui sert UNE carte « c-rapports » du fournisseur nommé
        /// (`decision_type_key` : celui dont l'option 0 sert l'écran testé, table du back `hl-option-table.ts:89-110` — jamais une carte inventée).</summary>
        private IEnumerator MonterLeShellAvecUneCarte(string nom, string typeDeCarte)
        {
            LogAssert.ignoreFailingMessages = true;
            shellGo = new GameObject(nom);
            shell = shellGo.AddComponent<AppShell>();
            yield return AttendreLAccueil();
            Poser(shell, "Token", "jeton-de-test");
            transport = new TransportTemoin { Reponse = AvecCarte("c-rapports", typeDeCarte) };
            shell.TransportDeSessionPourTest = transport;
            if (shell.SurimpressionOuverte) Assert.AreEqual("surimpression", shell.Depiler());
            yield return null;
            ProductionClickSupport.Click(shell.TabBarRoot.Find("Tab_Empire").GetComponent<UnityEngine.UI.Button>());
            yield return AttendreLAccueil();
        }

        private IEnumerator AttendreLAccueil()
        {
            float t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 15f
                   && (shell.ContentSlot == null || shell.ContentSlot.GetComponentInChildren<ExceptionQueuePanelController>(false) == null))
                yield return null;
            yield return null;
            yield return null;
        }

        private static IEnumerator AttendreQue(Func<bool> condition, float secondes = 10f)
        {
            float fin = Time.realtimeSinceStartup + secondes;
            while (Time.realtimeSinceStartup < fin && !condition()) yield return null;
        }

        private sealed class TransportTemoin : ITransportDeSession
        {
            public int Ouvertures;
            public SessionOpenDto Reponse;
            public IEnumerator Fermer(string jeton, Action<long, string> echec) { yield break; }
            public IEnumerator Ouvrir(string jeton, Action<SessionOpenDto> ok, Action<long, string> echec)
            {
                Ouvertures++;
                ok(Reponse);
                yield break;
            }
        }

        private static void Poser<T>(object cible, string propriete, T valeur) =>
            typeof(AppShell).GetField($"<{propriete}>k__BackingField", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)
                .SetValue(cible, valeur);

        private static SessionOpenDto AvecCarte(string id, string typeDeCarte) => new SessionOpenDto
        {
            session_id = "s", hl_card = id == null ? null : new HlCardDto { card_id = id, decision_type_key = typeDeCarte,
                                                                               impact_bucket = "moderate", urgency_bucket = "low" },
            queue = new ExceptionCardDto[0],
        };
    }
}
