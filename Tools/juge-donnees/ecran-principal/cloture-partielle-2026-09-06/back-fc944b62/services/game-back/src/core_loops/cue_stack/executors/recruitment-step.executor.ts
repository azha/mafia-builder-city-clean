// IMPLEMENTS: docs/superpowers/plans/2026-07-13-p3-D-cue-annealing-plan.md §C3 ("4 LIVE executors —
//             each wrapping its REAL verb")
//             Design: docs/superpowers/specs/2026-07-13-p3-D-cue-annealing-design.md §5.1 table row 3 —
//             `RECRUITMENT_STEP` → `RecruitmentQuestService.startQuest` (`recruitment-quest.service.ts:111`,
//             "démarre la quest du candidat ciblé").
//             — P3-D C3 — 2026-07-14
//
// `RecruitmentStepExecutor` — the `RECRUITMENT_STEP` `SlotTypeExecutor`. `validateTarget` DELEGATES to
// `CueStackRepository.availableCandidateExistsForPlayer` (the SAME method compose already calls). `execute`
// needs the candidate's OWN `pool` (`startQuest(playerId, candidateId, questType)` requires `questType`
// to MATCH `candidate.pool` — `RecruitmentQuestService.startQuest`'s own guard, `recruitment-quest.
// service.ts:118-121`) — `CueStackRepository.getCandidatePoolForPlayer` (NEW, this chunk) reads it
// ownership-scoped. `pool` is read WITHOUT a `status='available'` pre-check (unlike `validateTarget`'s
// own compose-time check) — `startQuest` ALREADY re-validates `status !== 'available'` itself (409
// `RESOURCE_STATE_CONFLICT` if the candidate was picked up by another path between compose and firing) —
// re-checking here would just duplicate that guard, never tighten it. Any throw (candidate no longer
// available, roster full, etc.) propagates UNCAUGHT — the tick's own catch marks `failed_executor` (D4).

import { Injectable } from '@nestjs/common';

import { RecruitmentQuestService } from '../../../operational/recruitment/recruitment-quest.service';
import { CueStackRepository } from '../cue-stack.repository';
import type { CueStackSlot, SlotExecutionContext, SlotOutcome, SlotTypeExecutor, TargetRef } from '../slot-type-executor.interface';

@Injectable()
export class RecruitmentStepExecutor implements SlotTypeExecutor {
  readonly slotType = 'RECRUITMENT_STEP' as const;

  constructor(
    private readonly quest: RecruitmentQuestService,
    private readonly cueStackRepo: CueStackRepository,
  ) {}

  async validateTarget(playerId: string, targetRef: TargetRef): Promise<boolean> {
    return this.cueStackRepo.availableCandidateExistsForPlayer(playerId, targetRef.id);
  }

  async execute(playerId: string, slot: CueStackSlot, _ctx: SlotExecutionContext): Promise<SlotOutcome> {
    const pool = await this.cueStackRepo.getCandidatePoolForPlayer(playerId, slot.target_ref.id);
    if (!pool) {
      throw new Error(
        `RECRUITMENT_STEP executor: candidate ${slot.target_ref.id} no longer resolves for player ${playerId} ` +
          '(deleted since compose) — genuine firing-time failure.',
      );
    }
    // THE VERB — RecruitmentQuestService.startQuest (design §5.1 table row 3, recruitment-quest.service.ts:111).
    const projection = await this.quest.startQuest(playerId, slot.target_ref.id, pool);
    return {
      status: 'quest_started',
      detail: { questId: projection.quest_id, questType: pool },
    };
  }
}
