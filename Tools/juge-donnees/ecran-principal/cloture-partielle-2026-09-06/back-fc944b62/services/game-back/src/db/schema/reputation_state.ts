// IMPLEMENTS: docs/superpowers/plans/2026-06-16-depth-d2-impl-plan.md Task R1 + Task R2b + Task R4a + Task R5a + Task R7a + Task R8a
//             docs/tech/04c_market_reputation_insurance/reputation_mechanics.md §3 (entities :252-257)
//             docs/tech/04c_market_reputation_insurance/reputation_mechanics.md §3.1 (:53-59, :65) [R2b]
//             docs/tech/04c_market_reputation_insurance/reputation_mechanics.md §3.2 (:83-95) [R4a]
//             docs/tech/04c_market_reputation_insurance/reputation_mechanics.md §3.3 (:113-131) [R5a]
//             docs/tech/04c_market_reputation_insurance/reputation_mechanics.md §3.4 (:150-168) [R7a]
//             docs/superpowers/specs/2026-06-16-depth-d2-reputation-chapter-design.md §3.1
//             docs/tech/09_data_model/schema_reputation_state.md §2 (R9.3 backport — same-commit)
//             — D2 R1 — 2026-06-16; D2 R2b — 2026-06-17; D2 R4a — 2026-06-17; D2 R5a — 2026-06-17; D2 R7a — 2026-06-17
//
// TABLES (6 NEW reputation entities + 1 sibling table — migrations 0045-0050, 0055-0056):
//
//   boss_mirror_violation_ring     — per-lieutenant private ring (5 slots, JSONB ring buffer).
//     PK: lieutenant_id (1-1 with lieutenant).
//     FK: lieutenant_id → lieutenant(lieutenant_id) ON DELETE CASCADE.
//     R2.2: violation_slots + ring_head are server-side only (never client-visible).
//
//   boss_mirror_declaration_ledger — per-player PUBLIC declaration history (DD-ENT: per-player, :65).
//     PK: player_id (1-1 with player, public ledger per player).
//     FK: player_id → player(player_id) ON DELETE CASCADE + INDEX.
//     R2.2: declared_rules is a public observable (the rules ARE public per :65); retraction_history
//     is server-side only (influences police priors via BPD bridge, :71).
//
//   restraint_dispute_ring         — per-counterparty ring (6 slots, JSONB ring buffer).
//     PK composite: (player_id, counterparty_id).
//     FK: player_id → player(player_id) ON DELETE CASCADE + INDEX.
//     counterparty_id: uuid of the counterparty (no FK — counterparty entity deferred).
//     R2.2: dispute_slots/restraint_ratio are server-side only. Player reads via marginalia (:95).
//
//   hidden_curriculum_norms_vector — per-lieutenant absorbed norms (8 bool flags + 16-event ring).
//     PK: lieutenant_id (1-1 with lieutenant).
//     FK: lieutenant_id → lieutenant(lieutenant_id) ON DELETE CASCADE.
//     FK: player_id → player(player_id) ON DELETE CASCADE + INDEX (for player-scoped lookups).
//     R2.2: norms_flags + witnessed_event_ring are server-side only (projected as uniform tells :170).
//
//   forbidden_triad_pair_state     — per strong-tied pair (max 66 per player, quadratic bounded).
//     PK composite: (player_id, pair_key).
//     FK: player_id → player(player_id) ON DELETE CASCADE + INDEX.
//     pair_key: uuid combining the two contact IDs (canonical ordering for dedup).
//     R2.2: anomaly_pressure_bucket is server-side only. Player reads via dashed lines (:208).
//
//   lek_memory_cell_state          — SIBLING TABLE (DD-LEK-LOC) per (player_id, tile_id).
//     PK composite: (player_id, tile_id). SIBLING to deal_leks (NOT columns on deal_leks).
//     FK: player_id → player(player_id) ON DELETE CASCADE + INDEX.
//     tile_id: integer mirroring deal_leks.tile_id (REUSE, no parallel concept).
//     R2.2: lambda_weight/decay_state/trailing_operator_ids are server-side only.
//           Player reads via footprint marks + textual tags (:131).
//
// R9.3: this file matches migrations 0045-0056 byte-for-meaning.
//       The ch09 mirror is docs/tech/09_data_model/schema_reputation_state.md.
// DD-LEK-LOC: lek_memory_cell_state is a SIBLING TABLE (NOT columns on deal_leks).
// DD-ENT: boss_mirror_declaration_ledger PK = player_id (public ledger per player — :65).
// DD-BYTES: byte-budgets are conceptual; realised as PG columns / JSONB ring buffers (no bit-packing).

import {
  pgTable,
  uuid,
  integer,
  smallint,
  real,
  boolean,
  jsonb,
  timestamp,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { player } from './player';
import { lieutenant } from './lieutenant';

// ===== Table 1: boss_mirror_violation_ring — per-lieutenant (migration 0045 + 0051) =====
//
// Per-lieutenant private ring buffer tracking observed boss-violations.
// Canon :49-51: ring 5 slots (rule_id 4-bit + severity 4-bit) + 1-B index pointer.
// DD-BYTES: realised as JSONB ring buffer (`violation_slots`) + integer head pointer (`ring_head`).
// Per-lieutenant scope — distinct from the public declaration ledger (per-player, :65).
// PK: lieutenant_id (1-1 with lieutenant).
//
// R2b (migration 0051) adds the derived server-only scalars:
//   violation_density    — Σ (severity_i · recency_weight_i) over ring slots (:53-55).
//   defection_tolerance  — base_tolerance · (1 + γ · violation_density) (:56-59).
//   last_tick_week       — week-id of the last tick run (idempotence guard per-week).
// R2.2/P5: all three are server-only (never forwarded to a client route; client gets band/posture via R12b).
export const bossMirrorViolationRing = pgTable(
  'boss_mirror_violation_ring',
  {
    lieutenant_id:   uuid('lieutenant_id').primaryKey().references(() => lieutenant.lieutenant_id, { onDelete: 'cascade' }),
    player_id:       uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),
    // JSONB ring buffer: array of { rule_id: number, severity: number } — max 5 slots (boss_mirror_violation_ring_size).
    // Empty array = no violations observed (zero-regression invariant: neutral on empty world).
    violation_slots: jsonb('violation_slots').notNull().default('[]'),
    // Integer head pointer into the ring (0-indexed). Advances on each write mod ring_size.
    ring_head:       smallint('ring_head').notNull().default(0),
    // R2b derived scalars (migration 0051 — additive). NULL until first weekly tick runs.
    // R2.2: server-only — never forwarded to client.
    violation_density:   real('violation_density'),
    defection_tolerance: real('defection_tolerance'),
    last_tick_week:      integer('last_tick_week'),
    created_at:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at:      timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // Index for player-scoped lookups (fetch all lieutenant rings for a player).
    player_idx: index('boss_mirror_violation_ring_player_idx').on(t.player_id),
  }),
);

export const bossMirrorViolationRingRelations = relations(bossMirrorViolationRing, ({ one }) => ({
  lieutenant: one(lieutenant, {
    fields: [bossMirrorViolationRing.lieutenant_id],
    references: [lieutenant.lieutenant_id],
  }),
  player: one(player, {
    fields: [bossMirrorViolationRing.player_id],
    references: [player.player_id],
  }),
}));

// ===== Table 2: boss_mirror_declaration_ledger — per-player PUBLIC (migration 0046 + 0051) =====
//
// Per-player public declaration/retraction history.
// Canon :65: "public ledger ≤ 8 entries per player, 16 B" — per-player (DD-ENT).
// Player can publicly commit up to 4 simultaneous operating rules (:47).
// DD-BYTES: declared_rules = JSONB array of { rule_id, declared_at } (≤4 active).
//           retraction_history = JSONB array of { rule_id, retracted_at } (server-side, influences BPD priors :71).
// PK: player_id (public ledger per player — DD-ENT confirmed by canon :65 "per player").
//
// R2b (migration 0051) adds the derived server-only scalars:
//   consistency_index      — 1 − (retractions / declarations) over last 90 days (:65). Materialized for R10.
//   last_consistency_week  — week-id of the last consistency_index computation (idempotence guard).
// R2.2/P5: consistency_index is server-only (never forwarded to client; client gets posture via R12b).
export const bossMirrorDeclarationLedger = pgTable(
  'boss_mirror_declaration_ledger',
  {
    player_id:          uuid('player_id').primaryKey().references(() => player.player_id, { onDelete: 'cascade' }),
    // JSONB array of active declared rules — { rule_id: string, declared_at: number (epoch ms) }.
    // Max 4 simultaneous rules (boss_mirror_max_public_rules registry tunable).
    // This is PUBLIC: the rules themselves are the observable per :65.
    declared_rules:     jsonb('declared_rules').notNull().default('[]'),
    // JSONB array of retraction events — { rule_id: string, retracted_at: number (epoch ms) }.
    // Server-side: influences police-side priors via BPD bridge (:71). Not the scalar consistency_index.
    retraction_history: jsonb('retraction_history').notNull().default('[]'),
    // R2b derived scalar (migration 0051 — additive). NULL until first weekly tick runs.
    // R2.2: server-only — never forwarded to client (materialized for R10 recruitment poll).
    consistency_index:     real('consistency_index'),
    last_consistency_week: integer('last_consistency_week'),
    created_at:         timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at:         timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
);

export const bossMirrorDeclarationLedgerRelations = relations(bossMirrorDeclarationLedger, ({ one }) => ({
  player: one(player, {
    fields: [bossMirrorDeclarationLedger.player_id],
    references: [player.player_id],
  }),
}));

// ===== Table 3: restraint_dispute_ring — per-counterparty (migration 0047 + 0053) =====
//
// Per-counterparty ring buffer of past dispute outcomes.
// Canon :83-86: ring 6 slots (claimable_amount 2B + claimed_amount 2B each).
// DD-BYTES: realised as JSONB ring buffer (`dispute_slots`) + integer head pointer (`ring_head`).
// PK composite: (player_id, counterparty_id).
// counterparty_id = uuid of the counterparty (no FK to counterparty table — entity deferred).
//
// R4a (migration 0053) adds the derived server-only scalars:
//   restraint_ratio    — Σ(claimable_i − claimed_i) / Σ claimable_i ∈ [0,1] (:85-86).
//   offer_terms        — base_terms · (1 + δ · restraint_ratio) (:90).
//   wary_active        — true when restraint_ratio < restraint_wary_threshold (:93).
//   collateral_amount  — escrow amount = offer_terms · restraint_collateral_inflation_wary (:93).
//   last_tick_week     — week-id of the last tick run (idempotence guard per-week).
// R2.2/P5: all five are server-only — never forwarded to a client route.
//   Client gets: offer_posture (standard/wary) + marginalia (named counterparties :95).
export const restraintDisputeRing = pgTable(
  'restraint_dispute_ring',
  {
    player_id:       uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),
    // UUID identifying the counterparty (no FK — counterparty entity is a deferred concept).
    counterparty_id: uuid('counterparty_id').notNull(),
    // JSONB ring buffer: array of { claimable_amount: number, claimed_amount: number }.
    // Max 6 slots (restraint_window_disputes registry tunable). Empty = no history (neutral).
    dispute_slots:   jsonb('dispute_slots').notNull().default('[]'),
    // Integer head pointer into the ring (0-indexed).
    ring_head:       smallint('ring_head').notNull().default(0),
    // R4a derived scalars (migration 0053 — additive). NULL until first weekly tick runs.
    // R2.2: server-only — never forwarded to client.
    restraint_ratio:   real('restraint_ratio'),
    offer_terms:       real('offer_terms'),
    wary_active:       boolean('wary_active'),
    collateral_amount: real('collateral_amount'),
    last_tick_week:    integer('last_tick_week'),
    created_at:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at:      timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.player_id, t.counterparty_id] }),
    // Index for player-scoped lookups (all counterparty rings for a player).
    player_idx: index('restraint_dispute_ring_player_idx').on(t.player_id),
  }),
);

export const restraintDisputeRingRelations = relations(restraintDisputeRing, ({ one }) => ({
  player: one(player, {
    fields: [restraintDisputeRing.player_id],
    references: [player.player_id],
  }),
}));

// ===== Table 4: hidden_curriculum_norms_vector — per-lieutenant (migration 0048 + 0055) =====
//
// Per-lieutenant absorbed norms: 8 norm flags + 16-event witnessed ring.
// Canon :150-160: 1-B absorbed-norms vector (8 flags packed) + 4-B witnessed-event ring (16 events, 2-bit type codes).
// DD-BYTES: norms_flags realised as JSONB object with 8 boolean keys (NO bit-packing — DD-BYTES);
//           witnessed_event_ring realised as JSONB ring buffer of { event_type: number (0-3) }.
// PK: lieutenant_id (per-lieutenant, 1-1).
//
// R7a (migration 0055): adds last_review_week (integer, nullable) — idempotence guard for the
//   weekly review tick (HiddenCurriculumService.runWeeklyReviewTick). Pattern mirrors
//   last_tick_week on boss_mirror_violation_ring (0051) and last_decay_week on lek_memory_cell_state (0054).
// R2.2/P5: last_review_week is server-only (never forwarded to client).
export const hiddenCurriculumNormsVector = pgTable(
  'hidden_curriculum_norms_vector',
  {
    lieutenant_id:          uuid('lieutenant_id').primaryKey().references(() => lieutenant.lieutenant_id, { onDelete: 'cascade' }),
    player_id:              uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),
    // 8 norm flags — JSONB object with 8 boolean keys (DD-BYTES: realised as JSONB, no bit-packing) — per :151-159.
    norms_flags:            jsonb('norms_flags').notNull().default('{"punctuality":false,"silence_at_handoffs":false,"debt_handling":false,"escalation_reflex":false,"fairness_to_subordinates":false,"discretion_around_civilians":false,"restraint_with_force":false,"ledger_hygiene":false}'),
    // JSONB ring of witnessed events — array of { event_type: number (0-3, 2-bit) }.
    // Max 16 events (curriculum_witnessed_event_buffer registry tunable). Empty = no history (neutral).
    witnessed_event_ring:   jsonb('witnessed_event_ring').notNull().default('[]'),
    // Integer head pointer into the witnessed_event_ring (0-indexed).
    ring_head:              smallint('ring_head').notNull().default(0),
    // R7a (migration 0055): last_review_week — week-id of the last runWeeklyReviewTick() (idempotence guard).
    // NULL until first weekly review tick runs. Pattern mirrors last_tick_week (boss_mirror) + last_decay_week (lek).
    // R2.2: server-only — never forwarded to client.
    last_review_week:       integer('last_review_week'),
    created_at:             timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at:             timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // Index for player-scoped lookups (all lieutenant norms for a player).
    player_idx: index('hidden_curriculum_norms_vector_player_idx').on(t.player_id),
  }),
);

export const hiddenCurriculumNormsVectorRelations = relations(hiddenCurriculumNormsVector, ({ one }) => ({
  lieutenant: one(lieutenant, {
    fields: [hiddenCurriculumNormsVector.lieutenant_id],
    references: [lieutenant.lieutenant_id],
  }),
  player: one(player, {
    fields: [hiddenCurriculumNormsVector.player_id],
    references: [player.player_id],
  }),
}));

// ===== Table 5: forbidden_triad_pair_state — per strong-tied pair (migrations 0049 + 0056) =====
//
// Per strong-tied pair state (max 66 pairs per player — N=12 cap → 66 pairs quadratic bound :194).
// Canon :196-199: triadic_state enum UNMET|MET_ONCE|BONDED|COLLABORATING + anomaly_pressure_bucket + last_event_tick (4 B).
// DD-BYTES: enum as varchar (no pgEnum — closed domain stored as text for simplicity in this persistence layer);
//           anomaly_pressure_bucket as real (R8b: promoted from smallint — accumulates Δ=0.12/week float accrual);
//           last_event_tick as integer.
// PK composite: (player_id, pair_key) — pair_key = uuid combining the two contact IDs.
// Max 66 rows per player (enforced at service layer, R8a).
//
// R8a (migration 0056): adds `strong_tie_members` (JSONB, nullable) for the per-player ordered
//   strong-tie membership set. This column is ONLY meaningful on the sentinel row where
//   pair_key = player_id (the player's own UUID as the sentinel key). On all other (pair-state)
//   rows, this column is NULL.
//
//   strong_tie_members format: Array<{ contact_id: string, joined_at: number (epoch ms) }>,
//     ordered by joined_at ASC (oldest first). Max forbidden_triad_n_strong_cap entries (default 12).
//   The sentinel row's triadic_state / anomaly_pressure_bucket / last_event_tick are ignored (default 0).
//   Only the `strong_tie_members` column is meaningful on the sentinel row.
//
//   R2.2: strong_tie_members is server-only (never forwarded to client).
//   DD-REG-NAME: cap is read from `reputation.forbidden_triad_n_strong_cap` (registry, default 12).
//
// R8b (migration 0057): adds 2 columns for the weekly tick state.
//   `last_eval_week` (integer, nullable) — idempotence guard for evaluatePairs() weekly tick.
//     NULL until the first weekly tick runs for the pair. evaluatePairs() skips rows where
//     last_eval_week = current weekId (idempotent per week).
//   `observer_interest_flag` (boolean, not null, default false) — whether the designated
//     observer NPC has flipped its interest_flag for this pair. Set to TRUE once
//     anomaly_pressure_bucket >= triad_H_observer_weeks (registry). One-way gate.
//     R2.2: both columns server-only (player sees dashed lines + observer cues :208 — never raw flag).
export const forbiddenTriadPairState = pgTable(
  'forbidden_triad_pair_state',
  {
    player_id:              uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),
    // Canonical pair key — uuid derived from the two contact IDs (e.g. UUID5 of sorted(idA, idB)).
    // SPECIAL CASE: when pair_key = player_id, this is the SENTINEL row for the strong-tie set.
    pair_key:               uuid('pair_key').notNull(),
    // Triadic state enum — UNMET | MET_ONCE | BONDED | COLLABORATING (:197).
    triadic_state:          integer('triadic_state').notNull().default(0),  // 0=UNMET, 1=MET_ONCE, 2=BONDED, 3=COLLABORATING
    // Composite anomaly pressure accumulator — real (promoted from smallint at R8b migration 0057).
    // R8b: accumulates triad_observer_attention_share (Δ=0.12/week, a float) per canon :201-204.
    // The smallint from migration 0049 was insufficient for float weekly accrual; R8b ALTERs to real.
    anomaly_pressure_bucket: real('anomaly_pressure_bucket').notNull().default(0),
    // Game tick of last event for this pair (2-B conceptual, integer in PG).
    last_event_tick:        integer('last_event_tick').notNull(), // W1.1-d C1.2 — plus de `.default(0)` TS-side (ANCRE ABSOLUE nominale). Corps lu (C1 ⊥): ce champ est écrit littéralement `0` à TOUS les sites de création (`forbidden-triad.service.ts`, `reputation-test.controller.ts`) et JAMAIS mis à jour ensuite (aucun consommateur ne calcule `currentTick - last_event_tick`) — colonne inerte, zéro-régression à garder `0` explicite. DDL SQL garde `DEFAULT 0`. Voir C1 implementation-notes.md §Deviations.
    // R8a (migration 0056): strong-tie membership set — ONLY set on the sentinel row (pair_key = player_id).
    // NULL on all pair-state rows. Format: Array<{ contact_id: string, joined_at: number }>.
    // Ordered by joined_at ASC (oldest first) for deterministic eviction.
    // R2.2: server-only — never forwarded to client.
    strong_tie_members:     jsonb('strong_tie_members'),
    // R8b (migration 0057): weekly tick state — idempotence guard + observer interest flag.
    // NULL until the first weekly tick runs. `evaluatePairs()` skips rows with last_eval_week = current weekId.
    // R2.2: server-only — never forwarded to client.
    last_eval_week:         integer('last_eval_week'),
    // R8b: observer NPC interest flag. TRUE once anomaly_pressure_bucket >= triad_H_observer_weeks (registry).
    // One-way gate (never reset). R2.2: server-only (player sees dashed-line + observer NPC cues :208).
    observer_interest_flag: boolean('observer_interest_flag').notNull().default(false),
    created_at:             timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at:             timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.player_id, t.pair_key] }),
    // Index for player-scoped lookups (evaluatePairs weekly tick).
    player_idx: index('forbidden_triad_pair_state_player_idx').on(t.player_id),
  }),
);

export const forbiddenTriadPairStateRelations = relations(forbiddenTriadPairState, ({ one }) => ({
  player: one(player, {
    fields: [forbiddenTriadPairState.player_id],
    references: [player.player_id],
  }),
}));

// ===== Table 6: lek_memory_cell_state — SIBLING TABLE (DD-LEK-LOC) per (player_id, tile_id) (migration 0050 + 0054) =====
//
// Per-cell (player_id, tile_id) position-memory state for the Lek Memory mechanic (§3.3).
// DD-LEK-LOC: SIBLING TABLE — NOT columns on deal_leks. deal_leks is the hot sparse deal-flow path;
//   lek_memory is a distinct concern (trailing ops + fairness sigs + λ + decay) with its own lifecycle.
//   Sibling keeps R9.3 additive: deal_leks is byte-untouched.
// Canon :113-119: 24 B conceptual state:
//   trailing_operator_ids: 8 B — last 4 operators FIFO (UUID array, JSONB).
//   trailing_fairness_signatures: 2 B — 4 × 4-bit nibble per prior operator (DD-BYTES: array of smallint 0-15).
//   last_active_tick: 4 B — integer.
//   lambda_weight: 4 B — inheritance weight ∈ [0,1] (real).
//   decay_state: 4 B — decay accumulator (real).
// PK composite: (player_id, tile_id).
// tile_id: integer mirroring deal_leks.tile_id (REUSE concept, no parallel definition).
// FK: player_id → player(player_id) ON DELETE CASCADE + INDEX.
//
// R5a (migration 0054) adds 1 derived server-only scalar:
//   last_decay_week — integer week-id of the last runDecayTick() run (idempotence guard per-week).
//     NULL until the first decay tick runs. Pattern mirrors last_tick_week on BossMirrorViolationRing.
// R2.2: lambda_weight (current λ_now) + trailing arrays are server-only.
//        Player surface: footprint + textual tag (:131) — never the raw λ_now number.
export const lekMemoryCellState = pgTable(
  'lek_memory_cell_state',
  {
    player_id:                    uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),
    // tile_id mirrors deal_leks.tile_id (integer — REUSE, no FK declared — deal_leks is the FK anchor).
    tile_id:                      integer('tile_id').notNull(),
    // JSONB FIFO array of operator UUIDs (last 4 operators) — max slots = lek_inheritance_slots tunable.
    trailing_operator_ids:        jsonb('trailing_operator_ids').notNull().default('[]'),
    // JSONB array of fairness signatures (smallint 0-15, 4-bit nibble per prior operator, DD-BYTES).
    // Negative fairness → lower nibble values (e.g. 0=worst, 15=best).
    trailing_fairness_signatures: jsonb('trailing_fairness_signatures').notNull().default('[]'),
    // Game tick when the last deal was run on this cell (4-B conceptual, integer in PG).
    last_active_tick:             integer('last_active_tick').notNull(), // W1.1-d C1.2 — plus de `.default(0)` TS-side (ANCRE ABSOLUE nominale). Corps lu (C1 ⊥): écrit littéralement `0` à TOUS les sites de création (`lek-memory.service.ts#bindOperator`/`#recordDealFairness`, `reputation-test.controller.ts`) et JAMAIS avancé (le decay tick utilise `last_decay_week`, une colonne SÉPARÉE) — colonne inerte, zéro-régression à garder `0` explicite. DDL SQL garde `DEFAULT 0`. Voir C1 implementation-notes.md §Deviations.
    // λ_now — current decayed inheritance weight ∈ [0,1].
    // Initial bind sets this to lek_position_weight_lambda (the base λ from the registry).
    // Each decay tick applies: lambda_weight ← lambda_weight · exp(−1 / τ_halflife_weeks).
    // R2.2: server-only (never forwarded to client; player reads footprint + textual tag :131).
    lambda_weight:                real('lambda_weight').notNull().default(0),
    // Decay state accumulator — reserved for future multi-day delta tracking.
    decay_state:                  real('decay_state').notNull().default(0),
    // R5a (migration 0054): last_decay_week — week-id of the last runDecayTick() (idempotence guard).
    // NULL until first decay tick runs. Pattern mirrors last_tick_week on boss_mirror_violation_ring.
    // R2.2: server-only (idempotence guard — never forwarded to client).
    last_decay_week:              integer('last_decay_week'),
    created_at:                   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at:                   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.player_id, t.tile_id] }),
    // Index for player-scoped lookups (all lek cells for a player).
    player_idx: index('lek_memory_cell_state_player_idx').on(t.player_id),
  }),
);

export const lekMemoryCellStateRelations = relations(lekMemoryCellState, ({ one }) => ({
  player: one(player, {
    fields: [lekMemoryCellState.player_id],
    references: [player.player_id],
  }),
}));

// ── Inferred types ────────────────────────────────────────────────────────────────────────────────

export type BossMirrorViolationRingRow    = typeof bossMirrorViolationRing.$inferSelect;
export type BossMirrorViolationRingInsert = typeof bossMirrorViolationRing.$inferInsert;

export type BossMirrorDeclarationLedgerRow    = typeof bossMirrorDeclarationLedger.$inferSelect;
export type BossMirrorDeclarationLedgerInsert = typeof bossMirrorDeclarationLedger.$inferInsert;

export type RestraintDisputeRingRow    = typeof restraintDisputeRing.$inferSelect;
export type RestraintDisputeRingInsert = typeof restraintDisputeRing.$inferInsert;

export type HiddenCurriculumNormsVectorRow    = typeof hiddenCurriculumNormsVector.$inferSelect;
export type HiddenCurriculumNormsVectorInsert = typeof hiddenCurriculumNormsVector.$inferInsert;

export type ForbiddenTriadPairStateRow    = typeof forbiddenTriadPairState.$inferSelect;
export type ForbiddenTriadPairStateInsert = typeof forbiddenTriadPairState.$inferInsert;

export type LekMemoryCellStateRow    = typeof lekMemoryCellState.$inferSelect;
export type LekMemoryCellStateInsert = typeof lekMemoryCellState.$inferInsert;
