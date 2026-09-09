// IMPLEMENTS: docs/superpowers/plans/2026-07-24-p3-H-vertical-horizon-plan.md C1 (`VerticalHorizonModule`
//             scaffold — module + repositories, NO runtime logic yet, C2+ fills it in, DD-H1) + C2
//             (`ExecutionPlanService.createPlan` — the atomic plan+slots INSERT; the per-lieutenant
//             timeline projection read).
//             Design: docs/superpowers/specs/2026-07-24-p3-H-vertical-horizon-design.md §3 (`execution_
//             plans` — the multi-cycle wrapper over a LIVE standing order, D2) + §6.1 (plan creation) +
//             §10 (projections — the timeline GET, R2.2 walls: never leak `expected_constraints` /
//             `committed_action_ref` to the player payload).
//             C0-reanchor: docs/superpowers/specs/2026-07-24-p3-H-C0-reanchor.md §11 (R9 DEFINITIVE — plain
//             wall-clock/game-minute arithmetic, no second ratio) + §9 (R7 — NIGHTLY cadence fires exactly
//             on multiples of `citySimTunables.inGameDayLengthMinutes`, the `deriveGameDay`/`ambient-
//             clock.ts` convention this file's own `cycle_tick` derivation relies on).
//             Pattern (multi-table atomic INSERT in ONE method, `db.transaction`): `graduation-events.
//             repository.ts#recordGraduation` (mirrored verbatim shape). Pattern (per-substrate local
//             `getCurrentGameMinute` copy, NEVER a shared helper): `lieutenant.repository.ts:318` /
//             `leg.repository.ts:146` / `cue-stack.repository.ts:471` (this codebase's own established,
//             explicitly-disclosed-as-non-shared convention).
//             C9 ADDS (design §11 — the BO surface): `listAllForPlayer` (the admin "TRUE state" read, ANY
//             lieutenant, ANY status, RAW slots — the P5 inversion `VerticalHorizonAdminController#
//             getPlayerDecisionHorizon` consumes).
//             -- P3-H C1 -- 2026-07-24 / C2 -- 2026-07-24 / C9 -- 2026-07-25
//
// `ExecutionPlansRepository` — over `execution_plans` (mig 0141). C2 adds the atomic plan+slots INSERT
// (`createWithSlots`) + the per-(player,lieutenant) timeline read (`listWithSlotsForLieutenant`) + the
// local `getCurrentGameMinute` clock read. C3/C4 add the plan_status transition writers (`markAborted`/
// `markEscalated`/`markAdapted`/`markCompleted`, design §6.3/§6.4) against their own REAL call sites.

import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';

import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { citySimClock } from '../db/schema/city_sim_clock';
import {
  executionPlan,
  executionCycleSlot,
  type ExecutionPlanRow,
  type ExecutionCycleSlotRow,
} from '../db/schema/vertical_horizon';
import type { DeviationModeValue } from './horizon-tier-ladder';
import type { ConstraintClause } from './horizon-tier-ladder';

/** `createWithSlots` params (design §6.1 step 2 — the plan row + its N engaged-cycle slot rows, ONE txn). */
export interface CreatePlanParams {
  readonly playerId: string;
  readonly lieutenantId: string;
  readonly standingOrderId: string;
  readonly createdAtTick: number;
  readonly executionWindow: number;
  readonly deviationRule: DeviationModeValue;
  /** One `cycle_tick` per engaged cycle (length === executionWindow), ascending. */
  readonly cycleTicks: readonly number[];
  /** The standing order's ALREADY-COMPILED `rule` (R13 — a direct jsonb copy, zero `compile()` calls). */
  readonly committedActionRef: unknown;
  readonly expectedConstraints: readonly ConstraintClause[];
}

export interface CreatePlanResult {
  readonly plan: ExecutionPlanRow;
  readonly slots: ExecutionCycleSlotRow[];
}

@Injectable()
export class ExecutionPlansRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * The player's CURRENT in-game tick (`city_sim_clock.game_minute`) — a per-substrate LOCAL copy of the
   * established `getCurrentGameMinute` convention (this codebase deliberately never shares this read
   * across repositories — see this file's own header). Returns 0 when the player has no clock row yet (a
   * just-seeded player who never advanced sits at tick 0, the SAME fallback every sibling copy uses).
   * Player-scoped. A READ — no state change.
   */
  async getCurrentGameMinute(playerId: string): Promise<number> {
    const rows = await this.db
      .select({ game_minute: citySimClock.game_minute })
      .from(citySimClock)
      .where(eq(citySimClock.player_id, playerId))
      .limit(1);
    return rows[0]?.game_minute ?? 0;
  }

  /**
   * P3-H C2 (design §6.1 step 2) — the ATOMIC plan+slots INSERT: ONE `execution_plans` row (`plan_status`
   * DEFAULT 'ACTIVE', `deviation_threshold` DEFAULT 'SEVERE' — C2's own createPlan contract names no input
   * for either, so both stay at the schema's own default) + exactly `executionWindow` `execution_cycle_
   * slots` rows (`slot_status` DEFAULT 'PENDING'), ONE transaction — mirrors `GraduationEventsRepository.
   * recordGraduation`'s own shape verbatim (both are "permanent facts of the SAME committed event, no
   * partial state between them"). Every slot carries the SAME `committed_action_ref` (the standing order's
   * compiled rule, R13) + the SAME `expected_constraints` (the C2 minimal set, `horizon-tier-ladder.ts#
   * minimalExpectedConstraints`) — a single committed action re-checked each cycle, not a per-cycle plan.
   * `slot_index` is 1-based (ascending with `cycleTicks`). Two concurrent creates on the SAME standing
   * order are NOT serialized here (decisions: single-plan-per-order is NOT enforced at C2 — see
   * `execution-plan.service.ts`'s own header for the documented choice); each call is independently
   * atomic, so two concurrent callers simply produce two distinct `plan_id` rows.
   */
  async createWithSlots(params: CreatePlanParams): Promise<CreatePlanResult> {
    return this.db.transaction(async (tx) => {
      const [plan] = await tx
        .insert(executionPlan)
        .values({
          player_id: params.playerId,
          lieutenant_id: params.lieutenantId,
          standing_order_id: params.standingOrderId,
          created_at_tick: params.createdAtTick,
          execution_window: params.executionWindow,
          deviation_rule: params.deviationRule,
        })
        .returning();

      const slots = await tx
        .insert(executionCycleSlot)
        .values(
          params.cycleTicks.map((cycleTick, i) => ({
            plan_id: plan.plan_id,
            slot_index: i + 1,
            cycle_tick: cycleTick,
            committed_action_ref: params.committedActionRef as Record<string, unknown>,
            expected_constraints: params.expectedConstraints as unknown[],
          })),
        )
        .returning();

      return { plan, slots };
    });
  }

  /**
   * design §10 (the per-lieutenant TIMELINE projection) — every plan (any `plan_status`, a genuine
   * history, not ACTIVE-only) for `(playerId, lieutenantId)` + its slots, ordered oldest-first. R2.2 WALL
   * (design D15/§10): the SELECT below deliberately OMITS `standing_order_id`-adjacent internals it does
   * carry (kept — it is the plan's own soft-ref, not a leak) but NEVER selects `abort_recovery_cost_ref`
   * (BO-only), and the slot projection never selects `committed_action_ref` / `expected_constraints` /
   * `deviation_record` (the un-surfaced constraint sets + the compiled DSL rule + the raw deviation
   * internals — all player-facing wall violations, design §10/D15). `ExecutionPlanService` composes this
   * into the timeline response; a lieutenant with zero plans returns an empty array (never an error — the
   * SAME "unowned/nonexistent filters to empty, not 404" posture the controller documents). A READ.
   */
  async listWithSlotsForLieutenant(
    playerId: string,
    lieutenantId: string,
  ): Promise<Array<{ plan: ExecutionPlanRow; slots: ExecutionCycleSlotRow[] }>> {
    const plans = await this.db
      .select()
      .from(executionPlan)
      .where(and(eq(executionPlan.player_id, playerId), eq(executionPlan.lieutenant_id, lieutenantId)))
      .orderBy(asc(executionPlan.created_at_tick));

    const result: Array<{ plan: ExecutionPlanRow; slots: ExecutionCycleSlotRow[] }> = [];
    for (const plan of plans) {
      const slots = await this.db
        .select()
        .from(executionCycleSlot)
        .where(eq(executionCycleSlot.plan_id, plan.plan_id))
        .orderBy(asc(executionCycleSlot.slot_index));
      result.push({ plan, slots });
    }
    return result;
  }

  /**
   * P3-H C3 (design §6.3 — ABORT disposition). Guarded conditional UPDATE: `plan_status='ABORTED'` WHERE
   * currently `'ACTIVE'` — the atomic-first invariant (0.4): a lost race (the slot-level guard in
   * `ExecutionCycleSlotsRepository.markDeviated` already prevents double-processing the SAME slot, but
   * this plan-level guard is defense-in-depth against any OTHER caller, e.g. a future C9 admin
   * force-abort) returns `null`, never a double transition. `abortRecoveryCostRef` is the C3-own,
   * disclosed-realization audit stamp (`execution-plan-evaluator.service.ts`'s own header: no per-plan
   * resource/cash ledger exists on this base to compute an actual recovered AMOUNT against — this stamps
   * the `plan_abort_recovery_cost_pct` tunable's value AT THE MOMENT of abort, an audit trail only, never
   * a wired financial credit).
   */
  async markAborted(planId: string, abortRecoveryCostRef: Record<string, unknown>): Promise<ExecutionPlanRow | null> {
    const rows = await this.db
      .update(executionPlan)
      .set({ plan_status: 'ABORTED', abort_recovery_cost_ref: abortRecoveryCostRef })
      .where(and(eq(executionPlan.plan_id, planId), eq(executionPlan.plan_status, 'ACTIVE')))
      .returning();
    return rows[0] ?? null;
  }

  /**
   * P3-H C3 (design §6.3 — ESCALATE disposition, T2+; also the C3-disclosed ADAPT-fallback path until C4
   * lands `AdaptationResolverService` — see `execution-plan-evaluator.service.ts`'s own header). Guarded
   * conditional UPDATE, the SAME `WHERE plan_status='ACTIVE'` shape as `markAborted`. The counter is
   * DELIBERATELY untouched by this method (D5 — "frozen while ESCALATED-pending"): the caller simply never
   * calls a counter-repo method on this branch.
   */
  async markEscalated(planId: string): Promise<ExecutionPlanRow | null> {
    const rows = await this.db
      .update(executionPlan)
      .set({ plan_status: 'ESCALATED' })
      .where(and(eq(executionPlan.plan_id, planId), eq(executionPlan.plan_status, 'ACTIVE')))
      .returning();
    return rows[0] ?? null;
  }

  /**
   * P3-H C3 (design §6.2 — "All-slots-executed -> plan COMPLETED"). ONE atomic conditional UPDATE (the
   * atomic-first invariant 0.4 — no read-then-write): `plan_status -> 'COMPLETED'` WHERE currently
   * `'ACTIVE'` AND no `execution_cycle_slots` row for this plan is still `'PENDING'`. Called after EVERY
   * slot transitions to `EXECUTED_ON_PLAN` (the only way a plan naturally exhausts its slots without ever
   * deviating) — a plan with remaining PENDING slots is a genuine, self-guarding no-op (the `NOT EXISTS`
   * arm fails to match). Returns whether THIS call's own transition actually landed (idempotent: a
   * duplicate call — or one racing another slot's completion of an ALREADY-completed plan — returns
   * `false`, never a double transition).
   */
  async completeIfAllSlotsDone(planId: string): Promise<boolean> {
    const result = await this.db.execute(sql`
      UPDATE execution_plans
      SET plan_status = 'COMPLETED'
      WHERE plan_id = ${planId}::uuid
        AND plan_status = 'ACTIVE'
        AND NOT EXISTS (
          SELECT 1 FROM execution_cycle_slots
          WHERE plan_id = ${planId}::uuid AND slot_status = 'PENDING'
        )
      RETURNING plan_id
    `);
    return rowsOf(result).length > 0;
  }

  /**
   * P3-H C4 (design §6.4 — ADAPT disposition, the bounded-resolver's OWN successful-absorption write).
   * Guarded conditional UPDATE, the SAME `WHERE plan_status='ACTIVE'` shape as `markAborted`/`markEscalated`
   * (the atomic-first invariant 0.4 — defense-in-depth against a lost race with any other terminal-status
   * writer). ALSO re-binds `standing_order_id` to `newStandingOrderId` — the RE-DERIVED, still-valid order
   * `AdaptationResolverService.resolve` found via `StandingOrderRepository.getActiveOrInjecting(lieutenant_id)`
   * (REUSE — "re-read the still-valid standing order", design §6.4); this is the plan's own audit trail of
   * WHICH order it continues under (may be the SAME order_id it was created with, when the triggering
   * deviation was NOT `STANDING_ORDER_ACTIVE`, or a genuinely different, freshly-reissued order when it was).
   */
  async markAdapted(planId: string, newStandingOrderId: string): Promise<ExecutionPlanRow | null> {
    const rows = await this.db
      .update(executionPlan)
      .set({ plan_status: 'ADAPTED', standing_order_id: newStandingOrderId })
      .where(and(eq(executionPlan.plan_id, planId), eq(executionPlan.plan_status, 'ACTIVE')))
      .returning();
    return rows[0] ?? null;
  }

  // C4 adds the tier-advance non-regression read — against the REAL call site.

  /**
   * P3-H C9 (design §11 — `GET /v1/admin/players/:id/decision-horizon`, the ★ P5 inversion headline: "all
   * plans (all statuses), slot deviation records"). EVERY plan this player holds, across EVERY lieutenant
   * (unlike `listWithSlotsForLieutenant`'s own per-lieutenant scope, C2) — the admin diagnostic's own "TRUE
   * state" contract names no lieutenant filter. Reuses `.select()`'s own FULL-row shape verbatim (the SAME
   * query this method's sibling already runs) — `ExecutionCycleSlotRow` already carries `committed_action_
   * ref`/`expected_constraints`/`deviation_record` RAW (never player-walled at the repository layer; the
   * R2.2 wall lives ONLY in `execution-plan.service.ts#projectPlan`, C2 — the admin controller below reads
   * these SAME rows WITHOUT that projection, the deliberate BO-only P5 inversion). A player with zero plans
   * ever returns `[]` (never an error — the same organic-empty convention `listWithSlotsForLieutenant`
   * establishes). A READ — no state change.
   */
  async listAllForPlayer(playerId: string): Promise<Array<{ plan: ExecutionPlanRow; slots: ExecutionCycleSlotRow[] }>> {
    const plans = await this.db
      .select()
      .from(executionPlan)
      .where(eq(executionPlan.player_id, playerId))
      .orderBy(asc(executionPlan.created_at_tick));

    const result: Array<{ plan: ExecutionPlanRow; slots: ExecutionCycleSlotRow[] }> = [];
    for (const plan of plans) {
      const slots = await this.db
        .select()
        .from(executionCycleSlot)
        .where(eq(executionCycleSlot.plan_id, plan.plan_id))
        .orderBy(asc(executionCycleSlot.slot_index));
      result.push({ plan, slots });
    }
    return result;
  }
}

/** Defensive dual-shape read for a raw `db.execute` result (this codebase's own established idiom —
 *  `capability-debts.repository.ts#rowsOf`/`exceptions.repository.ts#hasPendingForBuilding`, copied
 *  verbatim per convention: no shared extraction across repositories). */
function rowsOf(result: unknown): Array<Record<string, unknown>> {
  return (result as { rows?: Array<Record<string, unknown>> }).rows ?? (result as Array<Record<string, unknown>>);
}
