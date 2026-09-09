// IMPLEMENTS: docs/superpowers/plans/2026-07-10-p3-A-session-spine-plan.md §C6 ("Compute-at-open:
//             persist top-1 (row in `highest_leverage_cards`) ... supersede logic ... skip-carry") +
//             C6-fix (⊥ IMPORTANT-1 — DB-enforce one non-terminal card, mig 0121)
//             Design: docs/superpowers/specs/2026-07-10-p3-A-session-spine-design.md §3 (data model —
//             `highest_leverage_cards`, mig 0119) + §8 (lifecycle) + §3b addendum (mig 0121,
//             `schema_core_loops.md`).
//             Schema (R9.3 — REUSE unchanged, landed C1 + C6-fix): `highest_leverage_cards`
//             (`db/schema/core_loops.ts` — mig `0119_core_loops_session.sql` +
//             `0121_hl_cards_non_terminal_unique.sql`).
//             — P3-A C6 — 2026-07-10 / C6-fix (⊥ IMPORTANT-1) — 2026-07-10
//
// `HlCardRepository` — the `highest_leverage_cards` persistence layer (D11): find the player's
// currently CARRIED card (top-1 model — at most ONE non-terminal row per player at a time, NOW
// DB-enforced by `highest_leverage_cards_non_terminal_idx`, mig 0121), insert a fresh winner,
// reactivate a carried card at the SAME `card_id` (skip-carry), and the 3 terminal-status writers
// (superseded / committed / skipped).
//
// ★ C6-FIX (⊥ IMPORTANT-1): `insertActive` is now the PRIMARY defense-in-depth layer against a
// concurrent double-insert (the PRIMARY fix is `session.service.ts#open` calling `computeAndPersist`
// ONLY on the race-WINNER path — this repository has no visibility into that decision, it only knows
// its OWN INSERT). `onConflictDoNothing` targets the NEW unique index; on conflict, re-reads and
// returns the row that survived (mirrors `SessionRepository#openFresh`'s exact recovery shape).

import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { highestLeverageCardRow, type HighestLeverageCardRow } from '../../db/schema/core_loops';
import type { HlCardCandidate } from './hl-card-types';

/** Non-terminal statuses — a card in either of these is the player's CURRENTLY carried card (design §8
 *  lifecycle: computed active → either committed/superseded (terminal) or skipped (carries)). */
const NON_TERMINAL_STATUSES = ['active', 'skipped'] as const;

@Injectable()
export class HlCardRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /** The player's currently CARRIED card (status IN active/skipped), if any — top-1 model, at most one
   *  such row exists per player at a time; `surfaced_at DESC` is defensive (should never see >1). */
  async findCarried(playerId: string): Promise<HighestLeverageCardRow | null> {
    const rows = await this.db
      .select()
      .from(highestLeverageCardRow)
      .where(and(eq(highestLeverageCardRow.player_id, playerId), inArray(highestLeverageCardRow.status, [...NON_TERMINAL_STATUSES])))
      .orderBy(desc(highestLeverageCardRow.surfaced_at))
      .limit(1);
    return rows[0] ?? null;
  }

  /** A specific card, scoped to its owning player (ownership guard — never cross-player). */
  async findOwned(playerId: string, cardId: string): Promise<HighestLeverageCardRow | null> {
    const rows = await this.db
      .select()
      .from(highestLeverageCardRow)
      .where(and(eq(highestLeverageCardRow.card_id, cardId), eq(highestLeverageCardRow.player_id, playerId)))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * INSERT a fresh `active` row for the winning candidate (design §8 "top-1 persisted").
   *
   * ★ C6-FIX (⊥ IMPORTANT-1, mig 0121) — defense-in-depth: the INSERT targets
   * `highest_leverage_cards_non_terminal_idx` (`(player_id) WHERE status IN ('active','skipped')`) as
   * its `ON CONFLICT` arbiter — the SAME "target the unique partial index, recover on skip" shape
   * `SessionRepository#openFresh` uses for `gameplay_sessions_active_unique_idx` (mig 0120). The
   * PRIMARY defense is the caller (`session.service.ts#open`) only reaching this method on the
   * session-open race-WINNER path; this is the belt to that braces — if some OTHER future caller ever
   * reaches `insertActive` concurrently for the same player, the conflicting INSERT is silently
   * skipped (no exception) and the row that survived is re-read and returned instead.
   */
  async insertActive(playerId: string, sessionId: string, winner: HlCardCandidate): Promise<HighestLeverageCardRow> {
    const inserted = await this.db
      .insert(highestLeverageCardRow)
      .values({
        player_id: playerId,
        session_ref: sessionId,
        decision_type: winner.decisionTypeCode,
        target_ref: winner.targetRef,
        impact_internal: winner.impact,
        urgency_internal: winner.urgency,
        options: winner.options,
        status: 'active',
      })
      .onConflictDoNothing({
        target: highestLeverageCardRow.player_id,
        where: sql`${highestLeverageCardRow.status} IN ('active', 'skipped')`,
      })
      .returning();

    if (inserted[0]) return inserted[0];

    // Conflict: a concurrent writer already claimed the non-terminal slot for this player. Recover
    // by reading back the row that survived — guaranteed to exist (onConflictDoNothing only skips
    // when a conflicting non-terminal row is present).
    const survivor = await this.findCarried(playerId);
    if (!survivor) {
      throw new Error(
        `[HlCardRepository] insertActive: onConflictDoNothing skipped the INSERT for player ${playerId} ` +
          'but no carried row was found on re-read — the non-terminal-unique invariant is violated.',
      );
    }
    return survivor;
  }

  /**
   * Skip-carry (design §8 "same priority"): re-surface the SAME row (SAME `card_id` — the falsifiable
   * "SAME card re-surfaces" proof) at the freshly recomputed impact/urgency/options — state may have
   * drifted slightly (e.g. a real-clock-based urgency) even though the CANDIDATE'S IDENTITY
   * (decisionTypeCode + targetRef) is unchanged; `status` flips back to 'active' (re-surfaced,
   * actionable again) and `surfaced_at` is bumped so BO history/ordering reflects the new surfacing.
   *
   * ★ MINOR-6 disposition (`core_loops.one_decision_skip_carry_forward_priority_decay_pct`, C1-
   * registered, default 0, range 0..20 — NOT consumed here, deliberately): decisions §3's own
   * canon-transposition table already reads "decay_pct default 0 = canon-exact" — v1 carry is an
   * EXACT same-priority re-surface (this method recomputes impact/urgency fresh from the CURRENT
   * state each cycle rather than decaying a stored PRIOR score; for a genuinely unchanged state the
   * two are equivalent by construction). Wiring a non-zero decay would require tracking how many
   * times a given card has carried (a "repeated-skip fatigue" counter this table does not persist —
   * `surfaced_at`/`resolved_at` timestamps don't encode a carry-count) — real design work, not a
   * trivial wire-up, so it stays inert this chunk (getter registered + clamped, never called).
   * Decisions doc §1.11 D11 carries the same note (C6-fix fold) for the reviewer/C9 record.
   */
  async reactivateCarried(cardId: string, sessionId: string, winner: HlCardCandidate): Promise<void> {
    await this.db
      .update(highestLeverageCardRow)
      .set({
        status: 'active',
        session_ref: sessionId,
        surfaced_at: sql`now()`,
        impact_internal: winner.impact,
        urgency_internal: winner.urgency,
        target_ref: winner.targetRef,
        options: winner.options,
      })
      .where(eq(highestLeverageCardRow.card_id, cardId));
  }

  /** State improved / a fresher winner supersedes — terminal, `resolved_at` stamped. */
  async markSuperseded(cardId: string): Promise<void> {
    await this.db
      .update(highestLeverageCardRow)
      .set({ status: 'superseded', resolved_at: sql`now()` })
      .where(eq(highestLeverageCardRow.card_id, cardId));
  }

  /** Commit (either branch — structural via the governor, or advisory direct) — terminal. */
  async markCommitted(cardId: string): Promise<void> {
    await this.db
      .update(highestLeverageCardRow)
      .set({ status: 'committed', resolved_at: sql`now()` })
      .where(eq(highestLeverageCardRow.card_id, cardId));
  }

  /** Skip — NOT terminal (`resolved_at` stays null — design §3 "unresolved = null"; the card carries). */
  async markSkipped(cardId: string): Promise<void> {
    await this.db
      .update(highestLeverageCardRow)
      .set({ status: 'skipped' })
      .where(eq(highestLeverageCardRow.card_id, cardId));
  }
}
