// IMPLEMENTS: docs/superpowers/plans/2026-07-10-p3-A-session-spine-plan.md §C5 (the ONE governor seam
//             + 6-site retrofit) + C5-fix (⊥ IMPORTANT-1 remediation — atomic reservation)
//             Design: docs/superpowers/specs/2026-07-10-p3-A-session-spine-design.md §6 (Loop 10 —
//             classifier + governor) + ★ C5-fix addendum (D8, atomic reservation semantics).
//             Decisions: §1.8 D8 (★ C5-fix, ⊥ IMPORTANT-1 — ONE governor seam, cap-by-getter,
//             ATOMIC reserve-before-mutate) + §1.9 D9 (session-scoped enforcement — the
//             zero-regression ruling) + §1.12 D12 (anti-pattern wall — the 409 message is a STATE
//             description + `retry_scope`, never a countdown).
//             Seam: `core-loops-tunables.ts`'s `structuralCapForPlayer(playerId)` (C1, the D8 getter) +
//             `oneDecisionEnforceWithoutSession` (D9 flag, default false `[PROV-Y26Q2]`).
//             — P3-A C5 — 2026-07-10 / C5-fix (⊥ IMPORTANT-1, reviewer-empirical TOCTOU) — 2026-07-10
//
// ★ C5-fix (⊥ IMPORTANT-1 — reviewer-reproduced): the ORIGINAL C5 landing read-checked the counter
// (`getStructuralDecisionsThisSession`) THEN incremented it LATER, inside `recordCommit`, AFTER
// `mutateFn` had already run. Two concurrent commits in ONE session at cap=1 could BOTH read
// `used=0 < cap=1` before either write landed → BOTH succeed, counter ends at 2, 2 audit rows — the
// canon HARD per-session rate-limit was silently bypassable under concurrency. FIXED: the read-check
// and the increment are now ONE atomic conditional UPDATE (`reserveStructuralSlot`, the repository) —
// no separate read step, no window for a second racer to observe a stale pre-increment value.
//
// `StructuralDecisionGovernorService.commit(playerId, type, ctx, mutateFn)` — the ONE seam EVERY
// structural mutation calls (D8):
//   1. RESERVE (only when the enforcement gate is ON — D9): an ACTIVE session exists, OR the
//      `enforce_without_session` flag is true (the forward-looking global-strict switch, unexercised
//      this chunk — default false). Gate ON → `reserveStructuralSlot(playerId, capGetter(playerId))`,
//      ONE atomic `UPDATE … WHERE structural_decisions_this_session < cap RETURNING …` — `false` (zero
//      rows matched) → 409 STRUCTURAL_CAP_EXHAUSTED (D12 — state + `retry_scope`, no countdown) WITHOUT
//      ever running `mutateFn`. Gate OFF (sessionless, D9) → NO reservation at all (pass-through).
//   2. MUTATE — run `mutateFn()` UNCHANGED (the site's own transaction/validation/response). A thrown
//      error propagates AFTER a COMPENSATING decrement (`compensateStructuralSlot`) if THIS call reserved
//      a slot — the reservation must not leak a permanently-burned slot on a failed mutation (the C5
//      atomicity proof, scenario C: net counter change = 0, zero audit rows, for an induced failure).
//   3. RECORD — the post-mutation same-tx write (per-session analytics counters, session-bound only) +
//      the `structural_decisions_audit` row (`StructuralDecisionGovernorRepository.recordCommit` — does
//      NOT re-increment `structural_decisions_this_session`, already claimed at step 1) +
//      `StructuralDecisionCommittedEvent` on the bus.
//
// `ctx.after` may be a static compact ref OR a function of the mutation's result (`(result) => ref`) —
// the SAME "site declares its own 2-5 field ref" contract (design §6) either way; the governor adds
// `_session` to whichever ref comes out (design §3 — no column add, `after_state._session` IS the
// session-ref, null for a sessionless commit).

import { Inject, Injectable, forwardRef } from '@nestjs/common';

import { ApiError } from '../../protocol/api-error';
import { CityEventBus } from '../../citysim/events/city-event-bus';
import { coreLoopsTunables } from '../../core_loops/core-loops-tunables';
import { SessionService } from '../../session/session.service';
import { ProgressionRepository } from '../progression.repository';
import { catalogueEntryFor, type StructuralDecisionType } from './structural-decision-catalogue';
import { StructuralDecisionGovernorRepository } from './structural-decision-governor.repository';

/** A retrofit site's before/after compact refs (design §6 — "2-5 field ref", never a full snapshot).
 *  `after` may be static OR derived from the mutation's own result `T` (e.g. a freshly-minted id). */
export interface StructuralDecisionCtx<T> {
  readonly before: Record<string, unknown>;
  readonly after: Record<string, unknown> | ((result: T) => Record<string, unknown>);
  /** P3-F C8 (design D7) — OPTIONAL, additive: threaded verbatim to `StructuralDecisionCommitRecord.
   *  triggeredRecallDebt` (that interface's own header carries the full contract). Omitted by every
   *  pre-C8 call site (defaults false at the repository) — zero-regression, see that file. */
  readonly triggeredRecallDebt?: boolean;
}

@Injectable()
export class StructuralDecisionGovernorService {
  constructor(
    // P3-A C6 fold: `SessionService` now sits in a genuine 2-way module cycle (`Loop10Module` ↔
    // `SessionModule`, `session.module.ts`'s header comment carries the full account) — `forwardRef`
    // is required at BOTH the module-import level (already done, `loop10.module.ts`) AND here, at the
    // actual injection site (the NestJS convention for a real circular provider dependency, mirrors
    // `conflict-orchestrator.service.ts`'s `@Inject(forwardRef(() => CredibilityAccumulatorService))`).
    @Inject(forwardRef(() => SessionService)) private readonly sessions: SessionService,
    private readonly progressionRepo: ProgressionRepository,
    private readonly auditRepo: StructuralDecisionGovernorRepository,
    private readonly bus: CityEventBus,
  ) {}

  async commit<T>(
    playerId: string,
    type: StructuralDecisionType,
    ctx: StructuralDecisionCtx<T>,
    mutateFn: () => Promise<T>,
  ): Promise<T> {
    const entry = catalogueEntryFor(type);
    const activeSession = await this.sessions.getActiveSession(playerId);
    const enforcementGate = activeSession !== null || coreLoopsTunables.oneDecisionEnforceWithoutSession;

    // ★ C5-fix (⊥ IMPORTANT-1) — step 1, ATOMIC reserve-or-refuse. `reserved` tracks whether THIS call
    // actually claimed a slot (so step 2's failure path knows whether a compensation is owed).
    let reserved = false;
    if (enforcementGate) {
      // Defensive `ensureRow` (idempotent upsert, REUSE Phase-17): guarantees the reservation's UPDATE
      // always targets a real row. Normally a no-op — a session-bound commit's progression row already
      // exists (SessionRepository.openFresh calls ensureRow before any session is ever opened) — this
      // only matters for the untested `enforce_without_session=true` + sessionless combination.
      await this.progressionRepo.ensureRow(playerId);
      const cap = coreLoopsTunables.structuralCapForPlayer(playerId);
      const claimed = await this.auditRepo.reserveStructuralSlot(playerId, cap);
      if (!claimed) {
        throw new ApiError('STRUCTURAL_CAP_EXHAUSTED', {
          message: 'Structural decisions exhausted for this session. Return in next session.',
          payloadVars: { retry_scope: 'next_session' },
        });
      }
      reserved = true;
    }

    // Step 2 — the site's OWN mutation, untouched. A thrown error triggers the compensating decrement
    // (if reserved) THEN re-propagates AS-IS — the governor never swallows the site's own error.
    let result: T;
    try {
      result = await mutateFn();
    } catch (err) {
      if (reserved) {
        await this.auditRepo.compensateStructuralSlot(playerId);
      }
      throw err;
    }

    const sessionId = activeSession?.gameplay_session_id ?? null;
    const afterRefs = typeof ctx.after === 'function' ? (ctx.after as (r: T) => Record<string, unknown>)(result) : ctx.after;

    await this.auditRepo.recordCommit({
      playerId,
      sessionId,
      decisionType: entry.code,
      before: ctx.before,
      after: { ...afterRefs, _session: sessionId },
      triggeredRecallDebt: ctx.triggeredRecallDebt,
    });

    this.bus.emitStructuralDecisionCommitted({
      type: 'structural_decision_committed',
      playerId,
      decisionType: type,
      sessionRef: sessionId,
      gameMinute: 0, // every LIVE retrofit site is player-triggered HTTP — no scheduler ctx (SessionOpenedEvent convention).
    });

    return result;
  }
}
