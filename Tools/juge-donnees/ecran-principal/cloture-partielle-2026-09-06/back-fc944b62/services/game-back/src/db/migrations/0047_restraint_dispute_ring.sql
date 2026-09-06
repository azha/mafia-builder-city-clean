-- D2 R1: restraint_dispute_ring — per-counterparty dispute ring (§3.2 Restraint Index).
-- R9.3: Drizzle schema (reputation_state.ts) + ch09 mirror (schema_reputation_state.md)
--       backported in the SAME commit.
--
-- restraint_dispute_ring: ring 6 slots of past dispute outcomes per (player, counterparty).
--   Canon :83-86: ring 6 slots (claimable_amount 2B + claimed_amount 2B each = 24 B total).
--   DD-BYTES: realised as JSONB ring buffer (dispute_slots) + integer head pointer. No bit-packing.
--   Derived: restraint_ratio = Σ(claimable_i − claimed_i) / Σ claimable_i (:85) — computed in service.
--   PK composite: (player_id, counterparty_id).
--   FK: player_id → player(player_id) ON DELETE CASCADE.
--   counterparty_id: uuid (no FK — counterparty entity is a deferred concept).
--   R2.2: dispute_slots / restraint_ratio are server-side only — player sees marginalia (:95).

CREATE TABLE IF NOT EXISTS restraint_dispute_ring (
  player_id       uuid        NOT NULL
    REFERENCES player(player_id) ON DELETE CASCADE,
  counterparty_id uuid        NOT NULL,
  dispute_slots   jsonb       NOT NULL DEFAULT '[]',
  ring_head       smallint    NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, counterparty_id)
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS restraint_dispute_ring_player_idx
  ON restraint_dispute_ring (player_id);

--> statement-breakpoint

GRANT UPDATE ON restraint_dispute_ring TO app_rw;
