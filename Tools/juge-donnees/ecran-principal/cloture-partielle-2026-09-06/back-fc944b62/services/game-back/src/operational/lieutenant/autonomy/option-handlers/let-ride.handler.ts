// IMPLEMENTS: docs/superpowers/specs/2026-06-10-phase-19-autonomy-ceiling-backend-design.md §3.5/§3.6 (LET_RIDE — the
//             DISTRIBUTION archetype's conservative option B: LET the float RIDE — take NO collect this resolution, a
//             pure no-op the player picks to let the dealer float keep growing) -- Phase-19 L1a Task 6 --
//
// LET_RIDE — a PURE no-op (no operational side-effect): the player explicitly chose to NOT collect now. Recording the
// decision is the service's job; the handler acknowledges the choice. Returns the DISTINCT outcome 'LEFT_TO_RIDE' (the
// DISTRIBUTION let-the-float-ride variant — kept distinct from DEFER's 'DEFERRED' and HOLD's 'HELD' so the resolve outcome
// is self-describing). No DB read, no service call, no RNG — deterministic.

import { Injectable } from '@nestjs/common';

import type { AutonomyOptionHandler, AutonomyResolveContext } from './autonomy-option-handler';

@Injectable()
export class LetRideHandler implements AutonomyOptionHandler {
  readonly effectKind = 'LET_RIDE' as const;

  async apply(_ctx: AutonomyResolveContext): Promise<string> {
    return 'LEFT_TO_RIDE';
  }
}
