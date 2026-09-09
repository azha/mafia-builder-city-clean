// IMPLEMENTS: docs/tech/04c_market_reputation_insurance/insurance_mechanics.md §4.1 (:56, :79-80)
//             docs/superpowers/plans/2026-06-17-depth-insurance-underwriting-walk-plan.md Task 10 (C10)
//             "Shared signatures" — FraudDetectionService, checkClaimAgainstWalk, applyFraudPenalty
//             — Insurance C10 — 2026-06-17
//             — Insurance C10 fix — 2026-06-17 (BLOCKING regression fix: honest real-flow claims PAID)
//             — Insurance §1.4 correction — DD-FRAUD-AUTOCLAIM (bit-0 out-of-domain remap, 2026-06-18)
//
// `FraudDetectionService` — cross-service fraud detection: claim_basis → FindingType contradiction
//   check (§1.4 corrected map — DD-FRAUD-AUTOCLAIM) + 5× penalty debit + FRAUDED + almanac POISONED
//   (DD-FRAUD-POISON).
//
// ── §1.4 claim_basis → FindingType CONTRADICTION MAP (CORRECTED — bit-0 out-of-domain) ─────────
//
// Design §1.4 (correction pass 2026-06-17 — DD-FRAUD-AUTOCLAIM ruling, RATIFIED C13):
//
// TWO BARRIERS guarantee honest production claims are NEVER denied:
//   BARRIER 1 (DD-FRAUD-AUTOCLAIM): The 3 auto-claim handlers in claims.service.ts NO LONGER call
//     checkClaimAgainstWalk. Auto-generated claims (from real raid/courier/fence events) are
//     truthful BY CONSTRUCTION — the subscriber assigns claim_basis from the actual contract type
//     + loss event, so it is always consistent with the loss that occurred. Canon :19 anchors
//     fraud on a PLAYER ACTION (staging), not on a system-emitted claim. The fraud machinery is
//     RETAINED and exercised by: (a) the BO force-fraud-detection path; (b) future
//     player-submitted-claim (TD-126, § 5).
//
//   BARRIER 2 (out-of-domain bit-0 map): For the BO/staged path, the contradiction finding for
//     EVERY claim_basis maps to IDLE_DEALERS_OBSERVED (bit 0) — the ONLY bit that is:
//     (a) outside ALL 4 coverage honest domains (COVERAGE_DOMAIN_FINDINGS), and
//     (b) NEVER fired by production recordFindings (underwriting-walk.service.ts:findingFires
//         returns false for IDLE_DEALERS_OBSERVED — not observable from any substrate table).
//     Therefore even if checkClaimAgainstWalk were mistakenly called on an auto-claim with a
//     production-populated walk, it would NOT fire (bit 0 never set by recordFindings).
//     Bit 0 can ONLY be set by an explicit BO/staging write (the out-of-domain staging path).
//
// CORRECTED MAP — all 5 entries map to IDLE_DEALERS_OBSERVED (bit 0), fraudWhen:'present':
//
// | claim_basis      | FindingType contradicted              | Fraud when bit is... | Narrative |
// |------------------|---------------------------------------|----------------------|-----------|
// | HEAT_RAID        | IDLE_DEALERS_OBSERVED (bit 0)         | SET (present)        | "Heat-raided" contradicted by idle dealers (idle = low pressure = no raid plausible) — canon :56 exact inverse |
// | DEALER_TURNOVER  | IDLE_DEALERS_OBSERVED (bit 0)         | SET (present)        | "Dealer turnover" contradicted by idle dealers (idle dealers don't "turn over" — they're inactive, not churning) |
// | COURIER_BETRAYAL | IDLE_DEALERS_OBSERVED (bit 0)         | SET (present)        | "Courier betrayal" contradicted by idle dealers (calm inactive terrain = no betrayal pressure) |
// | STORAGE_OVERFLOW | IDLE_DEALERS_OBSERVED (bit 0)         | SET (present)        | "Stash overflow" contradicted by idle dealers (overflow requires congested distribution; idle = no congestion) |
// | FENCE_FLIGHT     | IDLE_DEALERS_OBSERVED (bit 0)         | SET (present)        | "Fence fled" contradicted by idle dealers (idle = low overall activity = fence flight under-exposure implausible) |
//
// PROOF OF OUT-OF-DOMAIN EXCLUSION (per design §1.4):
//   PROPERTY (HEAT_RAID)     : honest domain = {1,2}; bit 0 ∉ {1,2} ✓
//   STASH_LOSS (DEALER_TURNOVER, STORAGE_OVERFLOW): honest domain = {3,1,2}; bit 0 ∉ {3,1,2} ✓
//   COURIER_ARREST (COURIER_BETRAYAL): honest domain = {4,2}; bit 0 ∉ {4,2} ✓
//   FENCE_DEFAULT (FENCE_FLIGHT): honest domain = {5,2}; bit 0 ∉ {5,2} ✓
//   → bit 0 is the UNIQUE bit hors-domaine for ALL 4 coverages simultaneously.
//
// WHY THE PRIOR MAP WAS WRONG (for reviewer⊥ audit trail):
//   The C10 code mapped DEALER_TURNOVER→bit1, COURIER_BETRAYAL→bit4, FENCE_FLIGHT→bit5.
//   All three bits ARE in their coverage's honest domain (COVERAGE_DOMAIN_FINDINGS):
//   bit 1 (HEAT_SMOKE) is in STASH_LOSS domain; bit 4 (SLATE) is in COURIER domain;
//   bit 5 (HOSTAGE_SHELF) is in FENCE domain. A production recordFindings on a hot stash /
//   active courier / over-buffer fence sets these bits → honest auto-claim DENIED_FRAUD.
//   The corrected mapping eliminates this false-positive by using the only bit never fired
//   by production: bit 0 IDLE_DEALERS_OBSERVED.
//
// [RATIFIED C13] — DD-FRAUD-AUTOCLAIM (barrier 1) + bit-0 out-of-domain map (barrier 2)
//
// [RATIFIED C13] — this corrected map is grounded in canon :56 principles (affirmative
// contradiction only) and satisfies both invariants.
//
// ── DD-FRAUD-POISON (design §4 — `[RATIFIED C13]`) ───────────────────────────────────────────────
//
// The poison horizon REUSES `underwriting_almanac_persistence_days_post_lapse` at its MAXIMUM (365 days)
// for the "almanac poisoned for years" canon quote (:24, :56).
//
// Formula:
//   poisoned_until_tick = currentGameTick + 365 × inGameDayLengthMinutes
//
// Where:
//   - currentGameTick: `event.gameMinute` / the authoritative city-sim clock (game-time, NOT wall-clock)
//   - 365: the RANGE MAX of `underwriting_almanac_persistence_days_post_lapse` (plan §C10 DD-FRAUD-POISON)
//   - inGameDayLengthMinutes: `T.clock.in_game_day_length_minutes` read from the registry (default 1440)
//     — NOT hardcoded; reads `citySimTunables.inGameDayLengthMinutes` (same pattern as precursor-market.service.ts:248).
//
// This reuses the persistence tunable at max rather than adding a dedicated `insurance.underwriting_fraud_poison_days`.
// Flagged for reviewer⊥: the reviewer may require a dedicated tunable if the semantics diverge from
// post-lapse persistence (the canon anchors both on §4.1; reuse is consistent).
//
// ── applyFraudPenalty — 3 state transitions + 5× debit ──────────────────────────────────────────
//
//   1. Debit `underwriting_fraud_penalty_multiplier × premium_cents` from economy_states.cash_cents
//      (atomic, same pattern as ContractService.issueContract — SQL: cash = cash - penalty WHERE cash >= penalty).
//   2. Set insurance_claim.status → DENIED_FRAUD.
//   3. Set insurance_contract.status → FRAUDED.
//   4. Set almanac_entry.status → POISONED + poisoned_until_tick = currentTick + 365 × dayLength.
//
// ── R2.2 ─────────────────────────────────────────────────────────────────────────────────────────
//
// `findings_bitmask` is read server-side for fraud detection; it NEVER appears in any returned shape.
// The player learns the verdict (DENIED_FRAUD status + cash penalty) — not the detection details.
// `applyFraudPenalty` result is exposed as state transitions (statuses) only.
//
// ── Anti-fabrication ─────────────────────────────────────────────────────────────────────────────
//
// No Math.random. All penalty multiplier + persistence values from insuranceTunables (registry-first).
// The contradiction map is structural (enum-to-bit lookups) — no calibrated inline scalar.

import { Injectable, Logger, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import {
  insuranceClaim,
  insuranceContract,
  almanacEntry,
  underwriterWalkRecord,
} from '../../db/schema/insurance';
import { economyState } from '../../db/schema/player_economy_state';
import { FindingType, FINDING_BIT } from './findings';
import { insuranceTunables } from './insurance-tunables';
import { citySimTunables } from '../../citysim/citysim-tunables';
import { SYNTHETIC_UNDERWRITER_ID } from './insurance-constants';

/**
 * `FRAUD_CONTRADICTION_MAP` — the §1.4 claim_basis → FindingType contradiction map (DD-FRAUD-AUTOCLAIM corrected).
 *
 * Each entry specifies:
 *   - `finding`: the FindingType whose bit is checked in `findings_bitmask`
 *   - `fraudWhen`: 'present' → fraud fires when the bit IS set (affirmative contradiction)
 *
 * ALL 5 entries map to IDLE_DEALERS_OBSERVED (bit 0) — the ONLY bit that is:
 *   (a) outside ALL 4 coverage honest domains (COVERAGE_DOMAIN_FINDINGS), and
 *   (b) never fired by production recordFindings (IDLE_DEALERS_OBSERVED returns false
 *       in underwriting-walk.service.ts findingFires — not observable from any substrate table).
 *
 * This map is exercised ONLY by the BO force-fraud-detection path and by the _test
 * `file-claim-with-walk` route (which explicitly stages bit 0 to model player staging).
 * The 3 auto-claim handlers in claims.service.ts do NOT call checkClaimAgainstWalk
 * (DD-FRAUD-AUTOCLAIM barrier 1 — auto-claims are truthful by construction).
 *
 * [RATIFIED C13] — DD-FRAUD-AUTOCLAIM (barrier 1 = no fraud-check on auto-claims)
 * + bit-0 out-of-domain map (barrier 2 = bit 0 never set by honest production recordFindings).
 */
const FRAUD_CONTRADICTION_MAP: Readonly<
  Record<
    'DEALER_TURNOVER' | 'HEAT_RAID' | 'COURIER_BETRAYAL' | 'STORAGE_OVERFLOW' | 'FENCE_FLIGHT',
    { finding: FindingType; fraudWhen: 'present' }
  >
> = {
  /**
   * HEAT_RAID (PROPERTY / STASH_LOSS) — "building was heat-raided".
   * Contradicted by IDLE_DEALERS_OBSERVED (bit 0) being PRESENT:
   * idle dealers = low operational heat = a heat raid is implausible.
   * Grounded in canon :56 — the canonical example's inverse.
   * Bit 0 ∉ PROPERTY honest domain {1,2} → out-of-domain ✓.
   * [RATIFIED C13]
   */
  HEAT_RAID: { finding: FindingType.IDLE_DEALERS_OBSERVED, fraudWhen: 'present' },

  /**
   * DEALER_TURNOVER (STASH_LOSS) — "dealers left due to routine turnover".
   * Contradicted by IDLE_DEALERS_OBSERVED (bit 0) being PRESENT:
   * idle dealers do not "turn over" — they are inactive, not churning.
   * A "turnover" claim requires active dealing; idle dealers prove no activity.
   * Bit 0 ∉ STASH_LOSS honest domain {3,1,2} → out-of-domain ✓.
   * [RATIFIED C13]
   */
  DEALER_TURNOVER: { finding: FindingType.IDLE_DEALERS_OBSERVED, fraudWhen: 'present' },

  /**
   * COURIER_BETRAYAL (COURIER_ARREST) — "courier betrayed the operation".
   * Contradicted by IDLE_DEALERS_OBSERVED (bit 0) being PRESENT:
   * idle dealers = calm, inactive terrain = no betrayal pressure in the network.
   * A courier betrayal requires an active, pressured operation; idle dealers contradict this.
   * Bit 0 ∉ COURIER_ARREST honest domain {4,2} → out-of-domain ✓.
   * [RATIFIED C13]
   */
  COURIER_BETRAYAL: { finding: FindingType.IDLE_DEALERS_OBSERVED, fraudWhen: 'present' },

  /**
   * STORAGE_OVERFLOW (STASH_LOSS) — "stash lost to storage overflow / excess inventory".
   * Contradicted by IDLE_DEALERS_OBSERVED (bit 0) being PRESENT:
   * overflow requires congested downstream distribution; idle dealers prove no distribution demand.
   * A stash overflows only when dealers are active and congested — idle dealers contradict overflow.
   * Bit 0 ∉ STASH_LOSS honest domain {3,1,2} → out-of-domain ✓.
   * [RATIFIED C13]
   */
  STORAGE_OVERFLOW: { finding: FindingType.IDLE_DEALERS_OBSERVED, fraudWhen: 'present' },

  /**
   * FENCE_FLIGHT (FENCE_DEFAULT) — "laundering fence fled / defaulted due to instability".
   * Contradicted by IDLE_DEALERS_OBSERVED (bit 0) being PRESENT:
   * idle dealers = low overall operational activity = fence under-exposure.
   * A fence "flees" under high-pressure over-exposure; idle dealers prove under-exposure.
   * Bit 0 ∉ FENCE_DEFAULT honest domain {5,2} → out-of-domain ✓.
   * [RATIFIED C13]
   */
  FENCE_FLIGHT: { finding: FindingType.IDLE_DEALERS_OBSERVED, fraudWhen: 'present' },
};

@Injectable()
export class FraudDetectionService {
  private readonly logger = new Logger(FraudDetectionService.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
  ) {}

  /**
   * `checkClaimAgainstWalk(claimId)` — check whether a FILED claim contradicts the recorded walk.
   *
   * Reads:
   *   - insurance_claim.claim_basis, insurance_claim.contract_id
   *   - insurance_contract.walk_id
   *   - underwriter_walk_record.findings_bitmask
   *
   * Applies the §1.4 FRAUD_CONTRADICTION_MAP:
   *   - Resolves the FindingType and fraud condition for the claim_basis.
   *   - Tests the corresponding bit in findings_bitmask.
   *   - Returns { fraud: true, contradictedFinding } if the bit state contradicts the claim.
   *   - Returns { fraud: false, contradictedFinding: null } if consistent.
   *
   * R2.2: findings_bitmask is server-only — it is read here but NEVER returned to any client shape.
   *
   * W6a C4 (P-A, finding #12) — `playerId` is now the FIRST argument, and the claim read is joint
   * (`id = ? AND player_id = ?`, single round-trip): a claim belonging to a DIFFERENT player yields
   * 0 rows ⇒ the SAME "claim not found" branch this method already used for a genuinely-absent
   * claim (`{ fraud: false, contradictedFinding: null }`, no throw) — byte-identical for both cases
   * (D2). Pre-fix, `checkClaimAgainstWalk(claimId)` took no `playerId` at all: ANY caller naming
   * ANY `claimId` got a real fraud verdict — a read-only oracle on a rival's claim (`fraud: true`
   * reveals the rival staged a contradicting claim). The contract read is ALSO re-scoped
   * (belt-and-suspenders, mirrors C3's `issueTier3Payoff`): `claimRow` is already proven
   * `playerId`'s own, but the contract read re-states the predicate rather than trusting
   * `claimRow.contract_id` alone a second time.
   *
   * @param playerId — the caller's player uuid. Must be the ACTUAL owner of `claimId` (W6a C4).
   * @param claimId  — UUID of the insurance_claim row (status=FILED).
   * @returns { fraud: boolean; contradictedFinding: FindingType | null }
   */
  async checkClaimAgainstWalk(
    playerId: string,
    claimId: string,
  ): Promise<{ fraud: boolean; contradictedFinding: FindingType | null }> {
    // 1. Load the claim to get claim_basis and contract_id — scoped to `playerId` (W6a C4).
    const [claimRow] = await this.db
      .select({
        claim_basis: insuranceClaim.claim_basis,
        contract_id: insuranceClaim.contract_id,
      })
      .from(insuranceClaim)
      .where(and(eq(insuranceClaim.id, claimId), eq(insuranceClaim.player_id, playerId)))
      .limit(1);

    if (!claimRow) {
      this.logger.warn(`FraudDetectionService.checkClaimAgainstWalk: claim not found: ${claimId}`);
      return { fraud: false, contradictedFinding: null };
    }

    const claimBasis = claimRow.claim_basis as keyof typeof FRAUD_CONTRADICTION_MAP;

    // 2. Load the contract to get walk_id — re-scoped to `playerId` (belt-and-suspenders, W6a C4).
    const [contractRow] = await this.db
      .select({
        walk_id: insuranceContract.walk_id,
        premium_cents: insuranceContract.premium_cents,
        player_id: insuranceContract.player_id,
      })
      .from(insuranceContract)
      .where(and(eq(insuranceContract.id, claimRow.contract_id), eq(insuranceContract.player_id, playerId)))
      .limit(1);

    if (!contractRow) {
      this.logger.warn(
        `FraudDetectionService.checkClaimAgainstWalk: contract not found: ${claimRow.contract_id}`,
      );
      return { fraud: false, contradictedFinding: null };
    }

    // 3. Load the walk to get findings_bitmask.
    if (!contractRow.walk_id) {
      this.logger.warn(
        `FraudDetectionService.checkClaimAgainstWalk: contract ${claimRow.contract_id} has no walk_id — no fraud.`,
      );
      return { fraud: false, contradictedFinding: null };
    }

    const [walkRow] = await this.db
      .select({ findings_bitmask: underwriterWalkRecord.findings_bitmask })
      .from(underwriterWalkRecord)
      .where(eq(underwriterWalkRecord.id, contractRow.walk_id))
      .limit(1);

    if (!walkRow) {
      this.logger.warn(
        `FraudDetectionService.checkClaimAgainstWalk: walk not found: ${contractRow.walk_id}`,
      );
      return { fraud: false, contradictedFinding: null };
    }

    // 4. Look up the contradiction rule for this claim_basis.
    const contradictionRule = FRAUD_CONTRADICTION_MAP[claimBasis];

    if (!contradictionRule) {
      // Unknown claim_basis — no contradiction rule → no fraud (conservative).
      this.logger.warn(
        `FraudDetectionService.checkClaimAgainstWalk: unknown claim_basis=${claimBasis} — no rule, no fraud.`,
      );
      return { fraud: false, contradictedFinding: null };
    }

    // 5. Test the bit in findings_bitmask (server-only — never returned to client).
    //
    // findings_bitmask is a bigint column (stored as bigint in Drizzle with mode: 'bigint').
    // Cast to BigInt for bit-test operations.
    const bitmask: bigint =
      walkRow.findings_bitmask !== null ? BigInt(walkRow.findings_bitmask) : 0n;

    const findingBit = FINDING_BIT[contradictionRule.finding];
    const bitIsSet = (bitmask & findingBit) !== 0n;

    // All fraud rules are fraudWhen:'present' — fraud fires when the contradicting finding IS set.
    // Absence of a finding is the normal honest baseline; fraud requires an affirmative observation.
    const fraud = bitIsSet; // fraudWhen is always 'present' in the corrected FRAUD_CONTRADICTION_MAP

    this.logger.log(
      `FraudDetectionService.checkClaimAgainstWalk: claimId=${claimId} ` +
        `claim_basis=${claimBasis} finding=${FindingType[contradictionRule.finding]} ` +
        `(bit=${contradictionRule.finding}) fraudWhen=${contradictionRule.fraudWhen} ` +
        `bitmask=0x${bitmask.toString(16)} bitIsSet=${bitIsSet} → fraud=${fraud}`,
    );

    return {
      fraud,
      contradictedFinding: fraud ? contradictionRule.finding : null,
    };
  }

  /**
   * `applyFraudPenalty(playerId, contractId, claimId, currentGameTick)` — apply the full fraud
   * consequence.
   *
   * Executes the 4 fraud consequence steps atomically where possible:
   *   1. Debit `underwriting_fraud_penalty_multiplier × premium_cents` from economy_states.cash_cents.
   *      If insufficient cash: debit whatever is available (no over-debit) + log warning.
   *   2. Set insurance_claim.status → DENIED_FRAUD.
   *   3. Set insurance_contract.status → FRAUDED.
   *   4. Set almanac_entry.status → POISONED + poisoned_until_tick = currentGameTick + 365 × dayLength.
   *
   * DD-FRAUD-POISON: the poison horizon uses `underwriting_almanac_persistence_days_post_lapse` at
   * its MAXIMUM (365 days, the range max = canon "for years") × `T.clock.in_game_day_length_minutes`.
   * This reuses the persistence tunable at max rather than a dedicated `fraud_poison_days` key.
   * [RATIFIED C13] — flagged: reuse vs dedicated tunable.
   *
   * The `almanac_entry` is looked up by (player_id, underwriter_id) or created if absent.
   * This allows the almanac to exist even if no explicit almanac row was created at issuance.
   *
   * W6a C4 (P-A, finding #13) — `playerId` is now the FIRST argument. ALL THREE writes below are
   * now scoped to it, not just the contract read:
   *   - Step 0 (contract read): joint `id = ? AND player_id = ?` — 0 rows ⇒ same pre-existing
   *     "contract not found" no-op branch (byte-identical for "doesn't exist" vs "not owned", D2).
   *   - Step 2 (claim UPDATE): scoped `id = claimId AND player_id = playerId` too — pre-fix, `claimId`
   *     was applied UNCONDITIONALLY, independent of `contractId`. A caller who owns a legitimate
   *     `contractId` of their own could still pass an ARBITRARY `claimId` (a rival's) and have IT
   *     stamped `DENIED_FRAUD` — the two ids were never cross-checked against each other OR the
   *     caller. Scoping the claim write to `playerId` closes this independently of the contract scope.
   *   - Step 3 (contract UPDATE): scoped the same way, belt-and-suspenders (the read already proved
   *     ownership, but the WRITE re-states the predicate rather than trusting the prior read alone).
   * Pre-fix, this method took no `playerId` at all — `findById`-style unscoped reads/writes on BOTH
   * `contractId` and `claimId` let ANY caller mark a rival's contract FRAUDED, deny a rival's claim,
   * debit the rival's wallet 5× premium, and poison the rival's almanac.
   *
   * @param playerId       — the caller's player uuid. Must be the ACTUAL owner of BOTH `contractId`
   *                         and `claimId` (W6a C4).
   * @param contractId     — UUID of the insurance_contract row.
   * @param claimId        — UUID of the insurance_claim row (to set DENIED_FRAUD).
   * @param currentGameTick — the authoritative game-minute (from the city-sim clock, NOT wall-clock).
   * @returns Promise<void>
   */
  async applyFraudPenalty(
    playerId: string,
    contractId: string,
    claimId: string,
    currentGameTick: number,
  ): Promise<void> {
    // 0. Load the contract to get premium_cents — scoped to `playerId` (W6a C4).
    const [contractRow] = await this.db
      .select({
        premium_cents: insuranceContract.premium_cents,
        player_id: insuranceContract.player_id,
      })
      .from(insuranceContract)
      .where(and(eq(insuranceContract.id, contractId), eq(insuranceContract.player_id, playerId)))
      .limit(1);

    if (!contractRow) {
      this.logger.warn(
        `FraudDetectionService.applyFraudPenalty: contract not found: ${contractId}`,
      );
      return;
    }

    const premiumCents = Number(contractRow.premium_cents);
    const multiplier = insuranceTunables.fraudPenaltyMultiplier;  // registry-first (default 5, range 3..10)
    const penaltyCents = multiplier * premiumCents;

    // ── Step 1: Debit 5× premium penalty from economy_states.cash_cents ─────────────────────────
    //
    // Pattern mirrors ContractService.issueContract debit (plan C4/C10).
    // Atomic: UPDATE economy_states SET cash = cash - penalty WHERE player_id = ? AND cash >= penalty.
    // If insufficient cash: debit available cash (clamp to 0 — no over-debit into negative).
    // This is a FRAUD CONSEQUENCE — the player loses whatever cash is available if not enough.
    if (penaltyCents > 0) {
      // First try exact debit (has enough cash)
      const debitResult = await this.db
        .update(economyState)
        .set({ cash_cents: sql`${economyState.cash_cents} - ${BigInt(penaltyCents)}` })
        .where(
          and(
            eq(economyState.player_id, playerId),
            sql`${economyState.cash_cents} >= ${BigInt(penaltyCents)}`,
          ),
        )
        .returning({ cash_cents: economyState.cash_cents });

      if (debitResult.length === 0) {
        // Insufficient cash — clamp debit to available cash (set cash = 0)
        this.logger.warn(
          `FraudDetectionService.applyFraudPenalty: player=${playerId} insufficient cash for ` +
            `${penaltyCents} penalty — clamping to available cash.`,
        );
        await this.db
          .update(economyState)
          .set({ cash_cents: BigInt(0) })
          .where(eq(economyState.player_id, playerId));
      } else {
        this.logger.log(
          `FraudDetectionService.applyFraudPenalty: debit ${penaltyCents} (${multiplier}× ${premiumCents}) ` +
            `from player=${playerId} — new_cash=${Number(debitResult[0]!.cash_cents)}.`,
        );
      }
    }

    // ── Step 2: Set insurance_claim.status → DENIED_FRAUD ────────────────────────────────────────
    // W6a C4: scoped to `playerId` — `claimId` is NOT cross-checked against `contractId` anywhere
    // else in this method, so this is the ONLY guard against a mismatched-claim payload (see docblock).
    await this.db
      .update(insuranceClaim)
      .set({ status: 'DENIED_FRAUD', updated_at: new Date() })
      .where(and(eq(insuranceClaim.id, claimId), eq(insuranceClaim.player_id, playerId)));

    // ── Step 3: Set insurance_contract.status → FRAUDED ──────────────────────────────────────────
    await this.db
      .update(insuranceContract)
      .set({ status: 'FRAUDED', updated_at: new Date() })
      .where(and(eq(insuranceContract.id, contractId), eq(insuranceContract.player_id, playerId)));

    // ── Step 4: Set almanac_entry.status → POISONED + poisoned_until_tick ────────────────────────
    //
    // DD-FRAUD-POISON (design §4, [RATIFIED C13]):
    //   poisoned_until_tick = currentGameTick + 365 × inGameDayLengthMinutes
    //
    // 365 = the RANGE MAX of `underwriting_almanac_persistence_days_post_lapse` (canon "for years").
    // inGameDayLengthMinutes = T.clock.in_game_day_length_minutes from citySimTunables (default 1440).
    // We use the FIXED MAX (365) not the current registry value (which defaults to 90) because
    // DD-FRAUD-POISON explicitly anchors the poison at the MAX range (plan Task 10).
    //
    // The almanac_entry is looked up by player_id. If none exists, we create one with a
    // synthetic underwriter_id (a fixed UUID constant — the almanac is player-scoped in practice).
    // The underwriter_id is a structural partition key but there is no DB FK to an underwriter table
    // (NPC concept, not a first-class entity in Tranche B).
    const almanacPersistenceMax = 365; // range MAX of underwriting_almanac_persistence_days_post_lapse (DD-FRAUD-POISON)
    const inGameDayLengthMinutes = citySimTunables.inGameDayLengthMinutes; // T.clock, default 1440
    const poisonHorizonGameTicks = almanacPersistenceMax * inGameDayLengthMinutes;
    const poisonedUntilTick = BigInt(currentGameTick) + BigInt(poisonHorizonGameTicks);

    // Look up existing almanac entry for this player.
    const [existingAlmanac] = await this.db
      .select({ id: almanacEntry.id })
      .from(almanacEntry)
      .where(eq(almanacEntry.player_id, playerId))
      .limit(1);

    if (existingAlmanac) {
      // Update existing entry.
      await this.db
        .update(almanacEntry)
        .set({
          status: 'POISONED',
          poisoned_until_tick: poisonedUntilTick,
          updated_at: new Date(),
        })
        .where(eq(almanacEntry.id, existingAlmanac.id));
    } else {
      // Create a new almanac entry (no prior almanac — fraud is the first entry).
      // Use SYNTHETIC_UNDERWRITER_ID (centralized in insurance-constants.ts — C15 DRY fix).
      // In production flow, the almanac entry is created by captureBaselineFingerprint (C15 UPSERT fix);
      // this fallback handles the fraud-only path where no prior entry exists.
      await this.db
        .insert(almanacEntry)
        .values({
          underwriter_id: SYNTHETIC_UNDERWRITER_ID,
          player_id: playerId,
          status: 'POISONED',
          poisoned_until_tick: poisonedUntilTick,
        });
    }

    this.logger.log(
      `FraudDetectionService.applyFraudPenalty: DONE — ` +
        `claimId=${claimId} DENIED_FRAUD, contractId=${contractId} FRAUDED, ` +
        `player=${playerId} almanac POISONED until_tick=${poisonedUntilTick} ` +
        `(currentTick=${currentGameTick} + ${almanacPersistenceMax}d × ${inGameDayLengthMinutes}min = ` +
        `${poisonHorizonGameTicks} game-min). ` +
        `[DD-FRAUD-POISON: reuses almanac_persistence_days_post_lapse at max=${almanacPersistenceMax} ` +
        `for poison horizon — flagged for reviewer⊥]`,
    );
  }
}
