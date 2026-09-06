-- D2 R1: lek_memory_cell_state — SIBLING TABLE per (player_id, tile_id) (§3.3 Lek Memory).
-- R9.3: Drizzle schema (reputation_state.ts) + ch09 mirror (schema_reputation_state.md)
--       backported in the SAME commit.
--
-- lek_memory_cell_state: per-cell position-memory state for the Lek Memory mechanic.
--   Canon :113-119: 24 B per sellable cell:
--     trailing_operator_ids   8 B — last 4 operators FIFO (uuid array, JSONB).
--     trailing_fairness_sigs  2 B — 4 × 4-bit nibble (DD-BYTES: JSONB array of smallint 0-15, no bit-packing).
--     last_active_tick        4 B — integer.
--     lambda_weight           4 B — inheritance weight ∈ [0,1] (real).
--     decay_state             4 B — decay accumulator (real).
--
--   DD-LEK-LOC: SIBLING TABLE — NOT columns on deal_leks.
--     deal_leks is the hot sparse deal-flow table (player_id, tile_id, lek_score, controller_org_id,
--     deals_this_week, contest_pressure). Lek Memory is a distinct concern with its own lifecycle.
--     A sibling table keeps R9.3 additive: deal_leks is byte-untouched.
--   PK composite: (player_id, tile_id).
--   tile_id: integer mirroring deal_leks.tile_id (REUSE concept — no FK to deal_leks declared).
--   FK: player_id → player(player_id) ON DELETE CASCADE + INDEX.
--   R2.2: lambda_weight / decay_state / trailing_operator_ids are server-side only.
--         Player surface: footprint mark + textual tag (:131). Never λ_now or position_memory_aggregate.

CREATE TABLE IF NOT EXISTS lek_memory_cell_state (
  player_id                    uuid        NOT NULL
    REFERENCES player(player_id) ON DELETE CASCADE,
  tile_id                      integer     NOT NULL,
  trailing_operator_ids        jsonb       NOT NULL DEFAULT '[]',
  trailing_fairness_signatures jsonb       NOT NULL DEFAULT '[]',
  last_active_tick             integer     NOT NULL DEFAULT 0,
  lambda_weight                real        NOT NULL DEFAULT 0,
  decay_state                  real        NOT NULL DEFAULT 0,
  created_at                   timestamptz NOT NULL DEFAULT now(),
  updated_at                   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, tile_id)
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS lek_memory_cell_state_player_idx
  ON lek_memory_cell_state (player_id);

--> statement-breakpoint

GRANT UPDATE ON lek_memory_cell_state TO app_rw;
