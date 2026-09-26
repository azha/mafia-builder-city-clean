using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;

namespace MafiaCleanCity.Operational.Tests
{
    // AUCUN REFUS MONTRÉ AU JOUEUR NE PASSE PAR LE MESSAGE DE DÉVELOPPEUR (garde de CLASSE, f2 2026-09-26, après la table 67).
    // Un refus se dit par `RefusServi` (clé et trous servis : `client.DernierePhraseDeRefus`), sinon par la phrase de l'écran.
    // Le `message` qu'un client passe à son onErr est TECHNIQUE (log, crochet de test) : il n'entre JAMAIS dans un texte joueur.
    //   M1  contrôle positif sur une source fabriquée : les trois formes d'avant sont VUES (champ affiché ailleurs, concaténé à
    //       un libellé, passé à une méthode d'affichage) ; la forme juste ne l'est pas (lue par un appel, testée en nullité)
    //   M2  l'arbre des scripts : zéro site. Mesuré avant le branchement par le portage
    //       `Tools/juge-donnees/i18n/message-dev-vers-tmp.py` : 24 sites sur 8 écrans (Autonomy, ExceptionDetail, Lieutenant,
    //       ChaineDAppro, Distribution, Loi ; Selling = faux positif de l'ordre, levé par une locale)
    //
    // LA RÈGLE, statique, par fichier (hors `*Client.cs` qui PRODUIT le message) :
    //   graine      le DERNIER paramètre d'une lambda `(code|c|http|status, [x,] m) =>` argument d'un appel `…client….Methode(`
    //   portée      par MEMBRE ; un nom déclaré au niveau de la classe (champ, propriété) porteur dans un membre l'est partout
    //   propagation `X = expr` / `X ??= expr` si expr CITE un porteur hors des arguments d'un appel (un appel rend autre chose que
    //               le message : `ClasserRefus(code, msg)`) ; un porteur passé à une méthode du même fichier rend porteur le
    //               paramètre de même rang
    //   puits       `.text =`, `NewText(`, `Texte(`, `SetText(`, `SetOutcome(`, `RenderDiagnostics(` jusqu'au `;` ; un porteur
    //               cité seulement en test de nullité ne compte pas
    // ⚠️ Limite écrite : insensible à l'ordre des instructions — réaffecter un porteur ne le blanchit pas ; on écrit alors la
    //   phrase affichée dans une LOCALE (Selling, `Collecter`).
    [Category("EcranFile")]
    public class MessageDeDevHorsTmpPlayModeTests
    {
        private static readonly Regex Lambda =
            new Regex(@"\(\s*(?:code|c|http|status)\s*,\s*(?:(\w+)\s*,\s*)?(\w+)\s*\)\s*=>", RegexOptions.Compiled);
        private static readonly Regex AppelClient = new Regex(@"\b\w*[Cc]lient\w*\s*\.\s*\w+\s*\($", RegexOptions.Compiled);
        private static readonly Regex Affect = new Regex(@"\b([A-Za-z_]\w*)\s*(?:\?\?)?=(?![=>])", RegexOptions.Compiled);
        private static readonly Regex Puits =
            new Regex(@"(\.text\s*=(?!=)|\bNewText\(|\bTexte\(|\bSetText\(|\bSetOutcome\(|\bRenderDiagnostics\()", RegexOptions.Compiled);
        private static readonly Regex Decl = new Regex(@"\b[\w<>\[\],.?]+\s+(\w+)\s*(?:[;={]|=>)", RegexOptions.Compiled);
        private static readonly Regex Appel = new Regex(@"\b\w+\s*\(", RegexOptions.Compiled);
        private static readonly Regex MotCle =
            new Regex(@"^(if|while|for|foreach|switch|return|catch|using|lock|nameof|typeof)\b", RegexOptions.Compiled);
        private static readonly Regex AppelNomme = new Regex(@"(?<![\w.])(\w+)\s*\(", RegexOptions.Compiled);
        private static readonly Regex Signature =
            new Regex(@"(\w+)\s*\(([^()]*)\)\s*(?:where[^{]*)?$", RegexOptions.Compiled);
        private static readonly string[] Nullite =
        {
            @"string\.IsNullOrEmpty\(\s*{n}\s*\)", @"string\.IsNullOrWhiteSpace\(\s*{n}\s*\)",
            @"(?<![\w.]){n}\s*[!=]=\s*null", @"null\s*[!=]=\s*{n}\b",
        };

        private static string Blanchir(string s, string motif, RegexOptions o = RegexOptions.None) =>
            Regex.Replace(s, motif, m => Regex.Replace(m.Value, @"[^\n]", " "), o);

        /// <summary>Commentaires blanchis (lignes gardées) ; `nu` a en plus ses chaînes et caractères vidés, longueurs gardées.</summary>
        private static void Nettoyer(string source, out string s, out string nu)
        {
            s = Blanchir(source, @"/\*.*?\*/", RegexOptions.Singleline);
            s = Blanchir(s, @"//[^\n]*");
            nu = Blanchir(s, @"@""(?:""""|[^""])*""");
            nu = Regex.Replace(nu, @"""(?:\\.|[^""\\\n])*""", m => "\"" + new string(' ', m.Length - 2) + "\"");
            nu = Regex.Replace(nu, @"'(?:\\.|[^'\\\n])'", m => "'" + new string(' ', m.Length - 2) + "'");
        }

        private static int FinExpression(string nu, int i)
        {
            int prof = 0, k = i;
            for (; k < nu.Length; k++)
            {
                char c = nu[k];
                if (c == '(' || c == '[' || c == '{') prof++;
                else if (c == ')' || c == ']' || c == '}') { if (prof == 0) break; prof--; }
                else if ((c == ',' && prof == 0) || c == ';') break;
            }
            return k;
        }

        private static string SansArgumentsDAppel(string expr)
        {
            var o = new StringBuilder();
            int k = 0;
            while (k < expr.Length)
            {
                Match m = Appel.Match(expr, k);
                if (!m.Success) { o.Append(expr, k, expr.Length - k); break; }
                o.Append(expr, k, m.Index + m.Length - k);
                k = m.Index + m.Length;
                if (MotCle.IsMatch(m.Value)) continue;
                int prof = 1, j = k;
                while (j < expr.Length && prof > 0) { if (expr[j] == '(') prof++; else if (expr[j] == ')') prof--; j++; }
                o.Append(')');
                k = j;
            }
            return o.ToString();
        }

        /// <summary>Les blocs ouverts directement dans un corps de classe (membres), les plus hauts seulement.</summary>
        private static List<(int d, int f)> Membres(string nu)
        {
            var pile = new List<(int k, bool classe, bool parentClasse)>();
            var blocs = new List<(int d, int f)>();
            int dernier = 0;
            for (int k = 0; k < nu.Length; k++)
            {
                char c = nu[k];
                if (c == '{')
                {
                    bool classe = Regex.IsMatch(nu.Substring(dernier, k - dernier), @"\b(class|struct|interface|record)\b");
                    bool parent = pile.Count > 0 && pile[pile.Count - 1].classe;
                    pile.Add((k, classe, parent));
                    dernier = k + 1;
                }
                else if (c == '}')
                {
                    if (pile.Count > 0)
                    {
                        var b = pile[pile.Count - 1];
                        pile.RemoveAt(pile.Count - 1);
                        if (b.parentClasse && !b.classe) blocs.Add((b.k, k));
                    }
                    dernier = k + 1;
                }
                else if (c == ';') dernier = k + 1;
            }
            return blocs.Where(b => !blocs.Any(o => o.d < b.d && b.f <= o.f)).OrderBy(b => b.d).ToList();
        }

        private static HashSet<string> Champs(string nu, List<(int d, int f)> haut)
        {
            char[] masque = nu.ToCharArray();
            foreach (var (d, f) in haut) for (int k = d + 1; k < f; k++) masque[k] = ' ';
            return new HashSet<string>(Decl.Matches(new string(masque)).Cast<Match>().Select(m => m.Groups[1].Value));
        }

        private static (string nom, List<string> ps)? SignatureDe(string nu, int d)
        {
            int debut = new[] { nu.LastIndexOf(';', d - 1), nu.LastIndexOf('}', d - 1), nu.LastIndexOf('{', d - 1) }.Max();
            Match m = Signature.Match(nu.Substring(debut + 1, d - debut - 1));
            if (!m.Success) return null;
            var ps = new List<string>();
            foreach (string x in m.Groups[2].Value.Split(','))
            {
                if (x.Trim().Length == 0) continue;
                Match n = Regex.Match(x.Trim(), @"(\w+)\s*(?:=[^,]*)?$");
                ps.Add(n.Success ? n.Groups[1].Value : null);
            }
            return (m.Groups[1].Value, ps);
        }

        private static List<string> Arguments(string s, string nu, int i)
        {
            var o = new List<string>();
            int prof = 0, debut = i + 1;
            for (int k = i; k < nu.Length; k++)
            {
                char c = nu[k];
                if (c == '(' || c == '[' || c == '{') prof++;
                else if (c == ')' || c == ']' || c == '}') { prof--; if (prof == 0) { o.Add(s.Substring(debut, k - debut)); break; } }
                else if (c == ',' && prof == 1) { o.Add(s.Substring(debut, k - debut)); debut = k + 1; }
            }
            return o;
        }

        private static bool AppelClientEnglobant(string nu, int i)
        {
            int prof = 0;
            for (int k = i - 1; k >= 0; k--)
            {
                char c = nu[k];
                if (c == ')' || c == ']' || c == '}') prof++;
                else if (c == '(' || c == '[' || c == '{')
                {
                    if (prof == 0)
                    {
                        int d = System.Math.Max(0, k - 160);
                        return c == '(' && AppelClient.IsMatch(nu.Substring(d, k + 1 - d));
                    }
                    prof--;
                }
            }
            return false;
        }

        private static bool Cite(string nom, string expr) =>
            Regex.IsMatch(expr, @"(?<![\w.])" + Regex.Escape(nom) + @"\b");

        private static int Ligne(string s, int i) => s.Take(i).Count(c => c == '\n') + 1;

        /// <summary>Les puits (ligne) où un porteur du message de développeur entre dans un texte joueur.</summary>
        private static List<string> Violations(string source, string nomFichier)
        {
            Nettoyer(source, out string s, out string nu);
            List<(int d, int f)> haut = Membres(nu);
            HashSet<string> niveau = Champs(nu, haut);
            var sigs = new Dictionary<string, List<((int d, int f) m, List<string> ps)>>();
            foreach (var b in haut)
            {
                var sg = SignatureDe(nu, b.d);
                if (sg == null) continue;
                if (!sigs.TryGetValue(sg.Value.nom, out var l)) sigs[sg.Value.nom] = l = new List<((int, int), List<string>)>();
                l.Add((b, sg.Value.ps));
            }
            var champs = new HashSet<string>();
            var locaux = new Dictionary<(int, int), HashSet<string>>();
            var parametres = new Dictionary<(int, int), HashSet<string>>();
            for (int tour = 0; tour < 20; tour++)
            {
                int avant = champs.Count + parametres.Values.Sum(v => v.Count);
                foreach (var b in haut)
                {
                    var p = new HashSet<string>(champs);
                    if (parametres.TryGetValue(b, out var pp)) p.UnionWith(pp);
                    foreach (Match m in Lambda.Matches(nu.Substring(0, b.f)))
                        if (m.Index >= b.d && m.Groups[2].Value != "_" && AppelClientEnglobant(nu, m.Index)) p.Add(m.Groups[2].Value);
                    int n;
                    do
                    {
                        n = p.Count;
                        foreach (Match m in Affect.Matches(nu.Substring(0, b.f)))
                        {
                            if (m.Index < b.d || p.Contains(m.Groups[1].Value)) continue;
                            int fin = FinExpression(nu, m.Index + m.Length);
                            string expr = SansArgumentsDAppel(s.Substring(m.Index + m.Length, fin - m.Index - m.Length));
                            if (p.Any(x => Cite(x, expr))) p.Add(m.Groups[1].Value);
                        }
                    } while (p.Count != n);
                    locaux[b] = p;
                    champs.UnionWith(p.Where(niveau.Contains));
                    foreach (Match m in AppelNomme.Matches(nu.Substring(0, b.f)))
                    {
                        if (m.Index < b.d || !sigs.TryGetValue(m.Groups[1].Value, out var cibles)) continue;
                        List<string> args = Arguments(s, nu, m.Index + m.Length - 1);
                        for (int rang = 0; rang < args.Count; rang++)
                        {
                            string a = SansArgumentsDAppel(args[rang]);
                            if (!p.Any(x => Cite(x, a))) continue;
                            foreach (var (cible, noms) in cibles)
                            {
                                if (rang >= noms.Count || noms[rang] == null) continue;
                                if (!parametres.TryGetValue(cible, out var set)) parametres[cible] = set = new HashSet<string>();
                                set.Add(noms[rang]);
                            }
                        }
                    }
                }
                if (champs.Count + parametres.Values.Sum(v => v.Count) == avant) break;
            }
            var res = new List<string>();
            foreach (var b in haut)
            {
                var p = new HashSet<string>(locaux[b]);
                p.UnionWith(champs);
                if (parametres.TryGetValue(b, out var pp)) p.UnionWith(pp);
                if (p.Count == 0) continue;
                foreach (Match m in Puits.Matches(nu.Substring(0, b.f)))
                {
                    if (m.Index < b.d) continue;
                    int fin = nu.IndexOf(';', m.Index + m.Length);
                    int bout = fin >= 0 ? fin : b.f;
                    string stmt = s.Substring(m.Index + m.Length, bout - m.Index - m.Length);
                    stmt = m.Value.EndsWith("=") ? SansArgumentsDAppel(stmt) : SansArgumentsDAppel("(" + stmt).Substring(1);
                    foreach (string x in p)
                        foreach (string motif in Nullite)
                            stmt = Regex.Replace(stmt, motif.Replace("{n}", Regex.Escape(x)), "true");
                    var cites = p.Where(x => Cite(x, stmt)).OrderBy(x => x, System.StringComparer.Ordinal).ToList();
                    if (cites.Count > 0) res.Add($"{nomFichier}:{Ligne(s, m.Index)}  {string.Join(",", cites)}");
                }
            }
            return res;
        }

        [Test]
        public void M1_ControlePositif_LesFormesDAvantSontVues()
        {
            const string avant =
                "class T { string Err { get; set; }\n" +
                "  void A() { client.Get(t, d => {}, (code, msg) => Err = $\"{code}: {msg}\"); }\n" +
                "  void B() { lbl.text = Err; }\n" +
                "  void C() { string m = null; client.Post(t, () => {}, (c, x) => m = x); SetOutcome(Lib(\"Échec — \") + m, rouge); }\n" +
                "  void E() { string m = null; client.Post(t, () => {}, (c, x) => m = x); Apres(m); }\n" +
                "  void Apres(string raison) { lbl.text = raison ?? \"\"; }\n" +
                "}";
            List<string> vues = Violations(avant, "fabrique");
            CollectionAssert.AreEqual(new[] { "fabrique:3  Err", "fabrique:4  m", "fabrique:6  raison" }, vues,
                "contrôle positif : champ affiché ailleurs, concaténé à un libellé, passé à une méthode d'affichage");

            const string juste =
                "class T { string Err { get; set; } string Phrase { get; set; }\n" +
                "  void A() { client.Get(t, d => {}, (code, msg) => Err = msg); Phrase = client.DernierePhraseDeRefus ?? Lib(\"Non.\"); }\n" +
                "  void B() { lbl.text = Phrase; t2.text = Err == null ? \"a\" : \"b\"; SetOutcome(Mot(Classer(0, Err)), rouge); }\n" +
                "}";
            Assert.IsEmpty(Violations(juste, "fabrique"), "la phrase servie, un test de nullité, un appel qui classe : pas le message");
        }

        [Test]
        public void M2_AucunMessageDeDeveloppeur_DansUnTexteJoueur()
        {
            string racine = Path.Combine(Application.dataPath, "Scripts");
            var toutes = new List<string>();
            int lus = 0;
            foreach (string f in Directory.GetFiles(racine, "*.cs", SearchOption.AllDirectories))
            {
                if (f.EndsWith("Client.cs")) continue;   // le client PRODUIT le message ; la garde porte sur qui l'affiche
                string rel = f.Replace('\\', '/');
                lus++;
                toutes.AddRange(Violations(File.ReadAllText(f), rel.Substring(rel.IndexOf("Assets/"))));
            }
            Assert.Greater(lus, 100, "le balayage lit réellement l'arbre des scripts");
            Assert.IsEmpty(toutes,
                "un refus se dit par `client.DernierePhraseDeRefus` (RefusServi), sinon par la phrase de l'écran — jamais le " +
                "message d'onErr :\n" + string.Join("\n", toutes));
        }
    }
}
