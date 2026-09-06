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
    // Phase-9 vector #9 — the COOK rule-editor CAPSTONE (charter 27: NO MOCK). Drives the real
    // LieutenantScreenController against the live dockerized stack (Traefik @ http://localhost). It:
    //   1. runs Tools/seed_operational_demo.mjs (via Process) and parses its stdout JSON to DISCOVER the
    //      demo creds + the player_id + the lab building id (ids change every run — never hard-coded);
    //   2. signs in via the controller (AuthClient → Bearer);
    //   3. recruits a COOK lieutenant on the lab, builds the 2 demo rules via the rule-MODEL (SetRules,
    //      NOT UI clicks), validates + attaches, and asserts the band projection round-trips (archetype=
    //      COOK / mode=delegated / rule_count_band=FEW / script_source round-trips);
    //   4. PROVES the delegation: with the lab prepped (repaired + precursor + low heat) it advances ticks
    //      (zero player actions) → the lieutenant auto-starts a cook → op_state_band=ACTIVE; then drives
    //      heat ≥ 0.5 (the EVENT(heat,>=,0.5) PAUSE_OPS rule) → PAUSED; then drops heat → ACTIVE again;
    //   5. asserts an INVALID rule surfaces a rendered DslDiagnostic (line/col/kind);
    //   6. asserts NO raw scalar leaks client-side (the band rows only — the player's authored script_source
    //      / diagnostics / rule previews are correctly excluded from RenderedTexts).
    //
    // The lab prep + the heat drive use the SAME subprocess mechanism the seeder uses (psql inside the pg
    // container), resolving an absolute docker binary (the Editor does not inherit the login-shell PATH). The
    // tick advance hits the production-gated /v1/_test/citysim/advance harness (no auth; Idempotency-Key) via
    // UnityWebRequest. Heat is driven DETERMINISTICALLY (a psql set of buildings.heat) rather than relying on
    // the natural heat-feedback (Phase-6's stored-product heat radiation), so the PAUSE/RESUME transitions are
    // reproducible inside the test window.
    // TD-490 — SANS catégorie, ce fichier était invisible à TOUT filtre : ni le juge ni
    // personne ne pouvait le demander. Onze fichiers, 29 tests dans ce cas au 2026-09-02.
    // *Un test qui n'a jamais tourné et un test qui passe rendent la même absence d'erreur.*
    // ⚠️ Pas de préfixe `Capture` : cette catégorie EXISTE, le filtre d'Unity matche par
    // PRÉFIXE, et la demander emporterait celle-ci — or `Capture` fait SIGSEGV (Mesa).
    [Category("EcranRegleLieutenant")]
    public class LieutenantRuleEditorPlayModeTests
    {
        private GameObject controllerGo;

        // Discovered from the seeder's stdout (see RunSeeder).
        private static string demoEmail;
        private static string demoPassword;
        private static string playerId;
        private static string labId;
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

        // Seed THIS fixture's precondition immediately before its tests run (NUnit guarantees OneTimeSetUp fires
        // after any prior fixture completes and before this fixture's first test). The operational seeder deletes +
        // recreates this player's buildings with new ids; seeding here makes the seed→use atomic per fixture and the
        // full PlayMode suite order-independent (a sibling op fixture's re-seed can never invalidate the ids THIS
        // fixture loads — they're re-seeded + re-cached right before this fixture runs).
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

            Assert.IsFalse(string.IsNullOrEmpty(demoEmail), "discovered demo email");
            Assert.IsFalse(string.IsNullOrEmpty(demoPassword), "discovered demo password");
            Assert.IsTrue(IsUuid(playerId), $"discovered player uuid (got '{playerId}')");
            Assert.IsTrue(IsUuid(labId), $"discovered lab uuid (got '{labId}')");

            Debug.Log($"[LieutenantE2E] seeded — player={playerId} lab={labId} email={demoEmail}");
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

        // Prep the lab so a delegated COOK can run a cook: repair it (the seeder raids it → DAMAGED), clear the audit
        // pin, set the heat, and (re)seed precursor so a startCook can begin. heatValue drives the PAUSE/RESUME rule
        // deterministically (≥ 0.5 → the EVENT(heat,>=,0.5) PAUSE_OPS rule fires; < 0.5 → it doesn't).
        private static void PrepLab(double heatValue)
        {
            Psql($"UPDATE building_operational_state SET structural_state='operational' WHERE building_id='{labId}';");
            Psql($"UPDATE buildings SET heat={heatValue.ToString(System.Globalization.CultureInfo.InvariantCulture)}, audit_pin_expires_at=NULL WHERE building_id='{labId}';");
            Psql($"DELETE FROM precursor_stock WHERE building_id='{labId}';");
            // D1 C4 (back) : le cook — délégué compris, cook-binding vérifie les signaux — exige les
            // 3 précurseurs dans le bâtiment ; pyralin seul laissait l'auto-cook en IDLE.
            Psql($"INSERT INTO precursor_stock (player_id, building_id, precursor_type, quantity_units) VALUES ('{playerId}','{labId}','pyralin',20),('{playerId}','{labId}','thalmite',20),('{playerId}','{labId}','garnet_salt',20);");
        }

        // Set ONLY the lab's heat (the PAUSE driver), leaving structural_state + precursor untouched.
        private static void SetLabHeat(double heatValue)
        {
            Psql($"UPDATE buildings SET heat={heatValue.ToString(System.Globalization.CultureInfo.InvariantCulture)} WHERE building_id='{labId}';");
        }

        // Clear the player's lieutenant roster (+ the orphaned 1-1 behavior_script rows) so EACH test recruits a FRESH
        // COOK into an empty roster — the roster cap (T.lieutenant.max_count_per_player; this stack caps at 2) would
        // otherwise 409 the 3rd recruit once tests accumulate. The seeder runs ONCE per fixture ([OneTimeSetUp]); the
        // tests recruit per-test, so the roster must be reset per-test. Same FK-order the seeder reset uses: capture the
        // behavior_script_ids → delete the lieutenant rows → delete the now-orphaned behavior_script rows.
        private static void ResetRoster()
        {
            string scriptIds = Psql(
                "SELECT COALESCE(string_agg(quote_literal(behavior_script_id::text), ','), '') " +
                $"FROM lieutenant WHERE player_id='{playerId}' AND behavior_script_id IS NOT NULL;");
            Psql($"DELETE FROM lieutenant WHERE player_id='{playerId}';");
            if (!string.IsNullOrEmpty(scriptIds))
                Psql($"DELETE FROM behavior_script WHERE script_id IN ({scriptIds});");
        }

        // Advance the player's in-game clock N ticks via the deterministic harness (no auth; Idempotency-Key mandated).
        // Each tick is one game minute → the MINUTE/19 LIEUTENANT_TICK fires once per tick (the delegation evaluation).
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

        // Instantiate the controller, point it at the live stack with the discovered creds, sign in, recruit a COOK on
        // the lab. Leaves the controller authenticated with LastRecruitedId set. Destroyed-guarded resumes throughout.
        private IEnumerator BringUpRecruitedCook(System.Action<LieutenantScreenController> onReady)
        {
            controllerGo = new GameObject("LieutenantScreenController");
            var controller = controllerGo.AddComponent<LieutenantScreenController>();
            controller.SetBaseUrl(BaseUrl);
            // The controller signs in with its own demo creds; the seeder seeds the SAME operational demo player
            // (operational_demo@example.test / operational-demo-pw), so the defaults match the discovered creds. We
            // assert that match so a future seeder/controller drift fails loudly here rather than at sign-in.
            Assert.AreEqual("operational_demo@example.test", demoEmail,
                "the seeder's demo email matches the controller's default demo identifier");
            controller.AssignedBuildingId = labId;

            float elapsed = 0f;
            yield return controller.SignIn();
            while (!controller.IsAuthenticated && controller.AuthError == null && elapsed < 20f)
            {
                elapsed += Time.deltaTime; yield return null;
            }
            Assert.IsNull(controller.AuthError, $"sign-in errored: {controller.AuthError}");
            Assert.IsTrue(controller.IsAuthenticated, "controller signed in (Bearer acquired)");

            // Start each test with an EMPTY roster (the cap would 409 an accumulated recruit; the seeder runs once per
            // fixture, the tests recruit per-test). The recruit's lab-host gate validates owned + conversion-operational +
            // type=lab (NOT structural_state), so a recruit succeeds on the seeded lab even before PrepLab repairs it.
            ResetRoster();

            yield return controller.RecruitCook();
            Assert.IsTrue(IsUuid(controller.LastRecruitedId),
                $"recruit returned a lieutenant_id uuid (got '{controller.LastRecruitedId}', outcome='{controller.LastOutcome}')");

            onReady(controller);
        }

        // The 2 canonical demo rules (built via the rule-MODEL, never UI clicks). The heat rule's value MUST be 0.5
        // (the runtime `heat` is the building's heat, constrained to [0,1] — heat>=5 would never fire PAUSE).
        private static List<RuleRow> DemoRules() => new List<RuleRow>
        {
            new RuleRow("STATE", "cook_idle", "==", "true", "EXECUTE_DEFAULT", 10),
            new RuleRow("EVENT", "heat", ">=", "0.5", "PAUSE_OPS", 100),
        };

        // ------------------------------------------------------------ the tests --

        // (1) FULL LOOP: seed → signin → recruit COOK → SetRules(2) → Validate (valid) → Attach (ok) → RefreshBands →
        //     bands archetype=COOK / mode=delegated / rule_count_band=FEW / script_source round-trips the 2 rules.
        [UnityTest]
        public IEnumerator FullLoop_RecruitValidateAttach_BandsRoundTrip()
        {
            LieutenantScreenController controller = null;
            yield return BringUpRecruitedCook(c => controller = c);

            // Build the 2 demo rules via the rule-model (no UI clicks).
            controller.SetRules(DemoRules());
            Assert.AreEqual(2, controller.Rules.Count, "2 demo rules authored");

            // Validate (dry-run) → no diagnostics, outcome valid.
            yield return controller.ValidateRules();
            Assert.AreEqual(0, controller.LastDiagnostics.Length,
                $"a valid script produces no diagnostics (got {controller.LastDiagnostics.Length}; outcome='{controller.LastOutcome}')");
            StringAssert.Contains("valid", controller.LastOutcome, "validate outcome reports the script is valid");

            // Attach → success → bands refreshed.
            yield return controller.AttachRules();
            Assert.AreEqual(0, controller.LastDiagnostics.Length, "attach of a valid script produces no diagnostics");
            Assert.IsTrue(controller.StatusShown, "the Status section rendered the bands after attach");

            LieutenantBands b = controller.CurrentBands;
            Assert.IsNotNull(b, "bands projection parsed");
            Assert.AreEqual("COOK", b.archetype, "archetype band is COOK");
            Assert.AreEqual("executor", b.granted_role, "granted_role band is executor");
            Assert.AreEqual("delegated", b.mode, "mode band is delegated");
            Assert.AreEqual("FEW", b.rule_count_band, "rule_count_band is FEW (2 rules)");

            // script_source round-trips the serialized 2 rules (the backend may append a trailing newline — compare the
            // trimmed body line-for-line).
            string expected = RuleModel.SerializeRules(DemoRules());
            Assert.AreEqual(expected.Trim(), (b.script_source ?? string.Empty).Trim(),
                "script_source round-trips the serialized demo rules");

            // ⛔⛔ CES TROIS ASSERTIONS ÉPINGLAIENT DES LIBELLÉS ANGLAIS, et elles sont rouges depuis
            // que le client demande le français. Mesuré le 2026-09-06 — le corpus rendu porte
            // « Cuisinier », « Exécutant », « Délégué ». Deux causes DIFFÉRENTES derrière un même
            // symptôme, et elles ne se réparent pas pareil :
            //   · `Cook`/`Delegated` viennent de `FamilleLabels`, qui contient **0 appel** au
            //     catalogue i18n : ce sont des littéraux français EN DUR. Il n'y a aucune langue
            //     à prouver ici — le catalogue n'est pas dans le chemin.
            //   · `A few rules` vient du catalogue SERVI (`Libelle.De("famille","rulecount",…)`).
            //     Sa langue est une propriété RÉELLE, mais elle se prouve UNE fois, ailleurs, avec
            //     un contrôle positif (le patron de ⑧) — pas trois fois ici, en passant.
            //
            // ⛔ ET LA RÉPARATION ÉVIDENTE EST UNE TAUTOLOGIE : comparer le rendu à
            //   `FamilleLabels.Archetype(b.archetype)` met le MÊME producteur des deux côtés —
            //   vrai que le résolveur rende du français, de l'anglais ou du charabia. C'est
            //   exactement ce que fait `Accrual_…:403` sur l'ancienneté, et cette assertion-là ne
            //   prouve rien depuis le jour où elle a été écrite.
            //
            // ⇒ CE QUE CES LIGNES DOIVENT PROUVER, ET QUI NE DÉPEND D'AUCUNE LANGUE : que l'écran
            //   a bien TRADUIT le code du serveur en libellé — c'est-à-dire (1) que le code brut
            //   ne fuit pas jusqu'au joueur, et (2) que le libellé affiché est celui que le
            //   résolveur produit POUR LA VALEUR SERVIE, pas pour une autre.
            var texts = controller.RenderedTexts;

            // (1) Aucun code de domaine ne doit atteindre l'écran. Langue-indépendant, et c'est la
            //     régression que le joueur verrait : « COOK » en capitales au milieu d'une phrase.
            foreach (string brut in new[] { b.archetype, b.granted_role, b.mode, b.rule_count_band })
                Assert.IsFalse(texts.Any(x => x == brut),
                    $"le code brut « {brut} » est rendu TEL QUEL : le résolveur n'a pas été " +
                    "appelé sur ce champ, et le joueur lit un identifiant de serveur.");

            // (2) Le libellé affiché est celui du résolveur POUR LA VALEUR SERVIE — et l'assertion
            //     n'est pas vide parce qu'elle est doublée d'un contrôle d'ANTI-DÉGÉNÉRESCENCE :
            //     le résolveur doit rendre AUTRE CHOSE pour une autre valeur du domaine. Sans lui,
            //     un résolveur qui renverrait une constante passerait les deux lignes.
            string libArchetype = FamilleLabels.Archetype(b.archetype);
            Assert.AreNotEqual(libArchetype, FamilleLabels.Archetype("MUSCLE"),
                "anti-dégénérescence : le résolveur d'archétype rend la MÊME chose pour deux " +
                "valeurs différentes — l'assertion suivante serait vraie sans rien prouver.");
            Assert.IsTrue(texts.Any(x => x == libArchetype),
                $"l'archétype servi est « {b.archetype} » et le résolveur en fait " +
                $"« {libArchetype} », qu'aucun texte de l'écran ne porte : la valeur du serveur " +
                "n'a pas atteint le rendu.");
            // ✅ Et depuis `3e57e98` cette ligne discrimine vraiment : `ArchetypeLabel` a été
            //    supprimé, il n'y a plus qu'un producteur. Auparavant elle passait quel que soit
            //    celui des deux qui avait couru — *verte pour la mauvaise raison*.

            // ✅ TD-611 FERMÉE (`3e57e98`) — ET CETTE ASSERTION EST LA PREUVE QU'ELLE L'EST.
            // Elle était impossible il y a une heure : `mode` avait DEUX producteurs, l'un rendant
            // « DÉLÉGUÉ » (littéral en dur) et l'autre « Délégué » (catalogue), tous deux appelés.
            // Viser l'un revenait à être vert ou rouge selon celui qui avait couru — j'ai fait
            // l'erreur, et le test est parti rouge en accusant l'écran.
            // ⇒ Il n'y a désormais qu'un producteur PUBLIC par grandeur : le test appelle
            //   exactement ce que l'écran appelle. *Une assertion sur un libellé n'est possible
            //   que lorsqu'il n'y a plus de choix de producteur à faire.*
            string libMode = FamilleLabels.Mode(b.mode);
            Assert.AreNotEqual(libMode, FamilleLabels.Mode("tasked"),
                "anti-dégénérescence : le résolveur de mode rend la même chose pour ses deux " +
                "valeurs — l'assertion suivante serait vraie sans rien prouver.");
            Assert.IsTrue(texts.Any(x => x == libMode),
                $"le mode servi est « {b.mode} » → « {libMode} », qu'aucun texte de l'écran ne " +
                "porte. Corpus : [" + string.Join(" · ", texts) + "]");

            // ⚠️ `rule_count_band` passe par le CATALOGUE, pas par `FamilleLabels` : on ne peut pas
            //    le résoudre ici sans dupliquer la clé. On asserte donc la seule propriété
            //    langue-indépendante disponible — le code brut ne fuit pas (couvert en (1)) — et
            //    la langue de ce champ est prouvée par la garde de catalogue, à un seul endroit.
            //    *Mieux vaut une assertion plus faible et vraie qu'une forte et tautologique.*

            Debug.Log($"[LieutenantE2E] full loop OK — bands archetype={b.archetype} mode={b.mode} rules={b.rule_count_band}");
        }

        /// <summary>Le libellé attendu pour un état — copie ASSUMÉE de `OpStateLabel`, le
        /// producteur que la ligne d'état emploie réellement (`:2579`/`:2591`).
        /// ⚠️ C'est une TROISIÈME copie de la correspondance, et je l'écris en le sachant :
        /// `OpStateLabel` est `private static`, donc inatteignable depuis ce test. Le choix est
        /// entre une copie NOMMÉE comme telle, et une assertion sur `FamilleLabels.Etat` qui
        /// viserait le MAUVAIS producteur — j'ai fait cette erreur sur le `mode` vingt minutes
        /// plus tôt et le test est parti rouge en accusant l'écran.
        /// ⇒ Elle disparaît le jour où TD-611 est fermée : un producteur unique et PUBLIC rend
        ///   cette copie inutile. Tant qu'il y en a deux et qu'ils divergent, un test qui ne
        ///   nomme pas le sien ment sur ce qu'il mesure.</summary>
        private static string OpStateLabelAttendu(string s)
        {
            switch (s)
            {
                case "SETTLING": return MafiaCleanCity.I18n.Libelle.De("famille", "opstate", "Prend ses marques");
                case "ACTIVE":   return MafiaCleanCity.I18n.Libelle.De("famille", "opstate", "Actif");
                case "PAUSED":   return MafiaCleanCity.I18n.Libelle.De("famille", "opstate", "En pause");
                case "IDLE":     return MafiaCleanCity.I18n.Libelle.De("famille", "opstate", "Au repos");
                default:         return MafiaCleanCity.I18n.Libelle.De("famille", "opstate", "État inconnu");
            }
        }

        // (2) DELEGATED STATUS (the proof): the delegated op_state_band tracks the ATTACHED rules — ACTIVE (the COOK
        //     auto-cooks), PAUSED (the heat≥0.5 PAUSE_OPS rule wins), ACTIVE again (PAUSE rule removed → resume).
        //     The transitions are driven by WHICH rules are attached (deterministic, test-controlled), NOT by suppressing
        //     the building's heat: this operational_demo player's city is seeded to BURNING, and the MINUTE/4 heat-
        //     propagation tick recomputes buildings.heat toward the hot-city level (verified empirically: heat ramps
        //     0.1 → 0.35 → 0.60 → 0.85 over 3 ticks) BEFORE the MINUTE/19 LIEUTENANT_TICK reads it — so a psql
        //     `UPDATE buildings SET heat` cannot hold the building below the 0.5 PAUSE threshold. The ACTIVE phases
        //     therefore attach ONLY the cook rule (no PAUSE rule present → the high city heat cannot pause the
        //     delegation); the PAUSED phase adds the heat≥0.5 rule and leans on the genuinely-high city heat.
        [UnityTest]
        public IEnumerator DelegatedStatus_AutoCook_Active_then_Paused_then_Active()
        {
            LieutenantScreenController controller = null;
            yield return BringUpRecruitedCook(c => controller = c);

            // ONLY the cook rule — drives ACTIVE with no PAUSE rule to fight (heat-independent).
            List<RuleRow> cookOnly = new List<RuleRow>
            {
                new RuleRow("STATE", "cook_idle", "==", "true", "EXECUTE_DEFAULT", 10),
            };

            // --- ACTIVE: attach ONLY the cook rule → with the lab prepped (operational + precursor), the delegated COOK
            //     auto-starts a cook → ACTIVE. No PAUSE rule is attached, so the high city heat cannot pause it.
            controller.SetRules(cookOnly);
            yield return controller.ValidateRules();
            Assert.AreEqual(0, controller.LastDiagnostics.Length, "the cook rule validates clean");
            yield return controller.AttachRules();
            Assert.IsTrue(controller.StatusShown, "bands rendered after attach");
            PrepLab(0.1);
            yield return Advance(3);
            yield return controller.RefreshBands();
            Assert.AreEqual("ACTIVE", controller.CurrentBands.op_state_band,
                $"the delegated COOK auto-started a cook → op_state_band ACTIVE (outcome='{controller.LastOutcome}')");

            // --- PAUSED: now attach the heat≥0.5 PAUSE_OPS @100 rule too; the city heat is ≥ 0.5 → the PAUSE rule wins
            //     over EXECUTE_DEFAULT @10 → delegation paused.
            controller.SetRules(DemoRules());
            yield return controller.ValidateRules();
            Assert.AreEqual(0, controller.LastDiagnostics.Length, "the demo rules validate clean");
            yield return controller.AttachRules();
            SetLabHeat(0.8);
            yield return Advance(2);
            yield return controller.RefreshBands();
            Assert.AreEqual("PAUSED", controller.CurrentBands.op_state_band,
                "with the heat≥0.5 PAUSE_OPS rule attached and the city heat high → op_state_band PAUSED");

            // --- ACTIVE again: re-attach ONLY the cook rule (drop the PAUSE rule) → PAUSE_OPS no longer present →
            //     the lieutenant resumes → ACTIVE (again heat-independent, robust against the hot city).
            controller.SetRules(cookOnly);
            yield return controller.ValidateRules();
            yield return controller.AttachRules();
            PrepLab(0.1);
            yield return Advance(3);
            yield return controller.RefreshBands();
            Assert.AreEqual("ACTIVE", controller.CurrentBands.op_state_band,
                "the PAUSE rule removed → the lieutenant resumes → op_state_band ACTIVE");

            // ⛔⛔ CETTE ASSERTION ÉPINGLAIT « Active / Paused / Idle » — trois libellés ANGLAIS,
            // rouges depuis que le client demande le français. Mais la réparer a mis au jour un
            // défaut de PRODUCTION que le rouge cachait, et qui vaut plus que le test :
            //
            // ★★ `op_state_band` A DEUX PRODUCTEURS DANS CE MÊME FICHIER, ET ILS DIVERGENT :
            //      code       OpStateLabel (catalogue, :1038-1045)   FamilleLabels.Etat (en dur, :89-96)
            //      SETTLING   « Prend ses marques »                  « Stabilisation »     ← DIFFÉRENT
            //      IDLE       « Au repos »                           « Repos »             ← DIFFÉRENT
            //      ACTIVE     « Actif »                              « Actif »
            //      PAUSED     « En pause »                           « En pause »
            //    Les deux sont APPELÉS : `:2414` prend `FamilleLabels.Etat` pour la rangée de
            //    l'organigramme, `:2579`/`:2591` prennent `OpStateLabel` pour la ligne d'état.
            //    ⇒ **Un lieutenant en SETTLING lit « Prend ses marques » à un endroit de l'écran et
            //      « Stabilisation » à un autre.** C'est TD-611 qui n'est plus latente : la
            //      duplication ne coûte qu'au jour où l'une des copies bouge, et elle a bougé.
            //
            // ⇒ CE QUE CE TEST PEUT PROUVER SANS CHOISIR UN PRODUCTEUR — et c'est aussi ce que son
            //   intitulé d'origine visait (« never a raw scalar ») : le code de domaine ne fuit pas
            //   jusqu'au joueur. Langue-indépendant, producteur-indépendant, et c'est la régression
            //   que le joueur verrait.
            var texts = controller.RenderedTexts;
            Assert.IsNotEmpty(texts,
                "anti-vacuité : aucun texte rendu — l'assertion suivante serait vraie à vide.");
            foreach (string brut in new[] { "ACTIVE", "PAUSED", "IDLE", "SETTLING" })
                Assert.IsFalse(texts.Any(x => x == brut),
                    $"le code brut « {brut} » est rendu TEL QUEL : l'état n'a pas été traduit en " +
                    "libellé, et le joueur lit un identifiant de serveur.");
            // Et la bande servie DOIT avoir produit un libellé quelque part — sinon « aucun code
            // brut » serait vrai simplement parce que RIEN n'est rendu sur l'état.
            Assert.IsTrue(texts.Any(x => x == OpStateLabelAttendu(controller.CurrentBands.op_state_band)),
                $"l'état servi est « {controller.CurrentBands.op_state_band} » et aucun texte de " +
                "l'écran ne porte le libellé correspondant : la valeur n'a pas atteint le rendu.");

            Debug.Log("[LieutenantE2E] delegated status OK — ACTIVE → PAUSED → ACTIVE (driven by the attached rules)");
        }

        // (3) DIAGNOSTICS: an INVALID rule (priority out of [0,100]) → ValidateRules → LastDiagnostics non-empty AND a
        //     diagnostic carries a line/col/kind (the backend is authoritative; the client renders what it returns).
        [UnityTest]
        public IEnumerator InvalidRule_SurfacesRenderedDiagnostic()
        {
            LieutenantScreenController controller = null;
            yield return BringUpRecruitedCook(c => controller = c);

            // A single rule with an out-of-bounds priority (the slider clamps 0..100, but the rule-model sets it directly
            // — the backend rejects it with PRIORITY_OUT_OF_BOUNDS). The client never re-implements parse/compile.
            controller.SetRules(new List<RuleRow>
            {
                new RuleRow("STATE", "cook_idle", "==", "true", "EXECUTE_DEFAULT", 9999),
            });

            // The controller logs the rejection via Debug.LogError (F2 — the raw code stays on the log line, the readable
            // message goes to the UI). PlayMode fails on an unhandled LogError, so EXPECT it: this 422 is the whole point
            // of the test (an invalid script is SUPPOSED to be rejected + rendered).
            LogAssert.Expect(LogType.Error, new Regex(@"\[Lieutenant\] validate rejected \(422\)"));

            yield return controller.ValidateRules();

            Assert.Greater(controller.LastDiagnostics.Length, 0,
                $"an invalid rule surfaces ≥ 1 diagnostic (outcome='{controller.LastOutcome}')");
            DslDiagnostic d = controller.LastDiagnostics[0];
            Assert.Greater(d.line, 0, "the diagnostic carries a 1-based source line");
            Assert.IsFalse(string.IsNullOrEmpty(d.kind), "the diagnostic carries a stable kind");
            Assert.IsFalse(string.IsNullOrEmpty(d.message), "the diagnostic carries a readable message");
            Assert.AreEqual("PRIORITY_OUT_OF_BOUNDS", d.kind, "the out-of-bounds priority is reported as PRIORITY_OUT_OF_BOUNDS");

            Debug.Log($"[LieutenantE2E] diagnostics OK — line {d.line}:{d.col} [{d.kind}] {d.message}");
        }

        // (4) R2.2 NO-RAW-SCALAR: scan ALL rendered band text → no raw scalar. The band rows are worded; the player's
        //     authored script_source / diagnostics / rule previews are deliberately EXCLUDED from RenderedTexts (they
        //     legitimately carry the player's own numbers), so the scan corpus is band-only.
        [UnityTest]
        public IEnumerator NoRawScalarLeaks_InRenderedBands()
        {
            LieutenantScreenController controller = null;
            yield return BringUpRecruitedCook(c => controller = c);

            controller.SetRules(DemoRules());
            yield return controller.ValidateRules();
            yield return controller.AttachRules();
            Assert.IsTrue(controller.StatusShown, "bands rendered after attach");

            // Drive a state change so a non-trivial op-state band is rendered (ACTIVE) — the scan still must find no scalar.
            PrepLab(0.1);
            yield return Advance(3);
            yield return controller.RefreshBands();

            foreach (string t in controller.RenderedTexts)
            {
                Assert.IsFalse(Regex.IsMatch(t, @"(?<![A-Za-z])\d+(\.\d+)?(?![A-Za-z])"),
                    $"no raw scalar may be shown client-side in a band, but rendered text was: '{t}'");
            }

            Debug.Log($"[LieutenantE2E] no-raw-scalar OK — scanned {controller.RenderedTexts.Count} band texts, all worded");
        }
    }
}
