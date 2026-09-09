// IMPLEMENTS: docs/superpowers/plans/2026-07-10-04f-A-maintenance-plan.md C3 (Player actions — the 2
//             endpoints)
//             Design: docs/superpowers/specs/2026-07-10-04f-A-maintenance-design.md §9 (Player actions &
//             endpoints)
//             Pattern: services/game-back/src/operational/enforcement/repair.controller.ts (`RepairController`
//             — the SAME player-resolution identity bridge + Idempotency-Key posture this file mirrors
//             verbatim) + docs/tech/18_api_protocol (/v1, ResponseEnvelope, Idempotency-Key) + 17
//             JwtAuthGuard (req.account → player_id)
//             — 04f-A C3 — 2026-07-10
//
// `MaintenanceController` — the PLAYER-FACING maintenance API:
//   - POST /v1/operational/building/:id/schedule-maintenance         → schedule (or, while overdue,
//     emergency-schedule — D10, the SAME endpoint) maintenance for a single owned building.
//   - POST /v1/operational/buildings/mass-schedule-maintenance        → mass-schedule a batch of owned
//     buildings in one atomic transaction (all-or-nothing, D10/§9).
//
// PLAYER RESOLUTION (the SAME identity bridge as RepairController / RealEstateController / GET /v1/me): the
// JwtAuthGuard verifies the bearer JWT and attaches `req.account` (account_id, kind — from the verified `sub`
// claim, NEVER the body, R-ID-3). The operational chain is keyed by player_id, so we resolve account_id →
// player_id via the 1-1 Player↔Account link (player.account_id, filtered to PLAYER accounts). Neither request
// body carries a player id — a body player id is NEVER trusted.
//
// IDEMPOTENCY (REUSE): both POSTs are mutations, so the global IdempotencyInterceptor applies transparently —
// a retried schedule/mass-schedule with the same Idempotency-Key replays the memorized response, NO
// re-execution (no double-debit). This controller does not re-implement idempotency.
//
// The mutating handlers return the qualitative MaintenanceService response (scheduled + emergency + the D10
// cost band — NOT the raw debited cents, R2.2); the global EnvelopeInterceptor wraps it in a success
// ResponseEnvelope.

import { Body, Controller, HttpCode, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import { ApiError } from '../../protocol/api-error';
import { UuidParam, rejectUnknownFields, uuidArrayField } from '../../common/param-pipes';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { RequestWithAccount } from '../../auth/authenticated-request';
import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { account } from '../../db/schema/account';
import { player } from '../../db/schema/player';
import { MaintenanceService, type MassScheduleMaintenanceResult, type ScheduleMaintenanceResult } from './maintenance.service';

/** POST /:id/schedule-maintenance body — `emergency` is accepted for API-shape parity with the canon
 *  "Emergency maintenance" label but is NEVER consulted for pricing (D10 — server-derived only). */
interface ScheduleMaintenanceBody {
  emergency?: boolean;
}

/** POST /mass-schedule-maintenance body — the explicit set of owned buildings to target (D10/§9). */
interface MassScheduleMaintenanceBody {
  building_ids?: string[];
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class MaintenanceController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly maintenance: MaintenanceService,
  ) {}

  /**
   * `POST /v1/operational/building/:id/schedule-maintenance` — schedule (or emergency-schedule, D10) the
   * requesting player's owned building. See `MaintenanceService.scheduleMaintenance` for the full validation
   * + pricing + guarded-debit contract. Requires a PLAYER JWT (no token → 401).
   */
  @Post('operational/building/:id/schedule-maintenance')
  @HttpCode(200) // a state mutation on an existing building (not a resource creation) → 200, not 201.
  @UseGuards(JwtAuthGuard)
  async scheduleMaintenance(
    @Param('id', UuidParam) id: string,
    @Body() body: ScheduleMaintenanceBody,
    @Req() req: RequestWithAccount,
  ): Promise<ScheduleMaintenanceResult> {
    // TD-451 (chantier P5, lot 3 « la chaîne : transport, filière, entretien ») — la garde de champs
    // inconnus. Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`
    // (les champs de CETTE route), jamais d'une lecture à la main. Contrôle de non-régression avant
    // durcissement : 70 sites d'appel reconnus dans le dépôt, 0 hors allowlist.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['emergency']);

    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.maintenance.scheduleMaintenance(playerId, id, { emergency: body?.emergency });
  }

  /**
   * `POST /v1/operational/buildings/mass-schedule-maintenance` — mass-schedule the requesting player's
   * `building_ids` in one atomic transaction (all-or-nothing). See `MaintenanceService.applyMassSchedule`.
   * Requires a PLAYER JWT (no token → 401).
   */
  @Post('operational/buildings/mass-schedule-maintenance')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async massScheduleMaintenance(
    @Body() body: MassScheduleMaintenanceBody,
    @Req() req: RequestWithAccount,
  ): Promise<MassScheduleMaintenanceResult> {
    // TD-451 (chantier P5, lot 3 « la chaîne : transport, filière, entretien ») — la garde de champs
    // inconnus. Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`
    // (les champs de CETTE route), jamais d'une lecture à la main. Contrôle de non-régression avant
    // durcissement : 70 sites d'appel reconnus dans le dépôt, 0 hors allowlist.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['building_ids']);

    const playerId = await this.resolvePlayerId(req.account!.account_id);
    // L0.3 (D5) — building_ids: structure (array of uuid) — one of the 6 certain structures (M31
    // passe 3-bis), measured 500 pre-C1 (both first-level and the nested `building_ids[]` sonde).
    // `uuidArrayField` already rejects empty (r2/m3's own decision — this route's manual "non-empty"
    // check, maintenance.service.ts:144-146, stays as an inert backstop, never reached after this).
    const buildingIds = uuidArrayField(body as unknown as Record<string, unknown>, 'building_ids');
    return this.maintenance.applyMassSchedule(playerId, buildingIds);
  }

  /** Resolve account_id → player_id via the 1-1 Player↔Account link (the GET /v1/me identity bridge). 404 if none. */
  private async resolvePlayerId(accountId: string): Promise<string> {
    const rows = await this.db
      .select({ player_id: player.player_id })
      .from(player)
      .innerJoin(account, eq(account.account_id, player.account_id))
      .where(and(eq(player.account_id, accountId), eq(account.kind, 'PLAYER')))
      .limit(1);
    const playerId = rows[0]?.player_id;
    if (!playerId) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'No player profile for this account.' });
    }
    return playerId;
  }
}
