// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-C-diplomacy-infowar-plan.md Task 1 (C1) Step 3
//             Design: docs/superpowers/specs/2026-06-24-04b-C-diplomacy-infowar-design.md §9.1-9.4
//             Canon: docs/tech/04b_combat_and_conflict/diplomacy_mechanics.md §4 (DiplomacyModule)
//             docs/tech/09_data_model/schema_conflict_diplomacy.md §2 (R9.3 backport — same-commit)
//             — Diplomacy & Information Warfare C C1 — 2026-06-26 —
//
// TABLES (7 NEW diplomacy entities — migrations 0094-0095):
//
//   diplomacy_pair_state — per-player × per-rival diplomacy state (migrations 0094).
//     PK composite: (player_id, rival_key) — one row per rival per player.
//     FK: player_id → player(player_id) ON DELETE CASCADE.
//     commitment_ledger: jsonb NOT NULL DEFAULT '[]' — BurnedOptionEntry[] (Burn Notice §3.1).
//     trust_decay: real NOT NULL DEFAULT 0 — the trust float. HIDDEN (P6 — never exposed).
//     display_vulnerabilities: jsonb NOT NULL DEFAULT '[]' — ZoneId[] (Vulnerability Display §3.2).
//     leverage_tokens: jsonb NOT NULL DEFAULT '[]' — LeverageToken[] (Proof of Leverage §3.4).
//     skepticism_thresholds: jsonb NOT NULL DEFAULT '{}' — per-type skepticism map (§3.4). HIDDEN.
//
//   credibility_state — the SINGLE credibility accumulator (DD-CREDIBILITY §5) (migration 0094).
//     PK composite: (player_id, rival_key).
//     FK: player_id → player(player_id) ON DELETE CASCADE.
//     credibility: real NOT NULL DEFAULT 0 — the SINGLE accumulator. HIDDEN/BO-only.
//     NOTE: credibility MUST NOT appear on any other diplomacy table. The reviewer⊥ greps this
//     file and finds `credibility` ONLY on credibility_state (DD-CREDIBILITY anti-double-count).
//
//   public_ledger_entry — the P5 exception (the ONE publicly-visible commitment) (migration 0094).
//     PK: entry_id uuid.
//     FK: player_id → player(player_id) ON DELETE CASCADE.
//     entry_type: public_ledger_entry_type NOT NULL (potlatch_gift|sealed_commitment|proof_broadcast).
//     target_rival_key: rival_key NOT NULL.
//     gameMinute: bigint NOT NULL — game-time of the broadcast (serialized as STRING in JSON).
//
//   shared_exposure_lock — per-player × per-rival × per-district mutual deterrence (migration 0095).
//     PK composite: (player_id, rival_key, district_id).
//     FK: player_id → player(player_id) ON DELETE CASCADE.
//     district_id: integer — SOFT-REF (no FK to districts; the 9b discipline).
//     shared_bpd_attention: real NOT NULL DEFAULT 0 — from the BPD read (HIDDEN).
//     mutual_exposure_flag: boolean NOT NULL DEFAULT false.
//     auto_truce_active: boolean NOT NULL DEFAULT false.
//
//   sealed_envelope_commitment — per active sealed commitment (migration 0095).
//     PK: commitment_id uuid.
//     FK: player_id → player(player_id) ON DELETE CASCADE.
//     rival_key: rival_key NOT NULL.
//     target_hash: varchar(128) NOT NULL — deterministic commitment (DD-SEALED-HASH).
//     reveal_deadline_tick: bigint NOT NULL.
//
//   revelation_trap — per active trap offer (migration 0095).
//     PK: trap_id uuid.
//     FK: player_id → player(player_id) ON DELETE CASCADE.
//     rival_key: rival_key NOT NULL.
//     offer_menu: jsonb NOT NULL DEFAULT '[]' — OfferOption[].
//     rival_type_inferred: rival_intent_type nullable — inferred intent (honor_intent|defect_intent).
//
//   dispersal_suppression_pact — per active pact (migration 0095).
//     PK: pact_id uuid.
//     FK: player_id → player(player_id) ON DELETE CASCADE.
//     rival_key: rival_key NOT NULL.
//     suppressed_districts: jsonb NOT NULL DEFAULT '[]' — district soft-ref array.
//     joint_response_script: jsonb NOT NULL DEFAULT '{}' — script object.
//     pact_duration_ticks: integer NOT NULL DEFAULT 12 — the dispersal pact duration.
//
// ENUMS (6 NEW closed-domain types — migration 0094):
//   gift_type              — resource_transfer | territory_concession | supply_route_opening
//   burn_type              — route_burn | asset_burn | intermediary_burn
//   leverage_type          — supply | personnel | financial (canon diplomacy_mechanics.md §4.4)
//   rival_intent_type      — honor_intent | defect_intent
//   interpretation_badge   — posture | preparation | ambiguous
//   public_ledger_entry_type — potlatch_gift | sealed_commitment | proof_broadcast
//
// REUSE: A's `rivalKey` pgEnum (import from conflict_rival.ts — do NOT redeclare it).
//
// R9.3: this file matches migrations 0094-0095 byte-for-meaning.
//       The ch09 mirror is docs/tech/09_data_model/schema_conflict_diplomacy.md (created same-commit).
// R2.2 / P6: credibility / trust_decay / skepticism_thresholds / shared_bpd_attention /
//       reveal_deadline_tick are SERVER-ONLY (never forwarded to the player client).
//       public_ledger_entry IS the canon P5 exception (visible to rivals, diplomacy_mechanics.md:281).
// Soft-ref discipline: district_id has NO FK to districts.id (the 9b corridor_debt precedent).
//   No FK from a per-player C table to global geography or to the A/B tables.
// Anti-fabrication: no Math.random(); no non-deterministic value in schema defaults.
// Zero-regression: no existing tables modified. ADDITIVE only.
// DD-CREDIBILITY: `credibility` appears ONLY on `credibility_state` in this file.

import {
  pgTable,
  pgEnum,
  uuid,
  real,
  integer,
  boolean,
  bigint,
  varchar,
  jsonb,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { player } from './player';
import { rivalKey } from './conflict_rival';

// ===== Re-export rivalKey for consumers of this module =====
// (Not redeclared — REUSE A's enum, imported above)
export { rivalKey } from './conflict_rival';

// ===== pgEnums (6 NEW closed-domain types for the diplomacy entities) =====

/**
 * `gift_type` — the 3 Potlatch gift categories.
 * Canon: diplomacy_mechanics.md :111 — GiftType enum.
 * resource_transfer:      operational resource gift (cash / materials).
 * territory_concession:   yield a claimed zone to the rival.
 * supply_route_opening:   open a supply corridor for the rival's use.
 */
export const giftType = pgEnum('gift_type', [
  'resource_transfer',
  'territory_concession',
  'supply_route_opening',
]);

/**
 * `burn_type` — the 3 Burn Notice commitment types.
 * Canon: diplomacy_mechanics.md :67 — BurnType (ROUTE_BURN | ASSET_BURN | INTERMEDIARY_BURN).
 * route_burn:        sever a distribution route (cross-ref distribution_couriers_runners.md ch9).
 * asset_burn:        abandon a stash or safehouse.
 * intermediary_burn: terminate the Saltline relationship.
 */
export const burnType = pgEnum('burn_type', [
  'route_burn',
  'asset_burn',
  'intermediary_burn',
]);

/**
 * `leverage_type` — the leverage token categories for Proof of Leverage.
 * Canon: diplomacy_mechanics.md :370 — LeverageType.
 * Perimeter §4.4: leverage = supply, personnel, financial kompromat domains.
 * supply:    dependency on supply infrastructure.
 * personnel: personnel vulnerability (lieutenant loyalty / informant).
 * financial: financial liability exposure.
 */
export const leverageType = pgEnum('leverage_type', [
  'supply',
  'personnel',
  'financial',
]);

/**
 * `rival_intent_type` — inferred rival intent in Revelation Trap.
 * Canon: diplomacy_mechanics.md :372 — RivalIntentType (HONOR_INTENT | DEFECT_INTENT).
 * honor_intent:  rival honors the disclosed offer.
 * defect_intent: rival defects (selects offer then reneges).
 */
export const rivalIntentType = pgEnum('rival_intent_type', [
  'honor_intent',
  'defect_intent',
]);

/**
 * `interpretation_badge` — how the rival interprets a Vulnerability Display.
 * Canon: information_warfare_mechanics.md :84-87 — InterpretationBadge.
 * posture:     read as deliberate show of confidence (deters).
 * preparation: read as operational preparation (observes).
 * ambiguous:   unclear reading (no effect).
 */
export const interpretationBadge = pgEnum('interpretation_badge', [
  'posture',
  'preparation',
  'ambiguous',
]);

/**
 * `public_ledger_entry_type` — the 3 commitment types visible on the public ledger.
 * Canon: diplomacy_mechanics.md :113,281 — PublicLedgerEntry types (the P5 exception).
 * potlatch_gift:       a Potlatch Bind gift broadcast (§4.3).
 * sealed_commitment:   a Sealed-Envelope Commitment public announcement (§4.7).
 * proof_broadcast:     a Proof of Leverage broadcast (§4.4).
 */
export const publicLedgerEntryType = pgEnum('public_ledger_entry_type', [
  'potlatch_gift',
  'sealed_commitment',
  'proof_broadcast',
]);

// ===== Table: diplomacy_pair_state (§9.1 — migration 0094) =====

/**
 * `diplomacy_pair_state` — per-player × per-rival diplomacy state.
 *
 * PK composite: (player_id, rival_key) — one row per rival per player.
 * FK: player_id → player(player_id) ON DELETE CASCADE.
 *
 * P6 (SERVER-ONLY columns — never forwarded to the player client):
 *   trust_decay:           the raw trust float (player sees TrustDecayBucket derived).
 *   skepticism_thresholds: the per-type skepticism map (player sees SkepticismBucket derived).
 *
 * Soft-ref discipline: no FK to global geography or to A/B tables.
 * Only player_id CASCADE — the 9b discipline.
 */
export const diplomacyPairState = pgTable(
  'diplomacy_pair_state',
  {
    player_id: uuid('player_id')
      .notNull()
      .references(() => player.player_id, { onDelete: 'cascade' }),
    rival_key: rivalKey('rival_key').notNull(),

    // Burn Notice (§4.1): the array of burned options
    commitment_ledger: jsonb('commitment_ledger').notNull().default([]),

    // Trust float — HIDDEN / P6 (TrustDecayBucket derived server-side)
    trust_decay: real('trust_decay').notNull().default(0),

    // Vulnerability Display (§4.2): designated zone soft-refs
    display_vulnerabilities: jsonb('display_vulnerabilities').notNull().default([]),

    // Proof of Leverage (§4.4): the leverage token list
    leverage_tokens: jsonb('leverage_tokens').notNull().default([]),

    // Skepticism thresholds per-type (§4.4) — HIDDEN / P6 (SkepticismBucket derived)
    skepticism_thresholds: jsonb('skepticism_thresholds').notNull().default({}),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.player_id, t.rival_key] }),
  }),
);

// ===== Table: credibility_state (§9.2 — migration 0094) =====

/**
 * `credibility_state` — the SINGLE credibility accumulator (DD-CREDIBILITY §5).
 *
 * PK composite: (player_id, rival_key).
 * FK: player_id → player(player_id) ON DELETE CASCADE.
 *
 * DD-CREDIBILITY invariant (enforced by the reviewer⊥ grep):
 *   `credibility` is the ONLY credibility column in the diplomacy schema.
 *   It lives here and NOWHERE else (no per-mechanic credibility column on
 *   diplomacy_pair_state or on any pact table).
 *
 * P6 (SERVER-ONLY): credibility float is HIDDEN. The player sees CredibilityScoreBucket
 *   (derived from the float vs the OQ-C4 cuts; player-facing projection).
 * BO: the raw float is exposed at the gm/ops BO endpoint (GET /admin/players/:id/diplomacy-state).
 */
export const credibilityState = pgTable(
  'credibility_state',
  {
    player_id: uuid('player_id')
      .notNull()
      .references(() => player.player_id, { onDelete: 'cascade' }),
    rival_key: rivalKey('rival_key').notNull(),

    // THE single credibility accumulator (DD-CREDIBILITY §5).
    // HIDDEN: player sees CredibilityScoreBucket (derived). BO-only for the raw float.
    credibility: real('credibility').notNull().default(0),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.player_id, t.rival_key] }),
  }),
);

// ===== Table: public_ledger_entry (§9.3 — migration 0094) =====

/**
 * `public_ledger_entry` — the ONE canon P5 exception (explicitly visible to rivals).
 *
 * PK: entry_id uuid (standalone PK — each entry is individually addressable).
 * FK: player_id → player(player_id) ON DELETE CASCADE.
 *
 * Canon: diplomacy_mechanics.md :281 — the public_ledger is "visible to all rivals".
 * This is the ONLY diplomacy table whose rows the player can see rival entries for.
 * All other diplomacy state is HIDDEN (P6 / R2.2).
 *
 * gameMinute: bigint (game-time of broadcast) → serialized as STRING in JSON.
 *   Assert the string form in specs (the standard bigint-JSON invariant).
 *
 * Soft-ref discipline: no FK to global geography or to the A/B tables.
 */
export const publicLedgerEntry = pgTable('public_ledger_entry', {
  entry_id: uuid('entry_id').primaryKey().defaultRandom(),

  player_id: uuid('player_id')
    .notNull()
    .references(() => player.player_id, { onDelete: 'cascade' }),

  // The publicly-visible commitment type (the P5 exception category)
  entry_type: publicLedgerEntryType('entry_type').notNull(),

  // Soft-ref: uses the rival_key enum but no FK to a global rival table
  target_rival_key: rivalKey('target_rival_key').notNull(),

  // Game-time of the broadcast (bigint → string in JSON)
  gameMinute: bigint('gameMinute', { mode: 'bigint' }).notNull(),
});

// ===== Table: shared_exposure_lock (§9.4 §3.5 — migration 0095) =====

/**
 * `shared_exposure_lock` — per-player × per-rival × per-district mutual deterrence.
 *
 * PK composite: (player_id, rival_key, district_id).
 * FK: player_id → player(player_id) ON DELETE CASCADE.
 * Soft-ref: district_id is a plain integer — NO FK to districts (the 9b discipline).
 *
 * P6: shared_bpd_attention is HIDDEN (SharedAttentionBucket derived server-side).
 */
export const sharedExposureLock = pgTable(
  'shared_exposure_lock',
  {
    player_id: uuid('player_id')
      .notNull()
      .references(() => player.player_id, { onDelete: 'cascade' }),
    rival_key: rivalKey('rival_key').notNull(),

    // SOFT-REF: no FK to districts.id (the 9b corridor_debt precedent)
    district_id: integer('district_id').notNull(),

    // BPD attention float — HIDDEN (SharedAttentionBucket derived)
    shared_bpd_attention: real('shared_bpd_attention').notNull().default(0),

    // Derived from mutual_exposure_flag + shared_bpd_attention threshold
    mutual_exposure_flag: boolean('mutual_exposure_flag').notNull().default(false),

    // Auto-truce: derived from mutual_exposure_flag + threshold
    auto_truce_active: boolean('auto_truce_active').notNull().default(false),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.player_id, t.rival_key, t.district_id] }),
  }),
);

// ===== Table: sealed_envelope_commitment (§9.4 §3.7 — migration 0095) =====

/**
 * `sealed_envelope_commitment` — per active sealed commitment (DD-SEALED-HASH).
 *
 * PK: commitment_id uuid (standalone PK — each commitment is individually addressable).
 * FK: player_id → player(player_id) ON DELETE CASCADE.
 *
 * target_hash: the deterministic commitment (DD-SEALED-HASH — a hash of the committed
 *   target + a seeded per-commit salt; NOT RNG — a real commit-reveal, C4-clean).
 * reveal_deadline_tick: bigint — game-time deadline for the reveal.
 *
 * Soft-ref discipline: no FK to global geography or to the A/B tables.
 */
export const sealedEnvelopeCommitment = pgTable('sealed_envelope_commitment', {
  commitment_id: uuid('commitment_id').primaryKey().defaultRandom(),

  player_id: uuid('player_id')
    .notNull()
    .references(() => player.player_id, { onDelete: 'cascade' }),

  rival_key: rivalKey('rival_key').notNull(),

  // Deterministic commitment (DD-SEALED-HASH) — varchar, not RNG
  target_hash: varchar('target_hash', { length: 128 }).notNull(),

  // Game-time reveal deadline (bigint — game-time modular, not wall-clock)
  reveal_deadline_tick: bigint('reveal_deadline_tick', { mode: 'bigint' }).notNull(),
});

// ===== Table: revelation_trap (§9.4 §3.6 — migration 0095) =====

/**
 * `revelation_trap` — per active revelation trap offer.
 *
 * PK: trap_id uuid (standalone PK — each trap is individually addressable).
 * FK: player_id → player(player_id) ON DELETE CASCADE.
 *
 * offer_menu: jsonb — the OfferOption[] menu presented to the rival.
 * rival_type_inferred: nullable — inferred intent after the seeded detection draw.
 *   NULL until the rival responds (honor_intent or defect_intent after inference).
 *
 * Soft-ref discipline: no FK to global geography or to the A/B tables.
 */
export const revelationTrap = pgTable('revelation_trap', {
  trap_id: uuid('trap_id').primaryKey().defaultRandom(),

  player_id: uuid('player_id')
    .notNull()
    .references(() => player.player_id, { onDelete: 'cascade' }),

  rival_key: rivalKey('rival_key').notNull(),

  // The offer menu (OfferOption[] — array of choices presented to the rival)
  offer_menu: jsonb('offer_menu').notNull().default([]),

  // Inferred intent after the seeded detection draw (nullable until resolved)
  rival_type_inferred: rivalIntentType('rival_type_inferred'),
});

// ===== Table: dispersal_suppression_pact (§9.4 §3.8 — migration 0095) =====

/**
 * `dispersal_suppression_pact` — per active dispersal suppression pact.
 *
 * PK: pact_id uuid (standalone PK — each pact is individually addressable).
 * FK: player_id → player(player_id) ON DELETE CASCADE.
 *
 * suppressed_districts: jsonb — array of district ids (SOFT-REF, no FK).
 * joint_response_script: jsonb — the agreed response protocol.
 * pact_duration_ticks: integer — how long the pact lasts.
 *
 * Canon: diplomacy_mechanics.md §4.8 (Dispersal Suppression Pact).
 * Soft-ref discipline: no FK to global geography or to the A/B tables.
 */
export const dispersalSuppressionPact = pgTable('dispersal_suppression_pact', {
  pact_id: uuid('pact_id').primaryKey().defaultRandom(),

  player_id: uuid('player_id')
    .notNull()
    .references(() => player.player_id, { onDelete: 'cascade' }),

  rival_key: rivalKey('rival_key').notNull(),

  // Array of district soft-refs (integer ids — no FK to districts)
  suppressed_districts: jsonb('suppressed_districts').notNull().default([]),

  // The agreed joint response protocol
  joint_response_script: jsonb('joint_response_script').notNull().default({}),

  // Pact duration — canon diplomacy_mechanics.md :253 (default 12 ticks, C2 tunable)
  pact_duration_ticks: integer('pact_duration_ticks').notNull().default(12),
});
