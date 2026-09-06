namespace MafiaCleanCity.Shell
{
    /// <summary>UN SEUL PRODUCTEUR PAR GRANDEUR pour la carte de décision — le type, la portée,
    /// l'urgence.
    ///
    /// ⛔⛔ POURQUOI IL EXISTE : LES DEUX ÉCRANS QUI MONTRENT LA MÊME CARTE N'EN DISAIENT PAS LA
    /// MÊME CHOSE. La carte de l'Accueil (`HighestLeverageCardController`) et son détail (⑤,
    /// `DecisionDetailScreenController`) rendent les mêmes trois champs de la même réponse
    /// `session/open`, à quelques secondes d'écart pour le joueur. Mesuré le 2026-09-06 :
    ///   · le TYPE — l'Accueil posait `CurrentCard.decision_type_key` **BRUT** dans son titre
    ///     (deux sites), pendant que ⑤ le passait par un résolveur qui interroge le catalogue et
    ///     retombe sur une lecture dé-sluggée. Deux producteurs, un seul branché.
    ///   · la PORTÉE et l'URGENCE — l'Accueil rendait « Minor / Moderate / Major » et
    ///     « Low / Elevated / Pressing », **en anglais**, quand ⑤ rendait « modérée » et
    ///     « faible ». Le même champ, deux langues, deux écrans.
    ///
    /// ★★★ ET LE RÉSOLVEUR DE ⑤ COUVRAIT TROIS VALEURS SUR SIX. Il testait `high`, `moderate`,
    /// `medium`, `low` — or le back sert `minor | moderate | major` et `low | elevated | pressing`
    /// (`hl-card-projection.ts:44,46`, deux types fermés). **`minor`, `major`, `elevated` et
    /// `pressing` tombaient donc sur le repli « — »**, c'est-à-dire sur RIEN, sur l'écran dont
    /// c'est le sujet. Personne ne l'a vu parce que le compte de démo sert précisément les deux
    /// valeurs que la liste contenait. *Une correspondance écrite à la main contre un domaine
    /// qu'on n'a pas relu couvre les cas qu'on a sous les yeux, et le jour où la donnée bouge
    /// l'écran se tait.* ⇒ Les six valeurs viennent des deux types du back, recomptées ici.
    ///
    /// ⚠️ PAS DE `Libelle.De` SUR CES LIBELLÉS, ET C'EST UNE DÉCISION MESURÉE (même arbitrage que
    /// TD-643) : les clés que le slug dériverait ne sont servies par AUCUNE locale — le bundle
    /// `fr` réel n'a rien en `decision.*`. Les faire passer par le catalogue ajouterait des replis
    /// et ferait rougir `BundleReel_…_ZeroRepli`, la garde qui existe pour ça. Le mot français est
    /// la valeur du client en attendant ; les clés partent en dette, au back, dans toutes les
    /// locales — et le repointage vient APRÈS, jamais avant.</summary>
    public static class LibellesDecision
    {
        /// <summary>Les six valeurs de bande RÉELLEMENT servies, exposées pour qu'un test puisse
        /// les balayer — la valeur arrive en `string`, il n'y a aucun enum C# à rendre exhaustif,
        /// donc le seul détecteur d'une septième est un test qui les énumère.</summary>
        public static readonly string[] PorteesServies = { "minor", "moderate", "major" };
        public static readonly string[] UrgencesServies = { "low", "elevated", "pressing" };

        /// <summary>Le type de décision. Interroge le catalogue ; à défaut, rend la clé machine
        /// dé-sluggée plutôt que la clé elle-même — `Libelle.De` rend le LITTÉRAL quand la clé
        /// manque, et ici le littéral EST la clé machine (`AUTONOMY_REPORTS_PENDING`). L'afficher
        /// serait pire que le défaut qu'on corrige.</summary>
        public static string Type(string cle)
        {
            if (string.IsNullOrEmpty(cle)) return "";
            string traduit = MafiaCleanCity.I18n.Libelle.De("decision", "type", cle);
            return traduit == cle ? Lisible(cle) : traduit;
        }

        public static string Portee(string bucket)
        {
            switch (bucket)
            {
                case "minor": return "mineure";
                case "moderate": return "modérée";
                case "major": return "majeure";
                // Une VALEUR INCONNUE sort brute, elle ne se fond pas dans un mot choisi : voir une
                // valeur qu'on n'attendait pas est un signal. Le tiret est réservé à l'ABSENCE.
                default: return string.IsNullOrEmpty(bucket) ? "—" : bucket;
            }
        }

        public static string Urgence(string bucket)
        {
            switch (bucket)
            {
                case "low": return "faible";
                case "elevated": return "élevée";
                case "pressing": return "pressante";
                default: return string.IsNullOrEmpty(bucket) ? "—" : bucket;
            }
        }

        /// <summary>Le RANG de la bande, 1 à 3 — le nombre de pastilles allumées. Zéro quand la
        /// valeur est absente ou hors domaine : *on n'allume pas une pastille sur une valeur qu'on
        /// n'a pas comprise.*
        ///
        /// ⛔⛔ IL PORTAIT LE MÊME TROU QUE LE LIBELLÉ, ET AU MÊME ENDROIT. Le compte de pastilles
        /// de ⑤ était `high→3, moderate|medium→2, low→1, sinon 0` : sur les six valeurs que le
        /// back sert, **quatre allumaient ZÉRO pastille** — `minor`, `major`, `elevated`,
        /// `pressing`. Une jauge à zéro n'est pas une absence de signal, c'est un signal FAUX :
        /// elle dit « rien » là où le back dit « majeure ». Le rang vient donc de la POSITION dans
        /// le domaine servi, pas d'une liste écrite à la main.</summary>
        public static int Rang(string bucket, bool urgence)
        {
            string[] domaine = urgence ? UrgencesServies : PorteesServies;
            for (int i = 0; i < domaine.Length; i++)
                if (domaine[i] == bucket) return i + 1;
            return 0;
        }

        /// <summary>La clé machine, rendue lisible. Reprise telle quelle du résolveur de ⑤ — c'est
        /// un DÉPLACEMENT, pas une réécriture : le comportement de l'écran déjà jugé ne bouge pas.</summary>
        private static string Lisible(string cle)
        {
            if (string.IsNullOrEmpty(cle)) return "";
            string[] p = cle.Split('.');
            string d = p[p.Length - 1].Replace('_', ' ');
            return d.Length == 0 ? "" : char.ToUpperInvariant(d[0]) + d.Substring(1);
        }
    }
}
