-- migration 0145: exception_queue_refusal (W1.1-d C5 — the silent-cap refusal TRACE, closes TD-203)
-- Renumbered 0144→0145 at cumulative-branch merge (W1.1-a's 0143_onboarding_funnel_state, designed
-- first, keeps 0143 — see docs/superpowers/specs/2026-08-09-w1.1-cumul-merge-notes.md).
-- Design: docs/superpowers/specs/2026-08-09-w1.1d-world-turns-design.md §C5 (I6) — the exception_queue
--         insertion cap (`ExceptionsRepository#insert`, ≥20 pending per (player,lieutenant) → refuse-
--         insert, D5, P3-A C3) is a SILENT drop: the caller discards the `null` return (D3, byte-untouched
--         producers), only a `logger.warn` survives — no queryable trace, nothing that outlives a restart.
--         "Combien refusées, par quel producteur" is currently unanswerable. TD-203 (docs_int/
--         tech_debt_inventory.md) already names this exact gap under the name `cap_refusal_log`.
-- R9.3: same-commit addendum docs/tech/09_data_model/schema_queues_exceptions_cuestack.md.
-- Zero-regression: ADDITIVE only — no existing table/column touched; the cap's OWN refuse-insert
-- behavior (existing cards untouched, D5) is unchanged. This migration only adds WHERE the FACT of a
-- refusal is recorded.
--
-- exception_queue_refusal: an AGGREGATE counter, one row per (player_id, producer) pair that has EVER
-- been refused at least once — `refused_count` increments via UPSERT, never a per-refusal audit-log row
-- (unbounded growth is not what "combien refusées" asks for; an aggregate answers it directly and stays
-- bounded by the number of DISTINCT (player, producer) pairs that have ever hit the cap).
--
-- `producer` is read back from the refused row's OWN `candidate_actions[].source` jsonb tag — the
-- ALREADY-established convention 9 of the 15 current `ExceptionsRepository#insert` callers use
-- (FRICTION_THRESHOLD / HEAT_PRESSURE / CUE_CASCADE / ROUTE_COLLAPSE / BACKPRESSURE_CRITICAL / ... —
-- city_sim_system.ts:1266's own "source tag" framing), never a NEW parameter forced onto every call site
-- (D3's own "byte-untouched producers" discipline, extended honestly to this chunk too). The 6 producers
-- that predate the tag convention (raid / equipment-failure / the original Phase-14 exception-producer /
-- ambient-drift / random-world / lieutenant-tick) are recorded under the literal producer value
-- 'UNKNOWN' rather than mis-attributed — an honest gap, not a silent one (consigned in
-- implementation-notes.md as a Deviation).

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "exception_queue_refusal" (
  "player_id"        uuid          NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "producer"         text          NOT NULL,
  "refused_count"    integer       NOT NULL DEFAULT 0,
  "last_refused_at"  timestamptz   NOT NULL DEFAULT now(),
  PRIMARY KEY ("player_id", "producer"),
  CONSTRAINT "exception_queue_refusal_count_chk" CHECK ("refused_count" > 0)
);

--> statement-breakpoint

-- Runtime grant (app_rw least-privilege role — 0013_app_role.sql auto-grants only SELECT+INSERT on
-- future tables; a MUTABLE table adds its own UPDATE grant in ITS OWN migration, the SAME 0144_city_epoch
-- precedent). `refused_count` is incremented via `ON CONFLICT ... DO UPDATE` — without UPDATE, the SECOND
-- refusal for the SAME (player_id, producer) pair would raise `permission denied`.
GRANT SELECT, INSERT, UPDATE ON "exception_queue_refusal" TO app_rw;
