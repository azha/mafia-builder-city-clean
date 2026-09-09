using UnityEngine;
using UnityEngine.UI;

namespace MafiaCleanCity.CityMap
{
    /// <summary>
    /// W3.U2/C6 (D4) — <see cref="DistrictTinted"/> exige un `SpriteRenderer`
    /// (`DistrictTinted.cs:14`) ; les écrans de ce lot sont 100% uGUI (patron maison). Composant
    /// FRÈRE, pas une redéclaration : il CONSOMME
    /// <see cref="DistrictTintResolver.Resolve"/>/<see cref="DistrictTintResolver.ToTintColor"/> —
    /// la table HSV reste à un seul endroit (`DistrictTintResolver.cs:32-40`). Deux copies d'une
    /// table de couleurs seraient la déférence mutuelle que le lot DA a payée : chaque copie a
    /// l'air correcte lue seule.
    /// </summary>
    [RequireComponent(typeof(Image))]
    public class DistrictTintedImage : MonoBehaviour
    {
        [SerializeField] private string districtProfile; // "tidewater"|"spine"|"lattice"|"stack"|"glass"|"verge"

        private Image _image;

        public string DistrictProfile => districtProfile;
        public Color AppliedTint { get; private set; } = Color.white;

        private void Awake()
        {
            _image = GetComponent<Image>();
        }

        /// <summary>REUSE du contrat de <see cref="DistrictTinted.ApplyTint"/> : idempotente,
        /// rappelable si le profil change.</summary>
        public void ApplyTint(string profile)
        {
            districtProfile = profile;
            if (_image == null) _image = GetComponent<Image>();

            var shift = DistrictTintResolver.Resolve(profile);
            AppliedTint = DistrictTintResolver.ToTintColor(shift);
            _image.color = AppliedTint;
        }
    }
}
