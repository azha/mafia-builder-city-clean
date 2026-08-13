using UnityEngine;
using TMPro;

namespace MafiaCleanCity.Theme
{
    /// <summary>
    /// W4.P4a/C3-C4 — palette partagée, chargée au runtime via Assets/Resources (aucun prefab
    /// ni scène ne câble les 9 écrans, construits entièrement à l'exécution — voir §1.5 du
    /// design ch24). W4.P4a/C4 : les valeurs sont RÉCOLTÉES depuis les 126 couleurs déjà
    /// inline des 9 contrôleurs (§1.3 du design), qui s'avèrent déjà un système cohérent,
    /// dupliqué à l'identique 7-8 fois (chaque contrôleur déclarait `SurfaceBg`/`CardBg`/…
    /// séparément avec les MÊMES valeurs). Zéro changement de pixel : ce chunk centralise la
    /// source, il ne repeint aucun écran shippé (déviation de l'option (a) proposée par défaut
    /// par le design — voir implementation-notes.md § Deviations).
    ///
    /// R2.3 (tunables jamais inline) appliqué au C# : les champs ci-dessous n'ont PAS de
    /// valeur par défaut dans le code — la valeur réelle vit UNIQUEMENT dans
    /// Assets/Resources/DesignTokens.asset (le seul artefact sérialisé), pas dans deux
    /// endroits qui peuvent diverger. Les commentaires documentent la valeur attendue pour
    /// traçabilité, ils ne la portent pas.
    /// </summary>
    [CreateAssetMenu(fileName = "DesignTokens", menuName = "MafiaCleanCity/Design Tokens")]
    public class DesignTokens : ScriptableObject
    {
        private static DesignTokens _current;

        /// <summary>
        /// Seam de livraison runtime unique (W4.P4a/C3). Les écrans n'ont ni prefab ni scène
        /// pour un [SerializeField] câblé, et AssetDatabase est éditeur-only : Resources.Load
        /// est le mécanisme retenu (§1.5 du design). Chargé une fois, mis en cache.
        /// </summary>
        public static DesignTokens Current
        {
            get
            {
                if (_current == null)
                {
                    _current = Resources.Load<DesignTokens>("DesignTokens");
                    if (_current == null)
                    {
                        Debug.LogError("DesignTokens.Current: Resources.Load(\"DesignTokens\") a renvoyé null — " +
                                        "Assets/Resources/DesignTokens.asset est-il présent et importé ?");
                    }
                }
                return _current;
            }
        }

        // ── Surfaces (profondeur de panneau, 4 paliers mesurés sur les 9 écrans) ───────────
        [Header("Surfaces")]
        public Color surfaceBase;    // #0d0f10 (0.051,0.059,0.063) — fond de page
        public Color surfaceCard;    // #16191b (0.086,0.098,0.106) — carte/panneau
        public Color surfaceRow;     // #232a2d (0.137,0.165,0.176) — ligne de liste
        public Color surfaceRaised;  // (0.16,0.18,0.22) — vignette/panneau surélevé

        // ── On-surface (texte, paliers) ────────────────────────────────────────────────────
        [Header("On-surface")]
        public Color onSurfacePrimary;      // #eef1f2 (0.933,0.945,0.949)
        public Color onSurfaceSecondary;    // #8a979c (0.541,0.592,0.612)
        public Color onSurfaceSecondaryAlt; // (0.55,0.59,0.63) — même rôle, arrondi à 2 décimales à l'origine
        public Color onSurfaceMuted;        // (0.72,0.76,0.80)
        public Color onSurfaceMutedAlt;     // (0.7,0.74,0.78) — actionStatusText (BuildingCard/Laundering)
        public Color onSurfaceDim;          // (0.75,0.79,0.83) — sous-titre (BuildingCard/Laundering/PipelineOverview)
        public Color onSurfaceDisabled;     // (0.42,0.45,0.49) — "LockedDim" (LieutenantScreen)

        // ── Accents sémantiques (sévérité mild/moderate/severe + CTA) ──────────────────────
        [Header("Accents")]
        public Color accentGold;     // #ffd23f (1,0.824,0.247) — CTA / stage terminale
        public Color accentSuccess;  // #43e0c0 (0.263,0.878,0.753) — mild/clean (teal)
        public Color accentWarning;  // #ff9e3d (1,0.62,0.239) — moderate/partial (amber)
        public Color accentDanger;   // #ff5a4d (1,0.353,0.302) — severe/dirty (red)
        public Color accentPremium;  // #c7b3ff (0.78,0.7,1) — BuildingCard premium yield

        // ── Chrome ──────────────────────────────────────────────────────────────────────────
        [Header("Chrome")]
        public Color scrimBackdrop;  // (0.05,0.05,0.06,0.85) — fond de modale

        // ── Typographie (W4.P4a/C5) ─────────────────────────────────────────────────────────
        // Remplace la résolution de fonte système raster que les 9 écrans utilisaient
        // (Latin-only — §1.4b du design). SDF, chaîne de repli non-vide (LiberationSans SDF),
        // TMP déjà présent dans com.unity.ugui 2.0.0 (§1.6b — pas un ajout de package).
        [Header("Typography")]
        public TMP_FontAsset primaryFont;  // "DejaVuSans SDF" — Latin/Cyrillic/Greek/Armenian/…

        // ── Écran par écran (un seul consommateur mesuré, gardé nommé plutôt que fondu dans
        //    un palier générique pour ne pas fausser un autre écran plus tard) ────────────────
        [Header("Building Card")]
        public Color buildingCardHintDim;  // (0.45,0.47,0.50) — "peut pas faire ça maintenant"

        [Header("Autonomy")]
        public Color autonomyBlockBg;      // (0.102,0.122,0.133)

        [Header("Lieutenant")]
        public Color lieutenantMutedDeep;  // (0.10,0.12,0.14)

        [Header("Dashboard")]
        public Color dashboardIconDim;     // (0.45,0.49,0.53)

        // ── City Map (sous-palette propre — écran visuellement distinct des 8 opérationnels) ─
        [Header("City Map")]
        public Color mapRootBg;          // (0.10,0.11,0.14,1)
        public Color mapPanelNorth;      // (0.13,0.15,0.20)
        public Color mapPanelSouth;      // (0.18,0.14,0.16)
        public Color mapChipBg;          // (0.22,0.24,0.30)
        public Color mapDialogBg;        // (0.07,0.08,0.11,0.98)
        public Color mapCloseButtonBg;   // (0.32,0.20,0.22)
        public Color mapLabelMuted;      // (0.66,0.68,0.74)
        public Color mapConditionalGrey; // (0.5,0.5,0.55)

        // ── City Map — état de contrôle de district (WorldDtos.ControlColor) ───────────────
        [Header("City Map — Control State")]
        public Color controlUncontested;  // (0.55,0.55,0.58)
        public Color controlContested;    // (0.95,0.74,0.20)
        public Color controlPlayerHeld;   // (0.24,0.70,0.34)
        public Color controlRivalHeld;    // (0.82,0.26,0.26)
        public Color controlUnknown;      // (0.30,0.30,0.32)

        // ── City Map — bucket de chaleur (WorldDtos.HeatColor) ─────────────────────────────
        [Header("City Map — Heat Bucket")]
        public Color heatCold;     // (0.27,0.45,0.72)
        public Color heatWarm;     // (0.93,0.80,0.28)
        public Color heatHot;      // (0.94,0.55,0.20)
        public Color heatBurning;  // (0.86,0.20,0.18)
        public Color heatUnknown;  // (0.35,0.35,0.38)

        // ── City Map — texte lisible sur fond variable (WorldDtos.ReadableTextColor) ────────
        [Header("City Map — Readable Text")]
        public Color readableTextDark;  // (0.1,0.1,0.1)
    }
}
