// IMPLEMENTS: docs/tech/09_data_model/schema_operational_chain.md §7.10 (specialized_lab / lab_tier surface — the
//             building_operational_state.lab_tier column, Phase-2c T0) +
//             docs/tech/09_data_model/schema_player_economy_state.md §2 (economy_states.cash_cents — the guarded debit,
//             the SAME atomic-guarded pattern RealEstateRepository.debitAndCreateOperationalState /
//             RepairRepository.debitAndArmRepair use) +
//             docs/superpowers/specs/2026-06-06-phase-02c-ash-luxury-design.md §4-T5 (lab tier + upgrade action) +
//             docs/superpowers/plans/2026-07-04-04e-A-political-engine-plan.md C8 (★ Substrate 3 — Stack zoning gate) /
//             design §4.3 + docs/tech/09_data_model/schema_world_geography.md §2 addendum (blocks.stack_zoning_rank,
//             migration 0109)
//             -- session:2026-06-06 (Phase 2c vector #2c — Ash — Task 5) --
//             -- 04e-A1 C8 — 2026-07-04 (isStackZoningGated + block_id on UpgradeTargetState) --
//
// `SpecializedLabRepository` — the persisted access layer for the Phase-2c UPGRADE-TIER slice (Ash luxury channel).
// Copies the persisted-system repository template (RepairRepository / RealEstateRepository): a thin `*.repository.ts`
// owning the raw Drizzle reads/writes with EXPLICIT column lists, paired with a thin service holding the per-action
// validation + cost logic.
//
// R9.3: 09 is the source of truth for `building_operational_state` (operational chain — §7.10, the lab_tier column T0),
// `economy_states` (Phase-1), `buildings` (city_state — the block_id join, T0) and `blocks` (world geography —
// `stack_zoning_rank`, migration 0109, C8). This file IMPORTS the existing schema and NEVER re-declares it. The
// runtime role app_rw has UPDATE on building_operational_state (0017) + economy_states (0013) — this repository uses
// exactly those. `blocks.stack_zoning_rank` is READ-ONLY at runtime (app_rw keeps its SELECT-only grant on the
// geography tables — migration 0015 — this repository never writes it).
//
// THE GUARDED-DEBIT DISCIPLINE (REUSE — the SAME atomic pattern the real-estate / repair debits use): the upgrade debit
// is a `cash_cents >= cost` predicate IN the UPDATE so an insufficient balance NEVER goes negative — the UPDATE affects
// 0 rows, the WHOLE upgrade transaction rolls back (no state change), and the caller rejects (409). The debit + the
// lab_tier increment run in ONE transaction (an upgrade never debits cash without raising the tier, and vice-versa).
// All values are PARAMETERIZED bind params (no string interpolation). NO RNG (deterministic).

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { building } from '../../db/schema/city_state';
import { buildingOperationalState } from '../../db/schema/operational_chain';
import { economyState } from '../../db/schema/player_economy_state';
import { blocks } from '../../db/schema/world_geography';

/** A player-owned building's upgrade-relevant operational state (the upgrade-tier action validation input). */
export interface UpgradeTargetState {
  building_id: string;
  /** The operational type (front_shop/stash/lab/specialized_lab/… — only 'specialized_lab' is tier-upgradable). */
  operational_type: string;
  /** The current lab_tier (building_operational_state.lab_tier; default 1 at build — the lever the action raises). */
  lab_tier: number;
  /**
   * 04e-A1 C8 — the building's `buildings.block_id` (joined from `buildings`, the operational-state row itself has no
   * geography link). The Stack zoning gate (design §4.3) needs this to resolve `blocks.stack_zoning_rank`.
   */
  block_id: number;
}

@Injectable()
export class SpecializedLabRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * Read a player-owned building's upgrade-relevant operational state (or null). Returns null when the building has no
   * building_operational_state row for THIS player (not owned / not converted) — the caller maps that to a 404. The
   * operational_type drives the specialized_lab validation (only a specialized_lab is tier-upgradable → 409 otherwise);
   * the lab_tier drives the at-cap validation (only lab_tier < max_tier is upgradable → 409 at cap). Player-scoped so a
   * building belonging to another player is invisible (404, never a cross-player leak).
   */
  async getUpgradeTargetState(playerId: string, buildingId: string): Promise<UpgradeTargetState | null> {
    const rows = await this.db
      .select({
        building_id: buildingOperationalState.building_id,
        operational_type: buildingOperationalState.operational_type,
        lab_tier: buildingOperationalState.lab_tier,
        // 04e-A1 C8 — joined from `buildings` (the operational-state row has no geography link of its own),
        // so the Stack zoning gate can resolve blocks.stack_zoning_rank for this building's lot.
        block_id: building.block_id,
      })
      .from(buildingOperationalState)
      .innerJoin(building, eq(building.building_id, buildingOperationalState.building_id))
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
   * 04e-A1 C8 — ★ Substrate 3: Stack zoning gate (design §4.3, LOCKED decision (a): "a genuine Stack zoning gate
   * (spatial restriction on lab placement), NOT a Tier cap change").
   *
   * Whether `blockId` is CURRENTLY one of the zoning-gated Stack lots: gated iff its persisted
   * `blocks.stack_zoning_rank` (migration 0109 — the block's FIXED ordinal among ALL Stack-profile blocks,
   * assigned ONCE, deterministic, never RNG) is NOT NULL and <= `gatedLotCount` (the caller passes the CURRENT
   * overlay-composed `specializedLabTunables.stackZoningGatedLotCount` — C5 pattern; E-POL-07 relaxes the gate by
   * SETting this count toward 0 through the REAL EffectModifierService, at which point rank <= 0 is never true —
   * NO block is gated). A block outside the top-6 Stack ranking (rank NULL) or any non-Stack block is NEVER
   * gated, for any count. `gatedLotCount <= 0` short-circuits to false without a query (the fully-relaxed case).
   */
  async isStackZoningGated(blockId: number, gatedLotCount: number): Promise<boolean> {
    if (gatedLotCount <= 0) return false;
    const rows = await this.db
      .select({ stack_zoning_rank: blocks.stack_zoning_rank })
      .from(blocks)
      .where(eq(blocks.id, blockId))
      .limit(1);
    const rank = rows[0]?.stack_zoning_rank ?? null;
    return rank !== null && rank <= gatedLotCount;
  }

  /**
   * The ATOMIC guarded upgrade-tier transaction (the wallet-affecting action): in ONE DB transaction —
   *   1) GUARDED DEBIT (REUSE the real-estate / repair atomic-guarded pattern): `UPDATE economy_states SET cash_cents =
   *      cash_cents - cost WHERE player_id = ? AND cash_cents >= cost`. Insufficient balance → 0 rows → return null
   *      (the caller rejects 409 INSUFFICIENT_FUNDS); the tx rolls back the no-op (no state change).
   *   2) RAISE THE TIER: `UPDATE building_operational_state SET lab_tier = lab_tier + 1 WHERE building_id = ? AND
   *      player_id = ? AND operational_type = 'specialized_lab' AND lab_tier = fromTier` (the operational_type +
   *      fromTier predicates are belt-and-braces — the caller already validated them; they also make a concurrent
   *      double-upgrade a no-op: a racing second call whose lab_tier already moved past fromTier updates 0 rows).
   * `fromTier` is the lab_tier the caller READ and validated < max_tier; the increment lands lab_tier = fromTier + 1.
   * Returns { newLabTier } on success, or null when the debit was refused (insufficient funds). DETERMINISTIC (no RNG).
   */
  async debitAndUpgradeTier(params: {
    playerId: string;
    buildingId: string;
    fromTier: number;
    costCents: bigint;
  }): Promise<{ newLabTier: number } | null> {
    const { playerId, buildingId, fromTier, costCents } = params;
    return this.db.transaction(async (tx) => {
      // 1) GUARDED DEBIT — only succeeds if the wallet can cover the cost (never go negative — anti-exploit). REUSE the
      // exact atomic-guarded predicate the real-estate purchase/convert + repair debits use.
      const debited = await tx
        .update(economyState)
        .set({ cash_cents: sql`${economyState.cash_cents} - ${costCents}` })
        .where(and(eq(economyState.player_id, playerId), sql`${economyState.cash_cents} >= ${costCents}`))
        .returning({ cash_cents: economyState.cash_cents });
      if (debited.length === 0) {
        // Insufficient balance (or no wallet row) → refuse the whole upgrade (the tx rolls back the no-op).
        return null;
      }

      // 2) RAISE THE TIER — increment lab_tier by one (guarded on the validated fromTier + specialized_lab, so a
      // concurrent double-upgrade updates 0 rows — but the debit above is the real single-charge guard via idempotency).
      const raised = await tx
        .update(buildingOperationalState)
        .set({ lab_tier: sql`${buildingOperationalState.lab_tier} + 1` })
        .where(
          and(
            eq(buildingOperationalState.building_id, buildingId),
            eq(buildingOperationalState.player_id, playerId),
            eq(buildingOperationalState.operational_type, 'specialized_lab'),
            eq(buildingOperationalState.lab_tier, fromTier),
          ),
        )
        .returning({ lab_tier: buildingOperationalState.lab_tier });

      // The tier-raise predicate failed to match (a concurrent upgrade already moved lab_tier past fromTier) → roll the
      // whole tx back so the debit does not land without the tier moving (an upgrade never charges without upgrading).
      if (raised.length === 0) {
        throw new Error('upgrade-tier lost a concurrency race (lab_tier moved past the validated fromTier) — rolled back.');
      }

      return { newLabTier: raised[0].lab_tier };
    });
  }
}
