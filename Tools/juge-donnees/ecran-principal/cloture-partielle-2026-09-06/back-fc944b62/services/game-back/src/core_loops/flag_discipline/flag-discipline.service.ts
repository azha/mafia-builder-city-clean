// IMPLEMENTS: docs/superpowers/plans/2026-07-11-p3-B-flag-discipline-plan.md §C2 (token & flag state
//             machine — atomic conditional writes)
//             Design: docs/superpowers/specs/2026-07-11-p3-B-flag-discipline-design.md §4 (token & flag
//             state machine) + §1 D2/D3/D10.
//             Decisions: §1.10 D10 (verdicts tactical, v1 does not gate the underlying op) + §6 RULING
//             #2 (net-token-delta |−2|) / #3 (TIMED_OUT — C4's own concern, this file only defines the
//             `resolveFlagTransition` union member so C4 never needs a signature change) / #6
//             (`decisions_made` increments on verdicts, single site via `SessionService`, sessionless
//             no-op — the P3-A D2/D9 continuity).
//             Pattern (insert-failure compensation): `structural-decision-governor.repository.ts`'s
//             header — a deduct-win followed by a mutation failure must credit the token back, never
//             leak a permanently-burned slot. Pattern (unique-violation detection):
//             `standing-order.service.ts`'s `isUniqueViolation` (SQLSTATE 23505 on `.code`/`.cause.code`).
//             — P3-B C2 — 2026-07-11
//
// `FlagDisciplineService` — the token & flag state machine (D2/D3/D10):
//   - `flagItem(routineItemId)` — the flag-creation path (D3/D4): atomic token deduct -> INSERT
//     `flagged_items` (PENDING) + flip the source `routine_items.status = 'flagged'` in ONE transaction ->
//     `FlagRaisedEvent`. A deduct-win followed by an insert-failure (the partial-UNIQUE
//     one-pending-flag-per-item race) compensates the token back (governor precedent). Exposed to E2E via
//     the `force-flag` test seam (`CoreLoopsTestController`) — this chunk's ONLY caller; the C4 NIGHTLY
//     tick becomes the 2nd caller later (same method, real `gameMinute`).
//   - `validateFlag`/`dismissFlag(playerId, flagId)` — player-owned verdicts (D10): ownership pre-check
//     (404) -> the `resolveFlagTransition` atomic arbiter (409 on transition-lose) -> token movement per
//     sub-decision #2 (validate: +1 returned; dismiss: net-token-delta, value-sensitive) ->
//     `decisions_made + 1` on the active session (sessionless no-op, sub-decision #6) -> `FlagVerdictEvent`.
//
// P3-B C6 ADDS the player review surface (design §8, D11/D12):
//   - `listReviewCards(playerId)` — `GET /v1/flag-review`: every PENDING flag, R2.2-projected
//     (`FlagCardProjection` — descriptor/flag_reason forwarded verbatim, `trust_budget_bucket` via
//     `FlagConvergenceService`, NO deviation score/token count/countdown) + the unflagged-pending
//     routine-item summary.
//   - `batchConfirm(playerId)` — `POST /v1/flag-review/batch-confirm`: set-based, idempotent (D3),
//     `decisions_made + 1` ONCE per NON-EMPTY batch (ruling #6), NO reward (D13).

import { Injectable } from '@nestjs/common';

import { ApiError } from '../../protocol/api-error';
import { CityEventBus } from '../../citysim/events/city-event-bus';
import { SessionService } from '../../session/session.service';
import { FlagDisciplineRepository } from './flag-discipline.repository';
import { flagDisciplineTunables } from './flag-discipline-tunables';
import { FlagConvergenceService } from './flag-convergence.service';
import type { TrustBudgetBucket } from './convergence';
import type { I18nRef } from '../../common/i18n-ref';

/** True iff a thrown DB error is a Postgres unique_violation (SQLSTATE 23505) — the
 *  `standing-order.service.ts isUniqueViolation` precedent, verbatim. Used here to detect the partial-
 *  UNIQUE `flagged_items_pending_unique_idx` race loss (2 concurrent `flagItem` calls on the SAME
 *  `routine_item_id`) so the token can be compensated instead of silently leaking a burned slot. */
function isUniqueViolation(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } } | null;
  return err?.code === '23505' || err?.cause?.code === '23505';
}

/** `flagItem`'s result — a closed, qualitative outcome (R2.2: this is an internal/test-seam surface today;
 *  no raw token counts are ever included). `flagged: false` results emit NO `FlagRaisedEvent` (D3 — the
 *  token was either never available, or the insert lost the race and was compensated). */
export type FlagItemResult =
  | { readonly flagged: true; readonly flagId: string }
  | { readonly flagged: false; readonly reason: 'not_found' | 'no_lieutenant' | 'no_token' | 'already_flagged' };

/** `validateFlag`/`dismissFlag`'s response shape (R2.2 — bands/booleans only, no raw internals: the
 *  player learns their token was returned or not, never the resulting count). */
export interface FlagVerdictResult {
  readonly resolved: true;
  readonly verdict: 'validated' | 'dismissed';
  readonly token_returned: boolean;
}

/** `GET /v1/flag-review`'s per-card R2.2 projection (design §8 `FlagCardProjection`): descriptor/
 *  flag_reason forward the ALREADY-{key,params}-shaped jsonb columns verbatim — NO deviation score, NO
 *  raw token count, NO countdown (D13). `trust_budget_bucket` is the SAME band the lieutenant projection
 *  surfaces (`FlagConvergenceService.trustBudgetBucketForLieutenant`, D12). */
export interface FlagCardProjection {
  readonly flag_id: string;
  readonly lieutenant: { readonly id: string; readonly name: string };
  readonly descriptor: unknown;
  readonly flag_reason: unknown;
  readonly flagged_game_day: number;
  readonly trust_budget_bucket: TrustBudgetBucket;
}

/** `GET /v1/flag-review`'s full response (design §8): the PENDING flag cards + the unflagged-pending
 *  routine-item summary (`routine_pending_count` — the batch-confirm candidate set; `batch_confirm_
 *  available` = `routine_pending_count > 0`, a derived convenience the client would otherwise recompute
 *  itself). */
export interface FlagReviewResponse {
  readonly cards: FlagCardProjection[];
  readonly routine_pending_count: number;
  readonly batch_confirm_available: boolean;
}

/** `POST /v1/flag-review/batch-confirm`'s response — the count ACTUALLY confirmed by THIS call (0 on an
 *  idempotent 2nd call against the same state, D13 — batch confirm yields nothing but clean state, never
 *  a reward). */
export interface BatchConfirmResult {
  readonly batch_confirmed_count: number;
}

@Injectable()
export class FlagDisciplineService {
  constructor(
    private readonly repo: FlagDisciplineRepository,
    private readonly bus: CityEventBus,
    // D10/sub-decision #6 — REUSE the P3-A single-increment-site convention: `SessionService.
    // recordAdvisoryDecision` is the SAME generic `decisions_made`-only seam `SessionService#recordAdvisory
    // Decision` already exposes for the HL-card advisory commit/skip path (session.service.ts:184) —
    // sessionless no-op via its own `WHERE ended_at IS NULL` guard (D9 continuity). No new counter method
    // needed; this is REUSE, not a new seam.
    private readonly sessions: SessionService,
    // P3-B C6 — the `trust_budget_bucket` per flag card (design §8 `FlagCardProjection`); the SAME
    // service (SAME re-provided-elsewhere instance shape) `LieutenantProjectionService` consumes for its
    // own +trust_budget_bucket band (D12) — one formula, two callers.
    private readonly convergence: FlagConvergenceService,
  ) {}

  /**
   * The flag-creation path (design §4, D3/D4/D9-adjacent — the compensation precedent, not the spine
   * itself). `gameMinute` defaults to 0 (no scheduler ctx — the C2 `force-flag` test-seam / the
   * `SessionOpenedEvent` convention); the C4 NIGHTLY tick will pass its own `ctx.gameMinute` when it
   * starts calling this same method for real generation-time flags.
   *
   * Outcomes (`FlagItemResult`): `not_found` (no such routine item); `no_lieutenant` (D6 honest coverage
   * gap — the item generated with `lieutenant_id = NULL`, no role-holder, no flag path possible);
   * `no_token` (the atomic deduct found `credibility_tokens < 1` — the caller falls through to whatever
   * fallback applies, C4's exhaustion spine-insert for the tick path); `already_flagged` (the partial-
   * UNIQUE one-pending-flag-per-item index rejected this INSERT — another concurrent `flagItem` call
   * already holds the PENDING slot for this routine item; the token this call deducted is compensated
   * back, governor precedent); `flagged: true` (the normal path — deduct won, insert won, routine item
   * flipped to 'flagged', `FlagRaisedEvent` emitted).
   */
  async flagItem(
    routineItemId: string,
    gameMinute = 0,
    flagReason?: I18nRef,
  ): Promise<FlagItemResult> {
    const item = await this.repo.getRoutineItem(routineItemId);
    if (!item) return { flagged: false, reason: 'not_found' };
    if (!item.lieutenant_id) return { flagged: false, reason: 'no_lieutenant' };

    const maxTokens = flagDisciplineTunables.flagCredibilityTokensMaxPerLieutenant;
    await this.repo.ensureState(item.lieutenant_id, item.player_id, maxTokens);

    const deducted = await this.repo.deductTokenAtomic(item.lieutenant_id);
    if (!deducted) return { flagged: false, reason: 'no_token' };

    const tick = await this.repo.getCurrentTick(item.player_id);
    try {
      const flagged = await this.repo.insertFlaggedItemAndMarkRoutineFlagged({
        playerId: item.player_id,
        lieutenantId: item.lieutenant_id,
        routineItemId,
        routineItemDescriptor: item.descriptor,
        // P3-B C3: the REAL per-generator flag reason (each generator's own i18n key + params,
        // `generators/*.generator.ts`) is supplied by the caller (`RoutineItemGenerationService`) when
        // flagging a freshly-generated candidate. When omitted (the `force-flag` test seam's OWN direct
        // calls, which target a routine item seeded WITHOUT going through a generator) this falls back to
        // the SAME honest, generic C2 placeholder reason — byte-identical to pre-C3 behavior for every
        // existing caller.
        flagReason: flagReason ?? {
          key: 'core_loops.flag_discipline.reason.deviation_detected',
          params: { generator: item.generator },
        },
        deviationScoreInternal: item.deviation_score_internal,
        emittedTick: tick,
        gameDay: item.game_day,
      });
      this.bus.emitFlagRaised({
        type: 'flag_raised',
        playerId: item.player_id,
        lieutenantId: item.lieutenant_id,
        flagId: flagged.flag_id,
        routineItemId,
        gameMinute,
      });
      return { flagged: true, flagId: flagged.flag_id };
    } catch (err) {
      if (isUniqueViolation(err)) {
        // The partial-UNIQUE `flagged_items_pending_unique_idx` lost the race (another concurrent
        // flagItem already holds the PENDING slot for this routine item) — the whole insert transaction
        // rolled back (routine_items.status was NEVER flipped), so the ONLY trace of this attempt is the
        // token this call already deducted. Compensate it back (governor insert-failure-compensates
        // precedent) so the lieutenant's token count reflects reality: no flag was created BY THIS CALL.
        await this.repo.creditToken(item.lieutenant_id, 1, maxTokens);
        return { flagged: false, reason: 'already_flagged' };
      }
      throw err;
    }
  }

  /**
   * `POST /v1/flag-review/:flagId/validate` (player-owned) — the token-return verdict (D10). 404 if the
   * flag doesn't belong to this player; 409 (`RESOURCE_STATE_CONFLICT`) if it is no longer PENDING (the
   * `resolveFlagTransition` arbiter lost the race — concurrent double-validate: exactly one 200 + one
   * 409, exactly ONE credit, the C2 concurrency gate). On transition-win: `+1` token (`LEAST`-clamped to
   * the max getter — value-sensitive), `decisions_made + 1` on the active session (sessionless no-op),
   * `FlagVerdictEvent`.
   */
  async validateFlag(playerId: string, flagId: string): Promise<FlagVerdictResult> {
    const owned = await this.repo.getOwnedFlag(playerId, flagId);
    if (!owned) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `no such flag ${flagId} for this player.` });
    }

    const tick = await this.repo.getCurrentTick(playerId);
    const updated = await this.repo.resolveFlagTransition(flagId, 'validated', true, tick);
    if (!updated) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', { message: 'flag is no longer pending (already resolved).' });
    }

    const maxTokens = flagDisciplineTunables.flagCredibilityTokensMaxPerLieutenant;
    await this.repo.creditToken(updated.lieutenant_id, 1, maxTokens);
    await this.sessions.recordAdvisoryDecision(playerId);
    this.bus.emitFlagVerdict({
      type: 'flag_verdict',
      playerId,
      lieutenantId: updated.lieutenant_id,
      flagId,
      verdict: 'validated',
      gameMinute: 0,
    });
    return { resolved: true, verdict: 'validated', token_returned: true };
  }

  /**
   * `POST /v1/flag-review/:flagId/dismiss` (player-owned) — the net-token-delta penalty verdict
   * (sub-decision #2 RATIFIED default). 404/409 identical contract to `validateFlag` (the SAME arbiter,
   * SAME concurrency guarantee — validate-vs-dismiss race: exactly one winner, the C2 concurrency gate).
   * On transition-win: the flag's OWN token (already spent at `flagItem` time) stays lost; `|flag_
   * dismissal_trust_penalty_modifier| - 1` ADDITIONAL tokens move (getter-value-sensitive: default -2 ->
   * net -2 vs pre-flag; flipped to -1 -> net -1; the degenerate modifier=0 edge nets token-neutral,
   * decisions §4 divergence #5 — `applyDismissalPenalty`'s own header explains the signed-delta math).
   * `decisions_made + 1` on the active session (sessionless no-op), `FlagVerdictEvent`.
   */
  async dismissFlag(playerId: string, flagId: string): Promise<FlagVerdictResult> {
    const owned = await this.repo.getOwnedFlag(playerId, flagId);
    if (!owned) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `no such flag ${flagId} for this player.` });
    }

    const tick = await this.repo.getCurrentTick(playerId);
    const updated = await this.repo.resolveFlagTransition(flagId, 'dismissed', false, tick);
    if (!updated) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', { message: 'flag is no longer pending (already resolved).' });
    }

    const modifier = flagDisciplineTunables.flagDismissalTrustPenaltyModifier; // negative, default -2
    const additionalDelta = Math.abs(modifier) - 1;
    const maxTokens = flagDisciplineTunables.flagCredibilityTokensMaxPerLieutenant;
    await this.repo.applyDismissalPenalty(updated.lieutenant_id, additionalDelta, maxTokens);

    await this.sessions.recordAdvisoryDecision(playerId);
    this.bus.emitFlagVerdict({
      type: 'flag_verdict',
      playerId,
      lieutenantId: updated.lieutenant_id,
      flagId,
      verdict: 'dismissed',
      gameMinute: 0,
    });
    return { resolved: true, verdict: 'dismissed', token_returned: false };
  }

  /**
   * `GET /v1/flag-review` (design §8, D11/D12) — the daily review surface: every PENDING flag card
   * (R2.2-projected, `FlagCardProjection`) + the unflagged-pending routine-item summary. Cards are
   * oldest-flagged-first (`FlagDisciplineRepository.listPendingFlagsForPlayer`'s own ordering); each
   * card's `trust_budget_bucket` is resolved per-lieutenant via the SAME `FlagConvergenceService` the
   * lieutenant projection uses (one formula, D12). A pure read — no state change.
   */
  async listReviewCards(playerId: string): Promise<FlagReviewResponse> {
    const [pendingFlags, routinePendingCount] = await Promise.all([
      this.repo.listPendingFlagsForPlayer(playerId),
      this.repo.countPendingRoutineItemsForPlayer(playerId),
    ]);

    const cards: FlagCardProjection[] = await Promise.all(
      pendingFlags.map(async (row) => {
        const { bucket } = await this.convergence.trustBudgetBucketForLieutenant(row.lieutenant_id);
        return {
          flag_id: row.flag_id,
          lieutenant: { id: row.lieutenant_id, name: row.lieutenant_name },
          descriptor: row.descriptor,
          flag_reason: row.flag_reason,
          flagged_game_day: row.game_day,
          trust_budget_bucket: bucket,
        };
      }),
    );

    return {
      cards,
      routine_pending_count: routinePendingCount,
      batch_confirm_available: routinePendingCount > 0,
    };
  }

  /**
   * `POST /v1/flag-review/batch-confirm` (design §4, D13 — NO reward, ever). Set-based, idempotent by
   * construction (D3): confirms every UNFLAGGED pending routine item in ONE statement; a 2nd call against
   * the SAME state confirms zero (nothing left at `status='pending'`), and — ruling #6, the plan's exact
   * wording — `decisions_made` increments EXACTLY ONCE per NON-EMPTY batch: an EMPTY batch (confirmedCount
   * === 0, including every idempotent re-call) is not a decision and does NOT touch the counter.
   */
  async batchConfirm(playerId: string): Promise<BatchConfirmResult> {
    const confirmedCount = await this.repo.batchConfirmPendingRoutineItems(playerId);
    if (confirmedCount > 0) {
      await this.sessions.recordAdvisoryDecision(playerId);
    }
    return { batch_confirmed_count: confirmedCount };
  }
}
