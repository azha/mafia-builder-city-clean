-- Migration 0065 — add patrol_heat to courier_shift (C7 courier-interception producer)
--
-- Insurance C7: the courier-interception producer (MINUTE/21) reads patrol_heat per shift to
-- decide whether the shift crosses the courier_intercept_heat_threshold. patrol_heat is
-- BO-only (server-side — R2.2, never sent to clients) and defaults to 0.0 (= no interception
-- when threshold is > 0). Test routes seed explicit heat values; production has NO writer in
-- this lot — the fuller System 9 / distribution-depth lot (TD-123) wires it to the existing
-- System 4 patrol signal via PatrolDoctrineService.getPatrolLoadRaw(playerId, precinctId)
-- (patrol.service.ts:~479) through the route.path_blocks → block → district → precinct
-- mapping (patrol.service.ts:~127). Until then the producer is intentionally inert (threshold-
-- gated; column defaults 0.0).
--
-- No enum migration needed: shiftStatus already has 'caught' (operational_chain.ts:38).

ALTER TABLE courier_shift ADD COLUMN IF NOT EXISTS patrol_heat real NOT NULL DEFAULT 0.0;
