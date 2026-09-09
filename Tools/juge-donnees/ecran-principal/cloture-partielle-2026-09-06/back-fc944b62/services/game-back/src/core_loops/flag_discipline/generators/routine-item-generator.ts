// IMPLEMENTS: docs/superpowers/plans/2026-07-11-p3-B-flag-discipline-plan.md §C3 (generator registry —
//             `RoutineItemGeneratorRegistry` closed, boot-registered)
//             Design: docs/superpowers/specs/2026-07-11-p3-B-flag-discipline-design.md §5 (routine
//             generation — the closed registry) + §1 D4 (per-generator daily cap, stable top-K).
//             Pattern: `hl-card-provider.registry.ts` / `hl-card-types.ts`'s `HlCardProvider` contract —
//             a Map<code, impl> built ONCE from a `useFactory` provider list in the owning module
//             (`flag-discipline.module.ts`), duplicate-code throws at boot (the SAME loud-
//             misconfiguration convention `ExceptionEffectRegistry`/`BindingRegistry` use).
//             — P3-B C3 — 2026-07-11
//
// `RoutineItemGeneratorRegistry` — the closed set of 5 v1 LIVE RoutineItem generators (decisions §6
// RULING #4 — all 5, roles 2/9 auto-confirm-only). Built ONCE from `FlagDisciplineModule`'s `useFactory`
// provider list; a duplicate `generator` code throws at boot.
//
// `BUILDING_RENT` (canon routine item, decisions §4 divergence #4) stays CODE-RESERVED and inert: it has
// NO system to enumerate against (no rent system exists), so it is deliberately NOT a 6th
// `RoutineItemGenerator` here and NOT a 6th `routine_generator` pgEnum member (`db/schema/flag_
// discipline.ts`'s own header already documents this — an enum member with no generator behind it would
// be a silent lie the moment anything switched on it). This registry's closed set stays exactly 5.

import type { RoutineGeneratorEnumTs } from '../../../db/schema/flag_discipline';
import type { I18nRef } from '../../../common/i18n-ref';

// `I18nRef` USED to be defined here (the codebase's only definition, pre-Lot-0). Lot 0 §1 D1 hisses it
// to `common/i18n-ref.ts` (shared by exception cards, hl-cards, progression, fiction names) and
// re-exports it from THIS site so every existing importer of `I18nRef` from this module keeps working
// unchanged, AND so a future re-declaration of `I18nRef` anywhere in this file is compilo-fatal (a
// duplicate named export), never a silent shadow — the socle's "ré-export, jamais suppression sèche"
// precedent (a bare removal leaves nothing that would rougir if someone re-declared the homonym).
export type { I18nRef };

/**
 * One enumerated candidate a generator emits for a (player, game_day) pair (design §5). `dedupKey` is
 * STABLE across game-days (identifies the underlying entity — a route/building/dealer id or composite
 * key — NOT the day; `routine_items`'s own UNIQUE constraint supplies the day/generator discriminators).
 * `deviationScore` ∈ [0,1], PURE-computed by the generator's own exported scorer function (direct-
 * importable — the E2E precompute floor, plan §C3). `lieutenantId`/`tenureScore` are BOTH null together
 * (D6 — no role-holder resolved for this candidate's `responsibleRoleId`; the honest coverage gap) or
 * BOTH present (the resolved holder + the Phase-11 streak the caller derives the tenure bucket from).
 */
export interface RoutineCandidate {
  readonly dedupKey: string;
  readonly descriptor: I18nRef;
  readonly flagReason: I18nRef;
  readonly responsibleRoleId: number;
  readonly lieutenantId: string | null;
  readonly tenureScore: number | null;
  readonly deviationScore: number;
}

/** The generator contract (design §5 — "each registered generator... returns 0..n candidates"). */
export interface RoutineItemGenerator {
  readonly generator: RoutineGeneratorEnumTs;
  readonly responsibleRoleId: number;
  enumerate(playerId: string, gameDay: number): Promise<RoutineCandidate[]>;
}

export class RoutineItemGeneratorRegistry {
  private readonly byCode = new Map<RoutineGeneratorEnumTs, RoutineItemGenerator>();
  private readonly ordered: RoutineItemGenerator[] = [];

  constructor(generators: RoutineItemGenerator[]) {
    for (const g of generators) {
      if (this.byCode.has(g.generator)) {
        throw new Error(
          `RoutineItemGeneratorRegistry: duplicate generator for code '${String(g.generator)}' — register ` +
            'each exactly once in FlagDisciplineModule\'s useFactory provider list.',
        );
      }
      this.byCode.set(g.generator, g);
      this.ordered.push(g);
    }
  }

  /** All 5 registered generators, in registration order (deterministic — D13). */
  all(): RoutineItemGenerator[] {
    return [...this.ordered];
  }
}

/**
 * `selectStableTopK` — the D4 per-generator daily cap: a PURE, direct-importable stable top-K selection
 * over a generator's own candidate array. Sorts by `deviationScore` DESC, tie-broken by `dedupKey` ASC
 * (a TOTAL order — the selection never depends on array/enumeration insertion order, so a re-run against
 * the SAME substrate always caps the SAME set), then slices to `cap`. A negative/zero cap yields `[]`
 * (never negative-index `.slice` weirdness).
 */
export function selectStableTopK(candidates: readonly RoutineCandidate[], cap: number): RoutineCandidate[] {
  return [...candidates]
    .sort((a, b) => b.deviationScore - a.deviationScore || a.dedupKey.localeCompare(b.dedupKey))
    .slice(0, Math.max(0, cap));
}
