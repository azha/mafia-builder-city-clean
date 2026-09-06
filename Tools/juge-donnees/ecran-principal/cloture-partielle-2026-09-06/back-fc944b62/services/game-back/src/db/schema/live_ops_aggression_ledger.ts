// IMPLEMENTS: docs/superpowers/plans/2026-07-06-04e-B-liveops-plan.md C6 (AggressionScoreBucket
//             composite + live_ops_aggression_ledger + E-LO-06 targeting)
//             Design: docs/superpowers/specs/2026-07-06-04e-B-liveops-design.md §3.6
//             (live_ops_aggression_ledger) + §13 (migration renumbering: this is 0116, was 0115 —
//             DD-B4 took 0115 for the live_ops_active_status ENDED enum member)
//             Canon: docs/tech/04e_political_events_and_liveops/liveops_event_catalogue.md :108-117
//             (E-LO-06 — "4+ violent ops in 7 days" + "Note R2.2-borderline ... Composite:
//             AggressionScoreBucket ... Internal scalar count, exposed only as bucket")
//             docs/tech/09_data_model/schema_live_ops_aggression_ledger.md (R9.3 backport — same-commit)
//             Mirror: services/game-back/src/db/schema/rival_elimination_ledger.ts (04e-A2 C3 — the
//             bus-subscriber-backed ledger pattern this file adapts to the real-clock chapter)
//             — 04e-B C6 — 2026-07-06
//
// TABLE (1 NEW — migration 0116):
//
//   live_ops_aggression_ledger — per-player history of REAL `AssaultCascadeCompletedEvent`s (04b-B
//     C-cas §9.1, `city-event-bus.ts`, emitted by `ConflictOrchestratorService.recordAssaultCascade`
//     AFTER its 5-layer SERIALIZABLE cascade tx commits). The event already fires on the bus but was
//     NEVER persisted before this migration — E-LO-06's "4+ violent ops in 7 days" targeting half
//     (catalogue.md :111) had no real source. This table + `live-ops-aggression-ledger.service.ts`'s
//     `onModuleInit` bus subscriber (C6) give it one: every REAL `AssaultCascadeCompletedEvent`
//     (never a synthetic/test-only write path) appends exactly one row.
//
//     PK: id (uuid). FK: player_id -> player(player_id) ON DELETE CASCADE (R9.3 convention).
//     occurred_at: timestamptz — the REAL instant the subscriber received the event, written from the
//       injected `LiveOpsClockPort.now()` (DD-B3, NEVER an inline `Date.now()`/`new Date()` in
//       production mechanic code). DELIBERATELY NOT an in-game `game_minute` integer (unlike A2's
//       `rival_elimination_ledger.game_minute`) — this chapter's own real-clock discipline (DD-B3)
//       makes every live-ops duration/window a REAL calendar quantity, and
//       `AssaultCascadeCompletedEvent` itself carries only an in-game `gameMinute` (no real-world
//       timestamp) — so `occurred_at` is stamped at RECEIPT time by the subscriber, exactly mirroring
//       how `live_ops_event_active.started_at` is written from the SAME clock port at INSERT time
//       (migration 0114), not derived from any in-game field.
//
// R2.2: the windowed COUNT over this table is INTERNAL only (`AggressionScoreBucketService`,
// `cohort-targeting.service.ts`'s E-LO-06 resolution) — the derived `AggressionScoreBucket` enum
// (`peaceful|active|aggressive|violent_spree`, a plain TS union — NOT persisted as a column here,
// bucketized at READ time from the count) is the only thing ever allowed to reach a controller
// response, and even then ONLY the gated `_test/liveops/aggression-bucket` probe exposes it today (no
// player/BO surface exists yet — C8/C9).
//
// R9.3: this file matches migration 0116 byte-for-meaning.
//       ch09 mirror: docs/tech/09_data_model/schema_live_ops_aggression_ledger.md (created same-commit).
// Anti-fabrication: no Math.random(), no non-deterministic defaults. occurred_at is always the
//   caller's (the bus event handler's) explicit `LiveOpsClockPort.now()` value — never a DB-side
//   `defaultNow()` (unlike `rival_elimination_ledger.created_at`) — because occurred_at is the
//   SEMANTIC field the E-LO-06 windowed count reads, and it must be the SAME injectable/mockable
//   real-clock instant every other live-ops real-time mechanic uses (E2E determinism, DD-B3).
// Zero-regression: ADDITIVE only — no existing table/column modified by migration 0116.

import { pgTable, uuid, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { player } from './player';

/**
 * `live_ops_aggression_ledger` — one row per REAL `AssaultCascadeCompletedEvent` (migration 0116).
 * Append-only: `live-ops-aggression-ledger.service.ts`'s `onModuleInit` bus subscriber is the ONLY
 * writer.
 */
export const liveOpsAggressionLedger = pgTable(
  'live_ops_aggression_ledger',
  {
    id:          uuid('id').primaryKey().defaultRandom(),
    player_id:   uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),
    /** The REAL instant the subscriber received the event (`LiveOpsClockPort.now()`, DD-B3 — NEVER an
     *  inline `Date.now()`). NO default — every INSERT explicitly supplies it (anti-fabrication). */
    occurred_at: timestamp('occurred_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    // The E-LO-06 windowed-count hot path: "how many rows for this player within the trailing N real days".
    index('live_ops_aggression_ledger_player_occurred_idx').on(t.player_id, t.occurred_at),
  ],
);

export const liveOpsAggressionLedgerRelations = relations(liveOpsAggressionLedger, ({ one }) => ({
  player: one(player, { fields: [liveOpsAggressionLedger.player_id], references: [player.player_id] }),
}));

export type LiveOpsAggressionLedgerRow    = typeof liveOpsAggressionLedger.$inferSelect;
export type LiveOpsAggressionLedgerInsert = typeof liveOpsAggressionLedger.$inferInsert;
