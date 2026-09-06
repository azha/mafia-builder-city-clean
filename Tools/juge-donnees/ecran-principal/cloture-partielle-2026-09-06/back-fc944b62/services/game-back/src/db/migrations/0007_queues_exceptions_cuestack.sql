-- 0007_queues_exceptions_cuestack.sql — schema_queues_exceptions_cuestack.md §3/§7. PALIMPSEST §3.2.
-- DDL généré (calque) + CHECK constraints. FK lieutenant_id → lieutenant (créée 0004). FK player_id CASCADE.

-- ===== Enums PG natifs (CREATE TYPE) =====
CREATE TYPE "cue_stack_state"   AS ENUM ('pending', 'committed', 'executing', 'resolved');
--> statement-breakpoint
CREATE TYPE "resolution_status" AS ENUM ('pending', 'resolved', 'escalated', 'aged_out');
--> statement-breakpoint

-- ===== Table 1 : exception_queue =====
CREATE TABLE "exception_queue" (
  "exception_id"        uuid               PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"           uuid               NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "lieutenant_id"       uuid                        REFERENCES "lieutenant"("lieutenant_id") ON DELETE SET NULL,
  "event_descriptor"    text               NOT NULL,
  "candidate_actions"   jsonb              NOT NULL DEFAULT '[]'::jsonb,
  "suggested_action"    jsonb              NOT NULL DEFAULT '{}'::jsonb,
  "confidence"          real               NOT NULL DEFAULT 0,
  "priority"            integer            NOT NULL DEFAULT 0,
  "severity"            integer            NOT NULL DEFAULT 0,
  "emitted_at"          timestamptz        NOT NULL DEFAULT now(),
  "resolved_at"         timestamptz,
  "resolution"          jsonb,
  "resolution_status"   resolution_status  NOT NULL DEFAULT 'pending'
);
--> statement-breakpoint
CREATE INDEX "idx_exception_queue_player_priority"  ON "exception_queue" ("player_id", "priority" DESC, "emitted_at");
--> statement-breakpoint
CREATE INDEX "exception_queue_player_lieutenant_idx" ON "exception_queue" ("player_id", "lieutenant_id");
--> statement-breakpoint
CREATE INDEX "exception_queue_player_status_idx"     ON "exception_queue" ("player_id", "resolution_status");
--> statement-breakpoint
ALTER TABLE "exception_queue" ADD CONSTRAINT "eq_confidence_chk"       CHECK (confidence BETWEEN 0.0 AND 1.0);
--> statement-breakpoint
ALTER TABLE "exception_queue" ADD CONSTRAINT "eq_priority_chk"         CHECK (priority >= 0);
--> statement-breakpoint
ALTER TABLE "exception_queue" ADD CONSTRAINT "eq_severity_chk"         CHECK (severity >= 0);
--> statement-breakpoint
ALTER TABLE "exception_queue" ADD CONSTRAINT "eq_event_descriptor_chk" CHECK (length(event_descriptor) > 0);
--> statement-breakpoint
ALTER TABLE "exception_queue" ADD CONSTRAINT "eq_status_resolved_at_chk"
  CHECK (
    (resolution_status = 'pending'  AND resolved_at IS NULL)
    OR (resolution_status IN ('resolved', 'escalated', 'aged_out') AND resolved_at IS NOT NULL)
  );
--> statement-breakpoint

-- ===== Table 2 : cue_stacks =====
CREATE TABLE "cue_stacks" (
  "cue_stack_id"   uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"      uuid             NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "slots"          jsonb            NOT NULL DEFAULT '[]'::jsonb,
  "committed_at"   timestamptz,
  "state"          cue_stack_state  NOT NULL DEFAULT 'pending'
);
--> statement-breakpoint
CREATE INDEX "cue_stacks_player_idx"       ON "cue_stacks" ("player_id");
--> statement-breakpoint
CREATE INDEX "cue_stacks_player_state_idx" ON "cue_stacks" ("player_id", "state");
--> statement-breakpoint
ALTER TABLE "cue_stacks" ADD CONSTRAINT "cs_state_committed_at_chk"
  CHECK (
    (state = 'pending' AND committed_at IS NULL)
    OR (state IN ('committed', 'executing', 'resolved') AND committed_at IS NOT NULL)
  );
--> statement-breakpoint
ALTER TABLE "cue_stacks" ADD CONSTRAINT "cs_slots_length_chk"
  CHECK (jsonb_array_length(slots) = 0 OR jsonb_array_length(slots) BETWEEN 4 AND 8);
--> statement-breakpoint

-- ===== Table 3 : autonomy_reports =====
CREATE TABLE "autonomy_reports" (
  "report_id"        uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  "lieutenant_id"    uuid         NOT NULL REFERENCES "lieutenant"("lieutenant_id") ON DELETE CASCADE,
  "player_id"        uuid         NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "cycle_id"         integer      NOT NULL,
  "issues"           jsonb        NOT NULL DEFAULT '[]'::jsonb,
  "player_decision"  jsonb,
  "emitted_at"       timestamptz  NOT NULL DEFAULT now(),
  "resolved_at"      timestamptz
);
--> statement-breakpoint
CREATE INDEX "autonomy_reports_player_idx"            ON "autonomy_reports" ("player_id");
--> statement-breakpoint
CREATE INDEX "autonomy_reports_player_lieutenant_idx" ON "autonomy_reports" ("player_id", "lieutenant_id");
--> statement-breakpoint
CREATE INDEX "autonomy_reports_player_cycle_idx"      ON "autonomy_reports" ("player_id", "cycle_id");
--> statement-breakpoint
CREATE INDEX "autonomy_reports_player_unresolved_idx"
  ON "autonomy_reports" ("player_id", "emitted_at")
  WHERE "player_decision" IS NULL;
--> statement-breakpoint
ALTER TABLE "autonomy_reports" ADD CONSTRAINT "ar_cycle_id_chk"     CHECK (cycle_id >= 0);
--> statement-breakpoint
ALTER TABLE "autonomy_reports" ADD CONSTRAINT "ar_issues_length_chk"
  CHECK (jsonb_array_length(issues) BETWEEN 1 AND 5);
