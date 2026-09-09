// IMPLEMENTS: docs/tech/04c_market_reputation_insurance/insurance_mechanics.md §4.2 (:82-122,:142-149)
//             docs/superpowers/plans/2026-06-18-depth-insurance-coverage-drift-plan.md Task 3 (C3)
//             docs/superpowers/plans/2026-06-18-depth-insurance-coverage-drift-plan.md Task 4 (C4)
//             docs/superpowers/plans/2026-06-18-depth-insurance-coverage-drift-plan.md Task 5 (C5)
//             docs/superpowers/plans/2026-06-18-depth-insurance-coverage-drift-plan.md Task 12 (C12)
//             — Insurance Drift C3 — 2026-06-18
//             — Insurance Drift C4 — 2026-06-18
//             — Insurance Drift C5 — 2026-06-18
//             — Insurance Drift C12 — 2026-06-18 (captureBaselineFingerprint inherit logic + almanac scope)
//
// `CoverageInducedDriftService` — Coverage-Induced Drift (§4.2 Tranche C).
//
// C3 scope: `captureBaselineFingerprint(contractId)` ONLY.
//   - Reads the contract to get playerId, coverage_type, asset_ref.
//   - Reads the current observable source state over the fingerprint window (behavioural snapshot).
//   - Creates the `coverage_induced_drift_state` row (hazard_shift=0, 4 fingerprint columns = captured baseline).
//   - Writes the baseline into `almanac_entry.baseline_fingerprint_*` (DD-BASELINE-PERSIST, C12 anchor).
//   - Also sets `insurance_contract.expires_at_tick` = issued_tick + term_days × 1440 (DD-RENEWAL, C11).
//
// C4 scope: `onStashFill(e: StashFillEvent)` — the stash-ratio drift subscriber.
//   - Wired via `InsuranceModule.onApplicationBootstrap()` to `CityEventBus.onStashFill`.
//   - NO-OP when no active drift_state covers this player (zero-regression invariant).
//   - When a drift_state exists: computes stashRatioPermille(heldCentsAfter, capacityCents) and compares
//     to the FROZEN issuance baseline (fingerprint_stash_ratio). If less cautious: increment hazard_shift
//     (cap at 255, T.bo.economic.hazard_shift_max) and update running estimate. If same/more cautious:
//     update running estimate only.
//
// C5 scope: `onCourierRotated(e: CourierRotatedEvent)` — the courier-cadence drift subscriber.
//   - NO-OP when no active drift_state covers the player (zero-regression invariant).
//   - Queries the prior courier_shift for the player (before the current dispatch) to compute the gap.
//   - If isLessCautiousThanBaseline('courierCadence', currentGap, baseline) → hazard_shift++ (cap 255).
//   - Updates running-estimate fingerprint_courier_cadence.
// C6-C8 scope: `onDealAccepted`, `onLookoutAssigned`, `onRuleViolation` — wired at C6-C8.
// C10 scope: `runWeeklyTick` — wired at C10.
//
// Hooked to `ContractService.issueContract` ADDITIVELY (the existing issuance path return value is UNCHANGED).
//
// DD-LESS-CAUTIOUS baseline (design §1.3): the baseline captured at issuance is FROZEN.
//   Per-action comparisons (C4-C8) compare the CURRENT observation vs the FROZEN issuance baseline.
//   The running-estimate fingerprint columns track the current observed rate but are NOT the comparison anchor.
//
// DD-BASELINE-PERSIST (design §3.2): the baseline is written to BOTH:
//   (1) `coverage_induced_drift_state`: fingerprint_* columns (live, per-contract).
//   (2) `almanac_entry`: baseline_fingerprint_* columns (persisted, anti-exploit C12).
//
// Feature computation from substrate (at issuance, per plan Task 3 + design §1.1):
//
// 1. stashRatio: `stashRatioPermille(held_cents, capacityForTier)` from the money_holding row.
//    - Reads the money_holding row for the player (the stash asset matching asset_ref or the first row).
//    - capacity = capacityCentsForTier(money_holding_tier) — the tunable-backed tier capacity.
//    - Per design: "stash fill ratio = held_cents / capacity" — the safe-fill threshold is used by C4
//      to classify "hot"; at C3 we capture the raw ratio (not hot/cold boolean).
//    - If no money_holding row → stashRatio=0 (no stash = empty baseline).
//
// 2. courierCadence: `courierCadenceDays(shiftCount, windowDays)` from courier_shift history.
//    - Counts courier_shift rows for the player started within the fingerprint window.
//    - windowDays = coverage_drift_behaviour_fingerprint_window_days (default 30 game-days).
//    - Formula: if shiftCount=0 → windowDays (no rotations = maximum gap); else round(window / shiftCount).
//
// 3. marginalDeal: At C3 baseline capture, no deal instrumentation exists yet (C6 wires the events).
//    - Initial baseline = 0 per-mille (no marginal deals observed pre-issuance).
//    - The running estimate is updated by the C6 subscriber (onDealAccepted).
//
// 4. lookout: `lookoutRatePermille(securityCount, totalOperations)` from lieutenant SECURITY assignments.
//    - Counts ACTIVE lieutenant rows with role_id = SECURITY_ROLE_ID for the player.
//    - totalOperations = total operational buildings for the player (from building_operational_state).
//    - If no operational buildings → lookout=0.
//
// Anti-fabrication: NO inline magnitudes (all thresholds / margins from insuranceTunables).
// Anti-fabrication: NO Math.random. Game-time = ctx.gameMinute only. NEVER Date.now().
// Zero-regression: captureBaselineFingerprint is ADDITIVE — issueContract return value is UNCHANGED.
//   The existing issuance path (WARY/premium/debit) is not touched.
//   onStashFill is NO-OP when no active drift_state covers the player (zero-regression invariant).

import { Injectable, Logger, Inject } from '@nestjs/common';
import { eq, and, gte, count, ne, desc, gt, isNotNull } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import {
  insuranceContract,
  almanacEntry,
  coverageInducedDriftState,
} from '../../db/schema/insurance';
import { moneyHolding } from '../../db/schema/operational_chain';
import { courierShift } from '../../db/schema/operational_chain';
import { lieutenant } from '../../db/schema/lieutenant';
import { buildingOperationalState } from '../../db/schema/operational_chain';
import { insuranceTunables } from './insurance-tunables';
import { SYNTHETIC_UNDERWRITER_ID } from './insurance-constants';
import { capacityCentsForTier } from '../money_holding/money-holding-tunables';
import {
  stashRatioPermille,
  courierCadenceDays,
  marginalDealRatePermille,
  lookoutRatePermille,
  isLessCautiousThanBaseline,
} from './behaviour-fingerprint';
import { SECURITY_ROLE_ID } from '../lieutenant/lieutenant-archetype';
import type { StashFillEvent, CourierRotatedEvent, DealAcceptedEvent, LookoutAssignedEvent, RuleViolationEvent } from '../../citysim/events/city-event-bus';
import type { CitySimTickContext } from '../../citysim/scheduler/city_sim_system';

// ── Game-time constant ──────────────────────────────────────────────────────
// 1440 game-minutes = 1 in-game day (citysim-tunables.ts T.clock.in_game_day_length_minutes).
// Mirrors the precedent in courier-interception.service.ts and fence-default.service.ts.
const GAME_MINUTES_PER_DAY = 1440;

// Application-level cap = T.bo.economic.hazard_shift_max (gdd/14:2513 = 255).
// The column is plain smallint (max 32767) — NO DB CHECK constraint enforces [0..255].
// The cap is enforced here in application code (canon :89 "hazard_shift (0-255)").
// C9 consolidation: this is the ONE place the 255 clamp lives (centralized, DRY).
const HAZARD_SHIFT_MAX = 255; // T.bo.economic.hazard_shift_max

@Injectable()
export class CoverageInducedDriftService {
  private readonly logger = new Logger(CoverageInducedDriftService.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
  ) {}

  /**
   * `applyLessCautiousIncrement` — C9 consolidation: the ONE clamp path for all 4 feature handlers.
   *
   * Applies `isLessCautiousThanBaseline(feature, current, baseline)` and returns the new hazard_shift
   * (incremented by 1 if less cautious, unchanged otherwise). The `Math.min(HAZARD_SHIFT_MAX, ...)`
   * clamp lives HERE and ONLY HERE — this is the DRY centralization (C9).
   *
   * Called by:
   *   - `onStashFill`      (feature='stashRatio')
   *   - `onCourierRotated` (feature='courierCadence')
   *   - `onDealAccepted`   (feature='marginalDeal')
   *   - `onLookoutAssigned`(feature='lookout')
   *
   * `onRuleViolation` bypasses this — it is UNCONDITIONAL (no feature comparison, canon :116 singular).
   *
   * @param currentHazardShift — the current hazard_shift value (pre-increment).
   * @param feature — the BehaviourFingerprint feature name.
   * @param current — the current observed value (per-mille or days).
   * @param baseline — the frozen issuance baseline value.
   * @returns `{ fired: boolean; newShift: number }` — fired=true if the increment fires.
   */
  private applyLessCautiousIncrement(
    currentHazardShift: number,
    feature: 'stashRatio' | 'courierCadence' | 'marginalDeal' | 'lookout',
    current: number,
    baseline: number,
  ): { fired: boolean; newShift: number } {
    const fired = isLessCautiousThanBaseline(feature, current, baseline);
    const newShift = fired ? Math.min(HAZARD_SHIFT_MAX, currentHazardShift + 1) : currentHazardShift;
    return { fired, newShift };
  }

  /**
   * `captureBaselineFingerprint(contractId)` — capture the pre-coverage behavioural fingerprint at issuance.
   *
   * Called ADDITIVELY at the END of `ContractService.issueContract` (after the contract is ACTIVE + premium debited).
   * The issuance return value `{ contractId, premiumCents, escrowRequiredCents }` is UNCHANGED.
   *
   * Actions:
   *   1. Read the contract row (playerId, coverage_type, asset_ref, issued_tick).
   *   2. Compute the current BehaviourFingerprint over the fingerprint window from the observable substrate.
   *   3. Create the `coverage_induced_drift_state` row (hazard_shift=0, fingerprint_* = captured baseline).
   *   4. Write the baseline into `almanac_entry.baseline_fingerprint_*` (DD-BASELINE-PERSIST, C12 anchor).
   *   5. Set `insurance_contract.expires_at_tick` = issued_tick + term_days × 1440 (DD-RENEWAL, C11).
   *
   * Frozen baseline (design §1.3 — `[needs reviewer⊥]`):
   *   The captured fingerprint IS the frozen baseline. All per-action comparisons (C4-C8) compare the
   *   CURRENT observation vs the issuance-frozen baseline, NOT a sliding running estimate.
   *
   * DD-BASELINE-PERSIST (design §3.2): baseline written to BOTH drift_state (live) AND almanac (persisted).
   *   The almanac baseline enables the C12 re-issue-within-window inheritance (anti-exploit).
   *
   * Window: `coverage_drift_behaviour_fingerprint_window_days` game-days back from issued_tick.
   *   [needs reviewer⊥]: the fingerprint window reuses the single canon tunable `:122` for two purposes —
   *   the BehaviourFingerprint measurement window AND the anti-exploit almanac re-issue window (C12).
   *
   * @param contractId — the UUID of the ACTIVE contract to capture the baseline for.
   * @param overrideIssuedTick — (C12 _test routes only) use this tick instead of the DB issued_tick
   *   to simulate re-issuance at a specific game-time (for within/outside-window E2E scenarios).
   *   In production calls from ContractService.issueContract, leave undefined.
   */
  async captureBaselineFingerprint(contractId: string, overrideIssuedTick?: number): Promise<{ inherited: boolean }> {
    // ── Step 1: Read the contract ────────────────────────────────────────────────────────────────
    const [contractRow] = await this.db
      .select({
        id: insuranceContract.id,
        player_id: insuranceContract.player_id,
        type: insuranceContract.type,
        asset_ref: insuranceContract.asset_ref,
        issued_tick: insuranceContract.issued_tick,
        // C12: counterparty_id = the NPC underwriter for this contract (maps to almanac_entry.underwriter_id).
        // Used to scope the almanac inherit check + the almanac write to the correct (underwriter, player) row.
        counterparty_id: insuranceContract.counterparty_id,
      })
      .from(insuranceContract)
      .where(eq(insuranceContract.id, contractId))
      .limit(1);

    if (!contractRow) {
      this.logger.warn(`captureBaselineFingerprint: contract ${contractId} not found — skipping`);
      return { inherited: false };
    }

    const { player_id: playerId, asset_ref: assetRef, issued_tick: issuedTick, counterparty_id: counterpartyId } = contractRow;
    const issuedTickNum = overrideIssuedTick ?? Number(issuedTick);

    // ── Step 2: Compute the fingerprint window ─────────────────────────────────────────────────
    //
    // windowDays = coverage_drift_behaviour_fingerprint_window_days (default 30).
    // windowStart = issuedTick − (windowDays × GAME_MINUTES_PER_DAY).
    // We read substrate state WITHIN this window for the rate-based features.
    const windowDays = insuranceTunables.coverageDriftFingerprintWindowDays;
    const windowStartTick = issuedTickNum - windowDays * GAME_MINUTES_PER_DAY;

    // ── C12: Check almanac for persisted baseline WITHIN the post-lapse window ─────────────────
    //
    // DD-BASELINE-PERSIST (design §1.6, canon :110):
    //   "Player CANNOT reset hazard_shift by un-insuring then re-insuring; baseline_fingerprint
    //    persists in the underwriter's almanac for 90 days post-lapse; re-applying within window
    //    inherits the prior fingerprint, repriced accordingly."
    //
    // Scope: check the (underwriter_id = effectiveUnderwriterId, player_id) almanac row — NOT player-wide.
    //   counterparty_id maps to almanac_entry.underwriter_id (both refer to the same NPC underwriter).
    //
    // C15 fix: when counterpartyId is null (standard issuance without a walk-backed NPC underwriter),
    //   use SYNTHETIC_UNDERWRITER_ID as the coherent almanac identity — same ID used by Step 8 UPSERT
    //   below and by the lapse stamp in renewal.service.ts. This ensures the production path
    //   issuance→drift→lapse→reissue-within-window genuinely inherits the persisted baseline.
    //   Prior behavior: null counterparty → skip inherit entirely (anti-exploit dead for standard players).
    //
    // Persist window: REUSE underwriting_almanac_persistence_days_post_lapse (90, canon :110).
    //   The check is: almanac_entry.baseline_persisted_until_tick > issuedTickNum (current re-issue tick).
    //   Game-time only — NEVER Date.now().
    const effectiveUnderwriterId = counterpartyId ?? SYNTHETIC_UNDERWRITER_ID;

    let inheritedFingerprint: {
      stashRatio: number;
      courierCadence: number;
      marginalDeal: number;
      lookout: number;
    } | null = null;

    {
      // Scoped almanac check: (underwriter_id = effectiveUnderwriterId, player_id) AND persisted_until > now
      const [persistedAlmanac] = await this.db
        .select({
          baseline_fingerprint_stash_ratio: almanacEntry.baseline_fingerprint_stash_ratio,
          baseline_fingerprint_courier_cadence: almanacEntry.baseline_fingerprint_courier_cadence,
          baseline_fingerprint_marginal_deal: almanacEntry.baseline_fingerprint_marginal_deal,
          baseline_fingerprint_lookout: almanacEntry.baseline_fingerprint_lookout,
          baseline_persisted_until_tick: almanacEntry.baseline_persisted_until_tick,
        })
        .from(almanacEntry)
        .where(
          and(
            eq(almanacEntry.underwriter_id, effectiveUnderwriterId),
            eq(almanacEntry.player_id, playerId),
            isNotNull(almanacEntry.baseline_persisted_until_tick),
            gt(almanacEntry.baseline_persisted_until_tick, BigInt(issuedTickNum)),
          ),
        )
        .limit(1);

      if (persistedAlmanac && persistedAlmanac.baseline_persisted_until_tick !== null) {
        // WITHIN window: inherit the persisted fingerprint (anti-exploit — baseline NOT reset)
        inheritedFingerprint = {
          stashRatio: persistedAlmanac.baseline_fingerprint_stash_ratio ?? 0,
          courierCadence: persistedAlmanac.baseline_fingerprint_courier_cadence ?? 0,
          marginalDeal: persistedAlmanac.baseline_fingerprint_marginal_deal ?? 0,
          lookout: persistedAlmanac.baseline_fingerprint_lookout ?? 0,
        };
        this.logger.log(
          `captureBaselineFingerprint: C12 INHERIT — player=${playerId} contract=${contractId} ` +
            `effectiveUnderwriter=${effectiveUnderwriterId} baseline_persisted_until_tick=${persistedAlmanac.baseline_persisted_until_tick} ` +
            `> issuedTick=${issuedTickNum} → inheriting persisted fingerprint (anti-exploit, canon :110)`,
        );
      } else {
        // OUTSIDE window (or no persisted baseline) → fresh capture (steps 3-6 below)
        this.logger.log(
          `captureBaselineFingerprint: C12 FRESH — player=${playerId} contract=${contractId} ` +
            `effectiveUnderwriter=${effectiveUnderwriterId} — no persisted baseline within window (issuedTick=${issuedTickNum}) ` +
            `→ fresh capture from substrate`,
        );
      }
    }

    // ── Steps 3-6: Fresh capture (only when NOT inheriting from almanac) ───────────────────────
    //
    // When inheritedFingerprint is non-null (within window), the fresh-capture steps are SKIPPED.
    // The inherited values are used directly for the drift_state + almanac write.
    let stashRatioValue = 0;
    let courierCadenceValue = 0;
    let marginalDealValue = 0;
    let lookoutValue = 0;

    if (!inheritedFingerprint) {
      // ── Step 3: Read stashRatio from money_holding ────────────────────────────────────────────
      //
      // Stash fill ratio = held_cents / capacityCentsForTier(money_holding_tier).
      // If asset_ref is set and matches a money_holding.building_id → use that specific row.
      // Otherwise → use the first money_holding row for the player (general coverage).
      // If no money_holding row → stashRatio = 0 (no stash = empty baseline).
      {
        const rows = await this.db
          .select({
            held_cents: moneyHolding.held_cents,
            money_holding_tier: moneyHolding.money_holding_tier,
          })
          .from(moneyHolding)
          .where(
            assetRef
              ? and(
                  eq(moneyHolding.player_id, playerId),
                  eq(moneyHolding.building_id, assetRef),
                )
              : eq(moneyHolding.player_id, playerId),
          )
          .limit(1);

        if (rows.length > 0) {
          const row = rows[0]!;
          const capacityCents = capacityCentsForTier(row.money_holding_tier);
          stashRatioValue = stashRatioPermille(row.held_cents, capacityCents);
        }
        // else: no money_holding → stashRatio = 0 (neutral baseline)
      }

      // ── Step 4: Read courierCadence from courier_shift history ──────────────────────────────
      //
      // Count courier_shift rows for the player started within the fingerprint window.
      // courierCadenceDays(shiftCount, windowDays) → mean game-days between rotations.
      {
        // Use COUNT aggregation for efficiency.
        const rows = await this.db
          .select({ cnt: count() })
          .from(courierShift)
          .where(
            and(
              eq(courierShift.player_id, playerId),
              gte(courierShift.started_at_tick, windowStartTick),
            ),
          );
        const shiftCount = Number(rows[0]?.cnt ?? 0);
        courierCadenceValue = courierCadenceDays(shiftCount, windowDays);
      }

      // ── Step 5: marginalDeal = 0 at baseline capture ──────────────────────────────────────────
      //
      // At C3 baseline capture, no deal instrumentation exists yet (C6 wires the DealAcceptedEvent).
      // The initial baseline is 0 per-mille: no marginal deals observed pre-issuance.
      // The running estimate is updated by the C6 subscriber (onDealAccepted) at C9.
      marginalDealValue = marginalDealRatePermille(0, 0); // = 0

      // ── Step 6: Read lookout rate from lieutenant SECURITY assignments ────────────────────────
      //
      // Lookout = SECURITY-archetype lieutenant (DD-LOOKOUT-MAPPING, design §4).
      // Counts lieutenant rows with role_id = SECURITY_ROLE_ID for the player.
      // totalOperations = count of operational buildings for the player (building_operational_state).
      // lookoutRatePermille(securityCount, totalOps).
      {
        const [securityRows, opsRows] = await Promise.all([
          this.db
            .select({ cnt: count() })
            .from(lieutenant)
            .where(
              and(
                eq(lieutenant.player_id, playerId),
                eq(lieutenant.role_id, SECURITY_ROLE_ID),
              ),
            ),
          this.db
            .select({ cnt: count() })
            .from(buildingOperationalState)
            .where(eq(buildingOperationalState.player_id, playerId)),
        ]);
        const securityCount = Number(securityRows[0]?.cnt ?? 0);
        const totalOps = Number(opsRows[0]?.cnt ?? 0);
        lookoutValue = lookoutRatePermille(securityCount, totalOps);
      }

      this.logger.log(
        `captureBaselineFingerprint: FRESH capture player=${playerId} contract=${contractId} ` +
          `stashRatio=${stashRatioValue} courierCadence=${courierCadenceValue} ` +
          `marginalDeal=${marginalDealValue} lookout=${lookoutValue} ` +
          `windowDays=${windowDays} issuedTick=${issuedTickNum}`,
      );
    } else {
      // Use the inherited fingerprint values (anti-exploit — baseline NOT reset)
      stashRatioValue = inheritedFingerprint.stashRatio;
      courierCadenceValue = inheritedFingerprint.courierCadence;
      marginalDealValue = inheritedFingerprint.marginalDeal;
      lookoutValue = inheritedFingerprint.lookout;

      this.logger.log(
        `captureBaselineFingerprint: INHERITED fingerprint player=${playerId} contract=${contractId} ` +
          `stashRatio=${stashRatioValue} courierCadence=${courierCadenceValue} ` +
          `marginalDeal=${marginalDealValue} lookout=${lookoutValue} ` +
          `(anti-exploit: reckless re-issue does not reset baseline)`,
      );
    }

    // ── Step 7: Create the coverage_induced_drift_state row ─────────────────────────────────────
    //
    // hazard_shift=0 (no drift at issuance, canon :89).
    // fingerprint_* = the captured baseline values.
    // contract_id = the contractId (soft-ref, for per-asset subscriber lookup at C9).
    // asset_ref = the contract's asset_ref (mirrors the contract's asset binding).
    // coverage_type = the contract's type.
    const [driftRow] = await this.db
      .insert(coverageInducedDriftState)
      .values({
        player_id: playerId,
        contract_id: contractId,
        asset_ref: assetRef ?? undefined,
        coverage_type: contractRow.type,
        hazard_shift: 0,
        fingerprint_stash_ratio: stashRatioValue,
        fingerprint_courier_cadence: courierCadenceValue,
        fingerprint_marginal_deal: marginalDealValue,
        fingerprint_lookout: lookoutValue,
      })
      .returning({ id: coverageInducedDriftState.id });

    this.logger.log(
      `captureBaselineFingerprint: drift_state created id=${driftRow?.id} ` +
        `(hazard_shift=0, fingerprint captured)`,
    );

    // ── Step 8: Write the baseline into almanac_entry (DD-BASELINE-PERSIST) ─────────────────────
    //
    // The baseline is persisted in the almanac so a re-issue within the persistence window (C12)
    // can INHERIT the fingerprint (anti-exploit: no resetting the baseline by re-issuing).
    //
    // C15 production fix: use effectiveUnderwriterId (= counterpartyId ?? SYNTHETIC_UNDERWRITER_ID)
    //   as the coherent almanac identity. Prior behavior used a SELECT+UPDATE-if-found pattern that
    //   was INERT for standard production players (no almanac row before their first contract →
    //   warn-if-absent → baseline NEVER persisted → anti-exploit dead).
    //
    // The fix: INSERT-if-absent / UPDATE-if-present keyed on (underwriter_id = effectiveUnderwriterId,
    //   player_id). This guarantees the almanac row always exists after the first issueContract call.
    //
    // NOTE: almanac_entry has NO unique constraint on (underwriter_id, player_id) — only a plain
    //   INDEX on player_id. We cannot use Drizzle onConflictDoUpdate. We use SELECT-then-INSERT/UPDATE.
    //   The SELECT is scoped to (underwriter_id = effectiveUnderwriterId, player_id) to match the
    //   inherit check above and the lapse stamp in renewal.service.ts.
    {
      const [existingAlmanacRow] = await this.db
        .select({ id: almanacEntry.id })
        .from(almanacEntry)
        .where(
          and(
            eq(almanacEntry.underwriter_id, effectiveUnderwriterId),
            eq(almanacEntry.player_id, playerId),
          ),
        )
        .orderBy(almanacEntry.created_at)
        .limit(1);

      if (existingAlmanacRow) {
        // UPDATE the existing row with the captured baseline fingerprint.
        await this.db
          .update(almanacEntry)
          .set({
            baseline_fingerprint_stash_ratio: stashRatioValue,
            baseline_fingerprint_courier_cadence: courierCadenceValue,
            baseline_fingerprint_marginal_deal: marginalDealValue,
            baseline_fingerprint_lookout: lookoutValue,
            updated_at: new Date(),
          })
          .where(eq(almanacEntry.id, existingAlmanacRow.id));
        this.logger.log(
          `captureBaselineFingerprint: almanac_entry ${existingAlmanacRow.id} UPDATED with baseline fingerprint ` +
            `(DD-BASELINE-PERSIST, effectiveUnderwriter=${effectiveUnderwriterId})`,
        );
      } else {
        // INSERT a new almanac row (C15 production fix — standard players have no prior row).
        // The row is inserted with status=CLEAN (no poison — first issuance).
        // The baseline_persisted_until_tick is null here — it is stamped later at LAPSE (renewal.service.ts).
        const [insertedRow] = await this.db
          .insert(almanacEntry)
          .values({
            underwriter_id: effectiveUnderwriterId,
            player_id: playerId,
            status: 'CLEAN',
            baseline_fingerprint_stash_ratio: stashRatioValue,
            baseline_fingerprint_courier_cadence: courierCadenceValue,
            baseline_fingerprint_marginal_deal: marginalDealValue,
            baseline_fingerprint_lookout: lookoutValue,
          })
          .returning({ id: almanacEntry.id });
        this.logger.log(
          `captureBaselineFingerprint: almanac_entry INSERTED id=${insertedRow?.id} with baseline fingerprint ` +
            `(DD-BASELINE-PERSIST C15 production fix — effectiveUnderwriter=${effectiveUnderwriterId}, ` +
            `counterpartyId=${counterpartyId ?? 'null'} → synthetic ID used for standard issuance path)`,
        );
      }
    }

    // ── Step 9: Set expires_at_tick on the contract (DD-RENEWAL, C11) ───────────────────────────
    //
    // expires_at_tick = issued_tick + term_days × 1440
    // The renewal check (C11 WEEKLY tick) uses this to detect when renewal is due.
    // term_days from coverage_drift_contract_term_days (default 7 game-days = 1 WEEKLY cycle).
    // [PROPOSED DEFAULT][PROV-Y26Q2] — anchored on the WEEKLY cycle.
    const termDays = insuranceTunables.coverageDriftContractTermDays;
    const expiresAtTick = issuedTickNum + termDays * GAME_MINUTES_PER_DAY;

    await this.db
      .update(insuranceContract)
      .set({
        expires_at_tick: BigInt(expiresAtTick),
        updated_at: new Date(),
      })
      .where(eq(insuranceContract.id, contractId));

    this.logger.log(
      `captureBaselineFingerprint: expires_at_tick set to ${expiresAtTick} ` +
        `(issuedTick=${issuedTickNum} + ${termDays}d × 1440 = ${termDays * GAME_MINUTES_PER_DAY} ticks)`,
    );

    return { inherited: inheritedFingerprint !== null };
  }

  /**
   * `onStashFill(e)` — Drift C4 stash-ratio subscriber.
   *
   * Called ADDITIVELY when `MoneyHoldingService.deposit` succeeds (the return value `{ deposited: true }` is
   * BYTE-IDENTICAL — zero-regression). The subscriber compares the current stash fill ratio against the FROZEN
   * issuance baseline (fingerprint_stash_ratio on coverage_induced_drift_state).
   *
   * NO-OP when no active drift_state covers this player (zero-regression invariant: a world with no active
   * insurance contract → the deposit behaves EXACTLY as before).
   *
   * Logic:
   *   - Load the drift_state for the player (LIMIT 1 — the primary drift_state for this player's stash).
   *   - If absent → return early (no-op).
   *   - Compute current = stashRatioPermille(heldCentsAfter, capacityCents).
   *   - Compare via isLessCautiousThanBaseline('stashRatio', current, baseline):
   *       FIRE   (less cautious): hazard_shift++ (cap 255), update running estimate.
   *       NO-FIRE (same/cautious): update running estimate only.
   *
   * Anti-fabrication: cap HAZARD_SHIFT_MAX (255) from canon T.bo.economic.hazard_shift_max (APPLICATION-level;
   * the column is plain smallint — NO DB CHECK constraint enforces [0..255]).
   * NO Math.random. Deterministic.
   */
  async onStashFill(e: StashFillEvent): Promise<void> {
    // ── Load the active coverage_induced_drift_state for this player ──────────────────────────────
    const [driftRow] = await this.db
      .select({
        id: coverageInducedDriftState.id,
        hazard_shift: coverageInducedDriftState.hazard_shift,
        fingerprint_stash_ratio: coverageInducedDriftState.fingerprint_stash_ratio,
      })
      .from(coverageInducedDriftState)
      .where(eq(coverageInducedDriftState.player_id, e.playerId))
      .limit(1);

    if (!driftRow) {
      // NO-OP: no active drift_state for this player — the deposit hot-path is unchanged (zero-regression).
      return;
    }

    // ── Compute current stash ratio and compare vs frozen baseline ────────────────────────────────
    const current = stashRatioPermille(e.heldCentsAfter, e.capacityCents);
    const baseline = driftRow.fingerprint_stash_ratio;

    // C9: applyLessCautiousIncrement is the ONE clamp path (HAZARD_SHIFT_MAX centralized).
    const { fired, newShift } = this.applyLessCautiousIncrement(driftRow.hazard_shift, 'stashRatio', current, baseline);

    if (fired) {
      // Hotter stash than baseline — increment hazard_shift (cap via HAZARD_SHIFT_MAX = APPLICATION-level cap).
      await this.db
        .update(coverageInducedDriftState)
        .set({
          hazard_shift: newShift,
          fingerprint_stash_ratio: current, // update running estimate
          updated_at: new Date(),
        })
        .where(eq(coverageInducedDriftState.id, driftRow.id));

      this.logger.log(
        `onStashFill: player=${e.playerId} hazard_shift ${driftRow.hazard_shift}→${newShift} ` +
          `(stashRatio current=${current} >= baseline=${baseline} × margin — less cautious)`,
      );
    } else {
      // Same or more cautious — update running estimate only (no hazard_shift increment).
      await this.db
        .update(coverageInducedDriftState)
        .set({
          fingerprint_stash_ratio: current,
          updated_at: new Date(),
        })
        .where(eq(coverageInducedDriftState.id, driftRow.id));
    }
  }

  /**
   * `onCourierRotated(e)` — Drift C5 courier-cadence subscriber.
   *
   * Called ADDITIVELY when `DistributionService.dispatch` commits a new courier_shift and emits
   * `CourierRotatedEvent` onto the CityEventBus. The dispatch return value `{ courierId, routeId, shiftId }`
   * is BYTE-IDENTICAL — zero-regression. The emit is additive (after the commit, before the return).
   *
   * NO-OP when no active drift_state covers this player (zero-regression invariant: a world with no active
   * insurance contract → the dispatch behaves EXACTLY as before).
   *
   * Logic:
   *   1. Load the drift_state for the player (LIMIT 1).
   *   2. If absent → return early (no-op).
   *   3. Query the prior courier_shift for the player (the most recent shift BEFORE the current one,
   *      identified by shift_id ≠ e.courierShiftId, ordered by started_at_tick DESC).
   *   4. Compute the current rotation gap:
   *        - If a prior shift exists: gap = round((e.dispatchedAtTick - priorShift.started_at_tick) / GAME_MINUTES_PER_DAY)
   *        - If no prior shift (first ever dispatch): gap = windowDays (maximum gap — no rotations = worst case).
   *   5. Compare via isLessCautiousThanBaseline('courierCadence', currentGap, baseline):
   *        FIRE   (less cautious): rotating LESS often — hazard_shift++ (cap 255), update running estimate.
   *        NO-FIRE (same/more-often): update running estimate only.
   *
   * Polarity (canon :94): a LONGER gap between rotations = less prudent (rotation = a safety refresh;
   * infrequent rotation = risky). isLessCautiousThanBaseline('courierCadence', gap, baseline) =
   * gap >= baseline + coverage_drift_courier_cadence_slower_margin_days.
   *
   * Cap: 255 = T.bo.economic.hazard_shift_max (APPLICATION-level cap; the column is plain smallint —
   * NO DB CHECK constraint enforces [0..255]). Applied in code here.
   *
   * Anti-fabrication: no inline magnitude — margin from insuranceTunables.coverageDriftCourierCadenceSlowerMarginDays.
   * NO Math.random. Deterministic.
   */
  async onCourierRotated(e: CourierRotatedEvent): Promise<void> {
    // ── Load the active coverage_induced_drift_state for this player ──────────────────────────────
    const [driftRow] = await this.db
      .select({
        id: coverageInducedDriftState.id,
        hazard_shift: coverageInducedDriftState.hazard_shift,
        fingerprint_courier_cadence: coverageInducedDriftState.fingerprint_courier_cadence,
      })
      .from(coverageInducedDriftState)
      .where(eq(coverageInducedDriftState.player_id, e.playerId))
      .limit(1);

    if (!driftRow) {
      // NO-OP: no active drift_state for this player — dispatch hot-path is unchanged (zero-regression).
      return;
    }

    // ── Compute current rotation gap (game-days since prior dispatch) ─────────────────────────────
    //
    // Query the most recent courier_shift for this player that is NOT the current one.
    // The current shift was just committed, so `shift_id != e.courierShiftId` gives the prior one.
    const windowDays = insuranceTunables.coverageDriftFingerprintWindowDays;
    let currentGapDays: number;

    const [priorShift] = await this.db
      .select({ started_at_tick: courierShift.started_at_tick })
      .from(courierShift)
      .where(
        and(
          eq(courierShift.player_id, e.playerId),
          ne(courierShift.shift_id, e.courierShiftId),
        ),
      )
      .orderBy(desc(courierShift.started_at_tick))
      .limit(1);

    if (priorShift) {
      // Gap = ticks between prior and current dispatch, converted to game-days.
      const gapTicks = e.dispatchedAtTick - priorShift.started_at_tick;
      currentGapDays = Math.round(gapTicks / GAME_MINUTES_PER_DAY);
    } else {
      // No prior shift: first dispatch in the player's history → treat as maximum gap (windowDays).
      // This is the worst-case: no rotations = the largest possible cadence.
      currentGapDays = windowDays;
    }

    const baseline = driftRow.fingerprint_courier_cadence;

    // C9: applyLessCautiousIncrement is the ONE clamp path (HAZARD_SHIFT_MAX centralized).
    const { fired, newShift } = this.applyLessCautiousIncrement(driftRow.hazard_shift, 'courierCadence', currentGapDays, baseline);

    if (fired) {
      // Rotating LESS often than baseline (longer gap) — increment hazard_shift.
      // Cap via HAZARD_SHIFT_MAX = T.bo.economic.hazard_shift_max (APPLICATION-level; column is plain smallint).
      await this.db
        .update(coverageInducedDriftState)
        .set({
          hazard_shift: newShift,
          fingerprint_courier_cadence: currentGapDays, // update running estimate
          updated_at: new Date(),
        })
        .where(eq(coverageInducedDriftState.id, driftRow.id));

      this.logger.log(
        `onCourierRotated: player=${e.playerId} hazard_shift ${driftRow.hazard_shift}→${newShift} ` +
          `(courierCadence gap=${currentGapDays}d >= baseline=${baseline}d + margin — less cautious, rotating slower)`,
      );
    } else {
      // Same or more frequent rotation — update running estimate only (no hazard_shift increment).
      await this.db
        .update(coverageInducedDriftState)
        .set({
          fingerprint_courier_cadence: currentGapDays,
          updated_at: new Date(),
        })
        .where(eq(coverageInducedDriftState.id, driftRow.id));
    }
  }

  /**
   * `onDealAccepted(e)` — Drift C6 marginal-deal subscriber.
   *
   * Called ADDITIVELY when `SellingSellService.runMinuteTick` completes a tick with at least one sold deal
   * and emits ONE aggregate `DealAcceptedEvent` onto the CityEventBus (AFTER all mutations + heat committed).
   * The sell hot-path (void return) is BYTE-IDENTICAL — zero-regression.
   *
   * NO-OP when no active drift_state covers this player (zero-regression invariant).
   *
   * Logic:
   *   1. Load the drift_state for the player (LIMIT 1).
   *   2. If absent → return early (no-op).
   *   3. Read the current running estimate: `prevRate = fingerprint_marginal_deal` (starts at 0 at issuance, C3 stub).
   *   4. Classify the tick aggregate as marginal:
   *        marginal if marginPermille < 1000 (below brindle base) OR heatLevel > 0 (any building heat).
   *        The 1000‰ anchor = REUSE of selling.brindle_deal_value_cents_per_gram as the per-mille base.
   *   5. Update the running estimate via exponential smoothing with window K = coverageDriftFingerprintWindowDays:
   *        newRate = clamp(0..1000, round((prevRate × K + (isMarginal ? 1000 : 0)) / (K + 1)))
   *   6. Compare via isLessCautiousThanBaseline('marginalDeal', newRate, FROZEN_BASELINE):
   *        FROZEN_BASELINE = 0 (the C3 issuance stub always sets fingerprint_marginal_deal = 0).
   *        The comparison is ALWAYS vs 0, NOT vs the current running estimate (frozen-baseline invariant).
   *        FIRE   (less cautious): hazard_shift++ (cap 255), update running estimate.
   *        NO-FIRE (same/cautious): update running estimate only.
   *
   * Frozen baseline design (C6 choice, flagged for reviewer⊥):
   *   The C3 stub sets `fingerprint_marginal_deal = marginalDealRatePermille(0, 0) = 0` at issuance.
   *   The frozen baseline IS 0. All C6 comparisons are vs 0 (not sliding). This differs from C4/C5
   *   (stashRatio/courierCadence use the stored column as both running estimate AND sliding baseline).
   *   For marginalDeal, the 0 baseline is frozen by design — the column holds the running estimate only.
   *   [needs reviewer⊥]: frozen-0 vs sliding-baseline (plan §1.3 "baseline figé" design tension).
   *   [needs reviewer⊥]: K-smoothing window vs true deal counter (plan §2.3 flag).
   *
   * Cap: 255 = T.bo.economic.hazard_shift_max (APPLICATION-level). NO Math.random. Deterministic.
   */
  async onDealAccepted(e: DealAcceptedEvent): Promise<void> {
    // ── Load the active coverage_induced_drift_state for this player ──────────────────────────────
    const [driftRow] = await this.db
      .select({
        id: coverageInducedDriftState.id,
        hazard_shift: coverageInducedDriftState.hazard_shift,
        fingerprint_marginal_deal: coverageInducedDriftState.fingerprint_marginal_deal,
      })
      .from(coverageInducedDriftState)
      .where(eq(coverageInducedDriftState.player_id, e.playerId))
      .limit(1);

    if (!driftRow) {
      // NO-OP: no active drift_state for this player — sell hot-path is unchanged (zero-regression).
      return;
    }

    // ── Classify this tick aggregate: marginal? ────────────────────────────────────────────────────
    //
    // A tick is marginal if:
    //   (a) marginPermille < 1000: average realized price below brindle base (scatter zone or below-base substance).
    //       The 1000‰ anchor = REUSE of selling.brindle_deal_value_cents_per_gram (2500¢) as the per-mille base.
    //   (b) heatLevel >= heatThreshold: building heat at or above the threshold (HIGH-heat, not any-heat).
    //       C6 review carry-forward (C9): `heatLevel > 0` was degenerate — any active-selling tick has heat > 0,
    //       classifying ALL deals as marginal. Fixed: `heatLevel >= heatThreshold` where heatThreshold is tunable.
    //       The tunable `coverage_drift_marginal_deal_heat_threshold` defaults to 5 (range 1..20).
    // [needs reviewer⊥]: these thresholds use the "selling chapter's margin/heat scale" (plan Task 6 NOTE).
    const BRINDLE_BASE_PERMILLE = 1000; // REUSE: brindle deal value = the 1000‰ anchor
    const heatThreshold = insuranceTunables.coverageDriftMarginalDealHeatThreshold;
    const isMarginal = e.marginPermille < BRINDLE_BASE_PERMILLE || e.heatLevel >= heatThreshold;

    // ── Update the running-estimate fingerprint_marginal_deal (exponential smoothing) ─────────────
    //
    // newRate = clamp(0..1000, round((prevRate × K + (isMarginal ? 1000 : 0)) / (K + 1)))
    // Converges from 0 toward 1000‰ when all ticks are marginal; stays near 0 when all are prudent.
    // K = coverageDriftFingerprintWindowDays (default 30): larger K = slower convergence.
    // [needs reviewer⊥]: window-K smoothing vs a true deal counter.
    const K = insuranceTunables.coverageDriftFingerprintWindowDays;
    const prevRate = driftRow.fingerprint_marginal_deal;
    const newRate = Math.min(1000, Math.max(0, Math.round((prevRate * K + (isMarginal ? 1000 : 0)) / (K + 1))));

    // ── Compare vs FROZEN baseline = 0 (C3 stub: marginalDeal = 0 at issuance) ────────────────────
    //
    // The frozen baseline for marginalDeal is 0 (the C3 captureBaselineFingerprint always sets
    // fingerprint_marginal_deal = marginalDealRatePermille(0, 0) = 0 at issuance time, since no deal
    // instrumentation exists at C3). The comparison is ALWAYS vs 0, not the running estimate.
    // [needs reviewer⊥]: frozen-0 choice vs reading almanac_entry.baseline_fingerprint_marginal_deal.
    const FROZEN_MARGINAL_DEAL_BASELINE = 0; // C3 issuance stub = 0 (no marginal deals at issuance)

    // C9: applyLessCautiousIncrement is the ONE clamp path (HAZARD_SHIFT_MAX centralized).
    const { fired, newShift } = this.applyLessCautiousIncrement(driftRow.hazard_shift, 'marginalDeal', newRate, FROZEN_MARGINAL_DEAL_BASELINE);

    if (fired) {
      // More marginal ticks than baseline — increment hazard_shift (cap via HAZARD_SHIFT_MAX = APPLICATION-level cap).
      await this.db
        .update(coverageInducedDriftState)
        .set({
          hazard_shift: newShift,
          fingerprint_marginal_deal: newRate, // update running estimate
          updated_at: new Date(),
        })
        .where(eq(coverageInducedDriftState.id, driftRow.id));

      this.logger.log(
        `onDealAccepted: player=${e.playerId} hazard_shift ${driftRow.hazard_shift}→${newShift} ` +
          `(marginalDeal newRate=${newRate}‰ >= frozenBaseline=0 + margin — less cautious) ` +
          `[tick: marginPermille=${e.marginPermille}, heatLevel=${e.heatLevel}, isMarginal=${isMarginal}, heatThreshold=${heatThreshold}]`,
      );
    } else {
      // Same or more cautious deal mix — update running estimate only (no hazard_shift increment).
      await this.db
        .update(coverageInducedDriftState)
        .set({
          fingerprint_marginal_deal: newRate,
          updated_at: new Date(),
        })
        .where(eq(coverageInducedDriftState.id, driftRow.id));
    }
  }

  /**
   * `onLookoutAssigned(e: LookoutAssignedEvent)` — the lookout-rate drift subscriber (Drift C7).
   *
   * Fired when a SECURITY lieutenant is recruited (DD-LOOKOUT-MAPPING). Re-evaluates the CURRENT lookout
   * rate vs the player's frozen baseline (fingerprint_lookout).
   *
   * Algorithm:
   *   1. Load drift_state for the player. If none: NO-OP (zero-regression).
   *   2. Recompute CURRENT lookout rate = count SECURITY lts / count operational buildings (permille).
   *   3. If isLessCautiousThanBaseline('lookout', currentRate, frozenBaseline):
   *      — hazard_shift++ (cap 255 = T.bo.economic.hazard_shift_max); update fingerprint_lookout.
   *   4. Else: update fingerprint_lookout only (no hazard_shift increment).
   *
   * Coherent resolution: assigning MORE lookouts can still show chronic under-coverage if the player's
   * historical baseline was very high (e.g. baseline=1000‰, rate goes from 0 to 500‰ — still under 850‰ threshold).
   * [RATIFIED C7 review]: both-ways falsifiability proven by C7 E2E spec (fire + no-fire scenarios, insurance_drift_lookout_assigned.spec.ts).
   *
   * Cap: HAZARD_SHIFT_MAX = T.bo.economic.hazard_shift_max (APPLICATION-level). NO Math.random. Deterministic.
   */
  async onLookoutAssigned(e: LookoutAssignedEvent): Promise<void> {
    // ── Load the active coverage_induced_drift_state for this player ─────────────────────────────────
    const [driftRow] = await this.db
      .select({
        id: coverageInducedDriftState.id,
        hazard_shift: coverageInducedDriftState.hazard_shift,
        fingerprint_lookout: coverageInducedDriftState.fingerprint_lookout,
      })
      .from(coverageInducedDriftState)
      .where(eq(coverageInducedDriftState.player_id, e.playerId))
      .limit(1);

    if (!driftRow) {
      // NO-OP: no active drift_state for this player — recruit hot-path unchanged (zero-regression).
      return;
    }

    // ── Recompute CURRENT lookout rate (count SECURITY lts / count operational buildings, permille) ──
    const [secRows, opsRows] = await Promise.all([
      this.db
        .select({ cnt: count() })
        .from(lieutenant)
        .where(
          and(
            eq(lieutenant.player_id, e.playerId),
            eq(lieutenant.role_id, SECURITY_ROLE_ID),
          ),
        ),
      this.db
        .select({ cnt: count() })
        .from(buildingOperationalState)
        .where(eq(buildingOperationalState.player_id, e.playerId)),
    ]);
    const secCount = Number(secRows[0]?.cnt ?? 0);
    const totalOps = Number(opsRows[0]?.cnt ?? 0);
    const currentRate = lookoutRatePermille(secCount, totalOps);

    const baseline = driftRow.fingerprint_lookout;

    // C9: applyLessCautiousIncrement is the ONE clamp path (HAZARD_SHIFT_MAX centralized).
    const { fired, newShift } = this.applyLessCautiousIncrement(driftRow.hazard_shift, 'lookout', currentRate, baseline);

    if (fired) {
      // Chronic under-coverage: rate still below baseline-margin even after assignment → hazard_shift++
      // Cap via HAZARD_SHIFT_MAX = T.bo.economic.hazard_shift_max (APPLICATION-level, not DB check).
      await this.db
        .update(coverageInducedDriftState)
        .set({
          hazard_shift: newShift,
          fingerprint_lookout: currentRate,
          updated_at: new Date(),
        })
        .where(eq(coverageInducedDriftState.id, driftRow.id));

      this.logger.log(
        `onLookoutAssigned: player=${e.playerId} hazard_shift ${driftRow.hazard_shift}→${newShift} ` +
          `(lookoutRate=${currentRate}‰ ≤ baseline=${baseline}‰ - ${insuranceTunables.coverageDriftLookoutRateMarginPermille}‰ margin — chronic under-coverage) ` +
          `[lt=${e.lieutenantId}, building=${e.buildingId}]`,
      );
    } else {
      // Adequate coverage — update running estimate only (no hazard_shift increment).
      await this.db
        .update(coverageInducedDriftState)
        .set({
          fingerprint_lookout: currentRate,
          updated_at: new Date(),
        })
        .where(eq(coverageInducedDriftState.id, driftRow.id));
    }
  }

  /**
   * `onRuleViolation(e: RuleViolationEvent)` — the unconditional drift subscriber (Drift C8).
   *
   * DD-BOSSMIRROR-COUPLE (canon :116): a Boss Mirror rule violation IS an unconditional less-cautious act.
   * NO feature comparison (isLessCautiousThanBaseline) — the violation ALWAYS increments hazard_shift.
   *
   * Scope: PLAYER-WIDE — increments hazard_shift on ALL active coverage_induced_drift_state rows for
   * the player (not asset-scoped). A declared-rule violation signals a player-level behavioural choice.
   * [RATIFIED C8 review]: player-wide vs asset-scoped — decision ratified by C8 E2E spec (insurance_drift_rule_violation.spec.ts).
   * Both-ways proven: 2 drift_state rows both get +1 (UNCONDITIONAL, no feature comparison).
   *
   * C9 doc: `onRuleViolation` bypasses `applyLessCautiousIncrement` — the increment is UNCONDITIONAL
   * (canon :116 singular "simultaneously"). It applies its own inline clamp: Math.min(HAZARD_SHIFT_MAX, ...).
   * This is the only handler that clamps outside `applyLessCautiousIncrement`.
   *
   * Algorithm:
   *   1. Load ALL coverage_induced_drift_state rows for the player. If none: NO-OP (zero-regression).
   *   2. For EACH active drift_state: hazard_shift = min(HAZARD_SHIFT_MAX, hazard_shift + 1).
   *   3. NO isLessCautiousThanBaseline call — the increment is UNCONDITIONAL.
   *
   * Cap: HAZARD_SHIFT_MAX = T.bo.economic.hazard_shift_max (APPLICATION-level). NO Math.random. Deterministic.
   */
  async onRuleViolation(e: RuleViolationEvent): Promise<void> {
    // ── Load ALL active coverage_induced_drift_state rows for this player ───────────────────────────
    const driftRows = await this.db
      .select({
        id: coverageInducedDriftState.id,
        hazard_shift: coverageInducedDriftState.hazard_shift,
      })
      .from(coverageInducedDriftState)
      .where(eq(coverageInducedDriftState.player_id, e.playerId));

    if (driftRows.length === 0) {
      // NO-OP: no active drift_state for this player — recordViolation hot-path unchanged (zero-regression).
      return;
    }

    // ── Unconditional hazard_shift++ on ALL active drift_state rows (player-wide, DD-BOSSMIRROR-COUPLE) ──
    // The violation is UNCONDITIONAL — no feature comparison (canon :116 couples Boss Mirror violation
    // SIMULTANEOUSLY with the drift increment). Each drift_state row is incremented independently.
    // NOTE: onRuleViolation bypasses applyLessCautiousIncrement (unconditional — canon :116 singular).
    // Uses HAZARD_SHIFT_MAX (the central constant) for the clamp — consistent with the other handlers.
    for (const driftRow of driftRows) {
      const newShift = Math.min(HAZARD_SHIFT_MAX, driftRow.hazard_shift + 1);
      await this.db
        .update(coverageInducedDriftState)
        .set({
          hazard_shift: newShift,
          updated_at: new Date(),
        })
        .where(eq(coverageInducedDriftState.id, driftRow.id));

      this.logger.log(
        `onRuleViolation: player=${e.playerId} driftState=${driftRow.id} hazard_shift ${driftRow.hazard_shift}→${newShift} ` +
          `(UNCONDITIONAL — DD-BOSSMIRROR-COUPLE, canon :116) [lt=${e.lieutenantId}, rule=${e.ruleId}, severity=${e.severityBucket}]`,
      );
    }
  }

  /**
   * `runWeeklyTick(ctx, weekId)` — Drift C10 WEEKLY tick.
   *
   * Called once per in-game week by the INSURANCE_DRIFT_TICK system (WEEKLY/8, registered in
   * InsuranceModule.onApplicationBootstrap()). weekId = Math.floor(ctx.gameMinute / WEEKLY_MINUTES).
   *
   * For EACH coverage_induced_drift_state row for ctx.playerId:
   *   1. Idempotence guard: if last_drift_tick === BigInt(weekId) → skip this row (already ticked).
   *   2. Read tunables: α = coverageDriftAlpha, base = coverageDriftBaseLossProbPermille (may be null),
   *      decay = coverageDriftShiftDecayPerWeek.
   *   3. If baseLossProb !== null: recompute
   *        true_loss_prob = Math.round(base · (1 + α · hazard_shift))
   *      This is computed server-side and logged — NOT stored (no extra column, C10 PROPOSED decision).
   *      When baseLossProb is null (uncalibrated sentinel): skip recompute, log null-path, STILL decay.
   *   4. Decay: newShift = Math.max(0, hazard_shift − coverageDriftShiftDecayPerWeek). Floors at 0.
   *   5. UPDATE row: hazard_shift = newShift, last_drift_tick = BigInt(weekId), updated_at = new Date().
   *
   * Organically a no-op for players with no drift_state rows (zero-regression invariant).
   * No Math.random(). Deterministic — weekId from ctx.gameMinute only.
   * Canon: insurance_mechanics.md §4.2 (:100-104).
   * C11 NOTE: renewal will be inserted BEFORE the decay in §2.6 strict order — this tick does decay only (C10).
   *
   * @param ctx — the CitySimTickContext (ctx.playerId identifies the player; ctx.gameMinute drives weekId).
   * @param weekId — the current in-game week number (Math.floor(ctx.gameMinute / WEEKLY_MINUTES)).
   */
  async runWeeklyTick(ctx: CitySimTickContext, weekId: number): Promise<string[]> {
    // ── Load ALL coverage_induced_drift_state rows for this player ──────────────────────────────
    const driftRows = await this.db
      .select({
        id: coverageInducedDriftState.id,
        hazard_shift: coverageInducedDriftState.hazard_shift,
        last_drift_tick: coverageInducedDriftState.last_drift_tick,
      })
      .from(coverageInducedDriftState)
      .where(eq(coverageInducedDriftState.player_id, ctx.playerId));

    if (driftRows.length === 0) {
      // Organic no-op: player has no drift_state rows — zero-regression invariant.
      return [];
    }

    // ── Read tunables ONCE (same values for all rows in the tick) ──────────────────────────────
    const alpha = insuranceTunables.coverageDriftAlpha;
    const baseLossProb = insuranceTunables.coverageDriftBaseLossProbPermille; // number | null

    // IDs that were actually ticked this invocation (not skipped) — returned to caller so
    // applyWeeklyDecay only processes rows ticked NOW (not stale rows from a prior run with same weekId).
    const tickedIds: string[] = [];

    for (const driftRow of driftRows) {
      // ── Idempotence guard: skip if this week was already ticked ────────────────────────────
      if (driftRow.last_drift_tick === BigInt(weekId)) {
        this.logger.log(
          `runWeeklyTick: player=${ctx.playerId} driftState=${driftRow.id} weekId=${weekId} — SKIP (already ticked, idempotent)`,
        );
        continue;
      }

      // ── Recompute true_loss_prob (computed server-side, not stored — C10 decision) ──────────
      // When baseLossProb is null (uncalibrated sentinel — C2): skip recompute.
      if (baseLossProb !== null) {
        const trueLossProb = Math.round(baseLossProb * (1 + alpha * driftRow.hazard_shift));
        this.logger.log(
          `runWeeklyTick: player=${ctx.playerId} driftState=${driftRow.id} weekId=${weekId} ` +
            `true_loss_prob=${trueLossProb}‰ ` +
            `(base=${baseLossProb}‰ × (1 + α=${alpha} × shift=${driftRow.hazard_shift})) [computed, not stored — C10]`,
        );
      } else {
        // null-base guard: base_loss_prob uncalibrated — skip recompute (do NOT crash, do NOT fabricate).
        this.logger.log(
          `runWeeklyTick: player=${ctx.playerId} driftState=${driftRow.id} weekId=${weekId} ` +
            `base_loss_prob=null (uncalibrated sentinel) — skip true_loss_prob recompute`,
        );
      }

      // ── Stamp last_drift_tick WITHOUT decaying yet ────────────────────────────────────────────
      // §2.6: decay comes AFTER renewal reads hazard_shift (applyWeeklyDecay step).
      await this.db
        .update(coverageInducedDriftState)
        .set({ last_drift_tick: BigInt(weekId), updated_at: new Date() })
        .where(eq(coverageInducedDriftState.id, driftRow.id));

      tickedIds.push(driftRow.id);
      this.logger.log(
        `runWeeklyTick: player=${ctx.playerId} driftState=${driftRow.id} weekId=${weekId} ` +
          `— recompute done, last_drift_tick stamped (decay deferred to §2.6 decay step)`,
      );
    }

    return tickedIds;
  }

  /**
   * `applyWeeklyDecay(ctx, weekId, tickedIds)` — C11 decay step (§2.6 LAST in combined tick).
   *
   * Applies hazard_shift decay ONLY to the rows identified by `tickedIds` (the IDs returned by
   * `runWeeklyTick` in the SAME invocation). This ensures idempotence: if `runWeeklyTick` skipped
   * all rows (already-ticked guard), `tickedIds` is empty and no decay is applied on re-call.
   *
   * §2.6 strict order: (1) recompute, (2) renewal, (3) decay LAST.
   *
   * @param ctx — CitySimTickContext (ctx.playerId identifies the player).
   * @param weekId — current in-game week number (for logging).
   * @param tickedIds — set of drift_state IDs that were actually ticked in this invocation by runWeeklyTick.
   */
  async applyWeeklyDecay(ctx: CitySimTickContext, weekId: number, tickedIds: string[]): Promise<void> {
    // If runWeeklyTick ticked nothing (idempotence guard fired for all rows), no decay to apply.
    if (tickedIds.length === 0) {
      return;
    }

    // Load current hazard_shift for the rows that were just ticked.
    const driftRows = await this.db
      .select({
        id: coverageInducedDriftState.id,
        hazard_shift: coverageInducedDriftState.hazard_shift,
      })
      .from(coverageInducedDriftState)
      .where(eq(coverageInducedDriftState.player_id, ctx.playerId));

    const decay = insuranceTunables.coverageDriftShiftDecayPerWeek;

    for (const driftRow of driftRows) {
      if (!tickedIds.includes(driftRow.id)) {
        // Not in the ticked set — skip (different row or idempotence guard skipped it)
        continue;
      }
      const newShift = Math.max(0, driftRow.hazard_shift - decay);
      await this.db
        .update(coverageInducedDriftState)
        .set({ hazard_shift: newShift, updated_at: new Date() })
        .where(eq(coverageInducedDriftState.id, driftRow.id));

      this.logger.log(
        `applyWeeklyDecay: player=${ctx.playerId} driftState=${driftRow.id} weekId=${weekId} ` +
          `hazard_shift ${driftRow.hazard_shift}→${newShift} (decay=${decay}, floor=0)`,
      );
    }
  }
}
