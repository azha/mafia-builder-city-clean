using UnityEngine;

namespace MafiaCleanCity.Shell
{
    /// <summary>Porté par le CADRE d'un écran dont le panneau n'est pas « sous la bande » mais a sa propre géométrie (㊲ : `Corps`
    /// borné à min(462 CSS, zone libre), ruling user du 07/09) : `Decor/Support` et `Decor/Cerne` prennent le rect RÉEL du cadre,
    /// recopié à CHAQUE changement — du cadre (sa hauteur est recalculée par `HauteurBorneeParLaZoneLibre`) comme du décor. Un
    /// support calé sur la mise en page d'AVANT le recalcul serait le défaut classique « rect lu au montage ».</summary>
    public sealed class SuiviDuCadre : MonoBehaviour
    {
        internal DecorPose Pose;

        private void OnRectTransformDimensionsChange() => Maj();
        private void OnEnable() => Maj();
        // Un cadre peut BOUGER sans changer de taille (sa hauteur fixe, son ancre recalculée) : la position se relit à chaque fin
        // de frame, ce qui ne coûte qu'une comparaison quand rien n'a bougé.
        private void LateUpdate() => Maj();

        private Vector3 dernierBas, dernierHaut;
        private Rect dernierDecor;

        public void Maj()
        {
            if (Pose == null || Pose.Support == null) return;
            var cadre = (RectTransform)transform;
            var coins = new Vector3[4];
            cadre.GetWorldCorners(coins);
            var decor = (RectTransform)Pose.transform;
            Rect r = decor.rect;
            // Rien n'a bougé, ni le cadre (coins MONDE) ni le décor (son rect) : rien à recopier.
            if (coins[0] == dernierBas && coins[2] == dernierHaut && r == dernierDecor) return;
            dernierBas = coins[0]; dernierHaut = coins[2]; dernierDecor = r;
            if (r.width <= 0f || r.height <= 0f) return;
            Vector3 bas = decor.InverseTransformPoint(coins[0]), haut = decor.InverseTransformPoint(coins[2]);
            var min = new Vector2((bas.x - r.xMin) / r.width, (bas.y - r.yMin) / r.height);
            var max = new Vector2((haut.x - r.xMin) / r.width, (haut.y - r.yMin) / r.height);
            Ancrer(Pose.Support, min, max);
            if (Pose.Cerne != null) Ancrer(Pose.Cerne, min, max);
        }

        private static void Ancrer(RectTransform rt, Vector2 min, Vector2 max)
        {
            rt.anchorMin = min; rt.anchorMax = max;
            rt.offsetMin = Vector2.zero; rt.offsetMax = Vector2.zero;
        }
    }
}
