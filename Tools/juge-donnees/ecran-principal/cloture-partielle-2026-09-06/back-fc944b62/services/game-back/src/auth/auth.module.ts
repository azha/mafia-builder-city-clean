// IMPLEMENTS: docs/tech/17_auth_and_accounts/authentication_flows.md §NestJS — AuthModule
//             + identity_model.md §NestJS PlayerAccountService (skeleton subset)
//             -- session:2026-06-02 (Phase 0 Task 6) --
//
// `AuthModule` — skeleton auth surface for the game-back: signin (POST /v1/auth/signin),
// authenticated profile (GET /v1/me, JwtAuthGuard), and the StaffRoleGuard (exported so the
// HealthController can gate /health/detailed). Depends on the @Global() DbModule (DB provider).
//
// W6a C1.0 (2026-08-08): PlayerIdentityService (the P-B account_id → player_id resolver, D0 option
// (c)) is provided + exported here so any module that already imports AuthModule for JwtAuthGuard
// (DistributionModule, InspectionQueueModule, …) gets it for free — no new module import needed at
// the consuming controllers.
//
// W1.1-a C3 (2026-08-09, design §4 chunk C3 / D10.2): OnboardingGrantService + OnboardingGrantRepository
// are provided here (`AuthService.signup` is their first caller, post-commit) but DELIBERATELY
// ABSENT from `exports:` — the D10.2 STRUCTURAL guard. A provider not exported is un-injectable
// outside the module that declares it: any OTHER module attempting to `@Inject` either class — even
// one that already imports AuthModule for JwtAuthGuard — fails at Nest's DI boot pass, not at
// review time. This keeps the grant's write path (a free, instant, already-OPERATIONAL building —
// see onboarding-grant.repository.ts's header) OUT of the shared operational domain entirely; it is
// NOT a discipline anyone has to remember. `AuthModule.imports` stays EMPTY (see below) — the
// invariant this whole design leans on to avoid a 2-way module cycle.
//
// W1.1-a C4/C5 (2026-08-09, design §4 chunks C4/C5): `OnboardingGrantService.grantWelcomeAssets`
// (C3) now ALSO recruits the 2-lieutenant roster (C4) and pre-seeds the first Exception card (C5),
// all INSIDE its own single transaction (D1.1 pt 2 — the whole grant is one unit). It needs
// `LieutenantRepository`/`ExceptionsRepository` for that — re-provisioned DIRECTLY here (NOT via
// `LieutenantModule`/`ExceptionsModule`) for the SAME cycle-avoidance reason as C3:
// `LieutenantModule` already `imports: [AuthModule]` (for JwtAuthGuard), so `AuthModule` importing
// `LieutenantModule` back would open the exact 2-way cycle this design forbids. Both classes have a
// TRIVIAL constructor (`@Inject(DB)` only — `lieutenant.repository.ts:198`,
// `exceptions.repository.ts:30`), so a fresh module-scoped instance costs nothing (the SAME
// duplication idiom `LieutenantModule` itself already uses for `ExceptionsRepository`, and
// `session.module.ts` for `OnboardingGrantService`/`OnboardingGrantRepository`, C6). Neither is
// exported — AuthModule has no reason to hand either OUT (only `OnboardingGrantService` needs them).
//
// W6.1 C1 (2026-08-13, design 2026-08-12-w6.1-combat-production-design.md §4 chunk C1, D2):
// `OnboardingGrantService.grantWelcomeAssets` now ALSO seeds the player's 4 `rival_state` rows + 4
// `rival_pair_pressure` rows, on the SAME transaction (D2 — the design's own critère, "tx threaded").
// It needs `RivalSeedService` for that. ★ Deviation from the design's literal text (consigned
// `2026-08-13-w6.1-C1-implementation-notes.md` §Deviations): the design names `OnboardingModule
// importe RivalAiModule` — no `OnboardingModule` exists (`OnboardingGrantService` lives HERE and in
// `SessionModule`, never in a module of its own). `RivalSeedService` has the SAME TRIVIAL constructor
// shape as `LieutenantRepository`/`ExceptionsRepository` above (`@Inject(DB)` only —
// `rival-seed.service.ts:157`), so it is re-provisioned DIRECTLY here too, the identical
// cycle-avoidance idiom — importing `RivalAiModule` would ALSO be a dead end: it does not export
// `RivalSeedService` (`rival-ai.module.ts:98-108`), so a real import could not resolve it anyway.
//
// DEFERRED: AuthFlowSessionService, MailSender, RBACModule, refresh/signout controllers,
// 2FA, OAuth — see account.ts header for the full deferral list.

import { Module } from '@nestjs/common';

import { AuthController, MeController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { StaffRoleGuard } from './staff-role.guard';
import { PlayerIdentityService } from './player-identity.service';
import { OnboardingGrantService } from '../onboarding/onboarding-grant.service';
import { OnboardingGrantRepository } from '../onboarding/onboarding-grant.repository';
import { LaunderingPersistenceService } from '../operational/laundering_persistence/laundering-persistence.service';
import { LieutenantRepository } from '../operational/lieutenant/lieutenant.repository';
import { ExceptionsRepository } from '../exceptions/exceptions.repository';
import { RivalSeedService } from '../operational/conflict/rival/rival-seed.service';
import { SupplyNodePressureRepository } from '../core_loops/supply_chain/supply-node-pressure.repository';

@Module({
  controllers: [AuthController, MeController],
  providers: [
    AuthService,
    JwtAuthGuard,
    StaffRoleGuard,
    PlayerIdentityService,
    // W1.1-a C3 (D10.2) — NOT in exports:, see header note above.
    OnboardingGrantService,
    OnboardingGrantRepository,
    // LOT PLANQUE C2 (a) — l'écrivain du maillon `safehouses`, re-provisionné DIRECTEMENT et NON
    // exporté, EXACTEMENT comme ses voisins : sa forme est `@Inject(DB)`-only, donc aucun cycle,
    // aucun `forwardRef`. La garde structurelle tient : un TIERS module qui tenterait de l'injecter
    // échouerait à la RÉSOLUTION au démarrage de Nest — une erreur de BOOT, pas un oubli de revue.
    LaunderingPersistenceService,
    // W1.1-a C4/C5 — re-provisioned directly (see header note above), NOT in exports:.
    LieutenantRepository,
    ExceptionsRepository,
    // W6.1 C1 — re-provisioned directly (see header note above), NOT in exports:.
    RivalSeedService,
    // TD-550 — re-provisioned DIRECTEMENT et NON exportée, EXACTEMENT comme `LaunderingPersistenceService`
    // ci-dessus : `@Inject(DB)`-only, aucun cycle, aucun `forwardRef`. Un TIERS module qui tenterait de
    // l'injecter échouerait à la RÉSOLUTION au démarrage de Nest.
    SupplyNodePressureRepository,
  ],
  // ⚠️ OnboardingGrantService/OnboardingGrantRepository/LieutenantRepository/ExceptionsRepository/
  // RivalSeedService/SupplyNodePressureRepository are deliberately ABSENT here (D10.2 + C4/C5 + W6.1 C1
  // + TD-550 — none has any reason to leave this module).
  exports: [AuthService, JwtAuthGuard, StaffRoleGuard, PlayerIdentityService],
})
export class AuthModule {}
