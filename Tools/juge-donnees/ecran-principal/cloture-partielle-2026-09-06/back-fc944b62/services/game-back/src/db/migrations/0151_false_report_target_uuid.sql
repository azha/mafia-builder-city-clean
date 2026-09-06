-- migration 0151: false_report_target_uuid (CHANTIER P2 item 3 — TD-481)
-- Arbitrage: docs/superpowers/specs/2026-09-02-p2-td481-arbitrage.md — tranché PAR LA MESURE.
--
-- ⛔ LE DÉFAUT QUE CETTE MIGRATION FERME. `POST /v1/city/inspection/report` exigeait un
--    `building_id` ENTIER, alors que tous les bâtiments du joueur sont des uuid. Mesuré de bout en
--    bout : `building_id: 1` (un entier arbitraire ne désignant rien) rendait **201**, et l'uuid d'un
--    bâtiment RÉEL rendait **422**. Le seul argument que la route acceptait était donc celui qui ne
--    désignait AUCUN bâtiment du joueur.
--
-- ⛔ POURQUOI UNE COLONNE NEUVE ET PAS UN CHANGEMENT DE TYPE. `target_building_id` n'a **aucune
--    contrainte** vers une table de bâtiments (mesuré : PK, FK player_id, CHECK entry_type — c'est
--    tout), et les entiers de tout le domaine inspection sont **synthétisés par un hash**
--    (`inspection.service.ts#scheduledBuildingId`, puis re-hashés par `inspectionOutcome` ; le code
--    dit lui-même « day-1 this is a deterministic proxy », le couplage réel étant System 7). Les
--    10 lignes existantes portent des ids 1..109 qui ne désignent rien et qu'on ne peut donc pas
--    convertir. ⇒ On AJOUTE le référent honnête à côté, on ne réécrit pas un passé qu'on ne sait pas
--    interpréter — même posture que 0150 devant ses lignes pré-lot.
--
-- ⚠️ `target_building_id` devient NULLABLE : les écritures neuves ne portent QUE l'uuid. Écrire un
--    entier dérivé (un hash de l'uuid, par exemple) pour satisfaire l'ancien NOT NULL aurait
--    fabriqué un identifiant de plus — exactement le geste que l'arbitrage écarte.

ALTER TABLE "false_report_ledger" ADD COLUMN IF NOT EXISTS "target_building_uuid" uuid NULL
  REFERENCES "buildings"("building_id") ON DELETE SET NULL;

ALTER TABLE "false_report_ledger" ALTER COLUMN "target_building_id" DROP NOT NULL;

COMMENT ON COLUMN "false_report_ledger"."target_building_uuid" IS
  'TD-481 — le bâtiment RÉEL visé par le rapport (FK buildings). Les écritures neuves portent celle-ci ; target_building_id (entier, proxy synthétique du domaine inspection) reste pour les lignes antérieures et n''est plus écrit.';
COMMENT ON COLUMN "false_report_ledger"."target_building_id" IS
  'LEGACY — proxy ENTIER hérité du domaine inspection (ids synthétisés par hash, aucune FK). Nullable depuis 0151 ; ne plus écrire. Le référent honnête est target_building_uuid.';
