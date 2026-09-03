using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.CityMap;

namespace MafiaCleanCity.Shell.Tests
{
    /// <summary>La ville peinte de l'écran ③ (TD-494, 2026-09-03).
    /// (1) STRUCTURE — la peinture est montée (pas le repli en colonnes), importée 1:1 (le .meta à
    ///     4096 : à 2048 Unity ramènerait 2100×3640 à 1181×2048 sans un mot), 18 marqueurs, 0 district
    ///     sans ancre, aucune paire de marqueurs à moins de 40 px (la garde des fonds de district), et
    ///     un contrôle POSITIF de placement (le port est en haut, la Verge en bas à droite).
    /// (2) CAPTURE sous chrome 1080×2400 — ce qui rendrait l'image mensongère : le locataire entré,
    ///     la peinture montée, 18 marqueurs, aucun occultant nommé (les parties propres exclues),
    ///     pas un fond uni.</summary>
    [Category("CarteVille")]
    public class CarteVillePlayModeTests
    {
        private GameObject controllerGo;
        private string sceneDeDemarrage;

        [TearDown]
        public void TearDown()
        {
            if (controllerGo != null) Object.Destroy(controllerGo);
        }

        [UnityTest]
        public IEnumerator CarteVille_MontePeintureEt18MarqueursSurAncres()
        {
            controllerGo = new GameObject("CityMapController");
            CityMapController c = controllerGo.AddComponent<CityMapController>();
            float t = 0f;
            while (!c.IsLoaded && c.LastError == null && t < 15f) { t += Time.deltaTime; yield return null; }
            Assert.IsTrue(c.IsLoaded, "le contrôleur n'a pas fini de charger : " + c.LastError);

            Assert.IsTrue(c.VillePeinteMontee,
                "la ville peinte n'est PAS montée — Resources/CityMap/carte_ville_nuit ou ancres_districts " +
                "manquent et l'écran est retombé sur la liste en colonnes, sans erreur");
            Assert.IsNotNull(c.VillePeinteSprite);
            Assert.AreEqual(2100f, c.VillePeinteSprite.rect.width, 0.5f,
                "import NON 1:1 — le .meta doit porter maxTextureSize 4096 (à 2048, Unity redimensionne en silence)");
            Assert.AreEqual(3640f, c.VillePeinteSprite.rect.height, 0.5f, "import NON 1:1 (hauteur)");

            Assert.AreEqual(18, c.Cells.Count, "18 marqueurs attendus, un par district servi");
            Assert.IsEmpty(c.DistrictsSansAncre,
                "districts SANS ancre (posés au centre) : [" + string.Join(", ", c.DistrictsSansAncre) + "]");

            Canvas.ForceUpdateCanvases();
            yield return null;
            RectTransform peinture = c.VillePeinteRect;
            Assert.IsNotNull(peinture);
            Canvas canvas = peinture.GetComponentInParent<Canvas>().rootCanvas;
            float w = peinture.rect.width, h = peinture.rect.height;
            Assert.Greater(w, 100f, "le rect de la peinture est vide — l'AspectRatioFitter n'a pas agi");

            // Positions LOCALES dans le rect de la peinture, depuis les ancres (fractions), en unités
            // canvas ; converties en px de capture par le scaleFactor du canvas.
            var pos = new Dictionary<string, Vector2>();
            foreach (DistrictCellView cell in c.Cells)
            {
                RectTransform rt = (RectTransform)cell.transform;
                Assert.AreEqual(rt.anchorMin, rt.anchorMax, "un marqueur doit être ancré en un POINT (fraction)");
                Assert.IsTrue(rt.anchorMin.x > 0f && rt.anchorMin.x < 1f && rt.anchorMin.y > 0f && rt.anchorMin.y < 1f,
                    $"{cell.Model.name_canonical} ancré hors de la peinture : {rt.anchorMin}");
                pos[cell.Model.name_canonical.ToUpperInvariant()] = new Vector2(rt.anchorMin.x * w, rt.anchorMin.y * h);
            }
            float sf = canvas.scaleFactor > 0f ? canvas.scaleFactor : 1f;
            int paires = 0; float pire = float.MaxValue; string pireCouple = "";
            var noms = new List<string>(pos.Keys);
            for (int i = 0; i < noms.Count; i++)
                for (int j = i + 1; j < noms.Count; j++)
                {
                    float d = Vector2.Distance(pos[noms[i]], pos[noms[j]]) * sf;
                    paires++;
                    if (d < pire) { pire = d; pireCouple = noms[i] + " ↔ " + noms[j]; }
                }
            Assert.AreEqual(153, paires, "anti-vacuité : 18 marqueurs ⇒ 153 paires");
            Assert.GreaterOrEqual(pire, 40f,
                $"deux marqueurs à {pire:F1} px ({pireCouple}) : indiscernables — la garde des fonds de district");

            // Contrôle POSITIF de placement (la géographie de la maquette) : le port en haut,
            // la Verge en bas ; Verge-A à droite de Lattice-C. Un fichier d'ancres mélangé — ou
            // un axe Y inversé — rougit ici, pas dans la distance.
            Assert.Greater(pos["TIDEWATER-1"].y, pos["VERGE-A"].y, "Tidewater-1 (le port) doit être AU-DESSUS de Verge-A");
            Assert.Greater(pos["VERGE-A"].x, pos["LATTICE-C"].x, "Verge-A doit être À DROITE de Lattice-C");
        }

        [UnityTest]
        public IEnumerator Capture_CarteVille_1080x2400()
        {
            const int Largeur = 1080, Hauteur = 2400;
            const string Chemin = "Assets/Screenshots/carte_ville_1080x2400.png";
            LogAssert.ignoreFailingMessages = true;

            Assert.GreaterOrEqual(SceneManager.sceneCountInBuildSettings, 1, "aucune scène dans les Build Settings");
            sceneDeDemarrage = SceneUtility.GetScenePathByBuildIndex(0);
            AsyncOperation chargement = SceneManager.LoadSceneAsync(sceneDeDemarrage, LoadSceneMode.Single);
            while (chargement != null && !chargement.isDone) yield return null;
            yield return null;

            AppShell shell = null;
            foreach (GameObject racine in SceneManager.GetActiveScene().GetRootGameObjects())
            {
                shell = racine.GetComponentInChildren<AppShell>(true);
                if (shell != null) break;
            }
            Assert.IsNotNull(shell, "aucun AppShell dans la scène de démarrage du build");

            float attente = 0f;
            while (shell.CurrentTab != AppShell.Tab.Empire && attente < 25f) { attente += Time.deltaTime; yield return null; }
            Assert.AreEqual(AppShell.Tab.Empire, shell.CurrentTab, "acquisition de session non résolue");
            // ContentSlot STABLE avant de remonter l'Empire (la fenêtre d'acquisition, cf. FamilleCapture)
            {
                int stable = 0, dernier = -1; float ts = 0f;
                while (stable < 10 && ts < 10f)
                {
                    int n = shell.ContentSlot.childCount;
                    stable = (n == dernier) ? stable + 1 : 0; dernier = n;
                    ts += Time.deltaTime; yield return null;
                }
            }
            // L'Accueil est posé en surimpression au-dessus de l'Empire après l'acquisition : on
            // RE-ACTIVE l'Empire pour un montage propre, sans surimpression au-dessus de la carte.
            shell.ActivateTab(AppShell.Tab.Empire);
            CityMapController carte = null;
            float montage = 0f;
            while (montage < 15f && carte == null)
            {
                carte = shell.ContentSlot.GetComponentInChildren<CityMapController>(false);
                montage += Time.deltaTime; yield return null;
            }
            Assert.IsNotNull(carte, "CityMapController non monté sous l'onglet Empire");
            float charge = 0f;
            while (charge < 20f && !carte.IsLoaded && carte.LastError == null) { charge += Time.deltaTime; yield return null; }
            Assert.IsTrue(carte.IsLoaded, "la carte n'a pas chargé : " + carte.LastError);
            Assert.IsTrue(carte.VillePeinteMontee, "la peinture n'est pas montée sous le shell — la capture montrerait la liste en colonnes");
            Assert.AreEqual(18, carte.Cells.Count);
            Canvas.ForceUpdateCanvases();
            yield return null;
            yield return null;

            // Fratrie NOMMÉE : les parties propres de cet écran (CityMapRoot, DetailPanel) vivent sous
            // ContentSlot en frères de leur hôte nu — tout AUTRE frère d'après est un occultant.
            Transform parent = carte.transform.parent;
            var occultants = new List<string>();
            for (int k = carte.transform.GetSiblingIndex() + 1; k < parent.childCount; k++)
            {
                Transform f = parent.GetChild(k);
                if (!f.gameObject.activeInHierarchy) continue;
                if (f.name == "CityMapRoot" || f.name == "DetailPanel") continue;
                occultants.Add(f.name);
            }
            Assert.IsEmpty(occultants, "la carte se fait recouvrir par : [" + string.Join(", ", occultants) + "]");

            Canvas canvas = carte.VillePeinteRect.GetComponentInParent<Canvas>().rootCanvas;
            RenderMode modePrecedent = canvas.renderMode;
            Camera cameraPrecedente = canvas.worldCamera;
            float planPrecedent = canvas.planeDistance;
            GameObject camGo = new GameObject("CaptureCarteCam");
            Camera cam = camGo.AddComponent<Camera>();
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = Color.black;
            cam.orthographic = true;
            var rtex = new RenderTexture(Largeur, Hauteur, 24, RenderTextureFormat.ARGB32);
            cam.targetTexture = rtex;
            canvas.renderMode = RenderMode.ScreenSpaceCamera;
            canvas.worldCamera = cam;
            canvas.planeDistance = 10f;
            Canvas.ForceUpdateCanvases();
            yield return null;
            RectTransform crt = (RectTransform)canvas.transform;
            cam.orthographicSize = crt.rect.height / 2f;
            cam.aspect = crt.rect.width / crt.rect.height;
            Debug.Log($"[CAPTURE diag] canvas.rect={crt.rect.width:F0}x{crt.rect.height:F0} peinture.rect=" +
                      $"{carte.VillePeinteRect.rect.width:F0}x{carte.VillePeinteRect.rect.height:F0} " +
                      $"insets top={ShellChrome.TopInsetPx:F0} bottom={ShellChrome.BottomInsetPx:F0}");
            cam.Render();
            RenderTexture prev = RenderTexture.active;
            RenderTexture.active = rtex;
            var tex = new Texture2D(Largeur, Hauteur, TextureFormat.RGB24, false);
            tex.ReadPixels(new Rect(0, 0, Largeur, Hauteur), 0, 0);
            tex.Apply();
            RenderTexture.active = prev;
            canvas.renderMode = modePrecedent;
            canvas.worldCamera = cameraPrecedente;
            canvas.planeDistance = planPrecedent;
            System.IO.File.WriteAllBytes(Chemin, tex.EncodeToPNG());

            var teintes = new HashSet<int>();
            foreach (Color px in tex.GetPixels())
                teintes.Add((Mathf.RoundToInt(px.r * 31) << 10) | (Mathf.RoundToInt(px.g * 31) << 5) | Mathf.RoundToInt(px.b * 31));
            Debug.Log($"[CAPTURE] {Chemin} {Largeur}x{Hauteur} — {teintes.Count} teintes distinctes · marqueurs={carte.Cells.Count}");
            Assert.Greater(teintes.Count, 40, $"{Chemin} ne porte que {teintes.Count} teintes — un fond, pas une ville peinte");
            Object.Destroy(camGo);
            Object.Destroy(tex);
            rtex.Release();
        }
    }
}
