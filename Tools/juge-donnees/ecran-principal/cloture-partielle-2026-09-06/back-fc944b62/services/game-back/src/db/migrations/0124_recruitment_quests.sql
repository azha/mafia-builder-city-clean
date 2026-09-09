-- ★★★ RENUMBERED 0120 → 0124 at merge-integration (P3-integration, 2026-07-12) ★★★
-- This migration was built as 0120 IN THIS BRANCH (feat/04f-B-recruitment) because the journal head on
-- that branch was 0119 -- 0120 was the only number that worked standalone there. TWO PARALLEL sessions
-- merged to main BEFORE 04f-B: P3-A (session-spine) took migrations 0120-0122, and P3-B took migration
-- 0123. At integration (main `ed8aa154` merged into 04f-B, per the documented merge order
-- main←P3-A←P3-B←04f-B), this migration was renumbered 0120 -> 0124 (file rename + journal idx/tag edit +
-- this header updated) -- the SAME documented mechanical pattern P3-A itself already used (`e7982a0d
-- renumber migs 0120-0122 post-04f-A`). This is now DONE, not pending. See also: docs/superpowers/specs/
-- 2026-07-11-04f-B-recruitment-decisions.md §11 (C1 implementation note, C9-amended, P3-integration-amended).
--
-- migration 0124: recruitment_quests (04f-B C1 -- lieutenant recruitment quests, G11)
-- Plan: docs/superpowers/plans/2026-07-11-04f-B-recruitment-plan.md C1
-- Design: docs/superpowers/specs/2026-07-11-04f-B-recruitment-design.md §3 (data model) + §2 (seam table
--         row 2 -- REUSE lieutenant_source)
-- Decisions: docs/superpowers/specs/2026-07-11-04f-B-recruitment-decisions.md D5/D6 (bucket persistence +
--         the R2.2 0.85 -> seeded migration) + DD-R1 (migration shape)
-- Canon: docs/tech/04f_maintenance_decay_recruitment/lieutenant_recruitment_quests.md (the quest SQL --
--         transposed onto shipped conventions, honesty register §0/§4 divergence items 2/3)
-- R9.3: backported to docs/tech/09_data_model/schema_lieutenant.md §20 (NEW addendum) -- same commit.
-- Zero-regression: ADDITIVE only. No existing table redefined; the 2 lieutenant columns are NULLable
--         with NO backfill (NULL = honest pre-04f-B / classic recruit -- D5).
--
-- ===== Enums (NEW, 3) =====
-- hire_quality: the tech doc's agent-review 4 values verbatim (design §3). Frozen projection of a
--   completed quest's decisions -- computed + persisted ONCE at finalizeHire (C3), never mutated after.
CREATE TYPE "hire_quality" AS ENUM ('WEAK', 'SOLID', 'STRONG', 'EXEMPLARY');
--> statement-breakpoint

-- recruitment_quest_outcome: canon verbatim. NULL on recruitment_quests.outcome means the quest is ACTIVE
--   (the partial-unique one-active-quest-per-candidate index below keys off "outcome IS NULL").
CREATE TYPE "recruitment_quest_outcome" AS ENUM ('hired', 'declined_player', 'declined_candidate', 'abandoned');
--> statement-breakpoint

-- loyalty_seed_bucket: the R2.2 composite (D6) replacing the canon GDD §2.8 scalar
--   civilian_loyalty_starting_value: 0.85 -- 'seeded' is the migrated default (never a float key). Lives
--   on lieutenant.loyalty_seed_bucket (NEW column below), NOT on recruitment_quests (D5 -- loyalty seed is
--   LIFETIME lieutenant state; hire_quality is a frozen quest-time projection -- two different lifetimes,
--   two different tables). 'tempered' is UNREACHABLE at hire time (long-tenure transition, TD) -- shipped
--   anyway so the future transition needs no migration (all 4 canon members present now).
CREATE TYPE "loyalty_seed_bucket" AS ENUM ('seeded', 'tested', 'tempered', 'fractured');
--> statement-breakpoint

-- ===== Table: recruitment_candidates (NEW) =====
-- The candidate surface canon presumes but never declares (design §0 honesty note -- canon's
-- `candidate_npc_id` has no table to point at for Saltline/Defector; rich-NPCs exist only for civilians).
-- One row per surfaced candidate across all 3 pools. `pool` REUSES the shipped `lieutenant_source` pgEnum
-- verbatim (identical 3-member domain -- DD-R1, no parallel `recruitment_pool` enum minted). `citizen_id`
-- is a REAL FK to the pre-existing `rich_citizens` (civilian pool only, D7); `source_rival_key` is a plain
-- text carry-through (defector pool only, D8/D10 input -- no single-column PK on rival_state to FK onto).
-- `status` is plain `text` (NOT an enum) -- mirrors the `standing_order.status` precedent
-- (schema_lieutenant.md §19.3a, migration 0034): a code-owned closed domain
-- (available|in_quest|hired|expired|declined), application-enforced, not a DB CHECK -- the same posture
-- this codebase already uses for lifecycle-status columns.
CREATE TABLE "recruitment_candidates" (
  "candidate_id"         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"            uuid        NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "pool"                 lieutenant_source NOT NULL,
  "citizen_id"           uuid        REFERENCES "rich_citizens"("citizen_id"),
  "source_rival_key"     text,
  "profile"              jsonb       NOT NULL,
  "status"               text        NOT NULL DEFAULT 'available',
  "surfaced_at_game_day" bigint      NOT NULL,
  "expires_at_game_day"  bigint
);
--> statement-breakpoint

-- INDEX (player_id, pool, status): the player-facing "GET candidates?pool=" hot path (available
-- candidates for a player's pool).
CREATE INDEX "recruitment_candidates_player_pool_status_idx"
  ON "recruitment_candidates" ("player_id", "pool", "status");
--> statement-breakpoint

-- INDEX (citizen_id) / (source_rival_key): the C4 NIGHTLY/22 availability-tick dedup-gate hot paths (D7
-- "one row per citizen_id", D8 "one row per qualifying rival") -- registered now so C4 needs no re-index.
CREATE INDEX "recruitment_candidates_citizen_id_idx" ON "recruitment_candidates" ("citizen_id");
--> statement-breakpoint
CREATE INDEX "recruitment_candidates_source_rival_key_idx" ON "recruitment_candidates" ("source_rival_key");
--> statement-breakpoint

-- GRANT UPDATE only (NEW table -- SELECT/INSERT auto-granted via 0013's ALTER DEFAULT PRIVILEGES). A
-- candidate row mutates its `status` repeatedly (available -> in_quest -> hired/expired/declined ->
-- possibly available again) but is NEVER deleted (a permanent BO/history surface, the
-- `equipment_failure_log` single-resolve-then-frozen-row precedent, mig 0119 §7.21.6 -- NO DELETE grant).
GRANT UPDATE ON "recruitment_candidates" TO app_rw;
--> statement-breakpoint

-- ===== Table: recruitment_quests (NEW) =====
-- The canon SQL (lieutenant_recruitment_quests.md :100-115) transposed onto shipped conventions (design
-- §3). `quest_type` REUSES the shipped `lieutenant_source` pgEnum verbatim (same 3-member domain as
-- `pool` above -- DD-R1). `candidate_id` is a REAL FK to `recruitment_candidates` (both tables land in
-- THIS migration, so ordering is trivial -- CREATE candidates first, ON DELETE RESTRICT since a candidate
-- row is never deleted while a quest references it, mirrors `lieutenant.behavior_script_id` RESTRICT,
-- schema_lieutenant.md §5.2). `outcome` NULL = ACTIVE (the partial-unique index below).
CREATE TABLE "recruitment_quests" (
  "quest_id"                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"                    uuid        NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "quest_type"                   lieutenant_source NOT NULL,
  "candidate_id"                 uuid        NOT NULL REFERENCES "recruitment_candidates"("candidate_id") ON DELETE RESTRICT,
  "current_step"                 integer     NOT NULL DEFAULT 1,
  "sessions_consumed"            integer     NOT NULL DEFAULT 0,
  "last_advanced_at_game_minute" bigint,
  "decisions_made"               jsonb       NOT NULL DEFAULT '[]'::jsonb,
  "expected_outcome"             jsonb       NOT NULL DEFAULT '{}'::jsonb,
  "hire_quality_bucket"          hire_quality,
  "double_agent"                 boolean,
  "vetting_sessions_run"         integer     NOT NULL DEFAULT 0,
  "started_at"                   timestamptz NOT NULL DEFAULT now(),
  "ended_at"                     timestamptz,
  "outcome"                      recruitment_quest_outcome
);
--> statement-breakpoint

-- INDEX (player_id, outcome): the player-facing "GET quests?status=active|history" hot path (design §10).
CREATE INDEX "recruitment_quests_player_outcome_idx" ON "recruitment_quests" ("player_id", "outcome");
--> statement-breakpoint

-- INDEX (candidate_id): full per-candidate quest-history lookup (BO quest-history viewer TD, design §5).
CREATE INDEX "recruitment_quests_candidate_idx" ON "recruitment_quests" ("candidate_id");
--> statement-breakpoint

-- PARTIAL UNIQUE (candidate_id) WHERE outcome IS NULL: the anti-double-quest guard -- "a second active
-- quest on the same candidate -> 409" (plan §C2 falsifiable floor). A candidate can accumulate MANY
-- historical (ended) quest rows over time (declined -> re-surfaced -> re-started), but at most ONE
-- concurrently-active (outcome IS NULL) row.
CREATE UNIQUE INDEX "recruitment_quests_one_active_per_candidate_uq"
  ON "recruitment_quests" ("candidate_id") WHERE "outcome" IS NULL;
--> statement-breakpoint

-- GRANT UPDATE only -- same permanent-row posture as recruitment_candidates above (a quest row mutates
-- through its lifecycle -- current_step/decisions_made/hire_quality_bucket/outcome -- but is NEVER
-- deleted: the quest-history viewer TD needs every quest, hired or not).
GRANT UPDATE ON "recruitment_quests" TO app_rw;
--> statement-breakpoint

-- ===== lieutenant (existant, schema_lieutenant.md §2/§4.1) -- 2 colonnes ADDITIVES (D5) =====
-- loyalty_seed_bucket: NULLable -- NULL = classic/pre-04f-B recruit (honest, no invented backfill for
--   existing rows -- design §3 "no backfill invention"). Written ONCE at quest hire (C3); future systems
--   (tenure/betrayal, TD) move it.
-- recruitment_quest_id: NULLable, plain `uuid` -- a LOGICAL lineage pointer (design §2 seam row 2 / §3:
--   "logical FK -> recruitment_quests"), deliberately WITHOUT a DB-level REFERENCES constraint. Two
--   reasons: (1) it avoids a circular Drizzle schema-file import (lieutenant.ts would need
--   recruitment.ts's recruitmentQuests table for the FK target, while recruitment.ts already imports
--   lieutenant.ts's lieutenantSourcePg enum for `pool`/`quest_type` REUSE -- no existing pair of schema
--   files in this codebase has a mutual import, and this migration/schema pair does not introduce the
--   first one) -- mirrors the `standing_order.target_entity_id` "no .references() Drizzle day-1" logical
--   pointer precedent (schema_lieutenant.md §5.5 polymorphism note; here the reason is cycle-avoidance,
--   not polymorphism, but the DB-level shape is identical; (2) recruitment_quests rows are never deleted
--   (GRANT UPDATE-only above), so there is no orphan-on-delete risk to guard against with a hard FK. App-
--   level integrity is owned by the single writer (RecruitmentQuestService.finalizeHire, C3).
-- No re-GRANT: the EXISTING `lieutenant` table is already covered by its table-wide GRANT -- the 2 NEW
--   columns are SELECT/INSERT/UPDATE-able with no re-grant (a table-level GRANT with no column list
--   covers later ADDs -- mirrors mig 0034's own `standing_order` ADD COLUMN note, schema_lieutenant.md
--   §19.2/§19.4).
ALTER TABLE "lieutenant"
  ADD COLUMN "loyalty_seed_bucket"  loyalty_seed_bucket,
  ADD COLUMN "recruitment_quest_id" uuid;
