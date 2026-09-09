// IMPLEMENTS: docs/tech/09_data_model/schema_sessions_and_audit.md§2 -- session:2026-06-02 --
import {
  pgTable,
  uuid,
  integer,
  varchar,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
  pgEnum,
  check,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { player } from './player';         // Task 3 — convention canonique FK player_id REUSE §5.1

// ===== Enum PG natif =====
// audit_action_type — promotion vs GDD L419 varchar(64) (override §1)
// 7 membres UPPERCASE NEW — catalogue fermé stable des mutations BO data-model
// Extension future = ALTER TYPE ADD VALUE (migration PALIMPSEST PG-native)
export const auditActionType = pgEnum('audit_action_type', [
  'CREATE',
  'UPDATE',
  'DELETE',
  'RESTORE',
  'EXPORT',
  'IMPERSONATE',
  'SIGNIN_AS',
]);

// ===== Table 1 : gameplay_sessions — GDD L405-413 verbatim (renommée `sessions` → `gameplay_sessions` §1) =====
// PK simple gameplay_session_id uuid (renommé `session_id` → `gameplay_session_id` §1 — collision-free auth 17).
// FK player_id NOT NULL RESTRICT (Task 3 §5.2 ligne 385 catégorie « Audit / traçabilité non purgeable »).
// Compteurs decisions_made / exceptions_resolved / structural_commits int + CHECK >= 0 + cap §12.
// timestamptz NOT NULL (promotion vs timestamp GDD verbatim) — cohérent Tasks 3-11.
export const gameplaySessionRow = pgTable(
  'gameplay_sessions',
  {
    gameplay_session_id:   uuid('gameplay_session_id').primaryKey().defaultRandom(),                                              // GDD L406 + override rename — collision-free auth 17
    player_id:             uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'restrict' }),                // GDD L407 + override NOT NULL + RESTRICT — Task 3 §5.2 ligne 385
    started_at:            timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),                                  // GDD L408 + override timestamp → timestamptz + NOT NULL
    ended_at:              timestamp('ended_at', { withTimezone: true }),                                                            // GDD L409 verbatim « null » — partial index actives §6
    decisions_made:        integer('decisions_made').notNull().default(0),                                                          // GDD L410 verbatim `int default 0`
    exceptions_resolved:   integer('exceptions_resolved').notNull().default(0),                                                     // GDD L411 verbatim `int default 0`
    structural_commits:    integer('structural_commits').notNull().default(0),                                                      // GDD L412 verbatim `int default 0`
    client_version:        varchar('client_version', { length: 32 }).notNull(),                                                      // GDD L413 verbatim `varchar(32)` + override NOT NULL — toute session signale son build
    // opened_game_day — ADDITIVE column (P3-B C1, migration 0123 prov., D11). Written at session open
    // (the game-day index from the clock) — powers `flag_review.auto_open` (first-session-per-game-day,
    // ch05 Loop 2) with NO marker table (decisions §1.11: a marker table would duplicate what sessions
    // should know about themselves). DEFAULT-safe (0 = "no game-day recorded yet", the honest legacy
    // marker for any pre-existing row) — invisible to every EXISTING session_lifecycle assertion until
    // P3-B C6 starts reading/writing it (zero-regression contract, design §12).
    opened_game_day:       integer('opened_game_day').notNull(),                                                                     // P3-B C1 (mig 0123 prov.) — D11, additive ; W1.1-d C1.2 — plus de `.default(0)` TS-side (ANCRE ABSOLUE) : `session.repository.ts#openFresh` posait déjà l'ancre explicitement au game-day courant (citySimClock + deriveGameDay) — zéro changement de comportement. DDL SQL garde `DEFAULT 0`.
  },
  (table) => ({
    player_idx:                index('gameplay_sessions_player_idx').on(table.player_id),                                            // hot path : sessions d'un player
    player_started_idx:        index('gameplay_sessions_player_started_idx').on(table.player_id, table.started_at.desc()),           // hot path : sessions récentes d'un player (admin lookup §6)
    // UNIQUE partial index — sessions actives (ended_at IS NULL) — mig 0120 (P3-A C2-fold, ⊥
    // IMPORTANT-1): DB-ENFORCES the one-active-session-per-player invariant (was app-enforced only
    // via a plain partial index, mig 0010 — a race between two concurrent `open()` calls for the
    // SAME player could insert two active rows). REPLACES the old plain `gameplay_sessions_
    // active_partial_idx` (DROPped same migration — 100% subsumed: same column, same predicate, no
    // read benefit lost). `SessionRepository.openFresh` catches the 23505 unique-violation and
    // recovers by returning the already-active session (race-safe double-open).
    // NB : colonnes via le param `table` (et non le `const`) pour éviter la self-réf circulaire TS7022 ; SQL identique.
    active_unique_idx:         uniqueIndex('gameplay_sessions_active_unique_idx').on(table.player_id).where(sql`${table.ended_at} IS NULL`),
    started_at_idx:            index('gameplay_sessions_started_at_idx').on(table.started_at.desc()),                                 // cross-players analytics (BO dashboard)
    check_decisions_made_pos:  check('gs_decisions_made_chk', sql`${table.decisions_made} >= 0`),
    check_exceptions_pos:      check('gs_exceptions_resolved_chk', sql`${table.exceptions_resolved} >= 0`),
    check_structural_pos:      check('gs_structural_commits_chk', sql`${table.structural_commits} >= 0`),
  }),
);

export const gameplaySessionRelations = relations(gameplaySessionRow, ({ one }) => ({
  player: one(player, {
    fields: [gameplaySessionRow.player_id],
    references: [player.player_id],
  }),
}));

// ===== Table 2 : admin_audit_log — GDD L416-426 verbatim =====
// PK simple audit_id uuid. Partitionnée PARTITION BY RANGE (occurred_at) mensuel — DDL §7.2 manuel.
// admin_user_id soft-ref StaffAccount 17 (NOT NULL — discipline applicative).
// target_player_id soft-ref Player nullable (override §1 — pas de FK day-1, peut cibler entité globale).
// target_entity_type varchar(64) GDD-verbatim ouvert (extensible cross-chunk Tasks 3-11).
// action_type pgEnum 7 membres UPPERCASE NEW (override §1 vs GDD varchar(64)).
// before_state / after_state jsonb + masking PII applicatif (§12 audit_pii_mask_enabled).
export const adminAuditLogRow = pgTable(
  'admin_audit_log',
  {
    audit_id:              uuid('audit_id').notNull().defaultRandom(),                                                               // GDD L417 + composite PK avec occurred_at (contrainte PG 16 partitioning RANGE) — déclarée plus bas via primaryKey()
    admin_user_id:         uuid('admin_user_id').notNull(),                                                                          // GDD L418 + override NOT NULL — soft-ref REUSE 17 StaffAccount.account_id (pas de FK day-1)
    action_type:           auditActionType('action_type').notNull(),                                                                 // GDD L419 + override pgEnum (vs varchar(64)) — 7 membres UPPERCASE NEW
    target_player_id:      uuid('target_player_id'),                                                                                 // GDD L420 verbatim « uuid null » — soft-ref Player nullable (pas de FK day-1)
    target_entity_type:    varchar('target_entity_type', { length: 64 }).notNull(),                                                  // GDD L421 verbatim varchar(64) — catalogue ouvert extensible cross-chunk
    target_entity_id:      uuid('target_entity_id'),                                                                                 // GDD L422 verbatim « uuid null » — soft-ref polymorphique (entité ciblée)
    before_state:          jsonb('before_state').notNull().default(sql`'{}'::jsonb`),                                                  // GDD L423 verbatim — état avant mutation ; GDPR mask applicatif §12
    after_state:           jsonb('after_state').notNull().default(sql`'{}'::jsonb`),                                                   // GDD L424 verbatim — état post mutation ; GDPR mask applicatif §12
    ticket_ref:            varchar('ticket_ref', { length: 64 }),                                                                    // GDD L425 verbatim « null » — ticket support externe optionnel
    occurred_at:           timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),                                  // GDD L426 + override timestamp → timestamptz + NOT NULL ; CLÉ PARTITION §7.2 + composante PK composite
  },
  (table) => ({
    // PK composite obligatoire pour partitioning RANGE PG 16 : la clé de partition (`occurred_at`)
    // DOIT figurer dans la PK (ou un UNIQUE). drizzle-kit generate produit `PRIMARY KEY ("audit_id", "occurred_at")`
    // depuis cette déclaration de contrainte de table — pattern Drizzle natif pour PK composite.
    pk_composite:              primaryKey({ columns: [table.audit_id, table.occurred_at] }),
    // Note Drizzle : la déclaration de partitionnement natif PG (`PARTITION BY RANGE`) n'est PAS supportée par
    // drizzle-kit generate ; les ATTACH/DETACH PARTITION + CREATE TABLE PARTITION + le `PARTITION BY RANGE`
    // sur le CREATE TABLE parent sont écrits manuellement dans la migration §7.3 (DDL autoritatif sur partitioning).
    // Les indexes ci-dessous sont déclarés sur la table parent ; PG les propage automatiquement aux
    // partitions (INDEX … ON PARENT → INDEX par partition).
    occurred_at_idx:           index('admin_audit_log_occurred_at_idx').on(table.occurred_at.desc()),                                 // hot path : audit by date (cohérent partitioning RANGE occurred_at)
    admin_user_idx:            index('admin_audit_log_admin_user_idx').on(table.admin_user_id, table.occurred_at.desc()),             // hot path : audit par staff (forensic per-actor)
    target_player_partial_idx: index('admin_audit_log_target_player_partial_idx').on(table.target_player_id, table.occurred_at.desc()).where(sql`${table.target_player_id} IS NOT NULL`),  // partial GDPR search per player ciblé (colonne via param `table` — anti self-réf TS7022)
    action_type_idx:           index('admin_audit_log_action_type_idx').on(table.action_type, table.occurred_at.desc()),              // hot path : audit par action_type (forensic per-action)
    target_entity_idx:         index('admin_audit_log_target_entity_idx').on(table.target_entity_type, table.target_entity_id),       // hot path : audit par entité ciblée (cross-chunk forensic)
  }),
);

// Note : aucune relation Drizzle `relations()` côté admin_audit_log day-1 :
// - admin_user_id soft-ref REUSE 17 (table accounts_staff PAS DDL ; promotion FK gap §16)
// - target_player_id soft-ref nullable (peut cibler entité globale ; promotion FK gap §16)
// - target_entity_id soft-ref polymorphique (incompatible avec target_entity_type ouvert)
// La relation back-ref côté Player (`auditEntries`) est purement filter code-side §5.3.

// ===== Types inférés Drizzle =====
// Note : seul le $inferSelect Row type est exporté (alignement Tasks 9/10/11 §Glossaire NEW —
// les variantes *Insert ne sont pas exposées au glossaire pour éviter le bruit ; les services
// persistance §11 acceptent des Partial<…Row> typés localement.)
export type GameplaySessionRow = typeof gameplaySessionRow.$inferSelect;
export type AdminAuditLogRow   = typeof adminAuditLogRow.$inferSelect;

// ===== Enum TS mirror PG natif =====
export type AuditActionTypeEnumTs = (typeof auditActionType.enumValues)[number];
// 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'EXPORT' | 'IMPERSONATE' | 'SIGNIN_AS'
