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
    [Category("Replis")]
    public class LitterauxNommesPlayModeTests
    {
        /// <summary>Allowlist NOMMÉE : (fichier, résolveur) → raison. Rien n'y entre sans sa raison.</summary>
        private static readonly Dictionary<string, string> Allowlist = new Dictionary<string, string>
        {
            // Le REPLI de `building.type.*` (clés servies) : `LibellesBatiment.Type` passe par `Libelle.ParValeur(…, MotDuType(t))`.
            { "LibellesBatiment.cs::MotDuType", "repli de ParValeur sur une clé servie — dans Libelle, pas hors" },
            // Les ENDONYMES : le nom d'une langue dans cette langue ne se traduit pas (« Français » reste « Français » pour un anglophone).
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
    }
}
