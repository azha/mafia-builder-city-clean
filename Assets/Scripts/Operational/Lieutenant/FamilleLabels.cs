namespace MafiaCleanCity.Operational
{
    /// <summary>
    /// Les libellés de l'écran « LA FAMILLE », dans la langue de sa maquette.
    ///
    /// ⚠️ DEUX RANGS DE LIBELLÉS, ET LE FICHIER DIT LEQUEL EST LEQUEL. Quatre archétypes sont
    /// écrits noir sur blanc par la maquette (`Tools/family-organigramme-reference-1120.png` et sa
    /// source) : Comptable, Sécurité, Blanchiment, Logistique — RATIFIÉS. Les cinq autres reçoivent
    /// la traduction française ordinaire du mot, conformément au ruling « i18n partout » : ce sont
    /// des noms communs, pas du canon, et laisser « COOK » à l'écran d'un jeu français n'est pas de
    /// la prudence, c'est un défaut. `ArchetypesRatifies` reste la liste de ceux que la maquette
    /// a tranchés, pour qu'une ratification future porte sur les cinq autres et sur eux seuls.
    ///
    /// Une valeur INCONNUE, elle, sort toujours brute en casse de titre — exactement comme
    /// `DayPhaseResolver` laisse passer un quart inconnu : voir une valeur brute est un signal,
    /// la voir disparaître derrière un mot inventé n'en est pas un.
    ///
    /// ⚠️ Et ce n'est PAS le seam d'internationalisation. Le ruling user « i18n partout » vise un
    /// catalogue de chaînes ; ce résolveur est la FORME que ce lot devra brancher — une fonction
    /// nommée qui prend la valeur du domaine et rend un libellé, à un seul endroit. Le socle le
    /// dit : une correspondance portée par de la prose ou par l'ordre d'un tableau n'a aucune forme
    /// exécutable à asserter ; celle-ci en a une.
    /// </summary>
    public static class FamilleLabels
    {
        /// <summary>Les 9 archétypes canoniques (`lieutenant-archetype.ts:30-45`) plus `UNKNOWN` —
        /// exposés pour que le détecteur d'un 10ᵉ membre soit un TEST qui les énumère : la valeur
        /// arrive en `string`, il n'y a aucun enum C# à rendre exhaustif.</summary>
        public static readonly string[] ArchetypesCanoniques =
        {
            "COOK", "LOGISTICS", "DISTRIBUTION", "LAUNDERING", "SECURITY",
            "BOOKKEEPER", "MUSCLE", "INTELLIGENCE", "FACILITY_MANAGER", "UNKNOWN",
        };

        /// <summary>Les quatre que la maquette écrit noir sur blanc.</summary>
        public static readonly string[] ArchetypesRatifies = { "BOOKKEEPER", "SECURITY", "LAUNDERING", "LOGISTICS" };

        public static string Archetype(string a)
        {
            switch (a)
            {
                // Ratifiés par la maquette (Sal=Comptable, Vito=Sécurité, Rosa=Blanchiment, Enzo=Logistique).
                case "BOOKKEEPER": return "Comptable";
                case "SECURITY": return "Sécurité";
                case "LAUNDERING": return "Blanchiment";
                case "LOGISTICS": return "Logistique";
                // Traduits (noms communs), en attente de ratification par la maquette.
                case "COOK": return "Cuisinier";
                case "DISTRIBUTION": return "Distribution";
                case "MUSCLE": return "Gros bras";
                case "INTELLIGENCE": return "Renseignement";
                case "FACILITY_MANAGER": return "Intendant";
                // Inconnu : rendu tel quel. Un 10ᵉ archétype doit se VOIR, pas se fondre.
                default: return CasseDeTitre(a);
            }
        }

        /// <summary>Le mode d'exercice — la puce sous le nom. La maquette en montre deux :
        /// « DÉLÉGUÉ » et « DIRECT ».</summary>
        public static string Mode(string mode)
        {
            switch (mode)
            {
                case "delegated": return "DÉLÉGUÉ";
                case "tasked": return "DIRECT";
                default: return CasseDeTitre(mode).ToUpperInvariant();
            }
        }

        /// <summary>L'état opérationnel — la valeur de droite. La maquette en montre deux
        /// (« Actif », « Repos ») ; les deux autres membres de la bande viennent du back
        /// (`op_state_band` : SETTLING | PAUSED | ACTIVE | IDLE) et reçoivent le mot français qui
        /// correspond à ce que le back en dit, sans en inventer le sens.</summary>
        /// <summary>L'ancienneté — la puce sous le nom dans l'organigramme, et le chip d'ancienneté
        /// des bandes de détail. Cinq paliers côté back (`tenure_bucket`).</summary>
        public static string Anciennete(string bucket)
        {
            switch (bucket)
            {
                case "FRESH": return "Récent";
                case "ACCLIMATED": return "Acclimaté";
                case "SEASONED": return "Aguerri";
                case "SENIOR": return "Ancien";
                case "ENTRENCHED": return "Enraciné";
                default: return CasseDeTitre(bucket);
            }
        }

        public static string Etat(string band)
        {
            switch (band)
            {
                case "ACTIVE": return "Actif";
                case "IDLE": return "Repos";
                case "PAUSED": return "En pause";
                case "SETTLING": return "Stabilisation";
                default: return CasseDeTitre(band);
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
