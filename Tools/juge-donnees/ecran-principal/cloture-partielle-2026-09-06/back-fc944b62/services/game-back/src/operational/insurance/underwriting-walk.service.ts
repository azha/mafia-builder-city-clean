// IMPLEMENTS: docs/tech/04c_market_reputation_insurance/insurance_mechanics.md §4.1 (DD-WALK :46-56)
//             docs/superpowers/plans/2026-06-17-depth-insurance-underwriting-walk-plan.md Task 2 (C2)
//             — Insurance C2 — 2026-06-17
//
// `UnderwritingWalkService` — the multi-day coverage-scoped underwriting walk (DD-WALK).
//
// DD-WALK (LOCKED — design §1.1/§4):
//   Each in-game day (NIGHTLY cadence), `recordFindings(ctx)`:
//   1. Selects all `underwriter_walk_record` rows with `status = 'WALKING'` for `ctx.playerId`.
//   2. For each walk: determines the walk's `coverage_type` and snapshots the COVERAGE'S substrate domain
//      (read-only queries against the existing substrate tables — NEVER the full 6-leg traversal).
//   3. Derives the day's `FindingType` bits by comparing the substrate snapshot against the per-finding
//      thresholds (all from `insuranceTunables` — no inline scalar).
//   4. ORs the day's bits into `findings_bitmask` (monotone: bits are NEVER cleared, per DD-WALK invariant).
//   5. Guards idempotence per game-day: if the walk's current `observation_depth` already reflects this
//      `ctx.gameMinute`'s day, the tick is a no-op for that walk (prevents double-OR drift).
//
// `startWalk(playerId, contractId, coverageType)`:
//   Creates a fresh `underwriter_walk_record` row (status=WALKING, findings_bitmask=0, start_tick=ctx.gameMinute).
//   Returns `{ walkId }`.
//
// `computePremium(walkId)` is defined in C3 (day==duration guard + deterministic integer cents).
// This file is extended by C3 — do not add `computePremium` here in C2.
//
// R2.2: `findings_bitmask` is server-side only. It is NEVER returned to the client by this service.
//   The `_test` route reads it for E2E DB assertion (BO-only — not a client path).
// Anti-fabrication (C4): no non-deterministic RNG. All thresholds come from `insuranceTunables` (registry).
//   Coverage-scoped substrate reads use ONLY the real tables (no synthetic state).
// Zero-regression: this service is PURELY ADDITIVE. It reads existing substrate tables read-only.
//   It does NOT modify `building_raid`, `courier_shift`, `laundering_nodes`, or any other existing table.

import { Injectable, Logger, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { underwriterWalkRecord, insuranceContract } from '../../db/schema/insurance';
import { productStorage } from '../../db/schema/operational_chain';
import { building } from '../../db/schema/city_state';
import { courierShift } from '../../db/schema/operational_chain';
import { launderingNode } from '../../db/schema/pipeline_and_laundering';
import { lieutenant } from '../../db/schema/lieutenant';
import type { CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import type { CoverageType } from './findings';
import { FindingType, FINDING_BIT, COVERAGE_DOMAIN_FINDINGS } from './findings';
import { insuranceTunables } from './insurance-tunables';

// ── Constants (structural — not calibrated tunable values) ───────────────────────────────────────

/**
 * In-game minutes per in-game day (canon: `T.clock.in_game_day_length_minutes`, default 1440).
 * Used to derive the game-day index from `ctx.gameMinute` (NIGHTLY cadence always fires at
 * `gameMinute % TICKS_PER_DAY === 0`, so `Math.floor(gameMinute / TICKS_PER_DAY)` = the day number).
 * R2.3: read from citysim-tunables in production; hardcoded 1440 here mirrors the canonical default
 * and avoids a circular import between InsuranceModule and CitySimModule (the value is structural,
 * not a business tunable in the insurance domain).
 */
const TICKS_PER_DAY = 1440;

// ── Substrate snapshot thresholds ────────────────────────────────────────────────────────────────
//
// Each threshold is a structural read-only comparison on the substrate domain.
// They are expressed as fractions / absolute values that trigger the corresponding FindingType bit.
//
// Design §7 [PROPOSED DEFAULT][PROV-Y26Q2]: these thresholds are proposed defaults that
// flag the relevant cue. Canon §4.1 names the cue category (:49) but gives no numeric threshold.
// They are registry-governed via insuranceTunables where a tunable exists; otherwise they are
// structural structural invariants (e.g., "any in_transit courier" = SLATE_MEMBERSHIP_STABLE).
//
// N.B.: heat threshold and stash-deep threshold reuse the fence_default_exposure_threshold
// as a structural cross-domain comparator (both [0..1] scale).  The coverage fractions
// (property_coverage_fraction, stash_coverage_fraction) are for payouts — NOT for these thresholds.

/**
 * Heat threshold above which HEAT_SMOKE_OBSERVED fires.
 * Reuses `fence_default_exposure_threshold` (0.80 [0..1] scale) as the building heat proxy.
 * building.heat is a real [0..∞) but is practically bounded [0..1] by the heat propagation system.
 * [PROPOSED DEFAULT][PROV-Y26Q2] — canon :49 names "heat smoke" cue without a numeric threshold.
 */
function heatThreshold(): number {
  return insuranceTunables.fenceDefaultExposureThreshold;
}

/**
 * Stash-deep threshold: product_storage.quantity_grams above this value fires STASH_QUEUE_DEEP.
 * The design §1.1 names "stash queue depth" as the STASH_LOSS domain cue.
 * Threshold: any positive stash quantity signals depth (the observation is "stash is being used").
 * Structural: quantity_grams > 0 is the minimal "queue present" signal (no arbitrary scalar).
 * [PROPOSED DEFAULT][PROV-Y26Q2] — canon :49 names the cue without a threshold.
 */
const STASH_QUEUE_DEEP_THRESHOLD = 0; // quantity_grams > 0 → stash is occupied (deep queue observed)

/**
 * Laundering exposure threshold: laundering_nodes.buffer_load above this fires HOSTAGE_SHELF_STATE.
 * Reuses `fence_default_exposure_threshold` (0.80) — the same threshold that triggers fence-default (C8).
 * [PROPOSED DEFAULT][PROV-Y26Q2].
 */
function launderingExposureThreshold(): number {
  return insuranceTunables.fenceDefaultExposureThreshold;
}

// ── UnderwritingWalkService ───────────────────────────────────────────────────────────────────────

@Injectable()
export class UnderwritingWalkService {
  private readonly logger = new Logger(UnderwritingWalkService.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
  ) {}

  // ── Public API ───────────────────────────────────────────────────────────────────────────────────

  /**
   * `startWalk(playerId, contractId, coverageType)` — creates a fresh underwriter walk record.
   *
   * Canon :141: `UnderwritingWalkService.startWalk(contractId, coverageType)` — initiates the walk.
   * Creates one `underwriter_walk_record` row:
   *   - status = WALKING
   *   - findings_bitmask = 0 (no findings yet)
   *   - start_tick = the current game-minute tick (passed as `startTick`)
   *   - observation_depth = 0 (incremented each day by `recordFindings`)
   *   - contract_id = soft ref (nullable — the walk is created BEFORE the contract; C4 sets this)
   *   - coverage_type = the coverage kind being walked
   *
   * @param playerId — the player's UUID (FK → player).
   * @param contractId — optional soft-ref UUID of the insurance contract (set by C4 at issuance).
   * @param coverageType — which of the 4 coverage kinds this walk covers.
   * @param startTick — the current game-minute tick (from ctx.gameMinute or 0 for test routes).
   * @returns `{ walkId }` — the UUID of the new walk record.
   */
  async startWalk(
    playerId: string,
    contractId: string | null,
    coverageType: CoverageType,
    startTick = 0,
  ): Promise<{ walkId: string }> {
    const [row] = await this.db
      .insert(underwriterWalkRecord)
      .values({
        player_id: playerId,
        contract_id: contractId ?? undefined,
        coverage_type: coverageType,
        findings_bitmask: BigInt(0),
        start_tick: BigInt(startTick),
        observation_depth: 0,
        status: 'WALKING',
      })
      .returning({ id: underwriterWalkRecord.id });

    const walkId = row!.id;
    this.logger.log(
      `startWalk: created walk ${walkId} for player ${playerId} coverage=${coverageType} start_tick=${startTick}`,
    );
    return { walkId };
  }

  /**
   * `recordFindings(ctx)` — the NIGHTLY tick: for each WALKING walk, snapshot the coverage's
   * substrate domain, derive the day's FindingType bits, and monotone-OR into `findings_bitmask`.
   *
   * DD-WALK invariants honored:
   * (1) Monotone: `findings_bitmask |= dayBits` (NEVER overwrites — bits are never cleared).
   * (2) Coverage-scoped: reads ONLY the coverage's domain (not 6 arbitrary legs). Resolves the
   *     canon 3-day/6-legs incoherence (:48).
   * (3) Idempotent per game-day: the `observation_depth` column tracks how many days have been
   *     recorded. The tick computes the current day index and skips the walk if already recorded.
   *     Day index = Math.floor(ctx.gameMinute / TICKS_PER_DAY).
   * (4) Zero-regression: this is a READ-ONLY pass on the substrate tables. No existing table is
   *     modified (only `underwriter_walk_record.findings_bitmask` + `observation_depth` are updated).
   *
   * R2.2: `findings_bitmask` stays server-side. This method never returns it — the E2E reads
   * it via the `_test` route (BO assertion only).
   * Anti-fabrication (C4): no non-deterministic RNG. All thresholds from `insuranceTunables`.
   */
  async recordFindings(ctx: CitySimTickContext): Promise<void> {
    const { playerId, gameMinute } = ctx;

    // Derive the current game-day index (0-based from tick 0).
    // NIGHTLY fires at gameMinute = N × TICKS_PER_DAY, so dayIndex = gameMinute / TICKS_PER_DAY.
    const dayIndex = Math.floor(gameMinute / TICKS_PER_DAY);

    // Select all WALKING walks for this player.
    // start_tick (W6.2 C3): needed to compute daysElapsed the SAME way computePremium's own guard does
    // (observation_depth - floor(start_tick/TICKS_PER_DAY)) — see the transition wiring below.
    const walkingWalks = await this.db
      .select({
        id: underwriterWalkRecord.id,
        coverage_type: underwriterWalkRecord.coverage_type,
        findings_bitmask: underwriterWalkRecord.findings_bitmask,
        observation_depth: underwriterWalkRecord.observation_depth,
        start_tick: underwriterWalkRecord.start_tick,
      })
      .from(underwriterWalkRecord)
      .where(
        and(
          eq(underwriterWalkRecord.player_id, playerId),
          eq(underwriterWalkRecord.status, 'WALKING'),
        ),
      );

    if (walkingWalks.length === 0) {
      return; // no WALKING walks for this player — no-op (zero-regression)
    }

    // Snapshot the substrate domain ONCE per player per tick (shared across walks for the same player).
    // Each coverage type reads its own domain subset — a walk only applies the relevant bits.
    const snapshot = await this.snapshotSubstrate(playerId);

    for (const walk of walkingWalks) {
      // Idempotence guard: `observation_depth` tracks progress as (last_recorded_day_index + 1).
      // After recording dayIndex D, observation_depth is set to D + 1.
      // Guard: if dayIndex < observation_depth → this day has already been recorded → skip.
      // Example: after recording dayIndex=1, observation_depth=2. A second call with dayIndex=1:
      //   1 < 2 → skip (idempotent). Next day (dayIndex=2): 2 < 2 → false → proceed.
      if (dayIndex < walk.observation_depth) {
        this.logger.debug(
          `recordFindings: walk ${walk.id} already recorded day ${dayIndex} (depth=${walk.observation_depth}) — idempotent skip`,
        );
        continue;
      }

      // Compute the day's FindingType bits from the substrate snapshot,
      // filtered to the walk's coverage domain (DD-WALK: coverage-scoped, not 6-leg traversal).
      const relevantFindings = COVERAGE_DOMAIN_FINDINGS[walk.coverage_type as CoverageType];
      let dayBits = 0n;

      for (const findingType of relevantFindings) {
        if (this.findingFires(findingType, snapshot)) {
          dayBits |= FINDING_BIT[findingType]!;
        }
      }

      // Monotone OR: `findings_bitmask |= dayBits` (bits are NEVER cleared — DD-WALK invariant).
      const newBitmask = (walk.findings_bitmask ?? 0n) | dayBits;

      // Advance observation_depth to dayIndex + 1 (records that dayIndex has been observed).
      // This ensures that a second call with the same dayIndex sees dayIndex < dayIndex+1 → skip.
      const newDepth = dayIndex + 1;
      await this.db
        .update(underwriterWalkRecord)
        .set({
          findings_bitmask: newBitmask,
          observation_depth: newDepth,
          updated_at: new Date(),
        })
        .where(eq(underwriterWalkRecord.id, walk.id));

      this.logger.debug(
        `recordFindings: walk ${walk.id} day=${dayIndex} coverage=${walk.coverage_type} ` +
          `dayBits=0x${dayBits.toString(16)} bitmask=${newBitmask} depth=${newDepth}`,
      );

      // W6.2 C3 — the WALKING → COMPLETE transition (design §3 C3, forme B): `computePremium` is the
      // SOLE production écrivain of this transition and had ZERO production appelant before this chunk
      // (only `_test` seeding ever called it). Rebranch it onto THIS SAME tick — the one that already
      // counts the days (DD-WALK) — rather than adding a new écrivain or a new tick. The guard mirrors
      // computePremium's OWN day-elapsed formula EXACTLY (daysElapsed = observation_depth −
      // floor(start_tick/TICKS_PER_DAY)) so a walk transitions on the SAME day this tick would already
      // report it complete, never a day early/late. computePremium is itself idempotent (an already-
      // COMPLETE walk returns its stored premium without re-transitioning), so calling it here is safe
      // even if a future caller also reaches it.
      const startDayIndex = Math.floor(Number(walk.start_tick) / TICKS_PER_DAY);
      const daysElapsed = newDepth - startDayIndex;
      const duration = insuranceTunables.walkDurationDays;
      if (daysElapsed >= duration) {
        await this.computePremium(walk.id);
        this.logger.debug(
          `recordFindings: walk ${walk.id} reached daysElapsed=${daysElapsed} >= duration=${duration} — computePremium fired (WALKING → COMPLETE).`,
        );
      }
    }
  }

  /**
   * `computePremium(walkId)` — compute the final premium for a completed underwriting walk.
   *
   * Canon :50-54: premium formula = `base × Π_i (1 + c_i × finding_i)`.
   * - `base = (underwriting_base_premium_pct_of_insured_value_per_cycle / 100) × insured_value_cents`
   * - `finding_i = 1` if FindingType bit i is set in `findings_bitmask`, `0` otherwise.
   * - `c_i` per FindingType — from `insuranceTunables.getCiForFinding(i)` (registry-first, no inline).
   * - Result rounded to integer cents: `Math.round(product)` (deterministic, no float drift).
   *
   * Day-elapsed guard (carry-forward from C2 reviewer⊥):
   *   `observation_depth` is an absolute game-day index + 1 (set to `dayIndex + 1` by `recordFindings`).
   *   `start_tick` is the absolute tick at walk start.
   *   `daysElapsed = observation_depth - Math.floor(Number(start_tick) / TICKS_PER_DAY)`
   *
   *   A walk started on game-day 100 (start_tick=144000) with 3 days elapsed has:
   *     observation_depth = 103 (day 102 recorded → depth=103)
   *     daysElapsed = 103 - Math.floor(144000 / 1440) = 103 - 100 = 3 ✓
   *
   *   WARNING: `observation_depth == underwriting_walk_duration_days` would FAIL for walks starting
   *   after game-day 0 (e.g., depth=103, duration=3 → 103 ≠ 3). NEVER use the naive comparison.
   *   The relative formula above is the correct guard.
   *
   * State transition: WALKING → COMPLETE (idempotent — re-call on COMPLETE returns stored premium).
   * R2.2: `premiumCents` is a CLEAR transaction value (DD-P5). Safe to return to the client.
   * Anti-fabrication (C4): no non-deterministic RNG. All c_i from registry. No inline coefficient.
   *
   * @param walkId — the UUID of the underwriter_walk_record.
   * @returns `{ premiumCents }` — the final premium in integer cents.
   * @throws 404 if the walk does not exist.
   * @throws 409 if `daysElapsed < underwriting_walk_duration_days` (not yet complete).
   */
  async computePremium(walkId: string): Promise<{ premiumCents: number }> {
    // Load the walk record.
    const [walk] = await this.db
      .select({
        id: underwriterWalkRecord.id,
        status: underwriterWalkRecord.status,
        findings_bitmask: underwriterWalkRecord.findings_bitmask,
        observation_depth: underwriterWalkRecord.observation_depth,
        start_tick: underwriterWalkRecord.start_tick,
      })
      .from(underwriterWalkRecord)
      .where(eq(underwriterWalkRecord.id, walkId))
      .limit(1);

    if (!walk) {
      throw new HttpException(`Walk ${walkId} not found`, HttpStatus.NOT_FOUND);
    }

    // Idempotent: if already COMPLETE, return the stored premium from the contract.
    if (walk.status === 'COMPLETE') {
      const storedPremium = await this.getStoredPremium(walkId);
      this.logger.debug(`computePremium: walk ${walkId} already COMPLETE, returning stored premium ${storedPremium}`);
      return { premiumCents: storedPremium };
    }

    // ── Day-elapsed guard ────────────────────────────────────────────────────────────────────────
    //
    // C2 reviewer⊥ carry-forward: observation_depth is ABSOLUTE (dayIndex + 1 from tick 0).
    // daysElapsed = observation_depth - Math.floor(Number(start_tick) / TICKS_PER_DAY)
    //
    // This gives the number of game-days elapsed SINCE the walk started, regardless of what
    // game-day the walk began on. See JSDoc above for the derivation.
    const startDayIndex = Math.floor(Number(walk.start_tick) / TICKS_PER_DAY);
    const daysElapsed = walk.observation_depth - startDayIndex;
    const duration = insuranceTunables.walkDurationDays;

    if (daysElapsed < duration) {
      throw new HttpException(
        `Walk ${walkId} is not yet complete: ${daysElapsed} day(s) elapsed, ${duration} required (daysElapsed = observation_depth - floor(start_tick/${TICKS_PER_DAY}))`,
        HttpStatus.CONFLICT,
      );
    }

    // ── Premium formula ──────────────────────────────────────────────────────────────────────────
    //
    // Canon :50-54: base = (basePremiumPct / 100) × insured_value_cents
    //   premiumCents = Math.round(base × Π_i (1 + c_i × finding_i))
    //
    // finding_i = 1 if bit i is set in findings_bitmask (BigInt), 0 otherwise.
    // c_i from insuranceTunables.getCiForFinding(i) — all from registry (R2.3).
    //
    // insured_value_cents comes from the insurance_contract that references this walk.
    const insuredValueCents = await this.getInsuredValueCents(walkId);

    const basePremiumPct = insuranceTunables.basePremiumPctOfInsuredValue;
    const basePremium = (basePremiumPct / 100) * insuredValueCents;

    // Compute the product Π_i (1 + c_i × finding_i) over all 6 FindingType bits.
    // The findings bitmask is a BigInt — check each bit with BigInt arithmetic.
    const bitmask = walk.findings_bitmask ?? 0n;
    let product = 1.0;
    const NUM_FINDINGS = 6; // 6 FindingType values (bits 0-5)
    for (let i = 0; i < NUM_FINDINGS; i++) {
      const bitSet = (bitmask & (1n << BigInt(i))) !== 0n;
      if (bitSet) {
        const ci = insuranceTunables.getCiForFinding(i);
        product *= (1 + ci);
      }
    }

    // Deterministic rounding to integer cents (repo-wide Math.round cents precedent:
    // ash-appointment.service.ts:217, and many others). The plan's "banker's-round" means
    // "round to integer cents"; JavaScript Math.round is round-half-up, not true banker's round
    // (round-half-to-even). gdd/14 row updated at C13 to reflect Math.round, not banker's round.
    //
    // TODO (C13 reviewer⊥ carry-forward): this formula is byte-identical to contract.service.ts
    // issueContract (lines ~168-180). Extraction to a shared `computePremiumFromBitmask` helper
    // was considered at C13 but deferred: issueContract uses caller-supplied insuredValueCents
    // while this path reads it from the DB via getInsuredValueCents — two different input sources
    // make a shared helper churn-heavy for minimal gain. If a future refactor collapses this
    // difference, extract to `findings.ts` or a `premium.util.ts`.
    const premiumCents = Math.round(basePremium * product);

    // ── State transition WALKING → COMPLETE ─────────────────────────────────────────────────────
    //
    // Update the walk status to COMPLETE AND store the premium_cents on the contract.
    await this.db
      .update(underwriterWalkRecord)
      .set({ status: 'COMPLETE', updated_at: new Date() })
      .where(eq(underwriterWalkRecord.id, walkId));

    // Persist the premium_cents on the insurance_contract (if one exists for this walk).
    // At C3, a contract may not exist yet (C4 creates it at issuance). The setup-premium
    // test route creates a contract for testing. If no contract, we skip the contract update.
    await this.db
      .update(insuranceContract)
      .set({ premium_cents: BigInt(premiumCents), updated_at: new Date() })
      .where(eq(insuranceContract.walk_id, walkId));

    this.logger.log(
      `computePremium: walk ${walkId} COMPLETE — daysElapsed=${daysElapsed} bitmask=0x${bitmask.toString(16)} ` +
        `base=${basePremium.toFixed(2)} product=${product.toFixed(4)} premiumCents=${premiumCents}`,
    );

    return { premiumCents };
  }

  // ── Private helpers ──────────────────────────────────────────────────────────────────────────────

  /**
   * `getInsuredValueCents` — reads `insured_value_cents` from the insurance_contract for this walk.
   *
   * The `insured_value_cents` is stored on `insurance_contract.insured_value_cents`, not on the
   * walk record. The contract is looked up via `insurance_contract.walk_id = walkId`.
   *
   * If no contract exists for the walk (valid at C3 before C4 issuance), returns 0 as a safe
   * fallback (the premium will be 0). The C3 test route always creates a contract before calling
   * computePremium, so the 0 fallback only applies if computePremium is called without a contract.
   *
   * @param walkId — the UUID of the underwriter_walk_record.
   * @returns the insured value in cents, or 0 if no contract exists.
   */
  private async getInsuredValueCents(walkId: string): Promise<number> {
    // C5 carry-forward (ORDER BY fix): ORDER BY issued_tick DESC so the most recently issued
    // contract is returned. Without ORDER BY, LIMIT 1 on multiple rows is arbitrary.
    const [contractRow] = await this.db
      .select({ insured_value_cents: insuranceContract.insured_value_cents })
      .from(insuranceContract)
      .where(eq(insuranceContract.walk_id, walkId))
      .orderBy(desc(insuranceContract.issued_tick))
      .limit(1);

    if (!contractRow) {
      this.logger.warn(`computePremium: no contract found for walk ${walkId} — insured_value_cents defaults to 0`);
      return 0;
    }

    return Number(contractRow.insured_value_cents);
  }

  /**
   * `getStoredPremium` — reads the stored `premium_cents` from the contract for an already-COMPLETE walk.
   *
   * Idempotency path: if `computePremium` is called on a COMPLETE walk, we return the stored premium
   * rather than recomputing (deterministic — same formula → same result, but store avoids float drift).
   *
   * @param walkId — the UUID of the underwriter_walk_record (must be COMPLETE).
   * @returns the stored premium in cents.
   */
  private async getStoredPremium(walkId: string): Promise<number> {
    // C5 carry-forward (ORDER BY fix): ORDER BY issued_tick DESC → deterministic pick.
    // The one-walk-one-ACTIVE-contract guard (migration 0063) prevents duplicates going forward;
    // ORDER BY is the defense-in-depth for LAPSED/FRAUDED rows that may coexist with an ACTIVE one.
    const [contractRow] = await this.db
      .select({ premium_cents: insuranceContract.premium_cents })
      .from(insuranceContract)
      .where(eq(insuranceContract.walk_id, walkId))
      .orderBy(desc(insuranceContract.issued_tick))
      .limit(1);

    if (!contractRow) {
      // No contract exists — walk was completed without a contract (shouldn't happen in production,
      // but safe fallback for test routes that might complete a walk before creating a contract).
      this.logger.warn(`getStoredPremium: no contract for walk ${walkId} — returning 0`);
      return 0;
    }

    return Number(contractRow.premium_cents);
  }



  /**
   * Snapshot the substrate state for a player's coverage domains.
   *
   * Reads 4 substrate tables (read-only, zero-regression):
   *   - building (real-estate: max heat for PROPERTY/STASH_LOSS domain)
   *   - product_storage (storage: total quantity_grams for STASH_LOSS domain)
   *   - courier_shift (distribution: count of in_transit shifts for COURIER_ARREST domain)
   *   - laundering_nodes (laundering: max buffer_load for FENCE_DEFAULT domain)
   *   - lieutenant (cross-cue: has any lieutenant row for the player)
   *
   * Returns a snapshot record with the values needed for the finding-fires checks.
   * No modifications to any table.
   */
  private async snapshotSubstrate(playerId: string): Promise<SubstrateSnapshot> {
    // (a) Building heat — max heat across all player's buildings (PROPERTY + STASH_LOSS domain).
    const buildingRows = await this.db
      .select({ heat: building.heat })
      .from(building)
      .where(eq(building.player_id, playerId));
    const maxHeat = buildingRows.reduce((m, r) => Math.max(m, r.heat ?? 0), 0);

    // (b) Product storage — total quantity_grams across all player's product_storage rows (STASH_LOSS domain).
    const storageRows = await this.db
      .select({ quantity_grams: productStorage.quantity_grams })
      .from(productStorage)
      .where(eq(productStorage.player_id, playerId));
    const totalGrams = storageRows.reduce((s, r) => s + (r.quantity_grams ?? 0), 0);

    // (c) Courier shifts — count of in_transit shifts (COURIER_ARREST domain).
    const courierRows = await this.db
      .select({ status: courierShift.status })
      .from(courierShift)
      .where(
        and(
          eq(courierShift.player_id, playerId),
          eq(courierShift.status, 'in_transit'),
        ),
      );
    const inTransitCount = courierRows.length;

    // (d) Laundering nodes — max buffer_load across all player's laundering nodes (FENCE_DEFAULT domain).
    const launderingRows = await this.db
      .select({ buffer_load: launderingNode.buffer_load })
      .from(launderingNode)
      .where(eq(launderingNode.player_id, playerId));
    const maxBufferLoad = launderingRows.reduce((m, r) => Math.max(m, r.buffer_load ?? 0), 0);

    // (e) Lieutenant cross-cue — does the player have at least one lieutenant row?
    //     LIEUTENANT_UNIFORM_DISCIPLINED fires when NO lieutenant is present (absence = exposure).
    const lieutenantRows = await this.db
      .select({ lieutenant_id: lieutenant.lieutenant_id })
      .from(lieutenant)
      .where(eq(lieutenant.player_id, playerId))
      .limit(1);
    const hasLieutenant = lieutenantRows.length > 0;

    return { maxHeat, totalGrams, inTransitCount, maxBufferLoad, hasLieutenant };
  }

  /**
   * `findingFires` — returns true if the given FindingType is triggered by the substrate snapshot.
   *
   * Each FindingType maps to a specific substrate comparison:
   *   HEAT_SMOKE_OBSERVED:            maxHeat > heatThreshold()
   *   STASH_QUEUE_DEEP:               totalGrams > STASH_QUEUE_DEEP_THRESHOLD
   *   SLATE_MEMBERSHIP_STABLE:        inTransitCount > 0 (any in_transit courier = distribution active)
   *   HOSTAGE_SHELF_STATE:            maxBufferLoad > launderingExposureThreshold()
   *   LIEUTENANT_UNIFORM_DISCIPLINED: !hasLieutenant (absence of lieutenant = exposure signal)
   *   IDLE_DEALERS_OBSERVED:          reserved — always false at C2 (not yet observable from these tables)
   *
   * Anti-fabrication: all thresholds from `insuranceTunables` or structural (> 0).
   * Deterministic snapshot comparison — no non-deterministic RNG.
   */
  private findingFires(findingType: FindingType, snapshot: SubstrateSnapshot): boolean {
    switch (findingType) {
      case FindingType.HEAT_SMOKE_OBSERVED:
        return snapshot.maxHeat > heatThreshold();

      case FindingType.STASH_QUEUE_DEEP:
        return snapshot.totalGrams > STASH_QUEUE_DEEP_THRESHOLD;

      case FindingType.SLATE_MEMBERSHIP_STABLE:
        // Any in_transit courier = the distribution slate is active (exposure observable).
        return snapshot.inTransitCount > 0;

      case FindingType.HOSTAGE_SHELF_STATE:
        return snapshot.maxBufferLoad > launderingExposureThreshold();

      case FindingType.LIEUTENANT_UNIFORM_DISCIPLINED:
        // Fires when the player has NO lieutenant (absence = operational exposure signal).
        // [PROPOSED DEFAULT][PROV-Y26Q2]: the cross-cue reads "uniform disciplined" as "lieutenant present".
        return !snapshot.hasLieutenant;

      case FindingType.IDLE_DEALERS_OBSERVED:
        // Reserved — not yet triggered at C2 (dealer-spot heat observable from C6+).
        // Always false to avoid fabricating a finding from an unobserved domain.
        return false;

      default:
        return false;
    }
  }
}

// ── Internal snapshot type ────────────────────────────────────────────────────────────────────────

/**
 * `SubstrateSnapshot` — the coverage substrate state for a player at a given NIGHTLY tick.
 * Derived from read-only queries on the existing substrate tables.
 * All fields are used by `findingFires` — never returned to the client (R2.2).
 */
interface SubstrateSnapshot {
  /** Max heat across all player buildings (PROPERTY + STASH_LOSS domain). */
  maxHeat: number;
  /** Total quantity_grams across all player's product_storage rows (STASH_LOSS domain). */
  totalGrams: number;
  /** Count of in_transit courier shifts (COURIER_ARREST domain). */
  inTransitCount: number;
  /** Max buffer_load across all player's laundering nodes (FENCE_DEFAULT domain). */
  maxBufferLoad: number;
  /** Whether the player has at least one lieutenant row (cross-cue for all coverages). */
  hasLieutenant: boolean;
}
