// IMPLEMENTS: docs/superpowers/plans/2026-07-06-04e-B-liveops-plan.md C0 (DI shell)
//             Canon: docs/tech/04e_political_events_and_liveops/liveops_event_catalogue.md
//             Design: docs/superpowers/specs/2026-07-06-04e-B-liveops-design.md (companion)
//             Decisions: docs/superpowers/specs/2026-07-06-04e-B-liveops-decisions.md (companion; §8 = the
//             A/B/C boundary note this module's scope observes)
//             Architecture mirror: services/game-back/src/operational/political/political.module.ts (C0 shell)
//             — 04e-B C0 — 2026-07-06
//             — 04e-B C2 — 2026-07-06 (CohortTargetingService registered as a REAL provider)
//             — 04e-B C7 — 2026-07-06 (LiveOpsNotificationService registered + MARKETING_CONSENT bound
//             env-conditionally, DD-B5 — mirrors the C4 LIVE_OPS_CLOCK binding verbatim)
//
// `LiveOpsModule` — the 10-event live-ops catalogue (G8, canon `liveops_event_catalogue.md`), wired to
// FIRE through the SAME A1 `EffectModifierService`/`EffectOverlayStore` engine A2 already reuses (04e-A1,
// MERGED `c03ce16a`) — this time as **PLAYER-scoped** overlays (D1, the first real per-player A1
// consumer). This is the 2nd sub-lot of chapter 04e (`A → B → C`).
//
// A/B/C BOUNDARY (authored here, full reasoning + citation in decisions doc §8): B ships the ENGINE + the
// 10 static events + a THIN ops-BO (5 endpoints). The composer wizard (`<EventComposer>`, live cohort
// preview, push composer, two-person approval integration) is **04e-C** —
// `docs/tech/12_backoffice_admin/liveops_events_and_push.md:6` pins the event catalogue + engine services
// as REUSE, never redefined by that BO chunk. B is shippable independent of 04e-C's ch17
// `TwoPersonApproval` dependency (TD-107).
//
// C0 = EMPTY SCAFFOLD. providers [LiveOpsEventService (DI anchor stub — injects EffectModifierService,
// CitySimSchedulerService, DB (node-postgres-backed) seams even though catalogue/targeting/lifecycle
// logic lands at C1+)], no schema, no migration, no tick. Only LiveOpsTestController (test-only ping
// probe /v1/_test/liveops/ping, R-EC-2) is conditionally mounted to prove module wiring. The DI seams are
// anchored so TypeScript resolution failures surface at C0 rather than at the first consuming chunk.
//
// Also landed at C0 (no consumer yet, DD-B3): `LiveOpsClockPort` (`live-ops-clock.port.ts`) — the
// injectable real-time seam + `SystemLiveOpsClock` default provider, registered below under the
// `LIVE_OPS_CLOCK` string token (mirrors `db/db.module.ts`'s `DB`/`REDIS` convention) so C4's
// `LiveOpsSchedulerService` can inject it and E2E can substitute a deterministic fake. And
// `cohort-targeting.service.ts` — a STUB file (not yet a provider here) anchoring the cohort-key
// decision-record (resolves C3-M3 at the naming/convention level; COHORT-scope apply stays deferred, B
// applies PLAYER-scope, decisions doc §4) at its eventual code site; C2 fills in the implementation and
// registers it as a real provider.
//
// Architecture (C1+ chunks will fill providers — plan §Architecture / design §2):
//   REUSE: EffectEngineModule imported for EffectModifierService (already EXPORTS it since 04e-A2 C0 —
//     no additive fix needed here, unlike A2's own C0 which had to add that export).
//   REUSE: SchedulerModule imported for CitySimSchedulerService + CityEventBus. ★ C4 CORRECTION (was:
//     "the real-time reconciler does NOT registerSystem on an in-game Cadence — it is a SEPARATE
//     real-time loop" — that was C0's forward-guess, written before the C4 plan/design text existed in
//     final form). The RATIFIED plan (§C4) and design (§2/§5 "Scheduling") both explicitly say the
//     opposite, twice: `LiveOpsSchedulerService` "runs the revert reconciler on a frequent EXISTING
//     tick ... using the injected clock" — it DOES `registerSystem` (MINUTE/24, the next free MINUTE
//     slot), mirroring `MARKET_LANE_CLEARING`'s own established precedent (a GLOBAL-table sweep
//     registered on a per-player-firing cadence, ignoring `ctx.playerId`, city_sim_system.ts:302-313).
//     This works because `CitySimSchedulerService`'s MINUTE loop is ALREADY a continuously-running,
//     real-wall-clock-driven `setInterval` loop for every player with a `city_sim_clock` row
//     (`city_sim_scheduler.service.ts:790`), independent of session/login state — exactly the
//     "frequent" real-time cadence DD-B3 needs, with zero new infrastructure. A SEPARATE
//     `OnApplicationBootstrap` boot reconciler (C4) ALSO runs the SAME sweep once immediately at
//     startup, for crash-recovery (the MINUTE loop's first firing could be an interval away).
//   REUSE: DB (@Inject(DB), Drizzle over the node-postgres pool — db/db.module.ts) for the C2+
//     live_ops_event_active / live_ops_aggression_ledger / live_ops_notification repository reads/writes.
//   NEW (C1): live-ops-event-catalogue.ts (10 static LiveOpsEvent entries) + live-ops-template-id.ts (04g
//     binding + registry) + live-ops.tunables.ts (29 NEW [PROV-Y26Q2] `liveops.*` getters + REUSE 8
//     substrate getters).
//   NEW (C2): db/schema/live_ops_event_active.ts (migration 0114) + the DD-B2 effect_modifier dual-FK
//     generalization (same migration) + cohort-targeting.service.ts's REAL implementation
//     (evaluateCohortTargeting + cohortKeyFor) + PLAYER-scope wiring.
//   NEW (C3): lever/substrate audit + wire-the-gap (D2) — no new schema.
//   NEW (C4): live-ops-event.service.ts's REAL activate/deactivate lifecycle + live-ops-scheduler.service.ts
//     (real-clock reconciler consuming LiveOpsClockPort, DD-B3, registered MINUTE/24) + boot reconciler
//     (OnApplicationBootstrap) + FakeLiveOpsClock (live-ops-clock.port.ts) bound to LIVE_OPS_CLOCK in
//     every non-production environment (the token-override proof C0's review flagged).
//   NEW (C5): live-ops-cadence-controller.ts (max 3 simultaneous / 1 high-impact per real week / no chains).
//   NEW (C6): aggression-score-bucket.service.ts (the D6 composite) + live-ops-aggression-ledger.service.ts
//     (onModuleInit bus subscriber — AssaultCascadeCompletedEvent, 04b-B C-cas -> ledger row) +
//     db/schema/live_ops_aggression_ledger.ts (migration 0116, was 0115 — DD-B4 renumbered C6/C7 by +1) +
//     E-LO-06 real targeting (cohort-targeting.service.ts's `aggression` dimension).
//   NEW (C7): live-ops-notification.service.ts + db/schema/live_ops_notification.ts (migration 0117,
//     was 0116) + per-event consent-class gate (D4) + marketing-consent.port.ts (DD-B5 — the fail-closed
//     MarketingConsentPort seam, FailClosedMarketingConsent bound in production, FakeMarketingConsent
//     bound in every non-production environment under MARKETING_CONSENT, the EXACT LIVE_OPS_CLOCK
//     token-override pattern).
//   NEW (C8): live-ops-admin.controller.ts (5 BO endpoints, `f3_deferred` markers, D5) +
//     db/admin-audit-log.service.ts (NEW — the FIRST consumer of the ch09 `admin_audit_log` table
//     anywhere in this codebase; see that file's own header for the honest "first consumer" note) +
//     `LiveOpsCadenceController.getCadenceStatus` (C8 addition to the C5 provider — read-only, no new
//     provider needed for that half).
//   NEW (C9): live-ops-read.service.ts + live-ops.controller.ts (R2.2 read-only surface, JWT-resolved
//     player_id, `GET /v1/liveops/active`) + the extended brand grep-gate (D3, scripts/ci/
//     check-political-brand-gate.sh — widened, not forked, see that script's own header).
//
// Zero-regression invariant: purely ADDITIVE at C0 — no existing table, service, tick, or path is
// touched. No A1/A2 code is touched at all this chunk (unlike A2's own C0, which had to add an export to
// EffectEngineModule — that export already exists, re-anchored above).
//
// EXPORTS: (nothing exported at C0 — no consumer needs LiveOpsEventService outside this module yet).

import { Module, type Provider } from '@nestjs/common';

import { testControllersEnabled } from '../../protocol/test-routes-gate';
import { SchedulerModule } from '../../citysim/scheduler/scheduler.module';
import { EffectEngineModule } from '../effect_engine/effect-engine.module';
import { AdminAuditLogService } from '../../db/admin-audit-log.service';
import { LiveOpsAdminController } from './live-ops-admin.controller';
import { LiveOpsController } from './live-ops.controller';
import { LiveOpsCadenceController } from './live-ops-cadence-controller';
import { LiveOpsEventReadService } from './live-ops-read.service';
import { LiveOpsEventService } from './live-ops-event.service';
import { LiveOpsSchedulerService } from './live-ops-scheduler.service';
import { LiveOpsTestController } from './live-ops-test.controller';
import { LIVE_OPS_CLOCK, SystemLiveOpsClock, FakeLiveOpsClock } from './live-ops-clock.port';
import { MARKETING_CONSENT, FailClosedMarketingConsent, FakeMarketingConsent } from './marketing-consent.port';
import { CohortTargetingService } from './cohort-targeting.service';
import { AggressionScoreBucketService } from './aggression-score-bucket.service';
import { LiveOpsAggressionLedgerService } from './live-ops-aggression-ledger.service';
import { LiveOpsNotificationService } from './live-ops-notification.service';

// LiveOpsAdminController: 5 BO endpoints (C8, D5) — ALWAYS-ON, NOT gated by testControllersEnabled
// (real production BO routes, mirrors PoliticalAdminController/MetaMarketAdminController's own
// unconditional registration). LiveOpsTestController: test-only probe routes (R-EC-2) — NOT
// registered in production.
const controllers = [
  LiveOpsAdminController, // C8 NEW: always-on BO routes.
  LiveOpsController, // C9 NEW: always-on PLAYER route (`GET /v1/liveops/active`, JWT-gated, R2.2).
  ...(testControllersEnabled() ? [LiveOpsTestController] : []), // test-only probe routes
];

// ── C4 — LIVE_OPS_CLOCK binding (the token-override proof) ───────────────────────────────────────────
// Production (`testControllersEnabled() === false`): LIVE_OPS_CLOCK → SystemLiveOpsClock ONLY (real
// wall clock, never overridden). Every OTHER environment (dev/E2E): LIVE_OPS_CLOCK → the SAME
// FakeLiveOpsClock singleton `LiveOpsTestController` mutates via its own class token (`useExisting` —
// NOT a second instance) — so `_test/liveops/clock/*` routes (C4) pin/advance/reset the EXACT instance
// `LiveOpsEventService`/`LiveOpsSchedulerService` read through `LIVE_OPS_CLOCK`. FakeLiveOpsClock
// defaults to the real wall clock until explicitly pinned (see its own doc comment) — zero behavioral
// difference from SystemLiveOpsClock for every consumer that never touches the clock test routes.
const clockProviders: Provider[] = testControllersEnabled()
  ? [
      FakeLiveOpsClock, // registers the class itself — LiveOpsTestController injects it directly.
      { provide: LIVE_OPS_CLOCK, useExisting: FakeLiveOpsClock },
    ]
  : [
      { provide: LIVE_OPS_CLOCK, useClass: SystemLiveOpsClock },
    ];

// ── C7 — MARKETING_CONSENT binding (DD-B5, the SAME token-override proof as LIVE_OPS_CLOCK) ───────────
// Production (`testControllersEnabled() === false`): MARKETING_CONSENT → FailClosedMarketingConsent
// ONLY (resolves `false` for EVERY player, unconditionally — no consent store exists, TD-087). Every
// OTHER environment (dev/E2E): MARKETING_CONSENT → the SAME FakeMarketingConsent singleton
// `LiveOpsTestController` mutates via its own class token (`useExisting` — NOT a second instance) — so
// `_test/liveops/consent/*` routes (C7) opt a player in / force a failure / reset on the EXACT instance
// `LiveOpsNotificationService` reads through `MARKETING_CONSENT`. FakeMarketingConsent defaults to
// fail-closed (empty opted-in set, not failing) until explicitly mutated — zero behavioral difference
// from FailClosedMarketingConsent for every consumer that never touches the consent test routes.
const consentProviders: Provider[] = testControllersEnabled()
  ? [
      FakeMarketingConsent, // registers the class itself — LiveOpsTestController injects it directly.
      { provide: MARKETING_CONSENT, useExisting: FakeMarketingConsent },
    ]
  : [
      { provide: MARKETING_CONSENT, useClass: FailClosedMarketingConsent },
    ];

@Module({
  imports: [
    EffectEngineModule, // C0: EffectModifierService DI anchor (already exported since 04e-A2 C0).
    SchedulerModule,    // C0: CitySimSchedulerService + CityEventBus DI anchor. C0: DB injection is
                        // provided by @Global() DbModule (imported by AppModule root).
  ],
  controllers,
  providers: [
    LiveOpsEventService, // C0 stub, C4 REAL: activateLiveOpsEvent/deactivateLiveOpsEvent lifecycle —
                          // injects EffectModifierService + CohortTargetingService + LiveOpsCadenceController
                          // (C5) + LIVE_OPS_CLOCK + DB.
    LiveOpsSchedulerService, // C4 NEW: the real-clock reconciler (DD-B3) — registers LIVE_OPS_REAL_CLOCK_SWEEP
                             // at MINUTE/24 + runs a boot reconciler (OnApplicationBootstrap, crash-recovery).
    CohortTargetingService, // C2: REAL provider (was a plain, unregistered C0 stub class) —
                             // evaluateCohortTargeting (single batched query over player) + cohortKeyFor
                             // (cyrb53 canonical-serialization hash, design §3.4). @Inject(DB) resolves
                             // via the @Global() DbModule (no extra import needed here).
    LiveOpsCadenceController, // C5 NEW: the anti-FOMO cadence gate (max 3 simultaneous / max 1 high-impact % allowed-mention: design comment naming the invariant, not narrative usage
                              // per real week / no chains) — injects DB + LIVE_OPS_CLOCK (both already
                              // resolvable in this module's DI graph, see clockProviders below).
    AggressionScoreBucketService, // C6 NEW: the D6 composite (AggressionScoreBucket) — windowed count
                                   // over live_ops_aggression_ledger (migration 0116) + registered
                                   // bucket-floor resolution (R2.2 — raw count INTERNAL only).
    LiveOpsAggressionLedgerService, // C6 NEW: onModuleInit bus subscriber — AssaultCascadeCompletedEvent
                                     // (04b-B C-cas) -> live_ops_aggression_ledger row. Mirrors
                                     // PoliticalRivalEliminationLedgerService (04e-A2 C3).
    LiveOpsNotificationService, // C7 NEW: sendNotifications — cap/cooldown/per-event consent-class gate
                                // (D4/DD-B5) — injects DB + LIVE_OPS_CLOCK + MARKETING_CONSENT (both
                                // already resolvable in this module's DI graph, see consentProviders below).
    AdminAuditLogService, // C8 NEW: thin insert-only wrapper over the ch09 admin_audit_log table
                           // (db/admin-audit-log.service.ts) — injects DB. LiveOpsAdminController's 3
                           // action endpoints call `.emit()` once per mutation (D5).
    LiveOpsEventReadService, // C9 NEW: the R2.2 player-facing read model (`getActiveEventsForPlayer`) —
                              // injects DB only (no clock/consent seam — a pure read over persisted
                              // live_ops_event_active/effect_modifier state).
    ...clockProviders,
    ...consentProviders,
  ],
  exports: [],
})
export class LiveOpsModule {}
