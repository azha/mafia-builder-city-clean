// IMPLEMENTS: docs/superpowers/specs/2026-08-13-w6.2-04c-player-surface-design.md §3 C5 ("market :
//             GET /v1/me/market/lanes" — route, §2.1 Lane Collapse Pricing SEULE).
//             Canon: docs/tech/04c_market_reputation_insurance/market_mechanics.md §2.1/:202,
//             docs/tech/design_constraints.md:31 ("No stock-chart pricing").
//             — W6.2 C5 — 2026-08-13
//
// `MarketController` — the PLAYER-FACING read surface for §2.1 Lane Collapse Pricing.
//
// SCOPE (design §2/§1.1): `lane_pricing_state` is the ONLY LIVE table of the 4 market mechanics
// (1 of 6 — the other 5 have zero production écrivain or a dead-table sœur, §1.1). This route
// projects ONLY `lane_confidence_bucket` — the other 3 `MarketProjectionBuckets` fields
// (q_inferred_bucket / realised_price_multiplier_bucket / lambda_bucket) read from tables with no
// production écrivain and are DELIBERATELY absent from this response (never a constant placeholder
// — §0 forbids shipping a route with constant-forever fields).
//
// R2.2 mur (design §3 C5, verbatim): aucune clé serveur — no `p_cents`, `c`, `t_refractory`,
// `k_current`, `q_total` ever leaves `MarketProjectionService.laneConfidenceBucket`'s own boundary.
// `lane_pricing_state` is a GLOBAL table (district_id × substance_type, no player_id — market
// dynamics are city-wide) — this route is a read of shared world state, not a player-scoped resource;
// `JwtAuthGuard` still gates it (any authenticated player may read city market intel, canon gdd/14
// "Screen B1" — no anonymous read).
//
// A lane that has never been "ensured" (no dealer has ever transacted that district × substance)
// has NO `lane_pricing_state` row → 404 (existence is intelligence, D7's own convention — never a
// fabricated neutral bucket for state that was never observed).

import { Controller, Get, Param, UseGuards } from '@nestjs/common';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import { ApiError } from '../../protocol/api-error';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { substanceType as substanceTypeEnum } from '../../db/schema/operational_chain';
import { LaneCollapsePricingService, type SubstanceTypeValue } from './lane-collapse-pricing.service';
import { MarketProjectionService, type LaneConfidenceBucket } from './market-projection.service';

// The domain guard, DERIVED from the already-exported pgEnum (zero new list declared — mirrors
// `engagements.controller.ts`'s `isRivalKeyDomain` / `insurance.controller.ts`'s `isCoverageTypeDomain`).
type SubstanceTypeEnum = (typeof substanceTypeEnum.enumValues)[number];

function isSubstanceTypeDomain(v: string): v is SubstanceTypeEnum {
  return (substanceTypeEnum.enumValues as readonly string[]).includes(v);
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class MarketController {
  constructor(
    private readonly laneService: LaneCollapsePricingService,
    private readonly projection: MarketProjectionService,
  ) {}

  /**
   * `GET /v1/me/market/lanes/:districtId/:substanceType` — the requesting player's lane-confidence
   * read for one (district, substance) pair (design §3 C5). A garbage `districtId` (non-integer) or
   * an out-of-domain `substanceType` → 404 (surface-area guard, never 422 — D8's own reasoning). A
   * `districtId`/`substanceType` pair with no `lane_pricing_state` row (never "ensured" by a real
   * deal) → 404 (existence is intelligence — never a fabricated neutral bucket). Requires a PLAYER
   * JWT (no token → 401). R2.2: `{ district_id, substance_type, lane_confidence_bucket }` — no raw
   * scalar (`c`/`p_cents`/`t_refractory`) ever leaves this route.
   */
  @Get('me/market/lanes/:districtId/:substanceType')
  @UseGuards(JwtAuthGuard)
  async getLane(
    @Param('districtId') districtIdParam: string,
    @Param('substanceType') substanceTypeParam: string,
  ): Promise<{ district_id: number; substance_type: SubstanceTypeValue; lane_confidence_bucket: LaneConfidenceBucket }> {
    const districtId = Number(districtIdParam);
    if (!Number.isInteger(districtId) || districtId <= 0) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'Unknown district_id.' });
    }
    if (!isSubstanceTypeDomain(substanceTypeParam)) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'Unknown substance_type.' });
    }
    const substanceType = substanceTypeParam as SubstanceTypeValue;

    const row = await this.laneService.getLaneRow(districtId, substanceType);
    if (!row) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `No lane_pricing_state row for district ${districtId} × ${substanceType} — never observed.`,
      });
    }

    return {
      district_id: districtId,
      substance_type: substanceType,
      lane_confidence_bucket: this.projection.laneConfidenceBucket(row.c),
    };
  }
}
