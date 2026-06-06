using System;
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
    // E2E (charter 27: NO MOCK) for the Phase-2b Building-Card RAID surface (vector #1 Stage B).
    // Drives the real BuildingCardController against the live dockerized stack (Traefik @ http://localhost):
    //   1. runs Tools/seed_operational_demo.mjs and parses its stdout JSON to DISCOVER the demo creds + the
    //      RAIDED/DAMAGED lab (`raided_building`) and the HEALTHY control stash (`healthy_building`) — ids
    //      change every run (never hard-coded);
    //   2. signs in via the controller's AuthClient → Bearer;
    //   3. RAIDED building: loads the card and asserts structural_state==DAMAGED, the raid-risk band is shown,
    //      the raid notification is shown, and the Repair button is present;
    //   4. clicks Repair (the seeded wallet is FLUSH → affordable) and asserts the repair endpoint was hit (Ok)
    //      and the card reflects REPAIRING after the post-action reload;
    //   5. HEALTHY building: loads the stash card and asserts the raid-risk band is readable AND there is NO
    //      Repair button (only DAMAGED buildings expose Repair);
    //   6. asserts NO raw scalar leaks client-side (only qualitative bands / labels / glyphs / booleans).
    //
    // The seeder seeds the SAME operational demo player the controller signs in as, so the default creds match.
    public class BuildingCardRaidPlayModeTests
    {
        private GameObject controllerGo;

        // Discovered from the seeder's stdout (see Seed).
        private static string raidedBuildingId; // the DAMAGED lab
        private static string healthyBuildingId; // the OPERATIONAL control stash

        [TearDown]
        public void TearDown()
        {
            if (controllerGo != null) Object.Destroy(controllerGo);
        }

        // Self-seed THIS fixture's precondition (a raided/DAMAGED building + a healthy control) BEFORE EACH test,
        // not once per fixture. Two tests in this fixture are DESTRUCTIVE — they call Repair() on the shared
        // raided lab (CaptureRaidScreenshots + RepairDamagedBuilding), flipping its structural_state DAMAGED→
        // REPAIRING. A once-per-fixture seed (OneTimeSetUp) let that mutation bleed across tests: NUnit runs the
        // fixture's tests in alphabetical order, so CaptureRaidScreenshots (Repair) ran BEFORE RaidedBuilding /
        // RepairDamagedBuilding, leaving the lab REPAIRING when those read it (their DAMAGED precondition failed).
        // Re-seeding per test (the seeder DELETEs + recreates the district-16 buildings with fresh ids each run)
        // gives every test a genuinely fresh DAMAGED lab, regardless of run order — no weakened assertion: each
        // test's "is DAMAGED" precondition is restored to a real DAMAGED building immediately before it runs.
        [SetUp]
        public void Seed()
        {
            string json = SeederSupport.RunSeeder(SeederSupport.OperationalSeeder, SeederSupport.OperationalMarker);
            raidedBuildingId = SeederSupport.ExtractString(json, "raided_building");
            healthyBuildingId = SeederSupport.ExtractString(json, "healthy_building");
            Assert.IsTrue(SeederSupport.IsUuid(raidedBuildingId), $"discovered raided_building uuid (got '{raidedBuildingId}')");
            Assert.IsTrue(SeederSupport.IsUuid(healthyBuildingId), $"discovered healthy_building uuid (got '{healthyBuildingId}')");
            Debug.Log($"[BuildingCardRaidE2E] seeded — raided(DAMAGED)={raidedBuildingId} healthy={healthyBuildingId}");
        }

        // ------------------------------------------------------------ helpers --

        private BuildingCardController NewController()
        {
            controllerGo = new GameObject("BuildingCardController");
            return controllerGo.AddComponent<BuildingCardController>();
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

        // RAIDED/DAMAGED building: the card shows the DAMAGED structural band, the raid-risk band, and the
        // raid notification; the Repair button is present (DAMAGED gates it).
        [UnityTest]
        public IEnumerator RaidedBuilding_ShowsDamagedState_RaidRisk_AndRaidNotif()
        {
            var controller = NewController();
            controller.BuildingId = "";
            yield return SignInController(controller);

            yield return controller.LoadBuilding(raidedBuildingId);
            Assert.IsNull(controller.CardError, $"card load errored: {controller.CardError}");
            Assert.IsTrue(controller.CardLoaded, "raided building card loaded");

            BuildingCardDto card = controller.CurrentCard;
            Assert.IsNotNull(card, "card projection parsed");
            Assert.AreEqual(raidedBuildingId, card.building, "card is for the raided building");
            Assert.AreEqual("DAMAGED", card.structural_state, "seeded raided building is DAMAGED");
            Assert.IsTrue(card.recently_raided, "recently_raided flag is true on a raided building");
            // The seeded lab held product when raided → a non-NONE seizure band, and a non-NONE repair cost.
            Assert.AreNotEqual("NONE", card.seized_amount, "a raided product-holding lab seized a non-NONE band");
            Assert.AreNotEqual("NONE", card.repair_cost, "a DAMAGED building carries a non-NONE repair_cost band");
            // raid_risk is a closed band — assert it is one of the four valid values (the seeder pins it HIGH+).
            CollectionAssert.Contains(new[] { "LOW", "ELEVATED", "HIGH", "IMMINENT" }, card.raid_risk,
                $"raid_risk is a valid band (got '{card.raid_risk}')");

            // The UI reflects it: the rendered texts include the DAMAGED structural label, the raid-risk band,
            // and the raid notification ("Raided — seized …").
            var texts = controller.RenderedTexts;
            Assert.IsTrue(texts.Any(t => t == "Damaged"), "structural band 'Damaged' rendered");
            Assert.IsTrue(texts.Any(t => t == "Raid risk"), "raid-risk row label rendered");
            string riskLabel = RaidRiskWord(card.raid_risk);
            Assert.IsTrue(texts.Any(t => t == riskLabel), $"raid-risk band '{riskLabel}' rendered");
            Assert.IsTrue(texts.Any(t => t.StartsWith("Raided — seized")), "raid notification rendered");

            // The Repair button is present on a DAMAGED building.
            Assert.IsTrue(controller.RepairButtonShown, "Repair button is shown on a DAMAGED building");
            Assert.IsTrue(texts.Any(t => t.StartsWith("Repair (")), "Repair button label (with the cost band) rendered");

            // R2.2: no raw scalar leaks client-side.
            AssertNoRawScalar(texts);

            Debug.Log($"[BuildingCardRaidE2E] DAMAGED card — structural={card.structural_state} raid_risk={card.raid_risk} seized={card.seized_amount} repair_cost={card.repair_cost}");
        }

        // Click Repair on the DAMAGED building (wallet is FLUSH → affordable): assert the repair endpoint was
        // called (Ok) and the card reflects REPAIRING after the controller's post-action reload.
        [UnityTest]
        public IEnumerator RepairDamagedBuilding_WithFundedWallet_HitsEndpoint_AndCardBecomesRepairing()
        {
            var controller = NewController();
            controller.BuildingId = "";
            yield return SignInController(controller);

            yield return controller.LoadBuilding(raidedBuildingId);
            Assert.IsTrue(controller.CardLoaded, $"raided card loaded (err={controller.CardError})");
            Assert.AreEqual("DAMAGED", controller.CurrentCard.structural_state, "precondition: building is DAMAGED");

            // The seeder funds the wallet FLUSH → the Repair affordability gate is open.
            Assert.AreEqual("FLUSH", controller.WalletBand, "seeded wallet band is FLUSH");
            Assert.IsTrue(controller.RepairButtonShown, "Repair button shown");
            Assert.IsTrue(controller.RepairButtonAffordable, "Repair affordable with a FLUSH wallet");

            // Click Repair → it hits POST /v1/operational/building/:id/repair, then reloads the card.
            yield return controller.Repair();

            ActionOutcome repair = controller.LastActionOutcome;
            Assert.IsNotNull(repair, "repair action produced an outcome");
            StringAssert.Contains($"/v1/operational/building/{raidedBuildingId}/repair", repair.Endpoint,
                "repair hit the right building repair endpoint");
            Assert.IsTrue(repair.Ok, $"repair on a DAMAGED building with a FLUSH wallet should succeed (2xx). Got http={repair.HttpStatus} msg={repair.Message}");
            Assert.AreEqual("repairing", repair.ResultId, "repair ack parsed { repairing: true }");

            // The post-repair reload reflects REPAIRING (the backend flipped structural_state).
            Assert.IsTrue(controller.CardLoaded, "card reloaded after repair");
            Assert.AreEqual("REPAIRING", controller.CurrentCard.structural_state,
                "card reflects REPAIRING after a successful repair");
            // REPAIRING is not DAMAGED → the Repair button drops away.
            Assert.IsFalse(controller.RepairButtonShown, "Repair button is gone once the building is REPAIRING");
            var texts = controller.RenderedTexts;
            Assert.IsTrue(texts.Any(t => t == "Repairing"), "structural band 'Repairing' rendered after repair");
            AssertNoRawScalar(texts);

            Debug.Log($"[BuildingCardRaidE2E] repair outcome={repair}; card now {controller.CurrentCard.structural_state}");
        }

        // HEALTHY control building: the raid-risk band is readable AND there is NO Repair button (only DAMAGED
        // buildings expose Repair).
        [UnityTest]
        public IEnumerator HealthyBuilding_RaidRiskReadable_AndNoRepairButton()
        {
            var controller = NewController();
            controller.BuildingId = "";
            yield return SignInController(controller);

            yield return controller.LoadBuilding(healthyBuildingId);
            Assert.IsNull(controller.CardError, $"card load errored: {controller.CardError}");
            Assert.IsTrue(controller.CardLoaded, "healthy building card loaded");

            BuildingCardDto card = controller.CurrentCard;
            Assert.AreEqual(healthyBuildingId, card.building, "card is for the healthy control building");
            Assert.AreEqual("OPERATIONAL", card.structural_state, "control building is OPERATIONAL (never raided)");
            Assert.IsFalse(card.recently_raided, "control building was not recently raided");
            CollectionAssert.Contains(new[] { "LOW", "ELEVATED", "HIGH", "IMMINENT" }, card.raid_risk,
                $"raid_risk is a valid readable band (got '{card.raid_risk}')");

            var texts = controller.RenderedTexts;
            // The raid-risk row is readable on a healthy building too.
            Assert.IsTrue(texts.Any(t => t == "Raid risk"), "raid-risk row label rendered on a healthy building");
            string riskLabel = RaidRiskWord(card.raid_risk);
            Assert.IsTrue(texts.Any(t => t == riskLabel), $"healthy raid-risk band '{riskLabel}' rendered");
            // No raid notification on a non-raided building.
            Assert.IsFalse(texts.Any(t => t.StartsWith("Raided — seized")), "no raid notification on a healthy building");
            // NO Repair button on a non-DAMAGED building.
            Assert.IsFalse(controller.RepairButtonShown, "no Repair button on a healthy (OPERATIONAL) building");
            Assert.IsFalse(texts.Any(t => t.StartsWith("Repair (")), "no Repair button label on a healthy building");

            AssertNoRawScalar(texts);
            Debug.Log($"[BuildingCardRaidE2E] healthy card — structural={card.structural_state} raid_risk={card.raid_risk}");
        }

        // Screenshots of the DAMAGED card + the REPAIRING state. Categorised so it only runs on demand.
        [UnityTest]
        [Category("Screenshot")]
        public IEnumerator CaptureRaidScreenshots()
        {
            var controller = NewController();
            yield return SignInController(controller);

            // --- DAMAGED card ---
            yield return controller.LoadBuilding(raidedBuildingId);
            Assert.IsTrue(controller.CardLoaded, $"raided card loaded (err={controller.CardError})");
            Assert.AreEqual("DAMAGED", controller.CurrentCard.structural_state, "card is DAMAGED for the screenshot");
            for (int i = 0; i < 3; i++) yield return null;
            yield return CaptureTo("building_card_raid_damaged.png");

            // --- REPAIRING card (after a real repair) ---
            yield return controller.Repair();
            Assert.IsTrue(controller.LastActionOutcome != null && controller.LastActionOutcome.Ok,
                $"repair succeeded for the REPAIRING screenshot (msg={controller.LastActionOutcome?.Message})");
            Assert.AreEqual("REPAIRING", controller.CurrentCard.structural_state, "card is REPAIRING for the screenshot");
            for (int i = 0; i < 3; i++) yield return null;
            yield return CaptureTo("building_card_raid_repairing.png");
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
            Debug.Log($"[BuildingCardRaidE2E] screenshot → {path}");
        }

        // The worded raid-risk label the controller renders for a band (mirror of the controller's RaidRiskLabel).
        private static string RaidRiskWord(string b)
        {
            switch (b)
            {
                case "LOW": return "Low";
                case "ELEVATED": return "Elevated";
                case "HIGH": return "High";
                case "IMMINENT": return "Imminent";
                default: return b;
            }
        }
    }
}
