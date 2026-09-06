// IMPLEMENTS: docs/tech/20_telemetry_analytics/telemetry_principles.md §5 NestJS — backend jeu (PRIMARY)
//             -- session:2026-06-02 (Phase 0 Task 9) --
//
// `TelemetryModule` — the ingestion surface (POST /v1/telemetry/events) + the staff read projection
// (GET /v1/telemetry/events/recent). Depends on the @Global() DbModule (DB provider, via the
// repository) and on AuthModule's StaffRoleGuard (exported by AuthModule) for the staff-gated read.
//
// DEFER (telemetry_principles.md §5 / event_taxonomy.md §2.4): the full pipeline (funnels/cohort/kpi/
// dashboards ch20 T5-T9), the event registry/lint codegen, account-level consent persistence
// (ConsentRecord → [à backporter 09]), the partition-management maintenance cron.

import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { TelemetryController } from './telemetry.controller';
import { TelemetryIngestionService } from './ingestion.service';
import { TelemetryEventRepository } from './telemetry-event.repository';

@Module({
  imports: [AuthModule], // StaffRoleGuard for the staff-gated read (AuthModule exports it).
  controllers: [TelemetryController],
  providers: [TelemetryIngestionService, TelemetryEventRepository],
})
export class TelemetryModule {}
