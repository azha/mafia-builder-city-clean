using System;
using System.Collections;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.TestTools;
using MafiaCleanCity.Operational;
using Debug = UnityEngine.Debug;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    // E2E (charter 27: NO MOCK). Drives the real DashboardController against the live
    // dockerized stack (Traefik @ http://localhost). It:
    //   1. runs Tools/seed_operational_demo.mjs (via Process) and parses its stdout JSON to
    //      DISCOVER the demo creds (the seed leaves the demo player with a non-BROKE wallet —
    //      laundering credited clean cash);
    //   2. signs in via AuthClient → Bearer;
    //   3. INDEPENDENTLY fetches the live GET /v1/economy/wallet + GET /v1/city/district/16/heat
    //      (raw UnityWebRequest — the ground truth), loads the dashboard, and asserts the
    //      rendered WALLET BAND matches the live wallet_band AND the rendered CITYWIDE HEAT band
    //      matches the live citywide_bucket;
    //   4. asserts the nav buttons (City Map / Building Card / Pipeline) exist, and that clicking
    //      one opens the target controller (the nav hook records the opened GameObject);
    //   5. asserts NO raw scalar leaks client-side (only bands / labels / glyphs / booleans).
    public class DashboardPlayModeTests
    {
        private GameObject controllerGo;

        // Discovered from the seeder's stdout (see RunSeeder).
        private static string demoEmail;
        private static string demoPassword;
        private static bool seeded;

        private const string BaseUrl = "http://localhost";
        private const int HeatProbeDistrict = 16; // the operational district (Verge); any 1..18 returns the same citywide_bucket

        [TearDown]
        public void TearDown()
        {
            if (controllerGo != null) Object.Destroy(controllerGo);
        }

        // Seed THIS fixture's precondition immediately before its tests run (the operational
        // seeder deletes + recreates this player's state). Seeding in OneTimeSetUp — rather than
        // lazily in the first test body — makes the seed→use atomic per fixture and the full
        // PlayMode suite order-independent (a sibling op fixture's re-seed can't invalidate the
        // state THIS fixture asserts, because it's re-seeded right before this fixture runs).
        [OneTimeSetUp]
        public void OneTimeSeed()
        {
            seeded = false;
            RunSeeder();
        }

        // -------- run the operational seeder + parse its printed creds --------

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

            demoEmail = ExtractString(json, "email");
            demoPassword = ExtractString(json, "password");

            Assert.IsFalse(string.IsNullOrEmpty(demoEmail), "discovered demo email");
            Assert.IsFalse(string.IsNullOrEmpty(demoPassword), "discovered demo password");

            Debug.Log($"[DashboardE2E] seeded — email={demoEmail}");
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

        private static string Tail(string s) => s.Length <= 600 ? s : s.Substring(s.Length - 600);

        // ---- live ground-truth fetches (raw — independent of the controller) ----

        private static IEnumerator FetchLiveWalletBand(string bearer, Action<string> onBand, Action<string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(BaseUrl + "/v1/economy/wallet"))
            {
                req.timeout = 10;
                req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (req.result != UnityWebRequest.Result.Success) { onErr($"wallet GET failed ({req.responseCode})"); yield break; }
                var dto = JsonUtility.FromJson<WalletEnvelope>(req.downloadHandler.text)?.payload?.data;
                onBand(dto?.wallet_band);
            }
        }

        private static IEnumerator FetchLiveCitywideHeat(string bearer, Action<string, bool> onHeat, Action<string> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(BaseUrl + $"/v1/city/district/{HeatProbeDistrict}/heat"))
            {
                req.timeout = 10;
                req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (req.result != UnityWebRequest.Result.Success) { onErr($"heat GET failed ({req.responseCode})"); yield break; }
                var dto = JsonUtility.FromJson<MafiaCleanCity.CityMap.HeatEnvelope>(req.downloadHandler.text)?.payload?.data;
                onHeat(dto?.citywide_bucket, dto != null && dto.escalated);
            }
        }

        // map a live band enum → the label the controller renders (kept in sync with the controller).
        private static string WalletLabelFor(string b) =>
            b == "FLUSH" ? "Flush" : b == "HIGH" ? "High" : b == "MODERATE" ? "Moderate" :
            b == "LOW" ? "Low" : b == "BROKE" ? "Broke" : b;

        private static string HeatLabelFor(string b) =>
            b == "COLD" ? "Cold" : b == "WARM" ? "Warm" : b == "HOT" ? "Hot" : b == "BURNING" ? "Burning" : b;

        // ------------------------------------------------------------ the test --

        [UnityTest]
        public IEnumerator LoadsDashboard_RendersWalletBand_AndCitywideHeat_AndNav()
        {
            RunSeeder();

            controllerGo = new GameObject("DashboardController");
            var controller = controllerGo.AddComponent<DashboardController>();

            // 1) sign in (REUSE AuthClient inside the controller).
            float elapsed = 0f;
            yield return controller.SignIn();
            while (!controller.IsAuthenticated && controller.AuthError == null && elapsed < 20f)
            {
                elapsed += Time.deltaTime; yield return null;
            }
            Assert.IsNull(controller.AuthError, $"sign-in errored: {controller.AuthError}");
            Assert.IsTrue(controller.IsAuthenticated, "controller signed in (Bearer acquired)");

            // 2) fetch the live ground truth INDEPENDENTLY (raw GETs with the controller's Bearer).
            string liveWalletBand = null, liveWalletErr = null;
            yield return FetchLiveWalletBand(controller.Token, b => liveWalletBand = b, e => liveWalletErr = e);
            Assert.IsNull(liveWalletErr, $"live wallet fetch errored: {liveWalletErr}");
            Assert.IsFalse(string.IsNullOrEmpty(liveWalletBand), "live wallet_band present");
            // The seeded demo player has laundered clean cash → a real non-BROKE band.
            Assert.AreNotEqual("BROKE", liveWalletBand, "seeded demo wallet is a real non-BROKE band");

            string liveHeatBand = null; bool liveEscalated = false; string liveHeatErr = null;
            yield return FetchLiveCitywideHeat(controller.Token, (b, e) => { liveHeatBand = b; liveEscalated = e; }, e => liveHeatErr = e);
            Assert.IsNull(liveHeatErr, $"live heat fetch errored: {liveHeatErr}");
            Assert.IsFalse(string.IsNullOrEmpty(liveHeatBand), "live citywide_bucket present");

            // 3) load the dashboard and assert the rendered bands match the live projections.
            yield return controller.LoadDashboard();
            Assert.IsTrue(controller.DashboardLoaded, $"dashboard loaded (walletErr={controller.WalletError} heatErr={controller.HeatError})");

            Assert.IsNotNull(controller.CurrentWallet, "wallet projection parsed");
            Assert.AreEqual(liveWalletBand, controller.CurrentWallet.wallet_band,
                "controller's wallet band matches the live /v1/economy/wallet");
            Assert.IsNotNull(controller.CurrentHeat, "heat projection parsed");
            Assert.AreEqual(liveHeatBand, controller.CurrentHeat.citywide_bucket,
                "controller's citywide heat band matches the live heat projection");

            var texts = controller.RenderedTexts;

            // The headline WALLET band label is rendered (matches the live band).
            string expectWallet = WalletLabelFor(liveWalletBand);
            Assert.IsTrue(texts.Any(t => t == expectWallet),
                $"rendered wallet band label '{expectWallet}' (live={liveWalletBand}) present in {Dump(texts)}");
            Assert.IsTrue(texts.Any(t => t == "Wallet"), "wallet caption rendered");

            // The CITYWIDE HEAT band label is rendered (matches the live band) + escalation row.
            string expectHeat = HeatLabelFor(liveHeatBand);
            Assert.IsTrue(texts.Any(t => t == expectHeat),
                $"rendered citywide heat band label '{expectHeat}' (live={liveHeatBand}) present in {Dump(texts)}");
            Assert.IsTrue(texts.Any(t => t == "Citywide heat"), "citywide heat row label rendered");
            Assert.IsTrue(texts.Any(t => t == "Escalation"), "escalation row label rendered");
            Assert.IsTrue(texts.Any(t => t == (liveEscalated ? "Escalating" : "Steady")),
                $"escalation flag rendered (live escalated={liveEscalated})");

            // A minimal ALERTS line is present (derived strictly from the heat projection).
            Assert.IsTrue(texts.Any(t => t == "Alerts"), "alerts row label rendered");

            // 4) nav buttons exist.
            Assert.IsTrue(texts.Any(t => t == "City Map"), "City Map nav button rendered");
            Assert.IsTrue(texts.Any(t => t == "Building Card"), "Building Card nav button rendered");
            Assert.IsTrue(texts.Any(t => t == "Pipeline"), "Pipeline nav button rendered");

            // 5) NO raw scalar client-side: every rendered string is a band/label/glyph/bool —
            //    nothing should be a bare number (cents/heat-float/ticks). Assert no token is a
            //    pure integer/decimal.
            foreach (string t in texts)
            {
                Assert.IsFalse(Regex.IsMatch(t, @"(?<![A-Za-z])\d+(\.\d+)?(?![A-Za-z])"),
                    $"no raw scalar may be shown client-side, but rendered text was: '{t}'");
            }

            // 4b) clicking a nav button opens the target controller (the nav hook records it).
            Assert.AreEqual(DashboardController.NavTarget.None, controller.LastNavTarget, "no nav fired yet");
            controller.OpenPipeline();
            Assert.AreEqual(DashboardController.NavTarget.Pipeline, controller.LastNavTarget, "Pipeline nav fired");
            Assert.IsNotNull(controller.LastNavGameObject, "Pipeline nav opened a host GameObject");
            Assert.IsNotNull(controller.LastNavGameObject.GetComponent<LaunderingController>(),
                "Pipeline nav opened the LaunderingController");
            // tidy up the opened controller so it doesn't keep running its own fetch loop.
            Object.Destroy(controller.LastNavGameObject);

            Debug.Log($"[DashboardE2E] wallet={liveWalletBand} citywide_heat={liveHeatBand} escalated={liveEscalated}");
        }

        // A focused, fast guard: the wallet endpoint is JWT-gated (unauth → 401, not OK).
        [UnityTest]
        public IEnumerator Wallet_WithoutToken_DoesNotLoad()
        {
            var client = new DashboardClient();
            WalletDto dto = null;
            long errCode = 0;
            yield return client.GetWallet(null, d => dto = d, (code, msg) => errCode = code);

            Assert.IsNull(dto, "no wallet projection unauthenticated");
            Assert.AreEqual(401, errCode, "unauthenticated wallet fetch is rejected with 401");
        }

        // Renders the dashboard with live data and writes a screenshot to
        // Assets/Screenshots/dashboard.png. Categorised so it only runs on demand.
        [UnityTest]
        [Category("Screenshot")]
        public IEnumerator CaptureDashboardScreenshot()
        {
            RunSeeder();

            controllerGo = new GameObject("DashboardController");
            var controller = controllerGo.AddComponent<DashboardController>();

            yield return controller.SignIn();
            Assert.IsTrue(controller.IsAuthenticated, $"signed in (authErr={controller.AuthError})");

            yield return controller.LoadDashboard();
            Assert.IsTrue(controller.DashboardLoaded, $"dashboard loaded (walletErr={controller.WalletError})");

            // Let the canvas lay out + draw a couple of frames.
            for (int i = 0; i < 3; i++) yield return null;

            string dir = Path.Combine(Application.dataPath, "Screenshots");
            Directory.CreateDirectory(dir);
            string path = Path.Combine(dir, "dashboard.png");
            if (File.Exists(path)) File.Delete(path);

            ScreenCapture.CaptureScreenshot(path);

            float waited = 0f;
            while (!File.Exists(path) && waited < 10f) { waited += Time.deltaTime; yield return null; }
            yield return null;

            Assert.IsTrue(File.Exists(path), $"screenshot written to {path}");
            Debug.Log($"[DashboardE2E] screenshot → {path}");
        }

        private static string Dump(System.Collections.Generic.IReadOnlyList<string> texts) =>
            "[" + string.Join(" | ", texts) + "]";
    }
}
