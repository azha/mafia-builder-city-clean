using System.Collections;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using MafiaCleanCity.Operational.Lieutenant;
using MafiaCleanCity.Tests;   // SeederSupport
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    /// <summary>⑦ LES DEUX DÉCISIONS (2026-09-23, ordre de f2, option (b)) — le signal qui dérive (cadre 1 : reinforce_direct_order,
    /// reset_observation_window, disrupt_cue + repère) et l'ordre permanent (cadre 2 : RENEW, REVOKE, PROMOTE_TO_DEFAULT), servis par le
    /// back, qu'aucun joueur ne pouvait prendre. Gardes de VALEUR : la décision ENVOYÉE == celle TOUCHÉE ; l'état affiché vient de la
    /// RE-LECTURE (les deux routes rendent `{ applied: true }`, aucun état) ; les refus en mots.
    /// ✅ Le cadre 2 est JOIGNABLE par un vrai chemin joueur (option (a), décision de f2 du 23/09) : « Donner un ordre » ouvre l'éditeur
    ///    de ⑧ en mode ORDRE PERMANENT, « Signer l’ordre » émet `POST …/standing-order`. La dette « cadre 2 injoignable » (fac52423) tombe :
    ///    le test réel ÉMET l'ordre par l'écran, plus par un seeder de test.
    /// Catégorie propre, sans la paire (compte du seeder) : au filtre après un run vert.</summary>
    [Category("EcranLieutenantDecisions")]
    public class LieutenantDecisionsPlayModeTests
    {
        private GameObject controllerGo;
        private static string lieutenantId;
        private static bool seme;

        [OneTimeSetUp]
        public void Semer()
        {
            if (seme) return;
            string json = SeederSupport.RunSeeder("Tools/seed_operational_demo.mjs", "=== OPERATIONAL DEMO SEEDED ===");
            lieutenantId = SeederSupport.ExtractString(json, "exception_lieutenant_id");
            Assert.IsTrue(SeederSupport.IsUuid(lieutenantId), $"lieutenant semé lu dans le manifeste (lu : '{lieutenantId}')");
            seme = true;
        }

        [TearDown]
        public void TearDown()
        {
            if (controllerGo != null) Object.DestroyImmediate(controllerGo);
            controllerGo = null;
            MafiaCleanCity.I18n.I18nCatalog.Oublier();   // TD-576, classe « catalogue »
        }

        private LieutenantScreenController Monter()
        {
            controllerGo = new GameObject("LieutenantScreen");
            return controllerGo.AddComponent<LieutenantScreenController>();
        }

        private static LieutenantBands Bandes(string phase, string fraicheur, bool promouvoir) =>
            new LieutenantBands
            {
                name = "Lt. Test", archetype = "COOK", granted_role = "executor", mode = "delegated", op_state_band = "ACTIVE",
                rule_count_band = "NONE", tenure_bucket = "FRESH", drift_phase = phase,
                standing_order = new StandingOrderBandDto { freshness = fraicheur, promotion_suggested = promouvoir },
            };

        // ═══ 1. ÉTATS FABRIQUÉS — les cadres suivent le GET, sans réseau ═══════════════════════════════════════════════

        [Test]
        public void Fabrique_LesCadresSuiventLesBandes_JamaisLaDecision()
        {
            var ctl = Monter();
            ctl.RendreBandesPourTest(Bandes("DIRECT_ALIGNED", "NONE", false));
            Assert.IsFalse(ctl.SectionSignalVisible, "à l'écoute : pas de cadre 1");
            Assert.IsFalse(ctl.SectionOrdreVisible, "aucun ordre : pas de cadre 2");
            Assert.IsTrue(ctl.RenderedTexts.Contains(FamilleLabels.Signal("DIRECT_ALIGNED")), "la ligne Signal rend la phase servie");
            Assert.IsTrue(ctl.RenderedTexts.Contains(FamilleLabels.OrdrePermanent("NONE")), "la ligne Ordre permanent rend « aucun ordre »");

            ctl.RendreBandesPourTest(Bandes("DRIFTING", "EXPIRES_SOON", true));
            Assert.IsTrue(ctl.SectionSignalVisible, "dérive : le cadre 1 paraît");
            Assert.IsTrue(ctl.SectionOrdreVisible, "un ordre expire : le cadre 2 paraît");
            Assert.IsTrue(ctl.PromouvoirVisible, "promotion_suggested : « En faire la règle » est offert");
            Assert.IsTrue(ctl.RenderedTexts.Contains(FamilleLabels.Signal("DRIFTING")));
            Assert.IsTrue(ctl.RenderedTexts.Contains(FamilleLabels.OrdrePermanent("EXPIRES_SOON")));

            Assert.IsFalse(ctl.DonnerOrdreVisible, "un ordre existe : « Donner un ordre » n'est pas offert");
            ctl.RendreBandesPourTest(Bandes("DIRECT_ALIGNED", "NONE", false));
            Assert.IsTrue(ctl.DonnerOrdreVisible, "aucun ordre : « Donner un ordre » est offert (atelier 41 §3)");

            // La fiabilité de chaque repère, à côté de lui (atelier 42 : « l’état du terrain · fiable »), lue dans cue_bands.
            var b = Bandes("DRIFTING", "NONE", false);
            b.cue_bands.Add(new System.Collections.Generic.KeyValuePair<string, string>("TERRITORY_STATE", "reliable"));
            ctl.RendreBandesPourTest(b);
            Assert.AreEqual(FamilleLabels.Repere("TERRITORY_STATE") + " · " + FamilleLabels.Fiabilite("reliable"),
                ctl.LibellesDesReperes["TERRITORY_STATE"], "le repère porte sa fiabilité servie");
            Assert.AreEqual(FamilleLabels.Repere("TIME_SLOT"), ctl.LibellesDesReperes["TIME_SLOT"], "sans fiabilité servie : le repère seul");

            ctl.RendreBandesPourTest(Bandes("RESETTING", "FRESH", false));
            Assert.IsFalse(ctl.SectionSignalVisible, "se recale : le cadre 1 part (seul DRIFTING l'ouvre)");
            Assert.IsTrue(ctl.SectionOrdreVisible, "un ordre récent : le cadre 2 reste");
            Assert.IsFalse(ctl.PromouvoirVisible, "sans promotion_suggested, PROMOTE n'est pas offert (le back le refuserait en 409)");
        }

        [Test]
        public void Fabrique_LesRefusSontClassesSurLesMessagesExactsDuBack()
        {
            // Les messages EXACTS du back (standing-order.service.ts:234,248,265 ; signal-drift.service.ts:175).
            Assert.AreEqual("aucun_ordre", LieutenantScreenController.ClasserRefus(409, "lieutenant x has no standing order to RENEW."));
            Assert.AreEqual("cooldown", LieutenantScreenController.ClasserRefus(409, "standing-order decision 'RENEW' is on cooldown for lieutenant x."));
            Assert.AreEqual("cooldown", LieutenantScreenController.ClasserRefus(409, "signal-drift decision 'disrupt_cue' is on cooldown for lieutenant x."));
            Assert.AreEqual("promotion_refusee", LieutenantScreenController.ClasserRefus(409,
                "standing order for lieutenant x is not flagged for promotion (promotion_suggested is not set)."));
            Assert.AreEqual("invalide", LieutenantScreenController.ClasserRefus(422, "Unknown signal-drift decision kind 'x'"));
            Assert.AreEqual("deja_actif", LieutenantScreenController.ClasserRefus(409,
                "lieutenant x already has an active standing order — RENEW it instead of re-issuing."));
            Assert.AreEqual("autre", LieutenantScreenController.ClasserRefus(500, "boom"));
            Assert.AreNotEqual(LieutenantScreenController.MotDuRefus("aucun_ordre"), LieutenantScreenController.MotDuRefus("cooldown"),
                "« aucun ordre en cours » (mot de f2) se distingue du refus générique");
        }

        // ═══ 2. CORPS RÉEL — le signal : une vraie décision, puis la re-lecture ═══════════════════════════════════════════

        [UnityTest]
        public IEnumerator Reel_Signal_LaDecisionEnvoyeeEstCelleTouchee_EtLEcranRendLaRelecture()
        {
            var ctl = Monter();
            yield return ctl.SignIn();
            Assert.IsTrue(ctl.IsAuthenticated, ctl.AuthError);
            ctl.OpenLieutenant(lieutenantId);
            float t = Time.realtimeSinceStartup + 10f;
            while (ctl.CurrentBands == null && Time.realtimeSinceStartup < t) yield return null;
            Assert.IsNotNull(ctl.CurrentBands, "les bandes du lieutenant semé n'ont pas chargé");

            // Brouiller « l'heure » : la requête ENVOYÉE porte disrupt_cue ET TIME_SLOT, comme le geste touché.
            yield return ctl.DecideSignal("disrupt_cue", "TIME_SLOT");
            Assert.AreEqual("signal:disrupt_cue:TIME_SLOT", ctl.DerniereDecisionTouchee);
            StringAssert.Contains("/signal-drift/decision", ctl.ClientDesDecisions.DerniereRequeteDecision);
            StringAssert.Contains("\"kind\":\"disrupt_cue\"", ctl.ClientDesDecisions.DerniereRequeteDecision);
            StringAssert.Contains("\"target_cue\":\"TIME_SLOT\"", ctl.ClientDesDecisions.DerniereRequeteDecision);
            Assert.IsNull(ctl.DerniereClasseDeRefus, $"la décision a été refusée ({ctl.DerniereClasseDeRefus}) : {ctl.LastOutcome}");
            // L'état affiché vient de la RE-LECTURE : la ligne Signal == le mot de la phase que le GET vient de rendre.
            Assert.IsTrue(ctl.RenderedTexts.Contains(FamilleLabels.Signal(ctl.CurrentBands.drift_phase)),
                $"la ligne Signal rend la phase RE-LUE ({ctl.CurrentBands.drift_phase})");

            // Rappeler l'ordre direct : sans repère dans le corps.
            yield return ctl.DecideSignal("reinforce_direct_order", null);
            Assert.AreEqual("signal:reinforce_direct_order", ctl.DerniereDecisionTouchee);
            StringAssert.DoesNotContain("target_cue", ctl.ClientDesDecisions.DerniereRequeteDecision);
            Assert.IsNull(ctl.DerniereClasseDeRefus);

            // Le MÊME geste, tout de suite : cooldown (409), dit en mots — jamais le code.
            yield return ctl.DecideSignal("reinforce_direct_order", null);
            Assert.AreEqual("cooldown", ctl.DerniereClasseDeRefus, "même (geste) avant la fin du cooldown : 409 classé « cooldown »");
            Assert.AreEqual(LieutenantScreenController.MotDuRefus("cooldown"), ctl.LastOutcome);
        }

        // ═══ 3. CORPS RÉEL — l'ordre permanent, ÉMIS PAR L'ÉCRAN (l'éditeur de ⑧ en mode ordre), puis décidé ═══════════════

        [UnityTest]
        public IEnumerator Reel_OrdrePermanent_RenouvelerPuisRetirer_LEcranSuitLaRelecture_EtLesRefusSontDits()
        {
            var ctl = Monter();
            yield return ctl.SignIn();
            Assert.IsTrue(ctl.IsAuthenticated, ctl.AuthError);
            ctl.OpenLieutenant(lieutenantId);
            float t = Time.realtimeSinceStartup + 10f;
            while (ctl.CurrentBands == null && Time.realtimeSinceStartup < t) yield return null;
            Assert.IsNotNull(ctl.CurrentBands);

            // Le chemin JOUEUR : « Donner un ordre » (offert parce que le GET dit NONE sur un lieutenant tout juste semé).
            Assert.AreEqual("NONE", ctl.CurrentBands.standing_order.freshness, "le lieutenant semé n'a pas d'ordre");
            Assert.IsTrue(ctl.DonnerOrdreVisible);
            ctl.OuvrirModeOrdre();
            Assert.IsTrue(ctl.ModeOrdre, "l'éditeur de ⑧ est en mode ORDRE PERMANENT");
            Assert.AreEqual(1, ctl.Rules.Count, "un ordre = UNE règle (la règle par défaut de l'archétype)");
            ctl.ChoisirLapse("REVERT_DEFAULT");
            yield return ctl.SignerOrdre();
            Assert.IsNull(ctl.DerniereClasseDeRefus, $"l'ordre signé a été refusé : {ctl.LastOutcome}");
            // VALEUR : la règle ENVOYÉE == la règle ÉDITÉE (même sérialiseur), et la lapse choisie.
            StringAssert.Contains("/standing-order", ctl.ClientDesDecisions.DerniereRequeteOrdre);
            StringAssert.Contains(JsonUtility.ToJson(new StandingOrderIssueRequest { rule_source = ctl.DerniereRegleSignee, lapse_action = "REVERT_DEFAULT" }),
                ctl.ClientDesDecisions.DerniereRequeteOrdre, "le corps envoyé porte la règle éditée et la lapse choisie");
            Assert.AreEqual(RuleModel.SerializeRules(new System.Collections.Generic.List<RuleRow>(ctl.Rules)), ctl.DerniereRegleSignee,
                "la règle signée est celle de l'éditeur");
            // L'état affiché vient de la RE-LECTURE : FRESH, « en cours », le cadre 2 paraît.
            Assert.AreEqual("FRESH", ctl.CurrentBands.standing_order.freshness, "le re-GET dit l'ordre en cours");
            Assert.IsTrue(ctl.RenderedTexts.Contains(FamilleLabels.OrdrePermanent("FRESH")));
            Assert.IsTrue(ctl.SectionOrdreVisible, "le cadre 2 paraît parce que le GET porte un ordre");
            Assert.IsFalse(ctl.ModeOrdre, "l'éditeur quitte le mode ordre après la signature");

            // Signer un SECOND ordre alors qu'un est en cours : 409, dit en mots (« un ordre est déjà en cours : renouvelez-le »).
            ctl.OuvrirModeOrdre();
            yield return ctl.SignerOrdre();
            Assert.AreEqual("deja_actif", ctl.DerniereClasseDeRefus);
            Assert.AreEqual(LieutenantScreenController.MotDuRefus("deja_actif"), ctl.LastOutcome);
            ctl.OuvrirModeOrdre();   // referme

            // PROMOTE sans « à promouvoir » : le bouton n'est pas offert ; forcé, le back le refuse et l'écran le dit.
            if (!ctl.CurrentBands.standing_order.promotion_suggested)
            {
                Assert.IsFalse(ctl.PromouvoirVisible);
                yield return ctl.DecideOrdre("PROMOTE_TO_DEFAULT");
                Assert.AreEqual("promotion_refusee", ctl.DerniereClasseDeRefus);
            }

            yield return ctl.DecideOrdre("RENEW");
            Assert.AreEqual("ordre:RENEW", ctl.DerniereDecisionTouchee);
            StringAssert.Contains("\"kind\":\"RENEW\"", ctl.ClientDesDecisions.DerniereRequeteDecision);
            Assert.IsNull(ctl.DerniereClasseDeRefus, $"RENEW refusé : {ctl.LastOutcome}");

            yield return ctl.DecideOrdre("REVOKE");
            Assert.AreEqual("ordre:REVOKE", ctl.DerniereDecisionTouchee);
            Assert.IsNull(ctl.DerniereClasseDeRefus, $"REVOKE refusé : {ctl.LastOutcome}");
            // L'état affiché vient de la RE-LECTURE : la ligne Ordre permanent rend la fraîcheur que le GET vient de dire.
            Assert.IsTrue(ctl.RenderedTexts.Contains(FamilleLabels.OrdrePermanent(ctl.CurrentBands.standing_order.freshness)),
                $"la ligne Ordre permanent rend la fraîcheur RE-LUE ({ctl.CurrentBands.standing_order.freshness})");
        }
    }
}
