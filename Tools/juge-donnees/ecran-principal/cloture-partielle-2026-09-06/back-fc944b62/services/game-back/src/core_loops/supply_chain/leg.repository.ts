// IMPLEMENTS: docs/superpowers/plans/2026-07-12-p3-C-supply-chain-plan.md §C2 (legs — activation +
//             accrual d'arrivée)
//             Design: docs/superpowers/specs/2026-07-12-p3-C-supply-chain-design.md §5.1 (accrual
//             formula, D5) + §10.1 (`supply_chain_legs` schema) + §15 I1/I2 (leg identity + debt bounds).
//             Decisions: §1.2 D2 (leg = logical edge (player, origin, dest), UNIQUE DB-enforced — the
//             upsert's ON CONFLICT is the SOLE arbiter of identity) + §1.6 D6 (accrual at ARRIVAL only).
//             Pattern (atomic upsert-with-ceiling-clamp): `flag-discipline.repository.ts creditToken`
//             (`LEAST(credibility_tokens + $amount, $maxTokens)`, mig 0123's `lieutenant_flag_state.
//             credibility_tokens` — the SAME deliberate floor-is-CHECK / ceiling-is-LEAST() asymmetry
//             `supply_chain_legs.debt_load` ships, mig 0125) + `corridor-debt.service.ts accrueOnDispatch`
//             (`INSERT ... ON CONFLICT DO UPDATE SET x = x + $delta` — the identity-arbiter upsert shape,
//             no cap there) + `deal-lek.repository.ts formLeks` (`ON CONFLICT DO UPDATE SET lek_score =
//             LEAST($cap, lek_score + EXCLUDED.lek_score)` — the EXCLUDED-referencing raw-SQL idiom this
//             file's `set` clause copies verbatim for the SAME reason: the increment must be read back
//             off the row Postgres is ABOUT to insert, not re-supplied as a second bind param that could
//             silently drift from the `values()` one under a hand-edit).
//             — P3-C C2 — 2026-07-12
//
// `LegRepository` — the persisted access layer for `supply_chain_legs` (Loop 5 — Mycelial Ledger).
//
// `upsertThroughput` is the ONLY writer of `debt_load`/`last_throughput_tick` this chunk (C3's decay tick
// and C4's maintenance verb add their own atomic writers later, never touching this one). It is a SINGLE
// `INSERT ... ON CONFLICT (player_id, origin_building_id, destination_building_id) DO UPDATE` statement —
// the identity-arbiter shape I1 (design §15) mandates: no read-check-then-write anywhere, so two
// concurrent arrivals on the SAME (player, origin, dest) pair can NEVER race a lost-update (the row's own
// lock serializes the second committer's `debt_load + EXCLUDED.debt_load` against the FIRST racer's
// already-committed value — the identical reasoning `deductTokenAtomic`'s header gives for its own
// single-statement conditional UPDATE).
//
// The CEILING clamp (I2's second half — the floor `>= 0` is a DB CHECK, mig 0125) is `LEAST(existing +
// increment, cap)` on BOTH branches: the fresh-row INSERT clamps its own `debt_load` value (a single
// oversized delivery must not seed a leg already over cap) via a plain JS `Math.min` (the increment/cap
// are already resolved numbers by the time this method is called — no need for a SQL LEAST() on a
// literal-vs-literal comparison, mirrors `ensureState`'s own `Math.min` precedent), and the ON CONFLICT
// branch clamps via `LEAST(debt_load + excluded.debt_load, $cap)` referencing the EXCLUDED pseudo-table
// (Postgres exposes it automatically inside any `ON CONFLICT ... DO UPDATE`, regardless of whether the
// INSERT was built via Drizzle's query builder or raw SQL) — `excluded.debt_load` is exactly the
// resolved INSERT value (`Math.min(increment, cap)`), so a normal (non-capping) increment sums EXACTLY:
// `LEAST(existing + increment, cap)` — the concurrency-floor scenario (I1, plan §C2) asserts this exact
// sum across 2 simultaneous arrivals on the same pair.

import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { supplyChainLegRow } from '../../db/schema/supply_chain_loops';
import { citySimClock } from '../../db/schema/city_sim_clock';

@Injectable()
export class LegRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * `upsertThroughput` (design §5.1, I1/I2) — the SOLE writer of leg identity + `debt_load` accrual.
   *
   * `increment`/`cap` are ALREADY resolved numbers (the caller, `LegAccrualService`, computes the D5
   * formula + reads `core_loops.mycelial_debt_cap` — this repository never reads a tunable directly, the
   * SAME "resolved-values-in, atomic-statement-out" shape `creditToken(lieutenantId, amount, maxTokens)`
   * uses).
   *
   * Returns the leg's identity + the POST-clamp `debt_load` (the row `RETURNING` reads back, whichever
   * branch — insert or conflict — won).
   */
  async upsertThroughput(
    playerId: string,
    originBuildingId: string,
    destinationBuildingId: string,
    increment: number,
    cap: number,
    gameMinute: number,
  ): Promise<{ legId: string; debtLoad: number }> {
    // The fresh-row branch's own debt_load: clamp defensively (a single delivery exceeding the cap must
    // not seed an over-cap row) — plain JS Math.min since both operands are already-resolved numbers.
    const initialDebtLoad = Math.min(increment, cap);
    const [row] = await this.db
      .insert(supplyChainLegRow)
      .values({
        player_id: playerId,
        origin_building_id: originBuildingId,
        destination_building_id: destinationBuildingId,
        debt_load: initialDebtLoad,
        last_throughput_tick: gameMinute,
      })
      .onConflictDoUpdate({
        target: [
          supplyChainLegRow.player_id,
          supplyChainLegRow.origin_building_id,
          supplyChainLegRow.destination_building_id,
        ],
        // excluded.debt_load = the resolved INSERT value above (initialDebtLoad) — Postgres exposes the
        // EXCLUDED pseudo-table automatically inside any ON CONFLICT DO UPDATE (deal-lek.repository.ts
        // formLeks precedent). The atomic arbiter: no SELECT, no read-then-write — the row's own lock
        // serializes two concurrent upserts on the SAME identity.
        set: {
          debt_load: sql`LEAST(${supplyChainLegRow.debt_load} + excluded.debt_load, ${cap})`,
          last_throughput_tick: gameMinute,
        },
      })
      .returning({ legId: supplyChainLegRow.leg_id, debtLoad: supplyChainLegRow.debt_load });
    return { legId: row!.legId, debtLoad: row!.debtLoad };
  }

  /**
   * `findLegState` (P3-C C3 `findDebtLoad` + P3-C C4 extension, design §5.3/D4 + §5.4) — the ONE read
   * `DistributionService.dispatch` makes (BEFORE the route/courier/shift INSERT tx) for a (player,
   * origin, dest) identity: `debtLoad` (`0` when no leg row exists yet — mirrors `CorridorDebtService.
   * debtFor`'s own "no row → 0" convention) AND `bypassed` (`false` when no leg row exists — a
   * never-delivered pair can never be resting). The ONE legitimate moment design §5.3 sanctions a LIVE
   * read of a leg's stress state, to compute the FROZEN `route.mycelial_transit_stress_multiplier`
   * (migration 0126) — never called from the transit tick itself (that would violate "frozen at
   * dispatch"). C4 ADDITION: `bypassed` — the SAME read now also answers the `LEG_RESTING` gate (design
   * §5.4 REROUTE_BYPASS: "dispatch sur la paire → 409 LEG_RESTING") without a second query — one leg
   * identity, one read, two consumers (the stress multiplier AND the bypass gate).
   */
  async findLegState(
    playerId: string,
    originBuildingId: string,
    destinationBuildingId: string,
  ): Promise<{ debtLoad: number; bypassed: boolean }> {
    const [row] = await this.db
      .select({ debtLoad: supplyChainLegRow.debt_load, bypassed: supplyChainLegRow.bypassed })
      .from(supplyChainLegRow)
      .where(
        and(
          eq(supplyChainLegRow.player_id, playerId),
          eq(supplyChainLegRow.origin_building_id, originBuildingId),
          eq(supplyChainLegRow.destination_building_id, destinationBuildingId),
        ),
      )
      .limit(1);
    return { debtLoad: row?.debtLoad ?? 0, bypassed: row?.bypassed ?? false };
  }

  /**
   * `getCurrentGameMinute` (P3-C C4) — the player's current in-game tick (`city_sim_clock.game_minute`),
   * the SAME concept `DistributionRepository.getCurrentTick` reads (a direct schema import here rather
   * than injecting `DistributionRepository` — that would create a module cycle, `DistributionModule`
   * already imports `SupplyChainModule`, design §2/plan §0.5 collision wall). Returns `0` when the
   * player has no clock row yet (the deterministic advance harness lazy-creates it on first advance) —
   * NOT a write, the clock row is owned by the scheduler. Used by `LegMaintenanceService.maintain` to
   * stamp `maintenance_completes_at_tick = now + duration` (design §5.4) — a player-triggered HTTP verb
   * has no `ctx.gameMinute` of its own (the SAME "no scheduler ctx" note `structural-decision-governor.
   * service.ts`'s own `emitStructuralDecisionCommitted` call makes for every LIVE structural site).
   */
  async getCurrentGameMinute(playerId: string): Promise<number> {
    const [row] = await this.db
      .select({ game_minute: citySimClock.game_minute })
      .from(citySimClock)
      .where(eq(citySimClock.player_id, playerId))
      .limit(1);
    return row?.game_minute ?? 0;
  }

  /**
   * `findNextStressedLeg` (P3-C C4, design §5.5 — the P2 chain reveal) — the player's stressed leg
   * (`debt_load > stressThreshold`) with the HIGHEST `debt_load`, EXCLUDING the leg just treated by the
   * `maintain` call this reveal rides alongside, stable-sorted (`debt_load DESC, leg_id ASC` — D13: a
   * tie in `debt_load` always resolves the SAME way, never `ORDER BY debt_load DESC` alone which Postgres
   * does not guarantee a stable secondary order for). Returns `null` when no OTHER leg is currently
   * stressed (organic no-op — the chain simply ends). Callers project this into `DebtBucket`-only
   * response fields (R2.2 — the raw `debtLoad` returned here is for THAT projection step, never
   * forwarded to the HTTP response verbatim).
   */
  async findNextStressedLeg(
    playerId: string,
    excludeLegId: string,
    stressThreshold: number,
  ): Promise<{ legId: string; originBuildingId: string; destinationBuildingId: string; debtLoad: number } | null> {
    const [row] = await this.db
      .select({
        legId: supplyChainLegRow.leg_id,
        originBuildingId: supplyChainLegRow.origin_building_id,
        destinationBuildingId: supplyChainLegRow.destination_building_id,
        debtLoad: supplyChainLegRow.debt_load,
      })
      .from(supplyChainLegRow)
      .where(
        and(
          eq(supplyChainLegRow.player_id, playerId),
          sql`${supplyChainLegRow.leg_id} != ${excludeLegId}`,
          sql`${supplyChainLegRow.debt_load} > ${stressThreshold}`,
        ),
      )
      .orderBy(desc(supplyChainLegRow.debt_load), asc(supplyChainLegRow.leg_id))
      .limit(1);
    return row ?? null;
  }

  /**
   * `completeDueMaintenanceJobs` (P3-C C4, design §5.4 — the `MYCELIAL_MAINTENANCE_ADVANCE` MINUTE/27
   * tick) — the TIMED modes' completion: ONE set-based `UPDATE ... RETURNING` across every
   * `supply_chain_legs` row this player owns whose job is due
   * (`maintenance_mode IN ('quick_patch','structural_reinforce') AND maintenance_completes_at_tick <=
   * gameMinute` — `reroute_bypass` NEVER matches this predicate, `maintenance_completes_at_tick` is
   * always NULL for it, design §10.1's 3-way CHECK; its own exit is decay-driven, see
   * `applyNightlyDecayAndStressEval` below):
   *   `quick_patch`          → `debt_load = LEAST(debt_load, quickPatchResidualDebt)` (partial clear).
   *   `structural_reinforce` → `debt_load = 0` (full clear).
   *   both                   → `maintenance_mode = NULL`, `maintenance_completes_at_tick = NULL` (the job
   *                             slot frees — I3's claim guard `WHERE maintenance_mode IS NULL` re-admits
   *                             a NEW maintain call on this leg from the very next request).
   * Mirrors `RepairRepository.completeDueRepairs`'s own "set-based completion tick, CASE WHEN per mode,
   * RETURNING for the count" shape. Organic no-op (0 rows) for a player with no due job. Returns the
   * count of legs completed this tick (the falsifiable idempotency proof: a due job completed THIS tick
   * is gone from the WHERE predicate on any later same-or-past-tick re-run).
   */
  async completeDueMaintenanceJobs(
    playerId: string,
    gameMinute: number,
    quickPatchResidualDebt: number,
  ): Promise<number> {
    const rows = await this.db
      .update(supplyChainLegRow)
      .set({
        debt_load: sql`CASE
          WHEN ${supplyChainLegRow.maintenance_mode} = 'quick_patch' THEN LEAST(${supplyChainLegRow.debt_load}, ${quickPatchResidualDebt})
          WHEN ${supplyChainLegRow.maintenance_mode} = 'structural_reinforce' THEN 0
          ELSE ${supplyChainLegRow.debt_load}
        END`,
        maintenance_mode: null,
        maintenance_completes_at_tick: null,
      })
      .where(
        and(
          eq(supplyChainLegRow.player_id, playerId),
          sql`${supplyChainLegRow.maintenance_mode} IN ('quick_patch', 'structural_reinforce')`,
          sql`${supplyChainLegRow.maintenance_completes_at_tick} <= ${gameMinute}::bigint`,
        ),
      )
      .returning({ legId: supplyChainLegRow.leg_id });
    return rows.length;
  }

  /**
   * `applyNightlyDecayAndStressEval` (P3-C C3, design §5.2/§5.3/§5.5) — the `MYCELIAL_DECAY_TICK`
   * (NIGHTLY/25) tick's ONE set-based write, across EVERY leg of this player not yet evaluated THIS
   * tick (`last_decay_eval_tick IS NULL OR last_decay_eval_tick < gameMinute` — the day-keyed
   * idempotency guard, the SAME `regenAllForPlayer`/`last_regen_game_day < gameDay` shape
   * `flag-discipline.repository.ts:411` establishes, transposed to a game-MINUTE key since decay's own
   * `idle_minutes_since_last_eval` term is inherently minute-grained, not day-grained):
   *
   *   `debt_load` — decayed ONLY when the leg is IDLE (`gameMinute - last_throughput_tick >=
   *     coolingPeriodTicks`, design §5.2): `GREATEST(0, debt_load - decayPerMinute *
   *     (gameMinute - COALESCE(last_decay_eval_tick, last_throughput_tick)))` — `idle_minutes_since_
   *     last_eval` anchors on the LAST eval if one happened, else the last real accrual (the first-ever
   *     eval decays the WHOLE idle span in one shot). A NON-idle (actively accruing) leg's `debt_load`
   *     is left UNCHANGED this tick — decay only ever applies past the cooling period.
   *   `stress_streak` — derived from the (possibly just-decayed, possibly unchanged) `debt_load` for
   *     EVERY leg this tick touches, IDLE OR NOT (design §5.5's own wording — "un leg stressed à 2
   *     évals NIGHTLY consécutives" — names no idle precondition; an ACTIVELY overused, chronically
   *     stressed leg that never goes idle is exactly the "persistent stress" case the C4 Exception
   *     producer exists for — gating streak maintenance to the idle subset would make that producer
   *     permanently unreachable for the game's most common overuse pattern). `CASE WHEN (the resultant
   *     debt_load) > stressThreshold THEN stress_streak + 1 ELSE 0 END` — a leg that decays back under
   *     the threshold THIS SAME tick does not extend its streak; never a second pass.
   *   `last_decay_eval_tick = gameMinute` for every touched leg (idle or active) — this is what makes
   *     the WHOLE tick (decay + streak together) day-keyed idempotent off ONE column: a same-`gameMinute`
   *     re-run's day-guard predicate matches ZERO rows the second time, for every leg this run touched.
   *
   * ONE statement (a `WITH ... UPDATE ... FROM` — Postgres executes it as a single atomic set-based
   * operation across the WHOLE candidate set; a plain multi-column `SET` list cannot have `stress_streak`
   * reference `debt_load`'s OWN new value — every `UPDATE`'s SET expressions see ONLY the pre-statement
   * row — so the (conditionally decayed) value is computed ONCE in the CTE and both target columns read
   * it back; never a per-row application-level loop, the T3 lesson). Organic no-op for a player with no
   * legs at all, or whose every leg was already evaluated this exact `gameMinute`.
   *
   * P3-C C4 ADDITION #1 — REROUTE_BYPASS decay ("decay naturel actif SANS cooling wait", design §5.4):
   * a `bypassed` leg's idle-gate is `bypassed OR (the normal cooling-period condition)` — a resting leg
   * decays EVERY eval regardless of how recently it last carried throughput (it cannot accrue new
   * throughput while resting — dispatch on that pair 409s `LEG_RESTING` — so "idle" is definitionally
   * true for the whole rest, and the cooling-period wait would otherwise strand it decay-less for its
   * first `coolingPeriodTicks` minutes of rest).
   *
   * P3-C C4 ADDITION #2 — REROUTE_BYPASS resume-exit (design §5.4/§6.10 sub-décision #10, state-not-
   * timer): a leg currently `bypassed` whose RESULTANT `new_debt_load <= resumeThreshold` this SAME eval
   * exits the rest — `bypassed → false`, `maintenance_mode → NULL` (the CHECK's 3-way pairing is
   * satisfied either way: NULL/NULL is the first branch). This is a JUDGMENT CALL (flagged for reviewer):
   * the design names the exit condition (`debt_load <= bypass_resume_threshold`) but not WHICH tick
   * evaluates it; decay is the ONLY thing that ever LOWERS `debt_load` for a leg that cannot accrue new
   * throughput while resting, and decay already runs NIGHTLY here — folding the exit into this SAME
   * set-based statement (rather than inventing a second bypass-only tick) keeps "the test ADVANCES THE
   * DECAY, not the clock" true or the exit is unreachable by construction.
   *
   * RETURNING now carries `origin_building_id`/`destination_building_id`/`stress_streak` (not just
   * `leg_id`) — `MycelialDecayTickService.runTick` (C4) needs the per-leg RESULTANT `stress_streak` to
   * decide which touched legs cross the `MycelialStressExceptionProducer` trigger (streak >= 2, design
   * §5.5) without a second query.
   *
   * Returns the touched-leg rows — the falsifiable idempotency proof is `rows.length === 0` on a
   * same-`gameMinute` re-run (the C3 floor's own assertion; unchanged by this richer RETURNING).
   */
  async applyNightlyDecayAndStressEval(
    playerId: string,
    gameMinute: number,
    decayPerMinute: number,
    coolingPeriodTicks: number,
    stressThreshold: number,
    resumeThreshold: number,
  ): Promise<
    Array<{
      legId: string;
      originBuildingId: string;
      destinationBuildingId: string;
      stressStreak: number;
    }>
  > {
    const result = await this.db.execute(sql`
      WITH decay_calc AS (
        SELECT
          ${supplyChainLegRow.leg_id} AS leg_id,
          CASE
            WHEN ${supplyChainLegRow.bypassed}
              OR (${gameMinute}::bigint - ${supplyChainLegRow.last_throughput_tick}) >= ${coolingPeriodTicks}::bigint
            THEN GREATEST(0, ${supplyChainLegRow.debt_load} - ${decayPerMinute}::real *
              (${gameMinute}::bigint - COALESCE(${supplyChainLegRow.last_decay_eval_tick}, ${supplyChainLegRow.last_throughput_tick}))::real)
            ELSE ${supplyChainLegRow.debt_load}
          END AS new_debt_load
        FROM ${supplyChainLegRow}
        WHERE ${supplyChainLegRow.player_id} = ${playerId}
          AND ${supplyChainLegRow.last_throughput_tick} IS NOT NULL
          AND (${supplyChainLegRow.last_decay_eval_tick} IS NULL OR ${supplyChainLegRow.last_decay_eval_tick} < ${gameMinute}::bigint)
      )
      UPDATE ${supplyChainLegRow}
      SET
        debt_load = decay_calc.new_debt_load,
        stress_streak = CASE
          WHEN decay_calc.new_debt_load > ${stressThreshold}::real THEN ${supplyChainLegRow.stress_streak} + 1
          ELSE 0
        END,
        -- C4 ADDITION #2 — the bypass resume-exit (design §5.4/§6.10): clears BOTH columns together so
        -- the 3-way CHECK's first branch (NULL/NULL) is always satisfied.
        bypassed = CASE
          WHEN ${supplyChainLegRow.bypassed} AND decay_calc.new_debt_load <= ${resumeThreshold}::real THEN false
          ELSE ${supplyChainLegRow.bypassed}
        END,
        maintenance_mode = CASE
          WHEN ${supplyChainLegRow.bypassed} AND decay_calc.new_debt_load <= ${resumeThreshold}::real THEN NULL
          ELSE ${supplyChainLegRow.maintenance_mode}
        END,
        last_decay_eval_tick = ${gameMinute}::bigint
      FROM decay_calc
      WHERE ${supplyChainLegRow.leg_id} = decay_calc.leg_id
      RETURNING
        ${supplyChainLegRow.leg_id} AS leg_id,
        ${supplyChainLegRow.origin_building_id} AS origin_building_id,
        ${supplyChainLegRow.destination_building_id} AS destination_building_id,
        ${supplyChainLegRow.stress_streak} AS stress_streak
    `);
    // Defensive dual-shape read (node-postgres driver: `.rows`; some drizzle paths return the array
    // directly) — the SAME idiom `forensic.repository.ts` establishes for a raw `db.execute` result.
    const rows =
      (result as unknown as { rows: Array<Record<string, unknown>> }).rows ??
      (result as unknown as Array<Record<string, unknown>>);
    return rows.map((r) => ({
      legId: String(r.leg_id),
      originBuildingId: String(r.origin_building_id),
      destinationBuildingId: String(r.destination_building_id),
      stressStreak: Number(r.stress_streak),
    }));
  }

  /**
   * `listLegEdges` (P3-C C5, design §4.3 — the BFS-upstream graph substrate) — EVERY leg edge
   * (origin_building_id → destination_building_id) this player owns, in ONE query. `BackpressureUpdate
   * Service`'s BFS builds its inverted adjacency from this (a node's upstream neighbors = the origins of
   * legs whose destination is that node). Read-only, no tunable, no ordering guarantee needed (the BFS
   * itself stable-sorts neighbors by building_id, D13 — see `backpressure-propagation.ts`).
   */
  async listLegEdges(playerId: string): Promise<Array<{ originBuildingId: string; destinationBuildingId: string }>> {
    const rows = await this.db
      .select({
        originBuildingId: supplyChainLegRow.origin_building_id,
        destinationBuildingId: supplyChainLegRow.destination_building_id,
      })
      .from(supplyChainLegRow)
      .where(eq(supplyChainLegRow.player_id, playerId));
    return rows;
  }

  /**
   * `findById` (P3-C C9, design §14 — the BO force-endpoints' existence/ownership read) — a leg row by
   * its `leg_id` ALONE (no `player_id` known ahead of time — the admin route is `POST /admin/legs/:id/
   * force-stress`, `:id` = `leg_id`; the owning player is resolved FROM this read, mirroring
   * `MaintenanceAdminController.forceFailure`'s own "read the row first, resolve `player_id` off it"
   * shape). `null` = no such leg (caller 404s).
   */
  async findById(legId: string): Promise<{ legId: string; playerId: string; debtLoad: number } | null> {
    const [row] = await this.db
      .select({ legId: supplyChainLegRow.leg_id, playerId: supplyChainLegRow.player_id, debtLoad: supplyChainLegRow.debt_load })
      .from(supplyChainLegRow)
      .where(eq(supplyChainLegRow.leg_id, legId))
      .limit(1);
    return row ?? null;
  }

  /**
   * `forceDebtLoad` (P3-C C9, design §14 — the BO `POST /admin/legs/:id/force-stress` live-ops force) —
   * an ADMIN OVERRIDE write, a single-column poke (mirrors `SupplyNodePressureRepository.forceSet`'s own
   * "direct admin override, bypass the normal accrual pipeline" shape) — `debt_load` is clamped to
   * `[0, cap]` by the CALLER (the admin controller) before this method ever sees it. Does NOT touch
   * `last_throughput_tick`/`last_decay_eval_tick` (the leg already carries a real one from its prior
   * organic throughput — this is a force-ONE-column poke, not a re-seed). `null` = no such leg (0 rows).
   */
  async forceDebtLoad(legId: string, debtLoad: number): Promise<{ legId: string; playerId: string; debtLoad: number } | null> {
    const [row] = await this.db
      .update(supplyChainLegRow)
      .set({ debt_load: debtLoad })
      .where(eq(supplyChainLegRow.leg_id, legId))
      .returning({ legId: supplyChainLegRow.leg_id, playerId: supplyChainLegRow.player_id, debtLoad: supplyChainLegRow.debt_load });
    return row ?? null;
  }

  /**
   * `listLegsForPlayer` (P3-C C9, design §13 — the graph view's leg substrate) — EVERY
   * `supply_chain_legs` row this player owns, RAW (`debtLoad`/`bypassed`/`legId`/origin/destination).
   * TWO consumers with different R2.2 postures over the SAME read: (1) `SupplyChainGraphService`
   * (player-facing) derives `DebtBucket` from `debtLoad` and returns ONLY the bucket + refs (R2.2 wall,
   * §13); (2) `SupplyChainAdminController`'s BO snapshot (P5 BO inversion, `gm`) returns `debtLoad` RAW
   * alongside the SAME bucket — the deliberate BO-only inversion of that same wall (mirrors
   * `SupplyNodePressureRepository.readAllRaw`'s own "C6/C9 build the bucket-only PRODUCTION reads" note).
   * Read-only, no tunable, no ordering guarantee needed (both callers stable-sort if they need to, D13).
   */
  async listLegsForPlayer(playerId: string): Promise<
    Array<{
      legId: string;
      originBuildingId: string;
      destinationBuildingId: string;
      debtLoad: number;
      bypassed: boolean;
      stressStreak: number;
      maintenanceMode: string | null;
      maintenanceCompletesAtTick: number | null;
    }>
  > {
    const rows = await this.db
      .select({
        legId: supplyChainLegRow.leg_id,
        originBuildingId: supplyChainLegRow.origin_building_id,
        destinationBuildingId: supplyChainLegRow.destination_building_id,
        debtLoad: supplyChainLegRow.debt_load,
        bypassed: supplyChainLegRow.bypassed,
        stressStreak: supplyChainLegRow.stress_streak,
        maintenanceMode: supplyChainLegRow.maintenance_mode,
        maintenanceCompletesAtTick: supplyChainLegRow.maintenance_completes_at_tick,
      })
      .from(supplyChainLegRow)
      .where(eq(supplyChainLegRow.player_id, playerId));
    return rows;
  }

  /**
   * `listStressedLegOrigins` (P3-C C5, design §6.1/§8.3 — the `LEG_STRESSED_ORIGIN` detector's substrate)
   * — every CURRENTLY stressed leg (`debt_load > stressThreshold`, the SAME strict `>` derivation
   * `isStressed`/`mycelial-stress.ts` exports, expressed here as a set-based SQL predicate, T3) this
   * player owns, with its origin_building_id (the blocked node — design §8.3). Read-only.
   */
  async listStressedLegOrigins(
    playerId: string,
    stressThreshold: number,
  ): Promise<Array<{ legId: string; originBuildingId: string; debtLoad: number }>> {
    const rows = await this.db
      .select({
        legId: supplyChainLegRow.leg_id,
        originBuildingId: supplyChainLegRow.origin_building_id,
        debtLoad: supplyChainLegRow.debt_load,
      })
      .from(supplyChainLegRow)
      .where(
        and(
          eq(supplyChainLegRow.player_id, playerId),
          sql`${supplyChainLegRow.debt_load} > ${stressThreshold}`,
        ),
      );
    return rows;
  }
}
