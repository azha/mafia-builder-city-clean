using NUnit.Framework;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Shell;

namespace MafiaCleanCity.Operational.Tests
{
    // « OUVRIR » NE PART JAMAIS AVEC "" (f2 26/09 ; B3-d du suivi ⊥ de l'UX : un bâtiment ACHETÉ est servi operational_type = "",
    // et convert rendait 422). Forme G du lot back « achat-ouvrable » (lot/achat-ouvrable 6b6d7a5a) : purchased_type (toujours
    // présent) et convertible_types (le prédicat des gardes de convert ; [] une fois converti). Tests PURS, hors réseau.
    //   O1  corps brut : champs lus, présence vue ; back antérieur ⇒ absence vue (fiche ET me/buildings)
    //   O2  servis : le type ACHETÉ s'il est ouvrable ; liste vide (converti) ⇒ rien ; hors liste (relais hors du port) ⇒ rien
    //   O3  back antérieur : operational_type s'il existe (d'avant) ; "" ⇒ rien, jamais ""
    [Category("FicheBatiment")]
    public class FicheOuvrablePlayModeTests
    {
        private static string Fiche(string champs) =>
            "{\"payload\":{\"data\":{\"building\":\"b-1\",\"operational_type\":\"\"" + champs + "}}}";

        [Test]
        public void O1_LeCorpsBrut_ChampsEtPresence()
        {
            BuildingCardDto f = BuildingCardClient.LireFiche(Fiche(",\"purchased_type\":\"distribution_hub\",\"convertible_types\":[\"distribution_hub\",\"lab\"]"));
            Assert.IsTrue(f.TypesOuvrablesServis);
            Assert.AreEqual("distribution_hub", f.purchased_type);
            CollectionAssert.AreEqual(new[] { "distribution_hub", "lab" }, f.convertible_types);
            Assert.IsFalse(BuildingCardClient.LireFiche(Fiche("")).TypesOuvrablesServis, "back antérieur : absent");

            MesBatimentsData m = MesBatimentsClient.LireCorps("{\"payload\":{\"data\":{\"buildings\":[{\"building\":\"b-1\","
                + "\"operational_type\":\"\",\"purchased_type\":\"dealer_spot_front\",\"convertible_types\":[\"dealer_spot_front\"]}]}}}");
            Assert.IsTrue(m.buildings[0].TypesOuvrablesServis);
            Assert.AreEqual("dealer_spot_front", m.buildings[0].purchased_type);
            Assert.IsFalse(MesBatimentsClient.LireCorps("{\"payload\":{\"data\":{\"buildings\":[{\"building\":\"b-1\"}]}}}")
                .buildings[0].TypesOuvrablesServis);
        }

        [Test]
        public void O2_Servis_LeTypeAchete_SIlEstOuvrable()
        {
            var achete = new BuildingCardDto { operational_type = "", purchased_type = "dealer_spot_front",
                convertible_types = new[] { "dealer_spot_front", "lab" }, TypesOuvrablesServis = true };
            Assert.AreEqual("dealer_spot_front", BuildingCardController.TypeAOuvrir(achete), "B3-d : le coin de vente acheté s'ouvre");
            var converti = new BuildingCardDto { operational_type = "lab", purchased_type = "lab",
                convertible_types = new string[0], TypesOuvrablesServis = true };
            Assert.IsNull(BuildingCardController.TypeAOuvrir(converti), "déjà converti : le geste est retiré");
            var horsPort = new BuildingCardDto { operational_type = "", purchased_type = "distribution_hub",
                convertible_types = new[] { "lab", "stash" }, TypesOuvrablesServis = true };
            Assert.IsNull(BuildingCardController.TypeAOuvrir(horsPort), "un relais hors du port ou des cheminées : pas d'autre type choisi");
        }

        [Test]
        public void O3_BackAnterieur_JamaisVide()
        {
            Assert.AreEqual("lab", BuildingCardController.TypeAOuvrir(new BuildingCardDto { operational_type = "lab" }));
            Assert.IsNull(BuildingCardController.TypeAOuvrir(new BuildingCardDto { operational_type = "" }), "jamais \"\"");
            Assert.IsNull(BuildingCardController.TypeAOuvrir(null));
        }
    }
}
