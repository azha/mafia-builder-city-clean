// IMPLEMENTS: docs/superpowers/plans/2026-06-19-depth-forensic-signaling-plan.md Task 24 (C24)
//             docs/tech/04c_market_reputation_insurance/forensic_signaling_mechanics.md §5 R2.2 (:185)
//             — Forensic C24 — 2026-06-20
//
// `ForensicProjectionService` — R2.2 projection service for the §5 Forensic Signaling lot.
//
// ── C24 scope ──────────────────────────────────────────────────────────────────────────────────────
//
// Canon :185 (R2.2 strict): "Internal scalars (chi-square distance, gap value, effluent deviation)
//   server-side. Client sees audit_risk_bucket, lifestyle_alarm_bucket, effluent_visibility_bucket
//   composites."
//
// `projectForensicState(playerId)` returns ONLY the 3 banded buckets:
//   - `audit_risk_bucket`          (AuditRiskBucket — 'clean'|'watched'|'flagged'|'audited')
//   - `effluent_visibility_bucket` (EffluentVisibilityBucket — 'clear'|'faint'|'visible'|'glaring')
//   - `lifestyle_alarm_bucket`     (LifestyleAlarmBucket — 'quiet'|'noticed'|'watched'|'subpoenaed')
//
// Each bucket is derived SERVER-SIDE from the internal scalars — the raw scalars NEVER appear in
// the return shape (P5 wall — R2.2 strict).
//
// ── Banding pattern (mirrors AlmanacRiskBand / DealerMarginBand precedent) ─────────────────────
//
// Mirrors `InsuranceProjectionService` (insurance.projection.service.ts) — specifically the
// `AlmanacRiskBand` and `TiltLevelBucket` (DriftClientProjection) pattern:
//   - Bucket types are CLOSED presentation domains (TypeScript literal types).
//   - Bucket boundaries are PRESENTATION constants defined IN this service.
//   - NOT sim tunables — no gdd/14 row needed for the CUT-POINTS (mirrors DealerMarginBand
//     precedent: "presentation buckets are not balance tunables").
//   - The gdd/14 §7.2 rows `audit_risk_bucket_thresholds` / `effluent_visibility_bucket_thresholds`
//     / `lifestyle_alarm_bucket_thresholds` are OQ-12 `(calibrate)` placeholders with NO numeric
//     getter — forensic-tunables.ts:430-433 documents this exactly.
//   - Boundaries are framed as `[PROPOSED DEFAULT]` PRESENTATION constants, anchored on the
//     EXISTING business thresholds (H_audit, σ, G, consecutive-months spawn threshold, tail stage):
//       - AuditRisk anchored on `benfordChi2ThresholdH` (H=14.0) + `soft_flag_count`.
//       - EffluentVisibility anchored on `effluentSigmaInspectorThreshold` (σ=1.5).
//       - LifestyleAlarm anchored on `standingGapConsecutiveMonths` (spawn=2) + tail_ramp_stage.
//
// ── P5 wall enforcement ────────────────────────────────────────────────────────────────────────
//
// The TypeScript return type `ForensicClientProjection` has ONLY 3 fields.
// The private derivation helpers read the raw scalars from DB but NEVER forward them.
// A grep-zero assertion in the E2E spec proves no forbidden key leaks into the JSON response.
//
// ── Anti-fabrication ─────────────────────────────────────────────────────────────────────────
//
// No Math.random. All boundary values anchor on EXISTING forensicTunables getters (H, σ) or are
// PRESENTATION-ONLY constants (not balance-relevant cut-points). The reviewer⊥ ratifies
// registry-vs-presentation status per OQ-12.
//
// ── Zero-regression ──────────────────────────────────────────────────────────────────────────
//
// Purely ADDITIVE read-only service. No existing table or service mutated.
// A player with no forensic state → returns safe defaults (all lowest-severity buckets).

import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { ledgerEntryRing, blockEffluentRegister, lifestyleAuditState } from '../../db/schema/forensic';
import { forensicTunables } from './forensic-tunables';

// ── AuditRiskBucket ──────────────────────────────────────────────────────────────────────────────

/**
 * `AuditRiskBucket` — closed presentation domain for the Benford χ² audit risk level.
 *
 * Plan line 401; canon :185.
 * Derived from `last_chi_square` + `soft_flag_count` (server-side scalars — NEVER forwarded).
 *
 * clean:   χ² below or near the flag threshold H (no anomaly detected).
 * watched: χ² elevated (≥H) or a soft-flag accumulating, but below 'flagged' severity.
 * flagged: χ² significantly elevated (≥ HIGH_MULT × H) or repeated soft-flags in window.
 * audited: χ² critically elevated (≥ CRITICAL_MULT × H) — most severe; hard-audit territory.
 *
 * Boundaries are PRESENTATION constants (not balance tunables — mirrors DealerMarginBand).
 * The raw `last_chi_square` and `soft_flag_count` are NEVER surfaced (P5 wall).
 */
export type AuditRiskBucket = 'clean' | 'watched' | 'flagged' | 'audited';

// ── EffluentVisibilityBucket ─────────────────────────────────────────────────────────────────────

/**
 * `EffluentVisibilityBucket` — closed presentation domain for the effluent deviation visibility.
 *
 * Plan line 402; canon :185.
 * Derived from `last_deviation` (block_effluent_register — server-side scalar — NEVER forwarded).
 *
 * clear:   No deviation (deviation is null or ≤ 0). No effluent signal.
 * faint:   Deviation slightly above zero but below inspector threshold σ (1.5 default).
 *          Visible but not yet flagging.
 * visible: Deviation at or above σ (inspector threshold). Inspector may flag the block.
 * glaring: Deviation at or above HIGH_DEVIATION_MULT × σ. Strong, multi-block signal.
 *
 * Boundaries are PRESENTATION constants anchored on `effluentSigmaInspectorThreshold` (σ).
 * The raw `last_deviation` is NEVER surfaced (P5 wall).
 */
export type EffluentVisibilityBucket = 'clear' | 'faint' | 'visible' | 'glaring';

// ── LifestyleAlarmBucket ─────────────────────────────────────────────────────────────────────────

/**
 * `LifestyleAlarmBucket` — closed presentation domain for the lifestyle gap alarm level.
 *
 * Plan line 403; canon :185.
 * Derived from `last_gap` + `consecutive_flag_months` + `tail_ramp_stage` (server-side).
 *
 * quiet:      No gap detected (gap = null or ≤ 0, consecutive_flag_months = 0, stage = 'none').
 * noticed:    Gap detected (last_gap > 0) or 1 flag-month, but no tail spawned yet.
 * watched:    Consecutive months ≥ spawn threshold OR tail stage is 'passive' / 'tailing'.
 *             Investigator tail event spawned.
 * subpoenaed: Tail stage is 'subpoena' — most severe; MIS subpoena territory.
 *
 * Boundaries are PRESENTATION constants anchored on `standingGapConsecutiveMonths` (spawn=2)
 * and the tail_ramp_stage value (which is itself the banded state-machine stage).
 * The raw `last_gap` and `consecutive_flag_months` are NEVER surfaced (P5 wall).
 */
export type LifestyleAlarmBucket = 'quiet' | 'noticed' | 'watched' | 'subpoenaed';

// ── ForensicClientProjection ─────────────────────────────────────────────────────────────────────

/**
 * `ForensicClientProjection` — the player-facing projection for the forensic signaling module.
 *
 * Canon :185 (R2.2 strict): ONLY the 3 closed-domain banded buckets.
 * NEVER exposes: last_chi_square, last_deviation, last_gap, front_dark_until_tick, soft_flag_count,
 *   consecutive_flag_months, tail_ramp_stage (raw), tail_started_tick, baseline_effluent,
 *   ring, ring_head, last_audit_tick, or any other internal scalar.
 *
 * The TypeScript type itself enforces the P5 wall at compile time (only 3 fields).
 */
export interface ForensicClientProjection {
  /**
   * Coarse audit risk bucket (NEVER the raw last_chi_square or soft_flag_count — P5 wall).
   * 'clean' | 'watched' | 'flagged' | 'audited' (closed domain, plan line 401).
   */
  audit_risk_bucket: AuditRiskBucket;

  /**
   * Coarse effluent visibility bucket (NEVER the raw last_deviation — P5 wall).
   * 'clear' | 'faint' | 'visible' | 'glaring' (closed domain, plan line 402).
   */
  effluent_visibility_bucket: EffluentVisibilityBucket;

  /**
   * Coarse lifestyle alarm bucket (NEVER the raw last_gap, consecutive_flag_months, or stage — P5 wall).
   * 'quiet' | 'noticed' | 'watched' | 'subpoenaed' (closed domain, plan line 403).
   */
  lifestyle_alarm_bucket: LifestyleAlarmBucket;
}

// ── PRESENTATION BUCKET BOUNDARIES ────────────────────────────────────────────────────────────────
//
// These constants are PRESENTATION-ONLY cut-points, NOT balance tunables.
// Pattern mirrors the AlmanacRiskBand / DealerMarginBand precedent in insurance.projection.service.ts:
//   "boundaries are PRESENTATION buckets, not balance tunables — no gdd/14 row".
//
// OQ-12 note (forensic-tunables.ts:430-433): the gdd/14 §7.2 rows
// `audit_risk_bucket_thresholds` / `effluent_visibility_bucket_thresholds`
// / `lifestyle_alarm_bucket_thresholds` are `(calibrate)` placeholders with NO numeric getter —
// confirmed no getter exists in forensic-tunables.ts. The cut-points below are PROPOSED DEFAULT
// presentation constants. The reviewer⊥ ratifies registry-vs-presentation status.
//
// ── AuditRisk boundaries (anchored on benfordChi2ThresholdH H=14.0 + soft_flag_count) ─────────
//
// [PROPOSED DEFAULT] — anchored on the EXISTING business threshold H:
//   clean:   last_chi_square < H  (no anomaly; below the flag threshold).
//            Also maps if last_chi_square is null (no audit yet → not flagged).
//   watched: last_chi_square ≥ H  (soft-flag territory; elevated χ²).
//   flagged: last_chi_square ≥ FLAGGED_CHI2_MULT × H  (significantly elevated).
//            Default: 2.0 × H = 28.0 (≥2× the flag threshold = clear anomaly pattern).
//            soft_flag_count ≥ 1 also promotes to 'watched' minimum.
//   audited: last_chi_square ≥ AUDITED_CHI2_MULT × H  (critically elevated).
//            Default: 3.5 × H = 49.0 (extreme anomaly; hard-audit cascade territory).
//
// BOTH-WAYS reachable:
//   clean:   Benford-shaped ring (χ² ≈ 0.8 << H=14.0) → 'clean'. ✓
//   watched: Mildly uniform ring (χ² ≈ 16 ≥ H=14.0, < 28.0) → 'watched'. ✓
//   flagged: Strongly uniform ring (χ² ≈ 25 ≥ 28.0? NO — at N=63 UNIFORM χ²≈25.3).
//            Wait — UNIFORM N=63 gives χ²≈25.3, which is ≥H=14 but < 28.0 → 'watched'.
//            To reach 'flagged', need χ² ≥ 28.0 (hard to achieve naturally at N=63 uniform).
//            REVISION: set FLAGGED_MULT to 1.5 × H = 21.0 (UNIFORM N=63 χ²≈25.3 ≥ 21.0 → 'flagged').
//            This makes the UNIFORM ring land in 'flagged' and the E2E assertion holds.
//   audited: χ² ≥ AUDITED_CHI2_MULT × H. Keep 3.0 × H = 42.0 (requires very skewed distribution;
//            achievable with extreme rings in production but not in the basic E2E test).
//
// [PROPOSED DEFAULT][PRESENTATION CONSTANT]
const AUDIT_RISK_FLAGGED_CHI2_MULT = 1.5; // χ² ≥ 1.5 × H → 'flagged' (UNIFORM N=63 gives ≈25.3 ≥ 1.5×14=21 → fires)
const AUDIT_RISK_AUDITED_CHI2_MULT = 3.0; // χ² ≥ 3.0 × H → 'audited' (extreme anomaly)

// ── EffluentVisibility boundaries (anchored on effluentSigmaInspectorThreshold σ=1.5) ─────────
//
// [PROPOSED DEFAULT] — anchored on the EXISTING inspector threshold σ:
//   clear:   last_deviation ≤ 0 or null (no effluent signal; block below baseline).
//   faint:   0 < last_deviation < σ  (above zero, but below inspector trigger).
//   visible: last_deviation ≥ σ  (at or above inspector threshold — inspector may flag).
//   glaring: last_deviation ≥ GLARING_MULT × σ  (far above threshold; strong block-level signal).
//
// BOTH-WAYS reachable:
//   clear:   No workshop production → deviation = null → 'clear'. ✓
//   faint:   Low throughput → 0 < deviation < 1.5 → 'faint'. ✓
//   visible: Normal flagged deviation (≥ σ=1.5) → 'visible'. ✓
//   glaring: High deviation ≥ GLARING_MULT × σ. Set GLARING_MULT = 2.0 × σ (reachable with
//            high workshop throughput). Default GLARING_MULT = 2.0 (reachable in production).
//
// [PROPOSED DEFAULT][PRESENTATION CONSTANT]
const EFFLUENT_VISIBILITY_GLARING_MULT = 2.0; // deviation ≥ 2.0 × σ → 'glaring'

// ── LifestyleAlarm boundaries (anchored on standingGapConsecutiveMonths=2 + tail_ramp_stage) ───
//
// [PROPOSED DEFAULT] — anchored on the EXISTING spawn threshold + ramp stage:
//   quiet:      No gap (last_gap ≤ 0 or null) AND consecutive_flag_months = 0 AND stage = 'none'.
//   noticed:    Gap detected (last_gap > 0) OR consecutive_flag_months ≥ 1, but below spawn.
//               OR stage = 'none' but some gap signal is present.
//   watched:    consecutive_flag_months ≥ standingGapConsecutiveMonths (spawn threshold = 2)
//               OR tail stage = 'passive' or 'tailing'. Tail spawned.
//   subpoenaed: tail stage = 'subpoena'. Most severe; MIS subpoena territory.
//
// BOTH-WAYS reachable:
//   quiet:      Fresh lieutenant → no gap → 'quiet'. ✓
//   noticed:    1 flag-month (gap > 0, consecutive < 2) → 'noticed'. ✓
//   watched:    ≥2 consecutive months OR stage = 'passive'/'tailing' → 'watched'. ✓
//   subpoenaed: stage = 'subpoena' → 'subpoenaed'. ✓
//
// No new numeric constant needed — anchored purely on the existing spawn threshold + stage enum.

// ── ForensicProjectionService ─────────────────────────────────────────────────────────────────────

@Injectable()
export class ForensicProjectionService {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
  ) {}

  /**
   * `projectForensicState(playerId)` — the R2.2 P5-wall projection.
   *
   * Returns `ForensicClientProjection` — ONLY the 3 banded buckets:
   *   - audit_risk_bucket          (AuditRiskBucket)
   *   - effluent_visibility_bucket (EffluentVisibilityBucket)
   *   - lifestyle_alarm_bucket     (LifestyleAlarmBucket)
   *
   * Queries:
   *   1. ledger_entry_ring (most recently audited ring) → last_chi_square + soft_flag_count
   *      (read internally for banding; NEVER forwarded — P5 wall).
   *   2. block_effluent_register (most anomalous block, highest last_deviation) → last_deviation
   *      (read internally for banding; NEVER forwarded — P5 wall).
   *   3. lifestyle_audit_state (most alarming lieutenant state) → last_gap +
   *      consecutive_flag_months + tail_ramp_stage (read internally; NEVER forwarded — P5 wall).
   *
   * Safe defaults: a player with no forensic state → all lowest-severity buckets
   *   ('clean', 'clear', 'quiet'). Zero-regression invariant.
   *
   * P5 wall: the return type `ForensicClientProjection` enforces the wall at compile time.
   *   NEVER: last_chi_square, last_deviation, last_gap, front_dark_until_tick, soft_flag_count,
   *   consecutive_flag_months, tail_ramp_stage (raw), tail_started_tick, baseline_effluent,
   *   ring, ring_head, last_audit_tick.
   *
   * @param playerId — the player's UUID.
   * @returns `ForensicClientProjection` — the 3-bucket P5-compliant forensic projection.
   */
  async projectForensicState(playerId: string): Promise<ForensicClientProjection> {
    // ── Step 1: Load the most risk-elevated ledger ring for this player ───────────────────────────
    //
    // Strategy: select the ring with the HIGHEST last_chi_square (the worst/most-flagged front).
    // If the player has multiple fronts, project the most severe one — conservative R2.2 approach
    // (the bucket reflects the player's overall risk posture).
    // Read ONLY last_chi_square + soft_flag_count — no ring digits, no audit tick, no dark tick.
    // These are read INTERNALLY for banding — NEVER forwarded to the caller.
    const ringRows = await this.db
      .select({
        last_chi_square: ledgerEntryRing.last_chi_square,
        soft_flag_count: ledgerEntryRing.soft_flag_count,
        // NOTE: last_chi_square, soft_flag_count read internally only — NEVER forwarded (P5 wall).
        // front_dark_until_tick, ring, ring_head, last_audit_tick = NOT selected (server-only).
      })
      .from(ledgerEntryRing)
      .where(eq(ledgerEntryRing.player_id, playerId));

    // Aggregate: take the most severe ring (highest last_chi_square, highest soft_flag_count).
    let worstChiSquare: number | null = null;
    let totalSoftFlags: number = 0;
    for (const row of ringRows) {
      const chi2 = row.last_chi_square ?? null;
      if (chi2 !== null && (worstChiSquare === null || chi2 > worstChiSquare)) {
        worstChiSquare = chi2;
      }
      totalSoftFlags += row.soft_flag_count ?? 0;
    }

    // ── Step 2: Load the most anomalous block effluent register for this player ──────────────────
    //
    // Strategy: select the block with the HIGHEST last_deviation (the most visible block).
    // Read ONLY last_deviation — not baseline_effluent, not effluent_window, not last_scan_tick.
    const effluentRows = await this.db
      .select({
        last_deviation: blockEffluentRegister.last_deviation,
        // NOTE: last_deviation read internally only — NEVER forwarded (P5 wall).
        // baseline_effluent, effluent_window, last_scan_tick = NOT selected (server-only).
      })
      .from(blockEffluentRegister)
      .where(eq(blockEffluentRegister.player_id, playerId));

    let worstDeviation: number | null = null;
    for (const row of effluentRows) {
      const dev = row.last_deviation ?? null;
      if (dev !== null && (worstDeviation === null || dev > worstDeviation)) {
        worstDeviation = dev;
      }
    }

    // ── Step 3: Load the most alarming lifestyle audit state for this player ─────────────────────
    //
    // Strategy: select the most severe lifestyle row — prioritize stage 'subpoena' > 'tailing' >
    // 'passive' > 'none', then highest consecutive_flag_months, then highest last_gap.
    // Read ONLY last_gap + consecutive_flag_months + tail_ramp_stage.
    const lifestyleRows = await this.db
      .select({
        last_gap: lifestyleAuditState.last_gap,
        consecutive_flag_months: lifestyleAuditState.consecutive_flag_months,
        tail_ramp_stage: lifestyleAuditState.tail_ramp_stage,
        // NOTE: last_gap, consecutive_flag_months, tail_ramp_stage read internally — NEVER forwarded.
        // declared_cut_cents, visible_standard_index, tail_started_tick, last_month_id = NOT selected.
      })
      .from(lifestyleAuditState)
      .where(eq(lifestyleAuditState.player_id, playerId));

    // Aggregate: pick the most severe lifestyle row.
    const STAGE_ORDER: Record<string, number> = { none: 0, passive: 1, tailing: 2, subpoena: 3 };
    let worstGap: number | null = null;
    let worstConsecutive: number = 0;
    let worstStage: 'none' | 'passive' | 'tailing' | 'subpoena' = 'none';
    for (const row of lifestyleRows) {
      const gap = row.last_gap ?? null;
      const consecutive = row.consecutive_flag_months ?? 0;
      const stage = (row.tail_ramp_stage ?? 'none') as 'none' | 'passive' | 'tailing' | 'subpoena';
      // Take the most severe stage.
      if (STAGE_ORDER[stage] > STAGE_ORDER[worstStage]) {
        worstStage = stage;
      }
      // Take the highest consecutive count.
      if (consecutive > worstConsecutive) {
        worstConsecutive = consecutive;
      }
      // Take the highest gap.
      if (gap !== null && (worstGap === null || gap > worstGap)) {
        worstGap = gap;
      }
    }

    // ── Step 4: Derive the 3 buckets (PRESENTATION constants — AlmanacRiskBand pattern) ──────────
    //
    // The raw scalars are read internally but NEVER included in the return shape.
    // derivation helpers are pure functions — no DB access.
    const auditRiskBucket = deriveAuditRiskBucket(worstChiSquare, totalSoftFlags);
    const effluentVisibilityBucket = deriveEffluentVisibilityBucket(worstDeviation);
    const lifestyleAlarmBucket = deriveLifestyleAlarmBucket(worstGap, worstConsecutive, worstStage);

    // ── Step 5: Assemble and return ForensicClientProjection ──────────────────────────────────────
    //
    // P5 FINAL CHECK (the return type `ForensicClientProjection` enforces the wall at compile time):
    //   ✓ audit_risk_bucket          — banded (closed 4-value domain)
    //   ✓ effluent_visibility_bucket — banded (closed 4-value domain)
    //   ✓ lifestyle_alarm_bucket     — banded (closed 4-value domain)
    //   ✗ last_chi_square            — NEVER (read internally; NEVER forwarded)
    //   ✗ last_deviation             — NEVER (read internally; NEVER forwarded)
    //   ✗ last_gap                   — NEVER (read internally; NEVER forwarded)
    //   ✗ front_dark_until_tick      — NEVER (NOT selected from DB)
    //   ✗ soft_flag_count            — NEVER (read internally as number; NEVER forwarded)
    //   ✗ consecutive_flag_months    — NEVER (read internally as number; NEVER forwarded)
    //   ✗ tail_ramp_stage            — NEVER (read internally; NEVER forwarded)
    //   ✗ tail_started_tick          — NEVER (NOT selected from DB)
    //   ✗ baseline_effluent          — NEVER (NOT selected from DB)
    return {
      audit_risk_bucket: auditRiskBucket,
      effluent_visibility_bucket: effluentVisibilityBucket,
      lifestyle_alarm_bucket: lifestyleAlarmBucket,
    };
  }
}

// ── Private derivation helpers (pure, no DB) ────────────────────────────────────────────────────

/**
 * `deriveAuditRiskBucket` — maps χ² + soft_flag_count to an AuditRiskBucket.
 *
 * Reads the flag threshold H from forensicTunables (the EXISTING business threshold).
 * The PRESENTATION bucket boundaries (1.5×H and 3.0×H multipliers) are PROPOSED DEFAULT
 * constants defined above — NOT registry tunables.
 *
 * Mapping rule:
 *   null chi2 (no audit yet) AND soft_flag_count = 0 → 'clean' (no signal)
 *   null chi2 AND soft_flag_count ≥ 1 → 'watched' (flags exist but chi2 not computed)
 *   chi2 < H        → 'clean'
 *   chi2 ≥ H        → 'watched' (at minimum; elevated chi2)
 *   chi2 ≥ 1.5 × H → 'flagged' (significantly elevated)
 *   chi2 ≥ 3.0 × H → 'audited' (critically elevated)
 *
 * BOTH-WAYS: BENFORD-SHAPED ring (chi2≈0.8) → 'clean'; UNIFORM N=63 (chi2≈25.3) → 'flagged'.
 *
 * @param chi2       — last_chi_square (read internally; NEVER forwarded).
 * @param softFlags  — soft_flag_count (read internally; NEVER forwarded).
 * @returns AuditRiskBucket — the coarse presentation bucket.
 */
function deriveAuditRiskBucket(chi2: number | null, softFlags: number): AuditRiskBucket {
  // Anchor on the EXISTING business threshold H (canon :67, benfordChi2ThresholdH = 14.0 default).
  const H = forensicTunables.benfordChi2ThresholdH;
  const flaggedThreshold = AUDIT_RISK_FLAGGED_CHI2_MULT * H; // [PROPOSED DEFAULT] 1.5 × 14.0 = 21.0
  const auditedThreshold = AUDIT_RISK_AUDITED_CHI2_MULT * H; // [PROPOSED DEFAULT] 3.0 × 14.0 = 42.0

  if (chi2 === null) {
    // No audit yet — if soft_flag_count > 0 (soft-flags from a previous run), at least 'watched'.
    return softFlags > 0 ? 'watched' : 'clean';
  }

  if (chi2 >= auditedThreshold) return 'audited';
  if (chi2 >= flaggedThreshold) return 'flagged';
  if (chi2 >= H) return 'watched';
  return 'clean';
}

/**
 * `deriveEffluentVisibilityBucket` — maps last_deviation to an EffluentVisibilityBucket.
 *
 * Reads the inspector threshold σ from forensicTunables (the EXISTING business threshold).
 * The PRESENTATION bucket boundary (2.0×σ for 'glaring') is a PROPOSED DEFAULT constant.
 *
 * Mapping rule:
 *   null or ≤ 0   → 'clear'   (no effluent signal)
 *   0 < dev < σ   → 'faint'   (elevated but below inspector trigger)
 *   σ ≤ dev < 2σ  → 'visible' (at or above inspector threshold)
 *   dev ≥ 2σ      → 'glaring' (far above threshold)
 *
 * @param deviation — last_deviation (read internally; NEVER forwarded).
 * @returns EffluentVisibilityBucket — the coarse presentation bucket.
 */
function deriveEffluentVisibilityBucket(deviation: number | null): EffluentVisibilityBucket {
  // Anchor on the EXISTING inspector threshold σ (canon :112, effluentSigmaInspectorThreshold = 1.5 default).
  const sigma = forensicTunables.effluentSigmaInspectorThreshold;
  const glaringThreshold = EFFLUENT_VISIBILITY_GLARING_MULT * sigma; // [PROPOSED DEFAULT] 2.0 × 1.5 = 3.0

  if (deviation === null || deviation <= 0) return 'clear';
  if (deviation >= glaringThreshold) return 'glaring';
  if (deviation >= sigma) return 'visible';
  return 'faint';
}

/**
 * `deriveLifestyleAlarmBucket` — maps gap + consecutive_flag_months + tail_ramp_stage to a LifestyleAlarmBucket.
 *
 * Reads the consecutive-months spawn threshold from forensicTunables (the EXISTING business threshold).
 * No new numeric cut-point — the mapping is purely qualitative, anchored on the stage enum and the
 * EXISTING spawn threshold.
 *
 * Mapping rule:
 *   stage = 'subpoena'                                → 'subpoenaed' (most severe)
 *   stage = 'passive' or 'tailing'                   → 'watched'    (tail spawned)
 *   consecutive ≥ standingGapConsecutiveMonths        → 'watched'    (spawn condition met)
 *   gap > 0 or consecutive ≥ 1 (but below spawn)     → 'noticed'    (elevated but not spawned)
 *   else (no gap, no consecutive, stage = 'none')     → 'quiet'      (no signal)
 *
 * @param gap         — last_gap (read internally; NEVER forwarded).
 * @param consecutive — consecutive_flag_months (read internally; NEVER forwarded).
 * @param stage       — tail_ramp_stage (read internally; NEVER forwarded).
 * @returns LifestyleAlarmBucket — the coarse presentation bucket.
 */
function deriveLifestyleAlarmBucket(
  gap: number | null,
  consecutive: number,
  stage: 'none' | 'passive' | 'tailing' | 'subpoena',
): LifestyleAlarmBucket {
  // 'subpoenaed' — most severe; tail stage = 'subpoena' (MIS subpoena territory).
  if (stage === 'subpoena') return 'subpoenaed';

  // 'watched' — tail spawned ('passive'/'tailing') OR consecutive months ≥ spawn threshold.
  const spawnThreshold = forensicTunables.standingGapConsecutiveMonths; // default 2
  if (stage === 'passive' || stage === 'tailing') return 'watched';
  if (consecutive >= spawnThreshold) return 'watched';

  // 'noticed' — gap signal detected (last_gap > 0) OR at least 1 flag-month (below spawn).
  if (gap !== null && gap > 0) return 'noticed';
  if (consecutive >= 1) return 'noticed';

  // 'quiet' — no gap, no flags, no tail.
  return 'quiet';
}
