using NUnit.Framework;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Operational.Lieutenant;

namespace MafiaCleanCity.CityMap.Tests
{
    // ㉝ — NOMS FIGÉS (passe UX 2026-09-26, table 64) : « Dima » parlait quatre fois, nom inventé. Qui parle = un lieutenant RÉEL du roster
    // servi ; personne ⇒ la réplique ne s'affiche pas. Et l'état où RIEN ne se gêne (table 63). Hors réseau, roster mesuré (corps/007).
    //   L1  le lieutenant du site s'il est au roster, sinon le locuteur SERVI (TD-823) ; jamais le premier du roster ; « Dima » n'existe plus
    //   L2  ni site au roster ni locuteur servi ⇒ null (aucune ligne)
    //   L3  « léger » = bande light ET zéro nœud ET aucune pénalité — le joueur neuf ; tout écart le fait tomber
    [Category("LocuteurReel")]
    public class LocuteurReelPlayModeTests
    {
        private static readonly RosterRow[] Roster =
        {
            new RosterRow { lieutenant_id = "tull", name = "Lt. Tull" }, new RosterRow { lieutenant_id = "vesk", name = "Lt. Vesk" },
        };

        private static readonly LocuteurServiDto Servi = new LocuteurServiDto { id = "rin", name = "Lt. Rin" };

        /// <summary>L1 (TD-823) : le lieutenant du site s'il est au roster ; sinon le locuteur SERVI (`speaker`). CONTRÔLE POSITIF : le roster
        /// n'est PLUS un repli — sans site ni `speaker`, « Lt. Tull » (premier du roster) ne parle pas.</summary>
        [Test]
        public void L1_LeLieutenantDuSite_SinonLeLocuteurServi_JamaisLePremierDuRoster()
        {
            Assert.AreEqual("Lt. Vesk", DemolitionScreenController.Locuteur(Roster, new[] { "vesk" }, Servi), "le site d'abord");
            Assert.AreEqual("Lt. Rin", DemolitionScreenController.Locuteur(Roster, null, Servi), "sans site : le locuteur servi");
            Assert.AreEqual("Lt. Rin", DemolitionScreenController.Locuteur(Roster, new[] { "absent" }, Servi), "id hors roster : le locuteur servi");
            Assert.IsNull(DemolitionScreenController.Locuteur(Roster, null, null), "CONTRÔLE : sans `speaker`, le premier du roster ne parle PLUS");
            Assert.IsNull(DemolitionScreenController.Locuteur(Roster, null, new LocuteurServiDto()),
                "`speaker: null` servi (JsonUtility : instance vide) ⇒ personne");
        }

        [Test]
        public void L2_SansRosterNiLocuteurServi_PersonneNeParle()
        {
            Assert.IsNull(DemolitionScreenController.Locuteur(null, new[] { "vesk" }, null));
            Assert.IsNull(DemolitionScreenController.Locuteur(new RosterRow[0], null, null));
            Assert.IsNull(DemolitionScreenController.Locuteur(new[] { new RosterRow { lieutenant_id = "x", name = " " } }, new[] { "x" }, null));
            Assert.AreEqual("Lt. Rin", DemolitionScreenController.Locuteur(null, new[] { "vesk" }, Servi), "roster absent : le locuteur servi");
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
