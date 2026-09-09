// IMPLEMENTS: docs/superpowers/plans/2026-06-19-depth-forensic-signaling-plan.md Task 0 (C0) + Task 4 (C4) + Task 7 (C7) + Task 14 (C14) + Task 17 (C17) + Task 18 (C18) + Task 24 (C24)
//             docs/tech/04c_market_reputation_insurance/forensic_signaling_mechanics.md §5 Forensic Signaling
//             — Forensic C0 + C7 + C14 — 2026-06-19
//             — Forensic C17 — 2026-06-20
//             — Forensic C18 — 2026-06-20
//
// `ForensicSignalingModule` — the NestJS module for the §5 forensic signaling mechanics (lot Forensic Signaling).
//
// C0 = EMPTY SCAFFOLD. providers [], no mechanic, no entity, no tick. Only the DI plumbing is wired (module
// imports that the 5 future services will consume). No `onApplicationBootstrap()` yet — the 2 scheduler
// registrations (FORENSIC_AUDIT_TICK WEEKLY/9, FORENSIC_INSPECTOR_SCAN NIGHTLY/9) + the event-bus subscriber
// wiring land in C5/C20/C22/C23. C1+ fill this module with services, persistence, and the scheduler producers.
//
// C7 = wires FORENSIC_AUDIT_TICK WEEKLY/9 in onApplicationBootstrap() → runWeeklyAuditTick.
//
// Architecture (C1+ chunks will fill providers):
//   REUSE: SchedulerModule imported for CitySimSchedulerService (C5 scheduler slot registration at NIGHTLY/WEEKLY)
//     and for CityEventBus (C20 event emission + C22/C23 subscriber wiring).
//   REUSE: InspectionQueueModule imported for InspectionQueueService (C15/C19 applyQueues + C22 dispatcher).
//   REUSE: PoliceMemoryModule imported for PoliceMemoryService (C8/C23 appendDeclarationEntry dual-write).
//   REUSE: MarketModule imported for MarketRngService.seedFromDay (C9/C14 determinism — no Math.random,
//     banned market-rng.service.ts:24; 2-4-week dark window + effluent baseline seeded from frontId+tick /
//     day-seed, mirroring the insurance.module.ts precedent).
//   NEW (C1): 2 Drizzle schema tables (ledger_entry_ring + forensic_soft_flag_ring) + migration 0071 + ch09 doc.
//   NEW (C2): 3 tables (workshop_stoichiometry_state + recipe_stoichiometry_table + block_effluent_register)
//             + migration 0072 + ch09 backport.
//   NEW (C3): lifestyle_audit_state + tail_ramp_stage pgEnum + migration 0073 + ch09 backport.
//   NEW (C4): forensic-tunables.ts (14 materialized T.forensic.* getters + NEW dispatcher/projection keys) +
//             gdd/14 materialization (DIV-3: REUSE legacy ids as runtime keys; Value+Range from canon :228-240).
//   NEW (C5): ForensicSignalingModule.onApplicationBootstrap() wired — scheduler slot registration
//             lands at C7 (FORENSIC_AUDIT_TICK WEEKLY/9) + C14/C17/C18 (FORENSIC_INSPECTOR_SCAN NIGHTLY/9).
//   NEW (C6): LeadingDigitAuditService.recordReceipt (5.1 ring append, additive on front/laundering revenue).
//   NEW (C7): LeadingDigitAuditService.runWeeklyAuditTick (WEEKLY/9 χ² idempotent per-ring, both-ways).
//   NEW (C8): soft-flag → BPD memory (appendDeclarationEntry dual-write, DD-SOFTFLAG-DUAL).
//   NEW (C9): hard-audit cascade (3-in-60d → seizure + front dark, deterministic seedFromDay).
//   NEW (C10): BookkeeperLieutenantService.injectStructurallyRealisticNoise (NEW capability on EXISTING archetype).
//   NEW (C12): EffluentStoichiometryService.recordWorkshopThroughput (hooked AFTER completeCookWithYield).
//   NEW (C13): updateBlockEffluentRegister (rolling 14d effluent sum).
//   NEW (C14): EffluentStoichiometryService.runEnvironmentalInspectorScan (NIGHTLY/9, deviation > σ).
//   NEW (C15): effluent → inspection_queues (FORENSIC/effluent_inspection applyQueues entry).
//   NEW (C16): StandingGapHeatService.lifestyle gap formula + state.
//   NEW (C17): StandingGapHeatService.runMonthlyTick (DD-MONTHLY-ON-NIGHTLY idempotent month_id).
//   NEW (C18): StandingGapHeatService.advanceTailRamp (6-week passive→tailing→subpoena).
//   NEW (C19): tail → inspection_queues (FORENSIC/tail_* applyQueues entry).
//   NEW (C20): 3 bus events (ForensicSoftFlagDetected / EffluentFlagDetected / LifestyleGapFlag) + ForensicSeverityBand.
//   NEW (C21): QueueEntrySource 'FORENSIC' + forensic_kind discriminator (OQ-6, additive on System 6).
//   NEW (C22): InspectionQueueDispatcherService subscriber → routing map §4.3 (DIV-2: REUSE applyQueues).
//   NEW (C23): BPD-memory coupling (3 events → appendDeclarationEntry per stage).
//   NEW (C24): ForensicProjectionService (3 R2.2 P5 buckets: AuditRisk/EffluentVisibility/LifestyleAlarm).
//             Read-projection test probe route added to ForensicTestController.
//   NEW (C25): ForensicAdminController (BO: GET forensic-state + POST force-soft-flag + PUT tunables).
//
// Zero-regression invariant (§1.3): a world with no rings / no workshops / no tracked lieutenants → the source
// services behave EXACTLY as today (the forensic emission is inert). The NIGHTLY/9 + WEEKLY/9 ticks + the
// dispatcher subscriber are no-op organic. This module is PURELY ADDITIVE.
//
// EXPORTS: (C1+ expose services consumed by the app graph.)

import { Logger, Module, OnApplicationBootstrap } from '@nestjs/common';

import { testControllersEnabled } from '../../protocol/test-routes-gate';
import { SchedulerModule } from '../../citysim/scheduler/scheduler.module';
import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId } from '../../citysim/scheduler/city_sim_system';
import type { CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import { CityEventBus } from '../../citysim/events/city-event-bus';
import type { ForensicEntryDispatchedEvent, EffluentFlagDetectedEvent, LifestyleGapFlagEvent } from '../../citysim/events/city-event-bus';
import { PoliceMemoryService } from '../../citysim/police_memory/police_memory.service';
import { InspectionQueueModule } from '../../citysim/inspection/inspection.module';
import { PoliceMemoryModule } from '../../citysim/police_memory/police_memory.module';
import { MarketModule } from '../market/market.module';
import { ForensicRepository } from './forensic.repository';
import { ForensicTestController } from './forensic-test.controller';
import { ForensicAdminController } from './forensic-admin.controller';
import { ForensicController } from './forensic.controller';
import { LeadingDigitAuditService } from './leading-digit-audit.service';
import { BookkeeperLieutenantService } from './bookkeeper-lieutenant.service';
import { EffluentStoichiometryService } from './effluent-stoichiometry.service';
import { StandingGapHeatService } from './standing-gap-heat.service';
import { InspectionQueueDispatcherService } from './inspection-queue-dispatcher.service';
import { ForensicProjectionService } from './forensic.projection.service';
import { forensicTunables } from './forensic-tunables';

// ForensicTestController: test-only probe routes (R-EC-2) — NOT registered in production.
// Mirrors InsuranceModule / ReputationModule testControllersEnabled() pattern.
// C4: forensicTunables (forensic-tunables.ts) is a module-level singleton (not NestJS-injectable —
//   mirrors insurance/reputation-tunables pattern: plain object, no @Injectable(), consumed by
//   other services + the _test probe route via direct import in forensic-test.controller.ts).
//   FORENSIC_TUNABLE_CAPS (forensic-admin.controller.ts) is the C25 PUT route's clamper record.
//   Neither requires NestJS registration — the admin controller class lands at C25.
// C25: ForensicAdminController registered always-on (NOT test-gated — real production BO routes).
//   Mirrors InsuranceModule + ReputationModule pattern: InsuranceAdminController is always-on.
// W6.2 C6: ForensicController always-on (the player-facing route, mirrors InsuranceController/
// ReputationController/MarketController's own always-on posture).
const controllers = [
  ...(testControllersEnabled() ? [ForensicTestController] : []),
  ForensicAdminController,
  ForensicController,
];

@Module({
  // SchedulerModule: REUSE CitySimSchedulerService (C5 NIGHTLY/9 + WEEKLY/9 slot registration) +
  //   CityEventBus (C20 event emission + C22/C23 subscriber wiring). Mirrors InsuranceModule precedent.
  // InspectionQueueModule: REUSE InspectionQueueService.applyQueues (C15/C19 queue entries) +
  //   InspectionQueueService dispatch trigger (C22 ForensicEntryDispatched emission).
  // PoliceMemoryModule: REUSE PoliceMemoryService.appendDeclarationEntry (C8/C23 BPD dual-write, System 3).
  // MarketModule: REUSE MarketRngService.seedFromDay (C9/C14 deterministic draws — no Math.random,
  //   banned; front-dark window + effluent baseline seeded from frontId+tick / day-seed).
  // DbModule is @Global() — no explicit import needed (the Drizzle client is DI-available everywhere).
  imports: [SchedulerModule, InspectionQueueModule, PoliceMemoryModule, MarketModule],
  controllers,
  // C1: ForensicRepository provides Drizzle CRUD over the 2 §5.1 tables.
  //     C2+ will add EffluentStoichiometryRepository, etc.
  // C6: LeadingDigitAuditService provides recordReceipt (5.1 ring append, additive on
  //     front/laundering revenue). Exported so LaunderingModule can inject it without
  //     a circular dependency (LaunderingModule → ForensicSignalingModule; no reverse import).
  // C7: LeadingDigitAuditService.runWeeklyAuditTick registered at WEEKLY/9 (onApplicationBootstrap).
  // C10: BookkeeperLieutenantService provides injectStructurallyRealisticNoise (Benford-preserving
  //      noise-injection on EXISTING BOOKKEEPER archetype, gated by building type — DIV-1/OQ-1).
  // C12: EffluentStoichiometryService provides recordWorkshopThroughput (5.2 per-workshop
  //      rolling throughput accumulator). Exported so ProductionModule can inject it without
  //      a circular dependency (ProductionModule → ForensicSignalingModule; no reverse import).
  // C16: StandingGapHeatService provides computeGap (PURE) + populateLifestyleState (FULL greenfield, OQ-8).
  //      Exported so ForensicTestController can inject it for the populate-lifestyle probe route.
  // C22: InspectionQueueDispatcherService added — routes FORENSIC queue entries to §4.3 consequences.
  //      Requires CityEventBus (via SchedulerModule re-export) + LeadingDigitAuditService (REUSE, C9).
  //      NOT exported: the dispatcher is module-internal (no other module injects it directly).
  // C24: ForensicProjectionService provides projectForensicState (R2.2 P5 bucket projection).
  //      Injected by ForensicTestController for the read-projection probe route.
  //      Will be exported for the production player-facing controller (C25).
  providers: [ForensicRepository, LeadingDigitAuditService, BookkeeperLieutenantService, EffluentStoichiometryService, StandingGapHeatService, InspectionQueueDispatcherService, ForensicProjectionService],
  exports: [ForensicRepository, LeadingDigitAuditService, BookkeeperLieutenantService, EffluentStoichiometryService, StandingGapHeatService, ForensicProjectionService],
})
export class ForensicSignalingModule implements OnApplicationBootstrap {
  private readonly logger = new Logger(ForensicSignalingModule.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly leadingDigitAudit: LeadingDigitAuditService,
    private readonly effluentStoichiometry: EffluentStoichiometryService,
    private readonly standingGapHeat: StandingGapHeatService,
    // C22: InspectionQueueDispatcherService + CityEventBus for FORENSIC entry routing.
    private readonly forensicDispatcher: InspectionQueueDispatcherService,
    private readonly bus: CityEventBus,
    // C23: PoliceMemoryService for BPD-memory coupling (System 3 appendDeclarationEntry).
    // Injected from PoliceMemoryModule (exported; no circular dependency — PoliceMemoryModule
    // does not import ForensicSignalingModule).
    private readonly policeMemory: PoliceMemoryService,
  ) {}

  /**
   * Register the FORENSIC_AUDIT_TICK WEEKLY/9 tick (C7 — Benford χ² audit).
   *
   * Pattern mirrors InsuranceModule.onApplicationBootstrap() (INSURANCE_DRIFT_TICK WEEKLY/8).
   * Slot WEEKLY/9 = next free after INSURANCE_DRIFT_TICK/8 (opened at C5 in city_sim_system.ts).
   *
   * The tick calls `LeadingDigitAuditService.runWeeklyAuditTick(ctx, weekId)`:
   *   - Selects all ledger_entry_ring rows for ctx.playerId.
   *   - For each ring: computes χ² via computeChiSquare (PURE).
   *   - Stamps last_chi_square + last_audit_tick.
   *   - If χ² > benfordChi2ThresholdH (default 14.0) → soft_flag_count++.
   *   - Idempotent per-ring on last_audit_tick (OQ-7): same weekId 2× → one increment.
   * Organically a no-op for players with no ring rows (zero-regression, §1.3).
   *
   * weekId = Math.floor(ctx.gameMinute / WEEKLY_MINUTES) where WEEKLY_MINUTES = 7 × 24 × 60 = 10080.
   * Mirrors insurance.module.ts:264 INSURANCE_DRIFT_TICK weekId derivation.
   *
   * NOTE: event emit (ForensicSoftFlagDetected) + BPD-memory dual-write land at C8 — NOT here.
   */
  onApplicationBootstrap(): void {
    // weekId = Math.floor(ctx.gameMinute / WEEKLY_MINUTES)
    // where WEEKLY_MINUTES = 7 × 24 × 60 = 10080 game-minutes per in-game week.
    // Mirrors insurance.module.ts:264 (INSURANCE_DRIFT_TICK WEEKLY/8).
    const WEEKLY_MINUTES = 7 * 24 * 60; // 10080 game-minutes per in-game week

    this.scheduler.registerSystem({
      id: CitySystemId.FORENSIC_AUDIT_TICK,
      cadence: Cadence.WEEKLY,
      order: 9,
      run: async (ctx: CitySimTickContext): Promise<void> => {
        const weekId = Math.floor(ctx.gameMinute / WEEKLY_MINUTES);
        await this.leadingDigitAudit.runWeeklyAuditTick(ctx, weekId);
      },
    });
    this.logger.log(
      'ForensicSignalingModule registered FORENSIC_AUDIT_TICK at WEEKLY/9 — ' +
        'each in-game week: iterate ledger_entry_ring rows for player; compute χ² (PURE, canon :49); ' +
        'stamp last_chi_square + last_audit_tick; if χ² > benfordChi2ThresholdH (default 14.0) → soft_flag_count++. ' +
        'Idempotent per-ring on last_audit_tick (OQ-7). Math.random() BANNED (C4 anti-stochastic). ' +
        'Organically a no-op for players with no ring rows (zero-regression §1.3). ' +
        'Event emit + BPD-memory dual-write land at C8 — NOT HERE. Canon: forensic_signaling_mechanics.md :46-54.',
    );

    // NIGHTLY/9: FORENSIC_INSPECTOR_SCAN — C14 effluent deviation scan (+ C17 monthly tick + C18 tail-ramp at C17/C18).
    // dayId = Math.floor(ctx.gameMinute / DAILY_MINUTES) where DAILY_MINUTES = 1440 game-minutes per in-game day.
    // Mirrors the WEEKLY/9 pattern: passes dayId as 2nd arg, same as weekId in the WEEKLY tick.
    //
    // C14 wires ONLY runEnvironmentalInspectorScan here.
    // C17 will chain runMonthlyTick after runEnvironmentalInspectorScan (DD-MONTHLY-ON-NIGHTLY).
    // C18 will chain advanceTailRamp after runMonthlyTick.
    // The 3 sub-calls execute in sequence within a single NIGHTLY/9 run (forensic.module.ts comment at C5 line 9):
    //   runEnvironmentalInspectorScan(ctx, dayId) → [runMonthlyTick (C17)] → [advanceTailRamp (C18)]
    //
    // No Math.random(). Organically a no-op for players with no block_effluent_register rows (zero-regression §1.3).
    // Canon: forensic_signaling_mechanics.md §5.2 (:98).
    const DAILY_MINUTES = 1440; // game-minutes per in-game day

    this.scheduler.registerSystem({
      id: CitySystemId.FORENSIC_INSPECTOR_SCAN,
      cadence: Cadence.NIGHTLY,
      order: 9,
      run: async (ctx: CitySimTickContext): Promise<void> => {
        const dayId = Math.floor(ctx.gameMinute / DAILY_MINUTES);
        // C14: runEnvironmentalInspectorScan — effluent deviation check.
        await this.effluentStoichiometry.runEnvironmentalInspectorScan(ctx, dayId);
        // C17: runMonthlyTick — DD-MONTHLY-ON-NIGHTLY idempotent counter.
        // monthId = floor(dayId / daysPerMonth): game-time derivation, no Date.now().
        // daysPerMonth sourced from forensicTunables.daysPerMonth getter (OQ-9, default 30).
        const daysPerMonth = forensicTunables.daysPerMonth;
        const monthId = Math.floor(dayId / daysPerMonth);
        await this.standingGapHeat.runMonthlyTick(ctx, monthId);
        // C18: advanceTailRamp — tail-ramp stage advance, chained AFTER runMonthlyTick (prod-path).
        // Advances passive→tailing→subpoena based on game-days since tail_started_tick.
        // No Math.random. No Date.now(). Monotone non-decreasing. No bus event (deferred to C20).
        await this.standingGapHeat.advanceTailRamp(ctx, dayId);
      },
    });
    this.logger.log(
      'ForensicSignalingModule registered FORENSIC_INSPECTOR_SCAN at NIGHTLY/9 — ' +
        'each in-game day: (C14) effluent deviation scan; (C17) monthly standing-gap counter ' +
        '(DD-MONTHLY-ON-NIGHTLY: monthId=floor(dayId/daysPerMonth), idempotent on last_month_id, ' +
        '++/-- both-ways, spawn at standingGapConsecutiveMonths(2), no Math.random OQ-9); ' +
        '(C18) advanceTailRamp — 6-week passive→tailing→subpoena ramp (deterministic, structural thresholds, ' +
        'ANTI-FIG-LEAF: stage boundaries from ACTIVE_STAGES.length×rampWeeks getter, no magic 0.333/0.667). ' +
        'Canon: forensic_signaling_mechanics.md §5.3 (:139,:154-157).',
    );

    // ── C22: Wire the ForensicEntryDispatched bus subscriber → InspectionQueueDispatcherService ──
    //
    // `InspectionQueueService.runDispatchTick` emits `ForensicEntryDispatchedEvent` (via
    // `bus.emitForensicEntryDispatched`) for each FORENSIC queue entry drained in Phase B.
    // This subscriber receives the event and routes it to the §4.3 consequence via
    // `InspectionQueueDispatcherService.onForensicEntryDispatched`.
    //
    // Async IIFE pattern: the CityEventBus `dispatch()` method iterates listeners synchronously
    // (it calls each listener directly in the emitter.emit() call). To avoid blocking the
    // synchronous dispatch loop with an async consequence (triggerHardAudit, emitHeatInjection),
    // the subscriber wraps the async call in a void IIFE — the same pattern used by other async
    // bus consumers (see HiddenCurriculumLeakMIS event handler). Errors are caught and logged
    // to prevent crashing the synchronous dispatch loop (the CityEventBus has per-listener try/catch
    // — but the IIFE's async rejection is unhandled without this guard).
    //
    // DIV-2 invariant: this subscriber is additive (only FORENSIC entries trigger it; non-forensic
    // entries never fire `ForensicEntryDispatchedEvent`). System 6's non-forensic dispatch path is
    // byte-identical to pre-C22 (the PRE-FORENSIC path emits BuildingEvidenceFoundEvent unchanged).
    // Zero-regression: if no FORENSIC entries exist in any queue, this subscriber is never called.
    this.bus.onForensicEntryDispatched((e: ForensicEntryDispatchedEvent) => {
      // Fire-and-forget: the bus dispatch loop is synchronous; the async consequence runs in
      // a subsequent microtask. Errors are caught-and-logged (mirrors InsuranceModule pattern).
      // The non-forensic dispatch path is byte-identical (never emits ForensicEntryDispatched).
      this.forensicDispatcher.onForensicEntryDispatched(e).catch((err: unknown) => {
        this.logger.error(
          `ForensicEntryDispatched subscriber error kind=${e.forensicKind} ` +
            `playerId=${e.playerId} districtId=${e.districtId}: ${String(err)}`,
        );
      });
    });
    this.logger.log(
      'ForensicSignalingModule wired ForensicEntryDispatched bus subscriber → InspectionQueueDispatcherService (C22). ' +
        '§4.3 routing: hard_audit→triggerHardAudit (C9 REUSE), effluent_inspection→heat LOW (FLOW_CONGESTION), ' +
        'tail_passive→log, tail_active→heat LOW (FLOW_CONGESTION), tail_subpoena→emit+log (TD). ' +
        'DIV-2: non-forensic dispatch path byte-identical. Zero-regression: no-op if no FORENSIC entries.',
    );

    // ── C23: Wire EffluentFlagDetected → System 3 durable declaration entry ──
    //
    // When the environmental inspector scan flags a block (§5.2 `:107`), the EffluentFlagDetected
    // bus event is emitted (C20 + C20 MINOR-1 hoist). This subscriber writes a durable
    // 'forensic_effluent_flag' DeclarationEntry to the BPD precinct_memory.declaration_ledger
    // (System 3, R9.3 additive DeclarationType, C23).
    //
    // REUSE: calls the EXISTING `PoliceMemoryService.appendDeclarationEntry` (C8 hook).
    //        Do NOT rebuild System 3 — this is a pure subscriber + delegator.
    //
    // Payload mapping (R2.2 — qualitative/banded, no raw scalar):
    //   - playerId     ← event.playerId
    //   - precinctId   ← derived: Math.min(6, Math.ceil(event.districtId / 3)) (same ⌈d/3⌉ grouping
    //                     as PoliceMemoryService.loadGeographyMapping — the EffluentFlagDetected
    //                     event carries districtId; precinct = ⌈districtId/3⌉, clamped to 6).
    //                     This is the C23 canonical derivation (canon §5.2 :107 "durable entry").
    //   - declarationType ← 'forensic_effluent_flag' (NEW additive DeclarationType, C23).
    //   - severity     ← banded: event.severity maps low→25, medium→50, high→75, critical→100.
    //                     Qualitative bucket — never a raw deviation scalar (R2.2).
    //   - sourceOriginId ← `block:${event.blockId}` (the flagged block id — tracing handle for BPD).
    //   - gameMinute   ← event.gameMinute (game-time, NEVER Date.now()).
    //
    // Fire-and-forget (the bus emits synchronously; the async DB write runs in a subsequent
    // microtask). Errors are caught-and-logged (mirrors C22 ForensicEntryDispatched pattern).
    // Zero-regression: a world with no effluent flags never fires this subscriber.
    this.bus.onEffluentFlagDetected((e: EffluentFlagDetectedEvent) => {
      const precinctId = Math.min(6, Math.ceil(e.districtId / 3));
      const severity = e.severity === 'critical' ? 100 : e.severity === 'high' ? 75 : e.severity === 'medium' ? 50 : 25;
      this.policeMemory.appendDeclarationEntry(
        e.playerId,
        precinctId,
        'forensic_effluent_flag',
        severity,
        `block:${e.blockId}`,
        e.gameMinute,
      ).catch((err: unknown) => {
        this.logger.error(
          `C23 EffluentFlagDetected→declaration write failed ` +
            `playerId=${e.playerId} blockId=${e.blockId} districtId=${e.districtId} ` +
            `precinctId=${precinctId}: ${String(err)}`,
        );
      });
    });
    this.logger.log(
      'ForensicSignalingModule wired EffluentFlagDetected bus subscriber → appendDeclarationEntry (C23). ' +
        'Durable forensic_effluent_flag DeclarationEntry in precinct_memory.declaration_ledger. ' +
        'precinctId=⌈districtId/3⌉ (System 3 grouping). R2.2 banded severity (low/med/high/critical→25/50/75/100). ' +
        'REUSES PoliceMemoryService.appendDeclarationEntry (System 3 not rebuilt). ' +
        'Canon: forensic_signaling_mechanics.md §5.2 (:107 "durable entry"). Zero-regression.',
    );

    // ── C23: Wire LifestyleGapFlag → System 3 durable declaration entry ──
    //
    // When the tail ramp advances stage (§5.3 advanceTailRamp), the LifestyleGapFlag bus event is
    // emitted (C20). This subscriber writes a durable 'forensic_lifestyle_gap' DeclarationEntry to
    // the BPD precinct_memory.declaration_ledger (System 3, R9.3 additive DeclarationType, C23).
    //
    // REUSE: calls the EXISTING `PoliceMemoryService.appendDeclarationEntry` (C8 hook).
    //        Do NOT rebuild System 3 — this is a pure subscriber + delegator.
    //
    // Payload mapping (R2.2 — qualitative, no raw gap scalar):
    //   - playerId     ← event.playerId
    //   - precinctId   ← event.precinctId (canon §5.3 — tail events carry precinctId directly;
    //                     C20 implementation uses hardcoded 1, production lookup deferred at C23).
    //   - declarationType ← 'forensic_lifestyle_gap' (NEW additive DeclarationType, C23).
    //   - severity     ← rampStage maps passive→25, tailing→50, subpoena→75, none→0.
    //                     Qualitative stage bucket — never a raw gap integer (R2.2).
    //   - sourceOriginId ← event.lieutenantId (the tailed lieutenant — BPD tracing handle).
    //   - gameMinute   ← event.gameMinute (game-time, NEVER Date.now()).
    //
    // Fire-and-forget (same async IIFE pattern as C22). Zero-regression: a world with no tailed
    // lieutenants never fires this subscriber.
    this.bus.onLifestyleGapFlag((e: LifestyleGapFlagEvent) => {
      const severity = e.rampStage === 'subpoena' ? 75 : e.rampStage === 'tailing' ? 50 : e.rampStage === 'passive' ? 25 : 0;
      if (severity === 0) return; // 'none' stage: no write (tail not yet active)
      this.policeMemory.appendDeclarationEntry(
        e.playerId,
        e.precinctId,
        'forensic_lifestyle_gap',
        severity,
        e.lieutenantId,
        e.gameMinute,
      ).catch((err: unknown) => {
        this.logger.error(
          `C23 LifestyleGapFlag→declaration write failed ` +
            `playerId=${e.playerId} lieutenantId=${e.lieutenantId} precinctId=${e.precinctId} ` +
            `rampStage=${e.rampStage}: ${String(err)}`,
        );
      });
    });
    this.logger.log(
      'ForensicSignalingModule wired LifestyleGapFlag bus subscriber → appendDeclarationEntry (C23). ' +
        'Durable forensic_lifestyle_gap DeclarationEntry in precinct_memory.declaration_ledger. ' +
        'R2.2 banded severity from rampStage (passive/tailing/subpoena→25/50/75; none→skip). ' +
        'REUSES PoliceMemoryService.appendDeclarationEntry (System 3 not rebuilt). ' +
        'Canon: forensic_signaling_mechanics.md §5.3. Zero-regression.',
    );
  }
}
