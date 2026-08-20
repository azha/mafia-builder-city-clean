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
    /// Le fond `jour` (`VERGE_D_JOUR_FINAL`) est importé (livrable #1) mais N'EST PAS câblé ici :
    /// D8 (`DistrictInteriorScreenController`, ResolveArtPhase) ne construit l'art de nuit QUE sur
    /// NIGHT — les 3 autres quarts restent le repli déclaré existant, inchangé par ce pivot (§0 du
    /// design nav-hud, jamais touché par ce document). Câbler le jour reste un chunk futur.
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

        [Header("verge (districts 16-18, vague 1 : verge-a seul a un fond réel)")]
        public BackgroundEntry vergeNuit;

        /// <summary>Résout (profile, "nuit") vers son <see cref="BackgroundEntry"/> — `null` si ce
        /// profil n'a aucune scène rendue (§6 : c'est le cas pour tidewater/spine/lattice/stack/glass
        /// en vague 1). Exhaustif à repli explicite, jamais une exception.</summary>
        public BackgroundEntry ResolveNight(string profile)
        {
            switch (profile)
            {
                case "verge": return vergeNuit;
                default: return null;
            }
        }
    }
}
