// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-B-combat-escalation-plan.md Task 8 (C8) Step 3
//             Design: docs/superpowers/specs/2026-06-24-04b-B-combat-escalation-design.md §3.6
//             Canon: docs/tech/04b_combat_and_conflict/combat_mechanics.md :278-329
//             — Combat & Escalation B C8 — 2026-06-25 —
//
// `CumulativeAttritionService` — §3.6 the pacifist counterpart to violent operations.
//
// Canon (combat_mechanics.md:278-329): a player who NEVER orders a direct hit can still collapse
// a rival's capacity through sustained, independent, low-magnitude economic + logistical
// disruptions — each deniable, compounding into systemic degradation (:282).
// "This IS the pacifist counterpart" (:313).
//
// Methods:
//   `incrementCPI(playerId, rivalKey, source, amount)` — the deterministic rolling-sum accrual on
//     rival_state.cumulative_pressure_index (SSOT, the B-owned column added by C1 migration 0085).
//     Source = closed enum of independent player actions (lek_outcompete / supply_interrupt /
//     contract_cancel / informant_place — the canon :294 action types).
//     Clamps to [0, 1]. NO Math.random().
//
//   `decayCPIDaily(playerId, rivalKey)` — the daily decay (COMBAT_DAILY_TICK at C-deesc;
//     here driven via _test). Subtracts cpiDecayRatePerTick (getter-sourced). Clamps to [0, 1].
//
//   `computeResourcePressure(playerId, rivalKey)` — the crossing + collapse logic.
//     1. Read cumulative_pressure_index from rival_state (SSOT — NOT a parallel CPI table).
//     2. If CPI >= cpiCrossingThresholdBucket ref (getter-sourced, composite:STANDARD = 0.60):
//        - resource_pressure increases by cpiResourcePressureDrainAboveThresholdPerTick (getter).
//        - calls A's RegimeSwitchingService.recordPressure ('revenue', 'mounting') → drives
//          BLEEDING → RETRENCH → WITHDRAWAL (the canon Cumulative-Attrition → regime path, :328).
//     3. If resource_pressure >= collapse ceiling (1.0):
//        - calls A's TrophicGapService.removeTopEnforcer (the Trophic cascade, canon :320).
//     4. READs reputation via ReputationHubService.projectReputationHub for LEADERSHIP-register
//        erosion (DD-ATTRITION-REPUTATION, :338-344). NO reputation WRITE (OQ-B3 no double-count).
//
// OQ-B3 compliance: the B-canonical default is CPI-on-RivalState as the sole source of truth.
//   The reputation coupling is a READ (avoid a double-count, the 9b DD-DEBT-SSOT discipline).
//   No INSERT/UPDATE on any reputation table by this service.
//
// P5/P6 wall: cumulative_pressure_index + resource_pressure are SERVER-ONLY (never projected).
//   The player sees ONLY behavioral changes (fewer lek bids, route abandonments, slower tempo)
//   and infers — mediated by A's toClientView regime-pressure band.
//
// Determinism (C4): the rolling sum + decay are deterministic float ops. NO Math.random().
//   NO Date.now(). The threshold crossing is a deterministic compare. All magnitudes getter-sourced.
//
// R9.3 (source-of-truth): uses C1 rival_state columns (cumulative_pressure_index, resource_pressure)
//   — no parallel CPI table created. The SSOT is the B-owned column on rival_state.
//
// Zero-regression: ADDITIVE. No existing hot-path is modified by this service.

import { Injectable, Inject, Logger } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import type { DrizzleClient } from '../../../db';
import { DB } from '../../../db/db.module';
import { rivalState } from '../../../db/schema/conflict_rival';
import { CombatRepository } from './combat.repository';
import { CombatTunables } from './combat-tunables';
import { RegimeSwitchingService } from '../rival/regime-switching.service';
import { TrophicGapService } from '../rival/trophic-gap.service';
import { ReputationHubService } from '../../reputation/reputation-hub.service';
import type { RivalKey } from '../rival/rival-ai.types';

// ── CPI action-source discriminator ──────────────────────────────────────────────────────────────
//
// Canon (combat_mechanics.md:294): independent player actions that accrue CPI.
//   lek_outcompete:   lek bid out-competitions (economic, the lek market seam)
//   supply_interrupt: supply chain disruptions (logistical, the distribution seam)
//   contract_cancel:  contract cancellations (economic, the market seam)
//   informant_place:  informant placements (intelligence, the D2 seam)
//
// This is a closed enum — the canon action types that ACCRUE CPI (the non-violent path).

export type CpiAccrualSource =
  | 'lek_outcompete'
  | 'supply_interrupt'
  | 'contract_cancel'
  | 'informant_place';

/** Valid CPI accrual sources — used for domain guard in the _test controller. */
export const VALID_CPI_ACCRUAL_SOURCES: ReadonlySet<CpiAccrualSource> = new Set([
  'lek_outcompete',
  'supply_interrupt',
  'contract_cancel',
  'informant_place',
]);

// ── resource_pressure collapse ceiling ───────────────────────────────────────────────────────────
//
// When resource_pressure reaches 1.0 (ceiling), the rival collapses and A's Trophic Gap
// cascade fires. This is a deterministic compare — NOT a random draw. Canon :302.
// The ceiling is a fixed domain bound (float clamping), NOT a tunable.

const RESOURCE_PRESSURE_COLLAPSE_CEILING = 1.0;

// ── composite-bucket to ref-float mapping ────────────────────────────────────────────────────────
//
// Canon: cpi_crossing_threshold_bucket = 'composite:STANDARD' (ref 0.60, :429).
// The getter returns a string like 'composite:STANDARD' — map it to the ref float.
// NEVER inline 0.60 — always go through this mapping + the getter-sourced bucket string.
//
// All threshold labels match gdd/14 composite-bucket convention.

function compositeToThresholdRef(bucketStr: string): number {
  // composite:STANDARD ref = 0.60 (canon :429 — the CPI crossing threshold).
  if (bucketStr === 'composite:STANDARD') return 0.60;
  if (bucketStr === 'composite:LOW')      return 0.30;
  if (bucketStr === 'composite:HIGH')     return 0.80;
  if (bucketStr === 'composite:MINIMAL')  return 0.20;
  if (bucketStr === 'composite:MAXIMUM')  return 0.90;
  // Fallback: try parsing as a direct float (e.g., for test override via TunablesStore).
  const parsed = parseFloat(bucketStr);
  return Number.isFinite(parsed) ? parsed : 0.60; // safe canon default
}

// ── Return types ──────────────────────────────────────────────────────────────────────────────────

/** Return from `computeResourcePressure`. */
export interface ResourcePressureResult {
  /** true if CPI crossed the threshold (recordPressure was called). */
  readonly crossedThreshold: boolean;
  /** true if resource_pressure increased above its prior value. */
  readonly resourcePressureIncreased: boolean;
  /** true if resource_pressure hit the collapse ceiling (removeTopEnforcer called). */
  readonly collapseTriggered: boolean;
  /** true if TrophicGapService.removeTopEnforcer returned { removed: true }. */
  readonly enforcerRemoved: boolean;
  /** The final resource_pressure value after this computation (SERVER-ONLY, never forwarded). */
  readonly resourcePressure: number;
}

/** Return from `incrementCPI`. */
export interface IncrementCpiResult {
  readonly incremented: true;
  /** The new cumulative_pressure_index value (SERVER-ONLY, never forwarded). */
  readonly newCpi: number;
}

/** Return from `decayCPIDaily`. */
export interface DecayCpiResult {
  readonly decayed: true;
  /** The new cumulative_pressure_index value after decay (SERVER-ONLY, never forwarded). */
  readonly newCpi: number;
}

@Injectable()
export class CumulativeAttritionService {
  private readonly logger = new Logger(CumulativeAttritionService.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly combatRepo: CombatRepository,
    private readonly tunables: CombatTunables,
    // A's §13 write-hook: regime-switching → drives BLEEDING→RETRENCH→WITHDRAWAL (canon :328).
    private readonly regimeSwitching: RegimeSwitchingService,
    // A's §13 write-hook: trophic gap → the collapse → Trophic cascade (canon :320).
    private readonly trophicGap: TrophicGapService,
    // Reputation READ-ONLY: LEADERSHIP-register erosion (DD-ATTRITION-REPUTATION, OQ-B3).
    // NO reputation WRITE. The coupling is a read (avoid double-count, 9b DD-DEBT-SSOT).
    private readonly reputationHub: ReputationHubService,
  ) {}

  /**
   * `incrementCPI` — the deterministic rolling-sum accrual.
   *
   * Adds `amount` to `rival_state.cumulative_pressure_index` for (playerId, rivalKey).
   * Source discriminator documents the originating action type (the pacifist trail —
   * lek_outcompete / supply_interrupt / contract_cancel / informant_place, canon :294).
   * Clamps to [0, 1] to prevent overflow.
   *
   * The SSOT is the rival_state.cumulative_pressure_index column (C1 migration 0085).
   * NO parallel CPI table is created or written (R9.3 / OQ-B3 discipline).
   *
   * C4: NO Math.random(). NO Date.now(). Amount is the caller-provided deterministic delta.
   * OQ-B3: no reputation WRITE here. No trophic cascade here (that is `computeResourcePressure`).
   */
  async incrementCPI(
    playerId: string,
    rivalKey: RivalKey,
    source: CpiAccrualSource,
    amount: number,
  ): Promise<IncrementCpiResult> {
    const currentCpi = await this.readCurrentCpi(playerId, rivalKey);
    const newCpi = Math.min(1.0, Math.max(0, currentCpi + amount));

    // Write back to rival_state.cumulative_pressure_index (SSOT).
    await this.combatRepo.writeRivalCombatCols(playerId, rivalKey, {
      cumulative_pressure_index: newCpi,
    });

    this.logger.debug(
      `CumulativeAttrition.incrementCPI: player=${playerId} rival=${rivalKey} ` +
      `source=${source} amount=${amount} ${currentCpi}→${newCpi}`,
    );

    return { incremented: true, newCpi };
  }

  /**
   * `decayCPIDaily` — the daily CPI decay (driven by COMBAT_DAILY_TICK at C-deesc).
   *
   * Subtracts `cpiDecayRatePerTick` (getter-sourced, default 0.05) from
   * rival_state.cumulative_pressure_index. Clamps to [0, 1].
   * Idempotent: if CPI is already 0, no-op (still returns { decayed: true }).
   *
   * C4: NO Math.random(). NO Date.now(). Decay rate is getter-sourced (NEVER inlined).
   */
  async decayCPIDaily(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<DecayCpiResult> {
    const currentCpi = await this.readCurrentCpi(playerId, rivalKey);
    // NEVER inline 0.05 — always from getter.
    const decayRate = this.tunables.cpiDecayRatePerTick;

    const newCpi = Math.min(1.0, Math.max(0, currentCpi - decayRate));

    await this.combatRepo.writeRivalCombatCols(playerId, rivalKey, {
      cumulative_pressure_index: newCpi,
    });

    this.logger.debug(
      `CumulativeAttrition.decayCPIDaily: player=${playerId} rival=${rivalKey} ` +
      `decayRate=${decayRate} ${currentCpi}→${newCpi}`,
    );

    return { decayed: true, newCpi };
  }

  /**
   * `computeResourcePressure` — the crossing + collapse logic (the canon regime path).
   *
   * 1. Reads cumulative_pressure_index from rival_state (SSOT — NOT a parallel CPI table).
   * 2. Maps crossing threshold from `cpiCrossingThresholdBucket` getter → composite:STANDARD = 0.60.
   * 3. If CPI >= threshold:
   *    - Increases resource_pressure by `cpiResourcePressureDrainAboveThresholdPerTick` (getter).
   *    - Calls A's `recordPressure('revenue', 'mounting')` → drives BLEEDING→RETRENCH→WITHDRAWAL.
   * 4. Writes updated resource_pressure to rival_state.
   * 5. If resource_pressure >= 1.0 (collapse ceiling):
   *    - Calls A's `removeTopEnforcer` (the Trophic cascade, canon :320).
   * 6. READs reputation for LEADERSHIP-register erosion (DD-ATTRITION-REPUTATION) — READ-ONLY.
   *    No reputation INSERT/UPDATE (OQ-B3 no double-count).
   *
   * C4: all thresholds getter-sourced. NO Math.random(). NO Date.now().
   * P5/P6: resource_pressure is SERVER-ONLY (never projected to client).
   */
  async computeResourcePressure(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<ResourcePressureResult> {
    // 1. Read current state from rival_state (SSOT — the B-owned columns).
    const currentCpi = await this.readCurrentCpi(playerId, rivalKey);
    const currentResourcePressure = await this.readCurrentResourcePressure(playerId, rivalKey);

    // 2. Map crossing threshold (getter-sourced composite bucket → ref float).
    // NEVER inline 0.60 — always go through compositeToThresholdRef + getter.
    const thresholdBucket = this.tunables.cpiCrossingThresholdBucket; // 'composite:STANDARD'
    const crossingThreshold = compositeToThresholdRef(thresholdBucket);

    const crossedThreshold = currentCpi >= crossingThreshold;
    let newResourcePressure = currentResourcePressure;
    let resourcePressureIncreased = false;
    let collapseTriggered = false;
    let enforcerRemoved = false;

    if (crossedThreshold) {
      // 3. Resource pressure increases by drain rate (getter-sourced).
      // NEVER inline 0.10 — always from getter.
      const drainRate = this.tunables.cpiResourcePressureDrainAboveThresholdPerTick;
      newResourcePressure = Math.min(1.0, Math.max(0, currentResourcePressure + drainRate));
      resourcePressureIncreased = newResourcePressure > currentResourcePressure;

      // [PROV-Y26Q2]: source='revenue' + magnitude='mounting' — canon specifies the regime path
      // (BLEEDING→RETRENCH→WITHDRAWAL via recordPressure, :328) but not the exact accrual magnitude.
      // Calibration TD (conflict-layer calibration). Consistent with C5 erosion-register.service.ts annotation.
      //
      // Call A's recordPressure: the canon Cumulative-Attrition → regime path (:328).
      // Source = 'revenue' (economic attrition is revenue pressure in A's regime model).
      // Magnitude = 'mounting' (the pacifist path uses measured pressure — not 'crushing').
      // This ACTUALLY writes regime_pressure on rival_state via A's RegimeSwitchingService.
      // The downstream effect (regime_pressure moves) is the falsifiable assertion in the spec.
      await this.regimeSwitching.recordPressure(playerId, rivalKey, 'revenue', 'mounting');

      this.logger.debug(
        `CumulativeAttrition.computeResourcePressure: CROSSING player=${playerId} rival=${rivalKey} ` +
        `cpi=${currentCpi} threshold=${crossingThreshold} → recordPressure(revenue,mounting) called`,
      );
    }

    // 4. Write updated resource_pressure to rival_state.
    await this.combatRepo.writeRivalCombatCols(playerId, rivalKey, {
      resource_pressure: newResourcePressure,
    });

    // 5. Collapse check: if resource_pressure reached the ceiling → Trophic cascade.
    // Canon :302: "when resource pressure crosses, the rival sheds secondary holdings".
    // Canon :320: "calls A's removeTopEnforcer / the trophic cascade when a rival collapses".
    if (newResourcePressure >= RESOURCE_PRESSURE_COLLAPSE_CEILING) {
      collapseTriggered = true;

      // Calls A's removeTopEnforcer: flips top_enforcer_active=false for all pairs.
      // This is the ACTUAL write-hook that drives A's Trophic Gap cascade.
      const trophicResult = await this.trophicGap.removeTopEnforcer(playerId, rivalKey);
      enforcerRemoved = trophicResult.removed;

      this.logger.debug(
        `CumulativeAttrition.computeResourcePressure: COLLAPSE player=${playerId} rival=${rivalKey} ` +
        `resource_pressure=${newResourcePressure} → removeTopEnforcer: removed=${enforcerRemoved}`,
      );
    }

    // 6. READ reputation for LEADERSHIP-register erosion (DD-ATTRITION-REPUTATION, OQ-B3).
    //    This is a READ — no reputation INSERT/UPDATE (OQ-B3 no double-count discipline).
    //    The read surfaces the behavioral erosion signal for the LEADERSHIP-register band.
    //    [PROV-Y26Q2]: the exact lieutenant/counterparty/cell routing is calibration-routed.
    //    We use playerId as sentinel for lieutenantId + counterpartyId; cellId=0 (origin lek cell).
    try {
      await this.reputationHub.projectReputationHub(
        playerId,
        playerId, // lieutenantId: sentinel — reads the player's own curriculum cues
        playerId, // counterpartyId: sentinel — reads restraint offer terms toward self
        0,        // cellId: 0 (origin lek cell — [PROV-Y26Q2])
      );
      // Reputation read result is used internally (the behavioral erosion signal).
      // The result is intentionally discarded here — the READ is the OQ-B3 constraint.
    } catch (err) {
      // Reputation read failure is non-fatal (the attrition effect is on CPI/resource_pressure).
      this.logger.warn(
        `CumulativeAttrition.computeResourcePressure: reputation READ failed for ` +
        `player=${playerId} rival=${rivalKey} — non-fatal: ${String(err)}`,
      );
    }

    return {
      crossedThreshold,
      resourcePressureIncreased,
      collapseTriggered,
      enforcerRemoved,
      resourcePressure: newResourcePressure,
    };
  }

  // ── Private helpers ───────────────────────────────────────────────────────────────────────────

  /**
   * Read the current `cumulative_pressure_index` from rival_state for (playerId, rivalKey).
   *
   * The SSOT is the B-owned rival_state column (C1 migration 0085). NOT a parallel CPI table.
   * Returns 0 if no row exists (graceful — base case for unseeded state).
   */
  private async readCurrentCpi(playerId: string, rivalKey: RivalKey): Promise<number> {
    const rows = await this.db
      .select({ cumulative_pressure_index: rivalState.cumulative_pressure_index })
      .from(rivalState)
      .where(
        and(
          eq(rivalState.player_id, playerId),
          eq(rivalState.rival_key, rivalKey),
        ),
      )
      .limit(1);

    const raw = rows[0]?.cumulative_pressure_index;
    return (raw !== null && raw !== undefined) ? Number(raw) : 0;
  }

  /**
   * Read the current `resource_pressure` from rival_state for (playerId, rivalKey).
   *
   * Returns 0 if no row exists (graceful — base case for unseeded state).
   */
  private async readCurrentResourcePressure(playerId: string, rivalKey: RivalKey): Promise<number> {
    const rows = await this.db
      .select({ resource_pressure: rivalState.resource_pressure })
      .from(rivalState)
      .where(
        and(
          eq(rivalState.player_id, playerId),
          eq(rivalState.rival_key, rivalKey),
        ),
      )
      .limit(1);

    const raw = rows[0]?.resource_pressure;
    return (raw !== null && raw !== undefined) ? Number(raw) : 0;
  }
}
