// IMPLEMENTS: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md §C6 (deferral I6 —
//             +10 stress, refused ≥95)
//             Design: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §9.2
//             (`POST /v1/compression/defer` — UNIQUE per cycle, refused if stress >= force-engagement
//             threshold) + §15 (endpoint).
//             Pattern: `ReplacementOptionService.resolveAndClosePick` (guard-first-throw-ApiError shape).
//             — P3-E C6 — 2026-07-17
//
// `CompressionDeferService` — maps `CompressionWeekRepository.applyDeferral`'s 3-reason refusal into the
// right `ApiError` (404 for "no open cycle at all", 409 for the 2 in-cycle refusals). R2.2: the response
// is `{ deferred: true }` ONLY — no raw `org_stress`/bucket (the bucket-safe projection wall is C8's own
// dedicated chunk, design §16 — this verb does not pre-empt that work).

import { Injectable } from '@nestjs/common';

import { ApiError } from '../../protocol/api-error';
import { coreLoopsTunables } from '../core-loops-tunables';
import { CompressionWeekRepository } from './compression-week.repository';
import { CompressionBoardService } from './compression-board.service';

@Injectable()
export class CompressionDeferService {
  constructor(
    private readonly repo: CompressionWeekRepository,
    // ★ P3-E C7 fold (design §9.2c, additive) — same "checkFireAtMaxSeverity after a stress-changing
    // write" orchestration `CompressionStressSubscriber` adds (SAME-module dependency, zero cycle): the
    // deferral's own +10 stress bump can ALSO push `org_stress` to the max-severity threshold.
    private readonly board: CompressionBoardService,
  ) {}

  async defer(playerId: string): Promise<{ deferred: true }> {
    const result = await this.repo.applyDeferral(
      playerId,
      coreLoopsTunables.compressionDeferralPenaltyStress,
      coreLoopsTunables.compressionForceEngagementThreshold,
    );

    if (result.deferred) {
      // Player-triggered HTTP action, no scheduler ctx — `gameMinute=0` (the `SessionOpenedEvent`
      // convention, REPLICATED here).
      await this.board.checkFireAtMaxSeverity(playerId, 0);
    }

    if (!result.deferred) {
      if (result.reason === 'NO_OPEN_CYCLE') {
        throw new ApiError('RESOURCE_NOT_FOUND', { message: `no open compression cycle for player ${playerId}.` });
      }
      if (result.reason === 'FORCED_ENGAGEMENT') {
        throw new ApiError('FORCED_ENGAGEMENT', {
          message: `player ${playerId} stress is at/above the force-engagement threshold — deferral is refused.`,
        });
      }
      throw new ApiError('DEFERRAL_EXHAUSTED', {
        message: `player ${playerId} already used this cycle's single deferral.`,
      });
    }

    return { deferred: true };
  }
}
