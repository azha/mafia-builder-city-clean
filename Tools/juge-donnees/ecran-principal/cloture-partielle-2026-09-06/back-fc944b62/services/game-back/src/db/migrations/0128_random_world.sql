-- migration 0128: random_world (04g-B C1 -- Random-world runtime, G24) -- 3 tables + 1 enum +
-- additive 3rd-parent surgery on effect_modifier (DD-RW1)
-- Plan: docs/superpowers/plans/2026-07-15-04g-B-random-world-plan.md C1
-- Design: docs/superpowers/specs/2026-07-15-04g-B-random-world-design.md §4 (data model) + §3.3 (DD-RW1)
-- Canon: projects/mafia_city_world_events/CATALOGUE_REPORT.md :548-856 (RANDOM-WORLD, 14 templates)
--        docs/tech/04g_ambient_world_events_templates/random_world_templates.md
-- R9.3: backported to docs/tech/09_data_model/schema_random_world.md (NEW) +
--       docs/tech/09_data_model/schema_effect_modifier.md (UPDATED, DD-RW1) -- same commit.
-- Anti-fabrication: no Math.random(), no non-deterministic defaults.
-- Zero-regression: PART 1 (3 tables + 1 enum) is purely ADDITIVE -- no existing table/column touched.
--   PART 2 (effect_modifier surgery) is ALSO additive-only on the shared A1 table (DD-B2 precedent,
--   migration 0114): 1 new nullable FK column + CHECK swap (2-arg -> 3-arg num_nonnulls) + 1 index --
--   zero existing row's value changes (every pre-existing row gets random_world_event_active_id NULL
--   from the column-add default, so num_nonnulls(...,...,NULL) equals the pre-migration 2-arg
--   num_nonnulls(...,...)  for every row that already satisfied the old CHECK -- the DROP+ADD
--   validates cleanly with zero data to fix, same proof shape as 0114).
-- GLOBAL engine tables: random_world_event_active/random_world_daily_run carry no player_id FK
--   (city-global event ledgers, same posture as political_event_active/live_ops_event_active).
--   coupling_discovery_cascade IS per-player (R9.3 convention: player_id FK ON DELETE CASCADE).
-- ⚠️ RENUMBER-AT-INTEGRATION (umbrella §6, precedent 04f-B 0120->0124 / 04g-A 0125->0127): authored
--   in-branch as 0128 (feat/04g-B @ base 414753c2, C0 re-anchor confirmed 0128 free on 2026-07-15).
--   P3-D is probably in parallel -- whichever of 04g-B/P3-D merges SECOND renumbers at merge-gate.
--   Tests reference table/enum/tunable NAMES + the migration hash tag, never a bare order number.

--> statement-breakpoint

-- random_world_event_status: active | resolved (design §4.1/D13). Permanent (permanent_residue) and
-- state-driven (quorum_on_stadler_row) events stay 'active' with expires_at_game_day NULL --
-- 'resolved' is a genuine terminal write, never a NULL-expiry proxy.
CREATE TYPE "random_world_event_status" AS ENUM (
  'active',
  'resolved'
);

--> statement-breakpoint

-- random_world_event_active: city-global RANDOM-WORLD event instance ledger (design §4.1). template_id
-- is a soft-ref (text) to the static RandomWorldTemplateRegistry TS entry (random-world-template-
-- registry.ts, C1, 14 entries) -- no DB-side RandomWorldTemplate table, same posture as
-- political_event_active.event_id. district_id is RESTRICT (not CASCADE): districts are GLOBAL static
-- rows (never deleted in practice) and this is the event's PRIMARY district -- an accidental district
-- delete must never silently cascade-delete a live world event. parent_event_id self-references for
-- successor chains (apparent_recovery <- resolved cohesion-drop parent; permanent_residue <- resolved
-- halgren_tannery_hailstorm).
CREATE TABLE IF NOT EXISTS "random_world_event_active" (
  "id"                        uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "template_id"                text        NOT NULL,
  "district_id"                integer     NOT NULL
    REFERENCES "districts"("id") ON DELETE RESTRICT,
  "status"                     random_world_event_status NOT NULL DEFAULT 'active',
  "started_at_game_day"        integer     NOT NULL,
  "expires_at_game_day"        integer,
  "recovery_curve_position"    numeric     NOT NULL DEFAULT '0',
  "parent_event_id"            uuid
    REFERENCES "random_world_event_active"("id") ON DELETE SET NULL,
  "payload"                    jsonb       NOT NULL DEFAULT '{}'::jsonb,
  "created_at"                 timestamptz NOT NULL DEFAULT now()
);

--> statement-breakpoint

-- INDEX (status): resolve-expired sweep (C2 phase 1) + BO diagnostic.
CREATE INDEX "random_world_event_active_status_idx"
  ON "random_world_event_active" ("status");

--> statement-breakpoint

-- INDEX (template_id, started_at_game_day): successor eligibility windows (permanent_residue,
-- apparent_recovery -- C2/C4) + BO per-template history.
CREATE INDEX "random_world_event_active_template_started_idx"
  ON "random_world_event_active" ("template_id", "started_at_game_day");

--> statement-breakpoint

-- INDEX (district_id, started_at_game_day): the D6 per-district 30-day activation cooldown gate
-- (C2 phase 3).
CREATE INDEX "random_world_event_active_district_started_idx"
  ON "random_world_event_active" ("district_id", "started_at_game_day");

--> statement-breakpoint

GRANT UPDATE ON "random_world_event_active" TO app_rw; -- SELECT/INSERT auto-grantés (0013 ALTER DEFAULT PRIVILEGES)

--> statement-breakpoint

-- coupling_discovery_cascade: per-player Sideways-Failure coupling EXPOSURE ledger (design §4.2) --
-- the row IS the "coupling exposed" flag (canon: "whether discovered couplings can later be forgotten
-- (default never)" -- never purged, never mutated after insert). UNIQUE (player_id, pair_key): a given
-- player discovers a given TightCouplingPair at most once (permanent exposure, C3 scope).
CREATE TABLE IF NOT EXISTS "coupling_discovery_cascade" (
  "id"                       uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"                uuid        NOT NULL
    REFERENCES "player"("player_id") ON DELETE CASCADE,
  "pair_key"                 text        NOT NULL,
  "source_event_id"          uuid        NOT NULL
    REFERENCES "random_world_event_active"("id") ON DELETE CASCADE,
  "discovered_at_game_day"   integer     NOT NULL,
  "created_at"                timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "coupling_discovery_cascade_player_pair_unique" UNIQUE ("player_id", "pair_key")
);

--> statement-breakpoint

-- INDEX (player_id, discovered_at_game_day): the E2E-RW-02 30-day rolling cascade cap count (C3).
CREATE INDEX "coupling_discovery_cascade_player_discovered_idx"
  ON "coupling_discovery_cascade" ("player_id", "discovered_at_game_day");

--> statement-breakpoint

-- Pas de GRANT UPDATE explicite : append-only ledger (jamais mutée après insert -- exposure permanente).

-- random_world_daily_run: the daily-tick claim + diagnostics + rolling state ledger (design §4.3, S10
-- idempotency mirror). PK game_day (not uuid) -- the claim IS the row (INSERT ... ON CONFLICT DO
-- NOTHING, C2 phase 0). quorum_adoption/saturated_district_ids are rolling per-district vectors (D10 --
-- no dedicated 18-float table for a vector this small; C2/C3/C4 read the prior day's row).
CREATE TABLE IF NOT EXISTS "random_world_daily_run" (
  "game_day"                    integer     NOT NULL PRIMARY KEY,
  "evaluated_template_count"    smallint    NOT NULL DEFAULT 0,
  "activation_count"            smallint    NOT NULL DEFAULT 0,
  "gated_cascade_attempts"      smallint    NOT NULL DEFAULT 0,
  "saturated_district_ids"      jsonb       NOT NULL DEFAULT '[]'::jsonb,
  "quorum_adoption"              jsonb       NOT NULL DEFAULT '{}'::jsonb,
  "created_at"                   timestamptz NOT NULL DEFAULT now()
);

--> statement-breakpoint

GRANT UPDATE ON "random_world_daily_run" TO app_rw; -- SELECT/INSERT auto-grantés (0013) -- phase 5 counters UPDATE

--> statement-breakpoint

-- ══════════════════════════════════════════════════════════════════════════════════════════════
-- PART 2 -- effect_modifier DD-RW1 generalization (ADDITIVE 3rd sibling parent, design §3.3/§4.4,
-- mirrors DD-B2 migration 0114 EXACTLY -- same discipline, same proof shape).
-- ══════════════════════════════════════════════════════════════════════════════════════════════

-- DD-RW1 part 1: ADD the new nullable random-world parent FK column.
ALTER TABLE "effect_modifier"
  ADD COLUMN IF NOT EXISTS "random_world_event_active_id" uuid
    REFERENCES "random_world_event_active"("id") ON DELETE CASCADE;

--> statement-breakpoint

-- DD-RW1 part 2: exactly-one-parent CHECK -- SWAP 2-arg -> 3-arg. Every existing row (political:
-- active_event_id set; live-ops: live_ops_active_event_id set; either way
-- random_world_event_active_id NULL from the column ADD above) already satisfies num_nonnulls = 1
-- unchanged, so this DROP+ADD validates cleanly over all pre-existing rows with ZERO data change.
ALTER TABLE "effect_modifier"
  DROP CONSTRAINT "effect_modifier_exactly_one_parent_chk";

--> statement-breakpoint

ALTER TABLE "effect_modifier"
  ADD CONSTRAINT "effect_modifier_exactly_one_parent_chk"
    CHECK (num_nonnulls("active_event_id", "live_ops_active_event_id", "random_world_event_active_id") = 1);

--> statement-breakpoint

-- DD-RW1 part 3: index for the random-world revert-by-event DELETE (EffectModifierService.
-- revertRandomWorldEvent / reapplyRandomWorldEvent, C1), mirroring effect_modifier_active_event_idx /
-- effect_modifier_live_ops_active_event_idx.
CREATE INDEX "effect_modifier_random_world_event_idx"
  ON "effect_modifier" ("random_world_event_active_id");
