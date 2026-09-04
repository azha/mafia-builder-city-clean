using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine.Networking;

namespace MafiaCleanCity.I18n
{
    /// <summary>`GET /v1/i18n/bundle` — enveloppe `payload.data.{locale, messages}`, mesurée sur
    /// le compte de démo le 2026-09-02 (200, 67 clés).
    ///
    /// ⛔ `JsonUtility` NE SAIT PAS lire `messages` ni `params` : ce sont des objets à CLÉS
    /// ARBITRAIRES, pas des champs. D'où le petit lecteur ci-dessous plutôt qu'un DTO — et pas
    /// une dépendance Newtonsoft : elle est bien dans le cache de paquets, mais aucun fichier de
    /// `Assets/Scripts` ne la référence (mesuré), donc l'introduire ici toucherait les
    /// assemblages pour tout le monde.</summary>
    public class I18nClient
    {
        public string BaseUrl = "http://localhost";

        // ⛔⛔ LE PARAMÈTRE `?locale=` EST LA SEULE CHOSE QUI DÉCIDE DE LA LANGUE — mesuré le
        //    2026-09-04, et ça RÉFUTE ce que trois sessions croyaient ce matin. `i18n.controller.ts`
        //    est PUBLIC et ne lit QUE `@Query('locale')` : `normalizeLocale(undefined)` rend
        //    `CANONICAL_LOCALE` = `en`. Le jeton n'est même pas regardé. ⇒ la colonne
        //    `player.locale` n'a AUCUN effet sur ce bundle : mis `operational_demo` à `fr` en base,
        //    puis re-signé et redemandé — le corps revient encore `locale=en`, `accueil.etat.broke`
        //    = « Broke ». *Corriger le compte ne corrige rien ici ; c'est cette ligne qui décide.*
        // ⇒ Un producteur, une valeur. Le jeu est en français (ruling fiction 2026-09-02).
        public string Locale = "fr";

        public IEnumerator GetBundle(string token,
                                     Action<string, Dictionary<string, string>> onSuccess,
                                     Action<long, string> onError)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(BaseUrl + "/v1/i18n/bundle?locale=" + Locale))
            {
                if (!string.IsNullOrEmpty(token)) req.SetRequestHeader("Authorization", "Bearer " + token);
                yield return req.SendWebRequest();

                // ⛔ LE CODE D'ABORD. Un corps d'erreur a la même forme qu'un corps vide : deux
                // instruments de ce dépôt ont enregistré un 404 comme « données vides », à une
                // semaine d'écart.
                if (req.responseCode != 200)
                {
                    onError?.Invoke(req.responseCode, req.error ?? "code inattendu");
                    yield break;
                }

                string corps = req.downloadHandler.text;
                string locale = LecteurJson.Chaine(corps, "locale");
                Dictionary<string, string> messages = LecteurJson.Objet(corps, "messages");
                if (messages == null)
                {
                    onError?.Invoke(200, "corps sans `messages` — bundle illisible");
                    yield break;
                }
                // ⛔ LA LANGUE SERVIE DOIT ÊTRE CELLE DEMANDÉE — sinon on préfère PAS DE BUNDLE.
                //    `normalizeLocale` rabat toute valeur inconnue sur `en` SANS ERREUR : un jour où
                //    ce paramètre disparaît, où il est mal orthographié, ou où le back retire `fr`,
                //    la réponse est un 200 parfaitement valide qui sert 570 littéraux ANGLAIS — et
                //    ils ÉCRASENT les replis français de `Libelle.De`. Le mode dégradé qu'on veut est
                //    l'inverse : catalogue vide ⇒ chaque écran rend son littéral français. C'est donc
                //    une panne, et elle est bruyante.
                if (!string.Equals(locale, Locale, StringComparison.Ordinal))
                {
                    onError?.Invoke(200, "langue servie `" + locale + "` != demandée `" + Locale
                                         + "` — bundle refusé, les écrans gardent leurs libellés");
                    yield break;
                }
                onSuccess?.Invoke(locale, messages);
            }
        }
    }

    /// <summary>Lecture minimale d'objets JSON à clés arbitraires. Volontairement réduit à ce
    /// dont ce client a besoin — un objet plat de chaînes, repéré par le nom de son champ.
    /// ⚠️ Ne prétend pas être un parseur JSON : il gère les échappements `\\" \\\\ \\n \\t \\uXXXX`
    /// et l'imbrication d'accolades, et rien d'autre. S'il rencontre autre chose, il rend `null`
    /// et l'appelant traite ça comme une panne — jamais comme un bundle vide.</summary>
    internal static class LecteurJson
    {
        internal static string Chaine(string json, string champ)
        {
            int i = IndexApresChamp(json, champ);
            if (i < 0) return null;
            while (i < json.Length && char.IsWhiteSpace(json[i])) i++;
            if (i >= json.Length || json[i] != '"') return null;
            int fin;
            return LireChaine(json, i, out fin);
        }

        internal static Dictionary<string, string> Objet(string json, string champ)
        {
            int i = IndexApresChamp(json, champ);
            if (i < 0) return null;
            while (i < json.Length && char.IsWhiteSpace(json[i])) i++;
            if (i >= json.Length || json[i] != '{') return null;

            var res = new Dictionary<string, string>();
            i++;
            while (i < json.Length)
            {
                while (i < json.Length && (char.IsWhiteSpace(json[i]) || json[i] == ',')) i++;
                if (i < json.Length && json[i] == '}') return res;
                if (i >= json.Length || json[i] != '"') return null;

                int fin;
                string cle = LireChaine(json, i, out fin);
                if (cle == null) return null;
                i = fin;
                while (i < json.Length && char.IsWhiteSpace(json[i])) i++;
                if (i >= json.Length || json[i] != ':') return null;
                i++;
                while (i < json.Length && char.IsWhiteSpace(json[i])) i++;
                if (i >= json.Length || json[i] != '"') return null;

                string val = LireChaine(json, i, out fin);
                if (val == null) return null;
                res[cle] = val;
                i = fin;
            }
            return null;
        }

        private static int IndexApresChamp(string json, string champ)
        {
            string motif = "\"" + champ + "\"";
            int i = json.IndexOf(motif, StringComparison.Ordinal);
            if (i < 0) return -1;
            i += motif.Length;
            while (i < json.Length && char.IsWhiteSpace(json[i])) i++;
            if (i >= json.Length || json[i] != ':') return -1;
            return i + 1;
        }

        /// <summary>Lit la chaîne qui commence au guillemet `debut`; `fin` sort APRÈS le
        /// guillemet fermant.</summary>
        private static string LireChaine(string s, int debut, out int fin)
        {
            fin = debut;
            var sb = new System.Text.StringBuilder();
            int i = debut + 1;
            while (i < s.Length)
            {
                char c = s[i];
                if (c == '\\')
                {
                    if (i + 1 >= s.Length) return null;
                    char e = s[i + 1];
                    switch (e)
                    {
                        case '"': sb.Append('"'); i += 2; break;
                        case '\\': sb.Append('\\'); i += 2; break;
                        case '/': sb.Append('/'); i += 2; break;
                        case 'n': sb.Append('\n'); i += 2; break;
                        case 't': sb.Append('\t'); i += 2; break;
                        case 'r': sb.Append('\r'); i += 2; break;
                        case 'b': sb.Append('\b'); i += 2; break;
                        case 'f': sb.Append('\f'); i += 2; break;
                        case 'u':
                            if (i + 5 >= s.Length) return null;
                            int cp;
                            if (!int.TryParse(s.Substring(i + 2, 4),
                                              System.Globalization.NumberStyles.HexNumber,
                                              System.Globalization.CultureInfo.InvariantCulture, out cp))
                                return null;
                            sb.Append((char)cp); i += 6; break;
                        default: return null;
                    }
                    continue;
                }
                if (c == '"') { fin = i + 1; return sb.ToString(); }
                sb.Append(c); i++;
            }
            return null;
        }
    }
}
