using System;

namespace MafiaCleanCity.CityMap
{
    /// <summary>Le fichier d'ancres de la ville peinte (écran ③), produit par l'atelier
    /// (`atelier3d-mafia/ville-peinte/rendre-ville-peinte.py`) à côté de la texture, lu par
    /// `JsonUtility` — d'où les champs publics en snake_case, comme `DistrictBackgroundAnchorDto`.
    /// Les ancres sont données en px de texture ET en FRACTION du viewBox : le client ne consomme
    /// que les fractions (`x_frac`, `y_frac`, origine haut-gauche, Y vers le bas), ce qui rend le
    /// placement indépendant de la résolution de la texture et du cover appliqué à l'écran.</summary>
    [Serializable]
    public class AncresDistrictsDto
    {
        public string source;
        public string texture;
        public int[] taille_px;
        public int[] viewBox;
        public int echelle;
        public float distance_min_px;
        public AncreDistrictDto[] ancres;
    }

    [Serializable]
    public class AncreDistrictDto
    {
        public string nom;      // nom canon en capitales, ex. "TIDEWATER-1" — apparié à `name_canonical` sans la casse
        public string profil;
        public float x_px;
        public float y_px;
        public float x_frac;
        public float y_frac;

        /// <summary>L'inclinaison du nom, EN CONVENTION D'IMAGE : 0° = horizontale, **positif =
        /// sens HORAIRE** (y descend, comme en SVG et en pixels).
        /// ⚠️ Unity tourne à l'INVERSE : `Quaternion.Euler(0, 0, -angle_deg)`. Le fichier d'ancres
        /// porte cette convention en toutes lettres (`angle_convention`) — et c'est la seule chose
        /// qui empêche l'aiguille inversée : une garde sur le SIGNE de la constante serait
        /// satisfaite par les deux mondes.
        /// C'est une propriété du PROFIL de trame — six profils, six angles, amplitude 28° — lue
        /// dans la source d'auteur (`geo_brennar.py`, champ `rot`), pas dérivée d'une image.</summary>
        public float angle_deg;
    }
}
