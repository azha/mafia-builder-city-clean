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
    // E2E (charter 27: NO MOCK) for the Phase-2b vector #2 (substances / Crick) COLD-CHAIN building-card surface
    // (T8 Stage B). Drives the real BuildingCardController against the LOCAL dockerized stack (Traefik @
    // http://localhost — the cold-chain backend lives on the local e2e-overlay game-back; the controller's
    // SerializeField defaults to the VPS, so this fixture overrides it with SetBaseUrl("http://localhost")):
    //   1. runs Tools/seed_operational_demo.mjs and parses its stdout JSON to DISCOVER the demo creds + the Crick
    //      cold-chain `refinery` (holds 200 g Crick → OPTIMAL_COLD) — its id changes every run (never hard-coded);
    //   2. points the controller at http://localhost, then signs in via its AuthClient → Bearer;
    //   3. loads the refinery's building card (which also fetches GET /v1/operational/storage/:id) and asserts the
    //      cold-chain row renders substance=CRICK, temperature_status=OPTIMAL_COLD, and NOT degrading (Stable);
    //   4. asserts NO raw scalar leaks client-side (only qualitative bands / labels / glyphs / booleans — R2.2).
    //
    // ORDER-INDEPENDENT: this fixture self-seeds its precondition in OneTimeSetUp (the operational seeder re-creates
    // the refinery with a fresh id on every run), so the seed→use is atomic per fixture and a sibling op fixture's
    // re-seed can't invalidate the id this fixture loads.
    public class CrickColdChainPlayModeTests
    {
        private const string LocalStack = "http://localhost";

        private GameObject controllerGo;

        // Discovered from the seeder's stdout (see OneTimeSeed).
        private static string refineryId; // the Crick cold-chain refinery (200 g Crick → OPTIMAL_COLD)

        [TearDown]
        public void TearDown()
        {
            if (controllerGo != null) Object.Destroy(controllerGo);
        }

        [OneTimeSetUp]
        public void OneTimeSeed()
        {
            string json = SeederSupport.RunSeeder(SeederSupport.OperationalSeeder, SeederSupport.OperationalMarker);
            refineryId = SeederSupport.ExtractString(json, "refinery");
            Assert.IsTrue(SeederSupport.IsUuid(refineryId), $"discovered refinery uuid (got '{refineryId}')");
            Debug.Log($"[CrickColdChainE2E] seeded — refinery(Crick OPTIMAL_COLD)={refineryId}");
        }

        // ------------------------------------------------------------ helpers --

        private BuildingCardController NewLocalController()
        {
            controllerGo = new GameObject("BuildingCardController");
            var controller = controllerGo.AddComponent<BuildingCardController>();
            // The cold-chain backend is on the LOCAL stack — override the VPS default BEFORE SignIn.
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

        private static void AssertNoRawScalar(System.Collections.Generic.IReadOnlyList<string> texts)
        {
            foreach (string t in texts)
            {
                Assert.IsFalse(Regex.IsMatch(t, @"(?<![A-Za-z])\d+(\.\d+)?(?![A-Za-z])"),
                    $"no raw scalar may be shown client-side, but rendered text was: '{t}'");
            }
        }

        // ------------------------------------------------------------ tests --

        // The Crick refinery card renders the cold-chain status row: substance=CRICK, temperature OPTIMAL_COLD, Stable.
        [UnityTest]
        public IEnumerator RefineryCard_RendersColdChainRow_CrickOptimalCold_NotDegrading()
        {
            var controller = NewLocalController();
            yield return SignInController(controller);

            yield return controller.LoadBuilding(refineryId);
            Assert.IsNull(controller.CardError, $"card load errored: {controller.CardError}");
            Assert.IsTrue(controller.CardLoaded, "refinery building card loaded");

            BuildingCardDto card = controller.CurrentCard;
            Assert.IsNotNull(card, "card projection parsed");
            Assert.AreEqual(refineryId, card.building, "card is for the seeded refinery");
            Assert.AreEqual("refinery", card.operational_type, "operational_type is refinery");

            // The storage projection (GET /v1/operational/storage/:id) carries the cold-chain leaves.
            StorageDto storage = controller.CurrentStorage;
            Assert.IsNotNull(storage, "refinery storage projection parsed (cook building → storage present)");
            Assert.AreEqual("CRICK", storage.substance_type, "refinery holds CRICK");
            Assert.AreEqual("OPTIMAL_COLD", storage.temperature_status,
                "a refinery is cold-by-nature → its Crick reads OPTIMAL_COLD");
            Assert.IsFalse(storage.degrading, "cold Crick in a refinery is NOT degrading");

            // The cold-chain status row is shown and reflects the bands.
            Assert.IsTrue(controller.ColdChainShown, "the cold-chain status row is shown on a Crick refinery");
            var texts = controller.RenderedTexts;
            Assert.IsTrue(texts.Any(t => t == "Substance"), "cold-chain Substance row label rendered");
            Assert.IsTrue(texts.Any(t => t == "Crick"), "substance value 'Crick' rendered");
            Assert.IsTrue(texts.Any(t => t == "Temperature"), "cold-chain Temperature row label rendered");
            Assert.IsTrue(texts.Any(t => t == "Optimal (cold)"), "temperature band 'Optimal (cold)' rendered");
            Assert.IsTrue(texts.Any(t => t == "Cold chain"), "cold-chain status row label rendered");
            Assert.IsTrue(texts.Any(t => t == "Stable"), "not-degrading rendered as 'Stable'");

            // R2.2: no raw scalar leaks client-side (no °C / grams / rate / ticks).
            AssertNoRawScalar(texts);

            Debug.Log($"[CrickColdChainE2E] cold-chain card — substance={storage.substance_type} temp={storage.temperature_status} degrading={storage.degrading} product_band={storage.product_band}");
        }

        // A non-cold-chain building (the seeded lab) renders NO cold-chain row: its storage temperature_status is null
        // (Brindle has no cold chain), so the cold-chain surface stays absent. Proves the row is gated correctly.
        [UnityTest]
        public IEnumerator BrindleLab_HasNoColdChainRow()
        {
            string json = SeederSupport.RunSeeder(SeederSupport.OperationalSeeder, SeederSupport.OperationalMarker);
            string healthyLabId = SeederSupport.ExtractString(json, "lab");
            string localRefinery = SeederSupport.ExtractString(json, "refinery");
            Assert.IsTrue(SeederSupport.IsUuid(healthyLabId), $"discovered lab uuid (got '{healthyLabId}')");
            refineryId = localRefinery; // keep the fixture's cached id consistent with this fresh seed.

            var controller = NewLocalController();
            yield return SignInController(controller);

            yield return controller.LoadBuilding(healthyLabId);
            Assert.IsTrue(controller.CardLoaded, $"lab card loaded (err={controller.CardError})");
            Assert.AreEqual("lab", controller.CurrentCard.operational_type, "operational_type is lab");

            // The lab is a COOK building → storage is present, but it holds Brindle → temperature_status is null.
            StorageDto storage = controller.CurrentStorage;
            // storage may be present (BRINDLE) with a null/empty temperature_status → no cold-chain row.
            if (storage != null)
                Assert.IsTrue(string.IsNullOrEmpty(storage.temperature_status),
                    "a Brindle lab has no cold chain → temperature_status is null/empty");

            Assert.IsFalse(controller.ColdChainShown, "no cold-chain row on a non-cold-chain (Brindle) lab");
            var texts = controller.RenderedTexts;
            Assert.IsFalse(texts.Any(t => t == "Temperature"), "no Temperature row on a Brindle lab");
            Assert.IsFalse(texts.Any(t => t == "Optimal (cold)"), "no cold-chain temperature band on a Brindle lab");
            AssertNoRawScalar(texts);

            Debug.Log($"[CrickColdChainE2E] Brindle lab — ColdChainShown={controller.ColdChainShown} (correctly absent)");
        }

        // Screenshot of the Crick refinery card showing the cold-chain row. Categorised so it only runs on demand.
        [UnityTest]
        [Category("Screenshot")]
        public IEnumerator CaptureColdChainScreenshot()
        {
            var controller = NewLocalController();
            yield return SignInController(controller);

            yield return controller.LoadBuilding(refineryId);
            Assert.IsTrue(controller.CardLoaded, $"refinery card loaded (err={controller.CardError})");
            Assert.IsTrue(controller.ColdChainShown, "cold-chain row shown for the screenshot");
            for (int i = 0; i < 3; i++) yield return null;
            yield return CaptureTo("crick_cold_chain.png");
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
            Debug.Log($"[CrickColdChainE2E] screenshot → {path}");
        }
    }
}
