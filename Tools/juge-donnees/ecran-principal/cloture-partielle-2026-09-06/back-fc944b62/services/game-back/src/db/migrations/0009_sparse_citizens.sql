-- 0009_sparse_citizens.sql — schema_sparse_citizens.md §3/§7. PALIMPSEST §3.2.
-- DDL généré (calque) + CHECK constraints + partial index. FK player_id CASCADE.

-- ===== Enum PG natif (CREATE TYPE) =====
CREATE TYPE "citizen_demographic" AS ENUM ('routine', 'spike', 'connector', 'whisper', 'glass_client');
--> statement-breakpoint

-- ===== Table 1 : rich_citizens =====
CREATE TABLE "rich_citizens" (
  "citizen_id"           uuid                  PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"            uuid                  NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "home_block_id"        integer               NOT NULL,
  "work_block_id"        integer               NOT NULL,
  "leisure_block_id"     integer               NOT NULL,
  "demographic"          citizen_demographic   NOT NULL,
  "schedule_template_id" integer               NOT NULL,
  "loyalty_dealer_id"    uuid,
  "satisfaction"         integer               NOT NULL DEFAULT 50,
  "whisper_pressure"     integer               NOT NULL DEFAULT 0,
  "biography"            jsonb                 NOT NULL DEFAULT '{}'::jsonb,
  "alive"                boolean               NOT NULL DEFAULT true
);
--> statement-breakpoint
CREATE INDEX "rich_citizens_player_idx"                ON "rich_citizens" ("player_id");
--> statement-breakpoint
CREATE INDEX "rich_citizens_player_alive_idx"          ON "rich_citizens" ("player_id", "alive");
--> statement-breakpoint
CREATE INDEX "rich_citizens_player_demographic_idx"    ON "rich_citizens" ("player_id", "demographic");
--> statement-breakpoint
CREATE INDEX "rich_citizens_player_loyalty_dealer_idx" ON "rich_citizens" ("player_id", "loyalty_dealer_id");
--> statement-breakpoint
CREATE INDEX "rich_citizens_player_home_block_idx"     ON "rich_citizens" ("player_id", "home_block_id");
--> statement-breakpoint
CREATE INDEX "rich_citizens_whisper_active_partial_idx"
  ON "rich_citizens" ("player_id", "whisper_pressure")
  WHERE "whisper_pressure" >= 70;
--> statement-breakpoint
ALTER TABLE "rich_citizens" ADD CONSTRAINT "rc_home_block_id_chk"        CHECK (home_block_id >= 0);
--> statement-breakpoint
ALTER TABLE "rich_citizens" ADD CONSTRAINT "rc_work_block_id_chk"        CHECK (work_block_id >= 0);
--> statement-breakpoint
ALTER TABLE "rich_citizens" ADD CONSTRAINT "rc_leisure_block_id_chk"     CHECK (leisure_block_id >= 0);
--> statement-breakpoint
ALTER TABLE "rich_citizens" ADD CONSTRAINT "rc_schedule_template_id_chk" CHECK (schedule_template_id >= 0);
--> statement-breakpoint
ALTER TABLE "rich_citizens" ADD CONSTRAINT "rc_satisfaction_chk"         CHECK (satisfaction BETWEEN 0 AND 100);
--> statement-breakpoint
ALTER TABLE "rich_citizens" ADD CONSTRAINT "rc_whisper_pressure_chk"     CHECK (whisper_pressure BETWEEN 0 AND 100);
