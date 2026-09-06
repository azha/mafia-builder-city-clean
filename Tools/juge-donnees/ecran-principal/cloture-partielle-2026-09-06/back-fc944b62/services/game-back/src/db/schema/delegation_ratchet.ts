// IMPLEMENTS: docs/tech/09_data_model/schema_core_loops.md §15 (mig 0135) -- P3-F C1 --
//             Design: docs/superpowers/specs/2026-07-18-p3-F-delegation-ratchet-design.md §3
//             (data model, verbatim) + §8/§9/§10 (graduation tx / recall tx / recall-debt).
//             Decisions: docs/superpowers/specs/2026-07-18-p3-F-delegation-ratchet-decisions.md D8/D9/D10/D13.
//             -- P3-F C1 -- 2026-07-18
//
// `delegation_ratchet.ts` — the 3 NEW tables P3-F (ch06 MÈRE — Delegation Ratchet) adds in mig 0135:
//   `graduation_events` (append-only audit spine, BOTH directions GRADUATION|RECALL, D13) +
//   `promotion_locks` (ONE ROW PER RECALL — canon INACTIVE = no row, D10) +
//   `player_proficiency` (frozen-then-realized per (player,category), D8/D9).
// `mastery_score`/`player_progression_state` (ch09 mig 0002) are ACTIVATED by this lot, NOT touched —
// zero column/CHECK change, see `player_progression_state.ts` (unmodified by this file).
// ZERO pgEnum NEW (D1-lot-wide convention, P3-C/P3-D/P3-E precedent reconduced) — `event_kind`/
// `unmanaged_window_state`/`fallback_quality_bucket` are all varchar+CHECK (bounded-but-small registries,
// the `compression_events.state`/`mastery_score.delegation_state` convention).

import { pgTable, uuid, integer, smallint, bigint, jsonb, timestamp, varchar, boolean, index, check, primaryKey } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { player } from './player'; // Task 3 — convention canonique FK player_id REUSE §5.1

// ===== Table 1 : graduation_events (design §3/D13 — append-only, BOTH directions) =====
// The single audit spine of the ratchet: one row per GRADUATION or RECALL. Canon `GraduationEvent.
// reversed_at` is DERIVED (a later RECALL row for the same (player,category)) — never a mutable column
// on this append-only log (D13). Applicative append-only v1 — the repository (C5/C8) exposes INSERT only.
export const graduationEvent = pgTable(
  'graduation_events',
  {
    event_id:               uuid('event_id').primaryKey().defaultRandom(),
    player_id:               uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),
    category_id:             integer('category_id').notNull(),                                                     // design §3 — TaskCategoryCatalogue code (C2)
    event_kind:              varchar('event_kind', { length: 16 }).notNull(),                                      // design §3 — CHECK IN ('GRADUATION','RECALL') below
    lieutenant_id:            uuid('lieutenant_id'),                                                                // design §3 — the graduating/recalled lieutenant
    seed_decisions_n:         smallint('seed_decisions_n'),                                                        // design §3 — GRADUATION only, actual count used (<= N)
    script_seed_hash:         varchar('script_seed_hash', { length: 64 }),                                          // design §3 — GRADUATION only, SHA-256 hex of the compiled IR
    mastery_at_event:         smallint('mastery_at_event').notNull(),                                              // design §3 — raw snapshot, BO-only (R2.2)
    successor_category_id:    integer('successor_category_id'),                                                    // design §3 — GRADUATION only
    reversal_cost:            jsonb('reversal_cost'),                                                               // design §3 — RECALL only, ReversalCostComposite buckets
    session_ref:              uuid('session_ref'),                                                                  // design §3 — soft-ref, no FK (traceability pointer convention)
    game_tick:                bigint('game_tick', { mode: 'number' }).notNull(),
    created_at:               timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    event_kind_chk: check('graduation_events_event_kind_chk', sql`${table.event_kind} IN ('GRADUATION', 'RECALL')`),
    // BO-only raw snapshot — same domain as mastery_score.mastery_score itself (mig 0002).
    mastery_at_event_chk: check('graduation_events_mastery_at_event_chk', sql`${table.mastery_at_event} BETWEEN 0 AND 100`),
    // The append-only log's own primary read pattern (design §11/§12 — paginated, newest-first).
    player_created_idx: index('graduation_events_player_created_idx').on(table.player_id, table.created_at.desc()),
    // Per-category history scan (seed-depth extractor + computeFallbackBucket double-recall lookup, §9.1).
    player_category_idx: index('graduation_events_player_category_idx').on(table.player_id, table.category_id),
  }),
);

export const graduationEventRelations = relations(graduationEvent, ({ one }) => ({
  player: one(player, {
    fields: [graduationEvent.player_id],
    references: [player.player_id],
  }),
}));

// ===== Table 2 : promotion_locks (design §3/§9, D10 — ONE ROW PER RECALL) =====
// Canon `UnmanagedWindowState.INACTIVE` = NO ROW (divergence #4) — `unmanaged_window_state` is therefore a
// 2-value CHECK (ACTIVE/CLOSED), deliberately never 3. The C8 `PROMOTION_LOCK_TICK` (HOURLY) closes expired
// windows set-based via the `(unmanaged_window_state, window_end_tick)` index below.
export const promotionLock = pgTable(
  'promotion_locks',
  {
    lock_id:                             uuid('lock_id').primaryKey().defaultRandom(),
    player_id:                           uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),
    category_id:                         integer('category_id').notNull(),
    recalled_lt_id:                       uuid('recalled_lt_id'),
    unmanaged_window_state:               varchar('unmanaged_window_state', { length: 16 }).notNull().default('ACTIVE'), // design §3 — CHECK IN ('ACTIVE','CLOSED') below
    window_start_tick:                    bigint('window_start_tick', { mode: 'number' }).notNull(),
    window_end_tick:                      bigint('window_end_tick', { mode: 'number' }).notNull(),
    suspended_higher_order_category_id:   integer('suspended_higher_order_category_id'),
    fallback_quality_bucket:              varchar('fallback_quality_bucket', { length: 16 }).notNull(),              // design §3 — CHECK IN ('LOW','DEGRADED','MINIMAL') below
    reversal_cost:                        jsonb('reversal_cost').notNull(),                                          // design §3 — ReversalCostComposite buckets
    accord_degradation_applied:           boolean('accord_degradation_applied').notNull().default(false),
    closed_at:                            timestamp('closed_at', { withTimezone: true }),                            // design §3 — write-once at close (NULL while ACTIVE)
    created_at:                           timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    unmanaged_window_state_chk: check('promotion_locks_unmanaged_window_state_chk', sql`${table.unmanaged_window_state} IN ('ACTIVE', 'CLOSED')`),
    fallback_quality_bucket_chk: check('promotion_locks_fallback_quality_bucket_chk', sql`${table.fallback_quality_bucket} IN ('LOW', 'DEGRADED', 'MINIMAL')`),
    // The C8 PROMOTION_LOCK_TICK batch-close query shape (canon F4 index transposed).
    window_state_end_idx: index('promotion_locks_window_state_end_idx').on(table.unmanaged_window_state, table.window_end_tick),
    // OBLIGATOIRE 1-N FK index (Task 3 §5.1) — recall-history / re-delegation-penalty lookup (D12).
    player_category_idx: index('promotion_locks_player_category_idx').on(table.player_id, table.category_id),
  }),
);

export const promotionLockRelations = relations(promotionLock, ({ one }) => ({
  player: one(player, {
    fields: [promotionLock.player_id],
    references: [player.player_id],
  }),
}));

// ===== Table 3 : player_proficiency (design §3/§10, D8/D9 — frozen-then-realized) =====
// PK composite (player_id, category_id) — the SAME shape mastery_score itself uses: a 1-row-per-
// (player,category) ledger (not append-only). `last_accrued_session_id` is the D9/D14 idempotency guard —
// a replayed SessionClosedEvent is a zero-write (mirrors `compression_decay_state.last_quiet_decay_week_
// epoch`'s guard-and-claim shape, mig 0134).
export const playerProficiency = pgTable(
  'player_proficiency',
  {
    player_id:                  uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),
    category_id:                integer('category_id').notNull(),
    player_proficiency:          smallint('player_proficiency').notNull(),                                          // design §3 — frozen mastery_score.mastery_score at graduation (D8)
    recall_debt_total:           smallint('recall_debt_total').notNull().default(0),
    recovery_period_remaining:   smallint('recovery_period_remaining').notNull().default(0),
    last_accrued_session_id:     uuid('last_accrued_session_id'),                                                    // design §3/D9 — accrual idempotency guard
    updated_at:                  timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // PK composite (design §3) — the mastery_score shape (mig 0002), NOT a synthetic id.
    pk: primaryKey({ columns: [table.player_id, table.category_id] }),
    player_proficiency_chk: check('player_proficiency_player_proficiency_chk', sql`${table.player_proficiency} BETWEEN 0 AND 100`),
    recall_debt_total_chk: check('player_proficiency_recall_debt_total_chk', sql`${table.recall_debt_total} >= 0`),
    recovery_period_remaining_chk: check('player_proficiency_recovery_period_remaining_chk', sql`${table.recovery_period_remaining} >= 0`),
    // BO "in recovery" queries (design §12 canon F4 index).
    player_recovery_idx: index('player_proficiency_player_recovery_idx').on(table.player_id, table.recovery_period_remaining),
  }),
);

export const playerProficiencyRelations = relations(playerProficiency, ({ one }) => ({
  player: one(player, {
    fields: [playerProficiency.player_id],
    references: [player.player_id],
  }),
}));

// ===== Types inférés Drizzle =====
export type GraduationEventRow = typeof graduationEvent.$inferSelect;
export type GraduationEventInsert = typeof graduationEvent.$inferInsert;
export type PromotionLockRow = typeof promotionLock.$inferSelect;
export type PromotionLockInsert = typeof promotionLock.$inferInsert;
export type PlayerProficiencyRow = typeof playerProficiency.$inferSelect;
export type PlayerProficiencyInsert = typeof playerProficiency.$inferInsert;
