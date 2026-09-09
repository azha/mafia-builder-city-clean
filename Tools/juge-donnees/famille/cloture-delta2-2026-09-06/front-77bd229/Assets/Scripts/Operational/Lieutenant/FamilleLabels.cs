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
                case "BOOKKEEPER": return Lib("Comptable");
                case "SECURITY": return Lib("Sécurité");
                case "LAUNDERING": return Lib("Blanchiment");
                case "LOGISTICS": return Lib("Logistique");
                // Traduits (noms communs), en attente de ratification par la maquette.
                case "COOK": return Lib("Cuisinier");
                case "DISTRIBUTION": return Lib("Distribution");
                // ⛔⛔ CES TROIS-LÀ NE PASSENT PAS PAR `Lib`, ET C'EST MESURÉ, PAS PRUDENT. Le
                //    bundle réel servi en `fr` porte 14 clés `famille.archetype.*` ; les trois que
                //    `Libelle.De` dériverait de ces littéraux — un slug par littéral — n'y sont
                //    PAS. Les faire passer par le catalogue ajouterait trois REPLIS, et la garde
                //    `BundleReel_…_ZeroRepli` a exactement ce mode d'échec pour raison d'être :
                //    « le back ne les sert pas, et l'écran l'affiche en français sans que rien ne
                //    rougisse ». Le mot français est ici la valeur ratifiée du client, pas un
                //    repli déguisé — et les trois clés sont inscrites en dette, routées au lot
                //    i18n, plutôt qu'inventées ici.
                //    ★ *Une clé qu'on invente pour « faire propre » est du français non traduisible
                //      de plus, et le seul endroit où ça se voit est une garde de catalogue.*
                case "MUSCLE": return "Gros bras";
                case "INTELLIGENCE": return "Renseignement";
                case "FACILITY_MANAGER": return "Intendant";
                // ⛔ `UNKNOWN` EST UNE VALEUR RÉELLE DU DOMAINE, pas l'absence d'une valeur — le
                //    back la produit (`lieutenant.projection.service.ts`). Tombée dans le `default`
                //    elle sortait « Unknown » en casse de titre, c'est-à-dire l'anglais brut à
                //    l'écran d'un jeu français ; et la clé `famille.archetype.inconnu` EST servie,
                //    mais plus personne ne la demandait. Deux défauts d'un seul oubli.
                case "UNKNOWN": return Lib("Inconnu");
                // Un 10ᵉ archétype, lui, doit se VOIR brut : le repli sert de signal, pas de
                // traduction. C'est la distinction que `UNKNOWN` ci-dessus n'avait pas.
                default: return CasseDeTitre(a);
            }
        }

        private static string Lib(string repli) =>
            MafiaCleanCity.I18n.Libelle.De("famille", "archetype", repli);

        /// <summary>Le mode d'exercice — la puce sous le nom. La maquette en montre deux :
        /// « DÉLÉGUÉ » et « DIRECT ».</summary>
        /// <summary>⛔ LES REPLIS ONT CHANGÉ, ET CE N'EST PAS UN DÉTAIL DE STYLE. Cette méthode
        /// rendait « DÉLÉGUÉ » / « DIRECT » (littéraux en dur, capitales de la maquette) pendant
        /// qu'un SECOND résolveur — `LieutenantScreenController.ModeLabel`, privé — rendait
        /// « Délégué » / « Missionné » depuis le catalogue.
        /// ⛔ RECTIFIÉ (juge-données, 2026-09-06) : la phrase qui suivait affirmait que les deux
        ///    résolveurs étaient employés. **Faux, et mesuré** : à l'état d'avant l'unification,
        ///    CELUI-CI n'avait aucun appelant — le catalogue le remplaçait déjà partout. Le
        ///    doublon existait bien, mais un seul des deux était sur un chemin vivant. *Une
        ///    justification écrite au passé dans un commit se vérifie comme le code qu'elle
        ///    justifie* : je l'avais déduite de la présence de deux méthodes, pas comptée.
        /// C'est le catalogue qui gagne : il est la source de vérité du lot 0, et ses clés `famille.mode.*`
        /// sont servies. Les capitales, si la DA les veut, sont une affaire de RENDU (`fontStyle`,
        /// `characterSpacing`), pas de contenu — un libellé en capitales dans le catalogue rend la
        /// clé intraduisible dans les langues qui n'ont pas de casse.</summary>
        public static string Mode(string mode)
        {
            switch (mode)
            {
                case "delegated": return MafiaCleanCity.I18n.Libelle.De("famille", "mode", "Délégué");
                case "tasked": return MafiaCleanCity.I18n.Libelle.De("famille", "mode", "Missionné");
                // ⛔ PAS DE CLÉ SUR LE REPLI, et c'est la garde de catalogue qui me l'a appris.
                // J'avais écrit `Libelle.De("famille","mode","Mode inconnu")` — une clé que le
                // back NE SERT PAS. `BundleReel_…_ZeroRepli` a rougi aussitôt : « 2 clés sur 46
                // sont retombées sur leur littéral ». *Inventer une clé de repli, c'est ajouter
                // du français non traduisible en croyant bien faire* — et le seul endroit où ça
                // se voit est cette garde. Les deux résolveurs supprimés rendaient la valeur
                // BRUTE sur ce chemin ; on garde leur comportement.
                default: return CasseDeTitre(mode);
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

        /// <summary>⛔⛔ CETTE MÉTHODE ET `LieutenantScreenController.OpStateLabel` RENDAIENT DEUX
        /// MOTS DIFFÉRENTS POUR LA MÊME VALEUR, ET LES DEUX ÉTAIENT À L'ÉCRAN (mesuré 2026-09-06) :
        ///     SETTLING  « Stabilisation » ici · « Prend ses marques » là
        ///     IDLE      « Repos »         ici · « Au repos »          là
        /// `:2414` appelait celle-ci pour la rangée d'organigramme, `:2579`/`:2591` l'autre pour la
        /// ligne d'état — **un lieutenant en SETTLING lisait deux mots différents sur le même
        /// écran**. TD-611 n'était donc pas une dette latente : c'était un défaut visible.
        /// ⇒ Un seul producteur, adossé au catalogue, avec les replis de la version SERVIE.</summary>
        public static string Etat(string band)
        {
            switch (band)
            {
                case "ACTIVE": return MafiaCleanCity.I18n.Libelle.De("famille", "opstate", "Actif");
                case "IDLE": return MafiaCleanCity.I18n.Libelle.De("famille", "opstate", "Au repos");
                case "PAUSED": return MafiaCleanCity.I18n.Libelle.De("famille", "opstate", "En pause");
                case "SETTLING": return MafiaCleanCity.I18n.Libelle.De("famille", "opstate", "Prend ses marques");
                default: return CasseDeTitre(band);   // idem : aucune clé inventée sur le repli
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
