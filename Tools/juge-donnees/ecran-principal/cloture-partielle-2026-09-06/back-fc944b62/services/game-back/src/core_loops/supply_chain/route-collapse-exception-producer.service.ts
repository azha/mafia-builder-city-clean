// IMPLEMENTS: docs/superpowers/plans/2026-07-12-p3-C-supply-chain-plan.md §C7 (`RouteCollapseException
//             Producer` — the collapse transition's own producer, dedup 1-pending/route, EXISTING
//             EffectTypes, existing producer convention — RULING B: reached from the OR-extended
//             `evaluateAndMaybeSever`, not from a NEW invariant of its own)
//             Design: docs/superpowers/specs/2026-07-12-p3-C-supply-chain-design.md §7.3 ("le RETURNING
//             garantit l'émission exactly-once de l'Exception « Route X collapsed. Downstream offline. »
//             (RouteCollapseExceptionProducer, §9) même sous évaluateurs concurrents") + §9 (3 producers
//             table — trigger/dedup/actions) + D3 (zero `src/exceptions/` edits) + I6 (design §15).
//             Decisions: §1.3 D3 (3 producers = NEW callers of the EXISTING `insert`, zero EffectType) +
//             §1.10 D10 (sever/collapse transition by conditional UPDATE RETURNING — the Exception is
//             emitted DANS le chemin qui a gagné le RETURNING).
//             Pattern: `mycelial-stress-exception-producer.service.ts` (the SAME "replicate `hasPending
//             ForBuilding`'s jsonb EXISTS shape tagging a NON-building id, never touch `exceptions.
//             repository.ts` itself" shape — a route is not a building either) + `backpressure-exception-
//             producer.service.ts`'s own header (the SAME "fires every qualifying occurrence, dedup
//             collapses it" convention — here trivially satisfied since the CALLER only ever invokes
//             `raiseIfClear` from the WINNING side of `RouteLifecycleRepository.severIfNotAlready`'s own
//             `UPDATE ... WHERE state != 'severed' RETURNING` — I6's exactly-once guarantee is already
//             enforced by that atomic DB transition BEFORE this producer is ever called; the dedup here
//             is a defense-in-depth SECOND layer, not the primary exactly-once mechanism).
//             — P3-C C7 — 2026-07-13

import { Inject, Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { exceptionQueueRow } from '../../db/schema/queues_exceptions_cuestack';
import { ExceptionsRepository } from '../../exceptions/exceptions.repository';
import type { CandidateActionView } from '../../exceptions/exceptions.projection.service';
import { METHOD_BY_ACTION_ID } from '../../exceptions/method-by-action-id';

/** The jsonb `source` tag this producer's candidate actions carry (mirrors `FLAG_TOKEN_EXHAUSTION_SOURCE`
 *  / `MYCELIAL_PERSISTENT_STRESS_SOURCE`) — a BO-diagnostic marker, never rendered to the player. */
export const ROUTE_COLLAPSE_SOURCE = 'ROUTE_COLLAPSE';

/** A collapse card's own candidate action — `CandidateActionView` + the source tag + the `route_id` this
 *  producer's OWN dedup scan below queries back. Locally typed HERE (not added to the shared
 *  `exceptions.projection.service.ts` interface) — zero touch to that file (D3). */
interface TaggedCandidateActionView extends CandidateActionView {
  readonly source: typeof ROUTE_COLLAPSE_SOURCE;
  readonly route_id: string;
}

function buildCollapseActions(routeId: string): TaggedCandidateActionView[] {
  return [
    {
      id: 'acknowledge',
      label: 'Acknowledge the collapse',
      label_i18n: { key: 'exception.route_collapse.acknowledge.label', params: {} }, // TD-455
      projected_consequence: 'Route X collapsed. Downstream offline. No automatic action is taken.',
      projected_consequence_i18n: { key: 'exception.route_collapse.acknowledge.projected_consequence', params: {} }, // TD-455
      add_rule_dsl: null,
      effect: { type: 'ONE_TIME' },
      method: METHOD_BY_ACTION_ID.acknowledge, // Lot 0 §1 D4 (C2).
      source: ROUTE_COLLAPSE_SOURCE,
      route_id: routeId,
    },
    {
      id: 'escalate',
      label: 'Escalate for review',
      label_i18n: { key: 'exception.route_collapse.escalate.label', params: {} }, // TD-455
      projected_consequence: 'The card is archived for later review.',
      projected_consequence_i18n: { key: 'exception.route_collapse.escalate.projected_consequence', params: {} }, // TD-455
      add_rule_dsl: null,
      effect: { type: 'ESCALATE' },
      method: METHOD_BY_ACTION_ID.escalate, // Lot 0 §1 D4 (C2).
      source: ROUTE_COLLAPSE_SOURCE,
      route_id: routeId,
    },
  ];
}

export type RouteCollapseExceptionOutcome = 'raised' | 'deduped' | 'cap_refused';

@Injectable()
export class RouteCollapseExceptionProducer {
  private readonly logger = new Logger(RouteCollapseExceptionProducer.name);

  constructor(
    // D3 wall: a duplicate-provided instance (SupplyChainModule provides this class directly — the SAME
    // cycle-avoidance reasoning the sibling C4/C6 producers document). Stateless (DB-only ctor) — a
    // second instance is harmless.
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly exceptions: ExceptionsRepository,
  ) {}

  /**
   * `hasPendingForRoute` — the per-route dedup gate (design §9: dedup "1-pending par route").
   * Replicates `hasPendingForBuilding`'s `jsonb_array_elements` EXISTS shape
   * (exceptions.repository.ts:~241) against THIS producer's own `route_id` tag — never edits that file,
   * never adds a route-scoped sibling to it (D3).
   */
  private async hasPendingForRoute(playerId: string, routeId: string): Promise<boolean> {
    const result = await this.db.execute(sql`
      SELECT 1 AS hit
      FROM ${exceptionQueueRow}, jsonb_array_elements(candidate_actions) AS elem
      WHERE player_id = ${playerId}::uuid
        AND resolution_status = 'pending'
        AND elem->>'route_id' = ${routeId}
      LIMIT 1
    `);
    const rows = (result as unknown as { rows?: unknown[] }).rows ?? (result as unknown as unknown[]);
    return Array.isArray(rows) && rows.length > 0;
  }

  /**
   * Raise the "Route X collapsed. Downstream offline." card for ONE route whose collapse transition
   * JUST won the I6 `UPDATE ... WHERE state != 'severed' RETURNING` race (design §7.3/D10 — the CALLER,
   * `RouteService.evaluateAndMaybeSever`, only invokes this from the winning side of that atomic
   * transition; a losing concurrent evaluator never calls this at all, so I6's exactly-once guarantee is
   * primarily a DB-atomicity property, not a dedup-race property). `hasPendingForRoute` is a defense-in-
   * depth SECOND layer (e.g. a route that re-severs after a rebuild while an OLD collapse card is still
   * pending — design's own ruling-B "re-sever-fresh" risk, addressed at the `evaluateAndMaybeSever`/
   * rebuild call sites — must NOT double-card). Player-level card (`lieutenant_id: null` — a route
   * belongs to no lieutenant, mirrors the sibling C4/C6 framing).
   */
  async raiseIfClear(playerId: string, routeId: string): Promise<RouteCollapseExceptionOutcome> {
    if (await this.hasPendingForRoute(playerId, routeId)) {
      return 'deduped';
    }

    const actions = buildCollapseActions(routeId);
    const exceptionId = await this.exceptions.insert({
      player_id: playerId,
      lieutenant_id: null,
      // Canon-verbatim qualitative descriptor (design §7.3) — no raw sinuosity_index/corridor_debt
      // scalar (R2.2); the route identity travels in the jsonb `route_id` tag above, BO-diagnostic only.
      event_descriptor: 'Route X collapsed. Downstream offline.',
      candidate_actions: actions,
      suggested_action: actions[0],
      // Fixed literals (not tunables) — mirrors every OTHER exception producer's own hardcoded-severity
      // convention (heat-pressure 0.9/70/70, equipment-failure 0.9/85/85, flag-exhaustion 0.9/80/80,
      // backpressure-critical/mycelial-persistent-stress 0.9/80/80). A collapse is deterministically
      // "genuinely a concern" by construction (downstream throughput is now zero, K4).
      confidence: 0.9,
      severity: 80,
      priority: 80,
      resolution_status: 'pending',
    });

    if (!exceptionId) {
      // D5 cap-guard refusal — handled honestly (never thrown, never retried), the SAME defense-in-depth
      // posture every sibling producer documents for its own structurally-unreachable case.
      this.logger.warn(
        `raiseIfClear: cap-refused (D5) for player=${playerId} route=${routeId} — no card inserted, no event emitted.`,
      );
      return 'cap_refused';
    }
    return 'raised';
  }
}
