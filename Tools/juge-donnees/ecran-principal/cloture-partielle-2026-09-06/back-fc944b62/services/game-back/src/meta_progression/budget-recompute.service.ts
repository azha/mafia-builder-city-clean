// IMPLEMENTS: docs/superpowers/plans/2026-07-19-p3-G-budgets-horizon-plan.md C4 ("The shared pure
//             `computeUsed`... recompute subscribers on `GraduationCommittedEvent` + `RecallInitiatedEvent`
//             (the `CapabilityAdoptedEvent` subscription lands with C5's event — wired here, dormant until
//             C5); ONE-statement recompute UPDATE (D1); `GET /v1/meta/complexity-budget`... the C3
//             `affordable` field wired REAL; pending-opportunities projection (design §10.3).").
//             Design: docs/superpowers/specs/2026-07-19-p3-G-budgets-horizon-design.md §10 (Complexity
//             budget, D1/D2) + §4 (event topology — recompute subscribes ALL THREE events) + §13
//             (`GET /v1/meta/complexity-budget` contract).
//             Pattern (bus subscribe + per-listener isolation, public core method for Lesson #3 test
//             parity, zero live-vs-test divergence): `horizon-card-surfacing.service.ts`
//             (`onApplicationBootstrap` + `bus.onXxx((e) => this.handle(e).catch(...))`) /
//             `recall-debt-session-subscriber.service.ts`.
//             — P3-G C4 — 2026-07-20
//
// `BudgetRecomputeService` — the D1/D2 Complexity Budget runtime:
//   - `recompute(playerId)`: the event-driven WRITE path. `ensureRow` first (Phase-17 precedent, design
//     §10.1), then ONE single-statement UPDATE of `complexity_budget_used` via `ComplexityBudgetRepository.
//     setUsed` — recompute-from-truth, idempotent, convergent under ANY event interleaving (no subscriber
//     ordering dependency — D13's own falsifiable). Subscribes `GraduationCommittedEvent` +
//     `RecallInitiatedEvent` NOW; `CapabilityAdoptedEvent` subscribes TOO (wired here, dormant until C5
//     emits it for real).
//   - `getProjection(playerId)`: the READ path for `GET /v1/meta/complexity-budget` (design §10.2) —
//     `{cap, free_units, delegation_hints}`. `used` is recomputed FRESH on every call (never trusts the
//     possibly-stale column — design §10.1's own "the projection recomputes-on-read for display freshness
//     ... one shared `computeUsed`, divergence-proof by construction"): this is what makes a TRULY fresh
//     player (zero events ever fired) correctly show `used=40`/`free=60` rather than the column's stale
//     schema-default `used=0`/`free=100`.
//   - `getPendingOpportunities(playerId)`: design §10.3's derived, no-store projection — LIVE capabilities
//     with a surfaced non-terminal card AND `free_units < required`. No dedicated public HTTP contract
//     exists in design §13 (Unity/BO consume it later, ★#5 backend-complete-Unity-deferred precedent) — a
//     test-only probe route exposes it this chunk (mirrors C2's `evaluate` route's own "no HTTP contract
//     exists yet" posture).

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import {
  CityEventBus,
  type GraduationCommittedEvent,
  type RecallInitiatedEvent,
  type CapabilityAdoptedEvent,
} from '../citysim/events/city-event-bus';
import { ProgressionRepository } from '../progression/progression.repository';
import { MasteryScoreRepository } from './mastery-score.repository';
import { ComplexityBudgetRepository } from './complexity-budget.repository';
import { computeUsed, computeDelegationHints, type DelegationHint, type BudgetCostContext } from './budget-cost';
import { PossibilityHorizonCardsRepository, isNonTerminal } from './possibility-horizon-cards.repository';
import { CAPABILITY_CATALOGUE, type CapabilityKey } from './capability-catalogue';

/** `GET /v1/meta/complexity-budget` response (design §10.2 — the ONE closed contract, no per-category
 *  breakdown client-side, P5). */
export interface ComplexityBudgetProjection {
  readonly cap: number;
  readonly free_units: number;
  readonly delegation_hints: readonly DelegationHint[];
}

/** One design §10.3 pending-opportunity row — a LIVE capability already surfaced (a non-terminal card
 *  exists) but not yet affordable. */
export interface PendingOpportunity {
  readonly capability_key: CapabilityKey;
  readonly required: number;
  readonly free_units: number;
  readonly shortfall: number;
}

@Injectable()
export class BudgetRecomputeService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BudgetRecomputeService.name);

  constructor(
    private readonly bus: CityEventBus,
    private readonly progressionRepo: ProgressionRepository,
    private readonly masteryScoreRepo: MasteryScoreRepository,
    private readonly budgetRepo: ComplexityBudgetRepository,
    private readonly cardsRepo: PossibilityHorizonCardsRepository,
  ) {}

  onApplicationBootstrap(): void {
    this.bus.onGraduationCommitted((event: GraduationCommittedEvent) => {
      this.recompute(event.playerId).catch((err) =>
        this.logger.error(`graduation_committed budget-recompute handler failed (contained): ${errMsg(err)}`),
      );
    });
    this.bus.onRecallInitiated((event: RecallInitiatedEvent) => {
      this.recompute(event.playerId).catch((err) =>
        this.logger.error(`recall_initiated budget-recompute handler failed (contained): ${errMsg(err)}`),
      );
    });
    // ★ Dormant this chunk (see file header + city-event-bus.ts's own doc comment): no production emitter
    // exists yet — the subscription is real and wired NOW so C5's adoption verb needs zero BudgetsHorizon
    // Module edit when it lands (D13's own "all three events, one subscriber" topology, complete at C4).
    this.bus.onCapabilityAdopted((event: CapabilityAdoptedEvent) => {
      this.recompute(event.playerId).catch((err) =>
        this.logger.error(`capability_adopted budget-recompute handler failed (contained): ${errMsg(err)}`),
      );
    });
  }

  private costContext(): BudgetCostContext {
    return { masteryScoreRepo: this.masteryScoreRepo };
  }

  /**
   * The event-driven recompute (design §10.1). `ensureRow` first (Phase-17 precedent) so the single-
   * statement UPDATE below always matches a real row, then `computeUsed` + ONE UPDATE. Public so the E2E
   * floor's replay/idempotency falsifiables can drive it directly too (Lesson #3 shape) — though every
   * REAL falsifiable exercises the bus subscription end-to-end via the REAL graduation/recall endpoints.
   */
  async recompute(playerId: string): Promise<{ used: number }> {
    await this.progressionRepo.ensureRow(playerId);
    const used = await computeUsed(this.costContext(), playerId);
    await this.budgetRepo.setUsed(playerId, used);
    this.logger.log(`BUDGET_RECOMPUTE: player=${playerId} used=${used}`);
    return { used };
  }

  /**
   * `GET /v1/meta/complexity-budget` (design §10.2). `used` is recomputed FRESH (never read from the
   * column — see file header); `cap` reads the column directly (D1 — "the column IS the cap").
   */
  async getProjection(playerId: string): Promise<ComplexityBudgetProjection> {
    const ctx = this.costContext();
    const [cap, used, delegationHints] = await Promise.all([
      this.budgetRepo.getCap(playerId),
      computeUsed(ctx, playerId),
      computeDelegationHints(ctx, playerId),
    ]);
    return { cap, free_units: cap - used, delegation_hints: delegationHints };
  }

  /**
   * Design §10.3 — derived, no store: every LIVE capability with a surfaced NON-TERMINAL card (unseen/
   * seen/deferred — a terminal adopted/dismissed card is not "pending") AND `free_units < freeUnitsRequired`.
   */
  async getPendingOpportunities(playerId: string): Promise<PendingOpportunity[]> {
    const ctx = this.costContext();
    const [cap, used, cards] = await Promise.all([
      this.budgetRepo.getCap(playerId),
      computeUsed(ctx, playerId),
      this.cardsRepo.listAllForPlayer(playerId),
    ]);
    const freeUnits = cap - used;
    const nonTerminalCapabilities = new Set(cards.filter((c) => isNonTerminal(c.view_status)).map((c) => c.capability_id));

    const opportunities: PendingOpportunity[] = [];
    for (const entry of CAPABILITY_CATALOGUE) {
      if (!entry.live || !nonTerminalCapabilities.has(entry.code)) continue;
      const required = entry.freeUnitsRequired!; // LIVE rows always carry a non-null cost (D3 boot strict-check).
      if (freeUnits < required) {
        opportunities.push({ capability_key: entry.key, required, free_units: freeUnits, shortfall: required - freeUnits });
      }
    }
    return opportunities;
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
