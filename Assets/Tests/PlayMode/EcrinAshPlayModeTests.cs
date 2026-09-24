using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using TMPro;
using UnityEngine;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Operational;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.CityMap.Tests
{
    // ② lot 5 (2026-09-23, écart ② `c4520078`, cadres 92-94) — L'ÉCRIN D'ASH avec ce qui est servi, sans réseau :
    //   E1  le titre et la phrase suivent le statut servi (réservé, honoré, passé) ; hors domaine : aucun titre plutôt qu'un faux
    //   E2  le GAIN : 5 pastilles, les 6 valeurs servies ont 6 comptes DISTINCTS (tranché (e)) — PENDING n'allume rien (pas encore de
    //       valeur), NONE → 1 (cadre 94), PREMIUM → 5 (cadre 93) ; et le mot servi à côté
    //   E3  « L’atelier » (D14) sous la clé INCHANGÉE `building.row.taille_du_labo`, et les paliers disent les mots servis
    //       (de base / amélioré / au meilleur niveau)
    //   E4  rendu : un specialized_lab avec un rendez-vous honoré montre titre, phrase, tampon, pastilles
    [Category("FicheBatiment")]
    public class EcrinAshPlayModeTests
    {
        private readonly List<GameObject> montes = new List<GameObject>();

        [SetUp] public void SansCatalogue() { I18nCatalog.Oublier(); Libelle.RemettreLesCompteurs(); }

        [TearDown]
        public void TearDown()
        {
            foreach (GameObject g in montes) if (g != null) Object.DestroyImmediate(g);
            montes.Clear();
            I18nCatalog.Oublier();
        }

        private static readonly string[] Payout6 = { "PENDING", "NONE", "MODEST", "FAIR", "STRONG", "PREMIUM" };   // ash-appointment.service.ts:53

        private Transform Rendre(string statut, string gain, string palier = "REFINED", string purete = null)
        {
            var host = new GameObject("FicheHost", typeof(RectTransform), typeof(Canvas));   // un Canvas À NOUS : aucun ne fuit
            montes.Add(host);
            var fiche = host.AddComponent<BuildingCardController>();
            fiche.SetBaseUrl("http://127.0.0.1:9");
            fiche.SetMountParent(host.transform);
            fiche.RendrePourTest(new BuildingCardDto
            {
                building = "b-ash", setup_state = "OPERATIONAL", cover_band = "WEAK", operational = true, operational_type = "specialized_lab",
                structural_state = "OPERATIONAL", seized_amount = "NONE", repair_cost = "NONE", raid_risk = "LOW", lab_tier_band = palier,
            }, storage: purete == null ? null : new StorageDto { substance_type = "ASH", purity_band = purete },
               rendezVous: statut == null ? null : new AppointmentDto { appointment_id = "a-1", status = statut, payout_band = gain });
            return host.transform;
        }

        private static Transform Trouver(Transform r, string nom) => r.GetComponentsInChildren<Transform>(true).FirstOrDefault(t => t.name == nom);
        private static string Texte(Transform r, string nom) => Trouver(r, nom)?.GetComponent<TextMeshProUGUI>().text;

        [Test]
        public void E1_LeTitreEtLaPhraseSuiventLeStatut()
        {
            Assert.AreEqual(("Un rendez-vous est pris", "Un client du district du Verre vous attend."),
                BuildingCardController.TitresDuRendezVous("SCHEDULED"));
            Assert.AreEqual(("Le rendez-vous est honoré", "La marchandise est partie, le client a payé."),
                BuildingCardController.TitresDuRendezVous("HONORED"));
            Assert.AreEqual(("Le rendez-vous est passé", "Personne n’y est allé. Il faudra en reprendre un."),
                BuildingCardController.TitresDuRendezVous("EXPIRED"));
            foreach (string hors in new[] { null, "", "__HORS_DOMAINE__" })
                Assert.AreEqual(((string)null, (string)null), BuildingCardController.TitresDuRendezVous(hors), $"« {hors} » : aucun titre");
        }

        [Test]
        public void E2_LeGain_SixValeursSixComptesDistincts()
        {
            int[] comptes = Payout6.Select(BuildingCardController.PastillesDuGain).ToArray();
            CollectionAssert.AreEqual(new[] { 0, 1, 2, 3, 4, 5 }, comptes, "PENDING rien ; NONE (cadre 94) 1 … PREMIUM (cadre 93) 5");
            Assert.AreEqual(Payout6.Length, comptes.Distinct().Count(), "tranché (e) : chaque valeur servie reste distinguable");
            Assert.That(comptes.All(c => c <= BuildingCardController.PastillesGain), "5 pastilles suffisent : aucune 6ᵉ à dessiner");
            Assert.AreEqual(0, BuildingCardController.PastillesDuGain("__HORS_DOMAINE__"), "hors domaine : rien d'allumé, le mot du repli dit le reste");
        }

        [Test]
        public void E3_LAtelier_SousLaCleInchangee_EtLesMotsServisDesPaliers()
        {
            CollectionAssert.AreEqual(new[] { "de base", "amélioré", "au meilleur niveau" },
                new[] { "BASIC", "REFINED", "MASTER" }.Select(BuildingCardController.LabTierLabel).ToArray());
            Transform r = Rendre(null, null);
            Transform ligne = Trouver(r, "Row_taille_du_labo");
            Assert.AreEqual("L’atelier", ligne.Find("Label").GetComponent<TextMeshProUGUI>().text);
            Assert.AreEqual("amélioré", ligne.Find("Value").GetComponent<TextMeshProUGUI>().text);
            Assert.IsTrue(Libelle.ClesEnRepli.Contains("building.row.taille_du_labo"), "la clé reste celle que le back sert");
            Assert.IsFalse(Libelle.ClesEnRepli.Contains("building.row.l_atelier"), "le mot neuf ne dérive PAS une clé neuve");

            I18nCatalog.ChargerPourTest("en", new Dictionary<string, string> { ["building.row.taille_du_labo"] = "The workshop" });
            Assert.AreEqual("The workshop", Trouver(Rendre(null, null), "Row_taille_du_labo").Find("Label").GetComponent<TextMeshProUGUI>().text);
        }

        [Test]
        public void E4_LEcrinHonore_TitrePhraseTamponPastilles()
        {
            Transform r = Rendre("HONORED", "PREMIUM", "MASTER", "CRYSTALLINE");
            Assert.AreEqual("Le rendez-vous est honoré", Texte(r, "TitreDuRendezVous"));
            Assert.AreEqual("La marchandise est partie, le client a payé.", Texte(r, "PhraseDuRendezVous"));
            Assert.AreEqual("Honoré", Trouver(r, "Row_rendez_vous").Find("Value").GetComponent<TextMeshProUGUI>().text, "le tampon");
            Transform gain = Trouver(r, "Row_gain");
            Assert.AreEqual(5, gain.Find("Crans").childCount);
            Assert.AreEqual(5, gain.Find("Crans").Cast<Transform>().Count(c => c.name == "CranAllume"), "cadre 93 : 5/5");
            Assert.AreEqual("Exceptionnel", gain.Find("Value").GetComponent<TextMeshProUGUI>().text);
            Assert.AreEqual("au meilleur niveau", Trouver(r, "Row_taille_du_labo").Find("Value").GetComponent<TextMeshProUGUI>().text);

            Transform reserve = Rendre("SCHEDULED", "PENDING");
            Assert.AreEqual("Un rendez-vous est pris", Texte(reserve, "TitreDuRendezVous"));
            Assert.AreEqual(0, Trouver(reserve, "Row_gain").Find("Crans").Cast<Transform>().Count(c => c.name == "CranAllume"),
                "réservé : pas encore de valeur, rien d'allumé");
            Assert.AreEqual("En attente", Trouver(reserve, "Row_gain").Find("Value").GetComponent<TextMeshProUGUI>().text);

            Assert.IsNull(Trouver(Rendre(null, null), "TitreDuRendezVous"), "sans rendez-vous suivi : pas d'écrin");
        }

        [Test]
        public void E5_LaCompositionRegroupeVitrineMatiereEtBillet_SansInventerDeLieu()
        {
            Transform r = Rendre("HONORED", "PREMIUM", "MASTER", "CRYSTALLINE");
            Transform ecrin = Trouver(r, "EcrinAsh");
            Assert.IsNotNull(ecrin, "un rendez-vous Ash ouvre une composition dédiée");
            Assert.IsNotNull(ecrin.Find("VitrineAsh"), "la vitrine est une primitive UI de la composition");
            Transform billet = ecrin.Find("BilletRendezVous");
            Assert.IsNotNull(billet, "tampon et gain vivent sur le même billet");
            Assert.AreEqual(billet, Trouver(r, "Row_rendez_vous").parent);
            Assert.AreEqual(billet, Trouver(r, "Row_gain").parent);
            Assert.AreEqual(ecrin, Trouver(r, "Row_substance").parent);
            Assert.AreEqual(ecrin, Trouver(r, "Row_taille_du_labo").parent);
            Assert.AreEqual(ecrin, Trouver(r, "Row_purete").parent);
            // La ligne SERVIE (`building.row.rendez_vous`), mise en capitales par le RENDU seulement (FontStyles.UpperCase) ; aucun nom
            // de district : la route du rendez-vous n'en sert pas (correctif du 24/09).
            Assert.AreEqual("Rendez-vous", Texte(r, "BilletTitre"));
            Assert.IsTrue((Trouver(r, "BilletTitre").GetComponent<TMPro.TextMeshProUGUI>().fontStyle & TMPro.FontStyles.UpperCase) != 0,
                "capitales typographiques, comme la maquette ② (cadres 92-94)");
            Assert.IsNull(Trouver(r, "Row_mise_en_place"), "l'écrin ne répète pas la fiche technique pendant le rendez-vous");
            Assert.IsNull(Trouver(r, "Row_risque_de_descente"));
            Assert.IsNull(Trouver(r, "Action_agrandir_le_labo"), "aucun geste de gestion ne parasite l'état de vente");
            Assert.IsNull(Trouver(r, "Action_ouvrir"));
            Assert.IsFalse(r.GetComponentsInChildren<TextMeshProUGUI>(true).Any(t =>
                t.text.Contains("Verrerie Kestrel") || t.text.Contains("Salon Aldrich") || t.text.Contains("Le Cintre")),
                "les noms de lieux de la maquette restent des exemples tant que le back ne sert aucun lieu");

            Transform sansRendezVous = Rendre(null, null);
            Assert.IsNull(Trouver(sansRendezVous, "EcrinAsh"), "sans rendez-vous, la fiche technique ordinaire reste inchangée");
            Assert.IsNull(Trouver(sansRendezVous, "VitrineAsh"));
            Assert.IsNull(Trouver(sansRendezVous, "BilletRendezVous"));
            Assert.IsNotNull(Trouver(sansRendezVous, "Row_mise_en_place"));
            Assert.IsNotNull(Trouver(sansRendezVous, "Action_agrandir_le_labo"));
            Assert.IsNotNull(Trouver(sansRendezVous, "Action_ouvrir"));

            Transform reserve = Rendre("SCHEDULED", "PENDING", "REFINED", "PURE");
            Assert.IsNotNull(Trouver(reserve, "Action_honorer_le_rendez_vous"), "réservé : le seul geste de l'écrin est vivant");
        }
    }
}
