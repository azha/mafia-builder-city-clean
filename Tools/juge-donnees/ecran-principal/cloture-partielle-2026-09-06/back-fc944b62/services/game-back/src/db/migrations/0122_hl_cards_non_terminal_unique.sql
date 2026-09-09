-- migration 0122: hl_cards_non_terminal_unique (P3-A C6-fix — DB-enforce ONE non-terminal
-- HighestLeverageCard row per player)
-- Plan: docs/superpowers/plans/2026-07-10-p3-A-session-spine-plan.md C6
-- Reviewer finding folded (⊥ IMPORTANT-1, C6 gate, EMPIRICALLY REPRODUCED — mirrors the C2-fold
-- ⊥ IMPORTANT-1 precedent, mig 0121): the "at most ONE non-terminal (status IN ('active','skipped'))
-- card per player" invariant (`hl-card.repository.ts`'s own `findCarried` docstring) was
-- APPLICATION-enforced only — `HlCardService.computeAndPersist`'s own findCarried-then-insertActive
-- sequence has NO atomicity, and (before this fix) BOTH the ON-CONFLICT winner AND loser of a
-- concurrent `SessionRepository.openFresh` race called `computeAndPersist` (the loser was never told
-- it lost). 12 concurrent `open-session-as` calls with a severed-route substrate seeded → reviewer
-- reproduced 2 (in general, up to N) `active` rows for the SAME player — the top-1 model silently
-- broken under real concurrency.
--
-- FIX (belt-and-braces, matching the C2-fold / C5-fix precedents in this exact lot):
--   1. THIS migration — a real UNIQUE partial index makes "at most one non-terminal card per player"
--      a DB-enforced constraint, not merely an application convention.
--   2. `session.repository.ts#openFresh` (same commit) now returns `{ id, won: boolean }` — the
--      RACE-LOSER path is now OBSERVABLE to the caller (previously it silently returned the SAME
--      `session_id` with no signal); `session.service.ts#open` (same commit) skips
--      `HlCardService.computeAndPersist` ENTIRELY on the loser path (mirrors the loser ALREADY
--      skipping the progression-reset UPDATE, `session.repository.ts`'s own pre-existing comment).
--   3. `HlCardRepository#insertActive` (same commit) additionally targets THIS new index with
--      `onConflictDoNothing` (defense in depth — even if a future caller reaches `insertActive`
--      concurrently for the same player, outside the winner-only guard above) and re-reads the
--      surviving row on conflict.
--
-- REDUNDANT-INDEX DECISION: the C1-landed `highest_leverage_cards_player_status_idx` (plain,
-- `(player_id, status)` — mig 0120) is NOT subsumed by this new index (different shape: a general
-- 2-column lookup aid vs. THIS migration's single-column UNIQUE PARTIAL constraint scoped to exactly
-- 2 of the 4 enum values) — both are kept, unlike the 0121 precedent where the old index was a
-- byte-for-byte-narrower subset of the new one.
--
-- R9.3: same-commit addendum to `docs/tech/09_data_model/schema_core_loops.md` (§index addendum) +
-- README journal row. Drizzle mirror: `db/schema/core_loops.ts` (same commit) adds a
-- `uniqueIndex(...).where(...)` declaration alongside the 2 existing plain indexes.
--
-- ★ idx final, reconciled at integration (04f-A merged first with 0119) — same renumber-at-rebase
-- discipline as 0120/0121's own header notes. This file was authored as 0121-provisional against
-- this branch's own pre-merge head; `feat/04f-A-maintenance` merged into `main` first with its own
-- 0119, pushing this migration's C1/C2-fold siblings to 0120/0121 and this one to 0122 (next free) at
-- the post-04f-A-merge integration — this file's name, `_journal.json`'s appended entry, and
-- `core_loops_schema_migration.spec.ts`'s journal-contiguity assertion were reconciled in the SAME
-- integration commit. Zero content change beyond the idx/name.
--
-- ★ BACKFILL NEEDED (found applying this migration to the shared E2E stack's persistent volume):
-- because the invariant was APPLICATION-enforced only before this migration, the exact defect it
-- fixes had ALREADY produced real duplicate non-terminal rows for at least one player on this
-- long-lived dev/E2E database (pre-existing test data, not this migration's own doing) — creating the
-- UNIQUE index directly on unclean data fails with "could not create unique index" (Postgres refuses
-- a constraint the current rows already violate). A real production rollout of an
-- application-enforced-only invariant onto a constraint carries the EXACT same risk — so this
-- migration deliberately backfills FIRST: for every player with 2+ non-terminal rows, keep the most
-- recently surfaced one and supersede the rest (the SAME terminal transition
-- `HlCardService#computeAndPersist` already uses for "a fresher candidate replaces a stale carried
-- card" — this is that exact semantic, applied retroactively to the duplicates the bug produced).

--> statement-breakpoint

-- Backfill: collapse any pre-existing duplicate non-terminal rows per player down to ONE (the most
-- recently surfaced) BEFORE the unique index below is created — see the header note above.
WITH ranked AS (
  SELECT "card_id",
         ROW_NUMBER() OVER (PARTITION BY "player_id" ORDER BY "surfaced_at" DESC, "card_id" DESC) AS rn
  FROM "highest_leverage_cards"
  WHERE "status" IN ('active', 'skipped')
)
UPDATE "highest_leverage_cards"
SET "status" = 'superseded', "resolved_at" = now()
WHERE "card_id" IN (SELECT "card_id" FROM ranked WHERE rn > 1);

--> statement-breakpoint

-- DB-enforced "at most ONE non-terminal HighestLeverageCard per player" invariant (⊥ IMPORTANT-1
-- fold, C6-fix). A second INSERT (or UPDATE flipping a different row to 'active'/'skipped') for a
-- player that already has a non-terminal row now fails with a unique-violation (23505) instead of
-- silently creating a duplicate carried card.
CREATE UNIQUE INDEX "highest_leverage_cards_non_terminal_idx"
  ON "highest_leverage_cards" ("player_id")
  WHERE "status" IN ('active', 'skipped');
