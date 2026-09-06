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
using MafiaCleanCity.Operational.Lieutenant;
using Debug = UnityEngine.Debug;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    // Phase-10 (lieutenant UI extension) CAPSTONE — the multi-archetype / roster / locked-teaser proof (charter 27:
    // NO MOCK). The sibling of LieutenantRuleEditorPlayModeTests: it drives the SAME real LieutenantScreenController
    // against the live dockerized stack (Traefik @ http://localhost), reusing that fixture's scaffolding 1:1 (the
    // seeder run, the psql + ResetRoster helpers, the sign-in/auth-wait bring-up, the Destroyed-guarded async idiom).
    // Where the Phase-9 capstone proved the COOK rule-editor LOOP end-to-end (recruit → author → validate → attach →
    // delegation ticks), THIS capstone proves the Phase-10 UI EXTENSION:
    //   (1) MULTI-ARCHETYPE: the builder serves each archetype's OWN field palette — recruit a COOK on the lab (palette
    //       cook_idle/heat) then a SECURITY on a 2nd operational building (palette building_damaged), authoring + attaching
    //       a grounded one-rule script for each → bands round-trip per archetype (FEW);
    //   (2) ROSTER: GET /v1/lieutenants lists ≥ 2 band-only rows with the right archetypes + bands, and Open(id) switches
    //       the builder palette back to the opened lieutenant's archetype;
    //   (3) LOCKED TEASER: the locked-tier primitives are surfaced (🔒 labels, non-empty) yet PROVABLY non-selectable —
    //       the executable cycle sets (Actions / the palette trigger kinds) contain NO locked token (disjointness);
    //   (4) NO-RAW-SCALAR: the band corpus (RenderedTexts) stays worded — the locked teaser's tier NUMBERS are kept OUT
    //       of it by design, so the SAME R2.2 scan the Phase-9 capstone uses must still find no scalar.
    //
    // The seeder is UNCHANGED: it already stands up multiple operational buildings and prints them at the TOP LEVEL of
    // its result JSON. We use the lab as the COOK host (single-building archetype) and the distribution_hub (a 2nd owned
    // operational building, top-level key — fallback money_holding) as the SECURITY host: SECURITY accepts ANY owned
    // operational building (security-binding.validateAssignment — no building-type restriction), so the hub is a valid
    // SECURITY host. The roster caps at 2 (T.lieutenant.max_count_per_player), so we recruit EXACTLY COOK + SECURITY and
    // ResetRoster() at the start of every recruiting test (the seeder runs once per fixture; the tests recruit per-test).
    // TD-490 — SANS catégorie, ce fichier était invisible à TOUT filtre : ni le juge ni
    // personne ne pouvait le demander. Onze fichiers, 29 tests dans ce cas au 2026-09-02.
    // *Un test qui n'a jamais tourné et un test qui passe rendent la même absence d'erreur.*
    // ⚠️ Pas de préfixe `Capture` : cette catégorie EXISTE, le filtre d'Unity matche par
    // PRÉFIXE, et la demander emporterait celle-ci — or `Capture` fait SIGSEGV (Mesa).
    [Category("EcranUiLieutenant")]
    public class LieutenantUiExtensionPlayModeTests
    {
        private GameObject controllerGo;

        // Discovered from the seeder's stdout (see RunSeeder).
        private static string demoEmail;
        private static string demoPassword;
        private static string playerId;
        private static string labId;       // the COOK host (the seeder's "lab" == "raided_building").
        private static string securityHostId; // the SECURITY host: a 2nd owned operational building (distribution_hub, fallback money_holding).
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
            // The SECURITY host: a SECOND owned operational building, printed at the TOP LEVEL of the result JSON with the
            // SAME flat extractor. Prefer the distribution_hub (a logistics building, distinct from the COOK lab); fall back
            // to the money_holding vault if the hub key is ever absent. SECURITY accepts ANY owned operational building, so
            // either is a valid SECURITY host (security-binding.validateAssignment — no building-type restriction).
            securityHostId = ExtractString(json, "distribution_hub") ?? ExtractString(json, "money_holding");

            Assert.IsFalse(string.IsNullOrEmpty(demoEmail), "discovered demo email");
            Assert.IsFalse(string.IsNullOrEmpty(demoPassword), "discovered demo password");
            Assert.IsTrue(IsUuid(playerId), $"discovered player uuid (got '{playerId}')");
            Assert.IsTrue(IsUuid(labId), $"discovered lab uuid (got '{labId}')");
            Assert.IsTrue(IsUuid(securityHostId), $"discovered a 2nd operational building uuid for the SECURITY host (got '{securityHostId}')");
            Assert.AreNotEqual(labId, securityHostId, "the SECURITY host is a DISTINCT building from the COOK lab");

            Debug.Log($"[LieutenantUiE2E] seeded — player={playerId} lab={labId} securityHost={securityHostId} email={demoEmail}");
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

        // Clear the player's lieutenant roster (+ the orphaned 1-1 behavior_script rows) so EACH test recruits FRESH into an
        // empty roster — the roster cap (T.lieutenant.max_count_per_player; this stack caps at 2) would otherwise 409 a 3rd
        // recruit once tests accumulate. The seeder runs ONCE per fixture ([OneTimeSetUp]); the tests recruit per-test, so the
        // roster must be reset per-test. Same FK-order the seeder reset uses: capture the behavior_script_ids → delete the
        // lieutenant rows → delete the now-orphaned behavior_script rows.
        private static void ResetRoster()
        {
            string scriptIds = Psql(
                "SELECT COALESCE(string_agg(quote_literal(behavior_script_id::text), ','), '') " +
                $"FROM lieutenant WHERE player_id='{playerId}' AND behavior_script_id IS NOT NULL;");
            Psql($"DELETE FROM lieutenant WHERE player_id='{playerId}';");
            if (!string.IsNullOrEmpty(scriptIds))
                Psql($"DELETE FROM behavior_script WHERE script_id IN ({scriptIds});");
        }

        // -------- shared per-test controller bring-up --------

        // Instantiate the controller, point it at the live stack with the discovered creds, sign in. Leaves the controller
        // authenticated (no recruit yet — the per-test body recruits the archetype it needs via RecruitArchetype). Resets the
        // roster to empty so the recruits in the test land in a fresh roster (under the cap-of-2). Destroyed-guarded resumes.
        private IEnumerator BringUpSignedIn(System.Action<LieutenantScreenController> onReady, bool resetRoster = true)
        {
            controllerGo = new GameObject("LieutenantScreenController");
            var controller = controllerGo.AddComponent<LieutenantScreenController>();
            controller.SetBaseUrl(BaseUrl);
            // The controller signs in with its own demo creds; the seeder seeds the SAME operational demo player
            // (operational_demo@example.test / operational-demo-pw), so the defaults match the discovered creds. We assert
            // that match so a future seeder/controller drift fails loudly here rather than at sign-in.
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

            // Start each recruiting test with an EMPTY roster (the cap-of-2 would 409 an accumulated recruit; the seeder runs
            // once per fixture, the tests recruit per-test). The recruit's host gate validates owned + conversion-operational
            // + type (COOK→lab, SECURITY→any owned operational), NOT structural_state, so a recruit succeeds on the seeded
            // buildings as-is.
            if (resetRoster) ResetRoster();

            onReady(controller);
        }

        // Recruit ONE lieutenant of the given archetype on the given host via the PICKER path (the Phase-10 archetype-
        // parameterized recruit; the Phase-9 RecruitCook() is COOK-only). COOK + SECURITY are single-building archetypes, so we
        // set the assigned host + leave TargetBuildingId empty (NeedsTarget is false for both). Asserts the returned id is a
        // uuid + the builder palette switched to the recruited archetype (CurrentArchetype follows CurrentBands.archetype).
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

        // The one grounded demo rule for an archetype (built via the rule-MODEL, never UI clicks). Each is a SINGLE RuleRow
        // (→ rule_count_band FEW; NONE only at 0 rules). The field/value are grounded VERBATIM in the archetype's palette:
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

        // Author the rules, dry-run validate (expect 0 diagnostics + a "valid" outcome), then attach + refresh the bands.
        // Mirrors the Phase-9 capstone's author→validate→attach→bands sequence, factored for the two archetypes.
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

        // (1) MULTI-ARCHETYPE: the builder serves each archetype's OWN palette. Recruit a COOK on the lab → its palette is
        //     cook_idle/heat → author the COOK rule → bands archetype=COOK / rule_count_band=FEW. Then recruit a SECURITY on
        //     the 2nd operational building → its palette is building_damaged → author the SECURITY rule → bands
        //     archetype=SECURITY / rule_count_band=FEW. (cap-of-2: exactly these two recruits.)
        /// <summary>⛔⛔ LE CONTRÔLE QUI MANQUAIT À LA GARDE DE CATALOGUE — et son absence a laissé
        /// la garde CERTIFIER le trou qu'elle devait mesurer.
        ///
        /// `RendreTousLesLibelles` rejoue chaque résolveur sur toutes les valeurs de son domaine
        /// pour que « zéro repli » porte sur la population entière. Sa liste d'archétypes était
        /// recopiée à la main : **SEPT valeurs pour NEUF `case`**. Les deux manquantes — plus une
        /// troisième — sont exactement celles dont le catalogue ne sert pas la clé, donc la garde
        /// restait verte en n'allant jamais chercher les clés absentes. Sa docstring affirmait
        /// pourtant que les valeurs avaient été « lues dans les `case` ».
        /// ★★ *Une garde de couverture qui recopie sa population à la main mesure la recopie, pas
        ///   la population.* La liste vient désormais du résolveur ; ce test-ci prouve que le
        ///   résolveur ne traite rien qui échappe à ce tableau.
        ///
        /// ⚠️ IL LIT LE FICHIER SOURCE, et c'est délibéré : la valeur arrive en `string`, il n'y a
        /// aucun enum C# à rendre exhaustif, donc le compilateur ne peut RIEN ici (une `switch`
        /// expression sur `string` n'a pas d'exhaustivité, et ce dépôt a déjà mesuré que la forme
        /// auto-invalidante du TypeScript ne transpose pas au C#). Le seul détecteur possible est
        /// un test qui va lire les `case`.</summary>
        [Test]
        public void ArchetypesCanoniques_CouvreTousLesCasDuResolveur()
        {
            string chemin = Path.Combine(Application.dataPath,
                "Scripts", "Operational", "Lieutenant", "FamilleLabels.cs");
            Assert.IsTrue(File.Exists(chemin), $"source du résolveur introuvable à {chemin}");
            string src = File.ReadAllText(chemin);

            // On borne au corps de `Archetype` : les autres résolveurs du fichier ont leurs propres
            // `case`, et les compter ici ferait rougir sur des valeurs qui n'ont rien à voir.
            int debut = src.IndexOf("public static string Archetype(");
            Assert.Greater(debut, 0, "la méthode `Archetype` n'est plus dans ce fichier — ce test " +
                                     "doit être ré-accordé plutôt que laissé vert sur une tranche vide");
            int fin = src.IndexOf("private static string Lib(", debut);
            Assert.Greater(fin, debut, "borne de fin introuvable : la tranche lue serait fausse, et " +
                                       "un balayage sur une tranche fausse rend un verdict uniforme");
            string corps = src.Substring(debut, fin - debut);

            var cas = new List<string>();
            foreach (Match m in Regex.Matches(corps, "case\\s+\"([A-Z_]+)\"\\s*:"))
                cas.Add(m.Groups[1].Value);

            // ANTI-VACUITÉ : une tranche mal bornée rendrait ZÉRO `case`, et « tous couverts »
            // serait vrai à vide — le zéro le plus crédible qui soit.
            Assert.GreaterOrEqual(cas.Count, 9,
                $"seulement {cas.Count} `case` lus dans le corps de `Archetype` : le motif ou les " +
                "bornes ne mordent plus, et ce test ne prouverait rien. Lus : [" +
                string.Join(", ", cas) + "]");

            var tableau = new HashSet<string>(FamilleLabels.ArchetypesCanoniques);
            var manquants = cas.Where(c => !tableau.Contains(c)).ToList();
            Assert.IsEmpty(manquants,
                $"{manquants.Count} valeur(s) traitée(s) par le résolveur mais ABSENTE(S) de " +
                "`ArchetypesCanoniques` : [" + string.Join(", ", manquants) + "]. " +
                "`RendreTousLesLibelles` parcourt ce tableau : toute valeur qui n'y est pas ne " +
                "sera jamais rejouée, donc sa clé de catalogue ne sera jamais demandée, donc la " +
                "garde « zéro repli » restera verte en l'ignorant. C'est ainsi que trois clés " +
                "non servies ont traversé la garde qui existe pour les trouver.");

            // ⛔ LE MÊME CONTRÔLE SUR LE SECOND RÉSOLVEUR, et c'est le point de la réserve de
            //    classe du juge-données : fermer un trou sur l'instance qu'on regardait ne le ferme
            //    pas sur ses sœurs. `Anciennete` a exactement la même forme — un `switch` sur une
            //    `string`, un tableau exposé, une garde de couverture qui le parcourt — donc
            //    exactement le même mode d'échec, et il se vérifie de la même façon.
            int dA = src.IndexOf("public static string Anciennete(");
            Assert.Greater(dA, 0, "la méthode `Anciennete` n'est plus dans ce fichier — ré-accorder ce test");
            int fA = src.IndexOf("public static string Etat(", dA);
            Assert.Greater(fA, dA, "borne de fin introuvable pour `Anciennete` : la tranche lue serait vide");
            var casA = new List<string>();
            foreach (Match m in Regex.Matches(src.Substring(dA, fA - dA), "case\\s+\"([A-Z_]+)\"\\s*:"))
                casA.Add(m.Groups[1].Value);
            Assert.GreaterOrEqual(casA.Count, 5,
                $"seulement {casA.Count} `case` lus dans `Anciennete` : le motif ne mord plus. " +
                "Lus : [" + string.Join(", ", casA) + "]");
            var tabA = new HashSet<string>(FamilleLabels.AnciennetesCanoniques);
            var manqA = casA.Where(c => !tabA.Contains(c)).ToList();
            Assert.IsEmpty(manqA,
                $"{manqA.Count} palier(s) traité(s) par `Anciennete` mais absent(s) de " +
                "`AnciennetesCanoniques` : [" + string.Join(", ", manqA) + "]. Le rejeu ne les " +
                "atteindrait pas, donc leurs clés ne seraient jamais demandées — le trou des " +
                "archétypes, rouvert sur le résolveur voisin.");
        }

        [UnityTest]
        public IEnumerator MultiArchetype_CookThenSecurity_PalettesAndBands()
        {
            LieutenantScreenController controller = null;
            yield return BringUpSignedIn(c => controller = c);

            // --- COOK on the lab: the builder offers the COOK palette (cook_idle + heat).
            string cookId = null;
            yield return RecruitArchetype(controller, "COOK", labId, id => cookId = id);
            var cookFields = RuleModel.FieldsFor("COOK").Select(f => f.Key).ToArray();
            CollectionAssert.Contains(cookFields, "cook_idle", "the COOK builder palette offers cook_idle");
            CollectionAssert.Contains(cookFields, "heat", "the COOK builder palette offers heat");

            yield return AuthorValidateAttach(controller, CookRule());
            LieutenantBands cb = controller.CurrentBands;
            Assert.IsNotNull(cb, "COOK bands projection parsed");
            Assert.AreEqual("COOK", cb.archetype, "archetype band is COOK");
            Assert.AreEqual("FEW", cb.rule_count_band, "rule_count_band is FEW (1 rule)");

            // --- SECURITY on the 2nd operational building: the builder offers the SECURITY palette (building_damaged).
            string securityId = null;
            yield return RecruitArchetype(controller, "SECURITY", securityHostId, id => securityId = id);
            var securityFields = RuleModel.FieldsFor("SECURITY").Select(f => f.Key).ToArray();
            CollectionAssert.Contains(securityFields, "building_damaged", "the SECURITY builder palette offers building_damaged");

            yield return AuthorValidateAttach(controller, SecurityRule());
            LieutenantBands sb = controller.CurrentBands;
            Assert.IsNotNull(sb, "SECURITY bands projection parsed");
            Assert.AreEqual("SECURITY", sb.archetype, "archetype band is SECURITY");
            Assert.AreEqual("FEW", sb.rule_count_band, "rule_count_band is FEW (1 rule)");
            // Do NOT pin a specific op_state for SECURITY (no delegation tick driven here) — assert it's a valid band.
            CollectionAssert.Contains(new[] { "PAUSED", "ACTIVE", "IDLE" }, sb.op_state_band,
                "the SECURITY op_state_band is one of the closed-domain bands");

            Assert.AreNotEqual(cookId, securityId, "the two recruits are distinct lieutenants");
            Debug.Log($"[LieutenantUiE2E] multi-archetype OK — COOK={cb.archetype}/{cb.rule_count_band}, SECURITY={sb.archetype}/{sb.rule_count_band}");
        }

        // (2) ROSTER: recruit COOK + SECURITY, then RefreshRoster → ≥ 2 band-only rows carrying both archetypes + valid
        //     bands. Then OpenLieutenant(cookId) → the builder palette switches back to COOK (Open kicks an internal
        //     RefreshBands coroutine; poll CurrentArchetype with a timeout, mirroring the bring-up's auth-wait idiom).
        [UnityTest]
        public IEnumerator Roster_ListsBothArchetypes_OpenSwitchesPalette()
        {
            LieutenantScreenController controller = null;
            yield return BringUpSignedIn(c => controller = c);

            string cookId = null, securityId = null;
            yield return RecruitArchetype(controller, "COOK", labId, id => cookId = id);
            yield return RecruitArchetype(controller, "SECURITY", securityHostId, id => securityId = id);

            // --- the roster lists both lieutenants as band-only rows.
            yield return controller.RefreshRoster();
            RosterRow[] roster = controller.CurrentRoster;
            Assert.GreaterOrEqual(roster.Length, 2, $"the roster lists ≥ 2 lieutenants (got {roster.Length})");

            var archetypes = roster.Select(r => r.archetype).ToArray();
            CollectionAssert.Contains(archetypes, "COOK", "the roster contains the COOK lieutenant");
            CollectionAssert.Contains(archetypes, "SECURITY", "the roster contains the SECURITY lieutenant");

            // Each row is band-only: a uuid identity + closed-domain bands (never a raw scalar).
            foreach (RosterRow r in roster)
            {
                Assert.IsTrue(IsUuid(r.lieutenant_id), $"each roster row carries a lieutenant_id uuid (got '{r.lieutenant_id}')");
                CollectionAssert.Contains(new[] { "PAUSED", "ACTIVE", "IDLE" }, r.op_state_band,
                    $"each roster row's op_state_band is a closed-domain band (got '{r.op_state_band}')");
                CollectionAssert.Contains(new[] { "NONE", "FEW", "MANY" }, r.rule_count_band,
                    $"each roster row's rule_count_band is a closed-domain band (got '{r.rule_count_band}')");
                // ⛔ LE NOM EST SERVI ET DOIT ÊTRE PARSÉ — c'est le champ que le DTO jetait.
                Assert.IsFalse(string.IsNullOrWhiteSpace(r.name),
                    $"la rangée {r.lieutenant_id} n'a pas de `name` parsé : le serveur le sert " +
                    "(mesuré sur le corps du 2026-09-06, six clés), et un DTO qui ne le déclare " +
                    "pas le jette EN SILENCE — `JsonUtility` n'a aucun moyen de s'en plaindre.");
            }

            // ⛔⛔ ET LA PROPRIÉTÉ QUI COMPTE POUR LE JOUEUR : les noms DISTINGUENT les lieutenants.
            // Le défaut réparé n'était pas « un champ manque » mais ce que le joueur voyait : les
            // trois lieutenants du compte de démo sont tous COOK, donc l'organigramme affichait
            // « Cuisinier » trois fois. *Un champ jeté ne laisse pas un vide — il laisse un AUTRE
            // champ prendre sa place, et c'est indiscernable tant que les valeurs diffèrent.*
            // ⇒ ANTI-DÉGÉNÉRESCENCE : des noms tous IDENTIQUES satisferaient « chaque rangée a un
            //   nom » sans rien réparer. On exige donc autant de noms DISTINCTS que de rangées.
            string[] noms = roster.Select(r => r.name).ToArray();
            Assert.AreEqual(noms.Length, noms.Distinct().Count(),
                "deux lieutenants portent le même nom rendu — c'est exactement le symptôme du " +
                "champ jeté (l'archétype prenait la place du nom, et trois COOK donnaient trois " +
                "fois « Cuisinier »). Noms : [" + string.Join(" · ", noms) + "]");

            // Et le rendu porte bien CES noms-là, pas une dérivation locale.
            var textes = controller.RenderedTexts;
            foreach (string n in noms)
                Assert.IsTrue(textes.Any(x => x == n),
                    $"le nom servi « {n} » n'apparaît nulle part dans le rendu. " +
                    "Corpus : [" + string.Join(" · ", textes) + "]");

            // ⛔⛔⛔ ET LE MÉTIER AVEC — la garde qui manquait, et son absence a coûté un BLOQUANT.
            //    Les assertions ci-dessus prouvent que le NOM est rendu. Elles sont restées VERTES
            //    pendant que l'archétype disparaissait complètement de l'écran : le correctif qui
            //    posait le nom l'avait posé À LA PLACE du métier, et les trois rangs sont devenus
            //    interchangeables (nom + RÉCENT + Au repos, trois fois). Un juge ⊥ l'a vu, aucune
            //    garde ne pouvait — elles ne demandaient qu'à l'un des deux d'être là.
            //    ★★ *Une garde qui vérifie qu'une valeur EST rendue ne dit rien de celle qu'elle a
            //      REMPLACÉE.* Quand un correctif fait passer une fente d'une grandeur à une autre,
            //      la falsifiable qui mord porte sur LES DEUX, jamais sur la nouvelle seule.
            // Le libellé vient du catalogue — le producteur unique de cette grandeur (TD-611) —
            // et non d'une chaîne recopiée ici : une copie dériverait le jour où le catalogue bouge.
            string[] metiers = roster.Select(r => FamilleLabels.Archetype(r.archetype)).ToArray();
            foreach (string m in metiers)
                Assert.IsTrue(textes.Any(x => x == m),
                    $"le métier « {m} » n'apparaît nulle part dans le rendu : le rang n'identifie " +
                    "plus QUI TIENT QUOI, et les trois rangs deviennent interchangeables. " +
                    "Corpus : [" + string.Join(" · ", textes) + "]");

            // ANTI-DÉGÉNÉRESCENCE SUR LES DEUX CÔTÉS, et il en faut deux DIFFÉRENTES :
            //  · côté NOMS, la propriété est la VARIÉTÉ (déjà assertée plus haut) — trois noms
            //    identiques signeraient le retour du champ jeté ;
            //  · côté MÉTIERS, la variété serait FAUSSE : les trois lieutenants du compte de démo
            //    sont réellement tous COOK, donc trois libellés identiques sont la VÉRITÉ. Exiger
            //    des métiers distincts ferait rougir la garde sur une donnée correcte.
            //    La propriété qui vaut ici est que le métier n'est ni vide, ni la clé brute du
            //    back, ni une COPIE du nom — c'est-à-dire que la fente porte bien une SECONDE
            //    grandeur et non deux fois la première.
            for (int i = 0; i < roster.Length; i++)
            {
                Assert.IsFalse(string.IsNullOrWhiteSpace(metiers[i]),
                    $"la rangée {roster[i].lieutenant_id} rend un métier vide");
                Assert.AreNotEqual(roster[i].archetype, metiers[i],
                    $"le métier rendu pour {roster[i].lieutenant_id} est la clé brute du back " +
                    $"(« {metiers[i]} ») : le catalogue ne l'a pas traduit, et le joueur lit un enum");
                Assert.AreNotEqual(noms[i], metiers[i],
                    $"la rangée {roster[i].lieutenant_id} affiche deux fois la même chaîne " +
                    $"(« {noms[i]} ») : le rang prétend porter deux informations et n'en porte qu'une");
            }

            // --- Open the COOK row → the builder palette switches back to COOK. OpenLieutenant points the current-lieutenant
            // id at cookId and StartCoroutine(RefreshBands()) internally; wait until CurrentArchetype reflects COOK (the bands
            // load is a network round-trip), mirroring the bring-up's "while (… && elapsed < 20f)" wait idiom.
            controller.OpenLieutenant(cookId);
            float elapsed = 0f;
            while (controller.CurrentArchetype != "COOK" && elapsed < 20f)
            {
                elapsed += Time.deltaTime; yield return null;
            }
            Assert.AreEqual("COOK", controller.CurrentArchetype,
                "opening the COOK roster row switches the builder palette back to COOK");
            Assert.IsNotNull(controller.CurrentBands, "the opened lieutenant's bands loaded");
            Assert.AreEqual("COOK", controller.CurrentBands.archetype, "the loaded bands are the COOK lieutenant's");

            Debug.Log($"[LieutenantUiE2E] roster OK — {roster.Length} rows, opened COOK → palette={controller.CurrentArchetype}");
        }

        // (3) LOCKED TEASER: the locked-tier primitives are SURFACED (non-empty 🔒 labels, with canonical tokens) yet
        //     PROVABLY non-selectable. The cycle controls are private/UI-driven, so the robust proof is DISJOINTNESS: the
        //     executable cycle sets (RuleModel.Actions, and the palettes' trigger kinds — only STATE/EVENT) contain NO locked
        //     token. This needs NO recruit (the labels + catalogues are static) — a bare controller suffices (offline).
        [UnityTest]
        public IEnumerator LockedTeaser_SurfacedButNeverSelectable()
        {
            controllerGo = new GameObject("LieutenantScreenController");
            var controller = controllerGo.AddComponent<LieutenantScreenController>();
            controller.SetBaseUrl(BaseUrl);
            yield return null; // let EnsureInitialized/Start build the layout (the teaser renders on build).

            // --- the locked teaser IS surfaced: a non-empty set of grayed labels, each carrying the 🔒 lock hint.
            IReadOnlyList<string> labels = controller.LockedPrimitiveLabels;
            Assert.IsNotEmpty(labels, "the locked-tier teaser surfaces ≥ 1 locked primitive label");
            Assert.IsTrue(labels.Any(l => l.Contains("🔒")), "at least one locked label carries the 🔒 lock hint");

            // The canonical locked tokens are actually surfaced (not an empty/placeholder catalogue) — a sample across the
            // trigger / action / combinator catalogues, each grounded VERBATIM in the backend grammar.
            foreach (string token in new[] { "TIME", "SEQ", "COHORT", "PEER_EVENT", "REROUTE_TO", "AND_IF" })
                Assert.IsTrue(labels.Any(l => l.StartsWith(token, StringComparison.Ordinal)),
                    $"the locked token '{token}' is surfaced in the teaser labels");

            // --- DISJOINTNESS proof #1: no locked ACTION is in the executable action cycle set.
            foreach (RuleModel.LockedPrimitive locked in RuleModel.LockedActions)
                CollectionAssert.DoesNotContain(RuleModel.Actions, locked.Token,
                    $"the locked action '{locked.Token}' is NOT in the executable action cycle set");

            // --- DISJOINTNESS proof #2: no locked TRIGGER is a TriggerKind of any executable palette field (the executable
            // trigger kinds across all archetype palettes are only STATE / EVENT — never a locked TIME/LIFECYCLE/…).
            var executableTriggerKinds = RuleModel.PaletteByArchetype.Values
                .SelectMany(palette => palette)
                .Select(spec => spec.TriggerKind)
                .Distinct()
                .ToArray();
            foreach (RuleModel.LockedPrimitive locked in RuleModel.LockedTriggers)
                CollectionAssert.DoesNotContain(executableTriggerKinds, locked.Token,
                    $"the locked trigger '{locked.Token}' is NOT a trigger kind of any executable palette field");
            // The executable trigger kinds are exactly the closed STATE/EVENT subset (the slice executable grammar).
            CollectionAssert.AreEquivalent(new[] { "STATE", "EVENT" }, executableTriggerKinds,
                "the executable palettes use only the STATE/EVENT trigger kinds (the rest are locked)");

            Debug.Log($"[LieutenantUiE2E] locked teaser OK — {labels.Count} labels surfaced, none reachable by the executable cycles");
        }

        // (4) R2.2 NO-RAW-SCALAR: recruit COOK, author + validate + attach, refresh the bands → scan ALL rendered band text
        //     for a raw scalar (the SAME regex the Phase-9 capstone uses). The band rows are worded; the player's authored
        //     script_source / diagnostics / NL previews — and the locked teaser's tier NUMBERS — are deliberately EXCLUDED
        //     from RenderedTexts, so the scan corpus is band-only and must stay clean.
        [UnityTest]
        public IEnumerator NoRawScalarLeaks_InRenderedBands_WithLockedTeaser()
        {
            LieutenantScreenController controller = null;
            yield return BringUpSignedIn(c => controller = c);

            yield return RecruitArchetype(controller, "COOK", labId, _ => { });
            yield return AuthorValidateAttach(controller, CookRule());
            Assert.IsTrue(controller.StatusShown, "bands rendered after attach");

            // The locked teaser is on-screen too (its tier numbers are intentional chrome) — prove the scan corpus still
            // excludes it by asserting the teaser is non-empty while the band scan below stays clean.
            Assert.IsNotEmpty(controller.LockedPrimitiveLabels, "the locked teaser is on-screen alongside the bands");

            foreach (string t in controller.RenderedTexts)
            {
                Assert.IsFalse(Regex.IsMatch(t, @"(?<![A-Za-z])\d+(\.\d+)?(?![A-Za-z])"),
                    $"no raw scalar may be shown client-side in a band, but rendered text was: '{t}'");
            }

            Debug.Log($"[LieutenantUiE2E] no-raw-scalar OK — scanned {controller.RenderedTexts.Count} band texts (teaser excluded), all worded");
        }
    }
}
