using System.Collections;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Tests; // REUSE SeederSupport (node-resolve + child-Process + stdout-marker parse).
using Debug = UnityEngine.Debug;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    // E2E (charter 27: NO MOCK) for the Phase-3 vector #3 (grow_house cultivation) building-card surface (T10 Stage B).
    // Drives the real BuildingCardController against the LOCAL dockerized stack (Traefik @ http://localhost — the grow
    // backend lives on the local game-back; the controller's SerializeField defaults to the VPS, so this fixture overrides
    // it with SetBaseUrl("http://localhost")):
    //   1. runs Tools/seed_operational_demo.mjs and parses its stdout JSON to DISCOVER the demo creds + the `grow_house`
    //      (in a Verge district, holding an ACTIVE grow at MID stage / ON_TRACK husbandry / tend_due) + its
    //      `grow_session_id` — the ids change every run (never hard-coded);
    //   2. points the controller at http://localhost, signs in via its AuthClient → Bearer;
    //   3. tracks the seeded grow_session, loads the grow_house card, and asserts the grow surface renders the
    //      grow_stage_band (MID) + husbandry_band (ON_TRACK) + the raid-risk band (REUSE — an active grow is hot) + an
    //      enabled Tend button (tend_due=true, server-authoritative);
    //   4. exercises the tend lifecycle: Tend → the projection's tend_due flips false + the husbandry trajectory rises
    //      (ON_TRACK → THRIVING) → the Tend button disables (server-authoritative gate);
    //   5. asserts NO raw scalar leaks client-side (only qualitative bands / labels / glyphs / booleans — R2.2).
    //
    // ORDER-INDEPENDENT: this fixture self-seeds its precondition BEFORE EACH test (not once per fixture). The
    // tend-lifecycle test is DESTRUCTIVE — it tends the shared grow (tend_count 2→3, tend_due true→false). A
    // once-per-fixture seed would let that mutation bleed across tests (NUnit runs the fixture's tests in alphabetical
    // order). Re-seeding per test (the seeder DELETEs + recreates this player's grow_session with a fresh active grow at
    // MID/ON_TRACK/tend_due each run) gives every test a genuinely fresh tend_due grow regardless of run order.
    public class GrowHousePlayModeTests
    {
        private const string LocalStack = "http://localhost";

        private GameObject controllerGo;

        // Discovered from the seeder's stdout (see Seed).
        private static string growHouseId;    // the grow_house (Verge district, MID stage / ON_TRACK / tend_due)
        private static string growSessionId;  // the active grow_session the grow surface tracks

        [TearDown]
        public void TearDown()
        {
            if (controllerGo != null) Object.Destroy(controllerGo);
        }

        [SetUp]
        public void Seed()
        {
            string json = SeederSupport.RunSeeder(SeederSupport.OperationalSeeder, SeederSupport.OperationalMarker);
            growHouseId = SeederSupport.ExtractString(json, "grow_house");
            growSessionId = SeederSupport.ExtractString(json, "grow_session_id");
            Assert.IsTrue(SeederSupport.IsUuid(growHouseId), $"discovered grow_house uuid (got '{growHouseId}')");
            Assert.IsTrue(SeederSupport.IsUuid(growSessionId), $"discovered grow_session_id uuid (got '{growSessionId}')");
            Debug.Log($"[GrowHouseE2E] seeded — grow_house(MID/ON_TRACK/tend_due)={growHouseId} grow_session={growSessionId}");
        }

        // ------------------------------------------------------------ helpers --

        private BuildingCardController NewLocalController()
        {
            controllerGo = new GameObject("BuildingCardController");
            var controller = controllerGo.AddComponent<BuildingCardController>();
            // The grow backend is on the LOCAL stack — override the VPS default BEFORE SignIn.
            controller.SetBaseUrl(LocalStack);
            controller.BuildingId = ""; // we drive the load manually after sign-in.
            return controller;
        }

        private static IEnumerator SignInController(BuildingCardController controller)
        {
            float elapsed = 0f;
            yield return controller.SignIn();
            while (!controller.IsAuthenticated && controller.AuthError == null && elapsed < 20f)
            {
                elapsed += Time.deltaTime; yield return null;
            }
            Assert.IsNull(controller.AuthError, $"sign-in errored: {controller.AuthError}");
            Assert.IsTrue(controller.IsAuthenticated, "controller signed in (Bearer acquired)");
        }

        // The raid-risk bands the grow_house card may show — an active grow makes it HOT so it sits above LOW; the exact
        // band depends on the city's accumulated heat (the operational loop drives it high), so assert it is a KNOWN band.
        private static readonly string[] RaidRiskBands = { "LOW", "ELEVATED", "HIGH", "IMMINENT" };

        private static void AssertNoRawScalar(System.Collections.Generic.IReadOnlyList<string> texts)
        {
            foreach (string t in texts)
            {
                Assert.IsFalse(Regex.IsMatch(t, @"(?<![A-Za-z])\d+(\.\d+)?(?![A-Za-z])"),
                    $"no raw scalar may be shown client-side, but rendered text was: '{t}'");
            }
        }

        // ------------------------------------------------------------ tests --

        // The grow_house card renders the cultivation surface: grow_stage_band (MID), husbandry_band (ON_TRACK), the
        // raid-risk band (REUSE — an active grow is hot → above LOW), and an ENABLED Tend button (tend_due=true).
        [UnityTest]
        public IEnumerator GrowHouseCard_RendersGrowStage_Husbandry_AndRaidRisk()
        {
            var controller = NewLocalController();
            yield return SignInController(controller);

            // Track the seeded active grow so the grow surface (the grow_session-scoped projection) loads with the card.
            controller.GrowSessionId = growSessionId;
            yield return controller.LoadBuilding(growHouseId);
            Assert.IsNull(controller.CardError, $"card load errored: {controller.CardError}");
            Assert.IsTrue(controller.CardLoaded, "grow_house building card loaded");

            BuildingCardDto card = controller.CurrentCard;
            Assert.IsNotNull(card, "card projection parsed");
            Assert.AreEqual(growHouseId, card.building, "card is for the seeded grow_house");
            Assert.AreEqual("grow_house", card.operational_type, "operational_type is grow_house");

            // The grow projection carries the qualitative bands (grow_session-scoped — GET /v1/operational/grow-session/:id).
            GrowSessionDto grow = controller.CurrentGrow;
            Assert.IsNotNull(grow, "grow projection parsed (an active grow on this grow_house)");
            Assert.AreEqual(growSessionId, grow.grow_session, "grow projection is for the seeded grow_session");
            Assert.AreEqual("MID", grow.grow_stage_band, "the seeded grow is at the MID stage (advanced once past plant)");
            Assert.AreEqual("ON_TRACK", grow.husbandry_band, "tend_count=2 → the ON_TRACK husbandry trajectory band");
            Assert.IsTrue(grow.tend_due, "the fresh MID stage is un-tended → tend_due true (the Tend button is enabled)");

            // The grow surface rows are shown and reflect the bands.
            Assert.IsTrue(controller.GrowStageShown, "the grow-stage row is shown on a grow_house with an active grow");
            Assert.IsTrue(controller.HusbandryShown, "the husbandry row is shown on a grow_house with an active grow");
            var texts = controller.RenderedTexts;
            Assert.IsTrue(texts.Any(t => t == "Grow stage"), "grow-stage row label rendered");
            Assert.IsTrue(texts.Any(t => t == "Mid"), "grow-stage band value 'Mid' rendered");
            Assert.IsTrue(texts.Any(t => t == "Husbandry"), "husbandry row label rendered");
            Assert.IsTrue(texts.Any(t => t == "On track"), "husbandry band value 'On track' rendered");
            Assert.IsTrue(texts.Any(t => t == "Crop"), "crop row label rendered");
            Assert.IsTrue(texts.Any(t => t == "Verdant root"), "crop value 'Verdant root' rendered (the planted precursor)");

            // The raid-risk band is REUSED from the building card (an active grow is hot → above LOW). Assert it is a known
            // band and the gauge row rendered (the exact level varies with the city's accumulated heat).
            Assert.Contains(card.raid_risk, RaidRiskBands, "raid_risk is a known band");
            Assert.AreNotEqual("LOW", card.raid_risk, "an active grow makes the grow_house hot → raid_risk climbs above LOW");
            Assert.IsTrue(texts.Any(t => t == "Raid risk"), "raid-risk row label rendered (REUSE the vector-#1 surface)");

            // The Tend button is shown + ENABLED (tend_due=true → server-authoritative the tend is available).
            Assert.IsTrue(controller.TendButtonShown, "Tend button shown on a grow_house with an active (non-DONE) grow");
            Assert.IsTrue(controller.TendButtonEnabled, "Tend button enabled when tend_due=true (the current stage is un-tended)");
            Assert.IsTrue(texts.Any(t => t == "Tend crop"), "Tend button label rendered");

            // R2.2: no raw scalar leaks client-side (no tend_count / grams / ticks / heat / stage int).
            AssertNoRawScalar(texts);

            Debug.Log($"[GrowHouseE2E] grow card — stage={grow.grow_stage_band} husbandry={grow.husbandry_band} tend_due={grow.tend_due} raid_risk={card.raid_risk}");
        }

        // The tend lifecycle: Tend a tend_due grow → tend_due flips false (server-authoritative) + the husbandry trajectory
        // rises (ON_TRACK → THRIVING) → the Tend button disables. A second tend on the now-tended stage is rejected 409.
        [UnityTest]
        public IEnumerator Tend_Lifecycle_FlipsTendDue_AndRaisesHusbandry()
        {
            var controller = NewLocalController();
            yield return SignInController(controller);

            controller.GrowSessionId = growSessionId;
            yield return controller.LoadBuilding(growHouseId);
            Assert.IsTrue(controller.CardLoaded, $"grow_house card loaded (err={controller.CardError})");
            Assert.IsNotNull(controller.CurrentGrow, "grow projection parsed");
            Assert.IsTrue(controller.CurrentGrow.tend_due, "the seeded grow is tend_due before the tend");
            Assert.IsTrue(controller.TendButtonEnabled, "Tend button enabled before the tend");
            string husbandryBefore = controller.CurrentGrow.husbandry_band; // ON_TRACK

            // TEND the current stage → the husbandry trajectory rises + tend_due flips false (one tend per stage).
            yield return controller.Tend();
            ActionOutcome tend = controller.LastActionOutcome;
            Assert.IsNotNull(tend, "tend action produced an outcome");
            StringAssert.Contains($"/v1/operational/grow-session/{growSessionId}/tend", tend.Endpoint,
                "tend hit the right grow-session endpoint");
            Assert.IsTrue(tend.Ok, $"tend on a tend_due grow should succeed (2xx). Got http={tend.HttpStatus} msg={tend.Message}");

            // The re-loaded card's projection reflects the tend: tend_due false + the husbandry band rose (ON_TRACK → THRIVING).
            Assert.IsNotNull(controller.CurrentGrow, "grow projection re-parsed after the tend");
            Assert.IsFalse(controller.CurrentGrow.tend_due, "after tending the current stage, tend_due flips false (one tend per stage)");
            Assert.AreEqual("THRIVING", controller.CurrentGrow.husbandry_band,
                $"tending raises the husbandry trajectory (was {husbandryBefore} → THRIVING at tend_count=stage_count)");

            // The Tend button is shown but now DISABLED (server-authoritative — the stage is tended).
            Assert.IsTrue(controller.TendButtonShown, "Tend button still shown (an active non-DONE grow)");
            Assert.IsFalse(controller.TendButtonEnabled, "Tend button disabled after tending (tend_due=false this stage)");
            Assert.IsTrue(controller.RenderedTexts.Any(t => t == "Thriving"), "husbandry band 'Thriving' rendered after the tend");

            // A second tend on the now-tended stage → a well-formed 409 (one tend per stage, server-authoritative).
            yield return controller.Tend();
            ActionOutcome second = controller.LastActionOutcome;
            Assert.IsFalse(second.Ok, "a second tend on an already-tended stage is rejected");
            Assert.AreEqual(409, second.HttpStatus, "double-tend → 409 RESOURCE_STATE_CONFLICT (one tend per stage)");
            Assert.IsFalse(string.IsNullOrEmpty(second.Message), "the rejected tend still carries a readable message (F2)");

            // R2.2: no raw scalar leaks client-side.
            AssertNoRawScalar(controller.RenderedTexts);

            Debug.Log($"[GrowHouseE2E] tend lifecycle — tended={tend.Ok} husbandry={controller.CurrentGrow.husbandry_band} tend_due={controller.CurrentGrow.tend_due}");
        }

        // A focused guard: the grow-session projection is JWT-gated (unauth → not OK).
        [UnityTest]
        public IEnumerator GrowSession_WithoutToken_DoesNotLoad()
        {
            var client = new BuildingCardClient { BaseUrl = LocalStack };
            GrowSessionDto dto = null;
            long errCode = 0;
            yield return client.GetGrowSession(growSessionId, null, d => dto = d, (code, msg) => errCode = code);

            Assert.IsNull(dto, "no grow-session projection unauthenticated");
            Assert.AreNotEqual(200, errCode, "unauthenticated grow-session fetch is rejected");
        }

        // Screenshot of the grow_house card showing the cultivation surface. Categorised so it only runs on demand.
        [UnityTest]
        [Category("Screenshot")]
        public IEnumerator CaptureGrowHouseScreenshot()
        {
            var controller = NewLocalController();
            yield return SignInController(controller);

            controller.GrowSessionId = growSessionId;
            yield return controller.LoadBuilding(growHouseId);
            Assert.IsTrue(controller.CardLoaded, $"grow_house card loaded (err={controller.CardError})");
            Assert.IsTrue(controller.GrowStageShown, "grow-stage row shown for the screenshot");
            for (int i = 0; i < 3; i++) yield return null;
            yield return CaptureTo("grow_house_card.png");
        }

        private static IEnumerator CaptureTo(string fileName)
        {
            string dir = Path.Combine(Application.dataPath, "Screenshots");
            Directory.CreateDirectory(dir);
            string path = Path.Combine(dir, fileName);
            if (File.Exists(path)) File.Delete(path);

            ScreenCapture.CaptureScreenshot(path);
            float waited = 0f;
            while (!File.Exists(path) && waited < 10f) { waited += Time.deltaTime; yield return null; }
            yield return null;
            Assert.IsTrue(File.Exists(path), $"screenshot written to {path}");
            Debug.Log($"[GrowHouseE2E] screenshot → {path}");
        }
    }
}
