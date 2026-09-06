// IMPLEMENTS: docs/superpowers/plans/2026-07-24-p3-H-vertical-horizon-plan.md C2 ("Decision Horizon Lock:
//             ExecutionPlan creation + tier-column activation").
//             Design: docs/superpowers/specs/2026-07-24-p3-H-vertical-horizon-design.md D1 ("`cycles_
//             ahead` + `available_deviation_modes` are DERIVED from the tier at read (never stored)") +
//             §6.1 ("the tier ladder ABORT@T1 / +ESCALATE@T2 / +ADAPT@T3") + §6.5 (v1 minimal constraint
//             set — LIEUTENANT_PRESENT + STANDING_ORDER_ACTIVE, C2's own falsifiable; C3 adds
//             CAPABILITY_DEBT_BELOW per ★H-2 WIRE-LIVE once its own read surface lands — see this file's
//             own `ConstraintClause` note below).
//             Pattern (pure, registry-free derivation file — no DI, a closed lookup, fixed ladder never a
//             tunable): `penalty-bucket.ts` / `mastery-bucket.ts`.
//             — P3-H C2 — 2026-07-24
//
// `horizon-tier-ladder.ts` — the PURE `DecisionHorizonTier -> {cycles_ahead, available_deviation_modes}`
// derivation (D1: never stored, always read fresh from the tier + the LIVE tunables). The tier LADDER
// itself (which mode unlocks at which tier) is a fixed canon shape (design §6.1), never a tunable; the
// per-tier WINDOW BOUND is tunable (`cycles_per_horizon_tier_t{1,2,3}`, `meta-progression-tunables.ts`).

import { metaProgressionTunables } from './meta-progression-tunables';

/** `player_progression_state.decision_horizon_tier` domain (`pps_decision_horizon_tier_chk BETWEEN 1 AND 3`). */
export type DecisionHorizonTier = 1 | 2 | 3;

/** `deviation_mode` pgEnum domain (design §3/D4) — the plan's OWN deviation disposition. */
export type DeviationModeValue = 'ABORT' | 'ESCALATE' | 'ADAPT';

/** design §6.1 verbatim tier ladder — fixed canon shape, NOT a tunable (only the window BOUND per tier is). */
const DEVIATION_MODES_BY_TIER: Readonly<Record<DecisionHorizonTier, readonly DeviationModeValue[]>> = {
  1: ['ABORT'],
  2: ['ABORT', 'ESCALATE'],
  3: ['ABORT', 'ESCALATE', 'ADAPT'],
};

/** `available_modes(tier)` (design §6.1) — the deviation modes unlocked at this tier, ascending. */
export function availableDeviationModesForTier(tier: DecisionHorizonTier): readonly DeviationModeValue[] {
  return DEVIATION_MODES_BY_TIER[tier];
}

/** `cycles_ahead(tier)` (design §6.1) — the LIVE, value-sensitive `cycles_per_horizon_tier_t{1,2,3}` getter. */
export function cyclesAheadForTier(tier: DecisionHorizonTier): number {
  if (tier === 1) return metaProgressionTunables.cyclesPerHorizonTierT1;
  if (tier === 2) return metaProgressionTunables.cyclesPerHorizonTierT2;
  return metaProgressionTunables.cyclesPerHorizonTierT3;
}

/**
 * `script_stability_cycles_tierN` (design D6/D5) — the LIVE, value-sensitive threshold a
 * `(player,lieutenant)` `ScriptStabilityCounter` must reach to advance INTO `targetTier` (2 or 3 only —
 * D1's own 1..3 domain has no tier beyond 3, so no `..._tier4` getter exists).
 *
 * ★ P3-H C8 DRY hoist (fix-in-passing, disclosed): this function originally lived PRIVATE inside
 * `horizon-tier-advancement.service.ts` (C4, named `thresholdForTargetTier`) — the tier-advance GATE's own
 * threshold read. C8 adds a SECOND consumer (`ExecutionPlanService.listTimeline`'s `StabilityBucketEnum`
 * DISPLAY derivation, design D5/§10) that needs the IDENTICAL threshold, so it is hoisted here — this
 * file's own established "pure, registry-free derivation" home (mirrors `cyclesAheadForTier` immediately
 * above) — rather than kept as two independently-drifting copies (this codebase's own DRY discipline, `git
 * log` shows the SAME hoist pattern elsewhere, e.g. `capability-catalogue.ts`). Zero behavior change for
 * the C4 gate — `horizon-tier-advancement.service.ts` now imports this instead of defining it locally
 * (byte-identical resolved values, re-floored at C8 via the full owning-dir suite).
 */
export function scriptStabilityThresholdForTargetTier(targetTier: number): number {
  if (targetTier === 2) return metaProgressionTunables.scriptStabilityCyclesTier2;
  return metaProgressionTunables.scriptStabilityCyclesTier3; // targetTier === 3 (the ONLY other reachable value — see both callers' own guards).
}

/** `constraint_condition_type` pgEnum domain (design §3/§7 — 3 LIVE + 2 RESERVED, C1 schema). */
export type ConstraintConditionType =
  | 'LIEUTENANT_PRESENT'
  | 'STANDING_ORDER_ACTIVE'
  | 'BUDGET_FLOOR'
  | 'EXTERNAL_EVENT_ABSENT'
  | 'CAPABILITY_DEBT_BELOW';

/** `deviation_severity` pgEnum domain (design §3/§7.2 — ascending NEGLIGIBLE < MODERATE < SEVERE). */
export type DeviationSeverityValue = 'NEGLIGIBLE' | 'MODERATE' | 'SEVERE';

/**
 * A single `execution_cycle_slots.expected_constraints[]` element (jsonb array member) — the v1 minimal
 * shape: which real-state clause the C3 `DeviationEvaluatorService` must check, plus the criticality a
 * FAILED check of this clause carries (`tolerance_bucket` — design D13's own "identical-criticality to the
 * vanished-lieutenant clause" framing for the debt clause implies every LIVE v1 clause is SEVERE: a
 * vanished lieutenant or a lapsed order are both plan-breaking, never merely negligible/moderate).
 */
export interface ConstraintClause {
  readonly type: ConstraintConditionType;
  readonly tolerance_bucket: DeviationSeverityValue;
}

/**
 * design §6.1/§6.5/D13 — the `expected_constraints` set emitted into EVERY slot at plan creation.
 *
 * ★ C2→C3 EXTENSION (disclosed, loud — flagged for reviewer ⊥/controller, per C2's own header note on
 * this exact function): C2 shipped this as a 2-clause MINIMAL set (`LIEUTENANT_PRESENT` +
 * `STANDING_ORDER_ACTIVE`) — the design doc's §6.5 prose (D13, post-★H-2-WIRE-LIVE rewrite) already
 * described the FULL 3-clause set, but C0-reanchor §6/R4 pinned the `CAPABILITY_DEBT_BELOW` raw-debt read
 * (`CapabilityDebtsRepository.getRawBucketsForPlayer` + the `BudgetsHorizonModule` DI import) as
 * "★ DEFINITIVE FOR C3", not C2 — so C2 could not honestly wire it yet. C3 EXTENDS this function to the
 * 3-clause set now that the read surface exists (D13 ③: "emitted into every plan's slots at creation, ALL
 * tiers — canon frames it in the T3 context but the clause applies uniformly").
 *
 * ★ 2-clause vs 3-clause plans (the C2→C3 owed-extension resolution, stated plainly): `execution_cycle_
 * slots.expected_constraints` is a PERSISTED jsonb column, stamped ONCE at `createWithSlots` time
 * (`execution-plans.repository.ts`) — it is never re-derived or backfilled. A plan created BEFORE this C3
 * change landed therefore carries the OLD 2-clause set forever; a plan created AFTER carries this NEW
 * 3-clause set. `ExecutionPlanEvaluatorService`/`DeviationEvaluatorService` (C3) evaluate EXACTLY the
 * clauses present in `slot.expected_constraints` — data-driven off the persisted array, never a
 * re-derivation from the CURRENT catalogue — so a pre-C3 2-clause plan is legitimately, honestly NEVER
 * debt-evaluated (its slots simply do not carry that clause); design D3's own text is explicit on this
 * point ("read the slot's `expected_constraints[]`, evaluate each"). D13's own "the evaluator reads the
 * CURRENT bucket per cycle" sentence refers to the DEBT VALUE being freshly re-queried every cycle (never
 * cached/stale), NOT to the CLAUSE SET being re-derived — those are two different "current"s; only the
 * value is live-read, the clause membership is whatever was persisted at creation. No migration/backfill
 * of pre-C3 rows is performed (none is needed — the persisted set is definitionally honest for the tier
 * of debt-coupling that existed when the plan was created).
 */
export function minimalExpectedConstraints(): ConstraintClause[] {
  return [
    { type: 'LIEUTENANT_PRESENT', tolerance_bucket: 'SEVERE' },
    { type: 'STANDING_ORDER_ACTIVE', tolerance_bucket: 'SEVERE' },
    { type: 'CAPABILITY_DEBT_BELOW', tolerance_bucket: 'SEVERE' },
  ];
}
