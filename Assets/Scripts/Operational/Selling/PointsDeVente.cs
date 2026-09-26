using System.Collections.Generic;
using System.Linq;
using MafiaCleanCity.CityMap;
using MafiaCleanCity.Shell;

namespace MafiaCleanCity.Operational.Selling
{
    /// <summary>B3 (passe UX 2026-09-24) — CE QUE ㉟ PEUT OFFRIR POUR QUE LA VENTE COMMENCE. Pur, testé hors réseau.
    ///
    /// Mesuré sur le serveur (`corps/020` de la passe) : un joueur neuf a `dealers: []`, et le client n'appelait jamais ni
    /// `dealer/assign` ni `building/purchase` ⇒ aucune vente, donc aucun revenu. ㉟ offre désormais les deux gestes, dans cet
    /// ordre : poster un dealer sur un point de vente possédé qui n'en a pas ; à défaut de tout point de vente, en acheter un.
    ///   · la TUILE couverte par le dealer = le bloc du point de vente lui-même (`me/buildings` sert `block_id`) : le back n'exige
    ///     qu'un bloc réel, et un joueur neuf n'a aucun lek dont tirer une autre tuile (`city/district/:id/leks` rend `[]`) ;
    ///   · le BLOC acheté = le premier bloc de son quartier (celui de son premier bâtiment) qui ne porte aucun de ses bâtiments —
    ///     le back ne vérifie la liberté que POUR CE JOUEUR (`isBlockFreeForPlayer`), et refuse lisiblement sinon.</summary>
    public static class PointsDeVente
    {
        public const string TypePointDeVente = "dealer_spot_front";

        /// <summary>Les points de vente possédés sur lesquels aucun dealer n'est posté.</summary>
        public static List<BatimentPossedeDto> SansDealer(IEnumerable<BatimentPossedeDto> possedes, IEnumerable<DealerDto> dealers)
        {
            var tenus = new HashSet<string>((dealers ?? Enumerable.Empty<DealerDto>())
                .Where(d => d != null && !string.IsNullOrEmpty(d.dealer_spot_id)).Select(d => d.dealer_spot_id));
            return (possedes ?? Enumerable.Empty<BatimentPossedeDto>())
                .Where(b => b != null && b.operational_type == TypePointDeVente && !string.IsNullOrEmpty(b.building) && !tenus.Contains(b.building))
                .ToList();
        }

        /// <summary>Vrai quand le joueur ne possède AUCUN point de vente — le seul cas où l'achat est offert.</summary>
        public static bool AucunPointDeVente(IEnumerable<BatimentPossedeDto> possedes) =>
            possedes != null && !possedes.Any(b => b != null && b.operational_type == TypePointDeVente);

        /// <summary>Le quartier où acheter : celui du premier bâtiment possédé ; -1 si le joueur ne possède rien.</summary>
        public static int QuartierDAchat(IEnumerable<BatimentPossedeDto> possedes)
        {
            BatimentPossedeDto premier = (possedes ?? Enumerable.Empty<BatimentPossedeDto>()).FirstOrDefault(b => b != null);
            return premier != null ? premier.district_id : -1;
        }

        /// <summary>Le premier bloc de l'intérieur servi qui ne porte aucun bâtiment du joueur ; -1 s'il n'y en a pas.</summary>
        public static int BlocLibre(DistrictInteriorDto interieur, IEnumerable<BatimentPossedeDto> possedes)
        {
            if (interieur?.blocks == null) return -1;
            var occupes = new HashSet<int>((possedes ?? Enumerable.Empty<BatimentPossedeDto>()).Where(b => b != null).Select(b => b.block_id));
            if (interieur.buildings != null)
                foreach (DistrictInteriorBuildingDto b in interieur.buildings) if (b != null) occupes.Add(b.block_id);
            DistrictInteriorBlockDto libre = interieur.blocks.FirstOrDefault(k => k != null && !occupes.Contains(k.block_id));
            return libre != null ? libre.block_id : -1;
        }
    }
}
