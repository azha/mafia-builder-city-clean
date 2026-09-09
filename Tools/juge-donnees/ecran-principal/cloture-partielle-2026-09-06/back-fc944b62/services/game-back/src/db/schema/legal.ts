// IMPLEMENTS: docs/superpowers/plans/2026-06-30-04d-A-lawyer-legal-plan.md C1 (schema)
//             Canon: docs/tech/04d_meta_market_lawyer_and_internal_affairs/lawyer_legal_system.md §State (:69-100)
//             docs/tech/09_data_model/schema_lawyer.md (R9.3 backport — same-commit)
//             docs/tech/09_data_model/schema_legal_case.md (R9.3 backport — same-commit)
//             — 04d-A C1 — 2026-06-30
//
// TABLES (2 NEW legal entities — migrations 0097):
//
//   lawyers — per-player lawyer roster (0..N per player; Tier-1 is auto-assigned at LAWYER_UP).
//     PK: lawyer_id (uuid). FK: player_id → player(player_id) ON DELETE CASCADE.
//     burn_risk_score: real — SERVER-ONLY (R2.2/P5). Tier-3 only; used by IA-B §13 hook.
//
//   legal_cases — per-player case lifecycle (1 row per caught event that chose LAWYER_UP).
//     PK: case_id (uuid). FK: player_id → player(player_id) ON DELETE CASCADE.
//     lawyer_id: nullable FK → lawyers(lawyer_id) — upgraded from Tier-1 at hire.
//     info_leak_rate, info_leak_total: real — SERVER-ONLY (R2.2/P5). Projected via LeakBandBucket.
//     INDEX: (player_id, status) — active-case sweep + BO lookups.
//
// ENUMS (4 NEW):
//   lawyer_tier         — public_defender | boutique | corruption_pipeline (3-tier model §3 :37-65)
//   charge_severity     — misdemeanor | felony_low | felony_high | major_crime (§3 :83)
//   case_status         — active | plea_down | acquitted | convicted | dismissed (§ timeline :104)
//   defendant_type      — courier | lieutenant | dealer (dealer = reserved-inert, RATIFIÉ 2026-06-30 #5)
//
// R9.3: this file matches migrations 0097 byte-for-meaning.
//       ch09 mirrors: docs/tech/09_data_model/schema_lawyer.md + schema_legal_case.md (created same-commit).
// R2.2 / P5: burn_risk_score, info_leak_rate, info_leak_total are SERVER-ONLY — never forwarded raw.
//            Player sees banded projections: BurnRiskBucket (BO/Exception), LeakBandBucket (Legal panel C9).
// Anti-fabrication: no Math.random(), no non-deterministic defaults.
// Zero-regression: ADDITIVE only — no existing tables modified. The additive ALTER on caught_exception
//                  (legal_case_id FK) is in migration 0098 and db/schema/operational_chain.ts (C1 same-commit).
// dealer = reserved-inert (RATIFIÉ #5): the enum member is declared; no v1 trigger creates a dealer case (TD).
// ✅ RE-VÉRIFIÉ 2026-08-08 — TIENT. Contrôlé parce que son jumeau `clerk` (schema_internal_affairs)
// portait la MÊME borne temporelle et était devenu FAUX sans que personne ne le relise (CLAUDE.md
// règle 7). Mesure : `grep -rEn "defendant_type|defendantType" services/game-back/src --include='*.ts'`
// hors schéma/specs/commentaires → 3 hits, TOUS des déclarations de type (legal-case.service.ts:72,
// city-event-bus.ts:1388, legal.types.ts:39), AUCUN chemin de création. Contrôle positif du motif :
// 13 hits pour courier|lieutenant. ⇒ résultat NÉGATIF confirmé, pas hérité.

import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  integer,
  real,
  boolean,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { player } from './player';

// ===== pgEnums (4 closed-domain enum types for the 2 legal entities) =====

/**
 * `lawyer_tier` — the 3-tier defense model (canon :37-65).
 *
 * - `public_defender`       : Tier-1 — auto-assigned (GRATUIT, RATIFIÉ 2026-06-30 #1). Limited info-leak
 *                             reduction. Assigned at LAWYER_UP; player can upgrade within the
 *                             `{{tunable:lawyer.tier1_auto_assign_window_hours}}` window (6h, gdd/14).
 * - `boutique`              : Tier-2 — per-case or retainer cost. −40% info-leak rate, +30% duration,
 *                             20% plea-down probability. Hired via service + recruit quest.
 * - `corruption_pipeline`   : Tier-3 — highest cost, −80% info-leak, dismiss low-severity charges,
 *                             corrupt-clerk payoff path. Raises `burn_risk_score` per payoff.
 *                             Can be "burned" — `LawyerBurnedEvent` emitted when IA flips (C8).
 */
export const lawyerTier = pgEnum('lawyer_tier', [
  'public_defender',
  'boutique',
  'corruption_pipeline',
]);

/**
 * `charge_severity` — severity of the criminal charge (canon :83).
 *
 * Courier charge derivation (RATIFIÉ 2026-06-30 #3): derived from cargo + reputation_at_catch [PROV-Y26Q2].
 * Lieutenant charge derivation: derived from tenure × role (C3 createCase).
 *
 * - `misdemeanor`   : lowest severity — dismissable by Tier-3; short duration.
 * - `felony_low`    : mid-low severity — dismissable by Tier-3; standard duration.
 * - `felony_high`   : mid-high severity — NOT dismissable; extended duration.
 * - `major_crime`   : highest severity — NOT dismissable; maximum duration; high conviction rate.
 */
export const chargeSeverity = pgEnum('charge_severity', [
  'misdemeanor',
  'felony_low',
  'felony_high',
  'major_crime',
]);

/**
 * `case_status` — lifecycle state of a legal case (canon :104-119).
 *
 * - `active`      : case open, ticks_remaining > 0, leak accruing per tick (C6 LEGAL_LEAK_TICK).
 * - `plea_down`   : player accepted a plea deal (C7 acceptPleaDeal); charge reduced, negotiated terms.
 * - `acquitted`   : NIGHTLY resolution roll — defendant acquitted, no further leak.
 * - `convicted`   : NIGHTLY resolution roll — conviction; final-dump `appendDeclarationEntry` (C7).
 * - `dismissed`   : Tier-3 low-severity only — issueTier3Payoff (C8) dismissed the charge.
 */
export const caseStatus = pgEnum('case_status', [
  'active',
  'plea_down',
  'acquitted',
  'convicted',
  'dismissed',
]);

/**
 * `defendant_type` — the category of person being defended (canon :83).
 *
 * - `courier`     : a courier caught via `caught_exception` LAWYER_UP (re-wire C4).
 * - `lieutenant`  : a lieutenant arrested via building raid (BuildingRaidedEvent, C3) or MIS referral (C3).
 * - `dealer`      : RESERVED-INERT (RATIFIÉ 2026-06-30 #5). No live "caught" path for dealers exists
 *                   (couriers → caught_exception; lieutenants → raid/MIS). Declared for future TD.
 */
export const defendantType = pgEnum('defendant_type', [
  'courier',
  'lieutenant',
  'dealer',
]);

// ===== Table 1: lawyers — per-player lawyer roster (migration 0097) =====
//
// One row per hired lawyer. A player may have 0..N lawyers (max constrained applicatively by tier).
// Tier-1 is auto-assigned at LAWYER_UP (no explicit hire action — `LegalCaseService.createCase` C3).
// Tier-2 and Tier-3 require an explicit hire action (`LawyerService.hire` C5).
//
// burn_risk_score: server-only float accumulated per Tier-3 payoff use (`issueTier3Payoff` C8).
//   When > `tier3_burn_threshold` (registry getter), `evaluateBurnRisk` (C8 NIGHTLY) emits
//   `LawyerBurnedEvent` and auto-switches pending Tier-3 cases to Tier-1.
//   R2.2/P5: never exposed raw. Projected via `BurnRiskBucket` composite (BO) + qualitative
//   Exception "acting nervous" (player client) when approaching threshold.
//
// sessions_active: integer count of active cases currently assigned to this lawyer.
//   Incremented on case assignment, decremented on case resolution.
//
// hired_at: in-game timestamp at hire (defaultNow — real game time; only used for display).
// created_via_quest_id: nullable uuid — the recruitment quest that unlocked this Tier-2/3 lawyer.
//   Null for Tier-1 public defenders (auto-assigned, no quest required).
//
// FK: player_id → player(player_id) ON DELETE CASCADE (false_report_ledger.ts:20 pattern).
// R9.3: matches migration 0097 byte-for-meaning.
export const lawyer = pgTable(
  'lawyers',
  {
    /** PK: uuid generated by LegalCaseService (auto-assigned Tier-1) or LawyerService.hire (Tier-2/3). */
    lawyer_id: uuid('lawyer_id').primaryKey().defaultRandom(),

    /**
     * player_id — FK → player(player_id) ON DELETE CASCADE.
     * Player-scoped: deleting a player removes all their lawyers.
     */
    player_id: uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),

    /**
     * tier — the 3-tier defense model tier for this lawyer.
     * public_defender (Tier-1) | boutique (Tier-2) | corruption_pipeline (Tier-3).
     * Canon :37-65 (the 3-tier defense model description).
     */
    tier: lawyerTier('tier').notNull(),

    /**
     * name — display name of the lawyer (varchar 64, canon :71).
     * Tier-1: "Public Defender" (auto). Tier-2/3: from recruitment quest or service.
     */
    name: varchar('name', { length: 64 }).notNull(),

    /**
     * retainer_active — whether a monthly retainer arrangement is active for this lawyer.
     * Tier-2 and Tier-3 only (Tier-1 is per-case only).
     * When true, flat monthly cost applies (tier2_retainer_monthly_cost_cents, gdd/14).
     * Default false: per-case billing.
     */
    retainer_active: boolean('retainer_active').notNull().default(false),

    /**
     * retainer_monthly_cost_cents — the agreed monthly retainer fee in cents.
     * Null when retainer_active=false (per-case billing).
     * Set on hire / setRetainer (C5). Canon :75 "retainer_monthly_cost int".
     */
    retainer_monthly_cost_cents: integer('retainer_monthly_cost_cents'),

    /**
     * burn_risk_score — accumulated corruption-pipeline IA-suspicion score (canon :76 "float").
     * SERVER-ONLY (R2.2/P5): never forwarded to player client. Projected via BurnRiskBucket (C9/C10).
     * Tier-3 only (meaningful); Tier-1/2 always 0.0.
     * Incremented per `issueTier3Payoff` call (C8). Triggers `LawyerBurnedEvent` when
     * > `tier3_burn_threshold` (NIGHTLY evaluateBurnRisk, C8). This is the IA-B §13 hook entry-point.
     * Default 0.0 (no risk at hire).
     */
    burn_risk_score: real('burn_risk_score').notNull().default(0.0),

    /**
     * sessions_active — count of active cases currently assigned to this lawyer.
     * Incremented by LegalCaseService.createCase / reassignCase (C3/C5).
     * Decremented by resolveCase / cancelCase (C7/C8).
     * Default 0: no active cases at hire.
     */
    sessions_active: integer('sessions_active').notNull().default(0),

    /**
     * hired_at — real-time timestamp at lawyer hire (defaultNow).
     * Used for display (roster age) and Tier-3 payoff audit only.
     * Canon :78 "hired_at timestamp".
     */
    hired_at: timestamp('hired_at', { withTimezone: true }).notNull().defaultNow(),

    /**
     * created_via_quest_id — nullable uuid of the recruitment quest that introduced this lawyer.
     * Null for Tier-1 public defenders (auto-assigned, no quest).
     * Tier-2/3: set to the quest_id from the recruitment quest (Unity deferred, TD).
     * Canon :79 "created_via_quest_id uuid null".
     */
    created_via_quest_id: uuid('created_via_quest_id'),
  },
  (t) => ({
    /**
     * (player_id) index — mirrors the physical index `lawyers_player_idx` created by mig 0097.
     * Used by: LawyerService.hire / setRetainer (C5) player-scoped queries;
     *          evaluateBurnRisk NIGHTLY sweep (C8); BO GET /legal-cases lawyer lookup.
     * R9.3: this Drizzle callback mirrors the physical index; no new migration generated.
     */
    player_idx: index('lawyers_player_idx').on(t.player_id),
  }),
);

export const lawyerRelations = relations(lawyer, ({ one }) => ({
  player: one(player, { fields: [lawyer.player_id], references: [player.player_id] }),
}));

export type LawyerRow    = typeof lawyer.$inferSelect;
export type LawyerInsert = typeof lawyer.$inferInsert;

// ===== Table 2: legal_cases — per-player case lifecycle (migration 0097) =====
//
// One row per active legal case. Created by LegalCaseService.createCase (C3):
//   - LAWYER_UP path: courier caught exception → re-wire C4
//   - BuildingRaidedEvent path: lieutenant/building defendant (C3)
//   - tail_subpoena MIS path: forensic inspection queue → legal referral (C3, closes the deferred TD)
//
// info_leak_rate: float — per-tick probability of revealing an item from knowledge_set_ref.
//   Tier-1: tier1_info_leak_rate (gdd/14). Tier-2: −40%. Tier-3: −80%.
//   SERVER-ONLY (R2.2/P5): never exposed raw to client.
//
// info_leak_total: float — accumulated leak fraction (0.0..1.0).
//   Incremented by tickLeakAccumulation (C6 LEGAL_LEAK_TICK) per roll hit.
//   SERVER-ONLY (R2.2/P5): projected to LeakBandBucket for the player (C9).
//
// knowledge_set_ref: jsonb — the lazy-computed knowledge set for this defendant (C3).
//   Structure: { items: KnowledgeItem[] } where KnowledgeItem has { id, type, label, importance }.
//   Built from courier/lieutenant role+tenure at case creation. Never mutated after C3.
//
// items_leaked: jsonb — list of knowledge item IDs already leaked.
//   Default []. Grown by recordLeakedItem (C6 LEGAL_LEAK_TICK). Drives the drip accumulation.
//
// case_duration_ticks: int — total duration in game-ticks from case creation to NIGHTLY resolution window.
//   Set at createCase from the charge_severity × tier composite [PROV-Y26Q2] (gdd/14 registry).
//
// ticks_remaining: int — decremented by tickLeakAccumulation (C6). When ≤ 0, NIGHTLY resolveCase fires.
//
// FK: player_id → player(player_id) ON DELETE CASCADE.
// FK: lawyer_id → lawyers(lawyer_id) — nullable (set at createCase for Tier-1; may be null briefly).
// INDEX: (player_id, status) — active-case sweep (LEGAL_LEAK_TICK L1 skip) + BO legal-cases endpoint.
// R9.3: matches migration 0097 byte-for-meaning.
export const legalCase = pgTable(
  'legal_cases',
  {
    /** PK: uuid generated by LegalCaseService.createCase. */
    case_id: uuid('case_id').primaryKey().defaultRandom(),

    /**
     * player_id — FK → player(player_id) ON DELETE CASCADE.
     * Player-scoped: deleting a player removes all their cases.
     */
    player_id: uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),

    /**
     * defendant_id — uuid of the defendant (courier_id or lieutenant_id).
     * Soft ref (no DB FK — the defendant entity type varies by defendant_type).
     * Canon :84: "defendant_id uuid — courier_id or lieutenant_id".
     */
    defendant_id: uuid('defendant_id').notNull(),

    /**
     * defendant_type — the category of defendant being defended.
     * courier | lieutenant | dealer (dealer = reserved-inert, RATIFIÉ #5).
     * Canon :85: "defendant_type enum('courier', 'lieutenant', 'dealer')".
     */
    defendant_type: defendantType('defendant_type').notNull(),

    /**
     * lawyer_id — nullable FK → lawyers(lawyer_id).
     * Set at createCase (Tier-1 auto-assign) or on hire (C5).
     * Null only transiently before the Tier-1 assignment completes.
     * Canon :86: "lawyer_id uuid null references lawyers".
     */
    lawyer_id: uuid('lawyer_id').references(() => lawyer.lawyer_id),

    /**
     * charge_severity — severity of the criminal charge.
     * Derives from cargo + reputation_at_catch [PROV-Y26Q2] for couriers (RATIFIÉ #3).
     * Derives from tenure × role for lieutenants.
     * Canon :87: "charge_severity enum('misdemeanor', 'felony_low', 'felony_high', 'major_crime')".
     * Clear to the player (a charge is legitimately visible): shown in the Legal panel and Exception card.
     */
    charge_severity: chargeSeverity('charge_severity').notNull(),

    /**
     * info_leak_rate — per-tick leak probability (canonical float).
     * Tier-1: tier1_info_leak_rate (gdd/14). Tier-2: −40%. Tier-3: −80%.
     * SERVER-ONLY (R2.2/P5): never forwarded to client. Projected via LeakBandBucket (C9).
     * Canon :88: "info_leak_rate float — per tick the defendant reveals info to BPD (internal)".
     * Default 0.0 until set by createCase.
     */
    info_leak_rate: real('info_leak_rate').notNull().default(0.0),

    /**
     * info_leak_total — accumulated leak fraction (0.0..1.0+).
     * Incremented by tickLeakAccumulation (C6) per draw hit.
     * SERVER-ONLY (R2.2/P5): never forwarded to client. Projected via LeakBandBucket (C9).
     * Canon :89: "info_leak_total float — accumulated (internal — projected to bucket client-side)".
     * Default 0.0 (no leak at case creation).
     */
    info_leak_total: real('info_leak_total').notNull().default(0.0),

    /**
     * case_duration_ticks — total case duration in game-ticks.
     * Derived from charge_severity + tier composite [PROV-Y26Q2] (gdd/14 registry getter C2).
     * Set at createCase. Immutable after creation (tier upgrade extends ticks_remaining, not this).
     * Canon :90: "case_duration_ticks int".
     * Default 0 until set by createCase.
     */
    case_duration_ticks: integer('case_duration_ticks').notNull().default(0),

    /**
     * ticks_remaining — ticks until NIGHTLY resolution sweep fires for this case.
     * Decremented by tickLeakAccumulation (C6 LEGAL_LEAK_TICK). When ≤ 0, resolveCase fires (C7).
     * Tier upgrade via reassignCase (C5) extends this by the tier duration multiplier.
     * Canon :91: "ticks_remaining int".
     * Default 0 until set by createCase.
     */
    ticks_remaining: integer('ticks_remaining').notNull().default(0),

    /**
     * status — case lifecycle state.
     * active → plea_down | acquitted | convicted | dismissed.
     * Canon :92: "status enum('active', 'plea_down', 'acquitted', 'convicted', 'dismissed')".
     * Default 'active' at case creation.
     */
    status: caseStatus('status').notNull().default('active'),

    /**
     * knowledge_set_ref — jsonb snapshot of the defendant's knowledge items at case creation.
     * Structure: { items: KnowledgeItem[] } (KnowledgeItem = { id, type, label, importance }).
     * Lazy-computed by createCase (C3) from courier/lieutenant role+tenure. Immutable after C3.
     * Canon :93: "knowledge_set_ref jsonb — ref to defendant's knowledge items".
     * Default null (populated by createCase at case creation).
     */
    knowledge_set_ref: jsonb('knowledge_set_ref'),

    /**
     * items_leaked — jsonb array of leaked knowledge item IDs.
     * Grown by recordLeakedItem (C6 LEGAL_LEAK_TICK). Each element is a KnowledgeItem id string.
     * Default [] (no items leaked at case creation).
     * Canon :94: "items_leaked jsonb — list of leaked knowledge item IDs".
     */
    items_leaked: jsonb('items_leaked').notNull().default([]),

    /**
     * started_at — real-time timestamp when the case was opened (defaultNow at createCase).
     * Canon :95: "started_at timestamp".
     */
    started_at: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),

    /**
     * resolved_at — real-time timestamp when the case was resolved.
     * Null while active. Stamped by resolveCase (C7) or acceptPleaDeal (C7).
     * Canon :96: "resolved_at timestamp null".
     */
    resolved_at: timestamp('resolved_at', { withTimezone: true }),
  },
  (t) => ({
    /**
     * (player_id, status) index — used by:
     *   - tickLeakAccumulation (C6 LEGAL_LEAK_TICK): query all active cases per player (L1 skip guard).
     *   - runNightlyResolutionSweep (C7): query cases with ticks_remaining ≤ 0.
     *   - BO GET /legal-cases: list by player.
     * Canon: "Index (player_id, status)" plan §Data model.
     */
    player_status_idx: index('legal_cases_player_status_idx').on(t.player_id, t.status),
  }),
);

export const legalCaseRelations = relations(legalCase, ({ one }) => ({
  player: one(player,  { fields: [legalCase.player_id], references: [player.player_id] }),
  lawyer: one(lawyer,  { fields: [legalCase.lawyer_id], references: [lawyer.lawyer_id] }),
}));

export type LegalCaseRow    = typeof legalCase.$inferSelect;
export type LegalCaseInsert = typeof legalCase.$inferInsert;
