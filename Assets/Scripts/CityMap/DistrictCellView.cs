using UnityEngine;
using UnityEngine.UI;
using TMPro;

namespace MafiaCleanCity.CityMap
{
    // One district tile on the City Map. The background colour encodes the
    // control_state (the qualitative overlay); the label shows identity + size;
    // the optional heat badge shows the System Heat projection band.
    public class DistrictCellView : MonoBehaviour
    {
        public DistrictDto Model { get; private set; }
        public ControlState State { get; private set; }
        public BankSide Bank { get; private set; }
        public Image Background { get; private set; }
        public TextMeshProUGUI Label { get; private set; }

        // Heat overlay (set up by the controller; populated once heat is fetched).
        public GameObject HeatBadge { get; private set; }
        public Image HeatBadgeBg { get; private set; }
        public TextMeshProUGUI HeatBadgeLabel { get; private set; }
        public HeatBucket Heat { get; private set; }

        public void Bind(DistrictDto dto, Image background, TextMeshProUGUI label)
        {
            Model = dto;
            Background = background;
            Label = label;
            State = CityMapEnums.ParseControlState(dto.control_state);
            Bank = CityMapEnums.ParseBankSide(dto.bank_side);

            background.color = CityMapEnums.ColorFor(State);
            // JUGE-D5 (audit visuel, 2026-08-21, balayage étendu à CityMap.cs/DistrictCellView.cs,
            // même périmètre CityMap/) — "blocks" traduit en "blocs" (terme déjà établi dans ce
            // dépôt, ex. DistrictInteriorScreenController.cs : "unité = le bloc").
            // 2026-09-02 : la tuile affichait `name_canonical` (le nom de code, ex. "Verge-A") —
            // le back sert désormais un nom de fiction en français (`name`, ex. "La Lisière").
            // CityMapEnums.DisplayName choisit `name`, repli explicite sur `name_canonical`.
            label.text = $"{CityMapEnums.DisplayName(dto)}    ·    {dto.profile}    ·    {dto.block_count} blocs";
        }

        /// <summary>Wire the heat badge UI (built by the controller). Hidden until heat is set.</summary>
        public void AttachHeatBadge(GameObject badge, Image badgeBg, TextMeshProUGUI badgeLabel)
        {
            HeatBadge = badge;
            HeatBadgeBg = badgeBg;
            HeatBadgeLabel = badgeLabel;
            Heat = HeatBucket.Unknown;
            HeatBadge.SetActive(false);
        }

        /// <summary>Apply a fetched heat band to this cell's badge (small colour swatch + text
        /// label). Retour user relayé par le contrôleur (2026-08-21) : « signalé sans pastille
        /// pleine » — `HeatBadgeBg` n'est plus le fond d'un pavé 80×24, c'est un petit carré-témoin
        /// de 14px (voir `CityMapController.BuildCell`) ; le texte reste NEUTRE (blanc, comme tout
        /// le reste de cet écran — `ReadableTextColor` n'a plus lieu d'être ici : il compensait le
        /// contraste contre un fond coloré qui n'existe plus. Fonction laissée définie, INCHANGÉE,
        /// dans `WorldDtos.cs` — jamais retirée pour un seul appelant qui cesse de l'utiliser).</summary>
        public void SetHeat(HeatBucket bucket)
        {
            Heat = bucket;
            Color c = CityMapEnums.HeatColorFor(bucket);
            if (HeatBadgeBg != null) HeatBadgeBg.color = c;
            if (HeatBadgeLabel != null)
            {
                HeatBadgeLabel.text = CityMapEnums.HeatLabel(bucket);
            }
        }

        /// <summary>Show or hide the heat badge (the overlay toggle).</summary>
        public void ShowHeat(bool visible)
        {
            if (HeatBadge != null) HeatBadge.SetActive(visible && Heat != HeatBucket.Unknown);
        }
    }
}
