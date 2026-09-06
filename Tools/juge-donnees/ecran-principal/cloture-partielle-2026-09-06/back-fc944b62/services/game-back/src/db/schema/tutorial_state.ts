// IMPLEMENTS: docs/superpowers/specs/2026-08-09-w1.1b-overlay-engine-design.md §4 C1 (D3 —
//             `tutorial_id` varchar(64), never a pgEnum; D4 — `tutorials_opt_out` placement + M2
//             explicit GRANT/REVOKE; D8-2 — the PK's functional reason)
//             Canon: docs/tech/08c_remaining_screens/screen_c8_first_time_tutorial.md §11 NestJS —
//             backend jeu (:335-344, table DDL verbatim)
//             R9.3: docs/tech/09_data_model/schema_tutorial_state.md (created same-commit — NEW to
//             09; the 08c canon declared this table as a document since 2026-05, 09 never carried it)
//             — W1.1-b C1 — 2026-08-09 —
//
// TABLE (1 NEW — migration 0146):
//
//   tutorial_state — the tutorial overlay SYSTEM's own persistence (owned 08c as a DOCUMENT since
//   2026-05, but NEVER BUILT until this migration — design §0.2 measured 0 hits on 8 canon symbols
//   repo-wide: this is REUSE of a document, not of code). ONE row per (player_id, tutorial_id) EVER
//   shown — append-only, "shown at most once" (GDD L502) is a base error (PK / `ON CONFLICT DO
//   NOTHING` at `TutorialOverlayService.markShown` — W1.1-b C3, LIVE, tutorial-overlay.service.ts:57),
//   never an application promise.
//   The PK is ALSO the FUNCTIONAL reason "first" reads per-PLAYER, never per-city (design D8-2): the
//   city-global epoch (0144_city_epoch) means a new signup joins a world already in motion.
//
// `player_progression_state.tutorials_opt_out` (SAME migration 0146, design D4) is declared in
// `player_progression_state.ts`, not here — it is a column on an EXISTING table, not part of this
// NEW table.
//
// Anti-fabrication: no Math.random(), no non-deterministic defaults beyond `now()` at insert time.
// Zero-regression: ADDITIVE only — a NEW table, no existing table/column touched by this file.

import { pgTable, uuid, varchar, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { player } from './player';

/**
 * `tutorial_state` — one row per (player_id, tutorial_id) the player has EVER been shown
 * (migration 0146). PK `(player_id, tutorial_id)` makes "shown at most once" structural, not
 * applicative (screen_c8:225-227,341). Append-only: `app_rw` has SELECT+INSERT only, UPDATE/DELETE
 * EXPLICITLY REVOKEd (design D4/M2, never left to the implicit `ALTER DEFAULT PRIVILEGES` cover) —
 * an opt-out (`player_progression_state.tutorials_opt_out`) flips a flag, it never deletes rows here
 * (screen_c8:227).
 */
export const tutorialState = pgTable(
  'tutorial_state',
  {
    player_id: uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),

    /**
     * `varchar(64)`, NOT a pgEnum (design D3 + its precondition I2) — the canon defines TWO OPEN id
     * families (`tutorial.exception_card.<category_key>`, `tutorial.pillar_threshold.
     * <threshold_key>`, screen_c8:212,214) a pgEnum cannot hold without a migration per new member.
     * The v1 CLOSED-union compile-time guarantee lives in the SERVICE-side `TUTORIAL_ID_CATALOGUE`
     * (W1.1-b C3, LIVE — tutorial-id-catalogue.ts), never in the column type. Form matches the canon
     * verbatim (screen_c8:339) — this is not a deviation.
     */
    tutorial_id: varchar('tutorial_id', { length: 64 }).notNull(),

    shown_at: timestamp('shown_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.player_id, t.tutorial_id] })],
);

export const tutorialStateRelations = relations(tutorialState, ({ one }) => ({
  player: one(player, {
    fields: [tutorialState.player_id],
    references: [player.player_id],
  }),
}));

export type TutorialStateRow = typeof tutorialState.$inferSelect;
export type TutorialStateInsert = typeof tutorialState.$inferInsert;
