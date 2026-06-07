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
    // E2E (charter 27: NO MOCK) for the Phase-4 vector #4 (distribution_hub courier-dispatch logistics) building-card
    // surface (T9 Stage B). Drives the real BuildingCardController against the LOCAL dockerized stack (Traefik @
    // http://localhost — the distribution_hub backend lives on the local game-back; the controller's SerializeField
    // defaults to the VPS, so this fixture overrides it with SetBaseUrl("http://localhost")):
    //   1. runs Tools/seed_operational_demo.mjs and parses its stdout JSON to DISCOVER the demo creds + the
    //      `distribution_hub` (Tier-2 MEDIUM, BUSY roster, FOOT/BIKE/CAR unlocked) + a valid dispatch source
    //      (`hub_dispatch_from` = the Crick refinery, which holds product) + destination (`hub_dispatch_to`) — the ids
    //      change every run (never hard-coded);
    //   2. points the controller at http://localhost, then signs in via its AuthClient → Bearer;
    //   3. loads the distribution_hub card and asserts the hub surface renders hub_tier_band=MEDIUM + roster_band=BUSY +
    //      the unlocked-vehicles row (FOOT/BIKE/CAR) + the Upgrade-hub-tier affordance (Tier-2 < MAX → upgradable);
    //   4. exercises a vehicle dispatch (the SERVER-AUTHORITATIVE vehicle selector cycles only unlocked modes; a bike
    //      dispatch from the refinery succeeds 201) and asserts the roster band reflects an in-transit shipment;
    //   5. asserts NO raw scalar leaks client-side (only qualitative bands / categorical labels / glyphs / booleans — R2.2).
    //
    // ORDER-INDEPENDENT: this fixture self-seeds its precondition in OneTimeSetUp (the operational seeder re-creates the
    // distribution_hub + fresh in-transit shipments on every run), so the seed→use is atomic per fixture and a sibling
    // op fixture's re-seed can't invalidate the ids this fixture loads.
    public class DistributionHubPlayModeTests
    {
        private const string LocalStack = "http://localhost";

        private GameObject controllerGo;

        // Discovered from the seeder's stdout (see OneTimeSeed).
        private static string distributionHubId; // the Tier-2 MEDIUM hub (BUSY roster, FOOT/BIKE/CAR unlocked)
        private static string dispatchFromId;     // a valid dispatch source (the Crick refinery — holds product)
        private static string dispatchToId;       // a valid dispatch destination (a distinct operational building; from≠to)

        [TearDown]
        public void TearDown()
        {
            if (controllerGo != null) Object.Destroy(controllerGo);
        }

        [OneTimeSetUp]
        public void OneTimeSeed()
        {
            string json = SeederSupport.RunSeeder(SeederSupport.OperationalSeeder, SeederSupport.OperationalMarker);
            distributionHubId = SeederSupport.ExtractString(json, "distribution_hub");
            dispatchFromId = SeederSupport.ExtractString(json, "hub_dispatch_from");
            dispatchToId = SeederSupport.ExtractString(json, "hub_dispatch_to");
            Assert.IsTrue(SeederSupport.IsUuid(distributionHubId), $"discovered distribution_hub uuid (got '{distributionHubId}')");
            Assert.IsTrue(SeederSupport.IsUuid(dispatchFromId), $"discovered hub_dispatch_from uuid (got '{dispatchFromId}')");
            Assert.IsTrue(SeederSupport.IsUuid(dispatchToId), $"discovered hub_dispatch_to uuid (got '{dispatchToId}')");
            Debug.Log($"[DistributionHubE2E] seeded — hub(MEDIUM/BUSY)={distributionHubId} from={dispatchFromId} to={dispatchToId}");
        }

        // ------------------------------------------------------------ helpers --

        private BuildingCardController NewLocalController()
        {
            controllerGo = new GameObject("BuildingCardController");
            var controller = controllerGo.AddComponent<BuildingCardController>();
            // The distribution_hub backend is on the LOCAL stack — override the VPS default BEFORE SignIn.
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

        // The distribution_hub card renders the hub surface: hub_tier_band=MEDIUM, roster_band=BUSY, the unlocked-vehicles
        // row (FOOT/BIKE/CAR), and the Upgrade-hub-tier affordance (the seeded wallet is FLUSH → affordable). R2.2: bands +
        // categorical labels only — no raw hub_tier int / shift count / cap / vehicle speed.
        [UnityTest]
        public IEnumerator DistributionHubCard_RendersHubSurface_TierRoster_AndVehicles()
        {
            var controller = NewLocalController();
            yield return SignInController(controller);

            yield return controller.LoadBuilding(distributionHubId);
            Assert.IsNull(controller.CardError, $"card load errored: {controller.CardError}");
            Assert.IsTrue(controller.CardLoaded, "distribution_hub building card loaded");

            BuildingCardDto card = controller.CurrentCard;
            Assert.IsNotNull(card, "card projection parsed");
            Assert.AreEqual(distributionHubId, card.building, "card is for the seeded distribution_hub");
            Assert.AreEqual("distribution_hub", card.operational_type, "operational_type is distribution_hub");
            // The hub-tier band reflects the seeded Tier-2 (upgraded once from the SMALL build default).
            Assert.AreEqual("MEDIUM", card.hub_tier_band, "seeded distribution_hub is Tier-2 → MEDIUM band");
            // The roster band reflects the 2 in-transit demo shipments (below the Tier-2 cap → BUSY, not FULL).
            Assert.AreEqual("BUSY", card.roster_band, "seeded hub has in-transit shipments below cap → BUSY roster band");
            // An operational hub unlocks the wheeled modes (FOOT always; +BIKE/CAR).
            CollectionAssert.AreEquivalent(new[] { "FOOT", "BIKE", "CAR" }, card.available_vehicles,
                "an operational hub unlocks FOOT/BIKE/CAR");

            // The hub surface rows are shown and reflect the bands.
            Assert.IsTrue(controller.HubTierShown, "the hub-tier row is shown on a distribution_hub");
            Assert.IsTrue(controller.RosterShown, "the roster row is shown on a distribution_hub");
            Assert.IsTrue(controller.VehiclesShown, "the unlocked-vehicles row is shown on a distribution_hub");
            var texts = controller.RenderedTexts;
            Assert.IsTrue(texts.Any(t => t == "Hub tier"), "hub-tier row label rendered");
            Assert.IsTrue(texts.Any(t => t == "Medium"), "hub-tier band value 'Medium' rendered");
            Assert.IsTrue(texts.Any(t => t == "Roster"), "roster row label rendered");
            Assert.IsTrue(texts.Any(t => t == "Busy"), "roster band value 'Busy' rendered");
            Assert.IsTrue(texts.Any(t => t == "Vehicles"), "vehicles row label rendered");
            Assert.IsTrue(texts.Any(t => t.Contains("Bike") && t.Contains("Car")), "unlocked-vehicles list rendered (Foot, Bike, Car)");

            // The Upgrade-hub-tier affordance is present on a sub-MAX hub (MEDIUM → can upgrade); the seeded wallet is
            // FLUSH → it is interactable. The gate is a band-vs-band comparison (R2.2 — never cents).
            Assert.IsTrue(controller.UpgradeHubTierButtonShown, "Upgrade-hub-tier button shown on a sub-MAX distribution_hub");
            Assert.AreEqual("FLUSH", controller.WalletBand, "seeded wallet band is FLUSH");
            Assert.IsTrue(controller.UpgradeHubTierButtonAffordable, "Upgrade affordable with a FLUSH wallet");
            Assert.IsTrue(texts.Any(t => t == "Upgrade hub tier"), "Upgrade-hub-tier button label rendered");

            // The dispatch vehicle selector is shown (the server-authoritative foot/bike/car picker).
            Assert.IsTrue(controller.VehicleSelectorShown, "the dispatch vehicle selector is shown on a hub card");
            Assert.IsTrue(texts.Any(t => t.StartsWith("DISPATCH VEHICLE")), "vehicle selector section rendered");

            // R2.2: no raw scalar leaks client-side (no hub_tier int / shift count / cap / vehicle speed).
            AssertNoRawScalar(texts);

            Debug.Log($"[DistributionHubE2E] hub card — hub_tier={card.hub_tier_band} roster={card.roster_band} vehicles={string.Join(",", card.available_vehicles)}");
        }

        // The dispatch vehicle selector is SERVER-AUTHORITATIVE: it cycles only the unlocked modes (FOOT/BIKE/CAR here),
        // and a dispatch with a hub-unlocked vehicle (bike) succeeds 201 from a product-holding source. After the dispatch
        // the roster band stays BUSY (still below cap). This is the lever-B (vehicle) + lever-A (roster) integration.
        [UnityTest]
        public IEnumerator Dispatch_WithUnlockedVehicle_Succeeds_AndRosterBandReflectsIt()
        {
            var controller = NewLocalController();
            yield return SignInController(controller);

            yield return controller.LoadBuilding(distributionHubId);
            Assert.IsTrue(controller.CardLoaded, $"distribution_hub card loaded (err={controller.CardError})");

            // The vehicle selector mirrors the server's allowed set. Cycle to BIKE (a hub-unlocked mode) — it is accepted
            // (present in available_vehicles); a LOCKED mode would be skipped (server-authoritative mirror).
            controller.SetSelectedVehicle("BIKE");
            Assert.AreEqual("BIKE", controller.SelectedVehicle, "BIKE is selectable (it is unlocked on this hub)");

            // Wire a valid dispatch source (the refinery — holds Crick) + destination (a distinct operational building).
            controller.DispatchFromBuildingId = dispatchFromId;
            controller.DispatchToBuildingId = dispatchToId;

            // Dispatch a small cargo with the chosen (unlocked) vehicle → 201; the card reloads to reflect the new shift.
            yield return controller.Dispatch(5);
            ActionOutcome dispatch = controller.LastActionOutcome;
            Assert.IsNotNull(dispatch, "dispatch produced an outcome");
            StringAssert.Contains("/v1/operational/distribution/dispatch", dispatch.Endpoint, "dispatch hit the dispatch endpoint");
            Assert.IsTrue(dispatch.Ok,
                $"a bike dispatch from a product-holding source on an operational hub should succeed (2xx). Got http={dispatch.HttpStatus} msg={dispatch.Message}");
            Assert.IsFalse(string.IsNullOrEmpty(dispatch.ResultId), "the dispatch returned a courier id");

            // The reloaded card still reads BUSY (3 in-transit now, still below the Tier-2 cap of 11).
            Assert.IsTrue(controller.CardLoaded, "card reloaded after the dispatch");
            Assert.AreEqual("BUSY", controller.CurrentCard.roster_band, "roster band reflects the in-transit shipments (BUSY)");
            Assert.IsTrue(controller.RosterShown, "the roster row is shown after dispatch");

            // R2.2: no raw scalar leaks client-side.
            AssertNoRawScalar(controller.RenderedTexts);

            Debug.Log($"[DistributionHubE2E] dispatch — ok={dispatch.Ok} courier={dispatch.ResultId} roster={controller.CurrentCard.roster_band}");
        }

        // A focused guard: the vehicle gate is server-authoritative. A NON-hub card surfaces the neutral hub default
        // (hub_tier_band NONE, roster_band NONE, foot-only) — the hub surface rows do NOT render on it, proving the surface
        // is hub-scoped (and the no-hub vehicle set is foot-only, the server-authoritative lock the selector mirrors).
        [UnityTest]
        public IEnumerator NonHubCard_HasNeutralHubDefault_NoHubRows()
        {
            var controller = NewLocalController();
            yield return SignInController(controller);

            // The refinery is a NON-hub operational building (it is the dispatch source). Its card carries the neutral
            // hub default and renders NO hub surface rows.
            yield return controller.LoadBuilding(dispatchFromId);
            Assert.IsTrue(controller.CardLoaded, $"non-hub (refinery) card loaded (err={controller.CardError})");

            BuildingCardDto card = controller.CurrentCard;
            Assert.AreNotEqual("distribution_hub", card.operational_type, "the control building is NOT a distribution_hub");
            Assert.AreEqual("NONE", card.hub_tier_band, "a non-hub card carries the neutral hub_tier_band NONE");
            Assert.AreEqual("NONE", card.roster_band, "a non-hub card carries the neutral roster_band NONE");
            CollectionAssert.AreEqual(new[] { "FOOT" }, card.available_vehicles,
                "a non-hub card carries the foot-only neutral vehicle set");

            // The hub surface rows + affordances are NOT shown on a non-hub card.
            Assert.IsFalse(controller.HubTierShown, "no hub-tier row on a non-hub card");
            Assert.IsFalse(controller.RosterShown, "no roster row on a non-hub card");
            Assert.IsFalse(controller.VehiclesShown, "no vehicles row on a non-hub card");
            Assert.IsFalse(controller.UpgradeHubTierButtonShown, "no Upgrade-hub-tier button on a non-hub card");
            Assert.IsFalse(controller.VehicleSelectorShown, "no vehicle selector on a non-hub card");

            // R2.2: no raw scalar leaks client-side on the non-hub card either.
            AssertNoRawScalar(controller.RenderedTexts);

            Debug.Log($"[DistributionHubE2E] non-hub control — type={card.operational_type} hub_tier={card.hub_tier_band} roster={card.roster_band}");
        }

        // Screenshot of the distribution_hub card showing the logistics surface. Categorised so it only runs on demand.
        [UnityTest]
        [Category("Screenshot")]
        public IEnumerator CaptureDistributionHubScreenshot()
        {
            var controller = NewLocalController();
            yield return SignInController(controller);

            yield return controller.LoadBuilding(distributionHubId);
            Assert.IsTrue(controller.CardLoaded, $"distribution_hub card loaded (err={controller.CardError})");
            // Wire dispatch ids so the Dispatch affordance is enabled in the shot (the source/destination are set).
            controller.DispatchFromBuildingId = dispatchFromId;
            controller.DispatchToBuildingId = dispatchToId;
            yield return controller.LoadBuilding(distributionHubId);
            Assert.IsTrue(controller.HubTierShown, "hub-tier row shown for the screenshot");
            for (int i = 0; i < 3; i++) yield return null;
            yield return CaptureTo("distribution_hub_card.png");
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
            Debug.Log($"[DistributionHubE2E] screenshot → {path}");
        }
    }
}
