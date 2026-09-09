// IMPLEMENTS: docs/tech/09_data_model/schema_operational_chain.md §2/§3 (cook_session + product_storage +
//             precursor_stock — T0; building_operational_state — the OPERATIONAL gate) +
//             docs/tech/09_data_model/schema_city_state.md §2 (buildings — ownership) +
//             docs/tech/09_data_model/schema_city_sim_clock.md §2 (city_sim_clock.game_minute — started_at_tick) +
//             docs/tech/04a_operational_systems/production_brindle.md §Stage 1 (Pyralin consumed) + §Invariant 5
//             (LAB must be OPERATIONAL) + §Vue d'ensemble du pipeline 4-stage (the stage clock) + §Per-cook output
//             (the yield into product_storage)
//             -- session:2026-06-03 (Phase 2 Task 3) --
//
// `ProductionRepository` — the persisted access layer for the M1 Brindle cook slice. Copies the persisted-system
// repository template (PrecursorsRepository / RealEstateRepository): a thin `*.repository.ts` owning the raw Drizzle
// reads/writes with EXPLICIT column lists, paired with thin services that hold the per-action / per-tick logic.
//
// R9.3: 09 is the source of truth for `cook_session` / `product_storage` / `precursor_stock` (T0),
// `building_operational_state` (T0), `buildings` (Phase 1), and `city_sim_clock` (Phase 1). This file IMPORTS the
// existing schema and NEVER re-declares it. The runtime role app_rw has SELECT+INSERT broadly (0013) + UPDATE on the
// mutable operational tables (0017) — this repository uses exactly those.
//
// BATCHED WRITES (the determinism template): the scheduler-facing cook-advance tick reads ALL in-progress cook
// sessions for a player in ONE query and applies the whole stage-advance / yield batch set-based — NEVER a per-row
// await loop (the Phase-1 determinism discipline). All values are PARAMETERIZED bind params.

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { building } from '../../db/schema/city_state';
import {
  batchPurity,
  buildingOperationalState,
  cookSession,
  precursorStock,
  productStorage,
} from '../../db/schema/operational_chain';
import { citySimClock } from '../../db/schema/city_sim_clock';
import type { PrecursorType, SubstanceType } from '../substance/substance-config';

/** The substance + precursor enum domains the cook reads/writes (schema_operational_chain.md §2 pgEnum members) —
 *  aliased to the registry's domain types so the repository's writes are typed against the SAME closed domains the
 *  substance config registry parameterizes the chain by (R9.3: the enum members live in 09, never redefined here). */
export type ProductSubstanceType = SubstanceType;
export type CookPrecursorType = PrecursorType;

/** The four FUNCTIONAL cook stages (the M1 pipeline — stage_1→stage_4). The stage_2_intermediate sub-state + the
 *  aborted terminal are NOT used in M1 (no intermediate-decay / abort path — YAGNI). `completed` is the terminal.
 *  Mutable array (NOT readonly) so it can be passed directly to drizzle `inArray` (which expects a value array of the
 *  cook_stage enum union — every member here is a member of that union). */
export type FunctionalCookStage = 'stage_1' | 'stage_2' | 'stage_3' | 'stage_4';
export const FUNCTIONAL_COOK_STAGES: FunctionalCookStage[] = ['stage_1', 'stage_2', 'stage_3', 'stage_4'];

/** An in-progress cook the advance tick reads (current_stage IN the 4 functional stages — not completed/aborted).
 *  `substance_type` drives the per-cook clock/stage-count/yield from the substance registry (T3 — substance-generic
 *  advance), so a Brindle cook reads 4×30 and a Crick cook 1×180 from the SAME loop. `refining_passes` (Ash time↔purity
 *  lever — 0 for non-Ash cooks) extends the cook clock by refiningPasses × refiningPassDurationTicks.
 *
 *  `damaged_pauses_during_cook` + `lab_tier` are the OTHER TWO Ash purity levers (T6 — read at COMPLETION for a
 *  luxuryChannel cook to derive the batch purity_score). They are READ for every cook (the SELECT carries them for all
 *  substances) but only an Ash (luxuryChannel) completion CONSUMES them — non-luxuryChannel cooks ignore them entirely
 *  (behavior-preserving). `damaged_pauses_during_cook` is on the cook row (T4); `lab_tier` is on the cook's building's
 *  operational state (T5 — the building_operational_state already INNER-JOINed for the operational gate). */
export interface InProgressCook {
  cook_session_id: string;
  lab_building_id: string;
  substance_type: string;
  current_stage: string;
  stage_started_at_tick: number;
  refining_passes: number;
  damaged_pauses_during_cook: number;
  lab_tier: number;
  /** D1 C6 — the building's equipment_tier for Brindle yield scaling (yieldGramsForEquipmentTier). Read from
   *  building_operational_state (already INNER-JOINed for the operational gate). For Brindle cooks: yieldGrams =
   *  yieldGramsForEquipmentTier(equipment_tier). For non-Brindle (Crick/Hush/Ash) the equipment_tier read is
   *  available but their yield scaling is DEFERRED (they use descriptor.yieldGrams — byte-identical). BO-only (R2.2). */
  equipment_tier: number;
  /** The tenure efficiency-bonus YIELD MULTIPLIER captured at startCook for a DELEGATED COOK (Phase-11b), in permille
   *  (×1000): 1000 = ×1 (FRESH / no bonus), up to BONUS_CAP. NULL = a player-MANUAL cook (or a non-bonus delegated cook)
   *  → COOK_ADVANCE treats NULL as ×1 (a manual cook's yield stays byte-identical). The COOK_ADVANCE completion reads ONLY
   *  this stored permille (it imports NOTHING from the lieutenant module — no tenure/bucket knowledge). BO-only (R2.2). */
  delegated_yield_permille: number | null;
  /** 04f-A C2 (D1/D5) — the building's D1 maintenance anchor, read from the already-JOINed
   *  building_operational_state (the SAME row the equipment_tier/lab_tier reads above come from — zero extra query).
   *  NULL only for a defensively-unreachable building with no anchor yet (a truly OPERATIONAL lab always has one —
   *  C1 stamps it at conversion-complete). Fed into MaintenancePhaseService.deriveDaysOverdue → maintenanceOutputMultiplier
   *  at completion (the D5 output fold). BO-only (R2.2 — never forwarded raw). */
  last_maintained_at_game_day: number | null;
  /** 04f-A C2 (D1) — the building's per-building maintenance interval (REUSE, unchanged by 04f-A) — the D1
   *  `deriveDaysOverdue` divisor. BO-only (R2.2). */
  maintenance_due_in_days: number;
}

/** The minimal cook-session row for the projection (its qualitative stage band + substance inputs). */
export interface CookStateRow {
  cook_session_id: string;
  substance_type: string;
  current_stage: string;
}

/** One completed cook's yield to land in product_storage (the batched-yield input on the advance tick). */
export interface CookYield {
  /** The destination building (the linked stash, defaulting to the cook's building — see startCook). */
  building_id: string;
  /** The substance this cook produced (product_storage.substance_type — Brindle or Crick this slice). */
  substance_type: ProductSubstanceType;
  /** The yield mass in grams (the per-substance flat yield from the registry descriptor). */
  quantity_grams: number;
  /** The deterministic M1 output purity grade. */
  purity_grade: 'crude' | 'low' | 'standard' | 'refined' | 'pure';
  /** The deterministic M1 cut bucket (stamped on the completing session). */
  cut_purity_bucket: 'pure' | 'standard' | 'cheap' | 'max_margin';
  /**
   * The DERIVED Ash batch purity_score (0..100), stamped onto a batch_purity row keyed to the produced product_storage
   * row IN the same completion transaction (T6 — the distinct Ash mechanic). Present ONLY for a luxuryChannel (Ash) cook
   * — the cook-advance computes it from the cook's refining_passes + damaged_pauses_during_cook + the lab's lab_tier via
   * AshPurityService. UNDEFINED for non-luxuryChannel cooks (Brindle/Crick/Hush) → NO batch_purity row is touched, so
   * their completion is byte-identical (behavior-preserving). R2.2 — the raw score is BO-only; the projection surfaces a
   * band only. The DB CHECK enforces 0..100 (the service already clamps).
   */
  purity_score?: number;
}

@Injectable()
export class ProductionRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  // ───────────────────────────── startCook (Step 1) ─────────────────────────────

  /**
   * Read a player-owned building that is OPERATIONAL (conversion_stage='operational'), RETURNING its operational_type
   * plus the equipment_tier upgrade state fields for the D1 C6 offline guard. NOT gated on a specific type — the
   * building-type-aware cook gate is the service's responsibility. An unknown/non-owned/non-operational building →
   * null (→ 404); an operational building of the WRONG type → the row is returned and the service rejects the type
   * MISMATCH (→ 409).
   *
   * D1 C6: also returns `equipment_tier` (for yield scaling in COOK_ADVANCE) and
   * `equipment_tier_upgrade_remaining_ticks` (for the offline-for-upgrade guard at startCook).
   */
  async getOwnedOperationalBuilding(
    playerId: string,
    buildingId: string,
  ): Promise<{ building_id: string; operational_type: string; equipment_tier: number; equipment_tier_upgrade_remaining_ticks: number } | null> {
    const rows = await this.db
      .select({
        building_id: building.building_id,
        operational_type: buildingOperationalState.operational_type,
        equipment_tier: buildingOperationalState.equipment_tier,
        equipment_tier_upgrade_remaining_ticks: buildingOperationalState.equipment_tier_upgrade_remaining_ticks,
      })
      .from(building)
      .innerJoin(buildingOperationalState, eq(buildingOperationalState.building_id, building.building_id))
      .where(
        and(
          eq(building.building_id, buildingId),
          eq(building.player_id, playerId),
          eq(building.ownership, 'player'),
          eq(buildingOperationalState.conversion_stage, 'operational'),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * Whether the lab already has a cook in progress (current_stage IN the 4 functional stages). M1 allows ONE cook per
   * lab at a time (no parallel batch slots — the tier prep-station parallelism is DEFERRED). Used to refuse a second
   * concurrent startCook (409).
   */
  async hasCookInProgress(playerId: string, labBuildingId: string): Promise<boolean> {
    const rows = await this.db
      .select({ cook_session_id: cookSession.cook_session_id })
      .from(cookSession)
      .where(
        and(
          eq(cookSession.player_id, playerId),
          eq(cookSession.lab_building_id, labBuildingId),
          inArray(cookSession.current_stage, FUNCTIONAL_COOK_STAGES),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  /**
   * The player's CURRENT in-game tick (city_sim_clock.game_minute) — the cook's started_at_tick / stage_started_at_
   * tick. Returns 0 when the player has no clock row yet (the deterministic advance harness lazy-creates it on first
   * advance; a cook started before any tick is anchored at tick 0). NOT a write — the clock row is owned by the
   * scheduler.
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
   * The ATOMIC guarded startCook (Step 1, substance-generic): CONSUME the per-batch precursor from precursor_stock AND
   * INSERT the cook_session (substance_type, current_stage='stage_1', started_at_tick = stage_started_at_tick = the
   * player's current tick, refining_passes = the validated count — 0 for non-Ash cooks → byte-identical insert), in ONE
   * DB transaction. The precursor decrement is GUARDED by a `quantity_units >=
   * batchUnits` predicate IN the UPDATE (the SAME guarded-decrement pattern T1/T2 use for the cash debit, here on
   * precursor_stock.quantity_units) so an insufficient stock NEVER goes negative — the UPDATE affects 0 rows, the cook
   * is NOT inserted, the tx rolls back, and the caller rejects (409). Returns the new cook_session_id (or null if the
   * guarded decrement was refused).
   *
   * The precursorType + substanceType are REGISTRY-DRIVEN (the substance descriptor — Brindle → pyralin/brindle,
   * Crick → verdant_root_extract/crick): the SAME generic decrement that consumed Pyralin for a Brindle lab consumes
   * Verdant root extract for a Crick refinery. The stock is read+decremented on the SINGLE precursor_stock row for
   * (player, building, precursorType) — T2's arrival upsert maintains exactly one row per (player, building, type) by
   * writer discipline; the guard tolerates the absent-row case (UPDATE touches 0 rows → refuse).
   */
  async consumePrecursorAndCreateCook(params: {
    playerId: string;
    buildingId: string;
    substanceType: ProductSubstanceType;
    precursorType: CookPrecursorType;
    batchUnits: number;
    startedAtTick: number;
    /** The number of refining passes chosen at cook start (Ash time↔purity lever; 0 for non-Ash cooks → byte-identical). */
    refiningPasses?: number;
    /** The captured tenure efficiency-bonus yield multiplier, in permille (×1000), for a DELEGATED COOK (Phase-11b C1).
     *  null/undefined (a player-MANUAL cook, the common case) → the column is NULL → byte-identical insert (C2 reads NULL
     *  as ×1). A delegated COOK passes a real permille (FRESH → 1000). BO-only — captured at start, applied at completion (C2). */
    delegatedYieldPermille?: number | null;
  }): Promise<string | null> {
    return this.db.transaction(async (tx) => {
      // Guarded decrement: only succeeds if the building's precursor stock can cover the batch (never go negative).
      const debited = await tx
        .update(precursorStock)
        .set({
          quantity_units: sql`${precursorStock.quantity_units} - ${params.batchUnits}`,
          updated_at: sql`now()`,
        })
        .where(
          and(
            eq(precursorStock.player_id, params.playerId),
            eq(precursorStock.building_id, params.buildingId),
            eq(precursorStock.precursor_type, params.precursorType),
            sql`${precursorStock.quantity_units} >= ${params.batchUnits}`,
          ),
        )
        .returning({ stock_id: precursorStock.stock_id });
      if (debited.length === 0) {
        // Insufficient precursor (or no stock row) → refuse the whole cook (the tx rolls back the no-op).
        return null;
      }

      const [row] = await tx
        .insert(cookSession)
        .values({
          player_id: params.playerId,
          lab_building_id: params.buildingId,
          substance_type: params.substanceType,
          current_stage: 'stage_1',
          started_at_tick: params.startedAtTick,
          stage_started_at_tick: params.startedAtTick,
          // Refining passes chosen at cook start (Ash time↔purity lever — T3). Defaults 0 (the column default) when omitted,
          // so a non-Ash cook insert is byte-identical to the pre-T3 INSERT (the column is simply set to its own default).
          refining_passes: params.refiningPasses ?? 0,
          // The captured tenure efficiency-bonus yield multiplier (permille ×1000) for a DELEGATED COOK (Phase-11b C1).
          // Omitted (a player-MANUAL cook) → NULL → byte-identical insert (C2 reads NULL as ×1). A delegated COOK passes
          // a real permille (FRESH → 1000). CAPTURE-at-start; C2 APPLIES it at COOK_ADVANCE completion (this file never does).
          delegated_yield_permille: params.delegatedYieldPermille ?? null,
        })
        .returning({ cook_session_id: cookSession.cook_session_id });
      return row.cook_session_id;
    });
  }

  /**
   * READ the current quantity_units for a (player, building, precursorType) — the upfront stock check at startCook for
   * secondary precursors (Thalmite / Garnet salt). Returns 0 when no stock row exists (never ordered / delivered). NOT
   * a write — the guard-decrement happens separately in consumePrecursorAndCreateCook (primary) or
   * guardedConsumePrecursor (stage-advance secondary). A plain SELECT; the caller compares to the required batch units.
   */
  async getPrecursorStock(playerId: string, buildingId: string, precursorType: CookPrecursorType): Promise<number> {
    const rows = await this.db
      .select({ qty: sql<number>`coalesce(sum(${precursorStock.quantity_units}), 0)::int` })
      .from(precursorStock)
      .where(
        and(
          eq(precursorStock.player_id, playerId),
          eq(precursorStock.building_id, buildingId),
          eq(precursorStock.precursor_type, precursorType),
        ),
      );
    return Number(rows[0]?.qty ?? 0);
  }

  /**
   * GUARDED precursor decrement for the stage-advance tick — consumes `batchUnits` of `precursorType` from the
   * building's stock, with the SAME guarded-decrement pattern as `consumePrecursorAndCreateCook` (UPDATE …
   * WHERE quantity_units >= batchUnits). Returns true when the decrement succeeded, false when the stock was
   * insufficient (the UPDATE touched 0 rows → the stock would have gone negative). NOT wrapped in a larger tx
   * here; the caller (ProductionCookAdvanceService) holds responsibility for skipping the stage advance when false
   * is returned (defensive cook-block). No cook_session write — only a stock debit.
   */
  async guardedConsumePrecursor(
    playerId: string,
    buildingId: string,
    precursorType: CookPrecursorType,
    batchUnits: number,
  ): Promise<boolean> {
    const debited = await this.db
      .update(precursorStock)
      .set({
        quantity_units: sql`${precursorStock.quantity_units} - ${batchUnits}`,
        updated_at: sql`now()`,
      })
      .where(
        and(
          eq(precursorStock.player_id, playerId),
          eq(precursorStock.building_id, buildingId),
          eq(precursorStock.precursor_type, precursorType),
          sql`${precursorStock.quantity_units} >= ${batchUnits}`,
        ),
      )
      .returning({ stock_id: precursorStock.stock_id });
    return debited.length > 0;
  }

  // ───────────────────────────── cook-advance tick (the operational tick-hook) ─────────────────────────────

  /**
   * Batch-read ALL in-progress cook sessions for a player (current_stage IN the 4 functional stages) in ONE query —
   * the per-tick advance input (the Phase-1 determinism discipline: batched read, no per-row queries). Ordered by
   * cook_session_id for deterministic batching. Returns [] when the player has no cook in progress (the common case —
   * the tick is then a no-op).
   *
   * OPERATIONAL GATE (Phase-2b T2 — production_brindle.md §Invariant 5 "la production ne peut démarrer/progresser que
   * sur un building LAB operational"): the cook only advances while its LAB's structural_state is 'operational'. A
   * raided lab is 'damaged' (T1 RaidExecutionService) → its cook is EXCLUDED here, so the COOK_ADVANCE tick FREEZES it
   * (no stage progression / no completion / no yield) until repaired (T3). INNER JOIN building_operational_state on the
   * cook's lab_building_id + structural_state='operational' — behavior-PRESERVING for operational labs (only narrows
   * the row set; an operational lab's cook is selected exactly as before).
   */
  async listInProgressCooks(playerId: string): Promise<InProgressCook[]> {
    const rows = await this.db
      .select({
        cook_session_id: cookSession.cook_session_id,
        lab_building_id: cookSession.lab_building_id,
        substance_type: cookSession.substance_type,
        current_stage: cookSession.current_stage,
        stage_started_at_tick: cookSession.stage_started_at_tick,
        refining_passes: cookSession.refining_passes,
        // The other two Ash purity levers, read at COMPLETION for a luxuryChannel cook (T6): the DAMAGED-pause counter
        // (T4, on the cook row) + the lab's lab_tier (T5, on the already-joined building_operational_state row). Carried
        // for every cook; only an Ash completion consumes them (non-Ash ignores them — behavior-preserving).
        damaged_pauses_during_cook: cookSession.damaged_pauses_during_cook,
        lab_tier: buildingOperationalState.lab_tier,
        // D1 C6 — the building's equipment_tier for Brindle yield scaling. Read from the already-joined
        // building_operational_state. For Brindle cooks: yieldGrams = yieldGramsForEquipmentTier(equipment_tier).
        // For non-Brindle (Crick/Hush/Ash) the field is carried but ignored (descriptor.yieldGrams — byte-identical).
        equipment_tier: buildingOperationalState.equipment_tier,
        // The tenure yield multiplier (permille ×1000) captured at startCook for a DELEGATED COOK (Phase-11b C1) — applied
        // at COMPLETION (C2) to scale this cook's flat yield. NULL for a player-manual cook → COOK_ADVANCE reads it as ×1.
        delegated_yield_permille: cookSession.delegated_yield_permille,
        // 04f-A C2 (D1/D5) — the D1 anchor pair, read from the already-joined building_operational_state (zero
        // extra query — the SAME row equipment_tier/lab_tier come from). Fed into the output-fold multiplier at
        // completion.
        last_maintained_at_game_day: buildingOperationalState.last_maintained_at_game_day,
        maintenance_due_in_days: buildingOperationalState.maintenance_due_in_days,
      })
      .from(cookSession)
      // The cook's building must be structurally OPERATIONAL (Phase-2b raid gate) — a damaged/repairing building freezes its cook.
      .innerJoin(buildingOperationalState, eq(buildingOperationalState.building_id, cookSession.lab_building_id))
      .where(
        and(
          eq(cookSession.player_id, playerId),
          inArray(cookSession.current_stage, FUNCTIONAL_COOK_STAGES),
          eq(buildingOperationalState.structural_state, 'operational'),
        ),
      )
      .orderBy(cookSession.cook_session_id);
    return rows;
  }

  /**
   * Apply ONE cook's stage advance (NOT a completion): set current_stage → nextStage and re-anchor
   * stage_started_at_tick = currentTick. ONE typed UPDATE keyed by the session id. Used by the tick when a stage's
   * uniform duration has elapsed but the cook has not finished its 4th stage.
   */
  async advanceCookStage(
    playerId: string,
    cookSessionId: string,
    nextStage: FunctionalCookStage,
    currentTick: number,
  ): Promise<void> {
    await this.db
      .update(cookSession)
      .set({ current_stage: nextStage, stage_started_at_tick: currentTick })
      .where(and(eq(cookSession.player_id, playerId), eq(cookSession.cook_session_id, cookSessionId)));
  }

  /**
   * COMPLETE one cook ATOMICALLY in ONE transaction (the persisted-system template):
   *   (a) mark the session current_stage='completed' + stamp the deterministic cut_purity_bucket, and
   *   (b) yield the product into product_storage on the destination building — an UPSERT per (player, building,
   *       substance): increment quantity_grams on the existing row, else insert a fresh row at the yield. product_
   *       storage has NO unique constraint on (player, building, substance), so the upsert is a guarded
   *       UPDATE-then-INSERT-if-absent (the RETURNING length is the authoritative "did a row exist" test). The
   *       purity_grade is set to the M1 deterministic default on insert (the weighted-average mixing model is
   *       DEFERRED; M1 keeps the destination's existing purity_grade on a bump — a single deterministic grade in M1).
   * Wrapped in one tx so a cook is never completed without its product landing (and vice-versa).
   */
  async completeCookWithYield(playerId: string, cookSessionId: string, y: CookYield): Promise<void> {
    await this.db.transaction(async (tx) => {
      // (a) Mark the session completed + stamp the M1 cut bucket.
      await tx
        .update(cookSession)
        .set({ current_stage: 'completed', cut_purity_bucket: y.cut_purity_bucket })
        .where(and(eq(cookSession.player_id, playerId), eq(cookSession.cook_session_id, cookSessionId)));

      // (b) Upsert the product into product_storage on the destination building, keyed by the cook's SUBSTANCE
      //     (Brindle or Crick — the (player, building, substance_type) product_storage key, T3 substance-generic).
      //     The produced storage row id is captured (RETURNING on BOTH the bump + the insert) so the Ash purity stamp
      //     can key its batch_purity row to it (step c).
      const bumped = await tx
        .update(productStorage)
        .set({
          quantity_grams: sql`${productStorage.quantity_grams} + ${y.quantity_grams}`,
          updated_at: sql`now()`,
        })
        .where(
          and(
            eq(productStorage.player_id, playerId),
            eq(productStorage.building_id, y.building_id),
            eq(productStorage.substance_type, y.substance_type),
          ),
        )
        .returning({ storage_id: productStorage.storage_id });
      let storageId: string;
      if (bumped.length === 0) {
        // No existing product_storage row for this (player, building, substance) → seed it at the yield.
        const [seeded] = await tx
          .insert(productStorage)
          .values({
            player_id: playerId,
            building_id: y.building_id,
            substance_type: y.substance_type,
            quantity_grams: y.quantity_grams,
            purity_grade: y.purity_grade,
          })
          .returning({ storage_id: productStorage.storage_id });
        storageId = seeded.storage_id;
      } else {
        storageId = bumped[0].storage_id;
      }

      // (c) ASH PURITY STAMP (T6 — the distinct Ash mechanic): if this completion carries a derived purity_score (an Ash
      //     luxuryChannel cook — the cook-advance gates on descriptor.luxuryChannel before computing it), stamp it onto a
      //     batch_purity row keyed to the produced storage row (set-based, once, in THIS same completion tx). Upsert on
      //     the storage_id PK so a re-yield into the SAME storage row (a later Ash cook bumping the existing aggregate)
      //     re-stamps the latest purity rather than violating the PK. NON-luxuryChannel cooks pass purity_score undefined
      //     → this block is SKIPPED → no batch_purity row exists for them (Brindle/Crick/Hush byte-identical).
      if (y.purity_score !== undefined) {
        await tx
          .insert(batchPurity)
          .values({ storage_id: storageId, player_id: playerId, purity_score: y.purity_score })
          .onConflictDoUpdate({
            target: batchPurity.storage_id,
            set: { purity_score: y.purity_score, updated_at: sql`now()` },
          });
      }
    });
  }

  // ───────────────────────────── projection reads (Step 3) ─────────────────────────────

  /**
   * The most-recent cook session's state for a (player, building) — the projection's stage + substance INPUTS (the
   * stage maps to a qualitative BAND; never the raw stage clock; the substance maps to the qualitative substance
   * label). Ordered by started_at_tick DESC so the projection reflects the latest cook (an in-progress one, else the
   * last completed). Returns null when the building has never had a cook. Building-type-agnostic (a lab or a refinery).
   */
  async getLatestCookState(playerId: string, buildingId: string): Promise<CookStateRow | null> {
    const rows = await this.db
      .select({
        cook_session_id: cookSession.cook_session_id,
        substance_type: cookSession.substance_type,
        current_stage: cookSession.current_stage,
      })
      .from(cookSession)
      .where(and(eq(cookSession.player_id, playerId), eq(cookSession.lab_building_id, buildingId)))
      .orderBy(sql`${cookSession.started_at_tick} desc`)
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * The current product quantity for a (player, building, substance) (the projection's raw INPUT — mapped to a BAND by
   * the projection, NEVER forwarded raw; R2.2). The substance is parameterized (Brindle for a lab, Crick for a
   * refinery — resolved by the projection from the building's latest cook / type). Returns 0 when no storage row
   * exists yet. Aggregates with SUM rather than reading a single row: product_storage has no DB unique constraint on
   * (player, building, substance) — the yield upsert maintains one row per key by writer discipline, but the SUM keeps
   * the band correct regardless of row count. The raw grams are read here only to bucket it; never surfaced.
   */
  async getProductQuantityGrams(
    playerId: string,
    buildingId: string,
    substanceType: ProductSubstanceType,
  ): Promise<number> {
    const rows = await this.db
      .select({ total: sql<number>`coalesce(sum(${productStorage.quantity_grams}), 0)::int` })
      .from(productStorage)
      .where(
        and(
          eq(productStorage.player_id, playerId),
          eq(productStorage.building_id, buildingId),
          eq(productStorage.substance_type, substanceType),
        ),
      );
    return Number(rows[0]?.total ?? 0);
  }

  /**
   * The batch purity_score for a (player, building, substance) cook building's produced batch — the FORMAL T9 batch
   * purity_band projection INPUT (the raw score is mapped to a closed band by the projection, NEVER forwarded raw;
   * R2.2). The score is stamped at cook completion onto a batch_purity row keyed to the produced product_storage row
   * (T6 — luxuryChannel/Ash only). This reads that score by joining batch_purity ⋈ product_storage on storage_id,
   * scoped to the (player, building, substance), taking the most-recently-stamped row (ORDER BY batch_purity.updated_at
   * DESC, storage_id DESC — the storage_id secondary makes the pick deterministic if two batches share a timestamp) —
   * the batch the player most recently cooked at this lab. Returns null when no batch_purity row exists (a
   * non-Ash substance has none → byte-identical, or an Ash building with no completed cook yet) → the projection maps
   * null to "no band" (the batch has no purity grade to surface). NOT a write.
   */
  async getBatchPurityScore(
    playerId: string,
    buildingId: string,
    substanceType: ProductSubstanceType,
  ): Promise<number | null> {
    const rows = await this.db
      .select({ purity_score: batchPurity.purity_score })
      .from(batchPurity)
      .innerJoin(productStorage, eq(productStorage.storage_id, batchPurity.storage_id))
      .where(
        and(
          eq(batchPurity.player_id, playerId),
          eq(productStorage.building_id, buildingId),
          eq(productStorage.substance_type, substanceType),
        ),
      )
      .orderBy(sql`${batchPurity.updated_at} desc, ${batchPurity.storage_id} desc`)
      .limit(1);
    return rows.length > 0 ? Number(rows[0].purity_score) : null;
  }
}
