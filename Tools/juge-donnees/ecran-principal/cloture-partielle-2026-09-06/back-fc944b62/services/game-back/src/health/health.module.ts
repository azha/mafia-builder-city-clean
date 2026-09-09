// IMPLEMENTS: docs/tech/09_data_model/drizzle_setup_and_migrations.md§6 + §9 -- session:2026-06-02 --
import { Module } from '@nestjs/common';

import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { StaffRoleGuard } from '../auth/staff-role.guard';

/**
 * `HealthModule` — bundles the `/health` + `/health/detailed` surfaces (§6.1 /
 * §6.2) and the `HealthService` aggregator (§6.3 / §9).
 *
 * The DB + Redis providers (`DB` / `REDIS`) consumed by `HealthService` come
 * from the `@Global()` `DbModule` (§5.2), imported once in `AppModule` — so this
 * module does not re-import it (DRY, single DB singleton per process).
 */
@Module({
  controllers: [HealthController],
  // StaffRoleGuard has no DI deps (pure JWT verify); provided locally so `@UseGuards(StaffRoleGuard)`
  // on /health/detailed resolves it here without importing the whole AuthModule (avoids coupling).
  providers: [HealthService, StaffRoleGuard],
})
export class HealthModule {}
