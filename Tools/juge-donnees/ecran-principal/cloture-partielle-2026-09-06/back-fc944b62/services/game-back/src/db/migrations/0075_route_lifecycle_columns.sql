-- Migration: 0075_route_lifecycle_columns
-- Enum:      route_stance (NEW) — 3 members: fastest | balanced | evasive
-- Enum:      route_state (NEW) — 4 members: draft | active | saturated | severed
-- Alter:     route +8 cols (NEW routing + persistence columns — System 9b C1, DD-PERSIST §4.1)
--
-- route_stance pgEnum:
--   3 auto-routing stances (DD-STANCE §3.3, distribution_couriers_runners.md §9b).
--   fastest:  minimize distance/time; ignore risk. Shortest path, most exposed.
--   balanced: the default; sane mix (back-compat M1 default).
--   evasive:  minimize per-block patrol+detection+debt exposure; accept extra distance.
--   [PROV-Y26Q2] weight profiles per stance in distribution-tunables.ts (C2).
--
-- route_state pgEnum:
--   4 lifecycle states (DD-REPLAN §4.4 state machine).
--   draft:     created, not yet dispatched.
--   active:    usable plan (dispatchable).
--   saturated: derived saturation high but below sever threshold (warn band, still dispatchable).
--   severed:   derived saturation >= sever threshold — NOT dispatchable until replanned (C9).
--
-- route NEW columns (additive — existing route columns stay byte-identical):
--   straight_line_distance: real NOT NULL DEFAULT 0
--     A* geometric endpoint distance (server-only, R2.2; sinuosity denominator §3.5).
--     Default 0 = safe zero-regression for all existing M1 route rows.
--   sinuosity_index: real NOT NULL DEFAULT 1.0
--     path_length / straight_line (server-only, R2.2; bucket derived §3.5).
--     Default 1.0 = a straight path (zero-regression for M1 2-stop rows).
--   stance: route_stance NOT NULL DEFAULT 'balanced'
--     The auto-routing stance persisted so replan re-paths with the same stance (DD-PERSIST §4.1).
--     Default 'balanced' = M1 back-compat (no stance field in existing dispatches).
--   vehicle_type: vehicle_type NOT NULL DEFAULT 'foot'
--     REUSE the existing vehicle_type enum (no new vehicle enum).
--     Default 'foot' = M1 back-compat (all existing routes are foot couriers).
--   route_name: varchar(48) nullable
--     Saved-route name (DD-PERSIST §4.1). NULL for ad-hoc dispatch routes.
--   is_saved: boolean NOT NULL DEFAULT false
--     true = persistent reusable plan; false = ad-hoc dispatch route.
--     Default false = M1 back-compat (all existing routes are ad-hoc).
--   state: route_state NOT NULL DEFAULT 'active'
--     The §4.4 lifecycle machine state.
--     Default 'active' = M1 back-compat (existing routes are active plans).
--   version: integer NOT NULL DEFAULT 1
--     Replan version (DD-REPLAN §4.4). Identity = route_id; version bumps on replan.
--     Default 1 = the initial version for all existing + new routes.
--
-- R9.3: backported to docs/tech/09_data_model/schema_operational_chain.md same-commit.
-- R2.2: straight_line_distance / sinuosity_index = server-only (never projected raw to client).
-- DD-DEBT-SSOT: route has NO debt column (D3 — debt lives on corridor_debt table, C8).
-- Zero-regression: existing route rows get safe defaults; M1 dispatch path byte-identical.
-- C4: no Math.random / Date.now. No [PROV-Y26Q2] scalar inlined (magnitudes in getters C2).
-- Anti-fabrication: vehicle_type REUSES the existing enum (no new vehicle enum).

CREATE TYPE "route_stance" AS ENUM ('fastest', 'balanced', 'evasive');

--> statement-breakpoint

CREATE TYPE "route_state" AS ENUM ('draft', 'active', 'saturated', 'severed');

--> statement-breakpoint

ALTER TABLE "route"
  ADD COLUMN "straight_line_distance" real NOT NULL DEFAULT 0,
  ADD COLUMN "sinuosity_index" real NOT NULL DEFAULT 1.0,
  ADD COLUMN "stance" route_stance NOT NULL DEFAULT 'balanced',
  ADD COLUMN "vehicle_type" vehicle_type NOT NULL DEFAULT 'foot',
  ADD COLUMN "route_name" varchar(48),
  ADD COLUMN "is_saved" boolean NOT NULL DEFAULT false,
  ADD COLUMN "state" route_state NOT NULL DEFAULT 'active',
  ADD COLUMN "version" integer NOT NULL DEFAULT 1;
