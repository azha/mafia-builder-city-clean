-- migration 0141: vertical_horizon (P3-H C1 — Vertical Horizon data model, ch06 8th P3 sub-lot)
-- Plan: docs/superpowers/plans/2026-07-24-p3-H-vertical-horizon-plan.md C1
-- Design: docs/superpowers/specs/2026-07-24-p3-H-vertical-horizon-design.md §3 (data model, verbatim)
-- Decisions: docs/superpowers/specs/2026-07-24-p3-H-vertical-horizon-decisions.md DD-H4 (ONE migration if
--         PG allows — R10 confirmed zero split risk, every enum here is brand-new CREATE TYPE, no
--         ALTER-TYPE-ADD-VALUE hazard like P3-G's 0137/0138) + DD-H3 (closed registries, LIVE/RESERVED).
-- C0 re-anchor: docs/superpowers/specs/2026-07-24-p3-H-C0-reanchor.md §1 (R12 — journal head 140 confirmed
--         this session, this branch takes idx 141, zero drift) + §8 (R6 — pressure_tier ships smallint +
--         CHECK, NOT a pgEnum, mirroring every sibling pps tier column) + §12 (R10 — CREATE TYPE + a
--         same-file CHECK/column reference is safe on this stack, in-repo precedent mig 0131).
--
-- ★ NOTE on the "8 NEW pgEnums" figure carried in the plan/design prose: R6 (C0 re-anchor §8, DEFINITIVE)
-- pins `pressure_tier` to smallint+CHECK, NOT a pgEnum — the design/plan's own R10 enumeration inside the
-- C0-reanchor doc itself already lists exactly 7 real `CREATE TYPE` names plus "the SMALLINT (not pgEnum,
-- R6) pressure_tier" as the 8th item in that sentence. This migration therefore ships **7 CREATE TYPE
-- statements** (matching R10's own list verbatim: execution_plan_status, deviation_mode, deviation_severity,
-- cycle_slot_status, constraint_condition_type, metric_kind, snapshot_source) + pressure_tier as a plain
-- smallint column with a CHECK — resolving the apparent "8" vs "7+1" wording gap in favor of the later,
-- more specific, DEFINITIVE C0 finding (R6), per the binding-verdicts instruction. No design DECISION was
-- overridden — R6 itself IS the design-locked disposition for this exact column.
--
-- Five NEW tables (design §3), all consumed across C2-C9:
--
-- (1) "execution_plans" — the multi-cycle wrapper over a LIVE Phase-25 standing order (D2). PK `plan_id`
--   uuid (gen_random_uuid, mirrors mig 0135's `graduation_events.event_id`/`promotion_locks.lock_id`
--   convention — a synthetic id, not a composite PK, since a player may hold MULTIPLE plans over time,
--   unlike the "at most one" per-(player,X) ledgers elsewhere in ch06). `lieutenant_id` FK CASCADE
--   (mirrors the dominant per-lieutenant-state convention this codebase already establishes —
--   `standing_order_state.ts`/`signal_drift.ts`/`autonomy_ceiling.ts` all FK CASCADE to
--   `lieutenant.lieutenant_id`; design's own data-model row omits the "FK CASCADE" annotation on this one
--   column the same terse way it omits it on several ambiguous columns elsewhere, so the convention fills
--   the gap, not a fabrication). `standing_order_id` is a SOFT-REF uuid (no DB FK — design §3 "soft-ref →
--   standing_order.order_id", mirrors `capability_adoptions.card_id`'s own soft-ref discipline, mig 0137:
--   the plan's own history must remain queryable independent of the order row's lifecycle). NEW pgEnums
--   `execution_plan_status`/`deviation_mode`/`deviation_severity` (design §3 verbatim member lists,
--   ascending-severity declaration order for `deviation_severity` so PG's own enum comparison operators
--   are meaningful if ever used: NEGLIGIBLE < MODERATE < SEVERE). `abort_recovery_cost_ref` ships as
--   jsonb NULL (design gives no explicit type for this "ref" column; jsonb mirrors this codebase's own
--   convention for a stamped-at-ABORT audit snapshot, e.g. `capability_adoptions.card_id`-adjacent
--   "_ref"/"_snapshot" jsonb columns elsewhere — a coder judgment call on TYPE ONLY, disclosed here, not a
--   business-rule invention: the column stays NULL until C3's ABORT handler stamps it). Index
--   `(player_id, plan_status)` (design §3) + `(standing_order_id)` (design §3, soft-ref lookup).
--
-- (2) "execution_cycle_slots" — one row per engaged cycle (design §6.1: "N execution_cycle_slots, one per
--   engaged cycle"). PK `slot_id` uuid (gen_random_uuid). FK CASCADE `plan_id` (design §3 explicit "FK
--   CASCADE"). `committed_action_ref` jsonb — the standing order's ALREADY-COMPILED `rule` (R13
--   DEFINITIVE, C0 re-anchor §14: a direct jsonb COPY at plan-creation time, zero `compile()` calls) — set
--   NOT NULL (every slot carries its committed action from creation, design §6.1 step 2). NEW pgEnum
--   `cycle_slot_status` (design §3 verbatim). NEW pgEnum `constraint_condition_type` (design §3/§7 — 3
--   LIVE + 2 RESERVED, `CAPABILITY_DEBT_BELOW` LIVE per ★H-2 WIRE-LIVE) — a REGISTRY-ONLY enum: no column
--   on ANY table in this migration types AS `constraint_condition_type` (the per-slot `expected_constraints`
--   jsonb array holds MULTIPLE clause objects, so a single-enum column cannot represent it — the type
--   exists so C3's `DeviationEvaluatorService` registry (DD-H3 closed-world boot-check) and this file's own
--   Drizzle export give ONE canonical, PG-backed closed member list, mirroring the design's own explicit
--   "NEW pgEnum" framing for this exact name in §3's `execution_cycle_slots` row). Unique `(plan_id,
--   cycle_tick)` (design §3 — the falsifiable's own "duplicate slot REFUSED" sentinel). Second index
--   `(cycle_tick)` alone — design's own prose ("index (plan_status via plan_id, cycle_tick) for the
--   evaluator scan") describes a per-tick scan whose REAL filter is the joined PLAN's `plan_status`
--   (reached via `plan_id`, not a column on this table) — a plain `cycle_tick` index is the coder-chosen,
--   disclosed realization of that scan shape for C3's NIGHTLY/33 tick (find every slot due "today", then
--   join to `execution_plans` for the `plan_status='ACTIVE'` filter); the UNIQUE `(plan_id, cycle_tick)`
--   index above already covers plan-scoped lookups.
--
-- (3) "script_stability_counters" — per-(player, lieutenant) consecutive-no-deviation ratchet (design
--   §3/§5/§6.6). PK composite `(player_id, lieutenant_id)` — mirrors `mastery_score`'s own "at most one
--   row per (player, X)" shape (mig 0002/0135 precedent). Both PK halves FK CASCADE (player_id per design
--   §3 explicit; lieutenant_id per the SAME per-lieutenant-state convention as table (1) above — a
--   counter has no meaning outside either parent). `consecutive_no_deviation_cycles integer NOT NULL
--   DEFAULT 0` + CHECK `>= 0` (belt-and-suspenders floor guard — mirrors EVERY counter column this
--   codebase's own migrations already CHECK this way: `capability_debts.structural_debt`,
--   `player_proficiency.recall_debt_total`, `promotion_locks`-adjacent counters; design's own falsifiable
--   text never negatives this counter, but the convention is universal and the CHECK is pure defense-in-
--   depth, disclosed here, never silently invented as a NEW business rule). `tier_target`/`last_deviation_
--   tick`/`last_reset_tick` all nullable, no default (design gives no NOT NULL/default marker on any of
--   the three; mirrors this codebase's own convention of leaving design-unmarked, non-identity columns
--   nullable — e.g. `graduation_events.lieutenant_id`/`seed_decisions_n` in mig 0135).
--
-- (4) "player_metric_benchmarks" — per-(player, metric_kind) baseline ledger (design §3/§9). PK composite
--   `(player_id, metric_kind)` (design §3 explicit — the falsifiable's own "duplicate benchmark REFUSED
--   (PK)" sentinel; no separate index needed, the PK B-tree already serves every access pattern named in
--   design, mirrors `player_progression_state.ts`'s own "PK B-tree serves all access patterns" documented
--   convention). `baseline_value`/`baseline_snapshot_tick` set NOT NULL (design's own composite framing,
--   §9.1: "`baseline_snapshot` is a composite (value + snapshot tick + source), never a bare float" — a
--   row is only ever created WITH its first real snapshot, design §9.1/plan-falsifiable "Init a player's
--   benchmarks → 2 LIVE rows... with real snapshot values", never an empty shell). `baseline_source
--   snapshot_source NOT NULL DEFAULT 'INITIAL'` (design §3 explicit). `drift_accumulator numeric(6,2) NOT
--   NULL DEFAULT 0` + CHECK `>= 0` (design §3 explicit — the falsifiable's own "drift_accumulator=-1
--   REFUSED (CHECK)" sentinel). `last_auto_update_tick` nullable (design explicit "NULL"). `created_at_tick`
--   NOT NULL (mirrors the universal "row-creation stamp" convention this codebase's migrations already
--   apply to every `*_tick`/`created_at` creation-stamp column, e.g. `graduation_events.game_tick`). NEW
--   pgEnums `metric_kind` (design §9.1 — 2 LIVE + 1 RESERVED, `REVENUE_PER_ROUTE` RESERVED per ★H-3
--   2-LIVE) / `snapshot_source` (design §3 verbatim).
--
-- (5) "player_reanchor_quotas" — one row per player, the weekly re-anchor quota (design §3/§9.4). PK
--   `player_id` FK CASCADE (design §3 explicit, mirrors the 1-1-per-player shape). `uses_remaining_this_
--   week smallint NOT NULL DEFAULT 1` + CHECK `>= 0` (floor guard, same universal convention as (3) above,
--   disclosed) + `max_uses_per_week smallint NOT NULL DEFAULT 1` + CHECK `uses_remaining_this_week <=
--   max_uses_per_week` (design §3 explicit — the falsifiable's own "uses_remaining > max REFUSED (CHECK)"
--   sentinel). `week_reset_at timestamptz NOT NULL` (design §3 explicit, real-time stamp — R9 DEFINITIVE,
--   C0 re-anchor §11: plain wall-clock arithmetic, no tick-space conversion). `last_executed_tick`/
--   `horizon_tier_at_upgrade` both nullable (design explicit "NULL" on both).
--
-- Pressure columns on `player_progression_state` (design §3, divergence #1 — columns not a
-- `player_pressure_tiers` table, mirrors the P3-G budget-column precedent): `pressure_tier smallint NOT
-- NULL DEFAULT 1` + CHECK `BETWEEN 1 AND 4` (R6 DEFINITIVE, C0 re-anchor §8 — mirrors the SHIPPED
-- `pps_decision_horizon_tier_chk`/`pps_rule_vocabulary_tier_chk` convention exactly, mig 0002).
-- `graduation_count_since_last_pressure_unlock smallint NOT NULL DEFAULT 0` + CHECK `>= 0` (same floor
-- convention as every other pps counter — `pps_complexity_budget_used_chk`/`pps_org_stress_chk`/
-- `pps_structural_decisions_chk`, mig 0002). `tier4_observation_until_tick timestamptz NULL` (R9
-- DEFINITIVE, C0 re-anchor §11 — real wall-clock stamp despite the "_tick" suffix reading tick-space; a
-- one-line naming-quirk note, not a blocker, per that finding). `decision_horizon_tier` (mig 0002, `:19`)
-- stays REUSE-unchanged (activation only — first real writer lands C4's `HorizonTierAdvancementService`,
-- zero schema touch this chunk).
--
-- ZERO other pgEnum split risk (R10 DEFINITIVE, C0 re-anchor §12): every one of the 7 enum types below is
-- genuinely brand-new (grep-confirmed zero naming collision, C0 re-anchor §12) — `CREATE TYPE` + immediate
-- same-transaction table-column use is standard PostgreSQL behavior (only `ALTER TYPE ... ADD VALUE` on an
-- EXISTING enum carries the P3-G 0137/0138 cross-transaction restriction, which does not apply here).
--
-- GRANTs mirror the mig 0135/0137 pattern (app_rw least-privilege runtime role — UPDATE explicit; SELECT +
-- INSERT auto-granted via mig 0013's ALTER DEFAULT PRIVILEGES) for the 5 NEW tables.
--
-- R9.3: same-commit — docs/tech/09_data_model/schema_core_loops.md §17 (NEW tables, fixed sub-structure) +
-- schema_player_progression_state.md (pressure-columns + horizon-tier activation note) + README journal
-- row. gdd/14 §Meta normalized (§15/§12). gdd/15 NEW terms (§18/§15).

--> statement-breakpoint

-- ===== execution_plans (design §3/§6.1 — the multi-cycle wrapper over a LIVE standing order) =====

CREATE TYPE "execution_plan_status" AS ENUM (
  'ACTIVE',
  'ESCALATED',
  'ABORTED',
  'COMPLETED',
  'ADAPTED'
);

--> statement-breakpoint

CREATE TYPE "deviation_mode" AS ENUM (
  'ABORT',
  'ESCALATE',
  'ADAPT'
);

--> statement-breakpoint

-- Ascending-severity declaration order (NEGLIGIBLE < MODERATE < SEVERE) so PG's own enum comparison
-- operators are meaningful if ever consumed that way (design §7.2 "the most-critical failed clause").
CREATE TYPE "deviation_severity" AS ENUM (
  'NEGLIGIBLE',
  'MODERATE',
  'SEVERE'
);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "execution_plans" (
  "plan_id"                  uuid                   NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"                uuid                   NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "lieutenant_id"             uuid                   NOT NULL REFERENCES "lieutenant"("lieutenant_id") ON DELETE CASCADE,
  "standing_order_id"          uuid                   NOT NULL,
  "created_at_tick"             bigint                 NOT NULL,
  "execution_window"             smallint               NOT NULL,
  "deviation_rule"                 deviation_mode         NOT NULL,
  "deviation_threshold"              deviation_severity     NOT NULL DEFAULT 'SEVERE',
  "plan_status"                        execution_plan_status  NOT NULL DEFAULT 'ACTIVE',
  "abort_recovery_cost_ref"              jsonb
);

--> statement-breakpoint

ALTER TABLE "execution_plans"
  ADD CONSTRAINT "execution_plans_execution_window_chk"
  CHECK ("execution_window" >= 1);

--> statement-breakpoint

CREATE INDEX "execution_plans_player_status_idx"
  ON "execution_plans" ("player_id", "plan_status");

--> statement-breakpoint

CREATE INDEX "execution_plans_standing_order_idx"
  ON "execution_plans" ("standing_order_id");

--> statement-breakpoint

GRANT UPDATE ON "execution_plans" TO app_rw; -- SELECT/INSERT auto-grantés (0013 ALTER DEFAULT PRIVILEGES)

--> statement-breakpoint

-- ===== execution_cycle_slots (design §3/§6.1/§6.5 — one row per engaged cycle) =====

CREATE TYPE "cycle_slot_status" AS ENUM (
  'PENDING',
  'EXECUTED_ON_PLAN',
  'DEVIATED',
  'ADAPTED',
  'ABORTED',
  'SKIPPED'
);

--> statement-breakpoint

-- REGISTRY-ONLY enum (design §3/§7): no column on ANY table in this migration types AS this enum — the
-- per-slot `expected_constraints` jsonb array holds MULTIPLE clause objects (a single-enum column cannot
-- represent them). Created here so C3's closed-world DeviationEvaluator registry (DD-H3) has ONE
-- canonical, PG-backed member list to boot-check against, mirroring design §3's own explicit "NEW pgEnum"
-- framing for this name. 3 LIVE + 2 RESERVED — CAPABILITY_DEBT_BELOW LIVE per ★H-2 WIRE-LIVE (design §7).
CREATE TYPE "constraint_condition_type" AS ENUM (
  'LIEUTENANT_PRESENT',
  'STANDING_ORDER_ACTIVE',
  'BUDGET_FLOOR',
  'EXTERNAL_EVENT_ABSENT',
  'CAPABILITY_DEBT_BELOW'
);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "execution_cycle_slots" (
  "slot_id"                uuid                NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "plan_id"                 uuid                NOT NULL REFERENCES "execution_plans"("plan_id") ON DELETE CASCADE,
  "slot_index"                smallint            NOT NULL,
  "cycle_tick"                  bigint              NOT NULL,
  "committed_action_ref"          jsonb               NOT NULL,
  "expected_constraints"             jsonb               NOT NULL DEFAULT '[]'::jsonb,
  "slot_status"                        cycle_slot_status   NOT NULL DEFAULT 'PENDING',
  "deviation_record"                     jsonb
);

--> statement-breakpoint

CREATE UNIQUE INDEX "execution_cycle_slots_plan_cycle_tick_unique_idx"
  ON "execution_cycle_slots" ("plan_id", "cycle_tick");

--> statement-breakpoint

-- The C3 NIGHTLY/33 evaluator's own per-tick scan shape (coder-chosen realization, disclosed — see file
-- header): find every slot due "today" by cycle_tick, then join to execution_plans for plan_status.
CREATE INDEX "execution_cycle_slots_cycle_tick_idx"
  ON "execution_cycle_slots" ("cycle_tick");

--> statement-breakpoint

GRANT UPDATE ON "execution_cycle_slots" TO app_rw; -- SELECT/INSERT auto-grantés (0013 ALTER DEFAULT PRIVILEGES)

--> statement-breakpoint

-- ===== script_stability_counters (design §3/§5/§6.6 — per-(player,lieutenant) ratchet) =====

CREATE TABLE IF NOT EXISTS "script_stability_counters" (
  "player_id"                          uuid      NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "lieutenant_id"                       uuid      NOT NULL REFERENCES "lieutenant"("lieutenant_id") ON DELETE CASCADE,
  "consecutive_no_deviation_cycles"      integer   NOT NULL DEFAULT 0,
  "tier_target"                            smallint,
  "last_deviation_tick"                      bigint,
  "last_reset_tick"                            bigint,
  PRIMARY KEY ("player_id", "lieutenant_id")
);

--> statement-breakpoint

ALTER TABLE "script_stability_counters"
  ADD CONSTRAINT "script_stability_counters_consecutive_no_deviation_cycles_chk"
  CHECK ("consecutive_no_deviation_cycles" >= 0);

--> statement-breakpoint

GRANT UPDATE ON "script_stability_counters" TO app_rw; -- SELECT/INSERT auto-grantés (0013 ALTER DEFAULT PRIVILEGES)

--> statement-breakpoint

-- ===== player_metric_benchmarks (design §3/§9.1 — per-(player,metric_kind) baseline ledger) =====

CREATE TYPE "metric_kind" AS ENUM (
  'SAFEHOUSE_UTILIZATION',
  'COURIER_DELIVERY_RATE',
  'REVENUE_PER_ROUTE'
);

--> statement-breakpoint

CREATE TYPE "snapshot_source" AS ENUM (
  'INITIAL',
  'AUTO_UPDATE',
  'PLAYER_REANCHOR'
);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "player_metric_benchmarks" (
  "player_id"                uuid              NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "metric_kind"                metric_kind       NOT NULL,
  "baseline_value"               numeric(12,4)     NOT NULL,
  "baseline_snapshot_tick"          bigint            NOT NULL,
  "baseline_source"                   snapshot_source   NOT NULL DEFAULT 'INITIAL',
  "drift_accumulator"                    numeric(6,2)      NOT NULL DEFAULT 0,
  "last_auto_update_tick"                   bigint,
  "created_at_tick"                            bigint            NOT NULL,
  PRIMARY KEY ("player_id", "metric_kind")
);

--> statement-breakpoint

ALTER TABLE "player_metric_benchmarks"
  ADD CONSTRAINT "player_metric_benchmarks_drift_accumulator_chk"
  CHECK ("drift_accumulator" >= 0);

--> statement-breakpoint

GRANT UPDATE ON "player_metric_benchmarks" TO app_rw; -- SELECT/INSERT auto-grantés (0013 ALTER DEFAULT PRIVILEGES)

--> statement-breakpoint

-- ===== player_reanchor_quotas (design §3/§9.4 — one row per player, weekly re-anchor quota) =====

CREATE TABLE IF NOT EXISTS "player_reanchor_quotas" (
  "player_id"                    uuid          NOT NULL PRIMARY KEY REFERENCES "player"("player_id") ON DELETE CASCADE,
  "uses_remaining_this_week"       smallint      NOT NULL DEFAULT 1,
  "max_uses_per_week"                 smallint      NOT NULL DEFAULT 1,
  "week_reset_at"                        timestamptz   NOT NULL,
  "last_executed_tick"                     bigint,
  "horizon_tier_at_upgrade"                  smallint
);

--> statement-breakpoint

ALTER TABLE "player_reanchor_quotas"
  ADD CONSTRAINT "player_reanchor_quotas_uses_remaining_floor_chk"
  CHECK ("uses_remaining_this_week" >= 0);

--> statement-breakpoint

ALTER TABLE "player_reanchor_quotas"
  ADD CONSTRAINT "player_reanchor_quotas_uses_remaining_le_max_chk"
  CHECK ("uses_remaining_this_week" <= "max_uses_per_week");

--> statement-breakpoint

GRANT UPDATE ON "player_reanchor_quotas" TO app_rw; -- SELECT/INSERT auto-grantés (0013 ALTER DEFAULT PRIVILEGES)

--> statement-breakpoint

-- ===== player_progression_state — pressure columns (design §3, divergence #1) =====

ALTER TABLE "player_progression_state"
  ADD COLUMN "pressure_tier" smallint NOT NULL DEFAULT 1;

--> statement-breakpoint

ALTER TABLE "player_progression_state"
  ADD CONSTRAINT "pps_pressure_tier_chk"
  CHECK ("pressure_tier" BETWEEN 1 AND 4);

--> statement-breakpoint

ALTER TABLE "player_progression_state"
  ADD COLUMN "graduation_count_since_last_pressure_unlock" smallint NOT NULL DEFAULT 0;

--> statement-breakpoint

ALTER TABLE "player_progression_state"
  ADD CONSTRAINT "pps_graduation_count_since_last_pressure_unlock_chk"
  CHECK ("graduation_count_since_last_pressure_unlock" >= 0);

--> statement-breakpoint

ALTER TABLE "player_progression_state"
  ADD COLUMN "tier4_observation_until_tick" timestamptz;
