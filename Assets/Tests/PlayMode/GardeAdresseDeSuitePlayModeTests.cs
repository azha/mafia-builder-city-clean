using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;

// ⛔ UN TEST N'ÉCRIT JAMAIS LÀ OÙ ON NE L'A PAS ENVOYÉ (f2, 26/09 — même principe que TD-589 côté back).
// Les clients de test lisent désormais `AdresseDuBack.Url` (= posée ?? embarquée ?? défaut) au lieu d'un « http://localhost » en dur.
// Le risque DÉPLACÉ : si `Resources/adresse_du_back.txt` (écrit par le build APK) reste dans l'arbre, toute la suite PlayMode viserait
// le VPS PARTAGÉ et y créerait des comptes. Trois gardes :
//   (a) GardeAdresseDeSuite [SetUpFixture], au niveau de l'ASSEMBLY (hors de tout namespace) : avant le premier test, si l'adresse
//       effective n'est pas locale et que MAFIA_PARCOURS_BACK_URL n'est pas posée (le seul envoi explicite vers un back distant), la
//       suite REFUSE de tourner ;
//   (b) contrôle positif : un contenu factice de adresse_du_back.txt vers un hôte distant ⇒ refus (la MÊME fonction de décision) ;
//   (c) garde de CLASSE : aucun « "http://localhost » dans Assets/Tests hors liste EXACTE d'exceptions nommées.
[SetUpFixture]
public class GardeAdresseDeSuite
{
    public const string VariableEnvoiExplicite = "MAFIA_PARCOURS_BACK_URL";

    /// <summary>Vrai une fois la garde passée — un test le vérifie : la garde a RÉELLEMENT tourné avant lui.</summary>
    public static bool Verifiee { get; private set; }

    [OneTimeSetUp]
    public void AvantLaSuite()
    {
        string refus = Refus(MafiaCleanCity.AdresseDuBack.Url, System.Environment.GetEnvironmentVariable(VariableEnvoiExplicite));
        if (refus != null) throw new System.InvalidOperationException(refus);
        Verifiee = true;
    }

    public static bool EstLocale(string url)
    {
        if (string.IsNullOrWhiteSpace(url)) return true;   // aucune adresse : aucune requête ne part
        if (!System.Uri.TryCreate(url.Trim(), System.UriKind.Absolute, out System.Uri u)) return false;
        return u.Host == "localhost" || u.Host == "127.0.0.1" || u.Host == "::1" || u.Host == "[::1]";
    }

    /// <summary>Null si la suite peut tourner ; sinon la raison du refus. Pur.</summary>
    public static string Refus(string urlEffective, string envoiExplicite)
    {
        if (EstLocale(urlEffective)) return null;
        if (!string.IsNullOrWhiteSpace(envoiExplicite)) return null;   // l'opérateur a envoyé la suite vers ce back, en le disant
        return $"SUITE REFUSÉE : les tests viseraient « {urlEffective} », un back NON local, sans que {VariableEnvoiExplicite} l'ait demandé. "
            + "Cause probable : Assets/Resources/adresse_du_back.txt laissé par un build APK — le retirer (git status) avant de relancer.";
    }

    /// <summary>Ce que `AdresseDuBack` ferait d'un contenu de adresse_du_back.txt (texte, espaces retirés) — pour le contrôle positif.</summary>
    public static string UrlDepuisRessource(string contenu) =>
        string.IsNullOrWhiteSpace(contenu) ? null : contenu.Trim();
}

namespace MafiaCleanCity.Tests
{
    [Category("GardeCategories")]
    public class GardeAdresseDeSuitePlayModeTests
    {
        [Test]
        public void A_LaGardeDeSuite_ATourne_EtLAdresseEstLocale()
        {
            Assert.IsTrue(GardeAdresseDeSuite.Verifiee, "le [SetUpFixture] d'assembly n'a pas tourné avant ce test : la garde ne protège rien");
            if (string.IsNullOrWhiteSpace(System.Environment.GetEnvironmentVariable(GardeAdresseDeSuite.VariableEnvoiExplicite)))
                Assert.IsTrue(GardeAdresseDeSuite.EstLocale(AdresseDuBack.Url), $"adresse effective « {AdresseDuBack.Url} »");
        }

        [Test]
        public void B_UnFichierFactice_VersUnHoteDistant_EstRefuse()
        {
            string factice = GardeAdresseDeSuite.UrlDepuisRessource("  https://cleancity.erutheone.eu\n");
            Assert.IsNotNull(GardeAdresseDeSuite.Refus(factice, null), "contrôle positif : adresse_du_back.txt vers le VPS ⇒ REFUS");
            Assert.IsNull(GardeAdresseDeSuite.Refus(factice, "https://cleancity.erutheone.eu"), "envoi explicite : accepté");
            Assert.IsNull(GardeAdresseDeSuite.Refus(GardeAdresseDeSuite.UrlDepuisRessource("http://localhost"), null));
            Assert.IsNull(GardeAdresseDeSuite.Refus(GardeAdresseDeSuite.UrlDepuisRessource(""), null), "pas de fichier : le défaut local");
            Assert.IsNotNull(GardeAdresseDeSuite.Refus("http://192.168.1.20:3000", null), "tout hôte non local, même http");
        }

        // ── (c) la garde de CLASSE ─────────────────────────────────────────────────────────────────────────────────────────────
        private static readonly Regex EnDur = new Regex("\"http://localhost", RegexOptions.Compiled);

        /// <summary>Exceptions EXACTES (fichier → nombre), chacune avec sa raison : ce sont des DONNÉES, jamais la cible d'un client.</summary>
        private static readonly Dictionary<string, int> Exceptions = new Dictionary<string, int>
        {
            { "AdresseDuBackPlayModeTests.cs", 3 },          // teste AdresseDuBack lui-même (défaut de l'éditeur, sites du scanner)
            { "ExceptionsTamponPlayModeTests.cs", 2 },       // ConstruireResolve (constructeur d'URL PUR) : l'entrée et l'attendu
            { "ParcoursJoueurNeufCapturePlayModeTests.cs", 5 }, // G1-G3 : les URL que les gardes du parcours acceptent ou refusent
            { "GardeAdresseDeSuitePlayModeTests.cs", 4 },     // ce fichier : les données de ses propres contrôles (B et C)
        };

        private static int Sites(string source) =>
            source.Split('\n').Count(l => !l.TrimStart().StartsWith("//") && EnDur.IsMatch(l));

        [Test]
        public void C_AucuneAdresseLocaleEnDur_HorsExceptionsNommees()
        {
            Assert.AreEqual(1, Sites("        private const string BaseUrl = \"http://localhost\";"), "contrôle positif : la forme d'avant est VUE");
            Assert.AreEqual(0, Sites("        // private const string BaseUrl = \"http://localhost\";"), "un commentaire n'est pas un site");

            string racine = Path.Combine(Application.dataPath, "Tests");
            var ecarts = new List<string>();
            int lus = 0;
            foreach (string f in Directory.GetFiles(racine, "*.cs", SearchOption.AllDirectories))
            {
                lus++;
                int n = Sites(File.ReadAllText(f));
                string nom = Path.GetFileName(f);
                int permis = Exceptions.TryGetValue(nom, out int p) ? p : 0;
                if (n != permis) ecarts.Add($"{nom} : {n} site(s), {permis} permis");
            }
            Assert.Greater(lus, 100, "le balayage lit réellement l'arbre des tests");
            Assert.IsEmpty(ecarts, "« http://localhost » en dur : un client de test lit AdresseDuBack.Url (la source du shell) — "
                + "sinon ajouter une exception NOMMÉE et EXACTE :\n" + string.Join("\n", ecarts));
        }
    }
}
