// IMPLEMENTS: docs/superpowers/plans/2026-07-13-p3-D-cue-annealing-plan.md §C8 ("projections joueur
//             finales ... EstimatedTimeBucket") — this file is the SHARED per-type BASE duration lookup
//             §C3's tick and §C8's player projection BOTH need, extracted from `cue-stack-execution-tick.
//             service.ts`'s own private `durationMinutesFor` (landed C3) so the two call sites never carry
//             two independently-maintained copies of the SAME 4-branch switch (DRY — this codebase's own
//             "one source of truth per derivation" convention, e.g. `deriveSettlingBandBucket`/
//             `durationMinutesFor`'s sibling call site note in that file's own header).
//             Design: docs/superpowers/specs/2026-07-13-p3-D-cue-annealing-design.md §5.3 (durations, game-
//             minutes, tunable per type §14) + §15.1 (the player projection's OWN `EstimatedTimeBucket`
//             consumes THIS SAME base duration — never a re-derived/re-guessed number).
//             — P3-D C8 — 2026-07-15
//
// `durationMinutesFor` — the slot-type → tunable BASE duration map (C1's 4 NEW impl keys, no canon numeric
// magnitude). C3's tick folds in the §6.3 recovery ×`cueStackRecoveryCostMultiplier` at ITS OWN call site
// (never inside this pure function — this getter stays the plain, unmodified per-type base); C8's player
// projection (`cue-stack.service.ts#toView`) calls this SAME function to derive `EstimatedTimeBucket`
// (bucketed, never the raw minute — R2.2/P5, design §16).

import { coreLoopsTunables } from '../core-loops-tunables';
import type { LiveSlotType } from './slot-type.catalogue';

export function durationMinutesFor(slotType: LiveSlotType): number {
  switch (slotType) {
    case 'DISTRIBUTION_RUN':
      return coreLoopsTunables.cueStackSlotMinutesDistributionRun;
    case 'MAINTENANCE_BATCH':
      return coreLoopsTunables.cueStackSlotMinutesMaintenanceBatch;
    case 'RECRUITMENT_STEP':
      return coreLoopsTunables.cueStackSlotMinutesRecruitmentStep;
    case 'EXCEPTION_BATCH_RESOLUTION':
      return coreLoopsTunables.cueStackSlotMinutesExceptionBatch;
  }
}
