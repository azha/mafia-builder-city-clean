-- migration 0121: gameplay_sessions_active_unique (P3-A C2-fold — DB-enforce one-active-session)
-- Plan: docs/superpowers/plans/2026-07-10-p3-A-session-spine-plan.md C2
-- Reviewer finding folded (⊥ IMPORTANT-1, C2 gate): the one-active-session invariant was
-- APPLICATION-enforced only (`SessionService.open`'s own `findFreshActive`/`closeStaleForPlayer`
-- read-then-write sequence). `gameplay_sessions_active_partial_idx` (mig 0010, plain — NOT unique)
-- gave the lookup a fast index but NO atomicity guarantee: two concurrent `open()` calls for the
-- SAME player with no prior session both pass the "no fresh active session" read, both INSERT —
-- two active rows survive, and `incrementActiveSessionCounters`/`closeActiveForPlayer` (no LIMIT)
-- would then operate on BOTH. Decisions doc §1.1(c) ALSO overclaimed "the server enforces
-- one-active-per-player via the existing partial index" — corrected same commit (decisions §1.1(c)
-- amendment below the original prose).
--
-- FIX: a real UNIQUE partial index — `CREATE UNIQUE INDEX ... ON gameplay_sessions (player_id)
-- WHERE ended_at IS NULL` — makes "at most one active session per player" a DB-enforced constraint.
-- A racing second INSERT now fails with a unique-violation (Postgres error 23505) instead of
-- silently succeeding; `SessionRepository.openFresh` (`session.repository.ts`, same commit) catches
-- that violation and recovers by returning the ALREADY-active session — double-open stays
-- idempotent under genuine concurrency, not just under sequential calls (C2's original proof).
--
-- REDUNDANT-INDEX DECISION: `gameplay_sessions_active_partial_idx` (plain, `(player_id) WHERE
-- ended_at IS NULL`) is now 100% subsumed by the new UNIQUE index — SAME column, SAME predicate,
-- no additional column ordering the plain index offered. A unique b-tree index serves every read
-- the plain one did (Postgres has no reason to prefer a non-unique index over a unique one covering
-- the identical (columns, predicate)) — keeping both would be pure write-amplification with zero
-- read benefit. DROPPED in this same migration; the Drizzle schema mirror (`sessions_and_audit.ts`,
-- same commit) removes the `index(...)` declaration and replaces it with `uniqueIndex(...)`.
--
-- R9.3: same-commit addendum to `docs/tech/09_data_model/schema_sessions_and_audit.md` (§1 activation
-- note extended, §2 Drizzle mirror updated, §6 indexes section updated) + README journal row.
--
-- ★ idx final, reconciled at integration (04f-A merged first with 0119) — same renumber-at-rebase
-- discipline as 0120's own header note. This file was authored as 0120-provisional against this
-- branch's own pre-merge head; `feat/04f-A-maintenance` merged into `main` first with its own 0119,
-- pushing this migration's C1 sibling to 0120 and this one to 0121 (next free) at the post-04f-A-merge
-- integration — this file's name, `_journal.json`'s appended entry, and
-- `core_loops_schema_migration.spec.ts`'s journal-contiguity assertion were reconciled in the SAME
-- integration commit. Zero content change beyond the idx/name.

--> statement-breakpoint

-- The plain partial index this UNIQUE index subsumes (mig 0010) — same column, same predicate,
-- zero remaining read use case once the unique index exists.
DROP INDEX IF EXISTS "gameplay_sessions_active_partial_idx";

--> statement-breakpoint

-- DB-enforced one-active-session-per-player invariant (⊥ IMPORTANT-1 fold). A second INSERT for a
-- player that already has an `ended_at IS NULL` row now fails with a unique-violation (23505) instead
-- of silently creating a duplicate active session.
CREATE UNIQUE INDEX "gameplay_sessions_active_unique_idx"
  ON "gameplay_sessions" ("player_id")
  WHERE "ended_at" IS NULL;
