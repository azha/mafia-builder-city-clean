// IMPLEMENTS: docs/superpowers/specs/2026-06-10-phase-19-autonomy-ceiling-backend-design.md §3.5
//             (the per-archetype A/B OptionPair catalogue — the two qualitative actions the player picks between when a
//             delegated lieutenant's autonomous EXECUTE_DEFAULT is refused) -- Phase-19 L1a Task 5 (refusal report options) --
//
// PURE: a static, code-owned catalogue — no DB / I/O / RNG. One OptionPair per LieutenantArchetype: option_a is the
// "act now" branch (the immediate default the delegation would have taken), option_b is the conservative / deferred
// alternative. Each option carries a CLOSED qualitative `effect_kind` (the handler key T6 dispatches on), the i18n
// `label_key`, and a CLOSED `projected_outcome` band (R2.2 — a qualitative outcome hint, never a raw scalar). The
// producer (T5) reads OPTION_PAIRS[archetype] to bake the A/B options into the report issue; T6 resolves the player's
// choice by the picked option's `effect_kind`.

import type { LieutenantArchetype } from '../lieutenant-archetype';

export type EffectKind =
  | 'COOK_NOW' | 'COOK_REFINE' | 'INJECT_BASELINE' | 'INJECT_CONSERVATIVE'
  | 'DEPOSIT_MAX' | 'DEPOSIT_RESERVE' | 'REPAIR_NOW' | 'DEFER'
  | 'DISPATCH_NOW' | 'HOLD' | 'COLLECT_NOW' | 'LET_RIDE';
export type ProjectedOutcomeBucket = 'MINIMAL' | 'TRADEOFF' | 'ELEVATED_EXPOSURE' | 'OPPORTUNITY_COST';
export interface AutonomyOption { effect_kind: EffectKind; label_key: string; projected_outcome: ProjectedOutcomeBucket; }
export interface OptionPair { option_a: AutonomyOption; option_b: AutonomyOption; }
export interface ReportIssue { issue_id: string; category: string; refused_action: string; option_a: AutonomyOption; option_b: AutonomyOption; }

// W6.2 C0 — `projected_outcome` → `hidden_curriculum_norms_vector.witnessed_event_ring[].event_type` (2-bit, 0-3).
// PURE, exhaustive, no `default` (TS narrows `ProjectedOutcomeBucket`'s 4 members — a 5th bucket added to the union
// without a matching arm here is a COMPILE ERROR, never a silent fallthrough). Design
// docs/superpowers/specs/2026-08-13-w6.2-04c-player-surface-design.md §3 C0: "la correspondance tombe juste... 4 → 4,
// aucun reste" — `option-pairs.ts` already carries exactly 4 distinct `ProjectedOutcomeBucket` values (this file,
// above) and `hidden-curriculum.service.ts`'s `EVENT_TYPE_TO_NORMS` already carries exactly 4 event types (0-3) — this
// function is the ONLY new mapping C0 introduces (the event_type → norms table it feeds already exists, greenfield
// R7a). The mapping itself is arbitrary (any bijection satisfies "4→4, no remainder") — chosen in AutonomyOption
// declaration order (MINIMAL/TRADEOFF/ELEVATED_EXPOSURE/OPPORTUNITY_COST) for readability, not semantic necessity.
export function projectedOutcomeToEventType(bucket: ProjectedOutcomeBucket): number {
  switch (bucket) {
    case 'MINIMAL':           return 0;
    case 'TRADEOFF':          return 1;
    case 'ELEVATED_EXPOSURE': return 2;
    case 'OPPORTUNITY_COST':  return 3;
  }
}

export const OPTION_PAIRS: Record<LieutenantArchetype, OptionPair> = {
  COOK:        { option_a: { effect_kind: 'COOK_NOW',         label_key: 'autonomy.cook.now',         projected_outcome: 'MINIMAL' },          option_b: { effect_kind: 'COOK_REFINE',         label_key: 'autonomy.cook.refine',       projected_outcome: 'TRADEOFF' } },
  LAUNDERING:  { option_a: { effect_kind: 'INJECT_BASELINE',  label_key: 'autonomy.launder.baseline', projected_outcome: 'ELEVATED_EXPOSURE' }, option_b: { effect_kind: 'INJECT_CONSERVATIVE', label_key: 'autonomy.launder.safe',      projected_outcome: 'OPPORTUNITY_COST' } },
  BOOKKEEPER:  { option_a: { effect_kind: 'DEPOSIT_MAX',      label_key: 'autonomy.book.max',         projected_outcome: 'MINIMAL' },          option_b: { effect_kind: 'DEPOSIT_RESERVE',     label_key: 'autonomy.book.reserve',      projected_outcome: 'TRADEOFF' } },
  SECURITY:    { option_a: { effect_kind: 'REPAIR_NOW',       label_key: 'autonomy.sec.repair',       projected_outcome: 'TRADEOFF' },          option_b: { effect_kind: 'DEFER',               label_key: 'autonomy.sec.defer',         projected_outcome: 'OPPORTUNITY_COST' } },
  LOGISTICS:   { option_a: { effect_kind: 'DISPATCH_NOW',     label_key: 'autonomy.log.dispatch',     projected_outcome: 'MINIMAL' },          option_b: { effect_kind: 'HOLD',                label_key: 'autonomy.log.hold',          projected_outcome: 'OPPORTUNITY_COST' } },
  DISTRIBUTION:{ option_a: { effect_kind: 'COLLECT_NOW',      label_key: 'autonomy.dist.collect',     projected_outcome: 'MINIMAL' },          option_b: { effect_kind: 'LET_RIDE',            label_key: 'autonomy.dist.letride',      projected_outcome: 'OPPORTUNITY_COST' } },
  // 04b-B C3 DD-MUSCLE [PROV-Y26Q2]: MUSCLE option pair (no MUSCLE-specific EffectKind yet — the conflict-layer
  // calibration TD will author dedicated EffectKind values for the Muscle autonomy report). For C3, MUSCLE reuses
  // DEFER (wait-for-better-moment) and REPAIR_NOW (best-available placeholder — not semantically ideal).
  // The AutonomyReportProducer fires MUSCLE options when the assault budget is depleted; the full pair is a C-cas TD.
  MUSCLE:        { option_a: { effect_kind: 'REPAIR_NOW',       label_key: 'autonomy.muscle.assault',   projected_outcome: 'ELEVATED_EXPOSURE' }, option_b: { effect_kind: 'DEFER',               label_key: 'autonomy.muscle.wait',       projected_outcome: 'OPPORTUNITY_COST' } },
  // 04b-C C3 DD-INTEL [PROV-Y26Q2]: INTELLIGENCE option pair (no INTELLIGENCE-specific EffectKind yet
  // — the C9 surveillance_op TD will author dedicated EffectKind values for intel-op autonomy reports).
  // For C3, INTELLIGENCE reuses DEFER (wait-for-better-moment) and REPAIR_NOW (placeholder only — not
  // semantically ideal). The AutonomyReportProducer fires INTELLIGENCE options when the intel-op budget
  // is depleted; the full pair with dedicated EffectKinds is a C9+ TD.
  INTELLIGENCE:  { option_a: { effect_kind: 'REPAIR_NOW',       label_key: 'autonomy.intel.observe',    projected_outcome: 'ELEVATED_EXPOSURE' }, option_b: { effect_kind: 'DEFER',               label_key: 'autonomy.intel.wait',        projected_outcome: 'OPPORTUNITY_COST' } },
  // 04f-A C7 [PROV-Y26Q2]: FACILITY_MANAGER option pair (no dedicated EffectKind yet — a future maintenance
  // calibration TD will author SCHEDULE_NOW/DEFER_MAINTENANCE EffectKind values). Required for TS
  // exhaustiveness on OPTION_PAIRS (every LieutenantArchetype needs an entry); reuses REPAIR_NOW (closest
  // "spend cash now to fix a building" placeholder) / DEFER (wait-for-better-moment) — mirrors the
  // MUSCLE/INTELLIGENCE placeholder posture. Only exercised if a hand-authored Facility-manager script ever
  // resolves EXECUTE_DEFAULT and depletes the budget (the shipped default script uses schedule_maintenance,
  // which does not flow through the autonomy-report refusal path at all).
  FACILITY_MANAGER: { option_a: { effect_kind: 'REPAIR_NOW', label_key: 'autonomy.facility.schedule_now', projected_outcome: 'TRADEOFF' }, option_b: { effect_kind: 'DEFER', label_key: 'autonomy.facility.wait', projected_outcome: 'OPPORTUNITY_COST' } },
};
