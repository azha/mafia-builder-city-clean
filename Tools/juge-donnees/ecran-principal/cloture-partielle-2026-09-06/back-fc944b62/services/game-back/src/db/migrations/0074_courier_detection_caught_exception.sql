-- System 9 Detection & Consequence C1: courier.sessions_active + caught_exception_status + caught_exception
-- §9 Distribution Depth — persistence: reputation score column + caught-exception side-table + enum.
--
-- IMPLEMENTS: docs/superpowers/plans/2026-06-21-system9-distribution-depth-9a-plan.md Task 1 (C1)
--             design §6.1 courier.sessions_active (OQ-13)
--             design §6.2 caught_exception table (OQ-21 — side-table, NOT columns on courier_shift)
--             docs/tech/04a_operational_systems/distribution_couriers_runners.md §9
--             — System 9 C1 — 2026-06-21
--
-- Migration: 0074_courier_detection_caught_exception
-- Alter:     courier.sessions_active (NEW column, integer NOT NULL DEFAULT 0)
-- Enum:      caught_exception_status (NEW) — 4 members: pending | lawyered | abandoned | silenced
-- Table:     caught_exception (NEW)
--
-- courier.sessions_active:
--   Reputation score for the courier (OQ-13). Incremented per dispatch (C4).
--   Derived to CourierReputationBucket on read (no stored bucket column).
--   BO-only (R2.2 — never exposed raw to client).
--   Zero-regression: all existing courier rows get sessions_active=0 (DEFAULT 0).
--
-- caught_exception_status pgEnum:
--   4 lifecycle states matching CaughtExceptionStatus TS type in operational_chain.ts (invariant — same order).
--   pending:   created on catch (default)
--   lawyered:  resolved via LAWYER_UP (C9)
--   abandoned: resolved via ABANDON or auto-sweep on window expiry (C9)
--   silenced:  resolved via VIOLENT_SILENCE + emitHeatInjection COURIER_SILENCE/MEDIUM (C10)
--   NOTE: 'caught' status for courier/shift REUSES existing courierState/shiftStatus — NOT duplicated here.
--
-- caught_exception table (OQ-21):
--   Side-table keyed on shift_id (NOT columns on courier_shift — avoids bloating the MINUTE/9 hot read).
--   exception_id:             uuid PK defaultRandom.
--   player_id:                uuid FK player CASCADE + INDEX (player_id, status).
--   shift_id:                 uuid FK courier_shift CASCADE + INDEX (shift_id).
--   courier_id:               uuid FK courier CASCADE.
--   route_id:                 uuid FK route CASCADE.
--   caught_at_tick:           bigint NOT NULL — tick of catch (BO-only; bigint string on wire).
--   resolution_deadline_tick: bigint NOT NULL — caught_at_tick + window (OQ-14 default 1440 ticks).
--   reputation_at_catch:      smallint NOT NULL DEFAULT 0 — sessions_active snapshot (leak model C10).
--   status:                   caught_exception_status NOT NULL DEFAULT 'pending'.
--   resolved_at_tick:         bigint nullable — stamped at resolution (C9). null while pending.
--   leak_magnitude:           real nullable — BO-only (R2.2); null while pending; set at resolution (C10).
--
-- R9.3: backported to docs/tech/09_data_model/schema_operational_chain.md same-commit.
-- R2.2: sessions_active, caught_at_tick (raw), leak_magnitude = server-only (never projected raw client).
-- OQ-21: caught_exception is a TABLE (resolution lifecycle = distinct entity, not shift columns).
-- OQ-13: sessions_active = integer counter (bucket derived on read, no stored bucket column).
-- Zero-regression: no existing table or column is modified destructively.
-- Anti-fabrication: no scalar invented silently. No Math.random. No PROPOSED DEFAULT here
--   (all defaults are structural: 0 for counts, 'pending' for enum, null for nullable scalars).

ALTER TABLE "courier" ADD COLUMN "sessions_active" integer NOT NULL DEFAULT 0;

--> statement-breakpoint

CREATE TYPE "caught_exception_status" AS ENUM ('pending', 'lawyered', 'abandoned', 'silenced');

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "caught_exception" (
  "exception_id"             uuid      NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"                uuid      NOT NULL
    REFERENCES "player"("player_id") ON DELETE CASCADE,
  "shift_id"                 uuid      NOT NULL
    REFERENCES "courier_shift"("shift_id") ON DELETE CASCADE,
  "courier_id"               uuid      NOT NULL
    REFERENCES "courier"("courier_id") ON DELETE CASCADE,
  "route_id"                 uuid      NOT NULL
    REFERENCES "route"("route_id") ON DELETE CASCADE,
  "caught_at_tick"           bigint    NOT NULL,
  "resolution_deadline_tick" bigint    NOT NULL,
  "reputation_at_catch"      smallint  NOT NULL DEFAULT 0,
  "status"                   caught_exception_status NOT NULL DEFAULT 'pending',
  "resolved_at_tick"         bigint,
  "leak_magnitude"           real
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "caught_exception_player_status_idx"
  ON "caught_exception" ("player_id", "status");

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "caught_exception_shift_idx"
  ON "caught_exception" ("shift_id");

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "caught_exception" TO app_rw;
