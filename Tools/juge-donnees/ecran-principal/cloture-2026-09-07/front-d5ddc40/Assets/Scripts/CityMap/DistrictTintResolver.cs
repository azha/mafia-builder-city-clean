using System.Collections.Generic;
using UnityEngine;

namespace MafiaCleanCity.CityMap
{
    /// <summary>
    /// W3.U-DA/C5 — résout `district_profile` (énum PG `services/game-back/src/db/schema/world_geography.ts:14-20`,
    /// 6 membres) vers son `ColorShift` (D-B du design : teinte au RUNTIME, jamais 6 copies
    /// pré-teintées). Les 6 triplets sont recopiés depuis
    /// `gdd/14_tunable_constants.md §Asset pipeline — palette &amp; DA` (commit back `918bf4b2`,
    /// section `T.asset.district_tint.*`) — R9.3 : le canon reste la source, ceci est un DÉRIVÉ
    /// exécuté côté client, comme <see cref="MafiaCleanCity.AssetLint.ForbiddenPredicates"/> l'est
    /// pour les prédicats.
    /// </summary>
    public readonly struct ColorShift
    {
        public readonly float HueDeltaDeg;
        public readonly float SaturationDelta;
        public readonly float ValueDelta;

        public ColorShift(float hueDeltaDeg, float saturationDelta, float valueDelta)
        {
            HueDeltaDeg = hueDeltaDeg;
            SaturationDelta = saturationDelta;
            ValueDelta = valueDelta;
        }
    }

    public static class DistrictTintResolver
    {
        // clé = valeur brute du champ `profile` de WorldDtos.cs:21 (glass|lattice|spine|stack|tidewater|verge)
        private static readonly Dictionary<string, ColorShift> Shifts = new Dictionary<string, ColorShift>
        {
            { "tidewater", new ColorShift(+18f, +0.05f, -0.02f) },
            { "verge",     new ColorShift(+8f,  -0.04f, +0.03f) },
            { "stack",     new ColorShift(-6f,  -0.06f, -0.05f) },
            { "lattice",   new ColorShift(0f,    0.00f,  0.00f) }, // nominal — neutre (dicté par le canon, pas une omission)
            { "spine",     new ColorShift(+14f, +0.04f, +0.02f) },
            { "glass",     new ColorShift(-20f, +0.03f, +0.04f) },
        };

        /// <summary>Le neutre déclaré pour un profil inconnu — jamais d'exception (falsifiable C5-iv).</summary>
        public static readonly ColorShift UnknownProfileFallback = Shifts["lattice"];

        public static ColorShift Resolve(string profile)
        {
            if (profile != null && Shifts.TryGetValue(profile.ToLowerInvariant(), out var shift))
            {
                return shift;
            }
            return UnknownProfileFallback;
        }

        // Baseline de saturation pour la conversion en tint MULTIPLICATIF (pas une valeur canon —
        // un artefact de la formule de composition, cf commentaire de ToTintColor ci-dessous).
        private const float TintBaselineSaturation = 0.12f;

        /// <summary>
        /// Convertit un ColorShift en couleur de teinte MULTIPLICATIVE appliquée sur un
        /// SpriteRenderer (approximation documentée — un vrai shift HSV par pixel demanderait un
        /// shader dédié, hors périmètre de ce lot, option conservatrice).
        ///
        /// Un shift NUL (lattice, "nominal — neutre") rend EXACTEMENT blanc = aucun changement
        /// visuel, cas spécial dicté par le canon lui-même. Pour les 5 AUTRES profils, composer
        /// depuis une saturation de base à 0 aurait été un bug réel (mesuré, falsifiable C5-iii
        /// rouge en premier jet) : `verge` a un `saturationDelta` NÉGATIF (-0.04, "faded") qui,
        /// clampé depuis 0, retombe à s=0 -- la teinte perd alors toute information de TEINTE
        /// (HSV à s=0 est achromatique quel que soit h) et devient indiscernable du blanc de
        /// `lattice`. D'où une base de saturation non-nulle (<see cref="TintBaselineSaturation"/>)
        /// pour les shifts non-nuls, qui garde la teinte visible même sous un delta négatif.
        /// </summary>
        public static Color ToTintColor(ColorShift shift)
        {
            bool isZeroShift = shift.HueDeltaDeg == 0f && shift.SaturationDelta == 0f && shift.ValueDelta == 0f;
            if (isZeroShift)
            {
                return Color.white;
            }

            float h = Mathf.Repeat(shift.HueDeltaDeg / 360f, 1f);
            float s = Mathf.Clamp01(TintBaselineSaturation + shift.SaturationDelta);
            float v = Mathf.Clamp01(1f + shift.ValueDelta);
            return Color.HSVToRGB(h, s, v, hdr: false);
        }

        public static IEnumerable<string> KnownProfiles => Shifts.Keys;
    }
}
