using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace MafiaCleanCity.I18n
{
    /// <summary>LES VARIABLES D'UN REFUS SERVI — `payload.error.payload_vars`, lues du corps brut, puis RÉSOLUES en mots (lot des refus,
    /// f2 2026-09-26).
    ///
    /// Le back sert une phrase de refus par clé (`user_facing_i18n_key`) et ses trous par `payload_vars`. Exemple convenu :
    /// `error.production.precursor_missing` avec `{ precursor_type: "pyralin", precursor_key: "building.precursor.pyralin" }` — la phrase
    /// porte `{precursor_type}`, qui doit recevoir le MOT (« la Pyraline »), jamais l'identifiant (`pyralin`).
    /// ⇒ LA FORME GÉNÉRALE : toute variable nommée `<racine>_key` porte une clé i18n SERVIE ; elle est résolue en mot par le catalogue
    ///   (`Libelle.Gabarit`, le repli compté), et ce mot est injecté dans le paramètre `<racine>`. Le client ne CONCATÈNE jamais une clé
    ///   lui-même : il ne lit que celle que le back a écrite. Une variable qui ne finit pas par `_key` passe telle quelle.
    /// ⚠️ `JsonUtility` ne lit pas un objet à clés libres : `Lire` est un petit lecteur d'objet PLAT (chaînes, nombres, booléens) ; une
    ///   valeur imbriquée (objet, tableau) est sautée, jamais devinée.</summary>
    public static class VariablesDeRefus
    {
        public const string SuffixeCle = "_key";

        /// <summary>`payload_vars` du corps d'erreur brut → dictionnaire (vide si absent ou illisible). Pur.</summary>
        public static Dictionary<string, string> Lire(string corps)
        {
            var vars = new Dictionary<string, string>();
            if (string.IsNullOrEmpty(corps)) return vars;
            int i = corps.IndexOf("\"payload_vars\"", System.StringComparison.Ordinal);
            if (i < 0) return vars;
            i = corps.IndexOf(':', i);
            if (i < 0) return vars;
            i = Blancs(corps, i + 1);
            if (i >= corps.Length || corps[i] != '{') return vars;
            i++;
            while (true)
            {
                i = Blancs(corps, i);
                if (i >= corps.Length || corps[i] == '}') return vars;
                if (corps[i] == ',') { i++; continue; }
                if (corps[i] != '"') return vars;
                string nom = Chaine(corps, ref i);
                if (nom == null) return vars;
                i = Blancs(corps, i);
                if (i >= corps.Length || corps[i] != ':') return vars;
                i = Blancs(corps, i + 1);
                if (i >= corps.Length) return vars;
                char c = corps[i];
                if (c == '"')
                {
                    string v = Chaine(corps, ref i);
                    if (v == null) return vars;
                    vars[nom] = v;
                }
                else if (c == '{' || c == '[')
                {
                    i = SauterImbrique(corps, i);   // non plat : sauté, jamais deviné
                    if (i < 0) return vars;
                }
                else
                {
                    int d = i;
                    while (i < corps.Length && corps[i] != ',' && corps[i] != '}' && !char.IsWhiteSpace(corps[i])) i++;
                    string brut = corps.Substring(d, i - d);
                    if (brut != "null") vars[nom] = brut;
                }
            }
        }

        /// <summary>La résolution : pour chaque `<racine>_key`, le mot servi de sa clé va dans `<racine>` (créé s'il manque). Sans mot
        /// servi, le repli est la valeur déjà présente dans `<racine>` (le back l'y a posée), sinon rien n'est écrit. Pur (lit le
        /// catalogue par `Libelle`).</summary>
        public static Dictionary<string, string> Resoudre(IDictionary<string, string> vars)
        {
            var r = new Dictionary<string, string>();
            if (vars == null) return r;
            foreach (KeyValuePair<string, string> kv in vars) r[kv.Key] = kv.Value;
            foreach (KeyValuePair<string, string> kv in vars)
            {
                if (!kv.Key.EndsWith(SuffixeCle, System.StringComparison.Ordinal) || kv.Key.Length == SuffixeCle.Length) continue;
                if (string.IsNullOrEmpty(kv.Value)) continue;
                string racine = kv.Key.Substring(0, kv.Key.Length - SuffixeCle.Length);
                vars.TryGetValue(racine, out string deja);
                string mot = Libelle.Gabarit(kv.Value, deja);
                if (!string.IsNullOrEmpty(mot)) r[racine] = mot;
            }
            return r;
        }

        private static int Blancs(string s, int i)
        {
            while (i < s.Length && char.IsWhiteSpace(s[i])) i++;
            return i;
        }

        /// <summary>Une chaîne JSON à partir de `i` (sur le guillemet ouvrant) ; `i` finit après le guillemet fermant. Null si mal formée.</summary>
        private static string Chaine(string s, ref int i)
        {
            var b = new StringBuilder();
            int k = i + 1;
            while (k < s.Length)
            {
                char c = s[k];
                if (c == '"') { i = k + 1; return b.ToString(); }
                if (c == '\\' && k + 1 < s.Length)
                {
                    char e = s[k + 1];
                    switch (e)
                    {
                        case 'n': b.Append('\n'); break;
                        case 't': b.Append('\t'); break;
                        case 'r': b.Append('\r'); break;
                        case 'b': b.Append('\b'); break;
                        case 'f': b.Append('\f'); break;
                        case 'u':
                            if (k + 5 < s.Length && int.TryParse(s.Substring(k + 2, 4), NumberStyles.HexNumber, CultureInfo.InvariantCulture, out int u))
                            { b.Append((char)u); k += 4; }
                            break;
                        default: b.Append(e); break;
                    }
                    k += 2;
                    continue;
                }
                b.Append(c);
                k++;
            }
            return null;
        }

        private static int SauterImbrique(string s, int i)
        {
            int profondeur = 0;
            for (int k = i; k < s.Length; k++)
            {
                char c = s[k];
                if (c == '"') { int j = k; if (Chaine(s, ref j) == null) return -1; k = j - 1; continue; }
                if (c == '{' || c == '[') profondeur++;
                else if (c == '}' || c == ']') { profondeur--; if (profondeur == 0) return k + 1; }
            }
            return -1;
        }
    }
}
