using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

namespace MafiaCleanCity.Shell
{
    /// <summary>Le décor POSÉ par `DecorDeScene.Poser` (§2) : poignées stables pour l'écran et pour la régie de CLIENT-3
    /// (`Scene`, `Support`, `Cerne`, `Radiaux`), et la géométrie qui dépend de l'ÉCHELLE de l'écran.
    ///
    /// ⚠️ L'échelle (px CSS → unités de canvas, `EchelleMaquette`, maquette série 6) n'est connue qu'une fois le rect
    /// résolu — sous `ContentSlot` ou un LayoutGroup, ce n'est PAS le cas au montage. Tout ce qui en dépend (découpe de la
    /// scène, retraits du cerne, `pixelsPerUnitMultiplier` des sprites dessinés en px CSS) est donc recalculé à CHAQUE
    /// changement de rect, jamais seulement au montage (même mécanisme que `DecorAuComptoir.MajUv`).</summary>
    public sealed class DecorPose : MonoBehaviour
    {
        public SpecDecor Spec { get; internal set; }
        public Image Capteur { get; internal set; }
        public RawImage Scene { get; internal set; }
        public Image Voile { get; internal set; }
        public RectTransform Support { get; internal set; }
        public RectTransform Cerne { get; internal set; }
        public IReadOnlyList<RectTransform> Radiaux => radiaux;

        internal DecorAuComptoir.Parametres Cadrage;
        private readonly List<RectTransform> radiaux = new List<RectTransform>();
        private readonly List<(Image img, float texelsParPxCss)> echelles = new List<(Image, float)>();
        private readonly List<(RectTransform rt, float insetCss)> insets = new List<(RectTransform, float)>();

        internal void AjouterRadial(RectTransform rt) => radiaux.Add(rt);
        internal void AjouterEchelle(Image img, float texelsParPxCss) => echelles.Add((img, texelsParPxCss));
        internal void AjouterInset(RectTransform rt, float insetCss) => insets.Add((rt, insetCss));

        /// <summary>Unités de canvas par px CSS de la maquette série 6, sur la racine que le décor couvre.</summary>
        public float Echelle => EchelleMaquette.Px(1f, (RectTransform)transform, EchelleMaquette.LargeurEcransBrennar6);

        private SuiviDuCadre suivi;
        private bool suit;   // distinct de `suivi != null` : le cadre suivi peut avoir été DÉTRUIT (un état re-rendu), le support doit alors être rendu quand même
        internal ReserveDeBande Reserve { get; set; }

        /// <summary>Hauteur du support en px CSS de la maquette, quand l'ÉTAT de l'écran la borne (`min-height` d'un panneau : ⑮ à fiche,
        /// cadres 33-35 = 400) ; null = la fraction `Spec.Bande` du catalogue (le cas des 25 autres écrans, et des autres états de ⑮).</summary>
        public float? HauteurSupportCss { get; private set; }

        /// <summary>Part de la hauteur où la scène reste visible AU-DESSUS du support : la fraction du catalogue, ou — si l'état borne le
        /// support en px CSS — ce qu'il en reste sur le rect RÉEL du décor (jamais figée au montage : une hauteur non résolue retombe sur le
        /// catalogue). Lue par `ReserveDeBande` et par l'ancrage de `Decor/Support`.</summary>
        public float Bande
        {
            get
            {
                if (Spec == null) return 0f;
                if (!HauteurSupportCss.HasValue) return Spec.Bande;
                float h = ((RectTransform)transform).rect.height;
                if (h < 1f || Echelle <= 1e-4f) return Spec.Bande;
                return Mathf.Clamp01(1f - HauteurSupportCss.Value * Echelle / h);
            }
        }

        /// <summary>Borne le support à `px` CSS de haut (null = rendre la fraction du catalogue) et relance la pile qui s'y appuie.</summary>
        public void FixerLaHauteurDuSupport(float? px)
        {
            if (HauteurSupportCss == px) return;
            HauteurSupportCss = px;
            Rafraichir();
            if (Reserve != null) Reserve.Maj();
        }

        /// <summary>`Decor/Support` et `Decor/Cerne` suivent le rect RÉEL de `cadre` au lieu de l'ancrage « sous la bande » (㊲ : un
        /// panneau à géométrie propre). Le contenu de l'écran ne bouge pas ; aucune `ReserverLaBande` ne s'applique alors.</summary>
        public SuiviDuCadre SuivreLeCadre(RectTransform cadre)
        {
            if (cadre == null) throw new System.ArgumentNullException(nameof(cadre));
            if (suit && (suivi == null || suivi.gameObject != cadre.gameObject)) LacherLeCadre();
            suivi = cadre.GetComponent<SuiviDuCadre>();
            if (suivi == null) suivi = cadre.gameObject.AddComponent<SuiviDuCadre>();
            suit = true;
            suivi.Pose = this;
            suivi.Maj();
            return suivi;
        }

        /// <summary>Le contraire de `SuivreLeCadre` : le cadre ne commande plus `Decor/Support` ni `Decor/Cerne`, qui retrouvent leur ancrage
        /// « sous la bande » (sans cela, le retour à un état sans panneau garderait un support rétréci sur un cadre qui n'est plus là).</summary>
        public void LacherLeCadre()
        {
            if (!suit) return;
            suit = false;
            if (suivi != null)
            {
                suivi.Pose = null;
                if (Application.isPlaying) Destroy(suivi); else DestroyImmediate(suivi);
            }
            suivi = null;
            AncrerSousLaBande();
        }

        private void AncrerSousLaBande()
        {
            float b = Bande;
            if (Support != null) DecorDeScene.AncrerSousLaBande(Support, b);
            if (Cerne != null) DecorDeScene.AncrerSousLaBande(Cerne, b);
        }

        private void OnRectTransformDimensionsChange()
        {
            Rafraichir();
            if (suivi != null) suivi.Maj();
        }

        public void Rafraichir()
        {
            if (Spec == null) return;
            var rt = (RectTransform)transform;
            if (Scene != null && Cadrage != null)
                Scene.uvRect = DecorAuComptoir.UvCouverture(rt.rect.width, rt.rect.height, Cadrage);
            if (HauteurSupportCss.HasValue && !suit) AncrerSousLaBande();   // le support borné en px CSS suit la hauteur RÉELLE

            float s = Mathf.Max(1e-4f, Echelle);
            foreach (var (img, k) in echelles)
            {
                if (img == null) continue;
                // Un sprite dessiné à k texels par px CSS doit afficher 1 px CSS = s unités :
                // unités = texels · refPPU / (spritePPU · multiplicateur) ⇒ multiplicateur = k · refPPU / (spritePPU · s).
                Canvas c = img.canvas;
                float refPpu = c != null ? c.referencePixelsPerUnit : 100f;
                float spritePpu = img.sprite != null ? img.sprite.pixelsPerUnit : 100f;
                img.pixelsPerUnitMultiplier = Mathf.Max(1e-3f, k * refPpu / (spritePpu * s));
            }
            foreach (var (r, insetCss) in insets)
            {
                if (r == null) continue;
                float d = insetCss * s;
                r.offsetMin = new Vector2(d, d);
                r.offsetMax = new Vector2(-d, -d);
            }
        }
    }
}
