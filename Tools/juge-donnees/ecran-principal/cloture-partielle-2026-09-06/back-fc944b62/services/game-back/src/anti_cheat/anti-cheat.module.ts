// IMPLEMENTS: docs/superpowers/specs/2026-09-02-w12a-two-person-perimetre.md §12 (C3 la chaîne
//             d'enforcement + C3-bis l'appel joueur + C4 l'écrivain de `cheat_flag`).
//             -- W1.2-a C3+C4 — 2026-09-02 --
//
// `AntiCheatModule` — wires ch13 (anti-exploit/enforcement) into the game-back modular monolith. Copies
// the `InspectionQueueModule` bundling template (one module, several repositories/services/controllers
// for one domain — `inspection.module.ts`'s own header): the ADMIN enforcement chain
// (`EnforcementActionController`), the PLAYER appeal surface (`AppealController`), and the C1
// `cheat_flag` writer (`CheatFlagService` — no controller of its own THIS lot; ch09's future
// `GET /admin/players/:id/cheat-flags` is `[à backporter — hors périmètre W1.2-a]`, §4-bis).
//
// `imports: [TwoPersonModule, AuthModule]` — `TwoPersonModule` exports `TwoPersonApprovalService`
// (`EnforcementActionService#execute`/`#propose` consume it directly, this lot's C2); `AuthModule`
// exports `JwtAuthGuard` (`AppealController`, the player surface — the SAME reason
// `InspectionQueueModule` imports it, `inspection.module.ts:21,45`).
//
// `CheatFlagService` is the ONLY export: `InspectionQueueModule` imports THIS module for it
// (`false-report-ledger.service.ts#fileReport`, C4's appelant de production). Nothing else here has an
// external consumer yet — `EnforcementActionService`/`AppealCaseService` stay un-exported, the SAME
// "no reason to hand it out" discipline `TwoPersonModule`'s own header states for its own
// `TwoPersonApprovalRepository`.

import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { TwoPersonModule } from '../auth/two_person/two-person.module';
import { AdminAuditLogService } from '../db/admin-audit-log.service';
import { EnforcementActionController } from './enforcement/enforcement.controller';
import { EnforcementActionRepository } from './enforcement/enforcement.repository';
import { EnforcementActionService } from './enforcement/enforcement.service';
import { AppealController } from './appeals/appeal.controller';
import { AppealCaseRepository } from './appeals/appeal.repository';
import { AppealCaseService } from './appeals/appeal.service';
import { CheatFlagRepository } from './cheat_flag/cheat-flag.repository';
import { CheatFlagService } from './cheat_flag/cheat-flag.service';

@Module({
  imports: [TwoPersonModule, AuthModule],
  controllers: [EnforcementActionController, AppealController],
  providers: [
    EnforcementActionRepository,
    EnforcementActionService,
    AppealCaseRepository,
    AppealCaseService,
    CheatFlagRepository,
    CheatFlagService,
    // Re-provisioned directly, the SAME idiom `TwoPersonModule`'s own header cites (`db.module.ts`'s
    // `@Global()` DbModule makes this safe — no cross-module import needed for its own DB dependency).
    AdminAuditLogService,
  ],
  exports: [CheatFlagService],
})
export class AntiCheatModule {}
