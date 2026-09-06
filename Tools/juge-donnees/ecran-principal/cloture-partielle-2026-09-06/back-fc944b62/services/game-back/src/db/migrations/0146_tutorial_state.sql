-- migration 0146: tutorial_state (W1.1-b C1 — the tutorial overlay SYSTEM's own PERSISTENCE, 08c owned)
-- Design: docs/superpowers/specs/2026-08-09-w1.1b-overlay-engine-design.md §4 C1 (D3 — `tutorial_id`
--         varchar(64), never a pgEnum, + its precondition I2 — closed union lives service-side, not
--         in the column type; D4 — `tutorials_opt_out` placement + EXPLICIT GRANT/REVOKE, M2; D8-2 —
--         the PK's FUNCTIONAL reason, "first" is per-PLAYER, never per-city).
-- Canon: docs/tech/08c_remaining_screens/screen_c8_first_time_tutorial.md §11 NestJS — backend jeu
--        (:335-344, table DDL verbatim `tutorial_id varchar(64)`, PK (player_id, tutorial_id),
--        append-only, `REVOKE UPDATE, DELETE` recommended :363).
--
-- §0.2 of the design MEASURED this table never existed despite the 2026-05 chapter spec's "REUSE
-- overlays/hints" — 0 hits on 8 canon symbols (`tutorial_state`, `TutorialOverlayService`, etc.)
-- repo-wide. This migration is the FIRST time the engine's own table lands in code — REUSE of a
-- DOCUMENT, not of code (design §0.2).
--
-- tutorial_state: ONE row per (player_id, tutorial_id) EVER shown to that player — append-only,
-- "shown at most once" (GDD L502) is a base error, not an application promise (`markShown()` — W1.1-b
-- C3, LIVE, tutorial-overlay.service.ts:57 — INSERTs ... ON CONFLICT DO NOTHING against this SAME
-- PK). The PK `(player_id, tutorial_id)` is ALSO the FUNCTIONAL reason "first" reads per-PLAYER,
-- never per-city (design D8-2): the city-global epoch (0144_city_epoch) means a new signup joins a
-- world already in motion — an overlay like "first Compression Week" must read "the player's first",
-- never "the city's first".
--
-- `tutorial_id varchar(64)`, NOT a pgEnum (design D3 + its precondition I2): the canon defines TWO
-- OPEN id families (`tutorial.exception_card.<category_key>`, `tutorial.pillar_threshold.
-- <threshold_key>`, screen_c8:212,214 — the second `[PROV-TBD]`) that a pgEnum cannot hold without a
-- migration per new member. The v1 closed-union compile-time guarantee lives in the SERVICE-side
-- `TUTORIAL_ID_CATALOGUE` (W1.1-b C3, LIVE — tutorial-id-catalogue.ts), never in the column type.
-- `varchar(64)` is the canon's OWN form (screen_c8:339) — adopting it is not a deviation.
--
-- GRANT: EXPLICIT, never the implicit `ALTER DEFAULT PRIVILEGES` cover alone (design D4/M2).
-- `0013_app_role.sql:108` is `ALTER DEFAULT PRIVILEGES FOR ROLE mafia` — future-table auto-coverage
-- is conditioned on the ROLE that RUNS the migration. This table's append-only-ness is a SECURITY
-- property (screen_c8:363 "REVOKE recommended"; `0013:60-61` "REVOKE bites"), so it must not depend
-- on any migrator identity. Hence an explicit `GRANT SELECT, INSERT` + `REVOKE UPDATE, DELETE` here —
-- redundant with 0013's default privileges TODAY (migrations run as role `mafia`, verified against
-- 0013's own DO block), load-bearing the day a migration runs under a different role.
--
-- tutorials_opt_out: additive column on `player_progression_state` (design D4), NOT a new table —
-- two measured reasons: (1) the lot's OWN precedent (`onboarding-funnel.repository.ts:8-13`, W1.1-a)
-- that several repositories writing DIFFERENT columns of this table already coexist without
-- conflict — R9.3 is about the SCHEMA declaration, never a single-writer-per-table rule; (2) the SQL
-- grant asymmetry (`0013:107-109`): a NEW table gets only SELECT+INSERT by default, a MUTABLE flag on
-- it would need its own explicit UPDATE grant (forgotten = runtime `permission denied`) —
-- `player_progression_state` is ALREADY UPDATE-granted (`0013:64`), zero GRANT needed for it.
--
-- R9.3: same-commit backport — docs/tech/09_data_model/schema_tutorial_state.md (NEW file:
-- `tutorial_state` was NEVER in 09 — the 08c canon declared it as a document, 09 never carried it,
-- design §6) + docs/tech/09_data_model/schema_player_progression_state.md (§ Activation W1.1-b C1
-- note, same place W1.1-a's own 0143 activation note lives) + docs/tech/18_api_protocol/
-- endpoint_catalogue.md (`ui.tutorial.state.get` NEW entry + `ui.tutorial.progress` path corrected
-- `/v1/me/ui/` → `/v1/ui/`, design D5) + this migration's own entry in
-- `db/migrations/meta/_journal.json` (idx 146 — without it `MigrationRunner` never reads this file,
-- `migration.runner.ts:111`, the same trap 0143 already paid, design §4 C1).
--
-- Zero-regression: ADDITIVE only — one NEW table + one NEW column on an already additive-only lot
-- table (0143's own 3 columns, same design lineage). No existing row's value changes
-- (`DEFAULT false` backfills safely, mirrors 0143's `DEFAULT 'LAUNCH'` reasoning).

--> statement-breakpoint

CREATE TABLE "tutorial_state" (
  "player_id"    uuid          NOT NULL REFERENCES "player"("player_id") ON DELETE CASCADE,
  "tutorial_id"  varchar(64)   NOT NULL,
  "shown_at"     timestamptz   NOT NULL DEFAULT now(),
  PRIMARY KEY ("player_id", "tutorial_id")
);

--> statement-breakpoint

-- Explicit, never implicit (design D4/M2 — see header). Append-only is a SECURITY property; it must
-- not depend on the identity of whichever role happens to run the migration.
GRANT SELECT, INSERT ON "tutorial_state" TO app_rw;

--> statement-breakpoint

REVOKE UPDATE, DELETE ON "tutorial_state" FROM app_rw;

--> statement-breakpoint

-- 4th onboarding column on this table (design D4) — after 0143's 3 (onboarding_funnel_step /
-- first_decision_at / welcome_grant_claimed_at). Already UPDATE-granted (0013:64) — zero GRANT
-- needed here, unlike tutorial_state above.
ALTER TABLE "player_progression_state"
  ADD COLUMN "tutorials_opt_out" boolean NOT NULL DEFAULT false;
