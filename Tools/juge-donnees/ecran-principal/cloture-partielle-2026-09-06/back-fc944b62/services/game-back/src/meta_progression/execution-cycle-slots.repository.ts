// IMPLEMENTS: docs/superpowers/plans/2026-07-24-p3-H-vertical-horizon-plan.md C1 (`VerticalHorizonModule`
//             scaffold — module + repositories, NO runtime logic yet, C2+ fills it in, DD-H1) + C3
//             ("EXECUTION_PLAN_EVALUATOR_TICK NIGHTLY/33 -> ExecutionPlanEvaluatorService.tick: per ACTIVE
//             plan with a slot at cycle_tick, run DeviationEvaluatorService.evaluate ... no-deviation ->
//             EXECUTED_ON_PLAN ... deviation -> DEVIATED").
//             Design: docs/superpowers/specs/2026-07-24-p3-H-vertical-horizon-design.md §3 (`execution_
//             cycle_slots` — one row per engaged cycle, D2) + §6.2/§6.5 (per-cycle evaluation + the v1
//             constraint derivation) + §7 (the DeviationEvaluator registry read).
//             Pattern (the due-today scan — a JOIN to the owning plan for the `plan_status='ACTIVE'`
//             filter, over the `execution_cycle_slots_cycle_tick_idx` index): the migration's own header
//             note (`vertical_horizon.ts#executionCycleSlot`'s own comment on `cycle_tick_idx`). Pattern
//             (guarded single-statement `WHERE slot_status='PENDING'` transition, `.returning()` non-empty
//             = "this call's own transition landed"): `execution-plans.repository.ts#markAborted` (the
//             SAME atomic-first idiom, plan-level).
//             -- P3-H C1 -- 2026-07-24 / C3 -- 2026-07-24
//
// `ExecutionCycleSlotsRepository` — over `execution_cycle_slots` (mig 0141). C3 adds the NIGHTLY/33
// per-tick due-scan (`findDueAtTick`) + the slot_status transition writers (`markExecutedOnPlan`/
// `markDeviated`/`markRemainingAborted`, design §6.2/§6.3). C4 adds `markAdapted` (design §6.4) — against
// the REAL call site.

import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { executionPlan, executionCycleSlot, type ExecutionPlanRow, type ExecutionCycleSlotRow } from '../db/schema/vertical_horizon';

@Injectable()
export class ExecutionCycleSlotsRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * P3-H C3 (design §6.2 — "per ACTIVE plan with a slot at the cycle_tick"). ONE JOIN read over the
   * `execution_cycle_slots_cycle_tick_idx` index: every `PENDING` slot at EXACTLY `cycleTick` whose owning
   * plan is `player_id=:playerId AND plan_status='ACTIVE'` — the evaluator tick's own per-player scan
   * (`ctx.playerId`/`ctx.gameMinute`, the scheduler's per-player tick context). A player with no ACTIVE
   * plans, or none due exactly today, returns `[]` (organically a no-op — the zero-regression dormant-by-
   * data contract, design §16). A READ — no state change.
   */
  async findDueAtTick(playerId: string, cycleTick: number): Promise<Array<{ slot: ExecutionCycleSlotRow; plan: ExecutionPlanRow }>> {
    const rows = await this.db
      .select({ slot: executionCycleSlot, plan: executionPlan })
      .from(executionCycleSlot)
      .innerJoin(executionPlan, eq(executionPlan.plan_id, executionCycleSlot.plan_id))
      .where(
        and(
          eq(executionPlan.player_id, playerId),
          eq(executionPlan.plan_status, 'ACTIVE'),
          eq(executionCycleSlot.cycle_tick, cycleTick),
          eq(executionCycleSlot.slot_status, 'PENDING'),
        ),
      );
    return rows;
  }

  /**
   * P3-H C3 (design §6.2 — no-deviation disposition). Guarded conditional UPDATE: `slot_status ->
   * 'EXECUTED_ON_PLAN'` WHERE currently `'PENDING'` (the atomic-first invariant 0.4 — the Concurrence
   * proof: a double evaluator tick on the SAME `cycle_tick` races this SAME guard, only ONE wins,
   * `RETURNING` non-empty exactly once). Returns `null` on a lost race — the caller then skips every
   * downstream side effect (counter increment, plan-completion check, event emit) for this slot.
   */
  async markExecutedOnPlan(slotId: string): Promise<ExecutionCycleSlotRow | null> {
    const rows = await this.db
      .update(executionCycleSlot)
      .set({ slot_status: 'EXECUTED_ON_PLAN' })
      .where(and(eq(executionCycleSlot.slot_id, slotId), eq(executionCycleSlot.slot_status, 'PENDING')))
      .returning();
    return rows[0] ?? null;
  }

  /**
   * P3-H C3 (design §6.2/§6.3 — deviation disposition, EVERY rule: ABORT/ESCALATE/the C3-disclosed
   * ADAPT-fallback all transition the TRIGGERING slot to `DEVIATED` first, THEN dispatch the plan-level
   * rule — the plan's own Falsifiable text names "slot DEVIATED" for both the ABORT and ESCALATE cases
   * verbatim). `deviationRecord` is the `DeviationRecord` audit stamp (design §15 glossary term — the
   * failed clause types + severity + the evaluated tick, never surfaced to the player, R2.2/D15). Guarded
   * the SAME `WHERE slot_status='PENDING'` way as `markExecutedOnPlan` — the SAME Concurrence proof.
   */
  async markDeviated(slotId: string, deviationRecord: Record<string, unknown>): Promise<ExecutionCycleSlotRow | null> {
    const rows = await this.db
      .update(executionCycleSlot)
      .set({ slot_status: 'DEVIATED', deviation_record: deviationRecord })
      .where(and(eq(executionCycleSlot.slot_id, slotId), eq(executionCycleSlot.slot_status, 'PENDING')))
      .returning();
    return rows[0] ?? null;
  }

  /**
   * P3-H C3 (design §6.3 — ABORT's own "remaining-slot resource recovered" bulk step). ONE set-based
   * UPDATE: every OTHER `PENDING` slot of this plan (past OR future cycle_tick, not just the one that
   * triggered the abort — that one was ALREADY transitioned to `DEVIATED` by `markDeviated` above, so it
   * never matches this `WHERE slot_status='PENDING'` arm) -> `'ABORTED'`. Called ONLY after
   * `ExecutionPlansRepository.markAborted` itself landed (the plan-level guard) — never independently.
   * Returns the count actually transitioned (0 for a 1-slot plan, since its only slot is already
   * `DEVIATED` by the time this runs).
   */
  async markRemainingAborted(planId: string): Promise<number> {
    const rows = await this.db
      .update(executionCycleSlot)
      .set({ slot_status: 'ABORTED' })
      .where(and(eq(executionCycleSlot.plan_id, planId), eq(executionCycleSlot.slot_status, 'PENDING')))
      .returning({ slot_id: executionCycleSlot.slot_id });
    return rows.length;
  }

  /**
   * P3-H C4 (design §6.4 — "re-derive the REMAINING slots' `expected_constraints`"). Every OTHER `PENDING`
   * slot of this plan (the triggering slot that fired the ADAPT dispatch was ALREADY transitioned to
   * `DEVIATED` by `markDeviated` before `AdaptationResolverService.resolve` is ever called, so it never
   * matches this WHERE — the SAME "already-DEVIATED excludes itself" shape `markRemainingAborted` relies
   * on for ABORT). A READ — no state change. `AdaptationResolverService.resolve` uses this BOTH to decide
   * whether there is anything left to adapt INTO (an empty result = the bounded v1 "nothing left, cannot
   * adapt" case — a 1-cycle plan's triggering slot IS its only slot) and, on success, as the exact row set
   * `markRemainingAdapted` below bulk-transitions.
   */
  async listPendingForPlan(planId: string): Promise<ExecutionCycleSlotRow[]> {
    return this.db
      .select()
      .from(executionCycleSlot)
      .where(and(eq(executionCycleSlot.plan_id, planId), eq(executionCycleSlot.slot_status, 'PENDING')));
  }

  /**
   * P3-H C4 (design §6.4 — "every remaining slot now has a satisfiable constraint set -> slots ADAPTED").
   * ONE set-based UPDATE, the EXACT mirror of `markRemainingAborted` above (same WHERE shape, `'ADAPTED'`
   * instead of `'ABORTED'`): every remaining `PENDING` slot of this plan -> `'ADAPTED'`. Called ONLY after
   * `ExecutionPlansRepository.markAdapted` itself landed (the plan-level guard) — never independently, the
   * SAME ordering `markRemainingAborted` follows relative to `markAborted`. Returns the count actually
   * transitioned (0 is unreachable in practice here — `AdaptationResolverService.resolve` only reaches this
   * call when `listPendingForPlan` already found a non-empty remaining set).
   */
  async markRemainingAdapted(planId: string): Promise<number> {
    const rows = await this.db
      .update(executionCycleSlot)
      .set({ slot_status: 'ADAPTED' })
      .where(and(eq(executionCycleSlot.plan_id, planId), eq(executionCycleSlot.slot_status, 'PENDING')))
      .returning({ slot_id: executionCycleSlot.slot_id });
    return rows.length;
  }
}
