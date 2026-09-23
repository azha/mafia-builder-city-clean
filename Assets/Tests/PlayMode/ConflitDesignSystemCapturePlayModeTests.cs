using System.Collections;
using System.IO;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.Shell;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    /// <summary>Preuve visuelle déterministe de ㉙ DANS le vrai AppShell. Elle ne prétend pas
    /// prouver les valeurs du compte de capture : les DTO sont fabriqués pour rendre l'état nominal
    /// comparable au cadre #59. Elle prouve en revanche le chrome, les insets, le dock, l'échelle et
    /// la composition du locataire aux deux hauteurs téléphone demandées par le juge visuel.</summary>
    [Category("PhotoConflitSousShellDeterministe")]
    public class ConflitDesignSystemCapturePlayModeTests
    {
        [TearDown]
        public void TearDown()
        {
            foreach (AppShell shell in Object.FindObjectsByType<AppShell>(FindObjectsSortMode.None))
                Object.DestroyImmediate(shell.gameObject);
            foreach (Canvas canvas in Object.FindObjectsByType<Canvas>(FindObjectsSortMode.None))
                Object.DestroyImmediate(canvas.gameObject);
            foreach (Camera camera in Object.FindObjectsByType<Camera>(FindObjectsSortMode.None))
                if (camera != null) Object.DestroyImmediate(camera.gameObject);
            MafiaCleanCity.I18n.I18nCatalog.Oublier();
            LogAssert.ignoreFailingMessages = false;
        }

        [UnityTest]
        public IEnumerator Capture_EtatNominal_SousLeVraiShell_DeuxResolutions()
        {
            LogAssert.ignoreFailingMessages = true;
            yield return Capturer(1080, 1920);
            yield return Capturer(1080, 2400);
        }

        private static IEnumerator Capturer(int largeur, int hauteur)
        {
            string chemin = $"Assets/Screenshots/planche_le_conflit_design_system_{largeur}x{hauteur}.png";
            var rt = new RenderTexture(largeur, hauteur, 24, RenderTextureFormat.ARGB32);
            var camGo = new GameObject($"CaptureConflitShellCam_{hauteur}");
            Camera cam = camGo.AddComponent<Camera>();
            cam.targetTexture = rt;
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = Color.black;
            cam.orthographic = true;

            var canvasGo = new GameObject($"CanvasConflitShell_{hauteur}",
                typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            Canvas canvas = canvasGo.GetComponent<Canvas>();
            CanvasScaler scaler = canvasGo.GetComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1280f, 720f);
            canvas.renderMode = RenderMode.ScreenSpaceCamera;
            canvas.worldCamera = cam;
            canvas.planeDistance = 10f;
            Canvas.ForceUpdateCanvases();
            yield return null;

            var shellGo = new GameObject($"AppShellConflit_{hauteur}");
            AppShell shell = shellGo.AddComponent<AppShell>();
            yield return null;
            shell.StopAllCoroutines();
            Assert.AreSame(canvas, shell.ShellCanvas, "le locataire doit être dans le canvas capturé");
            Assert.IsNotNull(shell.ContentSlot);
            Assert.IsNotNull(shell.TopBar);

            ConflitScreenController ecran = shell.MonterLocataireEnSurimpression<ConflitScreenController>();
            Assert.IsNotNull(ecran);
            ecran.RendrePourTest(
                new GetLieutenantsResponseDto { lieutenants = new[] { LieutenantKest() } },
                new GetEngagementsResponseDto { engagements = new EngagementDto[0] });
            ecran.ChoisirLieutenant("lt-kest");
            ecran.ChoisirAxe("infrastructure");
            ecran.ChoisirFamille("coil");
            yield return null;

            // Une image = un locataire. Le chrome reste, les panneaux d'accueil sous-jacents non.
            for (int i = 0; i < shell.ContentSlot.childCount; i++)
            {
                Transform enfant = shell.ContentSlot.GetChild(i);
                if (enfant == ecran.transform) continue;
                enfant.gameObject.SetActive(false);
            }

            shell.RebatirChromePourResolutionCourante();
            Canvas.ForceUpdateCanvases();
            yield return null;
            LayoutRebuilder.ForceRebuildLayoutImmediate((RectTransform)canvas.transform);
            Canvas.ForceUpdateCanvases();
            yield return null;

            RectTransform crt = (RectTransform)canvas.transform;
            cam.orthographicSize = crt.rect.height / 2f;
            cam.aspect = crt.rect.width / crt.rect.height;
            cam.Render();

            RenderTexture precedent = RenderTexture.active;
            RenderTexture.active = rt;
            var tex = new Texture2D(largeur, hauteur, TextureFormat.RGB24, false);
            tex.ReadPixels(new Rect(0, 0, largeur, hauteur), 0, 0);
            tex.Apply();
            RenderTexture.active = precedent;
            File.WriteAllBytes(chemin, tex.EncodeToPNG());
            MafiaCleanCity.Shell.Tests.CaptureSousShell.PlancherDEncre(tex, chemin);
            Assert.IsNotNull(GameObject.Find("OrdreChoisi"), "la capture nominale doit montrer la serviette choisie");
            Assert.IsNotNull(GameObject.Find("CeSoirCadre"), "la famille visée doit porter son tag bordé");
            Debug.Log($"[CAPTURE-CONFLIT-DESIGN-SYSTEM] {chemin} {largeur}x{hauteur} " +
                      $"canvas={crt.rect.width:F0}x{crt.rect.height:F0}");

            // À 1920 px, la maquette est volontairement plus haute que la fenêtre utile : une
            // seconde preuve au bas du ScrollRect montre que Saltline ET le geste restent
            // atteignables, sans rien dessiner sur le dock.
            if (hauteur == 1920)
            {
                ScrollRect defilement = ecran.GetComponentInChildren<ScrollRect>(true);
                Assert.IsNotNull(defilement);
                defilement.verticalNormalizedPosition = 0f;
                Canvas.ForceUpdateCanvases();
                yield return null;
                cam.Render();
                RenderTexture.active = rt;
                tex.ReadPixels(new Rect(0, 0, largeur, hauteur), 0, 0);
                tex.Apply();
                RenderTexture.active = precedent;
                string cheminBas = $"Assets/Screenshots/planche_le_conflit_design_system_{largeur}x{hauteur}_bas.png";
                File.WriteAllBytes(cheminBas, tex.EncodeToPNG());
                MafiaCleanCity.Shell.Tests.CaptureSousShell.PlancherDEncre(tex, cheminBas);
                Debug.Log($"[CAPTURE-CONFLIT-DESIGN-SYSTEM-BAS] {cheminBas} {largeur}x{hauteur}");
            }

            Object.DestroyImmediate(tex);
            cam.targetTexture = null;
            rt.Release();
            Object.DestroyImmediate(rt);
            Object.DestroyImmediate(shellGo);
            Object.DestroyImmediate(canvasGo);
            Object.DestroyImmediate(camGo);
            yield return null;
        }

        private static LieutenantRowDto LieutenantKest() => new LieutenantRowDto
        {
            lieutenant_id = "lt-kest",
            name = "Lt. Kest",
            archetype = "MUSCLE",
            op_state_band = "IDLE",
            rule_count_band = "NONE",
            tenure_bucket = "FRESH",
        };
    }
}
