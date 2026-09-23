using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;

namespace MafiaCleanCity.CityMap.Tests
{
    // LES GLYPHES EN TEXTE SONT RETIRÉS (décision f2, 23/09) : « [##.] », « [o..] », « [C] », « [!] »… n'existent dans AUCUNE maquette (atelier :
    // 0 occurrence de « [..] » dans le texte visible), et leur raison écrite — a11y C5-F1, « la couleur n'est jamais seule à porter
    // l'information » — est satisfaite par le MOT qui les accompagnait. Cette garde REMPLACE celle que le glyphe tenait :
    //   G1  plus aucune colonne « Glyph » ni aucun glyphe entre crochets dans les écrans à lignes d'état (les 5 fichiers)
    //   G2  ce que le glyphe garantissait, dit autrement : dans chaque ligne d'état, SEULE la VALEUR prend la couleur, et une valeur
    //       LITTÉRALE passée en couleur porte un MOT (des lettres) — jamais la couleur seule
    [Category("Replis")]
    public class GlyphesPlayModeTests
    {
        private static readonly string[] Fichiers =
        {
            "Operational/BuildingCard/BuildingCardController.cs", "Operational/Dashboard/DashboardController.cs",
            "Operational/Laundering/LaunderingController.cs", "Operational/Laundering/PipelineOverviewController.cs",
            "Operational/Lieutenant/LieutenantScreenController.cs",
        };

        private static readonly Regex Crochets = new Regex(@"""\[[^\]""\n]{1,8}\]""");
        private static readonly Regex Colonne = new Regex(@"NewText\(\s*""Glyph""");

        private static string Code(string ligne) => Regex.Replace(ligne, @"//.*$", "");

        internal static List<string> Glyphes(string texte, string nom)
        {
            var trouves = new List<string>();
            string[] L = texte.Split('\n');
            for (int i = 0; i < L.Length; i++)
            {
                string t = L[i].TrimStart();
                if (t.StartsWith("//") || t.StartsWith("*")) continue;
                string c = Code(L[i]);
                if (Crochets.IsMatch(c) || Colonne.IsMatch(c)) trouves.Add($"{nom}:{i + 1}  {L[i].Trim()}");
            }
            return trouves;
        }

        private static string Lire(string rel) => File.ReadAllText(Path.Combine(Application.dataPath, "Scripts", rel));

        [Test]
        public void G1_PlusAucunGlypheNiColonneDeGlyphe()
        {
            Assert.AreEqual(1, Glyphes("case \"OPEN\": return \"[o..]\";", "pos").Count, "contrôle positif : un glyphe entre crochets");
            Assert.AreEqual(1, Glyphes("var g = NewText(\"Glyph\", row, x, 16, c);", "pos").Count, "contrôle positif : une colonne de glyphe");
            Assert.AreEqual(0, Glyphes("// ancien « [##.] » en commentaire", "neg").Count, "contrôle négatif : un commentaire");
            Assert.AreEqual(0, Glyphes("return Libelle.De(\"x\", \"y\", \"Plein\");", "neg").Count, "contrôle négatif : un mot");

            var trouves = Fichiers.SelectMany(f => Glyphes(Lire(f), f)).ToList();
            Assert.IsEmpty(trouves, "un glyphe en texte revient dans un écran à lignes d'état : " + string.Join(" · ", trouves));
        }

        /// <summary>Les appels `AddStatusRow(id, libellé, VALEUR, couleur…)` d'un texte : (ligne, valeur).</summary>
        internal static List<(int ligne, string valeur)> Valeurs(string texte)
        {
            var res = new List<(int, string)>();
            int pos = 0;
            while ((pos = texte.IndexOf("AddStatusRow(", pos, System.StringComparison.Ordinal)) >= 0)
            {
                int debutLigne = texte.LastIndexOf('\n', pos) + 1;
                string avant = texte.Substring(debutLigne, pos - debutLigne);
                int ouvre = pos + "AddStatusRow".Length;
                pos++;
                if (avant.Contains("//") || avant.TrimStart().StartsWith("*") || avant.EndsWith("void ")) continue;
                var args = new List<string>();
                int d = 0, debut = ouvre + 1; bool chaine = false;
                for (int i = ouvre; i < texte.Length; i++)
                {
                    char c = texte[i];
                    if (chaine) { if (c == '\\') { i++; continue; } if (c == '"') chaine = false; continue; }
                    if (c == '"') { chaine = true; continue; }
                    if (c == '(' || c == '[' || c == '{') d++;
                    else if (c == ')' || c == ']' || c == '}')
                    {
                        d--;
                        if (d == 0) { args.Add(texte.Substring(debut, i - debut).Trim()); break; }
                    }
                    else if (c == ',' && d == 1) { args.Add(texte.Substring(debut, i - debut).Trim()); debut = i + 1; }
                }
                if (args.Count >= 3) res.Add((texte.Take(pos).Count(ch => ch == '\n') + 1, args[2]));
            }
            return res;
        }

        /// <summary>Une valeur LITTÉRALE sans lettre (« [##.] », « ### ») : la couleur porterait seule l'information. « — » est
        /// l'ABSENCE (TD-644), rendue en encre secondaire : elle ne porte rien par la couleur.</summary>
        internal static bool CouleurSeule(string valeur)
        {
            var m = Regex.Match(valeur, @"^""((?:[^""\\]|\\.)*)""$");
            if (!m.Success) return false;   // une expression : son mot vient d'un résolveur (couverture de domaine : ReplisPlayModeTests)
            string lit = m.Groups[1].Value;
            return lit != "—" && !Regex.IsMatch(lit, @"\p{L}");
        }

        [Test]
        public void G2_ToutevaleurEnCouleurPorteUnMot()
        {
            Assert.IsTrue(CouleurSeule("\"[##.]\""), "contrôle positif : un glyphe seul en couleur");
            Assert.IsTrue(CouleurSeule("\"###\""), "contrôle positif : des signes sans lettre");
            Assert.IsFalse(CouleurSeule("\"oui\""), "contrôle négatif : un mot");
            Assert.IsFalse(CouleurSeule("\"—\""), "contrôle négatif : l'absence");
            Assert.IsFalse(CouleurSeule("SetupLabel(card.setup_state)"), "contrôle négatif : un résolveur de mots");
            var synth = Valeurs("x();\n            AddStatusRow(\"a\", \"A\", \"[#..]\", AccentSevere);\n");
            Assert.AreEqual(1, synth.Count, "contrôle positif de l'extracteur");
            Assert.IsTrue(CouleurSeule(synth[0].valeur));

            int appels = 0;
            var fautes = new List<string>();
            foreach (string f in Fichiers)
            {
                string t = Lire(f);
                foreach (var (ligne, valeur) in Valeurs(t))
                {
                    appels++;
                    if (CouleurSeule(valeur)) fautes.Add($"{f}:{ligne} « {valeur} »");
                }
                // Dans le corps de chaque `AddStatusRow`, la couleur (`accent`) ne va qu'à la VALEUR.
                int def = t.IndexOf("private void AddStatusRow(", System.StringComparison.Ordinal);
                if (def < 0) continue;
                string corps = t.Substring(def, t.IndexOf("\n        }", def, System.StringComparison.Ordinal) - def);
                var colores = Regex.Matches(corps, @"(\w+)\.color\s*=\s*accent\s*;").Cast<Match>().Select(m => m.Groups[1].Value).ToArray();
                CollectionAssert.AreEqual(new[] { "v" }, colores, $"{f} : dans AddStatusRow, seule la VALEUR (`v`) prend la couleur");
                StringAssert.Contains("NewText(\"Value\", row.transform, value", corps, $"{f} : la valeur colorée est le texte `value`");
            }
            Assert.Greater(appels, 40, "anti-vacuité : l'extracteur voit les lignes d'état des écrans");
            Assert.IsEmpty(fautes, "une valeur rendue en couleur SANS mot : " + string.Join(" · ", fautes));
        }
    }
}
