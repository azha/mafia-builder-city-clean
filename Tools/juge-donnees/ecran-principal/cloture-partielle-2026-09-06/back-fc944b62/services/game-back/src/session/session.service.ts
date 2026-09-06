// IMPLEMENTS: docs/superpowers/plans/2026-07-10-p3-A-session-spine-plan.md §C2 (session runtime) +
//             design §4 (Session runtime, D1/D2/D10) + design §2 seam row 3/5/6 + decisions §1.1 D1 /
//             §1.2 D2 / §1.10 D10 / §2.2 DD-P2 / §2.3 DD-P3.
//             Pattern (real-time sweep registration): `route.service.ts`'s C9 light sever sweep
//             (`OnApplicationBootstrap` + `registerSystem` + a private tick method the scheduler AND the
//             `_test` route both call — Lesson #3). Pattern (real-time comparison): `ia-investigation.
//             service.ts`'s inline `new Date()` (the SAME real-wall-clock domain — no clock-port
//             abstraction ratified for this lot, unlike LiveOps's DD-B3).
//             — P3-A C2 — 2026-07-10
//
// `SessionService` — the D1 open/close/sweep orchestration + the D2 counter-increment seam.
//
// ★ P3-A C7 fold (closes the C2 `{ session_id }` skeleton disclaimer this file used to carry): `open()`'s
// response is now the FULL session-open sequence payload (HighestLeverageCard + queue top-N + badges +
// structural budget, design §9) — composed by `SessionOpenSequenceService` (SAME `session/` directory,
// injected below) on BOTH the idempotent-return AND fresh-open paths. That file's own header carries the
// fuller account of why it re-provides `ExceptionsRepository`/`ExceptionsProjectionService` locally
// rather than importing `ExceptionsModule` (a first attempt cascaded into an unrelated `LieutenantModule`
// NestJS boot failure; reverted).
//
// ★ P3-A C6 (D11) fold: `open()`'s FRESH-open path now also calls `HlCardService.computeAndPersist`
// (compute-at-open, design §8) — AWAITED, so the row exists before the HTTP response returns (no
// fire-and-forget event race). `forwardRef` closes the genuine 2-way module cycle this introduces:
// `Loop10Module` needs `SessionService` (C5 D9) and `SessionModule` now needs `HlCardService` (C6) —
// see `session.module.ts` / `loop10.module.ts` for the matching import-side `forwardRef` (mirrors the
// established `combat.module.ts` ↔ `diplomacy.module.ts` symmetric-forwardRef precedent).
//
// ★ P3-A C6-FIX (⊥ IMPORTANT-1, mig 0121): `openFresh` now surfaces `won: boolean` — `computeAndPersist`
// is called ONLY on the race-WINNER path (the loser skips it entirely, mirroring the loser already
// skipping the D10 progression reset — `session.repository.ts#openFresh`'s own doc carries the fuller
// account; `docs/tech/09_data_model/schema_core_loops.md §3b` carries the reviewer's finding). Belt-
// and-braces (MINOR-2 fold): the call is ALSO wrapped in try/catch — a provider/persistence failure
// inside the ADVISORY compute must NEVER 500 the whole `open()` request; it degrades to "no card
// computed this cycle" (logged), never blocking the session itself from opening.
//
// ★ P3-B C6 (D11) fold: `openFresh` now ALSO stamps `opened_game_day` + returns it (`session.repository.
// ts`'s own header carries the fuller account of the ONE clock read added); `open()` threads it (fresh
// path: the freshly-stamped value; idempotent-return path: the ALREADY-active row's own column, no 2nd
// read) into `openSequence.build(...)` so the ADDITIVE `flag_review: {pending_review_count, auto_open}`
// glance can be computed module-cycle-safe (design §1.11 — the C7 boot-failure wall this file's own C7
// fold already honors for `ExceptionsRepository`/`ExceptionsProjectionService`).

import { Inject, Injectable, Logger, OnApplicationBootstrap, forwardRef } from '@nestjs/common';

import { CityEventBus } from '../citysim/events/city-event-bus';
import { CitySimSchedulerService } from '../citysim/scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId } from '../citysim/scheduler/city_sim_system';
import type { CitySimTickContext } from '../citysim/scheduler/city_sim_system';
import { coreLoopsTunables } from '../core_loops/core-loops-tunables';
import { ProgressionRepository } from '../progression/progression.repository';
import { HlCardService } from '../progression/loop10/hl-card.service';
import { SessionRepository } from './session.repository';
import { SessionOpenSequenceService, type SessionOpenSequencePayload } from './session-open-sequence.service';
import type { GameplaySessionRow } from '../db/schema/sessions_and_audit';

@Injectable()
export class SessionService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    private readonly repo: SessionRepository,
    private readonly progressionRepo: ProgressionRepository,
    private readonly bus: CityEventBus,
    private readonly scheduler: CitySimSchedulerService,
    @Inject(forwardRef(() => HlCardService)) private readonly hlCards: HlCardService,
    // P3-A C7 — the full open-payload aggregator (design §9). No cycle THROUGH this specific edge
    // (`session-open-sequence.service.ts` never imports this file back) — plain injection is safe;
    // that file's own header explains why it re-provides `ExceptionsRepository`/`ExceptionsProjectionService`
    // as SessionModule-local providers rather than importing `ExceptionsModule` directly.
    private readonly openSequence: SessionOpenSequenceService,
  ) {}

  onApplicationBootstrap(): void {
    // P3-A C2 — SESSION_SWEEP (HOURLY/5 provisional, re-verified free this session). GLOBAL per-player
    // firing (like MoneyHoldingAudit/RouteSeverSweep): each player's own HOURLY tick sweeps THEIR
    // session only. Organically a no-op (design §13 zero-regression).
    this.scheduler.registerSystem({
      id: CitySystemId.SESSION_SWEEP,
      cadence: Cadence.HOURLY,
      order: 5,
      run: (ctx: CitySimTickContext) => this.sweepStaleForPlayer(ctx.playerId, ctx.gameMinute),
    });
  }

  /**
   * `POST /v1/session/open` (D1). Idempotent: an active FRESH session is returned unchanged (no dup, no
   * counter reset — the SAME session continues). A STALE active session (`started_at` older than
   * `session.stale_timeout_real_minutes`) is closed first (emitting `SessionClosedEvent`), then a fresh
   * session opens: INSERT + `last_session_id` + `structural_decisions_this_session` reset — SAME
   * transaction (D10, `SessionRepository.openFresh`).
   *
   * ★ TD-198 (allocated at C9 closeout): the staleness bound above is `started_at`-based (v1, honest —
   * design §4), not a real last-activity column; a session open a long time but recently counter-touched
   * would still sweep as stale under this bound. Separately, `core_loops.one_decision_queue_depth_visible`
   * (the queue top-N getter `SessionOpenSequenceService` consumes) is a FLAT value, not yet coupled to
   * `03_session_shapes_and_pacing/`'s 1-5-card session-shape concept (ch03 remains doc-only — no runtime
   * session-shape exists to couple against). Both refinements are the same named TD.
   *
   * ★ P3-A C7 (design §9): the response is the FULL session-open sequence payload — HL card + queue
   * top-N + badges + structural budget (`SessionOpenSequenceService#build`) — honestly closing the C2
   * `{ session_id }` skeleton disclaimer. Composed on BOTH paths (idempotent-return AND fresh-open) so a
   * re-opened idempotent session still reflects the player's CURRENT state, never a stale snapshot from
   * whenever the session originally opened.
   */
  async open(playerId: string, clientVersion: string): Promise<SessionOpenSequencePayload> {
    const staleMinutes = coreLoopsTunables.sessionStaleTimeoutRealMinutes;

    const fresh = await this.repo.findFreshActive(playerId, staleMinutes);
    if (fresh) {
      // P3-B C6 (D11) — the idempotent-return path already knows its OWN `opened_game_day` (stamped at
      // whenever this session was originally opened) — no 2nd clock read.
      return this.openSequence.build(playerId, fresh.gameplay_session_id, fresh.opened_game_day);
    }

    // Either no active session at all, or a STALE one — close it before opening fresh (D1). No-op
    // (empty array) in the common "no active session" case.
    await this.closeStaleAndEmit(playerId, staleMinutes, 0);

    // Guarantee the progression row exists (Phase-17 idempotent create, REUSE — `openFresh`'s reset
    // UPDATE targets this row).
    await this.progressionRepo.ensureRow(playerId);

    const { id: sessionId, won, openedGameDay } = await this.repo.openFresh(playerId, clientVersion);

    this.bus.emitSessionOpened({ type: 'session_opened', playerId, sessionId, gameMinute: 0 });

    // P3-A C6 (D11) — compute-at-open, FRESH-open path ONLY (the idempotent-fresh-return path above
    // does NOT recompute — no new decision cycle has started). AWAITED so the persisted card exists
    // before this HTTP response returns (design §8's own "computed at session open").
    //
    // ★ C6-FIX (⊥ IMPORTANT-1, mig 0121): ONLY the race-WINNER computes — a race-LOSER's `sessionId`
    // points at the SAME session the winner already opened (and, if it also won, already computed a
    // card for); recomputing here too would be BOTH redundant AND (before mig 0121 + this guard) the
    // exact reviewer-reproduced defect (2 concurrent opens each persisting their OWN 'active' HL card
    // row for the SAME player, top-1 invariant broken).
    //
    // ★ MINOR-2 fold: never let an advisory-compute failure surface as a 500 on `open()` — a thrown
    // provider query (or a `highest_leverage_cards` write racing past even mig 0121's guard) degrades
    // to "no card this cycle", logged, with the session itself still opened successfully.
    if (won) {
      try {
        await this.hlCards.computeAndPersist(playerId, sessionId);
      } catch (err) {
        this.logger.error(
          `HlCardService.computeAndPersist failed for player ${playerId} (session ${sessionId}) — ` +
            `degrading to no HL card this cycle, session open still succeeds: ` +
            `${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return this.openSequence.build(playerId, sessionId, openedGameDay);
  }

  /** `POST /v1/session/close`. Idempotent: no active session → `{ closed: false }`, still 200 (no-op). */
  async close(playerId: string): Promise<{ closed: boolean }> {
    const closedId = await this.repo.closeActiveForPlayer(playerId);
    if (closedId) {
      this.bus.emitSessionClosed({ type: 'session_closed', playerId, sessionId: closedId, gameMinute: 0 });
    }
    return { closed: closedId !== null };
  }

  /**
   * `SESSION_SWEEP` (HOURLY/5) — closes this player's active session IFF it has gone stale. Organically
   * a no-op when the active session is still fresh, or there is none (design §13 zero-regression). The
   * SAME method the scheduler tick AND the `run-session-sweep` `_test` route both call (Lesson #3 — zero
   * live-vs-test divergence).
   */
  async sweepStaleForPlayer(playerId: string, gameMinute: number): Promise<void> {
    const staleMinutes = coreLoopsTunables.sessionStaleTimeoutRealMinutes;
    await this.closeStaleAndEmit(playerId, staleMinutes, gameMinute);
  }

  /**
   * D2 — the exceptions-resolve counter seam: `exceptions_resolved` + `decisions_made` (design §4 "resolve
   * + governor + HL commit/skip"), ONE atomic UPDATE. Wired from `ExceptionsService.resolve`'s Phase-17
   * hook point (additive, D3). No active session → no-op (D9 — the increment simply doesn't fire; no
   * phantom session is created).
   */
  async recordExceptionResolved(playerId: string): Promise<void> {
    await this.repo.incrementActiveSessionCounters(playerId, { exceptions_resolved: 1, decisions_made: 1 });
  }

  /**
   * P3-A C6 (D2) — the HL-card ADVISORY commit/skip counter seam: `decisions_made` ONLY (design §4
   * "decisions_made = resolve + governor + HL commit/skip"). The STRUCTURAL commit branch does NOT call
   * this — its `decisions_made` increment happens inside the governor's OWN post-mutation write
   * (`StructuralDecisionGovernorRepository.recordCommit`, session-bound branch) so the counter is never
   * double-incremented for a single HL commit. No active session → no-op (D9, same as every other
   * session-scoped counter seam in this file).
   */
  async recordAdvisoryDecision(playerId: string): Promise<void> {
    await this.repo.incrementActiveSessionCounters(playerId, { decisions_made: 1 });
  }

  /**
   * P3-A C5 (D9) — the Loop 10 governor's session-presence read: the player's currently OPEN session
   * (`ended_at IS NULL`), regardless of staleness — the SAME `findActive` definition of "active" every
   * OTHER session-scoped seam in this file uses (`incrementActiveSessionCounters`'s WHERE clause).
   * `null` → the governor treats the commit as SESSIONLESS (pass-through + audited with
   * `session_ref: null`, D9's zero-regression reading).
   */
  async getActiveSession(playerId: string): Promise<GameplaySessionRow | null> {
    return this.repo.findActive(playerId);
  }

  /** Close every stale session for this player and emit `SessionClosedEvent` per row actually closed
   *  (0 or 1 in practice — the one-active-session invariant is application-enforced). */
  private async closeStaleAndEmit(playerId: string, staleMinutes: number, gameMinute: number): Promise<void> {
    const closedIds = await this.repo.closeStaleForPlayer(playerId, staleMinutes);
    for (const sessionId of closedIds) {
      this.bus.emitSessionClosed({ type: 'session_closed', playerId, sessionId, gameMinute });
    }
  }
}
