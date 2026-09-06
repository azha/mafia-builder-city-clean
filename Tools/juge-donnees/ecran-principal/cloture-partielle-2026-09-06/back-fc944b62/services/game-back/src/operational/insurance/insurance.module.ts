// IMPLEMENTS: docs/tech/04c_market_reputation_insurance/insurance_mechanics.md §4.1 (InsuranceModule backbone)
//             docs/superpowers/plans/2026-06-17-depth-insurance-underwriting-walk-plan.md Task 0 (C0)
//             docs/superpowers/plans/2026-06-17-depth-insurance-underwriting-walk-plan.md Task 2 (C2)
//             docs/superpowers/plans/2026-06-17-depth-insurance-underwriting-walk-plan.md Task 4 (C4)
//             docs/superpowers/plans/2026-06-17-depth-insurance-underwriting-walk-plan.md Task 6 (C6)
//             docs/superpowers/plans/2026-06-17-depth-insurance-underwriting-walk-plan.md Task 7 (C7)
//             docs/superpowers/plans/2026-06-17-depth-insurance-underwriting-walk-plan.md Task 8 (C8)
//             docs/superpowers/plans/2026-06-17-depth-insurance-underwriting-walk-plan.md Task 10 (C10)
//             docs/superpowers/plans/2026-06-18-depth-insurance-coverage-drift-plan.md Task 3 (C3)
//             — Insurance C0 — 2026-06-17
//             — Insurance C2 — 2026-06-17
//             — Insurance C4 — 2026-06-17
//             — Insurance C6 — 2026-06-17 (ClaimsService PROPERTY/STASH subscriber wired)
//             — Insurance C7 — 2026-06-17 (CourierInterceptionService MINUTE/21 registered)
//             — Insurance C8 — 2026-06-17 (FenceDefaultService NIGHTLY/8 registered)
//             — Insurance C10 — 2026-06-17 (FraudDetectionService registered)
//             — Insurance Drift C3 — 2026-06-18 (CoverageInducedDriftService provided + injected into ContractService)
//
// `InsuranceModule` — the NestJS module for the §4.1 insurance mechanics (lot Insurance Tranche B).
//
// C0 = EMPTY SCAFFOLD. providers [], imports [MarketModule, SchedulerModule].
// C2 ADDS: UnderwritingWalkService (NIGHTLY tick — DD-WALK daily snapshot + monotone OR).
//   Registers INSURANCE_WALK_OBSERVATION at Cadence.NIGHTLY/7 via onApplicationBootstrap().
//   Pattern mirrors PrecursorMarketModule (D1c B3: NIGHTLY/6) exactly.
// C1+ fill this module with services, persistence, and the 2 scheduler producers.
//
// C0 wires:
//   - InsuranceTestController (test-only probe: /v1/_test/insurance/tunables-probe)
//     mounted ONLY when NODE_ENV !== 'production' (R-EC-2, same pattern as MarketTestController,
//     ReputationTestController, CitySimTestController — testControllersEnabled()).
//
// Architecture (C1+ chunks will fill providers):
//   REUSE: MarketModule imported for MarketRngService.seedFromDay (C4 determinism — no non-deterministic RNG;
//     the lot reuses the SHA-256 PRNG from D1b, never re-hosts it). SchedulerModule imported for
//     CitySimSchedulerService (C7/C8 producer registration at MINUTE/NIGHTLY cadence).
//   NEW (C1): 4 entity schemas + migrations 0059-0062 + R9.3 ch09 backport.
//   NEW (C2): UnderwritingWalkService (NIGHTLY tick — DD-WALK daily snapshot + monotone OR).
//   NEW (C3): FindingType menu + computePremium (deterministic integer cents, C4).
//   NEW (C4): ContractService (issuance + c_i clipboard projection).
//   NEW (C5): wary-gating (DD-WARY — reads wary_active + collateral_amount from D2, closes TD-119).
//   NEW (C6): ClaimsService PROPERTY/STASH (BuildingRaidedEvent subscriber — raid path UNCHANGED).
//   NEW (C7): CourierInterceptionService (MINUTE/order-N, seedFromDay — heat threshold → 'caught').
//   NEW (C8): FenceDefaultService (NIGHTLY/order-N, seedFromDay — buffer_load threshold → default).
//   NEW (C9): ClaimsService COURIER/FENCE payouts (consume 2 NEW events from C7/C8).
//   NEW (C10): FraudDetectionService (checkClaimAgainstWalk → 5× penalty + FRAUDED + almanac POISONED).
//   NEW (C11): InsuranceProjectionService (R2.2 P5 wall — clear=premium/statuses; banded=bitmask/risk).
//   NEW (C12): InsuranceAdminController (3 BO routes — GET insurance-state, POST force-fraud, PUT tunables).
//
// Zero-regression invariant (§0.2): a world with no active insurance contract → a raid behaves
// EXACTLY as today (the subscriber is inert). The 2 producers are no-op unless the heat/buffer
// threshold trips. This module is PURELY ADDITIVE.
//
// EXPORTS: (C1+ expose services consumed by the app graph; C0/C2 export UnderwritingWalkService).

import { Logger, Module, OnApplicationBootstrap } from '@nestjs/common';

import { testControllersEnabled } from '../../protocol/test-routes-gate';
import { SchedulerModule } from '../../citysim/scheduler/scheduler.module';
import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { CityEventBus } from '../../citysim/events/city-event-bus';
import { Cadence, CitySystemId } from '../../citysim/scheduler/city_sim_system';
import type { CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import { MarketModule } from '../market/market.module';
import { MoneyHoldingModule } from '../money_holding/money-holding.module';
import { DistributionModule } from '../distribution/distribution.module';
import { SellingModule } from '../selling/selling.module';
import { LieutenantModule } from '../lieutenant/lieutenant.module';
import { ReputationModule } from '../reputation/reputation.module';
import { InsuranceTestController } from './insurance-test.controller';
import { InsuranceAdminController } from './insurance-admin.controller';
import { InsuranceController } from './insurance.controller';
import { UnderwritingWalkService } from './underwriting-walk.service';
import { ContractService } from './contract.service';
import { InsuranceProjectionService } from './insurance.projection.service';
import { ClaimsService } from './claims.service';
import { CourierInterceptionService } from './courier-interception.service';
import { FenceDefaultService } from './fence-default.service';
import { FraudDetectionService } from './fraud-detection.service';
import { CoverageInducedDriftService } from './coverage-induced-drift.service';
import { RenewalService } from './renewal.service';

// InsuranceTestController: test-only probe routes (R-EC-2) — NOT registered in production.
// InsuranceAdminController: always-on (C12) — real BO routes, not conditional on NODE_ENV.
// InsuranceController: always-on (W6.2 C2) — the PLAYER-FACING route (POST /v1/me/insurance/quotes),
// not conditional on NODE_ENV (mirrors InsuranceAdminController's own always-on posture).
const controllers = [
  InsuranceAdminController,
  InsuranceController,
  ...(testControllersEnabled() ? [InsuranceTestController] : []),
];

@Module({
  // MarketModule: REUSE MarketRngService.seedFromDay for C4 deterministic draws (no non-deterministic RNG).
  // SchedulerModule: REUSE CitySimSchedulerService for C7/C8 producer registration at MINUTE/NIGHTLY.
  // MoneyHoldingModule: EXPORTS MoneyHoldingService (deposit probe in InsuranceTestController C4).
  // DistributionModule: EXPORTS DistributionService (dispatch probe in InsuranceTestController C5 — additive).
  //   No circular dependency: DistributionModule imports [SchedulerModule, AuthModule, ColdChainModule] only.
  // DbModule is @Global() — no explicit import needed.
  // SellingModule: EXPORTS SellingSellService (sell-tick-probe in InsuranceTestController C6 — additive).
  //   No circular dependency: SellingModule imports [SchedulerModule, AuthModule, ErlangStashModule,
  //   HeatContribModule, HushModule, MarketModule] — none of which import InsuranceModule.
  // LieutenantModule: EXPORTS LieutenantService (recruit-probe in InsuranceTestController C7 — additive).
  //   No circular dependency: LieutenantModule imports [SchedulerModule, ProductionModule, AuthModule,
  //   EnforcementModule, MoneyHoldingModule, DistributionModule, LaunderingModule, SellingModule, ReputationModule]
  //   — none of which import InsuranceModule.
  // ReputationModule: EXPORTS BossMirrorService (record-violation-probe in InsuranceTestController C8 — additive).
  //   No circular dependency: ReputationModule imports [SchedulerModule, MarketModule] — neither imports InsuranceModule.
  //   Note: LieutenantModule already imports ReputationModule; this explicit import allows InsuranceTestController
  //   to inject BossMirrorService directly (NestJS DI does NOT expose transitive re-exports without explicit import).
  imports: [MarketModule, SchedulerModule, MoneyHoldingModule, DistributionModule, SellingModule, LieutenantModule, ReputationModule],
  controllers,
  providers: [UnderwritingWalkService, ContractService, InsuranceProjectionService, ClaimsService, CourierInterceptionService, FenceDefaultService, FraudDetectionService, CoverageInducedDriftService, RenewalService],
  exports: [UnderwritingWalkService, ContractService, InsuranceProjectionService, ClaimsService, CourierInterceptionService, FenceDefaultService, FraudDetectionService, CoverageInducedDriftService, RenewalService],
})
export class InsuranceModule implements OnApplicationBootstrap {
  private readonly logger = new Logger(InsuranceModule.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly bus: CityEventBus,
    private readonly walk: UnderwritingWalkService,
    private readonly courierInterception: CourierInterceptionService,
    private readonly fenceDefault: FenceDefaultService,
    private readonly drift: CoverageInducedDriftService,
    private readonly renewal: RenewalService,
  ) {}

  /**
   * Register the INSURANCE_WALK_OBSERVATION NIGHTLY tick (C2 — DD-WALK).
   *
   * Pattern mirrors PrecursorMarketModule.onApplicationBootstrap() (D1c B3: NIGHTLY/6 — same
   * scheduler + cadence API). Slot NIGHTLY/7 = next free after PRECURSOR_MARKET_INFERENCE/6.
   *
   * The tick calls `UnderwritingWalkService.recordFindings(ctx)`:
   *   - Selects all WALKING walk rows for ctx.playerId.
   *   - For each: snapshots the coverage's substrate domain (read-only).
   *   - Derives the day's FindingType bits.
   *   - Monotone-ORs into findings_bitmask (DD-WALK invariant).
   *   - Idempotent per game-day via observation_depth guard.
   * Organically a no-op for players with no WALKING walk rows.
   */
  onApplicationBootstrap(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.INSURANCE_WALK_OBSERVATION,
      cadence: Cadence.NIGHTLY,
      order: 7,
      run: (ctx: CitySimTickContext) => this.walk.recordFindings(ctx),
    });
    this.logger.log(
      'InsuranceModule registered INSURANCE_WALK_OBSERVATION at NIGHTLY/7 — ' +
        'each in-game day: for each WALKING walk, snapshot coverage substrate domain (read-only), ' +
        'derive FindingType bits, monotone-OR into findings_bitmask (DD-WALK, canon :46-56). ' +
        'Idempotent per day (observation_depth guard). Math.random() BANNED (C4). ' +
        'Organically a no-op for players with no WALKING walk rows (zero-regression).',
    );

    // C7: register the INSURANCE_COURIER_INTERCEPTION MINUTE/21 tick (after EQUIPMENT_TIER_UPGRADE/20).
    // Probes courier_shift in_transit rows above courier_intercept_heat_threshold. Math.random()
    // BANNED (C4).
    // ⚠️ CORRIGÉ 2026-08-13 — ce commentaire décrivait le tick comme inerte au défaut livré : c'était
    // vrai à sa date, et FAUX depuis que OQ-8 a posé un défaut positif (voir le getter, qui rend 0.5
    // et porte l'historique). Un design de W6.2 a compté ce tick « dormant » sur la foi de ces lignes,
    // et s'est trompé de chunk. ⇒ un énoncé daté dans un commentaire de production a le même statut
    // qu'un énoncé daté dans un document : il se re-mesure, il ne se recopie pas.
    this.scheduler.registerSystem({
      id: CitySystemId.INSURANCE_COURIER_INTERCEPTION,
      cadence: Cadence.MINUTE,
      order: 21,
      run: (ctx: CitySimTickContext) => this.courierInterception.runMinuteTick(ctx),
    });
    this.logger.log(
      'InsuranceModule registered INSURANCE_COURIER_INTERCEPTION at MINUTE/21 — ' +
        'each in-game minute: probe courier_shift in_transit rows; above courier_intercept_heat_threshold, ' +
        'select shift via seedFromDay (C4 — NO Math.random()); set status=caught; emit CourierInterceptedEvent. ' +
        'Fires when patrol_heat ≥ courier_intercept_heat_threshold (positive default since OQ-8 — this ' +
        'tick is NOT inert). DD-PRODUCERS-MINIMAL (C7).',
    );

    // C8: register the INSURANCE_FENCE_DEFAULT NIGHTLY/8 tick (after INSURANCE_WALK_OBSERVATION/7).
    // Probes laundering_nodes.buffer_load above fence_default_exposure_threshold (default 0.80);
    // when threshold is crossed, select the defaulting node via seedFromDay (C4 — NO Math.random());
    // emit FenceDefaultedEvent. Organic no-op when no node exceeds the threshold (zero-regression).
    // Substrate correction: buffer_load is on laundering_nodes (NOT tail_risk_estimates).
    this.scheduler.registerSystem({
      id: CitySystemId.INSURANCE_FENCE_DEFAULT,
      cadence: Cadence.NIGHTLY,
      order: 8,
      run: (ctx: CitySimTickContext) => this.fenceDefault.runNightlyTick(ctx),
    });
    this.logger.log(
      'InsuranceModule registered INSURANCE_FENCE_DEFAULT at NIGHTLY/8 — ' +
        'each in-game night: probe laundering_nodes.buffer_load; above fence_default_exposure_threshold (0.80), ' +
        'select node via seedFromDay (C4 — NO Math.random()); emit FenceDefaultedEvent carrying throughputInPerHour. ' +
        'Substrate correction: buffer_load on laundering_nodes (NOT tail_risk_estimates). ' +
        'Organically a no-op when no node exceeds threshold (zero-regression). DD-PRODUCERS-MINIMAL (C8).',
    );

    // ── Drift C4: wire the StashFill subscriber for stash-ratio drift detection ──────────────────
    // The subscriber fires ADDITIVELY on every successful deposit (the deposit return value is UNCHANGED).
    // NO-OP when no active drift_state covers the player (zero-regression invariant).
    // The promise is fire-and-forget: the deposit hot-path does NOT await the subscriber.
    // Errors are caught-and-logged (never crash the deposit path).
    this.bus.onStashFill((e) => {
      this.drift.onStashFill(e).catch((err: unknown) => {
        this.logger.error(
          `onStashFill subscriber threw for player=${e.playerId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
    });
    this.logger.log(
      'InsuranceModule wired CityEventBus.onStashFill → CoverageInducedDriftService.onStashFill (Drift C4). ' +
        'NO-OP when no active drift_state covers the player (zero-regression).',
    );

    // ── Drift C5: wire the CourierRotated subscriber for courier-cadence drift detection ─────────
    // The subscriber fires ADDITIVELY on every successful dispatch (the dispatch return value is UNCHANGED).
    // NO-OP when no active drift_state covers the player (zero-regression invariant).
    // The promise is fire-and-forget: the dispatch hot-path does NOT await the subscriber.
    // Errors are caught-and-logged (never crash the dispatch path).
    this.bus.onCourierRotated((e) => {
      this.drift.onCourierRotated(e).catch((err: unknown) => {
        this.logger.error(
          `onCourierRotated subscriber threw for player=${e.playerId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
    });
    this.logger.log(
      'InsuranceModule wired CityEventBus.onCourierRotated → CoverageInducedDriftService.onCourierRotated (Drift C5). ' +
        'NO-OP when no active drift_state covers the player (zero-regression).',
    );

    // ── Drift C6: wire the DealAccepted subscriber for marginal-deal drift detection ──────────────
    // One aggregate event per sell tick (not per-deal — avoids async race across concurrent subscribers).
    // The subscriber fires ADDITIVELY after the sell hot-path commits (sell return value void is UNCHANGED).
    // NO-OP when no active drift_state covers the player (zero-regression invariant).
    // The promise is fire-and-forget: the sell hot-path does NOT await the subscriber.
    // Errors are caught-and-logged (never crash the sell path).
    this.bus.onDealAccepted((e) => {
      this.drift.onDealAccepted(e).catch((err: unknown) => {
        this.logger.error(
          `onDealAccepted subscriber threw for player=${e.playerId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
    });
    this.logger.log(
      'InsuranceModule wired CityEventBus.onDealAccepted → CoverageInducedDriftService.onDealAccepted (Drift C6). ' +
        'NO-OP when no active drift_state covers the player (zero-regression).',
    );

    // ── Drift C7: wire the LookoutAssigned subscriber for lookout-rate drift detection ─────────────
    // The subscriber fires ADDITIVELY on every SECURITY lieutenant recruit (the recruit return value is UNCHANGED).
    // NO-OP when no active drift_state covers the player (zero-regression invariant).
    // The promise is fire-and-forget: the recruit hot-path does NOT await the subscriber.
    // Errors are caught-and-logged (never crash the recruit path).
    this.bus.onLookoutAssigned((e) => {
      this.drift.onLookoutAssigned(e).catch((err: unknown) => {
        this.logger.error(
          `onLookoutAssigned subscriber threw for player=${e.playerId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
    });
    this.logger.log(
      'InsuranceModule wired CityEventBus.onLookoutAssigned → CoverageInducedDriftService.onLookoutAssigned (Drift C7). ' +
        'NO-OP when no active drift_state covers the player (zero-regression).',
    );

    // ── Drift C10/C11: register INSURANCE_DRIFT_TICK WEEKLY/8 tick ──────────────────────────────
    // §2.6 strict intra-tick order (combined system):
    //   (1) drift.runWeeklyTick    → recomputes true_loss_prob; stamps last_drift_tick; NO decay yet.
    //   (2) renewal.runWeeklyRenewalCheck → reads hazard_shift PRE-decay; re-quotes; pay-or-lapse.
    //   (3) drift.applyWeeklyDecay → hazard_shift ← max(0, hazard_shift − decay); LAST.
    // Idempotent per weekId (last_drift_tick guard). No Math.random(). Zero-regression (no-op when no rows).
    // weekId = Math.floor(ctx.gameMinute / WEEKLY_MINUTES) where WEEKLY_MINUTES = 7 × 24 × 60 = 10080.
    const WEEKLY_MINUTES = 7 * 24 * 60; // 10080 game-minutes per in-game week (mirrors reputation.module.ts:69)
    this.scheduler.registerSystem({
      id: CitySystemId.INSURANCE_DRIFT_TICK,
      cadence: Cadence.WEEKLY,
      order: 8,
      run: async (ctx: CitySimTickContext): Promise<void> => {
        const weekId = Math.floor(ctx.gameMinute / WEEKLY_MINUTES);
        // §2.6 strict intra-tick order:
        const tickedIds = await this.drift.runWeeklyTick(ctx, weekId);           // (1) recompute true_loss_prob, stamp last_drift_tick
        await this.renewal.runWeeklyRenewalCheck(ctx, weekId);                   // (2) renewal reads PRE-decay hazard_shift
        await this.drift.applyWeeklyDecay(ctx, weekId, tickedIds);               // (3) decay LAST (only ticked rows)
      },
    });
    this.logger.log(
      'InsuranceModule registered INSURANCE_DRIFT_TICK at WEEKLY/8 — §2.6 combined tick: ' +
        '(1) runWeeklyTick: recompute true_loss_prob (base·(1+α·shift)), stamp last_drift_tick (no decay yet). ' +
        '(2) runWeeklyRenewalCheck: re-quote expired contracts, reads PRE-decay hazard_shift, pay-or-LAPSE. ' +
        '(3) applyWeeklyDecay: hazard_shift ← max(0, shift−decay) LAST. ' +
        'Idempotent per weekId (last_drift_tick guard). No Math.random(). ' +
        'Organically a no-op for players with no drift_state rows (zero-regression). ' +
        'Canon: insurance_mechanics.md §4.2 (:100-110). C11.',
    );

    // ── Drift C8: wire the RuleViolation subscriber for DD-BOSSMIRROR-COUPLE hazard increment ────────
    // The subscriber fires ADDITIVELY on every recordViolation call (the void return is UNCHANGED).
    // NO-OP when no active drift_state covers the player (zero-regression invariant).
    // UNCONDITIONAL increment — no margin comparison (canon :116 "simultaneous" coupling).
    // Player-wide: ALL active drift_state rows for the player get hazard_shift++.
    // The promise is fire-and-forget: the recordViolation hot-path does NOT await the subscriber.
    // Errors are caught-and-logged (never crash the recordViolation path).
    this.bus.onRuleViolation((e) => {
      this.drift.onRuleViolation(e).catch((err: unknown) => {
        this.logger.error(
          `onRuleViolation subscriber threw for player=${e.playerId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
    });
    this.logger.log(
      'InsuranceModule wired CityEventBus.onRuleViolation → CoverageInducedDriftService.onRuleViolation (Drift C8). ' +
        'DD-BOSSMIRROR-COUPLE: UNCONDITIONAL player-wide hazard++ (canon :116). ' +
        'NO-OP when no active drift_state for the player (zero-regression). ' +
        '[RATIFIED C8 review]: player-wide increment — decision ratified by C8 E2E spec (both-ways, insurance_drift_rule_violation.spec.ts).',
    );
  }
}
