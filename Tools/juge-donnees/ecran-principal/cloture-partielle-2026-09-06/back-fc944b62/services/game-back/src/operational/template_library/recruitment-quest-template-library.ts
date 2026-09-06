// IMPLEMENTS: docs/superpowers/plans/2026-07-17-04g-D-meta-layer-plan.md C1 (recruitment-quest-
//             template-library.ts — 10 entries, 2 ids REUSE + 8 new-to-code)
//             Design: docs/superpowers/specs/2026-07-17-04g-D-meta-layer-design.md §3.2 (RECRUITMENT-
//             QUEST table, 10 entries) + decisions D3 (id derivation, 4-priority rule)
//             Canon: projects/mafia_city_world_events/CATALOGUE_REPORT.md §RECRUITMENT-QUEST (:860-1083,
//             10 templates, canonical order + verbatim flag/score — freshly re-grepped 2026-07-17)
//             docs/tech/04g_ambient_world_events_templates/recruitment_quest_templates.md :29-38
//             REUSE seams: operational/political/political-template-id.ts (`cousins_vouch`),
//             operational/liveops/live-ops-template-id.ts (`coordinated_hush`) — D5, NEVER modified.
//             — 04g-D C1 — 2026-07-17
//
// `RECRUITMENT_QUEST_TEMPLATE_LIBRARY` — the 10 home-RECRUITMENT-QUEST entries. 2 ids REUSE (typed
// `satisfies` against their source union, D5); 8 new-to-code [PROV] ids per decisions D3's 4-priority
// derivation (canon-assigned > literal code > loved_ideas slug > mechanical rule — 3 explicit [PROV]
// judgment calls: `the_stretch` priority-3-over-4, `the_returned` keeps its article, both flagged inline
// below).
//
// <!-- LOVED: the_stretch (4.70 ❤️) + what_he_brought_with_him (4.50 ❤️) — the 2 keystone entries below
//      carry the ❤️ flag. -->
//
// This registry IS the substrat TD-217 (04f-owned, umbrella §5) consumes — every `registry_only`
// recruitment entry below carries `tdRef` where an EXISTING TD/cross-note already names the gap (never a
// fresh TD fabricated ahead of the C7 closeout, precedent `RANDOM_WORLD_TEMPLATE_REGISTRY`'s own C1
// posture). Note canon `§A.5`: `MaladaptiveMemoryInheritanceService` on The Returning Hand is a substrate
// cross-ref (`04b §5.2`), NOT a composition of `what_he_brought_with_him` (which stays unmapped distinct —
// design §3.2 recount-strict invariant 5).

import type { PoliticalTemplateId } from '../political/political-template-id';
import type { LiveOpsTemplateId } from '../liveops/live-ops-template-id';
import { TemplateCategory } from './template-category';
import type { TemplateLibraryEntry } from './template-library-entry';

const NOT_A_FLOW_MAPPING_REASON =
  'Not one of the 3 flow-mappings this lot ships (FLOW-SALTLINE / FLOW-DEFECTOR / FLOW-CIVILIAN) — ' +
  'registry entry + BO visibility only; part of the 34-item ship-ready unmapped backlog (C2).';

export const RECRUITMENT_QUEST_TEMPLATE_LIBRARY: readonly TemplateLibraryEntry[] = [
  {
    // [PROV, D3 priority 3 over 4]: the mechanical rule (drop "The", snake_case) would derive the
    // generic `stretch`; the loved_ideas.json keystone slug `the_stretch` wins instead (D3 priority-3
    // exception, explicit judgment call).
    templateId: 'the_stretch',
    homeCategory: TemplateCategory.RECRUITMENT_QUEST,
    name: 'The Stretch / The Long Approach',
    catalogueRef: 'CATALOGUE_REPORT.md:864-885',
    flag: 'loved',
    score: 4.70,
    disposition: 'ship_ready',
    runtime: 'live', // flow Saltline (04f RecruitmentQuestService, SUPPORTED_QUEST_TYPES 'saltline')
  },
  {
    templateId: 'what_he_brought_with_him',
    homeCategory: TemplateCategory.RECRUITMENT_QUEST,
    name: 'What He Brought With Him',
    catalogueRef: 'CATALOGUE_REPORT.md:886-907',
    flag: 'loved',
    score: 4.50,
    disposition: 'ship_ready',
    runtime: 'registry_only',
    registryOnlyReason:
      'Narrative reskin not authored this lot — this registry entry IS the substrate TD-217 (04f-owned) ' +
      'consumes; the 3 NARRATIVE reskins themselves (Saltline/Defector/Civilian) are deferred to TD-217.',
    tdRef: 'TD-217-adjacent',
  },
  {
    templateId: 'bookkeepers_probation',
    homeCategory: TemplateCategory.RECRUITMENT_QUEST,
    name: "The Bookkeeper's Probation",
    catalogueRef: 'CATALOGUE_REPORT.md:908-929',
    flag: 'liked',
    score: 4.50,
    disposition: 'ship_ready',
    runtime: 'registry_only',
    registryOnlyReason: NOT_A_FLOW_MAPPING_REASON,
  },
  {
    templateId: 'cousins_vouch' satisfies PoliticalTemplateId,
    homeCategory: TemplateCategory.RECRUITMENT_QUEST,
    name: "The Cousin's Vouch / The Standing",
    catalogueRef: 'CATALOGUE_REPORT.md:930-951',
    flag: 'liked',
    score: 4.50,
    disposition: 'ship_ready',
    runtime: 'live', // cross-cat E-POL-05 (04e-A2 political launch catalogue)
  },
  {
    templateId: 'witnessed_walk',
    homeCategory: TemplateCategory.RECRUITMENT_QUEST,
    name: 'The Witnessed Walk',
    catalogueRef: 'CATALOGUE_REPORT.md:952-973',
    flag: 'liked',
    score: 4.45,
    disposition: 'ship_ready',
    runtime: 'registry_only',
    registryOnlyReason: NOT_A_FLOW_MAPPING_REASON,
  },
  {
    templateId: 'sudden_funeral',
    homeCategory: TemplateCategory.RECRUITMENT_QUEST,
    name: 'The Sudden Funeral',
    catalogueRef: 'CATALOGUE_REPORT.md:974-995',
    flag: 'liked',
    score: 4.45,
    disposition: 'ship_ready',
    runtime: 'live', // flow Civilian (04f RecruitmentQuestService, SUPPORTED_QUEST_TYPES 'civilian')
  },
  {
    templateId: 'walked_away_recruit',
    homeCategory: TemplateCategory.RECRUITMENT_QUEST,
    name: 'The Walked-Away Recruit',
    catalogueRef: 'CATALOGUE_REPORT.md:996-1017',
    flag: 'liked',
    score: 4.35,
    disposition: 'ship_ready',
    runtime: 'registry_only',
    registryOnlyReason: NOT_A_FLOW_MAPPING_REASON,
  },
  {
    templateId: 'coordinated_hush' satisfies LiveOpsTemplateId,
    homeCategory: TemplateCategory.RECRUITMENT_QUEST,
    name: 'The Coordinated Hush',
    catalogueRef: 'CATALOGUE_REPORT.md:1018-1039',
    flag: 'liked',
    score: 4.35,
    disposition: 'ship_ready',
    runtime: 'live', // cross-cat E-LO-06 (04e-B live-ops launch catalogue, semanticInversion)
  },
  {
    templateId: 'returning_hand',
    homeCategory: TemplateCategory.RECRUITMENT_QUEST,
    name: 'The Returning Hand / The Returned Name',
    catalogueRef: 'CATALOGUE_REPORT.md:1040-1061',
    flag: 'liked',
    score: 4.30,
    disposition: 'ship_ready',
    runtime: 'live', // flow Defector (04f RecruitmentQuestService, SUPPORTED_QUEST_TYPES 'defector')
  },
  {
    // [PROV, D3 exception]: the mechanical rule would derive the bare participle `returned`; the article
    // is kept (mirrors the `the_mark` pattern) — explicit judgment call, D3.
    templateId: 'the_returned',
    homeCategory: TemplateCategory.RECRUITMENT_QUEST,
    name: 'The Returned / Pell Returnee',
    catalogueRef: 'CATALOGUE_REPORT.md:1062-1083',
    flag: 'neutral',
    score: 4.40,
    disposition: 'ship_ready',
    runtime: 'registry_only',
    registryOnlyReason: NOT_A_FLOW_MAPPING_REASON,
  },
];
