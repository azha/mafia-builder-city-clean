-- migration 0143: onboarding_funnel_state (W1.1-a C1 — funnel-state persistence + pre-seed unique)
-- Design: docs/superpowers/specs/2026-08-09-w1.1a-onboarding-funnel-design.md D2 (funnel-state
-- columns), D3 (the 8-member `onboarding_funnel_step` domain), D4 (pre-seed unicity, DB-enforced).
-- Chunk C1 (§4) — persistence ONLY: no writer lands in this migration/commit. Every column here
-- stays at its default until C3 (welcome grant claim)/C6 (funnel-step writers) land in later chunks.
--
-- THREE additive columns on `player_progression_state` (D2), not four — `exceptions_resolved_
-- session` (canon composite `OnboardingFunnelState`, `day_1_funnel.md:263`) is REUSE, not NEW: it
-- already exists as `gameplay_session.exceptions_resolved` (`sessions_and_audit.ts:45`, design §0.10).
-- `onboarding_started_at` (v1 candidate) is also dissolved — REUSE `player.created_at` (`player.ts:36`).
--
--   `onboarding_funnel_step` — NEW pgEnum, 8 members (design D3, `day_1_funnel.md:264` — the 7
--     canon steps + the canon's own "optional" `EXPLORE` value, INCLUDED here as a deliberate choice:
--     a pgEnum only grows via migration, so omitting a canon-named value would leave the domain
--     incomplete against canon. ★ AMENDED W1.1-b C1 (2026-08-09, design D6): this used to justify
--     inclusion by "costs a whole extra migration the day W1.1-b writes it" (Deviation §9-3) — FALSE,
--     already contradicted by the closing sentence of THIS SAME comment block below ("NO server
--     writer, ever"); W1.1-b's own design D6 rules that day never comes. The justification that
--     SURVIVES is that closing sentence: the enum is complete against canon and doesn't need
--     re-migrating, independent of who writes what.
--     `NOT NULL DEFAULT 'LAUNCH'` — every
--     existing AND new row starts at the funnel's first step, backfill-safe (constant default,
--     no table rewrite, mirrors mig 0141's `pressure_tier smallint NOT NULL DEFAULT 1` ADD COLUMN).
--     5 of the 8 members are server-observable this lot's W1.1-c/W1.1-b successors will write
--     (`LAUNCH`/`HOME_FIRST`/`FIRST_COMMIT`/`SECOND_DECISION`/`QUIET_STATE` — design D3); the other 3
--     (`WELCOME`/`EXCEPTION_DETAIL`/`EXPLORE`) are client-only and get NO server writer, ever, per D3 —
--     the domain still carries them so the enum is complete against canon and doesn't need re-migrating.
--   `first_decision_at` — nullable timestamptz, stamped ONCE by a future WHERE-guarded UPDATE
--     (`first_decision_at IS NULL` guard, design D3/D1.1) — the account-scoped discriminant between
--     FIRST_COMMIT and SECOND_DECISION (design IM-2). NULL here = "no decision yet", by construction.
--   `welcome_grant_claimed_at` — nullable timestamptz, the D1.1 at-most-once claim column for the
--     welcome-grant service landing in C3. `NULL` here = "grant not claimed" — the ONLY value this
--     column can hold until C3's `OnboardingGrantService` exists; C3's own writer is the FIRST UPDATE
--     `... SET welcome_grant_claimed_at = now() WHERE welcome_grant_claimed_at IS NULL RETURNING
--     player_id` (design D1.1 pt 1). This migration ships the column, never the writer.
--
-- ONE additive partial UNIQUE index on `exception_queue` (D4) — DB-enforced "at most one pre-seeded
-- onboarding card per player, ever" (no `resolution_status` filter, unlike the 0136 precedent this
-- mirrors: a RESOLVED pre-seed card must never be re-creatable, so the constraint stays live past
-- resolution — design D4 "Différence délibérée avec 0136"). Scoped to the exact tag the future
-- pre-seed writer (C5) stamps on `candidate_actions[0].source` — a field name no OTHER existing
-- producer writes (`hasPendingPlayerLevelCard`'s three PROD callers all use `pressure_key`/plain
-- `source` values from a closed set that never includes this literal — design D4/D5), so this index
-- can never constrain another producer's cards for the same player.
--
-- GRANT: table-level grants from 0013 already cover both tables (`player_progression_state` :64,
-- `exception_queue` :86, both in the UPDATE list; SELECT/INSERT via ALTER DEFAULT PRIVILEGES :108-109)
-- — new columns on an already-granted table, and a new partial index, need no GRANT here (design §5
-- "Rôle app_rw" row — confirmed statically against 0013 this commit; still first-boot-verified by C1's
-- own E2E falsifiable, which round-trips a real signup through this exact column set).
--
-- R9.3: same-commit backport — docs/tech/09_data_model/schema_player_progression_state.md (§1
-- Cadrage, new "Activation W1.1-a C1" note, the same place P3-H's own 0141 activation note lives) +
-- docs/tech/09_data_model/schema_queues_exceptions_cuestack.md (§6 index table row + new Activation
-- note, right after the 0136 one it mirrors) + this migration's own entry in
-- `db/migrations/meta/_journal.json` (idx 143 — without it `MigrationRunner` never reads this file,
-- `migration.runner.ts:60-62,111`, design I3).

--> statement-breakpoint

CREATE TYPE "onboarding_funnel_step" AS ENUM (
  'LAUNCH',
  'WELCOME',
  'HOME_FIRST',
  'EXCEPTION_DETAIL',
  'FIRST_COMMIT',
  'SECOND_DECISION',
  'QUIET_STATE',
  'EXPLORE'
);

--> statement-breakpoint

ALTER TABLE "player_progression_state"
  ADD COLUMN "onboarding_funnel_step" onboarding_funnel_step NOT NULL DEFAULT 'LAUNCH';

--> statement-breakpoint

ALTER TABLE "player_progression_state"
  ADD COLUMN "first_decision_at" timestamptz;

--> statement-breakpoint

ALTER TABLE "player_progression_state"
  ADD COLUMN "welcome_grant_claimed_at" timestamptz;

--> statement-breakpoint

-- DB-enforced "at most one pre-seeded onboarding card, ever, per player" (design D4). No
-- `resolution_status` filter (deliberate divergence from the 0136 precedent this mirrors) — a
-- RESOLVED pre-seed card must never be re-creatable, so idempotence is a base error, not a service
-- promise.
CREATE UNIQUE INDEX "onboarding_preseed_unique_idx"
  ON "exception_queue" ("player_id")
  WHERE (("candidate_actions" -> 0 ->> 'source') = 'onboarding_preseed');
