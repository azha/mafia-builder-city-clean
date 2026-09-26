using NUnit.Framework;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Operational.Lieutenant;

namespace MafiaCleanCity.CityMap.Tests
{
    // ㉝ — NOMS FIGÉS (passe UX 2026-09-26, table 64) : « Dima » parlait quatre fois, nom inventé. Qui parle = un lieutenant RÉEL du roster
    // servi ; personne ⇒ la réplique ne s'affiche pas. Et l'état où RIEN ne se gêne (table 63). Hors réseau, roster mesuré (corps/007).
    //   L1  le lieutenant du site s'il est au roster, sinon le premier du roster ; « Dima » n'existe plus
    //   L2  roster absent ou vide ⇒ null (aucune ligne)
    //   L3  « léger » = bande light ET zéro nœud ET aucune pénalité — le joueur neuf ; tout écart le fait tomber
    [Category("LocuteurReel")]
    public class LocuteurReelPlayModeTests
    {
        private static readonly RosterRow[] Roster =
        {
            new RosterRow { lieutenant_id = "tull", name = "Lt. Tull" }, new RosterRow { lieutenant_id = "vesk", name = "Lt. Vesk" },
        };

        [Test]
        public void L1_LeLieutenantDuSite_SinonLePremierDuRoster()
        {
            Assert.AreEqual("Lt. Vesk", DemolitionScreenController.Locuteur(Roster, new[] { "vesk" }));
            Assert.AreEqual("Lt. Tull", DemolitionScreenController.Locuteur(Roster, null));
            Assert.AreEqual("Lt. Tull", DemolitionScreenController.Locuteur(Roster, new[] { "absent" }), "id hors roster : le premier");
        }

        [Test]
        public void L2_SansRoster_PersonneNeParle()
        {
            Assert.IsNull(DemolitionScreenController.Locuteur(null, new[] { "vesk" }));
            Assert.IsNull(DemolitionScreenController.Locuteur(new RosterRow[0], null));
            Assert.IsNull(DemolitionScreenController.Locuteur(new[] { new RosterRow { lieutenant_id = "x", name = " " } }, null));
        }

        [Test]
        public void L3_Leger_SeulementQuandRienNeSeGene()
        {
            Assert.IsTrue(DemolitionScreenController.EstLeger(new GetFrictionStateResponseDto { friction_bucket = "light", friction_node_count = 0 }));
            Assert.IsFalse(DemolitionScreenController.EstLeger(new GetFrictionStateResponseDto { friction_bucket = "light", friction_node_count = 1 }));
            Assert.IsFalse(DemolitionScreenController.EstLeger(new GetFrictionStateResponseDto { friction_bucket = "balanced", friction_node_count = 0 }));
            Assert.IsFalse(DemolitionScreenController.EstLeger(new GetFrictionStateResponseDto { friction_bucket = "light", penalty_active = true }));
            Assert.IsFalse(DemolitionScreenController.EstLeger(null));
        }
    }
}
