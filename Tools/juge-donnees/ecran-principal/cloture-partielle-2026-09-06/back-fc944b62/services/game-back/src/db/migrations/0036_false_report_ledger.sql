-- 0036_false_report_ledger.sql — schema_city_state.md §FalseReportLedger (TD-012 P1 — lot-5 L5-T6l).
--   PALIMPSEST §3.2 (forward-only).
-- IMPLEMENTS: TD-012 — FalseReportLedger + FILE false-report action + flood backlash (system_6 / law_mis).
--             Canon: docs/tech/02_fictional_world/law_mis.md §Data model — MIS §Entité FalseReportLedger
--             + §NestJS — backend jeu (flood detection → backlash event).
--             R9.3: matches src/db/schema/false_report_ledger.ts byte-for-byte. Backported to
--             projects/mafia_city_game/gdd/09_data_model.md §City state in the SAME commit.
-- ONLY ADDS — no existing table/column/enum is redefined or dropped: 2 NEW tables
--   (false_report_ledger + false_report_ledger_summary). The existing inspection_queues (0005) and
--   all other tables are UNCHANGED (git diff = empty except this migration).
--
-- TABLE 1: false_report_ledger — one row per FalseReportEntry (law_mis §Entité FalseReportLedger).
--   PK: report_id (uuid — the entry identity; per-player uniqueness via FK).
--   FK: player_id → "player" ON DELETE CASCADE (the ledger is server-truth only — it dies with the player).
--   COLUMNS (verbatim law_mis §Entité FalseReportEntry):
--     target_building_id : building_id targeted by the report (integer — building tile id day-1).
--     entry_type         : FALSE_REPORT or GENUINE_REPORT (closed text domain; CHECK constraint enforces it).
--     submitted_at       : wall-clock timestamp when the player filed the report (NOT NULL).
--     verified_false_at  : set when the system confirms the report was false (nullable — null = pending).
--     source_confirmed   : bool; true once the system has verified the source (set async, default false).
--   INDEX: (player_id, submitted_at) — the flood detection window reads all entries for a player ordered
--     by submitted_at (the 30-day ratio calculation; secondary index prevents a sequential scan per FILE).
--
-- TABLE 2: false_report_ledger_summary — one row per player; the RUNTIME backlash state (mutable).
--   PK: player_id (1-1 with player; the ledger summary is a 1-1 CHILD of player like city_sim_clock).
--   COLUMNS:
--     backlash_penalty_active : true when the flood_backlash_threshold is exceeded; cleared once the penalty
--       window expires (future decay logic — set here, cleared by the service on day-tick or new genuine report).
--     backlash_remaining_count : how many more reports remain suppressed in the current backlash window
--       (0 when penalty is inactive; decremented on each suppressed FILE).
--     window_false_count   : rolling 30-day false-report count (cache; the ratio check increments this).
--     window_genuine_count : rolling 30-day genuine-report count (cache).
--     updated_at : last mutation timestamp.
--
-- GRANT: app_rw needs UPDATE + DELETE on both NEW tables — UPDATE for the FILE write-path (insert row +
--   bump summary), DELETE for the GDPR/player cleanup (the CASCADE from "player" covers the normal path,
--   but an explicit DELETE is granted for completeness). SELECT + INSERT come from ALTER DEFAULT PRIVILEGES
--   FOR ROLE mafia IN SCHEMA "public" GRANT SELECT, INSERT ON TABLES TO app_rw (0013 lines 108-109 —
--   see 0031 comment [DRIFT M-ch09-DATA-MODEL-R9-3-2] for the corrected mechanism attribution).

-- ===== Table 1 : false_report_ledger =====
CREATE TABLE "false_report_ledger" (
  "report_id"          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"          uuid         NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "target_building_id" integer      NOT NULL,
  "entry_type"         text         NOT NULL,
  "submitted_at"       timestamptz  NOT NULL DEFAULT now(),
  "verified_false_at"  timestamptz,
  "source_confirmed"   boolean      NOT NULL DEFAULT false,
  "created_at"         timestamptz  NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "false_report_ledger"
  ADD CONSTRAINT "frl_entry_type_chk" CHECK (entry_type IN ('FALSE_REPORT', 'GENUINE_REPORT'));
--> statement-breakpoint
CREATE INDEX "frl_player_submitted_idx" ON "false_report_ledger" ("player_id", "submitted_at");
--> statement-breakpoint
GRANT UPDATE, DELETE ON "false_report_ledger" TO app_rw;

-- ===== Table 2 : false_report_ledger_summary =====
CREATE TABLE "false_report_ledger_summary" (
  "player_id"               uuid     PRIMARY KEY REFERENCES "player"("player_id") ON DELETE CASCADE,
  "backlash_penalty_active" boolean  NOT NULL DEFAULT false,
  "backlash_remaining_count" integer NOT NULL DEFAULT 0,
  "window_false_count"      integer  NOT NULL DEFAULT 0,
  "window_genuine_count"    integer  NOT NULL DEFAULT 0,
  "updated_at"              timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "false_report_ledger_summary"
  ADD CONSTRAINT "frls_remaining_chk" CHECK (backlash_remaining_count >= 0);
--> statement-breakpoint
GRANT UPDATE, DELETE ON "false_report_ledger_summary" TO app_rw;
