-- migration 0110: threnny_edges(inspection_queue_district_id) index (04e-A1 C9 — ★ Substrate 4: checkpoint inspection-density)
-- Plan: docs/superpowers/plans/2026-07-04-04e-A-political-engine-plan.md C9
-- Design: docs/superpowers/specs/2026-07-04-04e-A-political-engine-design.md §4.4 (checkpoint inspection-density)
-- R9.3: backported to docs/tech/09_data_model/schema_world_geography.md same-commit.
-- Zero-regression: ADDITIVE only (index only — no column/table/enum). No existing row/column touched.
--
-- WHY (the "cleanest existing substrate" of the 4 — design §4.4): the river-crossing-district MAPPING
-- already exists — `threnny_edges.inspection_queue_district_id` (migration 0015/0016) IS the set of
-- districts the C9 substrate treats as "river-crossing" (a bridge/ferry checkpoint feeds that district's
-- MIS queue). The BASE density value (`checkpoint_inspection_density_default`, 0.15) is a PURE tunable
-- (04e-A1 C1, `inspection-tunables.ts`) — no DB persistence, mirrors every other substrate BASE key. So
-- unlike C6/C7/C8 (which each needed a genuinely NEW persisted column/table for their OWN substrate
-- state — audit_pin_activated_at / federal_investigators / stack_zoning_rank), C9 needs NO new
-- column: `InspectionQueueService.loadRiverCrossingDistrictIds()` derives the crossing-district Set
-- ONCE at boot via `SELECT DISTINCT inspection_queue_district_id FROM threnny_edges` (mirrors the
-- EXISTING `loadDistrictIds()` boot-read of the `districts` table). This migration's ONLY content is
-- the supporting index for that query (M=6 rows today — negligible now, but real and idiomatic: every
-- other FK-shaped column on this table already carries one, `north_idx`/`south_idx`, migration 0015).
--
-- checkpoint_inspection_density_default (BASE, 0.15) × epol08_inspection_density_multiplier (×1.6,
-- DISTRICT-scoped overlay modifier) → the composed density RATIO scales `InspectionQueueService`'s
-- effective queue cap (`effectiveQueueCapFor`) ONLY for districts in the river-crossing Set — never a
-- new column, never a re-derivation mid-tick (the Set is boot-cached, R9.3 source = geography, mirrors
-- `loadDistrictIds`'s own comment "reads the global districts table, never writes").

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "threnny_edges_inspection_queue_district_idx"
  ON "threnny_edges" ("inspection_queue_district_id");

-- No GRANT needed: threnny_edges is already SELECT/INSERT-only for app_rw (migration 0015 comment —
-- "immutable reference data … never mutated at runtime"). This index only accelerates a read.
