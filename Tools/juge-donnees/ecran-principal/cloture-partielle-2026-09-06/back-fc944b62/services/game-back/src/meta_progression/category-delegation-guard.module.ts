// IMPLEMENTS: docs/superpowers/plans/2026-07-18-p3-F-delegation-ratchet-plan.md C6 ("CategoryDelegationGuard
//             ... retrofitted on the C0-enumerated guard sites of the 4 LIVE categories").
//             Decisions: docs/superpowers/specs/2026-07-18-p3-F-delegation-ratchet-decisions.md DD-F1
//             (circular-import guard — "a cycle is resolved by the P3-A C7 forwardRef precedent, never by
//             moving the governor"). Here a DIFFERENT, simpler resolution applies (no forwardRef needed):
//             `DelegationRatchetModule` ALREADY imports `LieutenantModule` (C5, for the service-level
//             `attachScript` REUSE) — so if `LieutenantModule` needed to import `DelegationRatchetModule`
//             back (for the guard), that WOULD be a genuine cycle. `CategoryDelegationGuard`'s own
//             dependency graph is trivial (`MasteryScoreRepository` needs only `@Inject(DB)`), so it is
//             pulled OUT into this dedicated LEAF module instead — mirrors the established codebase
//             precedent of re-providing a lightweight, stateless repository/service directly in a second
//             module rather than importing the whole owning module back (`distribution.module.ts`'s own
//             `LieutenantRepository`/`CourierInterceptionService` re-provides, same file, same reasoning).
//             This leaf imports ONLY `DbModule` (`@Global()`) — it cannot create a cycle with ANY of the 4
//             guard-site modules (`DistributionModule`/`LieutenantModule`/`RecruitmentModule`/
//             `PrecursorsModule`), none of which it imports.
//             — P3-F C6 — 2026-07-19
//
// `CategoryDelegationGuardModule` — the ONE-LINE-seam's own tiny DI home. Provides its OWN
// `MasteryScoreRepository` instance (a SEPARATE singleton from `DelegationRatchetModule`'s own — both are
// stateless wrappers over the SAME `@Global()` DB, so two instances behave identically; no shared mutable
// state exists to diverge). Imported by the 4 guard-site modules (`distribution.module.ts`,
// `lieutenant.module.ts`, `recruitment.module.ts`, `precursors.module.ts`) — a pure leaf, zero risk of
// circularity with any of them.

import { Module } from '@nestjs/common';

import { DbModule } from '../db/db.module';
import { MasteryScoreRepository } from './mastery-score.repository';
import { CategoryDelegationGuard } from './category-delegation-guard.service';

@Module({
  imports: [DbModule],
  providers: [MasteryScoreRepository, CategoryDelegationGuard],
  exports: [CategoryDelegationGuard],
})
export class CategoryDelegationGuardModule {}
