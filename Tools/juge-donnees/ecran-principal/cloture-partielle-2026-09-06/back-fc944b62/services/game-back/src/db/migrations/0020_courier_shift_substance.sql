-- 0020_courier_shift_substance.sql — schema_operational_chain.md §7.8.6 (courier_shift porte la substance du cargo). PALIMPSEST §3.2 (forward-only).
-- IMPLEMENTS: Phase 2b / vector #2 (substances — Crick) / Task 4. R9.3: this matches
--             src/db/schema/operational_chain.ts byte-for-byte. ONLY ADDS — no existing table is redefined:
--             1 column on courier_shift (substance_type). Every Phase-1 table, the 9 Phase-2 T0 tables, the raid
--             surface (0018) and the substance/cold-chain foundation (0019) are otherwise UNCHANGED
--             (git diff = empty except the 1 addition).

-- ===== courier_shift (existant, §3 Table 9) — 1 colonne AJOUTÉE (§7.8.6) =====
-- substance_type : la substance du cargo qu'un shift transporte, mémorisée du dispatch jusqu'à l'arrivée. Sans cette
-- colonne, un shift ne portant que cargo_grams ne pouvait pas se souvenir de QUELLE substance il transporte → l'arrivée
-- déposait toujours du brindle hardcodé. Désormais le dispatch persiste la substance source ici, et l'arrivée dépose la
-- bonne substance dans le product_storage destination. Le type réutilise l'enum existant substance_type (§2 ;
-- brindle|crick|hush|ash) — AUCUN nouvel enum.
-- Défaut 'brindle' NOT NULL → rétro-compatible : tout shift déjà landé (et tout dispatch Brindle M1 qui n'écrit pas la
-- colonne) reste brindle → comportement M1 inchangé.
-- ADD COLUMN avec DEFAULT = metadata-only en PG ≥ 11 (pas de rewrite de table), sûr sur table peuplée.
-- GRANT : courier_shift a déjà GRANT UPDATE, DELETE TO app_rw (0017 §5) — un GRANT UPDATE table-level (sans liste de
-- colonnes) couvre les colonnes AJOUTÉES ultérieurement → substance_type est mutable/insérable par app_rw sans re-GRANT
-- (calque 0019 pour cold_storage_capable). (schema_operational_chain.md §7.8.6)
ALTER TABLE "courier_shift"
  ADD COLUMN "substance_type" "substance_type" NOT NULL DEFAULT 'brindle';
