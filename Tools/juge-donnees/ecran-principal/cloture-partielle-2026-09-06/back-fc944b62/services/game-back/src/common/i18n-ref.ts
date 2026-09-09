// IMPLEMENTS: docs/superpowers/specs/2026-08-25-lot0-conventions-design.md §1 D1 (`I18nRef` — the one
//             i18n-safe text convention, hissée depuis
//             core_loops/flag_discipline/generators/routine-item-generator.ts:25-28) + §3 C0.
//             -- Lot 0 "Les conventions", chunk C0 (infrastructure) — 2026-08-26 --
//
// `I18nRef` — THE i18n-safe text reference (R-EH-2 — keys never inline text): a stable descriptor/
// reason/label KEY (`a.b.c`, resolved against the bundle — `i18n.controller.ts`) + structured
// substitution params, never a literal user-facing string. This was, before this lot, defined ONLY
// inside `routine-item-generator.ts` (flag_discipline's own generator registry contract); it is hissée
// HERE so every producer of player-facing text (exception cards, hl-cards, progression, fiction names —
// D2/D3/D4/D7) shares the SAME shape instead of re-declaring a structurally-identical interface per
// module (which is how the codebase ended up with the `flagReason` homonym this same chunk re-types).
//
// `params` is NARROWED `unknown → string` (D1/§0, measured): the 6 `flag_discipline` producers that
// build an `I18nRef` (`courier-scheduling.generator.ts:72,76`, `lek-rotation.generator.ts:77,81`,
// `stash-reorder.generator.ts:79,83`, `front-shop-reconciliation.generator.ts:80,84`,
// `precursor-order.generator.ts:92,96`, `flag-discipline.service.ts:161-162`) only ever pass
// identifiers/ordinals ALREADY typed as `string` — ICU substitutions and the printed-identifier gabarits
// this lot's D3 registry requires (route_id, building_id, dealer_id, substance_type, precursor_type,
// generator, district, block, rank, type…) are all strings. Narrowing loses no capability exercised
// today and closes off a non-string `params` value silently reaching the i18n bundle resolver.
export interface I18nRef {
  readonly key: string;
  readonly params: Record<string, string>;
}
