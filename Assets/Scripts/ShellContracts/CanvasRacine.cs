using UnityEngine;
using UnityEngine.UI;

namespace MafiaCleanCity.Shell
{
    /// <summary>LA résolution partagée du Canvas d'un écran : « le mountParent, sinon le Canvas racine de MON parent, sinon j'en crée un » —
    /// JAMAIS « le premier Canvas de la scène » (`FindFirstObjectByType&lt;Canvas&gt;`). Ce dernier rendait, selon l'ordre de la scène, le
    /// Canvas d'un AUTRE écran ou du shell : en test (B3H1) un écran se construisait dans le canvas du voisin, et en jeu, sur le chemin de repli
    /// hors shell (`DashboardController`, `ExceptionQueueController`), un écran se construisait PAR-DESSUS le shell. Les contrôleurs d'écran et le
    /// gabarit `Tools/nouvel-ecran.py` l'appellent ; la garde de classe `CanvasRacinePlayModeTests` exige 0 `FindFirstObjectByType&lt;Canvas&gt;`
    /// hors `AppShell.BuildLayout` (seul à DÉCOUVRIR le canvas du shell, par nom).</summary>
    public static class CanvasRacine
    {
        /// <summary>Le Canvas dont `canvas.transform` sert de racine de repli à l'écran hôte.
        ///   · `mountParent` posé (monté dans le shell) : le Canvas racine de `mountParent`, ou null — l'appelant n'utilise PAS ce canvas dans ce
        ///     cas (il construit sous `mountParent` ou sous son hôte) ; rien n'est créé.
        ///   · sinon, l'hôte a un parent : le Canvas RACINE de ce parent (`rootCanvas`), même s'il est inactif ; null s'il n'est sous aucun.
        ///   · sinon (hôte à la racine de la scène, hors shell, test isolé) : un Canvas NEUF, ScreenSpaceOverlay, 1280×720, dont l'écran est le
        ///     seul occupant — jamais celui d'un voisin.</summary>
        public static Canvas Resoudre(Transform hote, Transform mountParent)
        {
            if (mountParent != null) return RacineDe(mountParent);
            if (hote != null && hote.parent != null)
            {
                Canvas trouve = RacineDe(hote.parent);
                if (trouve != null) return trouve;
            }
            return Creer();
        }

        private static Canvas RacineDe(Transform t)
        {
            Canvas c = t != null ? t.GetComponentInParent<Canvas>(true) : null;
            return c != null ? c.rootCanvas : null;
        }

        private static Canvas Creer()
        {
            GameObject go = new GameObject("Canvas", typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            Canvas canvas = go.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            CanvasScaler sc = go.GetComponent<CanvasScaler>();
            sc.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            sc.referenceResolution = new Vector2(1280, 720);
            return canvas;
        }
    }
}
