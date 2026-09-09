// IMPLEMENTS: docs/superpowers/plans/2026-07-01-04d-B-internal-affairs-plan.md C1 (schema)
//             Canon: docs/tech/04d_meta_market_lawyer_and_internal_affairs/internal_affairs_corruption_discovery.md §State (:40-71)
//             docs/tech/09_data_model/schema_internal_affairs.md (R9.3 backport — same-commit)
//             — 04d-B C1 — 2026-07-01
//
// TABLES (3 NEW IA entities — migrations 0099-0101):
//
//   internal_affairs_targets — GLOBAL registry of corruption targets (no player FK).
//     PK: target_id (uuid). GLOBAL: no player_id FK (server-side singleton per corrupt actor).
//     Multiple players may cooperate on the same target (cooperators jsonb list).
//     suspicion_level: real — SERVER-ONLY (R2.2/P5). Nightly threshold scan.
//     cooperators / weight_per_player: jsonb — SERVER-ONLY (R2.2/P5). Never forwarded raw.
//     investigation_id: soft ref (no DB FK) to ia_investigations. Null if no active investigation.
//     INDEX: (target_type, suspicion_level) — NIGHTLY threshold scan.
//
//   ia_investigations — investigation lifecycle (migration 0100).
//     PK: investigation_id (uuid). FK: target_id → internal_affairs_targets ON DELETE CASCADE.
//     detection_events: jsonb — SERVER-ONLY (R2.2/P5). Never forwarded raw.
//     INDEX: (target_id) — cascade lookups. INDEX: (status) — active sweep.
//
//   ia_intel_purchases — per-player intel purchase history (migration 0101).
//     PK: purchase_id (uuid). FK: player_id → player ON DELETE CASCADE.
//     FK: target_id → internal_affairs_targets ON DELETE CASCADE.
//     cost_cents: bigint (cash-clear DD-P5 — transaction values visible to player).
//     INDEX: (player_id) — per-player purchase history. INDEX: (target_id) — target-scoped reads.
//
// ENUMS (4 NEW — migration 0099):
//   ia_target_type         — clerk | port_inspector | lawyer | broker | judge_aide
//                            ⚠️ W6.3 C6 (2026-08-13) — cette note NOMME LE CODE plutôt que de
//                            recompter un statut, précisément parce qu'un statut recopié ici s'est
//                            périmé une première fois (2026-08-08 → 04f-B, voir CLAUDE.md règle 7
//                            sur les énoncés datés). `clerk` : producteur en production, cité au
//                            docblock du pgEnum ci-dessous. `lawyer` : producteur en production
//                            depuis W6.3 C2, cité au même endroit. `port_inspector`/`broker`/
//                            `judge_aide` : aucune table référent — `_hasReferentAccess`
//                            (ia-target.service.ts) les refuse par un switch exhaustif SANS
//                            `default:`, donc un 6ᵉ membre d'union est une erreur de compilation,
//                            jamais un passage silencieux. Ce switch voit un changement de TYPE,
//                            pas un changement de DONNÉE (un producteur qui gagne son premier
//                            appelant) — ce dernier cas est prouvé par une falsifiable dédiée
//                            (legal_player_payoff.spec.ts, le pas 0→1 de internal_affairs_targets),
//                            jamais par ce commentaire.
//   ia_investigation_status — active | completed_discovered | completed_clear | aborted
//   ia_suspicion_band      — silent | watching | investigating | revealing
//   burn_method            — kill | exile | buyout
//
// R9.3: this file matches migrations 0099-0101 byte-for-meaning.
//       ch09 mirror: docs/tech/09_data_model/schema_internal_affairs.md (created same-commit).
// R2.2 / P5: suspicion_level, cooperators, weight_per_player, detection_events are SERVER-ONLY.
//            Player sees banded projections only (IATargetSuspicionBandBucket via op Fixer — C8).
// Anti-fabrication: no Math.random(), no non-deterministic defaults.
// Zero-regression: ADDITIVE only — no existing tables modified by migrations 0099-0101.
// `port_inspector`/`broker`/`judge_aide`: no referent table, denied unconditionally by
//   `_hasReferentAccess`'s exhaustive switch (deny-by-default, see ia-target.service.ts).
// `clerk`/`lawyer`: each has a production producer — see the pgEnum docblock below for the exact
//   call chain of each, never restated here (a second copy is exactly what goes stale).

import {
  pgTable,
  pgEnum,
  uuid,
  real,
  jsonb,
  timestamp,
  bigint,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { player } from './player';

// ===== pgEnums (4 closed-domain enum types for the 3 IA entities) =====

/**
 * `ia_target_type` — the corruption target category (canon :41-52).
 *
 * ⚠️ W6.3 C6 — each line below points at the CODE that decides the member's status (a producer
 * call site, or the deny-by-default switch), never a recomputed count or a dated ratification
 * stamp — a stamped summary is exactly what went stale here once already (04f-B activated
 * `clerk` and this docblock was not revisited for weeks; see CLAUDE.md's dated-statement rule).
 *
 * - `clerk`          : BPD clerk — a corrupt-use producer exists in production
 *                      (`recruitment-quest.service.ts:344`, reached via the JWT-guarded
 *                      `POST /v1/recruitment/quests/:id/advance`).
 * - `port_inspector` : Port inspector — no referent table exists for this member;
 *                      `_hasReferentAccess` (below in this file's sibling service) denies it
 *                      unconditionally via an exhaustive switch with NO `default:` branch — a
 *                      6th union member is a compile error, never a silent pass-through.
 * - `lawyer`         : Tier-3 corruption-pipeline lawyer — a corrupt-use producer exists in
 *                      production since W6.3 C2 (`lawyer.service.ts:497`, reached via the
 *                      Tier-3 payoff route `POST /v1/me/legal/cases/:id/payoff`).
 *                      When a Tier-3 lawyer issues a payoff, `burn_risk_score` accumulates and
 *                      the corresponding `internal_affairs_targets` row's `suspicion_level` rises.
 * - `broker`         : Laundering broker — same posture as `port_inspector` above (no referent
 *                      table; denied by the same exhaustive switch).
 * - `judge_aide`     : Court aide — same posture as `port_inspector` above (no referent table;
 *                      denied by the same exhaustive switch).
 *
 * This switch rougit on a TYPE change (a 6th member added to the union) — it does NOT see a DATA
 * change (an existing producer gaining its first caller). That second class of change is proven
 * by a dedicated falsifiable instead: `legal_player_payoff.spec.ts`'s scoped 0→1 count on
 * `internal_affairs_targets`, never by this comment.
 */
export const iaTargetType = pgEnum('ia_target_type', [
  'clerk',
  'port_inspector',
  'lawyer',
  'broker',
  'judge_aide',
]);

/**
 * `ia_investigation_status` — lifecycle state of an IA investigation.
 *
 * - `active`               : investigation open, ticks_remaining > 0 (detection events accruing).
 * - `completed_discovered` : investigation closed — target was caught (burn candidate).
 * - `completed_clear`      : investigation closed — target cleared (suspicion decays).
 * - `aborted`              : investigation forcibly closed before resolution (edge case).
 */
export const iaInvestigationStatus = pgEnum('ia_investigation_status', [
  'active',
  'completed_discovered',
  'completed_clear',
  'aborted',
]);

/**
 * `ia_suspicion_band` — suspicion level band (projected from `suspicion_level` float via P5 wall).
 *
 * - `silent`       : suspicion_level < threshold_watching (no signal to player).
 * - `watching`     : suspicion_level in [watching, investigating) — low-level alert.
 * - `investigating`: suspicion_level in [investigating, revealing) — active probe.
 * - `revealing`    : suspicion_level >= threshold_revealing — near-discovery.
 *
 * Player only sees this band via IATargetSuspicionBandBucket (op Fixer intel purchase — C8).
 * R2.2/P5: the raw float is SERVER-ONLY; player never sees it directly.
 */
export const iaSuspicionBand = pgEnum('ia_suspicion_band', [
  'silent',
  'watching',
  'investigating',
  'revealing',
]);

/**
 * `burn_method` — method used to dispose of a discovered corruption target (canon §Burn §13 IA).
 *
 * - `kill`    : eliminate the target physically (highest cost, permanent removal).
 * - `exile`   : force the target out of the city (mid cost, removes threat).
 * - `buyout`  : pay the target to disappear (lowest cost, risk of recurrence).
 *
 * Used by the BurnTargetAction (C8/C9) once a target reaches `completed_discovered`.
 */
export const burnMethod = pgEnum('burn_method', [
  'kill',
  'exile',
  'buyout',
]);

// ===== Table 1: internal_affairs_targets — GLOBAL corruption target registry (migration 0099) =====
//
// One row per corrupt actor tracked at the system level. NO player_id FK (GLOBAL table).
// A corruption target (e.g. a specific Tier-3 lawyer) is tracked server-side; multiple players
// may be cooperators (cooperators jsonb list). Canon :41-52 (the IA target state description).
//
// suspicion_level: server-only float 0-1 accumulated per Tier-3 payoff use and other IA-triggers (C3).
//   When > `ia_investigating_threshold` (registry getter C2), investigation opens (investigation_open_since set).
//   When > `ia_revealing_threshold`, detectAndReveal may fire (discovered_at set).
//   R2.2/P5: never exposed raw. Projected via `IATargetSuspicionBandBucket` composite (BO+op Fixer C8/C9).
//
// cooperators: jsonb list of player_ids that have contributed suspicion to this target.
//   SERVER-ONLY (R2.2/P5): never forwarded to client. Drives weight_per_player computation.
//
// weight_per_player: jsonb map { player_id → float } — per-player suspicion contribution weight.
//   SERVER-ONLY (R2.2/P5): never forwarded to client. Used by burn attribution (C9).
//
// investigation_open_since: timestamptz, null until investigation opens (suspicion crosses threshold).
//   Set by evaluateThresholdCrossing (C4). Drives `ia_investigations` creation.
//
// discovered_at: timestamptz, null until target is discovered (investigation reaches completed_discovered).
//   Set by executeDiscovery (C5). Triggers burn opportunity.
//
// last_weekly_decay_at: timestamptz — last time the WEEKLY decay was applied (C6 WEEKLY scheduler).
//   Default now() at row creation. Prevents double-decay within a week.
//
// investigation_id: soft ref (NO DB FK) to `ia_investigations`.
//   Null when no investigation is open. Set by evaluateThresholdCrossing (C4). Cleared by executeDiscovery (C5).
//   Soft ref pattern (RATIFIÉ — same as caught_exception.legal_case_id, mig 0098) to avoid circular FK.
//
// FK: NONE (GLOBAL table — no player FK, no FK to ia_investigations — soft ref only).
// INDEX: (target_type, suspicion_level) — NIGHTLY threshold scan (identifies targets crossing bands).
// R9.3: matches migration 0099 byte-for-meaning.
export const internalAffairsTarget = pgTable(
  'internal_affairs_targets',
  {
    /** PK: uuid generated at target registration. */
    target_id: uuid('target_id').primaryKey().defaultRandom(),

    /**
     * target_type — the corruption target category.
     * See the `iaTargetType` pgEnum docblock above (single source of truth for which members have
     * a production producer today, and why — never restated here, W6.3 C6 anti-péremption).
     * Canon :41 "target_type enum('clerk', 'port_inspector', 'lawyer', 'broker', 'judge_aide')".
     */
    target_type: iaTargetType('target_type').notNull(),

    /**
     * target_npc_id — uuid of the NPC entity being tracked (soft ref, no DB FK).
     * For lawyer targets: the lawyer_id from the `lawyers` table.
     * Soft ref: avoids coupling IA schema to player-scoped `lawyers` table (RATIFIÉ — decision #2).
     * Canon :45 "target_npc_id uuid — the npc entity being tracked (soft-link)".
     */
    target_npc_id: uuid('target_npc_id').notNull(),

    /**
     * suspicion_level — server-only float 0-1 (canonical accumulator).
     * Accumulated per Tier-3 payoff use (C3 §13 hook) and IA discovery events.
     * SERVER-ONLY (R2.2/P5): never exposed raw to client. Projected via IATargetSuspicionBandBucket (C8/C9).
     * Default 0.0: no suspicion at target registration.
     * Canon :46 "suspicion_level float — SERVER-ONLY internal accumulator".
     */
    suspicion_level: real('suspicion_level').notNull().default(0.0),

    /**
     * investigation_open_since — timestamptz when investigation was opened.
     * Null when no investigation is open. Set by evaluateThresholdCrossing (C4).
     * Canon :47 "investigation_open_since timestamp null".
     */
    investigation_open_since: timestamp('investigation_open_since', { withTimezone: true }),

    /**
     * discovered_at — timestamptz when target was discovered (investigation completed_discovered).
     * Null until discovery. Set by executeDiscovery (C5). Triggers burn opportunity (C9).
     * Canon :48 "discovered_at timestamp null".
     */
    discovered_at: timestamp('discovered_at', { withTimezone: true }),

    /**
     * cooperators — jsonb list of player_ids that contributed suspicion.
     * SERVER-ONLY (R2.2/P5): never forwarded to client.
     * Default []: no cooperators at registration.
     * Canon :49 "cooperators jsonb — list of player_ids — SERVER-ONLY".
     */
    cooperators: jsonb('cooperators').notNull().default([]),

    /**
     * weight_per_player — jsonb map { player_id → float } — per-player contribution weight.
     * SERVER-ONLY (R2.2/P5): never forwarded to client.
     * Default {}: no weights at registration.
     * Canon :50 "weight_per_player jsonb — per-player weight map — SERVER-ONLY".
     */
    weight_per_player: jsonb('weight_per_player').notNull().default({}),

    /**
     * last_weekly_decay_at — timestamptz of the last WEEKLY suspicion decay application.
     * Default now() at row creation. Prevents double-decay within a week (C6 WEEKLY guard).
     * Canon :51 "last_weekly_decay_at timestamp".
     */
    last_weekly_decay_at: timestamp('last_weekly_decay_at', { withTimezone: true }).notNull().defaultNow(),

    /**
     * investigation_id — soft ref (NO DB FK) to `ia_investigations`.
     * Null when no investigation is open. Set by evaluateThresholdCrossing (C4). Cleared by executeDiscovery (C5).
     * Soft ref pattern (RATIFIÉ — avoids circular FK: ia_investigations.target_id already points back here).
     * Canon :52 "investigation_id uuid null — soft ref to active investigation".
     */
    investigation_id: uuid('investigation_id'),
  },
  (t) => ({
    /**
     * (target_type, suspicion_level) index — mirrors `ia_targets_type_suspicion_idx` (mig 0099).
     * Used by: NIGHTLY scan to identify targets crossing suspicion thresholds.
     * R9.3: this Drizzle callback mirrors the physical index; no new migration generated.
     */
    type_suspicion_idx: index('ia_targets_type_suspicion_idx').on(t.target_type, t.suspicion_level),
  }),
);

// No relations export for internalAffairsTarget — GLOBAL table has no real FK.
// The soft ref `investigation_id` is not a Drizzle relation (no DB FK constraint).
// Reverse relations (from ia_investigations and ia_intel_purchases) are on those tables.

export type InternalAffairsTargetRow    = typeof internalAffairsTarget.$inferSelect;
export type InternalAffairsTargetInsert = typeof internalAffairsTarget.$inferInsert;

// ===== Table 2: ia_investigations — investigation lifecycle (migration 0100) =====
//
// One row per active IA investigation. Created by evaluateThresholdCrossing (C4) when a target's
// suspicion_level crosses the `ia_investigating_threshold` (C2 registry getter).
//
// closes_at: set at creation to opened_at + investigation_duration_days (C2 registry).
//   Default investigation_duration_days = 21 days [PROV-Y26Q2] (gdd/14 registry).
//   No DB default — must be set at insert time by evaluateThresholdCrossing (C4).
//
// status: active → completed_discovered | completed_clear | aborted.
//   Transitions driven by executeDiscovery (C5) after detection sweep.
//
// detection_events: jsonb list of detection events during the investigation.
//   SERVER-ONLY (R2.2/P5): never forwarded to client.
//   Each event: { gameMinute: number, eventType: string, playerId?: string }.
//
// FK: target_id → internal_affairs_targets(target_id) ON DELETE CASCADE.
// INDEX: (target_id) — cascade lookups + executeDiscovery target fetch.
// INDEX: (status) — active sweep (C4 evaluateThresholdCrossing guard + NIGHTLY scan).
// R9.3: matches migration 0100 byte-for-meaning.
export const iaInvestigation = pgTable(
  'ia_investigations',
  {
    /** PK: uuid generated by openInvestigation (C5). */
    investigation_id: uuid('investigation_id').primaryKey().defaultRandom(),

    /**
     * target_id — FK → internal_affairs_targets(target_id) ON DELETE CASCADE.
     * The target being investigated. Cascades on target deletion (admin GC path only).
     * Canon :54 "target_id uuid references internal_affairs_targets ON DELETE CASCADE".
     */
    target_id: uuid('target_id')
      .notNull()
      .references(() => internalAffairsTarget.target_id, { onDelete: 'cascade' }),

    /**
     * opened_at — real-time timestamp when the investigation was opened (defaultNow).
     * Set by evaluateThresholdCrossing (C4) at creation.
     * Canon :55 "opened_at timestamp".
     */
    opened_at: timestamp('opened_at', { withTimezone: true }).notNull().defaultNow(),

    /**
     * closes_at — real-time timestamp when the investigation will close.
     * Set at creation = opened_at + investigation_duration_days (C4 evaluateThresholdCrossing).
     * Default investigation_duration_days = 21 days [PROV-Y26Q2] (gdd/14 registry).
     * No DB default — must be provided at insert time.
     * Canon :56 "closes_at timestamp — opened_at + investigation_duration_days".
     */
    closes_at: timestamp('closes_at', { withTimezone: true }).notNull(),

    /**
     * status — investigation lifecycle state.
     * active → completed_discovered | completed_clear | aborted.
     * Default 'active' at creation.
     * Canon :57 "status enum('active', 'completed_discovered', 'completed_clear', 'aborted')".
     */
    status: iaInvestigationStatus('status').notNull().default('active'),

    /**
     * detection_events — jsonb list of detection events during the investigation.
     * SERVER-ONLY (R2.2/P5): never forwarded to client.
     * Grown by recordDetectionEvent (C6). Each event: { gameMinute, eventType, playerId? }.
     * Default []: no events at investigation open.
     * Canon :58 "detection_events jsonb — SERVER-ONLY list of detection events".
     */
    detection_events: jsonb('detection_events').notNull().default([]),
  },
  (t) => ({
    /**
     * (target_id) index — mirrors `ia_investigations_target_idx` (mig 0100).
     * Used by: closeInvestigation (C7) target fetch; cascade lookups.
     */
    target_idx: index('ia_investigations_target_idx').on(t.target_id),

    /**
     * (status) index — mirrors `ia_investigations_status_idx` (mig 0100).
     * Used by: NIGHTLY active-investigation sweep; openInvestigation guard (no double-open).
     */
    status_idx: index('ia_investigations_status_idx').on(t.status),
  }),
);

export const iaInvestigationRelations = relations(iaInvestigation, ({ one }) => ({
  target: one(internalAffairsTarget, {
    fields: [iaInvestigation.target_id],
    references: [internalAffairsTarget.target_id],
  }),
}));

export type IaInvestigationRow    = typeof iaInvestigation.$inferSelect;
export type IaInvestigationInsert = typeof iaInvestigation.$inferInsert;

// ===== Table 3: ia_intel_purchases — per-player intel purchase history (migration 0101) =====
//
// One row per intel purchase. Created by purchaseIntel (C7) when a player pays to learn
// the current suspicion band of a target (op Fixer action).
//
// revealed_band: the `ia_suspicion_band` value revealed to the player at purchase time.
//   This is the P5-projected band (not the raw suspicion_level float).
//   Clear to the player — this is the explicitly purchased information.
//
// cost_cents: bigint (cash-clear per DD-P5 — transaction value exposed to player).
//   Positive integer. Set by purchaseIntel (C7) from registry (ia_intel_cost_cents gdd/14).
//
// FK: player_id → player(player_id) ON DELETE CASCADE.
// FK: target_id → internal_affairs_targets(target_id) ON DELETE CASCADE.
// INDEX: (player_id) — per-player purchase history.
// INDEX: (target_id) — target-scoped reads (how many players have intel on this target).
// R9.3: matches migration 0101 byte-for-meaning.
export const iaIntelPurchase = pgTable(
  'ia_intel_purchases',
  {
    /** PK: uuid generated by purchaseIntel (C7). */
    purchase_id: uuid('purchase_id').primaryKey().defaultRandom(),

    /**
     * player_id — FK → player(player_id) ON DELETE CASCADE.
     * Player-scoped: deleting a player removes all their intel purchases.
     * Canon :64 "player_id uuid references player ON DELETE CASCADE".
     */
    player_id: uuid('player_id')
      .notNull()
      .references(() => player.player_id, { onDelete: 'cascade' }),

    /**
     * target_id — FK → internal_affairs_targets(target_id) ON DELETE CASCADE.
     * The target whose suspicion band was purchased.
     * Canon :65 "target_id uuid references internal_affairs_targets ON DELETE CASCADE".
     */
    target_id: uuid('target_id')
      .notNull()
      .references(() => internalAffairsTarget.target_id, { onDelete: 'cascade' }),

    /**
     * purchased_at — real-time timestamp of the intel purchase (defaultNow).
     * Canon :66 "purchased_at timestamp".
     */
    purchased_at: timestamp('purchased_at', { withTimezone: true }).notNull().defaultNow(),

    /**
     * revealed_band — the suspicion band revealed to the player at purchase time.
     * This is the P5-projected band value (not the raw float). Clear to the player.
     * Canon :67 "revealed_band ia_suspicion_band — the band revealed at purchase".
     */
    revealed_band: iaSuspicionBand('revealed_band').notNull(),

    /**
     * cost_cents — the cash cost of this intel purchase in cents.
     * Bigint (cash-clear per DD-P5 — transaction value exposed to player).
     * Default 0: set to the registry value at purchase time (ia_intel_cost_cents gdd/14).
     * Canon :68 "cost_cents bigint — cash cost in cents".
     */
    cost_cents: bigint('cost_cents', { mode: 'bigint' }).notNull().default(BigInt(0)),
  },
  (t) => ({
    /**
     * (player_id) index — mirrors `ia_intel_purchases_player_idx` (mig 0101).
     * Used by: purchaseIntel (C7) per-player history; BO GET /ia-intel-purchases endpoint.
     */
    player_idx: index('ia_intel_purchases_player_idx').on(t.player_id),

    /**
     * (target_id) index — mirrors `ia_intel_purchases_target_idx` (mig 0101).
     * Used by: target-scoped reads (how many players hold intel on this target).
     */
    target_idx: index('ia_intel_purchases_target_idx').on(t.target_id),
  }),
);

export const iaIntelPurchaseRelations = relations(iaIntelPurchase, ({ one }) => ({
  player: one(player, {
    fields: [iaIntelPurchase.player_id],
    references: [player.player_id],
  }),
  target: one(internalAffairsTarget, {
    fields: [iaIntelPurchase.target_id],
    references: [internalAffairsTarget.target_id],
  }),
}));

export type IaIntelPurchaseRow    = typeof iaIntelPurchase.$inferSelect;
export type IaIntelPurchaseInsert = typeof iaIntelPurchase.$inferInsert;
