-- migration 0131: template_library (04g-D C1 -- Template meta-layer + library foundation) -- 1 table +
-- 2 enums, mount-agnostic authored-reskin ARTIFACT only (no mount/instantiation column -- the mount
-- mechanism, Option A vs B, is under reconciliation and lands in C4, see decisions D1 / C0 re-anchor §4).
-- Plan: docs/superpowers/plans/2026-07-17-04g-D-meta-layer-plan.md C1
-- Design: docs/superpowers/specs/2026-07-17-04g-D-meta-layer-design.md §4 (data model)
-- Canon: docs/tech/04g_ambient_world_events_templates/template_launch_event_mapping.md,
--        projects/mafia_city_game/gdd/15_glossary.md:1919 (`EventReskin` entity, REUSE -- not re-coined).
-- R9.3: backported to docs/tech/09_data_model/schema_template_library.md (NEW) + gdd/14 (9 NEW rows +
--       7 REUSE flags lifted, first code reader + 2 T.db.event_reskin.* structural rows) + gdd/15
--       (1 NEW term, TemplateLibraryEntry) -- same commit.
-- Anti-fabrication: no Math.random(), no non-deterministic defaults.
-- Zero-regression: this migration is PURELY ADDITIVE -- no existing table/column/enum is touched (D5/D9
--   umbrella -- the 4 REUSE unions/registries this lot imports are NEVER edited).
-- ★ Mount-agnostic (explicit lot constraint, C0 re-anchor §4 finding): `event_reskin` carries NO
--   `mounted_event_id` FK, no mount-target column of any kind -- only `mount_ref` (jsonb, NULL until a
--   FUTURE chunk populates it). C4 (composer + mount adapter) reconciles D1 with the code-level reality
--   that `POST admin/liveops/schedule` cannot accept a brand-new eventId; this migration does not
--   pre-judge that outcome.
-- RENUMBER-AT-INTEGRATION note: authored branch-local as 0131 (feat/04g-D @ base 383b2931, C0 re-anchor
--   confirmed 0131/NIGHTLY-30 unclaimed/TD-273+ free on 2026-07-17). A parallel P3-E session may merge
--   onto main first and take 0131 -- if so, RENUMBER at the 04g-D merge-gate integration (documented
--   mechanical pattern, precedent 04f-B/04g-A/04g-C). Tests reference table/enum/tunable NAMES + the
--   migration hash tag (`0131_template_library`), never a bare order number.

--> statement-breakpoint

-- template_category: the 6-member canon category domain (gdd/15:1820 verbatim, design §3.1). Denormalized
-- onto event_reskin (template_home_category + host_category) for BO querying -- the source of truth for
-- category MEMBERSHIP of a given template_id is the static TemplateLibraryService aggregation (boot-
-- verified), not a DB FK (there is no per-template DB table -- the 60-template library is compiled TS,
-- same posture as the 04e/04g-A/B/C catalogues/registries this lot imports).
CREATE TYPE "template_category" AS ENUM (
  'POLITICAL',
  'NEWS_BEAT',
  'RANDOM_WORLD',
  'RECRUITMENT_QUEST',
  'ACHIEVEMENT_STRUCTURE',
  'LIVE_OPS'
);

--> statement-breakpoint

-- event_reskin_status: committed -> mounted | rejected (design §4.1, D10 -- no 'draft': the wizard is
-- stateless client-side until commit, so a row only ever appears already resolved to committed/rejected;
-- 'mounted' is reached later via an UPDATE once the LIVE_OPS mount adapter lands, C4).
CREATE TYPE "event_reskin_status" AS ENUM (
  'committed',
  'mounted',
  'rejected'
);

--> statement-breakpoint

-- event_reskin: the authored content-drop ARTIFACT (gdd/15:1919 `EventReskin` -- entity REUSE, not
-- re-coined here). GLOBAL, no player_id (an authoring-BO artifact, not per-player state -- mirrors
-- news_beat's own city-global posture). No FK to a "templates" table: the 60-template library is
-- compiled TS (design §3.2), same "soft-ref text column, no DB-side template table" posture as
-- random_world_event_active.template_id / news_beat.template_id / political_event_active.event_id.
-- `template_home_category`/`host_category` are DENORMALIZED (source of truth = the library aggregation,
-- boot-verified for consistency) -- purely a BO query convenience (design §4.1 "dénormalisé pour
-- requêtes BO"). `reskin_spec` is the full authored `ReskinSpec` payload (audit trail, canon). `status`
-- starts 'committed' or 'rejected' at INSERT time (D10) and MAY transition to 'mounted' via UPDATE later
-- (C4). `mount_ref` stays NULL until that UPDATE -- ★ NO mount-target FK column exists on this table
-- (C0 re-anchor §4 finding: the mount mechanism is under reconciliation, C4 scope, never pre-judged by
-- this schema). `created_by` is a soft-ref uuid (JWT-derived staff account id, never client-supplied --
-- mirrors anti_cheat.staff_id's own "soft-ref uuid, no FK" posture, accounts/staff_account DDL exists but
-- is not FK'd from operational modules in this codebase's convention).
CREATE TABLE IF NOT EXISTS "event_reskin" (
  "id"                       uuid                 NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id"                 text                 NOT NULL UNIQUE,
  "template_id"              text                 NOT NULL,
  "template_home_category"   template_category    NOT NULL,
  "host_category"            template_category    NOT NULL,
  "reskin_spec"              jsonb                NOT NULL,
  "status"                   event_reskin_status  NOT NULL,
  "rejection_reason"         text,
  "mount_ref"                jsonb,
  "created_by"               uuid                 NOT NULL,
  "created_at"               timestamptz          NOT NULL DEFAULT now(),
  "updated_at"               timestamptz          NOT NULL DEFAULT now()
);

--> statement-breakpoint

-- INDEX (status): the BO reskins-by-status listing (GET template-library/reskins?status=, C4) + the
-- AntiFOMO boot scan's "committed|mounted" filter (C3).
CREATE INDEX "event_reskin_status_idx"
  ON "event_reskin" ("status");

--> statement-breakpoint

-- INDEX (template_id): per-template BO lookup + the EventReskinValidator's event_id_taken cross-check
-- scoped view (C3).
CREATE INDEX "event_reskin_template_id_idx"
  ON "event_reskin" ("template_id");

--> statement-breakpoint

GRANT UPDATE ON "event_reskin" TO app_rw; -- SELECT/INSERT auto-grantés (0013) -- the C4 mount transition (status/mount_ref/updated_at) UPDATE.
