-- 0012_telemetry_event.sql — schema_telemetry_event.md §3/§7 (A2). PALIMPSEST §3.2.
-- DDL généré (calque) + partitioning RANGE manuel + partitions initiales + REVOKE append-only
-- (non générés par drizzle-kit). FK player_id SET NULL (anonymize-not-cascade — override §5.2).

-- ===== Enums PG natifs (CREATE TYPE) — matérialisent les enums owned ch20 =====
CREATE TYPE "event_domain"        AS ENUM ('PLAYER', 'GAMEPLAY', 'ECONOMY', 'SOCIAL', 'TECHNICAL');
--> statement-breakpoint
CREATE TYPE "event_privacy_class" AS ENUM ('PII', 'ANONYMOUS');
--> statement-breakpoint

-- ===== Table : telemetry_event — PARTITIONNÉE RANGE (occurred_at) mensuel =====
CREATE TABLE "telemetry_event" (
  "event_id"        uuid                  NOT NULL DEFAULT gen_random_uuid(),
  "name"            varchar(128)          NOT NULL,
  "domain"          event_domain          NOT NULL,
  "schema_version"  integer               NOT NULL DEFAULT 1,
  "player_id"       uuid                  REFERENCES "player"("player_id") ON DELETE SET NULL,
  "occurred_at"     timestamptz           NOT NULL,
  "payload"         jsonb                 NOT NULL DEFAULT '{}'::jsonb,
  "privacy_class"   event_privacy_class   NOT NULL,
  "consent_scope"   jsonb,
  "ingested_at"     timestamptz           NOT NULL DEFAULT now(),
  PRIMARY KEY ("event_id", "occurred_at")
) PARTITION BY RANGE ("occurred_at");
--> statement-breakpoint
CREATE INDEX "telemetry_event_occurred_at_idx"      ON "telemetry_event" ("occurred_at" DESC);
--> statement-breakpoint
CREATE INDEX "telemetry_event_domain_occurred_idx"  ON "telemetry_event" ("domain", "occurred_at" DESC);
--> statement-breakpoint
CREATE INDEX "telemetry_event_name_occurred_idx"    ON "telemetry_event" ("name", "occurred_at" DESC);
--> statement-breakpoint
CREATE INDEX "telemetry_event_player_partial_idx"   ON "telemetry_event" ("player_id", "occurred_at" DESC)
  WHERE "player_id" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "telemetry_event_privacy_class_idx"    ON "telemetry_event" ("privacy_class", "occurred_at" DESC);
--> statement-breakpoint

-- ===== Partitions initiales mensuelles (rotation cron TelemetryPartitionMaintenanceService §11) =====
CREATE TABLE "telemetry_event_y2026m06" PARTITION OF "telemetry_event"
  FOR VALUES FROM ('2026-06-01 00:00:00+00') TO ('2026-07-01 00:00:00+00');
--> statement-breakpoint
CREATE TABLE "telemetry_event_y2026m07" PARTITION OF "telemetry_event"
  FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2026-08-01 00:00:00+00');
--> statement-breakpoint
CREATE TABLE "telemetry_event_default" PARTITION OF "telemetry_event" DEFAULT;
--> statement-breakpoint

-- ===== Append-only enforcement (calque Task 12 admin_audit_log §3) =====
-- Le SET NULL anonymize (ON DELETE player) est exécuté par le moteur PG via la contrainte FK,
-- non bloqué par le REVOKE (indépendant des ACLs UPDATE/DELETE applicatifs).
REVOKE UPDATE, DELETE ON "telemetry_event"             FROM PUBLIC;
--> statement-breakpoint
REVOKE UPDATE, DELETE ON "telemetry_event_y2026m06"    FROM PUBLIC;
--> statement-breakpoint
REVOKE UPDATE, DELETE ON "telemetry_event_y2026m07"    FROM PUBLIC;
--> statement-breakpoint
REVOKE UPDATE, DELETE ON "telemetry_event_default"     FROM PUBLIC;
