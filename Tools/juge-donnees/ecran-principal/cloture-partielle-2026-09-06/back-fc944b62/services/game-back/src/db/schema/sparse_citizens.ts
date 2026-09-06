// IMPLEMENTS: docs/tech/09_data_model/schema_sparse_citizens.md§2 -- session:2026-06-02 --
import {
  pgTable,
  uuid,
  integer,
  jsonb,
  boolean,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { player } from './player';         // Task 3 — convention canonique FK player_id REUSE §5.1

// ===== Enum PG natif =====
// citizen_demographic — GDD L388 verbatim enum 5 membres lowercase
// (DDL-side ; le narratif 02/15 utilise UPPERCASE SCREAMING_SNAKE cohort names
//  `ROUTINE_WORKER | SPIKE_USER | CONNECTOR | WHISPER | GLASS_CLIENT` — distinction §10)
export const citizenDemographic = pgEnum('citizen_demographic', [
  'routine',
  'spike',
  'connector',
  'whisper',
  'glass_client',
]);

// ===== Table 1 : rich_citizens — GDD L383-394 verbatim =====
// PK simple citizen_id uuid. FK player_id NOT NULL CASCADE (Task 3 §5.2 ligne 384 catégorie « SparseCitizens »).
// loyalty_dealer_id soft-ref uuid (nullable, pas de FK DB-side — gap §16 promotion Task 14+).
// home/work/leisure_block_id soft-ref int (pas de FK Task 7 blocks — calque buildings.block_id integer).
// schedule_template_id soft-ref int (pas de FK 32-template catalogue — gap §16).
// biography jsonb lazily loaded (column-list explicit côté repository).
export const richCitizenRow = pgTable(
  'rich_citizens',
  {
    citizen_id:           uuid('citizen_id').primaryKey().defaultRandom(),                                                       // GDD L384 — uuid primary key
    player_id:            uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),                // GDD L384 + override NOT NULL — CASCADE Task 3 §5.2 ligne 384
    home_block_id:        integer('home_block_id').notNull(),                                                                    // GDD L385 + override NOT NULL — int raw catalogue blocks (soft-ref Task 7)
    work_block_id:        integer('work_block_id').notNull(),                                                                    // GDD L386 + override NOT NULL — int raw catalogue blocks (soft-ref Task 7)
    leisure_block_id:     integer('leisure_block_id').notNull(),                                                                 // GDD L387 + override NOT NULL — int raw catalogue blocks (soft-ref Task 7)
    demographic:          citizenDemographic('demographic').notNull(),                                                            // GDD L388 verbatim enum 5 membres lowercase
    schedule_template_id: integer('schedule_template_id').notNull(),                                                              // GDD L389 + override NOT NULL — int raw catalogue 32-template (soft-ref gap §16)
    loyalty_dealer_id:    uuid('loyalty_dealer_id'),                                                                              // GDD L390 verbatim « uuid null » — soft-ref dealer NPC (REUSE 04a §688, gap §16)
    satisfaction:         integer('satisfaction').notNull().default(50),                                                          // GDD L391 verbatim `int default 50` ; CHECK [0..100] §3
    whisper_pressure:     integer('whisper_pressure').notNull().default(0),                                                       // GDD L392 verbatim `int default 0` ; CHECK [0..100] §3 ; BO-only strict P5 (REUSE 04 §Invariant 4)
    biography:            jsonb('biography').notNull().default(sql`'{}'::jsonb`),                                                  // GDD L393 verbatim « lazily loaded » ; column-list explicit repository
    alive:                boolean('alive').notNull().default(true),                                                                // GDD L394 verbatim `bool default true`
  },
  (table) => ({
    player_idx:                 index('rich_citizens_player_idx').on(table.player_id),
    player_alive_idx:           index('rich_citizens_player_alive_idx').on(table.player_id, table.alive),                          // hot path : actifs vs archivés
    player_demographic_idx:     index('rich_citizens_player_demographic_idx').on(table.player_id, table.demographic),               // aggregate per demographic (Vue-BO dashboard)
    player_loyalty_dealer_idx:  index('rich_citizens_player_loyalty_dealer_idx').on(table.player_id, table.loyalty_dealer_id),     // hot path : citizens loyal à dealer X
    player_home_block_idx:      index('rich_citizens_player_home_block_idx').on(table.player_id, table.home_block_id),             // hot path : citizens d'un block
    // Partial index — citizens ACTIVE WhisperBucket (whisper_pressure ≥ T.city.whisper_activation_threshold=70 REUSE 04)
    // ⚠️ seuil hardcoded ICI = 70 (= default REUSE 04) car PG index partial WHERE n'accepte que littéraux ; si le tunable bouge,
    // re-créer l'index via migration suivante (PALIMPSEST §7.2). Documenté §6.
    // NB : colonne via le param `table` (et non le `const richCitizenRow`) pour éviter la self-réf circulaire TS7022 ; SQL identique.
    whisper_active_partial_idx: index('rich_citizens_whisper_active_partial_idx').on(table.player_id, table.whisper_pressure).where(sql`${table.whisper_pressure} >= 70`),
  }),
);

export const richCitizenRelations = relations(richCitizenRow, ({ one }) => ({
  player: one(player, {
    fields: [richCitizenRow.player_id],
    references: [player.player_id],
  }),
}));

// ===== Types inférés Drizzle =====
// Note : seul le `$inferSelect` Row type est exporté (alignement Tasks 9/10 § Glossaire NEW —
// les variantes `*Insert` ne sont pas exposées au glossaire pour éviter le bruit ; les
// services persistance §11 acceptent des `Partial<…Row>` typés localement.)
export type RichCitizenRow = typeof richCitizenRow.$inferSelect;

// ===== Enum TS mirror PG natif =====
export type CitizenDemographicEnumTs = (typeof citizenDemographic.enumValues)[number];
// 'routine' | 'spike' | 'connector' | 'whisper' | 'glass_client'
