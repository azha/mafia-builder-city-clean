using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;

namespace MafiaCleanCity.CityMap.Tests
{
    // LES CAPTURES NE PARTENT JAMAIS AVEC UN ÉCRAN (lot de classe, 2026-09-24, décision de l'orchestrateur).
    // Règle LUE dans le Test Framework : `RuntimeTestRunnerFilter.cs:31` fait `new CategoryFilterExtended(s) { IsRegex = true }` —
    // une catégorie demandée est une REGEX NON ANCRÉE, elle prend toute catégorie qui la CONTIENT (mesuré : `EcranDelegation` a pris
    // `PhotoEcranDelegation`, créneau du 24/09, comptes 86 ≠ declares 85). Une capture exige l'identité de capture et écrit des PNG :
    // lancée avec son écran, elle rougit par précondition ou photographie un autre compte.
    //   K1  aucune catégorie de CAPTURE (Cliche…, Photo…, Capture…) ne CONTIENT une catégorie d'écran (le filtre l'emporterait)
    //   K2  aucun test qui porte une catégorie de capture ne porte AUSSI une catégorie d'écran — ni sur la méthode, ni par sa CLASSE
    //       (le second mécanisme : 7 classes sur 8 emportaient leur capture ainsi jusqu'au 24/09)
    [Category("GardeCategories")]
    public class CategoriesDeCapturePlayModeTests
    {
        private static readonly Regex Cat = new Regex(@"Category\(""([^""]+)""\)");

        internal static bool EstCapture(string c) => c.StartsWith("Cliche") || c.StartsWith("Photo") || c.StartsWith("Capture");

        /// <summary>Les QUALIFICATIFS de capture : des catégories qui ne sont pas des écrans et ne se lancent qu'avec la capture qu'elles
        /// qualifient. Liste EXACTE, chacune avec sa raison. `MutationDeCarte` : la capture « tampon, sous chrome » CONSOMME une carte du
        /// compte de démo — la catégorie l'isole (MafiaCI, `CaptureDetail` avait emporté `CaptureDetailMutant` le 2026-09-02).</summary>
        internal static readonly HashSet<string> Qualificatifs = new HashSet<string> { "MutationDeCarte" };

        private static bool EstEcran(string c) => !EstCapture(c) && !Qualificatifs.Contains(c);

        /// <summary>Le code sans commentaires : une catégorie citée dans une note n'est pas un attribut.</summary>
        private static string SansCommentaires(string s) =>
            Regex.Replace(Regex.Replace(s, @"/\*.*?\*/", "", RegexOptions.Singleline), @"//[^\n]*", "");

        /// <summary>(fichier, méthode, catégories de la méthode ∪ catégories de sa classe) pour chaque méthode attribuée.</summary>
        internal static IEnumerable<(string fichier, string methode, HashSet<string> cats)> Tests(string nom, string source)
        {
            string code = SansCommentaires(source);
            Match classe = Regex.Match(code, @"public\s+(?:sealed\s+)?class\s+\w+");
            if (!classe.Success) yield break;
            string avant = code.Substring(0, classe.Index);
            string entete = avant.Substring(avant.LastIndexOf('{') + 1);
            var deClasse = new HashSet<string>(Cat.Matches(entete).Cast<Match>().Select(m => m.Groups[1].Value));
            foreach (Match m in Regex.Matches(code.Substring(classe.Index),
                         @"((?:\s*\[[^\]]*\]\s*)+)\s*public\s+(?:IEnumerator|void)\s+(\w+)\s*\("))
            {
                string attributs = m.Groups[1].Value;
                if (!Regex.IsMatch(attributs, @"\[\s*(?:Test|UnityTest|TestCase|TestCaseSource)\b|,\s*(?:Test|UnityTest)\b")) continue;
                var cats = new HashSet<string>(deClasse);
                cats.UnionWith(Cat.Matches(attributs).Cast<Match>().Select(x => x.Groups[1].Value));
                yield return (nom, m.Groups[2].Value, cats);
            }
        }

        private static List<(string nom, string source)> Sources() =>
            Directory.GetFiles(Path.Combine(Application.dataPath, "Tests"), "*.cs", SearchOption.AllDirectories)
                .Select(f => (Path.GetFileName(f), File.ReadAllText(f))).ToList();

        internal static List<string> ViolationsK1(IEnumerable<string> categories)
        {
            var toutes = categories.Distinct().ToList();
            return (from cap in toutes where EstCapture(cap)
                    from ecran in toutes where EstEcran(ecran) && Regex.IsMatch(cap, ecran)
                    select $"{ecran} ⊂ {cap}").ToList();
        }

        internal static List<string> ViolationsK2(IEnumerable<(string fichier, string methode, HashSet<string> cats)> tests) =>
            tests.Where(t => t.cats.Any(EstCapture) && t.cats.Any(EstEcran))
                 .Select(t => $"{t.fichier}:{t.methode} [{string.Join(", ", t.cats.OrderBy(c => c))}]").ToList();

        [Test]
        public void K1_AucuneCategorieDeCapture_NeContientUneCategorieDEcran()
        {
            CollectionAssert.AreEqual(new[] { "EcranDelegation ⊂ PhotoEcranDelegation" },
                ViolationsK1(new[] { "EcranDelegation", "PhotoEcranDelegation" }), "contrôle positif : la paire du 24/09 est vue");
            Assert.IsEmpty(ViolationsK1(new[] { "EcranDelegation", "ClicheDelegation", "Capture", "CaptureCarte" }),
                "contrôle négatif : une capture qui ne contient aucun écran, et une capture dans une capture");

            var sources = Sources();
            var categories = sources.SelectMany(s => Cat.Matches(SansCommentaires(s.source)).Cast<Match>().Select(m => m.Groups[1].Value)).ToList();
            Assert.Greater(categories.Distinct().Count(), 50, "anti-vacuité : les catégories du dépôt sont lues");
            Assert.IsEmpty(ViolationsK1(categories), "une catégorie de capture CONTIENT une catégorie d'écran — le filtre (regex non ancrée) "
                + "l'emporterait avec l'écran : " + string.Join(" · ", ViolationsK1(categories)));
        }

        [Test]
        public void K2_AucunTestDeCapture_NePorteUneCategorieDEcran_NiParSaClasse()
        {
            const string parClasse = "[Category(\"EcranX\")]\npublic class T {\n [UnityTest, Category(\"ClicheX\")]\n public IEnumerator C1() { }\n"
                                   + " [Test]\n public void A() { }\n}";
            var synth = Tests("T.cs", parClasse).ToList();
            Assert.AreEqual(2, synth.Count, "contrôle de l'extracteur : deux tests");
            CollectionAssert.AreEqual(new[] { "T.cs:C1 [ClicheX, EcranX]" }, ViolationsK2(synth),
                "contrôle positif : une capture emportée par la catégorie de SA CLASSE est vue");
            const string testParTest = "public class T {\n [UnityTest, Category(\"ClicheX\")]\n public IEnumerator C1() { }\n"
                                     + " [Test, Category(\"EcranX\")]\n public void A() { }\n}";
            Assert.IsEmpty(ViolationsK2(Tests("T.cs", testParTest)), "contrôle négatif : catégories posées test par test");
            Assert.IsEmpty(ViolationsK2(Tests("T.cs", "public class T {\n [UnityTest, Category(\"Capture\"), Category(\"MutationDeCarte\")]\n"
                + " public IEnumerator M() { }\n}")), "contrôle négatif : un QUALIFICATIF de capture n'est pas un écran");

            var tests = Sources().SelectMany(s => Tests(s.nom, s.source)).ToList();
            Assert.Greater(tests.Count(t => t.cats.Any(EstCapture)), 10, "anti-vacuité : les tests de capture du dépôt sont lus");
            Assert.IsEmpty(ViolationsK2(tests), "un test de capture porte aussi une catégorie d'écran (méthode ou classe) — il partirait avec "
                + "l'écran : " + string.Join(" · ", ViolationsK2(tests)));
        }
    }
}
