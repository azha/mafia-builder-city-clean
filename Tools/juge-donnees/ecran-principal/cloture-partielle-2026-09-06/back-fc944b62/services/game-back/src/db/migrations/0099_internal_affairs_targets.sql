-- migration 0099: 4 IA enums + internal_affairs_targets table (04d-B C1 — IA Schema G1)
-- Canon: docs/tech/04d_meta_market_lawyer_and_internal_affairs/internal_affairs_corruption_discovery.md §State (:40-71)
-- R9.3: backported to docs/tech/09_data_model/schema_internal_affairs.md same-commit.
-- R2.2/P5: suspicion_level, cooperators, weight_per_player SERVER-ONLY — never forwarded raw to client.
-- Anti-fabrication: no Math.random(), no non-deterministic defaults.
-- Zero-regression: ADDITIVE only. No existing tables modified.
-- GLOBAL table: internal_affairs_targets has NO player FK (server-side singleton per corrupt actor).
-- Reserved-inert targets (RATIFIÉ #4): clerk|port_inspector|broker|judge_aide declared; no live v1 caller (TD).
-- lawyer = LIVE via Tier3LawyerUsedEvent + §13 hook (C3).

--> statement-breakpoint

-- ia_target_type: the corruption target category (canon :41-52).
-- clerk | port_inspector | lawyer | broker | judge_aide.
-- lawyer = LIVE (C3 §13 hook). 4 others = RESERVED-INERT (RATIFIÉ #4, TD).
CREATE TYPE "ia_target_type" AS ENUM (
  'clerk',
  'port_inspector',
  'lawyer',
  'broker',
  'judge_aide'
);

--> statement-breakpoint

-- ia_investigation_status: lifecycle of an IA investigation.
-- active → completed_discovered | completed_clear | aborted.
CREATE TYPE "ia_investigation_status" AS ENUM (
  'active',
  'completed_discovered',
  'completed_clear',
  'aborted'
);

--> statement-breakpoint

-- ia_suspicion_band: suspicion level band (projected from suspicion_level float, P5 wall).
-- silent | watching | investigating | revealing.
-- Player only sees this band via IATargetSuspicionBandBucket (op Fixer intel purchase — C8).
CREATE TYPE "ia_suspicion_band" AS ENUM (
  'silent',
  'watching',
  'investigating',
  'revealing'
);

--> statement-breakpoint

-- burn_method: method used to burn a discovered corruption target (canon §Burn §13 IA).
-- kill | exile | buyout.
CREATE TYPE "burn_method" AS ENUM (
  'kill',
  'exile',
  'buyout'
);

--> statement-breakpoint

-- internal_affairs_targets: GLOBAL registry of corruption targets (canon :41-52).
-- One row per corrupt actor tracked at the system level. NO player FK (GLOBAL table).
-- Multiple players may cooperate on the same target (cooperators jsonb list).
-- suspicion_level: SERVER-ONLY (R2.2/P5). Float 0-1. Projected via IATargetSuspicionBandBucket (C8).
-- cooperators: SERVER-ONLY JSONB list of player_ids. Never forwarded to client.
-- weight_per_player: SERVER-ONLY JSONB map { player_id → float }. Never forwarded to client.
-- investigation_open_since / discovered_at: nullable timestamptz. Null until investigation opens/discovered.
-- investigation_id: soft ref (NO DB FK) to ia_investigations. Null if no active investigation.
-- FK: NONE (GLOBAL table — no player FK, no FK to ia_investigations — soft ref only).
-- INDEX (target_type, suspicion_level): NIGHTLY threshold scan.
CREATE TABLE IF NOT EXISTS "internal_affairs_targets" (
  "target_id"                uuid           NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "target_type"              ia_target_type NOT NULL,
  "target_npc_id"            uuid           NOT NULL,
  "suspicion_level"          real           NOT NULL DEFAULT 0.0,
  "investigation_open_since" timestamptz,
  "discovered_at"            timestamptz,
  "cooperators"              jsonb          NOT NULL DEFAULT '[]'::jsonb,
  "weight_per_player"        jsonb          NOT NULL DEFAULT '{}'::jsonb,
  "last_weekly_decay_at"     timestamptz    NOT NULL DEFAULT now(),
  "investigation_id"         uuid
);

--> statement-breakpoint

CREATE INDEX "ia_targets_type_suspicion_idx"
  ON "internal_affairs_targets" ("target_type", "suspicion_level");

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "internal_affairs_targets" TO app_rw;
