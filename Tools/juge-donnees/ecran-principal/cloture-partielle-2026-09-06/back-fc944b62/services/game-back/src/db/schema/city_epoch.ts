// IMPLEMENTS: docs/superpowers/specs/2026-08-09-w1.1d-world-turns-design.md §C1.1 (the SUPPORT of the
//             city-global epoch — the v2 named the value but never specified where it lives; this is the
//             fix)
//             R9.3: docs/tech/09_data_model/schema_city_epoch.md (created same-commit)
//             — W1.1-d C1.1 — 2026-08-09 —
//
// TABLE (1 NEW — migration 0144):
//
//   city_epoch — the SINGLETON city-global "current in-game minute of the city" row. PK: `id` fixed to 1
//     (CHECK-enforced, seeded ONCE at migration time — mirrors `political_calendar_state`'s own
//     "no player_id FK, city-global, always exactly one row" posture, design §C1.1). A NEW player's
//     `city_sim_clock` row is seeded FROM this value at signup (C1.3), NOT from 0 — the ruling (§0/§1.3):
//     "un pilote de fond égalise les rythmes, jamais les valeurs" ; only a shared city-global epoch keeps
//     `game_minute` IN PHASE across players signed up at different real-world instants.
//
// REJECTED alternative (design §C1.1): a derived `MAX(game_minute) FROM city_sim_clock` — a MUTABLE
// shared resource (any spec that advances one player's clock silently moves the epoch of every
// later signup in the SAME shard, socle rule "supprimer la ressource partagée, jamais s'en
// accommoder"). A dedicated table is the only recevable realization.
//
// C2/C3 (NOT this chunk) own ADVANCING `game_minute` here (the bounded pilot). C1 poses ONLY the
// persistence + the seed-at-signup read (C1.3) + a `_test` seam to pin it for E2E (citysim-test.controller.ts,
// since no pilot exists yet in this chunk to move it organically — design §C1.2's own note: "le juge du
// dépôt ne peut PAS l'attraper" en horloge épinglée par défaut).
//
// Anti-fabrication: no Math.random(), no non-deterministic defaults.
// Zero-regression: ADDITIVE only — no existing table/column touched by migration 0144's city_epoch part.

import { pgTable, integer, bigint, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * `city_epoch` — the singleton city-global "current game-minute" row (migration 0144).
 *
 * `id` is always `1` (CHECK-enforced, seeded once at migration time — never lazily created at runtime,
 * the SAME posture `political_calendar_state.id` already establishes). There is exactly one row, forever.
 */
export const cityEpoch = pgTable(
  'city_epoch',
  {
    /** Fixed singleton marker — always 1 (CHECK-enforced below). */
    id: integer('id').primaryKey().default(1),

    /**
     * game_minute — the city-global in-game minute, advanced by the C3 bounded pilot (NOT this chunk).
     * A freshly-signed-up player's OWN `city_sim_clock.game_minute` is seeded from THIS value (C1.3) —
     * never from 0 — so two players signed up at different real-world instants start IN PHASE (design
     * §1.3: the family "per-player-firing, city-global-state" requires phase, not merely matching rhythm).
     * `bigint` mode 'number' — mirrors `city_sim_clock.game_minute`'s own type choice (same unit, same
     * magnitude concern over a save's lifetime).
     */
    game_minute: bigint('game_minute', { mode: 'number' }).notNull().default(0),
  },
  (t) => [
    check('city_epoch_singleton_chk', sql`${t.id} = 1`),
    check('city_epoch_game_minute_chk', sql`${t.game_minute} >= 0`),
  ],
);

export type CityEpochRow = typeof cityEpoch.$inferSelect;
export type CityEpochInsert = typeof cityEpoch.$inferInsert;
