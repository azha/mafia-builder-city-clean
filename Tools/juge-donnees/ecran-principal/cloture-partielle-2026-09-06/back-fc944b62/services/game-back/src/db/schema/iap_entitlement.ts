// IMPLEMENTS: docs/tech/09_data_model/schema_iap_monetization.md §3 (iap_entitlement) + design
//             §3-C3 ("PK composite (player_id, sku_id) ⇒ la ré-acquisition est impossible PAR
//             CONTRAINTE, pas par un `if`").
// -- W1.3-C3 -- 2026-08-13 --
//
// `iap_entitlement` — which COSMETIC/SAVE_SLOT SKUs a player owns, purchased with Marks (`POST
// /v1/me/iap/items/purchase`, C3). MARKS_PACK/SUPPORT SKUs (real-money, C4) NEVER write a row here
// — they credit `economy_states.marks` only.

import { pgTable, uuid, varchar, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { player } from './player';
import { iapTransaction } from './player_economy_state';

export const iapEntitlement = pgTable(
  'iap_entitlement',
  {
    // 1-N tightly-coupled entity (schema_player.md §5.2) — CASCADE, same category as marks_ledger.
    player_id: uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),

    // NOT a foreign key — same closed code-owned SKU set as iap_sku_override.sku_id.
    sku_id: varchar('sku_id', { length: 64 }).notNull(),

    granted_at: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),

    // Reserved for a future direct-grant-via-real-money-purchase path — NEVER written by this
    // lot's 6 chunks (Marks-denominated purchases have no iap_transactions row). Stays NULL.
    source_txn_id: uuid('source_txn_id').references(() => iapTransaction.txn_id, { onDelete: 'set null' }),
  },
  (table) => ({
    // Re-acquisition is impossible BY CONSTRAINT (design §3-C3), never an `if` in the service.
    pk: primaryKey({ columns: [table.player_id, table.sku_id] }),
  }),
);

export const iapEntitlementRelations = relations(iapEntitlement, ({ one }) => ({
  player: one(player, { fields: [iapEntitlement.player_id], references: [player.player_id] }),
}));

export type IapEntitlementRow = typeof iapEntitlement.$inferSelect;
export type IapEntitlementInsert = typeof iapEntitlement.$inferInsert;
