-- D2 R3a: declaration_ledger JSONB ring on precinct_memory — G31 persistence (DD-BPD, TD-020 G31 partial).
-- R9.3: Drizzle schema (city_state.ts) + ch09 mirror (schema_city_state.md §2 Table 2 + §3 migration 0052)
--       backported in the SAME commit as this migration (D2 R3a — 2026-06-17).
--
-- G31 declaration-ledger (system_3_police_memory.md :80-84, :87-99):
--   The DeclarationEntry[declaration_ledger_size_per_precinct] ring buffer per precinct is realised as a
--   JSONB ring buffer column — matching the DD-BYTES decision (JSONB ring, NOT bit-packing; same pattern
--   as top_5_buildings JSONB on the same table). Bounded by:
--     - declaration_ledger_size_per_precinct (registry gdd/14 L95, default 64) — total ring depth.
--     - declaration_ledger.max_entries_per_building (registry gdd/14 L97, default 50) — per-building FIFO cap.
--   Both bounds are enforced by the write primitive (service layer), NOT by a DB CHECK (the ring bound
--   varies in principle, and JSONB length checks are not supported natively in PG without a function).
--
-- ADDITIVE (R9.3): ONE column added. All existing precinct_memory rows are unaffected (nullable default null).
-- The column is nullable by design — a precinct with no declaration entries reads null (treated as []).
-- police_memory.service.ts logic is UNCHANGED in R3a (subscription + Tick scoring = R3b).
--
-- DD-BPD: Boss Mirror→BPD absorbed:
--   The violation → ledger write path is the PRIMARY writer (declaration_type = boss_mirror_violation).
--   The 2 new bus events BossMirrorRuleDeclared / BossMirrorRuleRetracted are the PUBLIC SIGNAL channel
--   (retraction influences police priors, reputation_mechanics.md:71). See R3a flag (a) in the commit.
--
-- [PROV-Y26Q2] scope/magnitude_bucket: NOT included. Only the minimal `severity` bucket (0-100) is
-- materialised on DeclarationEntry (system_3_police_memory.md :93). scope/magnitude_bucket deferred
-- (needs design review before canonical coding, :127). See R3a flag (b) in the commit.

ALTER TABLE precinct_memory
  ADD COLUMN IF NOT EXISTS declaration_ledger jsonb;

-- No DEFAULT clause (null = empty ring). Existing rows remain valid — additive migration.
-- The write primitive initialises the array on first append: COALESCE(declaration_ledger, '[]'::jsonb).
