-- 0022_ash_schema_foundation.sql — schema_operational_chain.md §7.10 (substance / luxury-channel surface : Ash). PALIMPSEST §3.2 (forward-only).
-- IMPLEMENTS: Phase 2b / vector #2c (substances — Ash) / Task 0. R9.3: this matches
--             src/db/schema/operational_chain.ts byte-for-byte. ONLY ADDS — no existing table is redefined:
--             2 enum members (precursor_type += 'glass_lily' ; building_operational_type += 'specialized_lab')
--             + 1 column on building_operational_state (lab_tier)
--             + 2 columns on cook_session (refining_passes, damaged_pauses_during_cook)
--             + 1 new enum (ash_appointment_status)
--             + 2 new tables (batch_purity side-table, ash_appointment).
--             Every Phase-1 table, the 9 Phase-2 T0 tables, the raid surface (0018), the substance/cold-chain
--             surface (0019/0020) and the substance/addiction-loyalty surface (0021) are otherwise UNCHANGED
--             (git diff = empty except the additions). product_storage keeps its 8 columns byte-for-byte: the Ash
--             batch purity lives in a SIDE TABLE (batch_purity), NOT a new product_storage column → non-Ash rows
--             stay byte-identical (R9.3 byte-identical criterion — same choice spirit as hush_addiction §7.9.2).
-- FK player_id → player (0001). FK glass_venue_building_id → buildings (0005). FK batch_purity.storage_id →
-- product_storage (0017). No change to cook_stage / substance_type / purity_grade enums (Ash reuses the existing
-- 'ash' substance_type member + stage_1 → stage_2 → stage_3 → completed cook_stage members, already present).

-- ===== precursor_type (existant, §2) — 1 membre AJOUTÉ (§7.10.1) =====
-- Ash precursor = Glass lily (production_secondaries.md §Ash — provisional name [PROV-Y26Q2], canon name TBD). ADD VALUE
-- PG-natif (PAS recreate-enum, qui casserait precursor_stock.precursor_type / precursor_order.precursor_type). Sous
-- PG >= 12 (stack postgres:16) ALTER TYPE … ADD VALUE s'exécute DANS un bloc transactionnel ; l'unique restriction = la
-- valeur ajoutée ne peut PAS être UTILISÉE (DML / default / comparaison) dans la MÊME transaction que l'ADD. Cette migration
-- AJOUTE le membre (aucune DML l'utilisant — les tables ash_appointment / batch_purity ci-dessous ne référencent PAS
-- precursor_type) → conforme au MigrationRunner (BEGIN … COMMIT par fichier, exactement comme 0019 += verdant_root_extract
-- / 0021 += lull_resin). IF NOT EXISTS = idempotent (re-run au boot inoffensif).
ALTER TYPE "precursor_type" ADD VALUE IF NOT EXISTS 'glass_lily';
--> statement-breakpoint

-- ===== building_operational_type (existant, §2) — 1 membre AJOUTÉ (§7.10.2) =====
-- Ash building = Specialized lab (Brindle=lab, Crick=refinery, Hush=press_house, Ash=specialized_lab). ADD VALUE PG-natif
-- (PAS recreate-enum, qui casserait building_operational_state.operational_type). Même contrainte transactionnelle que
-- precursor_type ci-dessus : la valeur n'est PAS utilisée (DML / default / comparaison) dans cette transaction (la conversion
-- vers specialized_lab + le default lab_tier sont posés en T1, hors migration). IF NOT EXISTS = idempotent.
ALTER TYPE "building_operational_type" ADD VALUE IF NOT EXISTS 'specialized_lab';
--> statement-breakpoint

-- ===== ash_appointment_status (NEW enum, §7.10.6) =====
-- Domaine fermé du cycle de vie d'un rendez-vous Glass : scheduled → honored (la SEULE vente Ash) | expired (non-honoré
-- passé expires_at_tick). CREATE TYPE classique (nouvel enum, aucune FK/colonne existante à préserver).
CREATE TYPE "ash_appointment_status" AS ENUM ('scheduled', 'honored', 'expired');
--> statement-breakpoint

-- ===== building_operational_state (existant, §3 Table 1) — 1 colonne AJOUTÉE (§7.10.3) =====
-- lab_tier : le palier d'un specialized_lab (lever joueur d'upgrade cash → tier++). Défaut 1 NOT NULL → rétro-compatible
-- (tout bâtiment déjà landé reste tier 1). Un specialized_lab à tier supérieur produit un Ash de purity plus haute (AshPurityService
-- T6 lit tier_base[lab_tier]). ADD COLUMN avec DEFAULT = metadata-only en PG >= 11 (pas de rewrite de table), sûr sur table
-- peuplée ; aucune autre colonne touchée (structural_state/cold_storage_capable §7.2/§7.8 restent intactes).
-- GRANT : building_operational_state a déjà GRANT UPDATE, DELETE TO app_rw (0017 §5) — un GRANT UPDATE table-level (sans liste
-- de colonnes) couvre les colonnes AJOUTÉES ultérieurement → lab_tier est mutable par app_rw sans re-GRANT (calque
-- cold_storage_capable 0019). (schema_operational_chain.md §7.10.3)
ALTER TABLE "building_operational_state"
  ADD COLUMN "lab_tier" integer NOT NULL DEFAULT 1;
--> statement-breakpoint

-- ===== cook_session (existant, §3 Table 4) — 2 colonnes AJOUTÉES (§7.10.4) =====
-- refining_passes : le nombre de passes de raffinage CHOISIES par le joueur au démarrage d'un cook Ash (lever purity : plus
-- de passes ⇒ purity plus haute + cook plus long). damaged_pauses_during_cook : le nombre de fois où ce cook a été interrompu
-- par un bâtiment passé DAMAGED (réutilise le gate raid→DAMAGED vector #1 ; lever purity inverse : chaque pause baisse la purity).
-- Défaut 0 NOT NULL pour les DEUX → Brindle (4-stage) / Crick (1-stage) / Hush (2-stage) byte-identical : un cook non-Ash ne
-- renseigne aucune des deux colonnes (refiningPasses=0, le compteur reste 0), donc son comportement M1/Crick/Hush est inchangé.
-- Le compteur damaged_pauses_during_cook s'incrémente pour N'IMPORTE QUELLE substance dont le bâtiment passe DAMAGED (T4), mais
-- SEULE la purity Ash le LIT à la complétion (behavior-preserving : les cooks non-Ash pausent identiquement, le compteur est inerte).
-- ADD COLUMN avec DEFAULT = metadata-only en PG >= 11 (pas de rewrite), sûr sur table peuplée ; aucune autre colonne de cook_session
-- (current_stage/started_at_tick/cut_purity_bucket/…) n'est touchée. GRANT : cook_session a déjà GRANT UPDATE, DELETE TO app_rw
-- (0017 §5) → les deux colonnes sont mutables/insérables par app_rw sans re-GRANT (calque cold_storage_capable 0019). (§7.10.4)
ALTER TABLE "cook_session"
  ADD COLUMN "refining_passes" integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "cook_session"
  ADD COLUMN "damaged_pauses_during_cook" integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "cook_session" ADD CONSTRAINT "cs_refining_passes_chk" CHECK (refining_passes >= 0);
--> statement-breakpoint
ALTER TABLE "cook_session" ADD CONSTRAINT "cs_damaged_pauses_chk" CHECK (damaged_pauses_during_cook >= 0);
--> statement-breakpoint

-- ===== Table 12 : batch_purity (NEW side-table — la purity d'un batch Ash, §7.10.5) =====
-- 1 row par product_storage row Ash portant une purity dérivée (stampée une fois à la complétion du cook Ash par AshPurityService
-- T6 — score 0..100 dérivé de lab_tier + refining_passes − damaged_pauses_during_cook). SIDE TABLE (PAS une colonne sur
-- product_storage) PAR LE CRITÈRE R9.3 byte-identical : une colonne purity_score nullable sur product_storage changerait la SHAPE
-- de TOUTES les rows (9 colonnes au lieu de 8, NULL pour les non-Ash) ; une side-table keyée sur storage_id laisse les rows
-- product_storage non-Ash BYTE-FOR-BYTE inchangées (8 colonnes, aucune row créée pour Brindle/Crick/Hush) — même esprit que
-- hush_addiction §7.9.2 (table dédiée plutôt que colonnes sur l'existant). purity_score = entier 0..100 (BO-only, R2.2 — projeté
-- en bande qualitative purity_band CUT/STANDARD/PURE/CRYSTALLINE côté client, jamais le score brut).
CREATE TABLE "batch_purity" (
  "storage_id"   uuid    PRIMARY KEY REFERENCES "product_storage"("storage_id") ON DELETE CASCADE,
  "player_id"    uuid    NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "purity_score" integer NOT NULL,
  "updated_at"   timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "batch_purity_player_idx" ON "batch_purity" ("player_id");
--> statement-breakpoint
ALTER TABLE "batch_purity" ADD CONSTRAINT "bp_purity_score_chk" CHECK (purity_score >= 0 AND purity_score <= 100);
--> statement-breakpoint

-- ===== Table 13 : ash_appointment (NEW table — le rendez-vous Glass réservé par le joueur, §7.10.6) =====
-- 1 row par rendez-vous Ash réservé à un Glass venue. State machine scheduled → honored | expired. honor = la SEULE vente Ash
-- (luxury-channel ; Ash ne se vend JAMAIS via DEALER_SELL). booked_at_tick / expires_at_tick en espace city_sim_clock.game_minute.
-- grams_sold / payout_cents renseignés à honor uniquement (null tant que scheduled/expired). PK uuid (gen_random_uuid).
CREATE TABLE "ash_appointment" (
  "id"                      uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id"               uuid    NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "glass_venue_building_id" uuid    NOT NULL REFERENCES "buildings"("building_id") ON DELETE CASCADE,
  "status"                  ash_appointment_status NOT NULL DEFAULT 'scheduled',
  "booked_at_tick"          bigint,
  "expires_at_tick"         bigint,
  "grams_sold"              integer,
  "payout_cents"            bigint
);
--> statement-breakpoint
CREATE INDEX "ash_appointment_player_idx" ON "ash_appointment" ("player_id");
--> statement-breakpoint
-- Index (status, expires_at_tick) pour le sweep set-based du tick APPOINTMENT_EXPIRE (MINUTE/17, T7) :
-- UPDATE … WHERE status='scheduled' AND expires_at_tick < currentTick.
CREATE INDEX "ash_appointment_status_expiry_idx" ON "ash_appointment" ("status", "expires_at_tick");
--> statement-breakpoint

-- ===== Runtime grants (app_rw least-privilege role — 0013_app_role.sql) =====
-- batch_purity + ash_appointment sont des NEW tables créées par `mafia` : l'ALTER DEFAULT PRIVILEGES de 0013 leur auto-grant
-- SELECT+INSERT. Elles sont MUTABLES (batch_purity.purity_score est stampé à la complétion ; ash_appointment.status évolue
-- scheduled→honored|expired, + grams_sold/payout_cents renseignés à honor) → ajouter un GRANT UPDATE explicite, sinon la
-- stamp purity / le book-honor-expire tick obtiennent `permission denied`. (calque hush_addiction 0021 §7.9.4 / building_raid
-- 0018 §7.6.) (schema_operational_chain.md §7.10.7)
GRANT UPDATE ON "batch_purity" TO app_rw;
--> statement-breakpoint
GRANT UPDATE ON "ash_appointment" TO app_rw;
