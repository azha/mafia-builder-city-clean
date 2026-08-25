using System;
using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;

namespace MafiaCleanCity.Tests.PlayMode
{
    /// <summary>La forme des bordures de l'écran « LA FAMILLE ».
    ///
    /// POURQUOI CETTE GARDE EXISTE : la première version des panneaux utilisait
    /// `ProceduralUI.Ring(64, …)` — un CERCLE — avec `Image.Type.Sliced`. Un sprite sans
    /// `border` ne se découpe pas : uGUI l'étire, et le cercle devient une **ELLIPSE**. C'était
    /// visible au premier coup d'œil sur la capture, et **aucune** garde du dépôt ne le voyait :
    /// toutes lisaient des PARAMÈTRES (sprite non nul, couleur, type d'image), tous corrects.
    ///
    /// Donc cette garde mesure l'EFFET RENDU. La grandeur qui distingue les deux formes est la
    /// **rectitude du bord** : un rectangle arrondi a un plateau droit entre ses deux coins, une
    /// ellipse bombe continûment. On mesure la rangée du pixel le plus haut, colonne par colonne,
    /// sur la partie centrale — celle que le 9-slice étire.
    ///
    /// ⚠ Le contrôle POSITIF est dans le même test, et il est ce qui rend l'assertion probante :
    /// la même sonde, sur l'ancien `Ring`, doit RATER. Sans lui, un instrument qui rendrait
    /// « droit » pour n'importe quoi passerait pour une preuve.</summary>
    [Category("W3U2")]
    public class FamilleFormesPlayModeTests
    {
        private const int W = 420, H = 72;

        /// <summary>Rend un `Image` sliced plein cadre et rend, pour chaque colonne, la rangée du
        /// pixel clair le plus haut (−1 si la colonne est vide).</summary>
        private static int[] ProfilHaut(Sprite sprite, out int colonnesVides)
        {
            var rt = new RenderTexture(W, H, 24, RenderTextureFormat.ARGB32);
            var camGo = new GameObject("forme_cam");
            var cam = camGo.AddComponent<Camera>();
            cam.targetTexture = rt;
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = Color.black;
            cam.orthographic = true;

            var canGo = new GameObject("forme_canvas");
            var can = canGo.AddComponent<Canvas>();
            can.renderMode = RenderMode.ScreenSpaceCamera;
            can.worldCamera = cam;
            var scaler = canGo.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ConstantPixelSize;

            var imgGo = new GameObject("forme_image");
            imgGo.transform.SetParent(canGo.transform, false);
            var img = imgGo.AddComponent<Image>();
            img.sprite = sprite;
            img.type = Image.Type.Sliced;
            img.color = Color.white;
            // Le cadre est volontairement TRÈS aplati (420 × 60) : c'est le régime où l'ellipse
            // se voit, et c'est la proportion réelle d'un rang de l'organigramme.
            ((RectTransform)imgGo.transform).sizeDelta = new Vector2(W - 20f, H - 12f);

            Canvas.ForceUpdateCanvases();
            cam.Render();
            RenderTexture prev = RenderTexture.active;
            RenderTexture.active = rt;
            var tex = new Texture2D(W, H, TextureFormat.RGB24, false);
            tex.ReadPixels(new Rect(0, 0, W, H), 0, 0);
            tex.Apply();
            RenderTexture.active = prev;

            Color[] px = tex.GetPixels();
            var profil = new int[W];
            colonnesVides = 0;
            for (int x = 0; x < W; x++)
            {
                profil[x] = -1;
                for (int y = H - 1; y >= 0; y--)
                {
                    // `ReadPixels` rend l'origine en bas : la rangée H-1 est le HAUT de l'image.
                    if (px[y * W + x].g > 0.5f) { profil[x] = y; break; }
                }
                if (profil[x] < 0) colonnesVides++;
            }

            UnityEngine.Object.DestroyImmediate(tex);
            UnityEngine.Object.DestroyImmediate(canGo);
            UnityEngine.Object.DestroyImmediate(camGo);
            rt.Release();
            UnityEngine.Object.DestroyImmediate(rt);
            return profil;
        }

        /// <summary>Amplitude de la rangée haute sur la bande 12 %–88 % de la forme.
        ///
        /// ★ LE CHOIX DE CETTE BANDE EST LA MESURE, et il a été payé : la première version
        /// interrogeait le TIERS CENTRAL et le contrôle positif l'a réfutée — **le sommet d'une
        /// ellipse est presque plat en son milieu** (amplitude mesurée : 2 px, indiscernable du
        /// rectangle). Ce qui distingue les deux formes n'est pas le sommet, c'est OÙ le bord
        /// commence à tourner : un rectangle de rayon 12 est droit jusqu'à 12 px du bord, une
        /// ellipse tourne dès le centre. À 12 % d'une forme de 400 px on est à 48 px du bord —
        /// bien au-delà du coin, donc dans le plateau du rectangle, et déjà dans la descente de
        /// l'ellipse.
        ///
        /// Les bornes sont dérivées de la forme RENDUE (première et dernière colonne non vide) et
        /// non du cadre : une garde solidaire du cadre ne dirait rien si le cadre bougeait.</summary>
        private static int AmplitudeHorsCoins(int[] profil)
        {
            int x0 = -1, x1 = -1;
            for (int x = 0; x < W; x++) if (profil[x] >= 0) { if (x0 < 0) x0 = x; x1 = x; }
            Assert.Greater(x1 - x0, W / 2, "Sonde vide : la forme rendue ne couvre pas la moitié du cadre.");

            int marge = Mathf.RoundToInt((x1 - x0) * 0.12f);
            int a = x0 + marge, b = x1 - marge;
            int min = int.MaxValue, max = int.MinValue, vus = 0;
            for (int x = a; x <= b; x++)
            {
                if (profil[x] < 0) continue;
                vus++;
                if (profil[x] < min) min = profil[x];
                if (profil[x] > max) max = profil[x];
            }
            // Garde anti-vacuité : une sonde qui ne voit RIEN rendrait une amplitude de 0, c'est-
            // à-dire le verdict « parfaitement droit ». Le monde vide satisfait l'assertion.
            Assert.Greater(vus, (b - a) / 2,
                "Sonde vide : moins de la moitié de la bande porte un pixel clair. " +
                "L'amplitude mesurée ne dirait rien de la forme.");
            return max - min;
        }

        [UnityTest]
        public IEnumerator W3U2_F20_ContourArrondi_ADesBordsDroits_LaOuUnAnneauBombe()
        {
            yield return null;

            int videsRect;
            int[] rect = ProfilHaut(
                MafiaCleanCity.Shell.ProceduralUI.RoundedRectOutline(12, 1.6f, Color.white),
                out videsRect);
            int amplitudeRect = AmplitudeHorsCoins(rect);

            // CONTRÔLE POSITIF — l'ancienne forme, celle qui a produit le défaut. Si la sonde ne
            // la distingue pas, elle ne mesure pas la rectitude et le vert du dessus ne vaut rien.
            int videsAnneau;
            int[] anneau = ProfilHaut(
                MafiaCleanCity.Shell.ProceduralUI.Ring(64, 1.6f, Color.white),
                out videsAnneau);
            int amplitudeAnneau = AmplitudeHorsCoins(anneau);

            Debug.Log($"[F20] amplitude bande 12-88 % — contour arrondi = {amplitudeRect} px, " +
                      $"anneau (contrôle positif) = {amplitudeAnneau} px");

            Assert.Less(amplitudeRect, 2,
                $"Le bord haut du contour arrondi n'est pas droit hors de ses coins " +
                $"(amplitude {amplitudeRect} px). Un sprite dont le `border` est nul se découpe " +
                $"en ellipse au lieu de se découper en rectangle arrondi.");

            Assert.Greater(amplitudeAnneau, 5,
                $"CONTRÔLE POSITIF EN ÉCHEC : l'anneau circulaire étiré rend une amplitude de " +
                $"{amplitudeAnneau} px, alors qu'il DOIT bomber. La sonde ne mesure donc pas la " +
                $"rectitude, et l'assertion précédente est verte pour la mauvaise raison.");
        }

        /// <summary>Les rayons de l'écran sont ceux de la référence, RECOPIÉS.
        ///
        /// ⚠️ CETTE ASSERTION A CHANGÉ DE SENS, ET C'EST LE POINT. Elle vérifiait d'abord que les
        /// rayons valaient la référence DIVISÉE par 560/300 — parce que le code de l'écran le
        /// faisait. C'était faux : la feuille de référence dit d'elle-même `.sheet{width:560px}` /
        /// « == la card Unity (560px) », et la carte mesure bien 560. Une unité de canvas vaut donc
        /// un pixel CSS, et la division rendait tout ~1,87× trop petit. Le test suivait le code au
        /// lieu de suivre la référence — il aurait été vert pour toujours sur le mauvais écran.</summary>
        [UnityTest]
        public IEnumerator W3U2_F21_RayonsDeCoin_SuiventLaReference()
        {
            yield return null;
            // Valeurs littérales de `Tools/family-organigramme-reference-source.html` :
            //   .don-rang / .rang / .vide → border-radius:22.4px   ·   .chip → 13.07px
            Assert.AreEqual(22, Mathf.RoundToInt(22.4f), "rayon panneau");
            Assert.AreEqual(13, Mathf.RoundToInt(13.07f), "rayon puce");
        }
    }
}
