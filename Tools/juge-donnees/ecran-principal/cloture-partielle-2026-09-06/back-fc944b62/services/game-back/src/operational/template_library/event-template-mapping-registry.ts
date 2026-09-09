// IMPLEMENTS: docs/superpowers/plans/2026-07-17-04g-D-meta-layer-plan.md C2 (event-template-mapping-
//             registry.ts — the 25 instantiations, queryable)
//             Design: docs/superpowers/specs/2026-07-17-04g-D-meta-layer-design.md §3.3
//             Canon: docs/tech/04g_ambient_world_events_templates/template_launch_event_mapping.md
//             §Counts reconciled (22+3=25) + §Mapping coverage matrix + §Reskin composability examples
//             (Example 1/2/3) + §Cross-category re-skinning supported (invariant 4).
//             REUSE seams: operational/political/political-template-id.ts (`POLITICAL_TEMPLATE_
//             REGISTRY`, 12 entries), operational/liveops/live-ops-template-id.ts
//             (`LIVE_OPS_TEMPLATE_REGISTRY`, 10 entries) — D5/D9, NEVER modified, NEVER re-declared.
//             — 04g-D C2 — 2026-07-17
//
// `EventTemplateMappingRegistry` — the 25 instantiations (22 launch events + 3 recruitment flows) that
// re-skin a template into something concrete, made queryable (`gdd/15:1917`). Zero table (canon compiled
// data, mirrors the 04e catalogues' own posture) — 22 of the 25 are DERIVED by construction from the 2
// REUSE Records (never re-declared, D5); only the 3 FLOW-* entries are new-to-this-file (04f recruitment
// flows are not themselves an event_id Record anywhere in code — `recruitment-quest.service.ts` only
// enumerates `SUPPORTED_QUEST_TYPES`, no event-id lookup — so these 3 mappings exist nowhere else).
//
// <!-- LOVED: selective_notice (4.65 ❤️, mapped twice — E-POL-03/E-POL-04) + the_stretch (4.70 ❤️,
//      FLOW-SALTLINE) — the 2 keystones that participate directly in the 25 instantiations (forwarded via
//      the imported Records / new FLOW mapping below, not re-declared — D9). The other 6 canon keystones
//      (cooper_affair/sourceless_beat/sideways_failure/what_he_brought_with_him/the_slow_hand/
//      constant_hum) are NOT among the 25 — 5 are unmapped ship-ready (`unmapped-templates-opportunity.
//      registry.ts`), 1 (`constant_hum`) is the +1 substrate counted separately (§3.7.4 arithmetic). -->

import { POLITICAL_TEMPLATE_REGISTRY } from '../political/political-template-id';
import { LIVE_OPS_TEMPLATE_REGISTRY } from '../liveops/live-ops-template-id';
import { TemplateCategory } from './template-category';
import { POLITICAL_TEMPLATE_LIBRARY } from './political-template-library';
import { LIVE_OPS_TEMPLATE_LIBRARY } from './live-ops-template-library';
import { RECRUITMENT_QUEST_TEMPLATE_LIBRARY } from './recruitment-quest-template-library';
import { ACHIEVEMENT_TEMPLATE_LIBRARY } from './achievement-template-library';
import { NEWS_BEAT_TEMPLATE_LIBRARY } from './news-beat-template-library.adapter';
import { RANDOM_WORLD_TEMPLATE_LIBRARY } from './random-world-template-library.adapter';

/** `TemplateMappingEntry` (design §3.3 verbatim field list, gdd/15 NEW row this chunk — R6.1). */
export interface TemplateMappingEntry {
  /** `'E-POL-01'`..`'E-POL-12'` | `'E-LO-01'`..`'E-LO-10'` | `'FLOW-SALTLINE'` | `'FLOW-DEFECTOR'` |
   *  `'FLOW-CIVILIAN'` (D6). */
  readonly instantiationId: string;
  readonly kind: 'launch_event' | 'recruitment_flow';
  /** Value of the imported Record (POLITICAL/LIVE-OPS) or the FLOW-* mapping below — identity boot-
   *  asserted against the 2 Records (`TemplateLibraryService`, §3.7.3). */
  readonly templateId: string;
  /** Derived from the 60-entry library (§3.1-3.2) — never re-typed here. */
  readonly templateHomeCategory: TemplateCategory;
  /** POLITICAL for E-POL-*, LIVE_OPS for E-LO-*, RECRUITMENT_QUEST for FLOW-*. */
  readonly hostCategory: TemplateCategory;
  /** = `templateHomeCategory !== hostCategory`. */
  readonly crossCat: boolean;
  /** E-LO-06 ONLY (canon §Example 2 — costly-silence-as-bond applied AGAINST the player, inverted from
   *  its RECRUITMENT-QUEST "toward a recruit candidate" home semantics). */
  readonly semanticInversion?: true;
  /** Audits "the other re-skin of the same template" (canon §Example 3 `reuse_of`) — E-POL-04 (this
   *  entry only) points at E-POL-03; E-LO-10 (this entry only) points at E-LO-01; E-LO-08 AND E-POL-02
   *  point at EACH OTHER (canon Example 3 is written from E-LO-08's perspective, `reuse_of: ['E-POL-02']`
   *  — the design's own §3.3 field comment marks this ONE pair with `↔` vs the other two's `→`, i.e. the
   *  ONLY symmetric pair). */
  readonly reuseOf?: readonly string[];
  /** E-LO-07 ONLY (canon: "Constant Hum substrate + The Off-Hours Drift" composite — §Mapping coverage
   *  matrix row E-LO-07). */
  readonly substrateComposed?: 'constant_hum';
}

// ── homeCategory lookup — derived from the 60-entry library, never re-declared ──────────────────────────
const ALL_LIBRARY_ENTRIES = [
  ...POLITICAL_TEMPLATE_LIBRARY,
  ...NEWS_BEAT_TEMPLATE_LIBRARY,
  ...RANDOM_WORLD_TEMPLATE_LIBRARY,
  ...RECRUITMENT_QUEST_TEMPLATE_LIBRARY,
  ...ACHIEVEMENT_TEMPLATE_LIBRARY,
  ...LIVE_OPS_TEMPLATE_LIBRARY,
];
const HOME_CATEGORY_BY_TEMPLATE_ID = new Map<string, TemplateCategory>(
  ALL_LIBRARY_ENTRIES.map((e) => [e.templateId, e.homeCategory]),
);

function homeCategoryOf(templateId: string): TemplateCategory {
  const category = HOME_CATEGORY_BY_TEMPLATE_ID.get(templateId);
  if (!category) {
    // Construction-time failure (module load), never a silent undefined — a Record/FLOW mapping that
    // points at a templateId absent from the 60-entry library is itself the drift this registry exists
    // to catch (mirrors the boot-throw posture of the rest of this lot).
    throw new Error(
      `EventTemplateMappingRegistry: templateId '${templateId}' not found in the 60-entry library — ` +
        `a Record/FLOW mapping references an id the library doesn't carry.`,
    );
  }
  return category;
}

// ── per-instantiation metadata the 2 Records don't carry (design §3.3) ───────────────────────────────────
const SEMANTIC_INVERSION_IDS: ReadonlySet<string> = new Set(['E-LO-06']);
const REUSE_OF_BY_INSTANTIATION_ID: Readonly<Record<string, readonly string[]>> = {
  'E-POL-04': ['E-POL-03'], // The Selective Notice, reused (E-POL-03 does NOT carry the reciprocal — single-direction, design §3.3)
  'E-LO-10': ['E-LO-01'], // Inspection Week, reused (E-LO-01 does NOT carry the reciprocal — single-direction)
  'E-LO-08': ['E-POL-02'], // Distribution Day — SYMMETRIC pair (canon §Example 3), see E-POL-02 below
  'E-POL-02': ['E-LO-08'], // Distribution Day — the OTHER half of the symmetric pair
};
const SUBSTRATE_COMPOSED_BY_INSTANTIATION_ID: Readonly<Record<string, 'constant_hum'>> = {
  'E-LO-07': 'constant_hum',
};

function buildEntry(
  instantiationId: string,
  kind: TemplateMappingEntry['kind'],
  templateId: string,
  hostCategory: TemplateCategory,
): TemplateMappingEntry {
  const templateHomeCategory = homeCategoryOf(templateId);
  return {
    instantiationId,
    kind,
    templateId,
    templateHomeCategory,
    hostCategory,
    crossCat: templateHomeCategory !== hostCategory,
    ...(SEMANTIC_INVERSION_IDS.has(instantiationId) ? { semanticInversion: true as const } : {}),
    ...(REUSE_OF_BY_INSTANTIATION_ID[instantiationId] ? { reuseOf: REUSE_OF_BY_INSTANTIATION_ID[instantiationId] } : {}),
    ...(SUBSTRATE_COMPOSED_BY_INSTANTIATION_ID[instantiationId]
      ? { substrateComposed: SUBSTRATE_COMPOSED_BY_INSTANTIATION_ID[instantiationId] }
      : {}),
  };
}

// ── the 22 launch-event mappings — DERIVED from the 2 imported Records, never re-declared (D5) ─────────
const POLITICAL_LAUNCH_ENTRIES: readonly TemplateMappingEntry[] = Object.entries(POLITICAL_TEMPLATE_REGISTRY).map(
  ([instantiationId, templateId]) => buildEntry(instantiationId, 'launch_event', templateId, TemplateCategory.POLITICAL),
);
const LIVE_OPS_LAUNCH_ENTRIES: readonly TemplateMappingEntry[] = Object.entries(LIVE_OPS_TEMPLATE_REGISTRY).map(
  ([instantiationId, templateId]) => buildEntry(instantiationId, 'launch_event', templateId, TemplateCategory.LIVE_OPS),
);

// ── the 3 flow-mappings — NEW this chunk (04f recruitment flows have no event-id Record anywhere) ───────
const FLOW_MAPPINGS: ReadonlyArray<{ instantiationId: string; templateId: string }> = [
  { instantiationId: 'FLOW-SALTLINE', templateId: 'the_stretch' }, // Apprentice intake — RecruitmentQuestComposer 'saltline'
  { instantiationId: 'FLOW-DEFECTOR', templateId: 'returning_hand' }, // Defector intake — 'defector'
  { instantiationId: 'FLOW-CIVILIAN', templateId: 'sudden_funeral' }, // Civilian intake — 'civilian'
];
const RECRUITMENT_FLOW_ENTRIES: readonly TemplateMappingEntry[] = FLOW_MAPPINGS.map((f) =>
  buildEntry(f.instantiationId, 'recruitment_flow', f.templateId, TemplateCategory.RECRUITMENT_QUEST),
);

/** The 25 instantiations, canon order (12 E-POL + 10 E-LO + 3 FLOW). */
const ALL_MAPPING_ENTRIES: readonly TemplateMappingEntry[] = [
  ...POLITICAL_LAUNCH_ENTRIES,
  ...LIVE_OPS_LAUNCH_ENTRIES,
  ...RECRUITMENT_FLOW_ENTRIES,
];

/** The 5 canon cross-cat instantiations (`chapter_map_and_reading.md §Cross-category reskins`) — the
 *  drift-alarm oracle §3.7.3 checks these against the DERIVED `crossCat` field (never re-derives them
 *  independently — if a 04e Record changed a binding, this list would stop being a subset). */
export const CANON_CROSS_CAT_INSTANTIATION_IDS: readonly string[] = ['E-POL-02', 'E-POL-05', 'E-POL-09', 'E-LO-03', 'E-LO-06'];

/** All 25 instantiations, canon order. */
export function allMappings(): readonly TemplateMappingEntry[] {
  return ALL_MAPPING_ENTRIES;
}

/** `EventTemplateMappingRegistry.lookupByEventId` (canon name verbatim, `template_launch_event_mapping.md`
 *  §Example 1/2/3 — the "ByEventId" name covers FLOW-* too, canon naming, not renamed here). `undefined`
 *  if `instantiationId` is not one of the 25 (controller maps this to 404). */
export function lookupByEventId(instantiationId: string): TemplateMappingEntry | undefined {
  return ALL_MAPPING_ENTRIES.find((e) => e.instantiationId === instantiationId);
}

/** Every instantiation of one templateId (0, 1, or 2 — only the 3 reuse pairs return 2). */
export function instantiationsOf(templateId: string): readonly TemplateMappingEntry[] {
  return ALL_MAPPING_ENTRIES.filter((e) => e.templateId === templateId);
}

/** The distinct templateIds touched by the 25 instantiations — 22 (25 − 3 reuses collapse: `selective_
 *  notice`, `inspection_week`, `distribution_day` each counted once despite 2 instantiations apiece). Does
 *  NOT include `constant_hum` (the +1 substrate is counted separately, §3.7.4 arithmetic — `constant_hum`
 *  is never a Record value nor a FLOW mapping target). */
export function mappedDistinctTemplateIds(): readonly string[] {
  return Array.from(new Set(ALL_MAPPING_ENTRIES.map((e) => e.templateId)));
}
