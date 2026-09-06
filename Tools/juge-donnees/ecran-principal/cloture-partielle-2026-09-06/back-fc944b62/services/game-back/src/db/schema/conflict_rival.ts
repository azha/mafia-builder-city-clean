// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-A-rival-foundation-plan.md Task 1 (C1) Step 1
//             Design: docs/superpowers/specs/2026-06-24-04b-A-rival-foundation-design.md §9.5 (schema)
//             Canon: docs/tech/04b_combat_and_conflict/rival_ai_mechanics.md §7 (RivalStateEntity)
//             docs/tech/09_data_model/schema_conflict_rival.md §2 (R9.3 backport — same-commit)
//             — Rival AI Foundation C1 — 2026-06-24 —
//
// TABLES (1 NEW rival entity — migration 0081):
//
//   rival_state — per-player × per-rival AI state snapshot (the OODA + saturation + intel state).
//     PK composite: (player_id, rival_key) — one row per rival per player.
//     FK: player_id → player(player_id) ON DELETE CASCADE.
//     regime: rival_regime NOT NULL — current OODA regime (expansionary/consolidating/...).
//     regime_pressure: real NOT NULL DEFAULT 0 — pressure accumulator toward flip_threshold.
//     flip_threshold: real NOT NULL — regime-transition threshold (canon 70 default, C2 tunable).
//     observe_interval_ticks: smallint NOT NULL — OODA "Observe" cadence (per-rival baseline).
//     orient_latency_ticks:   smallint NOT NULL — OODA "Orient" latency (per-rival baseline).
//     commit_delay_ticks:     smallint NOT NULL — OODA "Act" delay (per-rival baseline).
//     saturation_pressure: real NOT NULL DEFAULT 0 — saturation accumulator.
//     intel_mode: intel_mode NOT NULL — pull | push.
//     mode_stability_ticks: integer NOT NULL DEFAULT 0 — ticks since last mode flip.
//     route_integrity: real nullable — Coil Distributed Hold metric; NULL for non-Coil until C5.
//     dominance_rank: smallint nullable — RESERVED by A, WRITTEN by B (OQ-A8).
//     vulnerable_axis: erosion_register_id nullable — RESERVED by A, WRITTEN by B (OQ-A8).
//
// ENUMS (4 NEW closed-domain types — migration 0081):
//   rival_key               — coil | tarcum | iron_throat | saltline (the 4 rival factions)
//   rival_regime            — expansionary | consolidating | bleeding | defensive | retrench | withdrawal
//   intel_mode              — pull | push
//   erosion_register_id     — muscle | finance | intel | infrastructure | leadership
//
// R9.3: this file matches migration 0081 byte-for-meaning.
//       The ch09 mirror is docs/tech/09_data_model/schema_conflict_rival.md (created same-commit).
// R2.2: regime / regime_pressure / intel_mode / saturation_pressure / dominance_rank / vulnerable_axis
//       / tempo intervals / route_integrity are SERVER-ONLY (P6 hidden per design §9.5).
//       dominance_rank + vulnerable_axis are reserved-by-A / written-by-B (OQ-A8).
// Anti-fabrication (C1): no Math.random(); no non-deterministic value in schema defaults.
// Zero-regression invariant (§0.2): no existing tables modified. ADDITIVE only.

import {
  pgTable,
  pgEnum,
  uuid,
  real,
  smallint,
  integer,
  boolean,
  bigint,
  varchar,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { player } from './player';

// ===== Forward note: rival_holding (C5) + rival_pair_pressure (C6) =====
// Both tables are defined BELOW after rival_state.
// rival_holding uses integer SOFT-REFs (no FK) to blocks.id / districts.id — following the
// corridor_debt.block_id precedent (0076).
// rival_pair_pressure uses only player_id FK (ON DELETE CASCADE) — no FK to global rival keys
// or any global static table (per-player table soft-ref discipline, §9.3).

// ===== pgEnums (4 closed-domain enum types for the rival_state entity) =====

/**
 * `rival_key` — the 4 rival factions in the city.
 * Canon: rival_ai_mechanics.md §9.5 — the four named rivals the player contends with.
 */
export const rivalKey = pgEnum('rival_key', [
  'coil',
  'tarcum',
  'iron_throat',
  'saltline',
]);

/**
 * `rival_regime` — 6-mode OODA decision regime.
 * Canon: rival_ai_mechanics.md :64 — the 6 canonical regimes.
 * expansionary: territory acquisition mode (aggressive expansion).
 * consolidating: entrench-and-stabilize mode (no expansion, defending gains).
 * bleeding: under pressure but not yet retreating (reactive defense).
 * defensive: reactive containment (absorbed damage, holding ground).
 * retrench: orderly withdrawal to core (strategic retreat).
 * withdrawal: full disengagement from contested zones.
 */
export const rivalRegime = pgEnum('rival_regime', [
  'expansionary',
  'consolidating',
  'bleeding',
  'defensive',
  'retrench',
  'withdrawal',
]);

/**
 * `intel_mode` — information-gathering posture.
 * Canon: rival_ai_mechanics.md :336 — pull | push.
 * pull: passive collection (observer); low signature but slow.
 * push: active probing (provocateur); faster but detectable.
 */
export const intelMode = pgEnum('intel_mode', ['pull', 'push']);

/**
 * `erosion_register_id` — the 5 axes of rival capacity that can be eroded.
 * Canon: combat_mechanics.md :194-198 — the 5 erosion registers.
 * Nullable `vulnerable_axis` on rival_state references this enum (OQ-A8 — reserved by A, written by B).
 */
export const erosionRegisterId = pgEnum('erosion_register_id', [
  'muscle',
  'finance',
  'intel',
  'infrastructure',
  'leadership',
]);

/**
 * `partition_state` — network partition status for the B-owned rival_state column (OQ-B2).
 * Canon: combat_mechanics.md §2 (Operational Graph — B-owned rival_state combat column).
 * Declared here (conflict_rival.ts) to avoid a circular import with conflict_combat.ts.
 * conflict_combat.ts re-exports this enum (one-way dependency: combat → rival, no cycle).
 *
 * integrated:  all operational graph segments connected (normal state).
 * fragmented:  the graph has been partitioned by combat pressure (degraded state).
 *
 * OQ-B2: reserved by A (nullable column added in migration 0085 ALTER), written by B.
 */
export const partitionState = pgEnum('partition_state', [
  'integrated',
  'fragmented',
]);

// ===== Table: rival_state =====

/**
 * `rival_state` — per-player × per-rival AI state.
 *
 * PK composite: (player_id, rival_key) — exactly one row per rival per player.
 * Seeded via RivalSeedService.ensurePlayerRivals (DD-RIVAL-SEED).
 *
 * P6 (SERVER-ONLY columns — never forwarded to the player client):
 *   regime, regime_pressure, flip_threshold, observe_interval_ticks, orient_latency_ticks,
 *   commit_delay_ticks, saturation_pressure, intel_mode, mode_stability_ticks, route_integrity,
 *   dominance_rank, vulnerable_axis.
 *
 * OQ-A8: dominance_rank + vulnerable_axis are RESERVED by lot A (column declared here),
 *   WRITTEN by lot B (the 04b-B competitive dynamics lot). Null until B writes them.
 *
 * soft-ref discipline for future lot: rival_holding.block_id (C5) will be a SOFT-REF (no FK),
 *   following the corridor_debt.block_id discipline (migration 0076).
 */
export const rivalState = pgTable(
  'rival_state',
  {
    player_id: uuid('player_id')
      .notNull()
      .references(() => player.player_id, { onDelete: 'cascade' }),
    rival_key: rivalKey('rival_key').notNull(),

    // ─── OODA regime ───────────────────────────────────────────────────
    regime:          rivalRegime('regime').notNull(),
    regime_pressure: real('regime_pressure').notNull().default(0),
    flip_threshold:  real('flip_threshold').notNull(),

    // ─── OODA tempo intervals (per-rival static baselines, C2 tunable) ──
    observe_interval_ticks: smallint('observe_interval_ticks').notNull(),
    orient_latency_ticks:   smallint('orient_latency_ticks').notNull(),
    commit_delay_ticks:     smallint('commit_delay_ticks').notNull(),

    // ─── Saturation ────────────────────────────────────────────────────
    saturation_pressure: real('saturation_pressure').notNull().default(0),

    // ─── Intel mode ────────────────────────────────────────────────────
    intel_mode:           intelMode('intel_mode').notNull(),
    mode_stability_ticks: integer('mode_stability_ticks').notNull().default(0),

    // ─── Route integrity (Coil only; NULL for others until C5) ─────────
    // R2.2: server-only scalar — never forwarded to client.
    route_integrity: real('route_integrity'),

    // ─── OQ-A8 reserved columns (written by lot B) ─────────────────────
    // dominance_rank: competitive rank among the 4 rivals (1=most dominant). NULL until B writes.
    // vulnerable_axis: the erosion axis B identifies as currently weakest. NULL until B writes.
    dominance_rank:  smallint('dominance_rank'),
    vulnerable_axis: erosionRegisterId('vulnerable_axis'),

    // ─── OQ-B2 B-owned combat columns (added by B migration 0085, ALTER additive) ──
    // active_link_fraction: operational network link fraction (real; HIDDEN server-only).
    // operational_graph_node_count: count of live operational nodes (smallint; HIDDEN server-only).
    // partition_state: network partition status — integrated|fragmented (HIDDEN server-only).
    // cumulative_pressure_index: CPI accumulator (real; HIDDEN server-only).
    // resource_pressure: resource depletion pressure (real; HIDDEN server-only).
    active_link_fraction:         real('active_link_fraction'),
    operational_graph_node_count: smallint('operational_graph_node_count'),
    partition_state:              partitionState('partition_state'),
    cumulative_pressure_index:    real('cumulative_pressure_index'),
    resource_pressure:            real('resource_pressure'),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.player_id, t.rival_key] }),
  }),
);

// ===== Table: rival_holding (C5) =====

/**
 * `rival_holding` — per-player × per-rival set of held blocks (Distributed Hold, §3.4 — Coil-primary).
 *
 * IMPLEMENTS: docs/superpowers/specs/2026-06-24-04b-A-rival-foundation-design.md §9.4
 * CANON: docs/tech/04b_combat_and_conflict/rival_ai_mechanics.md :194-233 (Distributed Hold)
 *
 * PK composite: (player_id, rival_key, block_id) — one row per held block per rival per player.
 * FK: player_id → player(player_id) ON DELETE CASCADE (cleans up when player is deleted).
 *
 * SOFT-REF discipline (corridor_debt.block_id precedent, migration 0076):
 *   block_id  — integer soft-ref to blocks.id (global static geography — NO DB FK).
 *   district_id — integer soft-ref to districts.id (global static geography — NO DB FK).
 *   NOT FK-ing prevents A from coupling a per-player rivalry table to the global geography table
 *   (the same DB-design rule the 9b CorridorDebt table follows — additive, no implicit cascade).
 *
 * ADDITIVITY INVARIANT (§1.3):
 *   No existing table is modified by C5. Adding `rival_holding` is purely additive.
 *   The route_graph is DERIVED IN-SERVICE over these rows + the live block-graph (DD-ROUTEGRAPH-REUSE).
 *   There is NO `route_graph` table (OQ-A10 — in-service derived, like the 9b same-bank adjacency).
 *
 * P6 (SERVER-ONLY):
 *   rival_holding rows are never returned to the player client; they are the server-side
 *   data the DistributedHoldService reads to derive the route_integrity bucket.
 *
 * C5 seed: seeded via /v1/_test/rival/seed-holdings (the test-controller route, Coil only).
 *   In production, holdings are written by B-lot events (rival territory capture — deferred).
 */
export const rivalHolding = pgTable(
  'rival_holding',
  {
    player_id: uuid('player_id')
      .notNull()
      .references(() => player.player_id, { onDelete: 'cascade' }),
    rival_key: rivalKey('rival_key').notNull(),

    // ─── Block + district (SOFT-REFs — NO DB FK to global geography) ──────────────────────────
    // SOFT-REF discipline: block_id is a bare integer referencing the global static blocks table.
    // NO FOREIGN KEY — mirrors corridor_debt.block_id (migration 0076 §DD-DEBT-SSOT).
    // The routing service reads blocks/districts for the route-graph without needing a DB constraint.
    block_id:    integer('block_id').notNull(),   // soft-ref to blocks.id (static geography)
    district_id: integer('district_id').notNull(), // soft-ref to districts.id (non-contiguous, :200)

    // ─── Oxbow Severance orphan flag (C6 — migration 0091) ───────────────────────────────────────
    // is_orphan: set to TRUE by reclassifySalientAsOrphan when the neck is held for
    // combat.oxbow_hold_duration_ticks ticks (§3.5, canon :263 — reduced heat + decaying BPD interest).
    // false at rest (the default — no isolation). ADDITIVE, NOT NULL DEFAULT false.
    is_orphan: boolean('is_orphan').notNull().default(false), // Oxbow orphan flag (C6)
  },
  (t) => ({
    pk: primaryKey({ columns: [t.player_id, t.rival_key, t.block_id] }),
  }),
);

// ===== Table: rival_attack_pattern_resistance (C7) =====

/**
 * `rival_attack_pattern_resistance` — per-player × per-rival × per-pattern resistance accumulator.
 *
 * IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-A-rival-foundation-plan.md Task 7 (C7)
 * CANON: docs/tech/04b_combat_and_conflict/rival_ai_mechanics.md :285-321 (Adaptive Skin, §3.6)
 * DESIGN: docs/superpowers/specs/2026-06-24-04b-A-rival-foundation-design.md §9.2
 *
 * PK composite: (player_id, rival_key, pattern_hash) — one row per pattern per rival per player.
 * FK: player_id → player(player_id) ON DELETE CASCADE.
 *
 * SOFT-REF discipline (§9.2 — mirrors rival_holding/rival_pair_pressure):
 *   rival_key: uses the rival_key enum (NO FK to a global rivals table).
 *   Only player_id FK cascades (cleans up on player delete).
 *
 * P6 / R2.2 (SERVER-ONLY):
 *   `resistance` is the raw float accumulator — NEVER forwarded to the player client (:305).
 *   The player sees only the ResistanceBucket (derived in AdaptiveSkinService.getPatternResistance).
 *
 * `last_used_tick`: bigint (mode:'bigint') — game-minute of the most recent recordAttack call.
 *   Used by daily decay to identify idle patterns (last_used_tick < current gameMinute → idle).
 *   Serializes as a STRING in JSON (pg bigint→string pattern — matches ledger_entry_ring.last_audit_tick).
 *
 * C7 additivity (§1.3): this table is NEW — no existing tables modified.
 */
export const rivalAttackPatternResistance = pgTable(
  'rival_attack_pattern_resistance',
  {
    player_id: uuid('player_id')
      .notNull()
      .references(() => player.player_id, { onDelete: 'cascade' }),

    // ─── Rival key (SOFT-REF discipline — enum-typed, no FK to global table) ───────────────────
    rival_key: rivalKey('rival_key').notNull(),

    // ─── Pattern hash (B/C-supplied deterministic key for an attack/economic pattern) ──────────
    // Canon :285 `AttackPatternHash` — a deterministic hash of the attack shape (B/C supplies it).
    // varchar(64) — consistent with the plan §9.2 column spec.
    pattern_hash: varchar('pattern_hash', { length: 64 }).notNull(),

    // ─── Resistance float (SERVER-ONLY / P6-hidden) ───────────────────────────────────────────
    // The raw per-pattern resistance accumulator (:285, :298). Default 0.
    // Incremented by adaptation_rate on each recordAttack call (per-rival rate (:291-293)).
    // Decayed by 0.01/daily-tick when idle (adaptiveSkinResistanceDecayWhenUnusedPerTick, :321).
    // NEVER visible to the player — the ResistanceBucket is derived (P6 invariant, :305).
    resistance: real('resistance').notNull().default(0),

    // ─── Last used tick (bigint, serializes as string in JSON) ───────────────────────────────
    // game-minute of the most recent recordAttack for this pattern.
    // Used by daily decay: pattern is "idle" if last_used_tick < current gameMinute.
    // bigint(mode:'bigint') → BigInt in TypeScript → string in JSON serialization.
    // Pattern: ledger_entry_ring.last_audit_tick (forensic.ts:140 — same mode:'bigint').
    last_used_tick: bigint('last_used_tick', { mode: 'bigint' }).notNull().default(BigInt(0)),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.player_id, t.rival_key, t.pattern_hash] }),
  }),
);

// ===== Table: rival_pair_pressure (C6) =====

/**
 * `rival_pair_pressure` — per-player pairwise suppression pressure (Trophic Gap, §3.5).
 *
 * IMPLEMENTS: docs/superpowers/specs/2026-06-24-04b-A-rival-foundation-design.md §9.3
 * CANON: docs/tech/04b_combat_and_conflict/rival_ai_mechanics.md :243-248 (Trophic Gap state)
 *
 * PK composite: (player_id, rival_a_key, rival_b_key) — one row per directed suppression pair.
 * FK: player_id → player(player_id) ON DELETE CASCADE.
 *
 * SOFT-REF discipline (§9.3, same rule as rival_holding):
 *   rival_a_key / rival_b_key — use the rival_key enum (already in this schema), but
 *   there is NO FK coupling between this per-player table and any global rival keys table.
 *   The values are enum-checked at the Postgres level (via the shared rival_key type)
 *   but no DB FK points to any global static table. This follows the corridor_debt.block_id
 *   soft-ref discipline (migration 0076) — per-player additivity without global cascade coupling.
 *
 * Column semantics (§9.3):
 *   rival_a_key — the suppressing rival (`:244`).
 *   rival_b_key — the suppressed secondary (`:248`).
 *   enforcement_pressure — the raw PairwisePressureBucket float (`:245`).
 *                          SERVER-ONLY / P6 — HIDDEN from the player client.
 *                          The soft indicator is DERIVED in TrophicGapService.getTrophicSuppression.
 *   top_enforcer_active — whether rival_a's top enforcer is still active (`:247`).
 *                         Flipped by removeTopEnforcer (the B/C write-hook, §13).
 *
 * P6 (SERVER-ONLY): enforcement_pressure is NEVER forwarded to the player.
 *   The player sees only the qualitative soft indicator ("X appears to suppress Y" — `:257`).
 *   See TrophicGapService.getTrophicSuppression for the projection.
 *
 * Seeded by RivalSeedService.seedTrophicPairs (the canon-relevant suppression pairs, OQ-A9).
 * The pair set is ~4 directed pairs [PROV-Y26Q2] — NOT the full 4×3 cross-product.
 *
 * Additivity (§1.3): this table is NEW — no existing tables modified by C6.
 */
export const rivalPairPressure = pgTable(
  'rival_pair_pressure',
  {
    player_id: uuid('player_id')
      .notNull()
      .references(() => player.player_id, { onDelete: 'cascade' }),

    // ─── Suppression pair (rival_key enum — SOFT-REF discipline, no FK to global table) ──────
    // rival_a_key: the suppressing rival (holds territory / runs enforcement).
    // rival_b_key: the suppressed secondary (held back by rival_a's enforcement presence).
    rival_a_key: rivalKey('rival_a_key').notNull(),
    rival_b_key: rivalKey('rival_b_key').notNull(),

    // ─── Pairwise pressure float (SERVER-ONLY / P6-hidden) ───────────────────────────────────
    // The raw PairwisePressureBucket float (:245). Starts at 0. Restoration increments per tick.
    // NEVER exposed to client — the soft indicator is derived in getTrophicSuppression.
    enforcement_pressure: real('enforcement_pressure').notNull().default(0),

    // ─── Enforcer-active flag ─────────────────────────────────────────────────────────────────
    // Starts true (enforcer is active). Flipped to false by removeTopEnforcer (B/C §13 hook).
    // Once false, rebalancePressurePairs restores enforcement_pressure per tick until duration.
    top_enforcer_active: boolean('top_enforcer_active').notNull().default(true),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.player_id, t.rival_a_key, t.rival_b_key] }),
  }),
);

// ===== Table: rival_erosion_register (C5 B-lot) =====

/**
 * `rival_erosion_register` — per-player × per-rival × per-register capacity state.
 *
 * IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-B-combat-escalation-plan.md Task 5 (C5)
 * CANON: docs/tech/04b_combat_and_conflict/combat_mechanics.md :194-231 (Erosion Register §2.4)
 * DESIGN: docs/superpowers/specs/2026-06-24-04b-B-combat-escalation-design.md §3.4
 *
 * PK composite: (player_id, rival_key, register_id) — one row per erosion register per rival per player.
 * FK: player_id → player(player_id) ON DELETE CASCADE.
 *
 * SOFT-REF discipline (same rule as rival_holding):
 *   rival_key — enum-typed, no FK to a global rivals table (per-player additivity).
 *   register_id — uses the erosion_register_id enum (same discipline).
 *
 * current_value_bucket — the closed RegisterValueBucket domain:
 *   crippled | weakened | standard | strong | dominant
 *   (P6/R2.2 — the bucket IS the player-facing state; no raw degrade float is exposed).
 *   Default 'standard' at seed (all registers at nominal capacity, canon :194).
 *
 * P6 (SERVER-ONLY): these rows are never returned to the player client raw; they are
 *   read by ErosionRegisterService.getRegisters and projected to the player as a bucket list
 *   WITHOUT dominance_rank or vulnerable_axis (those live on rival_state OQ-A8 — P6 strip).
 *
 * Seeded via ErosionRegisterService.ensureRegisters (UPSERT 5 rows per rival per player at 'standard').
 * In production: written by ErosionRegisterService.degradeRegister.
 *
 * Additivity (§1.3): this table is NEW — no existing tables modified by C5.
 * Anti-fabrication: no Math.random(); no non-deterministic value in defaults.
 * R9.3: backported to docs/tech/09_data_model/schema_conflict_rival.md §3h (follow-up fix commit).
 * Migration: 0090_rival_erosion_register.sql.
 */
export const rivalErosionRegister = pgTable(
  'rival_erosion_register',
  {
    player_id: uuid('player_id')
      .notNull()
      .references(() => player.player_id, { onDelete: 'cascade' }),

    // ─── Rival + register identity (enum-typed soft-refs) ────────────────────────────────────
    rival_key:   rivalKey('rival_key').notNull(),
    register_id: erosionRegisterId('register_id').notNull(),

    // ─── P6-safe current value bucket (the ONLY player-facing state per register) ─────────────
    // closed domain: 'crippled'|'weakened'|'standard'|'strong'|'dominant' (RegisterValueBucket).
    // Default 'standard' (nominal capacity, canon :194).
    // NEVER exposed as a raw float — the bucket IS the projection (R2.2 clean).
    current_value_bucket: varchar('current_value_bucket', { length: 16 }).notNull().default('standard'),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.player_id, t.rival_key, t.register_id] }),
  }),
);
