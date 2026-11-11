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
        //   H9  le contrôle d'état (ExigerEtat) n'est pas vide : il REFUSE un bouton resté ouvert sous une bande qui dit « plus rien » (le garde-fou du grisage de production est H8/H10, pas H9)
        //   H11 une lecture en ÉCHEC rouvre le bouton grisé (jamais grisé sur l'ignorance) ; une lecture réussie le regrise
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
            // le SEUL signe visible du grisage (le bouton n'a pas de transition) : le libellé s'éteint ; retirer cette ligne de production doit rougir ici
            Assert.AreEqual(attendu == BlocageRecrutement.Aucun ? MafiaCleanCity.Theme.DesignTokens.Current.accentGold : MafiaCleanCity.Theme.DesignTokens.Current.onSurfaceMuted,
                ecran.RecruitLabelColor, "libellé du bouton : encre d'appel quand ouvert, encre secondaire quand grisé");
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

        // ---- TD-1092 (12/11) — host-eligibility sert `roster_room_label_key` (back lot/equipe-pleine @ff076d49) : le DTO la DÉCLARE (forme G), la phrase « équipe au complet » la LIT, le mot ratifié est le repli compté.
        private const string CorpsAvecCle = "{\"payload\":{\"data\":{\"archetypes\":[],\"structural_budget_band\":\"AVAILABLE\",\"roster_room_band\":\"FULL\",\"roster_room_label_key\":\"famille.rosterroom.votre_equipe_est_au_complet\"}}}";

        [Test]
        public void H12a_LeDtoDeclareLaCleDuLibelleDeLaBande()
        {
            HostEligibiliteData d = HostEligibilite.LireCorps(CorpsAvecCle);
            Assert.AreEqual(HostBlocage.CleEquipePleine, d.roster_room_label_key, "forme G : la clé servie est lue, pas jetée par JsonUtility");
            Assert.AreEqual("FULL", d.roster_room_band);
            Assert.IsNull(HostEligibilite.LireCorps(Bandes("AVAILABLE", "FULL")).roster_room_label_key, "clé non servie (back d'avant le lot) ⇒ null, la phrase retombe sur le repli");
        }

        [Test]
        public void H12b_LaPhraseLitLaCleServie_EtLeMotRatifieEstLeRepliCompte()
        {
            MafiaCleanCity.I18n.I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string> { { HostBlocage.CleEquipePleine, "VALEUR SERVIE DU COMPLET" } });
            Assert.AreEqual("VALEUR SERVIE DU COMPLET", LieutenantScreenController.PhraseDeBlocage(BlocageRecrutement.EquipeComplete, HostBlocage.CleEquipePleine), "la valeur servie l'emporte");
            MafiaCleanCity.I18n.I18nCatalog.Oublier();
            MafiaCleanCity.I18n.Libelle.RemettreLesCompteurs();
            Assert.AreEqual("Votre équipe est au complet.", LieutenantScreenController.PhraseDeBlocage(BlocageRecrutement.EquipeComplete, HostBlocage.CleEquipePleine), "clé annoncée, valeur non servie ⇒ le mot ratifié");
            CollectionAssert.Contains(MafiaCleanCity.I18n.Libelle.ClesEnRepli, HostBlocage.CleEquipePleine, "le repli est COMPTÉ sous la clé servie (la garde zéro-repli le voit)");
            Assert.AreEqual("Votre équipe est au complet.", LieutenantScreenController.PhraseDeBlocage(BlocageRecrutement.EquipeComplete, null), "clé absente ⇒ le mot ratifié");
        }

        [UnityTest]
        public IEnumerator H12c_LEcran_AfficheLaPhraseDeLaCleServie()
        {
            MafiaCleanCity.I18n.I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string> { { HostBlocage.CleEquipePleine, "VALEUR SERVIE DU COMPLET" } });
            hote = new GameObject("LieutenantScreenController_CleServie");
            LieutenantScreenController ecran = hote.AddComponent<LieutenantScreenController>();
            yield return null;
            yield return null;
            ecran.AppliquerHostEligibilite(HostEligibilite.LireCorps(CorpsAvecCle));
            ExigerEtat(ecran, BlocageRecrutement.EquipeComplete, "VALEUR SERVIE DU COMPLET");
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

        // H10 — PREUVE D'ARRIVÉE (corps RÉELS de la pile @8d0184a4, compte jetable, 11/11 ; sans SQL, par des gestes de joueur ; enveloppe `response_meta` retirée, le reste intact) :
        //   SPENT = GET host-eligibility après UN recrutement réel (Logs/td-878/23-host-apres.json) ; FULL = après 3 recrutements sur 3 sessions rouvertes, 4ᵉ ouverture (Logs/td-878/25-host-full.json).
        private const string CorpsReelSpent = "{\"payload\":{\"data\":{\"archetypes\":[{\"archetype\":\"COOK\",\"eligible_host_building_ids\":[\"7d5dcb3d-ed25-49f9-9260-87c1d76dfb3d\"],\"blocked\":[{\"building_id\":\"d45b8609-2214-4b92-9c0d-ed51e45a4539\",\"blocked_reason\":\"WRONG_HOST_TYPE\",\"blocked_reason_i18n\":\"famille.refus.ce_type_de_batiment_ne_convient_pas_a_ce_role\"},{\"building_id\":\"0b8af29c-7b0b-41f7-aec4-7a7350209f53\",\"blocked_reason\":\"WRONG_HOST_TYPE\",\"blocked_reason_i18n\":\"famille.refus.ce_type_de_batiment_ne_convient_pas_a_ce_role\"},{\"building_id\":\"e2d44603-f426-4a07-8896-ae0ebd780368\",\"blocked_reason\":\"WRONG_HOST_TYPE\",\"blocked_reason_i18n\":\"famille.refus.ce_type_de_batiment_ne_convient_pas_a_ce_role\"},{\"building_id\":\"e7b1a8d7-35bb-4d69-a32c-8a2a2143ecf6\",\"blocked_reason\":\"WRONG_HOST_TYPE\",\"blocked_reason_i18n\":\"famille.refus.ce_type_de_batiment_ne_convient_pas_a_ce_role\"}],\"valid_target_building_ids\":null},{\"archetype\":\"SECURITY\",\"eligible_host_building_ids\":[\"7d5dcb3d-ed25-49f9-9260-87c1d76dfb3d\",\"d45b8609-2214-4b92-9c0d-ed51e45a4539\",\"0b8af29c-7b0b-41f7-aec4-7a7350209f53\",\"e2d44603-f426-4a07-8896-ae0ebd780368\",\"e7b1a8d7-35bb-4d69-a32c-8a2a2143ecf6\"],\"blocked\":[],\"valid_target_building_ids\":null},{\"archetype\":\"BOOKKEEPER\",\"eligible_host_building_ids\":[\"0b8af29c-7b0b-41f7-aec4-7a7350209f53\"],\"blocked\":[{\"building_id\":\"7d5dcb3d-ed25-49f9-9260-87c1d76dfb3d\",\"blocked_reason\":\"WRONG_HOST_TYPE\",\"blocked_reason_i18n\":\"famille.refus.ce_type_de_batiment_ne_convient_pas_a_ce_role\"},{\"building_id\":\"d45b8609-2214-4b92-9c0d-ed51e45a4539\",\"blocked_reason\":\"WRONG_HOST_TYPE\",\"blocked_reason_i18n\":\"famille.refus.ce_type_de_batiment_ne_convient_pas_a_ce_role\"},{\"building_id\":\"e2d44603-f426-4a07-8896-ae0ebd780368\",\"blocked_reason\":\"WRONG_HOST_TYPE\",\"blocked_reason_i18n\":\"famille.refus.ce_type_de_batiment_ne_convient_pas_a_ce_role\"},{\"building_id\":\"e7b1a8d7-35bb-4d69-a32c-8a2a2143ecf6\",\"blocked_reason\":\"WRONG_HOST_TYPE\",\"blocked_reason_i18n\":\"famille.refus.ce_type_de_batiment_ne_convient_pas_a_ce_role\"}],\"valid_target_building_ids\":null},{\"archetype\":\"LOGISTICS\",\"eligible_host_building_ids\":[\"7d5dcb3d-ed25-49f9-9260-87c1d76dfb3d\",\"d45b8609-2214-4b92-9c0d-ed51e45a4539\",\"0b8af29c-7b0b-41f7-aec4-7a7350209f53\",\"e2d44603-f426-4a07-8896-ae0ebd780368\",\"e7b1a8d7-35bb-4d69-a32c-8a2a2143ecf6\"],\"blocked\":[],\"valid_target_building_ids\":[\"7d5dcb3d-ed25-49f9-9260-87c1d76dfb3d\",\"d45b8609-2214-4b92-9c0d-ed51e45a4539\",\"0b8af29c-7b0b-41f7-aec4-7a7350209f53\",\"e2d44603-f426-4a07-8896-ae0ebd780368\",\"e7b1a8d7-35bb-4d69-a32c-8a2a2143ecf6\"]},{\"archetype\":\"LAUNDERING\",\"eligible_host_building_ids\":[],\"blocked\":[{\"building_id\":\"7d5dcb3d-ed25-49f9-9260-87c1d76dfb3d\",\"blocked_reason\":\"WRONG_HOST_TYPE\",\"blocked_reason_i18n\":\"famille.refus.ce_type_de_batiment_ne_convient_pas_a_ce_role\"},{\"building_id\":\"d45b8609-2214-4b92-9c0d-ed51e45a4539\",\"blocked_reason\":\"WRONG_HOST_TYPE\",\"blocked_reason_i18n\":\"famille.refus.ce_type_de_batiment_ne_convient_pas_a_ce_role\"},{\"building_id\":\"0b8af29c-7b0b-41f7-aec4-7a7350209f53\",\"blocked_reason\":\"MISSING_STAGE1_NODE\",\"blocked_reason_i18n\":\"famille.refus.ce_commerce_n_a_pas_encore_de_premiere_etape_de_blanchiment\"},{\"building_id\":\"e2d44603-f426-4a07-8896-ae0ebd780368\",\"blocked_reason\":\"WRONG_HOST_TYPE\",\"blocked_reason_i18n\":\"famille.refus.ce_type_de_batiment_ne_convient_pas_a_ce_role\"},{\"building_id\":\"e7b1a8d7-35bb-4d69-a32c-8a2a2143ecf6\",\"blocked_reason\":\"WRONG_HOST_TYPE\",\"blocked_reason_i18n\":\"famille.refus.ce_type_de_batiment_ne_convient_pas_a_ce_role\"}],\"valid_target_building_ids\":[\"e2d44603-f426-4a07-8896-ae0ebd780368\"]},{\"archetype\":\"DISTRIBUTION\",\"eligible_host_building_ids\":[\"e7b1a8d7-35bb-4d69-a32c-8a2a2143ecf6\"],\"blocked\":[{\"building_id\":\"7d5dcb3d-ed25-49f9-9260-87c1d76dfb3d\",\"blocked_reason\":\"NO_DEALER_ON_SPOT\",\"blocked_reason_i18n\":\"famille.refus.aucun_dealer_ne_tient_ce_point_de_vente\"},{\"building_id\":\"d45b8609-2214-4b92-9c0d-ed51e45a4539\",\"blocked_reason\":\"NO_DEALER_ON_SPOT\",\"blocked_reason_i18n\":\"famille.refus.aucun_dealer_ne_tient_ce_point_de_vente\"},{\"building_id\":\"0b8af29c-7b0b-41f7-aec4-7a7350209f53\",\"blocked_reason\":\"NO_DEALER_ON_SPOT\",\"blocked_reason_i18n\":\"famille.refus.aucun_dealer_ne_tient_ce_point_de_vente\"},{\"building_id\":\"e2d44603-f426-4a07-8896-ae0ebd780368\",\"blocked_reason\":\"NO_DEALER_ON_SPOT\",\"blocked_reason_i18n\":\"famille.refus.aucun_dealer_ne_tient_ce_point_de_vente\"}],\"valid_target_building_ids\":[\"e2d44603-f426-4a07-8896-ae0ebd780368\"]},{\"archetype\":\"MUSCLE\",\"eligible_host_building_ids\":[\"7d5dcb3d-ed25-49f9-9260-87c1d76dfb3d\",\"d45b8609-2214-4b92-9c0d-ed51e45a4539\",\"0b8af29c-7b0b-41f7-aec4-7a7350209f53\",\"e2d44603-f426-4a07-8896-ae0ebd780368\",\"e7b1a8d7-35bb-4d69-a32c-8a2a2143ecf6\"],\"blocked\":[],\"valid_target_building_ids\":null},{\"archetype\":\"INTELLIGENCE\",\"eligible_host_building_ids\":[\"7d5dcb3d-ed25-49f9-9260-87c1d76dfb3d\",\"d45b8609-2214-4b92-9c0d-ed51e45a4539\",\"0b8af29c-7b0b-41f7-aec4-7a7350209f53\",\"e2d44603-f426-4a07-8896-ae0ebd780368\",\"e7b1a8d7-35bb-4d69-a32c-8a2a2143ecf6\"],\"blocked\":[],\"valid_target_building_ids\":null},{\"archetype\":\"FACILITY_MANAGER\",\"eligible_host_building_ids\":[\"7d5dcb3d-ed25-49f9-9260-87c1d76dfb3d\",\"d45b8609-2214-4b92-9c0d-ed51e45a4539\",\"0b8af29c-7b0b-41f7-aec4-7a7350209f53\",\"e2d44603-f426-4a07-8896-ae0ebd780368\",\"e7b1a8d7-35bb-4d69-a32c-8a2a2143ecf6\"],\"blocked\":[],\"valid_target_building_ids\":null}],\"structural_budget_band\":\"SPENT\",\"roster_room_band\":\"ROOM\"}}}";
        private const string CorpsReelFull = "{\"payload\":{\"data\":{\"archetypes\":[{\"archetype\":\"COOK\",\"eligible_host_building_ids\":[\"e6586775-d618-4241-9f6a-4223327499bb\"],\"blocked\":[{\"building_id\":\"6d6dd7ac-5c37-466f-970e-cb4dbf068f21\",\"blocked_reason\":\"WRONG_HOST_TYPE\",\"blocked_reason_i18n\":\"famille.refus.ce_type_de_batiment_ne_convient_pas_a_ce_role\"},{\"building_id\":\"5f2585f7-089e-4ec8-9005-93f213ea0fae\",\"blocked_reason\":\"WRONG_HOST_TYPE\",\"blocked_reason_i18n\":\"famille.refus.ce_type_de_batiment_ne_convient_pas_a_ce_role\"},{\"building_id\":\"63ea3e6f-a4ce-4371-9fbb-8b0cfdd8b8dd\",\"blocked_reason\":\"WRONG_HOST_TYPE\",\"blocked_reason_i18n\":\"famille.refus.ce_type_de_batiment_ne_convient_pas_a_ce_role\"},{\"building_id\":\"af3ba2d2-9ade-4ca9-9571-479f0011e7f8\",\"blocked_reason\":\"WRONG_HOST_TYPE\",\"blocked_reason_i18n\":\"famille.refus.ce_type_de_batiment_ne_convient_pas_a_ce_role\"}],\"valid_target_building_ids\":null},{\"archetype\":\"SECURITY\",\"eligible_host_building_ids\":[\"e6586775-d618-4241-9f6a-4223327499bb\",\"6d6dd7ac-5c37-466f-970e-cb4dbf068f21\",\"5f2585f7-089e-4ec8-9005-93f213ea0fae\",\"63ea3e6f-a4ce-4371-9fbb-8b0cfdd8b8dd\",\"af3ba2d2-9ade-4ca9-9571-479f0011e7f8\"],\"blocked\":[],\"valid_target_building_ids\":null},{\"archetype\":\"BOOKKEEPER\",\"eligible_host_building_ids\":[\"5f2585f7-089e-4ec8-9005-93f213ea0fae\"],\"blocked\":[{\"building_id\":\"e6586775-d618-4241-9f6a-4223327499bb\",\"blocked_reason\":\"WRONG_HOST_TYPE\",\"blocked_reason_i18n\":\"famille.refus.ce_type_de_batiment_ne_convient_pas_a_ce_role\"},{\"building_id\":\"6d6dd7ac-5c37-466f-970e-cb4dbf068f21\",\"blocked_reason\":\"WRONG_HOST_TYPE\",\"blocked_reason_i18n\":\"famille.refus.ce_type_de_batiment_ne_convient_pas_a_ce_role\"},{\"building_id\":\"63ea3e6f-a4ce-4371-9fbb-8b0cfdd8b8dd\",\"blocked_reason\":\"WRONG_HOST_TYPE\",\"blocked_reason_i18n\":\"famille.refus.ce_type_de_batiment_ne_convient_pas_a_ce_role\"},{\"building_id\":\"af3ba2d2-9ade-4ca9-9571-479f0011e7f8\",\"blocked_reason\":\"WRONG_HOST_TYPE\",\"blocked_reason_i18n\":\"famille.refus.ce_type_de_batiment_ne_convient_pas_a_ce_role\"}],\"valid_target_building_ids\":null},{\"archetype\":\"LOGISTICS\",\"eligible_host_building_ids\":[\"e6586775-d618-4241-9f6a-4223327499bb\",\"6d6dd7ac-5c37-466f-970e-cb4dbf068f21\",\"5f2585f7-089e-4ec8-9005-93f213ea0fae\",\"63ea3e6f-a4ce-4371-9fbb-8b0cfdd8b8dd\",\"af3ba2d2-9ade-4ca9-9571-479f0011e7f8\"],\"blocked\":[],\"valid_target_building_ids\":[\"e6586775-d618-4241-9f6a-4223327499bb\",\"6d6dd7ac-5c37-466f-970e-cb4dbf068f21\",\"5f2585f7-089e-4ec8-9005-93f213ea0fae\",\"63ea3e6f-a4ce-4371-9fbb-8b0cfdd8b8dd\",\"af3ba2d2-9ade-4ca9-9571-479f0011e7f8\"]},{\"archetype\":\"LAUNDERING\",\"eligible_host_building_ids\":[],\"blocked\":[{\"building_id\":\"e6586775-d618-4241-9f6a-4223327499bb\",\"blocked_reason\":\"WRONG_HOST_TYPE\",\"blocked_reason_i18n\":\"famille.refus.ce_type_de_batiment_ne_convient_pas_a_ce_role\"},{\"building_id\":\"6d6dd7ac-5c37-466f-970e-cb4dbf068f21\",\"blocked_reason\":\"WRONG_HOST_TYPE\",\"blocked_reason_i18n\":\"famille.refus.ce_type_de_batiment_ne_convient_pas_a_ce_role\"},{\"building_id\":\"5f2585f7-089e-4ec8-9005-93f213ea0fae\",\"blocked_reason\":\"MISSING_STAGE1_NODE\",\"blocked_reason_i18n\":\"famille.refus.ce_commerce_n_a_pas_encore_de_premiere_etape_de_blanchiment\"},{\"building_id\":\"63ea3e6f-a4ce-4371-9fbb-8b0cfdd8b8dd\",\"blocked_reason\":\"WRONG_HOST_TYPE\",\"blocked_reason_i18n\":\"famille.refus.ce_type_de_batiment_ne_convient_pas_a_ce_role\"},{\"building_id\":\"af3ba2d2-9ade-4ca9-9571-479f0011e7f8\",\"blocked_reason\":\"WRONG_HOST_TYPE\",\"blocked_reason_i18n\":\"famille.refus.ce_type_de_batiment_ne_convient_pas_a_ce_role\"}],\"valid_target_building_ids\":[\"63ea3e6f-a4ce-4371-9fbb-8b0cfdd8b8dd\"]},{\"archetype\":\"DISTRIBUTION\",\"eligible_host_building_ids\":[\"af3ba2d2-9ade-4ca9-9571-479f0011e7f8\"],\"blocked\":[{\"building_id\":\"e6586775-d618-4241-9f6a-4223327499bb\",\"blocked_reason\":\"NO_DEALER_ON_SPOT\",\"blocked_reason_i18n\":\"famille.refus.aucun_dealer_ne_tient_ce_point_de_vente\"},{\"building_id\":\"6d6dd7ac-5c37-466f-970e-cb4dbf068f21\",\"blocked_reason\":\"NO_DEALER_ON_SPOT\",\"blocked_reason_i18n\":\"famille.refus.aucun_dealer_ne_tient_ce_point_de_vente\"},{\"building_id\":\"5f2585f7-089e-4ec8-9005-93f213ea0fae\",\"blocked_reason\":\"NO_DEALER_ON_SPOT\",\"blocked_reason_i18n\":\"famille.refus.aucun_dealer_ne_tient_ce_point_de_vente\"},{\"building_id\":\"63ea3e6f-a4ce-4371-9fbb-8b0cfdd8b8dd\",\"blocked_reason\":\"NO_DEALER_ON_SPOT\",\"blocked_reason_i18n\":\"famille.refus.aucun_dealer_ne_tient_ce_point_de_vente\"}],\"valid_target_building_ids\":[\"63ea3e6f-a4ce-4371-9fbb-8b0cfdd8b8dd\"]},{\"archetype\":\"MUSCLE\",\"eligible_host_building_ids\":[\"e6586775-d618-4241-9f6a-4223327499bb\",\"6d6dd7ac-5c37-466f-970e-cb4dbf068f21\",\"5f2585f7-089e-4ec8-9005-93f213ea0fae\",\"63ea3e6f-a4ce-4371-9fbb-8b0cfdd8b8dd\",\"af3ba2d2-9ade-4ca9-9571-479f0011e7f8\"],\"blocked\":[],\"valid_target_building_ids\":null},{\"archetype\":\"INTELLIGENCE\",\"eligible_host_building_ids\":[\"e6586775-d618-4241-9f6a-4223327499bb\",\"6d6dd7ac-5c37-466f-970e-cb4dbf068f21\",\"5f2585f7-089e-4ec8-9005-93f213ea0fae\",\"63ea3e6f-a4ce-4371-9fbb-8b0cfdd8b8dd\",\"af3ba2d2-9ade-4ca9-9571-479f0011e7f8\"],\"blocked\":[],\"valid_target_building_ids\":null},{\"archetype\":\"FACILITY_MANAGER\",\"eligible_host_building_ids\":[\"e6586775-d618-4241-9f6a-4223327499bb\",\"6d6dd7ac-5c37-466f-970e-cb4dbf068f21\",\"5f2585f7-089e-4ec8-9005-93f213ea0fae\",\"63ea3e6f-a4ce-4371-9fbb-8b0cfdd8b8dd\",\"af3ba2d2-9ade-4ca9-9571-479f0011e7f8\"],\"blocked\":[],\"valid_target_building_ids\":null}],\"structural_budget_band\":\"AVAILABLE\",\"roster_room_band\":\"FULL\"}}}";

        [UnityTest]
        public IEnumerator H10_LesCorpsReelsDeLaPile_GrisentLeBoutonAvecLaPhraseServie()
        {
            MafiaCleanCity.I18n.I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string> { { HostBlocage.CleBudgetDepense, "Votre décision de structure d’aujourd’hui est prise. Reprenez demain." } });
            HostEligibiliteData spent = HostEligibilite.LireCorps(CorpsReelSpent), full = HostEligibilite.LireCorps(CorpsReelFull);
            Assert.AreEqual("SPENT", spent.structural_budget_band, "le corps réel après un recrutement sert SPENT");
            Assert.AreEqual("FULL", full.roster_room_band, "le corps réel au roster atteint sert FULL");
            Assert.AreEqual(9, spent.archetypes.Length, "les neuf lignes réelles sont toujours lues à côté des bandes");
            hote = new GameObject("LieutenantScreenController_CorpsReels");
            LieutenantScreenController ecran = hote.AddComponent<LieutenantScreenController>();
            yield return null;
            yield return null;
            ecran.AppliquerHostEligibilite(spent);
            ExigerEtat(ecran, BlocageRecrutement.BudgetDepense, "Votre décision de structure d’aujourd’hui est prise. Reprenez demain.");
            ecran.AppliquerHostEligibilite(full);
            ExigerEtat(ecran, BlocageRecrutement.EquipeComplete, "Votre équipe est au complet.");
        }

        [UnityTest]
        public IEnumerator H11_UneLectureEnEchec_RouvreLeBoutonGrise()
        {
            hote = new GameObject("LieutenantScreenController_LectureEnEchec");
            LieutenantScreenController ecran = hote.AddComponent<LieutenantScreenController>();
            yield return null;
            yield return null;
            HostEligibiliteData spent = HostEligibilite.LireCorps(Bandes("SPENT", "ROOM"));
            bool echec = false;
            ecran.LectureHostEligibilite = (ok, ko) => EnsembleDeLecture(echec ? null : spent, echec ? (500L, "panne") : (0L, null), ok, ko);
            yield return ecran.RafraichirBlocageRecrutement();
            ExigerEtat(ecran, BlocageRecrutement.BudgetDepense, "décision de structure");
            echec = true;   // la relecture tombe en panne : l'état d'un instant d'avant n'est plus connu
            yield return ecran.RafraichirBlocageRecrutement();
            ExigerEtat(ecran, BlocageRecrutement.Aucun);
        }

        private static IEnumerator EnsembleDeLecture(HostEligibiliteData servie, (long code, string message) erreur, Action<HostEligibiliteData> ok, Action<long, string> ko)
        {
            if (servie != null) ok(servie); else ko(erreur.code, erreur.message);
            yield break;
        }

        // H12 (TD-878 suite) — « Réaffecter… » et « Attacher » : SEUL le budget structurel SPENT les grise (reassign = governor.commit(LIEUTENANT_ROLE_REASSIGN), attache = BEHAVIOR_SCRIPT_REPLACE,
        // back @8d0184a4 ; aucun ne touche au roster) ; FULL ne les grise pas ; la raison est la même que celle du recrutement ; le libellé s'éteint.
        private static void ExigerGestesStructurels(LieutenantScreenController e, bool grises, string phrase)
        {
            Assert.AreEqual(!grises, e.ReassignButtonInteractable, "« Réaffecter… » cliquable ssi le budget n'est pas dépensé");
            Assert.AreEqual(!grises, e.AttachButtonInteractable, "« Attacher » cliquable ssi le budget n'est pas dépensé");
            var tk = MafiaCleanCity.Theme.DesignTokens.Current;
            Assert.AreEqual(grises ? tk.onSurfaceMuted : tk.accentGold, e.AttachLabelColor, "libellé de « Attacher »");
            Assert.AreEqual(grises ? tk.onSurfaceMuted : tk.accentGold, e.ReassignLabelColor, "libellé de « Réaffecter… »");
            if (!grises) { Assert.AreEqual("", e.ReassignReason); Assert.AreEqual("", e.AttachReason); return; }
            StringAssert.Contains(phrase, e.ReassignReason);
            StringAssert.Contains(phrase, e.AttachReason);
        }

        [UnityTest]
        public IEnumerator H12_LeBudgetDepense_GriseReaffecterEtAttacher_PasLEquipeAuComplet()
        {
            MafiaCleanCity.I18n.I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string> { { HostBlocage.CleBudgetDepense, "PHRASE SERVIE DU PLAFOND" } });
            hote = new GameObject("LieutenantScreenController_GestesStructurels");
            LieutenantScreenController ecran = hote.AddComponent<LieutenantScreenController>();
            yield return null;
            yield return null;
            ExigerGestesStructurels(ecran, false, null);
            ecran.AppliquerHostEligibilite(HostEligibilite.LireCorps(CorpsReelSpent));
            ExigerGestesStructurels(ecran, true, "PHRASE SERVIE DU PLAFOND");
            ecran.AppliquerHostEligibilite(HostEligibilite.LireCorps(CorpsReelFull));
            ExigerGestesStructurels(ecran, false, null);   // l'équipe au complet ne refuse NI la réaffectation NI l'attache
            ExigerEtat(ecran, BlocageRecrutement.EquipeComplete, "au complet");
            ecran.AppliquerHostEligibilite(HostEligibilite.LireCorps(Bandes("SPENT", "FULL")));
            ExigerGestesStructurels(ecran, true, "PHRASE SERVIE DU PLAFOND");
            ecran.AppliquerHostEligibilite(null);   // lecture en échec ⇒ tout rouvert
            ExigerGestesStructurels(ecran, false, null);
        }

        [UnityTest]
        public IEnumerator H13_ReaffecterEtAttacher_JamaisEteintsSansRaison_JamaisUneRaisonOrpheline()
        {
            hote = new GameObject("LieutenantScreenController_RaisonsStructurelles");
            LieutenantScreenController ecran = hote.AddComponent<LieutenantScreenController>();
            yield return null;
            yield return null;
            // (1) disponibilité servie ≠ AVAILABLE, budget intact : le bouton est inerte comme avant, mais son libellé n'est PAS éteint (sinon : bouton mort sans raison)
            ecran.RendreBandesPourTest(new LieutenantBands { archetype = "COOK", reassign_availability = "COOLDOWN" });
            ecran.AppliquerHostEligibilite(HostEligibilite.LireCorps(Bandes("AVAILABLE", "ROOM")));
            Assert.IsFalse(ecran.ReassignButtonInteractable, "disponibilité servie non AVAILABLE : « Réaffecter… » reste inerte (comportement d'avant)");
            Assert.AreEqual(MafiaCleanCity.Theme.DesignTokens.Current.accentGold, ecran.ReassignLabelColor, "libellé non éteint : aucune raison à donner sur ce motif");
            Assert.AreEqual("", ecran.ReassignReason);
            // (2) la même disponibilité + budget dépensé : grisé visiblement ET avec la raison du budget
            ecran.AppliquerHostEligibilite(HostEligibilite.LireCorps(Bandes("SPENT", "ROOM")));
            Assert.IsFalse(ecran.ReassignButtonInteractable);
            Assert.AreEqual(MafiaCleanCity.Theme.DesignTokens.Current.onSurfaceMuted, ecran.ReassignLabelColor);
            StringAssert.Contains("décision de structure", ecran.ReassignReason);
            // (3) mode « donner un ordre » : « Attacher » est masqué, sa raison aussi — et elle revient avec lui
            Assert.IsNotEmpty(ecran.AttachReason, "budget dépensé, hors mode ordre : la raison d'« Attacher » est affichée");
            ecran.OuvrirModeOrdre();
            Assert.IsTrue(ecran.ModeOrdre);
            Assert.AreEqual("", ecran.AttachReason, "mode ordre : plus de raison orpheline sans son bouton");
            ecran.OuvrirModeOrdre();
            Assert.IsFalse(ecran.ModeOrdre);
            StringAssert.Contains("décision de structure", ecran.AttachReason);
        }

        // ---- TD-954 / TD-1093 (12/11) — `GET /v1/lieutenants/:id` sert `reassign_availability_label_key` (back lot/td-954-reassign @ff5430b2) : le DTO la DÉCLARE (forme G), la raison de « Réaffecter… » la LIT.
        private const string CorpsBandesCooldown = "{\"archetype\":\"COOK\",\"reassign_availability\":\"ON_COOLDOWN\",\"reassign_availability_label_key\":\"famille.reaffectation.trop_tot_pour_le_deplacer_a_nouveau\"}";

        [Test]
        public void H54a_LeDtoDeclareLaCleDuLibelleDeLaDisponibilite()
        {
            LieutenantBands b = JsonUtility.FromJson<LieutenantBands>(CorpsBandesCooldown);
            Assert.AreEqual(LieutenantScreenController.CleReaffectationTropTot, b.reassign_availability_label_key, "forme G : la clé servie est lue, pas jetée par JsonUtility");
            Assert.AreEqual("ON_COOLDOWN", b.reassign_availability);
            Assert.IsNull(JsonUtility.FromJson<LieutenantBands>("{\"reassign_availability\":\"ON_COOLDOWN\"}").reassign_availability_label_key, "clé non servie (back d'avant le lot) ⇒ null");
        }

        [Test]
        public void H54b_LaPhraseLitLaCleServie_EtLeMotRatifieEstLeRepliCompte()
        {
            string cle = LieutenantScreenController.CleReaffectationTropTot;
            MafiaCleanCity.I18n.I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string> { { cle, "VALEUR SERVIE DU COOLDOWN" } });
            Assert.AreEqual("VALEUR SERVIE DU COOLDOWN", LieutenantScreenController.PhraseDeIndisponibilite("ON_COOLDOWN", cle), "la valeur servie l'emporte");
            MafiaCleanCity.I18n.I18nCatalog.Oublier();
            MafiaCleanCity.I18n.Libelle.RemettreLesCompteurs();
            Assert.AreEqual("Trop tôt pour le déplacer à nouveau.", LieutenantScreenController.PhraseDeIndisponibilite("ON_COOLDOWN", cle), "clé annoncée, valeur non servie ⇒ le mot ratifié");
            CollectionAssert.Contains(MafiaCleanCity.I18n.Libelle.ClesEnRepli, cle, "le repli est COMPTÉ sous la clé servie (la garde zéro-repli le voit)");
            Assert.AreEqual("Trop tôt pour le déplacer à nouveau.", LieutenantScreenController.PhraseDeIndisponibilite("ON_COOLDOWN", null), "clé absente, ON_COOLDOWN ⇒ le mot ratifié");
            Assert.AreEqual("", LieutenantScreenController.PhraseDeIndisponibilite("AVAILABLE", cle), "un bouton actif n'a rien à dire");
            Assert.AreEqual("", LieutenantScreenController.PhraseDeIndisponibilite("", cle));
            Assert.AreEqual("", LieutenantScreenController.PhraseDeIndisponibilite("COOLDOWN", null), "valeur inconnue sans clé servie : pas de phrase inventée");
        }

        [UnityTest]
        public IEnumerator H54c_LEcran_GriseEtDitPourquoi_ApresLaCleServie_Et_JoinLaRaisonDuBudget()
        {
            string cle = LieutenantScreenController.CleReaffectationTropTot;
            MafiaCleanCity.I18n.I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string> { { cle, "VALEUR SERVIE DU COOLDOWN" }, { HostBlocage.CleBudgetDepense, "PHRASE SERVIE DU PLAFOND" } });
            hote = new GameObject("LieutenantScreenController_Cooldown");
            LieutenantScreenController ecran = hote.AddComponent<LieutenantScreenController>();
            yield return null;
            yield return null;
            ecran.RendreBandesPourTest(JsonUtility.FromJson<LieutenantBands>(CorpsBandesCooldown));
            Assert.IsFalse(ecran.ReassignButtonInteractable);
            Assert.AreEqual(MafiaCleanCity.Theme.DesignTokens.Current.onSurfaceMuted, ecran.ReassignLabelColor, "grisé VISIBLEMENT : il dit pourquoi");
            Assert.AreEqual("VALEUR SERVIE DU COOLDOWN", ecran.ReassignReason);
            ecran.AppliquerHostEligibilite(HostEligibilite.LireCorps(Bandes("SPENT", "ROOM")));
            StringAssert.Contains("VALEUR SERVIE DU COOLDOWN", ecran.ReassignReason);
            StringAssert.Contains("PHRASE SERVIE DU PLAFOND", ecran.ReassignReason, "les deux raisons coexistent");
            ecran.RendreBandesPourTest(new LieutenantBands { archetype = "COOK", reassign_availability = "AVAILABLE", reassign_availability_label_key = cle });
            ecran.AppliquerHostEligibilite(HostEligibilite.LireCorps(Bandes("AVAILABLE", "ROOM")));
            Assert.IsTrue(ecran.ReassignButtonInteractable);
            Assert.AreEqual("", ecran.ReassignReason, "disponible : plus de raison");
        }

        // H14 (mineur 1 de la revue ⊥ TD-878) — deux relectures concurrentes : la lecture LANCÉE en dernier fait foi, quel que soit l'ordre d'arrivée.
        // La lecture 1 sert SPENT (périmée), la lecture 2 sert AVAILABLE/ROOM (la bonne) ; les deux ordres d'arrivée doivent finir ouverts.
        // Contrôle positif : une lecture lancée seule (la dernière) s'applique bel et bien — la garde ne jette pas tout.
        private static IEnumerator LectureEnAttente(HostEligibiliteData donnees, bool[] arrivee, int i, Action<HostEligibiliteData> ok)
        {
            while (!arrivee[i]) yield return null;
            ok(donnees);
        }

        private IEnumerator DeuxLecturesConcurrentes(bool laPlusRecenteArriveEnPremier, HostEligibiliteData ancienne, HostEligibiliteData recente, LieutenantScreenController ecran)
        {
            bool[] arrivee = new bool[2];
            int appel = 0;
            ecran.LectureHostEligibilite = (ok, ko) => { int i = appel++; return LectureEnAttente(i == 0 ? ancienne : recente, arrivee, i, ok); };
            Coroutine c1 = ecran.StartCoroutine(ecran.RafraichirBlocageRecrutement());   // lancée la 1ʳᵉ
            yield return null;
            Coroutine c2 = ecran.StartCoroutine(ecran.RafraichirBlocageRecrutement());   // lancée la 2ᵉ : celle qui fait foi
            yield return null;
            Assert.AreEqual(2, appel, "les deux lectures sont en vol");
            arrivee[laPlusRecenteArriveEnPremier ? 1 : 0] = true;
            yield return null; yield return null;
            arrivee[laPlusRecenteArriveEnPremier ? 0 : 1] = true;
            yield return c1; yield return c2;
        }

        [UnityTest]
        public IEnumerator H14_DeuxRelecturesConcurrentes_LaPlusRecenteFaitFoi_DansLesDeuxOrdres()
        {
            hote = new GameObject("LieutenantScreenController_Generation");
            LieutenantScreenController ecran = hote.AddComponent<LieutenantScreenController>();
            yield return null;
            yield return null;
            HostEligibiliteData spent = HostEligibilite.LireCorps(Bandes("SPENT", "ROOM")), ouvert = HostEligibilite.LireCorps(Bandes("AVAILABLE", "ROOM"));
            // ordre 1 : la récente arrive d'abord, la périmée (SPENT) arrive ENSUITE — sans jeton elle écraserait l'état ouvert
            yield return DeuxLecturesConcurrentes(true, spent, ouvert, ecran);
            ExigerEtat(ecran, BlocageRecrutement.Aucun);
            // ordre 2 : la périmée arrive d'abord, la récente ensuite
            ecran.AppliquerHostEligibilite(HostEligibilite.LireCorps(Bandes("SPENT", "ROOM")));
            yield return DeuxLecturesConcurrentes(false, spent, ouvert, ecran);
            ExigerEtat(ecran, BlocageRecrutement.Aucun);
            // contrôle positif : la récente seule (SPENT) s'applique — le jeton ne mange pas la lecture qui doit passer
            yield return DeuxLecturesConcurrentes(true, ouvert, spent, ecran);
            ExigerEtat(ecran, BlocageRecrutement.BudgetDepense, "décision de structure");
        }

        // H15 (mineur 2) — la phrase de raison qui n'est plus affichée sort du corpus du scan « pas de scalaire brut » ; celle qu'une autre raison montre encore reste.
        [UnityTest]
        public IEnumerator H15_LaPhraseDeRaisonCacheeSortDuCorpus_CelleEncoreMontreeResteDedans()
        {
            MafiaCleanCity.I18n.I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string> { { HostBlocage.CleBudgetDepense, "PHRASE SERVIE DU PLAFOND" } });
            hote = new GameObject("LieutenantScreenController_CorpsDesRaisons");
            LieutenantScreenController ecran = hote.AddComponent<LieutenantScreenController>();
            yield return null;
            yield return null;
            ecran.AppliquerHostEligibilite(HostEligibilite.LireCorps(Bandes("SPENT", "FULL")));
            // la raison du recrutement est UNE phrase jointe (budget + équipe au complet) ; « Attacher » ne dit que le budget
            const string jointe = "PHRASE SERVIE DU PLAFOND Votre équipe est au complet.";
            CollectionAssert.Contains(ecran.RenderedTexts, jointe);
            CollectionAssert.Contains(ecran.RenderedTexts, "PHRASE SERVIE DU PLAFOND");
            // la phrase jointe n'est plus affichée (budget seul) : elle sort du corpus ; celle du budget reste
            ecran.AppliquerHostEligibilite(HostEligibilite.LireCorps(Bandes("SPENT", "ROOM")));
            CollectionAssert.DoesNotContain(ecran.RenderedTexts, jointe);
            CollectionAssert.Contains(ecran.RenderedTexts, "PHRASE SERVIE DU PLAFOND");
            // « Attacher » masqué (mode ordre) : sa raison s'éteint, mais le recrutement montre encore la MÊME phrase ⇒ elle reste
            ecran.OuvrirModeOrdre();
            Assert.AreEqual("", ecran.AttachReason);
            CollectionAssert.Contains(ecran.RenderedTexts, "PHRASE SERVIE DU PLAFOND", "une autre raison la montre encore");
            ecran.OuvrirModeOrdre();
            // réouverture : plus aucune raison affichée ⇒ plus aucune phrase de raison dans le corpus
            ecran.AppliquerHostEligibilite(HostEligibilite.LireCorps(Bandes("AVAILABLE", "ROOM")));
            Assert.AreEqual("", ecran.RecruitReason);
            CollectionAssert.DoesNotContain(ecran.RenderedTexts, "PHRASE SERVIE DU PLAFOND", "la phrase cachée est purgée à la réouverture");
        }
}
}
