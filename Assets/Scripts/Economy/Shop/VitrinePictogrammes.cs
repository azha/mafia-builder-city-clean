using UnityEngine;
using UnityEngine.UI;
using TMPro;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;

namespace MafiaCleanCity.Economy.Shop
{
    /// <summary>LES DESSINS D'ARTICLE de ㉓ (A3 du juge groupé du 07/10 : « un disque uni, identique pour les quatre produits — le dessin ne distingue plus aucun produit ») : les cinq pictogrammes des cadres 98-100
    /// de `ecrans-brennar-6.html` (atelier 7159e54, re-rendus en Marks), RECOPIÉS de leur SVG (viewBox 84×54, rendu 64×41 px CSS) en primitives uGUI — rectangles arrondis, ellipses (un disque radial étiré), anneaux,
    /// segments, un chiffre. Et le JETON (la pièce au T, `svg.jt`) : l'objet dessiné de la monnaie, dans la pastille du solde et sur l'étiquette de prix.
    ///   · la PILE DE PIÈCES des liasses — autant d'épaisseurs que la liasse est grosse (1, 3, 5, 8 : le rang de la liasse parmi les siennes, par ce qu'elle donne) ;
    ///   · la PLAQUE AUX TROIS COULEURS (couleurs d'indicatif) · le TABLEAU DE BORD au sodium (thème) · la CLÉ et son étiquette numérotée (une partie de plus) · l'ENVELOPPE scellée (soutien au studio).
    /// Les opacités du SVG (`opacity=".45"`, `.7`, `.8`, `.35`) sont POSÉES EN APLATS OPAQUES, mélangées à la main en sRGB sur le fond qu'elles couvrent dans la maquette : Unity compose en linéaire, le navigateur en sRGB —
    /// recopier l'opacité changerait d'unité (lecons-unity). Le dégradé `#lai` (crème → or → or sombre) est rendu par le disque radial or → or sombre : nuance (C), consignée au dossier.
    /// Les couleurs à moins de 4/255 d'un jeton passent par le jeton (garde Palette) : `#d9ab4e` → hudMoneyUnderlineGold, `#b9ac92` → hudCremeSecondary, `#1b2733` → dockRondInner.</summary>
    public static class VitrinePictogrammes
    {
        /// <summary>Le cadre du dessin, en px CSS : 64 × 41 (`.vitr6 .art>svg`).</summary>
        public const float LargeurCss = 64f, HauteurCss = 41f;
        /// <summary>Le viewBox du SVG : 84 × 54 unités de dessin.</summary>
        public const float ViewBoxLargeur = 84f, ViewBoxHauteur = 54f;

        public enum Motif { Pieces, Couleurs, Tableau, Cle, Enveloppe }

        // ═══ la palette des dessins, lue dans le SVG ═══
        private static Color Or => DesignTokens.Current.hudMoneyUnderlineGold;      // `#d9ab4e` — la pièce, la plaque, la clé
        private static Color Creme2 => DesignTokens.Current.hudCremeSecondary;      // `#b9ac92` — le bord du papier
        private static Color EcranDuTableau => DesignTokens.Current.dockRondInner;  // `#1b2733` — l'écran du tableau de bord
        private static readonly Color32 OrSombre = new Color32(0x8a, 0x6a, 0x22, 255);     // le bord du dégradé `#lai`
        private static readonly Color32 Trait = new Color32(0x6b, 0x4f, 0x14, 255);        // le trait des pièces et de la plaque
        private static readonly Color32 Tranche = new Color32(0xb9, 0x8f, 0x36, 255);      // la tranche d'une pièce
        private static readonly Color32 ReliefSurOr = new Color32(0x8c, 0x6b, 0x25, 255);  // `#6b4f14` à .7 sur l'or
        private static readonly Color32 TSurOr = new Color32(0xa2, 0x7d, 0x2f, 255);       // l'anneau intérieur du jeton (`#8a6a22` à .7 sur l'or)
        private static readonly Color32 Encre = new Color32(0x24, 0x1f, 0x1c, 255);        // la fenêtre de la plaque, le chiffre de la clé
        private static readonly Color32 CremeDuTitre = new Color32(0xf0, 0xdf, 0xc4, 255); // les rivets, la lettre du sceau
        private static readonly Color32 Rouge = new Color32(0xd9, 0x7a, 0x6a, 255), Vert = new Color32(0x7f, 0xc9, 0x9a, 255), Bleu = new Color32(0x8f, 0xb8, 0xe8, 255);
        private static readonly Color32 Nuit = new Color32(0x12, 0x18, 0x1f, 255);         // le boîtier du tableau
        private static readonly Color32 Halo = new Color32(0x82, 0x66, 0x46, 255);         // `#ffb35e` à .45 sur l'écran
        private static readonly Color32 Sodium = new Color32(0xd1, 0x97, 0x55, 255);       // `#ffb35e` à .8 sur l'écran
        private static readonly Color32 Gris = new Color32(0x5d, 0x6a, 0x78, 255);
        private static readonly Color32 Lueur = new Color32(0x65, 0x4e, 0x35, 255);        // `#ffb35e` à .35 sur le boîtier
        private static readonly Color32 Papier = new Color32(0xef, 0xe6, 0xd4, 255);
        private static readonly Color32 PliDuPapier = new Color32(0xc3, 0xb7, 0x9e, 255);
        private static readonly Color32 Cire = new Color32(0x8c, 0x2f, 0x36, 255), CireSombre = new Color32(0x5c, 0x1f, 0x24, 255);

        /// <summary>Quel dessin pour quel article — par le `kind` servi d'abord, l'identifiant ensuite (`cosm_dashboard_theme_*` : le tableau ; les autres cosmétiques : la plaque aux couleurs). Pure.</summary>
        public static Motif MotifDe(string kind, string skuId)
        {
            if (kind == "MARKS_PACK") return Motif.Pieces;
            if (kind == "SUPPORT") return Motif.Enveloppe;
            if (kind == "SAVE_SLOT") return Motif.Cle;
            if (skuId != null && skuId.Contains("theme")) return Motif.Tableau;
            return Motif.Couleurs;
        }

        /// <summary>Le nombre d'ÉPAISSEURS de la pile selon le rang de la liasse parmi les siennes (0 → 1, 1 → 3, 2 → 5, 3 → 8 : les quatre SVG du cadre 99, comptés par leurs tranches) ; au-delà, 8. Pure.</summary>
        public static int EpaisseursDeLaPile(int rang)
        {
            if (rang <= 0) return 1;
            if (rang == 1) return 3;
            if (rang == 2) return 5;
            return 8;
        }

        /// <summary>Le pas entre deux faces (unités de dessin) : 5,5 / 5,5 / 5,0 / 4,2 dans le SVG. Pure.</summary>
        public static float PasDeLaPile(int rang)
        {
            if (rang <= 1) return 5.5f;
            if (rang == 2) return 5.0f;
            return 4.2f;
        }

        /// <summary>Le chiffre de l'étiquette de la clé : les chiffres de FIN de l'identifiant servi (`save_slot_2` → « 2 ») ; vide sinon — rien n'est inventé. Pure.</summary>
        public static string ChiffreDe(string skuId)
        {
            if (string.IsNullOrEmpty(skuId)) return string.Empty;
            int fin = skuId.Length, debut = fin;
            while (debut > 0 && char.IsDigit(skuId[debut - 1])) debut--;
            return skuId.Substring(debut, fin - debut);
        }

        /// <summary>Dessine l'article dans une boîte de 64×41 px CSS (premier élément de la carte). `px` : la conversion CSS → unités de l'écran ; `rang` : le rang de la liasse (pile) ; `serif` : la police du chiffre.</summary>
        public static RectTransform Dessiner(Transform parent, Motif motif, int rang, string skuId, System.Func<float, float> px, TMP_FontAsset serif)
        {
            var t = new Toile(parent, px);
            switch (motif)
            {
                case Motif.Pieces: Pieces(t, rang); break;
                case Motif.Couleurs: Couleurs(t); break;
                case Motif.Tableau: Tableau(t); break;
                case Motif.Cle: Cle(t, ChiffreDe(skuId), serif); break;
                default: Enveloppe(t, serif); break;
            }
            return t.Cadre;
        }

        /// <summary>Le JETON `svg.jt` (viewBox 16×16) : la pièce or au bord sombre, son anneau intérieur, le T. `tailleCss` : 13 dans la pastille du solde, 11 sur l'étiquette.</summary>
        public static RectTransform Jeton(Transform parent, float tailleCss, System.Func<float, float> px)
        {
            GameObject go = new GameObject("Jeton", typeof(RectTransform));
            go.transform.SetParent(parent, false);
            LayoutElement le = go.AddComponent<LayoutElement>();
            le.preferredWidth = px(tailleCss); le.preferredHeight = px(tailleCss); le.minWidth = px(tailleCss); le.flexibleWidth = 0f;
            var t = new Toile((RectTransform)go.transform, px(tailleCss) / 16f);
            t.Ellipse("Piece", 8f, 8f, 7f, 7f, Or, OrSombre);
            t.Anneau("Bord", 8f, 8f, 7f, 7f, 1.2f, Trait);
            t.Anneau("Relief", 8f, 8f, 4.4f, 4.4f, 0.9f, TSurOr);
            t.Rect("TBarre", 6.2f, 4.95f, 3.6f, 1.3f, Trait);
            t.Rect("TTige", 7.35f, 5.6f, 1.3f, 4.8f, Trait);
            return (RectTransform)go.transform;
        }

        private static void Pieces(Toile t, int rang)
        {
            int epaisseurs = EpaisseursDeLaPile(rang);
            float pas = PasDeLaPile(rang);
            const float cx = 42f, rx = 19f, ry = 5.4f, socle = 46f;
            t.Ellipse("Face0", cx, socle, rx, ry, Or, OrSombre);
            t.Anneau("Bord0", cx, socle, rx, ry, 1f, Trait);
            for (int k = 1; k <= epaisseurs; k++)
            {
                float cy = socle - k * pas;
                t.Rect("Tranche" + k, cx - rx, cy, 2f * rx, pas, Tranche);
                t.Ellipse("Face" + k, cx, cy, rx, ry, Or, OrSombre);
                t.Anneau("Bord" + k, cx, cy, rx, ry, 1f, Trait);
            }
            t.Anneau("Relief", cx, socle - epaisseurs * pas, 10f, 2.8f, 0.9f, ReliefSurOr);
        }

        private static void Couleurs(Toile t)
        {
            t.Rect("Plaque", 6f, 14f, 72f, 26f, Or, 3f);
            t.Contour("PlaqueBord", 6f, 14f, 72f, 26f, 3f, 1.2f, Trait);
            t.Rect("Fenetre", 10f, 18f, 64f, 18f, Encre, 2f);
            t.Rect("Rouge", 14f, 23f, 17f, 8f, Rouge, 2f);
            t.Rect("Vert", 34f, 23f, 17f, 8f, Vert, 2f);
            t.Rect("Bleu", 54f, 23f, 17f, 8f, Bleu, 2f);
            t.Ellipse("Rivet1", 10f, 17f, 1.5f, 1.5f, CremeDuTitre, CremeDuTitre);
            t.Ellipse("Rivet2", 74f, 37f, 1.5f, 1.5f, CremeDuTitre, CremeDuTitre);
        }

        private static void Tableau(Toile t)
        {
            t.Rect("Boitier", 12f, 8f, 60f, 40f, Nuit, 3f);
            t.Contour("BoitierBord", 12f, 8f, 60f, 40f, 3f, 1.6f, Or);
            t.Rect("Ecran", 16f, 12f, 52f, 17f, EcranDuTableau, 2f);
            t.Ellipse("Halo", 42f, 24f, 15f, 6f, Halo, Halo);
            t.Rect("Barre1", 16f, 32f, 24f, 3.4f, Sodium, 1.7f);
            t.Rect("Barre2", 16f, 38f, 38f, 3.4f, Gris, 1.7f);
            t.Rect("Voyant", 58f, 32f, 10f, 9.4f, Lueur, 2f);
        }

        private static void Cle(Toile t, string chiffre, TMP_FontAsset serif)
        {
            t.Anneau("Anneau", 24f, 27f, 11f, 11f, 4f, Or);
            t.Rect("Tige", 33f, 24.5f, 34f, 5f, Or, 2.5f);
            t.Rect("Dent1", 57f, 29f, 4.5f, 8f, Or, 2f);
            t.Rect("Dent2", 49f, 29f, 4.5f, 6f, Or, 2f);
            t.Rect("Etiquette", 14f, 40f, 22f, 12f, Papier, 2f);
            t.Contour("EtiquetteBord", 14f, 40f, 22f, 12f, 2f, 0.8f, Creme2);
            if (!string.IsNullOrEmpty(chiffre)) t.Chiffre("Chiffre", 25f, 46f, chiffre, 9f, Encre, serif);
        }

        private static void Enveloppe(Toile t, TMP_FontAsset serif)
        {
            t.Rect("Papier", 10f, 10f, 64f, 36f, Papier, 2f);
            t.Contour("PapierBord", 10f, 10f, 64f, 36f, 2f, 1f, Creme2);
            t.Segment("Rabat1", 10f, 12f, 42f, 32f, 1.2f, PliDuPapier);
            t.Segment("Rabat2", 42f, 32f, 74f, 12f, 1.2f, PliDuPapier);
            t.Ellipse("Sceau", 63f, 39f, 8f, 8f, Cire, Cire);
            t.Anneau("SceauBord", 63f, 39f, 8f, 8f, 1f, CireSombre);
            t.Chiffre("Lettre", 63f, 39f, "B", 9f, CremeDuTitre, serif);
        }

        /// <summary>Une toile en unités de dessin (le viewBox), posée dans une boîte d'écran : chaque primitive se place par son coin haut-gauche (ou son centre) comme dans le SVG, `u` convertit en unités d'écran.
        /// ⛔ Tout `Graphic` porte son `CanvasRenderer` (posé avant l'`Image` : `AddComponent` à l'exécution n'honore pas `[RequireComponent]` ; sans lui rien ne dessine et la console est muette).</summary>
        private sealed class Toile
        {
            public readonly RectTransform Cadre;
            private readonly float u;

            public Toile(Transform parent, System.Func<float, float> px)
            {
                GameObject go = new GameObject("Dessin", typeof(RectTransform));
                go.transform.SetParent(parent, false);
                Cadre = (RectTransform)go.transform;
                LayoutElement le = go.AddComponent<LayoutElement>();
                le.preferredWidth = px(LargeurCss); le.preferredHeight = px(HauteurCss);
                le.minWidth = px(LargeurCss); le.minHeight = px(HauteurCss);
                le.flexibleWidth = 0f; le.flexibleHeight = 0f;
                u = px(LargeurCss) / ViewBoxLargeur;
            }

            public Toile(RectTransform cadre, float unite) { Cadre = cadre; u = unite; }

            private RectTransform Placer(string nom, float x, float y, float w, float h, Vector2 pivot)
            {
                GameObject go = new GameObject(nom, typeof(RectTransform));
                go.transform.SetParent(Cadre, false);
                RectTransform rt = (RectTransform)go.transform;
                rt.anchorMin = rt.anchorMax = new Vector2(0f, 1f);
                rt.pivot = pivot;
                rt.anchoredPosition = new Vector2(x * u, -y * u);
                rt.sizeDelta = new Vector2(w * u, h * u);
                return rt;
            }

            private static Image Peindre(RectTransform rt, Sprite sprite, Color teinte, Image.Type type)
            {
                if (rt.GetComponent<CanvasRenderer>() == null) rt.gameObject.AddComponent<CanvasRenderer>();
                Image im = rt.gameObject.AddComponent<Image>();
                im.sprite = sprite; im.color = teinte; im.type = type; im.raycastTarget = false;
                return im;
            }

            private int Px(float unites) => Mathf.Max(1, Mathf.RoundToInt(unites * u));

            /// <summary>Un rectangle plein, arrondi si `rayon` &gt; 0 (le masque arrondi, teinté).</summary>
            public Image Rect(string nom, float x, float y, float w, float h, Color c, float rayon = 0f)
            {
                RectTransform rt = Placer(nom, x, y, w, h, new Vector2(0f, 1f));
                return rayon > 0f
                    ? Peindre(rt, ProceduralUI.RoundedRectMask(Px(rayon)), c, Image.Type.Sliced)
                    : Peindre(rt, null, c, Image.Type.Simple);
            }

            /// <summary>Un contour arrondi (`stroke`) : la couleur est CUITE dans le sprite, l'image reste blanche.</summary>
            public Image Contour(string nom, float x, float y, float w, float h, float rayon, float epaisseur, Color c)
            {
                RectTransform rt = Placer(nom, x, y, w, h, new Vector2(0f, 1f));
                return Peindre(rt, ProceduralUI.RoundedRectOutline(Px(rayon), Mathf.Max(1f, epaisseur * u), c), Color.white, Image.Type.Sliced);
            }

            /// <summary>Une ellipse pleine : le disque radial (centre → bord), étiré à `2rx × 2ry`.</summary>
            public Image Ellipse(string nom, float cx, float cy, float rx, float ry, Color centre, Color bord)
            {
                RectTransform rt = Placer(nom, cx, cy, 2f * rx, 2f * ry, new Vector2(0.5f, 0.5f));
                return Peindre(rt, ProceduralUI.RadialDisc(Mathf.Max(4, Px(2f * rx)), centre, bord), Color.white, Image.Type.Simple);
            }

            /// <summary>Un anneau (`stroke` d'une ellipse), étiré comme l'ellipse.</summary>
            public Image Anneau(string nom, float cx, float cy, float rx, float ry, float epaisseur, Color c)
            {
                RectTransform rt = Placer(nom, cx, cy, 2f * rx, 2f * ry, new Vector2(0.5f, 0.5f));
                return Peindre(rt, ProceduralUI.Ring(Mathf.Max(4, Px(2f * rx)), Mathf.Max(1f, epaisseur * u), c), Color.white, Image.Type.Simple);
            }

            /// <summary>Un segment : un rectangle tourné de son extrémité gauche (le SVG a l'axe y vers le bas, l'écran vers le haut : l'angle s'inverse).</summary>
            public Image Segment(string nom, float x1, float y1, float x2, float y2, float epaisseur, Color c)
            {
                float dx = x2 - x1, dy = y2 - y1;
                RectTransform rt = Placer(nom, x1, y1, Mathf.Sqrt(dx * dx + dy * dy), Mathf.Max(epaisseur, 1f / u), new Vector2(0f, 0.5f));
                rt.localEulerAngles = new Vector3(0f, 0f, -Mathf.Atan2(dy, dx) * Mathf.Rad2Deg);
                return Peindre(rt, null, c, Image.Type.Simple);
            }

            /// <summary>Un chiffre (ou une lettre) centré en (cx, cy), en DejaVu Serif gras — `taille` en unités de dessin (le `font-size` du SVG).</summary>
            public TextMeshProUGUI Chiffre(string nom, float cx, float cy, string texte, float taille, Color c, TMP_FontAsset police)
            {
                RectTransform rt = Placer(nom, cx, cy, 30f, taille * 1.6f, new Vector2(0.5f, 0.5f));
                if (rt.GetComponent<CanvasRenderer>() == null) rt.gameObject.AddComponent<CanvasRenderer>();
                TextMeshProUGUI t = rt.gameObject.AddComponent<TextMeshProUGUI>();
                t.font = police; t.fontSize = taille * u; t.fontStyle = FontStyles.Bold; t.color = c; t.text = texte;
                t.alignment = TextAlignmentOptions.Center; t.enableWordWrapping = false; t.raycastTarget = false;
                return t;
            }
        }
    }
}
