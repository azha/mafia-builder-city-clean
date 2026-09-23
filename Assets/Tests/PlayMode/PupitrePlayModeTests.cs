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
    // ② lot 1 (2026-09-23, écart ② `c4520078`, cadres 39-44 bloc B2) — LE PUPITRE du labo : trois échelles de crans, sans réseau.
    //   P1  les crans suivent la bande : « le feu » 1→5 sur IDLE→DONE, « l'étagère » et « les caisses » 1→4 sur NONE→HIGH ; le premier
    //       cran TOUJOURS allumé, une valeur hors domaine n'allume que lui
    //   P2  la fiche d'un `lab` dessine les trois échelles, chacune avec SES crans et SON mot, depuis trois routes : `lab/:id` (le feu),
    //       `precursors?building_id` (l'étagère), `storage/:id` (les caisses — `product_band` arrivait déjà, jamais lu)
    //   P3  le pupitre suit le TYPE (tranché (a)) : `specialized_lab` l'a aussi, un `front_shop` jamais ; une donnée absente (route en
    //       erreur) ne dessine PAS son échelle — un cran allumé affirmerait un état qu'on n'a pas reçu
    //   P4  les libellés prennent les clés servies de la table 37 : `building.row.le_feu`, `.l_etagere`, `.les_caisses`
    [Category("FicheBatiment")]
    public class PupitrePlayModeTests
    {
        private readonly List<GameObject> montes = new List<GameObject>();

        [SetUp] public void SansCatalogue() => I18nCatalog.Oublier();   // les replis français, quel que soit le test d'avant

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

        private static LabCookDto Feu(string band) => new LabCookDto { building = "b-lab", substance_type = "BRINDLE", cook_stage_band = band };
        private static GetOperationalPrecursorsResponseDto Etagere(string band) =>
            new GetOperationalPrecursorsResponseDto { building = "b-lab", precursor_type = "PYRALIN", stock_band = band };
        private static StorageDto Caisses(string band) => new StorageDto { building = "b-lab", substance_type = "BRINDLE", product_band = band };

        /// <summary>Monte la fiche SANS réseau : `RendrePourTest` rend dans la même frame, avant tout `Start` (qui se connecterait).</summary>
        private Transform Rendre(BuildingCardDto carte, StorageDto s, LabCookDto l, GetOperationalPrecursorsResponseDto p)
        {
            var host = new GameObject("FicheHost", typeof(RectTransform), typeof(Canvas));   // un Canvas À NOUS : `BuildLayout` n'en fabrique pas un qui fuirait
            montes.Add(host);
            var fiche = host.AddComponent<BuildingCardController>();
            fiche.SetBaseUrl("http://127.0.0.1:9");
            fiche.SetMountParent(host.transform);
            fiche.RendrePourTest(carte, s, l, p);
            return host.transform;
        }

        private static Transform Ligne(Transform racine, string id) =>
            racine.GetComponentsInChildren<Transform>(true).FirstOrDefault(t => t.name == "Row_" + id);

        private static (int allumes, int total, string libelle, string mot) Lire(Transform ligne)
        {
            Transform crans = ligne.Find("Crans");
            int allumes = crans.Cast<Transform>().Count(c => c.name == "CranAllume");
            int total = crans.childCount;
            return (allumes, total, ligne.Find("Label").GetComponent<TextMeshProUGUI>().text,
                    ligne.Find("Value").GetComponent<TextMeshProUGUI>().text);
        }

        [Test]
        public void P1_LesCransSuiventLaBande_LePremierToujoursAllume()
        {
            string[] feu = { "IDLE", "EARLY", "MID", "LATE", "DONE" };
            CollectionAssert.AreEqual(new[] { 1, 2, 3, 4, 5 }, feu.Select(BuildingCardController.CransDuFeu).ToArray(),
                "un cran par valeur du domaine, dans l'ordre de la cuisson");
            Assert.AreEqual(feu.Length, BuildingCardController.CransFeu, "l'échelle a autant de crans que le domaine a de valeurs");
            string[] stock = { "NONE", "LOW", "MEDIUM", "HIGH" };
            CollectionAssert.AreEqual(new[] { 1, 2, 3, 4 }, stock.Select(BuildingCardController.CransDuStock).ToArray());
            Assert.AreEqual(stock.Length, BuildingCardController.CransStock);

            foreach (string horsDomaine in new[] { null, "", "__HORS_DOMAINE__" })
            {
                Assert.AreEqual(1, BuildingCardController.CransDuFeu(horsDomaine), $"« {horsDomaine} » : le premier cran seul");
                Assert.AreEqual(1, BuildingCardController.CransDuStock(horsDomaine));
            }
        }

        [Test]
        public void P2_LeLabo_DessineSesTroisEchelles_ChacuneAvecSesCransEtSonMot()
        {
            Transform r = Rendre(Carte("lab"), Caisses("LOW"), Feu("MID"), Etagere("NONE"));

            Transform feu = Ligne(r, "le_feu"), etagere = Ligne(r, "l_etagere"), caisses = Ligne(r, "les_caisses");
            Assert.IsNotNull(feu, "« le feu » : `lab/:id` est lu");
            Assert.IsNotNull(etagere, "« l'étagère » : `precursors?building_id` est lu");
            Assert.IsNotNull(caisses, "« les caisses » : `product_band`, reçu, est enfin dessiné");

            Assert.AreEqual((3, 5, "le feu", "Montée"), Lire(feu));
            Assert.AreEqual((1, 4, "l’étagère", "Vide"), Lire(etagere), "vide : le premier cran reste allumé");
            Assert.AreEqual((2, 4, "les caisses", "Faible"), Lire(caisses));

            // L'ordre du pupitre : le feu, l'étagère, les caisses (cadre 39).
            Assert.Less(feu.GetSiblingIndex(), etagere.GetSiblingIndex());
            Assert.Less(etagere.GetSiblingIndex(), caisses.GetSiblingIndex());
        }

        [Test]
        public void P3_LePupitreSuitLeType_EtUneDonneeAbsenteNeSeDessinePas()
        {
            Transform ash = Rendre(Carte("specialized_lab"), Caisses("HIGH"), Feu("DONE"), Etagere("MEDIUM"));
            Assert.AreEqual((5, 5, "le feu", "Prêt"), Lire(Ligne(ash, "le_feu")), "le specialized_lab a le même pupitre");
            Assert.AreEqual((3, 4, "l’étagère", "Moyen"), Lire(Ligne(ash, "l_etagere")));
            Assert.AreEqual((4, 4, "les caisses", "Haut"), Lire(Ligne(ash, "les_caisses")));

            Transform commerce = Rendre(Carte("front_shop"), Caisses("HIGH"), Feu("DONE"), Etagere("MEDIUM"));
            Assert.IsNull(Ligne(commerce, "le_feu"), "un commerce n'a pas de pupitre, même si on lui passe des données");
            Assert.IsNull(Ligne(commerce, "l_etagere"));
            Assert.IsNull(Ligne(commerce, "les_caisses"));

            Transform enErreur = Rendre(Carte("lab"), null, null, Etagere("LOW"));
            Assert.IsNull(Ligne(enErreur, "le_feu"), "`lab/:id` en erreur : pas d'échelle, plutôt qu'un « éteint » inventé");
            Assert.IsNull(Ligne(enErreur, "les_caisses"), "`storage/:id` en erreur : pas d'échelle");
            Assert.AreEqual((2, 4, "l’étagère", "Faible"), Lire(Ligne(enErreur, "l_etagere")), "contrôle positif : la donnée reçue se dessine");
        }

        [Test]
        public void P4_LesLibellesPrennentLesClesServiesDeLaTable37()
        {
            Assert.AreEqual("building.row.le_feu", Libelle.CleDe("building", "row", "le feu"));
            Assert.AreEqual("building.row.l_etagere", Libelle.CleDe("building", "row", "l’étagère"));
            Assert.AreEqual("building.row.les_caisses", Libelle.CleDe("building", "row", "les caisses"));

            Libelle.RemettreLesCompteurs();
            Rendre(Carte("lab"), Caisses("NONE"), Feu("IDLE"), Etagere("NONE"));
            foreach (string cle in new[] { "building.row.le_feu", "building.row.l_etagere", "building.row.les_caisses",
                                           "building.cook_stage.idle", "building.stock.none" })
                Assert.IsTrue(Libelle.ClesEnRepli.Contains(cle), $"sans catalogue, « {cle} » est DEMANDÉE (et comptée en repli)");

            // Servies (l'anglais de la table 37) : le libellé ET le mot viennent du catalogue — la clé du mot dérive de la VALEUR servie.
            I18nCatalog.ChargerPourTest("en", new Dictionary<string, string>
            {
                ["building.row.le_feu"] = "the fire", ["building.cook_stage.late"] = "Refining",
                ["building.row.l_etagere"] = "the shelf", ["building.stock.high"] = "High",
            });
            Transform r = Rendre(Carte("lab"), null, Feu("LATE"), Etagere("HIGH"));
            Assert.AreEqual((4, 5, "the fire", "Refining"), Lire(Ligne(r, "le_feu")));
            Assert.AreEqual((4, 4, "the shelf", "High"), Lire(Ligne(r, "l_etagere")));
        }
    }
}
