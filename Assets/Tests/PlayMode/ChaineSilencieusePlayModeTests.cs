using NUnit.Framework;
using MafiaCleanCity.Operational;

namespace MafiaCleanCity.CityMap.Tests
{
    // ㉚ — ÉTATS VIDES (passe UX 2026-09-26) : « Nestor » figé (table 64) et le texte de chantier « des maillons existent, mais cet écran ne
    // sait pas encore les afficher » (table 63). Hors réseau.
    //   S1  qui parle : le premier lieutenant SERVI du labo présent au roster ; aucun ⇒ null (la réplique ne s'affiche pas)
    //   S2  la clé de la réplique est FIGÉE à la valeur que le back sert (elle naissait du texte, qui porte désormais {nom})
    //   S3  « rien ne circule » seulement quand TOUS les nœuds servis sont silent (et qu'il y en a)
    [Category("ChaineSilencieuse")]
    public class ChaineSilencieusePlayModeTests
    {
        [Test]
        public void S1_LeLieutenantDuLabo_OuPersonne()
        {
            var roster = new[] { new RosterRow { lieutenant_id = "tull", name = "Lt. Tull" }, new RosterRow { lieutenant_id = "vesk", name = "Lt. Vesk" } };
            Assert.AreEqual("Lt. Vesk", ChaineDApproScreenController.LieutenantDuLabo(roster, new[] { "absent", "vesk" }));
            Assert.IsNull(ChaineDApproScreenController.LieutenantDuLabo(roster, new string[0]), "labo sans lieutenant : personne");
            Assert.IsNull(ChaineDApproScreenController.LieutenantDuLabo(null, new[] { "vesk" }));
        }

        [Test]
        public void S2_LaCleDeLaReplique_EstFigee()
        {
            Assert.AreEqual("appro.bloc.nestor_l_etagere_est_vide_sans_pyralin_je_ne_rallume_pas", ChaineDApproScreenController.CleRepliqueNestor);
        }

        [Test]
        public void S3_RienNeCircule_QuandToutEstSilencieux()
        {
            SupplyChainNodeDto N(string b) => new SupplyChainNodeDto { building_id = "x", bucket = b };
            Assert.IsTrue(ChaineDApproScreenController.ToutSilencieux(new GetSupplyChainGraphResponseDto { nodes = new[] { N("silent"), N("silent") } }));
            Assert.IsFalse(ChaineDApproScreenController.ToutSilencieux(new GetSupplyChainGraphResponseDto { nodes = new[] { N("silent"), N("mild") } }));
            Assert.IsFalse(ChaineDApproScreenController.ToutSilencieux(new GetSupplyChainGraphResponseDto { nodes = new SupplyChainNodeDto[0] }), "vide ≠ silencieux");
            Assert.IsFalse(ChaineDApproScreenController.ToutSilencieux(null));
        }
    }
}
