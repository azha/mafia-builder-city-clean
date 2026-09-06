-- Forensic Signaling C1: ledger_entry_ring + forensic_soft_flag_ring tables
-- §5.1 Leading-Digit / Benford — 5.1 persistence tables for the Benford χ² audit mechanic.
--
-- IMPLEMENTS: docs/superpowers/plans/2026-06-19-depth-forensic-signaling-plan.md Task 1 (C1)
--             design §3.1 (ledger_entry_ring) + §3.5 (forensic_soft_flag_ring)
--             docs/tech/04c_market_reputation_insurance/forensic_signaling_mechanics.md §5.1
--             — Forensic Signaling C1 — 2026-06-19
--
-- Migration: 0071_forensic_ledger_rings
-- Tables:    ledger_entry_ring (NEW) + forensic_soft_flag_ring (NEW)
--
-- ledger_entry_ring: per-front 5.1 Benford ring buffer.
--   front_id:             uuid PK — the front building's uuid.
--   player_id:            FK → player(player_id) ON DELETE CASCADE + INDEX (player-scoped).
--   ring:                 jsonb NOT NULL default '[]' — FIFO of first-digits (1..9, OQ-10).
--   ring_head:            integer NOT NULL default 0 — next write position.
--   last_audit_tick:      bigint nullable — WEEKLY/9 idempotence guard (OQ-7).
--   last_chi_square:      real nullable — server-only χ² scalar (R2.2).
--   soft_flag_count:      smallint NOT NULL default 0 — cumulative soft-flags on this front.
--   front_dark_until_tick: bigint nullable — hard-audit blackout horizon (C9 canon :54).
--
-- forensic_soft_flag_ring: DD-SOFTFLAG-DUAL 60-day windowed ring (OQ-4).
--   front_id:    uuid PK.
--   player_id:   FK → player(player_id) ON DELETE CASCADE + INDEX (player-scoped).
--   flag_ticks:  jsonb NOT NULL default '[]' — pruned ring of game-ticks per soft-flag.
--
-- R9.3: backported to docs/tech/09_data_model/schema_forensic.md same-commit.
-- OQ-10: ring stores first-digit (1..9), not raw float32 amount.
-- R2.2: last_chi_square + last_audit_tick + front_dark_until_tick = server-only.
-- Zero-regression: no existing table or column is modified.

CREATE TABLE IF NOT EXISTS "ledger_entry_ring" (
  "front_id"              uuid        NOT NULL PRIMARY KEY,
  "player_id"             uuid        NOT NULL
    REFERENCES "player"("player_id") ON DELETE CASCADE,
  "ring"                  jsonb       NOT NULL DEFAULT '[]',
  "ring_head"             integer     NOT NULL DEFAULT 0,
  "last_audit_tick"       bigint,
  "last_chi_square"       real,
  "soft_flag_count"       smallint    NOT NULL DEFAULT 0,
  "front_dark_until_tick" bigint
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "ledger_entry_ring_player_idx"
  ON "ledger_entry_ring" ("player_id");

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "ledger_entry_ring" TO app_rw;

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "forensic_soft_flag_ring" (
  "front_id"   uuid     NOT NULL PRIMARY KEY,
  "player_id"  uuid     NOT NULL
    REFERENCES "player"("player_id") ON DELETE CASCADE,
  "flag_ticks" jsonb    NOT NULL DEFAULT '[]'
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "forensic_soft_flag_ring_player_idx"
  ON "forensic_soft_flag_ring" ("player_id");

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "forensic_soft_flag_ring" TO app_rw;
