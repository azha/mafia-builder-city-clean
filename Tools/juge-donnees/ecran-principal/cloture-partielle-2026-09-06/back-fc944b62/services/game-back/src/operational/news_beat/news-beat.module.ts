// IMPLEMENTS: docs/superpowers/plans/2026-07-16-04g-C-news-beat-plan.md C1 (DI shell)
//             Design: docs/superpowers/specs/2026-07-16-04g-C-news-beat-design.md §3 (architecture —
//             module operational/news_beat/)
//             Architecture mirror: services/game-back/src/operational/random_world/random-world.module.ts
//             — 04g-C C1 — 2026-07-16
//
// `NewsBeatModule` — the News-beat runtime module (G23, structural mirror of `operational/random_world/`
// 04g-B / `operational/ambient/` 04g-A). C1 = DATA FOUNDATION ONLY:
//   - migration 0130 (3 tables + 2 pgEnums, `db/schema/news_beat.ts`) — schema-only, zero consumer yet.
//   - `news-beat-template-registry.ts` (`NEWS_BEAT_TEMPLATE_REGISTRY`/`newsBeatTemplateById`) and
//     `press-registry.ts` (`PRESS_OUTLET_REGISTRY`/`JOURNALIST_REGISTRY`) — plain exported consts/
//     functions, NOT Nest-injectable (mirrors `RANDOM_WORLD_TEMPLATE_REGISTRY`/`ambient.tunables.ts`'s
//     own posture).
//   - `news-beat.tunables.ts` (`newsBeatTunables`) — same posture, plain exported const.
//   - `NewsBeatBootGuardService` — the ONE real NestJS provider this chunk ships: an `OnModuleInit`
//     lifecycle hook enforcing the keystone-probability mutex budget (design §3.2 phase 4a) at actual
//     module boot.
//
// C2 adds: `news-fodder-reader.service.ts` (`NewsFodderReader` — the 4 READ-only fodder queries + D14
// severity/category mapping) + `news-beat.repository.ts` (`NewsBeatRepository` — claim + digest insert +
// counters, `news_beat`/`news_daily_run`) + `brennar-daily.service.ts` (`BrennarDailyService` —
// `BRENNAR_DAILY_TICK` at NIGHTLY/30, phases 0/1/5/6; phases 2-4 documented no-op placeholders, C3-C5
// scope). `news-beat-clock.ts`/`news-beat-digest.ts` are zero-I/O pure-function modules (no DI
// registration needed — imported directly, mirrors `recovery-curve.ts`'s own C1 posture). `NewsTestController`
// (C1) gains a `POST run-daily-tick` direct-probe route + a `GET daily-run/:gameDay` read-back (mirrors
// `random-world-test.controller.ts`'s own C2 additions).
//
// C3 (this chunk) adds: `news-beat-generator.service.ts` (`NewsBeatGeneratorService` —
// `composeRetrospectiveArc` + the hindsight-publication/wire-day beat composition helpers) as a NEW
// provider `BrennarDailyService` now injects; phases 2 (generic thread advance)/3 (wire day)/4d
// (hindsight trigger) go live inside `BrennarDailyService` itself (no new provider for those — they're
// methods on the existing tick service, mirroring how `RandomWorldEventGeneratorService`'s own phase
// methods live on ITS tick service rather than spawning a provider per phase). `hindsight-arc.ts`/
// `wire-day.ts` are zero-I/O pure-function modules (same C1 "no DI needed" posture as
// `news-beat-digest.ts`). `NewsTestController` gains a `POST advance-threads` direct-probe route (the
// crash-safety floor's own phase-2-only invocation, bypassing the day-level claim).
//
// ★ C3 fix (review gate BLOCKING-1, post-merge): `NewsBeatGeneratorService` is now ALSO injected into
// `NewsTestController` (the new `POST compose-retrospective-arc` atomicity-proof probe) — no NEW
// provider, purely a 2nd consumer of the SAME C3 provider `BrennarDailyService` already depends on.
//
// C5 shipped: the 2 ❤️ keystones. `cooper-affair.ts`/`sourceless-beat.ts` are zero-I/O
// pure-function modules (SAME "no DI needed" posture as `hindsight-arc.ts`/`three-outlet-storm.ts`/
// `wire-day.ts`/`folded-page.ts`). No new PROVIDER — `BrennarDailyService` gains phase 4a
// (`evaluateCooperAffairTrigger`/`evaluateSourcelessBeatTrigger` + their own `advance*Thread` lifecycle
// methods) and `NewsBeatGeneratorService` gains the 3 new compose methods, mirroring how EVERY prior
// chunk's new template logic landed on the SAME 2 existing services rather than spawning a
// service-per-template. `AmbientModule` is imported NEW this chunk — `ConstantHumRepository` (its OWN
// C2-exported `aggregateAvgHeatByDistrict`/`listCellsForDistrict`, S3) is `cooper_affair`'s "ambient
// noise" baseline read (decisions D6) — mirrors `random-world.module.ts`'s OWN `AmbientModule` import
// precedent (04g-B C2, "READ-only, no new write path into constant_hum_cell"). `NewsTestController`
// gains 3 new DEV-gated probes: `POST compose-cooper-affair-thread` (bypasses the residue/journalist
// gates — the displacement proof's own tool), `POST compose-sourceless-beat` (bypasses readiness/mood/
// roll, with a `forcePoisonedAttribution` fault-injection knob — the chain-refusal proof), `GET
// threads-by-journalist/:journalistKey` (the track-record query-derived read, design §3.6).
//
// C7 ships: `NewsAdminController` (NEW, always registered — the 5 BO endpoints, design §6.2). No new
// PROVIDER — the controller injects the 3 EXISTING C2-C6 providers (`NewsBeatRepository`/`NewsFodderReader`/
// `NewsBeatGeneratorService`), mirroring `RandomWorldAdminController`'s own "always-on, no new provider"
// posture (04g-B C5). `NewsBeatRepository` gains 6 new BO-only READ methods; `NewsFodderReader` gains
// `readOneBySourceKindAndRefId` (the force-generate anti-fig-leaf's own targeted lookup); `NewsBeatGeneratorService`
// gains `forceGenerate`/`ForceableNewsBeatTemplateId`/`isForceableNewsBeatTemplateId` (the restrictive
// 1-template forceable-set dispatch, mirrors `RandomWorldEventGeneratorService.forceActivate`'s IDENTICAL
// posture).
//
// C6 ships: the LAST LIVE template (`slow_page`, design §3.5.6/D9) — `slow-page.ts` is a
// zero-I/O pure-function module (SAME "no DI needed" posture as the other 5 per-template pure modules).
// No new PROVIDER for slow_page itself — `BrennarDailyService` gains phase 4d `evaluateSlowPageTrigger`
// + `advanceSlowPageThread`, `NewsBeatGeneratorService` gains `composeSlowPageSeries`/
// `composeSlowPageInstallmentBeat`, `NewsBeatRepository` gains the atomic open/advance + the rolling
// `journalist_interest` read — the SAME "land on the 2 existing services" convention C3-C5 already
// established. C6 ALSO ships the player projection (design §6.1, P5/R2.2): `NewsProjectionService`
// (NEW provider) + `NewsController` (NEW production controller, registered UNCONDITIONALLY — unlike
// `NewsTestController`, this is real player-facing surface, not a DEV-gated probe).
//
// Imports SchedulerModule (EXPORTS `CitySimSchedulerService` — the NIGHTLY/30 registration). No other
// module import needed beyond `AmbientModule` above: `NewsFodderReader` reads the 4 upstream fodder
// tables DIRECTLY via Drizzle (its OWN queries against `db/schema/*`, never an upstream service call —
// design §0/§8 "READ-only, lues par leurs repositories/requêtes PROPRES au module news");
// `NewsBeatRepository`'s new C5 `avgDistrictCohesionCrossPlayer` read is the SAME "own query against a
// shared core schema table" posture, needing no module import (`district_cohesion` has no owning
// NestJS module of its own — `city_state.ts` is a plain shared schema file).
//
// ★ chore/gate-orphan-coverage addendum (2026-08-05): `NewsTestController` gains a 2nd/3rd consumer of
// 2 ALREADY-provided dependencies — `NewsFodderReader` (this module's own C2 provider) and
// `ConstantHumRepository` (`AmbientModule`'s C5 export, already imported above) — for the new
// `GET phase4a-premise/:gameDay` probe (news-test.controller.ts's own file header). Zero module-graph
// change: both were already reachable, this is purely a 3rd/4th injection site.
//
// Zero-regression invariant: purely ADDITIVE — no existing table, service, tick, or path is touched.

import { Module } from '@nestjs/common';

import { testControllersEnabled } from '../../protocol/test-routes-gate';
import { SchedulerModule } from '../../citysim/scheduler/scheduler.module';
import { AmbientModule } from '../ambient/ambient.module';
import { NewsBeatBootGuardService } from './news-beat-boot-guard.service';
import { NewsFodderReader } from './news-fodder-reader.service';
import { NewsBeatRepository } from './news-beat.repository';
import { NewsBeatGeneratorService } from './news-beat-generator.service';
import { BrennarDailyService } from './brennar-daily.service';
import { NewsProjectionService } from './news.projection.service';
import { NewsController } from './news.controller';
import { NewsAdminController } from './news-admin.controller';
import { NewsTestController } from './news-test.controller';

// NewsController: the REAL production player-facing feed/detail surface (C6, design §6.1) — always
// registered. NewsAdminController: the REAL production BO surface (C7, design §6.2) — always registered
// (mirrors `RandomWorldAdminController`'s own "NOT conditional on NODE_ENV" posture). NewsTestController:
// test-only probe routes (R-EC-2) — NOT registered in production.
const controllers = [
  NewsController,
  NewsAdminController,
  ...(testControllersEnabled() ? [NewsTestController] : []),
];

@Module({
  imports: [
    SchedulerModule, // CitySimSchedulerService DI anchor — NIGHTLY/30 registration (C2).
    AmbientModule,   // C5 — ConstantHumRepository (S3, cooper_affair's/slow_page's own ambient-hum reads).
  ],
  controllers,
  providers: [
    NewsBeatBootGuardService,  // C1: onModuleInit keystone-probability mutex boot guard.
    NewsFodderReader,          // C2: the 4-source READ-only fodder scan. C3: + resolution scan + indicator pool.
    NewsBeatRepository,        // C2: claim + digest insert + counters. C3: + news_thread CRUD + template beats.
    NewsBeatGeneratorService,  // C3: composeRetrospectiveArc + hindsight-publication/wire-day composition.
    BrennarDailyService,       // C2: registers BRENNAR_DAILY_TICK at NIGHTLY/30. C3: phases 2/3/4d go live. C5: phase 4a (keystones). C6: phase 4d (slow_page).
    NewsProjectionService,     // C6: GET /v1/news/feed + GET /v1/news/beats/:id projection (design §6.1).
  ],
  exports: [],
})
export class NewsBeatModule {}
