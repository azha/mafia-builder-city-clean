// Pure config for Autonomy Ceiling (#36). Values [PROV-Y26Q2] — calibrate via gdd/14 / live-ops.
//
// IMPLEMENTS: projects/mafia_city_game/gdd/14_tunable_constants.md
//             §Lieutenants behavior — Autonomy Ceiling (namespace `T.lieutenant.autonomy_ceiling.*`)
//             docs/tech/07_lieutenants_and_behavior/autonomy_ceiling.md §AutonomyCategoryEnum
//             §Budget + §Effects (buckets: depleted / low / nominal / full)
//             — Phase-19 T2 (autonomy ceiling pure helpers + tunables)
//
// R2.3: no inline numeric balance/config. All threshold values come from `lieutenantTunables.autonomyCeiling`.
// PURE: no DB / I/O / RNG. Only imports from sibling lieutenant modules (no NestJS DI).
import type { LieutenantArchetype } from '../lieutenant-archetype';
import { lieutenantTunables } from '../lieutenant-tunables';

/** The 7 canonical autonomy categories (autonomy_ceiling.md §AutonomyCategoryEnum — verbatim). */
export const AUTONOMY_CATEGORIES = [
  'PRODUCTION_OPS',
  'LOGISTICS_ROUTING',
  'DISTRIBUTION_DISPATCH',
  'LAUNDERING_FLOW',
  'SECURITY_RESPONSE',
  'BOOKKEEPING_AUDIT',
  'CROSS_CATEGORY_INCIDENT',
] as const;

export type AutonomyCategory = (typeof AUTONOMY_CATEGORIES)[number];

/** Qualitative bucket for the autonomy counter (autonomy_ceiling.md §Budget §bucket_cuts). */
export type AutonomyBucket = 'depleted' | 'low' | 'nominal' | 'full';

/** One per-category budget entry (current counter + cap + derived bucket + last decrement tick). */
export interface BudgetEntry {
  current: number;
  cap: number;
  bucket: AutonomyBucket;
  last_decrement_tick: number;
  /**
   * The one-shot override flag (Phase-19 L1a T7 — AutonomyDecision.override_one_shot). When true, the NEXT pre-action gate
   * (checkAndConsume) HONORS the action WITHOUT consuming the budget (even depleted) and CLEARS the flag — a single
   * gate-bypass the player grants. Optional/absent on a fresh seed (treated as false). Never surfaced (R2.2 — a private
   * gate detail).
   */
  override_next?: boolean;
}

/** The full autonomy budget for a lieutenant (one entry per AutonomyCategory). */
export interface Budget {
  entries: Record<AutonomyCategory, BudgetEntry>;
  generation_strategy: 'ARCHETYPE_SEED';
  /**
   * The per-decision-kind cooldown ledger (Phase-19 L1a T7 — the last tick each AutonomyDecision kind was applied for this
   * lieutenant). applyDecision refuses (409 RESOURCE_STATE_CONFLICT) a same-kind decision before
   * `decisionCooldownTicks` has elapsed since this stamp. Optional/absent on a fresh seed (no decision applied yet).
   * Keyed by the decision kind ('reset_budget' | 'raise_ceiling' | 'override_one_shot'). Never surfaced (R2.2 — a private
   * BO ledger).
   */
  last_decision_ticks?: Record<string, number>;
}

/**
 * Canonical archetype → primary category mapping (autonomy_ceiling.md §PerArchetypeCapsResolver).
 * Each archetype has ONE primary category (its own domain). All other categories use `globalDefaultCap`.
 */
const ARCHETYPE_CATEGORY: Record<LieutenantArchetype, AutonomyCategory> = {
  COOK: 'PRODUCTION_OPS',
  LOGISTICS: 'LOGISTICS_ROUTING',
  DISTRIBUTION: 'DISTRIBUTION_DISPATCH',
  LAUNDERING: 'LAUNDERING_FLOW',
  SECURITY: 'SECURITY_RESPONSE',
  BOOKKEEPER: 'BOOKKEEPING_AUDIT',
  // 04b-B C3 DD-MUSCLE [PROV-Y26Q2]: MUSCLE uses SECURITY_RESPONSE as its primary autonomy category
  // (closest to combat operations in the current enum — the conflict-layer calibration TD will
  // refine this when the full AutonomyCategoryEnum is extended for combat).
  MUSCLE: 'SECURITY_RESPONSE',
  // 04b-C C3 DD-INTEL [PROV-Y26Q2]: INTELLIGENCE uses SECURITY_RESPONSE as its primary autonomy
  // category (closest to info-warfare / surveillance operations in the current enum — the
  // conflict-layer calibration TD will extend AutonomyCategoryEnum for intel-ops when C9+ lands).
  INTELLIGENCE: 'SECURITY_RESPONSE',
  // 04f-A C7 [PROV-Y26Q2]: FACILITY_MANAGER uses PRODUCTION_OPS as its primary autonomy category — no
  // dedicated MAINTENANCE_OPS category exists in the current AUTONOMY_CATEGORIES enum, and keeping a building
  // operational (maintenance upkeep) is closest to the production/building-ops domain COOK already owns. This
  // mapping is required purely for TS exhaustiveness on ARCHETYPE_CATEGORY (every LieutenantArchetype needs a
  // primary category) — the shipped default script (`schedule_maintenance(most_due)`, D9) NEVER resolves
  // EXECUTE_DEFAULT, so this category is not exercised by the launch behavior; a hand-authored
  // EXECUTE_DEFAULT-based Facility-manager script would consult it. A future maintenance-specific category is
  // a calibration TD, same posture as MUSCLE/INTELLIGENCE above.
  FACILITY_MANAGER: 'PRODUCTION_OPS',
};

/**
 * Returns the primary autonomy category for a given archetype.
 * (CROSS_CATEGORY_INCIDENT is a system-generated category — no archetype owns it as primary.)
 */
export function projectCategory(a: LieutenantArchetype): AutonomyCategory {
  return ARCHETYPE_CATEGORY[a];
}

/**
 * Resolves the ceiling cap for a given (archetype, category) pair (gdd/14 R2.3):
 * - When the category matches the archetype's primary domain → `perArchetypeCap` (higher, specialised).
 * - Otherwise → `globalDefaultCap` (lower, cross-category fallback).
 */
export function capFor(archetype: LieutenantArchetype, category: AutonomyCategory): number {
  const own = projectCategory(archetype);
  return category === own
    ? lieutenantTunables.autonomyCeiling.perArchetypeCap
    : lieutenantTunables.autonomyCeiling.globalDefaultCap;
}

/**
 * Derives the qualitative `AutonomyBucket` from the private counter + its cap:
 *   depleted  — counter ≤ 0
 *   low       — ratio ≤ 0.25
 *   nominal   — ratio ≤ 0.75
 *   full      — ratio > 0.75
 * (mirrors the `lieutenant.autonomy_bucket_boundaries = [0.25, 0.5, 0.75]` triple from gdd/14 line 647,
 * projected to the 4-bucket shape used by autonomy_ceiling.md §bucket_cuts)
 */
export function bucketForCounter(current: number, cap: number): AutonomyBucket {
  if (current <= 0) return 'depleted';
  const ratio = current / Math.max(1, cap);
  if (ratio <= 0.25) return 'low';
  if (ratio <= 0.75) return 'nominal';
  return 'full';
}

/**
 * Seeds a fresh autonomy budget for a lieutenant on first assignment (generation_strategy = ARCHETYPE_SEED):
 * each category is initialised to its full cap, bucket = 'full', last_decrement_tick = 0.
 */
export function seedBudget(archetype: LieutenantArchetype): Budget {
  const entries = {} as Record<AutonomyCategory, BudgetEntry>;
  for (const cat of AUTONOMY_CATEGORIES) {
    const cap = capFor(archetype, cat);
    entries[cat] = { current: cap, cap, bucket: 'full', last_decrement_tick: 0 };
  }
  return { entries, generation_strategy: 'ARCHETYPE_SEED' };
}
