using System.Collections;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using MafiaCleanCity.CityMap;

namespace MafiaCleanCity.CityMap.Tests
{
    // E2E (charter 27: no mock). Drives the real CityMapController, signs in, then opens
    // the district detail panel and asserts it aggregated multiple live system projections.
    //
    // PREREQUISITE: run `node Tools/seed_citymap_demo.mjs` (district 3 → BURNING heat).
    public class CityMapDetailPlayModeTests
    {
        private GameObject controllerGo;

        [TearDown]
        public void TearDown()
        {
            if (controllerGo != null) Object.Destroy(controllerGo);
        }

        [UnityTest]
        public IEnumerator SelectDistrict_AggregatesLiveProjections_IntoDetailPanel()
        {
            controllerGo = new GameObject("CityMapController");
            CityMapController controller = controllerGo.AddComponent<CityMapController>();

            float elapsed = 0f;
            while (!controller.HeatLoaded && controller.LastError == null && controller.AuthError == null && elapsed < 25f)
            {
                elapsed += Time.deltaTime;
                yield return null;
            }
            Assert.IsTrue(controller.IsAuthenticated, $"signed in (authErr={controller.AuthError})");

            controller.SelectDistrict(3);

            elapsed = 0f;
            while (!controller.DetailLoaded && elapsed < 20f)
            {
                elapsed += Time.deltaTime;
                yield return null;
            }
            Assert.IsTrue(controller.DetailLoaded, "detail finished loading");

            DistrictDetail d = controller.CurrentDetail;
            Assert.IsNotNull(d, "detail built");
            Assert.AreEqual(3, d.districtId, "detail is for the selected district");
            Assert.AreEqual(3, controller.SelectedDistrictId);
            Assert.Greater(d.rows.Count, 10, "rich panel aggregates many projection rows");

            // District facts.
            Assert.IsTrue(d.rows.Any(r => r.label == "Control"), "control_state row present");

            // Heat — the seeded BURNING value, surfaced through the authenticated projection.
            DetailRow heat = d.rows.First(r => r.label == "Heat — district");
            Assert.IsTrue(heat.available, "heat available");
            Assert.AreEqual("BURNING", heat.value, "district 3 seeded BURNING");

            // Flow returns data even for a lightly-advanced player.
            DetailRow flow = d.rows.First(r => r.label == "Flow backpressure");
            Assert.IsTrue(flow.available, "flow projection returned data");
            Assert.IsFalse(string.IsNullOrEmpty(flow.value), "flow has a backpressure band");

            // Police belief (precinct-derived) is wired too.
            Assert.IsTrue(d.rows.Any(r => r.label.StartsWith("Police belief")), "belief row present");

            // Honest n/a: at least one cadence-gated projection (e.g. cohesion) shown unavailable.
            Assert.IsTrue(d.rows.Any(r => !r.available), "gated projection rendered as n/a");

            // Close.
            controller.HideDetail();
            Assert.AreEqual(-1, controller.SelectedDistrictId, "panel closed");
        }
    }
}
