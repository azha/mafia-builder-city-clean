// IMPLEMENTS: docs/tech/09_data_model/schema_core_loops.md §16 (mig 0137) -- P3-G C1 --
//             Design: docs/superpowers/specs/2026-07-19-p3-G-budgets-horizon-design.md §3
//             (data model, verbatim) + §9/§12 (adoption / isostatic debt).
//             Decisions: docs/superpowers/specs/2026-07-19-p3-G-budgets-horizon-decisions.md DD-G3.
//             -- P3-G C1 -- 2026-07-20
//
// `budgets_horizon.ts` — the 2 NEW tables P3-G (ch06 successor lot — Budgets & Horizon) adds in mig 0137:
//   `capability_adoptions` (at most ONE adoption per capability per player, permanent v1) +
//   `capability_debts` (Isostatic Debt ledger, PK composite mirrors `mastery_score`'s own shape).
// The THIRD surface this migration touches — the `possibility_horizon_cards` EXTENSION (enum member
// 'dismissed' + `predicate_regressed`/`dismissed_at`/`surfaced_predicate_snapshot` columns + the R10
// unique-pair index) — is mirrored in `progression_structural.ts` (the table's OWN home since ch09 Task
// 10), NOT here (mirrors `delegation_ratchet.ts`'s own precedent of leaving `player_progression_state`/
// `mastery_score` activation entirely inside `player_progression_state.ts`).
// ZERO pgEnum NEW in THIS file (D1-lot-wide convention, P3-B/C/D/E/F precedent reconduced) — `decay_path`
// is varchar+CHECK, mirrors `mastery_score.delegation_state`/`promotion_locks.unmanaged_window_state`.

import { pgTable, uuid, integer, smallint, bigint, numeric, varchar, timestamp, index, check, primaryKey } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { player } from './player'; // Task 3 — convention canonique FK player_id REUSE §5.1

// ===== Table 1 : capability_adoptions (design §3/§9 — at most ONE adoption per capability per player) =====
// PK composite (player_id, capability_id) — the mastery_score/player_proficiency shape (mig 0002/0135).
// Permanent v1 — no suspension columns until ★#3's DEFERRED engine exists (decisions §6 ★#3); adding
// them later is additive. Append-only applicative discipline — C5's `AdoptionService` INSERT-only
// repository, no update/delete method is EVER added (mirrors `graduation_events`'s own D13 discipline).
export const capabilityAdoption = pgTable(
  'capability_adoptions',
  {
    player_id:                uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),
    capability_id:              integer('capability_id').notNull(),                                                    // design §3 — CapabilityCatalogue code (C2, 201+), no FK: code-owned closed catalogue
    adopted_at:                 timestamp('adopted_at', { withTimezone: true }).notNull().defaultNow(),
    card_id:                    uuid('card_id'),                                                                        // design §3 — soft-ref to the adopted card (BO forensics), no FK
    free_units_at_adoption:     smallint('free_units_at_adoption').notNull(),                                          // design §3 — snapshot, the canon ComplexityUnlockEvent.free_units_at_unlock payload transposed
    game_tick:                  bigint('game_tick', { mode: 'number' }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.player_id, table.capability_id] }),
    // The player's own adoption-history read pattern (design §11 forensics) + the C4 recompute/C9
    // projection's own per-player scan.
    player_adopted_idx: index('capability_adoptions_player_adopted_idx').on(table.player_id, table.adopted_at.desc()),
  }),
);

export const capabilityAdoptionRelations = relations(capabilityAdoption, ({ one }) => ({
  player: one(player, {
    fields: [capabilityAdoption.player_id],
    references: [player.player_id],
  }),
}));

// ===== Table 2 : capability_debts (design §3/§12 — Isostatic Debt, PK mirrors mastery_score's shape) =====
// `structural_debt numeric(8,2)` CHECK >= 0 — the canon floor as a CHECK, belt-and-suspenders alongside
// the C7/C8 floor-guarded single-statement decrements (design §12.1/§12.3). `decay_path` mirrors
// `mastery_score.delegation_state`/`promotion_locks.unmanaged_window_state` — varchar+CHECK, never a
// native pgEnum for this closed-but-small value set (D1-lot-wide convention).
export const capabilityDebt = pgTable(
  'capability_debts',
  {
    player_id:            uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),
    capability_id:          integer('capability_id').notNull(),                                                        // design §3 — CapabilityCatalogue code
    capacity:                smallint('capacity').notNull().default(0),                                                // design §3 — post-upgrade units, BO-only (catalogue constant, e.g. 40 — decisions §15 invariant row)
    structural_debt:         numeric('structural_debt', { precision: 8, scale: 2 }).notNull().default('0'),            // design §3 — CHECK >= 0 below; numeric() string-mode (Drizzle), no float drift
    last_upgrade_tick:       bigint('last_upgrade_tick', { mode: 'number' }),
    last_decay_tick:         bigint('last_decay_tick', { mode: 'number' }),
    decay_path:              varchar('decay_path', { length: 8 }).notNull().default('NONE'),                           // design §3 — CHECK IN ('ACTIVE','PASSIVE','MIXED','NONE') below
    last_decay_binding:      varchar('last_decay_binding', { length: 16 }),                                            // mig 0139 (C7 remediation #25/★#6) — which CapabilityDecayBinding.kind ('bus_event'|'resolve_hook') stamped last_decay_tick, NULL until first decay; the per-resolve dedup guard's own marker (capability-debts.repository.ts#applyActiveDecay)
    last_passive_tick:       bigint('last_passive_tick', { mode: 'number' }),                                         // mig 0140 (C8) — the PASSIVE-decay-EXCLUSIVE elapsed-hours baseline; deliberately NOT last_decay_tick/last_decay_binding (the C7 active-decay dedup pair) — see mig 0140's own header for the coupling bug this avoids
  },
  (table) => ({
    pk: primaryKey({ columns: [table.player_id, table.capability_id] }),
    structural_debt_chk: check('capability_debts_structural_debt_chk', sql`${table.structural_debt} >= 0`),
    decay_path_chk: check('capability_debts_decay_path_chk', sql`${table.decay_path} IN ('ACTIVE', 'PASSIVE', 'MIXED', 'NONE')`),
    last_decay_binding_chk: check('capability_debts_last_decay_binding_chk', sql`${table.last_decay_binding} IS NULL OR ${table.last_decay_binding} IN ('bus_event', 'resolve_hook')`),
    // The C8 ISOSTATIC_DEBT_TICK (HOURLY/8) set-based decay scan's own query shape (canon F4 index
    // transposed) — "every row with outstanding debt", never a full-table scan.
    active_idx: index('capability_debts_active_idx').on(table.player_id).where(sql`${table.structural_debt} > 0`),
  }),
);

export const capabilityDebtRelations = relations(capabilityDebt, ({ one }) => ({
  player: one(player, {
    fields: [capabilityDebt.player_id],
    references: [player.player_id],
  }),
}));

// ===== Types inférés Drizzle =====
export type CapabilityAdoptionRow = typeof capabilityAdoption.$inferSelect;
export type CapabilityAdoptionInsert = typeof capabilityAdoption.$inferInsert;
export type CapabilityDebtRow = typeof capabilityDebt.$inferSelect;
export type CapabilityDebtInsert = typeof capabilityDebt.$inferInsert;
