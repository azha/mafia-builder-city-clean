-- migration 0109: blocks.stack_zoning_rank (04e-A1 C8 — ★ Substrate 3: Stack zoning gate)
-- Plan: docs/superpowers/plans/2026-07-04-04e-A-political-engine-plan.md C8
-- Design: docs/superpowers/specs/2026-07-04-04e-A-political-engine-design.md §4.3 (Stack-lot spawning)
--         + open sub-decision #2 (RULED (a), locked: "a genuine Stack zoning gate (spatial restriction on
--         lab placement), NOT a Tier cap change").
-- R9.3: backported to docs/tech/09_data_model/schema_world_geography.md same-commit.
-- Zero-regression: ADDITIVE only. No existing column/table modified. NULL default for every block — only
-- the 6 LOWEST-id Stack-profile blocks (the admin cap ceiling, real_estate.stack_zoning_gated_lot_count
-- range 1..6, specialized-lab-tunables.ts) get a non-NULL rank; the other 113 Stack blocks + all ~780
-- non-Stack blocks stay NULL, byte-identical to "not zoning-gated" (the pre-C8 behavior for every block).
--
-- WHY: the zoning gate (SpecializedLabService.upgradeTier — operational/real_estate/specialized-lab.service.ts)
-- needs a DETERMINISTIC, PERSISTED "which specific Stack lots are gated" fact — not a query-time re-derivation
-- that would silently reshuffle if the seeded block set ever changed. `stack_zoning_rank` is the lot's FIXED
-- ordinal among ALL Stack-profile blocks (1 = the lowest-id Stack block, 2 = the next, … 6 = the sixth),
-- assigned ONCE here. A lot is GATED for tier `real_estate.stack_zoning_gate_target_tier` (BASE, a FIXED
-- categorical marker — default 3, never itself overlay-relaxed) iff its rank is NOT NULL AND <= the CURRENT
-- (overlay-composed) `real_estate.stack_zoning_gated_lot_count` (BASE default 2 — this IS overlay-aware, C5
-- GLOBAL body-wrap pattern). E-POL-07 relaxes the gate by SETting that count toward 0 through the REAL
-- EffectModifierService — no rank ever changes; revert restores the base count and the SAME lots re-gate
-- (deterministic, no persisted "gated" boolean to desync from the tunable).

--> statement-breakpoint

ALTER TABLE "blocks"
  ADD COLUMN IF NOT EXISTS "stack_zoning_rank" integer;

--> statement-breakpoint

ALTER TABLE "blocks"
  ADD CONSTRAINT "blocks_stack_zoning_rank_chk" CHECK ("stack_zoning_rank" IS NULL OR "stack_zoning_rank" BETWEEN 1 AND 6);

--> statement-breakpoint

-- Seed the rank: the 6 LOWEST-id blocks among ALL Stack-profile blocks (deterministic — ORDER BY id ASC,
-- NEVER RNG). Matches the admin cap ceiling (specialized-lab-tunables.ts stackZoningGatedLotCount range
-- 1..6) so a future BASE-count raise (up to 6, via DB override) has pre-ranked lots ready without a
-- follow-up migration. Idempotent (WHERE stack_zoning_rank IS NULL guard — a re-run after ranks are
-- assigned is a no-op; PALIMPSEST runner also skips an already-applied .sql).
WITH ranked AS (
  SELECT b.id, ROW_NUMBER() OVER (ORDER BY b.id ASC) AS rn
  FROM "blocks" b
  INNER JOIN "districts" d ON d.id = b.district_id
  WHERE d.profile = 'stack'
)
UPDATE "blocks" b
SET "stack_zoning_rank" = ranked.rn
FROM ranked
WHERE b.id = ranked.id
  AND ranked.rn <= 6
  AND b.stack_zoning_rank IS NULL;

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "blocks_stack_zoning_rank_idx" ON "blocks" ("stack_zoning_rank")
  WHERE "stack_zoning_rank" IS NOT NULL;

-- No GRANT needed: the geography tables (districts/blocks/threnny_edges) are INTENTIONALLY left
-- SELECT/INSERT-only for app_rw (migration 0015 comment — "immutable reference data … never mutated at
-- runtime"). `stack_zoning_rank` is read-only at runtime (SpecializedLabRepository.isStackZoningGated does
-- a plain SELECT); it is never written by app_rw, only by this migration.
