// IMPLEMENTS: docs/tech/04c_market_reputation_insurance/insurance_mechanics.md §4.1 (:54,:135,:149-150,:253-254)
//             docs/tech/04c_market_reputation_insurance/insurance_mechanics.md §4.2 (:106-108,:149,:213)
//             docs/superpowers/plans/2026-06-17-depth-insurance-underwriting-walk-plan.md Task 4 (C4) + Task 11 (C11)
//             docs/superpowers/plans/2026-06-18-depth-insurance-coverage-drift-plan.md Task 13 (C13)
//             design R2.2 plan §8 (P5 wall — the central P5 boundary for this lot)
//             design §1.7 DD-P5 — TiltLevelBucket + premium-preview cash-clear + finding-tier
//             — Insurance C4 — 2026-06-17 (base: getClipboard)
//             — Insurance C11 — 2026-06-17 (full: projectContract P5 wall)
//             — Insurance Drift C13 — 2026-06-18 (TiltLevelBucket projection: P5 banded; zero raw risk scalar)
//
// `InsuranceProjectionService` — the R2.2 projection service for the insurance module.
//
// ── C4 scope: getClipboard(walkId) → public c_i clipboard ─────────────────────────────────────
//
// Canon :54: "published on underwriter's clipboard, visible to player when they request quote".
// The clipboard publishes the per-finding c_i coefficients — this is PUBLIC BY DESIGN.
// The c_i values are the STAGING INFORMATION (the cue weights the underwriter uses to price risk),
// not a risk scalar derived from the player's observed state. The player can see which cues raise
// their premium and by how much — that is the transparency the canon guarantees.
//
// ── C13 scope: projectTiltLevel(playerId, contractId) → DriftClientProjection ───────────────────
//
// P5 wall (design §1.7 DD-P5; canon :149,213):
//   Returns ONLY:
//     BANDED fields (coarse presentation domain — never a raw risk scalar):
//       - tilt_level_bucket  (TiltLevelBucket — 'level'|'slight_tilt'|'significant_tilt'|'red')
//                            mirrors AlmanacRiskBand / DealerMarginBand / StashLoadBucket pattern
//     CLEAR fields (DD-P5 cash-clear):
//       - premium_preview_cents  (the escalated renewal premium the player WOULD pay at renewal;
//                                 null when bucket='level' — no elevation to preview)
//     QUALITATIVE fields (canon :108 "which finding tier triggered the bump"):
//       - finding_tier       (qualitative string label; null when no drift fingerprint data)
//
//   NEVER exposes (P5 wall):
//       - hazard_shift              (internal risk scalar — BO-only)
//       - fingerprint_stash_ratio   (internal fingerprint column — BO-only)
//       - fingerprint_courier_cadence (internal fingerprint column — BO-only)
//       - fingerprint_marginal_deal  (internal fingerprint column — BO-only)
//       - fingerprint_lookout        (internal fingerprint column — BO-only)
//       - true_loss_prob             (internal derived scalar — BO-only)
//       - base_loss_prob             (internal sentinel scalar — BO-only)
//       - baseline_persisted_until_tick (internal anti-exploit horizon — BO-only)
//
// ── C11 scope: projectContract(playerId, contractId) → InsuranceClientProjection ──────────────
//
// P5 wall (canon :253-254, R2.2 strict :149-150, plan §0 no-mock-invariant):
//   Returns ONLY:
//     CLEAR fields (cash-transaction + public):
//       - premium_cents      (DD-P5 cash-clear — the quote/charge the player debits)
//       - escrow_required_cents (DD-P5 — the cash escrow posted, 0 if no wary ring)
//       - payout_cents       (DD-P5 — the cash credited on a PAID claim, 0 if no paid claim)
//       - c_i               (public BY DESIGN, canon :54 — the pricing tariff, not the evidence)
//       - contract_status   (ACTIVE|LAPSED|FRAUDED — categorical enum, not a risk scalar)
//       - claim_status      (FILED|PAID|DENIED_FRAUD|null — categorical enum, not a risk scalar)
//       - almanac_status    (CLEAN|POISONED — categorical enum, not a risk scalar)
//
//     BANDED fields (coarse presentation domain — never a raw risk scalar):
//       - almanac_risk_band (CLEAN|ELEVATED|SEVERE — closed domain bucket; mirrors DealerMarginBand pattern)
//
//   NEVER exposes (P5/R2.2 wall):
//       - findings_bitmask     (64-bit internal risk bitmask — server-only, BO-only)
//       - observation_depth    (underwriter's inspection depth — server-only)
//       - route_id             (supply-chain leg UUID — server-only)
//       - poisoned_until_tick  (exact almanac poison horizon in ticks — server-only)
//       - collateral_amount    (raw restraint_dispute_ring amount — server-only)
//       - any internal risk numerics
//
// The distinction:
//   - c_i = the PRICING RULE (public — the underwriter's tariff schedule, intentionally transparent)
//   - findings_bitmask = the EVIDENCE (private — what the underwriter actually saw)
//   Returning c_i does NOT constitute a P5/R2.2 leak (canon :54 explicitly makes it public).
//
// Banding pattern:
//   `AlmanacRiskBand` mirrors `DealerMarginBand` (`selling.projection.service.ts:57`) and
//   `StashLoadBucket` (`city-event-bus.ts:364`): a CLOSED presentation domain with 3 buckets.
//   CLEAN (CLEAN almanac) → no fraud history.
//   ELEVATED (future: partially-cleared fraud history, reserved for §4.2 Tranche C).
//   SEVERE (POISONED almanac) → active fraud poison.
//   The cut-points are PRESENTATION boundaries (a closed qualitative domain), NOT sim tunables.
//   No gdd/14 row needed (mirrors DealerMarginBand precedent: "boundaries are PRESENTATION buckets,
//   not sim tunables — no gdd/14 row", selling.projection.service.ts:54-55).
//
// Anti-fabrication: no Math.random, no inline scalar. All c_i values from insuranceTunables.
// Zero-regression: additive service — no existing table or service mutated.

import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import {
  insuranceContract,
  insuranceClaim,
  almanacEntry,
  coverageInducedDriftState,
} from '../../db/schema/insurance';
import { insuranceTunables } from './insurance-tunables';
import { FindingType } from './findings';

// ── ClipboardProjection (C4) ────────────────────────────────────────────────────────────────────

/**
 * `ClipboardProjection` — the public c_i clipboard for a walk's coverage type.
 * Returned by `getClipboard(walkId)`.
 *
 * Canon :54: "published on underwriter's clipboard, visible to player when they request quote".
 * The c_i array is indexed by FindingType bit index (0-5). This is the ONLY field — the
 * findings_bitmask is NEVER included (R2.2 — server-only evidence, not the pricing tariff).
 */
export interface ClipboardProjection {
  /**
   * `c_i` — the 6 per-finding clipboard coefficients (public BY DESIGN — canon :54).
   * Indexed by FindingType bit index:
   *   [0] = IDLE_DEALERS_OBSERVED      (c_i for bit 0)
   *   [1] = HEAT_SMOKE_OBSERVED        (c_i for bit 1)
   *   [2] = LIEUTENANT_UNIFORM_DISCIPLINED (c_i for bit 2)
   *   [3] = STASH_QUEUE_DEEP           (c_i for bit 3)
   *   [4] = SLATE_MEMBERSHIP_STABLE    (c_i for bit 4)
   *   [5] = HOSTAGE_SHELF_STATE        (c_i for bit 5)
   *
   * Each value is in the canon range [0.1..0.6] (canon :78,186).
   * [PROPOSED DEFAULT][PROV-Y26Q2]: specific values from design §7, anchored in registry (gdd/14).
   */
  c_i: number[];
}

// ── AlmanacRiskBand (C11 — banding pattern) ────────────────────────────────────────────────────

/**
 * `AlmanacRiskBand` — closed presentation domain for the almanac risk level.
 *
 * Mirrors `DealerMarginBand` (`selling.projection.service.ts:57`) and
 * `StashLoadBucket` (`city-event-bus.ts:364`): a coarse QUALITATIVE bucket, not a raw scalar.
 *
 * CLEAN   = no fraud history (almanac_entry.status = 'CLEAN' or no entry).
 * ELEVATED = future use (§4.2 Tranche C — partial-fraud clearance, reserved).
 * SEVERE  = active fraud poison (almanac_entry.status = 'POISONED').
 *
 * Cut-points are PRESENTATION boundaries (a closed qualitative domain), NOT sim tunables.
 * No gdd/14 row (mirrors DealerMarginBand precedent: presentation buckets are not balance tunables).
 * The exact `poisoned_until_tick` is NEVER surfaced — only the SEVERE bucket.
 */
export type AlmanacRiskBand = 'CLEAN' | 'ELEVATED' | 'SEVERE';

// ── TiltLevelBucket (C13 — banding pattern for hazard_shift) ───────────────────────────────────

/**
 * `TiltLevelBucket` — closed presentation domain for the coverage-induced drift level.
 *
 * Canon `:213` verbatim: `level | slight_tilt | significant_tilt | red`.
 *
 * Mirrors `AlmanacRiskBand` (above) and `DealerMarginBand` (`selling.projection.service.ts:57`) and
 * `StashLoadBucket` (`city-event-bus.ts:364`): a coarse QUALITATIVE bucket, not the raw `hazard_shift`.
 *
 * Mapping (hazard_shift [0..255] → bucket — reads 3 threshold tunables from the registry, never inlined):
 *   level:             hazard_shift < slight_threshold  (default: 0..19)
 *   slight_tilt:       slight_threshold ≤ hazard_shift < significant_threshold  (default: 20..79)
 *   significant_tilt:  significant_threshold ≤ hazard_shift < red_threshold  (default: 80..159)
 *   red:               hazard_shift ≥ red_threshold  (default: 160..255)
 *
 * Thresholds ([PROPOSED DEFAULT][PROV-Y26Q2], registry rows from C2):
 *   insurance.coverage_drift_tilt_slight_threshold      = 20  (range 5..60)
 *   insurance.coverage_drift_tilt_significant_threshold = 80  (range 40..150)
 *   insurance.coverage_drift_tilt_red_threshold         = 160 (range 100..255)
 *
 * `[needs reviewer⊥]`: registry-vs-presentation status — the design PROPOSES registry rows since the
 * thresholds map a balance-relevant 0-255 scalar to a player-visible bucket. Flagged C13 plan §4.
 *
 * The raw `hazard_shift` (0-255) is NEVER surfaced — only this closed domain bucket (P5 wall).
 * No gdd/14 row needed for the CUT-POINTS (mirrors DealerMarginBand precedent — see note in
 * `AlmanacRiskBand`; the threshold TUNABLES themselves ARE gdd/14 rows from C2).
 */
export type TiltLevelBucket = 'level' | 'slight_tilt' | 'significant_tilt' | 'red';

// ── DriftClientProjection (C13 — the P5-compliant drift projection shape) ───────────────────────

/**
 * `DriftClientProjection` — the player-facing projection for the coverage-induced drift state.
 *
 * Canon `:149` (P5 / R2.2 strict): hazard_shift is internal-only; client sees tilt_level_bucket.
 * Canon `:108` (player surface): tilt icon + premium-preview + finding-tier.
 * Design §1.7 DD-P5: the client sees ONLY `TiltLevelBucket` + the premium-preview (cash-clear,
 *   at/near the renewal transaction) + the qualitative finding-tier. Hidden scalars stay server-side.
 *
 * **BANDED fields** (coarse presentation domain — canon :213):
 *   tilt_level_bucket  — 'level' | 'slight_tilt' | 'significant_tilt' | 'red'.
 *                        NEVER the raw hazard_shift.
 *
 * **CLEAR fields** (DD-P5 cash-clear):
 *   premium_preview_cents — the escalated renewal premium the player WOULD pay at the next renewal,
 *                           given their current drift level. Null when bucket='level' (no elevation).
 *                           Formula: round(base_premium_cents × (1 + α × hazard_shift)).
 *                           The α + base are registry-governed (no inline scalar).
 *
 * **QUALITATIVE fields** (canon :108 "which finding tier triggered the bump"):
 *   finding_tier — the qualitative label of the feature that most drove the drift.
 *                  Values: 'stash' | 'courier' | 'deal' | 'lookout' | 'rule_violation' | null.
 *                  Null when no active fingerprint data (freshly issued, no drift events yet).
 *
 * **NEVER present** (P5 wall — these stay server-side / BO-only):
 *   hazard_shift, fingerprint_stash_ratio, fingerprint_courier_cadence,
 *   fingerprint_marginal_deal, fingerprint_lookout,
 *   true_loss_prob, base_loss_prob, baseline_persisted_until_tick.
 */
export interface DriftClientProjection {
  /**
   * Coarse drift level bucket (NEVER the raw hazard_shift — P5 wall).
   * Canon `:213` verbatim: 'level' | 'slight_tilt' | 'significant_tilt' | 'red'.
   */
  tilt_level_bucket: TiltLevelBucket;

  /**
   * Escalated renewal premium (cash-clear, DD-P5). Null when bucket='level'.
   * The exact cents the player WOULD be charged at the next renewal given current drift.
   * Formula: round(base_premium_cents × (1 + α × hazard_shift)).
   * α = insuranceTunables.coverageDriftAlpha (registry-governed, default 0.05).
   */
  premium_preview_cents: number | null;

  /**
   * Qualitative finding-tier that drove the most recent drift bump (canon :108).
   * 'stash' | 'courier' | 'deal' | 'lookout' | 'rule_violation' | null.
   * Null when the drift fingerprint columns are all zero (no fingerprint data yet).
   * NEVER a raw numeric scalar — always a qualitative label.
   */
  finding_tier: 'stash' | 'courier' | 'deal' | 'lookout' | 'rule_violation' | null;
}

// ── InsuranceClientProjection (C11 — the P5-compliant projection shape) ────────────────────────

/**
 * `InsuranceClientProjection` — the player-facing projection for an insurance contract.
 *
 * Canon :149-150 (R2.2 strict): ONLY clear transaction values + categorical enums + the public c_i.
 * Canon :54: c_i is PUBLIC BY DESIGN (the pricing tariff, not the risk evidence).
 * Canon :253-254 (P5 CENTRAL): hidden risk state stays server-side / banded.
 *
 * **CLEAR fields** (cash-transaction + public):
 *   premium_cents      — the cash quote/charge debited at issuance (DD-P5).
 *   escrow_required_cents — the cash escrow posted by the player (DD-P5; 0 if no wary ring).
 *   payout_cents       — the cash credited on a PAID claim (DD-P5; 0 if no paid claim yet).
 *   c_i               — the 6 per-finding clipboard coefficients (public BY DESIGN, canon :54).
 *   contract_status   — ACTIVE | LAPSED | FRAUDED (categorical enum, not a risk scalar).
 *   claim_status      — FILED | PAID | DENIED_FRAUD | null (categorical; null = no claim filed).
 *   almanac_status    — CLEAN | POISONED (categorical enum, not a risk scalar).
 *
 * **BANDED fields** (coarse presentation domain):
 *   almanac_risk_band — CLEAN | ELEVATED | SEVERE (closed domain bucket; mirrors DealerMarginBand).
 *
 * **NEVER present** (P5 / R2.2 wall — these stay server-side):
 *   findings_bitmask, observation_depth, route_id, poisoned_until_tick, collateral_amount,
 *   any internal risk numerics.
 */
export interface InsuranceClientProjection {
  /** The cash premium charged at issuance (DD-P5 — clear transaction value). */
  premium_cents: number;

  /** The cash escrow the player must post (DD-P5 — clear; 0 if no wary counterparty). */
  escrow_required_cents: number;

  /**
   * The cash credited on a PAID claim (DD-P5 — clear; 0 if no paid claim yet).
   * When multiple claims exist for a contract, this is the sum of all PAID payouts.
   */
  payout_cents: number;

  /**
   * The 6 public clipboard c_i coefficients (public BY DESIGN — canon :54).
   * These are the per-finding premium weights, NOT the observed findings.
   * Indexed by FindingType bit index (0-5). Range: [0.1, 0.6] per finding.
   */
  c_i: number[];

  /** Contract lifecycle state (ACTIVE | LAPSED | FRAUDED). Categorical, not a risk scalar. */
  contract_status: 'ACTIVE' | 'LAPSED' | 'FRAUDED';

  /**
   * Most recent claim lifecycle state (FILED | PAID | DENIED_FRAUD), or null if no claim filed.
   * Categorical enum — not a risk scalar.
   */
  claim_status: 'FILED' | 'PAID' | 'DENIED_FRAUD' | null;

  /** Almanac status (CLEAN | POISONED). Categorical — the exact tick is never surfaced. */
  almanac_status: 'CLEAN' | 'POISONED';

  /**
   * Coarse almanac risk band (CLEAN | ELEVATED | SEVERE — closed presentation domain).
   * NEVER the raw `poisoned_until_tick`. Mirrors DealerMarginBand / StashLoadBucket.
   */
  almanac_risk_band: AlmanacRiskBand;
}

// ── InsuranceProjectionService ──────────────────────────────────────────────────────────────────

@Injectable()
export class InsuranceProjectionService {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
  ) {}

  /**
   * `getClipboard(walkId)` — returns the public c_i coefficients for a walk.
   *
   * Canon :54: the c_i are published on the underwriter's clipboard when the player requests a quote.
   * This is the STAGING INFORMATION — the pricing tariff — not the evidence (bitmask).
   *
   * The walkId parameter is accepted for API consistency (C11 uses walkId in the contract lookup).
   * At C4, the c_i are invariant across walks (they are registry-governed tunables,
   * not per-walk computed values — the same tariff applies to all quotes).
   *
   * R2.2: the response contains ONLY `c_i`. `findings_bitmask`, `observation_depth`, `route_id`,
   *   and all internal risk numerics are NEVER returned here.
   *
   * @param walkId — the UUID of the underwriter_walk_record (unused at C4; reserved for consistency).
   * @returns `{ c_i: number[] }` — the 6 public c_i coefficients indexed by FindingType bit index.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getClipboard(_walkId: string): ClipboardProjection {
    // Return the 6 c_i values from the registry (gdd/14 — registry-first, no inline scalar).
    // Order matches FindingType bit indices 0-5 (stable — see findings.ts).
    const c_i: number[] = [
      insuranceTunables.getCiForFinding(FindingType.IDLE_DEALERS_OBSERVED),        // bit 0
      insuranceTunables.getCiForFinding(FindingType.HEAT_SMOKE_OBSERVED),           // bit 1
      insuranceTunables.getCiForFinding(FindingType.LIEUTENANT_UNIFORM_DISCIPLINED), // bit 2
      insuranceTunables.getCiForFinding(FindingType.STASH_QUEUE_DEEP),              // bit 3
      insuranceTunables.getCiForFinding(FindingType.SLATE_MEMBERSHIP_STABLE),       // bit 4
      insuranceTunables.getCiForFinding(FindingType.HOSTAGE_SHELF_STATE),           // bit 5
    ];

    return { c_i };
  }

  /**
   * `projectContract(playerId, contractId)` — the full R2.2 P5-wall projection.
   *
   * Returns `InsuranceClientProjection` — ONLY:
   *   - CLEAR fields: premium_cents (DD-P5), escrow_required_cents (DD-P5), payout_cents (DD-P5),
   *     c_i (public BY DESIGN :54), contract_status, claim_status, almanac_status.
   *   - BANDED fields: almanac_risk_band (CLEAN|ELEVATED|SEVERE — closed domain, mirrors DealerMarginBand).
   *
   * NEVER exposes: findings_bitmask, observation_depth, route_id, poisoned_until_tick,
   *   collateral_amount, or any internal risk scalar. These stay server-side (BO-only via C12).
   *
   * Queries:
   *   1. insurance_contract (player_id + contract_id) for status + premium_cents + escrow_required_cents.
   *   2. insurance_claim (contract_id) — most recent by filed_tick DESC for claim_status.
   *      payout_cents = sum of all PAID claim payouts for this contract.
   *   3. almanac_entry (player_id) — status for categorical enum + risk band derivation.
   *      poisoned_until_tick is read internally for band derivation but NEVER forwarded.
   *   4. c_i from the registry (insuranceTunables — no DB read needed; registry-governed).
   *
   * @param playerId — the player's UUID (ownership guard).
   * @param contractId — the UUID of the insurance_contract to project.
   * @returns `InsuranceClientProjection` — the P5-compliant projection.
   * @throws 404 if the contract does not exist or does not belong to this player.
   */
  async projectContract(playerId: string, contractId: string): Promise<InsuranceClientProjection> {
    // ── Step 1: Load the insurance_contract ────────────────────────────────────────────────────────
    //
    // Ownership guard: the contract must belong to this player.
    // Load ONLY the fields needed for the projection (not findings_bitmask — server-only).
    const [contractRow] = await this.db
      .select({
        id: insuranceContract.id,
        status: insuranceContract.status,
        premium_cents: insuranceContract.premium_cents,
        // escrow_required_cents: persisted by migration 0066 (C12).
        // TD-ESCROW-CAPITAL-LOCK: persist + surface the OBLIGATION only — the full Erlang-style
        // capital lock (deducting from spendable balance + refunding on contract close) is deferred
        // to a wary-depth follow-up. C13 will route the TD number.
        escrow_required_cents: insuranceContract.escrow_required_cents,
      })
      .from(insuranceContract)
      .where(
        and(
          eq(insuranceContract.id, contractId),
          eq(insuranceContract.player_id, playerId),
        ),
      )
      .limit(1);

    if (!contractRow) {
      throw new HttpException(
        `Contract ${contractId} not found for player ${playerId}`,
        HttpStatus.NOT_FOUND,
      );
    }

    // ── Step 2: Load claims for this contract ──────────────────────────────────────────────────────
    //
    // Most recent claim by filed_tick DESC for claim_status.
    // Sum all PAID payouts for payout_cents (a contract may have multiple claims in multi-coverage
    // scenarios; the projection surfaces the total credited cash).
    // R2.2: we load claim_basis for internal use but DO NOT include it in the projection
    // (claim_basis is internal administrative state — the player sees only the status).
    const claimRows = await this.db
      .select({
        id: insuranceClaim.id,
        status: insuranceClaim.status,
        payout_cents: insuranceClaim.payout_cents,
        filed_tick: insuranceClaim.filed_tick,
      })
      .from(insuranceClaim)
      .where(eq(insuranceClaim.contract_id, contractId))
      .orderBy(desc(insuranceClaim.filed_tick));

    // Derive claim_status from the most recent claim (null if no claims).
    const latestClaim = claimRows[0] ?? null;
    const claimStatus: 'FILED' | 'PAID' | 'DENIED_FRAUD' | null = latestClaim
      ? (latestClaim.status as 'FILED' | 'PAID' | 'DENIED_FRAUD')
      : null;

    // Sum of all PAID claim payouts (total cash credited to the player).
    const totalPayoutCents = claimRows
      .filter((c) => c.status === 'PAID')
      .reduce((sum, c) => sum + Number(c.payout_cents ?? 0n), 0);

    // ── Step 3: Load the almanac entry ─────────────────────────────────────────────────────────────
    //
    // almanac_entry is player-scoped (one per player).
    // We read status + poisoned_until_tick INTERNALLY for band derivation.
    // NEITHER raw column appears in the projection — only the categorical status and the band.
    // poisoned_until_tick is read but NOT forwarded (P5 wall).
    const [almanacRow] = await this.db
      .select({
        status: almanacEntry.status,
        poisoned_until_tick: almanacEntry.poisoned_until_tick,
        // NOTE: we read poisoned_until_tick internally for band derivation.
        // It is NEVER included in InsuranceClientProjection. The P5 wall holds.
      })
      .from(almanacEntry)
      .where(eq(almanacEntry.player_id, playerId))
      .limit(1);

    // Derive almanac status (CLEAN if no entry — fresh player).
    const almanacStatus: 'CLEAN' | 'POISONED' = almanacRow?.status ?? 'CLEAN';

    // ── Step 4: Derive the almanac_risk_band (banding — mirrors DealerMarginBand) ────────────────
    //
    // AlmanacRiskBand = CLEAN | ELEVATED | SEVERE (closed presentation domain).
    // SEVERE = almanac_status = 'POISONED' (active fraud poison).
    // CLEAN  = almanac_status = 'CLEAN' (no fraud history, or no entry).
    // ELEVATED is reserved for §4.2 Tranche C (partially-cleared fraud history).
    //   For Tranche B, no ELEVATED scenario is produced — all transitions go CLEAN→POISONED.
    //   ELEVATED is present in the type for forward-compatibility with Tranche C.
    //
    // The poisoned_until_tick is read INTERNALLY here but is NOT surfaced — the band is the only
    // presentation artifact. This is the R2.2 banding pattern for the almanac (vs DealerMarginBand
    // for margin tiers, StashLoadBucket for stash occupancy).
    //
    // Cut-points: a PRESENTATION boundary (closed qualitative domain), not a sim tunable.
    // No gdd/14 row (mirrors DealerMarginBand precedent).
    const almanacRiskBand: AlmanacRiskBand = deriveAlmanacRiskBand(almanacStatus);

    // ── Step 5: Build c_i (registry — no DB read needed) ─────────────────────────────────────────
    //
    // c_i is public BY DESIGN (canon :54). It is NOT a risk scalar — it is the pricing tariff
    // (the weights the underwriter uses to price each cue). The player uses this to understand
    // which cues drive their premium up.
    //
    // The c_i values are INVARIANT across contracts (registry-governed tunables).
    // No DB read needed for c_i — they come from the TunablesStore via insuranceTunables.
    const c_i: number[] = [
      insuranceTunables.getCiForFinding(FindingType.IDLE_DEALERS_OBSERVED),        // bit 0
      insuranceTunables.getCiForFinding(FindingType.HEAT_SMOKE_OBSERVED),           // bit 1
      insuranceTunables.getCiForFinding(FindingType.LIEUTENANT_UNIFORM_DISCIPLINED), // bit 2
      insuranceTunables.getCiForFinding(FindingType.STASH_QUEUE_DEEP),              // bit 3
      insuranceTunables.getCiForFinding(FindingType.SLATE_MEMBERSHIP_STABLE),       // bit 4
      insuranceTunables.getCiForFinding(FindingType.HOSTAGE_SHELF_STATE),           // bit 5
    ];

    // ── Step 6: Assemble and return the InsuranceClientProjection ─────────────────────────────────
    //
    // R2.2 FINAL CHECK (commented invariants — the P5 wall):
    //   ✓ premium_cents       — clear DD-P5 transaction value
    //   ✓ escrow_required_cents — clear DD-P5 transaction value
    //   ✓ payout_cents        — clear DD-P5 transaction value (sum of PAID payouts)
    //   ✓ c_i                — public BY DESIGN (canon :54)
    //   ✓ contract_status     — categorical enum (ACTIVE|LAPSED|FRAUDED)
    //   ✓ claim_status        — categorical enum | null
    //   ✓ almanac_status      — categorical enum (CLEAN|POISONED)
    //   ✓ almanac_risk_band   — banded (CLEAN|ELEVATED|SEVERE — closed domain)
    //   ✗ findings_bitmask    — NEVER (server-only)
    //   ✗ observation_depth   — NEVER (server-only)
    //   ✗ route_id            — NEVER (server-only)
    //   ✗ poisoned_until_tick — NEVER (server-only; read internally for band, not forwarded)
    //   ✗ collateral_amount   — NEVER (server-only)
    return {
      premium_cents: Number(contractRow.premium_cents ?? 0n),
      // escrow_required_cents: read from DB (migration 0066 persists this value from issuance).
      // Non-zero when DD-WARY fired at issuance (wary counterparty + collateral_amount > 0).
      // Zero for neutral (non-wary) contracts.
      escrow_required_cents: Number(contractRow.escrow_required_cents ?? 0n),
      payout_cents: totalPayoutCents,
      c_i,
      contract_status: contractRow.status as 'ACTIVE' | 'LAPSED' | 'FRAUDED',
      claim_status: claimStatus,
      almanac_status: almanacStatus,
      almanac_risk_band: almanacRiskBand,
    };
  }
  /**
   * `projectTiltLevel(playerId, contractId)` — C13 drift P5-wall projection.
   *
   * Returns `DriftClientProjection` — ONLY:
   *   - BANDED: tilt_level_bucket (TiltLevelBucket — closed domain, canon :213)
   *   - CLEAR: premium_preview_cents (escalated renewal cash-clear, DD-P5; null when 'level')
   *   - QUALITATIVE: finding_tier (which feature drove drift, canon :108; null when no fingerprint data)
   *
   * NEVER exposes: hazard_shift, fingerprint_*, true_loss_prob, base_loss_prob,
   *   or baseline_persisted_until_tick. These stay server-side (BO-only via C14).
   *
   * Queries:
   *   1. coverageInducedDriftState for the contract → hazard_shift + fingerprint columns
   *      (read internally for banding; NEITHER exposed in the returned shape — P5 wall).
   *   2. insuranceContract for premium_cents + insured_value_cents (base premium derivation).
   *   3. The 3 threshold tunables + α from the registry (no inline scalar).
   *
   * P5 wall: the returned shape is `DriftClientProjection` — a TypeScript type with ONLY
   *   the 3 allowed fields. No field spreading, no raw-row pass-through.
   *
   * @param playerId   — the player's UUID (ownership guard on insurance_contract).
   * @param contractId — the UUID of the insurance_contract (also indexed on drift_state).
   * @returns `DriftClientProjection` — the P5-compliant tilt projection.
   * @throws 404 if the contract does not exist or does not belong to this player.
   */
  async projectTiltLevel(playerId: string, contractId: string): Promise<DriftClientProjection> {
    // ── Step 1: Load the contract (ownership + base premium data) ─────────────────────────────────
    //
    // Ownership guard: contract must belong to this player.
    // Load ONLY the fields needed (premium_cents, insured_value_cents — for the preview formula).
    // NEVER load findings_bitmask or any server-side-only field here.
    const [contractRow] = await this.db
      .select({
        id: insuranceContract.id,
        premium_cents: insuranceContract.premium_cents,
        insured_value_cents: insuranceContract.insured_value_cents,
      })
      .from(insuranceContract)
      .where(
        and(
          eq(insuranceContract.id, contractId),
          eq(insuranceContract.player_id, playerId),
        ),
      )
      .limit(1);

    if (!contractRow) {
      throw new HttpException(
        `Contract ${contractId} not found for player ${playerId}`,
        HttpStatus.NOT_FOUND,
      );
    }

    // ── Step 2: Load the drift_state for this contract ────────────────────────────────────────────
    //
    // We need: hazard_shift (for banding + preview formula) + the 4 fingerprint columns (for
    // finding_tier derivation). These are read INTERNALLY — NEVER forwarded to the caller.
    // The drift_state is linked by contract_id (soft-ref, no DB FK — mirrors walk_id pattern).
    // If no drift_state exists (contract pre-dates drift, or never issued), we return safe defaults.
    const [driftRow] = await this.db
      .select({
        hazard_shift: coverageInducedDriftState.hazard_shift,
        fingerprint_stash_ratio: coverageInducedDriftState.fingerprint_stash_ratio,
        fingerprint_courier_cadence: coverageInducedDriftState.fingerprint_courier_cadence,
        fingerprint_marginal_deal: coverageInducedDriftState.fingerprint_marginal_deal,
        fingerprint_lookout: coverageInducedDriftState.fingerprint_lookout,
        // NOTE: These fields are read INTERNALLY only — they are NEVER forwarded to the caller.
        // The P5 wall is enforced by the DriftClientProjection return type (only 3 fields).
      })
      .from(coverageInducedDriftState)
      .where(
        and(
          eq(coverageInducedDriftState.player_id, playerId),
          eq(coverageInducedDriftState.contract_id, contractId),
        ),
      )
      .limit(1);

    // Safe defaults when no drift_state (Tranche B contracts with no drift, or no contract_id bound).
    const hazardShift: number = driftRow?.hazard_shift ?? 0;
    const fpStashRatio: number = driftRow?.fingerprint_stash_ratio ?? 0;
    const fpCourierCadence: number = driftRow?.fingerprint_courier_cadence ?? 0;
    const fpMarginalDeal: number = driftRow?.fingerprint_marginal_deal ?? 0;
    const fpLookout: number = driftRow?.fingerprint_lookout ?? 0;

    // ── Step 3: Derive the TiltLevelBucket (reads 3 threshold tunables — no inline) ──────────────
    //
    // Registry tunables (C2, no inline scalar):
    //   slight_threshold      = insuranceTunables.coverageDriftTiltSlightThreshold      (default 20)
    //   significant_threshold = insuranceTunables.coverageDriftTiltSignificantThreshold  (default 80)
    //   red_threshold         = insuranceTunables.coverageDriftTiltRedThreshold          (default 160)
    //
    // Mapping rule (canonical derivation, boundary-inclusive at each step):
    //   hazard_shift < slight_threshold             → 'level'
    //   hazard_shift < significant_threshold        → 'slight_tilt'
    //   hazard_shift < red_threshold                → 'significant_tilt'
    //   hazard_shift ≥ red_threshold                → 'red'
    //
    // `[needs reviewer⊥]`: the thresholds are registry rows (C2 gdd/14 §4.2 NEW tunables).
    // The design PROPOSES registry rows since they map a balance-relevant 0-255 scalar to a bucket.
    const tiltBucket: TiltLevelBucket = deriveTiltLevelBucket(hazardShift);

    // ── Step 4: Derive premium_preview_cents (cash-clear, DD-P5) ─────────────────────────────────
    //
    // Canon :108: "premium previews as elevated" — surfaced at/near the renewal transaction.
    // Null when bucket='level' (no elevation to preview — the player sees no tilt signal).
    // Formula: round(basePremium × (1 + α × hazard_shift)).
    //   basePremium = the insured-value-based premium from the contract row (premium_cents persisted
    //     at issuance — represents the base before any drift escalation).
    //     REUSE: same formula anchor as RenewalService (C11) — no duplicate coefficient.
    //   α = insuranceTunables.coverageDriftAlpha (registry-governed, default 0.05, canon :119).
    //
    // Note: for a freshly issued contract with hazard_shift=0, the formula gives:
    //   escalated = round(basePremium × (1 + 0.05 × 0)) = round(basePremium × 1.0) = basePremium.
    // When bucket='level', we return null (the player sees no elevation signal — canon :108 says
    // "icon turns red ... premium previews as elevated" — the preview appears at non-level tilt).
    let premiumPreviewCents: number | null = null;
    if (tiltBucket !== 'level') {
      const basePremiumCents = Number(contractRow.premium_cents ?? 0n);
      const alpha = insuranceTunables.coverageDriftAlpha;
      premiumPreviewCents = Math.round(basePremiumCents * (1 + alpha * hazardShift));
    }

    // ── Step 5: Derive the finding_tier (qualitative — canon :108) ────────────────────────────────
    //
    // Canon :108: "player can see on clipboard exactly which finding tier triggered the bump".
    // Qualitative: we derive which feature column has the highest value (the dominant driver).
    // The fingerprint columns are RUNNING ESTIMATES of the player's current behaviour on each axis:
    //   fingerprint_stash_ratio:       the last observed stash fill ratio per-mille [0..1000]
    //   fingerprint_courier_cadence:   the last observed courier rotation cadence (game-days)
    //   fingerprint_marginal_deal:     the last observed marginal-deal rate per-mille [0..1000]
    //   fingerprint_lookout:           the last observed lookout rate per-mille [0..1000]
    //
    // The "highest column" is a proxy for "which feature most recently drove drift".
    // When all are zero (no fingerprint data), finding_tier = null (no signal).
    //
    // Note: the rule_violation feature has no fingerprint column (unconditional += 1 by C8).
    //   If hazard_shift > 0 and all fingerprint cols = 0, we cannot attribute to a feature →
    //   return null (honest; the first increment may have come from a rule_violation).
    const findingTier = deriveFindingTier(fpStashRatio, fpCourierCadence, fpMarginalDeal, fpLookout);

    // ── Step 6: Assemble and return DriftClientProjection ─────────────────────────────────────────
    //
    // P5 FINAL CHECK (the return type `DriftClientProjection` enforces the wall at compile time):
    //   ✓ tilt_level_bucket        — banded (closed 4-value domain — canon :213)
    //   ✓ premium_preview_cents    — clear DD-P5 (cash-clear, null when 'level')
    //   ✓ finding_tier             — qualitative (canon :108; null when no data)
    //   ✗ hazard_shift             — NEVER (server-only)
    //   ✗ fingerprint_stash_ratio  — NEVER (server-only)
    //   ✗ fingerprint_courier_cadence — NEVER (server-only)
    //   ✗ fingerprint_marginal_deal — NEVER (server-only)
    //   ✗ fingerprint_lookout      — NEVER (server-only)
    //   ✗ true_loss_prob           — NEVER (server-only)
    //   ✗ base_loss_prob           — NEVER (server-only)
    //   ✗ baseline_persisted_until_tick — NEVER (server-only)
    return {
      tilt_level_bucket: tiltBucket,
      premium_preview_cents: premiumPreviewCents,
      finding_tier: findingTier,
    };
  }
}

// ── Private helpers ────────────────────────────────────────────────────────────────────────────────

/**
 * `deriveTiltLevelBucket` — maps a raw `hazard_shift` to a `TiltLevelBucket`.
 *
 * Reads 3 threshold tunables from the registry (no inline scalar — R2.3):
 *   slight_threshold      = insuranceTunables.coverageDriftTiltSlightThreshold      (default 20)
 *   significant_threshold = insuranceTunables.coverageDriftTiltSignificantThreshold  (default 80)
 *   red_threshold         = insuranceTunables.coverageDriftTiltRedThreshold          (default 160)
 *
 * Boundary re-derivation (inclusive-at-threshold):
 *   hazardShift < slight_threshold       → 'level'           (0..19 with defaults)
 *   hazardShift < significant_threshold  → 'slight_tilt'     (20..79 with defaults)
 *   hazardShift < red_threshold          → 'significant_tilt' (80..159 with defaults)
 *   hazardShift ≥ red_threshold          → 'red'             (160..255 with defaults)
 *
 * Canon `:213` verbatim: TiltLevelBucket = 'level' | 'slight_tilt' | 'significant_tilt' | 'red'.
 * `[needs reviewer⊥]`: threshold values are `[PROPOSED DEFAULT][PROV-Y26Q2]` (design §7).
 *
 * @param hazardShift — the raw hazard_shift value (read internally; NEVER forwarded to callers).
 * @returns TiltLevelBucket — the coarse presentation bucket.
 */
function deriveTiltLevelBucket(hazardShift: number): TiltLevelBucket {
  const slightThreshold = insuranceTunables.coverageDriftTiltSlightThreshold;
  const significantThreshold = insuranceTunables.coverageDriftTiltSignificantThreshold;
  const redThreshold = insuranceTunables.coverageDriftTiltRedThreshold;

  if (hazardShift < slightThreshold) return 'level';
  if (hazardShift < significantThreshold) return 'slight_tilt';
  if (hazardShift < redThreshold) return 'significant_tilt';
  return 'red';
}

/**
 * `deriveFindingTier` — qualitative label of the dominant drift driver (canon :108).
 *
 * Maps the 4 running-estimate fingerprint columns to a qualitative label.
 * Returns the feature with the highest column value (the dominant driver of drift).
 * Returns null when all columns are zero (no fingerprint data — honest sentinel).
 *
 * The 'rule_violation' tier is not derivable from fingerprint columns (C8 unconditional).
 * When all fingerprint cols = 0 and hazard_shift > 0, the bump may be from rule_violation →
 * return null (honest — we cannot attribute to a fingerprint feature).
 *
 * Values: 'stash' | 'courier' | 'deal' | 'lookout' | null (never a raw numeric).
 *
 * @param fpStashRatio       — fingerprint_stash_ratio (internal, NEVER forwarded)
 * @param fpCourierCadence   — fingerprint_courier_cadence (internal, NEVER forwarded)
 * @param fpMarginalDeal     — fingerprint_marginal_deal (internal, NEVER forwarded)
 * @param fpLookout          — fingerprint_lookout (internal, NEVER forwarded)
 * @returns qualitative finding-tier label | null
 */
function deriveFindingTier(
  fpStashRatio: number,
  fpCourierCadence: number,
  fpMarginalDeal: number,
  fpLookout: number,
): 'stash' | 'courier' | 'deal' | 'lookout' | null {
  const maxVal = Math.max(fpStashRatio, fpCourierCadence, fpMarginalDeal, fpLookout);
  if (maxVal === 0) return null; // no fingerprint data — honest sentinel

  if (fpStashRatio === maxVal) return 'stash';
  if (fpCourierCadence === maxVal) return 'courier';
  if (fpMarginalDeal === maxVal) return 'deal';
  return 'lookout';
}

/**
 * `deriveAlmanacRiskBand` — maps an almanac status to an AlmanacRiskBand bucket.
 *
 * Banding rule (PRESENTATION — not a sim tunable):
 *   CLEAN   → CLEAN   (no fraud history; fresh player / clean slate)
 *   POISONED → SEVERE  (active fraud poison; the worst standing)
 *
 * ELEVATED is reserved for §4.2 Tranche C (partially-cleared fraud → partial standing).
 * For Tranche B, all poisoned players are SEVERE — no partial clearance mechanic yet.
 *
 * @param status — the almanac_entry.status value ('CLEAN' | 'POISONED'), or 'CLEAN' if no entry.
 * @returns AlmanacRiskBand — the coarse presentation bucket.
 */
function deriveAlmanacRiskBand(status: 'CLEAN' | 'POISONED'): AlmanacRiskBand {
  if (status === 'POISONED') return 'SEVERE';
  // CLEAN (no fraud history or no almanac entry):
  return 'CLEAN';
}
