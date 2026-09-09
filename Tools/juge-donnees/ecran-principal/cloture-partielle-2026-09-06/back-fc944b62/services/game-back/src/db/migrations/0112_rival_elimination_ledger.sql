-- migration 0112: rival_elimination_ledger (04e-A2 C3 — state-driven trigger evaluators + ledgers)
-- Plan: docs/superpowers/plans/2026-07-05-04e-A2-political-events-plan.md C3
-- Design: docs/superpowers/specs/2026-07-04-04e-A-political-engine-design.md §6.2a ("no persisted
--         rival-elimination count — RivalEliminatedEvent fires but no ledger. Build a small
--         subscriber -> a rival_elimination_ledger (player_id, game_minute) and derive '2+ in 6 months'")
-- Decisions: docs/superpowers/specs/2026-07-05-04e-A2-political-events-decisions.md §5 (migration
--         allocation)
-- Canon: docs/tech/04e_political_events_and_liveops/political_event_catalogue.md :161 (E-POL-11
--        trigger: "... AND 2+ rival eliminations in past 6 months")
-- R9.3: backported to docs/tech/09_data_model/schema_rival_elimination_ledger.md same-commit.
-- Zero-regression: ADDITIVE only. No existing table/column modified.
--
-- rival_elimination_ledger: one row per REAL `RivalEliminatedEvent` (city-event-bus.ts:1327-1334,
-- emitted by RivalEliminationService.executeElimination AFTER its 4-penalty SERIALIZABLE tx commits).
-- The event already fired before this migration but was NEVER persisted — E-POL-11's "2+ rival
-- eliminations in past 6 months" trigger half had no real source. `political-rival-elimination-
-- ledger.service.ts`'s onModuleInit bus subscriber (C3) is the ONLY writer.
--
-- rival_key: REUSES the existing `rival_key` pgEnum (migration 0081, conflict_rival.ts) — not
-- re-declared here. NO FK to rival_state (soft-ref by enum domain only, the same discipline
-- rival_holding/rival_pair_pressure already use for rival_key) — this ledger is a permanent
-- historical record that must outlive any per-player rival_state row churn.
--
-- game_minute: verbatim RivalEliminatedEvent.gameMinute. The E-POL-11 rolling-window count is
-- computed over this column (a 6-in-game-month window = political_events.month_minutes x 6, a
-- canon-literal constant, not a NEW tunable — see political-trigger-evaluators.ts).
--
-- compounding_penalty_bucket: the qualitative bucket the event also carries (R2.2 — never a raw
-- multiplier) — persisted for BO/diagnostic read-back only, not consumed by the E-POL-11 predicate.

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "rival_elimination_ledger" (
  "id"                          uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"                   uuid        NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "rival_key"                   rival_key   NOT NULL,
  "game_minute"                 integer     NOT NULL,
  "compounding_penalty_bucket"  text        NOT NULL,
  "created_at"                  timestamptz NOT NULL DEFAULT now()
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "rival_elimination_ledger_player_minute_idx"
  ON "rival_elimination_ledger" ("player_id", "game_minute");

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "rival_elimination_ledger" TO app_rw;
