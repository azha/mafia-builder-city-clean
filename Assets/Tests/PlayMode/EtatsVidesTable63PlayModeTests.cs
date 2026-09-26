using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using MafiaCleanCity.CityMap;
using MafiaCleanCity.I18n;

namespace MafiaCleanCity.Shell.Tests
{
    // ÉTATS VIDES — table 63 v2 de l'atelier (2026-09-26, client 34beb6e7), colonne « quand » à la lettre, écrans de CLIENT-1.
    //   B1  ① BLANCHIR, planque vide : une planque qui tient de l'argent passe avant une vide ; toutes vides ⇒ la vide, DÉCLARÉE vide
    //   B2  ① le mot : repli à l'octet de la table (espace insécable avant « : »), clé dérivée = la clé de la table
    [Category("EtatsVides")]
    public class EtatsVidesTable63PlayModeTests
    {
        [TearDown] public void TearDown() => I18nCatalog.Oublier();

        private static SafehouseDto P(string id, string charge) => new SafehouseDto { safehouse_id = id, load_bucket = charge };

        [Test]
        public void B1_ChoisirPlanque_LaPleinePasseAvantLaVide_ToutesVides_Declaree()
        {
            Assert.AreEqual(("b", false), DistrictInteriorScreenController.ChoisirPlanque(new[] { P("a", "EMPTY"), P("b", "LOW"), P("c", "FULL") }),
                "une planque qui tient de l'argent passe avant une vide");
            Assert.AreEqual(("a", true), DistrictInteriorScreenController.ChoisirPlanque(new[] { P("a", "EMPTY"), P("z", "EMPTY") }),
                "toutes vides : la première, déclarée vide");
            Assert.AreEqual(((string)null, false), DistrictInteriorScreenController.ChoisirPlanque(new SafehouseDto[0]), "aucune planque");
            Assert.AreEqual(("n", false), DistrictInteriorScreenController.ChoisirPlanque(new[] { null, P("", "LOW"), P("n", "NOMINAL") }),
                "entrées sans identifiant ignorées");
        }

        /// <summary>§G P4 (passe UX, 26/09) — COLLECTER, le bouton principal, n'est actif que s'il y a de quoi ramasser.</summary>
        [Test]
        public void C1_Collecter_ActifSeulementSIlYADeQuoiRamasser()
        {
            var hote = new UnityEngine.GameObject("District_C1", typeof(UnityEngine.RectTransform));
            try
            {
                var ecran = hote.AddComponent<DistrictInteriorScreenController>();
                DistrictInteriorBuildingDto B(string id, string recolte) => new DistrictInteriorBuildingDto
                {
                    building = id, block_id = 0, operational_type = "dealer_spot_front", conversion_band = "OPERATIONAL", shell_state = "STANDING",
                    condition_band = "SOUND", revenue_band = "IDLE", revenue_chain = "UNWIRED", activity_band = "IDLE", harvest_band = recolte,
                    lapse_phase_bucket = "WITHIN_WINDOW", maintenance_in_progress = false, lieutenant_ids = new string[0],
                };
                var rien = B("b-rien", "NOTHING");
                ecran.Render(new DistrictInteriorDto
                {
                    district = "district-1", district_id = 1, profile = "lattice", name_canonical = "Test", bank_side = "north",
                    grid = new DistrictInteriorGridDto { width = 1, height = 1 }, day_phase = "NIGHT",
                    blocks = new[] { new DistrictInteriorBlockDto { block_id = 0, x = 0, y = 0 } }, buildings = new[] { rien },
                });
                ecran.OuvrirFiche(rien);
                Assert.IsFalse(ecran.FicheCollecterActif, "« Rien » à collecter : COLLECTER n'est pas actif");
                var bouton = ecran.ScreenRoot.GetComponentsInChildren<UnityEngine.UI.Button>(true).First(x => x.gameObject.name == "Btn_COLLECTER");
                Assert.AreEqual(DistrictInteriorScreenController.CollecterEstompe, bouton.GetComponent<UnityEngine.CanvasGroup>().alpha, 0.001f, "estompé");
                foreach (string plein in new[] { "AVAILABLE", "FULL" })
                {
                    ecran.OuvrirFiche(B("b-" + plein, plein));
                    Assert.IsTrue(ecran.FicheCollecterActif, $"{plein} : COLLECTER actif");
                    Assert.AreEqual(1f, bouton.GetComponent<UnityEngine.CanvasGroup>().alpha, 0.001f, $"{plein} : plein");
                }
                ecran.OuvrirFiche(rien);
                Assert.IsFalse(ecran.FicheCollecterActif, "et redevient inactif (réversible)");
                if (ecran.ScreenRoot != null) UnityEngine.Object.DestroyImmediate(ecran.ScreenRoot.gameObject);
            }
            finally { UnityEngine.Object.DestroyImmediate(hote); }
        }

        [Test]
        public void B2_PlanqueVide_LeMotDeLaTable63()
        {
            I18nCatalog.Oublier();
            Assert.AreEqual("Rien à blanchir : la planque est vide.", DistrictInteriorScreenController.MessagePlanqueVide(),
                "repli à l'octet de la table 63 (espace insécable avant « : »)");
            I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string> { { "building.vide.rien_a_blanchir_la_planque_est_vide", "§vide" } });
            Assert.AreEqual("§vide", DistrictInteriorScreenController.MessagePlanqueVide(), "la clé dérivée EST la clé de la table");
        }
    }
}
