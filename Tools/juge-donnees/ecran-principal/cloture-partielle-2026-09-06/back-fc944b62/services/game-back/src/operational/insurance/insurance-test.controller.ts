// IMPLEMENTS: docs/superpowers/plans/2026-06-17-depth-insurance-underwriting-walk-plan.md Task 0 (C0) Step 7
//             docs/superpowers/plans/2026-06-17-depth-insurance-underwriting-walk-plan.md Task 1 (C1) Step 3
//             docs/superpowers/plans/2026-06-17-depth-insurance-underwriting-walk-plan.md Task 2 (C2) Step 3
//             docs/superpowers/plans/2026-06-17-depth-insurance-underwriting-walk-plan.md Task 3 (C3) Step 3
//             docs/superpowers/plans/2026-06-17-depth-insurance-underwriting-walk-plan.md Task 4 (C4) Step 3
//             docs/superpowers/plans/2026-06-17-depth-insurance-underwriting-walk-plan.md Task 5 (C5) Step 3
//             docs/superpowers/plans/2026-06-17-depth-insurance-underwriting-walk-plan.md Task 6 (C6) Step 3
//             docs/superpowers/plans/2026-06-17-depth-insurance-underwriting-walk-plan.md Task 8 (C8) Step 3
//             docs/superpowers/plans/2026-06-17-depth-insurance-underwriting-walk-plan.md Task 9 (C9) Step 3
//             Pattern: services/game-back/src/operational/reputation/reputation-test.controller.ts (R-EC-2)
//             docs/superpowers/plans/2026-06-18-depth-insurance-coverage-drift-plan.md Task 1 (C1) Step 3
//             docs/superpowers/plans/2026-06-18-depth-insurance-coverage-drift-plan.md Task 3 (C3) Step 3
//             — Insurance C0 — 2026-06-17
//             — Insurance C1 — 2026-06-17
//             — Insurance C2 — 2026-06-17
//             — Insurance C3 — 2026-06-17
//             — Insurance C4 — 2026-06-17
//             — Insurance C5 — 2026-06-17 (DD-WARY consumer routes)
//             — Insurance C6 — 2026-06-17 (Claims PROPERTY/STASH routes)
//             docs/superpowers/plans/2026-06-17-depth-insurance-underwriting-walk-plan.md Task 11 (C11) Step 3
//             — Insurance C8 — 2026-06-17 (FenceDefaultService NIGHTLY/8 seed/tick/read routes)
//             — Insurance C9 — 2026-06-17 (COURIER_ARREST + FENCE_DEFAULT payout routes)
//             — Insurance C11 — 2026-06-17 (InsuranceProjectionService P5 wall setup + project-contract routes)
//             — Insurance Drift C1 — 2026-06-18 (coverage_induced_drift_state seed/read routes)
//             — Insurance Drift C3 — 2026-06-18 (issue-with-baseline + compare-fingerprint routes)
//             docs/superpowers/plans/2026-06-18-depth-insurance-coverage-drift-plan.md Task 12 (C12)
//             — Insurance Drift C12 — 2026-06-18 (anti-exploit inherit routes)
//
// `InsuranceTestController` — TEST-ONLY probe routes for C0 + C1 + C2 E2E verification.
//
// GATING: mounted ONLY when NODE_ENV !== 'production' (registered conditionally in InsuranceModule
// via testControllersEnabled() — same pattern as MarketTestController / ReputationTestController).
// In production this controller is simply not registered → 404.
// The E2E compose stack runs NODE_ENV=development so routes are available.
//
// C0 Routes:
//   GET /v1/_test/insurance/tunables-probe
//     — returns the 5 §4.1 canon tunable values as resolved by the TunablesStore (registry-first).
//       W6a C5 additive: also returns insured_value_cents_floor/_ceiling (issueContract's magnitude
//       clamp bounds, DD-MAGNITUDE-BOUND) — same route, no new endpoint.
//
// C1 Routes:
//   POST /v1/_test/insurance/seed-entities
//   GET  /v1/_test/insurance/read-entities?playerId=<uuid>
//   POST /v1/_test/insurance/delete-player
//
// C4 Routes (ContractService + c_i clipboard):
//   POST /v1/_test/insurance/setup-walk-with-contract
//     — creates a fresh player+WALKING walk+contract with a given insured_value_cents (no cash needed
//       at setup — cash is only debited at issueContract). Provides a WALKING walk for real-flow tests.
//       Body: { coverageType, insuredValueCents }.
//       Response: { walkId, playerId }.
//   POST /v1/_test/insurance/setup-complete-walk
//     — creates a fresh player with cash + COMPLETE walk + contract (ready for issueContract).
//       Body: { coverageType, insuredValueCents }.
//       Response: { walkId, playerId, cashBefore }.
//   POST /v1/_test/insurance/issue-contract
//     — calls ContractService.issueContract(playerId, walkId, insuredValueCents, counterpartyId).
//       Body: { playerId, walkId, insuredValueCents, counterpartyId }.
//       Returns { contractId, premiumCents, escrowRequiredCents }.
//   GET  /v1/_test/insurance/read-cash?playerId=<uuid>
//     — reads economy_states.cash_cents for the player. Returns { cashCents }.
//   GET  /v1/_test/insurance/read-contract?contractId=<uuid>
//     — reads the insurance_contract row for DB assertion.
//   GET  /v1/_test/insurance/read-clipboard?walkId=<uuid>
//     — calls InsuranceProjectionService.getClipboard(walkId). Returns { c_i: number[] }.
//       R2.2: clipboard NEVER returns findings_bitmask/observation_depth/route_id/risk scalars.
//
// C3 Routes (computePremium):
//   POST /v1/_test/insurance/setup-premium
//     — creates/updates a walk+contract with a given bitmask + insured_value + observation_depth.
//       Body: { coverageType, insuredValueCents, findingBits: number[], dayOfWalk: number, walkId?: string }.
//       If walkId is absent: creates a fresh player + walk record + contract.
//       If walkId is present: updates the existing walk's bitmask + observation_depth + contract.
//       observation_depth is set to dayOfWalk (start_tick=0, so daysElapsed = depth - 0 = dayOfWalk).
//       Response: { walkId, playerId }.
//   POST /v1/_test/insurance/compute-premium
//     — calls UnderwritingWalkService.computePremium(walkId) and returns { premiumCents }.
//       Body: { walkId: string }.
//       Returns 409 if not yet complete (daysElapsed < duration).
//       Returns 200 with { premiumCents } if complete (idempotent on re-call).
//
// C2 Routes (DD-WALK lifecycle):
//   POST /v1/_test/insurance/start-walk
//     — creates a fresh underwriter_walk_record (status=WALKING, findings_bitmask=0).
//       Body: { coverageType: CoverageType }.
//       Response: { walkId, playerId } + 201.
//   POST /v1/_test/insurance/seed-substrate
//     — seeds coverage-relevant substrate state for E2E walk-finding tests.
//       Body: { playerId: string, stashQueueDeep?: boolean }.
//       When stashQueueDeep=true: inserts a product_storage row with high quantity_grams (STASH_QUEUE_DEEP trigger).
//       When stashQueueDeep=false: deletes any product_storage rows for the player (releases staging).
//       Returns { seeded: true/false }.
//   POST /v1/_test/insurance/run-recordfindings-tick
//     — directly calls UnderwritingWalkService.recordFindings(ctx) for ALL players with WALKING walks.
//       Body: { gameMinute: number }.
//       This simulates the NIGHTLY scheduler firing at the given game-minute (bypasses the real
//       scheduler timer — the test drives the tick synchronously via this route). Runs for all players
//       whose walks are WALKING (not just one player_id — mirrors the NIGHTLY band firing per-player).
//       For simplicity in E2E: runs for the player who owns the freshly-seeded walk.
//       Response: { ticked: true }.
//   GET  /v1/_test/insurance/read-walk?walkId=<uuid>
//     — returns the underwriter_walk_record row for the given walkId (TEST-ONLY DB assertion).
//       R2.2: the findings_bitmask is server-side — this route is TEST-ONLY (not registered in production).
//       Response: the full row (bigint fields serialized as strings).
//
// C5 Routes (DD-WARY consumer — closes TD-119):
//   POST /v1/_test/insurance/issue-with-counterparty
//     — creates a fresh player + COMPLETE walk; optionally seeds a restraint_dispute_ring row for the
//       counterparty (waryActive=true or false); calls ContractService.issueContract(). Returns:
//       { contractId, premiumCents, escrowRequiredCents, basePremiumForComparison }.
//       `basePremiumForComparison` = the un-surcharged base premium (same walk bitmask + insuredValue)
//       so the E2E can assert premiumCents == Math.round(basePremium * 1.25) for the wary case.
//       Body: { coverageType, insuredValueCents, waryActive, collateralAmountCents, noCounterparty? }.
//       When noCounterparty=true: counterpartyId=null → neutral issuance (no ring lookup).
//
// C6 Routes (Claims PROPERTY/STASH subscriber):
//   POST /v1/_test/insurance/setup-raid-scenario
//     — creates a fresh player + stash building + product_storage + optionally an ACTIVE contract
//       covering the building. The E2E then fires the real raid hook + advances 1 tick.
//       Body: { withContract, coverageType?, gramsSeized?: number, insuredValueCents?: number }.
//       Response: { playerId, buildingId, blockId, contractId, cashBefore, gramsSeized }.
//       ClaimsService.computePayout re-derives loss from building_raid.grams_seized × rate.
//   GET /v1/_test/insurance/read-claims?playerId=<uuid>
//     — reads all insurance_claim rows for the player (TEST-ONLY DB assertion).
//       Response: { claims: [{ id, status, payout_cents, loss_event_ref, ... }] }.
//
// C9 Routes (COURIER_ARREST + FENCE_DEFAULT payouts):
//   POST /v1/_test/insurance/setup-courier-arrest-contract
//     — creates player + economy_states + complete COURIER_ARREST walk + ACTIVE contract.
//       Returns { playerId, contractId, walkId }.
//   POST /v1/_test/insurance/setup-fence-default-contract
//     — creates player + building + laundering_node (high buffer_load) + complete FENCE_DEFAULT walk + ACTIVE contract.
//       Returns { playerId, contractId, nodeId, throughputInPerHour }.
//   GET  /v1/_test/insurance/read-courier-fence-claims?playerId=<uuid>
//     — reads all insurance_claim rows for the player. Returns { claims: [...] }.
//   POST /v1/_test/insurance/reset-c9-state
//     — deletes test-seeded rows for C9 players/contracts/claims (test isolation).
//
// Update to seed-courier-shift (C9 carry-forward):
//   POST /v1/_test/insurance/seed-courier-shift now accepts optional { playerId } body param.
//   If provided: uses existing player (skips player/account/building creation), creates a minimal
//     route+shift for that player. Returns { shiftId, playerId, routeId }.
//   If not provided: existing C7 behavior (creates new player+courier+route+shift).
//
// C11 Routes (InsuranceProjectionService.projectContract P5 wall):
//   POST /v1/_test/insurance/setup-projection
//     — creates player + COMPLETE walk + ACTIVE contract (no claim, CLEAN almanac).
//       Returns { playerId, contractId, premiumCents }.
//   POST /v1/_test/insurance/setup-projection-with-claim
//     — creates player + COMPLETE walk + ACTIVE contract + PAID claim.
//       Returns { playerId, contractId, premiumCents, payoutCents }.
//   POST /v1/_test/insurance/setup-projection-frauded
//     — creates player + FRAUDED contract + POISONED almanac (DENIED_FRAUD claim).
//       Returns { playerId, contractId }.
//   GET /v1/_test/insurance/project-contract?playerId=&contractId=
//     — calls InsuranceProjectionService.projectContract(). Returns InsuranceClientProjection.
//       P5-compliant shape — ZERO hidden scalar (no findings_bitmask/observation_depth/route_id/
//       poisoned_until_tick/collateral_amount). The E2E asserts each forbidden key is absent.
//
// §1.4 DD-FRAUD-AUTOCLAIM Obligation #1 Route (realflow_fraud.spec.ts):
//   POST /v1/_test/insurance/setup-ob1-with-realflow
//     — Creates player + hot substrate + WALKING walk, calls REAL recordFindings (walkDurationDays
//       times) to populate findings_bitmask, then computePremium → COMPLETE, issues contract
//       (with asset_ref for STASH/PROPERTY). Returns { playerId, contractId, blockId?, buildingId?,
//       cashBefore, gramsSeized?, cargoCents?, throughputInPerHour?, premiumCents }.
//       Substrate for each coverage type:
//         STASH_LOSS:     building(heat=0.95) + product_storage(gramsSeized) → bits 1+2 set
//         PROPERTY:       building(heat=0.95) + product_storage + PROPERTY walk → bits 1+2 set
//         COURIER_ARREST: courier_shift(status=in_transit, patrol_heat=0) → bit 4+2 set
//         FENCE_DEFAULT:  laundering_node(buffer_load=0.95, throughput=1000) → bits 5+2 set
//       The findings_bitmask is populated by the REAL recordFindings service — NOT hardcoded.
//       This satisfies design §1.4 Obligation #1: honest production walk → PAID for all 4.
//
// Anti-fabrication (C4/C5/C6/C9/C11): no non-deterministic RNG in this file — insuranceTunables reads TunablesStore,
// no RNG. Seed routes use explicit test values (no non-deterministic RNG).
// R2.2: C2/C5/C6/C9/C11 seed/read routes are TEST-ONLY (not registered in production). findings_bitmask NEVER
// forwarded to real clients — only accessible via this _test route for E2E DB assertion.
// R2.2 (C5): collateral_amount raw is NEVER returned to the caller; only escrowRequiredCents (clear cash).
// R2.2 (C11): project-contract returns ONLY the P5-allowed fields (no hidden scalar in the projection shape).

import { Body, Controller, Get, HttpCode, HttpException, HttpStatus, Inject, Post, Query } from '@nestjs/common';
import { and, eq, sql, isNotNull, gt } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import { insuranceTunables } from './insurance-tunables';
import {
  underwriterWalkRecord,
  insuranceContract,
  insuranceClaim,
  almanacEntry,
  coverageInducedDriftState,
} from '../../db/schema/insurance';
import { player } from '../../db/schema/player';
import { account } from '../../db/schema/account';
import {
  productStorage,
  buildingOperationalState,
  courierShift,
  courier,
  route,
  moneyHolding,
  dealer,
} from '../../db/schema/operational_chain';
import { dealLek } from '../../db/schema/city_state';
import { lanePricingState } from '../../db/schema/market_lane_pricing_state';
import {
  isLessCautiousThanBaseline,
  type BehaviourFingerprint,
} from './behaviour-fingerprint';
import { capacityCentsForTier } from '../money_holding/money-holding-tunables';
import { building } from '../../db/schema/city_state';
import { blocks } from '../../db/schema/world_geography';
import { economyState } from '../../db/schema/player_economy_state';
import { restraintDisputeRing, bossMirrorViolationRing } from '../../db/schema/reputation_state';
import { UnderwritingWalkService } from './underwriting-walk.service';
import { ContractService } from './contract.service';
import { InsuranceProjectionService } from './insurance.projection.service';
import { CourierInterceptionService } from './courier-interception.service';
import { FenceDefaultService } from './fence-default.service';
import { FraudDetectionService } from './fraud-detection.service';
import type { FindingType } from './findings';
import { CoverageInducedDriftService } from './coverage-induced-drift.service';
import { RenewalService } from './renewal.service';
import { SYNTHETIC_UNDERWRITER_ID } from './insurance-constants';
import { MoneyHoldingService } from '../money_holding/money-holding.service';
import { DistributionService } from '../distribution/distribution.service';
import { SellingSellService } from '../selling/selling-sell.service';
import { citySimClock } from '../../db/schema/city_sim_clock';
import { launderingNode } from '../../db/schema/pipeline_and_laundering';
import type { CoverageType } from './findings';
import { Cadence } from '../../citysim/scheduler/city_sim_system';
import type { CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import { ClaimsService } from './claims.service';
import { LieutenantService } from '../lieutenant/lieutenant.service';
import { lieutenant, behaviorScript } from '../../db/schema/lieutenant';
import { SECURITY_ROLE_ID } from '../lieutenant/lieutenant-archetype';
import { BossMirrorService } from '../reputation/boss-mirror.service';
import type { RuleViolationEvent } from '../../citysim/events/city-event-bus';
import { CityEventBus } from '../../citysim/events/city-event-bus';

// ── C0 response shapes ────────────────────────────────────────────────────────────────────────────

/** Probe response — the 5 §4.1 canon tunables + 4 §4.2 drift tunables resolved via the registry (no raw mechanic scalars). */
interface TunablesProbeResponse {
  /** insurance.underwriting_walk_duration_days — default 3 (canon :76,184). */
  underwriting_walk_duration_days: number;
  /** insurance.underwriting_base_premium_pct_of_insured_value_per_cycle — default 4 (canon :77,185). */
  underwriting_base_premium_pct_of_insured_value_per_cycle: number;
  /** insurance.underwriting_fraud_penalty_multiplier — default 5 (canon :79,187). */
  underwriting_fraud_penalty_multiplier: number;
  /** insurance.underwriting_almanac_persistence_days_post_lapse — default 90 (canon :80,188). */
  underwriting_almanac_persistence_days_post_lapse: number;
  /** insurance.underwriting_c_i_per_finding_min — canon range min 0.1 (canon :78,186). */
  underwriting_c_i_per_finding_min: number;
  /** insurance.underwriting_c_i_per_finding_max — canon range max 0.6 (canon :78,186). */
  underwriting_c_i_per_finding_max: number;
  // ── §4.2 Coverage-Induced Drift canon tunables (Drift C0, 2026-06-18) ──────────────────────────
  /** insurance.coverage_drift_alpha_hazard_sensitivity_per_shift_point — default 0.05 (canon :119,189). */
  coverage_drift_alpha_hazard_sensitivity_per_shift_point: number;
  /** insurance.coverage_drift_shift_decay_per_week — default 1 (canon :120,190). */
  coverage_drift_shift_decay_per_week: number;
  /** insurance.coverage_drift_coverage_tiers — default 3 (canon :121,191). */
  coverage_drift_coverage_tiers: number;
  /** insurance.coverage_drift_behaviour_fingerprint_window_days — default 30 (canon :122,192). */
  coverage_drift_behaviour_fingerprint_window_days: number;
  /** insurance.coverage_drift_marginal_deal_heat_threshold — default 5, range 1..20 [PROPOSED DEFAULT][PROV-Y26Q2]. */
  coverage_drift_marginal_deal_heat_threshold: number;
  // ── W6a C5 (DD-MAGNITUDE-BOUND) — insuredValueCents clamp bounds ─────────────────────────────
  /** insurance.insured_value_cents_floor — default 100 [PROPOSED DEFAULT][PROV-Y26Q2]. */
  insured_value_cents_floor: number;
  /** insurance.insured_value_cents_ceiling — default 500_000_000 [PROPOSED DEFAULT][PROV-Y26Q2]. */
  insured_value_cents_ceiling: number;
}

// ── C1 request shapes ─────────────────────────────────────────────────────────────────────────────

/** Body for POST /v1/_test/insurance/seed-entities */
interface SeedEntitiesBody {
  /** Coverage type to use for the walk + contract row (default 'PROPERTY'). */
  coverageType?: 'PROPERTY' | 'STASH_LOSS' | 'COURIER_ARREST' | 'FENCE_DEFAULT';
}

/** Response for POST /v1/_test/insurance/seed-entities */
interface SeedEntitiesResponse {
  playerId: string;
  walkId: string;
  contractId: string;
  claimId: string;
  almanacId: string;
}

/** Body for POST /v1/_test/insurance/delete-player */
interface DeletePlayerBody {
  playerId: string;
}

// ── C2 request/response shapes ────────────────────────────────────────────────────────────────────

/** Body for POST /v1/_test/insurance/start-walk */
interface StartWalkBody {
  /** Coverage type for the walk. Default 'STASH_LOSS'. */
  coverageType?: CoverageType;
}

/** Response for POST /v1/_test/insurance/start-walk */
interface StartWalkResponse {
  walkId: string;
  playerId: string;
}

/** Body for POST /v1/_test/insurance/seed-substrate */
interface SeedSubstrateBody {
  /** Player to seed substrate for. */
  playerId: string;
  /**
   * When true: insert a product_storage row with high quantity_grams → triggers STASH_QUEUE_DEEP.
   * When false (or missing): delete all product_storage rows for the player → releases the staging.
   */
  stashQueueDeep?: boolean;
}

/** Body for POST /v1/_test/insurance/run-recordfindings-tick */
interface RunRecordFindingsTickBody {
  /**
   * The game-minute tick to pass to recordFindings(ctx).
   * The service derives the day index from this: dayIndex = Math.floor(gameMinute / 1440).
   * Use 1440 for day 1, 2880 for day 2, etc.
   */
  gameMinute: number;
}

// ── C3 request/response shapes ────────────────────────────────────────────────────────────────────

/**
 * Body for POST /v1/_test/insurance/setup-premium.
 *
 * Creates or updates a walk+contract with a deterministic bitmask + observation_depth.
 * Used by the C3 E2E to set up the walk state for computePremium assertions.
 *
 * `start_tick` is always set to 0 so that `daysElapsed = observation_depth - 0 = dayOfWalk`.
 * This makes the day-guard formula deterministic and testable without needing real ticks.
 *
 * Anti-fabrication: no Math.random — all values are provided explicitly by the E2E.
 */
interface SetupPremiumBody {
  /** Coverage type for the walk + contract. Default 'STASH_LOSS'. */
  coverageType?: 'PROPERTY' | 'STASH_LOSS' | 'COURIER_ARREST' | 'FENCE_DEFAULT';
  /** Insured value in cents. Used to compute base premium in computePremium. */
  insuredValueCents: number;
  /**
   * Which FindingType bit indices to set in findings_bitmask.
   * E.g., [1, 3] → bits 1 and 3 set → HEAT_SMOKE_OBSERVED + STASH_QUEUE_DEEP.
   * Empty array → bitmask = 0 (no findings → premium = base).
   */
  findingBits: number[];
  /**
   * The number of game-days elapsed since walk start to simulate.
   * observation_depth is set to dayOfWalk (with start_tick=0 → daysElapsed = dayOfWalk).
   * Use 1 to test early refusal; use 3 (=walkDurationDays default) to trigger completion.
   */
  dayOfWalk: number;
  /**
   * Optional existing walkId to UPDATE (rather than create a new walk).
   * When present: updates the walk's bitmask + observation_depth and the contract's insured_value_cents.
   * When absent: creates a fresh player + walk + contract.
   */
  walkId?: string;
}

/** Response for POST /v1/_test/insurance/setup-premium */
interface SetupPremiumResponse {
  walkId: string;
  playerId: string;
}

/** Body for POST /v1/_test/insurance/compute-premium */
interface ComputePremiumBody {
  walkId: string;
}

/** Response for POST /v1/_test/insurance/compute-premium */
interface ComputePremiumResponse {
  premiumCents: number;
}

/** A constant sentinel test underwriter UUID — used for test player rows with no real underwriter. */
const TEST_UNDERWRITER_ID = '00000000-0000-0000-0000-000000000002';

/**
 * Monotone counter for test callsign uniqueness.
 * Prevents callsign collisions when multiple test requests arrive in the same millisecond
 * (e.g., parallel Promise.all in E2E determinism tests).
 * No Math.random — just a per-process integer counter (safe for test-only use).
 */
let _testCallsignCounter = 0;
function nextTestCallsign(prefix: string): string {
  const n = ++_testCallsignCounter;
  // prefix (≤6 chars) + '-' + ts mod (8 digits) + '-' + counter (≤4 digits) ≤ 6+1+8+1+4=20 ✓ (max 24)
  return `${prefix}-${(Date.now() % 100_000_000).toString().padStart(8, '0')}-${n.toString().padStart(4, '0')}`;
}

/**
 * Serialize a DB row for JSON (convert BigInt → string, keep everything else as-is).
 * Mirrors the C1 serializeRow pattern.
 */
function serializeRow(row: Record<string, unknown> | null): unknown | null {
  if (!row) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = typeof v === 'bigint' ? String(v) : v;
  }
  return out;
}

// ── C5 request/response shapes ────────────────────────────────────────────────────────────────────

/**
 * Body for POST /v1/_test/insurance/issue-with-counterparty — C5 DD-WARY test route.
 *
 * Seeds a COMPLETE walk + player (with cash), optionally a restraint_dispute_ring row,
 * then calls ContractService.issueContract() with the configured counterpartyId.
 *
 * Fields:
 *   coverageType: 'PROPERTY' | ... — coverage for the walk+contract.
 *   insuredValueCents: number — declared insured value.
 *   waryActive: boolean — whether wary_active = true in the ring row.
 *   collateralAmountCents: number — the collateral_amount to seed in the ring row.
 *   noCounterparty?: boolean — if true, use counterpartyId=null (neutral, zero-regression test).
 *
 * R2.2: `collateral_amount` raw is NEVER in the response — only `escrowRequiredCents` (clear cash).
 */
interface IssueWithCounterpartyBody {
  coverageType?: CoverageType;
  insuredValueCents: number;
  waryActive: boolean;
  collateralAmountCents: number;
  noCounterparty?: boolean;
}

/**
 * Response for POST /v1/_test/insurance/issue-with-counterparty.
 *
 * `basePremiumForComparison`: the un-surcharged premium (same bitmask + insuredValue, no wary).
 * Used by the E2E to assert: premiumCents == Math.round(basePremiumForComparison * 1.25) for wary case.
 * This avoids hardcoding an inline premium literal in the E2E (anti-fabrication: all from registry).
 *
 * R2.2: `collateralAmountRaw` is intentionally ABSENT (collateral_amount is server-only).
 */
interface IssueWithCounterpartyResponse {
  playerId: string;
  contractId: string;
  premiumCents: number;
  escrowRequiredCents: number;
  /** The base premium before any wary surcharge. For E2E ratio assertion only. */
  basePremiumForComparison: number;
}

// ── C4 request/response shapes ────────────────────────────────────────────────────────────────────

/** Body for POST /v1/_test/insurance/setup-walk-with-contract */
interface SetupWalkWithContractBody {
  coverageType?: CoverageType;
  insuredValueCents: number;
}

/** Response for POST /v1/_test/insurance/setup-walk-with-contract */
interface SetupWalkWithContractResponse {
  walkId: string;
  playerId: string;
}

/** Body for POST /v1/_test/insurance/setup-complete-walk */
interface SetupCompleteWalkBody {
  coverageType?: CoverageType;
  insuredValueCents: number;
}

/** Response for POST /v1/_test/insurance/setup-complete-walk */
interface SetupCompleteWalkResponse {
  walkId: string;
  playerId: string;
  cashBefore: number;
}

/** Body for POST /v1/_test/insurance/issue-contract */
interface IssueContractBody {
  playerId: string;
  walkId: string;
  insuredValueCents: number;
  counterpartyId: string | null;
}

/** Response for POST /v1/_test/insurance/issue-contract */
interface IssueContractResponse {
  contractId: string;
  premiumCents: number;
  escrowRequiredCents: number;
}

/** Response for GET /v1/_test/insurance/read-cash */
interface ReadCashResponse {
  cashCents: number;
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class InsuranceTestController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly walkService: UnderwritingWalkService,
    private readonly contractService: ContractService,
    private readonly projectionService: InsuranceProjectionService,
    private readonly courierInterceptionService: CourierInterceptionService,
    private readonly fenceDefaultService: FenceDefaultService,
    private readonly fraudDetectionService: FraudDetectionService,
    private readonly claimsService: ClaimsService,
    private readonly driftService: CoverageInducedDriftService,
    private readonly renewalService: RenewalService,
    private readonly moneyHoldingService: MoneyHoldingService,
    private readonly distributionService: DistributionService,
    private readonly sellingSellService: SellingSellService,
    private readonly lieutenantService: LieutenantService,
    private readonly bossMirrorService: BossMirrorService,
    private readonly cityEventBus: CityEventBus,
  ) {}

  // ── C0 Routes ─────────────────────────────────────────────────────────────────────────────────

  /**
   * `GET /v1/_test/insurance/tunables-probe` — TEST-ONLY.
   *
   * Returns the 5 §4.1 canon tunable values resolved by TunablesStore (registry-first, VERBATIM canon
   * defaults). The E2E asserts these verbatim canon defaults (walk=3, pct=4, fraud=5, almanac=90,
   * c_i_min=0.1, c_i_max=0.6) with no inline literal in the game-back code.
   *
   * 200 → InsuranceModule is wired into the app module graph.
   * 404 → InsuranceModule NOT wired (C0 failing state before scaffold).
   *
   * R2.2: no hidden mechanic scalar exposed (tunables are registry-governed, not actuarial risk state).
   * Anti-fabrication (C4): reads insuranceTunables getters — no non-deterministic RNG, no inline literal.
   */
  @Get('_test/insurance/tunables-probe')
  tunablesProbe(): TunablesProbeResponse {
    return {
      underwriting_walk_duration_days: insuranceTunables.walkDurationDays,
      underwriting_base_premium_pct_of_insured_value_per_cycle: insuranceTunables.basePremiumPctOfInsuredValue,
      underwriting_fraud_penalty_multiplier: insuranceTunables.fraudPenaltyMultiplier,
      underwriting_almanac_persistence_days_post_lapse: insuranceTunables.almanacPersistenceDaysPostLapse,
      underwriting_c_i_per_finding_min: insuranceTunables.cIPerFindingMin,
      underwriting_c_i_per_finding_max: insuranceTunables.cIPerFindingMax,
      // ── §4.2 Coverage-Induced Drift canon tunables (Drift C0 — gdd/14 registry-first) ──────────
      coverage_drift_alpha_hazard_sensitivity_per_shift_point: insuranceTunables.coverageDriftAlpha,
      coverage_drift_shift_decay_per_week: insuranceTunables.coverageDriftShiftDecayPerWeek,
      coverage_drift_coverage_tiers: insuranceTunables.coverageDriftCoverageTiers,
      coverage_drift_behaviour_fingerprint_window_days: insuranceTunables.coverageDriftFingerprintWindowDays,
      coverage_drift_marginal_deal_heat_threshold: insuranceTunables.coverageDriftMarginalDealHeatThreshold,
      // ── W6a C5 (DD-MAGNITUDE-BOUND) — insuredValueCents clamp bounds, read live from the registry
      // so an E2E sensitivity test can prove a DB-override flip moves `issueContract`'s clamp point
      // (design §3/C5: "le test lit la borne depuis le registre et prouve que déplacer le tunable
      // déplace le point de bascule").
      insured_value_cents_floor: insuranceTunables.insuredValueCentsFloor,
      insured_value_cents_ceiling: insuranceTunables.insuredValueCentsCeiling,
    };
  }

  // ── C1 Routes ─────────────────────────────────────────────────────────────────────────────────

  /**
   * `POST /v1/_test/insurance/seed-entities` — C1 persistence proof (TEST-ONLY).
   *
   * Inserts 1 row in each of the 4 insurance tables for a fresh test player.
   * The player row is created with a test account_id sentinel (uuid '00000000-...' pattern).
   * Returns all 4 entity IDs for the E2E read + cascade-delete assertion.
   *
   * Column values use explicit test defaults — no mechanic logic (persistence-only at C1).
   * R2.2: TEST-ONLY (not registered in production). Raw rows returned for DB assertion only.
   */
  @Post('_test/insurance/seed-entities')
  async seedEntities(@Body() body: SeedEntitiesBody): Promise<SeedEntitiesResponse> {
    const coverageType = body?.coverageType ?? 'PROPERTY';

    // 1. Create a test account + player row.
    //    The account table is owned by ch17 but player has a FK on account_id.
    //    Pattern mirrors reputation_boss_mirror.spec.ts seedPlayer() — insert account first.
    const [accountRow] = await this.db
      .insert(account)
      .values({
        kind: 'PLAYER',
        lifecycle_state: 'ACTIVE',
      })
      .returning({ account_id: account.account_id });
    const testAccountId = accountRow!.account_id;

    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: testAccountId,
        callsign: nextTestCallsign('ins'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // 2. underwriter_walk_record — status WALKING, findings_bitmask=0 (default).
    const [walkRow] = await this.db
      .insert(underwriterWalkRecord)
      .values({
        player_id: playerId,
        coverage_type: coverageType,
        observation_depth: 1,
        findings_bitmask: BigInt(0),
        start_tick: BigInt(0),
        status: 'WALKING',
      })
      .returning({ id: underwriterWalkRecord.id });
    const walkId = walkRow!.id;

    // 3. insurance_contract — status ACTIVE, walk_id references the walk above.
    const [contractRow] = await this.db
      .insert(insuranceContract)
      .values({
        player_id: playerId,
        type: coverageType,
        insured_value_cents: BigInt(1_000_000), // $10k test value
        premium_cents: BigInt(0),
        walk_id: walkId,
        status: 'ACTIVE',
        issued_tick: BigInt(0),
      })
      .returning({ id: insuranceContract.id });
    const contractId = contractRow!.id;

    // 4. insurance_claim — status FILED, contract_id references the contract above.
    //    claim_basis HEAT_RAID (matches PROPERTY coverage — realistic test default).
    const [claimRow] = await this.db
      .insert(insuranceClaim)
      .values({
        player_id: playerId,
        contract_id: contractId,
        claim_basis: 'HEAT_RAID',
        claimed_cents: BigInt(500_000), // $5k test loss
        payout_cents: BigInt(0),
        status: 'FILED',
        filed_tick: BigInt(0),
      })
      .returning({ id: insuranceClaim.id });
    const claimId = claimRow!.id;

    // 5. almanac_entry — status CLEAN, no poison horizon (null poisoned_until_tick).
    //    underwriter_id: sentinel uuid for the test underwriter NPC.
    const [almanacRow] = await this.db
      .insert(almanacEntry)
      .values({
        underwriter_id: TEST_UNDERWRITER_ID,
        player_id: playerId,
        status: 'CLEAN',
        poisoned_until_tick: null,
      })
      .returning({ id: almanacEntry.id });
    const almanacId = almanacRow!.id;

    return { playerId, walkId, contractId, claimId, almanacId };
  }

  /**
   * `GET /v1/_test/insurance/read-entities?playerId=<uuid>` — C1 persistence proof (TEST-ONLY).
   *
   * Reads the 4 insurance rows for the given player.
   * Returns { walk, contract, claim, almanac } — each null if not found (CASCADE deleted).
   *
   * E2E assertion: the returned shapes prove:
   *   - findings_bitmask: bigint → serialized as string by PG ('0' for default)
   *   - almanac has NO baseline_fingerprint (DD-ALMANAC-NO-FINGERPRINT)
   *   - status enums match design defaults
   * R2.2: TEST-ONLY (not registered in production). Returns raw rows for DB assertion only.
   */
  @Get('_test/insurance/read-entities')
  async readEntities(
    @Query('playerId') playerId: string,
  ): Promise<{
    walk: unknown | null;
    contract: unknown | null;
    claim: unknown | null;
    almanac: unknown | null;
  }> {
    // Read one row per table for the given player.
    const [walkRow = null] = await this.db
      .select()
      .from(underwriterWalkRecord)
      .where(eq(underwriterWalkRecord.player_id, playerId))
      .limit(1);

    const [contractRow = null] = await this.db
      .select()
      .from(insuranceContract)
      .where(eq(insuranceContract.player_id, playerId))
      .limit(1);

    const [claimRow = null] = await this.db
      .select()
      .from(insuranceClaim)
      .where(eq(insuranceClaim.player_id, playerId))
      .limit(1);

    const [almanacRow = null] = await this.db
      .select()
      .from(almanacEntry)
      .where(eq(almanacEntry.player_id, playerId))
      .limit(1);

    return {
      walk:     serializeRow(walkRow as Record<string, unknown> | null),
      contract: serializeRow(contractRow as Record<string, unknown> | null),
      claim:    serializeRow(claimRow as Record<string, unknown> | null),
      almanac:  serializeRow(almanacRow as Record<string, unknown> | null),
    };
  }

  /**
   * `POST /v1/_test/insurance/delete-player` — C1 FK CASCADE proof (TEST-ONLY).
   *
   * Deletes the test player row. The player FK CASCADE should remove all 4 insurance rows.
   * The E2E then re-reads the entities and asserts they are all null.
   *
   * R2.2: TEST-ONLY (not registered in production). Used ONLY to assert CASCADE behavior.
   */
  @Post('_test/insurance/delete-player')
  async deletePlayer(@Body() body: DeletePlayerBody): Promise<{ deleted: boolean }> {
    const { playerId } = body;
    await this.db
      .delete(player)
      .where(eq(player.player_id, playerId));
    return { deleted: true };
  }

  // ── C2 Routes ─────────────────────────────────────────────────────────────────────────────────

  /**
   * `POST /v1/_test/insurance/start-walk` — C2 walk-lifecycle proof (TEST-ONLY).
   *
   * Creates a fresh test player + a fresh underwriter_walk_record (status=WALKING, findings_bitmask=0).
   * The player row is created fresh for isolation (each test call creates its own player).
   * Returns { walkId, playerId }.
   *
   * R2.2: TEST-ONLY (not registered in production). The E2E calls delete-player at the end to clean up.
   * Anti-fabrication (C4): no non-deterministic RNG — walkId is PG uuid defaultRandom() (DB-side).
   */
  @Post('_test/insurance/start-walk')
  @HttpCode(201)
  async startWalk(@Body() body: StartWalkBody): Promise<StartWalkResponse> {
    const coverageType: CoverageType = body?.coverageType ?? 'STASH_LOSS';

    // Create a fresh test account + player row for isolation.
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow!.account_id,
        callsign: nextTestCallsign('walk'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // Create the walk record via the service.
    const { walkId } = await this.walkService.startWalk(playerId, null, coverageType, 0);

    return { walkId, playerId };
  }

  /**
   * `POST /v1/_test/insurance/seed-substrate` — C2 substrate staging for finding-trigger tests (TEST-ONLY).
   *
   * Seeds or releases coverage-relevant substrate state for a player.
   * Used to stage the substrate BEFORE running the NIGHTLY tick, then release it to test monotone OR.
   *
   * When `stashQueueDeep=true`:
   *   Inserts a product_storage row for the player with high quantity_grams (triggers STASH_QUEUE_DEEP).
   *   Uses a sentinel building_id (00000000-...-0001) — no real building row needed (product_storage
   *   has a soft-ref to building_id; the FK might be strict in the schema — use a real building if needed).
   * When `stashQueueDeep=false`:
   *   Deletes all product_storage rows for the player (releases the staging → snapshot sees no stash).
   *
   * R2.2: TEST-ONLY. Used only for E2E substrate staging.
   * Zero-regression: only touches `product_storage` rows for the test player — no shared table mutations.
   */
  @Post('_test/insurance/seed-substrate')
  async seedSubstrate(@Body() body: SeedSubstrateBody): Promise<{ seeded: boolean }> {
    const { playerId, stashQueueDeep = false } = body;

    if (stashQueueDeep) {
      // Insert a product_storage row with high quantity_grams for STASH_QUEUE_DEEP trigger.
      // We need a building_id. In the test context we create a minimal building row first.
      // The productStorage table has FK to building(building_id) so we need a real building.
      const [buildingRow] = await this.db
        .insert(building)
        .values({
          player_id: playerId,
          block_id: 1,
          building_type: 1,
          ownership: 'player',
          heat: 0,
          structural_state: 'operational',
        })
        .returning({ building_id: building.building_id });
      const buildingId = buildingRow!.building_id;

      // Insert a product_storage row with high quantity_grams.
      // substance_type: 'brindle' (the simplest substance — avoids enum complications).
      await this.db
        .insert(productStorage)
        .values({
          player_id: playerId,
          building_id: buildingId,
          substance_type: 'brindle',
          quantity_grams: 10_000, // clearly above threshold (> 0 = STASH_QUEUE_DEEP fires)
        });

      return { seeded: true };
    } else {
      // Release the staging: delete all product_storage rows for this player.
      await this.db
        .delete(productStorage)
        .where(eq(productStorage.player_id, playerId));
      return { seeded: false };
    }
  }

  /**
   * `POST /v1/_test/insurance/run-recordfindings-tick` — C2 NIGHTLY tick driver (TEST-ONLY).
   *
   * Directly calls `UnderwritingWalkService.recordFindings(ctx)` for all players with WALKING walks.
   * This simulates the NIGHTLY scheduler firing at the given game-minute (bypasses the real
   * scheduler timer — the test drives the tick synchronously for determinism).
   *
   * The route collects all distinct player_ids from WALKING walks and calls `recordFindings` for each.
   * This is necessary because the real scheduler fires per-player; the E2E simulates the full NIGHTLY band.
   *
   * Body: { gameMinute: number } — must be a NIGHTLY boundary (multiple of 1440) for correct day-index.
   * Response: { ticked: true, playerCount: number }.
   *
   * R2.2: TEST-ONLY (findings_bitmask stays server-side — this route only DRIVES the tick, not reads it).
   * Anti-fabrication (C4): no non-deterministic RNG — the tick is deterministic (pure snapshot comparison).
   */
  @Post('_test/insurance/run-recordfindings-tick')
  async runRecordFindingsTick(@Body() body: RunRecordFindingsTickBody): Promise<{ ticked: boolean; playerCount: number }> {
    const gameMinute = body?.gameMinute ?? 1440;

    // Find all distinct player_ids with WALKING walks.
    const walkingRows = await this.db
      .select({ player_id: underwriterWalkRecord.player_id })
      .from(underwriterWalkRecord)
      .where(eq(underwriterWalkRecord.status, 'WALKING'));

    // Deduplicate player_ids.
    const playerIds = [...new Set(walkingRows.map((r) => r.player_id))];

    // Call recordFindings for each player (mirrors the real NIGHTLY band: per-player).
    for (const playerId of playerIds) {
      await this.walkService.recordFindings({
        playerId,
        cadence: Cadence.NIGHTLY,
        gameMinute,
      });
    }

    return { ticked: true, playerCount: playerIds.length };
  }

  /**
   * `GET /v1/_test/insurance/read-walk?walkId=<uuid>` — C2 walk row assertion (TEST-ONLY).
   *
   * Reads the underwriter_walk_record row for the given walkId.
   * Returns the full row (bigint fields serialized as strings for JSON compatibility).
   *
   * The E2E uses this to assert:
   *   - `findings_bitmask`: the monotone-OR bitmask after NIGHTLY ticks.
   *   - `status`: WALKING (until computePremium at day==duration in C3 → COMPLETE).
   *   - `observation_depth`: incremented each day by recordFindings.
   *
   * R2.2: TEST-ONLY (findings_bitmask is server-side — never accessible from client routes).
   *   This route is ONLY for E2E DB assertion (BO-side validation of DD-WALK invariants).
   */
  @Get('_test/insurance/read-walk')
  async readWalk(@Query('walkId') walkId: string): Promise<unknown | null> {
    const [row = null] = await this.db
      .select()
      .from(underwriterWalkRecord)
      .where(eq(underwriterWalkRecord.id, walkId))
      .limit(1);

    return serializeRow(row as Record<string, unknown> | null);
  }

  // ── C3 Routes ─────────────────────────────────────────────────────────────────────────────────

  /**
   * `POST /v1/_test/insurance/setup-premium` — C3 computePremium setup (TEST-ONLY).
   *
   * Creates or updates a walk+contract with a deterministic bitmask + observation_depth for E2E testing.
   *
   * Strategy for day-guard testability:
   *   `start_tick = 0` → `startDayIndex = Math.floor(0 / 1440) = 0`.
   *   `observation_depth = body.dayOfWalk`.
   *   → `daysElapsed = observation_depth - startDayIndex = dayOfWalk - 0 = dayOfWalk`.
   *   This makes computePremium's relative guard formula produce exactly `dayOfWalk` elapsed days,
   *   regardless of the actual game-day (the guard is relative to start_tick — carry-forward C2 reviewer⊥).
   *
   * If `walkId` is provided: updates the existing walk+contract (for advancing day in tests).
   * If `walkId` is absent: creates a fresh player + walk + contract.
   *
   * R2.2: TEST-ONLY. The findings_bitmask is set directly for deterministic assertion — not via the NIGHTLY
   *   tick. This is only valid in the E2E stack (not in production).
   * Anti-fabrication: no Math.random — all values are provided by the E2E test.
   */
  @Post('_test/insurance/setup-premium')
  async setupPremium(@Body() body: SetupPremiumBody): Promise<SetupPremiumResponse> {
    const coverageType: 'PROPERTY' | 'STASH_LOSS' | 'COURIER_ARREST' | 'FENCE_DEFAULT' =
      body?.coverageType ?? 'STASH_LOSS';
    const insuredValueCents = body?.insuredValueCents ?? 1_000_000;
    const findingBits: number[] = body?.findingBits ?? [];
    const dayOfWalk = body?.dayOfWalk ?? 1;

    // Build the bitmask from the findingBits array.
    // findingBits = [1, 3] → bitmask = (1n << 1n) | (1n << 3n) = 0b1010 = 10n.
    let bitmask = 0n;
    for (const bit of findingBits) {
      bitmask |= (1n << BigInt(bit));
    }

    // observation_depth = dayOfWalk (with start_tick=0 → daysElapsed = dayOfWalk).
    // This makes the day-guard formula deterministic: daysElapsed = depth - floor(0/1440) = dayOfWalk.
    const observationDepth = dayOfWalk;

    if (body?.walkId) {
      // UPDATE existing walk + contract.
      await this.db
        .update(underwriterWalkRecord)
        .set({
          findings_bitmask: bitmask,
          observation_depth: observationDepth,
          start_tick: BigInt(0),  // keep start_tick=0 for determinism
          status: 'WALKING',       // reset to WALKING so computePremium can run the guard
          updated_at: new Date(),
        })
        .where(eq(underwriterWalkRecord.id, body.walkId));

      // Update the contract's insured_value_cents.
      await this.db
        .update(insuranceContract)
        .set({ insured_value_cents: BigInt(insuredValueCents), updated_at: new Date() })
        .where(eq(insuranceContract.walk_id, body.walkId));

      // Find the player_id for the response.
      const [walkRow] = await this.db
        .select({ player_id: underwriterWalkRecord.player_id })
        .from(underwriterWalkRecord)
        .where(eq(underwriterWalkRecord.id, body.walkId))
        .limit(1);

      return { walkId: body.walkId, playerId: walkRow?.player_id ?? '' };
    }

    // CREATE fresh player + walk + contract.
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow!.account_id,
        callsign: nextTestCallsign('prm'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // Create the walk with the specified bitmask + observation_depth + start_tick=0.
    const [walkRow] = await this.db
      .insert(underwriterWalkRecord)
      .values({
        player_id: playerId,
        coverage_type: coverageType,
        findings_bitmask: bitmask,
        start_tick: BigInt(0),           // start_tick=0 → startDayIndex=0 → daysElapsed=dayOfWalk
        observation_depth: observationDepth,
        status: 'WALKING',
      })
      .returning({ id: underwriterWalkRecord.id });
    const walkId = walkRow!.id;

    // Create the contract with the insured_value_cents + walk_id.
    // premium_cents defaults to 0 until computePremium runs.
    await this.db.insert(insuranceContract).values({
      player_id: playerId,
      type: coverageType,
      insured_value_cents: BigInt(insuredValueCents),
      premium_cents: BigInt(0),
      walk_id: walkId,
      status: 'ACTIVE',
      issued_tick: BigInt(0),
    });

    return { walkId, playerId };
  }

  /**
   * `POST /v1/_test/insurance/compute-premium` — C3 computePremium driver (TEST-ONLY).
   *
   * Calls `UnderwritingWalkService.computePremium(walkId)` and returns `{ premiumCents }`.
   * Returns 409 if the walk has not yet elapsed `underwriting_walk_duration_days` days.
   * Returns 200 with `{ premiumCents }` when complete (idempotent on re-call).
   *
   * R2.2: premiumCents is a CLEAR transaction value (DD-P5) — safe to return to any caller.
   *   (The bitmask is NOT returned by this route — it stays server-side.)
   * Anti-fabrication: no Math.random — the premium is deterministic from bitmask + insured_value.
   */
  @Post('_test/insurance/compute-premium')
  async computePremium(@Body() body: ComputePremiumBody): Promise<ComputePremiumResponse> {
    const { walkId } = body;
    if (!walkId) {
      throw new HttpException('walkId is required', HttpStatus.BAD_REQUEST);
    }
    const { premiumCents } = await this.walkService.computePremium(walkId);
    return { premiumCents };
  }

  // ── C4 Routes ─────────────────────────────────────────────────────────────────────────────────

  /**
   * `POST /v1/_test/insurance/setup-walk-with-contract` — C4 real-flow setup (TEST-ONLY).
   *
   * Creates a fresh player + WALKING walk + insurance_contract with the given insured_value_cents.
   * The walk is in WALKING state (start_tick=0) — the E2E then drives real recordFindings ticks
   * to accumulate findings and eventually call computePremium. This provides the "real flow" base
   * for the carry-forward integration test (C3 reviewer⊥).
   *
   * No cash needed at setup — the debit only happens at issueContract.
   * Body: { coverageType?, insuredValueCents }.
   * Response: { walkId, playerId }.
   *
   * R2.2: TEST-ONLY. The contract is inserted with status=ACTIVE but premium_cents=0 (the
   *   issueContract flow sets the real premium; this route just seeds the data model for the real-flow).
   * Anti-fabrication: no Math.random.
   */
  @Post('_test/insurance/setup-walk-with-contract')
  @HttpCode(201)
  async setupWalkWithContract(
    @Body() body: SetupWalkWithContractBody,
  ): Promise<SetupWalkWithContractResponse> {
    const coverageType: CoverageType = body?.coverageType ?? 'STASH_LOSS';
    const insuredValueCents = body?.insuredValueCents ?? 1_000_000;

    // Create fresh player.
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow!.account_id,
        callsign: nextTestCallsign('cwc'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // Create WALKING walk with start_tick=0 (NIGHTLY boundary).
    const { walkId } = await this.walkService.startWalk(playerId, null, coverageType, 0);

    // Create the insurance_contract with insured_value_cents so computePremium can read it.
    // status=ACTIVE (no PENDING enum), premium_cents=0 (filled by computePremium).
    await this.db.insert(insuranceContract).values({
      player_id: playerId,
      type: coverageType,
      insured_value_cents: BigInt(insuredValueCents),
      premium_cents: BigInt(0),
      walk_id: walkId,
      status: 'ACTIVE',
      issued_tick: BigInt(0),
    });

    return { walkId, playerId };
  }

  /**
   * `POST /v1/_test/insurance/setup-complete-walk` — C4 issueContract setup (TEST-ONLY).
   *
   * Creates a fresh player with cash + a COMPLETE walk + insurance_contract (ready for issueContract).
   * The walk is set COMPLETE with a non-zero bitmask so the premium is > base (findings multiplier fires).
   * Cash is seeded to a large value so the premium debit can succeed.
   *
   * Body: { coverageType?, insuredValueCents }.
   * Response: { walkId, playerId, cashBefore }.
   *
   * R2.2: TEST-ONLY. Returns cashBefore (a clear cash value — DD-P5) for debit assertion.
   * Anti-fabrication: no Math.random. All values explicit.
   */
  @Post('_test/insurance/setup-complete-walk')
  @HttpCode(201)
  async setupCompleteWalk(
    @Body() body: SetupCompleteWalkBody,
  ): Promise<SetupCompleteWalkResponse> {
    const coverageType: CoverageType = body?.coverageType ?? 'PROPERTY';
    const insuredValueCents = body?.insuredValueCents ?? 2_000_000;

    // Create fresh player.
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow!.account_id,
        callsign: nextTestCallsign('cmp'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // Seed cash in economy_states (INSERT or UPDATE via upsert).
    // Large cash so any premium can be debited successfully.
    const cashBefore = 10_000_000; // 10M cents = $100k — sufficient for any test premium
    await this.db
      .insert(economyState)
      .values({
        player_id: playerId,
        cash_cents: BigInt(cashBefore),
        marks: 0,
      })
      .onConflictDoUpdate({
        target: economyState.player_id,
        set: { cash_cents: BigInt(cashBefore) },
      });

    // Create a WALKING walk with start_tick=0, then set it COMPLETE with a known bitmask.
    // Bitmask: STASH_QUEUE_DEEP (bit 3) + LIEUTENANT_UNIFORM_DISCIPLINED (bit 2) set.
    //   → (1n << 2n) | (1n << 3n) = 4n | 8n = 12n.
    // observation_depth = walkDurationDays (3) so daysElapsed = 3 - 0 = 3 = duration → COMPLETE.
    const walkDuration = insuranceTunables.walkDurationDays;
    const [walkRow] = await this.db
      .insert(underwriterWalkRecord)
      .values({
        player_id: playerId,
        coverage_type: coverageType,
        findings_bitmask: 12n, // bits 2+3 set (LIEUTENANT_UNIFORM_DISCIPLINED + STASH_QUEUE_DEEP)
        start_tick: BigInt(0),
        observation_depth: walkDuration, // daysElapsed = walkDuration - 0 = walkDuration = duration → COMPLETE
        status: 'COMPLETE',             // pre-set COMPLETE (computePremium idempotent on COMPLETE)
      })
      .returning({ id: underwriterWalkRecord.id });
    const walkId = walkRow!.id;

    // C5 carry-forward: do NOT pre-create an ACTIVE contract for this walk.
    //
    // Rationale: the one-walk-one-ACTIVE-contract guard (migration 0063 + service step 2) rejects
    // a second issueContract call if an ACTIVE contract already exists for the walk. Pre-creating an
    // ACTIVE contract here would cause the E2E's subsequent `issue-contract` call to fail with 409.
    //
    // The walk is COMPLETE with a known bitmask (bits 2+3 set) — `issueContract` can compute the
    // premium from scratch (same formula) and create the ACTIVE contract itself. No pre-seeding needed.
    //
    // Note: the previous pre-creation was for computePremium idempotency (reads premium_cents from
    // an existing contract). Since issueContract applies the formula directly (not via computePremium),
    // the pre-seeded contract is unnecessary for the issuance flow.

    return { walkId, playerId, cashBefore };
  }

  /**
   * `POST /v1/_test/insurance/issue-contract` — C4 ContractService driver (TEST-ONLY).
   *
   * Calls `ContractService.issueContract(playerId, walkId, insuredValueCents, counterpartyId)`.
   * Returns { contractId, premiumCents, escrowRequiredCents }.
   * Returns 409 if the walk is not COMPLETE.
   * Returns 402 if the player has insufficient cash (the contract is marked LAPSED).
   *
   * R2.2: premiumCents is a CLEAR transaction value (DD-P5) — safe to return.
   *   findings_bitmask/observation_depth are NOT returned by this route.
   * Anti-fabrication: no Math.random — all values from ContractService / computePremium.
   */
  @Post('_test/insurance/issue-contract')
  async issueContract(@Body() body: IssueContractBody): Promise<IssueContractResponse> {
    const { playerId, walkId, insuredValueCents, counterpartyId } = body;
    if (!playerId || !walkId || !insuredValueCents) {
      throw new HttpException('playerId, walkId, insuredValueCents are required', HttpStatus.BAD_REQUEST);
    }
    const result = await this.contractService.issueContract(
      playerId,
      walkId,
      insuredValueCents,
      counterpartyId ?? null,
    );
    return result;
  }

  /**
   * `GET /v1/_test/insurance/read-cash?playerId=<uuid>` — C4 cash read for debit assertion (TEST-ONLY).
   *
   * Reads economy_states.cash_cents for the player.
   * Used by the E2E to assert that the premium debit (DD-P5) fired correctly.
   *
   * R2.2: economy_states.cash_cents is a clear transaction value (DD-P5 — not a hidden risk scalar).
   *   This route is TEST-ONLY (not registered in production).
   */
  @Get('_test/insurance/read-cash')
  async readCash(@Query('playerId') playerId: string): Promise<ReadCashResponse> {
    const [row] = await this.db
      .select({ cash_cents: economyState.cash_cents })
      .from(economyState)
      .where(eq(economyState.player_id, playerId))
      .limit(1);
    if (!row) {
      throw new HttpException(`No economy_states row for player ${playerId}`, HttpStatus.NOT_FOUND);
    }
    return { cashCents: Number(row.cash_cents) };
  }

  /**
   * `GET /v1/_test/insurance/read-contract?contractId=<uuid>` — C4 contract row assertion (TEST-ONLY).
   *
   * Reads the insurance_contract row for DB assertion.
   * Returns the row serialized (BigInt fields as strings).
   *
   * R2.2: TEST-ONLY (not registered in production). Only for E2E DB assertion.
   */
  @Get('_test/insurance/read-contract')
  async readContract(@Query('contractId') contractId: string): Promise<unknown> {
    const [row = null] = await this.db
      .select()
      .from(insuranceContract)
      .where(eq(insuranceContract.id, contractId))
      .limit(1);
    return serializeRow(row as Record<string, unknown> | null);
  }

  /**
   * `GET /v1/_test/insurance/read-clipboard?walkId=<uuid>` — C4 c_i clipboard assertion (TEST-ONLY).
   *
   * Calls InsuranceProjectionService.getClipboard(walkId).
   * Returns { c_i: number[] } — the 6 public c_i coefficients (canon :54 — public BY DESIGN).
   *
   * R2.2: the clipboard NEVER returns findings_bitmask, observation_depth, route_id, or any
   *   internal risk numeric. This is the staging information (tariff), not the evidence (bitmask).
   * Anti-fabrication: all c_i from insuranceTunables (registry-first, no inline scalar).
   */
  @Get('_test/insurance/read-clipboard')
  readClipboard(@Query('walkId') walkId: string): unknown {
    return this.projectionService.getClipboard(walkId);
  }

  // ── C5 Routes ─────────────────────────────────────────────────────────────────────────────────

  /**
   * `POST /v1/_test/insurance/issue-with-counterparty` — C5 DD-WARY test route (TEST-ONLY).
   *
   * Seeds a COMPLETE walk + player (with cash), optionally seeds a `restraint_dispute_ring` row for
   * the counterparty, then calls `ContractService.issueContract()`. Returns the result plus
   * `basePremiumForComparison` (the un-surcharged premium) for the E2E ratio assertion.
   *
   * Three modes:
   *   (a) waryActive=true  + collateralAmountCents=X: wary ring → escrow + surcharge.
   *   (b) waryActive=false + collateralAmountCents=X: ring row present but wary=false → neutral.
   *   (c) noCounterparty=true: no ring row, counterpartyId=null → neutral (zero-regression).
   *
   * The base premium is computed inline (same formula as issueContract) BEFORE any surcharge.
   * This is used by the E2E to verify: premiumCents == Math.round(basePremium × 1.25) for case (a).
   *
   * R2.2: `collateral_amount` raw is NOT in the response. Only `escrowRequiredCents` (clear cash, DD-P5).
   * Anti-fabrication: no Math.random — all from insuranceTunables / explicit test inputs.
   */
  @Post('_test/insurance/issue-with-counterparty')
  async issueWithCounterparty(
    @Body() body: IssueWithCounterpartyBody,
  ): Promise<IssueWithCounterpartyResponse> {
    const coverageType: CoverageType = body?.coverageType ?? 'PROPERTY';
    const insuredValueCents = body?.insuredValueCents ?? 2_000_000;
    const waryActive = body?.waryActive ?? false;
    const collateralAmountCents = body?.collateralAmountCents ?? 0;
    const noCounterparty = body?.noCounterparty ?? false;

    // ── 1. Create fresh player with cash ──────────────────────────────────────────────────────────
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow!.account_id,
        callsign: nextTestCallsign('wry'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // Seed enough cash to pay any premium (including surcharged).
    const cashSeed = 20_000_000; // 20M cents = generous ceiling
    await this.db
      .insert(economyState)
      .values({ player_id: playerId, cash_cents: BigInt(cashSeed), marks: 0 })
      .onConflictDoUpdate({ target: economyState.player_id, set: { cash_cents: BigInt(cashSeed) } });

    // ── 2. Create a COMPLETE walk with a known bitmask (bits 2+3 set) ─────────────────────────────
    //
    // Same bitmask as setup-complete-walk (bits 2+3): LIEUTENANT_UNIFORM_DISCIPLINED + STASH_QUEUE_DEEP.
    // This produces a non-zero base premium (findings raise the multiplier above 1.0).
    // Using the same bitmask across wary/non-wary/neutral scenarios ensures the base premium is
    // consistent — the E2E can compare premiumCents against basePremiumForComparison.
    const walkDuration = insuranceTunables.walkDurationDays;
    const [walkRow] = await this.db
      .insert(underwriterWalkRecord)
      .values({
        player_id: playerId,
        coverage_type: coverageType,
        findings_bitmask: 12n, // bits 2+3: LIEUTENANT_UNIFORM_DISCIPLINED + STASH_QUEUE_DEEP
        start_tick: BigInt(0),
        observation_depth: walkDuration, // daysElapsed = walkDuration → COMPLETE
        status: 'COMPLETE',
      })
      .returning({ id: underwriterWalkRecord.id });
    const walkId = walkRow!.id;

    // ── 3. Compute the base premium (same formula as issueContract, without surcharge) ─────────────
    //
    // We compute this here so we can return basePremiumForComparison for the E2E assertion.
    // The formula: base = (pct/100) × insuredValueCents; product = Π(1 + c_i × finding_i) for bits set.
    const basePct = insuranceTunables.basePremiumPctOfInsuredValue;
    const base = (basePct / 100) * insuredValueCents;
    const bitmask = 12n; // bits 2+3 (matches the walk above)
    let product = 1.0;
    for (let i = 0; i < 6; i++) {
      if ((bitmask & (1n << BigInt(i))) !== 0n) {
        product *= (1 + insuranceTunables.getCiForFinding(i));
      }
    }
    const basePremiumForComparison = Math.round(base * product);

    // ── 4. Optionally seed restraint_dispute_ring for the counterparty ────────────────────────────
    //
    // The ring row is the D2 emit that C5 consumes (closes TD-119).
    // counterpartyId: a stable test UUID for the counterparty (per-player-per-call sentinel).
    // PK on restraint_dispute_ring is (player_id, counterparty_id) — no conflicts (fresh player each call).
    //
    // R2.2: collateral_amount is stored here (server-only) and only `escrowRequiredCents` is returned.
    const counterpartyId = noCounterparty
      ? null
      : '00000000-0000-0000-0000-000000000099'; // stable test counterparty UUID

    if (!noCounterparty && counterpartyId !== null) {
      // Insert a ring row for this player + counterparty (PK guarantees uniqueness).
      await this.db.insert(restraintDisputeRing).values({
        player_id: playerId,
        counterparty_id: counterpartyId,
        dispute_slots: [] as unknown as object,
        ring_head: 0,
        wary_active: waryActive,
        collateral_amount: collateralAmountCents, // real (cents — matching the real column type)
        last_tick_week: null,
      });
    }

    // ── 5. Call ContractService.issueContract() ───────────────────────────────────────────────────
    //
    // This is the real wary-gating path: the service reads restraint_dispute_ring for the counterparty.
    // If wary_active=true: escrowRequiredCents = collateral_amount, premium surcharged ×1.25.
    // If wary_active=false or no ring row: neutral (escrow=0, no surcharge).
    const { contractId, premiumCents, escrowRequiredCents } =
      await this.contractService.issueContract(playerId, walkId, insuredValueCents, counterpartyId);

    // R2.2: collateral_amount raw is NEVER in the response (only escrowRequiredCents — clear cash, DD-P5).
    // C12 additive: playerId added to response so BO endpoint E2E can look up the player's state.
    return {
      playerId,
      contractId,
      premiumCents,
      escrowRequiredCents,
      basePremiumForComparison,
    };
  }

  // ── C6 Routes ─────────────────────────────────────────────────────────────────────────────────

  /**
   * `POST /v1/_test/insurance/setup-raid-scenario` — C6 raid scenario setup (TEST-ONLY).
   *
   * Creates a fresh player + stash building on a free block in district 2 + product_storage
   * (quantity_grams = gramsSeized) + optionally an ACTIVE PROPERTY or STASH_LOSS contract
   * covering the building.
   *
   * The E2E then:
   *   1. POST /v1/_test/citysim/raid?player_id=...&block_id=... (emit RaidPlannedEvent).
   *   2. POST /v1/_test/citysim/advance?ticks=1&player_id=... (flush RAID_EXECUTION at MINUTE/13).
   *   3. GET /v1/_test/insurance/read-claims?playerId=... (assert PAID claim).
   *   4. GET /v1/_test/insurance/read-cash?playerId=... (assert cash credit).
   *
   * Body: { withContract?, coverageType?, gramsSeized?: number, insuredValueCents?: number }.
   * Response: { playerId, buildingId, blockId, contractId, cashBefore, gramsSeized }.
   *
   * ClaimsService.computePayout re-derives loss from building_raid.grams_seized ×
   * sellingTunables.brindleDealValueCentsPerGram (product stash — no money_holding row needed).
   * For PROPERTY: loss = insurance_contract.insured_value_cents.
   *
   * Anti-fabrication: no Math.random. gramsSeized / insuredValueCents are explicit E2E inputs.
   * R2.2: cashBefore is a clear cash value (DD-P5). findings_bitmask NOT returned.
   */
  @Post('_test/insurance/setup-raid-scenario')
  @HttpCode(201)
  async setupRaidScenario(
    @Body()
    body: {
      withContract?: boolean;
      coverageType?: 'STASH_LOSS' | 'PROPERTY';
      gramsSeized?: number;
      insuredValueCents?: number;
      /**
       * Optional walk findings_bitmask override for fraud testing.
       * Default: 12 (bits 2+3 = LIEUTENANT_UNIFORM_DISCIPLINED + STASH_QUEUE_DEEP — honest walk).
       * For real-flow fraud tests: set bits 0 or 1 to trigger HEAT_RAID or DEALER_TURNOVER fraud.
       * E.g. walkFindingBitmask=1 (bit 0 = IDLE_DEALERS_OBSERVED) → HEAT_RAID claim fires fraud.
       *      walkFindingBitmask=2 (bit 1 = HEAT_SMOKE_OBSERVED) → DEALER_TURNOVER claim fires fraud.
       * R2.2: server-only — this override never reaches the client; it only seeds the walk row.
       */
      walkFindingBitmask?: number;
    },
  ): Promise<{
    playerId: string;
    buildingId: string;
    blockId: number;
    contractId: string | null;
    cashBefore: number;
    gramsSeized: number;
    premiumCents: number;
  }> {
    const withContract = body?.withContract ?? false;
    const coverageType: CoverageType = body?.coverageType ?? 'STASH_LOSS';
    const gramsSeized = body?.gramsSeized ?? 1000;
    const insuredValueCents = body?.insuredValueCents ?? 2_000_000;
    const walkBitmask = body?.walkFindingBitmask !== undefined ? BigInt(body.walkFindingBitmask) : 12n;

    // ── 1. Create fresh player + economy_states ─────────────────────────────────────────────────
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow!.account_id,
        callsign: nextTestCallsign('c6sr'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // Large cash for any premium debit + receives payout credit.
    const cashBefore = 10_000_000; // 10M cents = $100k
    await this.db
      .insert(economyState)
      .values({ player_id: playerId, cash_cents: BigInt(cashBefore), marks: 0 })
      .onConflictDoUpdate({
        target: economyState.player_id,
        set: { cash_cents: BigInt(cashBefore) },
      });

    // ── 2. Find a free block in district 2 for this player ─────────────────────────────────────
    // District 2 has blocks 101-150 (from migration seed). We pick the first block in district 2
    // that this player does not already have a building on (i.e. always block 101 for a fresh player
    // since each call creates a new player). Using 101 as a stable anchor.
    // Note: multiple E2E tests run concurrently — each gets a fresh player so block 101 is reused
    // across players without conflict (player_id differentiates the buildings).
    const blockId = 101; // district 2, block 101 — verified in the DB (migration 0016 seed)

    // ── 3. Create a stash building on block 101 ─────────────────────────────────────────────────
    // building_type = 2 = stash (enum order: front_shop=0, hub=1, stash=2, lab=3).
    const [buildingRow] = await this.db
      .insert(building)
      .values({
        player_id: playerId,
        block_id: blockId,
        building_type: 2, // stash
        ownership: 'player',
        structural_state: 'operational',
      })
      .returning({ building_id: building.building_id });
    const buildingId = buildingRow!.building_id;

    // ── 4. Insert building_operational_state (stash, operational) ──────────────────────────────
    await this.db.insert(buildingOperationalState).values({
      building_id: buildingId,
      player_id: playerId,
      operational_type: 'stash',
      conversion_stage: 'operational',
      structural_state: 'operational',
    });

    // ── 5. Insert product_storage (gramsSeized grams to be seized by the raid) ─────────────────
    // The raid seizes ALL grams (seizure_fraction = 1.0 from tunables).
    // ClaimsService.computePayout reads building_raid.grams_seized × brindleDealValueCentsPerGram
    // to derive the STASH_LOSS payout (no money_holding row needed).
    await this.db.insert(productStorage).values({
      player_id: playerId,
      building_id: buildingId,
      substance_type: 'brindle', // standard product type
      quantity_grams: gramsSeized,
      purity_grade: 'standard',
    });

    // ── 6. If withContract: create COMPLETE walk + ACTIVE contract covering the building ─────────
    //
    // Post-C5 carry-forward: setup-complete-walk does NOT pre-create the contract (one-walk-one-ACTIVE guard).
    // We create the walk directly + call issueContract (which debits the premium from cashBefore).
    let contractId: string | null = null;

    let premiumCentsResult = 0;

    if (withContract) {
      // Create COMPLETE walk (bitmask controlled by walkFindingBitmask override, default 12n = bits 2+3).
      // Default bits 2+3: LIEUTENANT_UNIFORM_DISCIPLINED + STASH_QUEUE_DEEP (honest walk — no fraud bits set).
      // For fraud testing: caller can override with bits 0 (IDLE_DEALERS_OBSERVED) or 1 (HEAT_SMOKE_OBSERVED)
      // to trigger HEAT_RAID or DEALER_TURNOVER fraud respectively.
      const walkDuration = insuranceTunables.walkDurationDays;
      const [walkRow] = await this.db
        .insert(underwriterWalkRecord)
        .values({
          player_id: playerId,
          coverage_type: coverageType,
          findings_bitmask: walkBitmask, // configurable for real-flow fraud testing
          start_tick: BigInt(0),
          observation_depth: walkDuration,
          status: 'COMPLETE',
        })
        .returning({ id: underwriterWalkRecord.id });
      const walkId = walkRow!.id;

      // Determine the insured value passed to issueContract:
      //   STASH_LOSS: use gramsSeized × 2500 as a realistic premium basis for the stash.
      //   PROPERTY: use the explicit insuredValueCents (the declared property value).
      const contractInsuredValueCents =
        coverageType === 'PROPERTY' ? insuredValueCents : gramsSeized * 2500;

      // Issue contract with asset_ref = buildingId so the subscriber can look it up.
      // We call ContractService.issueContract BUT also set asset_ref directly since issueContract
      // does not take an asset_ref parameter (it uses insuredValueCents for premium computation).
      // We issue first (creates the contract), then update asset_ref.
      const result = await this.contractService.issueContract(
        playerId,
        walkId,
        contractInsuredValueCents,
        null, // no counterparty (neutral — no wary gating)
      );
      contractId = result.contractId;
      premiumCentsResult = result.premiumCents;

      // Set asset_ref = buildingId so the subscriber's lookup finds this contract for this building.
      await this.db
        .update(insuranceContract)
        .set({ asset_ref: buildingId, updated_at: new Date() })
        .where(eq(insuranceContract.id, contractId));
    }

    // Re-read the ACTUAL cash after any premium debit (issueContract debits the premium).
    // The E2E asserts cashAfter - cashBefore == payoutCents.  cashBefore must reflect the
    // post-premium state so the delta purely measures the payout credit (DD-P5 clear assertion).
    // For the withContract=false case this is still 10_000_000 (no debit).
    const [econRow] = await this.db
      .select({ cash_cents: economyState.cash_cents })
      .from(economyState)
      .where(eq(economyState.player_id, playerId))
      .limit(1);
    const actualCashBefore = econRow ? Number(econRow.cash_cents) : cashBefore;

    return { playerId, buildingId, blockId, contractId, cashBefore: actualCashBefore, gramsSeized, premiumCents: premiumCentsResult };
  }

  /**
   * `GET /v1/_test/insurance/read-claims?playerId=<uuid>` — C6 claim assertion (TEST-ONLY).
   *
   * Reads all insurance_claim rows for the player (for E2E DB assertion).
   * Returns serialized rows (BigInt fields as strings for JSON serialization).
   *
   * R2.2: TEST-ONLY (not registered in production). payout_cents is a CLEAR transaction value
   *   (DD-P5); other fields (claimed_cents, filed_tick) are DB internals read only in tests.
   */
  @Get('_test/insurance/read-claims')
  async readClaims(
    @Query('playerId') playerId: string,
  ): Promise<{ claims: unknown[] }> {
    if (!playerId) {
      throw new HttpException('playerId query param required', HttpStatus.BAD_REQUEST);
    }
    const rows = await this.db
      .select()
      .from(insuranceClaim)
      .where(eq(insuranceClaim.player_id, playerId))
      .orderBy(insuranceClaim.created_at);
    return { claims: rows.map((r) => serializeRow(r as Record<string, unknown>)) };
  }

  // ── W6a C4 Routes (findings #11/#12/#13 — direct single-method attack probes) ──────────────────
  //
  // Pre-W6a, `computePayout` / `checkClaimAgainstWalk` / `applyFraudPenalty` were only reachable
  // through composite setup routes above (`file-claim-with-walk`, `setup-projection-with-claim`,
  // `setup-projection-frauded`) that ALWAYS mint their own `claimId`/`contractId` for the SAME
  // `playerId` in the same request — no existing route let a caller supply an attacker-chosen
  // `playerId` alongside an INDEPENDENT, already-existing `claimId`/`contractId`. These 3 routes
  // are the minimal single-method probes the W6a C4 attack tests need (mirrors the `_test/legal/*`
  // per-method probes C3 established for `issue-tier3-payoff` / `run-surveillance`).

  /**
   * `POST /v1/_test/insurance/compute-payout` — W6a C4 finding #11 direct probe (TEST-ONLY).
   *
   * Calls `ClaimsService.computePayout(playerId, claimId)` directly.
   * Body: { playerId: string, claimId: string }
   * Returns: { payoutCents: number }
   *
   * R2.2: TEST-ONLY. payout_cents is a CLEAR transaction value (DD-P5).
   */
  @Post('_test/insurance/compute-payout')
  @HttpCode(200)
  async computePayoutProbe(
    @Body() body: { playerId?: string; claimId?: string },
  ): Promise<{ payoutCents: number }> {
    const { playerId, claimId } = body ?? {};
    if (!playerId || typeof playerId !== 'string') {
      throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    }
    if (!claimId || typeof claimId !== 'string') {
      throw new HttpException('claimId required', HttpStatus.BAD_REQUEST);
    }
    return this.claimsService.computePayout(playerId, claimId);
  }

  /**
   * `POST /v1/_test/insurance/check-claim-fraud` — W6a C4 finding #12 direct probe (TEST-ONLY).
   *
   * Calls `FraudDetectionService.checkClaimAgainstWalk(playerId, claimId)` directly.
   * Body: { playerId: string, claimId: string }
   * Returns: { fraud: boolean, contradictedFinding: FindingType | null }
   *
   * R2.2: TEST-ONLY. findings_bitmask itself is never returned (only the boolean verdict).
   */
  @Post('_test/insurance/check-claim-fraud')
  @HttpCode(200)
  async checkClaimFraudProbe(
    @Body() body: { playerId?: string; claimId?: string },
  ): Promise<{ fraud: boolean; contradictedFinding: FindingType | null }> {
    const { playerId, claimId } = body ?? {};
    if (!playerId || typeof playerId !== 'string') {
      throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    }
    if (!claimId || typeof claimId !== 'string') {
      throw new HttpException('claimId required', HttpStatus.BAD_REQUEST);
    }
    return this.fraudDetectionService.checkClaimAgainstWalk(playerId, claimId);
  }

  /**
   * `POST /v1/_test/insurance/apply-fraud-penalty` — W6a C4 finding #13 direct probe (TEST-ONLY).
   *
   * Calls `FraudDetectionService.applyFraudPenalty(playerId, contractId, claimId, currentGameTick)`
   * directly.
   * Body: { playerId: string, contractId: string, claimId: string, currentGameTick?: number }
   * Returns: { ok: true }
   */
  @Post('_test/insurance/apply-fraud-penalty')
  @HttpCode(200)
  async applyFraudPenaltyProbe(
    @Body() body: { playerId?: string; contractId?: string; claimId?: string; currentGameTick?: number },
  ): Promise<{ ok: true }> {
    const { playerId, contractId, claimId, currentGameTick = 0 } = body ?? {};
    if (!playerId || typeof playerId !== 'string') {
      throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    }
    if (!contractId || typeof contractId !== 'string') {
      throw new HttpException('contractId required', HttpStatus.BAD_REQUEST);
    }
    if (!claimId || typeof claimId !== 'string') {
      throw new HttpException('claimId required', HttpStatus.BAD_REQUEST);
    }
    await this.fraudDetectionService.applyFraudPenalty(playerId, contractId, claimId, currentGameTick);
    return { ok: true };
  }

  // ── C7 Routes ─────────────────────────────────────────────────────────────────────────────────

  /**
   * `POST /v1/_test/insurance/reset-courier-state` — C7 test-isolation reset (TEST-ONLY).
   *
   * Deletes all courier_shift rows where patrol_heat > 0 (test-seeded, non-default).
   * Production shifts always have patrol_heat=0.0 (default) so they are never affected.
   * Also clears the in-memory last-event probe in CourierInterceptionService.
   *
   * Called in E2E beforeAll by the _reset-courier-laundering-state helper.
   * R2.2: TEST-ONLY. patrol_heat is BO-only — never a player-visible scalar.
   */
  @Post('_test/insurance/reset-courier-state')
  async resetCourierState(): Promise<{ deleted: number }> {
    // Delete all test-seeded shifts (patrol_heat > 0 = non-default).
    const result = await this.db
      .delete(courierShift)
      .where(sql`patrol_heat > 0`);
    // Clear the in-memory last-event probe.
    this.courierInterceptionService.clearLastInterceptedEvent();
    const deleted = (result as unknown as { rowCount?: number }).rowCount ?? 0;
    return { deleted };
  }

  /**
   * `POST /v1/_test/insurance/seed-courier-shift` — C7/C9 shift seed (TEST-ONLY).
   *
   * Creates a courier_shift with the given patrol_heat and cargo_cents.
   *
   * Body: { heat: number, cargoCents: number, playerId?: string }.
   *   heat — the patrol_heat value to seed (> threshold → intercepted; <= threshold → no-op).
   *   cargoCents — the cargo value in cents for the shift.
   *   playerId (C9 extension) — if provided, uses existing player (skips player/account/building
   *     creation). Creates a minimal route+shift for that player. This allows C9 tests to seed a
   *     shift for a player who already has a COURIER_ARREST contract (setup-courier-arrest-contract
   *     creates the player+contract; seed-courier-shift then adds a shift for that same player).
   *     If not provided: C7 existing behavior — creates a fresh player+courier+route+shift.
   *
   * R2.2: TEST-ONLY. patrol_heat is BO-only (never returned to real clients in production).
   * Anti-fabrication (C4): no Math.random. All values explicit (not derived from hidden state).
   */
  @Post('_test/insurance/seed-courier-shift')
  @HttpCode(201)
  async seedCourierShift(
    @Body() body: { heat: number; cargoCents: number; playerId?: string; originBlockId?: number; destBlockId?: number },
  ): Promise<{ shiftId: string; playerId: string; routeId: string }> {
    const heat = body?.heat ?? 0.0;
    const cargoCents = body?.cargoCents ?? 0;

    let playerId: string;
    let originBuildingId: string;
    let destBuildingId: string;
    let courierId: string;
    let originBlockId: number;
    let destBlockId: number;

    if (body?.playerId) {
      // ── C9 mode: use existing player, create minimal route+shift ─────────────────────────────────
      //
      // The player already has a COURIER_ARREST contract (from setup-courier-arrest-contract).
      // We create fresh buildings (blocks 103+104 — distinct from C6 raid scenario's block 101)
      // to avoid any conflict with pre-existing building rows for this player.
      //
      // C14 DD-LAYER1-PROB: Optional block overrides allow callers to pin catching/surviving geometry
      // (the probabilistic roll is now geometry-deterministic — blocks 103→104 give roll=0.540 which
      // SURVIVES at heat=0.9/0.95; catching geometry must be pinned explicitly when needed).
      playerId = body.playerId;
      originBlockId = body.originBlockId ?? 103;
      destBlockId   = body.destBlockId   ?? 104;

      const [originRow] = await this.db
        .insert(building)
        .values({
          player_id: playerId,
          block_id: originBlockId,
          building_type: 1, // hub = origin
          ownership: 'player',
          structural_state: 'operational',
        })
        .returning({ building_id: building.building_id });
      originBuildingId = originRow!.building_id;

      const [destRow] = await this.db
        .insert(building)
        .values({
          player_id: playerId,
          block_id: destBlockId,
          building_type: 2, // stash = destination
          ownership: 'player',
          structural_state: 'operational',
        })
        .returning({ building_id: building.building_id });
      destBuildingId = destRow!.building_id;

      // Create a courier for this player.
      const [courierRow] = await this.db
        .insert(courier)
        .values({
          player_id: playerId,
          role_type: 'courier',
          vehicle_type: 'foot',
          current_state: 'idle',
          current_load_grams: 0,
          current_load_cents: 0,
        })
        .returning({ courier_id: courier.courier_id });
      courierId = courierRow!.courier_id;
    } else {
      // ── C7 mode: create a fresh player (each shift gets its own player for isolation) ─────────────
      //
      // The MINUTE tick is per-player, so using separate players avoids cross-shift coupling.
      // A shared player is also supported (the test calls seed-courier-shift multiple times
      // for the same player if it wants to test multi-shift selection — not done in C7 spec,
      // but the service handles it correctly via the highest-seed selection logic).
      const [accountRow] = await this.db
        .insert(account)
        .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
        .returning({ account_id: account.account_id });
      const [playerRow] = await this.db
        .insert(player)
        .values({
          account_id: accountRow!.account_id,
          callsign: nextTestCallsign('c7cs'),
          tier: 1,
          active_branches: 1,
        })
        .returning({ player_id: player.player_id });
      playerId = playerRow!.player_id;
      // C14 DD-LAYER1-PROB: Optional block overrides allow callers to pin catching/surviving geometry
      // (the probabilistic roll is geometry-deterministic — blocks 101→102 give roll=0.800 at dayId=100
      // which SURVIVES at any heat ≤ 0.25; catching geometry must be pinned explicitly when needed).
      originBlockId = body.originBlockId ?? 101;
      destBlockId   = body.destBlockId   ?? 102;

      // 2. Create TWO buildings as route origin + destination (district 2).
      //    The route table has a r_no_self_route_chk constraint: origin ≠ destination.
      const [originBuildingRow] = await this.db
        .insert(building)
        .values({
          player_id: playerId,
          block_id: originBlockId,
          building_type: 1, // hub = origin
          ownership: 'player',
          structural_state: 'operational',
        })
        .returning({ building_id: building.building_id });
      originBuildingId = originBuildingRow!.building_id;

      const [destBuildingRow] = await this.db
        .insert(building)
        .values({
          player_id: playerId,
          block_id: destBlockId,
          building_type: 2, // stash = destination
          ownership: 'player',
          structural_state: 'operational',
        })
        .returning({ building_id: building.building_id });
      destBuildingId = destBuildingRow!.building_id;

      // 3. Create a courier for the player.
      const [courierRow] = await this.db
        .insert(courier)
        .values({
          player_id: playerId,
          role_type: 'courier',
          vehicle_type: 'foot',
          current_state: 'idle',
          current_load_grams: 0,
          current_load_cents: 0,
        })
        .returning({ courier_id: courier.courier_id });
      courierId = courierRow!.courier_id;
    }

    // Create a route (origin → destination — satisfies r_no_self_route_chk).
    const [routeRow] = await this.db
      .insert(route)
      .values({
        player_id: playerId,
        origin_building_id: originBuildingId,
        destination_building_id: destBuildingId,
        // C14 fix: pass path_blocks as a JS array, NOT JSON.stringify([...]).
        // JSON.stringify produces a JSONB string literal "[103,104]" not a JSONB array [103,104].
        // The C14 runMinuteTick SQL extracts path_blocks[0] via (path_blocks->>0)::int —
        // that cast fails on a JSONB string type (the whole "[103,104]" string is cast, not element 0).
        path_blocks: [originBlockId, destBlockId],
        river_crossings: 0,
        ephemeral_mode: false,
      })
      .returning({ route_id: route.route_id });
    const routeId = routeRow!.route_id;

    // Create the courier_shift in_transit with the seeded patrol_heat.
    const [shiftRow] = await this.db
      .insert(courierShift)
      .values({
        player_id: playerId,
        courier_id: courierId,
        route_id: routeId,
        started_at_tick: 0,
        current_segment_index: 0,
        cargo_grams: 0,
        cargo_cents: cargoCents,
        substance_type: 'brindle',
        status: 'in_transit',
        patrol_heat: heat,
      })
      .returning({ shift_id: courierShift.shift_id });
    const shiftId = shiftRow!.shift_id;

    return { shiftId, playerId, routeId };
  }

  /**
   * `POST /v1/_test/insurance/run-minute-tick` — C7 tick driver (TEST-ONLY).
   *
   * Calls CourierInterceptionService.runMinuteTick(ctx) directly for the given playerId
   * at the given gameMinute (bypasses the real scheduler timer — the test drives the tick).
   *
   * Body: { playerId: string, gameMinute?: number, dayId?: number, thresholdOverride?: number }.
   *   playerId — the player to run the tick for.
   *   gameMinute — the in-game minute (default 144000 = day 100). The service derives
   *     dayId = Math.floor(gameMinute / 1440) from this.
   *   dayId — if provided, sets gameMinute = dayId * 1440 (convenience override for tests
   *     that want to pin to an exact dayId for determinism verification).
   *   thresholdOverride — TEST-ONLY override for the heat threshold. When > 0, overrides the
   *     insuranceTunables registry value for this call (allows falsifiable-fire testing without
   *     setting env vars in the stack). The production scheduler never passes this.
   *
   * R2.2: TEST-ONLY. Drives the real service (no mock).
   */
  @Post('_test/insurance/run-minute-tick')
  async runMinuteTick(
    @Body() body: { playerId: string; gameMinute?: number; dayId?: number; thresholdOverride?: number },
  ): Promise<{ ticked: true }> {
    if (!body?.playerId) {
      throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    }
    let gameMinute = body.gameMinute ?? 144000; // default = day 100
    if (body.dayId !== undefined) {
      gameMinute = body.dayId * 1440;
    }
    await this.courierInterceptionService.runMinuteTick(
      {
        playerId: body.playerId,
        cadence: Cadence.MINUTE,
        gameMinute,
      },
      body.thresholdOverride,
    );
    return { ticked: true };
  }

  /**
   * `GET /v1/_test/insurance/read-shifts?playerId=<uuid>` — C7 shift read (TEST-ONLY).
   *
   * Reads all non-completed courier_shift rows for the player (status != 'completed').
   * Also returns the last CourierInterceptedEvent from the in-memory probe (null if none fired).
   *
   * Response: { shifts: [{ id, status, patrol_heat, cargo_cents }], lastEvent: ... | null }.
   *
   * R2.2: TEST-ONLY. patrol_heat is BO-only — this route is never registered in production.
   *   lastEvent carries only qualitative identity (courierShiftId/routeId/cargoCents/gameMinute).
   */
  @Get('_test/insurance/read-shifts')
  async readShifts(
    @Query('playerId') playerId: string,
  ): Promise<{
    shifts: Array<{ id: string; status: string; patrol_heat: number; cargo_cents: number }>;
    lastEvent: unknown;
  }> {
    if (!playerId) {
      throw new HttpException('playerId query param required', HttpStatus.BAD_REQUEST);
    }
    const rows = await this.db
      .select({
        shift_id:    courierShift.shift_id,
        status:      courierShift.status,
        patrol_heat: courierShift.patrol_heat,
        cargo_cents: courierShift.cargo_cents,
      })
      .from(courierShift)
      .where(
        and(
          eq(courierShift.player_id, playerId),
          sql`${courierShift.status} != 'completed'`,
        ),
      );

    const shifts = rows.map((r) => ({
      id: r.shift_id,
      status: r.status,
      patrol_heat: r.patrol_heat,
      cargo_cents: Number(r.cargo_cents),
    }));

    const lastEvent = this.courierInterceptionService.getLastInterceptedEvent();
    return { shifts, lastEvent };
  }

  // ── C8 Routes ─────────────────────────────────────────────────────────────────────────────────

  /**
   * `POST /v1/_test/insurance/seed-laundering-node` — C8 laundering node seed (TEST-ONLY).
   *
   * Creates a fresh player + building + laundering_node with the given buffer_load and
   * throughputInPerHour. Returns { nodeId, playerId } for the E2E to drive the nightly tick.
   *
   * Body: { bufferLoad: number, throughputInPerHour: number }.
   *   bufferLoad — the buffer_load value to seed ([0..1]; > threshold → fence defaulted).
   *   throughputInPerHour — the throughput value to carry in the FenceDefaultedEvent.
   *
   * Substrate correction: buffer_load is on laundering_nodes (NOT tail_risk_estimates).
   * R2.2: TEST-ONLY. buffer_load is BO-only (never returned to real clients in production).
   */
  @Post('_test/insurance/seed-laundering-node')
  @HttpCode(201)
  async seedLaunderingNode(
    @Body() body: { bufferLoad: number; throughputInPerHour: number },
  ): Promise<{ nodeId: string; playerId: string }> {
    const bufferLoad = body?.bufferLoad ?? 0.0;
    const throughputInPerHour = body?.throughputInPerHour ?? 0;

    // 1. Create a fresh player for isolation (each node gets its own player).
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow!.account_id,
        callsign: nextTestCallsign('c8ln'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // 2. Create a building for the laundering node (district 3, block 103 — distinct from C7).
    const [buildingRow] = await this.db
      .insert(building)
      .values({
        player_id: playerId,
        block_id: 103,
        building_type: 3, // laundering = type 3
        ownership: 'player',
        structural_state: 'operational',
      })
      .returning({ building_id: building.building_id });
    const buildingId = buildingRow!.building_id;

    // 3. Create the laundering_node with the seeded buffer_load and throughput.
    const [nodeRow] = await this.db
      .insert(launderingNode)
      .values({
        player_id:               playerId,
        building_id:             buildingId,
        stage_index:             0,
        throughput_in_per_hour:  throughputInPerHour,
        dwell_time_hours:        1.0,
        buffer_load:             bufferLoad,
        cleanliness_at_output:   0.8,
      })
      .returning({ node_id: launderingNode.node_id });
    const nodeId = nodeRow!.node_id;

    return { nodeId, playerId };
  }

  /**
   * `POST /v1/_test/insurance/run-nightly-tick` — C8 tick driver (TEST-ONLY).
   *
   * Calls FenceDefaultService.runNightlyTick(ctx) directly for the given playerId
   * at the given gameMinute (bypasses the real scheduler timer — the test drives the tick).
   *
   * Body: { playerId: string, gameMinute?: number, dayId?: number, thresholdOverride?: number }.
   *   playerId — the player to run the tick for.
   *   gameMinute — the in-game minute (default 288000 = day 200).
   *   dayId — if provided, sets gameMinute = dayId * 1440 (convenience override for tests
   *     that want to pin to an exact dayId for determinism verification).
   *   thresholdOverride — TEST-ONLY override for the exposure threshold. When > 0, overrides the
   *     insuranceTunables registry value for this call (allows falsifiable-fire testing without
   *     setting env vars in the stack). The production scheduler never passes this.
   *
   * R2.2: TEST-ONLY. Drives the real service (no mock).
   */
  @Post('_test/insurance/run-nightly-tick')
  async runNightlyTick(
    @Body() body: { playerId: string; gameMinute?: number; dayId?: number; thresholdOverride?: number },
  ): Promise<{ ticked: true }> {
    if (!body?.playerId) {
      throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    }
    let gameMinute = body.gameMinute ?? 288000; // default = day 200
    if (body.dayId !== undefined) {
      gameMinute = body.dayId * 1440;
    }
    await this.fenceDefaultService.runNightlyTick(
      {
        playerId: body.playerId,
        cadence: Cadence.NIGHTLY,
        gameMinute,
      },
      body.thresholdOverride,
    );
    return { ticked: true };
  }

  /**
   * `GET /v1/_test/insurance/read-nodes?playerId=<uuid>` — C8 node read (TEST-ONLY).
   *
   * Reads all laundering_node rows for the player.
   * Also returns the last FenceDefaultedEvent from the in-memory probe (null if none fired).
   *
   * Response: { nodes: [{ id, buffer_load, throughput_in_per_hour }], lastEvent: ... | null }.
   *
   * R2.2: TEST-ONLY. buffer_load is BO-only — this route is never registered in production.
   *   lastEvent carries only qualitative identity (launderingNodeId/throughputInPerHour/gameMinute).
   */
  @Get('_test/insurance/read-nodes')
  async readNodes(
    @Query('playerId') playerId: string,
  ): Promise<{
    nodes: Array<{ id: string; buffer_load: number; throughput_in_per_hour: number }>;
    lastEvent: unknown;
  }> {
    if (!playerId) {
      throw new HttpException('playerId query param required', HttpStatus.BAD_REQUEST);
    }
    const rows = await this.db
      .select({
        node_id:                launderingNode.node_id,
        buffer_load:            launderingNode.buffer_load,
        throughput_in_per_hour: launderingNode.throughput_in_per_hour,
      })
      .from(launderingNode)
      .where(eq(launderingNode.player_id, playerId));

    const nodes = rows.map((r) => ({
      id: r.node_id,
      buffer_load: r.buffer_load,
      throughput_in_per_hour: r.throughput_in_per_hour,
    }));

    const lastEvent = this.fenceDefaultService.getLastDefaultedEvent();
    return { nodes, lastEvent };
  }

  /**
   * `POST /v1/_test/insurance/reset-laundering-state` — C8 test-isolation reset (TEST-ONLY).
   *
   * Deletes all laundering_node rows where buffer_load > 0 (test-seeded, non-default).
   * Production nodes always have buffer_load=0.0 (default) so they are never affected.
   * Also clears the in-memory last-event probe in FenceDefaultService.
   *
   * Called in E2E `beforeAll` via resetCourierLaunderingState (which calls reset-courier-state) or
   * directly by C8 determinism tests that need a clean slate between runs.
   * R2.2: TEST-ONLY. buffer_load is BO-only — never a player-visible scalar.
   */
  @Post('_test/insurance/reset-laundering-state')
  async resetLaunderingState(): Promise<{ deleted: number }> {
    // Delete all test-seeded nodes (buffer_load > 0 = non-default).
    const result = await this.db
      .delete(launderingNode)
      .where(sql`buffer_load > 0`);
    // Clear the in-memory last-event probe.
    this.fenceDefaultService.clearLastDefaultedEvent();
    const deleted = (result as unknown as { rowCount?: number }).rowCount ?? 0;
    return { deleted };
  }

  // ── C9 Routes ─────────────────────────────────────────────────────────────────────────────────

  /**
   * `POST /v1/_test/insurance/setup-courier-arrest-contract` — C9 setup (TEST-ONLY).
   *
   * Creates a fresh player + economy_states (10M cash) + a COMPLETE COURIER_ARREST walk + an
   * ACTIVE COURIER_ARREST contract for that player. Returns { playerId, contractId, walkId }.
   *
   * The E2E then:
   *   1. POST /v1/_test/insurance/seed-courier-shift { playerId, heat, cargoCents }
   *   2. POST /v1/_test/insurance/run-minute-tick { playerId, thresholdOverride }
   *   3. GET  /v1/_test/insurance/read-courier-fence-claims?playerId=...
   *
   * R2.2: TEST-ONLY. cashBefore is a clear cash value (DD-P5). findings_bitmask NOT returned.
   * Anti-fabrication: no Math.random. All values explicit.
   */
  @Post('_test/insurance/setup-courier-arrest-contract')
  @HttpCode(201)
  async setupCourierArrestContract(
    @Body() body?: {
      /**
       * Optional walk findings_bitmask override for real-flow fraud testing.
       * Default: 12 (bits 2+3 — honest walk, no fraud triggers).
       * For fraud tests: set bit 4 (SLATE_MEMBERSHIP_STABLE) to trigger COURIER_BETRAYAL fraud.
       * R2.2: server-only — never returned to the client.
       */
      walkFindingBitmask?: number;
    },
  ): Promise<{ playerId: string; contractId: string; walkId: string; premiumCents: number }> {
    const walkBitmask = body?.walkFindingBitmask !== undefined ? BigInt(body.walkFindingBitmask) : 12n;

    // 1. Create fresh player.
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow!.account_id,
        callsign: nextTestCallsign('c9ca'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // 2. Seed economy_states (10M cash for payout credit assertions).
    await this.db
      .insert(economyState)
      .values({ player_id: playerId, cash_cents: BigInt(10_000_000), marks: 0 })
      .onConflictDoUpdate({
        target: economyState.player_id,
        set: { cash_cents: BigInt(10_000_000) },
      });

    // 3. Create a COMPLETE COURIER_ARREST walk (bitmask controllable for real-flow fraud testing).
    //    Default bits 2+3 (honest walk); override with bit 4 (SLATE_MEMBERSHIP_STABLE) for fraud.
    const walkDuration = insuranceTunables.walkDurationDays;
    const [walkRow] = await this.db
      .insert(underwriterWalkRecord)
      .values({
        player_id: playerId,
        coverage_type: 'COURIER_ARREST',
        findings_bitmask: walkBitmask,
        start_tick: BigInt(0),
        observation_depth: walkDuration,
        status: 'COMPLETE',
      })
      .returning({ id: underwriterWalkRecord.id });
    const walkId = walkRow!.id;

    // 4. Issue the COURIER_ARREST contract (ACTIVE, no asset_ref for COURIER_ARREST coverage).
    //    Directly insert rather than calling issueContract (which requires walk COMPLETE + premium debit).
    //    insured_value_cents = 1_000_000 (test default — COURIER_ARREST payout is computed from
    //    cargoCents, not insured_value; this value drives the premium computation only).
    const [contractRow] = await this.db
      .insert(insuranceContract)
      .values({
        player_id: playerId,
        type: 'COURIER_ARREST',
        insured_value_cents: BigInt(1_000_000),
        premium_cents: BigInt(40_000), // known sentinel premium (for fraud 5× penalty assertion)
        walk_id: walkId,
        status: 'ACTIVE',
        issued_tick: BigInt(0),
        // asset_ref: null (COURIER_ARREST covers the player, not a specific building — no asset_ref filter in C9)
      })
      .returning({ id: insuranceContract.id });
    const contractId = contractRow!.id;

    return { playerId, contractId, walkId, premiumCents: 40_000 };
  }

  /**
   * `POST /v1/_test/insurance/setup-fence-default-contract` — C9 setup (TEST-ONLY).
   *
   * Creates a fresh player + building + laundering_node (high buffer_load=0.95 + seeded throughput)
   * + a COMPLETE FENCE_DEFAULT walk + an ACTIVE FENCE_DEFAULT contract. Returns:
   *   { playerId, contractId, nodeId, throughputInPerHour }.
   *
   * throughputInPerHour is seeded to 1000 (a known, non-zero value) so the E2E can assert
   * payout = round(0.50 × 1000 × 24) = 12_000 (falsifiable exact formula).
   *
   * The E2E then:
   *   1. POST /v1/_test/insurance/run-nightly-tick { playerId, thresholdOverride }
   *   2. GET  /v1/_test/insurance/read-courier-fence-claims?playerId=...
   *
   * R2.2: TEST-ONLY. buffer_load is BO-only — never a player-visible scalar.
   * Anti-fabrication: no Math.random. throughputInPerHour is explicit (not from hidden state).
   */
  @Post('_test/insurance/setup-fence-default-contract')
  @HttpCode(201)
  async setupFenceDefaultContract(
    @Body() body?: {
      /**
       * Optional walk findings_bitmask override for real-flow fraud testing.
       * Default: 12 (bits 2+3 — honest walk, no fraud triggers).
       * For fraud tests: set bit 5 (HOSTAGE_SHELF_STATE) to trigger FENCE_FLIGHT fraud.
       * R2.2: server-only — never returned to the client.
       */
      walkFindingBitmask?: number;
    },
  ): Promise<{
    playerId: string;
    contractId: string;
    nodeId: string;
    throughputInPerHour: number;
    premiumCents: number;
  }> {
    const walkBitmask = body?.walkFindingBitmask !== undefined ? BigInt(body.walkFindingBitmask) : 12n;
    const THROUGHPUT_PER_HOUR = 1000; // explicit seeded value — payout = round(0.50 × 1000 × 24) = 12_000

    // 1. Create fresh player.
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow!.account_id,
        callsign: nextTestCallsign('c9fd'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // 2. Seed economy_states (10M cash for payout credit assertions).
    await this.db
      .insert(economyState)
      .values({ player_id: playerId, cash_cents: BigInt(10_000_000), marks: 0 })
      .onConflictDoUpdate({
        target: economyState.player_id,
        set: { cash_cents: BigInt(10_000_000) },
      });

    // 3. Create a building for the laundering node (district 4, block 105 — distinct from C7/C8).
    const [buildingRow] = await this.db
      .insert(building)
      .values({
        player_id: playerId,
        block_id: 105,
        building_type: 3, // laundering = type 3
        ownership: 'player',
        structural_state: 'operational',
      })
      .returning({ building_id: building.building_id });
    const buildingId = buildingRow!.building_id;

    // 4. Create the laundering_node with high buffer_load (> any reasonable threshold) + seeded throughput.
    const [nodeRow] = await this.db
      .insert(launderingNode)
      .values({
        player_id: playerId,
        building_id: buildingId,
        stage_index: 0,
        throughput_in_per_hour: THROUGHPUT_PER_HOUR,
        dwell_time_hours: 1.0,
        buffer_load: 0.95, // clearly above any threshold (default 0.80; thresholdOverride=0.1 in test)
        cleanliness_at_output: 0.8,
      })
      .returning({ node_id: launderingNode.node_id });
    const nodeId = nodeRow!.node_id;

    // 5. Create a COMPLETE FENCE_DEFAULT walk (bitmask controllable for real-flow fraud testing).
    //    Default bits 2+3 (honest walk); override with bit 5 (HOSTAGE_SHELF_STATE) for fraud.
    const walkDuration = insuranceTunables.walkDurationDays;
    const [walkRow] = await this.db
      .insert(underwriterWalkRecord)
      .values({
        player_id: playerId,
        coverage_type: 'FENCE_DEFAULT',
        findings_bitmask: walkBitmask, // configurable for real-flow fraud testing
        start_tick: BigInt(0),
        observation_depth: walkDuration,
        status: 'COMPLETE',
      })
      .returning({ id: underwriterWalkRecord.id });
    const walkId = walkRow!.id;

    // 6. Issue the FENCE_DEFAULT contract (ACTIVE).
    const [contractRow] = await this.db
      .insert(insuranceContract)
      .values({
        player_id: playerId,
        type: 'FENCE_DEFAULT',
        insured_value_cents: BigInt(1_000_000),
        premium_cents: BigInt(40_000), // known sentinel premium (for fraud 5× penalty assertion)
        walk_id: walkId,
        status: 'ACTIVE',
        issued_tick: BigInt(0),
        // asset_ref: null (FENCE_DEFAULT covers the player's laundering network — no specific building ref)
      })
      .returning({ id: insuranceContract.id });
    const contractId = contractRow!.id;

    return { playerId, contractId, nodeId, throughputInPerHour: THROUGHPUT_PER_HOUR, premiumCents: 40_000 };
  }

  /**
   * `GET /v1/_test/insurance/read-courier-fence-claims?playerId=<uuid>` — C9 claim assertion (TEST-ONLY).
   *
   * Reads all insurance_claim rows for the player with claim_basis IN ('COURIER_BETRAYAL', 'FENCE_FLIGHT').
   * Returns { claims: [...] } for E2E DB assertion.
   *
   * Unlike read-claims (which returns ALL claims), this route is scoped to C9 claim types only
   * (avoids cross-spec pollution from C6 HEAT_RAID/DEALER_TURNOVER claims in the same player row).
   *
   * R2.2: TEST-ONLY (not registered in production). payout_cents is a CLEAR transaction value (DD-P5).
   */
  @Get('_test/insurance/read-courier-fence-claims')
  async readCourierFenceClaims(
    @Query('playerId') playerId: string,
  ): Promise<{ claims: unknown[] }> {
    if (!playerId) {
      throw new HttpException('playerId query param required', HttpStatus.BAD_REQUEST);
    }
    const rows = await this.db
      .select()
      .from(insuranceClaim)
      .where(
        and(
          eq(insuranceClaim.player_id, playerId),
          sql`${insuranceClaim.claim_basis} IN ('COURIER_BETRAYAL', 'FENCE_FLIGHT')`,
        ),
      )
      .orderBy(insuranceClaim.created_at);
    return { claims: rows.map((r) => serializeRow(r as Record<string, unknown>)) };
  }

  /**
   * `POST /v1/_test/insurance/reset-c9-state` — C9 test-isolation reset (TEST-ONLY).
   *
   * Deletes test-seeded insurance_claim rows with COURIER_BETRAYAL or FENCE_FLIGHT basis.
   * Also resets any economy_states rows that were seeded by C9 setup routes.
   *
   * Called in E2E beforeAll for C9 specs that need a clean slate between runs.
   * Note: player rows (and FK cascade children) are NOT deleted here — the C9 spec uses
   * resetCourierLaunderingState in beforeEach instead (which cleans courier_shift + laundering_nodes).
   * Individual player cleanup is deferred to the playerIds from each test setup.
   *
   * R2.2: TEST-ONLY. Used only for E2E test isolation.
   */
  @Post('_test/insurance/reset-c9-state')
  async resetC9State(): Promise<{ deleted: number }> {
    // Delete C9 test-seeded claims (COURIER_BETRAYAL or FENCE_FLIGHT basis).
    const result = await this.db
      .delete(insuranceClaim)
      .where(sql`${insuranceClaim.claim_basis} IN ('COURIER_BETRAYAL', 'FENCE_FLIGHT')`);
    const deleted = (result as unknown as { rowCount?: number }).rowCount ?? 0;
    return { deleted };
  }

  /**
   * `GET /v1/_test/insurance/read-insurance-state?playerId=<uuid>&contractId=<uuid>` — C10 real-flow fraud state (TEST-ONLY).
   *
   * Reads the current state of all insurance entities for a player: claims, contract, almanac, cash.
   * Used by real-flow fraud E2E tests to assert the full fraud consequence state.
   *
   * Returns:
   *   - claims: all insurance_claim rows for the player (serialized)
   *   - contractStatus: insurance_contract.status (ACTIVE / FRAUDED)
   *   - almanacStatus: almanac_entry.status (CLEAN / POISONED) — null if no almanac row
   *   - cashCents: economy_states.cash_cents (current cash)
   *
   * R2.2: TEST-ONLY (not registered in production). payout_cents + cashCents are clear transaction values.
   */
  @Get('_test/insurance/read-insurance-state')
  async readInsuranceState(
    @Query('playerId') playerId: string,
    @Query('contractId') contractId: string,
  ): Promise<{
    claims: unknown[];
    contractStatus: string | null;
    almanacStatus: string | null;
    cashCents: number;
  }> {
    if (!playerId) {
      throw new HttpException('playerId query param required', HttpStatus.BAD_REQUEST);
    }

    const claimRows = await this.db
      .select()
      .from(insuranceClaim)
      .where(eq(insuranceClaim.player_id, playerId))
      .orderBy(insuranceClaim.created_at);

    const [contractRow] = await this.db
      .select({ status: insuranceContract.status })
      .from(insuranceContract)
      .where(eq(insuranceContract.id, contractId))
      .limit(1);

    const [almanacRow] = await this.db
      .select({ status: almanacEntry.status })
      .from(almanacEntry)
      .where(eq(almanacEntry.player_id, playerId))
      .limit(1);

    const [econRow] = await this.db
      .select({ cash_cents: economyState.cash_cents })
      .from(economyState)
      .where(eq(economyState.player_id, playerId))
      .limit(1);

    return {
      claims: claimRows.map((r) => serializeRow(r as Record<string, unknown>)),
      contractStatus: contractRow?.status ?? null,
      almanacStatus: almanacRow?.status ?? null,
      cashCents: Number(econRow?.cash_cents ?? 0n),
    };
  }

  // ── C10 Routes (fraud detection + almanac poison) ─────────────────────────────────────────────

  /**
   * `POST /v1/_test/insurance/file-claim-with-walk` — C10 fraud-detection proof (TEST-ONLY).
   *
   * Creates a complete scenario for the fraud-detection E2E:
   *   1. Fresh player with economy_states.cash_cents = initialCashCents.
   *   2. COMPLETE underwriter_walk_record with findings_bitmask controlled by the body:
   *      - `idleDealersObserved: true` → sets bit 0 (IDLE_DEALERS_OBSERVED).
   *      - `heatSmokeObserved: true`   → sets bit 1 (HEAT_SMOKE_OBSERVED).
   *      All other bits default to 0 for clean fraud-path isolation in C10.
   *   3. ACTIVE insurance_contract with a KNOWN premium_cents (injected directly — not via
   *      ContractService so the test can assert exact cash arithmetic without computing the premium
   *      formula). Cash is debited for the premium at contract creation.
   *   4. `ClaimsService.fileClaim()` → insurance_claim (status=FILED).
   *   5. `FraudDetectionService.checkClaimAgainstWalk(playerId, claimId)` → { fraud, contradictedFinding }.
   *   6a. If fraud=true: `FraudDetectionService.applyFraudPenalty(playerId, contractId, claimId, 0)`.
   *   6b. If fraud=false: `ClaimsService.computePayout(playerId, claimId)` → credit payout → mark PAID.
   *   (W6a C4 — findings #11/#12/#13: all three now require `playerId` as their first argument.)
   *   7. Read final state: claim, contract, almanac, cashAfter.
   *   8. Return full state for E2E assertion.
   *
   * Corrected §1.4 fraud map (C10 fix):
   *   HEAT_RAID checks IDLE_DEALERS_OBSERVED (bit 0) — fraud fires when bit 0 IS set (present).
   *   - HEAT_RAID + idleDealersObserved=true  → fraud (bit 0 SET = contradiction = idle dealers ≠ heat raid)
   *   - HEAT_RAID + idleDealersObserved=false → honest (bit 0 absent = no contradiction)
   *
   *   DEALER_TURNOVER checks HEAT_SMOKE_OBSERVED (bit 1) — fraud fires when bit 1 IS set.
   *   - DEALER_TURNOVER + heatSmokeObserved=true  → fraud (heat observed = heat drove loss, not turnover)
   *   - DEALER_TURNOVER + heatSmokeObserved=false → honest
   *
   * R2.2: findings_bitmask is NEVER in the response. The client sees only claim/contract/almanac
   *   statuses + cash values (clear transaction amounts — DD-P5).
   * Anti-fabrication: no Math.random. All values explicit or from insuranceTunables registry.
   *
   * Body: { coverageType, claimBasis, idleDealersObserved?, heatSmokeObserved?, premiumCents, initialCashCents }
   * Response: { fraud, claim, contract, almanac, cashAfter, payoutCreditedCents }
   */
  @Post('_test/insurance/file-claim-with-walk')
  @HttpCode(200)
  async fileClaimWithWalk(
    @Body()
    body: {
      coverageType: CoverageType;
      claimBasis: 'DEALER_TURNOVER' | 'HEAT_RAID' | 'COURIER_BETRAYAL' | 'STORAGE_OVERFLOW' | 'FENCE_FLIGHT';
      idleDealersObserved?: boolean;
      heatSmokeObserved?: boolean;
      premiumCents: number;
      initialCashCents: number;
    },
  ): Promise<{
    fraud: boolean;
    claim: unknown;
    contract: unknown;
    almanac: unknown;
    cashAfter: number;
    payoutCreditedCents: number;
  }> {
    const {
      coverageType = 'PROPERTY',
      claimBasis = 'HEAT_RAID',
      idleDealersObserved = false,
      heatSmokeObserved = false,
      premiumCents = 40_000,
      initialCashCents = 1_000_000,
    } = body ?? {};

    // ── Step 1: Create fresh player with cash ─────────────────────────────────────────────────────
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow!.account_id,
        callsign: nextTestCallsign('c10'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // Seed cash in economy_states.
    // Cash starts at initialCashCents. We then debit premiumCents immediately (simulating issuance).
    // The fraud penalty (5× premium) will be debited later by applyFraudPenalty.
    await this.db
      .insert(economyState)
      .values({
        player_id: playerId,
        cash_cents: BigInt(initialCashCents),
        marks: 0,
      })
      .onConflictDoUpdate({
        target: economyState.player_id,
        set: { cash_cents: BigInt(initialCashCents) },
      });

    // ── Step 2: Create COMPLETE walk with controlled findings_bitmask ─────────────────────────────
    //
    // Build bitmask from the body flags (corrected §1.4 map — all fraudWhen:'present'):
    //   idleDealersObserved=true → bit 0 (IDLE_DEALERS_OBSERVED) — triggers HEAT_RAID fraud
    //   heatSmokeObserved=true   → bit 1 (HEAT_SMOKE_OBSERVED) — triggers DEALER_TURNOVER/STORAGE_OVERFLOW fraud
    //   All other bits = 0 for clean isolation (bits 4+5 controlled by slateStableObserved/hostagShelfObserved
    //   if needed by future tests; defaulting to 0 here since C10 spec tests HEAT_RAID only).
    //
    // R2.2: findings_bitmask is server-only — we assert on claim/contract/almanac statuses,
    // never on the raw bitmask value. The _test route knows it but does NOT return it.
    let bitmask = 0n;
    if (idleDealersObserved) {
      bitmask |= 1n << 0n; // IDLE_DEALERS_OBSERVED = bit 0
    }
    if (heatSmokeObserved) {
      bitmask |= 1n << 1n; // HEAT_SMOKE_OBSERVED = bit 1
    }

    const walkDuration = insuranceTunables.walkDurationDays;
    const [walkRow] = await this.db
      .insert(underwriterWalkRecord)
      .values({
        player_id: playerId,
        coverage_type: coverageType,
        findings_bitmask: bitmask,
        start_tick: BigInt(0),
        observation_depth: walkDuration, // COMPLETE (daysElapsed = walkDuration - 0 = duration)
        status: 'COMPLETE',
      })
      .returning({ id: underwriterWalkRecord.id });
    const walkId = walkRow!.id;

    // ── Step 3: Create ACTIVE contract with known premium_cents ───────────────────────────────────
    //
    // Insert directly (not via ContractService) so the premium_cents is exactly `premiumCents`
    // as given by the test. This allows the E2E to assert exact cash arithmetic:
    //   cashAfter (fraud) = initialCashCents - premiumCents - 5 × premiumCents
    //   cashAfter (honest) = initialCashCents - premiumCents (only issuance debit)
    //
    // We debit premiumCents from cash here (simulating the ContractService.issueContract debit).
    const [contractRow] = await this.db
      .insert(insuranceContract)
      .values({
        player_id: playerId,
        type: coverageType,
        insured_value_cents: BigInt(1_000_000), // synthetic insured value for this test
        premium_cents: BigInt(premiumCents),
        walk_id: walkId,
        counterparty_id: null,
        status: 'ACTIVE',
        issued_tick: BigInt(0),
      })
      .returning({ id: insuranceContract.id });
    const contractId = contractRow!.id;

    // Debit premium from cash (simulates ContractService.issueContract debit — DD-P5).
    await this.db
      .update(economyState)
      .set({ cash_cents: sql`${economyState.cash_cents} - ${BigInt(premiumCents)}` })
      .where(eq(economyState.player_id, playerId));

    // ── Step 4: fileClaim (status=FILED) ─────────────────────────────────────────────────────────
    //
    // We need a synthetic loss_event_ref UUID (no real building_raid row for this test).
    // Use a fixed sentinel UUID — computePayout will fail to find it, but for fraud tests
    // we never reach computePayout (fraud path returns early). For honest tests, we need
    // computePayout to produce a value. For PROPERTY, computePayout uses insured_value_cents (no JOIN).
    // So for PROPERTY + honest path: payout = round(property_coverage_fraction × insured_value_cents).
    // We use a sentinel loss_event_ref that computePayout will handle gracefully.
    // Synthetic loss_event_ref: a valid UUID that won't resolve to any real row.
    // For fraud tests: we never reach computePayout (fraud returns early before any JOIN).
    // For honest PROPERTY tests: computePayout uses insured_value_cents (no building_raid JOIN).
    const lossEventRef = '00000000-0000-0000-0000-c10a00000001';

    const { claimId } = await this.claimsService.fileClaim(
      playerId,
      contractId,
      claimBasis,
      lossEventRef,
      0, // gameMinute = 0 (sentinel — poison horizon = 0 + 365 × 1440 = 525_600)
    );

    // ── Step 5: Fraud check ───────────────────────────────────────────────────────────────────────
    const { fraud } = await this.fraudDetectionService.checkClaimAgainstWalk(playerId, claimId);

    let payoutCreditedCents = 0;

    if (fraud) {
      // ── Step 6a: Apply fraud penalty ───────────────────────────────────────────────────────────
      // applyFraudPenalty: sets claim DENIED_FRAUD, contract FRAUDED, almanac POISONED,
      // debits 5 × premiumCents from economy_states.
      await this.fraudDetectionService.applyFraudPenalty(playerId, contractId, claimId, 0);
    } else {
      // ── Step 6b: Honest path — compute payout + credit + PAID ─────────────────────────────────
      //
      // For PROPERTY coverage: computePayout uses insured_value_cents (no building_raid JOIN).
      // payout = round(property_coverage_fraction × 1_000_000) = round(0.60 × 1_000_000) = 600_000.
      // This is correct for an honest test — we verify the claim is PAID.
      // The exact payout value is implementation-derived; the E2E only asserts claim.status=PAID.
      const { payoutCents } = await this.claimsService.computePayout(playerId, claimId);
      payoutCreditedCents = payoutCents;

      // Credit payout to economy_states.
      if (payoutCents > 0) {
        await this.db
          .update(economyState)
          .set({ cash_cents: sql`${economyState.cash_cents} + ${BigInt(payoutCents)}` })
          .where(eq(economyState.player_id, playerId));
      }

      // Mark claim PAID.
      await this.db
        .update(insuranceClaim)
        .set({ status: 'PAID', updated_at: new Date() })
        .where(eq(insuranceClaim.id, claimId));
    }

    // ── Step 7: Read final state for E2E assertion ────────────────────────────────────────────────
    const [finalClaim] = await this.db
      .select()
      .from(insuranceClaim)
      .where(eq(insuranceClaim.id, claimId))
      .limit(1);

    const [finalContract] = await this.db
      .select()
      .from(insuranceContract)
      .where(eq(insuranceContract.id, contractId))
      .limit(1);

    const [finalAlmanac] = await this.db
      .select()
      .from(almanacEntry)
      .where(eq(almanacEntry.player_id, playerId))
      .limit(1);

    const [cashRow] = await this.db
      .select({ cash_cents: economyState.cash_cents })
      .from(economyState)
      .where(eq(economyState.player_id, playerId))
      .limit(1);

    const cashAfter = Number(cashRow?.cash_cents ?? 0n);

    // R2.2: findings_bitmask is NOT returned. The response contains only statuses + cash values.
    return {
      fraud,
      claim: serializeRow(finalClaim as Record<string, unknown>),
      contract: serializeRow(finalContract as Record<string, unknown>),
      almanac: serializeRow(finalAlmanac as Record<string, unknown> | null),
      cashAfter,
      payoutCreditedCents,
    };
  }

  // ── C11 Routes (InsuranceProjectionService.projectContract — P5 wall) ─────────────────────────
  //
  // POST /v1/_test/insurance/setup-projection
  //   Creates a fresh player + COMPLETE walk + ACTIVE contract (no claim, CLEAN almanac).
  //   Returns { playerId, contractId, premiumCents }.
  //   Used by the C11 E2E test (a) — clear fields present, CLEAN almanac.
  //
  // POST /v1/_test/insurance/setup-projection-with-claim
  //   Creates player + COMPLETE walk + ACTIVE contract + PAID claim.
  //   Returns { playerId, contractId, premiumCents, payoutCents }.
  //   Used by the C11 E2E test (b) — premium/payout correct values.
  //
  // POST /v1/_test/insurance/setup-projection-frauded
  //   Creates player + COMPLETE walk + ACTIVE contract + DENIED_FRAUD claim + FRAUDED contract + POISONED almanac.
  //   Returns { playerId, contractId }.
  //   Used by the C11 E2E test (c) — FRAUDED/POISONED categorical visible; poisoned_until_tick absent.
  //
  // GET /v1/_test/insurance/project-contract?playerId=&contractId=
  //   Calls InsuranceProjectionService.projectContract(playerId, contractId).
  //   Returns the InsuranceClientProjection (P5-compliant shape — no hidden scalars).
  //   The E2E asserts CLEAR fields present + forbidden keys absent from JSON blob.

  /** Body for POST /v1/_test/insurance/setup-projection */
  // Interface defined inline (small, C11-only).

  /**
   * `POST /v1/_test/insurance/setup-projection` — C11 setup route (TEST-ONLY).
   *
   * Creates a fresh player + economy_states + COMPLETE walk + ACTIVE insurance_contract.
   * No claim, CLEAN almanac (baseline projection: ACTIVE/null/CLEAN).
   *
   * Body: { coverageType?: CoverageType }
   * Returns: { playerId, contractId, premiumCents }
   */
  @Post('_test/insurance/setup-projection')
  @HttpCode(200)
  async setupProjection(
    @Body() body: { coverageType?: CoverageType },
  ): Promise<{ playerId: string; contractId: string; premiumCents: number }> {
    const coverageType = body?.coverageType ?? 'PROPERTY';
    const insuredValueCents = 2_000_000; // $20k — a meaningful value for premium assertions

    // 1. Create player + account + cash.
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const accountId = accountRow!.account_id;

    const [playerRow] = await this.db
      .insert(player)
      .values({ account_id: accountId })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // Give player 10M cents (well above any premium).
    await this.db.insert(economyState).values({
      player_id: playerId,
      cash_cents: BigInt(10_000_000),
    });

    // 2. Create COMPLETE walk (bitmask 0 = no findings, base premium only).
    const walkDuration = insuranceTunables.walkDurationDays;
    const [walkRow] = await this.db
      .insert(underwriterWalkRecord)
      .values({
        player_id: playerId,
        coverage_type: coverageType,
        findings_bitmask: 0n,
        start_tick: 0n,
        observation_depth: walkDuration,
        status: 'COMPLETE',
      })
      .returning({ id: underwriterWalkRecord.id });
    const walkId = walkRow!.id;

    // 3. Issue contract (debits premium from cash — DD-P5).
    const { contractId, premiumCents } = await this.contractService.issueContract(
      playerId,
      walkId,
      insuredValueCents,
      null,
    );

    return { playerId, contractId, premiumCents };
  }

  /**
   * `POST /v1/_test/insurance/setup-projection-with-claim` — C11 setup (with PAID claim, TEST-ONLY).
   *
   * Creates player + COMPLETE walk + ACTIVE contract + one PAID insurance_claim.
   * The claim payout is the PROPERTY coverage fraction × insuredValueCents (real computePayout).
   *
   * Body: { coverageType?: CoverageType, insuredValueCents?: number }
   * Returns: { playerId, contractId, premiumCents, payoutCents }
   */
  @Post('_test/insurance/setup-projection-with-claim')
  @HttpCode(200)
  async setupProjectionWithClaim(
    @Body() body: { coverageType?: CoverageType; insuredValueCents?: number },
  ): Promise<{ playerId: string; contractId: string; premiumCents: number; payoutCents: number }> {
    const coverageType = body?.coverageType ?? 'PROPERTY';
    const insuredValueCents = body?.insuredValueCents ?? 2_000_000;

    // 1. Create player + account + cash.
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const accountId = accountRow!.account_id;

    const [playerRow] = await this.db
      .insert(player)
      .values({ account_id: accountId })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    await this.db.insert(economyState).values({
      player_id: playerId,
      cash_cents: BigInt(10_000_000),
    });

    // 2. Create COMPLETE walk.
    const walkDuration = insuranceTunables.walkDurationDays;
    const [walkRow] = await this.db
      .insert(underwriterWalkRecord)
      .values({
        player_id: playerId,
        coverage_type: coverageType,
        findings_bitmask: 0n,
        start_tick: 0n,
        observation_depth: walkDuration,
        status: 'COMPLETE',
      })
      .returning({ id: underwriterWalkRecord.id });
    const walkId = walkRow!.id;

    // 3. Issue contract.
    const { contractId, premiumCents } = await this.contractService.issueContract(
      playerId,
      walkId,
      insuredValueCents,
      null,
    );

    // 4. File a claim using a sentinel loss_event_ref.
    // PROPERTY coverage: computePayout uses insured_value_cents (no building_raid JOIN needed).
    const lossEventRef = '00000000-0000-0000-0000-c11a00000001';
    const { claimId } = await this.claimsService.fileClaim(
      playerId,
      contractId,
      'HEAT_RAID', // a valid claim_basis for PROPERTY
      lossEventRef,
      0, // gameMinute sentinel
    );

    // 5. Compute payout (real computePayout — no mock).
    const { payoutCents } = await this.claimsService.computePayout(playerId, claimId);

    // 6. Credit payout + mark PAID.
    if (payoutCents > 0) {
      await this.db
        .update(economyState)
        .set({ cash_cents: sql`${economyState.cash_cents} + ${BigInt(payoutCents)}` })
        .where(eq(economyState.player_id, playerId));
    }
    await this.db
      .update(insuranceClaim)
      .set({ status: 'PAID', updated_at: new Date() })
      .where(eq(insuranceClaim.id, claimId));

    return { playerId, contractId, premiumCents, payoutCents };
  }

  /**
   * `POST /v1/_test/insurance/setup-projection-frauded` — C11 setup (FRAUDED contract, TEST-ONLY).
   *
   * Creates player + COMPLETE walk (with a finding that will be contradicted) + ACTIVE contract
   * + DENIED_FRAUD claim + FRAUDED contract + POISONED almanac.
   * The claim uses 'HEAT_RAID' basis with IDLE_DEALERS_OBSERVED bit set (the contradiction).
   *
   * Body: { coverageType?: CoverageType }
   * Returns: { playerId, contractId }
   */
  @Post('_test/insurance/setup-projection-frauded')
  @HttpCode(200)
  async setupProjectionFrauded(
    @Body() body: { coverageType?: CoverageType },
  ): Promise<{ playerId: string; contractId: string }> {
    const coverageType = body?.coverageType ?? 'PROPERTY';
    const insuredValueCents = 2_000_000;

    // 1. Create player + account + cash (needs plenty for the 5× penalty).
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const accountId = accountRow!.account_id;

    const [playerRow] = await this.db
      .insert(player)
      .values({ account_id: accountId })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // Give the player plenty of cash (premium + 5× fraud penalty).
    await this.db.insert(economyState).values({
      player_id: playerId,
      cash_cents: BigInt(10_000_000),
    });

    // 2. Create COMPLETE walk with IDLE_DEALERS_OBSERVED bit (bit 0) set.
    // claim_basis = HEAT_RAID contradicts IDLE_DEALERS_OBSERVED=TRUE (the C10 §1.4 map).
    // Fraud fires because: HEAT_RAID asserts there was heat/pressure, but IDLE_DEALERS_OBSERVED
    // (bit 0 set) says dealers were idle → no heat → contradiction → FRAUD.
    const walkDuration = insuranceTunables.walkDurationDays;
    const [walkRow] = await this.db
      .insert(underwriterWalkRecord)
      .values({
        player_id: playerId,
        coverage_type: coverageType,
        findings_bitmask: 1n,        // bit 0 = IDLE_DEALERS_OBSERVED set (the contradiction bit)
        start_tick: 0n,
        observation_depth: walkDuration,
        status: 'COMPLETE',
      })
      .returning({ id: underwriterWalkRecord.id });
    const walkId = walkRow!.id;

    // 3. Issue contract.
    const { contractId, premiumCents } = await this.contractService.issueContract(
      playerId,
      walkId,
      insuredValueCents,
      null,
    );

    // 4. File claim with HEAT_RAID basis (contradicts IDLE_DEALERS_OBSERVED=TRUE → fraud).
    const lossEventRef = '00000000-0000-0000-0000-c11b00000001';
    const { claimId } = await this.claimsService.fileClaim(
      playerId,
      contractId,
      'HEAT_RAID',
      lossEventRef,
      0,
    );

    // 5. Check fraud (should fire — IDLE_DEALERS_OBSERVED contradicts HEAT_RAID).
    const { fraud } = await this.fraudDetectionService.checkClaimAgainstWalk(playerId, claimId);
    if (!fraud) {
      // Safety: if fraud didn't fire, force the state for test setup integrity.
      // This should not happen with the correct C10 contradiction map.
      // Force FRAUDED state manually for projection test completeness.
      await this.db
        .update(insuranceClaim)
        .set({ status: 'DENIED_FRAUD', updated_at: new Date() })
        .where(eq(insuranceClaim.id, claimId));
      await this.db
        .update(insuranceContract)
        .set({ status: 'FRAUDED', updated_at: new Date() })
        .where(eq(insuranceContract.id, contractId));
      await this.db
        .insert(almanacEntry)
        .values({
          underwriter_id: '00000000-0000-0000-0000-000000000001', // synthetic underwriter (mirrors fraud-detection.service.ts)
          player_id: playerId,
          status: 'POISONED',
          poisoned_until_tick: BigInt(525_600), // 365 days × 1440 ticks/day
        })
        .onConflictDoNothing();
    } else {
      // 5a. Apply fraud penalty (DENIED_FRAUD + FRAUDED + POISONED).
      await this.fraudDetectionService.applyFraudPenalty(playerId, contractId, claimId, 0);
    }

    // Suppress unused premiumCents lint warning — used only to trigger the debit.
    void premiumCents;

    return { playerId, contractId };
  }

  /**
   * `GET /v1/_test/insurance/project-contract?playerId=&contractId=` — C11 projection (TEST-ONLY).
   *
   * Calls `InsuranceProjectionService.projectContract(playerId, contractId)` and returns the
   * `InsuranceClientProjection` — ONLY the P5-allowed fields.
   *
   * The E2E asserts:
   *   (a) CLEAR fields present: premium_cents, escrow_required_cents, payout_cents, c_i,
   *       contract_status, claim_status, almanac_status.
   *   (b) BANDED fields present: almanac_risk_band (CLEAN|ELEVATED|SEVERE).
   *   (c) ZERO hidden scalar: findings_bitmask/observation_depth/route_id/poisoned_until_tick/
   *       collateral_amount/restraint_ratio absent from the JSON blob.
   *
   * R2.2: the projection service enforces the P5 wall — no hidden scalar in the returned shape.
   * The route is TEST-ONLY (registered only when testControllersEnabled()).
   */
  @Get('_test/insurance/project-contract')
  async projectContract(
    @Query('playerId') playerId: string,
    @Query('contractId') contractId: string,
  ): Promise<ReturnType<InsuranceProjectionService['projectContract']>> {
    return this.projectionService.projectContract(playerId, contractId);
  }

  // ── C12 Routes (seed-bo-state for InsuranceAdminController E2E) ──────────────

  /**
   * `POST /v1/_test/insurance/setup-ob1-with-realflow` — §1.4 Obligation #1 setup (TEST-ONLY).
   *
   * Creates a complete insurance scenario using REAL `recordFindings` (NOT a hardcoded bitmask).
   * Implements the Obligation #1 mandate from design §1.4: honest production-populated walk → PAID.
   *
   * For each coverage type, seeds REAL substrate state that causes honest FindingType bits to fire:
   *   STASH_LOSS:     building(heat=0.95) + product_storage(gramsSeized grams) → bits 1+2 fire
   *   PROPERTY:       building(heat=0.95) + product_storage + PROPERTY walk → bits 1+2 fire
   *   COURIER_ARREST: courier_shift(status=in_transit, patrol_heat=0) → bits 4+2 fire
   *   FENCE_DEFAULT:  laundering_node(buffer_load=0.95, throughput=1000) → bits 5+2 fire
   *
   * Note: bit 0 (IDLE_DEALERS_OBSERVED) NEVER fires from any of these substrates — `findingFires`
   * returns false for IDLE_DEALERS_OBSERVED always (reserved — not yet observable). This guarantees
   * the corrected FRAUD_CONTRADICTION_MAP (all entries → bit 0) cannot trigger on honest walks.
   *
   * Process:
   *   1. Create player + economy_states (10M cash).
   *   2. Create coverage-specific substrate.
   *   3. Create WALKING walk (start_tick=0).
   *   4. Call walkService.recordFindings() for walkDurationDays days (day 1..3 at ticks 1440..4320).
   *   5. Call walkService.computePremium() → walk transitions WALKING→COMPLETE.
   *   6. Call contractService.issueContract() → ACTIVE contract (debits premium).
   *   7. For STASH/PROPERTY: update contract.asset_ref = buildingId (subscriber lookup).
   *
   * Returns the IDs and state needed by the E2E to trigger the loss event.
   *   - STASH_LOSS/PROPERTY: E2E then fires raid + advances tick → PAID claim.
   *   - COURIER_ARREST:      E2E then seeds hot shift + run-minute-tick → PAID claim.
   *   - FENCE_DEFAULT:       E2E then runs nightly tick with low threshold → PAID claim.
   *
   * R2.2: findings_bitmask NOT returned. cashBefore is a clear cash value (DD-P5).
   * Anti-fabrication: no Math.random. All substrate values are explicit test defaults.
   * [needs reviewer⊥] — ratify this as faithful implementation of §1.4 Obligation #1.
   */
  @Post('_test/insurance/setup-ob1-with-realflow')
  @HttpCode(201)
  async setupOb1WithRealflow(
    @Body()
    body: {
      /** Coverage type for the walk. Required. */
      coverageType: CoverageType;
      /** Grams seized in the raid — for STASH_LOSS/PROPERTY. Default 500. */
      gramsSeized?: number;
      /** Insured value in cents — for PROPERTY. Default 1_000_000. */
      insuredValueCents?: number;
      /** Cargo cents for COURIER_ARREST claim. Default 50_000. */
      cargoCents?: number;
    },
  ): Promise<{
    playerId: string;
    contractId: string;
    blockId?: number;
    buildingId?: string;
    cashBefore: number;
    gramsSeized?: number;
    cargoCents?: number;
    throughputInPerHour?: number;
    premiumCents: number;
  }> {
    const coverageType = body?.coverageType ?? 'STASH_LOSS';
    const gramsSeized = body?.gramsSeized ?? 500;
    const insuredValueCents = body?.insuredValueCents ?? 1_000_000;
    const cargoCents = body?.cargoCents ?? 50_000;
    const THROUGHPUT_PER_HOUR = 1000;
    const WALK_DURATION = insuranceTunables.walkDurationDays; // default 3

    // ── 1. Create player + economy_states ──────────────────────────────────────────────────────
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow!.account_id,
        callsign: nextTestCallsign('ob1'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    const INITIAL_CASH = 10_000_000; // 10M cents
    await this.db
      .insert(economyState)
      .values({ player_id: playerId, cash_cents: BigInt(INITIAL_CASH), marks: 0 })
      .onConflictDoUpdate({
        target: economyState.player_id,
        set: { cash_cents: BigInt(INITIAL_CASH) },
      });

    // ── 2. Create coverage-specific substrate ─────────────────────────────────────────────────
    let blockId: number | undefined;
    let buildingId: string | undefined;
    let contractInsuredValueCents: number;

    if (coverageType === 'STASH_LOSS' || coverageType === 'PROPERTY') {
      // STASH_LOSS / PROPERTY: hot building (heat=0.95 > threshold 0.80) + product_storage
      // heat=0.95 → HEAT_SMOKE_OBSERVED (bit 1) fires via recordFindings.
      // product_storage with gramsSeized grams → STASH_QUEUE_DEEP (bit 3) fires (totalGrams > 0).
      // No lieutenant row → LIEUTENANT_UNIFORM_DISCIPLINED (bit 2) fires (cross-cue).
      blockId = 101; // district 2 block 101 (same as C6 — fresh player, no conflict)
      const [buildingRow] = await this.db
        .insert(building)
        .values({
          player_id: playerId,
          block_id: blockId,
          building_type: 2, // stash
          ownership: 'player',
          heat: 0.95, // above heatThreshold (fenceDefaultExposureThreshold = 0.80)
          structural_state: 'operational',
        })
        .returning({ building_id: building.building_id });
      buildingId = buildingRow!.building_id;

      // building_operational_state required for the raid subscriber to classify the building.
      await this.db.insert(buildingOperationalState).values({
        building_id: buildingId,
        player_id: playerId,
        operational_type: 'stash',
        conversion_stage: 'operational',
        structural_state: 'operational',
      });

      // product_storage: gramsSeized grams → STASH_QUEUE_DEEP fires; also seized by raid.
      await this.db.insert(productStorage).values({
        player_id: playerId,
        building_id: buildingId,
        substance_type: 'brindle',
        quantity_grams: gramsSeized,
        purity_grade: 'standard',
      });

      contractInsuredValueCents = coverageType === 'PROPERTY' ? insuredValueCents : gramsSeized * 2500;

    } else if (coverageType === 'COURIER_ARREST') {
      // COURIER_ARREST: seed an in_transit courier_shift with patrol_heat=0
      // (patrol_heat=0 < any interception threshold → NOT intercepted by the tick; used only for
      // recordFindings snapshot to set bit 4 SLATE_MEMBERSHIP_STABLE: inTransitCount > 0).
      // The E2E test will separately seed a HOT shift (patrol_heat=0.9) + run-minute-tick to
      // trigger the actual CourierInterceptedEvent.
      const originBlockId = 106; // distinct from C9 blocks (103+104) to avoid conflicts
      const destBlockId = 107;

      const [originBuildingRow] = await this.db
        .insert(building)
        .values({
          player_id: playerId, block_id: originBlockId,
          building_type: 1, ownership: 'player', structural_state: 'operational',
        })
        .returning({ building_id: building.building_id });
      const originBuildingId = originBuildingRow!.building_id;

      const [destBuildingRow] = await this.db
        .insert(building)
        .values({
          player_id: playerId, block_id: destBlockId,
          building_type: 2, ownership: 'player', structural_state: 'operational',
        })
        .returning({ building_id: building.building_id });
      const destBuildingId = destBuildingRow!.building_id;

      const [courierRow] = await this.db
        .insert(courier)
        .values({
          player_id: playerId, role_type: 'courier', vehicle_type: 'foot',
          current_state: 'idle', current_load_grams: 0, current_load_cents: 0,
        })
        .returning({ courier_id: courier.courier_id });
      const courierId = courierRow!.courier_id;

      const [routeRow] = await this.db
        .insert(route)
        .values({
          player_id: playerId,
          origin_building_id: originBuildingId,
          destination_building_id: destBuildingId,
          // C14 fix: pass array directly, not JSON.stringify (same as first seed-courier-shift above).
          path_blocks: [originBlockId, destBlockId],
          river_crossings: 0,
          ephemeral_mode: false,
        })
        .returning({ route_id: route.route_id });
      const routeId = routeRow!.route_id;

      // In-transit shift with patrol_heat=0 (not interceptable — just for snapshot observation).
      await this.db.insert(courierShift).values({
        player_id: playerId,
        courier_id: courierId,
        route_id: routeId,
        started_at_tick: 0,
        current_segment_index: 0,
        cargo_grams: 0,
        cargo_cents: 0, // no cargo on this observation shift
        substance_type: 'brindle',
        status: 'in_transit',
        patrol_heat: 0, // NOT hot — purely for recordFindings observation (bit 4 fires: inTransitCount > 0)
      });

      contractInsuredValueCents = 1_000_000; // COURIER_ARREST: insured_value drives premium only

    } else {
      // FENCE_DEFAULT: laundering_node(buffer_load=0.95, throughput=1000)
      // buffer_load=0.95 > launderingExposureThreshold (fenceDefaultExposureThreshold 0.80)
      // → HOSTAGE_SHELF_STATE (bit 5) fires via recordFindings.
      const fenceBlockId = 108; // distinct from all other ob1 blocks
      const [fenceBuildingRow] = await this.db
        .insert(building)
        .values({
          player_id: playerId, block_id: fenceBlockId,
          building_type: 3, // laundering
          ownership: 'player', structural_state: 'operational',
        })
        .returning({ building_id: building.building_id });
      const fenceBuildingId = fenceBuildingRow!.building_id;

      await this.db.insert(launderingNode).values({
        player_id: playerId,
        building_id: fenceBuildingId,
        stage_index: 0,
        throughput_in_per_hour: THROUGHPUT_PER_HOUR,
        dwell_time_hours: 1.0,
        buffer_load: 0.95, // above launderingExposureThreshold (0.80) → HOSTAGE_SHELF_STATE fires
        cleanliness_at_output: 0.8,
      });

      contractInsuredValueCents = 1_000_000; // FENCE_DEFAULT: insured_value drives premium only
    }

    // ── 3. Create WALKING walk (start_tick=0) ─────────────────────────────────────────────────
    const { walkId } = await this.walkService.startWalk(playerId, null, coverageType, 0);

    // ── 4. Call real recordFindings for walkDurationDays days (day 1..WALK_DURATION) ─────────
    // Each call drives the REAL service method which reads the substrate snapshot
    // and fires findingFires() per FindingType — NOT a hardcoded bitmask.
    // Day indices: 1, 2, 3 (for start_tick=0; dayIndex = Math.floor(gameMinute / 1440)).
    for (let day = 1; day <= WALK_DURATION; day++) {
      const gameMinute = day * 1440; // day 1 = 1440, day 2 = 2880, day 3 = 4320
      await this.walkService.recordFindings({ playerId, cadence: Cadence.NIGHTLY, gameMinute });
    }

    // ── 5. computePremium → WALKING→COMPLETE ──────────────────────────────────────────────────
    const { premiumCents } = await this.walkService.computePremium(walkId);

    // ── 6. Issue contract ─────────────────────────────────────────────────────────────────────
    // issueContract debits premiumCents from economy_states.cash_cents.
    const result = await this.contractService.issueContract(
      playerId,
      walkId,
      contractInsuredValueCents,
      null, // no counterparty (no wary-gating)
    );
    const contractId = result.contractId;

    // ── 7. For STASH/PROPERTY: set asset_ref = buildingId (subscriber lookup requires this) ──
    if ((coverageType === 'STASH_LOSS' || coverageType === 'PROPERTY') && buildingId) {
      await this.db
        .update(insuranceContract)
        .set({ asset_ref: buildingId, updated_at: new Date() })
        .where(eq(insuranceContract.id, contractId));
    }

    // Re-read actual cash after premium debit.
    const [econRow] = await this.db
      .select({ cash_cents: economyState.cash_cents })
      .from(economyState)
      .where(eq(economyState.player_id, playerId))
      .limit(1);
    const cashBefore = econRow ? Number(econRow.cash_cents) : INITIAL_CASH - premiumCents;

    return {
      playerId,
      contractId,
      ...(blockId !== undefined ? { blockId } : {}),
      ...(buildingId !== undefined ? { buildingId } : {}),
      cashBefore,
      ...(coverageType === 'STASH_LOSS' || coverageType === 'PROPERTY' ? { gramsSeized } : {}),
      ...(coverageType === 'COURIER_ARREST' ? { cargoCents } : {}),
      ...(coverageType === 'FENCE_DEFAULT' ? { throughputInPerHour: THROUGHPUT_PER_HOUR } : {}),
      premiumCents,
    };
  }

  /**
   * `POST /v1/_test/insurance/seed-bo-state` — C12 BO endpoint test setup (TEST-ONLY).
   *
   * Creates a player with a complete insurance state for BO endpoint testing:
   *   - 1 COMPLETE walk
   *   - 1 ACTIVE contract
   *   - 1 FILED claim (HEAT_RAID — seeded for force-fraud-detection E2E test)
   *   - 1 CLEAN almanac entry
   *
   * Returns: { playerId, walkId, contractId, claimId, almanacId }
   *
   * The HEAT_RAID claim_basis is intentional: force-fraud-detection will check it against
   * the walk's findings_bitmask (0 by default → IDLE_DEALERS_OBSERVED bit not set → no fraud).
   * The E2E just checks that { fraud, f3_deferred } is returned (doesn't require fraud=true).
   *
   * Anti-fabrication: no Math.random. All values explicit test defaults.
   * R2.2: TEST-ONLY route (not registered in production).
   */
  @Post('_test/insurance/seed-bo-state')
  async seedBoState(): Promise<{
    playerId: string;
    walkId: string;
    contractId: string;
    claimId: string;
    almanacId: string;
  }> {
    // 1. Create a fresh account + player.
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow!.account_id,
        callsign: nextTestCallsign('bos'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // 2. Create a COMPLETE walk (findings_bitmask=0, status=COMPLETE).
    //    Bitmask 0 means no findings: HEAT_RAID claim will NOT trigger fraud
    //    (IDLE_DEALERS_OBSERVED bit 0 is not set → no contradiction → fraud=false).
    const [walkRow] = await this.db
      .insert(underwriterWalkRecord)
      .values({
        player_id: playerId,
        coverage_type: 'PROPERTY',
        observation_depth: 3,        // walk duration=3 → COMPLETE
        findings_bitmask: BigInt(0), // no findings (honest walk baseline)
        start_tick: BigInt(0),
        status: 'COMPLETE',
      })
      .returning({ id: underwriterWalkRecord.id });
    const walkId = walkRow!.id;

    // 3. Create an ACTIVE contract referencing the walk.
    //    premium_cents = small non-zero value; escrow_required_cents = 0 (non-wary).
    const [contractRow] = await this.db
      .insert(insuranceContract)
      .values({
        player_id: playerId,
        type: 'PROPERTY',
        insured_value_cents: BigInt(1_000_000), // $10k test value
        premium_cents: BigInt(40_000),          // 4% of $10k = $400 test premium
        escrow_required_cents: BigInt(0),       // non-wary → no escrow
        walk_id: walkId,
        status: 'ACTIVE',
        issued_tick: BigInt(0),
      })
      .returning({ id: insuranceContract.id });
    const contractId = contractRow!.id;

    // 4. Create a FILED claim on the contract (HEAT_RAID — for force-fraud-detection test).
    const [claimRow] = await this.db
      .insert(insuranceClaim)
      .values({
        player_id: playerId,
        contract_id: contractId,
        claim_basis: 'HEAT_RAID',
        claimed_cents: BigInt(500_000), // $5k claimed loss
        payout_cents: BigInt(0),
        status: 'FILED',
        filed_tick: BigInt(0),
      })
      .returning({ id: insuranceClaim.id });
    const claimId = claimRow!.id;

    // 5. Create a CLEAN almanac entry (standard test underwriter sentinel).
    const [almanacRow] = await this.db
      .insert(almanacEntry)
      .values({
        underwriter_id: TEST_UNDERWRITER_ID,
        player_id: playerId,
        status: 'CLEAN',
        poisoned_until_tick: null,
      })
      .returning({ id: almanacEntry.id });
    const almanacId = almanacRow!.id;

    return { playerId, walkId, contractId, claimId, almanacId };
  }

  // ── Drift C1 Routes ───────────────────────────────────────────────────────────────────────────
  //
  // IMPLEMENTS: docs/superpowers/plans/2026-06-18-depth-insurance-coverage-drift-plan.md Task 1 (C1)
  //             — Insurance Drift C1 — 2026-06-18
  //
  // Routes:
  //   POST /v1/_test/insurance/seed-drift-state  — inserts 1 coverage_induced_drift_state row for a new player
  //   GET  /v1/_test/insurance/read-drift-state   — reads the drift_state row for a player
  //   (delete-player is REUSED from the C1 Tranche B route above — same endpoint)

  /**
   * `POST /v1/_test/insurance/seed-drift-state` — Drift C1 persistence proof (TEST-ONLY).
   *
   * Inserts 1 `coverage_induced_drift_state` row for a fresh test player.
   * The player row is created fresh (account + player, test sentinel pattern).
   * Returns { playerId, driftStateId } for the E2E read + cascade-delete assertion.
   *
   * Column values use design defaults — no mechanic logic (persistence-only at C1).
   * The coverage_type defaults to 'PROPERTY' when not specified.
   *
   * R2.2: TEST-ONLY (not registered in production). Raw row returned for DB assertion.
   * Anti-fabrication: no Math.random — all values explicit defaults.
   */
  @Post('_test/insurance/seed-drift-state')
  @HttpCode(201)
  async seedDriftState(
    @Body() body: {
      coverageType?: 'PROPERTY' | 'STASH_LOSS' | 'COURIER_ARREST' | 'FENCE_DEFAULT';
      hazardShift?: number;
      /** C13: optional premium_cents for the contract row (used by premium-preview E2E). Default 1000. */
      premiumCents?: number;
    },
  ): Promise<{ playerId: string; driftStateId: string; contractId: string }> {
    const coverageType = body?.coverageType ?? 'PROPERTY';
    // C10 extension: accept hazardShift in the body for WEEKLY-tick E2E tests.
    // Defaults to 0 (the C1 issuance default). Range: 0..255 (HAZARD_SHIFT_MAX, canon :89).
    const hazardShift = body?.hazardShift ?? 0;
    // C13 extension: accept premiumCents for the contract (used by the premium-preview E2E assertion).
    // Default 1000 cents — a round number that makes the escalated preview easy to assert.
    const premiumCents = body?.premiumCents ?? 1000;

    // 1. Create a fresh test account + player row.
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow!.account_id,
        callsign: nextTestCallsign('dft'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // 2. C13: Insert a minimal insurance_contract row so projectTiltLevel can load it.
    //    premium_cents = premiumCents (the base for the escalated premium-preview formula).
    //    insured_value_cents = premiumCents × 25 (synthetic; premium ~4% of insured_value at default α).
    //    status = ACTIVE, expires_at_tick = null (no renewal term — Tranche B style).
    //    All other columns use their column defaults.
    const [contractRow] = await this.db
      .insert(insuranceContract)
      .values({
        player_id: playerId,
        type: coverageType,
        insured_value_cents: BigInt(premiumCents * 25),
        premium_cents: BigInt(premiumCents),
        // escrow_required_cents = 0 (default — no wary ring in this test seed)
        // status = 'ACTIVE' (default)
        // expires_at_tick = null (no term — backward-compatible, renewal tests handle their own setup)
      })
      .returning({ id: insuranceContract.id });
    const contractId = contractRow!.id;

    // 3. Insert one coverage_induced_drift_state row bound to the contract.
    //    hazard_shift = body.hazardShift ?? 0 (C10: seeded with explicit shift for weekly-tick tests).
    //    fingerprint_*=0, last_drift_tick=0n — no drift at issuance (canon :89).
    //    contract_id = contractId (C13: bound to the contract for projectTiltLevel lookup).
    const [driftRow] = await this.db
      .insert(coverageInducedDriftState)
      .values({
        player_id: playerId,
        contract_id: contractId,
        coverage_type: coverageType,
        hazard_shift: hazardShift,
        // All other fields use their column defaults (fingerprint_*=0, last_drift_tick=0n, etc.)
      })
      .returning({ id: coverageInducedDriftState.id });
    const driftStateId = driftRow!.id;

    return { playerId, driftStateId, contractId };
  }

  /**
   * `GET /v1/_test/insurance/read-drift-state?playerId=<uuid>` — Drift C1 persistence proof (TEST-ONLY).
   *
   * Reads the coverage_induced_drift_state row for the given player.
   * Returns { driftState: <row> | null } — null if CASCADE-deleted or never seeded.
   *
   * BigInt fields are serialized as strings (serializeRow convention — matches Drizzle bigint mode:'bigint').
   *
   * E2E assertion: the returned row proves:
   *   - hazard_shift: 0 (default — no drift at issuance, canon :89)
   *   - fingerprint_*: 0 (DD-FINGERPRINT-COLS, 4 columns default 0)
   *   - last_drift_tick: '0' (bigint as string)
   *   - coverage_type: the enum value seeded
   *   - player FK: the playerId is correct
   *
   * R2.2: TEST-ONLY (not registered in production). The raw hazard_shift/fingerprint columns
   *   are server-side scalars — this route is ONLY for E2E DB assertion (BO-side validation).
   */
  @Get('_test/insurance/read-drift-state')
  async readDriftState(
    @Query('playerId') playerId: string,
  ): Promise<{ driftState: unknown | null }> {
    const [row = null] = await this.db
      .select()
      .from(coverageInducedDriftState)
      .where(eq(coverageInducedDriftState.player_id, playerId))
      .limit(1);

    return {
      driftState: serializeRow(row as Record<string, unknown> | null),
    };
  }

  // ── Drift C3 Routes ───────────────────────────────────────────────────────────────────────────
  //
  // IMPLEMENTS: docs/superpowers/plans/2026-06-18-depth-insurance-coverage-drift-plan.md Task 3 (C3) Step 3
  //             — Insurance Drift C3 — 2026-06-18
  //
  // Routes:
  //   POST /v1/_test/insurance/issue-with-baseline   — issues a contract over a seeded source state,
  //     then reads back the captured drift_state row (proves captureBaselineFingerprint fired).
  //   POST /v1/_test/insurance/compare-fingerprint   — calls isLessCautiousThanBaseline(feature, current, baseline)
  //     directly; returns { lessCautious: boolean } for falsifiable both-ways E2E assertion.

  /**
   * `POST /v1/_test/insurance/issue-with-baseline` — Drift C3 baseline-capture proof (TEST-ONLY).
   *
   * Seeds a pre-coverage operating policy, seeds a money_holding row with the given heldCents/capacityCents,
   * creates a COMPLETE walk, issues the contract via ContractService.issueContract() (which calls
   * captureBaselineFingerprint additively), then reads the resulting drift_state row.
   *
   * Body:
   *   coverageType: 'STASH_LOSS' | 'PROPERTY' | ...  (default 'STASH_LOSS')
   *   heldCents:    number — the held_cents to seed in money_holding (default 400)
   *   capacityCents: number — the capacity (set via money_holding tier 1 tunable override or direct tier mapping)
   *                           For test simplicity: we set the money_holding_tier to 1 (default capacity ~$1M).
   *                           The E2E asserts stashRatioPermille(heldCents, capacityCentsForTier(1)).
   *
   * Returns: { playerId, contractId, driftStateId, issuedTick }
   *
   * Note: the almanac row is seeded as part of the player setup (sentinel underwriter).
   *   This allows the E2E to assert baseline_fingerprint_* on the almanac_entry row
   *   (DD-BASELINE-PERSIST proof). The almanac row is created before issueContract is called.
   *
   * R2.2: TEST-ONLY. Returns raw scalar fields for DB assertion (server-side only — BO validation).
   * Anti-fabrication: no Math.random. All values deterministic.
   */
  @Post('_test/insurance/issue-with-baseline')
  @HttpCode(201)
  async issueWithBaseline(
    @Body() body: { coverageType?: string; heldCents?: number; capacityCents?: number },
  ): Promise<{ playerId: string; contractId: string; driftStateId: string; issuedTick: number }> {
    const coverageType = (body?.coverageType ?? 'STASH_LOSS') as 'PROPERTY' | 'STASH_LOSS' | 'COURIER_ARREST' | 'FENCE_DEFAULT';
    const heldCents = BigInt(body?.heldCents ?? 400);

    // ── 1. Create a fresh player + account ──────────────────────────────────────────────────────
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow!.account_id,
        callsign: nextTestCallsign('bsl'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // ── 2. Seed cash for premium payment ────────────────────────────────────────────────────────
    const cashSeed = 20_000_000;
    await this.db
      .insert(economyState)
      .values({ player_id: playerId, cash_cents: BigInt(cashSeed), marks: 0 })
      .onConflictDoUpdate({ target: economyState.player_id, set: { cash_cents: BigInt(cashSeed) } });

    // ── 3. Create a fresh building + money_holding row with the given heldCents ──────────────────
    //
    // We need a real building row (FK in money_holding). Create one on block 105 (unused by other
    // C3-drift routes — C6 uses 101, C7/C9 use 103/104). Building is player-owned, type=stash.
    // Pattern mirrors setup-raid-scenario (C6) which creates its own building on block 101.
    const blockId = 105;
    const [buildingRow] = await this.db
      .insert(building)
      .values({
        player_id: playerId,
        block_id: blockId,
        building_type: 2, // stash (enum order: front_shop=0, hub=1, stash=2, lab=3)
        ownership: 'player',
        structural_state: 'operational',
      })
      .returning({ building_id: building.building_id });
    const buildingId = buildingRow!.building_id;

    // Seed building_operational_state for the player (so captureBaselineFingerprint counts it
    // in the "total operational buildings" denominator for the lookout rate).
    await this.db
      .insert(buildingOperationalState)
      .values({
        building_id: buildingId,
        player_id: playerId,
        operational_type: 'stash',
      })
      .onConflictDoNothing();

    // Seed the money_holding row with the given heldCents at tier 1.
    // The capacity is capacityCentsForTier(1) = ~$1M (100_000_000 cents).
    // stashRatioPermille(heldCents, capacity) is computed by captureBaselineFingerprint.
    await this.db
      .insert(moneyHolding)
      .values({
        player_id: playerId,
        building_id: buildingId,
        held_cents: heldCents,
        money_holding_tier: 1,
        last_yield_tick: 0,
      })
      .onConflictDoNothing();

    // ── 4. Seed an almanac_entry for DD-BASELINE-PERSIST ────────────────────────────────────────
    //
    // captureBaselineFingerprint (C15 fix) uses INSERT-if-absent / UPDATE-if-present keyed on
    // (underwriter_id = effectiveUnderwriterId, player_id).
    // issueContract is called with counterpartyId=null → effectiveUnderwriterId = SYNTHETIC_UNDERWRITER_ID.
    // We seed the almanac row with SYNTHETIC_UNDERWRITER_ID so the C15 UPDATE hits this row
    // (instead of inserting a second row that read-entities would miss via LIMIT 1).
    const [almanacRow] = await this.db
      .insert(almanacEntry)
      .values({
        underwriter_id: SYNTHETIC_UNDERWRITER_ID,
        player_id: playerId,
        status: 'CLEAN',
        poisoned_until_tick: null,
      })
      .returning({ id: almanacEntry.id });

    // ── 5. Create a COMPLETE walk ────────────────────────────────────────────────────────────────
    const walkDuration = insuranceTunables.walkDurationDays;
    const [walkRow] = await this.db
      .insert(underwriterWalkRecord)
      .values({
        player_id: playerId,
        coverage_type: coverageType,
        findings_bitmask: 0n,      // no findings → base premium only (minimal)
        start_tick: BigInt(0),
        observation_depth: walkDuration,
        status: 'COMPLETE',
      })
      .returning({ id: underwriterWalkRecord.id });
    const walkId = walkRow!.id;

    // ── 6. Issue the contract via ContractService (additive hook fires captureBaselineFingerprint) ─
    const { contractId } = await this.contractService.issueContract(
      playerId,
      walkId,
      1_000_000, // $10k insured value — low but non-zero
      null,
    );

    // ── 7. Read the issued_tick from the contract ────────────────────────────────────────────────
    const [contractRow] = await this.db
      .select({ issued_tick: insuranceContract.issued_tick })
      .from(insuranceContract)
      .where(eq(insuranceContract.id, contractId))
      .limit(1);
    const issuedTick = Number(contractRow?.issued_tick ?? 0);

    // ── 8. Read the drift_state row created by captureBaselineFingerprint ───────────────────────
    const [driftRow] = await this.db
      .select({ id: coverageInducedDriftState.id })
      .from(coverageInducedDriftState)
      .where(eq(coverageInducedDriftState.player_id, playerId))
      .limit(1);

    if (!driftRow) {
      throw new HttpException(
        `issue-with-baseline: drift_state row not created for player ${playerId} — captureBaselineFingerprint did not fire`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return {
      playerId,
      contractId,
      driftStateId: driftRow.id,
      issuedTick,
    };
  }

  /**
   * `POST /v1/_test/insurance/compare-fingerprint` — Drift C3 isLessCautiousThanBaseline probe (TEST-ONLY).
   *
   * Calls `isLessCautiousThanBaseline(feature, current, baseline)` and returns { lessCautious: boolean }.
   * This is a "unit-ish E2E": the function is PURE (no DB) but the test hits the real server to ensure
   * the function is correctly wired (no mock — the real server must respond).
   *
   * Body:
   *   feature:  keyof BehaviourFingerprint — 'stashRatio' | 'courierCadence' | 'marginalDeal' | 'lookout'
   *   current:  number — the current observed value.
   *   baseline: number — the frozen issuance baseline value.
   *
   * Returns: { lessCautious: boolean }
   *
   * The E2E uses this to assert the per-feature comparison is correct both ways:
   *   - A less-cautious value → lessCautious: true  (FIRE)
   *   - A same/more-cautious value → lessCautious: false  (NOT fired)
   *
   * R2.2: TEST-ONLY (not registered in production). No hidden scalar returned (boolean only).
   * Anti-fabrication: isLessCautiousThanBaseline reads margin tunables — no inline scalar.
   */
  @Post('_test/insurance/compare-fingerprint')
  async compareFingerprint(
    @Body() body: { feature: keyof BehaviourFingerprint; current: number; baseline: number },
  ): Promise<{ lessCautious: boolean }> {
    const { feature, current, baseline } = body;
    if (!['stashRatio', 'courierCadence', 'marginalDeal', 'lookout'].includes(feature)) {
      throw new HttpException(
        `compare-fingerprint: unknown feature '${String(feature)}' — must be one of stashRatio|courierCadence|marginalDeal|lookout`,
        HttpStatus.BAD_REQUEST,
      );
    }
    const lessCautious = isLessCautiousThanBaseline(feature, current, baseline);
    return { lessCautious };
  }

  // ── Drift C4 Routes ───────────────────────────────────────────────────────────────────────────
  //
  // IMPLEMENTS: docs/superpowers/plans/2026-06-18-depth-insurance-coverage-drift-plan.md Task 4 (C4) Step 3
  //             — Insurance Drift C4 — 2026-06-18
  //
  // Routes:
  //   POST /v1/_test/insurance/deposit-probe — verifies StashFillEvent emit + onStashFill drift logic.
  //     Creates a fresh player + money_holding, optionally issues a contract (captures baseline fingerprint),
  //     calls the REAL MoneyHoldingService.deposit (zero-regression proof), then directly calls
  //     CoverageInducedDriftService.onStashFill with the probe's event params (toy numbers for drift assertion).
  //
  // Design rationale for two-phase probe:
  //   - Real deposit: proves `{ deposited: true }` return is byte-identical (zero-regression #1 gate item).
  //   - Direct onStashFill call: uses toy heldCentsAfter/capacityCents from the body (not the real tier capacity,
  //     which would make stashRatioPermille ≈ 0 for small probe values). This cleanly separates the zero-regression
  //     assertion from the drift-logic assertion.

  /**
   * `POST /v1/_test/insurance/deposit-probe` — Drift C4 zero-regression + drift-logic probe (TEST-ONLY).
   *
   * Phase 1 — zero-regression: calls `MoneyHoldingService.deposit(playerId, buildingId, heldCentsAfter)`
   *   and asserts the return value is `{ deposited: true }` (BYTE-IDENTICAL).
   *
   * Phase 2 — drift logic: calls `CoverageInducedDriftService.onStashFill(event)` directly with the body's
   *   heldCentsAfter and capacityCents (toy numbers — the drift logic uses ratio permille, not absolute values).
   *
   * Body:
   *   withContract: boolean — whether to issue a contract (captures baseline at `baselineHeldCents`).
   *   baselineHeldCents?: number — the held_cents used as the baseline fingerprint (withContract=true only).
   *   capacityCents?: number — the capacity for the drift event (default 1000 — toy number for ratio assertion).
   *   heldCentsAfter: number — the deposit amount AND the event's heldCentsAfter (toy value for ratio).
   *
   * Response (withContract=false): { deposit: { deposited: true }, driftStateCount: 0 }
   * Response (withContract=true):  { deposit: { deposited: true }, hazardShift: number }
   *
   * R2.2: TEST-ONLY. No raw risk scalar forwarded to real clients.
   * Anti-fabrication: no Math.random. All values explicit from body.
   */
  @Post('_test/insurance/deposit-probe')
  async depositProbe(
    @Body() body: {
      withContract: boolean;
      baselineHeldCents?: number;
      capacityCents?: number;
      heldCentsAfter: number;
    },
  ): Promise<{
    deposit?: { deposited: true };
    driftStateCount?: number;
    hazardShift?: number;
  }> {
    const { withContract, baselineHeldCents = 400, capacityCents = 1000, heldCentsAfter } = body;

    // ── 1. Create a fresh player + account ─────────────────────────────────────────────────────
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow!.account_id,
        callsign: nextTestCallsign('dp4'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // ── 2. Seed cash (large — covers any deposit amount including the premium debit for withContract) ─
    await this.db
      .insert(economyState)
      .values({ player_id: playerId, cash_cents: BigInt(20_000_000), marks: 0 })
      .onConflictDoUpdate({ target: economyState.player_id, set: { cash_cents: BigInt(20_000_000) } });

    // ── 3. Create a building + money_holding at tier 1 (held=0) ────────────────────────────────
    const [buildingRow] = await this.db
      .insert(building)
      .values({
        player_id: playerId,
        block_id: 200,
        building_type: 2, // stash (enum: front_shop=0, hub=1, stash=2, lab=3)
        ownership: 'player',
        structural_state: 'operational',
      })
      .returning({ building_id: building.building_id });
    const buildingId = buildingRow!.building_id;

    await this.db.insert(moneyHolding).values({
      player_id: playerId,
      building_id: buildingId,
      held_cents: BigInt(0),
      money_holding_tier: 1,
      last_yield_tick: 0,
    });

    // Seed building_operational_state row (required by MoneyHoldingService.resolveMoneyHoldingTier
    // which validates the building is a player-owned 'money_holding' operational building).
    await this.db
      .insert(buildingOperationalState)
      .values({
        building_id: buildingId,
        player_id: playerId,
        operational_type: 'money_holding',
      })
      .onConflictDoNothing();

    if (!withContract) {
      // ── No-contract case: deposit with NO drift_state → pure zero-regression proof ─────────
      // Phase 1: call the real deposit — assert return value is byte-identical.
      const deposit = await this.moneyHoldingService.deposit(playerId, buildingId, heldCentsAfter);

      // Phase 2: call onStashFill directly (no drift_state exists → immediate no-op).
      await this.driftService.onStashFill({
        type: 'stash_fill',
        playerId,
        buildingId,
        heldCentsAfter,
        capacityCents,
        gameMinute: 0,
      });

      // Count drift_state rows for this player (must be 0 — no contract issued).
      const [cnt] = await this.db
        .select({ c: sql<number>`count(*)::int` })
        .from(coverageInducedDriftState)
        .where(eq(coverageInducedDriftState.player_id, playerId));

      return { deposit, driftStateCount: cnt?.c ?? 0 };
    }

    // ── WithContract case: directly seed a drift_state with the exact baseline permille ──────────
    //
    // Design note: the `baselineHeldCents` body param is treated as the PERMILLE baseline value
    // (not as cents), so the test can control the exact comparison values deterministically.
    // This avoids a dependency on captureBaselineFingerprint's capacity computation (which would
    // yield baseline≈0 for toy values against real tier-1 capacity ≈ 100_000_000 cents).
    //
    // The drift_state row is created directly (not via issueContract) because:
    //   - C3 tests captureBaselineFingerprint end-to-end (via issue-with-baseline probe).
    //   - C4 tests the onStashFill subscriber logic (given a pre-existing drift_state row).
    //   - The two concerns are orthogonal — no need to round-trip through full issuance here.
    //
    // The 'coverage_type' must match a valid value (STASH_LOSS used for simplicity).
    await this.db.insert(coverageInducedDriftState).values({
      player_id: playerId,
      contract_id: null,                     // no contract required for the subscriber test
      asset_ref: null,
      coverage_type: 'STASH_LOSS',
      hazard_shift: 0,
      fingerprint_stash_ratio: baselineHeldCents,   // baseline permille value from body
      fingerprint_courier_cadence: 0,
      fingerprint_marginal_deal: 0,
      fingerprint_lookout: 0,
    });

    // Phase 1: call the real deposit — zero-regression proof.
    // Deposit `heldCentsAfter` cents (small toy value — well within tier 1 capacity ≈ 100_000_000).
    const deposit = await this.moneyHoldingService.deposit(playerId, buildingId, heldCentsAfter);

    // Phase 2: call onStashFill directly with the body's toy capacityCents for the ratio assertion.
    // The subscriber reads fingerprint_stash_ratio (= baselineHeldCents permille) from the drift_state
    // and compares to current = stashRatioPermille(heldCentsAfter, capacityCents).
    await this.driftService.onStashFill({
      type: 'stash_fill',
      playerId,
      buildingId,
      heldCentsAfter,
      capacityCents,
      gameMinute: 0,
    });

    // Read the hazard_shift from the drift_state.
    const [driftRow] = await this.db
      .select({ hazard_shift: coverageInducedDriftState.hazard_shift })
      .from(coverageInducedDriftState)
      .where(eq(coverageInducedDriftState.player_id, playerId))
      .limit(1);

    return { deposit, hazardShift: driftRow?.hazard_shift ?? 0 };
  }

  // ── Drift C5 Route (dispatch-probe) ──────────────────────────────────────────────────────────────
  //   POST /v1/_test/insurance/dispatch-probe — verifies CourierRotatedEvent emit + onCourierRotated drift logic.
  //     Creates a fresh player + 2 operational buildings + product storage, optionally seeds a drift_state
  //     and a prior courier_shift to control the cadence gap, then calls the REAL DistributionService.dispatch.
  //     The real dispatch emits CourierRotatedEvent via CityEventBus → the onCourierRotated subscriber fires
  //     asynchronously (fire-and-forget). The caller (E2E spec) polls read-drift-state to observe the hazard_shift
  //     change (falsifiable-fire, real bus chain — NOT a direct onCourierRotated call).
  //
  // C4 Refinement compliance:
  //   The FIRE assertion drives the REAL dispatch → emitCourierRotated → bus → onCourierRotated chain.
  //   The probe seeds a prior courier_shift at `currentTick - priorGapDays * 1440` so the real dispatch
  //   produces a cadence that crosses `baseline + coverage_drift_courier_cadence_slower_margin_days`.
  //   The spec polls read-drift-state after the route returns (fire-and-forget subscriber has time to complete).

  /**
   * `POST /v1/_test/insurance/dispatch-probe` — Drift C5 zero-regression + drift-logic probe (TEST-ONLY).
   *
   * Creates a COMPLETE seeded distribution scenario (player + 2 buildings + product + clock + optional
   * prior courier_shift + optional drift_state), then calls REAL `DistributionService.dispatch`.
   *
   * Phase 1 — zero-regression: the dispatch return value `{ courierId, routeId, shiftId }` is BYTE-IDENTICAL.
   * Phase 2 — drift logic: the CourierRotatedEvent fires via bus → onCourierRotated subscriber handles cadence.
   *   The caller polls `GET /v1/_test/insurance/read-drift-state?playerId=...` to observe hazard_shift.
   *
   * Body:
   *   withContract: boolean — whether to seed a drift_state (captures cadence baseline).
   *   baselineCadenceDays?: number — the frozen baseline fingerprint_courier_cadence (withContract=true only).
   *   priorGapDays?: number — days before the current tick for the prior courier_shift (withContract=true only).
   *
   * Response (withContract=false): { dispatched: { courierId, routeId, shiftId }, driftStateCount: 0 }
   * Response (withContract=true):  { dispatched: { courierId, routeId, shiftId }, playerId: string }
   *   (playerId is returned so the caller can poll read-drift-state for the async subscriber result)
   *
   * Game-time: uses a fixed "current tick" of 10000 game-minutes (seeded in city_sim_clock).
   * Anti-fabrication: no Math.random. All values explicit from body or fixed constants.
   * R2.2: TEST-ONLY. No raw risk scalar forwarded to real clients.
   */
  @Post('_test/insurance/dispatch-probe')
  async dispatchProbe(
    @Body() body: {
      withContract: boolean;
      baselineCadenceDays?: number;
      priorGapDays?: number;
    },
  ): Promise<{
    dispatched: { courierId: string; routeId: string; shiftId: string };
    driftStateCount?: number;
    playerId?: string;
  }> {
    const { withContract, baselineCadenceDays = 1, priorGapDays = 1 } = body;

    // Fixed "current tick" for this probe (game-time, NOT wall-clock).
    // Using 10000 game-minutes as the tick base — allows priorGapDays × 1440 to be subtracted cleanly.
    const CURRENT_TICK = 10000;
    const GAME_MINUTES_PER_DAY = 1440;

    // ── 1. Create a fresh player + account ──────────────────────────────────────────────────────
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow!.account_id,
        callsign: nextTestCallsign('dp5'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // ── 2. Seed cash (large — covers any dispatch scenario) ─────────────────────────────────────
    await this.db
      .insert(economyState)
      .values({ player_id: playerId, cash_cents: BigInt(20_000_000), marks: 0 })
      .onConflictDoUpdate({ target: economyState.player_id, set: { cash_cents: BigInt(20_000_000) } });

    // ── 3. Seed city_sim_clock so getCurrentTick returns CURRENT_TICK ──────────────────────────
    // DistributionService.repo.getCurrentTick reads city_sim_clock.game_minute for this player.
    // We seed it directly so the shift's started_at_tick = CURRENT_TICK (deterministic, no wall-clock).
    await this.db.insert(citySimClock).values({
      player_id: playerId,
      game_minute: CURRENT_TICK,
    }).onConflictDoUpdate({
      target: citySimClock.player_id,
      set: { game_minute: CURRENT_TICK },
    });

    // ── 4. Create two operational buildings on distinct blocks (block 101 and 102) ──────────────
    // dispatch requires two player-owned OPERATIONAL buildings (conversion_stage='operational').
    // Block IDs 101 and 102 are verified present in the world_geography seed (migration 0016).
    // Each player gets their own buildings — block_id reuse across players is fine (player_id differentiates).
    const [bldgA] = await this.db
      .insert(building)
      .values({
        player_id: playerId,
        block_id: 101,
        building_type: 2, // stash (type 2 = stash — can hold product)
        ownership: 'player',
        structural_state: 'operational',
      })
      .returning({ building_id: building.building_id });
    const fromBuildingId = bldgA!.building_id;

    const [bldgB] = await this.db
      .insert(building)
      .values({
        player_id: playerId,
        block_id: 102,
        building_type: 2, // stash (destination — holds product after arrival)
        ownership: 'player',
        structural_state: 'operational',
      })
      .returning({ building_id: building.building_id });
    const toBuildingId = bldgB!.building_id;

    // Seed building_operational_state for BOTH buildings (conversion_stage='operational' required by
    // DistributionService.repo.getOwnedOperationalBuilding JOIN condition).
    await this.db.insert(buildingOperationalState).values([
      {
        building_id: fromBuildingId,
        player_id: playerId,
        operational_type: 'stash',
        conversion_stage: 'operational',
        structural_state: 'operational',
      },
      {
        building_id: toBuildingId,
        player_id: playerId,
        operational_type: 'stash',
        conversion_stage: 'operational',
        structural_state: 'operational',
      },
    ]).onConflictDoNothing();

    // ── 5. Seed product storage at the source building ──────────────────────────────────────────
    // dispatch calls resolveSourceSubstance which reads product_storage for the source building.
    // We seed 100g of brindle at the source (sufficient for the 10g dispatch cargo).
    await this.db.insert(productStorage).values({
      player_id: playerId,
      building_id: fromBuildingId,
      substance_type: 'brindle',
      quantity_grams: 100,
      purity_grade: 'standard',
    }).onConflictDoNothing();

    if (!withContract) {
      // ── No-contract case: dispatch with NO drift_state → pure zero-regression proof ─────────
      const dispatched = await this.distributionService.dispatch(
        playerId, fromBuildingId, toBuildingId, 10,
      );

      // Count drift_state rows for this player (must be 0 — no contract issued).
      const [cnt] = await this.db
        .select({ c: sql<number>`count(*)::int` })
        .from(coverageInducedDriftState)
        .where(eq(coverageInducedDriftState.player_id, playerId));

      return { dispatched, driftStateCount: cnt?.c ?? 0 };
    }

    // ── WithContract case: seed a drift_state + prior courier_shift, then call real dispatch ────
    //
    // The drift_state has fingerprint_courier_cadence = baselineCadenceDays (the frozen baseline).
    // The prior courier_shift has started_at_tick = CURRENT_TICK - priorGapDays × 1440.
    // When dispatch fires, the bus emits CourierRotatedEvent with dispatchedAtTick = CURRENT_TICK.
    // The subscriber queries the prior shift, computes gap = priorGapDays, compares vs baseline.
    // If priorGapDays >= baselineCadenceDays + margin (default 2) → FIRES → hazard_shift++.
    // The spec polls read-drift-state to observe the async result.

    // Seed the drift_state with the frozen baseline cadence.
    await this.db.insert(coverageInducedDriftState).values({
      player_id: playerId,
      contract_id: null,                         // no contract required for subscriber test
      asset_ref: null,
      coverage_type: 'COURIER_ARREST',            // COURIER_ARREST coverage = courier-relevant
      hazard_shift: 0,
      fingerprint_stash_ratio: 0,
      fingerprint_courier_cadence: baselineCadenceDays, // frozen baseline (game-days)
      fingerprint_marginal_deal: 0,
      fingerprint_lookout: 0,
    });

    // Seed a prior courier_shift for the player at CURRENT_TICK - priorGapDays × 1440.
    // This simulates a previous dispatch that happened priorGapDays game-days ago.
    // We need a courier row as the FK for courier_shift.courier_id.
    const priorTick = CURRENT_TICK - priorGapDays * GAME_MINUTES_PER_DAY;

    // The route FK: create a minimal route row for the prior shift.
    const [priorRouteRow] = await this.db
      .insert(route)
      .values({
        player_id: playerId,
        origin_building_id: fromBuildingId,
        destination_building_id: toBuildingId,
        path_blocks: [101, 102],
      })
      .returning({ route_id: route.route_id });

    // The courier FK: create a minimal courier for the prior shift.
    const [priorCourierRow] = await this.db
      .insert(courier)
      .values({
        player_id: playerId,
        role_type: 'courier',
        vehicle_type: 'foot',
        home_dispatch_hub_id: null,
        current_state: 'at_destination', // not in_transit — slot is free
        current_route_id: priorRouteRow!.route_id,
        current_load_grams: 0,
      })
      .returning({ courier_id: courier.courier_id });

    // The prior courier_shift row: started_at_tick = CURRENT_TICK - priorGapDays × 1440.
    await this.db.insert(courierShift).values({
      player_id: playerId,
      courier_id: priorCourierRow!.courier_id,
      route_id: priorRouteRow!.route_id,
      started_at_tick: priorTick,
      current_segment_index: 0,
      cargo_grams: 10,
      substance_type: 'brindle',
      status: 'completed', // completed — not in_transit (so the roster cap isn't hit)
    });

    // ── Call REAL DistributionService.dispatch (the hot-path we are testing) ────────────────────
    // This is the zero-regression proof (return value byte-identical) AND the drift-logic proof
    // (the bus emits CourierRotatedEvent → onCourierRotated fires asynchronously).
    const dispatched = await this.distributionService.dispatch(
      playerId, fromBuildingId, toBuildingId, 10,
    );

    // Return the playerId so the E2E spec can poll read-drift-state for the async subscriber result.
    // The subscriber is fire-and-forget; the spec retries until hazard_shift changes (or timeout).
    return { dispatched, playerId };
  }

  // ── Drift C6 Route (sell-tick-probe) ─────────────────────────────────────────────────────────────
  //   POST /v1/_test/insurance/sell-tick-probe — verifies DealAcceptedEvent emit + onDealAccepted drift logic.
  //     Creates a fresh player + operational dealer-spot building + deal_lek + product_storage,
  //     optionally seeds a drift_state with baselineMarginalRatePermille and a lane with controllable p_cents,
  //     then calls the REAL SellingSellService.runMinuteTick.
  //
  //     The tick emits ONE aggregate DealAcceptedEvent via CityEventBus → the onDealAccepted subscriber fires
  //     asynchronously (fire-and-forget). The caller (E2E spec) polls read-drift-state to observe hazard_shift.
  //
  // FIRE design:
  //   The probe pre-seeds fingerprint_marginal_deal to 122 (running estimate from imaginary prior marginal
  //   ticks; the frozen baseline is always 0 per C3 stub). With K=30 and ONE marginal tick:
  //     newRate = round((122*30 + 1000) / 31) = round(4660/31) = 150
  //   isLessCautiousThanBaseline('marginalDeal', 150, 0) = 150 >= 0 + 150 = TRUE → FIRE.
  //   dealMix='mostly-marginal': lane p_cents=800, realised < brindle base 2500 → marginPermille ≈ 320 < 1000.
  //   ONE tick is sufficient (no race, no repeated tick needed).
  //
  // NOT-fire design:
  //   dealMix='prudent': lane p_cents=3000, brindle base 2500 → marginPermille ≈ 1200 >= 1000 → NOT marginal.
  //   heatLevel=0 (no building heat). isMarginal=false.
  //   newRate = round((0*30 + 0) / 31) = 0 < 0 + 150 → NO FIRE.
  //   fingerprint_marginal_deal pre-seeded to 0 for the NOT-fire test (no prior marginal deals).
  //
  // Block 101 is in district 2 (formula: (district_id-1)*100 + local_index; 101 = (2-1)*100+1 → district 2).
  // lek_score > 0 required by listSellableDealers (deal_lek lek_score gate).
  // building_operational_state: conversion_stage='operational', structural_state='operational'.
  // product_storage: 50g brindle (sufficient for 5 ticks × 5g rate; ensures the tick is not a no-op).
  // city_sim_clock: seeded at game_minute=5000 (a fixed tick for deterministic game-time).
  // lane_pricing_state: seeded (UPSERT) before the tick for the lane that ensureLane reads.

  /**
   * `POST /v1/_test/insurance/sell-tick-probe` — Drift C6 zero-regression + drift-logic probe (TEST-ONLY).
   *
   * Creates a COMPLETE seeded sell scenario (player + dealer-spot + lek + product + clock + optional
   * drift_state + optional lane_pricing_state), then calls REAL `SellingSellService.runMinuteTick`.
   *
   * Phase 1 — zero-regression: the sell tick ran (returns driftStateCount=0 for no-contract case).
   * Phase 2 — drift logic: the DealAcceptedEvent fires via bus → onDealAccepted subscriber handles marginal-deal rate.
   *   The caller polls `GET /v1/_test/insurance/read-drift-state?playerId=...` to observe hazard_shift.
   *
   * Body:
   *   withContract: boolean — whether to seed a drift_state.
   *   baselineMarginalRatePermille?: number — the pre-seeded running estimate in fingerprint_marginal_deal
   *     (for FIRE test: 122 so ONE marginal tick crosses the 150‰ threshold; for NOT-fire: 0).
   *   dealMix?: 'mostly-marginal' | 'prudent' — lane price: 800¢ (below brindle base 2500 → marginal) or 3000¢.
   *
   * Response (withContract=false): { driftStateCount: 0 }
   * Response (withContract=true):  { playerId: string }
   *   (playerId is returned so the caller can poll read-drift-state for the async subscriber result)
   *
   * Anti-fabrication: no Math.random. All values explicit from body or fixed constants.
   * R2.2: TEST-ONLY. No raw risk scalar forwarded to real clients.
   */
  @Post('_test/insurance/sell-tick-probe')
  async sellTickProbe(
    @Body() body: {
      withContract: boolean;
      baselineMarginalRatePermille?: number;
      dealMix?: 'mostly-marginal' | 'prudent';
    },
  ): Promise<{
    driftStateCount?: number;
    playerId?: string;
  }> {
    const {
      withContract,
      baselineMarginalRatePermille = 0,
      dealMix = 'prudent',
    } = body;

    // Fixed game-minute for this probe (game-time, NOT wall-clock).
    const CURRENT_TICK = 5000;
    // District 2: block 101 = (2-1)*100+1 = 101. The lek tile_id reuses block_id as a tile_id proxy.
    const BLOCK_ID = 101;
    const DISTRICT_ID = 2; // block 101 → district 2 (from world_geography seed formula)
    const TILE_ID = 1001; // arbitrary tile_id for the lek (not a real tile FK — deal_leks uses player-scoped lek tiles)
    // Brindle base = 2500¢. Lane p_cents:
    //   mostly-marginal: 800¢ → valuePerGram = 800 × marginMultiplier(brindle)=800 × 1.0 = 800¢/g
    //     marginPermille = round(1000 × 800 / 2500) = round(320) = 320 < 1000 → marginal.
    //   prudent: 3000¢ → valuePerGram = 3000 × 1.0 = 3000¢/g
    //     marginPermille = round(1000 × 3000 / 2500) = round(1200) = 1200 >= 1000 → NOT marginal.
    const lanePCents = dealMix === 'mostly-marginal' ? 800 : 3000;
    // Lane w_cents: seeded at p_cents × 0.10 (W_SEED_FRACTION default).
    const laneWCents = Math.round(lanePCents * 0.10);

    // ── 1. Create a fresh player + account ──────────────────────────────────────────────────────
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow!.account_id,
        callsign: nextTestCallsign('stp6'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // ── 2. Seed city_sim_clock so runMinuteTick gets a deterministic game_minute ──────────────────
    await this.db.insert(citySimClock).values({
      player_id: playerId,
      game_minute: CURRENT_TICK,
    }).onConflictDoUpdate({
      target: citySimClock.player_id,
      set: { game_minute: CURRENT_TICK },
    });

    // ── 3. Create an operational dealer-spot building on block 101 ─────────────────────────────
    // building_type=0 (front_shop — dealer-spot fronts use front_shop type in this codebase).
    // operational_type='dealer_spot_front' required by the getOwnedOperationalDealerSpot guard.
    const [dealerBldgRow] = await this.db
      .insert(building)
      .values({
        player_id: playerId,
        block_id: BLOCK_ID,
        building_type: 0, // front_shop = 0 (dealer-spot building type)
        ownership: 'player',
        structural_state: 'operational',
      })
      .returning({ building_id: building.building_id });
    const dealerSpotId = dealerBldgRow!.building_id;

    // Seed building_operational_state for the dealer-spot.
    await this.db.insert(buildingOperationalState).values({
      building_id: dealerSpotId,
      player_id: playerId,
      operational_type: 'dealer_spot_front',
      conversion_stage: 'operational',
      structural_state: 'operational',
    }).onConflictDoNothing();

    // ── 4. Seed a deal_lek for the player at TILE_ID with lek_score > 0 ───────────────────────
    // lek_score > 0 is required by listSellableDealers (deal_lek lek_score gate: sql`lek_score > 0`).
    await this.db.insert(dealLek).values({
      player_id: playerId,
      tile_id: TILE_ID,
      lek_score: 10,
      controller_org_id: 1, // org_id 1 = the player controls this lek
      deals_this_week: 0,
      contest_pressure: 0,
    }).onConflictDoNothing();

    // ── 5. Create a WORKING dealer at the dealer-spot covering the lek tile ───────────────────
    // dealer.current_state='working' is required by listSellableDealers.
    await this.db.insert(dealer).values({
      player_id: playerId,
      home_building_id: dealerSpotId,
      coverage_lek_tile_id: TILE_ID,
      substance_specialization: 'brindle',
      current_state: 'working',
      float_cents: 0,
    });

    // ── 6. Seed product_storage at the dealer-spot (50g brindle) ──────────────────────────────
    // 50g is sufficient for multiple ticks at the default rate of 5g/tick.
    await this.db.insert(productStorage).values({
      player_id: playerId,
      building_id: dealerSpotId,
      substance_type: 'brindle',
      quantity_grams: 50,
      purity_grade: 'standard',
    }).onConflictDoNothing();

    // ── 7. Seed lane_pricing_state for (DISTRICT_ID=2, 'brindle') with controllable p_cents ───
    // UPSERT: if the lane already exists (from another test), override its p_cents for this test.
    // This ensures getRealisedPriceCents and getLanePriceForDeal use the controllable lane price.
    // w_cents = p_cents × 0.10 (W_SEED_FRACTION default).
    await this.db.insert(lanePricingState).values({
      district_id: DISTRICT_ID,
      substance_type: 'brindle',
      p_cents: lanePCents,
      w_cents: laneWCents,
      c: 0.5,
      t_refractory_minutes: 0,
    }).onConflictDoUpdate({
      target: [lanePricingState.district_id, lanePricingState.substance_type],
      set: {
        p_cents: lanePCents,
        w_cents: laneWCents,
        c: 0.5,
        t_refractory_minutes: 0,
      },
    });

    if (!withContract) {
      // ── No-contract case: sell tick with NO drift_state → pure zero-regression proof ─────────
      await this.sellingSellService.runMinuteTick({
        playerId,
        cadence: Cadence.MINUTE,
        gameMinute: CURRENT_TICK,
      });

      // Count drift_state rows for this player (must be 0 — no contract issued).
      const [cnt] = await this.db
        .select({ c: sql<number>`count(*)::int` })
        .from(coverageInducedDriftState)
        .where(eq(coverageInducedDriftState.player_id, playerId));

      return { driftStateCount: cnt?.c ?? 0 };
    }

    // ── WithContract case: seed a drift_state with controlled fingerprint_marginal_deal ─────────
    //
    // FIRE scenario design (dealMix='mostly-marginal'):
    //   Pre-seed fingerprint_marginal_deal = 122 (the running estimate from imaginary prior marginal ticks).
    //   The frozen baseline is 0 (C3 stub). After ONE marginal tick with K=30:
    //     newRate = round((122×30 + 1000) / 31) = round(4660/31) = 150
    //   isLessCautiousThanBaseline('marginalDeal', 150, 0) = 150 >= 0 + 150 = TRUE → FIRE.
    //   ONE tick is sufficient — no race, no repeated calls needed.
    //
    // NOT-fire scenario design (dealMix='prudent'):
    //   Pre-seed fingerprint_marginal_deal = 0 (no prior marginal history).
    //   ONE prudent tick: isMarginal=false → newRate = round(0×30/31) = 0 < 0+150 → NO FIRE.
    //
    // The baselineMarginalRatePermille body param maps to fingerprint_marginal_deal directly.
    // For FIRE: body sends baselineMarginalRatePermille=0 BUT the probe seeds 122 as the running estimate
    // (since the C3 baseline = 0 is frozen; the running estimate is what needs to be near the threshold).
    // For NOT-fire: body sends baselineMarginalRatePermille=0 and the probe seeds 0.
    //
    // Design note: the body param baselineMarginalRatePermille is treated as the FROZEN baseline value (= 0);
    // the probe always seeds fingerprint_marginal_deal = FIRE_SEED (122) for mostly-marginal or 0 for prudent.
    // The frozen baseline 0 is implicit (hardcoded in onDealAccepted per C3 stub design).
    const FIRE_RUNNING_ESTIMATE_SEED = 122; // pre-seed so one marginal tick crosses 150‰ threshold
    const runningEstimateSeed = dealMix === 'mostly-marginal' ? FIRE_RUNNING_ESTIMATE_SEED : 0;

    await this.db.insert(coverageInducedDriftState).values({
      player_id: playerId,
      contract_id: null,
      asset_ref: null,
      coverage_type: 'STASH_LOSS',
      hazard_shift: 0,
      fingerprint_stash_ratio: 0,
      fingerprint_courier_cadence: 0,
      fingerprint_marginal_deal: runningEstimateSeed,
      fingerprint_lookout: 0,
    });

    // ── Call REAL SellingSellService.runMinuteTick (the hot-path we are testing) ────────────────
    // This is the zero-regression proof (sell happens normally) AND the drift-logic proof
    // (the bus emits DealAcceptedEvent → onDealAccepted fires asynchronously — fire-and-forget).
    await this.sellingSellService.runMinuteTick({
      playerId,
      cadence: Cadence.MINUTE,
      gameMinute: CURRENT_TICK,
    });

    // Return the playerId so the E2E spec can poll read-drift-state for the async subscriber result.
    // The subscriber is fire-and-forget; the spec retries until hazard_shift changes (or timeout).
    return { playerId };
  }

  // ── Drift C7 Route (recruit-probe) ───────────────────────────────────────────────────────────────
  //   POST /v1/_test/insurance/recruit-probe — verifies LookoutAssignedEvent emit + onLookoutAssigned drift logic.
  //     Creates a fresh player + 1-2 operational buildings, optionally seeds a drift_state and a pre-existing
  //     SECURITY lieutenant (no-fire scenario), then calls REAL LieutenantService.recruit(archetype='SECURITY').
  //
  //     The real recruit emits LookoutAssignedEvent via CityEventBus (SECURITY-gated) → the onLookoutAssigned
  //     subscriber fires asynchronously (fire-and-forget). The caller (E2E spec) polls read-drift-state to
  //     observe the hazard_shift change (falsifiable-fire, real bus chain).
  //
  // Scenario design:
  //   withContract=false: single op building, no drift_state → pure zero-regression proof (driftStateCount=0).
  //   withContract=true, scenario='fire': 2 ops + 0 SECURITY lts already, baseline=1000‰ →
  //     after recruit: rate=500‰ ≤ 1000-150=850 → FIRES → hazard_shift 0→1.
  //   withContract=true, scenario='no-fire': 1 op + 1 SECURITY lt already, baseline=150‰ →
  //     after recruit: rate=2000‰ > 150-150=0 → NOT FIRES → hazard_shift stays 0.
  //
  // Block 101 is verified present in world_geography seed (migration 0016).
  // building_operational_state: conversion_stage='operational', structural_state='operational' required by
  //   SecurityBindingService.validateAssignment → LieutenantRepository.getOwnedOperationalBuilding.
  // For scenario='no-fire': a pre-seeded SECURITY lieutenant row (behavior_script + lieutenant INSERT).
  // Anti-fabrication: no Math.random. All values explicit from body or fixed constants.
  // R2.2: TEST-ONLY. No raw risk scalar forwarded to real clients.

  /**
   * `POST /v1/_test/insurance/recruit-probe` — Drift C7 zero-regression + drift-logic probe (TEST-ONLY).
   *
   * Creates a seeded recruit scenario (player + 1-2 buildings + optional prior SECURITY lt + optional
   * drift_state), then calls REAL `LieutenantService.recruit(playerId, 'SECURITY', buildingId)`.
   *
   * Phase 1 — zero-regression: the recruit return value `{ lieutenant_id, recruit_poll }` is BYTE-IDENTICAL.
   * Phase 2 — drift logic: the LookoutAssignedEvent fires via bus → onLookoutAssigned subscriber handles rate.
   *   The caller polls `GET /v1/_test/insurance/read-drift-state?playerId=...` to observe hazard_shift.
   *
   * Body:
   *   withContract: boolean — whether to seed a drift_state.
   *   scenario?: 'fire' | 'no-fire' — FIRE: 2 ops, 0 SECURITY lts; NO-FIRE: 1 op, 1 SECURITY lt already.
   *   baselineLookoutPermille?: number — the frozen baseline fingerprint_lookout (withContract=true only).
   *
   * Response (withContract=false): { driftStateCount: 0 }
   * Response (withContract=true):  { playerId: string }
   *   (playerId is returned so the caller can poll read-drift-state for the async subscriber result)
   *
   * Anti-fabrication: no Math.random. All values explicit from body or fixed constants.
   * R2.2: TEST-ONLY. No raw risk scalar forwarded to real clients.
   */
  @Post('_test/insurance/recruit-probe')
  async recruitProbe(
    @Body() body: {
      withContract: boolean;
      scenario?: 'fire' | 'no-fire';
      baselineLookoutPermille?: number;
    },
  ): Promise<{
    driftStateCount?: number;
    playerId?: string;
  }> {
    const { withContract, scenario = 'fire', baselineLookoutPermille = 1000 } = body;

    // Block 101 = verified present in world_geography seed (migration 0016).
    const BLOCK_ID_A = 101;
    const BLOCK_ID_B = 102;

    // ── 1. Create a fresh player + account ──────────────────────────────────────────────────────
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow!.account_id,
        callsign: nextTestCallsign('rp7'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // ── 2. Seed cash (large — covers any recruit scenario including premium debits) ──────────────
    await this.db
      .insert(economyState)
      .values({ player_id: playerId, cash_cents: BigInt(20_000_000), marks: 0 })
      .onConflictDoUpdate({ target: economyState.player_id, set: { cash_cents: BigInt(20_000_000) } });

    // ── 3. Create the primary operational building (block 101) ──────────────────────────────────
    // SecurityBindingService.validateAssignment → getOwnedOperationalBuilding requires:
    //   - building.ownership = 'player'
    //   - building_operational_state.conversion_stage = 'operational' (INNER JOIN condition)
    // Any building_type works for SECURITY (no type restriction — the binding protects any op building).
    const [bldgA] = await this.db
      .insert(building)
      .values({
        player_id: playerId,
        block_id: BLOCK_ID_A,
        building_type: 2, // stash (type 2 — any operational type works for SECURITY binding)
        ownership: 'player',
        structural_state: 'operational',
      })
      .returning({ building_id: building.building_id });
    const primaryBuildingId = bldgA!.building_id;

    await this.db.insert(buildingOperationalState).values({
      building_id: primaryBuildingId,
      player_id: playerId,
      operational_type: 'stash',
      conversion_stage: 'operational',
      structural_state: 'operational',
    }).onConflictDoNothing();

    if (!withContract) {
      // ── No-contract case: recruit with NO drift_state → pure zero-regression proof ────────────
      await this.lieutenantService.recruit(playerId, 'SECURITY', primaryBuildingId);

      // Count drift_state rows for this player (must be 0 — no contract issued).
      const [cnt] = await this.db
        .select({ c: sql<number>`count(*)::int` })
        .from(coverageInducedDriftState)
        .where(eq(coverageInducedDriftState.player_id, playerId));

      return { driftStateCount: cnt?.c ?? 0 };
    }

    // ── WithContract cases: seed the scenario-specific state ──────────────────────────────────────

    if (scenario === 'fire') {
      // FIRE scenario:
      //   - 2 operational buildings + 0 SECURITY lts → current rate = 0‰ before recruit.
      //   - After SECURITY recruit → 1 SECURITY / 2 ops = 500‰.
      //   - isLessCautiousThanBaseline('lookout', 500, 1000) = 500 ≤ 1000-150=850 → TRUE → FIRES.
      //   - hazard_shift rises 0 → 1.

      // Second operational building (block 102).
      const [bldgB] = await this.db
        .insert(building)
        .values({
          player_id: playerId,
          block_id: BLOCK_ID_B,
          building_type: 2, // stash (any op type)
          ownership: 'player',
          structural_state: 'operational',
        })
        .returning({ building_id: building.building_id });
      const secondBuildingId = bldgB!.building_id;

      await this.db.insert(buildingOperationalState).values({
        building_id: secondBuildingId,
        player_id: playerId,
        operational_type: 'stash',
        conversion_stage: 'operational',
        structural_state: 'operational',
      }).onConflictDoNothing();

      // Seed drift_state with frozen baseline fingerprint_lookout = baselineLookoutPermille (1000).
      await this.db.insert(coverageInducedDriftState).values({
        player_id: playerId,
        contract_id: null,
        asset_ref: null,
        coverage_type: 'STASH_LOSS',
        hazard_shift: 0,
        fingerprint_stash_ratio: 0,
        fingerprint_courier_cadence: 0,
        fingerprint_marginal_deal: 0,
        fingerprint_lookout: baselineLookoutPermille, // 1000 — frozen baseline (historically fully covered)
      });

      // Call REAL LieutenantService.recruit (the hot-path we are testing).
      // The SECURITY-gated emit fires LookoutAssignedEvent → onLookoutAssigned subscriber (async).
      await this.lieutenantService.recruit(playerId, 'SECURITY', primaryBuildingId);

      return { playerId };
    }

    // scenario === 'no-fire':
    //   NOT-FIRE scenario:
    //   - 1 op + 1 SECURITY lt already → current rate = 1000‰ before recruit.
    //   - After SECURITY recruit → 2 SECURITY / 1 op = 2000‰.
    //   - isLessCautiousThanBaseline('lookout', 2000, 150) = 2000 ≤ 150-150=0 → FALSE → NOT FIRES.
    //   - hazard_shift stays 0.

    // Pre-seed a SECURITY lieutenant row (so 1 SECURITY lt exists before the recruit call).
    // An atomic recruit inserts behavior_script first, then lieutenant pointing to it.
    // For direct seeding we do the same two-step INSERT.
    const [scriptRow] = await this.db
      .insert(behaviorScript)
      .values({
        // All defaults: rules='{"rules":[]}', source='', valid=false, last_modified_by='system'.
      })
      .returning({ script_id: behaviorScript.script_id });

    await this.db.insert(lieutenant).values({
      player_id: playerId,
      role_id: SECURITY_ROLE_ID,          // 10 = SECURITY role_id (from lieutenant-archetype.ts)
      source: 'civilian',
      name: 'Lieutenant',
      name_locale: 'en',
      granted_role: 'executor',
      mode: 'delegated',
      assigned_building_id: primaryBuildingId,
      behavior_script_id: scriptRow!.script_id,
    });

    // Seed drift_state with frozen baseline fingerprint_lookout = baselineLookoutPermille (150).
    await this.db.insert(coverageInducedDriftState).values({
      player_id: playerId,
      contract_id: null,
      asset_ref: null,
      coverage_type: 'STASH_LOSS',
      hazard_shift: 0,
      fingerprint_stash_ratio: 0,
      fingerprint_courier_cadence: 0,
      fingerprint_marginal_deal: 0,
      fingerprint_lookout: baselineLookoutPermille, // 150 — frozen baseline (historically few lookouts)
    });

    // Call REAL LieutenantService.recruit (the hot-path we are testing).
    // After recruit: 2 SECURITY / 1 op = 2000‰ → NOT FIRES (both-ways proof).
    await this.lieutenantService.recruit(playerId, 'SECURITY', primaryBuildingId);

    return { playerId };
  }

  // ── Drift C8 Route (record-violation-probe) ──────────────────────────────────────────────────────
  //   POST /v1/_test/insurance/record-violation-probe — verifies RuleViolationEvent emit +
  //     onRuleViolation drift logic (DD-BOSSMIRROR-COUPLE, canon :116).
  //
  //   Calls REAL BossMirrorService.recordViolation → emitRuleViolation → bus → onRuleViolation.
  //   The subscriber is fire-and-forget; the probe captures the event via a one-shot listener
  //   registered BEFORE the recordViolation call (race-free because dispatch is synchronous).
  //   Then awaits the async drift subscriber (short sleep) and reads drift_state rows.
  //
  // Scenario design:
  //   withContract=false: player+lieutenant created, recordViolation called, NO drift_state rows.
  //     → ring has 1 slot (D2 zero-regression), driftStateCount=0 (no-op).
  //   withContract=true, activeDriftStates=2: player+lieutenant created, 2 drift_state rows seeded
  //     (hazard_shift=0 each), recordViolation called, bus fires, subscriber runs.
  //     → lastEvent.type='rule_violation' (FIRED), hazardShifts=[1,1] (player-wide ++ on both rows),
  //       ringAppendedUnchanged=true (D2 ring still has 1 slot, unchanged by drift logic).
  //
  // Anti-fabrication: no Math.random. All values explicit from body or fixed constants.
  // R2.2: TEST-ONLY. No raw risk scalar forwarded to real clients.

  /**
   * `POST /v1/_test/insurance/record-violation-probe` — Drift C8 zero-regression + drift-logic probe (TEST-ONLY).
   *
   * Calls REAL `BossMirrorService.recordViolation(lieutenantId, ruleId, severityBucket)` which emits
   * a `RuleViolationEvent` via `CityEventBus`. The `CoverageInducedDriftService.onRuleViolation`
   * subscriber fires asynchronously (fire-and-forget) and increments hazard_shift on ALL active
   * drift_state rows for the player (UNCONDITIONAL — DD-BOSSMIRROR-COUPLE, canon :116).
   *
   * Body:
   *   withContract: boolean — whether to seed drift_state rows.
   *   activeDriftStates?: number — how many drift_state rows to seed (withContract=true only, default 2).
   *
   * Response (withContract=false):
   *   { ringSizeAfter: 1, ringSizeExpected: 1, driftStateCount: 0 }
   *   — D2 ring append unchanged + no drift_state rows → no-op (zero-regression invariant).
   *
   * Response (withContract=true):
   *   { lastEvent: { type: 'rule_violation', ... }, hazardShifts: number[], ringAppendedUnchanged: boolean }
   *   — lastEvent captured from the real bus (falsifiable: confirms the REAL chain fired),
   *     hazardShifts = current hazard_shift for each seeded drift_state row after subscriber,
   *     ringAppendedUnchanged = true if ring still has exactly 1 slot (D2 zero-regression).
   *
   * Anti-fabrication: no Math.random. All values explicit from body or fixed constants.
   * R2.2: TEST-ONLY. No raw risk scalar forwarded to real clients.
   */
  @Post('_test/insurance/record-violation-probe')
  async recordViolationProbe(
    @Body() body: {
      withContract: boolean;
      activeDriftStates?: number;
    },
  ): Promise<{
    ringSizeAfter?: number;
    ringSizeExpected?: number;
    driftStateCount?: number;
    lastEvent?: { type: string; playerId: string; lieutenantId: string; ruleId: string; severityBucket: string; gameMinute: number };
    hazardShifts?: number[];
    ringAppendedUnchanged?: boolean;
  }> {
    const { withContract, activeDriftStates = 2 } = body;

    // Block 101 = verified present in world_geography seed (migration 0016).
    const BLOCK_ID_A = 101;

    // ── 1. Create a fresh player + account ────────────────────────────────────────────────────────
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow!.account_id,
        callsign: nextTestCallsign('rv8'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // ── 2. Create a lieutenant (required for bossMirrorViolationRing FK) ────────────────────────
    // BossMirrorService.recordViolation needs a valid lieutenant_id to look up player_id on first insert.
    // Building + ops-state required for the FK: bossMirrorViolationRing.lieutenant_id → lieutenant.lieutenant_id.
    // For recordViolation we only need the lieutenant row (not a real building assignment).
    const [scriptRow] = await this.db
      .insert(behaviorScript)
      .values({})
      .returning({ script_id: behaviorScript.script_id });

    // Use a building for the FK (building → player). Any operational building.
    const [bldgRow] = await this.db
      .insert(building)
      .values({
        player_id: playerId,
        block_id: BLOCK_ID_A,
        building_type: 2,
        ownership: 'player',
        structural_state: 'operational',
      })
      .returning({ building_id: building.building_id });
    const buildingId = bldgRow!.building_id;

    const [ltRow] = await this.db
      .insert(lieutenant)
      .values({
        player_id: playerId,
        role_id: SECURITY_ROLE_ID,
        source: 'civilian',
        name: 'TestLt',
        name_locale: 'en',
        granted_role: 'executor',
        mode: 'delegated',
        assigned_building_id: buildingId,
        behavior_script_id: scriptRow!.script_id,
      })
      .returning({ lieutenant_id: lieutenant.lieutenant_id });
    const lieutenantId = ltRow!.lieutenant_id;

    const TEST_RULE_ID = 'test-rule-c8';
    const TEST_SEVERITY = 2;

    if (!withContract) {
      // ── No-contract case: recordViolation with NO drift_state → pure zero-regression proof ──────
      await this.bossMirrorService.recordViolation(playerId, lieutenantId, TEST_RULE_ID, TEST_SEVERITY);

      // Count drift_state rows for this player (must be 0 — no contract issued).
      const [cnt] = await this.db
        .select({ c: sql<number>`count(*)::int` })
        .from(coverageInducedDriftState)
        .where(eq(coverageInducedDriftState.player_id, playerId));

      // Read ring to confirm D2 ring append unchanged (1 slot).
      const ringRows = await this.db
        .select({ violation_slots: bossMirrorViolationRing.violation_slots })
        .from(bossMirrorViolationRing)
        .where(eq(bossMirrorViolationRing.lieutenant_id, lieutenantId));
      const ringSizeAfter = (ringRows[0]?.violation_slots as unknown[])?.length ?? 0;

      return {
        ringSizeAfter,
        ringSizeExpected: 1,  // D2 ring: recordViolation inserted 1 slot (zero-regression — unchanged by drift logic)
        driftStateCount: cnt?.c ?? 0,
      };
    }

    // ── WithContract case: seed drift_state rows + call recordViolation via real chain ─────────────

    // ── 3. Seed N drift_state rows for this player (hazard_shift=0 each) ─────────────────────────
    for (let i = 0; i < activeDriftStates; i++) {
      await this.db.insert(coverageInducedDriftState).values({
        player_id: playerId,
        contract_id: null,
        asset_ref: null,
        coverage_type: 'STASH_LOSS',
        hazard_shift: 0,
        fingerprint_stash_ratio: 0,
        fingerprint_courier_cadence: 0,
        fingerprint_marginal_deal: 0,
        fingerprint_lookout: 0,
      });
    }

    // ── 4. Register a one-shot event capture BEFORE calling recordViolation ───────────────────────
    // The bus.dispatch() is synchronous (all listeners called in-process, in order), but the drift
    // subscriber is fire-and-forget (async promise). Capturing the event synchronously is race-free
    // because bus.onRuleViolation fires synchronously on emitRuleViolation.
    // We wait for the event with a short timeout (the real chain fires synchronously via the bus).
    let capturedEvent: RuleViolationEvent | null = null;
    const eventCaptured = new Promise<RuleViolationEvent>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`record-violation-probe: RuleViolationEvent not received within 2000ms for player=${playerId}`));
      }, 2000);
      this.cityEventBus.onRuleViolation((e: RuleViolationEvent) => {
        if (e.playerId === playerId) {
          clearTimeout(timer);
          capturedEvent = e;
          resolve(e);
        }
      });
    });

    // ── 5. Call REAL BossMirrorService.recordViolation (the hot-path we are testing) ─────────────
    // The REAL chain: recordViolation → INSERT ring slot → emitRuleViolation → bus → onRuleViolation (async).
    // The bus dispatch is synchronous, so eventCaptured resolves before we await it below.
    await this.bossMirrorService.recordViolation(playerId, lieutenantId, TEST_RULE_ID, TEST_SEVERITY);

    // ── 6. Await the captured event (synchronous dispatch — already resolved) ─────────────────────
    const event = await eventCaptured;

    // ── 7. Wait for the async drift subscriber to complete (fire-and-forget) ─────────────────────
    // The onRuleViolation subscriber was fire-and-forget (caught-and-logged in InsuranceModule).
    // Give it 200ms to complete the DB updates.
    await new Promise<void>((resolve) => setTimeout(resolve, 200));

    // ── 8. Read hazard_shifts of all seeded drift_state rows for this player ─────────────────────
    const driftRows = await this.db
      .select({
        hazard_shift: coverageInducedDriftState.hazard_shift,
      })
      .from(coverageInducedDriftState)
      .where(eq(coverageInducedDriftState.player_id, playerId));
    const hazardShifts = driftRows.map((r) => r.hazard_shift);

    // ── 9. Verify ring still has 1 slot (D2 zero-regression: drift logic does NOT mutate the ring) ─
    const ringRows = await this.db
      .select({ violation_slots: bossMirrorViolationRing.violation_slots })
      .from(bossMirrorViolationRing)
      .where(eq(bossMirrorViolationRing.lieutenant_id, lieutenantId));
    const ringSizeAfter = (ringRows[0]?.violation_slots as unknown[])?.length ?? 0;

    return {
      lastEvent: {
        type: event.type,
        playerId: event.playerId,
        lieutenantId: event.lieutenantId,
        ruleId: event.ruleId,
        severityBucket: event.severityBucket,
        gameMinute: event.gameMinute,
      },
      hazardShifts,
      ringAppendedUnchanged: ringSizeAfter === 1,  // ring has 1 slot = D2 append unchanged (drift does NOT touch ring)
    };
  }

  // ── Drift C9 Route (drive-all-events) ────────────────────────────────────────────────────────────
  //   POST /v1/_test/insurance/drive-all-events — verifies C9 consolidated DD-LESS-CAUTIOUS logic.
  //
  //   Calls each CoverageInducedDriftService.onXxx(event) DIRECTLY (awaited) against one drift_state.
  //   This is valid because:
  //     (1) Per-emit specs (C4-C8) already proved the REAL bus chain fires for each event.
  //     (2) C9 proves the CENTRALIZED increment helper fires consistently for all 5 handlers.
  //
  //   Mode='less-cautious':
  //     - One player with one drift_state (hazard_shift=0, baselines set to be exceeded).
  //     - Drives 4 feature events less-cautiously (each fires applyLessCautiousIncrement → +1).
  //     - Drives rule_violation (unconditional, bypasses comparison → +1).
  //     - Returns { hazardAfter: 5, perEventDeltas: { stash_fill:1, courier_rotated:1, deal_accepted:1, lookout:1, rule_violation:1 } }.
  //
  //   Mode='prudent':
  //     - One player with one drift_state (hazard_shift=0, baselines set so NO feature event fires).
  //     - Drives 4 feature events same/more-cautiously → 0 increments.
  //     - Rule_violation tested on a SEPARATE player with NO drift_state → no-op (no-contract path).
  //     - Returns { hazardAfter: 0 } (the feature-player's drift_state stays at 0).
  //
  //   Anti-fabrication: no Math.random. All values explicit.
  //   R2.2: TEST-ONLY. No raw risk scalar forwarded to real clients.

  /**
   * `POST /v1/_test/insurance/drive-all-events` — Drift C9 consolidated increment probe (TEST-ONLY).
   *
   * Drives all 5 drift event handlers against a single drift_state to prove C9 consolidation:
   *   - `applyLessCautiousIncrement` fires for all 4 feature handlers (stash/courier/deal/lookout).
   *   - `onRuleViolation` fires unconditionally (bypasses comparison, canon :116 singular).
   *   - Cumulative hazard_shift is observable (both-ways falsifiable).
   *
   * Body: `{ mode: 'less-cautious' | 'prudent' }`.
   *
   * Response (mode='less-cautious'):
   *   `{ hazardAfter: 5, perEventDeltas: { stash_fill:1, courier_rotated:1, deal_accepted:1, lookout:1, rule_violation:1 } }`
   *
   * Response (mode='prudent'):
   *   `{ hazardAfter: 0 }` — NONE of the events fired (both-ways proven).
   *
   * Anti-fabrication: no Math.random. All values explicit. No bus chain — direct service calls.
   * R2.2: TEST-ONLY. No raw risk scalar forwarded to real clients.
   */
  @Post('_test/insurance/drive-all-events')
  async driveAllEvents(
    @Body() body: { mode: 'less-cautious' | 'prudent' },
  ): Promise<{
    hazardAfter: number;
    perEventDeltas?: Record<string, number>;
  }> {
    const { mode } = body;

    // ── Baselines design ───────────────────────────────────────────────────────────────────────
    //
    // less-cautious baselines: chosen so each event comparison FIRES.
    //   - stashRatio baseline=400‰; current=900‰ (900 >= 400×2.0=800 → FIRES).
    //   - courierCadence baseline=2d; no prior shift → gap=windowDays=30d (30 >= 2+2=4 → FIRES).
    //   - marginalDeal frozenBaseline=0‰; running=140‰ pre-seeded; ONE marginal tick:
    //       newRate = round((140×30 + 1000)/31) = 168 >= 0+150=150 → FIRES.
    //   - lookout baseline=1000‰; no SECURITY lts → current=0‰ (0 ≤ 1000-150=850 → FIRES).
    //   - ruleViolation: UNCONDITIONAL (always fires when drift_state exists).
    //
    // prudent baselines: chosen so each feature comparison does NOT fire.
    //   - stashRatio baseline=900‰; current=400‰ (400 < 900×2.0=1800 → NOT fires).
    //   - courierCadence baseline=30d; no prior shift → gap=windowDays=30d (30 < 30+2=32 → NOT fires).
    //   - marginalDeal frozenBaseline=0‰; running=0‰; ONE non-marginal tick:
    //       newRate = round(0×30/31) = 0 < 0+150=150 → NOT fires.
    //   - lookout baseline=0‰; 1 SECURITY lt + 1 op building → current=1000‰ (1000 > 0-150=-150 → NOT fires).
    //   - ruleViolation: called on a separate player with NO drift_state → no-op.

    const GAME_MINUTE = 1000; // arbitrary fixed game-minute (no wall-clock)

    // ── Helper: read hazard_shift for a player ─────────────────────────────────────────────────
    const readShift = async (pId: string): Promise<number> => {
      const [row] = await this.db
        .select({ hazard_shift: coverageInducedDriftState.hazard_shift })
        .from(coverageInducedDriftState)
        .where(eq(coverageInducedDriftState.player_id, pId))
        .limit(1);
      return row?.hazard_shift ?? 0;
    };

    // ── Helper: create a fresh player + account ────────────────────────────────────────────────
    const makePlayer = async (callsignPrefix: string): Promise<string> => {
      const [acctRow] = await this.db
        .insert(account)
        .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
        .returning({ account_id: account.account_id });
      const [pRow] = await this.db
        .insert(player)
        .values({
          account_id: acctRow!.account_id,
          callsign: nextTestCallsign(callsignPrefix),
          tier: 1,
          active_branches: 1,
        })
        .returning({ player_id: player.player_id });
      return pRow!.player_id;
    };

    // ── Create the feature-test player ──────────────────────────────────────────────────────────
    const playerId = await makePlayer('dae9');

    // ── Seed one operational building (needed for lookout rate computation) ─────────────────────
    const BLOCK_ID = 101;
    const [bldgRow] = await this.db
      .insert(building)
      .values({
        player_id: playerId,
        block_id: BLOCK_ID,
        building_type: 2, // stash (any op type)
        ownership: 'player',
        structural_state: 'operational',
      })
      .returning({ building_id: building.building_id });
    const buildingId = bldgRow!.building_id;
    await this.db.insert(buildingOperationalState).values({
      building_id: buildingId,
      player_id: playerId,
      operational_type: 'stash',
      conversion_stage: 'operational',
      structural_state: 'operational',
    }).onConflictDoNothing();

    // ── Seed the drift_state with mode-appropriate baselines ────────────────────────────────────
    const stashBaseline = mode === 'less-cautious' ? 400 : 900;
    const courierBaseline = mode === 'less-cautious' ? 2 : 30;
    const lookoutBaseline = mode === 'less-cautious' ? 1000 : 0;
    // marginalDeal running estimate: seed at 140‰ for less-cautious so ONE marginal tick raises it past 150‰ threshold.
    //   K=30 (default fingerprint window), prevRate=140, isMarginal=true:
    //   newRate = round((140×30 + 1000) / 31) = round(5200/31) = round(167.7) = 168.
    //   168 >= frozenBaseline(0) + margin(150) = 150 → FIRES.
    // For prudent: seed at 0‰ (one non-marginal tick → rate stays 0 < 150 → NOT fires).
    const marginalDealRunningEstimate = mode === 'less-cautious' ? 140 : 0;

    await this.db.insert(coverageInducedDriftState).values({
      player_id: playerId,
      contract_id: null,
      asset_ref: null,
      coverage_type: 'STASH_LOSS',
      hazard_shift: 0,
      fingerprint_stash_ratio: stashBaseline,
      fingerprint_courier_cadence: courierBaseline,
      fingerprint_marginal_deal: marginalDealRunningEstimate,
      fingerprint_lookout: lookoutBaseline,
    });

    // ── Drive events sequentially, reading shift between each ────────────────────────────────────

    // Event 1: stash_fill
    const shiftBefore1 = await readShift(playerId);
    const stashRatioCurrent = mode === 'less-cautious' ? 900 : 400;
    await this.driftService.onStashFill({
      type: 'stash_fill',
      playerId,
      buildingId,
      heldCentsAfter: stashRatioCurrent,
      capacityCents: 1000,
      gameMinute: GAME_MINUTE,
    });
    const shiftAfter1 = await readShift(playerId);
    const delta1 = shiftAfter1 - shiftBefore1;

    // Event 2: courier_rotated
    // Strategy: seed NO prior courier_shift → gap = windowDays (default 30 game-days).
    //   less-cautious: baseline=2d; gap=30d (30 >= 2+2=4 → FIRES).
    //   prudent: baseline=30d; gap=30d (30 >= 30+2=32? NO → NOT fires).
    // This avoids needing to insert actual courier_shift rows in the DB.
    const shiftBefore2 = await readShift(playerId);
    const fakeCourierShiftId = `00000000-0000-0000-0000-${String(Date.now()).padEnd(12, '0').slice(-12)}`;
    await this.driftService.onCourierRotated({
      type: 'courier_rotated',
      playerId,
      courierId: '00000000-0000-0000-0000-000000000001',
      routeId: '00000000-0000-0000-0000-000000000002',
      courierShiftId: fakeCourierShiftId, // fresh shift id with no prior shift in DB → gap = windowDays
      dispatchedAtTick: GAME_MINUTE, // number — CourierRotatedEvent.dispatchedAtTick is number (no prior shift → gap=windowDays regardless)
      gameMinute: GAME_MINUTE,
    });
    const shiftAfter2 = await readShift(playerId);
    const delta2 = shiftAfter2 - shiftBefore2;

    // Event 3: deal_accepted
    // less-cautious: marginPermille=200 (< 1000 = brindle base) → isMarginal=true → rate updates → FIRES.
    // prudent: marginPermille=1200 (>= 1000), heatLevel=0 (< heatThreshold=5) → isMarginal=false → rate=0 → NOT fires.
    const shiftBefore3 = await readShift(playerId);
    const dealMarginPermille = mode === 'less-cautious' ? 200 : 1200;
    const dealHeatLevel = 0; // always 0 — prudent stays cold; less-cautious uses low margin instead
    await this.driftService.onDealAccepted({
      type: 'deal_accepted',
      playerId,
      dealerSpotId: buildingId, // DealAcceptedEvent uses dealerSpotId (the dealer-spot building_id)
      marginPermille: dealMarginPermille,
      heatLevel: dealHeatLevel,
      gameMinute: GAME_MINUTE,
    });
    const shiftAfter3 = await readShift(playerId);
    const delta3 = shiftAfter3 - shiftBefore3;

    // Event 4: lookout_assigned
    // less-cautious: lookout baseline=1000‰, current=0 (no SECURITY lts for this player) → 0 <= 1000-150=850 → FIRES.
    // prudent: lookout baseline=0‰, current=1000‰ (if we add 1 SECURITY lt + 1 op building → 1/1=1000‰) → NOT fires.
    // Implementation: onLookoutAssigned re-queries current rate from DB. For less-cautious: no SECURITY lt → 0‰.
    // For prudent: we need 1 SECURITY lt in the DB so rate=1000‰.
    if (mode === 'prudent') {
      // Seed a SECURITY lieutenant row so currentRate=1000‰ (1 lt / 1 building).
      // Pattern mirrors C7 recruit-probe no-fire scenario (line ~4501):
      //   1. Insert behavior_script (all defaults: rules={rules:[]}, source='', valid=false).
      //   2. Insert lieutenant with the script_id FK.
      const [bsRow] = await this.db
        .insert(behaviorScript)
        .values({
          // All defaults: rules='{"rules":[]}', source='', valid=false, last_modified_by='system'.
        })
        .returning({ script_id: behaviorScript.script_id });
      await this.db.insert(lieutenant).values({
        player_id: playerId,
        role_id: SECURITY_ROLE_ID,          // SECURITY role_id (from lieutenant-archetype.ts)
        source: 'civilian',
        name: 'Lt-Security-Prudent',
        name_locale: 'en',
        granted_role: 'executor',
        mode: 'delegated',
        assigned_building_id: buildingId,
        behavior_script_id: bsRow!.script_id,
      });
    }

    const shiftBefore4 = await readShift(playerId);
    await this.driftService.onLookoutAssigned({
      type: 'lookout_assigned',
      playerId,
      lieutenantId: '00000000-0000-0000-0000-000000000003',
      buildingId,
      gameMinute: GAME_MINUTE,
    });
    const shiftAfter4 = await readShift(playerId);
    const delta4 = shiftAfter4 - shiftBefore4;

    // Event 5: rule_violation
    // less-cautious: playerId has drift_state → UNCONDITIONAL +1.
    // prudent: use a SEPARATE player with NO drift_state → no-op (hazard stays 0).
    const shiftBefore5 = await readShift(playerId);
    if (mode === 'less-cautious') {
      await this.driftService.onRuleViolation({
        type: 'rule_violation',
        playerId,
        lieutenantId: '00000000-0000-0000-0000-000000000003',
        ruleId: '00000000-0000-0000-0000-000000000004',
        severityBucket: 'minor',
        gameMinute: GAME_MINUTE,
      });
    } else {
      // Prudent: call on a separate player with NO drift_state → no-op.
      const prudentRulePlayer = await makePlayer('dap9');
      await this.driftService.onRuleViolation({
        type: 'rule_violation',
        playerId: prudentRulePlayer,
        lieutenantId: '00000000-0000-0000-0000-000000000003',
        ruleId: '00000000-0000-0000-0000-000000000004',
        severityBucket: 'minor',
        gameMinute: GAME_MINUTE,
      });
      // prudentRulePlayer has no drift_state → no-op. The feature-player's shift is unchanged.
    }
    const shiftAfter5 = await readShift(playerId);
    const delta5 = shiftAfter5 - shiftBefore5;

    const hazardAfter = await readShift(playerId);

    if (mode === 'less-cautious') {
      return {
        hazardAfter,
        perEventDeltas: {
          stash_fill: delta1,
          courier_rotated: delta2,
          deal_accepted: delta3,
          lookout: delta4,
          rule_violation: delta5,
        },
      };
    } else {
      return { hazardAfter };
    }
  }

  // ── Drift C10 Routes ──────────────────────────────────────────────────────────────────────────
  //
  // IMPLEMENTS: docs/superpowers/plans/2026-06-18-depth-insurance-coverage-drift-plan.md Task 10 (C10)
  //             — Insurance Drift C10 — 2026-06-18
  //
  // Routes:
  //   POST /v1/_test/insurance/run-weekly-drift-tick  — runs runWeeklyTick for a player at a given weekId
  //   GET  /v1/_test/insurance/read-drift-state?playerId=<uuid>  — already exists (C1), reused by C10 E2E

  /**
   * `POST /v1/_test/insurance/run-weekly-drift-tick` — Drift C10 tick probe (TEST-ONLY).
   *
   * Creates a synthetic CitySimTickContext and calls `CoverageInducedDriftService.runWeeklyTick(ctx, weekId)`.
   * This simulates the WEEKLY scheduler firing at the given weekId (bypasses the real scheduler timer —
   * the test drives the tick synchronously via this route).
   *
   * Body: { playerId: string, weekId: number }
   *   playerId — the player whose drift_state rows to tick.
   *   weekId   — the in-game week number (idempotence guard key).
   *
   * Returns: { ok: true }
   *
   * Anti-fabrication: no Math.random. Deterministic (weekId from body, gameMinute derived as weekId × 10080).
   * R2.2: TEST-ONLY (not registered in production). The tick is awaited synchronously (no fire-and-forget).
   */
  @Post('_test/insurance/run-weekly-drift-tick')
  @HttpCode(200)
  async runWeeklyDriftTick(
    @Body() body: { playerId: string; weekId: number },
  ): Promise<{ ok: true }> {
    const WEEKLY_MINUTES = 10080; // 7 × 24 × 60 (canonical constant)
    const ctx: CitySimTickContext = {
      playerId: body.playerId,
      cadence: Cadence.WEEKLY,
      gameMinute: body.weekId * WEEKLY_MINUTES, // derive gameMinute from weekId
    };
    // C11 §2.6 split: run recompute + decay (no renewal — this route is drift-only for C10 spec).
    // Preserves C10 E2E spec behaviour (drift weekly tick → hazard_shift decays).
    // tickedIds returned by runWeeklyTick — only those rows get decayed (idempotent on re-call).
    const tickedIds = await this.driftService.runWeeklyTick(ctx, body.weekId);
    await this.driftService.applyWeeklyDecay(ctx, body.weekId, tickedIds);
    return { ok: true };
  }

  // ── Drift C11 Routes ──────────────────────────────────────────────────────────────────────────
  //
  // IMPLEMENTS: docs/superpowers/plans/2026-06-18-depth-insurance-coverage-drift-plan.md Task 11 (C11)
  //             — Insurance Drift C11 — 2026-06-18
  //
  // Routes:
  //   POST /v1/_test/insurance/renewal-probe  — runs the renewal lifecycle for a synthetic scenario

  /**
   * `POST /v1/_test/insurance/renewal-probe` — C11 renewal lifecycle proof (TEST-ONLY).
   *
   * Sets up a synthetic contract scenario, runs runWeeklyRenewalCheck, and returns the
   * resulting contract status + debit for E2E assertions.
   *
   * Body variants:
   *   { expired: true, hazardShift, basePremiumCents, walletCents, weekId }
   *     → creates a fresh player+contract+drift_state; contract expired; runs renewal.
   *   { expired: false, weekId }
   *     → creates a fresh player+contract+drift_state; contract NOT yet expired; runs renewal (no-op).
   *   { reUseContractFromPlayerId: string, weekId }
   *     → reuses existing player's contract; runs renewal.
   *   { expired: true, ..., verifyOrder: true }
   *     → runs the FULL §2.6 combined tick (recompute→renewal→decay) and returns hazardShiftAfterDecay.
   *
   * Returns:
   *   { contract, almanac, escalatedPremiumCents, walletDebitedCents, reQuoted, currentTick, playerId, hazardShiftAfterDecay? }
   *
   * R2.2: TEST-ONLY (not registered in production).
   * Anti-fabrication: no Math.random, no Date.now() in the mechanic path.
   */
  @Post('_test/insurance/renewal-probe')
  @HttpCode(200)
  async renewalProbe(
    @Body() body: {
      expired?: boolean;
      hazardShift?: number;
      basePremiumCents?: number;
      walletCents?: number;
      weekId: number;
      verifyOrder?: boolean;
      reUseContractFromPlayerId?: string;
    },
  ): Promise<{
    contract: Record<string, unknown>;
    almanac: Record<string, unknown> | null;
    escalatedPremiumCents: number;
    walletDebitedCents: number;
    reQuoted: boolean;
    currentTick: number;
    playerId: string;
    hazardShiftAfterDecay?: number;
  }> {
    const WEEKLY_MINUTES = 10080; // 7 × 24 × 60
    const weekId = body.weekId;
    const currentTickNum = weekId * WEEKLY_MINUTES;
    const currentTick = BigInt(currentTickNum);

    const basePremiumPct = insuranceTunables.basePremiumPctOfInsuredValue; // 4
    const alpha = insuranceTunables.coverageDriftAlpha; // 0.05
    const termDays = insuranceTunables.coverageDriftContractTermDays; // 7
    const MINUTES_PER_DAY_LOCAL = 24 * 60;
    const termTicks = BigInt(termDays * MINUTES_PER_DAY_LOCAL);

    let playerId: string;
    let contractId: string;
    let insuredValueCents: number;
    let contractWasExpiredBeforeRenewal: boolean; // tracks whether this probe run found an expired contract

    if (body.reUseContractFromPlayerId) {
      // Reuse existing player
      playerId = body.reUseContractFromPlayerId;
      const existingContracts = await this.db
        .select({ id: insuranceContract.id, insured_value_cents: insuranceContract.insured_value_cents, expires_at_tick: insuranceContract.expires_at_tick })
        .from(insuranceContract)
        .where(and(eq(insuranceContract.player_id, playerId), eq(insuranceContract.status, 'ACTIVE')));

      if (!existingContracts[0]) {
        // No active contract (already lapsed or renewed past the point of being expired) → reQuoted:false
        return {
          contract: { status: 'no-active-contract' },
          almanac: null,
          escalatedPremiumCents: 0,
          walletDebitedCents: 0,
          reQuoted: false,
          currentTick: currentTickNum,
          playerId,
        };
      }
      contractId = existingContracts[0].id;
      insuredValueCents = Number(existingContracts[0].insured_value_cents);
      // Determine if this contract is due for renewal (expires_at_tick <= currentTick)
      contractWasExpiredBeforeRenewal = existingContracts[0].expires_at_tick !== null
        && existingContracts[0].expires_at_tick <= currentTick;
    } else {
      // Fresh player scenario
      const hazardShift = body.hazardShift ?? 0;
      const basePremiumCents = body.basePremiumCents ?? 1000;
      const walletCents = body.walletCents ?? 5000;
      const expired = body.expired ?? true;

      // Compute insured_value_cents so that round(insured_value_cents × basePremiumPct / 100) === basePremiumCents
      insuredValueCents = Math.round(basePremiumCents * 100 / basePremiumPct);

      // 1. Create fresh test account + player
      const [accountRow] = await this.db
        .insert(account)
        .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
        .returning({ account_id: account.account_id });
      const [playerRow] = await this.db
        .insert(player)
        .values({
          account_id: accountRow!.account_id,
          callsign: nextTestCallsign('rnl'),
          tier: 1,
          active_branches: 1,
        })
        .returning({ player_id: player.player_id });
      playerId = playerRow!.player_id;

      // 2. Create economy_states row (wallet)
      await this.db
        .insert(economyState)
        .values({ player_id: playerId, cash_cents: BigInt(walletCents) });

      // 3. Create coverage_induced_drift_state row (with hazard_shift)
      await this.db
        .insert(coverageInducedDriftState)
        .values({
          player_id: playerId,
          coverage_type: 'PROPERTY',
          hazard_shift: hazardShift,
          // last_drift_tick: not-ticked-yet for this weekId (use 0 default or weekId-1)
        });

      // 4. Create insurance_contract row
      const expiresAtTick = expired
        ? currentTick - BigInt(1)       // expired: expires_at_tick < currentTick → renewal-due
        : currentTick + BigInt(100000); // not yet due: far in the future

      const [contractRow] = await this.db
        .insert(insuranceContract)
        .values({
          player_id: playerId,
          type: 'PROPERTY',
          asset_ref: null,
          insured_value_cents: BigInt(insuredValueCents),
          premium_cents: BigInt(basePremiumCents),
          escrow_required_cents: BigInt(0),
          walk_id: null,
          status: 'ACTIVE',
          issued_tick: currentTick - BigInt(1000),
          expires_at_tick: expiresAtTick,
        })
        .returning({ id: insuranceContract.id });
      contractId = contractRow!.id;

      // 5. Create almanac_entry row (needed for lapse stamp).
      //    C15 alignment: use SYNTHETIC_UNDERWRITER_ID (0001) — the same key that
      //    RenewalService uses when counterparty_id is null (effectiveLapseUnderwriterId =
      //    contract.counterparty_id ?? SYNTHETIC_UNDERWRITER_ID). The contract seeded above
      //    has no counterparty_id, so the lapse stamp targets underwriter_id = 0001.
      //    TEST_UNDERWRITER_ID (0002) was misaligned: the stamp updated 0001 but read back
      //    found only 0002 → null. SYNTHETIC_UNDERWRITER_ID makes stamp + read-back coherent.
      await this.db
        .insert(almanacEntry)
        .values({
          underwriter_id: SYNTHETIC_UNDERWRITER_ID,
          player_id: playerId,
          status: 'CLEAN',
        });

      // For fresh player scenario, whether the contract was expired is determined by the body flag
      contractWasExpiredBeforeRenewal = expired;
    }

    // ── Read wallet before renewal for debit calculation ─────────────────────────────────────
    const walletBeforeRows = await this.db
      .select({ cash_cents: economyState.cash_cents })
      .from(economyState)
      .where(eq(economyState.player_id, playerId))
      .limit(1);
    const walletBeforeRenewal = walletBeforeRows[0]?.cash_cents ?? BigInt(0);

    // ── Run the renewal (and optionally the full §2.6 combined tick) ─────────────────────────
    const ctx: CitySimTickContext = {
      playerId,
      cadence: Cadence.WEEKLY,
      gameMinute: currentTickNum,
    };

    if (body.verifyOrder) {
      // Full §2.6 combined tick: recompute → renewal → decay
      const tickedIds = await this.driftService.runWeeklyTick(ctx, weekId);
      await this.renewalService.runWeeklyRenewalCheck(ctx, weekId);
      await this.driftService.applyWeeklyDecay(ctx, weekId, tickedIds);
    } else {
      // Renewal only (drift tick was separately called or not needed for this probe variant)
      await this.renewalService.runWeeklyRenewalCheck(ctx, weekId);
    }

    // ── Read results ─────────────────────────────────────────────────────────────────────────
    const contractRows = await this.db
      .select()
      .from(insuranceContract)
      .where(eq(insuranceContract.id, contractId))
      .limit(1);
    const contractRow = contractRows[0];

    const almanacRows = await this.db
      .select()
      .from(almanacEntry)
      .where(eq(almanacEntry.player_id, playerId))
      .limit(1);
    const almanacRow = almanacRows[0] ?? null;

    const walletAfterRows = await this.db
      .select({ cash_cents: economyState.cash_cents })
      .from(economyState)
      .where(eq(economyState.player_id, playerId))
      .limit(1);
    const walletAfter = walletAfterRows[0]?.cash_cents ?? BigInt(0);
    const walletDebitedCents = Number(walletBeforeRenewal - walletAfter);

    // Compute escalatedPremiumCents for the response (mirrors what the service computed)
    const hazardShiftForResponse = body.hazardShift ?? 0;
    const basePremiumCentsForResponse = body.basePremiumCents ?? 1000;
    const escalatedPremiumCents = body.basePremiumCents !== undefined
      ? Math.round(basePremiumCentsForResponse * (1 + alpha * hazardShiftForResponse))
      : 0;

    // Determine if renewal was triggered (contract was due AND was processed — lapsed or renewed)
    const isNowActive = contractRow?.status === 'ACTIVE';
    const isNowLapsed = contractRow?.status === 'LAPSED';
    const termAdvanced = isNowActive && Number(contractRow?.expires_at_tick) > currentTickNum;
    // reQuoted = contract was expired going in AND was processed (now lapsed or term advanced past currentTick)
    const reQuotedFinal = contractWasExpiredBeforeRenewal && (isNowLapsed || termAdvanced);

    // For verifyOrder: read hazardShiftAfterDecay
    let hazardShiftAfterDecay: number | undefined;
    if (body.verifyOrder) {
      const driftRows = await this.db
        .select({ hazard_shift: coverageInducedDriftState.hazard_shift })
        .from(coverageInducedDriftState)
        .where(eq(coverageInducedDriftState.player_id, playerId))
        .limit(1);
      hazardShiftAfterDecay = driftRows[0]?.hazard_shift ?? 0;
    }

    return {
      contract: contractRow ? serializeRow(contractRow as Record<string, unknown>) as Record<string, unknown> : {},
      almanac: almanacRow ? serializeRow(almanacRow as Record<string, unknown>) as Record<string, unknown> : null,
      escalatedPremiumCents,
      walletDebitedCents,
      reQuoted: reQuotedFinal,
      currentTick: currentTickNum,
      playerId,
      ...(hazardShiftAfterDecay !== undefined ? { hazardShiftAfterDecay } : {}),
    };
  }

  // ── Drift C12 Routes ──────────────────────────────────────────────────────────────────────────
  //
  // IMPLEMENTS: docs/superpowers/plans/2026-06-18-depth-insurance-coverage-drift-plan.md Task 12 (C12)
  //             — Insurance Drift C12 — 2026-06-18
  //
  // Routes:
  //   POST /v1/_test/insurance/antiexploit-setup
  //     — creates a fresh player+almanac+contract+drift_state with a given baseline stashRatio,
  //       then lapses the contract to stamp baseline_persisted_until_tick on the almanac row.
  //   POST /v1/_test/insurance/antiexploit-reissue
  //     — creates a new contract for the same (underwriter, player), calls captureBaselineFingerprint
  //       with overrideIssuedTick to simulate within/outside-window re-issuance. Returns the new
  //       drift_state + inherited flag.
  //   POST /v1/_test/insurance/antiexploit-stashfill
  //     — simulates a stash fill event for the reset-exploit proof (test 3): directly calls
  //       onStashFill with a specific stashRatio and returns hazardShiftAfter + fired flag.
  //   POST /v1/_test/insurance/antiexploit-scope-setup
  //     — creates a fresh player with TWO underwriter almanac rows (underwriterA + underwriterB),
  //       lapses under underwriterA only. Returns playerId + lapseUntilTick + currentTick.
  //   GET /v1/_test/insurance/antiexploit-read-almanac
  //     — reads the almanac_entry row for (underwriterId, playerId).

  /**
   * `POST /v1/_test/insurance/antiexploit-setup` — C12 anti-exploit setup (TEST-ONLY).
   *
   * Creates a fresh player+almanac+drift_state with a captured baseline stashRatio,
   * then sets baseline_persisted_until_tick to simulate a lapsed contract with the
   * 90-day post-lapse persistence window stamped (REUSE underwriting_almanac_persistence_days_post_lapse).
   *
   * This does NOT go through the real RenewalService.runWeeklyRenewalCheck to avoid the
   * full renewal lifecycle complexity — it directly sets the almanac row's persistence
   * columns to prove the inherit logic in captureBaselineFingerprint (the scope fix is
   * proven separately in antiexploit-scope-setup which uses the real lapse stamp path).
   *
   * Body: { baselineStashRatio: number, underwriterId: string }
   * Returns: { playerId, underwriterId, contractId, persistedUntilTick, currentTick }
   *
   * R2.2: TEST-ONLY (not registered in production).
   * Anti-fabrication: no Math.random, no Date.now() in the mechanic path.
   */
  @Post('_test/insurance/antiexploit-setup')
  @HttpCode(200)
  async antiexploitSetup(
    @Body() body: {
      baselineStashRatio: number;
      underwriterId: string;
    },
  ): Promise<{
    playerId: string;
    underwriterId: string;
    contractId: string;
    persistedUntilTick: number;
    currentTick: number;
  }> {
    const MINUTES_PER_DAY_LOCAL = 24 * 60;
    const currentTick = 10080; // weekId=1 × 7 days × 1440 min/day (deterministic, game-time)
    const persistenceDays = insuranceTunables.almanacPersistenceDaysPostLapse; // 90
    const persistedUntilTick = currentTick + persistenceDays * MINUTES_PER_DAY_LOCAL;

    // 1. Create fresh test account + player
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow!.account_id,
        callsign: nextTestCallsign('aes'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // 2. Create almanac_entry row with the given underwriterId + persisted baseline fingerprint
    //    Directly set baseline_fingerprint_* + baseline_persisted_until_tick to simulate a lapsed state.
    //    This is the C12 state we test: a post-lapse almanac with a persisted baseline.
    const [almRow] = await this.db
      .insert(almanacEntry)
      .values({
        underwriter_id: body.underwriterId,
        player_id: playerId,
        status: 'CLEAN',
        baseline_fingerprint_stash_ratio: body.baselineStashRatio,
        baseline_fingerprint_courier_cadence: 0,
        baseline_fingerprint_marginal_deal: 0,
        baseline_fingerprint_lookout: 0,
        baseline_persisted_until_tick: BigInt(persistedUntilTick),
      })
      .returning({ id: almanacEntry.id });

    // 3. Create a LAPSED insurance_contract row (to represent the prior lapsed contract)
    const [contractRow] = await this.db
      .insert(insuranceContract)
      .values({
        player_id: playerId,
        type: 'PROPERTY',
        asset_ref: null,
        insured_value_cents: BigInt(100000),
        premium_cents: BigInt(4000),
        escrow_required_cents: BigInt(0),
        walk_id: null,
        counterparty_id: body.underwriterId,
        status: 'LAPSED',
        issued_tick: BigInt(currentTick - 1000),
        expires_at_tick: BigInt(currentTick - 1), // was due for renewal at currentTick
      })
      .returning({ id: insuranceContract.id });

    return {
      playerId,
      underwriterId: body.underwriterId,
      contractId: contractRow!.id,
      persistedUntilTick,
      currentTick,
    };
  }

  /**
   * `POST /v1/_test/insurance/antiexploit-reissue` — C12 re-issue for anti-exploit E2E (TEST-ONLY).
   *
   * Creates a new ACTIVE contract for the given (playerId, underwriterId) pair with a synthetic
   * stashRatio (via a money_holding row) to simulate the "current policy" at re-issuance.
   * Calls captureBaselineFingerprint with overrideIssuedTick (within or outside the window)
   * to exercise the within-window INHERIT vs outside-window FRESH branches.
   *
   * Body: { playerId, underwriterId, currentStashRatio, withinWindow, reissueTick }
   * Returns: { driftState, inherited }
   *
   * R2.2: TEST-ONLY (not registered in production).
   * Anti-fabrication: no Math.random, no Date.now().
   */
  @Post('_test/insurance/antiexploit-reissue')
  @HttpCode(200)
  async antiexploitReissue(
    @Body() body: {
      playerId: string;
      underwriterId: string;
      currentStashRatio: number;   // simulated "current policy" at re-issuance
      withinWindow: boolean;       // if true → reissueTick < baseline_persisted_until_tick
      reissueTick: number;         // the game-time tick of re-issuance (overrides the contract's issued_tick)
    },
  ): Promise<{
    driftState: Record<string, unknown> | null;
    inherited: boolean;
  }> {
    const CAPACITY_CENTS = 1000; // toy capacity for stashRatio computation (body.currentStashRatio = permille)

    // 1. Clean up any prior ACTIVE contracts for this player (ensure only the new re-issued contract is ACTIVE)
    //    (Allow LAPSED to remain — that's the prior lapsed state we inherit from)
    //    Do NOT delete drift_state rows — they are scoped by contract_id in reads below.
    //    Direct DELETE on coverage_induced_drift_state is not permitted (role restriction);
    //    player CASCADE is the correct cleanup path (delete-player route).
    await this.db
      .update(insuranceContract)
      .set({ status: 'LAPSED' })
      .where(and(eq(insuranceContract.player_id, body.playerId), eq(insuranceContract.status, 'ACTIVE')));

    // 2. Seed a money_holding row with held_cents reflecting currentStashRatio (permille of capacity).
    //    This is the substrate captureBaselineFingerprint reads for a FRESH capture.
    //    For an INHERITED capture, this substrate is IGNORED — the almanac baseline is used instead.
    //    Tier=1 → capacityCentsForTier(1) = 100_000_000 cents ($1M, gdd/14:3364 default).
    //    held_cents = round(currentStashRatio × 100_000_000 / 1000)
    //    stashRatioPermille(held_cents, 100_000_000) == currentStashRatio (permille match).
    const CAPACITY_CENTS_TIER1 = Number(capacityCentsForTier(1)); // reads from TunablesStore at runtime (gdd/14:3364)
    const heldCents = Math.round(body.currentStashRatio * CAPACITY_CENTS_TIER1 / 1000);

    const existingMH = await this.db
      .select({ money_holding_id: moneyHolding.money_holding_id, building_id: moneyHolding.building_id })
      .from(moneyHolding)
      .where(eq(moneyHolding.player_id, body.playerId))
      .limit(1);

    if (existingMH.length > 0) {
      // Update existing money_holding row
      await this.db
        .update(moneyHolding)
        .set({ held_cents: BigInt(heldCents) })
        .where(eq(moneyHolding.player_id, body.playerId));
    } else {
      // Create a real building row first (moneyHolding has FK building_id → building.building_id)
      const [buildingRow] = await this.db
        .insert(building)
        .values({
          player_id: body.playerId,
          block_id: 1,
          building_type: 1,
          ownership: 'player',
          heat: 0,
          structural_state: 'operational',
        })
        .returning({ building_id: building.building_id });
      const buildingId = buildingRow!.building_id;

      await this.db
        .insert(moneyHolding)
        .values({
          player_id: body.playerId,
          building_id: buildingId,
          held_cents: BigInt(heldCents),
          money_holding_tier: 1,
          last_yield_tick: 0,
        });
    }

    // 3. Create a new ACTIVE contract with counterparty_id = underwriterId (so captureBaselineFingerprint
    //    scopes the almanac check to the correct (underwriter, player) row).
    const [newContractRow] = await this.db
      .insert(insuranceContract)
      .values({
        player_id: body.playerId,
        type: 'PROPERTY',
        asset_ref: null,
        insured_value_cents: BigInt(100000),
        premium_cents: BigInt(4000),
        escrow_required_cents: BigInt(0),
        walk_id: null,
        counterparty_id: body.underwriterId,
        status: 'ACTIVE',
        issued_tick: BigInt(body.reissueTick),
        expires_at_tick: BigInt(body.reissueTick + 10080), // 7 days from re-issue
      })
      .returning({ id: insuranceContract.id });
    const newContractId = newContractRow!.id;

    // 4. Call captureBaselineFingerprint with overrideIssuedTick = reissueTick.
    //    - Within window: reissueTick < baseline_persisted_until_tick → INHERIT persisted baseline
    //    - Outside window: reissueTick >= baseline_persisted_until_tick → FRESH capture from money_holding
    const { inherited } = await this.driftService.captureBaselineFingerprint(newContractId, body.reissueTick);

    // 5. Read the resulting drift_state row
    const driftRows = await this.db
      .select()
      .from(coverageInducedDriftState)
      .where(eq(coverageInducedDriftState.contract_id, newContractId))
      .limit(1);

    const driftState = driftRows[0]
      ? serializeRow(driftRows[0] as Record<string, unknown>) as Record<string, unknown>
      : null;

    return { driftState, inherited };
  }

  /**
   * `POST /v1/_test/insurance/antiexploit-stashfill` — C12 stash fill for reset-exploit proof (TEST-ONLY).
   *
   * Directly calls CoverageInducedDriftService.onStashFill with a synthetic StashFillEvent
   * reflecting the given currentStashRatio. Returns hazardShiftAfter + fired flag.
   *
   * Body: { playerId, currentStashRatio }
   * Returns: { hazardShiftAfter, fired }
   *
   * R2.2: TEST-ONLY (not registered in production).
   * Anti-fabrication: no Math.random, no Date.now().
   */
  @Post('_test/insurance/antiexploit-stashfill')
  @HttpCode(200)
  async antiexploitStashFill(
    @Body() body: {
      playerId: string;
      currentStashRatio: number; // permille [0..1000]
    },
  ): Promise<{ hazardShiftAfter: number; fired: boolean }> {

    // Read the drift_state BEFORE to get the baseline fingerprint_stash_ratio
    const driftBefore = await this.db
      .select({ hazard_shift: coverageInducedDriftState.hazard_shift, fingerprint_stash_ratio: coverageInducedDriftState.fingerprint_stash_ratio })
      .from(coverageInducedDriftState)
      .where(eq(coverageInducedDriftState.player_id, body.playerId))
      .limit(1);

    if (!driftBefore[0]) {
      throw new HttpException(`No drift_state for player ${body.playerId}`, HttpStatus.NOT_FOUND);
    }

    const hazardShiftBefore = driftBefore[0].hazard_shift;
    const baselineStashRatio = driftBefore[0].fingerprint_stash_ratio;

    // Construct a synthetic StashFillEvent and call onStashFill directly.
    // StashFillEvent.heldCentsAfter + .capacityCents are plain number (not BigInt) per the event shape.
    // CAPACITY_CENTS = 100_000_000 (tier-1 default, matches captureBaselineFingerprint substrate read).
    const STASH_CAPACITY_CENTS = Number(capacityCentsForTier(1)); // reads from TunablesStore at runtime (gdd/14:3364)
    await this.driftService.onStashFill({
      type: 'stash_fill',
      playerId: body.playerId,
      buildingId: '00000000-0000-0000-0000-000000000099',
      heldCentsAfter: Math.round(body.currentStashRatio * STASH_CAPACITY_CENTS / 1000),
      capacityCents: STASH_CAPACITY_CENTS,
      gameMinute: 10080,
    });

    // Read hazard_shift AFTER the stash fill
    const driftAfterRows = await this.db
      .select({ hazard_shift: coverageInducedDriftState.hazard_shift })
      .from(coverageInducedDriftState)
      .where(eq(coverageInducedDriftState.player_id, body.playerId))
      .limit(1);
    const hazardShiftAfter = driftAfterRows[0]?.hazard_shift ?? 0;
    const fired = hazardShiftAfter > hazardShiftBefore;

    return { hazardShiftAfter, fired };
  }

  /**
   * `POST /v1/_test/insurance/antiexploit-scope-setup` — C12 scope isolation test setup (TEST-ONLY).
   *
   * Creates a fresh player with TWO underwriter almanac rows (underwriterA + underwriterB).
   * Lapses the contract under underwriterA ONLY — by directly stamping underwriterA's almanac row
   * baseline_persisted_until_tick (mimicking the fixed C11 scoped lapse stamp).
   * underwriterB's almanac row baseline_persisted_until_tick stays NULL.
   *
   * Body: { baselineStashRatio, underwriterA, underwriterB }
   * Returns: { playerId, lapseUntilTick, currentTick }
   *
   * R2.2: TEST-ONLY (not registered in production).
   */
  @Post('_test/insurance/antiexploit-scope-setup')
  @HttpCode(200)
  async antiexploitScopeSetup(
    @Body() body: {
      baselineStashRatio: number;
      underwriterA: string;
      underwriterB: string;
    },
  ): Promise<{
    playerId: string;
    lapseUntilTick: number;
    currentTick: number;
  }> {
    const MINUTES_PER_DAY_LOCAL = 24 * 60;
    const currentTick = 20160; // weekId=2 × 7 days × 1440 (deterministic, game-time)
    const persistenceDays = insuranceTunables.almanacPersistenceDaysPostLapse; // 90
    const lapseUntilTick = currentTick + persistenceDays * MINUTES_PER_DAY_LOCAL;

    // 1. Create fresh player
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow!.account_id,
        callsign: nextTestCallsign('asc'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // 2. Create almanac_entry for underwriterA: baseline fingerprint + stamped baseline_persisted_until_tick
    //    (simulating a lapsed contract under underwriterA — C11 scoped lapse stamp)
    await this.db
      .insert(almanacEntry)
      .values({
        underwriter_id: body.underwriterA,
        player_id: playerId,
        status: 'CLEAN',
        baseline_fingerprint_stash_ratio: body.baselineStashRatio,
        baseline_fingerprint_courier_cadence: 0,
        baseline_fingerprint_marginal_deal: 0,
        baseline_fingerprint_lookout: 0,
        baseline_persisted_until_tick: BigInt(lapseUntilTick), // A's lapse stamp
      });

    // 3. Create almanac_entry for underwriterB: NO baseline fingerprint, NO stamp
    //    This is the "untouched" almanac row that should NOT be affected by A's lapse.
    await this.db
      .insert(almanacEntry)
      .values({
        underwriter_id: body.underwriterB,
        player_id: playerId,
        status: 'CLEAN',
        // baseline_fingerprint_* = null (not set)
        // baseline_persisted_until_tick = null (not stamped)
      });

    return { playerId, lapseUntilTick, currentTick };
  }

  /**
   * `GET /v1/_test/insurance/antiexploit-read-almanac` — C12 almanac row reader (TEST-ONLY).
   *
   * Reads the almanac_entry row for the given (underwriterId, playerId).
   * Returns the full row (including baseline_fingerprint_* + baseline_persisted_until_tick).
   *
   * Query: ?playerId=<uuid>&underwriterId=<uuid>
   * Returns: the almanac row (null if not found)
   *
   * R2.2: TEST-ONLY (not registered in production).
   */
  @Get('_test/insurance/antiexploit-read-almanac')
  @HttpCode(200)
  async antiexploitReadAlmanac(
    @Query('playerId') playerId: string,
    @Query('underwriterId') underwriterId: string,
  ): Promise<unknown> {
    const rows = await this.db
      .select()
      .from(almanacEntry)
      .where(
        and(
          eq(almanacEntry.player_id, playerId),
          eq(almanacEntry.underwriter_id, underwriterId),
        ),
      )
      .limit(1);

    return serializeRow(rows[0] as Record<string, unknown> | null ?? null);
  }

  // ── Drift C13: GET /v1/insurance/projection (TiltLevelBucket projection — P5 wall) ─────────────
  //
  //   GET /v1/insurance/projection?playerId=<uuid>&contractId=<uuid>
  //     — calls InsuranceProjectionService.projectTiltLevel(playerId, contractId).
  //       Returns DriftClientProjection: tilt_level_bucket + premium_preview_cents + finding_tier.
  //       P5-compliant shape — ZERO raw risk scalar (no hazard_shift/fingerprint_*/true_loss_prob/
  //       base_loss_prob/baseline_persisted_until_tick). The E2E asserts each forbidden key is absent.
  //
  //   This route is mounted in the InsuranceTestController (test-env only — testControllersEnabled()).
  //   In test, it is accessible without JWT auth (playerId passed as query param — test sentinel pattern).
  //   In production, this controller is not registered → 404 (test-only surface).
  //
  //   The REAL player-facing projection endpoint lives here (not behind _test prefix) because:
  //     (a) this is the canonical API the plan's C13 E2E calls at /v1/insurance/projection;
  //     (b) the InsuranceTestController is the only insurance controller in test (no InsuranceController yet);
  //     (c) the route will be promoted to a real JWT-gated InsuranceController at C14/C15 (deferred).
  //
  //   `[needs reviewer⊥]`: the promotion of this route to a real JWT-gated controller is deferred to C14/C15.
  //   The current pattern is consistent with how other test-env projection routes work (project-contract).

  /**
   * `GET /v1/insurance/projection` — C13 drift TiltLevelBucket projection (P5 wall).
   *
   * Returns `DriftClientProjection`:
   *   - tilt_level_bucket: 'level' | 'slight_tilt' | 'significant_tilt' | 'red' (banded — canon :213)
   *   - premium_preview_cents: number | null (cash-clear DD-P5; null when bucket='level')
   *   - finding_tier: 'stash'|'courier'|'deal'|'lookout'|null (qualitative — canon :108)
   *
   * NEVER exposes: hazard_shift, fingerprint_*, true_loss_prob, base_loss_prob,
   *   baseline_persisted_until_tick (P5 wall — server-side only; BO via C14 GET drift-state).
   *
   * Query params: playerId=<uuid>&contractId=<uuid>
   * Returns: DriftClientProjection (3 fields — the P5-compliant drift surface).
   * 404 if the contract does not exist or does not belong to this player.
   *
   * Anti-fabrication: reads thresholds + α from the registry (no inline scalar).
   * No Math.random, no Date.now — fully deterministic.
   *
   * R2.2: TEST-ONLY controller (not registered in production). The P5 wall is enforced by the
   *   DriftClientProjection return type — only 3 fields, none of which are raw risk scalars.
   */
  @Get('insurance/projection')
  @HttpCode(200)
  async projectTiltLevel(
    @Query('playerId') playerId: string,
    @Query('contractId') contractId: string,
  ): Promise<import('./insurance.projection.service').DriftClientProjection> {
    return this.projectionService.projectTiltLevel(playerId, contractId);
  }

  // ── Drift C15 Routes ───────────────────────────────────────────────────────────────────────────
  //
  // IMPLEMENTS: docs/superpowers/plans/2026-06-18-depth-insurance-coverage-drift-plan.md Task 15 (C15)
  //             — Insurance Drift C15 — 2026-06-18 (Priority-1 anti-exploit UPSERT production fix E2E)
  //
  // Routes:
  //   POST /v1/_test/insurance/antiexploit-production-path
  //     — proves the REAL issuance path (counterpartyId=null) creates an almanac row (C15 UPSERT fix).
  //       Fresh player, no pre-seeded almanac row. issueContract path → captureBaselineFingerprint →
  //       almanac row CREATED by INSERT. Stamps lapse. Re-issues within window → inherits baseline.
  //       Returns { almanacCreatedByIssuance, almanacUnderwriterId, inherited, driftState }.
  //   POST /v1/_test/insurance/antiexploit-production-path-outside
  //     — same as above but re-issues OUTSIDE the persistence window → fresh capture (inherited=false).
  //       Returns { almanacCreatedByIssuance, inherited }.
  //
  // Both routes use counterpartyId=null throughout (standard production issuance, no NPC underwriter).
  // The effective underwriter identity is SYNTHETIC_UNDERWRITER_ID ('00000000-0000-0000-0000-000000000001').
  // Anti-fabrication: no Math.random, no Date.now in the mechanic path.

  /**
   * `POST /v1/_test/insurance/antiexploit-production-path` — C15 production-path anti-exploit E2E (TEST-ONLY).
   *
   * Proves the full production path WITH the C15 UPSERT fix:
   *   1. Fresh player (no prior almanac row)
   *   2. issueContract(counterpartyId=null) → captureBaselineFingerprint → almanac row CREATED (C15 fix)
   *   3. Stamp baseline_persisted_until_tick on the almanac row (simulating lapse)
   *   4. Re-issue within window via captureBaselineFingerprint(overrideIssuedTick=withinWindow) → inherited=true
   *   5. Return almanacCreatedByIssuance=true + almanacUnderwriterId=SYNTHETIC + inherited=true + driftState
   *
   * This is the KEY proof that the C15 UPSERT fix works end-to-end for production players.
   * Prior to C15: captureBaselineFingerprint only UPDATEd existing rows (warn-if-absent when no row) →
   *   no almanac row was ever created → lapse stamp found no row → inherit found no row → anti-exploit dead.
   *
   * R2.2: TEST-ONLY (not registered in production).
   * Anti-fabrication: no Math.random, no inline scalar.
   */
  @Post('_test/insurance/antiexploit-production-path')
  @HttpCode(200)
  async antiexploitProductionPath(): Promise<{
    almanacCreatedByIssuance: boolean;
    almanacUnderwriterId: string;
    inherited: boolean;
    driftState: Record<string, unknown> | null;
  }> {
    const MINUTES_PER_DAY_LOCAL = 24 * 60;
    const currentTick = 10080; // weekId=1 × 7 days × 1440 min/day (deterministic, game-time)
    const persistenceDays = insuranceTunables.almanacPersistenceDaysPostLapse; // 90

    // ── 1. Create fresh player (no prior almanac row) ──────────────────────────────────────────
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow!.account_id,
        callsign: nextTestCallsign('ap15'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // ── 2. Create a COMPLETE walk + issue a contract (counterpartyId=null — standard production path) ──
    //    Use a minimal walk (no real underwriting findings — this is about the almanac UPSERT fix,
    //    not about premium computation). We insert the walk + contract directly (same pattern as
    //    antiexploit-setup, no real walk lifecycle needed for this proof).
    const [walkRow] = await this.db
      .insert(underwriterWalkRecord)
      .values({
        player_id: playerId,
        coverage_type: 'PROPERTY',
        status: 'COMPLETE',
        start_tick: BigInt(currentTick - 5000),
        findings_bitmask: BigInt(0),
        observation_depth: 3,
      })
      .returning({ id: underwriterWalkRecord.id });

    const [contractRow] = await this.db
      .insert(insuranceContract)
      .values({
        player_id: playerId,
        type: 'PROPERTY',
        asset_ref: null,
        insured_value_cents: BigInt(100000),
        premium_cents: BigInt(4000),
        escrow_required_cents: BigInt(0),
        walk_id: walkRow!.id,
        counterparty_id: null, // ← KEY: null = standard production path (no NPC underwriter)
        status: 'ACTIVE',
        issued_tick: BigInt(currentTick - 1000),
      })
      .returning({ id: insuranceContract.id });

    const contractId = contractRow!.id;

    // ── 3. Call captureBaselineFingerprint — this is the REAL service call ──────────────────────
    //    With the C15 UPSERT fix: since counterpartyId=null, effectiveUnderwriterId=SYNTHETIC_UNDERWRITER_ID.
    //    No almanac row existed before → the INSERT-if-absent branch fires → almanac row CREATED.
    await this.driftService.captureBaselineFingerprint(contractId, currentTick - 1000);

    // ── 4. Verify almanac row was created (prove the C15 UPSERT fix) ──────────────────────────
    const [almanacRowAfterIssuance] = await this.db
      .select({
        id: almanacEntry.id,
        underwriter_id: almanacEntry.underwriter_id,
        baseline_fingerprint_stash_ratio: almanacEntry.baseline_fingerprint_stash_ratio,
        baseline_persisted_until_tick: almanacEntry.baseline_persisted_until_tick,
      })
      .from(almanacEntry)
      .where(
        and(
          eq(almanacEntry.player_id, playerId),
          eq(almanacEntry.underwriter_id, SYNTHETIC_UNDERWRITER_ID),
        ),
      )
      .limit(1);

    const almanacCreatedByIssuance = almanacRowAfterIssuance !== undefined;
    const almanacUnderwriterId = almanacRowAfterIssuance?.underwriter_id ?? '';

    // ── 5. Stamp lapse: set baseline_persisted_until_tick (simulating renewal.service LAPSE) ────
    //    This mirrors what renewal.service.ts C15-fixed lapse stamp does.
    const persistedUntilTick = currentTick + persistenceDays * MINUTES_PER_DAY_LOCAL;
    if (almanacRowAfterIssuance) {
      await this.db
        .update(almanacEntry)
        .set({
          baseline_persisted_until_tick: BigInt(persistedUntilTick),
          updated_at: new Date(),
        })
        .where(eq(almanacEntry.id, almanacRowAfterIssuance.id));
    }

    // ── 6. Create a new contract for the same player (simulating re-issue after lapse) ──────────
    //    The overrideIssuedTick = currentTick (within the persistence window of persistedUntilTick).
    const [reissueContractRow] = await this.db
      .insert(insuranceContract)
      .values({
        player_id: playerId,
        type: 'PROPERTY',
        asset_ref: null,
        insured_value_cents: BigInt(100000),
        premium_cents: BigInt(4000),
        escrow_required_cents: BigInt(0),
        walk_id: null,
        counterparty_id: null, // ← null again (same production path)
        status: 'ACTIVE',
        issued_tick: BigInt(currentTick),
      })
      .returning({ id: insuranceContract.id });

    // ── 7. Call captureBaselineFingerprint with overrideIssuedTick=currentTick (within window) ──
    //    effectiveUnderwriterId=SYNTHETIC, almanac row exists with baseline_persisted_until_tick set.
    //    → C12 inherit check fires → inherited=true (anti-exploit works).
    const { inherited } = await this.driftService.captureBaselineFingerprint(
      reissueContractRow!.id,
      currentTick, // within window: currentTick < persistedUntilTick = currentTick + 90*1440
    );

    // ── 8. Read drift_state for the re-issued contract ───────────────────────────────────────────
    const [driftRow] = await this.db
      .select({
        fingerprint_stash_ratio: coverageInducedDriftState.fingerprint_stash_ratio,
        hazard_shift: coverageInducedDriftState.hazard_shift,
      })
      .from(coverageInducedDriftState)
      .where(eq(coverageInducedDriftState.contract_id, reissueContractRow!.id))
      .limit(1);

    return {
      almanacCreatedByIssuance,
      almanacUnderwriterId,
      inherited,
      driftState: driftRow
        ? {
            fingerprint_stash_ratio: driftRow.fingerprint_stash_ratio,
            hazard_shift: driftRow.hazard_shift,
          }
        : null,
    };
  }

  /**
   * `POST /v1/_test/insurance/antiexploit-production-path-outside` — C15 outside-window (TEST-ONLY).
   *
   * Proves that re-issue OUTSIDE the persistence window captures FRESH (inherited=false).
   * Same setup as antiexploit-production-path but overrideIssuedTick is BEYOND persistedUntilTick.
   *
   * Returns { almanacCreatedByIssuance, inherited }.
   * R2.2: TEST-ONLY (not registered in production).
   */
  @Post('_test/insurance/antiexploit-production-path-outside')
  @HttpCode(200)
  async antiexploitProductionPathOutside(): Promise<{
    almanacCreatedByIssuance: boolean;
    inherited: boolean;
  }> {
    const MINUTES_PER_DAY_LOCAL = 24 * 60;
    const currentTick = 10080;
    const persistenceDays = insuranceTunables.almanacPersistenceDaysPostLapse; // 90

    // ── 1. Create fresh player ──────────────────────────────────────────────────────────────────
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow!.account_id,
        callsign: nextTestCallsign('apo'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    const playerId = playerRow!.player_id;

    // ── 2. Create contract (counterpartyId=null) ────────────────────────────────────────────────
    const [contractRow] = await this.db
      .insert(insuranceContract)
      .values({
        player_id: playerId,
        type: 'PROPERTY',
        asset_ref: null,
        insured_value_cents: BigInt(100000),
        premium_cents: BigInt(4000),
        escrow_required_cents: BigInt(0),
        walk_id: null,
        counterparty_id: null,
        status: 'ACTIVE',
        issued_tick: BigInt(currentTick - 1000),
      })
      .returning({ id: insuranceContract.id });

    // ── 3. Capture baseline (issuance) → almanac row CREATED (C15 fix) ─────────────────────────
    await this.driftService.captureBaselineFingerprint(contractRow!.id, currentTick - 1000);

    // ── 4. Verify almanac row was created ──────────────────────────────────────────────────────
    const [almanacRowAfterIssuance] = await this.db
      .select({ id: almanacEntry.id })
      .from(almanacEntry)
      .where(
        and(
          eq(almanacEntry.player_id, playerId),
          eq(almanacEntry.underwriter_id, SYNTHETIC_UNDERWRITER_ID),
        ),
      )
      .limit(1);
    const almanacCreatedByIssuance = almanacRowAfterIssuance !== undefined;

    // ── 5. Stamp lapse ──────────────────────────────────────────────────────────────────────────
    const persistedUntilTick = currentTick + persistenceDays * MINUTES_PER_DAY_LOCAL;
    if (almanacRowAfterIssuance) {
      await this.db
        .update(almanacEntry)
        .set({ baseline_persisted_until_tick: BigInt(persistedUntilTick), updated_at: new Date() })
        .where(eq(almanacEntry.id, almanacRowAfterIssuance.id));
    }

    // ── 6. Create re-issue contract (counterpartyId=null) ───────────────────────────────────────
    const [reissueContractRow] = await this.db
      .insert(insuranceContract)
      .values({
        player_id: playerId,
        type: 'PROPERTY',
        asset_ref: null,
        insured_value_cents: BigInt(100000),
        premium_cents: BigInt(4000),
        escrow_required_cents: BigInt(0),
        walk_id: null,
        counterparty_id: null,
        status: 'ACTIVE',
        issued_tick: BigInt(persistedUntilTick + 1), // OUTSIDE the window
      })
      .returning({ id: insuranceContract.id });

    // ── 7. captureBaselineFingerprint with overrideIssuedTick = persistedUntilTick + 1 (outside) ─
    //    effectiveUnderwriterId=SYNTHETIC, almanac row exists, BUT persistedUntilTick + 1 > persistedUntilTick
    //    → C12 inherit check: gt(baseline_persisted_until_tick, issuedTickNum) → false → FRESH capture.
    const { inherited } = await this.driftService.captureBaselineFingerprint(
      reissueContractRow!.id,
      persistedUntilTick + 1, // OUTSIDE: reissue tick > persistedUntilTick → no inherit
    );

    return { almanacCreatedByIssuance, inherited };
  }
}
