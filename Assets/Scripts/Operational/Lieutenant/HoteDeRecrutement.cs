using System.Collections.Generic;
using System.Linq;
using MafiaCleanCity.Shell;

namespace MafiaCleanCity.Operational
{
    /// <summary>B7 (passe UX 2026-09-24) — LE BÂTIMENT D'UN RECRUTEMENT, tiré des bâtiments SERVIS (`GET /v1/me/buildings`).
    ///
    /// Le recrutement envoyait `assigned_building_id` = un `[SerializeField]` vide que seuls les tests renseignaient : le shell
    /// monte l'écran par `AddComponent`, sans valeur sérialisée ⇒ le back rendait 422 « assigned_building_id must be a UUID
    /// (got "") » à tout joueur (mesuré sur le serveur, `corps/144` de la passe), et ㉙ « Il vous en manque un » menait au même
    /// mur. Ce résolveur choisit, parmi les bâtiments du joueur, celui que l'archétype peut occuper.
    ///
    /// ⛔ TD-750 (dette client, 26/09) : correspondance de domaine DUPLIQUÉE hors de son résolveur — elle dérivera en silence quand
    /// un binding changera. Repli provisoire : elle sort le jour où le back SERT l'hôte éligible (demandé par f2).
    /// ⚠️ La table recopie les gardes du back @5e792a3c (`operational/lieutenant/*-binding.ts`), qui ne la SERT pas :
    ///   COOK → `lab` (COOK_HOST_OPERATIONAL_TYPES) · LAUNDERING → `front_shop`, cible = une planque · BOOKKEEPER →
    ///   `money_holding` puis `front_shop` · DISTRIBUTION → `dealer_spot_front`, cible = une planque · LOGISTICS → une source et
    ///   une cible DISTINCTES · MUSCLE, INTELLIGENCE, SECURITY, FACILITY_MANAGER → aucun type imposé (« [PROV-Y26Q2] »).
    /// ⇒ Le back reste l'autorité : sans candidat du bon type, on envoie quand même un bâtiment possédé, et c'est SON refus lisible
    ///   (« is not a front_shop », « hosts no dealer ») qui nomme la condition — jamais un 422 sur une chaîne vide. Une table qui
    ///   diverge du back rend donc un refus lisible, pas un faux succès.</summary>
    public static class HoteDeRecrutement
    {
        /// <summary>Types d'hôte préférés, dans l'ordre. Absent = n'importe quel bâtiment possédé.</summary>
        private static readonly Dictionary<string, string[]> Hotes = new Dictionary<string, string[]>
        {
            { "COOK", new[] { "lab" } },
            { "LAUNDERING", new[] { "front_shop" } },
            { "BOOKKEEPER", new[] { "money_holding", "front_shop" } },
            { "DISTRIBUTION", new[] { "dealer_spot_front" } },
            { "LOGISTICS", new[] { "lab", "stash", "distribution_hub" } },
        };

        /// <summary>La cible d'un archétype à deux bâtiments : la PLANQUE pour LAUNDERING et DISTRIBUTION (le back lit la ligne
        /// `safehouse` du bâtiment), un autre bâtiment opérationnel pour LOGISTICS (le cellier d'abord).</summary>
        private static readonly Dictionary<string, string[]> Cibles = new Dictionary<string, string[]>
        {
            { "LAUNDERING", new[] { "cash_safehouse" } },
            { "DISTRIBUTION", new[] { "cash_safehouse" } },
            { "LOGISTICS", new[] { "stash", "front_shop", "lab" } },
        };

        /// <summary>(bâtiment affecté, cible) pour `archetype`. La cible est null pour un archétype à un bâtiment. Rend
        /// (null, null) seulement quand le joueur ne possède rien.</summary>
        public static (string affecte, string cible) Choisir(string archetype, IEnumerable<BatimentPossedeDto> possedes)
        {
            List<BatimentPossedeDto> liste = (possedes ?? Enumerable.Empty<BatimentPossedeDto>())
                .Where(b => b != null && !string.IsNullOrEmpty(b.building)).ToList();
            if (liste.Count == 0) return (null, null);

            string affecte = Premier(liste, Hotes.TryGetValue(archetype ?? "", out string[] h) ? h : null, exclu: null)
                             ?? liste[0].building;
            string cible = null;
            if (RuleModel.NeedsTarget(archetype))
                cible = Premier(liste, Cibles.TryGetValue(archetype, out string[] c) ? c : null, exclu: affecte)
                        ?? liste.Select(b => b.building).FirstOrDefault(id => id != affecte);
            return (affecte, cible);
        }

        private static string Premier(List<BatimentPossedeDto> liste, string[] types, string exclu)
        {
            if (types == null) return liste.Select(b => b.building).FirstOrDefault(id => id != exclu);
            foreach (string t in types)
            {
                BatimentPossedeDto b = liste.FirstOrDefault(x => x.operational_type == t && x.building != exclu);
                if (b != null) return b.building;
            }
            return null;
        }
    }
}
