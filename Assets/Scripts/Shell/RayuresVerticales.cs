using UnityEngine;
using UnityEngine.UI;

namespace MafiaCleanCity.Shell
{
    /// <summary>⑯-6 — `repeating-linear-gradient(180deg, A 0 p, B p 2p)` : deux bandes horizontales qui se
    /// RÉPÈTENT sur la hauteur, à pas constant quelle que soit la hauteur de l'objet. Une texture 1×2 en
    /// filtrage POINT, répétée ; l'UV vertical suit la hauteur du rectangle, pour qu'une période fasse toujours
    /// `periode` unités de canvas. Un sprite étiré ferait l'inverse : autant de bandes, plus ou moins larges.
    /// Premier lecteur : la tranche rouge du registre de ⑯ (`.registre::before`, juge r1 F8).</summary>
    [RequireComponent(typeof(RawImage))]
    public class RayuresVerticales : MonoBehaviour
    {
        private RawImage image;
        private float periode = 1f;

        /// <summary>Pose les rayures : `haut` est la bande du HAUT (le premier arrêt CSS), `periode` la
        /// hauteur d'UNE paire de bandes, en unités de canvas.</summary>
        public static RayuresVerticales Poser(GameObject go, Color haut, Color bas, float periode)
        {
            // pas de `??` : il ignore la surcharge `== null` d'Unity (un composant absent peut être un « faux null »)
            RawImage img = go.GetComponent<RawImage>();
            if (img == null) img = go.AddComponent<RawImage>();
            img.raycastTarget = false;
            var tex = new Texture2D(1, 2, TextureFormat.RGBA32, false)
            {
                filterMode = FilterMode.Point,
                wrapMode = TextureWrapMode.Repeat,
                hideFlags = HideFlags.HideAndDontSave,
            };
            tex.SetPixels(new[] { bas, haut });   // y = 0 en BAS
            tex.Apply(false, false);
            img.texture = tex;
            var r = go.AddComponent<RayuresVerticales>();
            r.image = img;
            r.periode = Mathf.Max(0.01f, periode);
            r.MajUv();
            return r;
        }

        /// <summary>L'UV vertical pour une hauteur donnée : une période ⇒ 1,0. L'origine est en HAUT, pour
        /// que la première bande commence au bord haut, comme en CSS.</summary>
        public static Rect UvPour(float hauteur, float periode)
        {
            float n = periode > 0f ? Mathf.Max(0f, hauteur) / periode : 0f;
            return new Rect(0f, 1f - n, 1f, n);
        }

        private void OnRectTransformDimensionsChange() => MajUv();

        private void MajUv()
        {
            if (image == null) return;
            image.uvRect = UvPour(((RectTransform)transform).rect.height, periode);
        }
    }
}
