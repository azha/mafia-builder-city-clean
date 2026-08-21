using UnityEngine;

namespace MafiaCleanCity.CityMap
{
    /// <summary>
    /// Pivot « fond pré-rendu » (Tools/pivot-fond-prerendu-design.md, §P3) — la table
    /// profil×mode → (fond, carte d'ancrage) du diorama district. REUSE du seul seam de chargement
    /// runtime éprouvé du projet (`DesignTokens.Current` / `BuildingSpriteSlots.Current` —
    /// Resources.Load, cache statique) plutôt qu'un mécanisme inventé.
    ///
    /// §6 du design : UNE seule scène existe aujourd'hui (`district_nuit.blend`, profil `verge`,
    /// vague 1 = `verge-a` seul) — les 5 autres profils n'ont AUCUN fond. `Resolve` est donc
    /// PARTIELLE par construction et rend `null` pour tout profil non couvert : l'appelant
    /// (le contrôleur) est responsable du repli déclaré (jamais un null silencieux qui plante).
    ///
    /// P4 (verdict ⊥, périmètre écrit par lui) — le fond `jour` (`VERGE_D_JOUR_FINAL`) est
    /// désormais câblé : `ResolveArtPhase` route DAY sur un palier héros JOUR dédié (voir
    /// `DistrictInteriorScreenController.DioramaArtPhase.DayHero`).
    /// JUGE-D1 (audit visuel, 2026-08-21) — DAWN et DUSK routent DÉSORMAIS eux aussi vers un palier
    /// héros : AUCUN fond dédié n'existe pour ces deux quarts (seuls `vergeNuit`/`vergeJour` sont
    /// câblés ci-dessous), donc `ResolveArtPhase` les fait REPRENDRE le mode "jour" (DAWN) / "nuit"
    /// (DUSK) — un PIS-ALLER consigné en dette, pas un 3e/4e mode ajouté ici : `Resolve(profile,
    /// mode)` ne connaît toujours QUE "nuit"/"jour" (§6, aucun changement de cette table).
    /// </summary>
    [CreateAssetMenu(fileName = "DistrictBackgroundSlots", menuName = "MafiaCleanCity/District Background Slots")]
    public class DistrictBackgroundSlots : ScriptableObject
    {
        private static DistrictBackgroundSlots _current;

        public static DistrictBackgroundSlots Current
        {
            get
            {
                if (_current == null)
                {
                    _current = Resources.Load<DistrictBackgroundSlots>("DistrictBackgroundSlots");
                    if (_current == null)
                    {
                        Debug.LogError("DistrictBackgroundSlots.Current: Resources.Load(\"DistrictBackgroundSlots\") a renvoyé null — " +
                                        "Assets/Resources/DistrictBackgroundSlots.asset est-il présent et importé ?");
                    }
                }
                return _current;
            }
        }

        [System.Serializable]
        public class BackgroundEntry
        {
            [Tooltip("Le fond pré-rendu, importé 1:1 STRICT (compression None/RGBA32, spriteMode Single) — §1 du design.")]
            public Sprite fond;
            [Tooltip("La carte d'ancrage JSON produite par parcelles.py à côté du PNG (§4) — jamais une constante C#.")]
            public TextAsset ancre;
        }

        [Header("verge (districts 16-18, vague 1 : verge-a seul a des fonds réels)")]
        public BackgroundEntry vergeNuit;
        public BackgroundEntry vergeJour;

        /// <summary>Résout (profile, mode) vers son <see cref="BackgroundEntry"/> — `null` si ce
        /// profil/mode n'a aucune scène rendue (§6 : c'est le cas pour tidewater/spine/lattice/
        /// stack/glass en vague 1, et pour `verge` hors "nuit"/"jour"). Exhaustif à repli explicite,
        /// jamais une exception.</summary>
        public BackgroundEntry Resolve(string profile, string mode)
        {
            switch (profile)
            {
                case "verge":
                    switch (mode)
                    {
                        case "nuit": return vergeNuit;
                        case "jour": return vergeJour;
                        default: return null;
                    }
                default: return null;
            }
        }

        /// <summary>REUSE — équivalent à <c>Resolve(profile, "nuit")</c>, conservé pour ne pas
        /// toucher les appelants existants (P3, avant que "jour" n'existe).</summary>
        public BackgroundEntry ResolveNight(string profile) => Resolve(profile, "nuit");
    }
}
