// IMPLEMENTS: docs/tech/09_data_model/schema_operational_chain.md §7.21 (the maintenance/decay columns —
//             building_operational_state.last_maintained_at_game_day / maintenance_due_in_days /
//             maintenance_completes_at_day / lapse_phase, mig 0119)
//             Design: docs/superpowers/specs/2026-07-10-04f-A-maintenance-design.md §4 (Phase-progression
//             engine — the NIGHTLY/21 tick's batched read + write-only-on-change persistence + D13 job
//             completion) + §9 (Player actions — the guarded-debit + arm-job transaction, D10/D13)
//             Pattern: services/game-back/src/operational/real_estate/real-estate.repository.ts
//             (`applySetupBatch` — the `UPDATE ... FROM (VALUES …)` batched-write template this file's
//             `persistPhaseTransitions` mirrors verbatim; `debitAndCreateOperationalState` — the guarded-debit
//             transaction `debitAndArmSchedule`/`debitTotalAndArmBatch` REUSE verbatim) +
//             services/game-back/src/operational/enforcement/repair.repository.ts (`debitAndArmRepair` — the
//             SAME "guarded debit, then a state-guarded arm UPDATE, both in one tx" shape)
//             — 04f-A C2 — 2026-07-10 | C3 extension — 2026-07-10 (schedule/mass-schedule guarded-debit +
//             arm-job reads/writes)
//
// `MaintenanceRepository` — the persisted access layer for the D1 phase-progression engine (C2) + the C3
// player schedule/mass-schedule actions. Copies the persisted-system repository template (ProductionRepository
// / GrowRepository): a thin `*.repository.ts` owning the raw Drizzle reads/writes with EXPLICIT column lists.
// NO schema change (C1 landed the 3 columns + 2 enums this file reads/writes).
//
// BATCHED WRITES (the determinism template): `listOperationalBuildingsForPhaseTick` reads ALL of a player's
// OPERATIONAL buildings in ONE query; `persistPhaseTransitions` writes ONLY the buildings whose derived
// phase changed THIS tick in ONE set-based `UPDATE ... FROM (VALUES …)` (never a per-row await loop);
// `completeArmedJobs` is a single WHERE-scoped `UPDATE ... RETURNING`. `getScheduleTargetStatesBatch` reads a
// SET of buildings in ONE query (the `getAnchorsForBuildings` precedent); `debitTotalAndArmBatch` performs
// ONE guarded debit of the SUM of costs, then ONE set-based arm UPDATE (the mass-schedule all-or-nothing
// atomicity — a single guarded UPDATE is inherently atomic; no per-building debit-then-maybe-rollback loop).
// All values are PARAMETERIZED bind params (no string interpolation).

import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { buildingOperationalState, equipmentFailureLog } from '../../db/schema/operational_chain';
import { citySimClock } from '../../db/schema/city_sim_clock';
import { economyState } from '../../db/schema/player_economy_state';
import { citySimTunables } from '../../citysim/citysim-tunables';
// REUSE the SAME game-day derivation the phase tick / ConversionSetupService / the test controller all use —
// so a C3-armed job's completion day never drifts from the shared convention.
import { deriveGameDay } from '../political/political-trigger-evaluators';
import type { CoverQuality, M1OperationalType } from '../real_estate/conversion-tunables';
import type { LapsePhase } from './maintenance-phase.service';

/** One OPERATIONAL building's maintenance-anchor row (the MAINTENANCE_PHASE_TICK batch input). */
export interface OperationalBuildingMaintenanceRow {
  building_id: string;
  /** Never null here — the listing query gates on `IS NOT NULL` (see below). */
  last_maintained_at_game_day: number;
  maintenance_due_in_days: number;
  maintenance_completes_at_day: number | null;
  lapse_phase: LapsePhase;
}

/** The D1 anchor pair a yield-fold site needs (grow-harvest's batched lookup — cook-advance already joins
 *  `building_operational_state` for its OTHER columns, so it reads these two directly off that same row). */
export interface MaintenanceAnchor {
  lastMaintainedAtGameDay: number | null;
  maintenanceDueInDays: number;
}

/** W3.U2 C2 — `MaintenanceAnchor` PLUS the D13 armed-job flag (binding 5's `maintenance_in_progress`). */
export interface MaintenanceState extends MaintenanceAnchor {
  maintenanceInProgress: boolean;
}

/**
 * C3 — a player-owned building's schedule-maintenance validation + D10 pricing input. `operationalType` is
 * cast to `M1OperationalType` (a strict SUBSET of the 12-member `building_operational_type` enum): an
 * OPERATIONAL building can ONLY carry an M1 type (the `real-estate.service.ts` M1_TYPES conversion gate —
 * `office` has no acquisition path, so it can never reach this query), so the narrowing is safe (never a
 * runtime mismatch).
 */
export interface ScheduleTargetState {
  building_id: string;
  operational_type: M1OperationalType;
  cover_quality: CoverQuality;
  structural_state: string;
  maintenance_completes_at_day: number | null;
  last_maintained_at_game_day: number | null;
  maintenance_due_in_days: number;
}

@Injectable()
export class MaintenanceRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * Batch-read every OPERATIONAL building (`structural_state = 'operational'` AND the D1 anchor already
   * stamped — `last_maintained_at_game_day IS NOT NULL`, i.e. truly past conversion-complete; design §4
   * "For an OPERATIONAL building") for the MAINTENANCE_PHASE_TICK (NIGHTLY/21). ONE query (Phase-1
   * determinism discipline — batched read, no per-row queries). Ordered by building_id for deterministic
   * batching. Returns [] when the player has none — the tick's L1 zero-write no-op (players without
   * operational buildings, or none past conversion yet).
   */
  async listOperationalBuildingsForPhaseTick(playerId: string): Promise<OperationalBuildingMaintenanceRow[]> {
    const rows = await this.db
      .select({
        building_id: buildingOperationalState.building_id,
        last_maintained_at_game_day: buildingOperationalState.last_maintained_at_game_day,
        maintenance_due_in_days: buildingOperationalState.maintenance_due_in_days,
        maintenance_completes_at_day: buildingOperationalState.maintenance_completes_at_day,
        lapse_phase: buildingOperationalState.lapse_phase,
      })
      .from(buildingOperationalState)
      .where(
        and(
          eq(buildingOperationalState.player_id, playerId),
          eq(buildingOperationalState.structural_state, 'operational'),
          isNotNull(buildingOperationalState.last_maintained_at_game_day),
        ),
      )
      .orderBy(buildingOperationalState.building_id);
    return rows.map((r) => ({
      building_id: r.building_id,
      last_maintained_at_game_day: r.last_maintained_at_game_day as number, // non-null by the WHERE gate above.
      maintenance_due_in_days: r.maintenance_due_in_days,
      maintenance_completes_at_day: r.maintenance_completes_at_day,
      lapse_phase: r.lapse_phase,
    }));
  }

  /**
   * Persist ONLY the buildings whose derived phase CHANGED this tick — ONE set-based
   * `UPDATE ... FROM (VALUES …)` (mirrors `RealEstateRepository.applySetupBatch` verbatim), NOT a per-row
   * loop. Zero-write no-op when `transitions` is empty — the idempotent same-day re-run contract: a second
   * run on the same game-day recomputes the SAME phases for every row, so the caller never invokes this
   * with a non-empty list on a same-day re-run (proven by the C2 E2E floor).
   */
  async persistPhaseTransitions(
    playerId: string,
    transitions: ReadonlyArray<{ building_id: string; newPhase: LapsePhase }>,
  ): Promise<void> {
    if (transitions.length === 0) return;
    const valueRows = transitions.map((t) => sql`(${t.building_id}::uuid, ${t.newPhase}::building_lapse_phase)`);
    await this.db.execute(sql`
      UPDATE ${buildingOperationalState} AS bos
      SET lapse_phase = v.new_phase
      FROM (VALUES ${sql.join(valueRows, sql`, `)})
        AS v(building_id, new_phase)
      WHERE bos.player_id = ${playerId}::uuid AND bos.building_id = v.building_id
    `);
  }

  /**
   * D13 — complete every ARMED scheduled-maintenance job whose `maintenance_completes_at_day` has arrived
   * (`<= currentGameDay`): reset the D1 anchor to TODAY, clear the armed-job column, and reset the cached
   * `lapse_phase` to 'within_window' (a freshly-maintained building starts a clean window — the SAME "fresh
   * window" contract mig 0119's backfill uses). ONE set-based `UPDATE ... RETURNING` (no per-row loop, no
   * schedule-service dependency — C3, which ARMS jobs, is a later chunk; C2 only completes them). Idempotent:
   * once `maintenance_completes_at_day` is cleared, the WHERE predicate no longer matches on a same-day
   * re-run (zero writes). Returns the completed building_ids (for the tick's log line).
   */
  async completeArmedJobs(playerId: string, currentGameDay: number): Promise<string[]> {
    const rows = await this.db
      .update(buildingOperationalState)
      .set({
        last_maintained_at_game_day: currentGameDay,
        maintenance_completes_at_day: null,
        lapse_phase: 'within_window',
      })
      .where(
        and(
          eq(buildingOperationalState.player_id, playerId),
          isNotNull(buildingOperationalState.maintenance_completes_at_day),
          sql`${buildingOperationalState.maintenance_completes_at_day} <= ${currentGameDay}`,
        ),
      )
      .returning({ building_id: buildingOperationalState.building_id });
    return rows.map((r) => r.building_id);
  }

  /**
   * Batched D1-anchor lookup for a SET of buildings — the grow-harvest yield-fold site, which (unlike
   * cook-advance's pre-existing `building_operational_state` JOIN) does not already carry these 2 columns
   * on its `UPDATE ... RETURNING`. ONE query, keyed by the exact completing building_ids (never per-row —
   * the Phase-1 determinism discipline). Empty input → empty Map, no query issued.
   */
  async getAnchorsForBuildings(buildingIds: readonly string[]): Promise<Map<string, MaintenanceAnchor>> {
    const map = new Map<string, MaintenanceAnchor>();
    if (buildingIds.length === 0) return map;
    const rows = await this.db
      .select({
        building_id: buildingOperationalState.building_id,
        last_maintained_at_game_day: buildingOperationalState.last_maintained_at_game_day,
        maintenance_due_in_days: buildingOperationalState.maintenance_due_in_days,
      })
      .from(buildingOperationalState)
      .where(inArray(buildingOperationalState.building_id, buildingIds as string[]));
    for (const r of rows) {
      map.set(r.building_id, {
        lastMaintainedAtGameDay: r.last_maintained_at_game_day,
        maintenanceDueInDays: r.maintenance_due_in_days,
      });
    }
    return map;
  }

  /**
   * W3.U2 C2 — batched D1-anchor + D13 armed-job lookup for a SET of buildings, the district-interior
   * projection's binding-5 read (`lapse_phase_bucket` + `maintenance_in_progress`). The SAME `getAnchorsForBuildings`
   * shape (ONE query, keyed by building_id, empty input → empty Map / no query issued) PLUS the
   * `maintenance_completes_at_day` column that method does not select — a NEW method rather than widening
   * `getAnchorsForBuildings` (that one's existing callers, e.g. grow-harvest, only need the 2-column shape;
   * widening it would touch behavior outside this chunk's scope).
   */
  async getMaintenanceStateForBuildings(buildingIds: readonly string[]): Promise<Map<string, MaintenanceState>> {
    const map = new Map<string, MaintenanceState>();
    if (buildingIds.length === 0) return map;
    const rows = await this.db
      .select({
        building_id: buildingOperationalState.building_id,
        last_maintained_at_game_day: buildingOperationalState.last_maintained_at_game_day,
        maintenance_due_in_days: buildingOperationalState.maintenance_due_in_days,
        maintenance_completes_at_day: buildingOperationalState.maintenance_completes_at_day,
      })
      .from(buildingOperationalState)
      .where(inArray(buildingOperationalState.building_id, buildingIds as string[]));
    for (const r of rows) {
      map.set(r.building_id, {
        lastMaintainedAtGameDay: r.last_maintained_at_game_day,
        maintenanceDueInDays: r.maintenance_due_in_days,
        maintenanceInProgress: r.maintenance_completes_at_day !== null,
      });
    }
    return map;
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // C3 — player schedule-maintenance / mass-schedule-maintenance actions (D10 pricing, D13 job arming)
  // ═══════════════════════════════════════════════════════════════════════════════════════════

  /**
   * The player's CURRENT game-day + game-minute (city_sim_clock.game_minute → deriveGameDay) — the SAME
   * authoritative clock read `anchor-set`/`run-phase-tick` use (maintenance-test.controller.ts). Returns
   * `{ gameMinute: 0, currentGameDay: 0 }` when the player has no clock row yet (the deterministic advance
   * harness lazy-creates it on first advance — the RepairRepository.getCurrentTick precedent). NOT a write.
   */
  async getCurrentGameDayAndMinute(playerId: string): Promise<{ gameMinute: number; currentGameDay: number }> {
    const rows = await this.db
      .select({ game_minute: citySimClock.game_minute })
      .from(citySimClock)
      .where(eq(citySimClock.player_id, playerId))
      .limit(1);
    const gameMinute = rows[0]?.game_minute ?? 0;
    const currentGameDay = deriveGameDay(gameMinute, citySimTunables.inGameDayLengthMinutes);
    return { gameMinute, currentGameDay };
  }

  /**
   * Read a player-owned building's schedule-maintenance validation + D10 pricing input (or null). Returns
   * null when the building has no `building_operational_state` row for THIS player (not owned / not
   * converted) — the caller maps that to a 404. Player-scoped so a building belonging to another player is
   * invisible (404, never a cross-player leak — the RepairRepository.getRepairTargetState precedent).
   */
  async getScheduleTargetState(playerId: string, buildingId: string): Promise<ScheduleTargetState | null> {
    const rows = await this.db
      .select({
        building_id: buildingOperationalState.building_id,
        operational_type: buildingOperationalState.operational_type,
        cover_quality: buildingOperationalState.cover_quality,
        structural_state: buildingOperationalState.structural_state,
        maintenance_completes_at_day: buildingOperationalState.maintenance_completes_at_day,
        last_maintained_at_game_day: buildingOperationalState.last_maintained_at_game_day,
        maintenance_due_in_days: buildingOperationalState.maintenance_due_in_days,
      })
      .from(buildingOperationalState)
      .where(
        and(
          eq(buildingOperationalState.building_id, buildingId),
          eq(buildingOperationalState.player_id, playerId),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return { ...row, operational_type: row.operational_type as M1OperationalType };
  }

  /**
   * Batched version of `getScheduleTargetState` for the mass-schedule action — ONE query, keyed by the
   * requested building_ids (never per-row — the `getAnchorsForBuildings` determinism discipline). Player-
   * scoped: a building_id belonging to another player (or that does not exist) simply has no entry in the
   * returned Map — the caller maps a missing entry to a 404 for that building_id. Empty input → empty Map,
   * no query issued.
   */
  async getScheduleTargetStatesBatch(
    playerId: string,
    buildingIds: readonly string[],
  ): Promise<Map<string, ScheduleTargetState>> {
    const map = new Map<string, ScheduleTargetState>();
    if (buildingIds.length === 0) return map;
    const rows = await this.db
      .select({
        building_id: buildingOperationalState.building_id,
        operational_type: buildingOperationalState.operational_type,
        cover_quality: buildingOperationalState.cover_quality,
        structural_state: buildingOperationalState.structural_state,
        maintenance_completes_at_day: buildingOperationalState.maintenance_completes_at_day,
        last_maintained_at_game_day: buildingOperationalState.last_maintained_at_game_day,
        maintenance_due_in_days: buildingOperationalState.maintenance_due_in_days,
      })
      .from(buildingOperationalState)
      .where(
        and(
          eq(buildingOperationalState.player_id, playerId),
          inArray(buildingOperationalState.building_id, buildingIds as string[]),
        ),
      );
    for (const r of rows) {
      map.set(r.building_id, { ...r, operational_type: r.operational_type as M1OperationalType });
    }
    return map;
  }

  /**
   * The ATOMIC single-building guarded-debit + arm-job transaction (REUSE the real-estate/repair guarded-
   * debit pattern verbatim — `debitAndCreateOperationalState` / `RepairRepository.debitAndArmRepair`): in ONE
   * DB transaction —
   *   1) GUARDED DEBIT: `UPDATE economy_states SET cash_cents = cash_cents - cost WHERE player_id = ? AND
   *      cash_cents >= cost`. Insufficient balance → 0 rows → return null (the caller rejects 409
   *      INSUFFICIENT_FUNDS); the tx commits the no-op (nothing else was written — no state change).
   *   2) ARM JOB: `UPDATE building_operational_state SET maintenance_completes_at_day = ? WHERE building_id =
   *      ? AND player_id = ? AND structural_state = 'operational' AND maintenance_completes_at_day IS NULL`
   *      (the state predicate is belt-and-braces — the caller already validated it; it also makes a
   *      concurrent double-schedule a no-op, the RepairRepository precedent).
   * Returns `{ completesAtDay }` on success, or null when the debit was refused. DETERMINISTIC.
   */
  async debitAndArmSchedule(params: {
    playerId: string;
    buildingId: string;
    costCents: bigint;
    completesAtDay: number;
  }): Promise<{ completesAtDay: number } | null> {
    const { playerId, buildingId, costCents, completesAtDay } = params;
    return this.db.transaction(async (tx) => {
      const debited = await tx
        .update(economyState)
        .set({ cash_cents: sql`${economyState.cash_cents} - ${costCents}` })
        .where(and(eq(economyState.player_id, playerId), sql`${economyState.cash_cents} >= ${costCents}`))
        .returning({ cash_cents: economyState.cash_cents });
      if (debited.length === 0) {
        // Insufficient balance (or no wallet row) → refuse the whole schedule (no other write attempted).
        return null;
      }

      await tx
        .update(buildingOperationalState)
        .set({ maintenance_completes_at_day: completesAtDay })
        .where(
          and(
            eq(buildingOperationalState.building_id, buildingId),
            eq(buildingOperationalState.player_id, playerId),
            eq(buildingOperationalState.structural_state, 'operational'),
            isNull(buildingOperationalState.maintenance_completes_at_day),
          ),
        );

      return { completesAtDay };
    });
  }

  /**
   * The ATOMIC mass-schedule guarded-debit + arm-job transaction (C3, D10/D13 — "single atomic transaction,
   * all-or-nothing"): ONE guarded debit of the SUM of every targeted building's cost (a single guarded UPDATE
   * is inherently atomic — no per-building debit-then-maybe-rollback loop needed), THEN, only if that
   * succeeds, ONE set-based arm UPDATE for every targeted building (the `persistPhaseTransitions` `UPDATE ...
   * FROM (VALUES …)` template). If the wallet cannot cover the TOTAL, the guarded debit affects 0 rows and
   * the transaction commits a no-op — NO building is debited, NONE is armed (the whole batch is refused).
   * Returns `true` on success, `false` when the total debit was refused. DETERMINISTIC.
   */
  async debitTotalAndArmBatch(
    playerId: string,
    totalCostCents: bigint,
    items: ReadonlyArray<{ buildingId: string; completesAtDay: number }>,
  ): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const debited = await tx
        .update(economyState)
        .set({ cash_cents: sql`${economyState.cash_cents} - ${totalCostCents}` })
        .where(and(eq(economyState.player_id, playerId), sql`${economyState.cash_cents} >= ${totalCostCents}`))
        .returning({ cash_cents: economyState.cash_cents });
      if (debited.length === 0) {
        // Insufficient TOTAL balance → refuse the WHOLE batch (no other write attempted — atomicity).
        return false;
      }

      const valueRows = items.map((i) => sql`(${i.buildingId}::uuid, ${i.completesAtDay}::bigint)`);
      await tx.execute(sql`
        UPDATE ${buildingOperationalState} AS bos
        SET maintenance_completes_at_day = v.completes_at_day
        FROM (VALUES ${sql.join(valueRows, sql`, `)})
          AS v(building_id, completes_at_day)
        WHERE bos.player_id = ${playerId}::uuid AND bos.building_id = v.building_id
          AND bos.structural_state = 'operational' AND bos.maintenance_completes_at_day IS NULL
      `);

      return true;
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // C4 — equipment-failure rolls (D11 seeded, WEEKLY/11 + the critical-daily NIGHTLY/21 wire-in) +
  // the atomic-5 failure transaction (minus the card — C5).
  // ═══════════════════════════════════════════════════════════════════════════════════════════

  /**
   * Batch-read every OPERATIONAL building (structural_state='operational' AND the D1 anchor already
   * stamped — the SAME `IS NOT NULL` gate `listOperationalBuildingsForPhaseTick` uses) for the
   * `EQUIPMENT_FAILURE_WEEKLY_TICK` (WEEKLY/11), WITH the extra columns the roll needs
   * (operational_type/equipment_tier/cover_quality — the phase-tick's own row shape omits these, C4 needs
   * them for the per-type baseline + the seeded repair-cost estimate). ONE query (Phase-1 determinism
   * discipline). `EquipmentFailureService` filters out EXCLUDED types + LIVE-derived critical-phase
   * buildings (the daily roll handles those instead) — the SQL stays a broad, honest read; the skip is an
   * explicit, greppable application-code decision (never a silent WHERE-clause omission).
   */
  async listOperationalBuildingsForWeeklyFailureRoll(playerId: string): Promise<FailureRollWeeklyCandidateRow[]> {
    const rows = await this.db
      .select({
        building_id: buildingOperationalState.building_id,
        operational_type: buildingOperationalState.operational_type,
        equipment_tier: buildingOperationalState.equipment_tier,
        cover_quality: buildingOperationalState.cover_quality,
        last_maintained_at_game_day: buildingOperationalState.last_maintained_at_game_day,
        maintenance_due_in_days: buildingOperationalState.maintenance_due_in_days,
      })
      .from(buildingOperationalState)
      .where(
        and(
          eq(buildingOperationalState.player_id, playerId),
          eq(buildingOperationalState.structural_state, 'operational'),
          isNotNull(buildingOperationalState.last_maintained_at_game_day),
        ),
      )
      .orderBy(buildingOperationalState.building_id);
    return rows.map((r) => ({
      building_id: r.building_id,
      operational_type: r.operational_type as M1OperationalType,
      equipment_tier: r.equipment_tier,
      cover_quality: r.cover_quality,
      last_maintained_at_game_day: r.last_maintained_at_game_day as number, // non-null by the WHERE gate above.
      maintenance_due_in_days: r.maintenance_due_in_days,
    }));
  }

  /**
   * Batched-by-id lookup (mirrors `getAnchorsForBuildings`) for the critical-daily roll wired into
   * `MAINTENANCE_PHASE_TICK` (NIGHTLY/21, C4): `MaintenancePhaseTickService` already knows WHICH
   * building_ids are (post-transition, post-job-completion) critical THIS tick — this fetches the
   * type/tier/cover_quality/structural_state the roll needs for exactly those ids, ONE query, never
   * per-row. `structural_state` is re-read here (belt-and-braces — a building whose scheduled-maintenance
   * job ALSO completed this same tick is excluded upstream by the caller, but re-checking here is the SAME
   * defense-in-depth `getScheduleTargetState`'s callers already apply). Empty input → empty Map, no query.
   */
  async getFailureRollCandidates(buildingIds: readonly string[]): Promise<Map<string, FailureRollDailyCandidateRow>> {
    const map = new Map<string, FailureRollDailyCandidateRow>();
    if (buildingIds.length === 0) return map;
    const rows = await this.db
      .select({
        building_id: buildingOperationalState.building_id,
        operational_type: buildingOperationalState.operational_type,
        equipment_tier: buildingOperationalState.equipment_tier,
        cover_quality: buildingOperationalState.cover_quality,
        structural_state: buildingOperationalState.structural_state,
      })
      .from(buildingOperationalState)
      .where(inArray(buildingOperationalState.building_id, buildingIds as string[]));
    for (const r of rows) {
      map.set(r.building_id, {
        building_id: r.building_id,
        operational_type: r.operational_type as M1OperationalType,
        equipment_tier: r.equipment_tier,
        cover_quality: r.cover_quality,
        structural_state: r.structural_state,
      });
    }
    return map;
  }

  /**
   * The ATOMIC equipment-failure transaction (design §5 atomic-5, steps 1-2 — the card is C5): in ONE DB
   * transaction —
   *   1) GUARDED FLIP: `UPDATE building_operational_state SET structural_state='failed' WHERE building_id=?
   *      AND player_id=? AND structural_state='operational'` — the state predicate is the race-guard: a
   *      building that is no longer 'operational' (already failed by a concurrent roll, or scheduled-
   *      maintenance completed the SAME tick) affects 0 rows → the whole tx is a no-op (returns null, the
   *      caller does NOT count it as a failure, does NOT emit the event, does NOT insert a log row — no
   *      double-fail, ever).
   *   2) `equipment_failure_log` INSERT — `roll_detail` (jsonb) carries the D11 seeded-roll trace (baseline/
   *      factor/mult/probability/seed) PLUS the seeded repair-cost estimate (`repair_cost_pct_of_setup_min..
   *      max`, seeded from the SAME rng stream) + the repair-TIME getters echoed verbatim
   *      (`repair_time_days_min/max`) — BO-only diagnostics (R2.2/DD-M3); the dedicated
   *      `repair_mode`/`repair_cost_cents`/`repair_completes_at_tick`/`resolved_at` columns stay NULL (they
   *      are stamped once at C5's resolve, per the schema's own "NULL until resolved" contract — the mode-
   *      determined final cost is picked THEN, not here).
   * Returns `{ failureId }` on success, or `null` when the guarded flip was refused (race-guard no-op).
   */
  async applyEquipmentFailure(params: {
    playerId: string;
    buildingId: string;
    operationalType: M1OperationalType;
    failedAtGameDay: number;
    lapsePhaseAtFailure: LapsePhase;
    rollDetail: Record<string, unknown>;
  }): Promise<{ failureId: string } | null> {
    const { playerId, buildingId, operationalType, failedAtGameDay, lapsePhaseAtFailure, rollDetail } = params;
    return this.db.transaction(async (tx) => {
      const flipped = await tx
        .update(buildingOperationalState)
        .set({ structural_state: 'failed' })
        .where(
          and(
            eq(buildingOperationalState.building_id, buildingId),
            eq(buildingOperationalState.player_id, playerId),
            eq(buildingOperationalState.structural_state, 'operational'),
          ),
        )
        .returning({ building_id: buildingOperationalState.building_id });
      if (flipped.length === 0) {
        // Race-guard no-op: already non-operational (concurrent roll / same-tick job completion). No log row.
        return null;
      }

      const [row] = await tx
        .insert(equipmentFailureLog)
        .values({
          building_id: buildingId,
          player_id: playerId,
          operational_type: operationalType,
          failed_at_game_day: failedAtGameDay,
          failed_at: new Date(), // real-clock audit instant (DD-M3) — NOT a gameplay-RNG source (D11 untouched).
          lapse_phase_at_failure: lapsePhaseAtFailure,
          roll_detail: rollDetail,
        })
        .returning({ failure_id: equipmentFailureLog.failure_id });

      return { failureId: row.failure_id };
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // C6 — heat couples (D7): the EQUIPMENT_REPAIR nightly repair-window-spike candidate set.
  // ═══════════════════════════════════════════════════════════════════════════════════════════

  /**
   * Every building CURRENTLY `structural_state ∈ {'failed','repairing'}` for a player — the EQUIPMENT_REPAIR
   * nightly repair-window-spike candidate set (04f-A C6, D7). C6 empirically verified (maintenance-heat.
   * service.ts header) that `buildings.structural_state` (the CITY-STATE column `HeatRepository.listBuildings`
   * gates the MINUTE/4 flush's operational-only candidate set on) is a DISTINCT column from THIS one and stays
   * 'operational' regardless of the equipment-failure flip — so the spike lands DIRECTLY on the building's own
   * building_id (no district-redirect needed). ONE query (Phase-1 determinism discipline — no per-row reads),
   * ordered for deterministic batching. Empty for a fleet with no failure/repair in flight (the zero-
   * regression contract, design §13).
   */
  async listFailedOrRepairingBuildingIds(playerId: string): Promise<string[]> {
    const rows = await this.db
      .select({ building_id: buildingOperationalState.building_id })
      .from(buildingOperationalState)
      .where(
        and(
          eq(buildingOperationalState.player_id, playerId),
          inArray(buildingOperationalState.structural_state, ['failed', 'repairing']),
        ),
      )
      .orderBy(buildingOperationalState.building_id);
    return rows.map((r) => r.building_id);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // C8 — BO surface (D12): the RAW admin-lookup + repair-history read + the force-phase anchor-write.
  // ═══════════════════════════════════════════════════════════════════════════════════════════

  /**
   * The FULL RAW `building_operational_state` row for a building, keyed by `building_id` ALONE (no
   * player scope — an admin surface, P5 inversion: BO looks up ANY building, unlike every player-facing
   * repository method above, which is player-scoped). Returns null when no such building exists (the
   * caller 404s). Carries `player_id` so the caller can resolve the owner's clock (`
   * getCurrentGameDayAndMinute`) WITHOUT a second lookup, and `equipment_tier` (needed for the D11
   * per-tier `lab` baseline the C8 effective-failure-probability read consumes — a field the player-
   * scoped `getScheduleTargetState` omits, C3 never needed it).
   */
  async getAdminMaintenanceStateRaw(buildingId: string): Promise<AdminMaintenanceStateRow | null> {
    const rows = await this.db
      .select({
        building_id: buildingOperationalState.building_id,
        player_id: buildingOperationalState.player_id,
        operational_type: buildingOperationalState.operational_type,
        cover_quality: buildingOperationalState.cover_quality,
        equipment_tier: buildingOperationalState.equipment_tier,
        structural_state: buildingOperationalState.structural_state,
        last_maintained_at_game_day: buildingOperationalState.last_maintained_at_game_day,
        maintenance_due_in_days: buildingOperationalState.maintenance_due_in_days,
        maintenance_completes_at_day: buildingOperationalState.maintenance_completes_at_day,
        lapse_phase: buildingOperationalState.lapse_phase,
      })
      .from(buildingOperationalState)
      .where(eq(buildingOperationalState.building_id, buildingId))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return { ...row, operational_type: row.operational_type as M1OperationalType };
  }

  /**
   * The `equipment_failure_log` repair-history trail for ONE building (design §10 "repair history"), most-
   * recent-first — the BO/timeline read `EquipmentFailureExceptionRepository` (exceptions/) never exposes
   * (that repository is scoped to the resolve-handler write paths, C5) and `MaintenanceRepository` already
   * owns the read side of this SAME table (`applyEquipmentFailure`'s own INSERT, C4). Deliberately excludes
   * `roll_detail` (the D11 seeded-roll trace stays a per-failure diagnostic, not part of the BO timeline
   * shape here — the RAW maintenance-state endpoint's caller can still reach it via a direct row if ever
   * needed; this list is the compact history table `<EquipmentFailureTimeline>` renders).
   */
  async listFailureLogForBuilding(buildingId: string): Promise<AdminFailureLogRow[]> {
    const rows = await this.db
      .select({
        failure_id: equipmentFailureLog.failure_id,
        failed_at_game_day: equipmentFailureLog.failed_at_game_day,
        failed_at: equipmentFailureLog.failed_at,
        lapse_phase_at_failure: equipmentFailureLog.lapse_phase_at_failure,
        repair_mode: equipmentFailureLog.repair_mode,
        repair_cost_cents: equipmentFailureLog.repair_cost_cents,
        repair_completes_at_tick: equipmentFailureLog.repair_completes_at_tick,
        resolved_at: equipmentFailureLog.resolved_at,
      })
      .from(equipmentFailureLog)
      .where(eq(equipmentFailureLog.building_id, buildingId))
      .orderBy(desc(equipmentFailureLog.failed_at));
    return rows;
  }

  /**
   * `force-phase` (D12, design §10): "sets the anchor so the derived phase = target" — writes ONLY
   * `last_maintained_at_game_day` (the D1 anchor), inverting the SAME linear relationship
   * `MaintenanceTestController.anchorSet` inverts (DD-M4 posture, extended to a PRODUCTION admin write) —
   * NEVER a direct `lapse_phase` column poke (that column is a tick-maintained CACHE, C2's own contract;
   * writing it directly here would desync it from the next NIGHTLY/21 recompute). Guarded on ownership
   * (`building_id` + `player_id`) AND `structural_state = 'operational'` (force-phase is meaningless for a
   * failed/repairing/demolished building — mirrors `debitAndArmSchedule`'s own state guard). Returns
   * `{ newAnchor, currentGameDay }` on success, or null when the guard fails (caller 409s).
   */
  async setAnchorForDaysOverdue(
    playerId: string,
    buildingId: string,
    daysOverdue: number,
  ): Promise<{ newAnchor: number; currentGameDay: number } | null> {
    const rows = await this.db
      .select({
        maintenance_due_in_days: buildingOperationalState.maintenance_due_in_days,
        structural_state: buildingOperationalState.structural_state,
      })
      .from(buildingOperationalState)
      .where(
        and(
          eq(buildingOperationalState.building_id, buildingId),
          eq(buildingOperationalState.player_id, playerId),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row || row.structural_state !== 'operational') return null;

    const { currentGameDay } = await this.getCurrentGameDayAndMinute(playerId);
    const newAnchor = currentGameDay - row.maintenance_due_in_days - daysOverdue;
    await this.db
      .update(buildingOperationalState)
      .set({ last_maintained_at_game_day: newAnchor })
      .where(
        and(
          eq(buildingOperationalState.building_id, buildingId),
          eq(buildingOperationalState.player_id, playerId),
        ),
      );
    return { newAnchor, currentGameDay };
  }
}

/** The FULL RAW admin row (`getAdminMaintenanceStateRaw`) — the P5-inverted true-state read (C8). */
export interface AdminMaintenanceStateRow {
  building_id: string;
  player_id: string;
  operational_type: M1OperationalType;
  cover_quality: CoverQuality;
  equipment_tier: number;
  structural_state: string;
  last_maintained_at_game_day: number | null;
  maintenance_due_in_days: number;
  maintenance_completes_at_day: number | null;
  /** The tick-maintained CACHE (C2) — distinct from the LIVE-derived phase the C8 controller computes
   *  from `last_maintained_at_game_day` (may be stale until the next NIGHTLY/21 tick runs). */
  lapse_phase: LapsePhase;
}

/** One `equipment_failure_log` repair-history row (`listFailureLogForBuilding`, C8). */
export interface AdminFailureLogRow {
  failure_id: string;
  failed_at_game_day: number;
  failed_at: Date;
  lapse_phase_at_failure: LapsePhase;
  repair_mode: string | null;
  repair_cost_cents: number | null;
  repair_completes_at_tick: number | null;
  resolved_at: Date | null;
}

/** A weekly-roll candidate row (`listOperationalBuildingsForWeeklyFailureRoll`) — the type/tier/cover the
 *  baseline lookup + seeded repair-cost estimate need, PLUS the D1 anchor pair to derive days-overdue live. */
export interface FailureRollWeeklyCandidateRow {
  building_id: string;
  operational_type: M1OperationalType;
  equipment_tier: number;
  cover_quality: CoverQuality;
  /** Never null here — the listing query gates on `IS NOT NULL` (see above). */
  last_maintained_at_game_day: number;
  maintenance_due_in_days: number;
}

/** A critical-daily-roll candidate row (`getFailureRollCandidates`) — no anchor pair needed (the caller
 *  already knows the building is critical THIS tick from the phase-tick's own live derivation). */
export interface FailureRollDailyCandidateRow {
  building_id: string;
  operational_type: M1OperationalType;
  equipment_tier: number;
  cover_quality: CoverQuality;
  structural_state: string;
}
