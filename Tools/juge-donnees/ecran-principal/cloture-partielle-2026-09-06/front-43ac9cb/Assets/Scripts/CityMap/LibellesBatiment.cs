namespace MafiaCleanCity.CityMap
{
    /// <summary>
    /// Les libellés d'un bâtiment, en français.
    ///
    /// Même forme que `FamilleLabels` : une fonction NOMMÉE prenant la valeur du domaine et rendant
    /// un libellé, à un seul endroit. Le socle l'exige — une correspondance portée par de la prose,
    /// par un commentaire ou par l'ordre d'un tableau n'a aucune forme exécutable à asserter.
    ///
    /// ⚠️ CE QUI EST TRADUIT ICI EST TOUT CE QUE LE BACK PROJETTE, ET RIEN DE PLUS. La maquette
    /// écrit un nom propre (« LE VERGE D'OR ») et trois montants (« $ 2 400 », « $ 180/h », « 12% ») ;
    /// `DistrictInteriorBuildingDto` ne porte NI nom NI montant — ses 13 champs sont tous des bandes
    /// qualitatives (mesuré). Le type opérationnel prend donc la position du nom, exactement comme
    /// l'archétype la prend sur l'écran « LA FAMILLE ».
    ///
    /// Une valeur INCONNUE sort brute, en casse de titre : voir une valeur qu'on ne connaît pas est
    /// un signal ; la voir disparaître derrière un mot inventé n'en est pas un.
    /// </summary>
    public static class LibellesBatiment
    {
        /// <summary>`operational_type` — 12 membres côté back, "" si le bâtiment n'est pas converti.</summary>
        public static string Type(string t)
        {
            switch (t)
            {
                case "": case null: return "Bâtiment civil";
                case "GROW_HOUSE": return "Serre";
                case "LAB": return "Laboratoire";
                case "DISTRIBUTION_HUB": return "Relais";
                case "MONEY_HOLDING": return "Coffre";
                case "FRONT_SHOP": return "Commerce-écran";
                case "SAFEHOUSE": return "Planque";
                case "WAREHOUSE": return "Entrepôt";
                case "GARAGE": return "Garage";
                case "CLUB": return "Club";
                case "BAR": return "Bar";
                case "RESTAURANT": return "Restaurant";
                case "OFFICE": return "Bureau";
                default: return CasseDeTitre(t);
            }
        }

        /// <summary>`conversion_band` — la ligne de sous-titre, à la place du « BAR · QUARTIER
        /// GÉNÉRAL » du canon (le back ne projette aucun rôle de ce genre).</summary>
        public static string Conversion(string b)
        {
            switch (b)
            {
                case "NOT_CONVERTED": return "NON CONVERTI";
                case "IN_SETUP": return "EN INSTALLATION";
                case "OPERATIONAL": return "OPÉRATIONNEL";
                default: return CasseDeTitre(b).ToUpperInvariant();
            }
        }

        /// <summary>`revenue_band` — IDLE | EARNING.</summary>
        public static string Revenu(string b)
        {
            switch (b)
            {
                case "EARNING": return "Rapporte";
                case "IDLE": return "Au repos";
                default: return CasseDeTitre(b);
            }
        }

        /// <summary>`revenue_chain` — WIRED | UNWIRED. Un bâtiment qui gagne sans chaîne ne verse
        /// rien : c'est l'information utile, pas un débit inventé.</summary>
        public static string Chaine(string b)
        {
            switch (b)
            {
                case "WIRED": return "Raccordée";
                case "UNWIRED": return "Coupée";
                default: return CasseDeTitre(b);
            }
        }

        /// <summary>`condition_band` — SOUND | DAMAGED | REPAIRING | FAILED.</summary>
        public static string Etat(string b)
        {
            switch (b)
            {
                case "SOUND": return "Sain";
                case "DAMAGED": return "Endommagé";
                case "REPAIRING": return "En réparation";
                case "FAILED": return "Hors service";
                default: return CasseDeTitre(b);
            }
        }

        private static string CasseDeTitre(string v)
        {
            if (string.IsNullOrEmpty(v)) return "—";
            string bas = v.Replace('_', ' ').ToLowerInvariant();
            return char.ToUpperInvariant(bas[0]) + (bas.Length > 1 ? bas.Substring(1) : string.Empty);
        }
    }
}
