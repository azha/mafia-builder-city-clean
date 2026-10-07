using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;

namespace MafiaCleanCity.Shell.Tests
{
    // CHAÎNES DE DÉVELOPPEUR À L'ÉCRAN (passe UX du 2026-09-26, RAPPORT-26-09 tâche 3) — l'Accueil affichait « [LoadingState] » à un
    // joueur neuf : le NOM d'un enum C#, entre crochets (`HomeChromeController.RenderState`). Mesuré dans la même passe : l'éditeur de
    // règles de la Famille ajoutait `[{d.kind}]` (le code interne du serveur, SCREAMING_SNAKE_CASE) à chaque diagnostic. Deux sites
    // corrigés ; cette garde ferme la CLASSE, pas les deux instances.
    //   C1  aucune instruction HORS JOURNAL ne porte un littéral « entre crochets » (`[` suivi d'une lettre ou d'une interpolation) —
    //       sauf l'allowlist raisonnée (les inventaires de hiérarchie du district, bâtis pour un `Debug.Log`)
    //   C2  aucune instruction hors journal ne rend un NOM DE TYPE (`GetType().Name`, `typeof(X).Name`, `nameof(`) — sauf un nom de
    //       `GameObject` (jamais un texte)
    //   C0  contrôle POSITIF : le même balayage VOIT les deux formes corrigées, fabriquées, et ne voit pas un journal
    // ⚠️ Ce que la garde ne voit pas : un nom d'enum rendu SANS crochets (`$"{etat}"`) — il faudrait le type de la variable. La
    //    classe « identifiant rendu tel quel » (un code servi affiché brut, ex. le bandeau de l'Accueil) est une autre garde.
    [Category("ChainesDev")]
    public class ChainesDeDeveloppeurPlayModeTests
    {
        private static readonly Regex Commentaires = new Regex(@"(""(?:\\.|[^""\\\n])*"")|//[^\n]*|/\*[\s\S]*?\*/", RegexOptions.Compiled);
        private static readonly Regex Litteral = new Regex(@"""((?:\\.|[^""\\\n])*)""", RegexOptions.Compiled);
        private static readonly Regex Crochet = new Regex(@"\[[^\W\d_]|\[\{", RegexOptions.Compiled);
        private static readonly Regex NomDeType = new Regex(@"GetType\(\)\.Name|typeof\([^)]*\)\.Name|nameof\(", RegexOptions.Compiled);
        private static readonly Regex Journal = new Regex(@"Debug\.(Log|LogWarning|LogError|Assert)|throw |Exception\(", RegexOptions.Compiled);

        /// <summary>Allowlist RAISONNÉE, par fichier, au compte EXACT (un site neuf dans le fichier rougit aussi).</summary>
        private static readonly Dictionary<string, (int n, string pourquoi)> Admis = new Dictionary<string, (int, string)>
        {
            { "DistrictInteriorScreenController.cs", (5, "inventaires de hiérarchie, d'ancrage et d'identité des badges (`pile`, `ancrages`, " +
                "`identitesBadges`, `horsCadre`) : bâtis pour les `Debug.Log` de `Render`, jamais rendus dans un TMP") },
            { "CompteDeLAppareil.cs", (1, "`Regex CodeServi` : la classe de caractères `[A-Z0-9_]` d'une EXPRESSION RÉGULIÈRE qui lit le code servi dans le corps " +
                "d'une réponse — jamais un texte, jamais rendu dans un TMP") },
            { "ComposeurDuCarnet.cs", (1, "`Regex CodeServi` : la classe de caractères `[A-Z_]` d'une EXPRESSION RÉGULIÈRE qui lit le code servi dans le corps " +
                "d'une réponse — jamais un texte, jamais rendu dans un TMP") },
        };

        private static List<string> Instructions(string source) =>
            Commentaires.Replace(source, m => m.Groups[1].Success ? m.Groups[1].Value : string.Empty).Split(';').ToList();

        internal static List<string> SitesACrochet(string source) =>
            Instructions(source).Where(st => !Journal.IsMatch(st)
                && Litteral.Matches(st).Cast<Match>().Any(m => Crochet.IsMatch(m.Groups[1].Value))).ToList();

        internal static List<string> SitesNomDeType(string source) =>
            Instructions(source).Where(st => !Journal.IsMatch(st) && NomDeType.IsMatch(st) && !st.Contains("new GameObject(")).ToList();

        private static IEnumerable<(string nom, string source)> Sources() =>
            Directory.GetFiles(Path.Combine(Application.dataPath, "Scripts"), "*.cs", SearchOption.AllDirectories)
                .Select(f => (Path.GetFileName(f), File.ReadAllText(f)));

        [Test]
        public void C0_ControlePositif_LesDeuxFormesCorrigeesSontVues_UnJournalNon()
        {
            const string fabrique =
                "stateText.text = $\"[{CurrentState}]\";\n" +
                "string line = $\"Line {d.line}:{d.col} — {d.message} [{d.kind}]\"; AddDiagnosticLine(line, c);\n" +
                "label.text = etat.GetType().Name;\n" +
                "Debug.LogWarning($\"[FILIERE] ordre du serveur [{x}]\");\n" +
                "// stateText.text = $\"[{CurrentState}]\"; en commentaire\n" +
                "var go = new GameObject($\"Tenant_{typeof(T).Name}\");\n" +
                "t.text = \"24 850 €\";\n";
            Assert.AreEqual(2, SitesACrochet(fabrique).Count, "les deux formes à crochets sont VUES ; le journal et le commentaire non");
            Assert.AreEqual(1, SitesNomDeType(fabrique).Count, "le nom de type vers un texte est VU ; le nom de GameObject non");
        }

        [Test]
        public void C1_AucunLitteralEntreCrochets_HorsJournal()
        {
            var ecarts = new List<string>();
            foreach ((string nom, string source) in Sources())
            {
                List<string> sites = SitesACrochet(source);
                int admis = Admis.TryGetValue(nom, out var a) ? a.n : 0;
                if (sites.Count != admis)
                    ecarts.Add($"{nom} : {sites.Count} site(s) (admis {admis}) — " +
                               string.Join(" ‖ ", sites.Select(s => string.Join(" ", s.Split((char[])null, StringSplitOptions.RemoveEmptyEntries)).Trim())
                                                       .Select(s => s.Length > 120 ? s.Substring(0, 120) + "…" : s)));
            }
            Assert.IsEmpty(ecarts, "texte entre crochets hors journal — une chaîne de développeur peut atteindre l'écran :\n" + string.Join("\n", ecarts));
        }

        /// <summary>Table 66 (atelier, 2026-09-26) — les 7 `kind` du compilateur DSL (`dsl-errors.ts`, `DslDiagnosticKind`), RECOPIÉS
        /// du back (anti-tautologie) : chacun lit `lieutenant.diagnostic.<slug du kind>`.</summary>
        private static readonly string[] KindsDuBack =
        {
            "SYNTAX_ERROR", "TIER_NOT_UNLOCKED", "NOT_SUPPORTED_YET", "RULE_COUNT_EXCEEDED", "PRIORITY_OUT_OF_BOUNDS",
            "CONDITION_DEPTH_EXCEEDED", "TENURE_PEER_SCOPE_VIOLATION",
        };

        [Test]
        public void C3_LigneDeDiagnostic_GabaritDeLaTable66_JamaisLeKind()
        {
            MafiaCleanCity.I18n.I18nCatalog.Oublier();
            var d = new MafiaCleanCity.Operational.Lieutenant.DslDiagnostic { line = 3, col = 7, message = "unexpected token", kind = "SYNTAX_ERROR" };
            Assert.AreEqual("Ligne 3, colonne 7 — unexpected token",
                MafiaCleanCity.Operational.Lieutenant.LieutenantScreenController.LigneDeDiagnostic(d),
                "repli : le gabarit de la table 66, le message servi à la place du mot");

            var servi = KindsDuBack.ToDictionary(k => "lieutenant.diagnostic." + k.ToLowerInvariant(), k => "§" + k);
            servi["lieutenant.editeur.ligne_colonne_message"] = "L{ligne}C{colonne}:{message}";
            MafiaCleanCity.I18n.I18nCatalog.ChargerPourTest("fr", servi);
            try
            {
                foreach (string k in KindsDuBack)
                {
                    d.kind = k;
                    Assert.AreEqual("L3C7:§" + k, MafiaCleanCity.Operational.Lieutenant.LieutenantScreenController.LigneDeDiagnostic(d),
                        $"{k} lit sa clé de la table 66, dans le gabarit servi");
                }
            }
            finally { MafiaCleanCity.I18n.I18nCatalog.Oublier(); }
        }

        [Test]
        public void C2_AucunNomDeType_HorsJournal()
        {
            var sites = Sources().SelectMany(x => SitesNomDeType(x.source).Select(s => x.nom + " : " + string.Join(" ", s.Split((char[])null, StringSplitOptions.RemoveEmptyEntries)))).ToList();
            Assert.IsEmpty(sites, "un nom de type C# hors journal peut atteindre l'écran :\n" + string.Join("\n", sites));
        }
    }
}
