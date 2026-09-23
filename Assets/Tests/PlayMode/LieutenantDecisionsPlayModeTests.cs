using System.Collections;
using System.Linq;
using System.Text;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.Networking;
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
    /// ⛔ DETTE (plage CLIENT UNITY, 2026-09-23) : le cadre 2 est INJOIGNABLE POUR UN JOUEUR tant que l'émission d'un ordre permanent
    ///    (`POST /v1/lieutenants/:id/standing-order`) n'a pas d'écran — l'atelier cherche où elle vit (option (a)). Ici l'ordre est émis
    ///    par le TEST (`EmettreUnOrdre`), jamais par l'écran : ce test prouve la mécanique des 3 décisions, pas un parcours joueur.
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

        // ═══ 3. CORPS RÉEL — l'ordre permanent, émis par le TEST (cadre 2 injoignable pour un joueur : dette) ═══════════════

        private static IEnumerator EmettreUnOrdre(string jeton, string id, System.Action<long> fini)
        {
            string corps = "{\"rule_source\":\"WHEN STATE(cook_idle,==,true) THEN EXECUTE_DEFAULT @10;\",\"lapse_action\":\"REVERT_DEFAULT\"}";
            using (var req = new UnityWebRequest($"http://localhost/v1/lieutenants/{id}/standing-order", UnityWebRequest.kHttpVerbPOST))
            {
                req.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(corps));
                req.downloadHandler = new DownloadHandlerBuffer();
                req.SetRequestHeader("Content-Type", "application/json");
                req.SetRequestHeader("Authorization", "Bearer " + jeton);
                req.SetRequestHeader("Idempotency-Key", System.Guid.NewGuid().ToString());
                yield return req.SendWebRequest();
                fini(req.responseCode);
            }
        }

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

            long code = 0;
            yield return EmettreUnOrdre(ctl.Token, lieutenantId, c => code = c);
            Assert.IsTrue(code == 200 || code == 409, $"émission de l'ordre de test : {code} (409 = un ordre est déjà actif, reste valable)");
            yield return ctl.RefreshBands();
            Assert.IsNotNull(ctl.CurrentBands.standing_order);
            Assert.AreNotEqual("NONE", ctl.CurrentBands.standing_order.freshness, "un ordre existe : la fraîcheur n'est plus NONE");
            Assert.IsTrue(ctl.SectionOrdreVisible, "le cadre 2 paraît parce que le GET porte un ordre");

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
