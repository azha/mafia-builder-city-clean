using System.Collections;
using System.Collections.Generic;
using System.Text;
using UnityEngine;

namespace MafiaCleanCity.I18n
{
    /// <summary>Le résolveur i18n du client — socle, item 0.6.
    ///
    /// ⛔ CE QU'IL FAIT, ET LA SEULE CHOSE QU'IL PROMET : rendre le texte du serveur pour une
    /// clé, et **rendre la CLÉ BRUTE, visible, quand il ne l'a pas**. Jamais un texte inventé,
    /// jamais un libellé « plausible ». Un écran qui affiche `game.fiction.building.name` dit au
    /// lecteur exactement où est le trou ; un écran qui affiche « Laboratoire » lui ment sur
    /// l'état du jeu et personne ne rouvrira le sujet.
    ///
    /// ⚠️ MESURE DU 2026-09-02, à relire avant de se réjouir d'un vert. Le bundle réel
    /// (`GET /v1/i18n/bundle`, compte de démo) sert **67 clés : 63 `error.*` et 4 `game.*`**. Les
    /// clés que les écrans reçoivent VRAIMENT sont `game.fiction.building.name` (fiche bâtiment,
    /// avec params `type/district/block/rank`) et `onboarding.preseed_exception.card` (file
    /// d'exceptions). **Aucune des deux n'est dans le bundle.**
    /// ⇒ Le recouvrement entre « ce que le client demande » et « ce que le bundle sert » est de
    ///   ZÉRO. Ce résolveur est donc correct et, aujourd'hui, il ne résoudra rien : il montrera
    ///   des clés. C'est le résultat attendu, pas une panne — et c'est ce qui rendra le manque
    ///   visible à l'écran au lieu de le laisser dormir dans une mesure.
    /// ★ Le bundle sert 67 clés que personne ne demande, et ne sert aucune des deux qu'on
    ///   demande. Compter « 67 clés servies » aurait donné l'impression d'un socle en place.
    ///   Ce qui compte n'est pas le nombre servi, c'est le RECOUVREMENT.</summary>
    public static class I18nCatalog
    {
        // ⛔ « fr » RÉPOND 200 ET EST ANGLAIS À 94 % — mesuré par la session back le 2026-09-02 :
        // `?locale=fr` rend 67 clés dont **63 byte-identiques à l'anglais** ; seules les 4 `game.*`
        // sont vraiment traduites, et une locale inconnue retombe silencieusement sur « en ».
        // ⇒ Ne JAMAIS lire `Locale` comme « la langue est en place ». Une locale acceptée, un
        //   corps de taille voisine et un 200 ressemblent trait pour trait à un dictionnaire
        //   servi — c'est ce qui m'avait fait douter de mon cache plutôt que du bundle.
        // ★ Même famille que « 67 clés servies » : le signal disponible décrit une population
        //   qui n'est pas celle qu'on croit mesurer.

        private static readonly Dictionary<string, string> Messages = new Dictionary<string, string>();

        public static string Locale { get; private set; }
        public static bool Charge { get; private set; }
        /// <summary>Nombre de clés servies — un compte, jamais une preuve de couverture.</summary>
        public static int NbClesServies => Messages.Count;

        /// <summary>Cache par SESSION : le bundle ne change pas pendant une partie, et le
        /// recharger à chaque écran ferait dépendre l'affichage d'un aléa réseau.</summary>
        public static IEnumerator Amorcer(I18nClient client, string token)
        {
            if (Charge) yield break;
            yield return client.GetBundle(token,
                (locale, messages) =>
                {
                    Locale = locale;
                    Messages.Clear();
                    foreach (KeyValuePair<string, string> kv in messages) Messages[kv.Key] = kv.Value;
                    Charge = true;
                },
                (code, msg) => Debug.LogWarning(
                    $"[i18n] bundle indisponible ({code} {msg}) — les écrans afficheront leurs CLÉS. " +
                    "C'est le repli voulu : aucune traduction n'est fabriquée."));
        }

        /// <summary>Réinitialise — pour les tests, et pour un changement de compte.</summary>
        public static void Oublier()
        {
            Messages.Clear(); Charge = false; Locale = null;
        }

        /// <summary>Injecte un bundle sans réseau — RÉSERVÉ AUX TESTS. Ne prouve jamais que le
        /// serveur émet ces clés, seulement ce que le résolveur en fait.</summary>
        public static void ChargerPourTest(string locale, Dictionary<string, string> messages)
        {
            Oublier();
            Locale = locale;
            if (messages != null) foreach (KeyValuePair<string, string> kv in messages) Messages[kv.Key] = kv.Value;
            Charge = true;
        }

        /// <summary>La traduction, ou LA CLÉ. `cle` vide rend `""` — un écran qui n'a pas reçu de
        /// clé n'a rien à dire, et « — » serait déjà une interprétation.</summary>
        public static string Traduire(string cle, IDictionary<string, string> parametres = null)
        {
            if (string.IsNullOrEmpty(cle)) return string.Empty;
            string motif;
            if (!Messages.TryGetValue(cle, out motif) || motif == null) return cle;
            return IcuFormat.Formater(motif, parametres);
        }

        /// <summary>Vrai si la clé est réellement servie — pour qu'un écran puisse DIRE qu'il
        /// montre une clé plutôt que de laisser croire à un nom.</summary>
        public static bool Connait(string cle) =>
            !string.IsNullOrEmpty(cle) && Messages.ContainsKey(cle);
    }

    /// <summary>Le sous-ensemble d'ICU réellement présent dans le bundle mesuré : substitution
    /// simple `{nom}`, `plural` (`=0`, `one`, `other`, et `#`), et `select` (cas nommés +
    /// `other`). Rien de plus — et ce qui n'est pas compris est rendu TEL QUEL plutôt que
    /// deviné.
    ///
    /// ⚠️ Écrit parce que le bundle en contient : `game.lieutenant.assignment.summary` est un
    /// `plural`, `game.lieutenant.recap.actions_taken` un `select` de genre imbriquant un
    /// `plural`. Un résolveur qui ferait seulement `Replace("{x}", v)` rendrait ces deux clés
    /// comme une bouillie d'accolades — pire qu'une clé brute, parce que ça RESSEMBLE à du
    /// texte.</summary>
    public static class IcuFormat
    {
        public static string Formater(string motif, IDictionary<string, string> p)
        {
            if (string.IsNullOrEmpty(motif)) return motif;
            var sortie = new StringBuilder();
            int i = 0;
            while (i < motif.Length)
            {
                if (motif[i] != '{') { sortie.Append(motif[i]); i++; continue; }
                int fin = FinDuBloc(motif, i);
                if (fin < 0) { sortie.Append(motif[i]); i++; continue; }   // accolade non fermée : littérale
                sortie.Append(Resoudre(motif.Substring(i + 1, fin - i - 1), p));
                i = fin + 1;
            }
            return sortie.ToString();
        }

        /// <summary>Index de l'accolade fermante correspondante, en comptant les imbrications.
        /// Sans ce comptage, un `select` contenant un `plural` serait coupé à la première `}`.</summary>
        private static int FinDuBloc(string s, int debut)
        {
            int profondeur = 0;
            for (int i = debut; i < s.Length; i++)
            {
                if (s[i] == '{') profondeur++;
                else if (s[i] == '}') { profondeur--; if (profondeur == 0) return i; }
            }
            return -1;
        }

        private static string Resoudre(string corps, IDictionary<string, string> p)
        {
            int v1 = corps.IndexOf(',');
            if (v1 < 0)
            {
                string nom = corps.Trim();
                string val;
                // ⛔ Un paramètre absent rend `{nom}` TEL QUEL : le trou reste visible dans le
                // texte au lieu de devenir un blanc qu'on lira comme une phrase finie.
                return (p != null && p.TryGetValue(nom, out val) && val != null) ? val : "{" + nom + "}";
            }

            string arg = corps.Substring(0, v1).Trim();
            int v2 = corps.IndexOf(',', v1 + 1);
            if (v2 < 0) return "{" + corps + "}";
            string genre = corps.Substring(v1 + 1, v2 - v1 - 1).Trim();
            string cas = corps.Substring(v2 + 1);

            string valeur = null;
            if (p != null) p.TryGetValue(arg, out valeur);

            if (genre == "select") return Choisir(cas, valeur ?? "other", null, p);
            if (genre == "plural")
            {
                long n;
                if (!long.TryParse(valeur, out n)) return "{" + corps + "}";
                string choisi = "=" + n.ToString(System.Globalization.CultureInfo.InvariantCulture);
                return Choisir(cas, choisi, n, p);
            }
            return "{" + corps + "}";
        }

        /// <summary>Prend la branche nommée, sinon `one`/`other` selon la règle, sinon `other`.
        /// Rend `""` si même `other` manque — un motif mal formé ne doit pas inventer de texte.</summary>
        private static string Choisir(string cas, string exact, long? n, IDictionary<string, string> p)
        {
            var branches = new Dictionary<string, string>();
            int i = 0;
            while (i < cas.Length)
            {
                while (i < cas.Length && cas[i] != '{' && !char.IsLetterOrDigit(cas[i]) && cas[i] != '=') i++;
                int debutNom = i;
                while (i < cas.Length && cas[i] != '{') i++;
                if (i >= cas.Length) break;
                string nom = cas.Substring(debutNom, i - debutNom).Trim();
                int fin = FinDuBloc(cas, i);
                if (fin < 0) break;
                branches[nom] = cas.Substring(i + 1, fin - i - 1);
                i = fin + 1;
            }

            string corps;
            if (!branches.TryGetValue(exact, out corps))
            {
                if (n.HasValue && n.Value == 1 && branches.TryGetValue("one", out corps)) { }
                else if (!branches.TryGetValue("other", out corps)) return string.Empty;
            }
            string rendu = Formater(corps, p);
            return n.HasValue
                ? rendu.Replace("#", n.Value.ToString(System.Globalization.CultureInfo.InvariantCulture))
                : rendu;
        }
    }
}
