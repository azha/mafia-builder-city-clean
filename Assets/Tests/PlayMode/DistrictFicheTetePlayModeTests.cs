using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using TMPro;
using UnityEngine;
using MafiaCleanCity.CityMap;
using MafiaCleanCity.I18n;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.CityMap.Tests
{
    // ①-2 (2026-09-23, écart ① `e2bd7681` §2 M12, M13) — la tête de la fiche :
    //   T1  le titre est l'ENSEIGNE seule (« LE VERGE D'OR » de la maquette), pas le nom composé de 37 glyphes (r9 m5) ;
    //       sans enseigne, le nom composé puis le type — jamais un nom deviné ; en capitales, comme la maquette l'écrit
    //   T2  le sous-titre est la ligne « type · lieu » de l'atelier (`district.fiche.type_lieu`, `.rang`) : type servi, district
    //       et îlot des params de `name_i18n` ; sans lieu, le type seul ; plus jamais « OPÉRATIONNEL »
    //   T3  UN mot par type pour ① et ② : `building.type.*`, repli = les 12 mots de l'atelier (22 §7.1 B)
    [Category("EcranDistrict")]
    public class DistrictFicheTetePlayModeTests
    {
        private readonly List<GameObject> montes = new List<GameObject>();

        [TearDown]
        public void TearDown()
        {
            I18nCatalog.Oublier();
            foreach (GameObject g in montes) if (g != null) Object.DestroyImmediate(g);
            montes.Clear();
        }

        private static DistrictInteriorBuildingDto Hub(string enseigne, string conversion = "OPERATIONAL") => new DistrictInteriorBuildingDto
        {
            building = "b-hub", block_id = 0, operational_type = "distribution_hub", conversion_band = conversion,
            shell_state = "STANDING", condition_band = "SOUND", revenue_band = "IDLE", revenue_chain = "UNWIRED", activity_band = "IDLE",
            lapse_phase_bucket = "WITHIN_WINDOW", maintenance_in_progress = false, lieutenant_ids = new string[0],
            name_i18n = enseigne == null ? null : new DistrictBuildingNameI18nDto
            {
                key = "game.fiction.building.name",
                @params = new DistrictBuildingNameParamsDto { enseigne = enseigne, district = "Les Bassins", block = "1" },
            },
        };

        [Test]
        public void T1_LeTitre_LEnseigneSeule()
        {
            Assert.AreEqual("Transit Marrek", DistrictInteriorScreenController.TitreDeFiche(Hub("Transit Marrek")));
            Assert.AreEqual(LibellesBatiment.Type("distribution_hub"), DistrictInteriorScreenController.TitreDeFiche(Hub(null)),
                "sans nom servi : le type, jamais un nom deviné");

            var host = new GameObject("DistrictHost", typeof(RectTransform));
            montes.Add(host);
            var ecran = host.AddComponent<DistrictInteriorScreenController>();
            var b = Hub("Transit Marrek");
            ecran.Render(new DistrictInteriorDto
            {
                district = "district-1", district_id = 1, profile = "lattice", name_canonical = "Test", bank_side = "north",
                grid = new DistrictInteriorGridDto { width = 1, height = 1 },
                blocks = new[] { new DistrictInteriorBlockDto { block_id = 0, x = 0, y = 0 } },
                buildings = new[] { b }, day_phase = "NIGHT",
            });
            if (ecran.ScreenRoot != null) montes.Add(ecran.ScreenRoot.gameObject);
            ecran.OuvrirFiche(b);
            TextMeshProUGUI titre = ecran.ScreenRoot.GetComponentsInChildren<TextMeshProUGUI>(true).First(t => t.gameObject.name == "Titre"
                && t.transform.parent != null && t.transform.parent.name == "Corps");
            Assert.AreEqual("Transit Marrek", titre.text);
            Assert.IsTrue((titre.fontStyle & FontStyles.UpperCase) != 0, "la maquette écrit le titre en capitales (r2 m5)");
        }

        [Test]
        public void T2_LeSousTitre_TypeEtLieu()
        {
            Assert.AreEqual("Relais · Les Bassins, îlot 1", DistrictInteriorScreenController.SousTitreDeFiche(Hub("X")),
                "la ligne « type · lieu » de l'atelier (repli fr)");
            StringAssert.DoesNotContain("OPÉRATIONNEL", DistrictInteriorScreenController.SousTitreDeFiche(Hub("X")));
            Assert.AreEqual("Relais", DistrictInteriorScreenController.SousTitreDeFiche(Hub(null)), "sans lieu servi : le type seul");

            var rang = Hub("X");
            rang.name_i18n.@params.rang = "2";
            Assert.AreEqual("Relais · Les Bassins, îlot 1, n° 2", DistrictInteriorScreenController.SousTitreDeFiche(rang));

            I18nCatalog.ChargerPourTest("en", new Dictionary<string, string>
            {
                { "building.type.distribution_hub", "Distribution hub" },
                { "district.fiche.type_lieu", "{type} · {district}, block {block}" },
            });
            Assert.AreEqual("Distribution hub · Les Bassins, block 1", DistrictInteriorScreenController.SousTitreDeFiche(Hub("X")),
                "les clés servies : le type ET le gabarit");
        }

        [Test]
        public void T3_UnMotParType_LesMotsDeLAtelier()
        {
            var attendus = new Dictionary<string, string>
            {
                { "lab", "Labo" }, { "stash", "Réserve" }, { "front_shop", "Commerce-écran" }, { "cash_safehouse", "Planque" },
                { "dealer_spot_front", "Coin de vente" }, { "specialized_lab", "Labo spécialisé" }, { "refinery", "Raffinerie" },
                { "grow_house", "Serre" }, { "distribution_hub", "Relais" }, { "money_holding", "Banque" },
                { "press_house", "Imprimerie" }, { "office", "Agence" },
            };
            foreach (var kv in attendus)
                Assert.AreEqual(kv.Value, LibellesBatiment.Type(kv.Key), $"« {kv.Key} » : le mot de `building.type.*` (atelier 22 §7.1 B)");
            I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string> { { "building.type.stash", "Réserve servie" } });
            Assert.AreEqual("Réserve servie", LibellesBatiment.Type("stash"), "la clé servie l'emporte");
        }
    }
}
