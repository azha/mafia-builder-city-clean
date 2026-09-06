// IMPLEMENTS: docs/superpowers/specs/2026-08-13-w1.3-monetization-design.md §3-C1 (the boot
//             assertion contract — precedent `template_library.service.ts:11-12`, "each assertion
//             failure THROWS — the process never serves with a broken library") + F-C1 (the catalogue
//             GET's exact shape: 9 entries, price_marks for the 4 marks-priced SKUs, a disabled SKU
//             is ABSENT from the list, not flagged).
// -- W1.3-C1 -- 2026-08-13 --
// -- FIX (review ⊥ I3, 2026-08-13) -- the boot assertion checked `price_store_product_id` XOR
//    `resolveMarksPrice` but never `resolveMarksGranted` — the field `iap-purchase-validate.
//    service.ts` reads with a non-null assertion (`sku.resolveMarksGranted!()`) on every
//    real-money credit. A MARKS_PACK/SUPPORT entry added with a `price_store_product_id` but no
//    `resolveMarksGranted` would have PASSED boot and then thrown a `TypeError` (500) on its
//    first real receipt. Added: every real-money SKU must have `resolveMarksGranted`; every
//    non-real-money SKU must NOT (mirrors the existing price-field check exactly).

import { Injectable, OnApplicationBootstrap } from '@nestjs/common';

import { IAP_SKU_CATALOGUE, type SkuKindEnum } from './iap-sku-catalogue';
import { IapSkuOverrideRepository } from './iap-sku-override.repository';

const EXPECTED_SKU_IDS = [
  'cosm_callsign_color',
  'cosm_dashboard_theme_1',
  'marks_pack_large',
  'marks_pack_med',
  'marks_pack_small',
  'marks_pack_xl',
  'save_slot_2',
  'save_slot_3',
  'support_pack',
].sort();

const VALID_KINDS: ReadonlySet<SkuKindEnum> = new Set(['MARKS_PACK', 'COSMETIC', 'SAVE_SLOT', 'SUPPORT']);
const REAL_MONEY_KINDS: ReadonlySet<SkuKindEnum> = new Set(['MARKS_PACK', 'SUPPORT']);

/** The JSON-safe view `GET /v1/iap/catalogue` returns for one enabled SKU. */
export interface IapCatalogueEntryView {
  sku_id: string;
  display_name: string;
  kind: SkuKindEnum;
  price_store_product_id?: string;
  price_marks?: number;
  marks_granted?: number;
  /** DISPLAY-ONLY (§2.2) — med/large/xl packs only, the base pack and support_pack have none. */
  bonus_pct?: number;
}

@Injectable()
export class IapCatalogueService implements OnApplicationBootstrap {
  constructor(private readonly overrideRepo: IapSkuOverrideRepository) {}

  /**
   * Boot assertion (design §3-C1, precedent `template_library.service.ts:11-12`): the sorted set of
   * `sku_id` is EXACTLY the canon 9 (catches an added/removed/renamed SKU whose canon reference
   * wasn't updated in the SAME commit — design's own honest caveat: it does NOT catch a SKU added
   * WITH a matching assertion edit, only a drift). Every `kind` is a member of SkuKindEnum. Every
   * MARKS_PACK/SUPPORT has `price_store_product_id` XOR `resolveMarksPrice` is absent, and every
   * COSMETIC/SAVE_SLOT has the reverse — a real-money SKU must never also carry a Marks price (and
   * vice versa). Each failure THROWS — NestJS bootstrap fails, the process never serves a catalogue
   * that violates its own canon contract.
   */
  onApplicationBootstrap(): void {
    const ids = IAP_SKU_CATALOGUE.map((s) => s.sku_id).sort();
    if (ids.length !== EXPECTED_SKU_IDS.length || !ids.every((id, i) => id === EXPECTED_SKU_IDS[i])) {
      throw new Error(
        `IapCatalogueService boot assertion FAILED: sorted sku_id set ${JSON.stringify(ids)} !== canon ${JSON.stringify(EXPECTED_SKU_IDS)} (iap_catalogue.md §2.1).`,
      );
    }
    for (const sku of IAP_SKU_CATALOGUE) {
      if (!VALID_KINDS.has(sku.kind)) {
        throw new Error(`IapCatalogueService boot assertion FAILED: sku_id=${sku.sku_id} has unknown kind=${String(sku.kind)}.`);
      }
      const isRealMoney = REAL_MONEY_KINDS.has(sku.kind);
      const hasStoreProductId = sku.price_store_product_id !== undefined;
      const hasMarksPrice = sku.resolveMarksPrice !== undefined;
      const hasMarksGranted = sku.resolveMarksGranted !== undefined;
      if (isRealMoney && (!hasStoreProductId || hasMarksPrice)) {
        throw new Error(
          `IapCatalogueService boot assertion FAILED: sku_id=${sku.sku_id} (kind=${sku.kind}) must have price_store_product_id and NO resolveMarksPrice.`,
        );
      }
      if (!isRealMoney && (hasStoreProductId || !hasMarksPrice)) {
        throw new Error(
          `IapCatalogueService boot assertion FAILED: sku_id=${sku.sku_id} (kind=${sku.kind}) must have resolveMarksPrice and NO price_store_product_id.`,
        );
      }
      // review ⊥ I3 — resolveMarksGranted is read with `!` on the credit path
      // (iap-purchase-validate.service.ts); a real-money SKU missing it would 500 on first use.
      if (isRealMoney && !hasMarksGranted) {
        throw new Error(
          `IapCatalogueService boot assertion FAILED: sku_id=${sku.sku_id} (kind=${sku.kind}) must have resolveMarksGranted — it is read with '!' on the receipt-credit path.`,
        );
      }
      if (!isRealMoney && hasMarksGranted) {
        throw new Error(
          `IapCatalogueService boot assertion FAILED: sku_id=${sku.sku_id} (kind=${sku.kind}) must NOT have resolveMarksGranted — only real-money SKUs grant Marks on credit.`,
        );
      }
    }
  }

  /**
   * `GET /v1/iap/catalogue`'s data: every ENABLED SKU (no override row, or a row with
   * enabled=true), in canon order. A disabled SKU is FILTERED OUT entirely (design F-C1 — a
   * "value of a collection" absence, never a `disabled:true` flag left in the payload).
   */
  async listEnabled(): Promise<IapCatalogueEntryView[]> {
    const states = await this.overrideRepo.getAllEnabledStates();
    return IAP_SKU_CATALOGUE.filter((sku) => states.get(sku.sku_id) ?? true).map((sku) => ({
      sku_id: sku.sku_id,
      display_name: sku.display_name,
      kind: sku.kind,
      ...(sku.price_store_product_id !== undefined ? { price_store_product_id: sku.price_store_product_id } : {}),
      ...(sku.resolveMarksPrice ? { price_marks: sku.resolveMarksPrice() } : {}),
      ...(sku.resolveMarksGranted ? { marks_granted: sku.resolveMarksGranted() } : {}),
      ...(sku.resolveBonusPctForDisplay ? { bonus_pct: sku.resolveBonusPctForDisplay() } : {}),
    }));
  }
}
