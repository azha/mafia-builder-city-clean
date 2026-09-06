// IMPLEMENTS: docs/superpowers/plans/2026-07-19-p3-G-budgets-horizon-plan.md C2 ("capability-catalogue.ts:
//             DD-G2: 4 LIVE per ★#1-default with the ★#4 cost ladder + 3 RESERVED 251-253; boot strict-
//             check: LIVE ⇒ predicates + effect + cost + decay bindings all present, RESERVED ⇒ none —
//             design D3").
//             Design: docs/superpowers/specs/2026-07-19-p3-G-budgets-horizon-design.md §6 (the per-
//             capability bindings table, LIVE set + RESERVED source) + D3 (closed catalogue, boot strict
//             check) + §7.2 ("a RESERVED [predicate] type wired to a LIVE capability = boot failure").
//             Decisions: docs/superpowers/specs/2026-07-19-p3-G-budgets-horizon-decisions.md DD-G2 ("ONE
//             catalogue file owns capabilities, codes, predicates, costs, effects, decay bindings AND
//             dismissibility... {code, key, live, dismissible, predicates[], freeUnitsRequired,
//             capacityUnitsGranted, adoptionEffect, decayBindings[], futureLot?}... Mirrors DD-F2
//             verbatim") + §6 ★#1 RATIFIED (the 4 LIVE vocab-tier capabilities) + ★#4 RATIFIED (the cost
//             ladder EXACTLY 60/68/76/84).
//             C0-reanchor: docs/superpowers/specs/2026-07-19-p3-G-C0-reanchor.md §7 (R8 — the
//             ScriptAttachedEvent payload + the ADD_RULE resolve-hook site, cited by the decay bindings
//             below — DOCUMENTARY here, C7 wires the actual subscription).
//             Pattern: `task-category-catalogue.ts` (P3-F DD-F2 — the SAME closed-catalogue + boot-
//             strict-check shape: a TS enum closed over the catalogue rows, a `live` flag, a
//             `validate...StrictMode` pure function taking the catalogue as a PARAMETER so a test-only
//             broken clone can be probed without ever touching the production array).
//             — P3-G C2 — 2026-07-20
//
// `CAPABILITY_CATALOGUE` — the closed, code-owned catalogue (DD-G2): every capability this lot (or a
// later P3-H..K lot) knows about, LIVE or RESERVED. Codes are the `possibility_horizon_cards.
// capability_id` int space, 201+ — disjoint from `TaskCategory` 1-7/101-105 (design D3). Every LIVE row
// declares its FOUR binding groups (boot-checked): predicates, adoption effect, adoption cost (the two
// cost fields together), decay bindings.
//
// ★#1 RATIFIED (decisions §6): 4 LIVE capabilities — `VOCAB_TIER_3`(201)..`VOCAB_TIER_6`(204), the ONLY
// capability class on this base with a REAL adoption effect (the live compiler gate), REAL predicates,
// and REAL debt-decay bindings. ★#4 RATIFIED: the cost ladder is EXACTLY 60/68/76/84 (`free = 60 + 8×
// delegations` — T3 affordable at k=0, T4/T5/T6 require ≥1/2/3 delegations respectively; design §6's own
// "the deep grammar is affordable ONLY by delegating"). RESERVED (canon's three GDD examples — zero
// runtime, no evaluation, never surfaced): `LAYERED_AUDIT_TRAILS`(251), `SUCCESSION_PROTOCOL`(252, needs
// the ch07 VacancyEvent substrate), `CROSS_BRANCH_POOLING`(253, needs P3-K branches).

import { PredicateType, LIVE_PREDICATE_TYPES, type PredicateClause } from './predicate-evaluators';

/** The closed set of capability keys — TS union is CLOSED over the catalogue below (mirrors
 *  `TaskCategoryKey`'s own closed-enum-aligned-to-catalogue guarantee). */
export enum CapabilityKey {
  // ── 4 LIVE (★#1 RATIFIED) ──────────────────────────────────────────────────────────────────────────
  VOCAB_TIER_3 = 'VOCAB_TIER_3',
  VOCAB_TIER_4 = 'VOCAB_TIER_4',
  VOCAB_TIER_5 = 'VOCAB_TIER_5',
  VOCAB_TIER_6 = 'VOCAB_TIER_6',
  // ── 3 RESERVED (canon's GDD examples — no real substrate on this base, design §6) ─────────────────────
  LAYERED_AUDIT_TRAILS = 'LAYERED_AUDIT_TRAILS',
  SUCCESSION_PROTOCOL = 'SUCCESSION_PROTOCOL',
  CROSS_BRANCH_POOLING = 'CROSS_BRANCH_POOLING',
}

/** The adoption-effect declaration (design §6: "the ONLY effect kind v1 — closed union; new kinds arrive
 *  with new capability classes"). Applied by the C6 `VocabTierAdvancementService` subscriber, NEVER
 *  inline in the adoption tx (single-writer-per-column discipline). */
export interface CapabilityAdoptionEffect {
  readonly kind: 'VOCAB_TIER_ADVANCE';
  readonly tier: number;
}

/**
 * A per-capability active-decay binding (design D10/§12.1: "ScriptAttachedEvent... + the ADD_RULE
 * resolve tag at the Phase-17 hook site"; C0-reanchor R8: the real resolve-hook condition is the literal
 * resolve `method === 'ADD_RULE'`, confirmed at `exceptions.service.ts:193-195`). DOCUMENTARY this
 * chunk (mirrors `TaskCategoryCatalogueEntry.decisionExtractors`/`guardSites`'s own "documentary string
 * pointer, C-later wires it" convention) — C7's `IsostaticDebtService` is the first real consumer.
 */
export type CapabilityDecayBinding =
  | { readonly kind: 'bus_event'; readonly event: 'script_attached' }
  | { readonly kind: 'resolve_hook'; readonly method: 'ADD_RULE' };

/** One catalogue row (DD-G2 shape, verbatim field list). */
export interface CapabilityCatalogueEntry {
  readonly code: number;
  readonly key: CapabilityKey;
  readonly live: boolean;
  readonly dismissible: boolean;
  readonly predicates: readonly PredicateClause[];
  readonly freeUnitsRequired: number | null;
  readonly capacityUnitsGranted: number | null;
  readonly adoptionEffect: CapabilityAdoptionEffect | null;
  readonly decayBindings: readonly CapabilityDecayBinding[];
  /** Honest ownership note for a RESERVED row (mirrors `TaskCategoryCatalogueEntry.futureLot`) — 'TBD'
   *  where no owner lot has been named yet (never invented). */
  readonly futureLot?: string;
}

/** The active-decay bindings EVERY LIVE `VOCAB_TIER_*` row shares (design §6 table: "idem" on all 4
 *  rows) — declared once, referenced by all 4 to avoid 4 byte-identical literal copies. */
const VOCAB_TIER_DECAY_BINDINGS: readonly CapabilityDecayBinding[] = [
  { kind: 'bus_event', event: 'script_attached' },
  { kind: 'resolve_hook', method: 'ADD_RULE' },
];

/**
 * `CAPABILITY_CATALOGUE` — 7 entries: 4 LIVE + 3 RESERVED. Aligned 1:1 with `CapabilityKey` (every enum
 * member has exactly one row). The ★#4 cost ladder (60/68/76/84) + the design §6 predicate table are
 * reproduced verbatim.
 */
export const CAPABILITY_CATALOGUE: readonly CapabilityCatalogueEntry[] = [
  {
    code: 201,
    key: CapabilityKey.VOCAB_TIER_3,
    live: true,
    dismissible: false, // D8 self-brick guard — dismissing T3 would permanently dead-end T4-6.
    predicates: [
      { type: PredicateType.CURRENT_VOCAB_TIER_IS, threshold: 2 },
      { type: PredicateType.EXCEPTIONS_HANDLED_MIN, threshold: 15 },
      { type: PredicateType.SESSIONS_CLOSED_MIN, threshold: 5 },
    ],
    freeUnitsRequired: 60, // ★#4 — reachable at k=0 delegations (the early rung).
    capacityUnitsGranted: 40,
    adoptionEffect: { kind: 'VOCAB_TIER_ADVANCE', tier: 3 },
    decayBindings: VOCAB_TIER_DECAY_BINDINGS,
  },
  {
    code: 202,
    key: CapabilityKey.VOCAB_TIER_4,
    live: true,
    dismissible: false,
    predicates: [
      { type: PredicateType.CURRENT_VOCAB_TIER_IS, threshold: 3 },
      { type: PredicateType.DELEGATED_CATEGORIES_MIN, threshold: 1 },
      { type: PredicateType.SCRIPTED_LIEUTENANTS_MIN, threshold: 2 },
    ],
    freeUnitsRequired: 68, // ★#4 — requires >= 1 delegation (free = 60 + 8k).
    capacityUnitsGranted: 40,
    adoptionEffect: { kind: 'VOCAB_TIER_ADVANCE', tier: 4 },
    decayBindings: VOCAB_TIER_DECAY_BINDINGS,
  },
  {
    code: 203,
    key: CapabilityKey.VOCAB_TIER_5,
    live: true,
    dismissible: false,
    predicates: [
      { type: PredicateType.CURRENT_VOCAB_TIER_IS, threshold: 4 },
      { type: PredicateType.DELEGATED_CATEGORIES_MIN, threshold: 2 },
      { type: PredicateType.MASTERY_ELIGIBLE_MIN, threshold: 1 },
    ],
    freeUnitsRequired: 76, // ★#4 — requires >= 2 delegations.
    capacityUnitsGranted: 40,
    adoptionEffect: { kind: 'VOCAB_TIER_ADVANCE', tier: 5 },
    decayBindings: VOCAB_TIER_DECAY_BINDINGS,
  },
  {
    code: 204,
    key: CapabilityKey.VOCAB_TIER_6,
    live: true,
    dismissible: false,
    predicates: [
      { type: PredicateType.CURRENT_VOCAB_TIER_IS, threshold: 5 },
      { type: PredicateType.DELEGATED_CATEGORIES_MIN, threshold: 3 },
      { type: PredicateType.SCRIPTED_LIEUTENANTS_MIN, threshold: 3 },
    ],
    freeUnitsRequired: 84, // ★#4 — requires >= 3 delegations.
    capacityUnitsGranted: 40,
    adoptionEffect: { kind: 'VOCAB_TIER_ADVANCE', tier: 6 },
    decayBindings: VOCAB_TIER_DECAY_BINDINGS,
  },

  // ── 3 RESERVED (design §6 — zero bindings, boot-checked inert, never a fig-leaf) ───────────────────
  {
    code: 251,
    key: CapabilityKey.LAYERED_AUDIT_TRAILS,
    live: false,
    dismissible: false,
    predicates: [],
    freeUnitsRequired: null,
    capacityUnitsGranted: null,
    adoptionEffect: null,
    decayBindings: [],
    futureLot: 'TBD', // no audit-trail feature exists on this base (canon GDD example 1).
  },
  {
    code: 252,
    key: CapabilityKey.SUCCESSION_PROTOCOL,
    live: false,
    dismissible: false,
    predicates: [],
    freeUnitsRequired: null,
    capacityUnitsGranted: null,
    adoptionEffect: null,
    decayBindings: [],
    futureLot: 'ch07 (VacancyEvent substrate)',
  },
  {
    code: 253,
    key: CapabilityKey.CROSS_BRANCH_POOLING,
    live: false,
    dismissible: false,
    predicates: [],
    freeUnitsRequired: null,
    capacityUnitsGranted: null,
    adoptionEffect: null,
    decayBindings: [],
    futureLot: 'P3-K',
  },
];

/** Look up a catalogue entry by its key. Throws if somehow not catalogued (defensive — the TS enum/
 *  catalogue pairing makes this unreachable for a type-checked caller, mirrors
 *  `taskCategoryCatalogueEntryFor`). */
export function capabilityCatalogueEntryFor(key: CapabilityKey): CapabilityCatalogueEntry {
  const entry = CAPABILITY_CATALOGUE.find((e) => e.key === key);
  if (!entry) {
    throw new Error(`[capability-catalogue] Unknown CapabilityKey: ${String(key)} (not in the closed catalogue).`);
  }
  return entry;
}

/** Look up a catalogue entry by its numeric `code` (`possibility_horizon_cards.capability_id` — C3's own
 *  card-row resolution). Throws if somehow not catalogued (defensive, mirrors
 *  `capabilityCatalogueEntryFor`). */
export function capabilityCatalogueEntryForCode(code: number): CapabilityCatalogueEntry {
  const entry = CAPABILITY_CATALOGUE.find((e) => e.code === code);
  if (!entry) {
    throw new Error(`[capability-catalogue] Unknown capability code: ${code} (not in the closed catalogue).`);
  }
  return entry;
}

/** Structural equality over the closed `CapabilityDecayBinding` union (never a reference/JSON.stringify
 *  compare — mirrors the catalogue's own discriminated-union handling style throughout this file). */
function decayBindingsEqual(a: CapabilityDecayBinding, b: CapabilityDecayBinding): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'bus_event' && b.kind === 'bus_event') return a.event === b.event;
  if (a.kind === 'resolve_hook' && b.kind === 'resolve_hook') return a.method === b.method;
  return false;
}

/**
 * P3-G C7 — the FIRST real consumer of `decayBindings` (DOCUMENTARY since C2, per this file's own header
 * note). Every LIVE capability's codes whose catalogue row declares `binding` among its own decay
 * bindings — `IsostaticDebtService.applyActiveDecay`'s own set-based scope: a single `ScriptAttachedEvent`
 * (or the ADD_RULE resolve-hook sibling) decays EVERY adopted capability the player holds that shares
 * THIS binding, in ONE set-based statement (mirrors `PlayerProficiencyRepository#accrueForSession`'s own
 * "every DELEGATED category, one statement" set-based shape) — never a per-capability loop of single-row
 * UPDATEs. Today the 4 LIVE `VOCAB_TIER_*` rows share BOTH bindings verbatim (`VOCAB_TIER_DECAY_BINDINGS`
 * above), so this returns all 4 codes for either binding; a future LIVE capability with a NARROWER binding
 * set would naturally be excluded here, no catalogue-consumer edit needed.
 */
export function capabilityCodesForDecayBinding(binding: CapabilityDecayBinding): readonly number[] {
  return CAPABILITY_CATALOGUE.filter((e) => e.live && e.decayBindings.some((b) => decayBindingsEqual(b, binding))).map((e) => e.code);
}

/**
 * The D3 closed-world boot check (mirrors `validateTaskCategoryCatalogueStrictMode` — DD-G2 "Mirrors
 * DD-F2 verbatim"), TWO halves:
 *   (a) every `live:true` row MUST declare all FOUR binding groups non-empty/non-null (predicates,
 *       adoptionEffect, the cost pair freeUnitsRequired+capacityUnitsGranted, decayBindings); every
 *       `live:false` row MUST declare all of them EMPTY/null (never a fig-leaf placeholder).
 *   (b) (§7.2's own closed-world rule) every predicate `type` a LIVE row wires must itself be a LIVE
 *       `PredicateType` (`LIVE_PREDICATE_TYPES`) — a RESERVED predicate type wired to a LIVE capability
 *       is refused, never silently evaluated.
 * Takes the catalogue as a PARAMETER (never a hardcoded read of `CAPABILITY_CATALOGUE`) so the SAME real
 * validator can be exercised against a test-only, deliberately-broken clone (the C2 falsifiable strict-
 * mode proof — mirrors P3-A/P3-F's own strict-mode test shape) WITHOUT ever mutating the production
 * catalogue or crashing the app under test. Throws on the FIRST violation — the caller
 * (`BudgetsHorizonModule.onApplicationBootstrap`) lets this propagate to fail NestJS boot (the SAME "loud
 * misconfiguration" convention `validateStructuralDecisionCatalogueStrictMode`/
 * `validateTaskCategoryCatalogueStrictMode` use).
 */
export function validateCapabilityCatalogueStrictMode(catalogue: readonly CapabilityCatalogueEntry[]): void {
  for (const entry of catalogue) {
    if (entry.live) {
      if (
        entry.predicates.length === 0 ||
        entry.adoptionEffect === null ||
        entry.freeUnitsRequired === null ||
        entry.capacityUnitsGranted === null ||
        entry.decayBindings.length === 0
      ) {
        throw new Error(
          `[capability-catalogue] LIVE entry "${String(entry.key)}" (code ${entry.code}) is missing at ` +
            'least one of the four required binding groups (predicates / adoptionEffect / cost ' +
            '[freeUnitsRequired+capacityUnitsGranted] / decayBindings) — boot refused (D3 closed-world ' +
            'guarantee).',
        );
      }
      for (const clause of entry.predicates) {
        if (!LIVE_PREDICATE_TYPES.has(clause.type)) {
          throw new Error(
            `[capability-catalogue] LIVE entry "${String(entry.key)}" (code ${entry.code}) wires RESERVED ` +
              `predicate type "${clause.type}" — boot refused (§7.2 closed-world: a RESERVED predicate ` +
              'type wired to a LIVE capability is a misconfiguration).',
          );
        }
      }
    } else if (
      entry.predicates.length !== 0 ||
      entry.adoptionEffect !== null ||
      entry.freeUnitsRequired !== null ||
      entry.capacityUnitsGranted !== null ||
      entry.decayBindings.length !== 0
    ) {
      throw new Error(
        `[capability-catalogue] RESERVED entry "${String(entry.key)}" (code ${entry.code}) carries a ` +
          'non-empty binding — a RESERVED row must stay fully inert (never a fig-leaf) — boot refused.',
      );
    }
  }
}
