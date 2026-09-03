namespace MafiaCleanCity.Operational
{
    /// <summary>Le PRODUCTEUR UNIQUE du libellé de propreté (`CleanlinessBucket`), consommé par
    /// ⑪ `LaunderingController` et ⑫ `PipelineOverviewController`.
    ///
    /// ⛔⛔ POURQUOI CE FICHIER EXISTE, et pourquoi le défaut était invisible. Les deux écrans
    /// portaient chacun leur `CleanlinessLabel(string)` — deux `switch` IDENTIQUES à la clé i18n
    /// près (`blanchiment/purete` d'un côté, `pipeline/etat` de l'autre). Ils s'accordaient, donc
    /// rien ne rougissait.
    /// ★ *Une duplication ne fait pas de mal tant que les deux copies s'accordent — ce qui la
    ///   rend invisible en revue. Elle ne coûte qu'au moment où l'une des deux change, et c'est
    ///   alors l'AUTRE qu'on cherche.* Mesuré ici : c'est une échelle de propreté du blanchiment,
    ///   et les deux écrans montrent la MÊME grandeur au joueur. Deux copies, c'est la promesse
    ///   qu'un jour l'un dira « Propre » et l'autre « Clean » sur la même donnée.
    ///
    /// ⛔ ET LES DEUX COPIES PARTAGEAIENT DEUX DÉFAUTS, que traduire seul aurait laissés en place :
    ///   (a) `case "PARTIAL": return "Partial";` — la SEULE des quatre valeurs qui ne passait PAS
    ///       par `Libelle`. Un balayage des replis anglais ne la voit donc pas : il n'inspecte que
    ///       les appels à `Libelle.De`. *Deux populations disjointes — littéraux non convertis d'un
    ///       côté, replis anglais de l'autre — et chaque outil rend l'autre invisible.*
    ///   (b) `default: return b;` — rendait l'IDENTIFIANT BRUT du serveur à l'écran (« MOSTLY_CLEAN »
    ///       en capitales et souligné) pour toute valeur inconnue. Un repli doit être une PHRASE,
    ///       jamais la donnée qu'on n'a pas su lire.
    ///
    /// ⚠️ LA CLÉ i18n EST CELLE DU DOMAINE, PAS DE L'ÉCRAN. Les deux appelants passaient des clés
    /// différentes pour la même grandeur ; c'est cette divergence qui autorisait deux traductions.
    /// Un seul domaine (`blanchiment`, rôle `purete`) rend impossible de les désaccorder.</summary>
    public static class PureteResolvers
    {
        /// <summary>Le libellé affichable d'une bande de propreté. `b` est le `CleanlinessBucket`
        /// projeté par le serveur : DIRTY | PARTIAL | MOSTLY_CLEAN | CLEAN.</summary>
        public static string Libelle(string b)
        {
            switch (b)
            {
                case "CLEAN":        return I18n.Libelle.De("blanchiment", "purete", "Propre");
                case "MOSTLY_CLEAN": return I18n.Libelle.De("blanchiment", "purete", "Presque propre");
                case "PARTIAL":      return I18n.Libelle.De("blanchiment", "purete", "À demi propre");
                case "DIRTY":        return I18n.Libelle.De("blanchiment", "purete", "Sale");
                // ⛔ JAMAIS `return b`. Une valeur inconnue est un fait à NOMMER, pas un
                // identifiant à recopier : le joueur lirait « MOSTLY_CLEANISH » en capitales sans
                // savoir que c'est un défaut de lecture, et la capture le montrerait sans le dire.
                default:             return I18n.Libelle.De("blanchiment", "purete", "Propreté inconnue");
            }
        }
    }
}
