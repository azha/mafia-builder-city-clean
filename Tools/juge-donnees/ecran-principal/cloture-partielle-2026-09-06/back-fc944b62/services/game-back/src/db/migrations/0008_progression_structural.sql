-- 0008_progression_structural.sql — schema_progression_structural.md §3/§7. PALIMPSEST §3.2.
-- DDL généré (calque) + CHECK constraints + partial indexes. FK player_id CASCADE.

-- ===== Enums PG natifs (CREATE TYPE) =====
CREATE TYPE "constraint_severity"           AS ENUM ('mild', 'moderate', 'binding');
--> statement-breakpoint
CREATE TYPE "possibility_card_view_status"  AS ENUM ('unseen', 'seen', 'deferred', 'adopted');
--> statement-breakpoint

-- ===== Table 1 : constraint_log =====
CREATE TABLE "constraint_log" (
  "constraint_id"     uuid                  PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"         uuid                  NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "constraint_type"   integer               NOT NULL,
  "affected_domain"   integer               NOT NULL,
  "severity"          constraint_severity   NOT NULL,
  "added_at"          timestamptz           NOT NULL DEFAULT now(),
  "knot_id"           uuid
);
--> statement-breakpoint
CREATE INDEX "constraint_log_player_idx"           ON "constraint_log" ("player_id");
--> statement-breakpoint
CREATE INDEX "constraint_log_player_added_idx"     ON "constraint_log" ("player_id", "added_at");
--> statement-breakpoint
CREATE INDEX "constraint_log_player_severity_idx"  ON "constraint_log" ("player_id", "severity");
--> statement-breakpoint
CREATE INDEX "constraint_log_player_knot_idx"      ON "constraint_log" ("player_id", "knot_id");
--> statement-breakpoint
ALTER TABLE "constraint_log" ADD CONSTRAINT "cl_constraint_type_chk"  CHECK (constraint_type >= 0);
--> statement-breakpoint
ALTER TABLE "constraint_log" ADD CONSTRAINT "cl_affected_domain_chk"  CHECK (affected_domain >= 0);
--> statement-breakpoint

-- ===== Table 2 : possibility_horizon_cards =====
CREATE TABLE "possibility_horizon_cards" (
  "card_id"        uuid                            PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"      uuid                            NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "capability_id"  integer                         NOT NULL,
  "surfaced_at"    timestamptz                     NOT NULL DEFAULT now(),
  "view_status"    possibility_card_view_status    NOT NULL DEFAULT 'unseen',
  "adopted_at"     timestamptz
);
--> statement-breakpoint
CREATE INDEX "possibility_horizon_cards_player_idx"             ON "possibility_horizon_cards" ("player_id");
--> statement-breakpoint
CREATE INDEX "possibility_horizon_cards_player_view_status_idx" ON "possibility_horizon_cards" ("player_id", "view_status");
--> statement-breakpoint
CREATE INDEX "possibility_horizon_cards_player_capability_idx"  ON "possibility_horizon_cards" ("player_id", "capability_id");
--> statement-breakpoint
CREATE INDEX "possibility_horizon_cards_player_surfaced_idx"    ON "possibility_horizon_cards" ("player_id", "surfaced_at");
--> statement-breakpoint
ALTER TABLE "possibility_horizon_cards" ADD CONSTRAINT "phc_capability_id_chk"        CHECK (capability_id >= 0);
--> statement-breakpoint
ALTER TABLE "possibility_horizon_cards" ADD CONSTRAINT "phc_view_status_adopted_at_chk"
  CHECK (
    (view_status = 'adopted' AND adopted_at IS NOT NULL)
    OR (view_status IN ('unseen', 'seen', 'deferred') AND adopted_at IS NULL)
  );
--> statement-breakpoint

-- ===== Table 3 : recurrence_logs =====
CREATE TABLE "recurrence_logs" (
  "player_id"        uuid         NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "category_id"      integer      NOT NULL,
  "histogram"        jsonb        NOT NULL DEFAULT '[]'::jsonb,
  "last_updated_at"  timestamptz  NOT NULL DEFAULT now(),
  "momentum_gauge"   real         NOT NULL DEFAULT 0,
  PRIMARY KEY ("player_id", "category_id")
);
--> statement-breakpoint
CREATE INDEX "recurrence_logs_player_idx"          ON "recurrence_logs" ("player_id");
--> statement-breakpoint
CREATE INDEX "recurrence_logs_player_updated_idx"  ON "recurrence_logs" ("player_id", "last_updated_at");
--> statement-breakpoint
ALTER TABLE "recurrence_logs" ADD CONSTRAINT "rl_category_id_chk"      CHECK (category_id >= 0);
--> statement-breakpoint
ALTER TABLE "recurrence_logs" ADD CONSTRAINT "rl_momentum_gauge_chk"   CHECK (momentum_gauge BETWEEN 0.0 AND 1.0);
--> statement-breakpoint
ALTER TABLE "recurrence_logs" ADD CONSTRAINT "rl_histogram_length_chk"
  CHECK (jsonb_array_length(histogram) = 0 OR jsonb_array_length(histogram) = 12);
--> statement-breakpoint

-- ===== Table 4 : structural_decisions_audit =====
CREATE TABLE "structural_decisions_audit" (
  "decision_id"            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"              uuid         NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "decision_type"          integer      NOT NULL,
  "decided_at"             timestamptz  NOT NULL DEFAULT now(),
  "before_state"           jsonb        NOT NULL DEFAULT '{}'::jsonb,
  "after_state"            jsonb        NOT NULL DEFAULT '{}'::jsonb,
  "triggered_extinction"   boolean      NOT NULL DEFAULT false,
  "triggered_recall_debt"  boolean      NOT NULL DEFAULT false
);
--> statement-breakpoint
CREATE INDEX "structural_decisions_audit_player_idx"         ON "structural_decisions_audit" ("player_id");
--> statement-breakpoint
CREATE INDEX "structural_decisions_audit_player_decided_idx" ON "structural_decisions_audit" ("player_id", "decided_at");
--> statement-breakpoint
CREATE INDEX "structural_decisions_audit_player_type_idx"    ON "structural_decisions_audit" ("player_id", "decision_type");
--> statement-breakpoint
CREATE INDEX "structural_decisions_audit_extinction_partial_idx"
  ON "structural_decisions_audit" ("player_id", "decided_at")
  WHERE "triggered_extinction" = true;
--> statement-breakpoint
CREATE INDEX "structural_decisions_audit_recall_debt_partial_idx"
  ON "structural_decisions_audit" ("player_id", "decided_at")
  WHERE "triggered_recall_debt" = true;
--> statement-breakpoint
ALTER TABLE "structural_decisions_audit" ADD CONSTRAINT "sda_decision_type_chk"  CHECK (decision_type >= 0);
