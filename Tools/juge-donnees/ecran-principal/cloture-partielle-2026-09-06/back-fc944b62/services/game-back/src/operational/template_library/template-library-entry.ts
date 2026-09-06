// IMPLEMENTS: docs/superpowers/plans/2026-07-17-04g-D-meta-layer-plan.md C1 (template-library-entry.ts
//             — TemplateLibraryEntry shape, design §3.1)
//             Design: docs/superpowers/specs/2026-07-17-04g-D-meta-layer-design.md §3.1
//             Canon: projects/mafia_city_game/gdd/15_glossary.md (`TemplateLibraryEntry`, NEW C1 row).
//             — 04g-D C1 — 2026-07-17
//
// `TemplateLibraryEntry` — the unified shape all 6 registries resolve to (design §3.1: "généralisation
// du shape IDENTIQUE de `NewsBeatTemplateEntry` / `RandomWorldTemplateEntry`"). The 2 REUSE adapters
// (news-beat, random-world) map their existing entries onto this shape by ADDING `homeCategory` +
// `disposition: 'ship_ready'` — ZERO copy of the underlying data (import + map, D5/D9).

import { TemplateCategory, type TemplateId } from './template-category';

/** ❤️ / ✓ / ○ — the 3 canon LOVED/LIKE/neutral flags (design §3.1, same domain as
 *  `NewsBeatTemplateFlag`/`RandomWorldTemplateFlag`). The 3 `trash`-disposition entries (`the_long_stand`,
 *  `punishment_drift`, `quiet_week`) carry `'neutral'` here — the canon raw symbol is ✗ (cut), which is
 *  NOT one of the 3 values this shape's flag domain allows; `disposition: 'trash'` is the authoritative
 *  signal for "cut", `flag` stays at its lowest/unmarked bucket rather than inventing a 4th value never
 *  named by canon (gdd/15:1822 `KeystoneLOVEDFlag` only ever marks the 8 loved — everything else is
 *  liked/neutral by construction, cut or not). */
export type TemplateLibraryFlag = 'loved' | 'liked' | 'neutral';

/** `ship_ready` = counted in the mapped/unmapped dénominateur (C2). `trash` = CUT for posterity, hors
 *  dénominateur, carries `trashReason`. `substrate` = `constant_hum` ONLY — mapped-as-substrate, hors
 *  dénominateur ship-ready (design §3.1/§3.2, `template_launch_event_mapping.md` §Unmapped reconciliation
 *  flag 2). */
export type TemplateLibraryDisposition = 'ship_ready' | 'trash' | 'substrate';

/** `live` = ≥1 instantiation shippée s'exécute sur un runtime shippé (04e events / 04f flows / 04g-B/C
 *  generators / 04g-A hum pour `constant_hum`) — PAS une claim que le Flow-runtime canon complet existe
 *  (cf. `tdRef`). `registry_only` = catalogue entry + BO visibility ONLY, zéro code-path. */
export type TemplateLibraryRuntime = 'live' | 'registry_only';

/**
 * The unified per-template entry shape (design §3.1 verbatim field list). REUSE with a compile-time-
 * checked id (political/live-ops/recruitment/achievement's own home ids `satisfies` their source union
 * where one exists, D5) narrows `templateId`'s LITERAL value at each registry's own declaration site;
 * this interface's field stays the degenerate `TemplateId` (= `string`, see `template-category.ts`'s own
 * header for why no 60-member union lives here).
 */
export interface TemplateLibraryEntry {
  /** One of the 60 ids — global uniqueness boot-asserted (`TemplateLibraryService`, §3.7.2). */
  readonly templateId: TemplateId;
  /** NEW field vs the 2 REUSE shapes (news-beat/random-world entries infer it from the adapter module). */
  readonly homeCategory: TemplateCategory;
  /** Canon display name (verbatim, per-category table). */
  readonly name: string;
  /** Descriptor stable `CATALOGUE_REPORT.md:<start>-<end>` — the exact heading-to-next-heading line
   *  range (freshly re-grepped 2026-07-17, C1) — mirrors `NewsBeatTemplateEntry.catalogueRef`'s own
   *  convention. */
  readonly catalogueRef: string;
  readonly flag: TemplateLibraryFlag;
  /** The canon LOVED-ideas score. */
  readonly score: number;
  readonly disposition: TemplateLibraryDisposition;
  /** Verbatim canon reason — REQUIRED (non-empty) whenever `disposition === 'trash'` (e.g. `the_long_stand`
   *  — "CUT — observational-only, no surface", `achievement_structure_templates.md:40`). */
  readonly trashReason?: string;
  readonly runtime: TemplateLibraryRuntime;
  /** REQUIRED (non-empty) whenever `runtime === 'registry_only'` AND `disposition !== 'trash'` (anti-
   *  fig-leaf — never a silent omission of why it isn't live; mirrors `NewsBeatTemplateEntry`/
   *  `RandomWorldTemplateEntry`'s own `registryOnlyReason` convention). `trash` entries document their
   *  registry-only-ness via `trashReason` instead (a stronger, more specific signal) — see per-registry
   *  file comments for the exact per-entry reasoning. */
  readonly registryOnlyReason?: string;
  /** e.g. `'TD-173'` (Flow runtimes inspection_week/distribution_day), `'TD-217'` (reskins narratifs
   *  recruitment), `'G25→08c'` (achievements) — ONLY populated where an EXISTING TD/cross-note already
   *  names this exact gap (never a fresh TD number fabricated ahead of the C7 closeout allocation,
   *  precedent `RANDOM_WORLD_TEMPLATE_REGISTRY`/`NEWS_BEAT_TEMPLATE_REGISTRY`'s own C1 posture). */
  readonly tdRef?: string;
}
