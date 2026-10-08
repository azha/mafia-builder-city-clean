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
        private bool sousLaBarre = true;

        public int RetraitHaut { get; private set; }

        internal void Lier(DecorPose p, LayoutGroup g, float marge, bool plancherBarre) { pose = p; pile = g; margeHaut = marge; sousLaBarre = plancherBarre; p.Reserve = this; }

        private void OnRectTransformDimensionsChange() => Maj();

        public void Maj()
        {
            if (pose == null || pile == null || pose.Spec == null) return;
            float h = ((RectTransform)pose.transform).rect.height;
            float bande = h * Mathf.Clamp01(pose.Bande);   // la fraction du catalogue, ou ce qui reste au-dessus d'un support borné en px CSS (`HauteurSupportCss`)
            // Une racine plein écran : le contenu sous max(barre, bande). Une racine DÉJÀ retirée de la barre (⑱ `MenuPlus`, insettée
            // par `ShellChrome`) : la bande seule — la barre compterait deux fois.
            int retrait = Mathf.RoundToInt((sousLaBarre ? Mathf.Max(ShellChrome.TopInsetPx, bande) : bande) + margeHaut);
            if (retrait == RetraitHaut && pile.padding.top == retrait) return;
            RetraitHaut = retrait;
            pile.padding.top = retrait;
            LayoutRebuilder.MarkLayoutForRebuild((RectTransform)pile.transform);
        }
    }
}
