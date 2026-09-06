// IMPLEMENTS: docs/tech/09_data_model/schema_operational_chain.md §7.11 (grow_session — the Phase-3 grow_house table,
//             T0; current_stage='stage_1' default, started_at_tick / stage_started_at_tick / tend_count) +
//             docs/tech/09_data_model/schema_player_economy_state.md §2 (economy_states.cash_cents — the guarded debit,
//             the SAME atomic-guarded pattern SpecializedLabRepository.debitAndUpgradeTier /
//             RepairRepository.debitAndArmRepair / RealEstateRepository.debitAndCreateOperationalState use) +
//             docs/tech/09_data_model/schema_city_sim_clock.md §2 (city_sim_clock.game_minute — the current tick) +
//             docs/superpowers/specs/2026-06-06-phase-03-grow-house-design.md §4-T2 (plant → seed debit → grow_session)
//             -- session:2026-06-06 (Phase 3 vector #3 — grow_house — Task 2) --
//
// `GrowRepository` — the persisted access layer for the Phase-3 PLANT slice (grow_house cultivation). Copies the
// persisted-system repository template (SpecializedLabRepository / RepairRepository): a thin `*.repository.ts` owning
// the raw Drizzle reads/writes with EXPLICIT column lists, paired with a thin service holding the per-action validation.
//
// R9.3: 09 is the source of truth for `grow_session` (operational chain — §7.11, the table T0 landed),
// `building_operational_state` (§7) and `economy_states` (Phase-1). This file IMPORTS the existing schema and NEVER
// re-declares it. The runtime role app_rw has INSERT/SELECT/UPDATE/DELETE on grow_session (migration 0023) + UPDATE on
// economy_states (0013) — this repository uses exactly those. NO schema change (T0 landed grow_session).
//
// THE GUARDED-DEBIT DISCIPLINE (REUSE — the SAME atomic pattern the specialized-lab upgrade / real-estate / repair
// debits use): the seed debit is a `cash_cents >= cost` predicate IN the UPDATE so an insufficient balance NEVER goes
// negative — the UPDATE affects 0 rows, the WHOLE plant transaction rolls back (no state change), and the caller rejects
// (409 INSUFFICIENT_FUNDS). The debit + the grow_session INSERT run in ONE transaction (a plant never debits cash
// without starting a grow, and vice-versa). All values are PARAMETERIZED bind params (no string interpolation). NO RNG.

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { buildingOperationalState, growSession, precursorStock, precursorType } from '../../db/schema/operational_chain';
import type { GrowSessionInsert } from '../../db/schema/operational_chain';
import { economyState } from '../../db/schema/player_economy_state';
import { citySimClock } from '../../db/schema/city_sim_clock';

/** The precursor_type pgEnum value union (the precursor_stock.precursor_type column type) — the harvest casts the grow's
 *  (string) precursor_type to this DB-column type when it UPSERTs the harvested grams (the SAME cast the
 *  precursor-arrival upsert uses). R9.3 — derived from the schema enum, never re-declared. */
type PrecursorTypeEnumValue = (typeof precursorType)['enumValues'][number];

/** One harvest to apply (the yield grams resolved from the completing grow's tier) — the GrowYieldService maps each
 *  completing grow's tend_count → grams; the repo UPSERTs these grams into precursor_stock then DELETES the session. The
 *  GROW_ADVANCE tick builds these directly from the advance UPDATE's RETURNING rows (the grows that transitioned to
 *  'completed' THIS tick), so a dedicated "completed grow" struct is unnecessary — the advance row IS that record. */
export interface GrowHarvest {
  grow_session_id: string;
  building_id: string;
  precursor_type: string;
  yield_grams: number;
}

/** The precursor_type enum union the grow_session.precursor_type column accepts (the validated growable precursor). */
export type GrowPrecursorType = GrowSessionInsert['precursor_type'];

/** A player-owned building's plant-relevant operational state (the plant action validation input). */
export interface PlantTargetState {
  building_id: string;
  /** The operational type (front_shop/stash/lab/specialized_lab/grow_house/… — only 'grow_house' can plant). */
  operational_type: string;
}

/** A grow_session's tend-relevant state (the tend action validation input — the row exists ⇒ owned by the player). */
export interface TendTargetState {
  grow_session_id: string;
  /** The current stage — 'completed' blocks the tend (409); any in-progress stage is tendable once. */
  current_stage: string;
}

/** A grow_session's projection-relevant state (the T7 grow projection input — the row exists ⇒ owned by the player). The
 *  raw fields are the INPUT to the qualitative bands (grow_stage_band / husbandry_band / tend_due) — the projection maps
 *  them to bands / a flag; the raw tend_count / stage clock NEVER leave the service (R2.2). */
export interface GrowProjectionState {
  grow_session_id: string;
  /** The current grow stage (stage_1/stage_2/stage_3/completed) — mapped to grow_stage_band (EARLY/MID/LATE/DONE). */
  current_stage: string;
  /** The recorded husbandry tend_count — mapped to the husbandry_band trajectory (NEVER forwarded raw; R2.2). */
  tend_count: number;
  /** The stage this grow was last tended in (NULL ⇒ the current stage not yet tended) — drives the tend_due flag. */
  tended_in_stage: string | null;
}

/** The outcome of the atomic guarded tend UPDATE (the per-stage guard distinguishes the 409 reason). */
export type TendOutcome =
  /** The guarded UPDATE bumped tend_count + stamped tended_in_stage = current_stage (one tend banked). */
  | { result: 'tended' }
  /** A row exists but current_stage='completed' → can't tend a completed grow (409). */
  | { result: 'completed' }
  /** A row exists, in-progress, but tended_in_stage already == current_stage → already tended this stage (409). */
  | { result: 'already_tended' };

@Injectable()
export class GrowRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * The player's CURRENT in-game tick (city_sim_clock.game_minute) — the grow's started_at_tick / stage_started_at_tick.
   * Returns 0 when the player has no clock row yet (the deterministic advance harness lazy-creates it on first advance; a
   * grow planted before any tick is anchored at tick 0). NOT a write — the clock row is owned by the scheduler (the SAME
   * read ProductionRepository.getCurrentTick / AshAppointmentRepository.getCurrentTick use).
   */
  async getCurrentTick(playerId: string): Promise<number> {
    const rows = await this.db
      .select({ game_minute: citySimClock.game_minute })
      .from(citySimClock)
      .where(eq(citySimClock.player_id, playerId))
      .limit(1);
    return rows[0]?.game_minute ?? 0;
  }

  /**
   * Read a player-owned building's plant-relevant operational state (or null). Returns null when the building has no
   * building_operational_state row for THIS player (not owned / not converted) — the caller maps that to a 404. The
   * operational_type drives the grow_house validation (only a grow_house can plant → 409 WRONG_TYPE otherwise).
   * Player-scoped so a building belonging to another player is invisible (404, never a cross-player leak). Mirrors
   * SpecializedLabRepository.getUpgradeTargetState.
   */
  async getPlantTargetState(playerId: string, buildingId: string): Promise<PlantTargetState | null> {
    const rows = await this.db
      .select({
        building_id: buildingOperationalState.building_id,
        operational_type: buildingOperationalState.operational_type,
      })
      .from(buildingOperationalState)
      .where(
        and(
          eq(buildingOperationalState.building_id, buildingId),
          eq(buildingOperationalState.player_id, playerId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * Whether the player has an ACTIVE (not-yet-completed) grow_session on this building — the ALREADY_GROWING gate (one
   * active grow per building, schema §7.11 index grow_session_building_idx). A grow_session with current_stage='completed'
   * is awaiting harvest (T5) and does NOT block a new plant conceptually, but T2 ships only the IN-PROGRESS lifecycle: a
   * row whose current_stage is NOT 'completed' blocks. (T5's harvest deletes the session on finalize, so in the shipped
   * loop a building either has one in-progress grow or none.) Player+building-scoped. Returns true if any blocking row.
   */
  async hasActiveGrowSession(playerId: string, buildingId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: growSession.grow_session_id })
      .from(growSession)
      .where(
        and(
          eq(growSession.player_id, playerId),
          eq(growSession.building_id, buildingId),
          sql`${growSession.current_stage} <> 'completed'`,
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  /**
   * The ATOMIC guarded PLANT transaction (the wallet-affecting action): in ONE DB transaction —
   *   1) GUARDED DEBIT (REUSE the specialized-lab / real-estate / repair atomic-guarded pattern): `UPDATE economy_states
   *      SET cash_cents = cash_cents - cost WHERE player_id = ? AND cash_cents >= cost`. Insufficient balance → 0 rows →
   *      return null (the caller rejects 409 INSUFFICIENT_FUNDS); the tx rolls back the no-op (no grow_session inserted).
   *   2) INSERT THE GROW_SESSION: current_stage defaults 'stage_1' (the column default — not set explicitly);
   *      started_at_tick = stage_started_at_tick = the player's current tick; tend_count defaults 0 (the column default);
   *      tended_in_stage stays NULL (the current stage not yet tended). precursor_type = the validated growable precursor.
   * The debit + the insert run in ONE tx (a plant never charges without starting a grow, and vice-versa). Returns the
   * new grow_session_id on success, or null when the debit was refused (insufficient funds). DETERMINISTIC (no RNG).
   */
  async debitSeedAndCreateGrowSession(params: {
    playerId: string;
    buildingId: string;
    precursorType: GrowPrecursorType;
    seedCostCents: bigint;
    currentTick: number;
  }): Promise<{ growSessionId: string } | null> {
    const { playerId, buildingId, precursorType, seedCostCents, currentTick } = params;
    return this.db.transaction(async (tx) => {
      // 1) GUARDED DEBIT — only succeeds if the wallet can cover the seed cost (never go negative — anti-exploit). REUSE
      // the exact atomic-guarded predicate the specialized-lab upgrade / real-estate purchase/convert + repair debits use.
      const debited = await tx
        .update(economyState)
        .set({ cash_cents: sql`${economyState.cash_cents} - ${seedCostCents}` })
        .where(and(eq(economyState.player_id, playerId), sql`${economyState.cash_cents} >= ${seedCostCents}`))
        .returning({ cash_cents: economyState.cash_cents });
      if (debited.length === 0) {
        // Insufficient balance (or no wallet row) → refuse the whole plant (the tx rolls back the no-op).
        return null;
      }

      // 2) INSERT THE GROW_SESSION — current_stage='stage_1' (column default) + tend_count=0 (column default) +
      // tended_in_stage NULL (current stage not yet tended). started_at_tick = stage_started_at_tick = currentTick.
      const [row] = await tx
        .insert(growSession)
        .values({
          player_id: playerId,
          building_id: buildingId,
          precursor_type: precursorType, // validated growable precursor (∈ precursor_type enum) — caller-gated.
          // current_stage defaults to 'stage_1' (the column default) — not set explicitly.
          started_at_tick: currentTick,
          stage_started_at_tick: currentTick,
          // tend_count defaults to 0 (the column default) — not set explicitly. tended_in_stage stays NULL.
        })
        .returning({ id: growSession.grow_session_id });
      return { growSessionId: row.id };
    });
  }

  // ───────────────────────────── grow-stage advance (the GROW_ADVANCE tick, T3) ─────────────────────────────

  /**
   * The GROW_ADVANCE tick (MINUTE/18) for one player — advance every in-progress grow_session whose CURRENT stage's
   * uniform duration has elapsed, by EXACTLY ONE grow stage, in ONE set-based UPDATE (NO per-row loop, NO RNG —
   * sibling shape; set-based CASE UPDATE like the appointment-expiry sweep, cook-advance uses a per-row loop). The advance is:
   *   stage_1 → stage_2,  stage_2 → stage_3,  stage_3 → completed  (a deterministic CASE over current_stage).
   * On advance: re-anchor stage_started_at_tick = currentTick (the new stage's clock) and CLEAR tended_in_stage = NULL
   * (the new stage is tendable again — one-tend-per-stage). A grow already at 'completed' is NEVER selected (the
   * current_stage <> 'completed' predicate) — a completed grow STOPS advancing and waits for T5's harvest. A stage whose
   * clock has NOT yet elapsed (stage_started_at_tick + stageDurationTicks > currentTick) is preserved.
   *
   * GUARDED by the WHERE predicate (current_stage <> 'completed' AND the stage clock elapsed). Each tick advances AT MOST
   * one stage per grow (the MINUTE handler fires once per crossed minute boundary, so a 3-stage grow cascades over its
   * full cycle: stage_1 elapses → stage_2, …, stage_3 elapses → completed). Idempotent within a tick (a second pass over
   * the same currentTick re-selects only grows whose freshly-anchored stage has ALSO elapsed — never the case for a stage
   * just re-anchored at currentTick, since stageDurationTicks >= 1). DETERMINISTIC: which grows advance (the elapsed
   * predicate) + the next stage (the fixed CASE) are a FIXED function of the persisted stage_started_at_tick + the clock +
   * the grounded grow.stage_duration_ticks (passed in — R2.3, never inline). Returns the count of rows advanced (for the
   * tick log; 0 = clean no-op — the common case: no in-progress grow, or none whose stage clock has elapsed). The
   * (current_stage) index (T0, grow_session_stage_idx) serves the predicate.
   *
   * NOTE (T6): the DAMAGED-pause gate (skip grows on a non-operational building, cook-style) is ADDED in T6 — T3 ships the
   * pure stage-walk. NO schema change (T0 landed grow_session).
   *
   * T5: this UPDATE now RETURNS the per-row new current_stage + the harvest-relevant columns (building_id,
   * precursor_type, tend_count) so the caller can identify which grows TRANSITIONED to 'completed' THIS tick and harvest
   * exactly those (the completion-transition handler — NOT a sweep of pre-existing 'completed' rows, which would break the
   * T3 "COMPLETED STOPS" guarantee). The returned rows are the rows the predicate matched (in-progress, stage elapsed);
   * those whose new stage is 'completed' are the just-completed grows. The stage-walk behavior is UNCHANGED (same
   * predicate, same CASE) — only the RETURNING shape is widened.
   */
  async advanceGrowStagesDue(
    playerId: string,
    currentTick: number,
    stageDurationTicks: number,
  ): Promise<Array<{ grow_session_id: string; new_stage: string; building_id: string; precursor_type: string; tend_count: number }>> {
    const advanced = await this.db
      .update(growSession)
      .set({
        // The deterministic stage transition: stage_1→stage_2, stage_2→stage_3, stage_3→completed. The WHERE clause
        // guarantees current_stage <> 'completed', so the CASE always matches one of the three in-progress stages
        // (the trailing ELSE keeps a row unchanged defensively — never hit under the predicate).
        current_stage: sql`CASE ${growSession.current_stage}
          WHEN 'stage_1' THEN 'stage_2'::grow_stage
          WHEN 'stage_2' THEN 'stage_3'::grow_stage
          WHEN 'stage_3' THEN 'completed'::grow_stage
          ELSE ${growSession.current_stage} END`,
        // Re-anchor the new stage's clock at the current tick.
        stage_started_at_tick: currentTick,
        // CLEAR the per-stage tend flag — the new stage is tendable again (one-tend-per-stage).
        tended_in_stage: null,
      })
      .where(
        and(
          eq(growSession.player_id, playerId),
          sql`${growSession.current_stage} <> 'completed'`,
          // Belt-and-suspenders: the column is nullable, so guard it explicitly. T2 always stamps stage_started_at_tick
          // on plant, so an in-progress grow ALWAYS has a non-null value — this is unreachable today (a NULL would already
          // make the elapsed arithmetic below NULL → excluded), but it makes the predicate self-evidently safe.
          sql`${growSession.stage_started_at_tick} IS NOT NULL`,
          // The current stage's uniform duration has elapsed: stage_started_at_tick + stageDurationTicks <= currentTick.
          sql`${growSession.stage_started_at_tick} + ${stageDurationTicks} <= ${currentTick}`,
          // T6 — DAMAGED-PAUSE GATE (cook-style): only advance a grow whose grow_house is structurally OPERATIONAL. A
          // raided (DAMAGED/REPAIRING) grow_house PAUSES its grow (mirrors the COOK_ADVANCE gate, which excludes damaged
          // labs). EXISTS so the gate is purely RESTRICTIVE — it removes ONLY grows on a non-operational building; a grow
          // on an operational building advances byte-identically (behavior-preserving for T3/T5). NB: the raid SEIZES the
          // active grow_session (raid.repository), so in practice a DAMAGED grow_house has no row left to pause — this gate
          // is the belt-and-braces guard against advancing a DAMAGED building that still carries a (hypothetical) row.
          sql`EXISTS (
            SELECT 1 FROM ${buildingOperationalState} AS bos
            WHERE bos.building_id = ${growSession.building_id}
              AND bos.structural_state = 'operational'
          )`,
        ),
      )
      // RETURNING the POST-update stage (current_stage is the just-applied CASE value) + the harvest-relevant columns.
      .returning({
        grow_session_id: growSession.grow_session_id,
        new_stage: growSession.current_stage,
        building_id: growSession.building_id,
        precursor_type: growSession.precursor_type,
        tend_count: growSession.tend_count,
      });
    return advanced;
  }

  // ───────────────────────────── heat emission input (the GROW_ADVANCE A-stakes, T6) ─────────────────────────────

  /**
   * List the player's grow_house building_ids that currently host an ACTIVE grow_session (current_stage <> 'completed')
   * on a structurally-OPERATIONAL building — the input to the per-tick GROW_HEAT emission (T6). An active grow radiates
   * the odeur / abnormal-electricity signature (the make-vs-buy A stakes); an idle grow_house (no active grow) and a
   * DAMAGED/REPAIRING grow_house (a raided holder — like the storage-heat gate) radiate NOTHING. ONE batched, set-based,
   * READ-ONLY query (the Phase-1 determinism discipline — no per-row lookups). DISTINCT-by-building (at most one active
   * grow per building, but DISTINCT is belt-and-braces so the emitter sees each building once). Ordered for deterministic
   * batching. Returns [] when the player has no active grow (the clean no-op — idle grow_houses + non-grow players). NB:
   * the building→district resolution for the HeatInjectionEvent is done by the REUSED HeatContribRepository.resolveDistricts.
   */
  async listActiveGrowBuildingIds(playerId: string): Promise<string[]> {
    const rows = await this.db
      .selectDistinct({ building_id: growSession.building_id })
      .from(growSession)
      .innerJoin(buildingOperationalState, eq(buildingOperationalState.building_id, growSession.building_id))
      .where(
        and(
          eq(growSession.player_id, playerId),
          sql`${growSession.current_stage} <> 'completed'`,
          eq(buildingOperationalState.structural_state, 'operational'),
        ),
      )
      .orderBy(growSession.building_id);
    return rows.map((r) => r.building_id);
  }

  // ───────────────────────────── harvest (the GROW_ADVANCE completion handler, T5) ─────────────────────────────

  /**
   * The HARVEST batch (T5) — for each grow that TRANSITIONED to 'completed' this tick, UPSERT its yield grams into
   * precursor_stock for (player, building, precursor_type) and DELETE the grow_session (finalize — the building is free
   * to re-plant). ALL in ONE transaction (the persisted-system template — set-based per distinct stock key, NOT a
   * per-row await loop where avoidable; a grow is never deleted without its grams landing, and vice-versa). The UPSERT
   * MIRRORS the precursor-arrival upsert EXACTLY (PrecursorsRepository.applyArrivalBatch): precursor_stock has NO unique
   * constraint on (player, building, type), so per distinct (building, type) key it is a guarded UPDATE-then-INSERT-if-
   * absent (the RETURNING length is the authoritative "did a row exist" test — no rowCount cast). The harvest is just
   * ANOTHER source-agnostic writer of precursor_stock (behavior-preserving for the precursor-arrival writer + the cook
   * consumer — non-grow rows byte-identical, R9.3).
   *
   * The yield grams per harvest are resolved by the CALLER (the GROW_ADVANCE tick) via the pure GrowYieldService
   * (tend_count → tier → grams) — the repo only persists. DETERMINISTIC (no RNG — the grams are a pure function of the
   * persisted tend_count). Idempotent within a tick: the grows are DELETED, so a second pass over the same tick finds no
   * 'completed'-transitioning grow to re-harvest (a grow is harvested exactly once). Returns the count harvested (for the
   * tick log). The harvests are aggregated per distinct (building, type) key so the stock upsert is ONE write per key.
   */
  async applyHarvestBatch(playerId: string, harvests: GrowHarvest[]): Promise<number> {
    if (harvests.length === 0) return 0;

    // Aggregate the harvested grams per distinct (building_id, precursor_type) key — so the stock upsert is ONE write per
    // key, not per grow (deterministic, batched; mirrors applyArrivalBatch's per-key aggregation).
    const byKey = new Map<string, { building_id: string; precursor_type: string; grams: number }>();
    for (const h of harvests) {
      const key = `${h.building_id}::${h.precursor_type}`;
      const cur = byKey.get(key);
      if (cur) cur.grams += h.yield_grams;
      else byKey.set(key, { building_id: h.building_id, precursor_type: h.precursor_type, grams: h.yield_grams });
    }
    const harvestedIds = harvests.map((h) => h.grow_session_id);

    await this.db.transaction(async (tx) => {
      // (a) UPSERT the harvested grams per (building, type) key (MIRROR PrecursorsRepository.applyArrivalBatch): UPDATE
      //     the existing precursor_stock row (+ grams) with RETURNING; if it touched 0 rows → INSERT a fresh row at the
      //     grams. The RETURNING length is the authoritative "did a row exist" test (no rowCount cast). The keys are few
      //     (one per building×type completing this tick), a small bounded set.
      for (const { building_id, precursor_type, grams } of byKey.values()) {
        const bumped = await tx
          .update(precursorStock)
          .set({ quantity_units: sql`${precursorStock.quantity_units} + ${grams}`, updated_at: sql`now()` })
          .where(
            and(
              eq(precursorStock.player_id, playerId),
              eq(precursorStock.building_id, building_id),
              eq(precursorStock.precursor_type, precursor_type as PrecursorTypeEnumValue),
            ),
          )
          .returning({ stock_id: precursorStock.stock_id });
        if (bumped.length === 0) {
          // No existing stock row for this (player, building, type) → seed it at the harvested grams.
          await tx.insert(precursorStock).values({
            player_id: playerId,
            building_id,
            precursor_type: precursor_type as PrecursorTypeEnumValue,
            quantity_units: grams,
          });
        }
      }

      // (b) FINALIZE — DELETE the harvested grow_sessions (the crop is collected; the building is free to re-plant). ONE
      //     set-based DELETE over the harvested-id list (player-scoped — never another player's grow). The harvest +
      //     the delete are in ONE tx, so a grow is never deleted without its grams landing (and vice-versa).
      await tx
        .delete(growSession)
        .where(and(eq(growSession.player_id, playerId), inArray(growSession.grow_session_id, harvestedIds)));
    });

    return harvests.length;
  }

  // ───────────────────────────── tend action (husbandry lever B, T4) ─────────────────────────────

  /**
   * Read a player-owned grow_session's tend-relevant state (or null). Returns null when no grow_session with this id
   * belongs to THIS player (not found / not owned / another player's grow) — the caller maps that to a 404 (the
   * grow_session id is invisible across players, never a cross-player leak — mirrors getPlantTargetState's player scope).
   * The current_stage drives the completed-vs-in-progress validation (only an in-progress grow can be tended).
   */
  async getTendTargetState(playerId: string, growSessionId: string): Promise<TendTargetState | null> {
    const rows = await this.db
      .select({
        grow_session_id: growSession.grow_session_id,
        current_stage: growSession.current_stage,
      })
      .from(growSession)
      .where(and(eq(growSession.grow_session_id, growSessionId), eq(growSession.player_id, playerId)))
      .limit(1);
    return rows[0] ?? null;
  }

  // ───────────────────────────── grow projection (the player-facing bands, T7) ─────────────────────────────

  /**
   * Read a player-owned grow_session's projection-relevant state (or null) — the input to the T7 qualitative grow
   * projection (grow_stage_band / husbandry_band / tend_due). Returns null when no grow_session with this id belongs to
   * THIS player (not found / not owned / another player's grow) — the caller maps that to a 404 (the grow_session id is
   * invisible across players, never a cross-player leak; the SAME player-scope guard getTendTargetState uses). The raw
   * current_stage / tend_count / tended_in_stage are the INPUT to the bands — the projection service maps them; the raw
   * tend_count / stage clock NEVER leave the service (R2.2). READ-ONLY — NO schema change (R9.3).
   */
  async getGrowProjectionState(playerId: string, growSessionId: string): Promise<GrowProjectionState | null> {
    const rows = await this.db
      .select({
        grow_session_id: growSession.grow_session_id,
        current_stage: growSession.current_stage,
        tend_count: growSession.tend_count,
        tended_in_stage: growSession.tended_in_stage,
      })
      .from(growSession)
      .where(and(eq(growSession.grow_session_id, growSessionId), eq(growSession.player_id, playerId)))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * The ATOMIC guarded TEND UPDATE (husbandry lever B — one tend banked per stage). In ONE set-based UPDATE, guarded so a
   * double-call can NEVER double-count (the SAME atomic-guard discipline the cash-debit `WHERE cash >= cost` uses to
   * prevent a double-spend): bump `tend_count = tend_count + 1` and stamp `tended_in_stage = current_stage`, ONLY WHERE
   * the grow is owned by the player AND in-progress (current_stage <> 'completed') AND NOT already tended this stage
   * (`tended_in_stage IS DISTINCT FROM current_stage`). The guard is INSIDE the UPDATE predicate, so two concurrent/retried
   * tends in the same stage → the second affects 0 rows (no double-increment) — the count is bounded to one per stage by
   * the DB, not by a read-then-write race. NO RNG, all params bound.
   *
   * Returns a TendOutcome the caller maps to HTTP: 'tended' (≥1 row updated → 200); 'completed' (0 rows but the row is at
   * 'completed' → 409 can't tend a completed grow); 'already_tended' (0 rows, in-progress, already tended this stage →
   * 409). The two 0-row reasons are disambiguated by a follow-up read of the SAME row (the caller already holds the
   * pre-checked state, but a fresh in-tx-style read keeps the reason authoritative if the stage advanced between the
   * service's validation read and this UPDATE — a benign race that simply re-classifies the 409). NO schema change.
   */
  async tendGrowSession(playerId: string, growSessionId: string): Promise<TendOutcome> {
    const updated = await this.db
      .update(growSession)
      .set({
        tend_count: sql`${growSession.tend_count} + 1`,
        tended_in_stage: sql`${growSession.current_stage}`,
      })
      .where(
        and(
          eq(growSession.grow_session_id, growSessionId),
          eq(growSession.player_id, playerId),
          // In-progress only — a completed grow cannot be tended.
          sql`${growSession.current_stage} <> 'completed'`,
          // The per-stage guard: tend ONLY if this stage is not yet tended (NULL or a previous stage). IS DISTINCT FROM
          // treats NULL correctly (NULL IS DISTINCT FROM 'stage_1' → true → tendable). A double-call re-runs this guard:
          // after the first tend tended_in_stage == current_stage, so the second affects 0 rows (no double-count).
          sql`${growSession.tended_in_stage} IS DISTINCT FROM ${growSession.current_stage}`,
        ),
      )
      .returning({ id: growSession.grow_session_id });

    if (updated.length > 0) {
      return { result: 'tended' };
    }

    // 0 rows updated → the guard refused. Re-read the row to classify the 409 reason authoritatively (completed vs
    // already-tended this stage). The row is guaranteed to exist (the service pre-checked ownership → 404 otherwise).
    const after = await this.db
      .select({
        current_stage: growSession.current_stage,
        already_tended: sql<boolean>`${growSession.tended_in_stage} IS NOT DISTINCT FROM ${growSession.current_stage}`,
      })
      .from(growSession)
      .where(and(eq(growSession.grow_session_id, growSessionId), eq(growSession.player_id, playerId)))
      .limit(1);
    if (after[0]?.current_stage === 'completed') {
      return { result: 'completed' };
    }
    return { result: 'already_tended' };
  }
}
