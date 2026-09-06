// IMPLEMENTS: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md §C2
//             (`FrictionThresholdExceptionProducer` — source tag `FRICTION_THRESHOLD`, dedup
//             1-pending/player, ONE_TIME — R10/D3)
//             Design: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §5.1
//             ("carte spine (producer NEW FrictionThresholdExceptionProducer, source tag
//             FRICTION_THRESHOLD, dedup 1-pending/player, ONE_TIME — canon demolition_mandate.md
//             §Cross-cutting « friction threshold cross emits Exception » ; pattern verbatim
//             cue-cascade-exception-producer.service.ts : zéro édition src/exceptions/, D3 P3-B/C/D
//             reconduite une 4e fois").")
//             + §12 (Intégration spine — 2 producers NEW, zéro édition `src/exceptions/`).
//             Decisions: D3 (ZÉRO édition `src/exceptions/`) ; R10 (producer dedup convention confirmed
//             `cue-cascade-exception-producer.service.ts:36-46` — source tag jsonb local, dedup,
//             ONE_TIME action id).
//             Pattern: `mycelial-stress-exception-producer.service.ts` (the "NEW caller of the EXISTING,
//             unmodified `ExceptionsRepository.insert`, zero `src/exceptions/` edits, source tag locally
//             defined" shape) — narrowed here to PLAYER-level dedup (no per-entity key: the friction
//             penalty is a single player-wide state, unlike a per-leg/per-slot card).
//             — P3-E C2 — 2026-07-17
//
// `FrictionThresholdExceptionProducer` — raises ONE player-level spine card when the friction budget
// crosses its threshold (design §5.1, canon `demolition_mandate.md §Cross-cutting`). Dedup is
// PLAYER-scoped (1-pending/player, not per-node/per-entity — the penalty itself is a single aggregate
// state, `friction_budget_state` is 1-1 per player): `hasPendingForSource` scans PENDING cards whose
// OWN candidate-action `source` tag is `FRICTION_THRESHOLD` for this player, replicating
// `hasPendingForBuilding`'s `jsonb_array_elements` EXISTS idiom (D3 — never edits that file, never adds a
// sibling method to it).

import { Inject, Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { exceptionQueueRow } from '../../db/schema/queues_exceptions_cuestack';
import { ExceptionsRepository } from '../../exceptions/exceptions.repository';
import type { CandidateActionView } from '../../exceptions/exceptions.projection.service';
import { METHOD_BY_ACTION_ID } from '../../exceptions/method-by-action-id';

/** The jsonb `source` tag this producer's candidate actions carry (mirrors `MYCELIAL_PERSISTENT_STRESS_
 *  SOURCE`/`CUE_CASCADE_SOURCE`) — a BO-diagnostic marker, never rendered to the player. */
export const FRICTION_THRESHOLD_SOURCE = 'FRICTION_THRESHOLD';

/** A friction-threshold card's own candidate action — `CandidateActionView` + the source tag (design
 *  §5.1/R10 — no further per-entity key: the dedup below is PLAYER-scoped, not keyed on a building/leg/
 *  slot id). Locally typed HERE (not added to the shared `exceptions.projection.service.ts` interface) —
 *  zero touch to that file (D3). */
interface FrictionThresholdCandidateActionView extends CandidateActionView {
  readonly source: typeof FRICTION_THRESHOLD_SOURCE;
}

function buildFrictionThresholdActions(): FrictionThresholdCandidateActionView[] {
  return [
    {
      id: 'acknowledge',
      label: 'Acknowledge the friction load',
      label_i18n: { key: 'exception.friction_threshold.acknowledge.label', params: {} }, // TD-455
      projected_consequence:
        'You note the organization is carrying more friction than it can absorb; outputs are running at reduced efficiency until you decommission a node or the load eases.',
      projected_consequence_i18n: { key: 'exception.friction_threshold.acknowledge.projected_consequence', params: {} }, // TD-455
      add_rule_dsl: null,
      effect: { type: 'ONE_TIME' },
      method: METHOD_BY_ACTION_ID.acknowledge, // Lot 0 §1 D4 (C2).
      source: FRICTION_THRESHOLD_SOURCE,
    },
    {
      id: 'escalate',
      label: 'Escalate for review',
      label_i18n: { key: 'exception.friction_threshold.escalate.label', params: {} }, // TD-455
      projected_consequence: 'The card is archived for later review.',
      projected_consequence_i18n: { key: 'exception.friction_threshold.escalate.projected_consequence', params: {} }, // TD-455
      add_rule_dsl: null,
      effect: { type: 'ESCALATE' },
      method: METHOD_BY_ACTION_ID.escalate, // Lot 0 §1 D4 (C2).
      source: FRICTION_THRESHOLD_SOURCE,
    },
  ];
}

export type FrictionThresholdExceptionOutcome = 'raised' | 'deduped' | 'cap_refused';

/** Defensive dual-shape read for a raw `db.execute` result (the `exceptions.repository.ts#hasPendingFor
 *  Building` idiom, copied verbatim — no shared extraction across repositories/producers). */
function rowsOf(result: unknown): Array<Record<string, unknown>> {
  return (result as { rows?: Array<Record<string, unknown>> }).rows ?? (result as Array<Record<string, unknown>>);
}

@Injectable()
export class FrictionThresholdExceptionProducer {
  private readonly logger = new Logger(FrictionThresholdExceptionProducer.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    // D3 wall: duplicate-provided instance (DemolitionModule provides this class directly — the SAME
    // "stateless DB-only class, harmless second instance" precedent every OTHER core_loops producer in
    // this codebase already follows, e.g. mycelial-stress/cue-cascade).
    private readonly exceptions: ExceptionsRepository,
  ) {}

  /** `hasPendingForSource` — the PLAYER-scoped dedup gate (design §5.1/R10: "dedup 1-pending/player").
   *  Replicates `hasPendingForBuilding`'s `jsonb_array_elements` EXISTS shape against THIS producer's own
   *  `source` tag — no per-entity key (unlike `hasPendingForSlot`/`hasPendingForLeg`, the friction penalty
   *  is a single aggregate state per player, not a per-entity one). Never edits `exceptions.repository.ts`,
   *  never adds a source-scoped sibling to it (D3). */
  private async hasPendingForSource(playerId: string): Promise<boolean> {
    const result = await this.db.execute(sql`
      SELECT 1 AS hit
      FROM ${exceptionQueueRow}, jsonb_array_elements(candidate_actions) AS elem
      WHERE player_id = ${playerId}::uuid
        AND resolution_status = 'pending'
        AND elem->>'source' = ${FRICTION_THRESHOLD_SOURCE}
      LIMIT 1
    `);
    const rows = rowsOf(result);
    return Array.isArray(rows) && rows.length > 0;
  }

  /**
   * Raise the friction-threshold card for this player (§5.1: fires when `efficiency_penalty_active`
   * transitions `false → true`), or report why not (dedup / cap-refuse — the SAME honest 3-outcome shape
   * every OTHER core_loops producer returns). Player-level card (`lieutenant_id: null` — friction is an
   * org-wide state, belongs to no lieutenant, mirrors `heat-pressure-exception-producer.service.ts`'s own
   * citywide framing). Called by `FrictionBudgetTickService.runTick` ONLY when
   * `FrictionBudgetRepository.applyOrRevertPenalty` itself just WON the I4 transition (the RETURNING gates
   * this call — a re-tick that finds the penalty ALREADY active never calls this method again, so the
   * `hasPendingForSource` dedup below is a SECOND, belt-and-suspenders layer against a genuinely
   * concurrent double-transition, not the primary exactly-once guarantee).
   */
  async raiseIfClear(playerId: string): Promise<FrictionThresholdExceptionOutcome> {
    if (await this.hasPendingForSource(playerId)) {
      return 'deduped';
    }

    const actions = buildFrictionThresholdActions();
    const exceptionId = await this.exceptions.insert({
      player_id: playerId,
      lieutenant_id: null,
      event_descriptor: 'Your organization’s friction load has crossed its threshold — outputs are running at reduced efficiency.',
      candidate_actions: actions,
      suggested_action: actions[0],
      // Fixed literals (not tunables) — mirrors every OTHER core_loops producer's own hardcoded-severity
      // convention (mycelial-stress/heat-pressure 0.9/80/70). A threshold cross is a genuine, deterministic
      // organizational-health signal — scored alongside the mycelial persistent-stress tier.
      confidence: 0.9,
      severity: 80,
      priority: 80,
      resolution_status: 'pending',
    });

    if (!exceptionId) {
      // D5 cap-guard refusal — handled honestly (never thrown, never retried), the SAME defense-in-depth
      // posture every sibling producer documents for its own structurally-unreachable case.
      this.logger.warn(`raiseIfClear: cap-refused (D5) for player=${playerId} — no card inserted, no event emitted.`);
      return 'cap_refused';
    }
    return 'raised';
  }
}
