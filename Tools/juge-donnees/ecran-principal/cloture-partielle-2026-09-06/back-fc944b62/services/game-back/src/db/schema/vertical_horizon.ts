// IMPLEMENTS: docs/tech/09_data_model/schema_core_loops.md §17 (mig 0141) -- P3-H C1 --
//             Design: docs/superpowers/specs/2026-07-24-p3-H-vertical-horizon-design.md §3
//             (data model, verbatim) + §6/§7 (Decision Horizon Lock) + §9 (Benchmark Drift).
//             Decisions: docs/superpowers/specs/2026-07-24-p3-H-vertical-horizon-decisions.md DD-H4.
//             -- P3-H C1 -- 2026-07-24
//
// `vertical_horizon.ts` — the 5 NEW tables P3-H (8th P3 sub-lot — Vertical Horizon: Decision Horizon
// Lock / Pressure Inverse / Benchmark Drift) adds in mig 0141:
//   `executionPlan` (the multi-cycle wrapper over a LIVE Phase-25 standing order, D2) +
//   `executionCycleSlot` (one row per engaged cycle, D2/§6.1) +
//   `scriptStabilityCounter` (per-(player,lieutenant) consecutive-no-deviation ratchet, D5) +
//   `playerMetricBenchmark` (per-(player,metric_kind) baseline ledger, D10) +
//   `playerReanchorQuota` (one row per player, weekly re-anchor quota, D11/D12).
// The Pressure Inverse columns (`pressure_tier`/`graduation_count_since_last_pressure_unlock`/
// `tier4_observation_until_tick`, design §3 divergence #1) are ADDED to `player_progression_state`
// (mirrored in `player_progression_state.ts`, NOT here — that table's OWN home since ch09 Task 4,
// mirrors `delegation_ratchet.ts`'s own precedent of leaving `player_progression_state` activation
// entirely inside that table's own file).
//
// 7 NEW pgEnums this file (mig 0141 — see the migration's own header for the "8 vs 7+1" reconciliation:
// R6 DEFINITIVE pins `pressure_tier` to smallint+CHECK, not a pgEnum): `executionPlanStatus`,
// `deviationMode`, `deviationSeverity` (on `executionPlan`); `cycleSlotStatus`, `constraintConditionType`
// (the LATTER a REGISTRY-ONLY enum — no column here types AS it, see below); `metricKind`,
// `snapshotSource` (on `playerMetricBenchmark`).

import { pgTable, pgEnum, uuid, integer, smallint, bigint, numeric, jsonb, timestamp, index, uniqueIndex, check, primaryKey } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { player } from './player'; // Task 3 — convention canonique FK player_id REUSE §5.1
import { lieutenant } from './lieutenant'; // per-lieutenant-state FK convention (standing_order_state.ts/signal_drift.ts/autonomy_ceiling.ts precedent)

// ===== Enums Postgres natifs (7 NEW — migration 0141) =====

/** design §3 verbatim member list. */
export const executionPlanStatus = pgEnum('execution_plan_status', ['ACTIVE', 'ESCALATED', 'ABORTED', 'COMPLETED', 'ADAPTED']);

/** design §3/D4 verbatim — the tier-ladder deviation rule the plan's own creation pins (ABORT@T1/+ESCALATE@T2/+ADAPT@T3). */
export const deviationMode = pgEnum('deviation_mode', ['ABORT', 'ESCALATE', 'ADAPT']);

/** design §3/§7.2 verbatim — ascending-severity declaration order (NEGLIGIBLE < MODERATE < SEVERE) so PG's
 *  own enum comparison operators are meaningful ("the most-critical failed clause"). */
export const deviationSeverity = pgEnum('deviation_severity', ['NEGLIGIBLE', 'MODERATE', 'SEVERE']);

/** design §3 verbatim member list. */
export const cycleSlotStatus = pgEnum('cycle_slot_status', ['PENDING', 'EXECUTED_ON_PLAN', 'DEVIATED', 'ADAPTED', 'ABORTED', 'SKIPPED']);

/** design §3/§7 — 3 LIVE + 2 RESERVED, `CAPABILITY_DEBT_BELOW` LIVE per ★H-2 WIRE-LIVE (D13). REGISTRY-ONLY:
 *  no column on any table in this file types AS this enum — `executionCycleSlot.expected_constraints` is
 *  jsonb (an array of MULTIPLE clause objects, a single-enum column cannot represent it). Exported so C3's
 *  closed-world `DeviationEvaluatorService` registry (DD-H3 boot-check) has ONE canonical, PG-backed member
 *  list (`constraintConditionType.enumValues`) to validate against, mirroring design §3's own explicit "NEW
 *  pgEnum" framing for this exact name. */
export const constraintConditionType = pgEnum('constraint_condition_type', [
  'LIEUTENANT_PRESENT',
  'STANDING_ORDER_ACTIVE',
  'BUDGET_FLOOR',
  'EXTERNAL_EVENT_ABSENT',
  'CAPABILITY_DEBT_BELOW',
]);

/** design §9.1 — 2 LIVE (SAFEHOUSE_UTILIZATION, COURIER_DELIVERY_RATE) + 1 RESERVED (REVENUE_PER_ROUTE,
 *  no route-revenue column — ★H-3 2-LIVE). */
export const metricKind = pgEnum('metric_kind', ['SAFEHOUSE_UTILIZATION', 'COURIER_DELIVERY_RATE', 'REVENUE_PER_ROUTE']);

/** design §3 verbatim member list — the `MetricBaselineComposite`'s own provenance tag. */
export const snapshotSource = pgEnum('snapshot_source', ['INITIAL', 'AUTO_UPDATE', 'PLAYER_REANCHOR']);

// ===== Table 1 : execution_plans (design §3/§6.1 — the multi-cycle wrapper over a LIVE standing order) ===
// PK `plan_id` (synthetic, gen_random_uuid — mirrors `graduation_events.event_id`/`promotion_locks.lock_id`,
// mig 0135: a player may hold MULTIPLE plans over time, unlike the "at most one" per-(player,X) ledgers
// elsewhere in ch06). `lieutenant_id` FK CASCADE (mirrors the per-lieutenant-state convention this
// codebase already establishes — `standing_order_state.ts`/`signal_drift.ts`/`autonomy_ceiling.ts`).
// `standing_order_id` is a SOFT-REF uuid (no DB FK — design §3, mirrors `capability_adoptions.card_id`'s
// own soft-ref discipline: the plan's own history must remain queryable independent of the order row's
// lifecycle). `abort_recovery_cost_ref` ships jsonb NULL — design gives no explicit type for this "ref"
// column; jsonb is the coder-chosen, disclosed realization (a stamped-at-ABORT audit snapshot, C3),
// mirroring this codebase's own "_ref"/"_snapshot" jsonb convention elsewhere.
export const executionPlan = pgTable(
  'execution_plans',
  {
    plan_id:                    uuid('plan_id').primaryKey().defaultRandom(),
    player_id:                   uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),
    lieutenant_id:                 uuid('lieutenant_id').notNull().references(() => lieutenant.lieutenant_id, { onDelete: 'cascade' }),
    standing_order_id:               uuid('standing_order_id').notNull(),                                              // design §3 — soft-ref -> standing_order.order_id, NO FK
    created_at_tick:                   bigint('created_at_tick', { mode: 'number' }).notNull(),
    execution_window:                    smallint('execution_window').notNull(),                                        // design §3 — CHECK >= 1 below; the tier ladder's cycles_ahead(tier) bound is applicative (C2)
    deviation_rule:                        deviationMode('deviation_rule').notNull(),
    deviation_threshold:                     deviationSeverity('deviation_threshold').notNull().default('SEVERE'),
    plan_status:                               executionPlanStatus('plan_status').notNull().default('ACTIVE'),
    abort_recovery_cost_ref:                     jsonb('abort_recovery_cost_ref'),                                        // design §3 — NULL until C3's ABORT handler stamps it
  },
  (table) => ({
    execution_window_chk: check('execution_plans_execution_window_chk', sql`${table.execution_window} >= 1`),
    // design §3 — the per-player timeline projection's own query shape (§10 GET .../execution-plans).
    player_status_idx: index('execution_plans_player_status_idx').on(table.player_id, table.plan_status),
    // design §3 — the STANDING_ORDER_ACTIVE deviation clause's soft-ref lookup.
    standing_order_idx: index('execution_plans_standing_order_idx').on(table.standing_order_id),
  }),
);

export const executionPlanRelations = relations(executionPlan, ({ one, many }) => ({
  player: one(player, {
    fields: [executionPlan.player_id],
    references: [player.player_id],
  }),
  lieutenant: one(lieutenant, {
    fields: [executionPlan.lieutenant_id],
    references: [lieutenant.lieutenant_id],
  }),
  slots: many(executionCycleSlot),
}));

// ===== Table 2 : execution_cycle_slots (design §3/§6.1/§6.5 — one row per engaged cycle) ================
// FK CASCADE `plan_id` (design §3 explicit). `committed_action_ref` — the standing order's ALREADY-
// COMPILED `rule` (R13 DEFINITIVE, C0 re-anchor §14: a direct jsonb COPY at plan-creation, zero
// `compile()` calls), set NOT NULL (every slot carries its committed action from creation, design §6.1
// step 2). Unique `(plan_id, cycle_tick)` — the falsifiable's own "duplicate slot REFUSED" sentinel.
export const executionCycleSlot = pgTable(
  'execution_cycle_slots',
  {
    slot_id:                uuid('slot_id').primaryKey().defaultRandom(),
    plan_id:                  uuid('plan_id').notNull().references(() => executionPlan.plan_id, { onDelete: 'cascade' }),
    slot_index:                  smallint('slot_index').notNull(),
    cycle_tick:                    bigint('cycle_tick', { mode: 'number' }).notNull(),
    committed_action_ref:            jsonb('committed_action_ref').notNull(),                                             // design §6.1/R13 — direct jsonb copy of standing_order.rule, zero compile() calls
    expected_constraints:              jsonb('expected_constraints').$type<unknown[]>().notNull().default([]),            // design §3/§6.5 — ConstraintClause[] (LIEUTENANT_PRESENT + STANDING_ORDER_ACTIVE + CAPABILITY_DEBT_BELOW, C3)
    slot_status:                         cycleSlotStatus('slot_status').notNull().default('PENDING'),
    deviation_record:                      jsonb('deviation_record'),                                                     // design §3 — NULL until C3's evaluator stamps a DeviationRecord
  },
  (table) => ({
    // design §3 — the falsifiable's own "duplicate (plan_id, cycle_tick) slot REFUSED" sentinel.
    plan_cycle_tick_unique_idx: uniqueIndex('execution_cycle_slots_plan_cycle_tick_unique_idx').on(table.plan_id, table.cycle_tick),
    // The C3 NIGHTLY/33 evaluator's own per-tick scan shape (coder-chosen realization, disclosed — see
    // the migration's own header): find every slot due "today" by cycle_tick, then join to
    // execution_plans for the plan_status='ACTIVE' filter.
    cycle_tick_idx: index('execution_cycle_slots_cycle_tick_idx').on(table.cycle_tick),
  }),
);

export const executionCycleSlotRelations = relations(executionCycleSlot, ({ one }) => ({
  plan: one(executionPlan, {
    fields: [executionCycleSlot.plan_id],
    references: [executionPlan.plan_id],
  }),
}));

// ===== Table 3 : script_stability_counters (design §3/§5/§6.6 — per-(player,lieutenant) ratchet) ========
// PK composite (player_id, lieutenant_id) — mirrors `mastery_score`'s own "at most one row per (player,X)"
// shape (mig 0002/0135). Both PK halves FK CASCADE — a counter has no meaning outside either parent.
// `tier_target`/`last_deviation_tick`/`last_reset_tick` all nullable, no default (design gives no NOT
// NULL/default marker on any of the three; mirrors this codebase's own convention of leaving design-
// unmarked, non-identity columns nullable — e.g. `graduation_events.lieutenant_id`, mig 0135).
export const scriptStabilityCounter = pgTable(
  'script_stability_counters',
  {
    player_id:                              uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),
    lieutenant_id:                            uuid('lieutenant_id').notNull().references(() => lieutenant.lieutenant_id, { onDelete: 'cascade' }),
    consecutive_no_deviation_cycles:            integer('consecutive_no_deviation_cycles').notNull().default(0),           // design §3 — CHECK >= 0 below; the tier-advance gate reads this
    tier_target:                                  smallint('tier_target'),                                                 // design §3 — the tier this counter's threshold applies toward
    last_deviation_tick:                            bigint('last_deviation_tick', { mode: 'number' }),
    last_reset_tick:                                  bigint('last_reset_tick', { mode: 'number' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.player_id, table.lieutenant_id] }),
    consecutive_no_deviation_cycles_chk: check(
      'script_stability_counters_consecutive_no_deviation_cycles_chk',
      sql`${table.consecutive_no_deviation_cycles} >= 0`,
    ),
  }),
);

export const scriptStabilityCounterRelations = relations(scriptStabilityCounter, ({ one }) => ({
  player: one(player, {
    fields: [scriptStabilityCounter.player_id],
    references: [player.player_id],
  }),
  lieutenant: one(lieutenant, {
    fields: [scriptStabilityCounter.lieutenant_id],
    references: [lieutenant.lieutenant_id],
  }),
}));

// ===== Table 4 : player_metric_benchmarks (design §3/§9.1 — per-(player,metric_kind) baseline ledger) ===
// PK composite (player_id, metric_kind) — design §3 explicit; the falsifiable's own "duplicate benchmark
// REFUSED (PK)" sentinel; no separate index needed (mirrors `player_progression_state.ts`'s own "PK
// B-tree serves all access patterns" documented convention). `baseline_value`/`baseline_snapshot_tick` are
// NOT NULL — design's own composite framing (§9.1: "baseline_snapshot is a composite (value + snapshot
// tick + source), never a bare float") — a row is only ever created WITH its first real snapshot.
export const playerMetricBenchmark = pgTable(
  'player_metric_benchmarks',
  {
    player_id:                uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),
    metric_kind:                 metricKind('metric_kind').notNull(),
    baseline_value:                 numeric('baseline_value', { precision: 12, scale: 4 }).notNull(),                       // design §3/§9.1 — the composite MUST carry a real value, never a bare-shell row
    baseline_snapshot_tick:            bigint('baseline_snapshot_tick', { mode: 'number' }).notNull(),
    baseline_source:                      snapshotSource('baseline_source').notNull().default('INITIAL'),
    drift_accumulator:                       numeric('drift_accumulator', { precision: 6, scale: 2 }).notNull().default('0'), // design §3 — CHECK >= 0 below; numeric() string-mode (Drizzle), no float drift
    last_auto_update_tick:                      bigint('last_auto_update_tick', { mode: 'number' }),                        // design §3 — NULL until the first NIGHTLY/32 auto-update snapshot (C6)
    created_at_tick:                               bigint('created_at_tick', { mode: 'number' }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.player_id, table.metric_kind] }),
    drift_accumulator_chk: check('player_metric_benchmarks_drift_accumulator_chk', sql`${table.drift_accumulator} >= 0`),
  }),
);

export const playerMetricBenchmarkRelations = relations(playerMetricBenchmark, ({ one }) => ({
  player: one(player, {
    fields: [playerMetricBenchmark.player_id],
    references: [player.player_id],
  }),
}));

// ===== Table 5 : player_reanchor_quotas (design §3/§9.4 — one row per player, weekly re-anchor quota) ===
// PK `player_id` FK CASCADE (design §3 explicit, 1-1-per-player shape). `week_reset_at` is a REAL
// wall-clock timestamptz (R9 DEFINITIVE, C0 re-anchor §11 — plain wall-clock arithmetic, no tick-space
// conversion, no second ratio). `last_executed_tick`/`horizon_tier_at_upgrade` both nullable (design
// explicit "NULL" on both).
export const playerReanchorQuota = pgTable(
  'player_reanchor_quotas',
  {
    player_id:                    uuid('player_id').primaryKey().references(() => player.player_id, { onDelete: 'cascade' }),
    uses_remaining_this_week:       smallint('uses_remaining_this_week').notNull().default(1),                              // design §3 — CHECK >= 0 AND CHECK <= max_uses_per_week below
    max_uses_per_week:                 smallint('max_uses_per_week').notNull().default(1),
    week_reset_at:                        timestamp('week_reset_at', { withTimezone: true }).notNull(),                     // design §3/D11/R9 — real-time stamp, elapsed-at-read (no @Cron)
    last_executed_tick:                      bigint('last_executed_tick', { mode: 'number' }),
    horizon_tier_at_upgrade:                    smallint('horizon_tier_at_upgrade'),
  },
  (table) => ({
    uses_remaining_floor_chk: check('player_reanchor_quotas_uses_remaining_floor_chk', sql`${table.uses_remaining_this_week} >= 0`),
    // design §3 — the falsifiable's own "uses_remaining > max REFUSED (CHECK)" sentinel.
    uses_remaining_le_max_chk: check(
      'player_reanchor_quotas_uses_remaining_le_max_chk',
      sql`${table.uses_remaining_this_week} <= ${table.max_uses_per_week}`,
    ),
  }),
);

export const playerReanchorQuotaRelations = relations(playerReanchorQuota, ({ one }) => ({
  player: one(player, {
    fields: [playerReanchorQuota.player_id],
    references: [player.player_id],
  }),
}));

// ===== Types inférés Drizzle =====
export type ExecutionPlanRow = typeof executionPlan.$inferSelect;
export type ExecutionPlanInsert = typeof executionPlan.$inferInsert;
export type ExecutionCycleSlotRow = typeof executionCycleSlot.$inferSelect;
export type ExecutionCycleSlotInsert = typeof executionCycleSlot.$inferInsert;
export type ScriptStabilityCounterRow = typeof scriptStabilityCounter.$inferSelect;
export type ScriptStabilityCounterInsert = typeof scriptStabilityCounter.$inferInsert;
export type PlayerMetricBenchmarkRow = typeof playerMetricBenchmark.$inferSelect;
export type PlayerMetricBenchmarkInsert = typeof playerMetricBenchmark.$inferInsert;
export type PlayerReanchorQuotaRow = typeof playerReanchorQuota.$inferSelect;
export type PlayerReanchorQuotaInsert = typeof playerReanchorQuota.$inferInsert;
