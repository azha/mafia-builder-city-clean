using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using TMPro;
using UnityEngine;
using MafiaCleanCity.CityMap;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.CityMap.Tests
{
    // ①-1 (2026-09-23, écart ① `e2bd7681` §2 M14-M16 ; mots de l'atelier `22-…` §7.1 A) — les trois cases de la fiche reprennent
    // les titres du canon et la bande servie qui répond à chacun (elles avaient glissé d'un cran : REVENU · CHAÎNE · ÉTAT) :
    //   C1  « À COLLECTER » = `harvest_band` (Rien / Prêt / Plein, or-vif / braise / crème-2) ; « REVENUS » = `revenue_band` ;
    //       hors domaine « — » ; la clé servie l'emporte
    //   C2  sur l'écran rendu : les trois titres, les trois valeurs, les trois teintes — la 3ᵉ = le bucket du DISTRICT (point 7)
    //   C3  UNE famille de mots de chaleur (`heat.bucket.*`) pour le médaillon et la case ; « — » sans donnée
    [Category("EcranDistrict")]
    public class DistrictFicheCasesPlayModeTests
    {
        private readonly List<GameObject> montes = new List<GameObject>();

        [TearDown]
        public void TearDown()
        {
            I18nCatalog.Oublier();
            foreach (GameObject g in montes) if (g != null) Object.DestroyImmediate(g);
            montes.Clear();
        }

        [Test]
        public void C1_ACollecter_Revenus_LesBandesServies()
        {
            Assert.AreEqual("Rien", DistrictInteriorScreenController.ValeurACollecter("NOTHING"));
            Assert.AreEqual("Prêt", DistrictInteriorScreenController.ValeurACollecter("AVAILABLE"));
            Assert.AreEqual("Plein", DistrictInteriorScreenController.ValeurACollecter("FULL"));
            Assert.AreEqual("—", DistrictInteriorScreenController.ValeurACollecter(null), "hors domaine : jamais un mot deviné");
            Assert.AreEqual(DesignTokens.Current.hudMoneyGold, DistrictInteriorScreenController.TeinteACollecter("AVAILABLE"), "l'argent");
            Assert.AreEqual(DesignTokens.Current.hudGaugeArcHot, DistrictInteriorScreenController.TeinteACollecter("FULL"), "quelque chose s'est arrêté");
            Assert.AreEqual(DesignTokens.Current.hudCremeSecondary, DistrictInteriorScreenController.TeinteACollecter("NOTHING"));
            Assert.AreEqual("Au repos", DistrictInteriorScreenController.ValeurRevenus("IDLE"));
            Assert.AreEqual("Rapporte", DistrictInteriorScreenController.ValeurRevenus("EARNING"));
            Assert.AreEqual("—", DistrictInteriorScreenController.ValeurRevenus("SOMETHING"));

            I18nCatalog.ChargerPourTest("en", new Dictionary<string, string>
                { { "district.harvest.available", "Ready" }, { "district.revenue.earning", "Earning" } });
            Assert.AreEqual("Ready", DistrictInteriorScreenController.ValeurACollecter("AVAILABLE"));
            Assert.AreEqual("Earning", DistrictInteriorScreenController.ValeurRevenus("EARNING"));
        }

        [Test]
        public void C2_SurLEcran_TroisTitres_TroisValeurs_TroisTeintes()
        {
            var host = new GameObject("DistrictHost", typeof(RectTransform));
            montes.Add(host);
            var ecran = host.AddComponent<DistrictInteriorScreenController>();
            var b = new DistrictInteriorBuildingDto
            {
                building = "b-1", block_id = 0, operational_type = "front_shop", conversion_band = "OPERATIONAL", shell_state = "STANDING",
                condition_band = "SOUND", revenue_band = "EARNING", revenue_chain = "WIRED", activity_band = "ACTIVE",
                harvest_band = "AVAILABLE", lapse_phase_bucket = "WITHIN_WINDOW", lieutenant_ids = new string[0],
            };
            ecran.Render(new DistrictInteriorDto
            {
                district = "district-1", district_id = 1, profile = "lattice", name_canonical = "Test", bank_side = "north",
                grid = new DistrictInteriorGridDto { width = 1, height = 1 },
                blocks = new[] { new DistrictInteriorBlockDto { block_id = 0, x = 0, y = 0 } },
                buildings = new[] { b }, day_phase = "NIGHT",
            });
            if (ecran.ScreenRoot != null) montes.Add(ecran.ScreenRoot.gameObject);
            ecran.PoserChaleurPourTest(new DistrictHeatDto { district = "district-1", district_bucket = "HOT", citywide_bucket = "WARM" });
            ecran.OuvrirFiche(b);

            TextMeshProUGUI[] dansCorps = ecran.ScreenRoot.GetComponentsInChildren<TextMeshProUGUI>(true)
                .Where(t => t.transform.parent != null && t.transform.parent.name == "Corps").ToArray();
            string[] titres = dansCorps.Where(t => t.gameObject.name == "Libelle").Select(t => t.text).ToArray();
            TextMeshProUGUI[] valeurs = dansCorps.Where(t => t.gameObject.name == "Valeur").ToArray();
            CollectionAssert.AreEqual(new[] { "À COLLECTER", "REVENUS", "CHALEUR LOCALE" }, titres, "les titres du canon");
            CollectionAssert.AreEqual(new[] { "Prêt", "Rapporte", "Chaud" }, valeurs.Select(v => v.text).ToArray(),
                "harvest_band, revenue_band, et le bucket du DISTRICT (pas celui de la ville : WARM)");
            Assert.AreEqual(DesignTokens.Current.hudMoneyGold, valeurs[0].color);
            Assert.AreEqual(DesignTokens.Current.hudCreme, valeurs[1].color);
            Assert.AreEqual(DesignTokens.Current.hudGaugeArcHot, valeurs[2].color, "chaud : braise");
        }

        [Test]
        public void C3_UneFamilleDeMotsDeChaleur()
        {
            Assert.AreEqual("Froid", HeatBucketResolver.Label("COLD"));
            Assert.AreEqual("Brûlant", HeatBucketResolver.Label("BURNING"));
            Assert.AreEqual("—", HeatBucketResolver.Label(null), "sans donnée : un tiret, jamais un mot");
            Assert.AreEqual(MafiaCleanCity.I18n.Repli.EtatInconnu, HeatBucketResolver.Label("MYSTERY"), "une valeur inattendue se dit « état inconnu », jamais brute (règle f2)");
            I18nCatalog.ChargerPourTest("en", new Dictionary<string, string> { { "heat.bucket.hot", "Hot" } });
            Assert.AreEqual("Hot", HeatBucketResolver.Label("HOT"), "`heat.bucket.*` : la clé servie, pour le médaillon ET la case");
        }
    }
}
