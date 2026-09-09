-- 0002_player_progression_state.sql — schema_player_progression_state.md §3/§7. PALIMPSEST §3.2.
-- DDL généré (calque) + CHECK constraints enum-simulés ajoutés à la main (non exprimables côté TS Drizzle).

-- ===== Table 1 : player_progression_state =====
CREATE TABLE "player_progression_state" (
  "player_id"                          uuid PRIMARY KEY REFERENCES "player"("player_id") ON DELETE CASCADE,
  "complexity_budget_cap"              integer  NOT NULL DEFAULT 100,
  "complexity_budget_used"             integer  NOT NULL DEFAULT 0,
  "decision_horizon_tier"              smallint NOT NULL DEFAULT 1,
  "rule_vocabulary_tier"               smallint NOT NULL DEFAULT 1,
  "structural_decisions_this_session"  integer  NOT NULL DEFAULT 0,
  "last_session_id"                    uuid,
  "org_stress"                         integer  NOT NULL DEFAULT 0,
  "compression_week_state"             varchar(16) NOT NULL DEFAULT 'none'
);
--> statement-breakpoint
ALTER TABLE "player_progression_state"
  ADD CONSTRAINT "pps_compression_week_state_chk"
  CHECK ("compression_week_state" IN ('none', 'warning', 'active'));
--> statement-breakpoint
ALTER TABLE "player_progression_state"
  ADD CONSTRAINT "pps_complexity_budget_used_chk"
  CHECK ("complexity_budget_used" >= 0);
--> statement-breakpoint
ALTER TABLE "player_progression_state"
  ADD CONSTRAINT "pps_complexity_budget_cap_chk"
  CHECK ("complexity_budget_cap" > 0);
--> statement-breakpoint
ALTER TABLE "player_progression_state"
  ADD CONSTRAINT "pps_decision_horizon_tier_chk"
  CHECK ("decision_horizon_tier" BETWEEN 1 AND 3);
--> statement-breakpoint
ALTER TABLE "player_progression_state"
  ADD CONSTRAINT "pps_rule_vocabulary_tier_chk"
  CHECK ("rule_vocabulary_tier" BETWEEN 1 AND 6);
--> statement-breakpoint
ALTER TABLE "player_progression_state"
  ADD CONSTRAINT "pps_structural_decisions_chk"
  CHECK ("structural_decisions_this_session" >= 0);
--> statement-breakpoint
ALTER TABLE "player_progression_state"
  ADD CONSTRAINT "pps_org_stress_chk"
  CHECK ("org_stress" >= 0);
--> statement-breakpoint

-- ===== Table 2 : mastery_score =====
CREATE TABLE "mastery_score" (
  "player_id"                  uuid    NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "category_id"                integer NOT NULL,
  "mastery_score"              smallint NOT NULL DEFAULT 0,
  "delegation_state"           varchar(16) NOT NULL DEFAULT 'SELF',
  "delegated_to_lieutenant_id" uuid,
  "graduated_at"               timestamptz,
  PRIMARY KEY ("player_id", "category_id")
);
--> statement-breakpoint
ALTER TABLE "mastery_score"
  ADD CONSTRAINT "ms_mastery_score_chk"
  CHECK ("mastery_score" BETWEEN 0 AND 100);
--> statement-breakpoint
ALTER TABLE "mastery_score"
  ADD CONSTRAINT "ms_delegation_state_chk"
  CHECK ("delegation_state" IN ('SELF', 'DELEGATED', 'RETIRED'));
--> statement-breakpoint
ALTER TABLE "mastery_score"
  ADD CONSTRAINT "ms_delegated_payload_chk"
  CHECK (
    ("delegation_state" <> 'DELEGATED') OR
    ("delegation_state" = 'DELEGATED' AND "delegated_to_lieutenant_id" IS NOT NULL)
  );
--> statement-breakpoint
CREATE INDEX "mastery_score_player_delegation_idx" ON "mastery_score" ("player_id", "delegation_state");
