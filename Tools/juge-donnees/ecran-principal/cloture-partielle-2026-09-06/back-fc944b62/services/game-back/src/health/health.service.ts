// IMPLEMENTS: docs/tech/09_data_model/drizzle_setup_and_migrations.md§6 + §9 -- session:2026-06-02 --
import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type Redis from 'ioredis';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { DB, REDIS } from '../db/db.module';
import type { DrizzleClient } from '../db/index';

/** Aggregate health states (§6.3). */
export type HealthStatus = 'ok' | 'degraded' | 'down';

export interface ProbeResult {
  ok: boolean;
  /** Optional human-readable detail (error message on failure). */
  error?: string;
}

export interface MigrationsProbeResult extends ProbeResult {
  /** Number of migrations recorded in `__drizzle_migrations` (0 if table absent). */
  applied: number;
  /** Number of migrations expected per the shipped `meta/_journal.json` (0 if none). */
  expected: number;
}

export interface HealthDetails {
  postgres: ProbeResult;
  redis: ProbeResult;
  migrations: MigrationsProbeResult;
}

export interface HealthReport {
  status: HealthStatus;
  details: HealthDetails;
}

/**
 * `HealthService` (NEW, §9) — full-maison aggregator of the three mandatory
 * probes (§6.1), NO `@nestjs/terminus` dependency (decision §6.1 / §9).
 *
 * Sondes (run sequentially, §6.1):
 *   1. Postgres — `SELECT 1` via `db.execute(sql\`SELECT 1\`)`. Fail → `down`.
 *   2. Redis    — `redis.ping()` expects `PONG`. Fail → `degraded` (Redis is a
 *                 reconstructible hot tier; durable PG writes can still proceed).
 *   3. Migrations — compare `__drizzle_migrations` (applied) against the shipped
 *                 `meta/_journal.json` (expected). Mismatch (binary ahead of DB)
 *                 → `down`. See `checkMigrations()` for the pre-Task-4 tolerance.
 */
@Injectable()
export class HealthService {
  /**
   * Location of the drizzle migrations folder relative to this file at runtime
   * (`dist/health/health.service.js` → `dist/db/migrations/meta/_journal.json`).
   * Pre-Task-4 the folder is not generated nor COPYied into the image (§7 Docker
   * "COPY src/db/migrations/" lands with Task 4) — `checkMigrations()` tolerates
   * its absence gracefully.
   */
  private readonly journalPath = path.resolve(
    __dirname,
    '..',
    'db',
    'migrations',
    'meta',
    '_journal.json',
  );

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  /** Probe 1 (§6.1) — Postgres `SELECT 1`. Fail → caller maps to `down`. */
  async checkPostgres(): Promise<ProbeResult> {
    try {
      await this.db.execute(sql`SELECT 1`);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errMsg(err) };
    }
  }

  /** Probe 2 (§6.1) — Redis `ping()` expecting `PONG`. Fail → caller maps to `degraded`. */
  async checkRedis(): Promise<ProbeResult> {
    try {
      const pong = await this.redis.ping();
      if (pong !== 'PONG') {
        return { ok: false, error: `unexpected ping reply: ${pong}` };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errMsg(err) };
    }
  }

  /**
   * Probe 3 (§6.1) — Migrations status. Compares the count recorded in the
   * `__drizzle_migrations` tracking table (applied) against the entries in the
   * shipped `meta/_journal.json` (expected).
   *
   * A *mismatch* — the binary expects more migrations than the DB has applied
   * (binary ahead of DB → schema drift risk) — is `down` (§6.1 pt 3).
   *
   * PRE-TASK-4 TOLERANCE: this service ships BEFORE migrations 0000-0012. With
   * 0 migrations generated:
   *   - `__drizzle_migrations` does not exist yet → reading it raises
   *     `relation ... does not exist` → treated as `applied = 0` (NOT an error).
   *   - `meta/_journal.json` is not shipped in the image → treated as
   *     `expected = 0` (empty journal).
   *   "0 expected / 0 applied" is NOT a mismatch — it is the legitimate
   *   pre-migration state, so we report `ok:true`. Once Task 4 lands real
   *   migrations, both counts become >0 and `applied < expected` flips to `down`.
   */
  async checkMigrations(): Promise<MigrationsProbeResult> {
    const expected = this.readExpectedFromJournal();
    const applied = await this.readAppliedCount();

    // Binary ahead of DB (fewer applied than expected) → mismatch → down (§6.1).
    if (applied < expected) {
      return {
        ok: false,
        applied,
        expected,
        error: `migration mismatch: applied=${applied} < expected=${expected} (binary ahead of DB)`,
      };
    }

    // applied >= expected (incl. the pre-Task-4 0/0 state) → ok.
    return { ok: true, applied, expected };
  }

  /** §6.3 — aggregate the three probes into `{status, details}`. */
  async aggregate(): Promise<HealthReport> {
    // INTENTIONAL divergence from §6.1's wording "exécutées séquentiellement": the three probes are
    // independent (no probe's result feeds another), so we run them in parallel via Promise.all for
    // lower /health latency. §6.1 "séquentiellement" describes the documented ordering of the probe
    // list, not a hard dependency chain; parallel evaluation preserves the same aggregation semantics
    // (postgres|migrations fail → down ; redis-only fail → degraded). Folded T2/T3 review note.
    const [postgres, redis, migrations] = await Promise.all([
      this.checkPostgres(),
      this.checkRedis(),
      this.checkMigrations(),
    ]);

    let status: HealthStatus = 'ok';
    // Postgres or migrations failure → down (durable layer compromised, §6.1).
    if (!postgres.ok || !migrations.ok) {
      status = 'down';
    } else if (!redis.ok) {
      // Redis-only failure → degraded (hot tier reconstructible, §6.1 pt 2).
      status = 'degraded';
    }

    return { status, details: { postgres, redis, migrations } };
  }

  /**
   * Count migrations applied in `__drizzle_migrations`. Returns 0 when the
   * tracking table does not exist yet (pre-Task-4) — caught, not thrown.
   */
  private async readAppliedCount(): Promise<number> {
    try {
      const result = await this.db.execute(
        sql`SELECT count(*)::int AS count FROM "drizzle"."__drizzle_migrations"`,
      );
      const rows = extractRows(result);
      const count = rows[0]?.count;
      return typeof count === 'number' ? count : Number(count ?? 0);
    } catch {
      // Table absent (relation does not exist) pre-Task-4, or any read error:
      // treat as 0 applied. A genuine PG outage is already surfaced as `down`
      // by checkPostgres(); here we only need the applied count.
      return 0;
    }
  }

  /**
   * Count migration entries in the shipped `meta/_journal.json`. Returns 0 when
   * the file is absent (pre-Task-4, not yet COPYied into the image — §7 Docker).
   */
  private readExpectedFromJournal(): number {
    try {
      const raw = fs.readFileSync(this.journalPath, 'utf-8');
      const journal = JSON.parse(raw) as { entries?: unknown[] };
      return Array.isArray(journal.entries) ? journal.entries.length : 0;
    } catch {
      return 0;
    }
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * node-postgres returns `{ rows: [...] }` from `db.execute`. Narrow defensively
 * since drizzle's execute return type varies by driver.
 */
function extractRows(result: unknown): Array<Record<string, unknown>> {
  if (
    result !== null &&
    typeof result === 'object' &&
    'rows' in result &&
    Array.isArray((result as { rows: unknown[] }).rows)
  ) {
    return (result as { rows: Array<Record<string, unknown>> }).rows;
  }
  return [];
}
