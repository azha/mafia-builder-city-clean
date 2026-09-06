// IMPLEMENTS: docs/superpowers/specs/2026-09-02-w12a-two-person-perimetre.md §11 (règle de câblage,
//             `enforcement_actions.md:215`) + §12 C3 (conception de la chaîne).
//             -- W1.2-a C3 — 2026-09-02 --
//
// `EnforcementActionService` — the ch13 enforcement chain, §11's câblage rule made code:
//   WARN            → `enforcement_action` written immediately, no two-person.
//   BAN / SUSPEND   → `TwoPersonApprovalService.request()` (AWAITING_SECOND), NO `enforcement_action`
//                     row yet — the table is append-only (`0011:87`); a row written before approval
//                     would be a non-approved sanction sitting there FOREVER, uncorrectable.
//   SHADOW_BAN      → hors périmètre (§10.5 of the périmètre spec) — `enumField`'s own closed literal
//                     list at the controller layer already excludes it; this service never sees it.
//
// `execute()` is the FUTURE-gated-action handler `two-person-approval.service.ts#consume`'s own header
// predicted ("a future caller knows its own identity + what it is trying to do, not an opaque
// approval_id") — it re-supplies the SAME (target_player_id, action_enum) context `propose()` used to
// open the request, `consume()` verifies an APPROVED-and-unconsumed approval exists for EXACTLY that
// context, and — atomically, same `tx` — writes the `enforcement_action` row. `consume()`'s own guarded
// UPDATE requires `initiator_account_id = <caller>` (`two-person-approval.repository.ts:215`): only the
// STAFF ACCOUNT THAT PROPOSED can ever successfully execute — the approver cannot (§12 C3's ⛔, "si
// l'approbateur pouvait exécuter, il lui suffirait d'approuver pour agir seul"). This is not a check
// this service re-implements; it falls straight out of `consume()`'s WHERE clause.

import { Inject, Injectable } from '@nestjs/common';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { TwoPersonApprovalService } from '../../auth/two_person/two-person-approval.service';
import type { EnforcementActionRow, EnforcementActionTypeEnumTs } from '../../db/schema/anti_cheat';
import { EnforcementActionRepository } from './enforcement.repository';

/** The 2-member two-person-gated action domain (§11 — this lot treats SUSPEND as BAN, the conservative
 *  reading of the canon's "optionnel"). WARN is handled separately (never two-person). SHADOW_BAN is
 *  excluded at the controller's `enumField` allowlist, never reaches this map. */
const TWO_PERSON_PERMISSION_KEY: Record<'BAN' | 'SUSPEND', string> = {
  // REUSE verbatim — `authorization_rbac.md`'s own catalogue (`appeals_process.md §R9.2` grep #9/#12),
  // NOT invented here: `staff.player.ban_permanent` / `staff.player.suspend_long`.
  BAN: 'staff.player.ban_permanent',
  SUSPEND: 'staff.player.suspend_long',
};

/** The two-person "context" a BAN/SUSPEND proposal opens and its execution later consumes — the SAME
 *  four values, both times (`TwoPersonApprovalService.request`/`consume`'s own signature). */
const TARGET_ENTITY_TYPE_PLAYER = 'player';

export interface EnforcementActionInput {
  readonly targetPlayerId: string;
  readonly actionEnum: EnforcementActionTypeEnumTs;
  readonly sourceSignalId: string | null;
  readonly ticketRef: string | null;
}

export type ProposeResult =
  | { readonly kind: 'executed'; readonly enforcementAction: EnforcementActionRow }
  | { readonly kind: 'pending_approval'; readonly approvalId: string; readonly permissionKey: string };

@Injectable()
export class EnforcementActionService {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly repo: EnforcementActionRepository,
    private readonly twoPerson: TwoPersonApprovalService,
  ) {}

  /**
   * Staff A's `POST .../enforcement/propose`. `actionEnum` is validated to `WARN | SUSPEND | BAN`
   * BEFORE this method is called (the controller's `enumField` allowlist — SHADOW_BAN never reaches
   * here). `before_state`/`after_state` are NOT accepted from the caller (a deliberate narrowing —
   * see `implementation-notes.md` §Deviations D-C3-state) — this service records the one fact it
   * actually knows: which `action_enum` was proposed/executed.
   */
  async propose(initiatorAccountId: string, input: EnforcementActionInput): Promise<ProposeResult> {
    if (input.actionEnum === 'WARN') {
      const enforcementAction = await this.repo.insert({
        targetPlayerId: input.targetPlayerId,
        actionEnum: 'WARN',
        sourceSignalId: input.sourceSignalId,
        staffId: initiatorAccountId,
        beforeState: {},
        afterState: { action_enum: 'WARN' },
        twoPersonApprovalId: null,
        ticketRef: input.ticketRef,
      });
      return { kind: 'executed', enforcementAction };
    }

    // BAN | SUSPEND (the controller's enumField already excludes every other member, incl. SHADOW_BAN).
    const permissionKey = TWO_PERSON_PERMISSION_KEY[input.actionEnum as 'BAN' | 'SUSPEND'];
    const approval = await this.twoPerson.request(
      initiatorAccountId,
      permissionKey,
      TARGET_ENTITY_TYPE_PLAYER,
      input.targetPlayerId,
    );
    return { kind: 'pending_approval', approvalId: approval.approvalId, permissionKey };
  }

  /**
   * Staff A's `POST .../enforcement/execute` — ONLY reachable for BAN/SUSPEND (WARN never has a
   * pending approval to consume; the controller does not even offer WARN on this route's `action_enum`
   * domain — see `enforcement.controller.ts`). ONE transaction: `consume()` THEN the `enforcement_action`
   * INSERT, both on the SAME `tx` (§12 C3 — never two separate writes a crash between them could
   * split). `consume()` throws `RESOURCE_NOT_FOUND`/`RESOURCE_STATE_CONFLICT` on failure
   * (`two-person-approval.service.ts#consume`) — thrown INSIDE the transaction callback, so Drizzle
   * rolls back before the error propagates: no `enforcement_action` row is ever left behind by a failed
   * consume.
   */
  async execute(initiatorAccountId: string, input: EnforcementActionInput): Promise<EnforcementActionRow> {
    const permissionKey = TWO_PERSON_PERMISSION_KEY[input.actionEnum as 'BAN' | 'SUSPEND'];
    return this.db.transaction(async (tx) => {
      const consumed = await this.twoPerson.consume(
        initiatorAccountId,
        permissionKey,
        TARGET_ENTITY_TYPE_PLAYER,
        input.targetPlayerId,
        tx,
      );
      return this.repo.insert(
        {
          targetPlayerId: input.targetPlayerId,
          actionEnum: input.actionEnum,
          sourceSignalId: input.sourceSignalId,
          staffId: initiatorAccountId,
          beforeState: {},
          afterState: { action_enum: input.actionEnum },
          twoPersonApprovalId: consumed.approvalId,
          ticketRef: input.ticketRef,
        },
        tx,
      );
    });
  }

  async listByPlayer(targetPlayerId: string): Promise<EnforcementActionRow[]> {
    return this.repo.listByPlayer(targetPlayerId);
  }
}
