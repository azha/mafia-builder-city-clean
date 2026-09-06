// IMPLEMENTS: docs/superpowers/specs/2026-08-09-w1.1a-onboarding-funnel-design.md §4 chunk C6 (D3)
//             -- W1.1-a C6 -- 2026-08-09 --
//
// `OnboardingFunnelRepository` — the funnel-state (`player_progression_state.onboarding_funnel_step` /
// `.first_decision_at`) writers (design D3) + their read-back for the `session/open` payload's
// `onboarding` block (design §3). Deliberately NOT `ProgressionRepository` (Phase-17 vocab-tier +
// P3-H pressure — a DIFFERENT domain that happens to share the same table): mirrors the precedent
// `OnboardingGrantService`/`OnboardingGrantRepository` (C3) already set — this lot's own writers on
// `player_progression_state` (the claim, C3) live in `src/onboarding/`, not bolted onto an unrelated
// repository just because the COLUMN happens to live on a shared table (multiple repositories already
// write DIFFERENT columns of this same table — `ProgressionRepository`/`PressureTierRepository`-style
// writers coexist today with zero conflict, R9.3 is about the SCHEMA declaration, never about a
// single-writer-per-table rule).
//
// No dedicated module (mirrors `OnboardingGrantRepository`'s OWN "no owning module" shape, C3) — this
// class needs ONLY `@Inject(DB)` (trivially cycle-safe, the SAME `ExceptionsRepository`/
// `FlagDisciplineRepository` shape `session.module.ts` already re-provides directly), so it is
// provisioned directly in BOTH `ExceptionsModule.providers` (the resolve-hook writer) and
// `SessionModule.providers` (the session/open writers + read-back) — no `exports:` needed anywhere
// (nothing outside those two modules consumes it). UNLIKE `OnboardingGrantRepository`, this class
// carries NO dangerous capacity (no free-building-mint power, D10.2's concern) — it only ever writes 2
// columns on an EXISTING row via monotonic guarded UPDATEs — so it needs no non-export structural guard.

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';

import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { playerProgressionState, type OnboardingFunnelStep } from '../db/schema/player_progression_state';

/** Defensive dual-shape read for a raw `db.execute` result — this codebase's own established idiom
 *  (`progression.repository.ts#rowsOf` / `execution-plans.repository.ts#rowsOf`): never a shared
 *  extraction across repositories, each keeps its OWN local copy. */
function rowsOf(result: unknown): Array<Record<string, unknown>> {
  return (result as { rows?: Array<Record<string, unknown>> }).rows ?? (result as Array<Record<string, unknown>>);
}

export interface OnboardingFunnelState {
  funnelStep: OnboardingFunnelStep;
  firstDecisionAt: Date | null;
}

@Injectable()
export class OnboardingFunnelRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * D3 / IM-2 — the resolve-hook writer (`ExceptionsService.resolve`'s 5th sibling call, C6). TWO
   * guarded UPDATEs, self-contained, NEVER a read-then-write (I6): the FIRST decision of the ACCOUNT —
   * account-scoped, NOT session-scoped (IM-2's own correction — `gameplay_session.exceptions_resolved`
   * is the WRONG discriminant, `session.service.ts:178-179`'s "no active session → no-op" would leave a
   * sessionless `signup → resolve` stuck at LAUNCH forever) — stamps `first_decision_at` + advances to
   * FIRST_COMMIT; a call whose guard misses (this is NOT the account's first decision) instead attempts
   * the SECOND_DECISION advance. A third+ call is a structured no-op (neither guard matches — the
   * funnel never advances past SECOND_DECISION from THIS hook; QUIET_STATE is a session/open-side
   * concern, see `advanceQuietStateIfQueueEmpty` below). Postgres serializes both UPDATEs at the row
   * level against ANY concurrent writer on this row (e.g. `PressureTierService.onSessionStart`'s own
   * unawaited UPDATE, §0.7) — since neither statement reads before writing, there is no lost update.
   */
  async recordDecision(playerId: string): Promise<void> {
    const first = await this.db
      .update(playerProgressionState)
      .set({ first_decision_at: sql`now()`, onboarding_funnel_step: 'FIRST_COMMIT' })
      .where(and(eq(playerProgressionState.player_id, playerId), isNull(playerProgressionState.first_decision_at)))
      .returning({ player_id: playerProgressionState.player_id });
    if (first.length > 0) return; // this WAS the account's first-ever decision — done.

    await this.db
      .update(playerProgressionState)
      .set({ onboarding_funnel_step: 'SECOND_DECISION' })
      .where(
        and(
          eq(playerProgressionState.player_id, playerId),
          eq(playerProgressionState.onboarding_funnel_step, 'FIRST_COMMIT'),
        ),
      );
  }

  /**
   * D3 — HOME_FIRST: guarded advance from LAUNCH only (I6 — self-contained WHERE guard, never an
   * external read deciding the write). Called on EVERY `session/open` (`build()`, both the idempotent-
   * return and fresh-open paths, I5) — a genuine no-op (0 rows) for every call after the account's
   * FIRST session/open ever, the same "0-row match in steady state" cost profile the design names for
   * `PressureTierService.onSessionStart`. Returns the row's resulting {step, first_decision_at} when
   * THIS call's own guard matched (so the caller can report the fresh state without a 2nd read); `null`
   * when it did not (the account is already past LAUNCH).
   */
  async advanceHomeFirst(playerId: string): Promise<OnboardingFunnelState | null> {
    const rows = await this.db
      .update(playerProgressionState)
      .set({ onboarding_funnel_step: 'HOME_FIRST' })
      .where(
        and(
          eq(playerProgressionState.player_id, playerId),
          eq(playerProgressionState.onboarding_funnel_step, 'LAUNCH'),
        ),
      )
      .returning({
        onboarding_funnel_step: playerProgressionState.onboarding_funnel_step,
        first_decision_at: playerProgressionState.first_decision_at,
      });
    const row = rows[0];
    return row ? { funnelStep: row.onboarding_funnel_step, firstDecisionAt: row.first_decision_at } : null;
  }

  /**
   * D3 (C6 "Contenu" point v) — QUIET_STATE: `session/open` sees an EMPTY queue after ≥1 resolution.
   * A SINGLE self-contained guarded UPDATE (I6 — no JS-computed "is the queue empty" flag threaded in;
   * the `NOT EXISTS` subquery makes the guard its OWN proof, the SAME shape
   * `execution-plans.repository.ts#completeIfAllSlotsDone` already establishes for "no still-pending
   * sibling row"). `first_decision_at IS NOT NULL` is the "≥1 resolution happened" half (it is stamped
   * exactly once, at the account's first-ever decision — never earlier); `onboarding_funnel_step IN
   * ('FIRST_COMMIT','SECOND_DECISION')` restricts the transition to the two steps that can legitimately
   * precede QUIET_STATE (a LAUNCH/HOME_FIRST account has no `first_decision_at` yet by construction, so
   * that guard is redundant-but-explicit defense in depth). Returns the resulting row when THIS call's
   * guard matched; `null` otherwise (queue non-empty, or the account already sits at QUIET_STATE, or it
   * has not yet made a first decision).
   */
  async advanceQuietStateIfQueueEmpty(playerId: string): Promise<OnboardingFunnelState | null> {
    const result = await this.db.execute(sql`
      UPDATE player_progression_state
      SET onboarding_funnel_step = 'QUIET_STATE'
      WHERE player_id = ${playerId}::uuid
        AND first_decision_at IS NOT NULL
        AND onboarding_funnel_step IN ('FIRST_COMMIT', 'SECOND_DECISION')
        AND NOT EXISTS (
          SELECT 1 FROM exception_queue
          WHERE player_id = ${playerId}::uuid AND resolution_status = 'pending'
        )
      RETURNING onboarding_funnel_step, first_decision_at
    `);
    const row = rowsOf(result)[0];
    if (!row) return null;
    return {
      funnelStep: row.onboarding_funnel_step as OnboardingFunnelStep,
      firstDecisionAt: row.first_decision_at ? new Date(row.first_decision_at as string) : null,
    };
  }

  /**
   * The fallback plain READ — used ONLY to REPORT state when neither guarded UPDATE above matched (the
   * account already sits past its one-time transition point for both, e.g. HOME_FIRST with no decision
   * yet, or FIRST_COMMIT/SECOND_DECISION with a non-empty queue, or already QUIET_STATE). Never followed
   * by a write in the same call — a pure display read, not the read-then-write I6 forbids. A missing row
   * defends to the schema defaults (mirrors every OTHER `player_progression_state` getter's convention,
   * `ProgressionRepository.getStructuralDecisionsThisSession` etc.) — should not happen here in practice
   * (the row is guaranteed to exist by the time `build()` runs, `SessionService.open`'s own `ensureRow`
   * call on the fresh-open path), but a defensive default is free and matches house style.
   */
  async getCurrentState(playerId: string): Promise<OnboardingFunnelState> {
    const rows = await this.db
      .select({
        onboarding_funnel_step: playerProgressionState.onboarding_funnel_step,
        first_decision_at: playerProgressionState.first_decision_at,
      })
      .from(playerProgressionState)
      .where(eq(playerProgressionState.player_id, playerId))
      .limit(1);
    const row = rows[0];
    return { funnelStep: row?.onboarding_funnel_step ?? 'LAUNCH', firstDecisionAt: row?.first_decision_at ?? null };
  }
}
