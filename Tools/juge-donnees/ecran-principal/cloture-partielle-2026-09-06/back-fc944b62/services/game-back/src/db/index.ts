// IMPLEMENTS: docs/tech/09_data_model/drizzle_setup_and_migrations.md§2.2 + §5.2 -- session:2026-06-02 --
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import IORedis from 'ioredis';
import * as schema from './schema'; // re-export agrégé (cf. §2.3)

import { dbTunables } from '../config/tunables';

// `DrizzleClient` = NEW type alias (cf. §9 Glossary).
export type DrizzleClient = ReturnType<typeof drizzle<typeof schema>>;

// Postgres APP-RUNTIME connection pool (node-postgres `Pool`). Drizzle s'appuie dessus,
// ne ré-implémente pas de pool propriétaire (§5.1). Pool sizing/timeouts =
// `T.db.pool.*` via `dbTunables` (R2.3 — jamais inline ; defaults gdd/14
// §Infrastructure DB — Drizzle setup). Hot-reloadables via BO two-person rule.
//
// SECURITY (review S1-2): `DATABASE_URL` points at the LEAST-PRIVILEGE role `app_rw`
// (NOSUPERUSER, owns nothing). This is what makes the append-only `REVOKE UPDATE, DELETE`
// on admin_audit_log / enforcement_action / telemetry_event actually bite at runtime —
// a superuser/owner connection would silently bypass those ACLs. DDL (migrations) runs on
// a SEPARATE admin connection (`adminPool` below, MIGRATION_DATABASE_URL = role `mafia`).
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  min: dbTunables.pool.minConnections, // T.db.pool.min_connections
  max: dbTunables.pool.maxConnections, // T.db.pool.max_connections
  idleTimeoutMillis: dbTunables.pool.idleTimeoutMs, // T.db.pool.idle_timeout_ms
  statement_timeout: dbTunables.pool.statementTimeoutMs, // T.db.pool.statement_timeout_ms
});

export const db: DrizzleClient = drizzle(pool, { schema });

// Postgres MIGRATION-ADMIN connection pool — used ONLY by the boot-time MigrationRunner
// (and `db:migrate` CLI) to apply DDL (CREATE/ALTER/GRANT, incl. provisioning `app_rw` in
// 0013). Connects as the owner/DDL role via `MIGRATION_DATABASE_URL` (role `mafia`), which
// the app pool must NOT use. Falls back to DATABASE_URL only if MIGRATION_DATABASE_URL is
// unset (single-URL legacy / local convenience), but in the dockerized stack the two are
// distinct (compose wires both). Small + short-lived: migrations are sequential at boot.
export const adminPool = new Pool({
  connectionString: process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL,
  max: 1,
});

// Redis client (hot tier). REUSE pattern Redis hot + PG durable documenté
// upstream `docs/tech/18_api_protocol/idempotency.md §Stockage` (§5.2).
// `ioredis` : standard NestJS/Node, Cluster/Sentinel natif, types TS first-class.
export const redis = new IORedis(process.env.REDIS_URL ?? '', {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  connectTimeout: 5000,
});
