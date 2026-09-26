using System.Text.RegularExpressions;

namespace MafiaCleanCity.I18n
{
    /// <summary>T1 (atelier D37, table 64 @8d9b9e3a, 26/09) — LE PONT, pas un modèle (f2). Les DEUX clés T1 ont été servies sous deux
    /// formes nommées, fausses à l'écran : « Lt. Hara — … » (un nom figé dans la valeur, pile bfd194bc) puis « {nom} — … » (le
    /// lieutenant se nommait lui-même alors que l'en-tête le nomme déjà, cc46166d). La valeur D37 n'a plus de nom. Tant que le bundle
    /// sert une forme périmée, un rendu de CES deux clés qui ouvre sur « Lt. X — » prend le repli D37.
    /// ⛔ PORTÉE : les deux clés T1 SEULEMENT (`ClesT1`) — jamais une règle sur tout rendu : elle avalerait en silence une valeur
    ///   légitime qui ouvre sur un nom.
    /// ⏳ DETTE DATÉE TD-763 (handoff CLIENT-2) : PÉRIMÉE quand le bundle servi = table 64 @8d9b9e3a (les deux valeurs D37). L'épingle
    ///   `ZeroRepliDesLocatairesPlayModeTests.PontT1_EncoreNecessaire` (BundleReel) rougit ce jour-là : retirer ce fichier et ses deux
    ///   sites (ExceptionBandes.TexteServeur, TutorialScreenController.TexteDuTutoriel).</summary>
    public static class NomsFiges
    {
        public const string PerimeQuand = "bundle servi = table 64 @8d9b9e3a (D37)";

        public static readonly string[] ClesT1 = { "onboarding.preseed_exception.card", "tutorial.exception_card.onboarding_preseed" };

        private static readonly Regex OuvreSurLt = new Regex(@"^\s*Lt\.\s+\S+(\s+\S+)?\s*—");

        /// <summary>Vrai si `rendu`, rendu pour une des deux clés T1, ouvre sur un nom (forme périmée). Faux pour toute autre clé.</summary>
        public static bool EstPerime(string cle, string rendu) =>
            System.Array.IndexOf(ClesT1, cle) >= 0 && !string.IsNullOrEmpty(rendu) && OuvreSurLt.IsMatch(rendu);

        /// <summary>L'épingle : la valeur SERVIE brute d'une clé T1 est-elle encore nommée (« Lt. X — » ou trou {nom}) ?</summary>
        public static bool ValeurServieNommee(string cle)
        {
            if (System.Array.IndexOf(ClesT1, cle) < 0 || !I18nCatalog.Connait(cle)) return false;
            return I18nCatalog.PorteLeTrou(cle, "nom") || OuvreSurLt.IsMatch(I18nCatalog.Traduire(cle));
        }
    }
}
