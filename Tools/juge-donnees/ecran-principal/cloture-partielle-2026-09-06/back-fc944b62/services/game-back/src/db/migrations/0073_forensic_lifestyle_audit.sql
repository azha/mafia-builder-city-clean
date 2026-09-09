-- Forensic Signaling C3: lifestyle_audit_state + tail_ramp_stage pgEnum
-- §5.3 Standing-Gap Lifestyle Audit — persistence table (C3 persistence only; mechanic in C16-C18).
--
-- IMPLEMENTS: docs/superpowers/plans/2026-06-19-depth-forensic-signaling-plan.md Task 3 (C3)
--             design §3.4 (lifestyle_audit_state columns)
--             docs/tech/04c_market_reputation_insurance/forensic_signaling_mechanics.md §5.3
--             — Forensic Signaling C3 — 2026-06-19
--
-- Migration: 0073_forensic_lifestyle_audit
-- Enum:      tail_ramp_stage (NEW) — 4 members: none | passive | tailing | subpoena
-- Table:     lifestyle_audit_state (NEW)
--
-- tail_ramp_stage pgEnum:
--   4 closed-domain labels matching TailRampStage TS type in forensic-severity.ts (invariant — same order).
--   Canon :139: "sedan sprite passive → tailing → subpoena".
--   none:     no tail active (default)
--   passive:  tail spawned (consecutive_flag_months ≥ standingGapConsecutiveMonths, C17)
--   tailing:  active follow (1/3 ramp elapsed, C18)
--   subpoena: imminent seizure (2/3 ramp elapsed, C18)
--
-- lifestyle_audit_state: per-lieutenant standing-gap state (§5.3).
--   lieutenant_id:          uuid PK — FK → lieutenant(lieutenant_id) ON DELETE CASCADE.
--   player_id:              uuid NOT NULL FK → player(player_id) ON DELETE CASCADE + INDEX.
--   declared_cut_cents:     bigint NOT NULL DEFAULT 0 — cash on the books (canon :122).
--   visible_standard_index: smallint NOT NULL DEFAULT 0 — housing/transport/dependents tier (:123).
--   consecutive_flag_months: smallint NOT NULL DEFAULT 0 — consecutive months gap > G (:124).
--   last_gap:               real nullable — last computed gap (server-only R2.2; C16 writes it).
--   tail_ramp_stage:        tail_ramp_stage NOT NULL DEFAULT 'none' — ramp stage (canon :139).
--   tail_started_tick:      bigint nullable — tick when tail_ramp_stage → 'passive' (C17).
--   last_month_id:          integer nullable — idempotence guard (OQ-9 DD-MONTHLY-ON-NIGHTLY).
--
-- R9.3: backported to docs/tech/09_data_model/schema_forensic.md same-commit.
-- R2.2: last_gap, tail_ramp_stage (raw), tail_started_tick = server-only (never projected client).
-- OQ-9: last_month_id idempotence — runMonthlyTick skips if last_month_id == currentMonthId.
-- Zero-regression: no existing table or column is modified.
-- Anti-fabrication: no scalar invented silently. No Math.random. No PROPOSED DEFAULT here
--   (all defaults are structural: 0 for counts, 'none' for enum, null for nullable scalars).

CREATE TYPE "tail_ramp_stage" AS ENUM ('none', 'passive', 'tailing', 'subpoena');

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "lifestyle_audit_state" (
  "lieutenant_id"           uuid      NOT NULL PRIMARY KEY
    REFERENCES "lieutenant"("lieutenant_id") ON DELETE CASCADE,
  "player_id"               uuid      NOT NULL
    REFERENCES "player"("player_id") ON DELETE CASCADE,
  "declared_cut_cents"      bigint    NOT NULL DEFAULT 0,
  "visible_standard_index"  smallint  NOT NULL DEFAULT 0,
  "consecutive_flag_months" smallint  NOT NULL DEFAULT 0,
  "last_gap"                real,
  "tail_ramp_stage"         tail_ramp_stage NOT NULL DEFAULT 'none',
  "tail_started_tick"       bigint,
  "last_month_id"           integer
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "lifestyle_audit_state_player_idx"
  ON "lifestyle_audit_state" ("player_id");

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "lifestyle_audit_state" TO app_rw;
