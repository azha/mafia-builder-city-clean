-- 0028_lieutenant_tenure_inertia.sql — schema_lieutenant.md §2/§4.1 (lieutenant, Phase-11 vector tenure inertia, Idea #38).
--   PALIMPSEST §3.2 (forward-only).
-- IMPLEMENTS: Phase 11 / lieutenant tenure inertia (docs/tech/07_lieutenants_and_behavior/tenure_inertia.md, Idea #38) /
--             Task A1. R9.3: this matches src/db/schema/lieutenant.ts byte-for-byte. ONLY ADDS / CONSTRAINS — no existing
--             table/column/enum is redefined or dropped:
--               1. a CHECK (tenure_score >= 0) on the ALREADY-EXISTING "lieutenant"."tenure_score" column (0004, integer
--                  NOT NULL DEFAULT 0). Phase-11 REVIVES that column semantically as the UNINTERRUPTED-STREAK counter
--                  (the streak that drives bucket derivation); the type/default are UNCHANGED — only the non-negativity
--                  guard is added (a streak is monotone non-negative; canon Invariant 2/4).
--               2. 2 NEW nullable columns on "lieutenant" (tenure_reset_at_tick, settling_until_tick).
--             This is an ALTER, NOT a CREATE: the 7 canonical lieutenant tables ALREADY exist (0004_lieutenant.sql) and
--             were extended by 0026 (granted_role/mode/assigned_building_id/delegation_paused + behavior_script
--             source/valid) and 0027 (target_building_id). 0028 ADDs only the tenure-inertia metadata. Every other table
--             is UNCHANGED (git diff = empty except the addition).
--             ADD COLUMN with NO DEFAULT (nullable) = metadata-only in PG (no table rewrite), safe on a populated table;
--             any already-recruited lieutenant retro-fills tenure_reset_at_tick=NULL / settling_until_tick=NULL → no
--             disruption window, streak measured from recruitment — byte-identical behavior until the tick (A2) writes them.
--             The CHECK is also metadata-only here: tenure_score is NOT NULL DEFAULT 0 since 0004, so every existing row
--             already satisfies `>= 0` → the ADD CONSTRAINT validates instantly without a rewrite.
-- COLUMNS (BO-only — NEVER projected to the player surface; canon Invariant 4 — the bucket is DERIVED, never these scalars):
--   tenure_reset_at_tick : the streak ORIGIN (tick of the last tenure_score reset), in city_sim_clock.game_minute space
--     (bigint, mirror operational_chain.ts *_at_tick). NULL = never reset (streak since recruitment). Audit/observability.
--   settling_until_tick  : the end of the DISRUPTION (settling) window opened by a reassignment, in game_minute space.
--     NULL = no disruption in progress. Armed by the tick/reassign (A2/A4) = currentTick + disruptionTicks(bucket).
-- INDEX: NONE. tenure_score / the two tick columns are read per-lieutenant by the lieutenant PK (already indexed); no read
--        filters BY these columns, so no secondary index is warranted day-1 (cf. schema_lieutenant.md §6 — calque 0027).
-- GRANT: NONE needed. "lieutenant" ALREADY has GRANT SELECT, INSERT (0013 §"Read+append everywhere") AND GRANT UPDATE,
--        DELETE (0013 §"Mutate only NON-append-only tables" — listed explicitly). A table-level GRANT (no column list)
--        covers columns ADDED later → the NEW columns are SELECT/INSERT/UPDATE-able by app_rw with no re-GRANT (the tick
--        UPDATEs them). (calque target_building_id 0027 / assigned_building_id 0026 — same table-level grant inheritance.)

-- ===== lieutenant (existant, §4.1) — 1 CHECK + 2 colonnes AJOUTÉES (Phase-11 tenure inertia) =====
-- 1. CHECK (tenure_score >= 0) : tenure_score est REVÉCU comme le compteur de streak ininterrompu (uninterrupted-occupancy
--    streak) qui pilote `bucketForStreak` (REUSE tenure-inertia.ts). Un streak est monotone non-négatif → ce guard rend
--    l'invariant explicite côté DB. Colonne type/default INCHANGÉS (integer NOT NULL DEFAULT 0 depuis 0004). (§4.1)
ALTER TABLE "lieutenant"
  ADD CONSTRAINT "lieutenant_tenure_score_nonneg" CHECK ("tenure_score" >= 0);
--> statement-breakpoint
-- 2. tenure_reset_at_tick : l'origine du streak (tick du dernier reset), espace city_sim_clock.game_minute. NULL = jamais
--    reset (streak depuis le recrutement). BO-only audit ; JAMAIS projeté surface joueur (canon Invariant 4). (§4.1 NEW)
ALTER TABLE "lieutenant"
  ADD COLUMN "tenure_reset_at_tick" bigint NULL;
--> statement-breakpoint
-- 3. settling_until_tick : la fin de la fenêtre de disruption (settling window) ouverte par une réassignation, espace
--    city_sim_clock.game_minute. NULL = pas de disruption en cours. BO-only ; JAMAIS projeté surface joueur. (§4.1 NEW)
ALTER TABLE "lieutenant"
  ADD COLUMN "settling_until_tick" bigint NULL;
