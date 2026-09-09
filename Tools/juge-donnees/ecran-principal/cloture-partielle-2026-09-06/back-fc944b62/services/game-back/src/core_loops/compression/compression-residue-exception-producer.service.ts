// IMPLEMENTS: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md §C7
//             (`CompressionResidueExceptionProducer` — "critical → carte spine, dedup")
//             Design: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §10.4.2
//             ("Toute entry atteignant critical émet une VRAIE carte spine … source tag
//             COMPRESSION_RESIDUE, dedup 1-pending/problem_key, ONE_TIME+ESCALATE") + §12 (2 producers
//             NEW, zéro édition `src/exceptions/`).
//             Decisions: D3 (ZÉRO édition `src/exceptions/`, 4e reconduction) ; R10 (producer dedup
//             convention).
//             Pattern: `FrictionThresholdExceptionProducer` (the SAME "NEW caller of the EXISTING,
//             unmodified `ExceptionsRepository.insert`" shape) — dedup scope WIDENED here from
//             player-level to PER-`problem_key` (mirrors `cue-cascade-exception-producer.service.ts#
//             hasPendingForSlot`'s own per-entity `jsonb_array_elements` EXISTS idiom, since a player can
//             carry MULTIPLE distinct critical-residue problems concurrently, unlike the single aggregate
//             friction-penalty state).
//             — P3-E C7 — 2026-07-18
//
// `CompressionResidueExceptionProducer` — DELIBERATELY self-contained (`@Inject(DB)` + duplicate-provided
// `ExceptionsRepository` ONLY — the SAME zero-module-dependency shape `CompressionFinalizeRepository`'s
// own header documents): duplicate-provided in BOTH `CompressionModule` and `DemolitionModule` (the
// latter's N/31 abandon-sweep ALSO finalizes, and must ALSO be able to raise this card — see
// `compression-finalize.service.ts`).

import { Inject, Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { exceptionQueueRow } from '../../db/schema/queues_exceptions_cuestack';
import { ExceptionsRepository } from '../../exceptions/exceptions.repository';
import type { CandidateActionView } from '../../exceptions/exceptions.projection.service';
import { METHOD_BY_ACTION_ID } from '../../exceptions/method-by-action-id';

/** The jsonb `source` tag (mirrors `FRICTION_THRESHOLD_SOURCE`/`CUE_CASCADE_SOURCE`) — BO-diagnostic
 *  only, never rendered to the player. */
export const COMPRESSION_RESIDUE_SOURCE = 'COMPRESSION_RESIDUE';

interface CompressionResidueCandidateActionView extends CandidateActionView {
  readonly source: typeof COMPRESSION_RESIDUE_SOURCE;
  /** The dedup key THIS card carries (design §10.4.2: "dedup 1-pending/problem_key") — a 2nd jsonb tag
   *  alongside `source`, mirrors `cue-cascade-exception-producer.service.ts`'s own per-slot `slot_id`
   *  tag sibling to its `source` tag. */
  readonly problem_key: string;
}

function buildActions(problemKey: string): CompressionResidueCandidateActionView[] {
  return [
    {
      id: 'acknowledge',
      label: 'Acknowledge the unresolved compression residue',
      label_i18n: { key: 'exception.compression_residue.acknowledge.label', params: {} }, // TD-455
      projected_consequence:
        'A triage problem persisted through a full Compression Week unresolved — it will keep re-presenting at future boards until you actually address it.',
      projected_consequence_i18n: { key: 'exception.compression_residue.acknowledge.projected_consequence', params: {} }, // TD-455
      add_rule_dsl: null,
      effect: { type: 'ONE_TIME' },
      method: METHOD_BY_ACTION_ID.acknowledge, // Lot 0 §1 D4 (C2).
      source: COMPRESSION_RESIDUE_SOURCE,
      problem_key: problemKey,
    },
    {
      id: 'escalate',
      label: 'Escalate for review',
      label_i18n: { key: 'exception.compression_residue.escalate.label', params: {} }, // TD-455
      projected_consequence: 'The card is archived for later review.',
      projected_consequence_i18n: { key: 'exception.compression_residue.escalate.projected_consequence', params: {} }, // TD-455
      add_rule_dsl: null,
      effect: { type: 'ESCALATE' },
      method: METHOD_BY_ACTION_ID.escalate, // Lot 0 §1 D4 (C2).
      source: COMPRESSION_RESIDUE_SOURCE,
      problem_key: problemKey,
    },
  ];
}

export type CompressionResidueOutcome = 'raised' | 'deduped' | 'cap_refused';

function rowsOf(result: unknown): Array<Record<string, unknown>> {
  return (result as { rows?: Array<Record<string, unknown>> }).rows ?? (result as Array<Record<string, unknown>>);
}

@Injectable()
export class CompressionResidueExceptionProducer {
  private readonly logger = new Logger(CompressionResidueExceptionProducer.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    // D3 wall: duplicate-provided instance (the SAME "stateless DB-only class, harmless second instance"
    // precedent every OTHER core_loops producer follows).
    private readonly exceptions: ExceptionsRepository,
  ) {}

  /** PER-`problem_key` dedup (design §10.4.2) — replicates `hasPendingForBuilding`'s `jsonb_array_
   *  elements` EXISTS shape, filtered on BOTH `source` AND this producer's OWN `problem_key` tag (unlike
   *  `FrictionThresholdExceptionProducer`'s player-wide scope: a player can carry several distinct
   *  critical-residue problems at once, each its OWN card). */
  private async hasPendingForProblemKey(playerId: string, problemKey: string): Promise<boolean> {
    const result = await this.db.execute(sql`
      SELECT 1 AS hit
      FROM ${exceptionQueueRow}, jsonb_array_elements(candidate_actions) AS elem
      WHERE player_id = ${playerId}::uuid
        AND resolution_status = 'pending'
        AND elem->>'source' = ${COMPRESSION_RESIDUE_SOURCE}
        AND elem->>'problem_key' = ${problemKey}
      LIMIT 1
    `);
    return rowsOf(result).length > 0;
  }

  /** Raise the residue card for ONE `problemKey`, or report why not (dedup/cap-refuse — the SAME honest
   *  3-outcome shape every OTHER producer returns). Called POST-commit by `CompressionFinalizeService`,
   *  once per `criticalResidueProblemKeys` entry `CompressionFinalizeRepository#finalizeIfEligible`
   *  returned. */
  async raiseIfClear(playerId: string, problemKey: string, eventDescriptor: string): Promise<CompressionResidueOutcome> {
    if (await this.hasPendingForProblemKey(playerId, problemKey)) {
      return 'deduped';
    }

    const actions = buildActions(problemKey);
    const exceptionId = await this.exceptions.insert({
      player_id: playerId,
      lieutenant_id: null,
      event_descriptor: eventDescriptor,
      candidate_actions: actions,
      suggested_action: actions[0],
      confidence: 0.9,
      severity: 85,
      priority: 85,
      resolution_status: 'pending',
    });

    if (!exceptionId) {
      this.logger.warn(`raiseIfClear: cap-refused for player=${playerId} problem_key=${problemKey} — no card inserted.`);
      return 'cap_refused';
    }
    return 'raised';
  }
}
