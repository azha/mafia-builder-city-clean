// IMPLEMENTS: docs/superpowers/plans/2026-07-12-p3-C-supply-chain-plan.md §C4 (the maintenance verb's
//             persistence: atomic claim I3, the compensating wallet refund I9, the owned-leg 404 read)
//             Design: docs/superpowers/specs/2026-07-12-p3-C-supply-chain-design.md §5.4 (claim atomique
//             `UPDATE ... WHERE maintenance_mode IS NULL RETURNING` ; "débit d'abord, claim ensuite,
//             refund compensatoire sur échec de claim — même forme que governor :104-114").
//             Decisions: §1.2 D2 (leg identity) + I3/I9 (design §15).
//             Pattern (atomic claim): `RepairRepository.debitAndArmRepair`'s guarded-then-armed shape,
//             but I9's "compensating refund on downstream failure" is modeled on `structural-decision-
//             governor.repository.ts`'s `reserveStructuralSlot`/`compensateStructuralSlot` PAIR — TWO
//             separate statements, not one shared transaction, because for `structural_reinforce` the
//             debit+claim sequence here is itself the governor's `mutateFn` argument (called AFTER the
//             governor's OWN atomic reserve already committed) — a single wrapping DB transaction across
//             both steps is not an option once a SEPARATE, already-committed reservation sits in front of
//             them. `refundWallet` mirrors `money-holding.repository.ts`'s own `cash_cents + amount`
//             credit idiom (the wallet-credit shape every payout/refund site in this codebase shares) —
//             a NEW method here (not a `raid-exception.repository.ts` edit — D3 wall: this lot never
//             touches `src/exceptions/`; that file's own `debitWallet` is REUSED, never extended).
//             — P3-C C4 — 2026-07-12
//
// `LegMaintenanceRepository` — the 3 seams `LegMaintenanceService.maintain` composes:
//   1. `findOwnedLeg` — the 404 existence+ownership read (mirrors `DistributionRepository.
//      getOwnedOperationalBuilding`'s own "read first, atomic claim second" ordering — ownership does
//      not change concurrently, so this read is NOT part of I3's atomicity property; the claim below
//      RE-CHECKS `player_id` anyway, belt-and-braces, the SAME defensive redundancy `debitAndArmRepair`'s
//      own `structural_state='damaged'` re-check documents).
//   2. `claimMaintenance` — I3: `UPDATE supply_chain_legs SET maintenance_mode=$mode, ...
//      WHERE leg_id=$id AND player_id=$me AND maintenance_mode IS NULL RETURNING` (design §5.4 verbatim).
//      0 rows = the job slot was already claimed (by a concurrent racer, or a still-active earlier job) —
//      the caller (`LegMaintenanceService`) treats `null` as "issue the I9 compensating refund, then
//      409 MAINTENANCE_IN_PROGRESS".
//   3. `refundWallet` — I9's compensating credit: `cash_cents = cash_cents + cents`, unconditional
//      (no guard needed — a credit can never go negative-invalid the way a debit can).

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { supplyChainLegRow, type MycelialMaintenanceModeEnumTs } from '../../db/schema/supply_chain_loops';
import { economyState } from '../../db/schema/player_economy_state';

export interface OwnedLegState {
  readonly legId: string;
  readonly originBuildingId: string;
  readonly destinationBuildingId: string;
  readonly debtLoad: number;
  readonly maintenanceMode: MycelialMaintenanceModeEnumTs | null;
  readonly bypassed: boolean;
}

export interface ClaimedLeg {
  readonly legId: string;
  readonly originBuildingId: string;
  readonly destinationBuildingId: string;
}

@Injectable()
export class LegMaintenanceRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /** The 404 existence+ownership read (a player may only maintain their OWN leg). */
  async findOwnedLeg(playerId: string, legId: string): Promise<OwnedLegState | null> {
    const [row] = await this.db
      .select({
        legId: supplyChainLegRow.leg_id,
        originBuildingId: supplyChainLegRow.origin_building_id,
        destinationBuildingId: supplyChainLegRow.destination_building_id,
        debtLoad: supplyChainLegRow.debt_load,
        maintenanceMode: supplyChainLegRow.maintenance_mode,
        bypassed: supplyChainLegRow.bypassed,
      })
      .from(supplyChainLegRow)
      .where(and(eq(supplyChainLegRow.leg_id, legId), eq(supplyChainLegRow.player_id, playerId)))
      .limit(1);
    return row ?? null;
  }

  /**
   * I3 — the atomic claim (design §5.4 verbatim SQL). `completesAtTick` is `null` for `reroute_bypass`
   * (a STATE, not a timed job — the migration 0125 3-way CHECK's own carve-out) and
   * `now + duration_ticks` for `quick_patch`/`structural_reinforce`. `bypassed` is stamped `true` iff
   * `mode === 'reroute_bypass'` (it can only ever be `false` going INTO a successful claim — the WHERE's
   * own `maintenance_mode IS NULL` guard means a currently-bypassed leg, whose `maintenance_mode` is
   * ALWAYS `'reroute_bypass'`, can never match this predicate — a 2nd verb call on an already-resting leg
   * 409s here exactly like any other in-progress job). Returns `null` (0 rows) on a lost race or an
   * already-in-progress job — the caller owes the I9 compensating refund on that path.
   */
  async claimMaintenance(
    playerId: string,
    legId: string,
    mode: MycelialMaintenanceModeEnumTs,
    completesAtTick: number | null,
  ): Promise<ClaimedLeg | null> {
    const [row] = await this.db
      .update(supplyChainLegRow)
      .set({
        maintenance_mode: mode,
        maintenance_completes_at_tick: completesAtTick,
        bypassed: mode === 'reroute_bypass',
      })
      .where(
        and(
          eq(supplyChainLegRow.leg_id, legId),
          eq(supplyChainLegRow.player_id, playerId),
          isNull(supplyChainLegRow.maintenance_mode),
        ),
      )
      .returning({
        legId: supplyChainLegRow.leg_id,
        originBuildingId: supplyChainLegRow.origin_building_id,
        destinationBuildingId: supplyChainLegRow.destination_building_id,
      });
    return row ?? null;
  }

  /**
   * I9 — the compensating refund: `cash_cents = cash_cents + cents`, unconditional (a credit cannot
   * violate the "never negative" invariant the guarded DEBIT protects — only the debit needs a WHERE
   * guard). Mirrors `money-holding.repository.ts`'s own wallet-credit idiom.
   */
  async refundWallet(playerId: string, cents: number): Promise<void> {
    await this.db
      .update(economyState)
      .set({ cash_cents: sql`${economyState.cash_cents} + ${cents}` })
      .where(eq(economyState.player_id, playerId));
  }
}
