using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.CityMap;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.CityMap.Tests
{
    // Revue ⊥ r4 (BLOCKING A) — la garde d'ORDRE que quatre tours de gardes pixel ne pouvaient pas
    // voir : l'occultation d'un débordement par le sol d'une cellule voisine est une propriété de
    // FRATRIE, pas de couleur. R4F1 l'asserte structurellement ; R4F2 asserte l'indice de contour
    // qui adosse le carve-out fond↔b0 de R3F1 (un carve-out sans garde de remplacement est un trou).
    [Category("W3U2")]
    public class DistrictInteriorFloorOrderPlayModeTests
    {
        private GameObject hostGo;

        [TearDown]
        public void TearDown()
        {
            if (hostGo != null)
            {
                var d = hostGo.GetComponent<DistrictInteriorScreenController>();
                if (d != null && d.ScreenRoot != null)
                {
                    Canvas c = d.ScreenRoot.GetComponentInParent<Canvas>();
                    if (c != null) Object.Destroy(c.gameObject);
                }
                Object.Destroy(hostGo);
            }
        }

        private static DistrictInteriorDto DtoAvecVoisins() => new DistrictInteriorDto
        {
            district = "district-1",
            district_id = 1,
            profile = "lattice",
            name_canonical = "Test",
            bank_side = "north",
            grid = new DistrictInteriorGridDto { width = 3, height = 1 },
            blocks = new[]
            {
                new DistrictInteriorBlockDto { block_id = 1, x = 0, y = 0 },
                new DistrictInteriorBlockDto { block_id = 2, x = 1, y = 0 },
                new DistrictInteriorBlockDto { block_id = 3, x = 2, y = 0 },
            },
            buildings = new[]
            {
                new DistrictInteriorBuildingDto
                {
                    block_id = 1, operational_type = "lab", condition_band = "SOUND",
                    revenue_chain = "UNWIRED", revenue_band = "IDLE", activity_band = "IDLE",
                    lapse_phase_bucket = "WITHIN_WINDOW", maintenance_in_progress = false,
                    lieutenant_ids = new string[0],
                },
            },
            day_phase = "NIGHT",
        };

        [UnityTest]
        public IEnumerator R4F1_NoFloorImageEverSitsAboveABuildingSprite()
        {
            hostGo = new GameObject("FloorOrder_R4F1");
            var d = hostGo.AddComponent<DistrictInteriorScreenController>();
            d.Render(DtoAvecVoisins());
            yield return null;

            Transform gridArea = d.ScreenRoot.Find("GridArea");
            Assert.IsNotNull(gridArea, "GridArea absent");
            Transform floors = gridArea.Find("GridFloors");
            Assert.IsNotNull(floors, "GridFloors absent — les sols doivent vivre HORS des cellules");
            Assert.AreEqual(3, floors.childCount, "anti-vacuité : les 3 sols du payload existent");

            // la propriété d'ordre : TOUT sol précède TOUT BuildingSprite dans la fratrie effective
            int idxFloors = floors.GetSiblingIndex();
            bool spriteTrouve = false;
            foreach (Transform enfant in gridArea)
            {
                Transform sprite = enfant.Find("BuildingSprite");
                if (sprite != null)
                {
                    spriteTrouve = true;
                    Assert.Greater(enfant.GetSiblingIndex(), idxFloors,
                        $"la cellule '{enfant.name}' (porteuse d'un BuildingSprite) est dessinée AVANT GridFloors — " +
                        "son débordement serait mangé par un sol.");
                }
            }
            Assert.IsTrue(spriteTrouve, "anti-vacuité : le payload porte un bâtiment, un BuildingSprite doit exister");

            // et plus aucune cellule ne porte d'Image de sol sur elle-même
            foreach (Transform enfant in gridArea)
                if (enfant.name.StartsWith("Cell_"))
                    Assert.IsNull(enfant.GetComponent<Image>(),
                        $"'{enfant.name}' porte encore une Image (sol) — les cellules doivent être des conteneurs transparents.");
        }

        [UnityTest]
        public IEnumerator R4F2_DistrictContourCue_ExistsAndIsFirst()
        {
            hostGo = new GameObject("FloorOrder_R4F2");
            var d = hostGo.AddComponent<DistrictInteriorScreenController>();
            d.Render(DtoAvecVoisins());
            yield return null;

            Transform gridArea = d.ScreenRoot.Find("GridArea");
            Transform bord = gridArea.Find("GridBorder");
            Assert.IsNotNull(bord, "GridBorder absent — c'est l'indice qui adosse le carve-out fond↔b0 de R3F1");
            Assert.AreEqual(0, bord.GetSiblingIndex(), "le liseré vit DERRIÈRE tout (index 0)");
            Assert.IsNotNull(bord.GetComponent<Image>(), "le liseré est un rendu réel, pas un nœud vide");
        }
    }
}
