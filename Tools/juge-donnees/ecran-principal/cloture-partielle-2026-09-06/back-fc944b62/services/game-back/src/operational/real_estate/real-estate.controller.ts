// IMPLEMENTS: docs/tech/04a_operational_systems/real_estate.md §Acquisition (Path A) + conversion_setup.md §Workflow
//             + §Player interaction surface (Building Card → Convert) + 18 envelope/versioning (/v1,
//             ResponseEnvelope) + 17 JwtAuthGuard (req.account → player_id) + P5 (R2.2 — projection bands only)
//             -- session:2026-06-03 (Phase 2 Task 1) --
//
// `RealEstateController` — the PLAYER-FACING M1 real-estate API:
//   - POST /v1/operational/building/purchase        → acquire a building on a free block (Step 1).
//   - POST /v1/operational/building/:id/convert      → convert + setup (debit + operational state) (Step 2).
//   - GET  /v1/operational/building/:id              → the qualitative operational projection (Step 3, P5/R2.2).
//
// PLAYER RESOLUTION (same identity bridge as the city-sim controllers / GET /v1/me): the JwtAuthGuard verifies the
// bearer JWT and attaches `req.account` (account_id, kind — from verified claims, never the body, R-ID-3). The
// operational chain is keyed by player_id, so we resolve account_id → player_id via the 1-1 Player↔Account link
// (player.account_id, filtered to PLAYER accounts).
//
// The mutating handlers return plain `data` (the new building id / a debit ack — NOT the raw cents); the global
// EnvelopeInterceptor wraps it in a success ResponseEnvelope. The GET returns the qualitative projection (R2.2).

import { Body, Controller, Get, HttpCode, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import { ApiError } from '../../protocol/api-error';
import { UuidParam, intField, rejectUnknownFields } from '../../common/param-pipes';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { RequestWithAccount } from '../../auth/authenticated-request';
import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { account } from '../../db/schema/account';
import { player } from '../../db/schema/player';
import { ConversionService, RealEstateService } from './real-estate.service';
import { SpecializedLabService } from './specialized-lab.service';
import { HubService } from './hub.service';
import { EquipmentTierService } from './equipment-tier.service';
import {
  RealEstateProjectionService,
  type BuildingOperationalProjection,
} from './real-estate.projection.service';
import { StructuralDecisionGovernorService } from '../../progression/loop10/structural-decision-governor.service';
import { StructuralDecisionType } from '../../progression/loop10/structural-decision-catalogue';

/** POST /purchase body — the player chooses a free block + the intended operational type. */
interface PurchaseBody {
  block_id?: number;
  building_type_target?: string;
  /**
   * D1 C2 — district pricing gate (default false → legacy M1 ratio model; true → D1 formula:
   * round( base_price_per_sqm_cents × nominalSizeSqmByType[type] × district_multiplier[block.district] )).
   * Optional. Defaults to false for zero-regression on all existing callers.
   */
  use_district_pricing?: boolean;
}

/** POST /:id/convert body — the player chooses the operational type + cover quality (+ optional cold-storage opt-in). */
interface ConvertBody {
  operational_type?: string;
  cover_quality?: string;
  /**
   * Phase-2b vector #2 — opt a building into cold-storage capability at conversion (e.g. a cold-capable stash). A
   * refinery is cold-by-nature regardless of this flag. Optional; defaults to false (ordinary storage).
   */
  cold_storage_capable?: boolean;
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class RealEstateController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly realEstate: RealEstateService,
    private readonly conversion: ConversionService,
    private readonly projection: RealEstateProjectionService,
    private readonly specializedLab: SpecializedLabService,
    private readonly hub: HubService,
    private readonly equipmentTier: EquipmentTierService,
    // P3-A C5 (D7/D8) — the Loop 10 governor: purchase/convert are 2 of the 6 LIVE structural sites.
    private readonly governor: StructuralDecisionGovernorService,
  ) {}

  /**
   * `POST /v1/operational/building/purchase` — acquire a player-owned building on a FREE block (Step 1, legitimate
   * purchase). Body: { block_id, building_type_target }. DEBITS economy_states by the grounded acquisition price
   * (real_estate.acquisition_cost_ratio × the STANDARD-cover reference conversion cost — see RealEstateService.purchase;
   * the canonical district-based nominal model is DEFERRED). Atomic + guarded (insufficient cash → 409). Returns
   * { building_id }. Requires a PLAYER JWT.
   */
  // P3-A C5 (D7/D8) — Loop 10 STRUCTURAL site #1 (BUILDING_ACQUISITION): the mutation is wrapped by the
  // governor's `commit` seam — cap-bind ONLY while the player has an active session (D9); a sessionless
  // purchase still succeeds AND is audited (session_ref: null). Minimal wrap — the SAME
  // RealEstateService.purchase call, byte-identical response.
  @Post('operational/building/purchase')
  @UseGuards(JwtAuthGuard)
  async purchase(@Body() body: PurchaseBody, @Req() req: RequestWithAccount): Promise<{ building_id: string }> {
    // TD-451 (chantier P5, lot 1 « l'argent ») — la garde de champs inconnus. Sans elle un corps
    // portant un nom de champ PLAUSIBLE mais faux est accepté en silence et la mutation part quand
    // même : mesuré sur l'achat en jetons, qui rendait 200 ET débitait. Allowlist tirée de la table
    // ratifiée `tests/e2e/conventions/body-field-classes.ts` (les champs de CETTE route), pas d'une
    // lecture à la main.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['block_id', 'building_type_target', 'use_district_pricing']);

    const playerId = await this.resolvePlayerId(req.account!.account_id);
    // L0.3 (D5) — block_id: int (`world_geography.ts:53`, blocks.id is `integer` — a genuinely NEW
    // magnitude gap found by C1: `Number.isInteger(blockId) && blockId >= 1` had no UPPER bound,
    // same class as the district/precinct int4 fix). building_type_target: LIBRE — the string never
    // reaches the typed column directly, it is mapped via `BUILDING_TYPE_ORDER.indexOf(...)` to the
    // `integer` `buildings.building_type` value (`real-estate.service.ts:205`) AFTER `M1_TYPES.has()`
    // already 422s a garbage name — same posture as `archetype` (lieutenant.controller.ts).
    // r3/MAJOR-2 (D5 v24) — `main` (de311e06:93) coerced via bare `Number(body.block_id)`, no type
    // check: `{"block_id":"5"}` succeeded. `acceptNumericString` restores that domain on this site.
    const blockId = intField(body as unknown as Record<string, unknown>, 'block_id', 'int4', { acceptNumericString: true });
    const buildingTypeTarget = String(body.building_type_target ?? '');
    const useDistrictPricing = body.use_district_pricing === true;
    const { buildingId } = await this.governor.commit(
      playerId,
      StructuralDecisionType.BUILDING_ACQUISITION,
      {
        before: { entity: 'building', block_id: blockId },
        after: (r: { buildingId: string }) => ({ entity: 'building', id: r.buildingId, building_type_target: buildingTypeTarget }),
      },
      () => this.realEstate.purchase(playerId, blockId, buildingTypeTarget, useDistrictPricing),
    );
    return { building_id: buildingId };
  }

  /**
   * `POST /v1/operational/building/:id/convert` — convert + setup a player-owned building (Step 2). Body:
   * { operational_type, cover_quality }. DEBITS economy_states by the grounded conversion cost + creates the
   * building_operational_state (conversion_stage='gutting', setup_remaining_ticks=the per-type×cover duration).
   * Setup then progresses per MINUTE tick until 'operational'. Returns { converted: true } — the raw post-debit
   * cents are NOT forwarded (R2.2; the player surface is the qualitative projection). Requires a PLAYER JWT.
   */
  // P3-A C5 (D7/D8) — Loop 10 STRUCTURAL site #2 (BUILDING_CONVERT). Minimal wrap — the SAME
  // ConversionService.convert call, byte-identical response.
  @Post('operational/building/:id/convert')
  @HttpCode(200) // a state mutation on an existing building (not a resource creation) → 200, not 201.
  @UseGuards(JwtAuthGuard)
  async convert(
    @Param('id', UuidParam) id: string,
    @Body() body: ConvertBody,
    @Req() req: RequestWithAccount,
  ): Promise<{ converted: true }> {
    // TD-451 (chantier P5, lot 1 « l'argent ») — la garde de champs inconnus. Sans elle un corps
    // portant un nom de champ PLAUSIBLE mais faux est accepté en silence et la mutation part quand
    // même : mesuré sur l'achat en jetons, qui rendait 200 ET débitait. Allowlist tirée de la table
    // ratifiée `tests/e2e/conventions/body-field-classes.ts` (les champs de CETTE route), pas d'une
    // lecture à la main.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['operational_type', 'cover_quality', 'cold_storage_capable']);

    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const operationalType = String(body.operational_type ?? '');
    const coverQuality = String(body.cover_quality ?? '');
    const coldStorageCapable = body.cold_storage_capable === true;
    await this.governor.commit(
      playerId,
      StructuralDecisionType.BUILDING_CONVERT,
      {
        before: { entity: 'building', id },
        after: { entity: 'building', id, operational_type: operationalType, cover_quality: coverQuality },
      },
      () => this.conversion.convert(playerId, id, operationalType, coverQuality, coldStorageCapable),
    );
    return { converted: true };
  }

  /**
   * `POST /v1/operational/building/:id/upgrade-tier` — raise the requesting player's specialized_lab lab_tier by one
   * (the lab-tier lever of the Ash purity chain, Phase-2c T5). DEBITS economy_states by the grounded upgrade cost
   * (specialized_lab.upgrade_cost_ratio.<targetTier> × the M1 conversion reference) ATOMICALLY guarded (insufficient
   * cash → 409, no state change) → lab_tier++ in the SAME tx. A building that is not the player's / not converted → 404;
   * not a specialized_lab → 409 (WRONG_TYPE); already at specialized_lab.max_tier → 409 (AT_CAP); the target tier is
   * currently ZONING-GATED on this building's Stack lot (04e-A1 C8, design §4.3 — a genuine spatial restriction, no
   * state change; an E-POL-07-shaped political event lifts it) → 422 (VALIDATION_FAILED). Returns
   * { upgraded: true } — the raw new lab_tier / post-debit cents are NOT forwarded (R2.2; the player surface is the
   * qualitative lab_tier band on the projection). Requires a PLAYER JWT (no token → 401). Supports Idempotency-Key (the
   * global interceptor — a retried upgrade does not double-debit / double-increment).
   */
  @Post('operational/building/:id/upgrade-tier')
  @HttpCode(200) // a state mutation on an existing building (not a resource creation) → 200, not 201.
  @UseGuards(JwtAuthGuard)
  async upgradeTier(@Param('id', UuidParam) id: string, @Req() req: RequestWithAccount): Promise<{ upgraded: true }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.specializedLab.upgradeTier(playerId, id);
  }

  /**
   * `POST /v1/operational/building/:id/upgrade-hub-tier` — raise the requesting player's distribution_hub hub_tier by
   * one (the hub-tier lever that scales the courier roster cap, Phase-4 vector #4 T3). The BYTE-MIRROR of upgrade-tier
   * (the specialized_lab lab-tier action). DEBITS economy_states by the grounded upgrade cost
   * (distribution.hub_upgrade_cost_ratio.<targetTier> × the M1 conversion reference) ATOMICALLY guarded (insufficient
   * cash → 409, no state change) → hub_tier++ in the SAME tx. A building that is not the player's / not converted → 404;
   * not a distribution_hub → 409 (WRONG_TYPE); already at distribution.hub_max_tier → 409 (AT_CAP). Returns
   * { upgraded: true } — the raw new hub_tier / post-debit cents are NOT forwarded (R2.2; the player surface is the
   * qualitative hub_tier band on the projection). Requires a PLAYER JWT (no token → 401). Supports Idempotency-Key (the
   * global interceptor — a retried upgrade does not double-debit / double-increment).
   */
  @Post('operational/building/:id/upgrade-hub-tier')
  @HttpCode(200) // a state mutation on an existing building (not a resource creation) → 200, not 201.
  @UseGuards(JwtAuthGuard)
  async upgradeHubTier(@Param('id', UuidParam) id: string, @Req() req: RequestWithAccount): Promise<{ upgraded: true }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.hub.upgradeHubTier(playerId, id);
  }

  /**
   * `POST /v1/operational/building/:id/upgrade-equipment-tier` — start the upgrade window for a lab/refinery/press_house's
   * equipment_tier (D1 C6 — the generic Brindle/Crick/Hush tier lever). DEBITS economy_states by the grounded upgrade
   * cost (production.brindle.tier_N_upgrade_cost_ratio × the M1 conversion reference) ATOMICALLY guarded (insufficient
   * cash → 409, no state change) + ARMS the upgrade window (equipment_tier_upgrade_remaining_ticks = upgradeWindowTicks)
   * + ABORTS any in-progress cook (intermediates lost 100%). equipment_tier++ happens at window end (MINUTE/20 tick).
   * Wrong type → 409 (WRONG_TYPE); at cap → 409 (AT_CAP); upgrade in progress → 409 (UPGRADE_IN_PROGRESS);
   * insufficient cash → 409. Returns { upgrading: true } — the raw tier/cents are NOT forwarded (R2.2). Requires
   * a PLAYER JWT (no token → 401). Supports Idempotency-Key (global interceptor — no double-debit / double-window).
   */
  @Post('operational/building/:id/upgrade-equipment-tier')
  @HttpCode(200) // a state mutation on an existing building (not a resource creation) → 200, not 201.
  @UseGuards(JwtAuthGuard)
  async upgradeEquipmentTier(@Param('id', UuidParam) id: string, @Req() req: RequestWithAccount): Promise<{ upgrading: true }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.equipmentTier.upgradeEquipmentTier(playerId, id);
  }

  /**
   * `GET /v1/operational/building/:id` — the requesting player's qualitative operational projection for a building
   * (Step 3, P5/R2.2): setup-state band + cover band + operational flag + operational type — NEVER the raw
   * setup_remaining_ticks / equipment_tier / price / progress. Requires a PLAYER JWT. A building that is not the
   * player's / does not exist → RESOURCE_NOT_FOUND.
   */
  @Get('operational/building/:id')
  @UseGuards(JwtAuthGuard)
  async building(
    @Param('id', UuidParam) id: string,
    @Req() req: RequestWithAccount,
  ): Promise<BuildingOperationalProjection> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const proj = await this.projection.projectBuilding(playerId, id);
    if (!proj) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `No such building for this player: ${id}.` });
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
