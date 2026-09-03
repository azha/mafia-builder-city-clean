using System.Collections;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using MafiaCleanCity.CityMap;
using MafiaCleanCity.Tests; // SeederSupport — self-seed the gradient this fixture asserts

namespace MafiaCleanCity.CityMap.Tests
{
    // E2E (charter 27: no mock). Real sign-in against game-back + the JWT-gated Heat
    // projection, consumed by the real CityMapController. Hits the live dockerized stack.
    //
    // SELF-SEEDS its precondition: OneTimeSetUp runs `node Tools/seed_citymap_demo.mjs`, which
    // seeds the stable demo player (citymap_demo@example.test) + heated buildings and advances
    // one tick, landing the deterministic gradient: district 3 BURNING, 7 HOT, 11 WARM, rest
    // COLD. The test OWNS its precondition (rather than relying on an external manual seed run),
    // so the full PlayMode assembly is order-independent. The operational concern runs on a
    // DISTINCT player (operational_demo) on its own heat-coupled city, so it never washes this
    // gradient. (See SeederSupport.)
        // ⚠️ DEUX catégories, et c'est l'UNION du merge du 2026-09-03 : le chantier C a posé
        // `ScreenCarte` (ces suites ne tournaient sous AUCUN filtre — TD-490), le lot « ville
        // peinte » a posé `CarteVille` pour la même raison, chacun sans voir l'autre. NUnit accepte
        // les deux attributs ; en garder UNE SEULE rendrait la suite invisible au filtre de l'autre
        // lot — et un test qu'aucun filtre n'atteint ne rougit jamais.
        [Category("ScreenCarte")]
        [Category("CarteVille")]
    public class CityMapHeatPlayModeTests
    {
        private const string DemoIdentifier = "citymap_demo@example.test";
        private const string DemoPassword = "citymap-demo-pw";

        private GameObject controllerGo;

        [OneTimeSetUp]
        public void SeedCityMapGradient()
        {
            // Re-seed the d3 BURNING / d7 HOT / d11 WARM gradient this fixture asserts, so it is
            // deterministic regardless of whether the operational seeder ran before this test.
            SeederSupport.RunSeeder(SeederSupport.CityMapSeeder, SeederSupport.CityMapMarker);
        }

        [TearDown]
        public void TearDown()
        {
            if (controllerGo != null) Object.Destroy(controllerGo);
        }

        [UnityTest]
        public IEnumerator Signin_LiveBackend_ReturnsBearerToken()
        {
            var auth = new AuthClient();
            string token = null;
            string error = null;
            yield return auth.SignIn(DemoIdentifier, DemoPassword, t => token = t, e => error = e);

            Assert.IsNull(error, $"sign-in errored: {error}");
            Assert.IsFalse(string.IsNullOrEmpty(token), "expected a Bearer access_token");
            // HS256 JWT → three dot-separated segments.
            Assert.AreEqual(3, token.Split('.').Length, "access_token is a well-formed JWT");
        }

        [UnityTest]
        public IEnumerator Heat_WithoutToken_Is401()
        {
            var client = new WorldApiClient();
            DistrictHeatDto heat = null;
            string error = null;
            yield return client.GetDistrictHeat(3, null, h => heat = h, e => error = e);

            Assert.IsNull(heat, "no projection should be returned unauthenticated");
            Assert.IsNotNull(error, "unauthenticated heat fetch must error");
            StringAssert.Contains("401", error, "unauthenticated heat fetch is rejected 401");
        }

        [UnityTest]
        public IEnumerator CityMap_SignsIn_AndOverlaysHeatGradient()
        {
            controllerGo = new GameObject("CityMapController");
            CityMapController controller = controllerGo.AddComponent<CityMapController>();

            // Wait for districts → sign-in → per-district heat fetch to finish.
            float elapsed = 0f;
            while (!controller.HeatLoaded && controller.LastError == null && controller.AuthError == null && elapsed < 25f)
            {
                elapsed += Time.deltaTime;
                yield return null;
            }

            Assert.IsNull(controller.LastError, $"districts load errored: {controller.LastError}");
            Assert.IsNull(controller.AuthError, $"auth errored: {controller.AuthError}");
            Assert.IsTrue(controller.IsAuthenticated, "controller signed in");
            Assert.IsTrue(controller.HeatLoaded, "heat overlay finished loading");
            Assert.AreEqual(18, controller.Cells.Count, "all 18 district cells present");

            // The deterministic seeded gradient (Tools/seed_citymap_demo.mjs).
            Assert.AreEqual(HeatBucket.Burning, HeatOf(controller, 3), "district 3 seeded BURNING");
            Assert.AreEqual(HeatBucket.Hot, HeatOf(controller, 7), "district 7 seeded HOT");
            Assert.AreEqual(HeatBucket.Warm, HeatOf(controller, 11), "district 11 seeded WARM");
            Assert.AreEqual(HeatBucket.Cold, HeatOf(controller, 1), "district 1 has no buildings → COLD");

            // Toggle: badges hide/show via the public overlay API.
            DistrictCellView hot = CellFor(controller, 3);
            Assert.IsTrue(hot.HeatBadge.activeSelf, "heat badge visible by default");
            controller.SetHeatOverlay(false);
            Assert.IsFalse(hot.HeatBadge.activeSelf, "toggle OFF hides the heat badge");
            controller.SetHeatOverlay(true);
            Assert.IsTrue(hot.HeatBadge.activeSelf, "toggle ON shows the heat badge again");
        }

        private static DistrictCellView CellFor(CityMapController c, int districtId) =>
            c.Cells.First(cell => cell.Model.id == districtId);

        private static HeatBucket HeatOf(CityMapController c, int districtId) =>
            CellFor(c, districtId).Heat;
    }
}
