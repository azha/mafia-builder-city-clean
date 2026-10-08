using UnityEngine;
using UnityEngine.UI;

namespace MafiaCleanCity.Shell
{
    /// <summary>Porté par la PILE de contenu d'un écran décoré : son retrait du haut place le contenu SOUS la bande de scène,
    /// comme la maquette place son panneau (`Bande` = part de la hauteur où la scène reste visible au-dessus du support :
    /// 21 % pour les familles A/B, 10 % pour ⑮ ⑰ ㉔…). Sans lui, le contenu commence sous la barre du haut (≈ 10 %) et
    /// l'enseigne, les compteurs, flottent sur la scène au lieu de reposer sur le support.
    ///
    /// Retrait = max(`ShellChrome.TopInsetPx`, hauteur de la bande) + `margeHaut` (la marge CSS du premier bloc, déjà en
    /// unités : celle que le contrôleur posait). Recalculé à CHAQUE changement de rect (la hauteur n'est pas résolue au
    /// montage).</summary>
    public sealed class ReserveDeBande : MonoBehaviour
    {
        private DecorPose pose;
        private LayoutGroup pile;
        private float margeHaut;

        public int RetraitHaut { get; private set; }

        internal void Lier(DecorPose p, LayoutGroup g, float marge) { pose = p; pile = g; margeHaut = marge; }

        private void OnRectTransformDimensionsChange() => Maj();

        public void Maj()
        {
            if (pose == null || pile == null || pose.Spec == null) return;
            float h = ((RectTransform)pose.transform).rect.height;
            float bande = h * Mathf.Clamp01(pose.Spec.Bande);
            int retrait = Mathf.RoundToInt(Mathf.Max(ShellChrome.TopInsetPx, bande) + margeHaut);
            if (retrait == RetraitHaut && pile.padding.top == retrait) return;
            RetraitHaut = retrait;
            pile.padding.top = retrait;
            LayoutRebuilder.MarkLayoutForRebuild((RectTransform)pile.transform);
        }
    }
}
