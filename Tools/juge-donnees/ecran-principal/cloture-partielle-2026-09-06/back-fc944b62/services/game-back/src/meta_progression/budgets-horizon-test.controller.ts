// IMPLEMENTS: docs/superpowers/plans/2026-07-19-p3-G-budgets-horizon-plan.md C1 (tunables foundation —
//             the E2E probe route the C1 floor spec needs) + C2 ("CapabilityCatalogue + predicate engine
//             (pure evaluation)" — the falsifiable strict-mode probe + the evaluate-for-player probe) +
//             C3 ("+ surfaced event observed" falsifiable — the `CapabilityHorizonSurfacedEvent` in-memory
//             probe; every OTHER C3 falsifiable routes through the REAL `POST /v1/session/open` /
//             `GET|POST /v1/meta/horizon-feed*` endpoints, no test-only shortcut needed for them).
//             Pattern: R-EC-2 test-only controller (mirrors `delegation-ratchet-test.controller.ts`'s
//             own C1 `ping`/`read-tunables` shape — "C2+ chunks will add routes here as each chunk adds
//             services", same convention here; C2's own two routes below mirror that SAME file's C2
//             `validate-catalogue`/`mastery-score` probe shapes verbatim).
//             ★ Own controller, NOT an extension of `delegation-ratchet-test.controller.ts`: DD-G1
//             mandates `BudgetsHorizonModule` as a NEW sibling leaf with "No edit to delegation-ratchet.
//             module.ts" — the ch05 `CoreLoopsTestController` shared-hub pattern (one test controller
//             reused across DemolitionModule/CompressionModule/etc.) required its OWNING module
//             (`CoreLoopsModule`) to import every sibling module it drives, which is exactly the
//             cross-module coupling DD-G1 rules out here. `DemolitionModule`/`CompressionModule`
//             themselves carry no test controller of their own (they lean on the shared ch05 hub); this
//             lot instead mirrors `DelegationRatchetModule`'s OWN C1 precedent — a genuinely new domain's
//             first chunk gets its own dedicated probe controller (itself mirroring `core-loops.module.
//             ts`'s "C1 = tunables-only shell" posture one level up, per that file's own header).
//             — P3-G C1 — 2026-07-20 (ping + read-tunables) / C2 — 2026-07-20 (evaluate + validate-catalogue)
//             / C3 — 2026-07-20 (surfaced-events + clear) / C4 — 2026-07-20 (pending-opportunities +
//             replay-graduation-committed + replay-recall-initiated + emit-capability-adopted) / C5 —
//             2026-07-20 (arm-adoption-corruption + adopted-events + adopted-events/clear) / C6 —
//             2026-07-20 (advanced-events + advanced-events/clear — no NEW hand-emit route needed, the C4
//             emit-capability-adopted hook already emits the exact real CapabilityAdoptedEvent shape the
//             C6 replay/out-of-order falsifiables re-fire, per capability code) / C7 — 2026-07-20
//             (debt-cleared-events + debt-cleared-events/clear — the `CapabilityDebtClearedEvent` in-memory
//             probe; emit-script-attached — a NEW hand-emit hook: unlike C6's replay falsifiable, THIS
//             chunk's concurrency falsifiable needs to fire the SAME active-decay bus event genuinely
//             concurrently, and no C4/C5 hook shape covers `ScriptAttachedEvent`)
//
// `BudgetsHorizonTestController` — TEST-ONLY probe routes for the P3-G Budgets & Horizon surface.
// Mounted ONLY when `testControllersEnabled()` (R-EC-2).
//
// C1 routes:
//   GET /v1/_test/budgets-horizon/ping
//     -> { ok: true } — proves BudgetsHorizonModule is in the DI graph.
//
//   GET /v1/_test/budgets-horizon/read-tunables
//     Returns EVERY `metaProgressionTunables.*` getter THIS LOT ADDED (the 8 NEW `meta.*` keys, design
//     §15 — DD-G5: the SAME shared `meta-progression-tunables.ts` module P3-F extended, not a fork) as a
//     JSON-safe object — every getter CALLED (not echoed as a function reference), anti-fabrication:
//     reads REAL getter output, not a hardcoded echo. Used by `budgets_horizon_tunables.spec.ts` to
//     assert value-sensitive defaults AND a real DB/env-override clamp (mirrors
//     `meta_progression_tunables.spec.ts`'s own C1 pattern).
//
// C2 routes:
//   GET /v1/_test/budgets-horizon/evaluate?playerId=
//     Calls `HorizonPredicateEvaluatorService.evaluateForPlayer` DIRECTLY (no HTTP contract exists yet —
//     C3 wires the real `GET /v1/meta/horizon-feed`). Response `{ results: CapabilityEvaluationResult[] }`
//     — the FULL per-capability per-clause verdict array, no projection/banding (a raw test probe, R2.2
//     does not apply to `_test/` routes).
//
//   POST /v1/_test/budgets-horizon/validate-catalogue
//     Body { catalogue?: CapabilityCatalogueEntry[] }. Runs the REAL
//     `validateCapabilityCatalogueStrictMode` — see file header for the full contract. Response
//     `{ valid: boolean; error?: string }`. Mirrors `delegation-ratchet-test.controller.ts`'s own C2
//     `validate-catalogue` route verbatim (the P3-A/P3-F strict-mode test shape).
//
// C3 routes:
//   GET /v1/_test/budgets-horizon/surfaced-events
//     Returns `{ events: CapabilityHorizonSurfacedEvent[] }` — every `CapabilityHorizonSurfacedEvent`
//     fired this process (`HorizonCardSurfacingService`'s own in-memory probe, mirrors
//     `MasteryAccumulatorService.getThresholdCrossedEvents`'s own "no real consumer yet" posture). The
//     ONLY C3 falsifiable this file serves — every OTHER assertion (surfacing, transitions, regression,
//     capacity, no-expiry, the double-open race) drives the REAL production endpoints directly.
//
//   POST /v1/_test/budgets-horizon/surfaced-events/clear
//     Clears the in-memory probe (test isolation between specs/describe blocks that share a process).
//
// C4 routes:
//   GET /v1/_test/budgets-horizon/pending-opportunities?playerId=
//     Calls `BudgetRecomputeService.getPendingOpportunities` DIRECTLY — design §10.3's derived projection
//     carries NO public HTTP contract in design §13 (Unity/BO consume it later, ★#5 backend-complete-
//     Unity-deferred precedent, the SAME posture C2's `evaluate` route documents for
//     `HorizonPredicateEvaluatorService`). Response `{ opportunities: PendingOpportunity[] }`.
//
//   POST /v1/_test/budgets-horizon/replay-graduation-committed
//   POST /v1/_test/budgets-horizon/replay-recall-initiated
//   POST /v1/_test/budgets-horizon/emit-capability-adopted
//     Bus re-emit/emit hooks (the plan's own "bus re-emit hook" idempotency/convergence falsifiable
//     surface) — re-fire the EXACT real event shape directly on `CityEventBus` so a spec can prove
//     `BudgetRecomputeService.recompute` is idempotent under a replay (falsifiable 7) and convergent under
//     BOTH processing orders (the mandatory concurrency falsifiable), and — for `emit-capability-adopted`
//     specifically — that the C5-dormant `onCapabilityAdopted` subscription is genuinely wired NOW, not
//     dead code (no production emitter exists for this ONE event until C5; every OTHER real falsifiable in
//     this chunk drives graduation/recall through the REAL `POST /v1/meta/graduation`/`POST /v1/meta/
//     recall` endpoints — these 3 routes exist ONLY for the replay/dormant-wiring proofs those real
//     endpoints cannot exercise). Each returns `{ emitted: true }`.
//
// C5 routes:
//   POST /v1/_test/budgets-horizon/arm-adoption-corruption
//     Body { playerId }. Calls `AdoptionFaultInjector.arm` DIRECTLY — see that class's own header for the
//     full contract (the induced-post-gate-failure proof seam, mirrors `arm-lieutenant-corruption`/
//     `arm-recall-corruption` in `delegation-ratchet-test.controller.ts`). Response `{ armed: true }`.
//
//   GET /v1/_test/budgets-horizon/adopted-events
//     Returns `{ events: CapabilityAdoptedEvent[] }` — every `CapabilityAdoptedEvent` fired this process
//     (`AdoptionService`'s own in-memory probe, mirrors `HorizonCardSurfacingService.getSurfacedEvents`'s
//     own "no raw-bus-tap-in-tests" posture). Lets the C5 concurrency floor assert "no double event"
//     directly.
//
//   POST /v1/_test/budgets-horizon/adopted-events/clear
//     Clears the in-memory probe (test isolation between specs/describe blocks that share a process).
//
// C6 routes:
//   GET /v1/_test/budgets-horizon/vocab-tier-advanced-events
//     Returns `{ events: VocabTierAdvancedEvent[] }` — every `VocabTierAdvancedEvent` fired this process
//     (`VocabTierAdvancementService`'s own in-memory probe, mirrors `AdoptionService.getAdoptedEvents`'s
//     own "no raw-bus-tap-in-tests" posture). Lets the C6 floor assert "zero event on replay/out-of-order"
//     and "exactly one event under a concurrent replay race" directly. NO new hand-emit route is added —
//     the C4 `emit-capability-adopted` route already re-fires the exact real `CapabilityAdoptedEvent` this
//     chunk's replay/out-of-order/concurrency falsifiables need (any `capabilityId`, any `playerId`).
//
//   POST /v1/_test/budgets-horizon/vocab-tier-advanced-events/clear
//     Clears the in-memory probe (test isolation between specs/describe blocks that share a process).
//
// C7 routes:
//   GET /v1/_test/budgets-horizon/debt-cleared-events
//     Returns `{ events: CapabilityDebtClearedEvent[] }` — every `CapabilityDebtClearedEvent` fired this
//     process (`IsostaticDebtService`'s own in-memory probe, mirrors `VocabTierAdvancementService.
//     getAdvancedEvents`'s own "no raw-bus-tap-in-tests" posture). Lets the C7 floor assert "exactly once"
//     / "zero on re-fire at 0" directly.
//
//   POST /v1/_test/budgets-horizon/debt-cleared-events/clear
//     Clears the in-memory probe (test isolation between specs/describe blocks that share a process).
//
//   POST /v1/_test/budgets-horizon/emit-script-attached
//     Body: the EXACT `ScriptAttachedEvent` payload (minus `type`) — `{playerId, lieutenantId, buildingId,
//     gameMinute}`. Hand-emits the event onto the REAL `CityEventBus` (mirrors the C4 `emit-capability-
//     adopted` shape) — a NEW hook (unlike C6, this chunk's concurrency falsifiable needs to fire the
//     SAME active-decay bus event genuinely concurrently, which no EXISTING hook shape covers). Response
//     `{ emitted: true }`.
//
// C8 routes:
//   POST /v1/_test/budgets-horizon/run-isostatic-debt-tick
//     Body { playerId, gameMinute }. Calls `IsostaticDebtService.applyPassiveDecay` DIRECTLY — mirrors
//     `delegation-ratchet-test.controller.ts`'s own `run-promotion-lock-tick` route verbatim (the P3-F C8
//     precedent: an arbitrary `gameMinute` drives the elapsed-hours falsifiables without actually
//     advancing the real scheduler clock 60+ ticks). Response = the tick's own `ActiveDecayRow[]`
//     (`{capabilityId, structuralDebt, decayPath}[]`, a raw test probe, R2.2 does not apply to `_test/`
//     routes). No NEW event-capture route needed — `debt-cleared-events` (C7, above) already observes
//     `CapabilityDebtClearedEvent`s from EITHER writer (both push into the SAME `IsostaticDebtService`
//     in-memory probe).
//
// C9+ chunks will add routes here as each chunk adds services. No route is ever removed.

import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';

import { metaProgressionTunables } from './meta-progression-tunables';
import { CAPABILITY_CATALOGUE, validateCapabilityCatalogueStrictMode, type CapabilityCatalogueEntry } from './capability-catalogue';
import { HorizonPredicateEvaluatorService, type CapabilityEvaluationResult } from './horizon-predicate-evaluator.service';
import { HorizonCardSurfacingService } from './horizon-card-surfacing.service';
import { BudgetRecomputeService, type PendingOpportunity } from './budget-recompute.service';
import { AdoptionFaultInjector } from './adoption-fault-injector';
import { AdoptionService } from './adoption.service';
import { VocabTierAdvancementService } from './vocab-tier-advancement.service';
import { IsostaticDebtService } from './isostatic-debt.service';
import type { ActiveDecayRow } from './capability-debts.repository';
import {
  CityEventBus,
  type CapabilityHorizonSurfacedEvent,
  type CapabilityAdoptedEvent,
  type VocabTierAdvancedEvent,
  type CapabilityDebtClearedEvent,
} from '../citysim/events/city-event-bus';

/**
 * Test-only probe controller for `BudgetsHorizonModule`.
 *
 * All routes live under the `/v1/_test/budgets-horizon/` prefix.
 * Mounted conditionally by `BudgetsHorizonModule` (only when `testControllersEnabled()`).
 *
 * @see testControllersEnabled (../protocol/test-routes-gate)
 */
@Controller()
export class BudgetsHorizonTestController {
  constructor(
    private readonly predicateEvaluator: HorizonPredicateEvaluatorService,
    private readonly surfacing: HorizonCardSurfacingService,
    private readonly budgetRecompute: BudgetRecomputeService,
    private readonly adoptionFaultInjector: AdoptionFaultInjector,
    private readonly adoption: AdoptionService,
    private readonly vocabTierAdvancement: VocabTierAdvancementService,
    private readonly isostaticDebt: IsostaticDebtService,
    private readonly bus: CityEventBus,
  ) {}

  // ── C1 ──────────────────────────────────────────────────────────────────────────────────────

  /** C1 connectivity probe: returns { ok: true } if BudgetsHorizonModule is in the DI graph. */
  @Get('_test/budgets-horizon/ping')
  ping(): { ok: true } {
    return { ok: true };
  }

  /**
   * GET /v1/_test/budgets-horizon/read-tunables
   *
   * Returns every `meta.*` getter P3-G C1 added to the shared `metaProgressionTunables` object (design
   * §15's ~8 new keys), REAL resolved value, JSON-safe. See file header for the full contract.
   */
  @Get('_test/budgets-horizon/read-tunables')
  readTunables(): Record<string, unknown> {
    return {
      baseCostUnscriptedTask: metaProgressionTunables.baseCostUnscriptedTask,
      residualCostDelegatedTask: metaProgressionTunables.residualCostDelegatedTask,
      horizonFeedCapacity: metaProgressionTunables.horizonFeedCapacity,
      visiblePredicatesShown: metaProgressionTunables.visiblePredicatesShown,
      structuralDebtRatioPerUpgrade: metaProgressionTunables.structuralDebtRatioPerUpgrade,
      activeDebtReductionPerDecision: metaProgressionTunables.activeDebtReductionPerDecision,
      passiveDecayRate: metaProgressionTunables.passiveDecayRate,
      debtVisibilityThreshold: metaProgressionTunables.debtVisibilityThreshold,
    };
  }

  // ── C2 ──────────────────────────────────────────────────────────────────────────────────────

  /**
   * GET /v1/_test/budgets-horizon/evaluate?playerId=
   *
   * Calls `HorizonPredicateEvaluatorService.evaluateForPlayer` DIRECTLY — see file header for the full
   * contract. Response `{ results: CapabilityEvaluationResult[] }`.
   */
  @Get('_test/budgets-horizon/evaluate')
  async evaluate(@Query('playerId') playerId: string): Promise<{ results: CapabilityEvaluationResult[] }> {
    const results = await this.predicateEvaluator.evaluateForPlayer(playerId);
    return { results };
  }

  /**
   * POST /v1/_test/budgets-horizon/validate-catalogue
   *
   * Body { catalogue?: CapabilityCatalogueEntry[] }. Runs the REAL
   * `validateCapabilityCatalogueStrictMode` — see file header for the full contract. Response
   * `{ valid: boolean; error?: string }`.
   */
  @Post('_test/budgets-horizon/validate-catalogue')
  @HttpCode(HttpStatus.OK)
  validateCatalogue(@Body() body: { catalogue?: CapabilityCatalogueEntry[] }): { valid: boolean; error?: string } {
    const catalogue = body.catalogue ?? CAPABILITY_CATALOGUE;
    try {
      validateCapabilityCatalogueStrictMode(catalogue);
      return { valid: true };
    } catch (err) {
      return { valid: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  // ── C3 ──────────────────────────────────────────────────────────────────────────────────────

  /**
   * GET /v1/_test/budgets-horizon/surfaced-events
   *
   * Every `CapabilityHorizonSurfacedEvent` fired this process — see file header for the full contract.
   * Response `{ events: CapabilityHorizonSurfacedEvent[] }`.
   */
  @Get('_test/budgets-horizon/surfaced-events')
  surfacedEvents(): { events: readonly CapabilityHorizonSurfacedEvent[] } {
    return { events: this.surfacing.getSurfacedEvents() };
  }

  /**
   * POST /v1/_test/budgets-horizon/surfaced-events/clear
   *
   * Clears the in-memory `CapabilityHorizonSurfacedEvent` probe. Response `{ cleared: true }`.
   */
  @Post('_test/budgets-horizon/surfaced-events/clear')
  @HttpCode(HttpStatus.OK)
  clearSurfacedEvents(): { cleared: true } {
    this.surfacing.clearSurfacedEvents();
    return { cleared: true };
  }

  // ── C4 ──────────────────────────────────────────────────────────────────────────────────────

  /**
   * GET /v1/_test/budgets-horizon/pending-opportunities?playerId=
   *
   * Calls `BudgetRecomputeService.getPendingOpportunities` DIRECTLY — see file header for the full
   * contract. Response `{ opportunities: PendingOpportunity[] }`.
   */
  @Get('_test/budgets-horizon/pending-opportunities')
  async pendingOpportunities(@Query('playerId') playerId: string): Promise<{ opportunities: PendingOpportunity[] }> {
    const opportunities = await this.budgetRecompute.getPendingOpportunities(playerId);
    return { opportunities };
  }

  /**
   * POST /v1/_test/budgets-horizon/replay-graduation-committed
   *
   * Body: the EXACT `GraduationCommittedEvent` payload (minus `type`) — `{playerId, categoryId,
   * lieutenantId, masteryAtEvent, successorCategoryId, gameMinute}`. Re-emits the SAME event
   * `GraduationService.executeGraduation` emits on a real graduation — see file header for the full
   * contract. Response `{ emitted: true }`.
   */
  @Post('_test/budgets-horizon/replay-graduation-committed')
  @HttpCode(HttpStatus.OK)
  replayGraduationCommitted(
    @Body()
    body: {
      playerId: string;
      categoryId: number;
      lieutenantId: string;
      masteryAtEvent: number;
      successorCategoryId: number | null;
      gameMinute: number;
    },
  ): { emitted: true } {
    this.bus.emitGraduationCommitted({ type: 'graduation_committed', ...body });
    return { emitted: true };
  }

  /**
   * POST /v1/_test/budgets-horizon/replay-recall-initiated
   *
   * Body: the EXACT `RecallInitiatedEvent` payload (minus `type`) — `{playerId, categoryId, lieutenantId,
   * fallbackQualityBucket, gameMinute}`. Re-emits the SAME event `PromotionLockService.requestRecall`
   * emits on a real recall — see file header for the full contract. Response `{ emitted: true }`.
   */
  @Post('_test/budgets-horizon/replay-recall-initiated')
  @HttpCode(HttpStatus.OK)
  replayRecallInitiated(
    @Body()
    body: {
      playerId: string;
      categoryId: number;
      lieutenantId: string;
      fallbackQualityBucket: 'LOW' | 'DEGRADED' | 'MINIMAL';
      gameMinute: number;
    },
  ): { emitted: true } {
    this.bus.emitRecallInitiated({ type: 'recall_initiated', ...body });
    return { emitted: true };
  }

  /**
   * POST /v1/_test/budgets-horizon/emit-capability-adopted
   *
   * Body: the EXACT `CapabilityAdoptedEvent` payload (minus `type`) — `{playerId, capabilityId, cardId,
   * freeUnitsAtAdoption, gameMinute}`. Emits the event NO production code fires yet (C5's own job) — see
   * file header for the full contract (proves the C4-dormant subscription reacts). Response
   * `{ emitted: true }`.
   */
  @Post('_test/budgets-horizon/emit-capability-adopted')
  @HttpCode(HttpStatus.OK)
  emitCapabilityAdopted(
    @Body()
    body: {
      playerId: string;
      capabilityId: number;
      cardId: string;
      freeUnitsAtAdoption: number;
      gameMinute: number;
    },
  ): { emitted: true } {
    this.bus.emitCapabilityAdopted({ type: 'capability_adopted', ...body });
    return { emitted: true };
  }

  // ── C5 ──────────────────────────────────────────────────────────────────────────────────────

  /**
   * POST /v1/_test/budgets-horizon/arm-adoption-corruption
   *
   * Body { playerId }. Calls `AdoptionFaultInjector.arm` DIRECTLY — see that class's own header for the
   * full contract. Response `{ armed: true }`.
   */
  @Post('_test/budgets-horizon/arm-adoption-corruption')
  @HttpCode(HttpStatus.OK)
  armAdoptionCorruption(@Body() body: { playerId: string }): { armed: true } {
    this.adoptionFaultInjector.arm(body.playerId);
    return { armed: true };
  }

  /**
   * GET /v1/_test/budgets-horizon/adopted-events
   *
   * Every `CapabilityAdoptedEvent` fired this process — see file header for the full contract. Response
   * `{ events: CapabilityAdoptedEvent[] }`.
   */
  @Get('_test/budgets-horizon/adopted-events')
  adoptedEvents(): { events: readonly CapabilityAdoptedEvent[] } {
    return { events: this.adoption.getAdoptedEvents() };
  }

  /**
   * POST /v1/_test/budgets-horizon/adopted-events/clear
   *
   * Clears the in-memory `CapabilityAdoptedEvent` probe. Response `{ cleared: true }`.
   */
  @Post('_test/budgets-horizon/adopted-events/clear')
  @HttpCode(HttpStatus.OK)
  clearAdoptedEvents(): { cleared: true } {
    this.adoption.clearAdoptedEvents();
    return { cleared: true };
  }

  // ── C6 ──────────────────────────────────────────────────────────────────────────────────────

  /**
   * GET /v1/_test/budgets-horizon/vocab-tier-advanced-events
   *
   * Every `VocabTierAdvancedEvent` fired this process — see file header for the full contract. Response
   * `{ events: VocabTierAdvancedEvent[] }`.
   */
  @Get('_test/budgets-horizon/vocab-tier-advanced-events')
  vocabTierAdvancedEvents(): { events: readonly VocabTierAdvancedEvent[] } {
    return { events: this.vocabTierAdvancement.getAdvancedEvents() };
  }

  /**
   * POST /v1/_test/budgets-horizon/vocab-tier-advanced-events/clear
   *
   * Clears the in-memory `VocabTierAdvancedEvent` probe. Response `{ cleared: true }`.
   */
  @Post('_test/budgets-horizon/vocab-tier-advanced-events/clear')
  @HttpCode(HttpStatus.OK)
  clearVocabTierAdvancedEvents(): { cleared: true } {
    this.vocabTierAdvancement.clearAdvancedEvents();
    return { cleared: true };
  }

  // ── C7 ──────────────────────────────────────────────────────────────────────────────────────

  /**
   * GET /v1/_test/budgets-horizon/debt-cleared-events
   *
   * Every `CapabilityDebtClearedEvent` fired this process — see file header for the full contract.
   * Response `{ events: CapabilityDebtClearedEvent[] }`.
   */
  @Get('_test/budgets-horizon/debt-cleared-events')
  debtClearedEvents(): { events: readonly CapabilityDebtClearedEvent[] } {
    return { events: this.isostaticDebt.getClearedEvents() };
  }

  /**
   * POST /v1/_test/budgets-horizon/debt-cleared-events/clear
   *
   * Clears the in-memory `CapabilityDebtClearedEvent` probe. Response `{ cleared: true }`.
   */
  @Post('_test/budgets-horizon/debt-cleared-events/clear')
  @HttpCode(HttpStatus.OK)
  clearDebtClearedEvents(): { cleared: true } {
    this.isostaticDebt.clearClearedEvents();
    return { cleared: true };
  }

  /**
   * POST /v1/_test/budgets-horizon/emit-script-attached
   *
   * Body: the EXACT `ScriptAttachedEvent` payload (minus `type`) — `{playerId, lieutenantId, buildingId,
   * gameMinute}`. Hand-emits onto the REAL `CityEventBus` — see file header for the full contract (the
   * concurrency falsifiable's own genuinely-concurrent-hand-emit surface). Response `{ emitted: true }`.
   */
  @Post('_test/budgets-horizon/emit-script-attached')
  @HttpCode(HttpStatus.OK)
  emitScriptAttached(
    @Body()
    body: {
      playerId: string;
      lieutenantId: string;
      buildingId: string | null;
      gameMinute: number;
    },
  ): { emitted: true } {
    this.bus.emitScriptAttached({ type: 'script_attached', ...body });
    return { emitted: true };
  }

  // ── C8 ──────────────────────────────────────────────────────────────────────────────────────

  /**
   * POST /v1/_test/budgets-horizon/run-isostatic-debt-tick
   *
   * Body { playerId, gameMinute }. Calls `IsostaticDebtService.applyPassiveDecay` DIRECTLY — see file
   * header for the full contract (the P3-F C8 `run-promotion-lock-tick` precedent, `{closed: [...]}`
   * wrapped-array response shape mirrored here as `{decayed: [...]}`).
   */
  @Post('_test/budgets-horizon/run-isostatic-debt-tick')
  @HttpCode(HttpStatus.OK)
  async runIsostaticDebtTick(@Body() body: { playerId: string; gameMinute: number }): Promise<{ decayed: readonly ActiveDecayRow[] }> {
    const decayed = await this.isostaticDebt.applyPassiveDecay(body.playerId, body.gameMinute);
    return { decayed };
  }
}
