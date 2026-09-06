-- migration 0114: live_ops_event_active (04e-B C2 — live-ops activation ledger, G8) + effect_modifier
-- DD-B2 generalization (additive dual-FK on the shared A1 table)
-- Plan: docs/superpowers/plans/2026-07-06-04e-B-liveops-plan.md C2
-- Design: docs/superpowers/specs/2026-07-06-04e-B-liveops-design.md §3.2 (live_ops_event_active shape)
--         + §3.5 (DD-B2 effect_modifier generalization) + §3.8 (NEW enums)
-- Decisions: docs/superpowers/specs/2026-07-06-04e-B-liveops-decisions.md §2.1 (DD-B2 reasoning — the
--         additive dual-FK APPROVED by the controller over the generic `event_active` rename
--         alternative, which is routed as a future consolidation TD instead)
-- Canon: docs/tech/04e_political_events_and_liveops/liveops_event_catalogue.md §Glossary
--         (LiveOpsEventActive "per active event × per player" — reconciled honestly below)
-- R9.3: backported to docs/tech/09_data_model/schema_live_ops_event_active.md (NEW) +
--       docs/tech/09_data_model/schema_effect_modifier.md (UPDATED) — same commit.
--
-- PART 1 — live_ops_event_active (NEW table): the live-ops activation LEDGER, ONE ROW PER ACTIVATION
-- (design §3.2, mirrors political_event_active's own "one row per activation" posture — NOT one row
-- per targeted player). `event_id` is a soft ref (text) to the hard-coded LiveOpsEvent static
-- catalogue entry (live-ops-event-catalogue.ts, C1) — no DB-side LiveOpsEvent table to FK to (same
-- posture as political_event_active/PoliticalEvent). `category` mirrors the static entry's category
-- at activation (avoids a join-back). `cohort_key` is the D1 deterministic predicate hash
-- (cohortKeyFor, cohort-targeting.service.ts — cyrb53 canonical-serialization, design §3.4).
-- `high_impact` mirrors the static entry (cadence rule reads this directly, C5). `started_at`/
-- `ends_at` are REAL-CLOCK timestamps (LiveOpsClockPort, DD-B3) — NOT game-day integers like
-- political_event_active's activated_at_game_day/expires_at_game_day. `ends_at` is nullable: NULL
-- ONLY for E-LO-09 (threshold-exit lifecycle — stress_accumulator ≥ exit_threshold reconciles it,
-- not a clock, design §3.2/§5). `status` is SCHEDULED|ACTIVE — revert = DELETE the row (row-present-
-- means-active, mirrors political_event_active's own convention; C4 builds the real revert path).
--
-- CANON-WORDING RECONCILIATION (honest, design §3.2): canon glossary names LiveOpsEventActive "per
-- active event × per player" (liveops_event_catalogue.md:197). This table is ONE ROW PER ACTIVATION —
-- the per-player dimension is realized as the set of PLAYER-scoped effect_modifier rows (scope_ref =
-- player_id) the SAME activation writes (C2/C4) — the engine's overlay rows ARE the per-player active
-- record. No per-player membership row is persisted here (reconciles liveops_events_and_push.md §3.2
-- "membership cohorte = pas de table 09" too).
--
-- PART 2 — effect_modifier DD-B2 generalization (ADDITIVE touch on the shared A1 table):
--   - ADD nullable live_ops_active_event_id FK -> live_ops_event_active(id) ON DELETE CASCADE.
--   - RELAX active_event_id to nullable (every EXISTING row already has it set — this migration
--     changes ZERO existing row's value; the A2 political apply/revert path stays BYTE-UNCHANGED,
--     still always sets active_event_id, cascade unchanged).
--   - ADD CHECK exactly-one-parent (num_nonnulls(active_event_id, live_ops_active_event_id) = 1) —
--     every existing row (active_event_id set, live_ops_active_event_id NULL by column-add default)
--     satisfies this unchanged (num_nonnulls = 1), so the ADD CONSTRAINT validation over existing
--     rows always succeeds.
--   - ADD INDEX (live_ops_active_event_id) for the live-ops revert-by-event DELETE
--     (EffectModifierService.revertLiveOpsEvent, C2), mirroring the existing active_event_id index
--     used by revertEvent.
-- Zero-regression: the A1 read hot-path (EffectOverlayStore.reload()/applyModifiers) SELECTs
-- scope_type/scope_ref/tunable_key/op/magnitude only — it never reads active_event_id or
-- live_ops_active_event_id (effect-overlay-store.ts:242-251,281) — the byte-identical-when-empty
-- contract is untouched by this migration.

--> statement-breakpoint

-- live_ops_event_category: the canon 7-member enum (liveops_event_catalogue.md §Glossary). Must
-- match live-ops.types.ts's `LiveOpsEventCategory` TS union verbatim (that union predates this pgEnum
-- by one chunk, C1 — this is its first DB-side materialization).
CREATE TYPE "live_ops_event_category" AS ENUM (
  'CITYWIDE',
  'RIVAL_ACTION',
  'MARKET_SHIFT',
  'GLASS_EVENT',
  'COMPRESSION_PREP',
  'SALTLINE_WINDFALL',
  'AUDIT_OPPORTUNITY'
);

--> statement-breakpoint

-- live_ops_active_status: a scheduled-future activation vs a live one (design §3.2).
CREATE TYPE "live_ops_active_status" AS ENUM (
  'SCHEDULED',
  'ACTIVE'
);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "live_ops_event_active" (
  "id"           uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id"     text        NOT NULL,
  "category"     live_ops_event_category NOT NULL,
  "cohort_key"   text        NOT NULL,
  "high_impact"  boolean     NOT NULL,
  "started_at"   timestamptz NOT NULL,
  "ends_at"      timestamptz,
  "status"       live_ops_active_status NOT NULL
);

--> statement-breakpoint

-- INDEX (status, ends_at): anticipates the C4 LiveOpsSchedulerService real-clock reconciler's sweep
-- query (`WHERE status='ACTIVE' AND ends_at <= clock.now()`) — added at table-creation time, mirrors
-- A1's own precedent of indexing effect_modifier.expires_at_game_day ahead of its C4 revertExpired
-- consumer in the SAME migration the table was created.
CREATE INDEX "live_ops_event_active_status_ends_at_idx"
  ON "live_ops_event_active" ("status", "ends_at");

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "live_ops_event_active" TO app_rw;

--> statement-breakpoint

-- DD-B2 part 1: ADD the new nullable live-ops parent FK column.
ALTER TABLE "effect_modifier"
  ADD COLUMN IF NOT EXISTS "live_ops_active_event_id" uuid
    REFERENCES "live_ops_event_active"("id") ON DELETE CASCADE;

--> statement-breakpoint

-- DD-B2 part 2: RELAX active_event_id to nullable. Every existing row already has it set — no
-- existing value changes; this is a pure constraint relaxation (the A2 political INSERT path keeps
-- always setting it, byte-unchanged).
ALTER TABLE "effect_modifier"
  ALTER COLUMN "active_event_id" DROP NOT NULL;

--> statement-breakpoint

-- DD-B2 part 3: exactly-one-parent CHECK. Every existing row (active_event_id set,
-- live_ops_active_event_id NULL from the column ADD above) satisfies num_nonnulls = 1 unchanged, so
-- this ADD CONSTRAINT validates cleanly over all pre-existing rows.
ALTER TABLE "effect_modifier"
  ADD CONSTRAINT "effect_modifier_exactly_one_parent_chk"
    CHECK (num_nonnulls("active_event_id", "live_ops_active_event_id") = 1);

--> statement-breakpoint

-- DD-B2 part 4: index for the live-ops revert-by-event DELETE (EffectModifierService.
-- revertLiveOpsEvent, C2), mirroring the existing effect_modifier_active_event_idx used by the
-- political revertEvent.
CREATE INDEX "effect_modifier_live_ops_active_event_idx"
  ON "effect_modifier" ("live_ops_active_event_id");
