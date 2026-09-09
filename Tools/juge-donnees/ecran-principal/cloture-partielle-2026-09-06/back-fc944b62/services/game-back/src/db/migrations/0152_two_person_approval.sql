-- migration 0152: two_person_approval (W1.2-a)
-- Spec normative: docs/tech/17_auth_and_accounts/authorization_rbac.md §Two-person rule (:134-159)
-- Périmètre:      docs/superpowers/specs/2026-09-02-w12a-two-person-perimetre.md
--
-- ⛔ CE QUE CETTE MIGRATION CRÉE, ET POURQUOI ELLE N'EST PAS UN SIMPLE CREATE TABLE.
--    Mesuré avant d'écrire : 183 `pgTable` déclarées dans `services/**`, dont ZÉRO dont le nom
--    porte `approv`/`two`/`person`. Trois colonnes de production pointaient déjà, en soft-ref,
--    vers cette table absente (`anti_cheat.ts:69,98`, `tunable_overrides.ts:9`). La table
--    n'existait pas : ce n'est pas la forme A du socle (« la ligne n'a aucun écrivain »), c'est
--    un cran en deçà.
--
-- ⛔ LES DEUX CHECK SONT LE CŒUR DU LOT, PAS DE LA DÉCORATION.
--    `..._distinct_ck` : R-RBAC-3 (`authorization_rbac.md:245`) rendue INEXPRIMABLE en base. Une
--    garde équivalente écrite dans le service ne protégerait que les appelants qui passent par le
--    service — un seeder, une route d'administration ou une migration de données futures la
--    contourneraient sans que rien ne rougisse.
--
--    `..._state_ck` ferme le monde dégénéré que le premier laisse passer, nommé AVANT d'être
--    fermé : `approver_account_id IS NULL` avec `state = 'APPROVED'` — approuvé par PERSONNE.
--    « Les deux comptes sont distincts » est une propriété de la PAIRE ; « quelqu'un a approuvé »
--    est une propriété de la PRÉSENCE. Une seule contrainte ne peut pas porter les deux, et
--    durcir la première n'aurait jamais atteint la seconde.
--
-- ⛔ CE QUE CETTE MIGRATION NE FAIT PAS. Elle ne touche à aucune des 37 routes de TD-107 : celles-ci
--    continuent de porter leur marqueur de déferral après ce lot, et leur claim reste vraie. Elle
--    n'ajoute AUCUN membre à `audit_action_type` (les 7 membres de `0010:6` sont inchangés) — la
--    divergence avec les deux types nommés par le canon est consignée en dette, pas masquée.
--
-- Additive seulement : un CREATE TYPE, un CREATE TABLE, quatre index. Aucune table existante n'est
-- lue, modifiée ni contrainte.

CREATE TYPE "two_person_state" AS ENUM ('AWAITING_SECOND', 'APPROVED', 'DECLINED', 'EXPIRED', 'CONSUMED');
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "two_person_approval" (
  "approval_id"          uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Soft-ref StaffAccount.account_id : politique maison MESURÉE — `staff_account` n'est la cible
  -- d'aucune FK dans les 152 migrations antérieures (`admin_audit_log.admin_user_id` fait pareil).
  "initiator_account_id" uuid              NOT NULL,
  "approver_account_id"  uuid,
  "permission_key"       varchar(128)      NOT NULL,
  -- ResourceRef matérialisé par le couple type+id — REUSE de la forme d'`admin_audit_log`
  -- (`0010_sessions_and_audit.sql`), pas un type neuf.
  "target_entity_type"   varchar(64)       NOT NULL,
  "target_entity_id"     uuid,
  "state"                two_person_state  NOT NULL DEFAULT 'AWAITING_SECOND',
  "requested_at"         timestamptz       NOT NULL DEFAULT now(),
  "decided_at"           timestamptz,
  -- Le TTL vient du registre de tunables (`T.auth.two_person_approval_ttl_min`) et JAMAIS d'un
  -- `now() + interval` en DDL, qui le figerait dans le schéma et le rendrait non pilotable.
  "expires_at"           timestamptz       NOT NULL,
  "consumed_at"          timestamptz,

  -- R-RBAC-3 : initiator ≠ approver, TOUJOURS.
  CONSTRAINT "two_person_approval_distinct_ck"
    CHECK ("approver_account_id" IS NULL OR "approver_account_id" <> "initiator_account_id"),

  -- Cohérence état ↔ présence. Ferme « APPROVED par personne » et « CONSUMED jamais décidé ».
  CONSTRAINT "two_person_approval_state_ck" CHECK (
    ("state" = 'AWAITING_SECOND' AND "approver_account_id" IS NULL     AND "decided_at" IS NULL     AND "consumed_at" IS NULL)
 OR ("state" = 'EXPIRED'         AND "consumed_at" IS NULL)
 OR ("state" IN ('APPROVED', 'DECLINED')
                                 AND "approver_account_id" IS NOT NULL AND "decided_at" IS NOT NULL AND "consumed_at" IS NULL)
 OR ("state" = 'CONSUMED'        AND "approver_account_id" IS NOT NULL AND "decided_at" IS NOT NULL AND "consumed_at" IS NOT NULL)
  )
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "two_person_approval_pending_idx"
  ON "two_person_approval" ("state", "requested_at" DESC);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "two_person_approval_initiator_idx"
  ON "two_person_approval" ("initiator_account_id", "state");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "two_person_approval_context_idx"
  ON "two_person_approval" ("permission_key", "target_entity_type", "target_entity_id");
--> statement-breakpoint

-- UNE SEULE requête en attente par contexte (`authorization_rbac.md:142`, usage unique). Sans cet
-- index, un initiateur peut empiler N requêtes identiques et faire approuver la plus commode :
-- l'unicité serait une propriété du code, donc perdue au premier appelant distrait. PARTIEL, pour
-- que les états terminaux coexistent en historique (traçabilité compliance).
-- ⛔ `NULLS NOT DISTINCT` (PG 15+, la base de ce projet est en 16.14) est INDISPENSABLE ici et non
--    un raffinement : `target_entity_id` est nullable (toute cible n'a pas une identité uuid), et
--    par défaut Postgres considère deux NULL comme DISTINCTS. Sans cette clause, l'index laisse
--    passer N requêtes en attente identiques dès que la cible n'a pas d'uuid — c'est-à-dire
--    exactement dans le cas qu'il existe pour couvrir. La garde aurait été verte en CERTIFIANT le
--    défaut. Prouvé par test contre la base réelle, pas déduit de la documentation.
CREATE UNIQUE INDEX IF NOT EXISTS "two_person_approval_pending_context_uq"
  ON "two_person_approval" ("initiator_account_id", "permission_key", "target_entity_type", "target_entity_id")
  NULLS NOT DISTINCT
  WHERE "state" = 'AWAITING_SECOND';
--> statement-breakpoint

-- ⛔ GRANT EXPLICITE — SANS LUI, CE LOT CASSE EN PRODUCTION ET LE TYPECHECK NE LE VOIT PAS.
--    `0013:108-109` ne donne aux tables FUTURES que `SELECT, INSERT` via ALTER DEFAULT PRIVILEGES.
--    Or `two_person_approval` est MUTABLE par construction : `decide()` et `consume()` sont des
--    UPDATE. Sans cette ligne, les deux échouent en `permission denied` à l'exécution.
--    MESURÉ, pas déduit — régime de 0013 reproduit sur une base PG 16 : une table créée après
--    n'hérite que de `INSERT,SELECT`, et un UPDATE sous le rôle `app_rw` est refusé.
--    ★ Le piège de méthode vaut la ligne : les 4 attaques qui ont validé les CHECK de cette
--      migration tournaient sous le rôle PROPRIÉTAIRE. Elles prouvaient les contraintes et
--      **rien du tout sur les privilèges** — un oracle exact sur le mauvais chemin.
--    Pas de DELETE : une approbation est une trace de conformité, elle ne s'efface pas
--    (même posture que `enforcement_action`, `0011:87`).
GRANT SELECT, INSERT, UPDATE ON "two_person_approval" TO app_rw;
