// IMPLEMENTS: docs/tech/09_data_model/schema_city_sim_clock.md§2 -- session:2026-06-02 --
import { pgTable, uuid, bigint, timestamp } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { player } from './player'; // convention canonique FK player_id REUSE schema_player §5.1

// ===== Table : city_sim_clock — 1 row PAR SAVE (PK = player_id seul) =====
// Singleton per-player de l'horloge in-game. Avancée par CitySimSchedulerService (chunk frère T1).
// PK = player_id SEUL → contrainte structurelle "au plus 1 row par save" (vrai singleton honnête).
// NE PORTE AUCUN état City agrégé : ce n'est PAS la "table parent City" rejetée par
// schema_city_state §1 — uniquement l'horloge + la comptabilité du tick (table d'infra simulation).
export const citySimClock = pgTable('city_sim_clock', {
  player_id: uuid('player_id')
    .primaryKey()
    .references(() => player.player_id, { onDelete: 'cascade' }), // PK = player_id seul → 1 row/save
  game_minute: bigint('game_minute', { mode: 'number' }).notNull().default(0), // minutes in-game écoulées depuis le début du save (monotone) — CHECK >= 0 §3
  last_real_tick_at: timestamp('last_real_tick_at', { withTimezone: true }), // horodatage réel du dernier tick traité (null avant 1er tick)
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`), // création de l'horloge (= début du save)
});

export const citySimClockRelations = relations(citySimClock, ({ one }) => ({
  player: one(player, {
    fields: [citySimClock.player_id],
    references: [player.player_id],
  }),
}));

// ===== Types inférés Drizzle =====
export type CitySimClockRow = typeof citySimClock.$inferSelect;
export type CitySimClockInsert = typeof citySimClock.$inferInsert;
