using NUnit.Framework;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Shell;

namespace MafiaCleanCity.CityMap.Tests
{
    // ㉘ — ÉTAT VIDE FAUX (passe UX 2026-09-26, table 63) : sans relais possédé, l'écran disait « La distribution n'a pas répondu » + une
    // phrase de développeur. La réponse est VIDE, pas une erreur. Hors réseau, kit mesuré (corps/006 : aucun distribution_hub).
    //   R1  le kit mesuré n'a pas de relais ⇒ null (l'état vide de la table 63) ; un relais possédé ⇒ lui
    [Category("SansRelais")]
    public class SansRelaisPlayModeTests
    {
        private static BatimentPossedeDto B(string id, string type) => new BatimentPossedeDto { building = id, operational_type = type };

        [Test]
        public void R1_LeRelais_OuRien()
        {
            var kit = new[] { B("lab", "lab"), B("stash", "stash"), B("front", "front_shop"), B("safe", "cash_safehouse") };
            Assert.IsNull(DistributionScreenController.PremierRelais(kit), "le kit mesuré : aucun relais");
            Assert.AreEqual("hub", DistributionScreenController.PremierRelais(new[] { B("lab", "lab"), B("hub", "distribution_hub") })?.building);
            Assert.IsNull(DistributionScreenController.PremierRelais(null));
        }
    }
}
