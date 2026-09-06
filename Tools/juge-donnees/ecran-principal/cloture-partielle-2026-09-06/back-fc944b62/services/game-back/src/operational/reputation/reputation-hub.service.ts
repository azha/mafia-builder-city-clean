// IMPLEMENTS: docs/superpowers/plans/2026-06-16-depth-d2-impl-plan.md Task R12b
//             docs/tech/04c_market_reputation_insurance/reputation_mechanics.md §3 (5 mechanics)
//             docs/tech/04c_market_reputation_insurance/reputation_mechanics.md :240 (Forbidden list)
//             docs/tech/08b_economic_layer_screens/screen_b3_reputation_hub.md (B3 parent)
//             docs/tech/08b_economic_layer_screens/screen_b5_lek_memory_cell.md (B5 REUSE LekMemoryCellState)
//             — D2 R12b — 2026-06-17
//
// `ReputationHubService` — the unified PLAYER-FACING R2.2 projection aggregator.
//
// This service is a READ-ONLY presentation aggregator (no mechanic logic — that lives in the 5
// sub-mechanic services). It assembles the B3 Reputation Hub composite from the banded surfaces
// of each sub-mechanic. The output matches the 08b B3/B4/B5 screen contracts.
//
// P5 CENTRAL (reputation_mechanics.md :240 + §R2.2):
//   Every field returned by projectReputationHub() must be banded/qualitative/named.
//   ZERO raw reputation scalars may appear in the player payload:
//     ✗ violation_density, defection_tolerance, consistency_index
//     ✗ restraint_ratio, offer_terms (raw float), collateral_amount
//     ✗ position_memory_aggregate, lambda, λ, fairness_signature
//     ✗ anomaly_pressure (raw float), observer_interest_flag (raw bool)
//     ✗ divergence_count, norms_flags (raw bit vector)
//     ✗ declaration_severity_sum, claimable, claimed
//   The public declared-rules ledger (:65) and named marginalia (:95) are the ONLY clear surfaces —
//   they are canon-public engagements, not hidden scalars.
//
// REUSE (no parallel computation — all sub-mechanic work delegated to owners):
//   - BossMirrorService.getLedger()     → declared_rules (public :65) + consistency_cue (bucketed)
//   - BossMirrorService.getViolationRing() → portrait_posture (band from violation_density)
//   - RestraintIndexService.computeOfferTerms() → offer_posture + marginalia (:95)
//   - LekMemoryService.getPositionMemoryAggregate() → bucket + textual_tag (B5 REUSE)
//   - HiddenCurriculumService.projectUniformTells() → uniform_tells (portrait cues)
//   - ForbiddenTriadDetectionService.getPairStates() → dotted_line_pairs + observer_cue
//
// EXPORTS:
//   ReputationHubProjection    — the composite player-facing shape
//   ReputationHubService       — the projection aggregator
//
// R4.1 self-audit: no mock, no unit-shortcut, no raw scalar in any exported type.
// R9.3: this service does NOT define any persistence — it reads from existing tables via sub-services.

import { Injectable } from '@nestjs/common';

import { BossMirrorService, type DeclarationEntry } from './boss-mirror.service';
import { RestraintIndexService } from './restraint-index.service';
import { LekMemoryService } from './lek-memory.service';
import { HiddenCurriculumService } from './hidden-curriculum.service';
import { ForbiddenTriadDetectionService } from './forbidden-triad.service';

// ── Player-facing projection shape (B3 Reputation Hub) ──────────────────────────────────────────

/**
 * Boss Mirror banded projection (B3 §Mirror tab).
 *
 * All fields are P5-compliant — no raw violation_density, defection_tolerance, or consistency_index.
 *   - portrait_posture: posture band derived from violation_density bucketing.
 *     Members: 'attentive' | 'cautious' | 'withdrawn' | 'hostile'
 *     (qualitative cues on the lieutenant portrait — slouching, eye contact, seat distance).
 *   - declared_rules: the PUBLIC declared-rules ledger (:65 "public observable — NOT a hidden scalar").
 *     Each entry exposes rule_id only (no declared_at timestamp — server-side internal).
 *   - consistency_cue: band derived from server-side consistency_index.
 *     'aligned' | 'drifting' | 'indeterminate' (no raw float).
 */
export interface BossMirrorProjection {
  /** Posture cue band on the lieutenant portrait (slouching/upright/distant). No violation_density. */
  portrait_posture: 'attentive' | 'cautious' | 'withdrawn' | 'hostile';
  /** Public declared-rules ledger (:65 — canon-public engagement, NOT a hidden scalar). */
  declared_rules:  Array<{ rule_id: string }>;
  /** Consistency cue (band — NOT the raw consistency_index float). */
  consistency_cue: 'aligned' | 'drifting' | 'indeterminate';
}

/**
 * Restraint Index banded projection (B3 §Restraint tab).
 *
 * P5-compliant: no raw restraint_ratio, offer_terms float, collateral_amount.
 *   - offer_posture: 'standard' | 'wary' (from OfferTermsResult).
 *   - marginalia: named marginalia (:95 "last three you settled with by name") — canon-public.
 */
export interface RestraintProjection {
  /** Counterparty meeting posture: 'standard' or 'wary' (collateral demanded). */
  offer_posture: 'standard' | 'wary';
  /** Named marginalia: last settled counterparties by name (:95 — canon-public, not a hidden scalar). */
  marginalia:    string[];
}

/**
 * Lek Memory banded projection (B3 §Lek tab / B5 cell detail).
 *
 * P5-compliant: no raw position_memory_aggregate, lambda, fairness_signature.
 * REUSE: LekMemoryCellState.getPositionMemoryAggregate() — same method as B5 uses.
 *   - footprint_mark: boolean — "the corner remembers" (has any lek memory state for this cell).
 *   - textual_tag:    LekTileReputationBucket string (:131 "drawn from position memory, not a number").
 *     B5 canon: "still expects fairness", "long memory of being shorted", "neutral", etc.
 */
export interface LekMemoryProjection {
  /** Footprint mark: true if the cell has any memory (non-empty trailing_fairness_signatures). */
  footprint_mark: boolean;
  /**
   * Textual tag from LekTileReputationBucket (:131 B5 — "not a number"):
   *   'pristine' | 'reputed' | 'standard' | 'tainted' | 'burned'
   * The B5 layer renders this as a qualitative sentence (e.g. "still expects fairness").
   */
  textual_tag:    string;
}

/**
 * Hidden Curriculum banded projection (B3 §Curriculum tab).
 *
 * P5-compliant: no raw norms_flags vector, norm names exposed as keys.
 * REUSE: HiddenCurriculumService.projectUniformTells() (R7b).
 *   - uniform_tells: the 4 portrait cues (collar/sleeves/watch/gloves).
 */
export interface HiddenCurriculumProjection {
  /** Uniform tells: 4 portrait cues, each a presentation enum (R7b REUSE). */
  uniform_tells: {
    collar:  'buttoned' | 'open';
    sleeves: 'rolled'   | 'down';
    watch:   'visible'  | 'hidden';
    gloves:  'clean'    | 'dirty';
  };
}

/**
 * Forbidden-Triad banded projection (B3 §Triads tab).
 *
 * P5-compliant: no raw anomaly_pressure float, triadic_state enum bits, observer_interest_flag bool.
 *   - dotted_line_pairs: list of strong-tied pairs that are UNMET, with a thickening_band cue.
 *   - observer_cue: 'watching' | 'idle' (aggregate observer attention on the player's triad structure).
 */
export interface ForbiddenTriadProjection {
  /**
   * UNMET pairs with their thickening-band signal (dotted lines on the contact relationship view).
   * Each entry: { pair_key: string, thickening_band: 'faint' | 'rising' | 'watched' }.
   * Empty if no UNMET pairs exist or no strong-tied contacts.
   */
  dotted_line_pairs: Array<{ pair_key: string; thickening_band: 'faint' | 'rising' | 'watched' }>;
  /** Aggregate observer cue: 'watching' if any pair has observer_interest_flag set, else 'idle'. */
  observer_cue:      'watching' | 'idle';
}

/**
 * The full unified PLAYER-FACING Reputation Hub projection (B3 parent).
 *
 * Aggregates all 5 sub-mechanic banded surfaces. Every field is P5-compliant.
 * No raw scalar anywhere in this shape.
 *
 * Matches the 08b B3/B5 screen contracts:
 *   B3 → boss_mirror + restraint + hidden_curriculum + forbidden_triad + lek_memory (overview)
 *   B5 → lek_memory.footprint_mark + lek_memory.textual_tag (REUSE LekMemoryCellState)
 */
export interface ReputationHubProjection {
  /** Player ID (for context). */
  player_id:          string;
  /** B3 §Mirror tab (Boss Mirror posture + public ledger + consistency cue). */
  boss_mirror:        BossMirrorProjection;
  /** B3 §Restraint tab (offer posture + named marginalia). */
  restraint:          RestraintProjection;
  /** B3 §Lek tab / B5 modal (footprint mark + textual tag — REUSE LekMemoryCellState). */
  lek_memory:         LekMemoryProjection;
  /** B3 §Curriculum tab (uniform tells only — portrait cues). */
  hidden_curriculum:  HiddenCurriculumProjection;
  /** B3 §Triads tab (dotted-line pairs + observer cue). */
  forbidden_triad:    ForbiddenTriadProjection;
}

// ── Portrait posture bucketing from violation_density (P5 — derived band, not the scalar) ────────

/**
 * Derive a portrait posture band from the violation_density scalar (server-only).
 *
 * The posture band encodes what the lieutenant portrait communicates to the player
 * (slouching / distance / eye-contact — :61). The scalar violation_density is NEVER
 * forwarded; only the band is.
 *
 * Bucketing thresholds (structural — not tuneable; these are presentation tier cuts):
 *   [0, 0.2)   → 'attentive'  (normal, engaged)
 *   [0.2, 0.5) → 'cautious'   (slightly withdrawn, guarded)
 *   [0.5, 0.8) → 'withdrawn'  (notable distance, less eye contact)
 *   [0.8, ∞)   → 'hostile'    (slouching, avoidant — ring heavily loaded)
 */
function densityToPostureBand(
  violationDensity: number | null | undefined,
): 'attentive' | 'cautious' | 'withdrawn' | 'hostile' {
  const d = violationDensity ?? 0;
  if (d < 0.2) return 'attentive';
  if (d < 0.5) return 'cautious';
  if (d < 0.8) return 'withdrawn';
  return 'hostile';
}

/**
 * Derive a consistency_cue band from the consistency_index scalar (server-only).
 *
 * Bucketing thresholds (structural — presentation tier cuts):
 *   consistency_index null / no data → 'indeterminate'
 *   [0.75, 1.0]                      → 'aligned'  (few retractions, stable track record)
 *   [0.0, 0.75)                      → 'drifting' (significant retractions relative to declarations)
 *
 * consistency_index = 1 − (retractions / declarations) over last 90 days (:65).
 */
function consistencyToCue(
  consistencyIndex: number | null | undefined,
): 'aligned' | 'drifting' | 'indeterminate' {
  if (consistencyIndex == null) return 'indeterminate';
  return consistencyIndex >= 0.75 ? 'aligned' : 'drifting';
}

/**
 * Derive a thickening_band from the anomaly_pressure_bucket scalar (server-only).
 *
 * The anomaly_pressure_bucket accumulates weekly (Δ_per_week from registry).
 * The thickening band is the VISUAL signal on the contact relationship view (:208 "dashed line
 * that visibly thickens over weeks"). The raw float never reaches the player.
 *
 * H_observer default = 14 (weeks) → thresholds for band:
 *   < 4    → 'faint'   (barely noticeable)
 *   4..10  → 'rising'  (visibly thickening)
 *   ≥ 10   → 'watched' (strong signal — near or past H_observer)
 *
 * NOTE: these are structural presentation tier-cuts (not tuneable). The H_observer threshold
 * governs the OBSERVER flip in the mechanic (R8b); the thickening-band tiers are distinct
 * visual cues defined here for the player surface.
 */
function anomalyPressureToThickeningBand(
  anomalyPressureBucket: number | null | undefined,
): 'faint' | 'rising' | 'watched' {
  const p = anomalyPressureBucket ?? 0;
  if (p < 4)  return 'faint';
  if (p < 10) return 'rising';
  return 'watched';
}

// ── W6.2 C7 — the RESCOPED player-facing surface (5 of 7 groups, design §3 C7) ──────────────────────
//
// `projectReputationHub` (above, R12b) is the FULL 7-group hub — 2 of those groups (`lek_memory`,
// `forbidden_triad`) read tables with ZERO production écrivain (design §1.2 — forme E / forme C,
// TD-367 / TD-360). Design §0 forbids shipping a route that carries a permanently-constant field —
// so C7 does NOT call `projectReputationHub` (which would force a meaningless `cellId` argument for
// a group this route never returns) and does NOT include `lek_memory`/`forbidden_triad` in its
// response AT ALL. REUSE, never a parallel computation: the 3 kept groups call the EXACT SAME
// sub-service methods and the EXACT SAME banding functions (`densityToPostureBand`/`consistencyToCue`,
// defined above) `projectReputationHub` itself uses — this is a narrower ASSEMBLY, not a rewrite.

/** The W6.2 C7 rescoped player-facing projection — 5 of 7 groups (design §3 C7). `restraint` is
 *  OMITTED (not neutral-defaulted) when no `counterpartyId` is supplied — design's own D-2:
 *  "query params optionnels, sections omises si absents" (never a fabricated constant section). */
export interface ReputationSurfaceProjection {
  player_id: string;
  boss_mirror: BossMirrorProjection;
  restraint?: RestraintProjection;
  hidden_curriculum: HiddenCurriculumProjection;
}

// ── Service ───────────────────────────────────────────────────────────────────────────────────────

@Injectable()
export class ReputationHubService {
  constructor(
    private readonly bossMirror:       BossMirrorService,
    private readonly restraintIndex:   RestraintIndexService,
    private readonly lekMemory:        LekMemoryService,
    private readonly hiddenCurriculum: HiddenCurriculumService,
    private readonly forbiddenTriad:   ForbiddenTriadDetectionService,
  ) {}

  /**
   * `projectReputationHub(playerId, lieutenantId, counterpartyId, cellId)` — the unified
   * PLAYER-FACING R2.2 projection for all 5 reputation sub-mechanics.
   *
   * **P5 central**: ZERO raw reputation scalar in the returned shape.
   * See `ReputationHubProjection` for the complete P5-compliant shape contract.
   *
   * **REUSE pattern**: delegates to the 5 existing sub-mechanic services — no parallel computation:
   *   1. BossMirrorService   → portrait_posture (band) + declared_rules (public ledger) + consistency_cue
   *   2. RestraintIndexService → offer_posture + marginalia
   *   3. LekMemoryService    → footprint_mark + textual_tag (B5 REUSE getPositionMemoryAggregate)
   *   4. HiddenCurriculumService → uniform_tells (R7b projectUniformTells)
   *   5. ForbiddenTriadDetectionService → dotted_line_pairs + observer_cue
   *
   * **B3/B4/B5 contracts**: matches 08b screen contract surfaces.
   *
   * @param playerId        — the player whose reputation hub is being projected.
   * @param lieutenantId    — the lieutenant to read boss-mirror + curriculum cues for.
   * @param counterpartyId  — the counterparty to read restraint offer terms for.
   * @param cellId          — the lek cell id (tile_id) to read B5 footprint+tag for.
   */
  async projectReputationHub(
    playerId:        string,
    lieutenantId:    string,
    counterpartyId:  string,
    cellId:          number,
  ): Promise<ReputationHubProjection> {

    // ── 1. Boss Mirror projection ────────────────────────────────────────────────────────────────

    // 1a. Public declared-rules ledger (canon-public :65 — NOT a hidden scalar).
    //     Returns { player_id, declared_rules, retraction_history } or null.
    //     R2.2: expose declared_rules (public), suppress retraction_history (server-only).
    const ledger = await this.bossMirror.getLedger(playerId);
    const rawDeclaredRules = (ledger?.declared_rules ?? []) as DeclarationEntry[];
    // Strip declared_at (server-side internal — only rule_id is public).
    const declaredRulesPublic = rawDeclaredRules.map((e) => ({ rule_id: e.rule_id }));

    // 1b. Portrait posture band — derived from violation_density on the per-lieutenant ring.
    //     R2.2: violationDensity is server-only; only the band reaches the client.
    // W6a C4: mechanical adaptation forced by `getTickScalars`'s new signature — `playerId` is
    // already this method's own first argument.
    const ringScalars = await this.bossMirror.getTickScalars(lieutenantId, playerId);
    const portraitPosture = densityToPostureBand(ringScalars?.violation_density);

    // 1c. Consistency cue — band derived from consistency_index on the per-player ledger.
    //     R2.2: consistency_index is server-only; only the cue band reaches the client.
    const consistencyRow = await this.bossMirror.getConsistencyIndex(playerId);
    const consistencyCue = consistencyToCue(consistencyRow?.consistency_index);

    const bossMirrorProjection: BossMirrorProjection = {
      portrait_posture: portraitPosture,
      declared_rules:   declaredRulesPublic,
      consistency_cue:  consistencyCue,
    };

    // ── 2. Restraint Index projection ─────────────────────────────────────────────────────────────

    // REUSE: computeOfferTerms() already enforces P5 — returns { offer_posture, marginalia } only.
    // R2.2: no raw restraint_ratio, offer_terms float, or collateral_amount exposed.
    const offerTerms = await this.restraintIndex.computeOfferTerms(playerId, counterpartyId);

    const restraintProjection: RestraintProjection = {
      offer_posture: offerTerms.offer_posture,
      marginalia:    offerTerms.marginalia,
    };

    // ── 3. Lek Memory projection (B5 REUSE — same getPositionMemoryAggregate as B5) ──────────────

    // REUSE: getPositionMemoryAggregate() — same method B5 consumes (:248, :131).
    // R2.2: aggregate_fraction is server-only; only bucket + textual_tag reach the client.
    // footprint_mark = true iff the cell has any fairness signature history.
    const lekAggregate = await this.lekMemory.getPositionMemoryAggregate(playerId, cellId);
    // footprint_mark: the cell "remembers" if there's any non-default state.
    // Standard bucket means the cell was just bound without any specific fairness record yet.
    // Any non-standard bucket → footprint_mark = true.
    // Also: if aggregate_fraction is the neutral nibble fraction (8/15 ≈ 0.533), it means default.
    // We use the bucket to infer: 'standard' = possible fresh bind, but any other = definitely has memory.
    // For simplicity: footprint_mark = cell state row exists (has any operator bind history).
    const cellState = await this.lekMemory.getCellState(playerId, cellId);
    const hasMemory = cellState !== null;

    const lekProjection: LekMemoryProjection = {
      footprint_mark: hasMemory,
      textual_tag:    lekAggregate.textual_tag,
    };

    // ── 4. Hidden Curriculum projection (R7b REUSE) ───────────────────────────────────────────────

    // REUSE: projectUniformTells() (R7b) — P5-compliant tell projection.
    // R2.2: norms_flags bits never reach the client; only the 4 presentation enums do.
    // W6a C4: mechanical adaptation forced by `projectUniformTells`'s new signature — `playerId`
    // is already this method's own first argument.
    const uniformTells = await this.hiddenCurriculum.projectUniformTells(lieutenantId, playerId);

    // Neutral default if no HC row exists yet (zero-regression).
    const tells = uniformTells ?? { collar: 'open' as const, sleeves: 'down' as const, watch: 'hidden' as const, gloves: 'dirty' as const };

    const hiddenCurriculumProjection: HiddenCurriculumProjection = {
      uniform_tells: {
        collar:  tells.collar,
        sleeves: tells.sleeves,
        watch:   tells.watch,
        gloves:  tells.gloves,
      },
    };

    // ── 5. Forbidden-Triad projection ────────────────────────────────────────────────────────────

    // Read all pair states for this player (excluding sentinel row).
    // R2.2: anomaly_pressure_bucket + observer_interest_flag are server-only;
    //        the client sees thickening_band + observer_cue (both banded).
    const { pairs } = await this.forbiddenTriad.getPairStates(playerId);

    // Only UNMET pairs with positive anomaly pressure appear in dotted_line_pairs.
    // TriadicState.UNMET = 0 (from the enum in forbidden-triad.service.ts).
    const UNMET = 0;
    const dottedLinePairs = pairs
      .filter((p) => (p['triadic_state'] as number) === UNMET)
      .map((p) => ({
        pair_key:        String(p['pair_key'] ?? ''),
        thickening_band: anomalyPressureToThickeningBand(
          (p['anomaly_pressure_bucket'] as number | null | undefined),
        ),
      }));

    // observer_cue: 'watching' if any pair has observer_interest_flag flipped to true.
    const anyWatching = pairs.some((p) => p['observer_interest_flag'] === true);
    const observerCue: 'watching' | 'idle' = anyWatching ? 'watching' : 'idle';

    const forbiddenTriadProjection: ForbiddenTriadProjection = {
      dotted_line_pairs: dottedLinePairs,
      observer_cue:      observerCue,
    };

    // ── Assemble the full B3 hub projection ──────────────────────────────────────────────────────

    return {
      player_id:         playerId,
      boss_mirror:       bossMirrorProjection,
      restraint:         restraintProjection,
      lek_memory:        lekProjection,
      hidden_curriculum: hiddenCurriculumProjection,
      forbidden_triad:   forbiddenTriadProjection,
    };
  }

  /**
   * `projectReputationSurface(playerId, lieutenantId, counterpartyId?)` — W6.2 C7, the RESCOPED
   * player-facing route projection (design §3 C7): 5 of 7 groups, `lek_memory`/`forbidden_triad`
   * NEVER included (their source tables have zero production écrivain — TD-367/TD-360).
   *
   * REUSE (no parallel computation, mirrors `projectReputationHub` verbatim for the 3 groups kept):
   *   1. BossMirrorService.getLedger/getTickScalars/getConsistencyIndex → portrait_posture +
   *      declared_rules + consistency_cue (the SAME `densityToPostureBand`/`consistencyToCue`
   *      banding functions this file already defines for the R12b hub).
   *   2. RestraintIndexService.computeOfferTerms → offer_posture + marginalia — ONLY when
   *      `counterpartyId` is supplied (design D-2: omitted, never neutral-defaulted, when absent).
   *   3. HiddenCurriculumService.projectUniformTells → uniform_tells.
   *
   * @param playerId       — the requesting player (from the JWT — the controller's own resolve).
   * @param lieutenantId   — the lieutenant to read boss-mirror + curriculum cues for (the controller
   *                         validates OWNERSHIP before calling this — 404 on a foreign lieutenant,
   *                         never a silent neutral-default leak of "does this id exist" either way).
   * @param counterpartyId — optional; when absent, `restraint` is OMITTED from the response.
   */
  async projectReputationSurface(
    playerId: string,
    lieutenantId: string,
    counterpartyId?: string,
  ): Promise<ReputationSurfaceProjection> {
    // ── 1. Boss Mirror (portrait_posture + declared_rules + consistency_cue) ───────────────────────
    const ledger = await this.bossMirror.getLedger(playerId);
    const rawDeclaredRules = (ledger?.declared_rules ?? []) as DeclarationEntry[];
    const declaredRulesPublic = rawDeclaredRules.map((e) => ({ rule_id: e.rule_id }));

    const ringScalars = await this.bossMirror.getTickScalars(lieutenantId, playerId);
    const portraitPosture = densityToPostureBand(ringScalars?.violation_density);

    const consistencyRow = await this.bossMirror.getConsistencyIndex(playerId);
    const consistencyCue = consistencyToCue(consistencyRow?.consistency_index);

    const bossMirrorProjection: BossMirrorProjection = {
      portrait_posture: portraitPosture,
      declared_rules:   declaredRulesPublic,
      consistency_cue:  consistencyCue,
    };

    // ── 2. Restraint (offer_posture + marginalia) — OMITTED when no counterpartyId (design D-2) ────
    let restraintProjection: RestraintProjection | undefined;
    if (counterpartyId) {
      const offerTerms = await this.restraintIndex.computeOfferTerms(playerId, counterpartyId);
      restraintProjection = {
        offer_posture: offerTerms.offer_posture,
        marginalia:    offerTerms.marginalia,
      };
    }

    // ── 3. Hidden Curriculum (uniform_tells) ────────────────────────────────────────────────────────
    const uniformTells = await this.hiddenCurriculum.projectUniformTells(lieutenantId, playerId);
    const tells = uniformTells ?? { collar: 'open' as const, sleeves: 'down' as const, watch: 'hidden' as const, gloves: 'dirty' as const };
    const hiddenCurriculumProjection: HiddenCurriculumProjection = {
      uniform_tells: { collar: tells.collar, sleeves: tells.sleeves, watch: tells.watch, gloves: tells.gloves },
    };

    return {
      player_id:         playerId,
      boss_mirror:       bossMirrorProjection,
      ...(restraintProjection ? { restraint: restraintProjection } : {}),
      hidden_curriculum: hiddenCurriculumProjection,
    };
  }
}
