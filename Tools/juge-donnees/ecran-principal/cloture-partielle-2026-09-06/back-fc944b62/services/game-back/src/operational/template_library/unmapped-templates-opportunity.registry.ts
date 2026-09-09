// IMPLEMENTS: docs/superpowers/plans/2026-07-17-04g-D-meta-layer-plan.md C2 (unmapped-templates-
//             opportunity.registry.ts — 34 ship-ready + 3 trash derivation + joint count×days alert)
//             Design: docs/superpowers/specs/2026-07-17-04g-D-meta-layer-design.md §3.4
//             Canon: docs/tech/04g_ambient_world_events_templates/template_launch_event_mapping.md
//             §Unmapped reconciliation (34+3 list) + §Counts reconciled (23+34+3=60) ;
//             docs/tech/04g_ambient_world_events_templates/political_templates.md §Scenario C
//             (`unmapped_opportunity_count_exceeded`) + §Tunables touchés (joint COUNT × DAYS gating,
//             "Ni l'un ni l'autre seul ne déclenche").
//             — 04g-D C2 — 2026-07-17
//
// `UnmappedTemplatesOpportunityRegistry` (`gdd/15:1920`) — the 34 ship-ready + 3 trash backlog, and the
// per-category joint alert. EVERYTHING here is DERIVED at call-time from the library (§3.2) minus the
// mapped set (`event-template-mapping-registry.ts`) — zero storage, zero drift possible between library /
// mapping / opportunity (design §3.4 "Tout est DÉRIVÉ, rien n'est stocké").
//
// <!-- LOVED: cooper_affair (4.70 ❤️) + sourceless_beat (4.60 ❤️) + sideways_failure (4.55 ❤️) +
//      what_he_brought_with_him (4.50 ❤️) + slow_hand (templateId `the_slow_hand`, 4.40 ❤️) — 5 of the 8
//      canon keystones surface here as ship-ready-unmapped (this registry IS their content-authoring
//      backlog entry, `template_launch_event_mapping.md` §Unmapped reconciliation lists all 5 with ❤️).
//      Forwarded from their owning registry file (D9 — not re-declared here, this file only DERIVES
//      membership by filtering, never re-types template data). -->

import { TemplateCategory } from './template-category';
import type { TemplateLibraryEntry } from './template-library-entry';
import { POLITICAL_TEMPLATE_LIBRARY } from './political-template-library';
import { LIVE_OPS_TEMPLATE_LIBRARY } from './live-ops-template-library';
import { RECRUITMENT_QUEST_TEMPLATE_LIBRARY } from './recruitment-quest-template-library';
import { ACHIEVEMENT_TEMPLATE_LIBRARY } from './achievement-template-library';
import { NEWS_BEAT_TEMPLATE_LIBRARY } from './news-beat-template-library.adapter';
import { RANDOM_WORLD_TEMPLATE_LIBRARY } from './random-world-template-library.adapter';
import { mappedDistinctTemplateIds } from './event-template-mapping-registry';
import {
  templateLibraryTunables,
  politicalTemplatesReskinTunables,
  newsBeatsReskinTunables,
  randomWorldReskinTunables,
  recruitmentQuestReskinTunables,
  liveOpsTemplatesReskinTunables,
  achievementReskinTunables,
} from './template-library.tunables';

/** Category order mirrors `TemplateLibraryService`'s own `CATEGORY_ORDER` (§3.7.1 breakdown citation
 *  order) — never re-ordered ad hoc, this is the SAME order `summary()`/health breakdowns use. */
const CATEGORY_ORDER: readonly TemplateCategory[] = [
  TemplateCategory.POLITICAL,
  TemplateCategory.NEWS_BEAT,
  TemplateCategory.RANDOM_WORLD,
  TemplateCategory.RECRUITMENT_QUEST,
  TemplateCategory.ACHIEVEMENT_STRUCTURE,
  TemplateCategory.LIVE_OPS,
];

const BY_CATEGORY: ReadonlyMap<TemplateCategory, readonly TemplateLibraryEntry[]> = new Map([
  [TemplateCategory.POLITICAL, POLITICAL_TEMPLATE_LIBRARY],
  [TemplateCategory.NEWS_BEAT, NEWS_BEAT_TEMPLATE_LIBRARY],
  [TemplateCategory.RANDOM_WORLD, RANDOM_WORLD_TEMPLATE_LIBRARY],
  [TemplateCategory.RECRUITMENT_QUEST, RECRUITMENT_QUEST_TEMPLATE_LIBRARY],
  [TemplateCategory.ACHIEVEMENT_STRUCTURE, ACHIEVEMENT_TEMPLATE_LIBRARY],
  [TemplateCategory.LIVE_OPS, LIVE_OPS_TEMPLATE_LIBRARY],
]);

function allEntries(): readonly TemplateLibraryEntry[] {
  return CATEGORY_ORDER.flatMap((category) => BY_CATEGORY.get(category) ?? []);
}

/** Ship-ready entries NOT among the 22 mapped-distinct templateIds (§3.4 — 34 total, canon-verified
 *  category split 2/11/10/5/5/1). `constant_hum` is never in here: its `disposition` is `substrate`, not
 *  `ship_ready`, so it is excluded regardless of the mapped-set membership test. */
export function unmappedShipReady(): readonly TemplateLibraryEntry[] {
  const mappedIds = new Set(mappedDistinctTemplateIds());
  return allEntries().filter((e) => e.disposition === 'ship_ready' && !mappedIds.has(e.templateId));
}

/** The 3 CUT-for-posterity entries (`the_long_stand`/`punishment_drift`/`quiet_week`), hors dénominateur
 *  ship-ready — design §3.4. */
export function trashForPosterity(): readonly TemplateLibraryEntry[] {
  return allEntries().filter((e) => e.disposition === 'trash');
}

/** `unmappedShipReady()` grouped by `homeCategory`, `CATEGORY_ORDER` — backs `<UnmappedTemplatesOpportunity>`
 *  (C5) and this file's own per-category count/alert logic. */
export function unmappedShipReadyByCategory(): ReadonlyMap<TemplateCategory, readonly TemplateLibraryEntry[]> {
  const unmapped = unmappedShipReady();
  return new Map(CATEGORY_ORDER.map((category) => [category, unmapped.filter((e) => e.homeCategory === category)]));
}

function countByCategory(entries: readonly TemplateLibraryEntry[]): Record<TemplateCategory, number> {
  const counts = {} as Record<TemplateCategory, number>;
  for (const category of CATEGORY_ORDER) counts[category] = entries.filter((e) => e.homeCategory === category).length;
  return counts;
}

/** Ship-ready-unmapped count per category (2/11/10/5/5/1, §3.7.4 breakdown). */
export function shipReadyUnmappedCountByCategory(): Readonly<Record<TemplateCategory, number>> {
  return countByCategory(unmappedShipReady());
}

/** Trash count per category (0/0/0/0/1/2, §3.7.4 breakdown). */
export function trashCountByCategory(): Readonly<Record<TemplateCategory, number>> {
  return countByCategory(trashForPosterity());
}

/** Mapped-distinct count per category — an entry counts as "mapped" for its OWN homeCategory if its
 *  templateId is one of the 22 mapped-distinct ids OR its disposition is `substrate` (the +1 constant_hum
 *  counts in LIVE_OPS's own "4 mapped (incl. Constant Hum substrate)" — canon §Mapped vs available
 *  templates summary, LIVE-OPS row). Sums to 9/1/4/5/0/4 (§3.7.4 breakdown), total 23. */
export function mappedCountByCategory(): Readonly<Record<TemplateCategory, number>> {
  const mappedIds = new Set(mappedDistinctTemplateIds());
  const mapped = allEntries().filter((e) => mappedIds.has(e.templateId) || e.disposition === 'substrate');
  return countByCategory(mapped);
}

/** Σ of `mappedCountByCategory()` — 23 (22 mapped-distinct + 1 substrate). */
export function mappedDistinctCount(): number {
  return CATEGORY_ORDER.reduce((sum, category) => sum + mappedCountByCategory()[category], 0);
}

// ── the joint count × days alert (§3.4 — real-clock read-time, ZERO tick) ────────────────────────────────

/** Date the 60-template library was canon-authored (`template_launch_event_mapping.md` §Unmapped
 *  reconciliation — "les 34 sont unmapped DEPUIS que la library existe"). No per-template "became
 *  unmapped" timestamp is persisted anywhere this lot (no ledger row backs it) — every unmapped ship-ready
 *  template shares this SAME age, which is the canon-honest reading of "days-age évalué par template" when
 *  no per-template clock exists (political_templates.md:184): each template's OWN age independently equals
 *  this constant, so the per-category aggregate age is this same value too — never a fabricated per-row
 *  timestamp. */
export const LIBRARY_EPOCH: Date = new Date('2026-05-23T00:00:00.000Z');

/** Days elapsed since `LIBRARY_EPOCH` — real clock, read-time (design §3.4 "évaluée à la LECTURE, AUCUN
 *  tick"). `now` is an injectable seam for tests that don't want to depend on wall-clock non-determinism;
 *  production call sites never pass it (defaults to `new Date()`). */
export function ageDaysSinceLibraryEpoch(now: Date = new Date()): number {
  return Math.floor((now.getTime() - LIBRARY_EPOCH.getTime()) / 86_400_000);
}

/** `unmapped_opportunity_count_exceeded` — canon `political_templates.md` §Scenario C verbatim kind. */
export type UnmappedOpportunityAlertKind = 'unmapped_opportunity_count_exceeded';

export interface UnmappedCategoryAlertState {
  readonly category: TemplateCategory;
  readonly unmappedCount: number;
  readonly countThreshold: number;
  readonly countGate: boolean;
  readonly ageDays: number;
  readonly daysThreshold: number;
  readonly daysGate: boolean;
  /** = `countGate && daysGate` (canon: "Ni l'un ni l'autre seul ne déclenche" — joint, never OR). */
  readonly fires: boolean;
  readonly alertKind: UnmappedOpportunityAlertKind;
}

/** Count-gate threshold getter per category — POLITICAL REUSE (canon key), the other 5 NEW this lot (C1,
 *  D8 — mirror political's default 3). */
const COUNT_THRESHOLD_GETTER_BY_CATEGORY: Readonly<Record<TemplateCategory, () => number>> = {
  [TemplateCategory.POLITICAL]: () => politicalTemplatesReskinTunables.unmappedOpportunityAlertThreshold,
  [TemplateCategory.NEWS_BEAT]: () => newsBeatsReskinTunables.unmappedOpportunityAlertThreshold,
  [TemplateCategory.RANDOM_WORLD]: () => randomWorldReskinTunables.unmappedOpportunityAlertThreshold,
  [TemplateCategory.RECRUITMENT_QUEST]: () => recruitmentQuestReskinTunables.unmappedOpportunityAlertThreshold,
  [TemplateCategory.ACHIEVEMENT_STRUCTURE]: () => achievementReskinTunables.unmappedOpportunityAlertThreshold,
  [TemplateCategory.LIVE_OPS]: () => liveOpsTemplatesReskinTunables.unmappedOpportunityAlertThreshold,
};

/** Days-gate threshold getter per category — GLOBAL `template_library.*` for 5 categories;
 *  RECRUITMENT_QUEST honors its own pre-existing override key (design §3.4/D8, gdd/14:1874). */
function daysThresholdFor(category: TemplateCategory): number {
  return category === TemplateCategory.RECRUITMENT_QUEST
    ? recruitmentQuestReskinTunables.unmappedOpportunityAlertThresholdDays
    : templateLibraryTunables.unmappedOpportunityAlertThresholdDays;
}

/** The 6 per-category alert states (§3.4). `now` is the same test seam as `ageDaysSinceLibraryEpoch`. */
export function alertStates(now: Date = new Date()): readonly UnmappedCategoryAlertState[] {
  const unmappedCounts = shipReadyUnmappedCountByCategory();
  const ageDays = ageDaysSinceLibraryEpoch(now);
  return CATEGORY_ORDER.map((category) => {
    const unmappedCount = unmappedCounts[category];
    const countThreshold = COUNT_THRESHOLD_GETTER_BY_CATEGORY[category]();
    const daysThreshold = daysThresholdFor(category);
    const countGate = unmappedCount >= countThreshold;
    const daysGate = ageDays >= daysThreshold;
    return {
      category,
      unmappedCount,
      countThreshold,
      countGate,
      ageDays,
      daysThreshold,
      daysGate,
      fires: countGate && daysGate,
      alertKind: 'unmapped_opportunity_count_exceeded',
    };
  });
}
