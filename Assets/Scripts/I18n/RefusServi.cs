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
    ///   l'appelant garde alors SA phrase d'avant. Jamais le `message` de développeur à la place d'une clé manquante.</summary>
    public static class RefusServi
    {
        private static readonly Regex CleServie = new Regex("\"user_facing_i18n_key\"\\s*:\\s*\"([^\"\\\\]*)\"");

        /// <summary>La clé servie du refus, ou null.</summary>
        public static string Cle(string corps)
        {
            if (string.IsNullOrEmpty(corps)) return null;
            Match m = CleServie.Match(corps);
            return m.Success && m.Groups[1].Value.Length > 0 ? m.Groups[1].Value : null;
        }

        /// <summary>La phrase servie du refus, trous remplis par ses `payload_vars` RÉSOLUES ; null si aucune clé servie.</summary>
        public static string Phrase(string corps)
        {
            string cle = Cle(corps);
            if (cle == null) return null;
            return Libelle.Gabarit(cle, null, VariablesDeRefus.Resoudre(VariablesDeRefus.Lire(corps)));
        }
    }
}
