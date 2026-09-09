// IMPLEMENTS: docs/superpowers/plans/2026-07-18-p3-F-delegation-ratchet-plan.md C5 falsifiable
//             ("induced mid-tx failure (invalid lieutenant id passed post-validate via test hook — the
//             P3-A compensation proof shape) → zero rows written anywhere + cap slot compensated").
//             Pattern: `progression/loop10/hl-card-fault-injector.ts` (`HlCardFaultInjector`) +
//             `core_loops/cue_stack/cue-stack-executor-fault-injector.ts`
//             (`CueStackExecutorFaultInjector`) — TEST-ONLY, in-memory, one-shot fault injection,
//             copied verbatim (keyed by playerId, the SAME arm/consume shape both precedents use).
//             — P3-F C5 — 2026-07-19
//
// `GraduationLieutenantFaultInjector` — TEST-ONLY, in-memory, one-shot fault injection for the C5
// `GraduationService.executeGraduation` flow. `executeGraduation` consumes this IMMEDIATELY AFTER
// `validateGraduationEligible` has confirmed the REAL candidate lieutenant is owned + eligible (so the
// request genuinely WOULD have succeeded) but BEFORE the atomic `flipToDelegated` race gate — armed +
// consumed → substitutes a freshly-minted, unowned UUID for every subsequent step's `lieutenantId` (the
// attach call, the state flip's `delegated_to_lieutenant_id`, the `graduation_events` row). This makes
// `LieutenantService.attachScript`'s OWN `requireOwnedLieutenant` 404 fire naturally — a REAL failure
// mode, never a fabricated throw — proving the governor's compensation AND `GraduationService`'s own
// `revertToSelf` compensation both fire correctly for a failure that occurs deep inside the mutateFn
// (post-validate), without ever touching/stubbing the REAL attach/lieutenant-repository code.
//
// The ONLY way to ARM it is the test-only route `POST /v1/_test/meta-progression/arm-lieutenant-
// corruption` (`delegation-ratchet-test.controller.ts`, itself `testControllersEnabled()`-gated) — no
// production code path ever calls `arm`.

import { Injectable } from '@nestjs/common';

@Injectable()
export class GraduationLieutenantFaultInjector {
  private readonly armed = new Set<string>();

  /** TEST-ONLY: arm this player's NEXT `executeGraduation` call to have its post-validate lieutenant id
   *  corrupted (substituted with an unowned UUID) before the attach/commit steps run. */
  arm(playerId: string): void {
    this.armed.add(playerId);
  }

  /** Consumed by `GraduationService.executeGraduation` right after validate — `true` (and clears the
   *  arm) iff this player was armed; `false` (no-op) otherwise — the common, unarmed case. */
  consumeIfArmed(playerId: string): boolean {
    if (this.armed.has(playerId)) {
      this.armed.delete(playerId);
      return true;
    }
    return false;
  }
}
