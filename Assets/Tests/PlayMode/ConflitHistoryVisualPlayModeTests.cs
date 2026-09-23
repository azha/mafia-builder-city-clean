using System.Collections;
using System.IO;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    /// <summary>Capture déterministe du cadre 63 : l'historique d'une famille est visible sans inventer
    /// de rang tant que `strike_index` n'est pas servi par le back.</summary>
    [Category("PhotoConflitHistorique")]
    public class ConflitHistoryVisualPlayModeTests
    {
        private GameObject host;

        [TearDown]
        public void TearDown()
        {
            GameObject racine = GameObject.Find("ConflitRoot");
            while (racine != null) { Object.DestroyImmediate(racine); racine = GameObject.Find("ConflitRoot"); }
            if (host != null) Object.DestroyImmediate(host);
            MafiaCleanCity.I18n.I18nCatalog.Oublier();
        }

        [UnityTest]
        public IEnumerator Capture_HistoriqueSansRang_Deterministe()
        {
            host = new GameObject("ConflitHistoryVisualProbe", typeof(RectTransform));
            ConflitScreenController ecran = host.AddComponent<ConflitScreenController>();
            ecran.RendrePourTest(
                new GetLieutenantsResponseDto
                {
                    lieutenants = new[]
                    {
                        new LieutenantRowDto
                        {
                            lieutenant_id = "lt-kest", name = "Lt. Kest", archetype = "MUSCLE",
                            op_state_band = "IDLE", rule_count_band = "NONE", tenure_bucket = "FRESH",
                        },
                    },
                },
                new GetEngagementsResponseDto
                {
                    engagements = new[]
                    {
                        Envoi("r4", "contested", "low", "medium", "Lt. Kest"),
                        Envoi("r3", "hold", "low", "medium", null),
                        Envoi("r2", "advance", "medium", "medium", null),
                        Envoi("r1", "breakthrough", "high", "medium", null),
                    },
                });
            yield return null;

            GameObject racine = GameObject.Find("ConflitRoot");
            Assert.IsNotNull(racine);
            Assert.AreEqual(4, CompterNoms(racine.transform, "Historique_r"));
            foreach (string texte in ecran.RenderedTexts)
                StringAssert.DoesNotContain("Coup n°", texte);

            Canvas canvas = racine.GetComponentInParent<Canvas>();
            RenderMode modeAvant = canvas.renderMode;
            Camera cameraAvant = canvas.worldCamera;
            float planAvant = canvas.planeDistance;
            var rt = new RenderTexture(1080, 2400, 24, RenderTextureFormat.ARGB32);
            var camGo = new GameObject("CaptureCamConflitHistorique");
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
            var tex = new Texture2D(1080, 2400, TextureFormat.RGB24, false);
            tex.ReadPixels(new Rect(0, 0, 1080, 2400), 0, 0);
            tex.Apply();
            RenderTexture.active = precedent;
            const string chemin = "Assets/Screenshots/conflit_historique_sans_rang_deterministe.png";
            File.WriteAllBytes(chemin, tex.EncodeToPNG());
            MafiaCleanCity.Shell.Tests.CaptureSousShell.PlancherDEncre(tex, chemin);

            canvas.renderMode = modeAvant;
            canvas.worldCamera = cameraAvant;
            canvas.planeDistance = planAvant;
            Object.DestroyImmediate(tex);
            cam.targetTexture = null;
            rt.Release();
            Object.DestroyImmediate(rt);
            Object.DestroyImmediate(camGo);
        }

        private static EngagementDto Envoi(string id, string issue, string cout, string chaleur, string lieutenant)
        {
            return new EngagementDto
            {
                engagement_id = id,
                target_rival_key = "tarcum",
                target_rival_name_i18n = new RivalNomI18nDto
                {
                    key = "game.fiction.rival.name",
                    @params = new RivalNomParamsDto { nom = "Tarcum" },
                },
                status = "resolved",
                outcome_bucket = issue,
                friction_consumed_bucket = cout,
                heat_increment_bucket = chaleur,
                lieutenant = lieutenant == null ? null : new EngagementLieutenantDto { id = "lt-kest", name = lieutenant },
            };
        }

        private static int CompterNoms(Transform racine, string prefixe)
        {
            int n = 0;
            foreach (Transform t in racine.GetComponentsInChildren<Transform>(true))
                if (t.name.StartsWith(prefixe)) n++;
            return n;
        }
    }
}
