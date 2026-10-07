using UnityEngine;
using UnityEngine.UI;
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
                    ? ((Color)new Color32(0x11, 0x18, 0x23, 255), new Color32(0x2a, 0x36, 0x48, 255), new Color32(0x7a, 0x83, 0x8d, 255))
                    : (DesignTokens.Current.surfaceCard, DesignTokens.Current.hudHairlineGold, DesignTokens.Current.hudMoneyGold);
            switch (etat)
            {
                case Etat.Mort: return (new Color32(0x1c, 0x14, 0x14, 255), new Color32(0x4a, 0x3a, 0x3a, 255), new Color32(0x98, 0x79, 0x79, 255));
                case Etat.Rouge: return (new Color32(0x24, 0x12, 0x14, 255), new Color32(0x5c, 0x2a, 0x2a, 255), new Color32(0xd9, 0x7a, 0x6a, 255));
                default: return (new Color32(0x24, 0x1c, 0x11, 255), new Color32(0x5a, 0x4a, 0x2a, 255), new Color32(0xd9, 0xab, 0x4e, 255));
            }
        }

        /// <summary>La légende `small` du geste (`#9a8a6a`, `#967a7a` quand il est mort) — dans le bouton, à droite. Pure.</summary>
        public static Color Legende(Etat etat) => etat == Etat.Mort ? (Color)new Color32(0x96, 0x7a, 0x7a, 255) : new Color32(0x9a, 0x8a, 0x6a, 255);

        /// <summary>La plaque `.bas` des écrans de commande : fond `#141a21`, filet haut `#2c3640` de 2 CSS px. Pure.</summary>
        public static Color PlaqueDuBas => new Color32(0x14, 0x1a, 0x21, 255);
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
