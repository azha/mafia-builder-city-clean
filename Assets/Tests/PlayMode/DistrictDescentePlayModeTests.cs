using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.CityMap;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Mouvements;
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
            RegieMouvement.Oublier();
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

        [Test]
        public void G5_LaLueur_SeReAttache_ApresLaLiberationDes30sDeCibleInactive()
        {
            // Revue de code E2a, M2 : la régie libère une piste dont la cible est restée inactive plus de 30 s (horloge de régie) ; sans
            // ré-attache à la réactivation, la lueur resterait figée sur sa teinte de base à vie. Contrôle négatif : tant que la cible n'a
            // pas dépassé 30 s, la piste n'est PAS libérée (l'assertion de ré-attache ne triche pas sur un état toujours vivant).
            Regie regie = RegieMouvement.PourTest();
            var horloge = (HorlogeFigee)regie.Horloge;
            var scene = new GameObject("Scene", typeof(RectTransform));
            montes.Add(scene);
            var fond = new GameObject("Fond", typeof(RectTransform));
            fond.transform.SetParent(scene.transform, false);
            Gyrophare g = Gyrophare.Poser((RectTransform)scene.transform, (RectTransform)fond.transform, Art("VERGE_D_NUIT_FINAL"), 2f);
            Assert.AreEqual(1, regie.PistesVivantes, "la lueur est une piste de la régie");
            regie.Tick(0f);
            g.gameObject.SetActive(false);
            horloge.Temps = 1f; regie.Tick(1f);
            horloge.Temps = 20f; regie.Tick(20f);
            Assert.AreEqual(1, regie.PistesVivantes, "20 s d'inactivité : la piste est gardée (contrôle négatif)");
            horloge.Temps = 40f; regie.Tick(40f);
            Assert.AreEqual(0, regie.PistesVivantes, "plus de 30 s d'inactivité : la régie a libéré la piste");
            g.gameObject.SetActive(true);
            Assert.AreEqual(1, regie.PistesVivantes, "à la réactivation la lueur se ré-attache");
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
            // ⚠️ La scène se lit DEPUIS la lueur : `Render` détruit la scène précédente par `Destroy`, DIFFÉRÉ à la fin de l'image, et
            // `Find("DistrictScene")` rendait l'ANCIENNE (sans lueur) — mesuré au créneau du 23/09.
            Transform gyro = ecran.GyrophareRect;
            Assert.IsNotNull(gyro);
            Transform scene = gyro.parent;
            Assert.AreEqual("DistrictScene", scene.name);
            Transform fond = scene.Find("DistrictBackgroundImage");
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

        // Les instants de la régie de test (horloge posée à la main : `Tick(t)` direct, aucun `Update`). Une piste attachée est évaluée
        // une première fois à `Debut` (âge 0), puis à chaque `Tick` suivant ; le pouls dure 1,1 s (creux à 0,55), le virage 0,6 s.
        private const float Debut = 10f, AuCreuxDuPouls = Debut + 0.55f, VirageFini = Debut + 0.65f, PoulsEnMontee = Debut + 0.82f;

        /// <summary>Une barre en descente dans une ville tiède, sur une régie de test ; rend le `CanvasGroup` du pouls du cerclage.
        /// La régie a SES pistes : pouls ×2, tremble, virage de l'anneau.</summary>
        private CanvasGroup BarreEnDescente(out TopBarController barre, out Regie regie, out Image cerclage)
        {
            regie = RegieMouvement.PourTest();
            barre = NouvelleBarre();
            barre.SetCitywideHeatBucket("WARM");
            cerclage = barre.GetComponentsInChildren<Image>(true).First(i => i.gameObject.name == "BoitierRing");
            barre.SetDescente(true);
            regie.Tick(Debut);
            Assert.AreEqual(4, regie.PistesVivantes, "pouls du cerclage, pouls du filet, tremble, virage de l'anneau vers la braise");
            // le pouls vit sur un CanvasGroup posé par la régie SUR le cerclage — pas sur `Image.color.a`
            CanvasGroup groupe = cerclage.GetComponent<CanvasGroup>();
            Assert.IsNotNull(groupe, "la régie a posé un CanvasGroup sur BoitierRing");
            return groupe;
        }

        [Test]
        public void T1_LaBarre_EnDescente_PuisRetourALEtatNomme()
        {
            CanvasGroup groupe = BarreEnDescente(out TopBarController barre, out Regie regie, out Image cerclage);
            TextMeshProUGUI legende = barre.GetComponentsInChildren<TextMeshProUGUI>(true).First(t => t.gameObject.name == "GaugeCaption");
            RectTransform aiguille = barre.GetComponentsInChildren<RectTransform>(true).First(r => r.gameObject.name == "Needle");
            Color braise = DesignTokens.Current.hudGaugeArcHot;
            Assert.IsTrue(barre.Descente);
            Assert.AreEqual("DESCENTE", barre.GaugeCaptionText, "« Heat » devient « Descente » (état D du canon)");
            Assert.AreEqual(braise, legende.color, "`.tel.descente .heatlib{color:var(--braise)}`");

            // le pouls bat : au creux, l'opacité EFFECTIVE du cerclage est .45 — c'est ce que la garde de retour devra voir disparaître
            regie.Tick(AuCreuxDuPouls);
            Assert.AreEqual(0.45f, groupe.alpha, 5e-3f, "`50%{opacity:.45}`, lu sur le CanvasGroup que la régie pose sur le cerclage");
            // la braise : le virage de l'anneau (0,6 s) est fini, même dans une ville tiède
            regie.Tick(VirageFini);
            Assert.LessOrEqual(Couleurs.EcartRvb(cerclage.color, braise), 1f / 255f,
                "`.tel.descente .medaillon .boitier{border-color:var(--braise)}`, même dans une ville tiède");

            barre.SetDescente(false);
            Assert.IsFalse(barre.Descente);
            Assert.AreEqual("CHALEUR", barre.GaugeCaptionText);
            Assert.AreEqual(DesignTokens.Current.hudCremeSecondary, legende.color);
            Assert.AreEqual(1f, groupe.alpha, 1e-4f, "opacité pleine dès le détachement, jamais la dernière image du battement");
            // …et elle le reste : à un instant où le pouls armé serait en pleine montée (≈ .9), l'alpha vaut toujours 1
            regie.Tick(PoulsEnMontee);
            Assert.AreEqual(1f, groupe.alpha, 1e-4f, "le pouls est détaché : plus rien n'écrit l'opacité");
            regie.Tick(Debut + 1.5f);   // le virage de retour (0,6 s) est fini
            Assert.LessOrEqual(Couleurs.EcartRvb(cerclage.color, DesignTokens.Current.hudHairlineGold), 1f / 255f, "ville tiède : le laiton calme");
            Assert.AreEqual(1f, cerclage.color.a, 1e-4f, "le virage ne touche jamais l'alpha du cerclage");
            Assert.AreEqual(barre.HeatNeedleAngleDegrees, Mathf.DeltaAngle(0f, aiguille.localEulerAngles.z), 1e-3f,
                "l'aiguille revient sur sa bande (`HeatNeedleAngleDegrees` reste la valeur de la BANDE : le tremblement est détaché)");
            Assert.AreEqual(0, regie.PistesVivantes, "tout est détaché ou libéré : le virage de retour a rejoint la base");
        }

        [Test]
        public void T1_ControleNegatif_UnPoulsRestéArmé_FaitRougirLaLectureDeRetour()
        {
            // « pouls resté armé ⇒ rouge » : la MÊME lecture que T1 (l'alpha du CanvasGroup du cerclage à un instant où le pouls est en
            // montée), sur une barre dont on ne désarme PAS la descente, ne vaut pas 1 — l'assertion de T1 n'est donc pas vide
            CanvasGroup groupe = BarreEnDescente(out _, out Regie regie, out _);
            regie.Tick(PoulsEnMontee);
            Assert.Less(groupe.alpha, 0.95f, "armé, le pouls est à ≈ .9 à cet instant : `AreEqual(1, alpha)` rougirait");
            Assert.Greater(1f - groupe.alpha, 0.05f);
        }

        [Test]
        public void T1_SansRegie_LaBraiseEtLeLaitonSePosentDUnCoup()
        {
            // hôte nu (aucune régie) : pas de virage, mais la ville qui brûle se voit — repli consigné (implementation-notes.md)
            RegieMouvement.Oublier();
            TopBarController barre = NouvelleBarre();
            barre.SetCitywideHeatBucket("BURNING");
            Image cerclage = barre.GetComponentsInChildren<Image>(true).First(i => i.gameObject.name == "BoitierRing");
            Assert.LessOrEqual(Couleurs.EcartRvb(cerclage.color, DesignTokens.Current.hudGaugeArcHot), 1f / 255f);
            barre.SetCitywideHeatBucket("WARM");
            Assert.LessOrEqual(Couleurs.EcartRvb(cerclage.color, DesignTokens.Current.hudHairlineGold), 1f / 255f, "et le retour au calme aussi");
        }

        [Test]
        public void T1b_Aiguille_PremierePoseDirecte_PuisBalaye_EtNeSautePas()
        {
            // §9 B10 (revue de code E2a, M3) : « l'aiguille ne saute pas » — la première pose est DIRECTE (un cadran qui s'allume ne
            // balaie pas), la suivante BALAIE 0,7 s de l'ancienne bande à la nouvelle ; une bande inchangée ne fait rien.
            Regie regie = RegieMouvement.PourTest();
            TopBarController barre = NouvelleBarre();
            RectTransform aiguille = barre.GetComponentsInChildren<RectTransform>(true).First(r => r.gameObject.name == "Needle");
            barre.SetCitywideHeatBucket("COLD");
            float froid = HeatBucketResolver.NeedleAngleDegrees("COLD"), brulant = HeatBucketResolver.NeedleAngleDegrees("BURNING");
            Assert.AreEqual(0, regie.PistesVivantes, "première pose : directe, aucune piste");
            Assert.AreEqual(froid, Mathf.DeltaAngle(0f, aiguille.localEulerAngles.z), 1e-3f);
            barre.SetCitywideHeatBucket("COLD");
            Assert.AreEqual(0, regie.PistesVivantes, "même bande : rien ne balaie");

            barre.SetCitywideHeatBucket("BURNING");
            regie.Tick(Debut);
            regie.Tick(Debut + 0.35f);
            float enVol = Mathf.DeltaAngle(0f, aiguille.localEulerAngles.z);
            Assert.That(enVol, Is.GreaterThan(Mathf.Min(froid, brulant) + 1f).And.LessThan(Mathf.Max(froid, brulant) - 1f),
                "à mi-balayage l'aiguille est ENTRE les deux bandes, elle n'a pas sauté");
            regie.Tick(Debut + 0.8f);
            Assert.AreEqual(brulant, Mathf.DeltaAngle(0f, aiguille.localEulerAngles.z), 1e-2f, "fin du balayage : la nouvelle bande");
            Assert.AreEqual(brulant, barre.HeatNeedleAngleDegrees, 1e-3f, "`HeatNeedleAngleDegrees` reste la valeur de la BANDE");
        }

        [Test]
        public void T1c_UnVirageInverseEnPleinVol_RepartDOuIlEn_Est_ControleNegatif()
        {
            // Revue de code E2a, M1 : la ville se refroidit pendant que l'anneau vire vers la braise. Le `transition` CSS repart de la
            // valeur COURANTE ; le contrôle négatif de cette assertion est l'ancien comportement (repartir de la cible demandée,
            // 100 % braise) : à l'instant 0 du virage de retour l'anneau serait EXACTEMENT braise, donc cette assertion rougirait.
            Regie regie = RegieMouvement.PourTest();
            TopBarController barre = NouvelleBarre();
            Image anneau = barre.GetComponentsInChildren<Image>(true).First(i => i.gameObject.name == "BoitierRing");
            barre.SetCitywideHeatBucket("WARM");
            barre.SetCitywideHeatBucket("BURNING");
            regie.Tick(Debut);
            regie.Tick(Debut + 0.3f);
            Color enVol = anneau.color;
            barre.SetCitywideHeatBucket("WARM");       // le virage de retour remplace le virage en vol
            regie.Tick(Debut + 0.31f);                 // un AUTRE instant : `Tick` est idempotent pour un même t (première évaluation de la piste neuve)
            Color braise = DesignTokens.Current.hudGaugeArcHot, laiton = DesignTokens.Current.hudHairlineGold;
            Assert.Greater(Couleurs.EcartRvb(anneau.color, braise), 2f / 255f, "pas de saut vers la braise entière");
            Assert.Greater(Couleurs.EcartRvb(anneau.color, laiton), 2f / 255f, "…ni vers le laiton : il repart d'où il en était");
            Assert.LessOrEqual(Couleurs.EcartRvb(anneau.color, enVol), 4f / 255f, "continuité : la couleur du virage neuf à son instant 0 est celle du virage en vol");
            regie.Tick(Debut + 1.2f);
            Assert.LessOrEqual(Couleurs.EcartRvb(anneau.color, laiton), 1f / 255f, "et il rejoint le laiton calme");
        }

        [Test]
        public void T2_LePouls_EtLeTremblement()
        {
            // La COURBE DU CATALOGUE (`chrome.pouls`, `chrome.tremble`) — la même que celle de la régie, et celle que lisent les
            // enveloppes `TopBarController.Pouls/Tremblement`. Les valeurs ne sont plus celles du `SmoothStep` : `ease` à chaque image clé.
            MouvementDefini pouls = CatalogueHud.Pouls.Mouvement, tremble = CatalogueHud.Tremble.Mouvement;
            float Pouls(float t) => Courbes.EvaluerCanal(pouls.Canaux[0], Mathf.Repeat(t, pouls.PeriodeS) / pouls.PeriodeS);
            float Tremblement(float t) => Courbes.EvaluerCanal(tremble.Canaux[0], Mathf.Repeat(t, tremble.PeriodeS) / tremble.PeriodeS);

            Assert.AreEqual(1f, Pouls(0f), 1e-4f);
            Assert.AreEqual(0.45f, Pouls(0.55f), 1e-4f, "`50%{opacity:.45}`");
            Assert.AreEqual(1f, Pouls(1.1f), 1e-4f);
            // le coude : à p = 0,125, l'`ease` CSS mesuré (oracle 0,775319) — le `SmoothStep` d'avant rendait 0,914
            Assert.AreEqual(0.7753f, Pouls(0.125f * 1.1f), 2e-3f, "l'ease des images clés, pas un SmoothStep");
            Assert.Greater(Mathf.Abs(0.914f - Pouls(0.125f * 1.1f)), 0.1f, "contrôle négatif : l'ancienne courbe est distinguée");

            Assert.AreEqual(0f, Tremblement(0f), 1e-4f);
            float versLeChaud = Mathf.Sign(HeatBucketResolver.NeedleAngleDegrees("BURNING") - HeatBucketResolver.NeedleAngleDegrees("COLD"));
            Assert.AreEqual(-1f, versLeChaud, "repère Unity : le chaud est à l'angle le plus négatif (Burning −60°, Cold +60°)");
            Assert.AreEqual(4f * versLeChaud, Tremblement(0.07f), 1e-4f, "52° → 56° CSS = −4° Unity : 4° vers le chaud");
            Assert.AreEqual(0f, Tremblement(0.14f), 1e-3f);
            // le SIGNE à chaque instant (une courbe 0 → +4 → 0 et 0 → −4 → 0 ne se confondent pas) : jamais du côté du froid
            for (float t = 0.01f; t < 0.14f; t += 0.01f)
                Assert.GreaterOrEqual(Tremblement(t) * versLeChaud, -1e-4f, "à t = " + t + " : du côté du chaud, jamais du côté du froid");
            Assert.Greater(Mathf.Abs(Tremblement(0.07f) - (-4f * versLeChaud)), 1f, "contrôle négatif : le signe inversé (+4 vers le froid) est distingué");

            // les enveloppes lisent la MÊME courbe
            Assert.AreEqual(Pouls(0.3f), TopBarController.Pouls(0.3f), 1e-5f);
            Assert.AreEqual(Tremblement(0.03f), TopBarController.Tremblement(0.03f), 1e-5f);
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
