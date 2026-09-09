// IMPLEMENTS: docs/superpowers/plans/2026-06-19-depth-forensic-signaling-plan.md Task 1 (C1) + Task 2 (C2)
//             docs/tech/04c_market_reputation_insurance/forensic_signaling_mechanics.md §5 (5.1 + 5.2)
//             docs/tech/09_data_model/schema_forensic.md (R9.3 backport — same-commit C1 + C2)
//             — Forensic Signaling C1 + C2 — 2026-06-19
//
// TABLES (5 NEW forensic entities — migrations 0071 + 0072):
//
//   migration 0071 — C1 (§5.1 Benford / Leading-Digit):
//   ledger_entry_ring — per-front 5.1 Benford ring buffer (first-digit FIFO, WEEKLY χ² audit).
//     front_id: uuid PK (the front building_id).
//     player_id: uuid NOT NULL FK → player(player_id) ON DELETE CASCADE + INDEX.
//     ring: jsonb NOT NULL default '[]' — FIFO of first-digits (1..9); bounded by
//       T.forensic.benford_ring_buffer_length (OQ-10: stores digit not raw amount).
//     ring_head: integer NOT NULL default 0 — next write position (0-indexed modulo ring length).
//     last_audit_tick: bigint nullable — last WEEKLY χ² tick; idempotence guard (OQ-7).
//     last_chi_square: real nullable — server-only (R2.2 — never projected to client). χ² scalar.
//     soft_flag_count: smallint NOT NULL default 0 — count of soft-flags on this front.
//     front_dark_until_tick: bigint nullable — hard-audit seizure blackout horizon (C9).
//
//   forensic_soft_flag_ring — per-front DD-SOFTFLAG-DUAL ring (3-in-60d window).
//     front_id: uuid PK.
//     player_id: uuid NOT NULL FK → player(player_id) ON DELETE CASCADE + INDEX.
//     flag_ticks: jsonb NOT NULL default '[]' — pruned ring of WEEKID integers at each soft-flag.
//       DD-FLAGTICK-UNIT (C9): these are WEEKIDs (the WEEKLY/9 audit cadence stores one weekId per
//       flag), NOT game-minute ticks. Prune: drop weekIds older than floor(60/7)=8 weeks (≈56d, the
//       weekId quantization of the 60d window, OQ-4). The C9 window-count uses the SAME predicate.
//
//   migration 0072 — C2 (§5.2 Effluent Stoichiometry):
//   workshop_stoichiometry_state — per-workshop rolling throughput accumulator (C12+).
//     workshop_id: uuid PK (the lab building uuid).
//     player_id: uuid NOT NULL FK → player(player_id) ON DELETE CASCADE + INDEX.
//     block_id: integer NOT NULL — block of the workshop (for block-level aggregation).
//     substance_type: substanceType enum NOT NULL — current recipe (REUSE from operational_chain.ts, OQ-5).
//     throughput_kg_window: jsonb NOT NULL default '[]' — rolling window of kg per game-day.
//     updated_at_tick: bigint nullable — last recordWorkshopThroughput call.
//
//   recipe_stoichiometry_table — designer data, read-mostly; SEED: 4 substances [PROV-Y26Q2].
//     substance_type: substanceType enum PK (4 rows day-1: brindle/crick/hush/ash, extensible to 6).
//     solvent_out_per_kg: real NOT NULL — [PROV-Y26Q2] solvent effluent coefficient (canon :84).
//     vapour_out_per_kg: real NOT NULL — [PROV-Y26Q2] vapour effluent coefficient (pilote haze :84).
//     water_out_per_kg: real NOT NULL — [PROV-Y26Q2] water effluent coefficient (pilote drain stains :84).
//     NOTE: all 3 coefficients are PROPOSED DEFAULTS [PROV-Y26Q2] — canon-silent, calibration TD (OQ-5).
//
//   block_effluent_register — per-player per-block rolling effluent register (C13+).
//     (player_id, block_id): composite PK — mirrors inspection_queues PK pattern (design §3.3).
//     player_id: uuid NOT NULL FK → player(player_id) ON DELETE CASCADE + INDEX.
//     district_id: integer NOT NULL — district (for NIGHTLY/9 environmental scan C14).
//     effluent_window: jsonb NOT NULL default '[]' — rolling window of (solvent,vapour,water) sums.
//     baseline_effluent: real nullable — day-seeded baseline (C4, canon :186) — server-only.
//     last_deviation: real nullable — last computed deviation — server-only (R2.2).
//     last_scan_tick: bigint nullable — idempotence guard for NIGHTLY/9 scan.
//
// R9.3: this file matches migrations 0071_forensic_ledger_rings.sql + 0072_forensic_effluent_state.sql
//       byte-for-meaning. The ch09 mirror is docs/tech/09_data_model/schema_forensic.md (extended same-commit C2).
// R2.2: last_chi_square, last_audit_tick, front_dark_until_tick (C1) = server-only.
//       baseline_effluent, last_deviation, last_scan_tick (C2) = server-only.
//       Clients see only the banded AuditRiskBucket (C24) + EffluentVisibilityBucket (C24).
// OQ-5: substanceType enum REUSED from operational_chain.ts — NOT re-declared in forensic.ts.
// OQ-10: ring stores first-digit (1..9) — sufficient for χ², lighter than float32 raw amount.
//         Canon :42 says float32 raw amount; design chooses digit-only (reviewer⊥ ratifies).
// Anti-fabrication: no non-deterministic RNG in this file. Stoich coefficients are [PROV-Y26Q2].
// Zero-regression invariant (§1.3): existing tables NOT modified. Purely additive.

import {
  pgTable,
  pgEnum,
  uuid,
  bigint,
  smallint,
  integer,
  real,
  jsonb,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { player } from './player';
// OQ-5: REUSE substanceType pgEnum from operational_chain.ts — do NOT re-declare.
// The enum 'substance_type' is already registered in PG (migration 0002 or equivalent).
// Pattern mirrors market_lane_pricing_state.ts which also imports substanceType from here.
import { substanceType } from './operational_chain';
// C3: lieutenant table — FK target for lifestyle_audit_state.lieutenant_id (PK uuid).
import { lieutenant } from './lieutenant';

// ===== Table 1: ledger_entry_ring — per-front 5.1 Benford ring buffer (migration 0071) ==========
//
// One row per front (per player). Created lazily on first `recordReceipt` call (C6).
// front_id = the front building's uuid (serves as PK — one ring per front).
// player_id = FK → player(player_id) ON DELETE CASCADE (player-scoped, leçon D1c/D2).
// ring = FIFO of first-digits (1..9) as a JSONB array; bounded by benfordRingBufferLength (C4).
// ring_head = next write position modulo ring capacity (rolling overwrite, 0-indexed).
// last_audit_tick = the weekId of the most recent WEEKLY/9 χ² tick on this ring.
//   Used by runWeeklyAuditTick (C7) for per-ring idempotence: skip if == current weekId (OQ-7).
// last_chi_square = last computed χ² statistic. Server-only (R2.2); BO reads via C25.
// soft_flag_count = cumulative count of WEEKLY χ² ticks where χ² > H (audit threshold C4).
//   Reset to 0 on hard-audit seizure (C9). Monotone increments between seizures.
// front_dark_until_tick = hard-audit blackout horizon: front is "dark" until this game-tick (C9).
//   Null = not currently under hard audit. DD-FLAGTICK-UNIT (C9): a GAME-TICK horizon =
//   currentTick + darkWeeks(frontId, currentWeekId)·WEEKLY_MINUTES (10080). Deterministic (djb2,
//   no Math.random — NOT seedFromDay).
export const ledgerEntryRing = pgTable(
  'ledger_entry_ring',
  {
    /**
     * front_id — PK: the front building's uuid.
     * One ring per front (per player). Serves as the natural partition key for 5.1.
     */
    front_id: uuid('front_id').primaryKey(),

    /**
     * player_id — FK → player(player_id) ON DELETE CASCADE.
     * Player-scoped: deleting a player cascades to remove all their ring rows.
     * INDEX: ledger_entry_ring_player_idx for player-scoped lookups (all fronts for a player).
     * W6a C2 (migration 0142, Drizzle mirror — no trigger DSL in this Drizzle version): DB-IMMUTABLE
     * post-INSERT. A `BEFORE UPDATE` trigger RAISEs (SQLSTATE 'OW001') if this column is reassigned —
     * see `schema_forensic.md §7` + the migration file for the full rationale.
     */
    player_id: uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),

    /**
     * ring — FIFO array of first-digits (1..9) as JSONB.
     * Bounded by T.forensic.benford_ring_buffer_length (default 64 — canon :44 "64 receipts").
     * OQ-10: stores the first significant digit, NOT the raw float32 amount.
     *   Sufficient for χ² (χ² only needs digit frequencies, not amounts).
     *   Lighter: 1 byte per receipt vs 4 bytes float32.
     * Rolling overwrite via ring_head modulo capacity (FIFO semantics).
     */
    ring: jsonb('ring').notNull().default('[]'),

    /**
     * ring_head — next write position (0-indexed, modulo ring capacity).
     * Incremented on each recordReceipt call (C6). Wraps around at benfordRingBufferLength.
     */
    ring_head: integer('ring_head').notNull().default(0),

    /**
     * last_audit_tick — the weekId of the most recent WEEKLY/9 χ² audit on this ring.
     * Used by runWeeklyAuditTick (C7) for per-ring idempotence (OQ-7):
     *   if last_audit_tick == currentWeekId → skip (already audited this week).
     * Null = never audited (ring newly created or just reset after hard audit C9).
     * Bigint (mode:'bigint'): game-tick counter is a bigint.
     */
    last_audit_tick: bigint('last_audit_tick', { mode: 'bigint' }),

    /**
     * last_chi_square — χ² statistic from the most recent WEEKLY/9 audit.
     * REAL (float32) — sufficient precision for χ² (only compared to threshold H).
     * Server-only (R2.2): never projected to client. BO true-state reads via C25.
     * Null = never computed (ring too small or never audited).
     */
    last_chi_square: real('last_chi_square'),

    /**
     * soft_flag_count — cumulative count of WEEKLY ticks where χ² > H (C7).
     * Incremented each flagging WEEKLY tick; the dual-write goes to forensic_soft_flag_ring
     * (DD-SOFTFLAG-DUAL, OQ-4: forensic_soft_flag_ring prunes > 60 days; this is cumulative).
     * Reset to 0 after hard-audit seizure (C9).
     * Smallint: range 0..32767, well within expected bounds (≤52 per year at weekly cadence).
     */
    soft_flag_count: smallint('soft_flag_count').notNull().default(0),

    /**
     * front_dark_until_tick — hard-audit blackout horizon (C9). A GAME-TICK (game-minute) value.
     * DD-FLAGTICK-UNIT (C9): set to currentTick + darkWeeks(frontId, currentWeekId) × WEEKLY_MINUTES
     * (ticksPerWeek = WEEKLY_MINUTES = 10080) on a 3-in-window hard-audit trigger.
     * Null = not currently under hard-audit blackout.
     * Deterministic: darkWeeks is a djb2 hash of (frontId, currentWeekId) (no Math.random, C4 determinism).
     * Canon :54: "front dark 2-4 weeks" — range [frontDarkWeeksMin, frontDarkWeeksMax] (C4 tunables).
     * Server-only (R2.2): the player sees the front UI state (dark/not dark), not the raw tick.
     */
    front_dark_until_tick: bigint('front_dark_until_tick', { mode: 'bigint' }),
  },
  (t) => ({
    /** Index for player-scoped lookups (all front rings for a player). */
    player_idx: index('ledger_entry_ring_player_idx').on(t.player_id),
  }),
);

export const ledgerEntryRingRelations = relations(ledgerEntryRing, ({ one }) => ({
  player: one(player, {
    fields: [ledgerEntryRing.player_id],
    references: [player.player_id],
  }),
}));

// ===== Table 2: forensic_soft_flag_ring — DD-SOFTFLAG-DUAL windowed ring (migration 0071) ========
//
// One row per front (per player). Created/updated on each soft-flag event (C8).
// DD-FLAGTICK-UNIT (C9): stores the WEEKID of each soft-flag (NOT the game-minute tick — the WEEKLY/9
// audit cadence produces one weekId per flag), pruned to floor(60/7)=8 weeks (≈56d) on every write.
// The 3-in-window hard-audit counter uses this ring (not ledger_entry_ring.soft_flag_count, which is
// cumulative) — pruning ensures only recent flags count toward the hard-audit trigger (C9). The C9
// window-count predicate is byte-identical to this prune (cutoffWeekId = currentWeekId − floor(60/7)).
//
// DD-SOFTFLAG-DUAL (OQ-4, plan line 100): dual-write on each soft-flag:
//   (a) appendDeclarationEntry('forensic_benford_soft_flag') → precinct_memory (BPD memory, System 3).
//   (b) push the current WEEKID into this ring → forensic_soft_flag_ring (the 3-in-window counter).
// precinct_memory prunes/decays independently; this ring is the authoritative 60d (weekId-quantized) window.
export const forensicSoftFlagRing = pgTable(
  'forensic_soft_flag_ring',
  {
    /**
     * front_id — PK: the front building's uuid.
     * Matches ledger_entry_ring.front_id (sibling table, same partition key).
     */
    front_id: uuid('front_id').primaryKey(),

    /**
     * player_id — FK → player(player_id) ON DELETE CASCADE.
     * Player-scoped: deleting a player cascades to remove all their flag rings.
     * INDEX: forensic_soft_flag_ring_player_idx for player-scoped lookups.
     * W6a C2 (migration 0142, Drizzle mirror — no trigger DSL in this Drizzle version): DB-IMMUTABLE
     * post-INSERT. A `BEFORE UPDATE` trigger RAISEs (SQLSTATE 'OW001') if this column is reassigned —
     * see `schema_forensic.md §7` + the migration file for the full rationale. This is the finding #2
     * table (D1 raison 2): `recordSoftFlag`'s UPSERT is the app-layer counterpart, same commit.
     */
    player_id: uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),

    /**
     * flag_ticks — JSONB array of WEEKID integers, one per soft-flag event (DD-FLAGTICK-UNIT, C9).
     * NOT game-minute ticks: the WEEKLY/9 audit stores the weekId (= floor(gameMinute / WEEKLY_MINUTES)).
     * Pruned on each write: weekIds older than floor(benfordHardAuditWindowDays / 7) weeks are removed
     *   (floor(60/7)=8 weeks ≈ 56d — the weekId quantization of the 60d window).
     * Default '[]': no flags yet.
     * The 3-in-window hard-audit trigger (C9) counts: # of flag_ticks with weekId >= currentWeekId −
     *   floor(windowDays/7), then fires if >= benfordHardAuditSoftflagsCount.
     * Canon :54: "3-in-60-days" → T.forensic.benford_hard_audit_softflags_count = 3,
     *   T.forensic.benford_hard_audit_window_days = 60 (OQ-11: one composite row, C4).
     */
    flag_ticks: jsonb('flag_ticks').notNull().default('[]'),
  },
  (t) => ({
    /** Index for player-scoped lookups (all flag rings for a player). */
    player_idx: index('forensic_soft_flag_ring_player_idx').on(t.player_id),
  }),
);

export const forensicSoftFlagRingRelations = relations(forensicSoftFlagRing, ({ one }) => ({
  player: one(player, {
    fields: [forensicSoftFlagRing.player_id],
    references: [player.player_id],
  }),
}));

// ===== Table 3: workshop_stoichiometry_state — §5.2 per-workshop accumulator (migration 0072) =====
//
// One row per lab workshop (per player). Created lazily on first recordWorkshopThroughput (C12).
// workshop_id = the lab building's uuid (PK — one state row per workshop).
// player_id = FK → player(player_id) ON DELETE CASCADE (player-scoped).
// block_id = block containing the workshop (for block-level aggregation in updateBlockEffluentRegister C13).
// substance_type = REUSE the substanceType pgEnum from operational_chain.ts (OQ-5; DO NOT re-declare).
//   Represents the current recipe being processed in this workshop.
// throughput_kg_window = JSONB array of kg values per game-day (rolling window of effluentWindowDays).
//   Accumulated by recordWorkshopThroughput (C12). Default '[]' = no throughput yet.
// updated_at_tick = game-tick of the last recordWorkshopThroughput call. Nullable (not yet written).
//
// Zero-regression invariant (§1.3): recordWorkshopThroughput is hooked AFTER completeCookWithYield
//   (production-cook-advance.service.ts) — the yield/precursor-decrement/emitCookHeat paths are
//   byte-identical. This table stores only the additive forensic accumulation.
export const workshopStoichiometryState = pgTable(
  'workshop_stoichiometry_state',
  {
    /**
     * workshop_id — PK: the lab building's uuid.
     * One row per lab workshop (per player). Natural partition key for 5.2.
     */
    workshop_id: uuid('workshop_id').primaryKey(),

    /**
     * player_id — FK → player(player_id) ON DELETE CASCADE.
     * Player-scoped: deleting a player cascades to remove all their stoichiometry state.
     * INDEX: workshop_stoichiometry_state_player_idx for player-scoped lookups.
     * W6a C2 (migration 0142, Drizzle mirror — no trigger DSL in this Drizzle version): DB-IMMUTABLE
     * post-INSERT. A `BEFORE UPDATE` trigger RAISEs (SQLSTATE 'OW001') if this column is reassigned —
     * see `schema_forensic.md §7` + the migration file for the full rationale.
     */
    player_id: uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),

    /**
     * block_id — block containing this workshop.
     * Used by updateBlockEffluentRegister (C13) to sum all workshops in the same block.
     * Not a FK — blocks are geographic units (world_geography table), not player-owned.
     */
    block_id: integer('block_id').notNull(),

    /**
     * substance_type — the current recipe being processed in this workshop.
     * REUSE: the substanceType pgEnum from operational_chain.ts (4 values: brindle/crick/hush/ash).
     * OQ-5: keyed to recipe_stoichiometry_table.substance_type (the recipe lookup key).
     * NOT re-declared — this imports the EXISTING enum registered in PG.
     */
    substance_type: substanceType('substance_type').notNull(),

    /**
     * throughput_kg_window — rolling window of kg processed per game-day.
     * JSONB array of numeric values; length bounded by T.forensic.effluent_window_days (C4).
     * Accumulated by EffluentStoichiometryService.recordWorkshopThroughput (C12).
     * Default '[]': no throughput yet (no-op organic — zero-regression §1.3).
     */
    throughput_kg_window: jsonb('throughput_kg_window').notNull().default('[]'),

    /**
     * updated_at_tick — game-tick of the last recordWorkshopThroughput call.
     * Nullable: not yet written (workshop newly seeded or never had production).
     * Bigint (mode:'bigint'): game-tick counter is a bigint.
     */
    updated_at_tick: bigint('updated_at_tick', { mode: 'bigint' }),
  },
  (t) => ({
    /** Index for player-scoped lookups (all workshop states for a player). */
    player_idx: index('workshop_stoichiometry_state_player_idx').on(t.player_id),
  }),
);

export const workshopStoichiometryStateRelations = relations(workshopStoichiometryState, ({ one }) => ({
  player: one(player, {
    fields: [workshopStoichiometryState.player_id],
    references: [player.player_id],
  }),
}));

// ===== Table 4: recipe_stoichiometry_table — designer seed data (migration 0072 SEED) ============
//
// 4 rows SEEDED via migration 0072 (brindle / crick / hush / ash).
// substance_type = PK — one row per substance (4 day-1; extensible to effluent_recipe_count=6).
// Coefficients are [PROPOSED DEFAULT][PROV-Y26Q2] — canon-silent (canon :84 names the 3 axes
//   but does NOT specify magnitudes). Values are PROPOSED defaults routed to a calibration TD
//   at closeout (OQ-5). They are NOT presented as canon. The reviewer⊥ ratifies that they are
//   flagged PROPOSED and are distinguishable across at least one axis.
//
// Anti-fabrication (OQ-5): the [PROV-Y26Q2] note is present in the migration seed comment AND
//   in the ch09 doc. Values are calibration-TBD — they fire the correct code-path but magnitudes
//   will be tuned post-playtesting.
//
// Read-mostly: EffluentStoichiometryService.recordWorkshopThroughput reads this table to compute
//   per-substance effluent (C12). No player_id — this is designer reference data, not player state.
export const recipeStoichiometryTable = pgTable(
  'recipe_stoichiometry_table',
  {
    /**
     * substance_type — PK: the substance being processed.
     * REUSE: substanceType pgEnum from operational_chain.ts (brindle/crick/hush/ash).
     * 4 rows seeded at migration time; extensible to 6 (T.forensic.effluent_recipe_count).
     * OQ-5: keyed on the real substance enum, NOT a separate recipe id.
     */
    substance_type: substanceType('substance_type').primaryKey(),

    /**
     * solvent_out_per_kg — solvent effluent coefficient per kg of substance processed.
     * [PROPOSED DEFAULT][PROV-Y26Q2] — canon :84 names this axis but does not specify magnitude.
     * Calibration TD at closeout (OQ-5). Value is PROPOSED (not canon).
     * brindle=2.0, crick=1.2, hush=3.0, ash=1.5 (distinguishable, see §3.2 rationale).
     */
    solvent_out_per_kg: real('solvent_out_per_kg').notNull(),

    /**
     * vapour_out_per_kg — vapour effluent coefficient per kg (pilote le haze visible :84).
     * [PROPOSED DEFAULT][PROV-Y26Q2] — magnitude canon-silent.
     * brindle=1.5, crick=2.5, hush=0.8, ash=1.0 (vapour-heavy=crick, vapour-light=hush).
     */
    vapour_out_per_kg: real('vapour_out_per_kg').notNull(),

    /**
     * water_out_per_kg — water effluent coefficient per kg (pilote les drain stains :84).
     * [PROPOSED DEFAULT][PROV-Y26Q2] — magnitude canon-silent.
     * brindle=3.0, crick=1.8, hush=2.0, ash=4.0 (water-heavy=ash).
     */
    water_out_per_kg: real('water_out_per_kg').notNull(),
  },
);

// No player relations on recipe_stoichiometry_table — designer data, not player-scoped.
// No relations export needed for this table.

// ===== Table 5: block_effluent_register — §5.2 per-player per-block register (migration 0072) ====
//
// One row per (player, block). Created lazily by updateBlockEffluentRegister (C13).
// Composite PK (player_id, block_id) — mirrors inspection_queues PK pattern (design §3.3).
// player_id = FK → player(player_id) ON DELETE CASCADE (player-scoped).
// district_id = district of this block (used by NIGHTLY/9 environmental inspector scan C14).
// effluent_window = JSONB array of (solvent,vapour,water) objects summed across block's workshops.
//   Rolling window of effluentWindowDays. Default '[]' = no workshops have produced yet.
// baseline_effluent = day-seeded expected baseline (server-only, C4, canon :186 "baseline per district").
//   Set at NIGHTLY/9 scan time. Null until first scan. R2.2: never projected to client.
// last_deviation = last computed (block_effluent - baseline) / baseline (server-only, R2.2).
//   Null until first scan. The EffluentVisibilityBucket (C24) is projected instead.
// last_scan_tick = dayId of the last NIGHTLY/9 scan pass (idempotence guard C14).
//   Null = never scanned. Bigint (mode:'bigint').
export const blockEffluentRegister = pgTable(
  'block_effluent_register',
  {
    /**
     * block_id — part of composite PK (player_id, block_id).
     * Geographic block identifier (integer, matching world_geography schema).
     */
    block_id: integer('block_id').notNull(),

    /**
     * player_id — FK → player(player_id) ON DELETE CASCADE + part of composite PK.
     * Player-scoped: deleting a player cascades to remove all their block registers.
     * INDEX: block_effluent_register_player_idx for player-scoped lookups (all blocks for a player).
     */
    player_id: uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),

    /**
     * district_id — the district containing this block.
     * Used by runEnvironmentalInspectorScan (C14) to apply the district-level baseline.
     */
    district_id: integer('district_id').notNull(),

    /**
     * effluent_window — rolling window of summed effluent per game-day.
     * JSONB array of objects { solvent, vapour, water } (sums across all workshops in the block).
     * Length bounded by T.forensic.effluent_window_days. Default '[]' = no production yet.
     * Updated by updateBlockEffluentRegister (C13) after recordWorkshopThroughput (C12).
     */
    effluent_window: jsonb('effluent_window').notNull().default('[]'),

    /**
     * baseline_effluent — expected day-seeded baseline for this block (C4, canon :186).
     * Server-only (R2.2): never projected to client. Set by NIGHTLY/9 scan (C14).
     * Null = not yet computed (no scan has run for this block).
     */
    baseline_effluent: real('baseline_effluent'),

    /**
     * last_deviation — last computed deviation: (block_effluent - baseline) / baseline.
     * Server-only (R2.2): clients see EffluentVisibilityBucket (C24), not this scalar.
     * Null = not yet computed (no scan with non-empty window).
     */
    last_deviation: real('last_deviation'),

    /**
     * last_scan_tick — dayId of the most recent NIGHTLY/9 inspector scan on this block.
     * Idempotence guard for runEnvironmentalInspectorScan (C14): skip if == current dayId.
     * Null = never scanned. Bigint (mode:'bigint').
     */
    last_scan_tick: bigint('last_scan_tick', { mode: 'bigint' }),
  },
  (t) => ({
    /** Composite PK (player_id, block_id) — mirror inspection_queues PK pattern. */
    pk: primaryKey({ columns: [t.player_id, t.block_id] }),
    /** Index for player-scoped lookups (all block registers for a player). */
    player_idx: index('block_effluent_register_player_idx').on(t.player_id),
  }),
);

export const blockEffluentRegisterRelations = relations(blockEffluentRegister, ({ one }) => ({
  player: one(player, {
    fields: [blockEffluentRegister.player_id],
    references: [player.player_id],
  }),
}));

// ===== pgEnum: tail_ramp_stage — §5.3 Standing-Gap Tail Ramp (migration 0073) ================
//
// 4-member closed enum matching TailRampStage TS type in forensic-severity.ts (C3).
// Default = 'none' (no active tail). Progression driven by StandingGapHeatService (C17/C18).
//
// Canon :139: "sedan sprite passive → tailing → subpoena".
// Members (same order as TailRampStage TS type — invariant, plan lines 356–362):
//   'none'     — no tail (default)
//   'passive'  — tail spawned (consecutive_flag_months ≥ standingGapConsecutiveMonths, C17)
//   'tailing'  — active follow (1/3 ramp elapsed, C18)
//   'subpoena' — imminent seizure (2/3 ramp elapsed, C18)
//
// Pattern: mirrors `contractStatus = pgEnum(...)` in insurance.ts (line 80).
// R9.3: backported to docs/tech/09_data_model/schema_forensic.md same-commit.
export const tailRampStage = pgEnum('tail_ramp_stage', ['none', 'passive', 'tailing', 'subpoena']);

// ===== Table 6: lifestyle_audit_state — §5.3 gap + consecutive + tail-ramp (migration 0073) ===
//
// One row per lieutenant (per player). Created lazily by StandingGapHeatService.runMonthlyTick
// (C17) when gap > G (threshold) for the first time. Or created by the seed route at C3 for E2E proof.
//
// lieutenant_id = PK (uuid FK → lieutenant(lieutenant_id) ON DELETE CASCADE).
// player_id = FK → player(player_id) ON DELETE CASCADE + INDEX (player-scoped).
//
// Design §3.4 column set:
//   declared_cut_cents: bigint NOT NULL default 0n — cash on the books (canon :122).
//   visible_standard_index: smallint NOT NULL default 0 — housing/transport/dependents tier index (:123).
//   consecutive_flag_months: smallint NOT NULL default 0 — cumulative months where gap > G (:124).
//   last_gap: real nullable — last computed gap (server-only R2.2; C16 writes it; never projected).
//   tail_ramp_stage: tailRampStage NOT NULL default 'none' — active ramp stage (enum C3, :139).
//   tail_started_tick: bigint nullable — game-tick when tail_ramp_stage flipped to 'passive' (C17).
//   last_month_id: integer nullable — monthId of last runMonthlyTick pass (idempotence, OQ-9).
//
// FK cascade chain:
//   player (player_id) → lifestyle_audit_state ON DELETE CASCADE
//   lieutenant (lieutenant_id) → lifestyle_audit_state ON DELETE CASCADE
// Either cascade is sufficient for cleanup. Both are present for full referential integrity.
//
// R2.2: last_gap, tail_ramp_stage (raw), tail_started_tick = server-only. Client sees:
//   - LifestyleAlarmBucket ('quiet'|'noticed'|'watched'|'subpoenaed') via C24 projection.
//   - LifestyleGapFlag event (emitted at each stage transition, C18) — only the stage name.
// OQ-9: last_month_id idempotence ensures runMonthlyTick is called once per calendar month
//   even when driven by the NIGHTLY/9 tick (DD-MONTHLY-ON-NIGHTLY, design §2.3).
// Anti-fabrication: no Math.random in this schema file. No scalar inlined silently.
// Zero-regression invariant (§1.3): no existing table or column is modified.
export const lifestyleAuditState = pgTable(
  'lifestyle_audit_state',
  {
    /**
     * lieutenant_id — PK: the lieutenant's uuid.
     * FK → lieutenant(lieutenant_id) ON DELETE CASCADE.
     * One row per lieutenant — partition key for §5.3 monthly gap computation (C17).
     */
    lieutenant_id: uuid('lieutenant_id').primaryKey().references(
      () => lieutenant.lieutenant_id,
      { onDelete: 'cascade' },
    ),

    /**
     * player_id — FK → player(player_id) ON DELETE CASCADE.
     * Player-scoped: deleting a player cascades to remove all their lifestyle rows.
     * INDEX: lifestyle_audit_state_player_idx for player-scoped lookups (all lieutenants).
     * W6a C2 (migration 0142, Drizzle mirror — no trigger DSL in this Drizzle version): DB-IMMUTABLE
     * post-INSERT. A `BEFORE UPDATE` trigger RAISEs (SQLSTATE 'OW001') if this column is reassigned —
     * see `schema_forensic.md §7` + the migration file for the full rationale. This is the finding #3
     * table (D1 raison 2): `populateLifestyleState`'s UPSERT is the app-layer counterpart, same commit.
     * (This table already has an FK to its parent — `lieutenant` — so form (i) FK-composite hardening
     * is structurally possible here later; (ii) trigger is retained for uniformity with the other 3.)
     */
    player_id: uuid('player_id').notNull().references(
      () => player.player_id,
      { onDelete: 'cascade' },
    ),

    /**
     * declared_cut_cents — cash on the books for this lieutenant (bigint, mode:'bigint').
     * Default 0n: no declared cut yet (row created before C16 writes it).
     * Written by StandingGapHeatService.runMonthlyTick (C17) from the lieutenant ledger.
     * Canon :122: "declared cut amount" (the lifestyle income declared to the state).
     */
    declared_cut_cents: bigint('declared_cut_cents', { mode: 'bigint' }).notNull().default(0n),

    /**
     * visible_standard_index — observed lifestyle tier index (housing/transport/dependents).
     * Smallint (range 0..N). Default 0: index not yet computed.
     * Canon :123: "visible standard of living" — computed from the lieutenant's observable lifestyle.
     * Written by StandingGapHeatService.runMonthlyTick (C17).
     */
    visible_standard_index: smallint('visible_standard_index').notNull().default(0),

    /**
     * consecutive_flag_months — count of consecutive calendar months where gap > G.
     * Smallint (range 0..N). Default 0: no consecutive flags yet.
     * Canon :124: incremented by runMonthlyTick (C17) when gap > G; reset to 0 when gap ≤ G.
     * When consecutive_flag_months ≥ standingGapConsecutiveMonths → tail spawned (C17).
     * NOT cumulative (resets on "clean" month) — different from ledger_entry_ring.soft_flag_count.
     */
    consecutive_flag_months: smallint('consecutive_flag_months').notNull().default(0),

    /**
     * last_gap — most recently computed standing-gap value (real, nullable).
     * gap = visible_standard_cost − declared_cut · (1 − standingGapTypicalSavingsRate).
     * Server-only (R2.2): never projected to client. Written by runMonthlyTick (C17).
     * Null = not yet computed (no monthly tick has run for this lieutenant).
     */
    last_gap: real('last_gap'),

    /**
     * tail_ramp_stage — current tail-ramp stage for this lieutenant.
     * Uses the `tail_ramp_stage` pgEnum (C3): 'none' | 'passive' | 'tailing' | 'subpoena'.
     * Default 'none': no tail active (canon :139 "sedan sprite").
     * Advanced by advanceTailRamp (C18, NIGHTLY/9) from 'passive' → 'tailing' → 'subpoena'.
     * R2.2: raw stage is server-only; client sees LifestyleAlarmBucket (C24).
     */
    tail_ramp_stage: tailRampStage('tail_ramp_stage').notNull().default('none'),

    /**
     * tail_started_tick — game-tick when tail_ramp_stage flipped to 'passive' (C17).
     * Bigint (mode:'bigint'). Nullable: null until the first tail spawn.
     * Used by advanceTailRamp (C18) to compute elapsed ticks:
     *   elapsedWeeks = (currentTick − tail_started_tick) / ticksPerWeek
     *   → determines whether to advance to 'tailing' or 'subpoena'.
     * Canon :157: "6 weeks" ramp → T.forensic.standing_gap_tail_ramp_weeks = 6 (C4, PROPOSED).
     */
    tail_started_tick: bigint('tail_started_tick', { mode: 'bigint' }),

    /**
     * last_month_id — monthId of the most recent successful runMonthlyTick pass.
     * Integer (nullable). Null = no monthly tick has run yet for this lieutenant.
     * Idempotence guard (OQ-9 / DD-MONTHLY-ON-NIGHTLY design §2.3):
     *   runMonthlyTick skips if last_month_id == currentMonthId (already processed this month).
     * Driven by NIGHTLY/9 tick (not a dedicated MONTHLY cadence) — mirror insurance §2.6 pattern.
     */
    last_month_id: integer('last_month_id'),
  },
  (t) => ({
    /** Index for player-scoped lookups (all lifestyle rows for a player). */
    player_idx: index('lifestyle_audit_state_player_idx').on(t.player_id),
  }),
);

export const lifestyleAuditStateRelations = relations(lifestyleAuditState, ({ one }) => ({
  lieutenant: one(lieutenant, {
    fields: [lifestyleAuditState.lieutenant_id],
    references: [lieutenant.lieutenant_id],
  }),
  player: one(player, {
    fields: [lifestyleAuditState.player_id],
    references: [player.player_id],
  }),
}));
