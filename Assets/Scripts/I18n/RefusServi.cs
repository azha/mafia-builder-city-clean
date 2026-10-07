using System.Text.RegularExpressions;

namespace MafiaCleanCity.I18n
{
    /// <summary>LA PHRASE D'UN REFUS SERVI, lue du corps d'erreur BRUT (table 67 des refus spécifiques, f2 2026-09-26).
    ///
    /// Le back sert, pour chaque refus, une clé (`payload.error.user_facing_i18n_key`) et ses trous (`payload_vars`). Le client n'a donc
    /// PAS à connaître les codes : il rend la phrase de la clé, trous remplis par `VariablesDeRefus` (tout `<racine>_key` résolu en mot).
    /// Quand le back servira un code neuf (17 de la table 67), la clé de l'enveloppe changera, et chaque écran qui passe par ICI dira la
    /// phrase neuve sans une ligne de client.
    /// ⚠️ `Phrase` rend NULL quand l'enveloppe ne porte pas de clé, ou que le bundle ne la sert pas (le repli est COMPTÉ par `Libelle`) :
    ///   l'appelant garde alors SA phrase d'avant. Jamais le `message` de développeur à la place d'une clé manquante.
    /// ⛔ ET NULL POUR UNE CLÉ GÉNÉRIQUE (alerte du suivi ⊥ de l'UX, §I @ 9e2a9346 ; f2 26/09). Le back ne sert encore AUCUNE clé
    ///   spécifique : il sert les clés de la couche protocole (`error.resource.state_conflict`, `error.validation.failed`…), dont la
    ///   phrase (« La situation a changé… Rechargez ») REMPLAÇAIT la phrase d'écran, plus juste — BLANCHIR et 4 autres gestes
    ///   régressaient. Une clé générique ne dit rien de plus que l'écran : l'écran garde sa phrase. Une clé spécifique (table 67)
    ///   passe devant dès que le back la sert.</summary>
    public static class RefusServi
    {
        /// <summary>Les familles GÉNÉRIQUES — mesurées dans le registre du back (`protocol/error-codes.ts`, « envelope, idempotency,
        /// versioning, generic infra ») : aucune ne nomme la cause d'un geste. Par FAMILLE, pas par clé : une clé générique ajoutée
        /// plus tard dans ces familles est couverte. Hors liste, et donc SERVIES : `error.auth.*` / `error.authz.*` (se reconnecter,
        /// un droit), `error.service.maintenance`, `error.client.build_too_old`, `error.api_version.sunset`, `error.payment.required`,
        /// et tous les codes de domaine (`error.core_loops.structural_cap_exhausted`, `error.demolition.*`…).</summary>
        public static readonly string[] FamillesGeneriques =
        {
            "error.envelope.", "error.idempotency.", "error.http.", "error.internal.", "error.resource.", "error.validation.",
        };

        public static bool EstGenerique(string cle)
        {
            if (string.IsNullOrEmpty(cle)) return false;
            foreach (string f in FamillesGeneriques) if (cle.StartsWith(f, System.StringComparison.Ordinal)) return true;
            return false;
        }

        private static readonly Regex DebutErreur = new Regex("\"error\"\\s*:\\s*\\{");

        /// <summary>Le `code` du refus (`payload.error.code`) — c'est LUI qui discrimine, pas le statut : trois codes différents partagent
        /// le 409 (`SELLING_CASH_EMPTY`, `SELLING_SAFEHOUSE_FULL`, `RESOURCE_STATE_CONFLICT`). Null si le corps n'en porte pas.
        /// ⛔ INDÉPENDANT DE L'ORDRE DES CLÉS (revue ⊥ de CLIENT-2, m3) : on parcourt l'objet `error` en comptant les accolades et en sautant les
        /// chaînes, et on ne retient que la clé `code` de PREMIER niveau — jamais celle d'un `details` imbriqué, quelle que soit sa place.</summary>
        public static string Code(string corps)
        {
            if (string.IsNullOrEmpty(corps)) return null;
            Match debut = DebutErreur.Match(corps);
            if (!debut.Success) return null;
            int i = debut.Index + debut.Length, profondeur = 1, n = corps.Length;
            while (i < n && profondeur > 0)
            {
                char c = corps[i];
                if (c == '"')
                {
                    int fin = FinDeChaine(corps, i);
                    if (fin < 0) return null;
                    int k = fin + 1;
                    while (k < n && char.IsWhiteSpace(corps[k])) k++;
                    if (profondeur == 1 && k < n && corps[k] == ':' && corps.Substring(i + 1, fin - i - 1) == "code")
                    {
                        k++;
                        while (k < n && char.IsWhiteSpace(corps[k])) k++;
                        if (k >= n || corps[k] != '"') return null;
                        int finValeur = FinDeChaine(corps, k);
                        if (finValeur < 0) return null;
                        string valeur = corps.Substring(k + 1, finValeur - k - 1);
                        return valeur.Length > 0 ? valeur : null;
                    }
                    i = fin + 1;
                    continue;
                }
                if (c == '{' || c == '[') profondeur++;
                else if (c == '}' || c == ']') profondeur--;
                i++;
            }
            return null;
        }

        /// <summary>L'indice du guillemet fermant de la chaîne qui s'ouvre en `debut` (les échappements `\"` sont sautés), ou -1.</summary>
        private static int FinDeChaine(string s, int debut)
        {
            for (int i = debut + 1; i < s.Length; i++)
            {
                if (s[i] == '\\') { i++; continue; }
                if (s[i] == '"') return i;
            }
            return -1;
        }

        private static readonly Regex CleServie = new Regex("\"user_facing_i18n_key\"\\s*:\\s*\"([^\"\\\\]*)\"");

        /// <summary>La clé servie du refus, ou null.</summary>
        public static string Cle(string corps)
        {
            if (string.IsNullOrEmpty(corps)) return null;
            Match m = CleServie.Match(corps);
            return m.Success && m.Groups[1].Value.Length > 0 ? m.Groups[1].Value : null;
        }

        /// <summary>La phrase servie du refus, trous remplis par ses `payload_vars` RÉSOLUES ; null si aucune clé servie, ou si la
        /// clé est GÉNÉRIQUE (`EstGenerique`) — l'écran garde alors sa phrase.</summary>
        public static string Phrase(string corps)
        {
            string cle = Cle(corps);
            if (cle == null || EstGenerique(cle)) return null;
            return Libelle.Gabarit(cle, null, VariablesDeRefus.Resoudre(VariablesDeRefus.Lire(corps)));
        }
    }
}
