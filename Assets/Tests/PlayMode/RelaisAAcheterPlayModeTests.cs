using System.Collections.Generic;
using NUnit.Framework;
using MafiaCleanCity.CityMap;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Operational.Distribution;

namespace MafiaCleanCity.Operational.Tests
{
    // ㉘ — LE GESTE « ACHETER UN RELAIS » (f2 26/09, table 71). Purs, hors réseau.
    //   R1  le bloc se cherche dans un district où un relais peut S'OUVRIR (profil servi tidewater | stack — TD-762), dans l'ordre servi
    //   R2  un relais acheté et pas encore ouvert (purchased_type servi, operational_type vide) ⇒ on ne repropose pas l'achat
    [Category("EcranDistribution")]
    public class RelaisAAcheterPlayModeTests
    {
        [Test]
        public void R1_SeulementOuUnRelaisSOuvre()
        {
            var districts = new List<DistrictDto>
            {
                new DistrictDto { id = 16, profile = "verge" },
                new DistrictDto { id = 3, profile = "stack" },
                new DistrictDto { id = 9, profile = "glass" },
                new DistrictDto { id = 1, profile = "tidewater" },
                null,
            };
            CollectionAssert.AreEqual(new[] { 3, 1 }, RelaisAAcheter.QuartiersOuvrables(districts), "le port et les cheminées, dans l'ordre servi");
            CollectionAssert.IsEmpty(RelaisAAcheter.QuartiersOuvrables(null));
        }

        [Test]
        public void R2_UnRelaisAchete_NeSeRachetePas()
        {
            Assert.IsTrue(RelaisAAcheter.DejaUnRelaisAOuvrir(new[]
                { new BatimentPossedeDto { building = "b", operational_type = "", purchased_type = "distribution_hub" } }));
            Assert.IsFalse(RelaisAAcheter.DejaUnRelaisAOuvrir(new[]
                { new BatimentPossedeDto { building = "b", operational_type = "", purchased_type = "lab" } }), "un autre usage acheté");
            Assert.IsFalse(RelaisAAcheter.DejaUnRelaisAOuvrir(new[]
                { new BatimentPossedeDto { building = "b", operational_type = "lab" } }), "back antérieur : rien d'acheté vu");
            Assert.IsFalse(RelaisAAcheter.DejaUnRelaisAOuvrir(null));
        }
    }
}
