using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;

namespace MafiaCleanCity.CityMap.Tests
{
    // LA GARDE DE CLASSE des littéraux NOMMÉS (décision f2, 23/09) : tout texte affiché passe par `Libelle`. Un résolveur de texte ne rend
    // JAMAIS un littéral à lettres pour une valeur nommée — `case "v": return "mot";` ou `x == "v" ? "mot"` — hors l'allowlist NOMMÉE.
    // C'est le trou que la garde L2 (`I18nHorsLibellePlayModeTests`, lectures du catalogue hors Libelle) ne voyait pas : 110 sites, fermés
    // par la table v2 de l'atelier (c39b4136) au commit 1053d271 ; la dette est À ZÉRO dans le même lot.
    //   N1  contrôles de l'instrument (positifs : les deux formes ; négatifs : un mot par Libelle, un glyphe, un commentaire, une comparaison)
    //   N2  aucun site hors allowlist dans `Assets/Scripts` ; l'allowlist elle-même est EXACTE (chaque entrée a encore ses sites, sinon
    //       elle est périmée)
    //   N3  (2026-09-24) la forme que N2 ne voyait pas : un ternaire dont les DEUX branches sont des littéraux (`a ? "Actif" : "Inactif"`),
    //       où qu'il soit — sous `return`, 4 sites sur 65 : restreindre à `return` en manquait 61 — et sur plusieurs lignes (texte lu
    //       ENTIER, commentaires retirés, chaînes gardées). Mesuré au balayage : 65 sites, 26 fichiers. Ils sont NOMMÉS, pas corrigés :
    //       dette datée PAR FICHIER, exacte dans les deux sens (un site de plus rougit ; un site de moins aussi, pour baisser la dette).
    //       Liste des sites : Tools/juge-donnees/i18n/dette-ternaires-2026-09-24.md.
    [Category("Replis")]
    public class LitterauxNommesPlayModeTests
    {
        /// <summary>Allowlist NOMMÉE : (fichier, résolveur) → raison. Rien n'y entre sans sa raison.</summary>
        private static readonly Dictionary<string, string> Allowlist = new Dictionary<string, string>
        {
            // Le REPLI de `building.type.*` (clés servies) : `LibellesBatiment.Type` passe par `Libelle.ParValeur(…, MotDuType(t))`.
            { "LibellesBatiment.cs::MotDuType", "repli de ParValeur sur une clé servie — dans Libelle, pas hors" },
            // Les ENDONYMES : le nom d'une langue dans cette langue ne se traduit pas (« Français » reste « Français » pour un anglophone).
            // Le REPLI des bandes de caisse (COLLECTE, tables 75/85) : `CollecteMots.Bande` passe par `Libelle.ParValeur(…, RepliDeLaBande(valeur))` — le mot est le repli d'une clé dérivée de la VALEUR servie.
            { "CollecteMots.cs::RepliDeLaBande", "repli de ParValeur sur la clé `vente.caisse.bande.<valeur>` — dans Libelle, pas hors" },
            { "SettingsScreenController.cs::*", "endonymes « Français » / « English » (décision f2 du 23/09)" },
        };

        private static readonly Regex Sig = new Regex(@"\bstatic\s+string\s+(\w+)\s*\(");
        private static readonly Regex Case = new Regex(@"case\s+""([^""]*)""\s*:\s*(?:case\s+""[^""]*""\s*:\s*)*return\s+""((?:[^""\\]|\\.)*)""\s*;");
        private static readonly Regex Ternaire = new Regex(@"==\s*""([A-Za-z_]+)""\s*\?\s*""((?:[^""\\]|\\.)*)""");
        private static readonly Regex Lettre = new Regex(@"\p{L}");
        private static readonly Regex Glyphe = new Regex(@"^\[[^\]]*\]$");
        // Un identifiant MACHINE (`same_building`, `COST_1`) : une valeur du modèle qu'on bascule, jamais un mot affiché — un mot affiché
        // ne porte pas de `_`. Mesuré : l'éditeur de règles bascule `condPeerZone` entre `same_zone` et `same_building`.
        private static readonly Regex Identifiant = new Regex(@"^[A-Za-z0-9]+(_[A-Za-z0-9]+)+$");

        /// <summary>N3 — dette DATÉE du 2026-09-24, par fichier : (nom de fichier) → nombre de ternaires à deux littéraux dont une branche
        /// est un mot. Mesurée par le balayage de ce lot ; rien n'y a été corrigé. Une ligne ne se relève pas : elle ne fait que baisser.</summary>
        private static readonly Dictionary<string, int> DetteDeuxBranches = new Dictionary<string, int>
        {
            { "BandeauEphemere.cs", 1 },
            { "BuildingCardController.cs", 9 },
            { "ChaineDApproScreenController.cs", 1 },   // 3 → 1 le 2026-09-26 (états vides : « Nestor » et le texte de chantier passent par Libelle)
            { "CityMapController.cs", 1 },
            { "CityProjectionsClient.cs", 0 },   // 2 → 1 le 2026-09-26 (table 84 : « aucun nœud » passe par Libelle)
            { "CompressionScreenController.cs", 1 },   // 2 → 1 le 2026-10-07 (cause 4 : « Moderate »/« Standard » sortent par MotsDesEnumeres)
            { "ConflitScreenController.cs", 1 },
            { "DashboardController.cs", 2 },
            { "DecisionDetailScreenController.cs", 3 },
            { "DelegationScreenController.cs", 3 },
            { "DemoIdentityResolver.cs", 1 },
            { "DemolitionScreenController.cs", 8 },
            { "DistrictInteriorScreenController.cs", 3 },
            { "ExceptionDetailController.cs", 1 },
            // HomeChromeController.cs : 1 → 0 le 2026-09-26 (bandeau de chaufferie par Gabarit/ParValeur, 342f5c83 + b7d499f2 : le ternaire
            // « … — {week_state} » : "" est sorti) — entrée RETIRÉE, la dette est exacte dans les deux sens.
            { "HorizonScreenController.cs", 1 },
            { "InspectionScreenController.cs", 2 },   // 3 → 2 le 2026-09-26 (état vide de ⑮ : la seconde ligne passe par Libelle)
            { "LieutenantScreenController.cs", 1 },
            { "LoiScreenController.cs", 4 },
            { "RuleModel.cs", 2 },
            { "SellingScreenController.cs", 4 },   // 6 → 5 le 2026-09-26 (1d0937fc : l'état vide de ㉟ passe par Libelle, table 62)
            { "ShopScreenController.cs", 1 },   // 2 → 1 le 2026-09-26 (㉓, table 69 : les deux refus d'achat passent par Libelle)
            { "TopBarController.cs", 1 },
            { "TutorialScreenController.cs", 1 },
        };

        private static readonly Regex DeuxBranches =
            new Regex(@"(?<![?""])\?\s*\$?""((?:[^""\\]|\\.)*)""\s*:\s*\$?""((?:[^""\\]|\\.)*)""");
        // `v == "LOW" ? "PEU" : "—"` est déjà un site de N2 (`Ternaire`) : un site, jamais deux.
        private static readonly Regex DejaVuParN2 = new Regex(@"==\s*""[A-Za-z_]+""\s*$");
        private static readonly Regex LitteralCaractere = new Regex(@"\G'(\\.|[^'\\])'");
        // Ni une couleur (garde Palette), ni une balise de texte riche, ni un booléen sérialisé ne sont des mots affichés.
        private static readonly Regex Hex = new Regex(@"^#[0-9A-Fa-f]{3,8}$");
        private static readonly Regex Balise = new Regex(@"^</?\w+>$");

        private static bool EstUnMot(string lit) =>
            Lettre.IsMatch(lit) && !Glyphe.IsMatch(lit) && !Identifiant.IsMatch(lit) && !Hex.IsMatch(lit) && !Balise.IsMatch(lit)
            && lit != "true" && lit != "false";

        /// <summary>Le texte sans ses commentaires (`//`, `/* */`), chaînes et littéraux de caractère GARDÉS, sauts de ligne gardés
        /// (les numéros de ligne restent vrais). `chaines` reçoit les étendues [début, fin) des chaînes DANS le texte rendu : c'est le
        /// masque qui sait où une chaîne commence, pas une regex relancée après coup (`'"'` lui ferait ouvrir une chaîne fantôme).</summary>
        internal static string SansCommentaires(string t, List<(int debut, int fin)> chaines = null)
        {
            var o = new System.Text.StringBuilder(t.Length);
            int i = 0, n = t.Length;
            while (i < n)
            {
                char c = t[i];
                if (c == '"')
                {
                    bool verbatim = (i > 0 && t[i - 1] == '@') || (i > 1 && t[i - 1] == '$' && t[i - 2] == '@');
                    int j = i + 1;
                    if (verbatim)
                        while (j < n && (t[j] != '"' || (j + 1 < n && t[j + 1] == '"'))) j += t[j] == '"' ? 2 : 1;
                    else
                        while (j < n && t[j] != '"') j += t[j] == '\\' ? 2 : 1;
                    int fin = System.Math.Min(j + 1, n);
                    chaines?.Add((o.Length, o.Length + fin - i));
                    o.Append(t, i, fin - i);
                    i = fin;
                    continue;
                }
                if (c == '\'')
                {
                    Match m = LitteralCaractere.Match(t, i);
                    if (m.Success) { o.Append(m.Value); i += m.Length; continue; }
                }
                if (c == '/' && i + 1 < n && t[i + 1] == '/')
                {
                    int j = t.IndexOf('\n', i);
                    i = j < 0 ? n : j;
                    continue;
                }
                if (c == '/' && i + 1 < n && t[i + 1] == '*')
                {
                    int j = t.IndexOf("*/", i + 2, System.StringComparison.Ordinal);
                    j = j < 0 ? n : j + 2;
                    for (int k = i; k < j; k++) if (t[k] == '\n') o.Append('\n');
                    i = j;
                    continue;
                }
                o.Append(c);
                i++;
            }
            return o.ToString();
        }

        internal static List<string> SitesDeuxBranches(string texte, string fichier)
        {
            var res = new List<string>();
            var chaines = new List<(int debut, int fin)>();
            string t = SansCommentaires(texte, chaines);
            foreach (Match m in DeuxBranches.Matches(t))
            {
                int p = m.Index;
                if (chaines.Any(e => e.debut <= p && p < e.fin)) continue;
                int deb = System.Math.Max(0, p - 80);
                if (DejaVuParN2.IsMatch(t.Substring(deb, p - deb))) continue;
                string a = m.Groups[1].Value, b = m.Groups[2].Value;
                if (!EstUnMot(a) && !EstUnMot(b)) continue;
                int ligne = 1;
                for (int k = 0; k < p; k++) if (t[k] == '\n') ligne++;
                res.Add($"{fichier}:{ligne} ? « {a} » : « {b} »");
            }
            return res;
        }

        internal static List<(string cle, string site)> Sites(string texte, string fichier)
        {
            var res = new List<(string, string)>();
            string fn = "?";
            string[] L = texte.Split('\n');
            for (int i = 0; i < L.Length; i++)
            {
                Match s = Sig.Match(L[i]);
                if (s.Success) fn = s.Groups[1].Value;
                string t = L[i].TrimStart();
                if (t.StartsWith("//") || t.StartsWith("*")) continue;
                string code = Regex.Replace(L[i], @"//.*$", "");
                foreach (Regex rx in new[] { Case, Ternaire })
                    foreach (Match m in rx.Matches(code))
                    {
                        string v = m.Groups[1].Value, lit = m.Groups[2].Value;
                        if (!Lettre.IsMatch(lit) || Glyphe.IsMatch(lit) || Identifiant.IsMatch(lit)) continue;
                        if (rx == Ternaire && (v == "true" || v == "false")) continue;
                        res.Add(($"{fichier}::{fn}", $"{fichier}:{i + 1} « {v} » → « {lit} »"));
                    }
            }
            return res;
        }

        [Test]
        public void N1_LInstrumentVoitLesDeuxFormes()
        {
            Assert.AreEqual(1, Sites("static string F(string b) {\n switch (b) { case \"UP\": return \"le prix monte\"; }\n}", "x.cs").Count,
                "contrôle positif : `case … return \"mot\"`");
            Assert.AreEqual(1, Sites("string s = v == \"LOW\" ? \"PEU\" : \"—\";", "x.cs").Count, "contrôle positif : le ternaire");
            Assert.AreEqual(1, Sites("case \"A\": case \"B\": return \"deux\";", "x.cs").Count, "contrôle positif : des case empilés");
            Assert.AreEqual(0, Sites("case \"UP\": return Libelle.De(\"appro\", \"bloc\", \"le prix monte\");", "x.cs").Count,
                "contrôle négatif : le mot passe par Libelle");
            Assert.AreEqual(0, Sites("case \"OPEN\": return \"[o..]\";", "x.cs").Count, "contrôle négatif : un glyphe (garde GlyphesPlayModeTests)");
            Assert.AreEqual(0, Sites("// case \"UP\": return \"le prix monte\";", "x.cs").Count, "contrôle négatif : un commentaire");
            Assert.AreEqual(0, Sites("bool b = ok == \"true\" ? \"vrai\" : x;", "x.cs").Count, "contrôle négatif : une comparaison booléenne");
            Assert.AreEqual(0, Sites("z = z == \"same_zone\" ? \"same_building\" : \"same_zone\";", "x.cs").Count,
                "contrôle négatif : un identifiant machine basculé, pas un mot affiché");
        }

        [Test]
        public void N2_AucunLitteralNommeHorsLibelle_EtLAllowlistEstExacte()
        {
            string racine = Path.Combine(Application.dataPath, "Scripts");
            string[] fichiers = Directory.GetFiles(racine, "*.cs", SearchOption.AllDirectories);
            Assert.Greater(fichiers.Length, 100, "anti-vacuité : le balayage voit le client");
            var tous = fichiers.SelectMany(f => Sites(File.ReadAllText(f), Path.GetFileName(f))).ToList();
            bool Permis(string cle) => Allowlist.ContainsKey(cle) || Allowlist.ContainsKey(cle.Split(new[] { "::" }, 2, System.StringSplitOptions.None)[0] + "::*");
            var hors = tous.Where(s => !Permis(s.cle)).Select(s => s.site).ToList();
            Assert.IsEmpty(hors, $"{hors.Count} littéral(aux) nommé(s) hors Libelle — un texte affiché passe par Libelle.De (ou entre à "
                                 + "l'allowlist AVEC sa raison) : " + string.Join(" · ", hors));
            foreach (string entree in Allowlist.Keys)
            {
                bool vivante = entree.EndsWith("::*")
                    ? tous.Any(s => s.cle.StartsWith(entree.Substring(0, entree.Length - 1)))
                    : tous.Any(s => s.cle == entree);
                Assert.IsTrue(vivante, $"allowlist PÉRIMÉE : « {entree} » n'a plus de site — la retirer ({Allowlist[entree]})");
            }
        }

        [Test]
        public void N3_LInstrumentVoitLeTernaireADeuxLitteraux()
        {
            int N(string s) => SitesDeuxBranches(s, "x.cs").Count;
            Assert.AreEqual(1, N("static string F(bool a) { return a ? \"Actif\" : \"Inactif\"; }"), "contrôle positif : sous return");
            Assert.AreEqual(1, N("string s = a\n    ? \"Actif\"\n    : \"Inactif\";"), "contrôle positif : sur trois lignes");
            Assert.AreEqual(1, N("string s = j == 0 ? \"aujourd'hui\" : $\"dans {j} j\";"), "contrôle positif : une branche interpolée");
            Assert.AreEqual(1, N("string s = n > 1 ? \"s\" : \"\";"), "contrôle positif : une seule branche est un mot");
            Assert.AreEqual(1, N("char q = '\"'; string s = a ? \"Actif\" : \"Inactif\";"),
                "contrôle positif : un guillemet en littéral de caractère n'avale pas la suite");
            Assert.AreEqual(3, SansCommentaires("a\n/* b\n c */\nd").Split('\n').Length - 1, "le masque garde les sauts de ligne");
            Assert.AreEqual(0, N("// return a ? \"Actif\" : \"Inactif\";"), "contrôle négatif : un commentaire de ligne");
            Assert.AreEqual(0, N("/* a ? \"Actif\" : \"Inactif\" */"), "contrôle négatif : un commentaire de bloc");
            Assert.AreEqual(0, N("string s = \"a ? \\\"Actif\\\" : \\\"Inactif\\\"\";"), "contrôle négatif : le ternaire est DANS une chaîne");
            Assert.AreEqual(0, N("string s = @\"a ? \"\"Actif\"\" : \"\"Inactif\"\"\";"), "contrôle négatif : dans une chaîne verbatim");
            Assert.AreEqual(0, N("string s = v == \"LOW\" ? \"PEU\" : \"—\";"), "contrôle négatif : déjà un site de N2");
            Assert.AreEqual(1, Sites("string s = v == \"LOW\" ? \"PEU\" : \"—\";", "x.cs").Count, "… et N2 le voit bien, une fois");
            Assert.AreEqual(0, N("string s = a ? Libelle.De(\"d\", \"r\", \"Actif\") : Libelle.De(\"d\", \"r\", \"Inactif\");"),
                "contrôle négatif : les mots passent par Libelle");
            Assert.AreEqual(0, N("string s = a ? \"#05080d\" : \"#070a10\";"), "contrôle négatif : des couleurs");
            Assert.AreEqual(0, N("string s = a ? \"\" : \"<i>\";"), "contrôle négatif : une balise de texte riche");
            Assert.AreEqual(0, N("string s = a ? \"true\" : \"false\";"), "contrôle négatif : un booléen sérialisé");
            Assert.AreEqual(0, N("z = a ? \"same_zone\" : \"same_building\";"), "contrôle négatif : des identifiants machine");
            Assert.AreEqual(0, N("string s = n ?? \"Inconnu\";"), "contrôle négatif : `??` n'est pas un ternaire");
        }

        [Test]
        public void N3_LesTernairesADeuxLitterauxNeDepassentPasLaDette()
        {
            string racine = Path.Combine(Application.dataPath, "Scripts");
            string[] fichiers = Directory.GetFiles(racine, "*.cs", SearchOption.AllDirectories);
            Assert.Greater(fichiers.Length, 100, "anti-vacuité : le balayage voit le client");
            var parFichier = fichiers.Select(f => (nom: Path.GetFileName(f), sites: SitesDeuxBranches(File.ReadAllText(f), Path.GetFileName(f))))
                .Where(x => x.sites.Count > 0).ToDictionary(x => x.nom, x => x.sites);
            var ecarts = new List<string>();
            foreach (string nom in parFichier.Keys.Union(DetteDeuxBranches.Keys).OrderBy(x => x, System.StringComparer.Ordinal))
            {
                int mesure = parFichier.TryGetValue(nom, out List<string> s) ? s.Count : 0;
                int dette = DetteDeuxBranches.TryGetValue(nom, out int d) ? d : 0;
                if (mesure == dette) continue;
                ecarts.Add(mesure > dette
                    ? $"{nom} : {mesure} > dette {dette} — un texte affiché passe par Libelle : " + string.Join(" · ", s)
                    : $"{nom} : {mesure} < dette {dette} — BAISSER la dette à {mesure}");
            }
            Assert.IsEmpty(ecarts, $"{ecarts.Count} fichier(s) hors dette (2026-09-24) : " + string.Join(" ‖ ", ecarts));
        }
    }
}
