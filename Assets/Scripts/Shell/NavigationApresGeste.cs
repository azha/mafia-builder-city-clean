using System;
using System.Collections.Generic;

namespace MafiaCleanCity.Shell
{
    /// <summary>TD-938 (a) — OÙ MÈNE un AGIR dont le back répond `outcome: "navigate"` (`POST …/hl-card/:id/commit`). PURE : aucune UI, aucun
    /// `System.Type` — le montage vit dans `AppShell.SuivreLaNavigation`. Design `Tools/td-938-navigate/DESIGN.md` v3 (approuvé, revue ⊥ ×3).
    ///
    /// Les QUATRE valeurs de `navigate_screen` que le back sert, RECOPIÉES (V15) de `hl-option-table.ts:89-110` (lot back `hl-card-apres-geste`
    /// @35bdd6cb) : 103 `exceptions_escalations`, 104 `autonomy_reports`, 106 `supply_chain_trace`, 108 `exceptions_queue`.
    /// Règle (f2 11/11) : on mène à l'écran EXISTANT le plus proche qui MONTRE l'objet ; aucun écran ne le montre ⇒ INCONNU (le shell relit
    /// l'Accueil, comme avant, compte et journalise la valeur), jamais un écran deviné.
    ///   · `exceptions_queue` → ⑨ la file des exceptions ;
    ///   · `exceptions_escalations` → ⑨ aussi : il PORTE le total des escalades (pied inerte : aucune liste des escalades n'existe) ;
    ///   · `autonomy_reports` → c7 la boîte des rapports ;
    ///   · `supply_chain_trace` → INCONNU ASSUMÉ (TD-981) : aucun écran de trace ; ㉚ en sera l'hôte quand il rendra les nœuds non silencieux (TD-985).
    /// Les `navigate_ids` ne sont lus par aucun écran mené (TD-982).</summary>
    public static class NavigationApresGeste
    {
        public enum Cible { FileDesExceptions, BoiteDesRapports, Aucune }

        public const string FileDesExceptionsServie = "exceptions_queue";
        public const string EscaladesServies = "exceptions_escalations";
        public const string RapportsServis = "autonomy_reports";
        public const string TraceServie = "supply_chain_trace";

        /// <summary>Les quatre valeurs que le back sert (G1 : bijection avec la table du back).</summary>
        public static readonly IReadOnlyList<string> EcransServis = new[] { EscaladesServies, RapportsServis, TraceServie, FileDesExceptionsServie };

        /// <summary>Celles qui mènent à un écran du client.</summary>
        public static readonly IReadOnlyList<string> EcransMenes = new[] { FileDesExceptionsServie, EscaladesServies, RapportsServis };

        /// <summary>Celles qui tombent DÉLIBÉRÉMENT dans la branche inconnue, chacune avec sa dette.</summary>
        public static readonly IReadOnlyList<string> EcransInconnusAssumes = new[] { TraceServie };   // TD-981

        /// <summary>L'écran client pour une valeur servie ; `Aucune` pour null, vide, `supply_chain_trace` ou toute valeur hors table.</summary>
        public static Cible Pour(string ecranServi)
        {
            switch (ecranServi)
            {
                case FileDesExceptionsServie:
                case EscaladesServies:
                    return Cible.FileDesExceptions;
                case RapportsServis:
                    return Cible.BoiteDesRapports;
                default:
                    return Cible.Aucune;
            }
        }

        /// <summary>Vrai si la réponse de `commit` demande une NAVIGATION — lu sur `outcome` (clé présente sur un corps de succès), jamais sur
        /// `navigate_screen != null` : un `navigate` à écran nul doit tomber dans la branche inconnue, comptée, pas remonter l'Accueil en silence.</summary>
        public static bool EstUneNavigation(CommitResponseDto d) =>
            d != null && string.Equals(d.outcome, "navigate", StringComparison.Ordinal);
    }
}
