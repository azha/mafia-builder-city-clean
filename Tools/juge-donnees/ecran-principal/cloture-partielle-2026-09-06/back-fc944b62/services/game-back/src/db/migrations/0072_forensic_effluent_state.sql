-- Forensic Signaling C2: workshop_stoichiometry_state + recipe_stoichiometry_table + block_effluent_register
-- §5.2 Effluent Stoichiometry — persistence tables + designer seed data.
--
-- IMPLEMENTS: docs/superpowers/plans/2026-06-19-depth-forensic-signaling-plan.md Task 2 (C2)
--             design §3.2 (workshop_stoichiometry_state + recipe_stoichiometry_table) + §3.3 (block_effluent_register)
--             docs/tech/04c_market_reputation_insurance/forensic_signaling_mechanics.md §5.2
--             — Forensic Signaling C2 — 2026-06-19
--
-- Migration: 0072_forensic_effluent_state
-- Tables:    workshop_stoichiometry_state (NEW) + recipe_stoichiometry_table (NEW + SEED)
--            + block_effluent_register (NEW)
--
-- workshop_stoichiometry_state: per-lab-workshop rolling throughput accumulator.
--   workshop_id:          uuid PK — the lab building's uuid.
--   player_id:            FK → player(player_id) ON DELETE CASCADE + INDEX (player-scoped).
--   block_id:             integer NOT NULL — block of the workshop (for block aggregation C13).
--   substance_type:       substance_type enum NOT NULL (REUSE — already exists in PG, OQ-5).
--   throughput_kg_window: jsonb NOT NULL DEFAULT '[]' — rolling kg per game-day (C12).
--   updated_at_tick:      bigint nullable — last recordWorkshopThroughput (C12).
--
-- recipe_stoichiometry_table: designer data (read-mostly). SEEDED with 4 rows [PROV-Y26Q2].
--   substance_type:    substance_type enum PK (4 rows: brindle/crick/hush/ash, extensible to 6).
--   solvent_out_per_kg: real NOT NULL — [PROPOSED DEFAULT][PROV-Y26Q2] solvent coefficient (canon :84).
--   vapour_out_per_kg:  real NOT NULL — [PROPOSED DEFAULT][PROV-Y26Q2] vapour coefficient (:84).
--   water_out_per_kg:   real NOT NULL — [PROPOSED DEFAULT][PROV-Y26Q2] water coefficient (:84).
--   NOTE: the 3 coefficient values are PROPOSED DEFAULTS [PROV-Y26Q2] — canon-silent (canon :84
--         names the 3 axes but does NOT specify magnitudes). Values are calibration-TBD; a
--         calibration TD is routed at closeout (OQ-5, plan line 103). They are NOT canon.
--
-- block_effluent_register: per-player per-block rolling effluent register.
--   (player_id, block_id): composite PK (mirror inspection_queues PK pattern, design §3.3).
--   player_id:         FK → player(player_id) ON DELETE CASCADE + INDEX (player-scoped).
--   district_id:       integer NOT NULL — district of this block (NIGHTLY/9 scan C14).
--   effluent_window:   jsonb NOT NULL DEFAULT '[]' — rolling (solvent,vapour,water) sums (C13).
--   baseline_effluent: real nullable — day-seeded baseline (server-only, R2.2, C4, canon :186).
--   last_deviation:    real nullable — last (block_effluent - baseline)/baseline (server-only R2.2).
--   last_scan_tick:    bigint nullable — NIGHTLY/9 idempotence guard (C14).
--
-- R9.3: backported to docs/tech/09_data_model/schema_forensic.md same-commit.
-- OQ-5: substanceType REUSED (enum 'substance_type' already exists in PG — NO CREATE TYPE).
-- R2.2: baseline_effluent + last_deviation + last_scan_tick = server-only.
-- Zero-regression: no existing table or column is modified.

CREATE TABLE IF NOT EXISTS "workshop_stoichiometry_state" (
  "workshop_id"           uuid     NOT NULL PRIMARY KEY,
  "player_id"             uuid     NOT NULL
    REFERENCES "player"("player_id") ON DELETE CASCADE,
  "block_id"              integer  NOT NULL,
  "substance_type"        substance_type NOT NULL,
  "throughput_kg_window"  jsonb    NOT NULL DEFAULT '[]',
  "updated_at_tick"       bigint
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "workshop_stoichiometry_state_player_idx"
  ON "workshop_stoichiometry_state" ("player_id");

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "workshop_stoichiometry_state" TO app_rw;

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "recipe_stoichiometry_table" (
  "substance_type"    substance_type NOT NULL PRIMARY KEY,
  "solvent_out_per_kg" real NOT NULL,
  "vapour_out_per_kg"  real NOT NULL,
  "water_out_per_kg"   real NOT NULL
);

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "recipe_stoichiometry_table" TO app_rw;

--> statement-breakpoint

-- SEED: 4 substance rows [PROPOSED DEFAULT][PROV-Y26Q2]
-- These values are PROPOSED DEFAULTS — canon :84 names solvent/vapour/water axes but does
-- NOT specify magnitudes. Calibration is routed to a TD at closeout (OQ-5).
-- Values are distinguishable across at least one axis (canon :87 "distinguishable signatures").
-- brindle: solvent-moderate, vapour-moderate, water-heavy
-- crick:   solvent-light,    vapour-heavy,    water-moderate  (vapour-heavy profile)
-- hush:    solvent-heavy,    vapour-light,    water-moderate  (solvent-heavy profile)
-- ash:     solvent-moderate, vapour-light,    water-very-heavy (water-heavy profile)
INSERT INTO "recipe_stoichiometry_table"
  ("substance_type", "solvent_out_per_kg", "vapour_out_per_kg", "water_out_per_kg")
VALUES
  ('brindle', 2.0, 1.5, 3.0),  -- [PROPOSED DEFAULT][PROV-Y26Q2] — calibrate at closeout
  ('crick',   1.2, 2.5, 1.8),  -- [PROPOSED DEFAULT][PROV-Y26Q2] — vapour-heavy signature
  ('hush',    3.0, 0.8, 2.0),  -- [PROPOSED DEFAULT][PROV-Y26Q2] — solvent-heavy signature
  ('ash',     1.5, 1.0, 4.0)   -- [PROPOSED DEFAULT][PROV-Y26Q2] — water-heavy signature
ON CONFLICT ("substance_type") DO NOTHING;

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "block_effluent_register" (
  "block_id"          integer  NOT NULL,
  "player_id"         uuid     NOT NULL
    REFERENCES "player"("player_id") ON DELETE CASCADE,
  "district_id"       integer  NOT NULL,
  "effluent_window"   jsonb    NOT NULL DEFAULT '[]',
  "baseline_effluent" real,
  "last_deviation"    real,
  "last_scan_tick"    bigint,
  PRIMARY KEY ("player_id", "block_id")
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "block_effluent_register_player_idx"
  ON "block_effluent_register" ("player_id");

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "block_effluent_register" TO app_rw;
