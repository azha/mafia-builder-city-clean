// IMPLEMENTS: TD-012 (lot-5 L5-T6l) — FalseReportLedger Drizzle mirror.
//             Canon: docs/tech/02_fictional_world/law_mis.md §Data model §Entité FalseReportLedger.
//             R9.3: matches 0036_false_report_ledger.sql byte-for-byte. Backported to
//             projects/mafia_city_game/gdd/09_data_model.md §City state in the SAME commit.
//             -- session:2026-06-14 (TD-012 lot-5 L5-T6l) --
import { pgTable, uuid, integer, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { player } from './player'; // Task 3 — root (FK convention player_id REUSE §5.1)
import { building } from './city_state'; // TD-481 (mig 0151) — la FK du référent honnête

/** The closed entry-type domain for a FalseReportEntry (law_mis §Entité FalseReportEntry). */
export type FalseReportEntryType = 'FALSE_REPORT' | 'GENUINE_REPORT';

// ===== Table 1 : false_report_ledger =====
// One row per FalseReportEntry — the per-player history of filed reports (false or genuine).
// PK: report_id (uuid). FK: player_id → "player" ON DELETE CASCADE.
export const falseReportLedger = pgTable(
  'false_report_ledger',
  {
    report_id:          uuid('report_id').primaryKey().defaultRandom(),
    player_id:          uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),
    // TD-481 (mig 0151) — LEGACY, nullable, ne plus écrire : un proxy ENTIER hérité du domaine
    // inspection, dont les ids sont SYNTHÉTISÉS par hash et ne référencent aucune table.
    target_building_id: integer('target_building_id'),
    // TD-481 (mig 0151) — le référent HONNÊTE : le bâtiment réel du joueur, avec sa FK.
    // ⚠️ Enregistrer un bâtiment réel ne REBRANCHE rien : la file d'inspection et le tirage de
    // résultat ne savent traiter que des proxies entiers, et le couplage à l'état réel du bâtiment
    // est le lot System 7. Un rapport reste donc inerte en aval — c'est écrit ici parce que le type
    // a désormais l'air juste, et que c'est exactement là qu'un lecteur croira la chaîne branchée.
    target_building_uuid: uuid('target_building_uuid').references(() => building.building_id, { onDelete: 'set null' }),
    entry_type:         text('entry_type').notNull(), // 'FALSE_REPORT' | 'GENUINE_REPORT' — CHECK in migration
    submitted_at:       timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
    verified_false_at:  timestamp('verified_false_at', { withTimezone: true }),
    source_confirmed:   boolean('source_confirmed').notNull().default(false),
    created_at:         timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('frl_player_submitted_idx').on(t.player_id, t.submitted_at),
  ],
);

export const falseReportLedgerRelations = relations(falseReportLedger, ({ one }) => ({
  player: one(player, { fields: [falseReportLedger.player_id], references: [player.player_id] }),
}));

export type FalseReportLedgerRow    = typeof falseReportLedger.$inferSelect;
export type FalseReportLedgerInsert = typeof falseReportLedger.$inferInsert;

// ===== Table 2 : false_report_ledger_summary =====
// One row per player — the runtime backlash state (1-1 CHILD of player, PK = player_id).
// Lazily seeded on first FILE action (INSERT … ON CONFLICT DO NOTHING then UPDATE).
export const falseReportLedgerSummary = pgTable('false_report_ledger_summary', {
  player_id:               uuid('player_id').primaryKey().references(() => player.player_id, { onDelete: 'cascade' }),
  backlash_penalty_active: boolean('backlash_penalty_active').notNull().default(false),
  backlash_remaining_count: integer('backlash_remaining_count').notNull().default(0),
  window_false_count:      integer('window_false_count').notNull().default(0),
  window_genuine_count:    integer('window_genuine_count').notNull().default(0),
  updated_at:              timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const falseReportLedgerSummaryRelations = relations(falseReportLedgerSummary, ({ one }) => ({
  player: one(player, { fields: [falseReportLedgerSummary.player_id], references: [player.player_id] }),
}));

export type FalseReportLedgerSummaryRow    = typeof falseReportLedgerSummary.$inferSelect;
export type FalseReportLedgerSummaryInsert = typeof falseReportLedgerSummary.$inferInsert;
