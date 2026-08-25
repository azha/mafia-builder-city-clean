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
        // W3.U2/C5 (D5, U-3) — l'or quitte le chrome : AppShell.cs repointe l'onglet actif sur CE
        // token, accentGold n'y apparaît plus (allowlist detector : C5-F2). Valeur documentée :
        // #ffd23f (1,0.824,0.247) — reprise TELLE QUELLE d'accentGold, zéro changement de pixel au
        // repointage (patron déjà suivi par ce fichier pour D5 lui-même). A-DA-1 (la VALEUR propre
        // du token, indépendante de son usage) reste un arbitrage OUVERT, hors périmètre de C5.
        public Color chromeTabActive;

        // ── Typographie (W4.P4a/C5) ─────────────────────────────────────────────────────────
        // Remplace la résolution de fonte système raster que les 9 écrans utilisaient
        // (Latin-only — §1.4b du design). SDF, chaîne de repli non-vide (LiberationSans SDF),
        // TMP déjà présent dans com.unity.ugui 2.0.0 (§1.6b — pas un ajout de package).
        [Header("Typography")]
        public TMP_FontAsset primaryFont;  // "DejaVuSans SDF" — Latin/Cyrillic/Greek/Armenian/…
        // HUD v3.1 boucle ⊥ pixel-perfect (2026-08-21) — écart (5) : la maquette utilise
        // `font-family:Georgia,serif` pour l'argent/l'heure-phase/la valeur du manomètre (une
        // transitionnelle de type Georgia/Playfair) ; ce projet ne portait qu'une sans-serif. Créé
        // depuis `/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf` (la serif la plus proche déjà
        // disponible sur la machine de build — voir implementation-notes.md § Deviations pour la
        // mesure comparée). DA4 (TopBarDoctrineV31PlayModeTests) compte ce champ comme le 2e non-
        // Color de `DesignTokens` (`ExpectedTokenCount + 2`, amendé nommément).
        public TMP_FontAsset hudSerifFont; // "DejaVuSerif SDF"

        // ── Écran par écran (un seul consommateur mesuré, gardé nommé plutôt que fondu dans
        //    un palier générique pour ne pas fausser un autre écran plus tard) ────────────────
        [Header("Building Card")]
        public Color buildingCardHintDim;  // (0.45,0.47,0.50) — "peut pas faire ça maintenant"

        [Header("Autonomy")]
        public Color autonomyBlockBg;      // (0.102,0.122,0.133)

        [Header("Lieutenant")]
        public Color lieutenantMutedDeep;  // (0.10,0.12,0.14)
        // "La Famille — l'organigramme" (2026-08-21, maquette ratifiée user) — le dégradé « verre
        // gravé » des panneaux Don/lieutenant/homme. REUSE verbatim de la redéfinition finale de
        // `--tx-panneau` (bloc CSS « DOCTRINE FINALE : VERRE GRAVÉ + TAMPON »,
        // atelier3d-mafia/ecrans-brennar.html:163) — DISTINCT du dégradé de `.barre`
        // (hudBarGlassTop/hudBarGlassBottom) : panneau de carte vs barre HUD, deux surfaces, même
        // doctrine, pas de fusion (cf. gdd/14 §Asset pipeline pour la règle "un token par
        // consommateur mesuré"). Valeur réelle dans DesignTokens.asset uniquement (R2.3).
        public Color lieutenantGlassTop;    // rgba(22,33,53,.58) -> #162135
        public Color lieutenantGlassBottom; // rgba(9,14,24,.74) -> #090e18

        // Le DISQUE du médaillon (`.medl` de la maquette : `radial-gradient(circle at 38% 30%,
        // #243048, #0f1622 66%)`). ⚠️ DEUX JETONS DÉDIÉS, et c'est une leçon payée : le médaillon
        // employait `hudGaugeFaceInner/Outer` — la face du MANOMÈTRE, une autre surface. Un juge ⊥
        // l'a chiffré sans savoir d'où ça venait : disque **32 % plus sombre** et **b−r divisé par
        // deux** (25,8 → 12,7), c'est-à-dire un marine devenu gris-bleu. Deux surfaces distinctes,
        // deux jetons — la règle « un token par consommateur mesuré » de gdd/14 §Asset pipeline.
        public Color lieutenantMedallionInner;  // #243048
        public Color lieutenantMedallionOuter;  // #0f1622

        // Le ROND d'un bouton de la barre d'onglets (`.dockb .rond` de `hud-brennar.html` l.111 :
        // `radial-gradient(circle at 38% 30%, #1d2635, #0d1420 65%)`).
        // ⚠️ DEUX JETONS DÉDIÉS, et c'est la leçon du médaillon appliquée d'avance : ces valeurs
        // sont PROCHES de `lieutenantMedallion*` (#243048/#0f1622) sans être les mêmes. Les
        // confondre reproduirait exactement l'erreur qu'un juge ⊥ vient de chiffrer sur le
        // médaillon. « Un token par consommateur mesuré » (gdd/14 §Asset pipeline).
        public Color dockRondInner;   // #1d2635
        public Color dockRondOuter;   // #0d1420

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

        // ── District — nuit (W3.U2/C5, design §3 C5, U-2) ───────────────────────────────────
        // Le diorama "intérieur de district" nocturne (D8 : palier NUIT rendu inconditionnellement
        // ce lot, les 3 autres paliers différés). R2.3 : AUCUNE valeur ci-dessous — le .asset est
        // la seule source (parité vérifiée par le gate déjà existant, DesignTokensParityPlayModeTests
        // C0-F1/C5-F1). Valeurs attendues documentées en commentaire pour traçabilité uniquement.
        [Header("District Night")]
        public Color nightBackground;          // #10161a approx (0.065,0.088,0.1) — bleu-pétrole
                                                // désaturé (S=0.35 en HSV) — JAMAIS gris (engagement 2,
                                                // C5-F3 : la saturation doit être NON NULLE).
        public Color nightWindowLit;           // (1,0.717,0.15) — fenêtre ambre allumée (binding 1 :
                                                // possédé — D2/D3, §1.5 ligne 1).
        public Color nightNeonGlow;            // (1,0.1,0.7) — néon "ça rapporte" (binding 3 —
                                                // §1.5 ligne 3). Token UNIQUE et générique, pas une
                                                // teinte par `operational_type` — voir la déviation
                                                // consignée pour "néons par type de business" (commit
                                                // de ce chunk : le sujet visuel varie par TYPE de
                                                // business QUI a un néon, pas la COULEUR du néon).
        public Color nightSmoke;               // (0.57,0.585,0.6, alpha 0.35) — fumée d'opération
                                                // active (binding 4 — `activity_band`), translucide.
        public Color nightHaze;                // (0.69,0.72,0.75, alpha 0.2) — brume d'ambiance du
                                                // diorama, translucide, plus claire et plus transparente
                                                // que nightSmoke (deux effets distincts à l'écran).
        public Color nightBase;                // (0.16,0.154,0.147) — socle/plinthe des bâtiments.
        public Color nightOutOfDistrictMuted;  // (0.085,0.087,0.09) — silhouette hors-district,
                                                // délibérément sourde (engagement 5) : plus sombre et
                                                // plus plate que nightBackground.
        public Color nightSocle;               // revue ⊥ r2 (IMPORTANT 4) — socle des bâtiments,
                                                // DISTINCT de nightBase (qui servait à la fois de
                                                // socle et de bucket 2 du sol ⇒ contraste 1,000:1
                                                // une cellule sur trois). Plus sombre que tous les
                                                // buckets de FloorTint.
        public Color nightLieutenantMarker;
        public Color nightFloorAlt;            // revue ⊥ r3 (IMPORTANT 4) — le bucket 1 du sol en
                                                // TOKEN propre : le Lerp RGB entre deux teintes
                                                // opposées (bleu/chaud) fabriquait un gris-vert
                                                // S=6,9 % sur 20 % de l'écran. Plan clair froid de
                                                // l'échelle de sols (b0 sombre froid · b1 clair
                                                // froid · b2 moyen chaud, ratios 1,3-1,9:1).    // revue ⊥ r2 (IMPORTANT 5 de r1 / point 5 de r2) —
                                                // marqueur d'affectation lieutenant, chaud et clair :
                                                // ratio WCAG ≥ 3:1 contre socle ET les 3 buckets de
                                                // sol (falsifiable dédiée, 2 revues l'ont signalé
                                                // invisible à l'œil ET à la sonde).

        // ── HUD v3.1 — boucle ⊥ pixel-perfect (2026-08-21, ruling user) ────────────────────────
        // Root cause du round précédent (Unity 247ed3b) : ces teintes étaient COMPOSÉES par alpha
        // depuis des tokens existants (accentGold, nightBackground/surfaceBase) au lieu de porter
        // les hex EXACTS de la maquette (hud-brennar.html §:root). Sceau des 51 levé nommément pour
        // ce lot — REUSE verbatim, zéro valeur inventée (gdd/14 §Asset pipeline, commit `e171c594`).
        [Header("HUD Bar — glass")]
        public Color hudBarGlassTop;    // #0b111b alpha 0.91 — --or de hud-brennar.html:26, stop haut
        public Color hudBarGlassBottom; // #0d131e alpha 0.847 — stop bas du même dégradé
        [Header("HUD Bar — gold")]
        public Color hudHairlineGold;   // #b08d3e — --laiton (filet bas, anneau médaillon)
        public Color hudMoneyGold;      // #f2c96b — --or-vif (montant $, "l'argent seul or de l'écran")
        public Color hudMoneyUnderlineGold; // #d9ab4e — --or (soulignement décoratif sous le montant ;
                                             // AJOUTÉ tour 2, mesuré directement sur le rendu pixel —
                                             // distinct de hudHairlineGold, voir gdd/14 @8c33ea3b)
        [Header("HUD Bar — gauge")]
        public Color hudGaugeFaceInner; // #2c3242 — stop intérieur radial-gradient(.boitier)
        public Color hudGaugeFaceOuter; // #0a0e16 — stop extérieur radial-gradient(.boitier)
        public Color hudGaugeArcCold;   // #7fd4d9 — --cyan, moitié froide de l'arc
        public Color hudGaugeArcHot;    // #e0664a — --braise, moitié chaude de l'arc (calme, DISTINCT
                                         // de la bascule alarme qui reste sur HeatBucketResolver)
        [Header("HUD Bar — text")]
        public Color hudCreme;          // #eae0c8 — --creme (aiguille, valeur centrale, heure/phase)
        public Color hudCremeSecondary; // #b9ad92 — --creme-2 (légendes petites capitales)
    }
}
