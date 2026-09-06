// IMPLEMENTS: docs/superpowers/plans/2026-07-18-p3-F-delegation-ratchet-plan.md C2 ("TaskCategory
//             catalogue + mastery accumulator (activation of mastery_score)" — DD-F2: 4 LIVE per ★#1-
//             default + RESERVED incl. successors 101-105; boot strict-check).
//             Design: docs/superpowers/specs/2026-07-18-p3-F-delegation-ratchet-design.md §6 (the
//             per-category bindings table, LIVE set + RESERVED source categories).
//             Decisions: docs/superpowers/specs/2026-07-18-p3-F-delegation-ratchet-decisions.md DD-F2
//             ("ONE catalogue file owns categories, codes, successor mapping AND all four per-category
//             bindings... the boot strict-check reads only this. Successor mapping is code-owned — no
//             successor column on mastery_score").
//             C0 re-anchor: docs/superpowers/specs/2026-07-18-p3-F-C0-reanchor.md §0 (★#1 RATIFIED — the
//             4 LIVE categories) + §7 (the 4 per-category binding tables, REAL symbols, re-verified
//             2026-07-18) — every `event`/`sourceTag`/guard-site string below is copied verbatim from
//             that section.
//             Pattern: `progression/loop10/structural-decision-catalogue.ts` (P3-A D7 — the SAME closed-
//             catalogue + boot-strict-check shape: a TS enum closed over the catalogue rows, a `live`
//             flag, a `validate...StrictMode` pure function taking the catalogue as a PARAMETER so a
//             test-only broken clone can be probed without ever touching the production array).
//             — P3-F C2 — 2026-07-18
//
// `TASK_CATEGORY_CATALOGUE` — the closed, code-owned catalogue (DD-F2): every TaskCategory this lot (or a
// later P3-F/P3-G..K lot) knows about, LIVE or RESERVED. Categories are DERIVED from `mastery_score.
// category_id` (an int, no FK — the catalogue is the ONLY place a category is "declared", mirrors
// `StructuralDecisionType`'s own "closed int catalogue aligned with structural_decisions_audit.
// decision_type" convention). Successor mapping is code-owned HERE (`successorCode`) — `mastery_score` has
// no successor column and none is added (D1, R9.3).
//
// ★#1 RATIFIED (C0-reanchor §0): 4 LIVE categories — `ROUTE_ASSIGNMENT`(1), `LIEUTENANT_HIRING`(2),
// `SUPPLY_SOURCING`(4), `HEAT_MANAGEMENT`(5). Every LIVE row declares its FOUR bindings (masteryEvents /
// decisionExtractors / guardSites / successorCode) non-empty/non-null — the boot strict-check below
// enforces this (mirrors D7's "a live entry with no registered site is a loud misconfiguration").
// RESERVED: the 3 source-domain categories with no player-verb surface to retire on this base yet
// (`LEK_CONTEST`(3), `CASH_LAUNDERING`(6), `NODE_RETOOLING`(7), design §6) PLUS the 5 successor domains
// (101-105 — P3-G..K unlock their verbs, design §15). RESERVED rows declare ALL FOUR bindings
// EMPTY/NULL — never a fig-leaf placeholder value.

/** The closed set of category keys — TS union is CLOSED over the catalogue below (mirrors
 *  `StructuralDecisionType`'s own closed-enum-aligned-to-catalogue guarantee). */
export enum TaskCategoryKey {
  // ── 4 LIVE (★#1 RATIFIED) ──────────────────────────────────────────────────────────────────────────
  ROUTE_ASSIGNMENT = 'ROUTE_ASSIGNMENT',
  LIEUTENANT_HIRING = 'LIEUTENANT_HIRING',
  SUPPLY_SOURCING = 'SUPPLY_SOURCING',
  HEAT_MANAGEMENT = 'HEAT_MANAGEMENT',
  // ── 3 RESERVED source domains (design §6 — no player-verb surface to retire on this base yet) ───────
  LEK_CONTEST = 'LEK_CONTEST',
  CASH_LAUNDERING = 'CASH_LAUNDERING',
  NODE_RETOOLING = 'NODE_RETOOLING',
  // ── 5 RESERVED successor domains (design §15 — P3-G..K unlock their verbs) ───────────────────────────
  ROUTE_NETWORK_TOPOLOGY = 'ROUTE_NETWORK_TOPOLOGY',
  DELEGATION_ARCHITECTURE = 'DELEGATION_ARCHITECTURE',
  LEK_NETWORK_DESIGN = 'LEK_NETWORK_DESIGN',
  SUPPLY_WEB_DESIGN = 'SUPPLY_WEB_DESIGN',
  HEAT_POSTURE_DOCTRINE = 'HEAT_POSTURE_DOCTRINE',
}

/**
 * A mastery-accrual binding (design §7.1 "mapper registry... {event, categoryResolver, outcome}"). Two
 * shapes: a REAL `CityEventBus` event (`kind:'bus_event'`, keyed by the event's own `type` discriminant
 * string) or the R6 resolve-hook sibling call (`kind:'resolve_hook'`, keyed by the jsonb `candidate_
 * actions[].source` tag `ExceptionsService.resolve()` reads back — C0 §6 R6). `outcome` is the atomic
 * `LEAST(100, GREATEST(0, mastery_score + outcome))` delta (design §7.3) — the ONLY two values this lot's
 * canon defines (design §13 "NOT created — honest non-knobs: mastery deltas +1/−2... GDD-verbatim
 * mechanics constants").
 */
export type TaskCategoryMasteryEventBinding =
  | { readonly kind: 'bus_event'; readonly event: string; readonly outcome: 1 | -2 }
  | { readonly kind: 'resolve_hook'; readonly sourceTag: string; readonly outcome: 1 | -2 };

/**
 * One catalogue row (DD-F2 shape). `masteryEvents`/`decisionExtractors`/`guardSites`/`successorCode` are
 * the "four bindings" the boot strict-check requires non-empty on every `live:true` row. `masteryEvents`
 * is STRUCTURED (consumed at runtime — `mastery-event-mapper.registry.ts` derives the accumulator's
 * subscription table from it, single source, zero duplication). `decisionExtractors`/`guardSites` are
 * DOCUMENTARY string pointers this chunk does not yet wire (C4/C6's own job respectively) — mirrors
 * `StructuralDecisionCatalogueEntry.site`'s own "human-readable pointer, never read/parsed, purely
 * documentary" convention. `archetypeAffinity` (DD-F2, optional) is reserved for C4's graduation-seed
 * mapper (category → lieutenant archetype vocabulary) — undefined on every C2 row, a later chunk's field.
 */
export interface TaskCategoryCatalogueEntry {
  readonly code: number;
  readonly key: TaskCategoryKey;
  readonly live: boolean;
  readonly masteryEvents: readonly TaskCategoryMasteryEventBinding[];
  readonly decisionExtractors: readonly string[];
  readonly guardSites: readonly string[];
  readonly successorCode: number | null;
  readonly archetypeAffinity?: string;
  /** Honest ownership note for a RESERVED row (mirrors `StructuralDecisionCatalogueEntry.futureLot`) —
   *  'TBD' where no owner lot has been named yet (never invented). */
  readonly futureLot?: string;
}

/**
 * `TASK_CATEGORY_CATALOGUE` — 12 entries: 4 LIVE + 8 RESERVED (3 source domains + 5 successor domains).
 * Aligned 1:1 with `TaskCategoryKey` (every enum member has exactly one row).
 */
export const TASK_CATEGORY_CATALOGUE: readonly TaskCategoryCatalogueEntry[] = [
  // ── 4 LIVE — every one of the 4 bindings REAL, re-verified C0-reanchor §7 this session ─────────────
  {
    code: 1,
    key: TaskCategoryKey.ROUTE_ASSIGNMENT,
    live: true,
    masteryEvents: [
      { kind: 'bus_event', event: 'route_created', outcome: 1 },
      { kind: 'bus_event', event: 'route_rebuilt', outcome: 1 },
      { kind: 'bus_event', event: 'courier_intercepted', outcome: -2 },
    ],
    decisionExtractors: [
      'structural_decisions_audit: route structural types incl. LIVE SINUOSITY_FULL_RESET(9)',
      'resolved route-category exception cards',
    ],
    guardSites: [
      'POST /v1/operational/routes (route.controller.ts#createRoute)',
      'POST /v1/operational/routes/:id/replan (route.controller.ts#replan)',
      'POST /v1/operational/routes/:id/rebuild (route.controller.ts#rebuild)',
    ],
    successorCode: 101,
  },
  {
    code: 2,
    key: TaskCategoryKey.LIEUTENANT_HIRING,
    live: true,
    masteryEvents: [
      // `hire_completed` (quest-hire path, `recruitment-quest.service.ts#finalizeHire`) + the C2-added
      // `direct_hire_completed` parity event (`lieutenant.service.ts#recruit`, §3 closure below) — a
      // player who never touches the quest system still earns hiring mastery (C0 §5.3 gap #1 closed).
      { kind: 'bus_event', event: 'hire_completed', outcome: 1 },
      { kind: 'bus_event', event: 'direct_hire_completed', outcome: 1 },
      // NO −2 binding (C0 §5.3 gap #2 — `abandon()` carries no player-attributable failure signal; an
      // honest, TD-routable +1-only v1 asymmetry, NEVER an invented washout event).
    ],
    decisionExtractors: [
      'structural_decisions_audit: LIEUTENANT_RECRUIT(3)',
      'structural_decisions_audit: LIEUTENANT_ROLE_REASSIGN(4)',
    ],
    guardSites: [
      'POST /v1/lieutenants (lieutenant.controller.ts#recruit, GOVERNED LIEUTENANT_RECRUIT)',
      'POST /v1/lieutenants/:id/reassign (lieutenant.controller.ts#reassign, GOVERNED LIEUTENANT_ROLE_REASSIGN)',
      'POST /v1/recruitment/quests/:id/hire (recruitment.controller.ts#finalize, UNGOVERNED)',
    ],
    successorCode: 102,
  },
  {
    code: 4,
    key: TaskCategoryKey.SUPPLY_SOURCING,
    live: true,
    masteryEvents: [
      // `precursor_order_filled` — the C2-added closure (§3 below), emitted from the arrival tick
      // (fulfillment, C0 §5.2 gap closed).
      { kind: 'bus_event', event: 'precursor_order_filled', outcome: 1 },
      { kind: 'bus_event', event: 'stash_high_blocking_alert', outcome: -2 },
      { kind: 'bus_event', event: 'buffer_overflow', outcome: -2 },
    ],
    decisionExtractors: [
      'resolved supply-category exception cards (BACKPRESSURE_CRITICAL / MYCELIAL_PERSISTENT_STRESS)',
      'structural_decisions_audit: MYCELIAL_STRUCTURAL_REINFORCE(10)',
    ],
    guardSites: ['POST /v1/operational/precursors/order (precursors.controller.ts#order)'],
    successorCode: 104,
  },
  {
    code: 5,
    key: TaskCategoryKey.HEAT_MANAGEMENT,
    live: true,
    masteryEvents: [
      // The R6 resolve-hook (§4 below) — a heat-pressure-sourced card successfully resolved. `sourceTag`
      // is the jsonb `candidate_actions[0].source` tag `heat-pressure-exception-producer.service.ts` now
      // carries (C2 closure — the tag did not exist pre-C2, added additively, mirrors `BACKPRESSURE_
      // CRITICAL_SOURCE`'s own established convention).
      { kind: 'resolve_hook', sourceTag: 'HEAT_PRESSURE', outcome: 1 },
      { kind: 'bus_event', event: 'heat_escalation', outcome: -2 },
    ],
    decisionExtractors: [
      // C11 correction (⊥ C4 MINOR-C4-1): the citywide heat-pressure card's REAL 3 candidate-action ids
      // are `acknowledge`/`escalate`/`lay_low` (`heat-pressure-exception-producer.service.ts:58-84`) —
      // `bribe` is a DIFFERENT producer's EffectType (`raid-exception-producer.service.ts`), mechanically
      // unreachable from THIS card. The prior "LAY_LOW/BRIBE/ESCALATE verdicts" wording overclaimed.
      'resolved heat-category exception cards (heat-pressure-exception-producer.service.ts, acknowledge/escalate/lay_low resolution ids)',
    ],
    // C0 §5.4 (open question, non-blocking for C2): HEAT_MANAGEMENT has NO dedicated hard-mutation
    // endpoint on this base — LAY_LOW/BRIBE/ESCALATE are tactical EffectTypes dispatched through the
    // GENERIC exception-resolve path. This is the honest site pointer (non-empty, non-fabricated):
    // C6 confirms at its own dispatch time whether retirement here stays projection-only (the C0-
    // recommended reading) or grows a novel tactical-path guard.
    guardSites: [
      'exceptions.controller.ts#resolve (generic tactical LAY_LOW/BRIBE/ESCALATE resolve path — ' +
        'PROJECTION-ONLY retirement per C0 §5.4, no dedicated hard-mutation endpoint exists for this ' +
        'category on this base; C6 confirms the guard shape at its own dispatch)',
    ],
    successorCode: 105,
  },

  // ── 3 RESERVED source domains (design §6 — zero bindings, boot-checked inert) ─────────────────────
  {
    code: 3,
    key: TaskCategoryKey.LEK_CONTEST,
    live: false,
    masteryEvents: [],
    decisionExtractors: [],
    guardSites: [],
    successorCode: null,
    futureLot: 'TBD',
  },
  {
    code: 6,
    key: TaskCategoryKey.CASH_LAUNDERING,
    live: false,
    masteryEvents: [],
    decisionExtractors: [],
    guardSites: [],
    successorCode: null,
    futureLot: 'TBD',
  },
  {
    code: 7,
    key: TaskCategoryKey.NODE_RETOOLING,
    live: false,
    masteryEvents: [],
    decisionExtractors: [],
    guardSites: [],
    successorCode: null,
    futureLot: 'TBD',
  },

  // ── 5 RESERVED successor domains (design §15 — P3-G..K unlock their verbs) ────────────────────────
  {
    code: 101,
    key: TaskCategoryKey.ROUTE_NETWORK_TOPOLOGY,
    live: false,
    masteryEvents: [],
    decisionExtractors: [],
    guardSites: [],
    successorCode: null,
    futureLot: 'P3-G..K',
  },
  {
    code: 102,
    key: TaskCategoryKey.DELEGATION_ARCHITECTURE,
    live: false,
    masteryEvents: [],
    decisionExtractors: [],
    guardSites: [],
    successorCode: null,
    futureLot: 'P3-G..K',
  },
  {
    code: 103,
    key: TaskCategoryKey.LEK_NETWORK_DESIGN,
    live: false,
    masteryEvents: [],
    decisionExtractors: [],
    guardSites: [],
    successorCode: null,
    futureLot: 'P3-G..K',
  },
  {
    code: 104,
    key: TaskCategoryKey.SUPPLY_WEB_DESIGN,
    live: false,
    masteryEvents: [],
    decisionExtractors: [],
    guardSites: [],
    successorCode: null,
    futureLot: 'P3-G..K',
  },
  {
    code: 105,
    key: TaskCategoryKey.HEAT_POSTURE_DOCTRINE,
    live: false,
    masteryEvents: [],
    decisionExtractors: [],
    guardSites: [],
    successorCode: null,
    futureLot: 'P3-G..K',
  },
];

/** Look up a catalogue entry by its key. Throws if somehow not catalogued (defensive — the TS enum/
 *  catalogue pairing makes this unreachable for a type-checked caller, mirrors `catalogueEntryFor`). */
export function taskCategoryCatalogueEntryFor(key: TaskCategoryKey): TaskCategoryCatalogueEntry {
  const entry = TASK_CATEGORY_CATALOGUE.find((e) => e.key === key);
  if (!entry) {
    throw new Error(`[task-category-catalogue] Unknown TaskCategoryKey: ${String(key)} (not in the closed catalogue).`);
  }
  return entry;
}

/**
 * Look up a catalogue entry by its numeric `code` (P3-F C3 — the player projection resolves a LIVE row's
 * `successorCode` back to the successor's own `key` for the `successor: {key, substrate, suspended}`
 * projection field, design §11). Throws if somehow not catalogued (defensive — mirrors
 * `taskCategoryCatalogueEntryFor`'s own "unreachable for a type-checked caller" posture; every
 * `successorCode` in the catalogue above is itself a real `code` of another row in the SAME array).
 */
export function taskCategoryCatalogueEntryForCode(code: number): TaskCategoryCatalogueEntry {
  const entry = TASK_CATEGORY_CATALOGUE.find((e) => e.code === code);
  if (!entry) {
    throw new Error(`[task-category-catalogue] Unknown TaskCategory code: ${code} (not in the closed catalogue).`);
  }
  return entry;
}

/**
 * The DD-F2 closed-world boot check: every `live:true` row MUST declare all FOUR bindings non-empty/
 * non-null (`masteryEvents`, `decisionExtractors`, `guardSites`, `successorCode`); every `live:false` row
 * MUST declare all four EMPTY/null (never a fig-leaf placeholder). Throws on the FIRST violation — the
 * caller (`DelegationRatchetModule.onApplicationBootstrap`) lets this propagate to fail NestJS boot (the
 * SAME "loud misconfiguration" convention `validateStructuralDecisionCatalogueStrictMode`/`BindingRegistry`
 * use).
 *
 * Takes the catalogue as a PARAMETER (never a hardcoded read of `TASK_CATEGORY_CATALOGUE`) so the SAME
 * real validator can be exercised against a test-only, deliberately-broken clone (the C2 falsifiable
 * strict-mode proof — a spec-only catalogue clone with a LIVE entry missing a binding must fail boot,
 * mirroring P3-A's `POST /v1/_test/core-loops/validate-catalogue` C5 shape) WITHOUT ever mutating the
 * production catalogue or crashing the app under test.
 */
export function validateTaskCategoryCatalogueStrictMode(
  catalogue: readonly TaskCategoryCatalogueEntry[],
): void {
  for (const entry of catalogue) {
    if (entry.live) {
      if (
        entry.masteryEvents.length === 0 ||
        entry.decisionExtractors.length === 0 ||
        entry.guardSites.length === 0 ||
        entry.successorCode === null
      ) {
        throw new Error(
          `[task-category-catalogue] LIVE entry "${String(entry.key)}" (code ${entry.code}) is missing at ` +
            'least one of the four required bindings (masteryEvents/decisionExtractors/guardSites/' +
            'successorCode) — boot refused (DD-F2 closed-world guarantee).',
        );
      }
    } else if (
      entry.masteryEvents.length !== 0 ||
      entry.decisionExtractors.length !== 0 ||
      entry.guardSites.length !== 0 ||
      entry.successorCode !== null
    ) {
      throw new Error(
        `[task-category-catalogue] RESERVED entry "${String(entry.key)}" (code ${entry.code}) carries a ` +
          'non-empty binding — a RESERVED row must stay fully inert (never a fig-leaf) — boot refused.',
      );
    }
  }
}
