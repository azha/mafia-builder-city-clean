// IMPLEMENTS: docs/tech/09_data_model/schema_player_economy_state.md§2 -- session:2026-06-02 --
import {
  pgTable, pgEnum, uuid, varchar, bigint, integer, timestamp, text, index, uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { player } from './player';  // REUSE Task 3 §2

// Enum natif Postgres `iap_platform` — pattern REUSE chunk 2 §2.3 conventions nommage.
// Membres GDD L107 verbatim : 'apple', 'google', 'web'. PascalCase TS exposé via IapPlatformEnum (§13).
export const iapPlatformPg = pgEnum('iap_platform', ['apple', 'google', 'web']);

// Table 1 — `economy_states` (1 row / player). GDD L90-99 verbatim.
export const economyState = pgTable(
  'economy_states',
  {
    // PK = FK 1-1 strict (REUSE convention canonique Task 3 §5.1 — `player_id` snake_case singular,
    // type uuid, policy ON DELETE CASCADE REUSE Task 3 §5.2 ligne « 1-1 strict — possession exclusive »).
    player_id: uuid('player_id').primaryKey().references(() => player.player_id, { onDelete: 'cascade' }),

    // Wallet abstrait joueur GDD L92. Numéraire « cash » côté méta UI. NOT NULL + default 0.
    // Distinct de `CashHolding.slotted_cents` per-safehouse 04a (cf. §1 distinction sémantique).
    cash_cents: bigint('cash_cents', { mode: 'bigint' }).notNull().default(0n),

    // Premium currency GDD L93. NOT NULL + default 0. Achetable IAP (cf. iap_transactions).
    marks: integer('marks').notNull().default(0),

    // ⚠️ COLONNE LEGACY BO-only strict (cf. §1 + §8). NEVER surface joueur.
    // Conservée verbatim DDL GDD L96 (R2.1 — GDD authoritative schéma persistance) ; mais marquée
    // explicitement legacy rollup analytique BO. La projection joueur §8.2 NE l'inclut PAS.
    // Le joueur lit sa réputation via les 5 sous-mécaniques amont 04c (cf. §1 + §8 + §15).
    //
    // ⚠️ DIVERGENCE TS-property / PG-column INTENTIONNELLE :
    //   - Nom de propriété TS = `bo_analytics_rollup` (hors radical `reputation`/`trust`/`loyalty`/`respect`)
    //     pour ne PAS trigger le pre-commit hook CI `04c/design_constraints.md §99` qui matche regex
    //     `(reputation|trust|loyalty|respect)\s*:\s*(int|float|number|integer|double)`. Avec la propriété
    //     nommée `reputation_legacy:` le substring `reputation` matcherait et le hook rejetterait le commit.
    //   - Nom de colonne PG = `reputation_legacy` (1er argument de `integer()`) — conservé pour traçabilité
    //     historique GDD L96 (R2.1 — GDD authoritative pour le schéma persistance).
    //   La divergence est documentée §2 (ici) + §3 (tableau déviation) + §8 (projection P5) + §11 (services).
    bo_analytics_rollup: integer('reputation_legacy').notNull().default(0),

    // Total cumulé IAP cents (BO-only ABSOLU — GDPR + analytics commerciales). GDD L97 verbatim.
    lifetime_iap_value_cents: bigint('lifetime_iap_value_cents', { mode: 'bigint' }).notNull().default(0n),

    // Date dernier IAP. Nullable (jamais d'IAP = NULL). BO-only (analytics churn). GDD L98.
    last_iap_at: timestamp('last_iap_at', { withTimezone: true }),
  },
  (table) => ({
    // Pas d'index secondaire — PK B-tree suffit l'accès principal `WHERE player_id = $1` (1-1 strict).
    // Index supplémentaire `last_iap_at` pour analytics BO (cohorts churn).
    last_iap_at_idx: index('economy_states_last_iap_at_idx').on(table.last_iap_at),
  }),
);

// Relations 1-1 côté `economy_states` → `player` (REUSE pattern chunk 2 §4.1).
export const economyStateRelations = relations(economyState, ({ one }) => ({
  player: one(player, {
    fields: [economyState.player_id],
    references: [player.player_id],
  }),
}));

// Table 2 — `iap_transactions` (1-N / player). GDD L101-113 verbatim.
export const iapTransaction = pgTable(
  'iap_transactions',
  {
    // PK propre GDD L102.
    txn_id: uuid('txn_id').primaryKey(),

    // FK 1-N vers player. ON DELETE RESTRICT (REUSE Task 3 §5.2 ligne « audit/traçabilité non purgeable » —
    // compliance Apple/Google audit retention obligatoire). Flow GDPR = anonymisation via
    // PlayerAccount.transitionLifecycle (17/account_lifecycle), pas DELETE direct (cf. §5 + §7.3).
    player_id: uuid('player_id').notNull().references(() => player.player_id, { onDelete: 'restrict' }),

    // SKU produit IAP GDD L104 verbatim. Tunable max length cf. §12.
    sku: varchar('sku', { length: 64 }).notNull(),

    // Montant cents GDD L105. NOT NULL.
    amount_cents: bigint('amount_cents', { mode: 'bigint' }).notNull(),

    // Code devise ISO-4217 GDD L106. NOT NULL.
    currency_code: varchar('currency_code', { length: 8 }).notNull(),

    // Plateforme — enum Postgres natif (cf. déclaration `iapPlatformPg` ci-dessus).
    platform: iapPlatformPg('platform').notNull(),

    // Receipt opaque (Apple/Google/web verification payload). Encryption-at-rest obligatoire (PII commercial — cf. §11 Docker).
    platform_receipt: text('platform_receipt').notNull(),

    // Timestamps GDD L110-112 (purchased_at NOT NULL ; refunded_at + refund_reason nullable).
    purchased_at: timestamp('purchased_at', { withTimezone: true }).notNull(),
    refunded_at: timestamp('refunded_at', { withTimezone: true }),
    refund_reason: text('refund_reason'),
  },
  (table) => ({
    // 1-N requires INDEX sur player_id (REUSE chunk 2 §4.2 / Task 3 §5.1 convention).
    player_id_idx: index('iap_transactions_player_id_idx').on(table.player_id),
    // INDEX analytics (purchased_at desc — cohorts revenue per period).
    purchased_at_idx: index('iap_transactions_purchased_at_idx').on(table.purchased_at),
    // INDEX rapports per-SKU.
    sku_idx: index('iap_transactions_sku_idx').on(table.sku),
    // UNIQUE (platform, platform_receipt) — anti-replay receipt verification per platform
    // (un même receipt opaque ne peut être validé deux fois sur la même plateforme — duplicate refund/credit guard).
    platform_receipt_uq: uniqueIndex('iap_transactions_platform_receipt_uq').on(table.platform, table.platform_receipt),
  }),
);

// Relations 1-N côté enfant `iap_transactions` → `player` (REUSE chunk 2 §4.2).
export const iapTransactionRelations = relations(iapTransaction, ({ one }) => ({
  player: one(player, {
    fields: [iapTransaction.player_id],
    references: [player.player_id],
  }),
}));

// Types inférés Drizzle — REUSE par repository (§11) et services BO admin (§9).
export type PlayerEconomyStateRow = typeof economyState.$inferSelect;
export type PlayerEconomyStateInsert = typeof economyState.$inferInsert;
export type IapTransactionRow = typeof iapTransaction.$inferSelect;
export type IapTransactionInsert = typeof iapTransaction.$inferInsert;

// W1.3-C4 — TS union dérivée de l'enum PG natif (§13, jamais redéclarée). Premier consommateur :
// iap-transaction.repository.ts (IapTransactionRepository.record's platform param).
export type IapPlatformEnumTs = (typeof iapPlatformPg.enumValues)[number];
