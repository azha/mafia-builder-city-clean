using NUnit.Framework;
using MafiaCleanCity.CityMap;
using MafiaCleanCity.Operational.Selling;
using MafiaCleanCity.Shell;

namespace MafiaCleanCity.CityMap.Tests
{
    // B3 (passe UX 2026-09-24) — ce que ㉟ offre pour que la vente commence. Hors réseau (`PointsDeVente`, pur).
    //   V1  un point de vente possédé SANS dealer est offert ; celui qui en a un ne l'est pas ; un autre type jamais
    //   V2  l'achat n'est offert que sans AUCUN point de vente (et pas quand `me/buildings` n'a pas répondu)
    //   V3  le bloc acheté : le premier bloc du quartier qui ne porte aucun bâtiment ; -1 s'il n'y en a pas ou sans intérieur
    [Category("GestesDeVente")]
    public class GestesDeVentePlayModeTests
    {
        private static BatimentPossedeDto B(string id, string type, int bloc, int quartier = 16) =>
            new BatimentPossedeDto { building = id, operational_type = type, block_id = bloc, district_id = quartier };

        [Test]
        public void V1_UnPointDeVenteSansDealer_EstOffert_EtSeulementLui()
        {
            var possedes = new[] { B("spot-a", "dealer_spot_front", 3), B("spot-b", "dealer_spot_front", 4), B("lab", "lab", 5) };
            var dealers = new[] { new DealerDto { dealer = "d1", dealer_spot_id = "spot-b" } };
            var offerts = PointsDeVente.SansDealer(possedes, dealers);
            Assert.AreEqual(1, offerts.Count);
            Assert.AreEqual("spot-a", offerts[0].building);
            Assert.AreEqual(3, offerts[0].block_id, "la tuile couverte sera son propre bloc");
            Assert.IsEmpty(PointsDeVente.SansDealer(null, null), "rien lu : rien offert");
        }

        [Test]
        public void V2_LAchat_NEstOffert_QueSansAucunPointDeVente()
        {
            Assert.IsTrue(PointsDeVente.AucunPointDeVente(new[] { B("lab", "lab", 5), B("safe", "cash_safehouse", 6) }), "le kit mesuré (corps/006)");
            Assert.IsFalse(PointsDeVente.AucunPointDeVente(new[] { B("spot", "dealer_spot_front", 3) }));
            Assert.IsFalse(PointsDeVente.AucunPointDeVente(null), "`me/buildings` sans réponse : on n'offre pas un achat à l'aveugle");
            Assert.AreEqual(16, PointsDeVente.QuartierDAchat(new[] { B("lab", "lab", 5, 16) }));
            Assert.AreEqual(-1, PointsDeVente.QuartierDAchat(new BatimentPossedeDto[0]));
        }

        [Test]
        public void V3_LeBlocAchete_EstLePremierBlocSansBatiment()
        {
            var interieur = new DistrictInteriorDto
            {
                blocks = new[] { new DistrictInteriorBlockDto { block_id = 5 }, new DistrictInteriorBlockDto { block_id = 6 }, new DistrictInteriorBlockDto { block_id = 7 } },
                buildings = new[] { new DistrictInteriorBuildingDto { building = "safe", block_id = 6 } },
            };
            Assert.AreEqual(7, PointsDeVente.BlocLibre(interieur, new[] { B("lab", "lab", 5) }), "5 porte le labo (me/buildings), 6 la planque (intérieur)");
            Assert.AreEqual(-1, PointsDeVente.BlocLibre(interieur, new[] { B("lab", "lab", 5), B("x", "stash", 7) }));
            Assert.AreEqual(-1, PointsDeVente.BlocLibre(null, null));
        }
    }
}
