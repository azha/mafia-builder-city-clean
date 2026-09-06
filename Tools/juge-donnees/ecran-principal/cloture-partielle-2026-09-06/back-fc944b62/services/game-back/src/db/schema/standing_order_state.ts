// IMPLEMENTS: docs/superpowers/specs/2026-06-11-phase-25-standing-order-expiry-design.md §3.1 -- Phase-25 L3 --
import { pgTable, uuid, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { lieutenant } from './lieutenant';

export const standingOrderState = pgTable('standing_order_state', {
  lieutenant_id:       uuid('lieutenant_id').primaryKey().references(() => lieutenant.lieutenant_id, { onDelete: 'cascade' }),
  pattern:             jsonb('pattern').notNull().default(sql`'{}'::jsonb`),
  last_decision_ticks: jsonb('last_decision_ticks'),
  created_at:          timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:          timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const standingOrderStateRelations = relations(standingOrderState, ({ one }) => ({
  lieutenant: one(lieutenant, { fields: [standingOrderState.lieutenant_id], references: [lieutenant.lieutenant_id] }),
}));

export type StandingOrderStateRow    = typeof standingOrderState.$inferSelect;
export type StandingOrderStateInsert = typeof standingOrderState.$inferInsert;
