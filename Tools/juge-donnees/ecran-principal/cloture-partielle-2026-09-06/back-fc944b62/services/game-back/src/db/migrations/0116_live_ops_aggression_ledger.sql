-- migration 0116: live_ops_aggression_ledger (04e-B C6 — AggressionScoreBucket composite, G8)
-- Plan: docs/superpowers/plans/2026-07-06-04e-B-liveops-plan.md C6 (renumbered 0115 -> 0116 by DD-B4
--         §5 — DD-B4's C5-fix took 0115 for the live_ops_active_status ENDED enum member)
-- Design: docs/superpowers/specs/2026-07-06-04e-B-liveops-design.md §3.6 (live_ops_aggression_ledger)
--         + §13 (migration renumbering table)
-- Canon: docs/tech/04e_political_events_and_liveops/liveops_event_catalogue.md :108-117 (E-LO-06 —
--        "players with high recent aggression score (4+ violent ops in 7 days)"; "Note R2.2-borderline
--        ... Composite: AggressionScoreBucket (peaceful|active|aggressive|violent_spree). Trigger =
--        bucket >= aggressive AND 4+ violent ops in 7 days. Internal scalar count, exposed only as
--        bucket.")
-- R9.3: backported to docs/tech/09_data_model/schema_live_ops_aggression_ledger.md (NEW) — same commit.
-- Zero-regression: ADDITIVE only. No existing table/column modified.
--
-- live_ops_aggression_ledger: one row per REAL violent op (`AssaultCascadeCompletedEvent`,
-- city-event-bus.ts, emitted by ConflictOrchestratorService.recordAssaultCascade AFTER its 5-layer
-- SERIALIZABLE §9.1 cascade tx commits, 04b-B C-cas). The event already fires on the bus but was NEVER
-- persisted before this migration — E-LO-06's "4+ violent ops in 7 days" targeting half (catalogue.md
-- :111) had no real source. This table + `live-ops-aggression-ledger.service.ts`'s onModuleInit bus
-- subscriber (C6) give it one: every REAL AssaultCascadeCompletedEvent appends exactly one row.
--
-- occurred_at: timestamptz, NOT an in-game `game_minute` integer (unlike A2's rival_elimination_ledger)
-- -- consistent with THIS chapter's own real-clock discipline (DD-B3): live-ops durations/windows are
-- REAL calendar days, so the windowed "4+ ops in 7 real days" count is computed over occurred_at vs
-- LiveOpsClockPort.now() (never Date.now() inline in production code) -- mirrors
-- live_ops_event_active.started_at's own real-clock convention (migration 0114).
--
-- R2.2: the raw windowed COUNT over this table is INTERNAL only (AggressionScoreBucketService,
-- cohort-targeting.service.ts) -- ONLY the derived AggressionScoreBucket enum (peaceful|active|
-- aggressive|violent_spree, a plain TS union, NOT persisted as a column here -- bucketized at
-- read-time from the count, never stored) may ever reach a controller response.

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "live_ops_aggression_ledger" (
  "id"          uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"   uuid        NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "occurred_at" timestamptz NOT NULL
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "live_ops_aggression_ledger_player_occurred_idx"
  ON "live_ops_aggression_ledger" ("player_id", "occurred_at");

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "live_ops_aggression_ledger" TO app_rw;
