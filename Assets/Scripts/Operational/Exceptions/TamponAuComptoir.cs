using System;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;

namespace MafiaCleanCity.Operational.Exceptions
{
    /// <summary>LE TAMPON DU COMPTOIR — `.tampon` de `ecrans-brennar-4.html`, cadres 14 (⑨) et 15 (⑩) : papier PLEIN #d9cca9
    /// (`RoundedRectMask` teint, jamais un contour teint), rayon 11, bord 2px #93402c, filet intérieur (inset 3px #93402c55,
    /// rayon 7), encre #93402c en capitales espacées .22em, graisse 800 ; `small` 8,5px à .85.
    /// DEUX GESTES sur le même objet (patron du jeton de ⑯) : l'APPUI LONG résout ; le TAP fait ce que l'écran demande (⑨ :
    /// ouvrir sa main ; ⑩ : rien). `Button` tire AUSSI au relâchement d'un appui long : le tap est CONSOMMÉ quand l'appui long
    /// a abouti.
    /// ⑩-1e — UN seul code pour ⑨ et ⑩ : ⑨-1 l'avait écrit dans `ExceptionQueueController` ; ⑩ n'avait qu'un bouton générique
    /// à tap (`surfaceRaised`, texte or — écart D08). Déplacé tel quel (mêmes noms d'objets : `TamponBouton`, `Bord`,
    /// `FiletInterieur`, `Libelle`, `SousTexte`) ; chaque écran fournit son échelle et son suivi.</summary>
    public sealed class TamponAuComptoir
    {
        /// <summary>Ce que l'écran garde du tampon rendu (ses gardes le lisent).</summary>
        public sealed class Rendu
        {
            public GameObject Papier;
            public TextMeshProUGUI Libelle, Sous;
            public Button Tap;
            public LongPressButton Appui;
        }

        private readonly Func<float, float> px;
        private readonly Func<float, int> pxI;
        private readonly Action<TextMeshProUGUI, string> suivre;

        public TamponAuComptoir(Func<float, float> px, Func<float, int> pxI, Action<TextMeshProUGUI, string> suivre)
        {
            this.px = px;
            this.pxI = pxI;
            this.suivre = suivre ?? ((t, s) => { });
        }

        private float Px(float css) => px(css);
        private int PxI(float css) => pxI(css);

        /// <summary>`#93402c` — l'encre du tampon.</summary>
        public static Color Encre => Hex("#93402c");

        /// <summary>Le tampon, étiré dans `parent`. `suivreSous` : le sous-titre entre-t-il au corpus suivi (⑨ : non quand il
        /// porte le compte des issues, R2.2). `surTap` null ⇒ pas de tap ; `surAppuiLong` null ⇒ pas d'appui long.</summary>
        public Rendu Construire(Transform parent, string libelle, string sousTitre, bool suivreSous, Action surTap, Action surAppuiLong)
        {
            var r = new Rendu();
            GameObject t = NewUI("TamponBouton", parent);
            Etirer((RectTransform)t.transform, 0f);
            r.Papier = t;
            Image papier = t.AddComponent<Image>();
            papier.sprite = ProceduralUI.RoundedRectMask(PxI(11f));
            papier.type = Image.Type.Sliced;
            papier.color = Hex("#d9cca9");
            Filet(t.transform, "Bord", 0f, PxI(11f), Px(2f), Encre);
            Filet(t.transform, "FiletInterieur", Px(3f), PxI(7f), Px(1f), Hex("#93402c55"));

            VerticalLayoutGroup v = t.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset(PxI(12f), PxI(12f), PxI(10f), PxI(10f));
            v.spacing = Px(2f);
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            v.childAlignment = TextAnchor.MiddleCenter;

            r.Libelle = Texte(t.transform, "Libelle", libelle, 12f, Encre);
            r.Libelle.alignment = TextAlignmentOptions.Center;
            r.Libelle.characterSpacing = 22f;             // `.tampon{letter-spacing:.22em}`
            r.Libelle.fontStyle = FontStyles.Bold;        // `.tampon{font-weight:800}`
            r.Libelle.enableWordWrapping = true;
            suivre(r.Libelle, r.Libelle.text);

            Color encreSous = Encre; encreSous.a = 0.85f;  // `.tampon small{opacity:.85}` sur fond CONNU (le papier)
            r.Sous = Texte(t.transform, "SousTexte", sousTitre, 8.5f, encreSous);
            r.Sous.alignment = TextAlignmentOptions.Center;
            r.Sous.enableWordWrapping = true;
            if (suivreSous) suivre(r.Sous, r.Sous.text);

            bool consomme = false;
            if (surTap != null)
            {
                r.Tap = t.AddComponent<Button>();
                r.Tap.targetGraphic = papier;
                r.Tap.onClick.AddListener(() =>
                {
                    if (consomme) { consomme = false; return; }
                    surTap();
                });
            }
            if (surAppuiLong != null)
            {
                r.Appui = t.AddComponent<LongPressButton>();
                r.Appui.OnLongPressCompleted += () =>
                {
                    consomme = true;
                    surAppuiLong();
                };
            }
            return r;
        }

        private TextMeshProUGUI Texte(Transform parent, string nom, string texte, float corpsCss, Color couleur)
        {
            GameObject go = NewUI(nom, parent);
            TextMeshProUGUI t = go.AddComponent<TextMeshProUGUI>();
            t.text = texte;
            t.color = couleur;
            t.fontSize = Px(corpsCss);
            t.font = DesignTokens.Current.primaryFont;
            t.raycastTarget = false;
            return t;
        }

        private static void Filet(Transform parent, string nom, float retrait, int rayon, float epaisseur, Color couleur)
        {
            GameObject go = NewUI(nom, parent);
            Etirer((RectTransform)go.transform, retrait);
            Image img = go.AddComponent<Image>();
            img.sprite = ProceduralUI.RoundedRectOutline(rayon, epaisseur, couleur);
            img.type = Image.Type.Sliced;
            img.raycastTarget = false;
            go.AddComponent<LayoutElement>().ignoreLayout = true;
        }

        private static GameObject NewUI(string nom, Transform parent)
        {
            GameObject go = new GameObject(nom, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            return go;
        }

        private static void Etirer(RectTransform rt, float retrait)
        {
            rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one;
            rt.offsetMin = new Vector2(retrait, retrait); rt.offsetMax = new Vector2(-retrait, -retrait);
        }

        private static Color Hex(string h)
        {
            ColorUtility.TryParseHtmlString(h, out Color c);
            return c;
        }
    }
}
