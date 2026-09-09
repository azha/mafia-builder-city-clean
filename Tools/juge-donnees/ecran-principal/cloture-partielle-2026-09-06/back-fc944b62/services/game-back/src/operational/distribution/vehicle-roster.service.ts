// IMPLEMENTS: docs/superpowers/specs/2026-06-22-system9-route-lifecycle-9b-design.md §5.1 DD-ROSTER + §5.2 DD-VEHICLE-STATS
//             distribution_couriers_runners.md §9b (equipment purchase pool, vehicle capacity enforcement)
//             docs/superpowers/plans/2026-06-23-system9-automation-hubs-9c-plan.md Task 7 (C7) — DD-TIER-BUY-GATE + DD-TIER-MAP
//             System 9b C11 — 2026-06-23 | System 9c C7 — 2026-06-24
//
// `VehicleRosterService` — the equipment-purchase pool + the capacity enforcement.
//   - purchaseVehicle: DD-TIER-BUY-GATE (C7): FIRST checks hub-tier ≥ vehiclePurchaseRequiredTier(type);
//     if tier too low → { ok: false, reason: 'hub_tier_too_low' } ATOMICALLY (no cash debit, no UPSERT).
//     Then debit `equipmentCostCentsFor(type)` via debitWallet; UPSERT vehicle_inventory.count.
//     foot cost = $0 (always buyable — required tier 0 — still debits 0 cents; UPSERT adds the row).
//     Insufficient cash → returns { ok: false, reason: 'insufficient_cash' } (no inventory row written).
//     DIV-R1-bis: cash AND tier, diegetic (not IAP). The clean 9b/9c frontier.
//   - ownsVehicle: OR-semantics (DD-ROSTER-HUB-RECONCILE): inventory (count > 0) OR hub-unlocked (bike/car when hub ≠ null);
//     foot = default-allow (OQ-RS4). Caller passes the already-fetched hub (DRY — no second hub query).
//     ownsVehicle (DISPATCH) UNTOUCHED — C7 gates BUY only (the clean 9b/9c frontier).
//   - enforceCapacity: PURE — cargoGrams ≤ vehicleCapacityGramsFor(type) (OQ-VS2).
// No Math.random. No Date.now. Deterministic.

import { Inject, Injectable } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { vehicleInventory } from '../../db/schema/operational_chain';
import { RaidExceptionRepository } from '../../exceptions/raid-exception.repository';
import { distributionRouteLifecycleTunables, distributionAutomationHubsTunables } from './distribution-tunables';
import { DistributionRepository } from './distribution.repository';

@Injectable()
export class VehicleRosterService {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly raidExceptionRepo: RaidExceptionRepository,
    private readonly distributionRepo: DistributionRepository,
  ) {}

  /**
   * Purchase a vehicle by first checking hub-tier then debiting the canon equipment cost and upserting
   * the player's inventory.
   *
   * DD-TIER-BUY-GATE (C7, System 9c): BEFORE the cash debit, checks that the player's hub-tier
   * (getOwnedOperationalHub?.hubTier ?? 0) ≥ vehiclePurchaseRequiredTier(vehicleType). If the tier
   * is too low → { ok: false, reason: 'hub_tier_too_low' } ATOMICALLY (no cash debit, no UPSERT row).
   * foot required-tier = 0 (always buyable — the C3 getter returns 0 for foot and unknown types).
   * refrigerated_van aliases to the van tier-4 key (via the C3 getter switch).
   *
   * DIV-R1-bis: cash AND tier (diegetic debitWallet — not IAP). The clean 9b/9c frontier:
   * ownsVehicle (DISPATCH) is UNTOUCHED; C7 gates only the BUY.
   * foot cost = 0 cents (always purchasable — just adds the row).
   * Returns { ok: false, reason: 'insufficient_cash' } on insufficient balance (no row written).
   * Returns { ok: true } on success (count incremented).
   */
  async purchaseVehicle(playerId: string, vehicleTypeName: string): Promise<{ ok: boolean; reason?: string }> {
    // ── DD-TIER-BUY-GATE (C7): tier precondition BEFORE the cash debit (atomic — no partial state). ──
    // Getter-sourced (no inline tier): distributionAutomationHubsTunables.vehiclePurchaseRequiredTier
    // returns 0 for foot (always buyable), 2/3/4 for bike/car/van (refrigerated_van aliases van).
    const requiredTier = distributionAutomationHubsTunables.vehiclePurchaseRequiredTier(vehicleTypeName);
    if (requiredTier > 0) {
      // foot (requiredTier=0) is exempt — skip the hub lookup for performance.
      const hub = await this.distributionRepo.getOwnedOperationalHub(playerId);
      const playerTier = hub?.hubTier ?? 0; // no hub → tier 0 (OQ-RS5: cannot buy tier-gated vehicles)
      if (playerTier < requiredTier) {
        return { ok: false, reason: 'hub_tier_too_low' };
      }
    }

    const costCents = distributionRouteLifecycleTunables.equipmentCostCentsFor(vehicleTypeName);

    // Debit the diegetic wallet (guarded UPDATE — returns false on insufficient cash).
    // foot cost = 0 → always succeeds (debitWallet with 0 cents always returns true).
    const debited = await this.raidExceptionRepo.debitWallet(playerId, costCents);
    if (!debited) {
      return { ok: false, reason: 'insufficient_cash' };
    }

    // UPSERT: insert a row with count=1, or increment count by 1 on conflict.
    // Capability-unlock: owning ≥1 unlocks the type (OQ-RS1).
    await this.db
      .insert(vehicleInventory)
      .values({ player_id: playerId, vehicle_type: vehicleTypeName as any, count: 1 })
      .onConflictDoUpdate({
        target: [vehicleInventory.player_id, vehicleInventory.vehicle_type],
        set: { count: sql`${vehicleInventory.count} + 1` },
      });

    return { ok: true };
  }

  /**
   * Capability-unlock check: does the player own at least one vehicle of this type?
   *
   * OR-semantics (DD-ROSTER-HUB-RECONCILE, 2026-06-23): returns true if EITHER
   *   (i)  the vehicle is in vehicle_inventory with count > 0 (the C11 cash-purchase path), OR
   *   (ii) the vehicle is hub-unlocked by the existing Phase-4 hub mechanism (bike/car when hub !== null).
   *
   * `foot` = default-allow (OQ-RS4) — always returns true regardless of inventory.
   * `hub` = the caller's already-fetched getOwnedOperationalHub result (REUSE — DRY, no second hub query).
   * Hub-unlocked set: bike/car when hub !== null (mirrors allowedVehicles in distribution.service.ts).
   * This makes both acquisition paths coexist: cash-buy ∪ existing Phase-4 hub-unlock (DIV-R1-bis).
   */
  async ownsVehicle(
    playerId: string,
    vehicleTypeName: string,
    hub: { buildingId: string; hubTier: number } | null,
  ): Promise<boolean> {
    // foot is always owned (OQ-RS4 — the M1 dispatch byte-identical)
    if (vehicleTypeName === 'foot') return true;

    // Phase-4 hub-unlock path (REUSE — no second hub query; hub already fetched by caller).
    // bike/car are unlocked by owning an operational distribution_hub (hub !== null).
    // This mirrors the allowedVehicles hub-unlock predicate in distribution.service.ts.
    if (hub !== null && (vehicleTypeName === 'bike' || vehicleTypeName === 'car')) return true;

    // Cash-purchase path: count > 0 in vehicle_inventory (OQ-RS1 capability-unlock).
    const rows = await this.db
      .select({ count: vehicleInventory.count })
      .from(vehicleInventory)
      .where(and(eq(vehicleInventory.player_id, playerId), eq(vehicleInventory.vehicle_type, vehicleTypeName as any)));

    return rows.length > 0 && (rows[0]?.count ?? 0) > 0;
  }

  /**
   * PURE capacity enforcement (OQ-VS2): cargoGrams ≤ vehicleCapacityGramsFor(type).
   * Returns true if within capacity, false if over.
   * Getter-sourced — no inline scalar (anti-fabrication, R2.3).
   */
  enforceCapacity(vehicleTypeName: string, cargoGrams: number): boolean {
    const capacity = distributionRouteLifecycleTunables.vehicleCapacityGramsFor(vehicleTypeName);
    return cargoGrams <= capacity;
  }
}
