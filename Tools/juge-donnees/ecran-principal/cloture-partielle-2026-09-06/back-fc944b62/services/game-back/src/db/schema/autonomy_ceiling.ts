// IMPLEMENTS: docs/superpowers/specs/2026-06-10-phase-19-autonomy-ceiling-backend-design.md §3.1 -- Phase-19 L1a --
import { pgTable, uuid, text, integer, bigint, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { lieutenant } from './lieutenant';

export const autonomyCeilingState = pgTable('autonomy_ceiling_state', {
  lieutenant_id:     uuid('lieutenant_id').primaryKey().references(() => lieutenant.lieutenant_id, { onDelete: 'cascade' }),
  archetype_key:     text('archetype_key').notNull(),
  budget:            jsonb('budget').notNull().default(sql`'{}'::jsonb`),
  cycle_id:          integer('cycle_id').notNull().default(0),
  last_refresh_tick: bigint('last_refresh_tick', { mode: 'number' }),
  last_decision_ref: uuid('last_decision_ref'),
  created_at:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:        timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const autonomyCeilingStateRelations = relations(autonomyCeilingState, ({ one }) => ({
  lieutenant: one(lieutenant, { fields: [autonomyCeilingState.lieutenant_id], references: [lieutenant.lieutenant_id] }),
}));

export type AutonomyCeilingStateRow    = typeof autonomyCeilingState.$inferSelect;
export type AutonomyCeilingStateInsert = typeof autonomyCeilingState.$inferInsert;
