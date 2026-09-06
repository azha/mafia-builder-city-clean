-- 0014_account_and_auth.sql — chapter 17 OWNS account/staff_account/account_credential/auth_session.
-- IMPLEMENTS: 17/identity_model.md §Composites + §Invariants ; 17/session_management.md §SessionRecord ;
--             17/authorization_rbac.md §Rôles canoniques (StaffRoleEnum). PALIMPSEST §3.2 (forward-only).
-- The `SET lock_timeout` header is injected PER FILE by the MigrationRunner (09 §5.3), not here.
-- uuidv7() is provided by 0000_init.sql ; gen_random_uuid() (pgcrypto) also available.
--
-- 09 RELATIONSHIP (R9.3): 09 explicitly DEFERS `account` to chapter 17 (schema_player.md §1/§7.2/§7.3).
-- This migration MATERIALIZES it and closes the player→account FK that 0001 left commented. No 09
-- schema file is edited (PALIMPSEST forward-only) — the deferred constraint is added here.

-- ===== Enums PG natifs (mirror 17 composite member names) =====
CREATE TYPE "account_kind" AS ENUM ('PLAYER', 'STAFF', 'SERVICE');
--> statement-breakpoint
-- CANONICAL StaffRoleEnum (authorization_rbac.md §Rôles canoniques). NO `ops` role.
CREATE TYPE "staff_role" AS ENUM ('player', 'player_support', 'gm', 'admin', 'super_admin');
--> statement-breakpoint
-- Documented union: player states + staff states (identity_model.md §Cycle de vie).
CREATE TYPE "account_lifecycle_state" AS ENUM (
  'PENDING_VERIFICATION', 'ACTIVE', 'DORMANT', 'SUSPENDED', 'BANNED', 'DELETED_TOMBSTONE',
  'PENDING', 'LOCKED', 'OFFBOARDED'
);
--> statement-breakpoint
-- AudienceEnum (session_management.md §Composites ; R-SM-3 isolation).
CREATE TYPE "audience" AS ENUM ('GAME_BACK', 'BO_BACK', 'INTERNAL_BUS');
--> statement-breakpoint
-- SessionStateEnum (session_management.md §SessionRecord.lifecycle).
CREATE TYPE "auth_session_state" AS ENUM ('ACTIVE', 'IDLE', 'REVOKED', 'EXPIRED');
--> statement-breakpoint
-- Skeleton credential kind — PASSWORD only (Option A). OAUTH/TOTP DEFERRED.
CREATE TYPE "credential_kind" AS ENUM ('PASSWORD');
--> statement-breakpoint

-- ===== Table 1 : account — canonical identity anchor (identity_model.md §Invariants 1/2) =====
CREATE TABLE "account" (
  "account_id"      uuid                    PRIMARY KEY DEFAULT uuidv7(),
  "kind"            account_kind            NOT NULL,
  "lifecycle_state" account_lifecycle_state NOT NULL,
  "created_at"      timestamptz             NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- ===== Close the DEFERRED player→account FK (0001 left it commented; 09 specified it, schema_player.md §7.2/§7.3) =====
-- ON DELETE RESTRICT: a player row pins its account (no orphan player, no silent account delete).
ALTER TABLE "player" ADD CONSTRAINT "player_account_fk"
  FOREIGN KEY ("account_id") REFERENCES "account"("account_id") ON DELETE RESTRICT;
--> statement-breakpoint

-- ===== Table 2 : staff_account — 1-1 with account (STAFF only ; identity_model.md §StaffAccount) =====
CREATE TABLE "staff_account" (
  "account_id"          uuid         PRIMARY KEY REFERENCES "account"("account_id") ON DELETE CASCADE,
  "email_pro"           varchar(255) NOT NULL UNIQUE,
  "full_name_for_audit" varchar(255) NOT NULL,
  "role"                staff_role   NOT NULL,
  "created_at"          timestamptz  NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- ===== Table 3 : account_credential — secrets SEPARATED (identity_model §Invariant 3) =====
-- One PASSWORD credential per account in the skeleton (PK on account_id). Hash only.
CREATE TABLE "account_credential" (
  "account_id"      uuid           PRIMARY KEY REFERENCES "account"("account_id") ON DELETE CASCADE,
  "credential_kind" credential_kind NOT NULL DEFAULT 'PASSWORD',
  "password_hash"   text           NOT NULL,
  "created_at"      timestamptz    NOT NULL DEFAULT now(),
  "updated_at"      timestamptz    NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- ===== Table 4 : auth_session — the SessionRecord (session_management.md §Composites) =====
-- DISTINCT from gameplay_sessions (09). audience-bound (R-SM-3). Rotation/replay/eviction DEFERRED.
CREATE TABLE "auth_session" (
  "session_id"          uuid               PRIMARY KEY DEFAULT uuidv7(),
  "account_id"          uuid               NOT NULL REFERENCES "account"("account_id") ON DELETE CASCADE,
  "audience"            audience           NOT NULL,
  "state"               auth_session_state NOT NULL DEFAULT 'ACTIVE',
  "access_jti"          uuid               NOT NULL,
  "refresh_handle_hash" text,
  "rotation_count"      integer            NOT NULL DEFAULT 0,
  "established_at"      timestamptz        NOT NULL DEFAULT now(),
  "last_active_at"      timestamptz,
  "access_expires_at"   timestamptz,
  "refresh_expires_at"  timestamptz,
  "revoked_at"          timestamptz
);
--> statement-breakpoint
CREATE INDEX "auth_session_account_idx"       ON "auth_session" ("account_id");
--> statement-breakpoint
CREATE INDEX "auth_session_account_state_idx" ON "auth_session" ("account_id", "state");
--> statement-breakpoint

-- ===== app_rw grants (CRITICAL — see 0013_app_role.sql) =====
-- ALTER DEFAULT PRIVILEGES (0013) auto-grants SELECT+INSERT to these new tables (owned by `mafia`).
-- But auth tables are MUTABLE (lifecycle transitions, password updates, session state/rotation), so
-- the app (connecting as app_rw, NOT owner) needs UPDATE+DELETE explicitly — without this, runtime
-- UPDATEs fail with permission denied. These 4 tables are NOT append-only (unlike the audit registries).
GRANT UPDATE, DELETE ON "account", "staff_account", "account_credential", "auth_session" TO app_rw;
