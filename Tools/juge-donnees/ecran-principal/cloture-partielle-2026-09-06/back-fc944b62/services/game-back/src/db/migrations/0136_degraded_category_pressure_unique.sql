-- migration 0136: degraded_category_pressure_unique (P3-F C9 — DegradedCategoryPressureProducer per-item dedup)
-- Plan: docs/superpowers/plans/2026-07-18-p3-F-delegation-ratchet-plan.md C9
-- Design: docs/superpowers/specs/2026-07-18-p3-F-delegation-ratchet-design.md §10.4 (D11 — the additive
-- producer, "dedups 1-pending per (player, category)").
--
-- CONCURRENCY (task mandate, mirrors migs 0121/0122 — the P3-A "gameplay_sessions_active_unique_idx" /
-- "highest_leverage_cards_non_terminal_idx" precedent): the producer's own dedup gate is a plain SELECT
-- (app-level, `degraded-category-pressure-producer.service.ts#hasPendingForItem`) — belt-and-suspenders,
-- NOT the primary guarantee (same posture `friction-threshold-exception-producer.service.ts`/
-- `compression-residue-exception-producer.service.ts` already document for their OWN plain-SELECT dedup).
-- A genuine race (two concurrent `processSessionOpened` calls for the SAME player racing the SAME
-- candidate item) must still land EXACTLY ONE pending card — this migration makes that a DB-ENFORCED
-- constraint, not an application convention, per the task's own "DB-enforced, not app-checked" mandate.
--
-- SHAPE: `exception_queue` has no first-class category/item column (R6/R7, C0-reanchor §6) — every OTHER
-- producer's dedup scans the jsonb `candidate_actions[].source` tag (`hasPendingForBuilding`'s own
-- `jsonb_array_elements` EXISTS idiom). THIS producer ALWAYS stamps its own `pressure_key` field
-- (`"<categoryCode>:<itemRef>"`, mirrors `CompressionResidueExceptionProducer`'s own `problem_key` field
-- shape) on `candidate_actions[0]` — a UNIQUE PARTIAL expression index on that field is therefore
-- sufficient (no `jsonb_array_elements` needed for the CONSTRAINT — Postgres partial/expression indexes
-- can't use set-returning functions anyway; the app-level pre-check queries the SAME `-> 0 ->> 'pressure_
-- key'` expression for consistency, never a `jsonb_array_elements` scan there either).
--
-- WHY PARTIAL (not table-wide UNIQUE): `pressure_key` is a field name UNIQUE to THIS producer — no other
-- existing producer (heat-pressure/backpressure/mycelial-stress/route-collapse/friction-threshold/
-- compression-residue/raid/equipment-failure) writes it, so `candidate_actions -> 0 ->> 'pressure_key'`
-- is NULL for every other producer's card. Scoping the index to `IS NOT NULL` keeps it from EVER
-- constraining another producer's pending cards for the same player (mirrors `news_thread_hindsight_
-- source_fodder_ref_unique`'s own "restrict to non-NULL" reasoning, migration 0130).
--
-- R9.3: same-commit addendum to `docs/tech/09_data_model/schema_queues_exceptions_cuestack.md` §6 (index
-- table row + activation note) + README migration-journal row + `db/schema/queues_exceptions_cuestack.ts`
-- Drizzle mirror (same commit, additive — zero existing index/column touched).

--> statement-breakpoint

-- DB-enforced "at most ONE pending DegradedCategoryPressureProducer card per (player, category, item)"
-- invariant. A second concurrent INSERT racing the SAME `pressure_key` for the SAME player now fails with
-- a unique-violation (23505) instead of silently creating a duplicate pending card; the producer catches
-- it (`isUniqueViolation`, mirrors `standing-order.service.ts`/`flag-discipline.service.ts`'s own helper)
-- and reports the honest 'deduped' outcome — never a 5xx.
CREATE UNIQUE INDEX "degraded_category_pressure_item_unique_idx"
  ON "exception_queue" ("player_id", (("candidate_actions" -> 0 ->> 'pressure_key')))
  WHERE ("resolution_status" = 'pending' AND ("candidate_actions" -> 0 ->> 'pressure_key') IS NOT NULL);
