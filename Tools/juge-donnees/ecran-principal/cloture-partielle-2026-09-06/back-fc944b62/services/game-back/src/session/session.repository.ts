// IMPLEMENTS: docs/superpowers/plans/2026-07-10-p3-A-session-spine-plan.md §C2 (session runtime —
//             activation of `gameplay_sessions`) + design §4 (Session runtime, D1/D2/D10) + decisions
//             §1.1 D1 / §1.2 D2 / §1.10 D10.
//             Schema (R9.3 — REUSE unchanged, dormant activation): `gameplay_sessions`
//             (`sessions_and_audit.ts:36-59` — CORRECTED citations per decisions §8 C0 re-anchor: the
//             design's own :44/:45/:46/:43/:55 were off by 1-2 lines; the real fields are
//             decisions_made:43, exceptions_resolved:44, structural_commits:45, client_version:46) +
//             `player_progression_state.structural_decisions_this_session`/`last_session_id`
//             (`player_progression_state.ts:21-22`).
//             ★ P3-A C2-FOLD (⊥ IMPORTANT-1, mig 0120): the one-active-session invariant, APP-enforced
//             ONLY at C2 (a plain, non-unique `gameplay_sessions_active_partial_idx` — a race between
//             two concurrent `open()` calls for the same player could insert two active rows), is now
//             DB-ENFORCED via `gameplay_sessions_active_unique_idx` (UNIQUE partial index, `(player_id)
//             WHERE ended_at IS NULL`) — the old plain index is DROPped (same migration, 100%
//             subsumed). `openFresh` below catches the resulting 23505 unique-violation and recovers
//             by returning the already-active session (race-safe double-open, not just sequential).
//             — P3-A C2 — 2026-07-10 / C2-fold — 2026-07-10
//
//             P3-B C6 (design D11/§1.11, plan §C6): `openFresh` now stamps the additive `opened_game_day`
//             column (`sessions_and_audit.ts:54`, mig 0123 P3-B C1) at INSERT time — ONE clock read added
//             to the SAME transaction (`city_sim_clock.game_minute`, absent row → 0). NEW
//             `hasOtherSessionOpenedOnGameDay` — the `flag_review.auto_open` arbiter query
//             (`SessionOpenSequenceService` calls it, re-provided `FlagDisciplineRepository` alongside).
//             — P3-B C6 — 2026-07-11
//
// `SessionRepository` — the `gameplay_sessions` + `player_progression_state` (session-half) persistence.
// The one-active-session invariant is DB-ENFORCED (as of the C2 fold, mig 0120 —
// `gameplay_sessions_active_unique_idx`, UNIQUE): every method below keys off `ended_at IS NULL` for
// "the active session"; `openFresh`'s unique-violation recovery is the one place this repository reacts
// to the constraint directly.

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gte, isNull, lt, ne, sql } from 'drizzle-orm';

import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { gameplaySessionRow, type GameplaySessionRow } from '../db/schema/sessions_and_audit';
import { playerProgressionState } from '../db/schema/player_progression_state';
import { citySimClock } from '../db/schema/city_sim_clock';
import { citySimTunables } from '../citysim/citysim-tunables';
import { deriveGameDay } from '../operational/political/political-trigger-evaluators';

/** Per-counter increment deltas (D2 — the 3 GDD-verbatim server-authoritative counters). Omitted keys are
 *  left untouched (no spurious `col = col + 0` writes). */
export interface SessionCounterDeltas {
  decisions_made?: number;
  exceptions_resolved?: number;
  structural_commits?: number;
}

@Injectable()
export class SessionRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /** The player's currently OPEN session (`ended_at IS NULL`), if any — regardless of staleness. */
  async findActive(playerId: string): Promise<GameplaySessionRow | null> {
    const rows = await this.db
      .select()
      .from(gameplaySessionRow)
      .where(and(eq(gameplaySessionRow.player_id, playerId), isNull(gameplaySessionRow.ended_at)))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * The player's OPEN session iff it is still FRESH (`started_at >= now - staleMinutes`) — the D1
   * idempotent-open read: a fresh active session is returned as-is (no dup, no counter reset).
   */
  async findFreshActive(playerId: string, staleMinutes: number): Promise<GameplaySessionRow | null> {
    const cutoff = new Date(Date.now() - staleMinutes * 60_000);
    const rows = await this.db
      .select()
      .from(gameplaySessionRow)
      .where(
        and(
          eq(gameplaySessionRow.player_id, playerId),
          isNull(gameplaySessionRow.ended_at),
          gte(gameplaySessionRow.started_at, cutoff),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * Close every OPEN session for this player whose `started_at` predates the real-time cutoff — the ONE
   * seam both the D1 stale-close-then-open path (`SessionService.open`) and the HOURLY/5 `SESSION_SWEEP`
   * tick (`SessionService.sweepStaleForPlayer`) call (Lesson #3 — zero live-vs-test divergence). Returns
   * the ids actually closed (0 in the common case — organically a no-op, design §13).
   */
  async closeStaleForPlayer(playerId: string, staleMinutes: number): Promise<string[]> {
    const cutoff = new Date(Date.now() - staleMinutes * 60_000);
    const closed = await this.db
      .update(gameplaySessionRow)
      .set({ ended_at: sql`now()` })
      .where(
        and(
          eq(gameplaySessionRow.player_id, playerId),
          isNull(gameplaySessionRow.ended_at),
          lt(gameplaySessionRow.started_at, cutoff),
        ),
      )
      .returning({ id: gameplaySessionRow.gameplay_session_id });
    return closed.map((r) => r.id);
  }

  /**
   * Close the player's currently OPEN session UNCONDITIONALLY (`POST /v1/session/close`). Idempotent:
   * returns null (no row touched) if nothing was open.
   */
  async closeActiveForPlayer(playerId: string): Promise<string | null> {
    const closed = await this.db
      .update(gameplaySessionRow)
      .set({ ended_at: sql`now()` })
      .where(and(eq(gameplaySessionRow.player_id, playerId), isNull(gameplaySessionRow.ended_at)))
      .returning({ id: gameplaySessionRow.gameplay_session_id });
    return closed[0]?.id ?? null;
  }

  /**
   * Open a FRESH session — INSERT the row + reset the player's session-half progression columns
   * (`last_session_id` + `structural_decisions_this_session = 0`, D10) in the SAME transaction (D1).
   * Caller is responsible for having already closed any stale prior session AND for having called
   * `ProgressionRepository.ensureRow` first (the row this UPDATE targets must already exist).
   *
   * ★ P3-A C2-FOLD (⊥ IMPORTANT-1, mig 0120) — RACE-SAFE under genuine concurrency, not just
   * sequential calls: the INSERT targets `gameplay_sessions_active_unique_idx` (the UNIQUE partial
   * index, `(player_id) WHERE ended_at IS NULL`) as its `ON CONFLICT` arbiter. Two callers racing to
   * open the SAME player's first session both attempt the INSERT; exactly one wins (its row survives),
   * the other's INSERT is skipped (`onConflictDoNothing`) — NO exception is thrown (a skipped insert on
   * a targeted arbiter is not an error in Postgres, unlike an untargeted unique-violation). The LOSER
   * recovers by SELECTing the now-active row the winner just created and returns ITS id: both callers
   * observe the SAME `session_id` (D1 idempotent-open, now proven under concurrency). The loser does
   * NOT re-run the progression reset/stamp — the winner's OWN transaction already did that for the
   * session that actually survived; re-running it would be redundant (and, in a pathological
   * interleaving where the winner's session already accrued state, incorrect).
   *
   * ★ P3-A C6-FIX (⊥ IMPORTANT-1, mig 0121) — the return shape now ALSO surfaces `won: boolean` (was
   * a bare id): `SessionService#open` uses it to skip `HlCardService#computeAndPersist` ENTIRELY on
   * the race-LOSER path — before this fix, BOTH the winner and the loser called it (no signal
   * distinguished them), and `HlCardService`'s own findCarried-then-insertActive sequence had no DB
   * atomicity either, so 2 concurrent opens could each persist their OWN 'active' HL card row for the
   * SAME player (reviewer-reproduced under 12 concurrent opens — `docs/tech/09_data_model/
   * schema_core_loops.md §3b` carries the fuller account). `won` mirrors EXACTLY the same
   * "the loser skips the progression reset" reasoning already applied to D10 above — extended here to
   * D11's compute-at-open.
   *
   * ★ P3-B C6 (D11/§1.11) — the return shape now ALSO surfaces `openedGameDay: number`: ONE clock read is
   * added to THIS transaction (`city_sim_clock.game_minute` for `playerId` — absent row → 0, the SAME
   * "no clock yet" convention `FlagDisciplineRepository#getCurrentTick` already establishes), derived to a
   * game-day via the SAME `deriveGameDay` convention every NIGHTLY/day-keyed tick uses, and stamped onto
   * the freshly-INSERTed row's OWN `opened_game_day` column. The race-LOSER never computes/writes its own
   * value — `onConflictDoNothing` skips its whole INSERT (including the `opened_game_day` it would have
   * carried), so the loser recovers by reading back the WINNER's already-persisted `opened_game_day` (the
   * SAME "loser reads back what the winner wrote" discipline `won`/`last_session_id` already follow) —
   * never a double-write, never a value drift between the two racers' view of "this session's game-day".
   */
  async openFresh(playerId: string, clientVersion: string): Promise<{ id: string; won: boolean; openedGameDay: number }> {
    return this.db.transaction(async (tx) => {
      const [clockRow] = await tx
        .select({ game_minute: citySimClock.game_minute })
        .from(citySimClock)
        .where(eq(citySimClock.player_id, playerId))
        .limit(1);
      const openedGameDay = deriveGameDay(clockRow?.game_minute ?? 0, citySimTunables.inGameDayLengthMinutes);

      const inserted = await tx
        .insert(gameplaySessionRow)
        .values({ player_id: playerId, client_version: clientVersion, opened_game_day: openedGameDay })
        .onConflictDoNothing({
          // Arbiter = the UNIQUE partial index (mig 0120): `target` + `where` together reproduce
          // `ON CONFLICT (player_id) WHERE ended_at IS NULL DO NOTHING` — Postgres matches this
          // predicate against `gameplay_sessions_active_unique_idx` (same column, same predicate).
          target: gameplaySessionRow.player_id,
          where: sql`${gameplaySessionRow.ended_at} IS NULL`,
        })
        .returning({ id: gameplaySessionRow.gameplay_session_id, opened_game_day: gameplaySessionRow.opened_game_day });

      if (inserted[0]) {
        // WON (the common case — no concurrent opener for this player): reset + stamp in the SAME tx.
        await tx
          .update(playerProgressionState)
          .set({ last_session_id: inserted[0].id, structural_decisions_this_session: 0 })
          .where(eq(playerProgressionState.player_id, playerId));
        return { id: inserted[0].id, won: true, openedGameDay: inserted[0].opened_game_day };
      }

      // LOST the race: a concurrent opener's INSERT already claimed the arbiter. Recover by reading
      // back the row that survived — guaranteed to exist (onConflictDoNothing only skips when a
      // conflicting active row is present, and no code path here ever deletes a session row).
      const [active] = await tx
        .select({ id: gameplaySessionRow.gameplay_session_id, opened_game_day: gameplaySessionRow.opened_game_day })
        .from(gameplaySessionRow)
        .where(and(eq(gameplaySessionRow.player_id, playerId), isNull(gameplaySessionRow.ended_at)));
      return { id: active.id, won: false, openedGameDay: active.opened_game_day };
    });
  }

  /**
   * P3-B C6 (design D11/§1.11) — `auto_open`'s own arbiter query: does this player have any OTHER session
   * row (any `ended_at` status — a closed-then-reopened session STILL counts as "already had a session
   * today") whose `opened_game_day` equals `gameDay`, EXCLUDING `excludeSessionId` (the CURRENT session
   * itself — otherwise every session would trivially find "itself" and `auto_open` could never be true).
   * `SessionOpenSequenceService` calls this with the CURRENT session's OWN already-known
   * `opened_game_day` (no 2nd clock read, D11's "ONE clock read" discipline) — `auto_open = pendingCount
   * > 0 AND NOT hasOtherSessionOpenedOnGameDay(...)`.
   */
  async hasOtherSessionOpenedOnGameDay(playerId: string, gameDay: number, excludeSessionId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: gameplaySessionRow.gameplay_session_id })
      .from(gameplaySessionRow)
      .where(
        and(
          eq(gameplaySessionRow.player_id, playerId),
          eq(gameplaySessionRow.opened_game_day, gameDay),
          ne(gameplaySessionRow.gameplay_session_id, excludeSessionId),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  /**
   * D2 — atomic single-site increment of one or more counters on the player's ACTIVE session, if any.
   * No active session → the WHERE matches zero rows → no-op (D9 zero-regression: the caller never
   * branches on session presence — no phantom session is ever created by an increment attempt).
   * `UPDATE … SET col = col + n …` — one statement per call, no read-then-write race.
   */
  async incrementActiveSessionCounters(playerId: string, deltas: SessionCounterDeltas): Promise<void> {
    const setClause: Record<string, unknown> = {};
    if (deltas.decisions_made) {
      setClause.decisions_made = sql`${gameplaySessionRow.decisions_made} + ${deltas.decisions_made}`;
    }
    if (deltas.exceptions_resolved) {
      setClause.exceptions_resolved = sql`${gameplaySessionRow.exceptions_resolved} + ${deltas.exceptions_resolved}`;
    }
    if (deltas.structural_commits) {
      setClause.structural_commits = sql`${gameplaySessionRow.structural_commits} + ${deltas.structural_commits}`;
    }
    if (Object.keys(setClause).length === 0) return;

    await this.db
      .update(gameplaySessionRow)
      .set(setClause)
      .where(and(eq(gameplaySessionRow.player_id, playerId), isNull(gameplaySessionRow.ended_at)));
  }
}
