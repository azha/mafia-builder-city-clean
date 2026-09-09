// IMPLEMENTS: docs/superpowers/plans/2026-07-17-04g-D-meta-layer-plan.md C1 (achievement-template-
//             library.ts — 6 entries, 5 ids canon + 1 derived)
//             Design: docs/superpowers/specs/2026-07-17-04g-D-meta-layer-design.md §3.2 (ACHIEVEMENT-
//             STRUCTURE table, 6 entries) + decisions D3 (id derivation)
//             Canon: projects/mafia_city_world_events/CATALOGUE_REPORT.md §ACHIEVEMENT-STRUCTURE
//             (:1084-1213, 6 templates, canonical order + verbatim flag/score — freshly re-grepped
//             2026-07-17)
//             docs/tech/04g_ambient_world_events_templates/achievement_structure_templates.md :279,282,40
//             (canon-assigned ids, "jamais abbréviation", trashReason verbatim)
//             — 04g-D C1 — 2026-07-17
//
// `ACHIEVEMENT_TEMPLATE_LIBRARY` — the 6 ACHIEVEMENT-STRUCTURE entries. NO id here is REUSE (no existing
// code union references ACHIEVEMENT ids — C0 re-anchor confirmed 0 hits, `grep -rni "achievement"
// services/game-back/src`). 5 ids are canon-ASSIGNED verbatim (`achievement_structure_templates.md:282`,
// "jamais … abbréviation (`slow_hand` sans `the_`)" — D3 priority 1, the strongest); 1 is [PROV]-derived
// (`the_long_stand`, D3 — no canon id exists because it is CUT, derived by ITS category's own convention,
// which keeps `the_`).
//
// <!-- LOVED: slow_hand (4.40 ❤️) — the keystone entry below (templateId `the_slow_hand`) carries the
//      ❤️ flag. Divergence slug/id NOTED (design §3.2): the loved_ideas.json keystone slug is `slow_hand`,
//      the canon-assigned templateId is `the_slow_hand` — the category's own naming rule wins for the id
//      ("jamais `slow_hand` sans `the_`"), the R1.2 LOVED comment above uses the SHORTER slug per
//      convention (loved_ideas.json is the source of the slug, not the templateId). -->
//
// NO runtime exists for ANY achievement template (G25 folded to 08c, umbrella §0 "Pas de runtime
// achievement") — all 6 entries are `runtime: 'registry_only'`. This registry counts the library to 60;
// the future 08c chunk consumes it.

import { TemplateCategory } from './template-category';
import type { TemplateLibraryEntry } from './template-library-entry';

const NO_ACHIEVEMENT_RUNTIME_REASON =
  'No achievement runtime exists day-1 (G25 folded to 08c, umbrella §0) — registry entry + BO ' +
  'visibility only.';

export const ACHIEVEMENT_TEMPLATE_LIBRARY: readonly TemplateLibraryEntry[] = [
  {
    templateId: 'the_slow_hand', // canon-assigned, achievement_structure_templates.md:282
    homeCategory: TemplateCategory.ACHIEVEMENT_STRUCTURE,
    name: 'The Slow Hand',
    catalogueRef: 'CATALOGUE_REPORT.md:1088-1109',
    flag: 'loved',
    score: 4.40,
    disposition: 'ship_ready',
    runtime: 'registry_only',
    registryOnlyReason: NO_ACHIEVEMENT_RUNTIME_REASON,
    tdRef: 'G25→08c',
  },
  {
    templateId: 'the_cooper_ledger', // canon-assigned, achievement_structure_templates.md:282
    homeCategory: TemplateCategory.ACHIEVEMENT_STRUCTURE,
    name: 'The Cooper Ledger / Strata',
    catalogueRef: 'CATALOGUE_REPORT.md:1110-1131',
    flag: 'liked',
    score: 4.40,
    disposition: 'ship_ready',
    runtime: 'registry_only',
    registryOnlyReason: NO_ACHIEVEMENT_RUNTIME_REASON,
    tdRef: 'G25→08c',
  },
  {
    templateId: 'the_phase_entered', // canon-assigned, achievement_structure_templates.md:282
    homeCategory: TemplateCategory.ACHIEVEMENT_STRUCTURE,
    name: 'The Phase Entered / Names Entered',
    catalogueRef: 'CATALOGUE_REPORT.md:1132-1153',
    flag: 'liked',
    score: 4.35,
    disposition: 'ship_ready',
    runtime: 'registry_only',
    registryOnlyReason: NO_ACHIEVEMENT_RUNTIME_REASON,
    tdRef: 'G25→08c',
  },
  {
    templateId: 'the_mark', // canon-assigned, achievement_structure_templates.md:282
    homeCategory: TemplateCategory.ACHIEVEMENT_STRUCTURE,
    name: 'The Mark',
    catalogueRef: 'CATALOGUE_REPORT.md:1154-1175',
    flag: 'liked',
    score: 4.30,
    disposition: 'ship_ready',
    runtime: 'registry_only',
    registryOnlyReason: NO_ACHIEVEMENT_RUNTIME_REASON,
    tdRef: 'G25→08c',
  },
  {
    templateId: 'the_long_apprenticeship', // canon-assigned, achievement_structure_templates.md:282
    homeCategory: TemplateCategory.ACHIEVEMENT_STRUCTURE,
    name: 'The Long Apprenticeship / The Long Inheritance',
    catalogueRef: 'CATALOGUE_REPORT.md:1176-1197',
    flag: 'liked',
    score: 4.30,
    disposition: 'ship_ready',
    runtime: 'registry_only',
    registryOnlyReason: NO_ACHIEVEMENT_RUNTIME_REASON,
    tdRef: 'G25→08c',
  },
  {
    // [PROV, D3]: no canon id exists (this template is CUT) — derived by the category's own naming
    // convention (keeps `the_`, mirrors the 5 canon-assigned siblings above).
    templateId: 'the_long_stand',
    homeCategory: TemplateCategory.ACHIEVEMENT_STRUCTURE,
    name: 'The Long Stand',
    catalogueRef: 'CATALOGUE_REPORT.md:1198-1213',
    flag: 'neutral',
    score: 4.15,
    disposition: 'trash',
    // Verbatim canon, achievement_structure_templates.md:40.
    trashReason: 'CUT — observational-only, no surface',
    runtime: 'registry_only',
  },
];
