// IMPLEMENTS: docs/superpowers/plans/2026-07-05-04e-A2-political-events-plan.md C2 (calendar-state
//             idempotency claim + active-event ledger reads/writes)
//             Design: docs/superpowers/specs/2026-07-05-04e-A2-political-events-decisions.md §3
//             Row-lock idiom REUSE: services/game-back/src/operational/money_holding/money-holding.repository.ts
//             (`.select(...).for('update')` inside `db.transaction`, the established codebase pattern for an
//             atomic read-then-conditional-write claim).
//             — 04e-A2 C2 — 2026-07-05
//
// `PoliticalEventRepository` — the DB access layer for `political-calendar-tick.service.ts` (C2). Owns 2
// concerns:
//
//   1. The `political_calendar_state` singleton row (migration 0111): `claimGameDay` is the ATOMIC
//      idempotency gate — a `SELECT ... FOR UPDATE` row lock + conditional `UPDATE` inside one
//      transaction, so two firings for the SAME (or an earlier) game-day never both "win" the claim,
//      even when they race (the city-sim engine is per-player-clocked — every player's NIGHTLY firing
//      calls this on the SAME city-global row, design §5.2 / canon invariant #5). This is the SAME
//      row-lock idiom `MoneyHoldingRepository.settleYield` already uses (`.for('update')`), not a
//      bespoke concurrency primitive.
//
//   2. `political_event_active` reads/writes needed to activate a calendar-triggered event and to
//      enforce the `overlap_max_active` gate (decisions §4.3, RULED: permanents count toward the cap).
//      `political_event_active` is a LEDGER (rows persist past expiry — the read-service, C8, will
//      surface "recently-ended" from the SAME table) — "currently active" is a QUERY FILTER
//      (`expires_at_game_day IS NULL OR expires_at_game_day > gameDay`), never a DELETE. Deleting rows
//      on expiry is NOT this repository's job: `EffectModifierService.revertExpired` (A1, C4) already
//      owns reverting the `effect_modifier` rows (the actual overlay), and `political_event_active`
//      itself is the historical record, read-filtered by day.

import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, gt, isNotNull, isNull, lte, or, sql } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { politicalCalendarState } from '../../db/schema/political_calendar_state';
import { politicalEventActive } from '../../db/schema/effect_modifier';
import { rivalEliminationLedger } from '../../db/schema/rival_elimination_ledger';
import type { RivalKey } from '../conflict/rival/rival-ai.types';
import { politicalDistrictSignalState } from '../../db/schema/political_district_signal_state';
import { rivalState } from '../../db/schema/conflict_rival';
import { districtCohesion } from '../../db/schema/city_state';
import { districtCapacityState } from '../../db/schema/market_district_capacity_state';
import { districts } from '../../db/schema/world_geography';
import type { PoliticalEventCategoryVal } from './political.types';
import type { RivalRegimeVal } from './political-trigger-evaluators';

/** Result of an idempotency claim attempt for one game-day (see `claimGameDay`). */
export interface CalendarClaimResult {
  /** `true` iff THIS call won the claim (no other call has evaluated this day or a later one yet). */
  readonly claimed: boolean;
  /**
   * The watermark's value BEFORE this claim (captured under the same row lock, before any UPDATE).
   * `null` on the very first-ever claim (the tick's bootstrap case — see
   * `political-calendar-tick.service.ts`'s own doc comment for why the bootstrap tick fires no trigger).
   */
  readonly previousGameDay: number | null;
}

/** Read-back shape for `readCalendarState` (test-route / diagnostic use). */
export interface CalendarStateSnapshot {
  readonly lastEvaluatedGameDay: number | null;
  readonly scandalNoiseAccumulator: number;
}

/**
 * One `political_event_active` ledger row, narrowed to the 2 fields the C8 read-service needs
 * (`listCurrentlyActive` / `listRecentlyEnded`) — the row's `id`/`activated_at_game_day`/
 * `expires_at_game_day` stay internal (never surfaced to the player DTO, R2.2 grep-zero).
 */
export interface ActiveEventLedgerRow {
  readonly eventId: string;
  readonly category: PoliticalEventCategoryVal;
}

/** Fixed PK of the `political_calendar_state` singleton row (migration 0111, seeded at migration time). */
const SINGLETON_ID = 1;

@Injectable()
export class PoliticalEventRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * Atomically claim `gameDay` for evaluation. Wins the claim iff the singleton's
   * `last_evaluated_game_day` is NULL or strictly less than `gameDay` — a stale/duplicate/lagging
   * caller (a slower player's NIGHTLY firing landing on a day already evaluated, or the SAME day
   * evaluated twice) loses the claim and does no write. `SELECT ... FOR UPDATE` inside the transaction
   * serializes concurrent callers on the SAME row: whichever call's `SELECT` acquires the lock first
   * decides for both (the second call blocks until the first commits, then re-reads the NEW value and
   * correctly loses the claim if the first call already advanced the watermark).
   */
  async claimGameDay(gameDay: number): Promise<CalendarClaimResult> {
    return this.db.transaction(async (tx) => {
      const rows = await tx
        .select({ last_evaluated_game_day: politicalCalendarState.last_evaluated_game_day })
        .from(politicalCalendarState)
        .where(eq(politicalCalendarState.id, SINGLETON_ID))
        .for('update')
        .limit(1);
      const previousGameDay = rows[0]?.last_evaluated_game_day ?? null;

      if (previousGameDay !== null && previousGameDay >= gameDay) {
        return { claimed: false, previousGameDay };
      }

      await tx
        .update(politicalCalendarState)
        .set({ last_evaluated_game_day: gameDay })
        .where(eq(politicalCalendarState.id, SINGLETON_ID));

      return { claimed: true, previousGameDay };
    });
  }

  /** Read-back the singleton row as-is (test route / diagnostics — no claim, no lock). */
  async readCalendarState(): Promise<CalendarStateSnapshot> {
    const rows = await this.db
      .select({
        last_evaluated_game_day: politicalCalendarState.last_evaluated_game_day,
        scandal_noise_accumulator: politicalCalendarState.scandal_noise_accumulator,
      })
      .from(politicalCalendarState)
      .where(eq(politicalCalendarState.id, SINGLETON_ID))
      .limit(1);
    const row = rows[0];
    return {
      lastEvaluatedGameDay: row?.last_evaluated_game_day ?? null,
      scandalNoiseAccumulator: row ? Number(row.scandal_noise_accumulator) : 0,
    };
  }

  /**
   * Count `political_event_active` rows that are CURRENTLY ACTIVE as of `gameDay` — the
   * `overlap_max_active` gate's denominator (decisions §4.3, RULED: permanents, `expires_at_game_day IS
   * NULL`, count toward the cap; a timed row counts while `expires_at_game_day > gameDay`, i.e. the
   * half-open `[activated_at_game_day, expires_at_game_day)` interval, matching
   * `EffectModifierService.revertExpired`'s own `<= gameDay` expiry boundary).
   */
  async countCurrentlyActive(gameDay: number): Promise<number> {
    const res = await this.db
      .select({ cnt: sql<number>`count(*)` })
      .from(politicalEventActive)
      .where(
        or(
          isNull(politicalEventActive.expires_at_game_day),
          gt(politicalEventActive.expires_at_game_day, gameDay),
        ),
      );
    return Number(res[0]?.cnt ?? 0);
  }

  /**
   * List every `political_event_active` row CURRENTLY ACTIVE as of `gameDay` — the C8 read-service's
   * "active" bucket (mirrors `countCurrentlyActive`'s active-interval filter, `expires_at_game_day IS
   * NULL OR expires_at_game_day > gameDay`, returning `{eventId, category}` rows instead of a count).
   * `category` is returned for parity with the ledger row shape even though C8 currently re-derives
   * full event detail from the static catalogue by `eventId` (`getPoliticalEventById`) — the ledger's
   * OWN `category` snapshot stays available for a caller that wants to group without touching the
   * catalogue.
   */
  async listCurrentlyActive(gameDay: number): Promise<ActiveEventLedgerRow[]> {
    const rows = await this.db
      .select({ event_id: politicalEventActive.event_id, category: politicalEventActive.category })
      .from(politicalEventActive)
      .where(
        or(
          isNull(politicalEventActive.expires_at_game_day),
          gt(politicalEventActive.expires_at_game_day, gameDay),
        ),
      );
    return rows.map((row) => ({ eventId: row.event_id, category: row.category }));
  }

  /**
   * List every `political_event_active` row that ENDED within the last `windowDays` in-game days as of
   * `gameDay` — the C8 read-service's "recently ended" bucket (catalogue.md :182, "Recent ended events
   * (last 30 game-days)"). The half-open window `(gameDay - windowDays, gameDay]` mirrors
   * `countCurrentlyActive`'s own half-open active-interval discipline. A row qualifies only when its
   * `expires_at_game_day` is NOT NULL (a PERMANENT row with NULL expiry never "ends" on its own — it only
   * gets a NON-NULL expiry stamp via `markEventActiveExpired`/`revertPermanentUntilElection`, at which
   * point it correctly starts satisfying this filter too) AND that expiry has already passed (`<= gameDay`)
   * but not so long ago that it falls outside the window (`> gameDay - windowDays`).
   */
  async listRecentlyEnded(gameDay: number, windowDays: number): Promise<ActiveEventLedgerRow[]> {
    const rows = await this.db
      .select({ event_id: politicalEventActive.event_id, category: politicalEventActive.category })
      .from(politicalEventActive)
      .where(
        and(
          isNotNull(politicalEventActive.expires_at_game_day),
          lte(politicalEventActive.expires_at_game_day, gameDay),
          gt(politicalEventActive.expires_at_game_day, gameDay - windowDays),
        ),
      );
    return rows.map((row) => ({ eventId: row.event_id, category: row.category }));
  }

  /**
   * Is `eventId` CURRENTLY ACTIVE as of `gameDay` (mirrors `countCurrentlyActive`'s active-interval
   * definition — `expires_at_game_day IS NULL OR expires_at_game_day > gameDay` — narrowed to ONE event
   * id). C4 uses this to guard a PERMANENT event (E-POL-04, null expiry — no natural expiry sweep would
   * ever stop a same-day/every-day re-roll from stacking duplicate modifiers) and E-POL-06 (guard against
   * re-chaining while already active) against double-activation.
   */
  async isEventCurrentlyActive(eventId: string, gameDay: number): Promise<boolean> {
    const res = await this.db
      .select({ cnt: sql<number>`count(*)` })
      .from(politicalEventActive)
      .where(
        and(
          eq(politicalEventActive.event_id, eventId),
          or(
            isNull(politicalEventActive.expires_at_game_day),
            gt(politicalEventActive.expires_at_game_day, gameDay),
          ),
        ),
      );
    return Number(res[0]?.cnt ?? 0) > 0;
  }

  /**
   * Was ANY `political_event_active` row of `category` activated EXACTLY on `gameDay` — E-POL-06's
   * "after major scandal" real-state read (the deterministic half of its OR trigger,
   * `evaluateAfterScandalTrigger`, `political-trigger-evaluators.ts`). Category-generic (not
   * E-POL-09-specific): whichever chunk's trigger source inserts a SCANDAL-category activation on this
   * gameDay makes this read true, same-day.
   */
  async wasCategoryActivatedToday(category: PoliticalEventCategoryVal, gameDay: number): Promise<boolean> {
    const res = await this.db
      .select({ cnt: sql<number>`count(*)` })
      .from(politicalEventActive)
      .where(
        and(
          eq(politicalEventActive.category, category),
          eq(politicalEventActive.activated_at_game_day, gameDay),
        ),
      );
    return Number(res[0]?.cnt ?? 0) > 0;
  }

  /**
   * INSERT a new `political_event_active` ledger row for a just-activated event. Returns the new row's
   * `id` — the FK `EffectModifierService.applyEvent` needs as `activeEventId` for the batch of
   * `effect_modifier` rows this activation applies.
   */
  async insertActiveEvent(
    eventId: string,
    category: PoliticalEventCategoryVal,
    activatedAtGameDay: number,
    expiresAtGameDay: number | null,
  ): Promise<string> {
    const [row] = await this.db
      .insert(politicalEventActive)
      .values({
        event_id: eventId,
        category,
        activated_at_game_day: activatedAtGameDay,
        expires_at_game_day: expiresAtGameDay,
      })
      .returning({ id: politicalEventActive.id });
    return row.id;
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // C6 — opposition-victory-at-electoral-end + permanent-until-election lifecycle (plan §C6)
  // ═══════════════════════════════════════════════════════════════════════════════════════════

  /**
   * Did `eventId`'s OWN `political_event_active` row expire EXACTLY on `gameDay` — E-POL-10's
   * "at electoral end" real-state read (`evaluateOppositionVictoryRoll`'s production trigger,
   * `political-calendar-tick.service.ts`). Mirrors `wasCategoryActivatedToday`'s exact-same-day
   * discipline, narrowed to ONE event id (not category-generic) — E-POL-01 is the only ELECTORAL-
   * category member canon-wide, so id-narrowing and category-narrowing are equivalent here; id-narrowing
   * is used because the caller (E-POL-10) cares specifically about E-POL-01 ending, not "any electoral
   * event." `expires_at_game_day` is set once at `insertActiveEvent` time and never changes for a TIMED
   * row (only a PERMANENT row's NULL expiry ever gets stamped later, `markEventActiveExpired` below) —
   * this is therefore an exact, stable, deterministic read.
   */
  async wasEventExpiringToday(eventId: string, gameDay: number): Promise<boolean> {
    const res = await this.db
      .select({ cnt: sql<number>`count(*)` })
      .from(politicalEventActive)
      .where(
        and(
          eq(politicalEventActive.event_id, eventId),
          eq(politicalEventActive.expires_at_game_day, gameDay),
        ),
      );
    return Number(res[0]?.cnt ?? 0) > 0;
  }

  /**
   * Find the `political_event_active.id` for `eventId` that is CURRENTLY ACTIVE as of `gameDay` — mirrors
   * `isEventCurrentlyActive`'s exact active-interval filter (`expires_at_game_day IS NULL OR
   * expires_at_game_day > gameDay`), returning the row id instead of a boolean. Used by (a) the
   * permanent-until-election revert (`political-calendar-tick.service.ts`'s C6 election-boundary logic)
   * to locate WHICH activation to revert, and (b) the opposition-victory roll's double-activation guard
   * (never re-activate E-POL-10 while one is already live). `null` if no currently-active row exists.
   * `ORDER BY activated_at_game_day DESC LIMIT 1` is a defensive tie-break — the double-activation guards
   * elsewhere mean at most one row should ever satisfy this filter for a given `eventId` at a time.
   */
  async findLiveActiveEventId(eventId: string, gameDay: number): Promise<string | null> {
    const rows = await this.db
      .select({ id: politicalEventActive.id })
      .from(politicalEventActive)
      .where(
        and(
          eq(politicalEventActive.event_id, eventId),
          or(
            isNull(politicalEventActive.expires_at_game_day),
            gt(politicalEventActive.expires_at_game_day, gameDay),
          ),
        ),
      )
      .orderBy(desc(politicalEventActive.activated_at_game_day))
      .limit(1);
    return rows[0]?.id ?? null;
  }

  /**
   * Stamp `political_event_active.expires_at_game_day = expiresAtGameDay` for `activeEventId` — the
   * permanent-until-election revert (C6, `PoliticalEventLifecycleService.revertPermanentUntilElection`).
   * The ledger row is NEVER deleted (design principle, file header) but a PERMANENT event's row keeps
   * `expires_at_game_day` NULL forever UNLESS explicitly reverted — this stamp is the ONLY way the shared
   * active-interval filter (`isEventCurrentlyActive` / `countCurrentlyActive` / `findLiveActiveEventId`,
   * all `expires_at_game_day IS NULL OR > gameDay`) correctly excludes a reverted permanent from THIS day
   * forward (and is what will let a future C8 "recently-ended" read distinguish a genuinely-reverted
   * permanent from one still live). Called ONLY by `revertPermanentUntilElection` — never by the generic
   * `deactivate` (a TIMED event's ledger row already carries its real expiry from insertion time;
   * overwriting it here would be wrong). NOT yet wired for E-POL-04/E-POL-07's OWN "explicit BO abort"
   * revert path (BO lands at C9) — see TD-163 (`docs_int/tech_debt_inventory.md`): C9's BO abort should
   * reuse this SAME stamp (or `revertPermanentUntilElection` generically) or it will inherit the identical
   * forever-counts-toward-the-cap gap this method fixes for E-POL-10/E-POL-12.
   */
  async markEventActiveExpired(activeEventId: string, expiresAtGameDay: number): Promise<void> {
    await this.db
      .update(politicalEventActive)
      .set({ expires_at_game_day: expiresAtGameDay })
      .where(eq(politicalEventActive.id, activeEventId));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // C3 — state-driven trigger evaluator state reads/writes (plan §C3, design §5.3/§6.2/§6.4)
  // ═══════════════════════════════════════════════════════════════════════════════════════════

  // ─── E-POL-05 — rival regime (REAL read of the EXISTING `rival_state` table, 04b-A mig 0081) ──

  /** Read the REAL persisted `rival_state.regime` for a (player, rival) pair. `null` if no row
   *  exists yet (the rival was never `ensurePlayerRivals`-seeded for this player). */
  async readRivalRegime(playerId: string, rivalKeyParam: RivalKey): Promise<RivalRegimeVal | null> {
    const rows = await this.db
      .select({ regime: rivalState.regime })
      .from(rivalState)
      .where(and(eq(rivalState.player_id, playerId), eq(rivalState.rival_key, rivalKeyParam)))
      .limit(1);
    return (rows[0]?.regime as RivalRegimeVal | undefined) ?? null;
  }

  // ─── E-POL-09 — scandal-noise accumulator (REAL write to `political_calendar_state`, mig 0111) ─

  /**
   * Atomically ADD `amount` to the city-global `political_calendar_state.scandal_noise_accumulator`
   * (mig 0111 created the column; C2 never touched it — this is the C3 consumer the mig 0111
   * comment forward-referenced). Returns the NEW accumulator value. `amount` is the caller's
   * (C4/C5's real noise-source wiring, or a test route's) chosen increment — never a fabricated
   * fixed value baked in here.
   */
  async incrementScandalNoise(amount: number): Promise<number> {
    const rows = await this.db
      .update(politicalCalendarState)
      .set({ scandal_noise_accumulator: sql`${politicalCalendarState.scandal_noise_accumulator} + ${amount}` })
      .where(eq(politicalCalendarState.id, SINGLETON_ID))
      .returning({ scandal_noise_accumulator: politicalCalendarState.scandal_noise_accumulator });
    return Number(rows[0]?.scandal_noise_accumulator ?? 0);
  }

  // ─── E-POL-11a — rival_elimination_ledger (REAL bus-subscriber write + rolling-window read) ────

  /**
   * INSERT one `rival_elimination_ledger` row (migration 0112). The ONLY writer is
   * `political-rival-elimination-ledger.service.ts`'s `onModuleInit` bus subscriber, on a REAL
   * `RivalEliminatedEvent` (never a synthetic/direct test write). Append-only — a ledger, not an
   * upsert.
   */
  async insertRivalElimination(
    playerId: string,
    rivalKeyParam: RivalKey,
    gameMinute: number,
    compoundingPenaltyBucket: string,
  ): Promise<void> {
    await this.db.insert(rivalEliminationLedger).values({
      player_id: playerId,
      rival_key: rivalKeyParam,
      game_minute: gameMinute,
      compounding_penalty_bucket: compoundingPenaltyBucket,
    });
  }

  /**
   * Count `rival_elimination_ledger` rows for `playerId` within the rolling window
   * `(gameMinuteNow - windowMinutes, gameMinuteNow]` — the E-POL-11 "2+ rival eliminations in past 6
   * months" predicate input (`evaluateFederalTaskForceTrigger`,
   * `political-trigger-evaluators.ts`). `windowMinutes` is the caller's
   * `politicalEventsTunables.monthMinutes * FEDERAL_TASK_FORCE_ELIMINATION_WINDOW_MONTHS` (REUSED
   * getter, no new tunable).
   */
  async countRivalEliminationsInWindow(
    playerId: string,
    gameMinuteNow: number,
    windowMinutes: number,
  ): Promise<number> {
    const res = await this.db
      .select({ cnt: sql<number>`count(*)` })
      .from(rivalEliminationLedger)
      .where(
        and(
          eq(rivalEliminationLedger.player_id, playerId),
          gt(rivalEliminationLedger.game_minute, gameMinuteNow - windowMinutes),
          sql`${rivalEliminationLedger.game_minute} <= ${gameMinuteNow}`,
        ),
      );
    return Number(res[0]?.cnt ?? 0);
  }

  // ─── E-POL-12 — political_district_signal_state (REAL per-district window accumulator, mig 0113) ─

  /** Read-back for the district-signal window (test route / diagnostic use). */
  async readDistrictSignalState(districtId: number): Promise<DistrictSignalSnapshot> {
    const rows = await this.db
      .select({
        consecutive_good_days: politicalDistrictSignalState.consecutive_good_days,
        last_evaluated_game_day: politicalDistrictSignalState.last_evaluated_game_day,
      })
      .from(politicalDistrictSignalState)
      .where(eq(politicalDistrictSignalState.district_id, districtId))
      .limit(1);
    const row = rows[0];
    return {
      consecutiveGoodDays: row?.consecutive_good_days ?? 0,
      lastEvaluatedGameDay: row?.last_evaluated_game_day ?? null,
    };
  }

  /**
   * Advance district `districtId`'s sustained-good-behavior streak for `gameDay` (migration 0113).
   * Day-idempotent (mirrors `claimGameDay`'s row-lock discipline): a `SELECT ... FOR UPDATE` +
   * conditional `UPDATE`, lazily `INSERT`ing the row on first-ever evaluation
   * (`ensureDistrictSignalRow`). Re-entrant calls for the SAME (or an earlier) `gameDay` are
   * no-ops (the streak is NOT re-incremented/re-reset) — safe regardless of how many callers'
   * NIGHTLY firings land on the same in-game day (the C4/C5 cross-player wiring decision, file
   * header of `db/schema/political_district_signal_state.ts`). Returns the POST-advance streak.
   */
  async advanceDistrictSignalDay(
    districtId: number,
    gameDay: number,
    isGoodToday: boolean,
  ): Promise<DistrictSignalSnapshot> {
    return this.db.transaction(async (tx) => {
      await tx
        .insert(politicalDistrictSignalState)
        .values({ district_id: districtId })
        .onConflictDoNothing();

      const rows = await tx
        .select({
          consecutive_good_days: politicalDistrictSignalState.consecutive_good_days,
          last_evaluated_game_day: politicalDistrictSignalState.last_evaluated_game_day,
        })
        .from(politicalDistrictSignalState)
        .where(eq(politicalDistrictSignalState.district_id, districtId))
        .for('update');
      const current = rows[0];
      const previousGameDay = current?.last_evaluated_game_day ?? null;

      if (previousGameDay !== null && previousGameDay >= gameDay) {
        // Stale/duplicate claim (same or earlier day already evaluated) — pure no-op.
        return {
          consecutiveGoodDays: current?.consecutive_good_days ?? 0,
          lastEvaluatedGameDay: previousGameDay,
        };
      }

      const nextStreak = isGoodToday ? (current?.consecutive_good_days ?? 0) + 1 : 0;
      await tx
        .update(politicalDistrictSignalState)
        .set({ consecutive_good_days: nextStreak, last_evaluated_game_day: gameDay, updated_at: new Date() })
        .where(eq(politicalDistrictSignalState.district_id, districtId));

      return { consecutiveGoodDays: nextStreak, lastEvaluatedGameDay: gameDay };
    });
  }

  // ─── E-POL-12 — district cohesion (REAL read of the EXISTING `district_cohesion` table) ────────

  /** Read the REAL persisted `district_cohesion.cohesion` for a (player, district) pair. `null` if
   *  no row exists yet (the district was never lazily seeded for this player,
   *  `CohesionPermafrostRepository.seedDistricts`). */
  async readDistrictCohesion(playerId: string, districtId: number): Promise<number | null> {
    const rows = await this.db
      .select({ cohesion: districtCohesion.cohesion })
      .from(districtCohesion)
      .where(and(eq(districtCohesion.player_id, playerId), eq(districtCohesion.district_id, districtId)))
      .limit(1);
    return rows[0]?.cohesion ?? null;
  }

  // ─── E-POL-07 — Stack district utilization (REAL read of `district_capacity_state` JOIN `districts`) ─

  /**
   * Read the REAL `district_capacity_state` utilization percentage (`100 * q_total / k_current`) for
   * every `districts.profile = 'stack'` district (the E-POL-07 predicate input,
   * `evaluateStackUtilizationSustained`, `political-trigger-evaluators.ts`). `k_current` is guarded
   * against 0 (mirrors `carrying-capacity-haze.service.ts`'s own 0.001 λ-division-by-zero guard) —
   * a Stack district with `k_current = 0` reads as `0%` utilization rather than throwing/Infinity.
   */
  async readStackDistrictUtilization(): Promise<ReadonlyArray<{ districtId: number; utilizationPct: number }>> {
    const rows = await this.db
      .select({
        district_id: districtCapacityState.district_id,
        q_total: districtCapacityState.q_total,
        k_current: districtCapacityState.k_current,
      })
      .from(districtCapacityState)
      .innerJoin(districts, eq(districts.id, districtCapacityState.district_id))
      .where(eq(districts.profile, 'stack'));

    return rows.map((row) => ({
      districtId: row.district_id,
      utilizationPct: row.k_current > 0.001 ? (100 * row.q_total) / row.k_current : 0,
    }));
  }

  // ─── E-POL-12 — district enumeration (REAL read of the GLOBAL static `districts` table) ────────

  /**
   * List every GLOBAL district id (`world_geography.districts`, 18 static seeded rows — mirrors
   * `WorldGeographyRepository.listDistricts`'s own read, narrowed to just the id column since the
   * caller only needs the enumeration). C10 addendum: `political-calendar-tick.service.ts`'s newly
   * autonomous E-POL-12 sweep uses this to walk every district each NIGHTLY tick (ascending id — the
   * FIRST district to cross its sustained-window this tick wins the single "sympathetic district
   * representative" slot, `hasSustainedGoodBehavior`'s own doc). Read-only, static geography (never
   * player-scoped, never written by app_rw).
   */
  async listAllDistrictIds(): Promise<number[]> {
    const rows = await this.db.select({ id: districts.id }).from(districts).orderBy(asc(districts.id));
    return rows.map((row) => row.id);
  }
}

/** Read-back shape for the E-POL-12 district-signal window (`readDistrictSignalState` /
 *  `advanceDistrictSignalDay`). */
export interface DistrictSignalSnapshot {
  readonly consecutiveGoodDays: number;
  readonly lastEvaluatedGameDay: number | null;
}
