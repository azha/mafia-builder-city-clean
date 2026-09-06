// IMPLEMENTS: docs/tech/04_city_simulation/system_1_flow_cells.md §Tunables — REUSE exclusif
//             (keys from gdd/14 §City — Flow Cells; NO NEW tunables — the spec is REUSE-only)
//             -- session:2026-06-02 (Phase 1 Task 2) --
//
// System 1 (Block-Local Flow Cells) tunables — the keys the Jackson 2 Hz redistribution actually CONSUMES.
//
// R2.3 (NO inline numeric balance/config): the DEFAULT values below are the backported registry values
// from `projects/mafia_city_game/gdd/14_tunable_constants.md §City — Flow Cells` (lines 68 + 70–72 in the
// registry; namespaced `T.city.*` per gdd/14 §migration map). They are surfaced here as env-overridable
// fallbacks so this file stays a faithful MIRROR of the single source of truth (the registry). If the
// registry values change, update this map in the SAME commit (R9.3 propagation: gdd/14 ↔ code).
//
// REUSE-ONLY: this system introduces ZERO new tunables (system_1_flow_cells.md §Tunables: "Aucun NEW dans
// ce chunk"). The deferred `flow_cell.projection_cache_ttl_s` is NOT materialised here — no projection
// cache exists day-1 (the projection is computed on the fly from the in-memory grid).
//
// HONEST TUNABLES (no resolved-but-unused config — the citysim-tunables.ts precedent): this mirror surfaces
// ONLY the 4 keys System 1 consumes day-1 (β + the 3 λ weights). Three §City — Flow Cells keys are NOT
// mirrored here:
//   - `flow_cell_update_hz` (L67) — the cadence is owned by the SCHEDULER via citysim-tunables.ts (single
//     source of truth); mirroring it here would be a duplicate source-of-truth for the same key.
//   - `promotion_radius_blocks` (L69) + `max_promoted_buildings_per_cell` (L73) — promotion is DEFERRED;
//     when it lands in a later task it will add its own keys (resolved-when-consumed, not before).

import { TunablesStore } from '../../config/tunables-store';

/**
 * Resolved System 1 Flow Cells tunables. All 4 are REUSE from gdd/14 §City — Flow Cells AND consumed by the
 * service day-1 (no resolved-but-unused config). The λ-weight triplet (residential/commercial/transit) MUST
 * sum to 1.0 — validated at startup by the FlowCellsService (system_1_flow_cells.md §État du système:
 * "Somme des poids = 1.0 invariant"; the scheduler validates it).
 */
export const flowCellsTunables = {
  /** backpressure_beta — Jackson redistribution coefficient (0 = no reroute, 1 = full redistribute). (DB-override > env > default — Phase-23). */
  get backpressureBeta(): number { return TunablesStore.resolveFloat('T.city.backpressure_beta', 'BACKPRESSURE_BETA', 0.6); },
  /** flow_lambda_residential_weight — residential source weight of the λ decomposition. (DB-override > env > default — Phase-23). */
  get flowLambdaResidentialWeight(): number { return TunablesStore.resolveFloat('T.city.flow_lambda_residential_weight', 'FLOW_LAMBDA_RESIDENTIAL_WEIGHT', 0.4); },
  /** flow_lambda_commercial_weight — commercial source weight of the λ decomposition. (DB-override > env > default — Phase-23). */
  get flowLambdaCommercialWeight(): number { return TunablesStore.resolveFloat('T.city.flow_lambda_commercial_weight', 'FLOW_LAMBDA_COMMERCIAL_WEIGHT', 0.4); },
  /** flow_lambda_transit_weight — transit source weight of the λ decomposition. (DB-override > env > default — Phase-23). */
  get flowLambdaTransitWeight(): number { return TunablesStore.resolveFloat('T.city.flow_lambda_transit_weight', 'FLOW_LAMBDA_TRANSIT_WEIGHT', 0.2); },
};
