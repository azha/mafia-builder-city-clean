using System.Collections.Generic;
using NUnit.Framework;
using MafiaCleanCity.CitySim.Precinct;
using MafiaCleanCity.Shell;

namespace MafiaCleanCity.CityMap.Tests
{
    // ⑰ — ÉTAT VIDE FAUX (passe UX 2026-09-26) : l'écran lisait le commissariat « 1 » EN DUR ; le joueur neuf mesuré est au 6. Le
    // commissariat du joueur se tire des données SERVIES : le district de son premier bâtiment (`me/buildings`), puis le `precinct_id`
    // que `world/districts` sert pour ce district. Hors réseau.
    //   P1  le kit à La Lisière (16) ⇒ le précinct SERVI de 16 (6), jamais 1
    //   P2  rien possédé, ou district absent de la liste servie ⇒ -1 (l'écran ne lit alors AUCUN commissariat au hasard)
    [Category("CommissariatDuJoueur")]
    public class CommissariatDuJoueurPlayModeTests
    {
        private static List<DistrictDto> Monde() => new List<DistrictDto>
        {
            new DistrictDto { id = 1, precinct_id = 1 }, new DistrictDto { id = 16, precinct_id = 6 },
        };

        [Test]
        public void P1_LeKitALaLisiere_DonneLePrecinctServi()
        {
            var kit = new[] { new BatimentPossedeDto { building = "lab", district_id = 16 }, new BatimentPossedeDto { building = "safe", district_id = 16 } };
            int quartier = PrecinctDuJoueur.QuartierDuJoueur(kit);
            Assert.AreEqual(16, quartier);
            Assert.AreEqual(6, PrecinctDuJoueur.PrecinctServi(Monde(), quartier), "le précinct SERVI du district du kit — jamais « 1 »");
        }

        [Test]
        public void P2_RienDeServi_RienDeLu()
        {
            Assert.AreEqual(-1, PrecinctDuJoueur.QuartierDuJoueur(null));
            Assert.AreEqual(-1, PrecinctDuJoueur.QuartierDuJoueur(new BatimentPossedeDto[0]));
            Assert.AreEqual(-1, PrecinctDuJoueur.PrecinctServi(Monde(), 9), "district absent de la liste servie");
            Assert.AreEqual(-1, PrecinctDuJoueur.PrecinctServi(null, 16));
        }
    }
}
