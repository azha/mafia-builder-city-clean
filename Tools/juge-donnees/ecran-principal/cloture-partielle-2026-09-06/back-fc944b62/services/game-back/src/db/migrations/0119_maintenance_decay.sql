-- 0119_maintenance_decay.sql — schema_operational_chain.md §7.21 (maintenance/decay/equipment-failure
-- surface, 04f-A C1). PALIMPSEST §3.2 (forward-only).
-- IMPLEMENTS: docs/superpowers/plans/2026-07-10-04f-A-maintenance-plan.md C1
--             Design: docs/superpowers/specs/2026-07-10-04f-A-maintenance-design.md §3 (data model) + D1/D3
--             Decisions: docs/superpowers/specs/2026-07-10-04f-A-maintenance-decisions.md §1.1/§1.3/DD-M1
-- R9.3: this matches src/db/schema/operational_chain.ts byte-for-byte. ONLY ADDS — no existing table is
--       redefined: 3 columns on building_operational_state, 2 NEW enums (CREATE TYPE), 1 ADDITIVE enum value
--       (ALTER TYPE ... ADD VALUE on the EXISTING building_structural_state), 1 new table
--       (equipment_failure_log). Every Phase-1/2/2b/2c/3/4 table + every prior 04a-04e table is otherwise
--       UNCHANGED (git diff = empty except the additions). FK building_id → buildings (0005).
--       FK player_id → player (0001).
--
-- DD-M1 (decisions §2.1) — PG16 ADD VALUE note: `ALTER TYPE ... ADD VALUE` is transaction-legal on PG16; the
-- only restriction is that the NEW value must not be USED (DML / default / comparison) in the SAME
-- transaction as the ADD. This migration only DECLARES 'failed' (no row anywhere in this file is inserted
-- with structural_state='failed', no default references it, no comparison targets it) — first use is
-- runtime (C4). Exact precedent: migration 0022 (`ALTER TYPE "precursor_type" ADD VALUE IF NOT EXISTS
-- 'glass_lily'` mixed with CREATE TABLE statements in the SAME file/transaction). IF NOT EXISTS = idempotent
-- (re-run at boot inoffensive).

-- ===== building_lapse_phase (NEW enum, §7.21.3) — D1 cached transition-detection projection =====
-- 4-member closed domain (within_window → soft → hard → critical). Consumption sites DERIVE the phase LIVE
-- from days-overdue (D1) — this column is never the penalty input, only a cache the NIGHTLY tick maintains
-- for transition-event detection + BO aggregate queries (no stale-penalty hazard).
CREATE TYPE "building_lapse_phase" AS ENUM ('within_window', 'soft', 'hard', 'critical');
--> statement-breakpoint

-- ===== repair_mode (NEW enum, §7.21.4) — D4 the 4 equipment-failure repair options =====
CREATE TYPE "repair_mode" AS ENUM ('immediate', 'slow', 'defer', 'demolish_replace');
--> statement-breakpoint

-- ===== building_structural_state (EXISTING enum, §7.4) — 1 membre ADDITIF (§7.21.5) =====
-- D3: equipment failure = additive 'failed' value (NOT a re-use of 'damaged' — decisions §1.3: reusing
-- 'damaged' would let a failure repair bypass the 4-option card through the raid RepairService's
-- 'damaged'-only pricing). Every positive `structural_state = 'operational'` gate (production/grow/selling)
-- halts a 'failed' building automatically — ZERO edits to those gates (they test equality with
-- 'operational', not inequality with 'damaged'). The raid RepairService's `!== 'damaged'` guard REJECTS
-- 'failed' (409) — byte-untouched isolation, proven by C4's E2E.
ALTER TYPE "building_structural_state" ADD VALUE IF NOT EXISTS 'failed';
--> statement-breakpoint

-- ===== building_operational_state (existant, Table 1) — 3 colonnes ADDITIVES (§7.21.2) =====
-- last_maintained_at_game_day : D1 anchor (nullable — NULL until OPERATIONAL; set at convert-complete by the
--   ConversionSetupService MINUTE/6 batch flip, C1, AND at scheduled-maintenance completion, C3). Game-day =
--   floor(game_minute / clock.in_game_day_length_minutes) — the SAME convention the effect engine
--   (applied_at_game_day) and the political calendar already use (deriveGameDay,
--   political-trigger-evaluators.ts). No CHECK (mirrors repair_completes_at_tick, mig 0018 — a nullable
--   bigint, no constraint precedent on this table's tick/day columns).
-- maintenance_completes_at_day : D13 — armed while a scheduled-maintenance 1-game-day job runs (C3); the
--   NIGHTLY tick completes it → resets last_maintained_at_game_day + clears this column. Building keeps
--   OPERATING meanwhile (scheduling ≠ halt, unlike equipment failure).
-- lapse_phase : NOT NULL DEFAULT 'within_window' → every existing + future row starts within-window
--   (retro-compatible; the mig backfill below re-anchors the DERIVATION input, not this cache — the NIGHTLY
--   tick, C2, computes the real value on its first run for any overdue building).
ALTER TABLE "building_operational_state"
  ADD COLUMN "last_maintained_at_game_day"   bigint,
  ADD COLUMN "maintenance_completes_at_day"  bigint,
  ADD COLUMN "lapse_phase"                   building_lapse_phase NOT NULL DEFAULT 'within_window';
--> statement-breakpoint

-- ===== Table 21 : equipment_failure_log (NEW table — BO timeline + repair audit, §7.21.6) =====
-- 1 row par équipement-failure event. Live state (is this building CURRENTLY failed) lives on
-- building_operational_state.structural_state='failed' (D3) — this table is the event/audit trail (DD-M3).
-- roll_detail = the D11 seeded-roll trace (baseline/factor/mult/seed) — BO-only diagnostics, NEVER
-- player-projected (R2.2).
CREATE TABLE "equipment_failure_log" (
  "failure_id"                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "building_id"                uuid        NOT NULL REFERENCES "buildings"("building_id") ON DELETE CASCADE,
  "player_id"                  uuid        NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "operational_type"           building_operational_type NOT NULL,
  "failed_at_game_day"         bigint      NOT NULL,
  "failed_at"                  timestamptz NOT NULL,
  "lapse_phase_at_failure"     building_lapse_phase NOT NULL,
  "roll_detail"                jsonb       NOT NULL DEFAULT '{}'::jsonb,
  "repair_mode"                repair_mode,
  "repair_cost_cents"          bigint,
  "repair_completes_at_tick"   bigint,
  "resolved_at"                timestamptz
);
--> statement-breakpoint
-- INDEX (player_id, failed_at DESC) : the BO EquipmentFailureTimeline hot path (most-recent-first per player).
CREATE INDEX "equipment_failure_log_player_failed_at_idx" ON "equipment_failure_log" ("player_id", "failed_at" DESC);
--> statement-breakpoint
-- INDEX (building_id) : per-building failure history lookup.
CREATE INDEX "equipment_failure_log_building_idx" ON "equipment_failure_log" ("building_id");
--> statement-breakpoint

-- ===== Runtime grants (app_rw least-privilege role — 0013_app_role.sql) =====
-- (a) building_operational_state already has GRANT UPDATE, DELETE TO app_rw (0017 §5). A table-level GRANT
--     UPDATE (no column list) covers columns ADDED later in PostgreSQL — the 3 new columns
--     (last_maintained_at_game_day, maintenance_completes_at_day, lapse_phase) are mutable by app_rw with NO
--     re-grant (calque 0022 lab_tier / 0018 repair_completes_at_tick).
-- (b) equipment_failure_log is a NEW table created by `mafia`: 0013's ALTER DEFAULT PRIVILEGES auto-grants
--     SELECT+INSERT. It is MUTABLE ONCE per row (repair_mode/repair_cost_cents/repair_completes_at_tick/
--     resolved_at stamped once at resolution) but NEVER deleted (a permanent BO audit trail, not a
--     revert/delete lifecycle) → explicit GRANT UPDATE only, NO DELETE grant (calque ash_appointment /
--     batch_purity, mig 0022 §7.10.7 — the single-resolve-then-frozen-row precedent, DISTINCT from
--     live_ops_event_active's GRANT-all-4 revert-by-DELETE lifecycle, migs 0114/0117).
GRANT UPDATE ON "equipment_failure_log" TO app_rw;
--> statement-breakpoint

-- ===== D1 anchor backfill (decisions §1.1 — fresh window, NO retroactive lapse on deploy) =====
-- Every PRE-EXISTING building_operational_state row (landed before this migration) gets its anchor set to
-- its OWNER's CURRENT game-day — never a hardcoded 0, never left NULL for a row that already has a clock.
-- Deploying 04f-A must not instantly throw every long-lived fleet into critical (retroactive punishment for
-- a mechanic that didn't exist); a fresh window is the honest cold-start (plan §Zero behavioral regression).
-- Game-day = floor(game_minute / 1440) — 1440 = clock.in_game_day_length_minutes's CODE DEFAULT
-- (citysim-tunables.ts, T.clock.in_game_day_length_minutes). A migration is one-time DDL/DML applied at
-- deploy; it intentionally reads the CODE default rather than probing the LIVE-OPS `tunable_overrides` table
-- (created EMPTY by mig 0033, a runtime hot-reload layer, not a migration-time concern) — the same posture
-- every other backfill in this codebase takes (no migration anywhere resolves a DB-override tunable).
-- `WHERE bos.last_maintained_at_game_day IS NULL` makes this idempotent-safe (a defensive guard; the
-- MigrationRunner's ledger already prevents a literal re-run, but the guard keeps the statement correct if
-- ever replayed against a row that already has an anchor — e.g. a C1+ convert-complete write racing this
-- migration on a rolling deploy). A building_operational_state row with NO matching city_sim_clock row
-- (a player who never started a save) is left NULL by this JOIN — harmless: such a player cannot have an
-- OPERATIONAL building yet, so no consumption site will read a NULL anchor as "operational and overdue".
UPDATE "building_operational_state" AS bos
SET "last_maintained_at_game_day" = floor(csc.game_minute::numeric / 1440)::bigint
FROM "city_sim_clock" AS csc
WHERE csc.player_id = bos.player_id
  AND bos.last_maintained_at_game_day IS NULL;
