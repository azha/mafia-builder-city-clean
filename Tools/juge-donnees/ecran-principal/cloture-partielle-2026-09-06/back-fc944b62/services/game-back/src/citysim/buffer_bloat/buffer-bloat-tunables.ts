// IMPLEMENTS: docs/tech/04_city_simulation/system_10_buffer_bloat.md §Tunables — REUSE
//             (gdd/14 §City — Buffer Bloat, lines 175–178 — 4 keys; the keys this system's OWN logic actually
//             CONSUMES are EXISTING registry keys — R2.3, ZERO genuinely-NEW).
//             -- session:2026-06-03 (Phase 1 Task 11) --
//
// System 10 (Buffer Bloat Laundering) tunables — the keys this system's OWN logic actually CONSUMES.
//
// R2.3 (NO inline numeric balance/config): the DEFAULT values below are the backported registry values from
// `projects/mafia_city_game/gdd/14_tunable_constants.md §City — Buffer Bloat` (lines 175–179). They are surfaced
// here as env-overridable fallbacks so this file stays a faithful MIRROR of the single source of truth (the
// registry). If the registry values change, update this map in the SAME commit (R9.3: gdd/14 ↔ code).
//
// HONEST TUNABLES (only mirror what the day-1 logic consumes — the dwell-time / erlang-stash precedent): the
// resolved `bufferBloatTunables` object surfaces the keys System 10's tick + projection CONSUME at runtime, ALL
// from §City — Buffer Bloat (gdd/14 L175–179):
//   - `buffer_capacity_per_node` (L175, 8000, range 500..100000) — the $ cap (cents) of a node's buffer before
//     overflow (Inv 1). The DEFAULT capacity the lazy-seed stamps onto a freshly-created tail_risk_estimate row,
//     AND the divisor for the load_pct = current_occupancy / capacity ratio (Inv 5 BufferLoadBucket) + the
//     buffer_load sync. The per-row persisted `tail_risk_estimates.capacity` overrides it once a row exists (so a
//     seeded row with an explicit capacity wins — this default is the seed value, not a global override of a row).
//   - `buffer_node_count` (L176, 10, range 1..30) — the max number of BufferNodes per player (RAM budget bound,
//     system_10_buffer_bloat.md:93 "10 nœuds max par joueur"). When a player's active node count EXCEEDS this
//     bound, the effective inflow per node is penalised by a factor of (bound / node_count): congestion from
//     oversized networks silently degrades throughput. This is the "bloat penalises throughput" promise in the
//     phase-01-city-sim.md §Task 11 + schedule/phase-01-city-sim.md:91. NO inline literal — the factor is derived
//     exclusively from this registry tunable.
//   - `drain_rate_to_next_stage_per_hr` (L177, 500, range 50..5000) — the fixed drain rate toward the downstream
//     node (cents/hr in-game; Inv 1 Phase B). The DEFAULT drain_rate the lazy-seed stamps onto a fresh row. The
//     per-row persisted `tail_risk_estimates.drain_rate` overrides it once a row exists (the row's drain_rate is
//     the authority; this default is the seed value).
//   - `tail_event_percentile` (L178, 95th, range 80th..99.9th) — the percentile the tail_p95_estimate targets
//     (Inv 2 / §Update tick hourly Phase A step 2). CONSUMED day-1 as the percentile FACTOR scaling the occupancy
//     fraction toward the P95 seizure-size estimate: the spec calls the 95th percentile a "facteur ~1.8× median".
//     Surfaced as the raw percentile (95) AND derived into the multiplicative factor the math uses.
//   - `tail_risk_panel_default_visibility` (L179, off, enum off/on) — the initial tail-risk panel visibility for a
//     player (Inv 4). CONSUMED day-1 by the projection: it is the `tail_risk_panel_visible` default the per-district
//     payload carries (the panel is a player-facing qualitative surface; the default is `off` so the player learns
//     by catastrophe — GDD §System 10 §Premise). A sticky auto-unlock (first CRITICAL event) would flip it per
//     player at runtime; that per-player unlock state is P2 (no persisted unlock column day-1 — documented below).
//
// TAIL PERCENTILE FACTOR DERIVATION (documented + deterministic): the spec (§Update tick hourly Phase A step 2)
// estimates tail_event_p95 = seizure_estimate × tail_event_percentile_factor where "95th percentile = facteur
// ~1.8× median". So the factor is derived from the percentile: a higher percentile → a larger multiplier on the
// occupancy fraction. We map the registry percentile to the factor with a documented linear interpolation anchored
// on the spec's 95th→1.8× datum (TAIL_PERCENTILE_FACTOR below). This keeps the math a FIXED function of the
// registry percentile (no invented standalone tunable — the factor is DERIVED from tail_event_percentile).
//
// DEFERRED — the per-player sticky `tail_risk_panel_ever_shown` unlock (Inv 4 / §Update tick hourly Phase C) is a
// per-player runtime flag with NO persisted column day-1 (the tail_risk_estimates table is 1-1 with a NODE, not a
// per-player panel-state row). The auto-unlock popup is a Unity notification (P2 — no Unity client Phase 1). So the
// projection surfaces the STATIC default visibility (tail_risk_panel_default_visibility); the per-player sticky
// unlock lands when the Unity notification + a panel-state persistence land (P2 — documented in the service header).
//
// REUSE — the DISTRICT COUNT (`city.district_count` = 18, gdd/14 L1069) is the canonical district set the
// controller validates against (1..18). Surfaced here because the controller CONSUMES it for the per-district
// buffer projection endpoint's district validation (one place per system — the dwell-time / erlang-stash precedent).

import { TunablesStore } from '../../config/tunables-store';

/**
 * Map the registry `tail_event_percentile` → the multiplicative factor applied to the occupancy-fraction seizure
 * estimate (§Update tick hourly Phase A step 2: "95th percentile = facteur ~1.8× median"). DERIVED, not a standalone
 * tunable: a documented linear interpolation anchored on the spec datum (95th → 1.8×). At the 50th percentile the
 * factor is 1.0 (the median); each percentile point above 50 adds (1.8 - 1.0) / (95 - 50) ≈ 0.0178× so the 95th
 * lands on ~1.8×. Clamped to >= 1.0 (a tail estimate is never below the median). A FIXED function of the percentile.
 */
export function tailPercentileFactor(percentile: number): number {
  const slope = (1.8 - 1.0) / (95 - 50); // ≈ 0.01778 per percentile point above the median.
  const factor = 1.0 + slope * (percentile - 50);
  return factor >= 1.0 ? factor : 1.0;
}

/**
 * Resolved System 10 Buffer Bloat tunables. The consumed keys are REUSE from gdd/14 §City — Buffer Bloat
 * (buffer_capacity_per_node → the seed capacity + the load-ratio divisor + buffer_load sync;
 * drain_rate_to_next_stage_per_hr → the seed drain_rate; tail_event_percentile → the tail-factor + the
 * TailPercentileState reference; tail_risk_panel_default_visibility → the projection's panel-visible default). The
 * district count is the controller's 1..N validation bound. ZERO genuinely-NEW tunables (R2.3).
 */
export const bufferBloatTunables = {
  /** buffer_capacity_per_node — $ cap (cents) per node buffer; the lazy-seed capacity + the load_pct divisor + buffer_load sync. (DB-override > env > default — Phase-23). */
  get bufferCapacityPerNode(): number { return TunablesStore.resolveInt('T.city.buffer_capacity_per_node', 'BUFFER_CAPACITY_PER_NODE', 8000); },
  /**
   * buffer_node_count — max BufferNodes per player (gdd/14 §City — Buffer Bloat, 10, range 1..30). When a player's
   * active node count exceeds this bound, the effective inflow per node is penalised by a factor of
   * (bound / node_count): oversized networks silently degrade throughput (the "bloat penalises throughput" promise
   * in schedule/phase-01-city-sim.md:91 + TD-013). NOT hot-reloadable (a sim structural bound — changing mid-game
   * would break ongoing RAM budget assumptions). (DB-override > env > default — Phase-23).
   */
  get bufferNodeCount(): number { return TunablesStore.resolveInt('T.city.buffer_node_count', 'BUFFER_NODE_COUNT', 10); },
  /** drain_rate_to_next_stage_per_hr — fixed drain toward the downstream node (cents/hr); the lazy-seed drain_rate. (DB-override > env > default — Phase-23). */
  get drainRateToNextStagePerHr(): number { return TunablesStore.resolveInt('T.city.drain_rate_to_next_stage_per_hr', 'DRAIN_RATE_TO_NEXT_STAGE_PER_HR', 500); },
  /** tail_event_percentile — the percentile the tail_p95_estimate targets (Inv 2); derives the tail factor. (DB-override > env > default — Phase-23). */
  get tailEventPercentile(): number { return TunablesStore.resolveFloat('T.city.tail_event_percentile', 'TAIL_EVENT_PERCENTILE', 95); },
  /** tail_risk_panel_default_visibility — the projection's panel-visible default (Inv 4 — off = learn-by-catastrophe). (DB-override > env > default — Phase-23). */
  get tailRiskPanelDefaultVisibility(): string { return TunablesStore.resolveString('T.city.tail_risk_panel_default_visibility', 'TAIL_RISK_PANEL_DEFAULT_VISIBILITY', 'off'); },
  /** city.district_count — the canonical district set the controller validates against (1..N). (DB-override > env > default — Phase-23). */
  get districtCount(): number { return TunablesStore.resolveInt('T.city.district_count', 'CITY_DISTRICT_COUNT', 18); },
};
