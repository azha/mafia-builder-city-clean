// IMPLEMENTS: docs/superpowers/plans/2026-07-13-04g-A-constant-hum-plan.md C1 (mig 0127 + schema)
//             Design: docs/superpowers/specs/2026-07-13-04g-A-constant-hum-design.md §4 (data model)
//             R9.3: docs/tech/09_data_model/schema_ambient_world.md (created same-commit)
//             — 04g-A C1 — 2026-07-13
//
// TABLES (3 NEW — migration 0127) + 3 pgEnums:
//
//   constant_hum_cell — the city-global 168-cell weekly heat baseline grid (design §3.1). PK composite
//     (district_id, hour_of_week) — the composite key IS the structural cap (18 districts × 168 hours =
//     3 024 rows max, D3). `baseline_heat_ema` folds AVG(building.heat) cross-player per district every
//     HOURLY tick (CONSTANT_HUM_CELL_TICK, HOURLY/6, constant-hum.service.ts). Cells are created LAZILY
//     at first fold — no seed-3024-rows-at-boot.
//
//   ambient_micro_event — the Poisson micro-event stream (design §3.2, C2 scope — this migration only
//     creates the table; the generator/decay-sweep service lands C2). `kind` is the closed 6-member
//     canon-verbatim domain; `channel` is derived from `kind` (D6); `status` is the live→attended|expired
//     lifecycle (design §3.3/§3.2).
//
//   off_hours_drift_detection — the Off-Hours Drift detector's trip ledger (design §3.4, C3 scope — this
//     migration only creates the table; OffHoursDriftDetector lands C3). Primarily one row per district
//     TRIP (`cells_over_threshold >= off_hours_drift_min_cells`, an Exception card fan-out follows), PLUS
//     one COLD-START CALIBRATION row (`cells_over_threshold = 0`, no card) the FIRST time a district's
//     off-hours cells mature with no prior row to compare against — see `off-hours-drift.detector.ts`'s
//     own header (C3) for the full D10 baseline-mechanics resolution (`[needs reviewer⊥]`, TD-245). A
//     `baseline_snapshot` jsonb captures the rolling reference the NEXT detector pass compares against,
//     for EITHER row kind (D10 "roulant").
//
// R9.3: this file matches migration 0127 byte-for-meaning.
//       ch09 mirror: docs/tech/09_data_model/schema_ambient_world.md (created same-commit).
// Anti-fabrication: no Math.random(), no non-deterministic defaults anywhere in this file.
// Zero-regression: ADDITIVE only — no existing table/column modified by migration 0127.
// FK convention: all 3 tables FK district_id → districts(id) ON DELETE CASCADE (districts are GLOBAL
//   static rows, effectively never deleted — CASCADE is defensive, mirrors district_cohesion's own
//   player_id CASCADE posture applied to the district axis here). ambient_micro_event.attended_by_
//   player_id is ON DELETE SET NULL (NOT in the GDPR hard-delete table list, persistence_rules.md §2.4 —
//   a player deletion clears the attribution but the ambient event row itself is city-global content,
//   never player-owned; mirrors gdpr_deletion_request's own "no re-identifiable PII, keep the row" posture).

import { pgTable, pgEnum, uuid, integer, smallint, bigint, numeric, jsonb, timestamp, primaryKey, index, check } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { districts } from './world_geography';
import { player } from './player';

// ===== Enums PG natifs (3 NEW — migration 0127) =====

/** The 6 canon-verbatim micro-event kinds (design §3.2, CATALOGUE_REPORT.md :1218 "a corner fight, a
 *  stalled tram, a delayed shipment, a noisy block, a building inspection, a rumor in a bar"). */
export const ambientMicroEventKind = pgEnum('ambient_micro_event_kind', [
  'corner_fight',
  'stalled_tram',
  'delayed_shipment',
  'noisy_block',
  'building_inspection',
  'bar_rumor',
]);

/** The 3 canon channels (design §3.2/D6) — derived from `kind`, never independently chosen. */
export const ambientChannel = pgEnum('ambient_channel', ['constant_hum', 'trade_channel', 'bar_talk']);

/** The micro-event lifecycle (design §3.2/§3.3): live → attended (terminal, player-read) | expired
 *  (terminal, decay sweep — "routine residue", D9). */
export const ambientMicroEventStatus = pgEnum('ambient_micro_event_status', ['live', 'attended', 'expired']);

// ===== Table 1 : constant_hum_cell — 168-cell weekly heat baseline grid (design §3.1/§4) =====
// PK composite (district_id, hour_of_week) — the composite key itself is the structural 168-cap
// (Scenario 1 canon: `liveops_templates.constant_hum_cells_per_week` is hot_reloadable: NO — the cap is
// enforced by this table's shape + the hour_of_week CHECK below, never by a tunable read at write time).
export const constantHumCell = pgTable(
  'constant_hum_cell',
  {
    district_id: integer('district_id').notNull().references(() => districts.id, { onDelete: 'cascade' }),
    /** 0..167 = (game_day % 7) * 24 + hour_of_day — CHECK below enforces the structural cap. */
    hour_of_week: smallint('hour_of_week').notNull(),
    /** numeric() string-mode (Drizzle) — mirrors effect_modifier.magnitude's no-float-drift choice
     *  (design §3.1 determinism: "re-run même état ⇒ byte-identique"). INTERNAL scalar, server-side only
     *  (canon "Internal scalars server-side" — R2.2 does not apply to this city-global aggregate; a
     *  player-facing surface, if ever built, would go through a projection — design §6). */
    baseline_heat_ema: numeric('baseline_heat_ema').notNull(),
    /** Diagnostic + D10 drift-detection maturity gate (cells with sample_count < 4 excluded, C3 scope). */
    sample_count: integer('sample_count').notNull().default(0),
    /** The per-cell idempotency watermark: the city-sim engine is per-player-clocked (every player's own
     *  HOURLY boundary crossing fires CONSTANT_HUM_CELL_TICK), yet this cell must fold exactly ONCE per
     *  real hour boundary (the "per-player-firing, city-global-state" shape, precedent
     *  political_calendar_state/IA_THRESHOLD_TICK). Since hour_of_week only recurs once per game_day for
     *  a fixed cell, `last_updated_game_day = game_day` is a sufficient row-local claim — no separate
     *  singleton watermark table needed (constant-hum.repository.ts's `foldHourlyObservation`, a
     *  SELECT...FOR UPDATE + conditional insert/update in one transaction). */
    last_updated_game_day: integer('last_updated_game_day').notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.district_id, t.hour_of_week] }),
    check('constant_hum_cell_hour_of_week_chk', sql`${t.hour_of_week} BETWEEN 0 AND 167`),
  ],
);

export const constantHumCellRelations = relations(constantHumCell, ({ one }) => ({
  district: one(districts, { fields: [constantHumCell.district_id], references: [districts.id] }),
}));

export type ConstantHumCellRow    = typeof constantHumCell.$inferSelect;
export type ConstantHumCellInsert = typeof constantHumCell.$inferInsert;

// ===== Table 2 : ambient_micro_event — Poisson micro-event stream (design §3.2, C2 scope) =====
export const ambientMicroEvent = pgTable(
  'ambient_micro_event',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** The in-game day this event was generated (seed reproducibility — `ambient:{game_day}:{district_id}`). */
    game_day: integer('game_day').notNull(),
    district_id: integer('district_id').notNull().references(() => districts.id, { onDelete: 'cascade' }),
    /** The fictional occurrence hour (0..167 — SAME domain as constant_hum_cell, drawn uniformly). */
    hour_of_week: smallint('hour_of_week').notNull(),
    kind: ambientMicroEventKind('kind').notNull(),
    channel: ambientChannel('channel').notNull(),
    status: ambientMicroEventStatus('status').notNull().default('live'),
    /** created_at (game-minute) + decay_window_hours × 60 — decay is 24-72h fictional, never real-clock. */
    expires_at_game_minute: bigint('expires_at_game_minute', { mode: 'number' }).notNull(),
    /** NULL unless attended — the FIRST player to attend wins (city-shared state, D3/D7). ON DELETE SET
     *  NULL: not in the GDPR hard-delete table list (persistence_rules.md §2.4) — a player deletion
     *  clears the attribution, never cascades to delete this city-global row. */
    attended_by_player_id: uuid('attended_by_player_id').references(() => player.player_id, { onDelete: 'set null' }),
    attended_at_game_day: integer('attended_at_game_day'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('ambient_micro_event_hour_of_week_chk', sql`${t.hour_of_week} BETWEEN 0 AND 167`),
    // The decay sweep's hot path (C2): "every live row whose expiry has passed".
    index('ambient_micro_event_status_expires_idx').on(t.status, t.expires_at_game_minute),
    // The generation idempotency-skip + BO diagnostic hot path (C2): "rows for (district, game_day)".
    index('ambient_micro_event_district_day_idx').on(t.district_id, t.game_day),
  ],
);

export const ambientMicroEventRelations = relations(ambientMicroEvent, ({ one }) => ({
  district: one(districts, { fields: [ambientMicroEvent.district_id], references: [districts.id] }),
  attendedBy: one(player, { fields: [ambientMicroEvent.attended_by_player_id], references: [player.player_id] }),
}));

export type AmbientMicroEventRow    = typeof ambientMicroEvent.$inferSelect;
export type AmbientMicroEventInsert = typeof ambientMicroEvent.$inferInsert;

// ===== Table 3 : off_hours_drift_detection — Off-Hours Drift trip ledger (design §3.4, C3 scope) =====
export const offHoursDriftDetection = pgTable(
  'off_hours_drift_detection',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    district_id: integer('district_id').notNull().references(() => districts.id, { onDelete: 'cascade' }),
    detected_at_game_day: integer('detected_at_game_day').notNull(),
    /** The tunable value AT THE MOMENT of trip (`off_hours_drift_detection_window_days`) — a historical
     *  snapshot, so a later tunable change never retroactively reinterprets an old detection row. */
    window_days: integer('window_days').notNull(),
    /** numeric() string-mode — the computed relative drift (BO diagnostic; ≥ the composite
     *  `drift_significant` threshold's 0.25 relative component to have produced this row at all). */
    drift_relative: numeric('drift_relative').notNull(),
    /** ≥ off_hours_drift_min_cells (default 3) by construction — the composite `drift_significant`'s
     *  cell-count component (D10). */
    cells_over_threshold: smallint('cells_over_threshold').notNull(),
    /** {hour_of_week: ema} — the rolling reference snapshot the detector compared against (D10: no
     *  time-series table; the detector samples its own reference into this jsonb at trip time). */
    baseline_snapshot: jsonb('baseline_snapshot').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('off_hours_drift_detection_district_idx').on(t.district_id, t.detected_at_game_day),
  ],
);

export const offHoursDriftDetectionRelations = relations(offHoursDriftDetection, ({ one }) => ({
  district: one(districts, { fields: [offHoursDriftDetection.district_id], references: [districts.id] }),
}));

export type OffHoursDriftDetectionRow    = typeof offHoursDriftDetection.$inferSelect;
export type OffHoursDriftDetectionInsert = typeof offHoursDriftDetection.$inferInsert;
