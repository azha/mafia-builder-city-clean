// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-A-rival-foundation-plan.md Task 1 (C1) Step 4
//             docs/superpowers/plans/2026-06-24-04b-A-rival-foundation-plan.md Task 2 (C2) Step 3
//             docs/superpowers/plans/2026-06-24-04b-A-rival-foundation-plan.md Task 3 (C3) Steps 1-4
//             docs/superpowers/plans/2026-06-24-04b-A-rival-foundation-plan.md Task 5 (C5) Step 3
//             docs/superpowers/plans/2026-06-24-04b-A-rival-foundation-plan.md Task 7 (C7) Step 3
//             docs/superpowers/plans/2026-06-24-04b-A-rival-foundation-plan.md Task 8 (C8) Steps 1-4
//             fix(04b-A): C3 — root-cause pressure-test isolation (PID-scoped reset-to-baseline route)
//             Pattern: services/game-back/src/operational/insurance/insurance-test.controller.ts
//             — Rival AI Foundation C1 + C2 + C3 + C5 + C7 + C8 — 2026-06-24 —
//
// `RivalTestController` — TEST-ONLY probe routes for C1 + C2 + C3 + C4 + C5 + C6 E2E verification.
//
// GATING: mounted ONLY when NODE_ENV !== 'production' (registered conditionally in RivalAiModule
// via testControllersEnabled() — same pattern as InsuranceTestController / ReputationTestController).
// In production this controller is simply not registered → 404.
// The E2E compose stack runs NODE_ENV=development so routes are available.
//
// C1 Routes:
//   POST /v1/_test/rival/ensure?playerId=<uuid>
//     — ensures the player + account rows exist (idempotent), then calls
//       rivalStateRepo.ensurePlayerRivals(playerId); returns { ensured: true }.
//       Body: {} (ignored — the playerId comes from the query param).
//       Idempotent: safe to call 2× back-to-back (DO NOTHING on conflict).
//
//   GET /v1/_test/rival/read-state?playerId=<uuid>&rivalKey=<key>
//     — calls rivalStateRepo.readRivalState(playerId, rivalKey as RivalKey).
//       Returns { rival: <RivalStateRow> }.
//       If rivalKey is not a valid RivalKey, returns 400 (enum-domain guard — FALSIFIABLE).
//       If no row exists for the player × rival, returns { rival: null }.
//
// C2 Routes:
//   GET /v1/_test/rival/read-tunables
//     — returns all RivalAiTunables getter values keyed by camelCase getter name.
//       Used by the C2 spec to assert frozen defaults against the real stack.
//       Anti-fabrication: reads REAL getter output sourced via TunablesStore.
//
//   POST /v1/_test/rival/probe-clamp
//     — body: { key: string, value: number }
//       Applies clampToRange(key, value) and returns { clamped: number }.
//       FALSIFIABLE: value=999 with range 0..3 returns clamped=3.0 (not 999).
//
// C3 Routes:
//   POST /v1/_test/rival/record-pressure
//     — body: { playerId, rivalKey, source: 'territory'|'casualty'|'revenue', magnitudeBucket: 'silent'|'mounting'|'crushing' }
//       Calls RegimeSwitchingService.recordPressure. Returns { recorded: true }.
//
//   POST /v1/_test/rival/run-regime-tick?playerId=&gameMinute=
//     — runs the full TWELVE_H regime sweep for the player at the given gameMinute.
//       Returns { regimeTransitionsEmitted: number } (the test spec asserts >= 1 on a flip).
//
//   GET /v1/_test/rival/decision-policy?playerId=&rivalKey=
//     — returns { decisionPolicy: string } (the §13 server-side policy ref).
//       SERVER-ONLY (not a player-facing route — P6).
//
//   POST /v1/_test/rival/set-intel-mode
//     — body: { playerId, rivalKey, intelMode: 'pull'|'push' }
//       Calls ReconnaissanceRegimeClassifierService.setIntelMode. Returns { set: true }.
//
//   GET /v1/_test/rival/intel-mode?playerId=&rivalKey=
//     — returns { intelMode: 'pull'|'push' } (SERVER-ONLY — P6; no player route returns intel_mode).
//
//   POST /v1/_test/rival/apply-disinfo
//     — body: { playerId, rivalKey, disinfoBucket: 'low'|'medium'|'high' }
//       Calls ReconnaissanceRegimeClassifierService.applyDisinformation.
//       Returns { landed: boolean, intelMode: string }.
//       FALSIFIABLE: Coil (PULL) → landed=true; Tarcum (PUSH) → landed=false.
//
// Isolation (fix C3 flake — sticky regime_pressure accumulator):
//   POST /v1/_test/rival/reset-baseline?playerId=<uuid>&rivalKey=<key>
//     — DELETEs the single rival_state row for (playerId, rivalKey) and re-inserts it at the
//       canon static baseline (regime_pressure=0, regime=initial, saturation_pressure=0,
//       intel_mode=canon-default). PID-scoped: touches only the one row, safe for concurrent specs.
//       Returns { reset: true }.
//       Pattern: test-isolation baseline-reset primitive used by all pressure-outcome tests
//       (C3 regime_switching + C4-C8 future saturation/suppression/trophic specs).
//
// C5 Routes:
//   POST /v1/_test/rival/seed-holdings
//     — body: { playerId, rivalKey: 'coil' }
//       Seeds Coil rival_holding rows across non-adjacent districts (idempotent DO NOTHING).
//       Returns { seeded: number } — count of rows inserted.
//
//   POST /v1/_test/rival/run-reroute?playerId=&rivalKey=&gameMinute=
//     — Calls DistributedHoldService.rerouteEvaluation. Respects 4-game-minute modulo guard.
//       Returns { evaluated: boolean }.
//
//   GET /v1/_test/rival/route-integrity?playerId=&rivalKey=
//     — Calls DistributedHoldService.getRouteIntegrity.
//       Returns { routeIntegrity: 'fractured'|'sparse'|'intact'|'dense'|null }.
//       null for non-Coil rivals (Coil-only canon :399).
//
// C7 Routes:
//   POST /v1/_test/rival/record-attack
//     — body: { playerId, rivalKey, patternHash, gameMinute }
//       The B/C §13 write-hook: calls AdaptiveSkinService.recordAttack.
//       UPSERT rival_attack_pattern_resistance: resistance += per-rival adaptation_rate.
//       Returns { recorded: true }.
//
//   GET /v1/_test/rival/pattern-resistance?playerId=<uuid>&rivalKey=<key>&patternHash=<hash>
//     — calls AdaptiveSkinService.getPatternResistance.
//       Returns { bucket: 'none'|'low'|'medium'|'high' } — P6: NO raw resistance float.
//
//   POST /v1/_test/rival/reset-pattern-resistance?playerId=<uuid>&rivalKey=<key>
//     — Test-isolation primitive. DELETEs all rival_attack_pattern_resistance rows for (player, rival).
//       Call in beforeAll / beforeEach to clear residual resistance from prior runs.
//       Returns { reset: true }.
//
// C8 Routes:
//   GET /v1/_test/rival/client-view?playerId=&rivalKey=
//     — returns RivalProjectionService.toClientView(playerId, rivalKey).
//       P6 wall test surface: the returned object has ONLY the 5 closed bands (no hidden field).
//
//   POST /v1/_test/rival/set-regime
//     — body: { playerId, rivalKey, regime: RivalRegime, regimePressure: number }
//       Directly sets the rival's regime + regime_pressure (the P5 falsifiable test path).
//       Validates: rivalKey ∈ VALID_RIVAL_KEYS, regime ∈ VALID_REGIMES,
//                  regimePressure ∈ [0, 100] (clamp domain).
//       Returns { set: true }.
//       C4: deterministic. No Math.random. No Date.now.
//       Testability: allows the C8 spec to force two rivals into different hidden regimes
//       (coil=expansionary/pressure20, tarcum=consolidating/pressure20) to prove the
//       player-facing regimePressureBand is the same (the P5 wall is operative, not aspirational).
//
// Anti-fabrication (C1/C2/C3/C5/C7/C8): no Math.random(). No non-deterministic values.
// R2.2 / P6: SERVER-ONLY routes. Not player-facing. Gated by testControllersEnabled().
//   The _test routes are the E2E assertion surface — not a player-facing API.

import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Post,
  Query,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import type { DrizzleClient } from '../../../db';
import { DB } from '../../../db/db.module';
import { account } from '../../../db/schema/account';
import { player } from '../../../db/schema/player';
import { rivalState, rivalHolding, rivalAttackPatternResistance } from '../../../db/schema/conflict_rival';
import { CURRENT_API_MAJOR } from '../../../protocol/versioning';
import { CitySimSchedulerService } from '../../../citysim/scheduler/city_sim_scheduler.service';
import { Cadence } from '../../../citysim/scheduler/city_sim_system';
import { RivalAiTunables, clampToRange, rivalAiTunables } from './rival-ai.tunables';
import { RivalStateRepository } from './rival-state.repository';
import { RegimeSwitchingService } from './regime-switching.service';
import type { PressureSource, PressureMagnitudeBucket } from './regime-switching.service';
import { ReconnaissanceRegimeClassifierService } from './reconnaissance-regime-classifier.service';
import type { DisinfoBucket } from './reconnaissance-regime-classifier.service';
import { SaturationBlindnessService } from './saturation-blindness.service';
import type { ActMagnitudeBucket } from './saturation-blindness.service';
import { TempoExposureService } from './tempo-exposure.service';
import { DistributedHoldService } from './distributed-hold.service';
import { TrophicGapService } from './trophic-gap.service';
import { AdaptiveSkinService } from './adaptive-skin.service';
import { RivalTickService } from './rival-tick.service';
import { RivalProjectionService } from './rival-projection.service';
import type { RivalKey, RivalRegime, IntelMode } from './rival-ai.types';

/** Valid rival keys — used for enum-domain validation (C1 test spec: reject out-of-domain values). */
const VALID_RIVAL_KEYS: ReadonlySet<string> = new Set<RivalKey>([
  'coil',
  'tarcum',
  'iron_throat',
  'saltline',
]);

/** Valid pressure sources for the record-pressure route (C3). */
const VALID_PRESSURE_SOURCES: ReadonlySet<string> = new Set<PressureSource>([
  'territory',
  'casualty',
  'revenue',
]);

/** Valid pressure magnitude buckets for the record-pressure route (C3). */
const VALID_MAGNITUDE_BUCKETS: ReadonlySet<string> = new Set<PressureMagnitudeBucket>([
  'silent',
  'mounting',
  'crushing',
]);

/** Valid disinfo buckets for the apply-disinfo route (C3). */
const VALID_DISINFO_BUCKETS: ReadonlySet<string> = new Set<DisinfoBucket>([
  'low',
  'medium',
  'high',
]);

/** Valid act magnitude buckets for the increment-saturation route (C4). */
const VALID_ACT_MAGNITUDE_BUCKETS: ReadonlySet<string> = new Set<ActMagnitudeBucket>([
  'small',
  'concentrated',
]);

/** Valid intel modes for the set-intel-mode route (C3). */
const VALID_INTEL_MODES: ReadonlySet<string> = new Set<IntelMode>(['pull', 'push']);

/** Valid rival regimes for the set-regime route (C8). */
const VALID_REGIMES: ReadonlySet<string> = new Set<RivalRegime>([
  'expansionary',
  'consolidating',
  'bleeding',
  'defensive',
  'retrench',
  'withdrawal',
]);

@Controller({ version: String(CURRENT_API_MAJOR) })
export class RivalTestController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly rivalStateRepo: RivalStateRepository,
    private readonly rivalAiTunables: RivalAiTunables,
    private readonly regimeSvc: RegimeSwitchingService,
    private readonly reconSvc: ReconnaissanceRegimeClassifierService,
    private readonly saturationSvc: SaturationBlindnessService,
    private readonly tempoSvc: TempoExposureService,
    private readonly distributedHoldSvc: DistributedHoldService,
    private readonly trophicSvc: TrophicGapService,
    private readonly adaptiveSkinSvc: AdaptiveSkinService,
    private readonly rivalTickSvc: RivalTickService,
    private readonly scheduler: CitySimSchedulerService,
    private readonly rivalProjectionSvc: RivalProjectionService,
  ) {}

  /**
   * POST /v1/_test/rival/ensure?playerId=<uuid>
   *
   * 1. Ensure a test account + player row exist for the given player_id (idempotent).
   * 2. UPSERT all 4 rivals via DD-RIVAL-SEED. Returns { ensured: true } on success.
   *
   * Uses INSERT ... ON CONFLICT DO NOTHING throughout so calling 2× is safe.
   * The test callsign is deterministic from the playerId suffix (no Math.random()).
   */
  @Post('_test/rival/ensure')
  async ensureRivals(@Query('playerId') playerId: string): Promise<{ ensured: true }> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }

    // Check if the player already exists (idempotency guard).
    const existing = await this.db
      .select({ account_id: player.account_id })
      .from(player)
      .where(eq(player.player_id, playerId))
      .limit(1);

    if (existing.length === 0) {
      // Player doesn't exist — create account + player.
      // Derive a deterministic test callsign from the playerId suffix (no Math.random()).
      const pidSuffix = playerId.replace(/-/g, '').slice(-8);
      const testCallsign = `rv-${pidSuffix}`;

      // Step 1: create the account row.
      const [accountRow] = await this.db
        .insert(account)
        .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
        .returning({ account_id: account.account_id });
      const testAccountId = accountRow!.account_id;

      // Step 2: insert the player with the given player_id using raw SQL (Drizzle does not
      // natively support specifying a PK when a server-side default is configured).
      // We use `sql` tagged template to pass the UUID as a typed parameter.
      await this.db.execute(
        sql`INSERT INTO "player" ("player_id", "account_id", "callsign", "tier", "active_branches")
            VALUES (${playerId}::uuid, ${testAccountId}::uuid, ${testCallsign}, 1, 1)
            ON CONFLICT ("player_id") DO NOTHING`,
      );
    }

    // UPSERT the 4 rival rows (DD-RIVAL-SEED — DO NOTHING on conflict).
    await this.rivalStateRepo.ensurePlayerRivals(playerId);
    return { ensured: true };
  }

  /**
   * GET /v1/_test/rival/read-state?playerId=<uuid>&rivalKey=<key>
   *
   * Read a single rival_state row for the player × rival.
   * Returns { rival: <RivalStateRow | null> }.
   * Returns 400 if rivalKey is not a valid RivalKey (enum-domain guard).
   */
  @Get('_test/rival/read-state')
  async readRivalState(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKeyParam: string,
  ): Promise<{ rival: unknown }> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    if (!rivalKeyParam || !VALID_RIVAL_KEYS.has(rivalKeyParam)) {
      throw new HttpException(
        `rivalKey '${rivalKeyParam}' is not a valid RivalKey`,
        HttpStatus.BAD_REQUEST,
      );
    }
    const rival = await this.rivalStateRepo.readRivalState(playerId, rivalKeyParam as RivalKey);
    return { rival };
  }

  // ── C2: Tunables probe routes ──────────────────────────────────────────────────────────────

  /**
   * GET /v1/_test/rival/read-tunables
   *
   * Returns all RivalAiTunables getter values keyed by camelCase getter name.
   * Used by the C2 E2E spec to assert frozen defaults (REAL getter output — not echoed literals).
   * Anti-fabrication: each value is read via TunablesStore (sourced from registry).
   * C4: no Math.random(), no Date.now().
   */
  @Get('_test/rival/read-tunables')
  readTunables(): Record<string, unknown> {
    const t = rivalAiTunables;
    return {
      // Canon REUSE keys
      regimeRecomputeIntervalGameHours: t.regimeRecomputeIntervalGameHours,
      regimePressureThresholdPerRivalBucket: t.regimePressureThresholdPerRivalBucket,
      regimePressureDecayRatePeacefulPerDay: t.regimePressureDecayRatePeacefulPerDay,
      regimesCountPerRival: t.regimesCountPerRival,
      coilObserveIntervalTicks: t.coilObserveIntervalTicks,
      tarcumCommitDelayTicks: t.tarcumCommitDelayTicks,
      ironThroatObserveIntervalTicks: t.ironThroatObserveIntervalTicks,
      cohesionTempoPenaltyThresholdBucket: t.cohesionTempoPenaltyThresholdBucket,
      saturationTrainedThresholdBucket: t.saturationTrainedThresholdBucket,
      saturationSuppressionThresholdBucket: t.saturationSuppressionThresholdBucket,
      saturationPassiveDecayRatePerTick: t.saturationPassiveDecayRatePerTick,
      saturationSuppressionDurationTicks: t.saturationSuppressionDurationTicks,
      saturationRecomputeIntervalGameHours: t.saturationRecomputeIntervalGameHours,
      distributedHoldRerouteWindowTicks: t.distributedHoldRerouteWindowTicks,
      distributedHoldRerouteEfficiencyPenaltyBucket: t.distributedHoldRerouteEfficiencyPenaltyBucket,
      distributedHoldRouteIntegrityRetreatThresholdBucket: t.distributedHoldRouteIntegrityRetreatThresholdBucket,
      distributedHoldMaxRouteGraphSizeCoil: t.distributedHoldMaxRouteGraphSizeCoil,
      trophicSecondaryRivalCapacityBonusOnGapBucket: t.trophicSecondaryRivalCapacityBonusOnGapBucket,
      trophicGapDurationTicks: t.trophicGapDurationTicks,
      trophicRestorationRatePerTick: t.trophicRestorationRatePerTick,
      adaptiveSkinIronThroatAdaptationRateBucket: t.adaptiveSkinIronThroatAdaptationRateBucket,
      adaptiveSkinCoilAdaptationRateBucket: t.adaptiveSkinCoilAdaptationRateBucket,
      adaptiveSkinTarcumAdaptationRateBucket: t.adaptiveSkinTarcumAdaptationRateBucket,
      adaptiveSkinResistanceDecayWhenUnusedPerTick: t.adaptiveSkinResistanceDecayWhenUnusedPerTick,
      adaptiveSkinNoveltyEffectivenessMultiplier: t.adaptiveSkinNoveltyEffectivenessMultiplier,
      intelModeSwitchThresholdPerRivalBucket: t.intelModeSwitchThresholdPerRivalBucket,
      intelModePushFilterStrengthBucket: t.intelModePushFilterStrengthBucket,
      intelModePullAdaptationSpeedMultiplier: t.intelModePullAdaptationSpeedMultiplier,
      // NEW [PROV-Y26Q2] keys (OQ-A2 pressure weights)
      regimePressureWeightTerritory: t.regimePressureWeightTerritory,
      regimePressureWeightCasualty: t.regimePressureWeightCasualty,
      regimePressureWeightRevenue: t.regimePressureWeightRevenue,
      regimeFlipTiebreakSeeded: t.regimeFlipTiebreakSeeded,
      // NEW [PROV-Y26Q2] keys (OQ-A1 Saltline defaults)
      saltlineInitialRegime: t.saltlineInitialRegime,
      saltlineTempoObserveTicks: t.saltlineTempoObserveTicks,
      saltlineTempoOrientTicks: t.saltlineTempoOrientTicks,
      saltlineTempoCommitTicks: t.saltlineTempoCommitTicks,
      saltlineAdaptationRateBucket: t.saltlineAdaptationRateBucket,
      saltlineIntelMode: t.saltlineIntelMode,
      // NEW [PROV-Y26Q2] keys (OQ-A11 band cuts)
      regimeBandSilentMax: t.regimeBandSilentMax,
      regimeBandMountingMax: t.regimeBandMountingMax,
    };
  }

  /**
   * POST /v1/_test/rival/probe-clamp
   *
   * Body: { key: string, value: number }
   * Returns: { clamped: number }
   *
   * Applies RIVAL_AI_TUNABLE_CAPS.clampToRange(key, value) and returns the result.
   * FALSIFIABLE: posting { key: 'rival_ai.regime_pressure_weight_territory', value: 999 }
   * returns { clamped: 3.0 } because the range cap is 3.0 (not 999).
   * C4: no Math.random(), no Date.now().
   */
  @Post('_test/rival/probe-clamp')
  probeClamp(@Body() body: { key?: string; value?: number }): { clamped: number } {
    const key = body?.key;
    const value = body?.value;
    if (typeof key !== 'string' || key.length === 0) {
      throw new HttpException('key is required', HttpStatus.BAD_REQUEST);
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new HttpException('value must be a finite number', HttpStatus.BAD_REQUEST);
    }
    const clamped = clampToRange(key, value);
    return { clamped };
  }

  // ── C3: Regime Switching + Recon Intel-Mode routes ─────────────────────────────────────────

  /**
   * POST /v1/_test/rival/record-pressure
   *
   * Body: { playerId, rivalKey, source: 'territory'|'casualty'|'revenue', magnitudeBucket: 'silent'|'mounting'|'crushing' }
   *
   * Injects pressure onto the rival's regime_pressure via RegimeSwitchingService.recordPressure.
   * Used by the C3 spec to seed falsifiable pressure for the flip test.
   * C4: deterministic. No Math.random. No Date.now.
   */
  @Post('_test/rival/record-pressure')
  async recordPressure(
    @Body() body: {
      playerId?: string;
      rivalKey?: string;
      source?: string;
      magnitudeBucket?: string;
    },
  ): Promise<{ recorded: true }> {
    const { playerId, rivalKey, source, magnitudeBucket } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKey || !VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`rivalKey '${rivalKey}' is not a valid RivalKey`, HttpStatus.BAD_REQUEST);
    }
    if (!source || !VALID_PRESSURE_SOURCES.has(source)) {
      throw new HttpException(`source '${source}' must be territory|casualty|revenue`, HttpStatus.BAD_REQUEST);
    }
    if (!magnitudeBucket || !VALID_MAGNITUDE_BUCKETS.has(magnitudeBucket)) {
      throw new HttpException(`magnitudeBucket '${magnitudeBucket}' must be silent|mounting|crushing`, HttpStatus.BAD_REQUEST);
    }

    await this.regimeSvc.recordPressure(
      playerId,
      rivalKey as RivalKey,
      source as PressureSource,
      magnitudeBucket as PressureMagnitudeBucket,
    );
    return { recorded: true };
  }

  /**
   * POST /v1/_test/rival/run-regime-tick?playerId=<uuid>&gameMinute=<number>
   *
   * Runs the full TWELVE_H regime sweep for the player at the given game-minute.
   * Returns { regimeTransitionsEmitted: number } — the spec asserts >= 1 when a flip occurs.
   * gameMinute must be a positive integer (game-time, NOT wall-clock).
   * C4: deterministic. No Math.random. No Date.now.
   */
  @Post('_test/rival/run-regime-tick')
  async runRegimeTick(
    @Query('playerId') playerId: string,
    @Query('gameMinute') gameMinuteStr: string,
  ): Promise<{ regimeTransitionsEmitted: number }> {
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    const gameMinute = parseInt(gameMinuteStr ?? '0', 10);
    if (!Number.isFinite(gameMinute) || gameMinute < 0) {
      throw new HttpException('gameMinute must be a non-negative integer', HttpStatus.BAD_REQUEST);
    }

    return this.rivalTickSvc.runRegimeTickForPlayer(playerId, gameMinute);
  }

  /**
   * GET /v1/_test/rival/decision-policy?playerId=<uuid>&rivalKey=<key>
   *
   * Returns { decisionPolicy: string } — the §13 server-side policy ref for the rival's current regime.
   * SERVER-ONLY (P6 — never exposed to the player; only accessible in non-production).
   * Returns { decisionPolicy: null } if no row exists for the player × rival.
   */
  @Get('_test/rival/decision-policy')
  async getDecisionPolicy(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKeyParam: string,
  ): Promise<{ decisionPolicy: string | null }> {
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKeyParam || !VALID_RIVAL_KEYS.has(rivalKeyParam)) {
      throw new HttpException(`rivalKey '${rivalKeyParam}' is not a valid RivalKey`, HttpStatus.BAD_REQUEST);
    }

    const decisionPolicy = await this.regimeSvc.getActiveDecisionPolicy(
      playerId,
      rivalKeyParam as RivalKey,
    );
    return { decisionPolicy };
  }

  /**
   * POST /v1/_test/rival/set-intel-mode
   *
   * Body: { playerId, rivalKey, intelMode: 'pull'|'push' }
   * Force-sets the rival's intel_mode (the BO force-path + test controller path).
   * Returns { set: true }.
   * C4: deterministic. No Math.random. No Date.now.
   */
  @Post('_test/rival/set-intel-mode')
  async setIntelMode(
    @Body() body: { playerId?: string; rivalKey?: string; intelMode?: string },
  ): Promise<{ set: true }> {
    const { playerId, rivalKey, intelMode } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKey || !VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`rivalKey '${rivalKey}' is not a valid RivalKey`, HttpStatus.BAD_REQUEST);
    }
    if (!intelMode || !VALID_INTEL_MODES.has(intelMode)) {
      throw new HttpException(`intelMode '${intelMode}' must be pull|push`, HttpStatus.BAD_REQUEST);
    }

    await this.reconSvc.setIntelMode(playerId, rivalKey as RivalKey, intelMode as IntelMode);
    return { set: true };
  }

  /**
   * GET /v1/_test/rival/intel-mode?playerId=<uuid>&rivalKey=<key>
   *
   * Returns { intelMode: 'pull'|'push' } — the rival's current intel_mode.
   * SERVER-ONLY (P6 — the player NEVER sees intel_mode; this route is non-production only).
   * Returns { intelMode: null } if no row exists for the player × rival.
   */
  @Get('_test/rival/intel-mode')
  async getIntelMode(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKeyParam: string,
  ): Promise<{ intelMode: IntelMode | null }> {
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKeyParam || !VALID_RIVAL_KEYS.has(rivalKeyParam)) {
      throw new HttpException(`rivalKey '${rivalKeyParam}' is not a valid RivalKey`, HttpStatus.BAD_REQUEST);
    }

    const intelMode = await this.reconSvc.getIntelMode(playerId, rivalKeyParam as RivalKey);
    return { intelMode };
  }

  /**
   * POST /v1/_test/rival/apply-disinfo
   *
   * Body: { playerId, rivalKey, disinfoBucket: 'low'|'medium'|'high' }
   * Calls ReconnaissanceRegimeClassifierService.applyDisinformation.
   * Returns { landed: boolean, intelMode: string }.
   * FALSIFIABLE: Coil (PULL) → landed=true; Tarcum (PUSH) → landed=false.
   * C4: deterministic. No Math.random. No Date.now.
   */
  @Post('_test/rival/apply-disinfo')
  async applyDisinfo(
    @Body() body: { playerId?: string; rivalKey?: string; disinfoBucket?: string },
  ): Promise<{ landed: boolean; intelMode: string }> {
    const { playerId, rivalKey, disinfoBucket } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKey || !VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`rivalKey '${rivalKey}' is not a valid RivalKey`, HttpStatus.BAD_REQUEST);
    }
    if (!disinfoBucket || !VALID_DISINFO_BUCKETS.has(disinfoBucket)) {
      throw new HttpException(`disinfoBucket '${disinfoBucket}' must be low|medium|high`, HttpStatus.BAD_REQUEST);
    }

    const result = await this.reconSvc.applyDisinformation(
      playerId,
      rivalKey as RivalKey,
      disinfoBucket as DisinfoBucket,
    );
    return { landed: result.landed, intelMode: result.intelMode };
  }

  // ── Isolation: PID-scoped reset-to-baseline primitive (fix C3 sticky-pressure flake) ──────

  /**
   * POST /v1/_test/rival/reset-baseline?playerId=<uuid>&rivalKey=<key>
   *
   * Test-isolation primitive for sticky-accumulator specs (regime_pressure, saturation_pressure).
   *
   * Deletes the single (playerId, rivalKey) row and re-inserts it at the canonical static
   * baseline:
   *   regime_pressure=0, regime=<canon-initial>, saturation_pressure=0,
   *   intel_mode=<canon-default>, mode_stability_ticks=0, route_integrity=null,
   *   dominance_rank=null, vulnerable_axis=null.
   *
   * Scope: ONE row (playerId × rivalKey). PID-scoped — does NOT touch other players' rows.
   * Safe for concurrent specs that use different PIDs.
   *
   * Pattern: call in beforeAll (or beforeEach for pressure-sensitive tests) so every test
   * starts from a KNOWN state regardless of residual pressure from prior runs.
   * Reuse: C4-C8 saturation/trophic/adaptive-skin specs should call this before any
   * pressure-outcome assertion (both regime_pressure and saturation_pressure are sticky).
   *
   * Returns { reset: true }.
   */
  @Post('_test/rival/reset-baseline')
  async resetBaseline(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKeyParam: string,
  ): Promise<{ reset: true }> {
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKeyParam || !VALID_RIVAL_KEYS.has(rivalKeyParam)) {
      throw new HttpException(`rivalKey '${rivalKeyParam}' is not a valid RivalKey`, HttpStatus.BAD_REQUEST);
    }

    const rivalKey = rivalKeyParam as RivalKey;

    // Canon static baselines (mirrors RivalSeedService.RIVAL_BASELINES — kept in sync manually).
    const BASELINE_REGIME: Record<RivalKey, RivalRegime> = {
      coil:        'expansionary',
      tarcum:      'consolidating',
      iron_throat: 'defensive',
      saltline:    'consolidating', // [PROV-Y26Q2 OQ-A1]
    };
    const BASELINE_FLIP_THRESHOLD: Record<RivalKey, number> = {
      coil: 70, tarcum: 70, iron_throat: 70, saltline: 70,
    };
    const BASELINE_OBSERVE: Record<RivalKey, number> = {
      coil: 1, tarcum: 2, iron_throat: 5, saltline: 3,
    };
    const BASELINE_ORIENT: Record<RivalKey, number> = {
      coil: 2, tarcum: 4, iron_throat: 1, saltline: 2,
    };
    const BASELINE_COMMIT: Record<RivalKey, number> = {
      coil: 3, tarcum: 1, iron_throat: 0, saltline: 2,
    };
    const BASELINE_INTEL: Record<RivalKey, IntelMode> = {
      coil: 'pull', tarcum: 'push', iron_throat: 'push', saltline: 'push',
    };

    // DELETE the single row, then re-insert at baseline.
    // Two-step so the player + account rows do NOT need to be re-created.
    await this.db
      .delete(rivalState)
      .where(and(eq(rivalState.player_id, playerId), eq(rivalState.rival_key, rivalKey)));

    await this.db
      .insert(rivalState)
      .values({
        player_id:              playerId,
        rival_key:              rivalKey,
        regime:                 BASELINE_REGIME[rivalKey],
        regime_pressure:        0,
        flip_threshold:         BASELINE_FLIP_THRESHOLD[rivalKey],
        observe_interval_ticks: BASELINE_OBSERVE[rivalKey],
        orient_latency_ticks:   BASELINE_ORIENT[rivalKey],
        commit_delay_ticks:     BASELINE_COMMIT[rivalKey],
        saturation_pressure:    0,
        intel_mode:             BASELINE_INTEL[rivalKey],
        mode_stability_ticks:   0,
        route_integrity:        null,
        dominance_rank:         null,
        vulnerable_axis:        null,
      });

    return { reset: true };
  }

  // ── C4: Saturation Blindness + Tempo Exposure probe routes ────────────────────────────────

  /**
   * POST /v1/_test/rival/increment-saturation
   *
   * Body: { playerId, rivalKey, actMagnitudeBucket: 'small'|'concentrated' }
   *
   * Calls SaturationBlindnessService.incrementSaturation (the B write-hook §13).
   * Returns { saturationPressure: number } — the new saturation_pressure after the increment.
   * FALSIFIABLE: 4 × small → >= 0.3 (trained); 1 × concentrated → >= 1.4 (suppressed).
   * C4: deterministic. No Math.random. No Date.now.
   */
  @Post('_test/rival/increment-saturation')
  async incrementSaturation(
    @Body() body: {
      playerId?: string;
      rivalKey?: string;
      actMagnitudeBucket?: string;
    },
  ): Promise<{ saturationPressure: number }> {
    const { playerId, rivalKey, actMagnitudeBucket } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKey || !VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`rivalKey '${rivalKey}' is not a valid RivalKey`, HttpStatus.BAD_REQUEST);
    }
    if (!actMagnitudeBucket || !VALID_ACT_MAGNITUDE_BUCKETS.has(actMagnitudeBucket)) {
      throw new HttpException(
        `actMagnitudeBucket '${actMagnitudeBucket}' must be small|concentrated`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const saturationPressure = await this.saturationSvc.incrementSaturation(
      playerId,
      rivalKey as RivalKey,
      actMagnitudeBucket as ActMagnitudeBucket,
    );
    return { saturationPressure };
  }

  /**
   * GET /v1/_test/rival/saturation-band?playerId=<uuid>&rivalKey=<key>
   *
   * Returns { band: 'silent'|'trained'|'suppressed'|null } — the current biphasic saturation band.
   * Threshold compare on saturation_pressure vs composite:STANDARD refs (0.3 / 1.4).
   * SERVER-ONLY (P6). No Math.random. No Date.now.
   */
  @Get('_test/rival/saturation-band')
  async getSaturationBand(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKeyParam: string,
  ): Promise<{ band: string | null }> {
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKeyParam || !VALID_RIVAL_KEYS.has(rivalKeyParam)) {
      throw new HttpException(`rivalKey '${rivalKeyParam}' is not a valid RivalKey`, HttpStatus.BAD_REQUEST);
    }

    const band = await this.saturationSvc.getCurrentBand(playerId, rivalKeyParam as RivalKey);
    return { band };
  }

  /**
   * POST /v1/_test/rival/run-saturation-tick?playerId=<uuid>&gameMinute=<number>
   *
   * Runs the RIVAL_SATURATION_TICK logic for the given player at the given game-minute.
   * Respects the 6h-analog DD-CADENCE modulo guard (gameMinute % 360 === 0).
   * Returns { decayApplied: boolean } — true if the 6h boundary fired, false if off-boundary no-op.
   * FALSIFIABLE: gameMinute=360 → decayApplied=true; gameMinute=350 → decayApplied=false.
   * C4: deterministic. No Math.random. No Date.now.
   */
  @Post('_test/rival/run-saturation-tick')
  async runSaturationTick(
    @Query('playerId') playerId: string,
    @Query('gameMinute') gameMinuteStr: string,
  ): Promise<{ decayApplied: boolean }> {
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    const gameMinute = parseInt(gameMinuteStr ?? '0', 10);
    if (!Number.isFinite(gameMinute) || gameMinute < 0) {
      throw new HttpException('gameMinute must be a non-negative integer', HttpStatus.BAD_REQUEST);
    }

    return this.rivalTickSvc.runSaturationTickForPlayer(playerId, gameMinute);
  }

  /**
   * GET /v1/_test/rival/orient-window?playerId=<uuid>&rivalKey=<key>
   *
   * Returns { orientWindow: number | null } — the effective orient_latency_ticks for the rival,
   * including the cohesion couple (+1 if home-district cohesion < 0.40).
   * SERVER-ONLY (P6 — orient_latency_ticks never exposed to player).
   * Returns { orientWindow: null } if no row exists for the player × rival.
   * C4: deterministic. No Math.random. No Date.now.
   */
  @Get('_test/rival/orient-window')
  async getOrientWindow(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKeyParam: string,
  ): Promise<{ orientWindow: number | null }> {
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKeyParam || !VALID_RIVAL_KEYS.has(rivalKeyParam)) {
      throw new HttpException(`rivalKey '${rivalKeyParam}' is not a valid RivalKey`, HttpStatus.BAD_REQUEST);
    }

    const orientWindow = await this.tempoSvc.getOrientLatencyWindow(
      playerId,
      rivalKeyParam as RivalKey,
    );
    return { orientWindow };
  }

  /**
   * GET /v1/_test/rival/registered-systems
   *
   * Returns { ids: string[] } — all CitySystemId strings registered for rival-related cadences
   * (HOURLY / TWELVE_H / NIGHTLY) that start with 'rival_'.
   * Used by the C4 spec to assert all 4 rival systems are registered with the scheduler.
   * The scheduler.systemsFor(cadence) returns registered CitySimSystem objects in DAG order.
   * C4: no Math.random, no Date.now.
   */
  @Get('_test/rival/registered-systems')
  getRegisteredSystems(): { ids: string[] } {
    // Collect rival system IDs from all cadence bands (C5: RIVAL_DECISION_TICK moved to MINUTE).
    const minute  = this.scheduler.systemsFor(Cadence.MINUTE);
    const hourly  = this.scheduler.systemsFor(Cadence.HOURLY);
    const twelveH = this.scheduler.systemsFor(Cadence.TWELVE_H);
    const nightly = this.scheduler.systemsFor(Cadence.NIGHTLY);

    const allIds = [
      ...minute.map((s) => s.id),
      ...hourly.map((s) => s.id),
      ...twelveH.map((s) => s.id),
      ...nightly.map((s) => s.id),
    ].filter((id) => id.startsWith('rival_'));

    return { ids: allIds };
  }

  // ── C5: Distributed Hold probe routes ─────────────────────────────────────────────────────────

  /**
   * POST /v1/_test/rival/seed-holdings
   *
   * Body: { playerId: string, rivalKey: 'coil' }
   *
   * Seeds Coil rival_holding rows across distinct districts (idempotent — DO NOTHING on conflict).
   * Seeds 3 holding nodes: one block per district from districts 1, 5, 11 (non-adjacent — :200).
   * Each uses the lowest block_id in its district (deterministic — lowest-block-id tie-break).
   *
   * District block ranges (from static seeded geography):
   *   District 1:  blocks 1-37    → seed block 1,   district_id 1
   *   District 5:  blocks 401-465 → seed block 401, district_id 5
   *   District 11: blocks 1001-1056 → seed block 1001, district_id 11
   *
   * Returns { seeded: number } — the count of rows upserted (DO NOTHING means 0 on re-seed).
   * Deterministic: no Math.random, no Date.now.
   * C5: the test controller seeding pattern used by rival_distributed_hold.spec.ts.
   */
  @Post('_test/rival/seed-holdings')
  async seedHoldings(
    @Body() body: { playerId?: string; rivalKey?: string },
  ): Promise<{ seeded: number }> {
    const { playerId, rivalKey } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKey || !VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`rivalKey '${rivalKey}' is not a valid RivalKey`, HttpStatus.BAD_REQUEST);
    }

    // Seed 3 Coil holding nodes across non-adjacent districts (idempotent DO NOTHING).
    // Block IDs taken from the static seeded geography (lowest block per district).
    const COIL_HOLDINGS = [
      { block_id: 1,    district_id: 1  }, // District 1  (blocks 1-37)
      { block_id: 401,  district_id: 5  }, // District 5  (blocks 401-465) — non-adjacent
      { block_id: 1001, district_id: 11 }, // District 11 (blocks 1001-1056) — non-adjacent
    ];

    let seeded = 0;
    for (const h of COIL_HOLDINGS) {
      const result = await this.db
        .insert(rivalHolding)
        .values({
          player_id:   playerId,
          rival_key:   rivalKey as 'coil' | 'tarcum' | 'iron_throat' | 'saltline',
          block_id:    h.block_id,
          district_id: h.district_id,
        })
        .onConflictDoNothing();
      // Drizzle returns the rowcount in the result (execute mode).
      // Count as 1 row seeded if it didn't conflict.
      if (result && (result as { rowCount?: number }).rowCount) {
        seeded += (result as { rowCount: number }).rowCount;
      } else {
        seeded += 0; // DO NOTHING on conflict
      }
    }

    // After seeding, run an initial rerouteEvaluation so route_integrity is non-null in rival_state.
    // This lets the C5 spec's test 1 (route-integrity bucket check) work without a prior run-reroute call.
    // rerouteEvaluation is a no-op for non-Coil (Coil-only mechanic) — safe to always call here.
    await this.distributedHoldSvc.rerouteEvaluation(playerId, rivalKey as 'coil' | 'tarcum' | 'iron_throat' | 'saltline');

    return { seeded };
  }

  /**
   * POST /v1/_test/rival/seed-holdings-connected
   *
   * Body: { playerId: string, rivalKey: 'coil' }
   *
   * Seeds Coil rival_holding rows on ADJACENT blocks within district 1 (idempotent DO NOTHING).
   * Seeds 3 holding nodes: blocks 1, 2, 3 (all in district 1, mutually adjacent on the intra-district grid).
   *   Block 1 neighbors (foot): {2, 11, 101} — block 2 is in the set → connected.
   *   Block 2 neighbors (foot): {1, 3, 12}  — blocks 1,3 are in the set → connected.
   *   Block 3 neighbors (foot): {2, 4, 13}  — block 2 is in the set → connected.
   * All 3 nodes connected → route_integrity = 1.0 → 'dense' bucket.
   *
   * Purpose: C5 A2 connectivity-CONTRAST — proves route_integrity is falsifiably RESPONSIVE
   * to connectivity (isolated → 'fractured'; connected → higher bucket).
   *
   * Returns { seeded: number } — count of rows upserted.
   * Deterministic: no Math.random, no Date.now.
   */
  @Post('_test/rival/seed-holdings-connected')
  async seedHoldingsConnected(
    @Body() body: { playerId?: string; rivalKey?: string },
  ): Promise<{ seeded: number }> {
    const { playerId, rivalKey } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKey || !VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`rivalKey '${rivalKey}' is not a valid RivalKey`, HttpStatus.BAD_REQUEST);
    }

    // 3 adjacent blocks within district 1 — all mutually connected on the intra-district foot-graph.
    // Block 1 ↔ Block 2 ↔ Block 3 (grid-adjacent, verified via /v1/_test/route-lifecycle/graph-neighbors).
    const CONNECTED_HOLDINGS = [
      { block_id: 1, district_id: 1 }, // block 1 district 1: neighbors {2, 11, 101}
      { block_id: 2, district_id: 1 }, // block 2 district 1: neighbors {1, 3, 12}
      { block_id: 3, district_id: 1 }, // block 3 district 1: neighbors {2, 4, 13}
    ];

    let seeded = 0;
    for (const h of CONNECTED_HOLDINGS) {
      const result = await this.db
        .insert(rivalHolding)
        .values({
          player_id:   playerId,
          rival_key:   rivalKey as 'coil' | 'tarcum' | 'iron_throat' | 'saltline',
          block_id:    h.block_id,
          district_id: h.district_id,
        })
        .onConflictDoNothing();
      if (result && (result as { rowCount?: number }).rowCount) {
        seeded += (result as { rowCount: number }).rowCount;
      }
    }

    // Run rerouteEvaluation so route_integrity reflects the connected set immediately.
    await this.distributedHoldSvc.rerouteEvaluation(playerId, rivalKey as 'coil' | 'tarcum' | 'iron_throat' | 'saltline');

    return { seeded };
  }

  /**
   * POST /v1/_test/rival/run-reroute?playerId=&rivalKey=&gameMinute=
   *
   * Calls DistributedHoldService.rerouteEvaluation for the given rival.
   * Respects the 4-game-minute modulo guard (canon tick_schedule…:18 "Every 4 ticks").
   * Returns { evaluated: boolean } — true if the guard fired, false if off-boundary no-op.
   *
   * FALSIFIABLE: gameMinute=480 (480 % 4 == 0) → evaluated=true.
   *              gameMinute=481 → evaluated=false.
   * C5: deterministic. No Math.random. No Date.now.
   */
  @Post('_test/rival/run-reroute')
  async runReroute(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKeyParam: string,
    @Query('gameMinute') gameMinuteStr: string,
  ): Promise<{ evaluated: boolean }> {
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKeyParam || !VALID_RIVAL_KEYS.has(rivalKeyParam)) {
      throw new HttpException(`rivalKey '${rivalKeyParam}' is not a valid RivalKey`, HttpStatus.BAD_REQUEST);
    }
    const gameMinute = parseInt(gameMinuteStr ?? '0', 10);
    if (!Number.isFinite(gameMinute) || gameMinute < 0) {
      throw new HttpException('gameMinute must be a non-negative integer', HttpStatus.BAD_REQUEST);
    }

    return this.rivalTickSvc.runRerouteForPlayer(playerId, rivalKeyParam as RivalKey, gameMinute);
  }

  /**
   * GET /v1/_test/rival/route-integrity?playerId=&rivalKey=
   *
   * Calls DistributedHoldService.getRouteIntegrity.
   * Returns { routeIntegrity: 'fractured'|'sparse'|'intact'|'dense'|null }.
   *   null for non-Coil rivals (Coil-only mechanic per canon :399).
   *   null if no rival_state row exists for the player × rival.
   *
   * SERVER-ONLY (P6 — route_integrity float never exposed to player; only the bucket string is returned).
   * C5: deterministic. No Math.random. No Date.now.
   */
  @Get('_test/rival/route-integrity')
  async getRouteIntegrity(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKeyParam: string,
  ): Promise<{ routeIntegrity: string | null }> {
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKeyParam || !VALID_RIVAL_KEYS.has(rivalKeyParam)) {
      throw new HttpException(`rivalKey '${rivalKeyParam}' is not a valid RivalKey`, HttpStatus.BAD_REQUEST);
    }

    const routeIntegrity = await this.distributedHoldSvc.getRouteIntegrity(
      playerId,
      rivalKeyParam as RivalKey,
    );
    return { routeIntegrity };
  }

  // ── C6: Trophic Gap probe routes ─────────────────────────────────────────────────────────────

  /**
   * POST /v1/_test/rival/remove-enforcer
   *
   * Body: { playerId, rivalKey, gameMinute }
   *
   * The B/C §13 write-hook: calls TrophicGapService.removeTopEnforcer.
   * Flips top_enforcer_active=false for all pairs where rival_a_key = rivalKey.
   * Idempotent: if already false for all pairs, returns { removed: false }.
   *
   * Returns { removed: boolean }:
   *   true  — at least one pair was flipped (enforcer removed, cascade pending on next 12h sweep).
   *   false — no-op (enforcer already inactive, or no pairs seeded for this player × rival).
   *
   * C4: deterministic. No Math.random. No Date.now. gameMinute is game-time (recorded for audit).
   * P6: the raw enforcement_pressure float is not returned — only the removed boolean.
   */
  @Post('_test/rival/remove-enforcer')
  async removeEnforcer(
    @Body() body: { playerId?: string; rivalKey?: string; gameMinute?: number },
  ): Promise<{ removed: boolean }> {
    const { playerId, rivalKey } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKey || !VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`rivalKey '${rivalKey}' is not a valid RivalKey`, HttpStatus.BAD_REQUEST);
    }

    return this.trophicSvc.removeTopEnforcer(playerId, rivalKey as RivalKey);
  }

  /**
   * GET /v1/_test/rival/trophic-suppression?playerId=<uuid>&rivalKey=<key>
   *
   * Calls TrophicGapService.getTrophicSuppression — the §13 soft indicator surface.
   *
   * Returns:
   *   { suppressedRival: string | null, indicator: 'suppressing'|'freed'|'restoring'|'none' }
   *
   * P6 invariant: `enforcement_pressure` (the raw float) is NEVER in this response.
   *   The indicator is a qualitative string derived from the pair state (P6-safe).
   * SERVER-ONLY: this route is non-production only (testControllersEnabled-gated).
   *
   * C4: deterministic. No Math.random. No Date.now.
   */
  @Get('_test/rival/trophic-suppression')
  async getTrophicSuppression(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKeyParam: string,
  ): Promise<{ suppressedRival: string | null; indicator: string }> {
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKeyParam || !VALID_RIVAL_KEYS.has(rivalKeyParam)) {
      throw new HttpException(`rivalKey '${rivalKeyParam}' is not a valid RivalKey`, HttpStatus.BAD_REQUEST);
    }

    const result = await this.trophicSvc.getTrophicSuppression(playerId, rivalKeyParam as RivalKey);
    // P6: return ONLY suppressedRival + indicator — no enforcement_pressure in this surface.
    return { suppressedRival: result.suppressedRival, indicator: result.indicator };
  }

  /**
   * POST /v1/_test/rival/run-daily-tick?playerId=<uuid>&gameMinute=<number>
   *
   * Runs the full NIGHTLY daily sweep for the player at the given game-minute,
   * IDENTICAL to the live `runDailyTick` path.
   *
   * CONVERGENCE (C6 pre-empt for C7): wired here so when C7 adds the adaptive-skin decay body
   * to `runDailyTickForRival`, the test route automatically exercises it — same as the
   * `run-regime-tick` convergence fix. Mirrors the live `runDailyTick` loop exactly.
   *
   * Returns { sweepCompleted: boolean } — true if rivals exist (L1 skip did NOT fire).
   * C4: deterministic. No Math.random. No Date.now.
   */
  @Post('_test/rival/run-daily-tick')
  async runDailyTick(
    @Query('playerId') playerId: string,
    @Query('gameMinute') gameMinuteStr: string,
  ): Promise<{ sweepCompleted: boolean }> {
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    const gameMinute = parseInt(gameMinuteStr ?? '0', 10);
    if (!Number.isFinite(gameMinute) || gameMinute < 0) {
      throw new HttpException('gameMinute must be a non-negative integer', HttpStatus.BAD_REQUEST);
    }

    return this.rivalTickSvc.runDailyTickForPlayer(playerId, gameMinute);
  }

  /**
   * POST /v1/_test/rival/reset-pair-pressure?playerId=<uuid>
   *
   * Test-isolation primitive for the C6 trophic gap spec.
   * Resets ALL rival_pair_pressure rows for the player to baseline:
   *   top_enforcer_active=true, enforcement_pressure=0.
   *
   * Call in beforeAll / at the start of C6 tests to clear any stale pair state
   * from prior runs on a long-lived stack.
   *
   * Returns { reset: true }.
   * C4: deterministic. No Math.random. No Date.now.
   */
  @Post('_test/rival/reset-pair-pressure')
  async resetPairPressure(
    @Query('playerId') playerId: string,
  ): Promise<{ reset: true }> {
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);

    await this.trophicSvc.resetPairPressure(playerId);
    return { reset: true };
  }

  // ── C7: Adaptive Skin probe routes ───────────────────────────────────────────────────────────

  /**
   * POST /v1/_test/rival/record-attack
   *
   * Body: { playerId, rivalKey, patternHash, gameMinute }
   *
   * The B/C §13 write-hook: calls AdaptiveSkinService.recordAttack.
   * UPSERT rival_attack_pattern_resistance for (player, rival, pattern):
   *   resistance += adaptation_rate (per-rival getter-sourced rate).
   *   last_used_tick = gameMinute (game-time — NOT wall-clock).
   * Returns { recorded: true }.
   *
   * P6: resistance float is NOT returned. gameMinute must be a non-negative integer (game-time).
   * C4: deterministic. No Math.random. No Date.now.
   */
  @Post('_test/rival/record-attack')
  async recordAttack(
    @Body() body: {
      playerId?: string;
      rivalKey?: string;
      patternHash?: string;
      gameMinute?: number;
    },
  ): Promise<{ recorded: true }> {
    const { playerId, rivalKey, patternHash, gameMinute } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKey || !VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`rivalKey '${rivalKey}' is not a valid RivalKey`, HttpStatus.BAD_REQUEST);
    }
    if (!patternHash || typeof patternHash !== 'string' || patternHash.length === 0) {
      throw new HttpException('patternHash is required (non-empty string)', HttpStatus.BAD_REQUEST);
    }
    if (patternHash.length > 64) {
      throw new HttpException('patternHash must be <= 64 characters (varchar(64))', HttpStatus.BAD_REQUEST);
    }
    const gm = typeof gameMinute === 'number' ? gameMinute : parseInt(String(gameMinute ?? '0'), 10);
    if (!Number.isFinite(gm) || gm < 0) {
      throw new HttpException('gameMinute must be a non-negative integer (game-time)', HttpStatus.BAD_REQUEST);
    }

    await this.adaptiveSkinSvc.recordAttack(playerId, rivalKey as RivalKey, patternHash, gm);
    return { recorded: true };
  }

  /**
   * GET /v1/_test/rival/pattern-resistance?playerId=<uuid>&rivalKey=<key>&patternHash=<hash>
   *
   * Returns { bucket: 'none'|'low'|'medium'|'high' } — the ResistanceBucket for (player, rival, pattern).
   * P6: the raw `resistance` float is NEVER returned (SERVER-ONLY, :305).
   *   The bucket is a closed qualitative string — the only public surface for Adaptive Skin resistance.
   *
   * If no row exists for the player × rival × pattern, returns { bucket: 'none' } (the baseline :281).
   * C4: deterministic. No Math.random. No Date.now.
   */
  @Get('_test/rival/pattern-resistance')
  async getPatternResistance(
    @Query('playerId')    playerId: string,
    @Query('rivalKey')    rivalKeyParam: string,
    @Query('patternHash') patternHash: string,
  ): Promise<{ bucket: string }> {
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKeyParam || !VALID_RIVAL_KEYS.has(rivalKeyParam)) {
      throw new HttpException(`rivalKey '${rivalKeyParam}' is not a valid RivalKey`, HttpStatus.BAD_REQUEST);
    }
    if (!patternHash || patternHash.length === 0) {
      throw new HttpException('patternHash is required', HttpStatus.BAD_REQUEST);
    }

    const bucket = await this.adaptiveSkinSvc.getPatternResistance(
      playerId,
      rivalKeyParam as RivalKey,
      patternHash,
    );
    // P6: return ONLY the bucket string — no raw resistance float on this surface.
    return { bucket };
  }

  /**
   * POST /v1/_test/rival/reset-pattern-resistance?playerId=<uuid>&rivalKey=<key>
   *
   * Test-isolation primitive for the C7 adaptive skin spec.
   * DELETEs ALL rival_attack_pattern_resistance rows for (player, rival).
   *
   * resistance is a sticky accumulator — repeated runs of the spec would accumulate resistance
   * from prior runs without this reset. Call in beforeAll or at the start of each test group.
   *
   * Scope: (playerId, rivalKey) — touches ONLY the one player × rival pair. Safe for concurrent specs.
   * Pattern: mirrors reset-pair-pressure (C6) for per-player sticky accumulators.
   *
   * Returns { reset: true }.
   * C4: deterministic. No Math.random. No Date.now.
   */
  @Post('_test/rival/reset-pattern-resistance')
  async resetPatternResistance(
    @Query('playerId')  playerId: string,
    @Query('rivalKey')  rivalKeyParam: string,
  ): Promise<{ reset: true }> {
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKeyParam || !VALID_RIVAL_KEYS.has(rivalKeyParam)) {
      throw new HttpException(`rivalKey '${rivalKeyParam}' is not a valid RivalKey`, HttpStatus.BAD_REQUEST);
    }

    await this.db
      .delete(rivalAttackPatternResistance)
      .where(and(
        eq(rivalAttackPatternResistance.player_id, playerId),
        eq(rivalAttackPatternResistance.rival_key, rivalKeyParam as RivalKey),
      ));

    return { reset: true };
  }

  // ── C8: DD-P6-WALL — RivalProjectionService probe routes ─────────────────────────────────────

  /**
   * GET /v1/_test/rival/client-view?playerId=<uuid>&rivalKey=<key>
   *
   * Returns `RivalProjectionService.toClientView(playerId, rivalKey)`.
   *
   * P6 wall test surface: the returned object has EXACTLY the 5 closed bands
   * (behavioralIndicator, regimePressureBand, saturationBand, routeIntegrityBand,
   * trophicSuppression) — no hidden field (regime enum, raw float, intel_mode, etc.)
   * ever appears in this response.
   *
   * The C8 grep-zero spec reads this route and asserts: no raw float literal in the JSON,
   * no regime enum key, all fields in their closed domain.
   *
   * SERVER-ONLY: gated by testControllersEnabled() — not a player-facing route.
   * C4: NO Math.random(), NO Date.now() — pure DB read + projection.
   */
  @Get('_test/rival/client-view')
  async getClientView(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKeyParam: string,
  ): Promise<unknown> {
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKeyParam || !VALID_RIVAL_KEYS.has(rivalKeyParam)) {
      throw new HttpException(`rivalKey '${rivalKeyParam}' is not a valid RivalKey`, HttpStatus.BAD_REQUEST);
    }

    return this.rivalProjectionSvc.toClientView(playerId, rivalKeyParam as RivalKey);
  }

  /**
   * POST /v1/_test/rival/set-regime
   *
   * Body: { playerId, rivalKey, regime: RivalRegime, regimePressure: number }
   *
   * Directly sets the rival's regime + regime_pressure (the falsifiable P5 test path for C8).
   * Used by `rival_p6_wall.spec.ts` test 2 to force two rivals into DIFFERENT hidden regimes
   * at the SAME regime_pressure level, then assert the player-facing band is the SAME.
   *
   * Validates:
   *   - rivalKey ∈ VALID_RIVAL_KEYS (enum-domain guard)
   *   - regime ∈ VALID_REGIMES (6-member enum-domain guard)
   *   - regimePressure ∈ [0, 100] (clamp to domain — not an error, silently clamped)
   *
   * Returns { set: true }.
   * C4: deterministic. No Math.random(). No Date.now().
   * P6: sets the HIDDEN regime directly (not a player-facing path); the test then reads
   *     toClientView which must NOT reveal the regime enum.
   */
  @Post('_test/rival/set-regime')
  async setRegime(
    @Body() body: {
      playerId?: string;
      rivalKey?: string;
      regime?: string;
      regimePressure?: number;
    },
  ): Promise<{ set: true }> {
    const { playerId, rivalKey, regime, regimePressure } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKey || !VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`rivalKey '${rivalKey}' is not a valid RivalKey`, HttpStatus.BAD_REQUEST);
    }
    if (!regime || !VALID_REGIMES.has(regime)) {
      throw new HttpException(`regime '${regime}' must be a valid RivalRegime`, HttpStatus.BAD_REQUEST);
    }
    const pressure = typeof regimePressure === 'number'
      ? Math.min(100, Math.max(0, regimePressure))
      : 0;

    // Use the repository's updateRegime path to set regime + pressure directly.
    // gameMinute=0 (not persisted — the update is for test isolation only).
    await this.rivalStateRepo.updateRegime(
      playerId,
      rivalKey as RivalKey,
      regime as RivalRegime,
      pressure,
      0,
    );

    return { set: true };
  }
}
