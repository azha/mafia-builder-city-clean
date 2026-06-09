using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.TestTools;
using MafiaCleanCity.Operational.Lieutenant;
using Debug = UnityEngine.Debug;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    // Phase-11 (lieutenant tenure inertia) CAPSTONE — the tenure/effect-chips + SETTLING band + reassign proof (charter 27:
    // NO MOCK). The sibling of LieutenantRuleEditorPlayModeTests / LieutenantUiExtensionPlayModeTests: it drives the SAME
    // real LieutenantScreenController against the live dockerized stack (Traefik @ http://localhost), reusing those fixtures'
    // scaffolding 1:1 (the seeder run, the Psql + ResetRoster + Advance helpers, the sign-in/auth-wait bring-up, the
    // Destroyed-guarded async idiom). Where the Phase-9 capstone proved the COOK rule-editor LOOP and Phase-10 proved the UI
    // EXTENSION, THIS capstone proves the Phase-11 TENURE INERTIA surface:
    //   (1) ACCRUAL + CHIPS: recruit+delegate a COOK, author+attach a delegated rule, fast-forward ticks (Advance) → the
    //       card's tenure_bucket chip PROMOTES past FRESH (the accrual is heat-INDEPENDENT — the A2 tick accrues +1 streak
    //       every non-paused, non-settling delegated tick, so a cook-only rule with NO pause rule accrues regardless of the
    //       hot operational_demo city), and the 3 effect chips (re-script cost / move settling / yield bonus) render;
    //   (2) RE-SCRIPT SETTLING: re-script a tenured lieutenant (a genuine REVISION — the backend opens the settling window
    //       ONLY on a valid→valid re-attach, never the first authoring) → op_state_band shows SETTLING → resumes after the
    //       window (Advance past it → a non-SETTLING band);
    //   (3) REASSIGN RESET: ReassignChosen() to a SECOND seeded operational building → the bands show tenure_bucket == FRESH
    //       (the move forfeits the accumulated tenure). A COOK has exactly ONE valid host type ('lab'), so the reassign case
    //       uses a SECURITY lieutenant (security-binding.validateAssignment accepts ANY owned operational building) recruited
    //       on the lab and moved to the distribution_hub — both valid SECURITY hosts, a genuine cross-building move;
    //   (4) NO-RAW-SCALAR: scan RenderedTexts (the tenure/effect chips are WORDED bands) → assert NO digit leaks (R2.2 — the
    //       SAME regex the sibling capstones use; the bucket/cost/settling/bonus labels are all closed-domain words).
    //
    // The op_state is driven by the ATTACHED RULES + the tenure/settling state machine (deterministic, test-controlled), NOT
    // by trying to pin the building's heat: the operational_demo city runs HOT (the MINUTE/4 heat-propagation tick recomputes
    // buildings.heat toward the burning-city level before the MINUTE/19 LIEUTENANT_TICK reads it), so a psql UPDATE
    // buildings.heat cannot hold heat low. Accrual + SETTLING are heat-independent here: a cook-only rule (no PAUSE rule)
    // resolves EXECUTE_DEFAULT every tick → never paused → accrues; the settling window is armed by the re-script/reassign
    // itself, not by heat. (This mirrors how the Phase-9 capstone drives op_state via the attached rules.)
    public class LieutenantTenureInertiaPlayModeTests
    {
        private GameObject controllerGo;

        // Discovered from the seeder's stdout (see RunSeeder).
        private static string demoEmail;
        private static string demoPassword;
        private static string playerId;
        private static string labId;          // the COOK host (the seeder's "lab" == "raided_building").
        private static string secondHostId;   // a SECOND owned operational building (distribution_hub, fallback money_holding) — the SECURITY reassign destination.
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

        // Seed THIS fixture's precondition immediately before its tests run (NUnit guarantees OneTimeSetUp fires after any
        // prior fixture completes and before this fixture's first test). The operational seeder deletes + recreates this
        // player's buildings with new ids; seeding here makes the seed→use atomic per fixture and the full PlayMode suite
        // order-independent (a sibling op fixture's re-seed can never invalidate the ids THIS fixture loads).
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
            playerId = ExtractString(json, "playerId");
            // The lab is the seeder's "lab" building (== "raided_building"); both name it. Read "lab".
            labId = ExtractString(json, "lab");
            // The reassign destination: a SECOND owned operational building, printed at the TOP LEVEL of the result JSON with
            // the SAME flat extractor. Prefer the distribution_hub (distinct from the lab); fall back to money_holding. The
            // reassign case uses a SECURITY lieutenant, which accepts ANY owned operational building, so either is valid.
            secondHostId = ExtractString(json, "distribution_hub") ?? ExtractString(json, "money_holding");

            Assert.IsFalse(string.IsNullOrEmpty(demoEmail), "discovered demo email");
            Assert.IsFalse(string.IsNullOrEmpty(demoPassword), "discovered demo password");
            Assert.IsTrue(IsUuid(playerId), $"discovered player uuid (got '{playerId}')");
            Assert.IsTrue(IsUuid(labId), $"discovered lab uuid (got '{labId}')");
            Assert.IsTrue(IsUuid(secondHostId), $"discovered a 2nd operational building uuid for the reassign destination (got '{secondHostId}')");
            Assert.AreNotEqual(labId, secondHostId, "the reassign destination is a DISTINCT building from the lab");

            Debug.Log($"[LieutenantTenureE2E] seeded — player={playerId} lab={labId} secondHost={secondHostId} email={demoEmail}");
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

        // Resolve an absolute path to a binary. The Editor doesn't inherit the login shell's PATH, so we probe:
        // an env override, $PATH entries, nvm versions (for node), and common fixed dirs. Returns null if none found.
        private static string ResolveBin(string name, string envVar)
        {
            string fromEnv = string.IsNullOrEmpty(envVar) ? null : Environment.GetEnvironmentVariable(envVar);
            if (!string.IsNullOrEmpty(fromEnv) && File.Exists(fromEnv)) return fromEnv;

            string path = Environment.GetEnvironmentVariable("PATH") ?? "";
            foreach (string dir in path.Split(Path.PathSeparator))
            {
                if (string.IsNullOrEmpty(dir)) continue;
                string candidate = Path.Combine(dir, name);
                if (File.Exists(candidate)) return candidate;
            }

            string home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);

            if (name == "node")
            {
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
            }

            foreach (string c in new[]
                     {
                         "/usr/local/bin/" + name,
                         "/usr/bin/" + name,
                         "/bin/" + name,
                         Path.Combine(home, ".local", "bin", name),
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

        // -------- the live-stack helpers (same mechanism the seeder uses) --------

        // Run a single SQL statement inside the pg container (the SAME `docker compose exec pg psql` the seeder uses).
        // Resolves an absolute docker binary (the Editor doesn't inherit the login-shell PATH). Asserts exit 0.
        private static string Psql(string sql)
        {
            if (dockerBin == null) dockerBin = ResolveBin("docker", "DOCKER_BIN");
            Assert.IsNotNull(dockerBin, "could not locate a 'docker' binary (checked PATH, common dirs)");

            var psi = new ProcessStartInfo
            {
                FileName = dockerBin,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
            };
            foreach (string a in new[]
                     {
                         "compose", "--project-name", ComposeProject, "exec", "-T", "pg",
                         "psql", "-U", PgUser, "-d", PgDb, "-v", "ON_ERROR_STOP=1", "-tAc", sql,
                     })
                psi.ArgumentList.Add(a);

            string stdout, stderr;
            using (var proc = Process.Start(psi))
            {
                stdout = proc.StandardOutput.ReadToEnd();
                stderr = proc.StandardError.ReadToEnd();
                proc.WaitForExit(30000);
                Assert.IsTrue(proc.HasExited, "psql did not finish within 30s");
                Assert.AreEqual(0, proc.ExitCode, $"psql failed (exit {proc.ExitCode}) for SQL: {sql}\nstderr:\n{stderr}");
            }
            return stdout.Trim();
        }

        // Prep the lab so a delegated COOK resolves cleanly (repair it — the seeder raids it → DAMAGED, clear the audit pin,
        // set heat low, (re)seed precursor). The accrual is heat-INDEPENDENT (the tick accrues +1 every non-paused tick), but
        // a clean operational lab lets the cook-only rule resolve EXECUTE_DEFAULT (never PAUSE) deterministically.
        private static void PrepLab(double heatValue)
        {
            Psql($"UPDATE building_operational_state SET structural_state='operational' WHERE building_id='{labId}';");
            Psql($"UPDATE buildings SET heat={heatValue.ToString(System.Globalization.CultureInfo.InvariantCulture)}, audit_pin_expires_at=NULL WHERE building_id='{labId}';");
            Psql($"DELETE FROM precursor_stock WHERE building_id='{labId}';");
            Psql($"INSERT INTO precursor_stock (player_id, building_id, precursor_type, quantity_units) VALUES ('{playerId}','{labId}','pyralin',20);");
        }

        // Clear the player's lieutenant roster (+ the orphaned 1-1 behavior_script rows) so EACH test recruits FRESH into an
        // empty roster — the roster cap (T.lieutenant.max_count_per_player; this stack caps at 2) would otherwise 409 an
        // accumulated recruit once tests accumulate. The seeder runs ONCE per fixture ([OneTimeSetUp]); the tests recruit
        // per-test. Same FK-order the seeder reset uses: capture the behavior_script_ids → delete the lieutenant rows →
        // delete the now-orphaned behavior_script rows.
        private static void ResetRoster()
        {
            string scriptIds = Psql(
                "SELECT COALESCE(string_agg(quote_literal(behavior_script_id::text), ','), '') " +
                $"FROM lieutenant WHERE player_id='{playerId}' AND behavior_script_id IS NOT NULL;");
            Psql($"DELETE FROM lieutenant WHERE player_id='{playerId}';");
            if (!string.IsNullOrEmpty(scriptIds))
                Psql($"DELETE FROM behavior_script WHERE script_id IN ({scriptIds});");
        }

        // Advance the player's in-game clock N ticks via the deterministic harness (no auth; Idempotency-Key mandated). Each
        // tick is one game minute → the MINUTE/19 LIEUTENANT_TICK fires once per tick (the delegation evaluation + the A2
        // tenure accrual / settling expiry).
        private static IEnumerator Advance(int ticks)
        {
            string url = $"{BaseUrl}/v1/_test/citysim/advance?ticks={ticks}&player_id={playerId}";
            using (var req = new UnityWebRequest(url, UnityWebRequest.kHttpVerbPOST))
            {
                req.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes("{}"));
                req.downloadHandler = new DownloadHandlerBuffer();
                req.timeout = 60;
                req.SetRequestHeader("Content-Type", "application/json");
                req.SetRequestHeader("Idempotency-Key", Guid.NewGuid().ToString());
                yield return req.SendWebRequest();
                Assert.AreEqual(UnityWebRequest.Result.Success, req.result,
                    $"advance harness failed (http={req.responseCode}) {req.error}");
            }
        }

        // -------- shared per-test controller bring-up --------

        // Instantiate the controller, point it at the live stack with the discovered creds, sign in, reset the roster to
        // empty (so the per-test recruit lands under the cap-of-2). Leaves the controller authenticated (no recruit yet —
        // the per-test body recruits the archetype it needs). Destroyed-guarded resumes.
        private IEnumerator BringUpSignedIn(System.Action<LieutenantScreenController> onReady)
        {
            controllerGo = new GameObject("LieutenantScreenController");
            var controller = controllerGo.AddComponent<LieutenantScreenController>();
            controller.SetBaseUrl(BaseUrl);
            // The controller signs in with its own demo creds; the seeder seeds the SAME operational demo player, so the
            // defaults match the discovered creds. Assert the match so a future seeder/controller drift fails loudly here.
            Assert.AreEqual("operational_demo@example.test", demoEmail,
                "the seeder's demo email matches the controller's default demo identifier");

            float elapsed = 0f;
            yield return controller.SignIn();
            while (!controller.IsAuthenticated && controller.AuthError == null && elapsed < 20f)
            {
                elapsed += Time.deltaTime; yield return null;
            }
            Assert.IsNull(controller.AuthError, $"sign-in errored: {controller.AuthError}");
            Assert.IsTrue(controller.IsAuthenticated, "controller signed in (Bearer acquired)");

            ResetRoster();
            onReady(controller);
        }

        // Recruit ONE lieutenant of the given archetype on the given host via the PICKER path. COOK + SECURITY are single-
        // building archetypes, so we set the assigned host + leave TargetBuildingId empty (NeedsTarget is false for both).
        // Asserts the returned id is a uuid + the builder palette switched to the recruited archetype.
        private IEnumerator RecruitArchetype(LieutenantScreenController controller, string archetype, string hostId, System.Action<string> onRecruited)
        {
            controller.PickedArchetype = archetype;
            controller.AssignedBuildingId = hostId;
            controller.TargetBuildingId = ""; // COOK + SECURITY are single-building archetypes (no dispatch target).
            yield return controller.RecruitChosen();
            Assert.IsTrue(IsUuid(controller.LastRecruitedId),
                $"recruit of {archetype} returned a lieutenant_id uuid (got '{controller.LastRecruitedId}', outcome='{controller.LastOutcome}')");
            Assert.AreEqual(archetype, controller.CurrentArchetype,
                $"after recruiting {archetype} the builder palette follows the recruited archetype");
            onRecruited(controller.LastRecruitedId);
        }

        // The one grounded delegated rule per archetype (built via the rule-MODEL, never UI clicks). Each is a SINGLE RuleRow
        // (→ rule_count_band FEW), grounded VERBATIM in the archetype's palette, resolving EXECUTE_DEFAULT (never PAUSE) so
        // the lieutenant accrues tenure every tick (heat-independent — no PAUSE rule to fight the hot city):
        //   COOK     → WHEN STATE(cook_idle,==,true) THEN EXECUTE_DEFAULT @10;
        //   SECURITY → WHEN STATE(building_damaged,==,true) THEN EXECUTE_DEFAULT @10;
        private static List<RuleRow> CookRule() => new List<RuleRow>
        {
            new RuleRow("STATE", "cook_idle", "==", "true", "EXECUTE_DEFAULT", 10),
        };

        private static List<RuleRow> SecurityRule() => new List<RuleRow>
        {
            new RuleRow("STATE", "building_damaged", "==", "true", "EXECUTE_DEFAULT", 10),
        };

        // Author + validate + attach the rules, then refresh the bands. Mirrors the sibling capstones' author→validate→
        // attach→bands sequence. The FIRST attach opens NO settling window (the backend arms the re-script window only on a
        // valid→valid REVISION), so after this the delegation is immediately active (and accrues on the next Advance).
        private IEnumerator AuthorValidateAttach(LieutenantScreenController controller, List<RuleRow> rules)
        {
            controller.SetRules(rules);
            Assert.AreEqual(rules.Count, controller.Rules.Count, "the demo rule(s) were authored");

            yield return controller.ValidateRules();
            Assert.AreEqual(0, controller.LastDiagnostics.Length,
                $"a valid script produces no diagnostics (got {controller.LastDiagnostics.Length}; outcome='{controller.LastOutcome}')");
            StringAssert.Contains("valid", controller.LastOutcome, "validate outcome reports the script is valid");

            yield return controller.AttachRules();
            Assert.AreEqual(0, controller.LastDiagnostics.Length, "attach of a valid script produces no diagnostics");
            Assert.IsTrue(controller.StatusShown, "the Status section rendered the bands after attach");

            yield return controller.RefreshBands();
        }

        // ------------------------------------------------------------ the tests --

        // (1) ACCRUAL + CHIPS: recruit + delegate a COOK on the lab, author + attach the delegated cook rule, fast-forward
        //     ticks → the tenure_bucket chip PROMOTES past FRESH (default thresholds 3/6/9/12 → past FRESH at streak ≥ 3) and
        //     the 3 effect chips render. The accrual is heat-independent (the A2 tick accrues +1 every non-paused tick).
        [UnityTest]
        public IEnumerator Accrual_TenureBucketPromotesPastFresh_AndEffectChipsRender()
        {
            LieutenantScreenController controller = null;
            yield return BringUpSignedIn(c => controller = c);

            // Recruit a COOK on the (prepped) lab + attach the cook-only rule (the first attach opens NO settling window).
            PrepLab(0.1);
            yield return RecruitArchetype(controller, "COOK", labId, _ => { });
            yield return AuthorValidateAttach(controller, CookRule());

            // Fresh recruit → tenure_bucket starts FRESH (no ticks accrued yet) + the rendered chip reads "Fresh".
            Assert.IsNotNull(controller.CurrentBands, "COOK bands projection parsed");
            Assert.AreEqual("FRESH", controller.CurrentBands.tenure_bucket, "a brand-new COOK starts FRESH (no accrual yet)");
            Assert.AreEqual("Fresh", controller.TenureBucketShown, "the tenure_bucket chip rendered the FRESH label");

            // Fast-forward enough ticks to clear the ACCLIMATED threshold (default 3 streak-ticks). Advance generously (8) so
            // the promotion is robust against the threshold defaults; the bucket is monotone so it never regresses.
            yield return Advance(8);
            yield return controller.RefreshBands();

            LieutenantBands b = controller.CurrentBands;
            Assert.IsNotNull(b, "bands re-projected after the accrual ticks");
            // The bucket PROMOTED past FRESH (it is one of the higher buckets — exactly which depends on the threshold defaults
            // + how many ticks landed as active accrual; we assert "no longer FRESH" + "a valid promoted bucket").
            CollectionAssert.Contains(new[] { "ACCLIMATED", "SEASONED", "SENIOR", "ENTRENCHED" }, b.tenure_bucket,
                $"the tenure_bucket promoted past FRESH after the accrual ticks (got '{b.tenure_bucket}')");
            Assert.AreNotEqual("FRESH", b.tenure_bucket, "the COOK is no longer FRESH after accruing tenure");
            Assert.AreNotEqual("Fresh", controller.TenureBucketShown,
                $"the rendered tenure_bucket chip promoted past 'Fresh' (got '{controller.TenureBucketShown}')");

            // The 3 effect chips render as WORDED bands (their closed-domain labels appear in the rendered band corpus).
            var rendered = controller.RenderedTexts;
            Assert.IsTrue(rendered.Any(t => t.StartsWith("Cheap") || t.StartsWith("Costly") || t.StartsWith("Pricey") || t.StartsWith("Very costly")),
                "the script_revision_cost chip rendered a worded cost label");
            Assert.IsTrue(rendered.Any(t => t.EndsWith("settling")),
                "the reassignment_disruption chip rendered a worded settling label");
            Assert.IsTrue(rendered.Any(t => t.EndsWith("yield bonus")),
                "the role_efficiency_bonus chip rendered a worded yield-bonus label");

            Debug.Log($"[LieutenantTenureE2E] accrual OK — bucket FRESH → {b.tenure_bucket}, chip='{controller.TenureBucketShown}', " +
                      $"cost={b.script_revision_cost} disruption={b.reassignment_disruption} bonus={b.role_efficiency_bonus}");
        }

        // (2) RE-SCRIPT SETTLING: recruit + delegate a COOK, attach (first authoring — NO window), accrue a little, then
        //     RE-attach (a genuine valid→valid REVISION) → the backend opens the re-script settling window → op_state_band
        //     SETTLING. Then Advance past the window (DISRUPT_SHORT default = 2 ticks; advance more) → the window clears → the
        //     op_state resumes to a NON-SETTLING band.
        [UnityTest]
        public IEnumerator ReScript_OpensSettlingWindow_ThenResumes()
        {
            LieutenantScreenController controller = null;
            yield return BringUpSignedIn(c => controller = c);

            PrepLab(0.1);
            yield return RecruitArchetype(controller, "COOK", labId, _ => { });

            // First authoring (false→true) — opens NO settling window (a brand-new delegation must act immediately).
            yield return AuthorValidateAttach(controller, CookRule());
            Assert.AreNotEqual("SETTLING", controller.CurrentBands.op_state_band,
                "the FIRST authoring opens no settling window (no-regression contract)");

            // Accrue a little so the lieutenant is genuinely delegated/active before the revision.
            yield return Advance(2);

            // RE-script (a valid→valid REVISION — the SAME rule re-attached is still a revision) → the settling window opens.
            // No Advance between the re-attach and the read, so settling_until_tick > now → op_state_band SETTLING.
            yield return controller.AttachRules();
            Assert.AreEqual(0, controller.LastDiagnostics.Length, "the re-script validates + attaches clean");
            yield return controller.RefreshBands();
            Assert.AreEqual("SETTLING", controller.CurrentBands.op_state_band,
                $"re-scripting a tenured lieutenant opens a settling window → op_state_band SETTLING (got '{controller.CurrentBands.op_state_band}')");
            // The State chip rendered the worded SETTLING label ("Settling in" — band-only, no digits).
            Assert.IsTrue(controller.RenderedTexts.Any(t => t == "Settling in"),
                "the State row rendered the worded SETTLING band label");

            // Advance past the settling window (DISRUPT_SHORT default = 2 ticks; advance 6 to clear it robustly) → resume.
            yield return Advance(6);
            yield return controller.RefreshBands();
            Assert.AreNotEqual("SETTLING", controller.CurrentBands.op_state_band,
                $"after the settling window passes the delegation resumes → a non-SETTLING band (got '{controller.CurrentBands.op_state_band}')");
            CollectionAssert.Contains(new[] { "ACTIVE", "PAUSED", "IDLE" }, controller.CurrentBands.op_state_band,
                "the resumed op_state is one of the non-settling closed-domain bands");

            Debug.Log($"[LieutenantTenureE2E] re-script settling OK — SETTLING → {controller.CurrentBands.op_state_band} (resumed)");
        }

        // (3) REASSIGN RESET: recruit + delegate a SECURITY on the lab, accrue tenure (promote past FRESH), then
        //     ReassignChosen() to the SECOND seeded operational building (the distribution_hub) → the bands show
        //     tenure_bucket == FRESH (the move forfeits the accumulated tenure). SECURITY accepts any owned operational
        //     building, so the lab → hub move is a genuine cross-building reassignment. (A COOK has only one 'lab' host.)
        [UnityTest]
        public IEnumerator Reassign_ToSecondBuilding_ResetsTenureToFresh()
        {
            LieutenantScreenController controller = null;
            yield return BringUpSignedIn(c => controller = c);

            // Recruit a SECURITY on the lab + attach its delegated rule (resolves EXECUTE_DEFAULT → accrues every tick).
            string securityId = null;
            yield return RecruitArchetype(controller, "SECURITY", labId, id => securityId = id);
            yield return AuthorValidateAttach(controller, SecurityRule());

            // Accrue tenure so the bucket is genuinely PAST FRESH before the move (so the reset is observable).
            yield return Advance(8);
            yield return controller.RefreshBands();
            Assert.AreNotEqual("FRESH", controller.CurrentBands.tenure_bucket,
                $"the SECURITY accrued tenure past FRESH before the reassign (got '{controller.CurrentBands.tenure_bucket}')");

            // Reassign to the SECOND operational building (the distribution_hub) — the canonical TRIGGER_REASSIGNMENT. The
            // controller sets ReassignBuildingId, calls ReassignChosen() (POST .../reassign), and RefreshBands() on ok.
            controller.ReassignBuildingId = secondHostId;
            controller.ReassignTargetBuildingId = ""; // SECURITY is single-building (no dispatch target on the new host).
            yield return controller.ReassignChosen();

            // The move forfeits the tenure → the freshly-projected bands show tenure_bucket FRESH (bucket lost).
            LieutenantBands b = controller.CurrentBands;
            Assert.IsNotNull(b, "the post-reassign bands re-projected");
            Assert.AreEqual("FRESH", b.tenure_bucket,
                $"reassigning forfeits the accumulated tenure → tenure_bucket FRESH (got '{b.tenure_bucket}', outcome='{controller.LastOutcome}')");
            Assert.AreEqual("Fresh", controller.TenureBucketShown, "the rendered tenure_bucket chip reset to 'Fresh'");
            // The effect bands followed the reset to the FRESH row (the inert defaults).
            Assert.AreEqual("COST_1", b.script_revision_cost, "a FRESH lieutenant's re-script cost is the inert COST_1");
            Assert.AreEqual("BONUS_NONE", b.role_efficiency_bonus, "a FRESH lieutenant's yield bonus is the inert BONUS_NONE");

            Debug.Log($"[LieutenantTenureE2E] reassign reset OK — moved {securityId} lab→hub, tenure_bucket → {b.tenure_bucket}");
        }

        // (4) R2.2 NO-RAW-SCALAR: recruit + delegate a COOK, attach + accrue, refresh the bands → scan ALL rendered band text
        //     for a raw scalar (the SAME regex the sibling capstones use). The tenure_bucket chip + the 3 effect chips + the
        //     SETTLING band are WORDED bands (no digits); the player's authored script_source / diagnostics / previews + the
        //     locked teaser's tier NUMBERS are deliberately EXCLUDED from RenderedTexts — so the scan corpus stays clean.
        [UnityTest]
        public IEnumerator NoRawScalarLeaks_InTenureAndEffectChips()
        {
            LieutenantScreenController controller = null;
            yield return BringUpSignedIn(c => controller = c);

            PrepLab(0.1);
            yield return RecruitArchetype(controller, "COOK", labId, _ => { });
            yield return AuthorValidateAttach(controller, CookRule());

            // Accrue so a promoted (non-FRESH) bucket + its non-inert effect chips render — the scan still must find no scalar.
            yield return Advance(8);
            yield return controller.RefreshBands();
            Assert.IsTrue(controller.StatusShown, "bands (incl. the tenure + effect chips) rendered");
            Assert.AreNotEqual("FRESH", controller.CurrentBands.tenure_bucket, "a promoted bucket is on-screen for the scan");

            // Open the Reassign confirmation too — it surfaces the projected disruption + the tenure/bonus-loss bands (also
            // worded). Prove those confirmation lines are in the scan corpus and STILL carry no digit.
            controller.OpenReassign();
            Assert.IsTrue(controller.ReassignConfirmOpen, "the reassign confirmation opened (its projected bands are on-screen)");

            foreach (string t in controller.RenderedTexts)
            {
                Assert.IsFalse(Regex.IsMatch(t, @"(?<![A-Za-z])\d+(\.\d+)?(?![A-Za-z])"),
                    $"no raw scalar may be shown client-side in a band, but rendered text was: '{t}'");
            }

            Debug.Log($"[LieutenantTenureE2E] no-raw-scalar OK — scanned {controller.RenderedTexts.Count} band texts (incl. tenure/effect chips + reassign confirm), all worded");
        }
    }
}
