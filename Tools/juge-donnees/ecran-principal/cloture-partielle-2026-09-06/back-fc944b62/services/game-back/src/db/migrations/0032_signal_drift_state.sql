-- 0032_signal_drift_state.sql — schema_lieutenant.md §18 (signal_drift_state, Phase-22 L2a Signal Drift, Idea
--   #signal-drift). PALIMPSEST §3.2 (forward-only).
-- IMPLEMENTS: Phase 22 / L2a Signal Drift backend (docs/superpowers/specs/2026-06-10-phase-22-signal-drift-backend-design.md
--             §3.1) / Task 1. R9.3: this matches src/db/schema/signal_drift.ts byte-for-byte. ONLY ADDS — no existing
--             table/column/enum is redefined or dropped: 1 NEW table signal_drift_state, a 1-1 CHILD of "lieutenant"
--             (PK = FK lieutenant_id, ON DELETE CASCADE — the cue-reliability registry dies with its lieutenant). This is
--             a CREATE, NOT an ALTER: the 7 canonical lieutenant tables (0004) + their later ADDs (0026/0027) +
--             autonomy_ceiling_state (0031) are UNCHANGED (git diff = empty except this new table). The table is created
--             AFTER "lieutenant" (FK ordering) — it is the second 1-1 child of lieutenant (after autonomy_ceiling_state).
--             NB R9.3: canon 09 sketches a fine-grain `lieutenant_cue_registry` (composite PK) never migrated; L2a takes a
--             1-1 jsonb signal_drift_state (coherent with autonomy_ceiling_state) — flagged for the 09 backport reconcile.
-- COLUMNS (BO-only — the hits/misses counters inside `registry` are a PRIVATE measurement ledger; the player surface only
--   ever sees the derived cue_bands (ReliabilityBucket) + drift_phase, never the raw counters — R2.2 / P4-P5):
--   archetype_key       : the archetype this drift state was SEEDED from (text). Seed-provenance / audit ONLY — the cue
--                         math always uses the caller's `archetype` argument, never this stored key (mirror autonomy).
--   registry            : the CueReliabilityRegistry (jsonb) — { generation_strategy, entries: { <CueKind>: { hits,
--                         misses, reliability_bucket, contaminated } } }. Defaults to an EMPTY '{}' — the service LAZILY
--                         seeds the 5-CueKind SEEDED registry (DIRECT_ORDER=reliable) on the first observe/getState, then
--                         writes it back; a lieutenant that never observes keeps the empty '{}' (no eager seed at recruit
--                         → no write amplification).
--   drift_phase         : the current primacy phase (text, DEFAULT 'DIRECT_ALIGNED'). One of
--                         DIRECT_ALIGNED|DRIFTING|INCIDENTAL_LOCKED|RESETTING. Mutated on a primacy transition.
--   dominant_cue_kind   : the cue currently driving the lieutenant (text, DEFAULT 'DIRECT_ORDER'). Set to the dominant
--                         incidental cue when drift_phase = INCIDENTAL_LOCKED; otherwise the canonical DIRECT_ORDER.
--   window_start_tick   : the anchor of the current observation window (bigint, game_minute space, DEFAULT 0, mirror
--                         autonomy_ceiling_state.last_refresh_tick). The sliding-window counters reset when
--                         tick - window_start_tick crosses the observation window.
--   last_update_tick    : the tick of the last observeOutcome write (bigint, nullable). NULL only before the first observe.
--   last_decision_ticks : the per-(kind:cue) cooldown ledger (jsonb, nullable) — { "<kind>:<cue>": tick }. NULL until the
--                         first applyDecision; the decision cooldown reads it to 409 a too-soon re-decision.
-- INDEX: NONE. signal_drift_state is read + written per-lieutenant by the PK lieutenant_id (the tick has already resolved
--        the player-owned lieutenant); no read filters BY any other column, so no secondary index is warranted day-1
--        (calque schema_lieutenant.md §6 + autonomy_ceiling_state 0031 — the 1-1-by-PK tables add no secondary index).
-- GRANT: app_rw needs UPDATE + DELETE on this NEW table — UPDATE for the read-modify-write registry writes (observe /
--        window-slide / decision), DELETE for the GDPR/retire cleanup (the CASCADE from "lieutenant" covers the normal
--        path, but an explicit DELETE is granted for completeness). SELECT + INSERT come from ALTER DEFAULT PRIVILEGES
--        FOR ROLE mafia IN SCHEMA "public" GRANT SELECT, INSERT ON TABLES TO app_rw (0013 lines 108-109 — see 0031
--        comment [DRIFT M-ch09-DATA-MODEL-R9-3-2] for the corrected mechanism attribution).
CREATE TABLE "signal_drift_state" (
  "lieutenant_id"       uuid         PRIMARY KEY REFERENCES "lieutenant"("lieutenant_id") ON DELETE CASCADE,
  "archetype_key"       text         NOT NULL,
  "registry"            jsonb        NOT NULL DEFAULT '{}'::jsonb,
  "drift_phase"         text         NOT NULL DEFAULT 'DIRECT_ALIGNED',
  "dominant_cue_kind"   text         NOT NULL DEFAULT 'DIRECT_ORDER',
  "window_start_tick"   bigint       NOT NULL DEFAULT 0,
  "last_update_tick"    bigint,
  "last_decision_ticks" jsonb,
  "created_at"          timestamptz  NOT NULL DEFAULT now(),
  "updated_at"          timestamptz  NOT NULL DEFAULT now()
);
--> statement-breakpoint
GRANT UPDATE, DELETE ON "signal_drift_state" TO app_rw;
