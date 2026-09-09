-- 0026_lieutenant_dsl_schema_foundation.sql — schema_lieutenant.md §2/§3/§4 (lieutenants + behavior_script, Phase-6 vector #6 slice-1 delegation/DSL surface). PALIMPSEST §3.2 (forward-only).
-- IMPLEMENTS: Phase 6 / vector #6 (lieutenants + behavior-script DSL slice-1, COOK delegation) / Task 0. R9.3: this matches
--             src/db/schema/lieutenant.ts byte-for-byte. ONLY ADDS — no existing table/column is redefined:
--             2 NEW enums (granted_role, lieutenant_mode) + 4 NEW columns on "lieutenant" + 2 NEW columns on
--             "behavior_script" + 1 NEW index. This is an ALTER, NOT a CREATE: the 7 canonical lieutenant tables
--             (behavior_script, lieutenant, lieutenant_cue_registry, lieutenant_task_exposure, standing_order,
--             jurisdiction_boundary, veto_assignment) ALREADY exist (0004_lieutenant.sql, Phase-0 data-model
--             foundation) — they are NOT recreated here. The 5 deferred sub-tables stay declared but UNUSED by slice-1
--             logic; their columns are untouched. Every Phase-1 table, the 9 Phase-2 T0 tables, and every later vector
--             surface (raid 0018, substance/cold-chain 0019/0020, addiction/luxury 0021/0022, cultivation 0023,
--             courier-dispatch 0024, money_holding 0025) are otherwise UNCHANGED (git diff = empty except the addition).
--             ADD COLUMN with a DEFAULT = metadata-only in PG >= 11 (no table rewrite), safe on a populated table; any
--             already-recruited lieutenant retro-fills (granted_role='advisory', mode='tasked', assigned_building_id=NULL,
--             delegation_paused=false) → byte-identical behavior for a player whose lieutenants pre-date this migration
--             (same forward-only ADD-COLUMN spirit as lab_tier 0022 §7.10.3 / hub_tier 0024 §7.12.1).
-- FK: assigned_building_id → buildings(building_id) (0005). FK direction for the 1:1 script is the EXISTING/canonical
--     one: lieutenant.behavior_script_id → behavior_script(script_id) RESTRICT (0004) — NOT touched here.
-- GRANT: NONE needed. behavior_script + lieutenant ALREADY have GRANT SELECT, INSERT (0013 §"Read+append everywhere",
--        ALL TABLES) AND GRANT UPDATE, DELETE (0013 §"Mutate only NON-append-only tables" — both are listed explicitly).
--        A table-level GRANT (no column list) covers columns ADDED later → the 6 NEW columns are SELECT/INSERT/UPDATE-able
--        by app_rw with no re-GRANT (recruit INSERTs / attach-script + tick + pause UPDATE them). (calque hub_tier 0024 /
--        lab_tier 0022 — both relied on the same table-level grant inheritance.)

-- ===== NEW enums natifs (Phase-6 slice-1) =====
-- granted_role: la délégation 07 `GrantedRole` (lieutenant_definition.md §Composite Lieutenant). Slice-1 utilise 'executor'
-- (le lieutenant exécute le script délégué) ; 'advisory' = défaut sûr (rétro-fill des lieutenants pré-0026 inertes) ;
-- 'delegated_owner'/'cohort_overseer' déclarés mais DÉFÉRÉS (couche tenure/délégation avancée). (schema_lieutenant.md §2)
CREATE TYPE "granted_role"    AS ENUM ('advisory', 'executor', 'delegated_owner', 'cohort_overseer');
--> statement-breakpoint
-- lieutenant_mode: 07 `TaskedVsDelegated` (lieutenant_definition.md §Composite Lieutenant). Slice-1 utilise 'delegated'
-- (le tick LIEUTENANT_TICK évalue son script chaque tick) ; 'tasked' = défaut sûr (rétro-fill inerte, DÉFÉRÉ). (§2)
CREATE TYPE "lieutenant_mode" AS ENUM ('tasked', 'delegated');
--> statement-breakpoint

-- ===== lieutenant (existant, §4.1) — 4 colonnes AJOUTÉES (slice-1 delegation/operational state) =====
-- granted_role: le niveau de délégation accordé (défaut 'advisory' = inerte rétro-fill). NEW — la table 09 canonique
--   (dérivée du GDD L115-186) ne modélisait PAS le niveau de délégation runtime ; slice-1 le matérialise. (§4.1 NEW)
-- mode: tasked vs delegated (défaut 'tasked' = inerte). NEW — même justification. Le tick ne sélectionne que mode='delegated'. (§4.1 NEW)
-- assigned_building_id: le bâtiment opérationnel délégué (NULL si non-délégué). FK → buildings(building_id) (pas d'ON DELETE
--   spécifié → NO ACTION par défaut PG : si le bâtiment disparaît avec un lieutenant qui le pointe, l'opération échoue —
--   garde de cohérence ; le service détache d'abord). NEW — slice-1 attache une délégation à un bâtiment concret. (§4.1 NEW)
-- delegation_paused: l'état PAUSE_OPS (défaut false). NEW — le tick le pose à true quand le script résout PAUSE_OPS, et le
--   reclear à la reprise ; le projection band PAUSED/ACTIVE/IDLE le lit. (§4.1 NEW)
ALTER TABLE "lieutenant"
  ADD COLUMN "granted_role"        granted_role    NOT NULL DEFAULT 'advisory';
--> statement-breakpoint
ALTER TABLE "lieutenant"
  ADD COLUMN "mode"                lieutenant_mode NOT NULL DEFAULT 'tasked';
--> statement-breakpoint
ALTER TABLE "lieutenant"
  ADD COLUMN "assigned_building_id" uuid NULL REFERENCES "buildings"("building_id");
--> statement-breakpoint
ALTER TABLE "lieutenant"
  ADD COLUMN "delegation_paused"   boolean         NOT NULL DEFAULT false;
--> statement-breakpoint
-- Index sur assigned_building_id : le tick LIEUTENANT_TICK (T6) sélectionne les lieutenants délégués par bâtiment ;
-- le projection (T7) lit l'état opérationnel du bâtiment assigné. (schema_lieutenant.md §6)
CREATE INDEX "lieutenant_assigned_building_idx" ON "lieutenant" ("assigned_building_id");
--> statement-breakpoint

-- ===== behavior_script (existant, §4.2) — 2 colonnes AJOUTÉES (slice-1 source round-trip + compile result) =====
-- source: le texte DSL que le joueur a écrit (défaut ''). La table 09 canonique ne stocke QUE le `rules` jsonb (l'AST/IR
--   compilé) ; slice-1 conserve la SOURCE pour le round-trip lecture (projection §8.2 — le joueur relit son DSL) + la
--   recompilation. NEW — propagé à 09. (§4.2 NEW)
-- valid: le résultat de compilation (défaut false). Le tick ne lit un script que valid=true ; l'attach le pose true sur
--   succès parse+compile, le défaut false couvre le script vide créé au recrutement. NEW — propagé à 09. (§4.2 NEW)
ALTER TABLE "behavior_script"
  ADD COLUMN "source" text    NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE "behavior_script"
  ADD COLUMN "valid"  boolean NOT NULL DEFAULT false;
