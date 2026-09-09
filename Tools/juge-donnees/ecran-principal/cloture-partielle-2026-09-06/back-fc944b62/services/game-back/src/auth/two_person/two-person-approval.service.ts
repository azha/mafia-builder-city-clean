// IMPLEMENTS: docs/tech/17_auth_and_accounts/authorization_rbac.md §Two-person rule (:134-159) +
//             R-RBAC-3 (:245)
//             Périmètre: docs/superpowers/specs/2026-09-02-w12a-two-person-perimetre.md §4 pt.2
//             — W1.2-a C2 — 2026-09-02 --
//
// `TwoPersonApprovalService` — `request` / `decide` / `consume` / `listPending`. Thin orchestration
// over `TwoPersonApprovalRepository`: resolves the 2 `T.auth.two_person_*` tunables (R2.3 — the
// SERVICE resolves tunables, the REPOSITORY takes plain numbers, `friction-budget.repository.ts`'s
// own header convention) and translates each repository outcome's `reason` into the ONE `ApiError`
// code that fits (never a raw base-constraint failure, property #5 of this chunk's brief — the
// repository's guarded writes make every constraint structurally unreachable, so there is nothing to
// catch here either).
//
// Identity: `initiatorAccountId`/`deciderAccountId` are ALWAYS supplied by the CALLER (the controller,
// from `req.account!.account_id` — the verified JWT, never the body, property #1). This service never
// reads an account id out of a request body itself.

import { Injectable } from '@nestjs/common';

import { ApiError } from '../../protocol/api-error';
import { authTunables } from '../auth-tunables';
import {
  TwoPersonApprovalRepository,
  type TwoPersonApprovalRowView,
  type TwoPersonTx,
} from './two-person-approval.repository';

@Injectable()
export class TwoPersonApprovalService {
  constructor(private readonly repo: TwoPersonApprovalRepository) {}

  /** Staff A's `POST .../request`. Throws `RESOURCE_STATE_CONFLICT` (409) on the 2 outcomes a
   *  well-formed request can still fail on: the initiator's pending cap, or a duplicate pending
   *  request for the SAME (initiator, permission_key, target) context. */
  async request(
    initiatorAccountId: string,
    permissionKey: string,
    targetEntityType: string,
    targetEntityId: string | null,
    executor?: TwoPersonTx,
  ): Promise<TwoPersonApprovalRowView> {
    const maxPending = authTunables.twoPerson.maxPendingPerInitiator;
    const outcome = await this.repo.insertRequest(
      { initiatorAccountId, permissionKey, targetEntityType, targetEntityId },
      authTunables.twoPerson.approvalTtlMin,
      maxPending,
      executor,
    );
    if (outcome.reason === 'ok') return outcome.row;
    if (outcome.reason === 'cap') {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `initiator ${initiatorAccountId} already has ${maxPending} pending two-person approvals (T.auth.two_person_max_pending_per_initiator).`,
      });
    }
    throw new ApiError('RESOURCE_STATE_CONFLICT', {
      message: 'a pending two-person approval already exists for this (initiator, permission_key, target) context.',
    });
  }

  /**
   * Staff B's `POST .../:id/decide`. `approve: true` → APPROVED, `approve: false` → DECLINED.
   * - not_found → `RESOURCE_NOT_FOUND` (404).
   * - self (the decider IS the initiator, R-RBAC-3) → `AUTHZ_PERMISSION_DENIED` (403) — the DB CHECK
   *   `two_person_approval_distinct_ck` backstops this same property, but the repository's guard
   *   already makes it structurally unreachable from here (see repository header).
   * - expired / terminal (already decided) → `RESOURCE_STATE_CONFLICT` (409).
   */
  async decide(
    approvalId: string,
    deciderAccountId: string,
    approve: boolean,
    executor?: TwoPersonTx,
  ): Promise<TwoPersonApprovalRowView> {
    const outcome = await this.repo.decideAtomic(approvalId, deciderAccountId, approve, executor);
    if (outcome.reason === 'ok') return outcome.row;
    if (outcome.reason === 'not_found') {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `no two_person_approval with id ${approvalId}.` });
    }
    if (outcome.reason === 'self') {
      throw new ApiError('AUTHZ_PERMISSION_DENIED', {
        message: 'the initiator of a two-person approval cannot also be its approver (R-RBAC-3).',
      });
    }
    if (outcome.reason === 'expired') {
      throw new ApiError('RESOURCE_STATE_CONFLICT', { message: `approval ${approvalId} has expired.` });
    }
    throw new ApiError('RESOURCE_STATE_CONFLICT', { message: `approval ${approvalId} is no longer awaiting a decision.` });
  }

  /**
   * Usage-once consumption (property #4). NOT wired to an HTTP route in this lot (no consume endpoint
   * in the canon's 3-route contract) — the forward-looking call a FUTURE gated-action handler
   * (W1.2-b..e) makes once it must spend its own approved two-person approval. `executor` lets that
   * future caller thread its OWN ambient transaction (consume-then-execute atomically together) —
   * nothing in THIS lot passes one.
   */
  async consume(
    initiatorAccountId: string,
    permissionKey: string,
    targetEntityType: string,
    targetEntityId: string | null,
    executor?: TwoPersonTx,
  ): Promise<{ approvalId: string }> {
    const outcome = await this.repo.consumeAtomic(initiatorAccountId, permissionKey, targetEntityType, targetEntityId, executor);
    if (outcome.reason === 'ok') return { approvalId: outcome.approvalId };
    if (outcome.reason === 'not_found') {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: 'no two_person_approval for this (initiator, permission_key, target) context.',
      });
    }
    throw new ApiError('RESOURCE_STATE_CONFLICT', {
      message: 'no valid (APPROVED, unexpired, unconsumed) two_person_approval for this context.',
    });
  }

  /** Staff B's `GET .../pending`. */
  async listPending(executor?: TwoPersonTx): Promise<TwoPersonApprovalRowView[]> {
    return this.repo.listPending(executor);
  }
}
