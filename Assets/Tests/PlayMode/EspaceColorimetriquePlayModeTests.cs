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

        /// <summary>La conversion d'opacité CSS doit être EXACTE, canal par canal.
        ///
        /// ⚠️ CE TEST EXISTE PARCE QU'UNE PREMIÈRE CONVERSION ÉTAIT UN COMPROMIS. Elle résolvait en
        /// ajustant l'OPACITÉ — un nombre pour trois canaux, alors que les trois n'exigent pas le
        /// même — et moyennait les trois solutions. Un juge visuel ⊥, qui ne savait rien du code, a
        /// mesuré la signature de cette moyenne sur une bordure rendue : α résolu à **0,334 en R,
        /// 0,320 en G, 0,218 en B**, et il a écrit qu'« aucune couleur unique à un α unique ne
        /// produit ça sur ce fond ». Il avait raison, et c'était mon compromis.
        ///
        /// La forme juste garde l'opacité et déplace la COULEUR : trois inconnues, trois équations,
        /// solution exacte. Ce test le vérifie sur les SIX superpositions réelles de l'écran, et
        /// garde le contrôle : l'ancienne méthode DOIT rater sur au moins l'une d'elles, sinon les
        /// deux se valent et ce test ne mesure rien.</summary>
        [UnityTest]
        public IEnumerator W3U2_F31_ConversionDOpacite_ExacteParCanal()
        {
            yield return null;
            Color feuille = Srgb(22, 22, 28);
            Color plaque = Srgb(21, 28, 43);
            var cas = new (string nom, Color encre, Color fond, float alpha)[]
            {
                ("bordure or du Don #d9ab4e44", Srgb(217, 171, 78), plaque, 0.267f),
                ("puce cyan #7fd4d955",        Srgb(127, 212, 217), plaque, 0.333f),
                ("pointillés #ffffff22",       Color.white,          feuille, 0.133f),
                ("voile du retour #ffffff08",  Color.white,          feuille, 0.031f),
                ("jonc du retour #ffffff26",   Color.white,          feuille, 0.149f),
                ("biseau haut rgba(255,255,255,.15)", Color.white,   plaque,  0.15f),
            };

            float pireExact = 0f, pireMoyenne = 0f;
            foreach (var c in cas)
            {
                // La CIBLE : ce qu'un navigateur produit, en sRGB.
                Color cible = Color.Lerp(c.fond, c.encre, c.alpha);

                // (a) la méthode EXACTE — on garde alpha, on déplace la couleur.
                bool ok;
                Color resolue = MafiaCleanCity.Shell.ProceduralUI.CouleurPourMelangeLineaire(
                    c.encre, c.fond, c.alpha, out ok);
                Color obtenuExact = Color.Lerp(c.fond.linear, resolue.linear, c.alpha).gamma;

                // (b) l'ANCIENNE — on garde la couleur, on ajuste une opacité moyennée.
                float aMoy = MafiaCleanCity.Shell.ProceduralUI.AlphaSrgbVersLineaire(
                    c.encre, c.fond, c.alpha);
                Color obtenuMoyenne = Color.Lerp(c.fond.linear, c.encre.linear, aMoy).gamma;

                Func<Color, Color, float> ecart = (x, y) => Mathf.Max(
                    Mathf.Abs(x.r - y.r), Mathf.Max(Mathf.Abs(x.g - y.g), Mathf.Abs(x.b - y.b)));
                float dExact = ecart(obtenuExact, cible), dMoy = ecart(obtenuMoyenne, cible);
                pireExact = Mathf.Max(pireExact, dExact);
                pireMoyenne = Mathf.Max(pireMoyenne, dMoy);
                Debug.Log($"[F31] {c.nom} — exact {dExact * 255f:F2}/255 · moyenné {dMoy * 255f:F2}/255" +
                          (ok ? "" : "  (cible INATTEIGNABLE à cette opacité)"));
            }

            Assert.Less(pireExact * 255f, 1.5f,
                $"la conversion exacte s'écarte de {pireExact * 255f:F2}/255 de la cible sRGB sur au " +
                "moins une superposition — elle n'est donc pas exacte.");

            // CONTRÔLE : sans lui, une conversion qui ne changerait RIEN passerait le test du dessus
            // dès lors que les deux espaces coïncideraient.
            Assert.Greater(pireMoyenne * 255f, 4f,
                $"CONTRÔLE EN ÉCHEC : la méthode par opacité moyennée s'écarte au pire de " +
                $"{pireMoyenne * 255f:F2}/255, c'est-à-dire qu'elle est aussi bonne que l'exacte. " +
                "Les deux ne se distinguent alors pas, et l'assertion précédente ne prouve rien.");
        }
    }
}
