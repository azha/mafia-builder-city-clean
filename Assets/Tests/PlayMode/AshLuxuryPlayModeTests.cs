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
    // E2E (charter 27: NO MOCK) for the Phase-2c vector #2c (substances / Ash) LUXURY-CHANNEL building-card surface
    // (T12 Stage B). Drives the real BuildingCardController against the LOCAL dockerized stack (Traefik @ http://localhost
    // — the Ash backend lives on the local game-back; the controller's SerializeField defaults to the VPS, so this fixture
    // overrides it with SetBaseUrl("http://localhost")):
    //   1. runs Tools/seed_operational_demo.mjs and parses its stdout JSON to DISCOVER the demo creds + the Ash
    //      `specialized_lab` (Tier-2 REFINED, holds 200 g Ash → CRYSTALLINE) + its booked SCHEDULED `ash_appointment_id`
    //      — the ids change every run (never hard-coded);
    //   2. points the controller at http://localhost, then signs in via its AuthClient → Bearer;
    //   3. loads the specialized_lab card (which also fetches GET /v1/operational/storage/:id) and asserts the Ash surface
    //      renders substance=ASH + lab_tier_band=REFINED + purity_band=CRYSTALLINE + the Upgrade-tier affordance;
    //   4. exercises the appointment lifecycle: the SEEDED appointment is SCHEDULED → honor → HONORED (the realized
    //      payout band rises to PREMIUM for a CRYSTALLINE batch) — the ONLY Ash sale path (no lek/dealer selling);
    //   5. asserts NO raw scalar leaks client-side (only qualitative bands / labels / glyphs / booleans — R2.2).
    //
    // ORDER-INDEPENDENT: this fixture self-seeds its precondition in OneTimeSetUp (the operational seeder re-creates the
    // specialized_lab + a fresh SCHEDULED appointment on every run), so the seed→use is atomic per fixture and a sibling
    // op fixture's re-seed can't invalidate the ids this fixture loads.
    public class AshLuxuryPlayModeTests
    {
        private const string LocalStack = "http://localhost";

        private GameObject controllerGo;

        // Discovered from the seeder's stdout (see OneTimeSeed).
        private static string specializedLabId; // the Ash luxury lab (Tier-2 REFINED, 200 g Ash → CRYSTALLINE)
        private static string ashAppointmentId; // the SCHEDULED appointment booked at the lab's (Glass) venue

        [TearDown]
        public void TearDown()
        {
            if (controllerGo != null) Object.Destroy(controllerGo);
        }

        [OneTimeSetUp]
        public void OneTimeSeed()
        {
            string json = SeederSupport.RunSeeder(SeederSupport.OperationalSeeder, SeederSupport.OperationalMarker);
            specializedLabId = SeederSupport.ExtractString(json, "specialized_lab");
            ashAppointmentId = SeederSupport.ExtractString(json, "ash_appointment_id");
            Assert.IsTrue(SeederSupport.IsUuid(specializedLabId), $"discovered specialized_lab uuid (got '{specializedLabId}')");
            Assert.IsTrue(SeederSupport.IsUuid(ashAppointmentId), $"discovered ash_appointment_id uuid (got '{ashAppointmentId}')");
            Debug.Log($"[AshLuxuryE2E] seeded — specialized_lab(REFINED/CRYSTALLINE)={specializedLabId} appointment(SCHEDULED)={ashAppointmentId}");
        }

        // ------------------------------------------------------------ helpers --

        private BuildingCardController NewLocalController()
        {
            controllerGo = new GameObject("BuildingCardController");
            var controller = controllerGo.AddComponent<BuildingCardController>();
            // The Ash backend is on the LOCAL stack — override the VPS default BEFORE SignIn.
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

        // The Ash specialized_lab card renders the luxury surface: substance=ASH (storage), lab_tier_band=REFINED, the
        // purity_band=CRYSTALLINE row, and the Upgrade-tier affordance (the seeded wallet is FLUSH → affordable).
        [UnityTest]
        public IEnumerator SpecializedLabCard_RendersAshSurface_LabTier_AndPurityBand()
        {
            var controller = NewLocalController();
            yield return SignInController(controller);

            yield return controller.LoadBuilding(specializedLabId);
            Assert.IsNull(controller.CardError, $"card load errored: {controller.CardError}");
            Assert.IsTrue(controller.CardLoaded, "specialized_lab building card loaded");

            BuildingCardDto card = controller.CurrentCard;
            Assert.IsNotNull(card, "card projection parsed");
            Assert.AreEqual(specializedLabId, card.building, "card is for the seeded specialized_lab");
            Assert.AreEqual("specialized_lab", card.operational_type, "operational_type is specialized_lab");
            // The lab-tier band reflects the seeded Tier-2 (upgraded once from the build default).
            Assert.AreEqual("REFINED", card.lab_tier_band, "seeded specialized_lab is Tier-2 → REFINED band");

            // The storage projection (GET /v1/operational/storage/:id) carries substance=ASH + the batch purity_band.
            StorageDto storage = controller.CurrentStorage;
            Assert.IsNotNull(storage, "specialized_lab storage projection parsed (cook building → storage present)");
            Assert.AreEqual("ASH", storage.substance_type, "specialized_lab holds ASH");
            Assert.AreEqual("CRYSTALLINE", storage.purity_band,
                "the seeded Tier-2 + 2 refining passes Ash batch reads CRYSTALLINE");

            // The Ash surface rows are shown and reflect the bands.
            Assert.IsTrue(controller.LabTierShown, "the lab-tier row is shown on a specialized_lab");
            Assert.IsTrue(controller.PurityBandShown, "the purity-band row is shown for a cooked Ash batch");
            var texts = controller.RenderedTexts;
            Assert.IsTrue(texts.Any(t => t == "Lab tier"), "lab-tier row label rendered");
            Assert.IsTrue(texts.Any(t => t == "Refined"), "lab-tier band value 'Refined' rendered");
            Assert.IsTrue(texts.Any(t => t == "Purity"), "purity row label rendered");
            Assert.IsTrue(texts.Any(t => t == "Crystalline"), "purity band value 'Crystalline' rendered");
            Assert.IsTrue(texts.Any(t => t == "Ash"), "substance value 'Ash' rendered (the storage substance row)");

            // The Upgrade-tier affordance is present on a sub-MASTER lab (REFINED → can upgrade to MASTER); the seeded
            // wallet is FLUSH → it is interactable.
            Assert.IsTrue(controller.UpgradeTierButtonShown, "Upgrade-tier button shown on a sub-MASTER specialized_lab");
            Assert.AreEqual("FLUSH", controller.WalletBand, "seeded wallet band is FLUSH");
            Assert.IsTrue(controller.UpgradeTierButtonAffordable, "Upgrade affordable with a FLUSH wallet");
            Assert.IsTrue(texts.Any(t => t == "Upgrade lab tier"), "Upgrade-tier button label rendered");

            // The refining-passes selector is shown (the Ash cook-start time↔purity lever).
            Assert.IsTrue(texts.Any(t => t.StartsWith("PASSES DE RAFFINAGE")), "refining-passes selector section rendered");

            // R2.2: no raw scalar leaks client-side (no purity_score / cents / multiplier / ticks).
            AssertNoRawScalar(texts);

            Debug.Log($"[AshLuxuryE2E] Ash card — substance={storage.substance_type} lab_tier={card.lab_tier_band} purity={storage.purity_band}");
        }

        // The appointment lifecycle: the SEEDED appointment is SCHEDULED → honor → HONORED with a PREMIUM payout band (the
        // realized purity premium of the CRYSTALLINE batch). The appointment panel reflects each state. This is the ONLY
        // Ash sale path (no lek/dealer selling — the luxuryChannel trait).
        [UnityTest]
        public IEnumerator Appointment_Lifecycle_ScheduledThenHonored_RendersStatusAndPayoutBands()
        {
            var controller = NewLocalController();
            yield return SignInController(controller);

            yield return controller.LoadBuilding(specializedLabId);
            Assert.IsTrue(controller.CardLoaded, $"specialized_lab card loaded (err={controller.CardError})");

            // Track + refresh the SEEDED appointment → it is SCHEDULED (PENDING payout).
            controller.AppointmentId = ashAppointmentId;
            yield return controller.RefreshAppointment();
            Assert.IsNotNull(controller.CurrentAppointment, "appointment projection parsed");
            Assert.AreEqual("SCHEDULED", controller.CurrentAppointment.status, "the seeded appointment is SCHEDULED");
            Assert.AreEqual("PENDING", controller.CurrentAppointment.payout_band, "a SCHEDULED appointment is PENDING payout");

            // Re-render the card so the appointment panel appears (SCHEDULED) + the Honor affordance shows.
            yield return controller.LoadBuilding(specializedLabId);
            Assert.IsTrue(controller.RenderedTexts.Any(t => t == "Scheduled"),
                "appointment status band 'Scheduled' rendered after refresh");

            // HONOR the appointment → it sells the Ash at the venue (the ONLY Ash sale path) → HONORED.
            yield return controller.HonorAppointment();
            ActionOutcome honor = controller.LastActionOutcome;
            Assert.IsNotNull(honor, "honor action produced an outcome");
            StringAssert.Contains($"/v1/operational/appointment/{ashAppointmentId}/honor", honor.Endpoint,
                "honor hit the right appointment endpoint");
            Assert.IsTrue(honor.Ok, $"honor on a SCHEDULED appointment with Ash at the venue should succeed (2xx). Got http={honor.HttpStatus} msg={honor.Message}");

            // The refreshed projection reflects HONORED + a realized payout band (PREMIUM for the CRYSTALLINE batch).
            Assert.IsNotNull(controller.CurrentAppointment, "appointment projection re-parsed after honor");
            Assert.AreEqual("HONORED", controller.CurrentAppointment.status, "appointment is HONORED after the sale");
            Assert.AreEqual("PREMIUM", controller.CurrentAppointment.payout_band,
                "a CRYSTALLINE-batch honor realizes the PREMIUM payout band");

            var texts = controller.RenderedTexts;
            Assert.IsTrue(texts.Any(t => t == "Honored"), "appointment status band 'Honored' rendered after honor");
            Assert.IsTrue(texts.Any(t => t == "Premium"), "payout band 'Premium' rendered after honor");

            // A second honor on the now-HONORED appointment → a well-formed 409 (double-honor is rejected server-side).
            yield return controller.HonorAppointment();
            ActionOutcome second = controller.LastActionOutcome;
            Assert.IsFalse(second.Ok, "a second honor on an already-HONORED appointment is rejected");
            Assert.AreEqual(409, second.HttpStatus, "double-honor → 409 RESOURCE_STATE_CONFLICT");
            Assert.IsFalse(string.IsNullOrEmpty(second.Message), "the rejected honor still carries a readable message (F2)");

            // R2.2: no raw scalar leaks client-side.
            AssertNoRawScalar(controller.RenderedTexts);

            Debug.Log($"[AshLuxuryE2E] appointment lifecycle — honored={honor.Ok} status={controller.CurrentAppointment.status} payout={controller.CurrentAppointment.payout_band}");
        }

        // A focused guard: the appointment endpoint is JWT-gated (unauth → not OK).
        [UnityTest]
        public IEnumerator Appointment_WithoutToken_DoesNotLoad()
        {
            var client = new BuildingCardClient { BaseUrl = LocalStack };
            AppointmentDto dto = null;
            long errCode = 0;
            yield return client.GetAppointment(ashAppointmentId, null, d => dto = d, (code, msg) => errCode = code);

            Assert.IsNull(dto, "no appointment projection unauthenticated");
            Assert.AreNotEqual(200, errCode, "unauthenticated appointment fetch is rejected");
        }

        // Screenshot of the Ash specialized_lab card showing the luxury surface. Categorised so it only runs on demand.
        [UnityTest]
        [Category("Screenshot")]
        public IEnumerator CaptureAshLuxuryScreenshot()
        {
            var controller = NewLocalController();
            yield return SignInController(controller);

            yield return controller.LoadBuilding(specializedLabId);
            Assert.IsTrue(controller.CardLoaded, $"specialized_lab card loaded (err={controller.CardError})");
            // Track the seeded appointment so the appointment panel shows in the shot.
            controller.AppointmentId = ashAppointmentId;
            yield return controller.RefreshAppointment();
            yield return controller.LoadBuilding(specializedLabId);
            Assert.IsTrue(controller.PurityBandShown, "purity row shown for the screenshot");
            for (int i = 0; i < 3; i++) yield return null;
            yield return CaptureTo("ash_luxury_specialized_lab.png");
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
            Debug.Log($"[AshLuxuryE2E] screenshot → {path}");
        }
    }
}
