using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;

namespace MafiaCleanCity.Tests
{
    // GARDE DE CLASSE « CATÉGORIE DÉCLARÉE, JAMAIS INSCRITE » (f2, 26/09) — deux fois dans la journée, une catégorie de tests verte et
    // portée n'était lancée par AUCUN gate, faute d'entrée dans `MafiaCI.Categories` (CuisinierAuRepos, puis AccueilCanon / PlanqueVide /
    // ConflitReel). Une garde qui n'est dans aucun filtre ne garde rien. Cette garde rougit sur toute catégorie déclarée dans Assets/Tests
    // que le filtre ne prend pas (règle RÉELLE d'Unity : chaque entrée est une regex NON ANCRÉE, `RuntimeTestRunnerFilter`), sauf :
    //   · une FAMILLE exclue nommément, avec sa raison (captures, photos, planches…) ;
    //   · une SONDE exclue nommément (un contrôle positif d'un chien de garde, qui rougirait chaque gate) ;
    //   · la DETTE DATÉE des catégories fonctionnelles jamais inscrites au 26/09 — elle ne fait que rétrécir : une entrée désormais
    //     couverte par le filtre rougit aussi (« retire-la »).
    //   I0  contrôle POSITIF : une catégorie fabriquée, non inscrite, est VUE ; une exclue ne l'est pas
    //   I1  le recensement réel
    [Category("GardeCategories")]
    public class InscriptionDesCategoriesPlayModeTests
    {
        /// <summary>Familles exclues du gate PAR NATURE — préfixes, chacun avec sa raison.</summary>
        internal static readonly Dictionary<string, string> FamillesExclues = new Dictionary<string, string>
        {
            { "Capture", "photographie sous l'identité de capture (paire hors dépôt) ; lancée au créneau de capture, jamais au gate" },
            { "Cliche", "écrit des planches pour le juge visuel ; lancée à la demande (ClicheParcours au créneau)" },
            { "Photo", "planches déterministes pour le juge visuel ; même régime que Cliche" },
            { "Screenshot", "filtre PROSCRIT (TD-625) : il emporte 11 planches" },
            { "MutationDeCarte", "consomme une carte du compte de démo (tampon) ; jamais au gate" },
        };

        /// <summary>Sondes exclues NOMMÉMENT : des contrôles positifs de chiens de garde, qui rougiraient (ou gèleraient) chaque gate.</summary>
        internal static readonly Dictionary<string, string> SondesExclues = new Dictionary<string, string>
        {
            { "SondeFuiteCatalogue", "contrôle positif de la garde de sortie « catalogue » (TD-576) : laisse le catalogue chargé, exprès" },
            { "SondeGelVolontaire", "contrôle positif du chien de garde de gel : gèle le fil principal sous MAFIA_SONDE_GEL=1" },
        };

        /// <summary>DETTE DATÉE (26/09) : catégories FONCTIONNELLES portées, jamais inscrites. Chacune se lance seule au prochain créneau
        /// puis s'inscrit si elle est verte (ou sort avec sa raison). Ne fait que rétrécir.</summary>
        internal static readonly HashSet<string> NonInscritesConnues = new HashSet<string>
        {
            // 16 → 1 le 26/09 (créneau CLIENT-1, pile 256de0f8) : les 15 autres lancées et inscrites vertes (EtatDuShell verte après
            // de887d7d). Reste ManometreOracle : Oracle1_Ring_… GÈLE le fil principal (reproduit au même créneau : RC=5, 180 s de journal
            // muet) — la forme exacte que SondeGelVolontaire imite. Elle sortira de la dette quand le gel sera corrigé.
            "ManometreOracle",
            // 07/10 (CLIENT-2) : ClientHttp — le client HTTP commun (TD-767), 4 tests. Portée, JAMAIS inscrite tant qu'elle n'a pas tourné verte
            // dans l'ORDRE du run complet ; verte ⇒ elle s'inscrit dans MafiaCI et sort d'ici.
            "ClientHttp",
            // CanvasRacine (CLIENT-2, 07/10) est SORTIE de la dette le 07/10 : verte 5/5 au créneau de CLIENT-1, inscrite au filtre de MafiaCI.
        };

        private static readonly Regex Categorie = new Regex(@"Category\(""([^""]+)""\)", RegexOptions.Compiled);
        private static readonly Regex Commentaire = new Regex(@"//[^\n]*", RegexOptions.Compiled);

        /// <summary>Les entrées du filtre, lues dans la source de MafiaCI (commentaires retirés).</summary>
        internal static List<string> Inscrites(string sourceMafiaCI)
        {
            int i = sourceMafiaCI.IndexOf("private static readonly string[] Categories =", System.StringComparison.Ordinal);
            Assert.GreaterOrEqual(i, 0, "le tableau Categories de MafiaCI n'est plus trouvé — le motif ne mord plus");
            int j = sourceMafiaCI.IndexOf("};", i, System.StringComparison.Ordinal);
            string corps = Commentaire.Replace(sourceMafiaCI.Substring(i, j - i), "");
            return Regex.Matches(corps, @"""([A-Za-z0-9]+)""").Cast<Match>().Select(m => m.Groups[1].Value).ToList();
        }

        /// <summary>Les catégories déclarées que RIEN ne couvre (ni le filtre, ni une exclusion nommée, ni la dette). Pure.</summary>
        internal static List<string> NonCouvertes(IEnumerable<string> declarees, List<string> inscrites)
        {
            bool Prise(string c) => inscrites.Any(p => Regex.IsMatch(c, p));
            bool Exclue(string c) => FamillesExclues.Keys.Any(f => c.StartsWith(f, System.StringComparison.Ordinal)) || SondesExclues.ContainsKey(c);
            return declarees.Distinct().Where(c => !Prise(c) && !Exclue(c) && !NonInscritesConnues.Contains(c)).OrderBy(c => c).ToList();
        }

        private static IEnumerable<string> Declarees(string source) =>
            Categorie.Matches(Commentaire.Replace(source, "")).Cast<Match>().Select(m => m.Groups[1].Value);

        [Test]
        public void I0_ControlePositif_UneCategorieNeuveEstVue_UneExclueNon()
        {
            var inscrites = new List<string> { "EcranFile" };
            CollectionAssert.AreEqual(new[] { "ZzzNeuve" }, NonCouvertes(new[] { "ZzzNeuve", "EcranFile", "CaptureZzz", "SondeGelVolontaire", "ManometreOracle" }, inscrites),
                "la neuve est VUE ; l'inscrite, la famille exclue, la sonde et la dette ne le sont pas");
            Assert.IsEmpty(NonCouvertes(new[] { "EcranFileN5" }, inscrites), "règle d'Unity : préfixe NON ancré — « EcranFile » prend « EcranFileN5 »");
            Assert.AreEqual(3, Declarees("[Category(\"A\")] x; // [Category(\"B\")]\n[UnityTest, Category(\"C\")] [Category(\"D\")]").Count(),
                "les déclarations en commentaire ne comptent pas ; la forme combinée, si");
        }

        [Test]
        public void I1_ToutCategorieDeclaree_EstInscrite_OuExclueNommement()
        {
            string mafiaCI = File.ReadAllText(Path.Combine(Application.dataPath, "Editor", "MafiaCI.cs"));
            List<string> inscrites = Inscrites(mafiaCI);
            Assert.Greater(inscrites.Count, 50, $"anti-vacuité : {inscrites.Count} entrée(s) lues dans le filtre");

            var declarees = Directory.GetFiles(Path.Combine(Application.dataPath, "Tests"), "*.cs", SearchOption.AllDirectories)
                .SelectMany(f => Declarees(File.ReadAllText(f))).ToList();
            Assert.Greater(declarees.Distinct().Count(), 80, $"anti-vacuité : {declarees.Distinct().Count()} catégories déclarées");

            List<string> neuves = NonCouvertes(declarees, inscrites);
            Assert.IsEmpty(neuves, $"{neuves.Count} catégorie(s) déclarée(s) que AUCUN gate ne lance : [{string.Join(", ", neuves)}]. " +
                "L'inscrire dans MafiaCI.Categories après un run vert seul — ou l'exclure NOMMÉMENT ici, avec sa raison.");

            // La dette ne fait que rétrécir : une entrée désormais prise par le filtre, ou plus déclarée du tout, en sort.
            var perimees = NonInscritesConnues.Where(c => inscrites.Any(p => Regex.IsMatch(c, p)) || !declarees.Contains(c)).OrderBy(c => c).ToList();
            Assert.IsEmpty(perimees, $"entrée(s) de la dette désormais inscrites ou disparues — les retirer : [{string.Join(", ", perimees)}]");
        }
    }
}
