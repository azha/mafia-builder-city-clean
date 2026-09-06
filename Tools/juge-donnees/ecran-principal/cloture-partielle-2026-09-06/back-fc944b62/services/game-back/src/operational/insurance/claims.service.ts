// IMPLEMENTS: docs/tech/04c_market_reputation_insurance/insurance_mechanics.md §4.1 (:62-65)
//             docs/superpowers/plans/2026-06-17-depth-insurance-underwriting-walk-plan.md Task 6 (C6)
//             docs/superpowers/plans/2026-06-17-depth-insurance-underwriting-walk-plan.md Task 9 (C9)
//             design §1.4 (DD-FRAUD-AUTOCLAIM correction — 2026-06-18)
//             "Shared signatures" — ClaimsService, fileClaim, computePayout
//             — Insurance C6 — 2026-06-17
//             — Insurance C9 — 2026-06-17
//             — Insurance §1.4 DD-FRAUD-AUTOCLAIM correction — 2026-06-18
//
// `ClaimsService` — PROPERTY/STASH_LOSS claims filed on BuildingRaidedEvent (C6);
//                    COURIER_ARREST claims filed on CourierInterceptedEvent (C9);
//                    FENCE_DEFAULT claims filed on FenceDefaultedEvent (C9).
//
// ── Architecture (additive subscriber — zero-regression invariant §0.2) ───────────────────────────
//
// Subscribes to `BuildingRaidedEvent` via `bus.onBuildingRaided()` on `OnModuleInit`.
// Pattern mirrors `RaidExceptionProducerService` exactly (the additive bus subscriber for that event):
//   - subscribe in onModuleInit
//   - handler is a fire-and-forget async with .catch containment (bus sync delivery, DB work async)
//
// DD-FRAUD-AUTOCLAIM (design §1.4 correction, 2026-06-17): All 3 auto-claim handlers (handleBuildingRaided,
//   handleCourierIntercepted, handleFenceDefaulted) do NOT call checkClaimAgainstWalk / applyFraudPenalty.
//   Auto-generated claims are TRUTHFUL BY CONSTRUCTION — claim_basis is always consistent with the real
//   loss event. Canon :19 anchors fraud on a PLAYER staging ACTION, not a system-emitted claim.
//   Fraud machinery is RETAINED and exercised by BO force-fraud-detection + future player-submitted-claim (TD-126).
//
// On receipt of BuildingRaidedEvent:
//   1. Look up an ACTIVE insurance_contract of type PROPERTY or STASH_LOSS where:
//      - contract.player_id = event.playerId
//      - contract.asset_ref = event.buildingId (the covered building)
//   2. If NONE → return (no-op, zero-regression — the raid behaves EXACTLY as without this service).
//   3. If one → JOIN building_raid on (player_id, building_id, raided_at_tick == event.gameMinute)
//      to read grams_seized + seized_cents + building_id (fact #3 — the event carries NO seizure amount).
//   4. fileClaim(playerId, contractId, claimBasis, lossEventRef) → insurance_claim (status=FILED).
//   [NO fraud-check — DD-FRAUD-AUTOCLAIM]
//   5. computePayout(claimId) → re-derives loss from DB:
//      - loads insurance_claim → contract_id, loss_event_ref
//      - loads insurance_contract → type, insured_value_cents
//      - loads building_raid → grams_seized, seized_cents, building_id
//      - loads building_operational_state → operational_type
//      STASH_LOSS:
//        money_holding building → loss = seized_cents (cash vault leg)
//        product building      → loss = grams_seized × sellingTunables.brindleDealValueCentsPerGram
//      PROPERTY: loss = insured_value_cents
//      payout = Math.round(fraction × loss)
//   6. Credit payout_cents to economy_states.cash_cents (same atomic pattern as C4 debit).
//   7. Mark claim PAID.
//
// ── Zero-regression (§0.2 — the non-negotiable) ─────────────────────────────────────────────────
//
// RaidExecutionService is NOT modified (git diff raid-execution.service.ts = empty).
// The subscriber is PURELY ADDITIVE:
//   - reads: building_raid, insurance_contract, insurance_claim, building_operational_state (all JOINs)
//   - writes: insurance_claim (INSERT + UPDATE status), economy_states.cash_cents (credit)
// A world with NO active PROPERTY/STASH_LOSS contract for the raided building:
//   the subscriber returns at step 2 → no write to any table → raid behaves exactly as before C6.
//
// ── R2.2 ─────────────────────────────────────────────────────────────────────────────────────────
//
// payout_cents is a CLEAR transaction value (DD-P5 — the player is credited this amount).
// findings_bitmask, observation_depth, grams_seized, seized_cents are NOT returned to the client.
//
// ── Anti-fabrication ─────────────────────────────────────────────────────────────────────────────
//
// No Math.random. All coverage fractions from insuranceTunables (registry-first, C1).
// Loss is derived from DB rows (building_raid + building_operational_state) — never invented.
// For product buildings: grams_seized × sellingTunables.brindleDealValueCentsPerGram (registry key).

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { and, eq, gte, inArray } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { Inject } from '@nestjs/common';
import { insuranceClaim, insuranceContract } from '../../db/schema/insurance';
import { buildingRaid, buildingOperationalState, courierShift } from '../../db/schema/operational_chain';
import { launderingNode } from '../../db/schema/pipeline_and_laundering';
import { economyState } from '../../db/schema/player_economy_state';
import {
  CityEventBus,
  type BuildingRaidedEvent,
  type CourierInterceptedEvent,
  type FenceDefaultedEvent,
} from '../../citysim/events/city-event-bus';
import { insuranceTunables } from './insurance-tunables';
import { sellingTunables } from '../selling/selling-tunables';
import { citySimClock } from '../../db/schema/city_sim_clock';
import { sql } from 'drizzle-orm';
// FraudDetectionService import removed — DD-FRAUD-AUTOCLAIM: auto-claim handlers no longer
// call checkClaimAgainstWalk / applyFraudPenalty. Fraud machinery exercised via BO path only.

/**
 * NIGHTLY_CYCLE_HOURS — the window used for the FENCE_DEFAULT payout formula.
 *
 * Architectural constant: represents the length of one in-game nightly cycle in hours.
 * FENCE_DEFAULT payout = round(fenceThroughputLossCompensationFraction × throughputInPerHour × NIGHTLY_CYCLE_HOURS).
 * This is a NAMED CONSTANT (not a tunable) — the formula window is structurally tied to the
 * nightly cadence and does not vary per deployment. fenceClaimCooldownHours IS a tunable
 * because it governs the anti-double-pay window (GAME-hours, keyed on filed_tick — C9 follow-up
 * fix; [PROPOSED DEFAULT][PROV-Y26Q2]).
 */
const NIGHTLY_CYCLE_HOURS = 24;

@Injectable()
export class ClaimsService implements OnModuleInit {
  private readonly logger = new Logger(ClaimsService.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly bus: CityEventBus,
  ) {
    // DD-FRAUD-AUTOCLAIM (design §1.4, 2026-06-17 correction):
    // FraudDetectionService removed from this constructor — auto-claim handlers do NOT
    // call checkClaimAgainstWalk / applyFraudPenalty. Fraud machinery is used ONLY by:
    //   (a) InsuranceAdminController.forceFraudDetection (BO path)
    //   (b) InsuranceTestController.fileClaimWithWalk (_test route — models player staging)
    //   (c) InsuranceTestController.setupProjectionFrauded (_test setup — injects FRAUDED state)
    // [RATIFIED C13 — DD-FRAUD-AUTOCLAIM + bit-0 map approved by reviewer⊥]
  }

  /**
   * Subscribe to BuildingRaidedEvent on module init (additive bus subscriber).
   *
   * Pattern mirrors RaidExceptionProducerService.onModuleInit() exactly:
   *   - subscribe synchronously in onModuleInit
   *   - handler is async + .catch-contained (bus sync delivery; DB work is async)
   *   - no import from raid module (one-way coupling via the bus)
   *
   * The handler is a no-op for the common case (no ACTIVE PROPERTY/STASH_LOSS contract
   * covering the raided building). The C0 raid regression floor specs are unaffected.
   */
  onModuleInit(): void {
    // ── Subscribe to BuildingRaidedEvent (C6 — PROPERTY/STASH_LOSS claims) ────────────────────────
    this.bus.onBuildingRaided((event) => {
      // Async work is .catch-contained: a transient DB fault can never bubble as an unhandled
      // rejection (logged + contained; the raid itself has already committed — the subscriber
      // is an independent post-raid enrichment, not part of the seizure transaction).
      this.handleBuildingRaided(event).catch((err) =>
        this.logger.error(
          `ClaimsService: BuildingRaidedEvent handler failed (contained): ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    });
    this.logger.log(
      'ClaimsService subscribed to BuildingRaidedEvent — ' +
        'on receipt: check for ACTIVE PROPERTY/STASH_LOSS contract covering the raided building; ' +
        'if none → no-op (zero-regression §0.2); ' +
        'if one → JOIN building_raid by (player_id, building_id, raided_at_tick) (fact #3); ' +
        'fileClaim + computePayout (re-derives loss from DB: seized_cents for cash-vault, ' +
        'grams×rate for product, insured_value for PROPERTY) → credit payout → PAID.',
    );

    // ── Subscribe to CourierInterceptedEvent (C9 — COURIER_ARREST claims) ─────────────────────────
    this.bus.onCourierIntercepted((event) => {
      this.handleCourierIntercepted(event).catch((err) =>
        this.logger.error(
          `ClaimsService: CourierInterceptedEvent handler failed (contained): ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    });
    this.logger.log(
      'ClaimsService subscribed to CourierInterceptedEvent — ' +
        'on receipt: look up ACTIVE COURIER_ARREST contract for playerId (no asset_ref filter); ' +
        'if none → no-op (zero-regression §0.2); ' +
        'guard double-claim via loss_event_ref; fileClaim + computePayout ' +
        '(lawyer_fee + round(fraction × cargoCents)) → credit payout → PAID.',
    );

    // ── Subscribe to FenceDefaultedEvent (C9 — FENCE_DEFAULT claims) ──────────────────────────────
    this.bus.onFenceDefaulted((event) => {
      this.handleFenceDefaulted(event).catch((err) =>
        this.logger.error(
          `ClaimsService: FenceDefaultedEvent handler failed (contained): ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    });
    this.logger.log(
      'ClaimsService subscribed to FenceDefaultedEvent — ' +
        'on receipt: look up ACTIVE FENCE_DEFAULT contract for playerId; ' +
        'if none → no-op (zero-regression §0.2); ' +
        'throttle: guard re-pay within fenceClaimCooldownHours hours (C9 new tunable); ' +
        'fileClaim + computePayout (round(fraction × throughput × NIGHTLY_CYCLE_HOURS)) → credit payout → PAID.',
    );
  }

  /**
   * Handle a BuildingRaidedEvent — the additive subscriber.
   *
   * Steps:
   *   1. Look up ACTIVE PROPERTY/STASH_LOSS contract for (playerId, buildingId).
   *   2. If none → return (no-op, zero-regression).
   *   3. JOIN building_raid by (playerId, buildingId, raided_at_tick == gameMinute).
   *   4. fileClaim + computePayout (re-derives loss from DB) → credit payout → PAID.
   */
  private async handleBuildingRaided(event: BuildingRaidedEvent): Promise<void> {
    // ── Step 1: Look up ACTIVE PROPERTY/STASH_LOSS contract for this (player, building) ──────────
    //
    // The contract's asset_ref = the covered building_id (set at issuance by the trigger-raid route
    // or the real player flow). We filter by type IN ('PROPERTY', 'STASH_LOSS') and status = 'ACTIVE'.
    const [contract] = await this.db
      .select({
        id: insuranceContract.id,
        type: insuranceContract.type,
        player_id: insuranceContract.player_id,
        asset_ref: insuranceContract.asset_ref,
      })
      .from(insuranceContract)
      .where(
        and(
          eq(insuranceContract.player_id, event.playerId),
          eq(insuranceContract.asset_ref, event.buildingId),
          eq(insuranceContract.status, 'ACTIVE'),
        ),
      )
      .limit(1);

    // ── Step 2: No-op if no ACTIVE PROPERTY/STASH_LOSS contract for this building ────────────────
    //
    // Zero-regression §0.2: a world with no active contract → the subscriber returns here.
    // The raid behaves EXACTLY as before C6 (no write to any insurance table or economy_states).
    if (!contract) {
      return;
    }

    // Only handle PROPERTY and STASH_LOSS (COURIER_ARREST and FENCE_DEFAULT are C9).
    if (contract.type !== 'PROPERTY' && contract.type !== 'STASH_LOSS') {
      return;
    }

    this.logger.log(
      `ClaimsService: BuildingRaidedEvent received — ` +
        `player=${event.playerId} building=${event.buildingId} tick=${event.gameMinute} ` +
        `contract=${contract.id} type=${contract.type} — filing claim.`,
    );

    // ── Step 3: JOIN building_raid by (player_id, building_id, raided_at_tick == gameMinute) ─────
    //
    // Fact #3 (design §0.1/§2.1): the event carries NO seizure amount; the loss data lives in
    // building_raid (inserted by RaidExecutionService.runMinuteTick before emitting the event).
    // The JOIN is by (player_id, building_id, raided_at_tick == event.gameMinute) — the
    // building_raid_player_building_idx (operational_chain.ts:297) covers (player_id, building_id).
    const [raidRow] = await this.db
      .select({
        raid_id: buildingRaid.raid_id,
        grams_seized: buildingRaid.grams_seized,
        raided_at_tick: buildingRaid.raided_at_tick,
      })
      .from(buildingRaid)
      .where(
        and(
          eq(buildingRaid.player_id, event.playerId),
          eq(buildingRaid.building_id, event.buildingId),
          eq(buildingRaid.raided_at_tick, event.gameMinute),
        ),
      )
      .limit(1);

    if (!raidRow) {
      // The raid row was not found — defensive guard. This should not occur since the event is
      // emitted AFTER the seizure tx commits (RaidExecutionService inserts building_raid before emit).
      this.logger.warn(
        `ClaimsService: no building_raid row for player=${event.playerId} building=${event.buildingId} ` +
          `tick=${event.gameMinute} — skipping claim (defensive).`,
      );
      return;
    }

    this.logger.log(
      `ClaimsService: raid JOIN — raid_id=${raidRow.raid_id} grams_seized=${raidRow.grams_seized}.`,
    );

    // ── Step 4: fileClaim — insert insurance_claim (status=FILED) ─────────────────────────────────
    //
    // claim_basis: HEAT_RAID for PROPERTY (the building was raided by police heat).
    //              DEALER_TURNOVER for STASH_LOSS (the stash lost its stock to a raid).
    // These map to FindingType contradiction in FraudDetectionService (C10) for the BO path.
    // loss_event_ref = building_raid.raid_id (the FK to the loss event — fact #3).
    const claimBasisValue =
      contract.type === 'PROPERTY' ? ('HEAT_RAID' as const) : ('DEALER_TURNOVER' as const);

    // Pass event.gameMinute as the authoritative filed_tick.
    const { claimId } = await this.fileClaim(
      event.playerId,
      contract.id,
      claimBasisValue,
      raidRow.raid_id,
      event.gameMinute,
    );

    // ── DD-FRAUD-AUTOCLAIM (design §1.4, 2026-06-17 correction) ──────────────────────────────────
    //
    // NO fraud-check on this auto-claim handler. Auto-generated claims are truthful BY CONSTRUCTION:
    //   - claim_basis is assigned from the contract type + the real BuildingRaidedEvent.
    //   - It is always consistent with the actual loss event — never a misrepresentation.
    //   - Canon :19 anchors fraud on a PLAYER staging ACTION, not on a system-emitted claim.
    //
    // The fraud machinery (checkClaimAgainstWalk / applyFraudPenalty) is RETAINED and exercised
    // by: (a) the BO force-fraud-detection path; (b) future player-submitted-claim (TD-126).
    // [RATIFIED C13 — DD-FRAUD-AUTOCLAIM]

    // ── Step 5 (was 6): computePayout — re-derives loss from DB, computes payout ──────────────────
    //
    // computePayout reads the claim → contract → building_raid → building_operational_state
    // to derive the loss amount without relying on caller-supplied values.
    const { payoutCents } = await this.computePayout(event.playerId, claimId);

    // ── Step 7: Credit payout to economy_states.cash_cents (DD-P5 clear transaction) ─────────────
    //
    // Same atomic pattern as C4's premium debit (but a credit: + payout_cents).
    // Guards: if the economy_states row does not exist → log + skip credit (defensive).
    if (payoutCents > 0) {
      const creditResult = await this.db
        .update(economyState)
        .set({ cash_cents: sql`${economyState.cash_cents} + ${BigInt(payoutCents)}` })
        .where(eq(economyState.player_id, event.playerId))
        .returning({ cash_cents: economyState.cash_cents });

      if (creditResult.length === 0) {
        this.logger.warn(
          `ClaimsService: no economy_states row for player=${event.playerId} — payout credit skipped (defensive).`,
        );
      } else {
        this.logger.log(
          `ClaimsService: payout credited — player=${event.playerId} payout_cents=${payoutCents} ` +
            `new_cash=${Number(creditResult[0]!.cash_cents)}.`,
        );
      }
    }

    // ── Step 8: Mark claim PAID ───────────────────────────────────────────────────────────────────
    await this.db
      .update(insuranceClaim)
      .set({ status: 'PAID', updated_at: new Date() })
      .where(eq(insuranceClaim.id, claimId));

    this.logger.log(
      `ClaimsService: claim PAID — claimId=${claimId} contract=${contract.id} ` +
        `type=${contract.type} payout=${payoutCents}.`,
    );
  }

  /**
   * Handle a CourierInterceptedEvent — the C9 additive subscriber for COURIER_ARREST.
   *
   * Steps:
   *   1. Look up ACTIVE COURIER_ARREST contract for playerId (no asset_ref filter).
   *   2. If none → return (no-op, zero-regression §0.2).
   *   3. Guard double-claim: check insurance_claim WHERE loss_event_ref = event.courierShiftId.
   *   4. fileClaim(playerId, contractId, 'COURIER_BETRAYAL', event.courierShiftId).
   *   5. computePayout → payout = courierLawyerFeePayoutCents + round(courierCargoRecoveryFraction × event.cargoCents).
   *   6. Credit payout to economy_states.cash_cents.
   *   7. Mark claim PAID.
   */
  private async handleCourierIntercepted(event: CourierInterceptedEvent): Promise<void> {
    // ── Step 1: Look up ACTIVE COURIER_ARREST contract for this player ────────────────────────────
    //
    // No asset_ref filter (COURIER_ARREST covers the player, not a specific building).
    const [contract] = await this.db
      .select({
        id: insuranceContract.id,
        type: insuranceContract.type,
        player_id: insuranceContract.player_id,
      })
      .from(insuranceContract)
      .where(
        and(
          eq(insuranceContract.player_id, event.playerId),
          eq(insuranceContract.type, 'COURIER_ARREST'),
          eq(insuranceContract.status, 'ACTIVE'),
        ),
      )
      .limit(1);

    // ── Step 2: No-op if no ACTIVE COURIER_ARREST contract ───────────────────────────────────────
    if (!contract) {
      return;
    }

    // ── Step 3: Guard double-claim — already filed for this courierShiftId? ──────────────────────
    //
    // Prevents filing a second claim if the event fires twice for the same shift
    // (defensive — the producer sets status='caught' before emitting, so duplicate fires
    // should not occur organically, but the guard prevents any edge-case double-payout).
    const existingClaims = await this.db
      .select({ id: insuranceClaim.id })
      .from(insuranceClaim)
      .where(eq(insuranceClaim.loss_event_ref, event.courierShiftId))
      .limit(1);

    if (existingClaims.length > 0) {
      this.logger.warn(
        `ClaimsService: COURIER_ARREST double-claim guard fired — already filed for shift=${event.courierShiftId}. Skipping.`,
      );
      return;
    }

    this.logger.log(
      `ClaimsService: CourierInterceptedEvent received — ` +
        `player=${event.playerId} shift=${event.courierShiftId} cargoCents=${event.cargoCents} ` +
        `contract=${contract.id} — filing COURIER_BETRAYAL claim.`,
    );

    // ── Step 4: fileClaim (status=FILED) ─────────────────────────────────────────────────────────
    // Pass event.gameMinute as the authoritative filed_tick.
    const { claimId } = await this.fileClaim(
      event.playerId,
      contract.id,
      'COURIER_BETRAYAL',
      event.courierShiftId,
      event.gameMinute,
    );

    // ── DD-FRAUD-AUTOCLAIM (design §1.4, 2026-06-17 correction) ──────────────────────────────────
    //
    // NO fraud-check on this auto-claim handler. CourierInterceptedEvent auto-claims are truthful
    // BY CONSTRUCTION: claim_basis='COURIER_BETRAYAL' is assigned from the real intercept event.
    // Canon :19 anchors fraud on a PLAYER staging action, not a system-emitted claim.
    // Fraud machinery is exercised by BO force-fraud-detection + future player-submitted-claim (TD-126).
    // [RATIFIED C13 — DD-FRAUD-AUTOCLAIM]

    // ── Step 5 (was 6): computePayout → payout = lawyer_fee + round(fraction × cargoCents) ────────
    //
    // computePayout loads the claim → contract type → courier_shift → applies formula.
    // The event.cargoCents is stored in the shift row (verified by computePayout from DB — no raw value
    // trusted from the event; computePayout re-derives from DB for audit integrity).
    const { payoutCents } = await this.computePayout(event.playerId, claimId);

    // ── Step 7: Credit payout to economy_states.cash_cents ────────────────────────────────────────
    if (payoutCents > 0) {
      const creditResult = await this.db
        .update(economyState)
        .set({ cash_cents: sql`${economyState.cash_cents} + ${BigInt(payoutCents)}` })
        .where(eq(economyState.player_id, event.playerId))
        .returning({ cash_cents: economyState.cash_cents });

      if (creditResult.length === 0) {
        this.logger.warn(
          `ClaimsService: COURIER_ARREST — no economy_states row for player=${event.playerId} — payout credit skipped (defensive).`,
        );
      } else {
        this.logger.log(
          `ClaimsService: COURIER_ARREST payout credited — player=${event.playerId} payout_cents=${payoutCents} ` +
            `new_cash=${Number(creditResult[0]!.cash_cents)}.`,
        );
      }
    }

    // ── Step 8: Mark claim PAID ───────────────────────────────────────────────────────────────────
    await this.db
      .update(insuranceClaim)
      .set({ status: 'PAID', updated_at: new Date() })
      .where(eq(insuranceClaim.id, claimId));

    this.logger.log(
      `ClaimsService: COURIER_ARREST claim PAID — claimId=${claimId} contract=${contract.id} payout=${payoutCents}.`,
    );
  }

  /**
   * Handle a FenceDefaultedEvent — the C9 additive subscriber for FENCE_DEFAULT.
   *
   * Steps:
   *   1. Look up ACTIVE FENCE_DEFAULT contract for playerId.
   *   2. If none → return (no-op, zero-regression §0.2).
   *   3. Throttle (GAME-TIME): check insurance_claim WHERE contract_id=contractId
   *      AND loss_event_ref=launderingNodeId AND status IN ('FILED','PAID')
   *      AND filed_tick > currentGameMinute - cooldownGameMinutes.
   *      If exists → return (throttled — prevents double-payout on consecutive nightly cycles).
   *      Rule: one PAID claim per (contract, node) per cooldown window of N game-hours.
   *      Default N = fenceClaimCooldownHours (24 game-hours = 1 nightly cycle) deduplicates
   *      consecutive nightly ticks within the same exposure episode. A genuinely separated
   *      later loss (gap > N game-hours) can claim again. [PROPOSED DEFAULT][PROV-Y26Q2] — flag
   *      for reviewer⊥/C13 calibration.
   *   4. fileClaim(playerId, contractId, 'FENCE_FLIGHT', event.launderingNodeId).
   *   5. computePayout → payout = round(fenceThroughputLossCompensationFraction × throughputInPerHour × NIGHTLY_CYCLE_HOURS).
   *   6. Credit payout to economy_states.cash_cents.
   *   7. Mark claim PAID.
   */
  private async handleFenceDefaulted(event: FenceDefaultedEvent): Promise<void> {
    // ── Step 1: Look up ACTIVE FENCE_DEFAULT contract for this player ─────────────────────────────
    const [contract] = await this.db
      .select({
        id: insuranceContract.id,
        type: insuranceContract.type,
        player_id: insuranceContract.player_id,
      })
      .from(insuranceContract)
      .where(
        and(
          eq(insuranceContract.player_id, event.playerId),
          eq(insuranceContract.type, 'FENCE_DEFAULT'),
          eq(insuranceContract.status, 'ACTIVE'),
        ),
      )
      .limit(1);

    // ── Step 2: No-op if no ACTIVE FENCE_DEFAULT contract ────────────────────────────────────────
    if (!contract) {
      return;
    }

    // ── Step 3: Throttle (GAME-TIME) — prevent re-paying within cooldownGameMinutes ───────────────
    //
    // FENCE_DEFAULT fires every nightly cycle for the same node when buffer_load > threshold.
    // Without this guard, consecutive nightly ticks would create a new PAID claim each cycle.
    //
    // Throttle rule: one PAID claim per (contract, node) per cooldown window of N game-hours.
    // Predicate: filed_tick >= cutoffGameMinute (inclusive boundary → gap of exactly N game-hours
    // is still within the window). A genuinely separated later loss (gap > N game-hours,
    // i.e. filed_tick < cutoffGameMinute) can claim again.
    // Default N = fenceClaimCooldownHours (24 game-hours = 1 nightly cycle) deduplicates
    // consecutive nightly ticks within the same ongoing exposure episode.
    //
    // GAME-TIME keying: compare filed_tick (game-minutes stored on the claim) against
    // the current event.gameMinute — NOT wall-clock. Wall-clock diverges from game-time by the
    // sim ratio (T.tick.real_seconds_per_game_minute=2 → 1 game-day = 48 wall-min), so a
    // wall-clock cutoff would over- or under-throttle depending on whether the sim is running
    // or paused. filed_tick is the authoritative game-time anchor.
    //
    // [PROPOSED DEFAULT][PROV-Y26Q2] — flagged for reviewer⊥/C13 calibration.
    const cooldownGameHours = insuranceTunables.fenceClaimCooldownHours; // GAME-hours
    const cooldownGameMinutes = cooldownGameHours * 60;                   // convert to game-minutes
    const currentGameMinute = event.gameMinute;
    const cutoffGameMinute = currentGameMinute - cooldownGameMinutes;

    const recentClaims = await this.db
      .select({ id: insuranceClaim.id })
      .from(insuranceClaim)
      .where(
        and(
          eq(insuranceClaim.contract_id, contract.id),
          eq(insuranceClaim.loss_event_ref, event.launderingNodeId),
          inArray(insuranceClaim.status, ['FILED', 'PAID']),
          gte(insuranceClaim.filed_tick, BigInt(cutoffGameMinute)),
        ),
      )
      .limit(1);

    if (recentClaims.length > 0) {
      this.logger.log(
        `ClaimsService: FENCE_DEFAULT throttle fired — recent claim within ${cooldownGameHours} game-hours ` +
          `(${cooldownGameMinutes} game-minutes) for node=${event.launderingNodeId} ` +
          `contract=${contract.id} currentGameMinute=${currentGameMinute}. Skipping.`,
      );
      return;
    }

    this.logger.log(
      `ClaimsService: FenceDefaultedEvent received — ` +
        `player=${event.playerId} node=${event.launderingNodeId} throughput=${event.throughputInPerHour} ` +
        `contract=${contract.id} — filing FENCE_FLIGHT claim.`,
    );

    // ── Step 4: fileClaim (status=FILED) ─────────────────────────────────────────────────────────
    // Pass event.gameMinute as the authoritative filed_tick — same game-minute the producer used
    // to compute the default (ensures filed_tick matches the game-time throttle predicate exactly).
    const { claimId } = await this.fileClaim(
      event.playerId,
      contract.id,
      'FENCE_FLIGHT',
      event.launderingNodeId,
      event.gameMinute,
    );

    // ── DD-FRAUD-AUTOCLAIM (design §1.4, 2026-06-17 correction) ──────────────────────────────────
    //
    // NO fraud-check on this auto-claim handler. FenceDefaultedEvent auto-claims are truthful
    // BY CONSTRUCTION: claim_basis='FENCE_FLIGHT' is assigned from the real fence-default event.
    // Canon :19 anchors fraud on a PLAYER staging action, not a system-emitted claim.
    // Fraud machinery is exercised by BO force-fraud-detection + future player-submitted-claim (TD-126).
    // [RATIFIED C13 — DD-FRAUD-AUTOCLAIM]

    // ── Step 5 (was 6): computePayout → round(fraction × throughput × NIGHTLY_CYCLE_HOURS) ────────
    //
    // computePayout loads the claim → contract type → laundering_node → applies formula.
    const { payoutCents } = await this.computePayout(event.playerId, claimId);

    // ── Step 7: Credit payout to economy_states.cash_cents ────────────────────────────────────────
    if (payoutCents > 0) {
      const creditResult = await this.db
        .update(economyState)
        .set({ cash_cents: sql`${economyState.cash_cents} + ${BigInt(payoutCents)}` })
        .where(eq(economyState.player_id, event.playerId))
        .returning({ cash_cents: economyState.cash_cents });

      if (creditResult.length === 0) {
        this.logger.warn(
          `ClaimsService: FENCE_DEFAULT — no economy_states row for player=${event.playerId} — payout credit skipped (defensive).`,
        );
      } else {
        this.logger.log(
          `ClaimsService: FENCE_DEFAULT payout credited — player=${event.playerId} payout_cents=${payoutCents} ` +
            `new_cash=${Number(creditResult[0]!.cash_cents)}.`,
        );
      }
    }

    // ── Step 8: Mark claim PAID ───────────────────────────────────────────────────────────────────
    await this.db
      .update(insuranceClaim)
      .set({ status: 'PAID', updated_at: new Date() })
      .where(eq(insuranceClaim.id, claimId));

    this.logger.log(
      `ClaimsService: FENCE_DEFAULT claim PAID — claimId=${claimId} contract=${contract.id} payout=${payoutCents}.`,
    );
  }

  /**
   * `fileClaim(playerId, contractId, claimBasis, lossEventRef, gameMinuteOverride?)` — insert a FILED insurance_claim.
   *
   * Shared signature (plan "Shared signatures"): creates a FILED claim row referencing the contract
   * and the loss event. Returns { claimId, filedTick } for downstream computePayout / FraudDetectionService (C10).
   *
   * @param playerId — the player's UUID.
   * @param contractId — the ACTIVE insurance_contract UUID.
   * @param claimBasis — the §1.4 reason (HEAT_RAID / DEALER_TURNOVER / COURIER_BETRAYAL / STORAGE_OVERFLOW / FENCE_FLIGHT).
   * @param lossEventRef — the UUID of the triggering event row (building_raid.raid_id, courier_shift.id, etc.).
   * @param gameMinuteOverride — (optional) explicit game-minute from the triggering event. When provided,
   *   used directly for filed_tick (authoritative source). Falls back to citySimClock row for the player,
   *   then 0 if no clock row exists (defensive default for manually filed claims).
   * @returns { claimId: string, filedTick: number } — the new insurance_claim UUID and filed game-minute.
   */
  async fileClaim(
    playerId: string,
    contractId: string,
    claimBasis: 'DEALER_TURNOVER' | 'HEAT_RAID' | 'COURIER_BETRAYAL' | 'STORAGE_OVERFLOW' | 'FENCE_FLIGHT',
    lossEventRef: string,
    gameMinuteOverride?: number,
  ): Promise<{ claimId: string; filedTick: number }> {
    // Resolve filed_tick: use event-supplied gameMinute when available (authoritative game-time anchor).
    // Fallback: read citySimClock for the player (covers non-event-driven manual filings).
    // Default 0 if no clock row exists (defensive — should not occur in production).
    let filedTick: number;
    if (gameMinuteOverride !== undefined) {
      filedTick = gameMinuteOverride;
    } else {
      const [clockRow] = await this.db
        .select({ game_minute: citySimClock.game_minute })
        .from(citySimClock)
        .where(eq(citySimClock.player_id, playerId))
        .limit(1);
      filedTick = clockRow?.game_minute ?? 0;
    }

    const [claimRow] = await this.db
      .insert(insuranceClaim)
      .values({
        player_id: playerId,
        contract_id: contractId,
        claim_basis: claimBasis,
        loss_event_ref: lossEventRef,
        claimed_cents: BigInt(0), // the actual claimed amount is derived by computePayout
        payout_cents: BigInt(0),  // default 0; set by computePayout
        status: 'FILED',
        filed_tick: BigInt(filedTick),
      })
      .returning({ id: insuranceClaim.id });

    const claimId = claimRow!.id;
    this.logger.log(
      `ClaimsService.fileClaim: player=${playerId} contract=${contractId} ` +
        `basis=${claimBasis} lossEventRef=${lossEventRef} claimId=${claimId}`,
    );
    return { claimId, filedTick };
  }

  /**
   * `computePayout(claimId)` — re-derive loss from DB and compute payout for a filed claim.
   *
   * Shared signature (plan "Shared signatures"):
   *   Loads: insurance_claim → insurance_contract → building_raid → building_operational_state.
   *   Loss derivation per type:
   *     STASH_LOSS + money_holding building → loss = building_raid.seized_cents (cash vault leg)
   *     STASH_LOSS + product building       → loss = grams_seized × sellingTunables.brindleDealValueCentsPerGram
   *     PROPERTY                            → loss = insurance_contract.insured_value_cents
   *   Per-type covered fraction (§1.3 / design §7):
   *     PROPERTY   → property_coverage_fraction × loss
   *     STASH_LOSS → stash_coverage_fraction × loss
   *   Banker's-round (Math.round) to integer cents (C4 determinism).
   *
   * Updates the claim's payout_cents (claimed_cents = derived loss).
   * Returns { payoutCents: number }.
   *
   * W6a C4 (P-A, finding #11) — `playerId` is now the FIRST argument, and the claim read is joint
   * (`id = ? AND player_id = ?`, single round-trip): a claim belonging to a DIFFERENT player yields
   * 0 rows ⇒ this returns `{ payoutCents: 0 }` (the SAME defensive branch pre-existing "claim not
   * found" already used — see docblock note below). Pre-fix, `computePayout(claimId)` took no
   * `playerId` at all; every one of the 3 organic auto-claim callers below happens to always pass a
   * `claimId` it just minted for the SAME `playerId` (so this was never exploitable through them),
   * but the "shared signature" file header explicitly documents this as a method OTHER callers are
   * meant to invoke — the guard belongs at the signature, not at caller discipline (design §1 P-A).
   * The contract read is ALSO re-scoped (belt-and-suspenders, mirrors C3's `issueTier3Payoff`
   * pattern) — `claimRow` is already proven `playerId`'s own, but the contract read re-states the
   * predicate rather than trusting `claimRow.contract_id` alone a second time.
   *
   * Note on "not found" vs "not owned": this method predates W6a with a "log + return zero" idiom
   * for a missing claim/contract (never a throw) — see the 3 sibling branches below (courier_shift,
   * laundering_node, building_raid not found). Extending the SAME idiom to "not owned" keeps the two
   * cases byte-identical (D2's requirement) without introducing a new throw path that legitimate
   * callers of a genuinely-absent claim don't already handle.
   *
   * @param playerId — the caller's player uuid. Must be the ACTUAL owner of `claimId` (W6a C4).
   * @param claimId  — the insurance_claim UUID (inserted by fileClaim).
   * @returns { payoutCents: number } — the banker's-rounded payout in cents.
   */
  async computePayout(
    playerId: string,
    claimId: string,
  ): Promise<{ payoutCents: number }> {
    // 1. Load insurance_claim row — scoped to `playerId` (W6a C4).
    const [claimRow] = await this.db
      .select({
        contract_id: insuranceClaim.contract_id,
        loss_event_ref: insuranceClaim.loss_event_ref,
      })
      .from(insuranceClaim)
      .where(and(eq(insuranceClaim.id, claimId), eq(insuranceClaim.player_id, playerId)))
      .limit(1);

    if (!claimRow) {
      this.logger.warn(`ClaimsService.computePayout: claim not found: ${claimId}`);
      return { payoutCents: 0 };
    }

    // 2. Load insurance_contract row — re-scoped to `playerId` (belt-and-suspenders, W6a C4).
    const [contractRow] = await this.db
      .select({
        type: insuranceContract.type,
        insured_value_cents: insuranceContract.insured_value_cents,
      })
      .from(insuranceContract)
      .where(and(eq(insuranceContract.id, claimRow.contract_id), eq(insuranceContract.player_id, playerId)))
      .limit(1);

    if (!contractRow) {
      this.logger.warn(`ClaimsService.computePayout: contract not found: ${claimRow.contract_id}`);
      return { payoutCents: 0 };
    }

    const coverageType = contractRow.type as 'PROPERTY' | 'STASH_LOSS' | 'COURIER_ARREST' | 'FENCE_DEFAULT';

    // ── COURIER_ARREST: load courier_shift → cargoCents → lawyer_fee + round(fraction × cargo) ────
    if (coverageType === 'COURIER_ARREST') {
      const [shiftRow] = await this.db
        .select({ cargo_cents: courierShift.cargo_cents })
        .from(courierShift)
        .where(eq(courierShift.shift_id, claimRow.loss_event_ref!))
        .limit(1);

      if (!shiftRow) {
        this.logger.warn(`ClaimsService.computePayout: courier_shift not found: ${claimRow.loss_event_ref}`);
        return { payoutCents: 0 };
      }

      const cargoCents = shiftRow.cargo_cents; // number (mode: 'number')
      const lawyerFee = insuranceTunables.courierLawyerFeePayoutCents;
      const recoveryFraction = insuranceTunables.courierCargoRecoveryFraction;
      const payoutCents = lawyerFee + Math.round(recoveryFraction * cargoCents);

      await this.db
        .update(insuranceClaim)
        .set({
          claimed_cents: BigInt(cargoCents),
          payout_cents: BigInt(payoutCents),
          updated_at: new Date(),
        })
        .where(eq(insuranceClaim.id, claimId));

      this.logger.log(
        `ClaimsService.computePayout: claimId=${claimId} type=COURIER_ARREST ` +
          `cargoCents=${cargoCents} lawyerFee=${lawyerFee} recoveryFraction=${recoveryFraction} payout=${payoutCents}`,
      );
      return { payoutCents };
    }

    // ── FENCE_DEFAULT: load laundering_node → throughput → round(fraction × throughput × NIGHTLY_CYCLE_HOURS) ──
    if (coverageType === 'FENCE_DEFAULT') {
      const [nodeRow] = await this.db
        .select({ throughput_in_per_hour: launderingNode.throughput_in_per_hour })
        .from(launderingNode)
        .where(eq(launderingNode.node_id, claimRow.loss_event_ref!))
        .limit(1);

      if (!nodeRow) {
        this.logger.warn(`ClaimsService.computePayout: laundering_node not found: ${claimRow.loss_event_ref}`);
        return { payoutCents: 0 };
      }

      const throughputInPerHour = nodeRow.throughput_in_per_hour; // number (real)
      const compensationFraction = insuranceTunables.fenceThroughputLossCompensationFraction;
      const lossValueCents = throughputInPerHour * NIGHTLY_CYCLE_HOURS;
      const payoutCents = Math.round(compensationFraction * lossValueCents);

      await this.db
        .update(insuranceClaim)
        .set({
          claimed_cents: BigInt(Math.round(lossValueCents)),
          payout_cents: BigInt(payoutCents),
          updated_at: new Date(),
        })
        .where(eq(insuranceClaim.id, claimId));

      this.logger.log(
        `ClaimsService.computePayout: claimId=${claimId} type=FENCE_DEFAULT ` +
          `throughput=${throughputInPerHour} NIGHTLY_CYCLE_HOURS=${NIGHTLY_CYCLE_HOURS} ` +
          `compensationFraction=${compensationFraction} payout=${payoutCents}`,
      );
      return { payoutCents };
    }

    // ── PROPERTY / STASH_LOSS: existing C6 path ───────────────────────────────────────────────────

    // ── PROPERTY: loss = declared insured_value_cents (no building_raid JOIN needed) ────────────────
    //
    // PROPERTY payout does NOT depend on the raid's grams_seized or seized_cents; it is purely
    // based on the declared insured value at issuance (§1.3 / design §7). Loading building_raid
    // is therefore not required — skipping it avoids a spurious 0-payout when the claim is filed
    // via the C10 test route with a synthetic loss_event_ref that has no real raid row.
    if (coverageType === 'PROPERTY') {
      const lossValueCents = Number(contractRow.insured_value_cents);
      const fraction = insuranceTunables.propertyCoverageFraction;
      const payoutCents = Math.round(fraction * lossValueCents);

      await this.db
        .update(insuranceClaim)
        .set({
          claimed_cents: BigInt(lossValueCents),
          payout_cents: BigInt(payoutCents),
          updated_at: new Date(),
        })
        .where(eq(insuranceClaim.id, claimId));

      this.logger.log(
        `ClaimsService.computePayout: claimId=${claimId} type=PROPERTY ` +
          `insuredValue=${lossValueCents} fraction=${fraction} payout=${payoutCents}`,
      );
      return { payoutCents };
    }

    // 3. Load building_raid row by loss_event_ref (= raid_id FK) — STASH_LOSS only.
    const [raidRow] = await this.db
      .select({
        grams_seized: buildingRaid.grams_seized,
        seized_cents: buildingRaid.seized_cents,
        building_id: buildingRaid.building_id,
      })
      .from(buildingRaid)
      .where(eq(buildingRaid.raid_id, claimRow.loss_event_ref!))
      .limit(1);

    if (!raidRow) {
      this.logger.warn(`ClaimsService.computePayout: building_raid not found: ${claimRow.loss_event_ref}`);
      return { payoutCents: 0 };
    }

    // 4. Load building_operational_state → operational_type.
    const [bosRow] = await this.db
      .select({ operational_type: buildingOperationalState.operational_type })
      .from(buildingOperationalState)
      .where(eq(buildingOperationalState.building_id, raidRow.building_id))
      .limit(1);

    const operationalType = bosRow?.operational_type ?? 'stash';

    // 5. Derive loss amount based on coverage type + building operational type.
    let lossValueCents: number;
    {
      // STASH_LOSS: cash-vault building → seized_cents; product building → grams × rate.
      if (operationalType === 'money_holding') {
        lossValueCents = Number(raidRow.seized_cents);
      } else {
        lossValueCents = raidRow.grams_seized * sellingTunables.brindleDealValueCentsPerGram;
      }
    }

    // 6. Coverage fraction from registry (STASH_LOSS only at this point — PROPERTY exits early above).
    const fraction = insuranceTunables.stashCoverageFraction;

    // 7. Banker's-round to integer cents (Math.round is "round-half-away-from-zero" in JS, which is
    // the same as banker's-round for positive values — the C4/C3 precedent uses Math.round).
    const payoutCents = Math.round(fraction * lossValueCents);

    // 8. Update the claim's payout_cents + claimed_cents (declared loss = derived loss value).
    await this.db
      .update(insuranceClaim)
      .set({
        claimed_cents: BigInt(lossValueCents),
        payout_cents: BigInt(payoutCents),
        updated_at: new Date(),
      })
      .where(eq(insuranceClaim.id, claimId));

    this.logger.log(
      `ClaimsService.computePayout: claimId=${claimId} type=${coverageType} ` +
        `operationalType=${operationalType} lossValue=${lossValueCents} fraction=${fraction} payout=${payoutCents}`,
    );
    return { payoutCents };
  }
}
