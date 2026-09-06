// IMPLEMENTS: docs/tech/04c_market_reputation_insurance/insurance_mechanics.md §4.1 (:39-44,:146,:209)
//             docs/superpowers/specs/2026-06-17-depth-insurance-underwriting-walk-design.md §3.1
//             docs/tech/09_data_model/schema_insurance.md §2 (R9.3 backport — same-commit)
//             docs/superpowers/plans/2026-06-17-depth-insurance-underwriting-walk-plan.md Task 1 (C1)
//             — Insurance C1 — 2026-06-17
//
// TABLES (4 NEW insurance entities — migrations 0059-0062):
//
//   underwriter_walk_record — per-walk (per contract) server-side walk state.
//     findings_bitmask: bigint — 64-bit mask of observed cues (canon :42, R2.2 server-only).
//     status: walkStatus (WALKING|COMPLETE, default WALKING).
//     PK: id (uuid). FK: player_id → player(player_id) ON DELETE CASCADE + INDEX.
//
//   insurance_contract — per-contract active coverage state.
//     type: coverageType (PROPERTY|STASH_LOSS|COURIER_ARREST|FENCE_DEFAULT).
//     status: contractStatus (ACTIVE|LAPSED|FRAUDED, default ACTIVE).
//     insured_value_cents/premium_cents: bigint (cash-clear, DD-P5).
//     PK: id (uuid). FK: player_id → player(player_id) ON DELETE CASCADE + INDEX.
//
//   insurance_claim — per-claim filed claim state.
//     claim_basis: claimBasis enum (the §1.4 menu).
//     status: claimStatus (FILED|PAID|DENIED_FRAUD, default FILED).
//     claimed_cents/payout_cents: bigint (default 0).
//     PK: id (uuid). FK: player_id → player(player_id) ON DELETE CASCADE + INDEX.
//
//   almanac_entry — per underwriter × player almanac (anti-fraud persistence).
//     status: almanacStatus (CLEAN|POISONED, default CLEAN).
//     poisoned_until_tick: bigint nullable (DD-FRAUD-POISON horizon).
//     PK: id (uuid). FK: player_id → player(player_id) ON DELETE CASCADE + INDEX.
//     DD-ALMANAC-NO-FINGERPRINT RESOLVED: baseline_fingerprint_* columns added in Tranche C (migration 0068).
//
// R9.3: this file matches migrations 0059-0062 byte-for-meaning.
//       The ch09 mirror is docs/tech/09_data_model/schema_insurance.md (created same-commit).
// R2.2: findings_bitmask, observation_depth, route_id, internal risk scalars = server-only.
//       Cash values (premium_cents, payout_cents) are CLEAR per DD-P5 (transaction values, not risk scalars).
// Anti-fabrication (C4): no non-deterministic RNG in this file.
// Zero-regression invariant (§0.2): existing tables (building_raid, courier_shift, etc.) NOT modified.

import {
  pgTable,
  pgEnum,
  uuid,
  bigint,
  smallint,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { player } from './player';

// ===== pgEnums (6 closed-domain enum types for the 4 insurance entities) =====

/**
 * `coverage_type` — the 4 kinds of insurance coverage.
 * Canon :209 (insurance_mechanics.md): `PROPERTY | STASH_LOSS | COURIER_ARREST | FENCE_DEFAULT`.
 * Each kind = separate contract with its own walk + findings + premium (:67).
 */
export const coverageType = pgEnum('coverage_type', [
  'PROPERTY',
  'STASH_LOSS',
  'COURIER_ARREST',
  'FENCE_DEFAULT',
]);

/**
 * `walk_status` — lifecycle state of an underwriter walk record.
 * WALKING: walk in progress (findings accruing via daily OR).
 * COMPLETE: computePremium guard satisfied (day == duration); premium finalized.
 * Transitions: WALKING → COMPLETE (idempotent on re-call per C3).
 */
export const walkStatus = pgEnum('walk_status', ['WALKING', 'COMPLETE']);

/**
 * `contract_status` — lifecycle state of an insurance contract.
 * ACTIVE: coverage active, claims can be filed.
 * LAPSED: contract expired (premium cycle ended, not renewed).
 * FRAUDED: fraud detected → 5× penalty applied + almanac POISONED (DD-FRAUD-POISON).
 * Canon :146 (insurance_mechanics.md): `ACTIVE | LAPSED | FRAUDED`.
 */
export const contractStatus = pgEnum('contract_status', ['ACTIVE', 'LAPSED', 'FRAUDED']);

/**
 * `claim_status` — lifecycle state of an insurance claim.
 * FILED: claim submitted, awaiting payout computation.
 * PAID: payout computed and credited (computePayout done, C9).
 * DENIED_FRAUD: fraud detection fired → claim denied, penalty applied (C10).
 */
export const claimStatus = pgEnum('claim_status', ['FILED', 'PAID', 'DENIED_FRAUD']);

/**
 * `almanac_status` — underwriter almanac entry status for a player.
 * CLEAN: no fraud history; new underwriters accept standard terms.
 * POISONED: fraud detected → new underwriters see poison flag for up to 365 days
 *   (DD-FRAUD-POISON: `poisoned_until_tick` set to current_tick + almanac_persistence_days_post_lapse).
 */
export const almanacStatus = pgEnum('almanac_status', ['CLEAN', 'POISONED']);

/**
 * `claim_basis` — the §1.4 menu: reason cited when filing a claim.
 * Maps to FindingType contradiction in FraudDetectionService (C10 — the fraud check).
 * Design §1.4 + plan Shared signatures.
 */
export const claimBasis = pgEnum('claim_basis', [
  'DEALER_TURNOVER',
  'HEAT_RAID',
  'COURIER_BETRAYAL',
  'STORAGE_OVERFLOW',
  'FENCE_FLIGHT',
]);

// ===== Table 1: underwriter_walk_record — per-walk server-side state (migration 0059) =====
//
// One row per underwriting walk. Created by UnderwritingWalkService.startWalk().
// findings_bitmask: 64-bit mask of observed cues accumulated via daily OR (DD-WALK — monotone).
//   Canon :42: "findings_bitmask (8 B) — 64-bit mask of observed cues". Stored as PG bigint.
//   R2.2: server-only — never forwarded to client (client sees banded projection C11).
// observation_depth: 0-3 (how deeply the underwriter inspects each leg — server-only).
// route_id: nullable uuid (which supply-chain leg the walk follows — server-only).
// start_tick: bigint (in-game minute tick at walk start).
// status: WALKING (accruing) → COMPLETE (premium finalized at day == duration).
// player_id: FK → player ON DELETE CASCADE + INDEX (player-scoped, leçon D1c/D2).
export const underwriterWalkRecord = pgTable(
  'underwriter_walk_record',
  {
    /** PK: uuid generated by the service (uuid default gen_random_uuid()). */
    id: uuid('id').primaryKey().defaultRandom(),

    /**
     * player_id — FK → player(player_id) ON DELETE CASCADE.
     * Player-scoped: deleting a player removes all their walk records.
     * INDEX: for player-scoped lookups (all walks for a player).
     */
    player_id: uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),

    /**
     * contract_id — soft ref to the insurance_contract this walk was issued for.
     * Not a DB FK (contract created after the walk completes — avoids circular dep).
     * Server-only: the player does not directly query walk → contract associations.
     */
    contract_id: uuid('contract_id'),

    /**
     * coverage_type — which of the 4 coverage kinds this walk assesses.
     * Determines which substrate domain is snapshotted each day (DD-WALK §1.1).
     * Canon :58-67: 4 kinds × their respective "Walk reads" domain.
     */
    coverage_type: coverageType('coverage_type').notNull(),

    /**
     * route_id — nullable uuid: which supply-chain leg the walk follows.
     * Canon :40: "route_id (2 B) — Which supply-chain leg the walk follows."
     * Null when the walk uses the default coverage-domain route (most common).
     * Server-only (R2.2).
     */
    route_id: uuid('route_id'),

    /**
     * observation_depth — 0-3 (how deeply the underwriter inspects each leg).
     * Canon :41: "observation_depth (1 B) — How deeply underwriter inspects each leg."
     * Smallint (range 0-3). Server-only (R2.2).
     */
    observation_depth: smallint('observation_depth').notNull().default(0),

    /**
     * findings_bitmask — 64-bit monotone-OR mask of observed cues per day.
     * Canon :42: "findings_bitmask (8 B) — 64-bit mask of observed cues".
     * DD-WALK: each day, the coverage's substrate domain is snapshotted and the
     *   day's FindingType bits are OR-ed in (monotone — bits are never cleared).
     * Default 0: no findings yet at walk start.
     * PG bigint (mode: 'bigint'): serialized as string to preserve 64-bit precision.
     * R2.2: server-only — never forwarded to client routes. BO reads via C12.
     */
    findings_bitmask: bigint('findings_bitmask', { mode: 'bigint' }).notNull().default(BigInt(0)),

    /**
     * start_tick — in-game minute tick at walk start.
     * Canon :43: "start_tick (4 B) — Walk start."
     * Stored as bigint (the city-sim tick counter is a bigint — same as other tick columns).
     */
    start_tick: bigint('start_tick', { mode: 'bigint' }).notNull().default(BigInt(0)),

    /**
     * status — walk lifecycle: WALKING → COMPLETE.
     * WALKING: daily recordFindings is accruing bits.
     * COMPLETE: computePremium guard satisfied (day == underwriting_walk_duration_days).
     */
    status: walkStatus('status').notNull().default('WALKING'),

    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    /** Index for player-scoped lookups (all walks for a player). */
    player_idx: index('underwriter_walk_record_player_idx').on(t.player_id),
  }),
);

export const underwriterWalkRecordRelations = relations(underwriterWalkRecord, ({ one }) => ({
  player: one(player, {
    fields: [underwriterWalkRecord.player_id],
    references: [player.player_id],
  }),
}));

export type UnderwriterWalkRecordRow = typeof underwriterWalkRecord.$inferSelect;
export type UnderwriterWalkRecordInsert = typeof underwriterWalkRecord.$inferInsert;

// ===== Table 2: insurance_contract — per-contract coverage state (migration 0060) =====
//
// One row per active/lapsed/frauded insurance coverage contract.
// type: one of the 4 CoverageType values (PROPERTY|STASH_LOSS|COURIER_ARREST|FENCE_DEFAULT).
// asset_ref: nullable soft-ref to the insured asset (building_id, courier_id, laundering node_id).
// insured_value_cents/premium_cents: bigint (cash-clear per DD-P5 — transaction values exposed to player).
// walk_id: the underwriting walk that generated the premium (soft ref — walk completed before contract).
// counterparty_id: nullable uuid of the underwriter counterparty (linked to restraint_dispute_ring for DD-WARY).
// issued_tick: in-game tick at issuance.
// status: ACTIVE (coverage live) → LAPSED (expired) | FRAUDED (fraud penalty applied).
// player_id: FK → player ON DELETE CASCADE + INDEX (player-scoped).
export const insuranceContract = pgTable(
  'insurance_contract',
  {
    /** PK: uuid generated by ContractService.issueContract(). */
    id: uuid('id').primaryKey().defaultRandom(),

    /**
     * player_id — FK → player(player_id) ON DELETE CASCADE.
     * Player-scoped: deleting a player removes all their contracts.
     */
    player_id: uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),

    /**
     * type — which of the 4 coverage kinds this contract covers.
     * Canon :58-67: 4 kinds (PROPERTY/STASH_LOSS/COURIER_ARREST/FENCE_DEFAULT).
     */
    type: coverageType('type').notNull(),

    /**
     * asset_ref — nullable uuid soft-ref to the insured asset.
     * PROPERTY: building_id (uuid from city_state). STASH_LOSS: stash building_id.
     * COURIER_ARREST: courier_id. FENCE_DEFAULT: laundering node_id.
     * Nullable: a player can get coverage without pinning a specific asset (general coverage).
     * No DB FK (asset entity is coverage-type-specific — no single FK target).
     */
    asset_ref: uuid('asset_ref'),

    /**
     * insured_value_cents — declared insured value at issuance.
     * Used to compute base premium: base = pct × insured_value_cents / 100.
     * DD-P5: this is a transaction value (clear to player at issuance).
     * Bigint: large cash values (e.g., $10k = 1_000_000 cents).
     */
    insured_value_cents: bigint('insured_value_cents', { mode: 'bigint' }).notNull(),

    /**
     * premium_cents — final premium charged at issuance.
     * Computed by computePremium at day == duration: base · Π(1 + c_i · finding_i).
     * DD-P5: the debit amount is CLEAR (the player is charged this amount).
     * Bigint: same scale as insured_value_cents.
     */
    premium_cents: bigint('premium_cents', { mode: 'bigint' }).notNull().default(BigInt(0)),

    /**
     * escrow_required_cents — the cash escrow posted by the player at issuance (DD-P5 CLEAR).
     * Set to `collateral_amount` from restraint_dispute_ring when DD-WARY fires (C5).
     * 0 when no wary counterparty (neutral path).
     * Migration 0066: persists this value so BO state + player projection can surface it.
     * TD-ESCROW-CAPITAL-LOCK: persist + surface the OBLIGATION only — the full Erlang-style
     * capital lock (deducting from spendable balance + refunding on contract close) is deferred
     * to a wary-depth follow-up. C13 will route the TD number.
     */
    escrow_required_cents: bigint('escrow_required_cents', { mode: 'bigint' }).notNull().default(BigInt(0)),

    /**
     * walk_id — soft ref to the underwriter_walk_record that generated this contract.
     * Set at issuance; the walk must be COMPLETE before ContractService.issueContract() proceeds.
     */
    walk_id: uuid('walk_id'),

    /**
     * counterparty_id — nullable uuid of the underwriting counterparty.
     * Linked to restraint_dispute_ring.counterparty_id for DD-WARY check (C5).
     * Null: no specific counterparty (standard market terms, no wary-gating).
     */
    counterparty_id: uuid('counterparty_id'),

    /**
     * status — contract lifecycle: ACTIVE → LAPSED | FRAUDED.
     * ACTIVE: coverage live; claims can be filed.
     * LAPSED: premium cycle ended, not renewed.
     * FRAUDED: 5× fraud penalty applied by FraudDetectionService (C10 — DD-FRAUD-POISON).
     * Canon :146: `status: ACTIVE | LAPSED | FRAUDED`.
     */
    status: contractStatus('status').notNull().default('ACTIVE'),

    /**
     * issued_tick — in-game tick at contract issuance.
     * Used by ClaimsService and FraudDetectionService to correlate loss events.
     * Bigint (city-sim tick is a bigint counter).
     */
    issued_tick: bigint('issued_tick', { mode: 'bigint' }).notNull().default(BigInt(0)),

    /**
     * expires_at_tick — in-game tick at which this contract is due for renewal.
     * DD-RENEWAL (Tranche C §4.2, migration 0069): set at issuance by ContractService (C3) to
     *   `issued_tick + coverage_drift_contract_term_days × ticks_per_day`.
     * Nullable: null = no renewal term (Tranche B contracts have no term — backward-compatible).
     * When the WEEKLY renewal check (C11) finds `expires_at_tick ≤ currentTick`, it re-quotes
     * and either renews (stays ACTIVE, updates expires_at_tick) or lapses (status → LAPSED).
     * Bigint (game-time tick counter — never Date.now()).
     */
    expires_at_tick: bigint('expires_at_tick', { mode: 'bigint' }),

    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    /** Index for player-scoped lookups (all contracts for a player). */
    player_idx: index('insurance_contract_player_idx').on(t.player_id),
  }),
);

export const insuranceContractRelations = relations(insuranceContract, ({ one }) => ({
  player: one(player, {
    fields: [insuranceContract.player_id],
    references: [player.player_id],
  }),
}));

export type InsuranceContractRow = typeof insuranceContract.$inferSelect;
export type InsuranceContractInsert = typeof insuranceContract.$inferInsert;

// ===== Table 3: insurance_claim — per-claim filed claim state (migration 0061) =====
//
// One row per filed insurance claim on a contract.
// claim_basis: the §1.4 menu reason cited by the player (DEALER_TURNOVER|HEAT_RAID|COURIER_BETRAYAL|STORAGE_OVERFLOW|FENCE_FLIGHT).
// loss_event_ref: nullable soft-ref to the triggering event (building_raid.id, courier_shift.id, laundering node id).
// claimed_cents: player-declared loss amount.
// payout_cents: actual payout after computePayout (default 0 until paid).
// status: FILED (pending) → PAID | DENIED_FRAUD.
// filed_tick: in-game tick at claim filing.
// player_id: FK → player ON DELETE CASCADE + INDEX (player-scoped).
export const insuranceClaim = pgTable(
  'insurance_claim',
  {
    /** PK: uuid generated by ClaimsService.fileClaim(). */
    id: uuid('id').primaryKey().defaultRandom(),

    /**
     * player_id — FK → player(player_id) ON DELETE CASCADE.
     * Player-scoped: deleting a player removes all their claims.
     */
    player_id: uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),

    /**
     * contract_id — soft ref to the insurance_contract being claimed against.
     * No DB FK (circular risk — contract_id may be checked at service level).
     * Used by ClaimsService.computePayout() to fetch the coverage fraction tunable.
     */
    contract_id: uuid('contract_id').notNull(),

    /**
     * claim_basis — the §1.4 reason the player cites for the loss.
     * Maps to FindingType in FraudDetectionService.checkClaimAgainstWalk() (C10).
     * Design §1.4 + plan Shared signatures.
     */
    claim_basis: claimBasis('claim_basis').notNull(),

    /**
     * loss_event_ref — nullable soft-ref to the triggering event row.
     * HEAT_RAID: building_raid.id. COURIER_BETRAYAL: courier_shift.id. FENCE_FLIGHT: laundering node id.
     * Null: claim without a specific referenced event (manual filing / general loss).
     */
    loss_event_ref: uuid('loss_event_ref'),

    /**
     * claimed_cents — player-declared loss amount (in cents).
     * Basis for computePayout — the actual payout is capped by the coverage fraction.
     * Bigint: large loss values.
     */
    claimed_cents: bigint('claimed_cents', { mode: 'bigint' }).notNull(),

    /**
     * payout_cents — actual payout credited to the player.
     * Default 0 (not yet computed). Set by ClaimsService.computePayout() (C9).
     * Formula: payout = round(coverage_fraction × loss_value_cents) — banker's-round.
     * DD-P5: payout is CLEAR cash (the player is credited this amount).
     */
    payout_cents: bigint('payout_cents', { mode: 'bigint' }).notNull().default(BigInt(0)),

    /**
     * status — claim lifecycle: FILED → PAID | DENIED_FRAUD.
     * FILED: awaiting payout computation.
     * PAID: computePayout done, payout credited.
     * DENIED_FRAUD: fraud check fired → claim denied, 5× penalty on contract (C10).
     */
    status: claimStatus('status').notNull().default('FILED'),

    /**
     * filed_tick — in-game tick at claim filing.
     * Used by FraudDetectionService to correlate with walk findings timing.
     */
    filed_tick: bigint('filed_tick', { mode: 'bigint' }).notNull().default(BigInt(0)),

    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    /** Index for player-scoped lookups (all claims for a player). */
    player_idx: index('insurance_claim_player_idx').on(t.player_id),
  }),
);

export const insuranceClaimRelations = relations(insuranceClaim, ({ one }) => ({
  player: one(player, {
    fields: [insuranceClaim.player_id],
    references: [player.player_id],
  }),
}));

export type InsuranceClaimRow = typeof insuranceClaim.$inferSelect;
export type InsuranceClaimInsert = typeof insuranceClaim.$inferInsert;

// ===== Table 4: almanac_entry — per underwriter × player anti-fraud almanac (migration 0062) =====
//
// Per-underwriter entry in the underwriter's almanac tracking fraud history for a player.
// status: CLEAN (default) → POISONED (fraud detected — DD-FRAUD-POISON).
// poisoned_until_tick: bigint nullable — the in-game tick at which the POISONED status expires.
//   DD-FRAUD-POISON: horizon = current_tick + almanac_persistence_days_post_lapse × ticks_per_day.
//   At max: 365 days × ticks_per_day (canon :80, "for years").
// underwriter_id: uuid of the underwriter NPC who holds this almanac entry.
// player_id: FK → player ON DELETE CASCADE + INDEX (player-scoped — player deletion removes their almanac).
//
// DD-ALMANAC-NO-FINGERPRINT RESOLVED (Tranche C §4.2, migration 0068):
//   The 5 additive columns (4 baseline_fingerprint_* + baseline_persisted_until_tick) are NOW present.
//   Canon :90: "baseline_fingerprint (4 B) — 4-feature snapshot of pre-coverage operating policy."
//   This is the documented Tranche B/C seam — RESOLVED by Tranche C (additive, no existing column mutated).
export const almanacEntry = pgTable(
  'almanac_entry',
  {
    /** PK: uuid generated by the service (one almanac entry per underwriter × player). */
    id: uuid('id').primaryKey().defaultRandom(),

    /**
     * underwriter_id — uuid of the NPC underwriter who holds this almanac entry.
     * No DB FK (underwriter entity is not yet a first-class DB entity — NPC concept).
     * Allows per-underwriter × per-player almanac isolation.
     */
    underwriter_id: uuid('underwriter_id').notNull(),

    /**
     * player_id — FK → player(player_id) ON DELETE CASCADE.
     * Player-scoped: deleting a player removes all their almanac entries.
     */
    player_id: uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),

    /**
     * status — almanac lifecycle: CLEAN → POISONED.
     * CLEAN: no fraud history; underwriter offers standard terms.
     * POISONED: fraud detected; new contracts are denied or heavily penalized
     *   until poisoned_until_tick is exceeded (DD-FRAUD-POISON, C10).
     * Canon :56: "underwriter's almanac entry poisoned for years" on fraud detection.
     */
    status: almanacStatus('status').notNull().default('CLEAN'),

    /**
     * poisoned_until_tick — in-game tick at which POISONED status expires.
     * Null when status is CLEAN (no poison horizon active).
     * Set on fraud detection: current_tick + almanac_persistence_days_post_lapse × ticks_per_day.
     * Max horizon: 365 days (the range max of underwriting_almanac_persistence_days_post_lapse).
     * DD-FRAUD-POISON: this tunable's max (365) is reused as the poison horizon (design §4).
     * Server-only: the player sees "poisoned / clean" status, NOT the raw tick value (R2.2).
     */
    poisoned_until_tick: bigint('poisoned_until_tick', { mode: 'bigint' }),

    // DD-ALMANAC-NO-FINGERPRINT RESOLVED (Tranche C, migration 0068):
    // The following 5 columns are the Tranche C §4.2 Coverage-Induced Drift additive extension.
    // Canon :90 anchor: "baseline_fingerprint (4 B) — 4-feature snapshot of pre-coverage operating policy."
    // These columns are NULLABLE — Tranche B rows (no baseline captured) have null in all 5 columns.
    // ADDITIVE: no existing column type/constraint is mutated (R9.3).

    /**
     * baseline_fingerprint_stash_ratio — captured baseline stash fill ratio per-mille [0..1000].
     * Nullable: null when no baseline has been captured (Tranche B contracts, pre-issuance-hook).
     * Set by captureBaselineFingerprint (C3) at contract issuance.
     * Anti-exploit anchor (C12): persisted in almanac so re-issue within window inherits the baseline.
     * DD-FINGERPRINT-COLS: one of 4 separate smallint columns (design §3.2, canon :90).
     */
    baseline_fingerprint_stash_ratio: smallint('baseline_fingerprint_stash_ratio'),

    /**
     * baseline_fingerprint_courier_cadence — captured baseline game-days between courier rotations.
     * Nullable: null when no baseline captured.
     * Set by captureBaselineFingerprint (C3). Anti-exploit anchor (C12).
     * DD-FINGERPRINT-COLS: one of 4 separate smallint columns.
     */
    baseline_fingerprint_courier_cadence: smallint('baseline_fingerprint_courier_cadence'),

    /**
     * baseline_fingerprint_marginal_deal — captured baseline marginal deal ratio per-mille [0..1000].
     * Nullable: null when no baseline captured.
     * Set by captureBaselineFingerprint (C3). Anti-exploit anchor (C12).
     * DD-FINGERPRINT-COLS: one of 4 separate smallint columns.
     */
    baseline_fingerprint_marginal_deal: smallint('baseline_fingerprint_marginal_deal'),

    /**
     * baseline_fingerprint_lookout — captured baseline lookout assignment rate per-mille [0..1000].
     * Nullable: null when no baseline captured.
     * Set by captureBaselineFingerprint (C3). Anti-exploit anchor (C12).
     * DD-FINGERPRINT-COLS: one of 4 separate smallint columns.
     */
    baseline_fingerprint_lookout: smallint('baseline_fingerprint_lookout'),

    /**
     * baseline_persisted_until_tick — in-game tick until which the persisted baseline is valid.
     * DD-BASELINE-PERSIST (design §3.2): set on contract lapse; a re-issue within this window
     * INHERITS the almanac baseline fingerprint (anti-exploit invariant — C12).
     * Nullable: null when no baseline has lapsed yet (contract still active, or never lapsed).
     * Bigint (city-sim tick counter, game-time only — no Date.now()).
     * Canon :110: "90-day post-lapse window" uses underwriting_almanac_persistence_days_post_lapse REUSE.
     */
    baseline_persisted_until_tick: bigint('baseline_persisted_until_tick', { mode: 'bigint' }),

    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    /** Index for player-scoped lookups (all almanac entries for a player). */
    player_idx: index('almanac_entry_player_idx').on(t.player_id),
  }),
);

export const almanacEntryRelations = relations(almanacEntry, ({ one }) => ({
  player: one(player, {
    fields: [almanacEntry.player_id],
    references: [player.player_id],
  }),
}));

export type AlmanacEntryRow = typeof almanacEntry.$inferSelect;
export type AlmanacEntryInsert = typeof almanacEntry.$inferInsert;

// ===== Table 5: coverage_induced_drift_state — per-asset drift state (migration 0067) =====
//
// IMPLEMENTS: docs/superpowers/plans/2026-06-18-depth-insurance-coverage-drift-plan.md Task 1 (C1)
//             design §3.1 (Coverage-Induced Drift — Tranche C §4.2)
//             — Insurance Drift C1 — 2026-06-18
//
// One row per active coverage contract's drift monitoring state.
// Created at contract issuance (captureBaselineFingerprint, C3). Removed via player CASCADE.
//
// hazard_shift: smallint — rises +1 per less-cautious action (DD-LESS-CAUTIOUS, C9).
//   Default 0: no drift at issuance (canon :89 — "hazard_shift (1 B) — starts 0 at issuance").
//   Cap 255: reuses BO cap T.bo.economic.hazard_shift_max (canon :2513).
//
// DD-FINGERPRINT-COLS: 4 smallint columns (NOT a packed blob — canon §4.2 :90 design §3.1).
//   fingerprint_stash_ratio: stash fill ratio per-mille [0..1000].
//   fingerprint_courier_cadence: game-days between courier rotations.
//   fingerprint_marginal_deal: marginal deal ratio per-mille [0..1000].
//   fingerprint_lookout: lookout assignment rate per-mille [0..1000].
//   All default 0 (baseline captured by C3 captureBaselineFingerprint).
//
// last_drift_tick: bigint — last WEEKLY tick game-minute at which the drift was computed.
//   Keyed on weekId for WEEKLY idempotence (C10). Default 0n (no tick yet).
//
// contract_id: uuid soft-ref (no DB FK — mirrors Tranche B walk_id pattern in insurance_contract).
//   The per-asset subscriber lookup uses this column (plain INDEX for fast lookup).
//
// asset_ref: nullable uuid soft-ref to the insured asset (same as insurance_contract.asset_ref).
//
// coverage_type: coverageType NOT NULL — which of the 4 coverage kinds this drift state monitors.
//   REUSE: coverageType enum (:58) — no new enum declared.
//
// coverage_tier: smallint NOT NULL default 0 — the coverage tier at issuance.
//   Range [0..coverage_drift_coverage_tiers] where coverage_drift_coverage_tiers default=3.
//
// premium_balance: bigint — accumulated premium balance for renewal cycle (C11).
//   Default 0n (renewal mechanic added at C11).
//
// R9.3: backported to docs/tech/09_data_model/schema_insurance.md same-commit (C1).
// Zero-regression invariant (§0.2): no existing table/column modified.
// Anti-fabrication: no non-deterministic RNG in this table definition.
export const coverageInducedDriftState = pgTable(
  'coverage_induced_drift_state',
  {
    /** PK: uuid generated by the service (uuid default gen_random_uuid()). */
    id: uuid('id').primaryKey().defaultRandom(),

    /**
     * player_id — FK → player(player_id) ON DELETE CASCADE.
     * Player-scoped: deleting a player removes all their drift states.
     * INDEX: for player-scoped lookups.
     */
    player_id: uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),

    /**
     * contract_id — soft-ref to the insurance_contract this drift state is monitoring.
     * Not a DB FK (mirrors the Tranche B walk_id pattern — avoids circular dep).
     * Plain INDEX for per-asset subscriber lookup (C9 onX handlers: load by contract_id).
     * Coder decision: plain INDEX (not partial-unique) — a player can have multiple sequential
     *   drift states for the same contract (lapse → re-issue), and the anti-exploit almanac
     *   inherit path (C12) needs to query historical entries. Plain index is sufficient.
     */
    contract_id: uuid('contract_id'),

    /**
     * asset_ref — nullable uuid soft-ref to the insured asset.
     * Mirrors insurance_contract.asset_ref (the building_id, courier_id, or laundering node_id).
     * Nullable: a contract without a pinned asset has no asset_ref here either.
     * No DB FK (asset entity is coverage-type-specific — no single FK target).
     */
    asset_ref: uuid('asset_ref'),

    /**
     * coverage_type — which of the 4 coverage kinds this drift state monitors.
     * REUSE: coverageType enum (insurance.ts:58) — NOT re-declared.
     * Canon :86-90: "per-asset entity" has a coverage_type field.
     */
    coverage_type: coverageType('coverage_type').notNull(),

    /**
     * coverage_tier — the coverage tier at issuance (smallint [0..coverage_drift_coverage_tiers]).
     * Column default = 0 (no tier assigned at row creation — the tier is set by captureBaselineFingerprint C3).
     * The tunable `coverage_drift_coverage_tiers` (default=3) is the MAXIMUM number of tiers (NOT this column default).
     * Determines the escalation band at renewal (C11).
     */
    coverage_tier: smallint('coverage_tier').notNull().default(0),

    /**
     * premium_balance — accumulated premium balance for the renewal cycle (C11).
     * Bigint (cash-clear, DD-P5 — the renewal debit is a transaction value).
     * Default 0n: renewal mechanic is wired at C11.
     */
    premium_balance: bigint('premium_balance', { mode: 'bigint' }).notNull().default(BigInt(0)),

    /**
     * hazard_shift — the running moral-hazard counter (smallint, range [0..255]).
     * Rises +1 per less-cautious action (DD-LESS-CAUTIOUS, C9 CoverageInducedDriftService.onX).
     * RuleViolation is unconditional +1 (DD-BOSSMIRROR-COUPLE, C8).
     * Decays by coverage_drift_shift_decay_per_week per WEEKLY tick (C10).
     * Default 0: no drift at issuance (canon :89).
     * Cap 255: T.bo.economic.hazard_shift_max (canon :2513) — enforced by min(255, shift+1).
     */
    hazard_shift: smallint('hazard_shift').notNull().default(0),

    /**
     * fingerprint_stash_ratio — stash fill ratio per-mille [0..1000] at the comparison point.
     * DD-FINGERPRINT-COLS: one of 4 smallint columns (design §3.1, canon :90).
     * Captures the running estimate of the player's stash fill behaviour.
     * Default 0 (set at captureBaselineFingerprint in C3).
     */
    fingerprint_stash_ratio: smallint('fingerprint_stash_ratio').notNull().default(0),

    /**
     * fingerprint_courier_cadence — game-days between courier rotations.
     * DD-FINGERPRINT-COLS: one of 4 smallint columns (design §3.1, canon :90).
     * Captures the running estimate of the player's courier rotation cadence.
     * Default 0 (set at captureBaselineFingerprint in C3).
     */
    fingerprint_courier_cadence: smallint('fingerprint_courier_cadence').notNull().default(0),

    /**
     * fingerprint_marginal_deal — marginal deal ratio per-mille [0..1000].
     * DD-FINGERPRINT-COLS: one of 4 smallint columns (design §3.1, canon :90).
     * Captures the running estimate of the player's marginal deal propensity.
     * Default 0 (set at captureBaselineFingerprint in C3).
     */
    fingerprint_marginal_deal: smallint('fingerprint_marginal_deal').notNull().default(0),

    /**
     * fingerprint_lookout — lookout assignment rate per-mille [0..1000].
     * DD-FINGERPRINT-COLS: one of 4 smallint columns (design §3.1, canon :90).
     * Captures the running estimate of the player's security lookout assignment rate.
     * Default 0 (set at captureBaselineFingerprint in C3).
     */
    fingerprint_lookout: smallint('fingerprint_lookout').notNull().default(0),

    /**
     * last_drift_tick — the last WEEKLY tick game-minute at which the drift was computed.
     * Bigint (game-time in game-minutes, same as gameMinute from CitySimTickContext).
     * Used for WEEKLY idempotence: keyed on weekId so the same week's tick is skipped on re-run (C10).
     * Default 0n: no WEEKLY tick has fired yet.
     */
    last_drift_tick: bigint('last_drift_tick', { mode: 'bigint' }).notNull().default(BigInt(0)),

    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    /** Index for player-scoped lookups (all drift states for a player). */
    player_idx: index('coverage_induced_drift_state_player_idx').on(t.player_id),
    /** Plain index on contract_id for per-asset subscriber lookup (C9 onX handlers). */
    contract_idx: index('coverage_induced_drift_state_contract_idx').on(t.contract_id),
  }),
);

export const coverageInducedDriftStateRelations = relations(coverageInducedDriftState, ({ one }) => ({
  player: one(player, {
    fields: [coverageInducedDriftState.player_id],
    references: [player.player_id],
  }),
}));

export type CoverageInducedDriftStateRow = typeof coverageInducedDriftState.$inferSelect;
export type CoverageInducedDriftStateInsert = typeof coverageInducedDriftState.$inferInsert;
