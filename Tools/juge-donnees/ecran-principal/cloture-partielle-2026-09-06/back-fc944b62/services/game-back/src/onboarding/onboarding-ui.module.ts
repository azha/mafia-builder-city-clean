// IMPLEMENTS: docs/superpowers/specs/2026-08-09-w1.1b-overlay-engine-design.md §4 chunks C2/C4
//             (§5 "Rayon").
//             Design §5: "Module NestJS | oui | screen_c8:333 laisse le module [module-TBD]. Prendre
//             src/onboarding/" + "session.module.ts | NON — et c'est le signe que D9 a été appliquée".
//             Architecture mirror: `meta_progression/budgets-horizon.module.ts` (P3-G C1 — "standalone
//             leaf module... registered directly in app.module.ts, nothing imports it back yet").
//             — W1.1-b C2 — 2026-08-09 — C4 — 2026-08-09 — C5 — 2026-08-09 —
//
// `OnboardingUiModule` — the NestJS home for the tutorial-overlay player routes (`/v1/ui/…`, design D5).
// Standalone leaf module (mirrors `BudgetsHorizonModule`/`DelegationRatchetModule`/`CueStackModule`) —
// registered directly in `app.module.ts`, nothing imports it back.
//
// ⛔ `SessionModule` does NOT import this module, and this module does NOT import `SessionModule`
// (design D9 — the resolver/service stay OFF the `session/open` cold-open path; `session-open-
// sequence.service.ts`'s own `onboarding` block is deliberately hors du `Promise.all`, §1 D9). If a
// future diff wires either direction, D9 has been silently reversed — see the design's own §5 table.
//
// C5 — `OnboardingFunnelRepository` is re-provided DIRECTLY here (a 4th independent DI instance
// alongside `ExceptionsModule`/`SessionModule`/`CueStackModule`'s own re-provides — that repository's
// OWN header: "@Inject(DB) only … trivially cycle-safe", the established house idiom for this exact
// class). `OnboardingOverlayResolver` (C5, NEW) needs it for the `QUIET_STATE` trigger read — no module
// import, no cycle risk, mirrors this file's OWN pre-existing `TutorialOverlayRepository` sharing.
//
// W1.1-c C1 — `MasteryScoreRepository` (`meta_progression/mastery-score.repository.ts`) is re-provided
// the SAME way: `@Inject(DB) only`, no `MetaProgressionModule` import, no cycle risk. Needed for the
// rank 5/D6 state-predicate read (`OnboardingOverlayResolver#hasEligibleGraduationCandidate`).
//
// W1.1-c C2 — `DisclosureScheduleService` (`disclosure-schedule.service.ts`) was a PLAIN provider at C2:
// no `@Inject(DB)`, no repository, pure function of `OnboardingOverlayResolver`'s own output. Consumed
// only by `TutorialOverlayController#getState`.
// ⛔ W1.1-c C3 — no longer plain: it now depends on `TutorialOverlayRepository` (ALREADY provided above,
// shared instance, no re-provide needed) AND `SessionRepository` (`../session/session.repository.ts`),
// re-provided DIRECTLY below — SAME "`@Inject(DB)` only, trivially cycle-safe" convention as
// `OnboardingFunnelRepository`/`MasteryScoreRepository`. ⛔ This does NOT import `SessionModule` — D9
// ("`SessionModule` does NOT import this module, and this module does NOT import `SessionModule`") binds
// the MODULE graph, not a single repository class; `SessionRepository` itself has no dependency on
// `SessionService`/`SessionModule`'s own providers (its own header: `@Inject(DB)` only), so re-providing
// it here creates no cycle and does not put this module back on the `session/open` path.
//
// `JwtAuthGuard` needs no `AuthModule` import here (`jwt-auth.guard.ts`'s own header: DB/REDIS are
// `@Global()`-injected directly so the guard resolves in ANY module without an `AuthModule` import —
// the SAME reason `BudgetsHorizonModule` never imports `AuthModule` either, despite using the guard).

import { Module } from '@nestjs/common';

import { DbModule } from '../db/db.module';
import { TutorialOverlayRepository } from './tutorial-overlay.repository';
import { TutorialOverlayService } from './tutorial-overlay.service';
import { TutorialOptOutService } from './tutorial-opt-out.service';
import { OnboardingFunnelRepository } from './onboarding-funnel.repository';
import { OnboardingOverlayResolver } from './onboarding-overlay.resolver';
import { TutorialOverlayController } from './tutorial-overlay.controller';
import { MasteryScoreRepository } from '../meta_progression/mastery-score.repository';
import { DisclosureScheduleService } from './disclosure-schedule.service';
import { SessionRepository } from '../session/session.repository';

@Module({
  imports: [DbModule],
  controllers: [TutorialOverlayController],
  // C4 — TutorialOptOutService: a SEPARATE class from TutorialOverlayService (see that file's own
  // header), sharing the SAME TutorialOverlayRepository instance (module-scoped singleton, standard
  // Nest DI — no re-provide needed, both providers resolve the ONE repository declared here).
  // C5 — OnboardingOverlayResolver: ALSO a separate class (see its own header, "LA FRONTIÈRE DE
  // CLASSES") — never merged into TutorialOverlayService. OnboardingFunnelRepository re-provided
  // directly (see file header above). W1.1-c C1 — MasteryScoreRepository re-provided the same way.
  // W1.1-c C3 — SessionRepository re-provided the same way (see file header above) — DisclosureSchedule
  // Service's new session-cap dependency.
  providers: [
    TutorialOverlayRepository,
    TutorialOverlayService,
    TutorialOptOutService,
    OnboardingFunnelRepository,
    OnboardingOverlayResolver,
    MasteryScoreRepository,
    DisclosureScheduleService,
    SessionRepository,
  ],
})
export class OnboardingUiModule {}
