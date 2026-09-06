-- 0031_autonomy_ceiling_state.sql — schema_lieutenant.md §17 (autonomy_ceiling_state, Phase-19 L1a Autonomy Ceiling, Idea
--   #36). PALIMPSEST §3.2 (forward-only).
-- IMPLEMENTS: Phase 19 / L1a Autonomy Ceiling backend (docs/tech/07_lieutenants_and_behavior/autonomy_ceiling.md, Idea #36)
--             / Task 1. R9.3: this matches src/db/schema/autonomy_ceiling.ts byte-for-byte. ONLY ADDS — no existing
--             table/column/enum is redefined or dropped: 1 NEW table autonomy_ceiling_state, a 1-1 CHILD of "lieutenant"
--             (PK = FK lieutenant_id, ON DELETE CASCADE — the budget dies with its lieutenant). This is a CREATE, NOT an
--             ALTER: the 7 canonical lieutenant tables (0004) + their later ADDs (0026/0027) are UNCHANGED (git diff =
--             empty except this new table). The table is created AFTER "lieutenant" (FK ordering) — 0031 is the first
--             migration to add a 1-1 child of lieutenant.
-- COLUMNS (BO-only — the whole budget is a PRIVATE delegation ledger; the player surface only ever sees the derived
--   AutonomyBucketComposite, never these rows — R2.2):
--   archetype_key     : the archetype this budget was SEEDED from (text). Seed-provenance / audit ONLY — the category math
--                       always uses the caller's `archetype` argument, never this stored key (see autonomy-category.ts).
--   budget            : the per-category delegation budget (jsonb). Defaults to an EMPTY '{}' — the service LAZILY seeds the
--                       7-category Budget object on the first checkAndConsume/decision (seedBudget), then writes it back; a
--                       lieutenant that never gates keeps the empty '{}' (no eager seed at recruit → no write amplification).
--   cycle_id          : the refresh cycle counter (integer, DEFAULT 0, CHECK >= 0 — monotone non-negative). Bumped by the
--                       tick-aligned refresh.
--   last_refresh_tick : the anchor of the current refresh window (bigint, game_minute space, mirror operational_chain.ts
--                       *_at_tick). NULL only transiently before the first seed write.
--   last_decision_ref : the last AutonomyDecision applied (uuid, nullable). Audit pointer only.
-- INDEX: NONE. autonomy_ceiling_state is read + written per-lieutenant by the PK lieutenant_id (the tick has already
--        resolved the player-owned lieutenant); no read filters BY any other column, so no secondary index is warranted
--        day-1 (calque schema_lieutenant.md §6 — the 1-1-by-PK tables add no secondary index).
-- GRANT: app_rw needs UPDATE + DELETE on this NEW table — UPDATE for the read-modify-write budget writes (decrement /
--        refresh / decision), DELETE for the GDPR/retire cleanup (the CASCADE from "lieutenant" covers the normal path, but
--        an explicit DELETE is granted for completeness). SELECT + INSERT come from ALTER DEFAULT PRIVILEGES FOR ROLE mafia
--        IN SCHEMA "public" GRANT SELECT, INSERT ON TABLES TO app_rw (0013 lines 108-109 — the real mechanism for tables
--        created AFTER the initial run; the "GRANT ON ALL TABLES" at 0013 line 54 only covers tables existing at that time).
--        [DRIFT M-ch09-DATA-MODEL-R9-3-2 2026-06-12: prior comment cited "table-wide GRANT … covers tables created later" —
--        the actual mechanism is ALTER DEFAULT PRIVILEGES, not GRANT ON ALL TABLES]
CREATE TABLE "autonomy_ceiling_state" (
  "lieutenant_id"     uuid         PRIMARY KEY REFERENCES "lieutenant"("lieutenant_id") ON DELETE CASCADE,
  "archetype_key"     text         NOT NULL,
  "budget"            jsonb        NOT NULL DEFAULT '{}'::jsonb,
  "cycle_id"          integer      NOT NULL DEFAULT 0,
  "last_refresh_tick" bigint,
  "last_decision_ref" uuid,
  "created_at"        timestamptz  NOT NULL DEFAULT now(),
  "updated_at"        timestamptz  NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "autonomy_ceiling_state" ADD CONSTRAINT "acs_cycle_id_chk" CHECK (cycle_id >= 0);
--> statement-breakpoint
GRANT UPDATE, DELETE ON "autonomy_ceiling_state" TO app_rw;
