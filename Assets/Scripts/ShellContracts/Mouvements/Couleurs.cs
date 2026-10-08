using UnityEngine;

namespace MafiaCleanCity.Mouvements
{
    /// <summary>
    /// Design §1 — les calculs de couleur de la couche de mouvement. `HueRotate` descend ici depuis `Gyrophare`
    /// (assembly de la carte) : la migration de l'appelant est E2, `Gyrophare.HueRotate` reste en attendant (même matrice).
    /// </summary>
    public static class Couleurs
    {
        /// <summary>La matrice `hue-rotate` du CSS (Filter Effects §feColorMatrix), sur les composantes telles qu'écrites.
        /// L'alpha passe sans changement. Aucune allocation.</summary>
        public static Color HueRotate(Color c, float deg)
        {
            float a = deg * Mathf.Deg2Rad, cos = Mathf.Cos(a), sin = Mathf.Sin(a);
            float r = (0.213f + cos * 0.787f - sin * 0.213f) * c.r + (0.715f - cos * 0.715f - sin * 0.715f) * c.g
                      + (0.072f - cos * 0.072f + sin * 0.928f) * c.b;
            float g = (0.213f - cos * 0.213f + sin * 0.143f) * c.r + (0.715f + cos * 0.285f + sin * 0.140f) * c.g
                      + (0.072f - cos * 0.072f - sin * 0.283f) * c.b;
            float b = (0.213f - cos * 0.213f - sin * 0.787f) * c.r + (0.715f - cos * 0.715f + sin * 0.715f) * c.g
                      + (0.072f + cos * 0.928f + sin * 0.072f) * c.b;
            return new Color(Mathf.Clamp01(r), Mathf.Clamp01(g), Mathf.Clamp01(b), c.a);
        }

        /// <summary>`#rrggbb` sous forme d'entier 0xRRGGBB, alpha 1 (le catalogue est donnée pure : pas de parseur de texte).</summary>
        public static Color Rvb(int hex)
        {
            return new Color(((hex >> 16) & 0xff) / 255f, ((hex >> 8) & 0xff) / 255f, (hex & 0xff) / 255f, 1f);
        }

        /// <summary>Écart maximal par canal RGB (l'alpha n'entre pas : il n'est jamais touché par `Melange`/`Hue`).</summary>
        public static float EcartRvb(Color a, Color b)
        {
            return Mathf.Max(Mathf.Abs(a.r - b.r), Mathf.Max(Mathf.Abs(a.g - b.g), Mathf.Abs(a.b - b.b)));
        }
    }
}
