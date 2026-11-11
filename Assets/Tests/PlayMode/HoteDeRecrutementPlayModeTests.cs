using NUnit.Framework;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Operational.Lieutenant;
using MafiaCleanCity.Shell;

namespace MafiaCleanCity.CityMap.Tests
{
    // B7 (passe UX 2026-09-24) puis TD-877 (11/11) — l'hôte ET la cible d'un recrutement sont LUS de `GET lieutenants/host-eligibility` (BACK-2 @30057240), le client
    // ne les devine plus (la table `HoteDeRecrutement` est retirée). Hors réseau : le corps SERVI est fabriqué à la forme du code du back
    // (`host-eligibility.projection.ts` : { archetypes: [ { archetype, eligible_host_building_ids, blocked: [ { building_id, blocked_reason, blocked_reason_i18n } ],
    // valid_target_building_ids } ] } dans l'enveloppe `payload.data`).
    //   H1  la lecture du corps : `null` (pas de cible) et `[]` (une cible, aucun candidat) sont DEUX réponses (PrendUneCible), lues dans le corps brut
    //   H2  l'hôte = le premier éligible SERVI ; COOK n'a pas de cible
    //   H3  une cible = la première servie qui n'est pas l'hôte (le back refuse « cible = source », 409) ; aucune cible servie ⇒ null, rien de deviné
    //   H4  ⑳ (table 63 v2) : le retour d'un recrutement nomme l'archétype par son MOT servi, jamais l'identifiant brut (« COOK recruté. »)
    //   H5  rien de deviné : sans réponse, sans ligne pour l'archétype, sans hôte éligible ⇒ pas d'hôte
    [Category("HoteDeRecrutement")]
    public class HoteDeRecrutementPlayModeTests
    {
        private const string Corps =
            "{\"payload\":{\"data\":{\"archetypes\":[" +
            "{\"archetype\":\"COOK\",\"eligible_host_building_ids\":[\"b-lab\"],\"blocked\":[{\"building_id\":\"b-stash\",\"blocked_reason\":\"NOT_A_LAB\",\"blocked_reason_i18n\":\"k1\"}],\"valid_target_building_ids\":null}," +
            "{\"archetype\":\"LOGISTICS\",\"eligible_host_building_ids\":[\"b-lab\",\"b-stash\"],\"blocked\":[],\"valid_target_building_ids\":[\"b-lab\",\"b-stash\",\"b-front\"]}," +
            "{\"archetype\":\"LAUNDERING\",\"eligible_host_building_ids\":[\"b-front\"],\"blocked\":[],\"valid_target_building_ids\": []}," +
            "{\"archetype\":\"DISTRIBUTION\",\"eligible_host_building_ids\":[],\"blocked\":[{\"building_id\":\"b-lab\",\"blocked_reason\":\"NOT_A_DEALER_SPOT\",\"blocked_reason_i18n\":\"k2\"}],\"valid_target_building_ids\":[\"b-safe\"]}," +
            "{\"archetype\":\"MUSCLE\",\"eligible_host_building_ids\":[\"b-stash\"],\"blocked\":[],\"valid_target_building_ids\": null}" +
            "]}}}";

        private static HostEligibiliteData Servie() => HostEligibilite.LireCorps(Corps);

        [Test]
        public void H1_LaLectureDuCorps_DistingueNullEtTableauVide()
        {
            HostEligibiliteData d = Servie();
            Assert.AreEqual(5, d.archetypes.Length, "les cinq lignes servies");
            Assert.IsFalse(d.archetypes[0].PrendUneCible, "COOK : valid_target_building_ids null ⇒ pas de cible");
            Assert.IsTrue(d.archetypes[1].PrendUneCible, "LOGISTICS : un tableau ⇒ une cible");
            Assert.IsTrue(d.archetypes[2].PrendUneCible, "LAUNDERING : `[]` est un tableau (une cible, aucun candidat), pas `null`");
            Assert.IsTrue(d.archetypes[3].PrendUneCible, "DISTRIBUTION : un tableau");
            Assert.IsFalse(d.archetypes[4].PrendUneCible, "MUSCLE : null, avec une espace avant « null »");
            Assert.AreEqual("NOT_A_LAB", d.archetypes[0].blocked[0].blocked_reason);
            Assert.AreEqual("b-lab", d.archetypes[0].eligible_host_building_ids[0]);
        }

        [Test]
        public void H2_LHote_EstLePremierEligibleServi_CookSansCible()
        {
            Assert.AreEqual(("b-lab", (string)null), HostEligibilite.Choisir("COOK", Servie()));
            Assert.AreEqual(("b-stash", (string)null), HostEligibilite.Choisir("MUSCLE", Servie()), "MUSCLE : l'hôte servi, pas de cible");
        }

        [Test]
        public void H3_LaCible_EstLaPremiereServieQuiNEstPasLHote_RienDeDeviné()
        {
            (string source, string cible) = HostEligibilite.Choisir("LOGISTICS", Servie());
            Assert.AreEqual("b-lab", source);
            Assert.AreEqual("b-stash", cible, "la première cible servie qui n'est pas la source");
            Assert.AreNotEqual(source, cible, "le back refuse une route qui part et arrive au même bâtiment (409)");
            Assert.AreEqual(("b-front", (string)null), HostEligibilite.Choisir("LAUNDERING", Servie()), "une cible, aucun candidat servi ⇒ null (pas de planque inventée)");
        }

        [Test]
        public void H5_RienDeDeviné_SansReponse_SansLigne_SansHoteEligible()
        {
            Assert.AreEqual(((string)null, (string)null), HostEligibilite.Choisir("COOK", null), "sans réponse : aucun hôte");
            Assert.AreEqual(((string)null, (string)null), HostEligibilite.Choisir("SECURITY", Servie()), "aucune ligne pour l'archétype");
            (string hote, string cible) = HostEligibilite.Choisir("DISTRIBUTION", Servie());
            Assert.IsNull(hote, "aucun hôte éligible servi : le recrutement n'est pas tenté (et jamais un bâtiment pris au hasard)");
            Assert.IsNull(cible, "pas d'hôte ⇒ pas de cible");
            Assert.IsNull(HostEligibilite.LireCorps("{\"payload\":{}}")?.archetypes, "un corps sans archetypes : aucune ligne (JsonUtility rend un `data` vide, jamais null ; le client le refuse comme une erreur)");
            Assert.AreEqual(((string)null, (string)null), HostEligibilite.Choisir("COOK", HostEligibilite.LireCorps("{\"payload\":{}}")), "ce corps ne donne aucun hôte");
        }

        [Test]
        public void H4_LeRetourDuRecrutement_NommeLArchetypeParSonMot()
        {
            MafiaCleanCity.I18n.I18nCatalog.Oublier();
            string mot = FamilleLabels.Archetype("COOK");
            string retour = LieutenantScreenController.RetourDeRecrutement("COOK");
            StringAssert.StartsWith("Nouvelle recrue", retour);
            StringAssert.Contains(mot, retour, "le mot SERVI de l'archétype");
            StringAssert.DoesNotContain("COOK", retour, "jamais l'identifiant brut");
            StringAssert.DoesNotContain("recruté", retour, "jamais accordé à la personne (D13)");
        }
}
}
