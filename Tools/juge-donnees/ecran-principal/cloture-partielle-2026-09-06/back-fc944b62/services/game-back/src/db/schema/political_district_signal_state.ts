// IMPLEMENTS: docs/superpowers/plans/2026-07-05-04e-A2-political-events-plan.md C3 (state-driven trigger
//             evaluators + ledgers + district signal)
//             Design: docs/superpowers/specs/2026-07-04-04e-A-political-engine-design.md §6.4 (E-POL-12
//             "Restraint Index in a district has NO district axis" gap — recommendation (a): redefine
//             against a sustained per-district cohesion+heat signal that exists)
//             Decisions: docs/superpowers/specs/2026-07-05-04e-A2-political-events-decisions.md §4.2
//             (L1 redefinition, RULED: cohesion >= floor AND heat <= ceiling sustained over window_days,
//             per-district city-global) + sub-ruling (heat-ceiling = HeatBucket rank constant, NOT a raw
//             scalar — see `political.tunables.ts`'s `EPOL12_DISTRICT_HEAT_CEILING_BUCKET`) + §5
//             (migration allocation — mig 0113)
//             R9.3: docs/tech/09_data_model/schema_political_district_signal_state.md (created same-commit)
//             — 04e-A2 C3 — 2026-07-05
//
// TABLE (1 NEW — migration 0113):
//
//   political_district_signal_state — the per-district E-POL-12 sustained-good-behavior window
//     accumulator (design §6.4, L1). ONE row per district (PK district_id, FK -> districts(id) ON
//     DELETE CASCADE — mirrors `district_capacity_state`'s own "global, not per-player" posture,
//     `market_district_capacity_state.ts`). NOT a per-player table: E-POL-12's trigger is explicitly
//     "per-district city-global" (decisions §4.2, canon invariant #5 "affect ALL active players in
//     city") — the SAME city-global-state-on-a-per-player-firing-tick shape `political_calendar_state`
//     already establishes (mig 0111), just keyed by district instead of a fixed singleton id.
//
//     consecutive_good_days: the running streak — incremented by 1 on a day where the observed
//       district signal is "good" (`cohesion >= epol12_district_cohesion_floor` AND `HeatBucket <=
//       EPOL12_DISTRICT_HEAT_CEILING_BUCKET`, `political-trigger-evaluators.ts`'s
//       `evaluateDistrictConditionGoodToday`), reset to 0 the moment a day is NOT good
//       (`advanceDistrictSignalDay`, `political-event.repository.ts`). E-POL-12 is due once this streak
//       reaches `epol12_district_sustain_window_days` (`hasSustainedGoodBehavior`).
//     last_evaluated_game_day: nullable idempotency watermark (NULL until this district's first-ever
//       evaluation) — mirrors `political_calendar_state.last_evaluated_game_day` exactly: a claim only
//       advances the streak once per in-game day per district, so re-entrant same-day callers (however
//       many players' NIGHTLY firings land on the same day) are pure no-ops, never a double-increment.
//
//     WHICH PLAYER's cohesion/heat feeds a given day's observation is a C4/C5 wiring decision (out of
//     C3 scope, plan's own C3/C4/C5 split) — cohesion (`district_cohesion.cohesion`) and heat
//     (`HeatPropagationService.getDistrictPeakBucket`) are both PER-PLAYER state (no cross-player
//     aggregate accessor exists anywhere in the codebase today); this table's OWN day-idempotent claim
//     (below) makes it safe regardless of how that later decision resolves (worst-case AND / a
//     designated "reference" player / etc. — a genuine, narrow, honestly-flagged forward gap, NOT
//     fabricated here). C3 proves the accumulator + the pure predicates against REAL persisted/observed
//     single-context readings (falsifiable: district A sustained-good vs district B not, see
//     `political_state_triggers.spec.ts`).
//
// R9.3: this file matches migration 0113 byte-for-meaning.
//       ch09 mirror: docs/tech/09_data_model/schema_political_district_signal_state.md (same-commit).
// Anti-fabrication: no Math.random(), no non-deterministic defaults.
// Zero-regression: ADDITIVE only — no existing table/column modified by migration 0113.
// No player_id anywhere in this file: per-district city-global state (design §6.4 / decisions §4.2),
// not a per-player row shape — the R9.3 "FK player_id ... ON DELETE CASCADE" convention does not apply.

import { pgTable, integer, timestamp, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { districts } from './world_geography';

/**
 * `political_district_signal_state` — the per-district E-POL-12 sustained-good-behavior window
 * (migration 0113). Lazily ensured (`ensureDistrictSignalRow`, `political-event.repository.ts`) —
 * unlike `political_calendar_state`'s single seeded singleton, this table has up to 18 rows (one per
 * `districts` row) and a row is only created the first time that district is ever evaluated.
 */
export const politicalDistrictSignalState = pgTable(
  'political_district_signal_state',
  {
    district_id: integer('district_id')
      .primaryKey()
      .references(() => districts.id, { onDelete: 'cascade' }),

    /** The running "consecutive good days" streak (design §6.4) — never negative. */
    consecutive_good_days: integer('consecutive_good_days').notNull().default(0),

    /**
     * last_evaluated_game_day — the per-district idempotency watermark (nullable — NULL until this
     * district's first-ever evaluation). Mirrors `political_calendar_state.last_evaluated_game_day`'s
     * claim discipline (`advanceDistrictSignalDay`, `political-event.repository.ts`).
     */
    last_evaluated_game_day: integer('last_evaluated_game_day'),

    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('political_district_signal_state_streak_non_negative_chk', sql`${t.consecutive_good_days} >= 0`),
  ],
);

export type PoliticalDistrictSignalStateRow    = typeof politicalDistrictSignalState.$inferSelect;
export type PoliticalDistrictSignalStateInsert = typeof politicalDistrictSignalState.$inferInsert;
