// IMPLEMENTS: docs/tech/09_data_model/schema_iap_monetization.md §1 (iap_sku_override) + design
//             §3-C1 (the table's write path — B3 correction).
// -- W1.3-C1 -- 2026-08-13 --

import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { iapSkuOverride } from '../../db/schema/iap_catalogue';

@Injectable()
export class IapSkuOverrideRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /** Every override row as a plain Map(sku_id → enabled). A sku_id absent from the map has never
   *  been toggled — the caller (IapCatalogueService) treats that as enabled=true (the column
   *  DEFAULT), never a separate lookup. */
  async getAllEnabledStates(): Promise<Map<string, boolean>> {
    const rows = await this.db.select({ sku_id: iapSkuOverride.sku_id, enabled: iapSkuOverride.enabled }).from(iapSkuOverride);
    return new Map(rows.map((r) => [r.sku_id, r.enabled]));
  }

  /** Upsert the enabled flag for one SKU (`PATCH /admin/iap/skus/:sku_id`). Returns the row so the
   *  controller can echo before/after state into the audit log. */
  async setEnabled(skuId: string, enabled: boolean, updatedBy: string): Promise<{ enabled: boolean }> {
    const rows = await this.db
      .insert(iapSkuOverride)
      .values({ sku_id: skuId, enabled, updated_by: updatedBy })
      .onConflictDoUpdate({
        target: iapSkuOverride.sku_id,
        set: { enabled, updated_by: updatedBy, updated_at: new Date() },
      })
      .returning({ enabled: iapSkuOverride.enabled });
    return rows[0]!;
  }

  /** Read the current enabled state for one SKU (used by the admin controller to report `before`
   *  in the audit log — a sku_id with no row is enabled=true, the DEFAULT). */
  async getEnabled(skuId: string): Promise<boolean> {
    const rows = await this.db
      .select({ enabled: iapSkuOverride.enabled })
      .from(iapSkuOverride)
      .where(eq(iapSkuOverride.sku_id, skuId))
      .limit(1);
    return rows[0]?.enabled ?? true;
  }
}
