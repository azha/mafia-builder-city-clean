-- D1c B2: precursor_supplier_pressure — per player × supplier pressure side-table (DD-ENT/DD-SP).
-- R9.3: Drizzle schema (precursor_market_state.ts) + ch09 mirror (schema_precursor_market_state.md)
--       backported in the SAME commit.
--
-- precursor_supplier_pressure: observable-only pressure per (player_id × supplier_id).
--   pressure_counter: hidden server-side accumulator (R2.2 — jamais client, comme reputation_risk_counter :127).
--   Player surface: SupplierPressureBucket (FRESH/USED/STRAINED) via SupplierPressureService (B5).
--   PK: composite (player_id, supplier_id).
--   FK: player_id → player(player_id) ON DELETE CASCADE + INDEX (schema_player.md §5.1).
--
-- ⚠️ supplier_id FK NOTE (flagged for reviewer⊥):
--   No production supplier table exists yet. supplier_id is an honest UUID identity column.
--   The supplier entity (SupplierDirectoryEntry) lives in the NestJS domain; no DB supplier table yet.
--   FK binding to a real supplier table is deferred (flagged: no fabricated table created here).

CREATE TABLE IF NOT EXISTS precursor_supplier_pressure (
  player_id           uuid        NOT NULL
    REFERENCES player(player_id) ON DELETE CASCADE,
  supplier_id         uuid        NOT NULL,
  pressure_counter    integer     NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, supplier_id)
);

--> statement-breakpoint

-- INDEX on player_id — FK convention (schema_player.md §5.1 + schema_operational_chain.md:128).
-- Enables efficient lookup of all supplier pressure rows for a given player.
CREATE INDEX "precursor_supplier_pressure_player_id_idx"
  ON "precursor_supplier_pressure" ("player_id");

--> statement-breakpoint

-- Grant UPDATE for pressure accumulation mutations (B5).
GRANT UPDATE ON precursor_supplier_pressure TO app_rw;
