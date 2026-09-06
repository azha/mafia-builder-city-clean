// IMPLEMENTS: docs/superpowers/plans/2026-06-16-depth-d2-impl-plan.md Task R0 + Task R1 + Task R2b + Task R4a + Task R5a + Task R5b + Task R7a + Task R8a + Task R8b
//             docs/tech/04c_market_reputation_insurance/reputation_mechanics.md §3 (ReputationModule backbone)
//             — D2 R0 + R1 — 2026-06-16; D2 R2b — 2026-06-17; D2 R4a — 2026-06-17; D2 R5a — 2026-06-17; D2 R5b — 2026-06-17; D2 R7a — 2026-06-17
//
// `ReputationModule` — the NestJS module for the §3 reputation mechanics (D2).
//
// R0 = EMPTY SCAFFOLD. R1 = 6 entity schemas + migrations 0045+ (persistence-only, no mechanic).
//
// R1 adds: the test controller now injects the DB for persistence proof.
// R2a: BossMirrorService (declare/retract ≤4 + per-lieutenant violation ring + recordViolation).
// R2b: Boss Mirror weekly tick registered on the REAL scheduler (Cadence.WEEKLY, order 3 — BOSS_MIRROR_TICK).
//
// R1+ chunks fill this module with:
//   R1  — 6 entity schemas + migrations 0045+ + test routes for persistence proof
//   R2a — BossMirrorService (declare/retract ≤4 + per-lieutenant violation ring + recordViolation)
//   R2b — Boss Mirror weekly tick (violation_density → defection_tolerance + consistency_index) [THIS CHUNK]
//   R3a — declaration_ledger columns on precinct_memory + 2 bus events + ch09 backport
//   R3b — police_memory acceptor (subscribe + write ring + Tick2 decay + Tick3 G31 scoring)
//   R4a — RestraintIndexService (dispute ring + restraint_ratio + offer_terms + wary config)
//   R4b — DD-BRIDGE (single dispute act writes both rings, deterministic Restraint→Boss Mirror)
//   R5a — LekMemoryService (bind/record fairness + λ inheritance + decay tick)
//   R5b — D1b contract consumption (getPositionMemoryAggregate + district_capacity_damage_bucket)
//   R6  — Lek → lieutenant perf multiplier in distribution-binding
//   R7a — HiddenCurriculumService GREENFIELD (04a ch14 owner — norms vector + event ring + weekly tick)
//   R7b — Consume Hidden Curriculum in 04c (downstream norm effects + uniform-tell projection)
//   R8a — ForbiddenTriadDetectionService (pair state + N_strong=12 cap [registry-add] + 66-pair bound)
//   R8b — Forbidden-Triad weekly tick (anomaly_pressure accrual + observer probe + dissolve actions) [THIS CHUNK]
//   R9  — MIS routing (ForbiddenTriadInterestFlag + HiddenCurriculumLeakMIS → inspection acceptors)
//   R10 — Recruitment polling (consistency_index gate + norm-poll in recruit(); neutral on empty world)
//   R11 — Cross-mechanic divergence (declared rules vs absorbed norms — observable divergence)
//   R12a— BO true-state endpoints (reputation-state ops + force-rule-violation admin + tunables/reputation)
//   R12b— Vue-BO ReputationDashboard + R2.2 client projections (ZERO reputation scalar client-side)
//   R13 — Closeout (ch09 backport + registry mapping/add + TD routing + roadmap row + merge-gate A)
//
// REUSE plan:
//   - SchedulerModule (WEEKLY cadence, BOSS_MIRROR_TICK slot order 3) — R2b [ADDED]
//   - MarketModule imports (MarketProjectionService, MarketRngService) — R2.2 projection + RNG determinism
//   - D1b district_capacity_damage_bucket contract (CarryingCapacityHazeService) — R5b
//
// EXPORTS: BossMirrorService exported for consuming modules (R3/R10 — recruitment + police bridge).
//
// R9.3 (source-of-truth): docs/tech/09_data_model/schema_reputation_state.md lands at R1 (same-commit).

import { Module, OnApplicationBootstrap } from '@nestjs/common';

import { testControllersEnabled } from '../../protocol/test-routes-gate';
import { ReputationTestController } from './reputation-test.controller';
import { ReputationAdminController } from './reputation-admin.controller';
import { ReputationController } from './reputation.controller';
import { BossMirrorService } from './boss-mirror.service';
import { RestraintIndexService } from './restraint-index.service';
import { LekMemoryService } from './lek-memory.service';
import { HiddenCurriculumService } from './hidden-curriculum.service';
import { ForbiddenTriadDetectionService } from './forbidden-triad.service';
import { ReputationHubService } from './reputation-hub.service'; // R12b: unified player-facing projection
import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import {
  Cadence,
  CitySystemId,
  type CitySimSystem,
  type CitySimTickContext,
} from '../../citysim/scheduler/city_sim_system';
import { SchedulerModule } from '../../citysim/scheduler/scheduler.module';
import { MarketModule } from '../market/market.module';

// Incremental week-id: starts at 0, increments each time the WEEKLY cadence fires for this player.
// This is the per-execution counter used by the real scheduler (derived from ctx.gameMinute / WEEKLY_MINUTES).
// For the REAL scheduler registration: week_id = Math.floor(ctx.gameMinute / WEEKLY_MINUTES).
/** In-game minutes in one week (7 days × 24 h × 60 min). */
const WEEKLY_MINUTES = 7 * 24 * 60;

// R1: the test controller now injects the DB (via the global DbModule) for persistence proof.
// The DB token is global — no need to import DbModule here (it's @Global in AppModule).
// R2a: BossMirrorService registered as provider. ReputationTestController now also injects it.
// R12a: ReputationAdminController always-on (role-gated BO routes — NOT test-gated).
// W6.2 C4-bis: ReputationController always-on (the player-facing route, mirrors InsuranceController's
// own always-on posture — never gated on NODE_ENV, unlike the _test controller below).
const controllers = [
  ReputationAdminController, // R12a: always-on production BO routes (role-gated, not env-gated)
  ReputationController,      // W6.2 C4-bis: POST /v1/me/house-rules (always-on player route)
  ...(testControllersEnabled() ? [ReputationTestController] : []),
];

@Module({
  imports: [
    SchedulerModule, // R2b: provides CitySimSchedulerService for WEEKLY tick registration
    MarketModule,    // R5b: REUSE CarryingCapacityHazeService.getHazeProjection (district_capacity_damage_bucket contract)
  ],
  controllers,
  providers: [
    BossMirrorService,         // R2a: declare/retract ≤4 + per-lieutenant violation ring FIFO
    // R2b: BossMirror weekly tick (violation_density → defection_tolerance + consistency_index) [REGISTERED BELOW]
    // R3a: declaration_ledger columns on precinct_memory + 2 bus events + ch09 backport
    RestraintIndexService,     // R4a: dispute ring + restraint_ratio + offer_terms + wary config [REGISTERED BELOW]
    LekMemoryService,          // R5a: bind/record fairness + λ inheritance + decay tick [REGISTERED BELOW]
    HiddenCurriculumService,          // R7a: norms vector + witnessed ring + weekly review tick [REGISTERED BELOW] — DD-HC-GREENFIELD
    ForbiddenTriadDetectionService,   // R8a: pair state + N_strong=12 cap + 66-pair bound [registry-add forbidden_triad_n_strong_cap]
    ReputationHubService,             // R12b: unified player-facing projection (B3/B4/B5 aggregator — ZERO raw scalar)
  ],
  exports: [
    BossMirrorService,                // R2a+: exported for consuming modules (R3/R10 — recruitment + police bridge)
    RestraintIndexService,            // R4a+: exported for consuming modules (R4b DD-BRIDGE)
    LekMemoryService,                 // R5a+: exported for consuming modules (R5b D1b contract + R6 lieutenant perf)
    HiddenCurriculumService,          // R7a+: exported for consuming modules (R10 recruitment + R11 divergence)
    ForbiddenTriadDetectionService,   // R8a+: exported for consuming modules (R8b weekly tick + R9 MIS routing)
    ReputationHubService,             // R12b+: exported for CombatModule (C8 CumulativeAttritionService READ-only
                                      //   DD-ATTRITION-REPUTATION — reads the LEADERSHIP-register erosion band;
                                      //   NO reputation WRITE by the consumer (OQ-B3 no double-count)).
  ],
})
export class ReputationModule implements OnApplicationBootstrap {
  constructor(
    private readonly bossMirror: BossMirrorService,
    private readonly restraintIndex: RestraintIndexService,
    private readonly lekMemory: LekMemoryService,
    private readonly hiddenCurriculum: HiddenCurriculumService,
    private readonly forbiddenTriad: ForbiddenTriadDetectionService,
    private readonly scheduler: CitySimSchedulerService,
    // R12b: hub service registered but not injected into onApplicationBootstrap (no scheduler registration needed)
    private readonly reputationHub: ReputationHubService, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {}

  /**
   * R2b: register the Boss Mirror weekly tick on the REAL scheduler.
   *
   * Cadence: WEEKLY (CitySystemId.BOSS_MIRROR_TICK, order 3 — after DEAL_LEK/1 and BUFFER_BLOAT/2).
   * The slot is declared in city_sim_scheduler.service.ts SCHEDULE.
   *
   * The week-id for the idempotence guard is derived from ctx.gameMinute:
   *   weekId = Math.floor(ctx.gameMinute / WEEKLY_MINUTES)
   * This ensures each in-game week fires exactly once per player (per the advance-harness tick contract).
   *
   * Pattern: mirrors PoliceMemoryService.registerCadences() (police_memory.service.ts:220-226).
   */
  onApplicationBootstrap(): void {
    // R2b: Boss Mirror weekly tick (violation_density → defection_tolerance + consistency_index).
    const bossMirrorSystem: CitySimSystem = {
      id:     CitySystemId.BOSS_MIRROR_TICK,
      cadence: Cadence.WEEKLY,
      order:  3,
      run: async (ctx: CitySimTickContext): Promise<void> => {
        const weekId = Math.floor(ctx.gameMinute / WEEKLY_MINUTES);
        await this.bossMirror.runWeeklyTick(ctx, weekId);
      },
    };
    this.scheduler.registerSystem(bossMirrorSystem);

    // R4a: Restraint Index weekly tick (restraint_ratio → offer_terms + wary config).
    // Cadence: WEEKLY, order 4 (after BOSS_MIRROR_TICK/3).
    // Idempotent per week (keyed on last_tick_week per counterparty ring row).
    // DD-REG-NAME: δ, T_wary, window, escrow_inflation, base_terms all read from registry.
    const restraintIndexSystem: CitySimSystem = {
      id:     CitySystemId.RESTRAINT_INDEX_TICK,
      cadence: Cadence.WEEKLY,
      order:  4,
      run: async (ctx: CitySimTickContext): Promise<void> => {
        const weekId = Math.floor(ctx.gameMinute / WEEKLY_MINUTES);
        await this.restraintIndex.runWeeklyTick(ctx, weekId);
      },
    };
    this.scheduler.registerSystem(restraintIndexSystem);

    // R5a: Lek Memory weekly decay tick (λ_now exponential decay per week).
    // Cadence: WEEKLY, order 5 (after RESTRAINT_INDEX_TICK/4).
    // Applies λ_now_new = λ_now · exp(−7 / lek_memory_halflife_days) to all cell state rows.
    // Idempotent per week (keyed on last_decay_week per cell row).
    // DD-REG-NAME: τ, λ, slots, decay_rate all read from registry (no inline coefficients).
    const lekMemorySystem: CitySimSystem = {
      id:     CitySystemId.LEK_MEMORY_TICK,
      cadence: Cadence.WEEKLY,
      order:  5,
      run: async (ctx: CitySimTickContext): Promise<void> => {
        const weekId = Math.floor(ctx.gameMinute / WEEKLY_MINUTES);
        await this.lekMemory.runDecayTick(ctx, weekId);
      },
    };
    this.scheduler.registerSystem(lekMemorySystem);

    // R7a: Hidden Curriculum weekly review tick (norm flags flip ON/OFF/unchanged per witnessed-event ratio).
    // Cadence: WEEKLY, order 6 (after LEK_MEMORY_TICK/5).
    // For each lieutenant row in player scope, computes ratio = events_exhibiting_norm / events_total
    // and flips each of the 8 norm flags ON (>flip_on) / OFF (<flip_off) / unchanged (mid) per canon §3.4 (:162-168).
    // Idempotent per week (keyed on last_review_week per row).
    // DD-REG-NAME: flip_on, flip_off, buffer read from registry (no inline thresholds).
    // DD-HC-GREENFIELD: service is defined in 04a ch14 (primary owner) + consumed here.
    const hiddenCurriculumSystem: CitySimSystem = {
      id:      CitySystemId.HIDDEN_CURRICULUM_TICK,
      cadence: Cadence.WEEKLY,
      order:   6,
      run: async (ctx: CitySimTickContext): Promise<void> => {
        const weekId = Math.floor(ctx.gameMinute / WEEKLY_MINUTES);
        await this.hiddenCurriculum.runWeeklyReviewTick(ctx, weekId);
      },
    };
    this.scheduler.registerSystem(hiddenCurriculumSystem);

    // R8b: Forbidden-Triad weekly tick (anomaly_pressure accrual + observer probe).
    // Cadence: WEEKLY, order 7 (after HIDDEN_CURRICULUM_TICK/6).
    // For each UNMET pair in player scope:
    //   anomaly_pressure_bucket += triadObserverAttentionShare (Δ_per_week, registry).
    //   If anomaly_pressure_bucket >= triadHObserverWeeks (H_observer, registry):
    //     → flip observer_interest_flag = true for that pair.
    //     → emit ForbiddenTriadInterestFlag on CityEventBus (MIS routing seam for R9).
    // Idempotent per week (keyed on last_eval_week per pair row).
    // DD-REG-NAME: H_observer + attention_share + decay all from registry (no inline).
    // R2.2: anomaly_pressure_bucket + observer_interest_flag are server-only.
    // TD-120: observer-NPC actor without real producer — emit+defer (R13 Insurance+MIS lot wires NPC).
    // Canon: reputation_mechanics.md §3.5 (:201-206).
    const forbiddenTriadSystem: CitySimSystem = {
      id:      CitySystemId.FORBIDDEN_TRIAD_TICK,
      cadence: Cadence.WEEKLY,
      order:   7,
      run: async (ctx: CitySimTickContext): Promise<void> => {
        const weekId = Math.floor(ctx.gameMinute / WEEKLY_MINUTES);
        await this.forbiddenTriad.evaluatePairs(ctx.playerId, ctx, weekId);
      },
    };
    this.scheduler.registerSystem(forbiddenTriadSystem);
  }
}
