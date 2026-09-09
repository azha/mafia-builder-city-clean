// IMPLEMENTS: docs/tech/09_data_model/drizzle_setup_and_migrations.md§5.2 + §9 -- session:2026-06-02 --
import { Global, Module, OnModuleDestroy } from '@nestjs/common';

import { db, redis, pool } from './index';

/**
 * Injection tokens for the two DB providers exposed by {@link DbModule}.
 *
 * Consumers inject via `@Inject(DB)` / `@Inject(REDIS)`:
 *   constructor(@Inject(DB) private readonly db: DrizzleClient,
 *               @Inject(REDIS) private readonly redis: Redis) {}
 */
export const DB = 'DB';
export const REDIS = 'REDIS';

/**
 * `DbModule` (NEW, §9) — `@Global()` module providing the two singleton DB
 * providers for the whole modular monolith:
 *   - `DB`    → `db: DrizzleClient` (Drizzle ORM over the node-postgres pool, §2.2)
 *   - `REDIS` → `redis: Redis` (ioredis hot tier, §5.2)
 *
 * One instance per process (singleton DI). Imported ONCE in `AppModule`
 * (cf. §5.2 / §7 NestJS — backend jeu). The BO backend reuses the same module
 * (no separate database — modular monolith, docs_int/06 L47).
 */
@Global()
@Module({
  providers: [
    { provide: DB, useValue: db },
    { provide: REDIS, useValue: redis },
  ],
  exports: [DB, REDIS],
})
export class DbModule implements OnModuleDestroy {
  /**
   * Graceful shutdown (folded T2/T3 review fix). On SIGTERM/SIGINT NestJS calls this hook
   * (wired by `app.enableShutdownHooks()` in main.ts): drain the node-postgres pool then quit
   * the ioredis client so in-flight queries finish and sockets close cleanly before more modules
   * depend on the pool. Idempotent — `pool.end()` / `redis.quit()` are no-ops once already closed.
   */
  async onModuleDestroy(): Promise<void> {
    await pool.end().catch(() => undefined);
    await redis.quit().catch(() => undefined);
  }
}
