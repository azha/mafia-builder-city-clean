using System.Collections.Generic;
using System.Text.RegularExpressions;

namespace MafiaCleanCity.Mouvements.Tests
{
    /// <summary>
    /// CLIENT-3 / E2a — le lecteur de SOURCE de G10 (design §10) : les méthodes `Update` / `LateUpdate` / `FixedUpdate` et les
    /// coroutines (`IEnumerator`) d'un fichier, avec leur corps, et les ÉCRITURES VISUELLES (couleur, alpha, rotation, échelle,
    /// position) de ce corps. Pur (BCL seule) : il lit un TEXTE, la garde l'applique aux vrais fichiers et à des textes fautifs
    /// (contrôles négatifs). Commentaires retirés et chaînes ignorées par le masque de `LitterauxNommesPlayModeTests.SansCommentaires`.
    /// ⚠️ Ce qu'il ne voit pas : une écriture visuelle faite par une méthode APPELÉE depuis le corps (`LaSuitePanelController.LateUpdate`
    /// → `Ajuster()` → `localScale`) — c'est pourquoi les `Update`/`LateUpdate` sont d'abord INVENTORIÉS (liste fermée, exacte).
    /// </summary>
    internal static class ScannerMouvement
    {
        internal sealed class Methode
        {
            public string Nom;
            public bool Coroutine;
            public string Corps;
        }

        private static readonly Regex Declaration = new Regex(
            @"(?<![\w.])(?:void\s+(?<nu>Update|LateUpdate|FixedUpdate)\s*\(\s*\)|IEnumerator(?:<[^<>]*>)?\s+(?<ne>\w+)\s*\()");

        // `.color = …`, `.alpha += …`, `.localScale = …` (le point : un accès à un membre, jamais une variable locale du même nom)
        private static readonly Regex Ecriture = new Regex(
            @"\.(?:color|alpha|fillAmount|localEulerAngles|localScale|localRotation|localPosition|anchoredPosition3D|anchoredPosition|eulerAngles|position|rotation)\s*(?:[-+*/]|\?\?)?=(?!=)"
            + @"|\.(?:Rotate|Translate|SetPositionAndRotation)\s*\(");

        internal static List<Methode> Methodes(string source)
        {
            var chaines = new List<(int debut, int fin)>();
            string t = MafiaCleanCity.CityMap.Tests.LitterauxNommesPlayModeTests.SansCommentaires(source, chaines);
            var dansChaine = new bool[t.Length + 1];
            foreach ((int debut, int fin) in chaines)
                for (int i = debut; i < fin && i < t.Length; i++) dansChaine[i] = true;

            // le texte des CHAÎNES est blanchi (guillemets gardés) : `Debug.Log("x.color = 3")` n'est pas une écriture visuelle
            char[] nu = t.ToCharArray();
            for (int i = 0; i < nu.Length; i++) if (dansChaine[i] && nu[i] != '\n' && nu[i] != '"') nu[i] = ' ';
            t = new string(nu);

            var res = new List<Methode>();
            foreach (Match m in Declaration.Matches(t))
            {
                if (dansChaine[m.Index]) continue;
                bool coroutine = m.Groups["ne"].Success;
                string nom = coroutine ? m.Groups["ne"].Value : m.Groups["nu"].Value;
                int i = m.Index + m.Length;
                if (coroutine) i = ApresLaParenthese(t, i, dansChaine);
                while (i < t.Length && char.IsWhiteSpace(t[i])) i++;
                string corps;
                if (i + 1 < t.Length && t[i] == '=' && t[i + 1] == '>') corps = JusquAuPointVirgule(t, i + 2, dansChaine);
                else if (i < t.Length && t[i] == '{') corps = EntreAccolades(t, i, dansChaine);
                else continue;   // une déclaration sans corps (interface, abstraite)
                res.Add(new Methode { Nom = nom, Coroutine = coroutine, Corps = corps });
            }
            return res;
        }

        /// <summary>Les écritures visuelles d'un corps de méthode (le texte de chaque site).</summary>
        internal static List<string> EcrituresVisuelles(string corps)
        {
            var res = new List<string>();
            foreach (Match m in Ecriture.Matches(corps)) res.Add(m.Value.Trim());
            return res;
        }

        /// <summary>Un littéral de caractère (`'{'`, `'\n'`) commence en `i` : sa longueur, sinon 0.</summary>
        private static int Caractere(string t, int i)
        {
            if (t[i] != '\'') return 0;
            if (i + 2 < t.Length && t[i + 2] == '\'' && t[i + 1] != '\\') return 3;
            if (i + 3 < t.Length && t[i + 1] == '\\' && t[i + 3] == '\'') return 4;
            return 0;
        }

        /// <summary>L'index qui suit la `)` fermant la parenthèse ouverte juste avant `i`.</summary>
        private static int ApresLaParenthese(string t, int i, bool[] dansChaine)
        {
            int prof = 1;
            while (i < t.Length)
            {
                int c = dansChaine[i] ? 0 : Caractere(t, i);
                if (c > 0) { i += c; continue; }
                if (!dansChaine[i])
                {
                    if (t[i] == '(') prof++;
                    else if (t[i] == ')' && --prof == 0) return i + 1;
                }
                i++;
            }
            return t.Length;
        }

        /// <summary>Le texte entre l'accolade ouvrante en `debut` et son accolade fermante (accolades non comprises).</summary>
        private static string EntreAccolades(string t, int debut, bool[] dansChaine)
        {
            int prof = 0, i = debut;
            while (i < t.Length)
            {
                int c = dansChaine[i] ? 0 : Caractere(t, i);
                if (c > 0) { i += c; continue; }
                if (!dansChaine[i])
                {
                    if (t[i] == '{') prof++;
                    else if (t[i] == '}' && --prof == 0) return t.Substring(debut + 1, i - debut - 1);
                }
                i++;
            }
            return t.Substring(debut + 1);
        }

        /// <summary>Un corps `=> expression;` : jusqu'au `;` hors parenthèses, crochets, accolades et chaînes.</summary>
        private static string JusquAuPointVirgule(string t, int debut, bool[] dansChaine)
        {
            int prof = 0, i = debut;
            while (i < t.Length)
            {
                int c = dansChaine[i] ? 0 : Caractere(t, i);
                if (c > 0) { i += c; continue; }
                if (!dansChaine[i])
                {
                    if (t[i] == '(' || t[i] == '[' || t[i] == '{') prof++;
                    else if (t[i] == ')' || t[i] == ']' || t[i] == '}') prof--;
                    else if (t[i] == ';' && prof <= 0) return t.Substring(debut, i - debut);
                }
                i++;
            }
            return t.Substring(debut);
        }
    }
}
