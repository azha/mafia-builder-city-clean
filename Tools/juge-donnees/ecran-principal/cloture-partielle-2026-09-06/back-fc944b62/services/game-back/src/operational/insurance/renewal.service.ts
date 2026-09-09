// IMPLEMENTS: docs/tech/04c_market_reputation_insurance/insurance_mechanics.md §4.2 (:106-110)
//             docs/superpowers/plans/2026-06-18-depth-insurance-coverage-drift-plan.md Task 11 (C11)
//             docs/superpowers/plans/2026-06-18-depth-insurance-coverage-drift-plan.md Task 12 (C12)
//             — Insurance Drift C11 — 2026-06-18
//             — Insurance Drift C12 — 2026-06-18 (C11 scope fix: (underwriter, player)-scoped lapse stamp)
//
// `RenewalService` — the WEEKLY renewal lifecycle for Coverage-Induced Drift (§4.2 Tranche C).
//
// Registered by InsuranceModule in the INSURANCE_DRIFT_TICK combined WEEKLY/8 system (§2.6),
// AFTER CoverageInducedDriftService.runWeeklyTick (recompute) and BEFORE applyWeeklyDecay (decay).
//
// §2.6 strict intra-tick order (one combined system):
//   (1) drift.runWeeklyTick    → recomputes true_loss_prob; stamps last_drift_tick; NO decay yet.
//   (2) renewal.runWeeklyRenewalCheck → reads hazard_shift PRE-decay; re-quotes; pay-or-lapse.
//   (3) drift.applyWeeklyDecay → hazard_shift ← max(0, hazard_shift − decay); LAST.
//
// Escalation formula (same α + form as true_loss_prob — no duplicate coefficient):
//   escalatedPremium = round(basePremium · (1 + α · hazard_shift))
//   basePremium = round(insured_value_cents × basePremiumPct / 100)
//   α = insurance.coverage_drift_alpha_hazard_sensitivity_per_shift_point (0.05, canon :119)
//   basePremiumPct = insurance.underwriting_base_premium_pct_of_insured_value_per_cycle (4, canon :77)
//
// Pay-or-lapse:
//   - Paid → contract stays ACTIVE; expires_at_tick ← currentTick + term_length_ticks; premium_cents updated.
//   - Insufficient → status → LAPSED (REUSE — no new enum); baseline_persisted_until_tick stamped (C12 anchor).
//
// C12 scope fix (DD-BASELINE-PERSIST carry-forward):
//   The lapse stamp MUST be scoped to the (underwriter, player) almanac row, NOT player-wide.
//   The underwriter for the stamped row = contract.counterparty_id (the NPC who issued the contract).
//   This prevents: lapse on underwriter A from stamping/inheriting underwriter B's almanac row.
//   Derivation: almanac_entry.underwriter_id = insurance_contract.counterparty_id
//     (both refer to the same NPC underwriter; the almanac_entry is per-underwriter × per-player).
//   If counterparty_id is null (standard market terms, no specific underwriter) → stamp all player rows.
//     Rationale: a null-counterparty contract has no specific underwriter → no (underwriter, player) scope
//     possible; the fallback is player-wide (correct for the no-counterparty case). Flagged for reviewer⊥.
//
// Game-time: currentTick = ctx.gameMinute (game-minutes as tick unit). NEVER wall-clock time.
// No RNG. No inline scalars — all from insuranceTunables.
// Organic no-op: no ACTIVE contract with expires_at_tick ≤ currentTick → returns immediately.
// Idempotent per weekId: after renewal the expires_at_tick advances, so the same contract is not re-quoted.

import { Injectable, Logger, Inject } from '@nestjs/common';
import { eq, and, sql, isNotNull, lte } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { insuranceContract, almanacEntry, coverageInducedDriftState } from '../../db/schema/insurance';
import { economyState } from '../../db/schema/player_economy_state';
import { insuranceTunables } from './insurance-tunables';
import { SYNTHETIC_UNDERWRITER_ID } from './insurance-constants';
import type { CitySimTickContext } from '../../citysim/scheduler/city_sim_system';

// Game-time constants — mirror coverage-induced-drift.service.ts
const MINUTES_PER_DAY = 24 * 60; // 1440 game-minutes per in-game day

@Injectable()
export class RenewalService {
  private readonly logger = new Logger(RenewalService.name);

  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * `runWeeklyRenewalCheck(ctx, weekId)` — C11 WEEKLY renewal pass.
   *
   * For each ACTIVE insurance_contract with expires_at_tick NOT NULL AND expires_at_tick ≤ currentTick:
   *   1. Load the asset's coverage_induced_drift_state (if any) — reads hazard_shift PRE-decay (§2.6).
   *   2. Re-quote: escalatedPremium = round(basePremium · (1 + α · hazard_shift)).
   *   3. Attempt atomic debit from economy_states.cash_cents.
   *   4a. Paid → update contract: expires_at_tick ← currentTick + term_length_ticks, premium_cents = escalatedPremium, status ACTIVE.
   *   4b. Insufficient → set status LAPSED; stamp almanac_entry.baseline_persisted_until_tick (C12 anti-exploit anchor).
   *
   * @param ctx — CitySimTickContext (ctx.playerId identifies the player; ctx.gameMinute = currentTick).
   * @param weekId — current in-game week number (for logging/idempotence context).
   */
  async runWeeklyRenewalCheck(ctx: CitySimTickContext, weekId: number): Promise<void> {
    const currentTick = BigInt(ctx.gameMinute);

    // ── Load all ACTIVE contracts with expired term for this player ──────────────────────────
    const expiredContracts = await this.db
      .select({
        id: insuranceContract.id,
        player_id: insuranceContract.player_id,
        asset_ref: insuranceContract.asset_ref,
        insured_value_cents: insuranceContract.insured_value_cents,
        expires_at_tick: insuranceContract.expires_at_tick,
        status: insuranceContract.status,
        // C12: needed to scope the almanac lapse stamp to the correct (underwriter, player) row.
        // counterparty_id = the NPC underwriter for this contract; maps to almanac_entry.underwriter_id.
        counterparty_id: insuranceContract.counterparty_id,
      })
      .from(insuranceContract)
      .where(
        and(
          eq(insuranceContract.player_id, ctx.playerId),
          eq(insuranceContract.status, 'ACTIVE'),
          isNotNull(insuranceContract.expires_at_tick),
          lte(insuranceContract.expires_at_tick, currentTick),
        ),
      );

    if (expiredContracts.length === 0) {
      // Organic no-op: no renewal-due contracts for this player.
      return;
    }

    // ── Read tunables ONCE (same values for all renewals in this tick) ────────────────────────
    const alpha = insuranceTunables.coverageDriftAlpha;
    const basePremiumPct = insuranceTunables.basePremiumPctOfInsuredValue;
    const termDays = insuranceTunables.coverageDriftContractTermDays;
    const termLengthTicks = BigInt(termDays * MINUTES_PER_DAY); // game-time (ticks = game-minutes)
    const persistenceDays = insuranceTunables.almanacPersistenceDaysPostLapse;

    for (const contract of expiredContracts) {
      // ── Load hazard_shift from drift_state (PRE-decay — §2.6) ───────────────────────────────
      // The hazard_shift read here is the FULL week's drift (before applyWeeklyDecay runs).
      // If no drift_state covers this contract → hazard_shift = 0 (base premium, no escalation).
      let hazardShift = 0;
      if (contract.asset_ref) {
        const driftRows = await this.db
          .select({ hazard_shift: coverageInducedDriftState.hazard_shift })
          .from(coverageInducedDriftState)
          .where(
            and(
              eq(coverageInducedDriftState.player_id, ctx.playerId),
              eq(coverageInducedDriftState.asset_ref, contract.asset_ref),
            ),
          )
          .limit(1);
        if (driftRows[0]) {
          hazardShift = driftRows[0].hazard_shift;
        }
      } else {
        // No asset_ref on contract → look up any drift_state for this player
        const driftRows = await this.db
          .select({ hazard_shift: coverageInducedDriftState.hazard_shift })
          .from(coverageInducedDriftState)
          .where(eq(coverageInducedDriftState.player_id, ctx.playerId))
          .limit(1);
        if (driftRows[0]) {
          hazardShift = driftRows[0].hazard_shift;
        }
      }

      // ── Re-quote: escalated premium = round(basePremium × (1 + α × hazard_shift)) ──────────
      // basePremium = round(insured_value_cents × basePremiumPct / 100)
      // Same α + form as true_loss_prob (canon :102,106 — no duplicate coefficient).
      const insuredValueCents = Number(contract.insured_value_cents);
      const basePremiumCents = Math.round(insuredValueCents * basePremiumPct / 100);
      const escalatedPremiumCents = Math.round(basePremiumCents * (1 + alpha * hazardShift));

      this.logger.log(
        `runWeeklyRenewalCheck: player=${ctx.playerId} contract=${contract.id} weekId=${weekId} ` +
          `hazard_shift=${hazardShift} basePremium=${basePremiumCents} escalatedPremium=${escalatedPremiumCents} ` +
          `(α=${alpha} form=(1+α·hazard)=(${1 + alpha * hazardShift}))`,
      );

      // ── Attempt atomic debit (mirror contract.service.ts pattern, DD-P5) ─────────────────────
      let paid = false;
      if (escalatedPremiumCents > 0) {
        const debitResult = await this.db
          .update(economyState)
          .set({ cash_cents: sql`${economyState.cash_cents} - ${BigInt(escalatedPremiumCents)}` })
          .where(
            and(
              eq(economyState.player_id, ctx.playerId),
              sql`${economyState.cash_cents} >= ${BigInt(escalatedPremiumCents)}`,
            ),
          )
          .returning({ cash_cents: economyState.cash_cents });
        paid = debitResult.length > 0;
      } else {
        // Zero-premium renewal (no hazard, no base): treat as paid (nothing to charge).
        paid = true;
      }

      if (paid) {
        // ── Renew: advance expires_at_tick, update premium_cents, status stays ACTIVE ─────────
        const newExpiresAtTick = currentTick + termLengthTicks;
        await this.db
          .update(insuranceContract)
          .set({
            expires_at_tick: newExpiresAtTick,
            premium_cents: BigInt(escalatedPremiumCents),
            updated_at: new Date(),
          })
          .where(eq(insuranceContract.id, contract.id));

        this.logger.log(
          `runWeeklyRenewalCheck: RENEWED player=${ctx.playerId} contract=${contract.id} weekId=${weekId} ` +
            `premium=${escalatedPremiumCents} expires_at_tick=${newExpiresAtTick} (currentTick=${currentTick} + term=${termLengthTicks})`,
        );
      } else {
        // ── Lapse: insufficient cash → status LAPSED; stamp almanac baseline_persisted_until_tick ─
        await this.db
          .update(insuranceContract)
          .set({ status: 'LAPSED', updated_at: new Date() })
          .where(eq(insuranceContract.id, contract.id));

        // C12 anti-exploit anchor: stamp baseline_persisted_until_tick on almanac_entry.
        // Uses REUSE underwriting_almanac_persistence_days_post_lapse (90 days, canon :110).
        //
        // C15 fix: align with captureBaselineFingerprint UPSERT — use SYNTHETIC_UNDERWRITER_ID
        //   when counterparty_id is null (standard issuance without walk-backed NPC underwriter).
        //   This ensures the lapse stamp targets the SAME almanac row that captureBaselineFingerprint
        //   created (keyed on effectiveUnderwriterId), enabling the C12 inherit path for standard players.
        //   Prior behavior: null counterparty → player-wide WHERE (eq player_id only) — could stamp
        //   a different row than the one captureBaselineFingerprint wrote (e.g. a POISONED row from
        //   fraud detection using the same SYNTHETIC_UNDERWRITER_ID). C15 makes both paths coherent.
        const effectiveLapseUnderwriterId = contract.counterparty_id ?? SYNTHETIC_UNDERWRITER_ID;
        const persistedUntilTick = currentTick + BigInt(persistenceDays * MINUTES_PER_DAY);
        const scopedAlmanacWhere = and(
          eq(almanacEntry.player_id, ctx.playerId),
          eq(almanacEntry.underwriter_id, effectiveLapseUnderwriterId),
        );

        await this.db
          .update(almanacEntry)
          .set({ baseline_persisted_until_tick: persistedUntilTick, updated_at: new Date() })
          .where(scopedAlmanacWhere);

        this.logger.log(
          `runWeeklyRenewalCheck: LAPSED player=${ctx.playerId} contract=${contract.id} weekId=${weekId} ` +
            `escalatedPremium=${escalatedPremiumCents} — insufficient cash; ` +
            `baseline_persisted_until_tick=${persistedUntilTick} stamped (C12 anti-exploit, ${persistenceDays} days, ` +
            `effectiveUnderwriter=${effectiveLapseUnderwriterId}, counterparty_id=${contract.counterparty_id ?? 'null→synthetic'})`,
        );
      }
    }
  }
}
