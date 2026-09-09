-- 0025_money_holding_schema_foundation.sql — schema_operational_chain.md §7.13 (building-type / clean-cash holding surface : money_holding). PALIMPSEST §3.2 (forward-only).
-- IMPLEMENTS: Phase 5 / vector #5a (money_holding — clean-cash holding) / Task 0. R9.3: this matches
--             src/db/schema/operational_chain.ts byte-for-byte. ONLY ADDS — no existing table is redefined:
--             1 new table (money_holding) + its 2 CHECK constraints + 2 indexes + an app_rw GRANT.
--             money_holding is ALREADY a building_operational_type enum member (0017) — NOT re-added, no ALTER TYPE.
--             This is the GDD Stage-4 clean-cash holding entity, deferred until now (schema_pipeline_and_laundering.md
--             « entité runtime stage 4 clean cash holding — hors GDD L259-299, déféré chunk dédié futur »), now created.
--             Every Phase-1 table, the 9 Phase-2 T0 tables, the raid surface (0018), the substance/cold-chain surface
--             (0019/0020), the substance/addiction-loyalty + luxury-channel surfaces (0021/0022), the building-type/
--             cultivation surface (0023) and the courier-dispatch-logistics surface (0024) are otherwise UNCHANGED
--             (git diff = empty except the addition). NO column is added to any existing table — money_holding is a
--             standalone table (a single clean-cash POOL per building), NOT a per-slot reuse of safehouses (which models
--             DIRTY/operational cash) → the wallet (economy_states.cash_cents) and selling/laundering stay byte-identical
--             for a player with no money_holding. The CHECK constraints live HERE (SQL only — established convention,
--             calque br_grams_seized_chk §7.3 / gs_tend_count_chk §7.11.2 / bos_hub_tier_chk §7.12.1 — not in Drizzle).
-- FK player_id → player (0001). FK building_id → buildings (0005). No change to any enum (no ALTER TYPE).

-- ===== Table 15 : money_holding (NEW table — le clean-cash holding Stage-4, §7.13) =====
-- 1 row par money_holding bâti (lazy-créée à la conversion T1, held_cents=0/tier=1). held_cents = un POOL unique de cash
-- CLEAN détenu, mode bigint = parité economy_states.cash_cents (le wallet) → le transfer deposit/withdraw (wallet↔held, T3)
-- n'a aucune perte de type. money_holding_tier = lever d'upgrade cash → capacité + yield (sibling de hub_tier §7.12.1 /
-- lab_tier §7.10.3). last_yield_tick = anchor du lazy-accrual (T4 : accrued = held × rate × (currentTick − last_yield_tick),
-- pas de tick neuf). forfeiture_scheduled_at_tick = fenêtre de télégraphe armée par le tick MONEY_HOLDING_AUDIT (T5b ;
-- NULL = aucune forfeiture programmée). held_cents / money_holding_tier = INPUT internes BO-only (R2.2) — projetés en bandes
-- held_band / capacity_band / yield_band / forfeiture_band / money_holding_tier_band (T6), JAMAIS surfacés raw client.
CREATE TABLE "money_holding" (
  "money_holding_id"             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"                    uuid    NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "building_id"                  uuid    NOT NULL REFERENCES "buildings"("building_id") ON DELETE CASCADE,
  "held_cents"                   bigint  NOT NULL DEFAULT 0,
  "money_holding_tier"           integer NOT NULL DEFAULT 1,
  "last_yield_tick"              bigint  NOT NULL DEFAULT 0,
  "forfeiture_scheduled_at_tick" bigint
);
--> statement-breakpoint
-- Index (player_id) : convention §5.1 (tout scan player-scopé). Index (player_id, building_id) : lookup 1-bâtiment des
-- actions deposit/withdraw/upgrade + des seizures (street-raid T5a / forfeiture T5b).
CREATE INDEX "money_holding_player_idx"          ON "money_holding" ("player_id");
--> statement-breakpoint
CREATE INDEX "money_holding_player_building_idx" ON "money_holding" ("player_id", "building_id");
--> statement-breakpoint
-- held_cents >= 0 : un withdraw/seizure ne peut jamais rendre le pool négatif (garde DB de dernier recours ; le guard
-- applicatif `WHERE held_cents >= amount` est la 1ère ligne). Calque br_grams_seized_chk §7.3 / gs_tend_count_chk §7.11.2.
ALTER TABLE "money_holding" ADD CONSTRAINT "mh_held_cents_nonneg_chk" CHECK (held_cents >= 0);
--> statement-breakpoint
-- money_holding_tier ∈ [1, 5] : 5 = money_holding.max_tier (gdd/14). L'action upgrade-money-holding-tier (T2) refuse
-- 409 AT_CAP à money_holding_tier == max_tier ; le CHECK est la garde DB de dernier recours (calque bos_hub_tier_chk §7.12.1 ;
-- l'esprit du CHECK equipment_tier 1..5 §3 Table 1).
ALTER TABLE "money_holding" ADD CONSTRAINT "mh_tier_chk" CHECK (money_holding_tier >= 1 AND money_holding_tier <= 5);
--> statement-breakpoint

-- ===== Runtime grants (app_rw least-privilege role — 0013_app_role.sql) =====
-- money_holding is a NEW table created by `mafia`: 0013's ALTER DEFAULT PRIVILEGES auto-grants SELECT+INSERT. It is
-- MUTABLE (held_cents/money_holding_tier/last_yield_tick/forfeiture_scheduled_at_tick are UPDATEd by deposit/withdraw/yield/
-- upgrade/seizure) but NOT deleted at runtime (the holding row lives with the building — no app DELETE path; the row goes
-- away only via the player/building ON DELETE CASCADE) → add an explicit GRANT UPDATE (SELECT, INSERT already covered by the
-- default privileges, restated here for clarity), NO DELETE. Calque 0024 building_raid GRANT UPDATE / 0017 §5 — without the
-- explicit UPDATE grant the first deposit/withdraw/yield mutation gets `permission denied`.
GRANT SELECT, INSERT, UPDATE ON "money_holding" TO app_rw;
