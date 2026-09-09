// IMPLEMENTS: docs/superpowers/plans/2026-06-30-04d-A-lawyer-legal-plan.md C6 + C7 + C8
//             Canon: docs/tech/04d_meta_market_lawyer_and_internal_affairs/lawyer_legal_system.md §2 (G5)
//             — 04d-A C6 — 2026-06-30 | C7 additions — 2026-06-30 | C8 additions — 2026-06-30
//
// `LawyerLegalTickService` — registers LEGAL_LEAK_TICK (MINUTE/23) and
//   LEGAL_NIGHTLY_TICK (NIGHTLY/16) on the shared CitySimScheduler.
//
// C6 scope:
//   - onApplicationBootstrap: registerSystem LEGAL_LEAK_TICK at Cadence.MINUTE / order 23.
//   - runTick: delegates to LegalCaseService.tickLeakAccumulation (the tick body).
//
// C7 additions:
//   - onApplicationBootstrap: registerSystem LEGAL_NIGHTLY_TICK at Cadence.NIGHTLY / order 16
//     (next free after INFO_LOOP_DAILY_TICK/15, 04b-C C9).
//   - runNightlyTick: delegates to LegalCaseService.resolveCasesForPlayer (the resolution sweep).
//
// C8 additions:
//   - runNightlyTick: after resolveCasesForPlayer, calls LawyerService.evaluateBurnForPlayer.
//     Burn evaluation is AFTER resolution so that a case resolved during the same night does not
//     trigger a burn sweep on an already-resolved case (defensive ordering).
//
// MINUTE/23 = next free after RIVAL_DECISION_TICK/22 (04b-A C5).
// NIGHTLY/16 = next free after INFO_LOOP_DAILY_TICK/15 (04b-C C9).
//
// L1 empty-state skip:
//   tickLeakAccumulation returns early if no active legal_cases for player → ZERO writes.
//   resolveCasesForPlayer returns early if no eligible cases (active + ticks_remaining<=0) → ZERO writes.
//   evaluateBurnForPlayer returns early if no Tier-3 lawyers for player → ZERO writes.
//   All three guarantee byte-identical behavior for pre-A / no-case worlds.
//
// Deterministic: makeRng seeded draws inside both tick bodies — NO Math.random, NO Date.now.
// Pattern: mirrors LieutenantTickService (lieutenant-tick.service.ts:128-150) and
//          InsuranceModule.onApplicationBootstrap (insurance.module.ts:139-167).
// Zero-regression: additive registrations. No existing system is mutated.

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId } from '../../citysim/scheduler/city_sim_system';
import type { CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import { LegalCaseService } from './legal-case.service';
import { LawyerService } from './lawyer.service';

@Injectable()
export class LawyerLegalTickService implements OnApplicationBootstrap {
  private readonly logger = new Logger(LawyerLegalTickService.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly legalCaseService: LegalCaseService,
    private readonly lawyerService: LawyerService,   // C8: burn sweep
  ) {}

  // ── Bootstrap: register the ticks ───────────────────────────────────────────────────────────

  /**
   * onApplicationBootstrap — register LEGAL_LEAK_TICK at MINUTE/23 and
   * LEGAL_NIGHTLY_TICK at NIGHTLY/16.
   *
   * Pattern: mirrors LieutenantTickService.onApplicationBootstrap (lieutenant-tick.service.ts:128-141)
   * and InsuranceModule (insurance.module.ts:153-167): register via registerSystem at boot.
   *
   * The SCHEDULE slots MUST exist in CitySimSchedulerService.SCHEDULE — registerSystem throws if not.
   * Both slots were added to SCHEDULE in C7 (city_sim_system.ts + city_sim_scheduler.service.ts).
   */
  onApplicationBootstrap(): void {
    // ── MINUTE/23 — info-leak drip tick (C6) ────────────────────────────────────────────────
    this.scheduler.registerSystem({
      id: CitySystemId.LEGAL_LEAK_TICK,
      cadence: Cadence.MINUTE,
      order: 23,
      run: (ctx: CitySimTickContext) => this.runTick(ctx),
    });
    this.logger.log(
      'LawyerLegalTickService registered LEGAL_LEAK_TICK at MINUTE/23 — ' +
        'each in-game minute: for each active legal_cases row for the player, rolls seeded info_leak_rate ' +
        '(makeRng(`leak:${caseId}:${gameDay}`) — deterministic/idempotent per day); on hit, draws ONE ' +
        'unleaked item from knowledge_set_ref, appends to items_leaked, increments info_leak_total, and ' +
        'writes a legal_case_leak declaration via PoliceMemoryService.appendDeclarationEntry ' +
        '(source_origin_id=case_id, the slot reserved :168). Always decrements ticks_remaining. ' +
        'L1 empty-state skip: no active cases → ZERO writes (zero-regression guarantee). ' +
        'Per-case try/catch. Deterministic (NO Math.random, NO Date.now). 04d-A C6.',
    );

    // ── NIGHTLY/16 — resolution sweep tick (C7) ─────────────────────────────────────────────
    this.scheduler.registerSystem({
      id: CitySystemId.LEGAL_NIGHTLY_TICK,
      cadence: Cadence.NIGHTLY,
      order: 16,
      run: (ctx: CitySimTickContext) => this.runNightlyTick(ctx),
    });
    this.logger.log(
      'LawyerLegalTickService registered LEGAL_NIGHTLY_TICK at NIGHTLY/16 — ' +
        'each in-game night: scans legal_cases with status=active AND ticks_remaining<=0 for each player; ' +
        'for each eligible case: seeded roll (makeRng(`resolve:${caseId}`)) gated by tier+charge → ' +
        'dismissed (Tier-3+low only, dismissProbabilityTier3LowSeverity) / ' +
        'plea_down (Tier-2, pleaDownProbabilityTier2) / ' +
        'convicted (tier-gated base rate [PROV-Y26Q2]: 70%/50%/30% for T1/T2/T3) / ' +
        'acquitted. On convicted: final-dump remaining items to declaration_ledger. ' +
        'Emits CaseResolvedEvent (qualitative only, R2.2/P5). ' +
        'L1 empty-state skip: no eligible cases → ZERO writes. Per-case try/catch. ' +
        'Deterministic (NO Math.random, NO Date.now). 04d-A C7.',
    );
  }

  // ── Tick bodies ──────────────────────────────────────────────────────────────────────────────

  /**
   * runTick — the registered MINUTE/23 tick body (C6 info-leak drip).
   *
   * Delegates to LegalCaseService.tickLeakAccumulation (the canonical tick body).
   * Using LegalCaseService as the tick body ensures zero divergence between the scheduled
   * path and the test-controller direct-call path (same code path in both cases).
   * Pattern: mirrors LieutenantTickService.runTick → applyForLieutenant delegation.
   */
  private async runTick(ctx: CitySimTickContext): Promise<void> {
    await this.legalCaseService.tickLeakAccumulation(ctx);
  }

  /**
   * runNightlyTick — the registered NIGHTLY/16 tick body (C7 resolution sweep + C8 burn eval).
   *
   * Sequence (ordered):
   *   1. LegalCaseService.resolveCasesForPlayer — resolve eligible cases (C7).
   *   2. LawyerService.evaluateBurnForPlayer    — burn sweep (C8).
   *
   * Burn evaluation is sequenced AFTER resolution so that cases resolved during the same night
   * are already in 'resolved' state and `findActiveCasesForLawyer` skips them (active guard).
   * This prevents double-handling of a case that both resolved and triggered burn in one night.
   *
   * Same delegation pattern as runTick: test-controller direct calls and scheduler calls
   * both go through the same service methods (zero divergence guarantee).
   */
  private async runNightlyTick(ctx: CitySimTickContext): Promise<void> {
    // Step 1: resolve eligible cases (C7 sweep).
    await this.legalCaseService.resolveCasesForPlayer(ctx);

    // Step 2: burn evaluation per Tier-3 lawyer (C8 sweep).
    await this.lawyerService.evaluateBurnForPlayer(ctx);
  }
}
