// IMPLEMENTS: docs/tech/09_data_model/drizzle_setup_and_migrations.md§3.1 + §5.3 -- session:2026-06-02 --
//
// Standalone CLI entry for the MigrationRunner (forward-only, §3.1). Invoked via `npm run db:migrate`
// (compiled: `node dist/db/migrate.cli.js`). Same code path the boot-time gate in main.ts uses, but
// callable independently (local dev, CI step, manual ops). Exits non-zero on failure.
//
// Uses the migration-ADMIN connection (`adminPool` = MIGRATION_DATABASE_URL, owner role `mafia`),
// NOT the least-privilege app pool — DDL/GRANT require owner privileges (review S1-2).
import { adminPool } from './index';
import { runMigrations } from './migration.runner';

async function main(): Promise<void> {
  await runMigrations(adminPool);
  await adminPool.end();
}

void main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[db:migrate] failed:', err);
  process.exit(1);
});
