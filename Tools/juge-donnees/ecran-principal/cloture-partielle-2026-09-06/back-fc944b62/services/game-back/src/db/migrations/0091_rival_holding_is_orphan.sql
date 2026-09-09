-- IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-B-combat-escalation-plan.md Task 6 (C6)
--             Design: docs/superpowers/specs/2026-06-24-04b-B-combat-escalation-design.md §3.5 (Oxbow Severance)
--             Canon: docs/tech/04b_combat_and_conflict/combat_mechanics.md §2.5 (Oxbow Severance)
--             R9.3 backport: docs/tech/09_data_model/schema_conflict_rival.md §3b (rival_holding)
--             — Combat & Escalation B C6 — 2026-06-25 —
--
-- `is_orphan` column on `rival_holding` — Oxbow Severance orphan flag (§3.5).
--
-- When `reclassifySalientAsOrphan` marks a salient as isolated (the neck was held for
-- `combat.oxbow_hold_duration_ticks` ticks), all rival_holding rows in the salient set
-- have their `is_orphan` flag set to TRUE.  Orphan holdings have reduced heat + decaying
-- BPD interest (design §3.5, canon :263).
--
-- ADDITIVITY (§1.3): ONE new column added; all existing rows get `is_orphan = false` by
-- the NOT NULL DEFAULT false clause — no data loss, no existing behaviour changed.
-- R9.3: docs/tech/09_data_model/schema_conflict_rival.md updated same-commit.
-- Soft-ref discipline: no new FK introduced.

ALTER TABLE "rival_holding"
  ADD COLUMN IF NOT EXISTS "is_orphan" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
-- No additional GRANT needed — GRANT on rival_holding already covers all columns (mig 0082).
