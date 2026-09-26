using System.Collections.Generic;
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
