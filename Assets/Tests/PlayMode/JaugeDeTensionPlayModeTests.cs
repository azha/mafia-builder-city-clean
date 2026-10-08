using System.Collections;
using NUnit.Framework;
using TMPro;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.CoreLoops.Compression;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.CityMap.Tests
{
    // ⑭ LA SEMAINE — LA JAUGE DE TENSION (juge visuel r1 du 08/10, F3 BLOQUANT : « l'élément héros est absent »). Maquette : série 6, `.cadran-fer`
    // (`ecrans-brennar-6.html:289-292`, cadres 14-19). HORS RÉSEAU : `RendrePourTest` impose l'état et le tableau d'un compte fabriqué.
    //   J1  la jauge existe en vue calme ET en vue vide : 3 arcs, une aiguille, un moyeu, un onglet « TENSION », une légende — enfants NOMMÉS, en tête de la pile, aux cotes de la maquette
    //   J2  l'angle de l'aiguille par cran, épinglé EN DUR sur les `rotate()` MESURÉS des cadres (calm −60 · mounting +12 · crushing +64 · compression_active +64) ; un cran inconnu RETIRE l'aiguille
    //   J3  l'EFFET, pas les paramètres : l'écran est RENDU dans un banc et on COMPTE / LIT les pixels — le bord laiton, la couleur de chaque arc à son milieu (le mélange sRGB du navigateur,
    //       pas le linéaire d'Unity), l'aiguille, le moyeu, l'encre de l'onglet
    //   J4  aucun texte du corps de ⑭ n'est écrasé sous sa hauteur préférée (la forme exacte de F1 de ㊴ : le texte sort de sa boîte)
    //   J5  la primitive `ProceduralUI.BoiteArrondieRadiale` (coins 100/100/14/14, foyer au bas) : coins évidés, bords pleins, foyer = premier arrêt
    [Category("JaugeDeTension")]
    public class JaugeDeTensionPlayModeTests
    {
        private GameObject hote;

        [SetUp] public void SetUp() { MotsDesEnumeres.OublierLesManquants(); I18nCatalog.Oublier(); }

        [TearDown]
        public void TearDown()
        {
            if (hote != null) Object.DestroyImmediate(hote);
            hote = null;
            I18nCatalog.Oublier();
        }

        /// <summary>Un banc comme celui des gardes d'écran (`ForensicScreenPlayModeTests.BancEcran`) : Canvas `ScreenSpaceCamera` sur une cible 640×1280, à l'échelle du shell
        /// (`referenceResolution.x` = 1280 ⇒ 1 unité de canvas = 0,5 px) pour que `Px()` du contrôleur rende ses vraies cotes.</summary>
        private sealed class Banc : System.IDisposable
        {
            public const int W = 640, H = 1280;
            public readonly RenderTexture Rt; public readonly Camera Cam; public readonly Canvas Canvas;
            private readonly GameObject camGo, canGo;
            public Banc()
            {
                Rt = new RenderTexture(W, H, 24, RenderTextureFormat.ARGB32);
                camGo = new GameObject("jauge_cam"); Cam = camGo.AddComponent<Camera>();
                Cam.targetTexture = Rt; Cam.clearFlags = CameraClearFlags.SolidColor; Cam.backgroundColor = Color.black;
                Cam.orthographic = true; Cam.enabled = false;
                canGo = new GameObject("jauge_canvas", typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
                Canvas = canGo.GetComponent<Canvas>(); Canvas.renderMode = RenderMode.ScreenSpaceCamera; Canvas.worldCamera = Cam;
                CanvasScaler cs = canGo.GetComponent<CanvasScaler>();
                cs.uiScaleMode = CanvasScaler.ScaleMode.ConstantPixelSize;
                cs.scaleFactor = W / 1280f;
            }
            public Transform Racine => canGo.transform;
            public Texture2D Rendre()
            {
                Canvas.ForceUpdateCanvases(); Cam.Render();
                RenderTexture avant = RenderTexture.active; RenderTexture.active = Rt;
                var t = new Texture2D(W, H, TextureFormat.RGB24, false);
                t.ReadPixels(new Rect(0, 0, W, H), 0, 0); t.Apply(); RenderTexture.active = avant;
                return t;
            }
            /// <summary>Le pixel (x, y ; origine en BAS) du point (`fx`, `fy` ∈ [0, 1], origine en bas à gauche) du rect `r`.</summary>
            public Vector2Int Pixel(RectTransform r, float fx, float fy)
            {
                var c = (RectTransform)canGo.transform;
                Vector3 monde = r.TransformPoint(new Vector3(r.rect.xMin + fx * r.rect.width, r.rect.yMin + fy * r.rect.height, 0f));
                Vector3 p = c.InverseTransformPoint(monde);
                return new Vector2Int(Mathf.FloorToInt((p.x - c.rect.xMin) / c.rect.width * W), Mathf.FloorToInt((p.y - c.rect.yMin) / c.rect.height * H));
            }
            public void Dispose()
            {
                Object.DestroyImmediate(canGo); Object.DestroyImmediate(camGo);
                Rt.Release(); Object.DestroyImmediate(Rt);
            }
        }

        private static float Px(float css) => css * 1280f / 300f;   // la même règle que le contrôleur (K = 1280/300), écrite ICI : le test ne la lit pas dans le code qu'il juge

        private static Color Css(string hex)
        {
            ColorUtility.TryParseHtmlString(hex, out Color c);
            return c;
        }

        private static float Ecart(Color a, Color b) =>
            Mathf.Max(Mathf.Abs(a.r - b.r), Mathf.Max(Mathf.Abs(a.g - b.g), Mathf.Abs(a.b - b.b))) * 255f;

        private static BoardData Tableau(bool vide) => new BoardData
        {
            entries = vide ? new ProblemeDto[0] : new[] { new ProblemeDto { id = "p1", source_kind = "exception", tier = "MODERATE", addressed = false } },
            decisions_used = 0,
            decisions_remaining = vide ? 0 : 3,
        };

        private CompressionScreenController Monter(Banc banc, string cran, bool vide)
        {
            hote = new GameObject("Compression", typeof(RectTransform));
            hote.transform.SetParent(banc.Racine, false);
            CompressionScreenController ecran = hote.AddComponent<CompressionScreenController>();
            ecran.SetMountParent(banc.Racine);
            ecran.RendrePourTest(new EtatData { stress_bucket = cran, week_state = "none" }, Tableau(vide));
            return ecran;
        }

        private Transform Sous(string chemin)
        {
            Transform t = hote.transform.Find(chemin);
            Assert.IsNotNull(t, $"« {chemin} » est introuvable sous l'écran ⑭");
            return t;
        }

        private IEnumerator Poser()
        {
            yield return null; yield return null;
            Canvas.ForceUpdateCanvases();
            LayoutRebuilder.ForceRebuildLayoutImmediate((RectTransform)hote.transform);
            Canvas.ForceUpdateCanvases();
        }

        // ═══ J1 — la jauge est là, en vue calme ET en vue vide ═══════════════════════════════════════════════════════════

        [UnityTest]
        public IEnumerator J1_LaJauge_ExisteEnVueCalmeEtEnVueVide_EnTeteDeLaPile_AuxCotesDeLaMaquette()
        {
            using (var banc = new Banc())
            {
                foreach (bool vide in new[] { false, true })
                {
                    if (hote != null) Object.DestroyImmediate(hote);
                    CompressionScreenController ecran = Monter(banc, "calm", vide);
                    yield return Poser();
                    string vue = vide ? "vue vide" : "vue calme";
                    Assert.AreEqual(vide, ecran.EtatVide, vue + " : l'état de la vue fabriquée");

                    foreach (string nom in new[] { "ArcFroid", "ArcOr", "ArcChaud", "Piste", "Aiguille", "Moyeu", "MoyeuBord", "Face", "Bord", "Vis1", "Vis2", "Vis3", "Vis4", "Onglet" })
                        Assert.IsTrue(Sous("Jauge/Cadran/" + nom).gameObject.activeInHierarchy, $"{vue} : « {nom} » est absent ou éteint");

                    // en TÊTE du corps : juste après le décor
                    Transform jauge = Sous("Jauge"), decor = Sous("Decor");
                    Assert.AreEqual(decor.GetSiblingIndex() + 1, jauge.GetSiblingIndex(), vue + " : la jauge ouvre la pile, sous le décor");

                    // les cotes de la maquette : 200 × 118 px CSS
                    RectTransform cadran = (RectTransform)Sous("Jauge/Cadran");
                    Assert.AreEqual(Px(200f), cadran.rect.width, 1f, vue + " : largeur du cadran (200 px CSS)");
                    Assert.AreEqual(Px(118f), cadran.rect.height, 1f, vue + " : hauteur du cadran (118 px CSS)");

                    // l'onglet et la légende disent leurs mots
                    Assert.AreEqual("TENSION", Sous("Jauge/Cadran/Onglet/Mot").GetComponent<TextMeshProUGUI>().text, vue + " : l'onglet");
                    Assert.AreEqual("CALME — VOS AFFAIRES RESPIRENT", Sous("Jauge/Legende/Mot").GetComponent<TextMeshProUGUI>().text, vue + " : la légende du cadre « au calme »");

                    // la structure : tout Graphic de la jauge porte son CanvasRenderer (sans lui, rien ne dessine et la console est muette)
                    foreach (Graphic g in jauge.GetComponentsInChildren<Graphic>(true))
                        Assert.IsNotNull(g.GetComponent<CanvasRenderer>(), $"{vue} : {g.name} sans CanvasRenderer");
                }
            }
        }

        [Test]
        public void J1b_LaLegende_DitLeMotDuCran_EtAuCalmeLaPhraseDuCadre()
        {
            Assert.AreEqual("CALME — VOS AFFAIRES RESPIRENT", CompressionScreenController.LegendeDeTension("calm"));
            Assert.AreEqual("MONTANTE", CompressionScreenController.LegendeDeTension("mounting"));
            Assert.AreEqual("ÉCRASANTE", CompressionScreenController.LegendeDeTension("crushing"));
            Assert.AreEqual("SOUS COMPRESSION", CompressionScreenController.LegendeDeTension("compression_active"));
        }

        // ═══ J2 — l'angle de l'aiguille, épinglé EN DUR sur les `rotate()` MESURÉS ═════════════════════════════════════════

        [Test]
        public void J2a_LesAnglesMesures_SontEnDur()
        {
            // `transform:rotate(θ)` des cadres de la série 6 (CSS : degrés, sens horaire depuis la verticale) : cadre 18 « au calme » −60 · cadre 14 « s'annonce » +12 · cadres 15 et 19 (semaine ouverte) +64
            float d;
            Assert.IsTrue(CompressionScreenController.AngleDeLAiguilleCss("calm", out d)); Assert.AreEqual(-60f, d);
            Assert.IsTrue(CompressionScreenController.AngleDeLAiguilleCss("mounting", out d)); Assert.AreEqual(12f, d);
            Assert.IsTrue(CompressionScreenController.AngleDeLAiguilleCss("crushing", out d)); Assert.AreEqual(64f, d);
            Assert.IsTrue(CompressionScreenController.AngleDeLAiguilleCss("compression_active", out d)); Assert.AreEqual(64f, d);
            Assert.IsFalse(CompressionScreenController.AngleDeLAiguilleCss("severe", out d), "un cran que le back ne sert pas n'a pas d'angle inventé");
            Assert.IsFalse(CompressionScreenController.AngleDeLAiguilleCss(null, out d));
        }

        [UnityTest]
        public IEnumerator J2b_LAiguille_EstTourneeDeSonAngle_EtSeRetireSurUnCranInconnu()
        {
            using (var banc = new Banc())
            {
                CompressionScreenController ecran = Monter(banc, "calm", true);
                yield return Poser();
                RectTransform ai = (RectTransform)Sous("Jauge/Cadran/Aiguille");
                // Unity tourne vers la GAUCHE pour un z positif ; le CSS vers la droite : z = −θ
                var attendus = new (string cran, float z)[] { ("calm", 60f), ("mounting", -12f), ("crushing", -64f), ("compression_active", -64f) };
                foreach (var (cran, z) in attendus)
                {
                    ecran.RendrePourTest(new EtatData { stress_bucket = cran, week_state = "none" }, Tableau(true));
                    Assert.IsTrue(ai.gameObject.activeSelf, cran + " : l'aiguille est posée");
                    Assert.AreEqual(0f, Mathf.DeltaAngle(ai.localEulerAngles.z, z), 0.01f, $"{cran} : z de l'aiguille ({ai.localEulerAngles.z}) au lieu de {z}");
                }
                ecran.RendrePourTest(new EtatData { stress_bucket = "severe", week_state = "none" }, Tableau(true));
                Assert.IsFalse(ai.gameObject.activeSelf, "un cran inconnu : l'aiguille se retire");
                ecran.RendrePourTest(null, Tableau(true));
                Assert.IsTrue(ai.gameObject.activeSelf, "un état absent se lit « au calme », comme la plaque");
                Assert.AreEqual(0f, Mathf.DeltaAngle(ai.localEulerAngles.z, 60f), 0.01f);
            }
        }

        // ═══ J3 — l'EFFET : l'écran rendu, les pixels comptés ══════════════════════════════════════════════════════════════

        /// <summary>« Une garde sur les PARAMÈTRES d'un effet n'est pas une garde sur son EFFET » : un arc valide et non nul peut ne produire aucun pixel. On rend ⑭ et on lit :
        /// le bord laiton (des centaines de pixels or), la couleur de chaque arc en son MILIEU contre le mélange sRGB du navigateur (piste blanche 10 %, puis l'arc, sur le fond radial du cadran),
        /// l'aiguille (crème) sur sa hauteur, le moyeu (laiton) et l'encre brune de l'onglet.</summary>
        [UnityTest]
        public IEnumerator J3_LesPixels_BordArcsAiguilleMoyeuOnglet()
        {
            using (var banc = new Banc())
            {
                Monter(banc, "calm", true);
                yield return Poser();
                Texture2D t = banc.Rendre();
                try
                {
                    // (1) le bord laiton : des pixels or dans le rect du cadran
                    RectTransform cadran = (RectTransform)Sous("Jauge/Cadran");
                    Color laiton = DesignTokens.Current.hudHairlineGold;
                    Vector2Int a = banc.Pixel(cadran, 0f, 0f), b = banc.Pixel(cadran, 1f, 1f);
                    int or = 0;
                    for (int x = Mathf.Max(0, Mathf.Min(a.x, b.x)); x <= Mathf.Min(Banc.W - 1, Mathf.Max(a.x, b.x)); x++)
                        for (int y = Mathf.Max(0, Mathf.Min(a.y, b.y)); y <= Mathf.Min(Banc.H - 1, Mathf.Max(a.y, b.y)); y++)
                            if (Ecart(t.GetPixel(x, y), laiton) <= 12f) or++;
                    Assert.Greater(or, 300, "le bord laiton du cadran n'a (presque) aucun pixel or : la jauge ne dessine pas");

                    // (2) les arcs, à leur milieu : le mélange sRGB du navigateur (`stroke-opacity` sur la piste `#ffffff1a`, sur le fond radial)
                    RectTransform face = (RectTransform)Sous("Jauge/Cadran/Face");
                    Color fond0 = Css("#3a3f47"), fond1 = Css("#15181c");
                    float rayonSurDiametre = 70f / (2f * (70f + 4.5f));   // rayon de la LIGNE MÉDIANE d'un arc de rayon 70 et de trait 9, sur le diamètre extérieur du rect
                    var arcs = new (string nom, float angle, string encre, float alpha)[]
                    {
                        ("ArcFroid", 150.13f, "#7fd4d9", 0x77 / 255f),
                        ("ArcOr", 90f, "#d9ab4e", 0x99 / 255f),
                        ("ArcChaud", 29.87f, "#e0402a", 0xcc / 255f),
                    };
                    foreach (var (nom, angle, encre, alpha) in arcs)
                    {
                        RectTransform arc = (RectTransform)Sous("Jauge/Cadran/" + nom);
                        float fx = 0.5f + Mathf.Cos(angle * Mathf.Deg2Rad) * rayonSurDiametre, fy = 0.5f + Mathf.Sin(angle * Mathf.Deg2Rad) * rayonSurDiametre;
                        Vector3 monde = arc.TransformPoint(new Vector3(arc.rect.xMin + fx * arc.rect.width, arc.rect.yMin + fy * arc.rect.height, 0f));
                        Vector3 lp = face.InverseTransformPoint(monde);
                        float u = (lp.x - face.rect.xMin) / face.rect.width, depuisLeHaut = 1f - (lp.y - face.rect.yMin) / face.rect.height;
                        float nx = (u - 0.5f) / 1.2f, ny = (depuisLeHaut - 1f) / 1f;
                        float tt = Mathf.Sqrt(nx * nx + ny * ny);
                        Color fond = tt >= 0.7f ? fond1 : Color.Lerp(fond0, fond1, tt / 0.7f);
                        Color sousLArc = Color.Lerp(fond, Color.white, 0x1a / 255f);
                        Color attendu = Color.Lerp(sousLArc, Css(encre), alpha);
                        Vector2Int px = banc.Pixel(arc, fx, fy);
                        Color vu = t.GetPixel(px.x, px.y);
                        Assert.LessOrEqual(Ecart(vu, attendu), 18f, $"{nom} au milieu : pixel {vu} au lieu de {attendu} (mélange sRGB du navigateur sur {fond})");
                        Assert.Greater(Ecart(vu, fond), 12f, $"{nom} au milieu : le pixel est celui du FOND — l'arc ne produit aucun pixel");
                    }

                    // (3) l'aiguille (crème) aux deux tiers de sa hauteur, le moyeu (laiton) en son centre
                    RectTransform ai = (RectTransform)Sous("Jauge/Cadran/Aiguille");
                    Vector2Int pn = banc.Pixel(ai, 0.5f, 0.6f);
                    Assert.LessOrEqual(Ecart(t.GetPixel(pn.x, pn.y), DesignTokens.Current.hudCreme), 24f, "l'aiguille n'a pas sa couleur crème sur sa hauteur");
                    RectTransform moyeu = (RectTransform)Sous("Jauge/Cadran/Moyeu");
                    Vector2Int pm = banc.Pixel(moyeu, 0.5f, 0.5f);
                    Assert.LessOrEqual(Ecart(t.GetPixel(pm.x, pm.y), laiton), 12f, "le moyeu n'est pas laiton en son centre");

                    // (4) l'onglet : de l'encre brune (`#2b1d0e`) sur son fond or
                    RectTransform onglet = (RectTransform)Sous("Jauge/Cadran/Onglet");
                    Color encreOnglet = Css("#2b1d0e");
                    Vector2Int oa = banc.Pixel(onglet, 0f, 0f), ob = banc.Pixel(onglet, 1f, 1f);
                    int brun = 0;
                    for (int x = Mathf.Max(0, Mathf.Min(oa.x, ob.x)); x <= Mathf.Min(Banc.W - 1, Mathf.Max(oa.x, ob.x)); x++)
                        for (int y = Mathf.Max(0, Mathf.Min(oa.y, ob.y)); y <= Mathf.Min(Banc.H - 1, Mathf.Max(oa.y, ob.y)); y++)
                            if (Ecart(t.GetPixel(x, y), encreOnglet) <= 40f) brun++;
                    Assert.Greater(brun, 10, "l'onglet « TENSION » n'a pas d'encre brune");
                }
                finally { Object.DestroyImmediate(t); }
            }
        }

        // ═══ J4 — aucun texte écrasé sous sa hauteur préférée ═════════════════════════════════════════════════════════════

        [UnityTest]
        public IEnumerator J4_AucunTexteDeLEcran_EstEcraseSousSaHauteurPreferee()
        {
            using (var banc = new Banc())
            {
                foreach (var (cran, vide) in new[] { ("calm", true), ("calm", false), ("compression_active", false) })
                {
                    if (hote != null) Object.DestroyImmediate(hote);
                    Monter(banc, cran, vide);
                    yield return Poser();
                    int vus = 0;
                    foreach (TextMeshProUGUI t in hote.GetComponentsInChildren<TextMeshProUGUI>(false))
                    {
                        t.ForceMeshUpdate();
                        vus++;
                        Assert.LessOrEqual(t.preferredHeight, t.rectTransform.rect.height + 1f,
                            $"{cran}/{(vide ? "vide" : "tableau")} : « {t.text} » ({t.name}) est écrasé : il lui faut {t.preferredHeight:0.#}, il a {t.rectTransform.rect.height:0.#}");
                    }
                    Assert.GreaterOrEqual(vus, 5, "anti-vacuité : le balayage a vu les textes de l'écran (onglet, légende, titre, pression, plaque…)");
                }
            }
        }

        // ═══ J5 — la primitive ═══════════════════════════════════════════════════════════════════════════════════════════

        [Test]
        public void J5_BoiteArrondieRadiale_CoinsEvidesBordsPleinsFoyerAuBas()
        {
            Color premier = Css("#3a3f47"), dernier = Css("#15181c");
            Sprite sp = ProceduralUI.BoiteArrondieRadiale(200, 118, 100, 14, 0.5f, 1f, 1.2f, 1f, new[] { (0f, premier), (0.7f, dernier) });
            Texture2D tex = sp.texture;
            Assert.AreEqual(200, tex.width); Assert.AreEqual(118, tex.height);
            // texture : y = 0 en BAS. Coin haut-gauche (rayon 100) : évidé ; coin bas-gauche (rayon 14) : évidé ; milieu du bord gauche et centre : pleins.
            Assert.Less(tex.GetPixel(1, 116).a, 0.05f, "le coin haut-gauche (rayon 100) est évidé");
            Assert.Less(tex.GetPixel(198, 116).a, 0.05f, "le coin haut-droit (rayon 100) est évidé");
            Assert.Less(tex.GetPixel(0, 0).a, 0.05f, "le coin bas-gauche (rayon 14) est évidé");
            Assert.Greater(tex.GetPixel(20, 0).a, 0.95f, "le bas, passé l'arrondi de 14, est plein");
            Assert.Greater(tex.GetPixel(0, 19).a, 0.95f, "le bord gauche est plein là où l'arrondi haut (rayon 100) s'arrête");
            Assert.Greater(tex.GetPixel(100, 117).a, 0.95f, "le haut, au milieu, est plein");
            // le foyer est AU MILIEU DU BAS : premier arrêt ; et à 70 % de l'ellipse (120 % × 100 %) le dernier — ici en haut au centre, ny = 1 ⇒ t = 1 > 0,7
            Assert.LessOrEqual(Ecart(tex.GetPixel(100, 0), premier), 3f, "le foyer (bas, milieu) porte le premier arrêt");
            Assert.LessOrEqual(Ecart(tex.GetPixel(100, 117), dernier), 3f, "le haut est au-delà de 70 % : dernier arrêt");
        }
    }
}
