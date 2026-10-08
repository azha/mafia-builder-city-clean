using System.Collections.Generic;
using UnityEngine;

namespace MafiaCleanCity.Shell
{
    /// <summary>Porté par `Decor/Support` (§3.3, revue ⊥ n°5) : le `circle farthest-corner` de ⑮ ⑰. Lit le rect RÉEL du
    /// support et donne à chaque Image carrée enfant (`RadialCercle&lt;n&gt;`) le côté `2·RayonCoinLePlusLoin(W, H, cx, cy)`,
    /// centrée sur le foyer — à CHAQUE changement de rect (sous `ContentSlot`/LayoutGroup, le rect n'est pas résolu au
    /// montage). L'Image déborde du support : le `RectMask2D` (ou `Mask`) de `Decor/Support` la coupe.
    /// Nom distinct du type de spec `RadialCercle` : même namespace, deux types homonymes = CS0101.</summary>
    public sealed class CercleDeSupport : MonoBehaviour
    {
        private readonly List<(RectTransform rt, float cx, float cy)> cercles = new List<(RectTransform, float, float)>();

        public int Nombre => cercles.Count;

        internal void Ajouter(RectTransform rt, float cx, float cy)
        {
            cercles.Add((rt, cx, cy));
            rt.pivot = new Vector2(0.5f, 0.5f);
        }

        private void OnRectTransformDimensionsChange() => Maj();

        public void Maj()
        {
            Rect r = ((RectTransform)transform).rect;
            foreach (var (rt, cx, cy) in cercles)
            {
                if (rt == null) continue;
                float rayon = ProceduralUI.RayonCoinLePlusLoin(r.width, r.height, cx, cy);
                var foyer = new Vector2(cx, 1f - cy);   // y CSS depuis le HAUT ⇒ ancre depuis le bas
                rt.anchorMin = foyer;
                rt.anchorMax = foyer;
                rt.anchoredPosition = Vector2.zero;
                rt.sizeDelta = new Vector2(2f * rayon, 2f * rayon);
            }
        }
    }
}
