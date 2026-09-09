using UnityEngine;

namespace MafiaCleanCity.CityMap
{
    /// <summary>
    /// W3.U-DA/C5 — le composant nommé par le canon (`art_direction.md:127` : « chaque GameObject
    /// avec composant `DistrictTinted` reçoit son `ColorShift` au spawn selon `district_id` »).
    /// Premier consommateur RÉEL de <see cref="DistrictTintResolver"/> — pas une refonte de
    /// `CityMapController` (D-C du design : substrat teintable, pas la carte isométrique elle-même,
    /// qui reste au sous-lot city-map de W3). Ce composant se pose sur N'IMPORTE QUEL GameObject
    /// portant un `SpriteRenderer` (le substrat Kenney importé en C5) et applique la teinte au
    /// spawn — pas de modulation jour/météo (différé D-5, aucun consommateur mesuré).
    /// </summary>
    [RequireComponent(typeof(SpriteRenderer))]
    public class DistrictTinted : MonoBehaviour
    {
        [SerializeField] private string districtProfile; // "tidewater"|"spine"|"lattice"|"stack"|"glass"|"verge"

        private SpriteRenderer _renderer;

        public string DistrictProfile => districtProfile;
        public Color AppliedTint { get; private set; } = Color.white;

        private void Awake()
        {
            _renderer = GetComponent<SpriteRenderer>();
        }

        /// <summary>Appelée au spawn (REUSE explicite du canon : "reçoit son ColorShift au spawn
        /// selon district_id"). Idempotente — rappelable si le profil change (ex. réassignation).</summary>
        public void ApplyTint(string profile)
        {
            districtProfile = profile;
            if (_renderer == null) _renderer = GetComponent<SpriteRenderer>();

            var shift = DistrictTintResolver.Resolve(profile);
            AppliedTint = DistrictTintResolver.ToTintColor(shift);
            _renderer.color = AppliedTint;
        }
    }
}
