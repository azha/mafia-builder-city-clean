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
    // TD-490 — SANS catégorie, ce fichier était invisible à TOUT filtre : ni le juge ni
    // personne ne pouvait le demander. Onze fichiers, 29 tests dans ce cas au 2026-09-02.
    // *Un test qui n'a jamais tourné et un test qui passe rendent la même absence d'erreur.*
    // ⚠️ Pas de préfixe `Capture` : cette catégorie EXISTE, le filtre d'Unity matche par
    // PRÉFIXE, et la demander emporterait celle-ci — or `Capture` fait SIGSEGV (Mesa).
    [Category("EcranExceptions")]
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
            // ⛔⛔ LE CATALOGUE i18n EST UN GLOBAL STATIQUE MUTABLE, et le rendre était écrit DANS
            // le corps d'un test — donc sauté à la première assertion rouge. Un test qui échoue
            // laissait alors `I18nCatalog` peuplé pour TOUS les tests suivants du run : un état
            // partagé qui ne se manifeste qu'EN GROUPE, jamais en solo. C'est le mécanisme que
            // TD-576 cherchait à nommer — le premier trouvé qui ne passe par AUCUN pixel, donc
            // qui n'incrimine pas le pilote graphique.
            // ⇒ Le nettoyage d'un global appartient au TEARDOWN, jamais à la fin du corps :
            //   *un nettoyage écrit à la fin d'un test ne s'exécute que si le test réussit,
            //   c'est-à-dire exactement quand on n'en a pas besoin.*
            MafiaCleanCity.I18n.I18nCatalog.Oublier();

            // A test may end with a detail screen still open (its Nav_ host is a SIBLING of controllerGo) —
            // destroy it too so its canvas overlay never leaks into the next test (final-review Minor 1).
            // ⛔⛔ `DestroyImmediate`, JAMAIS `Destroy` — ET C'EST LA CAUSE DE TD-576.
            // `Object.Destroy` est DIFFÉRÉ à la fin de la frame : le contrôleur survit au
            // `[TearDown]`, ses coroutines continuent de courir, et sa requête en vol revient
            // PENDANT LE TEST SUIVANT. Elle journalise alors « [ExceptionQueue] load failed:
            // 401 » — et NUnit impute tout log d'erreur non déclaré au test qui court à cet
            // instant.
            // ★ *La victime n'est donc jamais le test fautif : c'est celui qui passait par là.*
            //   D'où toute la signature de TD-576 — vert SEUL, rouge EN GROUPE, et un test
            //   accusé DIFFÉRENT d'un run à l'autre. Mesuré ici sur `ScreenB3,EcranExceptions` :
            //   `B3C1` accusé d'une erreur émise par la suite des exceptions. Les trois
            //   `Capture*` tombaient pour la même raison — une capture dure longtemps, donc
            //   c'est elle qui a le plus de chances de courir quand l'orphelin parle.
            // ⇒ `DestroyImmediate` arrête les coroutines SYNCHRONEMENT, avant que le test
            //   suivant ne commence. Un objet « détruit » qui vit encore une frame n'est pas
            //   détruit : il est en sursis, et ce sursis est partagé.
            var queue = controllerGo != null ? controllerGo.GetComponent<ExceptionQueueController>() : null;
            if (queue != null && queue.LastNavGameObject != null) Object.DestroyImmediate(queue.LastNavGameObject);
            if (controllerGo != null) Object.DestroyImmediate(controllerGo);
            controllerGo = null;
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
                Assert.That(new[] { "tentative", "likely", "confident" }, Does.Contain(c.confidence_band), // casse = ConfidenceBucket canon (back lot-3 TD-072, 2026-06-13)
                    $"confidence_band '{c.confidence_band}' not in closed set for card {c.event_descriptor}");
                Assert.That(new[] { "silent", "watching", "urgent", "critical" }, Does.Contain(c.priority_band), // PriorityBucket canon (back lot-3 TD-072)
                    $"priority_band '{c.priority_band}' not in closed set for card {c.event_descriptor}");
                Assert.That(new[] { "MILD", "MODERATE", "SEVERE" }, Does.Contain(c.severity_band), // SeverityEnum canon REUSE 08 (back lot-3 TD-072)
                    $"severity_band '{c.severity_band}' not in closed set for card {c.event_descriptor}");
            }
            var heat = ctl.Cards.First(c => c.event_descriptor == "exc_demo_teach_heat");
            Assert.AreEqual("confident", heat.confidence_band);
            // Épingles = valeurs MESURÉES sur la route réelle (2026-08-20, carte seedée exc_demo_teach_heat).
            Assert.AreEqual("critical", heat.priority_band);
            Assert.AreEqual("SEVERE", heat.severity_band);
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
    
        // ═══ screen_a8 — la catégorie de couche conflit ═══════════════════════════════════

        /// <summary>⛔ CE TEST NE PROUVE PAS QUE L'ÉCRAN CLASSERA BIEN LES VRAIES EXCEPTIONS.
        ///
        /// Il exerce `CategorieConflit` sur des descripteurs que J'AI écrits, à partir des noms de
        /// mécaniques du canon — pas d'un seul corps observé. `front.md` mesure « 0 occurrence de
        /// la variante conflit » (2026-08-27) et la session back le confirme le 2026-09-02 : zéro
        /// exception de conflit sur le compte de démo. Il n'existe donc aucune clé réelle à
        /// laquelle se confronter.
        /// ⇒ Ce qu'il teste vraiment : que la fonction est TOTALE et PRUDENTE — elle reconnaît les
        ///   quatre familles quand le fragment est là, et elle rend `null` plutôt qu'une catégorie
        ///   par défaut quand elle ne reconnaît rien. C'est une garde sur ma lecture du canon, pas
        ///   sur le serveur, et c'est tout ce qu'elle peut être aujourd'hui.
        /// ★ La leçon de ㊲ vaut ici : une garde ne teste jamais la source, elle teste ma lecture
        ///   de la source. Autant l'écrire sur la garde elle-même.</summary>
        [Test]
        public void ScreenA8_LaCategorieDeConflit_ReconnaitLesQuatreFamillesEtSeTaitSinon()
        {
            ExceptionCardDto Carte(string descripteur) =>
                new ExceptionCardDto { event_descriptor = descripteur };

            // positifs — un par famille du canon
            // « REPUTATION » → « RÉPUTATION » (2026-09-03) : la thèse du test ne bouge pas — il
            // vérifie que les QUATRE familles sont reconnues et que rien n'est inventé sinon ;
            // seul l'accent sur la capitale change. Convention déjà posée par le menu Plus
            // (« LA RÉPUTATION », `AppShell.cs`) : en français l'accent sur capitale est correct.
            Assert.AreEqual("RÉPUTATION",
                ExceptionQueueController.CategorieConflit(Carte("exception.boss_mirror.divergence")));
            Assert.AreEqual("DIPLOMATIE",
                ExceptionQueueController.CategorieConflit(Carte("exception.sealed_envelope.reveal_due")));
            Assert.AreEqual("RENSEIGNEMENT",
                ExceptionQueueController.CategorieConflit(Carte("exception.regime.switch_detected")));
            Assert.AreEqual("CONFLIT",
                ExceptionQueueController.CategorieConflit(Carte("exception.dead_hand.imminent")));

            // négatifs — RIEN ne doit sortir d'un descripteur hors couche conflit, ni du vide.
            // Sans ces trois-là, une fonction qui rendrait « CONFLIT » pour tout passerait les
            // quatre assertions du dessus.
            Assert.IsNull(ExceptionQueueController.CategorieConflit(Carte("exception.maintenance.due")));
            Assert.IsNull(ExceptionQueueController.CategorieConflit(Carte("")));
            Assert.IsNull(ExceptionQueueController.CategorieConflit(null));
        }

        // ═══ ⑩ — la main de cartes, et le chemin joueur qui l'ouvre ══════════════════════════

        /// <summary>⛔ CHAQUE ATTENDANT OUVRE SA PROPRE CARTE — pas celle du premier.
        ///
        /// Avant, seul le tampon ouvrait ⑩, et toujours sur `Cards[0]` : les deuxième et
        /// troisième attendants étaient dessinés, alignés, lisibles, et MORTS au toucher. Aucune
        /// garde structurelle ne pouvait le voir — les trois existent, aux bonnes places, avec
        /// les bonnes valeurs.
        /// ⚠️ Et le piège de la capture par référence est réel : un `foreach` qui passe `c` à la
        /// lambda sans copie fait ouvrir la DERNIÈRE carte aux trois attendants. Ce test
        /// l'attrape parce qu'il exige l'identité de la carte ouverte, pas seulement qu'une
        /// carte s'ouvre.</summary>
        [UnityTest, Category("Ecran10")]
        public IEnumerator Ecran9_ChaqueAttendantOuvreSaPropreCarte()
        {
            ExceptionQueueController ctl = null;
            yield return MonterFileAvecCartes(new[] { "a", "b", "c" }, c => ctl = c);

            // ⛔ NAVIGUER DEPUIS LA RACINE VIVANTE, jamais `GameObject.Find`. `RendreFile`
            // détruit ses enfants avant de les recréer et `Destroy` est DIFFÉRÉ : la recherche
            // par nom rendait un attendant de la génération précédente, encore trouvable et déjà
            // condamné. Son `onClick` levait sur un contrôleur mort — sans jamais entrer dans
            // `OpenDetail`, ce que le diagnostic a montré (aucune trace pour les cartes a/b/c).
            var attendants = ctl.AttendantsPourTest();
            Assert.AreEqual(3, attendants.Count,
                $"la file doit porter trois attendants touchables (mesuré {attendants.Count})");
            for (int i = 0; i < 3; i++)
            {
                var bouton = attendants[i];
                Assert.IsNotNull(bouton, $"l'attendant {i} doit être touchable — sinon il est décoratif");

                bouton.onClick.Invoke();
                yield return null;
                Assert.IsNotNull(ctl.LastDetail, $"l'attendant {i} doit avoir ouvert un détail");
                Assert.AreEqual(ctl.Cards[i].exception_id, ctl.LastDetail.CurrentCard.exception_id,
                    $"l'attendant {i} a ouvert la carte d'un AUTRE : la lambda capture la variable " +
                    "de boucle au lieu d'une copie, et les trois ouvrent la même.");
                ctl.LastDetail.Back();
                yield return null;
            }
        }

        /// <summary>Les trois rôles de la main sont décidés sur la DONNÉE, pas sur l'ordre du
        /// tableau : suggérée = `suggested_action`, « lui apprendre » = celle qui porte
        /// `add_rule_dsl`, risquée = la première autre. Le talon porte le CARDINAL du reste.
        /// ⚠️ Contrôle négatif inclus : une carte à UNE seule issue ne doit produire NI risquée
        /// NI apprendre NI talon — mesuré, `exc_demo_one_time` est exactement ce cas.</summary>
        [UnityTest, Category("Ecran10")]
        public IEnumerator Ecran10_LesRolesDeLaMainViennentDeLaDonnee()
        {
            ExceptionQueueController ctl = null;
            yield return MonterFileAvecCartes(new[] { "riche" }, c => ctl = c);
            ctl.Cards[0].suggested_action = new CandidateActionDto { id = "sug", label = "Réparer" };
            ctl.Cards[0].candidate_actions = new[]
            {
                new CandidateActionDto { id = "risq", label = "Soudoyer" },
                new CandidateActionDto { id = "sug",  label = "Réparer" },
                new CandidateActionDto { id = "appr", label = "Gérer seul", add_rule_dsl = "WHEN raid THEN repair" },
                new CandidateActionDto { id = "autre1", label = "X" },
                new CandidateActionDto { id = "autre2", label = "Y" },
            };
            ctl.OpenDetail(ctl.Cards[0]);
            yield return null;
            for (int i = 0; i < 5; i++) yield return null;

            var textes = ctl.LastDetail.RenderedTexts;
            CollectionAssert.Contains(textes, "Suggéré");
            CollectionAssert.Contains(textes, "Risqué");
            CollectionAssert.Contains(textes, "Lui apprendre");
            CollectionAssert.Contains(textes, "+2",
                "cinq issues, trois montrées ⇒ le talon doit porter « +2 » : c'est un cardinal, " +
                "pas un ornement");
            ctl.LastDetail.Back();
            yield return null;

            // — contrôle négatif : une seule issue —
            ExceptionQueueController ctl2 = null;
            yield return MonterFileAvecCartes(new[] { "pauvre" }, c => ctl2 = c);
            ctl2.Cards[0].suggested_action = new CandidateActionDto { id = "seule", label = "Laisser filer" };
            ctl2.Cards[0].candidate_actions = new[]
            {
                new CandidateActionDto { id = "seule", label = "Laisser filer" },
            };
            ctl2.OpenDetail(ctl2.Cards[0]);
            yield return null;
            for (int i = 0; i < 5; i++) yield return null;

            var t2 = ctl2.LastDetail.RenderedTexts;
            CollectionAssert.Contains(t2, "Suggéré");
            CollectionAssert.DoesNotContain(t2, "Risqué",
                "une carte à une seule issue ne doit pas inventer de carte « risquée » pour " +
                "remplir le dessin");
            CollectionAssert.DoesNotContain(t2, "Lui apprendre");
            Assert.IsFalse(t2.Contains("+0") || t2.Contains("+1"),
                "aucune issue restante ⇒ pas de talon du tout");
        }

        /// <summary>Monte ⑨ SANS réseau et rend des cartes FABRIQUÉES.
        ///
        /// ⛔ IL FAUT LAISSER `Boot()` ÉCHOUER D'ABORD, et c'est la mesure qui l'a dit. `Start()`
        /// lance `Boot()` → `SignIn()` → `LoadQueue()` : sans jeton, la file part en 401, ÉCRASE
        /// `Cards` et re-rend un comptoir vide. Fabriquer avant, c'était fabriquer sous un
        /// chargement réseau qui allait tout balayer une frame plus tard.
        /// ★ Le test échouait d'abord sur « l'attendant n'a rien ouvert », ce qui désignait le
        ///   clic. Le clic n'était pas en cause : l'attendant que je trouvais était celui du
        ///   rendu d'APRÈS l'échec réseau. J'ai corrigé deux fois la mauvaise chose (le
        ///   navigateur, puis le repli) avant d'instrumenter et de voir que `OpenDetail` n'était
        ///   jamais atteint. **Deux corrections plausibles ne valent pas une mesure.**
        /// ⚠️ `ignoreFailingMessages` parce que le 401 est ATTENDU ici : ce test porte sur le
        /// RENDU, pas sur le réseau. Sans ça, le log d'erreur fait échouer NUnit tout seul.</summary>
        private IEnumerator MonterFileAvecCartes(string[] ids, System.Action<ExceptionQueueController> pret)
        {
            LogAssert.ignoreFailingMessages = true;
            controllerGo = new GameObject("ExceptionQueueScreen");
            var ctl = controllerGo.AddComponent<ExceptionQueueController>();

            // laisser Boot() partir, échouer, et finir de rendre son comptoir vide
            for (int i = 0; i < 12; i++) yield return null;

            var cartes = new ExceptionCardDto[ids.Length];
            for (int i = 0; i < ids.Length; i++)
                cartes[i] = new ExceptionCardDto
                {
                    exception_id = ids[i],
                    event_descriptor = "descripteur " + ids[i],
                    severity_band = "MILD", priority_band = "SILENT", confidence_band = "LIKELY",
                    resolution_status = "pending",
                    suggested_action = new CandidateActionDto { id = "s_" + ids[i], label = "Agir" },
                    candidate_actions = new[] { new CandidateActionDto { id = "s_" + ids[i], label = "Agir" } },
                };
            ctl.RendrePourTest(cartes);
            yield return null;
            pret(ctl);
        }

        /// <summary>⛔ LE CORPS DU RESOLVE DOIT PORTER `chosen_action_id`, exactement.
        ///
        /// TD-451, mesuré par la session back : un corps qui porte `action_id` au lieu de
        /// `chosen_action_id` rend **200**, le serveur IGNORE le champ, et **la carte est
        /// consommée sans faire ce qu'on demandait**. C'est comme ça qu'une carte enseignable a
        /// été brûlée.
        /// ★ Le pire mode de panne de la nuit : pas une erreur, un SUCCÈS qui ne fait pas ce
        ///   qu'on croit. Aucun code HTTP ne le signale, aucune garde de statut ne l'attrape —
        ///   seule la FORME du corps envoyé le dit.
        /// ⇒ Cette garde sérialise la requête réelle et lit le JSON. Le contrôle négatif est ce
        ///   qui lui donne sa valeur : sans lui, un DTO renommé passerait au vert.</summary>
        [Test]
        public void LeCorpsDuResolve_PorteChosenActionId_PasActionId()
        {
            string json = JsonUtility.ToJson(
                new ResolveRequest { method = "ONE_TIME", chosen_action_id = "acknowledge" });

            StringAssert.Contains("\"chosen_action_id\"", json,
                "le serveur n'accepte que `chosen_action_id` ; sous tout autre nom il rend 200, " +
                "ignore le champ et consomme la carte (TD-451)");
            StringAssert.Contains("\"acknowledge\"", json, "la valeur doit voyager avec le champ");
            StringAssert.Contains("\"method\"", json);

            // contrôle négatif : le nom fautif ne doit apparaître NULLE PART dans le corps
            Assert.IsFalse(System.Text.RegularExpressions.Regex.IsMatch(json, "\"action_id\"\\s*:"),
                "un champ `action_id` seul est le piège TD-451 — il réussit en silence");
        }

        /// <summary>⛔ `MethodFor` NE DOIT JAMAIS RENDRE UN TEXTE TRADUIT.
        ///
        /// Sa valeur ne s'affiche pas : elle part dans le CORPS de `resolve` comme `method`. Si
        /// quelqu'un la faisait passer par le résolveur i18n « pour être cohérent », le client
        /// enverrait un jour un `method` traduit — et le serveur ne le dirait pas : TD-451 a
        /// mesuré qu'un corps mal formé rend **200**, ignore le champ, et consomme la carte.
        /// ★ Une chaîne qui VOYAGE vers le serveur n'est pas un libellé, même écrite en
        ///   majuscules lisibles. La question n'est pas « est-ce du texte ? » mais « qui le lit —
        ///   un joueur ou un handler ? ». Cette garde fixe la réponse.</summary>
        [Test]
        public void MethodFor_RendUneValeurDeProtocole_JamaisUnLibelleTraduit()
        {
            // Un dictionnaire qui traduirait ces valeurs : s'il était consulté, le test le verrait.
            MafiaCleanCity.I18n.I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string> {
                { "exception_detail.bloc.add_rule", "Ajouter une règle" },
                { "exception_detail.bloc.one_time", "Une seule fois" },
            });

            var enseignable = new CandidateActionDto { id = "a", label = "x", add_rule_dsl = "WHEN y THEN z" };
            var simple      = new CandidateActionDto { id = "b", label = "y" };

            Assert.AreEqual("ADD_RULE", ExceptionDetailController.MethodFor(enseignable, addAsRule: true),
                "la méthode part dans le corps de resolve : elle doit rester la valeur de PROTOCOLE");
            Assert.AreEqual("ONE_TIME", ExceptionDetailController.MethodFor(simple, addAsRule: true));
            Assert.AreEqual("ONE_TIME", ExceptionDetailController.MethodFor(enseignable, addAsRule: false));

            // ⛔ PAS D'`Oublier()` ICI — il est au `[TearDown]`, voir plus haut. Posé en ligne, il
            // était SAUTÉ dès qu'une des trois assertions ci-dessus échouait : NUnit lève, la
            // dernière ligne ne court jamais, et le catalogue STATIQUE restait peuplé pour tout le
            // reste du run. *Un nettoyage écrit à la fin d'un test ne s'exécute que si le test
            // réussit — c'est-à-dire exactement quand on n'en a pas besoin.*
        }
}
}
