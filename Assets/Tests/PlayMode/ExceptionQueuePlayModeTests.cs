using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Operational.Exceptions;
using MafiaCleanCity.Operational.Lieutenant;
using Debug = UnityEngine.Debug;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    // P20-T6 — Exception Queue E2E (charter 27: NO MOCK). Drives ExceptionQueueController +
    // ExceptionDetailController against the live dockerised stack (Traefik @ http://localhost).
    //   A — render/scan: 4 seeded cards present, bands closed-domain, MethodFor derivation, no raw scalar.
    //   B — resolve loop: ONE_TIME, 409 duplicate, ADD_RULE (script round-trips on the lieutenant), funnel moves off LOCKED.
    //   C — dashboard surfaces the pending note, Vocabulary row, and the Exceptions nav.
    // -- session:2026-06-10 (Phase-20 T6) --
    public class ExceptionQueuePlayModeTests
    {
        private GameObject controllerGo;

        // Discovered from the seeder's stdout (see RunSeeder).
        private static string demoEmail;
        private static string demoPassword;
        private static string playerId;
        private static string labId;
        private static string exceptionLtId;
        private static bool seeded;

        // Resolved once (the Editor doesn't inherit the login-shell PATH).
        private static string dockerBin;

        private const string BaseUrl = "http://localhost";
        private const string ComposeProject = "mafia-clean-city";
        private const string PgUser = "mafia";
        private const string PgDb = "mafia_clean_city";

        [TearDown]
        public void TearDown()
        {
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

            demoEmail    = ExtractString(json, "email");
            demoPassword = ExtractString(json, "password");
            playerId     = ExtractString(json, "playerId");
            labId        = ExtractString(json, "lab");
            exceptionLtId = ExtractString(json, "exception_lieutenant_id");

            Assert.IsFalse(string.IsNullOrEmpty(demoEmail),    "discovered demo email");
            Assert.IsFalse(string.IsNullOrEmpty(demoPassword), "discovered demo password");
            Assert.IsTrue(IsUuid(playerId),       $"discovered player uuid (got '{playerId}')");
            Assert.IsTrue(IsUuid(labId),          $"discovered lab uuid (got '{labId}')");
            Assert.IsTrue(IsUuid(exceptionLtId),  $"discovered exception_lieutenant_id uuid (got '{exceptionLtId}')");

            Debug.Log($"[ExceptionQueueE2E] seeded — player={playerId} lab={labId} exceptionLtId={exceptionLtId} email={demoEmail}");
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
        public IEnumerator A_QueueRendersSeededCards_BandsOnly_NoRawScalar()
        {
            controllerGo = new GameObject("ExceptionQueueScreen");
            var ctl = controllerGo.AddComponent<ExceptionQueueController>();
            yield return ctl.SignIn();
            Assert.IsTrue(ctl.IsAuthenticated, ctl.AuthError);
            yield return ctl.LoadQueue();
            Assert.IsTrue(ctl.QueueLoaded, ctl.QueueError);

            // The 4 seeded cards are present (producers may add more — assert contains, never exact count).
            string[] descriptors = ctl.Cards.Select(c => c.event_descriptor).ToArray();
            foreach (string d in new[] { "exc_demo_teach_heat", "exc_demo_teach_idle", "exc_demo_one_time", "exc_demo_raid_style" })
                Assert.That(descriptors, Does.Contain(d), $"seeded card {d} missing from the queue");

            // Bands are CLOSED labels — and the seeded scalars landed in the intended bands.
            foreach (var c in ctl.Cards)
            {
                Assert.That(new[] { "TENTATIVE", "LIKELY", "CONFIDENT" }, Does.Contain(c.confidence_band),
                    $"confidence_band '{c.confidence_band}' not in closed set for card {c.event_descriptor}");
                Assert.That(new[] { "LOW", "MEDIUM", "HIGH" }, Does.Contain(c.priority_band),
                    $"priority_band '{c.priority_band}' not in closed set for card {c.event_descriptor}");
                Assert.That(new[] { "LOW", "MEDIUM", "HIGH" }, Does.Contain(c.severity_band),
                    $"severity_band '{c.severity_band}' not in closed set for card {c.event_descriptor}");
            }
            var heat = ctl.Cards.First(c => c.event_descriptor == "exc_demo_teach_heat");
            Assert.AreEqual("CONFIDENT", heat.confidence_band);
            Assert.AreEqual("HIGH", heat.priority_band);
            Assert.AreEqual("HIGH", heat.severity_band);
            Assert.IsNotEmpty(heat.lieutenant_id, "teach card must be lieutenant-bound");

            // Raid-style card: effect-bearing candidates + the action-bound method derivation.
            var raid = ctl.Cards.First(c => c.event_descriptor == "exc_demo_raid_style");
            var fix = raid.candidate_actions.First(a => a.id == "fix_quiet");
            Assert.AreEqual("REPAIR", ExceptionDetailController.MethodFor(fix, addAsRule: false));
            Assert.AreEqual("REPAIR", ExceptionDetailController.MethodFor(fix, addAsRule: true)); // effect wins over the toggle
            var teachCand = heat.candidate_actions.First(a => a.id == "teach_heat");
            Assert.AreEqual("ONE_TIME", ExceptionDetailController.MethodFor(teachCand, addAsRule: false));
            Assert.AreEqual("ADD_RULE", ExceptionDetailController.MethodFor(teachCand, addAsRule: true));
            var plain = heat.candidate_actions.First(a => a.id == "let_ride");
            Assert.AreEqual("ONE_TIME", ExceptionDetailController.MethodFor(plain, addAsRule: true)); // no DSL → never ADD_RULE

            // R2.2 scan — no standalone digit in the tracked corpus (free producer text is component-tracked chrome).
            foreach (string t in ctl.RenderedTexts)
                Assert.IsFalse(Regex.IsMatch(t, @"(?<![A-Za-z])\d+(\.\d+)?(?![A-Za-z])"), $"raw scalar leaked client-side: '{t}'");
        }

        [UnityTest]
        public IEnumerator B_ResolveLoop_OneTime_AddRule_ProgressionMoves()
        {
            controllerGo = new GameObject("ExceptionQueueScreen");
            var ctl = controllerGo.AddComponent<ExceptionQueueController>();
            yield return ctl.SignIn();
            Assert.IsTrue(ctl.IsAuthenticated, ctl.AuthError);
            yield return ctl.LoadQueue();
            Assert.IsTrue(ctl.QueueLoaded, ctl.QueueError);

            // Funnel starts LOCKED (fresh seed: tier 1, nothing taught/handled).
            var prog = new ProgressionClient();
            ProgressionDto before = null; string perr = null;
            yield return prog.GetProgression(ctl.Token, d => before = d, (code, m) => perr = m);
            Assert.IsNotNull(before, perr);
            Assert.AreEqual(1, before.vocabulary_tier);
            Assert.AreEqual("LOCKED", before.progress_to_next);

            // ONE_TIME resolve via the detail screen → outcome shown, card gone after the back-refresh.
            var oneTime = ctl.Cards.First(c => c.event_descriptor == "exc_demo_one_time");
            ctl.OpenDetail(oneTime);
            var detail = ctl.LastDetail;
            Assert.IsNotNull(detail);
            yield return detail.ResolveWith(oneTime.candidate_actions[0]);
            Assert.IsNull(detail.LastError, detail.LastError);
            Assert.IsNotEmpty(detail.LastOutcome);
            detail.Back();
            yield return null; // let Destroy + the back-refresh coroutine start
            // Post-Back teardown (review C1): the detail's canvas overlay must be GONE — no orphaned
            // backdrop/sheet occluding the queue.
            Assert.IsNull(GameObject.Find("ExceptionDetailSheet"), "detail sheet must be destroyed on Back");
            Assert.IsNull(GameObject.Find("ExceptionDetailBackdrop"), "detail backdrop must be destroyed on Back");
            yield return ctl.LoadQueue();
            Assert.IsFalse(ctl.Cards.Any(c => c.event_descriptor == "exc_demo_one_time"), "resolved card must leave the pending queue");

            // 409 path (spec §7): resolving the SAME card again → no success + a readable conflict message.
            var ec = new ExceptionsClient();
            ResolveResponse dup = null; string dupErr = null; long dupCode = 0;
            yield return ec.Resolve(oneTime.exception_id, "ONE_TIME", oneTime.candidate_actions[0].id, ctl.Token,
                r => dup = r, (code, m) => { dupCode = code; dupErr = m; });
            Assert.IsNull(dup, "a second resolve of the same card must not succeed");
            Assert.AreEqual(409, (int)dupCode);
            Assert.IsNotEmpty(dupErr, "the 409 must surface a readable message (F2)");

            // ADD_RULE resolve (toggle ON) → the taught rule round-trips on the seeded lieutenant's script.
            var teach = ctl.Cards.First(c => c.event_descriptor == "exc_demo_teach_heat");
            ctl.OpenDetail(teach);
            detail = ctl.LastDetail;
            detail.SetAddAsRule(true);
            var cand = teach.candidate_actions.First(a => !string.IsNullOrEmpty(a.add_rule_dsl));
            yield return detail.ResolveWith(cand);
            Assert.IsNull(detail.LastError, detail.LastError);
            Assert.IsNotEmpty(detail.LastOutcome);

            var lc = new LieutenantClient();
            LieutenantBands bands = null; string lerr = null;
            yield return lc.GetBands(exceptionLtId, ctl.Token, b => bands = b, (code, m) => lerr = m);
            Assert.IsNotNull(bands, lerr);
            StringAssert.Contains("PAUSE_OPS", bands.script_source, "the taught heat rule must land on the lieutenant's script");

            // Progression moved off LOCKED (handled ≥ 1 + one taught signal → IN_PROGRESS at minimum).
            ProgressionDto after = null;
            yield return prog.GetProgression(ctl.Token, d => after = d, (code, m) => perr = m);
            Assert.IsNotNull(after, perr);
            Assert.AreNotEqual("LOCKED", after.progress_to_next);
        }

        [UnityTest]
        public IEnumerator C_DashboardSurfaces_PendingNote_VocabRow_ExceptionsNav()
        {
            controllerGo = new GameObject("DashboardScreen");
            var dash = controllerGo.AddComponent<DashboardController>();
            yield return dash.SignIn();
            Assert.IsTrue(dash.IsAuthenticated, dash.AuthError);
            yield return dash.LoadDashboard();
            Assert.IsTrue(dash.DashboardLoaded);

            // Pending cards remain after B (teach_idle + raid_style) → the digit-free alerts note shows.
            Assert.IsTrue(dash.PendingExceptions.Length > 0, "seeded pending cards expected");
            Assert.IsTrue(dash.RenderedTexts.Any(t => t.Contains("Exceptions waiting")), "pending alerts note missing");

            // Vocab row label is tracked; its value (Tier digit) is chrome — assert via the hook, not the corpus.
            Assert.IsTrue(dash.RenderedTexts.Any(t => t == "Vocabulary"), "vocabulary row label missing");
            Assert.IsNotNull(dash.CurrentProgression);
            Assert.That(new[] { "LOCKED", "IN_PROGRESS", "UNLOCKED" }, Does.Contain(dash.CurrentProgression.progress_to_next),
                $"progress_to_next '{dash.CurrentProgression.progress_to_next}' not in closed set");

            // The dashboard scan still holds with the new surfaces.
            foreach (string t in dash.RenderedTexts)
                Assert.IsFalse(Regex.IsMatch(t, @"(?<![A-Za-z])\d+(\.\d+)?(?![A-Za-z])"), $"raw scalar leaked client-side: '{t}'");

            // Nav opens the queue screen.
            dash.OpenExceptions();
            Assert.AreEqual(DashboardController.NavTarget.Exceptions, dash.LastNavTarget);
            Assert.IsNotNull(dash.LastNavGameObject.GetComponent<ExceptionQueueController>());
        }
    }
}
