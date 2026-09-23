using System.Globalization;

namespace MafiaCleanCity.Shell
{
    /// <summary>LE SEUL FORMATEUR D'ARGENT DU CLIENT — point 10 des arbitrages du 07/09 (`Tools/juge-visuel/ARBITRAGES-user-2026-09-07.md`),
    /// ratifié par f2 sous le ruling user du 30/08 : « **9 627 820 €**, sans centimes, espace fine insécable ». Le canon des séries 1,
    /// 4 et 6 est à jour ; « $ 24 850 » dans les références d'avant est une maquette en retard (point 19).
    /// ⛔ POURQUOI UNE CLASSE À ELLE : le recensement du 23/09 trouve UN formateur (`TopBarController.FormatCash`, `"C"` en fr-FR ⇒
    /// « 24 850,00 € ») ; le corriger sur place laisserait la CLASSE ouverte, et le prochain écran qui montre un montant écrirait le
    /// sien. Ici, dans `ShellContracts`, tout écran y a accès ; la garde `ArgentPlayModeTests.A3` rougit sur tout autre formateur.
    /// ⛔ LES OCTETS, PAS « un espace » : U+202F (espace fine insécable) entre les milliers ET avant le symbole. On ne demande PAS le
    /// séparateur à `fr-FR` : selon le runtime il rend U+00A0 (Mono) ou U+202F (ICU), et le rendu changerait d'une machine à l'autre.
    /// ⚠️ SANS CENTIMES = TRONQUÉ, jamais arrondi : un portefeuille à 24 850,75 affiche 24 850 — l'écran ne montre jamais de l'argent
    /// que le joueur n'a pas. (Déclaré : le point 10 dit « sans centimes », pas comment les retirer.)
    /// ⚠️ L'anglais n'est pas tranché par le point 10 : `en-US`, sans centimes (`C0`), tronqué de la même façon.</summary>
    public static class Argent
    {
        public const string EspaceFine = " ";
        public const string Absent = "—";

        /// <summary>Des centimes SERVIS (chaîne BigInt, jamais un flottant) ⇒ le montant affiché ; « — » si absent ou illisible.
        /// `decimal` de bout en bout : au-delà de 2^53 le montant survit sans perte.</summary>
        public static string DepuisCentimes(string centimesServis, string locale)
        {
            if (string.IsNullOrEmpty(centimesServis)) return Absent;
            if (!decimal.TryParse(centimesServis, NumberStyles.Integer | NumberStyles.AllowLeadingSign,
                    CultureInfo.InvariantCulture, out decimal centimes))
                return Absent;
            return Montant(decimal.Truncate(centimes / 100m), locale);
        }

        /// <summary>Un montant en unités ENTIÈRES (déjà sans centimes) ⇒ « 24 850 € » en français (U+202F), « $24,850 » sinon.</summary>
        public static string Montant(decimal unites, string locale)
        {
            unites = decimal.Truncate(unites);
            if (locale == "fr")
            {
                var nfi = (NumberFormatInfo)CultureInfo.InvariantCulture.NumberFormat.Clone();
                nfi.NumberGroupSeparator = EspaceFine;
                return unites.ToString("#,0", nfi) + EspaceFine + "€";
            }
            return unites.ToString("C0", CultureInfo.GetCultureInfo("en-US"));
        }
    }
}
