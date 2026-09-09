-- migration 0144: city_epoch (W1.1-d C1.1 — the SUPPORT of the city-global epoch)
-- Renumbered 0143→0144 at cumulative-branch merge (W1.1-a's 0143_onboarding_funnel_state, designed
-- first, keeps 0143 — see docs/superpowers/specs/2026-08-09-w1.1-cumul-merge-notes.md).
-- Design: docs/superpowers/specs/2026-08-09-w1.1d-world-turns-design.md §C1.1 (v3, gate ⊥ APPROVED
--         after 3 passes) + §0 (the ruling: amorçage + époque city-global keeps players IN PHASE, a
--         precondition for the "per-player-firing, city-global-state" family, §1).
-- R9.3: same-commit addendum docs/tech/09_data_model/schema_city_epoch.md.
-- Zero-regression: ADDITIVE only — no existing table/column touched.
--
-- city_epoch: the SINGLETON city-global "current in-game minute" row. A NEW player's OWN
-- `city_sim_clock.game_minute` (per-player, migration 0015) is seeded FROM this value at signup
-- (auth.service.ts, C1.3) — NEVER from 0 — so two players signed up at different real-world instants
-- start with EQUAL game_minute (phase), not merely equal RHYTHM. Without this, the "per-player-firing,
-- city-global-state" family (POLITICAL_CALENDAR_TICK et al., design §1) starves a late-signing-up player
-- forever (design §1.3).
--
-- REJECTED alternative (design §C1.1): a derived `MAX(game_minute) FROM city_sim_clock` — this would be
-- a MUTABLE resource SHARED across every spec/player in the same shard (any advance() call moves the
-- epoch every LATER signup reads), exactly the "shared mutable resource" shape the socle requires closing
-- by removal, not accommodation. A dedicated table with its own lifecycle is the only recevable form.
--
-- Singleton shape mirrors `political_calendar_state` (migration 0111) — `id` fixed to 1, CHECK-enforced,
-- seeded ONCE at migration time (never lazily created at runtime, unlike `city_sim_clock`'s per-player
-- lazy-create).
--
-- C2/C3 (NOT this chunk — pas de pilote de fond, pas de seam d'horloge ici) own ADVANCING game_minute.
-- C1 poses ONLY the persistence + the signup-time read (C1.3) + a `_test` seam
-- (`POST /v1/_test/citysim/epoch/set`, citysim-test.controller.ts) to pin it for E2E determinism — since
-- no pilot exists yet in this chunk to move it organically, and the design's own §C1.2 note applies here
-- too: an un-pinned epoch stays at its 0 origin under the E2E harness's pinned-clock default, which would
-- make any C1.2-closing assertion vacuous (E ≈ 0) without this seam.

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "city_epoch" (
  "id"           integer     NOT NULL PRIMARY KEY DEFAULT 1,
  "game_minute"  bigint      NOT NULL DEFAULT 0,
  CONSTRAINT "city_epoch_singleton_chk"    CHECK ("id" = 1),
  CONSTRAINT "city_epoch_game_minute_chk"  CHECK ("game_minute" >= 0)
);

--> statement-breakpoint

-- Seed the ONE singleton row at migration time (never lazily created at runtime — a fixed-shape
-- city-global table always has exactly one row from the moment this migration applies, the SAME
-- discipline `political_calendar_state` (0111) already established).
INSERT INTO "city_epoch" ("id", "game_minute")
VALUES (1, 0)
ON CONFLICT ("id") DO NOTHING;

--> statement-breakpoint

-- Runtime grant (app_rw least-privilege role — 0013_app_role.sql). 0013's ALTER DEFAULT PRIVILEGES
-- auto-grants only SELECT+INSERT on future tables — a MUTABLE table must add its own UPDATE/DELETE grant
-- in ITS OWN migration (0013's own comment; precedent: 0015_world_geography_and_clock.sql:72-75 for
-- city_sim_clock). city_epoch.game_minute is mutated by the C3 bounded pilot on EVERY period (not this
-- chunk, but the grant belongs with the table's own creation, not deferred to whichever chunk first
-- writes it) — without this grant, the first pilot tick would raise `permission denied`.
GRANT SELECT, INSERT, UPDATE ON "city_epoch" TO app_rw;
