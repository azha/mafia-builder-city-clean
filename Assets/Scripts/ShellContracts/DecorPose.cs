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

        private void OnRectTransformDimensionsChange() => Rafraichir();

        public void Rafraichir()
        {
            if (Spec == null) return;
            var rt = (RectTransform)transform;
            if (Scene != null && Cadrage != null)
                Scene.uvRect = DecorAuComptoir.UvCouverture(rt.rect.width, rt.rect.height, Cadrage);

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
