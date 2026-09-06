// IMPLEMENTS: docs/superpowers/specs/2026-06-10-phase-19-autonomy-ceiling-backend-design.md §3.5/§3.6 (HOLD — the
//             LOGISTICS archetype's conservative option B: HOLD the product at the source — take NO dispatch this
//             resolution, a pure no-op the player picks to keep the cargo put) -- Phase-19 L1a Task 6 --
//
// HOLD — a PURE no-op (no operational side-effect): the player explicitly chose to NOT dispatch now. Recording the
// decision is the service's job; the handler acknowledges the choice. Returns the DISTINCT outcome 'HELD' (the LOGISTICS
// hold-at-source variant — kept distinct from DEFER's 'DEFERRED' and LET_RIDE's 'LEFT_TO_RIDE' so the resolve outcome is
// self-describing). No DB read, no service call, no RNG — deterministic.

import { Injectable } from '@nestjs/common';

import type { AutonomyOptionHandler, AutonomyResolveContext } from './autonomy-option-handler';

@Injectable()
export class HoldHandler implements AutonomyOptionHandler {
  readonly effectKind = 'HOLD' as const;

  async apply(_ctx: AutonomyResolveContext): Promise<string> {
    return 'HELD';
  }
}
