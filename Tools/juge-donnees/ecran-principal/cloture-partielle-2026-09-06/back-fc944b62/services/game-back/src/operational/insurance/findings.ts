// IMPLEMENTS: docs/tech/04c_market_reputation_insurance/insurance_mechanics.md §4.1 (cues menu :49)
//             docs/superpowers/plans/2026-06-17-depth-insurance-underwriting-walk-plan.md
//               Task 2 (C2) — DD-WALK bit indices (pre-created in C2; C3 expands with computePremium)
//               Task 3 (C3) — FindingType full menu + per-coverage subset map
//             — Insurance C2 — 2026-06-17
//
// `findings.ts` — FindingType enum + fixed bit-index map + per-coverage domain map.
//
// The 6 cues (canon :49):
//   IDLE_DEALERS_OBSERVED       — idle dealer count above threshold (PROPERTY domain: real-estate)
//   HEAT_SMOKE_OBSERVED         — building heat above threshold (PROPERTY/STASH_LOSS domain)
//   LIEUTENANT_UNIFORM_DISCIPLINED — lieutenant uniform compliance (cross-cue: all coverage types)
//   STASH_QUEUE_DEEP            — product_storage quantity_grams above threshold (STASH_LOSS domain)
//   SLATE_MEMBERSHIP_STABLE     — courier_shift in_transit count (COURIER_ARREST domain: distribution)
//   HOSTAGE_SHELF_STATE         — laundering_nodes buffer_load above threshold (FENCE_DEFAULT domain)
//
// Each FindingType maps to a FIXED bit index in the 64-bit `findings_bitmask`:
//   IDLE_DEALERS_OBSERVED=0, HEAT_SMOKE_OBSERVED=1, LIEUTENANT_UNIFORM_DISCIPLINED=2,
//   STASH_QUEUE_DEEP=3, SLATE_MEMBERSHIP_STABLE=4, HOSTAGE_SHELF_STATE=5
//
// These indices are STABLE across chunks (plan Shared signatures). C3 expands this file with
// computePremium's c_i weight per FindingType (using the same indices).
//
// Coverage → domain map (canon :60-65 + DD-WALK §1.1 resolution):
//   PROPERTY         → real-estate domain: building.heat + building.structural_state
//   STASH_LOSS       → storage domain: product_storage.quantity_grams + money_holding.held_cents
//   COURIER_ARREST   → distribution domain: courier_shift.status='in_transit' count
//   FENCE_DEFAULT    → laundering domain: laundering_nodes.buffer_load + tail_risk_estimates.current_occupancy
//
// Cross-cue: LIEUTENANT_UNIFORM_DISCIPLINED fires for ALL coverage types when there is no ACTIVE
// lieutenant row for the player (absence of a disciplined lieutenant = operational exposure signal).
//
// R2.2: this file exposes no hidden risk scalar. The bit-index map is internal (server-only).
// Anti-fabrication: no inline numeric scalar beyond the bit-index constants (which are structural,
// not calibrated tunable values — they are just array positions in a 64-bit mask).

// ── FindingType enum (the §1.4 menu — 6 cues from canon :49) ─────────────────────────────────────

/**
 * `FindingType` — the 6 observation cues from the underwriting walk (canon :49).
 *
 * Each maps to a FIXED bit index (0-5) in the 64-bit `findings_bitmask` column.
 * C2 uses these indices to OR findings; C3 reads them to compute `c_i`-weighted premium.
 *
 * Bit indices (STABLE — do not reorder):
 *   IDLE_DEALERS_OBSERVED=0, HEAT_SMOKE_OBSERVED=1, LIEUTENANT_UNIFORM_DISCIPLINED=2,
 *   STASH_QUEUE_DEEP=3, SLATE_MEMBERSHIP_STABLE=4, HOSTAGE_SHELF_STATE=5
 */
export enum FindingType {
  /** Bit 0 — idle dealer count above the threshold for the player's coverage domain. */
  IDLE_DEALERS_OBSERVED = 0,
  /** Bit 1 — building heat above the threshold (cross-domain: PROPERTY + STASH_LOSS). */
  HEAT_SMOKE_OBSERVED = 1,
  /** Bit 2 — cross-cue: no ACTIVE lieutenant row for the player (operational exposure). */
  LIEUTENANT_UNIFORM_DISCIPLINED = 2,
  /** Bit 3 — product_storage quantity_grams above the deep-queue threshold (STASH_LOSS domain). */
  STASH_QUEUE_DEEP = 3,
  /** Bit 4 — courier_shift in_transit count above the threshold (COURIER_ARREST domain). */
  SLATE_MEMBERSHIP_STABLE = 4,
  /** Bit 5 — laundering_nodes buffer_load above the exposure threshold (FENCE_DEFAULT domain). */
  HOSTAGE_SHELF_STATE = 5,
}

/**
 * `FINDING_BIT` — mapping of each FindingType to its BigInt bit mask.
 * Used by `recordFindings` to build `dayBits` and OR into `findings_bitmask` (monotone DD-WALK).
 * The indices are STABLE (never reorder — they are persisted in the DB bitmask column).
 */
export const FINDING_BIT: Readonly<Record<FindingType, bigint>> = {
  [FindingType.IDLE_DEALERS_OBSERVED]:           1n << 0n,
  [FindingType.HEAT_SMOKE_OBSERVED]:             1n << 1n,
  [FindingType.LIEUTENANT_UNIFORM_DISCIPLINED]:  1n << 2n,
  [FindingType.STASH_QUEUE_DEEP]:                1n << 3n,
  [FindingType.SLATE_MEMBERSHIP_STABLE]:         1n << 4n,
  [FindingType.HOSTAGE_SHELF_STATE]:             1n << 5n,
};

/**
 * `CoverageType` — the 4 coverage kinds (canon :209).
 * Used by the per-coverage domain map to select which substrate rows to snapshot.
 */
export type CoverageType = 'PROPERTY' | 'STASH_LOSS' | 'COURIER_ARREST' | 'FENCE_DEFAULT';

/**
 * `COVERAGE_DOMAIN_FINDINGS` — which FindingTypes are relevant for each coverage type.
 *
 * DD-WALK (LOCKED — design §1.1): the walk reads the COVERAGE'S substrate domain, NOT an arbitrary
 * 6-leg traversal. This resolves the canon 3-day/6-legs incoherence (:48).
 *
 * PROPERTY:       real-estate domain → HEAT_SMOKE_OBSERVED (building heat) + LIEUTENANT_UNIFORM_DISCIPLINED (cross-cue)
 * STASH_LOSS:     storage domain     → STASH_QUEUE_DEEP (product_storage) + HEAT_SMOKE_OBSERVED + LIEUTENANT_UNIFORM_DISCIPLINED
 * COURIER_ARREST: distribution domain → SLATE_MEMBERSHIP_STABLE (in_transit count) + LIEUTENANT_UNIFORM_DISCIPLINED
 * FENCE_DEFAULT:  laundering domain  → HOSTAGE_SHELF_STATE (buffer_load) + LIEUTENANT_UNIFORM_DISCIPLINED
 *
 * Note: IDLE_DEALERS_OBSERVED is not currently triggered by any coverage snapshot because the player's
 * dealer-spot heat data is not directly observable from the 4 substrate tables at C2. It is reserved
 * for future extension (C6+ when BuildingRaidedEvent subscriber reads dealer state). The bit index is
 * kept stable at 0 to avoid DB migration of existing bitmasks.
 */
export const COVERAGE_DOMAIN_FINDINGS: Readonly<Record<CoverageType, ReadonlyArray<FindingType>>> = {
  PROPERTY: [
    FindingType.HEAT_SMOKE_OBSERVED,             // building heat above threshold
    FindingType.LIEUTENANT_UNIFORM_DISCIPLINED,  // cross-cue: no active lieutenant
  ],
  STASH_LOSS: [
    FindingType.STASH_QUEUE_DEEP,                // product_storage quantity_grams deep
    FindingType.HEAT_SMOKE_OBSERVED,             // building heat (stash building hot)
    FindingType.LIEUTENANT_UNIFORM_DISCIPLINED,  // cross-cue
  ],
  COURIER_ARREST: [
    FindingType.SLATE_MEMBERSHIP_STABLE,         // courier_shift in_transit count high
    FindingType.LIEUTENANT_UNIFORM_DISCIPLINED,  // cross-cue
  ],
  FENCE_DEFAULT: [
    FindingType.HOSTAGE_SHELF_STATE,             // laundering_nodes buffer_load high
    FindingType.LIEUTENANT_UNIFORM_DISCIPLINED,  // cross-cue
  ],
};
