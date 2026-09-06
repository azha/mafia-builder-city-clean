-- migration 0106: 3 effect-engine enums + political_event_active + effect_modifier tables (04e-A1 C2 — Engine schema, G7)
-- Plan: docs/superpowers/plans/2026-07-04-04e-A-political-engine-plan.md C2
-- Design: docs/superpowers/specs/2026-07-04-04e-A-political-engine-design.md §2 (thick effect engine) + §11 (data model)
-- Canon: docs/tech/04e_political_events_and_liveops/political_event_catalogue.md :26,304 (6 categories)
-- R9.3: backported to docs/tech/09_data_model/schema_effect_modifier.md same-commit.
-- Anti-fabrication: no Math.random(), no non-deterministic defaults.
-- Zero-regression: ADDITIVE only. No existing tables/columns modified.
-- GLOBAL engine tables: neither table carries a player_id FK. effect_modifier.scope_ref is a
--   polymorphic text ref (district id / player id / cohort key) — never a DB FK (design §11).
-- FK: effect_modifier.active_event_id -> political_event_active(id) ON DELETE CASCADE.

--> statement-breakpoint

-- effect_scope: the D2 scope axis (design §2.4). GLOBAL always matches; DISTRICT/PLAYER/COHORT
-- match against scope_ref. PLAYER/COHORT built here, consumed live by 04e-B (design §2.4).
CREATE TYPE "effect_scope" AS ENUM (
  'GLOBAL',
  'DISTRICT',
  'PLAYER',
  'COHORT'
);

--> statement-breakpoint

-- effect_modifier_op: the compose operation (design §2.4). Fixed compose order (C3
-- EffectOverlayStore.applyModifiers): all MULTIPLY folded, then all ADD, then any SET.
CREATE TYPE "effect_modifier_op" AS ENUM (
  'ADD',
  'MULTIPLY',
  'SET'
);

--> statement-breakpoint

-- political_event_category: the 6 canonical political-event categories
-- (political_event_catalogue.md :26 invariant #1, glossary :304).
CREATE TYPE "political_event_category" AS ENUM (
  'ELECTORAL',
  'BUDGET',
  'ORDINANCE',
  'SCANDAL',
  'CRACKDOWN',
  'REFORM'
);

--> statement-breakpoint

-- political_event_active: city-global active-event lifecycle ledger (design §5.2 — one shared
-- active-event set for the whole city). event_id is a soft ref (text) to the hard-coded
-- PoliticalEvent static catalogue (A2 owns the TS config; no DB-side PoliticalEvent table to FK to).
-- category mirrors the static entry's category at activation time.
CREATE TABLE IF NOT EXISTS "political_event_active" (
  "id"                     uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id"               text        NOT NULL,
  "category"               political_event_category NOT NULL,
  "activated_at_game_day"  integer     NOT NULL,
  "expires_at_game_day"    integer
);

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "political_event_active" TO app_rw;

--> statement-breakpoint

-- effect_modifier: the revert-guaranteed scoped overlay row — the engine's core persisted state
-- (design §2.2/§2.3). EffectOverlayStore (C3) snapshots active rows into memory; applyEvent (C4)
-- INSERTs a batch transactionally (SERIALIZABLE); revertEvent/revertExpired (C4) DELETE the rows —
-- the DELETE IS the revert (no floating baseline to restore).
CREATE TABLE IF NOT EXISTS "effect_modifier" (
  "id"                     uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "active_event_id"        uuid        NOT NULL
    REFERENCES "political_event_active"("id") ON DELETE CASCADE,
  "scope_type"             effect_scope NOT NULL,
  "scope_ref"              text,
  "tunable_key"            text        NOT NULL,
  "op"                     effect_modifier_op NOT NULL,
  "magnitude"              numeric     NOT NULL,
  "applied_at_game_day"    integer     NOT NULL,
  "expires_at_game_day"    integer
);

--> statement-breakpoint

-- INDEX (tunable_key, scope_type): EffectOverlayStore's per-key snapshot rebuild query (C3 boot +
-- effect_modifiers_changed reload).
CREATE INDEX "effect_modifier_tunable_key_scope_idx"
  ON "effect_modifier" ("tunable_key", "scope_type");

--> statement-breakpoint

-- INDEX (active_event_id): revertEvent's DELETE-by-event (C4).
CREATE INDEX "effect_modifier_active_event_idx"
  ON "effect_modifier" ("active_event_id");

--> statement-breakpoint

-- INDEX (expires_at_game_day): revertExpired's NIGHTLY DELETE-by-expiry scan (C4). NULL (permanent)
-- rows are naturally excluded by the `IS NOT NULL AND <= day` predicate at query time.
CREATE INDEX "effect_modifier_expires_at_idx"
  ON "effect_modifier" ("expires_at_game_day");

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "effect_modifier" TO app_rw;
