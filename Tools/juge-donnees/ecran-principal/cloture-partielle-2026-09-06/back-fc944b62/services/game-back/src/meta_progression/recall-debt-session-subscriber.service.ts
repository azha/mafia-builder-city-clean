// IMPLEMENTS: docs/superpowers/plans/2026-07-18-p3-F-delegation-ratchet-plan.md C7 ("`RecallDebtSession
//             Subscriber` (← `SessionClosedEvent`, P3-E subscriber pattern): accrual per DELEGATED
//             category (`LEAST(cap, …)`, `last_accrued_session_id` idempotency guard), recovery decrement
//             (rows > 0) + `RecallDebtRecoveredEvent` at zero").
//             Design: docs/superpowers/specs/2026-07-18-p3-F-delegation-ratchet-design.md §4
//             ("`RecallDebtSessionSubscriber` ← `SessionClosedEvent` (accrual + recovery decrement — D9)")
//             + §10.2 (accrual formula, signal thirds) + §10.4 (recovery decrement + `RecallDebtRecoveredEvent`).
//             Decisions: D9 ("Recall-Debt accrual + recovery decrement = SessionClosedEvent subscribers —
//             no scheduler slot, no Redis signal... Sessions are the P3-A REAL runtime (open/close
//             endpoints + sweep) — 'per session played' is literal") / D14 (idempotency, "one accrual per
//             (session_id, category)... guarded by a `last_accrued_session_id` column").
//             Pattern (REUSE verbatim — the task's own named precedent): `compression-stress-subscriber.
//             service.ts` — `onApplicationBootstrap` subscribes `bus.onSessionClosed`, fire-and-forget +
//             `.catch(err => logger.error(...))`-contained (belt-and-suspenders on top of the bus's own
//             per-listener try/catch, `city-event-bus.ts#dispatch`); a PUBLIC core method
//             (`processSessionClosed` here, `updateStressAccumulator` there) the bus handler AND the E2E
//             floor's direct-invocation test route BOTH call — zero live-vs-test divergence (that file's
//             own header: "subscribes to `SessionClosedEvent` (fired by BOTH `SessionService.close`
//             (explicit HTTP close) AND `closeStaleAndEmit` (`SESSION_SWEEP` HOURLY/5)... I5 exactly-once:
//             ...only ever call `bus.emitSessionClosed` after THEIR OWN guarded `UPDATE ... WHERE ended_at
//             IS NULL ... RETURNING` actually closed a row... a 2nd concurrent close attempt on an
//             ALREADY-closed session matches 0 rows there and never reaches this subscriber at all" — the
//             SAME upstream guarantee this subscriber relies on for "sweep-close ‖ explicit-close on the
//             SAME session → at most ONE `SessionClosedEvent` reaches this handler").
//             — P3-F C7 — 2026-07-19
//
// `RecallDebtSessionSubscriber` — turns `player_proficiency` into a live per-session ledger fed by the
// REAL `SessionClosedEvent` (design D9). ONE subscription, TWO independent single-statement atomic writes
// per call (`PlayerProficiencyRepository#accrueForSession` / `#decrementRecoveryForSession` — see that
// file's own header for why two separate statements, not one combined UPDATE, and why they safely share
// ONE idempotency guard column). `RecallDebtRecoveredEvent` fires for every category whose recovery
// decrement lands EXACTLY on 0 this call (never re-fired on a later session close for an already-0 row —
// the repository's own `recovery_period_remaining > 0` WHERE guard stops matching).

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CityEventBus, type SessionClosedEvent } from '../citysim/events/city-event-bus';
import { metaProgressionTunables } from './meta-progression-tunables';
import { PlayerProficiencyRepository, type CategoryValueRow } from './player-proficiency.repository';

/** The per-call result — the E2E floor's own proof surface (no second read needed to know what moved). */
export interface SessionClosedRecallDebtResult {
  readonly accrued: readonly CategoryValueRow[];
  readonly recovered: readonly CategoryValueRow[];
}

@Injectable()
export class RecallDebtSessionSubscriber implements OnApplicationBootstrap {
  private readonly logger = new Logger(RecallDebtSessionSubscriber.name);

  constructor(
    private readonly repo: PlayerProficiencyRepository,
    private readonly bus: CityEventBus,
  ) {}

  onApplicationBootstrap(): void {
    this.bus.onSessionClosed((event: SessionClosedEvent) => {
      this.handleSessionClosed(event).catch((err) =>
        this.logger.error(`session_closed recall-debt handler failed (contained): ${errMsg(err)}`),
      );
    });
  }

  /**
   * `processSessionClosed(playerId, sessionId, gameMinute)` — the SAME method BOTH the real
   * `SessionClosedEvent` subscription AND the E2E floor's direct-invocation test route call (Lesson #3 —
   * zero live-vs-test divergence). Runs the accrual UPDATE (D9/D14 — every `DELEGATED` category, `LEAST
   * (cap, …)`, guarded by `last_accrued_session_id`), then the recovery-decrement UPDATE (D9/§10.4 — every
   * `recovery_period_remaining > 0` row, the SAME guard column), emitting `RecallDebtRecoveredEvent` per
   * category that lands on exactly 0. Both getters (`accum`/`cap`) are read LIVE at call time — a
   * hot-reloaded `meta.recall_debt_max`/`meta.recall_debt_accumulation_per_session` takes effect on the
   * VERY NEXT session close, never a stale/cached value (D9 register §5 row 4, "strictly better than the
   * canon Redis design").
   */
  async processSessionClosed(playerId: string, sessionId: string, gameMinute: number): Promise<SessionClosedRecallDebtResult> {
    const accum = metaProgressionTunables.recallDebtAccumulationPerSession;
    const cap = metaProgressionTunables.recallDebtMax;

    const accrued = await this.repo.accrueForSession(playerId, sessionId, accum, cap);
    if (accrued.length > 0) {
      this.logger.log(
        `RECALL_DEBT: player=${playerId} session=${sessionId} accrued ` +
          accrued.map((a) => `category=${a.categoryId}->${a.value}`).join(', '),
      );
    }

    const recovered = await this.repo.decrementRecoveryForSession(playerId, sessionId);
    for (const row of recovered) {
      this.logger.log(`RECALL_DEBT_RECOVERY: player=${playerId} session=${sessionId} category=${row.categoryId} remaining=${row.value}`);
      if (row.value === 0) {
        this.bus.emitRecallDebtRecovered({
          type: 'recall_debt_recovered',
          playerId,
          categoryId: row.categoryId,
          gameMinute,
        });
      }
    }

    return { accrued, recovered };
  }

  private async handleSessionClosed(event: SessionClosedEvent): Promise<void> {
    await this.processSessionClosed(event.playerId, event.sessionId, event.gameMinute);
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
