// IMPLEMENTS: docs/superpowers/specs/2026-09-02-w12a-two-person-perimetre.md §12 C3-bis.
//             -- W1.2-a C3-bis — 2026-09-02 --
//
// `AppealCaseService` — thin orchestration over `AppealCaseRepository`, translating each repository
// outcome's `reason` into the ONE `ApiError` code that fits (same shape `TwoPersonApprovalService`
// uses over `TwoPersonApprovalRepository`, this lot's C2 precedent).

import { Injectable } from '@nestjs/common';

import { ApiError } from '../../protocol/api-error';
import { AppealCaseRepository, type AppealStatusSelfProjection } from './appeal.repository';

@Injectable()
export class AppealCaseService {
  constructor(private readonly repo: AppealCaseRepository) {}

  /**
   * `POST /v1/me/appeals`. `not_found` covers BOTH "no such enforcement_action" and "exists, but not
   * this player's" (IDOR — §12 C3-bis's ⛔, "sinon 404, jamais 403"). `duplicate` is the table's own
   * `UNIQUE(enforcement_action_id)` (migration 0011) — "un seul appel par sanction" — surfaced as a
   * clean 409, never a raw constraint violation.
   */
  async submit(playerId: string, enforcementActionId: string, reasonText: string): Promise<AppealStatusSelfProjection> {
    const outcome = await this.repo.insertAppeal(playerId, enforcementActionId, reasonText);
    if (outcome.reason === 'ok') return outcome.row;
    if (outcome.reason === 'not_found') {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: 'No enforcement action with this id for this player.',
      });
    }
    throw new ApiError('RESOURCE_STATE_CONFLICT', {
      message: 'An appeal already exists for this enforcement action.',
    });
  }

  async listSelf(playerId: string): Promise<AppealStatusSelfProjection[]> {
    return this.repo.listSelf(playerId);
  }

  /** `GET /v1/me/appeals/:id`. 404 (never 403) when the appeal isn't this player's own — the
   *  repository's `player_id`-scoped `WHERE` already makes the two cases indistinguishable. */
  async getSelf(playerId: string, appealId: string): Promise<AppealStatusSelfProjection> {
    const row = await this.repo.getSelf(playerId, appealId);
    if (!row) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'No appeal with this id for this player.' });
    }
    return row;
  }
}
