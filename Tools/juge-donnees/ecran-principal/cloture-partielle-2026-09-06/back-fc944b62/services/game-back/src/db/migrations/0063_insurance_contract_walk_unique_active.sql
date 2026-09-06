-- Insurance C5 (carry-forward from C4 reviewer⊥): one-walk-one-ACTIVE-contract partial unique index.
-- R9.3: Drizzle schema (insurance.ts) + ch09 mirror (schema_insurance.md) updated same-commit.
--
-- The design intent (plan :206) is 1 underwriting walk → 1 ACTIVE contract.
-- C4 left insurance_contract with NO uniqueness on walk_id, allowing duplicate ACTIVE contracts per walk.
-- This partial unique index enforces the invariant at DB level: at most one ACTIVE contract per walk_id.
--
-- Why partial? A walk can have:
--   - 1 ACTIVE (live coverage), OR
--   - 1 LAPSED (expired/cancelled) + potentially 1 new ACTIVE (re-issued after lapse), OR
--   - 1 FRAUDED + potentially 1 new ACTIVE (fraud penalty closed the old; a new walk would be required)
-- The invariant is: only ONE ACTIVE at a time — not one per walk globally.
-- A LAPSED or FRAUDED contract for the same walk coexists legally (historic record).
--
-- walk_id IS nullable (general coverage without a pinned walk is allowed in principle).
-- WHERE walk_id IS NOT NULL AND status = 'ACTIVE': prevents multiple ACTIVE contracts per walk.
-- If walk_id IS NULL: no uniqueness constraint (no walk backing the contract — not standard flow).
--
-- Zero-regression (§0.2): this index is additive — no existing column or row is modified.
--   Existing rows at C4 have at most one contract per walk (no violation in the test database).
--   If the migration is applied to a DB with duplicates, CREATE UNIQUE INDEX will fail → safe sentinel.

--> statement-breakpoint

CREATE UNIQUE INDEX insurance_contract_walk_active_unique_idx
  ON insurance_contract (walk_id)
  WHERE walk_id IS NOT NULL AND status = 'ACTIVE';
