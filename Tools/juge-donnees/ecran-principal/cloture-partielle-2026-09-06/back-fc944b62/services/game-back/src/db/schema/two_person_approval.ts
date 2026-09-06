// IMPLEMENTS: docs/tech/17_auth_and_accounts/authorization_rbac.md §Two-person rule (:134-159)
//             + R-RBAC-3 (:245) « TwoPersonApproval initiator ≠ approver, toujours »
//             + R-RBAC-6 (:248) toute action `staff.*` génère un AuditEvent
//             -- W1.2-a (2026-09-02), docs/superpowers/specs/2026-09-02-w12a-two-person-perimetre.md --
//
// Avant ce lot, ce workflow n'existait sous AUCUNE forme : mesuré, 183 `pgTable` déclarées dans
// `services/**`, dont zéro dont le nom porte `approv`/`two`/`person`. Les colonnes
// `two_person_approval_id` d'`anti_cheat.ts:69,98` et de `tunable_overrides.ts:9` étaient des
// soft-refs pointant vers une table absente.
//
// ⛔ LA PROPRIÉTÉ QUE CE FICHIER DOIT RENDRE IMPOSSIBLE — et pourquoi elle est en BASE, pas en code.
//    « Un opérateur approuve sa propre proposition » est LE défaut que le two-person existe pour
//    empêcher. Une garde écrite dans le service ne protège que les appelants qui passent par le
//    service : le jour où un lot voisin écrit une ligne par un autre chemin (un seeder, une route
//    d'administration, une migration de données), la propriété est perdue sans que rien ne rougisse.
//    Le CHECK `two_person_approval_distinct_ck` la rend **inexprimable en base**.
//
//    Le monde dégénéré que ce seul CHECK laisserait passer a été nommé AVANT d'être fermé :
//    `approver_account_id IS NULL` avec `state = 'APPROVED'` — approuvé par PERSONNE. Un CHECK qui
//    n'observe que la DISTINCTION est vrai dans ce monde-là. C'est `two_person_approval_state_ck`
//    qui le ferme, en liant l'état à la présence de l'approbateur et de l'horodatage de décision.
//    (Le socle appelle ça durcir sur la bonne GRANDEUR : « distincts » est une propriété de la
//    paire, « approuvé par quelqu'un » est une propriété de la PRÉSENCE — deux mesures, deux CHECK.)
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// ===== Enum PG natif =====
// REUSE VERBATIM des 5 membres de `authorization_rbac.md:151` — aucune re-déclaration conceptuelle.
export const twoPersonState = pgEnum('two_person_state', [
  'AWAITING_SECOND', // requête émise par A, en attente d'un second opérateur
  'APPROVED', //        B a approuvé — l'approbation est valide jusqu'à `expires_at`
  'DECLINED', //        B a refusé — terminal
  'EXPIRED', //         `expires_at` dépassé sans décision — terminal
  'CONSUMED', //        l'approbation a servi UNE fois (`:142` usage unique) — terminal
]);

export const twoPersonApprovalRow = pgTable(
  'two_person_approval',
  {
    approval_id: uuid('approval_id').primaryKey().defaultRandom(), // ch17 `approval_id: UUID`
    // Soft-ref `StaffAccount.account_id` — patron maison MESURÉ : `staff_account` n'est la cible
    // d'AUCUNE FK dans les 152 migrations (`admin_audit_log.admin_user_id` fait pareil). On ne
    // change pas cette politique dans un lot qui ne la traite pas.
    initiator_account_id: uuid('initiator_account_id').notNull(), // ch17 `initiator_account_id` (staff A)
    approver_account_id: uuid('approver_account_id'), //             ch17 `approver_account_id | null` (staff B)
    permission_key: varchar('permission_key', { length: 128 }).notNull(), // ch17 `permission_key: PermissionKey`
    // ch17 `target_ref: ResourceRef` — matérialisé par le couple type+id, REUSE de la forme déjà
    // livrée par `admin_audit_log` (`sessions_and_audit.ts:45-46`) plutôt qu'un type neuf. L'id est
    // nullable comme chez son précédent : toute cible n'a pas une identité uuid (une clé de tunable
    // pointée, par exemple).
    target_entity_type: varchar('target_entity_type', { length: 64 }).notNull(),
    target_entity_id: uuid('target_entity_id'),
    state: twoPersonState('state').notNull().default('AWAITING_SECOND'), // ch17 `state: TwoPersonStateEnum`
    requested_at: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(), // ch17 `requested_at`
    decided_at: timestamp('decided_at', { withTimezone: true }), //                            ch17 `decided_at | null`
    // ch17 `expires_at = requested_at + T.auth.two_person_approval_ttl_min`. La valeur vient du
    // registre de tunables — jamais un littéral ici, et jamais un `defaultNow() + interval` en DDL
    // qui figerait le TTL dans le schéma et le rendrait non pilotable.
    expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumed_at: timestamp('consumed_at', { withTimezone: true }), //                          ch17 `consumed_at | null`
  },
  (table) => ({
    // hot path : la file d'attente `GET /admin/twoperson/pending`, la plus lue des trois routes.
    pending_idx: index('two_person_approval_pending_idx').on(table.state, table.requested_at.desc()),
    // hot path : le plafond `T.auth.two_person_max_pending_per_initiator` se compte par initiateur.
    initiator_idx: index('two_person_approval_initiator_idx').on(
      table.initiator_account_id,
      table.state,
    ),
    // hot path : « cette action a-t-elle une approbation valide ? », la question que pose l'exécution.
    context_idx: index('two_person_approval_context_idx').on(
      table.permission_key,
      table.target_entity_type,
      table.target_entity_id,
    ),
    // ⛔ UNE SEULE requête en attente par contexte (`:142` usage unique pour le contexte). Sans cet
    //    index, A peut empiler N requêtes identiques et faire approuver la plus commode : l'unicité
    //    de l'approbation serait une propriété du code, donc perdue au premier appelant distrait.
    //    Index PARTIEL : les états terminaux doivent pouvoir coexister en historique (compliance).
    // ⚠️ DIVERGENCE ASSUMÉE ENTRE CE MIROIR TS ET LA DDL. La migration porte `NULLS NOT DISTINCT`,
    //    sans quoi deux requêtes en attente dont la cible n'a pas d'uuid passeraient toutes deux
    //    (Postgres traite deux NULL comme distincts par défaut). drizzle-orm 0.36.4 n'expose
    //    `nullsNotDistinct` que sur une contrainte UNIQUE de table, jamais sur un index PARTIEL :
    //    la clause n'est donc pas exprimable ici. **La DDL fait foi**, et c'est un TEST contre la
    //    base réelle qui le prouve — un commentaire ne rougit jamais.
    pending_context_uq: uniqueIndex('two_person_approval_pending_context_uq')
      .on(
        table.initiator_account_id,
        table.permission_key,
        table.target_entity_type,
        table.target_entity_id,
      )
      .where(sql`${table.state} = 'AWAITING_SECOND'`),
  }),
);

export const twoPersonApprovalRelations = relations(twoPersonApprovalRow, () => ({
  // Aucune relation Drizzle : `initiator_account_id` / `approver_account_id` sont des soft-refs
  // (voir plus haut), et déclarer une relation vers une table qu'aucune FK ne lie fabriquerait une
  // garantie que la base ne porte pas.
}));

/** Longueurs des colonnes bornées — UNE source pour la DDL et pour la garde d'entrée.
 *  Une borne recopiée à la main dans un contrôleur survit à l'élargissement de sa colonne et se met
 *  à refuser du légitime ; dérivée d'ici, elle suit. (Classe TD-420 : sans garde, un dépassement
 *  remonte en `500 INTERNAL_ERROR` dont le corps ne nomme ni la colonne ni la longueur.) */
export const TWO_PERSON_PERMISSION_KEY_MAXLEN = 128;
export const TWO_PERSON_TARGET_ENTITY_TYPE_MAXLEN = 64;

export type TwoPersonApprovalRow = typeof twoPersonApprovalRow.$inferSelect;
export type TwoPersonStateEnumTs = (typeof twoPersonState.enumValues)[number];

/** Les 3 états terminaux — une approbation dans l'un d'eux ne peut plus rien autoriser. */
export const TWO_PERSON_TERMINAL_STATES = [
  'DECLINED',
  'EXPIRED',
  'CONSUMED',
] as const satisfies readonly TwoPersonStateEnumTs[];
