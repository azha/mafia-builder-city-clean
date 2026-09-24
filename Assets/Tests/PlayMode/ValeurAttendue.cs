using System.Collections.Generic;
using MafiaCleanCity.I18n;

namespace MafiaCleanCity.Tests
{
    /// <summary>L'ATTENDU d'un texte que l'écran rend par `Libelle` : la valeur du catalogue CHARGÉ quand la clé y est, sinon le repli
    /// du client — exactement ce que l'écran affiche, dans les deux régimes (catalogue vide, fixture, bundle réel).
    /// ⛔ POURQUOI (2026-09-24, lot typographique du back f2-D10/D17) : une assertion qui recopie en littéral une valeur SERVIE épingle
    /// la typographie d'un jour ; elle rougit quand le back corrige une apostrophe, sans qu'un mot ait changé — ou, si le catalogue
    /// n'est pas chargé, elle ne mesure que le repli et se croit témoin du servi. L'attendu se LIT, il ne se recopie pas.
    /// Ne compte rien : lit `I18nCatalog` directement, pas `Libelle` (les compteurs de replis restent ceux de l'écran).</summary>
    public static class ValeurAttendue
    {
        /// <summary>Pour un texte rendu par `Libelle.De(domaine, role, litteral)` : même clé, même repli.</summary>
        public static string De(string domaine, string role, string litteral) =>
            Cle(Libelle.CleDe(domaine, role, litteral), litteral);

        /// <summary>Pour un texte rendu par `Libelle.Gabarit` / `ParValeur` à clé explicite ; `parametres` remplis comme l'écran.</summary>
        public static string Cle(string cle, string repli, IDictionary<string, string> parametres = null)
        {
            if (I18nCatalog.Connait(cle)) return I18nCatalog.Traduire(cle, parametres);
            return parametres == null ? repli : IcuFormat.Formater(repli, parametres);
        }
    }
}
