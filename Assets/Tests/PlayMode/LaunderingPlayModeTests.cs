using System;
using System.Collections;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using MafiaCleanCity.Operational;
using Debug = UnityEngine.Debug;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    // E2E (charter 27: NO MOCK). Drives the real LaunderingController against the live
    // dockerized stack (Traefik @ http://localhost). It:
    //   1. runs Tools/seed_operational_demo.mjs (via Process) and parses its stdout JSON to
    //      DISCOVER the demo creds + the laundering node_id + front_shop / safehouse / dealer
    //      ids (ids change every run — never hard-coded);
    //   2. signs in via AuthClient → Bearer;
    //   3. loads the laundering-node projection and asserts the rendered cleanliness band
    //      matches the live projection (the seeded node is DIRTY — mid-pipeline) + the
    //      deviation flag is reflected in the rendered texts;
    //   4. triggers the Stage-1 Inject action and asserts the client hit the inject endpoint
    //      with a genuine 2xx — the terminal seed state leaves the safehouse EMPTY (its float
    //      was fully laundered by the seed), so the test first COLLECTS the seeder's fresh
    //      uncollected dealer float into the safehouse (a real 2xx), THEN injects an
    //      on-boundary amount (a real 2xx) — an entirely live, no-mock success;
    //   5. asserts NO raw scalar leaks client-side (only bands / strings / booleans).
    public class LaunderingPlayModeTests
    {
        private GameObject controllerGo;

        // Discovered from the seeder's stdout (see RunSeeder).
        private static string demoEmail;
        private static string demoPassword;
        private static string nodeId;
        private static string frontShopId;
        private static string safehouseId;
        private static string dealerId;
        private static bool seeded;

        // An on-boundary inject amount: 500 cents = 1% of a 50000-cent safehouse slot → an exact
        // round-trip; well under the 250000-cent legit baseline → conforming (no deviation).
        private const int OnBoundaryInjectCents = 500;

        [TearDown]
        public void TearDown()
        {
            if (controllerGo != null) Object.Destroy(controllerGo);
        }

        // Seed THIS fixture's precondition immediately before its tests run (the operational
        // seeder deletes + recreates this player's node/safehouse/dealer). Seeding in OneTimeSetUp
        // — rather than lazily in the first test body — makes the seed→use atomic per fixture and
        // the full PlayMode suite order-independent (a sibling op fixture's re-seed can't
        // invalidate the ids THIS fixture loads, because they're re-seeded right before it runs).
        [OneTimeSetUp]
        public void OneTimeSeed()
        {
            seeded = false;
            RunSeeder();
        }

        // -------- run the operational seeder + parse its printed ids --------

        private static void RunSeeder()
        {
            if (seeded) return;

            string repoRoot = FindRepoRoot();
            Assert.IsNotNull(repoRoot, "could not locate the Unity repo root (Tools/seed_operational_demo.mjs)");

            // The Unity Editor process does not inherit the login-shell PATH (no nvm shims),
            // so "node" is not resolvable by name. Resolve an absolute node binary.
            string nodeBin = ResolveNode();
            Assert.IsNotNull(nodeBin, "could not locate a 'node' binary (checked PATH, nvm, common dirs)");

            var psi = new ProcessStartInfo
            {
                FileName = nodeBin,
                Arguments = "Tools/seed_operational_demo.mjs",
                WorkingDirectory = repoRoot,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
            };
            string nodeDir = Path.GetDirectoryName(nodeBin);
            string existingPath = Environment.GetEnvironmentVariable("PATH") ?? "";
            if (!string.IsNullOrEmpty(nodeDir) && !existingPath.Contains(nodeDir))
                psi.EnvironmentVariables["PATH"] = nodeDir + Path.PathSeparator + existingPath;

            string stdout, stderr;
            using (var proc = Process.Start(psi))
            {
                stdout = proc.StandardOutput.ReadToEnd();
                stderr = proc.StandardError.ReadToEnd();
                proc.WaitForExit(180000);
                Assert.IsTrue(proc.HasExited, "seeder did not finish within 180s");
                Assert.AreEqual(0, proc.ExitCode, $"seeder failed (exit {proc.ExitCode}). stderr:\n{stderr}");
            }

            const string marker = "=== OPERATIONAL DEMO SEEDED ===";
            int idx = stdout.IndexOf(marker, StringComparison.Ordinal);
            Assert.Greater(idx, -1, $"seeder marker not found in stdout. stdout tail:\n{Tail(stdout)}");
            string json = stdout.Substring(idx + marker.Length);

            // Pull the fields we need with anchored regexes on the raw JSON (JsonUtility can't
            // parse the nested seeder shape cleanly). Keys are unique across the printed block.
            demoEmail = ExtractString(json, "email");
            demoPassword = ExtractString(json, "password");
            nodeId = ExtractString(json, "laundering_node_id");
            frontShopId = ExtractString(json, "front_shop");
            safehouseId = ExtractString(json, "safehouse_id");
            dealerId = ExtractString(json, "dealer_id");

            Assert.IsFalse(string.IsNullOrEmpty(demoEmail), "discovered demo email");
            Assert.IsFalse(string.IsNullOrEmpty(demoPassword), "discovered demo password");
            Assert.IsTrue(IsUuid(nodeId), $"discovered laundering node uuid (got '{nodeId}')");
            Assert.IsTrue(IsUuid(frontShopId), $"discovered front_shop uuid (got '{frontShopId}')");
            Assert.IsTrue(IsUuid(safehouseId), $"discovered safehouse uuid (got '{safehouseId}')");
            Assert.IsTrue(IsUuid(dealerId), $"discovered dealer uuid (got '{dealerId}')");

            Debug.Log($"[LaunderingE2E] seeded — node={nodeId} front_shop={frontShopId} safehouse={safehouseId} dealer={dealerId} email={demoEmail}");
            seeded = true;
        }

        private static string FindRepoRoot()
        {
            DirectoryInfo dir = new DirectoryInfo(Application.dataPath);
            for (int i = 0; i < 6 && dir != null; i++)
            {
                if (File.Exists(Path.Combine(dir.FullName, "Tools", "seed_operational_demo.mjs")))
                    return dir.FullName;
                dir = dir.Parent;
            }
            return null;
        }

        // Resolve an absolute path to a node binary. The Editor doesn't inherit the login
        // shell's PATH, so we probe: a NODE_BIN env override, $PATH entries, nvm versions, and
        // common install dirs. Returns null if none found.
        private static string ResolveNode()
        {
            string fromEnv = Environment.GetEnvironmentVariable("NODE_BIN");
            if (!string.IsNullOrEmpty(fromEnv) && File.Exists(fromEnv)) return fromEnv;

            string path = Environment.GetEnvironmentVariable("PATH") ?? "";
            foreach (string dir in path.Split(Path.PathSeparator))
            {
                if (string.IsNullOrEmpty(dir)) continue;
                string candidate = Path.Combine(dir, "node");
                if (File.Exists(candidate)) return candidate;
            }

            string home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);

            string nvmVersions = Path.Combine(home, ".nvm", "versions", "node");
            if (Directory.Exists(nvmVersions))
            {
                string best = Directory.GetDirectories(nvmVersions)
                    .Select(d => Path.Combine(d, "bin", "node"))
                    .Where(File.Exists)
                    .OrderBy(p => p, StringComparer.Ordinal)
                    .LastOrDefault();
                if (best != null) return best;
            }

            foreach (string c in new[]
                     {
                         "/usr/local/bin/node",
                         "/usr/bin/node",
                         "/bin/node",
                         Path.Combine(home, ".local", "bin", "node"),
                     })
            {
                if (File.Exists(c)) return c;
            }

            return null;
        }

        private static string ExtractString(string json, string key)
        {
            var m = Regex.Match(json, "\"" + Regex.Escape(key) + "\"\\s*:\\s*\"([^\"]*)\"");
            return m.Success ? m.Groups[1].Value : null;
        }

        private static bool IsUuid(string s) =>
            !string.IsNullOrEmpty(s) &&
            Regex.IsMatch(s, "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$");

        private static string Tail(string s) => s.Length <= 600 ? s : s.Substring(s.Length - 600);

        // ------------------------------------------------------------ the test --

        [UnityTest]
        public IEnumerator LoadsLaunderingNode_RendersBands_AndWiresStage1Inject()
        {
            RunSeeder();

            controllerGo = new GameObject("LaunderingController");
            var controller = controllerGo.AddComponent<LaunderingController>();
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

            // 2) load the laundering node and assert the rendered band matches the live projection.
            yield return controller.LoadNode(nodeId);
            Assert.IsNull(controller.NodeError, $"node load errored: {controller.NodeError}");
            Assert.IsTrue(controller.NodeLoaded, "laundering node loaded");

            LaunderingNodeDto node = controller.CurrentNode;
            Assert.IsNotNull(node, "node projection parsed");
            Assert.AreEqual(nodeId, node.node, "node is the one we requested");
            // The seeded node is left MID-PIPELINE — freshly injected, not yet cleaned → DIRTY.
            Assert.AreEqual("DIRTY", node.cleanliness_band, "seeded node is DIRTY (mid-pipeline)");
            // The seed's injects are on-boundary / under baseline → no deviation pin.
            Assert.IsFalse(node.deviation_active, "seeded node has no active deviation pin");

            // 3) the UI reflects it: the rendered texts include the cleanliness band label
            //    + the deviation flag's qualitative label (never a raw scalar).
            var texts = controller.RenderedTexts;
            Assert.IsTrue(texts.Any(t => t == "Cleanliness"), "cleanliness row label rendered");
            Assert.IsTrue(texts.Any(t => t == "Dirty"), "cleanliness band 'Dirty' rendered (the DIRTY band)");
            Assert.IsTrue(texts.Any(t => t == "Deviation"), "deviation row label rendered");
            Assert.IsTrue(texts.Any(t => t == "Conforming"),
                "deviation flag rendered as 'Conforming' (deviation_active == false)");
            Assert.IsTrue(texts.Any(t => t.Contains("Inject")), "Stage-1 Inject affordance rendered");

            // 5) NO raw scalar client-side: every rendered string is a band/label/glyph/bool —
            //    nothing should be a bare number (cents/dwell/cleanliness-float). Assert no token
            //    is a pure integer/decimal.
            foreach (string t in texts)
            {
                Assert.IsFalse(Regex.IsMatch(t, @"(?<![A-Za-z])\d+(\.\d+)?(?![A-Za-z])"),
                    $"no raw scalar may be shown client-side, but rendered text was: '{t}'");
            }

            // 4a) Stage the inject: collect the seeder's fresh uncollected dealer float into the
            //     safehouse (a genuine 2xx) — the terminal seed state leaves the safehouse empty.
            yield return controller.Collect(dealerId, safehouseId);
            ActionOutcome collect = controller.LastActionOutcome;
            Assert.IsNotNull(collect, "collect action produced an outcome");
            StringAssert.Contains($"/v1/operational/dealer/{dealerId}/collect", collect.Endpoint,
                "collect hit the right dealer endpoint");
            Assert.IsTrue(collect.Ok, $"Collect should succeed (2xx). Got http={collect.HttpStatus} msg={collect.Message}");

            // 4b) Stage-1 INJECT — inject an on-boundary amount through the front-shop. With the
            //     safehouse now funded, this is a genuine 2xx; the returned node_id proves the
            //     wiring + identity. (After a successful inject the controller re-loads the node.)
            yield return controller.Inject(frontShopId, safehouseId, OnBoundaryInjectCents);
            ActionOutcome inject = controller.LastActionOutcome;
            Assert.IsNotNull(inject, "inject action produced an outcome");
            StringAssert.Contains("/v1/operational/laundering/inject", inject.Endpoint,
                "inject hit the right laundering endpoint");
            Assert.IsTrue(inject.Ok, $"Inject should succeed (2xx). Got http={inject.HttpStatus} msg={inject.Message}");
            Assert.AreEqual(nodeId, inject.ResultId,
                $"inject returned the same Stage-1 node_id we loaded (got '{inject.ResultId}')");

            Debug.Log($"[LaunderingE2E] collect={collect} inject={inject}");
        }

        // A focused, fast guard: the laundering node endpoint is JWT-gated (unauth → not OK).
        [UnityTest]
        public IEnumerator LaunderingNode_WithoutToken_DoesNotLoad()
        {
            var client = new LaunderingClient();
            LaunderingNodeDto dto = null;
            long errCode = 0;
            yield return client.GetLaunderingNode("00000000-0000-4000-8000-000000000000", null,
                d => dto = d, (code, msg) => errCode = code);

            Assert.IsNull(dto, "no projection unauthenticated");
            Assert.AreNotEqual(200, errCode, "unauthenticated laundering-node fetch is rejected");
        }

        // Renders the laundering pipeline with live data and writes a screenshot to
        // Assets/Screenshots/laundering_pipeline.png. Categorised so it only runs on demand.
        [UnityTest]
        [Category("Screenshot")]
        public IEnumerator CaptureLaunderingScreenshot()
        {
            RunSeeder();

            controllerGo = new GameObject("LaunderingController");
            var controller = controllerGo.AddComponent<LaunderingController>();

            yield return controller.SignIn();
            Assert.IsTrue(controller.IsAuthenticated, $"signed in (authErr={controller.AuthError})");

            yield return controller.LoadNode(nodeId);
            Assert.IsTrue(controller.NodeLoaded, $"node loaded (err={controller.NodeError})");

            // Let the canvas lay out + draw a couple of frames.
            for (int i = 0; i < 3; i++) yield return null;

            string dir = Path.Combine(Application.dataPath, "Screenshots");
            Directory.CreateDirectory(dir);
            string path = Path.Combine(dir, "laundering_pipeline.png");
            if (File.Exists(path)) File.Delete(path);

            ScreenCapture.CaptureScreenshot(path);

            float waited = 0f;
            while (!File.Exists(path) && waited < 10f) { waited += Time.deltaTime; yield return null; }
            yield return null;

            Assert.IsTrue(File.Exists(path), $"screenshot written to {path}");
            Debug.Log($"[LaunderingE2E] screenshot → {path}");
        }
    }
}
