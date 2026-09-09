-- Insurance C1: almanac_entry — per underwriter × player anti-fraud almanac.
-- R9.3: Drizzle schema (insurance.ts) + ch09 mirror (schema_insurance.md) backported same-commit.
--
-- almanac_entry: per-underwriter entry in the almanac for a given player.
--   underwriter_id: uuid of the NPC underwriter (no DB FK — underwriter not a first-class entity yet).
--   status: almanac_status (CLEAN|POISONED, default CLEAN).
--   poisoned_until_tick: nullable bigint — tick at which POISONED status expires (null when CLEAN).
--     DD-FRAUD-POISON: horizon = current_tick + almanac_persistence_days_post_lapse × ticks_per_day.
--     Max: 365 days (the range max of underwriting_almanac_persistence_days_post_lapse canon :80).
--   PK: id (uuid, gen_random_uuid()).
--   FK: player_id → player(player_id) ON DELETE CASCADE + INDEX (player-scoped).
--
-- DD-ALMANAC-NO-FINGERPRINT: NO baseline_fingerprint column — §4.2 Coverage-Induced Drift (Tranche C).
--   Canon :90 "baseline_fingerprint (4 B)" belongs to §4.2 which is OUT of Tranche B scope (DD0).
--   Tranche C will extend this table additively with baseline_fingerprint + behaviour features.
--   This is the documented Tranche B/C seam — explicitly NOT an omission.
-- R2.2: poisoned_until_tick is server-only. Player sees CLEAN/POISONED status only (C11 projection).
-- Zero-regression (§0.2): does not modify any existing table or column.
-- Depends on: player table (all prior migrations). New enum: almanac_status.

CREATE TYPE "almanac_status" AS ENUM (
  'CLEAN',
  'POISONED'
);

--> statement-breakpoint

CREATE TABLE almanac_entry (
  id                  uuid           NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  underwriter_id      uuid           NOT NULL,
  player_id           uuid           NOT NULL
    REFERENCES player(player_id) ON DELETE CASCADE,
  status              almanac_status NOT NULL DEFAULT 'CLEAN',
  poisoned_until_tick bigint,
  created_at          timestamptz    NOT NULL DEFAULT now(),
  updated_at          timestamptz    NOT NULL DEFAULT now()
);

--> statement-breakpoint

CREATE INDEX almanac_entry_player_idx
  ON almanac_entry (player_id);

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE ON almanac_entry TO app_rw;
