using UnityEngine;
using UnityEngine.UI;

namespace MafiaCleanCity.Shell
{
    /// <summary>LA résolution partagée du Canvas d'un écran : « le mountParent, sinon le Canvas racine de MON parent, sinon j'en crée un » —
    /// JAMAIS « le premier Canvas de la scène » (`FindFirstObjectByType&lt;Canvas&gt;`). Ce dernier rendait, selon l'ordre de la scène, le
    /// Canvas d'un AUTRE écran ou du shell : en test (B3H1) un écran se construisait dans le canvas du voisin, et en jeu, sur le chemin de repli
    /// hors shell (`DashboardController`, `ExceptionQueueController`), un écran se construisait PAR-DESSUS le shell. Les contrôleurs d'écran et le
    /// gabarit `Tools/nouvel-ecran.py` l'appellent ; la garde de classe `CanvasRacinePlayModeTests` exige 0 `FindFirstObjectByType&lt;Canvas&gt;`
    /// hors `AppShell.BuildLayout` (seul à DÉCOUVRIR le canvas du shell, par nom).
    /// ⚠️ CE QUI N'EST PAS CORRIGÉ : le repli hors shell reste VISUELLEMENT par-dessus le shell — un hôte à la racine de la scène reçoit son
    /// propre Canvas overlay plein écran, qui s'affiche au-dessus de celui du shell. Seule la POLLUTION du canvas du shell (un écran qui s'y
    /// construit en le prenant pour le sien) et l'ordre « premier de la scène » sont supprimés.</summary>
    public static class CanvasRacine
    {
        /// <summary>Le Canvas dont `canvas.transform` sert de racine de repli à l'écran hôte.
        ///   · `mountParent` posé (monté dans le shell) : le Canvas racine de `mountParent`, ou null s'il n'est sous aucun — l'appelant
        ///     n'utilise PAS ce canvas dans ce cas (il construit sous `mountParent` ou sous son hôte) ; rien n'est créé.
        ///   · sinon, l'hôte a un parent : le Canvas RACINE de ce parent (`rootCanvas`), même inactif ; à défaut, un Canvas NEUF (ci-dessous).
        ///   · sinon (hôte à la racine de la scène, hors shell, test isolé) : un Canvas NEUF, ScreenSpaceOverlay, 1280×720, PARENTÉ SOUS
        ///     l'hôte (il reste canvas racine, puisque l'hôte n'est sous aucun canvas, et meurt avec lui : aucun canvas orphelin).
        ///     Jamais celui d'un voisin.</summary>
        public static Canvas Resoudre(Transform hote, Transform mountParent)
        {
            if (mountParent != null) return RacineDe(mountParent);
            if (hote != null && hote.parent != null)
            {
                Canvas trouve = RacineDe(hote.parent);
                if (trouve != null) return trouve;
            }
            return Creer(hote);
        }

        private static Canvas RacineDe(Transform t)
        {
            Canvas c = t != null ? t.GetComponentInParent<Canvas>(true) : null;
            return c != null ? c.rootCanvas : null;
        }

        private static Canvas Creer(Transform hote)
        {
            GameObject go = new GameObject("Canvas", typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            if (hote != null) go.transform.SetParent(hote, false);   // meurt avec l'hôte ; reste canvas racine (l'hôte n'est sous aucun canvas)
            Canvas canvas = go.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            CanvasScaler sc = go.GetComponent<CanvasScaler>();
            sc.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            sc.referenceResolution = new Vector2(1280, 720);
            return canvas;
        }
    }
}
