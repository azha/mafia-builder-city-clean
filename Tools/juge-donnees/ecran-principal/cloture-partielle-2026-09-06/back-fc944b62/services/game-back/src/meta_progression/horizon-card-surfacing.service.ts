// IMPLEMENTS: docs/superpowers/plans/2026-07-19-p3-G-budgets-horizon-plan.md C3 ("the `SessionOpenedEvent`
//             subscriber (P3-F D11 subscription shape) running the C2 evaluator → INSERT-if-absent
//             surfacing (capacity check `meta.horizon_feed_capacity` over `unseen|seen|deferred`;
//             `surfaced_predicate_snapshot` filled with the per-clause verdicts; `CapabilityHorizonSurfaced
//             Event` post-commit) + regression marking BOTH directions (`predicate_regressed` — D6/§7.3)").
//             Design: docs/superpowers/specs/2026-07-19-p3-G-budgets-horizon-design.md §7.3 (the eval-flow
//             algorithm, verbatim) + §4 (event topology) + D5 (per-session cadence, no queue — "a satisfied
//             capability past capacity re-surfaces at the NEXT session open once a slot frees").
//             Concurrence (plan §0.4/C3 "Concurrence"): double session-open racing (P3-A idempotent open
//             can still double-fire this subscriber — `session.service.ts#open` emits `SessionOpenedEvent`
//             UNCONDITIONALLY on BOTH the winner AND loser path of `SessionRepository.openFresh`'s own
//             `gameplay_sessions_active_unique_idx` race, `won` is never checked before the emit) → single
//             card, no 5xx — the R10 unique index (`insertIfAbsent`, `ON CONFLICT DO NOTHING`) is the
//             race-freedom proof, not a lock/guard in THIS service.
//             Pattern (SessionOpenedEvent subscriber, `OnApplicationBootstrap` + a PUBLIC method the bus
//             handler AND the E2E floor's REAL session-open calls both exercise, Lesson #3 — zero live-vs-
//             test divergence): `degraded-category-pressure-producer.service.ts`. Pattern (in-memory event-
//             capture test probe, push-at-emit-site): `mastery-accumulator.service.ts#thresholdCrossedEvents`.
//             — P3-G C3 — 2026-07-20
//
// `HorizonCardSurfacingService` — on a REAL `SessionOpenedEvent`, runs the C2
// `HorizonPredicateEvaluatorService.evaluateForPlayer` (pure, no writes) and turns its per-capability
// verdicts into TWO effects, per design §7.3:
//   (a) SURFACING — a LIVE capability with NO existing card row (any status) whose predicates are
//       ALL-TRUE, while the feed still has a free slot (`meta.horizon_feed_capacity` over the
//       unseen|seen|deferred count) → an INSERT-if-absent card (`unseen`, `surfaced_predicate_snapshot`
//       = the evaluated clause verdicts) + a post-commit `CapabilityHorizonSurfacedEvent`. Past capacity:
//       NO queue (D5) — the capability is simply re-attempted at the NEXT session open.
//   (b) REGRESSION MARKING — every EXISTING non-terminal card (unseen/seen/deferred — a terminal
//       adopted/dismissed card is never touched) gets `predicate_regressed` set/cleared to match the
//       FRESH evaluation, both directions (design D6: "a regressed card whose predicates return true
//       clears the flag").
// ONE evaluator call + ONE `listAllForPlayer` read cover BOTH effects in a single pass (catalogue order,
// deterministic — D13, no rng, no clock read beyond the SessionOpenedEvent's own `gameMinute`).

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CityEventBus, type SessionOpenedEvent, type CapabilityHorizonSurfacedEvent } from '../citysim/events/city-event-bus';
import { metaProgressionTunables } from './meta-progression-tunables';
import { HorizonPredicateEvaluatorService, type PredicateClauseVerdict } from './horizon-predicate-evaluator.service';
import { PossibilityHorizonCardsRepository, isNonTerminal, type PredicateSnapshot } from './possibility-horizon-cards.repository';

/** One capability's per-session outcome — the falsifiable floor's own observation surface (mirrors
 *  `DegradedCategoryPressureItemResult`'s own honest-outcome shape). */
export type HorizonSurfacingOutcome = 'surfaced' | 'already_surfaced' | 'not_satisfied' | 'capacity_full' | 'race_lost';

export interface HorizonSurfacingItemResult {
  readonly capabilityId: number;
  readonly outcome: HorizonSurfacingOutcome;
  readonly cardId?: string;
}

function buildSnapshot(clauses: readonly PredicateClauseVerdict[]): PredicateSnapshot {
  const snapshot: Record<string, { threshold: number; satisfied: boolean }> = {};
  for (const clause of clauses) {
    snapshot[clause.type] = { threshold: clause.threshold, satisfied: clause.satisfied };
  }
  return snapshot;
}

@Injectable()
export class HorizonCardSurfacingService implements OnApplicationBootstrap {
  private readonly logger = new Logger(HorizonCardSurfacingService.name);

  // In-memory probe: every `CapabilityHorizonSurfacedEvent` fired this process (test-only — mirrors
  // `MasteryAccumulatorService.thresholdCrossedEvents`'s own "no real consumer yet, this is the ONLY way
  // the floor can observe the event without a raw bus tap" posture). Never mutated outside `emitSurfaced`.
  private surfacedEvents: CapabilityHorizonSurfacedEvent[] = [];

  constructor(
    private readonly bus: CityEventBus,
    private readonly evaluator: HorizonPredicateEvaluatorService,
    private readonly cardsRepo: PossibilityHorizonCardsRepository,
  ) {}

  // ────────────────────────────────── test-probe accessors (TEST-ONLY) ──────────────────────────

  /** Every `CapabilityHorizonSurfacedEvent` fired this process (test-probe — never used in production paths). */
  getSurfacedEvents(): readonly CapabilityHorizonSurfacedEvent[] {
    return this.surfacedEvents;
  }

  /** Clear the in-memory surfaced-event probe (called by the test reset route). */
  clearSurfacedEvents(): void {
    this.surfacedEvents = [];
  }

  // ── bus wiring ───────────────────────────────────────────────────────────────────────────────────

  onApplicationBootstrap(): void {
    this.bus.onSessionOpened((event: SessionOpenedEvent) => {
      this.processSessionOpened(event.playerId, event.sessionId, event.gameMinute).catch((err) =>
        this.logger.error(`session_opened horizon-card-surfacing handler failed (contained): ${errMsg(err)}`),
      );
    });
  }

  /**
   * `processSessionOpened(playerId, sessionId, gameMinute)` — the SAME method BOTH the real
   * `SessionOpenedEvent` subscription AND (indirectly, via the real `POST /v1/session/open` endpoint the
   * E2E floor drives) every falsifiable exercise (Lesson #3 — zero live-vs-test divergence: there is no
   * test-only shortcut here, every C3 falsifiable routes through the REAL session-open HTTP call).
   * `sessionId` is accepted for signature symmetry with the sibling P3-F subscribers and future logging
   * use — the surfacing/regression logic itself is player-scoped only (mirrors
   * `DegradedCategoryPressureProducer.processSessionOpened`'s own unused-sessionId posture).
   */
  async processSessionOpened(playerId: string, sessionId: string, gameMinute: number): Promise<HorizonSurfacingItemResult[]> {
    const [evalResults, existingCards] = await Promise.all([
      this.evaluator.evaluateForPlayer(playerId),
      this.cardsRepo.listAllForPlayer(playerId),
    ]);
    const existingByCapability = new Map(existingCards.map((c) => [c.capability_id, c]));
    let nonTerminalCount = existingCards.filter((c) => isNonTerminal(c.view_status)).length;
    const capacity = metaProgressionTunables.horizonFeedCapacity;

    const results: HorizonSurfacingItemResult[] = [];

    // Catalogue order (deterministic — `evaluateForPlayer` iterates `CAPABILITY_CATALOGUE`'s LIVE rows
    // in declaration order, D13's own "no rng, no ordering dependency" discipline).
    for (const result of evalResults) {
      const existing = existingByCapability.get(result.capabilityCode);

      if (existing) {
        // (b) REGRESSION MARKING — non-terminal cards only (design §7.3: "For each EXISTING non-terminal
        // card"); a terminal adopted/dismissed card is never re-evaluated for this flag.
        if (isNonTerminal(existing.view_status)) {
          const shouldRegress = !result.allSatisfied;
          if (existing.predicate_regressed !== shouldRegress) {
            await this.cardsRepo.setPredicateRegressed(existing.card_id, shouldRegress);
          }
        }
        results.push({ capabilityId: result.capabilityCode, outcome: 'already_surfaced' });
        continue;
      }

      // (a) SURFACING — no card row yet AND not adopted (the same condition — an adoption always implies
      // a pre-existing card row, design §9's own winner-gate shape; "no existing row" already subsumes
      // "not adopted").
      if (!result.allSatisfied) {
        results.push({ capabilityId: result.capabilityCode, outcome: 'not_satisfied' });
        continue;
      }
      if (nonTerminalCount >= capacity) {
        // D5 no-queue: never buffered — this EXACT capability is re-attempted (re-evaluated, re-checked
        // against capacity) at the NEXT session open, nothing is remembered/queued here.
        results.push({ capabilityId: result.capabilityCode, outcome: 'capacity_full' });
        continue;
      }

      const snapshot = buildSnapshot(result.clauses);
      const inserted = await this.cardsRepo.insertIfAbsent(playerId, result.capabilityCode, snapshot);
      if (!inserted) {
        // A concurrent racer (the double-session-open hazard, file header) won the SAME (player,
        // capability) pair between our read and this insert — the R10 unique index's own race-freedom
        // guarantee (design §7.3/plan §0.4). No error, no event, no duplicate.
        results.push({ capabilityId: result.capabilityCode, outcome: 'race_lost' });
        continue;
      }
      nonTerminalCount += 1; // this session-open's own insert consumed a slot — honored within the SAME pass.

      const surfacedEvent: CapabilityHorizonSurfacedEvent = {
        type: 'capability_horizon_surfaced',
        playerId,
        capabilityId: result.capabilityCode,
        cardId: inserted.card_id,
        gameMinute,
      };
      this.bus.emitCapabilityHorizonSurfaced(surfacedEvent);
      this.surfacedEvents.push(surfacedEvent);
      this.logger.log(
        `CAPABILITY_HORIZON_SURFACED: player=${playerId} session=${sessionId} capability=${result.capabilityCode} card=${inserted.card_id}`,
      );
      results.push({ capabilityId: result.capabilityCode, outcome: 'surfaced', cardId: inserted.card_id });
    }

    return results;
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
