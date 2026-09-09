// IMPLEMENTS: docs/superpowers/plans/2026-07-13-04g-A-constant-hum-plan.md C2
//             Design: docs/superpowers/specs/2026-07-13-04g-A-constant-hum-design.md §3.2 (Poisson
//             stream + decay) + §8 (idempotence/crash-safety)
//             Scheduler seam S1: services/game-back/src/citysim/scheduler/city_sim_system.ts
//             (CitySystemId + Cadence) + city_sim_scheduler.service.ts (SCHEDULE + registerSystem) —
//             NIGHTLY/27, the next-free slot after FLAG_DISCIPLINE_TICK/24 (C0 re-anchor).
//             RNG seam S6: common/seeded-rng.ts's `makeRng` — seed `ambient:{game_day}:{district_id}`.
//             Precompute-then-observe precedent (DD-M4): equipment-failure.service.ts's exported
//             `equipmentFailureWeeklySeed`/`equipmentFailureWeeklyProbability` — the SAME production
//             seed/draw functions the E2E precomputes against, never re-implemented in the test.
//             — 04g-A C2 — 2026-07-13
//
// `AmbientMicroEventService` — NIGHTLY phase 1 (design §3.2): the decay sweep THEN the Poisson-seeded
// micro-event generation, registered as `AMBIENT_DAILY_TICK` at NIGHTLY/27.
//
// THE TICK BODY (per-player-firing, city-global-state — the SAME established shape as
// `ConstantHumService`/`PoliticalCalendarTickService`): the city-sim engine is per-player-clocked, so
// `run(ctx)` fires once per PLAYER's own NIGHTLY boundary crossing, yet the micro-event stream is
// explicitly city-global (design §3.2: "Par district" — all 18 districts, every game_day, not gated by
// any one player's buildings). Idempotency is a PER-(game_day, district) claim
// (`AmbientMicroEventRepository.generateForDistrict`'s advisory-lock + existence-check transaction) —
// whichever player's firing reaches a given game_day FIRST generates that day's events for every
// district; every other (or later) firing for the SAME game_day is a pure no-op (C2 AC3).
//
// ORDER OF OPERATIONS (design §3.2 — decay BEFORE generation, so a freshly-expired row never confuses a
// same-tick read):
//   1. derive `gameDay` from `gameMinute` (`ambient-clock.ts`'s `deriveGameDay` — SAME helper C1 uses).
//   2. decay sweep: every `live` row past its `expires_at_game_minute` → `expired` (ONE set-based UPDATE,
//      `AmbientMicroEventRepository.sweepExpired`) — touches ONLY `status` (D9 "routine residue").
//   3. per district (ALL 18, city-global): seed `makeRng(ambientMicroEventSeed(gameDay, districtId))`,
//      draw the day's batch via `generateDistrictDraw` (count → kinds → hours, in that FIXED order — the
//      SAME sequence the precompute-then-observe E2E replays against the SAME exported function), then
//      claim-and-insert via `generateForDistrict` (idempotent per (game_day, district)).
//
// Determinism: NO `Math.random()`/`Date.now()` anywhere in this file. `generateDistrictDraw` is a PURE
// function of `(rng, lambda, clamp, cellsPerWeek)` — re-running the SAME tick against the SAME DB state
// (a claim already consumed) is a no-op, byte-identical (C2 AC3).
//
// C3 EXTENDS THIS SAME REGISTRATION (design §3.4 "NIGHTLY/27 phase 2"): `OffHoursDriftDetector`'s trip
// scan runs AFTER phase 1, inside the SAME `AMBIENT_DAILY_TICK` slot — this chunk (C2) ships phase 1 only;
// C3 amends `onApplicationBootstrap`'s `run` callback to also invoke the detector, in-order, same tick.

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { Cadence, CitySystemId } from '../../citysim/scheduler/city_sim_system';
import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { citySimTunables } from '../../citysim/citysim-tunables';
import { makeRng, type Rng } from '../../common/seeded-rng';
import { ambientTunables } from './ambient.tunables';
import { deriveGameDay } from './ambient-clock';
import {
  AmbientMicroEventRepository,
  type AmbientChannelValue,
  type AmbientMicroEventKindValue,
  type NewAmbientMicroEventRow,
} from './ambient-micro-event.repository';
import { OffHoursDriftDetectorService } from './off-hours-drift.detector';

/** The NIGHTLY slot this tick registers at — RENUMBERED 25→27 at P3-C integration (P3-C took NIGHTLY/25
 *  MYCELIAL_DECAY + /26 ROUTE_PATCH; 27 = next free). Must match the SCHEDULE entry or registerSystem throws. */
export const AMBIENT_DAILY_TICK_ORDER = 27;

/** The seeded-rng key for one district's daily draw (design §3.2 verbatim: `ambient:{game_day}:{district_id}`). */
export function ambientMicroEventSeed(gameDay: number, districtId: number): string {
  return `ambient:${gameDay}:${districtId}`;
}

/** The 6 canon-verbatim kinds, in a FIXED declared order — this order is what `generateDistrictDraw`'s
 *  `rng.int(0, 5)` indexes into (part of the deterministic seam the precompute-then-observe test replays,
 *  same-order requirement, design §3.2). Mirrors the pgEnum's own member order (`ambient_world.ts`). */
export const AMBIENT_MICRO_EVENT_KINDS: readonly AmbientMicroEventKindValue[] = [
  'corner_fight',
  'stalled_tram',
  'delayed_shipment',
  'noisy_block',
  'building_inspection',
  'bar_rumor',
];

/** kind → channel (design §3.2/D6 — derived, NEVER independently drawn). */
const CHANNEL_BY_KIND: Record<AmbientMicroEventKindValue, AmbientChannelValue> = {
  corner_fight: 'constant_hum',
  noisy_block: 'constant_hum',
  building_inspection: 'constant_hum',
  stalled_tram: 'trade_channel',
  delayed_shipment: 'trade_channel',
  bar_rumor: 'bar_talk',
};

export function channelForKind(kind: AmbientMicroEventKindValue): AmbientChannelValue {
  return CHANNEL_BY_KIND[kind];
}

/**
 * ONE seeded draw: the Poisson count via CDF inversion (design §3.2 "inversion CDF Poisson"). Consumes
 * EXACTLY ONE `rng.next()` draw regardless of the outcome — the recurrence `p(k) = p(k-1) × λ/k` builds
 * the CDF term-by-term and stops at the first `k` whose cumulative mass reaches the single uniform draw
 * `u`. `clamp` bounds the RETURNED value (the F4 guard, design §3.2/D5) — the RAW (unclamped) count is
 * never persisted or observed outside this function.
 */
export function poissonDraw(rng: Rng, lambda: number, clamp: number): number {
  const u = rng.next();
  let k = 0;
  let pmf = Math.exp(-lambda);
  let cdf = pmf;
  while (u > cdf) {
    k += 1;
    pmf *= lambda / k;
    cdf += pmf;
  }
  return Math.min(k, clamp);
}

/** One district's full daily draw (design §3.2: "ordre de tirage fixe : count → kinds → hours"). */
export interface DistrictDraw {
  readonly count: number;
  readonly kinds: readonly AmbientMicroEventKindValue[];
  readonly hours: readonly number[];
}

/**
 * The FULL deterministic draw for one district, ONE seeded `rng` instance, in the FIXED order the design
 * mandates: (1) the Poisson count `K` (ONE draw), (2) `K` kind draws (`rng.int(0, 5)` indexing
 * `AMBIENT_MICRO_EVENT_KINDS`), (3) `K` hour-of-week draws (`rng.int(0, cellsPerWeek-1)`). This is the
 * EXACT function the precompute-then-observe E2E imports directly (DD-M4 anti-fig-leaf pattern) — never
 * re-implemented in the test.
 */
export function generateDistrictDraw(rng: Rng, lambda: number, clamp: number, cellsPerWeek: number): DistrictDraw {
  const count = poissonDraw(rng, lambda, clamp);
  const kinds: AmbientMicroEventKindValue[] = [];
  for (let i = 0; i < count; i += 1) {
    kinds.push(AMBIENT_MICRO_EVENT_KINDS[rng.int(0, AMBIENT_MICRO_EVENT_KINDS.length - 1)]!);
  }
  const hours: number[] = [];
  for (let i = 0; i < count; i += 1) {
    hours.push(rng.int(0, cellsPerWeek - 1));
  }
  return { count, kinds, hours };
}

/** One district's generation outcome this tick (logged + returned by the gated direct-probe route). */
export interface AmbientDistrictGenerationResult {
  readonly districtId: number;
  /** The draw's count BEFORE the idempotency claim (may be > 0 even when `insertedCount` is 0 — a
   *  same-game_day re-run redraws the SAME deterministic count but inserts nothing, claim already held). */
  readonly drawnCount: number;
  /** Rows actually inserted (0 iff the (game_day, district) claim was already consumed). */
  readonly insertedCount: number;
}

/** Result of one `runDailyTick` call. */
export interface AmbientDailyTickResult {
  readonly gameDay: number;
  /** Rows flipped `live` → `expired` this sweep (diagnostic; design §3.2 "routine residue"). */
  readonly expiredCount: number;
  readonly districts: readonly AmbientDistrictGenerationResult[];
}

@Injectable()
export class AmbientMicroEventService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AmbientMicroEventService.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly repo: AmbientMicroEventRepository,
    // C3: phase 2 of the SAME AMBIENT_DAILY_TICK — see this file's own C2 header ("C3 amends
    // onApplicationBootstrap's run callback to also invoke the detector, in-order, same tick").
    private readonly driftDetector: OffHoursDriftDetectorService,
  ) {}

  /**
   * Register `AMBIENT_DAILY_TICK` at NIGHTLY/27 on the shared scheduler at application bootstrap. The slot
   * is declared in `CitySimSchedulerService.SCHEDULE` + `CitySystemId` (C2 additions, same commit) —
   * `registerSystem` throws at boot if it is not.
   */
  onApplicationBootstrap(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.AMBIENT_DAILY_TICK,
      cadence: Cadence.NIGHTLY,
      order: AMBIENT_DAILY_TICK_ORDER,
      // City-global stream — ctx.playerId is never read (mirrors CONSTANT_HUM_CELL_TICK's own shape).
      run: async (ctx) => {
        await this.runDailyTick(ctx.gameMinute);
        // C3 phase 2 — OffHoursDriftDetector, AFTER phase 1 (decay+generation), SAME tick, SAME gameDay
        // derivation (design §3.4 "NIGHTLY/27 phase 2"). Contained: phase 1's already-committed work
        // (decay sweep + generation) must never be jeopardized by a phase-2 fault — mirrors the exception
        // producers' own `.catch()`-contained isolation (`heat-pressure-exception-producer.service.ts`) and
        // `CityEventBus.dispatch`'s per-listener try/catch philosophy applied here to a same-tick phase
        // boundary instead of a cross-system event.
        try {
          const gameDay = deriveGameDay(ctx.gameMinute, citySimTunables.inGameDayLengthMinutes);
          await this.driftDetector.runDetection(gameDay);
        } catch (err) {
          this.logger.error(
            `AMBIENT_DAILY_TICK phase 2 (OffHoursDriftDetector) failed (contained, phase 1 unaffected): ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      },
    });
    this.logger.log(
      `AmbientMicroEventService: registered AMBIENT_DAILY_TICK at NIGHTLY/${AMBIENT_DAILY_TICK_ORDER} — ` +
        'phase 1 (decay sweep + Poisson-seeded micro-event generation, C2) + phase 2 (OffHoursDriftDetector, C3).',
    );
  }

  /**
   * The tick body — a function of `gameMinute` alone (+ persisted, deterministic DB state). Called by the
   * real scheduler registration above AND directly by the gated test-only `run-daily-tick` probe
   * (`ambient-test.controller.ts`), the SAME direct-probe idiom `ConstantHumService.runHourlyTick` (C1)
   * established for boundary-heavy scenarios (the decay-boundary AC needs exact `gameMinute` control the
   * per-minute clock-advance harness cannot give economically).
   */
  async runDailyTick(gameMinute: number): Promise<AmbientDailyTickResult> {
    const gameDay = deriveGameDay(gameMinute, citySimTunables.inGameDayLengthMinutes);

    // Phase 1a — decay sweep (design §3.2: BEFORE generation, so a freshly-expired row this same tick
    // never gets re-counted as a fresh observation by the generation phase below).
    const expiredCount = await this.repo.sweepExpired(gameMinute);

    // Phase 1b — Poisson-seeded generation, per district, city-global (ALL 18 districts, not gated by any
    // one player's buildings — design §3.2).
    const lambda = ambientTunables.constantHumEventsPerWardPerDay;
    const clamp = ambientTunables.constantHumMicroEventsPerDistrictDailyClamp;
    const cellsPerWeek = ambientTunables.constantHumCellsPerWeek;
    const decayWindowMinutes = ambientTunables.constantHumDecayWindowHours * 60;

    const districtIds = await this.repo.listAllDistrictIds();
    const districts: AmbientDistrictGenerationResult[] = [];
    for (const districtId of districtIds) {
      const rng = makeRng(ambientMicroEventSeed(gameDay, districtId));
      const draw = generateDistrictDraw(rng, lambda, clamp, cellsPerWeek);
      const rows: NewAmbientMicroEventRow[] = draw.kinds.map((kind, i) => ({
        game_day: gameDay,
        district_id: districtId,
        hour_of_week: draw.hours[i]!,
        kind,
        channel: channelForKind(kind),
        expires_at_game_minute: gameMinute + decayWindowMinutes,
      }));
      const insertedCount = await this.repo.generateForDistrict(gameDay, districtId, rows);
      districts.push({ districtId, drawnCount: draw.count, insertedCount });
    }
    return { gameDay, expiredCount, districts };
  }
}
