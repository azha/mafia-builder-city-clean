// IMPLEMENTS: docs/tech/09_data_model/schema_core_loops.md§9 -- P3-B C1 (mig 0123 prov.) --
//
// `routine_items` / `flagged_items` / `lieutenant_flag_state` — the 3 NEW tables ch05 Loop 2 (Flag
// Discipline) adds (design §3, decisions §1.2/§1.3, ruling sub-decision #1: token state = NEW 1:1 table,
// NOT columns on `lieutenant` — the 04f-B in-flight collision wall; `lieutenant` itself is NEVER ALTERed
// by this migration/this lot). The 4th data-model change this chunk carries (`gameplay_sessions.
// opened_game_day`, D11) lives in `sessions_and_audit.ts` (same commit) — this file mirrors ONLY the 3
// greenfield tables + their 3 pgEnums.
import {
  pgTable,
  pgEnum,
  uuid,
  integer,
  varchar,
  real,
  bigint,
  boolean,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { player } from './player';           // convention canonique FK player_id REUSE (Task 3 §5.1)
import { lieutenant } from './lieutenant';   // REUSE — read-only FK target, this lot NEVER ALTERs this table (D2)

// ===== Enums PG natifs (design §3) =====

// routine_generator — the closed 5-member generator registry domain (D4/D6, design §3/§5). Rent
// (`BUILDING_RENT`, canon routine item, decisions §4 divergence #4) has NO system to enumerate against —
// reserved as inert generator CODE at C3, deliberately NOT a 6th member here (an enum member with no
// generator behind it would be a silent lie the moment anything switched on it).
export const routineGenerator = pgEnum('routine_generator', [
  'COURIER_SCHEDULING',
  'PRECURSOR_ORDER',
  'FRONT_SHOP_RECONCILIATION',
  'STASH_REORDER',
  'LEK_ROTATION',
]);

// routine_item_status — the RoutineItem lifecycle (D4, design §3). Canon's `lieutenant_review_required
// boolean` is realized as the `'flagged'` member, not a separate column (R9.3 anti-duplication —
// decisions §1.4: a stored boolean that is false for every row except those whose status already says
// 'flagged' would be redundant state).
export const routineItemStatus = pgEnum('routine_item_status', [
  'pending',
  'auto_confirmed',
  'batch_confirmed',
  'flagged',
]);

// flagged_item_resolution — the FlaggedItem verdict lifecycle (D10, canon-verbatim, design §3).
export const flaggedItemResolution = pgEnum('flagged_item_resolution', [
  'pending',
  'validated',
  'dismissed',
  'timed_out',
]);

// ===== Table 1 : routine_items — per-(player, game_day, generator) persisted candidate rows (D4) =====
// PK simple routine_item_id uuid. FK player_id NOT NULL CASCADE (a candidate has no meaning outside its
// player). FK lieutenant_id NULLable SET NULL (D6: no role-holder → the item still generates and
// auto-confirms, an honest coverage gap — the FK must survive the lieutenant existing at generation time
// but later being reassigned/removed without orphaning the row).
export const routineItemRow = pgTable(
  'routine_items',
  {
    routine_item_id:          uuid('routine_item_id').primaryKey().defaultRandom(),                                                    // design §3 — uuid PK
    player_id:                uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),                // design §3 — FK CASCADE
    game_day:                 integer('game_day').notNull(),                                                                           // design §3 — the generation day key (UNIQUE dedup component, D3)
    generator:                routineGenerator('generator').notNull(),                                                                 // design §3 — the closed 5-member registry domain
    dedup_key:                varchar('dedup_key', { length: 120 }).notNull(),                                                         // design §3 — generator-stable per-candidate key (UNIQUE dedup component, D3)
    descriptor:               jsonb('descriptor').notNull().default(sql`'{}'::jsonb`),                                                   // design §3 — i18n key + params (F1)
    responsible_role_id:      integer('responsible_role_id').notNull(),                                                                // design §3 — 04a canonical role_id (D6)
    lieutenant_id:            uuid('lieutenant_id').references(() => lieutenant.lieutenant_id, { onDelete: 'set null' }),              // design §3 — role-holder at generation, NULLable (D6 honest coverage gap)
    deviation_score_internal: real('deviation_score_internal').notNull().default(0),                                                    // design §3 — server/BO-only [0..1] score (R2.2)
    status:                   routineItemStatus('status').notNull().default('pending'),                                                 // design §3 — lifecycle enum, default 'pending' at generation
    created_at:               timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),                                   // design §3 — generation timestamp
    confirmed_at:             timestamp('confirmed_at', { withTimezone: true }),                                                        // design §3 — nullable (unconfirmed = null)
  },
  (table) => ({
    // Generation idempotency, DB-enforced FROM THE START (D3): a re-run of the same (player, game_day,
    // generator) candidate enumeration can never insert a duplicate dedup_key row — C3/C4's generation
    // entry-point relies on ON CONFLICT DO NOTHING against THIS exact constraint.
    dedup_unique:      uniqueIndex('routine_items_dedup_unique').on(table.player_id, table.game_day, table.generator, table.dedup_key),
    // (player_id, status): the daily-review "my pending/flagged items" hot path (C6) + the tick's own
    // per-status set-based scans (C4 auto-confirm/prune).
    player_status_idx: index('routine_items_player_status_idx').on(table.player_id, table.status),
    // (player_id, game_day): the per-day generation/auto-confirm scan (C3/C4).
    player_day_idx:    index('routine_items_player_game_day_idx').on(table.player_id, table.game_day),
  }),
);

export const routineItemRelations = relations(routineItemRow, ({ one }) => ({
  player: one(player, {
    fields: [routineItemRow.player_id],
    references: [player.player_id],
  }),
  lieutenant: one(lieutenant, {
    fields: [routineItemRow.lieutenant_id],
    references: [lieutenant.lieutenant_id],
  }),
}));

// ===== Table 2 : flagged_items — the append-only flag history (canon FlagHistoryEntry, R9.3 no new
// separate table — decisions §3) =====
// PK simple flag_id uuid. FK player_id NOT NULL CASCADE. FK lieutenant_id NOT NULL CASCADE (every flag
// belongs to exactly one flagging lieutenant — unlike routine_items, a flag can only ever be raised
// once a lieutenant_id resolved, D6). FK routine_item_id NULLable SET NULL — the originating item may be
// pruned past retention (C4); `routine_item_descriptor` SNAPSHOTS its display data so pruning never
// destroys a flag's own history (design §3).
export const flaggedItemRow = pgTable(
  'flagged_items',
  {
    flag_id:                   uuid('flag_id').primaryKey().defaultRandom(),                                                                    // design §3 — uuid PK
    player_id:                 uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),                        // design §3 — FK CASCADE
    lieutenant_id:              uuid('lieutenant_id').notNull().references(() => lieutenant.lieutenant_id, { onDelete: 'cascade' }),             // design §3 — FK CASCADE, always resolved at flag-creation time
    routine_item_id:           uuid('routine_item_id').references(() => routineItemRow.routine_item_id, { onDelete: 'set null' }),               // design §3 — soft-outlives pruning (retention, C4)
    routine_item_descriptor:   jsonb('routine_item_descriptor').notNull().default(sql`'{}'::jsonb`),                                              // design §3 — SNAPSHOT (canon field; prune-proof)
    flag_reason:                jsonb('flag_reason').notNull().default(sql`'{}'::jsonb`),                                                          // design §3 — i18n key + params
    deviation_score_internal:   real('deviation_score_internal').notNull(),                                                                       // design §3 — BO-only, no default (never inserted without a real score)
    emitted_tick:                bigint('emitted_tick', { mode: 'number' }).notNull(),                                                             // design §3 — canon shape kept alongside the real-clock anchor below
    game_day:                    integer('game_day').notNull(),                                                                                    // design §3 — the flagging day
    flagged_at:                  timestamp('flagged_at', { withTimezone: true }).notNull().defaultNow(),                                           // design §3 — the real-hours review-window anchor
    resolution:                  flaggedItemResolution('resolution').notNull().default('pending'),                                                 // design §3 — verdict lifecycle, default 'pending' at creation
    token_returned:              boolean('token_returned').notNull().default(false),                                                               // design §3 — set true on validate/timeout-return (C2/C4)
    resolved_at:                 timestamp('resolved_at', { withTimezone: true }),                                                                 // design §3 — nullable (unresolved = null)
    resolved_at_tick:            bigint('resolved_at_tick', { mode: 'number' }),                                                                   // design §3 — nullable, canon shape
  },
  (table) => ({
    // One-pending-flag-per-item, DB-enforced FROM THE START (D3, design §3): C2's flag-creation path
    // cannot race itself into 2 simultaneous PENDING flags against the same routine_item_id.
    // NB: columns via the `table` param (not the `const`) to avoid the TS7022 self-reference
    // circularity — mirrors core_loops.ts's own non_terminal_unique_idx precedent (mig 0121).
    pending_unique_idx: uniqueIndex('flagged_items_pending_unique_idx')
      .on(table.routine_item_id)
      .where(sql`${table.resolution} = 'pending'`),
    // (player_id, resolution): the daily-review "my pending flags to verdict" hot path (C6) +
    // convergence history scans filtered by resolution (C5).
    player_resolution_idx: index('flagged_items_player_resolution_idx').on(table.player_id, table.resolution),
    // (lieutenant_id, flagged_at DESC): BO flag-history diagnostic ordering (C7) + the C5 convergence-
    // window query (last N days of a lieutenant's flag history).
    lieutenant_flagged_at_idx: index('flagged_items_lieutenant_flagged_at_idx').on(table.lieutenant_id, table.flagged_at.desc()),
  }),
);

export const flaggedItemRelations = relations(flaggedItemRow, ({ one }) => ({
  player: one(player, {
    fields: [flaggedItemRow.player_id],
    references: [player.player_id],
  }),
  lieutenant: one(lieutenant, {
    fields: [flaggedItemRow.lieutenant_id],
    references: [lieutenant.lieutenant_id],
  }),
  routineItem: one(routineItemRow, {
    fields: [flaggedItemRow.routine_item_id],
    references: [routineItemRow.routine_item_id],
  }),
}));

// ===== Table 3 : lieutenant_flag_state — the token-state home (D2, sub-decision #1 RATIFIED: NEW 1:1
// table, NOT columns on `lieutenant` — the 04f-B collision wall) =====
// PK = lieutenant_id itself (1:1, FK CASCADE — the row has no meaning without its lieutenant).
export const lieutenantFlagStateRow = pgTable(
  'lieutenant_flag_state',
  {
    lieutenant_id:           uuid('lieutenant_id').primaryKey().references(() => lieutenant.lieutenant_id, { onDelete: 'cascade' }),  // design §3 — PK = FK (1:1)
    player_id:               uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),                 // design §3 — FK CASCADE, denormalized for the per-player BO lookup (C7)
    credibility_tokens:      integer('credibility_tokens').notNull().default(5),                                                       // design §3 — hard floor CHECK >= 0 below (D3); the cap is getter-clamped (LEAST), NOT a CHECK (max is tunable 2..10)
    last_regen_game_day:     integer('last_regen_game_day').notNull(),                                                                 // design §3 — in-row day guard (D3 — the regen idempotency claim lives HERE, not a separate table) ; W1.1-d C1.2 — plus de `.default(0)` TS-side (ANCRE ABSOLUE) : `flag-discipline.repository.ts#ensureState`/`#forceResetTokensToMax` posent l'ancre au game-day courant (citySimClock + deriveGameDay). DDL SQL garde `DEFAULT 0` (raw-SQL E2E fixtures — voir C1 implementation-notes.md §Deviations).
    last_weekly_reset_epoch: integer('last_weekly_reset_epoch').notNull().default(0),                                                  // design §3 — in-row epoch guard (D3/D8 — the weekly reset idempotency claim)
    updated_at:              timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),                                   // design §3
  },
  (table) => ({
    // The ONE hard DB floor D3 mandates for this table: the token count can NEVER go negative, full
    // stop — not even via a stray raw UPDATE outside C2's own conditional-UPDATE guards. Deliberately NO
    // upper-bound CHECK (decisions §1.3 verbatim: "a DB constant would either block legitimate tunable
    // raises or admit stale caps" — the max lives in the LEAST() clamp of every crediting statement, C2).
    credibility_tokens_chk: check('lfs_credibility_tokens_chk', sql`${table.credibility_tokens} >= 0`),
    // (player_id): the BO per-player "all my lieutenants' token state" lookup (C7) + C6's own
    // per-player state reads.
    player_idx: index('lieutenant_flag_state_player_idx').on(table.player_id),
  }),
);

export const lieutenantFlagStateRelations = relations(lieutenantFlagStateRow, ({ one }) => ({
  lieutenant: one(lieutenant, {
    fields: [lieutenantFlagStateRow.lieutenant_id],
    references: [lieutenant.lieutenant_id],
  }),
  player: one(player, {
    fields: [lieutenantFlagStateRow.player_id],
    references: [player.player_id],
  }),
}));

// ===== Types inférés Drizzle =====
export type RoutineItemRow        = typeof routineItemRow.$inferSelect;
export type RoutineItemInsert     = typeof routineItemRow.$inferInsert;
export type FlaggedItemRow        = typeof flaggedItemRow.$inferSelect;
export type FlaggedItemInsert     = typeof flaggedItemRow.$inferInsert;
export type LieutenantFlagStateRow    = typeof lieutenantFlagStateRow.$inferSelect;
export type LieutenantFlagStateInsert = typeof lieutenantFlagStateRow.$inferInsert;

// ===== Enum TS mirrors PG natifs =====
export type RoutineGeneratorEnumTs        = (typeof routineGenerator.enumValues)[number];
// 'COURIER_SCHEDULING' | 'PRECURSOR_ORDER' | 'FRONT_SHOP_RECONCILIATION' | 'STASH_REORDER' | 'LEK_ROTATION'
export type RoutineItemStatusEnumTs       = (typeof routineItemStatus.enumValues)[number];
// 'pending' | 'auto_confirmed' | 'batch_confirmed' | 'flagged'
export type FlaggedItemResolutionEnumTs   = (typeof flaggedItemResolution.enumValues)[number];
// 'pending' | 'validated' | 'dismissed' | 'timed_out'
