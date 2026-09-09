-- 0011_anti_cheat.sql — schema_anti_cheat.md §3/§7 (A2). PALIMPSEST §3.2.
-- DDL généré (calque) + REVOKE append-only sur enforcement_action (registre immuable). Chaîne FK
-- cheat_flag → enforcement_action → appeal_case. FK target_player_id RESTRICT ; appeal_case.player_id CASCADE.

-- ===== Enums PG natifs (CREATE TYPE) =====
CREATE TYPE "cheat_flag_kind"         AS ENUM ('SOFT', 'HARD');
--> statement-breakpoint
CREATE TYPE "signature_detector_kind" AS ENUM ('BOT', 'REPLAY', 'DEVICE', 'CROSS_ACCOUNT', 'T4_SIGNAL');
--> statement-breakpoint
CREATE TYPE "enforcement_action_type" AS ENUM ('WARN', 'SUSPEND', 'BAN', 'SHADOW_BAN');
--> statement-breakpoint
CREATE TYPE "appeal_state"            AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED');
--> statement-breakpoint
CREATE TYPE "cheat_flag_severity"     AS ENUM ('LOW', 'MEDIUM', 'HIGH');
--> statement-breakpoint
CREATE TYPE "cheat_flag_status"       AS ENUM ('QUEUED', 'REVIEWED', 'RESOLVED');
--> statement-breakpoint
CREATE TYPE "appeal_outcome_kind"     AS ENUM ('ACCEPTED', 'REJECTED');
--> statement-breakpoint

-- ===== Table 1 : cheat_flag =====
CREATE TABLE "cheat_flag" (
  "cheat_flag_id"     uuid                     PRIMARY KEY DEFAULT gen_random_uuid(),
  "target_player_id"  uuid                     NOT NULL REFERENCES "player"("player_id") ON DELETE RESTRICT,
  "flag_kind"         cheat_flag_kind          NOT NULL,
  "source_signal"     varchar(32)              NOT NULL,
  "detector"          signature_detector_kind,
  "severity"          cheat_flag_severity      NOT NULL,
  "status"            cheat_flag_status        NOT NULL DEFAULT 'QUEUED',
  "created_at"        timestamptz              NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "cheat_flag_target_player_idx" ON "cheat_flag" ("target_player_id", "created_at" DESC);
--> statement-breakpoint
CREATE INDEX "cheat_flag_status_idx"        ON "cheat_flag" ("status", "created_at" DESC);
--> statement-breakpoint
CREATE INDEX "cheat_flag_kind_severity_idx" ON "cheat_flag" ("flag_kind", "severity");
--> statement-breakpoint

-- ===== Table 2 : enforcement_action =====
CREATE TABLE "enforcement_action" (
  "enforcement_action_id"  uuid                     PRIMARY KEY DEFAULT gen_random_uuid(),
  "target_player_id"       uuid                     NOT NULL REFERENCES "player"("player_id") ON DELETE RESTRICT,
  "action_enum"            enforcement_action_type  NOT NULL,
  "source_signal_id"       uuid                     REFERENCES "cheat_flag"("cheat_flag_id") ON DELETE RESTRICT,
  "staff_id"               uuid                     NOT NULL,
  "before_state"           jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "after_state"            jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "shadow_banned"          boolean                  NOT NULL DEFAULT false,
  "two_person_approval_id" uuid,
  "ticket_ref"             varchar(64),
  "created_at"             timestamptz              NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "enforcement_action_target_player_idx" ON "enforcement_action" ("target_player_id", "created_at" DESC);
--> statement-breakpoint
CREATE INDEX "enforcement_action_action_enum_idx"   ON "enforcement_action" ("action_enum", "created_at" DESC);
--> statement-breakpoint
CREATE INDEX "enforcement_action_source_signal_idx" ON "enforcement_action" ("source_signal_id");
--> statement-breakpoint
CREATE INDEX "enforcement_action_shadow_active_partial_idx" ON "enforcement_action" ("target_player_id")
  WHERE "shadow_banned" = true;
--> statement-breakpoint

-- ===== Table 3 : appeal_case =====
CREATE TABLE "appeal_case" (
  "appeal_id"              uuid                 PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"              uuid                 NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "enforcement_action_id"  uuid                 NOT NULL REFERENCES "enforcement_action"("enforcement_action_id") ON DELETE RESTRICT,
  "state"                  appeal_state         NOT NULL DEFAULT 'SUBMITTED',
  "reason_text"            text                 NOT NULL,
  "submitted_at"           timestamptz          NOT NULL DEFAULT now(),
  "reviewed_by"            uuid,
  "outcome"                appeal_outcome_kind,
  "decision_reason"        text,
  "decided_at"             timestamptz,
  "two_person_approval_id" uuid,
  CONSTRAINT "appeal_case_enforcement_action_uq" UNIQUE ("enforcement_action_id")
);
--> statement-breakpoint
CREATE INDEX "appeal_case_player_idx" ON "appeal_case" ("player_id", "submitted_at" DESC);
--> statement-breakpoint
CREATE INDEX "appeal_case_state_idx"  ON "appeal_case" ("state", "submitted_at" DESC);
--> statement-breakpoint

-- ===== Append-only enforcement_action (registre de modération immuable — calque admin_audit_log Task 12 §3) =====
REVOKE UPDATE, DELETE ON "enforcement_action" FROM PUBLIC;
