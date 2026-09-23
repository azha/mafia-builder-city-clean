using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Operational;
using Geste = MafiaCleanCity.Operational.BuildingCardController.GesteDuPupitre;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.CityMap.Tests
{
    // ② lot 2 (2026-09-23, écart ② `c4520078`, cadres 39, 40, 41, 43) — UN GESTE SELON L'ÉTAT du pupitre, sans réseau :
    //   G1  la table des états : la cuisson prime (une cuve qui tourne n'appelle aucun geste, même étagère vide) ; à IDLE l'étagère décide ;
    //       cuisson non lue ou hors domaine ⇒ aucun geste
    //   G2  étagère vide ⇒ UN bouton « Commander du {précurseur SERVI} » (la clé dérive du précurseur servi) + « il en faut avant de
    //       rallumer » ; pas d'« Allumer »
    //   G3  « Allumer le feu » : le `lab` Brindle sans passes ; le `specialized_lab` Ash avec sa réplique, « Passes » (4 crans = 0..3,
    //       tranché (e)) et « ça consomme un lot de lys de verre »
    //   G4  en cuisson : AUCUN bouton du pupitre, le refus DIT avant (« Rien à faire ici. », « Repassez quand ce sera tiré »)
    //   G5  prêt : « Faire sortir la marchandise » DESSINÉ mais GRISÉ (manque du back n°5), « vers les coursiers »
    //   G6  les passes : crans et compte suivent le réglage ; le compte passe par la clé ICU servie `building.bloc.passes_compte`
    //   G7  chaque état demande EXACTEMENT ses clés servies de la table 37 (aucune clé inventée par le client)
    [Category("FicheBatiment")]
    public class GesteDuPupitrePlayModeTests
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

        private static BuildingCardDto Carte(string type) => new BuildingCardDto
        {
            building = "b-lab", setup_state = "OPERATIONAL", cover_band = "WEAK", operational = true, operational_type = type,
            structural_state = "OPERATIONAL", seized_amount = "NONE", repair_cost = "NONE", raid_risk = "LOW",
            lab_tier_band = type == "specialized_lab" ? "BASIC" : "NONE",
        };

        private (BuildingCardController fiche, Transform racine) Rendre(string type, string feu, string etagere, string precurseur,
                                                                       int passes = 0)
        {
            var host = new GameObject("FicheHost", typeof(RectTransform), typeof(Canvas));   // un Canvas À NOUS : aucun ne fuit
            montes.Add(host);
            var fiche = host.AddComponent<BuildingCardController>();
            fiche.SetBaseUrl("http://127.0.0.1:9");
            fiche.SetMountParent(host.transform);
            fiche.SetRefiningPasses(passes);   // avant le rendu : le sélecteur lit ce réglage
            fiche.RendrePourTest(Carte(type), null,
                feu == null ? null : new LabCookDto { building = "b-lab", cook_stage_band = feu },
                etagere == null ? null : new GetOperationalPrecursorsResponseDto { building = "b-lab", stock_band = etagere, precursor_type = precurseur });
            return (fiche, host.transform);
        }

        private static readonly string[] BoutonsDuPupitre = { "Action_commander", "Action_allumer_le_feu", "Action_faire_sortir_la_marchandise" };

        private static Transform[] Boutons(Transform r) =>
            r.GetComponentsInChildren<Transform>(true).Where(t => BoutonsDuPupitre.Contains(t.name)).ToArray();

        private static string Texte(Transform bouton) => bouton.Find("Label").GetComponent<TextMeshProUGUI>().text;

        private static string[] Lignes(Transform r, string nom) =>
            r.GetComponentsInChildren<TextMeshProUGUI>(true).Where(t => t.name == nom).Select(t => t.text).ToArray();

        [Test]
        public void G1_LaTableDesEtats()
        {
            Assert.AreEqual(Geste.Commander, BuildingCardController.GesteSelonLEtat("IDLE", "NONE"));
            foreach (string s in new[] { "LOW", "MEDIUM", "HIGH" })
                Assert.AreEqual(Geste.Allumer, BuildingCardController.GesteSelonLEtat("IDLE", s), s);
            Assert.AreEqual(Geste.Allumer, BuildingCardController.GesteSelonLEtat("IDLE", null),
                "étagère non lue : le serveur tranche (422), le client n'invente pas un vide");
            foreach (string f in new[] { "EARLY", "MID", "LATE" })
            foreach (string s in new[] { "NONE", "HIGH", null })
                Assert.AreEqual(Geste.EnCuisson, BuildingCardController.GesteSelonLEtat(f, s), $"{f}/{s} : la cuisson prime");
            Assert.AreEqual(Geste.FaireSortir, BuildingCardController.GesteSelonLEtat("DONE", "NONE"));
            foreach (string f in new[] { null, "", "__HORS_DOMAINE__" })
                Assert.AreEqual(Geste.Aucun, BuildingCardController.GesteSelonLEtat(f, "HIGH"), $"« {f} » : aucun geste");
        }

        [Test]
        public void G2_EtagereVide_UnSeulGeste_CommanderLePrecurseurServi()
        {
            var (fiche, r) = Rendre("lab", "IDLE", "NONE", "PYRALIN");
            Assert.AreEqual(Geste.Commander, fiche.GesteDuPupitreAffiche);
            Transform[] b = Boutons(r);
            Assert.AreEqual(1, b.Length, "UN geste");
            Assert.AreEqual("Action_commander", b[0].name);
            Assert.AreEqual("Commander du Pyralin", Texte(b[0]), "le mot du précurseur SERVI (repli : le mot du catalogue)");
            CollectionAssert.Contains(Lignes(r, "Bloc"), "il en faut avant de rallumer");

            // Le précurseur vient du SERVI : un specialized_lab à étagère vide commande SON précurseur.
            var (_, ra) = Rendre("specialized_lab", "IDLE", "NONE", "GLASS_LILY");
            Assert.AreEqual("Commander du Lys de verre", Texte(Boutons(ra).Single()));
            Assert.IsTrue(Libelle.ClesEnRepli.Contains("building.action.commander_du_glass_lily"),
                "la clé du geste dérive du précurseur servi — non servie pour le lys : elle se voit, elle ne se cache pas");
        }

        [Test]
        public void G3_Allumer_LeLaboSansPasses_LAshAvecSesPasses()
        {
            var (brindle, rb) = Rendre("lab", "IDLE", "LOW", "PYRALIN");
            Assert.AreEqual(Geste.Allumer, brindle.GesteDuPupitreAffiche);
            Assert.AreEqual("Allumer le feu", Texte(Boutons(rb).Single()));
            Assert.IsNull(rb.GetComponentsInChildren<Transform>(true).FirstOrDefault(t => t.name == "Row_passes"),
                "un lab Brindle n'a pas de passes (tranché (a) ; 422 au-delà de 0)");
            Assert.IsEmpty(Lignes(rb, "Replique"));
            Assert.IsEmpty(Lignes(rb, "Bloc"), "« ça consomme un lot de lys de verre » nomme le précurseur d'Ash : pas sur un lab");

            var (_, ra) = Rendre("specialized_lab", "IDLE", "MEDIUM", "GLASS_LILY");
            Assert.AreEqual("Allumer le feu", Texte(Boutons(ra).Single()));
            Transform passes = ra.GetComponentsInChildren<Transform>(true).FirstOrDefault(t => t.name == "Row_passes");
            Assert.IsNotNull(passes, "l'Ash choisit ses passes avant d'allumer");
            Assert.AreEqual("Passes", passes.Find("Label").GetComponent<TextMeshProUGUI>().text);
            Assert.AreEqual(4, passes.Find("Crans").childCount, "tranché (e) : 4 crans = le domaine 0..3");
            CollectionAssert.AreEqual(new[] { "« L’étagère est refaite. Dites-moi combien de passes, et j’allume. »" }, Lignes(ra, "Replique"));
            CollectionAssert.Contains(Lignes(ra, "Bloc"), "ça consomme un lot de lys de verre");
            Assert.IsFalse(ra.GetComponentsInChildren<TextMeshProUGUI>(true).Any(t => t.text.Contains("Refine") || t.text.Contains("PASSES DE")),
                "plus de « - Refine » / « PASSES DE RAFFINAGE » (anglais et FAUX à l'écart)");
        }

        [Test]
        public void G4_EnCuisson_AucunBouton_LeRefusDitAvant()
        {
            var (fiche, r) = Rendre("lab", "MID", "NONE", "PYRALIN");
            Assert.AreEqual(Geste.EnCuisson, fiche.GesteDuPupitreAffiche);
            Assert.IsEmpty(Boutons(r), "une cuve qui tourne : ni commande ni allumage — le 409 est dit, pas provoqué");
            CollectionAssert.AreEqual(new[] { "Rien à faire ici.", "Repassez quand ce sera tiré" }, Lignes(r, "Bloc"));
            CollectionAssert.AreEqual(new[] { "« Ça monte comme il faut. Si j’ouvre maintenant, je perds tout. »",
                                              "— et ne me lancez pas une deuxième cuve tant que celle-là tourne." }, Lignes(r, "Replique"));
        }

        [Test]
        public void G5_Pret_FaireSortir_DessineMaisGrise()
        {
            var (fiche, r) = Rendre("lab", "DONE", "LOW", "PYRALIN");
            Assert.AreEqual(Geste.FaireSortir, fiche.GesteDuPupitreAffiche);
            Transform sortir = Boutons(r).Single();
            Assert.AreEqual("Faire sortir la marchandise", Texte(sortir));
            Assert.IsFalse(sortir.GetComponent<Button>().interactable, "manque du back n°5 (destination, quantité) : pas vivant");
            CollectionAssert.AreEqual(new[] { "vers les coursiers" }, Lignes(r, "Bloc"));

            var (aucun, ra) = Rendre("lab", null, "LOW", "PYRALIN");
            Assert.AreEqual(Geste.Aucun, aucun.GesteDuPupitreAffiche);
            Assert.IsEmpty(Boutons(ra), "cuisson non lue : aucun geste proposé sur un état inconnu");
        }

        [Test]
        public void G6_LesPasses_CransEtCompteSuiventLeReglage()
        {
            CollectionAssert.AreEqual(new[] { "pas du tout", "1 passe", "2 passes", "3 passes" },
                Enumerable.Range(0, 4).Select(BuildingCardController.RefiningPassesLabel).ToArray());
            var (_, r) = Rendre("specialized_lab", "IDLE", "HIGH", "GLASS_LILY", passes: 2);
            Transform row = r.GetComponentsInChildren<Transform>(true).First(t => t.name == "Row_passes");
            Assert.AreEqual(3, row.Find("Crans").Cast<Transform>().Count(c => c.name == "CranAllume"), "2 passes : les crans 0, 1 et 2");
            Assert.AreEqual("2 passes", row.Find("Value").GetComponent<TextMeshProUGUI>().text);

            I18nCatalog.ChargerPourTest("en", new Dictionary<string, string>
            {
                ["building.bloc.passes_compte"] = "{passes, plural, =0 {not at all} one {# pass} other {# passes}}",
            });
            Assert.AreEqual("1 pass", BuildingCardController.RefiningPassesLabel(1), "le pluriel ICU servi");
            Assert.AreEqual("not at all", BuildingCardController.RefiningPassesLabel(0));
        }

        [Test]
        public void G7_ChaqueEtatDemandeExactementSesClesServies()
        {
            var attendues = new Dictionary<(string type, string feu, string etagere), string[]>
            {
                // le repli du geste demande AUSSI le mot du précurseur (`building.precursor.*`) : c'est lui qu'il compose
                [("lab", "IDLE", "NONE")] = new[] { "building.action.commander_du_pyralin", "building.precursor.pyralin",
                    "building.bloc.il_en_faut_avant_de_rallumer" },
                [("lab", "IDLE", "LOW")] = new[] { "building.action.allumer_le_feu" },
                [("specialized_lab", "IDLE", "LOW")] = new[] { "building.action.allumer_le_feu", "building.replique.l_etagere_est_refaite_dites_moi_combien_de_passes_et_j_allume",
                    "building.row.passes", "building.bloc.passes_compte", "building.bloc.ca_consomme_un_lot_de_lys_de_verre" },
                [("lab", "MID", "LOW")] = new[] { "building.bloc.rien_a_faire_ici", "building.bloc.repassez_quand_ce_sera_tire",
                    "building.replique.ca_monte_comme_il_faut_si_j_ouvre_maintenant_je_perds_tout",
                    "building.replique.et_ne_me_lancez_pas_une_deuxieme_cuve_tant_que_celle_la_tourne" },
                [("lab", "DONE", "LOW")] = new[] { "building.action.faire_sortir_la_marchandise", "building.bloc.vers_les_coursiers",
                    "building.replique.c_est_tire_ca_ne_peut_pas_dormir_ici_chaque_nuit_que_ca_reste_c_est_une_nuit_de_trop" },
            };
            // Le FOND : les clés du reste de la fiche, mesurées sur la MÊME fiche sans cuisson lue (aucun geste), puis retirées ; seule
            // l'échelle « le feu » (absente du fond) est retirée par son nom.
            foreach (var kv in attendues)
            {
                string precurseur = kv.Key.type == "lab" ? "PYRALIN" : "GLASS_LILY";
                Libelle.RemettreLesCompteurs();
                Rendre(kv.Key.type, null, kv.Key.etagere, precurseur);
                var fond = new HashSet<string>(Libelle.ClesEnRepli);
                Libelle.RemettreLesCompteurs();
                Rendre(kv.Key.type, kv.Key.feu, kv.Key.etagere, precurseur);
                var propres = Libelle.ClesEnRepli.Where(k => !fond.Contains(k) && k != "building.row.le_feu"
                                                             && !k.StartsWith("building.cook_stage.")).ToArray();
                CollectionAssert.AreEquivalent(kv.Value, propres, $"{kv.Key} : les clés du geste, exactement");
            }
        }
    }
}
