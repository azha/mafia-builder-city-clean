using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;

namespace MafiaCleanCity.Tests
{
    // E-R6 (design retour d'appui v5, §4) — garde « aucun appel `*PourTest` hors tests » (ruling f2 11/11 : les coutures `…PourTest` sont `public`,
    // faute d'`InternalsVisibleTo` ; la discipline qui reste est qu'AUCUN code de production ne les APPELLE). Une couture déclarée est permise, une couture
    // appelée depuis Assets/Scripts est un rouge nommé `fichier:ligne`.
    // La garde est un SCAN DE SOURCE : ligne par ligne, après retrait des commentaires et des littéraux. Le motif est volontairement SANS quantificateur
    // imbriqué ambigu (un `(a*b)*` a gelé l'éditeur ce jour, retour arrière catastrophique) et le `Regex` porte un délai de 5 s (il LÈVE, il ne gèle plus).
    [Category("RetourAppui")]
    public class CoutureHorsTestsPlayModeTests
    {
        private static readonly TimeSpan Delai = TimeSpan.FromSeconds(5);

        // une occurrence d'un nom en `…PourTest` suivi de « ( » : le nom nu est un jeton, `\w*` n'est suivi d'aucun groupe répété
        private static readonly Regex Occurrence = new Regex(@"\b[A-Za-z_0-9]*PourTest\s*\(", RegexOptions.CultureInvariant, Delai);

        // la ligne est une DÉCLARATION : modificateurs (chacun littéral + espace), puis un type (un jeton, ou un n-uplet sans parenthèse imbriquée),
        // puis le nom. Les mots qui précèdent un appel (`return`, `new`…) ne sont pas un type.
        private static readonly Regex Declaration = new Regex(
            @"^\s*(?:(?:public|internal|private|protected|static|override|virtual)\s+)*(?!(?:return|else|await|yield|throw|new|case)\b)(?:[\w<>\[\],?\.]+|\([^()]*\))\s+\w*PourTest\s*\(",
            RegexOptions.CultureInvariant, Delai);

        // ------------------------------------------------------------------------------ le scan (PUR)
        /// <summary>Le source sans commentaires `//` et `/* */` ni littéraux (chaîne, chaîne verbatim, caractère) ; les sauts de ligne sont CONSERVÉS
        /// (les numéros de ligne restent ceux du fichier). Un petit automate, pas un `Regex`.</summary>
        public static string Nettoyer(string src)
        {
            var sb = new StringBuilder(src.Length);
            int i = 0, n = src.Length;
            while (i < n)
            {
                char c = src[i];
                char suivant = i + 1 < n ? src[i + 1] : '\0';
                if (c == '/' && suivant == '/')
                {
                    while (i < n && src[i] != '\n') i++;
                }
                else if (c == '/' && suivant == '*')
                {
                    i += 2;
                    while (i < n && !(src[i] == '*' && i + 1 < n && src[i + 1] == '/')) { if (src[i] == '\n') sb.Append('\n'); i++; }
                    i = Math.Min(n, i + 2);
                    sb.Append(' ');
                }
                else if (c == '"' || (c == '@' && suivant == '"') || ((c == '$' || c == '@') && suivant == '@' && i + 2 < n && src[i + 2] == '"'))
                {
                    bool verbatim = c == '@' || (c == '$' && suivant == '@');
                    while (i < n && src[i] != '"') i++;   // le préfixe ($, @) puis la guillemet ouvrante
                    i++;
                    while (i < n)
                    {
                        if (verbatim)
                        {
                            if (src[i] == '"') { if (i + 1 < n && src[i + 1] == '"') { i += 2; continue; } break; }
                        }
                        else
                        {
                            if (src[i] == '\\') { i += 2; continue; }
                            if (src[i] == '"' || src[i] == '\n') break;
                        }
                        if (src[i] == '\n') sb.Append('\n');
                        i++;
                    }
                    if (i < n && src[i] == '"') i++;   // la fermante ; sur une ligne non terminée, le saut de ligne reste à l'automate
                    sb.Append("\"\"");
                }
                else if (c == '$' && suivant == '"')
                {
                    i++;   // une chaîne interpolée se lit comme une chaîne ordinaire : on retombe sur la branche `"`
                }
                else if (c == '\'')
                {
                    i++;
                    while (i < n && src[i] != '\'' && src[i] != '\n') { if (src[i] == '\\') i++; i++; }
                    if (i < n && src[i] == '\'') i++;
                    sb.Append("''");
                }
                else
                {
                    sb.Append(c);
                    i++;
                }
            }
            return sb.ToString();
        }

        /// <summary>Les numéros de ligne (1-based) des APPELS `…PourTest(` : les occurrences d'une ligne qui n'est pas une déclaration.</summary>
        public static List<int> LignesDesAppelsPourTest(string contenu)
        {
            var lignes = new List<int>();
            string[] morceaux = Nettoyer(contenu).Split('\n');
            for (int k = 0; k < morceaux.Length; k++)
            {
                string ligne = morceaux[k];
                if (ligne.IndexOf("PourTest", StringComparison.Ordinal) < 0) continue;
                if (Declaration.IsMatch(ligne)) continue;
                int appels = Occurrence.Matches(ligne).Count;
                for (int a = 0; a < appels; a++) lignes.Add(k + 1);
            }
            return lignes;
        }

        /// <summary>Le nombre d'appels `…PourTest(` (hors déclaration, hors commentaire, hors littéral) de `contenu`.</summary>
        public static int ScanAppelsPourTest(string contenu)
        {
            return LignesDesAppelsPourTest(contenu).Count;
        }

        // ------------------------------------------------------------------------------ les contrôles positifs (synthétiques)
        [Test]
        public void Scan_ContenuQuiAppelleUneCouture_Compte1()
        {
            Assert.AreEqual(1, ScanAppelsPourTest("class A { void F(Ecran ecran) {\n    ecran.RendrePourTest(x);\n} }"));
        }

        [Test]
        public void Scan_ContenuQuiDeclareUneCouture_Compte0()
        {
            Assert.AreEqual(0, ScanAppelsPourTest("class A {\n    public void RendrePourTest(Dto x)\n    { }\n}"));
            Assert.AreEqual(0, ScanAppelsPourTest("class A {\n    internal static IReadOnlyList<Button> AttendantsPourTest() => null;\n}"));
            Assert.AreEqual(0, ScanAppelsPourTest("class A {\n    public (string[] a, string[] b) IdsPlusPourTest() => (null, null);\n}"));
        }

        [Test]
        public void Scan_AppelDansUnCommentaire_Compte0()
        {
            Assert.AreEqual(0, ScanAppelsPourTest("// ecran.RendrePourTest(x);\nclass A { }"));
            Assert.AreEqual(0, ScanAppelsPourTest("/// <summary>puis `RendrePourTest(corps)`</summary>\nclass A { }"));
            Assert.AreEqual(0, ScanAppelsPourTest("class A { /* ecran.RendrePourTest(x);\n   ecran.RendrePourTest(y); */ }"));
        }

        [Test]
        public void Scan_AppelDansUnLitteral_Compte0()
        {
            Assert.AreEqual(0, ScanAppelsPourTest("class A { string s = \"ecran.RendrePourTest(x)\"; }"));
            Assert.AreEqual(0, ScanAppelsPourTest("class A { string s = @\"ecran.\"\"RendrePourTest(x)\"; }"));
        }

        [Test]
        public void Scan_AppelApresUnReturn_NEstPasUneDeclaration()
        {
            Assert.AreEqual(1, ScanAppelsPourTest("class A { int F() {\n    return SubstitutPourTest(x);\n} }"));
        }

        [Test]
        public void Scan_NumeroDeLigne_EstCeluiDuFichier()
        {
            CollectionAssert.AreEqual(new[] { 4 }, LignesDesAppelsPourTest("// un\n/* deux\n trois */\nx.RendrePourTest(y);\n"));
        }

        [Test]
        public void Scan_LigneLongueSansAppel_NeGelePas()
        {
            // le piège de ce jour : un motif à quantificateurs imbriqués se découpe de 2^n façons sur une longue ligne de mots
            string mots = string.Join(" ", System.Linq.Enumerable.Repeat("mot", 3000));
            var chrono = System.Diagnostics.Stopwatch.StartNew();
            Assert.AreEqual(0, ScanAppelsPourTest(mots + " XPourTest\n"), "des mots, le nom, mais pas de « ( » : pas un appel");
            Assert.AreEqual(1, ScanAppelsPourTest(mots + " XPourTest(y)\n"), "le même, avec « ( » : un appel");
            Assert.Less(chrono.ElapsedMilliseconds, 2000L);
        }

        // ------------------------------------------------------------------------------ l'arbre réel
        /// <summary>CLIQUET (mesuré le 11/11 au run 11, ruling f2 « count = 0 » NON tenu à l'état de l'arbre) : 7 appels `…PourTest(` PRÉEXISTANTS
        /// dans Assets/Scripts — des crochets que le code de prod lit lui-même (substitut réseau, remise à zéro d'état, rendu initial), pas des
        /// coutures de GP. Aucun n'est nouveau ; la dette est NOMMÉE ici, par fichier, et ne se rallonge que par décision datée. Un appel de plus
        /// ROUGIT ; un appel de moins ROUGIT aussi (la liste se raccourcit, jamais ne se périme).</summary>
        private static readonly Dictionary<string, int> DetteDatee = new Dictionary<string, int>
        {
            { "Scripts/I18n/I18nCatalog.cs", 1 },
            { "Scripts/ShellContracts/EtatPublieParLeShell.cs", 2 },
            { "Scripts/Operational/Carnet/CarnetClient.cs", 1 },
            { "Scripts/Operational/Carnet/CarnetScreenController.cs", 1 },
            { "Scripts/Operational/Exceptions/ExceptionsClient.cs", 2 },
        };

        [Test]
        public void AssetsScripts_AucunNouvelAppelPourTestHorsTests()
        {
            string dossier = Path.Combine(Application.dataPath, "Scripts");
            Assert.IsTrue(Directory.Exists(dossier), "précondition : " + dossier);
            var parFichier = new Dictionary<string, List<int>>();
            int fichiers = 0;
            foreach (string f in Directory.EnumerateFiles(dossier, "*.cs", SearchOption.AllDirectories))
            {
                fichiers++;
                List<int> lignes = LignesDesAppelsPourTest(File.ReadAllText(f));
                if (lignes.Count > 0) parFichier[f.Substring(Application.dataPath.Length + 1).Replace('\\', '/')] = lignes;
            }
            Assert.Greater(fichiers, 0, "précondition : des sources ont été scannées");
            var ecarts = new List<string>();
            foreach (KeyValuePair<string, List<int>> kv in parFichier)
            {
                DetteDatee.TryGetValue(kv.Key, out int permis);
                if (kv.Value.Count != permis)
                    ecarts.Add(kv.Key + " : " + kv.Value.Count + " appel(s) (lignes " + string.Join(",", kv.Value) + "), dette datée " + permis);
            }
            foreach (KeyValuePair<string, int> kv in DetteDatee)
                if (!parFichier.ContainsKey(kv.Key)) ecarts.Add(kv.Key + " : 0 appel, dette datée " + kv.Value + " — retirer la ligne de la dette");
            Assert.IsEmpty(ecarts, "appel(s) `…PourTest(` dans Assets/Scripts hors de la dette datée (une couture se déclare, un test l'appelle) :\n" + string.Join("\n", ecarts));
        }
    }
}
