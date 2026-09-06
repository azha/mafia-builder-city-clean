-- migration 0096: info-warfare state tables (C9 — 4 mechanics)
-- Canon: docs/tech/04b_combat_and_conflict/information_warfare_mechanics.md §4.1-§4.4
-- REUSE: rival_key pgEnum declared in migration 0081 (lot 04b-A). NOT redeclared here.
-- Zero-regression: ADDITIVE only. No existing tables modified.

--> statement-breakpoint
-- dead_reckoning_belief: the 6-component Dead-Reckoning belief vector (per-player × per-rival).
-- All bands are NOISY ESTIMATES (never the rival's true state — DD-P5-REALIZATION).
CREATE TABLE IF NOT EXISTS "dead_reckoning_belief" (
  "player_id" uuid NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "rival_key" "rival_key" NOT NULL,
  "operational_tempo_band" varchar NOT NULL DEFAULT 'low',
  "resource_mobilization_band" varchar NOT NULL DEFAULT 'dormant',
  "personnel_concentration_band" varchar NOT NULL DEFAULT 'dispersed',
  "communication_pattern_band" varchar NOT NULL DEFAULT 'silent',
  "territorial_reach_band" varchar NOT NULL DEFAULT 'contracting',
  "logistics_intensity_band" varchar NOT NULL DEFAULT 'minimal',
  "coil_corruption_applied" boolean NOT NULL DEFAULT false,
  "last_updated_tick" bigint NOT NULL DEFAULT 0,
  CONSTRAINT "dead_reckoning_belief_pkey" PRIMARY KEY("player_id","rival_key")
);
GRANT SELECT, INSERT, UPDATE ON "dead_reckoning_belief" TO app_rw;

--> statement-breakpoint
-- dual_use_signal_state: Dual-Use Signal interpretation state (per-player × per-rival).
-- rival_interpretation_bias is SERVER-ONLY (R2.2/P6).
CREATE TABLE IF NOT EXISTS "dual_use_signal_state" (
  "player_id" uuid NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "rival_key" "rival_key" NOT NULL,
  "action_type" varchar NOT NULL DEFAULT 'neutral',
  "rival_interpretation_bias" real NOT NULL DEFAULT 0.0,
  "interpretation_badge" varchar NOT NULL DEFAULT 'ambiguous',
  "last_bpd_prior_mass" real NOT NULL DEFAULT 0.0,
  "last_updated_tick" bigint NOT NULL DEFAULT 0,
  CONSTRAINT "dual_use_signal_state_pkey" PRIMARY KEY("player_id","rival_key")
);
GRANT SELECT, INSERT, UPDATE ON "dual_use_signal_state" TO app_rw;

--> statement-breakpoint
-- surveillance_op: Observation-Disturbance surveillance state (per-player × per-rival).
-- detection_probability is SERVER-ONLY (R2.2/P6).
CREATE TABLE IF NOT EXISTS "surveillance_op" (
  "player_id" uuid NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "rival_key" "rival_key" NOT NULL,
  "active" boolean NOT NULL DEFAULT false,
  "detection_probability" real NOT NULL DEFAULT 0.0,
  "last_detection_game_day" integer NOT NULL DEFAULT 0,
  "last_disinfo_landed" boolean NOT NULL DEFAULT false,
  "last_updated_tick" bigint NOT NULL DEFAULT 0,
  CONSTRAINT "surveillance_op_pkey" PRIMARY KEY("player_id","rival_key")
);
GRANT SELECT, INSERT, UPDATE ON "surveillance_op" TO app_rw;

--> statement-breakpoint
-- purge_trap_state: Purge Trap infiltration state (per-player × per-rival).
-- suspected_infiltration_level is SERVER-ONLY (R2.2/P6).
CREATE TABLE IF NOT EXISTS "purge_trap_state" (
  "player_id" uuid NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "rival_key" "rival_key" NOT NULL,
  "suspected_infiltration_level" real NOT NULL DEFAULT 0.0,
  "internal_purge_active" boolean NOT NULL DEFAULT false,
  "bluff_active" boolean NOT NULL DEFAULT false,
  "bluff_discovered" boolean NOT NULL DEFAULT false,
  "last_updated_tick" bigint NOT NULL DEFAULT 0,
  CONSTRAINT "purge_trap_state_pkey" PRIMARY KEY("player_id","rival_key")
);
GRANT SELECT, INSERT, UPDATE ON "purge_trap_state" TO app_rw;
