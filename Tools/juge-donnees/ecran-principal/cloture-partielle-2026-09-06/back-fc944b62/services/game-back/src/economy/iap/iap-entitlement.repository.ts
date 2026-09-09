// IMPLEMENTS: docs/tech/09_data_model/schema_iap_monetization.md §3 (iap_entitlement) + design
//             §3-C3 (grant guarded by the composite PK, not an `if`).
// -- W1.3-C3 -- 2026-08-13 --

import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { iapEntitlement } from '../../db/schema/iap_entitlement';

/** A Drizzle transaction handle (mirrors money-holding.repository.ts:46's own local Tx alias). */
type Tx = Parameters<Parameters<DrizzleClient['transaction']>[0]>[0];

@Injectable()
export class IapEntitlementRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * `INSERT ... ON CONFLICT (player_id, sku_id) DO NOTHING`, returns whether a row was actually
   * inserted. Called FIRST in the purchase transaction (before the debit) so a duplicate purchase
   * attempt never debits — the composite PK is the guard, not a prior SELECT (no TOCTOU).
   */
  async grant(tx: Tx, playerId: string, skuId: string): Promise<boolean> {
    const rows = await tx
      .insert(iapEntitlement)
      .values({ player_id: playerId, sku_id: skuId })
      .onConflictDoNothing({ target: [iapEntitlement.player_id, iapEntitlement.sku_id] })
      .returning({ sku_id: iapEntitlement.sku_id });
    return rows.length > 0;
  }

  /** Every sku_id this player owns (`GET /v1/me/iap/entitlements`). */
  async listForPlayer(playerId: string): Promise<string[]> {
    const rows = await this.db
      .select({ sku_id: iapEntitlement.sku_id })
      .from(iapEntitlement)
      .where(eq(iapEntitlement.player_id, playerId));
    return rows.map((r) => r.sku_id);
  }
}
