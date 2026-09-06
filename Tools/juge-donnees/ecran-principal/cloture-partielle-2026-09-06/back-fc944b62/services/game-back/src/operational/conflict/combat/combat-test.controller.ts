// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-B-combat-escalation-plan.md Task 1 (C1) Step 7
//             Design: docs/superpowers/specs/2026-06-24-04b-B-combat-escalation-design.md §9
//             Pattern: services/game-back/src/operational/conflict/rival/rival-test.controller.ts
//             — Combat & Escalation B C1 — 2026-06-25 —
//
// `CombatTestController` — TEST-ONLY probe routes for C1 persistence verification.
//
// GATING: mounted ONLY when NODE_ENV !== 'production' (registered conditionally in CombatModule
// via testControllersEnabled() — same pattern as RivalTestController).
// In production this controller is simply not registered -> 404.
// The E2E compose stack runs NODE_ENV=development so routes are available.
//
// Routes:
//   POST /v1/_test/combat/reset-combat?playerId=&rivalKey=
//     — DELETE combat_events for player+rival, DELETE combat_operation for player+rival,
//       INSERT a fresh baseline combat_operation (base_friction_load=0, ephemeral_mode=false).
//
//   POST /v1/_test/combat/reset-escalation?playerId=&rivalKey=
//     — DELETE escalation_pair for player+rival, ensure global row exists (INSERT IF NOT EXISTS),
//       INSERT fresh escalation_pair baseline.
//
//   POST /v1/_test/combat/reset-deescalation?playerId=&rivalKey=
//     — DELETE deescalation_pair + conflict_flow for player+rival, INSERT fresh baselines.
//
//   POST /v1/_test/combat/reset-dead-hand?playerId=&rivalKey=
//     — DELETE dead_hand for player+rival, INSERT fresh baseline (intelligence_revealed=false).
//
//   GET /v1/_test/combat/read-operation?playerId=&rivalKey=
//     — read combat_operation row for (player_id, rival_key).
//
//   GET /v1/_test/combat/read-escalation-global
//     — read escalation_global_state (single global row).
//
//   GET /v1/_test/combat/read-escalation-pair?playerId=&rivalKey=
//     — read escalation_pair_state for (player_id, rival_key).
//
//   GET /v1/_test/combat/read-oscillation-lek?playerId=&tileId=
//     — read oscillation_lek_state for (player_id, tile_id).
//
//   POST /v1/_test/combat/insert-oscillation-lek
//     — body: { playerId, tileId, rivalKey } — insert/upsert a row into oscillation_lek_state.
//
//   GET /v1/_test/combat/read-deescalation-pair?playerId=&rivalKey=
//     — read deescalation_pair_state for (player_id, rival_key).
//
//   POST /v1/_test/combat/insert-flow-state
//     — body: { playerId, rivalKey, flowRegime } — upsert conflict_flow_state.
//
//   GET /v1/_test/combat/read-dead-hand?playerId=&rivalKey=
//     — read dead_hand_cache_state for (player_id, rival_key).
//
//   POST /v1/_test/combat/insert-event
//     — body: { playerId, rivalKey, type, targetBlockId? } — insert combat_event.
//
//   POST /v1/_test/combat/write-rival-combat-cols
//     — body: { playerId, rivalKey, activeLinkFraction?, operationalGraphNodeCount?,
//               partitionState?, cumulativePressureIndex?, resourcePressure? }
//       Writes the 5 B-owned columns on rival_state (OQ-B2).
//
// Anti-fabrication: no Math.random(). No Date.now(). Pure deterministic CRUD.
// R2.2 / P6: SERVER-ONLY routes. Not player-facing. Gated by testControllersEnabled().

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Post,
  Query,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import type { DrizzleClient } from '../../../db';
import { DB } from '../../../db/db.module';
import {
  combatOperation,
  combatEvent,
} from '../../../db/schema/conflict_combat';
import {
  escalationGlobalState,
  escalationPairState,
  oscillationLekState,
  deescalationPairState,
  conflictFlowState,
  deadHandCacheState,
} from '../../../db/schema/conflict_escalation';
import { rivalState, rivalHolding } from '../../../db/schema/conflict_rival';
import { lieutenant, behaviorScript } from '../../../db/schema/lieutenant';
import { CURRENT_API_MAJOR } from '../../../protocol/versioning';
import { CombatRepository } from './combat.repository';
import { CombatService } from './combat.service';
import { CombatTunables, clampCombatToRange, combatTunables } from './combat-tunables';
import { FrictionBudgetService } from './friction-budget.service';
import { PercolationService } from './percolation.service';
import { ErosionRegisterService } from './erosion-register.service';
import { EphemeralOperationService } from './ephemeral-operation.service';
import { OxbowSeveranceService } from './oxbow-severance.service';
import { DeadHandCacheService } from './dead-hand-cache.service';
import { CumulativeAttritionService, VALID_CPI_ACCRUAL_SOURCES } from './cumulative-attrition.service';
// C-esc: the 4 mechanic services + EscalationTickService (drive-escalation-tick route).
import { SandpileStateService } from './sandpile-state.service';
import { MaladaptiveMemoryService } from './maladaptive-memory.service';
import { ResonantCadenceService } from './resonant-cadence.service';
import { OscillationTrapService } from './oscillation-trap.service';
import { EscalationTickService } from './escalation-tick.service';
// C-deesc: FamiliarityDiscountService + DownstreamGateService + DeEscalationTickService.
import { FamiliarityDiscountService } from './familiarity-discount.service';
import { DownstreamGateService } from './downstream-gate.service';
import { DeEscalationTickService } from './deescalation-tick.service';
// C-cas: ConflictOrchestratorService + RivalEliminationService.
import { ConflictOrchestratorService } from './conflict-orchestrator.service';
import type { AssaultCascadeInput } from './conflict-orchestrator.service';
import { RivalEliminationService } from './rival-elimination.service';
import type { EliminationInput } from './rival-elimination.service';
import type { CpiAccrualSource } from './cumulative-attrition.service';
import { DslExecutorService } from '../../../dsl/executor.service';
import { RegimeSwitchingService } from '../rival/regime-switching.service';
import type { RivalKey } from '../rival/rival-ai.types';
import type { CombatEventType, FlowRegime, PartitionState } from './combat.types';
import { CombatProjectionService } from './combat-projection.service';
import type { CombatClientView } from './combat-projection.service';
import type { ErosionRegisterId } from './erosion-register.service';
import type { ScriptRuleRef } from '../../../dsl/signals';
import type { CompiledScript } from '../../../dsl/ir';

/** Valid rival keys — enum-domain guard (mirrors RivalTestController). */
const VALID_RIVAL_KEYS: ReadonlySet<string> = new Set<RivalKey>([
  'coil',
  'tarcum',
  'iron_throat',
  'saltline',
]);

/** Valid combat event types. */
const VALID_COMBAT_EVENT_TYPES: ReadonlySet<string> = new Set<CombatEventType>([
  'assault',
  'hold',
  'degrade_register',
]);

/** Valid erosion register ids (C5 — Erosion Register §2.4). */
const VALID_EROSION_REGISTER_IDS: ReadonlySet<string> = new Set<ErosionRegisterId>([
  'muscle',
  'finance',
  'intel',
  'infrastructure',
  'leadership',
]);

/** Valid flow regime values. */
const VALID_FLOW_REGIMES: ReadonlySet<string> = new Set<FlowRegime>([
  'running',
  'standing',
]);

/** Valid partition state values. */
const VALID_PARTITION_STATES: ReadonlySet<string> = new Set<PartitionState>([
  'integrated',
  'fragmented',
]);

@Controller({ version: String(CURRENT_API_MAJOR) })
export class CombatTestController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly combatRepo: CombatRepository,
    private readonly combatTunablesService: CombatTunables,
    private readonly combatService: CombatService,
    // DD-MUSCLE-P4-LEGIBLE §8.1.4: the legibility probe route re-resolves the player's script
    // via the executor to surface the matched rule index (P4 refuse — script-driven, not band-gate).
    private readonly executor: DslExecutorService,
    private readonly regimeSwitching: RegimeSwitchingService,
    // C4 DD-FRICTION: FrictionBudgetService (the anti-dice Friction Budget — deterministic divergence lookup).
    private readonly frictionBudget: FrictionBudgetService,
    // C5 DD-PERCOLATION: PercolationService + ErosionRegisterService.
    private readonly percolation: PercolationService,
    private readonly erosionRegister: ErosionRegisterService,
    // C6 DD-EPHEMERAL-REUSE: EphemeralOperationService (§2.3 ephemeral purge — DIV-E1 boundary).
    private readonly ephemeralOperation: EphemeralOperationService,
    // C6 DD-OXBOW-ZONE: OxbowSeveranceService (§2.5 neck detection + orphan reclassification).
    private readonly oxbowSeverance: OxbowSeveranceService,
    // C7 DD-DEADHAND-FIRE: DeadHandCacheService (§6 RetaliationModule — drive-refresh / drive-check-trigger /
    //   drive-fire / drive-intel-discovery / seed-dead-hand-reserve routes).
    //   The SAME production methods are driven — no test-only logic duplicated.
    private readonly deadHandCache: DeadHandCacheService,
    // C8 DD-ATTRITION-REPUTATION: CumulativeAttritionService (§3.6 the pacifist counterpart —
    //   drive-cpi-increment / drive-cpi-decay / drive-compute-resource-pressure routes).
    //   ★ Lesson #3: drives the SAME production methods (incrementCPI / decayCPIDaily /
    //   computeResourcePressure) — no test-only logic duplicated.
    private readonly cumulativeAttrition: CumulativeAttritionService,
    // C-esc: EscalationTickService (drive-escalation-tick route — calls SAME production method).
    //   ★ Lesson #3: runEscalationTickForPlayer is the shared per-entity method called by BOTH
    //   the scheduler run callback AND the _test route. No test-only logic duplicated.
    private readonly escalationTick: EscalationTickService,
    // C-esc: SandpileStateService (seed-sandpile-criticality route).
    private readonly sandpileState: SandpileStateService,
    // C-esc: MaladaptiveMemoryService (drive-increment-depth / drive-decay-depth routes).
    private readonly maladaptiveMemory: MaladaptiveMemoryService,
    // C-esc: ResonantCadenceService (record-provocation route).
    private readonly resonantCadence: ResonantCadenceService,
    // C-esc: OscillationTrapService (drive-apply-dampening route — applyPlayerDampening medium/max).
    //   ★ Lesson #3: drives the SAME production methods — no test-only logic duplicated.
    private readonly oscillationTrap: OscillationTrapService,
    // C-deesc §5.1: FamiliarityDiscountService (drive-accrue-familiarity / drive-reset-on-elimination /
    //   drive-get-familiarity-bucket routes — calls SAME production methods).
    //   ★ Lesson #3: drives the SAME production methods — no test-only logic duplicated.
    private readonly familiarityDiscount: FamiliarityDiscountService,
    // C-deesc §5.2: DownstreamGateService (drive-evaluate-downstream / drive-get-conflict-flow-regime /
    //   read-flow-state routes — calls SAME production methods).
    //   ★ Lesson #3: drives the SAME production methods — no test-only logic duplicated.
    private readonly downstreamGate: DownstreamGateService,
    // C-deesc: DeEscalationTickService (drive-daily-tick route — calls runCombatDailyTickForPlayer).
    //   ★ Lesson #3: runCombatDailyTickForPlayer is the shared per-entity method called by BOTH
    //   the scheduler run callback AND the _test route. No test-only logic duplicated.
    private readonly deEscalationTick: DeEscalationTickService,
    // C-cas: ConflictOrchestratorService (drive-cascade / drive-dead-hand-tick / read-cascade-dedup routes).
    //   ★ Lesson #3: runDeadHandTickForPlayer drives BOTH scheduler AND _test route.
    private readonly conflictOrchestrator: ConflictOrchestratorService,
    // C-cas: RivalEliminationService (drive-elimination route — calls executeElimination).
    private readonly rivalElimination: RivalEliminationService,
    // C-proj: CombatProjectionService (combat-client-view route — the ONLY player-facing combat shape).
    private readonly combatProjection: CombatProjectionService,
  ) {}

  // ─── Reset routes ─────────────────────────────────────────────────────────────────────────────

  /**
   * POST /v1/_test/combat/reset-combat?playerId=&rivalKey=
   *
   * Test-isolation primitive for combat_operation + combat_event.
   * Deletes events for (player, rival), deletes operation, inserts fresh baseline operation.
   * Returns { reset: true }.
   */
  @Post('_test/combat/reset-combat')
  async resetCombat(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKeyParam: string,
  ): Promise<{ reset: true }> {
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKeyParam || !VALID_RIVAL_KEYS.has(rivalKeyParam)) {
      throw new HttpException(
        `rivalKey '${rivalKeyParam}' is not a valid RivalKey`,
        HttpStatus.BAD_REQUEST,
      );
    }
    const rivalKey = rivalKeyParam as RivalKey;

    // DELETE combat_event rows for player+rival.
    await this.db
      .delete(combatEvent)
      .where(
        and(
          eq(combatEvent.player_id, playerId),
          eq(combatEvent.target_rival_key, rivalKey),
        ),
      );

    // DELETE combat_operation rows for player+rival.
    await this.db
      .delete(combatOperation)
      .where(
        and(
          eq(combatOperation.player_id, playerId),
          eq(combatOperation.rival_key, rivalKey),
        ),
      );

    // INSERT fresh baseline combat_operation.
    await this.db
      .insert(combatOperation)
      .values({
        player_id:                      playerId,
        rival_key:                      rivalKey,
        base_friction_load:             0,
        shared_friction_pool:           0,
        ephemeral_mode:                 false,
        state_persistence_window_ticks: 4,
      });

    return { reset: true };
  }

  /**
   * POST /v1/_test/combat/reset-escalation?playerId=&rivalKey=
   *
   * Test-isolation primitive for escalation state.
   * Deletes escalation_pair for (player, rival), ensures global row exists, inserts fresh pair baseline.
   * Returns { reset: true }.
   */
  @Post('_test/combat/reset-escalation')
  async resetEscalation(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKeyParam: string,
  ): Promise<{ reset: true }> {
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKeyParam || !VALID_RIVAL_KEYS.has(rivalKeyParam)) {
      throw new HttpException(
        `rivalKey '${rivalKeyParam}' is not a valid RivalKey`,
        HttpStatus.BAD_REQUEST,
      );
    }
    const rivalKey = rivalKeyParam as RivalKey;

    // DELETE escalation_pair for player+rival.
    await this.db
      .delete(escalationPairState)
      .where(
        and(
          eq(escalationPairState.player_id, playerId),
          eq(escalationPairState.rival_key, rivalKey),
        ),
      );

    // Ensure global escalation row exists and reset system_criticality to 0 baseline.
    // onConflictDoUpdate so that a saturated singleton (criticality=1.0) is reset to 0 —
    // otherwise the cascade criticality-bump assertion in test (a) would fail on run-2+
    // (the "global-table-polluted-cross-spec" lesson, D1c/D2).
    await this.db
      .insert(escalationGlobalState)
      .values({ id: 1, system_criticality: 0, cascade_threshold: 0 })
      .onConflictDoUpdate({
        target: escalationGlobalState.id,
        set: { system_criticality: 0 },
      });

    // INSERT fresh escalation_pair baseline.
    await this.db
      .insert(escalationPairState)
      .values({
        player_id:              playerId,
        rival_key:              rivalKey,
        conflict_memory_depth:  0,
        resonance_factor:       0,
        player_response_history: sql`'[]'::jsonb`,
      });

    return { reset: true };
  }

  /**
   * POST /v1/_test/combat/reset-deescalation?playerId=&rivalKey=
   *
   * Test-isolation primitive for de-escalation + flow state.
   * Deletes deescalation_pair + conflict_flow for (player, rival), inserts fresh baselines.
   * Returns { reset: true }.
   */
  @Post('_test/combat/reset-deescalation')
  async resetDeescalation(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKeyParam: string,
  ): Promise<{ reset: true }> {
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKeyParam || !VALID_RIVAL_KEYS.has(rivalKeyParam)) {
      throw new HttpException(
        `rivalKey '${rivalKeyParam}' is not a valid RivalKey`,
        HttpStatus.BAD_REQUEST,
      );
    }
    const rivalKey = rivalKeyParam as RivalKey;

    // DELETE deescalation_pair for player+rival.
    await this.db
      .delete(deescalationPairState)
      .where(
        and(
          eq(deescalationPairState.player_id, playerId),
          eq(deescalationPairState.rival_key, rivalKey),
        ),
      );

    // DELETE conflict_flow for player+rival.
    await this.db
      .delete(conflictFlowState)
      .where(
        and(
          eq(conflictFlowState.player_id, playerId),
          eq(conflictFlowState.rival_key, rivalKey),
        ),
      );

    // INSERT fresh deescalation_pair baseline.
    await this.db
      .insert(deescalationPairState)
      .values({
        player_id:          playerId,
        rival_key:          rivalKey,
        familiarity_index:  0,
        mutual_calibration: false,
        vacuum_volatility:  0,
      });

    // INSERT fresh conflict_flow baseline.
    await this.db
      .insert(conflictFlowState)
      .values({
        player_id:            playerId,
        rival_key:            rivalKey,
        flow_regime:          'running',
        downstream_condition: 0,
      });

    return { reset: true };
  }

  /**
   * POST /v1/_test/combat/reset-dead-hand?playerId=&rivalKey=
   *
   * Test-isolation primitive for dead_hand_cache_state.
   * Deletes dead_hand for (player, rival), inserts fresh baseline (intelligence_revealed=false).
   * Returns { reset: true }.
   */
  @Post('_test/combat/reset-dead-hand')
  async resetDeadHand(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKeyParam: string,
  ): Promise<{ reset: true }> {
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKeyParam || !VALID_RIVAL_KEYS.has(rivalKeyParam)) {
      throw new HttpException(
        `rivalKey '${rivalKeyParam}' is not a valid RivalKey`,
        HttpStatus.BAD_REQUEST,
      );
    }
    const rivalKey = rivalKeyParam as RivalKey;

    // DELETE dead_hand for player+rival.
    await this.db
      .delete(deadHandCacheState)
      .where(
        and(
          eq(deadHandCacheState.player_id, playerId),
          eq(deadHandCacheState.rival_key, rivalKey),
        ),
      );

    // INSERT fresh baseline (intelligence_revealed=false — the canonical starting state).
    await this.db
      .insert(deadHandCacheState)
      .values({
        player_id:             playerId,
        rival_key:             rivalKey,
        cache_script_ref:      '',
        dead_hand_reserve:     0,
        trigger_threshold:     0,
        intelligence_revealed: false,
      });

    return { reset: true };
  }

  // ─── Read routes ──────────────────────────────────────────────────────────────────────────────

  /**
   * GET /v1/_test/combat/read-operation?playerId=&rivalKey=
   *
   * Read combat_operation for (player_id, rival_key). Returns { operation: row | null }.
   */
  @Get('_test/combat/read-operation')
  async readOperation(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKeyParam: string,
  ): Promise<{ operation: unknown }> {
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKeyParam || !VALID_RIVAL_KEYS.has(rivalKeyParam)) {
      throw new HttpException(
        `rivalKey '${rivalKeyParam}' is not a valid RivalKey`,
        HttpStatus.BAD_REQUEST,
      );
    }
    const operation = await this.combatRepo.readCombatOperation(playerId, rivalKeyParam as RivalKey);
    return { operation };
  }

  /**
   * GET /v1/_test/combat/read-escalation-global
   *
   * Read escalation_global_state (single global row). Returns { global: row | null }.
   * SERVER-ONLY (P6 — system_criticality is hidden).
   */
  @Get('_test/combat/read-escalation-global')
  async readEscalationGlobal(): Promise<{ state: unknown }> {
    const state = await this.combatRepo.readEscalationGlobal();
    return { state };
  }

  /**
   * GET /v1/_test/combat/read-escalation-pair?playerId=&rivalKey=
   *
   * Read escalation_pair_state for (player_id, rival_key). Returns { pair: row | null }.
   */
  @Get('_test/combat/read-escalation-pair')
  async readEscalationPair(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKeyParam: string,
  ): Promise<{ pair: unknown }> {
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKeyParam || !VALID_RIVAL_KEYS.has(rivalKeyParam)) {
      throw new HttpException(
        `rivalKey '${rivalKeyParam}' is not a valid RivalKey`,
        HttpStatus.BAD_REQUEST,
      );
    }
    const pair = await this.combatRepo.readEscalationPair(playerId, rivalKeyParam as RivalKey);
    return { pair };
  }

  /**
   * GET /v1/_test/combat/read-oscillation-lek?playerId=&tileId=
   *
   * Read oscillation_lek_state for (player_id, tile_id). Returns { lek: row | null }.
   */
  @Get('_test/combat/read-oscillation-lek')
  async readOscillationLek(
    @Query('playerId') playerId: string,
    @Query('tileId') tileIdParam: string,
  ): Promise<{ state: unknown }> {
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    const tileId = parseInt(tileIdParam ?? '', 10);
    if (!Number.isFinite(tileId) || tileId < 0) {
      throw new HttpException('tileId must be a non-negative integer', HttpStatus.BAD_REQUEST);
    }
    const state = await this.combatRepo.readOscillationLek(playerId, tileId);
    return { state };
  }

  /**
   * POST /v1/_test/combat/insert-oscillation-lek
   *
   * Body: { playerId, tileId, rivalKey }
   * Insert/upsert an oscillation_lek_state row. Returns { lek: row }.
   */
  @Post('_test/combat/insert-oscillation-lek')
  async insertOscillationLek(
    @Body() body: { playerId?: string; tileId?: number; rivalKey?: string },
  ): Promise<{ state: unknown }> {
    const { playerId, tileId, rivalKey } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (tileId == null || !Number.isFinite(tileId)) {
      throw new HttpException('tileId must be a finite number', HttpStatus.BAD_REQUEST);
    }
    if (!rivalKey || !VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(
        `rivalKey '${rivalKey}' is not a valid RivalKey`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const state = await this.combatRepo.upsertOscillationLek(
      playerId,
      tileId,
      rivalKey as RivalKey,
      {},
    );
    return { state };
  }

  /**
   * GET /v1/_test/combat/read-deescalation-pair?playerId=&rivalKey=
   *
   * Read deescalation_pair_state for (player_id, rival_key). Returns { pair: row | null }.
   */
  @Get('_test/combat/read-deescalation-pair')
  async readDeescalationPair(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKeyParam: string,
  ): Promise<{ pair: unknown }> {
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKeyParam || !VALID_RIVAL_KEYS.has(rivalKeyParam)) {
      throw new HttpException(
        `rivalKey '${rivalKeyParam}' is not a valid RivalKey`,
        HttpStatus.BAD_REQUEST,
      );
    }
    const pair = await this.combatRepo.readDeescalationPair(playerId, rivalKeyParam as RivalKey);
    return { pair };
  }

  /**
   * POST /v1/_test/combat/insert-flow-state
   *
   * Body: { playerId, rivalKey, flowRegime }
   * Upsert conflict_flow_state. Returns { flow: row }.
   */
  @Post('_test/combat/insert-flow-state')
  async insertFlowState(
    @Body() body: { playerId?: string; rivalKey?: string; flowRegime?: string },
  ): Promise<{ state: unknown }> {
    const { playerId, rivalKey, flowRegime } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKey || !VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(
        `rivalKey '${rivalKey}' is not a valid RivalKey`,
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!flowRegime || !VALID_FLOW_REGIMES.has(flowRegime)) {
      throw new HttpException(
        `flowRegime '${flowRegime}' must be running|standing`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const state = await this.combatRepo.upsertConflictFlow(
      playerId,
      rivalKey as RivalKey,
      { flow_regime: flowRegime as FlowRegime },
    );
    return { state };
  }

  /**
   * GET /v1/_test/combat/read-dead-hand?playerId=&rivalKey=
   *
   * Read dead_hand_cache_state for (player_id, rival_key). Returns { deadHand: row | null }.
   * SERVER-ONLY (P6 — cache_script_ref / dead_hand_reserve / trigger_threshold are hidden).
   */
  @Get('_test/combat/read-dead-hand')
  async readDeadHand(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKeyParam: string,
  ): Promise<{ state: unknown }> {
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKeyParam || !VALID_RIVAL_KEYS.has(rivalKeyParam)) {
      throw new HttpException(
        `rivalKey '${rivalKeyParam}' is not a valid RivalKey`,
        HttpStatus.BAD_REQUEST,
      );
    }
    const state = await this.combatRepo.readDeadHand(playerId, rivalKeyParam as RivalKey);
    return { state };
  }

  // ─── Mutation probe routes ────────────────────────────────────────────────────────────────────

  /**
   * POST /v1/_test/combat/insert-event
   *
   * Body: { playerId, rivalKey, type, targetBlockId? }
   * Insert a combat_event row. Returns { event: row }.
   */
  @Post('_test/combat/insert-event')
  async insertEvent(
    @Body() body: {
      playerId?: string;
      rivalKey?: string;
      type?: string;
      targetBlockId?: number;
    },
  ): Promise<{ event: unknown }> {
    const { playerId, rivalKey, type, targetBlockId } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKey || !VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(
        `rivalKey '${rivalKey}' is not a valid RivalKey`,
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!type || !VALID_COMBAT_EVENT_TYPES.has(type)) {
      throw new HttpException(
        `type '${type}' must be assault|hold|degrade_register`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const event = await this.combatRepo.insertCombatEvent({
      player_id:                playerId,
      type:                     type as CombatEventType,
      target_rival_key:         rivalKey,
      target_block_id:          targetBlockId ?? null,
      target_register_id:       null,
      lieutenant_id:            null,
      friction_consumed_bucket: null,
      outcome_bucket:           null,
      heat_increment_bucket:    null,
      created_at_minute:        0, // test helper default — no game-minute context
    });
    return { event };
  }

  /**
   * GET /v1/_test/combat/read-rival-combat-cols?playerId=&rivalKey=
   *
   * Reads the 5 B-owned combat columns from rival_state (OQ-B2 read-back probe).
   * Returns { cols: { active_link_fraction, operational_graph_node_count,
   *                   partition_state, cumulative_pressure_index, resource_pressure } | null }.
   * SERVER-ONLY (P6 — raw scalars are hidden from client).
   */
  @Get('_test/combat/read-rival-combat-cols')
  async readRivalCombatCols(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKeyParam: string,
  ): Promise<{ cols: unknown }> {
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKeyParam || !VALID_RIVAL_KEYS.has(rivalKeyParam)) {
      throw new HttpException(
        `rivalKey '${rivalKeyParam}' is not a valid RivalKey`,
        HttpStatus.BAD_REQUEST,
      );
    }
    // Direct select of the 5 B-owned columns.
    const rows = await this.db
      .select({
        active_link_fraction:         rivalState.active_link_fraction,
        operational_graph_node_count: rivalState.operational_graph_node_count,
        partition_state:              rivalState.partition_state,
        cumulative_pressure_index:    rivalState.cumulative_pressure_index,
        resource_pressure:            rivalState.resource_pressure,
      })
      .from(rivalState)
      .where(
        and(
          eq(rivalState.player_id, playerId),
          eq(rivalState.rival_key, rivalKeyParam as import('../rival/rival-ai.types').RivalKey),
        ),
      )
      .limit(1);
    return { cols: rows[0] ?? null };
  }

  // ─── C2: Tunables probe routes ────────────────────────────────────────────────────────────────

  /**
   * GET /v1/_test/combat/read-combat-tunables
   *
   * Returns all CombatTunables getter values keyed by camelCase getter name.
   * Used by the C2 E2E spec to assert frozen defaults (REAL getter output — not echoed literals).
   * Anti-fabrication: each value is read via TunablesStore (sourced from registry).
   * C4: no Math.random(), no Date.now().
   */
  @Get('_test/combat/read-combat-tunables')
  readCombatTunables(): Record<string, unknown> {
    const t = combatTunables;
    return {
      // §2.1 Percolation Break
      percolationThresholdBucket:                     t.percolationThresholdBucket,
      percolationNodeRebuildRatePerTick:              t.percolationNodeRebuildRatePerTick,
      percolationAssaultNodeRemovalPerHit:            t.percolationAssaultNodeRemovalPerHit,
      percolationEconomicAttritionEfficiencyPct:      t.percolationEconomicAttritionEfficiencyPct,
      percolationRecomputeIntervalGameHours:          t.percolationRecomputeIntervalGameHours,
      // §2.2 Friction Budget
      frictionBasePerActionUnit:                      t.frictionBasePerActionUnit,
      frictionComplexityMultiplier:                   t.frictionComplexityMultiplier,
      frictionToFailureBreakpointBucket:              t.frictionToFailureBreakpointBucket,
      frictionTenureReductionPerTier:                 t.frictionTenureReductionPerTier,
      // §2.3 Ephemeral Architecture
      ephemeralStatePersistenceWindowTicks:           t.ephemeralStatePersistenceWindowTicks,
      ephemeralLieutenantRecallLossAtWindowClosePct:  t.ephemeralLieutenantRecallLossAtWindowClosePct,
      ephemeralAuditTrailDisabledDuringEphemeral:     t.ephemeralAuditTrailDisabledDuringEphemeral,
      ephemeralOperationSetupCostMultiplier:          t.ephemeralOperationSetupCostMultiplier,
      // §2.4 Erosion Register
      erosionRegistersCount:                          t.erosionRegistersCount,
      erosionDominanceRegisterThreatWeight:           t.erosionDominanceRegisterThreatWeight,
      erosionVulnerableAxisRegimeShiftThresholdBucket: t.erosionVulnerableAxisRegimeShiftThresholdBucket,
      erosionRegisterIndependentDegradation:          t.erosionRegisterIndependentDegradation,
      // §2.5 Oxbow Severance
      oxbowSeveranceThresholdBucket:                  t.oxbowSeveranceThresholdBucket,
      oxbowHoldDurationTicks:                         t.oxbowHoldDurationTicks,
      oxbowOrphanDecayTicksToZeroCapacity:            t.oxbowOrphanDecayTicksToZeroCapacity,
      oxbowReintegrationCostPctOfZoneValue:           t.oxbowReintegrationCostPctOfZoneValue,
      // §2.6 Cumulative Attrition
      cpiCrossingThresholdBucket:                     t.cpiCrossingThresholdBucket,
      cpiResourcePressureDrainAboveThresholdPerTick:  t.cpiResourcePressureDrainAboveThresholdPerTick,
      cpiDecayRatePerTick:                            t.cpiDecayRatePerTick,
      cpiResistanceFloorBucket:                       t.cpiResistanceFloorBucket,
      cpiKRollingWindowTicks:                         t.cpiKRollingWindowTicks,
      // §5 Escalation
      sandpileCascadeThresholdBucket:                 t.sandpileCascadeThresholdBucket,
      sandpileCascadeSensitivityBucket:               t.sandpileCascadeSensitivityBucket,
      sandpileCascadePropagationProbabilityBucket:    t.sandpileCascadePropagationProbabilityBucket,
      sandpileGlobalDecayRatePerIdleTick:             t.sandpileGlobalDecayRatePerIdleTick,
      maladaptiveDepthPerConflict:                    t.maladaptiveDepthPerConflict,
      maladaptiveTensionIncrementPenaltyPerDepthPct:  t.maladaptiveTensionIncrementPenaltyPerDepthPct,
      maladaptiveHostileMemoryFloorBucket:            t.maladaptiveHostileMemoryFloorBucket,
      maladaptiveDepthDecayPerQuietTicks:             t.maladaptiveDepthDecayPerQuietTicks,
      resonanceThresholdBucket:                       t.resonanceThresholdBucket,
      resonanceAmplificationPerResonantCycleBucket:   t.resonanceAmplificationPerResonantCycleBucket,
      resonanceDesynchronizationDecayRatePerTick:     t.resonanceDesynchronizationDecayRatePerTick,
      oscillationExtractionThresholdForCollapseBucket: t.oscillationExtractionThresholdForCollapseBucket,
      oscillationYieldRecoveryRatePerTick:            t.oscillationYieldRecoveryRatePerTick,
      oscillationReInvasionThresholdBucket:           t.oscillationReInvasionThresholdBucket,
      oscillationCyclePeriodEstimateTicks:            t.oscillationCyclePeriodEstimateTicks,
      // §6 De-escalation
      familiarityAccrualRatePerTick:                  t.familiarityAccrualRatePerTick,
      familiarityThresholdForDiscountBucket:          t.familiarityThresholdForDiscountBucket,
      familiarityIntrusionReductionAtMaxBucket:       t.familiarityIntrusionReductionAtMaxBucket,
      familiarityVacuumFillVolatilityMultiplierBucket: t.familiarityVacuumFillVolatilityMultiplierBucket,
      downstreamRegimeTransitionThresholdBucket:      t.downstreamRegimeTransitionThresholdBucket,
      downstreamStandingModeAggressionSuppressionBucket: t.downstreamStandingModeAggressionSuppressionBucket,
      downstreamClearDecayPerTick:                    t.downstreamClearDecayPerTick,
      // §7 Retaliation
      deadHandTriggerThresholdTarcumBucket:           t.deadHandTriggerThresholdTarcumBucket,
      deadHandTriggerThresholdCoilBucket:             t.deadHandTriggerThresholdCoilBucket,
      deadHandTriggerThresholdIronThroatBucket:       t.deadHandTriggerThresholdIronThroatBucket,
      deadHandReserveFractionBucket:                  t.deadHandReserveFractionBucket,
      deadHandCacheRefreshTicks:                      t.deadHandCacheRefreshTicks,
      intelligenceCacheDetectionProbabilityPerIntelActionBucket: t.intelligenceCacheDetectionProbabilityPerIntelActionBucket,
      // §9 Interlock
      patternIntelLeakageOnEliminationBucket:         t.patternIntelLeakageOnEliminationBucket,
      cascadeAtomicTransactionTimeoutMs:              t.cascadeAtomicTransactionTimeoutMs,
      eliminationCompoundingPenaltyAggregateBucket:   t.eliminationCompoundingPenaltyAggregateBucket,
      // NEW [PROV-Y26Q2] seed prefixes
      sandpileCascadeSeedPrefix:                      t.sandpileCascadeSeedPrefix,
      deadHandDetectionSeedPrefix:                    t.deadHandDetectionSeedPrefix,
      // NEW [PROV-Y26Q2] Saltline Dead-Hand trigger
      deadHandTriggerThresholdSaltlineBucket:         t.deadHandTriggerThresholdSaltlineBucket,
    };
  }

  /**
   * GET /v1/_test/combat/divergence-outcome
   *
   * Query: ?frictionBand=<low|medium|high>&actionType=<assault|hold|degrade_register>
   * Returns: { outcome: CombatOutcomeBucket }
   *
   * Calls combatTunables.getDivergenceOutcome (pure registry lookup — DD-DIVERGENCE-TABLE).
   * FALSIFIABLE: if the table is not wired, the route returns 404.
   * C4: no Math.random(), no Date.now().
   */
  @Get('_test/combat/divergence-outcome')
  getDivergenceOutcome(
    @Query('frictionBand') frictionBand: string,
    @Query('actionType') actionType: string,
  ): { outcome: string } {
    if (!frictionBand || frictionBand.length === 0) {
      throw new HttpException('frictionBand is required', HttpStatus.BAD_REQUEST);
    }
    if (!actionType || actionType.length === 0) {
      throw new HttpException('actionType is required', HttpStatus.BAD_REQUEST);
    }
    const outcome = combatTunables.getDivergenceOutcome(frictionBand, actionType);
    return { outcome };
  }

  /**
   * POST /v1/_test/combat/probe-combat-clamp
   *
   * Body: { key: string, value: number }
   * Returns: { clamped: number }
   *
   * Applies COMBAT_TUNABLE_CAPS.clampCombatToRange(key, value) and returns the result.
   * FALSIFIABLE: posting { key: 'combat.oxbow_hold_duration_ticks', value: 9999 }
   * returns { clamped: 8 } because the range cap is 8 (not 9999).
   * C4: no Math.random(), no Date.now().
   */
  @Post('_test/combat/probe-combat-clamp')
  probeCombatClamp(@Body() body: { key?: string; value?: number }): { clamped: number } {
    const key = body?.key;
    const value = body?.value;
    if (typeof key !== 'string' || key.length === 0) {
      throw new HttpException('key is required', HttpStatus.BAD_REQUEST);
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new HttpException('value must be a finite number', HttpStatus.BAD_REQUEST);
    }
    const clamped = clampCombatToRange(key, value);
    return { clamped };
  }

  // ─── C3 DD-MUSCLE-P4-LEGIBLE: assault probe routes ──────────────────────────────────────────

  /**
   * POST /v1/_test/combat/request-assault
   *
   * C3 DD-MUSCLE P4 probe: thin probe of CombatService.requestAssault's UNCONDITIONAL schedule
   * (DD-MUSCLE-P4-LEGIBLE §8.1.6). After the fix, requestAssault schedules unconditionally when
   * a rival_state row exists — no band gate. This route verifies the schedule path (ACCEPT) and
   * the structural precondition guard (no_rival_state case).
   *
   * Body: { playerId, rivalKey, lieutenantId, targetHoldingId?, gameMinute? }
   * Returns: { scheduled: boolean, reason?: string, eventId?: string }
   *
   * NOT the refuse legibility vehicle — use /v1/_test/combat/resolve-refuse-ref for P4 refuse.
   * SERVER-ONLY (test-gated). No Math.random(). No Date.now(). `gameMinute` defaults to 0 like
   * every other `gameMinute?: number` probe in this file (W6.1 C7: `requestAssault` itself no
   * longer defaults it — the file's own `gameMinute ?? 0` convention supplies it here instead).
   */
  @Post('_test/combat/request-assault')
  @HttpCode(HttpStatus.OK)
  async requestAssaultProbe(
    @Body() body: {
      playerId?: string;
      rivalKey?: string;
      lieutenantId?: string;
      targetHoldingId?: string;
      gameMinute?: number;
    },
  ): Promise<{ scheduled: boolean; reason?: string; eventId?: string }> {
    const { playerId, rivalKey, lieutenantId, targetHoldingId, gameMinute } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKey || !VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(
        `rivalKey '${rivalKey}' is not a valid RivalKey`,
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!lieutenantId) throw new HttpException('lieutenantId is required', HttpStatus.BAD_REQUEST);

    const result = await this.combatService.requestAssault(
      playerId,
      rivalKey as RivalKey,
      lieutenantId,
      gameMinute ?? 0,
      targetHoldingId,
    );

    if (result.scheduled) {
      return { scheduled: true, eventId: result.eventId };
    } else {
      return { scheduled: false, reason: result.reason };
    }
  }

  /**
   * POST /v1/_test/combat/resolve-refuse-ref
   *
   * C3 DD-MUSCLE-P4-LEGIBLE §8.1.4 / §8.1.6 — the P4 legibility probe route.
   *
   * Re-resolves the MUSCLE lieutenant's behavior script through the REAL DSL executor against
   * a fresh snapshot (the same band read as the tick's buildSnapshot) to surface WHY the
   * lieutenant is NOT assaulting this tick — the `script_rule_that_blocked` ScriptRuleRef.
   *
   * Body: { playerId, lieutenantId }
   * Returns:
   *   { wouldAssault: true }  — the script resolves to EXECUTE_DEFAULT (would assault)
   *   { wouldAssault: false; script_rule_that_blocked: { ruleIndex: number } }  — a blocking rule
   *   { wouldAssault: false; script_rule_that_blocked: { kind: 'no_matching_rule' } }  — no match
   *
   * The `script_rule_that_blocked` is ALWAYS derived from the player's real script through the
   * REAL executor — never a hardcoded literal. Deterministic: same script + same band state →
   * same result. SERVER-ONLY (test-gated). No Math.random(). No Date.now().
   *
   * P6: reads regime_pressure_band server↔server (not returned to client — only the ScriptRuleRef
   * is returned, which is an index/sentinel, not a raw pressure float).
   */
  @Post('_test/combat/resolve-refuse-ref')
  @HttpCode(HttpStatus.OK)
  async resolveRefuseRefProbe(
    @Body() body: {
      playerId?: string;
      lieutenantId?: string;
    },
  ): Promise<
    | { wouldAssault: true }
    | { wouldAssault: false; script_rule_that_blocked: ScriptRuleRef }
  > {
    const { playerId, lieutenantId } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!lieutenantId) throw new HttpException('lieutenantId is required', HttpStatus.BAD_REQUEST);

    // Load the lieutenant's compiled behavior script (behavior_script.rules — the compiled IR jsonb).
    const ltRows = await this.db
      .select({
        rules: behaviorScript.rules,
      })
      .from(lieutenant)
      .innerJoin(behaviorScript, eq(lieutenant.behavior_script_id, behaviorScript.script_id))
      .where(eq(lieutenant.lieutenant_id, lieutenantId))
      .limit(1);

    if (ltRows.length === 0) {
      throw new HttpException(
        `lieutenant '${lieutenantId}' not found or has no behavior_script`,
        HttpStatus.NOT_FOUND,
      );
    }

    const compiledScript = ltRows[0]!.rules as unknown as CompiledScript;

    // Build a fresh snapshot: resolve the regime_pressure_band from A's §13 method (server↔server,
    // P6 safe). Use the default rival key (PROV-Y26Q2: 'tarcum').
    const MUSCLE_DEFAULT_RIVAL: RivalKey = 'tarcum';
    const state: Record<string, number | boolean | string> = {};

    const regimeBand = await this.regimeSwitching.getRegimePressureBand(playerId, MUSCLE_DEFAULT_RIVAL);
    if (regimeBand !== null) {
      state.regime_pressure_band = regimeBand;
    }
    // [C5-DEP] percolation_band stub (mirrors muscle-binding.ts buildSnapshot).
    state.percolation_band = 'standard';

    const snapshot = { state, events: {} };

    // Re-resolve through the REAL executor — NOT a hardcoded literal.
    const result = this.executor.resolveToScriptRuleRef(compiledScript, snapshot);

    if (result.wouldAssault) {
      return { wouldAssault: true };
    }
    return { wouldAssault: false, script_rule_that_blocked: result.ref };
  }

  // ─── Mutation probe routes ────────────────────────────────────────────────────────────────────

  /**
   * POST /v1/_test/combat/write-rival-combat-cols
   *
   * Body: { playerId, rivalKey, activeLinkFraction?, operationalGraphNodeCount?,
   *         partitionState?, cumulativePressureIndex?, resourcePressure? }
   * Writes the 5 B-owned columns on rival_state (OQ-B2 write path).
   * Returns { written: true }.
   */
  @Post('_test/combat/write-rival-combat-cols')
  async writeRivalCombatCols(
    @Body() body: {
      playerId?: string;
      rivalKey?: string;
      activeLinkFraction?: number | null;
      operationalGraphNodeCount?: number | null;
      partitionState?: string | null;
      cumulativePressureIndex?: number | null;
      resourcePressure?: number | null;
    },
  ): Promise<{ written: true }> {
    const {
      playerId,
      rivalKey,
      activeLinkFraction,
      operationalGraphNodeCount,
      partitionState,
      cumulativePressureIndex,
      resourcePressure,
    } = body ?? {};

    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKey || !VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(
        `rivalKey '${rivalKey}' is not a valid RivalKey`,
        HttpStatus.BAD_REQUEST,
      );
    }
    if (
      partitionState !== undefined &&
      partitionState !== null &&
      !VALID_PARTITION_STATES.has(partitionState)
    ) {
      throw new HttpException(
        `partitionState '${partitionState}' must be integrated|fragmented`,
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.combatRepo.writeRivalCombatCols(
      playerId,
      rivalKey as RivalKey,
      {
        active_link_fraction:         activeLinkFraction ?? null,
        operational_graph_node_count: operationalGraphNodeCount ?? null,
        partition_state:              (partitionState as PartitionState | null | undefined) ?? null,
        cumulative_pressure_index:    cumulativePressureIndex ?? null,
        resource_pressure:            resourcePressure ?? null,
      },
    );
    return { written: true };
  }

  // ─── C4: Friction Budget probe routes ────────────────────────────────────────────────────────

  /**
   * POST /v1/_test/combat/set-base-friction-load
   *
   * Body: { playerId, rivalKey, planActionCount }
   * Sets base_friction_load from plan action count (server-only, test isolation).
   * Returns { band: string }.
   * C4: no Math.random, no Date.now.
   */
  @Post('_test/combat/set-base-friction-load')
  @HttpCode(HttpStatus.OK)
  async setBaseFrictionLoad(
    @Body() body: { playerId?: string; rivalKey?: string; planActionCount?: number },
  ): Promise<{ band: string }> {
    const { playerId, rivalKey, planActionCount } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKey || !VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`rivalKey '${rivalKey}' is not valid`, HttpStatus.BAD_REQUEST);
    }
    if (typeof planActionCount !== 'number' || !Number.isFinite(planActionCount) || planActionCount < 1) {
      throw new HttpException('planActionCount must be a positive integer', HttpStatus.BAD_REQUEST);
    }
    await this.frictionBudget.setBaseFrictionLoad(playerId, rivalKey as RivalKey, planActionCount);
    const band = await this.frictionBudget.computeFrictionLoad(playerId, rivalKey as RivalKey);
    return { band };
  }

  /**
   * POST /v1/_test/combat/commit-action-with-friction
   *
   * Body: { playerId, rivalKey, actionType, gameMinute }
   * Accrues shared_friction_pool and returns { poolBand, outcome }.
   * C4: no Math.random, no Date.now.
   */
  @Post('_test/combat/commit-action-with-friction')
  @HttpCode(HttpStatus.OK)
  async commitActionWithFriction(
    @Body() body: {
      playerId?: string;
      rivalKey?: string;
      actionType?: string;
      gameMinute?: number;
    },
  ): Promise<{ poolBand: string; outcome: string }> {
    const { playerId, rivalKey, actionType, gameMinute } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKey || !VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`rivalKey '${rivalKey}' is not valid`, HttpStatus.BAD_REQUEST);
    }
    if (!actionType || !VALID_COMBAT_EVENT_TYPES.has(actionType)) {
      throw new HttpException(`actionType '${actionType}' must be assault|hold|degrade_register`, HttpStatus.BAD_REQUEST);
    }
    const minute = typeof gameMinute === 'number' ? gameMinute : 0;
    const result = await this.frictionBudget.commitActionWithFriction(
      playerId,
      rivalKey as RivalKey,
      actionType as CombatEventType,
      minute,
    );
    return { poolBand: result.poolBand, outcome: result.outcome };
  }

  /**
   * GET /v1/_test/combat/lookup-divergence
   *
   * Query: ?frictionBand=<low|medium|high>&actionType=<assault|hold|degrade_register>
   * Returns { outcome: CombatOutcomeBucket } — pure registry lookup.
   * C4: deterministic (same input → same output). NO Math.random.
   */
  @Get('_test/combat/lookup-divergence')
  lookupDivergence(
    @Query('frictionBand') frictionBand: string,
    @Query('actionType') actionType: string,
  ): { outcome: string } {
    if (!frictionBand) throw new HttpException('frictionBand is required', HttpStatus.BAD_REQUEST);
    if (!actionType || !VALID_COMBAT_EVENT_TYPES.has(actionType)) {
      throw new HttpException(`actionType '${actionType}' must be assault|hold|degrade_register`, HttpStatus.BAD_REQUEST);
    }
    const validBands: ReadonlySet<string> = new Set(['low', 'medium', 'high']);
    if (!validBands.has(frictionBand)) {
      throw new HttpException(`frictionBand '${frictionBand}' must be low|medium|high`, HttpStatus.BAD_REQUEST);
    }
    const outcome = this.frictionBudget.lookupDivergence(frictionBand as import('./combat.types').FrictionBand, actionType as CombatEventType);
    return { outcome };
  }

  // ─── C5: Percolation Break + Erosion Register probe routes ──────────────────────────────────

  /**
   * POST /v1/_test/combat/drive-assault
   *
   * Body: { playerId, rivalKey, targetBlockId, gameMinute }
   * Drives the SAME PercolationService.applyAssault production method (lesson #3 — test calls
   * the SAME per-entity method production calls, NOT a parallel implementation).
   * Resolves districtId from the rival_holding block → district join.
   * Returns { assaultEventId: string }.
   * C5: no Math.random, no Date.now.
   */
  @Post('_test/combat/drive-assault')
  @HttpCode(HttpStatus.OK)
  async driveAssault(
    @Body() body: { playerId?: string; rivalKey?: string; targetBlockId?: number; gameMinute?: number },
  ): Promise<{ assaultEventId: string }> {
    const { playerId, rivalKey, targetBlockId, gameMinute } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKey || !VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`rivalKey '${rivalKey}' is not valid`, HttpStatus.BAD_REQUEST);
    }
    if (typeof targetBlockId !== 'number' || !Number.isFinite(targetBlockId)) {
      throw new HttpException('targetBlockId must be a finite integer', HttpStatus.BAD_REQUEST);
    }
    const minute = typeof gameMinute === 'number' ? gameMinute : 0;

    // Resolve districtId from the rival_holding row (or the player's building on the target block).
    // Primary: read from rival_holding (seeded by the test).
    // Fallback: read from buildings table (if building on block exists).
    // If neither: use districtId=1 as a safe default for test isolation.
    let districtId = 1;
    try {
      const { rivalHolding } = await import('../../../db/schema/conflict_rival');
      const holdingRows = await this.db
        .select({ district_id: rivalHolding.district_id })
        .from(rivalHolding)
        .where(
          and(
            eq(rivalHolding.player_id, playerId),
            eq(rivalHolding.rival_key, rivalKey as import('../rival/rival-ai.types').RivalKey),
            eq(rivalHolding.block_id, targetBlockId),
          ),
        )
        .limit(1);
      if (holdingRows.length > 0 && holdingRows[0]!.district_id) {
        districtId = holdingRows[0]!.district_id;
      }
    } catch {
      // Fallback to districtId=1 (safe default for test isolation).
    }

    const event = await this.percolation.applyAssault(
      playerId,
      rivalKey as import('../rival/rival-ai.types').RivalKey,
      targetBlockId,
      districtId,
      minute,
    );
    return { assaultEventId: event.id };
  }

  /**
   * POST /v1/_test/combat/get-active-link-band
   *
   * Body: { playerId, rivalKey }
   * Returns { band: string } — the qualitative ActiveLinkBand (P6 — raw scalars NOT in response).
   * C5: no Math.random, no Date.now.
   */
  @Post('_test/combat/get-active-link-band')
  @HttpCode(HttpStatus.OK)
  async getActiveLinkBand(
    @Body() body: { playerId?: string; rivalKey?: string },
  ): Promise<{ band: string }> {
    const { playerId, rivalKey } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKey || !VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`rivalKey '${rivalKey}' is not valid`, HttpStatus.BAD_REQUEST);
    }
    return this.percolation.getActiveLinkBand(
      playerId,
      rivalKey as import('../rival/rival-ai.types').RivalKey,
    );
  }

  /**
   * POST /v1/_test/combat/drive-degrade
   *
   * Body: { playerId, rivalKey, registerId, gameMinute }
   * Drives the SAME ErosionRegisterService.degradeRegister production method (lesson #3).
   * Returns { degraded: true }.
   * C5: no Math.random, no Date.now.
   */
  @Post('_test/combat/drive-degrade')
  @HttpCode(HttpStatus.OK)
  async driveDegrade(
    @Body() body: { playerId?: string; rivalKey?: string; registerId?: string; gameMinute?: number },
  ): Promise<{ degraded: true }> {
    const { playerId, rivalKey, registerId, gameMinute } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKey || !VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`rivalKey '${rivalKey}' is not valid`, HttpStatus.BAD_REQUEST);
    }
    if (!registerId || !VALID_EROSION_REGISTER_IDS.has(registerId)) {
      throw new HttpException(
        `registerId '${registerId}' must be one of: muscle|finance|intel|infrastructure|leadership`,
        HttpStatus.BAD_REQUEST,
      );
    }
    const minute = typeof gameMinute === 'number' ? gameMinute : 0;
    await this.erosionRegister.degradeRegister(
      playerId,
      rivalKey as import('../rival/rival-ai.types').RivalKey,
      registerId as ErosionRegisterId,
      minute,
    );
    return { degraded: true };
  }

  /**
   * POST /v1/_test/combat/get-registers
   *
   * Body: { playerId, rivalKey }
   * Returns { registers: [{ registerId, current_value_bucket }, ...] }.
   * P6 strip: dominance_rank + vulnerable_axis are NEVER in the response (the P6 wall).
   * C5: no Math.random, no Date.now.
   */
  @Post('_test/combat/get-registers')
  @HttpCode(HttpStatus.OK)
  async getRegisters(
    @Body() body: { playerId?: string; rivalKey?: string },
  ): Promise<{ registers: Array<{ registerId: string; current_value_bucket: string }> }> {
    const { playerId, rivalKey } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKey || !VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`rivalKey '${rivalKey}' is not valid`, HttpStatus.BAD_REQUEST);
    }
    return this.erosionRegister.getRegisters(
      playerId,
      rivalKey as import('../rival/rival-ai.types').RivalKey,
    );
  }

  // ─── C6 Ephemeral Architecture routes ─────────────────────────────────────────────────────────

  /**
   * POST /v1/_test/combat/drive-set-ephemeral-mode
   * Body: { playerId: string, operationId: string, ephemeral: boolean }
   *
   * C6 DD-EPHEMERAL-REUSE: drives setOperationEphemeralMode — the SAME per-entity method
   * the scheduler calls (lesson #3 — live-vs-test convergence, no parallel code path).
   * Returns { operationId, ephemeral }.
   *
   * W6a C6 (F-C6-3) — `playerId` is now a required body field: `setOperationEphemeralMode` is
   * joint-scoped (operation_id, player_id) and throws `ApiError('RESOURCE_NOT_FOUND')` (404) for
   * an operation owned by someone else — propagated here unchanged (no try/catch, same idiom as
   * `forensic-test.controller.ts#recordReceipt`).
   */
  @Post('_test/combat/drive-set-ephemeral-mode')
  @HttpCode(HttpStatus.OK)
  async driveSetEphemeralMode(
    @Body() body: Record<string, unknown>,
  ): Promise<{ operationId: string; ephemeral: boolean }> {
    const { playerId, operationId, ephemeral } = body ?? {};
    if (!playerId || typeof playerId !== 'string') {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    if (!operationId || typeof operationId !== 'string') {
      throw new HttpException('operationId is required', HttpStatus.BAD_REQUEST);
    }
    if (typeof ephemeral !== 'boolean') {
      throw new HttpException('ephemeral (boolean) is required', HttpStatus.BAD_REQUEST);
    }
    // ★ Lesson #3: drives the SAME production method — no parallel implementation.
    await this.ephemeralOperation.setOperationEphemeralMode(playerId, operationId, ephemeral);
    return { operationId, ephemeral };
  }

  /**
   * POST /v1/_test/combat/drive-purge-ephemeral
   * Body: { playerId: string, rivalKey: string }
   *
   * C6 DIV-E1 scope probe: drives clearStateOlderThanWindow — the SAME method the
   * COMBAT_DAILY_TICK would call. Purges the PLAYER's combat_event trail (scoped to the
   * player × rival) if the operation is in ephemeral_mode.
   *
   * NEVER deletes precinct_memory, boss_mirror_declaration_ledger, or adversary-memory rows.
   * Returns { deletedCount }.
   */
  @Post('_test/combat/drive-purge-ephemeral')
  @HttpCode(HttpStatus.OK)
  async drivePurgeEphemeral(
    @Body() body: Record<string, unknown>,
  ): Promise<{ deletedCount: number }> {
    const { playerId, rivalKey: rivalKeyParam } = body ?? {};
    if (!playerId || typeof playerId !== 'string') {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    if (!rivalKeyParam || !VALID_RIVAL_KEYS.has(rivalKeyParam as string)) {
      throw new HttpException(`rivalKey '${rivalKeyParam}' is not valid`, HttpStatus.BAD_REQUEST);
    }
    const deletedCount = await this.ephemeralOperation.clearStateOlderThanWindow(
      playerId,
      rivalKeyParam as RivalKey,
    );
    return { deletedCount };
  }

  /**
   * POST /v1/_test/combat/drive-detect-neck-zones
   * Body: { playerId: string, rivalKey: string }
   *
   * C6 DD-OXBOW-ZONE: drives detectNeckZones — the SAME method the production path calls
   * (lesson #3). Returns { neckZones: number[] } — the block_ids of neck (articulation point)
   * zones in the rival's holding graph.
   */
  @Post('_test/combat/drive-detect-neck-zones')
  @HttpCode(HttpStatus.OK)
  async driveDetectNeckZones(
    @Body() body: Record<string, unknown>,
  ): Promise<{ neckZones: number[] }> {
    const { playerId, rivalKey: rivalKeyParam } = body ?? {};
    if (!playerId || typeof playerId !== 'string') {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    if (!rivalKeyParam || !VALID_RIVAL_KEYS.has(rivalKeyParam as string)) {
      throw new HttpException(`rivalKey '${rivalKeyParam}' is not valid`, HttpStatus.BAD_REQUEST);
    }
    const neckZones = await this.oxbowSeverance.detectNeckZones(
      playerId,
      rivalKeyParam as RivalKey,
    );
    return { neckZones };
  }

  /**
   * POST /v1/_test/combat/drive-apply-hold
   * Body: { playerId: string, rivalKey: string, zoneId: number, lieutenantId: string, gameMinute: number }
   *
   * C6 DD-OXBOW-ZONE: drives applyHoldAction — the SAME method the production path calls
   * (lesson #3). Inserts a combat_event 'hold' for the neck zone.
   */
  @Post('_test/combat/drive-apply-hold')
  @HttpCode(HttpStatus.OK)
  async driveApplyHold(
    @Body() body: Record<string, unknown>,
  ): Promise<{ held: true; zoneId: number }> {
    const { playerId, rivalKey: rivalKeyParam, zoneId, lieutenantId, gameMinute } = body ?? {};
    if (!playerId || typeof playerId !== 'string') {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    if (!rivalKeyParam || !VALID_RIVAL_KEYS.has(rivalKeyParam as string)) {
      throw new HttpException(`rivalKey '${rivalKeyParam}' is not valid`, HttpStatus.BAD_REQUEST);
    }
    if (typeof zoneId !== 'number') {
      throw new HttpException('zoneId (number) is required', HttpStatus.BAD_REQUEST);
    }
    if (!lieutenantId || typeof lieutenantId !== 'string') {
      throw new HttpException('lieutenantId is required', HttpStatus.BAD_REQUEST);
    }
    const gm = typeof gameMinute === 'number' ? gameMinute : 0;
    await this.oxbowSeverance.applyHoldAction(
      playerId,
      rivalKeyParam as RivalKey,
      zoneId,
      lieutenantId,
      gm,
    );
    return { held: true, zoneId };
  }

  /**
   * POST /v1/_test/combat/drive-reclassify-orphan
   * Body: { playerId: string, rivalKey: string, zoneIds: number[] }
   *
   * C6 DD-OXBOW-ZONE: drives reclassifySalientAsOrphan — the SAME method the production
   * path calls (lesson #3). Sets is_orphan=true on the given rival_holding rows.
   */
  @Post('_test/combat/drive-reclassify-orphan')
  @HttpCode(HttpStatus.OK)
  async driveReclassifyOrphan(
    @Body() body: Record<string, unknown>,
  ): Promise<{ orphaned: number[] }> {
    const { playerId, rivalKey: rivalKeyParam, zoneIds } = body ?? {};
    if (!playerId || typeof playerId !== 'string') {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    if (!rivalKeyParam || !VALID_RIVAL_KEYS.has(rivalKeyParam as string)) {
      throw new HttpException(`rivalKey '${rivalKeyParam}' is not valid`, HttpStatus.BAD_REQUEST);
    }
    if (!Array.isArray(zoneIds) || zoneIds.some((z) => typeof z !== 'number')) {
      throw new HttpException('zoneIds (number[]) is required', HttpStatus.BAD_REQUEST);
    }
    await this.oxbowSeverance.reclassifySalientAsOrphan(
      playerId,
      rivalKeyParam as RivalKey,
      zoneIds as number[],
    );
    return { orphaned: zoneIds as number[] };
  }

  /**
   * GET /v1/_test/combat/read-rival-holding?playerId=&rivalKey=&blockId=
   *
   * C6 test helper: read a specific rival_holding row (used to assert is_orphan flag).
   * Returns the row or null.
   */
  @Get('_test/combat/read-rival-holding')
  async readRivalHolding(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKeyParam: string,
    @Query('blockId') blockIdParam: string,
  ): Promise<{ holding: { player_id: string; rival_key: string; block_id: number; district_id: number; is_orphan: boolean } | null }> {
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKeyParam || !VALID_RIVAL_KEYS.has(rivalKeyParam)) {
      throw new HttpException(`rivalKey '${rivalKeyParam}' is not valid`, HttpStatus.BAD_REQUEST);
    }
    const blockId = parseInt(blockIdParam, 10);
    if (isNaN(blockId)) throw new HttpException('blockId (number) is required', HttpStatus.BAD_REQUEST);
    const rivalKey = rivalKeyParam as RivalKey;
    const rows = await this.db
      .select()
      .from(rivalHolding)
      .where(
        and(
          eq(rivalHolding.player_id, playerId),
          eq(rivalHolding.rival_key, rivalKey),
          eq(rivalHolding.block_id, blockId),
        ),
      )
      .limit(1);
    return { holding: (rows[0] ?? null) as typeof rows[0] | null };
  }

  // ─── C7 DD-DEADHAND-FIRE: Dead Hand Cache probe routes ───────────────────────────────────────

  /**
   * POST /v1/_test/combat/drive-dead-hand-refresh
   *
   * Body: { playerId, rivalKey, gameDay }
   * Drives `DeadHandCacheService.refreshCache` — the SAME production method.
   * Returns { refreshed: true }.
   *
   * ★ Lesson #3: drives the SAME production method (no test-only logic duplicated).
   * C4: no Math.random(), no Date.now(). Pure deterministic script ref.
   */
  @Post('_test/combat/drive-dead-hand-refresh')
  @HttpCode(HttpStatus.OK)
  async driveDeadHandRefresh(
    @Body() body: { playerId?: string; rivalKey?: string; gameDay?: number },
  ): Promise<{ refreshed: true }> {
    const { playerId, rivalKey, gameDay } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKey || !VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`rivalKey '${rivalKey}' is not a valid RivalKey`, HttpStatus.BAD_REQUEST);
    }
    if (typeof gameDay !== 'number' || !Number.isFinite(gameDay)) {
      throw new HttpException('gameDay (number) is required', HttpStatus.BAD_REQUEST);
    }
    return this.deadHandCache.refreshCache(playerId, rivalKey as RivalKey, gameDay);
  }

  /**
   * POST /v1/_test/combat/seed-dead-hand-reserve
   *
   * Body: { playerId, rivalKey, reserve, triggerThreshold, cacheScriptRef? }
   * Seeds the dead_hand_cache_state row with a specific reserve + trigger_threshold.
   * Used to set up above-threshold / below-threshold states for the falsifiable (b) tests.
   * Returns { seeded: true }.
   *
   * C4: no Math.random(), no Date.now(). Pure CRUD.
   * P6 SERVER-ONLY: this route exists only in the test controller (gated by testControllersEnabled).
   */
  @Post('_test/combat/seed-dead-hand-reserve')
  @HttpCode(HttpStatus.OK)
  async seedDeadHandReserve(
    @Body() body: {
      playerId?: string;
      rivalKey?: string;
      reserve?: number;
      triggerThreshold?: number;
      cacheScriptRef?: string;
    },
  ): Promise<{ seeded: true }> {
    const { playerId, rivalKey, reserve, triggerThreshold, cacheScriptRef } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKey || !VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`rivalKey '${rivalKey}' is not a valid RivalKey`, HttpStatus.BAD_REQUEST);
    }
    if (typeof reserve !== 'number' || !Number.isFinite(reserve)) {
      throw new HttpException('reserve (number) is required', HttpStatus.BAD_REQUEST);
    }
    if (typeof triggerThreshold !== 'number' || !Number.isFinite(triggerThreshold)) {
      throw new HttpException('triggerThreshold (number) is required', HttpStatus.BAD_REQUEST);
    }

    await this.combatRepo.upsertDeadHand(playerId, rivalKey as RivalKey, {
      dead_hand_reserve:  reserve,
      trigger_threshold:  triggerThreshold,
      ...(cacheScriptRef !== undefined ? { cache_script_ref: cacheScriptRef } : {}),
    });

    return { seeded: true };
  }

  /**
   * POST /v1/_test/combat/drive-dead-hand-check-trigger
   *
   * Body: { playerId, rivalKey, gameDay }
   * Drives `DeadHandCacheService.checkTriggerCondition` — the SAME production method.
   * Returns { fired: boolean, thresholdRef: number, currentReserve: number }.
   *
   * ★ Lesson #3: drives the SAME production method.
   * C4: no Math.random(), no Date.now(). The fire is a DETERMINISTIC threshold compare
   * (canon `:40` — "fires automatically"). No detection draw (that belongs to the intel path).
   */
  @Post('_test/combat/drive-dead-hand-check-trigger')
  @HttpCode(HttpStatus.OK)
  async driveDeadHandCheckTrigger(
    @Body() body: { playerId?: string; rivalKey?: string; gameDay?: number },
  ): Promise<{ fired: boolean; thresholdRef: number; currentReserve: number }> {
    const { playerId, rivalKey, gameDay } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKey || !VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`rivalKey '${rivalKey}' is not a valid RivalKey`, HttpStatus.BAD_REQUEST);
    }
    if (typeof gameDay !== 'number' || !Number.isFinite(gameDay)) {
      throw new HttpException('gameDay (number) is required', HttpStatus.BAD_REQUEST);
    }
    return this.deadHandCache.checkTriggerCondition(playerId, rivalKey as RivalKey, gameDay);
  }

  /**
   * POST /v1/_test/combat/drive-dead-hand-fire
   *
   * Body: { playerId, rivalKey, gameDay }
   * Drives `DeadHandCacheService.fireCache` — the SAME production method.
   * Returns { fired: boolean, scriptRef: string, eventEmitted: boolean }.
   *
   * ★ Lesson #3: drives the SAME production method.
   * C4: no Math.random(), no Date.now(). The script is pre-committed (not a runtime decision).
   */
  @Post('_test/combat/drive-dead-hand-fire')
  @HttpCode(HttpStatus.OK)
  async driveDeadHandFire(
    @Body() body: { playerId?: string; rivalKey?: string; gameDay?: number },
  ): Promise<{ fired: boolean; scriptRef: string; eventEmitted: boolean }> {
    const { playerId, rivalKey, gameDay } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKey || !VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`rivalKey '${rivalKey}' is not a valid RivalKey`, HttpStatus.BAD_REQUEST);
    }
    if (typeof gameDay !== 'number' || !Number.isFinite(gameDay)) {
      throw new HttpException('gameDay (number) is required', HttpStatus.BAD_REQUEST);
    }
    return this.deadHandCache.fireCache(playerId, rivalKey as RivalKey, gameDay);
  }

  /**
   * POST /v1/_test/combat/drive-dead-hand-intel-discovery
   *
   * Body: { playerId, rivalKey, gameDay, actionSeed, overrideProbability? }
   * Drives `DeadHandCacheService.applyIntelligenceDiscovery` — the SAME production method.
   * Returns { intelligenceRevealed: boolean }.
   *
   * ★ Lesson #3: drives the SAME production method.
   * P5-partial: reveals intelligence_revealed=true only if the seeded draw succeeds
   *   against the `:58` detection probability — presence only, NOT target/content.
   * C4: no Math.random(), no Date.now(). The draw is seeded (makeRng — deterministic).
   *
   * `overrideProbability` (optional, 0..1): TEST-ONLY shortcut to force high/low probability
   *   without overriding the registry tunable. Pass 1.0 to guarantee reveal; 0.0 to guarantee
   *   no-reveal. Production callers MUST NOT pass this field (it will be undefined → getter path).
   */
  @Post('_test/combat/drive-dead-hand-intel-discovery')
  @HttpCode(HttpStatus.OK)
  async driveDeadHandIntelDiscovery(
    @Body() body: { playerId?: string; rivalKey?: string; gameDay?: number; actionSeed?: string; overrideProbability?: number },
  ): Promise<{ intelligenceRevealed: boolean }> {
    const { playerId, rivalKey, gameDay, actionSeed, overrideProbability } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKey || !VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`rivalKey '${rivalKey}' is not a valid RivalKey`, HttpStatus.BAD_REQUEST);
    }
    if (typeof gameDay !== 'number' || !Number.isFinite(gameDay)) {
      throw new HttpException('gameDay (number) is required', HttpStatus.BAD_REQUEST);
    }
    if (typeof actionSeed !== 'string' || actionSeed.length === 0) {
      throw new HttpException('actionSeed (string) is required', HttpStatus.BAD_REQUEST);
    }
    if (overrideProbability !== undefined) {
      if (typeof overrideProbability !== 'number' || !Number.isFinite(overrideProbability)) {
        throw new HttpException('overrideProbability must be a finite number 0..1', HttpStatus.BAD_REQUEST);
      }
    }
    return this.deadHandCache.applyIntelligenceDiscovery(
      playerId,
      rivalKey as RivalKey,
      gameDay,
      actionSeed,
      overrideProbability,
    );
  }

  // ─── C8 DD-ATTRITION-REPUTATION: Cumulative Attrition probe routes ───────────────────────────

  /**
   * POST /v1/_test/combat/drive-cpi-increment
   *
   * Body: { playerId, rivalKey, source, amount }
   *
   * Drives `CumulativeAttritionService.incrementCPI` — the SAME production method.
   * Adds `amount` to `rival_state.cumulative_pressure_index` (the SSOT — no parallel table).
   * Returns { incremented: true, newCpi: number }.
   *
   * ★ Lesson #3: drives the SAME production method (no test-only logic duplicated).
   * C4: NO Math.random(). NO Date.now(). Deterministic accrual.
   * P6: newCpi is SERVER-ONLY — never forwarded to client. This route is test-gated.
   * OQ-B3: no reputation WRITE in this path.
   */
  @Post('_test/combat/drive-cpi-increment')
  @HttpCode(HttpStatus.OK)
  async driveCpiIncrement(
    @Body() body: { playerId?: string; rivalKey?: string; source?: string; amount?: number },
  ): Promise<{ incremented: true; newCpi: number }> {
    const { playerId, rivalKey, source, amount } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKey || !VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`rivalKey '${rivalKey}' is not a valid RivalKey`, HttpStatus.BAD_REQUEST);
    }
    if (!source || !VALID_CPI_ACCRUAL_SOURCES.has(source as CpiAccrualSource)) {
      throw new HttpException(
        `source '${source}' must be lek_outcompete|supply_interrupt|contract_cancel|informant_place`,
        HttpStatus.BAD_REQUEST,
      );
    }
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) {
      throw new HttpException('amount (non-negative number) is required', HttpStatus.BAD_REQUEST);
    }

    return this.cumulativeAttrition.incrementCPI(
      playerId,
      rivalKey as RivalKey,
      source as CpiAccrualSource,
      amount,
    );
  }

  /**
   * POST /v1/_test/combat/drive-cpi-decay
   *
   * Body: { playerId, rivalKey }
   *
   * Drives `CumulativeAttritionService.decayCPIDaily` — the SAME production method.
   * Subtracts cpiDecayRatePerTick (getter-sourced) from rival_state.cumulative_pressure_index.
   * Returns { decayed: true, newCpi: number }.
   *
   * ★ Lesson #3: drives the SAME production method (COMBAT_DAILY_TICK calls this at C-deesc).
   * C4: NO Math.random(). NO Date.now(). Deterministic decay (getter-sourced rate).
   * P6: newCpi is SERVER-ONLY — never forwarded to client. This route is test-gated.
   */
  @Post('_test/combat/drive-cpi-decay')
  @HttpCode(HttpStatus.OK)
  async driveCpiDecay(
    @Body() body: { playerId?: string; rivalKey?: string },
  ): Promise<{ decayed: true; newCpi: number }> {
    const { playerId, rivalKey } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKey || !VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`rivalKey '${rivalKey}' is not a valid RivalKey`, HttpStatus.BAD_REQUEST);
    }

    return this.cumulativeAttrition.decayCPIDaily(playerId, rivalKey as RivalKey);
  }

  /**
   * POST /v1/_test/combat/drive-compute-resource-pressure
   *
   * Body: { playerId, rivalKey }
   *
   * Drives `CumulativeAttritionService.computeResourcePressure` — the SAME production method.
   * The crossing logic: if CPI >= threshold → resource_pressure increases → A's recordPressure
   * called → A's regime_pressure moves. The collapse: if resource_pressure >= 1.0 → A's
   * removeTopEnforcer called (Trophic cascade). Reads reputation (OQ-B3 READ-only).
   *
   * Returns { crossedThreshold: boolean, resourcePressureIncreased: boolean,
   *           collapseTriggered: boolean, enforcerRemoved: boolean, resourcePressure: number }.
   *
   * ★ Lesson #3: drives the SAME production method. The downstream effects (A's regime_pressure
   *   moved, A's trophic-suppression indicator changed) are asserted in the spec via A's routes.
   * C4: NO Math.random(). NO Date.now(). All thresholds getter-sourced (no inline 0.60).
   * P6: resourcePressure is SERVER-ONLY — never forwarded to client in production. Test-gated.
   * OQ-B3: no reputation WRITE in this path (the reputation coupling is a READ in the service).
   */
  @Post('_test/combat/drive-compute-resource-pressure')
  @HttpCode(HttpStatus.OK)
  async driveComputeResourcePressure(
    @Body() body: { playerId?: string; rivalKey?: string },
  ): Promise<{
    crossedThreshold: boolean;
    resourcePressureIncreased: boolean;
    collapseTriggered: boolean;
    enforcerRemoved: boolean;
    resourcePressure: number;
  }> {
    const { playerId, rivalKey } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKey || !VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`rivalKey '${rivalKey}' is not a valid RivalKey`, HttpStatus.BAD_REQUEST);
    }

    return this.cumulativeAttrition.computeResourcePressure(playerId, rivalKey as RivalKey);
  }

  // ─── C-esc: Escalation tick + mechanic probe routes ──────────────────────────────────────────

  /**
   * POST /v1/_test/combat/drive-escalation-tick
   *
   * Body: { playerId: string, gameMinute: number }
   *
   * Drives `EscalationTickService.runEscalationTickForPlayer` — the SAME production method
   * called by the ESCALATION_TICK scheduler (lesson #3: no test-only logic duplicated).
   *
   * Returns: { ran: true }
   *
   * C-esc: NO Math.random(). NO Date.now(). Deterministic via game-time.
   */
  @Post('_test/combat/drive-escalation-tick')
  @HttpCode(HttpStatus.OK)
  async driveEscalationTick(
    @Body() body: { playerId?: string; gameMinute?: number },
  ): Promise<{ ran: true }> {
    const { playerId, gameMinute } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    const minute = typeof gameMinute === 'number' ? gameMinute : 0;
    await this.escalationTick.runEscalationTickForPlayer(playerId, minute);
    return { ran: true };
  }

  /**
   * POST /v1/_test/combat/seed-sandpile-criticality
   *
   * Body: { criticality: number }
   *
   * Upserts escalation_global_state row id=1 with system_criticality = criticality.
   * Used to seed a known criticality value before driving the escalation tick.
   *
   * Returns: { system_criticality: number }
   *
   * C-esc: NO Math.random(). NO Date.now().
   */
  @Post('_test/combat/seed-sandpile-criticality')
  @HttpCode(HttpStatus.OK)
  async seedSandpileCriticality(
    @Body() body: { criticality?: number },
  ): Promise<{ system_criticality: number }> {
    const { criticality } = body ?? {};
    if (typeof criticality !== 'number' || !Number.isFinite(criticality)) {
      throw new HttpException('criticality (finite number) is required', HttpStatus.BAD_REQUEST);
    }
    await this.db
      .insert(escalationGlobalState)
      .values({ id: 1, system_criticality: criticality })
      .onConflictDoUpdate({ target: escalationGlobalState.id, set: { system_criticality: criticality } });
    return { system_criticality: criticality };
  }

  /**
   * POST /v1/_test/combat/record-provocation
   *
   * Body: { playerId: string, rivalKey: string, gameMinute: number }
   *
   * Drives `ResonantCadenceService.recordProvocation` — the SAME production method.
   * Appends gameMinute to player_response_history for (player, rival).
   * DD-RESONANCE-GAMETIME (OQ-B5): game-time only — NEVER Date.now().
   *
   * Returns: { recorded: true }
   *
   * C-esc: NO Math.random(). NO Date.now().
   */
  @Post('_test/combat/record-provocation')
  @HttpCode(HttpStatus.OK)
  async recordProvocation(
    @Body() body: { playerId?: string; rivalKey?: string; gameMinute?: number },
  ): Promise<{ recorded: true }> {
    const { playerId, rivalKey, gameMinute } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKey || !VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`rivalKey '${rivalKey}' is not a valid RivalKey`, HttpStatus.BAD_REQUEST);
    }
    const minute = typeof gameMinute === 'number' ? gameMinute : 0;
    await this.resonantCadence.recordProvocation(playerId, rivalKey as RivalKey, minute);
    return { recorded: true };
  }

  /**
   * POST /v1/_test/combat/drive-increment-depth
   *
   * Body: { playerId: string, rivalKey: string }
   *
   * Drives `MaladaptiveMemoryService.incrementDepth` — the SAME production method.
   * Increments conflict_memory_depth by maladaptiveDepthPerConflict (default 1), capped at 10.
   *
   * Returns: { incremented: true }
   *
   * C-esc: NO Math.random(). NO Date.now().
   */
  @Post('_test/combat/drive-increment-depth')
  @HttpCode(HttpStatus.OK)
  async driveIncrementDepth(
    @Body() body: { playerId?: string; rivalKey?: string },
  ): Promise<{ incremented: true }> {
    const { playerId, rivalKey } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKey || !VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`rivalKey '${rivalKey}' is not a valid RivalKey`, HttpStatus.BAD_REQUEST);
    }
    await this.maladaptiveMemory.incrementDepth(playerId, rivalKey as RivalKey);
    return { incremented: true };
  }

  /**
   * POST /v1/_test/combat/drive-decay-depth
   *
   * Body: { playerId: string, rivalKey: string, quietTickCount: number }
   *
   * Drives `MaladaptiveMemoryService.decayDepthOnQuietTicks` — the SAME production method.
   * Decays conflict_memory_depth by floor(quietTickCount/10) × maladaptiveDepthDecayPerQuietTicks.
   * No-op if quietTickCount < 10.
   *
   * Returns: { decayed: true }
   *
   * C-esc: NO Math.random(). NO Date.now().
   */
  @Post('_test/combat/drive-decay-depth')
  @HttpCode(HttpStatus.OK)
  async driveDecayDepth(
    @Body() body: { playerId?: string; rivalKey?: string; quietTickCount?: number },
  ): Promise<{ decayed: true }> {
    const { playerId, rivalKey, quietTickCount } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKey || !VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`rivalKey '${rivalKey}' is not a valid RivalKey`, HttpStatus.BAD_REQUEST);
    }
    const ticks = typeof quietTickCount === 'number' ? quietTickCount : 0;
    await this.maladaptiveMemory.decayDepthOnQuietTicks(playerId, rivalKey as RivalKey, ticks);
    return { decayed: true };
  }

  /**
   * POST /v1/_test/combat/drive-apply-dampening
   *
   * Body: { playerId: string, tileId: number, rivalKey: string, extractionLevel: 'medium' | 'max' }
   *
   * Drives `OscillationTrapService.applyPlayerDampening` — the SAME production method.
   * medium → oscillation_locked=true (rival locked in oscillation by player dampening).
   * max    → oscillation_locked=false (over-extraction breaks the dampening — no lock).
   *
   * ★ Lesson #3: drives the SAME production method (no test-only parallel).
   * ★ Falsifiable both ways: medium → locked=true; max → locked=false.
   * C-esc: NO Math.random(). NO Date.now().
   *
   * Returns: { locked: boolean }
   */
  @Post('_test/combat/drive-apply-dampening')
  @HttpCode(HttpStatus.OK)
  async driveApplyDampening(
    @Body() body: { playerId?: string; tileId?: number; rivalKey?: string; extractionLevel?: string },
  ): Promise<{ locked: boolean }> {
    const { playerId, tileId, rivalKey, extractionLevel } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (typeof tileId !== 'number' || !Number.isFinite(tileId)) {
      throw new HttpException('tileId (finite integer) is required', HttpStatus.BAD_REQUEST);
    }
    if (!rivalKey || !VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`rivalKey '${rivalKey}' is not a valid RivalKey`, HttpStatus.BAD_REQUEST);
    }
    if (extractionLevel !== 'medium' && extractionLevel !== 'max') {
      throw new HttpException("extractionLevel must be 'medium' or 'max'", HttpStatus.BAD_REQUEST);
    }
    return this.oscillationTrap.applyPlayerDampening(
      playerId,
      tileId,
      rivalKey as RivalKey,
      extractionLevel,
    );
  }

  // ─── C-deesc §5.1 — Familiarity Discount routes ───────────────────────────────────────────────

  /**
   * POST /v1/_test/combat/drive-accrue-familiarity
   *
   * Drives `FamiliarityDiscountService.accrueFamiliarity(playerId, rivalKey)`.
   * Body: { playerId: string, rivalKey: string }
   *
   * FALSIFIABLE (§5.1): accrues +0.02/tick ONLY when no active combat_event for (player, rival).
   * If a combat_event row exists → accrued=false (dear-enemy only in peacetime).
   *
   * ★ Lesson #3: drives the SAME production method — no test-only logic duplicated.
   * C-deesc: NO Math.random(). NO Date.now().
   *
   * Returns: { accrued: boolean, familiarity_index: number, familiarity_bucket: string }
   */
  @Post('_test/combat/drive-accrue-familiarity')
  @HttpCode(HttpStatus.OK)
  async driveAccrueFamiliarity(
    @Body() body: { playerId?: string; rivalKey?: string },
  ): Promise<{ accrued: boolean; familiarity_index: number; familiarity_bucket: string }> {
    const { playerId, rivalKey } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKey || !VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`rivalKey '${rivalKey}' is not a valid RivalKey`, HttpStatus.BAD_REQUEST);
    }
    return this.familiarityDiscount.accrueFamiliarity(playerId, rivalKey as RivalKey);
  }

  /**
   * POST /v1/_test/combat/drive-reset-on-elimination
   *
   * Drives `FamiliarityDiscountService.resetOnElimination(playerId, rivalKey)`.
   * Body: { playerId: string, rivalKey: string }
   *
   * Resets familiarity_index to 0 and raises vacuum_volatility.
   * The triple-cost of decisive victory (§5.1 :45-48): familiar rival removal → vacuum penalty.
   *
   * ★ Lesson #3: drives the SAME production method — no test-only logic duplicated.
   * C-deesc: NO Math.random(). NO Date.now().
   *
   * Returns: { reset: true, vacuum_volatility: number }
   */
  @Post('_test/combat/drive-reset-on-elimination')
  @HttpCode(HttpStatus.OK)
  async driveResetOnElimination(
    @Body() body: { playerId?: string; rivalKey?: string },
  ): Promise<{ reset: true; vacuum_volatility: number }> {
    const { playerId, rivalKey } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKey || !VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`rivalKey '${rivalKey}' is not a valid RivalKey`, HttpStatus.BAD_REQUEST);
    }
    return this.familiarityDiscount.resetOnElimination(playerId, rivalKey as RivalKey);
  }

  /**
   * POST /v1/_test/combat/drive-get-familiarity-bucket
   *
   * Drives `FamiliarityDiscountService.getFamiliarityBucket(playerId, rivalKey)`.
   * Body: { playerId: string, rivalKey: string }
   *
   * Maps familiarity_index to qualitative FamiliarityIndexBucket (P5 / R2.2 — never raw float).
   *   stranger(<0.30) / acquainted(<0.60) / familiar(<0.90) / calibrated(≥0.90)
   *
   * ★ Lesson #3: drives the SAME production method — no test-only logic duplicated.
   * C-deesc: NO Math.random(). NO Date.now().
   *
   * Returns: { bucket: string }
   */
  @Post('_test/combat/drive-get-familiarity-bucket')
  @HttpCode(HttpStatus.OK)
  async driveGetFamiliarityBucket(
    @Body() body: { playerId?: string; rivalKey?: string },
  ): Promise<{ bucket: string }> {
    const { playerId, rivalKey } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKey || !VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`rivalKey '${rivalKey}' is not a valid RivalKey`, HttpStatus.BAD_REQUEST);
    }
    return this.familiarityDiscount.getFamiliarityBucket(playerId, rivalKey as RivalKey);
  }

  // ─── C-deesc §5.2 — Downstream Gate routes ────────────────────────────────────────────────────

  /**
   * POST /v1/_test/combat/drive-evaluate-downstream
   *
   * Drives `DownstreamGateService.evaluateDownstream(playerId, rivalKey, downstreamCondition, gameMinute)`.
   * Body: { playerId: string, rivalKey: string, downstreamCondition: number, gameMinute?: number }
   *
   * FALSIFIABLE (§5.2 hydraulic-jump):
   *   downstreamCondition < 0.60 (threshold) → transitioned=false, flow_regime='running'
   *   downstreamCondition >= 0.60 (BLOCKED)   → transitioned=true, flow_regime='standing',
   *                                               event_type='conflict_flow_regime' (NOT 'regime_transition')
   *
   * ★ OQ-B7: event_type='conflict_flow_regime' (NOT 'regime_transition' — A's rival-regime flip).
   * ★ Lesson #3: drives the SAME production method — no test-only logic duplicated.
   * C-deesc: NO Math.random(). NO Date.now().
   *
   * Returns: { transitioned: boolean, flow_regime: string, retaliation_suspended: boolean, event_type: string | null }
   */
  @Post('_test/combat/drive-evaluate-downstream')
  @HttpCode(HttpStatus.OK)
  async driveEvaluateDownstream(
    @Body() body: { playerId?: string; rivalKey?: string; downstreamCondition?: number; gameMinute?: number },
  ): Promise<{
    transitioned: boolean;
    flow_regime: string;
    retaliation_suspended: boolean;
    event_type: string | null;
  }> {
    const { playerId, rivalKey, downstreamCondition, gameMinute } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKey || !VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`rivalKey '${rivalKey}' is not a valid RivalKey`, HttpStatus.BAD_REQUEST);
    }
    if (typeof downstreamCondition !== 'number' || !Number.isFinite(downstreamCondition)) {
      throw new HttpException('downstreamCondition (finite number) is required', HttpStatus.BAD_REQUEST);
    }
    return this.downstreamGate.evaluateDownstream(
      playerId,
      rivalKey as RivalKey,
      downstreamCondition,
      gameMinute ?? 0,
    );
  }

  /**
   * POST /v1/_test/combat/drive-get-conflict-flow-regime
   *
   * Drives `DownstreamGateService.getConflictFlowRegime(playerId, rivalKey)`.
   * Body: { playerId: string, rivalKey: string }
   *
   * P5 exception (§5.2 :67): flow_regime is shown EXPLICITLY because it gates the player's strategy.
   * downstream_condition_bucket is qualitative (NOT the raw float).
   *
   * ★ Lesson #3: drives the SAME production method — no test-only logic duplicated.
   * C-deesc: NO Math.random(). NO Date.now().
   *
   * Returns: { flow_regime: string, downstream_condition_bucket: string }
   */
  @Post('_test/combat/drive-get-conflict-flow-regime')
  @HttpCode(HttpStatus.OK)
  async driveGetConflictFlowRegime(
    @Body() body: { playerId?: string; rivalKey?: string },
  ): Promise<{ flow_regime: string; downstream_condition_bucket: string }> {
    const { playerId, rivalKey } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKey || !VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`rivalKey '${rivalKey}' is not a valid RivalKey`, HttpStatus.BAD_REQUEST);
    }
    return this.downstreamGate.getConflictFlowRegime(playerId, rivalKey as RivalKey);
  }

  /**
   * GET /v1/_test/combat/read-flow-state?playerId=&rivalKey=
   *
   * Read the raw conflict_flow_state row for (player_id, rival_key).
   * Test-only — exposes the DB row for E2E assertions.
   * Returns the row or null (if no row exists).
   */
  @Get('_test/combat/read-flow-state')
  async readFlowState(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKeyParam: string,
  ): Promise<{ flow_regime: string | null; downstream_condition: number | null } | null> {
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKeyParam || !VALID_RIVAL_KEYS.has(rivalKeyParam)) {
      throw new HttpException(`rivalKey '${rivalKeyParam}' is not a valid RivalKey`, HttpStatus.BAD_REQUEST);
    }
    const row = await this.combatRepo.readConflictFlow(playerId, rivalKeyParam as RivalKey);
    if (!row) return null;
    return {
      flow_regime: row.flow_regime,
      downstream_condition: row.downstream_condition,
    };
  }

  // ─── C-deesc — COMBAT_DAILY_TICK drive route ──────────────────────────────────────────────────

  /**
   * POST /v1/_test/combat/drive-daily-tick
   *
   * Drives `DeEscalationTickService.runCombatDailyTickForPlayer(playerId, gameMinute)`.
   * Body: { playerId: string, gameMinute?: number }
   *
   * The 4 per-player nightly decays (COMBAT_DAILY_TICK NIGHTLY/14):
   *   1. MaladaptiveMemoryService.decayDepthOnQuietTicks (C-esc quiet-tick decay)
   *   2. FamiliarityDiscountService.accrueFamiliarity    (C-deesc §5.1 dear-enemy)
   *   3. EphemeralOperationService.clearStateOlderThanWindow (C6 ephemeral purge)
   *   4. CumulativeAttritionService.decayCPIDaily        (C8 CPI daily decay)
   *
   * ★ Lesson #3: the SAME shared method as the NIGHTLY scheduler — zero live-vs-test divergence.
   * ★ L1 empty-state skip: if no deescalation_pair_state rows → ZERO writes (no-op).
   * C-deesc: NO Math.random(). NO Date.now().
   *
   * Returns: { ran: true }
   */
  @Post('_test/combat/drive-daily-tick')
  @HttpCode(HttpStatus.OK)
  async driveDailyTick(
    @Body() body: { playerId?: string; gameMinute?: number },
  ): Promise<{ ran: true }> {
    const { playerId, gameMinute } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    await this.deEscalationTick.runCombatDailyTickForPlayer(playerId, gameMinute ?? 0);
    return { ran: true };
  }

  // ─── C-cas routes ─────────────────────────────────────────────────────────────────────────────

  /**
   * POST /v1/_test/combat/drive-cascade
   *
   * Drives the §9.1 5-layer atomic cascade via ConflictOrchestratorService.recordAssaultCascade.
   *
   * Body: { playerId, rivalKey, assaultEventId, patternHash, gameMinute, failAtLayer? }
   *   - failAtLayer (optional, test-only): when set, forces a rollback after writing that layer.
   *     Used by E2E atomicity test (b) to verify the tx rolls back entirely.
   *     2=after Layer 2 (sandpile), 3=after Layer 3 (maladaptive), 4=after Layer 4 (adaptive skin).
   *
   * Returns: CascadeResult (qualitative — no raw scalars, P5/R2.2).
   * ★ Lesson #3: calls the SAME recordAssaultCascade production method. No test-only logic.
   * C-cas: NO Math.random(). NO Date.now().
   */
  @Post('_test/combat/drive-cascade')
  @HttpCode(HttpStatus.OK)
  async driveCascade(
    @Body() body: {
      playerId?: string;
      rivalKey?: string;
      assaultEventId?: string;
      patternHash?: string;
      gameMinute?: number;
      failAtLayer?: number;
    },
  ): Promise<Record<string, unknown>> {
    const { playerId, rivalKey: rivalKeyParam, assaultEventId, patternHash, gameMinute, failAtLayer } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKeyParam || !VALID_RIVAL_KEYS.has(rivalKeyParam)) {
      throw new HttpException(`rivalKey '${rivalKeyParam}' is not a valid RivalKey`, HttpStatus.BAD_REQUEST);
    }
    if (!assaultEventId) throw new HttpException('assaultEventId is required', HttpStatus.BAD_REQUEST);
    if (!patternHash) throw new HttpException('patternHash is required', HttpStatus.BAD_REQUEST);

    const input: AssaultCascadeInput = {
      playerId,
      rivalKey: rivalKeyParam as RivalKey,
      assaultEventId,
      patternHash,
      gameMinute: gameMinute ?? 0,
      failAtLayer,
    };

    const result = await this.conflictOrchestrator.recordAssaultCascade(input);
    return result as unknown as Record<string, unknown>;
  }

  /**
   * POST /v1/_test/combat/drive-elimination
   *
   * Drives the §9.2 4-penalty atomic elimination via RivalEliminationService.executeElimination.
   *
   * Body: { playerId, rivalKey, gameMinute, failAtLayer? }
   *   - failAtLayer (optional, test-only): when set, forces a rollback after writing that penalty.
   *     Used by E2E atomicity test (b) to verify the tx rolls back entirely.
   *     1=after Penalty 1 (familiarity), 2=after Penalty 2 (enforcer), 3=after Penalty 3 (maladaptive).
   *
   * Returns: EliminationResult (qualitative — no raw scalars, P5/R2.2).
   * ★ Lesson #3: calls the SAME executeElimination production method. No test-only logic.
   * C-cas: NO Math.random(). NO Date.now().
   */
  @Post('_test/combat/drive-elimination')
  @HttpCode(HttpStatus.OK)
  async driveElimination(
    @Body() body: {
      playerId?: string;
      rivalKey?: string;
      gameMinute?: number;
      failAtLayer?: number;
    },
  ): Promise<Record<string, unknown>> {
    const { playerId, rivalKey: rivalKeyParam, gameMinute, failAtLayer } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKeyParam || !VALID_RIVAL_KEYS.has(rivalKeyParam)) {
      throw new HttpException(`rivalKey '${rivalKeyParam}' is not a valid RivalKey`, HttpStatus.BAD_REQUEST);
    }

    const input: EliminationInput = {
      playerId,
      rivalKey: rivalKeyParam as RivalKey,
      gameMinute: gameMinute ?? 0,
      failAtLayer,
    };

    const result = await this.rivalElimination.executeElimination(input);
    return result as unknown as Record<string, unknown>;
  }

  /**
   * GET /v1/_test/combat/read-cascade-dedup?assaultEventId=
   *
   * Check if an assault_cascade_dedup row exists for the given assaultEventId.
   * Returns: { exists: boolean, processed_at_minute?: number }
   *
   * Used by E2E test (d) to verify dedup state without direct DB access in test body.
   */
  @Get('_test/combat/read-cascade-dedup')
  async readCascadeDedup(
    @Query('assaultEventId') assaultEventId: string,
  ): Promise<{ exists: boolean; processed_at_minute?: number }> {
    if (!assaultEventId) throw new HttpException('assaultEventId is required', HttpStatus.BAD_REQUEST);

    const rows = await this.db.execute<{ assault_event_id: string; processed_at_minute: string }>(
      sql`SELECT assault_event_id, processed_at_minute FROM "assault_cascade_dedup" WHERE assault_event_id = ${assaultEventId} LIMIT 1`,
    );
    const resultRows = (rows as unknown as { rows?: Array<{ processed_at_minute: string }> }).rows ?? (Array.isArray(rows) ? rows as Array<{ processed_at_minute: string }> : []);
    if (resultRows.length === 0) {
      return { exists: false };
    }
    return {
      exists: true,
      processed_at_minute: Number(resultRows[0]!.processed_at_minute),
    };
  }

  /**
   * POST /v1/_test/combat/drive-dead-hand-tick
   *
   * Drives the DEAD_HAND_TICK per-player execution via ConflictOrchestratorService.runDeadHandTickForPlayer.
   *
   * Body: { playerId, gameMinute }
   *
   * ★ Lesson #3: calls the SAME runDeadHandTickForPlayer production method — zero live-vs-test divergence.
   * C-cas: NO Math.random(). NO Date.now(). game-time via gameMinute.
   * Returns: { ran: true }
   */
  @Post('_test/combat/drive-dead-hand-tick')
  @HttpCode(HttpStatus.OK)
  async driveDeadHandTick(
    @Body() body: { playerId?: string; gameMinute?: number },
  ): Promise<{ ran: true }> {
    const { playerId, gameMinute } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    await this.conflictOrchestrator.runDeadHandTickForPlayer(playerId, gameMinute ?? 0);
    return { ran: true };
  }

  // ─── C-proj: CombatProjectionService probe routes ─────────────────────────────────────────────

  /**
   * GET /v1/_test/combat/combat-client-view?playerId=&rivalKey=
   *
   * Calls `CombatProjectionService.toCombatClientView(playerId, rivalKey)` — the ONLY player-facing
   * combat shape. Returns the 8 closed CombatClientView bands:
   *   activeLinkBand / registers[].valueBand / sandpileBand / flowRegime / conflictMemoryBand /
   *   familiarityBand / deadHandIntelligenceRevealed / lastOutcomeBucket.
   *
   * P6 wall: NO raw scalar (base_friction_load / CPI / system_criticality / familiarity_index /
   * conflict_memory_depth / dead_hand_reserve / trigger_threshold / cache_script_ref /
   * dominance_rank / vulnerable_axis / active_link_fraction / node_count / resource_pressure).
   *
   * ★ Lesson #3: calls the SAME toCombatClientView production method — zero live-vs-test divergence.
   * C-proj: NO Math.random(). NO Date.now().
   *
   * Returns: CombatClientView (the 8 closed bands only).
   */
  @Get('_test/combat/combat-client-view')
  async getCombatClientView(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKeyParam: string,
  ): Promise<CombatClientView> {
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKeyParam || !VALID_RIVAL_KEYS.has(rivalKeyParam)) {
      throw new HttpException(
        `rivalKey '${rivalKeyParam}' is not a valid RivalKey`,
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.combatProjection.toCombatClientView(
      playerId,
      rivalKeyParam as RivalKey,
    );
  }

  /**
   * POST /v1/_test/combat/seed-escalation-global
   *
   * Upserts the escalation_global_state row with the given system_criticality + cascade_threshold.
   * Used by the falsifiable P6 test (c) to control the sandpileBand output by setting
   * a specific criticality value without running an escalation tick.
   *
   * Body: { system_criticality: number, cascade_threshold?: number }
   * Returns: { seeded: true, system_criticality: number }
   *
   * C-proj: deterministic seed — NO Math.random(). NO Date.now().
   */
  @Post('_test/combat/seed-escalation-global')
  @HttpCode(HttpStatus.OK)
  async seedEscalationGlobal(
    @Body() body: { system_criticality?: number; cascade_threshold?: number },
  ): Promise<{ seeded: true; system_criticality: number }> {
    const { system_criticality, cascade_threshold } = body ?? {};
    if (typeof system_criticality !== 'number' || !Number.isFinite(system_criticality)) {
      throw new HttpException('system_criticality (finite number) is required', HttpStatus.BAD_REQUEST);
    }
    const clamped = Math.max(0, Math.min(1, system_criticality));
    await this.combatRepo.upsertEscalationGlobal({
      system_criticality: clamped,
      ...(typeof cascade_threshold === 'number' && Number.isFinite(cascade_threshold)
        ? { cascade_threshold: Math.max(0, Math.min(1, cascade_threshold)) }
        : {}),
    });
    return { seeded: true, system_criticality: clamped };
  }

  // ─── C-cls: Forward slot test routes ─────────────────────────────────────────────────────────

  /**
   * POST /v1/_test/combat/drive-negotiate-deactivation
   *
   * Body: { playerId: string, rivalKey: string, truceTerms: Record<string, unknown> }
   *
   * Drives `DeadHandCacheService.negotiateDeactivation` — the C-owned forward slot.
   * In B, returns { deactivated: false, reason: 'truce_clause_not_implemented' }.
   * C fills the truce-clause logic in sub-lot C.
   *
   * Used by the C-cls dependency_contract spec to verify the stub is present + no-op-able.
   * C-cls: no Math.random(), no Date.now(). Pure stub.
   */
  @Post('_test/combat/drive-negotiate-deactivation')
  @HttpCode(HttpStatus.OK)
  async driveNegotiateDeactivation(
    @Body() body: { playerId?: string; rivalKey?: string; truceTerms?: Record<string, unknown> },
  ): Promise<{ deactivated: boolean; reason: string }> {
    const { playerId, rivalKey, truceTerms } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKey || !VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`rivalKey '${rivalKey}' is not a valid RivalKey`, HttpStatus.BAD_REQUEST);
    }
    return this.deadHandCache.negotiateDeactivation(
      playerId,
      rivalKey as import('./combat.types').RivalKey,
      truceTerms ?? {},
    );
  }

  /**
   * POST /v1/_test/combat/drive-degrade-register-intel
   *
   * Body: { playerId: string, rivalKey: string, gameMinute: number }
   *
   * Drives `ErosionRegisterService.degradeRegisterIntel` — the C-owned forward slot.
   * In B, this is a no-op stub (debug log only, no DB write, no throw).
   * C wires the real info-warfare INTEL degradation path.
   *
   * Used by the C-cls dependency_contract spec to verify the slot is present + callable.
   * C-cls: no Math.random(), no Date.now(). Pure stub.
   */
  @Post('_test/combat/drive-degrade-register-intel')
  @HttpCode(HttpStatus.OK)
  async driveDegradeRegisterIntel(
    @Body() body: { playerId?: string; rivalKey?: string; gameMinute?: number },
  ): Promise<{ ran: true }> {
    const { playerId, rivalKey, gameMinute } = body ?? {};
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    if (!rivalKey || !VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`rivalKey '${rivalKey}' is not a valid RivalKey`, HttpStatus.BAD_REQUEST);
    }
    await this.erosionRegister.degradeRegisterIntel(
      playerId,
      rivalKey as import('./combat.types').RivalKey,
      gameMinute ?? 0,
    );
    return { ran: true };
  }

  /**
   * POST /v1/_test/combat/ensure-erosion-registers?playerId=<uuid>
   *
   * RESETS all 5 erosion-register rows × all 4 rivals for a player to 'standard' (sticky-reset).
   * Used by C9 infowar tests to guarantee erosion-register rows exist AND are at 'standard'
   * before INTEL degrade assertions.
   *
   * Uses `onConflictDoUpdate` (NOT `onConflictDoNothing`) to OVERWRITE any prior degraded value.
   * Sticky-accumulator isolation lesson: doNothing would leave stale degraded values from prior
   * test runs → cross-run contamination (the C9 degradeRegisterIntel test would then see 'crippled'
   * instead of 'weakened'). doUpdate RESETS to standard, guaranteeing a clean baseline.
   *
   * Returns { ensured: true } on success.
   */
  @Post('_test/combat/ensure-erosion-registers')
  @HttpCode(HttpStatus.OK)
  async ensureErosionRegisters(
    @Query('playerId') playerId?: string,
  ): Promise<{ ensured: true }> {
    if (!playerId) throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    for (const rk of ['coil', 'tarcum', 'iron_throat', 'saltline'] as const) {
      await this.erosionRegister.resetRegistersToStandard(playerId, rk);
    }
    return { ensured: true };
  }
}
