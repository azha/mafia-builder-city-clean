// IMPLEMENTS: docs/superpowers/plans/2026-07-13-p3-D-cue-annealing-plan.md §C4 (`CueCascadeException
//             Producer` — source tag `CUE_CASCADE`, dedup 1-pending/slot_id, ONE_TIME+ESCALATE, cap-refuse
//             inherited, D3 zero `src/exceptions/` edits) + the §6.3 recovery match/auto-ack machinery.
//             Design: docs/superpowers/specs/2026-07-13-p3-D-cue-annealing-design.md §6.2 ("Mini-Exceptions
//             next-session: CueCascadeExceptionProducer émet UNE carte par slot failed (dedup 1-pending par
//             slot_id)") + §6.3 ("Un slot (type, target) matchant une carte cascade PENDING du joueur est un
//             slot de RÉCUPÉRATION ... La carte cascade est marquée résolue ... via le resolve REUSE") + §12
//             (producer table: trigger `failed_collision`/`failed_disrupted`, dedup 1-pending/slot_id,
//             actions ONE_TIME+ESCALATE, source tag local `CUE_CASCADE`).
//             Decisions: §1.3 D3 (producer = NEW caller of the EXISTING spine `insert`, zero `src/
//             exceptions/` edit, zero EffectType widening) + §1.5 D5 (recovery realized TEMPORALLY, §6.3
//             ruling #9(a)) + divergence #12 (recovery-ack automatic — the auto-ack tied to the REAL
//             recovery action is more honest than a card that lingers forever).
//             Pattern: `core_loops/supply_chain/mycelial-stress-exception-producer.service.ts` /
//             `backpressure-exception-producer.service.ts` (the "NEW caller of the EXISTING, unmodified
//             `ExceptionsRepository.insert`, zero `src/exceptions/` edits, source tag locally defined, its
//             OWN dedup query REPLICATING `hasPendingForBuilding`'s `jsonb_array_elements` EXISTS idiom
//             rather than adding a sibling method to that file (D3)" shape) — the raise/dedup/insert half.
//             The recovery-match + auto-ack half has NO prior sibling in this codebase (P3-D introduces the
//             concept) — its own `findRecoveryMatch`/`autoAck` methods are new, but `autoAck` REUSES the
//             EXACT same `ExceptionsService.resolve('ONE_TIME', ...)` verb `ExceptionBatchResolutionExecutor`
//             (C3) already calls — one production resolve path, two callers.
//             — P3-D C4 — 2026-07-14

import { Inject, Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { exceptionQueueRow } from '../../db/schema/queues_exceptions_cuestack';
import { ExceptionsRepository } from '../../exceptions/exceptions.repository';
import { ExceptionsService } from '../../exceptions/exceptions.service';
import type { CandidateActionView } from '../../exceptions/exceptions.projection.service';
import { METHOD_BY_ACTION_ID } from '../../exceptions/method-by-action-id';
import type { CueStackSlot, TargetRef } from './slot-type-executor.interface';

/** The jsonb `source` tag this producer's candidate actions carry (mirrors `MYCELIAL_PERSISTENT_STRESS_
 *  SOURCE`/`BACKPRESSURE_CRITICAL_SOURCE`) — a BO-diagnostic marker, never rendered to the player. */
export const CUE_CASCADE_SOURCE = 'CUE_CASCADE';

/** The ONE_TIME candidate's `id` — the auto-ack target (`findRecoveryMatch`/`autoAck` below always resolve
 *  THIS action, never `escalate` — an escalation is a player decision, mirrors divergence #9's own
 *  "an escalation is never automatable" reasoning for `EXCEPTION_BATCH_RESOLUTION`). */
const ACKNOWLEDGE_RECOVER_ACTION_ID = 'acknowledge_recover';

/** A cascade card's own candidate action — `CandidateActionView` + the source tag + the (`slot_id`,
 *  `slot_type`, flattened `target_ref`) triple THIS producer's own dedup (`hasPendingForSlot`, keyed on
 *  `slot_id`) and recovery-match (`findRecoveryMatch`, keyed on `slot_type`+`target_ref`) queries read back
 *  — the SAME structural freedom `hasPendingForBuilding`'s `target_building_id` jsonb-element inspection
 *  already relies on (D3: locally typed HERE, never added to the shared `exceptions.projection.service.ts`
 *  interface). `target_ref` is FLATTENED (`target_ref_kind`/`target_ref_id`, not a nested object) — a
 *  plain jsonb string-equality scan is simpler and cheaper than a nested-path comparison, and every OTHER
 *  field this card carries is already a flat string. */
interface CueCascadeCandidateActionView extends CandidateActionView {
  readonly source: typeof CUE_CASCADE_SOURCE;
  readonly slot_id: string;
  readonly slot_type: string;
  readonly target_ref_kind: string;
  readonly target_ref_id: string;
}

function buildCascadeActions(slotId: string, slotType: string, targetRef: TargetRef): CueCascadeCandidateActionView[] {
  const common = { slot_id: slotId, slot_type: slotType, target_ref_kind: targetRef.kind, target_ref_id: targetRef.id };
  return [
    {
      id: ACKNOWLEDGE_RECOVER_ACTION_ID,
      label: 'Acknowledge the setback',
      // TD-453 — `en` in string_table.ts is a BYTE-IDENTICAL copy of the `label` literal above.
      label_i18n: { key: 'exception.cue_cascade.acknowledge_recover.label', params: {} },
      projected_consequence:
        'You note the slot could not fire as planned. Committing a matching slot again will recover it, at a time penalty.',
      projected_consequence_i18n: { key: 'exception.cue_cascade.acknowledge_recover.consequence', params: {} },
      add_rule_dsl: null,
      effect: { type: 'ONE_TIME' },
      method: METHOD_BY_ACTION_ID[ACKNOWLEDGE_RECOVER_ACTION_ID], // Lot 0 §1 D4 (C2) — the 22nd id, see method-by-action-id.ts's Deviation.
      source: CUE_CASCADE_SOURCE,
      ...common,
    },
    {
      id: 'escalate',
      label: 'Escalate for review',
      label_i18n: { key: 'exception.cue_cascade.escalate.label', params: {} }, // TD-453.
      projected_consequence: 'The card is archived for later review.',
      projected_consequence_i18n: { key: 'exception.cue_cascade.escalate.consequence', params: {} },
      add_rule_dsl: null,
      effect: { type: 'ESCALATE' },
      method: METHOD_BY_ACTION_ID.escalate, // Lot 0 §1 D4 (C2).
      source: CUE_CASCADE_SOURCE,
      ...common,
    },
  ];
}

export type CueCascadeExceptionOutcome = 'raised' | 'deduped' | 'cap_refused';

/** Defensive dual-shape read for a raw `db.execute` result (the `exceptions.repository.ts#hasPendingFor
 *  Building` idiom, copied verbatim — no shared extraction across repositories/producers, this codebase's
 *  own convention). */
function rowsOf(result: unknown): Array<Record<string, unknown>> {
  return (result as { rows?: Array<Record<string, unknown>> }).rows ?? (result as Array<Record<string, unknown>>);
}

@Injectable()
export class CueCascadeExceptionProducer {
  private readonly logger = new Logger(CueCascadeExceptionProducer.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    // D3 wall: duplicate-provided instances (CueStackModule provides these directly — see cue-stack.module.
    // ts's own header for why ExceptionsService can't simply import ExceptionsModule). Stateless (DB-only /
    // narrowed-registry ctor) — a second instance is harmless, the SAME precedent every OTHER core_loops
    // producer/executor in this module already follows.
    private readonly exceptions: ExceptionsRepository,
    private readonly exceptionsService: ExceptionsService,
  ) {}

  /** `hasPendingForSlot` — the per-slot dedup gate (design §6.2/§12: "dedup 1-pending par slot_id").
   *  Replicates `hasPendingForBuilding`'s `jsonb_array_elements` EXISTS shape (D3 — never edits that file,
   *  never adds a slot-scoped sibling to it) against THIS producer's own `slot_id` tag. */
  private async hasPendingForSlot(playerId: string, slotId: string): Promise<boolean> {
    const result = await this.db.execute(sql`
      SELECT 1 AS hit
      FROM ${exceptionQueueRow}, jsonb_array_elements(candidate_actions) AS elem
      WHERE player_id = ${playerId}::uuid
        AND resolution_status = 'pending'
        AND elem->>'slot_id' = ${slotId}
      LIMIT 1
    `);
    const rows = rowsOf(result);
    return Array.isArray(rows) && rows.length > 0;
  }

  /**
   * Raise the cascade card for ONE failed slot (§6.2 `failed_collision` / §7 `failed_disrupted`), or
   * report why not (dedup / cap-refuse — the SAME honest 3-outcome shape every OTHER core_loops producer
   * returns). Player-level card (`lieutenant_id: null` — a cue-stack slot belongs to no lieutenant).
   * Called BOTH by `CueStackExecutionTickService` (in-line, for `failed_collision` — DD-P3: a NEW `insert`
   * caller, never a `SlotFailedEvent` subscriber) and by `CueStackDisruptionService` (in-line, for
   * `failed_disrupted`) — the SAME dedup makes either caller idempotent against a repeat/concurrent call
   * for the SAME `slot_id` (I8's OWN "double tick/re-delivery → one cascade card" concurrency floor).
   */
  async raiseIfClear(playerId: string, slot: Pick<CueStackSlot, 'slot_id' | 'slot_type' | 'target_ref'>): Promise<CueCascadeExceptionOutcome> {
    if (await this.hasPendingForSlot(playerId, slot.slot_id)) {
      return 'deduped';
    }

    const actions = buildCascadeActions(slot.slot_id, slot.slot_type, slot.target_ref);
    const exceptionId = await this.exceptions.insert({
      player_id: playerId,
      lieutenant_id: null,
      event_descriptor: 'A cue-stack slot could not fire as planned — recommit a matching slot to recover it.',
      // TD-453 — event_descriptor's i18n-safe sibling (D2); `en` = byte-identical copy above.
      event_descriptor_i18n: { key: 'exception.cue_cascade.card.descriptor', params: {} },
      candidate_actions: actions,
      suggested_action: actions[0],
      // Fixed literals (not tunables) — mirrors every OTHER core_loops producer's own hardcoded-severity
      // convention (backpressure/mycelial-stress 0.9/80/80, heat-pressure 0.9/70/70). A cue-stack cascade
      // is a self-inflicted planning miss, not a citywide emergency — scored a notch below those.
      confidence: 0.9,
      severity: 60,
      priority: 60,
      resolution_status: 'pending',
    });

    if (!exceptionId) {
      // D5 cap-guard refusal — handled honestly (never thrown, never retried), the SAME defense-in-depth
      // posture every sibling producer documents for its own structurally-unreachable case.
      this.logger.warn(
        `raiseIfClear: cap-refused (D5) for player=${playerId} slot=${slot.slot_id} — no card inserted, no event emitted.`,
      );
      return 'cap_refused';
    }
    return 'raised';
  }

  /**
   * §6.3 recovery match — a PENDING cascade card whose OWN (`slot_type`, `target_ref`) tag matches this NEW
   * slot's (a DIFFERENT `slot_id`, committed in a LATER stack — I1 requires the failed stack to have
   * resolved first) marks it a RECOVERY slot. Returns the matched card's id + its `acknowledge_recover`
   * action id (the auto-ack target), or `null` (no match — a plain, non-recovery firing). Read-only; called
   * by `CueStackExecutionTickService` on EVERY tick for the current slot (no caching — this file's own
   * plain-recompute idiom, mirrors `durationMinutesFor`'s sibling call site).
   */
  async findRecoveryMatch(
    playerId: string,
    slotType: string,
    targetRef: Pick<TargetRef, 'kind' | 'id'>,
  ): Promise<{ exceptionId: string; chosenActionId: string } | null> {
    const result = await this.db.execute(sql`
      SELECT exception_id
      FROM ${exceptionQueueRow}, jsonb_array_elements(candidate_actions) AS elem
      WHERE player_id = ${playerId}::uuid
        AND resolution_status = 'pending'
        AND elem->>'id' = ${ACKNOWLEDGE_RECOVER_ACTION_ID}
        AND elem->>'slot_type' = ${slotType}
        AND elem->>'target_ref_kind' = ${targetRef.kind}
        AND elem->>'target_ref_id' = ${targetRef.id}
      LIMIT 1
    `);
    const rows = rowsOf(result);
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return { exceptionId: String(rows[0].exception_id), chosenActionId: ACKNOWLEDGE_RECOVER_ACTION_ID };
  }

  /**
   * Auto-ack the matched cascade card (design §6.3: "marquée résolue ... quand le slot de récupération
   * fire") — the REAL `ExceptionsService.resolve('ONE_TIME', ...)` verb (D3, the SAME resolve
   * `ExceptionBatchResolutionExecutor` calls), never a bespoke resolution write. Called ONLY when the
   * recovery slot's OWN firing actually SUCCEEDS (`status='done'`) — a recovery slot that itself throws
   * (`failed_executor`) or collides (`failed_collision`) has NOT genuinely recovered anything, so the
   * original cascade card is left pending (divergence #12's own "tied to the REAL action" reasoning).
   */
  async autoAck(playerId: string, exceptionId: string, chosenActionId: string): Promise<void> {
    await this.exceptionsService.resolve(playerId, exceptionId, 'ONE_TIME', chosenActionId);
  }
}
