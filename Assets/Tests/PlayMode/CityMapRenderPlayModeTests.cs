using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using MafiaCleanCity.CityMap;

namespace MafiaCleanCity.CityMap.Tests
{
    // E2E (charter 27: no mock). Drives the real CityMapController, which builds
    // its own Canvas + UI and fetches the live backend. Asserts the rendered
    // cells match the contract: 18 districts, grouped by bank, coloured by state.
    [Category("ScreenCarte")]
    public class CityMapRenderPlayModeTests
    {
        private GameObject controllerGo;

        [TearDown]
        public void TearDown()
        {
            if (controllerGo != null) Object.Destroy(controllerGo);
        }

        [UnityTest]
        public IEnumerator CityMap_BuildsAndRenders_18Cells_GroupedByBank_ColouredByState()
        {
            controllerGo = new GameObject("CityMapController");
            CityMapController controller = controllerGo.AddComponent<CityMapController>();

            // Start() runs next frame; wait for the live fetch to finish (or error).
            float elapsed = 0f;
            while (!controller.IsLoaded && controller.LastError == null && elapsed < 15f)
            {
                elapsed += Time.deltaTime;
                yield return null;
            }

            Assert.IsNull(controller.LastError, $"Load errored: {controller.LastError}");
            Assert.IsTrue(controller.IsLoaded, "Controller never finished loading");

            // 18 districts, split across the two banks with nothing dropped.
            Assert.AreEqual(18, controller.Cells.Count, "Expected 18 district cells");
            Assert.AreEqual(18, controller.NorthCount + controller.SouthCount,
                "Every cell must be assigned to a bank");
            Assert.Greater(controller.NorthCount, 0, "North bank should have districts");
            Assert.Greater(controller.SouthCount, 0, "South bank should have districts");

            foreach (DistrictCellView cell in controller.Cells)
            {
                Assert.IsNotNull(cell.Background, "cell missing Image");
                Assert.IsNotNull(cell.Label, "cell missing Text");

                // Bank parsed, and the cell lives under the matching column.
                Assert.AreNotEqual(BankSide.Unknown, cell.Bank,
                    $"district {cell.Model.name_canonical} unparsed bank_side");

                // Control-state overlay: background colour == the palette for the state.
                Assert.AreNotEqual(ControlState.Unknown, cell.State,
                    $"district {cell.Model.name_canonical} unparsed control_state");
                Assert.AreEqual(CityMapEnums.ColorFor(cell.State), cell.Background.color,
                    $"district {cell.Model.name_canonical} colour does not match its control_state");

                // Label carries the district's DISPLAY name — 2026-09-02: the tile now shows the
                // fiction name (`name`, e.g. "La Lisière") in front of the code name, explicit
                // fallback onto `name_canonical` (CityMapEnums.DisplayName — same rule the detail
                // panel title uses). The live backend serves `name` for all 18 districts, so this
                // also exercises the "name present" branch; the fallback branch itself is a pure
                // unit test (CityMapFetchPlayModeTests.DisplayName_FallsBackToNameCanonical...).
                StringAssert.Contains(CityMapEnums.DisplayName(cell.Model), cell.Label.text,
                    "cell label must show the district's display name");
            }
        }
    }
}
