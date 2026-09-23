using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;
using MafiaCleanCity.Shell;

namespace MafiaCleanCity.CityMap.Tests
{
    // Point 10 (arbitrages du 07/09, ratifié) — « 9 627 820 € », sans centimes, espace fine insécable :
    //   A1  la VALEUR, octet par octet (U+202F entre les milliers ET avant le symbole), tronquée, jamais arrondie
    //   A2  au-delà de 2^53 le montant survit sans perte ; « — » pour une valeur absente ou illisible ; la barre délègue
    //   A3  AUCUN autre formateur d'argent dans `Assets/Scripts` que `Argent` (garde structurelle, contrôles positif et négatif)
    [Category("EcranDistrict")]
    public class ArgentPlayModeTests
    {
        private static string Octets(string s) => string.Join(" ", Encoding.UTF8.GetBytes(s).Select(b => b.ToString("x2")));

        [Test]
        public void A1_LaValeur_OctetParOctet()
        {
            const string fine = " ";
            Assert.AreEqual(Octets("24" + fine + "850" + fine + "€"), Octets(Argent.Montant(24850m, "fr")),
                "« 24 850 € » : U+202F (e2 80 af) entre les milliers et avant le symbole");
            Assert.AreEqual("9 627 820 €", Argent.Montant(9627820m, "fr"), "l'exemple du point 10");
            Assert.AreEqual("24 850 €", Argent.DepuisCentimes("2485075", "fr"),
                "24 850,75 ⇒ 24 850 : tronqué, l'écran ne montre jamais de l'argent qu'on n'a pas");
            Assert.AreEqual("0 €", Argent.DepuisCentimes("99", "fr"));
            Assert.AreEqual("-1 500 €", Argent.DepuisCentimes("-150000", "fr"));
            Assert.AreEqual("850 €", Argent.Montant(850m, "fr"), "sous mille : aucun séparateur");
            Assert.IsFalse(Argent.Montant(24850m, "fr").Contains(","), "aucune virgule : plus de centimes");
            Assert.IsFalse(Argent.Montant(24850m, "fr").Contains(" "), "pas l'espace insécable de Mono (U+00A0)");
            Assert.AreEqual("$24,850", Argent.Montant(24850m, "en"), "l'anglais : en-US, sans centimes");
        }

        [Test]
        public void A2_SansPerte_Absent_EtLaBarreDelegue()
        {
            Assert.AreEqual("9 007 199 254 740 993 123 €",
                Argent.DepuisCentimes("900719925474099312345", "fr"), "au-delà de 2^53, sans perte");
            Assert.AreEqual("—", Argent.DepuisCentimes(null, "fr"));
            Assert.AreEqual("—", Argent.DepuisCentimes("", "fr"));
            Assert.AreEqual("—", Argent.DepuisCentimes("douze", "fr"));
            Assert.AreEqual(Argent.DepuisCentimes("2485000", "fr"), TopBarController.FormatCash("2485000", "fr"),
                "la barre ne formate pas elle-même : elle délègue");
        }

        // Les formes d'un formateur d'argent : un spécificateur monétaire `C` (ToString / interpolation / String.Format), le
        // symbole de monnaie de la culture, ou le signe « € » écrit dans le code.
        private static readonly Regex[] Formes =
        {
            new Regex(@"ToString\(\s*""[Cc]\d*"""),
            new Regex(@"\{[^}]*:[Cc]\d*\}"),
            new Regex(@"CurrencySymbol"),
            new Regex("€"),
        };

        internal static List<string> Formateurs(string texte, string nom)
        {
            var trouves = new List<string>();
            string[] lignes = texte.Split('\n');
            for (int i = 0; i < lignes.Length; i++)
            {
                string l = lignes[i].TrimStart();
                if (l.StartsWith("//") || l.StartsWith("*") || l.StartsWith("/*")) continue;
                string code = Regex.Replace(lignes[i], @"//.*$", "");
                if (Formes.Any(f => f.IsMatch(code))) trouves.Add($"{nom}:{i + 1}  {lignes[i].Trim()}");
            }
            return trouves;
        }

        [Test]
        public void A3_AucunAutreFormateurDArgent()
        {
            // Contrôles de l'instrument, AVANT le balayage : il doit voir les trois formes, et ne pas voir un compte.
            Assert.AreEqual(1, Formateurs("x = major.ToString(\"C\", culture);", "pos").Count, "contrôle positif : `\"C\"`");
            Assert.AreEqual(1, Formateurs("x = $\"{v:C0}\";", "pos").Count, "contrôle positif : interpolation `:C0`");
            Assert.AreEqual(1, Formateurs("x = v.ToString(\"N2\") + \" €\";", "pos").Count, "contrôle positif : `N2` suivi de « € »");
            Assert.AreEqual(0, Formateurs("x = n.ToString(CultureInfo.InvariantCulture);", "neg").Count, "contrôle négatif : un compte");
            Assert.AreEqual(0, Formateurs("// ToString(\"C\") en commentaire", "neg").Count, "contrôle négatif : un commentaire");

            string racine = Path.Combine(Application.dataPath, "Scripts");
            string[] fichiers = Directory.GetFiles(racine, "*.cs", SearchOption.AllDirectories);
            Assert.Greater(fichiers.Length, 100, "anti-vacuité : le balayage voit le client");
            var hors = new List<string>();
            int dansArgent = 0;
            foreach (string f in fichiers)
            {
                List<string> t = Formateurs(File.ReadAllText(f), Path.GetFileName(f));
                if (Path.GetFileName(f) == "Argent.cs") dansArgent += t.Count;
                else hors.AddRange(t);
            }
            Assert.Greater(dansArgent, 0, "anti-vacuité : l'instrument voit le formateur unique lui-même");
            Assert.IsEmpty(hors, "un formateur d'argent hors de `Argent` : " + string.Join(" · ", hors));
        }
    }
}
