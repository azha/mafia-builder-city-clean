using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;

namespace MafiaCleanCity.CityMap.Tests
{
    // LES CATÉGORIES ET LES CAPTURES (lot de classe, 2026-09-24, décisions de l'orchestrateur).
    // Règle LUE dans le Test Framework : `RuntimeTestRunnerFilter.cs:31` fait `new CategoryFilterExtended(s) { IsRegex = true }` —
    // une catégorie demandée est une REGEX NON ANCRÉE, elle prend toute catégorie qui la CONTIENT (mesuré : `EcranDelegation` a pris
    // `PhotoEcranDelegation`, créneau du 24/09, comptes 86 ≠ declares 85). Une capture exige l'identité de capture et écrit des PNG :
    // lancée avec son écran, elle rougit par précondition ou photographie un autre compte ; une image écrite dans l'arbre le salit.
    //   K0  AUCUNE catégorie n'en contient une autre (la classe entière ; K1 « capture ⊂ écran » n'en était qu'un cas) — exceptions
    //       EXACTES, chacune avec sa raison
    //   K2  aucun test de capture ne porte AUSSI une catégorie d'écran — ni sur la méthode, ni par sa CLASSE
    //   K3  un test qui ÉCRIT une image (par ce qu'il FAIT : `File.WriteAllBytes`, `ScreenCapture.CaptureScreenshot`, directement ou
    //       par une méthode qu'il appelle) porte une catégorie de capture, ou figure dans une liste EXACTE d'exceptions
    [Category("GardeCategories")]
    public class CategoriesDeCapturePlayModeTests
    {
        private static readonly Regex Cat = new Regex(@"Category\(""([^""]+)""\)");

        /// <summary>La famille CAPTURE, par son nom. `Screenshot` en fait partie : 11 tests du harnais d'origine qui écrivent une image
        /// (`ScreenCapture.CaptureScreenshot`) sous ce nom-là.</summary>
        internal static bool EstCapture(string c) =>
            c.StartsWith("Cliche") || c.StartsWith("Photo") || c.StartsWith("Capture") || c == "Screenshot";

        /// <summary>Les QUALIFICATIFS de capture : ni écran ni capture, ils ne se lancent qu'avec la capture qu'ils qualifient. Liste
        /// EXACTE. `MutationDeCarte` : la capture « tampon, sous chrome » CONSOMME une carte du compte de démo — la catégorie l'isole.</summary>
        internal static readonly HashSet<string> Qualificatifs = new HashSet<string> { "MutationDeCarte" };

        private static bool EstEcran(string c) => !EstCapture(c) && !Qualificatifs.Contains(c);

        /// <summary>K0 — les catégories qui en CONTIENNENT d'autres PAR CONSTRUCTION. Liste EXACTE. `Capture` : l'OMBRELLE de la famille
        /// (13 `Capture…`) — la demander « nue » les prend toutes, c'est son rôle (MafiaCI : nue, elle fait SIGSEGV sous Mesa, et n'est
        /// donc jamais demandée seule).</summary>
        internal static readonly HashSet<string> Ombrelles = new HashSet<string> { "Capture" };

        /// <summary>K3 — les tests qui écrivent une image SANS être une capture. Liste EXACTE, chacun avec sa raison :
        /// · `B3H1_SondeDEffet…` n'écrit QUE si `MAFIA_HALO_SORTIE` est exportée, dans le dossier qu'on lui donne (une planche à la
        ///   demande, jamais dans l'arbre par défaut) ;
        /// · `CarteVille_MontePeinture…` est un test STRUCTUREL de ③ qui écrit AU MILIEU la planche hors chrome réclamée par le juge —
        ///   à SCINDER en une capture `ClicheCarte` (lot à part : la scission se mesure au run) ;
        /// · les deux `MesureGeometrie_AccueilPanneaux…` sont des SONDES DE MESURE (« une mesure de bords », jamais photographiées pour
        ///   un juge) : elles écrivent dans `Temp/` depuis le 2026-09-24, HORS de l'arbre (avant : `Assets/Screenshots`, sali à chaque run
        ///   de `Charpente`).</summary>
        internal static readonly HashSet<string> EcrituresAdmises = new HashSet<string>
        {
            "AccueilPanneauxGeometriePhotoPlayModeTests.cs:MesureGeometrie_AccueilPanneaux_1080x1920_et_1080x2400_SEEDE_OperationalDemo",
            "AccueilPanneauxGeometriePhotoPlayModeTests.cs:MesureGeometrie_AccueilPanneaux_MontageNatif1080x1920_SEEDE_OperationalDemo",
            "ReputationScreenPlayModeTests.cs:B3H1_SondeDEffet_LeHaloDesCompteurs_RendDesPixelsOuNEnRendPas",
            "CarteVillePlayModeTests.cs:CarteVille_MontePeintureEt18MarqueursSurAncres",
        };

        private static readonly Regex Api = new Regex(@"\bWriteAllBytes\s*\(|\bScreenCapture\s*\.\s*CaptureScreenshot\s*\(");

        /// <summary>Le code, MÊME LONGUEUR : commentaires et contenu des chaînes remplacés par des espaces. Une catégorie ou une API
        /// citée dans une note n'est pas du code ; les positions restent celles du source (les attributs se relisent dans le brut).</summary>
        internal static string Nettoye(string s)
        {
            string blanc(Match m) => Regex.Replace(m.Value, @"[^\n]", " ");
            s = Regex.Replace(s, @"/\*.*?\*/", blanc, RegexOptions.Singleline);
            s = Regex.Replace(s, @"//[^\n]*", blanc);
            return Regex.Replace(s, @"@?""(?:[^""\\\n]|\\.)*""", m => "\"" + new string(' ', m.Value.Length - 2) + "\"");
        }

        private static readonly Regex Declaration = new Regex(
            @"(?:(?:public|private|internal|protected|static|async|override|virtual)\s+)+[\w<>\[\],\.\s]+?\s(\w+)\s*\([^;{]*?\)\s*(?:where[^{]*)?\{");

        /// <summary>(nom, corps) de chaque méthode, le corps délimité par ses ACCOLADES (pas « jusqu'au test suivant » : une méthode
        /// privée qui suit un test n'est pas son corps — faux positif mesuré au prototype).</summary>
        internal static IEnumerable<(string nom, string corps)> Methodes(string code)
        {
            foreach (Match m in Declaration.Matches(code))
            {
                int i = m.Index + m.Length - 1, d = 0;
                for (int j = i; j < code.Length; j++)
                {
                    if (code[j] == '{') d++;
                    else if (code[j] == '}' && --d == 0) { yield return (m.Groups[1].Value, code.Substring(i, j - i + 1)); break; }
                }
            }
        }

        internal struct Source { public string nom, brut, code, classe; }

        internal static Source Lire(string nom, string brut)
        {
            string code = Nettoye(brut);
            Match c = Regex.Match(code, @"class\s+(\w+)");
            return new Source { nom = nom, brut = brut, code = code, classe = c.Success ? c.Groups[1].Value : "?" };
        }

        private static List<Source> Sources() =>
            Directory.GetFiles(Path.Combine(Application.dataPath, "Tests"), "*.cs", SearchOption.AllDirectories)
                .Select(f => Lire(Path.GetFileName(f), File.ReadAllText(f))).ToList();

        /// <summary>(fichier, méthode, catégories de la méthode ∪ de sa classe) pour chaque méthode de TEST.</summary>
        internal static IEnumerable<(string fichier, string methode, HashSet<string> cats)> Tests(Source s)
        {
            Match classe = Regex.Match(s.code, @"public\s+(?:sealed\s+)?class\s+\w+");
            if (!classe.Success) yield break;
            string avant = s.brut.Substring(0, classe.Index);
            string entete = avant.Substring(s.code.Substring(0, classe.Index).LastIndexOf('{') + 1);
            var deClasse = new HashSet<string>(Cat.Matches(entete).Cast<Match>().Select(m => m.Groups[1].Value));
            foreach (Match m in Regex.Matches(s.code, @"((?:\s*\[[^\]]*\]\s*)+)\s*public\s+(?:IEnumerator|void)\s+(\w+)\s*\("))
            {
                if (m.Index < classe.Index) continue;
                if (!Regex.IsMatch(m.Groups[1].Value, @"\[\s*(?:Test|UnityTest|TestCase|TestCaseSource)\b|,\s*(?:Test|UnityTest)\b")) continue;
                var cats = new HashSet<string>(deClasse);
                cats.UnionWith(Cat.Matches(s.brut.Substring(m.Groups[1].Index, m.Groups[1].Length)).Cast<Match>().Select(x => x.Groups[1].Value));
                yield return (s.nom, m.Groups[2].Value, cats);
            }
        }

        private static readonly Regex AppelSimple = new Regex(@"\b(\w+)\s*\(", RegexOptions.Compiled);
        private static readonly Regex AppelQualifie = new Regex(@"\b(\w+)\s*\.\s*(\w+)\s*\(", RegexOptions.Compiled);

        /// <summary>Les méthodes qui ÉCRIVENT une image : l'API dans le corps, puis (point fixe) toute méthode qui en appelle une — même
        /// fichier par son nom, ou ailleurs par `Classe.Nom(` (les aides de `CaptureSupport` / `CaptureSousShell`).
        /// ⛔ K3 a dépassé son délai de 180 s dans le run complet (TD-756) : l'ancienne boucle construisait DEUX regex dynamiques par couple
        /// (méthode × écrivain) et à chaque tour du point fixe — environ 650 000 évaluations, bien au-delà du cache de 15 motifs de .NET, pour un
        /// corpus de tests en hausse de 24 %. Maintenant : les appels de chaque corps sont extraits UNE fois (deux regex précompilées), indexés
        /// par nom et par (classe, nom), et le point fixe se propage par ces index — linéaire. Même relation qu'avant (`\bNom\s*\(` dans le corps ;
        /// `\bClasse\s*\.\s*Nom\s*\(`), même résultat : le test K3 pose des contrôles positif et négatif sur la même sémantique.</summary>
        internal static HashSet<(string fichier, string methode)> Ecrivains(IEnumerable<Source> sources)
        {
            var corps = new Dictionary<(string, string), (string corps, string classe)>();
            foreach (Source s in sources)
                foreach (var (nom, c) in Methodes(s.code))
                    corps[(s.nom, nom)] = (c, s.classe);

            var parNom = new Dictionary<string, List<(string, string)>>();
            var parClasse = new Dictionary<(string, string), List<(string, string)>>();
            foreach (var kv in corps)
            {
                foreach (string nom in AppelSimple.Matches(kv.Value.corps).Cast<Match>().Select(m => m.Groups[1].Value).Distinct())
                {
                    if (!parNom.TryGetValue(nom, out var l)) parNom[nom] = l = new List<(string, string)>();
                    l.Add(kv.Key);
                }
                foreach (var q in AppelQualifie.Matches(kv.Value.corps).Cast<Match>().Select(m => (m.Groups[1].Value, m.Groups[2].Value)).Distinct())
                {
                    if (!parClasse.TryGetValue(q, out var l)) parClasse[q] = l = new List<(string, string)>();
                    l.Add(kv.Key);
                }
            }

            var ecr = new HashSet<(string, string)>(corps.Where(kv => Api.IsMatch(kv.Value.corps)).Select(kv => kv.Key));
            var file = new Queue<(string, string)>(ecr);
            while (file.Count > 0)
            {
                var e = file.Dequeue();
                var appelants = new List<(string, string)>();
                if (parNom.TryGetValue(e.Item2, out var memeNom)) appelants.AddRange(memeNom.Where(k => k.Item1 == e.Item1));   // même fichier, par son nom
                if (parClasse.TryGetValue((corps[e].classe, e.Item2), out var qualifies)) appelants.AddRange(qualifies);         // ailleurs, par `Classe.Nom(`
                foreach (var a in appelants)
                    if (ecr.Add(a)) file.Enqueue(a);
            }
            return ecr;
        }

        internal static List<string> ViolationsK0(IEnumerable<string> categories)
        {
            var toutes = categories.Distinct().ToList();
            return (from grande in toutes
                    from petite in toutes
                    where petite != grande && !Ombrelles.Contains(petite) && Regex.IsMatch(grande, petite)
                    select $"{petite} ⊂ {grande}").ToList();
        }

        internal static List<string> ViolationsK2(IEnumerable<(string fichier, string methode, HashSet<string> cats)> tests) =>
            tests.Where(t => t.cats.Any(EstCapture) && t.cats.Any(EstEcran))
                 .Select(t => $"{t.fichier}:{t.methode} [{string.Join(", ", t.cats.OrderBy(c => c))}]").ToList();

        internal static List<string> ViolationsK3(List<Source> sources, HashSet<string> admises, HashSet<(string fichier, string methode)> ecrivains = null)
        {
            var ecr = ecrivains ?? Ecrivains(sources);
            return sources.SelectMany(Tests)
                .Where(t => ecr.Contains((t.fichier, t.methode)) && !t.cats.Any(EstCapture) && !admises.Contains($"{t.fichier}:{t.methode}"))
                .Select(t => $"{t.fichier}:{t.methode} [{string.Join(", ", t.cats.OrderBy(c => c))}]").ToList();
        }

        [Test]
        public void K0_AucuneCategorie_NEnContientUneAutre()
        {
            CollectionAssert.AreEqual(new[] { "EcranDelegation ⊂ PhotoEcranDelegation" },
                ViolationsK0(new[] { "EcranDelegation", "PhotoEcranDelegation" }), "contrôle positif : la paire du 24/09 est vue");
            CollectionAssert.AreEqual(new[] { "I18n ⊂ I18nReseau" }, ViolationsK0(new[] { "I18n", "I18nReseau" }),
                "contrôle positif : hors capture aussi (la classe entière)");
            Assert.IsEmpty(ViolationsK0(new[] { "EcranDelegation", "ClicheDelegation", "Capture", "CaptureCarte" }),
                "contrôle négatif : aucun nom contenu, et l'ombrelle `Capture` admise");

            // Les catégories du SOURCE, hors commentaires (un commentaire est blanchi dans `code`, à la même position).
            var categories = Sources().SelectMany(s => Cat.Matches(s.brut).Cast<Match>()
                                                     .Where(m => s.code[m.Index] != ' ').Select(m => m.Groups[1].Value)).ToList();
            Assert.Greater(categories.Distinct().Count(), 50, "anti-vacuité : les catégories du dépôt sont lues");
            Assert.IsEmpty(ViolationsK0(categories), "une catégorie en CONTIENT une autre — le filtre (regex non ancrée) prendrait la "
                + "seconde avec la première : " + string.Join(" · ", ViolationsK0(categories)));
        }

        [Test]
        public void K2_AucunTestDeCapture_NePorteUneCategorieDEcran_NiParSaClasse()
        {
            var synth = Tests(Lire("T.cs", "[Category(\"EcranX\")]\npublic class T {\n [UnityTest, Category(\"ClicheX\")]\n"
                + " public IEnumerator C1() { }\n [Test]\n public void A() { }\n}")).ToList();
            Assert.AreEqual(2, synth.Count, "contrôle de l'extracteur : deux tests");
            CollectionAssert.AreEqual(new[] { "T.cs:C1 [ClicheX, EcranX]" }, ViolationsK2(synth),
                "contrôle positif : une capture emportée par la catégorie de SA CLASSE est vue");
            Assert.IsEmpty(ViolationsK2(Tests(Lire("T.cs", "public class T {\n [UnityTest, Category(\"ClicheX\")]\n public IEnumerator C1() { }\n"
                + " [Test, Category(\"EcranX\")]\n public void A() { }\n}"))), "contrôle négatif : catégories posées test par test");
            Assert.IsEmpty(ViolationsK2(Tests(Lire("T.cs", "public class T {\n [UnityTest, Category(\"Capture\"), Category(\"MutationDeCarte\")]\n"
                + " public IEnumerator M() { }\n}"))), "contrôle négatif : un QUALIFICATIF de capture n'est pas un écran");

            var tests = Sources().SelectMany(Tests).ToList();
            Assert.Greater(tests.Count(t => t.cats.Any(EstCapture)), 10, "anti-vacuité : les tests de capture du dépôt sont lus");
            Assert.IsEmpty(ViolationsK2(tests), "un test de capture porte aussi une catégorie d'écran (méthode ou classe) — il partirait avec "
                + "l'écran : " + string.Join(" · ", ViolationsK2(tests)));
        }

        [Test]
        public void K3_UnTestQuiEcritUneImage_EstUneCapture_OuUneExceptionNommee()
        {
            var aide = Lire("Aide.cs", "public static class Aide {\n public static void Ecrire(string p) { System.IO.File.WriteAllBytes(p, null); }\n}");
            var ecran = Lire("E.cs", "[Category(\"EcranX\")]\npublic class E {\n [Test]\n public void Direct() { System.IO.File.WriteAllBytes(\"a\", null); }\n"
                + " [Test]\n public void ParAide() { Aide.Ecrire(\"a\"); }\n"
                + " [Test]\n public void ParPrivee() { Ecrire2(); }\n private void Ecrire2() { UnityEngine.ScreenCapture.CaptureScreenshot(\"a\"); }\n"
                + " [Test]\n public void LitSeulement() { var t = UnityEngine.ScreenCapture.CaptureScreenshotAsTexture(); }\n"
                + " [Test]\n public void DansUneNote() { /* File.WriteAllBytes(x) */ var s = \"File.WriteAllBytes(\"; }\n"
                + " [Test, Category(\"ClicheX\")]\n public void Capture() { System.IO.File.WriteAllBytes(\"a\", null); }\n"
                + " [Test]\n public void ParChaine() { Ecrire3(); }\n private void Ecrire3() { Ecrire2(); }\n}");
            var autre = Lire("F.cs", "[Category(\"EcranY\")]\npublic class F {\n [Test]\n public void AutreFichier() { Ecrire2(); }\n}");
            CollectionAssert.AreEquivalent(new[] { "E.cs:Direct [EcranX]", "E.cs:ParAide [EcranX]", "E.cs:ParPrivee [EcranX]", "E.cs:ParChaine [EcranX]" },
                ViolationsK3(new List<Source> { aide, ecran, autre }, new HashSet<string>()),
                "contrôle positif : l'écriture directe, par une aide d'une autre classe, par une méthode privée — et contrôle négatif : lire "
                + "une texture (AsTexture), une API citée dans une note ou une chaîne, une vraie capture ; la CHAÎNE (point fixe par l'index) ; "
                + "un appel NU d'un autre fichier n'est pas un appel de l'écrivain (même fichier par son nom, ailleurs par `Classe.Nom(`)");

            var sources = Sources();
            // TD-756 : la mesure qu'on demande, écrite au journal — K3 avait dépassé 180 s dans le run complet, sans qu'on sache où allait le temps
            var chrono = System.Diagnostics.Stopwatch.StartNew();
            var ecrivains = Ecrivains(sources);
            chrono.Stop();
            UnityEngine.Debug.Log($"[K3-MESURE] Ecrivains : {ecrivains.Count} écrivains sur {sources.Count} sources en {chrono.ElapsedMilliseconds} ms");
            Assert.Greater(ecrivains.Count, 20, "anti-vacuité : les méthodes qui écrivent une image sont trouvées");
            Assert.Less(chrono.ElapsedMilliseconds, 20000, "le point fixe est linéaire : 20 s ne se dépassent pas (l'ancienne boucle en prenait plus de 180 en run complet)");
            List<string> v = ViolationsK3(sources, EcrituresAdmises, ecrivains);
            Assert.IsEmpty(v, "un test ÉCRIT une image sans être une capture ni une exception nommée — une sonde écrit dans `Temp/`, une "
                + "photo de juge porte sa catégorie de capture : " + string.Join(" · ", v));
            var toutes = sources.SelectMany(Tests).Select(t => $"{t.fichier}:{t.methode}").ToHashSet();
            Assert.IsEmpty(EcrituresAdmises.Where(e => !toutes.Contains(e)), "une exception nommée ne désigne plus aucun test : la retirer");
        }
    }
}
