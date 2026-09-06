-- 0013_app_role.sql — least-privilege runtime role `app_rw` (review S1-2). PALIMPSEST §3.2.
--
-- WHY: migrations 0010/0011/0012 ship `REVOKE UPDATE, DELETE … FROM PUBLIC` on the three
-- append-only registries (admin_audit_log+leaves, enforcement_action, telemetry_event+leaves)
-- to make them immutable (REUSE 17 audit_trail.md §R-AT-1 + persistence_rules.md §6.4). That
-- REVOKE is COSMETIC if the app connects as a SUPERUSER and/or the table OWNER: both bypass
-- ACL checks entirely. Until now the app connected as role `mafia` (superuser + owner), so
-- `UPDATE enforcement_action` / `DELETE FROM admin_audit_log` succeeded — the immutability
-- invariant was unenforced at runtime.
--
-- FIX: provision the least-privilege role the spec assumed all along
-- (persistence_rules.md §6.4 `<db_user_app>` + schema_sessions_and_audit.md §3/§7.1 +
-- schema_telemetry_event.md §3). The MigrationRunner keeps running as `mafia` (owner/DDL,
-- MIGRATION_DATABASE_URL); the Nest app pool connects as `app_rw` (DATABASE_URL). `app_rw` is
-- NOSUPERUSER and owns nothing, so the REVOKEs above now bite: append-only is ENFORCED.
--
-- SECRET HANDLING: the password is NOT hardcoded here. The MigrationRunner sets the session GUC
-- `app.app_rw_password` from env `APP_DB_PASSWORD` (`SET LOCAL` inside the migration tx) before
-- applying this file; the DO block below reads it via current_setting() and injects it with
-- `format(... %L ...)` (literal-quoted — no SQL injection). A committed `.sql` thus carries no
-- credential (R-SH: never bake secrets into images/source).
--
-- APPEND-ONLY BY DEFAULT: we GRANT SELECT/INSERT broadly, then GRANT UPDATE/DELETE ONLY on the
-- non-append-only tables. The append-only registries (and their partition leaves) are deliberately
-- left WITHOUT UPDATE/DELETE for app_rw. ALTER DEFAULT PRIVILEGES grants future tables/partitions
-- (created later by the maintenance cron, owned by `mafia`) only SELECT/INSERT — so newly-rotated
-- partitions of admin_audit_log / telemetry_event REMAIN append-only for app_rw with no follow-up.

-- ===== Role bootstrap (idempotent: CREATE ROLE is cluster-scoped, may pre-exist on a reused volume) =====
DO $$
DECLARE
  pw text := current_setting('app.app_rw_password', true);
BEGIN
  IF pw IS NULL OR length(pw) = 0 THEN
    RAISE EXCEPTION 'app.app_rw_password GUC is empty — MigrationRunner must SET it from APP_DB_PASSWORD before 0013';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_rw') THEN
    EXECUTE format('CREATE ROLE app_rw LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD %L', pw);
  ELSE
    -- Keep the password in sync with the injected secret on re-runs / rotation.
    EXECUTE format('ALTER ROLE app_rw LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD %L', pw);
  END IF;
END
$$;
--> statement-breakpoint

-- ===== Schema usage (public = app tables ; drizzle = migrations ledger read by HealthService probe) =====
GRANT USAGE ON SCHEMA "public"  TO app_rw;
--> statement-breakpoint
GRANT USAGE ON SCHEMA "drizzle" TO app_rw;
--> statement-breakpoint

-- ===== Read + append everywhere (SELECT/INSERT on every existing public table, incl. append-only) =====
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA "public" TO app_rw;
--> statement-breakpoint
-- HealthService.checkMigrations() reads drizzle.__drizzle_migrations as app_rw (§6.1).
GRANT SELECT ON ALL TABLES IN SCHEMA "drizzle" TO app_rw;
--> statement-breakpoint

-- ===== Mutate only NON-append-only tables (UPDATE/DELETE). The 3 registries + their partition =====
-- ===== leaves are intentionally OMITTED, so they stay append-only for app_rw (REVOKE bites). =====
GRANT UPDATE, DELETE ON
  "player",
  "player_progression_state",
  "mastery_score",
  "economy_states",
  "iap_transactions",
  "behavior_script",
  "lieutenant",
  "lieutenant_cue_registry",
  "lieutenant_task_exposure",
  "standing_order",
  "jurisdiction_boundary",
  "veto_assignment",
  "district_cohesion",
  "precinct_memory",
  "patrol_observation_queues",
  "inspection_queues",
  "buildings",
  "deal_leks",
  "rival_state",
  "laundering_nodes",
  "laundering_edges",
  "safehouses",
  "tail_risk_estimates",
  "exception_queue",
  "cue_stacks",
  "autonomy_reports",
  "constraint_log",
  "possibility_horizon_cards",
  "recurrence_logs",
  "structural_decisions_audit",
  "rich_citizens",
  "gameplay_sessions",
  "cheat_flag",
  "appeal_case"
TO app_rw;
--> statement-breakpoint

-- ===== Sequences (serial/identity defaults the app may touch on INSERT) =====
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "public" TO app_rw;
--> statement-breakpoint

-- ===== Future objects created by `mafia` (the migration-admin / maintenance-cron role) =====
-- Default = SELECT + INSERT only. This makes EVERY future partition leaf of admin_audit_log /
-- telemetry_event append-only for app_rw automatically (no per-partition follow-up GRANT/REVOKE).
-- Normal future tables get explicit UPDATE/DELETE in their own migration if/when mutable.
ALTER DEFAULT PRIVILEGES FOR ROLE mafia IN SCHEMA "public"
  GRANT SELECT, INSERT ON TABLES TO app_rw;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE mafia IN SCHEMA "public"
  GRANT USAGE, SELECT ON SEQUENCES TO app_rw;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE mafia IN SCHEMA "drizzle"
  GRANT SELECT ON TABLES TO app_rw;
