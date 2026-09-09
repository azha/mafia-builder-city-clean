// IMPLEMENTS: docs/tech/04a_operational_systems/distribution_couriers_runners.md §NestJS — backend jeu
//             (DistributionService.createRoute + assignCourierToRoute — the dispatch action) + §Implications par
//             couche / Unity ("Couriers list panel" — the qualitative courier surface) + 18 envelope/versioning (/v1,
//             ResponseEnvelope) + 17 JwtAuthGuard (req.account → player_id) + P5 (R2.2 — projection bands only)
//             -- session:2026-06-03 (Phase 2 Task 4) --
//
// `DistributionController` — the PLAYER-FACING M1 foot-courier distribution API:
//   - POST /v1/operational/distribution/dispatch  → dispatch a foot courier (source→dest, cargo grams) (Step 1).
//   - GET  /v1/operational/couriers               → the qualitative courier-state projection (Step 3, P5).
//
// PLAYER RESOLUTION (same identity bridge as the city-sim controllers / ProductionController / GET /v1/me): the
// JwtAuthGuard verifies the bearer JWT and attaches `req.account` (account_id, kind — from verified claims, never the
// body, R-ID-3). The operational chain is keyed by player_id, so we resolve account_id → player_id via the 1-1
// Player↔Account link (player.account_id, filtered to PLAYER accounts).
//
// The mutating handler returns plain `data` (the new courier/route/shift ids — NOT raw cargo grams); the global
// EnvelopeInterceptor wraps it in a success ResponseEnvelope. The GET returns the qualitative projections (R2.2).

import { Body, Controller, Get, HttpCode, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import { ApiError } from '../../protocol/api-error';
import { UuidParam, enumField, intField, optionalUuidField, rejectUnknownFields, uuidField } from '../../common/param-pipes';
import { vehicleType as vehicleTypePg } from '../../db/schema/operational_chain';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { RequestWithAccount } from '../../auth/authenticated-request';
import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { account } from '../../db/schema/account';
import { player } from '../../db/schema/player';
import { DistributionService } from './distribution.service';
import { DistributionProjectionService, type CourierProjection, type RouteLifecycleBands } from './distribution.projection.service';
import { CourierDetectionService, type CaughtActionChoice } from './courier-detection.service';

/** POST /dispatch body — the player chooses a source + destination OPERATIONAL building, a cargo amount (grams), and
 *  optionally a vehicle (T5; default 'foot' — back-compat: an existing dispatch with no vehicle_type is byte-identical). */
interface DispatchBody {
  from_building_id?: string;
  to_building_id?: string;
  cargo_grams?: number;
  /** foot (default) / bike / car — bike/car require an operational distribution_hub (else 422 VEHICLE_NOT_UNLOCKED, T5). */
  vehicle_type?: string;
  /** P3-C C7 — optional saved route id (design §7.5 dents). Consumes the saved route's frozen path
   *  instead of computing a fresh ad-hoc one. Omitted (every pre-C7 call) = byte-identical ad-hoc path. */
  route_id?: string;
}

/** POST /distribution/caught-exceptions/:id/resolve body */
interface ResolveExceptionBody {
  /** The player's chosen resolution: LAWYER_UP | ABANDON | VIOLENT_SILENCE. */
  choice: CaughtActionChoice;
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class DistributionController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly distribution: DistributionService,
    private readonly projection: DistributionProjectionService,
    // C9 — owner-gated caught-exception resolution.
    private readonly courierDetection: CourierDetectionService,
  ) {}

  /**
   * `POST /v1/operational/distribution/dispatch` — dispatch a FOOT courier carrying Brindle product from one of the
   * player's OPERATIONAL buildings to another (Step 1). Body: { from_building_id, to_building_id, cargo_grams }.
   * SOURCES the cargo from the source product_storage (guarded decrement) and creates a route + a foot courier
   * (in_transit) + a courier_shift carrying the cargo. Atomic + guarded (insufficient product / same-building → 409;
   * non-operational building → 404; bad cargo → 422). The cargo arrives at the destination on the COURIER_TRANSIT
   * tick. Returns { courier_id, route_id, shift_id }. Requires a PLAYER JWT.
   */
  @Post('operational/distribution/dispatch')
  @HttpCode(201) // a dispatch creates a courier + route + shift → 201.
  @UseGuards(JwtAuthGuard)
  async dispatch(
    @Body() body: DispatchBody,
    @Req() req: RequestWithAccount,
  ): Promise<{ courier_id: string; route_id: string; shift_id: string }> {
    // TD-451 (chantier P5, lot 3 « la chaîne : transport, filière, entretien ») — la garde de champs
    // inconnus. Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`
    // (les champs de CETTE route), jamais d'une lecture à la main. Contrôle de non-régression avant
    // durcissement : 70 sites d'appel reconnus dans le dépôt, 0 hors allowlist.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['cargo_grams', 'from_building_id', 'to_building_id', 'vehicle_type', 'route_id']);

    const playerId = await this.resolvePlayerId(req.account!.account_id);
    // L0.3 (D5) — from_building_id/to_building_id: uuid (masked in the M31 sweep by cargo_grams's
    // own check firing first — both reach `getOwnedOperationalBuilding` unguarded). cargo_grams: int
    // — `distribution.service.ts:168-172`'s own `Number.isInteger && >= 1` has no UPPER bound
    // (the same class as real-estate's `block_id`), widened here to close the same magnitude gap
    // BEFORE it reaches the stock comparison. vehicle_type: enum, `vehicleTypePg.enumValues`
    // (DF-11), OPTIONAL with default 'foot' (T5 back-compat) — no format check existed before this.
    // route_id: uuid, optional (P3-C C7 saved-route id).
    const rawBody = body as unknown as Record<string, unknown>;
    const fromBuildingId = uuidField(rawBody, 'from_building_id');
    const toBuildingId = uuidField(rawBody, 'to_building_id');
    // r3/MAJOR-2 (D5 v24) — `main` (de311e06:83) coerced via bare `Number(body.cargo_grams)`, no type
    // check: `{"cargo_grams":"5"}` succeeded. `acceptNumericString` restores that domain on this site.
    const cargoGrams = intField(rawBody, 'cargo_grams', 'int4', { acceptNumericString: true });
    // r4/MAJOR-2 (D5 v25 "null ≡ absent") — same fix as route.controller.ts's own vehicleType/stance:
    // `main` (de311e06:85) used `String(body.vehicle_type ?? 'foot')`, absorbing `null`.
    const vehicleTypeArg =
      body.vehicle_type == null ? 'foot' : enumField(vehicleTypePg.enumValues, rawBody, 'vehicle_type');
    const routeIdArg = optionalUuidField(rawBody, 'route_id');
    const { courierId, routeId, shiftId } = await this.distribution.dispatch(
      playerId,
      fromBuildingId,
      toBuildingId,
      cargoGrams,
      vehicleTypeArg,
      false, // ephemeralMode: not client-reachable yet on this endpoint (pre-existing, unrelated to C7).
      'balanced', // stance: default (pre-existing, unrelated to C7).
      routeIdArg, // P3-C C7 — optional saved route id (design §7.5 dents). Undefined = byte-identical ad-hoc path.
    );
    return { courier_id: courierId, route_id: routeId, shift_id: shiftId };
  }

  /**
   * `GET /v1/operational/couriers` — the requesting player's qualitative courier-state projection (Step 3, P5/R2.2):
   * one entry per courier with a transit band (IDLE / IN_TRANSIT / ARRIVED) — NEVER the raw path/coords/cargo/segment/
   * clock. Requires a PLAYER JWT. Returns { couriers: [...] } (empty list when the player has no couriers).
   */
  @Get('operational/couriers')
  @UseGuards(JwtAuthGuard)
  async couriers(@Req() req: RequestWithAccount): Promise<{ couriers: CourierProjection[] }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const couriers = await this.projection.listCouriers(playerId);
    return { couriers };
  }

  /**
   * `GET /v1/operational/distribution/projection` — C13 R2.2 P5-wall route-lifecycle projection.
   *
   * Returns the requesting player's banded route-lifecycle projection (one entry per route).
   * All fields are QUALITATIVE bands — NEVER raw scalars (sinuosity_index, straight_line_distance,
   * river_crossings, count are NEVER included — P5 wall enforced at compile time).
   *
   * Player resolution: JwtAuthGuard + PlayerIdentityService (req.account.account_id → player_id,
   * P-B) — W6a C1.0 (2026-08-08, docs/superpowers/specs/2026-08-07-w6a-authz-remediation-design.md
   * §2bis X8): this handler used to derive playerId from an unauthenticated `x-player-id` header (a
   * route-lifecycle enumeration leak for any forged uuid, zero credential). The pattern this fix
   * applies already lived 20 lines away in `dispatch`/`couriers` above — this handler was the odd one
   * out in its own file.
   *
   * Returns { routes: RouteLifecycleBands[] }. Returns [] when the player has no routes.
   *
   * R2.2: the raw sinuosity_index / straight_line_distance / river_crossings scalars are NEVER
   * forwarded to the client. Only the banded equivalents appear in the response.
   *
   * TD-551 — each entry also carries `from_building_id`/`to_building_id` (opaque uuid handles, not
   * scalars — R2.2's wall bars magnitudes, not identifiers): before this, a client could display a
   * route's bands but could not `dispatch` ON that same route (its endpoints were never echoed).
   */
  @Get('operational/distribution/projection')
  @UseGuards(JwtAuthGuard)
  async routeProjection(
    @Req() req: RequestWithAccount,
  ): Promise<{ routes: RouteLifecycleBands[] }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const routes = await this.projection.listRouteProjections(playerId);
    return { routes };
  }

  /**
   * `POST /v1/distribution/caught-exceptions/:id/resolve` — C9 player-facing 3-way resolution
   * (owner-gated). The player resolves their OWN caught exception.
   *
   * Body: { choice: 'LAWYER_UP' | 'ABANDON' | 'VIOLENT_SILENCE' }.
   *   LAWYER_UP      → status='lawyered' + cash debit (lawyerUpCostCents, OQ-15 composite:cost_medium).
   *   ABANDON        → status='abandoned' (no debit, no heat).
   *   VIOLENT_SILENCE → status='silenced' (C10 adds heat injection via COURIER_SILENCE event).
   *
   * Idempotent: already-resolved exception → no-op (200 — not an error).
   * Owner gate: enforced inside CourierDetectionService.resolveCaughtException — reads the
   *   exception's player_id and compares it to the JWT-resolved player. A mismatch → 403 FORBIDDEN.
   *
   * `gameMinute`: uses 0 as the tick for the player route (resolved_at_tick is BO-only; the sweep
   *   uses the real ctx.gameMinute from the NIGHTLY/10 tick context). A placeholder of 0 is acceptable
   *   since the field is informational (the player can only act when the exception is pending).
   *
   * Requires a PLAYER JWT. Returns { resolved: true }.
   */
  @Post('distribution/caught-exceptions/:id/resolve')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async resolveException(
    @Param('id', UuidParam) exceptionId: string,
    @Body() body: ResolveExceptionBody,
    @Req() req: RequestWithAccount,
  ): Promise<{ resolved: true }> {
    // TD-451 (chantier P5, lot 3 « la chaîne : transport, filière, entretien ») — la garde de champs
    // inconnus. Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`
    // (les champs de CETTE route), jamais d'une lecture à la main. Contrôle de non-régression avant
    // durcissement : 70 sites d'appel reconnus dans le dépôt, 0 hors allowlist.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['choice']);

    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const choice = body?.choice;
    if (!choice || !['LAWYER_UP', 'ABANDON', 'VIOLENT_SILENCE'].includes(choice)) {
      throw new ApiError('VALIDATION_FAILED', {
        message: 'choice must be LAWYER_UP | ABANDON | VIOLENT_SILENCE',
      });
    }
    // Owner gate is enforced inside CourierDetectionService.resolveCaughtException:
    // it reads the exception's player_id and throws ForbiddenException if it does not match.
    await this.courierDetection.resolveCaughtException(playerId, exceptionId, choice, 0);
    return { resolved: true };
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
