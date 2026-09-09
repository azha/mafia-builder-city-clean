// IMPLEMENTS: docs/superpowers/specs/2026-06-10-phase-22-signal-drift-backend-design.md §3.1 -- Phase-22 L2a --
import { pgTable, uuid, text, bigint, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { lieutenant } from './lieutenant';

export const signalDriftState = pgTable('signal_drift_state', {
  lieutenant_id:       uuid('lieutenant_id').primaryKey().references(() => lieutenant.lieutenant_id, { onDelete: 'cascade' }),
  archetype_key:       text('archetype_key').notNull(),
  registry:            jsonb('registry').notNull().default(sql`'{}'::jsonb`),
  drift_phase:         text('drift_phase').notNull().default('DIRECT_ALIGNED'),
  dominant_cue_kind:   text('dominant_cue_kind').notNull().default('DIRECT_ORDER'),
  window_start_tick:   bigint('window_start_tick', { mode: 'number' }).notNull(), // W1.1-d C1.2 — plus de `.default(0)` TS-side (ANCRE ABSOLUE) : `signal-drift.repository.ts#insertState` posait déjà l'ancre explicitement au tick de seed (zéro changement de comportement). DDL SQL garde `DEFAULT 0`.
  last_update_tick:    bigint('last_update_tick', { mode: 'number' }),
  last_decision_ticks: jsonb('last_decision_ticks'),
  created_at:          timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:          timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const signalDriftStateRelations = relations(signalDriftState, ({ one }) => ({
  lieutenant: one(lieutenant, { fields: [signalDriftState.lieutenant_id], references: [lieutenant.lieutenant_id] }),
}));

export type SignalDriftStateRow    = typeof signalDriftState.$inferSelect;
export type SignalDriftStateInsert = typeof signalDriftState.$inferInsert;
