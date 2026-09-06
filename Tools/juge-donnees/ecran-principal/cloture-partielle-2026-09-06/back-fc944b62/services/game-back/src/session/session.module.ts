// IMPLEMENTS: docs/superpowers/plans/2026-07-10-p3-A-session-spine-plan.md §C2 (session runtime module)
//             Design DD-P2 (§2.2): `src/session/` is the ratified home for the session runtime
//             (session.module/service/repository/controller + sweep tick) — distinct from
//             `progression/loop10/` (C5) and `core_loops/` (the C1 cross-cutting tunables/_test home,
//             C1 reviewer-ratified).
//             — P3-A C2 — 2026-07-10
//
// `SessionModule` — D1/D2/D10: open/close/sweep + the counter-increment seam. Imports SchedulerModule
// (CitySimSchedulerService for the HOURLY/5 registration + CityEventBus for Session{Opened,Closed}Event)
// + ProgressionModule (ProgressionRepository.ensureRow — the Phase-17 idempotent row-create REUSE).
// Exports SessionService (consumed by `ExceptionsModule` for the D2 resolve-path counter seam, and by
// `CoreLoopsModule` for the `open-session-as`/`run-session-sweep` `_test` routes).
//
// ★ P3-A C6 (D11) fold: `forwardRef(() => Loop10Module)` — `SessionService.open()`'s FRESH-open path
// now calls `HlCardService.computeAndPersist` (compute-at-open). This closes a genuine 2-way module
// cycle: `Loop10Module` already needs `SessionService` (C5, D9 active-session read) and now
// `SessionModule` needs `Loop10Module`'s `HlCardService` — `forwardRef` on BOTH sides (here + `loop10.
// module.ts`) resolves it (the established `combat.module.ts` ↔ `diplomacy.module.ts` precedent).
//
// ★ P3-A C7 fold: `SessionService.open()` now returns the FULL session-open payload, composed by the
// NEW `SessionOpenSequenceService` (this module's own `providers:` array below —
// `session-open-sequence.service.ts`'s own header carries the fuller account). That service needs
// `ExceptionsRepository`/`ExceptionsProjectionService` (REUSE of the exceptions-queue read + band
// projections) — rather than importing `ExceptionsModule` (which would reopen an UNRELATED
// `LieutenantModule` NestJS boot failure, verified empirically and reverted — see that file's header),
// this module RE-PROVIDES those two lightweight, cycle-free (DB-only) classes as its OWN additional
// providers. This touches ONLY the `providers:` array — `imports:` is UNCHANGED from its post-C6 shape,
// so NO new module-level cycle is introduced by this fold at all.
//
// ★ P3-B C6 (D11/§1.11) fold: the SAME re-provide discipline, ONE more class — `FlagDisciplineRepository`
// (`@Inject(DB)`-only, trivially cycle-safe) — so `SessionOpenSequenceService` can read the player's
// PENDING flag count DIRECTLY for the NEW `flag_review` glance block, without importing
// `FlagDisciplineModule` (which imports THIS module — the reverse edge would be the module cycle).
// `imports:` is UNCHANGED again.
//
// ★ P3-D C7 (design §10.3/ruling #5) fold: `settling_glance` needs `AnnealingRepository`. UNLIKE
// `FlagDisciplineModule`/`ExceptionsModule`, `AnnealingModule` is a LEAF (imports only `DbModule` +
// `SchedulerModule` — neither of which imports `SessionModule`) — there is NO cycle to avoid, so this
// fold, alone among the three, imports the REAL owning module directly (mirrors `ProgressionModule`'s own
// direct-import positioning above) rather than re-providing the class. `imports:` GROWS by exactly one
// entry; the re-provide list is UNCHANGED.
//
// ★ P3-E C8 (design §15) fold: `friction_glance`+`compression_glance` need `FrictionBudgetRepository`
// (demolition) + `CompressionWeekRepository` (compression). UNLIKE `AnnealingModule`, `DemolitionModule`
// imports `Loop10Module` (which forwardRefs `SessionModule`, C6) and `CompressionModule` imports
// `FlagDisciplineModule` (which imports `SessionModule` directly, P3-B C6) — BOTH would reopen a genuine
// cycle if imported here. `FrictionBudgetRepository`/`CompressionWeekRepository` are BOTH re-provided
// DIRECTLY instead — the SAME `FlagDisciplineRepository` precedent (trivially cycle-safe: `FrictionBudget
// Repository` needs only `@Inject(DB)`; `CompressionWeekRepository` needs `@Inject(DB)` +
// `ProgressionRepository`, ALREADY resolvable here via the existing `ProgressionModule` import above —
// neither has any dependency edge back to `SessionModule`). `imports:` is UNCHANGED again.
//
// ★ W1.1-a C6 (design D1.1 pt 3/D10.2/D3) fold: `SessionOpenSequenceService#build()` gains TWO NEW
// responsibilities — (a) the welcome-grant REPAIR SEAM (`OnboardingGrantService.grantWelcomeAssets`,
// re-called on EVERY `session/open`, idempotent no-op once claimed — D1.1 pt 3, the SAME class C3
// provisioned in `AuthModule`, anticipated there as the repair seam this fold now activates — r5/M2:
// no longer quoted here, that file's wording moved twice since) and (b) the funnel-state
// HOME_FIRST/QUIET_STATE writers + read-back (`OnboardingFunnelRepository`,
// design D3). `OnboardingGrantService`'s OWN constructor needs `OnboardingGrantRepository` +
// `LieutenantRepository` + `ExceptionsRepository` (already re-provided above) — ALL FOUR are
// `@Inject(DB)`-only (or, for `OnboardingGrantService` itself, only these trivially-DB-only classes),
// so ALL are re-provided DIRECTLY here — the SAME `FlagDisciplineRepository`/`ExceptionsRepository`
// precedent, NOT a real module import (`AuthModule.imports` must stay EMPTY — D1.1's own invariant — so
// `OnboardingGrantService`/`OnboardingGrantRepository` are declared in `AuthModule.providers` WITHOUT
// `exports:`, D10.2; re-provisioning a SEPARATE instance here is the documented, deliberate escape
// hatch D10.2 itself names: SessionModule's re-provision (C6, already live) is exactly that, a
// considered decision naming this exact class, not a workaround). `imports:` is UNCHANGED again.
//
// ★ W6.1 C1 (2026-08-13, design 2026-08-12-w6.1-combat-production-design.md §4 chunk C1, D2) fold:
// `OnboardingGrantService.grantWelcomeAssets`'s repair-seam call (above) now ALSO seeds the player's 4
// `rival_state`/4 `rival_pair_pressure` rows on its own tx. Its dependency graph therefore grows by
// `RivalSeedService` — TRIVIALLY `@Inject(DB)`-only (`rival-seed.service.ts:157`), the SAME shape as
// every other class in this re-provide list — so it is re-provided DIRECTLY here too. ★ Deviation from
// the design's literal text (consigned `2026-08-13-w6.1-C1-implementation-notes.md` §Deviations): the
// design says "OnboardingModule importe RivalAiModule" — no `OnboardingModule` exists, and `RivalAiModule`
// does not even export `RivalSeedService` (`rival-ai.module.ts:98-108`), so a real module import could
// not have resolved it regardless. `imports:` is UNCHANGED again.

import { Module, forwardRef } from '@nestjs/common';

import { DbModule } from '../db/db.module';
import { AuthModule } from '../auth/auth.module';
import { SchedulerModule } from '../citysim/scheduler/scheduler.module';
import { ProgressionModule } from '../progression/progression.module';
import { Loop10Module } from '../progression/loop10/loop10.module';
import { ExceptionsRepository } from '../exceptions/exceptions.repository';
import { ExceptionsProjectionService } from '../exceptions/exceptions.projection.service';
import { FlagDisciplineRepository } from '../core_loops/flag_discipline/flag-discipline.repository';
import { AnnealingModule } from '../core_loops/annealing/annealing.module';
import { FrictionBudgetRepository } from '../core_loops/demolition/friction-budget.repository';
import { CompressionWeekRepository } from '../core_loops/compression/compression-week.repository';
import { OnboardingGrantRepository } from '../onboarding/onboarding-grant.repository';
import { OnboardingGrantService } from '../onboarding/onboarding-grant.service';
import { LaunderingPersistenceService } from '../operational/laundering_persistence/laundering-persistence.service';
import { OnboardingFunnelRepository } from '../onboarding/onboarding-funnel.repository';
import { LieutenantRepository } from '../operational/lieutenant/lieutenant.repository';
import { RivalSeedService } from '../operational/conflict/rival/rival-seed.service';
import { SupplyNodePressureRepository } from '../core_loops/supply_chain/supply-node-pressure.repository';
import { SessionRepository } from './session.repository';
import { SessionService } from './session.service';
import { SessionOpenSequenceService } from './session-open-sequence.service';
import { SessionController } from './session.controller';

@Module({
  imports: [DbModule, AuthModule, SchedulerModule, ProgressionModule, forwardRef(() => Loop10Module), AnnealingModule],
  controllers: [SessionController],
  providers: [
    SessionRepository,
    SessionService,
    ExceptionsRepository,
    ExceptionsProjectionService,
    // P3-B C6 (D11/§1.11) — re-provided DIRECTLY (NOT via `FlagDisciplineModule`, which imports THIS
    // module — importing it back here would be the module cycle): `FlagDisciplineRepository`'s trivial
    // `@Inject(DB)`-only dependency shape is exactly as cycle-safe as `ExceptionsRepository` above (the
    // SAME P3-A C7 precedent this module already applies). Consumed by `SessionOpenSequenceService` for
    // the `flag_review.pending_review_count` glance read.
    FlagDisciplineRepository,
    // P3-E C8 (design §15) — re-provided DIRECTLY (see file header): `FrictionBudgetRepository`
    // (`@Inject(DB)`-only) + `CompressionWeekRepository` (`@Inject(DB)` + `ProgressionRepository`, already
    // resolvable via `ProgressionModule` above). Consumed by `SessionOpenSequenceService` for the
    // `friction_glance`/`compression_glance` glance reads.
    FrictionBudgetRepository,
    CompressionWeekRepository,
    // W1.1-a C6 (design D1.1 pt 3/D10.2) — re-provided DIRECTLY (see file header): the repair seam's
    // OWN dependency graph, ALL trivially `@Inject(DB)`-only or (OnboardingGrantService) built only from
    // such classes. `AuthModule.imports` stays EMPTY — this is a SEPARATE instance, never a re-export.
    OnboardingGrantRepository,
    LieutenantRepository,
    // W6.1 C1 (design D2) — re-provided DIRECTLY (see file header): `RivalSeedService`'s SAME
    // trivially `@Inject(DB)`-only shape. Consumed by `OnboardingGrantService.grantWelcomeAssets`'s
    // repair-seam call for the rival-seed half.
    RivalSeedService,
    OnboardingGrantService,
    // LOT PLANQUE C2 (a) — l'écrivain du maillon `safehouses`, re-provisionné DIRECTEMENT et NON
    // exporté, EXACTEMENT comme ses voisins : sa forme est `@Inject(DB)`-only, donc aucun cycle,
    // aucun `forwardRef`. La garde structurelle tient : un TIERS module qui tenterait de l'injecter
    // échouerait à la RÉSOLUTION au démarrage de Nest — une erreur de BOOT, pas un oubli de revue.
    LaunderingPersistenceService,
    // TD-550 — re-provisionné DIRECTEMENT, EXACTEMENT comme `LaunderingPersistenceService` ci-dessus :
    // `@Inject(DB)`-only, aucun cycle. Consommé par `OnboardingGrantService.grantWelcomeAssets`'s
    // repair-seam call (D1.1 pt 3) pour amorcer le nœud de chaîne d'approvisionnement de chaque bâtiment.
    SupplyNodePressureRepository,
    // W1.1-a C6 (design D3) — the funnel-state HOME_FIRST/QUIET_STATE writers + read-back. Trivially
    // `@Inject(DB)`-only (see `onboarding-funnel.repository.ts`'s own header) — the SAME re-provide
    // shape as `ExceptionsRepository` above; ALSO re-provided in `ExceptionsModule` for the resolve-hook
    // writer (that module's own header).
    OnboardingFunnelRepository,
    SessionOpenSequenceService,
  ],
  exports: [SessionService],
})
export class SessionModule {}
