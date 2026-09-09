// IMPLEMENTS: docs/superpowers/plans/2026-06-22-system9-route-lifecycle-9b-plan.md Task 7 (C7) + Task 9 (C9)
//             DD-PERSIST — REST CRUD for saved routes
//             POST   /v1/operational/routes         — create a saved route
//             GET    /v1/operational/routes/:id     — get a saved route
//             GET    /v1/operational/routes         — list saved routes for a player
//             DELETE /v1/operational/routes/:id     — delete a saved route
//             POST   /v1/operational/routes/:id/replan — C9 DD-REPLAN (OQ-RP1 versioned replan in-place)
//             System 9b C7 — 2026-06-23 | C9 — 2026-06-23
//
// Player resolution: JwtAuthGuard + PlayerIdentityService (req.account.account_id → player_id, P-B) —
// W6a C1.0 (2026-08-08, docs/superpowers/specs/2026-08-07-w6a-authz-remediation-design.md §2bis
// X3-X7 + §3 C1.0): every handler in this file USED to derive playerId from an unauthenticated
// `x-player-id` header — any caller could forge another player's uuid with ZERO credential (2 of
// these 6 handlers debit cash; see vehicle-roster.controller.ts for the worst of the class). The
// header is now gone from every signature (not merely ignored — T9 of the design's own test form is
// exactly the case where a guard is added but the header is still read, which stays fully exploitable
// by an attacker presenting their OWN token).
//
// C4: no Math.random, no Date.now.
// R2.2: straight_line_distance / sinuosity_index are server-only (not returned here — RouteService handles).

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import { UuidParam, enumField, rejectUnknownFields } from '../../common/param-pipes';
import { vehicleType as vehicleTypePg, routeStance } from '../../db/schema/operational_chain';
import { RouteService } from './route.service';
import { RouteRebuildService } from './route-rebuild.service';
import { DistributionRepository } from './distribution.repository';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { RequestWithAccount } from '../../auth/authenticated-request';
import { PlayerIdentityService } from '../../auth/player-identity.service';
import type { RouteStance } from './route-finder.service';
// P3-F C6 — CategoryDelegationGuard (ROUTE_ASSIGNMENT's 3 guard sites, C0-reanchor §7). One-line seam.
import { CategoryDelegationGuard } from '../../meta_progression/category-delegation-guard.service';
import { TaskCategoryKey } from '../../meta_progression/task-category-catalogue';

interface CreateRouteBody {
  originBlock: number;
  destBlock: number;
  vehicleType?: string;
  stance?: string;
  routeName?: string;
  waypoints?: number[];
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class RouteController {
  constructor(
    private readonly routeService: RouteService,
    // P3-C C7 — the 3-mode rebuild verb (design §7.4).
    private readonly routeRebuildService: RouteRebuildService,
    // P3-C C7-fold (⊥ IMPORTANT-1): the SAME real-tick source DistributionService.dispatch uses
    // (city_sim_clock via getCurrentTick) — resolving the rebuild's downtime window against the
    // REAL current tick, not a hardcoded 0 (which made rebuild_completes_at_tick an absolute tick
    // value far in the past for any real player, so the self-heal comparison in
    // dispatchOnSavedRoute/claimRebuild would treat the downtime as ALREADY elapsed immediately).
    private readonly distributionRepo: DistributionRepository,
    // P3-F C6 — the ROUTE_ASSIGNMENT retirement guard (design D6/§8.3): a one-line seam at each of this
    // controller's 3 guard sites (create/replan/rebuild — C0-reanchor §7).
    private readonly delegationGuard: CategoryDelegationGuard,
    // W6a C1.0 — the P-B identity resolver (req.account.account_id → player_id). REUSE, not a 55th copy.
    private readonly playerIdentity: PlayerIdentityService,
  ) {}

  @Post('operational/routes')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  async createRoute(
    @Body() body: CreateRouteBody,
    @Req() req: RequestWithAccount,
  ): Promise<{ routeId: string }> {
    // TD-451 (chantier P5, lot 3 « la chaîne : transport, filière, entretien ») — la garde de champs
    // inconnus. Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`
    // (les champs de CETTE route), jamais d'une lecture à la main. Contrôle de non-régression avant
    // durcissement : 70 sites d'appel reconnus dans le dépôt, 0 hors allowlist.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['originBlock', 'destBlock', 'vehicleType', 'stance', 'routeName', 'waypoints']);

    const playerId = await this.playerIdentity.resolvePlayerId(req.account!.account_id);
    await this.delegationGuard.assertNotDelegated(playerId, TaskCategoryKey.ROUTE_ASSIGNMENT);
    // r2/BLOCKING-1(b) — vehicleType/stance both reach a pgEnum column (`vehicle_type`/`stance`,
    // operational_chain.ts:47,83) at persist time (route.service.ts -> route-lifecycle.repository.ts);
    // a garbage value passed the OLD `?? 'foot'`/`as RouteStance` cast unguarded and would 22P02 the
    // INSERT once a real path/ownership succeeds (préventif — NOT reproduced live, it requires a real
    // owned building pair with a computable path; same posture as Deviation 5's `lek_tile_id`, C1
    // notes). Same optional-with-default shape already used by `distribution.controller.ts:93`'s own
    // `vehicle_type`, REUSED here rather than re-invented.
    const rawBody = body as unknown as Record<string, unknown>;
    // r4/MAJOR-2 (D5 v25 "null ≡ absent sur un optionnel à défaut") — `main` (de311e06:87-88) used
    // `?? 'foot'`/`?? 'balanced'`, which treats `null` exactly like an absent key (the default applies).
    // The `=== undefined` form this lot introduced does NOT — `{"vehicleType": null}` was REJECTED
    // (422) where `main` would have proceeded with the default. Restored: `== null` (not `===`) matches
    // BOTH `undefined` and `null`, nothing else (a non-null falsy-looking value like `''`/`0`/`false`
    // still reaches `enumField` and 422s there, unchanged from this lot's own intent).
    const vehicleTypeArg = body.vehicleType == null ? 'foot' : enumField(vehicleTypePg.enumValues, rawBody, 'vehicleType');
    const stanceArg = (body.stance == null ? 'balanced' : enumField(routeStance.enumValues, rawBody, 'stance')) as RouteStance;
    return this.routeService.createRoute(playerId, {
      originBlock: Number(body.originBlock),
      destBlock: Number(body.destBlock),
      vehicleType: vehicleTypeArg,
      stance: stanceArg,
      routeName: body.routeName,
      waypoints: body.waypoints,
      gameMinute: 0,
    });
  }

  @Get('operational/routes/:id')
  @UseGuards(JwtAuthGuard)
  async getRoute(
    @Param('id', UuidParam) routeId: string,
    @Req() req: RequestWithAccount,
  ): Promise<{ route: unknown }> {
    const playerId = await this.playerIdentity.resolvePlayerId(req.account!.account_id);
    const result = await this.routeService.getRoute(playerId, routeId);
    if (!result) {
      throw new NotFoundException(`Route ${routeId} not found`);
    }
    return result;
  }

  @Get('operational/routes')
  @UseGuards(JwtAuthGuard)
  async listRoutes(
    @Req() req: RequestWithAccount,
  ): Promise<{ routes: unknown[] }> {
    const playerId = await this.playerIdentity.resolvePlayerId(req.account!.account_id);
    return this.routeService.listRoutes(playerId);
  }

  @Delete('operational/routes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async deleteRoute(
    @Param('id', UuidParam) routeId: string,
    @Req() req: RequestWithAccount,
  ): Promise<void> {
    const playerId = await this.playerIdentity.resolvePlayerId(req.account!.account_id);
    await this.routeService.deleteRoute(playerId, routeId);
  }

  /**
   * C9 — DD-REPLAN: POST /v1/operational/routes/:id/replan
   * Re-runs A* with the current corridor_debt snapshot; keeps same route_id;
   * bumps version; archives prior path_blocks into route_version_history; state→'active'.
   * OQ-RP1: version-chain on the same route row (stable route_id).
   * Player ownership: JWT-derived playerId (W6a C1.0); another player's route → 404.
   * C4: no Math.random, no Date.now.
   */
  @Post('operational/routes/:id/replan')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async replanRoute(
    @Param('id', UuidParam) routeId: string,
    @Req() req: RequestWithAccount,
  ): Promise<{ version: number }> {
    const playerId = await this.playerIdentity.resolvePlayerId(req.account!.account_id);
    await this.delegationGuard.assertNotDelegated(playerId, TaskCategoryKey.ROUTE_ASSIGNMENT);
    return this.routeService.replanRoute(playerId, routeId, 0 /* gameMinute: caller provides; default 0 for production */);
  }

  /**
   * P3-C C7 — POST /v1/operational/routes/:id/rebuild {mode} (design §7.4).
   *
   * Body: { mode: 'MINIMAL_REROUTE' | 'MODERATE_RESTRUCTURE' | 'FULL_GEOMETRIC_RESET' }.
   * Debits the mode's cash cost, claims the rebuild atomically (I7 — 409 REBUILD_IN_PROGRESS if a
   * rebuild is already in flight on this route), recomputes the path (debt-aware for MINIMAL/MODERATE,
   * debt-free/pure-geometry for FULL), archives the old path, arms `rebuild_completes_at_tick` (12-tick
   * downtime — a dispatch on this route during the window 409s ROUTE_REBUILDING), bumps version,
   * `state='active'`. FULL_GEOMETRIC_RESET is the ONE structural mode (code 9, `governor.commit
   * (SINUOSITY_FULL_RESET)` — a 2nd FULL rebuild the SAME session 409s STRUCTURAL_CAP_EXHAUSTED).
   *
   * Player ownership: JWT-derived playerId (W6a C1.0); another player's route → 404.
   * C4: no Math.random, no Date.now — `gameMinute` is the REAL current tick
   * (`DistributionRepository.getCurrentTick`, the SAME `city_sim_clock` source
   * `DistributionService.dispatch` reads), NOT a hardcoded constant (⊥ IMPORTANT-1 fold, C7 review):
   * a hardcoded 0 would arm `rebuild_completes_at_tick = 0 + downtimeTicks` — an absolute tick value
   * in the PAST for any real player whose clock has already advanced past it, so the downtime
   * self-heal comparison (`<= gameMinute`) would treat the window as already-elapsed on the VERY
   * NEXT dispatch attempt, and the 12-tick downtime would never actually engage in production.
   */
  @Post('operational/routes/:id/rebuild')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async rebuildRoute(
    @Param('id', UuidParam) routeId: string,
    @Body() body: { mode?: string },
    @Req() req: RequestWithAccount,
  ): Promise<{ routeId: string; mode: string; version: number; rebuildCompletesAtTick: number }> {
    // TD-451 (chantier P5, lot 3 « la chaîne : transport, filière, entretien ») — la garde de champs
    // inconnus. Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`
    // (les champs de CETTE route), jamais d'une lecture à la main. Contrôle de non-régression avant
    // durcissement : 70 sites d'appel reconnus dans le dépôt, 0 hors allowlist.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['mode']);

    const playerId = await this.playerIdentity.resolvePlayerId(req.account!.account_id);
    await this.delegationGuard.assertNotDelegated(playerId, TaskCategoryKey.ROUTE_ASSIGNMENT);
    const gameMinute = await this.distributionRepo.getCurrentTick(playerId);
    return this.routeRebuildService.rebuild(playerId, routeId, String(body?.mode ?? ''), gameMinute);
  }
}
