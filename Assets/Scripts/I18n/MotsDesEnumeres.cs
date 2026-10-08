using System.Collections.Generic;

namespace MafiaCleanCity.I18n
{
    /// <summary>CAUSE 4 du rapport de conformité de CLIENT-3 (07/10) : « anglais / texte technique à l'écran » — ⑮ Inspection (« Moderate », « Backlogged »), ⑭ Compression (« Calm · None »,
    /// « Moderate »), ⑨ (« TEACH: PAUSE ON HIGH HEAT »), ㉓ ㉔. Cause UNIQUE et connue : `Lisible()`, le pis-aller de dé-slug (`MODERATE` → « Moderate ») recopié dans huit contrôleurs. *Un pis-aller
    /// de dé-slug ne traduit pas : il montre l'enum.*
    ///
    /// Ce fichier est le RÉSOLVEUR COMMUN, par DOMAINE FERMÉ lu à l'ancre du type dans le back (jamais recopié d'un commentaire) :
    ///   · `StressBucket` (`stress-bucket.ts:28`) `calm | mounting | crushing | compression_active` ; `compression_week_state` (`0002_player_progression_state.sql:19`) `none | warning | active` ;
    ///     `ProblemTier` (`problem-tier.ts:28`) `minor | moderate | critical` ; `ProblemSourceKind` (`problem-aggregator.repository.ts:49`, 9 valeurs) ;
    ///   · `QueueLoadBucket` (`inspection.projection.service.ts:42`) `EMPTY | LIGHT | MODERATE | HEAVY | SATURATED` ; `DispatcherRegime` (`inspection.service.ts:93`) `NOMINAL | BACKLOGGED | BUDGET_CUT | SURGE`.
    /// La clé se dérive de la VALEUR SERVIE (`Libelle.ParValeur` : `compression.tension.calm`), le repli est un MOT FRANÇAIS ÉCRIT PAR L'ATELIER, et il se compte comme tout repli.
    ///
    /// ⚠️ UN MOT QUE L'ATELIER N'A PAS ÉCRIT N'EST PAS INVENTÉ : sa valeur reste `null` dans la table, l'écran dit « — » (une valeur doit se voir comme INCONNUE, jamais se déguiser en mot anglais
    /// plausible), et la valeur est enregistrée dans <see cref="MotsManquants"/> pour que le rapport et la garde de classe la nomment. Les mots ci-dessous sont ceux des cadres de la maquette
    /// (`ecrans-brennar-4.html`, cadres ⑭ 25-30 : « Calme », « Montante », « Écrasante », « aucune semaine en vue », « la semaine s'annonce », les cinq phrases de genre du tableau) ;
    /// ⑮ n'en a AUCUN (cadre à écrire par l'atelier).</summary>
    public static class MotsDesEnumeres
    {
        /// <summary>Le mot de la barre « Tension » (chrome de l'Accueil `OrgVitalsPanelController.NomTension`, plaque de ⑭) : UN littéral, lu par les deux.</summary>
        public const string NomTension = "Tension";

        /// <summary>Un domaine fermé : où se range sa clé (`domaine.role.valeur`) et ses mots (valeur → mot, ou null : attendu de l'atelier).</summary>
        public sealed class Domaine
        {
            public readonly string Nom, Role;
            public readonly IReadOnlyDictionary<string, string> Mots;
            /// <summary>Sa famille au sens de l'atelier 28 (`Repli`) : une BANDE/un état (« état inconnu » hors domaine) ou une SORTE — type, genre, palier (« type inconnu »).</summary>
            public readonly bool EstUneSorte;
            public Domaine(string nom, string role, Dictionary<string, string> mots, bool estUneSorte = false) { Nom = nom; Role = role; Mots = mots; EstUneSorte = estUneSorte; }
        }

        // ⑭ — la tension (cadres 25 « Montante — la semaine s'annonce », 26 « Écrasante — la semaine s'est ouverte toute seule », 29 « Calme — vos affaires respirent »).
        // `compression_active` : « sous compression » (MOTS-GENERES 08/10, ligne 1 — le mot dit le RÉGIME, pas un niveau : le back rend cette valeur dès que la semaine est ouverte, sans regarder la tension) ;
        // `crushing` garde « Écrasante ».
        public static readonly Domaine Tension = new Domaine("compression", "tension", new Dictionary<string, string>
        {
            { "calm", "Calme" }, { "mounting", "Montante" }, { "crushing", "Écrasante" }, { "compression_active", "sous compression" },
        });

        // ⑭ — la semaine (canon de la série 2 : « JOUR 1 · TENSION CALME · AUCUNE SEMAINE » ; cadre 25 : « la semaine s'annonce »). `active` : « la semaine est ouverte » (MOTS-GENERES 08/10 : ni cause
        // « toute seule » ni compte de jours, rien dans la valeur servie ne les établit).
        public static readonly Domaine Semaine = new Domaine("compression", "semaine", new Dictionary<string, string>
        {
            { "none", "aucune semaine" }, { "warning", "la semaine s’annonce" }, { "active", "la semaine est ouverte" },
        });

        // ⑭ — le genre d'un problème du tableau (cadre 26 : les cinq phrases dessinées). Les quatre autres genres (`severed_route`, `cue_cascade_card`, `settling_overload`, `friction_penalty`)
        // n'avaient aucune phrase dans le cadre : écrites le 08/10 (MOTS-GENERES, ligne 1 (a)).
        public static readonly Domaine GenreDeProbleme = new Domaine("compression", "genre", new Dictionary<string, string>
        {
            { "exception_card", "Une exception attend depuis trop longtemps" },
            { "flag", "Un signalement n’a pas été tranché" },
            { "backpressure_node", "Un nœud de la chaîne sature" },
            { "stressed_leg", "Un tronçon fatigue faute d’entretien" },
            { "cue_stack_failed_slot", "Un créneau de la pile a raté" },
            { "severed_route", "Une route ne tient plus la charge" }, { "cue_cascade_card", "Un créneau raté en a entraîné d’autres" }, { "settling_overload", "Un changement de plus pendant la stabilisation" }, { "friction_penalty", "L’organisation porte trop de friction" },
        }, estUneSorte: true);

        // ⑭ — la gravité d'un problème : le cadre la dit par la COULEUR du palier, aucun mot dessiné ; les trois mots masculins (la pastille qualifie un problème) sont écrits le 08/10.
        public static readonly Domaine Palier = new Domaine("compression", "palier", new Dictionary<string, string>
        {
            { "minor", "mineur" }, { "moderate", "modéré" }, { "critical", "critique" },
        }, estUneSorte: true);

        // ⑮ — la charge de la file et le régime du répartiteur : les mots du cadre 32 (« VIDE », « LEGERE », « NOMINAL », « ARRIERE » — en capitales de listing, sans accent : le registre les écrit en police à chasse fixe) ;
        // les accents sont rétablis (légère) ; « arriéré » est CONFIRMÉ par le back (`inspection.regime.backlogged`). MODERATE, HEAVY, SATURATED, BUDGET_CUT, SURGE : aucun cadre ne les dessine — le repli est le mot
        // DÉJÀ SERVI par le back (`inspection.charge.*`, `inspection.regime.*`), recopié du fichier : l'écran ne change pas de mot hors ligne ou avant l'amorçage.
        public static readonly Domaine ChargeDeLaFile = new Domaine("inspection", "charge", new Dictionary<string, string>
        {
            { "EMPTY", "vide" }, { "LIGHT", "légère" }, { "MODERATE", "moyenne" }, { "HEAVY", "lourde" }, { "SATURATED", "saturée" },
        });
        public static readonly Domaine Regime = new Domaine("inspection", "regime", new Dictionary<string, string>
        {
            { "NOMINAL", "nominal" }, { "BACKLOGGED", "arriéré" }, { "BUDGET_CUT", "budget coupé" }, { "SURGE", "en renfort" },
        });

        /// <summary>Tous les domaines (la garde et le rapport les parcourent).</summary>
        public static readonly Domaine[] Tous = { Tension, Semaine, GenreDeProbleme, Palier, ChargeDeLaFile, Regime };

        private static readonly SortedSet<string> manquants = new SortedSet<string>();

        /// <summary>Les valeurs servies dont le mot manque, `domaine.role.valeur` — remplie à l'exécution, par `Dire`.</summary>
        public static IReadOnlyCollection<string> MotsManquants => manquants;
        public static void OublierLesManquants() => manquants.Clear();

        /// <summary>LE mot de la valeur servie. Vide/null → « — » (TD-644 : un tiret n'a pas de langue) ; valeur PRÉSENTE hors du domaine fermé → le mot de SA famille (atelier 28 : « état inconnu » /
        /// « type inconnu », <see cref="Repli"/>), jamais dé-sluggée ; mot attendu de l'atelier → « — », enregistré dans
        /// <see cref="MotsManquants"/> ; sinon `Libelle.ParValeur` (le bundle servi gagne, le repli est le mot de l'atelier).</summary>
        public static string Dire(Domaine d, string valeurServie)
        {
            if (string.IsNullOrEmpty(valeurServie)) return "—";
            if (!d.Mots.TryGetValue(valeurServie, out string repli)) { manquants.Add(d.Nom + "." + d.Role + "." + valeurServie + " (hors domaine)"); return d.EstUneSorte ? Repli.Type(valeurServie) : Repli.Etat(valeurServie); }
            if (repli == null)
            {
                // la clé peut déjà être SERVIE par le back (mots du bundle) même si l'atelier n'a pas écrit de repli : le bundle gagne.
                string cle = d.Nom + "." + d.Role + "." + Libelle.Slug(valeurServie);
                if (Libelle.EstServie(cle)) return Libelle.ParValeur(d.Nom, d.Role, valeurServie, "—");
                manquants.Add(d.Nom + "." + d.Role + "." + valeurServie);
                return "—";
            }
            return Libelle.ParValeur(d.Nom, d.Role, valeurServie, repli);
        }
    }
}
