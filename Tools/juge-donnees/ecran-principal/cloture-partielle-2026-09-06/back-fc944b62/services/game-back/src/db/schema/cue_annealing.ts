// IMPLEMENTS: docs/tech/09_data_model/schema_core_loops.md §11 -- P3-D C1 (mig 0129) --
//
// `named_sequences` + `annealing_state` — the 2 NEW core-loops tables P3-D C1 adds (design §8/§9.1/§13,
// D7/D8). The 3rd piece of this chunk's data model (4 ADDITIVE `cue_stacks` bookkeeping columns +
// partial UNIQUE index I1, design §4.1) lives on `cue_stacks` itself — see
// `queues_exceptions_cuestack.ts`'s own header note pointing back here, and
// `schema_queues_exceptions_cuestack.md`'s own "Activation P3-D" addendum for the ch09 addendum.
//
// `named_sequences` (Loop 6 — Cue Stack Integrity, the "one-tap auto-queue" template): D7 (decisions
// §1.7) — a snapshot of a FULL stack (types + targets + dependencies + order, NO statuses), closes the
// ch09 Task 9 gap `schema_queues_exceptions_cuestack.md §Hors périmètre` explicitly deferred to "a
// dedicated future chunk". `UNIQUE (player_id, name)` — a second save under the same name is a 409,
// never a silent overwrite. Cap 5 (I4) is DB-atomic at the INSERT (`INSERT … SELECT … WHERE count(*) <
// cap RETURNING`, C5) — NOT expressible as a CHECK (a per-player row-count cap), so this table carries
// zero cap-enforcement DDL of its own.
//
// `annealing_state` (Loop 7 — Annealing Window, the per-NODE settling ledger): D8 (decisions §1.8,
// ★#1 RULED (a) coexist-disjoint) — the BUILDING dimension ONLY, a SEPARATE 1-1 table (PK `(player_id,
// building_id)`, the `supply_node_pressure` shape, mig 0125) rather than any touch of the PRE-EXISTING
// Phase-11 `lieutenant.settling_until_tick` (zero column/assertion modified there — the two "settling"
// mechanisms share NO effect, only a projective read at the rolling-decision-queue, C7). `throughput_
// multiplier` gets BOTH bounds as a DB CHECK (design §9.1 verbatim `(0, 1]`) — unlike `supply_chain_
// legs.debt_load`'s floor-only asymmetry (mig 0125): the multiplier only ever SHRINKS via compounding,
// no tunable-raise tension on a ceiling. `settled` is the sweep's OWN exactly-once bookkeeping flag
// (I6) — the app-facing "is this node settling" predicate is DERIVED (`NOT settled AND settling_ends_at
// > now()`, design §9.1, P1 state-not-timer strict), never read off a stored countdown.
import {
  pgTable,
  uuid,
  text,
  smallint,
  real,
  boolean,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
  primaryKey,
  check,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { player } from './player';        // convention canonique FK player_id REUSE schema_player.md §5.1
import { building } from './city_state';  // FK logique building_id REUSE schema_city_state.md §2

// ===== Table : named_sequences — design §8/§13.2 verbatim (mig 0129) =====
export const namedSequenceRow = pgTable(
  'named_sequences',
  {
    sequence_id:     uuid('sequence_id').primaryKey().defaultRandom(),                                                    // design §13.2 — uuid PK
    player_id:       uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),            // design §13.2 — FK CASCADE
    name:            text('name').notNull(),                                                                              // design §13.2 — player-chosen label
    slots_template:  jsonb('slots_template').notNull(),                                                                   // design §13.2 — snapshot: types+targets+dependencies+order, NO statuses. CHECK 4..8 (mirrors cs_slots_length_chk).
    created_at:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),                              // design §13.2 — NOT NULL DEFAULT now()
  },
  (table) => ({
    // (player_id): the C5 list-sequences hot path.
    player_idx: index('named_sequences_player_idx').on(table.player_id),
    // UNIQUE (player_id, name) — D7: a second save under the same name is a 409, never a silent
    // overwrite. The C5 cap-5 insert (I4) is DB-atomic (INSERT … SELECT … WHERE count < cap RETURNING),
    // NOT expressed here — a per-player row-count cap is not a per-row CHECK.
    player_name_unique: uniqueIndex('named_sequences_player_name_unique').on(table.player_id, table.name),
    // A template IS a valid compose-able stack — same 4..8 bound as cs_slots_length_chk (mig 0007),
    // minus the "0 OR" branch (a saved template is never empty).
    slots_template_length_chk: check(
      'named_sequences_slots_template_length_chk',
      sql`jsonb_array_length(${table.slots_template}) BETWEEN 4 AND 8`,
    ),
  }),
);

export const namedSequenceRelations = relations(namedSequenceRow, ({ one }) => ({
  player: one(player, { fields: [namedSequenceRow.player_id], references: [player.player_id] }),
}));

// ===== Table : annealing_state — design §9.1/§13.2 verbatim (mig 0129) =====
export const annealingStateRow = pgTable(
  'annealing_state',
  {
    player_id:                 uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),         // design §9.1 — FK CASCADE, PK component
    building_id:                uuid('building_id').notNull().references(() => building.building_id, { onDelete: 'cascade' }),   // design §9.1 — FK CASCADE, PK component
    initiating_change:          jsonb('initiating_change').notNull(),                                                            // design §9.1 — ChangeRef {change_type, ref}, jsonb (closed runtime registry, NOT a pgEnum, D1)
    settling_started_at:        timestamp('settling_started_at', { withTimezone: true }).notNull(),                              // design §9.1 — NOT NULL, set at initiation
    settling_ends_at:           timestamp('settling_ends_at', { withTimezone: true }).notNull(),                                 // design §9.1 — server-only R2.2. The state-not-timer anchor (derived predicate reads this + now(), never a stored countdown).
    changes_during_settling:    smallint('changes_during_settling').notNull().default(0),                                        // design §9.1 — compounding counter. CHECK >= 0 (non-negative counter).
    throughput_multiplier:      real('throughput_multiplier').notNull().default(0.9),                                            // design §9.1 — server-only R2.2. CHECK (0, 1] (BOTH bounds DB-enforced — unlike supply_chain_legs.debt_load's floor-only asymmetry).
    compounding_history:        jsonb('compounding_history').notNull().default(sql`'[]'::jsonb`),                                 // design §9.1 — bounded diagnostic history (BO-only, DD-ANNEAL-SINGLETON — no separate event table, F4 memory budget).
    settled:                    boolean('settled').notNull().default(false),                                                     // design §9.1 — the sweep's OWN exactly-once bookkeeping flag (I6). NOT the app-facing "is settling" predicate (that's derived: NOT settled AND settling_ends_at > now()).
    last_sweep_at:              timestamp('last_sweep_at', { withTimezone: true }),                                              // design §9.1 — nullable, diagnostic (never-swept row = null).
  },
  (table) => ({
    pk: primaryKey({ columns: [table.player_id, table.building_id] }),
    // Design §9.1 verbatim: BOTH bounds DB-enforced (the multiplier only ever shrinks via compounding —
    // no tunable-raise tension on a ceiling, unlike supply_chain_legs.debt_load's floor-only asymmetry).
    throughput_multiplier_chk: check(
      'annealing_state_throughput_multiplier_chk',
      sql`${table.throughput_multiplier} > 0 AND ${table.throughput_multiplier} <= 1`,
    ),
    // Non-negative counter (the established convention — supply_chain_legs.stress_streak / route.
    // patch_count, mig 0125): the compounding count only ever increments (I5, UPSERT arithmetic in SQL).
    changes_during_settling_chk: check(
      'annealing_state_changes_during_settling_chk',
      sql`${table.changes_during_settling} >= 0`,
    ),
    // The sweep's own per-tick scan (ANNEALING_SETTLE_SWEEP, MINUTE/30 provisional, C6): organic no-op
    // for players with no live settling row (mirrors supply_node_pressure_blocked_idx, mig 0125).
    // NB : colonnes via le param `table` (et non le `const`) pour éviter la self-réf circulaire TS7022.
    unsettled_idx: index('annealing_state_unsettled_idx').on(table.settling_ends_at).where(sql`${table.settled} = false`),
  }),
);

export const annealingStateRelations = relations(annealingStateRow, ({ one }) => ({
  player:   one(player,   { fields: [annealingStateRow.player_id],   references: [player.player_id] }),
  building: one(building, { fields: [annealingStateRow.building_id], references: [building.building_id] }),
}));

// ===== Types inférés Drizzle =====
export type NamedSequenceRow      = typeof namedSequenceRow.$inferSelect;
export type NamedSequenceInsert   = typeof namedSequenceRow.$inferInsert;
export type AnnealingStateRow     = typeof annealingStateRow.$inferSelect;
export type AnnealingStateInsert  = typeof annealingStateRow.$inferInsert;
