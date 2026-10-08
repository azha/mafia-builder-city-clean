using UnityEngine;
using UnityEngine.UI;
using TMPro;
using MafiaCleanCity.Theme;

namespace MafiaCleanCity.Shell
{
    /// <summary>LE GESTE PRINCIPAL D'UN ÉCRAN, À LA FORME DE LA MAQUETTE (cause n°3 du rapport de conformité de CLIENT-3, 07/10 : « pied d'écran / geste principal absent ou de mauvaise forme » —
    /// ㊳ B4, ㊵ F3, ㉛ B1, ㉚ M4, ㉘ M2, ⑤ F5).
    ///
    /// La maquette (série 6, `ecrans-brennar-6.html`) dit DEUX grammaires, pas une — « chaque écran prend la forme que SON cadre dessine » (f2) :
    ///   · <see cref="Forme.Cta6"/> — le PIED des écrans de lecture (㊳ Journal `.jrn6`, ㊵ Filière, ㉟ Vente `.vnt6`, Horizon `.hrz6`) : `.cta6{padding:8px; border:1px solid #b08d3e; background:#16191b;
    ///     font:700 8.5px 'DejaVu Sans'; letter-spacing:.11em; color:#f2c96b; text-transform:uppercase}` + `.note6` dessous ; éteint : `border #2a3648; color #7a838d; background #111823`. Carré.
    ///   · <see cref="Forme.Geste"/> — le BAS des écrans de commande (㉚ Appro `.appr6`, ㉘ Distribution `.lieg6`, ㉛ Loi `.tabl6`) : `.geste{display:flex; justify-content:space-between; padding:9px 11px;
    ///     border-radius:3px; border:1px solid #5a4a2a; background:#241c11; font:700 9.5px 'DejaVu Sans'; letter-spacing:.7px; color:#d9ab4e}` avec sa LÉGENDE `small{6.5px; color:#9a8a6a}` DANS le
    ///     bouton, à droite ; états `.mort{border #4a3a3a; background #1c1414; color #987979}` et `.rouge{border #5c2a2a; background #241214; color #d97a6a}` ; posé sur la plaque `.bas{background:#141a21;
    ///     border-top:2px solid #2c3640; padding:9px 13px 15px}` sous la voix du lieutenant `.dit{italic 8.6px 'DejaVu Serif'; color #cdd6e0}`.
    /// Le jeu posait sur ㉚ et ㉘ un APLAT OR PLEIN à l'encre sombre (« un gros bouton jaune ») : c'est la pilule or de LA SUITE (④), un autre objet, qui vaut pour le seul « premier geste » de l'Accueil.
    /// Ce fichier est la source UNIQUE de ces formes : les couleurs (aplats opaques — aucune conversion sRGB → linéaire), le cerne, et `StylerLeBouton`, qui REPREND un bouton déjà construit par un écran
    /// (sa mise en page ne change pas). La garde de classe `PiedDEcranPlayModeTests` interdit un bouton de pied à fond or plein.</summary>
    public static class PiedDEcran
    {
        public enum Forme { Cta6, Geste }
        public enum Etat { Allume, Eteint, Mort, Rouge }

        /// <summary>L'épaisseur du cerne : 1 CSS px = 4,2 u (même échelle que les boutons de LA SUITE : 110 u pour 26 CSS px).</summary>
        public const float EpaisseurDuCerne = 4f;

        /// <summary>Fond, cerne et libellé d'un bouton de pied : jetons du thème pour `.cta6`, aplats mesurés dans la maquette pour `.geste`. Pure.</summary>
        public static (Color fond, Color cerne, Color libelle) Couleurs(Forme forme, Etat etat)
        {
            if (forme == Forme.Cta6)
                return etat == Etat.Eteint
                    // `#111823` est à 3/255 de lieutenantMedallionOuter : le jeton (garde Palette, seuil 4) ; `#2a3648` et `#7a838d` n'ont aucun jeton à moins de 4
                    ? (DesignTokens.Current.lieutenantMedallionOuter, (Color)new Color32(0x2a, 0x36, 0x48, 255), new Color32(0x7a, 0x83, 0x8d, 255))
                    : (DesignTokens.Current.surfaceCard, DesignTokens.Current.hudHairlineGold, DesignTokens.Current.hudMoneyGold);
            switch (etat)
            {
                case Etat.Mort: return (new Color32(0x1c, 0x14, 0x14, 255), new Color32(0x4a, 0x3a, 0x3a, 255), new Color32(0x98, 0x79, 0x79, 255));
                case Etat.Rouge: return (new Color32(0x24, 0x12, 0x14, 255), new Color32(0x5c, 0x2a, 0x2a, 255), new Color32(0xd9, 0x7a, 0x6a, 255));
                default: return (new Color32(0x24, 0x1c, 0x11, 255), new Color32(0x5a, 0x4a, 0x2a, 255), (Color32)DesignTokens.Current.hudMoneyUnderlineGold);   // `#d9ab4e` EST le jeton (garde Palette)
            }
        }

        /// <summary>La légende `small` du geste (`#9a8a6a`, `#967a7a` quand il est mort) — dans le bouton, à droite. Pure.</summary>
        public static Color Legende(Etat etat) => etat == Etat.Mort ? (Color)new Color32(0x96, 0x7a, 0x7a, 255) : new Color32(0x9a, 0x8a, 0x6a, 255);

        /// <summary>La plaque `.bas` des écrans de commande : fond `#141a21`, filet haut `#2c3640` de 2 CSS px. Pure.</summary>
        public static Color PlaqueDuBas => new Color32(0x14, 0x1a, 0x21, 255);
        /// <summary>LA PLAQUE CRÈME (troisième grammaire du geste principal : ⑮ le geste « DÉPOSER » seulement — ⑤ « LES LIRE MAINTENANT » est passé à la `.plaque-laiton` de la série 6, juge d'ensemble r2 F7, 08/10) : fond REF (216,202,167), encre rouge sombre `#93402c` (≈ 4,3:1 sur la plaque). Pures.</summary>
        public static Color PlaqueCreme => new Color32(216, 202, 167, 255);
        public static Color EncreDeLaPlaque => new Color32(0x93, 0x40, 0x2c, 255);
        public static Color FiletDuBas => new Color32(0x2c, 0x36, 0x40, 255);
        /// <summary>La voix du lieutenant `.dit` (`#cdd6e0`) et son nom en gras (`#eef3f9`). Pure.</summary>
        public static Color VoixDuLieutenant => new Color32(0xcd, 0xd6, 0xe0, 255);
        public static Color NomDuLieutenant => new Color32(0xee, 0xf3, 0xf9, 255);

        /// <summary>Donne à un bouton DÉJÀ construit (une `Image` de fond et un libellé) la forme voulue : fond, cerne, libellé. N'en change NI la taille NI la mise en page. Idempotent (un second appel
        /// remplace les couleurs, ne double pas le cerne) ; rappeler avec un autre `etat` à l'appui d'un état désactivé.</summary>
        public static void StylerLeBouton(GameObject bouton, Graphic libelle, Forme forme = Forme.Cta6, Etat etat = Etat.Allume)
        {
            var (fond, cerne, texte) = Couleurs(forme, etat);
            Image im = bouton.GetComponent<Image>();
            if (im != null) im.color = fond;
            if (libelle != null) libelle.color = texte;
            Cerner(bouton.transform, cerne, EpaisseurDuCerne);
        }

        /// <summary>LA BANDE BASSE `.bas` des écrans de commande (classe C-c du juge groupé du 07/10) : la plaque `#141a21` PLEINE LARGEUR, son filet haut de 2 CSS px `#2c3640` (hors mise en page), le padding `9 13 15` ; rend
        /// la plaque (le contenu — voix, geste — s'y range). `debordGauche/Droite` : de combien elle déborde des marges de la colonne qui la porte (0 si elle est posée sur une racine sans marges). Idempotent par nom.</summary>
        public static GameObject Bande(Transform parent, System.Func<float, float> px, float debordGauche = 0f, float debordDroite = 0f)
        {
            Transform existant = parent.Find("Bas");
            if (existant != null) return existant.gameObject;
            GameObject bas = new GameObject("Bas", typeof(RectTransform));
            bas.transform.SetParent(parent, false);
            UnityEngine.UI.Image fond = bas.AddComponent<UnityEngine.UI.Image>();
            fond.color = PlaqueDuBas;
            fond.raycastTarget = false;
            UnityEngine.UI.VerticalLayoutGroup v = bas.AddComponent<UnityEngine.UI.VerticalLayoutGroup>();
            v.padding = new RectOffset((int)px(13f), (int)px(13f), (int)px(9f) + (int)px(2f), (int)px(15f));
            v.spacing = px(5f);
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            bas.AddComponent<UnityEngine.UI.LayoutElement>().flexibleHeight = 0f;
            if (debordGauche > 0f || debordDroite > 0f)
            {
                // la plaque et le filet débordent des marges de la colonne : un fond enfant, hors mise en page, sous le contenu
                GameObject plaque = new GameObject("Plaque", typeof(RectTransform));
                plaque.transform.SetParent(bas.transform, false);
                plaque.transform.SetAsFirstSibling();
                plaque.AddComponent<UnityEngine.UI.LayoutElement>().ignoreLayout = true;
                RectTransform pr = (RectTransform)plaque.transform;
                pr.anchorMin = Vector2.zero; pr.anchorMax = Vector2.one; pr.offsetMin = new Vector2(-debordGauche, 0f); pr.offsetMax = new Vector2(debordDroite, 0f);
                UnityEngine.UI.Image pi = plaque.AddComponent<UnityEngine.UI.Image>();
                pi.color = PlaqueDuBas; pi.raycastTarget = false;
                fond.color = new Color(0f, 0f, 0f, 0f);
            }
            GameObject filet = new GameObject("Filet", typeof(RectTransform));
            filet.transform.SetParent(bas.transform, false);
            filet.transform.SetSiblingIndex(1 < bas.transform.childCount ? 1 : 0);
            filet.AddComponent<UnityEngine.UI.LayoutElement>().ignoreLayout = true;
            RectTransform fr = (RectTransform)filet.transform;
            fr.anchorMin = new Vector2(0f, 1f); fr.anchorMax = new Vector2(1f, 1f); fr.pivot = new Vector2(0.5f, 1f);
            fr.offsetMin = new Vector2(-debordGauche, -px(2f)); fr.offsetMax = new Vector2(debordDroite, 0f);
            UnityEngine.UI.Image fi = filet.AddComponent<UnityEngine.UI.Image>();
            fi.color = FiletDuBas; fi.raycastTarget = false;
            return bas;
        }

        /// <summary>LA BANDE DE VOIX `.voix` (㉓ la vitrine, cadres 98-100 : plaque `#12100e`, filet HAUT de 1 CSS px `#3a2e24`, padding `9 12 16`, les éléments en ligne à `gap:9px` alignés en haut — A4 du juge groupé du 07/10) : la plaque
        /// et son filet se posent par l'écran ; la VOIX elle-même (portrait, nom, réplique du lieutenant) n'est pas servie — TD-823, décision de f2 du 08/10 « bande basse sans voix » — et RIEN n'est posé à sa place. `plaque` et `filet` :
        /// les aplats mesurés sur le cadre de l'écran (par le jeton quand il est à moins de 4/255). Rend la plaque (le contenu — portrait, colonne — s'y range). Idempotent par nom (« Bas »).</summary>
        public static GameObject BandeDeVoix(Transform parent, System.Func<float, float> px, Color plaque, Color filet)
        {
            Transform existant = parent.Find("Bas");
            if (existant != null) return existant.gameObject;
            GameObject bas = new GameObject("Bas", typeof(RectTransform));
            bas.transform.SetParent(parent, false);
            Image fond = bas.AddComponent<Image>();
            fond.color = plaque;
            fond.raycastTarget = false;
            HorizontalLayoutGroup h = bas.AddComponent<HorizontalLayoutGroup>();
            h.padding = new RectOffset((int)px(12f), (int)px(12f), (int)px(9f) + (int)px(1f), (int)px(16f));
            h.spacing = px(9f);
            h.childAlignment = TextAnchor.UpperLeft;
            h.childControlWidth = true; h.childControlHeight = true;
            h.childForceExpandWidth = false; h.childForceExpandHeight = false;
            bas.AddComponent<LayoutElement>().flexibleHeight = 0f;
            GameObject f = new GameObject("Filet", typeof(RectTransform));
            f.transform.SetParent(bas.transform, false);
            f.AddComponent<LayoutElement>().ignoreLayout = true;
            RectTransform fr = (RectTransform)f.transform;
            fr.anchorMin = new Vector2(0f, 1f); fr.anchorMax = new Vector2(1f, 1f); fr.pivot = new Vector2(0.5f, 1f);
            fr.offsetMin = new Vector2(0f, -px(1f)); fr.offsetMax = Vector2.zero;
            Image fi = f.AddComponent<Image>();
            fi.color = filet; fi.raycastTarget = false;
            return bas;
        }

        /// <summary>LE GESTE d'une bande basse (`.geste`, `.cn-geste`) : un bouton à fond sombre, cerne, libellé en capitales lettrées à gauche et LÉGENDE `small` à droite, dans la forme `Forme.Geste` et l'état demandé.
        /// `Etat.Mort` (`.mort`) = le geste ÉTEINT, posé sans mentir quand aucune route ne l'active (㉞ Carnet, comme ㊳) : le `Button` n'est pas interactif. Rend le bouton.</summary>
        public static Button Geste(Transform bande, System.Func<float, float> px, TMP_FontAsset police, string libelle, string legende, Etat etat, System.Action surClic = null)
        {
            GameObject go = new GameObject("Geste", typeof(RectTransform));
            go.transform.SetParent(bande, false);
            Image fond = go.AddComponent<Image>();
            Button b = go.AddComponent<Button>();
            b.targetGraphic = fond;
            b.interactable = etat != Etat.Mort && surClic != null;
            if (surClic != null) b.onClick.AddListener(() => surClic());
            HorizontalLayoutGroup h = go.AddComponent<HorizontalLayoutGroup>();
            h.padding = new RectOffset((int)px(11f), (int)px(11f), (int)px(9f), (int)px(9f));
            h.spacing = px(8f);
            h.childAlignment = TextAnchor.MiddleLeft;
            h.childControlWidth = true; h.childControlHeight = true;
            h.childForceExpandWidth = false; h.childForceExpandHeight = false;
            go.AddComponent<LayoutElement>().minHeight = px(26f);
            TextMeshProUGUI lib = Texte(go.transform, "Libelle", libelle, px(9.5f), police, true);
            lib.characterSpacing = 7f;   // `.7px` sur 9,5 px ≈ .074em
            // ㉞ F7 (juge d'ensemble r3, 08/10) : la maquette écrit ses gestes en CAPITALES (« LANCER LA SOIRÉE », `.cn-geste`) ; la valeur SERVIE du Carnet est en casse de phrase (« Lancer la soirée »), rendue telle quelle
            // (hauteurs de glyphes 26/20/20/20). Les capitales sont une affaire d'AFFICHAGE : `UpperCase` du TMP, jamais la clé ni la valeur (un libellé déjà en capitales n'en change pas).
            lib.fontStyle |= FontStyles.UpperCase;
            lib.enableWordWrapping = true;
            lib.gameObject.GetComponent<LayoutElement>().flexibleWidth = 1f;
            if (!string.IsNullOrEmpty(legende))
            {
                TextMeshProUGUI leg = Texte(go.transform, "Legende", legende, px(6.5f), police, false);
                leg.color = Legende(etat);
                leg.alignment = TextAlignmentOptions.MidlineRight;
                leg.enableWordWrapping = true;
                leg.gameObject.GetComponent<LayoutElement>().flexibleWidth = 1f;
            }
            StylerLeBouton(go, lib, Forme.Geste, etat);
            return b;
        }

        private static TextMeshProUGUI Texte(Transform parent, string nom, string texte, float taille, TMP_FontAsset police, bool gras)
        {
            GameObject go = new GameObject(nom, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            if (go.GetComponent<CanvasRenderer>() == null) go.AddComponent<CanvasRenderer>();
            TextMeshProUGUI t = go.AddComponent<TextMeshProUGUI>();
            t.font = police; t.fontSize = taille; t.text = texte; t.raycastTarget = false;
            if (gras) t.fontStyle = FontStyles.Bold;
            go.AddComponent<LayoutElement>();
            return t;
        }

        /// <summary>Un cerne de `epaisseur` u sur le pourtour du parent : quatre filets, hors mise en page, sans toucher.</summary>
        public static void Cerner(Transform parent, Color couleur, float epaisseur)
        {
            Transform existant = parent.Find("Cerne");
            if (existant != null)
            {
                foreach (Image e in existant.GetComponentsInChildren<Image>(true)) e.color = couleur;
                return;
            }
            GameObject cerne = new GameObject("Cerne", typeof(RectTransform));
            cerne.transform.SetParent(parent, false);
            cerne.AddComponent<LayoutElement>().ignoreLayout = true;
            RectTransform crt = (RectTransform)cerne.transform;
            crt.anchorMin = Vector2.zero; crt.anchorMax = Vector2.one; crt.offsetMin = crt.offsetMax = Vector2.zero;
            Filet(crt, "Haut", new Vector2(0f, 1f), new Vector2(1f, 1f), new Vector2(0f, -epaisseur), Vector2.zero, couleur);
            Filet(crt, "Bas", new Vector2(0f, 0f), new Vector2(1f, 0f), Vector2.zero, new Vector2(0f, epaisseur), couleur);
            Filet(crt, "Gauche", new Vector2(0f, 0f), new Vector2(0f, 1f), Vector2.zero, new Vector2(epaisseur, 0f), couleur);
            Filet(crt, "Droite", new Vector2(1f, 0f), new Vector2(1f, 1f), new Vector2(-epaisseur, 0f), Vector2.zero, couleur);
        }

        private static void Filet(RectTransform parent, string nom, Vector2 ancreMin, Vector2 ancreMax, Vector2 decalMin, Vector2 decalMax, Color couleur)
        {
            GameObject f = new GameObject(nom, typeof(RectTransform));
            f.transform.SetParent(parent, false);
            RectTransform rt = (RectTransform)f.transform;
            rt.anchorMin = ancreMin; rt.anchorMax = ancreMax; rt.offsetMin = decalMin; rt.offsetMax = decalMax;
            Image im = f.AddComponent<Image>();
            im.color = couleur;
            im.raycastTarget = false;
        }

        /// <summary>Vrai si une couleur est « l'or PLEIN » d'un aplat de bouton (un fond d'or, pas un libellé) : la garde de classe s'en sert pour refuser le pavé or hors de LA SUITE. Pure.</summary>
        public static bool EstUnAplatOr(Color c) => c.r > 0.55f && c.g > 0.40f && c.b < 0.35f && c.r > c.b * 1.8f;
    }
}
