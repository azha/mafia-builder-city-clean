// IMPLEMENTS: docs/superpowers/specs/2026-06-10-phase-19-autonomy-ceiling-backend-design.md §3.5/§3.6 (DEFER — the
//             SECURITY archetype's conservative option B: take NO operational action this resolution — a pure no-op the
//             player picks to consciously hold off the auto-repair) -- Phase-19 L1a Task 6 --
//
// DEFER — a PURE no-op (no operational side-effect): the player explicitly chose to NOT repair now. Recording the decision
// (player_decision[issueId]='B' + resolve) is the service's job; the handler simply acknowledges the choice. Returns
// 'DEFERRED'. No DB read, no service call, no RNG — deterministic.

import { Injectable } from '@nestjs/common';

import type { AutonomyOptionHandler, AutonomyResolveContext } from './autonomy-option-handler';

@Injectable()
export class DeferHandler implements AutonomyOptionHandler {
  readonly effectKind = 'DEFER' as const;

  async apply(_ctx: AutonomyResolveContext): Promise<string> {
    return 'DEFERRED';
  }
}
