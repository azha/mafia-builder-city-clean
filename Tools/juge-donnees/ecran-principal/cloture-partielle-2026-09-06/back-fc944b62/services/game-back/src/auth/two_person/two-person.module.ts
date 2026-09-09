// IMPLEMENTS: docs/tech/17_auth_and_accounts/authorization_rbac.md §Two-person rule (:134-159,
//             "NestJS — backend back-office": "TwoPersonModule : routes /admin/twoperson/*")
//             Périmètre: docs/superpowers/specs/2026-09-02-w12a-two-person-perimetre.md §4 pt.2-3
//             — W1.2-a C2 — 2026-09-02 --
//
// `TwoPersonModule` — the two-person-approval workflow (service + repository + the 3 canon routes).
// `imports: []` — no ambient module needed: `requireStaffRole`/`ApiError`/`UuidParam`/`rejectUnknownFields`
// are plain imports (not DI providers), and `DB` comes from the `@Global()` DbModule (no explicit
// import — `db.module.ts`'s own doc comment). Mirrors `AuthModule`'s own empty `imports: []`
// (`auth.module.ts` header: "AuthModule.imports stays EMPTY — the invariant this whole design leans
// on to avoid a 2-way module cycle").
//
// `AdminAuditLogService` is re-provisioned DIRECTLY here (not imported from elsewhere) — the SAME
// idiom every sibling BO module uses (`maintenance.module.ts`'s own C8 note: "the SAME `db/admin-
// audit-log.service.ts` singleton every sibling BO controller registers locally — @Global() DbModule
// makes this safe, no cross-module import").
//
// `TwoPersonApprovalService` is EXPORTED — forward-looking (W1.2-b..e, the 37 TD-107 endpoints this
// lot deliberately does NOT recable, §4-bis of the périmètre doc) will need `.consume()` once they are
// wired to actually require a spent approval before executing their own gated action.

import { Module } from '@nestjs/common';

import { AdminAuditLogService } from '../../db/admin-audit-log.service';
import { TwoPersonApprovalController } from './two-person-approval.controller';
import { TwoPersonApprovalRepository } from './two-person-approval.repository';
import { TwoPersonApprovalService } from './two-person-approval.service';

@Module({
  controllers: [TwoPersonApprovalController],
  providers: [TwoPersonApprovalRepository, TwoPersonApprovalService, AdminAuditLogService],
  exports: [TwoPersonApprovalService],
})
export class TwoPersonModule {}
