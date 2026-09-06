// IMPLEMENTS: docs/superpowers/plans/2026-07-05-04e-A2-political-events-plan.md C3 (state-driven trigger
//             evaluators + ledgers + district signal)
//             Design: docs/superpowers/specs/2026-07-04-04e-A-political-engine-design.md §6.2a (E-POL-11
//             gap #1 — "no persisted rival-elimination count — RivalEliminatedEvent fires but no ledger.
//             Build a small subscriber → a rival_elimination_ledger (player_id, game_minute) and derive
//             '2+ in 6 months'")
//             Decisions: docs/superpowers/specs/2026-07-05-04e-A2-political-events-decisions.md §5
//             (migration allocation — mig 0112)
//             R9.3: docs/tech/09_data_model/schema_rival_elimination_ledger.md (created same-commit)
//             — 04e-A2 C3 — 2026-07-05
//
// TABLE (1 NEW — migration 0112):
//
//   rival_elimination_ledger — per-player history of `RivalEliminatedEvent`s (design §6.2a). The event
//     already fires on `CityEventBus` (`RivalEliminationService.executeElimination`, C-cas §9.2,
//     `city-event-bus.ts:1327-1334`) but was NEVER persisted before this migration — E-POL-11's "2+
//     rival eliminations in past 6 months" trigger half (catalogue.md :161) had no real source. This
//     table + `political-rival-elimination-ledger.service.ts`'s bus subscriber (C3) give it one: every
//     REAL `RivalEliminatedEvent` (never a synthetic/test-only write path) appends exactly one row.
//
//     PK: id (uuid). FK: player_id → player(player_id) ON DELETE CASCADE (R9.3 convention).
//     rival_key: the SAME `rival_key` pgEnum `conflict_rival.ts` already declares (04b-A mig 0081) —
//       REUSED, never re-declared (mirrors `political.types.ts`'s narrowing discipline). NO FK to
//       `rival_state` — this is a soft-ref by enum domain only, the SAME discipline `rival_holding`/
//       `rival_pair_pressure` already use for `rival_key` (conflict_rival.ts header: "no FK to global
//       rival keys or any global static table"); the ledger is a permanent historical record that must
//       outlive any per-player rival_state row churn.
//     game_minute: the in-game minute the elimination committed (matches `RivalEliminatedEvent.
//       gameMinute` verbatim) — the E-POL-11 rolling-window count is computed over THIS column (a
//       6-in-game-month window, `political_events.month_minutes × 6` — a canon-literal "6 months"
//       constant, not a NEW tunable; see `political-trigger-evaluators.ts`).
//     compounding_penalty_bucket: the qualitative bucket the event ALSO carries (R2.2 — never a raw
//       multiplier) — persisted for BO/diagnostic read-back only; NOT consumed by the E-POL-11
//       predicate (which only needs the row's existence + game_minute for the rolling count).
//
// R9.3: this file matches migration 0112 byte-for-meaning.
//       ch09 mirror: docs/tech/09_data_model/schema_rival_elimination_ledger.md (created same-commit).
// Anti-fabrication: no Math.random(), no non-deterministic defaults. game_minute is always the caller's
//   (the bus event's) explicit value — never `Date.now()`.
// Zero-regression: ADDITIVE only — no existing table/column modified by migration 0112.

import { pgTable, uuid, integer, text, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { player } from './player';
import { rivalKey } from './conflict_rival'; // REUSE — never re-declared (04b-A mig 0081)

/**
 * `rival_elimination_ledger` — one row per REAL `RivalEliminatedEvent` (migration 0112). Append-only:
 * `political-rival-elimination-ledger.service.ts`'s `onModuleInit` bus subscriber is the ONLY writer.
 */
export const rivalEliminationLedger = pgTable(
  'rival_elimination_ledger',
  {
    id:        uuid('id').primaryKey().defaultRandom(),
    player_id: uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),
    /** REUSE `conflict_rival.ts`'s `rival_key` pgEnum (coil|tarcum|iron_throat|saltline) — no FK to rival_state. */
    rival_key: rivalKey('rival_key').notNull(),
    /** The in-game minute the 4-penalty elimination tx committed (verbatim `RivalEliminatedEvent.gameMinute`). */
    game_minute: integer('game_minute').notNull(),
    /** Qualitative compounding-penalty bucket (R2.2 — never the raw multiplier). BO/diagnostic read-back only. */
    compounding_penalty_bucket: text('compounding_penalty_bucket').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // The E-POL-11 rolling-window count's hot path: "how many rows for this player in the last N minutes".
    index('rival_elimination_ledger_player_minute_idx').on(t.player_id, t.game_minute),
  ],
);

export const rivalEliminationLedgerRelations = relations(rivalEliminationLedger, ({ one }) => ({
  player: one(player, { fields: [rivalEliminationLedger.player_id], references: [player.player_id] }),
}));

export type RivalEliminationLedgerRow    = typeof rivalEliminationLedger.$inferSelect;
export type RivalEliminationLedgerInsert = typeof rivalEliminationLedger.$inferInsert;
