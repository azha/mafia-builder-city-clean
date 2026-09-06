// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-A-rival-foundation-plan.md Task 3 (C3)
//             docs/superpowers/plans/2026-06-24-04b-A-rival-foundation-plan.md Task 5 (C5)
//             docs/superpowers/plans/2026-06-24-04b-A-rival-foundation-plan.md Task 6 (C6)
//             docs/superpowers/plans/2026-06-24-04b-A-rival-foundation-plan.md Task 7 (C7)
//             Design: docs/superpowers/specs/2026-06-24-04b-A-rival-foundation-design.md §4.2 (DD-MODULE)
//             Canon: docs/tech/04b_combat_and_conflict/rival_ai_mechanics.md §3.1 (regime) §3.7 (recon)
//             Canon: docs/tech/04b_combat_and_conflict/tick_schedule_and_memory_budget_conflict.md :18
//             Pattern: services/game-back/src/operational/lieutenant/lieutenant-tick.service.ts:143-178
//             — Rival AI Foundation C3 + C5 + C7 — 2026-06-24 —
//
// `RivalTickService` — DD-MODULE: registers RIVAL_REGIME_TICK + RIVAL_DAILY_TICK + RIVAL_SATURATION_TICK
//   + RIVAL_DECISION_TICK onto the shared scheduler.
//
// **LOURD** (the first shared-scheduler touch): any regression in tick ordering breaks cross-chapter
// city-sim specs. The System-9 lesson applies: the L1 empty-state skip makes a pre-A world byte-identical.
//
// SCHEDULE slots (city_sim_system.ts / city_sim_scheduler.service.ts):
//   RIVAL_REGIME_TICK     — Cadence.TWELVE_H / order 6   (next-free after MONEY_HOLDING_AUDIT/5)
//   RIVAL_DAILY_TICK      — Cadence.NIGHTLY   / order 13  (next-free after ROUTE_SEVER_SWEEP/12)
//   RIVAL_SATURATION_TICK — Cadence.HOURLY    / order 2   (next-free after MARKET_LANE_CLEARING/1)
//                           DD-CADENCE 6h-analog: fires every HOURLY; guards on gameMinute % 360 === 0.
//   RIVAL_DECISION_TICK   — Cadence.MINUTE    / order 22  (next-free after INSURANCE_COURIER_INTERCEPTION/21)
//                           C5 cadence fix (moved from HOURLY/3 — see below).
//
// C5 CADENCE FIX (RIVAL_DECISION_TICK: HOURLY/3 → MINUTE/22):
//   C4 registered RIVAL_DECISION_TICK on HOURLY/3 with `gameMinute % N !== 0` guard (N=4 by default).
//   PROBLEM: HOURLY fires at 60-minute multiples. Since 60 % 4 == 0 ALWAYS, the guard was INERT —
//   the reroute fired EVERY game-hour, not every 4 game-minutes as canon intends.
//   Canon (tick_schedule_and_memory_budget_conflict.md :18): "Every 4 ticks — Distributed Hold
//   reroute_evaluation". The tick unit is the in-game MINUTE. On MINUTE cadence with `gameMinute % 4 === 0`
//   the system fires at minutes 0, 4, 8, 12, ... — the correct every-4-game-minutes cadence.
//   C5 moves RIVAL_DECISION_TICK to MINUTE/22 (the next free MINUTE slot after INSURANCE_COURIER_INTERCEPTION/21).
//
// L1 empty-state skip (mechanism unchanged; the PROMISE it once made is now conditional —
// W6.1 C6, design §6 anti-péremption row 10):
//   Each tick reads the player's rival_state rows. If NONE exist, the tick returns immediately with
//   ZERO writes — that remains true for any player with no rival_state rows.
//   As of W6.1 C1, that population has SHRUNK: `OnboardingGrantService.grantWelcomeAssets` seeds 4
//   rival_state rows (+ trophic pairs) for every player who completes signup, on the grant's own
//   transaction. The skip's protection is therefore now scoped to players who were never granted
//   (e.g. an E2E spec that calls neither signup nor `/v1/_test/rival/ensure`) — it is no longer a
//   blanket property of every existing spec. The measured (not assumed) population this skip still
//   covers, and the population it no longer does, is in the design's §9-bis / §0.14.
//   Pattern mirrors lieutenant-tick.service.ts:163 `if (lts.length === 0) return;`.
//
// Per-rival try/catch (the per-lieutenant isolation pattern):
//   A fault on ONE rival is logged and contained — it never breaks the tick or another rival.
//   Pattern mirrors lieutenant-tick.service.ts:166-177.
//
// C6 / C7 hooks (call sites wired here; bodies land in their chunks):
//   runRegimeTick → after flip: calls the C6 trophic-rebalance hook (no-op at C3; body in C6).
//   runDailyTick  → calls the C7 adaptive-skin unused-pattern decay hook (no-op at C3; body in C7).
//
// C4 (determinism): NO Math.random, NO Date.now. game-time via ctx.gameMinute.
// R2.2 / P6: no raw scalar exposed cross-system; RegimeTransitionEvent carries NO regime label.

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CitySimSchedulerService } from '../../../citysim/scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId } from '../../../citysim/scheduler/city_sim_system';
import type { CitySimTickContext } from '../../../citysim/scheduler/city_sim_system';
import { RegimeSwitchingService } from './regime-switching.service';
import { ReconnaissanceRegimeClassifierService } from './reconnaissance-regime-classifier.service';
import { SaturationBlindnessService } from './saturation-blindness.service';
import { TempoExposureService } from './tempo-exposure.service';
import { DistributedHoldService } from './distributed-hold.service';
import { TrophicGapService } from './trophic-gap.service';
import { AdaptiveSkinService } from './adaptive-skin.service';
import { RivalAiTunables } from './rival-ai.tunables';
import { RivalStateRepository } from './rival-state.repository';
import type { RivalKey } from './rival-ai.types';

/** The 4 canonical rival keys (seeded by RivalSeedService at C1). */
const ALL_RIVAL_KEYS: readonly RivalKey[] = ['coil', 'tarcum', 'iron_throat', 'saltline'] as const;

@Injectable()
export class RivalTickService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RivalTickService.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly rivalStateRepo: RivalStateRepository,
    private readonly regimeSvc: RegimeSwitchingService,
    private readonly reconSvc: ReconnaissanceRegimeClassifierService,
    private readonly saturationSvc: SaturationBlindnessService,
    private readonly tempoSvc: TempoExposureService,
    private readonly distributedHoldSvc: DistributedHoldService,
    private readonly trophicSvc: TrophicGapService,
    private readonly adaptiveSkinSvc: AdaptiveSkinService,
    private readonly tunables: RivalAiTunables,
  ) {}

  /** Register both slow-tick systems on the shared scheduler at application boot. */
  onApplicationBootstrap(): void {
    this.registerCadences();
  }

  // ─── Registration ─────────────────────────────────────────────────────────────

  /** Register all 4 rival tick systems on the shared scheduler. */
  private registerCadences(): void {
    // RIVAL_REGIME_TICK — Cadence.TWELVE_H / order 6 (next free after MONEY_HOLDING_AUDIT/5).
    // Runs regime recompute + flip + intel-mode flip every 12 game-hours.
    this.scheduler.registerSystem({
      id:      CitySystemId.RIVAL_REGIME_TICK,
      cadence: Cadence.TWELVE_H,
      order:   6,
      run:     (ctx) => this.runRegimeTick(ctx),
    });

    // RIVAL_DAILY_TICK — Cadence.NIGHTLY / order 13 (next free after ROUTE_SEVER_SWEEP/12).
    // Runs the peaceful-pressure decay + C7 adaptive-skin hook every in-game night.
    this.scheduler.registerSystem({
      id:      CitySystemId.RIVAL_DAILY_TICK,
      cadence: Cadence.NIGHTLY,
      order:   13,
      run:     (ctx) => this.runDailyTick(ctx),
    });

    // RIVAL_SATURATION_TICK — Cadence.HOURLY / order 2 (next free after MARKET_LANE_CLEARING/1).
    // DD-CADENCE 6h-analog: fires every hour but the run callback guards on gameMinute % 360 === 0.
    // Applies saturationPassiveDecayRatePerTick per rival (only at the 6h boundary).
    this.scheduler.registerSystem({
      id:      CitySystemId.RIVAL_SATURATION_TICK,
      cadence: Cadence.HOURLY,
      order:   2,
      run:     (ctx) => this.runSaturationTick(ctx),
    });

    // RIVAL_DECISION_TICK — Cadence.MINUTE / order 22 (next free after INSURANCE_COURIER_INTERCEPTION/21).
    // C5 cadence fix: moved from HOURLY/3 → MINUTE/22 so the `% 4` guard is a REAL filter.
    //   HOURLY fires at 60-min multiples; 60 % 4 == 0 always → guard was INERT at C4.
    //   MINUTE fires every game-minute; gameMinute % 4 === 0 fires at 0, 4, 8, 12, ...
    //   Canon (tick_schedule…:18): "Every 4 ticks — Distributed Hold reroute_evaluation"
    //   where 4 ticks = 4 in-game minutes.
    // Per-rival tempo decision + C5 Distributed-Hold reroute body (wired in runDecisionTickForRival).
    this.scheduler.registerSystem({
      id:      CitySystemId.RIVAL_DECISION_TICK,
      cadence: Cadence.MINUTE,
      order:   22,
      run:     (ctx) => this.runDecisionTick(ctx),
    });
  }

  // ─── RIVAL_REGIME_TICK (TWELVE_H / order 6) ──────────────────────────────────

  /**
   * {TWELVE_H, order 6} — the 12-game-hour regime sweep.
   *
   * For each rival the player has a row for:
   *   1. recomputeRegimePressure: apply the peaceful-decay term (- decayPerDay/2).
   *   2. flipRegime: threshold compare + seeded tie-break + RegimeTransitionEvent emit (if crossed).
   *   3. runIntelModeFlip: increment mode_stability_ticks (C-accumulator, pre-C is a no-op flip).
   *   4. [C6 hook placeholder] trophic rebalance — body lands in C6 (no-op at C3).
   *
   * SHELL CONVERGENCE (C6 shell-dedup): the live path DELEGATES to `runRegimeTickForPlayer`
   * (the public test-route entry point). Both the scheduler and the test route call the SAME
   * per-player code path — a single source of truth. This permanently eliminates the live-vs-test
   * divergence that caused the C6 bug (trophic rebalance missing from test path).
   *
   * L1 empty-state skip: if no rival_state rows exist for this player, returns immediately (ZERO writes —
   * the byte-identical no-regression guarantee for a pre-A world / a player with no rivals seeded).
   * Per-rival try/catch: one bad rival is logged and contained; the sweep continues for the others.
   *
   * gameMinute: ctx.gameMinute — the in-game clock (GAME-TIME, NOT Date.now / wall-clock).
   */
  private async runRegimeTick(ctx: CitySimTickContext): Promise<void> {
    // DELEGATE to the shared per-player path (the test route calls the same method).
    // The transition count return value is discarded by the scheduler — only the test route uses it.
    await this.runRegimeTickForPlayer(ctx.playerId, ctx.gameMinute);
  }

  /** Run the TWELVE_H regime sweep for a single rival. */
  private async runRegimeTickForRival(
    playerId: string,
    rivalKey: RivalKey,
    gameMinute: number,
  ): Promise<void> {
    const row = await this.rivalStateRepo.readRivalState(playerId, rivalKey);
    if (!row) return; // this rival has no row for this player — skip

    // (1) Recompute pressure: apply peaceful-decay.
    await this.regimeSvc.recomputeRegimePressure(playerId, rivalKey, gameMinute);

    // (2) Flip regime if threshold crossed + emit RegimeTransitionEvent.
    await this.regimeSvc.flipRegime(playerId, rivalKey, gameMinute);

    // (3) Intel-mode flip sweep (§3.7 on the same 12h cadence — stability ticks accumulate).
    await this.reconSvc.runIntelModeFlip(playerId, rivalKey);

    // [C6 hook call site: trophic rebalance — body wired in runRegimeTick (player-scoped, after loop)]
    // The per-rival stub is intentionally empty: rebalancePressurePairs is player-scoped
    // (reads all pairs in one pass) so it runs at the outer-loop level, not per-rival.
  }

  // ─── RIVAL_DAILY_TICK (NIGHTLY / order 13) ────────────────────────────────────

  /**
   * {NIGHTLY, order 13} — the daily decay tick.
   *
   * For each rival the player has a row for:
   *   1. [C7 hook — adaptive-skin unused-pattern decay body lands in C7]:
   *      await this.adaptiveSkinSvc.decayUnused(playerId, rivalKey, gameMinute);
   *
   * Note: at C3, the peaceful-pressure decay is applied in the TWELVE_H tick (recomputeRegimePressure).
   * The NIGHTLY tick is the C7 Adaptive Skin daily hook. At C7: body wired in runDailyTickForRival.
   *
   * SHELL CONVERGENCE (C6 shell-dedup): the live path DELEGATES to `runDailyTickForPlayer`
   * (the public test-route entry point). Both the scheduler and the test route call the SAME
   * per-player code path — permanently eliminating any live-vs-test divergence (the C6 lesson
   * pre-empted for the daily tick before it could manifest).
   *
   * L1 empty-state skip: if no rival_state rows, return immediately (ZERO writes — no-regression).
   * Per-rival try/catch: one bad rival is logged and contained.
   *
   * gameMinute: ctx.gameMinute — game-time (NOT Date.now).
   */
  private async runDailyTick(ctx: CitySimTickContext): Promise<void> {
    // DELEGATE to the shared per-player path (the test route calls the same method).
    // The sweepCompleted return value is discarded by the scheduler.
    await this.runDailyTickForPlayer(ctx.playerId, ctx.gameMinute);
  }

  /** Run the NIGHTLY daily tick for a single rival. */
  private async runDailyTickForRival(
    playerId: string,
    rivalKey: RivalKey,
    gameMinute: number,
  ): Promise<void> {
    const row = await this.rivalStateRepo.readRivalState(playerId, rivalKey);
    if (!row) return;

    // [C7 — Adaptive Skin unused-pattern daily decay body]:
    // For each rival_attack_pattern_resistance row where last_used_tick < gameMinute (idle pattern):
    //   resistance = max(0, resistance − 0.01/tick)
    //   last_used_tick = gameMinute  ← idempotence gate
    // Canon :321 (`rival_ai.adaptive_skin_resistance_decay_when_unused_per_tick` = 0.01/tick).
    // SHARED PATH (the C6 lesson pre-empted): both the live `runDailyTick` loop AND the test route
    //   `runDailyTickForPlayer` call this method → zero divergence from production path.
    // FALSIFIABLE: if this call were removed, the E2E spec's decay assertion would FAIL.
    await this.adaptiveSkinSvc.decayUnused(playerId, rivalKey, gameMinute);
  }

  // ─── RIVAL_SATURATION_TICK (HOURLY / order 2) — DD-CADENCE 6h-analog ────────

  /**
   * {HOURLY, order 2} — DD-CADENCE 6h-analog saturation decay tick.
   *
   * Fires every in-game hour (HOURLY band). The DD-CADENCE 6h-analog guard restricts
   * the actual work to every 6 game-hours:
   *   if (gameMinute % 360 !== 0) → NO-OP immediately.
   *
   * At the 6h boundary (gameMinute % 360 === 0):
   *   For each rival the player has: applies passiveSaturationDecay per rival.
   *
   * L1 empty-state skip: no rival rows → ZERO writes (byte-identical no-regression guarantee).
   * Per-rival try/catch: one bad rival is logged and contained; the sweep continues.
   *
   * gameMinute: ctx.gameMinute — in-game clock (GAME-TIME, NOT Date.now / wall-clock).
   * NO Math.random. NO Date.now.
   */
  private async runSaturationTick(ctx: CitySimTickContext): Promise<void> {
    const playerId   = ctx.playerId;
    const gameMinute = ctx.gameMinute; // game-time — NEVER Date.now

    // DD-CADENCE DIV-A1 LOCK: cadence is LOCKED to % 360 (6 game-hours = 360 game-minutes).
    // The tunable `saturationRecomputeIntervalGameHours` (range 3..12) is intentionally NOT wired
    // here — the 6h cadence was frozen by design decision DD-CADENCE (DIV-A1) in §6.1 to keep the
    // scheduler guard simple and cross-chapter-stable. The getter's range is documented but the
    // hardcoded % 360 is NOT a forgotten fig-leaf. If calibration requires re-tuning the cadence,
    // update this constant + the tunable default in the same commit (R9.3).
    if (gameMinute % 360 !== 0) {
      return; // off-boundary — NO-OP (the HOURLY band fires every 60 min; we guard to 6h)
    }

    // L1 empty-state skip: no rivals seeded → ZERO writes (byte-identical no-regression guarantee).
    const existingRow = await this.rivalStateRepo.readRivalState(playerId, 'coil');
    if (!existingRow) {
      return; // no rivals for this player — no-op
    }

    for (const rivalKey of ALL_RIVAL_KEYS) {
      try {
        await this.saturationSvc.decayPassive(playerId, rivalKey);
      } catch (err) {
        // ISOLATION: a fault on ONE rival is logged and contained.
        this.logger.error(
          `RIVAL_SATURATION_TICK: rival=${rivalKey} (player=${playerId}, gm=${gameMinute}) failed — ` +
          `contained, the tick continues: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  /**
   * `runSaturationTickForPlayer` — public API for the _test run-saturation-tick route.
   *
   * POST /v1/_test/rival/run-saturation-tick?playerId=&gameMinute= → calls this.
   * Runs the full saturation sweep for the given player at the given game-minute.
   * Respects the 6h modulo guard (gameMinute % 360 === 0).
   * Returns { decayApplied: boolean } (true if the guard fired, false if off-boundary no-op).
   */
  async runSaturationTickForPlayer(
    playerId: string,
    gameMinute: number,
  ): Promise<{ decayApplied: boolean }> {
    // DD-CADENCE DIV-A1 LOCK: same lock as the live runSaturationTick above — % 360 is intentional.
    // See the DD-CADENCE comment in runSaturationTick for rationale.
    if (gameMinute % 360 !== 0) {
      return { decayApplied: false }; // off-boundary — the modulo guard short-circuits
    }

    // L1 skip.
    const existingRow = await this.rivalStateRepo.readRivalState(playerId, 'coil');
    if (!existingRow) return { decayApplied: false };

    for (const rivalKey of ALL_RIVAL_KEYS) {
      try {
        await this.saturationSvc.decayPassive(playerId, rivalKey);
      } catch (err) {
        this.logger.error(
          `run-saturation-tick (test): rival=${rivalKey} player=${playerId} failed: ` +
          `${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    return { decayApplied: true };
  }

  // ─── RIVAL_DECISION_TICK (MINUTE / order 22) — every-4-game-minutes ─────────────────────────

  /**
   * {MINUTE, order 22} — per-rival tempo decision + Distributed Hold reroute tick.
   *
   * C5 cadence fix: moved from HOURLY/3 to MINUTE/22.
   *   Canon (tick_schedule_and_memory_budget_conflict.md :18): "Every 4 ticks — Distributed Hold
   *   reroute_evaluation". The 4-tick unit = 4 in-game minutes. On MINUTE cadence, the guard
   *   `gameMinute % 4 === 0` fires at 0, 4, 8, 12, ... — a real every-4-game-minutes filter.
   *
   * Fires every in-game MINUTE. Guard: `gameMinute % rerouteWindowTicks !== 0` → NO-OP.
   *   rerouteWindowTicks = distributedHoldRerouteWindowTicks (default 4, range 2..8 — getter-sourced).
   *
   * At the 4-game-minute boundary:
   *   For each rival: checks shouldFireObserveTick (the per-rival observe modulo — §3.2).
   *   For Coil only: calls DistributedHoldService.rerouteEvaluation (C5 body — §3.4).
   *
   * L1 empty-state skip: no rival rows → ZERO writes.
   * Per-rival try/catch: one bad rival is logged and contained; the sweep continues.
   *
   * gameMinute: ctx.gameMinute — in-game clock (GAME-TIME, NOT Date.now).
   * NO Math.random. NO Date.now.
   */
  private async runDecisionTick(ctx: CitySimTickContext): Promise<void> {
    const playerId   = ctx.playerId;
    const gameMinute = ctx.gameMinute; // game-time — NEVER Date.now

    // Canon (tick_schedule…:18): "Every 4 ticks" — the reroute window is getter-sourced (C2).
    // On MINUTE cadence, `gameMinute % N !== 0` is a real filter (N=4 default → fires at min 0,4,8,…).
    const rerouteWindowTicks = this.tunables.distributedHoldRerouteWindowTicks; // default 4
    if (rerouteWindowTicks > 0 && gameMinute % rerouteWindowTicks !== 0) {
      return; // off-boundary — NO-OP (the every-4-game-minutes gate)
    }

    // L1 empty-state skip: no rivals seeded → ZERO writes (byte-identical no-regression guarantee).
    const existingRow = await this.rivalStateRepo.readRivalState(playerId, 'coil');
    if (!existingRow) {
      return; // no rivals for this player — no-op
    }

    for (const rivalKey of ALL_RIVAL_KEYS) {
      try {
        await this.runDecisionTickForRival(playerId, rivalKey, gameMinute);
      } catch (err) {
        this.logger.error(
          `RIVAL_DECISION_TICK: rival=${rivalKey} (player=${playerId}, gm=${gameMinute}) failed — ` +
          `contained, the tick continues: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  /** Run the MINUTE/22 decision tick for a single rival (every 4 game-minutes). */
  private async runDecisionTickForRival(
    playerId: string,
    rivalKey: RivalKey,
    gameMinute: number,
  ): Promise<void> {
    const row = await this.rivalStateRepo.readRivalState(playerId, rivalKey);
    if (!row) return; // this rival has no row for this player — skip

    // Per-rival observe-window check (tempo decision, §3.2).
    // The observe-interval modulo determines if this rival fires an observe action this tick.
    await this.tempoSvc.shouldFireObserveTick(playerId, rivalKey, gameMinute);
    // (The return value is consumed by B/C to trigger the observe action. At C5: logged only.)

    // C5 — Distributed-Hold reroute body (§3.4, DD-ROUTEGRAPH-REUSE):
    // Only Coil has the Distributed Hold mechanic (canon :399). rerouteEvaluation is a no-op
    // for non-Coil rivals (guarded inside DistributedHoldService.rerouteEvaluation).
    await this.distributedHoldSvc.rerouteEvaluation(playerId, rivalKey);
  }

  // ─── Public entry point for the _test run-reroute route (C5) ────────────────

  /**
   * `runRerouteForPlayer` — public API for the test controller.
   *
   * POST /v1/_test/rival/run-reroute?playerId=&rivalKey=&gameMinute= → calls this.
   * Runs rerouteEvaluation for the given rival (Coil only does real work; others are no-ops).
   * Respects the 4-game-minute modulo guard.
   * Returns { evaluated: boolean } — true if the guard fired, false if off-boundary no-op.
   *
   * DETERMINISM: no Math.random, no Date.now. The gameMinute parameter is the in-game clock.
   */
  async runRerouteForPlayer(
    playerId: string,
    rivalKey: RivalKey,
    gameMinute: number,
  ): Promise<{ evaluated: boolean }> {
    // The 4-game-minute modulo guard (canon tick_schedule…:18 "Every 4 ticks").
    const rerouteWindowTicks = this.tunables.distributedHoldRerouteWindowTicks;
    if (rerouteWindowTicks > 0 && gameMinute % rerouteWindowTicks !== 0) {
      return { evaluated: false }; // off-boundary — no-op
    }

    // L1 skip.
    const existingRow = await this.rivalStateRepo.readRivalState(playerId, 'coil');
    if (!existingRow) return { evaluated: false };

    await this.distributedHoldSvc.rerouteEvaluation(playerId, rivalKey);
    return { evaluated: true };
  }

  // ─── Public entry point for the _test run-regime-tick route ──────────────────

  /**
   * `runRegimeTickForPlayer` — public API for the test controller.
   *
   * POST /v1/_test/rival/run-regime-tick?playerId=&gameMinute= → calls this.
   * Runs the full TWELVE_H regime sweep for the given player at the given game-minute,
   * IDENTICAL to the live `runRegimeTick` path: per-rival recompute/flip/intel-mode sweep
   * followed by the player-scoped trophic rebalance (`rebalancePressurePairs`).
   *
   * CONVERGENCE (C6 fix): The live `runRegimeTick(ctx)` is the canonical implementation.
   * This public method mirrors it exactly so the test route exercises production logic.
   * Before C6 the trophic rebalance was missing from this path — the test was driving
   * a no-op (the C6 fig-leaf trap). Now both paths are converged.
   *
   * Returns the count of regime transitions emitted (the test spec asserts >= 1 when a flip occurs).
   */
  async runRegimeTickForPlayer(
    playerId: string,
    gameMinute: number,
  ): Promise<{ regimeTransitionsEmitted: number }> {
    // Track transitions by comparing state before/after the tick.
    const beforeStates: Record<string, string> = {};
    for (const rk of ALL_RIVAL_KEYS) {
      const row = await this.rivalStateRepo.readRivalState(playerId, rk);
      if (row) beforeStates[rk] = row.regime;
    }

    // L1 empty-state skip (mirrors runRegimeTick).
    const existingRow = await this.rivalStateRepo.readRivalState(playerId, 'coil');
    if (existingRow) {
      // (1) Per-rival regime sweep: recompute → flip → intel-mode flip.
      for (const rivalKey of ALL_RIVAL_KEYS) {
        try {
          await this.runRegimeTickForRival(playerId, rivalKey, gameMinute);
        } catch (err) {
          this.logger.error(
            `run-regime-tick (test): rival=${rivalKey} player=${playerId} failed: ` +
            `${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }

      // (2) [C6] Trophic rebalance — player-scoped, identical to the live path.
      // THIS CALL was missing from the original test route: the live `runRegimeTick`
      // called `rebalancePressurePairs` but `runRegimeTickForPlayer` did NOT, causing the
      // cascade body to have zero test coverage. Both paths are now converged.
      try {
        await this.trophicSvc.rebalancePressurePairs(playerId);
      } catch (err) {
        this.logger.error(
          `run-regime-tick (test): trophic rebalance player=${playerId} failed: ` +
          `${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // Count transitions by comparing before/after states.
    let transitionCount = 0;
    for (const rk of ALL_RIVAL_KEYS) {
      const row = await this.rivalStateRepo.readRivalState(playerId, rk);
      if (row && beforeStates[rk] !== undefined && beforeStates[rk] !== row.regime) {
        transitionCount++;
      }
    }

    return { regimeTransitionsEmitted: transitionCount };
  }

  // ─── Public entry point for the _test run-daily-tick route ───────────────────

  /**
   * `runDailyTickForPlayer` — public API for the test controller (C7 pre-empt fix).
   *
   * POST /v1/_test/rival/run-daily-tick?playerId=&gameMinute= → calls this (wired in C7).
   * Runs the full NIGHTLY daily sweep for the given player at the given game-minute,
   * IDENTICAL to the live `runDailyTick` path.
   *
   * CONVERGENCE (pre-empting the C7 repeat of the C6 fig-leaf trap):
   * The live `runDailyTick` loops ALL_RIVAL_KEYS calling `runDailyTickForRival`. This method
   * does the SAME so when C7 wires the `adaptiveSkinSvc.decayUnused` body into
   * `runDailyTickForRival`, the test route automatically exercises it — the test can never
   * again diverge from the production path.
   *
   * At C6: `runDailyTickForRival` is still a no-op stub (C7 body not yet wired), so this
   * method performs a no-op sweep that confirms the structural convergence before C7 lands.
   *
   * Returns { sweepCompleted: boolean } — true if rivals exist (L1 skip did NOT fire);
   * false if the player has no rivals seeded (no-op short-circuit).
   */
  async runDailyTickForPlayer(
    playerId: string,
    gameMinute: number,
  ): Promise<{ sweepCompleted: boolean }> {
    // L1 empty-state skip (mirrors runDailyTick).
    const existingRow = await this.rivalStateRepo.readRivalState(playerId, 'coil');
    if (!existingRow) {
      return { sweepCompleted: false }; // no rivals for this player — no-op
    }

    // Per-rival daily sweep — identical to the live runDailyTick loop.
    // At C7: the decay body (adaptiveSkinSvc.decayUnused) is wired in runDailyTickForRival.
    //   This test route automatically exercises it — the C6 fig-leaf trap pre-empted.
    for (const rivalKey of ALL_RIVAL_KEYS) {
      try {
        await this.runDailyTickForRival(playerId, rivalKey, gameMinute);
      } catch (err) {
        this.logger.error(
          `run-daily-tick (test): rival=${rivalKey} player=${playerId} failed: ` +
          `${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return { sweepCompleted: true };
  }
}
