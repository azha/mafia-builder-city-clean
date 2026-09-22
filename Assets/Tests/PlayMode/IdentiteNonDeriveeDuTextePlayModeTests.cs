using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;

namespace MafiaCleanCity.Tests
{
    /// <summary>⛔ UN NOM D'OBJET NE DÉRIVE JAMAIS D'UN TEXTE AFFICHÉ — mesuré le 2026-09-22 (gate client, partie 1).
    ///
    /// `DashboardController.AddNavButton` nommait son bouton `"Nav_" + libellé` : quand le lot D a traduit « City Map » en
    /// « La carte », le bouton s'est renommé `Nav_Lacarte`, et `BLOQUANT2` (qui clique `Nav_CityMap`, la convention
    /// `Nav_{target}` d'IShellNavigator) a rougi. *Une traduction avait changé une identité.* Et ce n'était pas un site : le
    /// balayage des fichiers du jour en a trouvé 17 (lignes, boutons, cartes nommés d'après leur libellé ou le slug de leur
    /// littéral), plus le menu Plus (`MenuPlus_{libelle}`) — tous passés à un `idStable` séparé du libellé.
    ///
    /// La garde lit TOUT `Assets/Scripts` : pour chaque construction d'objet nommé (`NewUI`, `NouveauUI`, `NewText`,
    /// `NouveauTexte`, `NewButton`, `new GameObject`), si le NOM est composé (`+` ou `$"…{…}"`) et que sa partie calculée nomme
    /// un texte (`label`, `libelle`, `titre`, `texte`, `caption`, `…Litteral`) ou appelle un résolveur de texte (`Lib`, `Cle`,
    /// `Bande`, `Libelle.De/Slug/ParValeur`), c'est une identité qui changera au prochain lot de copie.
    /// ⚠️ Ce qu'elle ne voit pas : une identité dérivée d'un texte par un autre chemin (clé de dictionnaire, `Find` sur un texte,
    /// comparaison de libellé) — balayés le même jour, 0 site ; ils restent à la charge d'un balayage, pas de cette garde.</summary>
    [Category("I18n")]
    public class IdentiteNonDeriveeDuTexteTests
    {
        private static readonly Regex Appel = new Regex(@"(?:NewUI|NouveauUI|NewText|NouveauTexte|NewButton|new\s+GameObject)\(\s*");
        private static readonly Regex Textuel = new Regex(
            @"(?i)\b\w*(label|libelle|titre|texte|caption|litteral)\w*\b|\b(?:Lib|Cle|Bande|Libelle\.(?:De|Slug|ParValeur))\(");
        private static readonly Regex Litteral = new Regex(@"""(?:[^""\\]|\\.)*""");
        private static readonly Regex Trou = new Regex(@"\{([^}]*)\}");

        /// <summary>Retire commentaires `//` et `/* */` hors chaînes (les sauts de ligne sont gardés, pour les numéros).</summary>
        internal static string SansCommentaires(string t)
        {
            var o = new StringBuilder(t.Length);
            int i = 0, n = t.Length;
            while (i < n)
            {
                char c = t[i], d = i + 1 < n ? t[i + 1] : '\0';
                if (c == '/' && d == '/') { while (i < n && t[i] != '\n') i++; continue; }
                if (c == '/' && d == '*')
                {
                    i += 2;
                    while (i < n && !(t[i] == '*' && i + 1 < n && t[i + 1] == '/')) { if (t[i] == '\n') o.Append('\n'); i++; }
                    i += 2; continue;
                }
                if (c == '"')
                {
                    o.Append(c); i++;
                    while (i < n && t[i] != '"' && t[i] != '\n') { if (t[i] == '\\' && i + 1 < n) { o.Append(t[i]); i++; } o.Append(t[i]); i++; }
                    if (i < n) { o.Append(t[i]); i++; }
                    continue;
                }
                if (c == '\'')
                {
                    o.Append(c); i++;
                    while (i < n && t[i] != '\'' && t[i] != '\n') { if (t[i] == '\\' && i + 1 < n) { o.Append(t[i]); i++; } o.Append(t[i]); i++; }
                    if (i < n) { o.Append(t[i]); i++; }
                    continue;
                }
                o.Append(c); i++;
            }
            return o.ToString();
        }

        /// <summary>Le premier argument d'un appel, à partir de l'index qui suit la parenthèse ouvrante.</summary>
        private static string PremierArgument(string t, int i)
        {
            int prof = 0, j = i; bool chaine = false;
            while (j < t.Length)
            {
                char c = t[j];
                if (chaine) { if (c == '\\') { j += 2; continue; } if (c == '"') chaine = false; }
                else if (c == '"') chaine = true;
                else if (c == '(' || c == '[' || c == '{') prof++;
                else if (c == ')' || c == ']' || c == '}') { if (prof == 0) return t.Substring(i, j - i); prof--; }
                else if (c == ',' && prof == 0) return t.Substring(i, j - i);
                j++;
            }
            return t.Substring(i);
        }

        /// <summary>Les constructions d'objet dont le NOM dérive d'un texte, dans une source ; `appels` compte TOUTES les constructions vues.</summary>
        internal static List<string> NomsDerivesDunTexte(string source, string fichier, ref int appels)
        {
            var fautes = new List<string>();
            string t = SansCommentaires(source);
            foreach (Match m in Appel.Matches(t))
            {
                appels++;
                string a = PremierArgument(t, m.Index + m.Length);
                bool interpole = a.TrimStart().StartsWith("$\"");
                if (!interpole && !a.Contains("+")) continue;
                string calcule = interpole ? string.Join(" ", ExtraireTrous(a)) : Litteral.Replace(a, "\"\"");
                if (!Textuel.IsMatch(calcule)) continue;
                int ligne = 1; for (int k = 0; k < m.Index; k++) if (t[k] == '\n') ligne++;
                fautes.Add($"{fichier}:{ligne}  {a.Trim()}");
            }
            return fautes;
        }

        private static IEnumerable<string> ExtraireTrous(string interpole)
        {
            foreach (Match m in Trou.Matches(interpole)) yield return m.Groups[1].Value;
        }

        [Test]
        public void ControlePositif_LaGardeMordSurLesFormesQuiOntCasse()
        {
            int appels = 0;
            // les formes RÉELLES d'avant le correctif du 22/09 — chacune doit être vue
            Assert.AreEqual(1, NomsDerivesDunTexte("GameObject btn = NewUI(\"Nav_\" + label.Replace(\" \", \"\"), parent);", "fab", ref appels).Count,
                "« Nav_ » + libellé (DashboardController.cs:696 avant correctif) doit être détecté");
            Assert.AreEqual(1, NomsDerivesDunTexte("GameObject e = new GameObject($\"MenuPlus_{libelle}\", typeof(RectTransform));", "fab", ref appels).Count,
                "un nom interpolé sur un libellé (AppShell, menu Plus) doit être détecté");
            Assert.AreEqual(1, NomsDerivesDunTexte("GameObject l = NouveauUI(\"Ligne_\" + Libelle.Slug(libelleLitteral), parent);", "fab", ref appels).Count,
                "le slug d'un littéral est un texte : il change quand l'atelier réécrit la copie");
            // et ce qui est SAIN ne doit pas l'être
            Assert.AreEqual(0, NomsDerivesDunTexte("GameObject btn = NewUI(\"Nav_\" + idStable, parent);", "fab", ref appels).Count,
                "un id stable n'est pas un texte");
            Assert.AreEqual(0, NomsDerivesDunTexte("GameObject r = NewUI(\"Row_\" + card.exception_id, rows);", "fab", ref appels).Count,
                "un id de donnée n'est pas un texte");
            Assert.AreEqual(0, NomsDerivesDunTexte("// GameObject btn = NewUI(\"Nav_\" + label, parent);", "fab", ref appels).Count,
                "un commentaire n'est pas du code");
            Assert.AreEqual(5, appels, "les six sources fabriquées portent cinq constructions (le commentaire n'en est pas une)");
        }

        [Test]
        public void AucunNomDObjet_NeDeriveDUnTexteAffiche()
        {
            string racine = Path.Combine(Application.dataPath, "Scripts");
            Assert.IsTrue(Directory.Exists(racine), $"racine introuvable : {racine}");
            int appels = 0, fichiers = 0;
            var fautes = new List<string>();
            foreach (string f in Directory.GetFiles(racine, "*.cs", SearchOption.AllDirectories))
            {
                fichiers++;
                fautes.AddRange(NomsDerivesDunTexte(File.ReadAllText(f), f.Substring(racine.Length + 1).Replace('\\', '/'), ref appels));
            }
            // PLANCHER : 885 constructions mesurées le 2026-09-22 ; un scan qui n'en voit presque aucune n'a rien lu.
            Assert.GreaterOrEqual(appels, 500, $"seulement {appels} construction(s) vue(s) dans {fichiers} fichier(s) — le scan n'a rien lu, son zéro ne vaut rien");
            Assert.IsEmpty(fautes, "des noms d'objet dérivent d'un texte affiché (une traduction les renommerait) : passer un id stable séparé du libellé —\n  "
                                   + string.Join("\n  ", fautes));
        }
    }
}
