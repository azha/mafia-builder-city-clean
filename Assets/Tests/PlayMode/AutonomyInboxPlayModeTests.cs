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
using MafiaCleanCity.Operational.Autonomy;
using MafiaCleanCity.Operational.Lieutenant;
using Debug = UnityEngine.Debug;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    // P21-T7 — Autonomy Inbox E2E (charter 27: NO MOCK). Drives AutonomyInboxController,
    // LieutenantScreenController (autonomy gauge), and DashboardController against the live
    // dockerised stack (Traefik @ http://localhost).
    //   A — render/scan: seeded report in inbox, 2 undecided issues, bucket-only outcome labels,
    //       no raw scalar in the tracked corpus.
    //   B — resolve: Choose A on iss_demo_1 → decided='A' visible after auto re-fetch, issue 2 still
    //       undecided; 409 on a duplicate resolve (readable, F2).
    //   C — gauge: seeded PRODUCTION_OPS band is depleted; reset_budget restores to full;
    //       immediate same-kind repeat → cooldown (readable 409 via LastDecisionError).
    //   D — dashboard: PendingAutonomyReports contains the (partially decided) seeded report,
    //       "Autonomy reports waiting" note present, OpenAutonomy nav wired.
    // -- session:2026-06-10 (Phase-21 T7) --
    //
    // Adaptations vs. the spec template (documented):
    //   1. report.issues is AutonomyReportDto.issues: AutonomyIssueDto[] (array) → .Length/.First() OK.
    //   2. BandLabel("depleted")="[....] Depleted", BandLabel("full")="[####] Full" — matched exactly.
    //   3. No LogAssert.Expect in C_ cooldown: LieutenantScreenController.Decide()'s failure path
    //      calls SetOutcome() (no Debug.LogError) and sets LastDecisionError — no error log emitted.
    //   4. C_ wait uses BudgetBands.Count > 0 (bands load asynchronously via RefreshBands→RefreshAutonomy
    //      chain after OpenLieutenant; the test yields until bands arrive, capped at 10s).
    //   5. D_ TearDown also destroys LastNavGameObject (mirrors ExceptionQueuePlayModeTests pattern).
    public class AutonomyInboxPlayModeTests
    {
        private GameObject controllerGo;

        // Discovered from the seeder's stdout (see RunSeeder).
        private static string demoEmail;
        private static string demoPassword;
        private static string playerId;
        private static string labId;
        private static string exceptionLtId;
        private static string autonomyReportId;
        private static bool seeded;

        // Resolved once (the Editor doesn't inherit the login-shell PATH).
        private const string BaseUrl = "http://localhost";

        [TearDown]
        public void TearDown()
        {
            // A test may end with a nav host still open — destroy it so its canvas overlay never leaks
            // into the next test (mirrors ExceptionQueuePlayModeTests TearDown).
            var dash = controllerGo != null ? controllerGo.GetComponent<DashboardController>() : null;
            if (dash != null && dash.LastNavGameObject != null) Object.Destroy(dash.LastNavGameObject);
            if (controllerGo != null) Object.Destroy(controllerGo);
        }

        // Seed THIS fixture's precondition immediately before its tests run. Seeding in
        // OneTimeSetUp makes the seed→use atomic per fixture and the full PlayMode suite
        // order-independent (a sibling fixture's re-seed can never invalidate the ids this
        // fixture loads — they're re-seeded right before this fixture runs).
        [OneTimeSetUp]
        public void OneTimeSeed()
        {
            seeded = false; // force a fresh seed for this fixture (don't reuse a sibling's stale ids).
            RunSeeder();
        }

        // -------- run the operational seeder + parse its printed ids --------

        private static void RunSeeder()
        {
            if (seeded) return;

            string repoRoot = FindRepoRoot();
            Assert.IsNotNull(repoRoot, "could not locate the Unity repo root (Tools/seed_operational_demo.mjs)");

            string nodeBin = ResolveBin("node", "NODE_BIN");
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
                psi.EnvironmentVariables["PATH"] = nodeDir + System.IO.Path.PathSeparator + existingPath;

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

            demoEmail         = ExtractString(json, "email");
            demoPassword      = ExtractString(json, "password");
            playerId          = ExtractString(json, "playerId");
            labId             = ExtractString(json, "lab");
            exceptionLtId     = ExtractString(json, "exception_lieutenant_id");
            autonomyReportId  = ExtractString(json, "autonomy_report_id");

            Assert.IsFalse(string.IsNullOrEmpty(demoEmail),    "discovered demo email");
            Assert.IsFalse(string.IsNullOrEmpty(demoPassword), "discovered demo password");
            Assert.IsTrue(IsUuid(playerId),          $"discovered player uuid (got '{playerId}')");
            Assert.IsTrue(IsUuid(labId),             $"discovered lab uuid (got '{labId}')");
            Assert.IsTrue(IsUuid(exceptionLtId),     $"discovered exception_lieutenant_id uuid (got '{exceptionLtId}')");
            Assert.IsTrue(IsUuid(autonomyReportId),  $"discovered autonomy_report_id uuid (got '{autonomyReportId}')");

            Debug.Log($"[AutonomyInboxE2E] seeded — player={playerId} exceptionLtId={exceptionLtId} autonomyReportId={autonomyReportId}");
            seeded = true;
        }

        private static string FindRepoRoot()
        {
            DirectoryInfo dir = new DirectoryInfo(Application.dataPath);
            for (int i = 0; i < 6 && dir != null; i++)
            {
                if (File.Exists(System.IO.Path.Combine(dir.FullName, "Tools", "seed_operational_demo.mjs")))
                    return dir.FullName;
                dir = dir.Parent;
            }
            return null;
        }

        // Resolve an absolute path to a binary. The Editor doesn't inherit the login shell's PATH, so we probe:
        // an env override, $PATH entries, nvm versions (for node), and common fixed dirs. Returns null if none found.
        private static string ResolveBin(string name, string envVar)
        {
            string fromEnv = string.IsNullOrEmpty(envVar) ? null : Environment.GetEnvironmentVariable(envVar);
            if (!string.IsNullOrEmpty(fromEnv) && File.Exists(fromEnv)) return fromEnv;

            string path = Environment.GetEnvironmentVariable("PATH") ?? "";
            foreach (string dir in path.Split(System.IO.Path.PathSeparator))
            {
                if (string.IsNullOrEmpty(dir)) continue;
                string candidate = System.IO.Path.Combine(dir, name);
                if (File.Exists(candidate)) return candidate;
            }

            string home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);

            if (name == "node")
            {
                string nvmVersions = System.IO.Path.Combine(home, ".nvm", "versions", "node");
                if (Directory.Exists(nvmVersions))
                {
                    string best = Directory.GetDirectories(nvmVersions)
                        .Select(d => System.IO.Path.Combine(d, "bin", "node"))
                        .Where(File.Exists)
                        .OrderBy(p => p, StringComparer.Ordinal)
                        .LastOrDefault();
                    if (best != null) return best;
                }
            }

            foreach (string c in new[]
                     {
                         "/usr/local/bin/" + name,
                         "/usr/bin/" + name,
                         "/bin/" + name,
                         System.IO.Path.Combine(home, ".local", "bin", name),
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

        // ------------------------------------------------------------ the tests --

        [UnityTest]
        public IEnumerator A_InboxRendersSeededReport_BucketsOnly_NoRawScalar()
        {
            controllerGo = new GameObject("AutonomyInboxScreen");
            var ctl = controllerGo.AddComponent<AutonomyInboxController>();
            yield return ctl.SignIn();
            Assert.IsTrue(ctl.IsAuthenticated, ctl.AuthError);
            yield return ctl.LoadReports();
            Assert.IsTrue(ctl.ReportsLoaded, ctl.ReportsError);

            var report = ctl.Reports.FirstOrDefault(r => r.report_id == autonomyReportId);
            Assert.IsNotNull(report, "seeded autonomy report missing from the inbox");
            Assert.AreEqual(2, report.issues.Length);
            Assert.AreEqual("MINIMAL", report.issues[0].option_a.projected_outcome);
            Assert.AreEqual("TRADEOFF", report.issues[0].option_b.projected_outcome);
            Assert.IsTrue(string.IsNullOrEmpty(report.issues[0].decided), "undecided issue must read empty");
            Assert.AreEqual(exceptionLtId, report.lieutenant_id);

            Assert.That(ctl.RenderedTexts, Does.Contain("[~] Minimal"));
            Assert.That(ctl.RenderedTexts, Does.Contain("[<>] Tradeoff"));
            foreach (string t in ctl.RenderedTexts)
                Assert.IsFalse(Regex.IsMatch(t, @"(?<![A-Za-z])\d+(\.\d+)?(?![A-Za-z])"), $"raw scalar leaked client-side: '{t}'");
        }

        [UnityTest]
        public IEnumerator B_ChooseA_ResolvesIssue_DecidedVisible_409OnSecond()
        {
            controllerGo = new GameObject("AutonomyInboxScreen");
            var ctl = controllerGo.AddComponent<AutonomyInboxController>();
            yield return ctl.SignIn();
            Assert.IsTrue(ctl.IsAuthenticated, ctl.AuthError);
            yield return ctl.LoadReports();
            var report = ctl.Reports.First(r => r.report_id == autonomyReportId);
            var issue1 = report.issues.First(i => i.issue_id == "iss_demo_1");

            yield return ctl.Resolve(report, issue1, "A");
            Assert.IsNull(ctl.LastError, ctl.LastError);
            Assert.IsNotEmpty(ctl.LastOutcome);

            // decided='A' VISIBLE through the UI after the auto re-fetch (the T2-review tracked requirement):
            var reloaded = ctl.Reports.First(r => r.report_id == autonomyReportId);
            Assert.AreEqual("A", reloaded.issues.First(i => i.issue_id == "iss_demo_1").decided);
            Assert.IsTrue(string.IsNullOrEmpty(reloaded.issues.First(i => i.issue_id == "iss_demo_2").decided));
            Assert.That(ctl.RenderedTexts, Does.Contain("✓ Decided"));

            // 409 on the second resolve of the same issue — readable (F2).
            var ac = new AutonomyClient();
            ResolveIssueResponse dup = null; string dupErr = null; long dupCode = 0;
            yield return ac.ResolveIssue(report.report_id, "iss_demo_1", "A", ctl.Token,
                r => dup = r, (code, m) => { dupCode = code; dupErr = m; });
            Assert.IsNull(dup, "second resolve of a decided issue must not succeed");
            Assert.AreEqual(409, (int)dupCode);
            Assert.IsNotEmpty(dupErr);
        }

        [UnityTest]
        public IEnumerator C_LieutenantGauge_DepletedThenResetThenCooldown()
        {
            controllerGo = new GameObject("LieutenantScreen");
            var ctl = controllerGo.AddComponent<LieutenantScreenController>();
            yield return ctl.SignIn();
            Assert.IsTrue(ctl.IsAuthenticated, ctl.AuthError);
            ctl.OpenLieutenant(exceptionLtId);
            float deadline = Time.realtimeSinceStartup + 10f;
            while (ctl.BudgetBands.Count == 0 && Time.realtimeSinceStartup < deadline) yield return null;
            Assert.IsTrue(ctl.BudgetBands.Any(kv => kv.Key == "PRODUCTION_OPS" && kv.Value == "depleted"),
                "seeded PRODUCTION_OPS must read depleted");
            Assert.That(ctl.RenderedTexts, Does.Contain("[....] Depleted"));

            yield return ctl.Decide("reset_budget");
            Assert.IsNull(ctl.LastDecisionError, ctl.LastDecisionError);
            Assert.IsTrue(ctl.BudgetBands.Any(kv => kv.Key == "PRODUCTION_OPS" && kv.Value == "full"),
                "reset_budget must restore the band to full");
            Assert.That(ctl.RenderedTexts, Does.Contain("[####] Full"));
            Assert.IsFalse(ctl.RenderedTexts.Contains("[....] Depleted"), "stale depleted band must leave the corpus");

            yield return ctl.Decide("reset_budget"); // immediate same-kind repeat → cooldown
            Assert.IsNotEmpty(ctl.LastDecisionError, "second same-kind decision inside the cooldown must surface a readable 409");

            foreach (string t in ctl.RenderedTexts)
                Assert.IsFalse(Regex.IsMatch(t, @"(?<![A-Za-z])\d+(\.\d+)?(?![A-Za-z])"), $"raw scalar leaked client-side: '{t}'");
        }

        [UnityTest]
        public IEnumerator D_DashboardSurfaces_AutonomyNote_Nav()
        {
            controllerGo = new GameObject("DashboardScreen");
            var dash = controllerGo.AddComponent<DashboardController>();
            yield return dash.SignIn();
            Assert.IsTrue(dash.IsAuthenticated, dash.AuthError);
            yield return dash.LoadDashboard();
            Assert.IsTrue(dash.DashboardLoaded);

            Assert.IsTrue(dash.PendingAutonomyReports.Length > 0, "the seeded report (issue 2 undecided) must still be open");
            Assert.IsTrue(dash.RenderedTexts.Any(t => t.Contains("Autonomy reports waiting")), "autonomy alerts note missing");
            foreach (string t in dash.RenderedTexts)
                Assert.IsFalse(Regex.IsMatch(t, @"(?<![A-Za-z])\d+(\.\d+)?(?![A-Za-z])"), $"raw scalar leaked client-side: '{t}'");

            dash.OpenAutonomy();
            Assert.AreEqual(DashboardController.NavTarget.Autonomy, dash.LastNavTarget);
            Assert.IsNotNull(dash.LastNavGameObject.GetComponent<AutonomyInboxController>());
        }
    }
}
