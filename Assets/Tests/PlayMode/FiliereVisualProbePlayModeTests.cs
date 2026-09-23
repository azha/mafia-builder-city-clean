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
    [Category("PhotoFiliereDeterministe")]
    public class FiliereVisualProbePlayModeTests
    {
        private GameObject host;

        [TearDown]
        public void TearDown()
        {
            GameObject racine = GameObject.Find("FiliereRoot");
            while (racine != null) { Object.DestroyImmediate(racine); racine = GameObject.Find("FiliereRoot"); }
            if (host != null) Object.DestroyImmediate(host);
            MafiaCleanCity.I18n.I18nCatalog.Oublier();
        }

        [UnityTest]
        public IEnumerator Capture_QuatreCuves_Deterministe()
        {
            host = new GameObject("FiliereVisualProbe", typeof(RectTransform));
            FiliereScreenController ecran = host.AddComponent<FiliereScreenController>();
            ecran.RendrePourTest(
                new LaunderingPipelineDto { stages = new[] {
                    new LaunderingStageDto { node = "n1", cleanliness_band = "DIRTY" },
                    new LaunderingStageDto { node = "n2", cleanliness_band = "PARTIAL", has_cash = true },
                    new LaunderingStageDto { node = "n3", cleanliness_band = "MOSTLY_CLEAN" },
                    new LaunderingStageDto { node = "n4", cleanliness_band = "CLEAN", terminal = true },
                } },
                new LaunderingNodesDto { nodes = new[] {
                    new LaunderingNodeRefDto { node = "n1", stage_index = 1 },
                    new LaunderingNodeRefDto { node = "n2", stage_index = 2 },
                    new LaunderingNodeRefDto { node = "n3", stage_index = 3 },
                    new LaunderingNodeRefDto { node = "n4", stage_index = 4 },
                } },
                new Dictionary<string, bool>());
            yield return null;

            GameObject racine = GameObject.Find("FiliereRoot");
            Assert.IsNotNull(racine);
            Canvas canvas = racine.GetComponentInParent<Canvas>();
            RenderMode modeAvant = canvas.renderMode;
            Camera cameraAvant = canvas.worldCamera;
            float planAvant = canvas.planeDistance;
            var rt = new RenderTexture(1080, 1920, 24, RenderTextureFormat.ARGB32);
            var camGo = new GameObject("CaptureCamFiliereDeterministe");
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
            RectTransform crt = (RectTransform)canvas.transform;
            cam.orthographicSize = crt.rect.height / 2f;
            cam.aspect = crt.rect.width / crt.rect.height;
            cam.Render();

            RenderTexture precedent = RenderTexture.active;
            RenderTexture.active = rt;
            var tex = new Texture2D(1080, 1920, TextureFormat.RGB24, false);
            tex.ReadPixels(new Rect(0, 0, 1080, 1920), 0, 0);
            tex.Apply();
            RenderTexture.active = precedent;
            const string chemin = "Assets/Screenshots/filiere_quatre_cuves_deterministe.png";
            File.WriteAllBytes(chemin, tex.EncodeToPNG());
            MafiaCleanCity.Shell.Tests.CaptureSousShell.PlancherDEncre(tex, chemin);

            canvas.renderMode = modeAvant;
            canvas.worldCamera = cameraAvant;
            canvas.planeDistance = planAvant;
            Object.DestroyImmediate(tex);
            cam.targetTexture = null;
            rt.Release(); Object.DestroyImmediate(rt); Object.DestroyImmediate(camGo);
        }
    }
}
