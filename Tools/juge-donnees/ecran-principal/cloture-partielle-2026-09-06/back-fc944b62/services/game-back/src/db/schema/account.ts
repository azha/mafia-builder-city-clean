// IMPLEMENTS: docs/tech/17_auth_and_accounts/identity_model.md §Composites des trois types d'identité
//             + docs/tech/17_auth_and_accounts/session_management.md §Composites de session (SessionRecord)
//             + docs/tech/17_auth_and_accounts/authorization_rbac.md §Rôles canoniques (StaffRoleEnum)
//             -- session:2026-06-02 (Phase 0 Task 6) --
//
// Chapter 17 OWNS these tables (09 explicitly DEFERS `account` to 17 — see
// schema_player.md §1 REUSE / §7.2-§7.3). This is NOT a 09 redefinition (R9.3):
// the only 09 touch is closing the deferred `player.account_id` FK in migration
// 0014, which 09 itself specified. The hand-authored DDL lives in
// `migrations/0014_account_and_auth.sql`; this file is the Drizzle TS mirror so
// the ORM `db` client is type-aware of the new tables (parity with the 09 schema
// files). FK to `player`/`account` is expressed in the SQL migration, not via
// `.references()` here, to avoid a forward import cycle (pattern accepted by the
// 09 schema files for the player↔account edge).
//
// ============================================================================
// SKELETON SCOPE (Phase 0 Task 6) — what is HERE:
//   - `account` canonical identity anchor (account_id PK, kind, lifecycle_state).
//   - `staff_account` 1-1 detail (STAFF only) — invariant R-IM-1: three DISJOINT
//     entities (PlayerAccount / StaffAccount / ServiceAccount); player identity
//     facet stays in `player` (callsign=handle + email), staff facet here.
//   - `account_credential` — secrets SEPARATED (invariant identity_model §Invariant 3):
//     no public composite carries a credential; PASSWORD hash lives only here.
//   - `auth_session` = the SessionRecord (session_management.md §Composites) —
//     DISTINCT from `gameplay_sessions` (09 sessions_and_audit). auth session ≠
//     gameplay session: different lifecycle, different audience, token-bearing.
//
// DEFERRED (explicitly OUT OF SCOPE — later phases pick these up):
//   - ServiceAccount table + credential rotation (identity_model §ServiceAccount).
//   - 2FA (TotpCredential / twofa_state columns), OAuthCredential, recovery codes.
//   - device_anchor / multi-device eviction, geo_context, reconnect_context
//     (columns present on auth_session are minimal; the eviction POLICY is deferred).
//   - refresh rotation chain / consumed_at / rotation_chain_id replay detection,
//     JTI blacklist, SessionsJanitor (session_management §Rotation/§Révocation).
//   - ScopeGrantSnapshot / scope_grant_ref / rbac_matrix.json / @RequirePermission
//     (authorization_rbac.md) — the skeleton embeds the staff `role` DIRECTLY in
//     the JWT claims instead of a scope-grant snapshot ref.
//   - dedicated DB users db_user_accounts / db_user_sessions, network segmentation.
//   - GDPR tombstone purge job, email verification + MailSender, password reset.
// ============================================================================

import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ===== Enums PG natifs (mirror the spec composite member names) =====

// identity_model.md §Relations — AccountRef { kind: AccountKindEnum }.
// PLAYER | STAFF | SERVICE (SERVICE present for completeness; no SERVICE rows in skeleton).
export const accountKind = pgEnum('account_kind', ['PLAYER', 'STAFF', 'SERVICE']);

// authorization_rbac.md §Rôles canoniques — CANONICAL StaffRoleEnum.
// There is NO `ops` role: the plan's informal "ops" reconciles to a STAFF account
// (any canonical staff role). `player` is the implicit role of a PlayerAccount.
export const staffRole = pgEnum('staff_role', [
  'player',
  'player_support',
  'gm',
  'admin',
  'super_admin',
]);

// identity_model.md §Cycle de vie — documented UNION covering player + staff states.
// Player: PENDING_VERIFICATION | ACTIVE | DORMANT | SUSPENDED | BANNED | DELETED_TOMBSTONE
// Staff:  PENDING | ACTIVE | LOCKED | SUSPENDED | OFFBOARDED
// (ACTIVE/SUSPENDED shared; the rest are kind-specific — one enum, documented.)
export const accountLifecycleState = pgEnum('account_lifecycle_state', [
  'PENDING_VERIFICATION',
  'ACTIVE',
  'DORMANT',
  'SUSPENDED',
  'BANNED',
  'DELETED_TOMBSTONE',
  'PENDING',
  'LOCKED',
  'OFFBOARDED',
]);

// session_management.md §Composites — AudienceEnum. R-SM-3 audience isolation:
// a GAME_BACK token can NEVER authenticate on BO_BACK and vice-versa.
export const audience = pgEnum('audience', ['GAME_BACK', 'BO_BACK', 'INTERNAL_BUS']);

// session_management.md §SessionRecord.lifecycle — SessionStateEnum.
export const authSessionState = pgEnum('auth_session_state', [
  'ACTIVE',
  'IDLE',
  'REVOKED',
  'EXPIRED',
]);

// Skeleton credential kind — PASSWORD only (Option A email+password,
// authentication_flows.md §Options). OAUTH/TOTP/WEBAUTHN DEFERRED.
export const credentialKind = pgEnum('credential_kind', ['PASSWORD']);

// ===== Table 1 : account — canonical identity anchor (identity_model.md §Invariants 1/2) =====
// `account_id` is the immutable UUID FK target for the whole domain (R-IM-2: business
// tables FK on account_id, never on email/handle). `player.account_id` and
// `admin_audit_log.admin_user_id` reference this. NO email/handle here — the player
// identity facet lives in `player` (09), the staff facet in `staff_account`.
export const account = pgTable(
  'account',
  {
    account_id: uuid('account_id').primaryKey().default(sql`uuidv7()`),
    kind: accountKind('kind').notNull(),
    lifecycle_state: accountLifecycleState('lifecycle_state').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
);

// ===== Table 2 : staff_account — StaffAccount detail, 1-1 with account (STAFF only) =====
// identity_model.md §StaffAccount: email_pro OBLIGATOIRE, full_name_for_audit, role.
// 2FA fields (twofa_state) + team + assigned_by/assigned_at + staff_links_player_account_id
// are DEFERRED (skeleton needs only role + identity for the StaffRoleGuard E2E).
export const staffAccount = pgTable(
  'staff_account',
  {
    account_id: uuid('account_id').primaryKey(), // FK → account(account_id) ON DELETE CASCADE (in SQL)
    // UNIQUE in SQL (column-level constraint → implicit unique index). email_pro OBLIGATOIRE for staff.
    email_pro: varchar('email_pro', { length: 255 }).notNull().unique(),
    full_name_for_audit: varchar('full_name_for_audit', { length: 255 }).notNull(),
    role: staffRole('role').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
);

// ===== Table 3 : account_credential — secrets SEPARATED (identity_model §Invariant 3) =====
// One PASSWORD credential per account in the skeleton (PK on account_id). Hash only —
// the plaintext NEVER touches the DB. Other credential kinds (OAUTH/TOTP) DEFERRED.
export const accountCredential = pgTable(
  'account_credential',
  {
    account_id: uuid('account_id').primaryKey(), // FK → account(account_id) ON DELETE CASCADE (in SQL)
    credential_kind: credentialKind('credential_kind').notNull().default('PASSWORD'),
    password_hash: text('password_hash').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
);

// ===== Table 4 : auth_session — the SessionRecord (session_management.md §Composites) =====
// DISTINCT from gameplay_sessions (09). audience-bound (R-SM-3). Columns for the
// token-pair state (access_jti, refresh_handle_hash, rotation_count) + lifecycle
// (state, established_at, last_active_at, *_expires_at, revoked_at) are present;
// the rotation/replay/eviction POLICY is DEFERRED (columns exist, logic later).
export const authSession = pgTable(
  'auth_session',
  {
    session_id: uuid('session_id').primaryKey().default(sql`uuidv7()`),
    account_id: uuid('account_id').notNull(), // FK → account(account_id) ON DELETE CASCADE (in SQL)
    audience: audience('audience').notNull(),
    state: authSessionState('state').notNull().default('ACTIVE'),
    access_jti: uuid('access_jti').notNull(),
    refresh_handle_hash: text('refresh_handle_hash'),
    rotation_count: integer('rotation_count').notNull().default(0),
    established_at: timestamp('established_at', { withTimezone: true }).notNull().defaultNow(),
    last_active_at: timestamp('last_active_at', { withTimezone: true }),
    access_expires_at: timestamp('access_expires_at', { withTimezone: true }),
    refresh_expires_at: timestamp('refresh_expires_at', { withTimezone: true }),
    revoked_at: timestamp('revoked_at', { withTimezone: true }),
  },
  (table) => ({
    account_idx: index('auth_session_account_idx').on(table.account_id),
    account_state_idx: index('auth_session_account_state_idx').on(table.account_id, table.state),
  }),
);

// Inferred Drizzle types — REUSE by the auth module services.
export type AccountRow = typeof account.$inferSelect;
export type AccountInsert = typeof account.$inferInsert;
export type StaffAccountRow = typeof staffAccount.$inferSelect;
export type StaffAccountInsert = typeof staffAccount.$inferInsert;
export type AccountCredentialRow = typeof accountCredential.$inferSelect;
export type AccountCredentialInsert = typeof accountCredential.$inferInsert;
export type AuthSessionRow = typeof authSession.$inferSelect;
export type AuthSessionInsert = typeof authSession.$inferInsert;
