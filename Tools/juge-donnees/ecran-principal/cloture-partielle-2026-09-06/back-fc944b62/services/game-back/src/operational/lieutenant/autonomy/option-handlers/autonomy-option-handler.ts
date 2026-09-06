// IMPLEMENTS: docs/superpowers/specs/2026-06-10-phase-19-autonomy-ceiling-backend-design.md §3.5/§3.6
//             (the per-EffectKind option-handler contract + registry — the player's A/B resolve dispatches the picked
//             option's `effect_kind` to a registered handler that runs the SAME operational action the delegated
//             EXECUTE_DEFAULT binding would have taken) -- Phase-19 L1a Task 6 --
//
// MIRRORS exceptions/effects/exception-effect.ts + exception-effect-registry.service.ts EXACTLY (the open/closed effect
// registry): an `AutonomyOptionHandler` owns ONE EffectKind; `apply(ctx)` performs the side-effect (the operational
// service call its matching binding makes) and returns a short qualitative outcome string (never a raw scalar). The
// registry is a Map<EffectKind, handler> built ONCE at construction; a duplicate kind throws at boot (a loud
// misconfiguration); `require` 422s an unknown kind (the "unknown option" guard, generalized).

import { ApiError } from '../../../../protocol/api-error';
import type { EffectKind } from '../option-pairs';

/** The per-resolution context the registry hands a handler — the delegated lieutenant's resolved row (the SAME state the
 *  binding's applyExecuteDefault reads): the owning player, the lieutenant, and its assigned/target buildings. A handler
 *  reads exactly the fields its archetype needs (COOK/REPAIR/DEPOSIT/COLLECT → assigned; LOGISTICS/LAUNDERING →
 *  assigned + target; DEFER/HOLD/LET_RIDE → none). A null building is guarded defensively → a NOOP, never a crash. */
export interface AutonomyResolveContext {
  playerId: string;
  lieutenantId: string;
  assignedBuildingId: string | null;
  targetBuildingId: string | null;
}

/** A resolution option effect. apply() performs the operational side-effect (the SAME service+method+params the matching
 *  archetype binding's applyExecuteDefault calls — including the benign-409 catch) and returns the qualitative outcome
 *  enum for the HTTP response (e.g. 'COOK_STARTED' | 'DEPOSITED' | 'DEFERRED' — never a raw scalar). 'NOOP' on a guard /
 *  benign path (a null building, an empty source, a benign 409). */
export interface AutonomyOptionHandler {
  readonly effectKind: EffectKind;
  apply(ctx: AutonomyResolveContext): Promise<string>;
}

/** effectKind → its handler (built ONCE at construction; immutable). A duplicate effectKind throws at boot (a loud
 *  misconfiguration). `require` 422s an unknown kind (the unknown-option guard). MIRRORS ExceptionEffectRegistry. */
export class AutonomyOptionRegistry {
  private readonly byKind = new Map<EffectKind, AutonomyOptionHandler>();

  constructor(handlers: AutonomyOptionHandler[]) {
    for (const h of handlers) {
      if (this.byKind.has(h.effectKind)) {
        throw new Error(
          `AutonomyOptionRegistry: duplicate handler for option '${h.effectKind}' — register each exactly once in ` +
            'the lieutenant.module.ts useFactory handler list.',
        );
      }
      this.byKind.set(h.effectKind, h);
    }
  }

  /** Resolve the handler for an option's effect_kind, or throw 422 (the unknown-option guard). */
  require(kind: EffectKind): AutonomyOptionHandler {
    const handler = this.byKind.get(kind);
    if (!handler) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `unknown option '${String(kind)}' (expected ${this.supported().join(' | ')}).`,
      });
    }
    return handler;
  }

  /** The registered option kinds (deterministic insertion order). */
  supported(): EffectKind[] {
    return [...this.byKind.keys()];
  }
}
