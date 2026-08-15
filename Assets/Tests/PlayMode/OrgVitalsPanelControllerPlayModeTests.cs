using System.Collections;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.TestTools;
using MafiaCleanCity.CityMap; // REUSE AuthClient (signup) + HeatEnvelope (ground truth)
using MafiaCleanCity.Tests;   // SeederSupport.RunDevPsql
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    // W3.U1 C6 (design §3 C6, D5) — `OrgVitalsPanel` : 3 barres + 1 déclarée.
    [Category("W3U1")]
    public class OrgVitalsPanelControllerPlayModeTests
    {
        private const string BaseUrl = "http://localhost";
        private static int callsignSeq;
        private GameObject hostGo;

        [TearDown]
        public void TearDown()
        {
            if (hostGo != null) Object.Destroy(hostGo);
        }

        private static IEnumerator SignUp(System.Action<string, string> onTokenAndCallsign)
        {
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string callsign = SeederSupport.SafeCallsign("c6", ref callsignSeq);
            string token = null, err = null;
            yield return auth.SignUp(callsign, "w3u1-c6-pw", t => token = t, e => err = e);
            Assert.IsNull(err, $"signup errored: {err}");
            onTokenAndCallsign(token, callsign);
        }

        private OrgVitalsPanelController NewBarePanel()
        {
            hostGo = new GameObject("OrgVitalsPanel");
            hostGo.AddComponent<RectTransform>();
            return hostGo.AddComponent<OrgVitalsPanelController>();
        }

        // C6-F1 — chaque barre rend la VALEUR de son bucket ET un label textuel. Scénario : deux
        // buckets distincts par barre. Réserve de dimensionnement Heat (design, IMPORTANT-6/D-HEAT) :
        // Heat n'est PAS testé ici par transition (un tick réel serait requis) — C6-F3 prouve son
        // propre rendu-depuis-le-serveur séparément. Friction/Stress viennent du payload injecté
        // (`SetFrictionStress`), donc librement dimensionnables sans tick.
        [Test]
        public void C6F1_FrictionAndStress_ValueAndLabel_TwoDistinctBucketsEach()
        {
            var panel = NewBarePanel();

            panel.SetFrictionStress(
                new FrictionGlanceDto { friction_bucket = "light", penalty_active = false },
                new CompressionGlanceDto { stress_bucket = "calm", week_state = "none", forced = false });
            Assert.AreEqual("light", panel.FrictionBucketRendered);
            Assert.AreEqual("calm", panel.StressBucketRendered);
            // The render CAPITALIZES the label ("Light"/"Calm" — FrictionLabel/StressLabel) — a
            // case-INSENSITIVE check on the rendered text, the raw value itself is checked exactly above.
            Assert.IsTrue(panel.RenderedTexts.Any(t => t.IndexOf("light", System.StringComparison.OrdinalIgnoreCase) >= 0));
            Assert.IsTrue(panel.RenderedTexts.Any(t => t.IndexOf("calm", System.StringComparison.OrdinalIgnoreCase) >= 0));

            panel.SetFrictionStress(
                new FrictionGlanceDto { friction_bucket = "overloaded", penalty_active = true },
                new CompressionGlanceDto { stress_bucket = "mounting", week_state = "active", forced = true });
            Assert.AreEqual("overloaded", panel.FrictionBucketRendered);
            Assert.AreEqual("mounting", panel.StressBucketRendered);
            Assert.IsTrue(panel.RenderedTexts.Any(t => t.IndexOf("overloaded", System.StringComparison.OrdinalIgnoreCase) >= 0));
            Assert.IsTrue(panel.RenderedTexts.Any(t => t.IndexOf("mounting", System.StringComparison.OrdinalIgnoreCase) >= 0));
        }

        // C6-F2 (détecteur de cohésion — D5) — la barre Cohesion rend un état nommé "indisponible",
        // ÉPINGLÉ PAR SA VALEUR. Plus l'oracle qui compte les champs citywide de la projection de
        // cohésion (épingle 0) AVEC sa garde de capacité (le MÊME oracle sur heat rend ≥ 1).
        [Test]
        public void C6F2_CohesionDetector_NamedUnavailable_PlusCitywideFieldOracleWithCapacityGuard()
        {
            var panel = NewBarePanel();
            Assert.IsTrue(panel.CohesionDeclaredUnavailable, "Cohesion is EXPLICITLY declared unavailable (a value, not silence)");
            Assert.IsTrue(panel.RenderedTexts.Any(t => t.Contains("Unavailable")),
                "the rendered text carries the NAMED state, never just an absent 4th bar");

            int cohesionCitywideFields = OrgVitalsPanelController.CountCitywideFields(typeof(CohesionDto));
            Assert.AreEqual(0, cohesionCitywideFields, "CohesionDto has ZERO citywide-named fields (D5: no citywide aggregate exists)");

            int heatCitywideFields = OrgVitalsPanelController.CountCitywideFields(typeof(DistrictHeatDto));
            Assert.GreaterOrEqual(heatCitywideFields, 1,
                "CAPACITY GUARD: the SAME oracle applied to heat finds >= 1 — proves the oracle CAN see a citywide " +
                "field when one exists, so cohesion's 0 is a real absence, not a mistargeted probe");
        }

        // C6-F3 (à travers l'enveloppe) — la barre Heat est alimentée par une VRAIE requête sur
        // GET /v1/city/district/:id/heat, lue via payload.data, et le bucket rendu ÉGALE le champ
        // d'agrégat citywide de la réponse (cible : l'égalité valeur reçue/rendue).
        [UnityTest]
        public IEnumerator C6F3_Heat_FedByRealResponse_RenderedBucketEqualsCitywideField()
        {
            string token = null;
            yield return SignUp((t, c) => token = t);

            // Ground truth: an INDEPENDENT raw GET.
            DistrictHeatDto liveHeat = null;
            using (UnityWebRequest req = UnityWebRequest.Get(BaseUrl + "/v1/city/district/16/heat"))
            {
                req.timeout = 10;
                req.SetRequestHeader("Authorization", "Bearer " + token);
                yield return req.SendWebRequest();
                Assert.AreEqual(UnityWebRequest.Result.Success, req.result, $"live heat GET failed: {req.error}");
                liveHeat = JsonUtility.FromJson<HeatEnvelope>(req.downloadHandler.text)?.payload?.data;
            }
            Assert.IsNotNull(liveHeat, "ground-truth heat parsed");
            Assert.IsFalse(string.IsNullOrEmpty(liveHeat.citywide_bucket), "ground-truth citywide_bucket present");

            var panel = NewBarePanel();
            yield return panel.FetchHeat(token);
            Assert.IsNull(panel.LastHeatError, $"heat fetch errored: {panel.LastHeatError}");
            Assert.AreEqual(liveHeat.citywide_bucket, panel.HeatBucketRendered,
                "the rendered bucket EQUALS the live citywide_bucket — not merely 'a bar exists'");
            // The render CAPITALIZES the label (HeatLabel) — case-INSENSITIVE check; the exact-value
            // equality just above is what actually proves "rendered == received".
            Assert.IsTrue(panel.RenderedTexts.Any(t => t.IndexOf(liveHeat.citywide_bucket, System.StringComparison.OrdinalIgnoreCase) >= 0));
        }

        // C6-F4 (la sonde de cohésion, à travers l'enveloppe — refaite en v4) — TROIS pièces :
        //  1. corps de succès EXIGÉ (200 + payload.data) ;
        //  2. scénario dimensionné par un TICK — sans lui, RESOURCE_NOT_FOUND (anti-vacuité : on
        //     PROUVE l'échec pré-tick, pas seulement le succès post-tick) ;
        //  3. garde de capacité HTTP — la MÊME sonde sur heat trouve le champ homologue.
        [UnityTest]
        public IEnumerator C6F4_CohesionProbe_SuccessBodyRequired_TickDimensioned_CapacityGuarded()
        {
            string token = null, callsign = null;
            yield return SignUp((t, c) => { token = t; callsign = c; });
            string playerId = SeederSupport.RunDevPsql($"SELECT player_id FROM player WHERE callsign = '{callsign}';");
            Assert.IsTrue(SeederSupport.IsUuid(playerId), $"resolved a real player_id: '{playerId}'");

            var panel = NewBarePanel();

            // ---- piece 2a (anti-vacuity): BEFORE any tick, the route genuinely FAILS. ----
            yield return panel.FetchCohesion(token);
            Assert.IsFalse(panel.LastCohesionSucceeded,
                "PRE-TICK: the cohesion route fails (RESOURCE_NOT_FOUND) — proves the scenario is REALLY " +
                "tick-dimensioned, not vacuously green regardless of state");
            Assert.AreEqual(404, panel.LastCohesionErrorCode);

            // ---- dimension the scenario: advance far enough to cross a NIGHTLY boundary (>=1440 in-game
            // minutes) for THIS player, firing every cadence handler — this is what seeds district_cohesion. ----
            using (var req = new UnityWebRequest(
                       BaseUrl + $"/v1/_test/citysim/advance?ticks=2000&player_id={playerId}",
                       UnityWebRequest.kHttpVerbPOST))
            {
                req.uploadHandler = new UploadHandlerRaw(new byte[0]);
                req.downloadHandler = new DownloadHandlerBuffer();
                // 2000 in-game minutes fires EVERY cadence handler crossed (minute/5-min/30-min/12h/
                // nightly/weekly) — genuinely CPU-heavy server-side, measured to exceed 30s.
                req.timeout = 120;
                yield return req.SendWebRequest();
                Assert.AreEqual(UnityWebRequest.Result.Success, req.result,
                    $"citysim advance failed: {req.error} ({req.downloadHandler?.text})");
            }

            // ---- piece 1 (corps de succès EXIGÉ) + piece 2b: AFTER the tick, a REAL success body. ----
            yield return panel.FetchCohesion(token);
            Assert.IsTrue(panel.LastCohesionSucceeded,
                $"POST-TICK: the cohesion route now SUCCEEDS (200 + payload.data) — errCode was {panel.LastCohesionErrorCode}");
            Assert.IsNotNull(panel.LastCohesionFetch, "cohesion parsed through payload.data");
            Assert.IsFalse(string.IsNullOrEmpty(panel.LastCohesionFetch.cohesion_state), "cohesion_state populated");

            // ---- piece 3 (garde de capacité) — the SAME oracle, reused (design: "la MÊME sonde"). ----
            Assert.AreEqual(0, OrgVitalsPanelController.CountCitywideFields(typeof(CohesionDto)));
            Assert.GreaterOrEqual(OrgVitalsPanelController.CountCitywideFields(typeof(DistrictHeatDto)), 1);
        }
    }
}
