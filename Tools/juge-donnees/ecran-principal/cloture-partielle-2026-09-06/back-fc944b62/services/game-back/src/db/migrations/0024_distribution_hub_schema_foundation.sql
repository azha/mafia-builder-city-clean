-- 0024_distribution_hub_schema_foundation.sql — schema_operational_chain.md §7.12 (building-type / courier-dispatch logistics surface : distribution_hub). PALIMPSEST §3.2 (forward-only).
-- IMPLEMENTS: Phase 4 / vector #4 (distribution_hub — courier dispatch logistics) / Task 0. R9.3: this matches
--             src/db/schema/operational_chain.ts byte-for-byte. ONLY ADDS — no existing table is redefined:
--             1 column on building_operational_state (hub_tier) + its CHECK (bos_hub_tier_chk 1..5).
--             distribution_hub is ALREADY a building_operational_type enum member (0017) — NOT re-added.
--             courier.home_dispatch_hub_id (the dispatch hub FK) ALREADY exists (0017) — NOT re-added.
--             courier.vehicle_type (foot/bike/car/refrigerated_van) ALREADY exists (0017) — NOT re-added.
--             courier_shift ALREADY exists (0017) — the roster cap is a DERIVED COUNT over its in_transit rows
--             (NO new table, NO new column on it). Every Phase-1 table, the 9 Phase-2 T0 tables, the raid surface
--             (0018), the substance/cold-chain surface (0019/0020), the substance/addiction-loyalty + luxury-channel
--             surfaces (0021/0022) and the building-type/cultivation surface (0023) are otherwise UNCHANGED
--             (git diff = empty except the addition). building_operational_state keeps every other column byte-for-byte:
--             hub_tier defaults 1 NOT NULL → non-hub buildings (lab/refinery/press_house/specialized_lab/grow_house/…)
--             stay byte-identical in behavior (the column is read only for distribution_hub) — same forward-only,
--             metadata-only ADD-COLUMN spirit as lab_tier 0022 §7.10.3 / cold_storage_capable 0019 §7.8.2.
-- FK: none added (no new table). No change to any enum (distribution_hub / vehicle_type / shift_status all already present).

-- ===== building_operational_state (existant, §3 Table 1) — 1 colonne AJOUTÉE (§7.12.1) =====
-- hub_tier : le palier d'un distribution_hub (lever joueur d'upgrade cash → tier++). Défaut 1 NOT NULL → rétro-compatible
-- (tout bâtiment déjà landé reste tier 1 ; un lab Brindle / refinery Crick / press_house Hush / specialized_lab Ash /
-- grow_house garde hub_tier=1 inerte — la colonne n'est LUE que pour un distribution_hub). Un distribution_hub à tier
-- supérieur a un roster cap de couriers concurrents plus grand (HubRosterService.rosterCap(hub_tier) — Tier-1=5 … Tier-5=30
-- depuis gdd/14, T3) ; le tier ne gate PAS quels véhicules sont débloqués (la présence du hub débloque bike/car, T5).
-- ADD COLUMN avec DEFAULT = metadata-only en PG >= 11 (pas de rewrite de table), sûr sur table peuplée ; aucune autre
-- colonne touchée (structural_state/repair_completes_at_tick §7.2 + cold_storage_capable §7.8 + lab_tier §7.10.3 restent
-- intactes). GRANT : building_operational_state a déjà GRANT UPDATE, DELETE TO app_rw (0017 §5) — un GRANT UPDATE table-level
-- (sans liste de colonnes) couvre les colonnes AJOUTÉES ultérieurement → hub_tier est mutable par app_rw sans re-GRANT
-- (calque cold_storage_capable 0019 / lab_tier 0022). (schema_operational_chain.md §7.12.1)
ALTER TABLE "building_operational_state"
  ADD COLUMN "hub_tier" integer NOT NULL DEFAULT 1;
--> statement-breakpoint

-- CHECK bos_hub_tier_chk : hub_tier ∈ [1, 5] (5 = distribution.hub_max_tier, gdd/14). Calque l'esprit du CHECK equipment_tier
-- 1..5 (0017 §3) — le cap supérieur reflète distribution.hub_max_tier ; l'action upgrade-hub-tier (T2) refuse 409 AT_CAP à
-- hub_tier == max, le CHECK est la garde DB de dernier recours (calque bp_purity_score_chk §7.10.5 / gs_tend_count_chk §7.11.2).
ALTER TABLE "building_operational_state" ADD CONSTRAINT "bos_hub_tier_chk" CHECK (hub_tier >= 1 AND hub_tier <= 5);
