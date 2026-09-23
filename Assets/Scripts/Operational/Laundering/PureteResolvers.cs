namespace MafiaCleanCity.Operational
{
    /// <summary>Le PRODUCTEUR UNIQUE du libellé de propreté (`CleanlinessBucket`, back `citysim/events/city-event-bus.ts:331` :
    /// DIRTY | PARTIAL | MOSTLY_CLEAN | CLEAN). Seul consommateur depuis le retrait de ⑪/⑫ (2026-09-23) : ㊵ la filière
    /// (`FiliereScreenController.Etape`).
    ///
    /// Mots et clés : table 48 de l'atelier (edf98ebf, « ratifié (137) ») — `filiere.proprete.<valeur>`, la clé tirée de la
    /// VALEUR servie (`Libelle.ParValeur`), le mot en minuscules comme la maquette. Remplace la famille `blanchiment.purete.*`
    /// (clés dérivées des MOTS, « À demi propre ») que ⑪/⑫ avaient posée.
    ///
    /// ⛔ JAMAIS la valeur brute à l'écran : hors domaine, le mot de la famille des BANDES (« état inconnu », `Repli.Etat`) ;
    /// absente, « — ». (L'ancien « Propreté inconnue » était un mot de ce fichier seul, sans famille.)</summary>
    public static class PureteResolvers
    {
        /// <summary>Le libellé affichable d'une bande de propreté (table 48).</summary>
        public static string Libelle(string b)
        {
            switch (b)
            {
                case "DIRTY":        return I18n.Libelle.ParValeur("filiere", "proprete", b, "sale");
                case "PARTIAL":      return I18n.Libelle.ParValeur("filiere", "proprete", b, "à moitié");
                case "MOSTLY_CLEAN": return I18n.Libelle.ParValeur("filiere", "proprete", b, "presque propre");
                case "CLEAN":        return I18n.Libelle.ParValeur("filiere", "proprete", b, "propre");
                default:             return I18n.Repli.Etat(b);
            }
        }

        /// <summary>Le domaine servi, dans l'ordre de l'échelle (couverture de domaine des tests).</summary>
        public static readonly string[] Domaine = { "DIRTY", "PARTIAL", "MOSTLY_CLEAN", "CLEAN" };
    }
}
