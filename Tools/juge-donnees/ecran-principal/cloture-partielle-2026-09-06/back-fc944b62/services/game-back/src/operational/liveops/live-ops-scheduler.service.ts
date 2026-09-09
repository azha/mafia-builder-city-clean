// IMPLEMENTS: docs/superpowers/plans/2026-07-06-04e-B-liveops-plan.md C4 (★ LiveOpsSchedulerService —
//             real-clock reconciler + boot reconciler, DD-B3)
//             Design: docs/superpowers/specs/2026-07-06-04e-B-liveops-design.md §2 (provider inventory) +
//             §5 (Determinism, real-time scheduling, and triggers) + §10 (error handling & degradation).
//             Decisions: docs/superpowers/specs/2026-07-06-04e-B-liveops-decisions.md.
//             REUSE pattern (registration): services/game-back/src/operational/market/lane-collapse-pricing.service.ts
//             precedent (city_sim_system.ts:302-313, MARKET_LANE_CLEARING) — a GLOBAL-table sweep registered
//             on a per-player-firing cadence, `ctx.playerId` ignored.
//             REUSE pattern (boot reconciler): services/game-back/src/operational/meta_market/meta-market-tick.service.ts
//             (OnApplicationBootstrap + registerSystem).
//             — 04e-B C4 — 2026-07-06
//
// `LiveOpsSchedulerService` — the DD-B3 real-clock reconciler: sweeps `live_ops_event_active WHERE
// status='ACTIVE' AND ends_at <= LiveOpsClockPort.now()` and reverts every overdue row through the REAL
// `LiveOpsEventService.deactivateLiveOpsEvent` (never a re-implementation of the revert path).
//
// REGISTRATION (★ see live-ops.module.ts's own C4 correction note — this DOES `registerSystem`, unlike
// C0's stale forward-guess): `LIVE_OPS_REAL_CLOCK_SWEEP` registers at MINUTE/24 (the next free MINUTE
// slot, city_sim_system.ts/city_sim_scheduler.service.ts SCHEDULE, this same commit). The MINUTE band is
// ALREADY a continuously-running, real-wall-clock-driven `setInterval` loop over every player with a
// `city_sim_clock` row (`city_sim_scheduler.service.ts:790`, independent of session/login state) — the
// exact "frequent existing tick" DD-B3/plan §C4/design §5 call for, with zero new scheduling
// infrastructure. This system is GLOBAL (like MARKET_LANE_CLEARING): `ctx.playerId` is ignored; the sweep
// scans the whole `live_ops_event_active` table regardless of which player's MINUTE firing triggered it
// (idempotent + cheap indexed query — redundant firings across N players' same real-time tick are
// harmless, matching the established precedent).
//
// BOOT RECONCILER (crash-recovery, DD-B3): `onApplicationBootstrap` ALSO runs the SAME sweep once,
// immediately, at process start — a crash could leave an ACTIVE row past its `ends_at` while the process
// was down; the MINUTE loop's own next firing could be a full interval away, and unlike an in-game
// NIGHTLY tick (whose first post-reboot firing naturally catches up because the boundary it evaluates is
// GAME time), a REAL-TIME `ends_at` boundary could already have elapsed many times over before any
// player's next MINUTE tick fires. Calling `sweepExpiredEvents()` once at bootstrap closes that gap — no
// permanent shift from a timed event survives a crash (plan §Global constraints "Revert guarantee").
//
// E-LO-09 AUTONOMOUS-EXIT (HONEST TD — TD-LO-09-autonomous-exit → TD-175, docs_int/tech_debt_inventory.md): E-LO-09 is
// the ONE event with `ends_at IS NULL` (threshold-exit, not fixed-duration — design §3.2/§5). Canon's
// intended exit is "org_stress >= exit_threshold" (`player_progression_state.org_stress`,
// `liveOpsTunables.compressionPrepExitThreshold`). The C3 audit VERIFIED (by direct grep + a real DB
// read-back, `liveops_lever_audit.spec.ts` C3-6) that `org_stress` has ZERO writers anywhere in this
// codebase (ch05 Compression Week is doc-only) — it is structurally pinned at its default (0) forever.
// The EXISTS check below is a REAL query (never fabricated) — wired so a future producer's writes would
// be picked up automatically — but it can NEVER return true today (0 < any real threshold, default 85).
// NEVER claim this as a working autonomous-exit: `liveops_lifecycle_livefire.spec.ts`'s own read-back
// assertion proves E-LO-09 does NOT auto-exit across arbitrary clock advances in B.
//
// Determinism: NO `Math.random()`, NO inline `Date.now()`/`new Date()` anywhere in this file — every
// real-time read goes through the injected `LiveOpsClockPort` (`clock.now()`).

import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { and, eq, gte, isNotNull, isNull, lte } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { Cadence, CitySystemId } from '../../citysim/scheduler/city_sim_system';
import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { liveOpsEventActive } from '../../db/schema/live_ops_event_active';
import { playerProgressionState } from '../../db/schema/player_progression_state';
import { liveOpsTunables } from './live-ops.tunables';
import { LIVE_OPS_CLOCK, type LiveOpsClockPort } from './live-ops-clock.port';
import { LiveOpsEventService } from './live-ops-event.service';

/** The MINUTE slot this reconciler registers at — the next free MINUTE slot after LEGAL_LEAK_TICK/23
 *  (city_sim_scheduler.service.ts SCHEDULE, this same commit). */
export const LIVE_OPS_REAL_CLOCK_SWEEP_ORDER = 24;

/** Result of one `sweepExpiredEvents()` call — every `live_ops_event_active.id` reverted this call
 *  (real-clock-expired + the honest E-LO-09 threshold-exit wire, empty in practice — see file header). */
export interface LiveOpsSweepResult {
  readonly revertedActiveIds: readonly string[];
}

@Injectable()
export class LiveOpsSchedulerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(LiveOpsSchedulerService.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly liveOpsEventService: LiveOpsEventService,
    @Inject(DB) private readonly db: DrizzleClient,
    @Inject(LIVE_OPS_CLOCK) private readonly clock: LiveOpsClockPort,
  ) {}

  /**
   * Registers `LIVE_OPS_REAL_CLOCK_SWEEP` at MINUTE/24 + runs the boot reconciler (crash-recovery) once,
   * immediately. Nest awaits an async `OnApplicationBootstrap` hook before the app finishes starting, so
   * the boot sweep genuinely completes before the process starts serving traffic.
   */
  async onApplicationBootstrap(): Promise<void> {
    this.scheduler.registerSystem({
      id: CitySystemId.LIVE_OPS_REAL_CLOCK_SWEEP,
      cadence: Cadence.MINUTE,
      order: LIVE_OPS_REAL_CLOCK_SWEEP_ORDER,
      // GLOBAL sweep — ctx.playerId ignored (mirrors MARKET_LANE_CLEARING's own established precedent,
      // city_sim_system.ts:302-313: a per-player-firing cadence driving a citywide/global-table scan).
      run: async () => { await this.sweepExpiredEvents(); },
    });
    this.logger.log(
      `LiveOpsSchedulerService: registered LIVE_OPS_REAL_CLOCK_SWEEP at MINUTE/${LIVE_OPS_REAL_CLOCK_SWEEP_ORDER} — ` +
      'each firing (per-player MINUTE loop, GLOBAL sweep, ctx.playerId ignored) reverts every ' +
      "live_ops_event_active row whose ends_at <= LiveOpsClockPort.now() through the real " +
      'deactivateLiveOpsEvent path. Collision-free (MINUTE/24 = next free after LEGAL_LEAK_TICK/23).',
    );

    // Boot reconciler (DD-B3 crash-recovery) — run the SAME sweep once, immediately, at startup so a
    // crash-overdue ACTIVE row never survives past its real-clock revert boundary waiting for the MINUTE
    // loop's own next firing (file header rationale).
    const bootSweep = await this.sweepExpiredEvents();
    if (bootSweep.revertedActiveIds.length > 0) {
      this.logger.warn(
        `LiveOpsSchedulerService boot reconciler: reverted ${bootSweep.revertedActiveIds.length} ` +
        `overdue-ACTIVE live_ops_event_active row(s) on startup (crash-recovery) — ` +
        `${bootSweep.revertedActiveIds.join(', ')}.`,
      );
    } else {
      this.logger.log('LiveOpsSchedulerService boot reconciler: no overdue-ACTIVE rows found at startup.');
    }
  }

  /**
   * The reconciler body — a pure function of `(persisted rows, clock.now())`. Called by the registered
   * MINUTE/24 system, by the boot reconciler above, AND directly by the gated test-only
   * `_test/liveops/run-scheduler-sweep` route (no bespoke test-only reimplementation — the exact same
   * method every trigger uses).
   *
   *   1. Real-clock expiry: every ACTIVE row with a non-null `ends_at <= clock.now()` is reverted via
   *      `LiveOpsEventService.deactivateLiveOpsEvent` (transactional child-revert + ★ parent-row
   *      transition to terminal `status='ENDED'` — DD-B4, decisions.md §2.3; NOT a DELETE anymore, the
   *      row is retained as activation history so the C5 high-impact-per-week cadence rule still counts
   *      it). This sweep's own query above is UNCHANGED — it already filters `status='ACTIVE'`, which
   *      naturally excludes `ENDED` rows, so an already-reverted row is never re-processed.
   *   2. E-LO-09 autonomous-exit (HONEST TD, file header): a real, always-empty-in-practice EXISTS
   *      check on `org_stress >= compressionPrepExitThreshold` — wired, never fabricated, proven inert.
   */
  async sweepExpiredEvents(): Promise<LiveOpsSweepResult> {
    const now = this.clock.now();
    const revertedActiveIds: string[] = [];

    const overdueTimed = await this.db
      .select({ id: liveOpsEventActive.id })
      .from(liveOpsEventActive)
      .where(and(
        eq(liveOpsEventActive.status, 'ACTIVE'),
        isNotNull(liveOpsEventActive.ends_at),
        lte(liveOpsEventActive.ends_at, now),
      ));

    for (const row of overdueTimed) {
      await this.liveOpsEventService.deactivateLiveOpsEvent(row.id);
      revertedActiveIds.push(row.id);
    }

    // ─── Scheduled events activation sweep ───
    const dueScheduled = await this.db
      .select({ id: liveOpsEventActive.id })
      .from(liveOpsEventActive)
      .where(and(
        eq(liveOpsEventActive.status, 'SCHEDULED'),
        lte(liveOpsEventActive.started_at, now),
      ));

    for (const row of dueScheduled) {
      try {
        await this.liveOpsEventService.activateScheduledLiveOpsEvent(row.id);
      } catch (err) {
        this.logger.warn(`sweepExpiredEvents: failed to activate scheduled event ${row.id}: ${err}`);
      }
    }

    // ── E-LO-09 autonomous-exit — HONEST TD (TD-LO-09-autonomous-exit → TD-175) — see file header ────────────
    // A REAL query (never fabricated): is there ANY player whose org_stress has crossed the exit
    // threshold? Given org_stress has zero writers anywhere in this codebase (C3 audit, verified by a
    // real DB read-back), this EXISTS check can never return a row today — the wire wired, not the
    // exit "working". Only E-LO-09 activations (ends_at IS NULL) are candidates.
    const exitThreshold = liveOpsTunables.compressionPrepExitThreshold;
    const anyPlayerPastExitThreshold = await this.db
      .select({ playerId: playerProgressionState.player_id })
      .from(playerProgressionState)
      .where(gte(playerProgressionState.org_stress, exitThreshold))
      .limit(1);

    if (anyPlayerPastExitThreshold.length > 0) {
      const compressionPrepActives = await this.db
        .select({ id: liveOpsEventActive.id })
        .from(liveOpsEventActive)
        .where(and(
          eq(liveOpsEventActive.status, 'ACTIVE'),
          eq(liveOpsEventActive.event_id, 'E-LO-09'),
          isNull(liveOpsEventActive.ends_at),
        ));
      for (const row of compressionPrepActives) {
        await this.liveOpsEventService.deactivateLiveOpsEvent(row.id);
        revertedActiveIds.push(row.id);
      }
    }

    return { revertedActiveIds };
  }
}
