using UnityEngine;
using UnityEngine.UI;

namespace MafiaCleanCity.Shell
{
    /// <summary>LA LISTE QUI DÉFILE ET QUI LE DIT (cause n°7 du rapport de conformité de CLIENT-3, 07/10 : « listes coupées au pixel sans défilement ni indice » — ㊳ B2, ㉝ B1, ㉓ m3).
    ///
    /// Une liste plus haute que sa fenêtre est coupée par un `RectMask2D` : le joueur voit une carte tranchée au ras du dock et ne devine ni qu'il y a une suite, ni qu'il peut la tirer.
    /// Trois écrans avaient trois formes du même défaut : un masque SANS `ScrollRect` (le reste est inatteignable, Journal), un `ScrollRect` SANS indice (Démolition), un défilement coupé net
    /// SANS fondu (Boutique). Ce composant est LE mécanisme commun :
    ///   · une fenêtre `ScrollRect` verticale (Clamped) — `Equiper(cadre, contenu)` la crée quand l'écran n'en a pas, `Indiquer(scrollRect)` l'équipe quand il en a une ;
    ///   · un FONDU en bas (la couleur du fond de l'écran, transparent → opaque) qui s'efface quand on est en bas de course, ou quand tout tient : « il y a une suite » ;
    ///   · un ASCENSEUR discret à droite (un pouce proportionnel à la part visible) : « voici où vous êtes ».
    /// Rien ne change pour une liste qui TIENT : ni fondu, ni ascenseur, ni course. Les fonctions de calcul sont pures et testées ; la garde de CLASSE (`ListeDefilantePlayModeTests`) exige
    /// que tout `RectMask2D` d'un écran soit sous ce composant ou figure dans une exception NOMMÉE avec sa raison.
    /// ⚠️ Le fondu a l'alpha d'un dégradé : sur un fond sombre uni, un mélange sRGB et un mélange linéaire ne diffèrent que de quelques niveaux — c'est un INDICE, pas un aplat de la maquette.</summary>
    public sealed class ListeDefilante : MonoBehaviour
    {
        /// <summary>La hauteur du fondu, en unités du canvas : de quoi suggérer une carte qui continue sans masquer une ligne entière.</summary>
        public const float HauteurDuFondu = 72f;
        /// <summary>L'ascenseur : largeur (u), pouce minimal (u) — un pouce plus petit ne se saisit ni ne se lit.</summary>
        public const float LargeurDeLAscenseur = 5f, PouceMinimal = 36f;
        /// <summary>Marge de l'ascenseur au bord droit de la fenêtre (u).</summary>
        public const float MargeDeLAscenseur = 6f;

        // ── le calcul, PUR ─────────────────────────────────────────────────────────────────────────────────────────────────────────────

        /// <summary>Le contenu dépasse-t-il la fenêtre ? (tolérance de 1 u : un arrondi de mise en page n'est pas une suite.)</summary>
        public static bool Depasse(float hauteurDuContenu, float hauteurDeLaFenetre) => hauteurDuContenu > hauteurDeLaFenetre + 1f;

        /// <summary>Ce qui reste SOUS la fenêtre : la hauteur du contenu moins la fenêtre moins ce qui est déjà remonté (`decalage` ≥ 0 : la position du contenu depuis le haut). Jamais négatif.</summary>
        public static float ResteEnBas(float hauteurDuContenu, float hauteurDeLaFenetre, float decalage) =>
            Mathf.Max(0f, hauteurDuContenu - hauteurDeLaFenetre - Mathf.Max(0f, decalage));

        /// <summary>L'opacité du fondu : 0 quand tout tient, 1 quand il reste au moins `hauteurDuFondu` dessous, une rampe linéaire entre les deux (le fondu s'éteint en arrivant en bas).</summary>
        public static float OpaciteDuFondu(float hauteurDuContenu, float hauteurDeLaFenetre, float decalage, float hauteurDuFondu = HauteurDuFondu)
        {
            if (!Depasse(hauteurDuContenu, hauteurDeLaFenetre)) return 0f;
            return Mathf.Clamp01(ResteEnBas(hauteurDuContenu, hauteurDeLaFenetre, decalage) / Mathf.Max(1f, hauteurDuFondu));
        }

        /// <summary>La hauteur du pouce de l'ascenseur pour une piste de `hauteurDeLaPiste` : la part visible du contenu, jamais moins de `PouceMinimal`. 0 quand tout tient.</summary>
        public static float HauteurDuPouce(float hauteurDuContenu, float hauteurDeLaFenetre, float hauteurDeLaPiste)
        {
            if (!Depasse(hauteurDuContenu, hauteurDeLaFenetre)) return 0f;
            return Mathf.Clamp(hauteurDeLaPiste * hauteurDeLaFenetre / hauteurDuContenu, Mathf.Min(PouceMinimal, hauteurDeLaPiste), hauteurDeLaPiste);
        }

        /// <summary>Le décalage du pouce depuis le HAUT de la piste (u) : 0 en haut de course, `piste − pouce` en bas. 0 quand tout tient.</summary>
        public static float DecalageDuPouce(float hauteurDuContenu, float hauteurDeLaFenetre, float decalage, float hauteurDeLaPiste, float hauteurDuPouce)
        {
            if (!Depasse(hauteurDuContenu, hauteurDeLaFenetre)) return 0f;
            float course = hauteurDuContenu - hauteurDeLaFenetre;
            float part = Mathf.Clamp01(Mathf.Max(0f, decalage) / course);
            return part * Mathf.Max(0f, hauteurDeLaPiste - hauteurDuPouce);
        }

        // ── la pose ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

        /// <summary>L'état lu au dernier rafraîchissement (garde, test).</summary>
        public bool ContenuDepasse { get; private set; }
        public float OpaciteCourante { get; private set; }
        public ScrollRect Defilement { get; private set; }
        public Image Fondu { get; private set; }
        public RectTransform Pouce { get; private set; }

        private Color fond = Color.black;   // toujours remplacée par `Equiper`/`Indiquer` (la couleur du fond de l'écran) : un défaut neutre, pas une recopie de surfaceBase (garde Palette)
        private RectTransform piste;
        // Un CACHE, pas un état publié : une case `readonly` (convention de `ProceduralUI.cache`) — garde EtatDuShell S1, qui ne recense que les statiques réassignables.
        private static readonly Sprite[] spriteDuFondu = new Sprite[1];

        /// <summary>Crée la FENÊTRE défilante d'un écran qui n'en avait pas : `cadre` (qui porte déjà son masque) devient un `ScrollRect` vertical sur `contenu`, avec un graphique transparent qui reçoit le
        /// geste. `fond` = la couleur du fond de l'écran sous la liste (le fondu s'y fond).</summary>
        public static ListeDefilante Equiper(RectTransform cadre, RectTransform contenu, Color fond)
        {
            Image receveur = cadre.GetComponent<Image>();
            if (receveur == null)
            {
                receveur = cadre.gameObject.AddComponent<Image>();
                receveur.color = new Color(0f, 0f, 0f, 0f);   // transparent, mais RECEVEUR : un ScrollRect sans graphique ne reçoit aucun geste
            }
            ScrollRect sr = cadre.GetComponent<ScrollRect>();
            if (sr == null) sr = cadre.gameObject.AddComponent<ScrollRect>();
            sr.horizontal = false;
            sr.vertical = true;
            sr.movementType = ScrollRect.MovementType.Clamped;
            sr.scrollSensitivity = 40f;
            sr.viewport = cadre;
            sr.content = contenu;
            return Indiquer(sr, fond);
        }

        /// <summary>Équipe un `ScrollRect` EXISTANT de l'indice (fondu + ascenseur). Idempotent : un second appel remplace la couleur du fond, ne double rien.</summary>
        public static ListeDefilante Indiquer(ScrollRect sr, Color fond)
        {
            ListeDefilante l = sr.GetComponent<ListeDefilante>();
            if (l == null) l = sr.gameObject.AddComponent<ListeDefilante>();
            l.Defilement = sr;
            l.fond = fond;
            l.Construire();
            return l;
        }

        private void Construire()
        {
            RectTransform fenetre = Defilement.viewport != null ? Defilement.viewport : (RectTransform)Defilement.transform;
            if (Fondu == null)
            {
                GameObject f = new GameObject("FonduDeFin", typeof(RectTransform));
                f.transform.SetParent(fenetre, false);
                f.AddComponent<LayoutElement>().ignoreLayout = true;
                RectTransform frt = (RectTransform)f.transform;
                frt.anchorMin = new Vector2(0f, 0f); frt.anchorMax = new Vector2(1f, 0f); frt.pivot = new Vector2(0.5f, 0f);
                frt.offsetMin = new Vector2(0f, 0f); frt.offsetMax = new Vector2(0f, HauteurDuFondu);
                Fondu = f.AddComponent<Image>();
                Fondu.sprite = SpriteDuFondu();
                Fondu.raycastTarget = false;
            }
            Fondu.color = new Color(fond.r, fond.g, fond.b, 0f);

            if (piste == null)
            {
                GameObject p = new GameObject("Ascenseur", typeof(RectTransform));
                p.transform.SetParent(fenetre, false);
                p.AddComponent<LayoutElement>().ignoreLayout = true;
                piste = (RectTransform)p.transform;
                piste.anchorMin = new Vector2(1f, 0f); piste.anchorMax = new Vector2(1f, 1f); piste.pivot = new Vector2(1f, 1f);
                piste.offsetMin = new Vector2(-(MargeDeLAscenseur + LargeurDeLAscenseur), 8f); piste.offsetMax = new Vector2(-MargeDeLAscenseur, -8f);
                GameObject t = new GameObject("Pouce", typeof(RectTransform));
                t.transform.SetParent(piste, false);
                Pouce = (RectTransform)t.transform;
                Pouce.anchorMin = new Vector2(0f, 1f); Pouce.anchorMax = new Vector2(1f, 1f); Pouce.pivot = new Vector2(0.5f, 1f);
                Image pi = t.AddComponent<Image>();
                Color pouce = MafiaCleanCity.Theme.DesignTokens.Current.hudCremeSecondary;   // le crème secondaire (le jeton : garde Palette), discret (un indice, pas un contrôle)
                pouce.a = 0.45f;
                pi.color = pouce;
                pi.raycastTarget = false;
                piste.gameObject.SetActive(false);
            }
        }

        /// <summary>Le dégradé du fondu : transparent en haut, opaque en bas (une colonne de pixels blancs à alpha croissant, teintée par `Image.color`).</summary>
        private static Sprite SpriteDuFondu()
        {
            if (spriteDuFondu[0] != null) return spriteDuFondu[0];
            const int n = 64;
            var tex = new Texture2D(1, n, TextureFormat.RGBA32, false) { wrapMode = TextureWrapMode.Clamp, filterMode = FilterMode.Bilinear, name = "FonduDeFin" };
            var px = new Color32[n];
            for (int y = 0; y < n; y++)   // la ligne 0 est le BAS : opaque, puis de plus en plus transparent vers le haut
            {
                float a = 1f - y / (n - 1f);
                px[y] = new Color32(255, 255, 255, (byte)Mathf.RoundToInt(a * a * 255f));   // a² : la rampe démarre doucement, elle ne dessine pas de bord
            }
            tex.SetPixels32(px);
            tex.Apply(false, true);
            spriteDuFondu[0] = Sprite.Create(tex, new Rect(0, 0, 1, n), new Vector2(0.5f, 0.5f), 100f);
            return spriteDuFondu[0];
        }

        private void LateUpdate() => Rafraichir();

        /// <summary>Relit la course et pose le fondu et l'ascenseur. Public : un test le joue sans attendre une frame.</summary>
        public void Rafraichir()
        {
            if (Defilement == null || Defilement.content == null || Fondu == null || piste == null) return;
            RectTransform fenetre = Defilement.viewport != null ? Defilement.viewport : (RectTransform)Defilement.transform;
            float vue = fenetre.rect.height, contenu = Defilement.content.rect.height;
            float decalage = Defilement.content.anchoredPosition.y;   // contenu ancré en haut : positif quand il est remonté
            ContenuDepasse = Depasse(contenu, vue);
            OpaciteCourante = OpaciteDuFondu(contenu, vue, decalage);
            Color c = Fondu.color; c.a = OpaciteCourante; Fondu.color = c;
            if (piste.gameObject.activeSelf != ContenuDepasse) piste.gameObject.SetActive(ContenuDepasse);
            if (!ContenuDepasse) return;
            float hp = piste.rect.height;
            float pouce = HauteurDuPouce(contenu, vue, hp);
            Pouce.sizeDelta = new Vector2(0f, pouce);
            Pouce.anchoredPosition = new Vector2(0f, -DecalageDuPouce(contenu, vue, decalage, hp, pouce));
        }
    }
}
