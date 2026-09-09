// IMPLEMENTS: docs/tech/09_data_model/schema_operational_chain.md §7.12 (distribution_hub / hub_tier surface — the
//             building_operational_state.hub_tier column, Phase-4 vector #4 T0, migration 0024) +
//             docs/tech/09_data_model/schema_player_economy_state.md §2 (economy_states.cash_cents — the guarded debit,
//             the SAME atomic-guarded pattern RealEstateRepository.debitAndCreateOperationalState /
//             RepairRepository.debitAndArmRepair / SpecializedLabRepository.debitAndUpgradeTier use) +
//             docs/superpowers/specs/2026-06-07-phase-04-distribution-hub-design.md §4/§7 (hub tier + upgrade action)
//             -- session:2026-06-07 (Phase 4 vector #4 — distribution_hub — Task 2) --
//
// `HubRepository` — the persisted access layer for the Phase-4 UPGRADE-HUB-TIER slice (courier dispatch hub). The
// BYTE-MIRROR of SpecializedLabRepository (swapping lab_tier→hub_tier, 'specialized_lab'→'distribution_hub'): copies the
// persisted-system repository template (RepairRepository / RealEstateRepository): a thin `*.repository.ts` owning the
// raw Drizzle reads/writes with EXPLICIT column lists, paired with a thin service holding the per-action validation +
// cost logic.
//
// R9.3: 09 is the source of truth for `building_operational_state` (operational chain — §7.12, the hub_tier column T0,
// migration 0024) and `economy_states` (Phase-1). This file IMPORTS the existing schema and NEVER re-declares it. The
// runtime role app_rw has UPDATE on building_operational_state (0017) + economy_states (0013) — this repository uses
// exactly those. NO schema change (T0 landed hub_tier).
//
// THE GUARDED-DEBIT DISCIPLINE (REUSE — the SAME atomic pattern the real-estate / repair / specialized-lab debits use):
// the upgrade debit is a `cash_cents >= cost` predicate IN the UPDATE so an insufficient balance NEVER goes negative —
// the UPDATE affects 0 rows, the WHOLE upgrade transaction rolls back (no state change), and the caller rejects (409).
// The debit + the hub_tier increment run in ONE transaction (an upgrade never debits cash without raising the tier, and
// vice-versa). All values are PARAMETERIZED bind params (no string interpolation). NO RNG (deterministic).

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { buildingOperationalState } from '../../db/schema/operational_chain';
import { economyState } from '../../db/schema/player_economy_state';

/** A player-owned building's upgrade-relevant operational state (the upgrade-hub-tier action validation input). */
export interface HubUpgradeTargetState {
  building_id: string;
  /** The operational type (front_shop/stash/lab/distribution_hub/… — only 'distribution_hub' is hub-tier-upgradable). */
  operational_type: string;
  /** The current hub_tier (building_operational_state.hub_tier; default 1 at build — the lever the action raises). */
  hub_tier: number;
}

@Injectable()
export class HubRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * Read a player-owned building's upgrade-relevant operational state (or null). Returns null when the building has no
   * building_operational_state row for THIS player (not owned / not converted) — the caller maps that to a 404. The
   * operational_type drives the distribution_hub validation (only a distribution_hub is hub-tier-upgradable → 409
   * otherwise); the hub_tier drives the at-cap validation (only hub_tier < max_tier is upgradable → 409 at cap).
   * Player-scoped so a building belonging to another player is invisible (404, never a cross-player leak).
   */
  async getUpgradeTargetState(playerId: string, buildingId: string): Promise<HubUpgradeTargetState | null> {
    const rows = await this.db
      .select({
        building_id: buildingOperationalState.building_id,
        operational_type: buildingOperationalState.operational_type,
        hub_tier: buildingOperationalState.hub_tier,
      })
      .from(buildingOperationalState)
      .where(
        and(
          eq(buildingOperationalState.building_id, buildingId),
          eq(buildingOperationalState.player_id, playerId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * The ATOMIC guarded upgrade-hub-tier transaction (the wallet-affecting action): in ONE DB transaction —
   *   1) GUARDED DEBIT (REUSE the real-estate / repair / specialized-lab atomic-guarded pattern): `UPDATE economy_states
   *      SET cash_cents = cash_cents - cost WHERE player_id = ? AND cash_cents >= cost`. Insufficient balance → 0 rows →
   *      return null (the caller rejects 409 INSUFFICIENT_FUNDS); the tx rolls back the no-op (no state change).
   *   2) RAISE THE TIER: `UPDATE building_operational_state SET hub_tier = hub_tier + 1 WHERE building_id = ? AND
   *      player_id = ? AND operational_type = 'distribution_hub' AND hub_tier = fromTier` (the operational_type +
   *      fromTier predicates are belt-and-braces — the caller already validated them; they also make a concurrent
   *      double-upgrade a no-op: a racing second call whose hub_tier already moved past fromTier updates 0 rows).
   * `fromTier` is the hub_tier the caller READ and validated < max_tier; the increment lands hub_tier = fromTier + 1.
   * Returns { newHubTier } on success, or null when the debit was refused (insufficient funds). DETERMINISTIC (no RNG).
   */
  async debitAndUpgradeHubTier(params: {
    playerId: string;
    buildingId: string;
    fromTier: number;
    costCents: bigint;
  }): Promise<{ newHubTier: number } | null> {
    const { playerId, buildingId, fromTier, costCents } = params;
    return this.db.transaction(async (tx) => {
      // 1) GUARDED DEBIT — only succeeds if the wallet can cover the cost (never go negative — anti-exploit). REUSE the
      // exact atomic-guarded predicate the real-estate purchase/convert + repair + specialized-lab debits use.
      const debited = await tx
        .update(economyState)
        .set({ cash_cents: sql`${economyState.cash_cents} - ${costCents}` })
        .where(and(eq(economyState.player_id, playerId), sql`${economyState.cash_cents} >= ${costCents}`))
        .returning({ cash_cents: economyState.cash_cents });
      if (debited.length === 0) {
        // Insufficient balance (or no wallet row) → refuse the whole upgrade (the tx rolls back the no-op).
        return null;
      }

      // 2) RAISE THE TIER — increment hub_tier by one (guarded on the validated fromTier + distribution_hub, so a
      // concurrent double-upgrade updates 0 rows — but the debit above is the real single-charge guard via idempotency).
      const raised = await tx
        .update(buildingOperationalState)
        .set({ hub_tier: sql`${buildingOperationalState.hub_tier} + 1` })
        .where(
          and(
            eq(buildingOperationalState.building_id, buildingId),
            eq(buildingOperationalState.player_id, playerId),
            eq(buildingOperationalState.operational_type, 'distribution_hub'),
            eq(buildingOperationalState.hub_tier, fromTier),
          ),
        )
        .returning({ hub_tier: buildingOperationalState.hub_tier });

      // The tier-raise predicate failed to match (a concurrent upgrade already moved hub_tier past fromTier) → roll the
      // whole tx back so the debit does not land without the tier moving (an upgrade never charges without upgrading).
      if (raised.length === 0) {
        throw new Error('upgrade-hub-tier lost a concurrency race (hub_tier moved past the validated fromTier) — rolled back.');
      }

      return { newHubTier: raised[0].hub_tier };
    });
  }
}
