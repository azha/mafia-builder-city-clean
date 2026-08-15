using UnityEngine;

namespace MafiaCleanCity.AssetLint
{
    /// <summary>
    /// W3.U-DA — les 4 prédicats numériques `ForbiddenList` posés en C0
    /// (`gdd/14_tunable_constants.md §Asset pipeline — palette & DA`, commit back `918bf4b2`).
    /// Recopiés ici en C# parce qu'ils doivent s'exécuter côté Unity (G5) — le canon reste la
    /// source de vérité (R9.3 appliqué au client : ces valeurs sont un DÉRIVÉ exécutable, pas une
    /// seconde définition ; toute dérive entre les deux devra être détectée par un futur pont,
    /// comme G6 le fait pour la palette elle-même — cf D-3, ce prédicat n'a pas encore son pont).
    /// </summary>
    public static class ForbiddenPredicates
    {
        public enum Kind { GoldSaturated, NeonPink, NeonCyanPure, BloodRedSpectacle }

        public static bool GoldSaturated(float h, float s, float v) => h >= 40f && h <= 60f && s >= 0.60f && v >= 0.70f;
        public static bool NeonPink(float h, float s, float v) => h >= 300f && h <= 345f && s >= 0.55f && v >= 0.80f;
        public static bool NeonCyanPure(float h, float s, float v) => h >= 170f && h <= 195f && s >= 0.70f && v >= 0.85f;
        public static bool BloodRedSpectacle(float h, float s, float v) => (h <= 10f || h >= 355f) && s >= 0.75f && v >= 0.60f;

        /// <summary>Retourne le prédicat déclenché par cette couleur, ou null si aucun.</summary>
        public static Kind? Classify(Color c)
        {
            Color.RGBToHSV(c, out var hue01, out var s, out var v);
            float h = hue01 * 360f;
            if (GoldSaturated(h, s, v)) return Kind.GoldSaturated;
            if (NeonPink(h, s, v)) return Kind.NeonPink;
            if (NeonCyanPure(h, s, v)) return Kind.NeonCyanPure;
            if (BloodRedSpectacle(h, s, v)) return Kind.BloodRedSpectacle;
            return null;
        }
    }
}
