using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Theme;

namespace MafiaCleanCity.Shell
{
    /// <summary>LE VERRE D'UNE PLAQUE AU COMPTOIR — `.plaque` et `.apres` de `ecrans-brennar-4.html` : un rectangle arrondi,
    /// `linear-gradient(160deg, rgba(22,33,53,a), rgba(9,14,24,b))`, un bord 1px, et pour `.plaque` un filet intérieur
    /// (`::before{inset:3px; border:1px solid #ffffff10; border-radius:11px}`).
    ///   .plaque  radius 14 · padding 11/14/12/14 · verre .72/.88 · bord #ffffff24 · filet intérieur
    ///   .apres   radius 12 · padding 10/12/10/12 · verre .7/.88  · bord #4f7f3f88 · pas de filet
    /// Un seul code pour ⑯ (la plaque du matin, ⑯-2) et ⑨ (la plaque du soir, ⑨-6 ; le bloc de l'après-tampon) : deux
    /// codes du même dessin divergent au premier correctif (la leçon de ⑯-9, `MedaillonAuComptoir`).
    /// ShellContracts ne voit pas TextMeshPro : le verre est rendu avec sa mise en page verticale, chaque écran y pose
    /// ses textes (surtitre, titre). Les grandeurs arrivent CONVERTIES par l'écran (`Px` est propre à chaque série).
    /// Les RVB du verre sont ceux des jetons de verre des lieutenants (#162135, #090e18) ; la plaque flotte sur le décor,
    /// donc sur un fond INCONNU : l'opacité CSS passe par `AlphaVoileSurFondQuelconque`, jamais recopiée.</summary>
    public static class PlaqueAuComptoir
    {
        public struct Forme
        {
            public float Rayon;
            public RectOffset Marges;
            public float Espacement;
            public float OpaciteHaut, OpaciteBas;
            public Color Bord;
            public float Trait;
            /// <summary>≤ 0 : pas de filet intérieur.</summary>
            public float RetraitFilet;
            public float RayonFilet;
            public Color Filet;
        }

        /// <summary>`.plaque` — ⑯-2 et ⑨-6 (cadre 16).</summary>
        public static Forme Plaque(System.Func<float, float> px) => new Forme
        {
            Rayon = px(14f),
            Marges = new RectOffset((int)px(14f), (int)px(14f), (int)px(11f), (int)px(12f)),
            Espacement = px(2f),
            OpaciteHaut = 0.72f, OpaciteBas = 0.88f,
            Bord = Hex("#ffffff24"), Trait = px(1f),
            RetraitFilet = px(3f), RayonFilet = px(11f), Filet = Hex("#ffffff10"),
        };

        /// <summary>`.apres` — ⑨-6 (cadre 17), le bloc de la carte tranchée : même verre, bord VERT, pas de filet.</summary>
        public static Forme Apres(System.Func<float, float> px) => new Forme
        {
            Rayon = px(12f),
            Marges = new RectOffset((int)px(12f), (int)px(12f), (int)px(10f), (int)px(10f)),
            Espacement = px(2f),
            OpaciteHaut = 0.7f, OpaciteBas = 0.88f,
            Bord = Hex("#4f7f3f88"), Trait = px(1f),
            RetraitFilet = 0f,
        };

        public static GameObject Construire(Transform parent, string nom, Forme f)
        {
            GameObject go = new GameObject(nom, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            // Le masque arrondit le verre : un `LinearGradient` est un carré, sans lui les coins sortent droits.
            Image forme = go.AddComponent<Image>();
            forme.sprite = ProceduralUI.RoundedRectMask((int)f.Rayon);
            forme.type = Image.Type.Sliced;
            go.AddComponent<Mask>().showMaskGraphic = false;

            Color haut = DesignTokens.Current.lieutenantGlassTop;
            Color bas = DesignTokens.Current.lieutenantGlassBottom;
            haut.a = ProceduralUI.AlphaVoileSurFondQuelconque(haut, f.OpaciteHaut, out _);
            bas.a = ProceduralUI.AlphaVoileSurFondQuelconque(bas, f.OpaciteBas, out _);
            GameObject verre = Enfant(go.transform, "Verre", 0f);
            Image verreImg = verre.AddComponent<Image>();
            verreImg.sprite = ProceduralUI.LinearGradient(64, 160f, haut, bas);
            verreImg.type = Image.Type.Simple;
            verreImg.raycastTarget = false;

            Filet(go.transform, "Bord", 0f, f.Rayon, f.Trait, f.Bord);
            if (f.RetraitFilet > 0f) Filet(go.transform, "FiletInterieur", f.RetraitFilet, f.RayonFilet, f.Trait, f.Filet);

            VerticalLayoutGroup v = go.AddComponent<VerticalLayoutGroup>();
            v.padding = f.Marges;
            v.spacing = f.Espacement;
            v.childControlWidth = true;
            v.childControlHeight = true;
            v.childForceExpandWidth = true;
            v.childForceExpandHeight = false;
            v.childAlignment = TextAnchor.UpperLeft;
            return go;
        }

        private static void Filet(Transform parent, string nom, float retrait, float rayon, float trait, Color couleur)
        {
            Image img = Enfant(parent, nom, retrait).AddComponent<Image>();
            img.sprite = ProceduralUI.RoundedRectOutline((int)rayon, trait, couleur);
            img.type = Image.Type.Sliced;
            img.raycastTarget = false;
        }

        private static GameObject Enfant(Transform parent, string nom, float retrait)
        {
            GameObject go = new GameObject(nom, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            RectTransform rt = (RectTransform)go.transform;
            rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one;
            rt.offsetMin = new Vector2(retrait, retrait); rt.offsetMax = new Vector2(-retrait, -retrait);
            go.AddComponent<LayoutElement>().ignoreLayout = true;
            return go;
        }

        private static Color Hex(string h)
        {
            ColorUtility.TryParseHtmlString(h, out Color c);
            return c;
        }
    }
}
