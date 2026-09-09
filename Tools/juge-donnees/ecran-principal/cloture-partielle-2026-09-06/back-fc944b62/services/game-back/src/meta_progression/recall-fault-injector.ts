// IMPLEMENTS: docs/superpowers/plans/2026-07-18-p3-F-delegation-ratchet-plan.md C8 concurrency
//             ("Governor TOCTOU: P3-A proof REUSE at the new site — induced mutateFn failure -> cap
//             compensated, ZERO lock/event/audit rows").
//             Pattern: `graduation-lieutenant-fault-injector.ts` (`GraduationLieutenantFaultInjector`) —
//             copied verbatim per that file's OWN precedent chain (`progression/loop10/hl-card-fault-
//             injector.ts` / `core_loops/cue_stack/cue-stack-executor-fault-injector.ts`), TEST-ONLY,
//             in-memory, one-shot fault injection, keyed by playerId.
//             — P3-F C8 — 2026-07-19
//
// `RecallFaultInjector` — TEST-ONLY, in-memory, one-shot fault injection for the C8
// `PromotionLockService.requestRecall` flow. `requestRecall` consumes this IMMEDIATELY AFTER the recall's
// OWN winner gate (`flipToSelfForRecall`) has already won the race (mirrors the C5 fault-injector's own
// "post-validate, genuinely-would-have-succeeded" contract, transposed to post-flip since recall's winner
// gate — unlike graduation's — comes BEFORE the corrupted-id substitution point, decisions §4 #27) —
// armed + consumed -> substitutes a freshly-minted, unowned UUID for every subsequent step's lieutenant id
// (the ownership lookup, the accord counterparty, the tenure reset, the recorded rows' `lieutenant_id`).
// This makes `LieutenantRepository.getOwnedLieutenant`'s OWN ownership check return `null` naturally — a
// REAL failure mode, never a fabricated throw — proving the governor's compensation AND
// `PromotionLockService`'s own `revertToDelegatedForRecall` compensation both fire correctly for a failure
// deep inside the mutateFn (post-flip), without ever touching/stubbing the REAL lieutenant-repository code.
//
// The ONLY way to ARM it is the test-only route `POST /v1/_test/meta-progression/arm-recall-corruption`
// (`delegation-ratchet-test.controller.ts`, itself `testControllersEnabled()`-gated) — no production code
// path ever calls `arm`.

import { Injectable } from '@nestjs/common';

@Injectable()
export class RecallFaultInjector {
  private readonly armed = new Set<string>();

  /** TEST-ONLY: arm this player's NEXT `requestRecall` call to have its post-flip lieutenant id corrupted
   *  (substituted with an unowned UUID) before the ownership-lookup/accord/tenure-reset/record steps run. */
  arm(playerId: string): void {
    this.armed.add(playerId);
  }

  /** Consumed by `PromotionLockService.requestRecall` right after the winner gate — `true` (and clears the
   *  arm) iff this player was armed; `false` (no-op) otherwise — the common, unarmed case. */
  consumeIfArmed(playerId: string): boolean {
    if (this.armed.has(playerId)) {
      this.armed.delete(playerId);
      return true;
    }
    return false;
  }
}
