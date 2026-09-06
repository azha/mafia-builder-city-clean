// IMPLEMENTS: docs/superpowers/plans/2026-07-01-04d-B-internal-affairs-plan.md C4 (IA tick registration)
//             C5 (wire executeDiscovery into NIGHTLY via runDiscoveryPass — real prod trigger).
//             C6 (register IA_DECAY_TICK WEEKLY/10 → applyWeeklySuspicionDecay).
//             Canon: internal_affairs_corruption_discovery.md §3 + scheduler registration pattern
//             Precedent: services/game-back/src/operational/insurance/insurance.module.ts:139 NIGHTLY/7
//                        + :265 WEEKLY/8 (the WEEKLY pattern mirror for IA_DECAY_TICK).
//             — 04d-B C4 — 2026-07-02 | C5 extension — 2026-07-02 | C6 extension — 2026-07-02
//
// `IATickService` — registers the IA NIGHTLY/17 and WEEKLY/10 CitySimSystems.
//
// Pattern mirrors `InsuranceModule.onApplicationBootstrap` (insurance.module.ts:138-151, :265).
//
// C4: registers IA_THRESHOLD_TICK (NIGHTLY/17) → evaluateThresholdCrossing (opens investigations).
// C5: extends the NIGHTLY/17 run to ALSO call IADiscoveryService.runDiscoveryPass (discovery sweep).
//     The two calls are sequential in the same NIGHTLY tick:
//       1. evaluateThresholdCrossing(ctx) — opens new investigations for targets above threshold.
//       2. runDiscoveryPass(ctx.gameMinute) — evaluates open investigations for double-condition,
//          calls executeDiscovery for qualifying targets → forward cascade (forceBurnLawyer, etc.).
//     Targets opened in step 1 are visible to step 2 (sequential commits, PG read-committed).
// C6: registers IA_DECAY_TICK (WEEKLY/10) → applyWeeklySuspicionDecay (decay + cool-off + use-spreading).
//     weekId = Math.floor(ctx.gameMinute / WEEKLY_MINUTES) — deterministic, no Date.now().
//     Idempotent per game-week (last_weekly_decay_at guard: see ia-decay.service.ts).
//
// Zero-regression: additive — no existing tick is modified or removed.
// GLOBAL scope: both ticks scan internal_affairs_targets (GLOBAL table, no player FK);
//   per-target idempotency guards prevent double-ops.

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { CitySystemId, Cadence } from '../../citysim/scheduler/city_sim_system';
import type { CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import { IAInvestigationService } from './ia-investigation.service';
import { IADiscoveryService } from './ia-discovery.service';
import { IADecayService, IA_WEEKLY_MINUTES } from './ia-decay.service';

@Injectable()
export class IATickService implements OnApplicationBootstrap {
  private readonly logger = new Logger(IATickService.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly investigation: IAInvestigationService,
    // C5: discovery pass — the PRODUCTION trigger for executeDiscovery (real game path).
    // Injected here so the NIGHTLY/17 tick runs both the threshold evaluation (opens
    // investigations) AND the discovery sweep (evaluates open investigations for double-condition).
    private readonly discovery: IADiscoveryService,
    // C6: decay service — the PRODUCTION trigger for applyWeeklySuspicionDecay (IA_DECAY_TICK WEEKLY/10).
    private readonly decay: IADecayService,
  ) {}

  /**
   * `onApplicationBootstrap` — register IA_THRESHOLD_TICK (NIGHTLY/17) + IA_DECAY_TICK (WEEKLY/10).
   *
   * NIGHTLY/17 pattern: mirrors `InsuranceModule.onApplicationBootstrap` (insurance.module.ts:138-151):
   *   - NIGHTLY/7: INSURANCE_WALK_OBSERVATION
   *   - ...
   *   - NIGHTLY/16: LEGAL_NIGHTLY_TICK
   *   - NIGHTLY/17: IA_THRESHOLD_TICK ← this registration
   * Slot NIGHTLY/17 = next free after LEGAL_NIGHTLY_TICK/16 (confirmed — no slot collision).
   *
   * WEEKLY/10 pattern: mirrors `InsuranceModule` WEEKLY/8 (insurance.module.ts:265) and
   * forensic WEEKLY/9 (forensic.module.ts) — next free WEEKLY slot is WEEKLY/10.
   * Slot WEEKLY/10 = next free after FORENSIC_AUDIT_TICK/9 (confirmed — no slot collision).
   *
   * C6: IA_DECAY_TICK (WEEKLY/10) → IADecayService.applyWeeklySuspicionDecay(ctx.gameMinute).
   *   weekId = Math.floor(ctx.gameMinute / IA_WEEKLY_MINUTES).
   *   Idempotent per game-week (last_weekly_decay_at guard).
   *   Cool-off: targets active this week (stamped by recordCorruptUse) are filtered OUT.
   *   L1 empty-state skip: no idle targets → ZERO writes (zero-regression).
   *   Deterministic: NO Math.random(), NO Date.now() — depends only on gameMinute + tunables.
   */
  onApplicationBootstrap(): void {
    // ── C4/C5: IA_THRESHOLD_TICK NIGHTLY/17 ────────────────────────────────────────────────────
    this.scheduler.registerSystem({
      id: CitySystemId.IA_THRESHOLD_TICK,
      cadence: Cadence.NIGHTLY,
      order: 17,
      run: async (ctx: CitySimTickContext): Promise<void> => {
        // Step 1 (C4): open investigations for targets above open_investigation_threshold.
        await this.investigation.evaluateThresholdCrossing(ctx);
        // Step 2 (C5): evaluate open investigations for the double-condition → executeDiscovery.
        // Targets opened in step 1 are visible here (sequential commits, PG read-committed).
        await this.discovery.runDiscoveryPass(ctx.gameMinute);
      },
    });
    this.logger.log(
      'IATickService registered IA_THRESHOLD_TICK at NIGHTLY/17 — ' +
        'next free after LEGAL_NIGHTLY_TICK/16 (confirmed, no slot collision). ' +
        'Each in-game night: ' +
        '(C4) scan internal_affairs_targets for ' +
        'suspicion_level >= open_investigation_threshold (default 0.60, gdd/14) ' +
        'AND investigation_id IS NULL → open ia_investigations + emit InvestigationOpenedEvent; ' +
        '(C5) then sweep open investigations for double-condition → executeDiscovery (forward cascade). ' +
        'L1 empty-state skip: no qualifying targets → ZERO writes (zero-regression). ' +
        'Idempotent per target (investigation_id IS NULL / discovered_at IS NULL guards). ' +
        'GLOBAL table: scan covers all targets regardless of ctx.playerId. ' +
        'Deterministic (NO Math.random, NO Date.now). Canon: §3 C4+C5.',
    );

    // ── C6: IA_DECAY_TICK WEEKLY/10 ────────────────────────────────────────────────────────────
    // Slot WEEKLY/10 = next free after FORENSIC_AUDIT_TICK/9 (confirmed, no slot collision).
    // Pattern: mirrors InsuranceModule WEEKLY/8 registration (insurance.module.ts:265).
    // weekId = Math.floor(ctx.gameMinute / IA_WEEKLY_MINUTES) (deterministic, no Date.now()).
    this.scheduler.registerSystem({
      id: CitySystemId.IA_DECAY_TICK,
      cadence: Cadence.WEEKLY,
      order: 10,
      run: async (ctx: CitySimTickContext): Promise<void> => {
        await this.decay.applyWeeklySuspicionDecay(ctx.gameMinute);
      },
    });
    this.logger.log(
      'IATickService registered IA_DECAY_TICK at WEEKLY/10 — ' +
        'next free after FORENSIC_AUDIT_TICK/9 (confirmed, no slot collision). ' +
        `Each in-game week (${IA_WEEKLY_MINUTES} game-minutes): ` +
        'scan internal_affairs_targets WHERE last_weekly_decay_at < thisWeekEpoch (idle targets) ' +
        '→ suspicion_level = MAX(0, suspicion_level − decay_rate_per_week) + stamp last_weekly_decay_at. ' +
        'Cool-off: targets used this week already stamped by recordCorruptUse → filtered OUT. ' +
        'Idempotent per game-week: after first decay, targets stamped at thisWeekEpoch → no-op on re-run. ' +
        'L1 empty-state skip: no idle targets → ZERO writes (zero-regression). ' +
        'Deterministic: NO Math.random(), NO Date.now() — weekId from ctx.gameMinute only. ' +
        'Canon: §3 C6 (decay + cool-off mitigation).',
    );
  }
}
