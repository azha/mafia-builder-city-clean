// IMPLEMENTS: docs/superpowers/specs/2026-06-06-phase-02c-ash-luxury-design.md §4-T5 (SpecializedLabService + controller
//             — POST /v1/operational/building/:id/upgrade-tier; the lab-tier lever of the Ash purity chain) +
//             docs/tech/09_data_model/schema_operational_chain.md §7.10 (specialized_lab / lab_tier surface, T0) +
//             docs/tech/04a_operational_systems/real_estate.md §202 (the M1 money convention the upgrade cost reuses) +
//             docs/superpowers/plans/2026-07-04-04e-A-political-engine-plan.md C8 (★ Substrate 3 — Stack zoning gate) /
//             design §4.3 (LOCKED decision (a): "a genuine Stack zoning gate (spatial restriction on lab placement),
//             NOT a Tier cap change")
//             -- session:2026-06-06 (Phase 2c vector #2c — Ash — Task 5) --
//             -- 04e-A1 C8 — 2026-07-04 (Stack zoning gate on the upgrade-to-gate_target_tier path) --
//
// `SpecializedLabService` — the player-triggered UPGRADE-TIER action of the Ash luxury channel (T5). A specialized_lab
// is built at lab_tier 1 (T1); this action raises lab_tier by one for cash, capped at specialized_lab.max_tier. A
// higher tier later yields purer Ash batches (the lab-tier lever read by AshPurityService — T6; purity is NOT computed
// here, T5 only manages the tier value + the upgrade action).
//
// THE ACTION (SpecializedLabService.upgradeTier(playerId, buildingId)):
//   1) VALIDATE: read the player's building_operational_state row. Not owned / not converted (no row) → 404
//      RESOURCE_NOT_FOUND. The row exists but operational_type ≠ 'specialized_lab' → 409 RESOURCE_STATE_CONFLICT (only a
//      specialized_lab has a lab_tier lever — a lab/stash/front_shop cannot be tier-upgraded). lab_tier == max_tier →
//      409 RESOURCE_STATE_CONFLICT (AT_CAP — nothing left to upgrade to). This matches the existing operational error
//      conventions (404 not-found/not-owned, 409 wrong-state — RepairService / RealEstateService precedent).
//   1b) ★ STACK ZONING GATE (04e-A1 C8, design §4.3 — landed on top of the pre-existing T5 action): when the tier the
//      upgrade MOVES TO equals the registered `stack_zoning_gate_target_tier` (BASE, a FIXED categorical marker, never
//      itself overlay-relaxed) AND the building's block is currently one of the ZONING-GATED Stack lots
//      (`SpecializedLabRepository.isStackZoningGated`, reading the OVERLAY-COMPOSED `stackZoningGatedLotCount` — C5
//      pattern), the upgrade is REJECTED — 422 VALIDATION_FAILED, the EXACT convention the district-based construction
//      gates in `RealEstateService`/`ConversionService` already use (grow_house/distribution_hub/money_holding/
//      refinery/press_house/cash_safehouse). Runs BEFORE any debit (a rejected upgrade makes NO state change). An
//      E-POL-07-shaped political-event modifier SETting the gated-lot count toward 0 through the REAL
//      `EffectModifierService` genuinely lifts this gate for the SAME lot (never a dead flag — `revertEvent` re-gates
//      it). Scoped ONLY to `operational_type='specialized_lab'` reaching the gate's target tier — every other
//      operational type, and every OTHER tier transition of a specialized_lab, is byte-identical (unaffected).
//   2) COST: specialized_lab.upgrade_cost_ratio.<targetTier> × the M1 conversion-cost reference (upgradeCostCents — R2.3,
//      NOT inline; the SAME money convention as the repair cost). targetTier = currentTier + 1 (the tier moved TO). The
//      raw cents stay internal — the player surface is the qualitative lab_tier band on the projection (R2.2).
//   3) DEBIT + RAISE (atomic, guarded — REUSE the real-estate / repair guarded-debit pattern): debit economy_states by
//      the cost with a `cash_cents >= cost` guard IN the UPDATE. Insufficient balance → 409 RESOURCE_STATE_CONFLICT
//      (INSUFFICIENT_FUNDS — no state change, the tx rolls back). Success → lab_tier++ in the SAME tx.
//
// IDEMPOTENCY: the mutating POST is subject to the existing IdempotencyInterceptor (REUSE — a retried upgrade-tier with
// the same Idempotency-Key replays the memorized response, NO re-execution → no double-debit / no double-increment).
// This service does not re-implement idempotency; it just runs the guarded transaction (the interceptor wraps the
// handler, exactly as it wraps the repair / purchase / convert POSTs).

import { Injectable, Logger } from '@nestjs/common';

import { ApiError } from '../../protocol/api-error';
import { SpecializedLabRepository } from './specialized-lab.repository';
import { specializedLabTunables, upgradeCostCents } from './specialized-lab-tunables';

@Injectable()
export class SpecializedLabService {
  private readonly logger = new Logger(SpecializedLabService.name);

  constructor(private readonly repo: SpecializedLabRepository) {}

  /**
   * Upgrade a player-owned specialized_lab's lab_tier by one (the lab-tier lever). Validates ownership + the
   * specialized_lab type + lab_tier < max_tier + the Stack zoning gate (04e-A1 C8), debits the grounded upgrade cost
   * atomically-guarded, and raises lab_tier++ in the SAME tx.
   *
   * Errors (the existing operational conventions): not owned / not converted (no operational row) → 404
   * RESOURCE_NOT_FOUND; not a specialized_lab → 409 RESOURCE_STATE_CONFLICT (WRONG_TYPE); already at max_tier → 409
   * RESOURCE_STATE_CONFLICT (AT_CAP); the target tier is zoning-gated on this building's Stack lot (C8, design §4.3) →
   * 422 VALIDATION_FAILED (no state change — an E-POL-07-shaped modifier lifts it); insufficient cash → 409
   * RESOURCE_STATE_CONFLICT (INSUFFICIENT_FUNDS, no change).
   *
   * Returns { upgraded: true } (the raw new lab_tier / post-debit cents are NOT forwarded — R2.2; the player surface is
   * the qualitative lab_tier band on the projection).
   */
  async upgradeTier(playerId: string, buildingId: string): Promise<{ upgraded: true }> {
    const state = await this.repo.getUpgradeTargetState(playerId, buildingId);
    if (!state) {
      // No operational-state row for this player+building → not owned / not converted.
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `building ${buildingId} is not a player-owned operational building for this player.`,
      });
    }
    if (state.operational_type !== 'specialized_lab') {
      // Only a specialized_lab carries a lab_tier lever — a lab/stash/front_shop has no tier to upgrade.
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `building ${buildingId} is not a specialized_lab (operational_type='${state.operational_type}') — only a specialized_lab can be tier-upgraded.`,
      });
    }
    if (state.lab_tier >= specializedLabTunables.maxTier) {
      // Already at the cap → nothing left to upgrade to (no cost, no state change).
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `building ${buildingId} is already at the max lab_tier (${specializedLabTunables.maxTier}) — cannot upgrade further.`,
      });
    }

    const targetTier = state.lab_tier + 1; // the tier the upgrade moves TO (the cost is keyed by this).

    // ★ STACK ZONING GATE (04e-A1 C8 — design §4.3, LOCKED decision (a): "a genuine Stack zoning gate (spatial
    // restriction on lab placement), NOT a Tier cap change"). Scoped to the registered gate_target_tier (BASE, a
    // FIXED categorical marker — default 3, never itself overlay-relaxed): only an upgrade landing EXACTLY on that
    // tier is ever gated; every other tier transition (e.g. 1→2 when the target tier is 3) is byte-identical. The
    // COUNT of currently-gated Stack lots IS overlay-aware (stackZoningGatedLotCount, C5 GLOBAL body-wrap pattern) —
    // E-POL-07 relaxes the gate by SETting it toward 0 through the REAL EffectModifierService; `revertEvent`
    // restores the base count and the SAME lot re-gates. Run BEFORE any debit (a rejected upgrade makes NO state
    // change) — the exact convention the district-based construction gates in RealEstateService/ConversionService
    // above already use. 422 VALIDATION_FAILED, never a dead flag.
    if (targetTier === specializedLabTunables.stackZoningGateTargetTier) {
      const gated = await this.repo.isStackZoningGated(state.block_id, specializedLabTunables.stackZoningGatedLotCount);
      if (gated) {
        throw new ApiError('VALIDATION_FAILED', {
          message:
            `building ${buildingId} sits on a Stack lot currently zoning-gated for tier ${targetTier} construction ` +
            `(an E-POL-07 industrial-zoning-relax political event lifts this gate while active).`,
        });
      }
    }

    const costCents = upgradeCostCents(targetTier); // R2.3: ratio.<targetTier> × conversion reference (NOT inline).

    const result = await this.repo.debitAndUpgradeTier({
      playerId,
      buildingId,
      fromTier: state.lab_tier,
      costCents,
    });
    if (result === null) {
      // The guarded debit affected 0 rows → insufficient balance (the wallet would have gone negative). No state change.
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: 'Insufficient cash to cover the lab-tier upgrade cost.',
      });
    }

    this.logger.log(
      `upgrade-tier: player=${playerId} building=${buildingId} → lab_tier ${state.lab_tier}→${result.newLabTier} ` +
        `(target=${targetTier}, max=${specializedLabTunables.maxTier})`,
    );
    return { upgraded: true };
  }
}
