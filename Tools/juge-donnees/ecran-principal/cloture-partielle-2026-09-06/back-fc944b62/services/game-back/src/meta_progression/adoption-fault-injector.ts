// IMPLEMENTS: docs/superpowers/plans/2026-07-19-p3-G-budgets-horizon-plan.md C5 falsifiable ("Induced
//             post-gate failure (fault-injector on the adoptions INSERT — the P3-F fault-injector
//             precedent shape) → card reverted to its prior status + zero adoption row + governor cap
//             slot compensated (the #27 net-zero proof)").
//             Pattern: `graduation-lieutenant-fault-injector.ts` (`GraduationLieutenantFaultInjector`) /
//             `recall-fault-injector.ts` (`RecallFaultInjector`) — TEST-ONLY, in-memory, one-shot fault
//             injection, copied verbatim per that file's own precedent chain (keyed by playerId, the
//             SAME arm/consume shape both use).
//             — P3-G C5 — 2026-07-20
//
// `AdoptionFaultInjector` — TEST-ONLY, in-memory, one-shot fault injection for the C5 `AdoptionService.
// executeAdoption` flow. `executeAdoption` consumes this IMMEDIATELY AFTER the card's OWN winner gate
// (`PossibilityHorizonCardsRepository.claimForAdoption`) has already won the race (mirrors the C5/C8
// precedents' own "post-winner-gate, genuinely-would-have-succeeded" contract) — armed + consumed →
// substitutes a freshly-minted, UNOWNED player id for JUST the subsequent `capability_adoptions`
// INSERT's `player_id` column (never for the card claim/revert, which stay on the REAL playerId — only
// the vulnerable downstream write is corrupted). `capability_adoptions.player_id` carries a REAL FK
// (`references player.player_id`, `db/schema/budgets_horizon.ts`) — the substituted UUID genuinely does
// not exist as a player, so the INSERT genuinely violates that constraint (a REAL Postgres foreign-key-
// violation failure, never a fabricated throw), proving the governor's compensation AND
// `AdoptionService`'s own `revertClaim` compensation both fire correctly for a failure that occurs deep
// inside the mutateFn (post-claim), without ever touching/stubbing the REAL insert code.
//
// The ONLY way to ARM it is the test-only route `POST /v1/_test/budgets-horizon/arm-adoption-corruption`
// (`budgets-horizon-test.controller.ts`, itself `testControllersEnabled()`-gated) — no production code
// path ever calls `arm`.

import { Injectable } from '@nestjs/common';

@Injectable()
export class AdoptionFaultInjector {
  private readonly armed = new Set<string>();

  /** TEST-ONLY: arm this player's NEXT `executeAdoption` call to have its post-claim `capability_
   *  adoptions` INSERT's `player_id` corrupted (substituted with an unowned UUID) — a genuine FK
   *  violation fires naturally, never a fabricated throw. */
  arm(playerId: string): void {
    this.armed.add(playerId);
  }

  /** Consumed by `AdoptionService.executeAdoption` right after the card's own winner gate wins — `true`
   *  (and clears the arm) iff this player was armed; `false` (no-op) otherwise — the common, unarmed
   *  case. */
  consumeIfArmed(playerId: string): boolean {
    if (this.armed.has(playerId)) {
      this.armed.delete(playerId);
      return true;
    }
    return false;
  }
}
