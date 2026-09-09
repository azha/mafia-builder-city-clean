// IMPLEMENTS: docs/tech/10_economy_monetization/iap_catalogue.md §2.1 (the 9 launch-set SKUs,
//             verbatim table) + §2.2 (Marks content + tier bonus per pack) + §6 (T.econ.iap.* /
//             T.econ.marks.save_slot_price / T.ui.iap.cost_* — R2.3, resolved live, never memoized)
//             Design: docs/superpowers/specs/2026-08-13-w1.3-monetization-design.md §5-A1 (option
//             (C) — definitions code-owned, boot-asserted) + §1.9 (B2 — which tunable enforces which
//             price, per SKU, table verbatim below) + §2.2 (9 SKUs is CANON, not an arbitrage).
// -- W1.3-C1 -- 2026-08-13 --
//
// The 9-SKU launch catalogue (`iap_catalogue.md §2.1`) — CODE-OWNED (A1 option (C): 9/9 other
// catalogues in this codebase are TypeScript modules with zero pgTable; only the BO
// enabled/disabled toggle is persisted, `db/schema/iap_catalogue.ts`). Prices are functions, not
// literals — every marks price/content resolves LIVE through `iapTunables` (iap.tunables.ts) so a
// BO tunable edit takes effect without a redeploy (R2.3), EXCEPT `save_slot_3`'s `price_marks`
// which the canon itself defines as the catalogue row's own field, not a tunable
// (`iap_catalogue.md §6`, `T.econ.marks.save_slot_3_price` explicitly does not exist).

import { iapTunables } from './iap.tunables';

export type SkuKindEnum = 'MARKS_PACK' | 'COSMETIC' | 'SAVE_SLOT' | 'SUPPORT';

export interface IapSku {
  readonly sku_id: string;
  readonly display_name: string;
  readonly kind: SkuKindEnum;
  /** Real-money SKUs only (MARKS_PACK/SUPPORT) — a store product identity, NOT a numeric knob R2.3
   *  governs (the real price is store-side, `iap_catalogue.md §1` hors périmètre). */
  readonly price_store_product_id?: string;
  /** Marks price, resolved LIVE — COSMETIC/SAVE_SLOT only. Enforcement source per §1.9/B2 (table
   *  below); never called for a MARKS_PACK/SUPPORT entry (mutually exclusive with
   *  price_store_product_id — asserted at boot, iap-catalogue.service.ts). */
  readonly resolveMarksPrice?: () => number;
  /** Marks GRANTED on a successful real-money purchase — MARKS_PACK/SUPPORT only. Resolved LIVE.
   *  §2.2 verbatim-checked against the canon Marks-per-dollar column (600/$4.99≈120, 1400/$9.99≈
   *  140, 3500/$19.99≈175 — EXACT matches with NO further multiplication): the `T.econ.iap.
   *  marks_pack_*_marks` tunable IS the final grant. `tier_bonus_pct_*` is a SEPARATE, display-only
   *  figure (`resolveBonusPctForDisplay` below) — applying it a second time here would over-credit. */
  readonly resolveMarksGranted?: () => number;
  /** DISPLAY-ONLY tier-bonus percentage (MARKS_PACK med/large/xl — the base pack and support_pack
   *  have none, §2.2). Gives `T.econ.iap.tier_bonus_pct_*` a real consumer (the catalogue GET
   *  response) WITHOUT feeding the credited-amount math (design §1.9's "used_by: IapController
   *  (calcul Marks-par-dollar croissant)" is read as the DISPLAYED ratio, not a runtime multiplier
   *  — the canon's own $/Marks table proves the tunable is already the final number). */
  readonly resolveBonusPctForDisplay?: () => number;
}

/**
 * The 9 launch-set SKUs (`iap_catalogue.md §2.1`, verbatim order: 4 Marks packs / 2 cosmetics / 2
 * save slots / 1 support pack). The 2 post-launch cosmetics the 08c mockup anticipates
 * (`cosm_dashboard_theme_2_river`, a custom callsign font) are NOT here — design §0.0/§2.2: the
 * canon reconciles this explicitly as "launch set day-1, screen anticipates extensibility via 12
 * add-SKU" — adding them is a FUTURE deploy, not a bug in this array.
 */
export const IAP_SKU_CATALOGUE: readonly IapSku[] = [
  {
    sku_id: 'marks_pack_small',
    display_name: 'Pack — 100 Marks',
    kind: 'MARKS_PACK',
    price_store_product_id: 'marks_pack_small',
    resolveMarksGranted: () => iapTunables.marksPackSmallMarks, // no tier bonus (base pack, §2.2).
  },
  {
    sku_id: 'marks_pack_med',
    display_name: 'Pack — 600 Marks',
    kind: 'MARKS_PACK',
    price_store_product_id: 'marks_pack_med',
    resolveMarksGranted: () => iapTunables.marksPackMedMarks, // 600/$4.99≈120/$, matches §2.2 exactly.
    resolveBonusPctForDisplay: () => iapTunables.tierBonusPctMed,
  },
  {
    sku_id: 'marks_pack_large',
    display_name: 'Pack — 1400 Marks',
    kind: 'MARKS_PACK',
    price_store_product_id: 'marks_pack_large',
    resolveMarksGranted: () => iapTunables.marksPackLargeMarks, // 1400/$9.99≈140/$, matches §2.2.
    resolveBonusPctForDisplay: () => iapTunables.tierBonusPctLarge,
  },
  {
    sku_id: 'marks_pack_xl',
    display_name: 'Pack — 3500 Marks',
    kind: 'MARKS_PACK',
    price_store_product_id: 'marks_pack_xl',
    resolveMarksGranted: () => iapTunables.marksPackXlMarks, // 3500/$19.99≈175/$, matches §2.2.
    resolveBonusPctForDisplay: () => iapTunables.tierBonusPctXl,
  },
  {
    sku_id: 'cosm_callsign_color',
    display_name: 'Callsign Color Pack',
    kind: 'COSMETIC',
    resolveMarksPrice: () => iapTunables.costCallsignColorMarks,
  },
  {
    sku_id: 'cosm_dashboard_theme_1',
    display_name: 'Theme: Sodium Night',
    kind: 'COSMETIC',
    resolveMarksPrice: () => iapTunables.costThemeSodiumMarks,
  },
  {
    sku_id: 'save_slot_2',
    display_name: 'Extra Save Slot',
    kind: 'SAVE_SLOT',
    // §1.9/B2: T.econ.marks.save_slot_price is the ENFORCEMENT source (iap_catalogue.md:280 —
    // "prevails at runtime"); the UI-mirror tunable T.ui.profile.save_slot_2_cost_marks is a
    // DISPLAY-ONLY duplicate this server never reads (out of scope, W3.U10).
    resolveMarksPrice: () => iapTunables.saveSlotPrice,
  },
  {
    sku_id: 'save_slot_3',
    display_name: 'Third Save Slot',
    kind: 'SAVE_SLOT',
    // §1.9/B2: NOT a tunable — "le prix EST le contenu de la ligne de catalogue"
    // (iap_catalogue.md §6). 200 here is the catalogue's OWN definition, not a debit-path literal
    // R2.3 would otherwise forbid — this IS the canonical source, not a duplicate of one.
    resolveMarksPrice: () => 200,
  },
  {
    sku_id: 'support_pack',
    display_name: 'Studio Support Pack',
    kind: 'SUPPORT',
    price_store_product_id: 'support_pack',
    resolveMarksGranted: () => iapTunables.supportPackMarks, // no tier bonus (flat grant, §2.2).
  },
];

/** Look up a catalogue entry by id — undefined for an unknown/retired sku_id. */
export function findIapSku(skuId: string): IapSku | undefined {
  return IAP_SKU_CATALOGUE.find((s) => s.sku_id === skuId);
}
