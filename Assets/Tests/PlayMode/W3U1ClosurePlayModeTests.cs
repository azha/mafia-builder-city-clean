using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using NUnit.Framework;
using UnityEngine;
using Debug = UnityEngine.Debug;

namespace MafiaCleanCity.Shell.Tests
{
    // W3.U1 C9 (design §3 C9, §3-bis) — clôture : la falsifiable DU DÉCOUPAGE. Le total n'est pas
    // inventé : c'est l'ensemble FERMÉ des clés que `SessionOpenDto` déclare (design §3-bis, W3.U1
    // C2 GREW it 11 -> 12 avec `opened_game_day`). L'oracle compte les clés de l'INTERFACE (par
    // réflexion, jamais un motif texte — la faute n°3 du design), celles référencées par les
    // chunks, celles déclarées NON consommées, et asserte 11 + 1 = 12.
    [Category("W3U1")]
    public class W3U1ClosurePlayModeTests
    {
        // Table recopiée VERBATIM de design §3-bis (le tableau "clé du payload | chunk qui la
        // consomme") — W3.U1 C2 y ajoute `opened_game_day` (D3, Q2 = OUI, tranché par le contrôleur).
        private static readonly Dictionary<string, string> ConsumedByChunk = new Dictionary<string, string>
        {
            { "session_id", "C3" },
            { "hl_card", "C4" },
            { "queue", "C5" },
            { "backlog_badge", "C2" },
            { "queue_pressure_band", "C7" },
            { "structural_budget", "C4" },
            { "flag_review", "C8 (+ C7 pour l'ouverture auto)" },
            { "friction_glance", "C6" },
            { "compression_glance", "C6 (vital) + C7 (bandeau)" },
            { "onboarding", "C7" },
            { "opened_game_day", "C2 (D3/§3-bis — la 12e clé)" },
        };

        // La SEULE clé explicitement classée NON consommée par ce lot (design §3-bis).
        private const string DeclaredNonConsumed = "settling_glance";

        [Test]
        public void C9F2_ClosedKeySet_10ConsumedPlus1ClassifiedPlus1TwelfthKey_Equals12()
        {
            // Côté contrat : TOUTES les clés de premier niveau de SessionOpenDto — reflection sur
            // le TYPE (jamais un motif texte, jamais recopiées à la main — la même discipline que
            // C3-F2, qui protège CE total contre une divergence silencieuse).
            FieldInfo[] fields = typeof(SessionOpenDto).GetFields(
                BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly);
            var interfaceKeys = new HashSet<string>();
            foreach (FieldInfo f in fields) interfaceKeys.Add(f.Name);

            Assert.AreEqual(12, interfaceKeys.Count, "SessionOpenDto declares EXACTLY 12 top-level keys");

            // Chaque clé consommée doit exister dans l'interface — un chunk qui prétend consommer
            // une clé qui n'existe pas plus/qui a été renommée doit faire rougir CE test.
            foreach (string consumedKey in ConsumedByChunk.Keys)
            {
                Assert.IsTrue(interfaceKeys.Contains(consumedKey),
                    $"'{consumedKey}' (déclarée consommée par {ConsumedByChunk[consumedKey]}) doit exister dans SessionOpenDto");
            }
            Assert.IsTrue(interfaceKeys.Contains(DeclaredNonConsumed),
                $"'{DeclaredNonConsumed}' (déclarée NON consommée) doit exister dans SessionOpenDto");

            // La somme de contrôle : 10 clés consommées de l'ensemble ORIGINAL (11) + 1 déclarée non
            // consommée (settling_glance) + 1 NOUVELLE clé (opened_game_day, elle-même consommée) = 12.
            int consumedFromOriginal11 = 0;
            foreach (string k in ConsumedByChunk.Keys)
                if (k != "opened_game_day") consumedFromOriginal11++;
            Assert.AreEqual(10, consumedFromOriginal11, "10 des 11 clés ORIGINALES sont consommées");
            Assert.AreEqual(1, interfaceKeys.Contains(DeclaredNonConsumed) ? 1 : 0, "settling_glance reste l'UNIQUE non-consommée");
            Assert.IsTrue(ConsumedByChunk.ContainsKey("opened_game_day"), "opened_game_day (12e clé) EST consommée — par C2");

            int total = consumedFromOriginal11 + 1 /* settling_glance */ + 1 /* opened_game_day */;
            Assert.AreEqual(12, total, "10 + 1 + 1 = 12 — la somme de contrôle du découpage, Q2 = OUI");
            Assert.AreEqual(interfaceKeys.Count, total,
                "la somme de contrôle ÉGALE le compte de champs du DTO CLIENT — si un chunk classait " +
                "une clé absente du DTO, ou classait deux fois la même, CE test rougirait.");

            // Chaque clé classée est unique à SA classification (jamais consommée ET déclarée non-consommée).
            Assert.IsFalse(ConsumedByChunk.ContainsKey(DeclaredNonConsumed),
                "settling_glance ne peut pas être À LA FOIS consommée et déclarée non-consommée");

            // ⚠️ Revue ⊥ IMPORTANT-2 : cette égalité ne compare QUE des grandeurs CLIENTES
            // (`ConsumedByChunk` + `DeclaredNonConsumed`, écrits à la main, contre `SessionOpenDto`,
            // un type C#) — AUCUNE des deux ne lit le corps réellement reçu du serveur. Une clé
            // ajoutée ou retirée CÔTÉ SERVEUR SANS toucher `SessionOpenDto` laisse ce test entièrement
            // vert : ce N'EST PAS le détecteur d'horloge du design §3-bis (qui exige de voir un
            // changement de DONNÉE serveur). Le détecteur RÉEL est
            // `SessionClientPlayModeTests.C3F3_...` : il compte les clés du CORPS BRUT reçu et les
            // compare au compte de champs du DTO — c'est LUI qui rougirait si le serveur bougeait sans
            // que ce lot s'en aperçoive. Ce test-ci ferme une question DIFFÉRENTE, toujours utile :
            // « le découpage en chunks couvre-t-il exactement ce que le DTO CLIENT déclare ? ».
        }

        // Revue ⊥ IMPORTANT-5 : `Tools/verify-w3u1-anti-staleness.sh` (C9-F1) n'avait AUCUN
        // consommateur mesuré (0 référence dans Unity, 0 dans les docs back) — « un dispositif de
        // sécurité doit rester sur un chemin que quelqu'un emprunte, sinon il sera retiré de bonne
        // foi » (socle). Ce test EST ce chemin : il exécute le script réel (jamais une réécriture
        // C# de sa logique, qui pourrait diverger) via un process, et fait échouer la suite W3U1
        // elle-même si le script régresse — le patron `SeederSupport`/`RunDevPsql` (Process +
        // stdout/stderr capturés + code de sortie asserté), appliqué à un script de clôture au lieu
        // d'un seeder.
        [Test]
        public void C9F1_AntiStalenessScript_Executes_ExitsZero()
        {
            string repoRoot = FindRepoRoot();
            Assert.IsNotNull(repoRoot, "could not locate the Unity repo root (Tools/verify-w3u1-anti-staleness.sh)");
            string scriptPath = Path.Combine(repoRoot, "Tools", "verify-w3u1-anti-staleness.sh");
            Assert.IsTrue(File.Exists(scriptPath), $"script exists at {scriptPath}");

            var psi = new ProcessStartInfo
            {
                FileName = "/bin/bash",
                ArgumentList = { scriptPath },
                WorkingDirectory = repoRoot,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
            };
            string stdout, stderr;
            int exitCode;
            using (var proc = Process.Start(psi))
            {
                stdout = proc.StandardOutput.ReadToEnd();
                stderr = proc.StandardError.ReadToEnd();
                proc.WaitForExit(30000);
                Assert.IsTrue(proc.HasExited, "verify-w3u1-anti-staleness.sh did not finish within 30s");
                exitCode = proc.ExitCode;
            }
            Assert.AreEqual(0, exitCode,
                $"verify-w3u1-anti-staleness.sh failed (exit {exitCode}).\nstdout:\n{stdout}\nstderr:\n{stderr}");
            Debug.Log($"[C9-F1] anti-staleness script output:\n{stdout}");
        }

        // Mirrors `SeederSupport`'s own repo-root walk (Application.dataPath -> up to 6 levels) —
        // inlined here rather than exposed from SeederSupport to keep this chunk's consumer
        // self-contained (SeederSupport's version is scoped to node seeders, a different marker file).
        private static string FindRepoRoot()
        {
            DirectoryInfo dir = new DirectoryInfo(Application.dataPath);
            for (int i = 0; i < 6 && dir != null; i++)
            {
                if (File.Exists(Path.Combine(dir.FullName, "Tools", "verify-w3u1-anti-staleness.sh")))
                    return dir.FullName;
                dir = dir.Parent;
            }
            return null;
        }
    }
}
