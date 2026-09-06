-- 0019_substance_schema_foundation.sql — schema_operational_chain.md §7.8 (substance / cold-chain surface). PALIMPSEST §3.2 (forward-only).
-- IMPLEMENTS: Phase 2b / vector #2 (substances — Crick) / Task 0. R9.3: this matches
--             src/db/schema/operational_chain.ts byte-for-byte. ONLY ADDS — no existing table is redefined:
--             1 enum member (precursor_type += verdant_root_extract) + 1 column on building_operational_state.
--             Every Phase-1 table, the 9 Phase-2 T0 tables, and the raid surface (0018: structural_state /
--             repair_completes_at_tick / building_raid) are otherwise UNCHANGED (git diff = empty except the 2 additions).

-- ===== precursor_type (existant, §2) — 1 membre AJOUTÉ (§7.8.1) =====
-- Crick precursor = Verdant root extract (production_secondaries.md §Crick). ADD VALUE PG-natif (PAS recreate-enum,
-- qui casserait precursor_stock.precursor_type / precursor_order.precursor_type). Sous PG ≥ 12 (stack postgres:16)
-- ALTER TYPE … ADD VALUE s'exécute DANS un bloc transactionnel ; l'unique restriction = la valeur ajoutée ne peut
-- PAS être UTILISÉE (DML / default / comparaison) dans la MÊME transaction que l'ADD. Cette migration ne fait
-- qu'AJOUTER le membre (aucune DML l'utilisant) → conforme au MigrationRunner (BEGIN … COMMIT par fichier).
-- IF NOT EXISTS = idempotent (re-run au boot inoffensif).
ALTER TYPE "precursor_type" ADD VALUE IF NOT EXISTS 'verdant_root_extract';
--> statement-breakpoint

-- ===== building_operational_state (existant, Table 1) — 1 colonne AJOUTÉE (§7.8.2) =====
-- cold_storage_capable : capacité cold-storage posée À LA CONVERSION (T1). Défaut false NOT NULL → rétro-compatible
-- (les bâtiments déjà landés restent non-cold). true = STASH/REFINERY frigorifié → garde un produit Crick OPTIMAL_COLD.
-- ADD COLUMN avec DEFAULT = metadata-only en PG ≥ 11 (pas de rewrite de table), sûr sur table peuplée.
-- AUCUNE colonne température persistée (R2.2) : temperature_status est dérivé read-time côté ColdChainService (T5).
-- GRANT : building_operational_state a déjà GRANT UPDATE, DELETE TO app_rw (0017 §5) — un GRANT UPDATE table-level
-- (sans liste de colonnes) couvre les colonnes AJOUTÉES ultérieurement → cold_storage_capable est mutable par app_rw
-- sans re-GRANT (calque 0018 pour structural_state). (schema_operational_chain.md §7.8.4)
ALTER TABLE "building_operational_state"
  ADD COLUMN "cold_storage_capable" boolean NOT NULL DEFAULT false;
