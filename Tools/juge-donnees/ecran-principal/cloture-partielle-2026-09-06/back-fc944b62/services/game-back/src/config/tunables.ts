// IMPLEMENTS: docs/tech/09_data_model/drizzle_setup_and_migrations.md§8 -- session:2026-06-02 --
//
// Infrastructure DB tunables (`T.db.pool.*` + `T.db.migration.*`).
//
// R2.3: numeric balance/config values live ONLY in the registry. The DEFAULT
// values below are the backported registry values from
// `projects/mafia_city_game/gdd/14_tunable_constants.md
//  §Infrastructure DB — Drizzle setup (T.db.pool.* + T.db.migration.*)`.
// They are surfaced here as the env-fallback defaults so the source stays a
// faithful mirror of the registry (single source of truth) and is overridable
// at runtime via env (hot-reloadable pool values — two-person-rule BO, F3).
//
// If the registry §Infrastructure DB values change, update this map in the
// SAME commit (R9.3 propagation: 09 schema ↔ gdd/14 ↔ code).
//
// Precedence: DB-override > env > default (Phase-23 TunablesStore).

import { TunablesStore } from './tunables-store';

/**
 * Resolved DB infrastructure tunables.
 *
 * Pool values map to `Pool` (node-postgres) → `DrizzleClient` (§2.2 / §5.1).
 * Migration values map to the `MigrationRunner` wrapper (§5.3, wired Task 4).
 * DB-override > env > default (Phase-23).
 */
export const dbTunables = {
  pool: {
    /** T.db.pool.min_connections
     *  BOOT-FROZEN: consumed at Pool construction (db/index.ts) — hot-reload requires a pool rebuild (out of scope; T8 report). */
    get minConnections(): number {
      return TunablesStore.resolveInt('T.db.pool.min_connections', 'DB_POOL_MIN', 2);
    },
    /** T.db.pool.max_connections
     *  BOOT-FROZEN: consumed at Pool construction (db/index.ts) — hot-reload requires a pool rebuild (out of scope; T8 report). */
    get maxConnections(): number {
      return TunablesStore.resolveInt('T.db.pool.max_connections', 'DB_POOL_MAX', 20);
    },
    /** T.db.pool.idle_timeout_ms
     *  BOOT-FROZEN: consumed at Pool construction (db/index.ts) — hot-reload requires a pool rebuild (out of scope; T8 report). */
    get idleTimeoutMs(): number {
      return TunablesStore.resolveInt('T.db.pool.idle_timeout_ms', 'DB_POOL_IDLE_MS', 30000);
    },
    /** T.db.pool.statement_timeout_ms
     *  BOOT-FROZEN: consumed at Pool construction (db/index.ts) — hot-reload requires a pool rebuild (out of scope; T8 report). */
    get statementTimeoutMs(): number {
      return TunablesStore.resolveInt('T.db.pool.statement_timeout_ms', 'DB_STATEMENT_TIMEOUT_MS', 5000);
    },
  },
  migration: {
    /** T.db.migration.lock_timeout_ms — (DB-override > env > default — Phase-23). */
    get lockTimeoutMs(): number {
      return TunablesStore.resolveInt('T.db.migration.lock_timeout_ms', 'DB_MIGRATION_LOCK_TIMEOUT_MS', 10000);
    },
    /** T.db.migration.retry_max_attempts — (DB-override > env > default — Phase-23). */
    get retryMaxAttempts(): number {
      return TunablesStore.resolveInt('T.db.migration.retry_max_attempts', 'DB_MIGRATION_RETRY_MAX_ATTEMPTS', 3);
    },
    /** T.db.migration.retry_backoff_ms — (DB-override > env > default — Phase-23). */
    get retryBackoffMs(): number {
      return TunablesStore.resolveInt('T.db.migration.retry_backoff_ms', 'DB_MIGRATION_RETRY_BACKOFF_MS', 2000);
    },
  },
};
