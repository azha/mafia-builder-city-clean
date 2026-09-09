// IMPLEMENTS: docs/superpowers/plans/2026-07-04-04e-A-political-engine-plan.md C0 (DI shell)
//             docs/superpowers/plans/2026-07-05-04e-A2-political-events-plan.md C0 (RE-ANCHOR fix — export EffectModifierService)
//             Canon: docs/tech/04e_political_events_and_liveops/political_event_catalogue.md
//             Design: docs/superpowers/specs/2026-07-04-04e-A-political-engine-design.md §2
//             Architecture mirror: services/game-back/src/operational/meta_market/meta-market.module.ts
//             — 04e-A1 C0 — 2026-07-04
//             — 04e-A2 C0 — 2026-07-05 (EXPORTS EffectModifierService — A1 left `exports: []`; the NEW
//               PoliticalModule (A2) needs to inject it via DI to applyEvent/revertEvent/revertExpired
//               the 12-event catalogue. Additive, zero-regression: no existing importer of this module
//               relied on the empty exports array — app.module.ts is the ONLY current consumer, at the
//               root, and never re-exports it further.)
//
// `EffectEngineModule` — the shared, revert-guaranteed effect-modifier engine (04e-A1). The structural
// foundation for both G7 (political events, this lot) and G8 (live-ops, 04e-B — reuses this SAME
// module + the PER-PLAYER/COHORT scope built here).
//
// C0 = EMPTY SCAFFOLD. providers [EffectModifierService (DI anchor stub — injects the scheduler + DB
// (node-postgres-backed) seams even though apply/revert logic lands at C4)], no schema, no migration,
// no tick. Only EffectEngineTestController (test-only ping probe /v1/_test/effect-engine/ping, R-EC-2)
// is conditionally mounted to prove module wiring. The DI seams are anchored so TypeScript resolution
// failures surface at C0 rather than at the first consuming chunk.
//
// Architecture (C1+ chunks will fill providers — plan §Architecture / design §2.2):
//   REUSE: SchedulerModule imported for CitySimSchedulerService (the political calendar NIGHTLY tick,
//     A2, + the substrate ticks C6-C9 register here — precedent MetaMarketTickService.onApplicationBootstrap,
//     meta-market-tick.service.ts:60,96). Also provides CityEventBus (scheduler.module.ts exports it).
//   REUSE: DB (@Inject(DB), Drizzle over the node-postgres pool — db/db.module.ts) for the C4
//     SERIALIZABLE apply/revert transactions + pg_notify('effect_modifiers_changed').
//   REUSE: TunablesStore (config/tunables-store.ts) — the base tunables layer the overlay composes on
//     top of (a plain module-level singleton, NOT Nest-injectable — mirrors the 9 lever getters'
//     pattern, e.g. police-memory-tunables.ts:75).
//   NEW (C1): effect-engine.tunables.ts — engine + substrate BASE tunables [PROV-Y26Q2] (MONTH_MINUTES
//     derivation, pin_half_life_days, audit_pin_emergence_rate, federal suspicion params, Stack
//     zoning-gate count/tier, checkpoint base inspection_density) + the 3-key gdd/14 reconcile.
//   NEW (C2): db/schema/effect_modifier.ts — effect_modifier + political_event_active tables + 3
//     pgEnums (effect_scope, effect_modifier_op, political_event_category), migration 0106.
//   NEW (C3): config/effect-overlay-store.ts — EffectOverlayStore (NOT part of this Nest module — a
//     plain singleton mirroring TunablesStore; dedicated pg LISTEN client on `effect_modifiers_changed`
//     + boot reload + synchronous applyModifiers(key, base, scope?) compose).
//   NEW (C4): EffectModifierService.applyEvent/revertEvent/revertExpired (SERIALIZABLE + pg_notify) +
//     EffectModifierRepository + effect-engine.types.ts. Synthetic 3-scope (GLOBAL/DISTRICT/PLAYER)
//     live-fire + crash-recovery E2E.
//   NEW (C5): additive overlay read in the 9 lever getters (byte-identical when the overlay is empty).
//   NEW (C6-C9): the 4 substrate builds (audit-pin half-life, federal investigator, Stack-lot
//     spawning, checkpoint inspection-density) — each additive to its existing system, each
//     live-fire-proven through the real engine.
//
// Zero-regression invariant: purely ADDITIVE at C0 — no existing table, service, tick, or path is
// touched.
//
// EXPORTS: `EffectModifierService` (04e-A2 C0) — the political engine (A2, `PoliticalModule`) and,
// later, 04e-B live-ops import `EffectEngineModule` and inject this service to apply/revert events
// through it.

import { Module } from '@nestjs/common';

import { testControllersEnabled } from '../../protocol/test-routes-gate';
import { SchedulerModule } from '../../citysim/scheduler/scheduler.module';
import { EffectModifierService } from './effect-modifier.service';
import { EffectEngineTestController } from './effect-engine-test.controller';

// EffectEngineTestController: test-only probe routes (R-EC-2) — NOT registered in production.
const controllers = [
  ...(testControllersEnabled() ? [EffectEngineTestController] : []), // test-only probe routes
];

@Module({
  imports: [
    SchedulerModule, // C0: CitySimSchedulerService DI anchor (the political NIGHTLY tick registers at
                     // A2; the 4 substrate ticks register at C6-C9). Also provides CityEventBus.
                     // C0: DB injection is provided by @Global() DbModule (imported by AppModule root).
  ],
  controllers,
  providers: [
    EffectModifierService, // C0: DI anchor stub — injects DB (node-postgres) + CitySimSchedulerService;
                            // references TunablesStore directly (plain singleton). Real apply/revert
                            // logic (SERIALIZABLE + pg_notify) lands at C4.
  ],
  exports: [
    EffectModifierService, // 04e-A2 C0: so importers (PoliticalModule) can inject the real
                            // applyEvent/revertEvent/revertExpired engine via DI.
  ],
})
export class EffectEngineModule {}
