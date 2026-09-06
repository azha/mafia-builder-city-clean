-- 0023_grow_house_schema_foundation.sql — schema_operational_chain.md §7.11 (building-type / in-house cultivation surface : grow_house). PALIMPSEST §3.2 (forward-only).
-- IMPLEMENTS: Phase 3 / vector #3 (grow_house — in-house precursor cultivation) / Task 0. R9.3: this matches
--             src/db/schema/operational_chain.ts byte-for-byte. ONLY ADDS — no existing table is redefined:
--             1 new enum (grow_stage) + 1 new table (grow_session).
--             grow_house is ALREADY a building_operational_type enum member (0017) — NOT re-added.
--             precursor_type is UNCHANGED — grow_session.precursor_type REUSES the existing 6-member enum
--             (the 3 plant-derived precursors verdant_root_extract / lull_resin / glass_lily are the registry-
--             derived GROWABLE set, posed in T1 — the schema only carries the column, not the subset).
--             Every Phase-1 table, the 9 Phase-2 T0 tables, the raid surface (0018), the substance/cold-chain
--             surface (0019/0020) and the substance/addiction-loyalty + luxury-channel surfaces (0021/0022)
--             are otherwise UNCHANGED (git diff = empty except the additions).
--             precursor_stock keeps its 6 columns byte-for-byte: harvest UPSERTs the EXISTING columns later
--             (T5, source-agnostic) → non-grow precursor_stock rows stay byte-identical (R9.3 byte-identical
--             criterion — grow is a SECOND precursor-sourcing path into the SAME table, not a shape change).
-- FK player_id → player (0001). FK building_id → buildings (0005). No change to cook_session / cook_stage /
-- substance_type / precursor_type enums (grow yields a PRECURSOR into precursor_stock; the cook chain is untouched).

-- ===== grow_stage (NEW enum, §7.11.1) =====
-- Domaine fermé du cycle de croissance d'un grow_session : stage_1 → stage_2 → stage_3 → completed (sibling de
-- cook_stage côté production — le NOMBRE de stages par culture (grow.stage_count=3) vit dans le config-registry
-- applicatif/gdd14, l'enum porte les 4 états du tick GROW_ADVANCE T3). CREATE TYPE classique (nouvel enum, aucune
-- FK/colonne existante à préserver — il peut être créé ET utilisé par grow_session.current_stage ci-dessous dans la
-- MÊME transaction, contrairement à ALTER TYPE ADD VALUE sur un enum existant).
CREATE TYPE "grow_stage" AS ENUM ('stage_1', 'stage_2', 'stage_3', 'completed');
--> statement-breakpoint

-- ===== Table 14 : grow_session (NEW table — la culture in-house en cours, §7.11.2) =====
-- 1 row par culture active sur un grow_house. Sibling de cook_session (§3 Table 4) : une state-machine tick-driven
-- multi-stages, MAIS qui rend un PRECURSEUR dans precursor_stock (source-agnostique) plutôt qu'un produit dans
-- product_storage. plant action (T2) INSERT (stage_1) ; le tick GROW_ADVANCE (MINUTE/18, T3) advance les stages ;
-- tend action (T4) bump tend_count + tended_in_stage ; harvest (T5) dérive le yield tier de tend_count, UPSERT les
-- grammes dans precursor_stock, puis DELETE la session. tend_count = lever husbandry B (yield tier WITHERED/STANDARD/
-- BUMPER). tended_in_stage = enforce one-tend-per-stage (NULL ⇒ stage courant pas encore tendu ; reset par GROW_ADVANCE
-- au passage de stage). PK uuid (gen_random_uuid, calque cook_session_id). precursor_type REUSE l'enum existant.
CREATE TABLE "grow_session" (
  "grow_session_id"       uuid       PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"             uuid       NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "building_id"           uuid       NOT NULL REFERENCES "buildings"("building_id") ON DELETE CASCADE,
  "precursor_type"        precursor_type NOT NULL,
  "current_stage"         grow_stage NOT NULL DEFAULT 'stage_1',
  "started_at_tick"       bigint,
  "stage_started_at_tick" bigint,
  "tend_count"            integer    NOT NULL DEFAULT 0,
  "tended_in_stage"       grow_stage
);
--> statement-breakpoint
-- Index (building_id) : enforce/scan « one active grow per building » (la plant action vérifie l'absence d'une
-- grow_session sur ce bâtiment, 409 ALREADY_GROWING). Index (current_stage) : le sweep set-based du tick
-- GROW_ADVANCE (UPDATE … WHERE current_stage <> 'completed' AND stage_started_at_tick + duration <= currentTick).
CREATE INDEX "grow_session_building_idx" ON "grow_session" ("building_id");
--> statement-breakpoint
CREATE INDEX "grow_session_stage_idx"    ON "grow_session" ("current_stage");
--> statement-breakpoint
-- tend_count >= 0 (calque ha_loyalty_score_chk §7.9.2 / cs_refining_passes_chk §7.10.4 / br_grams_seized_chk §7.3).
ALTER TABLE "grow_session" ADD CONSTRAINT "gs_tend_count_chk" CHECK (tend_count >= 0);
--> statement-breakpoint

-- ===== Runtime grants (app_rw least-privilege role — 0013_app_role.sql) =====
-- grow_session is a NEW table created by `mafia`: 0013's ALTER DEFAULT PRIVILEGES auto-grants SELECT+INSERT. It is
-- MUTABLE AND deletable at runtime (plant INSERTs; the GROW_ADVANCE tick UPDATEs current_stage/stage_started_at_tick/
-- tended_in_stage AND DELETEs on harvest; tend UPDATEs tend_count/tended_in_stage; the raid seize DELETEs the active
-- session) → add explicit GRANT UPDATE, DELETE, else the first scheduler/action mutation gets `permission denied`.
-- (calque cook_session/precursor_stock 0017 §5 GRANT UPDATE, DELETE.)
GRANT UPDATE, DELETE ON "grow_session" TO app_rw;
