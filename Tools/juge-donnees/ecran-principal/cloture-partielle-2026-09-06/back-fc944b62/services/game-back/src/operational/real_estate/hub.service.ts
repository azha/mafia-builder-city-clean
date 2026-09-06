// IMPLEMENTS: docs/superpowers/specs/2026-06-07-phase-04-distribution-hub-design.md §4-T2 (HubService + controller
//             — POST /v1/operational/building/:id/upgrade-hub-tier; the hub-tier lever scaling the courier roster cap) +
//             docs/tech/09_data_model/schema_operational_chain.md §7.12 (distribution_hub / hub_tier surface, T0,
//             migration 0024) +
//             docs/tech/04a_operational_systems/real_estate.md §202 (the M1 money convention the upgrade cost reuses)
//             -- session:2026-06-07 (Phase 4 vector #4 — distribution_hub — Task 2) --
//
// `HubService` — the player-triggered UPGRADE-HUB-TIER action of the distribution_hub courier vector (T2). The
// BYTE-MIRROR of SpecializedLabService (swapping the distribution_hub specifics). A distribution_hub is built at
// hub_tier 1 (T1); this action raises hub_tier by one for cash, capped at distribution.hub_max_tier. A higher tier
// later scales the courier roster cap (the hub-tier lever read by HubRosterService — T3; the roster cap is NOT computed
// here, T2 only manages the tier value + the upgrade action).
//
// THE ACTION (HubService.upgradeHubTier(playerId, buildingId)):
//   1) VALIDATE: read the player's building_operational_state row. Not owned / not converted (no row) → 404
//      RESOURCE_NOT_FOUND. The row exists but operational_type ≠ 'distribution_hub' → 409 RESOURCE_STATE_CONFLICT (only a
//      distribution_hub has a hub_tier lever — a lab/stash/front_shop cannot be hub-tier-upgraded). hub_tier == max_tier
//      → 409 RESOURCE_STATE_CONFLICT (AT_CAP — nothing left to upgrade to). This matches the existing operational error
//      conventions (404 not-found/not-owned, 409 wrong-state — RepairService / SpecializedLabService precedent).
//   2) COST: distribution.hub_upgrade_cost_ratio.<targetTier> × the M1 conversion-cost reference (hubUpgradeCostCents —
//      R2.3, NOT inline; the SAME money convention as the repair / lab-tier cost). targetTier = currentTier + 1 (the
//      tier moved TO). The raw cents stay internal — the player surface is the qualitative hub_tier band on the
//      projection (R2.2).
//   3) DEBIT + RAISE (atomic, guarded — REUSE the real-estate / repair / specialized-lab guarded-debit pattern): debit
//      economy_states by the cost with a `cash_cents >= cost` guard IN the UPDATE. Insufficient balance → 409
//      RESOURCE_STATE_CONFLICT (INSUFFICIENT_FUNDS — no state change, the tx rolls back). Success → hub_tier++ in the
//      SAME tx.
//
// IDEMPOTENCY: the mutating POST is subject to the existing IdempotencyInterceptor (REUSE — a retried upgrade-hub-tier
// with the same Idempotency-Key replays the memorized response, NO re-execution → no double-debit / no double-increment).
// This service does not re-implement idempotency; it just runs the guarded transaction (the interceptor wraps the
// handler, exactly as it wraps the repair / purchase / convert / upgrade-tier POSTs).

import { Injectable, Logger } from '@nestjs/common';

import { ApiError } from '../../protocol/api-error';
import { HubRepository } from './hub.repository';
import { hubTunables, hubUpgradeCostCents } from './hub-tunables';

@Injectable()
export class HubService {
  private readonly logger = new Logger(HubService.name);

  constructor(private readonly repo: HubRepository) {}

  /**
   * Upgrade a player-owned distribution_hub's hub_tier by one (the hub-tier lever). Validates ownership + the
   * distribution_hub type + hub_tier < max_tier, debits the grounded upgrade cost atomically-guarded, and raises
   * hub_tier++ in the SAME tx.
   *
   * Errors (the existing operational conventions): not owned / not converted (no operational row) → 404
   * RESOURCE_NOT_FOUND; not a distribution_hub → 409 RESOURCE_STATE_CONFLICT (WRONG_TYPE); already at max_tier → 409
   * RESOURCE_STATE_CONFLICT (AT_CAP); insufficient cash → 409 RESOURCE_STATE_CONFLICT (INSUFFICIENT_FUNDS, no change).
   *
   * Returns { upgraded: true } (the raw new hub_tier / post-debit cents are NOT forwarded — R2.2; the player surface is
   * the qualitative hub_tier band on the projection).
   */
  async upgradeHubTier(playerId: string, buildingId: string): Promise<{ upgraded: true }> {
    const state = await this.repo.getUpgradeTargetState(playerId, buildingId);
    if (!state) {
      // No operational-state row for this player+building → not owned / not converted.
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `building ${buildingId} is not a player-owned operational building for this player.`,
      });
    }
    if (state.operational_type !== 'distribution_hub') {
      // Only a distribution_hub carries a hub_tier lever — a lab/stash/front_shop has no tier to upgrade.
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `building ${buildingId} is not a distribution_hub (operational_type='${state.operational_type}') — only a distribution_hub can be hub-tier-upgraded.`,
      });
    }
    if (state.hub_tier >= hubTunables.maxTier) {
      // Already at the cap → nothing left to upgrade to (no cost, no state change).
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `building ${buildingId} is already at the max hub_tier (${hubTunables.maxTier}) — cannot upgrade further.`,
      });
    }

    const targetTier = state.hub_tier + 1; // the tier the upgrade moves TO (the cost is keyed by this).
    const costCents = hubUpgradeCostCents(targetTier); // R2.3: ratio.<targetTier> × conversion reference (NOT inline).

    const result = await this.repo.debitAndUpgradeHubTier({
      playerId,
      buildingId,
      fromTier: state.hub_tier,
      costCents,
    });
    if (result === null) {
      // The guarded debit affected 0 rows → insufficient balance (the wallet would have gone negative). No state change.
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: 'Insufficient cash to cover the hub-tier upgrade cost.',
      });
    }

    this.logger.log(
      `upgrade-hub-tier: player=${playerId} building=${buildingId} → hub_tier ${state.hub_tier}→${result.newHubTier} ` +
        `(target=${targetTier}, max=${hubTunables.maxTier})`,
    );
    return { upgraded: true };
  }
}
