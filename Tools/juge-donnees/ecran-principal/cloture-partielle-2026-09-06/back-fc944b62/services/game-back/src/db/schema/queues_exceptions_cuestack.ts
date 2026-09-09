// IMPLEMENTS: docs/tech/09_data_model/schema_queues_exceptions_cuestack.md§2 -- session:2026-06-02 --
import {
  pgTable,
  uuid,
  integer,
  real,
  text,
  smallint,
  bigint,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
  primaryKey,
  check,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { player } from './player';         // Task 3 — convention canonique FK player_id REUSE §5.1
import { lieutenant } from './lieutenant';  // Task 6 — FK lieutenant_id source (PK uuidv7)
import type { I18nRef } from '../../common/i18n-ref'; // Lot 0 "Les conventions" C0 (mig 0150, same-commit R9.3) — event_descriptor_i18n's TS shape

// ===== Enums PG natifs =====
// cue_stack_state — GDD L324 verbatim enum 4 membres
export const cueStackState = pgEnum('cue_stack_state', [
  'pending',
  'committed',
  'executing',
  'resolved',
]);

// resolution_status — REUSE 05/exception_queue_spine.md §Entity Exception (ligne 49 verbatim) — 4 membres
// (DDL-promotion : domaine fermé runtime spine REUSE — pgEnum natif day-1)
export const resolutionStatus = pgEnum('resolution_status', [
  'pending',
  'resolved',
  'escalated',
  'aged_out',
]);

// ===== Table 1 : exception_queue — GDD L303-316 verbatim =====
// PK simple exception_id uuid. FK player_id NOT NULL CASCADE (Task 3 §5.2 ligne 384 catégorie « Exceptions/CueStack »).
// FK lieutenant_id nullable + ON DELETE SET NULL (override §1 décision : historique préservé post-retirement lieutenant).
// resolution_status pgEnum ajouté (REUSE 05 §Entity ligne 49).
export const exceptionQueueRow = pgTable(
  'exception_queue',
  {
    exception_id:        uuid('exception_id').primaryKey().defaultRandom(),                                                        // GDD L304 — uuid primary key (UUIDv4 day-1 — promotion UUIDv7 via Task 3 §7.2 PALIMPSEST policy si profiling justifie)
    player_id:           uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),                  // GDD L304 + override NOT NULL — CASCADE Task 3 §5.2 ligne 384
    lieutenant_id:       uuid('lieutenant_id').references(() => lieutenant.lieutenant_id, { onDelete: 'set null' }),                // GDD L305 + override SET NULL — historique préservé post-retirement (cf. §1)
    event_descriptor:    text('event_descriptor').notNull(),                                                                          // GDD L306 — text i18n-key (REUSE 05 §Entity ligne 42) + override NOT NULL (descripteur vide = pas de sens UI)
    // Lot 0 "Les conventions" C0 (mig 0150, design D2, same-commit R9.3 — precedent 0146 `tutorials_opt_out`,
    // `schema_player_progression_state.md:421`). NULLABLE, no default: NULL = "no frere yet" (legacy rows,
    // read via `ExceptionsProjectionService.projectCard`'s comblage). STILL DORMANT at C0 — first writer =
    // C4 (D2's comblage logic); reader = the SAME `projectCard` once C4 lands.
    event_descriptor_i18n: jsonb('event_descriptor_i18n').$type<I18nRef>(),                                                          // Lot 0 C0 mig 0150 — frere `_i18n` for event_descriptor (D1/D2)
    candidate_actions:   jsonb('candidate_actions').notNull().default(sql`'[]'::jsonb`),                                            // GDD L307 — jsonb (NEW NOT NULL + default safe-empty)
    suggested_action:    jsonb('suggested_action').notNull().default(sql`'{}'::jsonb`),                                             // GDD L308 — jsonb (NEW NOT NULL + default safe-empty)
    confidence:          real('confidence').notNull().default(0),                                                                    // GDD L309 — float [0..1] BO-only (projeté ConfidenceBucket §8)
    priority:            integer('priority').notNull().default(0),                                                                   // GDD L310 — int (severity × age REUSE 05 §Spine) BO-only (projeté PriorityBucket §8)
    severity:            integer('severity').notNull().default(0),                                                                   // GDD L311 — int BO-only (projeté SeverityEnum §8)
    emitted_at:          timestamp('emitted_at', { withTimezone: true }).notNull().defaultNow(),                                     // GDD L312 + override NOT NULL + DEFAULT now()
    resolved_at:         timestamp('resolved_at', { withTimezone: true }),                                                            // GDD L313 — nullable (GDD-verbatim « null »)
    resolution:          jsonb('resolution'),                                                                                          // GDD L314 — nullable (GDD-verbatim « null »)
    resolution_status:   resolutionStatus('resolution_status').notNull().default('pending'),                                          // REUSE 05 §Entity ligne 49 — ajouté ici comme colonne explicite (vs déduction `resolved_at IS NULL`)
  },
  (table) => ({
    // Index GDD L448 verbatim — invariant du chapitre 09
    player_priority_idx: index('idx_exception_queue_player_priority').on(table.player_id, sql`${table.priority} desc`, table.emitted_at),
    // Indexes locaux additionnels — justifications §6
    player_lieutenant_idx:    index('exception_queue_player_lieutenant_idx').on(table.player_id, table.lieutenant_id),
    player_status_idx:        index('exception_queue_player_status_idx').on(table.player_id, table.resolution_status),
    // P3-F C9 (mig 0136, additive) — DB-enforced "at most ONE pending DegradedCategoryPressureProducer
    // card per (player, category, item)" (task concurrency mandate). Scoped to `candidate_actions[0].
    // pressure_key IS NOT NULL` (a field name ONLY this producer writes — mirrors `news_thread_hindsight_
    // source_fodder_ref_unique`'s own "restrict to non-NULL" shape, migration 0130) AND `resolution_
    // status='pending'` (a resolved card frees the slot for a future re-raise). See migration 0136's own
    // header for the full DB-enforced-vs-app-checked reasoning.
    degraded_category_pressure_item_unique_idx: uniqueIndex('degraded_category_pressure_item_unique_idx')
      .on(table.player_id, sql`(${table.candidate_actions} -> 0 ->> 'pressure_key')`)
      .where(sql`(${table.resolution_status} = 'pending' AND (${table.candidate_actions} -> 0 ->> 'pressure_key') IS NOT NULL)`),
    // W1.1-a C1 (mig 0143, design D4) — DB-enforced "at most ONE pre-seeded onboarding card, ever,
    // per player". No `resolution_status` filter (deliberate divergence from the index just above,
    // whose model this mirrors otherwise): a RESOLVED pre-seed card must never be re-creatable, so
    // idempotence stays a base error past resolution, not a service promise that lapses on resolve.
    onboarding_preseed_unique_idx: uniqueIndex('onboarding_preseed_unique_idx')
      .on(table.player_id)
      .where(sql`(${table.candidate_actions} -> 0 ->> 'source') = 'onboarding_preseed'`),
  }),
);

export const exceptionQueueRelations = relations(exceptionQueueRow, ({ one }) => ({
  player: one(player, {
    fields: [exceptionQueueRow.player_id],
    references: [player.player_id],
  }),
  lieutenant: one(lieutenant, {
    fields: [exceptionQueueRow.lieutenant_id],
    references: [lieutenant.lieutenant_id],
  }),
}));

// ===== Table 1bis : exception_queue_refusal — W1.1-d C5 (migration 0145), closes TD-203 =====
// The insertion cap (`ExceptionsRepository#insert`, ≥20 pending per (player,lieutenant) → refuse-insert,
// D5) was SILENT — only a `logger.warn`, no queryable trace. This is an AGGREGATE counter, ONE row per
// (player_id, producer) pair that has EVER been refused — `refused_count` UPSERTed, never a per-refusal
// audit log (bounded by distinct (player,producer) pairs, not by refusal volume). `producer` is read back
// from the refused row's own `candidate_actions[].source` jsonb tag (the ALREADY-established convention —
// see exceptions.repository.ts#insert) — 'UNKNOWN' for the 6 producers that predate that convention
// (honest gap, documented in implementation-notes.md, never mis-attributed).
export const exceptionQueueRefusal = pgTable(
  'exception_queue_refusal',
  {
    player_id:        uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),
    producer:          text('producer').notNull(),
    refused_count:     integer('refused_count').notNull().default(0),
    last_refused_at:   timestamp('last_refused_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.player_id, t.producer] }),
    check('exception_queue_refusal_count_chk', sql`${t.refused_count} > 0`),
  ],
);

export const exceptionQueueRefusalRelations = relations(exceptionQueueRefusal, ({ one }) => ({
  player: one(player, {
    fields: [exceptionQueueRefusal.player_id],
    references: [player.player_id],
  }),
}));

// ===== Table 2 : cue_stacks — GDD L318-324 verbatim =====
// PK simple cue_stack_id uuid. FK player_id NOT NULL CASCADE.
// slots jsonb (ordered array de CueStackSlot REUSE 05). state pgEnum natif (4 membres GDD-verbatim).
//
// P3-D C1 (mig 0129, design §4.1) — ACTIVATION: 4 additive server-only bookkeeping columns + the
// partial UNIQUE index I1. This table was DORMANT (zero runtime consumer, decisions §0 row 1) until this
// lot. The 2 EXISTING CHECKs below (`cs_state_committed_at_chk` / `cs_slots_length_chk`, mig 0007) are
// CONSERVED VERBATIM — this migration does not touch them.
export const cueStack = pgTable(
  'cue_stacks',
  {
    cue_stack_id:    uuid('cue_stack_id').primaryKey().defaultRandom(),                                                            // GDD L320 — uuid primary key
    player_id:       uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),                      // GDD L321 + override NOT NULL — CASCADE
    slots:           jsonb('slots').notNull().default(sql`'[]'::jsonb`),                                                            // GDD L322 — jsonb ordered array (NEW NOT NULL + default safe-empty)
    committed_at:    timestamp('committed_at', { withTimezone: true }),                                                              // GDD L323 — nullable (GDD-verbatim « null »)
    state:           cueStackState('state').notNull().default('pending'),                                                            // GDD L324 verbatim enum 4 membres — default pending à la composition
    // P3-D C1 (mig 0129) — 4 ADDITIVE bookkeeping columns, ALL nullable (a fresh/pending stack has
    // none set), server-only R2.2:
    session_ref:                    uuid('session_ref'),                                                                             // design §4.1 — soft-ref gameplay_sessions, NO FK (the highest_leverage_cards.session_ref precedent, core_loops.ts:46) — a stack legitimately outlives the session that committed it.
    executing_slot_index:           smallint('executing_slot_index'),                                                                // design §4.1 — the sequential execution cursor (DD-EXEC-SEQ). CHECK bounded [0,8) (the buyer_roster_entry.slot_index_chk convention).
    executing_slot_started_minute:  bigint('executing_slot_started_minute', { mode: 'number' }),                                     // design §4.1 — game-minute the current slot started firing-evaluation. No CHECK (mirrors supply_chain_legs.last_throughput_tick's unconstrained-tick convention).
    last_executed_game_minute:      bigint('last_executed_game_minute', { mode: 'number' }),                                         // design §4.1 — idempotence guard I3 (the single-UPDATE `WHERE last_executed_game_minute IS DISTINCT FROM $t` guard, C3). No CHECK.
  },
  (table) => ({
    player_idx:           index('cue_stacks_player_idx').on(table.player_id),
    player_state_idx:     index('cue_stacks_player_state_idx').on(table.player_id, table.state),
    // I1 (design §4.1, invariant table row I1, mig 0129): at most ONE non-terminal stack per
    // player, DB-ENFORCED FROM THE START (the highest_leverage_cards_non_terminal_idx precedent, mig
    // 0122) — 'resolved' (the ONE terminal state) is excluded, so a player may accumulate many resolved
    // (historical) stacks alongside at most one live one.
    // NB : colonnes via le param `table` (et non le `const`) pour éviter la self-réf circulaire TS7022.
    non_terminal_unique_idx: uniqueIndex('cue_stacks_non_terminal_idx')
      .on(table.player_id)
      .where(sql`${table.state} IN ('pending', 'committed', 'executing')`),
    // Bounded index CHECK (mig 0129) — mirrors cs_slots_length_chk's own upper bound of 8 slots.
    executing_slot_index_chk: check(
      'cs_executing_slot_index_chk',
      sql`${table.executing_slot_index} IS NULL OR (${table.executing_slot_index} >= 0 AND ${table.executing_slot_index} < 8)`,
    ),
  }),
);

export const cueStackRelations = relations(cueStack, ({ one }) => ({
  player: one(player, {
    fields: [cueStack.player_id],
    references: [player.player_id],
  }),
}));

// ===== Table 3 : autonomy_reports — GDD L326-336 verbatim =====
// PK simple report_id uuid. FK player_id NOT NULL CASCADE. FK lieutenant_id NOT NULL CASCADE (un report appartient à un lieutenant).
// cycle_id int NOT NULL. issues jsonb 1..5 (cap applicatif).
export const autonomyReport = pgTable(
  'autonomy_reports',
  {
    report_id:        uuid('report_id').primaryKey().defaultRandom(),                                                              // GDD L327 — uuid primary key
    lieutenant_id:    uuid('lieutenant_id').notNull().references(() => lieutenant.lieutenant_id, { onDelete: 'cascade' }),         // GDD L328 + override NOT NULL CASCADE (un report sans lieutenant n'a aucun sens)
    player_id:        uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),                     // GDD L329 + override NOT NULL — CASCADE Task 3 §5.2
    cycle_id:         integer('cycle_id').notNull(),                                                                                 // GDD L330 + override NOT NULL
    issues:           jsonb('issues').notNull().default(sql`'[]'::jsonb`),                                                            // GDD L331 — jsonb 1..5 issues (NEW NOT NULL + default safe-empty ; cap applicatif `T.db.queues_exceptions_cuestack.autonomy_report_issues_max=5`)
    player_decision:  jsonb('player_decision'),                                                                                       // GDD L332 — nullable (GDD-verbatim « null »)
    emitted_at:       timestamp('emitted_at', { withTimezone: true }).notNull().defaultNow(),                                         // GDD L333 + override NOT NULL + DEFAULT now()
    resolved_at:      timestamp('resolved_at', { withTimezone: true }),                                                                // GDD L334 — nullable (GDD-verbatim « null »)
  },
  (table) => ({
    player_idx:                 index('autonomy_reports_player_idx').on(table.player_id),
    player_lieutenant_idx:      index('autonomy_reports_player_lieutenant_idx').on(table.player_id, table.lieutenant_id),
    player_cycle_idx:           index('autonomy_reports_player_cycle_idx').on(table.player_id, table.cycle_id),
    // Filtre fréquent : reports non décidés (`player_decision IS NULL`) — partial index (cf. §3 DDL + §6)
    // NB : on référence la colonne via le param `table` (et non le `const autonomyReport`) pour éviter
    // la self-référence circulaire de l'inférence TS (TS7022) ; le SQL généré est strictement identique.
    player_unresolved_idx:      index('autonomy_reports_player_unresolved_idx').on(table.player_id, table.emitted_at).where(sql`${table.player_decision} IS NULL`),
  }),
);

export const autonomyReportRelations = relations(autonomyReport, ({ one }) => ({
  player: one(player, {
    fields: [autonomyReport.player_id],
    references: [player.player_id],
  }),
  lieutenant: one(lieutenant, {
    fields: [autonomyReport.lieutenant_id],
    references: [lieutenant.lieutenant_id],
  }),
}));

// ===== Types inférés Drizzle =====
export type ExceptionQueueRow         = typeof exceptionQueueRow.$inferSelect;
export type ExceptionQueueInsert      = typeof exceptionQueueRow.$inferInsert;
export type CueStackRow               = typeof cueStack.$inferSelect;
export type CueStackInsert            = typeof cueStack.$inferInsert;
export type AutonomyReportRow         = typeof autonomyReport.$inferSelect;
export type AutonomyReportInsert      = typeof autonomyReport.$inferInsert;
export type ExceptionQueueRefusalRow    = typeof exceptionQueueRefusal.$inferSelect;
export type ExceptionQueueRefusalInsert = typeof exceptionQueueRefusal.$inferInsert;
