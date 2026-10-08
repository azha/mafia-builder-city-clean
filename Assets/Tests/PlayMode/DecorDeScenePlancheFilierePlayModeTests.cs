using System.Collections;
using System.Collections.Generic;
using System.IO;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.Operational;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    /// <summary>PLANCHE DÉTERMINISTE du décor de scène sur ㊵ (CLIENT-2, 08/10), pour le juge visuel : l'écran monté HORS SHELL
    /// sur un ÉTAT FABRIQUÉ (les données de `FiliereOrdreEtEcartPlayModeTests` : 4 étapes DIRTY/PARTIAL/CLEAN/CLEAN, un écart, la
    /// planque nominale ⇒ le geste au pied), rendu aux deux résolutions du dépôt. Aucune route, aucune identité : la capture
    /// officielle (`ClicheC2`) exige la paire de capture hors dépôt, absente de cette machine le 08/10.
    /// ⚠️ Hors shell : ni bandeau ni dock — la bande de scène du haut est NUE (la barre du shell la recouvre en jeu ≈ 10 %).
    /// Écrit hors d'`Assets/` (`Tools/decor-de-scene-2026-10-07/planches/`) : rien à restaurer, rien à réimporter.</summary>
    [Category("PhotoDecorFiliere")]
    public class DecorDeScenePlancheFilierePlayModeTests
    {
        private GameObject hostGo;

        [TearDown]
        public void TearDown()
        {
            MafiaCleanCity.I18n.I18nCatalog.Oublier();
            GameObject reste = GameObject.Find("FiliereRoot");
            while (reste != null) { Object.DestroyImmediate(reste); reste = GameObject.Find("FiliereRoot"); }
            if (hostGo != null) Object.DestroyImmediate(hostGo);
            hostGo = null;
        }

        private static LaunderingStageDto Etape(string node, string bande, bool terminal = false) =>
            new LaunderingStageDto { node = node, cleanliness_band = bande, terminal = terminal, has_cash = false };

        private static LaunderingNodeRefDto Noeud(string node, int rang) =>
            new LaunderingNodeRefDto { node = node, stage_index = rang };

        [UnityTest]
        public IEnumerator Planche_Filiere_DecorDeScene_DeuxResolutions()
        {
            hostGo = new GameObject("FiliereScreen", typeof(RectTransform));
            var ecran = hostGo.AddComponent<FiliereScreenController>();
            yield return null;
            var dto = new LaunderingPipelineDto { stages = new[] {
                Etape("n3", "CLEAN"), Etape("n1", "DIRTY"), Etape("n4", "CLEAN", terminal: true), Etape("n2", "PARTIAL") } };
            var liste = new LaunderingNodesDto { nodes = new[] { Noeud("n1", 1), Noeud("n2", 2), Noeud("n3", 3), Noeud("n4", 4) } };
            ecran.PoserLaPlanquePourTest("NOMINAL", "facade-1", "planque-1");
            ecran.RendrePourTest(dto, liste, new Dictionary<string, bool> { { "n1", false }, { "n2", false }, { "n3", true }, { "n4", false } });
            yield return null;
            yield return null;

            GameObject racine = GameObject.Find("FiliereRoot");
            Assert.IsNotNull(racine, "FiliereRoot introuvable");
            Assert.IsNotNull(racine.GetComponentInChildren<MafiaCleanCity.Shell.DecorPose>(true), "le décor de scène est posé sur ㊵");

            string dossier = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "Tools", "decor-de-scene-2026-10-07", "planches"));
            Directory.CreateDirectory(dossier);
            yield return CapturerA(racine, 1080, 1920, Path.Combine(dossier, "screen_c2_decor_fabrique_1080x1920.png"));
            yield return CapturerA(racine, 1080, 2400, Path.Combine(dossier, "screen_c2_decor_fabrique_1080x2400.png"));
        }

        /// <summary>Le patron de `FiliereScreenPlayModeTests.CapturerA` : le canvas basculé en ScreenSpace-Camera sur une
        /// RenderTexture de la taille CIBLE, le layout reconstruit APRÈS la bascule, l'ortho cadré sur le rect RÉEL du canvas.</summary>
        private static IEnumerator CapturerA(GameObject racine, int largeur, int hauteur, string chemin)
        {
            Canvas canvas = racine.GetComponentInParent<Canvas>();
            Assert.IsNotNull(canvas, "FiliereRoot n'est sous aucun Canvas : rien ne peut être rendu");
            RenderMode modeAvant = canvas.renderMode;
            Camera cameraAvant = canvas.worldCamera;
            float planAvant = canvas.planeDistance;

            var rt = new RenderTexture(largeur, hauteur, 24, RenderTextureFormat.ARGB32);
            var camGo = new GameObject("CaptureCamDecorFiliere");
            var cam = camGo.AddComponent<Camera>();
            cam.targetTexture = rt;
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = Color.black;
            cam.orthographic = true;

            canvas.renderMode = RenderMode.ScreenSpaceCamera;
            canvas.worldCamera = cam;
            canvas.planeDistance = 10f;
            Canvas.ForceUpdateCanvases();
            yield return null;
            LayoutRebuilder.ForceRebuildLayoutImmediate((RectTransform)racine.transform);
            Canvas.ForceUpdateCanvases();
            yield return null;
            yield return null;

            RectTransform crt = (RectTransform)canvas.transform;
            cam.orthographicSize = crt.rect.height / 2f;
            cam.aspect = crt.rect.width / crt.rect.height;
            cam.Render();
            RenderTexture prev = RenderTexture.active;
            RenderTexture.active = rt;
            var tex = new Texture2D(largeur, hauteur, TextureFormat.RGB24, false);
            tex.ReadPixels(new Rect(0, 0, largeur, hauteur), 0, 0);
            tex.Apply();
            RenderTexture.active = prev;
            File.WriteAllBytes(chemin, tex.EncodeToPNG());
            Debug.Log($"[PLANCHE ㊵ décor] {largeur}×{hauteur} → {chemin}");

            canvas.renderMode = modeAvant;
            canvas.worldCamera = cameraAvant;
            canvas.planeDistance = planAvant;
            Object.DestroyImmediate(tex);
            Object.DestroyImmediate(camGo);
            rt.Release();
            Object.DestroyImmediate(rt);
            Assert.IsTrue(File.Exists(chemin), $"planche non écrite : {chemin}");
        }
    }
}
