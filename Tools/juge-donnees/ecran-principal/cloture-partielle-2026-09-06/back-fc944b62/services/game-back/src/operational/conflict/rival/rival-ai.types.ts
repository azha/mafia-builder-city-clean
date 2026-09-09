// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-A-rival-foundation-plan.md Task 1 (C1) §Shared signatures
//             Design: docs/superpowers/specs/2026-06-24-04b-A-rival-foundation-design.md §9.5
//             Canon: docs/tech/04b_combat_and_conflict/rival_ai_mechanics.md §7
//             — Rival AI Foundation C1 — 2026-06-24 —
//
// Shared TypeScript types for the 04b-A rival AI lot.
//
// These types are the "shared signatures" contract — they are consumed by:
//   C1: RivalSeedService + RivalStateRepository (this chunk)
//   C3: RegimeMechanicsService (regime tick + transition event emission)
//   C4: SaturationMechanicsService + DecisionMechanicsService
//   C5: RouteIntegrityService (Coil Distributed Hold)
//   C6+: further mechanics services
//   C9: BO admin controller
//
// R2.2: all raw scalar fields on RivalStateRow are SERVER-ONLY (P6 hidden). The player-facing
//   surface uses only the projection bucket types (RegimePressureBucket / SaturationBand /
//   RouteIntegrityBucket), never the raw floats.
// Anti-fabrication (C1): no non-deterministic values. Types only.

// ─── Primary domain keys ─────────────────────────────────────────────────────

/** The 4 rival factions. Canon: rival_ai_mechanics.md §9.5. */
export type RivalKey = 'coil' | 'tarcum' | 'iron_throat' | 'saltline';

/** The 6 OODA regime modes. Canon: rival_ai_mechanics.md :64. */
export type RivalRegime =
  | 'expansionary'
  | 'consolidating'
  | 'bleeding'
  | 'defensive'
  | 'retrench'
  | 'withdrawal';

/** Information-gathering posture. Canon: rival_ai_mechanics.md :336. */
export type IntelMode = 'pull' | 'push';

// ─── Derived projection bucket types (player-facing — R2.2 safe) ─────────────

/**
 * `RegimePressureBucket` — banded client view of regime_pressure.
 * silent:   pressure < 25% of flip_threshold.
 * mounting: 25% ≤ pressure < 75%.
 * crushing: pressure ≥ 75%.
 * Derived server-side; raw float never forwarded to client.
 */
export type RegimePressureBucket = 'silent' | 'mounting' | 'crushing';

/**
 * `SaturationBand` — banded client view of saturation_pressure.
 * silent:     saturation_pressure < 0.3.
 * trained:    0.3 ≤ saturation_pressure < 0.7.
 * suppressed: saturation_pressure ≥ 0.7.
 * Derived server-side; raw float never forwarded to client.
 */
export type SaturationBand = 'silent' | 'trained' | 'suppressed';

/**
 * `RouteIntegrityBucket` — banded client view of route_integrity (Coil only).
 * fractured: route_integrity < 0.25.
 * sparse:    0.25 ≤ route_integrity < 0.5.
 * intact:    0.5 ≤ route_integrity < 0.75.
 * dense:     route_integrity ≥ 0.75.
 * NULL when route_integrity is null (non-Coil, or Coil before C5 seeds it).
 */
export type RouteIntegrityBucket = 'fractured' | 'sparse' | 'intact' | 'dense';

// ─── Decision policy + attack pattern references ──────────────────────────────

/** A string reference to a decision policy (e.g., 'coil_ooda_v1'). Opaque to the client. */
export type DecisionPolicyRef = string;

/** A deterministic hash of an observed attack pattern. Opaque to the client. */
export type AttackPatternHash = string;

// ─── Bus event emitted on regime transition (C3) ─────────────────────────────

/**
 * `RegimeTransitionEvent` — emitted on CityEventBus when a rival's regime flips.
 * Consumed by B-lot mechanics (dominance reordering) and BO admin routes (C9).
 * Canon: rival_ai_mechanics.md §OODA-regime-flip.
 */
export interface RegimeTransitionEvent {
  readonly type: 'regime_transition';
  readonly playerId: string;
  readonly rivalKey: RivalKey;
  readonly gameMinute: number;
}

// ─── Client-facing projection (R2.2 P6 wall) ─────────────────────────────────

/**
 * `RivalClientView` — the player-facing rival projection.
 *
 * All raw server-side scalars (regime_pressure, saturation_pressure, route_integrity,
 * intel_mode, etc.) are STRIPPED. Only banded / indicator strings are exposed.
 *
 * R2.2: zero raw rival scalar forwarded to client.
 * P6: all other rival_state fields are server-only.
 */
export interface RivalClientView {
  /** A human-readable behavioral indicator string (e.g., 'Coil is pushing into the waterfront'). */
  behavioralIndicator: string;
  /** Banded regime pressure (silent / mounting / crushing). */
  regimePressureBand: RegimePressureBucket;
  /** Banded saturation (silent / trained / suppressed). */
  saturationBand: SaturationBand;
  /** Banded route integrity (Coil only; null for others). */
  routeIntegrityBand: RouteIntegrityBucket | null;
  /** Trophic suppression indicator: which rival is suppressed by this rival + a flavor string. */
  trophicSuppression: {
    suppressedRival: RivalKey;
    indicator: string;
  } | null;
}

// ─── Repository return type ───────────────────────────────────────────────────

/**
 * `RivalStateRow` — the full rival_state DB row shape.
 *
 * Mirrors the Drizzle table `rivalState` (services/game-back/src/db/schema/conflict_rival.ts).
 * Used as the return type of RivalStateRepository read methods.
 *
 * R2.2: all fields except player_id and rival_key are server-only (P6 hidden).
 * OQ-A8: dominance_rank + vulnerable_axis are null until lot B writes them.
 */
export interface RivalStateRow {
  player_id: string;
  rival_key: RivalKey;
  regime: RivalRegime;
  regime_pressure: number;
  flip_threshold: number;
  observe_interval_ticks: number;
  orient_latency_ticks: number;
  commit_delay_ticks: number;
  saturation_pressure: number;
  intel_mode: IntelMode;
  mode_stability_ticks: number;
  route_integrity: number | null;
  dominance_rank: number | null;
  vulnerable_axis: 'muscle' | 'finance' | 'intel' | 'infrastructure' | 'leadership' | null;
}
