// IMPLEMENTS: docs/tech/04_city_simulation/tick_schedule_and_memory_budget.md (deterministic clock driver)
//             — test-only harness on a production-gated `/v1/_test/*` route
//             -- session:2026-06-02 (Phase 1 Task 1) --
//
// `CitySimTestController` — the TEST-ONLY deterministic clock-advance harness under `/v1/_test/citysim/*`.
//
// GATING: this controller introduces a production-gated `/v1/_test/*` route — it is registered by
// SchedulerModule ONLY when NODE_ENV != 'production' (see SchedulerModule.controllers). In production the
// route is simply not mounted → 404. (This is stricter than protocol.controller.ts's own `/v1/_test/*`
// routes, which are NOT production-gated; this harness deliberately is.) This is THE canonical
// deterministic clock-driver every downstream system E2E (T2–T13) calls: advance a player's in-game clock
// by N in-game minutes and run every cadence handler for every boundary crossed, in DAG order.

import { Body, Controller, Get, HttpCode, Inject, Post, Query } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Cadence, CitySystemId } from './city_sim_system';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import { ApiError } from '../../protocol/api-error';
import { CitySimSchedulerService, type AdvanceSummary, type SystemProfileMetric } from './city_sim_scheduler.service';
import { CityEventBus, type CohesionState } from '../events/city-event-bus';
import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { cityEpoch } from '../../db/schema/city_epoch';
import { PinnedCitySimClock } from './city-sim-clock.port';

@Controller({ version: String(CURRENT_API_MAJOR) })
export class CitySimTestController {
  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly bus: CityEventBus,
    @Inject(DB) private readonly db: DrizzleClient,
    // W1.1-d C2 — the CONCRETE class (not the CITYSIM_CLOCK interface token): mutation methods
    // (advanceByMs/reset) live only on this class, mirroring LiveOpsTestController's own direct injection
    // of FakeLiveOpsClock (its class token) alongside the interface-typed LIVE_OPS_CLOCK its OWN consumers
    // use. Always resolvable regardless of CITYSIM_CONTINUOUS_LOOPS (scheduler.module.ts always registers
    // this class) — see that file's own header for why an unused instance under the flag is harmless.
    private readonly pinnedClock: PinnedCitySimClock,
  ) {}

  /**
   * `POST /v1/_test/citysim/epoch/set?game_minute=N` — TEST-ONLY (W1.1-d C1): pin the city-global epoch
   * (`city_epoch`, the SINGLETON row C1.1 poses) directly to `N`. WHY A SEAM: no pilot exists yet in this
   * chunk (C3 is the bounded pilot that organically advances `city_epoch.game_minute` — NOT this chunk),
   * so under the E2E harness the epoch would otherwise sit at its migration-time origin (0) forever,
   * making any C1.2-closing assertion vacuous (E ≈ 0 — the SAME defect the design flags for the deposit-
   * flow narrative, §C1.2: "le juge du dépôt ne peut PAS l'attraper"). A spec that wants to prove the
   * signup-time reanchor (C1.3) actually reads a NON-TRIVIAL epoch must pin it here FIRST. Returns the
   * value actually stored (post-CHECK, so a caller can confirm the write landed).
   */
  @Post('_test/citysim/epoch/set')
  @HttpCode(200)
  async setEpoch(
    @Query('game_minute') gameMinuteQuery?: string,
    @Body() body?: { game_minute?: number },
  ): Promise<{ game_minute: number }> {
    const raw = gameMinuteQuery ?? (body?.game_minute !== undefined ? String(body.game_minute) : undefined);
    const n = Number.parseInt(raw ?? '', 10);
    if (Number.isNaN(n) || n < 0) {
      throw new ApiError('VALIDATION_FAILED', {
        message: 'game_minute must be a non-negative integer',
        details: { validation_field_errors: [{ field_path: '/game_minute', rule_violated: 'NON_NEGATIVE_INTEGER' }] },
      });
    }
    const [row] = await this.db
      .update(cityEpoch)
      .set({ game_minute: n })
      .where(eq(cityEpoch.id, 1))
      .returning({ game_minute: cityEpoch.game_minute });
    return { game_minute: row.game_minute };
  }

  /**
   * `GET /v1/_test/citysim/epoch` — TEST-ONLY (W1.1-d C1): read the current city-global epoch. Read-only
   * probe (the `_test/citysim/schedule` precedent) so a spec can assert the pin landed before signing up
   * accounts against it.
   */
  @Get('_test/citysim/epoch')
  @HttpCode(200)
  async getEpoch(): Promise<{ game_minute: number }> {
    const [row] = await this.db.select({ game_minute: cityEpoch.game_minute }).from(cityEpoch).limit(1);
    return { game_minute: row?.game_minute ?? 0 };
  }

  /**
   * `POST /v1/_test/citysim/advance?ticks=N&player_id=<uuid>` — deterministically advance the player's
   * in-game clock by N in-game minutes AND run every cadence handler for every boundary crossed (minute,
   * 5-min, 30-min, 12-h, nightly, weekly) in DAG order, plus step the 2 Hz systems deterministically.
   * Lazily creates the clock row on first advance. Returns `{player_id, game_minute, advanced_by,
   * cadences_fired}` (the EnvelopeInterceptor wraps it in a success ResponseEnvelope).
   */
  @Post('_test/citysim/advance')
  @HttpCode(200)
  async advance(
    @Query('ticks') ticks?: string,
    @Query('player_id') playerIdQuery?: string,
    @Body() body?: { ticks?: number; player_id?: string },
  ): Promise<AdvanceSummary> {
    const rawTicks = ticks ?? (body?.ticks !== undefined ? String(body.ticks) : undefined);
    const playerId = playerIdQuery ?? body?.player_id;
    const n = Number.parseInt(rawTicks ?? '', 10);
    if (Number.isNaN(n) || n < 1) {
      // Typed domain error → GlobalExceptionFilter renders 422 VALIDATION_FAILED (same convention as
      // auth.controller.ts), not a scrubbed 500 INTERNAL_ERROR. This harness is the driver every
      // downstream E2E (T2–T13) calls, so a clear 422 on a bad call is the contract.
      throw new ApiError('VALIDATION_FAILED', {
        message: 'ticks must be a positive integer',
        details: { validation_field_errors: [{ field_path: '/ticks', rule_violated: 'POSITIVE_INTEGER' }] },
      });
    }
    if (!playerId || !/^[0-9a-f-]{36}$/.test(playerId)) {
      throw new ApiError('VALIDATION_FAILED', {
        message: 'player_id must be a UUID',
        details: { validation_field_errors: [{ field_path: '/player_id', rule_violated: 'UUID' }] },
      });
    }
    return this.scheduler.advancePlayer(playerId, n);
  }

  /**
   * `GET /v1/_test/citysim/profile` — TEST-ONLY: dump the accumulated per-system profiling metrics, sorted by
   * totalMs descending. Only meaningful when the stack was started with CITYSIM_PROFILE=on. Returns an empty
   * `systems` array when profiling is off (profileEnabled=false, the default).
   *
   * Each row: `{ key, cadence, systemId, totalMs, calls, msPerCall, pctOfTotal }`.
   * `pctOfTotal` is relative to the sum of all profiled system totalMs (not wall-time of the whole advance).
   */
  @Get('_test/citysim/profile')
  @HttpCode(200)
  getProfile(): { systems: SystemProfileMetric[]; grandTotalMs: number } {
    const systems = this.scheduler.getProfileStats();
    const grandTotalMs = systems.reduce((s, r) => s + r.totalMs, 0);
    return { systems, grandTotalMs };
  }

  /**
   * `POST /v1/_test/citysim/profile/reset` — TEST-ONLY: reset (clear) the per-system profiling accumulators
   * so a new representative advance run gets a clean slate. No-op when CITYSIM_PROFILE is off.
   */
  @Post('_test/citysim/profile/reset')
  @HttpCode(200)
  resetProfile(): { reset: true } {
    this.scheduler.resetProfileStats();
    return { reset: true };
  }

  /**
   * `GET /v1/_test/citysim/budgets` — TEST-ONLY (TD-092 F4): expose the F4 budget snapshot so an
   * E2E spec can assert the RAM watermark and circuit-breaker guards DIRECTLY, not indirectly via a
   * boot panic. Returns `{measuredRamKb, criticalRamKb, tickMaxMs, twoHzDegraded, twoHzCurrentHz}`:
   *   - measuredRamKb / criticalRamKb: the same values compared by `logRamWatermark()` at boot.
   *   - tickMaxMs: the circuit-breaker threshold (perf.game.tick_max_ms tunable).
   *   - twoHzDegraded / twoHzCurrentHz: whether the 2 Hz loop has been degraded since boot.
   *
   * The EnvelopeInterceptor wraps the result in a success ResponseEnvelope (payload.data).
   */
  @Get('_test/citysim/budgets')
  @HttpCode(200)
  getBudgets(): {
    measuredRamKb: number;
    criticalRamKb: number;
    tickMaxMs: number;
    twoHzDegraded: boolean;
    twoHzCurrentHz: number;
  } {
    return this.scheduler.getBudgetSnapshot();
  }

  /**
   * `GET /v1/_test/citysim/schedule` — TEST-ONLY (Forensic C5): expose the canonical SCHEDULE const so an
   * E2E spec can assert the DAG slots DIRECTLY — verifying that a new slot (e.g. NIGHTLY/9 or WEEKLY/9) was
   * added to the const without touching the boot path. Returns `{ schedule: [{ cadence, order, id }] }`.
   *
   * Why a probe: the SCHEDULE const is boot-critical (registerSystem throws if a slot is absent); this probe
   * exposes the live const post-boot, making the C5 spec FALSIFIABLE against the real running stack rather
   * than a static grep (which would not catch a const that compiled but failed to serialize correctly).
   * Mirrors the _test/citysim/budgets probe pattern (read-only, no side effects).
   */
  @Get('_test/citysim/schedule')
  @HttpCode(200)
  getSchedule(): { schedule: ReadonlyArray<{ cadence: Cadence; order: number; id: CitySystemId }> } {
    return { schedule: CitySimSchedulerService.SCHEDULE };
  }

  /**
   * `POST /v1/_test/citysim/emit-cohesion-state?player_id=<uuid>&district_id=<n>&to=THAWED[&from=FRAGILE]` —
   * TEST-ONLY: emit a CANONICAL CohesionStateChangedEvent onto the CityEventBus, exactly as System 5 (Cohesion
   * Permafrost) does at a NIGHTLY band transition. This drives the System 5 → System 6 cascade seam (Inv 5) for
   * E2E verification: System 6 (Inspection Queue) subscribes to this event and, on a THAWED transition, arms a
   * cascade for the district. WHY A HOOK: in the Phase-1 build the live cohesion tick flushes the patrol queue
   * before every nightly read, so cohesion only ever RECOVERS — a real STABLE/FRAGILE→THAWED *transition* (the
   * event fires only on a band change) is not reachable through the deterministic advance harness (the cohesion
   * E2E test (3) confirms this: it drives an already-thawed state, never a transition). This hook emits the
   * identical bus event the cross-system consumer reacts to — the same category of test infrastructure as the
   * advance harness, production-gated the same way (NODE_ENV != 'production'). It is NOT a gameplay path.
   */
  @Post('_test/citysim/emit-cohesion-state')
  @HttpCode(200)
  emitCohesionState(
    @Query('player_id') playerId?: string,
    @Query('district_id') districtIdQuery?: string,
    @Query('to') to?: string,
    @Query('from') from?: string,
  ): { emitted: true; playerId: string; districtId: number; from: CohesionState; to: CohesionState } {
    if (!playerId || !/^[0-9a-f-]{36}$/.test(playerId)) {
      throw new ApiError('VALIDATION_FAILED', { message: 'player_id must be a UUID' });
    }
    const districtId = Number.parseInt(districtIdQuery ?? '', 10);
    if (Number.isNaN(districtId) || districtId < 1) {
      throw new ApiError('VALIDATION_FAILED', { message: 'district_id must be a positive integer' });
    }
    const toBand = (to ?? 'THAWED') as CohesionState;
    const fromBand = (from ?? 'FRAGILE') as CohesionState;
    if (!['STABLE', 'FRAGILE', 'THAWED'].includes(toBand) || !['STABLE', 'FRAGILE', 'THAWED'].includes(fromBand)) {
      throw new ApiError('VALIDATION_FAILED', { message: 'from/to must be STABLE|FRAGILE|THAWED' });
    }
    this.bus.emitCohesionStateChanged({
      type: 'cohesion_state_changed',
      playerId,
      districtId,
      from: fromBand,
      to: toBand,
      permanentMarginal: false,
      gameMinute: 0,
    });
    return { emitted: true, playerId, districtId, from: fromBand, to: toBand };
  }

  /**
   * `POST /v1/_test/citysim/raid?player_id=<uuid>&block_id=<n>[&district_id=<n>]` — TEST-ONLY: emit a CANONICAL
   * RaidPlannedEvent onto the CityEventBus, exactly as System 4 (Patrol Doctrine) does at its 12h precinct review.
   * This drives the Phase-2b raid-execution consequence seam for E2E verification: RaidExecutionService SUBSCRIBES
   * to this event, BUFFERS it synchronously, and on its next MINUTE tick (driven by the advance harness) EXECUTES
   * the seizure (seize product_storage → DAMAGED → building_raid) on the player's operational product-holding
   * buildings on the raided block. WHY A HOOK (the emit-cohesion-state / heat-inject / lek-weekly precedent): the
   * organic producer is System 4's 12h review, which itself needs the full Phase-1 heat→patrol→suspicion chain to
   * reach a plan-raid decision — not deterministically reachable through the advance harness in isolation. This hook
   * emits the IDENTICAL bus event the production consumer reacts to (the SINGLE code path: the hook emits onto the
   * bus, same as System 4 would) — production-gated the same way (NODE_ENV != 'production'). It is NOT a gameplay
   * path. district_id defaults to 1 (the consequence does not depend on it — the raid resolves by block).
   */
  @Post('_test/citysim/raid')
  @HttpCode(200)
  raid(
    @Query('player_id') playerId?: string,
    @Query('block_id') blockIdQuery?: string,
    @Query('district_id') districtIdQuery?: string,
  ): { emitted: true; playerId: string; targetBlockId: number; districtId: number } {
    if (!playerId || !/^[0-9a-f-]{36}$/.test(playerId)) {
      throw new ApiError('VALIDATION_FAILED', { message: 'player_id must be a UUID' });
    }
    const targetBlockId = Number.parseInt(blockIdQuery ?? '', 10);
    if (Number.isNaN(targetBlockId) || targetBlockId < 1) {
      throw new ApiError('VALIDATION_FAILED', { message: 'block_id must be a positive integer' });
    }
    const districtIdRaw = Number.parseInt(districtIdQuery ?? '1', 10);
    const districtId = Number.isNaN(districtIdRaw) || districtIdRaw < 1 ? 1 : districtIdRaw;
    this.bus.emitRaidPlanned({
      type: 'raid_planned',
      playerId,
      precinctId: districtId, // the precinct owns the district; the consequence resolves by block, not precinct.
      districtId,
      targetBlockId,
      gameMinute: 0,
    });
    return { emitted: true, playerId, targetBlockId, districtId };
  }

  /**
   * `GET /v1/_test/citysim/clock/now` — TEST-ONLY (W1.1-d C2): read the CITYSIM_CLOCK seam directly.
   * Read-only probe (the `_test/citysim/epoch`/`_test/citysim/budgets` precedent) — the falsifiable unit
   * for "sans aucun geste de pin, deux lectures espacées d'une attente réelle rendent la MÊME valeur"
   * (design §C2): a spec calls this, waits a REAL amount of time, calls it again, and asserts equality —
   * the inverse of `FakeLiveOpsClock`'s own default (`_test/liveops/clock/now` would move under the same
   * real wait; this must NOT).
   */
  @Get('_test/citysim/clock/now')
  @HttpCode(200)
  getCitySimClockNow(): { now: string } {
    return { now: this.pinnedClock.now().toISOString() };
  }

  /**
   * `POST /v1/_test/citysim/clock/advance?ms=N` — TEST-ONLY (W1.1-d C2): advance the frozen CITYSIM_CLOCK
   * instant by `ms` milliseconds. This is the ONLY way `elapsed > 0` becomes observable under the default
   * (pinned) polarity — a real wall-clock wait produces NO movement (see `getCitySimClockNow` above); a
   * spec that wants `tickIfDue`/the continuous-tour test driver to actually tick a player calls this
   * FIRST. Mirrors `FakeLiveOpsClock`'s `_test/liveops/clock/advance` shape (`advanceByMs`), INVERTED
   * default. Under `CITYSIM_CONTINUOUS_LOOPS=1` this mutates an UNUSED `PinnedCitySimClock` instance
   * (`RealCitySimClock` is what's actually bound) — harmless, see `scheduler.module.ts`'s own header.
   */
  @Post('_test/citysim/clock/advance')
  @HttpCode(200)
  advanceCitySimClock(@Query('ms') msQuery?: string, @Body() body?: { ms?: number }): { now: string } {
    const raw = msQuery ?? (body?.ms !== undefined ? String(body.ms) : undefined);
    const ms = Number.parseInt(raw ?? '', 10);
    if (Number.isNaN(ms) || ms <= 0) {
      throw new ApiError('VALIDATION_FAILED', { message: 'ms must be a positive integer' });
    }
    this.pinnedClock.advanceByMs(ms);
    return { now: this.pinnedClock.now().toISOString() };
  }

  /**
   * `POST /v1/_test/citysim/clock/reset` — TEST-ONLY (W1.1-d C2): restore CITYSIM_CLOCK's default frozen
   * floor. Test cleanup — never leaks an advanced instant into a later, unrelated spec sharing the same
   * E2E stack (the `_test/liveops/clock/reset` precedent, `FakeLiveOpsClock.reset()`).
   */
  @Post('_test/citysim/clock/reset')
  @HttpCode(200)
  resetCitySimClock(): { now: string } {
    this.pinnedClock.reset();
    return { now: this.pinnedClock.now().toISOString() };
  }

  /**
   * `POST /v1/_test/citysim/tick-if-due?player_id=<uuid>` — TEST-ONLY (W1.1-d C2/C3): drive
   * `CitySimSchedulerService#tickIfDue` for ONE player directly. Touches ONLY `player_id`'s own row (never
   * a bulk query over other players) — this is what makes it safe to use as the falsifiable unit for
   * BOTH C2 ("elapsed ≤ 0 ⇒ zero tick, never an exception") AND C3 ("bounded to open sessions" — a player
   * with no fresh session gets `ticked:false` regardless of clock state) without risking a co-tenant
   * player sharing the same E2E stack (the real bulk population lives behind
   * `run-continuous-tour`, below, used ONLY for the inter-instance-lock proof).
   */
  @Post('_test/citysim/tick-if-due')
  @HttpCode(200)
  async tickIfDue(
    @Query('player_id') playerIdQuery?: string,
    @Body() body?: { player_id?: string },
  ): Promise<{ playerId: string; ticked: boolean; game_minute: number }> {
    const playerId = playerIdQuery ?? body?.player_id;
    if (!playerId || !/^[0-9a-f-]{36}$/.test(playerId)) {
      throw new ApiError('VALIDATION_FAILED', { message: 'player_id must be a UUID' });
    }
    const result = await this.scheduler.tickIfDue(playerId);
    return { playerId, ...result };
  }

  /**
   * `POST /v1/_test/citysim/tick-if-due-loop?player_id=<uuid>&periods=N[&ms_per_period=M]` — TEST-ONLY
   * (W1.1-d C4): drive `tick-if-due` above, `periods` times in a row, server-side — advancing the PINNED
   * clock by `ms_per_period` (default 1 ms — any positive value; only `elapsed > 0` matters, `tickIfDue`'s
   * own C2 contract) before EACH call. Touches ONLY `player_id`'s own row (the SAME "never a bulk query
   * over other players" discipline `tick-if-due` documents) — it is `tick-if-due` batched into ONE
   * HTTP round-trip, NEVER a parallel re-implementation and NEVER `_test/citysim/advance` (the
   * deterministic harness `advancePlayer` drives directly — C4's own falsifiable is explicitly about the
   * CONTINUOUS-PILOT path, `tickIfDue`, never that harness).
   *
   * WHY THIS EXISTS: C4's falsifiable needs a player's `game_minute` to cross a full NIGHTLY boundary
   * (`in_game_day_length_minutes`, 1440 at the canonical default) via the continuous pilot ALONE — that is
   * 1440 individual `tickIfDue` calls, each needing the clock to have moved since the last one. Paying that
   * as 2880 separate HTTP round-trips (clock/advance + tick-if-due, ×1440) is pure test-harness overhead;
   * this route pays the SAME 1440 `tickIfDue` invocations in-process instead (the `run-continuous-tour`
   * precedent of bypassing `setInterval` for test economics, extended to bypass repeated HTTP round-trips
   * too — never a change to what `tickIfDue` itself does).
   */
  @Post('_test/citysim/tick-if-due-loop')
  @HttpCode(200)
  async tickIfDueLoop(
    @Query('player_id') playerIdQuery?: string,
    @Query('periods') periodsQuery?: string,
    @Query('ms_per_period') msPerPeriodQuery?: string,
  ): Promise<{ playerId: string; periodsRun: number; tickedCount: number; game_minute: number }> {
    const playerId = playerIdQuery;
    if (!playerId || !/^[0-9a-f-]{36}$/.test(playerId)) {
      throw new ApiError('VALIDATION_FAILED', { message: 'player_id must be a UUID' });
    }
    const periods = Number.parseInt(periodsQuery ?? '', 10);
    if (Number.isNaN(periods) || periods < 1) {
      throw new ApiError('VALIDATION_FAILED', { message: 'periods must be a positive integer' });
    }
    const msPerPeriod = Number.parseInt(msPerPeriodQuery ?? '1', 10);
    if (Number.isNaN(msPerPeriod) || msPerPeriod < 1) {
      throw new ApiError('VALIDATION_FAILED', { message: 'ms_per_period must be a positive integer' });
    }
    let tickedCount = 0;
    let gameMinute = 0;
    for (let i = 0; i < periods; i += 1) {
      this.pinnedClock.advanceByMs(msPerPeriod);
      // Sequential by design (never Promise.all): each period must observe the PREVIOUS period's
      // `last_real_tick_at` write before the next clock-advance, exactly like real periods run one
      // after another in production.
      const result = await this.scheduler.tickIfDue(playerId);
      if (result.ticked) tickedCount += 1;
      gameMinute = result.game_minute;
    }
    return { playerId, periodsRun: periods, tickedCount, game_minute: gameMinute };
  }

  /**
   * `POST /v1/_test/citysim/run-continuous-tour?hold_ms=N` — TEST-ONLY (W1.1-d C3): run ONE continuous-
   * loop tour immediately, bypassing the `setInterval` timer (the `run-phase-tick`/`run-nightly-tick`/
   * `run-weekly-roll` precedent, `maintenance-test.controller.ts`'s own header). Drives the REAL
   * `runContinuousTourForTest` — the SAME lock → advance-epoch → tick-every-session-fresh-player body
   * `runMinuteLoop` runs, never a parallel re-implementation.
   *
   * ⚠️ Unlike `tick-if-due` above, this DOES touch the real bulk fresh-session population — whichever
   * OTHER players happen to have an open, fresh (`session.stale_timeout_real_minutes`-bounded) session at
   * call time also get ticked by ONE game-minute as a side effect. This is the price of proving the
   * inter-instance advisory lock (design §C3's own acceptance criterion) at all: there is no way to
   * observe "a concurrent tour was skipped" without actually running a tour. `hold_ms` (optional, default
   * 0) holds the advisory lock for `hold_ms` after the tour's own work completes — the falsifiable unit
   * for firing N concurrent calls (`Promise.all`) and asserting exactly ONE reports `lockAcquired: true`.
   */
  @Post('_test/citysim/run-continuous-tour')
  @HttpCode(200)
  async runContinuousTour(
    @Query('hold_ms') holdMsQuery?: string,
    @Body() body?: { hold_ms?: number },
  ): Promise<{ lockAcquired: boolean; epochGameMinute: number; tickedPlayerIds: string[] }> {
    const raw = holdMsQuery ?? (body?.hold_ms !== undefined ? String(body.hold_ms) : undefined);
    const holdMs = raw !== undefined ? Number.parseInt(raw, 10) : 0;
    if (Number.isNaN(holdMs) || holdMs < 0) {
      throw new ApiError('VALIDATION_FAILED', { message: 'hold_ms must be a non-negative integer' });
    }
    return this.scheduler.runContinuousTourForTest(holdMs);
  }
}
