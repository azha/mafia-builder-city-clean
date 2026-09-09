// IMPLEMENTS: docs/superpowers/plans/2026-07-18-p3-F-delegation-ratchet-plan.md C2 ("mastery-event mapper
//             registry over the C0-finalized emitters").
//             Design: docs/superpowers/specs/2026-07-18-p3-F-delegation-ratchet-design.md §7.1 ("Mapper
//             registry. mastery-event-mapper.registry.ts: closed list of {event, categoryResolver,
//             outcome: +1|−2, playerResolver} bindings over the §6 emitters. Deterministic; a binding
//             whose payload cannot resolve a player or category is a structured no-op").
//             — P3-F C2 — 2026-07-18
//
// `MASTERY_EVENT_MAPPER_REGISTRY` — the closed, DERIVED runtime binding table `MasteryAccumulatorService`
// dispatches through. DERIVED (not hand-duplicated) from `TASK_CATEGORY_CATALOGUE.masteryEvents` — DD-F2
// names the catalogue as the SINGLE source of truth for the four bindings; building a second, independently-
// maintained list here would create a drift risk the design's own "the boot strict-check reads only this"
// language is meant to foreclose. `playerResolver` is NOT modeled as a per-binding function (design §7.1's
// literal shape) because every REAL emitter on this base already carries `playerId` directly on its event
// payload (or, for the resolve-hook, the caller already resolved it) — a resolver indirection would be
// dead code for every one of this lot's 9 bindings; `categoryResolver` is likewise the trivial "the
// catalogue row's own code" (no event needs to DISAMBIGUATE its category — one event maps to exactly one
// LIVE category on this base). Both registries are keyed by the event's own discriminant (`CityEvent.type`
// string) / the resolve-hook's `source` tag — a lookup key, never a parsed/executed expression.

import {
  TASK_CATEGORY_CATALOGUE,
  type TaskCategoryCatalogueEntry,
} from './task-category-catalogue';

/** One resolved (category, delta) pair a mastery event or resolve-hook tag maps to. */
export interface MasteryCategoryDelta {
  readonly categoryCode: number;
  readonly outcome: 1 | -2;
}

export interface MasteryEventMapperRegistry {
  /** Keyed by the REAL `CityEvent.type` discriminant string (e.g. `'route_created'`). */
  readonly busEventBindings: ReadonlyMap<string, readonly MasteryCategoryDelta[]>;
  /** Keyed by the jsonb `candidate_actions[].source` tag the R6 resolve-hook reads back. */
  readonly resolveHookBindings: ReadonlyMap<string, readonly MasteryCategoryDelta[]>;
}

/**
 * Build the registry from a catalogue (a PARAMETER, mirroring `validateTaskCategoryCatalogueStrictMode`'s
 * own "never a hardcoded read" convention — lets a future test probe a clone without touching the
 * production singleton below). Only `live:true` rows contribute (a RESERVED row's `masteryEvents` is
 * always empty by the DD-F2 boot check, so this filter is defense-in-depth, not load-bearing).
 */
export function buildMasteryEventMapperRegistry(
  catalogue: readonly TaskCategoryCatalogueEntry[],
): MasteryEventMapperRegistry {
  const busEventBindings = new Map<string, MasteryCategoryDelta[]>();
  const resolveHookBindings = new Map<string, MasteryCategoryDelta[]>();

  for (const entry of catalogue) {
    if (!entry.live) continue;
    for (const binding of entry.masteryEvents) {
      const delta: MasteryCategoryDelta = { categoryCode: entry.code, outcome: binding.outcome };
      if (binding.kind === 'bus_event') {
        const list = busEventBindings.get(binding.event) ?? [];
        list.push(delta);
        busEventBindings.set(binding.event, list);
      } else {
        const list = resolveHookBindings.get(binding.sourceTag) ?? [];
        list.push(delta);
        resolveHookBindings.set(binding.sourceTag, list);
      }
    }
  }

  return { busEventBindings, resolveHookBindings };
}

/** The production registry — derived once, at module load, from the real catalogue. */
export const MASTERY_EVENT_MAPPER_REGISTRY: MasteryEventMapperRegistry =
  buildMasteryEventMapperRegistry(TASK_CATEGORY_CATALOGUE);
