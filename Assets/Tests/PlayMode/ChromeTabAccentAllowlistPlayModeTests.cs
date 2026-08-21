using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using NUnit.Framework;
using UnityEngine;

namespace MafiaCleanCity.Theme.Tests
{
    // W3.U2/C5 (design §3 C5-F2, U-3 — docs/superpowers/plans/2026-08-17-w3u2-district-nuit-design.md
    // §D5) — "l'or quitte le chrome" : AppShell.cs repointe l'onglet actif sur `chromeTabActive`,
    // et cette garde épingle que l'ENSEMBLE des liaisons de `accentGold` restées dans l'arbre est
    // EXACTEMENT l'allowlist de 11 entrées mesurée par le design (12 avant repointage, moins
    // AppShell.cs:255) — jamais un `>=`/`contains`, une égalité d'ENSEMBLES (D5 point 4).
    //
    // Mécanisme : le motif de balayage porte sur l'ACCÈS au token (`DesignTokens.Current.accentGold`),
    // pas sur l'affectation de couleur — c'est le point de passage obligé des TROIS formes de
    // liaison mesurées par le design (champ statique nommé, affectation directe, indirection par
    // variable) : Scan_DetectsAllThreeSyntacticForms le prouve sur les trois fixtures exactes citées
    // par D5. Sans cette unicité de motif, un balayage qui ne connaîtrait qu'une forme rendrait un
    // "8" au lieu d'un "12" — exactement l'erreur que D5 documente avoir commise une fois.
    [Category("W3U2")]
    public class ChromeTabAccentAllowlistPlayModeTests
    {
        private const string TokenAccess = "DesignTokens.Current.accentGold";

        public readonly struct ScanResult
        {
            public readonly int TotalOccurrences;
            public readonly HashSet<string> FilesWithHits; // chemins relatifs, '/' , triés par appelant

            public ScanResult(int total, HashSet<string> files)
            {
                TotalOccurrences = total;
                FilesWithHits = files;
            }
        }

        /// <summary>Compte les occurrences LITTÉRALES de <see cref="TokenAccess"/> dans un texte —
        /// un décompte de sous-chaîne, jamais une regex à alternance (le socle : une alternance nue
        /// matche littéralement sur ce proxy de mesure et rend un zéro silencieux ; ici il n'y a de
        /// toute façon qu'UN SEUL motif, donc `IndexOf` en boucle est à la fois suffisant et sans ce
        /// risque).</summary>
        private static int CountTokenAccess(string text)
        {
            if (string.IsNullOrEmpty(text)) return 0;
            int count = 0, idx = 0;
            while ((idx = text.IndexOf(TokenAccess, idx, StringComparison.Ordinal)) != -1)
            {
                count++;
                idx += TokenAccess.Length;
            }
            return count;
        }

        /// <summary>Balaie récursivement tous les .cs sous `rootDirectory` et retourne le compte total
        /// + l'ensemble des fichiers touchés (chemin relatif à `rootDirectory`, séparateurs '/').
        /// UNE SEULE implémentation, utilisée à la fois par la mesure réelle (Assets/Scripts) et par
        /// le contrôle positif (répertoire temporaire fabriqué) — jamais deux chemins de calcul qui
        /// pourraient diverger entre eux (même discipline que C0F1/C0F2 de DesignTokensParityPlayModeTests).</summary>
        private static ScanResult ScanDirectory(string rootDirectory)
        {
            int total = 0;
            var files = new HashSet<string>();
            if (!Directory.Exists(rootDirectory)) return new ScanResult(0, files);

            foreach (string path in Directory.GetFiles(rootDirectory, "*.cs", SearchOption.AllDirectories))
            {
                int hits = CountTokenAccess(File.ReadAllText(path));
                if (hits <= 0) continue;
                total += hits;
                string rel = path.Substring(rootDirectory.Length)
                    .TrimStart(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar)
                    .Replace('\\', '/');
                files.Add(rel);
            }
            return new ScanResult(total, files);
        }

        // ── Les 3 formes de liaison — fixtures EXACTES citées par le design (D5, tableau) ──────

        [TestCase("private static readonly Color CtaColor = DesignTokens.Current.accentGold;",
            TestName = "Forme (i) — champ statique nommé")]
        [TestCase("img.color = DesignTokens.Current.accentGold;",
            TestName = "Forme (ii) — affectation directe")]
        [TestCase("var g = DesignTokens.Current.accentGold; img.color = g;",
            TestName = "Forme (iii) — indirection par variable")]
        public void Scan_DetectsAllThreeSyntacticForms(string sourceLine)
        {
            Assert.AreEqual(1, CountTokenAccess(sourceLine),
                $"la forme '{sourceLine}' aurait dû être détectée exactement une fois — c'est le " +
                "piège du socle (D5) : un motif qui ne connaît qu'UNE forme sous-compte les autres.");
        }

        // ── Contrôle positif obligatoire (D5 point 4) — sur un répertoire FABRIQUÉ, jamais sur ────
        // Assets/Scripts réel : la preuve que le mécanisme peut rougir/reverdir ne doit pas dépendre
        // de, ni polluer, l'arbre source livré (mode léger — aucune écriture dans Assets/).

        [Test]
        public void Scan_NewBindingInUnlistedFile_BreaksTheSet_ThenRemovalRestoresIt()
        {
            string tempDir = Path.Combine(Path.GetTempPath(), $"w3u2_c5f2_scan_{Guid.NewGuid():N}");
            Directory.CreateDirectory(tempDir);
            try
            {
                string knownFile = Path.Combine(tempDir, "Known.cs");
                File.WriteAllText(knownFile,
                    "private static readonly Color CtaColor = DesignTokens.Current.accentGold;\n");

                ScanResult baseline = ScanDirectory(tempDir);
                Assert.AreEqual(1, baseline.TotalOccurrences);
                CollectionAssert.AreEquivalent(new[] { "Known.cs" }, baseline.FilesWithHits);

                // Liaison neuve, NON déclarée — c'est précisément ce que le détecteur doit attraper.
                string rogueFile = Path.Combine(tempDir, "Rogue.cs");
                File.WriteAllText(rogueFile,
                    "img.color = DesignTokens.Current.accentGold; // liaison non allowlistée\n");

                ScanResult withRogue = ScanDirectory(tempDir);
                Assert.AreEqual(2, withRogue.TotalOccurrences,
                    "la liaison neuve aurait dû être comptée (rouge attendu sur une égalité d'ensembles).");
                CollectionAssert.AreNotEquivalent(baseline.FilesWithHits.ToList(), withRogue.FilesWithHits.ToList(),
                    "l'ensemble des fichiers portant une liaison doit changer quand une liaison neuve apparaît " +
                    "— sinon l'assertion d'égalité d'ensembles ne rougirait jamais.");

                // Retrait — reverdit EXACTEMENT à la baseline (même total, même ensemble).
                File.Delete(rogueFile);
                ScanResult afterRemoval = ScanDirectory(tempDir);
                Assert.AreEqual(baseline.TotalOccurrences, afterRemoval.TotalOccurrences);
                CollectionAssert.AreEquivalent(baseline.FilesWithHits, afterRemoval.FilesWithHits);
            }
            finally
            {
                Directory.Delete(tempDir, recursive: true);
            }
        }

        // ── La mesure réelle — Assets/Scripts, allowlist figée par le design (D5, re-mesurée ici) ──

        // 11 entrées : les 11 liaisons post-D5 (12 liaisons mesurées par D5, MOINS AppShell.cs:255
        // repointé sur chromeTabActive). "Shell/TopBarController.cs" avait été ajouté ici par le
        // round HUD v3.1 du 2026-08-21 (247ed3b, `InitPalette` composait un filet/anneau par alpha
        // depuis `accentGold`) — RETIRÉ NOMMÉMENT par la boucle ⊥ pixel-perfect qui a suivi
        // (même jour) : la root cause du ruling user était PRÉCISÉMENT cette composition depuis un
        // token mal assorti (accentGold #ffd23f jaune vif ≠ maquette #b08d3e laiton mat) ; le
        // correctif introduit des tokens DÉDIÉS (`hudHairlineGold`/`hudMoneyGold`, gdd/14 @e171c594)
        // et TopBarController n'accède plus à `accentGold` du tout. Chemins relatifs à
        // Assets/Scripts, '/' — PAS de numéro de ligne (un refactor sans rapport ne doit pas faire
        // rougir cette garde ; c'est l'ENSEMBLE des fichiers-porteurs qui est l'allowlist).
        private static readonly HashSet<string> ExpectedAccentGoldBindings = new HashSet<string>
        {
            "Operational/Autonomy/AutonomyInboxController.cs",
            "Operational/BuildingCard/BuildingCardController.cs",
            "Operational/Dashboard/DashboardController.cs",
            "Operational/Exceptions/ExceptionDetailController.cs",
            "Operational/Exceptions/ExceptionQueueController.cs",
            "Operational/Laundering/LaunderingController.cs",
            "Operational/Laundering/PipelineOverviewController.cs",
            "Operational/Lieutenant/LieutenantScreenController.cs",
            "Shell/DailyReviewScreenController.cs",
            "Shell/ExceptionQueuePanelController.cs",
            "Shell/HighestLeverageCardController.cs",
        };

        [Test]
        public void C5F2_AccentGoldBindings_EqualDeclaredAllowlist_TabActiveExcluded()
        {
            // Anti-vacuité : l'allowlist elle-même n'est pas vide (D5 : "une allowlist vide serait
            // triviale") — gardée ici pour que cette assertion ne puisse jamais devenir vraie par
            // appauvrissement accidentel de la constante ci-dessus.
            Assert.IsNotEmpty(ExpectedAccentGoldBindings);

            string scriptsRoot = Path.Combine(Application.dataPath, "Scripts");
            Assert.IsTrue(Directory.Exists(scriptsRoot), $"Assets/Scripts introuvable à {scriptsRoot}");

            ScanResult scan = ScanDirectory(scriptsRoot);

            Assert.AreEqual(ExpectedAccentGoldBindings.Count, scan.TotalOccurrences,
                $"attendu {ExpectedAccentGoldBindings.Count} liaisons accentGold (allowlist post-" +
                $"repointage D5), trouvé {scan.TotalOccurrences} — une liaison a été ajoutée ou " +
                "retirée sans mettre à jour l'allowlist déclarée ci-dessus.");
            CollectionAssert.AreEquivalent(ExpectedAccentGoldBindings, scan.FilesWithHits,
                "l'ENSEMBLE des fichiers liant accentGold a divergé de l'allowlist déclarée par D5.");
            Assert.IsFalse(scan.FilesWithHits.Contains("Shell/AppShell.cs"),
                "AppShell doit être repointé sur chromeTabActive — accentGold ne doit plus y " +
                "apparaître (D5 point 2 : « l'onglet actif n'en fait plus partie »).");
        }
    }
}
