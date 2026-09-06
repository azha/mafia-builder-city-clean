// IMPLEMENTS: docs/superpowers/plans/2026-07-17-04g-D-meta-layer-plan.md C1 (political-template-
//             library.ts — 11 entries, ids REUSE union 04e)
//             Design: docs/superpowers/specs/2026-07-17-04g-D-meta-layer-design.md §3.2 (POLITICAL
//             table, 11 entries)
//             Canon: projects/mafia_city_world_events/CATALOGUE_REPORT.md §POLITICAL (:40-279, 11
//             templates, canonical order + verbatim flag/score — freshly re-grepped 2026-07-17,
//             per-entry `catalogueRef` cites the EXACT heading-to-next-heading line range)
//             docs/tech/04g_ambient_world_events_templates/political_templates.md :26-40
//             REUSE seam: operational/political/political-template-id.ts (`PoliticalTemplateId`, 14
//             members = 11 home + 3 cross-cat borrowed — D5, NEVER modified).
//             — 04g-D C1 — 2026-07-17
//
// `POLITICAL_TEMPLATE_LIBRARY` — the 11 home-POLITICAL entries of the 60-template library. 100% REUSE
// at the id level: every `templateId` below is typed `satisfies PoliticalTemplateId` (D5) — a rename in
// `political-template-id.ts` breaks THIS file's compile, by design (compile-time drift detection, never
// a re-forked literal).
//
// <!-- LOVED: selective_notice (4.65 ❤️) — the keystone entry below carries the ❤️ flag. -->
//
// ★ flag discrepancy noted (R4.1-adjacent honesty, not a silent override): `CATALOGUE_REPORT.md`'s raw
// heading glyph for `permit_carousel` (:220) is ✓ (byte-verified U+2713), which would naively read
// "liked" — but `political-template-id.ts`'s OWN already-⊥-reviewed comment (`:45`, "#9 ○ 4.20") and this
// design's own table (§3.2) BOTH resolve it to `neutral`. The raw catalogue heading's TRAILING glyph is
// the tell: entries with a trailing 🎯 ("clean target") got their leading glyph taken as final; the 2
// entries with a trailing ○ instead (`permit_carousel` :220, `three_against_four` liveops :1306) were
// downgraded to `neutral` by the already-settled per-chapter tech-docs — this file follows that already-
// resolved call, not the raw CATALOGUE_REPORT.md leading glyph in isolation.
//
// Runtime posture (design §3.1 `TemplateLibraryEntry.runtime` doc): `live` here means "≥1 instantiation
// of this template shipped a real launch event on the 04e-A2 political runtime" — ALL 9 mapped entries
// are `live` (04e-A2 political-event-catalogue.ts already ships all 12 events, 9 of them POLITICAL-home).
// `bench_rotation`/`repeated_lesson` have NO launch event bound (political_templates.md invariant #6) —
// `registry_only`, part of the 34-item unmapped backlog (C2), never a fig-leaf claim of unshipped code.

import type { PoliticalTemplateId } from '../political/political-template-id';
import { TemplateCategory } from './template-category';
import type { TemplateLibraryEntry } from './template-library-entry';

const UNMAPPED_REGISTRY_ONLY_REASON =
  'Unmapped in the A2 political launch catalogue — no launch event bound ' +
  '(political_templates.md invariant #6: "9 launch events use POLITICAL templates directly ... a future ' +
  'content-authoring opportunity"). Registry entry + BO visibility only; part of the 34-item ship-ready ' +
  'unmapped backlog (C2).';

export const POLITICAL_TEMPLATE_LIBRARY: readonly TemplateLibraryEntry[] = [
  {
    templateId: 'selective_notice' satisfies PoliticalTemplateId,
    homeCategory: TemplateCategory.POLITICAL,
    name: 'The Selective Notice',
    catalogueRef: 'CATALOGUE_REPORT.md:44-65',
    flag: 'loved',
    score: 4.65,
    disposition: 'ship_ready',
    runtime: 'live',
  },
  {
    templateId: 'stack_of_authorities' satisfies PoliticalTemplateId,
    homeCategory: TemplateCategory.POLITICAL,
    name: 'The Stack of Authorities / Eleven Chairs',
    catalogueRef: 'CATALOGUE_REPORT.md:66-87',
    flag: 'liked',
    score: 4.70,
    disposition: 'ship_ready',
    runtime: 'live',
  },
  {
    templateId: 'vision_that_cannot_adjust' satisfies PoliticalTemplateId,
    homeCategory: TemplateCategory.POLITICAL,
    name: 'The Vision That Cannot Adjust',
    catalogueRef: 'CATALOGUE_REPORT.md:88-109',
    flag: 'liked',
    score: 4.60,
    disposition: 'ship_ready',
    runtime: 'live',
  },
  {
    templateId: 'levee' satisfies PoliticalTemplateId,
    homeCategory: TemplateCategory.POLITICAL,
    name: 'The Levee / The Long Quiet',
    catalogueRef: 'CATALOGUE_REPORT.md:110-131',
    flag: 'liked',
    score: 4.55,
    disposition: 'ship_ready',
    runtime: 'live',
  },
  {
    templateId: 'methane_year' satisfies PoliticalTemplateId,
    homeCategory: TemplateCategory.POLITICAL,
    name: 'Methane Year',
    catalogueRef: 'CATALOGUE_REPORT.md:132-153',
    flag: 'liked',
    score: 4.50,
    disposition: 'ship_ready',
    runtime: 'live',
  },
  {
    templateId: 'standing_reorganization' satisfies PoliticalTemplateId,
    homeCategory: TemplateCategory.POLITICAL,
    name: 'The Standing Reorganization',
    catalogueRef: 'CATALOGUE_REPORT.md:154-175',
    flag: 'liked',
    score: 4.30,
    disposition: 'ship_ready',
    // 'live' via the CROSS-CAT borrow (04e-B's E-LO-03, LiveOpsTemplateId) — not a home political launch
    // event; still `live` per the design's own runtime-field semantics ("≥1 instantiation shippée").
    runtime: 'live',
  },
  {
    templateId: 'bench_rotation' satisfies PoliticalTemplateId,
    homeCategory: TemplateCategory.POLITICAL,
    name: 'The Bench Rotation',
    catalogueRef: 'CATALOGUE_REPORT.md:176-197',
    flag: 'liked',
    score: 4.30,
    disposition: 'ship_ready',
    runtime: 'registry_only',
    registryOnlyReason: UNMAPPED_REGISTRY_ONLY_REASON,
  },
  {
    templateId: 'stalled_permit' satisfies PoliticalTemplateId,
    homeCategory: TemplateCategory.POLITICAL,
    name: 'The Stalled Permit',
    catalogueRef: 'CATALOGUE_REPORT.md:198-219',
    flag: 'liked',
    score: 4.25,
    disposition: 'ship_ready',
    runtime: 'live',
  },
  {
    // Design §3.2 / political-template-id.ts:45 — resolved `neutral` (see file header discrepancy note).
    templateId: 'permit_carousel' satisfies PoliticalTemplateId,
    homeCategory: TemplateCategory.POLITICAL,
    name: 'The Permit Carousel',
    catalogueRef: 'CATALOGUE_REPORT.md:220-235',
    flag: 'neutral',
    score: 4.20,
    disposition: 'ship_ready',
    runtime: 'live',
  },
  {
    templateId: 'listening_period' satisfies PoliticalTemplateId,
    homeCategory: TemplateCategory.POLITICAL,
    name: 'The Listening Period',
    catalogueRef: 'CATALOGUE_REPORT.md:236-257',
    flag: 'neutral',
    score: 4.40,
    disposition: 'ship_ready',
    runtime: 'live',
  },
  {
    templateId: 'repeated_lesson' satisfies PoliticalTemplateId,
    homeCategory: TemplateCategory.POLITICAL,
    name: 'The Repeated Lesson / After-Action Forgetting',
    catalogueRef: 'CATALOGUE_REPORT.md:258-279',
    flag: 'neutral',
    score: 4.40,
    disposition: 'ship_ready',
    runtime: 'registry_only',
    registryOnlyReason: UNMAPPED_REGISTRY_ONLY_REASON,
  },
];
