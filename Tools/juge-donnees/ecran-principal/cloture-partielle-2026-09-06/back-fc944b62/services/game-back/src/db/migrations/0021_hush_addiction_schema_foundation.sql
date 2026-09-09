-- 0021_hush_addiction_schema_foundation.sql — schema_operational_chain.md §7.9 (substance / addiction-loyalty surface). PALIMPSEST §3.2 (forward-only).
-- IMPLEMENTS: Phase 2b / vector #2b (substances — Hush) / Task 0. R9.3: this matches
--             src/db/schema/operational_chain.ts byte-for-byte. ONLY ADDS — no existing table is redefined:
--             1 enum member (precursor_type += 'lull_resin') + 1 new table (hush_addiction). Every Phase-1 table,
--             the 9 Phase-2 T0 tables, the raid surface (0018) and the substance/cold-chain surface (0019/0020)
--             are otherwise UNCHANGED (git diff = empty except the 2 additions).
-- FK player_id → player (0001). FK dealer_spot_building_id → buildings (0005). No change to cook_session/product_storage
-- substance_type or the cook_stage enum (Hush reuses 'hush' + stage_1 → stage_2 → completed, already present).

-- ===== precursor_type (existant, §2) — 1 membre AJOUTÉ (§7.9.1) =====
-- Hush precursor = Lull resin (production_secondaries.md §Hush — provisional name [PROV-Y26Q2], canon name TBD). ADD VALUE
-- PG-natif (PAS recreate-enum, qui casserait precursor_stock.precursor_type / precursor_order.precursor_type). Sous
-- PG >= 12 (stack postgres:16) ALTER TYPE … ADD VALUE s'exécute DANS un bloc transactionnel ; l'unique restriction = la
-- valeur ajoutée ne peut PAS être UTILISÉE (DML / default / comparaison) dans la MÊME transaction que l'ADD. Cette migration
-- AJOUTE le membre (aucune DML l'utilisant — la table hush_addiction ci-dessous ne référence PAS precursor_type) →
-- conforme au MigrationRunner (BEGIN … COMMIT par fichier, exactement comme 0019 += verdant_root_extract). IF NOT EXISTS
-- = idempotent (re-run au boot inoffensif).
ALTER TYPE "precursor_type" ADD VALUE IF NOT EXISTS 'lull_resin';
--> statement-breakpoint

-- ===== Table 11 : hush_addiction (NEW table — l'entité canon DealerSpotLoyalty, §7.9.2) =====
-- 1 row par dealer-spot Hush (lazy-créée au 1er deal Hush). PK COMPOSITE (player_id, dealer_spot_building_id).
-- loyalty_score = accumulateur entier deal-count (M1 grounding de addiction_loyalty bucket) ; projeté en bande
-- qualitative addiction_loyalty_status (LOW/STABLE/HIGH) côté client — JAMAIS surfacé raw (R2.2).
CREATE TABLE "hush_addiction" (
  "player_id"               uuid    NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "dealer_spot_building_id" uuid    NOT NULL REFERENCES "buildings"("building_id") ON DELETE CASCADE,
  "loyalty_score"           integer NOT NULL DEFAULT 0,
  "last_hush_deal_tick"     bigint,
  "withdrawn"               boolean NOT NULL DEFAULT false,
  PRIMARY KEY ("player_id", "dealer_spot_building_id")
);
--> statement-breakpoint
CREATE INDEX "hush_addiction_player_idx" ON "hush_addiction" ("player_id");
--> statement-breakpoint
ALTER TABLE "hush_addiction" ADD CONSTRAINT "ha_loyalty_score_chk" CHECK (loyalty_score >= 0);
--> statement-breakpoint

-- ===== Runtime grants (app_rw least-privilege role — 0013_app_role.sql) =====
-- hush_addiction is a NEW table created by `mafia`: 0013's ALTER DEFAULT PRIVILEGES auto-grants SELECT+INSERT.
-- It is MUTABLE (loyalty_score / last_hush_deal_tick / withdrawn are UPDATE-d by the DEALER_SELL accumulation + the
-- HUSH_ADDICTION decay/withdrawal tick, T5) → add an explicit UPDATE grant, else the selling / addiction tick gets
-- `permission denied`. (calque building_raid 0018 §7.6.) (schema_operational_chain.md §7.9.4)
GRANT UPDATE ON "hush_addiction" TO app_rw;
