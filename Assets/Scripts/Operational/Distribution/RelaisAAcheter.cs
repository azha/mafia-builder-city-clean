using System.Collections.Generic;
using System.Linq;
using MafiaCleanCity.CityMap;
using MafiaCleanCity.Shell;

namespace MafiaCleanCity.Operational.Distribution
{
    /// <summary>㉘ — LE GESTE « ACHETER UN RELAIS » (f2 26/09, table 71 client 5354fa88), sur le modèle de B3 (㉟). Pur, testé hors réseau.
    ///
    /// Un relais (`distribution_hub`) s'achète sur un bloc libre (`POST /v1/operational/building/purchase`, `building_type_target`),
    /// puis s'ouvre depuis sa fiche (convert). La garde est à l'OUVERTURE, pas à l'achat : `convert` refuse un distribution_hub hors
    /// des districts Tidewater/Stack (back real-estate.service.ts:377-392, 422). Acheter ailleurs, c'est acheter un relais qui ne
    /// s'ouvrira jamais ⇒ le bloc se cherche DANS un district dont le profil SERVI (`world/districts.profile`) est ouvrable.
    /// ⚠️ TD-762 : `ProfilsOuvrables` RECOPIE la garde du back. Le lot back « achat-ouvrable » sert `convertible_types`, mais pour
    ///   les bâtiments POSSÉDÉS seulement ([] une fois convertis) : il ne dit rien d'un bloc LIBRE. La règle reste ici tant que le
    ///   back ne sert pas l'ouvrabilité d'un district (demandée par f2).</summary>
    public static class RelaisAAcheter
    {
        public const string TypeRelais = "distribution_hub";

        /// <summary>TD-762 — les profils où un relais peut s'OUVRIR (recopie de real-estate.service.ts:377-392).</summary>
        public static readonly string[] ProfilsOuvrables = { "tidewater", "stack" };

        /// <summary>Les districts servis où un relais s'ouvre, dans l'ordre servi.</summary>
        public static List<int> QuartiersOuvrables(IEnumerable<DistrictDto> districts) =>
            (districts ?? Enumerable.Empty<DistrictDto>())
                .Where(d => d != null && d.id > 0 && ProfilsOuvrables.Contains(d.profile))
                .Select(d => d.id).ToList();

        /// <summary>Vrai quand le joueur a DÉJÀ acheté un relais pas encore ouvert (servi par le lot achat-ouvrable :
        /// `purchased_type` = distribution_hub, `operational_type` vide) — le geste d'achat ne se repropose pas.</summary>
        public static bool DejaUnRelaisAOuvrir(IEnumerable<BatimentPossedeDto> possedes) =>
            (possedes ?? Enumerable.Empty<BatimentPossedeDto>())
                .Any(b => b != null && b.purchased_type == TypeRelais && string.IsNullOrEmpty(b.operational_type));
    }
}
