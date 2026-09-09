// IMPLEMENTS: docs/superpowers/specs/2026-08-13-w1.3-monetization-design.md §3-C1 (A1 option (C) —
//             the 9 SKU DEFINITIONS live in code (iap-sku-catalogue.ts), this table carries ONLY the
//             per-SKU runtime override: enabled/disabled without a deploy. Mirrors
//             `template_library.ts`'s split (definitions in code, instances/overrides in a table)).
//             R9.3 backport: docs/tech/09_data_model/schema_iap_monetization.md §1 (same commit).
// -- W1.3-C1 -- 2026-08-13 --
//
// `iap_sku_override` — one row per SKU that has EVER been toggled by BO (`PATCH
// /admin/iap/skus/:sku_id`, iap-catalogue-admin.controller.ts). A SKU absent from this table is
// `enabled` by its column DEFAULT (`true`) — the catalogue service (iap-catalogue.service.ts) treats
// "no row" and "row with enabled=true" identically. `sku_id` is NOT a foreign key to a `iap_sku`
// table (there is none — the 9 definitions are a closed, code-owned set asserted at boot,
// iap-sku-catalogue.ts) — this table only ever carries the RUNTIME toggle, never the definition.

import { pgTable, varchar, boolean, uuid, timestamp } from 'drizzle-orm/pg-core';

export const iapSkuOverride = pgTable('iap_sku_override', {
  // Matches the code-owned IapSku.sku_id (iap-sku-catalogue.ts) — varchar(64), same convention as
  // iap_transactions.sku (player_economy_state.ts:76) since both key the SAME closed SKU set.
  sku_id: varchar('sku_id', { length: 64 }).primaryKey(),

  // No override row ⇒ enabled (the column DEFAULT IS the "never toggled" state — the catalogue
  // service never needs a separate LEFT JOIN null-check to reach the correct default).
  enabled: boolean('enabled').notNull().default(true),

  // Soft-ref to the acting StaffAccount.account_id (mirrors admin_audit_log.admin_user_id — no FK
  // day-1, sessions_and_audit.ts:39-40 same convention). Null until the first toggle.
  updated_by: uuid('updated_by'),

  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type IapSkuOverrideRow = typeof iapSkuOverride.$inferSelect;
export type IapSkuOverrideInsert = typeof iapSkuOverride.$inferInsert;
