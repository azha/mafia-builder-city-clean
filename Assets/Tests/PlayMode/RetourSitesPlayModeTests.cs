using System.Collections.Generic;
using System.IO;
using System.Runtime.CompilerServices;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Shell;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Tests
{
    /// <summary>Un site de création de bouton, relevé dans la SOURCE : le fichier, la ligne de l'appel à `Retour.NouveauBouton`, le membre qui le porte.</summary>
    public readonly struct SiteInventorie
    {
        public readonly string Fichier;
        public readonly int Ligne;
        public readonly string Membre;
        public SiteInventorie(string fichier, int ligne, string membre) { Fichier = fichier; Ligne = ligne; Membre = membre; }
        public override string ToString() { return Fichier + ":" + Ligne + " (" + Membre + ")"; }
    }

    /// <summary>
    /// Design retour d'appui v5 §4 (GP) — la CARTE site → bouton monté. Le compilateur pose (membre, ligne) à chaque `Retour.NouveauBouton`
    /// (`[CallerMemberName]` + `[CallerLineNumber]`, jamais un chemin de fichier : décision f2 11/11, un chemin absolu de la machine de build
    /// fuirait dans chaque binaire livré) ; ce helper résout (membre, ligne) vers le FICHIER par le scan de source de `Retour`. Une ambiguïté
    /// ou un zéro est un ROUGE nommé, jamais un site « couvert » par défaut.
    /// </summary>
    public static class RetourSites
    {
        public const string Guichet = "Assets/Scripts/ShellContracts/Retour.cs";

        /// <summary>Tous les appels à `Retour.NouveauBouton` de `Assets/Scripts`, hors le guichet lui-même.</summary>
        public static List<SiteInventorie> Inventaire()
        {
            string dossier = Path.Combine(Application.dataPath, "Scripts");
            var res = new List<SiteInventorie>();
            foreach (string f in Directory.GetFiles(dossier, "*.cs", SearchOption.AllDirectories))
            {
                string chemin = "Assets/Scripts/" + f.Substring(dossier.Length).TrimStart('/', '\\').Replace('\\', '/');
                if (chemin == Guichet) continue;
                foreach (Retour.SiteBouton s in Retour.ScanSitesDeNouveauBouton(File.ReadAllText(f)))
                    res.Add(new SiteInventorie(chemin, s.Ligne, s.Membre));
            }
            return res;
        }

        /// <summary>Les sites de l'inventaire qui portent ce (membre, ligne).</summary>
        public static List<SiteInventorie> Correspondances(IReadOnlyList<SiteInventorie> inventaire, string membre, int ligne)
        {
            var res = new List<SiteInventorie>();
            for (int i = 0; i < inventaire.Count; i++)
                if (inventaire[i].Ligne == ligne && inventaire[i].Membre == membre) res.Add(inventaire[i]);
            return res;
        }

        /// <summary>null si (membre, ligne) désigne UN seul site ; sinon le message du rouge (0 ou plusieurs correspondances).</summary>
        public static string Resoudre(IReadOnlyList<SiteInventorie> inventaire, string membre, int ligne, out SiteInventorie site)
        {
            List<SiteInventorie> c = Correspondances(inventaire, membre, ligne);
            site = c.Count == 1 ? c[0] : default;
            if (c.Count == 1) return null;
            return "GP : site " + membre + ":" + ligne + " — " + c.Count + " correspondance(s) dans la source, attendu 1"
                   + (c.Count > 1 ? " (" + string.Join(", ", c) + ")" : "");
        }

        /// <summary>La ligne de tête de la publication GP : `couverture sites : k / N`, puis la liste NOMMÉE des non couverts. `vus` : les
        /// (membre, ligne) des boutons montés ; un (membre, ligne) qui ne se résout pas est compté dans `rouges`, jamais comme couvert.</summary>
        public static string LigneDeCouverture(IReadOnlyList<SiteInventorie> inventaire, IEnumerable<KeyValuePair<string, int>> vus,
            out List<string> nonCouverts, out List<string> rouges)
        {
            var couverts = new HashSet<SiteInventorie>();
            rouges = new List<string>();
            foreach (KeyValuePair<string, int> v in vus)
            {
                string r = Resoudre(inventaire, v.Key, v.Value, out SiteInventorie s);
                if (r != null) { if (!rouges.Contains(r)) rouges.Add(r); }
                else couverts.Add(s);
            }
            nonCouverts = new List<string>();
            for (int i = 0; i < inventaire.Count; i++) if (!couverts.Contains(inventaire[i])) nonCouverts.Add(inventaire[i].ToString());
            return "[GP] couverture sites : " + couverts.Count + " / " + inventaire.Count
                   + (nonCouverts.Count > 0 ? " ; non couverts (" + nonCouverts.Count + ") : " + string.Join(" ; ", nonCouverts) : "");
        }

        /// <summary>Le nombre d'occurrences des motifs interdits dans un contenu : un chemin de machine (`/home/`) ou l'attribut qui l'y grave.</summary>
        public static int OccurrencesInterdites(string contenu)
        {
            if (string.IsNullOrEmpty(contenu)) return 0;
            int n = 0;
            foreach (string motif in new[] { "/home/", "Caller" + "FilePath" })
                for (int i = contenu.IndexOf(motif, System.StringComparison.Ordinal); i >= 0; i = contenu.IndexOf(motif, i + motif.Length, System.StringComparison.Ordinal)) n++;
            return n;
        }
    }

    [Category("RetourAppui")]
    public class RetourSitesPlayModeTests
    {
        private GameObject racine;

        [TearDown]
        public void Demonter()
        {
            if (racine != null) Object.DestroyImmediate(racine);
            racine = null;
        }

        private static int LigneCourante([CallerLineNumber] int l = 0) { return l; }

        // ------------------------------------------------------------------------------ le scan, fonction pure
        [Test]
        public void Scan_Synthetique_LigneDuJeton_EtMembreLePlusProche()
        {
            string source = string.Join("\n", new[]
            {
                "class X",                                                  // 1
                "{",                                                        // 2
                "    private void BuildA(Transform p)",                     // 3
                "    {",                                                    // 4
                "        Button b = Retour.NouveauBouton(go);",             // 5
                "        // Retour.NouveauBouton(commentaire)",              // 6
                "        string s = \"Retour.NouveauBouton(chaine)\";",     // 7
                "    }",                                                    // 8
                "    public static Button BuildB(Transform p)",             // 9
                "    {",                                                    // 10
                "        if (p != null)",                                   // 11
                "            return Retour.NouveauBouton(go, fond);",       // 12
                "        return null;",                                     // 13
                "    }",                                                    // 14
                "}",
                "",
            });
            List<Retour.SiteBouton> r = Retour.ScanSitesDeNouveauBouton(source);
            Assert.AreEqual(2, r.Count, "ni le commentaire ni la chaîne ne créent de site");
            Assert.AreEqual(5, r[0].Ligne); Assert.AreEqual("BuildA", r[0].Membre);
            Assert.AreEqual(12, r[1].Ligne); Assert.AreEqual("BuildB", r[1].Membre, "un `if (` n'est pas un membre");
        }

        // ------------------------------------------------------------------------------ l'inventaire de l'arbre réel
        // Le défaut qui a GELÉ l'éditeur au run 5 du 11/11 : `MotifMembre` avec `(?:\s*mot)*` se découpait de 2^n façons sur une ligne de
        // mots sans `(`. Le garde : une telle ligne, juste avant l'appel, se scanne en un instant (et le délai du Regex lève, jamais ne gèle).
        [Test]
        public void Scan_LigneDeMotsSansParenthese_NeGelePas_EtTrouveLeSite()
        {
            string mots = string.Join(" ", System.Linq.Enumerable.Repeat("mot", 60));
            string source = "class C\n{\n    void M()\n    {\n        " + mots + "\n        Retour.NouveauBouton(h);\n    }\n}\n";
            var chrono = System.Diagnostics.Stopwatch.StartNew();
            List<Retour.SiteBouton> sites = Retour.ScanSitesDeNouveauBouton(source);
            chrono.Stop();
            Assert.AreEqual(1, sites.Count, "le site est trouvé malgré la ligne de mots");
            Assert.Less(chrono.ElapsedMilliseconds, 1000, "le scan d'une ligne de 60 mots sans parenthèse a pris " + chrono.ElapsedMilliseconds + " ms");
        }

        // La ligne de continuation d'un ternaire ne vole pas le membre : `? Autre(row)` avant l'appel (cas réel : LieutenantScreenController:2847).
        [Test]
        public void Scan_LigneDeContinuationDUnTernaire_NeVolePasLeMembre()
        {
            string source = "class C\n{\n    private void BuildSlot(int a, string b)\n    {\n        string t = ok\n            ? Autre(b)\n            : Ailleurs(b);\n"
                          + "        if (ok)\n        {\n            Retour.NouveauBouton(h);\n        }\n    }\n}\n";
            List<Retour.SiteBouton> sites = Retour.ScanSitesDeNouveauBouton(source);
            Assert.AreEqual(1, sites.Count);
            Assert.AreEqual("BuildSlot", sites[0].Membre, "le membre est la déclaration, jamais la ligne `? Autre(b)`");
        }

        [Test]
        public void Inventaire_ArbreReel_69Sites_ChacunUnMembre_EtUniqueParMembreEtLigne()
        {
            List<SiteInventorie> inv = RetourSites.Inventaire();
            Assert.AreEqual(69, inv.Count, "N = 69 sites (design §1, bijection E-R5) : " + string.Join(" ; ", inv));
            var sansMembre = inv.FindAll(s => string.IsNullOrEmpty(s.Membre));
            Assert.IsEmpty(sansMembre, "un site sans membre ne se résoudra jamais : " + string.Join(" ; ", sansMembre));
            foreach (SiteInventorie s in inv)
                Assert.AreEqual(1, RetourSites.Correspondances(inv, s.Membre, s.Ligne).Count, "ambiguïté sur " + s);
            // un échantillon connu du lot A, mesuré à HEAD (membre déclarant, vu dans la source) : le scan ne s'invente pas ses membres
            foreach (string attendu in new[]
            {
                "Assets/Scripts/CityMap/DistrictInteriorScreenController.cs (BuildFiche)",
                "Assets/Scripts/CityMap/DistrictInteriorScreenController.cs (BuildFicheBouton)",
                "Assets/Scripts/CityMap/CityMapController.cs (BuildToggleButton)",
                "Assets/Scripts/CityMap/CityMapController.cs (BuildMarqueur)",
                "Assets/Scripts/Operational/BuildingCard/BuildingCardController.cs (AddActionButton)",
            })
                Assert.IsTrue(inv.Exists(s => s.Fichier + " (" + s.Membre + ")" == attendu), "site attendu absent : " + attendu);
        }

        // ------------------------------------------------------------------------------ la résolution (membre, ligne) → site
        [Test]
        public void Resoudre_UnSiteDeplaceDUneLigne_Rougit_ZeroCorrespondance()
        {
            var inv = new List<SiteInventorie> { new SiteInventorie("Assets/Scripts/A.cs", 10, "BuildA"), new SiteInventorie("Assets/Scripts/B.cs", 20, "BuildB") };
            Assert.IsNull(RetourSites.Resoudre(inv, "BuildA", 10, out SiteInventorie s));
            Assert.AreEqual("Assets/Scripts/A.cs", s.Fichier);
            string r = RetourSites.Resoudre(inv, "BuildA", 11, out _);   // contrôle positif : le site a bougé d'une ligne
            Assert.AreEqual("GP : site BuildA:11 — 0 correspondance(s) dans la source, attendu 1", r);
        }

        [Test]
        public void Resoudre_DeuxSitesIdentiques_Rougit_Ambiguite()
        {
            var inv = new List<SiteInventorie> { new SiteInventorie("Assets/Scripts/A.cs", 10, "Build"), new SiteInventorie("Assets/Scripts/B.cs", 10, "Build") };
            string r = RetourSites.Resoudre(inv, "Build", 10, out _);
            StringAssert.StartsWith("GP : site Build:10 — 2 correspondance(s) dans la source, attendu 1", r);
        }

        [Test]
        public void Couverture_LaLigneDeTete_CompteLesCouverts_NommeLesAutres_EtNeCompteJamaisUnRouge()
        {
            var inv = new List<SiteInventorie>
            {
                new SiteInventorie("Assets/Scripts/A.cs", 10, "BuildA"),
                new SiteInventorie("Assets/Scripts/B.cs", 20, "BuildB"),
                new SiteInventorie("Assets/Scripts/C.cs", 30, "BuildC"),
            };
            var vus = new List<KeyValuePair<string, int>>
            {
                new KeyValuePair<string, int>("BuildA", 10),
                new KeyValuePair<string, int>("BuildA", 10),   // une seconde instance du même site : compte une fois
                new KeyValuePair<string, int>("BuildB", 21),   // le site a bougé : ROUGE, pas couvert
            };
            string tete = RetourSites.LigneDeCouverture(inv, vus, out List<string> non, out List<string> rouges);
            Assert.AreEqual("[GP] couverture sites : 1 / 3 ; non couverts (2) : Assets/Scripts/B.cs:20 (BuildB) ; Assets/Scripts/C.cs:30 (BuildC)", tete);
            Assert.AreEqual(2, non.Count);
            Assert.AreEqual(1, rouges.Count);
            StringAssert.Contains("BuildB:21", rouges[0]);
        }

        // ------------------------------------------------------------------------------ le compilateur pose bien (membre, ligne)
        [Test]
        public void NouveauBouton_LeCompilateurPoseLeMembreEtLaLigneDeLAppel()
        {
            racine = new GameObject("RetourSites", typeof(RectTransform));
            int avant = LigneCourante();
            Button b = Retour.NouveauBouton(racine);
            RetourAppui ra = b.GetComponent<RetourAppui>();
            Assert.AreEqual(avant + 1, ra.SiteLigne, "la ligne de l'appel");
            Assert.AreEqual(nameof(NouveauBouton_LeCompilateurPoseLeMembreEtLaLigneDeLAppel), ra.SiteMembre, "le membre appelant");
        }

        // ------------------------------------------------------------------------------ l'absence : aucun chemin de machine dans le binaire
        [Test]
        public void Absence_AssetsScripts_AucunCheminDeMachine_NiAttributDeChemin()
        {
            string dossier = Path.Combine(Application.dataPath, "Scripts");
            string[] fichiers = Directory.GetFiles(dossier, "*.cs", SearchOption.AllDirectories);
            Assert.Greater(fichiers.Length, 200, "anti-vacuité : trop peu de sources lues (" + fichiers.Length + ")");
            var rouges = new List<string>();
            foreach (string f in fichiers)
            {
                int n = RetourSites.OccurrencesInterdites(File.ReadAllText(f));
                if (n > 0) rouges.Add(f.Substring(dossier.Length) + " : " + n);
            }
            Assert.IsEmpty(rouges, "chemin de machine ou attribut de chemin dans Assets/Scripts : " + string.Join(" ; ", rouges));
        }

        [Test]
        public void Absence_ControlePositif_LeMotifDeCheminEtL_AttributSontVus()
        {
            Assert.AreEqual(2, RetourSites.OccurrencesInterdites("var p = \"/home/quelquun/projet\"; void F([Caller" + "FilePath] string f) { }"));
            Assert.AreEqual(0, RetourSites.OccurrencesInterdites("void F([CallerMemberName] string m, [CallerLineNumber] int l) { }"));
        }
    }
}
