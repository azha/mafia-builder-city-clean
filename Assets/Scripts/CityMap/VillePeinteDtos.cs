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
    }
}
