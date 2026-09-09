// P3-C C7 — a zero-import LEAF token file (deliberately: NO other import in this file, not even
// `structural-decision-governor.service.ts` itself).
//
// ★ WHY THIS FILE EXISTS (empirically forced this session, flagged for reviewer): `RouteRebuildService`
// (operational/distribution/) needs `StructuralDecisionGovernorService` for the code 9
// `SINUOSITY_FULL_RESET` governor wrap. Importing the CONCRETE CLASS `StructuralDecisionGovernorService`
// directly into ANY file reachable from `DistributionModule`'s provider graph — REGARDLESS of whether it
// is ever used in a constructor, REGARDLESS of module-import wiring (a plain `Loop10Module` import, a
// `forwardRef`-wrapped one, and an `@Global()` flip were ALL tried and reverted) — reproducibly broke
// `Loop10Module`'s OWN internal DI graph at boot every time (`HlCardService`'s `StructuralDecisionGovernor
// Service` constructor arg resolving `undefined`). Root cause (isolated by bisection this session):
// `structural-decision-governor.service.ts` imports `SessionService`, which itself imports `HlCardService`
// (`session/session.service.ts:51` — the SAME `Loop10Module` ↔ `SessionModule` cycle that module's own
// header already documents, "forwardRef both sides"). A NEW, second import PATH into that cycle — from a
// file `DistributionModule` reaches EARLY/BROADLY in the overall app graph — shifts the ES-module load
// order enough that `HlCardService`'s OWN class decorator can run BEFORE `StructuralDecisionGovernorService`
// has finished its OWN top-level evaluation on THIS path, so TypeScript's `emitDecoratorMetadata`
// (`design:paramtypes`) captures `undefined` for that ONE constructor argument — a classic ES/CommonJS
// circular-import decorator-metadata hazard, NOT a NestJS module-wiring problem (that's why every module-
// edge variant broke identically, and why removing the DIRECT CLASS IMPORT — even with zero constructor
// usage, e.g. a method returning `StructuralDecisionGovernorService` as a type — is what actually fixed
// it, verified by bisection: importing the class ALONE, unused, broke boot; importing `StructuralDecision
// Type` (a plain enum, same catalogue-adjacent module tree) did NOT).
//
// FIX: `route-rebuild.service.ts` never imports the concrete class. It resolves this SYMBOL token via
// `ModuleRef.get(STRUCTURAL_DECISION_GOVERNOR, { strict: false })` (Nest's documented "provider from an
// unrelated module, zero new edge" escape hatch) and types the result as `StructuralDecisionGovernorLike`
// (a local duck-typed interface — the ONLY methods `RouteRebuildService` actually calls). `loop10.module.ts`
// registers the ONE alias provider (`{ provide: STRUCTURAL_DECISION_GOVERNOR, useExisting:
// StructuralDecisionGovernorService }`) — that file ALREADY safely imports the concrete class (it is its
// OWN home module), so this alias registration introduces no new hazard.

/** The DI token — a Symbol (not the class itself) so consumers never need to import the concrete class. */
export const STRUCTURAL_DECISION_GOVERNOR = Symbol('STRUCTURAL_DECISION_GOVERNOR');

/**
 * Duck-typed interface mirroring `StructuralDecisionGovernorService.commit`'s public signature — the
 * ONLY method `RouteRebuildService` calls. Kept minimal and local (not re-exporting the real class type)
 * so this file can stay a genuine zero-import leaf.
 */
export interface StructuralDecisionGovernorLike {
  commit<T>(
    playerId: string,
    type: string,
    ctx: {
      before: Record<string, unknown>;
      after: Record<string, unknown> | ((result: T) => Record<string, unknown>);
    },
    mutateFn: () => Promise<T>,
  ): Promise<T>;
}
