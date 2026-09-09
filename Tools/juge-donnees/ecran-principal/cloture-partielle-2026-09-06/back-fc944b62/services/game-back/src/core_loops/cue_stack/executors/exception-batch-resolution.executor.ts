// IMPLEMENTS: docs/superpowers/plans/2026-07-13-p3-D-cue-annealing-plan.md §C3 ("4 LIVE executors —
//             each wrapping its REAL verb")
//             Design: docs/superpowers/specs/2026-07-13-p3-D-cue-annealing-design.md §5.1 table row 4 —
//             `EXCEPTION_BATCH_RESOLUTION` → `ExceptionsService.resolve` (`exceptions.service.ts:170`,
//             "résout les cartes PENDING du batch ciblé via leur `suggested_action` UNIQUEMENT SI
//             ONE_TIME" — divergence #9's narrowing, decisions §4.9).
//             Wiring: `cue-stack.module.ts`'s own header — `ExceptionsService` is NOT exported by
//             `ExceptionsModule` (D3 forbids editing that file to add the export), so this module
//             duplicate-provides a NARROWED `ExceptionsService` instance (its own `ExceptionEffectRegistry`
//             holds ONLY `OneTimeHandler` — this executor's caller NEVER passes any other method).
//             — P3-D C3 — 2026-07-14
//
// `ExceptionBatchResolutionExecutor` — the `EXCEPTION_BATCH_RESOLUTION` `SlotTypeExecutor`. `validateTarget`
// DELEGATES to `CueStackRepository.buildingHasPendingExceptionBatch` (the SAME method compose already
// calls). `execute` lists the building's CURRENTLY pending, ONE_TIME-suggested cards
// (`CueStackRepository.listPendingOneTimeExceptionsForBuilding`, NEW this chunk — the divergence #9
// narrowing realized as a SQL predicate: `suggested_action->'effect'->>'type' = 'ONE_TIME'`; ESCALATE/
// ADD_RULE/structural-suggested cards are NEVER touched — "an escalation is a player decision, never
// automatable by a slot"), then calls `ExceptionsService.resolve(playerId, exceptionId, 'ONE_TIME',
// chosenActionId)` — the REAL production verb — for EACH matching card. A PER-CARD `ApiError` (e.g. a
// race resolved it between the list-read and this call) is caught and counted as `failedCount` — it does
// NOT abort the whole batch (the slot represents resolving a BATCH; one card's benign race-loss should
// not fail cards 2..N that succeed). A non-`ApiError` (unexpected) throw propagates UNCAUGHT — the tick's
// own catch marks the WHOLE slot `failed_executor` (D4). A building with ZERO matching cards by firing
// time (compose validated ≥1 pending card existed then; all since resolved/escalated by other means) is
// a legitimate `resolvedCount:0` outcome, NOT a failure.

import { Injectable } from '@nestjs/common';

import { ApiError } from '../../../protocol/api-error';
import { ExceptionsService } from '../../../exceptions/exceptions.service';
import { CueStackRepository } from '../cue-stack.repository';
import type { CueStackSlot, SlotExecutionContext, SlotOutcome, SlotTypeExecutor, TargetRef } from '../slot-type-executor.interface';

@Injectable()
export class ExceptionBatchResolutionExecutor implements SlotTypeExecutor {
  readonly slotType = 'EXCEPTION_BATCH_RESOLUTION' as const;

  constructor(
    private readonly exceptions: ExceptionsService,
    private readonly cueStackRepo: CueStackRepository,
  ) {}

  async validateTarget(playerId: string, targetRef: TargetRef): Promise<boolean> {
    return this.cueStackRepo.buildingHasPendingExceptionBatch(playerId, targetRef.id);
  }

  async execute(playerId: string, slot: CueStackSlot, _ctx: SlotExecutionContext): Promise<SlotOutcome> {
    const candidates = await this.cueStackRepo.listPendingOneTimeExceptionsForBuilding(playerId, slot.target_ref.id);

    let resolvedCount = 0;
    let failedCount = 0;
    for (const c of candidates) {
      try {
        // THE VERB — ExceptionsService.resolve (design §5.1 table row 4, exceptions.service.ts:170),
        // method PINNED to 'ONE_TIME' (divergence #9 — ESCALATE/structural cards never auto-resolved).
        await this.exceptions.resolve(playerId, c.exceptionId, 'ONE_TIME', c.chosenActionId);
        resolvedCount += 1;
      } catch (err) {
        if (err instanceof ApiError) {
          failedCount += 1;
          continue;
        }
        throw err;
      }
    }

    return {
      status: 'batch_resolved',
      detail: { resolvedCount, failedCount, totalCandidates: candidates.length },
    };
  }
}
