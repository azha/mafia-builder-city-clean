// IMPLEMENTS: docs/superpowers/plans/2026-07-17-04g-D-meta-layer-plan.md C1 (template-category.ts —
//             enum TemplateCategory (6) + TemplateId global)
//             Design: docs/superpowers/specs/2026-07-17-04g-D-meta-layer-design.md §3.1
//             Canon: projects/mafia_city_game/gdd/15_glossary.md:1820 (`TemplateCategory`), :1821
//             (`TemplateId`).
//             — 04g-D C1 — 2026-07-17
//
// `TemplateCategory` — gdd/15:1820 VERBATIM: 6 members, this exact spelling/order. Never `category:
// string`, never `EventCategory` (glossary interdits). Mirrors `template_category` (pgEnum,
// `db/schema/template_library.ts`, migration 0131) member-for-member — R9.3 same-commit.
export enum TemplateCategory {
  POLITICAL = 'POLITICAL',
  NEWS_BEAT = 'NEWS_BEAT',
  RANDOM_WORLD = 'RANDOM_WORLD',
  RECRUITMENT_QUEST = 'RECRUITMENT_QUEST',
  ACHIEVEMENT_STRUCTURE = 'ACHIEVEMENT_STRUCTURE',
  LIVE_OPS = 'LIVE_OPS',
}

/**
 * `TemplateId` — gdd/15:1821 verbatim: "String canonical per template name (e.g., `the_listening_period`,
 * `cooper_affair`)." Never `template_id: int`, never `TemplateUuid`.
 *
 * ★ Deliberately `string`, NOT a literal union of the 60 home ids. Design §3.1 frames `TemplateId` as
 * "union des 60 ids home" — a literal 60-member union IS possible in principle, but building it HERE
 * would require this foundation file to import all 4 NEW registry files (`political-template-library.ts`
 * / `live-ops-template-library.ts` / `recruitment-quest-template-library.ts` /
 * `achievement-template-library.ts`), each of which imports `TemplateCategory` FROM this file — a
 * circular import. The 60-id closed domain is instead enforced at RUNTIME by
 * `TemplateLibraryService`'s boot assertion (uniqueness of all 60 `templateId`s, §3.7.2) — a throw-on-
 * boot invariant, not a compile-time one. Each of the 6 registries still gets its OWN compile-time-
 * checked id type where a REUSE union exists (`satisfies PoliticalTemplateId` etc., D5) — this file's
 * `TemplateId` is the DEGENERATE top type used only where no narrower union is in scope (e.g.
 * `TemplateLibraryEntry.templateId`, `TemplateMappingEntry.templateId`). Flagged here for reviewer
 * visibility — not a silent narrowing of the design's intent, an explicit engineering trade-off.
 */
export type TemplateId = string;
