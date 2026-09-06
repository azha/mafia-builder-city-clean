// IMPLEMENTS: docs/superpowers/plans/2026-07-10-p3-A-session-spine-plan.md §C5 (Loop 10 governor +
//             catalogue — D7 closed int-coded catalogue: originally 6 LIVE + 8 RESERVED; P3-C C4 flips
//             code 10 → 7 LIVE + 7 RESERVED; P3-C C7 flips code 9 → 8 LIVE + 6 RESERVED; P3-E C4 flips
//             code 11 → 9 LIVE + 5 RESERVED; P3-F C5 flips code 7 → 10 LIVE + 4 RESERVED; P3-F C8 APPENDS
//             code 15 → 11 LIVE + 4 RESERVED, 15 entries total)
//             P3-F C5 flip: docs/superpowers/plans/2026-07-18-p3-F-delegation-ratchet-plan.md C5 +
//             docs/superpowers/specs/2026-07-18-p3-F-delegation-ratchet-design.md §8.1 (TASK_RETIREMENT —
//             the ch06 Delegation Ratchet's graduation verb, the RESERVED code P3-A itself named for
//             this lot at authoring time).
//             P3-F C8 append: docs/superpowers/plans/2026-07-18-p3-F-delegation-ratchet-plan.md C8 +
//             docs/superpowers/specs/2026-07-18-p3-F-delegation-ratchet-design.md §9.1/D7 (TASK_RECALL —
//             the ch06 Delegation Ratchet's recall verb; a NEW code, never RESERVED — decisions §4 #19:
//             P3-A's catalogue "was born extensible", ★#3 ruled recall structural).
//             P3-G C5 append: docs/superpowers/plans/2026-07-19-p3-G-budgets-horizon-plan.md C5 +
//             docs/superpowers/specs/2026-07-19-p3-G-budgets-horizon-design.md §9/D7 (CAPABILITY_ADOPT —
//             the ch06 Budgets & Horizon lot's adoption verb; a NEW code, never RESERVED — decisions §6
//             ★#2 RATIFIED: adoption consumes the SAME 1/session structural cap as graduation/recall,
//             the P3-F #19 "catalogue was born extensible" precedent reconduced).
//             Design: docs/superpowers/specs/2026-07-10-p3-A-session-spine-design.md §6 (catalogue +
//             strict-mode boot check) + §1 D7.
//             Decisions: docs/superpowers/specs/2026-07-10-p3-A-session-spine-decisions.md §1.7 D7
//             (closed int catalogue aligned with `structural_decisions_audit.decision_type`) + §6
//             RULING #3 (the 6 LIVE sites — full honest coverage, default).
//             P3-C C4 flip: docs/superpowers/specs/2026-07-12-p3-C-supply-chain-design.md §5.4
//             (MYCELIAL_STRUCTURAL_REINFORCE — the Loop 5 maintenance verb's ONE structural mode).
//             P3-C C7 flip: docs/superpowers/specs/2026-07-12-p3-C-supply-chain-design.md §7.4
//             (SINUOSITY_FULL_RESET — the Loop 4 rebuild verb's ONE structural mode, FULL_GEOMETRIC_
//             RESET; ruling-B dual-drivers does NOT change this — code 9 was already RESERVED for this
//             lot under EITHER option A or B, plan §C7 sub-task 3 "identique").
//             P3-E C4 flip: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §3.1
//             (NODE_DECOMMISSION — the Loop 8 decommission verb, cap 1/session like every other
//             structural site; R15 froze this flip's exact target array at C0).
//             Canon: docs/tech/05_player_core_loops/one_decision_per_session.md §Tactical vs
//             Structural classification.
//             — P3-A C5 — 2026-07-10 / P3-C C4 (code 10 flip) — 2026-07-12 / P3-C C7 (code 9 flip) — 2026-07-13
//             / P3-E C4 (code 11 flip) — 2026-07-17 / P3-F C5 (code 7 flip) — 2026-07-19 / P3-F C8
//             (code 15 append) — 2026-07-19 / P3-G C5 (code 16 append) — 2026-07-20
//
// `StructuralDecisionType` — the CLOSED catalogue (D7): a decision type is STRUCTURAL iff it is
// catalogued here (canon `one_decision_classification_strict_mode = true`, closed-world). Everything
// else (Exception Queue verdicts, flag dismissals, reorders, traces…) is TACTICAL by NOT being here —
// no tactical registry is needed. 12 entries are `live: true` (each maps to a REAL retrofit site — §7 of
// the design for the original 6, P3-C C4 design §5.4 for the 7th [code 10], P3-C C7 design §7.4 for the
// 8th [code 9], P3-E C4 design §3.1 for the 9th [code 11], P3-F C5 design §8.1 for the 10th [code 7],
// P3-F C8 design §9.1 for the 11th [code 15, TASK_RECALL — a NEW append, not a RESERVED flip], P3-G C5
// design §9 for the 12th [code 16, CAPABILITY_ADOPT — ALSO a NEW append, not a RESERVED flip]);
// 4 are `live: false` RESERVED — inert, honest placeholders for systems that do not exist yet, each
// named for the future P3/04f lot that will claim
// its code (never fig-leaf wired). Codes are stable + append-only (a code, once assigned, is NEVER
// reused or renumbered).
//
// `validateStructuralDecisionCatalogueStrictMode` is the boot-time closed-world guarantee (D7's
// `one_decision_classification_strict_mode` tunable, default true — gated by the caller, `loop10.
// module.ts`'s `onApplicationBootstrap`): every LIVE entry MUST declare a non-empty `site` — a live
// entry with no registered guard site is a loud misconfiguration (boot fails), mirroring
// `BindingRegistry`'s throw-on-duplicate-archetype convention (lieutenant/binding-registry.service.ts).

/**
 * The closed set of decision-type keys. TS union is CLOSED over the catalogue below — a caller of
 * `StructuralDecisionGovernorService.commit` can only pass one of these values (the type system itself
 * prevents "a guarded site with no catalogue entry", the reverse direction of the D7 closed-world
 * guarantee).
 */
export enum StructuralDecisionType {
  // ── 6 LIVE (D7 / decisions §6 RULING #3 — full honest coverage) ──────────────────────────────────
  BUILDING_ACQUISITION = 'BUILDING_ACQUISITION',
  BUILDING_CONVERT = 'BUILDING_CONVERT',
  LIEUTENANT_RECRUIT = 'LIEUTENANT_RECRUIT',
  LIEUTENANT_ROLE_REASSIGN = 'LIEUTENANT_ROLE_REASSIGN',
  BEHAVIOR_SCRIPT_REPLACE = 'BEHAVIOR_SCRIPT_REPLACE',
  AUTONOMY_TIER_CHANGE = 'AUTONOMY_TIER_CHANGE',
  // ── 8 RESERVED (inert — no live system; each named for its future lot, design §1 D7) ─────────────
  TASK_RETIREMENT = 'TASK_RETIREMENT',
  ORG_TOPOLOGY_CHANGE = 'ORG_TOPOLOGY_CHANGE',
  SINUOSITY_FULL_RESET = 'SINUOSITY_FULL_RESET',
  MYCELIAL_STRUCTURAL_REINFORCE = 'MYCELIAL_STRUCTURAL_REINFORCE',
  NODE_DECOMMISSION = 'NODE_DECOMMISSION',
  SUBSTANCE_UNLOCK = 'SUBSTANCE_UNLOCK',
  RECRUITMENT_FINALIZE = 'RECRUITMENT_FINALIZE',
  NAMED_SEQUENCE_SAVE = 'NAMED_SEQUENCE_SAVE',
  // P3-F C8 — the ch06 Delegation Ratchet's recall verb (design §9.1/D7 — ★#3 ruled: recall is
  // STRUCTURAL too, same 1/session cap as graduation). APPENDED, never renumbered (decisions §4 #19).
  TASK_RECALL = 'TASK_RECALL',
  // P3-G C5 — the ch06 Budgets & Horizon lot's adoption verb (design §9/D7 — ★#2 RATIFIED: adopting a
  // capability re-shapes what the org can express, symmetric with graduation/recall's own "org-shaping"
  // classification). APPENDED, never renumbered (decisions §6 ★#2, the #19 precedent reconduced).
  CAPABILITY_ADOPT = 'CAPABILITY_ADOPT',
}

/** One catalogue row. `code` is the raw int written to `structural_decisions_audit.decision_type`
 *  (GDD-verbatim int raw catalogue, BO-only). `site` is a human-readable file#method pointer for the
 *  ACTUAL retrofit call site (strict-mode boot check requires it on every `live: true` row — never
 *  read/parsed, purely documentary + the closed-world proof). `futureLot` names the P3/04f sub-lot that
 *  will claim a RESERVED code (honest, never invented — 'TBD' where no owner lot has been named yet). */
export interface StructuralDecisionCatalogueEntry {
  readonly code: number;
  readonly key: StructuralDecisionType;
  readonly live: boolean;
  readonly site?: string;
  readonly futureLot?: string;
}

/**
 * `STRUCTURAL_DECISION_CATALOGUE` — the closed catalogue (D7): 12 LIVE + 4 RESERVED = 16 entries (P3-C C4
 * flipped code 10, P3-C C7 flipped code 9, P3-E C4 flipped code 11, P3-F C5 flipped code 7 — 4 RESERVED→
 * LIVE flips, entry count unchanged; P3-F C8 APPENDS a genuinely NEW code, 15/TASK_RECALL, and P3-G C5
 * APPENDS a SECOND genuinely NEW code, 16/CAPABILITY_ADOPT — the catalogue's growth beyond its original
 * 15-entry P3-A shape, per decisions §4 #19 "the catalogue was born extensible" reconduced at P3-G ★#2).
 * Aligned 1:1 with `StructuralDecisionType` (every enum member has exactly one row, every row's `key` is
 * a real enum member — both directions closed).
 */
export const STRUCTURAL_DECISION_CATALOGUE: readonly StructuralDecisionCatalogueEntry[] = [
  // ── 11 LIVE — each wired at a REAL retrofit site (design §6/§7 for the original 6; P3-C C4 design
  //    §5.4 for the 7th, code 10; P3-C C7 design §7.4 for the 8th, code 9; P3-E C4 design §3.1 for the
  //    9th, code 11; P3-F C5 design §8.1 for the 10th, code 7; P3-F C8 design §9.1 for the 11th,
  //    code 15 — a NEW append, not a flip) ──────────────────────────────────────────────────────────
  { code: 1, key: StructuralDecisionType.BUILDING_ACQUISITION, live: true,
    site: 'operational/real_estate/real-estate.controller.ts#purchase' },
  { code: 2, key: StructuralDecisionType.BUILDING_CONVERT, live: true,
    site: 'operational/real_estate/real-estate.controller.ts#convert' },
  { code: 3, key: StructuralDecisionType.LIEUTENANT_RECRUIT, live: true,
    site: 'operational/lieutenant/lieutenant.controller.ts#recruit' },
  { code: 4, key: StructuralDecisionType.LIEUTENANT_ROLE_REASSIGN, live: true,
    site: 'operational/lieutenant/lieutenant.controller.ts#reassign' },
  { code: 5, key: StructuralDecisionType.BEHAVIOR_SCRIPT_REPLACE, live: true,
    site: 'operational/lieutenant/lieutenant.controller.ts#attachScript (wholesale replace — NOT the ' +
      'tactical ADD_RULE-via-exception-resolve path, exceptions/effects/add-rule.handler.ts, which ' +
      'stays unguarded per canon)' },
  { code: 6, key: StructuralDecisionType.AUTONOMY_TIER_CHANGE, live: true,
    site: "operational/lieutenant/lieutenant.controller.ts#autonomyDecision (kind==='raise_ceiling' " +
      'ONLY — reset_budget/override_one_shot stay tactical, unguarded)' },
  // P3-C C4 — code 10 FLIPPED live (was RESERVED futureLot:'P3-C'): the Loop 5 Mycelial Ledger
  // maintenance verb's ONE structural mode (design §5.4 — QUICK_PATCH/REROUTE_BYPASS stay tactical,
  // unguarded; only STRUCTURAL_REINFORCE's full-clear commits through the governor).
  { code: 10, key: StructuralDecisionType.MYCELIAL_STRUCTURAL_REINFORCE, live: true,
    site: 'core_loops/supply_chain/supply-chain.controller.ts#maintain (mode=structural_reinforce ONLY ' +
      '— quick_patch/reroute_bypass stay tactical, unguarded)' },
  // P3-C C7 — code 9 FLIPPED live (was RESERVED futureLot:'P3-C'): the Loop 4 Sinuosity Debt rebuild
  // verb's ONE structural mode (design §7.4 — MINIMAL_REROUTE/MODERATE_RESTRUCTURE stay tactical per
  // ruling #3's D7 closed-world default; only FULL_GEOMETRIC_RESET's pure-geometry reset commits
  // through the governor, capped 1/session like every other structural site).
  { code: 9, key: StructuralDecisionType.SINUOSITY_FULL_RESET, live: true,
    site: 'operational/distribution/route-rebuild.service.ts#rebuild (mode=FULL_GEOMETRIC_RESET ONLY ' +
      '— MINIMAL_REROUTE/MODERATE_RESTRUCTURE stay tactical, unguarded)' },
  // P3-E C4 — code 11 FLIPPED live (was RESERVED futureLot:'P3-E'): the Loop 8 Demolition Mandate's
  // decommission verb (design §3.1/§6 — the ONLY structural site for this lot; the replacement-option
  // pick, C5, is a purchase-flow SHORTCUT, never its own governed verb).
  { code: 11, key: StructuralDecisionType.NODE_DECOMMISSION, live: true,
    site: 'core_loops/demolition/decommission.controller.ts#decommission' },
  // P3-F C5 — code 7 FLIPPED live (was RESERVED futureLot:'P3-F'): the ch06 Delegation Ratchet's
  // graduation verb (design §8.1 — the RESERVED code P3-A named for this lot; the boot strict-check now
  // REQUIRES the site below, the closed-world contract working as designed).
  { code: 7, key: StructuralDecisionType.TASK_RETIREMENT, live: true,
    site: 'meta_progression/meta-progression.controller.ts#graduate (POST /v1/meta/graduation)' },
  // P3-F C8 — code 15 APPENDED live (a NEW code, never RESERVED — design D7/decisions §4 #19: "recall is
  // org-shape-changing... an explicit call is demanded"): the ch06 Delegation Ratchet's recall verb.
  { code: 15, key: StructuralDecisionType.TASK_RECALL, live: true,
    site: 'meta_progression/meta-progression.controller.ts#recall (POST /v1/meta/recall)' },
  // P3-G C5 — code 16 APPENDED live (a NEW code, never RESERVED — design §9/D7/decisions §6 ★#2 RATIFIED:
  // adoption is STRUCTURAL, symmetric with graduation/recall): the ch06 Budgets & Horizon lot's adoption
  // verb (the C0-reanchor R12 append template, mirroring code 15's own shape exactly).
  { code: 16, key: StructuralDecisionType.CAPABILITY_ADOPT, live: true,
    site: 'meta_progression/horizon-adoption.controller.ts#adopt (POST /v1/meta/horizon/adopt)' },

  // ── 4 RESERVED — inert, honest, no live system (design §1 D7) ────────────────────────────────────
  { code: 8, key: StructuralDecisionType.ORG_TOPOLOGY_CHANGE, live: false, futureLot: 'P3-I' },
  // SUBSTANCE_UNLOCK — canon D7 names no owner lot for this one (unlike its 7 siblings); decisions §5
  // TD routing table lists it as "→ owner lot" (unresolved) — honest 'TBD', never invented.
  { code: 12, key: StructuralDecisionType.SUBSTANCE_UNLOCK, live: false, futureLot: 'TBD' },
  { code: 13, key: StructuralDecisionType.RECRUITMENT_FINALIZE, live: false, futureLot: '04f-B' },
  { code: 14, key: StructuralDecisionType.NAMED_SEQUENCE_SAVE, live: false, futureLot: 'P3-D' },
];

/** Look up a catalogue entry by its type key. Throws if the type is somehow not catalogued (defensive —
 *  the TS enum/catalogue pairing above makes this unreachable for a type-checked caller). */
export function catalogueEntryFor(type: StructuralDecisionType): StructuralDecisionCatalogueEntry {
  const entry = STRUCTURAL_DECISION_CATALOGUE.find((e) => e.key === type);
  if (!entry) {
    throw new Error(`[structural-decision-catalogue] Unknown StructuralDecisionType: ${String(type)} (not in the closed catalogue).`);
  }
  return entry;
}

/**
 * The D7 closed-world boot check (canon `one_decision_classification_strict_mode`): every `live: true`
 * catalogue entry MUST declare a non-empty `site`. Throws (never returns a boolean) on the FIRST
 * violation — the caller (`Loop10Module.onApplicationBootstrap`, gated by
 * `coreLoopsTunables.oneDecisionClassificationStrictMode`) lets this propagate to fail NestJS boot, the
 * SAME "loud misconfiguration" convention `BindingRegistry` uses for a duplicate archetype
 * (lieutenant/binding-registry.service.ts).
 *
 * Takes the catalogue as a PARAMETER (not a hardcoded read of `STRUCTURAL_DECISION_CATALOGUE`) so the
 * SAME real validator can be exercised against a test-only, deliberately-broken array (the C5
 * falsifiable strict-mode proof: `POST /v1/_test/core-loops/validate-catalogue`, `core-loops-test.
 * controller.ts`) WITHOUT ever mutating the production catalogue or crashing the app under test.
 */
export function validateStructuralDecisionCatalogueStrictMode(
  catalogue: readonly StructuralDecisionCatalogueEntry[],
): void {
  for (const entry of catalogue) {
    if (entry.live && !entry.site) {
      throw new Error(
        `[one_decision_classification_strict_mode] Catalogue entry "${String(entry.key)}" (code ${entry.code}) ` +
          'is marked live:true but has no registered guard site — boot refused (D7 closed-world guarantee).',
      );
    }
  }
}
