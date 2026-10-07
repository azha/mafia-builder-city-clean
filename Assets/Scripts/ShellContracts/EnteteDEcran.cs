using System;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Theme;

namespace MafiaCleanCity.Shell
{
    /// <summary>LE BANDEAU DE TITRE D'UN ÉCRAN, À LA FORME DE LA MAQUETTE (classes C-a et C-b du juge groupé du 07/10, décision de f2 : « on suit la MAQUETTE, elle est dessinée pour un téléphone 1080 ») —
    /// ㉚ `.entete`, ㉘ `.entete`, ㉛ `.pl-tete`, ㉞ `.cn-tete` : une PLAQUE chaude PLEINE LARGEUR fermée par un FILET bas, qui porte le titre (DejaVu Serif crème `#f0dfc4`, capitale de 33 px sur 1080 : +36 % à +52 %
    /// plus petit que ce que le jeu rendait en sans-serif blanc) et sa ligne d'explication. La plaque ne défile pas (`flex:none`). Ce fichier est la source UNIQUE : UNE échelle de titre (<see cref="TitreCss"/>), UNE police,
    /// UNE encre, et les palettes (plaque, filet) lues dans la maquette, une par écran ; la garde `EnteteDEcranPlayModeTests` interdit à un contrôleur de poser son titre à la main.</summary>
    public static class EnteteDEcran
    {
        /// <summary>L'échelle du titre : capitale de 33 px sur l'image de 1080 ⇒ corps de 33 / 0,729 (hauteur de capitale de DejaVu Serif) = 45,3 px ⇒ 12,5 px CSS sur 300 (le jeu posait 17 à 18 px CSS en sans-serif : +36 % à +52 %).</summary>
        public const float TitreCss = 12.5f;

        /// <summary>L'encre du titre : `#f0dfc4` (mesurée sur la référence ; le jeton le plus proche, hudCreme `#eae0c8`, est à 8/255).</summary>
        public static Color TitreEncre => new Color32(0xf0, 0xdf, 0xc4, 255);

        /// <summary>Une palette de bandeau : la plaque pleine largeur et le filet bas (mesurés par le juge sur chaque référence).</summary>
        public readonly struct Palette
        {
            public readonly Color32 Plaque, Filet;
            public Palette(byte pr, byte pg, byte pb, byte fr, byte fg, byte fb) { Plaque = new Color32(pr, pg, pb, 255); Filet = new Color32(fr, fg, fb, 255); }
        }

        /// <summary>㉚ Appro `.entete` : plaque `#1e1b16`, filet `#3a352c`.</summary>
        public static readonly Palette Appro = new Palette(0x1e, 0x1b, 0x16, 0x3a, 0x35, 0x2c);
        /// <summary>㉘ Distribution `.entete` : plaque `#20180f`, filet `#3d3024`.</summary>
        public static readonly Palette Distribution = new Palette(0x20, 0x18, 0x0f, 0x3d, 0x30, 0x24);
        /// <summary>㉛ Loi `.pl-tete` : plaque `#1a1f26`, filet `#333c46`.</summary>
        public static readonly Palette Loi = new Palette(0x1a, 0x1f, 0x26, 0x33, 0x3c, 0x46);
        /// <summary>㉞ Carnet `.cn-tete` : plaque `#1f1c17`, filet `#3b352c`.</summary>
        public static readonly Palette Carnet = new Palette(0x1f, 0x1c, 0x17, 0x3b, 0x35, 0x2c);

        /// <summary>La PILE de l'écran : la racine devient un empilement vertical (marges d'écran haut/bas du shell), où le bandeau est le premier élément, pleine largeur. Idempotent.</summary>
        public static VerticalLayoutGroup PoserLaPile(GameObject racine, int margeHaut, int margeBas)
        {
            VerticalLayoutGroup pile = racine.GetComponent<VerticalLayoutGroup>() ?? racine.AddComponent<VerticalLayoutGroup>();
            pile.padding = new RectOffset(0, 0, margeHaut, margeBas);
            pile.spacing = 0f;
            pile.childControlWidth = true; pile.childControlHeight = true;
            pile.childForceExpandWidth = true; pile.childForceExpandHeight = false;
            return pile;
        }

        /// <summary>Construit le bandeau : plaque + filet bas + titre + sous-titre, premier enfant de `racine`. `px` : la conversion CSS → unités de l'écran (`Px` du contrôleur). `famille` sert le titre, `texte` le sous-titre.
        /// Rend le titre et le sous-titre pour que le contrôleur y écrive ses mots (Libelle).</summary>
        public static (TextMeshProUGUI titre, TextMeshProUGUI sousTitre) Construire(Transform racine, Palette p, Func<float, float> px, TMP_FontAsset serif, TMP_FontAsset texte, Color encreSousTitre, float tailleSousTitreCss)
        {
            Transform existant = racine.Find("Entete");
            if (existant != null)
                return (existant.Find("Titre").GetComponent<TextMeshProUGUI>(), existant.Find("SousTitre").GetComponent<TextMeshProUGUI>());

            GameObject plaque = new GameObject("Entete", typeof(RectTransform));
            plaque.transform.SetParent(racine, false);
            plaque.transform.SetAsFirstSibling();
            Image fond = plaque.AddComponent<Image>();
            fond.color = p.Plaque;
            fond.raycastTarget = false;
            VerticalLayoutGroup v = plaque.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset((int)px(16f), (int)px(16f), (int)px(12f), (int)px(12f) + (int)px(1f));
            v.spacing = px(3f);
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            plaque.AddComponent<LayoutElement>().flexibleHeight = 0f;

            TextMeshProUGUI titre = Texte(plaque.transform, "Titre", px(TitreCss), TitreEncre, serif);
            titre.enableWordWrapping = true;
            TextMeshProUGUI sous = Texte(plaque.transform, "SousTitre", px(tailleSousTitreCss), encreSousTitre, texte);
            sous.enableWordWrapping = true;

            // le filet bas : hors mise en page, collé au bord inférieur de la plaque
            GameObject filet = new GameObject("Filet", typeof(RectTransform));
            filet.transform.SetParent(plaque.transform, false);
            filet.AddComponent<LayoutElement>().ignoreLayout = true;
            RectTransform fr = (RectTransform)filet.transform;
            fr.anchorMin = new Vector2(0f, 0f); fr.anchorMax = new Vector2(1f, 0f);
            fr.pivot = new Vector2(0.5f, 0f); fr.sizeDelta = new Vector2(0f, px(1f)); fr.anchoredPosition = Vector2.zero;
            Image fi = filet.AddComponent<Image>();
            fi.color = p.Filet;
            fi.raycastTarget = false;
            return (titre, sous);
        }

        /// <summary>Habille une ENSEIGNE déjà bâtie dans une colonne à marges (㉞ Carnet : la pile a 13 CSS px de chaque côté) : la plaque et le filet de la maquette DÉBORDENT de ces marges (hors mise en page) pour tenir
        /// la PLEINE LARGEUR. `debordGauche/Droite/Haut` en unités. Idempotent.</summary>
        public static void Habiller(GameObject enseigne, Palette p, float debordGauche, float debordDroite, float debordHaut, float epaisseurDuFilet)
        {
            if (enseigne.transform.Find("Plaque") != null) return;
            GameObject plaque = new GameObject("Plaque", typeof(RectTransform));
            plaque.transform.SetParent(enseigne.transform, false);
            plaque.transform.SetAsFirstSibling();
            plaque.AddComponent<LayoutElement>().ignoreLayout = true;
            RectTransform rt = (RectTransform)plaque.transform;
            rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one;
            rt.offsetMin = new Vector2(-debordGauche, 0f); rt.offsetMax = new Vector2(debordDroite, debordHaut);
            Image im = plaque.AddComponent<Image>();
            im.color = p.Plaque;
            im.raycastTarget = false;
            GameObject filet = new GameObject("Filet", typeof(RectTransform));
            filet.transform.SetParent(plaque.transform, false);
            RectTransform fr = (RectTransform)filet.transform;
            fr.anchorMin = new Vector2(0f, 0f); fr.anchorMax = new Vector2(1f, 0f);
            fr.pivot = new Vector2(0.5f, 0f); fr.sizeDelta = new Vector2(0f, epaisseurDuFilet); fr.anchoredPosition = Vector2.zero;
            Image fi = filet.AddComponent<Image>();
            fi.color = p.Filet;
            fi.raycastTarget = false;
        }

        private static TextMeshProUGUI Texte(Transform parent, string nom, float taille, Color couleur, TMP_FontAsset police)
        {
            GameObject go = new GameObject(nom, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            if (go.GetComponent<CanvasRenderer>() == null) go.AddComponent<CanvasRenderer>();
            TextMeshProUGUI t = go.AddComponent<TextMeshProUGUI>();
            t.font = police;
            t.fontSize = taille;   // un corps de texte à 0 est un défaut de rendu
            t.color = couleur;
            t.raycastTarget = false;
            t.text = "";
            go.AddComponent<LayoutElement>();
            return t;
        }
    }
}
