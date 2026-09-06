// IMPLEMENTS: docs/superpowers/specs/2026-09-02-w12a-two-person-perimetre.md §12 C3 (routes) + §11
//             (règle de câblage) + R-RBAC-6 (`authorization_rbac.md:248`, "toute action `staff.*`
//             génère un `AuditEvent`").
//             -- W1.2-a C3 — 2026-09-02 --
//
// `EnforcementActionController` — 3 routes:
//   POST /v1/admin/anticheat/enforcement/propose   — staff A proposes an action.
//   POST /v1/admin/anticheat/enforcement/execute    — staff A (the SAME staff, enforced by
//                                                      `TwoPersonApprovalRepository.consumeAtomic`'s own
//                                                      `initiator_account_id = …` guard) executes a
//                                                      previously-APPROVED BAN/SUSPEND.
//   GET  /v1/admin/anticheat/enforcement?playerId=  — this player's enforcement history.
//
// ⛔ `@Controller('admin')` + relative method paths, NOT a versioned `@Controller` + a full `admin/…`
// path in the method decorator — MEASURED (worktree `mafia-w12`, 2026-09-02): every one of the 33
// controllers in this codebase that uses `requireStaffRole` is `@Controller('admin')`;
// `two-person-approval.controller.ts`'s own header cites the SAME 33/33 measurement (this lot's C2).
//
// ⛔ NO `before_state`/`after_state` body fields — deliberately narrowed (implementation-notes.md
// §Deviations D-C3-state): the service records only the `action_enum` it actually knows, never an
// arbitrary caller-supplied JSON blob.
//
// Identity: the acting staff is ALWAYS `req.account!.account_id` — the VERIFIED JWT, never a body field
// (R-ID-3, same discipline `two-person-approval.controller.ts`'s own header states). Neither body
// interface below has a `staff_id`/`initiator_account_id` field, and `rejectUnknownFields`'s allowlist
// does not name one either.

import { Body, Controller, Get, HttpCode, Post, Query, Req, UseGuards } from '@nestjs/common';

import { AdminAuditLogService } from '../../db/admin-audit-log.service';
import {
  UuidQuery,
  enumField,
  optionalStringField,
  optionalUuidField,
  rejectUnknownFields,
  uuidField,
} from '../../common/param-pipes';
import { ApiError } from '../../protocol/api-error';
import { requireStaffRole } from '../../auth/staff-role.guard';
import type { RequestWithAccount } from '../../auth/authenticated-request';
import { ENFORCEMENT_ACTION_TICKET_REF_MAXLEN, type EnforcementActionRow, type EnforcementActionTypeEnumTs } from '../../db/schema/anti_cheat';
import { EnforcementActionService } from './enforcement.service';

interface EnforcementActionBody {
  target_player_id?: string;
  action_enum?: string;
  source_signal_id?: string;
  ticket_ref?: string;
}

/** The domain `propose`/`execute` accept — WARN + the two-person-gated pair (§11). SHADOW_BAN is
 *  hors périmètre (§10.5 of the périmètre spec): omitting it from this literal list is what makes
 *  `enumField` reject it with a normal 422, rather than this controller special-casing it. */
const PROPOSABLE_ACTIONS = ['WARN', 'SUSPEND', 'BAN'] as const;
/** `execute` never accepts WARN (WARN has no pending approval to consume — `propose` already wrote its
 *  `enforcement_action` row synchronously). */
const EXECUTABLE_ACTIONS = ['SUSPEND', 'BAN'] as const;

function toJson(row: EnforcementActionRow) {
  return {
    enforcement_action_id: row.enforcement_action_id,
    target_player_id: row.target_player_id,
    action_enum: row.action_enum,
    source_signal_id: row.source_signal_id,
    staff_id: row.staff_id,
    before_state: row.before_state,
    after_state: row.after_state,
    shadow_banned: row.shadow_banned,
    two_person_approval_id: row.two_person_approval_id,
    ticket_ref: row.ticket_ref,
    created_at: row.created_at,
  };
}

function readBody(raw: EnforcementActionBody, allowed: readonly string[]) {
  const record = raw as unknown as Record<string, unknown>;
  rejectUnknownFields(record, allowed);
  const targetPlayerId = uuidField(record, 'target_player_id');
  const sourceSignalId = optionalUuidField(record, 'source_signal_id') ?? null;
  const ticketRef = optionalStringField(record, 'ticket_ref', ENFORCEMENT_ACTION_TICKET_REF_MAXLEN) ?? null;
  return { targetPlayerId, sourceSignalId, ticketRef };
}

@Controller('admin')
export class EnforcementActionController {
  constructor(
    private readonly service: EnforcementActionService,
    private readonly auditLog: AdminAuditLogService,
  ) {}

  /**
   * `POST /v1/admin/anticheat/enforcement/propose` (§12 C3). `WARN` writes `enforcement_action`
   * immediately (201, `{ outcome: 'executed', enforcement_action }`). `SUSPEND`/`BAN` open a two-person
   * request instead — NO `enforcement_action` row yet (201, `{ outcome: 'pending_approval',
   * two_person_approval_id, permission_key }`). `TWO_PERSON_PERMISSION_KEY`'s own REUSE keys
   * (`staff.player.ban_permanent`/`staff.player.suspend_long`) surface here so the BO caller knows
   * which permission a second operator needs to decide.
   */
  @Post('anticheat/enforcement/propose')
  @HttpCode(201)
  @UseGuards(requireStaffRole('admin'))
  async propose(@Body() body: EnforcementActionBody, @Req() req: RequestWithAccount) {
    const { targetPlayerId, sourceSignalId, ticketRef } = readBody(body, [
      'target_player_id',
      'action_enum',
      'source_signal_id',
      'ticket_ref',
    ]);
    const actionEnum = enumField(
      PROPOSABLE_ACTIONS,
      body as unknown as Record<string, unknown>,
      'action_enum',
    ) as EnforcementActionTypeEnumTs;

    const initiatorAccountId = req.account!.account_id;
    const result = await this.service.propose(initiatorAccountId, {
      targetPlayerId,
      actionEnum,
      sourceSignalId,
      ticketRef,
    });

    if (result.kind === 'executed') {
      // R-RBAC-6 — every staff.* action gets an AuditEvent.
      await this.auditLog.emit({
        adminUserId: initiatorAccountId,
        actionType: 'CREATE',
        targetEntityType: 'enforcement_action',
        targetEntityId: result.enforcementAction.enforcement_action_id,
        targetPlayerId: result.enforcementAction.target_player_id,
        beforeState: {},
        afterState: { action_enum: result.enforcementAction.action_enum },
      });
      return { outcome: 'executed', enforcement_action: toJson(result.enforcementAction) };
    }

    // pending_approval — R-RBAC-6 still applies: proposing a two-person-gated action IS a staff.*
    // action, even though no `enforcement_action` row exists yet. This call bypasses
    // `TwoPersonApprovalController.request()` (it calls `TwoPersonApprovalService.request()` directly,
    // this lot's C3 §12), so THAT route's own audit emission never fires — this is the equivalent entry,
    // same shape (`targetEntityType: 'two_person_approval'`, C2's own convention,
    // `two-person-approval.controller.ts:105-120`), the row actually created.
    await this.auditLog.emit({
      adminUserId: initiatorAccountId,
      actionType: 'CREATE',
      targetEntityType: 'two_person_approval',
      targetEntityId: result.approvalId,
      targetPlayerId,
      beforeState: {},
      afterState: { state: 'AWAITING_SECOND', permission_key: result.permissionKey, action_enum: actionEnum },
    });
    return {
      outcome: 'pending_approval',
      two_person_approval_id: result.approvalId,
      permission_key: result.permissionKey,
    };
  }

  /**
   * `POST /v1/admin/anticheat/enforcement/execute` (§12 C3). Re-supplies the SAME
   * (`target_player_id`, `action_enum`) context `propose()` opened — `TwoPersonApprovalService.consume`
   * verifies an APPROVED, unexpired, unconsumed approval exists for EXACTLY that context AND that the
   * CALLER is its initiator (`two-person-approval.repository.ts#consumeAtomic`'s own guard — no check
   * duplicated here). 201 (a NEW `enforcement_action` row is created).
   */
  @Post('anticheat/enforcement/execute')
  @HttpCode(201)
  @UseGuards(requireStaffRole('admin'))
  async execute(@Body() body: EnforcementActionBody, @Req() req: RequestWithAccount) {
    const { targetPlayerId, sourceSignalId, ticketRef } = readBody(body, [
      'target_player_id',
      'action_enum',
      'source_signal_id',
      'ticket_ref',
    ]);
    const actionEnum = enumField(
      EXECUTABLE_ACTIONS,
      body as unknown as Record<string, unknown>,
      'action_enum',
    ) as EnforcementActionTypeEnumTs;

    const initiatorAccountId = req.account!.account_id;
    const enforcementAction = await this.service.execute(initiatorAccountId, {
      targetPlayerId,
      actionEnum,
      sourceSignalId,
      ticketRef,
    });

    await this.auditLog.emit({
      adminUserId: initiatorAccountId,
      actionType: 'CREATE',
      targetEntityType: 'enforcement_action',
      targetEntityId: enforcementAction.enforcement_action_id,
      targetPlayerId: enforcementAction.target_player_id,
      beforeState: {},
      afterState: {
        action_enum: enforcementAction.action_enum,
        two_person_approval_id: enforcementAction.two_person_approval_id,
      },
    });
    return { outcome: 'executed', enforcement_action: toJson(enforcementAction) };
  }

  /** `GET /v1/admin/anticheat/enforcement?playerId=` (§12 C3) — this player's enforcement history,
   *  newest first. No audit (pure read — mirrors `two-person-approval.controller.ts#pending`'s own
   *  no-audit GET). */
  @Get('anticheat/enforcement')
  @UseGuards(requireStaffRole('admin'))
  async list(@Query('playerId', UuidQuery) playerId?: string) {
    if (!playerId) {
      throw new ApiError('VALIDATION_FAILED', {
        message: 'playerId query param is required.',
        details: { param: 'playerId' },
      });
    }
    const rows = await this.service.listByPlayer(playerId);
    return { enforcement_actions: rows.map(toJson) };
  }
}
