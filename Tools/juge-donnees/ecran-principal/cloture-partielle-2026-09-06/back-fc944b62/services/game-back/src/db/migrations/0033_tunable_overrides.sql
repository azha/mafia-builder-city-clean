-- 0033_tunable_overrides.sql — system infra table `tunable_overrides` + NOTIFY trigger (Phase-23 T1).
--   PALIMPSEST §3.2 (forward-only).
-- IMPLEMENTS: docs/superpowers/specs/2026-06-10-phase-23-tunables-registry-design.md §4-T1 — the DB-backed tunables
--             override registry + the trigger-side invalidation (any writer — E2E psql, future two-person PUT,
--             liveops SQL — fires the NOTIFY; the app never has to cooperate). R9.3: this matches
--             src/db/schema/tunable_overrides.ts byte-for-byte. ONLY ADDS — no existing table/column/enum is
--             redefined or dropped: 1 NEW standalone infra table `tunable_overrides` (PK = `key` text). This is a
--             CREATE, NOT an ALTER: all previous tables are UNCHANGED (git diff = empty except this new table).
--             Unlike the 1-1 lieutenant children (0031/0032), this is a standalone key→value store owned by the
--             infra layer, not by the lieutenant hierarchy.
-- COLUMNS:
--   key         : the tunable key, e.g. 'T.lieutenant.autonomy_check_interval_ticks' (text, PK). Unique per
--                 override; absence = no override (the resolver falls back to env then gdd/14 default).
--   value       : the override value as a string (text, NOT NULL). Parsed by the typed getter in TunablesStore.
--   updated_at  : last mutation timestamp (timestamptz, DEFAULT now()). Bumped on INSERT OR UPDATE by writers;
--                 also used by the store's reload log to trace when the override was last written.
--   updated_by  : free-text audit identity of the writer (text, nullable). E.g. 'liveops:alice' or 'e2e.smoke'.
--                 NULL until set (no NOT NULL constraint — liveops psql patches may omit it day-1).
--   approval_ref: the two-person seam (future phase). The approval row UUID lands here without a re-migration.
--                 NULL until two-person PUT is wired (phase FUTURE / PUT /admin/tunables/* — TD-079, not P23). [DRIFT M-P23-TR-1 2026-06-12]
-- TRIGGER: tunable_overrides_notify — AFTER INSERT OR UPDATE OR DELETE FOR EACH ROW — fires pg_notify on
--          channel 'tunables_changed' with the affected key as payload. The TunablesStore (T2) subscribes via
--          a dedicated LISTEN client (the drizzle pool does not do LISTEN). Any writer triggers invalidation
--          automatically — the app never has to cooperate (the guarantee is at the DB layer, not the caller).
-- INDEX: NONE. tunable_overrides is read by the full-table SELECT at boot + reload (no per-key point-read path
--        in the hot path — the store snapshots the entire table into a Map); writes are infrequent (liveops /
--        PUT). No secondary index warranted day-1.
-- GRANT: app_rw needs UPDATE + DELETE on this NEW table — UPDATE for liveops override writes (read-modify-write
--        via PUT /admin/tunables/*), DELETE for override reverts. SELECT + INSERT come from the DEFAULT
--        PRIVILEGES set in 0013 §"ALTER DEFAULT PRIVILEGES FOR ROLE mafia" (covers tables created later), so
--        only the mutating UPDATE/DELETE are granted here (calque 0031/0032 — same inheritance pattern).
CREATE TABLE tunable_overrides (
  key          text        PRIMARY KEY,
  value        text        NOT NULL,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  updated_by   text,
  approval_ref uuid
);
--> statement-breakpoint
GRANT UPDATE, DELETE ON tunable_overrides TO app_rw;  -- SELECT/INSERT inherited from the table-wide default (0013).
--> statement-breakpoint

CREATE OR REPLACE FUNCTION notify_tunables_changed() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('tunables_changed', COALESCE(NEW.key, OLD.key));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

DROP TRIGGER IF EXISTS tunable_overrides_notify ON tunable_overrides;
--> statement-breakpoint
CREATE TRIGGER tunable_overrides_notify
  AFTER INSERT OR UPDATE OR DELETE ON tunable_overrides
  FOR EACH ROW EXECUTE FUNCTION notify_tunables_changed();
