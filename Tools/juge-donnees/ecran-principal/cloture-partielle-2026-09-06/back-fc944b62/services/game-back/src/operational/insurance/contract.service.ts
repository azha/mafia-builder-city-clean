// IMPLEMENTS: docs/tech/04c_market_reputation_insurance/insurance_mechanics.md §4.1 (:146)
//             docs/superpowers/plans/2026-06-17-depth-insurance-underwriting-walk-plan.md Task 4 (C4)
//             docs/superpowers/plans/2026-06-17-depth-insurance-underwriting-walk-plan.md Task 5 (C5)
//             docs/superpowers/plans/2026-06-18-depth-insurance-coverage-drift-plan.md Task 3 (C3)
//             — Insurance C4 — 2026-06-17 (base)
//             — Insurance C5 — 2026-06-17 (DD-WARY, closes TD-119; one-walk-one-contract guard)
//             — Insurance Drift C3 — 2026-06-18 (captureBaselineFingerprint additive hook; expires_at_tick set)
//
// `ContractService` — issues an insurance contract from a COMPLETE walk.
//
// ── Contract lifecycle (canon :146; no PENDING enum in the schema) ───────────────────────────────
//
// The canon `InsuranceContract` shape (:146) has status ACTIVE|LAPSED|FRAUDED (no PENDING).
// The issuance flow reconciles this with the C3 `computePremium` separation:
//
//   Walk observed BEFORE terms offered (canonical order per §4.1 :46-54):
//   1. Walk runs `duration` days → recordFindings → COMPLETE.
//   2. Player requests quote: the underwriter uses the COMPLETE walk's findings + the declared
//      `insured_value_cents` to price the premium (this step = `issueContract`).
//   3. Player pays the premium: the contract becomes ACTIVE.
//
// Implementation (no PENDING state — ACTIVE at issuance by design):
//   1. Guard: walk must be COMPLETE (409 if still WALKING).
//   2. Guard: one-walk-one-ACTIVE-contract invariant (C5, carry-forward from C4 reviewer⊥):
//      reject if an ACTIVE contract already exists for this walk_id (409).
//   3. Compute the premium directly from the walk's `findings_bitmask` + the caller-provided
//      `insuredValueCents`, using the canonical formula: `base × Π(1 + c_i × finding_i)`.
//   4. DD-WARY (C5 — closes TD-119): if `counterpartyId` is non-null, query
//      `restraint_dispute_ring.wary_active + collateral_amount` for that counterparty.
//      If `wary_active = true`:
//        (a) `escrowRequiredCents = collateral_amount` (the escrow the player must post).
//        (b) `premiumCents = Math.round(premiumCents × wary_premium_surcharge_multiplier)` (surcharge).
//      If `wary_active = false` OR no ring row OR `counterpartyId = null`: neutral (no escrow, no surcharge).
//   5. Insert the `insurance_contract` row with status=ACTIVE, the computed premium_cents,
//      insured_value_cents, walk_id, counterparty_id, and issued_tick.
//   6. Debit `economy_states.cash_cents` by `premiumCents` ATOMICALLY (DD-P5 — clear transaction).
//      Guard: insufficient cash → mark contract LAPSED + raise 402.
//
// Note on NOT calling computePremium: `computePremium` (C3) has an idempotent COMPLETE path that
// reads `premium_cents` from the first contract for this walk. Since `issueContract` creates a NEW
// contract with possibly different `insured_value_cents`, calling `computePremium` would return the
// wrong premium (from the old contract). Instead, `issueContract` applies the formula directly.
// Both paths use the same formula — the result is identical for the same inputs.
//
// DD-WARY decision (flagged for reviewer⊥): BOTH escrow + surcharge (not escrow-only).
// Rationale: the escrow protects the insurer's capital lock (collateral risk); the surcharge
// reflects the higher actuarial risk of dealing with a wary counterparty. The design §4 says
// `[needs reviewer⊥]` on "both vs escrow-only" — we implement BOTH per plan Task 5 §C5.
// The reviewer⊥ will ratify.
//
// R2.2: `premiumCents` and `escrowRequiredCents` are CLEAR transaction values (DD-P5). Safe to return.
//   `findings_bitmask`, `observation_depth`, `route_id`, `collateral_amount` (raw) are NEVER returned.
// Anti-fabrication: no `Math.random`. All coefficients from `insuranceTunables` (registry).
// Zero-regression: this service is purely additive — no existing service or table is mutated.

import { Injectable, Logger, Inject } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { ApiError } from '../../protocol/api-error';
import { insuranceContract, underwriterWalkRecord } from '../../db/schema/insurance';
import { restraintDisputeRing } from '../../db/schema/reputation_state';
import { economyState } from '../../db/schema/player_economy_state';
import { citySimClock } from '../../db/schema/city_sim_clock';
import { insuranceTunables } from './insurance-tunables';
import { CoverageInducedDriftService } from './coverage-induced-drift.service';

@Injectable()
export class ContractService {
  private readonly logger = new Logger(ContractService.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly drift: CoverageInducedDriftService,
  ) {}

  /**
   * `issueContract(playerId, walkId, insuredValueCents, counterpartyId)` — issues an insurance contract.
   *
   * Canon :146: `InsuranceContract` — status ACTIVE at issuance; coverage live; claims can be filed.
   *
   * The walk must be COMPLETE (DD-WALK: the underwriter observes BEFORE offering terms — canon :46-54).
   * Computes the premium from the walk's `findings_bitmask` + the caller-provided `insuredValueCents`.
   * Applies DD-WARY (C5) if `counterpartyId` is non-null and `wary_active = true` in `restraint_dispute_ring`.
   * Creates an ACTIVE contract and debits the premium from the player's wallet (DD-P5).
   *
   * Premium formula (canon :50-54):
   *   base = (basePremiumPct / 100) × insuredValueCents
   *   premiumCents = Math.round(base × Π_i (1 + c_i × finding_i))
   *   finding_i = 1 if bit i set in findings_bitmask, 0 otherwise.
   *
   * DD-WARY (C5, closes TD-119):
   *   If counterpartyId non-null AND wary_active=true in restraint_dispute_ring:
   *     escrowRequiredCents = collateral_amount (the escrow the player must post)
   *     premiumCents = Math.round(premiumCents × wary_premium_surcharge_multiplier) (surcharge)
   *   Else (wary_active=false / no ring row / null counterpartyId):
   *     escrowRequiredCents = 0, no surcharge (neutral — zero-regression vs C4).
   *
   * One-walk-one-ACTIVE-contract (C5 carry-forward from C4 reviewer⊥):
   *   Rejects with 409 if an ACTIVE contract already exists for this walk_id.
   *   The DB-level partial unique index (migration 0063) enforces this at DB level too.
   *
   * @param playerId — the player's UUID (FK → player).
   * @param walkId — the UUID of the COMPLETE underwriter_walk_record.
   * @param insuredValueCents — the declared insured value in cents (player-provided at quote time).
   *   W6a C5 (DD-MAGNITUDE-BOUND, design §3/C5): clamped to
   *   `[insuranceTunables.insuredValueCentsFloor, insuranceTunables.insuredValueCentsCeiling]` BEFORE
   *   any premium/escrow computation or persistence — the value used downstream (and stored on the
   *   contract row) is the BOUNDED value, never the raw caller-supplied one.
   * @param counterpartyId — nullable UUID of the underwriting NPC counterparty (read for DD-WARY C5).
   * @returns `{ contractId, premiumCents, escrowRequiredCents }`.
   * @throws 409 if the walk is not COMPLETE (still WALKING).
   * @throws 409 if an ACTIVE contract already exists for this walk (one-walk-one-contract invariant).
   * @throws 404 if the walk does not exist.
   * @throws 402 if the player has insufficient cash to pay the premium.
   */
  async issueContract(
    playerId: string,
    walkId: string,
    insuredValueCents: number,
    counterpartyId: string | null,
  ): Promise<{ contractId: string; premiumCents: number; escrowRequiredCents: number }> {
    // ── Step 0 (W6a C5, DD-MAGNITUDE-BOUND, design §3/C5): clamp insuredValueCents ───────────────
    //
    // Pre-fix, `insuredValueCents` was a caller-supplied magnitude with NO bound: a negative, zero,
    // `Number.MAX_SAFE_INTEGER`, or non-integer value flowed UNCHANGED into the premium formula (Step
    // 3) and the persisted `insurance_contract.insured_value_cents` column (Step 6). This is a
    // validation defect (D5), not the ownership defect the rest of W6a closes — the fix is a clamp,
    // not a 404: a bounded, successful contract is the correct response to an out-of-range value, so
    // that premium/escrow stay computable and proportional (design §3/C5 "conservation économique").
    // Non-finite (NaN/±Infinity) degrades to the floor rather than propagating — never persisted.
    // Clamp idiom REUSED from `lek-memory.service.ts:264` (`Math.min(MAX, Math.max(MIN, Math.round(x)))`).
    // R2.3: bounds source `insuranceTunables.insuredValueCentsFloor`/`insuredValueCentsCeiling` (the
    // registry) — NEVER an inline scalar.
    const insuredValueFloor = insuranceTunables.insuredValueCentsFloor;
    const insuredValueCeiling = insuranceTunables.insuredValueCentsCeiling;
    const rawInsuredValueCents = Number.isFinite(insuredValueCents) ? insuredValueCents : insuredValueFloor;
    insuredValueCents = Math.min(insuredValueCeiling, Math.max(insuredValueFloor, Math.round(rawInsuredValueCents)));

    // ── Step 1: Guard — walk must be COMPLETE ────────────────────────────────────────────────────
    //
    // W6a C4 (P-A, finding #10) — joint read, single round-trip: `id = ? AND player_id = ?`. A walk
    // belonging to a DIFFERENT player yields 0 rows ⇒ 404, indistinguishable from "walk doesn't
    // exist" (D2). Pre-fix, this read was `WHERE id = walkId` alone — `issueContract` already takes
    // `playerId` as its first argument (used throughout the rest of this method), but this ONE read
    // never recouped it against the walk it was about to price and issue a contract against — the
    // exact diagnostic the design names: a method that already has the right `playerId` in scope,
    // guarded at the wrong site. Illustration: design §3/C4.
    const [walkRow] = await this.db
      .select({
        id: underwriterWalkRecord.id,
        status: underwriterWalkRecord.status,
        findings_bitmask: underwriterWalkRecord.findings_bitmask,
        coverage_type: underwriterWalkRecord.coverage_type,
      })
      .from(underwriterWalkRecord)
      .where(and(eq(underwriterWalkRecord.id, walkId), eq(underwriterWalkRecord.player_id, playerId)))
      .limit(1);

    // IMP-2 (W6.2 C4, design §3 C4) — house convention: `ApiError`, never a raw `HttpException`. A raw
    // `HttpException` bypasses the GlobalExceptionFilter's i18n-controlled envelope and sends its literal
    // `message` (here carrying the walk id + its exact status) straight to the client — the SAME class of
    // leak the `resolvePlayerId`/`getOwnedLieutenant` 404 convention exists to avoid ("existence is
    // intelligence", `engagements.controller.ts` D7). `ApiError`'s `message` is dev-facing only (R-EH-4) —
    // the player sees the code's registered i18n key, never this string. No IDOR here (reviewer-verified,
    // design §3 C4) — this is a FORM fix, not an ownership fix (the `player_id` join at the read above,
    // `:157`, already scopes correctly).
    if (!walkRow) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `Walk ${walkId} not found for this player.` });
    }
    if (walkRow.status !== 'COMPLETE') {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `Walk ${walkId} is not COMPLETE (status=${walkRow.status}) — the walk must complete before issuing a contract.`,
      });
    }

    // ── Step 2: Guard — one-walk-one-ACTIVE-contract invariant (C5 carry-forward) ────────────────
    //
    // Reject if an ACTIVE contract already exists for this walk. The DB-level partial unique index
    // (migration 0063) enforces this at DB level; this service-level guard provides a clear 409 error
    // before the INSERT (and makes the invariant explicit in code, not just in DDL).
    const [existingActiveContract] = await this.db
      .select({ id: insuranceContract.id })
      .from(insuranceContract)
      .where(
        and(
          eq(insuranceContract.walk_id, walkId),
          eq(insuranceContract.status, 'ACTIVE'),
        ),
      )
      .limit(1);

    if (existingActiveContract) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `An ACTIVE contract already exists for walk ${walkId} (contractId=${existingActiveContract.id}) — one-walk-one-ACTIVE-contract invariant.`,
      });
    }

    // ── Step 3: Compute the base premium from the walk's findings_bitmask ───────────────────────
    //
    // Applied fresh for THIS contract's insuredValueCents (not via computePremium's idempotent path
    // which reads from a pre-existing contract). See file-header comment for rationale.
    //
    // Formula (canon :50-54):
    //   base = (basePremiumPct / 100) × insuredValueCents
    //   premiumCents = Math.round(base × Π_i (1 + c_i × finding_i))
    const basePremiumPct = insuranceTunables.basePremiumPctOfInsuredValue;
    const base = (basePremiumPct / 100) * insuredValueCents;
    const bitmask = walkRow.findings_bitmask ?? 0n;
    const NUM_FINDINGS = 6;
    let product = 1.0;
    for (let i = 0; i < NUM_FINDINGS; i++) {
      const bitSet = (bitmask & (1n << BigInt(i))) !== 0n;
      if (bitSet) {
        const ci = insuranceTunables.getCiForFinding(i);
        product *= (1 + ci);
      }
    }
    const basePremiumCents = Math.round(base * product);

    // ── Step 4: DD-WARY (C5 — closes TD-119) ─────────────────────────────────────────────────────
    //
    // Read D2's emit-only contract: restraint_dispute_ring.wary_active + collateral_amount.
    // Consumer: this is the Insurance module's consumption of the D2 "restraint_dispute_ring" emit
    // (D2 emits wary_active + collateral_amount; Insurance reads them here — closing TD-119).
    //
    // If wary_active = true for the counterparty:
    //   (a) escrowRequiredCents = collateral_amount (lock the collateral → clear to player, DD-P5).
    //   (b) premiumCents = Math.round(basePremiumCents × wary_premium_surcharge_multiplier).
    // If wary_active = false OR no ring row OR counterpartyId = null:
    //   neutral: escrowRequiredCents = 0, premiumCents = basePremiumCents (no surcharge).
    //
    // DD-WARY decision: BOTH escrow + surcharge (not escrow-only). Flagged for reviewer⊥.
    // R2.2: collateral_amount raw is NEVER returned to the client — only escrowRequiredCents (clear cash).
    // wary_premium_surcharge_multiplier is from the registry (insuranceTunables) — no inline scalar.
    let premiumCents = basePremiumCents;
    let escrowRequiredCents = 0;

    if (counterpartyId !== null) {
      const [ringRow] = await this.db
        .select({
          wary_active: restraintDisputeRing.wary_active,
          collateral_amount: restraintDisputeRing.collateral_amount,
        })
        .from(restraintDisputeRing)
        .where(
          and(
            eq(restraintDisputeRing.player_id, playerId),
            eq(restraintDisputeRing.counterparty_id, counterpartyId),
          ),
        )
        .limit(1);

      if (ringRow?.wary_active === true) {
        // DD-WARY: apply BOTH escrow + surcharge.
        const collateralAmount = ringRow.collateral_amount ?? 0;
        escrowRequiredCents = Math.round(collateralAmount); // round cents (collateral_amount is a real)
        const surchargeMultiplier = insuranceTunables.waryPremiumSurchargeMultiplier;
        premiumCents = Math.round(basePremiumCents * surchargeMultiplier);
        this.logger.log(
          `issueContract: DD-WARY active — counterparty=${counterpartyId} collateral=${collateralAmount} ` +
            `escrow=${escrowRequiredCents} surcharge=${surchargeMultiplier} ` +
            `basePremium=${basePremiumCents} surcharged=${premiumCents}`,
        );
      }
      // else: wary_active = false OR no ring row → neutral (escrow=0, no surcharge)
    }

    // ── Step 5: Get the current game-tick for issued_tick ────────────────────────────────────────
    const [clockRow] = await this.db
      .select({ game_minute: citySimClock.game_minute })
      .from(citySimClock)
      .where(eq(citySimClock.player_id, playerId))
      .limit(1);
    const issuedTick = clockRow?.game_minute ?? 0;

    // ── Step 6: Insert the ACTIVE contract row ───────────────────────────────────────────────────
    //
    // status = ACTIVE (no PENDING — becomes active at issuance; claims are live once issued).
    // premium_cents = computed premium (surcharged if DD-WARY fired, base otherwise — DD-P5).
    // walk_id = soft ref (no DB FK — design §3.1: inter-insurance refs are soft-refs).
    // The DB-level partial unique index (migration 0063) will reject a duplicate ACTIVE insert
    // for the same walk_id (defense-in-depth; service guard at Step 2 fires first).
    const [contractRow] = await this.db
      .insert(insuranceContract)
      .values({
        player_id: playerId,
        type: walkRow.coverage_type,
        insured_value_cents: BigInt(insuredValueCents),
        premium_cents: BigInt(premiumCents),
        // escrow_required_cents: persisted by migration 0066. Surfaces the OBLIGATION only.
        // TD-ESCROW-CAPITAL-LOCK: the full capital lock (deducting from spendable balance +
        // refunding on contract close) is deferred to a wary-depth follow-up. C13 routes the TD.
        escrow_required_cents: BigInt(escrowRequiredCents),
        walk_id: walkId,
        counterparty_id: counterpartyId ?? undefined,
        status: 'ACTIVE',
        issued_tick: BigInt(issuedTick),
      })
      .returning({ id: insuranceContract.id });
    const contractId = contractRow!.id;

    // ── Step 7: Debit the premium from economy_states.cash_cents (DD-P5) ───────────────────────
    //
    // Pattern mirrors PrecursorsRepository.debitAndCreateOrder:
    //   UPDATE economy_states SET cash_cents = cash_cents - premium WHERE player_id = ? AND cash_cents >= premium
    // If 0 rows updated → insufficient balance → mark contract LAPSED + raise 402.
    //
    // If premiumCents == 0 (no findings and/or insured_value=0): skip the debit (nothing to charge).
    if (premiumCents > 0) {
      const debitResult = await this.db
        .update(economyState)
        .set({ cash_cents: sql`${economyState.cash_cents} - ${BigInt(premiumCents)}` })
        .where(
          and(
            eq(economyState.player_id, playerId),
            sql`${economyState.cash_cents} >= ${BigInt(premiumCents)}`,
          ),
        )
        .returning({ cash_cents: economyState.cash_cents });

      if (debitResult.length === 0) {
        // Insufficient cash: mark the contract LAPSED (payment failure — not fraud).
        await this.db
          .update(insuranceContract)
          .set({ status: 'LAPSED', updated_at: new Date() })
          .where(eq(insuranceContract.id, contractId));
        // M-2 (W6.2, revue ⊥) — house convention: `ApiError`, never un `HttpException` brut. Ce site
        // est désormais atteignable depuis la route joueur C4 (`POST /v1/me/insurance/contracts`) —
        // le raw HttpException aurait bypassé le GlobalExceptionFilter et envoyé son message littéral
        // (jamais i18n) directement au client. `PAYMENT_REQUIRED` est le code déjà enregistré pour
        // exactement ce cas (`error-codes.ts:97`, dont le commentaire cite CE site comme précédent).
        throw new ApiError('PAYMENT_REQUIRED', {
          message: `Insufficient cash to pay premium of ${premiumCents} cents`,
        });
      }
    }

    this.logger.log(
      `issueContract: player=${playerId} walk=${walkId} contract=${contractId} ` +
        `insuredValue=${insuredValueCents} bitmask=0x${bitmask.toString(16)} ` +
        `base=${base.toFixed(2)} product=${product.toFixed(4)} ` +
        `basePremium=${basePremiumCents} premium=${premiumCents} escrow=${escrowRequiredCents}`,
    );

    // ── Drift C3 hook: captureBaselineFingerprint (ADDITIVE) ────────────────────────────────────
    //
    // Called AFTER the contract is ACTIVE + the premium debited.
    // Creates the `coverage_induced_drift_state` row (hazard_shift=0, baseline fingerprint captured).
    // Also writes the baseline into `almanac_entry.baseline_fingerprint_*` (DD-BASELINE-PERSIST).
    // Also sets `insurance_contract.expires_at_tick` (DD-RENEWAL term).
    //
    // Zero-regression invariant: the return value `{ contractId, premiumCents, escrowRequiredCents }`
    // is UNCHANGED — the hook is a pure side-effect (additive, no return-type change).
    // Anti-fabrication: captureBaselineFingerprint is deterministic (no Math.random).
    await this.drift.captureBaselineFingerprint(contractId);

    return {
      contractId,
      premiumCents,
      escrowRequiredCents,
    };
  }
}
