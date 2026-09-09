// IMPLEMENTS: docs/superpowers/plans/2026-07-12-p3-C-supply-chain-plan.md §C7 sub-task 3 (the 3 rebuild
//             modes — unchanged by ruling B: "sous-tâches 1/3/4 identiques") + ruling #3 (MODERATE =
//             tactical, D7 closed-world default).
//             Design: docs/superpowers/specs/2026-07-12-p3-C-supply-chain-design.md §7.4 (the 3 modes
//             table: cost/A*/expected-SI/classification) + §15 (I7 claim, I9 compensating refund).
//             Decisions: §1.12 D12 (route domain files stay in `operational/distribution/`) + §1.11 D11
//             (5 cash-plate costs [PROV-Y26Q2]).
//             Pattern: `leg-maintenance.service.ts` (the SAME "debit → claim → refund-on-claim-failure;
//             the ONE structural mode wraps the WHOLE sequence in `governor.commit`, the tactical modes
//             call it directly" shape, one domain over — leg maintenance vs route rebuild) +
//             `route.service.ts#replanRoute` (the archive-old-path → write-new-path shape, REUSED).
//             — P3-C C7 — 2026-07-13
//
// `RouteRebuildService.rebuild(playerId, routeId, mode, gameMinute)` — the 3-mode verb (design §7.4):
//
//   | mode                  | A* debt-awareness            | cost getter                                    | classification |
//   |-----------------------|-------------------------------|--------------------------------------------------|-----------------|
//   | MINIMAL_REROUTE       | debt-aware (real snapshot)    | sinuosityMinimalRerouteCostCents                  | tactical        |
//   | MODERATE_RESTRUCTURE  | debt-aware (real snapshot)    | sinuosityModerateRestructureCostCents             | tactical (ruling #3) |
//   | FULL_GEOMETRIC_RESET  | debt-FREE (empty snapshot)    | sinuosityFullGeometricResetCostCents              | STRUCTURAL — code 9 `governor.commit(SINUOSITY_FULL_RESET)` |
//
// ★ LOCAL JUDGMENT CALL (flagged for reviewer, mirrors decisions §4 divergence #3's own "calibration
// tolerance" framing): the LIVE A* engine (`RouteFinderService.computePath`) has no "local-detour-only"
// vs "full re-path" distinction — it always computes an end-to-end deterministic optimal path for its
// given inputs. MINIMAL_REROUTE and MODERATE_RESTRUCTURE therefore invoke the MECHANICALLY IDENTICAL
// debt-aware recompute (same call shape `RoutePatchSweepService`/`replanRoute` already make) — the ONLY
// code-enforced differentiators between the 3 modes are (a) cost tier, (b) FULL's debt-FREE (pure-
// geometry) recompute — genuinely distinct, matches canon's "≈ minimum géométrique" — and (c) FULL's
// STRUCTURAL governor-wrap + session cap (I4, REUSE). Fabricating a fake "local-only" A* pass for
// MINIMAL that the engine cannot actually perform would violate the anti-fabrication principle this
// codebase applies everywhere else (DIV-5/C4 "no Math.random", T5 "no invented cargo capacity"); the
// design's own divergence #3 already accepts "if the geometry does better [or the same], honest result"
// for this exact MINIMAL/MODERATE calibration gap.
//
// Downtime (design §7.4): ALL 3 modes arm the SAME `rebuild_completes_at_tick = gameMinute +
// sinuosity_rebuild_throughput_penalty_duration_ticks` (12) — the I7 claim (`RouteLifecycleRepository.
// claimRebuild`) sets it BEFORE any A*/archive work runs; the completion write (`applyRebuildResult`)
// does not touch it (the window is measured from the CLAIM moment).
//
// I9 (design §15): debit wallet FIRST, claim SECOND — a lost claim race refunds BEFORE throwing
// REBUILD_IN_PROGRESS (mirrors `LegMaintenanceService.maintain`'s own sequence + rationale verbatim).
//
// ★ GOVERNOR ACCESS — `ModuleRef.get(STRUCTURAL_DECISION_GOVERNOR symbol, { strict: false })`, NEVER
// importing the CONCRETE `StructuralDecisionGovernorService` class (LOCAL JUDGMENT CALL, flagged for
// reviewer — the root cause, isolated by bisection this session): `structural-decision-governor.
// service.ts` imports `SessionService`, which imports `HlCardService` (`session/session.service.ts:51`
// — the `Loop10Module` ↔ `SessionModule` cycle that module's own header already documents, "forwardRef
// both sides"). Importing the CONCRETE CLASS `StructuralDecisionGovernorService` into ANY file
// `DistributionModule` reaches — REGARDLESS of module-import wiring (a plain `Loop10Module` import, a
// `forwardRef`-wrapped one, and an `@Global()` flip were ALL tried and reverted) and REGARDLESS of
// whether the class is ever used in a constructor (a method merely referencing it as a return type,
// never called, ALSO broke boot) — reproducibly broke `Loop10Module`'s OWN internal DI graph at boot
// (`HlCardService`'s `StructuralDecisionGovernorService` constructor arg resolving `undefined`): a
// classic ES/CommonJS circular-import decorator-metadata hazard (a SECOND import path into that cycle,
// from a file reached very early/broadly in the overall app graph, shifts module-load order enough that
// `HlCardService`'s OWN class decorator can run before `StructuralDecisionGovernorService` finishes its
// OWN top-level evaluation on THIS path — TypeScript's `emitDecoratorMetadata` then captures `undefined`
// for that ONE constructor arg) — NOT a NestJS module-wiring problem (confirmed: importing the plain
// enum `StructuralDecisionType`, from the SAME catalogue-adjacent module tree, is perfectly safe; only
// the concrete SERVICE class import broke things). FIX: `structural-decision-governor.token.ts` — a
// zero-import LEAF file exporting a Symbol token + a local duck-typed `StructuralDecisionGovernorLike`
// interface (this file's own type import). `loop10.module.ts` registers the ONE alias provider
// (`{ provide: STRUCTURAL_DECISION_GOVERNOR, useExisting: StructuralDecisionGovernorService }` — THAT
// file already safely imports the concrete class, being its own home module). `ModuleRef.get` with this
// symbol (never the class) sidesteps the circular-load hazard entirely — verified: Nest boots clean.

import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { eq } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { building } from '../../db/schema/city_state';
import { ApiError } from '../../protocol/api-error';
import { RaidExceptionRepository } from '../../exceptions/raid-exception.repository';
import {
  STRUCTURAL_DECISION_GOVERNOR,
  type StructuralDecisionGovernorLike,
} from '../../progression/loop10/structural-decision-governor.token';
import { StructuralDecisionType } from '../../progression/loop10/structural-decision-catalogue';
import { coreLoopsTunables } from '../../core_loops/core-loops-tunables';
import { RouteLifecycleRepository } from './route-lifecycle.repository';
import { RouteFinderService } from './route-finder.service';
import type { RouteStance } from './route-finder.service';
import { CorridorDebtService } from './corridor-debt.service';
import { CityEventBus } from '../../citysim/events/city-event-bus';

export type RouteRebuildMode = 'MINIMAL_REROUTE' | 'MODERATE_RESTRUCTURE' | 'FULL_GEOMETRIC_RESET';

const VALID_MODES: readonly RouteRebuildMode[] = ['MINIMAL_REROUTE', 'MODERATE_RESTRUCTURE', 'FULL_GEOMETRIC_RESET'];

function isValidMode(mode: string): mode is RouteRebuildMode {
  return (VALID_MODES as readonly string[]).includes(mode);
}

function costCentsFor(mode: RouteRebuildMode): number {
  switch (mode) {
    case 'MINIMAL_REROUTE':      return coreLoopsTunables.sinuosityMinimalRerouteCostCents;
    case 'MODERATE_RESTRUCTURE': return coreLoopsTunables.sinuosityModerateRestructureCostCents;
    case 'FULL_GEOMETRIC_RESET': return coreLoopsTunables.sinuosityFullGeometricResetCostCents;
  }
}

export interface RebuildResult {
  readonly routeId: string;
  readonly mode: RouteRebuildMode;
  readonly version: number;
  readonly rebuildCompletesAtTick: number;
}

@Injectable()
export class RouteRebuildService {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly routeLifecycleRepo: RouteLifecycleRepository,
    private readonly routeFinder: RouteFinderService,
    private readonly corridorDebt: CorridorDebtService,
    // D3-adjacent wall: RaidExceptionRepository is duplicate-provided in DistributionModule already
    // (System 9b C11 — VehicleRosterService's own cost debit) — REUSE, no new provider needed.
    private readonly raidRepo: RaidExceptionRepository,
    private readonly moduleRef: ModuleRef,
    // P3-D C6 — CityEventBus (from SchedulerModule, already imported into DistributionModule — no new
    // import needed): emits ROUTE_REBUILT for the annealing subscriber (design §9.2).
    private readonly bus: CityEventBus,
  ) {}

  /**
   * Resolves the governor via the Symbol token (`STRUCTURAL_DECISION_GOVERNOR`, NEVER the concrete
   * class — see file header) using `ModuleRef.get(..., { strict: false })`. A cheap in-memory container
   * lookup (no re-instantiation once the singleton exists) — negligible per-call cost; not cached on
   * the instance since there is no lifecycle-hook-safe moment to do so that avoids importing the class
   * (the token sidesteps that entirely, so a fresh per-call lookup is simplest and correct).
   */
  private governor(): StructuralDecisionGovernorLike {
    return this.moduleRef.get<StructuralDecisionGovernorLike>(STRUCTURAL_DECISION_GOVERNOR, { strict: false });
  }

  async rebuild(
    playerId: string,
    routeId: string,
    mode: string,
    gameMinute: number,
  ): Promise<RebuildResult> {
    if (!isValidMode(mode)) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `mode must be one of MINIMAL_REROUTE | MODERATE_RESTRUCTURE | FULL_GEOMETRIC_RESET (got "${mode}").`,
      });
    }

    const row = await this.routeLifecycleRepo.readRouteExtended(routeId);
    if (!row || row.player_id !== playerId) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `Route ${routeId} not found` });
    }

    const costCents = costCentsFor(mode);
    const durationTicks = coreLoopsTunables.sinuosityRebuildThroughputPenaltyDurationTicks;
    const completesAtTick = gameMinute + durationTicks;
    // FULL_GEOMETRIC_RESET recomputes WITHOUT the debt term (pure geometry, canon "≈ minimum géométrique");
    // MINIMAL/MODERATE recompute WITH the real, current debt snapshot (debt-aware — see file header).
    const useDebtSnapshot = mode !== 'FULL_GEOMETRIC_RESET';

    const runMutation = async (): Promise<RebuildResult> => {
      const debited = await this.raidRepo.debitWallet(playerId, costCents);
      if (!debited) {
        throw new ApiError('RESOURCE_STATE_CONFLICT', {
          message: `insufficient cash for ${mode} rebuild (needs ${costCents} cents).`,
        });
      }

      const claimed = await this.routeLifecycleRepo.claimRebuild(routeId, playerId, completesAtTick);
      if (!claimed) {
        // I9 — the claim lost the race (or a rebuild is already in flight on this route): refund BEFORE
        // throwing, so the 409 path leaves ZERO net wallet impact (the I7 concurrency floor's own
        // "concurrent rebuild claims -> 1" assertion also checks the loser's wallet nets to its
        // pre-attempt balance).
        await this.routeLifecycleRepo.refundWallet(playerId, costCents);
        throw new ApiError('REBUILD_IN_PROGRESS', {
          message: `route ${routeId} already has an in-flight rebuild (or its downtime has not yet elapsed).`,
        });
      }

      const [originBuilding] = await this.db
        .select({ block_id: building.block_id })
        .from(building)
        .where(eq(building.building_id, row.origin_building_id))
        .limit(1);
      const [destBuilding] = await this.db
        .select({ block_id: building.block_id })
        .from(building)
        .where(eq(building.building_id, row.destination_building_id))
        .limit(1);
      if (!originBuilding || !destBuilding) {
        throw new ApiError('RESOURCE_NOT_FOUND', {
          message: `Origin or destination building not found for route ${routeId}`,
        });
      }

      const debtSnapshot = useDebtSnapshot
        ? await this.corridorDebt.fullDebtSnapshot(playerId)
        : new Map<number, number>(); // FULL_GEOMETRIC_RESET — debt-FREE, pure-geometry recompute.

      const pathResult = await this.routeFinder.computePath(
        playerId,
        originBuilding.block_id,
        destBuilding.block_id,
        row.vehicle_type,
        row.stance as RouteStance,
        debtSnapshot,
      );

      const oldPathBlocks = Array.isArray(row.path_blocks) ? (row.path_blocks as number[]) : [];
      const newPathBlocks    = pathResult?.pathBlocks ?? oldPathBlocks;
      const newVersion        = row.version + 1;
      const riverCrossings    = pathResult?.riverCrossings ?? row.river_crossings;
      const sinuosityIndex    = pathResult?.sinuosityIndex ?? row.sinuosity_index;
      const straightLineDist  = pathResult?.straightLineDistance ?? row.straight_line_distance;

      // Archive the OLD path BEFORE overwriting (same mechanism replanRoute/patch use).
      await this.routeLifecycleRepo.insertVersionHistory({
        route_id: routeId,
        version: row.version,
        path_blocks: oldPathBlocks,
        severed_at_tick: row.state === 'severed' ? BigInt(gameMinute) : null,
        replanned_at_tick: BigInt(gameMinute),
      });

      await this.routeLifecycleRepo.applyRebuildResult(routeId, {
        path_blocks: newPathBlocks,
        straight_line_distance: straightLineDist,
        sinuosity_index: sinuosityIndex,
        river_crossings: riverCrossings,
        newVersion,
        lastRebuiltAtTick: gameMinute,
      });

      // P3-D C6 — additive one-line emit (design §9.2): the annealing subscriber initiates/compounds
      // settling on BOTH the origin and destination buildings. Fires on ALL 3 modes (only reached once
      // the debit+claim above have ALREADY succeeded — never on a refused/409 attempt).
      this.bus.emitRouteRebuilt({
        type: 'route_rebuilt',
        playerId,
        routeId,
        originBuildingId: row.origin_building_id,
        destinationBuildingId: row.destination_building_id,
        gameMinute,
      });

      return { routeId, mode, version: newVersion, rebuildCompletesAtTick: completesAtTick };
    };

    if (mode === 'FULL_GEOMETRIC_RESET') {
      // The ONE STRUCTURAL mode (design §7.4, code 9 `SINUOSITY_FULL_RESET` — catalogue flipped
      // `live:true` this chunk). `governor.commit` reserves atomically BEFORE `runMutation` ever runs
      // (I4 — a session-exhausted 2nd FULL rebuild 409s STRUCTURAL_CAP_EXHAUSTED here WITHOUT touching
      // the wallet or the route at all — the plan's "FULL 2×/session -> 409 cap", REUSE governor) and
      // compensates its OWN counter (never the wallet — `runMutation`'s own responsibility) if
      // `runMutation` throws.
      return this.governor().commit(
        playerId,
        StructuralDecisionType.SINUOSITY_FULL_RESET,
        {
          before: { entity: 'route', route_id: routeId, mode },
          after: { entity: 'route', route_id: routeId, mode },
        },
        runMutation,
      );
    }
    return runMutation();
  }
}
