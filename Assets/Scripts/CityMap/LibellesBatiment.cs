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
        /// <summary>`operational_type` — les 12 membres du pgEnum `building_operational_type` (back, EN MINUSCULES :
        /// `common/building-signs.ts:21`), "" si le bâtiment n'est pas converti.
        /// ⛔ Corrigé le 22/09 (classe « le client compare une valeur que le back ne sert pas », mesurée par CLIENT-2) : les cas étaient
        /// en MAJUSCULES — 0 des 12 membres servis n'était apparié, seul le repli `CasseDeTitre` servait. Et cinq cas (WAREHOUSE,
        /// GARAGE, CLUB, BAR, RESTAURANT) ne sont dans AUCUN domaine du back : retirés. `SAFEHOUSE` était `cash_safehouse`.
        /// Les mots : les six d'avant, et pour les six membres qui n'en avaient pas ici, ceux de `TypeLabel` (intérieur de district,
        /// ratifiés au lot C) — « même concept, même mot sur le même écran » (DistrictInteriorScreenController.cs:1708-1716).</summary>
        /// <summary>①-2 (2026-09-23) — UN mot par type, pour tout ① : la clé servie `building.type.<operational_type>` (celle de ②),
        /// repli = les mots de l'atelier (`22-…` §7.1 B ; « Imprimerie » et « Agence » pour les deux types que le back ne sert
        /// pas encore). ① disait « Cache », « Point de vente », « Atelier de presse », « Bureau » là où ② dit « Réserve »,
        /// « Coin de vente »… : le joueur lisait deux mots pour un bâtiment en passant de la carte à la fiche.</summary>
        public static string Type(string t)
        {
            string repli = MotDuType(t);
            if (string.IsNullOrEmpty(t)) return repli;
            return MafiaCleanCity.I18n.Libelle.ParValeur("building", "type", t, repli);
        }

        private static string MotDuType(string t)
        {
            switch (t)
            {
                case "": case null: return "Bâtiment civil";
                case "grow_house": return "Serre";
                case "lab": return "Labo";
                case "distribution_hub": return "Relais";
                case "money_holding": return "Banque";
                case "front_shop": return "Commerce-écran";
                case "cash_safehouse": return "Planque";
                case "office": return "Agence";
                case "stash": return "Réserve";
                case "dealer_spot_front": return "Coin de vente";
                case "specialized_lab": return "Labo spécialisé";
                case "refinery": return "Raffinerie";
                case "press_house": return "Imprimerie";
                default: return MafiaCleanCity.I18n.Repli.TypeInconnu;   // un type hors domaine (règle f2, atelier 28) — jamais le code brut ; le vide est traité plus haut
            }
        }

    }
}
