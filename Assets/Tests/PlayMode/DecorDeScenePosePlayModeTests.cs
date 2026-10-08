using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;
using MafiaCleanCity.Shell;

namespace MafiaCleanCity.Tests.PlayMode
{
    /// <summary>D2 / D3 / D6(b) du décor de scène (`Tools/decor-de-scene-2026-10-07/DESIGN.md`, §6) — gardes STATIQUES sur la
    /// source des contrôleurs, posées au fil de la pose écran par écran (étape 4, un propriétaire à la fois) :
    ///   D2  chaque entrée `Pose` du catalogue : son contrôleur appelle `DecorDeScene.Poser(…, DecorsDeScene.&lt;Entrée&gt;)` et
    ///       ne garde AUCUN fond plat sur la racine qu'il passe au décor ;
    ///   D3  aucun chiffre de décor dans un contrôleur posé : ni `"Scenes/…"`, ni `brightness` ;
    ///   D6b chaque recette de filets de l'écran est référencée (`Filets.&lt;Ecran&gt;.&lt;Nom&gt;`), hors `Cerne` (le décor la pose).
    /// Les écrans pas encore posés vivent dans `PoseEnAttente`, les recettes pas encore branchées dans `RecettesEnAttente` :
    /// deux DETTES DATÉES qui ne font que rétrécir (une entrée devenue fausse fait rougir — patron de la garde I1).</summary>
    [Category("DecorDeScene")]
    public class DecorDeScenePosePlayModeTests
    {
        /// <summary>DETTE DATÉE (08/10, CLIENT-2) : les entrées `Pose` dont le contrôleur n'appelle pas encore le décor. Elle
        /// rétrécit d'une entrée à chaque pose, avec le feu vert du propriétaire du contrôleur (CLIENT-1).</summary>
        internal static readonly HashSet<string> PoseEnAttente = new HashSet<string>
        {
            "③", "⑤", "㊲", "㉟", "㉓", "⑮", "⑰", "⑭", "㊴", "㊳", "㉒",   // ㊵ posé le 08/10 (feu vert CLIENT-1)
            "㊱", "㉜", "㉚", "㉘", "㉛", "㉝", "㉞", "㉙", "㉔", "⑱",
        };

        /// <summary>DETTE DATÉE : par écran POSÉ, les recettes de filets pas encore branchées, chacune avec sa raison. Ne fait
        /// que rétrécir.</summary>
        internal static readonly Dictionary<string, string[]> RecettesEnAttente = new Dictionary<string, string[]>
        {
            // ㊵ (08/10) — Elast, Et6, Et6Alerte, Cuve : la boîte, les étapes et leurs cuves sont CERNÉES par `PiedDEcran.Cerner`
            //   (CLIENT-1) ; elles passeront par la délégation Cerner → Filets que CLIENT-1 a acceptée après la fusion (noms
            //   `Cerne/Haut|Bas|Gauche|Droite` gardés). Cta6 : le geste du pied, stylé par `PiedDEcran` (CLIENT-1). Mano, MailFlou,
            //   MailTenu, N, N_2 : éléments de cadres d'état que le contrôleur ne construit pas (cadran, maillons, pastilles) —
            //   à classer au juge (A s'ils manquent au joueur, sinon C).
            { "㊵", new[] { "Cta6", "Cuve", "Elast", "Et6", "Et6Alerte", "MailFlou", "MailTenu", "Mano", "N", "N_2" } },
        };

        /// <summary>Recettes posées par le décor lui-même (le cerne A : `Decor/Cerne`), jamais par le contrôleur.</summary>
        private static readonly HashSet<string> PoseesParLeDecor = new HashSet<string> { "Cerne" };

        // ════════════════════════════════════════════════════════════════════════════ instruments (purs)

        private static readonly Regex Commentaires = new Regex(@"//[^\n]*|/\*.*?\*/", RegexOptions.Singleline | RegexOptions.Compiled);

        internal static string SansCommentaires(string src) => Commentaires.Replace(src, "");

        /// <summary>D2 : les défauts d'une source de contrôleur pour l'entrée `nom`. Vide = posé, sans fond plat. Pure.</summary>
        internal static List<string> DefautsDePose(string source, string nom)
        {
            string s = SansCommentaires(source);
            var d = new List<string>();
            Match m = Regex.Match(s, @"DecorDeScene\.Poser\(\s*(\w+)[^,]*,\s*(?:[\w.]*\.)?DecorsDeScene\.(\w+)\s*\)");
            if (!m.Success) { d.Add("n'appelle pas DecorDeScene.Poser(…, DecorsDeScene." + nom + ")"); return d; }
            if (m.Groups[2].Value != nom) d.Add($"pose DecorsDeScene.{m.Groups[2].Value} au lieu de {nom}");
            string racine = Regex.Escape(m.Groups[1].Value);
            if (Regex.IsMatch(s, @"AjouterFond\(\s*" + racine + @"\s*[,.)]"))
                d.Add($"garde un fond plat sur « {m.Groups[1].Value} », la racine passée au décor");
            if (Regex.IsMatch(s, racine + @"\s*\.\s*AddComponent<Image>"))
                d.Add($"ajoute une Image sur « {m.Groups[1].Value} », la racine passée au décor");
            return d;
        }

        /// <summary>D3 : les chiffres de décor qu'un contrôleur posé ne porte plus. Pure.</summary>
        internal static List<string> ChiffresDeDecor(string source)
        {
            string s = SansCommentaires(source);
            var d = new List<string>();
            if (s.Contains("\"Scenes/")) d.Add("un chemin \"Scenes/…\" (la scène est au catalogue)");
            if (Regex.IsMatch(s, @"\bbrightness\b", RegexOptions.IgnoreCase)) d.Add("une luminosité (au catalogue)");
            return d;
        }

        /// <summary>D6b : les recettes de `ecran` que la source ne référence pas. Pure.</summary>
        internal static List<string> RecettesOrphelines(string source, string ecran, IEnumerable<string> recettes)
        {
            string s = SansCommentaires(source);
            return recettes.Where(r => !PoseesParLeDecor.Contains(r)
                                       && !Regex.IsMatch(s, @"Filets\." + Regex.Escape(ecran) + @"\." + Regex.Escape(r) + @"\b"))
                           .OrderBy(r => r).ToList();
        }

        // ════════════════════════════════════════════════════════════════════════════ sources

        private static string NomDeChamp(SpecDecor s) =>
            typeof(DecorsDeScene).GetFields(BindingFlags.Public | BindingFlags.Static).First(f => f.GetValue(null) == s).Name;

        private static IEnumerable<string> RecettesDe(string champ)
        {
            System.Type t = typeof(DecorsDeScene.Filets).GetNestedType(champ, BindingFlags.Public | BindingFlags.Static);
            Assert.IsNotNull(t, $"DecorsDeScene.Filets.{champ} absent");
            return t.GetFields(BindingFlags.Public | BindingFlags.Static).Where(f => f.FieldType == typeof(SpecFilet[])).Select(f => f.Name);
        }

        /// <summary>La source du contrôleur d'une entrée : le fichier `&lt;Ecran&gt;.cs` sous `Assets/Scripts` ; pour ⑱, le corps
        /// de `AppShell.MonterMenuPlus`.</summary>
        private static string SourceDe(SpecDecor s)
        {
            string scripts = Path.Combine(Application.dataPath, "Scripts");
            if (s.Ecran == "AppShell.MonterMenuPlus")
            {
                string app = File.ReadAllText(Directory.GetFiles(scripts, "AppShell.cs", SearchOption.AllDirectories).Single());
                int i = app.IndexOf("void MonterMenuPlus(", System.StringComparison.Ordinal);
                Assert.GreaterOrEqual(i, 0, "AppShell.MonterMenuPlus introuvable");
                int j = app.IndexOf("\n        }\n", i, System.StringComparison.Ordinal);
                return app.Substring(i, (j > i ? j : app.Length) - i);
            }
            string[] f = Directory.GetFiles(scripts, s.Ecran + ".cs", SearchOption.AllDirectories);
            Assert.AreEqual(1, f.Length, $"{s.Symbole} : {f.Length} fichier(s) {s.Ecran}.cs");
            return File.ReadAllText(f[0]);
        }

        // ════════════════════════════════════════════════════════════════════════════ gardes

        [Test]
        public void D2_D3_D6b_ControlesPositifs()
        {
            const string bon = "var d = DecorDeScene.Poser(racine.transform, DecorsDeScene.Filiere);\nFilets.Poser(c, DecorsDeScene.Filets.Filiere.Fen);";
            Assert.IsEmpty(DefautsDePose(bon, "Filiere"));
            StringAssert.Contains("n'appelle pas", DefautsDePose("// DecorDeScene.Poser(racine.transform, DecorsDeScene.Filiere);", "Filiere")[0],
                "un appel en COMMENTAIRE ne compte pas");
            StringAssert.Contains("au lieu de", DefautsDePose(bon, "Journal")[0], "la mauvaise entrée est vue");
            StringAssert.Contains("fond plat", DefautsDePose(bon + "\nAjouterFond(racine, DesignTokens.Current.surfaceBase);", "Filiere")[0]);
            Assert.IsEmpty(DefautsDePose(bon + "\nAjouterFond(chaine, DesignTokens.Current.surfaceBase);", "Filiere"), "un fond d'un AUTRE bloc est permis");
            Assert.AreEqual(2, ChiffresDeDecor("Resources.Load(\"Scenes/x\"); float brightness = .2f;").Count);
            Assert.IsEmpty(ChiffresDeDecor("// \"Scenes/x\" brightness"), "les commentaires ne comptent pas");
            CollectionAssert.AreEqual(new[] { "Pann" }, RecettesOrphelines(bon, "Filiere", new[] { "Fen", "Pann", "Cerne" }),
                "la recette non référencée est vue ; Cerne (posée par le décor) ne l'est pas");
        }

        [Test]
        public void D2_ChaqueEntreePoseeAppelleLeDecor_SansFondPlat_EtLaDetteNeFaitQueRetrecir()
        {
            var echecs = new List<string>();
            var perimees = new List<string>();
            foreach (SpecDecor s in DecorsDeScene.Tous.Where(e => e.Statut == StatutDecor.Pose))
            {
                List<string> d = DefautsDePose(SourceDe(s), NomDeChamp(s));
                if (PoseEnAttente.Contains(s.Symbole)) { if (d.Count == 0) perimees.Add(s.Symbole); continue; }
                foreach (string x in d) echecs.Add($"{s.Symbole} {s.Ecran} : {x}");
            }
            Assert.IsEmpty(echecs, string.Join("\n", echecs));
            Assert.IsEmpty(perimees, $"posé(s), à RETIRER de PoseEnAttente : [{string.Join(", ", perimees)}]");
            Assert.IsTrue(PoseEnAttente.All(p => DecorsDeScene.Tous.Any(e => e.Symbole == p && e.Statut == StatutDecor.Pose)),
                "PoseEnAttente ne nomme que des entrées Pose du catalogue");
        }

        [Test]
        public void D3_AucunChiffreDeDecorDansUnControleurPose()
        {
            var echecs = new List<string>();
            foreach (SpecDecor s in DecorsDeScene.Tous.Where(e => e.Statut == StatutDecor.Pose && !PoseEnAttente.Contains(e.Symbole)))
                foreach (string x in ChiffresDeDecor(SourceDe(s))) echecs.Add($"{s.Symbole} {s.Ecran} : {x}");
            Assert.IsEmpty(echecs, string.Join("\n", echecs));
        }

        [Test]
        public void D6b_ChaqueControleurPoseReferenceChaqueRecetteDeSonEcran()
        {
            var echecs = new List<string>();
            var perimees = new List<string>();
            foreach (SpecDecor s in DecorsDeScene.Tous.Where(e => e.Statut == StatutDecor.Pose && !PoseEnAttente.Contains(e.Symbole)))
            {
                string champ = NomDeChamp(s);
                List<string> orphelines = RecettesOrphelines(SourceDe(s), champ, RecettesDe(champ));
                RecettesEnAttente.TryGetValue(s.Symbole, out string[] attente);
                attente = attente ?? new string[0];
                foreach (string o in orphelines.Except(attente)) echecs.Add($"{s.Symbole} {champ}.{o} : recette mesurée jamais posée");
                foreach (string a in attente.Except(orphelines)) perimees.Add($"{s.Symbole} {champ}.{a}");
            }
            Assert.IsEmpty(echecs, string.Join("\n", echecs));
            Assert.IsEmpty(perimees, $"branchée(s), à RETIRER de RecettesEnAttente : [{string.Join(", ", perimees)}]");
        }
    }
}
