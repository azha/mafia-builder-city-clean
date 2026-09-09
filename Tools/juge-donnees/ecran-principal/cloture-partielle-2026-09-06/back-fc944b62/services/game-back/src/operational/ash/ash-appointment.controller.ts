// IMPLEMENTS: docs/superpowers/specs/2026-06-06-phase-02c-ash-luxury-design.md §4-T7 (POST /v1/operational/appointment
//             — the luxury-channel booking action) + 18 envelope/versioning (/v1, ResponseEnvelope) + 17 JwtAuthGuard
//             (req.account → player_id) + P5 (R2.2 — projection bands only)
//             -- session:2026-06-06 (Phase 2c vector #2c — Ash — Task 7) --
//
// `AshAppointmentController` — the PLAYER-FACING Ash APPOINTMENT API (T7):
//   - POST /v1/operational/appointment              → book an appointment at a player-owned Glass venue (→ SCHEDULED).
//   - GET  /v1/operational/appointment/:id          → the qualitative appointment projection (status band, P5/R2.2).
//
// PLAYER RESOLUTION (the SAME identity bridge as RealEstateController / GET /v1/me): the JwtAuthGuard verifies the bearer
// JWT and attaches `req.account` (account_id, kind — from verified claims, never the body, R-ID-3). The operational
// chain is keyed by player_id, so we resolve account_id → player_id via the 1-1 Player↔Account link (player.account_id,
// filtered to PLAYER accounts).
//
// The mutating POST returns plain `data` (the new appointment id — NOT the raw booked/expires ticks); the global
// EnvelopeInterceptor wraps it in a success ResponseEnvelope. The booking is subject to the existing
// IdempotencyInterceptor (a retried book with the same Idempotency-Key replays the memorized response — no double
// booking). The GET returns the qualitative projection (R2.2 — the status band + the T9 qualitative payout_band; never
// the raw booked/expires ticks or grams/cents).

import { Body, Controller, Get, HttpCode, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import { ApiError } from '../../protocol/api-error';
import { UuidParam, rejectUnknownFields, uuidField } from '../../common/param-pipes';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { RequestWithAccount } from '../../auth/authenticated-request';
import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { account } from '../../db/schema/account';
import { player } from '../../db/schema/player';
import { AshAppointmentService, type AppointmentProjection } from './ash-appointment.service';

/** POST /appointment body — the player chooses a player-owned Glass venue to book the appointment at. */
interface BookBody {
  glass_venue_building_id?: string;
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class AshAppointmentController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly appointment: AshAppointmentService,
  ) {}

  /**
   * `POST /v1/operational/appointment` — book an Ash appointment at a player-owned Glass-district venue (T7). Body:
   * { glass_venue_building_id }. Validates the venue is the player's owned building (404 if not owned / not the player's)
   * AND located in the Glass district (422 if owned but not a Glass venue), then inserts a SCHEDULED ash_appointment
   * (booked_at_tick = currentTick, expires_at_tick = currentTick + ash.appointment_window_ticks). Returns
   * { appointment_id }. Requires a PLAYER JWT (no token → 401). Supports Idempotency-Key (the global interceptor — a
   * retried book does not double-book).
   */
  @Post('operational/appointment')
  @HttpCode(201) // a NEW resource (the appointment) is created → 201.
  @UseGuards(JwtAuthGuard)
  async book(@Body() body: BookBody, @Req() req: RequestWithAccount): Promise<{ appointment_id: string }> {
    // TD-451 (chantier P5, lot 3 « la chaîne : transport, filière, entretien ») — la garde de champs
    // inconnus. Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`
    // (les champs de CETTE route), jamais d'une lecture à la main. Contrôle de non-régression avant
    // durcissement : 70 sites d'appel reconnus dans le dépôt, 0 hors allowlist.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['glass_venue_building_id']);

    const playerId = await this.resolvePlayerId(req.account!.account_id);
    // L0.3 (D5) — glass_venue_building_id: uuid (measured 500 pre-C1, one of the 8 "non confondus").
    const glassVenueBuildingId = uuidField(body as unknown as Record<string, unknown>, 'glass_venue_building_id');
    return this.appointment.book(playerId, glassVenueBuildingId);
  }

  /**
   * `POST /v1/operational/appointment/:id/honor` — honor a SCHEDULED Ash appointment: sell the Ash present at the
   * appointment's reserved Glass venue at the extreme luxury margin × the cooked batch's purity multiplier, credit the
   * player's wallet, and flip the appointment HONORED (T8 — the ONLY Ash sale path; Ash never lek-sells). A SCHEDULED
   * appointment with Ash at its venue → 200 { honored: true }. Not the player's / non-existent appointment → 404; not
   * SCHEDULED (already HONORED or EXPIRED) → 409; SCHEDULED but no Ash at the venue → 409. Requires a PLAYER JWT (no token
   * → 401). Supports Idempotency-Key (the global interceptor — a retried honor with the same key replays, no double sale;
   * a fresh-key second honor hits the 409 already-honored guard).
   */
  @Post('operational/appointment/:id/honor')
  @HttpCode(200) // a state mutation on the existing appointment (not a resource creation) → 200, not 201.
  @UseGuards(JwtAuthGuard)
  async honor(@Param('id', UuidParam) id: string, @Req() req: RequestWithAccount): Promise<{ honored: true }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.appointment.honor(playerId, id);
  }

  /**
   * `GET /v1/operational/appointment/:id` — the requesting player's qualitative appointment projection (T9, P5/R2.2):
   * the status band (SCHEDULED | HONORED | EXPIRED) + the qualitative payout_band (PENDING / NONE / MODEST / FAIR /
   * STRONG / PREMIUM) — NEVER the raw booked/expires ticks or grams/cents. Requires a PLAYER JWT. An appointment that is
   * not the player's / does not exist → RESOURCE_NOT_FOUND.
   */
  @Get('operational/appointment/:id')
  @UseGuards(JwtAuthGuard)
  async appointmentProjection(
    @Param('id', UuidParam) id: string,
    @Req() req: RequestWithAccount,
  ): Promise<AppointmentProjection> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const proj = await this.appointment.projectAppointment(playerId, id);
    if (!proj) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `No such appointment for this player: ${id}.` });
    }
    return proj;
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
