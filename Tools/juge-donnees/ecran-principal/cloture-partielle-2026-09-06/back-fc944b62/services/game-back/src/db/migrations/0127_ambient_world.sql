-- RENUMBER-AT-INTEGRATION -- DONE (2026-07-14): authored in-branch as 0125, RENUMBERED to 0127 at P3-C
-- integration. P3-C (merged to main 475344fd) took 0125_supply_chain + 0126_mycelial_transit_stress, so
-- 04g-A's ambient migration lands at the next-free 0127 (journal idx 127). Documented mechanical pattern
-- (04f-B 0120->0124, P3-A/B) -- 04g-A merged SECOND, so it renumbered. Test assertions reference
-- table/enum/tunable NAMES + the migration hash tag (now 0127_ambient_world), never a bare order number.
--
-- migration 0127: ambient_world (04g-A C1 -- Constant Hum substrate, 3 tables + 3 enums)
-- Plan: docs/superpowers/plans/2026-07-13-04g-A-constant-hum-plan.md C1
-- Design: docs/superpowers/specs/2026-07-13-04g-A-constant-hum-design.md §4 (data model)
-- Canon: projects/mafia_city_world_events/CATALOGUE_REPORT.md :1218-1236 (Constant Hum) +
--        docs/tech/04g_ambient_world_events_templates/liveops_templates.md §Flow 1/§Flow 2/§Scenarios 1-2
-- R9.3: backported to docs/tech/09_data_model/schema_ambient_world.md same-commit.
-- Anti-fabrication: no Math.random(), no non-deterministic defaults.
-- Zero-regression: ADDITIVE only. No existing table/column modified.
-- GLOBAL/city-wide tables: constant_hum_cell + ambient_micro_event + off_hours_drift_detection all FK
--   district_id -> districts(id) ON DELETE CASCADE (districts are GLOBAL static rows, never deleted in
--   practice -- CASCADE is defensive). ambient_micro_event.attended_by_player_id FK player ON DELETE SET
--   NULL (not in the GDPR hard-delete table list, persistence_rules.md §2.4 -- the row is city-global
--   content, a player deletion only clears the attribution).

--> statement-breakpoint

-- ambient_micro_event_kind: the 6 canon-verbatim micro-event kinds (design §3.2, CATALOGUE_REPORT.md
-- :1218 "a corner fight, a stalled tram, a delayed shipment, a noisy block, a building inspection, a
-- rumor in a bar"). C2 (ambient-micro-event.service.ts) is the first writer; this migration only creates
-- the domain.
CREATE TYPE "ambient_micro_event_kind" AS ENUM (
  'corner_fight',
  'stalled_tram',
  'delayed_shipment',
  'noisy_block',
  'building_inspection',
  'bar_rumor'
);

--> statement-breakpoint

-- ambient_channel: the 3 canon channels (design §3.2/D6 -- CATALOGUE_REPORT.md :1230 "channel count
-- (default 3)"). Derived from kind, never independently chosen.
CREATE TYPE "ambient_channel" AS ENUM (
  'constant_hum',
  'trade_channel',
  'bar_talk'
);

--> statement-breakpoint

-- ambient_micro_event_status: live -> attended (terminal, player-read) | expired (terminal, decay sweep
-- -- "routine residue", design D9).
CREATE TYPE "ambient_micro_event_status" AS ENUM (
  'live',
  'attended',
  'expired'
);

--> statement-breakpoint

-- constant_hum_cell: the city-global 168-cell weekly heat baseline grid (design §3.1). PK composite
-- (district_id, hour_of_week) -- the composite key itself IS the structural 168-cap (Scenario 1 canon:
-- liveops_templates.constant_hum_cells_per_week is hot_reloadable: NO -- enforced by this table's shape
-- + the hour_of_week CHECK below, never by a tunable read at write time). Cells created LAZILY at first
-- fold (CONSTANT_HUM_CELL_TICK, HOURLY/6, C1) -- no seed-3024-rows-at-boot.
CREATE TABLE IF NOT EXISTS "constant_hum_cell" (
  "district_id"           integer     NOT NULL
    REFERENCES "districts"("id") ON DELETE CASCADE,
  "hour_of_week"          smallint    NOT NULL,
  "baseline_heat_ema"     numeric     NOT NULL,
  "sample_count"          integer     NOT NULL DEFAULT 0,
  "last_updated_game_day" integer     NOT NULL,
  "updated_at"            timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("district_id", "hour_of_week"),
  CONSTRAINT "constant_hum_cell_hour_of_week_chk" CHECK ("hour_of_week" BETWEEN 0 AND 167)
);

--> statement-breakpoint

GRANT UPDATE ON "constant_hum_cell" TO app_rw;

--> statement-breakpoint

-- ambient_micro_event: the Poisson micro-event stream (design §3.2, C2 scope -- this migration only
-- creates the table; the generator/decay-sweep service lands C2's AMBIENT_DAILY_TICK, NIGHTLY/27).
CREATE TABLE IF NOT EXISTS "ambient_micro_event" (
  "id"                     uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "game_day"               integer     NOT NULL,
  "district_id"            integer     NOT NULL
    REFERENCES "districts"("id") ON DELETE CASCADE,
  "hour_of_week"           smallint    NOT NULL,
  "kind"                   ambient_micro_event_kind   NOT NULL,
  "channel"                ambient_channel            NOT NULL,
  "status"                 ambient_micro_event_status NOT NULL DEFAULT 'live',
  "expires_at_game_minute" bigint      NOT NULL,
  "attended_by_player_id"  uuid
    REFERENCES "player"("player_id") ON DELETE SET NULL,
  "attended_at_game_day"   integer,
  "created_at"             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "ambient_micro_event_hour_of_week_chk" CHECK ("hour_of_week" BETWEEN 0 AND 167)
);

--> statement-breakpoint

-- INDEX (status, expires_at_game_minute): the C2 decay sweep's hot path ("every live row past expiry").
CREATE INDEX "ambient_micro_event_status_expires_idx"
  ON "ambient_micro_event" ("status", "expires_at_game_minute");

--> statement-breakpoint

-- INDEX (district_id, game_day): the C2 generation idempotency-skip + BO diagnostic hot path.
CREATE INDEX "ambient_micro_event_district_day_idx"
  ON "ambient_micro_event" ("district_id", "game_day");

--> statement-breakpoint

GRANT UPDATE ON "ambient_micro_event" TO app_rw;

--> statement-breakpoint

-- off_hours_drift_detection: the Off-Hours Drift detector's trip ledger (design §3.4, C3 scope -- this
-- migration only creates the table; OffHoursDriftDetector lands C3's AMBIENT_DAILY_TICK phase 2).
CREATE TABLE IF NOT EXISTS "off_hours_drift_detection" (
  "id"                    uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "district_id"           integer     NOT NULL
    REFERENCES "districts"("id") ON DELETE CASCADE,
  "detected_at_game_day"  integer     NOT NULL,
  "window_days"           integer     NOT NULL,
  "drift_relative"        numeric     NOT NULL,
  "cells_over_threshold"  smallint    NOT NULL,
  "baseline_snapshot"     jsonb       NOT NULL,
  "created_at"            timestamptz NOT NULL DEFAULT now()
);

--> statement-breakpoint

-- INDEX (district_id, detected_at_game_day): BO diagnostic + dedup-check hot path (C3).
CREATE INDEX "off_hours_drift_detection_district_idx"
  ON "off_hours_drift_detection" ("district_id", "detected_at_game_day");
