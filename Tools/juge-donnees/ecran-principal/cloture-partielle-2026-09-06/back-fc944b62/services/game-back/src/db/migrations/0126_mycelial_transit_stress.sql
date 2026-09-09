-- migration 0126: mycelial_transit_stress (P3-C C3 — Loop 5 Mycelial Ledger, the dispatch-time transit
-- slowdown's FROZEN input)
--
-- ★ idx final, reconciled at integration. Authored as 0125 (this lot's own next-free at C3 authoring
-- time, right after its own 0124-provisional C1 migration); 04f-B's post-04f-B-merge integration
-- renumbered THIS lot's C1 migration 0124→0125 (04f-B kept 0124 for its own `recruitment_quests`), so
-- this migration renumbered mechanically alongside it, 0125→0126 — zero content change beyond the
-- idx/name/the one cross-reference below.
-- Plan: docs/superpowers/plans/2026-07-12-p3-C-supply-chain-plan.md C3
-- Design: docs/superpowers/specs/2026-07-12-p3-C-supply-chain-design.md §5.3 (stress derived, never
--         stored — D4; the transit-slowdown CONSEQUENCE is computed at dispatch and must survive a
--         later change to the leg's live debt_load, "later stress changes don't retro-affect in-flight
--         shifts")
-- Decisions: docs/superpowers/specs/2026-07-12-p3-C-supply-chain-decisions.md §1.4 D4 (multiplicateur
--         DÉRIVÉ, jamais stocké — `stressed` itself is never a column; ONLY the CONSEQUENCE computed at
--         dispatch is frozen here, mirroring `route.sinuosity_index`'s OWN "frozen between replans"
--         convention, OQ-P1, the SAME table)
-- Collision wall: plan §0.5 — P3-C's ONLY additive surface in the shared `operational_chain.ts` is
--         `route` columns (the 04f-B in-flight wall); this is exactly that: ONE additive `route` column,
--         zero touch to `courier_shift` or any other shared table.
--
-- WHY a NEW route column (not a courier_shift column, not a re-derivation at each tick): `distribution-
-- transit.service.ts`'s per-tick `vehicleTransitTicks(vehicle_type, block_distance)` call is a PURE
-- function of 2 already-immutable-per-shift inputs (comment there: "the transit duration is NOT
-- persisted ... re-derived each tick from the route geometry, a FIXED function"). Mycelial stress is a
-- THIRD input that is NOT fixed — a leg's `debt_load` can rise/fall for the ENTIRE duration a shift is
-- in transit (NIGHTLY decay, a later arrival's own accrual, a future maintenance verb). Re-reading it
-- live at every tick would let a stress change AFTER dispatch retroactively speed up or slow down an
-- already-in-flight shift — the design's own "frozen at dispatch" mandate forbids exactly this. The ONE
-- moment the leg's live `debt_load` is legitimately consulted is AT DISPATCH (`DistributionService.
-- dispatch`, before the route/courier/shift INSERT tx) — the result must be PERSISTED somewhere that
-- never changes afterward. `route` already carries the EXACT same shape for `sinuosity_index` (computed
-- at createRoute/dispatch, frozen until a replan — OQ-P1) — this column follows that established
-- precedent instead of inventing a new mechanism.
--
-- `route.mycelial_transit_stress_multiplier` (real, NOT NULL, DEFAULT 1) — computed ONCE by
-- `DistributionService.dispatch` (P3-C C3) from `LegRepository.findDebtLoad(playerId, fromBuildingId,
-- toBuildingId)` BEFORE the route INSERT: `1.0` when the leg is not stressed (no leg row, or debt_load
-- <= core_loops.mycelial_stress_threshold), else `1 / (1 - core_loops.mycelial_throughput_penalty_at_
-- stress_pct / 100)` (design §5.3, ≈×1.43 at the 30% default). Read back by `distribution-transit.
-- service.ts`'s per-tick arrival check to inflate `transit_ticks = ceil(vehicleTransitTicks(...) *
-- mycelial_transit_stress_multiplier)`. DEFAULT 1 is zero-regression for every existing route row (no
-- change to any pre-C3 dispatch's transit duration).
--
-- CHECK `route_mycelial_transit_stress_multiplier_chk` (`>= 1`): the multiplier only ever SLOWS transit
-- (never speeds it up — canon "capacity drops", never rises); `1.0` is the floor (unstressed / no leg).
--
-- GRANT: none needed — `route` already carries `GRANT UPDATE, DELETE TO app_rw` from an earlier
-- migration (table-level GRANT UPDATE with no column list covers columns added later, the SAME
-- reasoning mig 0119 §7.21.9 / mig 0125 §7.22.2 document).

--> statement-breakpoint

ALTER TABLE "route"
  ADD COLUMN IF NOT EXISTS "mycelial_transit_stress_multiplier" real NOT NULL DEFAULT 1;

--> statement-breakpoint

ALTER TABLE "route"
  ADD CONSTRAINT "route_mycelial_transit_stress_multiplier_chk"
  CHECK ("mycelial_transit_stress_multiplier" >= 1);
