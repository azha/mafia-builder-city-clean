// IMPLEMENTS: docs/tech/09_data_model/schema_anti_cheat.md§2 -- session:2026-06-02 --
import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  boolean,
  timestamp,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { player } from './player';         // Task 3 — convention canonique FK player_id REUSE §5.1

// ===== Enums PG natifs =====
// REUSE membres owned ch13 (matérialisation pgEnum DB — liste VERBATIM, aucune re-déclaration conceptuelle)
export const cheatFlagKind = pgEnum('cheat_flag_kind', ['SOFT', 'HARD']);                                  // FlagKind ch13 signature_detection §7
export const signatureDetectorKind = pgEnum('signature_detector_kind', [
  'BOT', 'REPLAY', 'DEVICE', 'CROSS_ACCOUNT', 'T4_SIGNAL',                                                  // D1-D4 ch13 + T4_SIGNAL (signal T4 pur, nullable côté composite)
]);
export const enforcementActionType = pgEnum('enforcement_action_type', [
  'WARN', 'SUSPEND', 'BAN', 'SHADOW_BAN',                                                                   // EnforcementActionEnum ch13 enforcement_actions §7 (grep #4)
]);
export const appealState = pgEnum('appeal_state', [
  'SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED',                                                      // AppealStateEnum ch13 appeals_process §7 (grep #6)
]);
// NEW-in-09 (domaines fermés imposés par la matérialisation — justifiés §1)
export const cheatFlagSeverity = pgEnum('cheat_flag_severity', ['LOW', 'MEDIUM', 'HIGH']);                 // [NEW-in-09] domaine du `severity` ch13 (non énuméré amont)
export const cheatFlagStatus = pgEnum('cheat_flag_status', ['QUEUED', 'REVIEWED', 'RESOLVED']);            // [NEW-in-09] UPPERCASE de « en-file / revu / résolu » ch13
export const appealOutcomeKind = pgEnum('appeal_outcome_kind', ['ACCEPTED', 'REJECTED']);                  // [NEW-in-09] axe discret de l'AppealOutcome composite ch13

// ===== Table 1 : cheat_flag — CheatFlag ch13 signature_detection §7 (le détecteur PRODUIT le flag) =====
// BO-only strict (P5 §8) — JAMAIS surface joueur (exposer le détecteur le rend contournable).
// FK target_player_id RESTRICT (compliance-traçabilité non-purgeable — calque Task 3 §5.2 ligne 385).
export const cheatFlagRow = pgTable(
  'cheat_flag',
  {
    cheat_flag_id:    uuid('cheat_flag_id').primaryKey().defaultRandom(),                                    // ch13 `id`
    target_player_id: uuid('target_player_id').notNull().references(() => player.player_id, { onDelete: 'restrict' }), // ch13 `target_player_id (FK player)` + RESTRICT §1
    flag_kind:        cheatFlagKind('flag_kind').notNull(),                                                  // ch13 `flag_kind: FlagKind`
    source_signal:    varchar('source_signal', { length: 32 }).notNull(),                                   // ch13 `source_signal` (M1/M4/M6 ou D1-D4) — varchar ouvert (catalogue monitor extensible)
    detector:         signatureDetectorKind('detector'),                                                    // ch13 `detector (SignatureDetectorKind, nullable pour signal T4 pur)`
    severity:         cheatFlagSeverity('severity').notNull(),                                              // ch13 `severity` ([NEW-in-09] domaine LOW|MEDIUM|HIGH)
    status:           cheatFlagStatus('status').notNull().default('QUEUED'),                                 // ch13 `status (en-file/revu/résolu)` ([NEW-in-09] UPPERCASE + default QUEUED)
    created_at:       timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),                // ch13 `created_at` (promotion timestamptz — cohérent Tasks 3-12)
  },
  (table) => ({
    target_player_idx: index('cheat_flag_target_player_idx').on(table.target_player_id, table.created_at.desc()), // hot path : flags d'un joueur (file de revue 12)
    status_idx:        index('cheat_flag_status_idx').on(table.status, table.created_at.desc()),             // hot path : flags en-file (QUEUED) pour la file humaine
    kind_severity_idx: index('cheat_flag_kind_severity_idx').on(table.flag_kind, table.severity),            // hot path : hard-flags HIGH (triage prioritaire)
  }),
);

// ===== Table 2 : enforcement_action — EnforcementAction ch13 enforcement_actions §7 (l'action consomme un flag) =====
// BO-only strict (P5 §8). FK target_player_id RESTRICT (compliance). source_signal_id soft-FK → cheat_flag RESTRICT.
export const enforcementActionRow = pgTable(
  'enforcement_action',
  {
    enforcement_action_id: uuid('enforcement_action_id').primaryKey().defaultRandom(),                       // ch13 `id`
    target_player_id:      uuid('target_player_id').notNull().references(() => player.player_id, { onDelete: 'restrict' }), // ch13 `target_player_id (FK player)` + RESTRICT §1
    action_enum:           enforcementActionType('action_enum').notNull(),                                   // ch13 `action_enum: EnforcementActionEnum` (WARN|SUSPEND|BAN|SHADOW_BAN)
    source_signal_id:      uuid('source_signal_id').references(() => cheatFlagRow.cheat_flag_id, { onDelete: 'restrict' }), // ch13 `source_signal_id (FK CheatFlag, nullable — warn manuel)` + RESTRICT (trace source non-purgeable)
    staff_id:              uuid('staff_id').notNull(),                                                       // ch13 `staff_id (FK staff REUSE 17)` — soft-ref uuid (accounts_staff PAS DDL day-1, gap §16)
    before_state:          jsonb('before_state').notNull().default(sql`'{}'::jsonb`),                         // ch13 `before_state (jsonb — lifecycle_state/warn_count/shadow_banned avant)`
    after_state:           jsonb('after_state').notNull().default(sql`'{}'::jsonb`),                          // ch13 `after_state (jsonb — après)`
    shadow_banned:         boolean('shadow_banned').notNull().default(false),                                // ch13 `shadow_banned: boolean (dimension d'isolement applicatif §2.4)`
    two_person_approval_id: uuid('two_person_approval_id'),                                                  // ch13 `two_person_approval_id? (FK TwoPersonApprovalRequest 17, nullable — ban/shadow-ban/rollback)` — soft-ref
    ticket_ref:            varchar('ticket_ref', { length: 64 }),                                            // ch13 `ticket_ref (lien case d'enquête)`
    created_at:            timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),            // ch13 `created_at`
  },
  (table) => ({
    target_player_idx: index('enforcement_action_target_player_idx').on(table.target_player_id, table.created_at.desc()), // hot path : historique d'enforcement d'un joueur
    action_enum_idx:   index('enforcement_action_action_enum_idx').on(table.action_enum, table.created_at.desc()),        // hot path : toutes les actions BAN/SHADOW_BAN (compliance trail)
    source_signal_idx: index('enforcement_action_source_signal_idx').on(table.source_signal_id),             // hot path : remonter du flag à l'action (revue d'appel §2.2 ch13)
    shadow_active_partial_idx: index('enforcement_action_shadow_active_partial_idx').on(table.target_player_id) // partial : shadow-bans actifs (revue périodique §2.4 ch13)
      // colonne via le param `table` (et non le `const`) — anti self-réf circulaire TS7022 ; SQL identique.
      .where(sql`${table.shadow_banned} = true`),
  }),
);

// ===== Table 3 : appeal_case — AppealCase ch13 appeals_process §7 (le joueur conteste une action) =====
// MIXTE P5 : Self projection joueur (state + timestamps SEULEMENT) + Admin BO full. FK player_id CASCADE (ch13 §7).
export const appealCaseRow = pgTable(
  'appeal_case',
  {
    appeal_id:             uuid('appeal_id').primaryKey().defaultRandom(),                                    // ch13 `appeal_id (PK uuid)`
    player_id:             uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }), // ch13 `player_id (FK player ... ON DELETE CASCADE par défaut R9.3 §4)` (grep #7)
    enforcement_action_id: uuid('enforcement_action_id').notNull().references(() => enforcementActionRow.enforcement_action_id, { onDelete: 'restrict' }), // ch13 `enforcement_action_id (FK EnforcementAction — politique figée ICI au backport concomitant)` → RESTRICT (l'action contestée est compliance ; ne pas perdre le lien tant qu'un appel vit)
    state:                 appealState('state').notNull().default('SUBMITTED'),                              // ch13 `state (AppealStateEnum pgEnum NEW)`
    reason_text:           text('reason_text').notNull(),                                                    // ch13 `reason_text (motif libre joueur, PII account-linked)`
    submitted_at:          timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),          // ch13 `submitted_at (timestamptz)`
    reviewed_by:           uuid('reviewed_by'),                                                              // ch13 `reviewed_by (soft-ref staff StaffAccount 17, nullable tant que SUBMITTED)`
    outcome:               appealOutcomeKind('outcome'),                                                     // ch13 `outcome (AppealOutcome — nullable tant que non-tranché)` — axe discret [NEW-in-09]
    decision_reason:       text('decision_reason'),                                                          // ch13 `decision_reason (motivation staff, nullable)`
    decided_at:            timestamp('decided_at', { withTimezone: true }),                                  // ch13 `decided_at (timestamptz nullable)`
    two_person_approval_id: uuid('two_person_approval_id'),                                                  // ch13 `two_person_approval_id (soft-ref TwoPersonApprovalRequest 17, nullable — overturn ban)`
  },
  (table) => ({
    // ch13 §7 : UNIQUE (enforcement_action_id) — un seul AppealCase par EnforcementAction (anti-abus §2.1)
    enforcement_action_uq: uniqueIndex('appeal_case_enforcement_action_uq').on(table.enforcement_action_id),
    player_idx:            index('appeal_case_player_idx').on(table.player_id, table.submitted_at.desc()),    // hot path : appels d'un joueur (Self projection)
    state_idx:             index('appeal_case_state_idx').on(table.state, table.submitted_at.desc()),         // hot path : backlog SUBMITTED/UNDER_REVIEW (file de revue + forward 21 SLA)
  }),
);

// ===== Relations Drizzle =====
export const cheatFlagRelations = relations(cheatFlagRow, ({ one, many }) => ({
  player:             one(player, { fields: [cheatFlagRow.target_player_id], references: [player.player_id] }),
  enforcementActions: many(enforcementActionRow),                                                            // 1-N : un flag peut alimenter N actions (récidive)
}));

export const enforcementActionRelations = relations(enforcementActionRow, ({ one }) => ({
  player:      one(player,       { fields: [enforcementActionRow.target_player_id], references: [player.player_id] }),
  sourceFlag:  one(cheatFlagRow, { fields: [enforcementActionRow.source_signal_id], references: [cheatFlagRow.cheat_flag_id] }),
  // appealCase : back-ref 0..1 via UNIQUE(enforcement_action_id) côté appeal_case (déclarée côté appealCaseRelations).
}));

export const appealCaseRelations = relations(appealCaseRow, ({ one }) => ({
  player:            one(player,                { fields: [appealCaseRow.player_id], references: [player.player_id] }),
  enforcementAction: one(enforcementActionRow,  { fields: [appealCaseRow.enforcement_action_id], references: [enforcementActionRow.enforcement_action_id] }),
}));

// ===== Longueurs des colonnes bornées — W1.2-a C3 =====
// UNE source pour la DDL et pour la garde d'entrée (calque `two_person_approval.ts`'s own
// `TWO_PERSON_*_MAXLEN` pair) : une borne recopiée à la main dans un contrôleur survit à
// l'élargissement de sa colonne et se met à refuser du légitime (classe TD-420 — sans garde, un
// dépassement remonte en `500 INTERNAL_ERROR` dont le corps ne nomme ni la colonne ni la longueur).
export const ENFORCEMENT_ACTION_TICKET_REF_MAXLEN = 64;

// ===== Types inférés Drizzle =====
export type CheatFlagRow         = typeof cheatFlagRow.$inferSelect;
export type EnforcementActionRow = typeof enforcementActionRow.$inferSelect;
export type AppealCaseRow        = typeof appealCaseRow.$inferSelect;

// ===== Enum TS mirrors PG natif =====
export type CheatFlagKindEnumTs         = (typeof cheatFlagKind.enumValues)[number];          // 'SOFT' | 'HARD'
export type SignatureDetectorKindEnumTs = (typeof signatureDetectorKind.enumValues)[number];  // 'BOT' | 'REPLAY' | 'DEVICE' | 'CROSS_ACCOUNT' | 'T4_SIGNAL'
export type EnforcementActionTypeEnumTs = (typeof enforcementActionType.enumValues)[number];  // 'WARN' | 'SUSPEND' | 'BAN' | 'SHADOW_BAN'
export type AppealStateEnumTs           = (typeof appealState.enumValues)[number];            // 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED'
export type CheatFlagSeverityEnumTs     = (typeof cheatFlagSeverity.enumValues)[number];      // 'LOW' | 'MEDIUM' | 'HIGH'
export type CheatFlagStatusEnumTs       = (typeof cheatFlagStatus.enumValues)[number];        // 'QUEUED' | 'REVIEWED' | 'RESOLVED'
export type AppealOutcomeKindEnumTs     = (typeof appealOutcomeKind.enumValues)[number];      // 'ACCEPTED' | 'REJECTED'
