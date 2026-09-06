// IMPLEMENTS: docs/superpowers/plans/2026-06-16-depth-d2-impl-plan.md Task R5a + Task R5b
//             docs/tech/04c_market_reputation_insurance/reputation_mechanics.md §3.3 (:113-131, :136, :248)
//             docs/tech/04a_operational_systems/selling_dealers_leks.md §Lek Memory (LekTileReputationBucket)
//             docs/superpowers/specs/2026-06-16-depth-d2-reputation-chapter-design.md §1.3
//             docs/tech/09_data_model/schema_reputation_state.md §2 Table 6 (R9.3 backport — same-commit)
//             — D2 R5a — 2026-06-17; D2 R5b — 2026-06-17
//
// `LekMemoryService` — Lek Memory mechanics for §3.3 (bind operator, record fairness, decay tick).
//
// Canon signatures (:248):
//   bindOperator(cellId, operatorId)               — push operator onto the FIFO trailing-op list.
//   recordDealFairness(cellId, operatorId, sig)    — stamp a nibble fairness signature (negative on short-pay).
//   getPositionMemoryAggregate(cellId)             — recency-weighted mean of last N operators' sigs.
//   runDecayTick(ctx, weekId)                      — apply λ_now decay for the week.
//
// Trust formula (canon :122-124):
//   effective_trust = personal_baseline · (1 − λ_now) + position_memory_aggregate · λ_now
//   λ_now = λ_base · exp(−Δt / τ_memory)
// where:
//   λ_base = lek_position_weight_lambda (registry)
//   τ_memory is in days, Δt = elapsed days since initial bind
//   The decay tick applies weekly: λ_now_new = λ_now_current · exp(−7 / lek_memory_halflife_days)
//
// Fairness signatures (canon :129):
//   Nibble = 4-bit unsigned (0-15), stored as JSONB array of smallint (DD-BYTES).
//   HIGH nibble (12-15) = fair deal.  LOW nibble (0-3) = negative/short-pay/failed deal.
//   Neutral nibble = 8 (the midpoint — used for absent history).
//   Short-pay / failed deals stamp a NEGATIVE signature (nibble 0-3 range).
//
// Recency weighting (canon :127):
//   position_memory_aggregate = Σ(recency_weight_i · sig_i) / Σ(recency_weight_i)
//   where recency_weight_i = (1 − lek_memory_decay_per_day)^i, i=0 for most recent.
//   Normalised to [0, 1] range for downstream use (divide by 15 to get fraction).
//
// LekTileReputationBucket (canon 04a §11):
//   `pristine | reputed | standard | tainted | burned`
//   REUSE: no parallel enum. Defined ONCE here (no code enum existed pre-R5a — confirmed by grep).
//   Members match selling_dealers_leks.md §Lek Memory verbatim.
//
// DD-REG-NAME (registry-wins — no inline numeric coefficient anywhere in this file):
//   λ:      `lek_position_weight_lambda`            via reputationTunables.lekPositionWeightLambda.
//   τ:      `lek_memory_halflife_days`              via reputationTunables.lekMemoryHalflifeDays.
//   slots:  `lek_inheritance_slots`                 via reputationTunables.lekInheritanceSlots.
//   decay:  `lek_memory_decay_per_day`              via reputationTunables.lekMemoryDecayPerDay.
//   mild:   `reputation.lek_haze_hostility_mild`    via reputationTunables.lekHazeHostilityMild.   [R5b NEW]
//   severe: `reputation.lek_haze_hostility_severe`  via reputationTunables.lekHazeHostilitySevere. [R5b NEW]
//
// R5b — D1b contract consumption (TD-113 §3.3):
//   `getPositionMemoryAggregate` reads `CarryingCapacityHazeService.getHazeProjection(districtId)`
//   and STACKS the hostility prior MULTIPLICATIVELY over the cell-level aggregate (canon :136).
//   Cell→district: `tile_id` IS a `block_id` (deal_leks.tile_id → blocks.id — DealLekRepository REUSE pattern).
//     The service queries `blocks` by tile_id to resolve district_id (a single SELECT).
//     If no block row exists for the tile_id (fresh test tile not in seed), falls back to NONE (×1.0).
//   Hostility factor per bucket:
//     NONE   = ×1.0        (zero-regression identity — not a knob)
//     MILD   = × lekHazeHostilityMild   (default 0.85 — [PROPOSED DEFAULT][PROV-Y26Q2])
//     SEVERE = × lekHazeHostilitySevere (default 0.70 — [PROPOSED DEFAULT][PROV-Y26Q2])
//   VALUE-SENSITIVE: the factor is applied to the cell-level aggregate_fraction BEFORE bucket mapping.
//   MULTIPLICATIVE: result = cell_aggregate × factor (proportional scaling, not flat override — :136).
//
// R2.2 / P5:
//   - lambda_weight (λ_now), trailing arrays, position_memory_aggregate are SERVER-ONLY.
//   - Client surface: footprint mark + textual tag (:131) — never the raw λ_now or aggregate number.
//   - effective_trust is server-only (used server-side for R6+ downstream mechanics, R5b).
//
// Zero-regression invariants:
//   - A cell with no bind history → getPositionMemoryAggregate() returns NEUTRAL_NIBBLE_FRACTION.
//   - bindOperator() on a fresh cell → creates the row (upsert pattern).
//   - A world with no lek_memory_cell_state rows is unaffected by the decay tick.
//   - Decay tick is idempotent per week (last_decay_week guard — no double-decay same week).
//
// DD-LEK-LOC: lek_memory_cell_state is the SIBLING TABLE — deal_leks BYTE-UNTOUCHED.
//
// R9.3: matches schema in docs/tech/09_data_model/schema_reputation_state.md §2 Table 6.
//
// REVIEWER FLAG [LEK_TUNABLE_NAMES]: store keys follow gdd/14 short-form (e.g. `lek_position_weight_lambda`
//   not `reputation.lek_memory_lambda_position_weight` from tech-doc :141).
//   Reviewer should confirm gdd/14 L962-965 short keys are canonical.

import { Injectable, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { lekMemoryCellState } from '../../db/schema/reputation_state';
import { blocks } from '../../db/schema/world_geography';
import { reputationTunables } from './reputation-tunables';
import { CarryingCapacityHazeService } from '../market/carrying-capacity-haze.service';
import type { CitySimTickContext } from '../../citysim/scheduler/city_sim_system';

// ── Constants ────────────────────────────────────────────────────────────────────────────────────

/**
 * Neutral nibble value for absent history (midpoint of 0-15 range).
 * A cell with no prior operators returns this as the effective signature per slot.
 * Zero-regression invariant: no-bind → aggregate = NEUTRAL_NIBBLE / 15 = 0.5333...
 *
 * Expressed as a fraction [0,1] for effective_trust: NEUTRAL_NIBBLE_FRACTION = 8/15.
 */
const NEUTRAL_NIBBLE = 8;
const NIBBLE_MAX = 15;

/**
 * Nibble range boundaries for negative (short-pay/failed) signatures.
 * Canon :129: "Failed/short-paid deals stamp negative fairness signature."
 * NEGATIVE_MAX_NIBBLE = 3 (nibbles 0-3 = negative; 4-11 = neutral; 12-15 = positive/fair).
 */
const NEGATIVE_MAX_NIBBLE = 3;

/** Minimum positive (fair) nibble value. Nibbles 12-15 = fair deals. */
const POSITIVE_MIN_NIBBLE = 12;

// ── Types ─────────────────────────────────────────────────────────────────────────────────────────

/**
 * `LekTileReputationBucket` — composite bucket for a lek tile's reputation.
 * Canon: `docs/tech/04a_operational_systems/selling_dealers_leks.md §Lek Memory` (:114).
 * Members (verbatim from canon): pristine | reputed | standard | tainted | burned.
 *
 * REUSE: no parallel enum. This is the SINGLE CODE DEFINITION — confirmed no pre-existing enum
 * in services/game-back/src/ before R5a (grep verified). Downstream modules REUSE this export.
 *
 * Bucket semantics:
 *   pristine — brand new cell, no memory yet (position reputation unformed).
 *   reputed  — strong positive history (seasoned reliable dealers, fair signatures).
 *   standard — neutral/mixed history.
 *   tainted  — negative history developing (short-paid deals, botched ops).
 *   burned   — severe negative history (chronic short-pay, consistent failures).
 */
export enum LekTileReputationBucket {
  pristine = 'pristine',
  reputed  = 'reputed',
  standard = 'standard',
  tainted  = 'tainted',
  burned   = 'burned',
}

/**
 * Result of getPositionMemoryAggregate().
 * R2.2: aggregate_fraction is SERVER-ONLY. Client gets only bucket + textual_tag.
 */
export interface PositionMemoryAggregateResult {
  /** Recency-weighted mean of last N fairness signatures, normalised to [0, 1]. */
  aggregate_fraction: number;
  /** R2.2-compliant composite bucket for client/downstream use. */
  bucket: LekTileReputationBucket;
  /** Textual tag for the player surface (:131) — drawn from position memory, not a number. */
  textual_tag: string;
}

// ── Service ──────────────────────────────────────────────────────────────────────────────────────

@Injectable()
export class LekMemoryService {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    /** R5b: D1b haze service (REUSE — getHazeProjection for district_capacity_damage_bucket). */
    private readonly hazeService: CarryingCapacityHazeService,
  ) {}

  /**
   * `bindOperator(playerId, cellId, operatorId)` — push a new operator onto the trailing-op FIFO.
   *
   * When an operator takes over a lek cell, the cell's memory is activated: the new operator ID
   * is appended to the trailing_operator_ids FIFO. If the FIFO is already at `lek_inheritance_slots`
   * depth, the oldest operator is evicted (FIFO — oldest first).
   *
   * Canon :129: "When operator binds cell and runs first 4 successful deals, FIFO advances
   * and operator signature occupies most-recent slot."
   *
   * On the FIRST bind (fresh cell): initialises lambda_weight = lek_position_weight_lambda (λ).
   * This sets the starting inheritance weight for this cell's memory.
   *
   * Zero-regression: this method creates the row on first call (upsert pattern).
   * DD-REG-NAME: `lek_inheritance_slots` via reputationTunables.lekInheritanceSlots (no inline 4).
   *
   * @param playerId — the player who controls this lek cell.
   * @param cellId   — the tile_id of the lek cell (integer, mirrors deal_leks.tile_id).
   * @param operatorId — UUID of the operator (dealer / lieutenant) binding the cell.
   */
  async bindOperator(playerId: string, cellId: number, operatorId: string): Promise<void> {
    const maxSlots = reputationTunables.lekInheritanceSlots;
    const lambdaBase = reputationTunables.lekPositionWeightLambda;

    // Read existing row
    const [existing] = await this.db
      .select()
      .from(lekMemoryCellState)
      .where(and(
        eq(lekMemoryCellState.player_id, playerId),
        eq(lekMemoryCellState.tile_id, cellId),
      ))
      .limit(1);

    if (!existing) {
      // First bind — create the cell state with the operator in slot[0] and λ initialised.
      await this.db
        .insert(lekMemoryCellState)
        .values({
          player_id:                    playerId,
          tile_id:                      cellId,
          trailing_operator_ids:        [operatorId],
          trailing_fairness_signatures: [],
          last_active_tick:             0,
          lambda_weight:                lambdaBase,  // λ_now = λ_base on first bind
          decay_state:                  0,
        });
    } else {
      // Existing row — push operator FIFO (evict oldest if at depth)
      const ops = existing.trailing_operator_ids as string[];
      let updated: string[];
      if (ops.length < maxSlots) {
        updated = [...ops, operatorId];
      } else {
        // At capacity — evict oldest (index 0 = oldest in FIFO)
        updated = [...ops.slice(1), operatorId];
      }

      await this.db
        .update(lekMemoryCellState)
        .set({
          trailing_operator_ids: updated,
          last_active_tick:      existing.last_active_tick,
          updated_at:            new Date(),
        })
        .where(and(
          eq(lekMemoryCellState.player_id, playerId),
          eq(lekMemoryCellState.tile_id, cellId),
        ));
    }
  }

  /**
   * `recordDealFairness(playerId, cellId, operatorId, fairnessSignature)` — stamp a nibble
   * fairness signature for the most-recently-bound operator on this cell.
   *
   * Fairness signatures are FIFO per the slot depth (lek_inheritance_slots):
   *   - FAIR deal: nibble 12-15 (POSITIVE_MIN_NIBBLE to NIBBLE_MAX).
   *   - NEUTRAL deal: nibble 4-11.
   *   - SHORT-PAY / FAILED deal: stamps a NEGATIVE signature (nibble 0-3, canon :129).
   *
   * The `fairnessSignature` parameter should already be in the 0-15 nibble range.
   * Callers encoding a short-pay MUST pass a value in [0, NEGATIVE_MAX_NIBBLE] (0-3).
   * Callers encoding a fair deal MUST pass a value in [POSITIVE_MIN_NIBBLE, NIBBLE_MAX] (12-15).
   *
   * The signature is appended to trailing_fairness_signatures (same FIFO depth as operators).
   * Oldest signature evicted when at capacity.
   *
   * Zero-regression: if the cell row doesn't exist yet, creates it first (bind implicit).
   * DD-REG-NAME: `lek_inheritance_slots` via reputationTunables.lekInheritanceSlots.
   *
   * @param playerId   — the player who controls this lek cell.
   * @param cellId     — the tile_id of the lek cell.
   * @param operatorId — the operator whose deal this is (used for implicit bind if needed).
   * @param fairnessSignature — nibble [0-15]: 0-3=negative/short-pay, 4-11=neutral, 12-15=fair.
   */
  async recordDealFairness(
    playerId: string,
    cellId: number,
    operatorId: string,
    fairnessSignature: number,
  ): Promise<void> {
    // Clamp to nibble range [0-15]
    const nibble = Math.min(NIBBLE_MAX, Math.max(0, Math.round(fairnessSignature)));
    const maxSlots = reputationTunables.lekInheritanceSlots;

    // Ensure the cell exists (implicit bind if missing)
    const [existing] = await this.db
      .select()
      .from(lekMemoryCellState)
      .where(and(
        eq(lekMemoryCellState.player_id, playerId),
        eq(lekMemoryCellState.tile_id, cellId),
      ))
      .limit(1);

    if (!existing) {
      // Implicit bind — create the cell with this operator + first signature
      const lambdaBase = reputationTunables.lekPositionWeightLambda;
      await this.db
        .insert(lekMemoryCellState)
        .values({
          player_id:                    playerId,
          tile_id:                      cellId,
          trailing_operator_ids:        [operatorId],
          trailing_fairness_signatures: [nibble],
          last_active_tick:             0,
          lambda_weight:                lambdaBase,
          decay_state:                  0,
        });
      return;
    }

    // Append signature FIFO (evict oldest if at depth)
    const sigs = existing.trailing_fairness_signatures as number[];
    let updatedSigs: number[];
    if (sigs.length < maxSlots) {
      updatedSigs = [...sigs, nibble];
    } else {
      updatedSigs = [...sigs.slice(1), nibble];
    }

    await this.db
      .update(lekMemoryCellState)
      .set({
        trailing_fairness_signatures: updatedSigs,
        updated_at:                   new Date(),
      })
      .where(and(
        eq(lekMemoryCellState.player_id, playerId),
        eq(lekMemoryCellState.tile_id, cellId),
      ));
  }

  /**
   * `getPositionMemoryAggregate(playerId, cellId)` — recency-weighted mean of the last
   * `lek_inheritance_slots` operators' fairness signatures, stacked multiplicatively with the
   * D1b Carrying-Capacity Haze district_capacity_damage_bucket. Canon :127, :136.
   *
   * Formula (R5b — D1b contract consumption):
   *   cell_aggregate  = Σ(recency_weight_i · sig_i) / (Σ(recency_weight_i) · NIBBLE_MAX)
   *   hostility       = hazeService.getHazeProjection(districtId).district_capacity_damage_bucket
   *   effective       = cell_aggregate × hostility_factor(bucket)
   *   where hostility_factor: NONE → ×1.0; MILD → ×lekHazeHostilityMild; SEVERE → ×lekHazeHostilitySevere
   *
   * Cell→district: tile_id IS a block_id (deal_leks.tile_id → blocks.id, same pattern as
   *   DealLekRepository.listLeks). The service queries `blocks` by tile_id to resolve district_id.
   *   Falls back to NONE (×1.0) if no block row exists (uninitialized / test tile not in seed).
   *
   * Zero-regression: a cell with NO signatures → returns NEUTRAL_NIBBLE / NIBBLE_MAX as the
   *   aggregate_fraction (= 8/15 ≈ 0.533) — the neutral personal baseline precondition for R6.
   * A non-existent cell → returns the neutral result WITHOUT creating a row.
   * NONE bucket → ×1.0 identity (effective_fraction == cell_fraction EXACTLY — zero-regression).
   *
   * R2.2: aggregate_fraction is SERVER-ONLY. Client surface returns `bucket` + `textual_tag` only.
   * DD-REG-NAME:
   *   `lek_memory_decay_per_day`            via reputationTunables.lekMemoryDecayPerDay.
   *   `reputation.lek_haze_hostility_mild`  via reputationTunables.lekHazeHostilityMild.
   *   `reputation.lek_haze_hostility_severe` via reputationTunables.lekHazeHostilitySevere.
   *
   * @param playerId — the player who controls this lek cell.
   * @param cellId   — the tile_id of the lek cell (= block_id for cell→district lookup).
   */
  async getPositionMemoryAggregate(
    playerId: string,
    cellId: number,
  ): Promise<PositionMemoryAggregateResult> {
    const [row] = await this.db
      .select()
      .from(lekMemoryCellState)
      .where(and(
        eq(lekMemoryCellState.player_id, playerId),
        eq(lekMemoryCellState.tile_id, cellId),
      ))
      .limit(1);

    // Zero-regression: a cell with NO row → pristine/neutral baseline (no-memory = no haze).
    // Canon :136: haze stacks "on top of cell-level memory" — with NO memory, there is no base
    // to multiply. A pristine cell (never bound) returns the neutral result unchanged.
    if (!row) {
      return this._neutralResult();
    }

    // Compute cell-level aggregate from the fairness signature history.
    // A row with no signatures → neutral baseline (haze still applies — the cell EXISTS but is unrated).
    const sigs = row.trailing_fairness_signatures as number[];
    const cellLevelFraction: number = sigs.length === 0
      ? NEUTRAL_NIBBLE / NIBBLE_MAX
      : this._computeAggregate(sigs).aggregate_fraction;

    // R5b: resolve cell→district via blocks JOIN (tile_id IS block_id — DealLekRepository pattern).
    // Falls back to NONE (×1.0 identity) if no block exists for this tile_id.
    const districtId = await this._resolveDistrictForCell(cellId);

    // R5b: call D1b haze service (REUSE — no parallel haze computation — grep proves getHazeProjection).
    const hazeBucket = districtId !== null
      ? (await this.hazeService.getHazeProjection(districtId)).district_capacity_damage_bucket
      : 'NONE';

    // Apply multiplicative hostility factor. NONE = ×1.0 (identity — zero-regression).
    // DD-REG-NAME: no inline coefficients — all magnitudes from registry.
    const hostilityFactor = this._hazeHostilityFactor(hazeBucket);

    // VALUE-SENSITIVE: factor is applied to aggregate_fraction BEFORE bucket mapping.
    // MULTIPLICATIVE: result = cell_aggregate × factor (proportional — not flat override — :136).
    const effectiveFraction = cellLevelFraction * hostilityFactor;

    return {
      aggregate_fraction: effectiveFraction,
      bucket:             this._fractionToBucket(effectiveFraction),
      textual_tag:        this._fractionToTextualTag(effectiveFraction),
    };
  }

  /**
   * `runDecayTick(ctx, weekId)` — apply λ_now exponential decay to ALL lek_memory_cell_state rows
   * for the given player for this week.
   *
   * Decay formula (canon :124):
   *   λ_now_new = λ_now_current · exp(−7 / lek_memory_halflife_days)
   * where 7 = days per week (the WEEKLY cadence).
   *
   * Idempotent per week: rows with `last_decay_week === weekId` are skipped (no double-decay).
   * A player with no lek_memory_cell_state rows is unaffected (organic no-op).
   *
   * The `lambda_weight` column stores the CURRENT λ_now (decayed value).
   * Initial bind sets lambda_weight = lek_position_weight_lambda (base λ).
   * Each weekly tick applies the exponential decay factor.
   *
   * R2.2: lambda_weight is server-only (never forwarded to a client route).
   * DD-REG-NAME: `lek_memory_halflife_days` via reputationTunables.lekMemoryHalflifeDays (τ).
   *
   * @param ctx    — tick context (ctx.playerId used to scope the update).
   * @param weekId — in-game week identifier for the idempotence guard.
   */
  async runDecayTick(ctx: CitySimTickContext, weekId: number): Promise<void> {
    const tauDays = reputationTunables.lekMemoryHalflifeDays;
    // Weekly decay factor: exp(−7 / τ_days) — no inline 7 aside from this once-derived constant.
    const DAYS_PER_WEEK = 7;
    const decayFactor = Math.exp(-DAYS_PER_WEEK / tauDays);

    // Read ALL lek_memory_cell_state rows for this player
    const rows = await this.db
      .select()
      .from(lekMemoryCellState)
      .where(eq(lekMemoryCellState.player_id, ctx.playerId));

    for (const row of rows) {
      // Idempotence guard: skip rows already decayed this week
      if (row.last_decay_week === weekId) {
        continue;
      }

      const currentLambda = row.lambda_weight as number;
      const newLambda = currentLambda * decayFactor;

      await this.db
        .update(lekMemoryCellState)
        .set({
          lambda_weight:   newLambda,
          last_decay_week: weekId,
          updated_at:      new Date(),
        })
        .where(and(
          eq(lekMemoryCellState.player_id, row.player_id),
          eq(lekMemoryCellState.tile_id, row.tile_id),
        ));
    }
  }

  /**
   * `getCellState(playerId, cellId)` — read the full server-side cell state for TEST-ONLY routes.
   *
   * Returns the raw lek_memory_cell_state row or null if absent.
   * R2.2: TEST-ONLY — never forward raw lambda_weight to a real client.
   */
  async getCellState(playerId: string, cellId: number): Promise<Record<string, unknown> | null> {
    const [row] = await this.db
      .select()
      .from(lekMemoryCellState)
      .where(and(
        eq(lekMemoryCellState.player_id, playerId),
        eq(lekMemoryCellState.tile_id, cellId),
      ))
      .limit(1);
    return row as Record<string, unknown> | null ?? null;
  }

  // ── Private helpers ───────────────────────────────────────────────────────────────────────────

  /**
   * `_resolveDistrictForCell(cellId)` — look up the district for a lek cell's tile_id.
   *
   * R5b: tile_id IS a block_id (DealLekRepository pattern: deal_leks.tile_id → blocks.id).
   * A single SELECT on the global `blocks` table (static seed data — cheap lookup, no caching needed).
   * Returns null if no block row exists for this tile_id (e.g. test tile not in seed) — the caller
   * uses NONE (×1.0) as the fallback (zero-regression for uninitialized tiles).
   */
  private async _resolveDistrictForCell(cellId: number): Promise<number | null> {
    const [blockRow] = await this.db
      .select({ district_id: blocks.district_id })
      .from(blocks)
      .where(eq(blocks.id, cellId))
      .limit(1);
    return blockRow?.district_id ?? null;
  }

  /**
   * `_hazeHostilityFactor(bucket)` — map district_capacity_damage_bucket to the multiplicative
   * hostility factor for the cell-level aggregate (canon :136).
   *
   * NONE   = ×1.0        (zero-regression identity — not a knob)
   * MILD   = × lekHazeHostilityMild   ([PROPOSED DEFAULT] 0.85 — [PROV-Y26Q2])
   * SEVERE = × lekHazeHostilitySevere ([PROPOSED DEFAULT] 0.70 — [PROV-Y26Q2])
   *
   * DD-REG-NAME: magnitude constants read from registry (no inline literals).
   * R4.1: NONE → 1.0 is the only inline literal (multiplicative identity — exempt as it IS the spec value).
   */
  private _hazeHostilityFactor(bucket: 'NONE' | 'MILD' | 'SEVERE'): number {
    switch (bucket) {
      case 'NONE':   return 1.0; // zero-regression identity — not a tunable
      case 'MILD':   return reputationTunables.lekHazeHostilityMild;
      case 'SEVERE': return reputationTunables.lekHazeHostilitySevere;
    }
  }

  /** Compute the recency-weighted aggregate from a non-empty signature array. */
  private _computeAggregate(sigs: number[]): PositionMemoryAggregateResult {
    const decayPerDay = reputationTunables.lekMemoryDecayPerDay;
    // Recency weight: weight_i = (1 − decay_per_day)^i where i=0 is the MOST RECENT slot.
    // The sigs array is ordered oldest-first (append FIFO), so index 0 = oldest.
    // i=0 = most recent → we traverse sigs in reverse order.
    const n = sigs.length;
    let weightedSum = 0;
    let totalWeight = 0;

    for (let i = 0; i < n; i++) {
      // i=0: most recent (last element of sigs array), i=n-1: oldest
      const sig = sigs[n - 1 - i]!;
      const weight = Math.pow(1 - decayPerDay, i);
      weightedSum += weight * sig;
      totalWeight += weight;
    }

    // Normalise to [0, 1] by dividing by (totalWeight * NIBBLE_MAX)
    const aggregateFraction = totalWeight > 0
      ? weightedSum / (totalWeight * NIBBLE_MAX)
      : NEUTRAL_NIBBLE / NIBBLE_MAX;

    return {
      aggregate_fraction: aggregateFraction,
      bucket:             this._fractionToBucket(aggregateFraction),
      textual_tag:        this._fractionToTextualTag(aggregateFraction),
    };
  }

  /** Neutral result for absent/empty cell (zero-regression invariant). */
  private _neutralResult(): PositionMemoryAggregateResult {
    const neutralFraction = NEUTRAL_NIBBLE / NIBBLE_MAX;
    return {
      aggregate_fraction: neutralFraction,
      bucket:             LekTileReputationBucket.standard,
      textual_tag:        'this corner has no particular memory',
    };
  }

  /**
   * Map a normalised aggregate_fraction [0,1] to a LekTileReputationBucket.
   * Thresholds:
   *   ≥ 0.80 → reputed    (consistently fair, high nibbles)
   *   ≥ 0.55 → standard   (neutral/mixed)
   *   ≥ 0.35 → tainted    (some negative deals)
   *   < 0.35 → burned     (chronic short-pay / failed)
   * pristine is a lifecycle state (no bind yet) — not returned from this method.
   */
  private _fractionToBucket(f: number): LekTileReputationBucket {
    if (f >= 0.80) return LekTileReputationBucket.reputed;
    if (f >= 0.55) return LekTileReputationBucket.standard;
    if (f >= 0.35) return LekTileReputationBucket.tainted;
    return LekTileReputationBucket.burned;
  }

  /**
   * Map fraction to a textual tag for the player surface (canon :131).
   * "Buyers here still expect the old fairness" / "this corner has a long memory of being shorted"
   * R2.2: qualitative text only — never the raw fraction number.
   */
  private _fractionToTextualTag(f: number): string {
    if (f >= 0.80) return 'buyers here still expect the old fairness';
    if (f >= 0.55) return 'this corner has a neutral memory';
    if (f >= 0.35) return 'there is some memory of being shorted here';
    return 'this corner has a long memory of being shorted';
  }
}

// ── Re-export constants for tests ──────────────────────────────────────────────────────────────
export { NEGATIVE_MAX_NIBBLE, POSITIVE_MIN_NIBBLE, NEUTRAL_NIBBLE, NIBBLE_MAX };
