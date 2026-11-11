using System;
using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
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
        public void H6_SansHoteEligible_LaPhraseDuPremierRefuse_EstCelleQuiSeDit()
        {
            HostBloqueDto refus = HostRefus.Premier("DISTRIBUTION", Servie());
            Assert.IsNotNull(refus, "DISTRIBUTION : aucun hôte éligible, un refusé servi ⇒ sa phrase remplace « Échec du recrutement. »");
            Assert.AreEqual("k2", refus.blocked_reason_key, "la CLÉ servie (`blocked_reason_i18n`), que le contrôleur résout par le catalogue");
            Assert.IsNull(HostRefus.Premier("COOK", Servie()), "un hôte éligible existe : le recrutement part, rien à dire");
            Assert.IsNull(HostRefus.Premier("SECURITY", Servie()), "aucune ligne : la phrase actuelle reste");
            Assert.IsNull(HostRefus.Premier("COOK", null), "sans réponse : la phrase actuelle reste");
            HostEligibiliteData sansRefus = HostEligibilite.LireCorps("{\"payload\":{\"data\":{\"archetypes\":[{\"archetype\":\"COOK\",\"eligible_host_building_ids\":[],\"blocked\":[],\"valid_target_building_ids\":null}]}}}");
            Assert.IsNull(HostRefus.Premier("COOK", sansRefus), "ni éligible ni refusé : rien de servi à dire, la phrase actuelle reste");
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

        // ---- TD-878 (11/11) — host-eligibility sert `structural_budget_band` ∈ {AVAILABLE, SPENT} et `roster_room_band` ∈ {ROOM, FULL} (back @8d0184a4, budget-bands.ts).
        //   H7  la lecture : SPENT ⇒ BudgetDepense, FULL ⇒ EquipeComplete, les deux ⇒ les deux ; AVAILABLE/ROOM, absente, vide, inconnue ⇒ Aucun (jamais grisé sur l'ignorance)
        //   H8  l'écran : bande ⇒ bouton « Recruter » grisé + la RAISON (budget : la phrase SERVIE ; équipe : le mot ratifié f2) ; bande ouverte ⇒ rouvert
        //   H9  contrôle positif : le contrôle d'état REFUSE un bouton resté ouvert sous une bande qui dit « plus rien » (sinon H8 ne dirait rien)
        private static string Bandes(string budget, string equipe) =>
            "{\"payload\":{\"data\":{\"archetypes\":[]" + (budget == null ? "" : ",\"structural_budget_band\":\"" + budget + "\"") +
            (equipe == null ? "" : ",\"roster_room_band\":\"" + equipe + "\"") + "}}}";

        [Test]
        public void H7_LesBandesServies_DisentCeQueLeBackRefuseraitEtRienDePlus()
        {
            Assert.AreEqual(BlocageRecrutement.BudgetDepense, HostBlocage.Lire(HostEligibilite.LireCorps(Bandes("SPENT", "ROOM"))));
            Assert.AreEqual(BlocageRecrutement.EquipeComplete, HostBlocage.Lire(HostEligibilite.LireCorps(Bandes("AVAILABLE", "FULL"))));
            Assert.AreEqual(BlocageRecrutement.BudgetDepense | BlocageRecrutement.EquipeComplete, HostBlocage.Lire(HostEligibilite.LireCorps(Bandes("SPENT", "FULL"))));
            Assert.AreEqual(BlocageRecrutement.Aucun, HostBlocage.Lire(HostEligibilite.LireCorps(Bandes("AVAILABLE", "ROOM"))));
            Assert.AreEqual(BlocageRecrutement.Aucun, HostBlocage.Lire(HostEligibilite.LireCorps(Bandes(null, null))), "bandes non servies : on ne sait pas, rien n'est grisé");
            Assert.AreEqual(BlocageRecrutement.Aucun, HostBlocage.Lire(HostEligibilite.LireCorps(Bandes("", "PLEIN"))), "vide ou valeur inconnue : rien n'est grisé");
            Assert.AreEqual(BlocageRecrutement.Aucun, HostBlocage.Lire(null), "sans réponse : rien n'est grisé");
        }

        private GameObject hote;

        [TearDown]
        public void NettoyerEcran()
        {
            MafiaCleanCity.I18n.I18nCatalog.Oublier();
            Canvas c = UnityEngine.Object.FindFirstObjectByType<Canvas>();
            if (c != null) UnityEngine.Object.Destroy(c.gameObject);
            if (hote != null) UnityEngine.Object.Destroy(hote);
        }

        /// <summary>L'état attendu du bouton « Recruter » sous `attendu` : cliquable ssi Aucun ; sinon grisé ET une raison non vide qui contient `phrase`.</summary>
        private static void ExigerEtat(LieutenantScreenController ecran, BlocageRecrutement attendu, params string[] phrases)
        {
            Assert.AreEqual(attendu, ecran.BlocageDuRecrutement);
            Assert.AreEqual(attendu == BlocageRecrutement.Aucun, ecran.RecruitButtonInteractable, "bouton « Recruter » cliquable ssi la bande ne dit pas « plus rien »");
            if (attendu == BlocageRecrutement.Aucun) { Assert.AreEqual("", ecran.RecruitReason, "rien à dire quand le recrutement est ouvert"); return; }
            Assert.IsNotEmpty(ecran.RecruitReason, "grisé SANS raison : le joueur ne sait pas pourquoi");
            foreach (string p in phrases) StringAssert.Contains(p, ecran.RecruitReason);
        }

        [UnityTest]
        public IEnumerator H8_UneBandeQuiDitPlusRien_GriseLeBoutonEtDitPourquoi()
        {
            // la phrase du budget est SERVIE (registre d'erreurs du back) : servie ⇒ c'est elle, pas le repli
            MafiaCleanCity.I18n.I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string> { { HostBlocage.CleBudgetDepense, "PHRASE SERVIE DU PLAFOND" } });
            hote = new GameObject("LieutenantScreenController_Bandes");
            LieutenantScreenController ecran = hote.AddComponent<LieutenantScreenController>();
            yield return null;
            yield return null;
            ExigerEtat(ecran, BlocageRecrutement.Aucun);
            ecran.AppliquerHostEligibilite(HostEligibilite.LireCorps(Bandes("SPENT", "ROOM")));
            ExigerEtat(ecran, BlocageRecrutement.BudgetDepense, "PHRASE SERVIE DU PLAFOND");
            ecran.AppliquerHostEligibilite(HostEligibilite.LireCorps(Bandes("AVAILABLE", "FULL")));
            ExigerEtat(ecran, BlocageRecrutement.EquipeComplete, "Votre équipe est au complet.");
            ecran.AppliquerHostEligibilite(HostEligibilite.LireCorps(Bandes("SPENT", "FULL")));
            ExigerEtat(ecran, BlocageRecrutement.BudgetDepense | BlocageRecrutement.EquipeComplete, "PHRASE SERVIE DU PLAFOND", "Votre équipe est au complet.");
            ecran.AppliquerHostEligibilite(HostEligibilite.LireCorps(Bandes("AVAILABLE", "ROOM")));
            ExigerEtat(ecran, BlocageRecrutement.Aucun);
            ecran.AppliquerHostEligibilite(HostEligibilite.LireCorps(Bandes("SPENT", "ROOM")));
            ecran.AppliquerHostEligibilite(null);
            ExigerEtat(ecran, BlocageRecrutement.Aucun);   // rouvert quand la réponse manque : le back tranche
        }

        [UnityTest]
        public IEnumerator H8b_SansPhraseServie_LeRepliEstLeMotFrancais()
        {
            MafiaCleanCity.I18n.I18nCatalog.Oublier();
            Assert.AreEqual("Votre décision de structure d’aujourd’hui est prise. Reprenez demain.", LieutenantScreenController.PhraseDeBlocage(BlocageRecrutement.BudgetDepense));
            Assert.AreEqual("Votre équipe est au complet.", LieutenantScreenController.PhraseDeBlocage(BlocageRecrutement.EquipeComplete));
            Assert.AreEqual("", LieutenantScreenController.PhraseDeBlocage(BlocageRecrutement.Aucun));
            yield break;
        }

        [UnityTest]
        public IEnumerator H9_ControlePositif_UnBoutonResteOuvertSousUneBandePleineFaitRougir()
        {
            hote = new GameObject("LieutenantScreenController_BandesControle");
            LieutenantScreenController ecran = hote.AddComponent<LieutenantScreenController>();
            yield return null;
            yield return null;
            ecran.AppliquerHostEligibilite(HostEligibilite.LireCorps(Bandes("AVAILABLE", "FULL")));
            ExigerEtat(ecran, BlocageRecrutement.EquipeComplete, "au complet");
            // la faute : on rouvre le bouton à la main, la bande dit toujours FULL — le contrôle d'état doit le voir
            UnityEngine.UI.Button bouton = Array.Find(hote.GetComponentsInChildren<UnityEngine.UI.Button>(true), b => b.name == "Action_recruter");
            Assert.IsNotNull(bouton, "le bouton « Recruter » doit être trouvé pour la faute injectée");
            bouton.interactable = true;
            Assert.Throws<AssertionException>(() => ExigerEtat(ecran, BlocageRecrutement.EquipeComplete, "au complet"), "un bouton ouvert sous FULL doit rougir");
        }
}
}
