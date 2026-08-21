using UnityEngine;
using UnityEngine.UI;

namespace MafiaCleanCity.Shell
{
    // HUD v3.1 (doctrine DA — hud-brennar.html `.barre{background:linear-gradient(180deg, ...)}`)
    // — uGUI n'a pas d'équivalent CSS `linear-gradient`. Ce Graphic peint un quad à 2 couleurs
    // interpolées par le GPU (vertex color), sans texture ni matériau custom : la façon idiomatique
    // uGUI de faire un dégradé 2-arrêts.
    //
    // R2.3 — les deux couleurs sont TOUJOURS reçues via `SetColors`, jamais câblées ici ; ce
    // fichier ne contient aucun accès DesignTokens ni littéral de couleur (les defaults
    // Color.white/black ne sont qu'un état transitoire avant le premier SetColors de l'appelant).
    //
    // ⚠️ PIÈGE MESURÉ (2026-08-21) — `Graphic` porte `[RequireComponent(typeof(CanvasRenderer))]`,
    // mais `gameObject.AddComponent<VerticalGradientImage>()` seul NE l'auto-ajoute PAS à
    // l'exécution (vérifié côte à côte contre `UnityEngine.UI.Image`, qui l'obtient bien). Sans
    // `CanvasRenderer`, ce Graphic ne dessine RIEN — silencieusement, aucune erreur console. TOUT
    // appelant DOIT construire le GameObject avec `typeof(CanvasRenderer)` explicite :
    // `new GameObject("X", typeof(RectTransform), typeof(CanvasRenderer), typeof(VerticalGradientImage))`
    // — voir `TopBarController.BuildBarBackground` pour l'usage d'origine ; `AppShell.BuildTabBar`
    // (HUD v3.1 cohérence, 2026-08-21) le reprend TEL QUEL pour la TabBar — même verre, même patron.
    public class VerticalGradientImage : Graphic
    {
        private Color topColor = Color.white;
        private Color bottomColor = Color.black;

        public void SetColors(Color top, Color bottom)
        {
            topColor = top;
            bottomColor = bottom;
            SetVerticesDirty();
        }

        protected override void OnPopulateMesh(VertexHelper vh)
        {
            vh.Clear();
            Rect r = GetPixelAdjustedRect();
            var bl = new Vector3(r.xMin, r.yMin);
            var tl = new Vector3(r.xMin, r.yMax);
            var tr = new Vector3(r.xMax, r.yMax);
            var br = new Vector3(r.xMax, r.yMin);

            vh.AddVert(bl, bottomColor, Vector2.zero);
            vh.AddVert(tl, topColor, Vector2.zero);
            vh.AddVert(tr, topColor, Vector2.zero);
            vh.AddVert(br, bottomColor, Vector2.zero);

            vh.AddTriangle(0, 1, 2);
            vh.AddTriangle(2, 3, 0);
        }
    }
}
