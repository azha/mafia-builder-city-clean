// IMPLEMENTS: docs/tech/09_data_model/schema_telemetry_event.md§2 -- session:2026-06-02 --
import {
  pgTable,
  uuid,
  integer,
  text,
  varchar,
  jsonb,
  timestamp,
  index,
  pgEnum,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { player } from './player';         // Task 3 — convention FK player_id REUSE §5

// ===== Enums PG natifs (matérialisent les enums owned ch20 — membres REUSE verbatim) =====
// event_domain — REUSE forme EventDomainEnum (event_catalog.md §7) — 5 membres UPPERCASE
export const eventDomain = pgEnum('event_domain', [
  'PLAYER',
  'GAMEPLAY',
  'ECONOMY',
  'SOCIAL',
  'TECHNICAL',
]);

// event_privacy_class — REUSE forme EventPrivacyClass (telemetry_principles.md §7) — 2 membres
export const eventPrivacyClass = pgEnum('event_privacy_class', [
  'PII',
  'ANONYMOUS',
]);

// ===== Table : telemetry_event — forme owned ch20 event_catalog.md §7 (re-listée pour DDL persistence) =====
// Append-only (REVOKE UPDATE, DELETE §3). Partitionnée PARTITION BY RANGE (occurred_at) mensuel — DDL §7.3 manuel.
// FK player_id SET NULL (anonymize-not-cascade — override §1/§5.2 vs RESTRICT ch20).
// payload jsonb borné T.telemetry.event_payload_max_bytes (REUSE ch20) ; AUCUNE PII civile (minimisation ch20 §2.4).
export const telemetryEventRow = pgTable(
  'telemetry_event',
  {
    event_id:        uuid('event_id').notNull().defaultRandom(),                                              // forme ch20 `event_id UUID PK` — composante PK composite (contrainte PG 16 partitioning RANGE)
    name:            varchar('name', { length: 128 }).notNull(),                                              // forme ch20 `name text` — namespace evt.<domain>.<action> (grammaire owned T4) ; varchar(128) borné (REUSE catalogue ch20)
    domain:          eventDomain('domain').notNull(),                                                         // forme ch20 `domain EventDomainEnum` — pgEnum matérialisé (5 membres REUSE)
    schema_version:  integer('schema_version').notNull().default(1),                                          // forme ch20 `schema_version integer` (event_catalog.md §2.6 — versioning owned T4 ; démarre à 1)
    player_id:       uuid('player_id').references(() => player.player_id, { onDelete: 'set null' }),           // forme ch20 `player_id uuid NULLABLE` — FK SET NULL anonymize (override §5.2) ; présent ssi privacy_class = PII
    occurred_at:     timestamp('occurred_at', { withTimezone: true }).notNull(),                              // forme ch20 `occurred_at timestamptz` (serveur) — CLÉ PARTITION RANGE §7.3 + composante PK composite ; ré-horodaté serveur (REUSE 13)
    payload:         jsonb('payload').notNull().default(sql`'{}'::jsonb`),                                     // forme ch20 `payload jsonb` — borné T.telemetry.event_payload_max_bytes (REUSE ch20) ; AUCUNE PII civile
    privacy_class:   eventPrivacyClass('privacy_class').notNull(),                                            // forme ch20 `privacy_class EventPrivacyClass` — pgEnum matérialisé (2 membres REUSE)
    consent_scope:   jsonb('consent_scope'),                                                                  // forme ch20 `consent_scope jsonb NULLABLE` — projection TelemetryConsentScope au moment ingestion (REUSE ch20 ; absent = event d'intérêt légitime hors gate)
    ingested_at:     timestamp('ingested_at', { withTimezone: true }).notNull().defaultNow(),                 // forme ch20 `ingested_at timestamptz` — horodatage serveur d'ingestion (distinct d'occurred_at)
  },
  (table) => ({
    // PK composite obligatoire pour partitioning RANGE PG 16 : la clé de partition (occurred_at) DOIT
    // figurer dans la PK. drizzle-kit generate produit `PRIMARY KEY ("event_id", "occurred_at")`.
    // event_id reste globalement unique en pratique via defaultRandom() (idempotence d'ingestion ch20 §2.2).
    pk_composite:        primaryKey({ columns: [table.event_id, table.occurred_at] }),
    // Note Drizzle : `PARTITION BY RANGE` + CREATE TABLE PARTITION écrits manuellement dans la migration §7.3.
    // Indexes déclarés sur la table parent ; PG les propage aux partitions (INDEX … ON PARENT).
    occurred_at_idx:     index('telemetry_event_occurred_at_idx').on(table.occurred_at.desc()),                                                     // hot path : scan fenêtré (cohérent partition pruning RANGE occurred_at)
    domain_occurred_idx: index('telemetry_event_domain_occurred_idx').on(table.domain, table.occurred_at.desc()),                                   // hot path : events d'un domaine sur une fenêtre (agrégat par domaine)
    name_occurred_idx:   index('telemetry_event_name_occurred_idx').on(table.name, table.occurred_at.desc()),                                       // hot path : events d'un nom (evt.<domain>.<action>) sur une fenêtre (funnel/KPI par event)
    player_partial_idx:  index('telemetry_event_player_partial_idx').on(table.player_id, table.occurred_at.desc()).where(sql`${table.player_id} IS NOT NULL`), // partial : GDPR search + fetch raw per-player ciblé (colonne via param `table` — anti self-réf TS7022 ; >40% events ANONYMOUS sans player_id — pas indexés)
    privacy_class_idx:   index('telemetry_event_privacy_class_idx').on(table.privacy_class, table.occurred_at.desc()),                              // hot path : purge par classe (PII vs ANONYMOUS rétention distincte §7.4)
  }),
);

// Note : aucune relation Drizzle `relations()` côté telemetry_event :
// - player_id est SET NULL (anonymize-not-cascade) — pas de back-ref Player utile (un event anonyme n'a plus de player).
//   Une relation code-side `one(player)` reste possible côté lecture BO mais N'est PAS DB-enforced au-delà du FK SET NULL.

// ===== Type inféré Drizzle =====
export type TelemetryEventRow = typeof telemetryEventRow.$inferSelect;

// ===== Enums TS mirror PG natifs (matérialisent les enums owned ch20) =====
export type EventDomainEnumTs       = (typeof eventDomain.enumValues)[number];        // 'PLAYER' | 'GAMEPLAY' | 'ECONOMY' | 'SOCIAL' | 'TECHNICAL' (REUSE forme ch20)
export type EventPrivacyClassEnumTs = (typeof eventPrivacyClass.enumValues)[number];  // 'PII' | 'ANONYMOUS' (REUSE forme ch20)
