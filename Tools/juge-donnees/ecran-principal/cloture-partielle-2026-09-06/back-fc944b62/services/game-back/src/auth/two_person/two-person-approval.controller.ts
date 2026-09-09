// IMPLEMENTS: docs/tech/17_auth_and_accounts/authorization_rbac.md §Two-person rule (:138-140,
//             "NestJS — backend back-office": "TwoPersonModule : routes /admin/twoperson/*") +
//             R-RBAC-3 (:245) + R-RBAC-6 (:248)
//             Périmètre: docs/superpowers/specs/2026-09-02-w12a-two-person-perimetre.md §4 pt.3
//             — W1.2-a C2 — 2026-09-02 --
//
// `TwoPersonApprovalController` — the 3 canon routes (`:138-140`), verbatim:
//   POST /v1/admin/twoperson/request      — staff A initiates.
//   GET  /v1/admin/twoperson/pending      — staff B's queue.
//   POST /v1/admin/twoperson/:id/decide   — staff B approves/declines.
//
// ⛔ `@Controller('admin')` + relative method paths, NOT `@Controller({version: String(CURRENT_API_
// MAJOR)})` + a full `admin/…` path in the method decorator. MEASURED (worktree `mafia-w12`,
// 2026-09-02): every one of the 33 controllers in this codebase that uses `requireStaffRole` —
// zero exceptions — is `@Controller('admin')`. `URI_VERSIONING`'s own `defaultVersion: '1'`
// (`protocol/versioning.ts:32`) already routes an un-versioned `@Controller('admin')` to `/v1/admin/…`
// — the two forms are NOT alternative-but-equal; `@Controller('admin')` is the one this codebase's
// admin-controller class actually uses, 33/33. See `implementation-notes.md` §Deviations.
//
// Identity: initiator (`request`) / approver (`decide`) are ALWAYS `req.account!.account_id` — the
// VERIFIED JWT, never a body field (R-ID-3 pattern, property #1 of this chunk's brief). Neither body
// interface below has an `account_id`/`approver_account_id`/`initiator_account_id` field, and
// `rejectUnknownFields`'s allowlist does not name one either — a caller cannot smuggle an identity in.

import { Body, Controller, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';

import { AdminAuditLogService } from '../../db/admin-audit-log.service';
import {
  UuidParam,
  enumField,
  optionalUuidField,
  rejectUnknownFields,
  stringField,
} from '../../common/param-pipes';
import { requireStaffRole } from '../staff-role.guard';
import type { RequestWithAccount } from '../authenticated-request';
import { TwoPersonApprovalService } from './two-person-approval.service';
import type { TwoPersonApprovalRowView } from './two-person-approval.repository';
import {
  TWO_PERSON_PERMISSION_KEY_MAXLEN,
  TWO_PERSON_TARGET_ENTITY_TYPE_MAXLEN,
} from '../../db/schema/two_person_approval';

interface RequestBody {
  permission_key?: string;
  target_entity_type?: string;
  target_entity_id?: string;
}

interface DecideBody {
  decision?: string;
}

/** The 2-member decision domain this route accepts — the canon's own "approuve ou refuse" (`:139`). */
const DECISIONS = ['approve', 'decline'] as const;

/** JSON projection shared by all 3 routes — `target_ref` materialized as the type+id pair the schema
 *  itself uses (C1's own ADR, `db/schema/two_person_approval.ts`'s header). */
function toJson(row: TwoPersonApprovalRowView) {
  return {
    approval_id: row.approvalId,
    initiator_account_id: row.initiatorAccountId,
    approver_account_id: row.approverAccountId,
    permission_key: row.permissionKey,
    target_entity_type: row.targetEntityType,
    target_entity_id: row.targetEntityId,
    state: row.state,
    requested_at: row.requestedAt,
    decided_at: row.decidedAt,
    expires_at: row.expiresAt,
    consumed_at: row.consumedAt,
  };
}

@Controller('admin')
export class TwoPersonApprovalController {
  constructor(
    private readonly service: TwoPersonApprovalService,
    private readonly auditLog: AdminAuditLogService,
  ) {}

  /**
   * `POST /v1/admin/twoperson/request` (canon `:138`) — staff A initiates.
   *
   * `target_entity_id` is OPTIONAL (canon: not every `target_ref` has a uuid identity, e.g. a tunable
   * key) — `optionalUuidField` (absent/blank → undefined, present → must be a UUID).
   *
   * 409 `RESOURCE_STATE_CONFLICT` on the initiator's pending cap OR a duplicate pending request for
   * the same context (`TwoPersonApprovalService.request`).
   */
  @Post('twoperson/request')
  @HttpCode(201) // a NEW `two_person_approval` row is created → 201 (the codebase's own explicit
  // convention for every create route — never left to Nest's implicit POST default; e.g.
  // `named-sequence.controller.ts:48`, `insurance.controller.ts:94`).
  @UseGuards(requireStaffRole('admin'))
  async request(@Body() body: RequestBody, @Req() req: RequestWithAccount) {
    const raw = body as unknown as Record<string, unknown>;
    rejectUnknownFields(raw, ['permission_key', 'target_entity_type', 'target_entity_id']);
    const permissionKey = stringField(raw, 'permission_key', TWO_PERSON_PERMISSION_KEY_MAXLEN);
    const targetEntityType = stringField(raw, 'target_entity_type', TWO_PERSON_TARGET_ENTITY_TYPE_MAXLEN);
    const targetEntityId = optionalUuidField(raw, 'target_entity_id') ?? null;

    const row = await this.service.request(req.account!.account_id, permissionKey, targetEntityType, targetEntityId);

    // R-RBAC-6 — every staff.* action gets an AuditEvent (D1, `two_person_approval` deviation: the
    // canon's own `TWO_PERSON_*` action types don't exist in the 7-member `audit_action_type` enum —
    // emitted on the existing `CREATE` member instead, discriminant in `afterState`).
    await this.auditLog.emit({
      adminUserId: req.account!.account_id,
      actionType: 'CREATE',
      targetEntityType: 'two_person_approval',
      targetEntityId: row.approvalId,
      beforeState: {},
      afterState: {
        state: row.state,
        permission_key: row.permissionKey,
        target_entity_type: row.targetEntityType,
        target_entity_id: row.targetEntityId,
      },
    });

    return { approval: toJson(row) };
  }

  /**
   * `GET /v1/admin/twoperson/pending` (canon `:139`) — staff B's queue. AWAITING_SECOND + not-yet-
   * expired only (`TwoPersonApprovalRepository.listPending`'s own read-time filter).
   */
  @Get('twoperson/pending')
  @UseGuards(requireStaffRole('admin'))
  async pending() {
    const rows = await this.service.listPending();
    return { pending: rows.map(toJson) };
  }

  /**
   * `POST /v1/admin/twoperson/:id/decide` (canon `:139-140`) — staff B approves or declines. Body
   * `{ decision: 'approve' | 'decline' }`. 200 (mutates an existing row, not a create).
   *
   * 404 `RESOURCE_NOT_FOUND` — unknown id. 403 `AUTHZ_PERMISSION_DENIED` — the decider IS the
   * initiator (R-RBAC-3, property #1: the approver's identity is `req.account!.account_id`, never a
   * body field — there is no way to name a DIFFERENT approver than the caller). 409
   * `RESOURCE_STATE_CONFLICT` — expired, or already decided (`TwoPersonApprovalService.decide`).
   */
  @Post('twoperson/:id/decide')
  @HttpCode(200)
  @UseGuards(requireStaffRole('admin'))
  async decide(@Param('id', UuidParam) id: string, @Body() body: DecideBody, @Req() req: RequestWithAccount) {
    const raw = body as unknown as Record<string, unknown>;
    rejectUnknownFields(raw, ['decision']);
    const decision = enumField(DECISIONS, raw, 'decision');
    const beforeState = { state: 'AWAITING_SECOND' as const };

    const row = await this.service.decide(id, req.account!.account_id, decision === 'approve');

    // R-RBAC-6 — the decision transition itself is the mutation this audits (the DB CHECK backstop
    // for R-RBAC-3 makes a self-decide unreachable before this line ever runs — see the service).
    await this.auditLog.emit({
      adminUserId: req.account!.account_id,
      actionType: 'UPDATE',
      targetEntityType: 'two_person_approval',
      targetEntityId: row.approvalId,
      beforeState,
      afterState: { state: row.state },
    });

    return { approval: toJson(row) };
  }
}
