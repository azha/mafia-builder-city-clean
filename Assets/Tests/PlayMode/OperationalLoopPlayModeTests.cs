using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.TestTools;
using MafiaCleanCity.CityMap;     // AuthClient / WorldApiClient / DistrictHeatDto / CityMapController
using MafiaCleanCity.Operational; // Dashboard / BuildingCard / Laundering controllers + DTOs
using MafiaCleanCity.Tests;       // SeederSupport
using Debug = UnityEngine.Debug;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    // ── T13: the UI CAPSTONE E2E (charter 27: NO MOCK). ──────────────────────────────────────
    //
    // This is the visible, end-to-end proof that the whole M1 operational loop
    //   acquire → produce → launder → ENCAISSER
    // is OBSERVABLE through the four player-facing Unity screens for a single advanced-loop
    // player, with NO raw scalar leaking client-side (R2.2 information asymmetry).
    //
    // It self-seeds in OneTimeSetUp: the FULL operational loop on the operational_demo player
    // (Tools/seed_operational_demo.mjs) — leaving a laundered non-BROKE wallet (the "encaisser"
    // payoff), an OPERATIONAL lab, and a MID-PIPELINE (DIRTY) laundering node — plus the City Map
    // heat gradient on the citymap_demo player (Tools/seed_citymap_demo.mjs). Then it drives the
    // navigation across the screens (one Bearer for the operational screens; the City Map screen
    // signs in as the citymap player) and asserts each screen's bands are COHERENT with the LIVE
    // projections fetched independently (raw UnityWebRequest = the ground truth):
    //
    //   1. Dashboard  → wallet band == live /v1/economy/wallet (a real non-BROKE band) AND the
    //                   citywide heat band + escalation == live /v1/city/district/:id/heat.
    //   2. Building Card (the lab) → OPERATIONAL + operational_type=lab (the "produce" anchor).
    //   3. Laundering Pipeline (the node) → cleanliness band + deviation flag == live node
    //                   projection (the "launder" anchor, mid-pipeline DIRTY).
    //   4. City Map   → renders the 18 districts + the seeded heat gradient overlay (the "where").
    //
    // At every screen it runs the recursive no-raw-scalar guard the per-screen tests use: every
    // rendered token must be a band / label / glyph / boolean — never a bare integer/decimal.
    //
    // Order-independence: the operational and City Map concerns run on DISTINCT players (the
    // heat-coupled operational city would otherwise wash the City Map's exact d3/d7/d11 gradient),
    // and this test self-seeds both preconditions in OneTimeSetUp — so it never depends on which
    // other test ran before it (see SeederSupport).
    public class OperationalLoopPlayModeTests
    {
        private const string BaseUrl = "http://localhost";
        private const int HeatProbeDistrict = 16; // the operational district (Verge); any 1..18 returns the same citywide_bucket

        // Discovered from the operational seeder's stdout (OneTimeSetUp).
        private static string demoEmail, demoPassword;
        private static string labId, frontShopId, safehouseId, dealerId, nodeId;

        private readonly List<GameObject> spawned = new List<GameObject>();

        [OneTimeSetUp]
        public void SeedTheLoop()
        {
            // SELF-SEED both preconditions this capstone tours: (a) the full operational loop on the
            // DISTINCT operational_demo player (the acquire→produce→launder→encaisser screens), and
            // (b) the City Map heat gradient on the citymap_demo player (the "where" screen). The two
            // concerns run on separate heat-coupled cities (distinct players), so the suite is
            // order-independent. We own both preconditions here.
            SeederSupport.RunSeeder(SeederSupport.CityMapSeeder, SeederSupport.CityMapMarker);
            string json = SeederSupport.RunSeeder(SeederSupport.OperationalSeeder, SeederSupport.OperationalMarker);

            demoEmail = SeederSupport.ExtractString(json, "email");
            demoPassword = SeederSupport.ExtractString(json, "password");
            labId = SeederSupport.ExtractString(json, "lab");
            frontShopId = SeederSupport.ExtractString(json, "front_shop");
            safehouseId = SeederSupport.ExtractString(json, "safehouse_id");
            dealerId = SeederSupport.ExtractString(json, "dealer_id");
            nodeId = SeederSupport.ExtractString(json, "laundering_node_id");

            Assert.IsFalse(string.IsNullOrEmpty(demoEmail), "discovered demo email");
            Assert.IsFalse(string.IsNullOrEmpty(demoPassword), "discovered demo password");
            Assert.IsTrue(SeederSupport.IsUuid(labId), $"discovered lab uuid (got '{labId}')");
            Assert.IsTrue(SeederSupport.IsUuid(frontShopId), $"discovered front_shop uuid (got '{frontShopId}')");
            Assert.IsTrue(SeederSupport.IsUuid(safehouseId), $"discovered safehouse uuid (got '{safehouseId}')");
            Assert.IsTrue(SeederSupport.IsUuid(dealerId), $"discovered dealer uuid (got '{dealerId}')");
            Assert.IsTrue(SeederSupport.IsUuid(nodeId), $"discovered laundering node uuid (got '{nodeId}')");

            Debug.Log($"[CapstoneE2E] seeded loop — lab={labId} node={nodeId} email={demoEmail}");
        }

        [TearDown]
        public void TearDown()
        {
            foreach (GameObject go in spawned)
                if (go != null) Object.Destroy(go);
            spawned.Clear();
        }

        private T Spawn<T>(string name) where T : Component
        {
            GameObject go = new GameObject(name);
            spawned.Add(go);
            return go.AddComponent<T>();
        }

        // ── live ground-truth fetches (raw — independent of any controller) ─────────────────────

        private static IEnumerator FetchLiveWalletBand(string bearer, Action<string> onBand, Action<string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(BaseUrl + "/v1/economy/wallet"))
            {
                req.timeout = 10;
                req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (req.result != UnityWebRequest.Result.Success) { onErr($"wallet GET failed ({req.responseCode})"); yield break; }
                var dto = JsonUtility.FromJson<WalletEnvelope>(req.downloadHandler.text)?.payload?.data;
                onBand(dto?.wallet_band);
            }
        }

        private static IEnumerator FetchLiveCitywideHeat(string bearer, Action<string, bool> onHeat, Action<string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(BaseUrl + $"/v1/city/district/{HeatProbeDistrict}/heat"))
            {
                req.timeout = 10;
                req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (req.result != UnityWebRequest.Result.Success) { onErr($"heat GET failed ({req.responseCode})"); yield break; }
                var dto = JsonUtility.FromJson<HeatEnvelope>(req.downloadHandler.text)?.payload?.data;
                onHeat(dto?.citywide_bucket, dto != null && dto.escalated);
            }
        }

        // Band → the label each controller renders (kept in sync with the controllers).
        private static string WalletLabelFor(string b) =>
            b == "FLUSH" ? "Flush" : b == "HIGH" ? "High" : b == "MODERATE" ? "Moderate" :
            b == "LOW" ? "Low" : b == "BROKE" ? "Broke" : b;
        private static string HeatLabelFor(string b) =>
            MafiaCleanCity.Shell.HeatBucketResolver.Label(b);
        private static string CleanlinessLabelFor(string b) =>
            b == "DIRTY" ? "Dirty" : b == "PARTIAL" ? "Partial" : b == "MOSTLY_CLEAN" ? "Mostly clean" :
            b == "CLEAN" ? "Clean" : b;

        // The recursive no-raw-scalar guard the per-screen tests use: every rendered token must be
        // a band / label / glyph / boolean — never a bare integer/decimal (R2.2 / P5).
        private static void AssertNoRawScalar(IReadOnlyList<string> texts, string screen)
        {
            foreach (string t in texts)
                Assert.IsFalse(Regex.IsMatch(t, @"(?<![A-Za-z])\d+(\.\d+)?(?![A-Za-z])"),
                    $"[{screen}] no raw scalar may be shown client-side, but rendered text was: '{t}'");
        }

        // Run a load-coroutine up to N times until `succeeded()` holds. This hardens the capstone
        // against a TRANSIENT transport hiccup on the JWT-gated endpoints right after the heavy
        // operational seed (an occasional connection drop → an empty error log the controller
        // emits via Debug.LogError). It does NOT relax any band-coherence assertion: those run on
        // the final, successful load. While retrying we tolerate the controllers' expected error
        // logs (Unity would otherwise fail the test on an unhandled [Error] log).
        private static IEnumerator RetryUntil(Func<IEnumerator> loadFactory, Func<bool> succeeded,
            int maxAttempts = 4)
        {
            bool prevIgnore = LogAssert.ignoreFailingMessages;
            LogAssert.ignoreFailingMessages = true;
            try
            {
                for (int attempt = 1; attempt <= maxAttempts; attempt++)
                {
                    yield return loadFactory();
                    if (succeeded()) yield break;
                    Debug.LogWarning($"[CapstoneE2E] transient load miss (attempt {attempt}/{maxAttempts}) — retrying");
                    // brief backoff so a momentary connection drop can clear.
                    float wait = 0f;
                    while (wait < 0.5f) { wait += Time.deltaTime; yield return null; }
                }
            }
            finally
            {
                LogAssert.ignoreFailingMessages = prevIgnore;
            }
        }

        // ── the capstone ────────────────────────────────────────────────────────────────────────

        [UnityTest]
        public IEnumerator Loop_IsObservable_AcrossDashboard_BuildingCard_Pipeline_AndCityMap()
        {
            // ── (1) sign in ONCE via the Dashboard controller (the loop's landing screen). ──
            var dashboard = Spawn<DashboardController>("DashboardController");
            float elapsed = 0f;
            yield return dashboard.SignIn();
            while (!dashboard.IsAuthenticated && dashboard.AuthError == null && elapsed < 20f)
            { elapsed += Time.deltaTime; yield return null; }
            Assert.IsNull(dashboard.AuthError, $"sign-in errored: {dashboard.AuthError}");
            Assert.IsTrue(dashboard.IsAuthenticated, "controller signed in (Bearer acquired)");
            string bearer = dashboard.Token;

            // ── live ground truth (raw GETs with the controller's Bearer = the contract). ──
            string liveWalletBand = null, liveWalletErr = null;
            yield return FetchLiveWalletBand(bearer, b => liveWalletBand = b, e => liveWalletErr = e);
            Assert.IsNull(liveWalletErr, $"live wallet fetch errored: {liveWalletErr}");
            Assert.IsFalse(string.IsNullOrEmpty(liveWalletBand), "live wallet_band present");
            // The seeded loop laundered clean cash → a real non-BROKE band: the "encaisser" payoff.
            Assert.AreNotEqual("BROKE", liveWalletBand, "the loop produced a real non-BROKE wallet band (the encaisser payoff)");

            string liveHeatBand = null; bool liveEscalated = false; string liveHeatErr = null;
            yield return FetchLiveCitywideHeat(bearer, (b, e) => { liveHeatBand = b; liveEscalated = e; }, e => liveHeatErr = e);
            Assert.IsNull(liveHeatErr, $"live heat fetch errored: {liveHeatErr}");
            Assert.IsFalse(string.IsNullOrEmpty(liveHeatBand), "live citywide_bucket present");

            // ── SCREEN 1 — DASHBOARD: the encaisser payoff (wallet band) + citywide heat. ──
            // Bounded retry: immediately after the heavy operational seed the JWT-gated economy
            // endpoint can transiently drop a connection (transport-level, empty error). We re-load
            // a few times until it succeeds — the band coherence assertions below are NOT relaxed.
            yield return RetryUntil(() => dashboard.LoadDashboard(), () => dashboard.DashboardLoaded);
            Assert.IsTrue(dashboard.DashboardLoaded,
                $"dashboard loaded (walletErr={dashboard.WalletError} heatErr={dashboard.HeatError})");

            Assert.IsNotNull(dashboard.CurrentWallet, "wallet projection parsed");
            Assert.AreEqual(liveWalletBand, dashboard.CurrentWallet.wallet_band,
                "Dashboard wallet band is COHERENT with the live /v1/economy/wallet");
            Assert.IsNotNull(dashboard.CurrentHeat, "heat projection parsed");
            Assert.AreEqual(liveHeatBand, dashboard.CurrentHeat.citywide_bucket,
                "Dashboard citywide heat band is COHERENT with the live heat projection");

            var dashTexts = dashboard.RenderedTexts;
            Assert.IsTrue(dashTexts.Any(t => t == WalletLabelFor(liveWalletBand)),
                $"Dashboard renders the live wallet band label '{WalletLabelFor(liveWalletBand)}' in {Dump(dashTexts)}");
            Assert.IsTrue(dashTexts.Any(t => t == "Wallet"), "Dashboard renders the Wallet caption");
            Assert.IsTrue(dashTexts.Any(t => t == HeatLabelFor(liveHeatBand)),
                $"Dashboard renders the live citywide heat band label '{HeatLabelFor(liveHeatBand)}' in {Dump(dashTexts)}");
            Assert.IsTrue(dashTexts.Any(t => t == "Citywide heat"), "Dashboard renders the citywide heat row");
            Assert.IsTrue(dashTexts.Any(t => t == (liveEscalated ? "Escalating" : "Steady")),
                $"Dashboard renders the live escalation flag (live escalated={liveEscalated})");
            AssertNoRawScalar(dashTexts, "Dashboard");

            // ── SCREEN 2 — BUILDING CARD (the lab): the "produce" anchor is OPERATIONAL. ──
            var buildingCard = Spawn<BuildingCardController>("BuildingCardController");
            buildingCard.SetToken(bearer); // REUSE the one Bearer (no re-signin).
            Assert.IsTrue(buildingCard.IsAuthenticated, "building-card controller carries the Bearer");
            yield return RetryUntil(() => buildingCard.LoadBuilding(labId), () => buildingCard.CardLoaded);
            Assert.IsNull(buildingCard.CardError, $"lab card load errored: {buildingCard.CardError}");
            Assert.IsTrue(buildingCard.CardLoaded, "lab building card loaded");

            BuildingCardDto card = buildingCard.CurrentCard;
            Assert.IsNotNull(card, "card projection parsed");
            Assert.AreEqual(labId, card.building, "card is for the seeded lab");
            Assert.AreEqual("OPERATIONAL", card.setup_state, "the lab the loop produced through is OPERATIONAL");
            Assert.IsTrue(card.operational, "lab operational flag true");
            Assert.AreEqual("lab", card.operational_type, "operational_type is lab (the produce anchor)");

            var cardTexts = buildingCard.RenderedTexts;
            Assert.IsTrue(cardTexts.Any(t => t.Contains("Lab")), "Building Card renders the 'Lab' type label");
            Assert.IsTrue(cardTexts.Any(t => t == "Operational"), "Building Card renders the 'Operational' band");
            Assert.IsTrue(cardTexts.Any(t => t == "Yes"), "Building Card renders operational=true as 'Yes'");
            AssertNoRawScalar(cardTexts, "BuildingCard");

            // ── SCREEN 3 — LAUNDERING PIPELINE (the node): the "launder" anchor, mid-pipeline. ──
            var laundering = Spawn<LaunderingController>("LaunderingController");
            laundering.SetToken(bearer);
            Assert.IsTrue(laundering.IsAuthenticated, "laundering controller carries the Bearer");
            yield return RetryUntil(() => laundering.LoadNode(nodeId), () => laundering.NodeLoaded);
            Assert.IsNull(laundering.NodeError, $"node load errored: {laundering.NodeError}");
            Assert.IsTrue(laundering.NodeLoaded, "laundering node loaded");

            LaunderingNodeDto node = laundering.CurrentNode;
            Assert.IsNotNull(node, "node projection parsed");
            Assert.AreEqual(nodeId, node.node, "node is the seeded Stage-1 node");

            // Independently fetch the live node projection — the screen's bands must be COHERENT with it.
            string liveCleanliness = null; bool liveDeviation = false; string liveNodeErr = null;
            yield return FetchLiveNode(bearer, nodeId, (c, d) => { liveCleanliness = c; liveDeviation = d; }, e => liveNodeErr = e);
            Assert.IsNull(liveNodeErr, $"live node fetch errored: {liveNodeErr}");
            Assert.IsFalse(string.IsNullOrEmpty(liveCleanliness), "live cleanliness_band present");
            Assert.AreEqual(liveCleanliness, node.cleanliness_band,
                "Pipeline cleanliness band is COHERENT with the live node projection");
            Assert.AreEqual(liveDeviation, node.deviation_active,
                "Pipeline deviation flag is COHERENT with the live node projection");

            var nodeTexts = laundering.RenderedTexts;
            Assert.IsTrue(nodeTexts.Any(t => t == "Cleanliness"), "Pipeline renders the cleanliness row");
            Assert.IsTrue(nodeTexts.Any(t => t == CleanlinessLabelFor(liveCleanliness)),
                $"Pipeline renders the live cleanliness band label '{CleanlinessLabelFor(liveCleanliness)}' in {Dump(nodeTexts)}");
            Assert.IsTrue(nodeTexts.Any(t => t == "Deviation"), "Pipeline renders the deviation row");
            Assert.IsTrue(nodeTexts.Any(t => t == (liveDeviation ? "Audit pin active" : "Conforming")),
                $"Pipeline renders the live deviation flag (live deviation={liveDeviation})");
            AssertNoRawScalar(nodeTexts, "Filière");

            // ── SCREEN 4 — CITY MAP: the "where" — 18 districts + a live heat overlay. The City Map
            //    screen reads the citymap_demo player (its own demo creds), the heat-gradient demo
            //    seeded in OneTimeSetUp; it renders the seeded gradient as a togglable overlay. ──
            var cityMap = Spawn<CityMapController>("CityMapController");
            elapsed = 0f;
            while (!cityMap.HeatLoaded && cityMap.LastError == null && cityMap.AuthError == null && elapsed < 25f)
            { elapsed += Time.deltaTime; yield return null; }
            Assert.IsNull(cityMap.LastError, $"city map districts load errored: {cityMap.LastError}");
            Assert.IsNull(cityMap.AuthError, $"city map auth errored: {cityMap.AuthError}");
            Assert.IsTrue(cityMap.IsAuthenticated, "city map signed in");
            Assert.IsTrue(cityMap.HeatLoaded, "city map heat overlay finished loading");
            Assert.AreEqual(18, cityMap.Cells.Count, "city map renders all 18 districts");

            // The seeded heat gradient renders as bands (qualitative, never raw floats): the City Map
            // overlay surfaces the deterministic d3 BURNING / d7 HOT / d11 WARM gradient — the "where"
            // of the city, read through the same heat projection the Dashboard summarised citywide.
            Assert.AreEqual(HeatBucket.Burning, HeatOf(cityMap, 3), "City Map overlays district 3 as BURNING");
            Assert.AreEqual(HeatBucket.Hot, HeatOf(cityMap, 7), "City Map overlays district 7 as HOT");
            Assert.AreEqual(HeatBucket.Warm, HeatOf(cityMap, 11), "City Map overlays district 11 as WARM");
            // The overlay is togglable (the heat badge hides/shows via the public overlay API).
            DistrictCellView burning = cityMap.Cells.First(cell => cell.Model.id == 3);
            Assert.IsTrue(burning.HeatBadge.activeSelf, "heat badge visible by default");
            cityMap.SetHeatOverlay(false);
            Assert.IsFalse(burning.HeatBadge.activeSelf, "toggle OFF hides the heat badge");
            cityMap.SetHeatOverlay(true);
            Assert.IsTrue(burning.HeatBadge.activeSelf, "toggle ON restores the heat badge");

            // ── (final) the nav affordance: the Dashboard's Pipeline nav opens the LaunderingController
            //    (the loop is navigable, not just observable). ──
            Assert.AreEqual(DashboardController.NavTarget.None, dashboard.LastNavTarget, "no nav fired yet");
            dashboard.OpenPipeline();
            Assert.AreEqual(DashboardController.NavTarget.Pipeline, dashboard.LastNavTarget, "Pipeline nav fired");
            Assert.IsNotNull(dashboard.LastNavGameObject, "Pipeline nav opened a host GameObject");
            Assert.IsNotNull(dashboard.LastNavGameObject.GetComponent<LaunderingController>(),
                "Pipeline nav opened the LaunderingController");
            spawned.Add(dashboard.LastNavGameObject); // tidy up in TearDown.

            Debug.Log($"[CapstoneE2E] LOOP OBSERVABLE — wallet={liveWalletBand} heat={liveHeatBand} " +
                      $"escalated={liveEscalated} cleanliness={liveCleanliness} cityMapGradient=d3:BURNING/d7:HOT/d11:WARM");
        }

        // ── GOAL 2 — the capstone screenshot: the Dashboard with the loop's payoff (the
        //    non-BROKE / FLUSH wallet headline + the citywide heat) rendered with LIVE data.
        //    Writes Assets/Screenshots/operational_loop_capstone.png. Categorised so it only
        //    runs on demand (it draws a real frame + flushes a PNG asynchronously). ──
        [UnityTest]
        [Category("Screenshot")]
        public IEnumerator CaptureCapstoneScreenshot()
        {
            var dashboard = Spawn<DashboardController>("DashboardController");

            yield return dashboard.SignIn();
            Assert.IsTrue(dashboard.IsAuthenticated, $"signed in (authErr={dashboard.AuthError})");

            yield return dashboard.LoadDashboard();
            Assert.IsTrue(dashboard.DashboardLoaded, $"dashboard loaded (walletErr={dashboard.WalletError})");
            // The capstone shot should show the loop payoff — a real non-BROKE wallet band.
            Assert.IsNotNull(dashboard.CurrentWallet, "wallet projection parsed");
            Assert.AreNotEqual("BROKE", dashboard.CurrentWallet.wallet_band,
                "the capstone shot shows the loop's non-BROKE payoff band");

            // Let the canvas lay out + draw a couple of frames.
            for (int i = 0; i < 3; i++) yield return null;

            string dir = System.IO.Path.Combine(Application.dataPath, "Screenshots");
            System.IO.Directory.CreateDirectory(dir);
            string path = System.IO.Path.Combine(dir, "operational_loop_capstone.png");
            if (System.IO.File.Exists(path)) System.IO.File.Delete(path);

            ScreenCapture.CaptureScreenshot(path);

            float waited = 0f;
            while (!System.IO.File.Exists(path) && waited < 10f) { waited += Time.deltaTime; yield return null; }
            yield return null;

            Assert.IsTrue(System.IO.File.Exists(path), $"capstone screenshot written to {path}");
            Debug.Log($"[CapstoneE2E] screenshot → {path} (wallet band {dashboard.CurrentWallet.wallet_band})");
        }

        private static IEnumerator FetchLiveNode(string bearer, string id, Action<string, bool> onNode, Action<string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(BaseUrl + $"/v1/operational/laundering/{id}"))
            {
                req.timeout = 10;
                req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (req.result != UnityWebRequest.Result.Success) { onErr($"node GET failed ({req.responseCode})"); yield break; }
                var dto = JsonUtility.FromJson<LaunderingNodeEnvelope>(req.downloadHandler.text)?.payload?.data;
                if (dto == null) { onErr("node projection did not parse"); yield break; }
                onNode(dto.cleanliness_band, dto.deviation_active);
            }
        }

        private static HeatBucket HeatOf(CityMapController c, int districtId) =>
            c.Cells.First(cell => cell.Model.id == districtId).Heat;

        private static string Dump(IReadOnlyList<string> texts) => "[" + string.Join(" | ", texts) + "]";
    }
}
