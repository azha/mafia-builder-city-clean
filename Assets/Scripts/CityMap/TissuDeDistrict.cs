namespace MafiaCleanCity.CityMap
{
    // LE TISSU D'UN QUARTIER — six mots de fiction pour les six profils que le back sert
    // (`glass | lattice | spine | stack | tidewater | verge`), livrés par l'atelier le 2026-09-22
    // (`da/2026-09-22`, `Tools/atelier-2026-09-22/02-profils-de-district.md`). Ce fichier CÂBLE la
    // table ; il n'invente aucun mot.
    //
    // ⛔ DEUX FORMES, PAS UNE : en ligne, minuscule avec l'article (« Les Bassins · le port · 37
    //    blocs » — la bande du cadre ③·23, telle quelle) ; en valeur de ligne, la capitale seule
    //    (« Port ») pour le panneau de détail, sous le libellé « Tissu » (légende du cadre ③·24,
    //    « Chaque quartier a son tissu »).
    // ⛔ LE MOT EST À CÔTÉ DU NOM, JAMAIS DESSUS : La Colonne (Spine-A), Le Verre (Glass-1) et
    //    La Lisière (Verge-A) sont déjà des NOMS de quartier — d'où « l'avenue », « les tours »,
    //    « les faubourgs », et jamais « la colonne », « le verre », « la lisière ».
    // ⛔ UN PROFIL INCONNU NE SE MONTRE PLUS BRUT (23/09, règle f2 : un joueur ne voit jamais une valeur machine) : il se
    //    dit « type inconnu » (`Repli.Type`, atelier 28 — un profil est une SORTE). Le cran neuf se voit par le test de
    //    couverture de domaine, plus à l'écran. Toujours sans lever. Les 18 noms de district ne sont pas traduits.
    public static class TissuDeDistrict
    {
        /// <summary>Le libellé de la ligne du panneau de détail — le mot de la légende, pas « Profile ».</summary>
        public const string LibelleDeLigne = "Tissu";

        /// <summary>Un profil vide : le tiret, jamais un mot.</summary>
        public const string Inconnu = "—";

        public static readonly string[] ProfilsConnus = { "tidewater", "spine", "lattice", "stack", "glass", "verge" };

        /// <summary>La forme en ligne : minuscule, avec l'article (« le port »).</summary>
        public static string EnLigne(string profile)
        {
            switch (Cle(profile))
            {
                case "tidewater": return "le port";
                case "spine":     return "l'avenue";
                case "lattice":   return "le damier";
                case "stack":     return "les cheminées";
                case "glass":     return "les tours";
                case "verge":     return "les faubourgs";
                case "":          return Inconnu;
                default:          return MafiaCleanCity.I18n.Repli.Type(profile);   // 23/09 (règle f2) : un profil hors domaine est une SORTE ⇒ « type inconnu », plus la brute
            }
        }

        /// <summary>La forme en valeur de ligne : la capitale seule (« Port »).</summary>
        public static string Valeur(string profile)
        {
            switch (Cle(profile))
            {
                case "tidewater": return "Port";
                case "spine":     return "Avenue";
                case "lattice":   return "Damier";
                case "stack":     return "Cheminées";
                case "glass":     return "Tours";
                case "verge":     return "Faubourgs";
                case "":          return Inconnu;
                default:          return MafiaCleanCity.I18n.Repli.Type(profile);
            }
        }

        private static string Cle(string profile) =>
            string.IsNullOrWhiteSpace(profile) ? "" : profile.Trim().ToLowerInvariant();
    }
}
