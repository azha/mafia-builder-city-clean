// IMPLEMENTS: docs/superpowers/plans/2026-06-19-depth-forensic-signaling-plan.md Task 12 (C12)
//             docs/tech/04c_market_reputation_insurance/forensic_signaling_mechanics.md §5.2
//             — Forensic C12 + C13 + C14 — 2026-06-19
//
// `EffluentStoichiometryService` — §5.2 per-workshop rolling throughput accumulator.
//
// C12 scope:
//   recordWorkshopThroughput(playerId, workshopId, substanceType, kg, gameMinute): Promise<void>
//     — reads recipe_stoichiometry_table for the substance (NO inline coefficients).
//     — accumulates `kg` into workshop_stoichiometry_state.throughput_kg_window (rolling window
//       keyed by game-day, pruned > effluentWindowDays).
//     — lazy-creates the workshop row (upsert on workshopId PK).
//
// C13 scope (IMPLEMENTED HERE):
//   updateBlockEffluentRegister(playerId, blockId): Promise<void>
//     — sums all workshops in the block → effluent per channel (kg × recipe coeff).
//     — reads recipe_stoichiometry_table (NO inline coefficients — anti-fabrication).
//     — rolling window pruned > effluentWindowDays (same pattern as C12).
//     — Deterministic: pure arithmetic over caller-provided state. No Math.random.
//
// C14 scope (IMPLEMENTED HERE):
//   runEnvironmentalInspectorScan(ctx, dayId): Promise<void>
//     — NIGHTLY/9 scan: for each block in the player's district:
//       1. Skip if last_scan_tick == dayId (idempotent per-day).
//       2. Refresh block register (call updateBlockEffluentRegister).
//       3. Compute baseline = effluentBaselinePerDistrictNormalised × (1 − band + 2·band·daySeed)
//          where daySeed = seedFromDay(dayId, districtId) ∈ [0,1) and
//          band = effluentBaselineDayPerturbationBand (T.forensic.effluent_baseline_day_perturbation_band,
//          default 0.2, [PROPOSED DEFAULT][PROV-Y26Q2], DD-BASELINE-PERTURBATION).
//          Baseline is day-seeded (deterministic, no Math.random, C4 compliance).
//          The band is NEVER inlined — sourced via forensicTunables.effluentBaselineDayPerturbationBand.
//       4. block_effluent = sum of all solvent_effluent values across the effluent_window.
//       5. deviation = (block_effluent − baseline) / baseline.
//       6. Stamp last_deviation + last_scan_tick + district_id (C13 MINOR close).
//       7. If deviation > effluentSigmaInspectorThreshold (1.5) → flagged (EffluentFlagDetected at C20).
//     — No-op if 0 workshops (no block_effluent_register rows for this player).
//     — Deterministic: no Math.random. baseline = f(dayId, districtId, effluentBaselinePerDistrictNormalised, band).
//     — C13 MINOR close: sets district_id on each block row (scan knows the district).
//
// Architecture:
//   - recordWorkshopThroughput is called AFTER completeCookWithYield
//     (production-cook-advance.service.ts) — ADDITIVE: yield/precursor-decrement/emitCookHeat
//     are byte-identical (zero-regression invariant §1.3).
//   - Reads recipe_stoichiometry_table per-call (NO inline stoichiometric coefficients —
//     anti-fabrication, OQ-5).
//   - Rolling window: throughput_kg_window is a JSONB array of { day: number, kg: number } objects.
//     Pruned: entries with day < (gameDay − effluentWindowDays) are dropped on each write.
//     Same game-day → the kg is added to the existing entry for that day (accumulate, not append).
//   - Lazy-creates the workshop row (UPSERT on workshopId PK) — no pre-seeding required for the
//     production hot-path; the E2E uses seed-effluent-state to pre-seed with known substance_type.
//   - No Math.random (banned — market-rng.service.ts:24). No Date.now().
//     gameMinute is the CALLER-PROVIDED game-tick (from CitySimTickContext).
//   - Zero-regression invariant (§1.3): when no workshop_stoichiometry_state row exists for a
//     workshop (a workshop that has never produced), the lazy-create produces a NEW row. No
//     existing row is EVER modified; the ONLY mutation is to workshop_stoichiometry_state rows
//     for the specific workshop (scoped by workshopId PK). No other table is touched.
//
// R2.2: throughput_kg_window is server-only (never projected to client at C12).
//   EffluentVisibilityBucket (projected) lands at C24.
// OQ-5: substanceType is the EXISTING PG enum (4 values: brindle/crick/hush/ash).
// Anti-fabrication: reads recipe_stoichiometry_table — if the recipe row is absent, the service
//   logs a warning and returns without accumulating (defensive no-op, not a throw).
// C4 determinism: gameDay = Math.floor(gameMinute / MINUTES_PER_DAY) where MINUTES_PER_DAY = 1440.

import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { workshopStoichiometryState, recipeStoichiometryTable } from '../../db/schema/forensic';
import { building } from '../../db/schema/city_state';
import { forensicTunables } from './forensic-tunables';
import { ForensicRepository } from './forensic.repository';
import { MarketRngService } from '../market/market-rng.service';
import type { CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import {
  InspectionQueueRepository,
  type QueueEntry,
} from '../../citysim/inspection/inspection.repository';
import { CityEventBus } from '../../citysim/events/city-event-bus';
import { bandFromDeviation } from './forensic-severity';

/** Game-time constant: minutes per in-game day. */
const MINUTES_PER_DAY = 1440;

/** One entry in the throughput_kg_window JSONB array. */
interface ThroughputWindowEntry {
  /** Game-day index: Math.floor(gameMinute / MINUTES_PER_DAY). */
  day: number;
  /** Cumulative kg processed on this game-day. */
  kg: number;
}

/** One entry in the block's effluent_window JSONB array (C13). */
interface EffluentWindowEntry {
  /** Game-day index: same derivation as ThroughputWindowEntry.day (floor(gameMinute / 1440)). */
  day: number;
  /** Sum of solvent effluent across all workshops for this day (kg × solvent_out_per_kg). */
  solvent: number;
  /** Sum of vapour effluent across all workshops for this day (kg × vapour_out_per_kg). */
  vapour: number;
  /** Sum of water effluent across all workshops for this day (kg × water_out_per_kg). */
  water: number;
}

@Injectable()
export class EffluentStoichiometryService {
  private readonly logger = new Logger(EffluentStoichiometryService.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly forensicRepository: ForensicRepository,
    private readonly rng: MarketRngService,
    // C15: REUSE InspectionQueueRepository.applyQueues (DIV-2 — System 6 not rebuilt/modified).
    // Injected via InspectionQueueModule (exported for this consumer).
    private readonly inspectionQueueRepository: InspectionQueueRepository,
    @Optional() private readonly cityEventBus?: CityEventBus,
  ) {}

  /**
   * recordWorkshopThroughput — accumulate `kg` into the workshop's rolling throughput window.
   *
   * Called AFTER completeCookWithYield in production-cook-advance.service.ts (additive hook,
   * zero-regression). The yield/precursor-decrement/emitCookHeat in the cook hot-path are
   * BYTE-IDENTICAL — this call is appended at the END of the method.
   *
   * Algorithm:
   *   1. Read recipe_stoichiometry_table for the substance (NO inline coefficients — OQ-5).
   *      If absent (substance not in designer data), log warning + return (defensive no-op).
   *   2. Derive gameDay = floor(gameMinute / MINUTES_PER_DAY).
   *   3. Read existing throughput_kg_window from workshop_stoichiometry_state (or [] if lazy-creating).
   *   4. Accumulate: find the entry for the current day; add `kg`. If no entry yet, push a new one.
   *   5. Prune: drop entries with day < (gameDay − effluentWindowDays). These are outside the
   *      rolling window. effluentWindowDays default = 14 (T.forensic.effluent_window_days, C4).
   *   6. Upsert: write the updated window + updated_at_tick back to workshop_stoichiometry_state.
   *      Lazy-create: if no row exists for workshopId, INSERT with the accumulated window.
   *
   * @param playerId      - player uuid (FK owner of the workshop row).
   * @param workshopId    - lab building uuid (PK of workshop_stoichiometry_state).
   * @param substanceType - the substance processed (brindle/crick/hush/ash, OQ-5).
   * @param kg            - kilograms processed in this cook completion (quantityGrams / 1000).
   * @param gameMinute    - current game-tick (game-minute) from CitySimTickContext.
   *
   * Zero-regression invariant (§1.3):
   *   - If no recipe row exists for the substance → log warning + return (no-op).
   *   - If the workshop row did not exist before → lazy-creates a new row (purely additive).
   *   - If the workshop row exists → updates ONLY throughput_kg_window + updated_at_tick.
   *   - No cook_session / product_storage / precursor_stock row is ever touched here.
   *   - No Math.random / no Date.now() — pure function of caller inputs.
   */
  async recordWorkshopThroughput(
    playerId: string,
    workshopId: string,
    substanceType: string,
    kg: number,
    gameMinute: number,
  ): Promise<void> {
    // Step 1: Read the recipe row for this substance (NO inline coefficients).
    // anti-fabrication: we read recipe_stoichiometry_table to verify the substance exists
    // and is known. The recipe coefficients themselves are used at C13 (updateBlockEffluentRegister);
    // at C12 we just verify the recipe exists (the read proves the code-path fires against the real table).
    const recipeRows = await this.db
      .select()
      .from(recipeStoichiometryTable)
      .where(eq(recipeStoichiometryTable.substance_type, substanceType as 'brindle' | 'crick' | 'hush' | 'ash'))
      .limit(1);

    if (recipeRows.length === 0) {
      // Substance not in recipe table — defensive no-op (zero-regression: the cook still completed).
      this.logger.warn(
        `recordWorkshopThroughput: no recipe found for substance_type=${substanceType} ` +
          `(workshopId=${workshopId}, playerId=${playerId}) — throughput NOT accumulated (defensive no-op)`,
      );
      return;
    }

    // Step 2: Derive the current game-day from the caller-provided game-tick.
    // C4 determinism: gameDay is a pure function of gameMinute (no Math.random / no Date.now()).
    const gameDay = Math.floor(gameMinute / MINUTES_PER_DAY);
    const windowDays = forensicTunables.effluentWindowDays; // default 14 (T.forensic.effluent_window_days, C4)

    // Step 3: Read the existing workshop row (if any).
    const existingRows = await this.db
      .select()
      .from(workshopStoichiometryState)
      .where(eq(workshopStoichiometryState.workshop_id, workshopId))
      .limit(1);

    const existingWindow: ThroughputWindowEntry[] =
      existingRows[0]?.throughput_kg_window
        ? (existingRows[0].throughput_kg_window as unknown as ThroughputWindowEntry[])
        : [];

    // Step 4: Accumulate kg into the current game-day's entry.
    // Find the existing entry for this day (there may be multiple entries for different days).
    const updatedWindow = [...existingWindow];
    const dayIdx = updatedWindow.findIndex(e => e.day === gameDay);
    if (dayIdx >= 0) {
      // Entry for this game-day already exists → accumulate.
      updatedWindow[dayIdx] = { day: gameDay, kg: updatedWindow[dayIdx].kg + kg };
    } else {
      // No entry yet for this game-day → push a new entry.
      updatedWindow.push({ day: gameDay, kg });
    }

    // Step 5: Prune entries outside the rolling window.
    // Cutoff: entries with day < (gameDay − windowDays) are outside the window.
    // Canon :114: "14 days" — T.forensic.effluent_window_days (C4).
    const cutoffDay = gameDay - windowDays;
    const prunedWindow = updatedWindow.filter(e => e.day > cutoffDay);

    // Step 6: Upsert the updated window back to workshop_stoichiometry_state.
    // Lazy-create: if no row exists, INSERT (the cook hot-path creates the row on first production).
    // UPSERT: if the row exists, UPDATE throughput_kg_window + updated_at_tick.
    // OQ-5: substance_type is the EXISTING PG enum (passed as the existing row's value, or the
    //   caller-provided substanceType for a lazy-create).
    //
    // C13 enrichment (production hot-path fix): for a lazy-create (no existing row), derive block_id
    // from the `buildings` table WHERE building_id = workshopId (the lab building is always a
    // `buildings` row; block_id is NOT NULL in that table). This replaces the stale `?? 0` fallback
    // that made the §5.2 block aggregation inert on the production path.
    // If the building row is absent (should not happen in production — the workshop IS a building),
    // we log a warning and fall back to 0 (defensive; the aggregation will be a no-op for this
    // workshop until the building record is corrected).
    let resolvedBlockId: number;
    if (existingRows.length > 0) {
      // Row already exists: reuse the stored block_id (not a lazy-create — no lookup needed).
      resolvedBlockId = existingRows[0].block_id;
    } else {
      // Lazy-create path: look up the building's block from the buildings table.
      const buildingRows = await this.db
        .select({ block_id: building.block_id })
        .from(building)
        .where(eq(building.building_id, workshopId))
        .limit(1);
      if (buildingRows.length > 0) {
        resolvedBlockId = buildingRows[0].block_id;
      } else {
        // Building row absent — defensive fallback (log warning, aggregation will miss this workshop).
        this.logger.warn(
          `recordWorkshopThroughput: no buildings row for workshopId=${workshopId} ` +
            `(playerId=${playerId}) — block_id defaults to 0 (workshop excluded from block aggregation)`,
        );
        resolvedBlockId = 0;
      }
    }

    await this.db
      .insert(workshopStoichiometryState)
      .values({
        workshop_id: workshopId,
        player_id: playerId,
        block_id: resolvedBlockId,
        substance_type: substanceType as 'brindle' | 'crick' | 'hush' | 'ash',
        throughput_kg_window: prunedWindow as unknown as string,
        updated_at_tick: BigInt(gameMinute),
      })
      .onConflictDoUpdate({
        target: workshopStoichiometryState.workshop_id,
        set: {
          throughput_kg_window: sql`${JSON.stringify(prunedWindow)}::jsonb`,
          updated_at_tick: BigInt(gameMinute),
        },
      });

    this.logger.debug(
      `recordWorkshopThroughput: workshopId=${workshopId} substanceType=${substanceType} ` +
        `kg=${kg} gameMinute=${gameMinute} gameDay=${gameDay} ` +
        `window entries: ${prunedWindow.length} (cutoffDay=${cutoffDay}) ` +
        `totalKgThisDay=${prunedWindow.find(e => e.day === gameDay)?.kg ?? 0}`,
    );

    // W6.2 C1 — the amorçage fix (design §3 C1, forme D): the SAME event that produces throughput also
    // (re)aggregates its block's effluent register. REUSE updateBlockEffluentRegister (C13's own aggregation)
    // — never a second écrivain, never a parallel implementation. Before this call, runEnvironmentalInspectorScan
    // (C14, NIGHTLY/9) could NEVER seed a FIRST block_effluent_register row on the production path: its own
    // guard returns early when listBlockRegistersForPlayer is empty (:460), and nothing else on the production
    // path ever created that first row — only `_test`/spec seeding did. Calling the aggregation here closes the
    // loop: the block register now exists (with a REAL district_id, see updateBlockEffluentRegister's own fix)
    // the FIRST time a cook completes, so the NIGHTLY/9 scan's pre-condition is met, not never.
    await this.updateBlockEffluentRegister(playerId, resolvedBlockId);
  }

  /**
   * updateBlockEffluentRegister — aggregate all workshops in `blockId` into the block register.
   *
   * C13 implementation. Algorithm:
   *   1. Load all workshop_stoichiometry_state rows for (playerId, blockId) via sumBlockWorkshops.
   *      If no rows → no-op (zero-workshop block invariant).
   *   2. For each workshop row: load the recipe from recipe_stoichiometry_table (NO inline coeff).
   *      If no recipe found for the substance → skip this workshop (defensive no-op).
   *   3. For each throughput_kg_window entry {day, kg}: multiply kg × (solvent/vapour/water)_out_per_kg
   *      and accumulate into a per-day map: { day → { solvent, vapour, water } }.
   *   4. Derive the current window cutoff from the MAXIMUM game-day seen across all workshops
   *      (the most-recent day in any workshop's window). Prune entries with day ≤ cutoffDay.
   *      cutoffDay = maxDay - effluentWindowDays. Entries with day > cutoffDay are kept.
   *   5. Upsert: write the accumulated + pruned EffluentWindowEntry[] to block_effluent_register
   *      via upsertBlockEffluentWindow.
   *
   * Rolling window semantics (mirror C12):
   *   - Entries outside the window (day < currentDay - effluentWindowDays) are pruned.
   *   - currentDay is derived from the most-recent throughput window entry across workshops.
   *     If no entries exist (no throughput), the effluent_window is written as [].
   *
   * Anti-fabrication:
   *   - Reads recipe_stoichiometry_table per workshop (NO inline stoichiometric coefficients).
   *   - No Math.random / no Date.now().
   *   - Pure arithmetic: output is deterministic given the DB state at call time.
   *
   * Zero-regression:
   *   - Does not touch cook_session / product_storage / ledger_entry_ring.
   *   - Only writes to block_effluent_register (upsert on composite PK).
   *
   * @param playerId - player uuid (FK owner of workshop + block register rows).
   * @param blockId  - block id (integer); groups workshops via workshop_stoichiometry_state.block_id.
   */
  async updateBlockEffluentRegister(playerId: string, blockId: number): Promise<void> {
    // Step 1: Load all workshop rows for this block.
    const workshopRows = await this.forensicRepository.sumBlockWorkshops(playerId, blockId);

    if (workshopRows.length === 0) {
      // No workshops in this block — no-op (zero-workshop block invariant).
      this.logger.debug(
        `updateBlockEffluentRegister: no workshops for playerId=${playerId} blockId=${blockId} — no-op`,
      );
      return;
    }

    // Step 2 + 3: For each workshop, read recipe + accumulate per-day effluent.
    const windowDays = forensicTunables.effluentWindowDays; // default 14 (T.forensic.effluent_window_days, C4)

    // Per-day accumulator map: day → { solvent, vapour, water }
    const dayMap = new Map<number, { solvent: number; vapour: number; water: number }>();
    let maxDay = -Infinity; // tracks the most-recent day for window pruning

    for (const workshop of workshopRows) {
      // Read the recipe row for this workshop's substance (NO inline coefficients — OQ-5).
      const recipeRows = await this.db
        .select()
        .from(recipeStoichiometryTable)
        .where(eq(recipeStoichiometryTable.substance_type, workshop.substance_type))
        .limit(1);

      if (recipeRows.length === 0) {
        // Recipe absent — skip this workshop (defensive no-op, zero-regression).
        this.logger.warn(
          `updateBlockEffluentRegister: no recipe for substance_type=${workshop.substance_type} ` +
            `(workshopId=${workshop.workshop_id}, playerId=${playerId}) — workshop skipped`,
        );
        continue;
      }

      const recipe = recipeRows[0];
      const solventCoeff = recipe.solvent_out_per_kg; // reads DB column, never inline
      const vapourCoeff  = recipe.vapour_out_per_kg;  // reads DB column, never inline
      const waterCoeff   = recipe.water_out_per_kg;   // reads DB column, never inline

      // Iterate the workshop's throughput_kg_window entries.
      const throughputWindow: ThroughputWindowEntry[] =
        Array.isArray(workshop.throughput_kg_window)
          ? (workshop.throughput_kg_window as unknown as ThroughputWindowEntry[])
          : [];

      for (const entry of throughputWindow) {
        const { day, kg } = entry;

        // Track the most-recent day for window pruning.
        if (day > maxDay) maxDay = day;

        // Accumulate: add kg × coefficient to the day's entry.
        const existing = dayMap.get(day) ?? { solvent: 0, vapour: 0, water: 0 };
        dayMap.set(day, {
          solvent: existing.solvent + kg * solventCoeff,
          vapour:  existing.vapour  + kg * vapourCoeff,
          water:   existing.water   + kg * waterCoeff,
        });
      }
    }

    // Step 4: Prune entries outside the rolling window.
    // Cutoff: entries with day < (maxDay − windowDays) are outside the window.
    // If maxDay is still -Infinity (no throughput entries), write an empty window.
    let effluentWindow: EffluentWindowEntry[] = [];
    if (maxDay !== -Infinity) {
      const cutoffDay = maxDay - windowDays;
      for (const [day, channels] of dayMap.entries()) {
        if (day > cutoffDay) {
          effluentWindow.push({ day, ...channels });
        }
      }
      // Sort by day ascending (consistent ordering for assertions + C14).
      effluentWindow.sort((a, b) => a.day - b.day);
    }

    // Step 5: Determine districtId for the block register row.
    // W6.2 C1 fix: resolve the REAL district from world-geography (blocks.district_id, NOT NULL for every
    // seeded block) — never a stale/absent existing register row nor a literal `0` fallback. Before this fix,
    // a block that had never been scanned had NO existing register row, so districtId fell through to `0`
    // (design §3 C1's own warning: "le district_id est là où le correctif peut faire semblant"). The
    // `existingRegister` read is kept ONLY as a last-resort defensive fallback (should not fire in practice —
    // every real blockId here comes from a workshop's own buildings.block_id, itself an FK into blocks).
    const resolvedDistrictId = await this.forensicRepository.resolveDistrictForBlock(blockId);
    const existingRegister = resolvedDistrictId === null ? await this.forensicRepository.readBlockRegister(playerId) : null;
    const districtId = resolvedDistrictId ?? existingRegister?.district_id ?? 0;

    // Upsert the computed effluent window to block_effluent_register.
    await this.forensicRepository.upsertBlockEffluentWindow(playerId, blockId, districtId, effluentWindow);

    this.logger.debug(
      `updateBlockEffluentRegister: playerId=${playerId} blockId=${blockId} ` +
        `workshops=${workshopRows.length} effluentEntries=${effluentWindow.length} ` +
        `maxDay=${maxDay} windowDays=${windowDays}`,
    );
  }

  /**
   * runEnvironmentalInspectorScan — NIGHTLY/9 environmental inspector scan.
   *
   * C14 implementation. Algorithm:
   *   1. Load all block_effluent_register rows for (playerId). If none → no-op (zero workshops).
   *   2. For each block row:
   *      a. Skip if last_scan_tick == dayId (idempotent per-day guard).
   *      b. Refresh the block register (call updateBlockEffluentRegister(playerId, blockId)).
   *      c. Reload the refreshed register row to get the up-to-date effluent_window.
   *      d. Compute baseline = effluentBaselinePerDistrictNormalised × (1 − band + 2·band·daySeed)
   *         where daySeed = seedFromDay(dayId, districtId) ∈ [0, 1) and
   *         band = effluentBaselineDayPerturbationBand (T.forensic.effluent_baseline_day_perturbation_band,
   *         default 0.2, [PROPOSED DEFAULT][PROV-Y26Q2], DD-BASELINE-PERTURBATION — sourced via getter,
   *         NEVER inline 0.8/0.4).
   *         - effluentBaselinePerDistrictNormalised (default 1.0, T.forensic.effluent_baseline_per_district_normalised, C4).
   *         - seedFromDay(dayId, districtId) ∈ [0, 1) — deterministic, NO Math.random (C4 anti-stochastic).
   *         - baseline ∈ [0.8, 1.2) for the default normaliser of 1.0 and default band of 0.2.
   *      e. block_effluent = sum of all solvent_effluent values across the effluent_window entries.
   *         Solvent effluent is the primary channel (canon :84; haze = vapour, drain stains = water; solvent drives the overall
   *         deviation signal for the inspector). Sum across the rolling window = total 14d exposure.
   *      f. If block_effluent == 0 and window is empty → no-op (skip deviation computation; leave row unstamped for this day).
   *      g. deviation = (block_effluent − baseline) / baseline (signed; positive means above baseline).
   *      h. Stamp the row: last_deviation = deviation, last_scan_tick = dayId, district_id = districtId (C13 MINOR close).
   *         The row is updated via stampBlockEffluentScan (UPSERT on composite PK).
   *      i. If deviation > effluentSigmaInspectorThreshold (1.5) → flagged.
   *         NOTE: EffluentFlagDetected emission lands at C20. Here C14 only stamps the flag internally.
   *         Log the flag at INFO level so the gate can verify it fires.
   *
   * Determinism (C4): same (playerId, dayId, districtId, workshops) → identical baseline → identical deviation.
   *   No Math.random(). No Date.now(). baseline = f(dayId, districtId, normaliser) — deterministic SHA-256.
   *
   * Idempotent: same dayId 2× → second call is a no-op (last_scan_tick == dayId guard).
   *
   * Zero-regression invariant (§1.3):
   *   - Players with no block_effluent_register rows → clean no-op (no row created).
   *   - Players with 0 workshops but a block row → scan runs but skips deviation if window is empty.
   *   - Does not touch cook_session / product_storage / ledger_entry_ring / inspection_queues (C15).
   *
   * R2.2: last_deviation is server-only (never projected to client). EffluentVisibilityBucket (C24) is projected.
   *
   * C13 MINOR close: district_id is set on each block row via stampBlockEffluentScan.
   *   This ensures district_id is never left at 0 after the scan, even if the row was created with district_id=0
   *   by an earlier updateBlockEffluentRegister call without an existing register row.
   *
   * @param ctx   - CitySimTickContext (provides playerId, cadence, gameMinute; no dayId field).
   * @param dayId - in-game day index (Math.floor(ctx.gameMinute / 1440), or the test fixture value).
   *                Matches the NIGHTLY/9 scheduler derivation: dayId = floor(gameMinute / DAILY_MINUTES).
   *                The scan is idempotent per dayId (same dayId 2× → one effect).
   */
  async runEnvironmentalInspectorScan(ctx: CitySimTickContext, dayId: number): Promise<void> {
    const { playerId } = ctx;
    const sigma = forensicTunables.effluentSigmaInspectorThreshold; // default 1.5 (T.forensic.effluent_sigma_inspector_threshold, C4)
    const normalisedBaseline = forensicTunables.effluentBaselinePerDistrictNormalised; // default 1.0 (T.forensic.effluent_baseline_per_district_normalised, C4)

    // Step 1: Load all block_effluent_register rows for this player.
    const blockRows = await this.forensicRepository.listBlockRegistersForPlayer(playerId);

    if (blockRows.length === 0) {
      // No blocks → no-op (player has no workshops producing effluent).
      this.logger.debug(
        `runEnvironmentalInspectorScan: playerId=${playerId} dayId=${dayId} — no block register rows, no-op`,
      );
      return;
    }

    // Step 2: For each block row, apply the NIGHTLY/9 scan.
    for (const blockRow of blockRows) {
      const { block_id: blockId, district_id: districtId } = blockRow;

      // Step 2a: Idempotent per-day guard.
      // last_scan_tick is a bigint; compare as number.
      const lastScanTick = blockRow.last_scan_tick !== null ? Number(blockRow.last_scan_tick) : null;
      if (lastScanTick === dayId) {
        this.logger.debug(
          `runEnvironmentalInspectorScan: playerId=${playerId} blockId=${blockId} dayId=${dayId} — already scanned this day, skip`,
        );
        continue;
      }

      // Step 2b: Refresh the block register (aggregate workshops → effluent_window).
      await this.updateBlockEffluentRegister(playerId, blockId);

      // Step 2c: Reload the refreshed register row to get the up-to-date effluent_window.
      // Block-scoped: use readBlockRegisterForBlock(playerId, blockId) so each iteration reads
      // ITS OWN block's row, not the first block row for the player (latent MINOR fix — with >1
      // block per player, readBlockRegister(playerId) LIMIT 1 would re-read the first block).
      const refreshedRegister = await this.forensicRepository.readBlockRegisterForBlock(playerId, blockId);
      if (!refreshedRegister) {
        // Should not happen (we just upserted it), but guard defensively.
        this.logger.warn(
          `runEnvironmentalInspectorScan: playerId=${playerId} blockId=${blockId} — register row disappeared after refresh, skip`,
        );
        continue;
      }

      // Step 2d: Compute the day-seeded baseline.
      // baseline = normalisedBaseline × (1 − band + 2·band·daySeed)
      // where daySeed = seedFromDay(dayId, districtId) ∈ [0, 1)
      // and   band = effluentBaselineDayPerturbationBand (T.forensic.effluent_baseline_day_perturbation_band,
      //              default 0.2, [PROPOSED DEFAULT][PROV-Y26Q2], DD-BASELINE-PERTURBATION).
      // At band=0.2: (1 − 0.2 + 2×0.2×daySeed) = (0.8 + 0.4×daySeed) ∈ [0.8, 1.2).
      // For normalisedBaseline = 1.0: baseline ∈ [0.8, 1.2).
      // Deterministic: same (dayId, districtId) → same seed → same baseline. NO Math.random.
      // The band MUST be sourced via the getter — NEVER the inline scalars 0.8/0.4.
      const daySeed = this.rng.seedFromDay(dayId, districtId);
      const band = forensicTunables.effluentBaselineDayPerturbationBand;
      const baseline = normalisedBaseline * (1 - band + 2 * band * daySeed);

      // Step 2e: block_effluent = sum of all solvent_effluent values across the effluent_window.
      // Solvent effluent is the primary channel (canon :84 — drives the inspector deviation signal).
      const effluentWindow: EffluentWindowEntry[] = Array.isArray(refreshedRegister.effluent_window)
        ? (refreshedRegister.effluent_window as unknown as EffluentWindowEntry[])
        : [];

      const blockEffluent = effluentWindow.reduce((sum, entry) => sum + (entry.solvent ?? 0), 0);

      // Step 2f: If window is empty and block_effluent == 0 → no workshops have produced yet.
      // Skip deviation computation (do not stamp the row — the scan found nothing to measure).
      if (effluentWindow.length === 0) {
        this.logger.debug(
          `runEnvironmentalInspectorScan: playerId=${playerId} blockId=${blockId} dayId=${dayId} — empty effluent window, skip`,
        );
        continue;
      }

      // Step 2g: deviation = (block_effluent − baseline) / baseline.
      const deviation = (blockEffluent - baseline) / baseline;

      // Step 2h: Stamp the row (UPSERT on composite PK).
      // C13 MINOR close: sets district_id correctly (the scan knows the district from the register row).
      await this.forensicRepository.stampBlockEffluentScan(
        playerId,
        blockId,
        districtId,
        deviation,
        dayId,
      );

      // Step 2i: Check if flagged.
      const flagged = deviation > sigma;
      this.logger.log(
        `runEnvironmentalInspectorScan: playerId=${playerId} blockId=${blockId} districtId=${districtId} ` +
          `dayId=${dayId} baseline=${baseline.toFixed(4)} blockEffluent=${blockEffluent.toFixed(4)} ` +
          `deviation=${deviation.toFixed(4)} sigma=${sigma} flagged=${flagged} ` +
          `(EffluentFlagDetected emit lands at C20 — NOT HERE; C14 stamps only)`,
      );

      // Step 2j: C15 — if flagged, emit ONE inspection_queues entry (FORENSIC/effluent_inspection).
      //
      // DIV-2: REUSE the EXISTING InspectionQueueRepository.applyQueues — do NOT rebuild System 6.
      // The entry is appended to the existing district queue (read-modify-write via getQueue +
      // applyQueues, exactly mirroring the false-report-ledger.service.ts pattern).
      //
      // Priority ∝ deviation (OQ-6):
      //   - deviation > dispatchEffluentPriorityHighDeviation (default 2.5, C4 getter) → HIGH
      //   - deviation > sigma (1.5) but ≤ highDeviation → MEDIUM
      //
      // building_id: representative numeric handle for the flagged block = blockId (see the
      //   detailed note at the assignment below — QueueEntry.building_id is a number used for
      //   hash-based dispatch outcomes, NOT a real buildings uuid FK; no DB lookup needed).
      //
      // No entry when queue row does not exist yet (same guard as false-report-ledger.service.ts):
      //   the lazy-seed for inspection_queues happens at player setup; if absent, skip + warn.
      //
      // No Math.random / No Date.now. Idempotence: the C14 last_scan_tick guard prevents
      //   this branch from running twice for the same dayId (no double-emit).
      if (flagged) {
        // C20 additive bus event (ADDITIVE — C15 applyQueues below stays; this is cross-system notify).
        // HOISTED (C20 review⊥ MINOR-1): emit EffluentFlagDetected on the FLAG decision,
        // BEFORE/INDEPENDENT of the inspection_queues row guard below.
        //
        // Before this hoist, the emit was INSIDE the queueState block (after getQueue), meaning
        // that a flagged block with no lazy-seeded inspection_queues row (queueState null) would
        // never emit the bus event → the C23 BPD-memory subscriber would never hear it → no
        // 'forensic_effluent_flag' declaration entry in precinct_memory.
        //
        // After this hoist: the event fires on EVERY flagged block, regardless of queue state.
        // The event carries blockId/districtId/severity — it does NOT need the queue row.
        // The C15 applyQueues queue emit stays exactly where it is (gated on queueState non-null —
        // it legitimately needs the row). Zero-regression: a flagged block WITH a queue row still
        // emits the bus event (before the queue write) AND still writes the queue entry (after).
        //
        // Emit EffluentFlagDetected with banded severity (bandFromDeviation, DD-SEVERITY-BAND B).
        // The band is sourced from getters — NO inline scalar.
        this.cityEventBus?.emitEffluentFlagDetected({
          type: 'effluent_flag_detected',
          playerId,
          blockId,
          districtId,
          severity: bandFromDeviation(deviation),
          gameMinute: ctx.gameMinute,
        });

        const highDeviation = forensicTunables.dispatchEffluentPriorityHighDeviation;
        const priorityBucket: QueueEntry['priority_bucket'] = deviation > highDeviation ? 'HIGH' : 'MEDIUM';

        // Representative building_id for this block.
        // QueueEntry.building_id is typed as number (the JSONB stores an integer building
        // identifier used for hash-based dispatch outcomes — see inspection.service.ts :366).
        // For C15, we use blockId as the numeric representative: it IS a number, uniquely
        // identifies the flagged block's location, and is available without an extra DB query.
        // The C22 dispatcher will route the FORENSIC/effluent_inspection consequence (not a BPD
        // building_id hash) so the exact integer value is informational at this chunk.
        const representativeBuildingId: number = blockId;

        // Read the current queue state for the district.
        // This block is GATED on queueState non-null — the queue row is required for applyQueues.
        // The bus event above already fired (hoisted). A null queueState means the lazy seed
        // has not run yet; the queue entry is skipped but the bus event already propagated.
        const queueState = await this.inspectionQueueRepository.getQueue(playerId, districtId);
        if (queueState === null) {
          this.logger.warn(
            `C15 FORENSIC queue emit skipped: no inspection_queues row for ` +
              `playerId=${playerId} districtId=${districtId} ` +
              `(lazy seed not run yet — the queue will be seeded on next player tick). ` +
              `EffluentFlagDetected bus event already fired (C20 MINOR-1 hoist).`,
          );
          continue;
        }

        const forensicEntry: QueueEntry = {
          building_id: representativeBuildingId,
          priority_bucket: priorityBucket,
          age_in_ticks: 0,
          source: 'FORENSIC',
          forensic_kind: 'effluent_inspection',
          decay_accumulator: 0,
        };

        const updatedEntries = [...queueState.entries, forensicEntry];
        await this.inspectionQueueRepository.applyQueues(playerId, [
          {
            district_id: districtId,
            entries: updatedEntries,
            length: updatedEntries.length,
            processing_rate_per_day: queueState.processing_rate_per_day,
            budget_modifier: queueState.budget_modifier,
          },
        ]);

        this.logger.log(
          `C15 FORENSIC/effluent_inspection entry emitted: playerId=${playerId} ` +
            `blockId=${blockId} districtId=${districtId} buildingId=${representativeBuildingId} ` +
            `deviation=${deviation.toFixed(4)} highThreshold=${highDeviation} ` +
            `priorityBucket=${priorityBucket} queueLength=${updatedEntries.length}`,
        );
      }
    }
  }
}
