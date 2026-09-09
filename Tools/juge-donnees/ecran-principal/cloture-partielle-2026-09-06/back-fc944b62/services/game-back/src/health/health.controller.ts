// IMPLEMENTS: docs/tech/09_data_model/drizzle_setup_and_migrations.md§6.1 + §6.2 -- session:2026-06-02 --
//             /health/detailed staff-gate wired Task 6 (17 authorization_rbac.md §Rôles canoniques).
import { Controller, Get, UseGuards, VERSION_NEUTRAL } from '@nestjs/common';

import { HealthService, type HealthDetails, type HealthStatus } from './health.service';
import { StaffRoleGuard } from '../auth/staff-role.guard';

/**
 * `HealthController` — exposes the two health surfaces (§6.1 / §6.2).
 *
 *   GET /health           → public, read-only. 200 {status} once the app can
 *                           serve (§6.1). Body is the aggregate status; Traefik
 *                           routes /health to game-back (boot/readiness probe).
 *   GET /health/detailed  → BO admin, role `ops` (§6.2). Returns the full
 *                           {status, details:{postgres, redis, migrations}}.
 */
// `VERSION_NEUTRAL` keeps health OUTSIDE the `/v<major>/` URI versioning (Task 5,
// 18 versioning_strategy.md §Conséquences: `GET /healthz` is a non-versioned
// exception). The path stays `/health` (+ `/health/detailed`), never `/v1/health`.
// The global EnvelopeInterceptor also exempts `/health*` so the body stays raw.
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /**
   * Public liveness/readiness surface (§6.1). Returns the aggregated status so a
   * caller can poll `status === 'ok'`. Always HTTP 200 (the body carries the
   * 'ok'|'degraded'|'down' verdict; the dockerized healthcheck only needs a
   * reachable 200, and Traefik routing stays simple).
   */
  @Get()
  async health_(): Promise<{ status: HealthStatus }> {
    const report = await this.health.aggregate();
    return { status: report.status };
  }

  /**
   * Detailed BO surface (§6.2) — full probe breakdown. STAFF-gated (Task 6).
   *
   * The permissive stub is REMOVED: `@UseGuards(StaffRoleGuard)` now requires a verified
   * STAFF-kind bearer token (canonical StaffRoleEnum — the old "ops" reconciles to "any
   * staff"). No token / non-staff token → 401 / 403 (fail-closed, R-RBAC-1).
   *
   * AUDIENCE (lot-1 TD-076 reconciliation): the StaffRoleGuard now REQUIRES `aud=GAME_BACK`
   * (Invariant 6 ch17 §session_management.md). Staff callers MUST use the `game_back_access_token`
   * from the dual-audience signin result (auth.service.ts). A BO_BACK staff token → 403.
   * A finer permission (`staff.audit.read*`) via @RequirePermission is DEFERRED.
   */
  @Get('detailed')
  @UseGuards(StaffRoleGuard)
  async detailed(): Promise<{ status: HealthStatus; details: HealthDetails }> {
    return this.health.aggregate();
  }
}
