// IMPLEMENTS: docs/tech/09_data_model/schema_core_loops.md§2 -- P3-A C1 (mig 0119 prov.) --
//             + P3-A C6-fix (mig 0121 prov. — ⊥ IMPORTANT-1 fold, DB-enforce one non-terminal card)
//
// `highest_leverage_cards` — the ONE new table P3-A adds (D11, design §3). Every OTHER table this lot
// touches (`gameplay_sessions`, `structural_decisions_audit`, `player_progression_state`,
// `exception_queue`) is REUSE-activated elsewhere (`sessions_and_audit.ts`, `progression_structural.ts`,
// `player_progression_state.ts`, `queues_exceptions_cuestack.ts`) — zero schema change to any of them
// this migration.
import {
  pgTable,
  uuid,
  integer,
  real,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { player } from './player';  // convention canonique FK player_id REUSE (Task 3 §5.1)

// ===== Enum PG natif =====
// hl_card_status — design §3 verbatim, 4 membres lowercase — the HighestLeverageCard lifecycle (D11):
// computed active -> either committed (governor-routed iff catalogue-structural, D8) or skipped
// (carries at same priority into the NEXT session) -> superseded when a fresher higher-scored
// candidate supplants a carried card.
export const hlCardStatus = pgEnum('hl_card_status', [
  'active',
  'committed',
  'skipped',
  'superseded',
]);

// ===== Table : highest_leverage_cards — design §3 verbatim (mig 0119 prov.) =====
// PK simple card_id uuid. FK player_id NOT NULL CASCADE (a card has no meaning outside its player).
// session_ref = soft-ref to gameplay_sessions (the surfacing session) — deliberately NO DB-side FK
// (design §3: "soft-ref gameplay_sessions") — a card legitimately outlives the session that surfaced
// it (skip-carry across session boundaries, D11); mirrors the ch09 soft-ref convention already used
// for constraint_log.knot_id / autonomy_reports.player_decision / admin_audit_log.target_player_id.
export const highestLeverageCardRow = pgTable(
  'highest_leverage_cards',
  {
    card_id:           uuid('card_id').primaryKey().defaultRandom(),                                                              // design §3 — uuid PK
    player_id:         uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),                  // design §3 — FK CASCADE
    session_ref:       uuid('session_ref'),                                                                                      // design §3 — soft-ref gameplay_sessions, NO FK (nullable)
    decision_type:     integer('decision_type').notNull(),                                                                       // design §3 — catalogue code, aligned structural_decisions_audit.decision_type (progression_structural.ts:128)
    target_ref:        jsonb('target_ref').notNull().default(sql`'{}'::jsonb`),                                                   // design §3 — provider-owned compact ref, NEW NOT NULL + default safe-empty
    impact_internal:   real('impact_internal').notNull(),                                                                        // design §3 — server-only raw [0..1] float (R2.2 BO-only, no default: every provider candidate computes it)
    urgency_internal:  real('urgency_internal').notNull(),                                                                       // design §3 — server-only raw [0..1] float (R2.2 BO-only)
    options:           jsonb('options').notNull().default(sql`'[]'::jsonb`),                                                       // design §3 — 2..4 qualitative DecisionOption, NEW NOT NULL + default safe-empty
    status:            hlCardStatus('status').notNull().default('active'),                                                       // design §3 — lifecycle enum, default 'active' at compute
    surfaced_at:       timestamp('surfaced_at', { withTimezone: true }).notNull().defaultNow(),                                   // design §3 — NOT NULL DEFAULT now()
    resolved_at:       timestamp('resolved_at', { withTimezone: true }),                                                          // design §3 — nullable (unresolved = null)
  },
  (table) => ({
    // (player_id, status): the session-open "active/carried card" hot-path probe (design §3 index 1).
    player_status_idx:    index('highest_leverage_cards_player_status_idx').on(table.player_id, table.status),
    // (player_id, surfaced_at DESC): BO diagnostic history ordering (design §3 index 2).
    player_surfaced_idx:  index('highest_leverage_cards_player_surfaced_idx').on(table.player_id, table.surfaced_at.desc()),
    // UNIQUE partial index — at most ONE non-terminal (active/skipped) card per player — mig 0121
    // (P3-A C6-fix, ⊥ IMPORTANT-1): DB-ENFORCES the top-1 "currently carried card" invariant (was
    // app-enforced only via `HlCardRepository#findCarried`'s own read-then-write — reviewer
    // reproduced 2+ active rows under 12 concurrent opens with seeded substrate). `HlCardService
    // #computeAndPersist` is now called ONLY on the `SessionRepository#openFresh` race-WINNER path
    // (the loser skips it entirely — mirrors the loser already skipping the progression-reset
    // UPDATE); `HlCardRepository#insertActive` ALSO targets this index with `onConflictDoNothing`
    // (defense in depth) and re-reads the surviving row on conflict. NB: columns via the `table`
    // param (not the `const`) to avoid the TS7022 self-reference circularity; SQL identical.
    non_terminal_unique_idx: uniqueIndex('highest_leverage_cards_non_terminal_idx')
      .on(table.player_id)
      .where(sql`${table.status} IN ('active', 'skipped')`),
  }),
);

export const highestLeverageCardRelations = relations(highestLeverageCardRow, ({ one }) => ({
  player: one(player, {
    fields: [highestLeverageCardRow.player_id],
    references: [player.player_id],
  }),
}));

// ===== Types inférés Drizzle =====
export type HighestLeverageCardRow    = typeof highestLeverageCardRow.$inferSelect;
export type HighestLeverageCardInsert = typeof highestLeverageCardRow.$inferInsert;

// ===== Enum TS mirror PG natif =====
export type HlCardStatusEnumTs = (typeof hlCardStatus.enumValues)[number];
// 'active' | 'committed' | 'skipped' | 'superseded'
