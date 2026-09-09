// IMPLEMENTS: docs/tech/04_city_simulation/heat_propagation.md §Tunables — REUSE
//             (gdd/14 §City — Heat (cross-system), lines 193–196 — 4 keys; the keys this system's OWN logic actually
//             CONSUMES are EXISTING registry keys — R2.3, ZERO genuinely-NEW) + the Stack-profile dampening pct
//             (gdd/14 §Production — Brindle L2988 `production.brindle.stack_district_heat_propagation_dampening_pct`,
//             which the plan cites and which IS present in the registry → applied).
//             -- session:2026-06-03 (Phase 1 Task 13) --
//
// System Heat (Heat Propagation — the cross-system signal) tunables — the keys this system's OWN logic CONSUMES.
//
// R2.3 (NO inline numeric balance/config): the DEFAULT values below are the backported registry values from
// `projects/mafia_city_game/gdd/14_tunable_constants.md §City — Heat (cross-system)` (lines 193–196) + the Stack
// dampening pct (L2988). They are surfaced here as env-overridable fallbacks so this file stays a faithful MIRROR of
// the single source of truth (the registry). If the registry values change, update this map in the SAME commit
// (R9.3: gdd/14 ↔ code).
//
// HONEST TUNABLES (only mirror what the day-1 logic consumes — the buffer-bloat / deal-lek precedent): the resolved
// `heatTunables` object surfaces the keys the Heat tick + projection CONSUME at runtime:
//   - `heat_decay_half_life_hours` (L193, 8 in-game, range 1..48) — the HALF-LIFE of the exponential decay (Inv 4):
//     heat_{t+1} = heat_t × 0.5^(Δt_minutes / (half_life_hours × 60)). The MINUTE tick fires every in-game minute,
//     so the per-tick decay factor is 0.5^(1 / (half_life_hours × 60)). Longer half-life = heat persists; shorter =
//     heat volatile (the district forgets fast). Decay runs even with no fresh injection (long-absence cooling —
//     the intentional feature).
//   - `heat_propagation_radius_tiles` (L194, 2, range 0..8) — the spatial radius (in tile/block-coordinate distance)
//     of the "heat shadow" (Inv 5): a HOT/BURNING building propagates only to buildings within this many tiles (NOT
//     district-wide). 0 = no propagation (heat isolated to the source). A building's tile = its block's {x,y}
//     coordinate; the distance is the Chebyshev distance between block coordinates.
//   - `heat_propagation_factor_per_tick` (L195, 0.05, range 0..0.3) — the fraction of the SOURCE building's heat
//     propagated to each in-radius neighbour per MINUTE tick (Inv 5). 0.05 = 5%/tick → a graduated heat shadow.
//   - `heat_escalation_threshold` (L196, 0.7, range 0.3..0.95) — the normalized [0..1] heat at/above which a
//     building escalates: it emits a HeatEscalationEvent (Inv 6) + forces the district HeatBucket to BURNING (Inv 7).
//     0.7 ≈ the boundary where police attention spikes BEFORE the building visually hits the BURNING band (0.8) —
//     the chevauchement is intentional (the spec: alerte police avant le pic visuel).
//   - `production.brindle.stack_district_heat_propagation_dampening_pct` (L2988, 50, range 25..75) — the dampening
//     applied to the propagation factor for STACK-profile districts (Inv 5 cohesion-style spatial damping). A Stack
//     district's effective propagation factor = heat_propagation_factor_per_tick × (1 − pct/100). The plan cites
//     this key explicitly; it IS present in the registry → applied (a HONEST grep result, not invented).
//
// BUCKET THRESHOLDS (the §enum HeatBucket boundaries) are NOT mirrored as tunables: gdd/14 §City — Heat exposes
// exactly the 4 keys above (heat.bucket_thresholds are the spec's OPTIONAL-IF-GAP NEW tunables — not in the
// registry, so per R2.3 we do NOT add them; the bucket boundaries live as code constants in the projection/service,
// the buffer-bloat / dwell-time precedent for §enum thresholds the registry does not carry). ZERO genuinely-NEW.
//
// REUSE — the DISTRICT COUNT (`city.district_count` = 18, gdd/14 L1069) is the canonical district set the
// controller validates against (1..18). Surfaced here because the controller CONSUMES it for the per-district heat
// projection endpoint's district validation (one place per system — the buffer-bloat / deal-lek precedent).

import { TunablesStore } from '../../config/tunables-store';

/**
 * Resolved System Heat tunables. The consumed keys are REUSE from gdd/14 §City — Heat (heat_decay_half_life_hours →
 * the per-minute decay factor; heat_propagation_radius_tiles → the heat-shadow radius; heat_propagation_factor_per_tick
 * → the per-tick propagation fraction; heat_escalation_threshold → the escalation + BURNING boundary) +
 * production.brindle.stack_district_heat_propagation_dampening_pct → the Stack-profile propagation damping. The
 * district count is the controller's 1..N validation bound. ZERO genuinely-NEW tunables (R2.3).
 */
export const heatTunables = {
  /** heat_decay_half_life_hours — the half-life of the exponential decay (Inv 4). (DB-override > env > default — Phase-23). */
  get heatDecayHalfLifeHours(): number { return TunablesStore.resolveFloat('T.city.heat_decay_half_life_hours', 'HEAT_DECAY_HALF_LIFE_HOURS', 8); },
  /** heat_propagation_radius_tiles — the spatial radius of the heat shadow in tiles (Inv 5). (DB-override > env > default — Phase-23). */
  get heatPropagationRadiusTiles(): number { return TunablesStore.resolveInt('T.city.heat_propagation_radius_tiles', 'HEAT_PROPAGATION_RADIUS_TILES', 2); },
  /** heat_propagation_factor_per_tick — the fraction of source heat propagated to each in-radius neighbour (Inv 5). (DB-override > env > default — Phase-23). */
  get heatPropagationFactorPerTick(): number { return TunablesStore.resolveFloat('T.city.heat_propagation_factor_per_tick', 'HEAT_PROPAGATION_FACTOR_PER_TICK', 0.05); },
  /** heat_escalation_threshold — the normalized [0..1] escalation + BURNING boundary (Inv 6/7). (DB-override > env > default — Phase-23). */
  get heatEscalationThreshold(): number { return TunablesStore.resolveFloat('T.city.heat_escalation_threshold', 'HEAT_ESCALATION_THRESHOLD', 0.7); },
  /** stack_district_heat_propagation_dampening_pct — % propagation dampening for STACK-profile districts (Inv 5). (DB-override > env > default — Phase-23). */
  get stackDistrictHeatPropagationDampeningPct(): number { return TunablesStore.resolveInt('production.brindle.stack_district_heat_propagation_dampening_pct', 'STACK_DISTRICT_HEAT_PROPAGATION_DAMPENING_PCT', 50); },
  /** city.district_count — the canonical district set the controller validates against (1..N). (DB-override > env > default — Phase-23). */
  get districtCount(): number { return TunablesStore.resolveInt('T.city.district_count', 'CITY_DISTRICT_COUNT', 18); },
};

/**
 * The per-MINUTE-tick decay factor derived from the half-life (Inv 4): heat × this each minute tick → heat halves
 * over (half_life_hours × 60) minute ticks. A FIXED function of the registry half-life (no invented tunable). The
 * MINUTE cadence is 1 game-minute wide (CADENCE_WIDTH_GAME_MINUTES.minute = 1), so Δt = 1 minute per tick.
 */
export function perMinuteDecayFactor(halfLifeHours: number): number {
  const halfLifeMinutes = Math.max(1, halfLifeHours * 60);
  return Math.pow(0.5, 1 / halfLifeMinutes);
}

// ───────────────────────────── §enum HeatBucket boundaries (the canonical code-constant thresholds) ─────────────────
//
// The §enum HeatBucket boundaries on the normalized heat [0..1] (heat_propagation.md §enum HeatBucket: COLD < 0.2;
// WARM 0.2–0.5; HOT 0.5–0.8; BURNING ≥ 0.8). NOT registry tunables (per R2.3 — the header above documents WHY: the
// gdd/14 §City — Heat registry exposes only the 4 keys; the bucket boundaries are code constants, the buffer-bloat /
// dwell-time precedent for §enum thresholds the registry does not carry). Surfaced HERE as the SINGLE canonical
// source so every consumer (the HeatPropagationService engine + the operational raid-risk band, Phase-2b T4) reads
// ONE mapping — the thresholds are NEVER re-derived per call-site (the T10/T11 one-place-per-constant discipline).
const HEAT_BUCKET_WARM_FLOOR = 0.2; // ≥ this → WARM (below → COLD).
const HEAT_BUCKET_HOT_FLOOR = 0.5; // ≥ this → HOT.
const HEAT_BUCKET_BURNING_FLOOR = 0.8; // ≥ this → BURNING.

/**
 * Map a raw heat [0..1] → its HeatBucket RANK (COLD=0 < WARM=1 < HOT=2 < BURNING=3) via the §enum HeatBucket
 * thresholds above. The CANONICAL ordinal mapping the HeatPropagationService + the raid-risk band both consume.
 * INTERNAL — the raw float is the INPUT but NEVER escapes; callers forward only the qualitative band (R2.2 / Inv 1).
 */
export function heatBucketRankOf(heat: number): number {
  if (heat >= HEAT_BUCKET_BURNING_FLOOR) return 3; // BURNING
  if (heat >= HEAT_BUCKET_HOT_FLOOR) return 2; // HOT
  if (heat >= HEAT_BUCKET_WARM_FLOOR) return 1; // WARM
  return 0; // COLD
}

/**
 * Map a raw heat [0..1] → its HeatBucket NAME (the §enum HeatBucket band — the only heat signal exposed; R2.2). The
 * CANONICAL float→band mapping; the raw float never escapes (the band is the sole output). REUSE this anywhere the
 * HeatBucket of a per-building heat float is needed (the Phase-2b raid-risk projection consumes it — same thresholds,
 * not re-invented).
 */
export function heatBucketNameOf(heat: number): import('../events/city-event-bus').HeatBucket {
  return (['COLD', 'WARM', 'HOT', 'BURNING'] as const)[heatBucketRankOf(heat)];
}
