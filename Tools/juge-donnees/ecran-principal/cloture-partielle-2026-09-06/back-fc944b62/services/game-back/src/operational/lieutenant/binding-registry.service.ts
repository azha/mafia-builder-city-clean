// IMPLEMENTS: docs/superpowers/specs/2026-06-08-phase-07-lieutenant-archetypes-design.md §Architecture (the DI registry
//             the tick + recruit dispatch through by role_archetype — Map<archetype, ArchetypeBinding>, built from the
//             binding services assembled by the lieutenant.module.ts useFactory provider) +
//             docs/tech/07_lieutenants_and_behavior/behavior_script_dsl.md §Implications par couche §NestJS — game-back
//             (the per-archetype binding is the ONLY archetype-specific code; the engine + the tick stay archetype-agnostic
//             — the tick resolves the binding through THIS registry, never a hardcoded service inject)
//             -- session:2026-06-08 (Phase 7 vector #7 lieutenant archetypes — Task 1, the binding registry) --
//
// `BindingRegistry` — the per-archetype binding lookup the lieutenant delegation tick + recruit dispatch through. It takes
// the array of all `ArchetypeBinding`s and indexes them by `binding.archetype` into a `Map`. This REPLACES the Phase-6
// hardcode (the tick injected `CookBindingService` directly; the recruit hardcoded `archetype !== 'COOK'`). The array is
// supplied by a `useFactory` provider in `lieutenant.module.ts` (the single place a new binding is wired — adding an
// archetype is one line in that factory's `inject` list, no edit here — the open/closed seam).
//
// WHY A useFactory ARRAY, NOT A `multi` TOKEN: the installed @nestjs/core (10.4.x) has NO multi-provider support — a
// `{ provide: TOKEN, …, multi: true }` registration is silently ignored (the second token registration overwrites the
// first via the provider Map; injecting the token yields a single instance, not an array → "bindings is not iterable" at
// boot). So the module assembles the array explicitly via a factory that injects each binding service and passes them in.
//
// BOOT-TIME SAFETY: the Map is built ONCE in the constructor; a DUPLICATE archetype (two bindings claiming the same
// archetype) throws at construction → the DI graph fails to resolve at boot (a loud misconfiguration, never a silent
// last-wins). `require()` (the recruit path) throws a 422 for an UNREGISTERED archetype (only a garbage/unknown value now
// — Phase 8 registered the last two archetypes, so all 6 enum members register and recruit accepts every real archetype);
// `get()` (the tick path) returns undefined for an absent archetype (the tick skips + logs — defensive; a recruited
// archetype is always registered, so this never fires in practice). NO state, NO I/O — a pure in-memory index of injected
// singletons (deterministic).

import { ApiError } from '../../protocol/api-error';
import type { ArchetypeBinding } from './archetype-binding';
import type { LieutenantArchetype } from './lieutenant-archetype';

export class BindingRegistry {
  /** archetype → its binding (built ONCE at construction; immutable thereafter). */
  private readonly byArchetype = new Map<LieutenantArchetype, ArchetypeBinding>();

  constructor(bindings: ArchetypeBinding[]) {
    for (const binding of bindings) {
      if (this.byArchetype.has(binding.archetype)) {
        // A DUPLICATE archetype (two bindings claim the same archetype) is a boot-time misconfiguration — fail LOUD at
        // construction (the DI graph won't resolve) rather than silently let one win. T2–T4 each register a DISTINCT
        // archetype, so this never fires in a correct build.
        throw new Error(
          `BindingRegistry: duplicate ArchetypeBinding for archetype '${binding.archetype}' — each archetype must be ` +
            'registered exactly once in the lieutenant.module.ts useFactory binding list.',
        );
      }
      this.byArchetype.set(binding.archetype, binding);
    }
  }

  /**
   * Resolve the binding for an archetype, or `undefined` if none is registered. The TICK path: it derives the
   * role_archetype from a recruited lieutenant's role_id (always a registered archetype in a correct build), so a miss is
   * a defensive skip (the tick logs + continues — it never throws on a missing binding).
   */
  get(archetype: LieutenantArchetype): ArchetypeBinding | undefined {
    return this.byArchetype.get(archetype);
  }

  /**
   * Resolve the binding for an archetype, or throw 422 VALIDATION_FAILED ("archetype not supported in this build") if none
   * is registered. The RECRUIT path: an archetype with no registered binding (now ONLY a garbage/unknown value) is NOT
   * recruitable → 422 (the BYTE-EQUIVALENT of the Phase-6 `archetype !== 'COOK'` → 422, generalized to "is this archetype
   * registered?"). Phase 8 completed the roster: this build registers all 6 archetypes (COOK + SECURITY + BOOKKEEPER +
   * LOGISTICS + LAUNDERING + DISTRIBUTION), so recruit accepts every real archetype and 422s only a garbage value.
   */
  require(archetype: LieutenantArchetype): ArchetypeBinding {
    const binding = this.byArchetype.get(archetype);
    if (!binding) {
      throw new ApiError('VALIDATION_FAILED', {
        message:
          `archetype '${String(archetype)}' not supported in this build (no binding registered) — ` +
          `supported: ${this.supportedArchetypes().join(', ') || '(none)'}.`,
      });
    }
    return binding;
  }

  /** The archetypes with a registered binding (the recruitable set this build supports). Deterministic insertion order. */
  supportedArchetypes(): LieutenantArchetype[] {
    return [...this.byArchetype.keys()];
  }
}
