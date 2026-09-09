// IMPLEMENTS: docs/tech/09_data_model/schema_core_loops.md §12 (mig 0132) + §13 (mig 0133) -- P3-E C1 --
//             Design: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §13
//             (data model, verbatim) + §4.1/§4.2/§4.3 (friction perimeter/accrual/aggregate) + §7
//             (replacement options) + §9/§10 (compression state machine + board)
//             Decisions: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-decisions.md
//             D1 (ZERO pgEnum NEW) + D2/DD-E2 (compression_events OPEN row IS the cycle state) + D11
//             (board = snapshot at fire) + #15 (friction_org_size ≠ canon org_size) + #18/#19 (node-set
//             perimeter + acquired_at_tick, buildings.ts — NOT here, one home per table)
//             -- P3-E C1 -- 2026-07-17
//
// `demolition_compression.ts` — the 5 NEW tables P3-E (ch05 Loops 8-9, Demolition Mandate + Compression
// Week) adds across its 3 migrations:
//   mig 0132 (demolition_friction): `friction_budget_state` (1-1 per-player friction cache, §4.3) +
//     `replacement_option` (up to 2 ranked candidates per decommissioned node, §7/★#5).
//   mig 0133 (compression_week): `compression_events` (per-player cycle ledger, invariant I1) +
//     `compression_problem_entry` (the board's triage rows, snapshot-at-fire D11).
//   mig 0134 (compression_decay_state, P3-E C6): `compression_decay_state` — the 1-1 per-player W/14
//     `COMPRESSION_QUIET_DECAY_TICK` idempotency watermark (design §8.3). Lives HERE, not on
//     `player_progression_state`, per that table's own DD-E-schema ("zero migration/colonne sur CETTE
//     table par ce lot", schema_player_progression_state.md §"Activation P3-E") — the SAME "give a WEEKLY
//     tick its OWN epoch column on ITS OWN domain table" convention `lieutenant_flag_state.last_weekly_
//     reset_epoch` (mig 0123) already establishes, never bolted onto a shared/foundational row.
// ZERO pgEnum NEW (D1, P3-D precedent reconduced) — every domain column here is a bounded
// varchar+CHECK (state/tier) or an unconstrained closed-runtime-registry varchar (source_kind), never a
// native PG enum. The 6th surface this lot touches — `buildings.acquired_at_tick` (mig 0132) — is
// mirrored in `city_state.ts`, NOT here (one home per table, R9.3 — that table's own owner file).

import { pgTable, uuid, integer, smallint, bigint, numeric, jsonb, timestamp, varchar, boolean, index, uniqueIndex, check } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { player } from './player'; // Task 3 — convention canonique FK player_id REUSE §5.1

// ===== Table 1 : friction_budget_state (design §13.1/§4.3 — mig 0132) =====
// 1-1 per-player friction cache. PK = FK player_id (calque player_progression_state §4.1 — "PK B-tree
// sert tous les access patterns", aucun index secondaire). `friction_org_size` (NOT `org_size` —
// divergence #15, ruling ★#1 override) counts the périmètre §4.1 réconcilié (`ownership='player' AND
// structural_state != 'demolished'`, #18). Both cache columns are REFRESH-ONLY-BY-TICK (N/31, C2) + the
// synchronous re-eval inside a decommission tx (C4) — the accrual formula itself stays DERIVED, never
// stored (D4, precedent P3-C/04f-A).
export const frictionBudgetState = pgTable(
  'friction_budget_state',
  {
    player_id:                  uuid('player_id').primaryKey().references(() => player.player_id, { onDelete: 'cascade' }),
    friction_budget_total:      numeric('friction_budget_total').notNull().default('0'),                          // design §13.1 — numeric() string-mode, no float drift (effect_modifier.magnitude precedent)
    friction_org_size:          integer('friction_org_size').notNull().default(0),                                // design §13.1/§4.1 — count of the ★#1 périmètre, NOT canon org_size (divergence #15)
    efficiency_penalty_active:  boolean('efficiency_penalty_active').notNull().default(false),                     // design §5.1
    penalty_since_tick:         bigint('penalty_since_tick', { mode: 'number' }),                                  // design §13.1 — null while inactive (coherence CHECK below)
    last_decommission_at_tick:  bigint('last_decommission_at_tick', { mode: 'number' }),                           // design §13.1 — diagnostic/BO
    last_evaluated_tick:        bigint('last_evaluated_tick', { mode: 'number' }).notNull(),                       // design §13.1 — the N/31 watermark ; W1.1-d C1.2 — plus de `.default(0)` TS-side (ANCRE ABSOLUE) : `friction-budget.repository.ts#ensureRow`/`#reevaluateAndTransitionLocked` posent l'ancre au game_minute courant. DDL SQL garde `DEFAULT 0` (raw-SQL E2E fixtures — voir C1 implementation-notes.md §Deviations).
  },
  (table) => ({
    total_chk: check('friction_budget_state_total_chk', sql`${table.friction_budget_total} >= 0`),
    org_size_chk: check('friction_budget_state_org_size_chk', sql`${table.friction_org_size} >= 0`),
    // Design §13.1 verbatim coherence CHECK: efficiency_penalty_active and penalty_since_tick can never
    // desync (active-without-a-timestamp or a stale timestamp on an inactive row are both
    // schema-impossible, not just app-discipline).
    penalty_coherence_chk: check(
      'friction_budget_state_penalty_coherence_chk',
      sql`(${table.efficiency_penalty_active} = true AND ${table.penalty_since_tick} IS NOT NULL) OR (${table.efficiency_penalty_active} = false AND ${table.penalty_since_tick} IS NULL)`,
    ),
  }),
);

export const frictionBudgetStateRelations = relations(frictionBudgetState, ({ one }) => ({
  player: one(player, {
    fields: [frictionBudgetState.player_id],
    references: [player.player_id],
  }),
}));

// ===== Table 2 : replacement_option (design §13.1/§7 — ★#5 optionnelles, mig 0132) =====
// Up to 2 ranked candidates per decommissioned node (rank CHECK IN (1,2) — canon
// `demolition_replacement_options_count` default 2). `freed_block_id`/`source_building_id` are SOFT-REFS
// (no DB FK) — `freed_block_id` is a GLOBAL soft-ref target (world_geography.blocks.id, never FK'd from
// player-scoped rows per that table's OWN convention); `source_building_id` points at a row that
// DELIBERATELY still exists post-decommission (structural_state='demolished', never deleted) but is
// intentionally NOT hard-FK'd — the option must remain queryable/expirable independent of any future
// buildings-table lifecycle change (mirrors `highest_leverage_cards.session_ref`'s own soft-ref
// convention, mig 0120).
export const replacementOption = pgTable(
  'replacement_option',
  {
    id:                        uuid('id').primaryKey().defaultRandom(),
    player_id:                 uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),
    freed_block_id:            integer('freed_block_id').notNull(),                                                // design §13.1 — soft-ref world_geography.blocks.id (S9 convention), NO FK
    source_building_id:        uuid('source_building_id').notNull(),                                               // design §13.1 — soft-ref buildings.building_id (row survives 'demolished'), NO FK
    candidate_building_type:   integer('candidate_building_type').notNull(),                                       // design §13.1 — FK-logical index into the 04a building-type enum (buildings.building_type convention)
    projected:                 jsonb('projected').notNull().default(sql`'{}'::jsonb`),                             // design §13.1 — server buckets, NOT NULL + default safe-empty
    rank:                      smallint('rank').notNull(),                                                         // design §13.1 — CHECK IN (1,2) below
    created_at_tick:           bigint('created_at_tick', { mode: 'number' }).notNull(),
    expires_at_tick:           bigint('expires_at_tick', { mode: 'number' }).notNull(),                            // design §13.1/★#5 — 7 game-days horizon (demolition_replacement_option_expiry_game_days)
    picked_at:                 timestamp('picked_at', { withTimezone: true }),                                     // design §13.1 — null = not yet picked
    closed_at:                 timestamp('closed_at', { withTimezone: true }),                                     // design §13.1 — null = still open (picked OR expired closes it, I9)
  },
  (table) => ({
    rank_chk: check('replacement_option_rank_chk', sql`${table.rank} IN (1, 2)`),
    // At most one rank-1 and one rank-2 option per decommissioned node per player (design §13.1 verbatim).
    player_source_rank_unique: uniqueIndex('replacement_option_player_source_rank_unique').on(table.player_id, table.source_building_id, table.rank),
    // Partial index — the GET /v1/friction/replacement-options hot path (design §15: "options OPEN").
    player_open_idx: index('replacement_option_player_open_idx').on(table.player_id).where(sql`${table.closed_at} IS NULL`),
  }),
);

export const replacementOptionRelations = relations(replacementOption, ({ one }) => ({
  player: one(player, {
    fields: [replacementOption.player_id],
    references: [player.player_id],
  }),
}));

// ===== Table 3 : compression_events (design §13.2 — the per-player cycle ledger, mig 0133) =====
// DD-E2: this row (NOT player_progression_state.compression_week_state, which stays a 3-value phase
// marker, D2 INTOUCHÉ) is the authoritative bookkeeping surface for deferral_count/decisions_used/
// forced/severity. **I1** (invariant table row I1, plan §0.4): the partial UNIQUE index below
// DB-ENFORCES "at most ONE non-terminal compression cycle per player" FROM THE START — the SAME
// `highest_leverage_cards_non_terminal_idx`/`cue_stacks_non_terminal_idx` precedent (migs 0122/0129).
export const compressionEvent = pgTable(
  'compression_events',
  {
    id:                           uuid('id').primaryKey().defaultRandom(),
    player_id:                    uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),
    state:                        varchar('state', { length: 16 }).notNull(),                                      // design §13.2 — CHECK IN ('open','active','finalized','expired') below
    fired_at_tick:                bigint('fired_at_tick', { mode: 'number' }),                                     // design §13.2 — null until engage
    opened_at_tick:               bigint('opened_at_tick', { mode: 'number' }).notNull(),
    deferral_count:               smallint('deferral_count').notNull().default(0),                                 // design §13.2 — CHECK <= 1 (single-use deferral, ★#5)
    decisions_budget:             smallint('decisions_budget').notNull(),                                          // design §13.2 — snapshotted at open (compression_max_decision_budget)
    decisions_used:                smallint('decisions_used').notNull().default(0),                               // design §13.2 — CHECK <= decisions_budget (I7)
    forced:                       boolean('forced').notNull().default(false),
    severity_multiplier_applied:  boolean('severity_multiplier_applied').notNull().default(false),
    stress_at_fire:               smallint('stress_at_fire'),
    finalized_at_tick:            bigint('finalized_at_tick', { mode: 'number' }),
  },
  (table) => ({
    state_chk: check('compression_events_state_chk', sql`${table.state} IN ('open', 'active', 'finalized', 'expired')`),
    deferral_count_chk: check('compression_events_deferral_count_chk', sql`${table.deferral_count} >= 0 AND ${table.deferral_count} <= 1`),
    // I7 (invariant table row I7): decisions_used never exceeds THIS cycle's own budget snapshot.
    decisions_used_chk: check('compression_events_decisions_used_chk', sql`${table.decisions_used} >= 0 AND ${table.decisions_used} <= ${table.decisions_budget}`),
    // I1 — at most ONE non-terminal ('open'/'active') compression cycle per player, DB-ENFORCED.
    non_terminal_unique_idx: uniqueIndex('compression_events_non_terminal_idx').on(table.player_id).where(sql`${table.state} IN ('open', 'active')`),
    // OBLIGATOIRE 1-N FK index (Task 3 §5.1) — PK is a synthetic id, not player_id (1-N per player, unlike friction_budget_state's 1-1 shape).
    player_idx: index('compression_events_player_idx').on(table.player_id),
  }),
);

export const compressionEventRelations = relations(compressionEvent, ({ one, many }) => ({
  player: one(player, {
    fields: [compressionEvent.player_id],
    references: [player.player_id],
  }),
  entries: many(compressionProblemEntry),
}));

// ===== Table 4 : compression_problem_entry (design §13.2/§10.1 — the board's rows, mig 0133) =====
// Snapshotted at fire (D11 — the board is a DOCUMENT of triage, not a live view). `source_kind` is a
// bounded varchar registry (the closed runtime ProblemAggregator source list, design §10.1 table), NOT a
// pgEnum (D1). UNIQUE (compression_event_id, problem_key) — dedup stable per source+ref within one cycle.
export const compressionProblemEntry = pgTable(
  'compression_problem_entry',
  {
    id:                       uuid('id').primaryKey().defaultRandom(),
    compression_event_id:     uuid('compression_event_id').notNull().references(() => compressionEvent.id, { onDelete: 'cascade' }),
    player_id:                uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),
    problem_key:              varchar('problem_key').notNull(),                                                    // design §13.2 — dedup stable par source+ref
    source_kind:              varchar('source_kind', { length: 32 }).notNull(),                                    // design §13.2 — closed runtime registry, NOT a pgEnum
    tier:                     varchar('tier', { length: 16 }).notNull(),                                           // design §13.2 — CHECK IN ('minor','moderate','critical') below
    target_ref:               jsonb('target_ref').notNull().default(sql`'{}'::jsonb`),
    revealed_by_entry_id:     uuid('revealed_by_entry_id'),                                                        // design §13.2/§10.3 — soft self-ref (no FK), never independently deleted (cascade only with parent event)
    addressed_at:             timestamp('addressed_at', { withTimezone: true }),
    decision_ref:             jsonb('decision_ref'),
    persisted:                boolean('persisted').notNull().default(false),                                       // design §13.2/§10.4 — re-seeded at the NEXT board when true
  },
  (table) => ({
    tier_chk: check('compression_problem_entry_tier_chk', sql`${table.tier} IN ('minor', 'moderate', 'critical')`),
    // Dedup stable per source+ref WITHIN one cycle (design §10.1). Leading column (compression_event_id)
    // also serves the "all entries of this board" scan — no separate plain index needed.
    event_key_unique: uniqueIndex('compression_problem_entry_event_key_unique').on(table.compression_event_id, table.problem_key),
    // OBLIGATOIRE 1-N FK index (Task 3 §5.1) — cross-cycle per-player BO diagnostics.
    player_idx: index('compression_problem_entry_player_idx').on(table.player_id),
  }),
);

export const compressionProblemEntryRelations = relations(compressionProblemEntry, ({ one }) => ({
  event: one(compressionEvent, {
    fields: [compressionProblemEntry.compression_event_id],
    references: [compressionEvent.id],
  }),
  player: one(player, {
    fields: [compressionProblemEntry.player_id],
    references: [player.player_id],
  }),
}));

// ===== Table 5 : compression_decay_state (design §8.3 — P3-E C6, mig 0134) =====
// 1-1 per-player W/14 idempotency watermark ONLY — see the file header for why this lives on its OWN
// table rather than on `player_progression_state` (DD-E-schema, that table's own zero-migration ruling).
// PK = FK player_id (calque `friction_budget_state` — 1-1 cache, aucun index secondaire nécessaire).
export const compressionDecayState = pgTable(
  'compression_decay_state',
  {
    player_id:                   uuid('player_id').primaryKey().references(() => player.player_id, { onDelete: 'cascade' }),
    last_quiet_decay_week_epoch: integer('last_quiet_decay_week_epoch').notNull().default(0),                        // design §8.3 — the COMPRESSION_QUIET_DECAY_TICK (W/14) epoch guard, `deriveWeekEpoch` (flag-weekly-reset-tick.service.ts) REUSE
  },
  (table) => ({
    epoch_chk: check('compression_decay_state_epoch_chk', sql`${table.last_quiet_decay_week_epoch} >= 0`),
  }),
);

export const compressionDecayStateRelations = relations(compressionDecayState, ({ one }) => ({
  player: one(player, {
    fields: [compressionDecayState.player_id],
    references: [player.player_id],
  }),
}));

// ===== Types inférés Drizzle =====
export type FrictionBudgetStateRow       = typeof frictionBudgetState.$inferSelect;
export type FrictionBudgetStateInsert    = typeof frictionBudgetState.$inferInsert;
export type ReplacementOptionRow         = typeof replacementOption.$inferSelect;
export type ReplacementOptionInsert      = typeof replacementOption.$inferInsert;
export type CompressionEventRow          = typeof compressionEvent.$inferSelect;
export type CompressionEventInsert       = typeof compressionEvent.$inferInsert;
export type CompressionProblemEntryRow   = typeof compressionProblemEntry.$inferSelect;
export type CompressionProblemEntryInsert= typeof compressionProblemEntry.$inferInsert;
export type CompressionDecayStateRow     = typeof compressionDecayState.$inferSelect;
export type CompressionDecayStateInsert  = typeof compressionDecayState.$inferInsert;
