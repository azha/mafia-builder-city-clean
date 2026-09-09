// IMPLEMENTS: docs/superpowers/plans/2026-07-17-04g-D-meta-layer-plan.md C3 (event-reskin-validator.ts —
//             the 4 rules design §3.5.1)
//             Design: docs/superpowers/specs/2026-07-17-04g-D-meta-layer-design.md §3.5.1 (EventReskin-
//             Validator — validation du SPEC, niveau wizard/HTTP)
//             Canon: docs/tech/04g_ambient_world_events_templates/template_launch_event_mapping.md
//             §Invariants canoniques (invariant 5) + §Authoring guide step 5 ; political_templates.md
//             §scénario validation (`validation_failure_reason: missing_cross_ref`, `EventReskin` NOT
//             emitted) + §Scenario A (dangling-anchor detail folded into the SAME reason, canon verbatim).
//             — 04g-D C3 — 2026-07-17
//
// This file validates a candidate `ReskinSpec` (the wizard step-5 / dry-run input, gdd/15 `ReskinSpec`
// reserved name — NEVER `Reskin` plat) via 3 of the 4 canon rules, ALL PURE exported functions (zero DI,
// zero I/O — mirrors this module's own "plain exported functions" posture, `event-template-mapping-
// registry.ts`/`unmapped-templates-opportunity.registry.ts`'s own convention) so they are directly
// unit-testable by import, no DB/HTTP required.
//
// ★ File split (deliberate, not design drift): the `EventReskinValidator` INJECTABLE CLASS (rule 4's DB
// half — the persisted `event_reskin.event_id` collision check — + the aggregate `validate()`) lives in
// the SIBLING file `event-reskin-validator.service.ts`, NOT here. Reason: that class needs `@Inject(DB)`
// on its constructor, and Playwright's esbuild-based TS transform cannot parse ANY parameter decorator
// ("Decorators cannot be used to decorate parameters" — verified by direct reproduction against this exact
// codebase's Playwright config) — if the class lived in THIS file, importing even a single pure function
// from here (e.g. `validateCrossRefs`) would drag the whole file through the same parser and fail. Keeping
// this file 100% decorator-free keeps it importable by a direct-import pure-module Playwright test
// (`template_library_validators.spec.ts`); `event-reskin-validator.service.ts`'s own header has the full
// writeup + the `.service.ts` sibling naming convention it establishes for `anti-fomo-validator.ts`.
//
// ★ Launch-thin honnête (design §11 item 2, C3 coder note): rule 2's "declared ranges" are NOT the
// per-template CATALOGUE_REPORT ranges (not machine-encoded day-1, explicitly out of scope) — they are
// `TEMPLATE_LIBRARY_TUNABLE_CAPS` (`template-library.tunables.ts`, C1's own already-exported registry of
// ranged numeric keys), registry-DERIVED (never re-listed here) and mutable in a test to prove "mutate a
// range → behavior flips" (plan §C3 acceptance) without monkey-patching a frozen production const.
//
// ★ RESOLVED (04g-D C4a, decisions D18, 2026-07-17): the C3 ⊥ gate flagged a design/canon tension on rule
// 1's "dangling anchor" sub-check (`.superpowers/sdd/C3-report.md:195-206`) — C3 shipped only the
// unambiguous half (`crossRefs.length === 0` always-blocking, rule 1a) and routed the rest here rather than
// guess. Design §3.5.1-1b / §3.5.2 were patched (PALIMPSEST R7.1) and decisions D18 rules the split:
//   - 1a EMPTY (`length === 0` / a blank `system`/`anchor` string) stays ALWAYS-blocking, any mode
//     (`validateCrossRefs` above — UNCHANGED by this section).
//   - 1b DANGLING (a NON-empty crossRef whose `anchor` resolves to NOTHING) is mode-SENSITIVE (canon
//     Scenario A strict → 422 / Scenario B lax → 200-warning + emission) — `resolveCrossRefAnchor` /
//     `findDanglingCrossRefs` below are the PURE detection half; `TemplateInstantiationValidator.enforce()`
//     applies the strict/lax verdict (§3.5.2).
// "Detection saine = résolution d'entité" (D18) — a non-empty anchor resolves ssi it matches ONE of 4
// classes, ALL derived from what this module already owns (never a new hand-list):
//   (i)   doc-anchor form `NN §N[.N...]` — SYNTACTIC day-1 (the section's actual existence is not
//         verified, design §11 item 8) — canon form `template_launch_event_mapping.md:224` (`04a §3.2`,
//         `04 §1.4`, `04a §2.7`).
//   (ii)  a `TEMPLATE_LIBRARY_TUNABLE_CAPS` key (SAME launch-thin frontier as rule 2 — C3 concern 2).
//   (iii) one of the 60 `templateId`s (`findLibraryEntry`, already exported above).
//   (iv)  one of the 25 catalogue `instantiationId`s (`catalogueInstantiationIds`, already exported above).
// Verified against canon: the fake Scenario A anchor `foo_lot_availability` (`political_templates.md:116`)
// resolves to NONE of the 4 → dangling ✓; the canon example anchors resolve via (i) ✓. The actual
// `resolveCrossRefAnchor`/`findDanglingCrossRefs` functions live BELOW, right after `validateCrossRefs`
// (rule 1a) — they are rule "1b", and need `findLibraryEntry`/`catalogueInstantiationIds`/
// `TEMPLATE_LIBRARY_TUNABLE_CAPS` which are declared further down this same file / imported below.

import { TemplateCategory } from './template-category';
import type { TemplateLibraryEntry } from './template-library-entry';
import { POLITICAL_TEMPLATE_LIBRARY } from './political-template-library';
import { LIVE_OPS_TEMPLATE_LIBRARY } from './live-ops-template-library';
import { RECRUITMENT_QUEST_TEMPLATE_LIBRARY } from './recruitment-quest-template-library';
import { ACHIEVEMENT_TEMPLATE_LIBRARY } from './achievement-template-library';
import { NEWS_BEAT_TEMPLATE_LIBRARY } from './news-beat-template-library.adapter';
import { RANDOM_WORLD_TEMPLATE_LIBRARY } from './random-world-template-library.adapter';
import { allMappings } from './event-template-mapping-registry';
import { TEMPLATE_LIBRARY_TUNABLE_CAPS } from './template-library.tunables';
import type { LiveOpsEventCategory, LiveOpsEffectOp, LiveOpsEffectScope } from '../liveops/live-ops.types';

/** `ReskinSpec` (gdd/15 reserved name, design §3.5.1 verbatim field list) — the wizard step-5 / dry-run
 *  input. NEVER `Reskin` plat, NEVER `ReskinInput` (canon interdits, `political_templates.md:255`). */
export interface ReskinSpec {
  /** New authored id, e.g. `'E-LO-11'` — format `E-<HOST>-NN` or `FLOW-*`. Unique vs the 25 catalogue
   *  instantiationIds + every existing `event_reskin.event_id` row (rule 4). */
  readonly eventId: string;
  /** One of the 60 library ids. */
  readonly templateId: string;
  readonly hostCategory: TemplateCategory;
  /** Staff-authored copy — scanned by `AntiFOMOValidator` at composition-time, never here. */
  readonly name: string;
  /** Staff-authored copy — scanned by `AntiFOMOValidator` at composition-time, never here. */
  readonly reskinDescription: string;
  /** Registry-keyed tunable overrides (rule 2). */
  readonly tunables: Readonly<Record<string, number>>;
  /** Step-5 cross-references — ≥1 REQUIRED (rule 1, canon invariant 5). */
  readonly crossRefs: readonly { readonly system: string; readonly anchor: string }[];
  readonly durationRealDays?: number;
  /** §4.1-B — OPTIONAL at commit (host LIVE_OPS only); its ABSENCE at LIVE_OPS mount time is 422
   *  `mount_spec_incomplete` (C4b, DD-RSK3/4/5). Structurally free jsonb until then — NONE of this file's
   *  4 rules inspect it (design §4.1-B: "aucune règle nouvelle au niveau spec: le bloc est structurellement
   *  du jsonb libre jusqu'au mount, qui est le gate qui engage le runtime"). Types REUSE from
   *  `operational/liveops/live-ops.types.ts` (import only — that file is NEVER edited by this 04g-D lot,
   *  plan §0.9). */
  readonly liveOps?: {
    readonly category: LiveOpsEventCategory;
    readonly durationRealDays: number;
    readonly effects: readonly {
      readonly tunableKey: string;
      readonly op: LiveOpsEffectOp;
      readonly scope: LiveOpsEffectScope;
      readonly magnitude: number | string;
    }[];
  };
}

/** The 4 canon `validation_failure_reason` values (design §3.5.1, verbatim strings — political_templates.md
 *  §scénario validation cites `missing_cross_ref` verbatim; the other 3 mirror that convention). */
export type EventReskinValidationFailureReason =
  | 'missing_cross_ref'
  | 'unknown_tunable_key'
  | 'tunable_out_of_range'
  | 'unknown_template'
  | 'template_is_trash'
  | 'template_is_substrate'
  | 'event_id_taken';

export interface EventReskinValidationError {
  readonly reason: EventReskinValidationFailureReason;
  readonly message: string;
}

export interface EventReskinValidationResult {
  readonly valid: boolean;
  readonly error?: EventReskinValidationError;
}

// ── all 60 entries, flat (mirrors event-template-mapping-registry.ts's own ALL_LIBRARY_ENTRIES /
// unmapped-templates-opportunity.registry.ts's own allEntries() — SAME established per-consumer-file
// idiom this module already uses twice over, not a new pattern) ─────────────────────────────────────────
const ALL_LIBRARY_ENTRIES: readonly TemplateLibraryEntry[] = [
  ...POLITICAL_TEMPLATE_LIBRARY,
  ...NEWS_BEAT_TEMPLATE_LIBRARY,
  ...RANDOM_WORLD_TEMPLATE_LIBRARY,
  ...RECRUITMENT_QUEST_TEMPLATE_LIBRARY,
  ...ACHIEVEMENT_TEMPLATE_LIBRARY,
  ...LIVE_OPS_TEMPLATE_LIBRARY,
];

/** Public — `TemplateInstantiationValidator` reuses this SAME lookup to derive a template's `homeCategory`
 *  for the strict/lax mode read (§3.5.2), rather than re-building its own copy of the 60-entry flatten. */
export function findLibraryEntry(templateId: string): TemplateLibraryEntry | undefined {
  return ALL_LIBRARY_ENTRIES.find((e) => e.templateId === templateId);
}

/** The 25 canon catalogue instantiationIds (`E-POL-01..12` / `E-LO-01..10` / `FLOW-*`) — registry-DERIVED
 *  from `allMappings()` (C2), never a second hand-list (rule 4's catalogue-collision half, consumed by
 *  `event-reskin-validator.service.ts`'s `validateEventIdFresh`). */
export function catalogueInstantiationIds(): ReadonlySet<string> {
  return new Set(allMappings().map((m) => m.instantiationId));
}

// ── rule 1 — validateCrossRefs (PURE) ───────────────────────────────────────────────────────────────────
/** REJECT if `crossRefs.length === 0` (canon invariant 5, ALWAYS blocking regardless of strict/lax mode —
 *  design §3.5.2: "la règle 1 crossRefs reste TOUJOURS bloquante"). Also rejects (SAME reason code, canon
 *  Scenario A precedent) a crossRef entry naming an empty `system` or empty `anchor` string. */
export function validateCrossRefs(spec: ReskinSpec): EventReskinValidationError | undefined {
  if (!spec.crossRefs || spec.crossRefs.length === 0) {
    return {
      reason: 'missing_cross_ref',
      message: 'ReskinSpec.crossRefs is empty — templates that do not reference existing state are not yet shippable (canon invariant 5).',
    };
  }
  for (const [index, ref] of spec.crossRefs.entries()) {
    if (!ref.system || ref.system.trim() === '' || !ref.anchor || ref.anchor.trim() === '') {
      return {
        reason: 'missing_cross_ref',
        message: `ReskinSpec.crossRefs[${index}] names an empty system/anchor — every cross-ref must name both.`,
      };
    }
  }
  return undefined;
}

// ── rule 1b — dangling crossRef detection (PURE, D18 — RESOLVED 04g-D C4a) ──────────────────────────────
const DOC_ANCHOR_FORM_REGEX = /^\d{2}[a-z]?\s?§\d+(\.\d+)*$/;

/** Class (i)-(iv) resolution (D18) — a non-empty `anchor` resolves ssi it matches ONE of: (i) doc-anchor
 *  form `NN §N[.N...]` (canon example `template_launch_event_mapping.md:224`) ; (ii) a
 *  `TEMPLATE_LIBRARY_TUNABLE_CAPS` key ; (iii) one of the 60 `templateId`s ; (iv) one of the 25 catalogue
 *  `instantiationId`s. Callers run this ONLY on already non-blank anchors — rule 1a above
 *  (`validateCrossRefs`) handles the empty/blank case FIRST, independently, ALWAYS-blocking regardless of
 *  this function's result (D18 — the two sub-rules are deliberately never merged). */
export function resolveCrossRefAnchor(anchor: string): boolean {
  if (DOC_ANCHOR_FORM_REGEX.test(anchor)) return true; // (i)
  if (Object.prototype.hasOwnProperty.call(TEMPLATE_LIBRARY_TUNABLE_CAPS, anchor)) return true; // (ii)
  if (findLibraryEntry(anchor) !== undefined) return true; // (iii)
  if (catalogueInstantiationIds().has(anchor)) return true; // (iv)
  return false;
}

export interface DanglingCrossRef {
  readonly system: string;
  readonly anchor: string;
}

/** The non-empty crossRefs whose `anchor` does NOT resolve (rule 1b, D18). Blank/empty entries are
 *  EXCLUDED here on purpose — rule 1a already rejects those unconditionally upstream of this function in
 *  `TemplateInstantiationValidator.enforce()`'s own call order; mixing the two would mis-attribute the
 *  ALWAYS-blocking empty case as a mode-sensitive dangling one. */
export function findDanglingCrossRefs(spec: ReskinSpec): readonly DanglingCrossRef[] {
  return (spec.crossRefs ?? []).filter(
    (ref) => ref.system?.trim() && ref.anchor?.trim() && !resolveCrossRefAnchor(ref.anchor),
  );
}

// ── rule 2 — validateTunableRanges (PURE, registry-DERIVED from TEMPLATE_LIBRARY_TUNABLE_CAPS) ─────────
export function validateTunableRanges(spec: ReskinSpec): EventReskinValidationError | undefined {
  for (const [key, value] of Object.entries(spec.tunables ?? {})) {
    const range = TEMPLATE_LIBRARY_TUNABLE_CAPS[key];
    if (!range) {
      return { reason: 'unknown_tunable_key', message: `ReskinSpec.tunables key '${key}' is not a registered tunable.` };
    }
    if (value < range.min || value > range.max) {
      return {
        reason: 'tunable_out_of_range',
        message: `ReskinSpec.tunables['${key}'] = ${value} is outside the registered range [${range.min}, ${range.max}].`,
      };
    }
  }
  return undefined;
}

// ── rule 3 — validateTemplateExists (PURE) ──────────────────────────────────────────────────────────────
export function validateTemplateExists(spec: ReskinSpec): EventReskinValidationError | undefined {
  const entry = findLibraryEntry(spec.templateId);
  if (!entry) {
    return { reason: 'unknown_template', message: `templateId '${spec.templateId}' is not one of the 60 library entries.` };
  }
  if (entry.disposition === 'trash') {
    return { reason: 'template_is_trash', message: `templateId '${spec.templateId}' is disposition 'trash' (${entry.trashReason ?? 'CUT'}) — cannot author on cut content.` };
  }
  if (entry.disposition === 'substrate') {
    return { reason: 'template_is_substrate', message: `templateId '${spec.templateId}' is the substrate entry — mapped-as-substrate, never staff-authorable.` };
  }
  return undefined;
}
