-- migration 0135: delegation_ratchet (P3-F C1 — Delegation Ratchet data model, ch06 MÈRE)
-- Plan: docs/superpowers/plans/2026-07-18-p3-F-delegation-ratchet-plan.md C1
-- Design: docs/superpowers/specs/2026-07-18-p3-F-delegation-ratchet-design.md §3 (data model, verbatim)
--         + §8.2 (graduation tx) + §9.1 (recall tx) + §10.1-10.3 (recall-debt freeze/accrual/realization)
-- Decisions: docs/superpowers/specs/2026-07-18-p3-F-delegation-ratchet-decisions.md D13 (append-only
--         graduation_events, applicative discipline) + D10 (promotion_locks — canon INACTIVE = no row,
--         divergence #4) + D8/D9 (player_proficiency — frozen proficiency + session-id idempotency guard)
-- C0 re-anchor: docs/superpowers/specs/2026-07-18-p3-F-C0-reanchor.md §1 (journal head 134 confirmed,
--         this branch takes idx 135, no renumber pending at authoring time).
-- R9.3: backported to docs/tech/09_data_model/schema_core_loops.md §15 (NEW tables) + same commit.
--
-- ★ CENTRAL MANDATE reminder (design header): `mastery_score` (ch09 mig 0002) is ACTIVATED, not touched,
-- by this migration — zero column/CHECK change to `player_progression_state`/`mastery_score`. This
-- migration creates the 3 tables ch09/canon already REFERENCE but never define (`graduation_events` —
-- `schema_player_progression_state.md:297/:611`, `graduated_retirement_pivot.md:310`) plus the 2 new
-- Promotion Lock / Recall Debt tables (design §9/§10).
--
-- "graduation_events" (design §3, D13): the SINGLE append-only audit spine of the ratchet — BOTH
--   directions (`event_kind: 'GRADUATION'|'RECALL'`) in ONE table (no separate recall log). Canon
--   `GraduationEvent.reversed_at` is DERIVED (a later RECALL row for the same (player,category)), never a
--   mutable column on an append-only log (D13). Applicative append-only v1 (INSERT-only repository, no
--   update/delete methods at the service layer — the `structural_decisions_audit` discipline; a DB-level
--   REVOKE trigger is a deferred TD, consistent with prior lots never adding one at C1 either).
--
-- "promotion_locks" (design §3/§9, D10): ONE ROW PER RECALL — canon `UnmanagedWindowState.INACTIVE` = NO
--   ROW (divergence #4, the SAME "row-presence IS the state" convention `compression_events`/
--   `friction_budget_state` establish elsewhere in this chapter). `unmanaged_window_state` is therefore a
--   2-value CHECK (`ACTIVE`/`CLOSED`), not 3 — INACTIVE never persists. Index
--   `(unmanaged_window_state, window_end_tick)` is the HOURLY `PROMOTION_LOCK_TICK`'s (C8) own batch-close
--   query shape (canon F4 index transposed, `compression_events_non_terminal_idx`-adjacent precedent).
--
-- "player_proficiency" (design §3/§10, D8/D9): PK composite `(player_id, category_id)` — the SAME shape
--   `mastery_score` itself uses (a 1-row-per-(player,category) ledger, not append-only — this is the
--   FROZEN-then-realized state, not a history). `last_accrued_session_id` is the D9/D14 idempotency guard
--   (a replayed `SessionClosedEvent` is a zero-write — the `last_weekly_reset_epoch`/`last_accrued_
--   session_id` class of watermark this repo already establishes at mig 0123/mig 0134). Canon's
--   `recall_debt_per_session` column is NOT persisted here (it is the live tunable value, freezing a copy
--   per-row would be syncing a tunable into a column — dropped as redundant, divergence #3).
--
-- ZERO pgEnum NEW (D1-lot-wide convention, P3-C/P3-D/P3-E precedent reconduced): `event_kind`/
-- `unmanaged_window_state`/`fallback_quality_bucket` are all varchar+CHECK — closed-but-small value sets
-- that mirror the `compression_events.state`/`mastery_score.delegation_state` convention exactly, never a
-- native PG enum (this repo's own R9.3 ch09 convention for this class of bounded string).
--
-- GRANTs mirror the mig 0132/0133/0134 pattern (app_rw least-privilege runtime role — UPDATE explicit;
-- SELECT + INSERT auto-granted via mig 0013's ALTER DEFAULT PRIVILEGES). `graduation_events` is
-- INSERT-only from the application's own repository discipline (D13) but still receives the SAME `GRANT
-- UPDATE` as every sibling table in this chapter — a future BO annotation column (TD-routed) would need
-- it, and withholding it here would be a bespoke exception to the chapter-wide GRANT convention for no
-- schema-level reason (the append-only discipline is enforced applicatively, not by revoking UPDATE).

--> statement-breakpoint

-- ===== graduation_events (design §3/D13 — the single append-only audit spine, BOTH directions) =====
CREATE TABLE IF NOT EXISTS "graduation_events" (
  "event_id"               uuid          NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"               uuid          NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "category_id"             integer       NOT NULL,
  "event_kind"              varchar(16)   NOT NULL,
  "lieutenant_id"            uuid,
  "seed_decisions_n"         smallint,
  "script_seed_hash"         varchar(64),
  "mastery_at_event"         smallint      NOT NULL,
  "successor_category_id"    integer,
  "reversal_cost"            jsonb,
  "session_ref"              uuid,
  "game_tick"                bigint        NOT NULL,
  "created_at"               timestamptz   NOT NULL DEFAULT now()
);

--> statement-breakpoint

ALTER TABLE "graduation_events"
  ADD CONSTRAINT "graduation_events_event_kind_chk"
  CHECK ("event_kind" IN ('GRADUATION', 'RECALL'));

--> statement-breakpoint

-- BO-only raw snapshot (R2.2 — never surfaced to the player as a scalar), same bound as mastery_score
-- itself (mig 0002 ms_mastery_score_chk) — a snapshot of that column can never exceed its own domain.
ALTER TABLE "graduation_events"
  ADD CONSTRAINT "graduation_events_mastery_at_event_chk"
  CHECK ("mastery_at_event" BETWEEN 0 AND 100);

--> statement-breakpoint

-- The append-only log's own primary read pattern (design §11/§12 — "paginated append-only log, filters
-- player/category/kind", "GET .../graduation-events" newest-first).
CREATE INDEX "graduation_events_player_created_idx"
  ON "graduation_events" ("player_id", "created_at" DESC);

--> statement-breakpoint

-- Per-category history scan (design §7 seed-depth extractor precedent shape; §9.1 step 3
-- `computeFallbackBucket`'s "derived from graduation_events" double-recall lookup; §12
-- "filters player/category").
CREATE INDEX "graduation_events_player_category_idx"
  ON "graduation_events" ("player_id", "category_id");

--> statement-breakpoint

GRANT UPDATE ON "graduation_events" TO app_rw; -- SELECT/INSERT auto-grantés (0013 ALTER DEFAULT PRIVILEGES)

--> statement-breakpoint

-- ===== promotion_locks (design §3/§9, D10 — ONE ROW PER RECALL, canon INACTIVE = no row) =====
CREATE TABLE IF NOT EXISTS "promotion_locks" (
  "lock_id"                              uuid          NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"                            uuid          NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "category_id"                          integer       NOT NULL,
  "recalled_lt_id"                        uuid,
  "unmanaged_window_state"                varchar(16)   NOT NULL DEFAULT 'ACTIVE',
  "window_start_tick"                     bigint        NOT NULL,
  "window_end_tick"                       bigint        NOT NULL,
  "suspended_higher_order_category_id"    integer,
  "fallback_quality_bucket"               varchar(16)   NOT NULL,
  "reversal_cost"                         jsonb         NOT NULL,
  "accord_degradation_applied"            boolean       NOT NULL DEFAULT false,
  "closed_at"                             timestamptz,
  "created_at"                            timestamptz   NOT NULL DEFAULT now()
);

--> statement-breakpoint

-- Canon `UnmanagedWindowState.INACTIVE` = NO ROW (divergence #4) — this CHECK is therefore 2-valued,
-- deliberately never 3.
ALTER TABLE "promotion_locks"
  ADD CONSTRAINT "promotion_locks_unmanaged_window_state_chk"
  CHECK ("unmanaged_window_state" IN ('ACTIVE', 'CLOSED'));

--> statement-breakpoint

ALTER TABLE "promotion_locks"
  ADD CONSTRAINT "promotion_locks_fallback_quality_bucket_chk"
  CHECK ("fallback_quality_bucket" IN ('LOW', 'DEGRADED', 'MINIMAL'));

--> statement-breakpoint

-- The C8 `PROMOTION_LOCK_TICK` (HOURLY) batch-close query shape (canon F4 index transposed) — set-based
-- "close every ACTIVE row whose window_end_tick <= now".
CREATE INDEX "promotion_locks_window_state_end_idx"
  ON "promotion_locks" ("unmanaged_window_state", "window_end_tick");

--> statement-breakpoint

-- OBLIGATOIRE 1-N FK index (Task 3 §5.1 convention) — the recall-history/re-delegation-penalty lookup
-- (design §12 "filter ACTIVE"; D12 "any promotion_locks row, ACTIVE or CLOSED" re-graduation check).
CREATE INDEX "promotion_locks_player_category_idx"
  ON "promotion_locks" ("player_id", "category_id");

--> statement-breakpoint

GRANT UPDATE ON "promotion_locks" TO app_rw; -- SELECT/INSERT auto-grantés (0013 ALTER DEFAULT PRIVILEGES)

--> statement-breakpoint

-- ===== player_proficiency (design §3/§10, D8/D9 — frozen-then-realized per (player,category)) =====
CREATE TABLE IF NOT EXISTS "player_proficiency" (
  "player_id"                  uuid          NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "category_id"                integer       NOT NULL,
  "player_proficiency"          smallint      NOT NULL,
  "recall_debt_total"           smallint      NOT NULL DEFAULT 0,
  "recovery_period_remaining"   smallint      NOT NULL DEFAULT 0,
  "last_accrued_session_id"     uuid,
  "updated_at"                  timestamptz   NOT NULL DEFAULT now(),
  PRIMARY KEY ("player_id", "category_id")
);

--> statement-breakpoint

-- Frozen mastery snapshot — same domain as mastery_score.mastery_score itself (mig 0002).
ALTER TABLE "player_proficiency"
  ADD CONSTRAINT "player_proficiency_player_proficiency_chk"
  CHECK ("player_proficiency" BETWEEN 0 AND 100);

--> statement-breakpoint

ALTER TABLE "player_proficiency"
  ADD CONSTRAINT "player_proficiency_recall_debt_total_chk"
  CHECK ("recall_debt_total" >= 0);

--> statement-breakpoint

ALTER TABLE "player_proficiency"
  ADD CONSTRAINT "player_proficiency_recovery_period_remaining_chk"
  CHECK ("recovery_period_remaining" >= 0);

--> statement-breakpoint

-- BO "in recovery" queries (design §12 canon F4 index) — categories currently decrementing back to 0.
CREATE INDEX "player_proficiency_player_recovery_idx"
  ON "player_proficiency" ("player_id", "recovery_period_remaining");

--> statement-breakpoint

GRANT UPDATE ON "player_proficiency" TO app_rw; -- SELECT/INSERT auto-grantés (0013 ALTER DEFAULT PRIVILEGES)
