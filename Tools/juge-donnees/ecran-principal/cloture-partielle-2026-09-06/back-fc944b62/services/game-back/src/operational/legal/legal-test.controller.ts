// IMPLEMENTS: docs/superpowers/plans/2026-06-30-04d-A-lawyer-legal-plan.md
//             C0 (boot probe) + C2 (tunables probe) + C3 (case probe) + C5 (tier model probe)
//             + C6 (leak tick probe) + C7 (resolution probe) + C8 (burn_risk / LawyerBurnedEvent)
//             Pattern: services/game-back/src/operational/conflict/rival/rival-test.controller.ts
//             — 04d-A C0/C2/C3 — 2026-06-30 | C5 additions — 2026-06-30 | C7 additions — 2026-06-30
//             | C8 additions — 2026-06-30
//
// `LegalTestController` — TEST-ONLY probe routes for LawyerModule.
//
// C0 Routes:
//   GET /v1/_test/legal/ping — returns { ok: true } if LawyerModule is in the DI graph.
//     This is the SOLE C0 E2E assertion target: 404 = module NOT wired, 200 = wired.
//
// C9 Routes (P5 wall — LegalProjectionService):
//   GET /v1/_test/legal/legal-panel?playerId=<uuid>
//     Returns the player-facing LegalPanelView (toLegalPanel).
//     FALSIFIABLE (grep-zero): the JSON MUST NOT contain 'info_leak_rate', 'info_leak_total',
//       or 'burn_risk_score'. legal_p5_wall.spec.ts verifies this structurally.
//     FALSIFIABLE (banding): cases with different info_leak_total straddling a cut-point
//       produce different LeakBandBucket values (the player cannot deduce the raw float).
//     NOTE: this IS a production-shape route (no server-only fields in response).
//       The test controller mounts it here for direct testing; C10 will add the real
//       production API endpoint (not a _test route).
//
// C2 Routes:
//   GET  /v1/_test/legal/read-tunables  — returns all LawyerTunables getter values.
//     Used by lawyer_tunables_bootstrap.spec.ts to assert value-sensitive defaults.
//     C5 carry-forward #5: now includes all 4 ltCharge* getters (ltChargeTenureHighThreshold,
//     ltChargeTenureLowThreshold, ltChargeRoleHighThreshold, ltChargeRoleLowThreshold) for
//     registry coverage visibility.
//   POST /v1/_test/legal/probe-clamp    — body: { key, value } → { clamped }.
//     Applies LAWYER_TUNABLE_CAPS.clampLawyerToRange(key, value). FALSIFIABLE: a value > cap
//     must be clamped to the cap, not returned as-is.
//
// C3 Routes:
//   POST /v1/_test/legal/fire-building-raided
//     Body: { playerId, buildingId, districtId, blockId, gameMinute }
//   POST /v1/_test/legal/trigger-mis-subpoena
//     Body: { playerId, buildingIdHash, districtId, gameMinute }
//   GET /v1/_test/legal/case/:caseId
//     Returns the full legal_cases row (including server-only fields — test-only, R-EC-2).
//
// C5 Routes (tier model):
//   POST /v1/_test/legal/hire
//     Body: { playerId, tier, questId? }
//     Calls LawyerService.hire → returns { lawyerId, tier, costCents, cashAfter }.
//     FALSIFIABLE: Tier-2 debits tier2PerCaseCostCentsMin; Tier-3 debits tier3CorruptionLawyerBaseCostCents.
//     Insufficient balance → 402.
//
//   POST /v1/_test/legal/set-retainer
//     Body: { lawyerId, active: boolean }
//     Calls LawyerService.setRetainer → returns { lawyerId, retainerActive, monthlyCostCents }.
//
//   POST /v1/_test/legal/reassign-case
//     Body: { caseId, newLawyerId }
//     Calls LawyerService.reassignCase → returns { caseId, newLawyerId, infoLeakRate, ticksRemaining,
//                                                   caseDurationTicks }.
//     FALSIFIABLE: Tier-2 reduces infoLeakRate by 40%; Tier-2 extends ticksRemaining by 30%.
//
//   GET /v1/_test/legal/lawyer/:lawyerId
//     Returns the full lawyers row (including sessions_active, burn_risk_score — test-only, R-EC-2).
//
//   POST /v1/_test/legal/seed-cash
//     Body: { playerId, amountCents }
//     Seeds economy_states.cash_cents (UPSERT) for debit-testing setup.
//
//   GET /v1/_test/legal/read-cash?playerId=<uuid>
//     Returns { playerId, cashCents } from economy_states.
//     Used by lawyer_tiers.spec.ts to assert that hire() debited the correct amount.
//
// C7 Routes (resolution):
//   POST /v1/_test/legal/run-resolution-sweep
//     Body: { playerId: string, gameMinute?: number }
//     Calls LegalCaseService.resolveCasesForPlayer({ playerId, gameMinute }).
//     Bypasses the NIGHTLY scheduler — same code path (zero divergence guarantee).
//     Returns: { playerId, gameMinute, ok: true }
//     FALSIFIABLE: after calling, GET /all-cases-for-player shows cases with status≠'active'.
//
//   POST /v1/_test/legal/accept-plea-deal
//     Body: { caseId: string, gameMinute?: number }
//     Calls LegalCaseService.acceptPleaDeal(caseId, gameMinute).
//     Returns: { caseId, status: 'plea_down', resolvedAt: string }
//     FALSIFIABLE: case status transitions to 'plea_down' regardless of ticks_remaining.
//
//   GET /v1/_test/legal/all-cases-for-player?playerId=<uuid>
//     Returns ALL legal_cases for a player (any status — not just active).
//     Used by legal_resolution.spec.ts to assert resolved cases.
//     R2.2/P5: TEST-ONLY route (server-only fields exposed only here).
//
//   POST /v1/_test/legal/force-expire-case
//     Body: { caseId: string }
//     Directly sets ticks_remaining=0 for a case (test setup only — no gameplay path).
//     Required to make cases "eligible" for the resolution sweep without advancing game time.
//     Returns: { caseId, ticksRemaining: 0 }
//
// C8 Routes (burn_risk + LawyerBurnedEvent):
//   POST /v1/_test/legal/issue-tier3-payoff
//     Body: { caseId: string, gameMinute?: number }
//     Calls LawyerService.issueTier3Payoff(caseId, gameMinute).
//     Returns: { caseId, lawyerId, outcome: 'dismissed', burnRiskScore: number, cashAfter: number }
//     FALSIFIABLE: burn_risk_score increments by tier3PayoffBurnRiskIncrement on each call.
//     Preconditions: case must be active + Tier-3 lawyer + low-severity charge + sufficient cash.
//     Errors: 400 (wrong tier / wrong severity / not active), 402 (insufficient cash), 404 (not found).
//
//   POST /v1/_test/legal/run-burn-evaluation
//     Body: { playerId: string, gameMinute?: number }
//     Calls LawyerService.evaluateBurnForPlayer({ playerId, gameMinute }).
//     Returns: { playerId, gameMinute, ok: true }
//     FALSIFIABLE: when burn_risk_score > tier3BurnThreshold, LawyerBurnedEvent is emitted,
//     active Tier-3 cases are switched to Tier-1, and burn_risk_score is clamped to tier3BurnThreshold.
//
//   GET /v1/_test/legal/lawyer-burned-event?lawyerId=<uuid>
//     Returns: { lawyerId, count: number, lastGameMinute: number | null }
//     Returns the in-memory LawyerBurnedEvent counter for the given lawyerId.
//     count=0 → event has NOT been emitted since boot (falsifiable absence proof).
//     count>0 → event WAS emitted at least once. lastGameMinute = the last emission's gameMinute.
//     TEST-ONLY: this counter is in-process memory (reset on server restart).
//
// GATING: mounted ONLY when NODE_ENV !== 'production' (registered conditionally in
// LegalModule). In production this controller is simply not registered → 404.
// The E2E compose stack runs NODE_ENV=development so routes are available.

import { Controller, Get, Post, Body, Param, Query, HttpException, HttpStatus, Inject, OnModuleInit } from '@nestjs/common';
import { sql, eq, and } from 'drizzle-orm';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import { LawyerTunables, clampLawyerToRange } from './lawyer.tunables';
import { LegalCaseService } from './legal-case.service';
import { LegalCaseRepository } from './legal-case.repository';
import { LawyerService } from './lawyer.service';
import { LegalProjectionService } from './legal-projection.service';
import { economyState } from '../../db/schema/player_economy_state';
import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import type { KnowledgeSet, CaseResolvedEvent, LawyerBurnedEvent, LegalPanelView } from './legal.types';
import { legalCase } from '../../db/schema/legal';
import { CityEventBus } from '../../citysim/events/city-event-bus';

@Controller({ version: String(CURRENT_API_MAJOR) })
export class LegalTestController implements OnModuleInit {
  /**
   * In-memory counter for CaseResolvedEvents received since boot.
   * Maps caseId → { count, lastOutcome } for test assertions.
   * TEST-ONLY: never grows unboundedly in production because this controller is not mounted.
   */
  private readonly resolvedEventLog = new Map<string, { count: number; lastOutcome: string }>();

  /**
   * In-memory counter for LawyerBurnedEvents received since boot (C8).
   * Maps lawyerId → { count, lastGameMinute } for test assertions.
   * count=0 (missing key) → event NOT emitted. count>0 → emitted at least once.
   * TEST-ONLY: same lifecycle as resolvedEventLog.
   */
  private readonly burnedEventLog = new Map<string, { count: number; lastGameMinute: number }>();

  constructor(
    private readonly tunables: LawyerTunables,
    private readonly legalCaseService: LegalCaseService,
    private readonly caseRepo: LegalCaseRepository,
    private readonly lawyerService: LawyerService,
    private readonly projectionService: LegalProjectionService,
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly bus: CityEventBus,
  ) {}

  /**
   * onModuleInit — subscribe to CaseResolvedEvent (C7) and LawyerBurnedEvent (C8).
   * Keeps in-memory logs so the test controller can prove events were ACTUALLY emitted
   * (not just that DB rows changed). TEST-ONLY.
   */
  onModuleInit(): void {
    // C7: CaseResolvedEvent → resolvedEventLog
    this.bus.onCaseResolved((event: CaseResolvedEvent) => {
      const existing = this.resolvedEventLog.get(event.caseId);
      if (existing) {
        existing.count += 1;
        existing.lastOutcome = event.outcome;
      } else {
        this.resolvedEventLog.set(event.caseId, { count: 1, lastOutcome: event.outcome });
      }
    });

    // C8: LawyerBurnedEvent → burnedEventLog
    this.bus.onLawyerBurned((event: LawyerBurnedEvent) => {
      const existing = this.burnedEventLog.get(event.lawyerId);
      if (existing) {
        existing.count += 1;
        existing.lastGameMinute = event.gameMinute;
      } else {
        this.burnedEventLog.set(event.lawyerId, { count: 1, lastGameMinute: event.gameMinute });
      }
    });
  }

  /** C0 connectivity probe: returns { ok: true } if LawyerModule is in the DI graph. */
  @Get('_test/legal/ping')
  ping(): { ok: true } {
    return { ok: true };
  }

  /**
   * GET /v1/_test/legal/read-tunables
   *
   * Returns all LawyerTunables getter values as a plain object.
   * Used by `lawyer_tunables_bootstrap.spec.ts` C2 to assert value-sensitive defaults.
   * Anti-fabrication: the assertions read REAL getter output — not hardcoded echoes.
   * C4: no Math.random(), no Date.now().
   */
  @Get('_test/legal/read-tunables')
  readTunables(): Record<string, unknown> {
    return {
      // ── REUSE (gdd/14 ch16 backport) ───────────────────────────────────────────────────────
      tier1AutoAssignWindowHours:                    this.tunables.tier1AutoAssignWindowHours,
      tier3PayoffDropChargeCostCents:                this.tunables.tier3PayoffDropChargeCostCents,
      tier3PayoffDropChargeSuccessProbabilityBucket: this.tunables.tier3PayoffDropChargeSuccessProbabilityBucket,
      // ── Tier leak rates ────────────────────────────────────────────────────────────────────
      tier1InfoLeakRate:                             this.tunables.tier1InfoLeakRate,
      tier2InfoLeakReduction:                        this.tunables.tier2InfoLeakReduction,
      tier3InfoLeakReduction:                        this.tunables.tier3InfoLeakReduction,
      tier2CaseDurationMultiplier:                   this.tunables.tier2CaseDurationMultiplier,
      // ── Burn risk ──────────────────────────────────────────────────────────────────────────
      tier3BurnRiskPerUse:                           this.tunables.tier3BurnRiskPerUse,
      tier3BurnThreshold:                            this.tunables.tier3BurnThreshold,
      tier3BurnElevatedThreshold:                    this.tunables.tier3BurnElevatedThreshold,
      // ── Resolution probabilities ───────────────────────────────────────────────────────────
      pleaDownProbabilityTier2:                      this.tunables.pleaDownProbabilityTier2,
      dismissProbabilityTier3LowSeverity:            this.tunables.dismissProbabilityTier3LowSeverity,
      // ── Cost ladder (Tier-2/3; Tier-1 = GRATUIT = no key) ─────────────────────────────────
      tier3CorruptionLawyerBaseCostCents:            this.tunables.tier3CorruptionLawyerBaseCostCents,
      tier2PerCaseCostCentsMin:                      this.tunables.tier2PerCaseCostCentsMin,
      tier2PerCaseCostCentsMax:                      this.tunables.tier2PerCaseCostCentsMax,
      tier2RetainerMonthlyCostCents:                 this.tunables.tier2RetainerMonthlyCostCents,
      // ── Tier-3 payoff burn increment ───────────────────────────────────────────────────────
      tier3PayoffBurnRiskIncrement:                  this.tunables.tier3PayoffBurnRiskIncrement,
      // ── Case duration composites [PROV-Y26Q2] ─────────────────────────────────────────────
      caseDurationMisdemeanorTicks:                  this.tunables.caseDurationMisdemeanorTicks,
      caseDurationFelonyLowTicks:                    this.tunables.caseDurationFelonyLowTicks,
      caseDurationFelonyHighTicks:                   this.tunables.caseDurationFelonyHighTicks,
      caseDurationMajorCrimeTicks:                   this.tunables.caseDurationMajorCrimeTicks,
      // ── Lieutenant charge_severity cuts [PROV-Y26Q2] — C5 carry-forward #5 ────────────────
      // Added to the probe so that registry coverage is visible; ltCharge* getters are consumed
      // by LegalCaseService.deriveChargeSeverityForLieutenant (C3) and validated in the E2E suite.
      ltChargeTenureHighThreshold:                   this.tunables.ltChargeTenureHighThreshold,
      ltChargeTenureLowThreshold:                    this.tunables.ltChargeTenureLowThreshold,
      ltChargeRoleHighThreshold:                     this.tunables.ltChargeRoleHighThreshold,
      ltChargeRoleLowThreshold:                      this.tunables.ltChargeRoleLowThreshold,
      // ── Conviction base probabilities [PROV-Y26Q2] — C8 carry-forward #5 ────────────────────
      // Registry-fication of the inline CONVICTED_PROB constants (legal-case.service.ts:414-420).
      // Values unchanged (0.70/0.50/0.30); these getters source resolveSingleCase outcomes.
      convictionBaseProbabilityTier1:                this.tunables.convictionBaseProbabilityTier1,
      convictionBaseProbabilityTier2:                this.tunables.convictionBaseProbabilityTier2,
      convictionBaseProbabilityTier3:                this.tunables.convictionBaseProbabilityTier3,
    };
  }

  /**
   * POST /v1/_test/legal/probe-clamp
   *
   * Body: { key: string, value: number }
   * Returns: { clamped: number }
   *
   * Applies `clampLawyerToRange(key, value)` and returns the result.
   * FALSIFIABLE: posting { key: 'lawyer.tier1_info_leak_rate', value: 999 }
   * returns { clamped: 0.12 } because the range cap is 0.12 (not 999).
   * C4: no Math.random(), no Date.now().
   */
  @Post('_test/legal/probe-clamp')
  probeClamp(@Body() body: { key?: string; value?: number }): { clamped: number } {
    const key = body?.key;
    const value = body?.value;
    if (typeof key !== 'string' || key.length === 0) {
      throw new HttpException('key is required', HttpStatus.BAD_REQUEST);
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new HttpException('value must be a finite number', HttpStatus.BAD_REQUEST);
    }
    const clamped = clampLawyerToRange(key, value);
    return { clamped };
  }

  // ── C3 Routes ────────────────────────────────────────────────────────────────────────────────

  /**
   * POST /v1/_test/legal/fire-building-raided
   *
   * C3 test probe: fire the building-raided → lieutenant legal case path.
   *
   * Body: { playerId: string, buildingId: string, districtId: number, blockId: number, gameMinute: number }
   *
   * Calls `LegalCaseService.handleBuildingRaided(event)` directly (NOT via the event bus — the bus
   * fires async, making the caseId unavailable to return synchronously). Direct call is awaited.
   * The production path subscribes via `bus.onBuildingRaided` in `onModuleInit`; calling the public
   * method directly exercises the same codepath without the async gap.
   *
   * Returns:
   *   { caseId: string, defendantType: 'lieutenant', chargeSeverity: string, caseDurationTicks: number,
   *     knowledgeItemCount: number }
   *   OR
   *   { caseId: null, reason: 'no_delegated_lieutenant' }
   *     when no delegated lieutenant is assigned to the given building.
   *
   * FALSIFIABLE: a player with a delegated lieutenant at buildingId produces a case row; the same
   * player with NO lieutenant at the building produces { caseId: null }.
   * R2.2/P5: this route returns case metadata (caseId, chargeSeverity, caseDurationTicks, item count)
   * but NOT raw server-only scalars (info_leak_rate, info_leak_total). The GET /case/:caseId probe
   * returns the full row for server-side assertions in the test environment.
   * Anti-fabrication: no Math.random, no Date.now().
   */
  @Post('_test/legal/fire-building-raided')
  async fireBuildingRaided(
    @Body() body: {
      playerId?: string;
      buildingId?: string;
      districtId?: number;
      blockId?: number;
      gameMinute?: number;
    },
  ): Promise<
    | { caseId: string; defendantType: 'lieutenant'; chargeSeverity: string; caseDurationTicks: number; knowledgeItemCount: number }
    | { caseId: null; reason: string }
  > {
    const { playerId, buildingId, districtId = 1, blockId = 1, gameMinute = 0 } = body ?? {};
    if (!playerId || typeof playerId !== 'string') {
      throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    }
    if (!buildingId || typeof buildingId !== 'string') {
      throw new HttpException('buildingId required', HttpStatus.BAD_REQUEST);
    }

    const caseRow = await this.legalCaseService.handleBuildingRaided({
      type: 'building_raided',
      playerId,
      buildingId,
      districtId,
      blockId,
      gameMinute,
    });

    if (!caseRow) {
      return { caseId: null, reason: 'no_delegated_lieutenant' };
    }

    const knowledgeSet = caseRow.knowledge_set_ref as KnowledgeSet | null;
    return {
      caseId: caseRow.case_id,
      defendantType: 'lieutenant',
      chargeSeverity: caseRow.charge_severity,
      caseDurationTicks: caseRow.case_duration_ticks,
      knowledgeItemCount: knowledgeSet?.items?.length ?? 0,
    };
  }

  /**
   * POST /v1/_test/legal/trigger-mis-subpoena
   *
   * C3 test probe: fire the MIS tail_subpoena → lieutenant legal case path.
   *
   * Body: { playerId: string, buildingIdHash: number, districtId: number, gameMinute: number }
   *
   * `buildingIdHash` is the integer hash derived from the lieutenant UUID via
   * `lieutenantBuildingIdHash()` (first 8 hex chars of UUID → 31-bit positive int).
   * The test computes this in the spec (pure function, no secret).
   *
   * Calls `LegalCaseService.handleMISTailSubpoena(...)` directly. Returns the case metadata or
   * `{ caseId: null, reason: 'no_lieutenant_for_hash' }` when the reverse-hash lookup fails
   * (impossible in organic flow — only happens in test setup errors).
   *
   * Closes the deferred TD: this route drives the path that was previously "emit+log_only" in
   * `InspectionQueueDispatcherService` (§4.3 tail_subpoena → legal-case hook deferred TD).
   *
   * FALSIFIABLE: a player with a lieutenant whose UUID hashes to buildingIdHash produces a case row;
   * a buildingIdHash that matches no lieutenant produces { caseId: null }.
   * Anti-fabrication: no Math.random, no Date.now().
   */
  @Post('_test/legal/trigger-mis-subpoena')
  async triggerMISTailSubpoena(
    @Body() body: {
      playerId?: string;
      buildingIdHash?: number;
      districtId?: number;
      gameMinute?: number;
    },
  ): Promise<
    | { caseId: string; defendantType: 'lieutenant'; chargeSeverity: string; caseDurationTicks: number; knowledgeItemCount: number }
    | { caseId: null; reason: string }
  > {
    const { playerId, buildingIdHash, districtId = 1, gameMinute = 0 } = body ?? {};
    if (!playerId || typeof playerId !== 'string') {
      throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    }
    if (typeof buildingIdHash !== 'number' || !Number.isFinite(buildingIdHash)) {
      throw new HttpException('buildingIdHash required (integer)', HttpStatus.BAD_REQUEST);
    }

    const caseRow = await this.legalCaseService.handleMISTailSubpoena(
      playerId,
      buildingIdHash,
      districtId,
      gameMinute,
    );

    if (!caseRow) {
      return { caseId: null, reason: 'no_lieutenant_for_hash' };
    }

    const knowledgeSet = caseRow.knowledge_set_ref as KnowledgeSet | null;
    return {
      caseId: caseRow.case_id,
      defendantType: 'lieutenant',
      chargeSeverity: caseRow.charge_severity,
      caseDurationTicks: caseRow.case_duration_ticks,
      knowledgeItemCount: knowledgeSet?.items?.length ?? 0,
    };
  }

  /**
   * GET /v1/_test/legal/case/:caseId
   *
   * C3 test probe: read a `legal_cases` row by case_id for test assertions.
   *
   * Returns the FULL row (including server-only scalars `info_leak_rate`, `info_leak_total`) since
   * this is a TEST-ONLY route (not registered in production — `testControllersEnabled()` gate).
   * R2.2/P5 invariant holds in production: this route never reaches production.
   *
   * Falsifiable assertions the E2E test makes:
   *   - `status === 'active'` (case created in active state)
   *   - `ticks_remaining === case_duration_ticks` (not decremented yet)
   *   - `knowledge_set_ref.items.length > 0` (knowledge set populated, not empty)
   *   - `info_leak_rate > 0` (Tier-1 leak rate set from tunables)
   *
   * Returns 404 if the case does not exist.
   */
  @Get('_test/legal/case/:caseId')
  async getCase(
    @Param('caseId') caseId: string,
  ): Promise<Record<string, unknown>> {
    if (!caseId || typeof caseId !== 'string') {
      throw new HttpException('caseId required', HttpStatus.BAD_REQUEST);
    }
    const caseRow = await this.caseRepo.findCaseById(caseId);
    if (!caseRow) {
      throw new HttpException(`case ${caseId} not found`, HttpStatus.NOT_FOUND);
    }
    // Return as plain object for JSON serialization.
    // BigInt fields (none in legal_cases) would need .toString() — not applicable here.
    return caseRow as unknown as Record<string, unknown>;
  }

  // ── C5 Routes: tier model ─────────────────────────────────────────────────────────────────────

  /**
   * POST /v1/_test/legal/seed-cash
   *
   * Seed (UPSERT) `economy_states.cash_cents` for a player. Required for debit-assertion setup.
   *
   * Body: { playerId: string, amountCents: number }
   * Returns: { playerId, cashCents: string } (BigInt serialized as string)
   *
   * Pattern mirrors insurance-test.controller.ts:1120-1132 (UPSERT on conflict).
   * R2.2: cash_cents is a clear transaction value (DD-P5), not a hidden risk scalar.
   */
  @Post('_test/legal/seed-cash')
  async seedCash(
    @Body() body: { playerId?: string; amountCents?: number },
  ): Promise<{ playerId: string; cashCents: string }> {
    const { playerId, amountCents } = body ?? {};
    if (!playerId || typeof playerId !== 'string') {
      throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    }
    if (typeof amountCents !== 'number' || !Number.isFinite(amountCents) || amountCents < 0) {
      throw new HttpException('amountCents required (non-negative integer)', HttpStatus.BAD_REQUEST);
    }

    await this.db
      .insert(economyState)
      .values({ player_id: playerId, cash_cents: BigInt(Math.round(amountCents)) })
      .onConflictDoUpdate({
        target: economyState.player_id,
        set: { cash_cents: BigInt(Math.round(amountCents)) },
      });

    return { playerId, cashCents: String(Math.round(amountCents)) };
  }

  /**
   * GET /v1/_test/legal/read-cash?playerId=<uuid>
   *
   * Read `economy_states.cash_cents` for a player (test-only).
   * Returns: { playerId, cashCents: string } (BigInt serialized as string for JSON safety).
   *
   * Used by lawyer_tiers.spec.ts to assert debit amounts are correct.
   * R2.2: cash_cents is a clear transaction value (DD-P5), not a hidden risk scalar.
   */
  @Get('_test/legal/read-cash')
  async readCash(
    @Query('playerId') playerId: string,
  ): Promise<{ playerId: string; cashCents: string }> {
    if (!playerId || typeof playerId !== 'string') {
      throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    }

    const rows = await this.db
      .select({ cash_cents: economyState.cash_cents })
      .from(economyState)
      .where(eq(economyState.player_id, playerId))
      .limit(1);

    const cashCents = rows[0]?.cash_cents ?? 0n;
    return { playerId, cashCents: String(cashCents) };
  }

  /**
   * POST /v1/_test/legal/hire
   *
   * C5 test probe: hire a Tier-2 or Tier-3 lawyer (LawyerService.hire).
   *
   * Body: { playerId: string, tier: 'boutique' | 'corruption_pipeline', questId?: string }
   * Returns: { lawyerId, tier, costCents, sessionsActive }
   *
   * FALSIFIABLE:
   *   Tier-2: costCents === tier2PerCaseCostCentsMin (500000 default)
   *   Tier-3: costCents === tier3CorruptionLawyerBaseCostCents (4000000 default)
   *   Insufficient cash → 402.
   *
   * R2.2/P5: burn_risk_score is not returned by this route (server-only); the full
   *   lawyers row is available via GET /v1/_test/legal/lawyer/:lawyerId for test assertions.
   */
  @Post('_test/legal/hire')
  async hire(
    @Body() body: {
      playerId?: string;
      tier?: string;
      questId?: string;
    },
  ): Promise<{ lawyerId: string; tier: string; costCents: number; sessionsActive: number }> {
    const { playerId, tier, questId } = body ?? {};
    if (!playerId || typeof playerId !== 'string') {
      throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    }
    if (tier !== 'boutique' && tier !== 'corruption_pipeline') {
      throw new HttpException(
        "tier must be 'boutique' or 'corruption_pipeline'",
        HttpStatus.BAD_REQUEST,
      );
    }

    const lawyerRow = await this.lawyerService.hire(playerId, tier, { questId });

    // Resolve the cost for display in the response (same logic as LawyerService.resolveCostForTier).
    const costCents = this.lawyerService.resolveCostForTier(tier);

    return {
      lawyerId: lawyerRow.lawyer_id,
      tier: lawyerRow.tier,
      costCents,
      sessionsActive: lawyerRow.sessions_active,
    };
  }

  /**
   * POST /v1/_test/legal/set-retainer
   *
   * C5 test probe: toggle retainer for a lawyer (LawyerService.setRetainer).
   *
   * Body: { playerId: string, lawyerId: string, active: boolean }
   * Returns: { lawyerId, retainerActive, monthlyCostCents }
   *
   * FALSIFIABLE:
   *   active=true  → retainerActive=true,  monthlyCostCents = tier2RetainerMonthlyCostCents (200000 default)
   *   active=false → retainerActive=false, monthlyCostCents = null
   *
   * W6a C4 (finding #7) — `playerId` is now a required body field: no production JWT-gated route
   * exists for this method (§1.7 of the C0 checklist), so the `_test` probe is the only HTTP seam —
   * `playerId` is threaded through exactly like C3's `issue-tier3-payoff` / `run-surveillance` routes.
   */
  @Post('_test/legal/set-retainer')
  async setRetainer(
    @Body() body: { playerId?: string; lawyerId?: string; active?: boolean },
  ): Promise<{ lawyerId: string; retainerActive: boolean; monthlyCostCents: number | null }> {
    const { playerId, lawyerId, active } = body ?? {};
    if (!playerId || typeof playerId !== 'string') {
      throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    }
    if (!lawyerId || typeof lawyerId !== 'string') {
      throw new HttpException('lawyerId required', HttpStatus.BAD_REQUEST);
    }
    if (typeof active !== 'boolean') {
      throw new HttpException('active required (boolean)', HttpStatus.BAD_REQUEST);
    }

    const updated = await this.lawyerService.setRetainer(playerId, lawyerId, active);

    return {
      lawyerId: updated.lawyer_id,
      retainerActive: updated.retainer_active,
      monthlyCostCents: updated.retainer_monthly_cost_cents,
    };
  }

  /**
   * POST /v1/_test/legal/reassign-case
   *
   * C5 test probe: reassign a case to a new lawyer (LawyerService.reassignCase).
   *
   * Body: { playerId: string, caseId: string, newLawyerId: string }
   * Returns: { caseId, newLawyerId, infoLeakRate, ticksRemaining, caseDurationTicks }
   *
   * FALSIFIABLE (R2.2 server-only scalars asserted in test env only):
   *   Tier-2 boutique: infoLeakRate = tier1Rate × (1 − 0.40) [−40%]
   *   Tier-2 boutique: ticksRemaining = oldTicksRemaining × 1.30 [+30%]
   *   Tier-3 corruption_pipeline: infoLeakRate = tier1Rate × (1 − 0.80) [−80%]; ticks unchanged.
   *
   * W6a C4 (finding #8) — `playerId` is now a required body field, threaded the same way as
   * `set-retainer` above (no production route exists for this method — see §1.7 of the C0 checklist).
   */
  @Post('_test/legal/reassign-case')
  async reassignCase(
    @Body() body: { playerId?: string; caseId?: string; newLawyerId?: string },
  ): Promise<{
    caseId: string;
    newLawyerId: string;
    infoLeakRate: number;
    ticksRemaining: number;
    caseDurationTicks: number;
  }> {
    const { playerId, caseId, newLawyerId } = body ?? {};
    if (!playerId || typeof playerId !== 'string') {
      throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    }
    if (!caseId || typeof caseId !== 'string') {
      throw new HttpException('caseId required', HttpStatus.BAD_REQUEST);
    }
    if (!newLawyerId || typeof newLawyerId !== 'string') {
      throw new HttpException('newLawyerId required', HttpStatus.BAD_REQUEST);
    }

    const updatedCase = await this.lawyerService.reassignCase(playerId, caseId, newLawyerId);

    return {
      caseId: updatedCase.case_id,
      newLawyerId: updatedCase.lawyer_id ?? newLawyerId,
      infoLeakRate: updatedCase.info_leak_rate,
      ticksRemaining: updatedCase.ticks_remaining,
      caseDurationTicks: updatedCase.case_duration_ticks,
    };
  }

  /**
   * GET /v1/_test/legal/lawyer/:lawyerId
   *
   * C5 test probe: read a `lawyers` row by lawyer_id for test assertions.
   *
   * Returns the FULL row (including server-only fields burn_risk_score, sessions_active).
   * R2.2/P5: these server-only fields are never returned in production routes — only here.
   *
   * BigInt fields: none in lawyers (cash_cents is on economy_states, not lawyers).
   * Returns 404 if the lawyer does not exist.
   */
  @Get('_test/legal/lawyer/:lawyerId')
  async getLawyer(
    @Param('lawyerId') lawyerId: string,
  ): Promise<Record<string, unknown>> {
    if (!lawyerId || typeof lawyerId !== 'string') {
      throw new HttpException('lawyerId required', HttpStatus.BAD_REQUEST);
    }
    const lawyerRow = await this.caseRepo.findLawyerById(lawyerId);
    if (!lawyerRow) {
      throw new HttpException(`lawyer ${lawyerId} not found`, HttpStatus.NOT_FOUND);
    }
    return lawyerRow as unknown as Record<string, unknown>;
  }

  // ── C6 Routes: info-leak tick ────────────────────────────────────────────────────────────────

  /**
   * POST /v1/_test/legal/run-leak-tick
   *
   * C6 test probe: directly call tickLeakAccumulation for a player (bypass the scheduler).
   *
   * Body: { playerId: string, gameMinute?: number }
   * Returns: { playerId, gameMinute, ok: true }
   *
   * FALSIFIABLE:
   *   - After calling with an active case (info_leak_rate > 0, knowledge_set_ref non-empty):
   *     GET /case/:caseId shows info_leak_total > 0 and items_leaked.length > 0.
   *   - GET /read-declaration-ledger for the player shows a 'legal_case_leak' entry.
   *   - Calling AGAIN with same gameMinute (same day) → no ADDITIONAL leak (idempotency guard).
   *
   * Zero divergence guarantee: calls the SAME LegalCaseService.tickLeakAccumulation used by
   * the scheduler — no mock path.
   * Anti-fabrication: no Math.random. gameMinute defaults to 1440 (game-day 1 sentinel).
   * R2.2/P5: TEST-ONLY route (not in production). Server-only fields exposed for assertions.
   */
  @Post('_test/legal/run-leak-tick')
  async runLeakTick(
    @Body() body: { playerId?: string; gameMinute?: number },
  ): Promise<{ playerId: string; gameMinute: number; ok: true }> {
    const { playerId, gameMinute = 1440 } = body ?? {};
    if (!playerId || typeof playerId !== 'string') {
      throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    }
    await this.legalCaseService.tickLeakAccumulation({ playerId, gameMinute });
    return { playerId, gameMinute, ok: true };
  }

  /**
   * GET /v1/_test/legal/cases-for-player?playerId=<uuid>
   *
   * C6 test probe: list all active legal_cases rows for a player (including server-only fields).
   *
   * Returns: { cases: LegalCaseRow[] }
   * Used by: legal_info_leak_tick.spec.ts (C6) to assert info_leak_total, items_leaked, etc.
   * R2.2/P5: TEST-ONLY route (not in production).
   */
  @Get('_test/legal/cases-for-player')
  async casesForPlayer(
    @Query('playerId') playerId: string,
  ): Promise<{ cases: Record<string, unknown>[] }> {
    if (!playerId || typeof playerId !== 'string') {
      throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    }
    const cases = await this.caseRepo.listActiveCasesForPlayer(playerId);
    return { cases: cases as unknown as Record<string, unknown>[] };
  }

  /**
   * GET /v1/_test/legal/read-declaration-ledger?playerId=<uuid>&precinctId=<n>
   *
   * C6 test probe: read the declaration_ledger JSONB ring for a player + precinct.
   *
   * Returns: { playerId, precinctId, entries: unknown[] }
   * Used by: legal_info_leak_tick.spec.ts (C6) to assert that 'legal_case_leak' entries
   * were written to the declaration_ledger (the BPD seam proof).
   * R2.2/P5: TEST-ONLY route. declaration_ledger is server-only BPD data.
   */
  @Get('_test/legal/read-declaration-ledger')
  async readDeclarationLedger(
    @Query('playerId') playerId: string,
    @Query('precinctId') precinctIdStr: string,
  ): Promise<{ playerId: string; precinctId: number; entries: unknown[] }> {
    if (!playerId || typeof playerId !== 'string') {
      throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    }
    const precinctId = parseInt(precinctIdStr ?? '1', 10);
    if (Number.isNaN(precinctId) || precinctId < 1) {
      throw new HttpException('precinctId must be a positive integer', HttpStatus.BAD_REQUEST);
    }

    // Query precinct_memory.declaration_ledger directly via SQL.
    // The precinct_memory table may not exist yet for this player (first access) → return [].
    const rows = await this.db.execute(
      sql`SELECT declaration_ledger FROM precinct_memory
          WHERE player_id = ${playerId}::uuid AND precinct_id = ${precinctId}::int
          LIMIT 1`,
    );
    const row = rows.rows?.[0] as { declaration_ledger?: unknown } | undefined;
    const ledger = row?.declaration_ledger;
    const entries = Array.isArray(ledger) ? ledger : [];
    return { playerId, precinctId, entries };
  }

  // ── C7 Routes: resolution ────────────────────────────────────────────────────────────────────

  /**
   * GET /v1/_test/legal/case-resolved-event?caseId=<uuid>
   *
   * C7 test probe: query the in-memory CaseResolvedEvent log for a given caseId.
   *
   * Returns: { caseId, count, lastOutcome }
   *   count=0 → no CaseResolvedEvent was emitted for this case yet (or case does not exist).
   *   count=1 → event fired once (the expected case for a case resolved exactly once).
   *   lastOutcome → the 'outcome' field of the last received event.
   *
   * FALSIFIABLE: after a successful resolution sweep, count > 0 for the resolved case;
   *   before the sweep, count = 0 (no spurious event emission).
   *
   * The log is in-memory (not persisted across server restarts). It subscribes to the live bus
   * in `onModuleInit` — so it captures events emitted after the server started (normal E2E flow).
   * R2.2: this route returns count + qualitative outcome only — no raw scalars.
   */
  @Get('_test/legal/case-resolved-event')
  getCaseResolvedEvent(
    @Query('caseId') caseId: string,
  ): { caseId: string; count: number; lastOutcome: string | null } {
    if (!caseId || typeof caseId !== 'string') {
      throw new HttpException('caseId required', HttpStatus.BAD_REQUEST);
    }
    const entry = this.resolvedEventLog.get(caseId);
    return {
      caseId,
      count: entry?.count ?? 0,
      lastOutcome: entry?.lastOutcome ?? null,
    };
  }

  /**
   * POST /v1/_test/legal/run-resolution-sweep
   *
   * C7 test probe: directly call resolveCasesForPlayer for a player (bypass the NIGHTLY scheduler).
   *
   * Body: { playerId: string, gameMinute?: number }
   * Returns: { playerId, gameMinute, ok: true }
   *
   * FALSIFIABLE:
   *   - After calling with an active case where ticks_remaining=0:
   *     GET /all-cases-for-player shows the case with status ≠ 'active'.
   *   - GET /case/:caseId shows the case with status ∈ { convicted, acquitted, plea_down, dismissed }.
   *   - On conviction: GET /read-declaration-ledger shows additional final-dump entries.
   *
   * Zero divergence: calls the SAME LegalCaseService.resolveCasesForPlayer used by the scheduler.
   * Anti-fabrication: no Math.random. gameMinute defaults to 0.
   * R2.2/P5: TEST-ONLY route (server-only fields available via /case/:caseId for assertions).
   */
  @Post('_test/legal/run-resolution-sweep')
  async runResolutionSweep(
    @Body() body: { playerId?: string; gameMinute?: number },
  ): Promise<{ playerId: string; gameMinute: number; ok: true }> {
    const { playerId, gameMinute = 0 } = body ?? {};
    if (!playerId || typeof playerId !== 'string') {
      throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    }
    await this.legalCaseService.resolveCasesForPlayer({ playerId, gameMinute });
    return { playerId, gameMinute, ok: true };
  }

  /**
   * POST /v1/_test/legal/accept-plea-deal
   *
   * C7 test probe: player accepts a plea deal (early case resolution).
   *
   * Body: { playerId: string, caseId: string, gameMinute?: number }
   * Returns: { caseId, status: 'plea_down', resolvedAt: string | null }
   *
   * FALSIFIABLE:
   *   - The case status transitions to 'plea_down' regardless of ticks_remaining (early resolution).
   *   - resolved_at is non-null.
   *   - Calling again on the same case returns 409 (already resolved).
   *
   * Anti-fabrication: no Math.random. gameMinute defaults to 0.
   *
   * W6a C4 (finding #9) — `playerId` is now a required body field, threaded the same way as the
   * other `_test/legal/*` routes above (no production route exists for this method).
   */
  @Post('_test/legal/accept-plea-deal')
  async acceptPleaDeal(
    @Body() body: { playerId?: string; caseId?: string; gameMinute?: number },
  ): Promise<{ caseId: string; status: string; resolvedAt: string | null }> {
    const { playerId, caseId, gameMinute = 0 } = body ?? {};
    if (!playerId || typeof playerId !== 'string') {
      throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    }
    if (!caseId || typeof caseId !== 'string') {
      throw new HttpException('caseId required', HttpStatus.BAD_REQUEST);
    }

    let updated: import('../../db/schema/legal').LegalCaseRow;
    try {
      updated = await this.legalCaseService.acceptPleaDeal(playerId, caseId, gameMinute);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Surface "not active" as 409 Conflict (idempotency guard).
      if (msg.includes('not active')) {
        throw new HttpException(`Case is already resolved: ${msg}`, HttpStatus.CONFLICT);
      }
      if (msg.includes('not found')) {
        throw new HttpException(`Case not found: ${msg}`, HttpStatus.NOT_FOUND);
      }
      throw new HttpException(`acceptPleaDeal failed: ${msg}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return {
      caseId: updated.case_id,
      status: updated.status,
      resolvedAt: updated.resolved_at ? updated.resolved_at.toISOString() : null,
    };
  }

  /**
   * GET /v1/_test/legal/all-cases-for-player?playerId=<uuid>
   *
   * C7 test probe: list ALL legal_cases for a player (any status — not just active).
   *
   * Returns: { cases: LegalCaseRow[] }
   * Used by: legal_resolution.spec.ts (C7) to assert that resolved cases have the right status.
   * R2.2/P5: TEST-ONLY route. Server-only fields (info_leak_rate, info_leak_total) are included.
   *
   * The existing /cases-for-player route returns ONLY active cases (listActiveCasesForPlayer);
   * this route returns ALL cases including resolved ones (listAllCasesForPlayer).
   */
  @Get('_test/legal/all-cases-for-player')
  async allCasesForPlayer(
    @Query('playerId') playerId: string,
  ): Promise<{ cases: Record<string, unknown>[] }> {
    if (!playerId || typeof playerId !== 'string') {
      throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    }
    const cases = await this.caseRepo.listAllCasesForPlayer(playerId);
    return { cases: cases as unknown as Record<string, unknown>[] };
  }

  /**
   * POST /v1/_test/legal/force-expire-case
   *
   * C7 test setup: directly set ticks_remaining=0 on a case to make it eligible for resolution.
   *
   * Body: { caseId: string }
   * Returns: { caseId, ticksRemaining: 0 }
   *
   * This is a TEST-ONLY escape hatch: in production, ticks_remaining decrements via LEGAL_LEAK_TICK
   * (C6) over many game-minutes. In E2E tests we cannot wait that long (case durations are 3-30 game
   * days × 1440 ticks). This route bypasses the tick countdown for test setup only.
   *
   * Guard: only works on active cases (status='active') — cannot expire a resolved case.
   * Returns 404 if the case does not exist. Returns 409 if the case is already resolved.
   */
  @Post('_test/legal/force-expire-case')
  async forceExpireCase(
    @Body() body: { caseId?: string },
  ): Promise<{ caseId: string; ticksRemaining: number }> {
    const { caseId } = body ?? {};
    if (!caseId || typeof caseId !== 'string') {
      throw new HttpException('caseId required', HttpStatus.BAD_REQUEST);
    }

    // Read first to validate existence + status.
    const caseRow = await this.caseRepo.findCaseById(caseId);
    if (!caseRow) {
      throw new HttpException(`case ${caseId} not found`, HttpStatus.NOT_FOUND);
    }
    if (caseRow.status !== 'active') {
      throw new HttpException(
        `case ${caseId} is already resolved (status=${caseRow.status})`,
        HttpStatus.CONFLICT,
      );
    }

    // Directly set ticks_remaining=0 (test-only — no gameplay path; bypasses tick countdown).
    await this.db
      .update(legalCase)
      .set({ ticks_remaining: 0 })
      .where(
        and(
          eq(legalCase.case_id, caseId),
          eq(legalCase.status, 'active'),
        ),
      );

    return { caseId, ticksRemaining: 0 };
  }

  // ── C8 Routes (burn_risk + LawyerBurnedEvent) ────────────────────────────────────────────────

  /**
   * POST /v1/_test/legal/issue-tier3-payoff
   *
   * C8 test probe: call `LawyerService.issueTier3Payoff(playerId, caseId, gameMinute)`.
   *
   * Body: { playerId: string, caseId: string, gameMinute?: number }
   *   W6a C3: `playerId` is now REQUIRED — the service throws 404 `RESOURCE_NOT_FOUND` if `caseId`
   *   does not belong to `playerId` (joint read, P-A). Pre-C3 this probe took no `playerId` at all.
   *
   * Returns: { caseId, lawyerId, outcome: 'dismissed', burnRiskScore: number, cashAfter: number }
   *
   * FALSIFIABLE:
   *   1. burn_risk_score increments by tier3PayoffBurnRiskIncrement on each successful call.
   *   2. cash_cents decrements by tier3PayoffDropChargeCostCents.
   *   3. case status → 'dismissed'.
   *   4. Calling with a Tier-2 lawyer (not Tier-3) returns 400.
   *   5. Calling with a high-severity charge returns 400.
   *   6. W6a C3: calling with a `caseId` owned by a DIFFERENT `playerId` returns 404, victim's cash
   *      and case status untouched.
   *
   * R2.2/P5: burnRiskScore returned here because this is a TEST-ONLY route (R-EC-2).
   *   In production the player never sees the raw float; only BurnRiskBucket (C9).
   * Anti-fabrication: no Math.random, no Date.now().
   */
  @Post('_test/legal/issue-tier3-payoff')
  async issueTier3Payoff(
    @Body() body: { playerId?: string; caseId?: string; gameMinute?: number },
  ): Promise<{ caseId: string; lawyerId: string; outcome: string; burnRiskScore: number; cashAfter: string }> {
    const { playerId, caseId, gameMinute = 0 } = body ?? {};
    if (!playerId || typeof playerId !== 'string') {
      throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    }
    if (!caseId || typeof caseId !== 'string') {
      throw new HttpException('caseId required', HttpStatus.BAD_REQUEST);
    }

    const { caseRow, lawyerRow } = await this.lawyerService.issueTier3Payoff(playerId, caseId, gameMinute);

    // Read cashAfter from economy_states (BigInt → string, consistent with read-cash endpoint).
    const cashRows = await this.db
      .select({ cash_cents: economyState.cash_cents })
      .from(economyState)
      .where(eq(economyState.player_id, caseRow.player_id))
      .limit(1);
    const cashAfter = String(cashRows[0]?.cash_cents ?? 0n);

    return {
      caseId: caseRow.case_id,
      lawyerId: lawyerRow.lawyer_id,
      outcome: caseRow.status,
      burnRiskScore: lawyerRow.burn_risk_score,
      cashAfter,
    };
  }

  /**
   * POST /v1/_test/legal/run-burn-evaluation
   *
   * C8 test probe: call `LawyerService.evaluateBurnForPlayer({ playerId, gameMinute })`.
   *
   * Body: { playerId: string, gameMinute?: number }
   * Returns: { playerId, gameMinute, ok: true }
   *
   * FALSIFIABLE (requires `GET /lawyer-burned-event?lawyerId=<uuid>` and `GET /lawyer/:lawyerId`):
   *   - When burn_risk_score > tier3BurnThreshold:
   *     • LawyerBurnedEvent is emitted (lawyer-burned-event count increments).
   *     • Active Tier-3 cases switch to Tier-1 (GET /all-cases-for-player shows new lawyerId).
   *     • burn_risk_score clamped to tier3BurnThreshold (GET /lawyer/:lawyerId confirms).
   *   - When burn_risk_score ≤ tier3BurnThreshold: no event, no change (idempotency proof).
   *
   * Bypasses the NIGHTLY scheduler — same code path (zero divergence guarantee).
   * Anti-fabrication: no Math.random, no Date.now().
   */
  @Post('_test/legal/run-burn-evaluation')
  async runBurnEvaluation(
    @Body() body: { playerId?: string; gameMinute?: number },
  ): Promise<{ playerId: string; gameMinute: number; ok: true }> {
    const { playerId, gameMinute = 0 } = body ?? {};
    if (!playerId || typeof playerId !== 'string') {
      throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    }

    await this.lawyerService.evaluateBurnForPlayer({ playerId, gameMinute });

    return { playerId, gameMinute, ok: true };
  }

  /**
   * GET /v1/_test/legal/lawyer-burned-event?lawyerId=<uuid>
   *
   * C8 test probe: read the in-memory LawyerBurnedEvent counter for the given lawyerId.
   *
   * Returns: { lawyerId: string, count: number, lastGameMinute: number | null }
   *   count=0 → LawyerBurnedEvent has NOT been emitted for this lawyerId since boot.
   *   count>0 → emitted at least once. lastGameMinute = the most recent emission's gameMinute.
   *
   * FALSIFIABLE:
   *   - Before burn: count=0.
   *   - After burn (evaluateBurnForPlayer when score > threshold): count=1.
   *   - After second evaluation (idempotency): count=1 (no re-fire because score clamped).
   *
   * R2.2/P5: This route emits no raw scalars — only a count and gameMinute (qualitative). TEST-ONLY.
   */
  @Get('_test/legal/lawyer-burned-event')
  getLawyerBurnedEvent(
    @Query('lawyerId') lawyerId?: string,
  ): { lawyerId: string; count: number; lastGameMinute: number | null } {
    if (!lawyerId || typeof lawyerId !== 'string') {
      throw new HttpException('lawyerId query param required', HttpStatus.BAD_REQUEST);
    }
    const entry = this.burnedEventLog.get(lawyerId);
    return {
      lawyerId,
      count: entry?.count ?? 0,
      lastGameMinute: entry?.lastGameMinute ?? null,
    };
  }

  /**
   * GET /v1/_test/legal/legal-panel?playerId=<uuid>
   *
   * C9 projection probe: returns the player-facing LegalPanelView from toLegalPanel.
   *
   * Returns: LegalPanelView
   *   { activeCases: ActiveCaseView[], lawyerRoster: LawyerRosterView[] }
   *
   * FALSIFIABLE (grep-zero / R2.2 P5 wall):
   *   The JSON response MUST NOT contain the strings:
   *     'info_leak_rate'  — server-only float
   *     'info_leak_total' — server-only float
   *     'burn_risk_score' — server-only float
   *   legal_p5_wall.spec.ts verifies this by stringifying the response body and running
   *   a structural grep over the key names (not just values).
   *
   * FALSIFIABLE (banding):
   *   Two cases with different info_leak_total straddling a cut-point → different
   *   LeakBandBucket values (the player cannot infer the raw float). Tested by seeding
   *   two cases with SQL-direct info_leak_total values and asserting different bands.
   *
   * FALSIFIABLE (burn_risk absence in roster):
   *   Two lawyers with different sub-threshold burn_risk_score both show NO burn signal
   *   in the player panel (burn_risk_score is stripped; the player sees only the roster).
   */
  @Get('_test/legal/legal-panel')
  async getLegalPanel(
    @Query('playerId') playerId?: string,
  ): Promise<LegalPanelView> {
    if (!playerId || typeof playerId !== 'string') {
      throw new HttpException('playerId query param required', HttpStatus.BAD_REQUEST);
    }
    return this.projectionService.toLegalPanel(playerId);
  }
}
