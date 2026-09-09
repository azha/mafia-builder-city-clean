// IMPLEMENTS: docs/tech/10_economy_monetization/iap_catalogue.md §4 (RBAC surfaces — "Éditer le
//             prix / désactiver un SKU (BO)") + docs/superpowers/specs/2026-08-13-w1.3-monetization-
//             design.md §3-C1 (the table's ONLY write path — B3 correction: ships in the SAME
//             chunk as the table).
// -- W1.3-C1 -- 2026-08-13 --
//
// `IapCatalogueAdminController` — the ONE BO mutation this lot's catalogue exposes: toggling a
// SKU's `enabled` flag (`iap_sku_override`). Adding/removing a SKU stays a deploy (design §5-A1 —
// deliberate, real-money review). Role `admin` (canon says `staff.economy.adjust_currency`; that
// fine-grained permission catalogue does not exist in this stack — same RBAC-honesty posture as
// `LiveOpsAdminController`: the coarse `requireStaffRole('admin')` gate is what's real here).
// NOT conditional on NODE_ENV — a real production BO route, always-on (mirrors every sibling admin
// controller in this codebase).

import { Body, Controller, HttpCode, Param, Patch, Req, UseGuards } from '@nestjs/common';

import { ApiError } from '../../protocol/api-error';
import { requireStaffRole } from '../../auth/staff-role.guard';
import type { RequestWithAccount } from '../../auth/authenticated-request';
import { AdminAuditLogService } from '../../db/admin-audit-log.service';
import { findIapSku } from './iap-sku-catalogue';
import { IapSkuOverrideRepository } from './iap-sku-override.repository';

interface PatchSkuBody {
  enabled?: boolean;
}

@Controller('admin')
export class IapCatalogueAdminController {
  constructor(
    private readonly overrideRepo: IapSkuOverrideRepository,
    private readonly auditLog: AdminAuditLogService,
  ) {}

  /**
   * `PATCH /v1/admin/iap/skus/:sku_id` — Body: `{ enabled: boolean }`. Unknown sku_id → 404 (the
   * canon 9 are the only valid targets, iap-sku-catalogue.ts — this route never creates a new
   * override for an id the code doesn't define). Audited (`db.iap_sku_override.enabled_change`) —
   * one `admin_audit_log` row per mutation (REUSE, `AdminAuditLogService`).
   */
  @Patch('iap/skus/:sku_id')
  @HttpCode(200)
  @UseGuards(requireStaffRole('admin'))
  async setSkuEnabled(
    @Param('sku_id') skuId: string,
    @Body() body: PatchSkuBody | undefined,
    @Req() req: RequestWithAccount,
  ): Promise<{ sku_id: string; enabled: boolean }> {
    if (!findIapSku(skuId)) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `Unknown IAP sku_id: ${JSON.stringify(skuId)}.` });
    }
    const enabled = body?.enabled;
    if (typeof enabled !== 'boolean') {
      throw new ApiError('VALIDATION_FAILED', { message: 'Body must be { enabled: boolean }.' });
    }

    const before = await this.overrideRepo.getEnabled(skuId);
    const after = await this.overrideRepo.setEnabled(skuId, enabled, req.account!.account_id);

    // No `targetEntityId` — sku_id is a varchar(64), not a uuid (admin_audit_log.target_entity_id
    // is `uuid` typed, sessions_and_audit.ts:97); same precedent as maintenance-admin.controller.
    // ts:403/recruitment-admin.controller.ts:368 (a dotted tunable key is not a uuid either) — the
    // id travels in before/after_state instead.
    await this.auditLog.emit({
      adminUserId: req.account!.account_id,
      actionType: 'UPDATE',
      targetEntityType: 'iap_sku_override',
      beforeState: { sku_id: skuId, enabled: before },
      afterState: { sku_id: skuId, enabled: after.enabled },
    });

    return { sku_id: skuId, enabled: after.enabled };
  }
}
