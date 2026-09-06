// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-C-diplomacy-infowar-plan.md Task 9 (C9)
//             Pattern: services/game-back/src/operational/conflict/diplomacy/diplomacy-test.controller.ts
//             — Diplomacy & Information Warfare C C9 — 2026-06-26 —
//
// `InformationWarfareTestController` — TEST-ONLY probe routes for C9 info-warfare verification.
//
// GATING: mounted ONLY when NODE_ENV !== 'production' (registered conditionally in
// InformationWarfareModule via testControllersEnabled() — same pattern as DiplomacyTestController /
// CombatTestController). In production this controller is simply not registered → 404.
// The E2E compose stack runs NODE_ENV=development so routes are available.
//
// Routes:
//   POST /v1/_test/infowar/reset?playerId=<uuid>
//   POST /v1/_test/infowar/update-belief?playerId=<uuid>&rivalKey=<key>&gameMinute=<n>
//   GET  /v1/_test/infowar/read-belief?playerId=<uuid>&rivalKey=<key>
//   POST /v1/_test/infowar/decay-belief?playerId=<uuid>&rivalKey=<key>
//   POST /v1/_test/infowar/record-action?playerId=<uuid>&rivalKey=<key>&actionType=<type>&gameMinute=<n>
//   GET  /v1/_test/infowar/get-interpretation-badge?playerId=<uuid>&rivalKey=<key>&gameMinute=<n>
//   POST /v1/_test/infowar/run-surveillance?playerId=<uuid>&rivalKey=<key>&gameMinute=<n>
//   GET  /v1/_test/infowar/read-surveillance?playerId=<uuid>&rivalKey=<key>
//   POST /v1/_test/infowar/plant-embed-signal?playerId=<uuid>&rivalKey=<key>&isBluff=<bool>&gameMinute=<n>
//   GET  /v1/_test/infowar/read-purge-state?playerId=<uuid>&rivalKey=<key>
//   POST /v1/_test/infowar/run-info-loop-tick?playerId=<uuid>&gameMinute=<n>
//   GET  /v1/_test/infowar/read-erosion-intel?playerId=<uuid>&rivalKey=<key>
//
// Anti-fabrication: no Math.random(). No Date.now(). Pure deterministic CRUD.
// R2.2 / P6: SERVER-ONLY routes. Not player-facing. Gated by testControllersEnabled().

import {
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';

import { CURRENT_API_MAJOR } from '../../../protocol/versioning';
import { DeadReckoningService } from './dead-reckoning.service';
import { DualUseSignalService } from './dual-use-signal.service';
import type { DualUseActionType } from './dual-use-signal.service';
import { ObservationDisturbanceService } from './observation-disturbance.service';
import { PurgeTrapService } from './purge-trap.service';
import { InformationWarfareOrchestratorService } from './infowar-orchestrator.service';
import { InformationWarfareProjectionService } from './infowar-projection.service';
import { InformationWarfareRepository } from './infowar.repository';
import { ErosionRegisterService } from '../combat/erosion-register.service';
// C12: PacifistViabilityValidator — the brand-commitment gate (DD-PACIFIST-E2E).
import { PacifistViabilityValidator } from './pacifist-viability-validator.service';
import type { PacifistViabilityReport } from './pacifist-viability-validator.service';
import type { RivalKey } from '../rival/rival-ai.types';
import type { InfoWarClientView } from './infowar.types';

// ─── Valid value sets (for enum domain validation) ─────────────────────────────────────────────

const VALID_RIVAL_KEYS: ReadonlySet<string> = new Set<RivalKey>([
  'coil',
  'tarcum',
  'iron_throat',
  'saltline',
]);

const VALID_ACTION_TYPES: ReadonlySet<string> = new Set<DualUseActionType>([
  'combat',
  'territorial',
  'neutral',
  'economic',
]);

// ─── All 4 rival keys for the full-reset sweep ─────────────────────────────────────────────────

const ALL_RIVAL_KEYS: RivalKey[] = ['coil', 'tarcum', 'iron_throat', 'saltline'];

// ─── Controller ───────────────────────────────────────────────────────────────────────────────

@Controller({ version: String(CURRENT_API_MAJOR) })
export class InformationWarfareTestController {
  constructor(
    private readonly deadReckoning: DeadReckoningService,
    private readonly dualUseSignal: DualUseSignalService,
    private readonly observation: ObservationDisturbanceService,
    private readonly purgeTrap: PurgeTrapService,
    private readonly orchestrator: InformationWarfareOrchestratorService,
    private readonly repo: InformationWarfareRepository,
    private readonly erosionRegister: ErosionRegisterService,
    // C10: InformationWarfareProjectionService — DD-P5 infowar client-view driver.
    private readonly infowarProjection: InformationWarfareProjectionService,
    // C12: PacifistViabilityValidator — the brand-commitment gate (DD-PACIFIST-E2E).
    private readonly pacifistValidator: PacifistViabilityValidator,
  ) {}

  /**
   * POST /v1/_test/infowar/reset?playerId=<uuid>
   *
   * Resets all 4 infowar tables for (player × all 4 rivals) to baseline (onConflictDoUpdate).
   * Idempotent. Returns { reset: true }.
   *
   * Pattern: sticky-accumulator isolation (the D2 §3.3 lesson). onConflictDoUpdate
   * is mandatory — onConflictDoNothing would silently leave stale values.
   */
  @Post('_test/infowar/reset')
  @HttpCode(200)
  async resetInfowar(
    @Query('playerId') playerId: string,
  ): Promise<{ reset: true }> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    for (const rk of ALL_RIVAL_KEYS) {
      // Reset dead_reckoning_belief to floor-band values.
      await this.repo.upsertBelief(playerId, rk, {
        operational_tempo_band:       'low',
        resource_mobilization_band:   'dormant',
        personnel_concentration_band: 'dispersed',
        communication_pattern_band:   'silent',
        territorial_reach_band:       'contracting',
        logistics_intensity_band:     'minimal',
        coil_corruption_applied:      false,
        last_updated_tick:            0,
      });
      // Reset dual_use_signal_state to zero bias.
      await this.repo.upsertDualUseState(playerId, rk, {
        action_type:               'neutral',
        rival_interpretation_bias: 0,
        interpretation_badge:      'posture',
        last_bpd_prior_mass:       0,
        last_updated_tick:         0,
      });
      // Reset surveillance_op to inactive baseline.
      await this.repo.upsertSurveillanceOp(playerId, rk, {
        active:                  false,
        detection_probability:   0,
        last_detection_game_day: 0,
        last_disinfo_landed:     false,
        last_updated_tick:       0,
      });
      // Reset purge_trap_state to zero infiltration.
      await this.repo.upsertPurgeTrapState(playerId, rk, {
        suspected_infiltration_level: 0,
        internal_purge_active:        false,
        bluff_active:                 false,
        bluff_discovered:             false,
        last_updated_tick:            0,
      });
    }
    return { reset: true };
  }

  /**
   * POST /v1/_test/infowar/update-belief?playerId=<uuid>&rivalKey=<key>&gameMinute=<n>
   *
   * Calls DeadReckoningService.updateBeliefState and returns the written belief.
   * Returns { belief: BeliefUpdate | null }.
   */
  @Post('_test/infowar/update-belief')
  @HttpCode(200)
  async updateBelief(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKey: string,
    @Query('gameMinute') gameMinute: string,
  ): Promise<{ belief: unknown }> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    if (!VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`Invalid rivalKey: ${rivalKey}`, HttpStatus.BAD_REQUEST);
    }
    const minute = parseInt(gameMinute, 10);
    if (isNaN(minute)) {
      throw new HttpException('gameMinute must be a number', HttpStatus.BAD_REQUEST);
    }
    const belief = await this.deadReckoning.updateBeliefState(playerId, rivalKey as RivalKey, minute);
    return { belief };
  }

  /**
   * GET /v1/_test/infowar/read-belief?playerId=<uuid>&rivalKey=<key>
   *
   * Reads the dead_reckoning_belief row for (player_id, rival_key).
   * Returns { belief: <row | null> }.
   */
  @Get('_test/infowar/read-belief')
  async readBelief(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKey: string,
  ): Promise<{ belief: unknown }> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    if (!VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`Invalid rivalKey: ${rivalKey}`, HttpStatus.BAD_REQUEST);
    }
    const belief = await this.repo.readBelief(playerId, rivalKey as RivalKey);
    return { belief };
  }

  /**
   * POST /v1/_test/infowar/decay-belief?playerId=<uuid>&rivalKey=<key>
   *
   * Calls DeadReckoningService.decayBeliefStatePerTick.
   * Returns { ok: true }.
   */
  @Post('_test/infowar/decay-belief')
  @HttpCode(200)
  async decayBelief(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKey: string,
  ): Promise<{ ok: true }> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    if (!VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`Invalid rivalKey: ${rivalKey}`, HttpStatus.BAD_REQUEST);
    }
    await this.deadReckoning.decayBeliefStatePerTick(playerId, rivalKey as RivalKey);
    return { ok: true };
  }

  /**
   * POST /v1/_test/infowar/record-action?playerId=<uuid>&rivalKey=<key>&actionType=<type>&gameMinute=<n>
   *
   * Calls DualUseSignalService.recordPlayerAction.
   * Returns { ok: true }.
   */
  @Post('_test/infowar/record-action')
  @HttpCode(200)
  async recordAction(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKey: string,
    @Query('actionType') actionType: string,
    @Query('gameMinute') gameMinute: string,
  ): Promise<{ ok: true }> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    if (!VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`Invalid rivalKey: ${rivalKey}`, HttpStatus.BAD_REQUEST);
    }
    if (!VALID_ACTION_TYPES.has(actionType)) {
      throw new HttpException(`Invalid actionType: ${actionType}`, HttpStatus.BAD_REQUEST);
    }
    const minute = parseInt(gameMinute, 10);
    if (isNaN(minute)) {
      throw new HttpException('gameMinute must be a number', HttpStatus.BAD_REQUEST);
    }
    await this.dualUseSignal.recordPlayerAction(
      playerId,
      rivalKey as RivalKey,
      actionType as DualUseActionType,
      minute,
    );
    return { ok: true };
  }

  /**
   * GET /v1/_test/infowar/get-interpretation-badge?playerId=<uuid>&rivalKey=<key>&gameMinute=<n>
   *
   * Calls DualUseSignalService.computeRivalInterpretation.
   * Returns { badge, bpdPriorUsed }.
   */
  @Get('_test/infowar/get-interpretation-badge')
  async getInterpretationBadge(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKey: string,
    @Query('gameMinute') gameMinute: string,
  ): Promise<{ badge: string; bpdPriorUsed: boolean }> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    if (!VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`Invalid rivalKey: ${rivalKey}`, HttpStatus.BAD_REQUEST);
    }
    const minute = parseInt(gameMinute, 10);
    if (isNaN(minute)) {
      throw new HttpException('gameMinute must be a number', HttpStatus.BAD_REQUEST);
    }
    const result = await this.dualUseSignal.computeRivalInterpretation(
      playerId,
      rivalKey as RivalKey,
      minute,
    );
    return { badge: result.badge, bpdPriorUsed: result.bpdPriorUsed };
  }

  /**
   * POST /v1/_test/infowar/run-surveillance?playerId=<uuid>&rivalKey=<key>&gameMinute=<n>
   *
   * Calls ObservationDisturbanceService.runSurveillance.
   * Returns { detected, landed, draw, gameDay }.
   */
  @Post('_test/infowar/run-surveillance')
  @HttpCode(200)
  async runSurveillance(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKey: string,
    @Query('gameMinute') gameMinute: string,
  ): Promise<{ detected: boolean; landed: boolean | null; draw: number; gameDay: number }> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    if (!VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`Invalid rivalKey: ${rivalKey}`, HttpStatus.BAD_REQUEST);
    }
    const minute = parseInt(gameMinute, 10);
    if (isNaN(minute)) {
      throw new HttpException('gameMinute must be a number', HttpStatus.BAD_REQUEST);
    }
    const result = await this.observation.runSurveillance(
      playerId,
      rivalKey as RivalKey,
      minute,
    );
    return {
      detected: result.detected,
      landed:   result.disinfoResult?.landed ?? null,
      draw:     result.draw,
      gameDay:  result.gameDay,
    };
  }

  /**
   * GET /v1/_test/infowar/read-surveillance?playerId=<uuid>&rivalKey=<key>
   *
   * Reads the surveillance_op row for (player_id, rival_key).
   * Returns { surveillanceOp: <row | null> }.
   */
  @Get('_test/infowar/read-surveillance')
  async readSurveillance(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKey: string,
  ): Promise<{ surveillanceOp: unknown }> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    if (!VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`Invalid rivalKey: ${rivalKey}`, HttpStatus.BAD_REQUEST);
    }
    const surveillanceOp = await this.repo.readSurveillanceOp(playerId, rivalKey as RivalKey);
    return { surveillanceOp };
  }

  /**
   * POST /v1/_test/infowar/plant-embed-signal?playerId=<uuid>&rivalKey=<key>&isBluff=<bool>&gameMinute=<n>
   *
   * Calls PurgeTrapService.plantEmbedSignal.
   * isBluff param: 'true' → true, anything else → false.
   * Returns { infiltrationLevel, purgeActive, bluffDiscovered, draw }.
   */
  @Post('_test/infowar/plant-embed-signal')
  @HttpCode(200)
  async plantEmbedSignal(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKey: string,
    @Query('isBluff') isBluff: string,
    @Query('gameMinute') gameMinute: string,
  ): Promise<{ infiltrationLevel: number; purgeActive: boolean; bluffDiscovered: boolean; draw: number | null }> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    if (!VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`Invalid rivalKey: ${rivalKey}`, HttpStatus.BAD_REQUEST);
    }
    const minute = parseInt(gameMinute, 10);
    if (isNaN(minute)) {
      throw new HttpException('gameMinute must be a number', HttpStatus.BAD_REQUEST);
    }
    // Parse isBluff: 'true' → true; any other value → false.
    const isBluffBool = isBluff === 'true';

    return await this.purgeTrap.plantEmbedSignal(
      playerId,
      rivalKey as RivalKey,
      isBluffBool,
      minute,
    );
  }

  /**
   * GET /v1/_test/infowar/read-purge-state?playerId=<uuid>&rivalKey=<key>
   *
   * Reads the purge_trap_state row for (player_id, rival_key).
   * Returns { purgeState: <row | null> }.
   */
  @Get('_test/infowar/read-purge-state')
  async readPurgeState(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKey: string,
  ): Promise<{ purgeState: unknown }> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    if (!VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`Invalid rivalKey: ${rivalKey}`, HttpStatus.BAD_REQUEST);
    }
    const purgeState = await this.repo.readPurgeTrapState(playerId, rivalKey as RivalKey);
    return { purgeState };
  }

  /**
   * POST /v1/_test/infowar/run-info-loop-tick?playerId=<uuid>&gameMinute=<n>
   *
   * Calls InformationWarfareOrchestratorService.runInfoLoopTickForPlayer (Lesson #3).
   * Zero live-vs-test divergence — the SAME method the scheduler calls.
   * Returns { ok: true }.
   */
  @Post('_test/infowar/run-info-loop-tick')
  @HttpCode(200)
  async runInfoLoopTick(
    @Query('playerId') playerId: string,
    @Query('gameMinute') gameMinute: string,
  ): Promise<{ ok: true }> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    const minute = parseInt(gameMinute, 10);
    if (isNaN(minute)) {
      throw new HttpException('gameMinute must be a number', HttpStatus.BAD_REQUEST);
    }
    await this.orchestrator.runInfoLoopTickForPlayer(playerId, minute);
    return { ok: true };
  }

  /**
   * GET /v1/_test/infowar/read-erosion-intel?playerId=<uuid>&rivalKey=<key>
   *
   * Reads the INTEL erosion register bucket via ErosionRegisterService.getRegisters.
   * Returns { intelBucket: string }.
   */
  @Get('_test/infowar/read-erosion-intel')
  async readErosionIntel(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKey: string,
  ): Promise<{ intelBucket: string }> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    if (!VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`Invalid rivalKey: ${rivalKey}`, HttpStatus.BAD_REQUEST);
    }
    const { registers } = await this.erosionRegister.getRegisters(playerId, rivalKey as RivalKey);
    const intelRegister = registers.find((r) => r.registerId === 'intel');
    const intelBucket = intelRegister?.current_value_bucket ?? 'standard';
    return { intelBucket };
  }

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // C10 _test route: InformationWarfareProjectionService — DD-P5 infowar client-view
  // ─────────────────────────────────────────────────────────────────────────────────────────────

  /**
   * GET /v1/_test/infowar/client-view?playerId=<uuid>&rivalKey=<key>
   *
   * Calls InformationWarfareProjectionService.toInfoWarClientView — the ONLY player-facing
   * path from infowar state. Returns the full InfoWarClientView (buckets + boolean + belief).
   * Returns { clientView: InfoWarClientView }.
   *
   * C10 _test driver. Falsifiable:
   *   - After reset: suspectedInfiltrationBucket='silent', surveillanceActive=false.
   *   - After plant-embed-signal: suspectedInfiltrationBucket changes band (not raw float).
   *   - The raw suspected_infiltration_level float NEVER appears in the response.
   *
   * P5 gate: the reviewer⊥ grep-zero checks this response for raw float leaks.
   * C4: NO Math.random(), NO Date.now(). Pure DB read via projection service.
   */
  @Get('_test/infowar/client-view')
  async getInfoWarClientView(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKey: string,
  ): Promise<{ clientView: InfoWarClientView }> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    if (!VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`Invalid rivalKey: ${rivalKey}`, HttpStatus.BAD_REQUEST);
    }
    const clientView = await this.infowarProjection.toInfoWarClientView(
      playerId,
      rivalKey as RivalKey,
    );
    return { clientView };
  }

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // C12 _test route: PacifistViabilityValidator — DD-PACIFIST-E2E brand gate
  // ─────────────────────────────────────────────────────────────────────────────────────────────

  /**
   * POST /v1/_test/infowar/run-pacifist-scenario?playerId=<uuid>&gameMinute=<n>
   *
   * Calls PacifistViabilityValidator.runE2EScenario — the brand-commitment gate.
   * Canon: pacifist_run_viability.md:58 + :76-85 + :97.
   * DD-PACIFIST-E2E: deterministic, seeded, tick-advance-driven (NOT real-time).
   *
   * The spec MUST drive the tick-advance harness FIRST (seed player + advance ticks to LATE
   * game-minute + seed diplomacy/infowar mechanic rows), THEN call this route.
   * Returns: PacifistViabilityReport (qualitative — no raw scalars).
   *
   * Lesson #3: calls the SAME runE2EScenario as the CI pipeline would. Zero live-vs-test divergence.
   * C12: NO Math.random(), NO Date.now(). Pure DB reads + game-minute threshold.
   *
   * Falsifiable:
   *   - If player has assault events: passed=false (violentEventsCount > 0).
   *   - If gameMinute < LATE_PHASE_GAME_MINUTES: passed=false (phaseReached ≠ 'LATE').
   *   - If no mechanic rows: passed=false (mechanicsUsed=false).
   *   - After spec setup (LATE minute + diplomacy seed + no assault): passed=true.
   */
  @Post('_test/infowar/run-pacifist-scenario')
  @HttpCode(200)
  async runPacifistScenario(
    @Query('playerId') playerId: string,
    @Query('gameMinute') gameMinute: string,
  ): Promise<PacifistViabilityReport> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    const minute = parseInt(gameMinute, 10);
    if (isNaN(minute)) {
      throw new HttpException('gameMinute must be a number', HttpStatus.BAD_REQUEST);
    }
    return this.pacifistValidator.runE2EScenario(playerId, minute);
  }
}
