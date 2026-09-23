using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.CityMap;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.CityMap.Tests
{
    // ①-4 (2026-09-23, écart ① `e2bd7681` M4/M5/M9, D5 ; géométrie de l'atelier `22-…` §7.2) — la descente :
    //   G1  la lueur s'allume SEULEMENT la nuit, pendant une descente, sur un fond dont la voiture est relevée
    //   G2  sa teinte : `#ff5a3c`, et `hue-rotate(-140deg)` à mi-période (la matrice CSS : `#3e80ff`)
    //   G3  sa pose : centrée sur (410, 975) px de l'art, 165 × 99 px d'art, compensée par l'échelle, SOUS la scène
    //   G4  sur ① rendu (fond réel `verge`, nuit) : frère du fond, avant les cellules, le fond sans enfant ; rien sans descente
    //   T1  la barre : « DESCENTE », braise ; puis retour à l'état NOMMÉ (« CHALEUR », opacité pleine, aiguille sur sa bande)
    //   T2  le pouls (1 → .45 → 1 sur 1,1 s) et le tremblement (4° vers le chaud sur 0,14 s)
    //   T3  « Descente » passe par `Libelle` : la clé servie l'emporte
    [Category("EcranDistrict")]
    public class DistrictDescentePlayModeTests
    {
        private readonly List<Object> montes = new List<Object>();

        [TearDown]
        public void TearDown()
        {
            I18nCatalog.Oublier();
            foreach (Object o in montes) if (o != null) Object.DestroyImmediate(o);
            montes.Clear();
        }

        private Texture2D Art(string nom)
        {
            var t = new Texture2D(1080, 1920) { name = nom };
            montes.Add(t);
            return t;
        }

        [Test]
        public void G1_LaLueur_LaNuit_EnDescente_SurUnFondConnu()
        {
            Texture2D d = Art("VERGE_D_NUIT_FINAL");
            Assert.IsTrue(Gyrophare.DoitSAllumer(true, "nuit", d));
            Assert.IsFalse(Gyrophare.DoitSAllumer(false, "nuit", d), "pas de descente : pas de lueur");
            Assert.IsFalse(Gyrophare.DoitSAllumer(true, "jour", Art("VERGE_D_JOUR_FINAL")), "`.tel.jour .gyro{opacity:0}`");
            Assert.IsFalse(Gyrophare.DoitSAllumer(true, "nuit", Art("UN_AUTRE_FOND")),
                "un fond dont la voiture n'est pas relevée : aucune lueur devinée");
            Assert.IsFalse(Gyrophare.DoitSAllumer(true, "nuit", null));
        }

        [Test]
        public void G2_LaTeinte_EtSaRotation()
        {
            Color rouge = Gyrophare.Teinte;
            Assert.AreEqual(new Color32(0xff, 0x5a, 0x3c, 0xff), (Color32)rouge);
            Color32 bleu = Gyrophare.HueRotate(rouge, -140f);
            Assert.That(Mathf.Abs(bleu.r - 62) <= 1 && Mathf.Abs(bleu.g - 128) <= 1 && Mathf.Abs(bleu.b - 255) <= 1,
                $"`hue-rotate(-140deg)` de #ff5a3c = #3e80ff (matrice CSS) ; rendu {bleu}");
            Assert.AreEqual((Color32)rouge, (Color32)Gyrophare.TeinteA(0f), "0 % : la teinte du canon");
            Assert.AreEqual(bleu, (Color32)Gyrophare.TeinteA(0.45f), "50 % de 0,9 s : la rotation entière");
            Assert.AreEqual((Color32)rouge, (Color32)Gyrophare.TeinteA(0.9f), "100 % : retour");
        }

        [Test]
        public void G3_LaPose_CentreeSurLaVoiture_ALaTailleDuCanon()
        {
            var scene = new GameObject("Scene", typeof(RectTransform));
            montes.Add(scene);
            var fond = new GameObject("Fond", typeof(RectTransform));
            fond.transform.SetParent(scene.transform, false);
            var fondRt = (RectTransform)fond.transform;
            fondRt.anchoredPosition = new Vector2(10f, 20f);

            Gyrophare g = Gyrophare.Poser((RectTransform)scene.transform, fondRt, Art("VERGE_D_NUIT_FINAL"), 2f);
            Assert.IsNotNull(g);
            var rt = (RectTransform)g.transform;
            Assert.AreEqual(scene.transform, rt.parent, "frère du fond, jamais son enfant (pp-F6)");
            // (410 − 540, 960 − 975) / 2 = (−65, −7,5), plus la position du fond.
            Assert.AreEqual(new Vector2(-55f, 12.5f), rt.anchoredPosition);
            Assert.AreEqual(new Vector2(82.5f, 49.5f), rt.sizeDelta, "165 × 99 px d'art, à l'échelle 2");
            Image img = g.GetComponent<Image>();
            Assert.IsFalse(img.raycastTarget, "`pointer-events:none`");
            Assert.IsNull(Gyrophare.Poser((RectTransform)scene.transform, fondRt, Art("UN_AUTRE_FOND"), 2f));
        }

        private static DistrictInteriorDto Verge() => new DistrictInteriorDto
        {
            district = "district-16", district_id = 16, profile = "verge", name = "La Lisière", name_canonical = "Test",
            bank_side = "north", grid = new DistrictInteriorGridDto { width = 1, height = 1 },
            blocks = new[] { new DistrictInteriorBlockDto { block_id = 0, x = 0, y = 0 } },
            buildings = new DistrictInteriorBuildingDto[0], day_phase = "NIGHT",
        };

        [Test]
        public void G4_SurLEcranRendu_SousLaScene_AvantLesCellules()
        {
            var host = new GameObject("DistrictHost", typeof(RectTransform));
            montes.Add(host);
            var ecran = host.AddComponent<DistrictInteriorScreenController>();

            ecran.PoserChaleurPourTest(new DistrictHeatDto { district = "district-16", district_bucket = "WARM", escalated = false });
            ecran.Render(Verge());
            if (ecran.ScreenRoot != null) montes.Add(ecran.ScreenRoot.gameObject);
            Assert.IsFalse(ecran.GyrophareAllume, "sans descente, aucune lueur");
            Assert.IsNull(ecran.ScreenRoot.Find("DistrictScene/Gyrophare"));

            ecran.PoserChaleurPourTest(new DistrictHeatDto { district = "district-16", district_bucket = "WARM", escalated = true });
            ecran.Render(Verge());
            if (ecran.ScreenRoot != null) montes.Add(ecran.ScreenRoot.gameObject);
            Assert.IsTrue(ecran.GyrophareAllume, "la descente se voit dans la ville");
            Transform scene = ecran.ScreenRoot.Find("DistrictScene");
            Transform fond = scene.Find("DistrictBackgroundImage");
            Transform gyro = scene.Find("Gyrophare");
            Transform cellules = scene.Find("DistrictCells");
            Assert.IsNotNull(fond, "le fond réel de `verge`, la nuit");
            Assert.IsNotNull(gyro);
            Assert.AreEqual(0, fond.childCount, "pp-F6 : le fond ne porte aucun enfant");
            Assert.Greater(gyro.GetSiblingIndex(), fond.GetSiblingIndex(), "sur l'art");
            Assert.Less(gyro.GetSiblingIndex(), cellules.GetSiblingIndex(), "sous les marqueurs");

            DistrictInteriorDto jour = Verge();
            jour.day_phase = "DAY";
            ecran.Render(jour);
            if (ecran.ScreenRoot != null) montes.Add(ecran.ScreenRoot.gameObject);
            Assert.IsFalse(ecran.GyrophareAllume, "le jour, le canon l'éteint");
        }

        private TopBarController NouvelleBarre()
        {
            var go = new GameObject("TopBar", typeof(RectTransform));
            montes.Add(go);
            return go.AddComponent<TopBarController>();
        }

        [Test]
        public void T1_LaBarre_EnDescente_PuisRetourALEtatNomme()
        {
            TopBarController barre = NouvelleBarre();
            barre.SetCitywideHeatBucket("WARM");
            TextMeshProUGUI legende = barre.GetComponentsInChildren<TextMeshProUGUI>(true).First(t => t.gameObject.name == "GaugeCaption");
            Image cerclage = barre.GetComponentsInChildren<Image>(true).First(i => i.gameObject.name == "BoitierRing");
            Assert.AreEqual("CHALEUR", barre.GaugeCaptionText);
            Color braise = DesignTokens.Current.hudGaugeArcHot;

            barre.SetDescente(true);
            Assert.IsTrue(barre.Descente);
            Assert.AreEqual("DESCENTE", barre.GaugeCaptionText, "« Heat » devient « Descente » (état D du canon)");
            Assert.AreEqual(braise, legende.color, "`.tel.descente .heatlib{color:var(--braise)}`");
            Assert.AreEqual(new Color(braise.r, braise.g, braise.b), new Color(cerclage.color.r, cerclage.color.g, cerclage.color.b),
                "`.tel.descente .medaillon .boitier{border-color:var(--braise)}`, même dans une ville tiède");

            barre.SetDescente(false);
            Assert.IsFalse(barre.Descente);
            Assert.AreEqual("CHALEUR", barre.GaugeCaptionText);
            Assert.AreEqual(DesignTokens.Current.hudCremeSecondary, legende.color);
            Assert.AreEqual(1f, cerclage.color.a, 1e-4f, "opacité pleine, jamais la dernière image du battement");
            Assert.AreEqual(DesignTokens.Current.hudHairlineGold, cerclage.color, "ville tiède : le laiton calme");
            RectTransform aiguille = barre.GetComponentsInChildren<RectTransform>(true).First(r => r.gameObject.name == "Needle");
            Assert.AreEqual(barre.HeatNeedleAngleDegrees, Mathf.DeltaAngle(0f, aiguille.localEulerAngles.z), 1e-3f,
                "l'aiguille revient sur sa bande");
        }

        [Test]
        public void T2_LePouls_EtLeTremblement()
        {
            Assert.AreEqual(1f, TopBarController.Pouls(0f), 1e-4f);
            Assert.AreEqual(0.45f, TopBarController.Pouls(0.55f), 1e-4f, "`50%{opacity:.45}`");
            Assert.AreEqual(1f, TopBarController.Pouls(1.1f), 1e-4f);
            Assert.AreEqual(0f, TopBarController.Tremblement(0f), 1e-4f);
            float versLeChaud = Mathf.Sign(HeatBucketResolver.NeedleAngleDegrees("BURNING") - HeatBucketResolver.NeedleAngleDegrees("COLD"));
            Assert.AreEqual(4f * versLeChaud, TopBarController.Tremblement(0.07f), 1e-4f, "52° → 56° : 4° vers le chaud");
            Assert.AreEqual(0f, TopBarController.Tremblement(0.14f), 1e-3f);
        }

        [Test]
        public void T3_Descente_PasseParLibelle()
        {
            I18nCatalog.ChargerPourTest("en", new Dictionary<string, string> { { "chrome.medaillon.descente", "Raid" } });
            TopBarController barre = NouvelleBarre();
            barre.SetDescente(true);
            Assert.AreEqual("RAID", barre.GaugeCaptionText);
        }
    }
}
