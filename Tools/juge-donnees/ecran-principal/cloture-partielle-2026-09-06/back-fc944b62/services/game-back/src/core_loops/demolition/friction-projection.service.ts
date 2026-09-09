// IMPLEMENTS: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md §C8 ("Player
//             projection endpoints (§15, STRICT buckets — R2.2): ... complete the friction panel §6.1 —
//             the 4 per-building buckets").
//             Design: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §15
//             (`GET /v1/friction/state` = `{friction_bucket, penalty_active, friction_node_count}` ;
//             `GET /v1/friction/nodes/:buildingId` = 4 buckets §6.1 + `neighbor_count`) + §4.3 (aggregate
//             bucket formula) + §6.1 (the 4 panel buckets, verbatim names).
//             Pattern: `ReplacementOptionService` (a thin service wrapping repository reads + PURE
//             derivation functions, zero DB logic of its own) + `replacement-option-scorer.ts`'s own
//             "reuse the SAME pure formulas the runtime tick already proved" discipline.
//             — P3-E C8 — 2026-07-18
//
// `FrictionProjectionService` — the R2.2 wall over `friction_budget_state`/the §4.1 périmètre: `getState`
// (the aggregate `friction_bucket`) and `getNodePanel` (the 4 §6.1 per-node buckets + `neighbor_count`).
// EVERY leaf here is a bucket/count/boolean — the raw `friction_budget_total`/per-node `friction_load`/
// `decommission_cost` cents NEVER cross this service's own return boundary (R2.2/P5, the C8 mur).

import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { ApiError } from '../../protocol/api-error';
import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { citySimClock } from '../../db/schema/city_sim_clock';
import { coreLoopsTunables } from '../core-loops-tunables';
import type { M1OperationalType, CoverQuality } from '../../operational/real_estate/conversion-tunables';
import { FrictionBudgetRepository } from './friction-budget.repository';
import { frictionBudgetBucket, frictionLoadBucket, type FrictionBudgetBucket, type FrictionLoadBucket } from './friction-budget-bucket';
import { ageDaysFromAcquiredAtTick, frictionLoadForNode } from './friction-formula';
import { capacityBucketForType, type CapacityBucket } from './replacement-option-scorer';
import { outputToFrictionRatioBucket, type OutputToFrictionRatioBucket } from './friction-panel-bucket';
import { decommissionBasisCents, decommissionCostCents, decommissionCostBucket, type DecommissionCostBucket } from './decommission-cost';

export interface FrictionStateView {
  readonly friction_bucket: FrictionBudgetBucket;
  readonly penalty_active: boolean;
  readonly friction_node_count: number;
}

export interface FrictionNodePanelView {
  readonly output_value_bucket: CapacityBucket;
  readonly friction_load_bucket: FrictionLoadBucket;
  readonly output_to_friction_ratio_bucket: OutputToFrictionRatioBucket;
  readonly decommission_cost_bucket: DecommissionCostBucket;
  readonly neighbor_count: number;
}

@Injectable()
export class FrictionProjectionService {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly frictionRepo: FrictionBudgetRepository,
  ) {}

  /**
   * `GET /v1/friction/state` (design §15) — the aggregate `friction_bucket` read off the CACHED
   * `friction_budget_state` row (refresh-only-by-tick, §4.3 — this is a READ, never a recompute). A
   * player with no row yet (never ticked) reads the honest empty-state default: `light`/`false`/`0`
   * (mirrors `flag_review`/`settling_glance`'s own "no state yet" honesty).
   */
  async getState(playerId: string): Promise<FrictionStateView> {
    const row = await this.frictionRepo.getRow(playerId);
    if (!row) {
      return { friction_bucket: 'light', penalty_active: false, friction_node_count: 0 };
    }
    const total = Number(row.friction_budget_total);
    const threshold = row.friction_org_size * coreLoopsTunables.demolitionFrictionBudgetThresholdMultiplierOfOrgSize;
    const bucket = threshold > 0
      ? frictionBudgetBucket(
          total / threshold,
          coreLoopsTunables.demolitionFrictionBucketLightUpperBound,
          coreLoopsTunables.demolitionFrictionBucketBalancedUpperBound,
          coreLoopsTunables.demolitionFrictionBucketStrainedUpperBound,
        )
      : 'light';
    return { friction_bucket: bucket, penalty_active: row.efficiency_penalty_active, friction_node_count: row.friction_org_size };
  }

  /**
   * `GET /v1/friction/nodes/:buildingId` (design §6.1 step 1) — the 4 panel buckets + `neighbor_count`.
   * 404 if the building is not this player's own §4.1 périmètre member (`FrictionBudgetRepository
   * .fetchSingleNode`'s own guard — not owned, or already 'demolished'). `output_value_bucket` defaults
   * `very_low` for a purchased-but-unconverted node (no operational type yet — honestly "no output
   * realized", not a fabricated guess at what it MIGHT become).
   */
  async getNodePanel(playerId: string, buildingId: string): Promise<FrictionNodePanelView> {
    const node = await this.frictionRepo.fetchSingleNode(playerId, buildingId);
    if (!node) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `building ${buildingId} is not a player-owned périmètre node for this player.` });
    }

    const [gameMinute, frictionCache] = await Promise.all([this.currentGameMinute(playerId), this.frictionRepo.getRow(playerId)]);

    const ageDays = ageDaysFromAcquiredAtTick(gameMinute, node.acquiredAtTick ?? gameMinute);
    const nodeFrictionLoad = frictionLoadForNode(
      coreLoopsTunables.demolitionBaseFrictionPerNode,
      coreLoopsTunables.demolitionAgeDecayFactorPerTick,
      ageDays,
      node.connectionCount,
      coreLoopsTunables.demolitionPerConnectionFrictionModifier,
    );
    const orgThreshold = frictionCache
      ? frictionCache.friction_org_size * coreLoopsTunables.demolitionFrictionBudgetThresholdMultiplierOfOrgSize
      : 0;
    const fairShareOfThreshold = frictionCache && frictionCache.friction_org_size > 0 ? orgThreshold / frictionCache.friction_org_size : 0;
    const frictionLoadBand = frictionLoadBucket(
      nodeFrictionLoad,
      fairShareOfThreshold,
      coreLoopsTunables.demolitionFrictionBucketLightUpperBound,
      coreLoopsTunables.demolitionFrictionBucketBalancedUpperBound,
      coreLoopsTunables.demolitionFrictionBucketStrainedUpperBound,
    );

    // "no output realized yet" for a purchased-but-unconverted node — an honest floor, not a guessed type.
    const outputValueBand: CapacityBucket = node.operationalType ? capacityBucketForType(node.operationalType as M1OperationalType) : 'very_low';

    const basisCents = decommissionBasisCents(
      node.operationalType as M1OperationalType | null,
      node.coverQuality as CoverQuality | null,
      node.buildingType,
    );
    const costCents = decommissionCostCents(basisCents, coreLoopsTunables.demolitionDecommissionCostFractionOfSetup);
    const costBand = decommissionCostBucket(
      costCents,
      coreLoopsTunables.demolitionDecommissionCostBucketCheapUpperBoundCents,
      coreLoopsTunables.demolitionDecommissionCostBucketModerateUpperBoundCents,
      coreLoopsTunables.demolitionDecommissionCostBucketExpensiveUpperBoundCents,
    );

    return {
      output_value_bucket: outputValueBand,
      friction_load_bucket: frictionLoadBand,
      output_to_friction_ratio_bucket: outputToFrictionRatioBucket(outputValueBand, frictionLoadBand),
      decommission_cost_bucket: costBand,
      neighbor_count: node.neighborCount,
    };
  }

  private async currentGameMinute(playerId: string): Promise<number> {
    const rows = await this.db.select({ game_minute: citySimClock.game_minute }).from(citySimClock).where(eq(citySimClock.player_id, playerId)).limit(1);
    return rows[0]?.game_minute ?? 0;
  }
}
