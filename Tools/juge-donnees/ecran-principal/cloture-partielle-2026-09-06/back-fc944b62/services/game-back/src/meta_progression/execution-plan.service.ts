// IMPLEMENTS: docs/superpowers/plans/2026-07-24-p3-H-vertical-horizon-plan.md C2 ("Decision Horizon Lock:
//             ExecutionPlan creation + tier-column activation").
//             Design: docs/superpowers/specs/2026-07-24-p3-H-vertical-horizon-design.md §6.1 (createPlan
//             contract, verbatim) + §6.5 (v1 minimal constraint derivation) + D1/D2 (tier-derived, NOT
//             governor-routed) + §10 (R2.2 walls on the timeline projection).
//             C0-reanchor: docs/superpowers/specs/2026-07-24-p3-H-C0-reanchor.md §4/R2 (standing-order
//             ownership = a `lieutenant.player_id` join, poll `status`/`expires_at` — never subscribe) +
//             §14/R13 (`committed_action_ref` = a direct jsonb copy of `standing_order.rule`, zero
//             `compile()` calls) + §9/R7 (NIGHTLY fires exactly on multiples of `inGameDayLengthMinutes`).
//             — P3-H C2 — 2026-07-24
//
// `ExecutionPlanService` — `POST /v1/meta/horizon/execution-plans` (`createPlan`) + the per-lieutenant
// timeline projection (`listTimeline`, `GET .../execution-plans?lieutenant_id=`). NOT governor-routed
// (D2/D10 — plan creation is a TACTICAL wrap over an already-LIVE standing order, no Loop 10 structural
// code). Activates `decision_horizon_tier` as its FIRST READER (D1) — the REAL first WRITER stays
// `HorizonTierAdvancementService`, C4/D6.
//
// ★ DISCLOSED DESIGN CHOICE — single-plan-per-standing-order is NOT enforced (plan C2's own Concurrency
// clause names this as the coder's call: "if single-plan-per-order is enforced ... else both succeed with
// distinct plan_ids (documented)"). No NEW migration/unique-index is authorized at this chunk (C1 already
// landed + was reviewed; the migration allocation is 0141-only per the plan's own "Récap allocations").
// Enforcing the invariant would additionally require either a new partial-unique index (a schema change)
// or row-locking the standing_order for the duration of plan creation (a stronger serialization this
// chunk's own scope does not ask for) — both deferred, not silently invented. Two concurrent creates on
// the SAME standing order therefore both succeed, each with a DISTINCT `plan_id` (C2's own concurrency
// E2E proves this explicitly). Flagged for C3's own evaluator design (multiple ACTIVE plans on one order
// would each independently tick the SAME `(player,lieutenant)` ScriptStabilityCounter) — a C3/reviewer
// concern, not resolved here.
//
// ★ DISCLOSED DIVERGENCE — the `STANDING_ORDER_NOT_OWNED` (403) error code diverges from this codebase's
// OWN pervasive "not owned -> 404 RESOURCE_NOT_FOUND" masking convention (graduation.service.ts:237,
// promotion-lock.service.ts:200). Implemented literally per the plan's explicit, repeated "-> 403" text
// (see `protocol/error-codes.ts`'s own comment on `STANDING_ORDER_NOT_OWNED` for the full account).

import { Injectable } from '@nestjs/common';

import { ApiError } from '../protocol/api-error';
import { uuidField, intField, enumField } from '../common/param-pipes';
import { citySimTunables } from '../citysim/citysim-tunables';
import { deviationMode, type ExecutionPlanRow, type ExecutionCycleSlotRow } from '../db/schema/vertical_horizon';
import { ProgressionRepository } from '../progression/progression.repository';
import { StandingOrderRepository } from '../operational/lieutenant/standing-order/standing-order.repository';
import { ExecutionPlansRepository } from './execution-plans.repository';
import { ScriptStabilityCountersRepository } from './script-stability-counters.repository';
import { stabilityBucketFor, type StabilityBucket } from './stability-bucket';
import {
  availableDeviationModesForTier,
  cyclesAheadForTier,
  minimalExpectedConstraints,
  scriptStabilityThresholdForTargetTier,
  type DecisionHorizonTier,
  type DeviationModeValue,
} from './horizon-tier-ladder';

/** `POST /v1/meta/horizon/execution-plans` body (design §6.1 verbatim). */
export interface CreateExecutionPlanBody {
  standing_order_id?: unknown;
  execution_window?: unknown;
  deviation_rule?: unknown;
}

/** The R2.2-walled player projection of a slot — NEVER `committed_action_ref` / `expected_constraints` /
 *  `deviation_record` (design §10/D15 — the un-surfaced constraint sets + the compiled DSL rule). */
export interface ExecutionCycleSlotProjection {
  readonly slot_id: string;
  readonly slot_index: number;
  readonly cycle_tick: number;
  readonly slot_status: string;
}

/** The R2.2-walled player projection of a plan — NEVER `abort_recovery_cost_ref` (BO-only). */
export interface ExecutionPlanProjection {
  readonly plan_id: string;
  readonly lieutenant_id: string;
  readonly standing_order_id: string;
  readonly execution_window: number;
  readonly deviation_rule: string;
  readonly plan_status: string;
  readonly created_at_tick: number;
  readonly slots: ExecutionCycleSlotProjection[];
}

/**
 * `GET /v1/meta/horizon/execution-plans?lieutenant_id=`'s response shape (design §10/D5/D15 — P3-H C8: the
 * "final player-surface pass" that closes the gap between C2's own 2-chunk-old `{plans}`-only shape and the
 * design's full contract). `stability_bucket` is the `StabilityBucketEnum` for THIS `(player, lieutenant)`
 * pair (never the raw `consecutive_no_deviation_cycles` — D5/P5); `decision_horizon_tier` is the "tier
 * chip" (D15 — "canon exposes own tier to player"; player-SHARED per D1, so it is a top-level field, not
 * per-plan); `cycles_ahead` is the SAME `cyclesAheadForTier(tier)` derivation `createPlan`'s own validation
 * already consumes, now also surfaced for DISPLAY (design §10's own canon-sanctioned numerics list names it
 * explicitly). Both `decision_horizon_tier`/`cycles_ahead` are player-wide, independent of WHICH
 * `lieutenant_id` was queried — `stability_bucket` is the one per-lieutenant field.
 */
export interface ExecutionPlanTimelineProjection {
  readonly plans: readonly ExecutionPlanProjection[];
  readonly stability_bucket: StabilityBucket;
  readonly decision_horizon_tier: number;
  readonly cycles_ahead: number;
}

/**
 * design §6.1/C0-reanchor §9(R7) — one game-day cadence duplicated LOCALLY (this codebase's own
 * established convention for this exact one-line derivation: `ambient-clock.ts`'s own header discloses it
 * is itself "a small, standalone mirror of `political-trigger-evaluators.ts`'s `deriveGameDay` (REUSE
 * would create a cross-module dependency)" — a THIRD local copy for `meta_progression` mirrors that same
 * reasoning rather than importing across an unrelated `operational/*` module for one line of arithmetic).
 * The NIGHTLY cadence fires EXACTLY on multiples of `inGameDayLengthMinutes` (C0-reanchor R7,
 * `city_sim_scheduler.service.ts`'s own `CADENCE_WIDTH_GAME_MINUTES.nightly` convention) — so this is
 * exact for tick-driven comparisons, never an approximation.
 */
function deriveGameDayLocal(gameMinute: number, inGameDayLengthMinutes: number): number {
  return Math.floor(gameMinute / inGameDayLengthMinutes);
}

function requirePositiveInt(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    // r4/BLOCKING-1 — details.param was missing (D5 v25 "domain" garde needs field-name attribution
    // to distinguish this rejection from any other on the same route).
    throw new ApiError('VALIDATION_FAILED', { message: `${field} must be a positive integer.`, details: { param: field } });
  }
  return value;
}

function projectPlan(plan: ExecutionPlanRow, slots: ExecutionCycleSlotRow[]): ExecutionPlanProjection {
  return {
    plan_id: plan.plan_id,
    lieutenant_id: plan.lieutenant_id,
    standing_order_id: plan.standing_order_id,
    execution_window: plan.execution_window,
    deviation_rule: plan.deviation_rule,
    plan_status: plan.plan_status,
    created_at_tick: plan.created_at_tick,
    slots: slots.map((s) => ({
      slot_id: s.slot_id,
      slot_index: s.slot_index,
      cycle_tick: s.cycle_tick,
      slot_status: s.slot_status,
    })),
  };
}

@Injectable()
export class ExecutionPlanService {
  constructor(
    private readonly plansRepo: ExecutionPlansRepository,
    private readonly standingOrderRepo: StandingOrderRepository,
    private readonly progressionRepo: ProgressionRepository,
    private readonly counterRepo: ScriptStabilityCountersRepository,
  ) {}

  /**
   * design §6.1 — validate (standing order exists + player-owned + `status='active'` + `expires_at`
   * future — C0-reanchor R2: the ownership check is a `lieutenant.player_id` JOIN, `standing_order` itself
   * carries no `player_id` column) -> `execution_window <= cycles_ahead(tier)` -> `deviation_rule in
   * available_modes(tier)` -> ONE atomic INSERT (`execution_plans` + N `execution_cycle_slots`,
   * `committed_action_ref` = the order's compiled `rule`, R13; `expected_constraints` = the C2 minimal
   * 2-clause set, `horizon-tier-ladder.ts`). NOT governor-routed (D2/D10) — no Loop 10 structural code.
   */
  async createPlan(playerId: string, body: CreateExecutionPlanBody): Promise<ExecutionPlanProjection> {
    // L0.3 (D5) — standing_order_id: uuid (getByIdWithOwner reaches a uuid column, unguarded before
    // this — one of the "non classables"). execution_window: int, width 'int2' — `vertical_horizon.ts:85`
    // is `smallint`, NARROWER than the int4 default (C1's own discovery, see param-pipes.ts's
    // `checkIntWidthBound` docstring) — `requirePositiveInt`'s own ">= 1" business rule stays, AFTER.
    // deviation_rule: enum, `deviationMode.enumValues` (DF-11) — replaces the hand-mirrored
    // `requireDeviationMode`, same domain, same message shape.
    const rawBody = body as unknown as Record<string, unknown>;
    const standingOrderId = uuidField(rawBody, 'standing_order_id');
    const executionWindowRaw = intField(rawBody, 'execution_window', 'int2');
    const executionWindow = requirePositiveInt(executionWindowRaw, 'execution_window');
    const deviationRule = enumField(deviationMode.enumValues, rawBody, 'deviation_rule') as DeviationModeValue;

    // Existence (404) + ownership (403, the plan's own explicit "-> 403" falsifiable) — ONE join read.
    const order = await this.standingOrderRepo.getByIdWithOwner(standingOrderId);
    if (order === null) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `standing order ${standingOrderId} does not exist.` });
    }
    if (order.player_id !== playerId) {
      throw new ApiError('STANDING_ORDER_NOT_OWNED', {
        message: `standing order ${standingOrderId} is not owned by this player.`,
      });
    }

    // Liveness (409 — exists + owned, but the STATE does not qualify): status='active' + expires_at future
    // (C0-reanchor R2 — polling `status`/`expires_at_tick` directly, never subscribing to the lapse event,
    // since REVERT_DEFAULT/HOLD_LAST lapses never emit one).
    const nowGameMinute = await this.plansRepo.getCurrentGameMinute(playerId);
    if (order.status !== 'active' || order.expires_at_tick <= nowGameMinute) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `standing order ${standingOrderId} is not active (status=${order.status}).`,
      });
    }

    // Tier-derived checks (design §6.1 — window first, then mode, matching the design's own stated order).
    const tier = (await this.progressionRepo.getDecisionHorizonTier(playerId)) as DecisionHorizonTier;
    const cyclesAhead = cyclesAheadForTier(tier);
    if (executionWindow > cyclesAhead) {
      throw new ApiError('EXECUTION_WINDOW_EXCEEDS_TIER', {
        message: `execution_window ${executionWindow} exceeds tier ${tier}'s cycles_ahead (${cyclesAhead}).`,
        payloadVars: { tier, cycles_ahead: cyclesAhead },
      });
    }
    const availableModes = availableDeviationModesForTier(tier);
    if (!availableModes.includes(deviationRule)) {
      throw new ApiError('DEVIATION_MODE_NOT_AVAILABLE', {
        message: `deviation_rule ${deviationRule} is not available at tier ${tier}.`,
        payloadVars: { tier, available_modes: availableModes },
      });
    }

    // Cycle ticks: one per engaged cycle, each the EXACT future gameMinute at which the NIGHTLY/33
    // evaluator (C3) fires for that day (C0-reanchor R7 — NIGHTLY fires exactly on multiples of
    // inGameDayLengthMinutes; a coder-chosen, disclosed realization — this file's own header).
    const inGameDayLengthMinutes = citySimTunables.inGameDayLengthMinutes;
    const currentGameDay = deriveGameDayLocal(nowGameMinute, inGameDayLengthMinutes);
    const cycleTicks = Array.from(
      { length: executionWindow },
      (_, i) => (currentGameDay + i + 1) * inGameDayLengthMinutes,
    );

    const { plan, slots } = await this.plansRepo.createWithSlots({
      playerId,
      lieutenantId: order.lieutenant_id,
      standingOrderId: order.order_id,
      createdAtTick: nowGameMinute,
      executionWindow,
      deviationRule,
      cycleTicks,
      committedActionRef: order.rule,
      expectedConstraints: minimalExpectedConstraints(),
    });

    return projectPlan(plan, slots);
  }

  /**
   * design §10/D5/D15 — `GET /v1/meta/horizon/execution-plans?lieutenant_id=` timeline projection: every
   * plan (any status — a genuine history) the player holds for that lieutenant + its slots, PLUS (P3-H C8)
   * the `StabilityBucketEnum` for this `(player, lieutenant)` pair + the player-wide "tier chip"
   * (`decision_horizon_tier`) + its DERIVED `cycles_ahead`. An unowned / nonexistent `lieutenant_id` filters
   * `plans` to an empty array (never a 404 — the SAME "unowned filters empty" posture as every other
   * player-scoped list read in this codebase); `stability_bucket` for such an id reads a genuinely-missing
   * `script_stability_counters` row (`readForGate`'s own "missing row = 0" convention) -> `LOW`, never a
   * cross-player leak (the read is scoped to `(playerId, lieutenantId)`, so a foreign/nonexistent
   * lieutenant simply has no counter to read).
   *
   * `decision_horizon_tier`'s NEXT-tier threshold feeds `stability_bucket` (design D5 "vs the tier-target
   * threshold") — `Math.min(tier + 1, 3)` naturally realizes the disclosed T3-ceiling choice
   * (`horizon-tier-ladder.ts#scriptStabilityThresholdForTargetTier`'s own header): at the domain maximum
   * (tier 3, D1) there is no tier 4 to target, so the bucket keeps comparing against the tier-3 threshold —
   * an honest "is this lieutenant SUSTAINING the reliability that earned tier 3" read, never a 4th invented
   * bucket, never a fabricated next tier that does not exist.
   */
  async listTimeline(playerId: string, lieutenantId: string): Promise<ExecutionPlanTimelineProjection> {
    const [rows, rawTier, counter] = await Promise.all([
      this.plansRepo.listWithSlotsForLieutenant(playerId, lieutenantId),
      this.progressionRepo.getDecisionHorizonTier(playerId),
      this.counterRepo.readForGate(playerId, lieutenantId),
    ]);
    const tier = rawTier as DecisionHorizonTier;
    const targetTier = Math.min(tier + 1, 3); // 1->2, 2->3, 3->3 (the disclosed ceiling reuse — see this method's own header).
    const threshold = scriptStabilityThresholdForTargetTier(targetTier);

    return {
      plans: rows.map(({ plan, slots }) => projectPlan(plan, slots)),
      stability_bucket: stabilityBucketFor(counter, threshold),
      decision_horizon_tier: tier,
      cycles_ahead: cyclesAheadForTier(tier),
    };
  }
}
