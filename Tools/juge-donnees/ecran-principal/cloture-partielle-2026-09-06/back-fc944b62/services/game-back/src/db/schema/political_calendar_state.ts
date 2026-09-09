// IMPLEMENTS: docs/superpowers/plans/2026-07-05-04e-A2-political-events-plan.md C2 (city-global NIGHTLY
//             calendar eval tick)
//             Design: docs/superpowers/specs/2026-07-05-04e-A2-political-events-decisions.md §3 + §5
//             R9.3: docs/tech/09_data_model/schema_political_calendar_state.md (created same-commit)
//             — 04e-A2 C2 — 2026-07-05
//
// TABLE (1 NEW — migration 0111):
//
//   political_calendar_state — the SINGLETON city-global watermark row for the political calendar tick
//     (political-calendar-tick.service.ts, NIGHTLY/19.5). PK: `id` fixed to 1 (CHECK-enforced — a
//     structural "at most one row" table, mirroring `political_event_active`/`effect_modifier`'s own
//     "no player_id FK, city-global" posture, design §5.2 / canon invariant #5 "affect ALL active
//     players in city"). `last_evaluated_game_day` is the idempotency watermark the tick atomically
//     CLAIMS (SELECT ... FOR UPDATE + conditional UPDATE, political-event.repository.ts) so the FIRST
//     player's NIGHTLY firing for a given in-game day wins and every other/later firing for the SAME (or
//     an earlier) day is a pure no-op — no duplicate trigger evaluation. `scandal_noise_accumulator` is
//     the city-global running total the C3 E-POL-09 scandal-noise trigger will accumulate into and
//     compare against `political_events.epol09_scandal_noise_threshold` (political.tunables.ts, C1) —
//     this migration only creates the column; C2 never reads/writes it (C3 scope).
//
// R9.3: this file matches migration 0111 byte-for-meaning.
//       ch09 mirror: docs/tech/09_data_model/schema_political_calendar_state.md (created same-commit).
// Anti-fabrication: no Math.random(), no non-deterministic defaults.
// Zero-regression: ADDITIVE only — no existing table/column modified by migration 0111.
// No player_id anywhere in this file: this is a city-global singleton (design §5.2), not a per-player
// row shape — the R9.3 "FK player_id ... ON DELETE CASCADE" convention does not apply here.

import { pgTable, integer, numeric, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * `political_calendar_state` — the singleton city-global calendar-tick watermark (migration 0111).
 *
 * `id` is always `1` (CHECK-enforced, seeded once at migration time — never lazily created at
 * runtime, unlike `city_sim_clock`'s per-player lazy-create). There is exactly one row, forever.
 */
export const politicalCalendarState = pgTable(
  'political_calendar_state',
  {
    /** Fixed singleton marker — always 1 (CHECK-enforced below). */
    id: integer('id').primaryKey().default(1),

    /**
     * last_evaluated_game_day — the city-global idempotency watermark (nullable — NULL until the very
     * first-ever tick, the bootstrap baseline). The tick atomically claims a day via a row-locked
     * conditional UPDATE (`political-event.repository.ts`); a claim only succeeds when this column is
     * NULL or strictly less than the day being evaluated.
     */
    last_evaluated_game_day: integer('last_evaluated_game_day'),

    /**
     * scandal_noise_accumulator — the city-global running total for the E-POL-09 scandal-noise trigger
     * (C3 scope: accumulation logic lands there; this migration only creates the column). `numeric()`
     * string-mode (Drizzle) — mirrors `effect_modifier.magnitude`'s own no-float-drift choice (design
     * §2.3 determinism) for a running total that is compared against a threshold over many ticks.
     */
    scandal_noise_accumulator: numeric('scandal_noise_accumulator').notNull().default('0'),
  },
  (t) => [
    check('political_calendar_state_singleton_chk', sql`${t.id} = 1`),
  ],
);

export type PoliticalCalendarStateRow = typeof politicalCalendarState.$inferSelect;
export type PoliticalCalendarStateInsert = typeof politicalCalendarState.$inferInsert;
