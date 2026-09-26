using NUnit.Framework;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Shell;

namespace MafiaCleanCity.CityMap.Tests
{
    // B7 (passe UX 2026-09-24) — le bâtiment d'un recrutement, tiré des bâtiments servis. Hors réseau : le kit de départ mesuré
    // sur le serveur (`corps/006` de la passe : lab, stash, front_shop, cash_safehouse) est fabriqué ici.
    //   H1  COOK → le labo ; archétype sans type imposé (MUSCLE) → un bâtiment possédé, jamais vide
    //   H2  LAUNDERING → la façade, cible = la planque ; LOGISTICS → source et cible DISTINCTES
    //   H3  aucun hôte du bon type (DISTRIBUTION sans point de vente) → un bâtiment possédé quand même (le back nomme le refus),
    //       cible = la planque ; rien possédé → (null, null)
    //   H4  ⑳ (table 63 v2) : le retour d'un recrutement nomme l'archétype par son MOT servi, jamais l'identifiant brut (« COOK recruté. »)
    [Category("HoteDeRecrutement")]
    public class HoteDeRecrutementPlayModeTests
    {
        private static BatimentPossedeDto B(string id, string type) => new BatimentPossedeDto { building = id, operational_type = type };

        private static readonly BatimentPossedeDto[] Kit =
        {
            B("b-stash", "stash"), B("b-lab", "lab"), B("b-front", "front_shop"), B("b-safe", "cash_safehouse"),
        };

        [Test]
        public void H1_Cook_PrendLeLabo_EtMuscle_UnBatimentPossede()
        {
            Assert.AreEqual(("b-lab", (string)null), HoteDeRecrutement.Choisir("COOK", Kit));
            (string hote, string cible) = HoteDeRecrutement.Choisir("MUSCLE", Kit);
            Assert.AreEqual("b-stash", hote, "sans type imposé : le premier bâtiment servi");
            Assert.IsNull(cible, "MUSCLE n'a pas de cible");
        }

        [Test]
        public void H2_Laundering_FacadeEtPlanque_Logistics_SourceEtCibleDistinctes()
        {
            Assert.AreEqual(("b-front", "b-safe"), HoteDeRecrutement.Choisir("LAUNDERING", Kit));
            (string source, string cible) = HoteDeRecrutement.Choisir("LOGISTICS", Kit);
            Assert.AreEqual("b-lab", source);
            Assert.AreEqual("b-stash", cible);
            Assert.AreNotEqual(source, cible, "le back refuse une route qui part et arrive au même bâtiment");
        }

        [Test]
        public void H3_SansHoteDuBonType_UnBatimentQuandMeme_EtRienPossede_Rien()
        {
            (string hote, string cible) = HoteDeRecrutement.Choisir("DISTRIBUTION", Kit);
            Assert.AreEqual("b-stash", hote, "jamais une chaîne vide (le 422 de corps/144) : le refus lisible viendra du back");
            Assert.AreEqual("b-safe", cible);
            Assert.AreEqual(((string)null, (string)null), HoteDeRecrutement.Choisir("COOK", new BatimentPossedeDto[0]));
            Assert.AreEqual(((string)null, (string)null), HoteDeRecrutement.Choisir("COOK", null));
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
