// IMPLEMENTS: docs/superpowers/plans/2026-07-12-p3-C-supply-chain-plan.md §C2 (legs — activation +
//             accrual d'arrivée; concurrency I1 falsifiable)
//             Design: docs/superpowers/specs/2026-07-12-p3-C-supply-chain-design.md §15 I1 (leg identity
//             — UNIQUE + upsert ON CONFLICT, "the reviewer WILL race it").
//             Pattern: `distribution-test.controller.ts`'s `run-transit-tick` (TEST-ONLY HTTP entry point
//             that calls the REAL, unmodified production method directly — no mock, no stub) + the
//             `testControllersEnabled()` conditional-mount gate every sibling `*-test.controller.ts` uses.
//             — P3-C C2 — 2026-07-12
//
// `SupplyChainTestController` — ONE TEST-ONLY route: a direct invocation seam for
// `LegAccrualService.recordThroughput` (the REAL, unmodified D5 formula + atomic upsert — the exact same
// method the `distribution-transit.service.ts` post-tx-arrival hook calls in production).
//
// WHY this seam exists: the concurrency invariant I1 (design §15) is a property of `LegRepository.
// upsertThroughput`'s ON CONFLICT arbiter — TWO deliveries on the SAME (player, origin, dest) identity
// racing to the SAME row. The real dispatch → transit-tick path batches a player's ENTIRE in-transit
// shift list into one sequential per-tick loop (`distribution-transit.service.ts runMinuteTick`), so two
// concurrent `POST /v1/_test/citysim/advance` calls for the SAME player would each independently observe
// BOTH shifts and race an UNRELATED, pre-existing distribution-transit hazard (no per-shift idempotency
// guard on `applyArrival`'s UPDATE) — a confound this chunk's D3-class wall (the ONE additive hook in
// that file) forbids touching. This seam isolates THIS chunk's OWN invariant (I1) with a clean two-writer
// race on `LegAccrualService.recordThroughput` directly, calling the REAL production code (not a mock),
// exactly the same "TEST-ONLY HTTP entry point onto real logic" shape `run-transit-tick` already
// establishes for the transit tick itself.
//
// GATING: mounted ONLY when NODE_ENV !== 'production' (`testControllersEnabled()`, the same predicate
// every sibling `*-test.controller.ts` in this codebase uses — SupplyChainModule registers this
// conditionally, mirroring `DistributionModule`'s own `...(testControllersEnabled() ? [...] : [])`).
//
// P3-C C3 ADDITION (2026-07-12, plan §C3) — `run-mycelial-decay`: a SECOND TEST-ONLY route, the SAME
// "direct HTTP seam onto the REAL, unmodified production method" shape as `record-throughput` above,
// this time for `MycelialDecayTickService.runTick` (the NIGHTLY/25 tick) — drives decay-exactness,
// stress_streak maintenance, and same-`gameMinute` idempotency directly without waiting for the
// scheduler's own NIGHTLY cadence.
//
// P3-C C5 ADDITION (2026-07-12, plan §C5) — TWO more TEST-ONLY routes:
//   - `run-backpressure-update`: the SAME "direct HTTP seam onto the REAL, unmodified `runTick`" shape,
//     this time for `BackpressureUpdateService` (the MINUTE/26 tick) — drives the I5 concurrency floor
//     (2 concurrent calls, SAME gameMinute → single application) + the exact-arithmetic falsifiables
//     without waiting for the scheduler's own MINUTE cadence.
//   - `read-node-pressure`: a RAW state read (DD-P3 — "lire l'état brut BO-only R2.2 TEST-ONLY"),
//     delegating to `SupplyNodePressureRepository.readAllRaw` — the ONLY way to observe
//     `backpressure_index`/`arrow_to_building_id`/`source_distance_hops` this chunk (C6/C9 build the
//     bucket-only PRODUCTION reads; this floor needs the raw scalars to prove exact arithmetic).

import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import { LegAccrualService } from './leg-accrual.service';
import { MycelialDecayTickService } from './mycelial-decay-tick.service';
import { BackpressureUpdateService } from './backpressure-update.service';
import { SupplyNodePressureRepository, type RawNodePressureRow } from './supply-node-pressure.repository';

interface RecordThroughputBody {
  playerId: string;
  originBuildingId: string;
  destinationBuildingId: string;
  cargoGrams: number;
  routeSinuosityIndex: number;
  gameMinute: number;
}

interface RunMycelialDecayBody {
  playerId: string;
  gameMinute: number;
}

interface RunBackpressureUpdateBody {
  playerId: string;
  gameMinute: number;
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class SupplyChainTestController {
  constructor(
    private readonly legAccrual: LegAccrualService,
    // P3-C C3 — the run-mycelial-decay test seam (Lesson #3: the SAME `runTick` method the scheduler
    // registration calls, never a duplicated re-implementation).
    private readonly mycelialDecayTick: MycelialDecayTickService,
    // P3-C C5 — the run-backpressure-update test seam + the raw-read seam.
    private readonly backpressureUpdate: BackpressureUpdateService,
    private readonly pressureRepository: SupplyNodePressureRepository,
  ) {}

  /**
   * `POST /v1/_test/supply-chain/record-throughput` — TEST-ONLY direct invocation of
   * `LegAccrualService.recordThroughput` (the REAL D5 formula + atomic upsert). Used by the C2
   * concurrency probe (I1: 2 concurrent calls on the SAME (player, origin, dest) identity, `Promise.all`)
   * — asserts exactly 1 `supply_chain_legs` row with `debt_load` = the EXACT sum of both increments.
   *
   * Body: { playerId, originBuildingId, destinationBuildingId, cargoGrams, routeSinuosityIndex,
   *         gameMinute }. Response: { recorded: true }.
   */
  @Post('_test/supply-chain/record-throughput')
  @HttpCode(200)
  async recordThroughput(@Body() body: RecordThroughputBody): Promise<{ recorded: true }> {
    await this.legAccrual.recordThroughput(
      body.playerId,
      body.originBuildingId,
      body.destinationBuildingId,
      Number(body.cargoGrams),
      Number(body.routeSinuosityIndex),
      Number(body.gameMinute),
    );
    return { recorded: true };
  }

  /**
   * `POST /v1/_test/supply-chain/run-mycelial-decay` — TEST-ONLY direct invocation of
   * `MycelialDecayTickService.runTick` (the REAL, unmodified NIGHTLY/25 tick — Lesson #3, the SAME
   * method the scheduler registration calls). Used by the C3 floor: decay-exactness, stress_streak
   * maintenance, and same-`gameMinute` idempotency (a 2nd call with the IDENTICAL `gameMinute` must
   * return `touched: 0`).
   *
   * Body: { playerId, gameMinute }. Response: { touched: <count of legs the tick actually wrote>. }
   */
  @Post('_test/supply-chain/run-mycelial-decay')
  @HttpCode(200)
  async runMycelialDecay(@Body() body: RunMycelialDecayBody): Promise<{ touched: number }> {
    const touched = await this.mycelialDecayTick.runTick(body.playerId, Number(body.gameMinute));
    return { touched };
  }

  /**
   * `POST /v1/_test/supply-chain/run-backpressure-update` — TEST-ONLY direct invocation of
   * `BackpressureUpdateService.runTick` (the REAL, unmodified MINUTE/26 tick — Lesson #3, the SAME method
   * the scheduler registration calls). Used by the C5 floor: exact-arithmetic accrual/propagation/relief +
   * the I5 same-`gameMinute` idempotency probe (2 concurrent calls, `Promise.all`, asserting the SAME
   * post-state as a single call).
   *
   * Body: { playerId, gameMinute }. Response: { sourcesAccrued, nodesPropagated }.
   */
  @Post('_test/supply-chain/run-backpressure-update')
  @HttpCode(200)
  async runBackpressureUpdate(
    @Body() body: RunBackpressureUpdateBody,
  ): Promise<{ sourcesAccrued: number; nodesPropagated: number }> {
    return this.backpressureUpdate.runTick(body.playerId, Number(body.gameMinute));
  }

  /**
   * `GET /v1/_test/supply-chain/read-node-pressure?playerId=` — TEST-ONLY RAW read of every
   * `supply_node_pressure` row the player owns (DD-P3 — "lire l'état brut BO-only R2.2 TEST-ONLY"),
   * delegating to `SupplyNodePressureRepository.readAllRaw`. The ONLY way to observe the raw
   * `backpressure_index`/`arrow_to_building_id`/`source_distance_hops`/`last_propagation_tick` this chunk
   * (C6/C9 build the bucket-only PRODUCTION reads — R2.2). Response: `{ nodes: RawNodePressureRow[] }`.
   */
  @Get('_test/supply-chain/read-node-pressure')
  async readNodePressure(@Query('playerId') playerId: string): Promise<{ nodes: RawNodePressureRow[] }> {
    const nodes = await this.pressureRepository.readAllRaw(playerId);
    return { nodes };
  }
}
