using System;
using System.Collections;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.TestTools;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Tests; // SeederSupport
using Debug = UnityEngine.Debug;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    // E2E (charter 27: NO MOCK). Drives the real PipelineOverviewController against the live
    // dockerized stack (Traefik @ http://localhost). It proves the Phase-2b MULTI-NODE laundering
    // pipeline (screen_6 overview) renders the ordered chain Stage1→2→3→4 with cleanliness bands
    // RISING along the chain + the last stage flagged terminal — matching the live
    // GET /v1/operational/laundering/:nodeId/pipeline response. It:
    //   1. (OneTimeSetUp) runs Tools/seed_operational_demo.mjs (via SeederSupport) and parses its
    //      stdout JSON to DISCOVER the demo creds + the head Stage-1 node_id of the multi-stage chain
    //      (ids change every run — never hard-coded);
    //   2. signs in via AuthClient → Bearer;
    //   3. loads the pipeline overview and asserts: ≥3 ordered stages, cleanliness bands RISING (the
    //      band rank is non-decreasing head→tail and STRICTLY rises at least once), the last stage
    //      flagged terminal — coherent with the live pipeline projection fetched independently;
    //   4. asserts NO raw scalar leaks client-side (only bands / strings / booleans).
    public class PipelineOverviewPlayModeTests
    {
        private const string BaseUrl = "http://localhost";

        private GameObject controllerGo;

        // Discovered from the seeder's stdout (OneTimeSetUp).
        private static string demoEmail;
        private static string demoPassword;
        private static string headNodeId; // the head Stage-1 node the screen queries.
        private static bool seeded;

        // The cleanliness band rank (ascending) — the order the band rises along the chain.
        private static int BandRank(string b) =>
            b == "DIRTY" ? 0 : b == "PARTIAL" ? 1 : b == "MOSTLY_CLEAN" ? 2 : b == "CLEAN" ? 3 : -1;

        private static string CleanlinessLabelFor(string b) =>
            b == "DIRTY" ? "Dirty" : b == "PARTIAL" ? "Partial" : b == "MOSTLY_CLEAN" ? "Mostly clean" :
            b == "CLEAN" ? "Clean" : b;

        [OneTimeSetUp]
        public void OneTimeSeed()
        {
            // Seed THIS fixture's precondition immediately before its tests run (the operational seeder
            // deletes + recreates this player's chain). Seeding in OneTimeSetUp makes seed→use atomic
            // per fixture and the full PlayMode suite order-independent (DRY via SeederSupport).
            string json = SeederSupport.RunSeeder(SeederSupport.OperationalSeeder, SeederSupport.OperationalMarker);
            demoEmail = SeederSupport.ExtractString(json, "email");
            demoPassword = SeederSupport.ExtractString(json, "password");
            headNodeId = SeederSupport.ExtractString(json, "laundering_node_id");

            Assert.IsFalse(string.IsNullOrEmpty(demoEmail), "discovered demo email");
            Assert.IsFalse(string.IsNullOrEmpty(demoPassword), "discovered demo password");
            Assert.IsTrue(SeederSupport.IsUuid(headNodeId), $"discovered head node uuid (got '{headNodeId}')");
            seeded = true;
            Debug.Log($"[PipelineE2E] seeded — headNode={headNodeId} email={demoEmail}");
        }

        [TearDown]
        public void TearDown()
        {
            if (controllerGo != null) Object.Destroy(controllerGo);
        }

        // ------------------------------------------------------------ the test --

        [UnityTest]
        public IEnumerator LoadsPipeline_RendersMultiNodeChain_RisingBands_TerminalFlagged()
        {
            Assert.IsTrue(seeded, "fixture seeded in OneTimeSetUp");

            controllerGo = new GameObject("PipelineOverviewController");
            var controller = controllerGo.AddComponent<PipelineOverviewController>();
            controller.NodeId = ""; // we drive the load manually after sign-in

            // 1) sign in (REUSE AuthClient inside the controller).
            float elapsed = 0f;
            yield return controller.SignIn();
            while (!controller.IsAuthenticated && controller.AuthError == null && elapsed < 20f)
            {
                elapsed += Time.deltaTime; yield return null;
            }
            Assert.IsNull(controller.AuthError, $"sign-in errored: {controller.AuthError}");
            Assert.IsTrue(controller.IsAuthenticated, "controller signed in (Bearer acquired)");

            // 2) load the pipeline overview given the head node id.
            yield return controller.LoadPipeline(headNodeId);
            Assert.IsNull(controller.PipelineError, $"pipeline load errored: {controller.PipelineError}");
            Assert.IsTrue(controller.PipelineLoaded, "pipeline overview loaded");

            LaunderingPipelineDto pipeline = controller.CurrentPipeline;
            Assert.IsNotNull(pipeline, "pipeline projection parsed");
            Assert.IsNotNull(pipeline.stages, "pipeline has a stages array");

            // 3a) the chain is MULTI-NODE — the seeded chain is 4 stages (Stage1→2→3→4); assert ≥3.
            Assert.GreaterOrEqual(pipeline.stages.Length, 3,
                $"pipeline renders a multi-node chain (≥3 ordered stages); got {pipeline.stages.Length}");
            Assert.AreEqual(pipeline.stages.Length, controller.StageCount, "StageCount matches the parsed stages");

            // The head stage we queried is the first of the chain.
            Assert.AreEqual(headNodeId, pipeline.stages[0].node, "the chain head is the node we queried");

            // 3b) cleanliness bands RISE along the chain: the band rank is NON-DECREASING head→tail and
            //     STRICTLY increases at least once (the laundering 'cleanliness journey' — the M1b core).
            bool roseAtLeastOnce = false;
            for (int i = 1; i < pipeline.stages.Length; i++)
            {
                int prev = BandRank(pipeline.stages[i - 1].cleanliness_band);
                int cur = BandRank(pipeline.stages[i].cleanliness_band);
                Assert.GreaterOrEqual(prev, 0, $"stage {i - 1} band recognised ('{pipeline.stages[i - 1].cleanliness_band}')");
                Assert.GreaterOrEqual(cur, 0, $"stage {i} band recognised ('{pipeline.stages[i].cleanliness_band}')");
                Assert.GreaterOrEqual(cur, prev,
                    $"cleanliness band does not regress along the chain (stage {i - 1}='{pipeline.stages[i - 1].cleanliness_band}' → stage {i}='{pipeline.stages[i].cleanliness_band}')");
                if (cur > prev) roseAtLeastOnce = true;
            }
            Assert.IsTrue(roseAtLeastOnce, "cleanliness band RISES at least once along the chain (head dirtier than tail)");

            // 3c) exactly the LAST stage is terminal (the release node that credits the wallet).
            Assert.IsTrue(pipeline.stages[pipeline.stages.Length - 1].terminal,
                "the last stage of the chain is flagged terminal (the release node)");
            int terminalCount = pipeline.stages.Count(s => s.terminal);
            Assert.AreEqual(1, terminalCount, "exactly one stage is terminal (a linear chain)");
            for (int i = 0; i < pipeline.stages.Length - 1; i++)
                Assert.IsFalse(pipeline.stages[i].terminal, $"non-tail stage {i} is not terminal");

            // 3d) the live projection (independent raw GET) must be COHERENT with what the screen rendered.
            LaunderingPipelineDto live = null; string liveErr = null;
            yield return FetchLivePipeline(controller.Token, headNodeId, p => live = p, e => liveErr = e);
            Assert.IsNull(liveErr, $"live pipeline fetch errored: {liveErr}");
            Assert.IsNotNull(live, "live pipeline parsed");
            Assert.AreEqual(live.stages.Length, pipeline.stages.Length, "rendered stage count == live stage count");
            for (int i = 0; i < live.stages.Length; i++)
            {
                Assert.AreEqual(live.stages[i].node, pipeline.stages[i].node, $"stage {i} node coherent with live");
                Assert.AreEqual(live.stages[i].cleanliness_band, pipeline.stages[i].cleanliness_band,
                    $"stage {i} cleanliness band coherent with live");
                Assert.AreEqual(live.stages[i].terminal, pipeline.stages[i].terminal, $"stage {i} terminal flag coherent with live");
            }

            // 3e) the UI reflects it: the rendered texts include each stage's cleanliness band label +
            //     a terminal/release marker for the tail.
            var texts = controller.RenderedTexts;
            Assert.IsTrue(texts.Any(t => t.Contains("Stage one")), "head stage label rendered (worded ordinal)");
            Assert.IsTrue(texts.Any(t => t.Contains("Release")), "the terminal/release marker rendered for the tail");
            foreach (var s in pipeline.stages)
                Assert.IsTrue(texts.Any(t => t == CleanlinessLabelFor(s.cleanliness_band)),
                    $"the cleanliness band label '{CleanlinessLabelFor(s.cleanliness_band)}' is rendered for a stage");

            // 4) NO raw scalar client-side: every rendered string is a band/label/glyph/word/marker —
            //    nothing should be a bare number (cents/dwell/cleanliness-float/stage-count).
            foreach (string t in texts)
            {
                Assert.IsFalse(Regex.IsMatch(t, @"(?<![A-Za-z])\d+(\.\d+)?(?![A-Za-z])"),
                    $"no raw scalar may be shown client-side, but rendered text was: '{t}'");
            }

            Debug.Log($"[PipelineE2E] chain rendered — stages={pipeline.stages.Length} " +
                      $"head={pipeline.stages[0].cleanliness_band} tail={pipeline.stages[pipeline.stages.Length - 1].cleanliness_band} (terminal)");
        }

        // A focused guard: the pipeline endpoint is JWT-gated (unauth → not OK).
        [UnityTest]
        public IEnumerator Pipeline_WithoutToken_DoesNotLoad()
        {
            var client = new LaunderingClient();
            LaunderingPipelineDto dto = null;
            long errCode = 0;
            yield return client.GetLaunderingPipeline("00000000-0000-4000-8000-000000000000", null,
                d => dto = d, (code, msg) => errCode = code);

            Assert.IsNull(dto, "no pipeline projection unauthenticated");
            Assert.AreNotEqual(200, errCode, "unauthenticated pipeline fetch is rejected");
        }

        // Renders the multi-node pipeline with live data and writes a screenshot to
        // Assets/Screenshots/pipeline_overview.png. Categorised so it only runs on demand.
        [UnityTest]
        [Category("Screenshot")]
        public IEnumerator CapturePipelineScreenshot()
        {
            Assert.IsTrue(seeded, "fixture seeded in OneTimeSetUp");

            controllerGo = new GameObject("PipelineOverviewController");
            var controller = controllerGo.AddComponent<PipelineOverviewController>();

            yield return controller.SignIn();
            Assert.IsTrue(controller.IsAuthenticated, $"signed in (authErr={controller.AuthError})");

            yield return controller.LoadPipeline(headNodeId);
            Assert.IsTrue(controller.PipelineLoaded, $"pipeline loaded (err={controller.PipelineError})");

            // Let the canvas lay out + draw a couple of frames.
            for (int i = 0; i < 3; i++) yield return null;

            string dir = Path.Combine(Application.dataPath, "Screenshots");
            Directory.CreateDirectory(dir);
            string path = Path.Combine(dir, "pipeline_overview.png");
            if (File.Exists(path)) File.Delete(path);

            ScreenCapture.CaptureScreenshot(path);

            float waited = 0f;
            while (!File.Exists(path) && waited < 10f) { waited += Time.deltaTime; yield return null; }
            yield return null;

            Assert.IsTrue(File.Exists(path), $"screenshot written to {path}");
            Debug.Log($"[PipelineE2E] screenshot → {path}");
        }

        // ── live ground-truth fetch (raw — independent of the controller) ──
        private static IEnumerator FetchLivePipeline(string bearer, string id,
            Action<LaunderingPipelineDto> onOk, Action<string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(BaseUrl + $"/v1/operational/laundering/{id}/pipeline"))
            {
                req.timeout = 10;
                req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (req.result != UnityWebRequest.Result.Success) { onErr($"pipeline GET failed ({req.responseCode})"); yield break; }
                var dto = JsonUtility.FromJson<LaunderingPipelineEnvelope>(req.downloadHandler.text)?.payload?.data;
                if (dto == null || dto.stages == null) { onErr("pipeline projection did not parse"); yield break; }
                onOk(dto);
            }
        }
    }
}
