// IMPLEMENTS: docs/tech/09_data_model/schema_progression_structural.md§2 -- session:2026-06-02 --
//             EXTENDED P3-G C1 (mig 0137, 2026-07-20) — `possibility_horizon_cards`: enum member
//             'dismissed' + predicate_regressed/dismissed_at/surfaced_predicate_snapshot columns + the
//             R10 unique-pair index (subsumes the plain player_capability_idx). See
//             docs/tech/09_data_model/schema_progression_structural.md §"Extension P3-G" +
//             docs/superpowers/specs/2026-07-19-p3-G-budgets-horizon-design.md §3.
//             ★ mig 0138 (SAME commit, LOUD TDD-forced DD-G3 divergence — see 0137's own migration
//             header) extends the PRE-EXISTING `phc_view_status_adopted_at_chk` (mig 0008) to admit
//             'dismissed' — a hard PG one-tx restriction forces this into a SEPARATE file/transaction
//             from the ADD VALUE above; not mirrored in THIS Drizzle file (the original CHECK was never
//             Drizzle-mirrored either, ch09 Task 4 convention — raw-SQL-only for this table's CHECKs).
import {
  pgTable,
  uuid,
  integer,
  real,
  jsonb,
  boolean,
  timestamp,
  index,
  uniqueIndex,
  primaryKey,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { player } from './player';         // Task 3 — convention canonique FK player_id REUSE §5.1

// ===== Enums PG natifs =====
// constraint_severity — GDD L344 verbatim enum 3 membres lowercase
// (DDL-side ; le narratif 06 utilise UPPERCASE `MILD | MODERATE | BINDING` — distinction documentée §10)
export const constraintSeverity = pgEnum('constraint_severity', [
  'mild',
  'moderate',
  'binding',
]);

// possibility_card_view_status — GDD L354 verbatim enum 4 membres lowercase
// (état d'engagement visuel pré-adoption ; orthogonal au `HorizonCardStatusEnum` 06 owned 06)
// EXTENDED P3-G C1 (mig 0137, R1-DEFINITIVE): + 'dismissed' (D8 — data-inert v1, the vocab-tier
// capabilities are dismissible:false; the enum member is LIVE, the transition just has no v1 trigger).
export const possibilityCardViewStatus = pgEnum('possibility_card_view_status', [
  'unseen',
  'seen',
  'deferred',
  'adopted',
  'dismissed',
]);

// ===== Table 1 : constraint_log — GDD L340-348 verbatim =====
// PK simple constraint_id uuid. FK player_id NOT NULL CASCADE (Task 3 §5.2 ligne 384 catégorie « ProgressionStructural »).
// knot_id soft-ref uuid (nullable, pas de FK DB-side — gap §16 promotion Task 14+).
export const constraintLogRow = pgTable(
  'constraint_log',
  {
    constraint_id:    uuid('constraint_id').primaryKey().defaultRandom(),                                                        // GDD L341 — uuid primary key
    player_id:        uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),                   // GDD L341 + override NOT NULL — CASCADE Task 3 §5.2 ligne 384
    constraint_type:  integer('constraint_type').notNull(),                                                                       // GDD L342 — int raw catalogue ConstraintSourceEnum REUSE 06 (BO-only, projeté §8)
    affected_domain:  integer('affected_domain').notNull(),                                                                       // GDD L343 — int raw catalogue topology_domain REUSE 06 (BO-only)
    severity:         constraintSeverity('severity').notNull(),                                                                   // GDD L344 verbatim enum 3 membres lowercase
    added_at:         timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),                                       // GDD L345 + override NOT NULL + DEFAULT now()
    knot_id:          uuid('knot_id'),                                                                                            // GDD L346 verbatim « null if not part of detected knot » — soft-ref pas de FK day-1
  },
  (table) => ({
    player_idx:           index('constraint_log_player_idx').on(table.player_id),
    player_added_idx:     index('constraint_log_player_added_idx').on(table.player_id, table.added_at),
    player_severity_idx:  index('constraint_log_player_severity_idx').on(table.player_id, table.severity),
    player_knot_idx:      index('constraint_log_player_knot_idx').on(table.player_id, table.knot_id),                             // hot path : « active knot » detection scan
  }),
);

export const constraintLogRelations = relations(constraintLogRow, ({ one }) => ({
  player: one(player, {
    fields: [constraintLogRow.player_id],
    references: [player.player_id],
  }),
}));

// ===== Table 2 : possibility_horizon_cards — GDD L350-356 verbatim =====
// PK simple card_id uuid. FK player_id NOT NULL CASCADE.
// view_status pgEnum natif 5 membres (4 GDD-verbatim + 'dismissed' P3-G C1, mig 0137).
// EXTENDED P3-G C1 (mig 0137, design §3): + predicate_regressed/dismissed_at/surfaced_predicate_snapshot.
export const possibilityHorizonCardRow = pgTable(
  'possibility_horizon_cards',
  {
    card_id:        uuid('card_id').primaryKey().defaultRandom(),                                                                // GDD L351 — uuid primary key
    player_id:      uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),                     // GDD L351 + override NOT NULL — CASCADE
    capability_id:  integer('capability_id').notNull(),                                                                            // GDD L352 — int raw catalogue capability REUSE 06 (BO-only, surface joueur via mapping projection §8)
    surfaced_at:    timestamp('surfaced_at', { withTimezone: true }).notNull().defaultNow(),                                       // GDD L353 + override NOT NULL + DEFAULT now()
    view_status:    possibilityCardViewStatus('view_status').notNull().default('unseen'),                                         // GDD L354 verbatim enum 5 membres lowercase (P3-G C1: + 'dismissed'), default 'unseen' à la surface
    adopted_at:     timestamp('adopted_at', { withTimezone: true }),                                                               // GDD L355 — nullable (GDD-verbatim « null »)
    // P3-G C1 (mig 0137, design §3) — D6 regression overlay, orthogonal to view_status (a DEFERRED card
    // can regress — canon's own "reste visible comme signal" is a flag, not a terminal state).
    predicate_regressed:            boolean('predicate_regressed').notNull().default(false),
    // P3-G C1 (mig 0137, design §3) — D8 write-once at dismiss (data-inert v1, the vocab-tier
    // capabilities are dismissible:false — the enum member is live, this column has no v1 writer).
    dismissed_at:                   timestamp('dismissed_at', { withTimezone: true }),
    // P3-G C1 (mig 0137, design §3) — the canon CapabilityHorizonSurfacedEvent.predicate_snapshot,
    // persisted for the BO "why did this surface" diagnostic (divergence #14).
    surfaced_predicate_snapshot:    jsonb('surfaced_predicate_snapshot').notNull().default(sql`'{}'::jsonb`),
  },
  (table) => ({
    player_idx:                index('possibility_horizon_cards_player_idx').on(table.player_id),
    player_view_status_idx:    index('possibility_horizon_cards_player_view_status_idx').on(table.player_id, table.view_status),
    // P3-G C1 (mig 0137, R10-DEFINITIVE) — REPLACES the plain player_capability_idx (mig 0007): SAME
    // columns, now UNIQUE. The C3 INSERT-if-absent surfacing's race-freedom guarantee (design §7.3),
    // mirrors the gameplay_sessions_active_partial_idx -> _unique_idx subsumption (mig 0121) verbatim.
    player_capability_unique_idx: uniqueIndex('possibility_horizon_cards_player_capability_unique_idx').on(table.player_id, table.capability_id),
    player_surfaced_idx:       index('possibility_horizon_cards_player_surfaced_idx').on(table.player_id, table.surfaced_at),
  }),
);

export const possibilityHorizonCardRelations = relations(possibilityHorizonCardRow, ({ one }) => ({
  player: one(player, {
    fields: [possibilityHorizonCardRow.player_id],
    references: [player.player_id],
  }),
}));

// ===== Table 3 : recurrence_logs — GDD L358-364 verbatim =====
// PK composite (player_id, category_id) — GDD L364 verbatim.
// histogram jsonb (12 buckets verbatim GDD L361 — rolling 30-session REUSE T.meta.recurrence_window_sessions).
// momentum_gauge float [0..1] BO-only (projeté MomentumGaugeBucket §8).
export const recurrenceLogRow = pgTable(
  'recurrence_logs',
  {
    player_id:         uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),                   // GDD L359 + override NOT NULL — CASCADE
    category_id:       integer('category_id').notNull(),                                                                            // GDD L360 — int raw catalogue task_categories REUSE 06
    histogram:         jsonb('histogram').notNull().default(sql`'[]'::jsonb`),                                                      // GDD L361 — rolling 30-session × 12 buckets (REUSE RecurrenceHistogramComposite 06)
    last_updated_at:   timestamp('last_updated_at', { withTimezone: true }).notNull().defaultNow(),                                 // GDD L362 + override NOT NULL + DEFAULT now()
    momentum_gauge:    real('momentum_gauge').notNull().default(0),                                                                 // GDD L363 — float [0..1] BO-only (MomentumGaugeComposite.fill_level REUSE 06)
  },
  (table) => ({
    pk:                       primaryKey({ columns: [table.player_id, table.category_id] }),                                       // GDD L364 verbatim PK composite
    player_idx:               index('recurrence_logs_player_idx').on(table.player_id),                                              // filtre liste cross-categories
    player_updated_idx:       index('recurrence_logs_player_updated_idx').on(table.player_id, table.last_updated_at),               // tri récence pour daily-tick batch
  }),
);

export const recurrenceLogRelations = relations(recurrenceLogRow, ({ one }) => ({
  player: one(player, {
    fields: [recurrenceLogRow.player_id],
    references: [player.player_id],
  }),
}));

// ===== Table 4 : structural_decisions_audit — GDD L366-377 verbatim =====
// PK simple decision_id uuid. FK player_id NOT NULL CASCADE.
// before_state / after_state jsonb (snapshots BO-only).
// triggered_extinction / triggered_recall_debt bool default false (GDD-verbatim).
export const structuralDecisionAuditRow = pgTable(
  'structural_decisions_audit',
  {
    decision_id:               uuid('decision_id').primaryKey().defaultRandom(),                                                  // GDD L370 — uuid primary key
    player_id:                 uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'cascade' }),           // GDD L371 + override NOT NULL — CASCADE
    decision_type:             integer('decision_type').notNull(),                                                                  // GDD L372 — int raw catalogue REUSE 06 (BO-only)
    decided_at:                timestamp('decided_at', { withTimezone: true }).notNull().defaultNow(),                              // GDD L373 + override NOT NULL + DEFAULT now()
    before_state:              jsonb('before_state').notNull().default(sql`'{}'::jsonb`),                                            // GDD L374 — snapshot avant (BO-only, P5)
    after_state:               jsonb('after_state').notNull().default(sql`'{}'::jsonb`),                                              // GDD L375 — snapshot après (BO-only, P5)
    triggered_extinction:      boolean('triggered_extinction').notNull().default(false),                                              // GDD L376 verbatim bool default false
    triggered_recall_debt:     boolean('triggered_recall_debt').notNull().default(false),                                              // GDD L377 verbatim bool default false
  },
  (table) => ({
    player_idx:               index('structural_decisions_audit_player_idx').on(table.player_id),
    player_decided_idx:       index('structural_decisions_audit_player_decided_idx').on(table.player_id, table.decided_at),
    player_type_idx:          index('structural_decisions_audit_player_type_idx').on(table.player_id, table.decision_type),
    // Partial indexes — filtres BO hot (analytics extinction / recall_debt).
    // NB : colonnes via le param `table` (et non le `const`) pour éviter la self-réf circulaire TS7022 ; SQL identique.
    extinction_partial_idx:   index('structural_decisions_audit_extinction_partial_idx').on(table.player_id, table.decided_at).where(sql`${table.triggered_extinction} = true`),
    recall_debt_partial_idx:  index('structural_decisions_audit_recall_debt_partial_idx').on(table.player_id, table.decided_at).where(sql`${table.triggered_recall_debt} = true`),
  }),
);

export const structuralDecisionAuditRelations = relations(structuralDecisionAuditRow, ({ one }) => ({
  player: one(player, {
    fields: [structuralDecisionAuditRow.player_id],
    references: [player.player_id],
  }),
}));

// ===== Types inférés Drizzle =====
// Note : seuls les `$inferSelect` Row types sont exportés (alignement Task 9 § Glossaire NEW —
// les variantes `*Insert` ne sont pas exposées au glossaire pour éviter le bruit ; les
// services persistance §11 acceptent des `Partial<…Row>` typés localement.)
export type ConstraintLogRow                  = typeof constraintLogRow.$inferSelect;
export type PossibilityHorizonCardRow         = typeof possibilityHorizonCardRow.$inferSelect;
export type RecurrenceLogRow                  = typeof recurrenceLogRow.$inferSelect;
export type StructuralDecisionAuditRow        = typeof structuralDecisionAuditRow.$inferSelect;

// ===== Enum TS mirrors PG natif =====
export type ConstraintSeverityEnumTs           = (typeof constraintSeverity.enumValues)[number];  // 'mild' | 'moderate' | 'binding'
export type PossibilityCardViewStatusEnum      = (typeof possibilityCardViewStatus.enumValues)[number];  // 'unseen' | 'seen' | 'deferred' | 'adopted' | 'dismissed' (P3-G C1)
