-- migration 0138: possibility_horizon_dismissed_check (P3-G C1 — the 'dismissed' CHECK-constraint
-- follow-up to mig 0137, SAME commit, SAME chunk)
-- Plan: docs/superpowers/plans/2026-07-19-p3-G-budgets-horizon-plan.md C1
-- Design: docs/superpowers/specs/2026-07-19-p3-G-budgets-horizon-design.md §3 (`dismissed_at
-- timestamptz NULL (write-once at dismiss)`)
-- C0 re-anchor: docs/superpowers/specs/2026-07-19-p3-G-C0-reanchor.md §3 (R1 — enum ALTER mechanics,
--         "the ONE restriction PG imposes = the added value cannot be USED (DML/default/comparison) in
--         the SAME transaction as the ADD").
--
-- ★ WHY THIS IS A SEPARATE MIGRATION (a hard PG fact, not a design choice — see 0137's own header for
-- the full LOUD divergence-from-DD-G3 account): `0137_budgets_horizon.sql` ADDs the pgEnum member
-- `'dismissed'` to `possibility_card_view_status`. Postgres forbids USING a newly-added enum label
-- (including inside a CHECK constraint's own DEFINITION, empirically confirmed against this exact
-- stack — "ERROR: unsafe use of new value ... New enum values must be committed before they can be
-- used") within the SAME transaction as the ADD. This repo's migration runner runs each `.sql` file in
-- its OWN transaction (`migration.runner.ts` BEGIN...COMMIT per file) — so this fix CANNOT live in
-- 0137's own file. By the time THIS file's transaction begins, 0137's has already COMMITted, so
-- `'dismissed'` is safely usable here.
--
-- THE GAP THIS FIXES: `phc_view_status_adopted_at_chk` (mig 0008, ch09 Task 10) is a CLOSED enumeration
-- over the ORIGINAL 4 `view_status` values only:
--   (view_status = 'adopted' AND adopted_at IS NOT NULL)
--   OR (view_status IN ('unseen', 'seen', 'deferred') AND adopted_at IS NULL)
-- Neither disjunct matches a row with `view_status = 'dismissed'` (whatever `adopted_at`/`dismissed_at`
-- hold) — R1's enum ADD VALUE alone made `'dismissed'` a LIVE label but left it structurally UNWRITABLE,
-- a real gap this repo's own TDD floor (not C0, not the design's own R1 investigation — which scoped
-- itself to the ADD VALUE mechanics in isolation, never this OTHER pre-existing constraint on the SAME
-- table) caught RED.
--
-- THE FIX: design §3's own `dismissed_at timestamptz NULL (write-once at dismiss)` column semantics fully
-- determine the correct extension — mirrors `adopted_at`'s own write-once discipline exactly, plus
-- mutual exclusion (a card can never be simultaneously ADOPTED-historically and DISMISSED — D8's own
-- "permanent" framing: adoption never reverses to dismissed, dismissal never reverses to adopted). DROP +
-- re-ADD under the SAME constraint name (a plain ALTER cannot "extend" a CHECK in place — mirrors this
-- repo's own DROP INDEX + CREATE INDEX subsumption convention, mig 0121, just for a CHECK instead of an
-- index).
--
-- R9.3: same-commit — docs/tech/09_data_model/schema_core_loops.md §16 (the 0137/0138 split documented) +
-- README journal row. No ch09/gdd content otherwise duplicated (mig 0137 already carries the full
-- extension account).

--> statement-breakpoint

ALTER TABLE "possibility_horizon_cards" DROP CONSTRAINT "phc_view_status_adopted_at_chk";

--> statement-breakpoint

ALTER TABLE "possibility_horizon_cards"
  ADD CONSTRAINT "phc_view_status_adopted_at_chk"
  CHECK (
    (view_status = 'adopted' AND adopted_at IS NOT NULL AND dismissed_at IS NULL)
    OR (view_status = 'dismissed' AND dismissed_at IS NOT NULL AND adopted_at IS NULL)
    OR (view_status IN ('unseen', 'seen', 'deferred') AND adopted_at IS NULL AND dismissed_at IS NULL)
  );
