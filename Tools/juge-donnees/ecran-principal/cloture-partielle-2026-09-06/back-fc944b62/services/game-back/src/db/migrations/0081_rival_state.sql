-- Migration: 0081_rival_state
-- 04b-A C1 — DD-RIVAL-SEED schema foundation
--
-- REPLACES the ch09 placeholder rival_state (migration 0005_city_state.sql §Table 7).
-- The placeholder had 3 columns (player_id, rival_id, posture_raw_pressure_float) and used
-- the `rival_roster` enum (same 4 values as the new `rival_key` enum).
--
-- This migration:
--   1. DROPs the placeholder rival_state table.
--   2. DROPs the now-unused rival_roster enum.
--   3. Creates 4 new enum types:
--        rival_key            (4 members — replaces rival_roster, same values)
--        rival_regime         (6 members — the OODA regime)
--        intel_mode           (2 members — pull | push)
--        erosion_register_id  (5 members — the 5 erosion axes)
--   4. Creates the full rival_state table (14 columns + composite PK).
--   5. Re-GRANTs SELECT, INSERT, UPDATE, DELETE ON rival_state TO app_rw.
--
-- Enums:
--   rival_key (canon: rival_ai_mechanics.md §9.5): coil | tarcum | iron_throat | saltline
--   rival_regime (canon: :64): expansionary | consolidating | bleeding | defensive | retrench | withdrawal
--   intel_mode (canon: :336): pull | push
--   erosion_register_id (canon: combat_mechanics.md :194-198): muscle | finance | intel | infrastructure | leadership
--
-- rival_state columns:
--   player_id:              uuid NOT NULL FK player ON DELETE CASCADE
--   rival_key:              rival_key NOT NULL
--   regime:                 rival_regime NOT NULL
--   regime_pressure:        real NOT NULL DEFAULT 0
--   flip_threshold:         real NOT NULL
--   observe_interval_ticks: smallint NOT NULL
--   orient_latency_ticks:   smallint NOT NULL
--   commit_delay_ticks:     smallint NOT NULL
--   saturation_pressure:    real NOT NULL DEFAULT 0
--   intel_mode:             intel_mode NOT NULL
--   mode_stability_ticks:   integer NOT NULL DEFAULT 0
--   route_integrity:        real nullable (Coil Distributed Hold — C5 seed, NULL for others)
--   dominance_rank:         smallint nullable (OQ-A8: reserved by A, written by B)
--   vulnerable_axis:        erosion_register_id nullable (OQ-A8: reserved by A, written by B)
--   PK composite: (player_id, rival_key)
--
-- P6: all columns except player_id/rival_key are SERVER-ONLY (never forwarded to client).
-- R9.3: backported to docs/tech/09_data_model/schema_conflict_rival.md same-commit.
-- R2.2: regime/regime_pressure/intel_mode/saturation_pressure/dominance_rank/vulnerable_axis
--       / tempo intervals / route_integrity = server-only.
-- Anti-fabrication: all defaults are structural. No Math.random().
-- Zero-regression: the old 3-column placeholder had no data (seed via RivalSeedService at runtime).

DROP TABLE IF EXISTS "rival_state";

--> statement-breakpoint

DROP TYPE IF EXISTS "rival_roster";

--> statement-breakpoint

CREATE TYPE "rival_key" AS ENUM ('coil', 'tarcum', 'iron_throat', 'saltline');

--> statement-breakpoint

CREATE TYPE "rival_regime" AS ENUM ('expansionary', 'consolidating', 'bleeding', 'defensive', 'retrench', 'withdrawal');

--> statement-breakpoint

CREATE TYPE "intel_mode" AS ENUM ('pull', 'push');

--> statement-breakpoint

CREATE TYPE "erosion_register_id" AS ENUM ('muscle', 'finance', 'intel', 'infrastructure', 'leadership');

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "rival_state" (
  "player_id"              uuid    NOT NULL
    REFERENCES "player"("player_id") ON DELETE CASCADE,
  "rival_key"              rival_key NOT NULL,
  "regime"                 rival_regime NOT NULL,
  "regime_pressure"        real    NOT NULL DEFAULT 0,
  "flip_threshold"         real    NOT NULL,
  "observe_interval_ticks" smallint NOT NULL,
  "orient_latency_ticks"   smallint NOT NULL,
  "commit_delay_ticks"     smallint NOT NULL,
  "saturation_pressure"    real    NOT NULL DEFAULT 0,
  "intel_mode"             intel_mode NOT NULL,
  "mode_stability_ticks"   integer NOT NULL DEFAULT 0,
  "route_integrity"        real,
  "dominance_rank"         smallint,
  "vulnerable_axis"        erosion_register_id,
  PRIMARY KEY ("player_id", "rival_key")
);

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "rival_state" TO app_rw;
