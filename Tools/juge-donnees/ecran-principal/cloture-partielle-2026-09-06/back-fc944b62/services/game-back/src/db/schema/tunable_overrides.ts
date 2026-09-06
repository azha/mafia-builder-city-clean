// IMPLEMENTS: docs/superpowers/specs/2026-06-10-phase-23-tunables-registry-design.md §4-T1 -- Phase-23 --
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const tunableOverrides = pgTable('tunable_overrides', {
  key:          text('key').primaryKey(),
  value:        text('value').notNull(),
  updated_at:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updated_by:   text('updated_by'),
  approval_ref: uuid('approval_ref'),
});

export type TunableOverrideRow    = typeof tunableOverrides.$inferSelect;
export type TunableOverrideInsert = typeof tunableOverrides.$inferInsert;
