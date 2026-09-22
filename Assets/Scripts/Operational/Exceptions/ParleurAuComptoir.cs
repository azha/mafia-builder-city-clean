using System;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;

namespace MafiaCleanCity.Operational.Exceptions
{
    /// <summary>CELUI QUI PARLE, AU COMPTOIR — `.parle` de `ecrans-brennar-4.html`, cadres 14 (⑨) et 15 (⑩) : le médaillon 60 /
    /// r18 au buste (ou le « B » de la ville), la bulle de verre masquée (rayon 14, `linear-gradient(160deg, rgba(28,40,60,.9),
    /// rgba(12,18,30,.96))`, bord 1px #ffffff2a), sa QUEUE, le nom en serif or-vif, la ligne « · rôle · lieu », les pastilles
    /// (`.chip`), la réplique en serif crème.
    /// ⑩-1 — UN seul code pour ⑨ et ⑩ : la maquette dessine la même bulle sur les deux cadres ; ⑨-4 l'avait écrite dans
    /// `ExceptionQueueController` (juge r1 M4, M5), ⑩ montrait « Votre lieutenant » et une ligne de bandes. Déplacé tel quel
    /// (mêmes noms d'objets : les gardes R13ter les lisent) ; chaque écran fournit son échelle (`px`, `pxI` — la série 4
    /// mesurée sur SA racine) et son suivi de textes.
    /// ⚠️ Ce qui VARIE entre les écrans est passé en argument, jamais recalculé ici : le contexte (le rôle vient de la jointure
    /// du roster, que ⑨ seul possède), la réplique (⑩ y ajoute « Je fais quoi ? »), les pastilles (⑩ ajoute la confiance).</summary>
    public sealed class ParleurAuComptoir
    {
        private readonly Func<float, float> px;
        private readonly Func<float, int> pxI;
        private readonly Action<TextMeshProUGUI, string> suivre;

        /// <summary>S03 — le contexte entre-t-il au corpus suivi ? Non quand il porte une ENSEIGNE servie : un nom propre peut porter
        /// un chiffre (« Remise du 3 », atelier §3.11 §5) qui n'est pas un scalaire (R2.2) — même statut que le compte d'escalades.</summary>
        public bool ContexteSuivi { get; set; } = true;

        public ParleurAuComptoir(Func<float, float> px, Func<float, int> pxI, Action<TextMeshProUGUI, string> suivre)
        {
            this.px = px;
            this.pxI = pxI;
            this.suivre = suivre ?? ((t, s) => { });
        }

        private float Px(float css) => px(css);
        private int PxI(float css) => pxI(css);

        private static Color Creme => DesignTokens.Current.hudCreme;
        private static Color Creme2 => DesignTokens.Current.hudCremeSecondary;
        private static Color OrVif => DesignTokens.Current.hudMoneyGold;

        /// <summary>La rangée `.parle{display:flex; gap:10px; align-items:flex-end}` — la bulle s'étire sur sa hauteur.</summary>
        public RectTransform ConstruireRangee(Transform parent, float ecartCss)
        {
            RectTransform rangee = (RectTransform)NewUI("Parle", parent).transform;
            HorizontalLayoutGroup hp = rangee.gameObject.AddComponent<HorizontalLayoutGroup>();
            hp.spacing = Px(ecartCss);
            hp.childControlWidth = true; hp.childControlHeight = true;
            hp.childForceExpandWidth = false; hp.childForceExpandHeight = true;
            hp.childAlignment = TextAnchor.LowerLeft;
            return rangee;
        }

        /// <summary>Le médaillon et la bulle de `c`, dans `rangee` (vidée d'abord par l'appelant). Rend la bulle.</summary>
        public GameObject Construire(Transform rangee, ExceptionCardDto c, string contexte, string replique, params string[] pastilles)
        {
            bool ville = !ExceptionBandes.ParleUnLieutenant(c);
            GameObject med = MedaillonAuComptoir.Construire(rangee, "MedaillonParleur", Px(60f), Px(18f),
                Mathf.Max(1f, Px(1f)), ville ? null : Resources.Load<Sprite>(MedaillonAuComptoir.CheminBusteLieutenant));
            if (ville) LettreDeLaVille(med.transform, 20f);

            GameObject bulle = NewUI("Bulle", rangee);
            LayoutElement leBulle = bulle.AddComponent<LayoutElement>();
            leBulle.flexibleWidth = 1;
            Image forme = bulle.AddComponent<Image>();
            forme.sprite = ProceduralUI.RoundedRectMask(PxI(14f));
            forme.type = Image.Type.Sliced;
            forme.color = Color.white;
            bulle.AddComponent<Mask>().showMaskGraphic = false;
            GameObject verre = NewUI("Verre", bulle.transform);
            Etirer((RectTransform)verre.transform, 0f);
            verre.AddComponent<LayoutElement>().ignoreLayout = true;
            Image verreImg = verre.AddComponent<Image>();
            verreImg.sprite = ProceduralUI.LinearGradient(64, 160f, VerreBulleHaut, VerreBulleBas);
            verreImg.raycastTarget = false;
            Filet(bulle.transform, "Bord", 0f, PxI(14f), Mathf.Max(1f, Px(1f)), Hex("#ffffff2a"));
            Queue(rangee, bulle.transform.GetSiblingIndex());

            VerticalLayoutGroup v = bulle.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset(PxI(12f), PxI(12f), PxI(9f), PxI(9f));
            v.spacing = Px(3f);
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;

            TextMeshProUGUI nom = Texte(bulle.transform, "QuiNom", ExceptionBandes.Locuteur(c), 12f, OrVif);
            nom.font = DesignTokens.Current.hudSerifFont;
            nom.fontStyle = FontStyles.Bold;
            suivre(nom, nom.text);

            if (!string.IsNullOrEmpty(contexte))
            {
                TextMeshProUGUI ctx = Texte(bulle.transform, "QuiContexte", contexte, 8f, Creme2);
                ctx.fontStyle = FontStyles.UpperCase;
                ctx.characterSpacing = 14f;                      // `.bulle .qui{letter-spacing:.14em}`
                ctx.enableWordWrapping = true;
                if (ContexteSuivi) suivre(ctx, ctx.text);
            }

            GameObject rangPastilles = NewUI("Pastilles", bulle.transform);
            HorizontalLayoutGroup hp = rangPastilles.AddComponent<HorizontalLayoutGroup>();
            hp.spacing = Px(5f);
            hp.childControlWidth = true; hp.childControlHeight = true;
            hp.childForceExpandWidth = false; hp.childForceExpandHeight = false;
            hp.childAlignment = TextAnchor.MiddleLeft;
            // Les noms d'objet des deux premières sont ceux de ⑨-4 (R13ter : « Gravite », « Priorite ») ; la troisième, ⑩.
            string[] noms = { "Gravite", "Priorite", "Confiance" };
            for (int i = 0; i < pastilles.Length; i++)
                Pastille(rangPastilles.transform, i < noms.Length ? noms[i] : "Pastille" + i, pastilles[i]);

            TextMeshProUGUI dit = Texte(bulle.transform, "Replique", replique, 13f, Creme);
            dit.font = DesignTokens.Current.hudSerifFont;
            dit.enableWordWrapping = true;
            // ⚠️ Texte du PRODUCTEUR : chrome, suivi au composant et pas au corpus (il peut porter des chiffres — en-tête R2.2).
            return bulle;
        }

        private void Pastille(Transform parent, string nom, string texte)
        {
            GameObject go = NewUI(nom, parent);
            Image bord = go.AddComponent<Image>();
            bord.sprite = ProceduralUI.RoundedRectOutline(PxI(7f), Mathf.Max(1f, Px(1f)), Creme2);
            bord.type = Image.Type.Sliced;
            bord.raycastTarget = false;
            HorizontalLayoutGroup h = go.AddComponent<HorizontalLayoutGroup>();
            h.padding = new RectOffset(PxI(5f), PxI(5f), PxI(1f), PxI(1f));
            h.childControlWidth = true; h.childControlHeight = true;
            h.childForceExpandWidth = false;
            TextMeshProUGUI t = Texte(go.transform, "Lib", texte, 6.5f, Creme2);
            t.fontStyle = FontStyles.UpperCase;
            t.characterSpacing = 8f;                              // `.chip{letter-spacing:.08em}`
            suivre(t, t.text);
        }

        /// <summary>`.bulle::before{left:-7px; bottom:10px; 12×12; rotate(45deg)}` — la queue qui pointe vers le médaillon, de la
        /// couleur du bas du verre. Elle DÉBORDE de la bulle (qui masque ses enfants) : elle vit donc dans la rangée `.parle`,
        /// hors mise en page, JUSTE AVANT la bulle, placée par ancres depuis la CSS — médaillon 60 + écart 10 − 7 px de
        /// débord, 10 px du bas (la rangée étire la bulle sur sa hauteur : leurs bas coïncident).</summary>
        private void Queue(Transform rangee, int rangBulle)
        {
            GameObject q = NewUI("QueueBulle", rangee);
            q.AddComponent<LayoutElement>().ignoreLayout = true;
            RectTransform rt = (RectTransform)q.transform;
            rt.anchorMin = rt.anchorMax = new Vector2(0f, 0f);
            rt.pivot = new Vector2(0.5f, 0.5f);
            rt.sizeDelta = new Vector2(Px(12f), Px(12f));
            rt.anchoredPosition = new Vector2(Px(60f + 10f - 7f + 6f), Px(10f + 6f));
            rt.localRotation = Quaternion.Euler(0f, 0f, 45f);
            Image img = q.AddComponent<Image>();
            img.color = VerreBulleBas;
            img.raycastTarget = false;
            q.transform.SetSiblingIndex(rangBulle);
        }

        /// <summary>Le « B » or-vif de la ville (`.ville-b`, Georgia gras), dans un médaillon sans buste.</summary>
        public void LettreDeLaVille(Transform medaillon, float corps)
        {
            TextMeshProUGUI b = Texte(medaillon, "VilleB", "B", corps, OrVif);
            b.font = DesignTokens.Current.hudSerifFont;
            b.fontStyle = FontStyles.Bold;
            b.alignment = TextAlignmentOptions.Center;
            b.gameObject.AddComponent<LayoutElement>().ignoreLayout = true;
            var brt = (RectTransform)b.transform;
            brt.anchorMin = Vector2.zero; brt.anchorMax = Vector2.one;
            brt.offsetMin = Vector2.zero; brt.offsetMax = Vector2.zero;
        }

        // `rgba(28,40,60,.9)` / `rgba(12,18,30,.96)` : le haut sans jeton proche (d = 7,3), le bas par `hudBarGlassBottom`
        // (d = 1,4, TD-612). Opacités CSS passées par l'ajustement linéaire (la bulle flotte sur le décor).
        private static Color VerreBulleHaut
        {
            get { Color c = Hex("#1c283c"); c.a = ProceduralUI.AlphaVoileSurFondQuelconque(c, 0.90f, out _); return c; }
        }
        private static Color VerreBulleBas
        {
            get
            {
                Color t = DesignTokens.Current.hudBarGlassBottom;
                Color c = new Color(t.r, t.g, t.b, 1f);
                c.a = ProceduralUI.AlphaVoileSurFondQuelconque(c, 0.96f, out _);
                return c;
            }
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
