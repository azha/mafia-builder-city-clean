using System;
using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;

namespace MafiaCleanCity.Tests.PlayMode
{
    /// <summary>Dans QUEL espace uGUI compose-t-il un calque translucide ?
    ///
    /// LA QUESTION, ET POURQUOI ELLE DÉCIDE DE QUELQUE CHOSE. Un juge visuel ⊥ a mesuré que les
    /// CINQ opacités translucides de l'écran « LA FAMILLE » rendent 1,7× à 4× plus fort que leur
    /// valeur CSS — systématiquement, sans exception. La tentation est de « corriger les nombres ».
    /// Mais la maquette de référence est rendue par un NAVIGATEUR, qui compose en **sRGB**, tandis
    /// que ce projet est en espace **linéaire** (`m_ActiveColorSpace: 1`). Un même alpha n'y donne
    /// pas le même pixel : le mélange linéaire favorise la couleur claire.
    ///
    /// Si c'est vrai, alors les alphas ne sont pas « faux » — ils sont exprimés dans le mauvais
    /// espace, et le correctif est une CONVERSION, pas un tâtonnement. Ce test tranche par la
    /// mesure : il peint une couleur connue à un alpha connu sur un fond connu, lit le pixel, et
    /// le compare aux DEUX prédictions. Une seule peut gagner.</summary>
    [Category("W3U2")]
    public class EspaceColorimetriquePlayModeTests
    {
        private static Color Srgb(int r, int g, int b) => new Color(r / 255f, g / 255f, b / 255f);

        [UnityTest]
        public IEnumerator W3U2_F30_MelangeTranslucide_QuelEspace()
        {
            yield return null;
            const int W = 64, H = 64;
            Color fond = Srgb(21, 28, 43);      // la plaque de verre d'un rang
            Color encre = Srgb(217, 171, 78);   // #d9ab4e
            const float alpha = 0.267f;         // le `44` de #d9ab4e44

            var rt = new RenderTexture(W, H, 24, RenderTextureFormat.ARGB32);
            var camGo = new GameObject("cs_cam");
            var cam = camGo.AddComponent<Camera>();
            cam.targetTexture = rt;
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = fond;
            cam.orthographic = true;

            var canGo = new GameObject("cs_canvas");
            var can = canGo.AddComponent<Canvas>();
            can.renderMode = RenderMode.ScreenSpaceCamera;
            can.worldCamera = cam;
            var sc = canGo.AddComponent<CanvasScaler>();
            sc.uiScaleMode = CanvasScaler.ScaleMode.ConstantPixelSize;

            var goImg = new GameObject("cs_quad");
            goImg.transform.SetParent(canGo.transform, false);
            var img = goImg.AddComponent<Image>();
            Color c = encre; c.a = alpha;
            img.color = c;
            ((RectTransform)goImg.transform).sizeDelta = new Vector2(W, H);

            Canvas.ForceUpdateCanvases();
            cam.Render();
            RenderTexture prev = RenderTexture.active;
            RenderTexture.active = rt;
            var tex = new Texture2D(W, H, TextureFormat.RGB24, false);
            tex.ReadPixels(new Rect(0, 0, W, H), 0, 0);
            tex.Apply();
            RenderTexture.active = prev;
            Color vu = tex.GetPixel(W / 2, H / 2);

            UnityEngine.Object.DestroyImmediate(tex);
            UnityEngine.Object.DestroyImmediate(canGo);
            UnityEngine.Object.DestroyImmediate(camGo);
            rt.Release();
            UnityEngine.Object.DestroyImmediate(rt);

            // Prédiction A — mélange sRGB (ce que fait un navigateur).
            Color aPred = Color.Lerp(fond, encre, alpha);
            // Prédiction B — mélange LINÉAIRE puis retour en sRGB (ce que fait Unity en linéaire).
            Color bLin = Color.Lerp(fond.linear, encre.linear, alpha);
            Color bPred = bLin.gamma;

            Func<Color, Color, float> dist = (x, y) =>
                Mathf.Sqrt((x.r - y.r) * (x.r - y.r) + (x.g - y.g) * (x.g - y.g) + (x.b - y.b) * (x.b - y.b));
            float dA = dist(vu, aPred), dB = dist(vu, bPred);

            Debug.Log($"[F30] espace={QualitySettings.activeColorSpace} " +
                      $"vu=({vu.r * 255:F0},{vu.g * 255:F0},{vu.b * 255:F0}) " +
                      $"sRGB=({aPred.r * 255:F0},{aPred.g * 255:F0},{aPred.b * 255:F0}) d={dA:F4} · " +
                      $"linéaire=({bPred.r * 255:F0},{bPred.g * 255:F0},{bPred.b * 255:F0}) d={dB:F4}");

            // Garde anti-vacuité : les deux prédictions doivent être DISTINCTES, sinon la mesure ne
            // départage rien et un « gagnant » ne voudrait rien dire.
            Assert.Greater(dist(aPred, bPred), 0.05f,
                "les deux prédictions sont trop proches pour être départagées par cette mesure");

            Assert.AreNotEqual(dA < dB, dA > dB, "égalité stricte : indécidable");
            Assert.Less(Mathf.Min(dA, dB), 0.06f,
                $"AUCUNE des deux prédictions ne colle (sRGB {dA:F3}, linéaire {dB:F3}) — le pixel " +
                "rendu ne s'explique ni par l'un ni par l'autre, donc mon modèle du mélange est faux.");
        }
    }
}
