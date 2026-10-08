using System;
using System.Collections;
using NUnit.Framework;
using TMPro;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.Theme;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    /// <summary>⑤ « la décision du jour » — LA CARTE ET SON FEUTRE (juge d'ensemble r1, 08/10 — F12 + F13). Série 6, cadre 5 de `ecrans-brennar-6.html` :
    /// `.carte-or{width:176px;min-height:212px}`, `.bandes{display:flex;justify-content:space-between;border-top:1px solid #93402c44}`, `.cachet`, `.jeton-or .piece{border:2px dashed #fff6}`,
    /// `.tapis-feutre` qui ÉPOUSE son contenu.
    ///
    /// ⛔ Une garde de PARAMÈTRES n'est pas une garde d'EFFET : le cachet se juge sur les PIXELS rendus (rouge vif > 0), le moletage sur l'alternance de la couronne du sprite, le feutre sur la
    /// part de feutre VIDE au-dessus de la carte, le contenu sur sa position dans la fenêtre. Banc : le Canvas du shell est `ScaleWithScreenSize` 1280 de large ; ici `ConstantPixelSize` à
    /// `largeur / 1280` donne le même repère (1 CSS = 1280/300 unités) sur une cible de 540 px de large. Aucun littéral de couleur (TD-612) : seuils d'octets, jetons lus sur `DesignTokens`.</summary>
    public class DecisionDetailCartePlayModeTests
    {
        private float hautAvant, basAvant;
        private GameObject ecranGo;

        [SetUp]
        public void SetUp()
        {
            hautAvant = ShellChrome.TopInsetPx; basAvant = ShellChrome.BottomInsetPx;
            ShellChrome.PublierInsets(200f, 300f);   // une barre et un dock plausibles, en unités de canvas
        }

        [TearDown]
        public void TearDown()
        {
            ShellChrome.PublierInsets(hautAvant, basAvant);
            MafiaCleanCity.I18n.I18nCatalog.Oublier();
            if (ecranGo != null) Object.DestroyImmediate(ecranGo);
            ecranGo = null;
        }

        // ═══ le banc ═════════════════════════════════════════════════════════════════════════════════════════════════

        private sealed class Banc : IDisposable
        {
            public readonly int W, H;
            public readonly RenderTexture Rt; public readonly Camera Cam; public readonly Canvas Canvas; public readonly RectTransform Racine;
            private readonly GameObject camGo, canGo;
            public Banc(int largeur, int hauteur)
            {
                W = largeur; H = hauteur;
                Rt = new RenderTexture(W, H, 24, RenderTextureFormat.ARGB32);
                camGo = new GameObject("dc_cam"); Cam = camGo.AddComponent<Camera>();
                Cam.targetTexture = Rt; Cam.clearFlags = CameraClearFlags.SolidColor; Cam.backgroundColor = Color.black;
                Cam.orthographic = true; Cam.enabled = false;
                canGo = new GameObject("dc_canvas", typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
                Canvas = canGo.GetComponent<Canvas>(); Canvas.renderMode = RenderMode.ScreenSpaceCamera; Canvas.worldCamera = Cam;
                CanvasScaler sc = canGo.GetComponent<CanvasScaler>();
                sc.uiScaleMode = CanvasScaler.ScaleMode.ConstantPixelSize;
                sc.scaleFactor = W / 1280f;   // le canvas du shell fait 1280 unités de large : K = 1280/300 par px CSS
                var r = new GameObject("Racine", typeof(RectTransform));
                r.transform.SetParent(canGo.transform, false);
                Racine = (RectTransform)r.transform;
                Racine.anchorMin = Vector2.zero; Racine.anchorMax = Vector2.one; Racine.offsetMin = Vector2.zero; Racine.offsetMax = Vector2.zero;
            }
            public Texture2D Rendre()
            {
                Canvas.ForceUpdateCanvases(); Cam.Render();
                RenderTexture avant = RenderTexture.active; RenderTexture.active = Rt;
                var t = new Texture2D(W, H, TextureFormat.RGB24, false);
                t.ReadPixels(new Rect(0, 0, W, H), 0, 0); t.Apply(); RenderTexture.active = avant;
                return t;
            }
            /// <summary>Le pixel (origine en BAS) du point (`fx`, `fy` ∈ [0, 1]) du rect `r`.</summary>
            public Vector2Int Pixel(RectTransform r, float fx, float fy)
            {
                var c = (RectTransform)Canvas.transform;
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

        private static float PxCss(float css) => css * 1280f / 300f;

        private static HlCardDto Carte(bool structurelle = false) =>
            new HlCardDto { card_id = "carte-du-banc", decision_type_key = "AUTONOMY_REPORTS_PENDING", impact_bucket = "moderate", urgency_bucket = "elevated", structural = structurelle };

        /// <summary>Monte ⑤ sous la racine du banc (le patron de `DecorDeScenePlayModeTests.D4j`), y affiche une carte (ou le sabot si `avecCarte` est faux) et laisse la mise en page se poser.</summary>
        private IEnumerator Monter(Banc banc, Action<DecisionDetailScreenController> pret, bool avecCarte = true)
        {
            ecranGo = new GameObject("EcranDecision", typeof(RectTransform));
            ecranGo.transform.SetParent(banc.Racine, false);
            RectTransform rt = (RectTransform)ecranGo.transform;
            rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one; rt.offsetMin = Vector2.zero; rt.offsetMax = Vector2.zero;
            DecisionDetailScreenController ecran = ecranGo.AddComponent<DecisionDetailScreenController>();
            ecran.Afficher(avecCarte ? Carte() : null, new StructuralBudgetDto { used = 0, cap_reached = false });
            yield return Stabiliser();
            pret(ecran);
        }

        /// <summary>Quelques images : `PileDeDecision` relit ses insets en `LateUpdate`, la mise en page se rejoue, le support suit — puis on force la dernière passe.</summary>
        private static IEnumerator Stabiliser()
        {
            for (int i = 0; i < 4; i++) { yield return null; Canvas.ForceUpdateCanvases(); }
        }

        private static Transform Sous(DecisionDetailScreenController e, string chemin)
        {
            Transform t = e.transform.Find(chemin);
            Assert.IsNotNull(t, "absent de ⑤ : " + chemin);
            return t;
        }

        /// <summary>Le rect de `r` dans le repère LOCAL de `repere` (la carte, inclinée, sert de repère à tout ce qu'elle porte : la rotation s'annule).</summary>
        private static Rect Dans(RectTransform repere, RectTransform r)
        {
            var c = new Vector3[4]; r.GetWorldCorners(c);
            float x0 = float.MaxValue, y0 = float.MaxValue, x1 = float.MinValue, y1 = float.MinValue;
            foreach (Vector3 w in c)
            {
                Vector3 l = repere.InverseTransformPoint(w);
                x0 = Mathf.Min(x0, l.x); y0 = Mathf.Min(y0, l.y); x1 = Mathf.Max(x1, l.x); y1 = Mathf.Max(y1, l.y);
            }
            return new Rect(x0, y0, x1 - x0, y1 - y0);
        }

        private static Rect Monde(RectTransform r)
        {
            var c = new Vector3[4]; r.GetWorldCorners(c);
            return new Rect(c[0].x, c[0].y, c[2].x - c[0].x, c[2].y - c[0].y);
        }

        // ═══ F13 (a) + (b) + (e) — la géométrie de la carte ══════════════════════════════════════════════════════════

        [UnityTest]
        [Category("DecisionCarte")]
        public IEnumerator F13a_LaCarteEstUnPortrait_176Css_PlancherDe212()
        {
            var banc = new Banc(540, 960);
            try
            {
                DecisionDetailScreenController e = null;
                yield return Monter(banc, x => e = x);
                RectTransform carte = e.CarteRect;
                Assert.AreEqual(PxCss(176f), carte.rect.width, 1.5f, "la carte a SA largeur : 176 CSS (`.carte-or{width:176px}`), pas toute la largeur que le jeton laisse");
                Assert.GreaterOrEqual(carte.rect.height, PxCss(212f) - 1f, "le plancher `min-height:212px`");
                Assert.Less(carte.rect.width / carte.rect.height, 1f, $"PORTRAIT (L/H < 1) : {carte.rect.width:0}×{carte.rect.height:0} — le jeu la rendait en paysage 702×330 (L/H = 2,13)");
                // la table est CENTRÉE : la carte + le jeton (64 CSS) + l'écart (14 CSS) tiennent au milieu de la pile
                RectTransform table = (RectTransform)Sous(e, "Fenetre/Defile/Pile/TableDeJeu");
                RectTransform jeton = (RectTransform)Sous(e, "Fenetre/Defile/Pile/TableDeJeu/JetonStruct");
                Rect rt = Dans(table, table), rc = Dans(table, carte), rj = Dans(table, jeton);
                float gaucheLibre = Mathf.Min(rc.xMin, rj.xMin) - rt.xMin, droiteLibre = rt.xMax - Mathf.Max(rc.xMax, rj.xMax);
                Assert.AreEqual(gaucheLibre, droiteLibre, PxCss(6f), $"la table de jeu est centrée (marge gauche {gaucheLibre:0}, droite {droiteLibre:0})");
            }
            finally { banc.Dispose(); }
        }

        [UnityTest]
        [Category("DecisionCarte")]
        public IEnumerator F13b_PorteeEtUrgence_SontDesColonnes_AuxDeuxBords_SousUnFiletPose()
        {
            var banc = new Banc(540, 960);
            try
            {
                DecisionDetailScreenController e = null;
                yield return Monter(banc, x => e = x);
                RectTransform carte = e.CarteRect;
                const string bandes = "Fenetre/Defile/Pile/TableDeJeu/CarteDuJour/Bandes";
                RectTransform portee = (RectTransform)Sous(e, bandes + "/BandePortée"), urgence = (RectTransform)Sous(e, bandes + "/BandeUrgence");
                foreach (RectTransform col in new[] { portee, urgence })
                {
                    Rect lib = Dans(carte, (RectTransform)col.Find("Lib")), pips = Dans(carte, (RectTransform)col.Find("Pips")), val = Dans(carte, (RectTransform)col.Find("Val"));
                    Assert.Greater(lib.center.y, pips.center.y + 1f, col.name + " : le libellé est AU-DESSUS des pips (colonne), pas à leur gauche");
                    Assert.Greater(pips.center.y, val.center.y + 1f, col.name + " : les pips sont AU-DESSUS de la valeur");
                    Assert.AreEqual(lib.center.x, pips.center.x, 2f, col.name + " : libellé et pips sont centrés l'un sur l'autre");
                    Assert.AreEqual(val.center.x, pips.center.x, 2f, col.name + " : valeur et pips sont centrés l'un sur l'autre");
                }
                Rect rp = Dans(carte, portee), ru = Dans(carte, urgence), rb = Dans(carte, (RectTransform)Sous(e, bandes));
                Assert.Less(rp.xMax, ru.xMin, "PORTÉE à gauche, URGENCE à droite : côte à côte, pas empilées");
                Assert.AreEqual(rp.center.y, ru.center.y, PxCss(3f), "les deux colonnes sont sur la même rangée");
                Assert.AreEqual(rb.xMin, rp.xMin, 2f, "`justify-content:space-between` : la 1ʳᵉ colonne touche le bord gauche de la rangée…");
                Assert.AreEqual(rb.xMax, ru.xMax, 2f, "… la 2ᵉ le bord droit");
                // le filet haut est POSÉ par `Filets` (garde D6b : jamais un Image à la main), sur le bord HAUT de la rangée
                Transform filets = Sous(e, bandes + "/" + Filets.NomConteneur);
                Assert.IsNotNull(filets.GetComponent<FiletsPoses>(), "le conteneur de filets est celui de `Filets.Poser`");
                RectTransform haut = (RectTransform)filets.Find("Haut");
                Assert.IsNotNull(haut, "le filet `border-top` de `.bandes`");
                Assert.AreEqual(rb.yMax, Dans(carte, haut).yMax, 1.5f, "le filet est au HAUT de la rangée");
            }
            finally { banc.Dispose(); }
        }

        [UnityTest]
        [Category("DecisionCarte")]
        public IEnumerator F13e_LeTitre_EstEnGras_CentreDansLaCarte()
        {
            var banc = new Banc(540, 960);
            try
            {
                DecisionDetailScreenController e = null;
                yield return Monter(banc, x => e = x);
                TextMeshProUGUI titre = Sous(e, "Fenetre/Defile/Pile/TableDeJeu/CarteDuJour/Titre").GetComponent<TextMeshProUGUI>();
                Assert.IsTrue((titre.fontStyle & FontStyles.Bold) != 0, "`font-weight:700`");
                Assert.AreEqual(TextAlignmentOptions.Center, titre.alignment, "centré horizontalement ET verticalement dans sa boîte élastique");
                RectTransform carte = e.CarteRect;
                Rect rt = Dans(carte, titre.rectTransform);
                Assert.AreEqual(carte.rect.center.x, rt.center.x, PxCss(4f), "le titre est centré en largeur dans la carte");
                Assert.Greater(rt.height, PxCss(30f), "la boîte du titre est ÉLASTIQUE (`margin:auto`) : elle prend ce que le plancher de la carte laisse");
            }
            finally { banc.Dispose(); }
        }

        // ═══ F13 (c) — le cachet de cire : l'EFFET, sur les pixels ══════════════════════════════════════════════════

        private static int RougeVif(Texture2D t, int x0, int y0, int x1, int y1)
        {
            int n = 0;
            for (int x = Mathf.Max(0, x0); x <= Mathf.Min(t.width - 1, x1); x++)
                for (int y = Mathf.Max(0, y0); y <= Mathf.Min(t.height - 1, y1); y++)
                {
                    Color32 c = t.GetPixel(x, y);
                    if (c.r > 170 && c.g < 70 && c.b < 60) n++;   // la définition du juge : R > 170, G < 70, B < 60 (maquette : 307 px)
                }
            return n;
        }

        [UnityTest]
        [Category("DecisionCarte")]
        public IEnumerator F13c_LeCachetDeCire_RougeVif_RendeSurLesPixels_ADeborderDuCoin()
        {
            var banc = new Banc(540, 960);
            Texture2D t = null;
            try
            {
                DecisionDetailScreenController e = null;
                yield return Monter(banc, x => e = x);
                t = banc.Rendre();
                RectTransform cachet = (RectTransform)Sous(e, "Fenetre/Defile/Pile/TableDeJeu/CarteDuJour/CachetDeCire");
                Vector2Int[] coins = { banc.Pixel(cachet, 0f, 0f), banc.Pixel(cachet, 1f, 0f), banc.Pixel(cachet, 0f, 1f), banc.Pixel(cachet, 1f, 1f) };
                int x0 = int.MaxValue, y0 = int.MaxValue, x1 = int.MinValue, y1 = int.MinValue;
                foreach (Vector2Int c in coins) { x0 = Mathf.Min(x0, c.x); y0 = Mathf.Min(y0, c.y); x1 = Mathf.Max(x1, c.x); y1 = Mathf.Max(y1, c.y); }
                int rouge = RougeVif(t, x0, y0, x1, y1);
                Assert.GreaterOrEqual(rouge, 150, $"le cachet rendu a du rouge vif ({rouge} px ; 0 avant F13 : « un réglage valide et non nul peut ne produire AUCUN pixel »)");

                // contrôle négatif : le reste de la carte (encre rouge brique, crème, or) n'a PAS de rouge vif — le seuil discrimine
                RectTransform titre = (RectTransform)Sous(e, "Fenetre/Defile/Pile/TableDeJeu/CarteDuJour/Titre");
                Vector2Int a = banc.Pixel(titre, 0f, 0f), b = banc.Pixel(titre, 1f, 1f);
                Assert.AreEqual(0, RougeVif(t, Mathf.Min(a.x, b.x), Mathf.Min(a.y, b.y), Mathf.Max(a.x, b.x), Mathf.Max(a.y, b.y)), "contrôle : aucun rouge vif dans la boîte du titre");

                // il DÉBORDE du coin : son centre est à 8 CSS DEDANS du bord droit, à 4 CSS SOUS le bord haut, et sa moitié extérieure dépasse du haut
                RectTransform carte = e.CarteRect;
                Rect rc = Dans(carte, cachet);
                Assert.AreEqual(carte.rect.xMax - PxCss(8f), rc.center.x, PxCss(2f), "centre à 8 CSS du bord droit");
                Assert.AreEqual(carte.rect.yMax - PxCss(4f), rc.center.y, PxCss(2f), "centre à 4 CSS sous le bord haut");
                Assert.Greater(rc.yMax, carte.rect.yMax + PxCss(10f), "il se pose à cheval sur le bord : son haut dépasse la carte (`top:-14px`)");
                // le glyphe « ♦ » or est posé sur le cachet
                TextMeshProUGUI glyphe = cachet.Find("Glyphe").GetComponent<TextMeshProUGUI>();
                Assert.AreEqual(DesignTokens.Current.hudMoneyGold, glyphe.color, "le « ♦ » est d'or vif (jeton hudMoneyGold)");
            }
            finally { if (t != null) Object.DestroyImmediate(t); banc.Dispose(); }
        }

        // ═══ F13 (d) — le jeton moleté : l'alternance de la couronne ════════════════════════════════════════════════

        /// <summary>Le nombre de FRANCHISSEMENTS (tiret ↔ vide) d'une couronne de rayon `rayon` du sprite `s` : un SAUT local de luminance (> 0,03 entre deux échantillons à 1,5 px d'arc), les pixels
        /// consécutifs d'un même bord comptés pour un. Un dégradé lisse ne saute pas ; un bord de tiret saute de 0,14 à 0,5. (Un seuil à mi-course des extrêmes serait faussé par le dégradé du fond.)</summary>
        private static int Franchissements(Sprite s, float rayon)
        {
            Texture2D tex = s.texture;
            float c = tex.width / 2f;
            int pas = Mathf.Max(8, Mathf.RoundToInt(2f * Mathf.PI * rayon / 1.5f));
            float precedent = 0f;
            int n = 0;
            bool enSaut = false;
            for (int i = 0; i <= pas; i++)
            {
                float a = 2f * Mathf.PI * i / pas;
                float lum = tex.GetPixel(Mathf.FloorToInt(c + rayon * Mathf.Cos(a)), Mathf.FloorToInt(c + rayon * Mathf.Sin(a))).grayscale;
                bool saut = i > 0 && Mathf.Abs(lum - precedent) > 0.03f;
                if (saut && !enSaut) n++;
                enSaut = saut;
                precedent = lum;
            }
            return n;
        }

        [Test]
        [Category("DecisionCarte")]
        public void F13d_DisqueMolete_LaCouronneAlterneTiretEtVide_UnDisquePlatNon()
        {
            const int d = 180;
            const float bordure = 8f, periode = 40f, fraction = 0.6f;
            var arrets = new[] { (0f, Color.white), (1f, Color.white) };   // un fond UNI : seule l'alternance des tirets fait varier la couronne
            Sprite molete = ProceduralUI.DisqueMolete(d, new Vector2(0.4f, 0.32f), arrets, 12f, Color.yellow, bordure, periode, fraction, Color.black, 0.5f);
            Sprite sansTiret = ProceduralUI.DisqueMolete(d, new Vector2(0.4f, 0.32f), arrets, 12f, Color.yellow, bordure, periode, fraction, Color.black, 0f);
            float rayonDesTirets = d / 2f - bordure / 2f;
            int n = ProceduralUI.NombreDeTirets(d, bordure, periode);
            Assert.GreaterOrEqual(n, 10, "assez de tirets pour que le test discrimine");
            int vus = Franchissements(molete, rayonDesTirets);
            Assert.That(vus, Is.InRange(2 * n - 2, 2 * n + 2), $"la couronne alterne {n} tirets ⇒ ≈ {2 * n} franchissements (vus : {vus})");
            Assert.AreEqual(0, Franchissements(sansTiret, rayonDesTirets), "CONTRÔLE : à opacité nulle le bord est lisse — un disque plat n'alterne pas (le défaut mesuré : 1,25 d'écart-type)");
            Assert.AreEqual(0, Franchissements(molete, d / 2f - bordure - 4f), "en deçà de la bordure (sur la tranche) il n'y a pas de moletage");
        }

        [UnityTest]
        [Category("DecisionCarte")]
        public IEnumerator F13d_LeJetonDeCinq_EstMolete_LaTrancheDoreEstLa()
        {
            var banc = new Banc(540, 960);
            try
            {
                DecisionDetailScreenController e = null;
                yield return Monter(banc, x => e = x);
                Image piece = Sous(e, "Fenetre/Defile/Pile/TableDeJeu/JetonStruct/Jeton/Piece").GetComponent<Image>();
                Assert.IsNotNull(piece.sprite, "la pièce a son sprite");
                float d = piece.sprite.texture.width, bordure = PxCss(2f);
                int n = ProceduralUI.NombreDeTirets(d, bordure, PxCss(10f));
                int vus = Franchissements(piece.sprite, d / 2f - bordure / 2f);
                Assert.That(vus, Is.InRange(2 * n - 2, 2 * n + 2), $"le jeton de ⑤ est moleté : {n} tirets ⇒ ≈ {2 * n} franchissements (vus : {vus})");
                Assert.Greater(vus, 20, "au moins une vingtaine de crans — pas un contour continu");
                // la tranche dorée (`inset 0 0 0 3px #b08d3e`) est sous le moletage : le pixel à mi-épaisseur de la tranche est de ce laiton
                Texture2D tex = piece.sprite.texture;
                float rt = d / 2f - bordure - PxCss(1.5f);
                Color c = tex.GetPixel(Mathf.FloorToInt(d / 2f + rt), Mathf.FloorToInt(d / 2f));
                Color laiton = DesignTokens.Current.hudHairlineGold;
                Assert.LessOrEqual(Mathf.Max(Mathf.Abs(c.r - laiton.r), Mathf.Abs(c.g - laiton.g), Mathf.Abs(c.b - laiton.b)) * 255f, 4f,
                    $"la tranche est le laiton du jeton (vu {c})");
            }
            finally { banc.Dispose(); }
        }

        // ═══ F12 — le feutre épouse le contenu ; ce qui dépasse défile ════════════════════════════════════════════

        /// <summary>La part de feutre VIDE au-dessus de la carte : (haut du feutre − haut de la carte) / hauteur du feutre, dans le repère du banc (la carte inclinée : son coin le plus haut).</summary>
        private static float PartDeFeutreVide(Banc banc, DecisionDetailScreenController e, out float hauteurFeutre)
        {
            DecorPose pose = e.GetComponentInChildren<DecorPose>(true);
            Rect feutre = Dans(banc.Racine, pose.Support), carte = Dans(banc.Racine, e.CarteRect);
            hauteurFeutre = feutre.height;
            return (feutre.yMax - carte.yMax) / feutre.height;
        }

        [UnityTest]
        [Category("DecisionCarte")]
        public IEnumerator F12_LeFeutreEpouseLeContenu_AuxHauteursDeBanc_LeVideAuDessusDeLaCarteEstPetit()
        {
            foreach (int hauteur in new[] { 960, 1200 })   // 9:16 (≈ 1080×1920) et 9:20 (≈ 1080×2400)
            {
                var banc = new Banc(540, hauteur);
                try
                {
                    DecisionDetailScreenController e = null;
                    yield return Monter(banc, x => e = x);
                    PileDeDecision pile = e.LaPile;
                    Assert.IsFalse(pile.Deborde, $"{hauteur} : prémisse — le contenu TIENT dans la fenêtre ({pile.HauteurPreferee:0} pour {pile.HauteurDeLaFenetre:0})");
                    float vide = PartDeFeutreVide(banc, e, out float hFeutre);
                    Assert.Less(vide, 0.08f, $"{hauteur} : {vide:P1} de feutre vide au-dessus de la carte (maquette : 2 % ; le jeu : 55 % avec le support ancré à 34 %)");
                    Assert.Greater(vide, -0.001f, $"{hauteur} : la carte ne dépasse pas le haut du feutre ({vide:P1})");
                    // le haut du feutre calculé EST le haut de la pile mesurée
                    RectTransform pileRt = (RectTransform)Sous(e, "Fenetre/Defile/Pile");
                    float hautPile = banc.Racine.rect.yMax - Dans(banc.Racine, pileRt).yMax;
                    Assert.AreEqual(hautPile, pile.HautDuFeutre, 2f, $"{hauteur} : le feutre commence où la pile commence");
                    // ancré par des OFFSETS : pleine hauteur d'ancres, jamais `1 − Bande` (une fraction)
                    DecorPose pose = e.GetComponentInChildren<DecorPose>(true);
                    Assert.AreEqual(1f, pose.Support.anchorMax.y, 1e-4f, $"{hauteur} : le support n'est plus ancré à une fraction de la hauteur");
                    Assert.AreEqual(0f, pose.Support.anchorMin.y, 1e-4f);
                    Assert.Less(hFeutre, banc.Racine.rect.height, $"{hauteur} : le feutre ne couvre pas tout l'écran (la scène reste visible en haut)");
                }
                finally { banc.Dispose(); }
                if (ecranGo != null) { Object.DestroyImmediate(ecranGo); ecranGo = null; }
            }
        }

        [UnityTest]
        [Category("DecisionCarte")]
        public IEnumerator F12_LeHautDuFeutreSuitLaHauteurDuContenu_PasUneFraction()
        {
            var banc = new Banc(540, 960);
            try
            {
                DecisionDetailScreenController e = null;
                yield return Monter(banc, x => e = x);
                float avecCarte = e.LaPile.HautDuFeutre, prefAvec = e.LaPile.HauteurPreferee;
                // la carte se retire (le sabot) : le contenu rétrécit, le feutre se RABAISSE de la différence — une fraction fixe ne bougerait pas
                e.Afficher(null, new StructuralBudgetDto { used = 0, cap_reached = false });
                yield return Stabiliser();
                float sansCarte = e.LaPile.HautDuFeutre, prefSans = e.LaPile.HauteurPreferee;
                Assert.Less(prefSans, prefAvec - PxCss(100f), "prémisse : le contenu a rétréci");
                Assert.AreEqual(prefAvec - prefSans, sansCarte - avecCarte, 2f, "le haut du feutre descend exactement de ce que le contenu a perdu");
            }
            finally { banc.Dispose(); }
        }

        [UnityTest]
        [Category("DecisionCarte")]
        public IEnumerator F12_ContenuDansSonPanneau_JamaisTranche_NiImprimeSurLeReste_ADefilementAtteignable()
        {
            // le patron de `ScreenB7G1` (㊴) : (a) une fenêtre DÉFILANTE sur un contenu qui épouse ses enfants, (b) aucun texte écrasé sous sa hauteur préférée, (c) rien n'est imprimé sur autre
            // chose, (d) sous une fenêtre volontairement trop BASSE, le contenu défile et sa dernière ligne est ATTEIGNABLE.
            foreach (int hauteur in new[] { 960, 480 })   // 480 px ≈ 1138 unités : plus bas que la pile
            {
                var banc = new Banc(540, hauteur);
                try
                {
                    DecisionDetailScreenController e = null;
                    yield return Monter(banc, x => e = x);
                    string ou = $"{hauteur} px : ";
                    ListeDefilante fen = e.FenetreDefilante;
                    RectTransform fenetre = (RectTransform)Sous(e, "Fenetre"), defile = (RectTransform)Sous(e, "Fenetre/Defile"), pile = (RectTransform)Sous(e, "Fenetre/Defile/Pile");
                    Assert.IsNotNull(fen, ou + "⑤ n'a pas de ListeDefilante");
                    Assert.AreSame(fenetre, fen.Defilement.viewport, ou + "la fenêtre est `Fenetre`");
                    Assert.AreSame(defile, fen.Defilement.content, ou + "le contenu défilant est `Defile`");
                    Assert.IsNotNull(fenetre.GetComponent<RectMask2D>(), ou + "la fenêtre est masquée (RectMask2D) — sous ListeDefilante, donc dans la garde de classe");

                    // (b) aucun texte écrasé sous sa hauteur préférée
                    foreach (TextMeshProUGUI tx in pile.GetComponentsInChildren<TextMeshProUGUI>(false))
                    {
                        tx.ForceMeshUpdate();
                        Assert.LessOrEqual(tx.preferredHeight, tx.rectTransform.rect.height + 1f,
                            ou + $"« {tx.text} » ({tx.name}) est écrasé : il lui faut {tx.preferredHeight:0.#}, il a {tx.rectTransform.rect.height:0.#}");
                    }
                    // (c) la pile est DANS son contenu défilant, et chaque bloc est dans la pile et SOUS le précédent
                    Rect rd = Monde(defile), rp = Monde(pile);
                    Assert.GreaterOrEqual(rp.yMin, rd.yMin - 0.5f, ou + "la pile sort sous son contenu défilant");
                    Assert.LessOrEqual(rp.yMax, rd.yMax + 0.5f, ou + "la pile sort au-dessus de son contenu défilant");
                    Rect table = Monde((RectTransform)pile.Find("TableDeJeu")), note = Monde((RectTransform)pile.Find("NoteZinc")), tampon = Monde((RectTransform)pile.Find("Tampon"));
                    Assert.LessOrEqual(note.yMax, table.yMin + 0.5f, ou + "la note recouvre la table de jeu");
                    Assert.LessOrEqual(tampon.yMax, note.yMin + 0.5f, ou + "le tampon recouvre la note");
                    foreach (RectTransform enfant in pile)
                        if (enfant.gameObject.activeSelf)
                        {
                            Rect re = Monde(enfant);
                            Assert.GreaterOrEqual(re.yMin, rp.yMin - 0.5f, ou + enfant.name + " sort sous la pile");
                            Assert.LessOrEqual(re.yMax, rp.yMax + 0.5f, ou + enfant.name + " sort au-dessus de la pile");
                        }

                    if (hauteur == 960)
                    {
                        Assert.IsFalse(e.LaPile.Deborde, ou + "prémisse : à 9:16 le contenu tient — rien ne défile");
                        continue;
                    }

                    // (d) fenêtre trop BASSE : le contenu défile, le fondu le dit, la dernière ligne est atteignable, le haut aussi
                    fen.Rafraichir();
                    Assert.IsTrue(e.LaPile.Deborde, ou + "prémisse : la pile dépasse la fenêtre");
                    Assert.IsTrue(fen.ContenuDepasse, ou + "le contenu doit se dire « il y a une suite »");
                    DecorPose pose = e.GetComponentInChildren<DecorPose>(true);
                    Assert.AreEqual(ShellChrome.TopInsetPx, e.LaPile.HautDuFeutre, 1f, ou + "le feutre couvre toute la fenêtre quand le contenu déborde");
                    Assert.AreEqual(0f, pose.Support.anchorMin.y, 1e-4f);
                    TextMeshProUGUI derniere = Sous(e, "Fenetre/Defile/Pile/Tampon/Sous").GetComponent<TextMeshProUGUI>();
                    fen.Defilement.verticalNormalizedPosition = 0f;
                    Canvas.ForceUpdateCanvases(); fen.Rafraichir();
                    Assert.GreaterOrEqual(Monde(derniere.rectTransform).yMin, Monde(fenetre).yMin - 1f, ou + "la dernière ligne reste sous la fenêtre au bout de la course (inatteignable)");
                    fen.Defilement.verticalNormalizedPosition = 1f;
                    Canvas.ForceUpdateCanvases(); fen.Rafraichir();
                    Assert.LessOrEqual(Monde(pile).yMax, Monde(fenetre).yMax + 1f, ou + "le HAUT de la pile (la carte) est atteignable aussi");
                    Assert.IsTrue(fen.Defilement.GetComponent<Image>().raycastTarget, ou + "la fenêtre reçoit le geste quand le contenu défile");
                }
                finally { banc.Dispose(); }
                if (ecranGo != null) { Object.DestroyImmediate(ecranGo); ecranGo = null; }
            }
        }

        // ═══ structurel — la leçon de ㊴ ═════════════════════════════════════════════════════════════════════════════

        /// <summary>« Un `HorizontalLayoutGroup` à `childForceExpandHeight` dans une pile verticale sans `LayoutElement.flexibleHeight = 0` » rend sa hauteur flexible à la pile (la boîte prend tout).</summary>
        private static bool RendSaHauteurALaPile(HorizontalLayoutGroup h)
        {
            if (!h.childForceExpandHeight) return false;
            LayoutElement le = h.GetComponent<LayoutElement>();
            return le == null || le.flexibleHeight != 0f;
        }

        [UnityTest]
        [Category("DecisionCarte")]
        public IEnumerator F12_Structure_LesGraphiquesSontMaskables_ArmesDeLeurCanvasRenderer_AucuneHauteurParFraction()
        {
            var banc = new Banc(540, 960);
            try
            {
                DecisionDetailScreenController e = null;
                yield return Monter(banc, x => e = x);
                Transform fenetre = Sous(e, "Fenetre");
                foreach (Graphic g in fenetre.GetComponentsInChildren<Graphic>(true))
                {
                    Assert.IsNotNull(g.GetComponent<CanvasRenderer>(), g.name + " : un Graphic sans CanvasRenderer ne dessine rien et la console reste muette");
                    Assert.IsInstanceOf<MaskableGraphic>(g, g.name + " : sous un masque, uniquement des MaskableGraphic");
                }
                foreach (HorizontalLayoutGroup h in fenetre.GetComponentsInChildren<HorizontalLayoutGroup>(true))
                    Assert.IsFalse(RendSaHauteurALaPile(h), h.name + " : un groupe horizontal à childForceExpandHeight rend sa hauteur flexible à la pile — LayoutElement.flexibleHeight = 0 l'en empêche");
                // CONTRÔLE POSITIF du prédicat : un groupe qui force sa hauteur, sans LayoutElement, EST vu
                var go = new GameObject("faute", typeof(RectTransform));
                try
                {
                    HorizontalLayoutGroup faute = go.AddComponent<HorizontalLayoutGroup>();
                    faute.childForceExpandHeight = true;
                    Assert.IsTrue(RendSaHauteurALaPile(faute), "contrôle positif : la faute est vue");
                    go.AddComponent<LayoutElement>().flexibleHeight = 0f;
                    Assert.IsFalse(RendSaHauteurALaPile(faute), "contrôle : flexibleHeight = 0 la lève");
                }
                finally { Object.DestroyImmediate(go); }
                // la pile ne se pose pas par une hauteur FIXE : ses hauteurs sont celles de son contenu
                LayoutElement tableLe = Sous(e, "Fenetre/Defile/Pile/TableDeJeu").GetComponent<LayoutElement>();
                Assert.AreEqual(0f, tableLe.flexibleHeight, "la table de jeu ne prend pas de hauteur à la pile");
            }
            finally { banc.Dispose(); }
        }
    }
}
