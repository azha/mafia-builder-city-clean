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
            label.text = $"{dto.name_canonical}    ·    {dto.profile}    ·    {dto.block_count} blocks";
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

        /// <summary>Apply a fetched heat band to this cell's badge (colour + text label).</summary>
        public void SetHeat(HeatBucket bucket)
        {
            Heat = bucket;
            Color c = CityMapEnums.HeatColorFor(bucket);
            if (HeatBadgeBg != null) HeatBadgeBg.color = c;
            if (HeatBadgeLabel != null)
            {
                HeatBadgeLabel.text = CityMapEnums.HeatLabel(bucket);
                HeatBadgeLabel.color = CityMapEnums.ReadableTextColor(c); // legible on yellow/orange
            }
        }

        /// <summary>Show or hide the heat badge (the overlay toggle).</summary>
        public void ShowHeat(bool visible)
        {
            if (HeatBadge != null) HeatBadge.SetActive(visible && Heat != HeatBucket.Unknown);
        }
    }
}
