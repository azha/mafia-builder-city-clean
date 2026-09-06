-- 0017_operational_chain.sql — schema_operational_chain.md §2/§3/§5. PALIMPSEST §3.2 (forward-only).
-- IMPLEMENTS: Phase 2 / Task 0 — operational-chain M1 persistence (acquire → produce → launder →
--             cash-out, substance Brindle). AUTHORED-FRESH (absent from GDD 09 + all 09 chunks),
--             modeled from docs/tech/04a_operational_systems/* per the T0 audit. R9.3: adds 9 new
--             tables + 14 enums only — NO Phase-1 table is altered (git diff of Phase-1 = empty).
-- FK building_id → buildings (0005). FK player_id → player (0001). FK route/courier intra-chunk.

-- ===== Enums PG natifs (CREATE TYPE — domaines fermés, membres 04a-verbatim) =====
CREATE TYPE "building_operational_type" AS ENUM ('front_shop', 'cash_safehouse', 'stash', 'lab', 'grow_house', 'refinery', 'press_house', 'distribution_hub', 'office', 'dealer_spot_front', 'money_holding');
--> statement-breakpoint
CREATE TYPE "conversion_stage"          AS ENUM ('none', 'gutting', 'installing', 'testing', 'operational');
--> statement-breakpoint
CREATE TYPE "cover_quality"             AS ENUM ('weak', 'standard', 'strong');
--> statement-breakpoint
CREATE TYPE "precursor_type"            AS ENUM ('pyralin', 'thalmite', 'garnet_salt');
--> statement-breakpoint
CREATE TYPE "precursor_order_status"    AS ENUM ('pending', 'in_transit', 'delivered', 'seized');
--> statement-breakpoint
CREATE TYPE "substance_type"            AS ENUM ('brindle', 'crick', 'hush', 'ash');
--> statement-breakpoint
CREATE TYPE "cook_stage"                AS ENUM ('stage_1', 'stage_2', 'stage_2_intermediate', 'stage_3', 'stage_4', 'completed', 'aborted');
--> statement-breakpoint
CREATE TYPE "purity_grade"              AS ENUM ('crude', 'low', 'standard', 'refined', 'pure');
--> statement-breakpoint
CREATE TYPE "cut_purity_bucket"         AS ENUM ('pure', 'standard', 'cheap', 'max_margin');
--> statement-breakpoint
CREATE TYPE "courier_role_type"         AS ENUM ('courier', 'runner');
--> statement-breakpoint
CREATE TYPE "vehicle_type"              AS ENUM ('foot', 'bike', 'car', 'refrigerated_van');
--> statement-breakpoint
CREATE TYPE "courier_state"             AS ENUM ('idle', 'in_transit', 'at_destination', 'returning', 'caught', 'compromised');
--> statement-breakpoint
CREATE TYPE "shift_status"              AS ENUM ('in_transit', 'completed', 'caught');
--> statement-breakpoint
CREATE TYPE "dealer_state"              AS ENUM ('working', 'idle', 'absent', 'compromised');
--> statement-breakpoint

-- ===== Table 1 : building_operational_state (1-1 avec buildings) =====
CREATE TABLE "building_operational_state" (
  "building_id"             uuid    PRIMARY KEY REFERENCES "buildings"("building_id") ON DELETE CASCADE,
  "player_id"               uuid    NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "operational_type"        building_operational_type NOT NULL,
  "conversion_stage"        conversion_stage NOT NULL DEFAULT 'none',
  "cover_quality"           cover_quality NOT NULL DEFAULT 'standard',
  "equipment_tier"          smallint NOT NULL DEFAULT 1,
  "setup_remaining_ticks"   integer  NOT NULL DEFAULT 0,
  "maintenance_due_in_days" integer  NOT NULL DEFAULT 0,
  "became_operational_at"   timestamptz
);
--> statement-breakpoint
CREATE INDEX "building_operational_state_player_idx"      ON "building_operational_state" ("player_id");
--> statement-breakpoint
CREATE INDEX "building_operational_state_player_type_idx" ON "building_operational_state" ("player_id", "operational_type");
--> statement-breakpoint
ALTER TABLE "building_operational_state" ADD CONSTRAINT "bos_equipment_tier_chk"   CHECK (equipment_tier BETWEEN 1 AND 5);
--> statement-breakpoint
ALTER TABLE "building_operational_state" ADD CONSTRAINT "bos_setup_remaining_chk"  CHECK (setup_remaining_ticks >= 0);
--> statement-breakpoint
ALTER TABLE "building_operational_state" ADD CONSTRAINT "bos_maintenance_due_chk"  CHECK (maintenance_due_in_days >= 0);
--> statement-breakpoint

-- ===== Table 2 : precursor_stock =====
CREATE TABLE "precursor_stock" (
  "stock_id"        uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"       uuid    NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "building_id"     uuid    NOT NULL REFERENCES "buildings"("building_id") ON DELETE CASCADE,
  "precursor_type"  precursor_type NOT NULL,
  "quantity_units"  integer NOT NULL DEFAULT 0,
  "updated_at"      timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "precursor_stock_player_idx"                ON "precursor_stock" ("player_id");
--> statement-breakpoint
CREATE INDEX "precursor_stock_player_building_type_idx"  ON "precursor_stock" ("player_id", "building_id", "precursor_type");
--> statement-breakpoint
ALTER TABLE "precursor_stock" ADD CONSTRAINT "ps_quantity_units_chk" CHECK (quantity_units >= 0);
--> statement-breakpoint

-- ===== Table 3 : precursor_order =====
CREATE TABLE "precursor_order" (
  "order_id"         uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"        uuid    NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "building_id"      uuid    NOT NULL REFERENCES "buildings"("building_id") ON DELETE CASCADE,
  "precursor_type"   precursor_type NOT NULL,
  "quantity_units"   integer NOT NULL,
  "status"           precursor_order_status NOT NULL DEFAULT 'pending',
  "ordered_at_tick"  bigint  NOT NULL,
  "arrives_at_tick"  bigint  NOT NULL
);
--> statement-breakpoint
CREATE INDEX "precursor_order_player_idx"        ON "precursor_order" ("player_id");
--> statement-breakpoint
CREATE INDEX "precursor_order_player_status_idx" ON "precursor_order" ("player_id", "status");
--> statement-breakpoint
ALTER TABLE "precursor_order" ADD CONSTRAINT "po_quantity_units_chk" CHECK (quantity_units > 0);
--> statement-breakpoint
ALTER TABLE "precursor_order" ADD CONSTRAINT "po_arrives_after_chk"  CHECK (arrives_at_tick >= ordered_at_tick);
--> statement-breakpoint

-- ===== Table 4 : cook_session =====
CREATE TABLE "cook_session" (
  "cook_session_id"        uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"              uuid    NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "lab_building_id"        uuid    NOT NULL REFERENCES "buildings"("building_id") ON DELETE CASCADE,
  "substance_type"         substance_type NOT NULL DEFAULT 'brindle',
  "current_stage"          cook_stage NOT NULL DEFAULT 'stage_1',
  "started_at_tick"        bigint  NOT NULL,
  "stage_started_at_tick"  bigint  NOT NULL,
  "cut_purity_bucket"      cut_purity_bucket
);
--> statement-breakpoint
CREATE INDEX "cook_session_player_idx"       ON "cook_session" ("player_id");
--> statement-breakpoint
CREATE INDEX "cook_session_player_lab_idx"   ON "cook_session" ("player_id", "lab_building_id");
--> statement-breakpoint
CREATE INDEX "cook_session_player_stage_idx" ON "cook_session" ("player_id", "current_stage");
--> statement-breakpoint

-- ===== Table 5 : product_storage =====
CREATE TABLE "product_storage" (
  "storage_id"            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"             uuid    NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "building_id"           uuid    NOT NULL REFERENCES "buildings"("building_id") ON DELETE CASCADE,
  "substance_type"        substance_type NOT NULL,
  "quantity_grams"        integer NOT NULL DEFAULT 0,
  "purity_grade"          purity_grade NOT NULL DEFAULT 'standard',
  "age_in_storage_hours"  integer NOT NULL DEFAULT 0,
  "updated_at"            timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "product_storage_player_idx"                   ON "product_storage" ("player_id");
--> statement-breakpoint
CREATE INDEX "product_storage_player_building_substance_idx" ON "product_storage" ("player_id", "building_id", "substance_type");
--> statement-breakpoint
ALTER TABLE "product_storage" ADD CONSTRAINT "pst_quantity_grams_chk" CHECK (quantity_grams >= 0);
--> statement-breakpoint
ALTER TABLE "product_storage" ADD CONSTRAINT "pst_age_hours_chk"      CHECK (age_in_storage_hours >= 0);
--> statement-breakpoint

-- ===== Table 6 : dealer (NEW table — NPC employee, §1 décision) =====
CREATE TABLE "dealer" (
  "dealer_id"                 uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"                 uuid    NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "home_building_id"          uuid    NOT NULL REFERENCES "buildings"("building_id") ON DELETE CASCADE,
  "coverage_lek_tile_id"      integer NOT NULL,
  "substance_specialization"  substance_type NOT NULL DEFAULT 'brindle',
  "current_state"             dealer_state NOT NULL DEFAULT 'idle',
  "operating_hours_start"     smallint NOT NULL DEFAULT 0,
  "operating_hours_end"       smallint NOT NULL DEFAULT 23,
  "float_cents"               bigint  NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX "dealer_player_idx"          ON "dealer" ("player_id");
--> statement-breakpoint
CREATE INDEX "dealer_player_building_idx" ON "dealer" ("player_id", "home_building_id");
--> statement-breakpoint
CREATE INDEX "dealer_player_lek_idx"      ON "dealer" ("player_id", "coverage_lek_tile_id");
--> statement-breakpoint
ALTER TABLE "dealer" ADD CONSTRAINT "d_hours_start_chk" CHECK (operating_hours_start BETWEEN 0 AND 23);
--> statement-breakpoint
ALTER TABLE "dealer" ADD CONSTRAINT "d_hours_end_chk"   CHECK (operating_hours_end BETWEEN 0 AND 23);
--> statement-breakpoint
ALTER TABLE "dealer" ADD CONSTRAINT "d_float_cents_chk" CHECK (float_cents >= 0);
--> statement-breakpoint

-- ===== Table 7 : route (NEW table — created BEFORE courier so courier.current_route_id FK resolves) =====
CREATE TABLE "route" (
  "route_id"                 uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"                uuid    NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "origin_building_id"       uuid    NOT NULL REFERENCES "buildings"("building_id") ON DELETE CASCADE,
  "destination_building_id"  uuid    NOT NULL REFERENCES "buildings"("building_id") ON DELETE CASCADE,
  "path_blocks"              jsonb   NOT NULL DEFAULT '[]'::jsonb,
  "river_crossings"          integer NOT NULL DEFAULT 0,
  "ephemeral_mode"           boolean NOT NULL DEFAULT false
);
--> statement-breakpoint
CREATE INDEX "route_player_idx"             ON "route" ("player_id");
--> statement-breakpoint
CREATE INDEX "route_player_origin_dest_idx" ON "route" ("player_id", "origin_building_id", "destination_building_id");
--> statement-breakpoint
ALTER TABLE "route" ADD CONSTRAINT "r_river_crossings_chk" CHECK (river_crossings >= 0);
--> statement-breakpoint
ALTER TABLE "route" ADD CONSTRAINT "r_no_self_route_chk"   CHECK (origin_building_id <> destination_building_id);
--> statement-breakpoint

-- ===== Table 8 : courier (NEW table — current_route_id FK → route SET NULL) =====
CREATE TABLE "courier" (
  "courier_id"            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"             uuid    NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "role_type"             courier_role_type NOT NULL DEFAULT 'courier',
  "vehicle_type"          vehicle_type NOT NULL DEFAULT 'foot',
  "home_dispatch_hub_id"  uuid    REFERENCES "buildings"("building_id") ON DELETE SET NULL,
  "current_state"         courier_state NOT NULL DEFAULT 'idle',
  "current_route_id"      uuid    REFERENCES "route"("route_id") ON DELETE SET NULL,
  "current_load_grams"    integer NOT NULL DEFAULT 0,
  "current_load_cents"    bigint  NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX "courier_player_idx"       ON "courier" ("player_id");
--> statement-breakpoint
CREATE INDEX "courier_player_state_idx" ON "courier" ("player_id", "current_state");
--> statement-breakpoint
ALTER TABLE "courier" ADD CONSTRAINT "c_load_grams_chk" CHECK (current_load_grams >= 0);
--> statement-breakpoint
ALTER TABLE "courier" ADD CONSTRAINT "c_load_cents_chk" CHECK (current_load_cents >= 0);
--> statement-breakpoint

-- ===== Table 9 : courier_shift (NEW table — FK courier + route) =====
CREATE TABLE "courier_shift" (
  "shift_id"               uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"              uuid    NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "courier_id"             uuid    NOT NULL REFERENCES "courier"("courier_id") ON DELETE CASCADE,
  "route_id"               uuid    NOT NULL REFERENCES "route"("route_id") ON DELETE CASCADE,
  "started_at_tick"        bigint  NOT NULL,
  "current_segment_index"  integer NOT NULL DEFAULT 0,
  "cargo_grams"            integer NOT NULL DEFAULT 0,
  "cargo_cents"            bigint  NOT NULL DEFAULT 0,
  "status"                 shift_status NOT NULL DEFAULT 'in_transit'
);
--> statement-breakpoint
CREATE INDEX "courier_shift_player_idx"         ON "courier_shift" ("player_id");
--> statement-breakpoint
CREATE INDEX "courier_shift_player_courier_idx" ON "courier_shift" ("player_id", "courier_id");
--> statement-breakpoint
CREATE INDEX "courier_shift_player_status_idx"  ON "courier_shift" ("player_id", "status");
--> statement-breakpoint
ALTER TABLE "courier_shift" ADD CONSTRAINT "csh_segment_index_chk" CHECK (current_segment_index >= 0);
--> statement-breakpoint
ALTER TABLE "courier_shift" ADD CONSTRAINT "csh_cargo_grams_chk"   CHECK (cargo_grams >= 0);
--> statement-breakpoint
ALTER TABLE "courier_shift" ADD CONSTRAINT "csh_cargo_cents_chk"   CHECK (cargo_cents >= 0);
--> statement-breakpoint

-- ===== Runtime grants (app_rw least-privilege role — 0013_app_role.sql) =====
-- 0013's ALTER DEFAULT PRIVILEGES auto-grants only SELECT+INSERT on future tables. All 9 tables here
-- are MUTABLE at runtime (tick-scheduler advances cook stages / transit segments / setup ticks /
-- dealer float; player actions INSERT/UPDATE). They are NOT append-only — so each needs an explicit
-- UPDATE/DELETE grant, else the first mutation gets `permission denied`. (schema_operational_chain.md §5)
GRANT UPDATE, DELETE ON
  "building_operational_state",
  "precursor_stock",
  "precursor_order",
  "cook_session",
  "product_storage",
  "dealer",
  "route",
  "courier",
  "courier_shift"
TO app_rw;
