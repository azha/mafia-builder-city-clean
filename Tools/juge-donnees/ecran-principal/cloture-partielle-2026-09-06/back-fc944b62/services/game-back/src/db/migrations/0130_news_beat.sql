-- migration 0130: news_beat (04g-C C1 -- News-beat runtime, G23 Brennar Daily) -- 3 tables + 2 enums,
-- data foundation ONLY (no tick/generator/reader lands this chunk).
-- Plan: docs/superpowers/plans/2026-07-16-04g-C-news-beat-plan.md C1
-- Design: docs/superpowers/specs/2026-07-16-04g-C-news-beat-design.md §4 (data model)
-- Canon: projects/mafia_city_world_events/CATALOGUE_REPORT.md :280-546 (NEWS-BEAT, 12 templates)
--        docs/tech/04g_ambient_world_events_templates/news_beat_templates.md
-- R9.3: backported to docs/tech/09_data_model/schema_news_beat.md (NEW) + gdd/14 (REUSE flags lifted +
--       28 NEW rows) + gdd/15 (7 NEW terms) -- same commit.
-- Anti-fabrication: no Math.random(), no non-deterministic defaults.
-- Zero-regression: this migration is PURELY ADDITIVE -- no existing table/column/enum is touched (D1 --
--   unlike 04g-B's DD-RW1 3rd-parent surgery, this lot has NO effect_modifier parenty: news-beats are
--   reporting-only, they create zero world-state day-1, design §3.8/decisions D1).
-- GLOBAL engine tables: news_beat/news_thread/news_daily_run carry no player_id FK (the Brennar Daily
--   journal is THE SAME for every player -- decisions D14 "the feed is the SAME for the whole city",
--   contrast /v1/random-world/active's per-player building scoping).
-- Divergence entity canon assumed (design §4.1, decisions D13): `photo_id` is OMITTED from `news_beat` --
--   no photo pipeline exists day-1 and `photo_desk_mismatch` stays registry-only (anti-dead-column,
--   precedent 04g-A §4 "never a dead column"); the column lands additively alongside a future photo-desk
--   runtime. See docs/tech/09_data_model/schema_news_beat.md §4 for the full divergence note.
-- RENUMBER-AT-INTEGRATION -- DONE (2026-07-16): authored in-branch as 0129 (feat/04g-C @ base a27e5aa1,
--   C0 re-anchor confirmed 0129/NIGHTLY-29/TD-256+ free on 2026-07-16), RENUMBERED to 0130 at the 04g-C
--   integration. P3-D merged onto main first and took 0129_cue_annealing + NIGHTLY/29 + TD-256..262, so
--   04g-C's news_beat migration lands at the next-free 0130 (journal idx 130) -- documented mechanical
--   pattern (04f-B 0120->0124 / 04g-A 0125->0127 / 04g-B kept 0128), 04g-C merged SECOND, so it
--   renumbered (design §12/decisions D17). Tests reference table/enum/tunable NAMES + the migration hash
--   tag (now 0130_news_beat), never a bare order number.

--> statement-breakpoint

-- news_beat_category: the 5-member canon category enum (news_beat_templates.md :296). `sports` has no
-- fodder producer day-1 (design §3.3/§11.8, decisions D14) -- an honest unused enum member, not a
-- fabricated one (a future content-drop populates it; the enum stays canon-complete now).
CREATE TYPE "news_beat_category" AS ENUM (
  'national',
  'brennar_local',
  'business',
  'arts',
  'sports'
);

--> statement-breakpoint

-- news_thread_status: open -> concluded (design §3.4). `outcome` (news_thread.outcome, text) carries the
-- closed union of terminal reasons (saturated|half_life_expired|frame_locked|contested_persistent|
-- series_completed|displaced) -- NOT its own pgEnum (TS-side closed union, mirrors how
-- random_world_event_active.payload carries per-template outcome shapes without a dedicated enum per
-- outcome kind).
CREATE TYPE "news_thread_status" AS ENUM (
  'open',
  'concluded'
);

--> statement-breakpoint

-- news_thread: the multi-publication state shared by the 4 multi-day mechanics (cooper_affair frame
-- lifecycle, slow_page series, hindsight retrospective arc, three_outlet_storm salience race -- design
-- §3.4). Created BEFORE news_beat (below) so news_beat.thread_id can FK it. `district_id` RESTRICT
-- (NOT CASCADE) -- same posture as random_world_event_active.district_id (migration 0128): districts are
-- GLOBAL static rows, effectively never deleted, and an accidental district delete must never silently
-- cascade-delete a live news thread. `source_fodder_ref` carries the triggering fodder citation
-- ({sourceKind, refId} jsonb, design §3.3) for the 2 fodder-reactive templates (hindsight, three_outlet_
-- storm); NULL for the 2 keystones (cooper_affair triggers off ambient residue, not a single fodder row;
-- sourceless_beat triggers off ZERO fodder by definition, design §3.5.1/§3.5.2).
CREATE TABLE IF NOT EXISTS "news_thread" (
  "id"                   uuid               NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "template_id"          text               NOT NULL,
  "journalist_key"       text,
  "district_id"          integer
    REFERENCES "districts"("id") ON DELETE RESTRICT,
  "status"               news_thread_status NOT NULL DEFAULT 'open',
  "outcome"              text,
  "opened_at_game_day"   integer            NOT NULL,
  "payload"              jsonb              NOT NULL DEFAULT '{}'::jsonb,
  "source_fodder_ref"    jsonb,
  "created_at"           timestamptz        NOT NULL DEFAULT now()
);

--> statement-breakpoint

-- INDEX (status): the phase-2 advance scan (open threads due for a publication/decay step, C2+).
CREATE INDEX "news_thread_status_idx"
  ON "news_thread" ("status");

--> statement-breakpoint

-- INDEX (template_id, status): the per-template duplicate-inhibition gate (matrice :254 -- a thread of
-- the same template still OPEN skips a fresh trigger evaluation, C2+ phase 4).
CREATE INDEX "news_thread_template_status_idx"
  ON "news_thread" ("template_id", "status");

--> statement-breakpoint

-- INDEX (journalist_key, opened_at_game_day): the query-derived journalist track record (design §3.6 --
-- "framing track record … queryable later", <NewsBeatsDashboard> Scénario 2).
CREATE INDEX "news_thread_journalist_opened_idx"
  ON "news_thread" ("journalist_key", "opened_at_game_day");

--> statement-breakpoint

-- UNIQUE PARTIAL (template_id, source_fodder_ref->>'refId') WHERE template_id='hindsight': at most ONE
-- retrospective arc per resolved fodder event (design §4.2/§3.5.3 -- "a 2nd run does NOT create a 2nd
-- arc"). Partial (not a full unique index) because source_fodder_ref is NULL for the other 3 template
-- families and a plain UNIQUE would collide every NULL pair under some engines' semantics -- restricting
-- the index to template_id='hindsight' sidesteps that entirely (mirrors coupling_discovery_cascade's own
-- narrower-than-table-wide UNIQUE, migration 0128).
CREATE UNIQUE INDEX "news_thread_hindsight_source_fodder_ref_unique"
  ON "news_thread" ((("source_fodder_ref" ->> 'refId')))
  WHERE "template_id" = 'hindsight';

--> statement-breakpoint

GRANT UPDATE ON "news_thread" TO app_rw; -- SELECT/INSERT auto-grantés (0013) -- phase-2 advance (status/outcome/payload) UPDATE, C2+.

--> statement-breakpoint

-- news_beat: the published journal entries (city-global -- the Brennar Daily is the SAME journal for
-- every player, decisions D14). ONE-SHOT once inserted: unlike news_thread, a beat row is never mutated
-- after publish (a newspaper page does not get rewritten) -- hence NO GRANT UPDATE below (pure
-- append-only, mirrors coupling_discovery_cascade's own "never mutated after insert" posture, migration
-- 0128). `template_id` NULL = digest beat, template-less (design §3.2 phase 5/decisions D4 -- the daily
-- plancher's ~5 beats/day are narration of a cited fodder row, not a heavy special-mechanic template).
-- `thread_id` NULL = one-shot beat (digest / folded_page / wire_day) with no multi-publication state.
-- `district_id` RESTRICT -- same posture as news_thread.district_id above. `fodder_refs` is the ★
-- falsifiable agreggation contract (design §4.1): '[]' is LEGAL ONLY for sourceless_beat (the one
-- template that cites nothing by definition) -- every other beat MUST cite ≥1 real fodder row.
CREATE TABLE IF NOT EXISTS "news_beat" (
  "id"                     uuid              NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "game_day"               integer           NOT NULL,
  "thread_id"              uuid
    REFERENCES "news_thread"("id") ON DELETE SET NULL,
  "template_id"            text,
  "outlet_key"             text              NOT NULL,
  "journalist_key"         text,
  "district_id"            integer
    REFERENCES "districts"("id") ON DELETE RESTRICT,
  "beat_category"          news_beat_category NOT NULL,
  "frame"                  text,
  "headline_i18n_key"      text              NOT NULL,
  "body_i18n_key"          text              NOT NULL,
  "params"                 jsonb             NOT NULL DEFAULT '{}'::jsonb,
  "source_attribution"     jsonb             NOT NULL,
  "fodder_refs"            jsonb             NOT NULL DEFAULT '[]'::jsonb,
  "created_at"             timestamptz       NOT NULL DEFAULT now()
);

--> statement-breakpoint

-- INDEX (game_day): the daily-run digest scan + BO per-day listing.
CREATE INDEX "news_beat_game_day_idx"
  ON "news_beat" ("game_day");

--> statement-breakpoint

-- INDEX (template_id, created_at): the per-template persistence-window duplicate-inhibition gate
-- (design §3.2 phase 4 -- "a beat of the same template still in the persistence window" skip) + BO
-- template-usage aggregation.
CREATE INDEX "news_beat_template_created_idx"
  ON "news_beat" ("template_id", "created_at");

--> statement-breakpoint

-- INDEX (thread_id): thread -> its beats (BO thread detail, track record roll-up).
CREATE INDEX "news_beat_thread_idx"
  ON "news_beat" ("thread_id");

--> statement-breakpoint

-- INDEX (district_id, game_day): per-district BO history + the player feed's district filter (C6+).
CREATE INDEX "news_beat_district_game_day_idx"
  ON "news_beat" ("district_id", "game_day");

--> statement-breakpoint

-- news_daily_run: the daily-tick claim + diagnostics + rolling state ledger (design §4.3, mirrors
-- random_world_daily_run's own S6/S10 idempotency shape, migration 0128). PK game_day (not uuid) -- the
-- claim IS the row (INSERT … ON CONFLICT DO NOTHING, C2 phase 0). `fodder_counts`/`journalist_interest`
-- are ROLLING per-run/per-district vectors the NEXT day's tick reads back (design §3.2 phase 1/§3.5.6,
-- decisions D9 -- no dedicated float table for a vector this small, same reasoning as
-- random_world_daily_run.quorum_adoption).
CREATE TABLE IF NOT EXISTS "news_daily_run" (
  "game_day"                integer     NOT NULL PRIMARY KEY,
  "beats_generated_count"   smallint    NOT NULL DEFAULT 0,
  "template_counts"         jsonb       NOT NULL DEFAULT '{}'::jsonb,
  "wire_day"                boolean     NOT NULL DEFAULT false,
  "fodder_counts"           jsonb       NOT NULL DEFAULT '{}'::jsonb,
  "journalist_interest"     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  "created_at"              timestamptz NOT NULL DEFAULT now()
);

--> statement-breakpoint

GRANT UPDATE ON "news_daily_run" TO app_rw; -- SELECT/INSERT auto-grantés (0013) -- phase-6 counters UPDATE, C2+.
