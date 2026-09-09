-- Migration: 0076_corridor_debt
-- Table: corridor_debt (NEW) — DD-DEBT-SSOT §4.2 (System 9b C8)
--
-- Single source-of-truth per-player per-block corridor debt accumulator.
-- Accrual: each route dispatch adds corridorDebtAccrualPerUse (default 1.0) per traversed block.
-- Decay: a nightly game-time tick subtracts corridorDebtDecayPerTick (default 0.05), floor 0.
-- block_id is a soft-ref to blocks.id (NOT a FK — matches threnny_edges pattern).
-- R9.3: backported to docs/tech/09_data_model/schema_operational_chain.md same-commit.
-- DD-DEBT-SSOT (D3): route has NO debt column. Saturation derived live from this table (C9).
-- OQ-DB3: NO write-back into patrol_heat/suspicion_map (read-only w.r.t. those signals).
-- Zero-regression: no existing rows → debt term 0 → A* paths byte-identical to C7 baseline.

CREATE TABLE IF NOT EXISTS "corridor_debt" (
  "player_id" uuid NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "block_id" integer NOT NULL,
  "debt_magnitude" real NOT NULL DEFAULT 0,
  "last_updated_tick" bigint,
  CONSTRAINT "corridor_debt_player_id_block_id_pk" PRIMARY KEY ("player_id", "block_id")
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "corridor_debt_player_idx" ON "corridor_debt" ("player_id");

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "corridor_debt" TO app_rw;
