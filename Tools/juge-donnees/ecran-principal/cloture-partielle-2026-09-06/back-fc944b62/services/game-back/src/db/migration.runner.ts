// IMPLEMENTS: docs/tech/09_data_model/drizzle_setup_and_migrations.md§3.1 + §5.3 + §7 + §9 -- session:2026-06-02 --
import { Pool } from 'pg';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { dbTunables } from '../config/tunables';

/**
 * `MigrationRunner` (NEW, §9) — wrapper applicatif autour de l'application des migrations
 * `.sql` versionnées (§3.1). Exécuté **au boot** du container game-back, AVANT que NestJS ne
 * serve le port HTTP (§7 NestJS-jeu « migrations au boot » + readiness probe `/health`). Isole
 * l'échec migration (exit code != 0 → restart loop orchestrator) du démarrage applicatif sur un
 * schéma désynchronisé (§7 Docker).
 *
 * Décisions tranchées §9 :
 *   - Forward-only (§3.3) : aucune down-migration ; tout retour arrière = migration suivante.
 *   - PALIMPSEST (§3.2) : `drizzle.__drizzle_migrations` est la source de vérité des migrations
 *     appliquées ; un `.sql` déjà joué est skippé (idempotent par `idx`/`tag`).
 *   - Lock timeout (§5.3) : `SET lock_timeout` (T.db.migration.lock_timeout_ms) est posé en tête
 *     de CHAQUE fichier — Drizzle ne le fait pas automatiquement, c'est le rôle de ce wrapper.
 *   - Retries (§5.3 + §8) : T.db.migration.retry_max_attempts tentatives, backoff linéaire
 *     T.db.migration.retry_backoff_ms — absorbe le cas « une transaction longue bloque
 *     l'ACCESS EXCLUSIVE » → échec rapide (lock_timeout) → retry orchestré.
 *
 * `checkMigrations()` (§6.1, HealthService) compare `count(*)` de `drizzle.__drizzle_migrations`
 * (appliquées) au nombre d'entrées de `meta/_journal.json` (attendues) — ce runner garantit
 * qu'après un boot réussi les deux comptes sont égaux.
 *
 * NB : on n'utilise PAS le `drizzle-orm/node-postgres/migrator` packagé (qui exige des snapshots
 * `meta/NNNN_snapshot.json` que drizzle-kit ne peut pas générer ici — bug BigInt serialize 0.28.1
 * sur les `bigint .default(0n)` de economy_states). On lit directement le `_journal.json` + les
 * `.sql` (calque §3 DDL hand-authored, incluant les partitions/CHECK/REVOKE manuels que drizzle-kit
 * ne génère pas de toute façon — §7).
 */

interface JournalEntry {
  idx: number;
  tag: string;
}

interface Journal {
  entries?: JournalEntry[];
}

const DRIZZLE_SCHEMA = 'drizzle';
const MIGRATIONS_TABLE = '__drizzle_migrations';
const STATEMENT_BREAKPOINT = '--> statement-breakpoint';

/** Resolve the migrations folder at runtime (dist/db/migration.runner.js → dist/db/migrations). */
function migrationsDir(): string {
  return path.resolve(__dirname, 'migrations');
}

function log(msg: string): void {
  // eslint-disable-next-line no-console
  console.log(`[migration-runner] ${msg}`);
}

function readJournal(dir: string): JournalEntry[] {
  const journalPath = path.join(dir, 'meta', '_journal.json');
  const raw = fs.readFileSync(journalPath, 'utf-8');
  const journal = JSON.parse(raw) as Journal;
  const entries = Array.isArray(journal.entries) ? journal.entries : [];
  // Order by idx — PALIMPSEST sequential numbering (§3.2 pt 1).
  return [...entries].sort((a, b) => a.idx - b.idx);
}

/** Split a `.sql` migration into individual statements on the drizzle statement-breakpoint marker. */
function splitStatements(sqlText: string): string[] {
  return sqlText
    .split(STATEMENT_BREAKPOINT)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Ensure the drizzle tracking schema + table exist (forward-only ledger, §3.2 pt 5). */
async function ensureTrackingTable(pool: Pool): Promise<void> {
  await pool.query(`CREATE SCHEMA IF NOT EXISTS "${DRIZZLE_SCHEMA}"`);
  await pool.query(
    `CREATE TABLE IF NOT EXISTS "${DRIZZLE_SCHEMA}"."${MIGRATIONS_TABLE}" (
       id    SERIAL PRIMARY KEY,
       hash  text NOT NULL,
       created_at bigint
     )`,
  );
}

/** Tags already applied (one row per applied migration in __drizzle_migrations). */
async function appliedTags(pool: Pool): Promise<Set<string>> {
  const res = await pool.query<{ hash: string }>(
    `SELECT hash FROM "${DRIZZLE_SCHEMA}"."${MIGRATIONS_TABLE}"`,
  );
  return new Set(res.rows.map((r) => r.hash));
}

/**
 * Apply all pending migrations once (single attempt). Each migration runs in its own
 * transaction with `SET LOCAL lock_timeout` (§5.3) so a blocked ACCESS EXCLUSIVE fails fast.
 */
async function applyPending(pool: Pool): Promise<number> {
  const dir = migrationsDir();
  const entries = readJournal(dir);
  await ensureTrackingTable(pool);
  const done = await appliedTags(pool);

  let appliedCount = 0;
  for (const entry of entries) {
    if (done.has(entry.tag)) {
      continue;
    }
    const sqlPath = path.join(dir, `${entry.tag}.sql`);
    const sqlText = fs.readFileSync(sqlPath, 'utf-8');
    const statements = splitStatements(sqlText);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // §5.3 — lock timeout posé en tête de chaque migration (T.db.migration.lock_timeout_ms).
      await client.query(`SET LOCAL lock_timeout = ${dbTunables.migration.lockTimeoutMs}`);
      // Review S1-2 — inject the app_rw password as a transaction-local GUC so the role-bootstrap
      // migration (0013) can read it via current_setting('app.app_rw_password') without the secret
      // ever appearing in a committed .sql file. SET LOCAL = scoped to this tx, gone at COMMIT;
      // set via parameterized query (set_config) so the value is never interpolated into SQL text.
      // Empty/unset is allowed here — 0013 itself RAISEs if the GUC is empty when it needs it.
      await client.query(`SELECT set_config('app.app_rw_password', $1, true)`, [
        process.env.APP_DB_PASSWORD ?? '',
      ]);
      for (const stmt of statements) {
        await client.query(stmt);
      }
      await client.query(
        `INSERT INTO "${DRIZZLE_SCHEMA}"."${MIGRATIONS_TABLE}" (hash, created_at) VALUES ($1, $2)`,
        [entry.tag, Date.now()],
      );
      await client.query('COMMIT');
      log(`applied ${entry.tag} (${statements.length} statements)`);
      appliedCount += 1;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw new Error(`migration ${entry.tag} failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      client.release();
    }
  }
  return appliedCount;
}

/**
 * Run migrations at boot with retries (§5.3 + §8). Forward-only. On exhausting retries the error
 * propagates so the caller (main.ts bootstrap / `db:migrate`) exits non-zero (Docker restart loop,
 * §7 — never serve on a desynced schema).
 */
export async function runMigrations(pool: Pool): Promise<void> {
  const maxAttempts = dbTunables.migration.retryMaxAttempts;
  const backoffMs = dbTunables.migration.retryBackoffMs;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const n = await applyPending(pool);
      log(n > 0 ? `done — ${n} migration(s) applied` : 'done — schema already up to date');
      return;
    } catch (err) {
      lastErr = err;
      log(`attempt ${attempt}/${maxAttempts} failed: ${err instanceof Error ? err.message : String(err)}`);
      if (attempt < maxAttempts) {
        // Linear backoff (§8 — backoff linéaire simple).
        await new Promise((resolve) => setTimeout(resolve, backoffMs * attempt));
      }
    }
  }
  throw new Error(
    `MigrationRunner: exhausted ${maxAttempts} attempts — ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`,
  );
}
