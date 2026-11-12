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

        /// <summary>L4 (TD-823, BACK-2 C2b @c5837e39) : sur la FICHE d'un site, le `speaker` servi à la racine de `friction/nodes/:id` (6ᵉ clé) est lu ; le lieutenant du site garde la
        /// préférence ; le repli est le `speaker` de la fiche, puis celui de `friction/state` ; jamais une position de liste. CONTRÔLE POSITIF : le corps servi AVEC `speaker` se
        /// désérialise (nom lu), le même corps SANS la clé donne « personne » — la garde voit la clé.</summary>
        [Test]
        public void L4_LaFicheDuSite_LeSpeakerServiALaRacine_EstLeRepli()
        {
            const string corpsAvec = "{\"payload\":{\"data\":{\"output_value_bucket\":\"low\",\"friction_load_bucket\":\"strained\",\"output_to_friction_ratio_bucket\":\"poor\",\"decommission_cost_bucket\":\"cheap\",\"neighbor_count\":2,\"speaker\":{\"id\":\"rin\",\"name\":\"Lt. Rin\"}}}}";
            const string corpsSans = "{\"payload\":{\"data\":{\"output_value_bucket\":\"low\",\"friction_load_bucket\":\"strained\",\"output_to_friction_ratio_bucket\":\"poor\",\"decommission_cost_bucket\":\"cheap\",\"neighbor_count\":2}}}";
            const string corpsNul = "{\"payload\":{\"data\":{\"output_value_bucket\":\"low\",\"friction_load_bucket\":\"strained\",\"output_to_friction_ratio_bucket\":\"poor\",\"decommission_cost_bucket\":\"cheap\",\"neighbor_count\":2,\"speaker\":null}}}";
            GetFrictionNodesResponseDto avec = UnityEngine.JsonUtility.FromJson<GetFrictionNodesEnvelope>(corpsAvec).payload.data;
            GetFrictionNodesResponseDto sans = UnityEngine.JsonUtility.FromJson<GetFrictionNodesEnvelope>(corpsSans).payload.data;
            GetFrictionNodesResponseDto nul = UnityEngine.JsonUtility.FromJson<GetFrictionNodesEnvelope>(corpsNul).payload.data;
            Assert.AreEqual("Lt. Rin", avec.speaker.name, "la 6ᵉ clé servie est lue");
            Assert.AreEqual("Lt. Rin", DemolitionScreenController.LocuteurServiDeLaFiche(avec, null).name, "la fiche d'abord");
            Assert.AreEqual("Lt. Rin", DemolitionScreenController.Locuteur(Roster, null, DemolitionScreenController.LocuteurServiDeLaFiche(avec, null)), "sans lieutenant du site : le speaker de la fiche parle");
            Assert.AreEqual("Lt. Vesk", DemolitionScreenController.Locuteur(Roster, new[] { "vesk" }, DemolitionScreenController.LocuteurServiDeLaFiche(avec, null)), "le lieutenant du site garde la préférence");
            // le repli : la fiche sans nom (clé absente, ou `null` servi) ⇒ le speaker de friction/state ; rien des deux ⇒ personne, jamais le premier du roster
            var etat = new GetFrictionStateResponseDto { speaker = new LocuteurServiDto { id = "tull2", name = "Lt. Tull2" } };
            Assert.AreEqual("Lt. Tull2", DemolitionScreenController.LocuteurServiDeLaFiche(sans, etat).name, "CONTRÔLE POSITIF : clé absente ⇒ repli sur friction/state");
            Assert.AreEqual("Lt. Tull2", DemolitionScreenController.LocuteurServiDeLaFiche(nul, etat).name, "`speaker: null` ⇒ repli sur friction/state");
            Assert.IsNull(DemolitionScreenController.Locuteur(Roster, null, DemolitionScreenController.LocuteurServiDeLaFiche(sans, null)), "ni fiche ni état : personne (jamais « Lt. Tull », premier du roster)");
            Assert.IsNull(DemolitionScreenController.Locuteur(Roster, null, DemolitionScreenController.LocuteurServiDeLaFiche(null, null)));
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
