using System;
using System.Collections;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using MafiaCleanCity.Operational;
using Debug = UnityEngine.Debug;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    // E2E (charter 27: NO MOCK). Drives the real BuildingCardController against the live
    // dockerized stack (Traefik @ http://localhost). It:
    //   1. runs Tools/seed_operational_demo.mjs (via Process) and parses its stdout JSON
    //      to DISCOVER the demo creds + the lab/front_shop building ids (ids change every
    //      run — never hard-coded);
    //   2. signs in via AuthClient → Bearer;
    //   3. loads the Building Card projection for the lab and asserts the rendered bands
    //      reflect the live projection (setup_state=OPERATIONAL, operational=true,
    //      operational_type=lab);
    //   4. triggers per-type lab actions — Order Pyralin (genuinely 2xx) and Start Cook
    //      (well-formed call; the endpoint wiring is what's asserted) — and asserts the
    //      client hit the correct endpoints;
    //   5. asserts NO raw scalar leaks client-side (only bands / strings / booleans).
    public class BuildingCardPlayModeTests
    {
        private GameObject controllerGo;

        // Discovered from the seeder's stdout (see RunSeeder).
        private static string demoEmail;
        private static string demoPassword;
        private static string labId;
        private static string frontShopId;
        private static string safehouseId;
        private static bool seeded;

        [TearDown]
        public void TearDown()
        {
            if (controllerGo != null) Object.Destroy(controllerGo);
        }

        // -------- one-time: run the operational seeder + parse its printed ids --------

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
            // Ensure node's own dir is on PATH for any child it spawns.
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

            // The seeder prints, after a marker, a JSON block with creds + building ids.
            const string marker = "=== OPERATIONAL DEMO SEEDED ===";
            int idx = stdout.IndexOf(marker, StringComparison.Ordinal);
            Assert.Greater(idx, -1, $"seeder marker not found in stdout. stdout tail:\n{Tail(stdout)}");
            string json = stdout.Substring(idx + marker.Length);

            // JsonUtility can't parse the nested seeder JSON cleanly (it has a flat-ish but
            // nested shape); pull the fields we need with anchored regexes on the raw JSON.
            demoEmail = ExtractString(json, "email");
            demoPassword = ExtractString(json, "password");
            labId = ExtractString(json, "lab");
            frontShopId = ExtractString(json, "front_shop");
            safehouseId = ExtractString(json, "safehouse_id");

            Assert.IsFalse(string.IsNullOrEmpty(demoEmail), "discovered demo email");
            Assert.IsFalse(string.IsNullOrEmpty(demoPassword), "discovered demo password");
            Assert.IsTrue(IsUuid(labId), $"discovered lab uuid (got '{labId}')");
            Assert.IsTrue(IsUuid(frontShopId), $"discovered front_shop uuid (got '{frontShopId}')");
            Assert.IsTrue(IsUuid(safehouseId), $"discovered safehouse uuid (got '{safehouseId}')");

            Debug.Log($"[BuildingCardE2E] seeded — lab={labId} front_shop={frontShopId} safehouse={safehouseId} email={demoEmail}");
            seeded = true;
        }

        private static string FindRepoRoot()
        {
            // dataPath is <repo>/Assets — walk up to the dir containing Tools/seed_operational_demo.mjs.
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
        // shell's PATH, so we probe: $PATH entries, a NODE env override, nvm versions, and
        // common install dirs. Returns null if none found.
        private static string ResolveNode()
        {
            string fromEnv = Environment.GetEnvironmentVariable("NODE_BIN");
            if (!string.IsNullOrEmpty(fromEnv) && File.Exists(fromEnv)) return fromEnv;

            // 1) anything already on PATH.
            string path = Environment.GetEnvironmentVariable("PATH") ?? "";
            foreach (string dir in path.Split(Path.PathSeparator))
            {
                if (string.IsNullOrEmpty(dir)) continue;
                string candidate = Path.Combine(dir, "node");
                if (File.Exists(candidate)) return candidate;
            }

            string home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);

            // 2) nvm — pick the lexically-greatest version dir that has bin/node.
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

            // 3) common fixed locations.
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

        // Pull "key": "value" from the seeder's printed JSON (string values only).
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
        public IEnumerator LoadsLabCard_RendersBands_AndWiresPerTypeActions()
        {
            RunSeeder();

            controllerGo = new GameObject("BuildingCardController");
            var controller = controllerGo.AddComponent<BuildingCardController>();
            controller.BuildingId = ""; // we drive the load manually after wiring the right creds
            // The controller signs in with its own demo creds; the seeder uses the SAME
            // shared demo player (citymap_demo@example.test), so the default creds match.

            // 1) sign in (REUSE AuthClient inside the controller).
            float elapsed = 0f;
            yield return controller.SignIn();
            while (!controller.IsAuthenticated && controller.AuthError == null && elapsed < 20f)
            {
                elapsed += Time.deltaTime; yield return null;
            }
            Assert.IsNull(controller.AuthError, $"sign-in errored: {controller.AuthError}");
            Assert.IsTrue(controller.IsAuthenticated, "controller signed in (Bearer acquired)");

            // 2) load the LAB building card and assert the rendered bands match the live projection.
            yield return controller.LoadBuilding(labId);
            Assert.IsNull(controller.CardError, $"card load errored: {controller.CardError}");
            Assert.IsTrue(controller.CardLoaded, "building card loaded");

            BuildingCardDto card = controller.CurrentCard;
            Assert.IsNotNull(card, "card projection parsed");
            Assert.AreEqual(labId, card.building, "card is for the lab we requested");
            Assert.AreEqual("OPERATIONAL", card.setup_state, "seeded lab is OPERATIONAL");
            Assert.IsTrue(card.operational, "operational flag true");
            Assert.AreEqual("lab", card.operational_type, "operational_type is lab");
            Assert.AreEqual("WEAK", card.cover_band, "seeded cover_band is WEAK");

            // The UI reflects it: the rendered texts include the type + the OPERATIONAL band label.
            var texts = controller.RenderedTexts;
            Assert.IsTrue(texts.Any(t => t.Contains("Lab")), "type label 'Lab' rendered");
            Assert.IsTrue(texts.Any(t => t == "Operational"), "setup band 'Operational' rendered");
            Assert.IsTrue(texts.Any(t => t == "Yes"), "operational=true rendered as 'Yes'");
            Assert.IsTrue(texts.Any(t => t == "Weak"), "cover band 'Weak' rendered");

            // 5) NO raw scalar client-side: every rendered string is a band/label/glyph/bool —
            //    nothing should be a bare number (cents/grams/ticks/heat/purity). The only
            //    digits we allow are inside the labels we explicitly chose (none here) — assert
            //    no token is a pure integer/decimal.
            foreach (string t in texts)
            {
                Assert.IsFalse(Regex.IsMatch(t, @"(?<![A-Za-z])\d+(\.\d+)?(?![A-Za-z])"),
                    $"no raw scalar may be shown client-side, but rendered text was: '{t}'");
            }

            // 4a) per-type LAB action — Order Pyralin. This is genuinely arrangeable as a 2xx:
            //     ordering precursors always succeeds (201) regardless of current stock.
            yield return controller.OrderPyralin(10);
            ActionOutcome order = controller.LastActionOutcome;
            Assert.IsNotNull(order, "order action produced an outcome");
            StringAssert.Contains("/v1/operational/precursors/order", order.Endpoint, "order hit the right endpoint");
            Assert.IsTrue(order.Ok, $"Order Pyralin should succeed (2xx). Got http={order.HttpStatus} msg={order.Message}");
            Assert.IsTrue(IsUuid(order.ResultId), $"order returned an order_id uuid (got '{order.ResultId}')");

            // 4b) per-type LAB action — Start Cook. The wiring is the point: the client must hit
            //     POST /v1/operational/lab/:id/cook. In the demo's terminal state the cook returns
            //     a well-formed 409 (insufficient just-ordered-not-yet-arrived stock) — that still
            //     proves the action→endpoint wiring (and the readable-error mapping, F2).
            yield return controller.StartCook();
            ActionOutcome cook = controller.LastActionOutcome;
            Assert.IsNotNull(cook, "cook action produced an outcome");
            StringAssert.Contains($"/v1/operational/lab/{labId}/cook", cook.Endpoint, "cook hit the right lab endpoint");
            // Either a genuine 2xx, or a well-formed 4xx (NOT a transport/0 failure).
            Assert.IsTrue(cook.HttpStatus >= 200 && cook.HttpStatus < 500,
                $"cook produced a well-formed HTTP response (got {cook.HttpStatus})");
            if (!cook.Ok)
                Assert.IsFalse(string.IsNullOrEmpty(cook.Message), "a failed cook still carries a readable message (F2)");

            Debug.Log($"[BuildingCardE2E] order={order} cook={cook}");
        }

        // A focused, fast guard: the card endpoint is JWT-gated (unauth → not OK).
        [UnityTest]
        public IEnumerator BuildingCard_WithoutToken_DoesNotLoad()
        {
            var client = new BuildingCardClient();
            BuildingCardDto dto = null;
            long errCode = 0;
            yield return client.GetBuildingCard("00000000-0000-4000-8000-000000000000", null,
                d => dto = d, (code, msg) => errCode = code);

            Assert.IsNull(dto, "no projection unauthenticated");
            Assert.AreNotEqual(200, errCode, "unauthenticated building-card fetch is rejected");
        }

        // Renders the lab card with live data and writes a screenshot to
        // Assets/Screenshots/building_card.png. Categorised so it only runs on demand
        // (it draws a real frame + flushes a PNG asynchronously).
        [UnityTest]
        [Category("Screenshot")]
        public IEnumerator CaptureBuildingCardScreenshot()
        {
            RunSeeder();

            controllerGo = new GameObject("BuildingCardController");
            var controller = controllerGo.AddComponent<BuildingCardController>();

            yield return controller.SignIn();
            Assert.IsTrue(controller.IsAuthenticated, $"signed in (authErr={controller.AuthError})");

            yield return controller.LoadBuilding(labId);
            Assert.IsTrue(controller.CardLoaded, $"card loaded (err={controller.CardError})");

            // Let the canvas lay out + draw a couple of frames.
            for (int i = 0; i < 3; i++) yield return null;

            string dir = Path.Combine(Application.dataPath, "Screenshots");
            Directory.CreateDirectory(dir);
            string path = Path.Combine(dir, "building_card.png");
            if (File.Exists(path)) File.Delete(path);

            ScreenCapture.CaptureScreenshot(path);

            // CaptureScreenshot writes on a later frame; wait for the file to materialise.
            float waited = 0f;
            while (!File.Exists(path) && waited < 10f) { waited += Time.deltaTime; yield return null; }
            // A final settle frame so the PNG is fully flushed.
            yield return null;

            Assert.IsTrue(File.Exists(path), $"screenshot written to {path}");
            Debug.Log($"[BuildingCardE2E] screenshot → {path}");
        }
    }
}
