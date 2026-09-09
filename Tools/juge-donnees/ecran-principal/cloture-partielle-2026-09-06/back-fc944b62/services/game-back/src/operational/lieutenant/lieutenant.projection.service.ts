// IMPLEMENTS: docs/superpowers/specs/2026-06-07-phase-06-lieutenants-dsl-slice1-design.md §4-T7/§7 (the player-facing
//             lieutenant BAND projection — qualitative bands only, R2.2 inverted; the player-authored script SOURCE is
//             the ONE explicitly-allowed readable non-band field) +
//             docs/tech/07_lieutenants_and_behavior/lieutenant_definition.md §Composite LieutenantArchetype (archetype
//             DERIVED from role_id via LieutenantArchetype — 09 has NO role_archetype column) + §Composite Lieutenant
//             (GrantedRole / TaskedVsDelegated — closed enum domains, OK to surface) +
//             docs/tech/09_data_model/schema_lieutenant.md §2/§4.1 (lieutenant.role_id / granted_role / mode /
//             delegation_paused / assigned_building_id + behavior_script.source / rules — T0, migration 0026 — READ-ONLY
//             here) +
//             docs/tech/01_pillars_and_vision/P5_information_asymmetry.md (R2.2 — no raw scalar to the client)
//             -- session:2026-06-08 (Phase 6 vector #6 lieutenants+DSL — Task 7, band projection + GET) --
//
// `LieutenantProjectionService` — the player-facing BAND projection for a lieutenant (Phase-6 vector #6 T7; R2.2
// inverted). The DIRECT sibling of MoneyHoldingProjectionService.moneyHoldingBands (the money_holding band method): it
// maps the RAW persisted lieutenant/behavior_script fields (role_id, granted_role, mode, delegation_paused,
// assigned_building_id, behavior_script.source + rules count) → a closed-domain band surface and NEVER forwards a raw
// scalar — no role_id int, no tenure_score / succession_horizon / understudy_sync_pct / burst_magnitude, no
// delegation_paused boolean, no raw rules-count int, no tick. R2.2.
//
// THE FIELDS the projection returns (all closed qualitative domains EXCEPT the one allowed readable):
//   - archetype: the behavioral archetype DERIVED from role_id via archetypeForRoleId (REUSE 04a/07 — the SAME inverse
//     map the recruit-side roleIdForArchetype() grounds; NO drift). A closed domain — all 6 SHIPPED archetypes
//     ('COOK' | 'SECURITY' | 'LOGISTICS' | 'BOOKKEEPER' | 'LAUNDERING' | 'DISTRIBUTION') resolve to their own band; the
//     neutral 'UNKNOWN' covers only a role_id with no live archetype (none recruitable now — all 6 register) — NOT the
//     raw role_id int. R2.2.
//   - granted_role: the GrantedRole enum string (advisory | executor | delegated_owner | cohort_overseer) — a CLOSED 07
//     domain, OK to surface (it is a qualitative role label, not a scalar).
//   - mode: the TaskedVsDelegated enum string (tasked | delegated) — a CLOSED 07 domain, OK to surface.
//   - op_state_band: PAUSED (delegation_paused) | ACTIVE (a cook is in progress on the assigned building) | IDLE
//     (neither). The delegation_paused boolean is surfaced ONLY as this band — never as the raw bool (R2.2). Computed via
//     ProductionService.hasCookInProgress (REUSE the cook-state service boundary the COOK binding uses — NOT re-queried).
//   - rule_count_band: NONE (0 rules) | FEW (1–5) | MANY (6+) — the count of rules in behavior_script.rules as a band,
//     NEVER the raw integer (R2.2). Thresholds documented at RULE_COUNT_* below.
//   - script_source: the player-authored DSL text (behavior_script.source). The ONE explicitly-allowed non-band field
//     (spec §7): the player WROTE it, so it is readable back (a round-trip of their own input) — NOT a judgment scalar /
//     an executor internal. NEVER the compiled IR (behavior_script.rules), which carries normalized scalars.
//
// R2.2 RAW-LEAK GUARANTEE: every field this service returns is a closed-domain string EXCEPT script_source (the player's
// own authored text). NEVER role_id, tenure_score, succession_horizon, understudy_sync_pct, burst_magnitude, the
// delegation_paused boolean, the raw rules count, or any tick. The GET no-leak E2E scans the payload recursively and
// rejects any unexpected raw scalar.
//
// P3-B C6 GROWS this contract ADDITIVELY (ch05 Loop 2 — Flag Discipline, design §7/§8 D12): +trust_budget_bucket
// (low|standard|high, DERIVED from lieutenant_flag_state.credibility_tokens — the raw token count NEVER escapes) +
// +flag_frequency_band (none|occasional|frequent, DERIVED from flagged_items — the raw count NEVER escapes). BOTH
// re-provided via FlagConvergenceService (lieutenant.module.ts, cycle-safe — see that file's own comment). The
// lieutenant_projection.spec.ts ALLOWED_KEYS whitelist is extended in the SAME commit (P3-B C6, the TD-202 lesson).

import { Injectable } from '@nestjs/common';

import { ProductionService } from '../production/production.service';
import { LieutenantRepository } from './lieutenant.repository';
import { archetypeForRoleId, type LieutenantArchetype } from './lieutenant-archetype';
import { lieutenantTunables } from './lieutenant-tunables';
import { AutonomyCeilingService } from './autonomy/autonomy-ceiling.service';
import type { AutonomyBucket } from './autonomy/autonomy-category';
import { SignalDriftService } from './signal-drift/signal-drift.service';
import type { ReliabilityBucket, DriftPhase } from './signal-drift/signal-drift-cues';
import { StandingOrderService, type StandingOrderBand } from './standing-order/standing-order.service';
import {
  bucketForStreak,
  effectsForBucket,
  type ActionCostComposite,
  type EfficiencyBonusComposite,
  type ReassignmentDisruptionComposite,
  type TenureInertiaBucketComposite,
} from './tenure-inertia';
// P3-B C6 (design §7/§8 D12) — the ch05 Loop 2 bands (token-budget bucket + 7-game-day flag-frequency
// band). `FlagConvergenceService` is re-provided DIRECTLY by THIS module (`lieutenant.module.ts`'s own
// providers array — see that file's comment: FlagDisciplineModule imports LieutenantModule, so the
// reverse import here would be the cycle). `deriveGameDay`/`citySimTunables` REUSE the SAME derivation
// every NIGHTLY/day-keyed flag-discipline tick already uses.
import { FlagConvergenceService } from '../../core_loops/flag_discipline/flag-convergence.service';
import type { TrustBudgetBucket, FlagFrequencyBand } from '../../core_loops/flag_discipline/convergence';
import { deriveGameDay } from '../political/political-trigger-evaluators';
import { citySimTunables } from '../../citysim/citysim-tunables';

/** The archetype band — the 6 behavioral archetypes (REUSE LieutenantArchetype) + the neutral 'UNKNOWN' for a role_id
 *  with no LIVE archetype (the projection never leaks the raw role_id; a non-derivable role surfaces UNKNOWN). All 6
 *  shipped archetypes (COOK/SECURITY/LOGISTICS/BOOKKEEPER/LAUNDERING/DISTRIBUTION) derive; UNKNOWN would surface only for
 *  an unmapped role_id (one of the 14-catalogue roles no archetype claims) — and every recruitable archetype maps, so in
 *  practice every projected lieutenant has a real band. */
export type ArchetypeBand = LieutenantArchetype | 'UNKNOWN';

/** The GrantedRole enum surface (REUSE 07 lieutenant_definition.md §Composite Lieutenant / GrantedRole — a closed
 *  qualitative role domain, OK to surface; NOT a scalar). */
export type GrantedRoleBand = 'advisory' | 'executor' | 'delegated_owner' | 'cohort_overseer';

/** The TaskedVsDelegated enum surface (REUSE 07 lieutenant_definition.md §Composite Lieutenant / TaskedVsDelegated — a
 *  closed qualitative mode domain, OK to surface; NOT a scalar). */
export type ModeBand = 'tasked' | 'delegated';

/** The operational-state band — the delegation_paused boolean + the settling window + the live cook state as ONE closed
 *  band (R2.2 — neither the raw delegation_paused bool nor the raw settling tick escapes; the player sees the band).
 *  SETTLING (a reassign/re-script settling window is still open — settling_until_tick > now; Phase-11 tenure inertia) |
 *  PAUSED (the script resolved PAUSE_OPS) | ACTIVE (a cook is in progress on the assigned building) | IDLE (neither —
 *  delegated-but-quiet, tasked, or no building). PRECEDENCE: SETTLING > PAUSED > ACTIVE > IDLE. */
export type OpStateBand = 'SETTLING' | 'PAUSED' | 'ACTIVE' | 'IDLE';

/** The rule-count band — the behavior_script rule count as a band (R2.2 — the raw int NEVER escapes). NONE (0 — no
 *  script attached / an empty default script) | FEW (1–5 rules) | MANY (6+ rules). */
export type RuleCountBand = 'NONE' | 'FEW' | 'MANY';

/** The tenure-bucket band — the qualitative tenure band DERIVED from the BO-only streak (Phase-11 tenure inertia; R2.2 —
 *  the raw tenure_score NEVER escapes). REUSE the canonical composite from tenure-inertia.ts (no re-derivation). FRESH for
 *  a brand-new / just-reassigned lieutenant; ENTRENCHED is the cap. */
export type TenureBucketBand = TenureInertiaBucketComposite;

/** The script-revision-cost band — how expensive re-scripting is, growing with tenure (the inertia COST). REUSE the
 *  ActionCostComposite from tenure-inertia.ts (DERIVED from the bucket via effectsForBucket — never re-derived; R2.2). */
export type ScriptRevisionCostBand = ActionCostComposite;

/** The reassignment-disruption band — how long the settling window after a move is, growing with tenure (the inertia
 *  DRAG). REUSE the ReassignmentDisruptionComposite from tenure-inertia.ts (DERIVED from the bucket; never re-derived). */
export type ReassignmentDisruptionBand = ReassignmentDisruptionComposite;

/** The role-efficiency band — the yield reward a tenured lieutenant earns (BONUS_NONE = no change for a FRESH one). REUSE
 *  the EfficiencyBonusComposite from tenure-inertia.ts (DERIVED from the bucket; never re-derived; R2.2). */
export type RoleEfficiencyBonusBand = EfficiencyBonusComposite;

/** The reassign-availability band — whether the player may reassign this lieutenant NOW, or it is on the decision cooldown
 *  (Phase-13 — the canon decision_cooldown). AVAILABLE | ON_COOLDOWN (R2.2 — the raw tenure_reset_at_tick / the tick math
 *  never escape; the player sees only the band). Derived from tenure_reset_at_tick + decision_cooldown vs the current tick. */
export type ReassignAvailabilityBand = 'AVAILABLE' | 'ON_COOLDOWN';

/**
 * The player-facing lieutenant bands (Phase-6 vector #6 T7; R2.2 — closed-domain labels only, plus the player-authored
 * script_source). The DIRECT sibling of MoneyHoldingBands. Assembled by the GET /v1/lieutenants/:id endpoint; a future
 * roster/detail surface can reuse THIS service (it is EXPORTED from LieutenantModule).
 */
export interface LieutenantBands {
  /**
   * C3 (D7, L0.5) — `lieutenant.name` (a REAL varchar(64) column, round-tripped — never derived). NOT
   * part of D7's registry SERVIE-19 population (this interface carries no `lieutenant_id` field of its
   * own — the id lives in the URL — so the M21 sweep never flags it), but the C3 charter's OWN
   * falsifiable requires it: `carte.lieutenant.name == lieutenants/:id .name` (the SAME lieutenant must
   * name identically on the exception card AND on its own detail GET).
   */
  name: string;
  /** The behavioral archetype derived from role_id (COOK | SECURITY | LOGISTICS | BOOKKEEPER | LAUNDERING | DISTRIBUTION |
   *  UNKNOWN — never the raw role_id int; R2.2). UNKNOWN only for an unmapped role_id (no recruitable archetype yields it). */
  archetype: ArchetypeBand;
  /** The GrantedRole enum (advisory | executor | delegated_owner | cohort_overseer — a closed 07 domain). */
  granted_role: GrantedRoleBand;
  /** The TaskedVsDelegated enum (tasked | delegated — a closed 07 domain). */
  mode: ModeBand;
  /** The operational-state band (SETTLING | PAUSED | ACTIVE | IDLE — the delegation_paused bool + settling window only as a
   *  band; R2.2). SETTLING takes precedence (a reassign/re-script window is still open). */
  op_state_band: OpStateBand;
  /** The rule-count band (NONE | FEW | MANY — never the raw rules count int; R2.2). */
  rule_count_band: RuleCountBand;
  /** The tenure-bucket band (FRESH | ACCLIMATED | SEASONED | SENIOR | ENTRENCHED — DERIVED from the BO-only streak via
   *  bucketForStreak; the raw tenure_score NEVER escapes; R2.2). Phase-11 tenure inertia. */
  tenure_bucket: TenureBucketBand;
  /** The script-revision-cost band (COST_1 | COST_2 | COST_3 | COST_MAX — the inertia cost, DERIVED from the bucket via
   *  effectsForBucket; R2.2). Phase-11 tenure inertia. */
  script_revision_cost: ScriptRevisionCostBand;
  /** The reassignment-disruption band (DISRUPT_SHORT | DISRUPT_MED | DISRUPT_LONG | DISRUPT_MAX — the inertia drag,
   *  DERIVED from the bucket; R2.2). Phase-11 tenure inertia. */
  reassignment_disruption: ReassignmentDisruptionBand;
  /** The role-efficiency band (BONUS_NONE | BONUS_LOW | BONUS_MID | BONUS_CAP — the tenure reward, DERIVED from the
   *  bucket; R2.2). Phase-11 tenure inertia. */
  role_efficiency_bonus: RoleEfficiencyBonusBand;
  /** The reassign-availability band (AVAILABLE | ON_COOLDOWN — the decision cooldown as a band; R2.2). Phase-13. */
  reassign_availability: ReassignAvailabilityBand;
  /** The per-category autonomy-budget BUCKET map (Phase-19 L1a; R2.2 — `{ PRODUCTION_OPS: 'full', … }`, BUCKETS ONLY, never
   *  the raw counter/cap). EMPTY ({}) when the lieutenant has no autonomy_ceiling_state row yet (a never-gated lieutenant —
   *  the projection NEVER lazy-seeds one). Each value ∈ depleted | low | nominal | full. */
  budget_bands: Record<string, AutonomyBucket>;
  /** The per-cue reliability-BUCKET map (Phase-22 L2a T4; R2.2 — `{ DIRECT_ORDER: 'reliable', RESOURCE_AVAILABILITY: 'dominant',
   *  … }`, BUCKETS ONLY, never the raw per-cue hits/misses/contaminated). EMPTY ({}) when the lieutenant has no
   *  signal_drift_state row yet (a never-observed lieutenant — the projection NEVER lazy-seeds one). Each value ∈ dormant |
   *  partial | reliable | dominant. */
  cue_bands: Record<string, ReliabilityBucket>;
  /** The drift PHASE band (Phase-22 L2a T4; R2.2 — DIRECT_ALIGNED | DRIFTING | INCIDENTAL_LOCKED | RESETTING). The neutral
   *  'DIRECT_ALIGNED' for a never-observed lieutenant (no drift-state row → the baseline; the projection NEVER lazy-seeds one). */
  drift_phase: DriftPhase;
  /** The standing-order freshness BAND (Phase-25 L3 T5; R2.2 — `{ freshness: NONE | FRESH | EXPIRES_SOON | EXPIRED,
   *  promotion_suggested: bool }`). The closed-domain freshness label DERIVED from the active-or-injecting order's
   *  expires_at_tick vs now (the raw tick NEVER escapes) + the per-signature promotion hint. NONE / false for a lieutenant
   *  with no active order + no lapse pattern (the projection NEVER lazy-seeds an order / state row). */
  standing_order: StandingOrderBand;
  /** P3-B C6 (ch05 Loop 2 — Flag Discipline, design §7/§8 D12) — the token-budget band (low|standard|
   *  high), DERIVED from the lieutenant's OWN `lieutenant_flag_state.credibility_tokens` ratio to the
   *  tunable max (R2.2 — the raw token count NEVER escapes). A never-flagged lieutenant (no state row)
   *  projects the FULL/untouched default ('high' — see NEUTRAL_LIEUTENANT_BANDS below). */
  trust_budget_bucket: TrustBudgetBucket;
  /** P3-B C6 (ch05 Loop 2, design §7/§8 D12) — the flags-raised-over-7-game-days band (none|occasional|
   *  frequent), DERIVED from `flagged_items` (R2.2 — the raw count NEVER escapes). A never-flagged
   *  lieutenant projects 'none'. */
  flag_frequency_band: FlagFrequencyBand;
  /** The player-authored DSL source (round-tripped — the ONE allowed readable non-band field; spec §7). */
  script_source: string;
}

/**
 * One ROSTER row (Phase-10 A1 — the GET /v1/lieutenants list element; R2.2 inverted). The list sibling of LieutenantBands:
 * the SMALLER band-only subset a roster card needs — just enough to render one row + open it (the lieutenant_id is an
 * opaque OWNED-resource handle the client passes back to GET /v1/lieutenants/:id, not a raw scalar). r3-C3/m4-r3,
 * paraphrased r4-C3/m3 — the id handle + 5 fields (the prior count here was smaller by one, before C3 added `name`,
 * D7/L0.5 — `name` is neither the id nor a closed-domain band, it is the lieutenant's REAL, in-clear varchar(64)):
 * NO role_id, NO
 * assigned/target building id, NO raw rules count, NO granted_role / mode / script_source (those live on the detail
 * GET /:id, not the roster). The recursive no-leak E2E rejects any other key or any raw number / boolean anywhere in
 * the payload — `name` itself is exempted from the "band only" rule (it is checked as a non-empty string instead).
 */
export interface RosterRow {
  /** The owned-lieutenant handle (an opaque uuid the client passes to GET /v1/lieutenants/:id — not a judgment scalar). */
  lieutenant_id: string;
  /** C3 (D7, L0.5) — `lieutenant.name` (a REAL varchar(64) column, round-tripped — never derived). D7's
   *  registry: `RosterRow (name)` — defect n°1 of back.md's L0.4 table, "the roster can name no one". */
  name: string;
  /** The behavioral archetype derived from role_id (COOK | … | DISTRIBUTION | UNKNOWN — never the raw role_id int; R2.2). */
  archetype: ArchetypeBand;
  /** The operational-state band (SETTLING | PAUSED | ACTIVE | IDLE — the delegation_paused bool + settling window only as a
   *  band; R2.2). SETTLING takes precedence (Phase-11 tenure inertia). */
  op_state_band: OpStateBand;
  /** The rule-count band (NONE | FEW | MANY — never the raw rules count int; R2.2). */
  rule_count_band: RuleCountBand;
  /** The tenure-bucket band (FRESH | … | ENTRENCHED — DERIVED from the BO-only streak via bucketForStreak; the raw
   *  tenure_score NEVER escapes; R2.2). The roster surfaces ONLY the bucket (the filter-by-bucket teaser) — NOT the 3
   *  effect bands (those live on the detail GET /:id). Phase-11 tenure inertia. */
  tenure_bucket: TenureBucketBand;
}

/**
 * The NEUTRAL lieutenant bands — the closed-domain neutral surface for a NON-existent / NON-owned lieutenant (the SAME
 * neutral-constant convention NEUTRAL_MONEY_HOLDING_BANDS uses). The GET endpoint prefers a clean 404 RESOURCE_NOT_FOUND
 * for a not-owned lieutenant (consistent with the attach/validate ownership guard); this constant exists so a FUTURE
 * surface that prefers a neutral object over a 404 (e.g. a roster card that renders an empty slot) can reuse it WITHOUT
 * leaking a raw scalar. `archetype: 'UNKNOWN'`, `granted_role: 'advisory'` (the inert default), `mode: 'tasked'` (the
 * inert default), `op_state_band: 'IDLE'`, `rule_count_band: 'NONE'`, the tenure bands at their FRESH defaults
 * (`effectsForBucket('FRESH')` — tenure_bucket FRESH / script_revision_cost COST_1 / reassignment_disruption
 * DISRUPT_SHORT / role_efficiency_bonus BONUS_NONE), `script_source: ''` — every field a closed-domain neutral / the
 * empty authored source. `reassign_availability: 'AVAILABLE'` — a non-existent / never-reassigned lieutenant is never on
 * a cooldown (the inert default; Phase-13).
 */
export const NEUTRAL_LIEUTENANT_BANDS: LieutenantBands = {
  // C3 (D7) — a non-existent lieutenant has no name to give; the empty string mirrors this SAME
  // constant's own `script_source: ''` neutral-default convention two lines below (never a fabricated name).
  name: '',
  archetype: 'UNKNOWN',
  granted_role: 'advisory',
  mode: 'tasked',
  op_state_band: 'IDLE',
  rule_count_band: 'NONE',
  tenure_bucket: 'FRESH',
  script_revision_cost: 'COST_1',
  reassignment_disruption: 'DISRUPT_SHORT',
  role_efficiency_bonus: 'BONUS_NONE',
  reassign_availability: 'AVAILABLE',
  budget_bands: {}, // a non-existent / never-gated lieutenant has no autonomy budget row → empty band map (Phase-19 L1a).
  cue_bands: {}, // a non-existent / never-observed lieutenant has no drift row → empty cue-band map (Phase-22 L2a).
  drift_phase: 'DIRECT_ALIGNED', // the baseline phase for a never-observed lieutenant (no drift row; Phase-22 L2a).
  // a non-existent / never-ordered lieutenant has no active order + no lapse pattern → NONE / false (Phase-25 L3).
  standing_order: { freshness: 'NONE', promotion_suggested: false },
  // P3-B C6 — a non-existent / never-flagged lieutenant has no lieutenant_flag_state row and no
  // flagged_items history → the FULL/untouched trust budget ('high') + zero flag frequency ('none').
  trust_budget_bucket: 'high',
  flag_frequency_band: 'none',
  script_source: '',
};

/**
 * The rule-count band cut-points (rule count of behavior_script.rules). A CLOSED qualitative mapping (R2.2 — the raw
 * count never escapes; the player sees the band). NONE = 0 rules (no script attached / the empty default script);
 * FEW = 1..RULE_COUNT_FEW_MAX (a small script — the slice-1 canonical COOK script is 2 rules, comfortably FEW);
 * MANY = > RULE_COUNT_FEW_MAX (a substantial script). The FEW ceiling of 5 keeps the common 1–2-rule slice-1 scripts
 * legibly FEW while a 6+-rule script (approaching the T.dsl.max_rules_per_script bound) reads as MANY. Presentation-only
 * (NOT a balance tunable — it buckets the already-stored rule list).
 */
const RULE_COUNT_FEW_MAX = 5; // 1..5 → FEW; 6+ → MANY; 0 → NONE.

@Injectable()
export class LieutenantProjectionService {
  constructor(
    private readonly repo: LieutenantRepository,
    private readonly production: ProductionService,
    // PHASE-19 L1a — the autonomy ceiling gate, consulted READ-ONLY here for the budget_bands projection (getBudgetBands —
    // a pure read that NEVER lazy-seeds a ceiling-state row; R2.2 — only the per-category bucket is surfaced, never the
    // private counter/cap). EXPORTED by LieutenantModule (the SAME instance the tick gates through).
    private readonly autonomy: AutonomyCeilingService,
    // PHASE-22 L2a — the signal-drift measurement service, consulted READ-ONLY here for the cue_bands + drift_phase projection
    // (getCueBands — a pure read that NEVER lazy-seeds a drift-state row; R2.2 — only the per-cue reliability bucket + the
    // qualitative drift phase are surfaced, never the raw hits/misses/contaminated). The SAME instance the tick observes through.
    private readonly signalDrift: SignalDriftService,
    // PHASE-25 L3 — the standing-order service, consulted READ-ONLY here for the standing_order freshness band (getOrderBand —
    // a pure read that NEVER lazy-seeds an order / standing_order_state row; R2.2 — only the freshness label + the
    // promotion_suggested bool escape, never the raw expires_at tick / consecutive_lapse_count / signature). The SAME instance
    // the tick injects the order rule through. EXPORTED by LieutenantModule (already, for the T3 evaluate consumer).
    private readonly standingOrder: StandingOrderService,
    // P3-B C6 — the ch05 Loop 2 bands (trust_budget_bucket + flag_frequency_band), re-provided DIRECTLY
    // by `lieutenant.module.ts` (a READ-ONLY consult, NEVER lazy-seeds a `lieutenant_flag_state` row —
    // R2.2, the SAME "never lazy-seed" discipline every other band above follows).
    private readonly flagConvergence: FlagConvergenceService,
  ) {}

  /**
   * Project a player-owned lieutenant's bands (Phase-6 vector #6 T7; R2.2 — qualitative bands only + the player-authored
   * script_source). Reads the player-owned projection row (role_id / granted_role / mode / delegation_paused /
   * assigned_building_id + the joined behavior_script.source + rules) — ONE read; then, only when needed, the live cook
   * state for the op_state_band (the SAME ProductionService.hasCookInProgress service boundary the COOK binding uses —
   * NOT a duplicated cook query). NO state change (a pure read).
   *
   * Returns NULL when the lieutenant is not the requesting player's (or does not exist) — the player can only read their
   * own. The GET endpoint maps NULL → 404 RESOURCE_NOT_FOUND (consistent with the attach/validate ownership guard). A
   * future surface that prefers a neutral object over a 404 can fall back to NEUTRAL_LIEUTENANT_BANDS.
   */
  async lieutenantBands(playerId: string, lieutenantId: string): Promise<LieutenantBands | null> {
    const row = await this.repo.getProjectionRow(playerId, lieutenantId);
    if (!row) return null; // not owned / non-existent → the controller throws 404 (the player reads only their own).

    // Read the player's CURRENT tick ONCE (the settling window's `now` reference — the SAME game_minute space the A2 tick
    // honors settling against). Passed into opStateBand so SETTLING is evaluated short-circuit-first (saves the cook query).
    const now = await this.repo.getCurrentGameMinute(playerId);
    const tenure = this.tenureBands(row.tenure_score); // DERIVED (bucketForStreak → effectsForBucket) — REUSE, no re-derive.
    // PHASE-22 L2a — the per-cue reliability buckets + the drift phase (R2.2 — buckets/phase only, never the raw hits/misses).
    // A READ-ONLY call (getCueBands) that NEVER lazy-seeds a drift-state row: a never-observed lieutenant → {} / DIRECT_ALIGNED.
    const drift = await this.signalDrift.getCueBands(lieutenantId);
    // PHASE-25 L3 — the standing-order freshness band (R2.2 — freshness label + promotion_suggested bool only, never the raw
    // expires_at tick / consecutive_lapse_count). A READ-ONLY call (getOrderBand) that NEVER lazy-seeds an order / state row:
    // a never-ordered lieutenant → { freshness: 'NONE', promotion_suggested: false }. Uses the SAME `now` the bands derive against.
    const standingOrder = await this.standingOrder.getOrderBand(lieutenantId, now);
    // P3-B C6 (design §7/§8 D12) — the ch05 Loop 2 bands. `currentGameDay` derives from the SAME `now`
    // game_minute read above (REUSE, no 2nd clock read) via the SAME `deriveGameDay` convention every
    // NIGHTLY/day-keyed flag-discipline tick already uses. Both READ-ONLY, NEVER lazy-seed a
    // `lieutenant_flag_state`/`flagged_items` row (R2.2 "never lazy-seed" discipline, consistent with
    // every other band above).
    const currentGameDay = deriveGameDay(now, citySimTunables.inGameDayLengthMinutes);
    const [trustBudget, frequency] = await Promise.all([
      this.flagConvergence.trustBudgetBucketForLieutenant(lieutenantId),
      this.flagConvergence.frequencyBandForLieutenant(lieutenantId, currentGameDay),
    ]);

    return {
      name: row.name, // C3 (D7)
      archetype: this.archetypeBand(row.role_id),
      granted_role: row.granted_role,
      mode: row.mode,
      op_state_band: await this.opStateBand(
        playerId,
        row.delegation_paused,
        row.assigned_building_id,
        row.settling_until_tick,
        now,
      ),
      rule_count_band: this.ruleCountBand(this.ruleCount(row.rules)),
      tenure_bucket: tenure.tenure_bucket,
      script_revision_cost: tenure.script_revision_cost,
      reassignment_disruption: tenure.reassignment_disruption,
      role_efficiency_bonus: tenure.role_efficiency_bonus,
      // Phase-13 (decision cooldown) — REUSE the SAME `now` the SETTLING op_state_band derives against (one tick read per
      // call; no second clock read). The raw tenure_reset_at_tick / the tick math never escape (R2.2).
      reassign_availability: this.reassignAvailabilityBand(row.tenure_reset_at_tick, now),
      // Phase-19 L1a — the per-category autonomy-budget BUCKET map (R2.2 — buckets only, never the counter/cap). A READ-ONLY
      // call (getBudgetBands) that NEVER lazy-seeds a ceiling-state row: a never-gated lieutenant → {} (no row created here).
      budget_bands: await this.autonomy.getBudgetBands(lieutenantId),
      // Phase-22 L2a — the per-cue reliability buckets + the drift phase (R2.2 — buckets/phase only; getCueBands is a pure
      // read that NEVER lazy-seeds a drift-state row → a never-observed lieutenant projects {} / DIRECT_ALIGNED).
      cue_bands: drift.cue_bands,
      drift_phase: drift.drift_phase,
      // Phase-25 L3 — the standing-order freshness band (R2.2 — freshness label + promotion_suggested bool only; getOrderBand
      // is a pure read that NEVER lazy-seeds an order / standing_order_state row → a never-ordered lieutenant projects
      // { freshness: 'NONE', promotion_suggested: false }).
      standing_order: standingOrder,
      trust_budget_bucket: trustBudget.bucket,
      flag_frequency_band: frequency.band,
      script_source: row.source,
    };
  }

  /**
   * Project a player's ENTIRE lieutenant roster as band rows (Phase-10 A1 — the GET /v1/lieutenants list; R2.2 — band-only).
   * The list sibling of {@link lieutenantBands}: reads ALL the player's roster rows in ONE query (repo.listForPlayer), then
   * maps each to the 4-field band surface REUSING the SAME band helpers the detail projection uses (archetypeBand via
   * archetypeForRoleId, opStateBand — incl. the per-lieutenant cook-in-progress check — and ruleCountBand). The roster is
   * capped small (T.lieutenant.max_count_per_player), so the per-row op_state cook check is fine (N tiny reads). Band-only:
   * NO role_id, NO building id, NO raw count escapes (each is a band INPUT only — the SAME guarantee lieutenantBands gives,
   * applied per row). Player-scoped (listForPlayer filters by player_id). A player with NO lieutenant → an EMPTY array. NO
   * state change (a pure read).
   */
  async rosterRows(playerId: string): Promise<RosterRow[]> {
    const rows = await this.repo.listForPlayer(playerId);
    // Read the player's CURRENT tick ONCE for the whole roster (the SAME settling `now` reference the detail GET uses) —
    // passed into every row's opStateBand so SETTLING is evaluated short-circuit-first per row (saves the per-row cook query).
    const now = await this.repo.getCurrentGameMinute(playerId);
    return Promise.all(
      rows.map(async (row) => ({
        lieutenant_id: row.lieutenant_id,
        name: row.name, // C3 (D7)
        archetype: this.archetypeBand(row.role_id),
        op_state_band: await this.opStateBand(
          playerId,
          row.delegation_paused,
          row.assigned_building_id,
          row.settling_until_tick,
          now,
        ),
        rule_count_band: this.ruleCountBand(this.ruleCount(row.rules)),
        // The roster surfaces ONLY the tenure_bucket (the filter-by-bucket teaser) — DERIVED via bucketForStreak (REUSE);
        // the 3 effect bands live on the detail GET /:id, not the roster row.
        tenure_bucket: this.tenureBucketBand(row.tenure_score),
      })),
    );
  }

  /**
   * Derive the op_state_band (SETTLING | PAUSED | ACTIVE | IDLE) from the BO-only settling window + the raw
   * delegation_paused bool + the assigned building's live cook state (R2.2 — neither the settling tick nor the bool ever
   * escapes; the player sees only the band). PRECEDENCE — SETTLING > PAUSED > ACTIVE > IDLE:
   *   - SETTLING (Phase-11 tenure inertia): a reassign/re-script settling window is still open (settling_until_tick != null
   *     && settling_until_tick > now — the A2 tick has not yet cleared it). Checked FIRST and short-circuits — it returns
   *     BEFORE the delegation_paused check AND before the hasCookInProgress query (a settling lieutenant's delegation is
   *     suspended, so the live cook state is moot — and we save the query while settling).
   *   - PAUSED (the script resolved PAUSE_OPS — the delegation_paused bool).
   *   - ACTIVE iff a cook is in progress on the assigned building (the SAME ProductionService.hasCookInProgress read the
   *     COOK binding's cook_idle signal uses — REUSE, no re-query). A null assigned_building_id → never ACTIVE → IDLE.
   *   - IDLE otherwise.
   * `now` is the player's current game_minute (read ONCE per lieutenantBands / rosterRows call). Shared by lieutenantBands
   * (the detail GET) + rosterRows (the list GET) so the derivation is one source of truth (no drift). NO state change.
   */
  private async opStateBand(
    playerId: string,
    delegationPaused: boolean,
    assignedBuildingId: string | null,
    settlingUntilTick: number | null,
    now: number,
  ): Promise<OpStateBand> {
    // SETTLING takes precedence — checked FIRST (short-circuits before the paused check AND the cook query).
    if (settlingUntilTick !== null && settlingUntilTick > now) return 'SETTLING';
    if (delegationPaused) return 'PAUSED';
    if (assignedBuildingId !== null) {
      const cooking = await this.production.hasCookInProgress(playerId, assignedBuildingId);
      return cooking ? 'ACTIVE' : 'IDLE';
    }
    return 'IDLE';
  }

  /**
   * Derive the tenure-bucket band from the BO-only streak (R2.2 — the raw tenure_score NEVER escapes). REUSE the pure
   * bucketForStreak (tenure-inertia.ts) with the resolved thresholds (lieutenantTunables.tenureInertia.thresholds) — the
   * SINGLE source of truth for the streak→bucket derivation (no re-derivation here). Used by rosterRows (the roster
   * surfaces ONLY the bucket) + tenureBands (the detail GET also needs the 3 effect bands). Presentation-only.
   */
  private tenureBucketBand(tenureScore: number): TenureBucketBand {
    return bucketForStreak(tenureScore, lieutenantTunables.tenureInertia.thresholds);
  }

  /**
   * Derive the reassign-availability band from the BO-only last-reassign tick + the current tick (R2.2 — the raw ticks
   * NEVER escape). ON_COOLDOWN while now < tenure_reset_at_tick + decision_cooldown; a never-reassigned lieutenant
   * (NULL) is AVAILABLE. SINGLE source of the cooldown derivation (the SAME comparison the reassign guard uses). Used by
   * the detail GET only (the reassign action lives on the detail surface — the roster card never reassigns). Phase-13.
   */
  private reassignAvailabilityBand(tenureResetAtTick: number | null, now: number): ReassignAvailabilityBand {
    if (tenureResetAtTick !== null && now < tenureResetAtTick + lieutenantTunables.tenureInertia.decisionCooldown) {
      return 'ON_COOLDOWN';
    }
    return 'AVAILABLE';
  }

  /**
   * Derive the FULL tenure band set (the bucket + the 3 effect bands) from the BO-only streak for the detail GET (R2.2 —
   * the raw tenure_score NEVER escapes). REUSE the pure tenure-inertia.ts resolvers end-to-end: the bucket from
   * bucketForStreak, the 3 effect bands from effectsForBucket(bucket) — the SINGLE source of truth for the bucket→effect
   * mapping (no re-derivation). Returns the 4 closed-domain band strings the detail GET surfaces. Presentation-only.
   */
  private tenureBands(tenureScore: number): {
    tenure_bucket: TenureBucketBand;
    script_revision_cost: ScriptRevisionCostBand;
    reassignment_disruption: ReassignmentDisruptionBand;
    role_efficiency_bonus: RoleEfficiencyBonusBand;
  } {
    const bucket = this.tenureBucketBand(tenureScore);
    const effects = effectsForBucket(bucket);
    return {
      tenure_bucket: bucket,
      script_revision_cost: effects.script_revision_cost,
      reassignment_disruption: effects.reassignment_disruption,
      role_efficiency_bonus: effects.role_efficiency_bonus,
    };
  }

  /**
   * Map a persisted role_id → the archetype band (R2.2 — the raw role_id int NEVER escapes). REUSE archetypeForRoleId
   * (the SAME inverse map the recruit-side roleIdForArchetype() grounds — one source of truth, no drift): all 6 SHIPPED
   * archetypes resolve to their own band (role_id 1 → 'COOK', 3 → 'BOOKKEEPER', 4 → 'LAUNDERING', 6 → 'LOGISTICS', 8 →
   * 'DISTRIBUTION', 10 → 'SECURITY'); an unmapped role_id (a 14-catalogue role no archetype claims) → the neutral
   * 'UNKNOWN' (the projection must not leak the raw int). Presentation-only.
   */
  private archetypeBand(roleId: number): ArchetypeBand {
    return archetypeForRoleId(roleId) ?? 'UNKNOWN';
  }

  /**
   * Count the rules in a stored behavior_script.rules jsonb DEFENSIVELY (R2.2 — the count is the band INPUT, never
   * surfaced). The canonical shape is the CompiledScript `{ rules: IrRule[] }` (T2); a fresh/empty default script is
   * `{ rules: [] }` (the schema default) → 0. Guards a malformed/absent shape → 0 (the projection is total — a bad row
   * never throws on a card read). Returns a plain int the band buckets (the int itself NEVER leaves this service).
   */
  private ruleCount(rules: unknown): number {
    if (rules && typeof rules === 'object' && Array.isArray((rules as { rules?: unknown }).rules)) {
      return (rules as { rules: unknown[] }).rules.length;
    }
    return 0;
  }

  /**
   * Map a rule count → the rule-count band (R2.2 — the raw count NEVER escapes). 0 → NONE (no script / empty default);
   * 1..RULE_COUNT_FEW_MAX → FEW; > RULE_COUNT_FEW_MAX → MANY. A pure int comparison. Presentation-only.
   */
  private ruleCountBand(count: number): RuleCountBand {
    if (count <= 0) return 'NONE';
    if (count <= RULE_COUNT_FEW_MAX) return 'FEW';
    return 'MANY';
  }
}
