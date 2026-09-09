// IMPLEMENTS: docs/tech/09_data_model/schema_player.md§2 -- session:2026-06-02 --
//             04d-C C1b — additive nullable player.region_id FK region(region_id) (mig 0102)
import { pgTable, uuid, varchar, timestamp, integer, boolean, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// Forward-refs Tasks 4-12 (commentés à ce stade — câblés au fur et à mesure des tasks aval).
// Les imports actuels sont commentés ; `relations()` ci-dessous référence des cibles `<entity>` qui seront
// déclarées dans leurs chunks dédiés (calque chunk 2 §4 — déclaration symétrique côté enfant).
// import { playerProgressionState } from './player_progression_state'; // Task 4
// import { playerEconomyState }     from './player_economy_state';     // Task 5
// import { lieutenant }             from './lieutenant';               // Task 6
// import { sessionRow }             from './sessions_and_audit';       // Task 12
// REUSE FK auth : la table `account` est posée par `17_auth_and_accounts` (cf. §1 REUSE) ;
// la déclaration TS sera importée du module `src/db/schema/account.ts` (hors périmètre 09 — owned par 17).

export const player = pgTable(
  'player',
  {
    // PK canonique `player_id` (cf. §1 + §5 convention canonique posée par ce chunk).
    // UUIDv7 généré côté Postgres (PG18 natif `uuidv7()` ; PG16/17 → fonction `uuid_generate_v7()` fournie par
    // extension `pg_uuidv7` cf. §7 migrations + §11 Docker). Le `defaultRandom()` Drizzle (UUIDv4) est
    // SURCHARGÉ par `default(sql\`uuidv7()\`)` pour obtenir l'ordering temporel + insertabilité B-tree
    // (REUSE socle `18_api_protocol/pagination_and_streaming.md §Tie-breaker` — décision déférée à 09).
    player_id: uuid('player_id').primaryKey().default(sql`uuidv7()`),

    // FK auth — account_id immuable, REUSE 17_auth_and_accounts (cf. §1 + identity_model R-IM-1 + R-IM-2).
    // La FK SQL `REFERENCES account(account_id)` est rendue ci-dessous via `.references()` (cf. §3 DDL).
    // NB : `account` est owned par chapitre 17 — l'import TS sera ajouté quand `src/db/schema/account.ts` existera.
    // À ce stade : la colonne est typée + indexée, et la contrainte FK est posée verbatim dans la migration §7
    // (sans `.references()` Drizzle pour éviter l'import circulaire forward — pattern accepté chunk 2 §4 note).
    account_id: uuid('account_id').notNull(),

    // Colonnes GDD L46-55 (verbatim) — `PlayerProfile` folded inline (cf. §1 décision modélisation).
    callsign:           varchar('callsign', { length: 24 }),                                  // GDD L47 : varchar(24) unique
    email:              varchar('email', { length: 255 }),                                   // GDD L48 : varchar(255) unique
    created_at:         timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),// GDD L49
    last_seen_at:       timestamp('last_seen_at', { withTimezone: true }),                    // GDD L50 (nullable — jamais connecté = NULL)
    region:             varchar('region', { length: 8 }),                                     // GDD L51
    locale:             varchar('locale', { length: 8 }),                                     // GDD L52 (driver F1 cf. i18n note GDD L59)
    // 04d-C C1b (mig 0102, R9.3 backport schema_player.md§2) — ADDITIVE NULLABLE:
    // Real-world geo-region derived by RegionService.assignRegionFromIp (decision #1, RGPD derive-then-discard).
    // Nullable: pre-C1b players stay NULL until their next login/action (lazy backfill via 'unknown' fallback).
    // FK → region(region_id) — enforced at the SQL level (see mig 0102); NOT declared via .references() here
    // to avoid circular import (region.ts is not yet imported in the task ordering). The SQL FK is in mig 0102.
    // R2.2: region_id is a routing key (non-sensitive); NOT a hidden scalar.
    region_id:          varchar('region_id', { length: 16 }),                                 // 04d-C C1b: nullable FK region(region_id)
    // 04d-C C8 (mig 0105, R9.3 backport schema_player.md§2) — ADDITIVE NULLABLE:
    // Per-player meta-market signal visibility toggle.
    //   NULL  = use tunable default (meta_market.default_visibility, effective ON).
    //   TRUE  = player explicitly opted in.
    //   FALSE = player explicitly opted out (privacy wall: getSignalWithVisibility returns 'insufficient_signal').
    // R2.2: NOT a hidden scalar — this is a preference setting that the player controls.
    meta_market_visibility_enabled: boolean('meta_market_visibility_enabled'),                // 04d-C C8: nullable, NULL=use tunable default
    tier:               integer('tier').notNull().default(1),                                 // GDD L53 : Pressure Inverse tier (1..4)
    active_branches:    integer('active_branches').notNull().default(1),                      // GDD L54
    save_state_version: integer('save_state_version').notNull().default(1),                   // GDD L55
  },
  (table) => ({
    // Indexes locaux (cf. §6).
    callsign_uq: uniqueIndex('player_callsign_uq').on(table.callsign),
    email_uq:    uniqueIndex('player_email_uq').on(table.email),
    account_uq:  uniqueIndex('player_account_id_uq').on(table.account_id),  // 1-1 strict Player ↔ Account
    last_seen_at_idx: index('player_last_seen_at_idx').on(table.last_seen_at),
    callsign_search_idx: index('player_callsign_search_idx').on(table.callsign),
  }),
);

// Relations 1-1 et 1-N sortantes vers les schemas enfants (Tasks 4-12). Calque chunk 2 §4.1 + §4.2.
// Le typage côté enfant est déclaré dans chaque chunk enfant (calque chunk 2 §4 DRY).
export const playerRelations = relations(player, ({ one, many }) => ({
  // 1-1 — cf. chunk 2 §4.1 (PK enfant EST la FK vers Player, garantie 1-ligne-par-player).
  // progression: one(playerProgressionState),  // Task 4 — forward-ref, câblage au merge Task 4
  // economy:     one(playerEconomyState),      // Task 5 — forward-ref, câblage au merge Task 5

  // 1-N — cf. chunk 2 §4.2 (FK NOT NULL côté enfant, `many()` côté Player sans `fields`/`references`).
  // lieutenants: many(lieutenant),             // Task 6 — forward-ref
  // sessions:    many(sessionRow),             // Task 12 — forward-ref
  // exceptions:  many(/* exceptionRow Task 9 */),
  // milestones:  many(/* progressionStructuralRow Task 10 */),
}));

// Type inféré Drizzle — REUSE par PlayerRepository (§11) et par les BO admin services (§9).
export type PlayerRow = typeof player.$inferSelect;
export type PlayerInsert = typeof player.$inferInsert;
