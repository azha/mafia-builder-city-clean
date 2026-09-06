-- migration 0123: flag_discipline (P3-B C1 — data model + tunables foundation, ch05 Loop 2: credibility
-- tokens + routine items + daily review)
-- Plan: docs/superpowers/plans/2026-07-11-p3-B-flag-discipline-plan.md C1
-- Design: docs/superpowers/specs/2026-07-11-p3-B-flag-discipline-design.md §3 (data model, all 3
--         tables/3 enums/1 column verbatim) + §1 D1/D2/D3 (migration shape, token-state home, DB/atomic
--         enforcement mandate)
-- Decisions: docs/superpowers/specs/2026-07-11-p3-B-flag-discipline-decisions.md §2.1 DD-P1 (migration
--         shape) + §1.2/§1.3 (D2/D3 reasoning) + §6 RULING (sub-decision #1 NEW `lieutenant_flag_state`
--         table RATIFIED; sub-decision #5 WEEKLY cadence + `day_of_week` invariant row RATIFIED).
-- R9.3: backported to docs/tech/09_data_model/schema_core_loops.md §9 (PALIMPSEST-append — see the
--       ★ idx/section-number note below) + schema_sessions_and_audit.md (additive column note) —
--       same commit.
--
-- ★ idx PROVISIONAL — controller ruling (P3-A precedent): `_journal.json` head on this base is idx 122
-- (123 entries, re-verified fresh this commit), so this migration takes the actual next-free idx 0123
-- (NOT the design/plan/decisions docs' own "0130 provisional" placeholder — that number reserved buffer
-- room against 04f-B that turned out unnecessary once re-checked against the live journal). 04f-B
-- (recruitment, in flight in a parallel worktree, warned via `CONTROLLER-WARNING-P3A-COLLISIONS.md` per
-- P3-B's own C0 §8.4) ALSO allocates from 0123 on its own branch — whoever merges second renumbers
-- mechanically (filename + `_journal.json` + every tripwire asserting through this idx), same
-- renumber-at-rebase discipline as 0119→0120/0121/0122 (04f-A/P3-A reconciliation). The design/plan/
-- decisions docs' own "0130 provisional" citations are left as-authored; C8 reconciles them.
--
-- ★ ch09 append target — C0-corrected: this migration's ch09 documentation lands as
-- `schema_core_loops.md` **§9** (NOT §7 as the design/plan/decisions docs literally say) — P3-A's own
-- later chunks (C7 Glossary, C8/C9 Statut) already consumed §7/§8 on this base; C0 §8.3 row 8 found this
-- drift and ruled §9 is the correct next-free PALIMPSEST-append section. Zero other change to that file.
--
-- PART 1 — 3 NEW pgEnums (design §3, verbatim member sets):
--   routine_generator (5 LIVE members — the closed generator registry, D4/D6; C3 builds the actual
--     generators, this migration only materializes the domain). `BUILDING_RENT` (canon routine item,
--     decisions §1.4/§4 divergence #4) has NO system to enumerate against — reserved as inert generator
--     CODE later (C3), deliberately NOT a 6th enum member (an enum member with no generator behind it
--     would be a silent lie the moment anything switches on it).
--   routine_item_status (4 members) — the `RoutineItem` lifecycle (D4): canon's
--     `lieutenant_review_required boolean` is realized as this enum's `'flagged'` value, not a separate
--     column (R9.3 anti-duplication — decisions §1.4).
--   flagged_item_resolution (4 members, canon-verbatim) — the `FlaggedItem` verdict lifecycle (D10).
--
-- PART 2 — 3 NEW tables (design §3):
--   routine_items — per-(player, game_day, generator) persisted candidate rows (D4). Generation
--     idempotency is DB-enforced (D3, the P3-A lot-pattern mandate applied FROM THE START, not bolted on
--     after a reviewer finding like mig 0120→0121/0122 had to be): `UNIQUE (player_id, game_day,
--     generator, dedup_key)` — a re-run of C3/C4's generation step for the SAME day can never insert a
--     duplicate candidate, by SCHEMA, not by application bookkeeping.
--   flagged_items — the append-only flag history (canon `FlagHistoryEntry`/`flag_history`, realized AS
--     these rows — R9.3, no separate table, decisions §3). `routine_item_descriptor` SNAPSHOTS the
--     originating item's descriptor so C4's retention-prune of terminal `routine_items` rows can never
--     destroy a flag's own displayable history (design §3). One-pending-flag-per-item is ALSO DB-enforced
--     from day one: partial `UNIQUE (routine_item_id) WHERE resolution = 'pending'` — C2's flag-creation
--     path cannot race itself into two simultaneous pending flags on the same routine item.
--   lieutenant_flag_state — the token-state home (D2, sub-decision #1 RATIFIED: a NEW 1:1 table, NOT
--     columns on `lieutenant` — the 04f-B in-flight collision wall; `lieutenant` itself is NEVER ALTERed
--     by this migration or this lot). `credibility_tokens >= 0` is the ONE hard DB floor this migration
--     adds (CHECK, named constraint `lfs_credibility_tokens_chk` — C2's `deductTokenAtomic`/verdict
--     paths still race-guard via conditional UPDATEs, but a stray raw UPDATE can never drive the column
--     negative, full stop). The UPPER bound (`flag_credibility_tokens_max_per_lieutenant`, tunable
--     2..10, hot-reloadable) is deliberately NOT a CHECK — decisions §1.3 verbatim: "a DB constant would
--     either block legitimate tunable raises or admit stale caps"; the cap lives in the `LEAST()` clamp
--     of every crediting statement (C2), not here. This migration's OWN falsifiable proof (C1 floor)
--     covers both sides of that deliberate asymmetry: −1 is REJECTED (the CHECK); an arbitrarily large
--     value (999) is ACCEPTED at the DB layer (there is no ceiling here BY DESIGN, not by oversight).
--
-- PART 3 — 1 ADDITIVE column (design §3, D11): `gameplay_sessions.opened_game_day integer NOT NULL
-- DEFAULT 0`. DEFAULT-safe for every pre-existing row (this E2E database is fresh; a live rollout would
-- read every prior session as "game-day 0", the honest legacy marker). Powers `auto_open` (first-session-
-- per-game-day, D11) with NO marker table — C6 writes the real value at session open. Zero behavior
-- change until C6 reads/writes it (D12 zero-regression contract — the column is invisible to every
-- EXISTING session_lifecycle assertion, this chunk's own floor proves it stays that way).
--
-- GRANTs mirror the 0114/0117 pattern (app_rw least-privilege runtime role — SELECT/INSERT/UPDATE/DELETE,
-- no schema-owner privileges) on the 3 NEW tables. No GRANT needed for `opened_game_day` — `gameplay_
-- sessions` already carries its GRANT (migration 0002/0010 lineage).

--> statement-breakpoint

-- routine_generator — the closed 5-member registry domain (D4/D6, design §3/§5). Must match verbatim
-- the TS union `RoutineGeneratorEnumTs` (db/schema/flag_discipline.ts, this same commit).
CREATE TYPE "routine_generator" AS ENUM (
  'COURIER_SCHEDULING',
  'PRECURSOR_ORDER',
  'FRONT_SHOP_RECONCILIATION',
  'STASH_REORDER',
  'LEK_ROTATION'
);

--> statement-breakpoint

-- routine_item_status — the RoutineItem lifecycle (D4, design §3). `lieutenant_review_required`
-- (canon boolean) is realized as the `'flagged'` member, not a separate column.
CREATE TYPE "routine_item_status" AS ENUM (
  'pending',
  'auto_confirmed',
  'batch_confirmed',
  'flagged'
);

--> statement-breakpoint

-- flagged_item_resolution — the FlaggedItem verdict lifecycle (D10, canon-verbatim, design §3).
CREATE TYPE "flagged_item_resolution" AS ENUM (
  'pending',
  'validated',
  'dismissed',
  'timed_out'
);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "routine_items" (
  "routine_item_id"          uuid                  NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"                uuid                  NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "game_day"                 integer               NOT NULL,
  "generator"                routine_generator     NOT NULL,
  "dedup_key"                varchar(120)          NOT NULL,
  "descriptor"               jsonb                 NOT NULL DEFAULT '{}'::jsonb,
  "responsible_role_id"      integer               NOT NULL,
  "lieutenant_id"            uuid                  REFERENCES "lieutenant"("lieutenant_id") ON DELETE SET NULL,
  "deviation_score_internal" real                  NOT NULL DEFAULT 0,
  "status"                   routine_item_status   NOT NULL DEFAULT 'pending',
  "created_at"               timestamptz           NOT NULL DEFAULT now(),
  "confirmed_at"             timestamptz
);

--> statement-breakpoint

-- Generation idempotency, DB-enforced FROM THE START (D3): a re-run of the same (player, game_day,
-- generator) candidate enumeration can never insert a duplicate `dedup_key` row — C3/C4's generation
-- entry-point relies on `ON CONFLICT DO NOTHING` against THIS exact constraint.
ALTER TABLE "routine_items"
  ADD CONSTRAINT "routine_items_dedup_unique"
  UNIQUE ("player_id", "game_day", "generator", "dedup_key");

--> statement-breakpoint

-- (player_id, status): the daily-review "my pending/flagged items" hot path (C6) + the tick's own
-- per-status set-based scans (C4 auto-confirm/prune).
CREATE INDEX "routine_items_player_status_idx"
  ON "routine_items" ("player_id", "status");

--> statement-breakpoint

-- (player_id, game_day): the per-day generation/auto-confirm scan (C3/C4).
CREATE INDEX "routine_items_player_game_day_idx"
  ON "routine_items" ("player_id", "game_day");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "flagged_items" (
  "flag_id"                    uuid                       NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"                  uuid                       NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "lieutenant_id"              uuid                       NOT NULL REFERENCES "lieutenant"("lieutenant_id") ON DELETE CASCADE,
  "routine_item_id"            uuid                       REFERENCES "routine_items"("routine_item_id") ON DELETE SET NULL,
  "routine_item_descriptor"    jsonb                      NOT NULL DEFAULT '{}'::jsonb,
  "flag_reason"                jsonb                      NOT NULL DEFAULT '{}'::jsonb,
  "deviation_score_internal"   real                       NOT NULL,
  "emitted_tick"               bigint                     NOT NULL,
  "game_day"                   integer                    NOT NULL,
  "flagged_at"                 timestamptz                NOT NULL DEFAULT now(),
  "resolution"                 flagged_item_resolution    NOT NULL DEFAULT 'pending',
  "token_returned"             boolean                    NOT NULL DEFAULT false,
  "resolved_at"                timestamptz,
  "resolved_at_tick"           bigint
);

--> statement-breakpoint

-- One-pending-flag-per-item, DB-enforced FROM THE START (D3, design §3): C2's flag-creation path cannot
-- race itself into 2 simultaneous PENDING flags against the same routine_item_id — the 2nd INSERT
-- targeting an item that already has a pending flag fails outright (no ON CONFLICT arbiter needed here;
-- C2's own atomic token-deduct is the race guard THIS index backstops).
CREATE UNIQUE INDEX "flagged_items_pending_unique_idx"
  ON "flagged_items" ("routine_item_id")
  WHERE "resolution" = 'pending';

--> statement-breakpoint

-- (player_id, resolution): the daily-review "my pending flags to verdict" hot path (C6) + convergence
-- history scans filtered by resolution (C5).
CREATE INDEX "flagged_items_player_resolution_idx"
  ON "flagged_items" ("player_id", "resolution");

--> statement-breakpoint

-- (lieutenant_id, flagged_at DESC): BO flag-history diagnostic ordering (C7) + the C5 convergence-
-- window query (last N days of a lieutenant's flag history).
CREATE INDEX "flagged_items_lieutenant_flagged_at_idx"
  ON "flagged_items" ("lieutenant_id", "flagged_at" DESC);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "lieutenant_flag_state" (
  "lieutenant_id"              uuid          NOT NULL PRIMARY KEY REFERENCES "lieutenant"("lieutenant_id") ON DELETE CASCADE,
  "player_id"                  uuid          NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "credibility_tokens"         integer       NOT NULL DEFAULT 5,
  "last_regen_game_day"        integer       NOT NULL DEFAULT 0,
  "last_weekly_reset_epoch"    integer       NOT NULL DEFAULT 0,
  "updated_at"                 timestamptz   NOT NULL DEFAULT now()
);

--> statement-breakpoint

-- The ONE hard DB floor D3 mandates for this table (design §3/decisions §1.3): the token count can
-- NEVER go negative, full stop — not even via a stray raw UPDATE outside C2's own conditional-UPDATE
-- guards. Deliberately NO upper-bound CHECK (see the file header PART 2 note — the max is a tunable,
-- 2..10, hot-reloadable; a DB constant would fight the getter instead of backstopping it).
ALTER TABLE "lieutenant_flag_state"
  ADD CONSTRAINT "lfs_credibility_tokens_chk"
  CHECK ("credibility_tokens" >= 0);

--> statement-breakpoint

-- (player_id): the BO per-player "all my lieutenants' token state" lookup (C7 flag-discipline-stats)
-- + C6's own per-player state reads.
CREATE INDEX "lieutenant_flag_state_player_idx"
  ON "lieutenant_flag_state" ("player_id");

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "routine_items" TO app_rw;
GRANT SELECT, INSERT, UPDATE, DELETE ON "flagged_items" TO app_rw;
GRANT SELECT, INSERT, UPDATE, DELETE ON "lieutenant_flag_state" TO app_rw;

--> statement-breakpoint

-- gameplay_sessions.opened_game_day — the ADDITIVE column (D11, design §3/§12). DEFAULT-safe (0 = "no
-- game-day recorded yet", the honest legacy marker for any pre-existing row). No GRANT needed —
-- gameplay_sessions already carries its runtime GRANT (migration lineage 0002/0010).
ALTER TABLE "gameplay_sessions"
  ADD COLUMN IF NOT EXISTS "opened_game_day" integer NOT NULL DEFAULT 0;
