namespace MafiaCleanCity.I18n
{
    /// <summary>㉟ LA VENTE (CLIENT-3, 12/11) — LES MOTS du coin, de l'écoulement et de la clientèle d'un dealer. Onze clés ratifiées par f2 le
    /// 12/11, dessinées par l'atelier (cadre 171, master @73806af8), NON servies au back cumul @44a645a2 : le repli écrit ici s'affiche, et il
    /// se compte (dette datée).
    ///
    /// Domaines RECOPIÉS du back (`GET /v1/operational/dealers`, `selling.projection.service.ts`) :
    ///   · `lek_band`  `ABSENT|LOW|MEDIUM|HIGH` (:88)                                  ⇒ `vente.coin.bande.<valeur>`
    ///   · `lane_band` `FAST|STEADY|SCATTERED` ou null (`lane-clearing-zone.ts:31`)     ⇒ `vente.ecoulement.bande.<valeur>`
    ///   · `addiction_loyalty_status` `LOW|STABLE|HIGH` ou null (`hush-addiction.service.ts:31`) ⇒ `vente.clientele.bande.<valeur>`
    ///   · `withdrawn` booléen : un coin Hush resté à sec, sa clientèle a décroché        ⇒ `vente.clientele.perdue`
    /// `null` (aucune lane formée ; un coin qui n'est pas Hush) et toute valeur hors liste rendent null : l'écran n'écrit RIEN, jamais un
    /// mot plausible à la place d'une valeur inconnue.</summary>
    public static class VenteMots
    {
        public static readonly string[] Coins = { "ABSENT", "LOW", "MEDIUM", "HIGH" };
        public static readonly string[] Ecoulements = { "FAST", "STEADY", "SCATTERED" };
        public static readonly string[] Clienteles = { "LOW", "STABLE", "HIGH" };

        public const string ClePerdue = "vente.clientele.perdue";

        private static string RepliDuCoin(string valeur)
        {
            switch (valeur)
            {
                case "HIGH": return "coin animé";
                case "MEDIUM": return "du passage";
                case "LOW": return "coin mort";
                case "ABSENT": return "pas de coin ici";
                default: return null;
            }
        }

        private static string RepliDeLEcoulement(string valeur)
        {
            switch (valeur)
            {
                case "FAST": return "ça part vite";
                case "STEADY": return "ça s’écoule";
                case "SCATTERED": return "ça se disperse";
                default: return null;
            }
        }

        private static string RepliDeLaClientele(string valeur)
        {
            switch (valeur)
            {
                case "LOW": return "clientèle neuve";
                case "STABLE": return "des habitués";
                case "HIGH": return "clientèle accrochée";
                default: return null;
            }
        }

        /// <summary>Le mot du coin couvert (`lek_band`), ou null.</summary>
        public static string Coin(string lekBand)
        {
            string repli = RepliDuCoin(lekBand);
            return repli == null ? null : Libelle.ParValeur("vente", "coin.bande", lekBand, repli);
        }

        /// <summary>Comment le coin écoule (`lane_band`), ou null (aucune lane formée : personne n'a encore vendu ici).</summary>
        public static string Ecoulement(string laneBand)
        {
            string repli = RepliDeLEcoulement(laneBand);
            return repli == null ? null : Libelle.ParValeur("vente", "ecoulement.bande", laneBand, repli);
        }

        /// <summary>La clientèle d'un coin Hush (`addiction_loyalty_status`), ou null (le coin n'est pas Hush). ⛔ Ne lit PAS `withdrawn` :
        /// l'appelant demande `Perdue()` à la place quand le coin est resté à sec.</summary>
        public static string Clientele(string loyaltyStatus)
        {
            string repli = RepliDeLaClientele(loyaltyStatus);
            return repli == null ? null : Libelle.ParValeur("vente", "clientele.bande", loyaltyStatus, repli);
        }

        /// <summary>`withdrawn = true` : la phrase qui REMPLACE le mot de clientèle. Elle parle de la clientèle du COIN, jamais du dealer.
        /// U+00A0 avant « : » (typographie de l'atelier).</summary>
        public static string Perdue() => Libelle.Gabarit(ClePerdue, "resté à sec : la clientèle a décroché");
    }
}
