using UnityEngine;
using UnityEngine.UI;

namespace MafiaCleanCity.CityMap
{
    // Retour user relayé par le contrôleur (2026-08-21, découvert via les captures multi-
    // résolution du lot HUD v3.1/TabBar) : l'écran City Map (les colonnes North/South Bank)
    // n'avait jamais reçu la doctrine « verre gravé, aucun aplat de couleur » du restyle HUD —
    // fonds `mapPanelNorth`/`mapPanelSouth` en APLAT PLEIN, sur des panneaux qui peuvent couvrir
    // les 3/4 d'un écran portrait vide (voir le correctif de layout dans `CityMapController.
    // BuildColumn`/`BuildLayout`).
    //
    // REUSE délibéré du PATRON de `Shell/VerticalGradientImage.cs` (dégradé 2 couleurs, vertex
    // color GPU, aucun équivalent CSS `linear-gradient` en uGUI) — PAS le même fichier : `CityMap.
    // asmdef` ne référence PAS `Shell` (et `Shell` référence déjà `CityMap` via `AppShell.cs` —
    // une référence dans l'autre sens créerait un cycle, que Unity refuse). Dupliqué ICI en petit,
    // plutôt que de déplacer `VerticalGradientImage` vers un assembly partagé (`ShellContracts`) —
    // un déplacement toucherait la provenance scannée par `TopBarDoctrineV31PlayModeTests.DA3`
    // (chemins de fichiers exacts) pour un bénéfice hors du périmètre de ce lot. Même discipline
    // R2.3 : les deux couleurs sont TOUJOURS reçues via `SetColors`, jamais câblées ici.
    public class CityMapVerticalGradient : Graphic
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
