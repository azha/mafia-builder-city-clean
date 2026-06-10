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
    // P20-T9 — Tier-2 gate E2E (charter 27: NO MOCK). Two tests:
    //   A — funnel: tier 1 gate closed both sides (UI + backend), real funnel unlock (3 seeded resolves),
    //       Tier-2 source validates + attaches, PEER_STATE round-trips in script_source.
    //   B — condField realign: a MY_STATE condField from another archetype's palette reseeds when
    //       PickedArchetype switches (pre-recruit path, state-free).
    // -- session:2026-06-10 (Phase-20 T9) --
    public class RuleEditorTier2PlayModeTests
    {
        private GameObject controllerGo;

        // Discovered from the seeder's stdout (see RunSeeder).
        private static string demoEmail;
        private static string demoPassword;
        private static string playerId;
        private static string labId;
        private static string exceptionLtId;
        private static bool seeded;

        private const string BaseUrl = "http://localhost";

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

            demoEmail     = ExtractString(json, "email");
            demoPassword  = ExtractString(json, "password");
            playerId      = ExtractString(json, "playerId");
            labId         = ExtractString(json, "lab");
            exceptionLtId = ExtractString(json, "exception_lieutenant_id");

            Assert.IsFalse(string.IsNullOrEmpty(demoEmail),    "discovered demo email");
            Assert.IsFalse(string.IsNullOrEmpty(demoPassword), "discovered demo password");
            Assert.IsTrue(IsUuid(playerId),      $"discovered player uuid (got '{playerId}')");
            Assert.IsTrue(IsUuid(labId),         $"discovered lab uuid (got '{labId}')");
            Assert.IsTrue(IsUuid(exceptionLtId), $"discovered exception_lieutenant_id uuid (got '{exceptionLtId}')");

            Debug.Log($"[Tier2E2E] seeded — player={playerId} lab={labId} exceptionLtId={exceptionLtId} email={demoEmail}");
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

        // ---------------------------------------------------------------- the tests --

        [UnityTest]
        public IEnumerator A_TierGate_LocksThenUnlocks_PeerStateAttachRoundTrips()
        {
            controllerGo = new GameObject("LieutenantScreen");
            var ctl = controllerGo.AddComponent<LieutenantScreenController>();
            yield return ctl.SignIn();
            Assert.IsTrue(ctl.IsAuthenticated, ctl.AuthError);

            // ---- Tier 1: gate closed on BOTH sides (UI hides the slot; the backend 422s the source). ----
            Assert.AreEqual(1, ctl.VocabularyTier);
            Assert.IsFalse(ctl.ConditionEditorVisible);

            ctl.OpenLieutenant(exceptionLtId); // select the seeded exception-demo COOK (LastRecruitedId ← id)
            float deadline = Time.realtimeSinceStartup + 10f;
            while (ctl.CurrentBands == null && Time.realtimeSinceStartup < deadline) yield return null;
            Assert.IsNotNull(ctl.CurrentBands, "bands never loaded for the seeded lieutenant");

            var tier2Rule = new RuleRow("STATE", "cook_idle", "==", "true", "PAUSE_OPS", 90)
            {
                condKind = "PEER_STATE",
                condPeerRole = "COOK",
                condPeerZone = "same_building",
                condField = "heat",
                condComparator = ">=",
                condValue = "0.5",
            };
            // The serializer emits the exact Tier-2 source (deterministic — assert it BEFORE the round-trip).
            Assert.AreEqual(
                "WHEN STATE(cook_idle,==,true) AND_IF PEER_STATE(cook@same_building,heat,>=,0.5) THEN PAUSE_OPS @90;",
                RuleModel.SerializeRule(tier2Rule));

            ctl.SetRules(new List<RuleRow> { tier2Rule });
            // The controller logs the rejection via Debug.LogError (the raw code stays on the log line, readable
            // message goes to the UI). PlayMode fails on an unhandled LogError, so EXPECT it: this 422 is the
            // whole point of this section (the backend must reject a Tier-2 source at Tier 1).
            LogAssert.Expect(LogType.Error, new Regex(@"\[Lieutenant\] validate rejected \(422\)"));
            yield return ctl.ValidateRules();
            Assert.IsTrue(ctl.LastDiagnostics.Any(d => d.kind == "TIER_NOT_UNLOCKED"),
                "a Tier-2 source must be tier-gated at tier 1");

            // ---- Unlock via the REAL funnel: resolve 3 seeded cards (2 ADD_RULE distinct + 1 ONE_TIME). ----
            var ec = new ExceptionsClient();
            ExceptionCardDto[] cards = null; string qerr = null;
            yield return ec.GetQueue(ctl.Token, c => cards = c, (code, m) => qerr = m);
            Assert.IsNotNull(cards, qerr);

            yield return ResolveByDescriptor(ec, ctl.Token, cards, "exc_demo_teach_heat", "ADD_RULE");
            yield return ResolveByDescriptor(ec, ctl.Token, cards, "exc_demo_teach_idle", "ADD_RULE");
            yield return ResolveByDescriptor(ec, ctl.Token, cards, "exc_demo_one_time",   "ONE_TIME");

            yield return ctl.RefreshProgression();
            Assert.AreEqual(2, ctl.VocabularyTier, "the dual gate (2 taught / 3 handled) must unlock Tier 2");
            Assert.IsTrue(ctl.ConditionEditorVisible);

            // ---- Tier 2: the SAME source now validates + attaches; the script round-trips. ----
            yield return ctl.ValidateRules();
            Assert.AreEqual("Script valid ✓", ctl.LastOutcome);
            yield return ctl.AttachRules();
            Assert.IsNotNull(ctl.CurrentBands);
            StringAssert.Contains("AND_IF PEER_STATE(cook@same_building,heat,>=,0.5)", ctl.CurrentBands.script_source);
        }

        [UnityTest]
        public IEnumerator B_ArchetypeSwitch_RealignsStrandedMyStateConditionField()
        {
            // Pure hook-level check of the P20-T8 review fix: a MY_STATE condField from another archetype's
            // palette must be reseeded when the builder palette switches (pre-recruit picker path).
            controllerGo = new GameObject("LieutenantScreen");
            var ctl = controllerGo.AddComponent<LieutenantScreenController>();
            yield return null; // let EnsureInitialized run via Start

            var rule = new RuleRow("STATE", "cook_idle", "==", "true", "EXECUTE_DEFAULT", 50)
            {
                condKind = "MY_STATE",
                condField = "cook_idle",
                condComparator = "==",
                condValue = "true",
            };
            ctl.SetRules(new List<RuleRow> { rule });

            ctl.PickedArchetype = "SECURITY"; // pre-recruit: the builder palette follows the picker → realign runs

            Assert.AreEqual("building_damaged", ctl.Rules[0].condField,
                "a stranded cross-archetype MY_STATE condField must reseed to the new palette's first field");
            Assert.AreEqual("building_damaged", ctl.Rules[0].field,
                "the trigger field realigns too (pre-existing behavior)");
        }

        // Resolve one seeded card by descriptor: ADD_RULE picks the teachable candidate, ONE_TIME the plain one.
        private static IEnumerator ResolveByDescriptor(ExceptionsClient ec, string token,
            ExceptionCardDto[] cards, string descriptor, string method)
        {
            ExceptionCardDto card = cards.First(c => c.event_descriptor == descriptor);
            CandidateActionDto cand = method == "ADD_RULE"
                ? card.candidate_actions.First(a => !string.IsNullOrEmpty(a.add_rule_dsl))
                : card.candidate_actions.First(a => string.IsNullOrEmpty(a.add_rule_dsl));
            ResolveResponse res = null; string err = null;
            yield return ec.Resolve(card.exception_id, method, cand.id, token, r => res = r, (code, m) => err = m);
            Assert.IsNotNull(res, $"{descriptor} {method} resolve failed: {err}");
        }
    }
}
