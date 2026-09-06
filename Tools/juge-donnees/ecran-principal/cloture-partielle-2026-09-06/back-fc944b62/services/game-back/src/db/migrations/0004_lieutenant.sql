-- 0004_lieutenant.sql — schema_lieutenant.md §3/§7. PALIMPSEST §3.2.
-- DDL généré (calque) + CHECK domaines ajoutés à la main. behavior_script créée AVANT lieutenant (FK forward).
-- uuidv7() fourni par 0000_init.sql.

-- ===== Enums natifs =====
CREATE TYPE "lieutenant_source"     AS ENUM ('saltline', 'defector', 'civilian');
--> statement-breakpoint
CREATE TYPE "primary_or_understudy" AS ENUM ('primary', 'understudy');
--> statement-breakpoint
CREATE TYPE "extinction_state"      AS ENUM ('STABLE', 'BURST', 'FADING', 'RESOLVED');
--> statement-breakpoint
CREATE TYPE "last_modified_by"      AS ENUM ('player', 'admin', 'system');
--> statement-breakpoint
CREATE TYPE "cue_type"              AS ENUM ('DIRECT_ORDER', 'TERRITORY_STATE', 'RESOURCE_AVAILABILITY', 'TIME_SLOT', 'PEER_BEHAVIOR');
--> statement-breakpoint
CREATE TYPE "lapse_action"          AS ENUM ('REVERT_DEFAULT', 'HOLD_LAST', 'ESCALATE_TO_PLAYER');
--> statement-breakpoint
CREATE TYPE "veto_category"         AS ENUM ('SUPPLY', 'FINANCIAL', 'PERSONNEL', 'OPERATIONS');
--> statement-breakpoint

-- ===== Table behavior_script (créée AVANT lieutenant — FK forward) =====
CREATE TABLE "behavior_script" (
  "script_id"        uuid PRIMARY KEY DEFAULT uuidv7(),
  "rules"            jsonb NOT NULL DEFAULT '{"rules":[]}'::jsonb,
  "last_modified_at" timestamptz NOT NULL DEFAULT now(),
  "last_modified_by" last_modified_by NOT NULL DEFAULT 'system'
);
--> statement-breakpoint

-- ===== Table lieutenant (racine 1-N enfant de player) =====
CREATE TABLE "lieutenant" (
  "lieutenant_id"         uuid PRIMARY KEY DEFAULT uuidv7(),
  "player_id"             uuid NOT NULL REFERENCES "player"("player_id") ON DELETE RESTRICT,
  "name"                  varchar(64) NOT NULL,
  "name_locale"           varchar(8)  NOT NULL,
  "role_id"               integer NOT NULL,
  "source"                lieutenant_source NOT NULL,
  "tenure_score"          integer NOT NULL DEFAULT 0,
  "recruited_at"          timestamptz NOT NULL DEFAULT now(),
  "succession_horizon"    real NOT NULL DEFAULT 1.0,
  "primary_or_understudy" primary_or_understudy NOT NULL DEFAULT 'primary',
  "primary_for_role_id"   integer,
  "understudy_sync_pct"   integer NOT NULL DEFAULT 0,
  "extinction_state"      extinction_state NOT NULL DEFAULT 'STABLE',
  "burst_magnitude"       integer NOT NULL DEFAULT 0,
  "behavior_script_id"    uuid NOT NULL REFERENCES "behavior_script"("script_id") ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE        INDEX "lieutenant_player_id_idx"            ON "lieutenant" ("player_id");
--> statement-breakpoint
CREATE        INDEX "lieutenant_role_id_idx"              ON "lieutenant" ("role_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "lieutenant_behavior_script_id_uq"    ON "lieutenant" ("behavior_script_id");
--> statement-breakpoint
CREATE        INDEX "lieutenant_extinction_state_idx"     ON "lieutenant" ("extinction_state");
--> statement-breakpoint
CREATE        INDEX "lieutenant_primary_for_role_id_idx"  ON "lieutenant" ("primary_for_role_id");
--> statement-breakpoint
ALTER TABLE "lieutenant" ADD CONSTRAINT "lieutenant_tenure_score_chk"       CHECK ("tenure_score"       >= 0);
--> statement-breakpoint
ALTER TABLE "lieutenant" ADD CONSTRAINT "lieutenant_succession_horizon_chk" CHECK ("succession_horizon" BETWEEN 0.0 AND 1.0);
--> statement-breakpoint
ALTER TABLE "lieutenant" ADD CONSTRAINT "lieutenant_understudy_sync_pct_chk" CHECK ("understudy_sync_pct" BETWEEN 0 AND 100);
--> statement-breakpoint
ALTER TABLE "lieutenant" ADD CONSTRAINT "lieutenant_burst_magnitude_chk"    CHECK ("burst_magnitude"    BETWEEN 0 AND 10);
--> statement-breakpoint

-- ===== Table lieutenant_cue_registry (1-N PK composite) =====
CREATE TABLE "lieutenant_cue_registry" (
  "lieutenant_id"     uuid NOT NULL REFERENCES "lieutenant"("lieutenant_id") ON DELETE CASCADE,
  "cue_type"          cue_type NOT NULL,
  "reliability_score" real NOT NULL DEFAULT 0.5,
  PRIMARY KEY ("lieutenant_id", "cue_type")
);
--> statement-breakpoint
ALTER TABLE "lieutenant_cue_registry" ADD CONSTRAINT "lt_cue_reliability_chk" CHECK ("reliability_score" BETWEEN 0.0 AND 1.0);
--> statement-breakpoint

-- ===== Table lieutenant_task_exposure (1-N PK composite) =====
CREATE TABLE "lieutenant_task_exposure" (
  "lieutenant_id"             uuid NOT NULL REFERENCES "lieutenant"("lieutenant_id") ON DELETE CASCADE,
  "task_category_id"          integer NOT NULL,
  "exposure_tier"             smallint NOT NULL DEFAULT 0,
  "aversion_flag"             boolean  NOT NULL DEFAULT false,
  "aversion_cooldown_expires" timestamptz,
  "rehab_tolerance"           real NOT NULL DEFAULT 0.3,
  "rehab_progress"            real NOT NULL DEFAULT 0.0,
  PRIMARY KEY ("lieutenant_id", "task_category_id")
);
--> statement-breakpoint
ALTER TABLE "lieutenant_task_exposure" ADD CONSTRAINT "lt_exposure_tier_chk"   CHECK ("exposure_tier"   BETWEEN 0 AND 5);
--> statement-breakpoint
ALTER TABLE "lieutenant_task_exposure" ADD CONSTRAINT "lt_rehab_tolerance_chk" CHECK ("rehab_tolerance" BETWEEN 0.0 AND 1.0);
--> statement-breakpoint
ALTER TABLE "lieutenant_task_exposure" ADD CONSTRAINT "lt_rehab_progress_chk"  CHECK ("rehab_progress"  BETWEEN 0.0 AND 1.0);
--> statement-breakpoint

-- ===== Table standing_order (1-N) =====
CREATE TABLE "standing_order" (
  "order_id"         uuid PRIMARY KEY DEFAULT uuidv7(),
  "lieutenant_id"    uuid NOT NULL REFERENCES "lieutenant"("lieutenant_id") ON DELETE CASCADE,
  "instruction_type" integer NOT NULL,
  "target_entity_id" uuid NOT NULL,
  "issued_at"        timestamptz NOT NULL DEFAULT now(),
  "expires_at"       timestamptz NOT NULL,
  "lapse_action"     lapse_action NOT NULL DEFAULT 'REVERT_DEFAULT',
  "lapse_count"      integer NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX "standing_order_lieutenant_id_idx" ON "standing_order" ("lieutenant_id");
--> statement-breakpoint
CREATE INDEX "standing_order_expires_at_idx"    ON "standing_order" ("expires_at");
--> statement-breakpoint
ALTER TABLE "standing_order" ADD CONSTRAINT "standing_order_lapse_count_chk" CHECK ("lapse_count" >= 0);
--> statement-breakpoint

-- ===== Table jurisdiction_boundary (1-N PK composite) =====
CREATE TABLE "jurisdiction_boundary" (
  "lieutenant_id"  uuid NOT NULL REFERENCES "lieutenant"("lieutenant_id") ON DELETE CASCADE,
  "shared_edge_id" integer NOT NULL,
  "entries"        jsonb NOT NULL DEFAULT '[]'::jsonb,
  PRIMARY KEY ("lieutenant_id", "shared_edge_id")
);
--> statement-breakpoint

-- ===== Table veto_assignment (N-M PK composite triple) =====
CREATE TABLE "veto_assignment" (
  "player_id"     uuid NOT NULL REFERENCES "player"("player_id") ON DELETE RESTRICT,
  "category"      veto_category NOT NULL,
  "lieutenant_id" uuid NOT NULL REFERENCES "lieutenant"("lieutenant_id") ON DELETE CASCADE,
  PRIMARY KEY ("player_id", "category", "lieutenant_id")
);
--> statement-breakpoint
CREATE INDEX "veto_assignment_lieutenant_id_idx" ON "veto_assignment" ("lieutenant_id");
