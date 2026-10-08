using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;

namespace MafiaCleanCity.Tests.PlayMode
{
    /// <summary>Le décor de scène POSÉ (`Tools/decor-de-scene-2026-10-07/DESIGN.md`, §6) : D0 structure (et pixels), D1
    /// catalogue = périmètre de l'INDEX, D4 comportement rendu à 540×960 portrait (RenderTexture + Canvas ScreenSpace-Camera
    /// propre au test, hors réseau), D5 ressources de scène. D2 (le contrôleur pose et n'a plus de fond plat) et D3 (aucun
    /// chiffre de décor dans un contrôleur) viennent avec la pose écran par écran (étape 4) ; D6 avec `Filets` (étape 3).
    ///
    /// ⛔ Une garde de PARAMÈTRES n'est pas une garde d'EFFET : chaque cas qui le peut rend et compte des pixels.
    /// ⚠️ Aucun littéral de couleur ici (la garde TD-612 balaie tout `.cs`) : les attendus se lisent DANS le catalogue.</summary>
    [Category("DecorDeScene")]
    public class DecorDeScenePlayModeTests
    {
        private const int W = 540, H = 960;

        // ════════════════════════════════════════════════════════════════════════════ banc de rendu

        private sealed class Banc : IDisposable
        {
            public readonly RenderTexture Rt;
            public readonly Camera Cam;
            public readonly Canvas Canvas;
            public readonly RectTransform Racine;
            private readonly GameObject camGo, canGo;

            public Banc()
            {
                Rt = new RenderTexture(W, H, 24, RenderTextureFormat.ARGB32);
                camGo = new GameObject("dds_cam");
                Cam = camGo.AddComponent<Camera>();
                Cam.targetTexture = Rt;
                Cam.clearFlags = CameraClearFlags.SolidColor;
                Cam.backgroundColor = Color.black;
                Cam.orthographic = true;
                Cam.enabled = false;

                canGo = new GameObject("dds_canvas", typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
                Canvas = canGo.GetComponent<Canvas>();
                Canvas.renderMode = RenderMode.ScreenSpaceCamera;
                Canvas.worldCamera = Cam;
                canGo.GetComponent<CanvasScaler>().uiScaleMode = CanvasScaler.ScaleMode.ConstantPixelSize;

                var r = new GameObject("Racine", typeof(RectTransform));
                r.transform.SetParent(canGo.transform, false);
                Racine = (RectTransform)r.transform;
                Racine.anchorMin = Vector2.zero; Racine.anchorMax = Vector2.one;
                Racine.offsetMin = Vector2.zero; Racine.offsetMax = Vector2.zero;
            }

            public Texture2D Rendre()
            {
                Canvas.ForceUpdateCanvases();
                Cam.Render();
                RenderTexture avant = RenderTexture.active;
                RenderTexture.active = Rt;
                var tex = new Texture2D(W, H, TextureFormat.RGB24, false);
                tex.ReadPixels(new Rect(0, 0, W, H), 0, 0);
                tex.Apply();
                RenderTexture.active = avant;
                return tex;
            }

            public void Dispose()
            {
                UnityEngine.Object.DestroyImmediate(canGo);
                UnityEngine.Object.DestroyImmediate(camGo);
                Rt.Release();
                UnityEngine.Object.DestroyImmediate(Rt);
            }
        }

        private static float Ecart(Color a, Color b) =>
            Mathf.Max(Mathf.Abs(a.r - b.r), Mathf.Max(Mathf.Abs(a.g - b.g), Mathf.Abs(a.b - b.b)));

        private static void Proche(Color attendu, Color vu, float tol255, string ou) =>
            Assert.LessOrEqual(Ecart(attendu, vu) * 255f, tol255, $"{ou} : attendu {attendu}, vu {vu}");

        private static bool Noir(Color c, float seuil255 = 2f) => Mathf.Max(c.r, Mathf.Max(c.g, c.b)) * 255f <= seuil255;

        /// <summary>Hauteur du support en pixels du banc (le support va du BAS à 1 − Bande).</summary>
        private static float HauteurSupport(SpecDecor s) => H * (1f - s.Bande);

        /// <summary>La couleur CSS d'un arrêt du catalogue (opaque : aucune traduction d'opacité).</summary>
        private static Color Arret(SpecDecor s, int couche, int arret) => s.Support.Couches[couche].Arrets[arret].Couleur.Resoudre();

        private static void Detruire(Texture2D t) { if (t != null) UnityEngine.Object.DestroyImmediate(t); }

        // ════════════════════════════════════════════════════════════════════════════ catalogue (pur)

        [Test]
        public void C1_Catalogue_26Entrees_22Pose_3DejaLivre_1NonMonte_SymbolesUniques()
        {
            SpecDecor[] tous = DecorsDeScene.Tous;
            Assert.AreEqual(26, tous.Length);
            Assert.AreEqual(22, tous.Count(s => s.Statut == StatutDecor.Pose));
            CollectionAssert.AreEquivalent(new[] { "⑨", "⑩", "⑯" }, tous.Where(s => s.Statut == StatutDecor.DejaLivre).Select(s => s.Symbole));
            CollectionAssert.AreEquivalent(new[] { "㉑" }, tous.Where(s => s.Statut == StatutDecor.NonMonte).Select(s => s.Symbole));
            Assert.AreEqual(26, tous.Select(s => s.Symbole).Distinct().Count(), "un symbole par entrée");
            // ③ seul : sans voile, sans support, Bande = 1 (§3.2, §4).
            CollectionAssert.AreEqual(new[] { "③" }, tous.Where(s => !s.Voile).Select(s => s.Symbole));
            CollectionAssert.AreEqual(new[] { "③" }, tous.Where(s => s.Support == null).Select(s => s.Symbole));
            Assert.AreEqual(1f, DecorsDeScene.CityMap.Bande);
            // A ×7 : cerne + enseigne.
            CollectionAssert.AreEquivalent(new[] { "㊲", "㉟", "㊴", "㊳", "㊵", "㊱", "㉑" },
                tous.Where(s => s.Support != null && s.Support.Cerne != null && s.Support.Enseigne).Select(s => s.Symbole));
        }

        [Test]
        public void C2_FondConnu_LesHalosDeASontTraduitsSurLeurFond_LesCouchesOpaquesNon()
        {
            SpecCouche[] a = DecorsDeScene.Reputation.Support.Couches;
            Vector2 boite = DecorDeScene.BoiteSupportCss(DecorsDeScene.Reputation);
            Color? fondOr = DecorDeScene.FondSous(a, 0, boite);
            Assert.IsTrue(fondOr.HasValue, "le halo or est posé sur un fond CONNU : le 178° opaque du dessous");
            Assert.IsNull(DecorDeScene.FondSous(a, 2, boite), "une couche opaque n'a pas besoin de fond");
            // Le fond lu est celui du 178° AU FOYER du halo (cy = 0,22 depuis le haut) : entre le 1er et le 2e arrêt.
            Color c0 = a[2].Arrets[0].Couleur.Resoudre(), c1 = a[2].Arrets[1].Couleur.Resoudre();
            Assert.LessOrEqual(Ecart(fondOr.Value, Color.Lerp(c0, c1, 0.22f / 0.54f)) * 255f, 3f, "fond au foyer");
            // La traduction garde l'opacité CSS et déplace la couleur (`CouleurPourMelangeLineaire`).
            Color or = a[0].Arrets[0].Couleur.Resoudre();
            Color traduit = DecorDeScene.Ajuster(or, fondOr);
            Assert.AreEqual(or.a, traduit.a, 1e-4f, "l'opacité du CSS est gardée");
            Assert.Greater(Ecart(or, traduit), 1f / 255f, "la couleur, elle, est déplacée");
        }

        [Test]
        public void C3_CouleurDeCouche_ConventionCss_180HautBas_ArretEnPx()
        {
            SpecDecor loi = DecorsDeScene.Loi;
            Vector2 boite = DecorDeScene.BoiteSupportCss(loi);
            SpecCouche lin = loi.Support.Couches[0];
            Proche(Arret(loi, 0, 0), DecorDeScene.CouleurDeCouche(lin, 0.5f, 0f, boite), 0.5f, "180° : haut = 1er arrêt");
            Proche(Arret(loi, 0, 2), DecorDeScene.CouleurDeCouche(lin, 0.5f, 1f, boite), 0.5f, "180° : bas = dernier arrêt");
            // ⑱ : `#3a1c0e 18px, #2b120c 18px` — un arrêt en px CSS devient 18 / longueur de la ligne (= hauteur à 180°).
            var arrets = DecorDeScene.ResoudreArrets(DecorsDeScene.MenuPlus.Support.Couches[0].Arrets, 180f, 300f, 513f, null);
            Assert.AreEqual(18f / 513f, arrets[1].pos, 1e-5f);
            Assert.AreEqual(arrets[1].pos, arrets[2].pos, 1e-6f, "deux arrêts à la même position : bord DUR");
        }

        // ════════════════════════════════════════════════════════════════════════════ D1 — périmètre

        /// <summary>Les symboles de l'INDEX dont la colonne « cadres » cite `ecrans-brennar-6.html`. Pure.</summary>
        internal static List<string> SymbolesDeLIndex(IEnumerable<string> lignes)
        {
            var r = new List<string>();
            foreach (string l in lignes)
            {
                string[] c = l.Split('|').Select(x => x.Trim()).ToArray();
                if (c.Length > 5 && c[5].Contains("ecrans-brennar-6.html")) r.Add(c[1]);
            }
            return r;
        }

        internal static List<string> EcartsDePerimetre(IEnumerable<string> index, IEnumerable<string> catalogue)
        {
            var i = new HashSet<string>(index); var c = new HashSet<string>(catalogue);
            return i.Except(c).Select(s => "absent du catalogue : " + s)
                    .Concat(c.Except(i).Select(s => "hors INDEX : " + s)).OrderBy(s => s).ToList();
        }

        [Test]
        public void D1_CatalogueEgalePerimetre_DeLIndex_AvecControlePositif()
        {
            string chemin = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "Tools", "juge-visuel", "INDEX.md"));
            Assert.IsTrue(File.Exists(chemin), $"INDEX introuvable : {chemin}");
            List<string> index = SymbolesDeLIndex(File.ReadAllLines(chemin));
            Assert.AreEqual(26, index.Count, $"anti-vacuité : {index.Count} écran(s) à cadres série 6 lus dans l'INDEX");
            List<string> catalogue = DecorsDeScene.Tous.Select(s => s.Symbole).ToList();
            Assert.IsEmpty(EcartsDePerimetre(index, catalogue), string.Join(" ; ", EcartsDePerimetre(index, catalogue)));

            // Contrôle POSITIF : une entrée retirée du catalogue, une entrée en trop ⇒ vues.
            CollectionAssert.AreEqual(new[] { "absent du catalogue : ⑮" }, EcartsDePerimetre(index, catalogue.Where(s => s != "⑮")));
            CollectionAssert.AreEqual(new[] { "hors INDEX : ④" }, EcartsDePerimetre(index, catalogue.Concat(new[] { "④" })));
            Assert.AreEqual(1, SymbolesDeLIndex(new[] { "| ⑤ | x | y | z | `ecrans-brennar-4.html` 4 · `ecrans-brennar-6.html` 4 |",
                                                         "| ④ | x | y | z | aucune maquette de série 4/6 |" }).Count,
                "le motif prend la ligne série 6 et laisse la ligne sans maquette");
        }

        // ════════════════════════════════════════════════════════════════════════════ D5 — ressources

        [Test]
        public void D5_ChaqueSceneASaRessource_AuxDimensionsDuCadrage_VergeNuitProvisoire()
        {
            foreach (SceneDeFond s in Enum.GetValues(typeof(SceneDeFond)))
            {
                Sprite sp = Resources.Load<Sprite>(DecorDeScene.CheminScene(s));
                Assert.IsNotNull(sp, $"{s} : Resources/{DecorDeScene.CheminScene(s)} absent");
                DecorAuComptoir.Parametres p = DecorDeScene.Cadrage(s);
                Assert.AreEqual(p.SourceLargeur, sp.texture.width, $"{s} : largeur source");
                Assert.AreEqual(p.SourceHauteur, sp.texture.height, $"{s} : hauteur source");
            }
            CollectionAssert.AreEqual(new[] { SceneDeFond.Verge }, DecorDeScene.ScenesProvisoires, "dette TD-769 : seule la verge nuit est provisoire");
            Assert.AreEqual(RevueDuJourDecor.BoiteSource, DecorDeScene.Cadrage(SceneDeFond.VergeJour).Boite,
                "VergeJour : la boîte de ⑯ (`RevueDuJourDecor.BoiteSource`), une seule vérité");
        }

        // ════════════════════════════════════════════════════════════════════════════ D0 — structure

        private static void VerifierStructure(DecorPose p)
        {
            SpecDecor s = p.Spec;
            string ou = $"{s.Symbole} {s.Ecran}";
            Assert.AreEqual(0, p.transform.GetSiblingIndex(), $"{ou} : `Decor` est le PREMIER enfant de la racine");
            Assert.IsTrue(p.GetComponent<LayoutElement>().ignoreLayout, $"{ou} : hors mise en page");

            var attendus = new List<string> { "Capteur", "Scene" };
            if (s.Voile) attendus.Add("Voile");
            if (s.Support != null) attendus.Add("Support");
            if (s.Support?.Cerne != null) attendus.Add("Cerne");
            var vus = new List<string>();
            foreach (Transform t in p.transform) vus.Add(t.name);
            CollectionAssert.AreEqual(attendus, vus, $"{ou} : noms FIGÉS et ordre de fratrie (§7)");

            foreach (Graphic g in p.GetComponentsInChildren<Graphic>(true))
            {
                Assert.IsNotNull(g.GetComponent<CanvasRenderer>(), $"{ou} : {g.name} sans CanvasRenderer — rien ne dessinerait");
                bool sousMasque = g.GetComponentsInParent<RectMask2D>(true).Length > 0 || g.GetComponentsInParent<Mask>(true).Length > 0;
                if (sousMasque) Assert.IsInstanceOf<MaskableGraphic>(g, $"{ou} : {g.name} sous un masque doit être Maskable");
                Assert.AreEqual(g == p.Capteur, g.raycastTarget, $"{ou} : {g.name} — seul le Capteur prend le raycast");
            }
            Assert.IsEmpty(p.GetComponentsInChildren<Canvas>(true), $"{ou} : aucun Canvas (contrat CLIENT-3)");
            Assert.IsEmpty(p.GetComponentsInChildren<CanvasGroup>(true), $"{ou} : aucun CanvasGroup (contrat CLIENT-3)");
            Assert.IsEmpty(p.GetComponentsInChildren<LayoutGroup>(true), $"{ou} : aucune couche dans un LayoutGroup");

            if (s.Support == null) { Assert.IsNull(p.Support); return; }
            bool arrondi = s.Support.Arrondi;
            Assert.AreEqual(!arrondi, p.Support.GetComponent<RectMask2D>() != null, $"{ou} : RectMask2D sur Decor/Support (clip)");
            Assert.AreEqual(arrondi, p.Support.GetComponent<Mask>() != null, $"{ou} : Mask si Rayon > 0");
            int radiaux = s.Support.Couches.Count(c => c.Genre == GenreCouche.Radial || c.Genre == GenreCouche.RadialCercle);
            Assert.AreEqual(radiaux, p.Radiaux.Count, $"{ou} : un RectTransform par radial");
            bool cercle = s.Support.Couches.Any(c => c.Genre == GenreCouche.RadialCercle);
            Assert.AreEqual(cercle, p.Support.GetComponent<CercleDeSupport>() != null, $"{ou} : CercleDeSupport porté par le support");
            Assert.AreEqual(s.Support.Couches.Length,
                p.Support.Cast<Transform>().Count(t => t.GetComponent<Graphic>() != null), $"{ou} : une Image par couche");
        }

        [UnityTest]
        public IEnumerator D0_ChaqueEntreePosee_Structure_EtPixelsDuSupportRendus()
        {
            var echecs = new List<string>();
            foreach (SpecDecor s in DecorsDeScene.Tous.Where(e => e.Statut == StatutDecor.Pose))
            {
                var b = new Banc();
                Texture2D tex = null;
                try
                {
                    DecorPose p = DecorDeScene.Poser(b.Racine, s);
                    yield return null;
                    VerifierStructure(p);
                    tex = b.Rendre();
                    // Rendre et COMPTER : la zone du support (ou toute la scène pour ③) n'est pas noire.
                    int y0 = 2, y1 = s.Support != null ? Mathf.FloorToInt(HauteurSupport(s)) - 2 : H - 2;
                    int vus = 0, total = 0;
                    for (int y = y0; y < y1; y += 7)
                        for (int x = 2; x < W - 2; x += 7) { total++; if (!Noir(tex.GetPixel(x, y))) vus++; }
                    float part = vus / (float)total;
                    if (part < (s.Support != null ? 0.95f : 0.5f)) echecs.Add($"{s.Symbole} : {part:P0} de pixels non noirs dans la zone");
                }
                finally { Detruire(tex); b.Dispose(); }
            }
            Assert.IsEmpty(echecs, string.Join(" ; ", echecs));
        }

        // ════════════════════════════════════════════════════════════════════════════ D4 — comportement

        private static float Lin(float u) => u <= 0.04045f ? u / 12.92f : Mathf.Pow((u + 0.055f) / 1.055f, 2.4f);
        private static float Gam(float l) => l <= 0.0031308f ? 12.92f * l : 1.055f * Mathf.Pow(l, 1f / 2.4f) - 0.055f;

        [UnityTest]
        public IEnumerator D4a_Luminosite_MecanismeLineaire_EtEcartABrightnessBorne()
        {
            // ⛔ PRÉMISSE M3 DU DESIGN RÉFUTÉE AU CRÉNEAU DU 08/10 : « teinte (b,b,b) = brightness(b) à ±2/255 » a mesuré 7,40/255.
            //    Ce n'est pas un défaut de pose : Unity compose en LINÉAIRE (la teinte est linéarisée : pixel = γ(lin(b)·lin(c))) et
            //    `brightness()` multiplie en sRGB ; avec la courbe sRGB par morceaux, AUCUN facteur unique ne tient ±2/255 — calculé :
            //    6,72/255 au mieux à b = 0,4 (4,1 à 7,4 selon b). Le repli du design (voile noir 1 − b) est le MÊME produit linéaire.
            //    ⇒ Deux gardes distinctes : (1) le MÉCANISME, exact à ±2/255 ; (2) l'écart à `brightness()`, borné (≤ 8/255,
            //    classe C, dette TD-880 : seul un shader qui multiplie en sRGB le fermerait).
            const float b = 0.4f;
            var un = new SpecDecor("t", "t", StatutDecor.Pose, SceneDeFond.District, 1f, 1f, null, voile: false);
            var sombre = new SpecDecor("t", "t", StatutDecor.Pose, SceneDeFond.District, b, 1f, null, voile: false);
            var banc = new Banc();
            Texture2D t1 = null, tb = null;
            try
            {
                DecorPose p = DecorDeScene.Poser(banc.Racine, un);
                Assert.IsNotNull(p.Scene.texture, "D5 d'abord : la scène doit être chargée");
                yield return null;
                t1 = banc.Rendre();
                DecorDeScene.Poser(banc.Racine, sombre);
                yield return null;
                tb = banc.Rendre();
                float pireMecanisme = 0f, pireCss = 0f, max1 = 0f;
                float kb = Lin(b);
                for (int y = 40; y < H; y += 110)
                    for (int x = 30; x < W; x += 80)
                    {
                        Color c1 = t1.GetPixel(x, y), cb = tb.GetPixel(x, y);
                        max1 = Mathf.Max(max1, Mathf.Max(c1.r, Mathf.Max(c1.g, c1.b)));
                        for (int k = 0; k < 3; k++)
                        {
                            pireMecanisme = Mathf.Max(pireMecanisme, Mathf.Abs(cb[k] - Gam(kb * Lin(c1[k]))));
                            pireCss = Mathf.Max(pireCss, Mathf.Abs(cb[k] - b * c1[k]));
                        }
                    }
                Assert.Greater(max1 * 255f, 40f, "anti-vacuité : la scène à b = 1 n'est pas noire");
                Assert.LessOrEqual(pireMecanisme * 255f, 2f, $"mécanisme : pixel = γ(lin(b)·lin(c)) — écart {pireMecanisme * 255f:F2}/255");
                Assert.LessOrEqual(pireCss * 255f, 8f, $"écart à brightness({b}) du CSS : {pireCss * 255f:F2}/255 (borne C : 8/255, TD-880)");
                Assert.Greater(pireCss * 255f, pireMecanisme * 255f, "contrôle : la garde CSS mesure bien un AUTRE modèle que le mécanisme");
            }
            finally { Detruire(t1); Detruire(tb); banc.Dispose(); }
        }

        [UnityTest]
        public IEnumerator D4b_FamilleA_HaloOrEnHaut_CyanEnBas_CentreVivant_CerneA5px()
        {
            SpecDecor s = DecorsDeScene.Reputation;
            var banc = new Banc();
            Texture2D t = null;
            try
            {
                DecorDeScene.Poser(banc.Racine, s);
                yield return null;
                t = banc.Rendre();
                float hs = HauteurSupport(s), e = 540f / 300f;
                int yOr = Mathf.FloorToInt(hs * (1f - 0.22f)), yCyan = Mathf.FloorToInt(hs * (1f - 0.96f)), yMi = Mathf.FloorToInt(hs * 0.5f);
                int xBord = Mathf.RoundToInt(25f * e);   // hors de portée de la lueur du cerne (5 + 12 px CSS)
                Color hautCentre = t.GetPixel(W / 2, yOr), hautBord = t.GetPixel(xBord, yOr);
                Color basCentre = t.GetPixel(W / 2, yCyan), basBord = t.GetPixel(xBord, yCyan);
                Assert.Greater((hautCentre.r - hautBord.r) * 255f, 5f, $"halo OR : haut-centre {hautCentre} plus chaud que le bord {hautBord}");
                Assert.Greater((basCentre.b - basBord.b) * 255f, 2f, $"halo CYAN : bas-centre {basCentre} plus froid que le bord {basBord}");
                Assert.Greater(Ecart(t.GetPixel(W / 2, yMi), DesignTokens.Current.surfaceBase) * 255f, 4f, "le centre n'est pas l'aplat surfaceBase");

                // Le cerne : un trait laiton de 1 px CSS à 5 px CSS du bord du support.
                int xTrait = Mathf.FloorToInt(5f * e);
                Color trait = t.GetPixel(xTrait, yMi), dedans = t.GetPixel(Mathf.RoundToInt(11f * e), yMi);
                Color laiton = DesignTokens.Current.hudHairlineGold;
                Assert.Greater(trait.r, 0.5f * laiton.r, $"pixel à 5 px CSS : le trait laiton (vu {trait})");
                Assert.Less(dedans.r, 0.25f, $"à 11 px CSS : plus de trait (vu {dedans})");
                Assert.Greater(trait.r - trait.b, 0.15f, "le trait est laiton (chaud), pas un gris");
            }
            finally { Detruire(t); banc.Dispose(); }
        }

        [UnityTest]
        public IEnumerator D4c_Radial_FoyerALaBonneHauteur_ConventionY()
        {
            SpecDecor s = DecorsDeScene.DecisionDetail;   // ⑤ : `90% 60% at 50% 30%`
            var banc = new Banc();
            Texture2D t = null;
            try
            {
                DecorDeScene.Poser(banc.Racine, s);
                yield return null;
                t = banc.Rendre();
                float hs = HauteurSupport(s);
                Color foyer = t.GetPixel(W / 2, Mathf.FloorToInt(hs * (1f - 0.30f)));
                Color miroir = t.GetPixel(W / 2, Mathf.FloorToInt(hs * 0.30f));
                Proche(Arret(s, 0, 0), foyer, 6f, "⑤ : le foyer à 30 % depuis le HAUT du support");
                Assert.Greater(Ecart(foyer, miroir) * 255f, 12f, "le point symétrique (30 % depuis le bas) n'est pas le foyer");
            }
            finally { Detruire(t); banc.Dispose(); }
        }

        [UnityTest]
        public IEnumerator D4d_FamilleB_ArretsAttendus()
        {
            SpecDecor s = DecorsDeScene.Loi;   // ㉛ : 180°, arrêts 0 / 58 % / 100 %
            var banc = new Banc();
            Texture2D t = null;
            try
            {
                DecorDeScene.Poser(banc.Racine, s);
                yield return null;
                t = banc.Rendre();
                float hs = HauteurSupport(s);
                Proche(Arret(s, 0, 0), t.GetPixel(W / 2, Mathf.FloorToInt(hs) - 1), 3f, "haut du support = 1er arrêt");
                Proche(Arret(s, 0, 1), t.GetPixel(W / 2, Mathf.FloorToInt(hs * (1f - 0.58f))), 4f, "58 % = 2e arrêt");
                Proche(Arret(s, 0, 2), t.GetPixel(W / 2, 0), 3f, "bas du support = dernier arrêt");
            }
            finally { Detruire(t); banc.Dispose(); }
        }

        [UnityTest]
        public IEnumerator D4e_Clip_AucunPixelDuSupportHorsDeSonRect()
        {
            // Scène à luminosité 0 (noire), sans voile : tout pixel non noir au-dessus du support viendrait du cercle.
            SpecSupport liege = DecorsDeScene.Inspection.Support;
            var s = new SpecDecor("t", "t", StatutDecor.Pose, SceneDeFond.District, 0f, 0.10f, liege, voile: false);
            var banc = new Banc();
            Texture2D t = null;
            try
            {
                DecorPose p = DecorDeScene.Poser(banc.Racine, s);
                yield return null;
                Assert.Greater(p.Radiaux[0].rect.height, p.Support.rect.height + 50f,
                    "prémisse : l'Image carrée du cercle DÉBORDE du support (sinon la sonde ne prouve rien)");
                t = banc.Rendre();
                int haut = Mathf.CeilToInt(HauteurSupport(s)) + 2, pixels = 0;
                for (int y = haut; y < H; y += 3)
                    for (int x = 0; x < W; x += 3) if (!Noir(t.GetPixel(x, y), 1f)) pixels++;
                Assert.AreEqual(0, pixels, "zéro pixel de support hors de son rect (RectMask2D)");
                Assert.IsFalse(Noir(t.GetPixel(W / 2, haut - 10)), "contrôle : juste SOUS la limite, le liège est là");
            }
            finally { Detruire(t); banc.Dispose(); }
        }

        [UnityTest]
        public IEnumerator D4f_Cercle_ApresRedimensionnement_CoinLePlusLoinAuDernierArret()
        {
            SpecDecor s = DecorsDeScene.Inspection;   // ⑮ : `circle farthest-corner at 30% 20%`
            var banc = new Banc();
            Texture2D t1 = null, t2 = null;
            try
            {
                DecorPose p = DecorDeScene.Poser(banc.Racine, s);
                yield return null;
                Color dernier = Arret(s, 0, 2);
                float r1 = p.Radiaux[0].sizeDelta.x;
                t1 = banc.Rendre();
                // Le coin le plus loin du foyer (30 %, 20 % depuis le haut) est le coin BAS-DROIT.
                Proche(dernier, t1.GetPixel(W - 1, 0), 6f, "avant : coin le plus loin = dernier arrêt");

                banc.Racine.offsetMax = new Vector2(0f, -460f);   // la racine passe de 960 à 500 de haut
                yield return null;
                float r2 = p.Radiaux[0].sizeDelta.x;
                Assert.Less(r2, 0.8f * r1, $"le rayon a été RECALCULÉ ({r1:F0} → {r2:F0}) : un rayon figé au montage laisserait le coin à t < 1");
                t2 = banc.Rendre();
                Proche(dernier, t2.GetPixel(W - 1, 0), 6f, "après : coin le plus loin = dernier arrêt");
                Assert.Greater(Ecart(dernier, t2.GetPixel(1, Mathf.FloorToInt(500f * 0.9f) - 2)) * 255f, 6f,
                    "contrôle : le coin haut-gauche, plus proche du foyer, n'est PAS au dernier arrêt");
            }
            finally { Detruire(t1); Detruire(t2); banc.Dispose(); }
        }

        [UnityTest]
        public IEnumerator D4g_Raycast_LeCapteurPrendLeClic()
        {
            var banc = new Banc();
            try
            {
                DecorPose p = DecorDeScene.Poser(banc.Racine, DecorsDeScene.Reputation);
                yield return null;
                Canvas.ForceUpdateCanvases();
                var ped = new PointerEventData(EventSystem.current) { position = new Vector2(W / 2f, H / 2f) };
                var hits = new List<RaycastResult>();
                banc.Canvas.GetComponent<GraphicRaycaster>().Raycast(ped, hits);
                Assert.AreEqual(1, hits.Count, "une seule cible : " + string.Join(", ", hits.Select(h => h.gameObject.name)));
                Assert.AreSame(p.Capteur.gameObject, hits[0].gameObject, "le Capteur garde le bloqueur du fond plat (§5.2)");
            }
            finally { banc.Dispose(); }
        }

        [UnityTest]
        public IEnumerator D4i_ReserveDeBande_LeContenuCommenceSousLaBande_EtSuitLeRedimensionnement()
        {
            SpecDecor s = DecorsDeScene.Reputation;   // Bande 21 %
            var banc = new Banc();
            try
            {
                var pile = banc.Racine.gameObject.AddComponent<VerticalLayoutGroup>();
                pile.childControlWidth = true; pile.childControlHeight = true;
                pile.childForceExpandWidth = true; pile.childForceExpandHeight = false;
                var bloc = new GameObject("Bloc", typeof(RectTransform));
                bloc.transform.SetParent(banc.Racine, false);
                bloc.AddComponent<LayoutElement>().preferredHeight = 50f;
                DecorPose p = DecorDeScene.Poser(banc.Racine, s);
                ReserveDeBande r = DecorDeScene.ReserverLaBande(pile, p, 10f);
                yield return null;
                Canvas.ForceUpdateCanvases();
                int attendu = Mathf.RoundToInt(Mathf.Max(ShellChrome.TopInsetPx, H * s.Bande) + 10f);
                Assert.AreEqual(attendu, pile.padding.top, "retrait = bande + marge");
                var coins = new Vector3[4];
                ((RectTransform)bloc.transform).GetWorldCorners(coins);
                float hautDuBloc = banc.Racine.InverseTransformPoint(coins[1]).y + H / 2f;   // y depuis le bas du banc
                Assert.AreEqual(H - attendu, hautDuBloc, 1.5f, "le premier bloc commence sous la bande, sur le support");
                Assert.AreEqual(0, p.transform.GetSiblingIndex(), "le décor reste premier enfant, hors pile");

                // Les DEUX résolutions du dépôt (amendement §5.6) : 9:16 ci-dessus (540×960 ≈ 1080×1920), puis 9:20 (540×1200
                // ≈ 1080×2400 : la racine dépasse le banc, seule sa hauteur compte ici), puis un rétrécissement.
                foreach (float hauteur in new[] { 1200f, 500f })
                {
                    banc.Racine.offsetMax = new Vector2(0f, hauteur - H);
                    yield return null;
                    Canvas.ForceUpdateCanvases();
                    int voulu = Mathf.RoundToInt(Mathf.Max(ShellChrome.TopInsetPx, hauteur * s.Bande) + 10f);
                    Assert.AreEqual(voulu, r.RetraitHaut, $"hauteur {hauteur} : le retrait suit la hauteur réelle (jamais figé au montage)");
                    Assert.AreEqual(voulu, pile.padding.top, $"hauteur {hauteur} : posé sur la pile");
                    ((RectTransform)bloc.transform).GetWorldCorners(coins);
                    float haut = banc.Racine.InverseTransformPoint(coins[1]).y + banc.Racine.rect.height * banc.Racine.pivot.y;
                    Assert.AreEqual(hauteur - voulu, haut, 1.5f, $"hauteur {hauteur} : le premier bloc commence sous la bande");
                }
            }
            finally { banc.Dispose(); }
        }

        [UnityTest]
        public IEnumerator D4h_Points_TuileALEchelleDeLaMaquette()
        {
            SpecDecor s = DecorsDeScene.Compression;   // ⑭ : points tous les 26 px CSS
            var banc = new Banc();
            Texture2D t = null;
            try
            {
                DecorDeScene.Poser(banc.Racine, s);
                yield return null;
                t = banc.Rendre();
                // La rangée de points la plus fournie dans les 100 premières lignes, et le nombre de points qu'elle traverse.
                int meilleurs = 0;
                for (int y = 0; y < 100; y++)
                {
                    int runs = 0; bool dans = false;
                    for (int x = 0; x < W; x++)
                    {
                        bool clair = t.GetPixel(x, y).r * 255f > 52f;   // le point #4a5057 (r 74) sur la tôle (r ≤ 42)
                        if (clair && !dans) runs++;
                        dans = clair;
                    }
                    meilleurs = Mathf.Max(meilleurs, runs);
                }
                // 540 px / (26 px CSS × 540/300) = 11,5 tuiles par rangée. Une tuile à l'échelle de sa texture en donnerait ~5.
                Assert.That(meilleurs, Is.InRange(10, 13), $"{meilleurs} points sur une rangée : la tuile n'est pas à 26 px CSS");
            }
            finally { Detruire(t); banc.Dispose(); }
        }
    }
}
