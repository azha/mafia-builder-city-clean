// IMPLEMENTS: docs/superpowers/plans/2026-07-17-04g-D-meta-layer-plan.md C1 (TemplateLibraryService +
//             boot assertions §3.7.1-2) + C2 (§3.7.3-4 — mapping identity + arithmetic reconciled 23/34/3,
//             `mapping()`/`unmapped()` accessors)
//             Design: docs/superpowers/specs/2026-07-17-04g-D-meta-layer-design.md §3.7 (boot
//             assertions — the contrat arithmétique canon, exécutable)
//             — 04g-D C1/C2 — 2026-07-17
//
// `TemplateLibraryService` — aggregates the 6 registries (4 NEW + 2 REUSE adapters) into the 60-template
// library and asserts the FULL canon contract (§3.7.1-4, C1+C2) at `OnApplicationBootstrap` (BEFORE the
// C3 AntiFOMO boot scan, design §3.7 ordering note — this lot ships no AntiFOMO yet, so that ordering is
// aspirational documentation for the C3 chunk, not enforced by THIS file). Each assertion failure THROWS
// — NestJS bootstrap fails, the process never serves with a broken library (mirrors
// `NewsBeatBootGuardService`'s own "throw = boot fails" posture).
//
// ★ LOVED summary (R1.2 — this file asserts the exact count of all 8 canon keystones, cf. umbrella §3.5 /
// `chapter_map_and_reading.md` §Loved-ideas grep): `selective_notice` (political), `cooper_affair` +
// `sourceless_beat` (news-beat, REUSE), `sideways_failure` (random-world, REUSE), `the_stretch` +
// `what_he_brought_with_him` (recruitment-quest), `slow_hand` (achievement, templateId `the_slow_hand`),
// `constant_hum` (live-ops) — 8 total, `flag: 'loved'`. The boot assertion below is the FALSIFIABLE proof
// that all 8 exist and no 9th was silently introduced.
//
// C2 ADDS (§3.7.3-4, `event-template-mapping-registry.ts` + `unmapped-templates-opportunity.registry.ts`
// now exist): 25 instantiations count + identity of the 22 launch mappings vs the 2 imported Records +
// every mapped templateId ∈ library + the 5 canon cross-cat instantiations ⊆ derived crossCat-true set ;
// arithmetic reconciled mapped-distinct=23 / ship-ready-unmapped=34 / trash=3 / total=60 + the per-category
// breakdown (9/1/4/5/0/4 · 2/11/10/5/5/1 · 0/0/0/0/1/2).
//
// ★ C3 note (this file is UNCHANGED — deliberately NOT wired to AntiFomoValidator): `AntiFomoValidator`'s
// DB-backed half needs `@Inject(DB)` on its constructor, which Playwright's esbuild-based TS transform
// cannot parse ("Decorators cannot be used to decorate parameters" — verified by direct reproduction) —
// ANY file this class (or `TemplateInstantiationValidator`, which depends on it) is imported into,
// transitively, becomes unloadable by a Playwright spec. `template_library_registry.spec.ts` (THIS file's
// own C1 direct-import pure-module test) would break. So the AntiFOMO wiring lives ONE LAYER UP, in
// `TemplateLibraryAdminController` (never directly imported by any spec — only exercised over HTTP): its
// `health()` handler merges `this.library.health()` (this file, unchanged) with a separately-injected
// `AntiFomoValidator.bootScan()`. The §3.7 "library assertions before AntiFOMO scan" ordering is achieved
// via `TemplateLibraryModule`'s provider ARRAY ORDER (`TemplateLibraryService` listed before
// `AntiFomoValidator` — NestJS instantiates/bootstraps providers in that order absent an explicit DI
// dependency) rather than a single guaranteed sequential method call — see `anti-fomo-validator.service.ts`
// header for the full writeup.

import { Injectable, OnApplicationBootstrap } from '@nestjs/common';

import { TemplateCategory } from './template-category';
import type { TemplateLibraryEntry } from './template-library-entry';
import { POLITICAL_TEMPLATE_LIBRARY } from './political-template-library';
import { LIVE_OPS_TEMPLATE_LIBRARY } from './live-ops-template-library';
import { POLITICAL_TEMPLATE_REGISTRY } from '../political/political-template-id';
import { LIVE_OPS_TEMPLATE_REGISTRY } from '../liveops/live-ops-template-id';
import { RECRUITMENT_QUEST_TEMPLATE_LIBRARY } from './recruitment-quest-template-library';
import { ACHIEVEMENT_TEMPLATE_LIBRARY } from './achievement-template-library';
import { NEWS_BEAT_TEMPLATE_LIBRARY } from './news-beat-template-library.adapter';
import { RANDOM_WORLD_TEMPLATE_LIBRARY } from './random-world-template-library.adapter';
import { templateLibraryTunables } from './template-library.tunables';
// Aliased on import (not the bare canon names) — this class exposes its OWN same-named public methods
// below (`allMappings()`/`unmappedShipReady()`/`trashForPosterity()`, mirroring the controller-delegates-
// to-service pattern) ; aliasing here removes any ambiguity about which one a bare call inside this file
// resolves to (unqualified calls DO correctly reach the imports, not the methods — methods are only
// reachable via `this.` — but the identical names invite a misreading, so this file avoids them).
import {
  allMappings as allMappingEntries,
  lookupByEventId,
  CANON_CROSS_CAT_INSTANTIATION_IDS,
  type TemplateMappingEntry,
} from './event-template-mapping-registry';
import {
  unmappedShipReady as unmappedShipReadyEntries,
  trashForPosterity as trashForPosterityEntries,
  mappedDistinctCount,
  mappedCountByCategory,
  shipReadyUnmappedCountByCategory,
  trashCountByCategory,
  alertStates,
  type UnmappedCategoryAlertState,
} from './unmapped-templates-opportunity.registry';

/** Category order mirrors the design §3.7.1 breakdown citation order (9/1/4/5/0/4 etc — POLITICAL,
 *  NEWS_BEAT, RANDOM_WORLD, RECRUITMENT_QUEST, ACHIEVEMENT_STRUCTURE, LIVE_OPS) — the SAME order the
 *  `summary()` response uses, never re-ordered ad hoc. */
const CATEGORY_ORDER: readonly TemplateCategory[] = [
  TemplateCategory.POLITICAL,
  TemplateCategory.NEWS_BEAT,
  TemplateCategory.RANDOM_WORLD,
  TemplateCategory.RECRUITMENT_QUEST,
  TemplateCategory.ACHIEVEMENT_STRUCTURE,
  TemplateCategory.LIVE_OPS,
];

/** The 8 canon keystone templateIds (umbrella §3.5 `loved_ideas.json`) — used ONLY to assert the boot
 *  invariant "exactly these 8 carry flag:'loved', no more, no fewer" (never used to DERIVE the flag —
 *  each registry's own `flag: 'loved'` literal is the source of truth; this list is the independent
 *  falsifiable oracle the assertion checks it against). */
const EXPECTED_LOVED_TEMPLATE_IDS: readonly string[] = [
  'selective_notice',
  'cooper_affair',
  'sourceless_beat',
  'sideways_failure',
  'the_stretch',
  'what_he_brought_with_him',
  'the_slow_hand',
  'constant_hum',
].sort();

export interface TemplateLibrarySummary {
  POLITICAL: number;
  NEWS_BEAT: number;
  RANDOM_WORLD: number;
  RECRUITMENT_QUEST: number;
  ACHIEVEMENT_STRUCTURE: number;
  LIVE_OPS: number;
  total: number;
}

/** §3.7.4 arithmetic — mapped-distinct=23 / ship-ready-unmapped=34 / trash=3 / total=60, plus the
 *  per-category breakdown (9/1/4/5/0/4 · 2/11/10/5/5/1 · 0/0/0/0/1/2). */
export interface TemplateLibraryMappingArithmetic {
  instantiationsCount: number;
  mappedDistinct: number;
  shipReadyUnmapped: number;
  trash: number;
  total: number;
  breakdown: {
    mappedByCategory: Record<TemplateCategory, number>;
    shipReadyUnmappedByCategory: Record<TemplateCategory, number>;
    trashByCategory: Record<TemplateCategory, number>;
  };
}

export interface TemplateLibraryHealth {
  assertions: 'passed';
  counts: TemplateLibrarySummary;
  uniqueTemplateIdCount: number;
  substrateCount: number;
  trashCount: number;
  lovedCount: number;
  /** C2 — §3.7.4 arithmetic proof, exposed for E2E falsifiability (never claimed before C2 existed). */
  mapping: TemplateLibraryMappingArithmetic;
}

@Injectable()
export class TemplateLibraryService implements OnApplicationBootstrap {
  private readonly byCategory: ReadonlyMap<TemplateCategory, readonly TemplateLibraryEntry[]> = new Map([
    [TemplateCategory.POLITICAL, POLITICAL_TEMPLATE_LIBRARY],
    [TemplateCategory.NEWS_BEAT, NEWS_BEAT_TEMPLATE_LIBRARY],
    [TemplateCategory.RANDOM_WORLD, RANDOM_WORLD_TEMPLATE_LIBRARY],
    [TemplateCategory.RECRUITMENT_QUEST, RECRUITMENT_QUEST_TEMPLATE_LIBRARY],
    [TemplateCategory.ACHIEVEMENT_STRUCTURE, ACHIEVEMENT_TEMPLATE_LIBRARY],
    [TemplateCategory.LIVE_OPS, LIVE_OPS_TEMPLATE_LIBRARY],
  ]);

  /** All 60 entries, category order (`CATEGORY_ORDER`). */
  allEntries(): readonly TemplateLibraryEntry[] {
    return CATEGORY_ORDER.flatMap((category) => this.byCategory.get(category) ?? []);
  }

  /** Entries for one category, or `undefined` if `category` is not one of the 6 canon members (the
   *  controller maps `undefined` to 422 — C1 acceptance "GET library?category=BOGUS → 422"). */
  entriesByCategory(category: string): readonly TemplateLibraryEntry[] | undefined {
    if (!CATEGORY_ORDER.includes(category as TemplateCategory)) return undefined;
    return this.byCategory.get(category as TemplateCategory) ?? [];
  }

  summary(): TemplateLibrarySummary {
    const counts = this.countsByCategory();
    return { ...counts, total: this.allEntries().length };
  }

  health(): TemplateLibraryHealth {
    const entries = this.allEntries();
    return {
      assertions: 'passed', // boot already threw if this were false — reaching a live request proves it
      counts: this.summary(),
      uniqueTemplateIdCount: new Set(entries.map((e) => e.templateId)).size,
      substrateCount: entries.filter((e) => e.disposition === 'substrate').length,
      trashCount: entries.filter((e) => e.disposition === 'trash').length,
      lovedCount: entries.filter((e) => e.flag === 'loved').length,
      mapping: this.mappingArithmetic(),
    };
  }

  private mappingArithmetic(): TemplateLibraryMappingArithmetic {
    const shipReadyUnmapped = unmappedShipReadyEntries().length;
    const trash = trashForPosterityEntries().length;
    const mappedDistinct = mappedDistinctCount();
    return {
      instantiationsCount: allMappingEntries().length,
      mappedDistinct,
      shipReadyUnmapped,
      trash,
      total: mappedDistinct + shipReadyUnmapped + trash,
      breakdown: {
        mappedByCategory: mappedCountByCategory() as Record<TemplateCategory, number>,
        shipReadyUnmappedByCategory: shipReadyUnmappedCountByCategory() as Record<TemplateCategory, number>,
        trashByCategory: trashCountByCategory() as Record<TemplateCategory, number>,
      },
    };
  }

  // ─── C2 — mapping + unmapped-opportunity accessors (controller delegates, mirrors C1's own posture) ──

  /** The 25 `TemplateMappingEntry` instantiations, canon order. */
  allMappings(): readonly TemplateMappingEntry[] {
    return allMappingEntries();
  }

  /** `undefined` if `instantiationId` is not one of the 25 (controller maps this to 404). */
  lookupMappingByEventId(instantiationId: string): TemplateMappingEntry | undefined {
    return lookupByEventId(instantiationId);
  }

  /** The 34 ship-ready-unmapped entries. */
  unmappedShipReady(): readonly TemplateLibraryEntry[] {
    return unmappedShipReadyEntries();
  }

  /** The 3 trash-for-posterity entries. */
  trashForPosterity(): readonly TemplateLibraryEntry[] {
    return trashForPosterityEntries();
  }

  /** The 6 per-category joint count×days alert states (§3.4). */
  unmappedAlertStates(): readonly UnmappedCategoryAlertState[] {
    return alertStates();
  }

  private countsByCategory(): Omit<TemplateLibrarySummary, 'total'> {
    const counts: Record<string, number> = {};
    for (const category of CATEGORY_ORDER) counts[category] = this.byCategory.get(category)?.length ?? 0;
    return counts as unknown as Omit<TemplateLibrarySummary, 'total'>;
  }

  onApplicationBootstrap(): void {
    this.assertCategoryCountsAndTotal();
    this.assertGlobalUniquenessAndDispositionCounts();
    this.assertMappingIdentityAndCrossCat();
    this.assertArithmeticReconciled();
  }

  // ── §3.7.1: counts par catégorie + total vs tunable ─────────────────────────────────────────────────
  private assertCategoryCountsAndTotal(): void {
    const expected: Omit<TemplateLibrarySummary, 'total'> = {
      POLITICAL: 11,
      NEWS_BEAT: 12,
      RANDOM_WORLD: 14,
      RECRUITMENT_QUEST: 10,
      ACHIEVEMENT_STRUCTURE: 6,
      LIVE_OPS: 7,
    };
    const actual = this.countsByCategory();
    for (const category of CATEGORY_ORDER) {
      if (actual[category] !== expected[category]) {
        throw new Error(
          `TemplateLibraryService boot assertion FAILED: category ${category} has ${actual[category]} ` +
            `entries, expected ${expected[category]} (design §3.7.1).`,
        );
      }
    }
    const total = this.allEntries().length;
    const tunableTotal = templateLibraryTunables.totalTemplatesCanonical;
    if (total !== tunableTotal) {
      throw new Error(
        `TemplateLibraryService boot assertion FAILED: computed total ${total} !== ` +
          `template_library.total_templates_canonical (${tunableTotal}) — design §3.7.1.`,
      );
    }
    if (total !== 60) {
      throw new Error(`TemplateLibraryService boot assertion FAILED: computed total ${total} !== 60.`);
    }
  }

  // ── §3.7.2: unicité globale + exactement 1 substrate + 3 trash + 8 loved ────────────────────────────
  private assertGlobalUniquenessAndDispositionCounts(): void {
    const entries = this.allEntries();
    const ids = entries.map((e) => e.templateId);
    const uniqueIds = new Set(ids);
    if (uniqueIds.size !== ids.length) {
      const seen = new Set<string>();
      const duplicates = ids.filter((id) => (seen.has(id) ? true : (seen.add(id), false)));
      throw new Error(
        `TemplateLibraryService boot assertion FAILED: ${ids.length - uniqueIds.size} duplicate ` +
          `templateId(s) across the 60-entry library: ${duplicates.join(', ')} (design §3.7.2).`,
      );
    }

    const substrateEntries = entries.filter((e) => e.disposition === 'substrate');
    if (substrateEntries.length !== 1) {
      throw new Error(
        `TemplateLibraryService boot assertion FAILED: ${substrateEntries.length} substrate entries, ` +
          `expected exactly 1 (design §3.7.2, constant_hum).`,
      );
    }

    const trashEntries = entries.filter((e) => e.disposition === 'trash');
    if (trashEntries.length !== 3) {
      throw new Error(
        `TemplateLibraryService boot assertion FAILED: ${trashEntries.length} trash entries, expected ` +
          `exactly 3 (design §3.7.2 — the_long_stand/punishment_drift/quiet_week).`,
      );
    }
    for (const entry of trashEntries) {
      if (!entry.trashReason || entry.trashReason.length === 0) {
        throw new Error(
          `TemplateLibraryService boot assertion FAILED: trash entry '${entry.templateId}' has no ` +
            `trashReason (anti-fig-leaf, design §3.1).`,
        );
      }
    }

    const lovedEntries = entries.filter((e) => e.flag === 'loved');
    const lovedIds = lovedEntries.map((e) => e.templateId).sort();
    if (lovedEntries.length !== 8 || JSON.stringify(lovedIds) !== JSON.stringify(EXPECTED_LOVED_TEMPLATE_IDS)) {
      throw new Error(
        `TemplateLibraryService boot assertion FAILED: loved templateIds ${JSON.stringify(lovedIds)} !== ` +
          `expected 8 keystones ${JSON.stringify(EXPECTED_LOVED_TEMPLATE_IDS)} (design §3.7.2, umbrella §3.5).`,
      );
    }

    // Anti-fig-leaf: every non-trash `registry_only` entry MUST carry a non-empty registryOnlyReason.
    for (const entry of entries) {
      if (entry.runtime === 'registry_only' && entry.disposition !== 'trash') {
        if (!entry.registryOnlyReason || entry.registryOnlyReason.length === 0) {
          throw new Error(
            `TemplateLibraryService boot assertion FAILED: registry_only entry '${entry.templateId}' ` +
              `has no registryOnlyReason (anti-fig-leaf, design §3.1).`,
          );
        }
      }
    }
  }

  // ── §3.7.3 (C2): 25 instantiations + identity vs the 2 Records + every mapped id ∈ library + the 5 ────
  // ── canon cross-cat instantiations ⊆ derived crossCat-true set ──────────────────────────────────────
  private assertMappingIdentityAndCrossCat(): void {
    const mappings = allMappingEntries();
    if (mappings.length !== 25) {
      throw new Error(
        `TemplateLibraryService boot assertion FAILED: ${mappings.length} mapping instantiations, ` +
          `expected exactly 25 (design §3.7.3 — 22 launch + 3 recruitment flows).`,
      );
    }
    const launchCount = mappings.filter((m) => m.kind === 'launch_event').length;
    if (launchCount !== 22) {
      throw new Error(
        `TemplateLibraryService boot assertion FAILED: ${launchCount} launch_event instantiations, ` +
          `expected exactly 22 (12 E-POL + 10 E-LO, design §3.7.3).`,
      );
    }
    const flowCount = mappings.filter((m) => m.kind === 'recruitment_flow').length;
    if (flowCount !== 3) {
      throw new Error(
        `TemplateLibraryService boot assertion FAILED: ${flowCount} recruitment_flow instantiations, ` +
          `expected exactly 3 (FLOW-SALTLINE/FLOW-DEFECTOR/FLOW-CIVILIAN, design §3.7.3).`,
      );
    }

    // Identity vs the 2 imported Records (redundant oracle — by construction this always holds, mirrors
    // the C1 "manual re-sum" idiom, precedent C1-SVC-6): every E-POL-*/E-LO-* key resolves via
    // `lookupByEventId` to the SAME templateId the Record itself declares.
    for (const [instantiationId, templateId] of Object.entries(POLITICAL_TEMPLATE_REGISTRY)) {
      if (lookupByEventId(instantiationId)?.templateId !== templateId) {
        throw new Error(
          `TemplateLibraryService boot assertion FAILED: mapping identity broken for '${instantiationId}' ` +
            `— POLITICAL_TEMPLATE_REGISTRY says '${templateId}', lookupByEventId disagrees (design §3.7.3).`,
        );
      }
    }
    for (const [instantiationId, templateId] of Object.entries(LIVE_OPS_TEMPLATE_REGISTRY)) {
      if (lookupByEventId(instantiationId)?.templateId !== templateId) {
        throw new Error(
          `TemplateLibraryService boot assertion FAILED: mapping identity broken for '${instantiationId}' ` +
            `— LIVE_OPS_TEMPLATE_REGISTRY says '${templateId}', lookupByEventId disagrees (design §3.7.3).`,
        );
      }
    }

    // Every mapped templateId must exist in the 60-entry library.
    const libraryIds = new Set(this.allEntries().map((e) => e.templateId));
    for (const m of mappings) {
      if (!libraryIds.has(m.templateId)) {
        throw new Error(
          `TemplateLibraryService boot assertion FAILED: mapping instantiation '${m.instantiationId}' ` +
            `points at templateId '${m.templateId}', not found in the 60-entry library (design §3.7.3).`,
        );
      }
    }

    // The 5 canon cross-cat instantiations ⊆ the DERIVED crossCat-true set (drift alarm — if a 04e
    // Record changed a binding, one of these would stop being crossCat:true).
    for (const instantiationId of CANON_CROSS_CAT_INSTANTIATION_IDS) {
      const entry = mappings.find((m) => m.instantiationId === instantiationId);
      if (!entry || !entry.crossCat) {
        throw new Error(
          `TemplateLibraryService boot assertion FAILED: canon cross-cat instantiation '${instantiationId}' ` +
            `is missing or not derived as crossCat:true (design §3.7.3, chapter_map_and_reading.md §Cross-` +
            `category reskins).`,
        );
      }
    }
  }

  // ── §3.7.4 (C2): arithmetic reconciled — mapped-distinct=23 / ship-ready-unmapped=34 / trash=3 / ──────
  // ── total=60, breakdown per category (9/1/4/5/0/4 · 2/11/10/5/5/1 · 0/0/0/0/1/2) ────────────────────
  private assertArithmeticReconciled(): void {
    assertMappingArithmeticReconciled({
      mappedDistinct: mappedDistinctCount(),
      shipReadyUnmapped: unmappedShipReadyEntries().length,
      trash: trashForPosterityEntries().length,
      mappedByCategory: mappedCountByCategory(),
      shipReadyUnmappedByCategory: shipReadyUnmappedCountByCategory(),
      trashByCategory: trashCountByCategory(),
    });
  }
}

/** §3.7.4 input shape — the raw counts `assertMappingArithmeticReconciled` checks. Exported as a PURE
 *  function (not a private class method) SPECIFICALLY so an E2E spec can call it with a deliberately
 *  wrong count and observe the throw — the falsifiability proof the plan's C2 acceptance floor demands
 *  ("mutate a count → boot throws") without needing to monkey-patch the read-only production registries
 *  (`political-template-library.ts` etc. are frozen `const` arrays, not mutable test fixtures). The
 *  INSTANCE method above calls this SAME function with the REAL registry-derived counts — it is not a
 *  parallel/duplicate check, it IS the boot check. */
export interface MappingArithmeticInput {
  mappedDistinct: number;
  shipReadyUnmapped: number;
  trash: number;
  mappedByCategory: Record<TemplateCategory, number>;
  shipReadyUnmappedByCategory: Record<TemplateCategory, number>;
  trashByCategory: Record<TemplateCategory, number>;
}

const EXPECTED_MAPPED_BY_CATEGORY: Record<TemplateCategory, number> = {
  [TemplateCategory.POLITICAL]: 9,
  [TemplateCategory.NEWS_BEAT]: 1,
  [TemplateCategory.RANDOM_WORLD]: 4,
  [TemplateCategory.RECRUITMENT_QUEST]: 5,
  [TemplateCategory.ACHIEVEMENT_STRUCTURE]: 0,
  [TemplateCategory.LIVE_OPS]: 4,
};
const EXPECTED_SHIP_READY_UNMAPPED_BY_CATEGORY: Record<TemplateCategory, number> = {
  [TemplateCategory.POLITICAL]: 2,
  [TemplateCategory.NEWS_BEAT]: 11,
  [TemplateCategory.RANDOM_WORLD]: 10,
  [TemplateCategory.RECRUITMENT_QUEST]: 5,
  [TemplateCategory.ACHIEVEMENT_STRUCTURE]: 5,
  [TemplateCategory.LIVE_OPS]: 1,
};
const EXPECTED_TRASH_BY_CATEGORY: Record<TemplateCategory, number> = {
  [TemplateCategory.POLITICAL]: 0,
  [TemplateCategory.NEWS_BEAT]: 0,
  [TemplateCategory.RANDOM_WORLD]: 0,
  [TemplateCategory.RECRUITMENT_QUEST]: 0,
  [TemplateCategory.ACHIEVEMENT_STRUCTURE]: 1,
  [TemplateCategory.LIVE_OPS]: 2,
};

export function assertMappingArithmeticReconciled(input: MappingArithmeticInput): void {
  if (input.mappedDistinct !== 23) {
    throw new Error(
      `TemplateLibraryService boot assertion FAILED: mapped-distinct count ${input.mappedDistinct} !== 23 ` +
        `(design §3.7.4 — 22 mapped + 1 substrate).`,
    );
  }
  if (input.shipReadyUnmapped !== 34) {
    throw new Error(
      `TemplateLibraryService boot assertion FAILED: ship-ready-unmapped count ${input.shipReadyUnmapped} ` +
        `!== 34 (design §3.7.4).`,
    );
  }
  if (input.trash !== 3) {
    throw new Error(`TemplateLibraryService boot assertion FAILED: trash count ${input.trash} !== 3 (design §3.7.4).`);
  }
  const total = input.mappedDistinct + input.shipReadyUnmapped + input.trash;
  if (total !== 60) {
    throw new Error(
      `TemplateLibraryService boot assertion FAILED: reconciled total ${input.mappedDistinct}+` +
        `${input.shipReadyUnmapped}+${input.trash}=${total} !== 60 (design §3.7.4).`,
    );
  }

  for (const category of CATEGORY_ORDER) {
    if (input.mappedByCategory[category] !== EXPECTED_MAPPED_BY_CATEGORY[category]) {
      throw new Error(
        `TemplateLibraryService boot assertion FAILED: mapped count for ${category} is ` +
          `${input.mappedByCategory[category]}, expected ${EXPECTED_MAPPED_BY_CATEGORY[category]} (design §3.7.4).`,
      );
    }
    if (input.shipReadyUnmappedByCategory[category] !== EXPECTED_SHIP_READY_UNMAPPED_BY_CATEGORY[category]) {
      throw new Error(
        `TemplateLibraryService boot assertion FAILED: ship-ready-unmapped count for ${category} is ` +
          `${input.shipReadyUnmappedByCategory[category]}, expected ` +
          `${EXPECTED_SHIP_READY_UNMAPPED_BY_CATEGORY[category]} (design §3.7.4).`,
      );
    }
    if (input.trashByCategory[category] !== EXPECTED_TRASH_BY_CATEGORY[category]) {
      throw new Error(
        `TemplateLibraryService boot assertion FAILED: trash count for ${category} is ` +
          `${input.trashByCategory[category]}, expected ${EXPECTED_TRASH_BY_CATEGORY[category]} (design §3.7.4).`,
      );
    }
  }
}
