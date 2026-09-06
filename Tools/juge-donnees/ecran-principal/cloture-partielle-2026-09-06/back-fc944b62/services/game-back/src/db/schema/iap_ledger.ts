// IMPLEMENTS: docs/tech/08c_remaining_screens/screen_c2_iap_shop.md:247 (MarksLedger shape —
//             `{ player_id, delta_marks, reason_sku, receipt_hash, ts }`) + design §3-C2 (the
//             invariant: "jamais de mutation de economy_states.marks sans entrée de ledger dans la
//             même transaction").
//             R9.3 backport: docs/tech/09_data_model/schema_iap_monetization.md §2 (same commit).
// -- W1.3-C2 -- 2026-08-13 --
//
// `marks_ledger` — the append-only invariant ledger backing `economy_states.marks`. Every mutation
// this lot introduces (welcome grant C2, item-purchase debit C3, receipt-validate credit C4, BO
// subvention C5, refund reversal C6) writes exactly ONE row here in the SAME transaction as the
// balance UPDATE — never a bare UPDATE (design §3-C6). `SUM(delta_marks) == economy_states.marks`
// is the cross-chunk invariant every falsifiable in this lot checks (F-C2 through F-C6).

import { pgTable, uuid, integer, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { player } from './player';

export const marksLedger = pgTable(
  'marks_ledger',
  {
    ledger_id: uuid('ledger_id').primaryKey().defaultRandom(),

    // 1-N tightly-coupled entity (schema_player.md §5.2) — the ledger has no meaning outside its
    // player, same category as PlayerProgressionState's own children.
    player_id: uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),

    // Signed — positive (grant/credit) or negative (debit/refund reversal).
    delta_marks: integer('delta_marks').notNull(),

    // The SKU (or a BO reason marker, C5) that drove this entry — same varchar(64) convention as
    // iap_transactions.sku (player_economy_state.ts:76).
    reason_sku: varchar('reason_sku', { length: 64 }).notNull(),

    // sha256 hex of a validated store receipt (C4 real-money credits only) — NULL for a
    // Marks-denominated debit / BO subvention / refund reversal.
    receipt_hash: text('receipt_hash'),

    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    player_id_idx: index('marks_ledger_player_id_idx').on(table.player_id),
  }),
);

export const marksLedgerRelations = relations(marksLedger, ({ one }) => ({
  player: one(player, { fields: [marksLedger.player_id], references: [player.player_id] }),
}));

export type MarksLedgerRow = typeof marksLedger.$inferSelect;
export type MarksLedgerInsert = typeof marksLedger.$inferInsert;
