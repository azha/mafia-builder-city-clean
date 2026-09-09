-- 0010_sessions_and_audit.sql — schema_sessions_and_audit.md §3/§7. PALIMPSEST §3.2.
-- DDL généré (calque) + partitioning RANGE manuel + partitions initiales + REVOKE append-only
-- (non générés par drizzle-kit). FK player_id RESTRICT sur gameplay_sessions (override Task 3 §5.2 ligne 385).

-- ===== Enum PG natif (CREATE TYPE) =====
CREATE TYPE "audit_action_type" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'EXPORT', 'IMPERSONATE', 'SIGNIN_AS');
--> statement-breakpoint

-- ===== Table 1 : gameplay_sessions (renommée vs GDD `sessions` §1) =====
CREATE TABLE "gameplay_sessions" (
  "gameplay_session_id"  uuid                       PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"            uuid                       NOT NULL REFERENCES "player"("player_id") ON DELETE RESTRICT,
  "started_at"           timestamptz                NOT NULL DEFAULT now(),
  "ended_at"             timestamptz,
  "decisions_made"       integer                    NOT NULL DEFAULT 0,
  "exceptions_resolved"  integer                    NOT NULL DEFAULT 0,
  "structural_commits"   integer                    NOT NULL DEFAULT 0,
  "client_version"       varchar(32)                NOT NULL,
  CONSTRAINT "gs_decisions_made_chk"      CHECK (decisions_made >= 0),
  CONSTRAINT "gs_exceptions_resolved_chk" CHECK (exceptions_resolved >= 0),
  CONSTRAINT "gs_structural_commits_chk"  CHECK (structural_commits >= 0)
);
--> statement-breakpoint
CREATE INDEX "gameplay_sessions_player_idx"          ON "gameplay_sessions" ("player_id");
--> statement-breakpoint
CREATE INDEX "gameplay_sessions_player_started_idx"  ON "gameplay_sessions" ("player_id", "started_at" DESC);
--> statement-breakpoint
CREATE INDEX "gameplay_sessions_active_partial_idx"  ON "gameplay_sessions" ("player_id")
  WHERE "ended_at" IS NULL;
--> statement-breakpoint
CREATE INDEX "gameplay_sessions_started_at_idx"      ON "gameplay_sessions" ("started_at" DESC);
--> statement-breakpoint

-- ===== Table 2 : admin_audit_log — PARTITIONNÉE RANGE (occurred_at) mensuel =====
CREATE TABLE "admin_audit_log" (
  "audit_id"             uuid                       NOT NULL DEFAULT gen_random_uuid(),
  "admin_user_id"        uuid                       NOT NULL,
  "action_type"          audit_action_type          NOT NULL,
  "target_player_id"     uuid,
  "target_entity_type"   varchar(64)                NOT NULL,
  "target_entity_id"     uuid,
  "before_state"         jsonb                      NOT NULL DEFAULT '{}'::jsonb,
  "after_state"          jsonb                      NOT NULL DEFAULT '{}'::jsonb,
  "ticket_ref"           varchar(64),
  "occurred_at"          timestamptz                NOT NULL DEFAULT now(),
  PRIMARY KEY ("audit_id", "occurred_at")
) PARTITION BY RANGE ("occurred_at");
--> statement-breakpoint
CREATE INDEX "admin_audit_log_occurred_at_idx"           ON "admin_audit_log" ("occurred_at" DESC);
--> statement-breakpoint
CREATE INDEX "admin_audit_log_admin_user_idx"            ON "admin_audit_log" ("admin_user_id", "occurred_at" DESC);
--> statement-breakpoint
CREATE INDEX "admin_audit_log_target_player_partial_idx" ON "admin_audit_log" ("target_player_id", "occurred_at" DESC)
  WHERE "target_player_id" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "admin_audit_log_action_type_idx"           ON "admin_audit_log" ("action_type", "occurred_at" DESC);
--> statement-breakpoint
CREATE INDEX "admin_audit_log_target_entity_idx"         ON "admin_audit_log" ("target_entity_type", "target_entity_id");
--> statement-breakpoint

-- ===== Partitions initiales mensuelles (rotation cron AuditPartitionMaintenanceService §11) =====
CREATE TABLE "admin_audit_log_y2026m05" PARTITION OF "admin_audit_log"
  FOR VALUES FROM ('2026-05-01 00:00:00+00') TO ('2026-06-01 00:00:00+00');
--> statement-breakpoint
CREATE TABLE "admin_audit_log_y2026m06" PARTITION OF "admin_audit_log"
  FOR VALUES FROM ('2026-06-01 00:00:00+00') TO ('2026-07-01 00:00:00+00');
--> statement-breakpoint
CREATE TABLE "admin_audit_log_default" PARTITION OF "admin_audit_log" DEFAULT;
--> statement-breakpoint

-- ===== Append-only enforcement (REUSE 17 audit_trail.md §R-AT-1) =====
REVOKE UPDATE, DELETE ON "admin_audit_log"                  FROM PUBLIC;
--> statement-breakpoint
REVOKE UPDATE, DELETE ON "admin_audit_log_y2026m05"         FROM PUBLIC;
--> statement-breakpoint
REVOKE UPDATE, DELETE ON "admin_audit_log_y2026m06"         FROM PUBLIC;
--> statement-breakpoint
REVOKE UPDATE, DELETE ON "admin_audit_log_default"          FROM PUBLIC;
