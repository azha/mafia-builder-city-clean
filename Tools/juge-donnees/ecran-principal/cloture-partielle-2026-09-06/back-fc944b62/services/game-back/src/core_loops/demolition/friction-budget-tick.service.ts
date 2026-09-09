// IMPLEMENTS: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md §C2
//             (`FRICTION_BUDGET_TICK` N/31 provisoire — lazy-stamp then refresh cache single-statement
//             then penalty apply/revert transitions) + §C4 (★ the load-bearing concurrency surface)
//             Design: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §4.4 (tick
//             steps) + §5.1 (penalty transitions + Exception card) + §4.2/§4.3 (formula/aggregate/buckets)
//             + §6.3(f) (the decommission tx's OWN synchronous re-eval — REUSES this SAME locked critical
//             section, `FrictionBudgetRepository.reevaluateAndTransitionLocked`).
//             Decisions: D20 (lazy-stamp) ; I4 (penalty idempotence) ; R10/D3 (exception producer).
//             Pattern: `mycelial-decay-tick.service.ts` (registerSystem + "one public runTick both the
//             scheduler AND the `_test` route call" shape, Lesson #3 — calls its own Exception producer
//             IN-LINE after its own set-based write).
//             — P3-E C2 — 2026-07-17 / P3-E C4 (★ locked re-eval REUSE) — 2026-07-17
//
// `FrictionBudgetTickService` — registers `FRICTION_BUDGET_TICK` at NIGHTLY/31 (confirmed free after
// `BRENNAR_DAILY_TICK`/30, this branch's own C0/C2 re-anchor). `runTick(playerId, gameMinute)` is the ONE
// method BOTH the scheduler hook and the `_test` route call (Lesson #3, zero live-vs-test divergence):
//   (0) lazy-stamp any NULL `acquired_at_tick` of the ★#1 périmètre (D20, one-shot idempotent);
//   (1)+(2) `FrictionBudgetRepository.reevaluateAndTransitionStandalone` — the ★ C4 LOCKED critical
//       section (fetch périmètre → reduce via the PURE `frictionLoadForNode` formula, D4 — derived, never
//       a 2nd copy → refresh cache, I4 → recompute threshold → apply/revert penalty, I4 exactly-once) —
//       on a FRESH apply, emit `EfficiencyPenaltyAppliedEvent` + call `FrictionThresholdExceptionProducer.
//       raiseIfClear`; on a FRESH revert, emit `EfficiencyPenaltyRevertedEvent` (`emitPenaltyTransitionEvents`,
//       PUBLIC — `DecommissionService`, C4, calls this SAME method after its own in-tx re-eval commits, so
//       the event-emission logic is never duplicated).
// `resolveFrictionFormulaTunables` is ALSO public — `DecommissionService` resolves the SAME 7 getters
// before calling `reevaluateAndTransitionLocked` directly (sharing its OWN already-open tx, design
// §6.3(f)) — zero drift risk (both read the SAME `coreLoopsTunables` registry, single source).
//
// ★ P3-E C7 fold — compression-week ABANDON housekeeping (design §10.4 "abandon (aucun decide pendant N
// jours in-game — housekeeping N/31, D15)") now runs at the END of this SAME tick: `CompressionFinalize
// Service.finalize` (duplicate-provided, self-contained — see that file's own header for the full
// "avoids a DemolitionModule -> CompressionModule cycle" rationale) with a non-null `minAbandonAgeTicks`
// (`compressionBoardAbandonHorizonGameDays` × 1440, D15 default 14 game-days) — a 0-write (`finalized:
// false`) for every player with no `'active'` board, or one not yet old enough. Independent of the
// friction cache/replacement-option steps above (a DIFFERENT table, no shared row/lock).

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId } from '../../citysim/scheduler/city_sim_system';
import { CityEventBus } from '../../citysim/events/city-event-bus';
import { coreLoopsTunables } from '../core-loops-tunables';
import { FrictionBudgetRepository, type FrictionFormulaTunables, type FrictionReevalResult } from './friction-budget.repository';
import { FrictionThresholdExceptionProducer } from './friction-threshold-exception-producer.service';
import type { FrictionBudgetBucket } from './friction-budget-bucket';
import { ReplacementOptionRepository } from './replacement-option.repository';
import { gameDaysToTicks } from './friction-formula';
import { CompressionFinalizeService } from '../compression/compression-finalize.service';

/** The falsifiable proof surface `runTick` returns — every step's own outcome, never just a bare count. */
export interface FrictionBudgetTickResult {
  readonly stampedCount: number;
  readonly frictionBudgetTotal: number;
  readonly frictionOrgSize: number;
  readonly frictionThreshold: number;
  readonly bucket: FrictionBudgetBucket;
  readonly cacheChanged: boolean;
  readonly penaltyActive: boolean;
  readonly penaltyTransitioned: boolean;
  /** P3-E C5 (design §7 — "Expiry sweep : ride N/31 (0-write idempotent)") — count of `replacement_option`
   *  rows closed THIS call for being past `expires_at_tick` (0 = the common steady-state case, incl. every
   *  re-run at the same or a later gameMinute once already swept — idempotent). */
  readonly expiredReplacementOptionsClosed: number;
  /** P3-E C7 (design §10.4, D15) — whether THIS call's own compression-board abandon-check actually
   *  finalized an `'active'` board (`false` in the overwhelming common case: no board, or one not yet
   *  past the abandon horizon). */
  readonly compressionAbandonFinalized: boolean;
}

@Injectable()
export class FrictionBudgetTickService implements OnApplicationBootstrap {
  private readonly logger = new Logger(FrictionBudgetTickService.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly repo: FrictionBudgetRepository,
    private readonly exceptionProducer: FrictionThresholdExceptionProducer,
    private readonly bus: CityEventBus,
    // P3-E C5 (design §7, additive) — the N/31 expiry sweep for `replacement_option` rows.
    private readonly replacementOptionRepo: ReplacementOptionRepository,
    // P3-E C7 (design §10.4, D15, additive) — the N/31 abandon-sweep for a compression board that never
    // reached a natural finalize (duplicate-provided, self-contained — see this class's own header).
    private readonly compressionFinalize: CompressionFinalizeService,
  ) {}

  // ───────────────────────────── bootstrap: registration ─────────────────────────────

  onApplicationBootstrap(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.FRICTION_BUDGET_TICK,
      cadence: Cadence.NIGHTLY,
      order: 31,
      run: async (ctx) => {
        await this.runTick(ctx.playerId, ctx.gameMinute);
      },
    });
    this.logger.log(
      'FrictionBudgetTickService registered FRICTION_BUDGET_TICK at NIGHTLY/31 — next free after ' +
        'BRENNAR_DAILY_TICK/30. Each in-game night, per player: lazy-stamp (D20) then refresh the ' +
        'friction_budget_state cache (I4) then apply/revert the efficiency penalty (I4) + Exception card ' +
        'on a fresh apply. Organically a no-op for a player with no owned buildings.',
    );
  }

  // ───────────────────────────── the registered NIGHTLY/31 tick ─────────────────────────────

  /**
   * {NIGHTLY, order 31} — the design §4.4 3-step tick for one player. Public so
   * `DemolitionTestController` can drive it directly for E2E (the `run-friction-budget-tick` test route).
   * Production: called only via the scheduler registration.
   */
  async runTick(playerId: string, gameMinute: number): Promise<FrictionBudgetTickResult> {
    // Step 0 — D20 lazy-stamp (one-shot idempotent: 0 from the 2nd call onward for an already-stamped player).
    const stampedCount = await this.repo.lazyStampAcquiredAtTick(playerId, gameMinute);

    // Steps 1+2 — ★ C4: the LOCKED critical section (fetch périmètre → reduce via the PURE formula →
    // refresh cache → apply/revert penalty), now shared verbatim with the decommission tx's own
    // synchronous re-eval (`DecommissionRepository`, sharing this SAME method but ITS OWN `tx` instead of
    // a fresh standalone one) — see `friction-budget.repository.ts`'s own header for the full race account.
    const result = await this.repo.reevaluateAndTransitionStandalone(playerId, gameMinute, this.resolveFrictionFormulaTunables());

    await this.emitPenaltyTransitionEvents(playerId, gameMinute, result);

    // P3-E C5 (design §7 — "Expiry sweep : ride N/31 (0-write idempotent)") — additive, independent of the
    // friction cache above (a DIFFERENT table, `replacement_option` — no shared row/lock with anything
    // this method already does).
    const expiredReplacementOptionsClosed = await this.replacementOptionRepo.closeExpired(playerId, gameMinute);

    // P3-E C7 (design §10.4, D15) — the compression-board abandon-sweep: a board `'active'` for at least
    // `compressionBoardAbandonHorizonGameDays` (default 14) in-game days since it fired, with no natural
    // finalize (budget-exhausted/all-addressed) having happened yet, auto-finalizes here.
    const minAbandonAgeTicks = gameDaysToTicks(coreLoopsTunables.compressionBoardAbandonHorizonGameDays);
    const abandonOutcome = await this.compressionFinalize.finalize(playerId, gameMinute, minAbandonAgeTicks);

    return { stampedCount, ...result, expiredReplacementOptionsClosed, compressionAbandonFinalized: abandonOutcome.finalized };
  }

  /**
   * The 7 §4.2/§4.3 formula + bucket tunables, resolved ONCE here (R2.3 — the SERVICE layer resolves
   * tunables, the REPOSITORY takes plain numbers). PUBLIC: `DecommissionService` (C4) calls this SAME
   * method before its own `reevaluateAndTransitionLocked` call — zero drift risk, both read the SAME
   * `coreLoopsTunables` registry (single source), never a 2nd hardcoded getter list.
   */
  resolveFrictionFormulaTunables(): FrictionFormulaTunables {
    return {
      baseFrictionPerNode: coreLoopsTunables.demolitionBaseFrictionPerNode,
      ageDecayFactorPerTick: coreLoopsTunables.demolitionAgeDecayFactorPerTick,
      perConnectionFrictionModifier: coreLoopsTunables.demolitionPerConnectionFrictionModifier,
      thresholdMultiplier: coreLoopsTunables.demolitionFrictionBudgetThresholdMultiplierOfOrgSize,
      bucketLightUpperBound: coreLoopsTunables.demolitionFrictionBucketLightUpperBound,
      bucketBalancedUpperBound: coreLoopsTunables.demolitionFrictionBucketBalancedUpperBound,
      bucketStrainedUpperBound: coreLoopsTunables.demolitionFrictionBucketStrainedUpperBound,
    };
  }

  /**
   * §5.1 event emission — factored out of `runTick` (C4) so `DecommissionService` can call the SAME
   * logic after its own `reevaluateAndTransitionLocked` call commits (design §6.3: "si retour sous seuil
   * → revert penalty immédiat ... pas d'attente du tick" — the decommission's OWN transition, when it
   * happens, is announced exactly like the scheduled tick's). No-ops when `!result.penaltyTransitioned`
   * (the common steady-state case — a re-tick, or a decommission that didn't cross the threshold).
   */
  async emitPenaltyTransitionEvents(playerId: string, gameMinute: number, result: FrictionReevalResult): Promise<void> {
    if (!result.penaltyTransitioned) return;
    if (result.penaltyActive) {
      this.bus.emitEfficiencyPenaltyApplied({ type: 'efficiency_penalty_applied', playerId, bucket: result.bucket, gameMinute });
      const outcome = await this.exceptionProducer.raiseIfClear(playerId);
      this.logger.log(`FRICTION_BUDGET_TICK: player=${playerId} gameMinute=${gameMinute} -> penalty APPLIED, exception ${outcome}.`);
    } else {
      this.bus.emitEfficiencyPenaltyReverted({ type: 'efficiency_penalty_reverted', playerId, gameMinute });
      this.logger.log(`FRICTION_BUDGET_TICK: player=${playerId} gameMinute=${gameMinute} -> penalty REVERTED.`);
    }
  }
}
