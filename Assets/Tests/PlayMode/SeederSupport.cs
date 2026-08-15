using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;
using Debug = UnityEngine.Debug;

namespace MafiaCleanCity.Tests
{
    // Shared seeder plumbing for the no-mock PlayMode E2E suite (charter 27).
    //
    // Every PlayMode test that asserts a server-derived precondition (heat gradient, wallet
    // band, operational ids) SELF-SEEDS that precondition in its own OneTimeSetUp by running
    // the matching dev seeder via a child Process — so each fixture OWNS its precondition and
    // the full PlayMode assembly is ORDER-INDEPENDENT.
    //
    // Two structural reasons the suite was order-dependent before, both now resolved:
    //   1. CONCERN ISOLATION: the operational loop drives its player's city to BURNING + escalated,
    //      whose heat PROPAGATES across districts and washes the City Map seeder's exact d3/d7/d11
    //      gradient. So the operational concern runs on a DISTINCT player (operational_demo) from the
    //      City Map concern (citymap_demo) — neither seeder mutates the other's player.
    //   2. PER-FIXTURE ATOMICITY: the operational seeder deletes + recreates a player's buildings
    //      with NEW ids on every run, and several op fixtures re-seed the SAME operational player.
    //      Seeding in each fixture's OneTimeSetUp (rather than lazily in the first test body) makes
    //      seed→use atomic per fixture — a sibling's re-seed can't invalidate the ids a fixture loads.
    //
    // This centralises the node-resolution + child-Process + stdout-marker-parse boilerplate
    // that was previously copy-pasted into BuildingCard/Laundering/Dashboard tests (DRY).
    public static class SeederSupport
    {
        public const string OperationalSeeder = "Tools/seed_operational_demo.mjs";
        public const string CityMapSeeder = "Tools/seed_citymap_demo.mjs";

        public const string OperationalMarker = "=== OPERATIONAL DEMO SEEDED ===";
        public const string CityMapMarker = "=== DEMO CREDENTIALS ===";

        // Run a single SQL statement against the DEV stack's pg container (project mafia-clean-city) via
        // `docker compose exec -T pg psql` and return the first result row trimmed. The DRY sibling of the
        // seeder's own psql() helper, for a PlayMode fixture that needs a FAST, deterministic per-test reset
        // of a tiny bit of seeded state (cheaper than re-running the whole ~40s seeder in every [SetUp]) — e.g.
        // restoring a single building's row to its seeded baseline so sibling tests that mutate it stay
        // order-independent (charter 27 — each fixture/test owns its precondition). Asserts a clean exit.
        public static string RunDevPsql(string sql)
        {
            string docker = ResolveDocker();
            Assert.IsNotNull(docker, "could not locate a 'docker' binary (checked PATH + common dirs)");
            var psi = new ProcessStartInfo
            {
                FileName = docker,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
            };
            foreach (string a in new[]
                     {
                         "compose", "--project-name", "mafia-clean-city", "exec", "-T", "pg",
                         "psql", "-U", "mafia", "-d", "mafia_clean_city", "-v", "ON_ERROR_STOP=1", "-tAc", sql,
                     })
            {
                psi.ArgumentList.Add(a);
            }
            string stdout, stderr;
            using (var proc = Process.Start(psi))
            {
                stdout = proc.StandardOutput.ReadToEnd();
                stderr = proc.StandardError.ReadToEnd();
                proc.WaitForExit(30000);
                Assert.IsTrue(proc.HasExited, "psql did not finish within 30s");
                Assert.AreEqual(0, proc.ExitCode, $"psql failed (exit {proc.ExitCode}). stderr:\n{stderr}");
            }
            string first = stdout.Trim();
            int nl = first.IndexOf('\n');
            return nl >= 0 ? first.Substring(0, nl).Trim() : first;
        }

        // Resolve an absolute path to a docker binary (the Editor does not inherit the login-shell PATH). Probes a
        // DOCKER_BIN env override, $PATH entries, and the common install dirs. Returns null if none found.
        public static string ResolveDocker()
        {
            string fromEnv = Environment.GetEnvironmentVariable("DOCKER_BIN");
            if (!string.IsNullOrEmpty(fromEnv) && File.Exists(fromEnv)) return fromEnv;
            string path = Environment.GetEnvironmentVariable("PATH") ?? "";
            foreach (string dir in path.Split(Path.PathSeparator))
            {
                if (string.IsNullOrEmpty(dir)) continue;
                string candidate = Path.Combine(dir, "docker");
                if (File.Exists(candidate)) return candidate;
            }
            foreach (string c in new[] { "/usr/bin/docker", "/usr/local/bin/docker", "/bin/docker" })
            {
                if (File.Exists(c)) return c;
            }
            return null;
        }

        // Run a dev seeder (node <seederRelPath>) from the Unity repo root and return everything
        // printed after <marker> (the JSON block with the seeded ids/creds). Asserts a clean exit.
        public static string RunSeeder(string seederRelPath, string marker)
        {
            string repoRoot = FindRepoRoot(seederRelPath);
            Assert.IsNotNull(repoRoot, $"could not locate the Unity repo root ({seederRelPath})");

            // The Unity Editor process does not inherit the login-shell PATH (no nvm shims),
            // so "node" is not resolvable by name. Resolve an absolute node binary.
            string nodeBin = ResolveNode();
            Assert.IsNotNull(nodeBin, "could not locate a 'node' binary (checked PATH, nvm, common dirs)");

            var psi = new ProcessStartInfo
            {
                FileName = nodeBin,
                Arguments = seederRelPath,
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
                Assert.IsTrue(proc.HasExited, $"seeder {seederRelPath} did not finish within 180s");
                Assert.AreEqual(0, proc.ExitCode,
                    $"seeder {seederRelPath} failed (exit {proc.ExitCode}). stderr:\n{stderr}");
            }

            int idx = stdout.IndexOf(marker, StringComparison.Ordinal);
            Assert.Greater(idx, -1, $"seeder marker '{marker}' not found in stdout. stdout tail:\n{Tail(stdout)}");
            return stdout.Substring(idx + marker.Length);
        }

        private static string FindRepoRoot(string seederRelPath)
        {
            // dataPath is <repo>/Assets — walk up to the dir containing the seeder.
            string[] parts = seederRelPath.Split('/');
            DirectoryInfo dir = new DirectoryInfo(Application.dataPath);
            for (int i = 0; i < 6 && dir != null; i++)
            {
                if (File.Exists(Path.Combine(new[] { dir.FullName }.Concat(parts).ToArray())))
                    return dir.FullName;
                dir = dir.Parent;
            }
            return null;
        }

        // Resolve an absolute path to a node binary. The Editor doesn't inherit the login
        // shell's PATH, so we probe: a NODE_BIN env override, $PATH entries, nvm versions, and
        // common install dirs. Returns null if none found.
        public static string ResolveNode()
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

        // Pull "key": "value" from a printed JSON block (string values only).
        public static string ExtractString(string json, string key)
        {
            var m = Regex.Match(json, "\"" + Regex.Escape(key) + "\"\\s*:\\s*\"([^\"]*)\"");
            return m.Success ? m.Groups[1].Value : null;
        }

        public static bool IsUuid(string s) =>
            !string.IsNullOrEmpty(s) &&
            Regex.IsMatch(s, "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$");

        public static string Tail(string s) => s.Length <= 600 ? s : s.Substring(s.Length - 600);

        // W3.U1 — a PURELY ALPHABETIC unique token, safe to embed in any string a screen might
        // RENDER without ever tripping the R2.2 "no bare digit" guard (`DashboardPlayModeTests.cs:
        // 287` — `(?<![A-Za-z])\d+(\.\d+)?(?![A-Za-z])`). MEASURED, not assumed: a digit run of
        // length >= 3 sandwiched between letters (e.g. "c2q9320920z2q") is NOT safe — the regex
        // engine can start/end a match on an INTERIOR substring whose immediate neighbours are
        // OTHER DIGITS from the same run (themselves not letters), e.g. "32092" inside "q9320920z"
        // matches even though the run's own outer edges sit against letters. Only runs of length
        // <= 2 are genuinely safe; the robust fix is to carry NO digit at all. Maps each decimal
        // digit to a letter (0->a .. 9->j) — deterministic, still as unique as the source number.
        public static string DigitsToLetters(long n)
        {
            string digits = System.Math.Abs(n).ToString();
            var chars = new char[digits.Length];
            for (int i = 0; i < digits.Length; i++) chars[i] = (char)('a' + (digits[i] - '0'));
            return new string(chars);
        }

        /// <summary>A short, unique, PURELY ALPHABETIC callsign (player.callsign is varchar(24)) —
        /// safe even when a screen renders it verbatim (TopBar shows the callsign directly).
        /// `tag` identifies the calling chunk/fixture (kept short — it counts against the 24 cap).</summary>
        public static string SafeCallsign(string tag, ref int seqCounter)
        {
            string callsign = tag + DigitsToLetters(System.DateTime.UtcNow.Ticks % 10000000) + DigitsToLetters(seqCounter);
            seqCounter++;
            return callsign;
        }
    }
}
