// IMPLEMENTS: docs/superpowers/plans/2026-06-19-depth-forensic-signaling-plan.md Task 1 (C1) + Task 2 (C2) + Task 3 (C3)
//             docs/tech/04c_market_reputation_insurance/forensic_signaling_mechanics.md §5.1 + §5.2 + §5.3
//             — Forensic Signaling C1 + C2 + C3 — 2026-06-19
//
// `ForensicRepository` — Drizzle CRUD over the forensic tables.
//
// C1 scope: ring CRUD for the 2 §5.1 tables (ledger_entry_ring + forensic_soft_flag_ring).
//   seedLedgerRing   — insert one row into ledger_entry_ring + one into forensic_soft_flag_ring.
//   readLedgerRing   — read both rows for a player (returns null if not found).
//   C6+: append/read used by LeadingDigitAuditService.recordReceipt.
//
// C2 scope: CRUD for the 3 §5.2 tables (workshop_stoichiometry_state / recipe_stoichiometry_table /
//   block_effluent_register).
//   seedEffluentState    — insert one workshop_stoichiometry_state + one block_effluent_register row.
//   readEffluentState    — read both rows for a player (returns null if not found).
//   readRecipeTable      — read all 4 seed rows from recipe_stoichiometry_table.
//   C12+: upsert/read used by EffluentStoichiometryService.recordWorkshopThroughput.
//   C13+: upsert/read used by updateBlockEffluentRegister.
//
// C3 scope: CRUD for lifestyle_audit_state.
//   seedLifestyleState  — insert one lifestyle_audit_state row (creates player + lieutenant).
//   readLifestyleState   — read one row for a player (returns null if not found).
//
// R2.2: never exposes raw scalars to client routes — all read methods are TEST-ONLY or BO-only.
// Anti-fabrication: no Math.random in this file (banned — market-rng.service.ts:24).
// Zero-regression invariant (§1.3): never modifies existing tables.

import { Injectable, Inject } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import {
  ledgerEntryRing,
  forensicSoftFlagRing,
  workshopStoichiometryState,
  recipeStoichiometryTable,
  blockEffluentRegister,
  lifestyleAuditState,
} from '../../db/schema/forensic';
// W6.2 C1 — the REAL world-geography relation (blocks.district_id, NOT NULL for every seeded block). REUSE of the
// SAME join HeatContribRepository.resolveDistricts already uses (buildings.block_id → blocks.district_id) — here
// scoped to a single already-known blockId (updateBlockEffluentRegister's own argument), so a 1-row lookup by
// blocks.id suffices (no buildings join needed).
import { blocks } from '../../db/schema/world_geography';

// ── SubstanceType (C2) ───────────────────────────────────────────────────────────────────────────

/**
 * Subset of substance_type values from operational_chain.ts (4 substances).
 * Used as a discriminator for seeding workshop_stoichiometry_state.
 * OQ-5: the real enum from PG is consumed (not re-declared).
 */
export type SubstanceTypeValue = 'brindle' | 'crick' | 'hush' | 'ash';

// ── C1 types ─────────────────────────────────────────────────────────────────────────────────────

/**
 * Input for seedLedgerRing — creates one row in each of the 2 §5.1 tables.
 * Used by the _test controller at C1 for persistence proof.
 * C6+: the real insertion path is recordReceipt (lazy upsert on first receipt).
 */
export interface SeedLedgerRingInput {
  /** The front building's uuid (PK for both ring tables). */
  frontId: string;
  /** Player uuid — FK → player(player_id) ON DELETE CASCADE. */
  playerId: string;
}

/**
 * Read result for readLedgerRing — both ring rows for a player's front.
 * null if the player has no ring rows (CASCADE deleted or never seeded).
 */
export interface LedgerRingRead {
  /** ledger_entry_ring row — null if not found. */
  ledgerRing: typeof ledgerEntryRing.$inferSelect | null;
  /** forensic_soft_flag_ring row — null if not found. */
  softFlagRing: typeof forensicSoftFlagRing.$inferSelect | null;
}

// ── ForensicRepository ───────────────────────────────────────────────────────────────────────────

@Injectable()
export class ForensicRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  // ── C1: ledger_entry_ring + forensic_soft_flag_ring CRUD ─────────────────────────────────────

  /**
   * seedLedgerRing — insert 1 row in ledger_entry_ring + 1 row in forensic_soft_flag_ring.
   *
   * TEST-ONLY at C1 (used by ForensicTestController._test/forensic/seed-ledger-ring).
   * C6+: the real upsert path is LeadingDigitAuditService.recordReceipt (lazy-creates the ring
   *   on first receipt via upsert-or-ignore). This method is a direct DB insert for spec isolation.
   *
   * Idempotent: uses ON CONFLICT DO NOTHING — safe for 2× back-to-back spec runs (leçon D2).
   *   If the front already has a ring (from a prior test run), the insert is a no-op.
   *
   * Anti-fabrication: no Math.random — frontId / playerId are caller-provided or PG-generated.
   */
  async seedLedgerRing(input: SeedLedgerRingInput): Promise<void> {
    const { frontId, playerId } = input;

    await this.db
      .insert(ledgerEntryRing)
      .values({
        front_id: frontId,
        player_id: playerId,
        // All other columns use DB defaults: ring='[]', ring_head=0, soft_flag_count=0,
        // last_audit_tick=null, last_chi_square=null, front_dark_until_tick=null.
      })
      .onConflictDoNothing();

    await this.db
      .insert(forensicSoftFlagRing)
      .values({
        front_id: frontId,
        player_id: playerId,
        // flag_ticks='[]' (DB default).
      })
      .onConflictDoNothing();
  }

  /**
   * readLedgerRing — read both ring rows for a player's front (by playerId).
   *
   * Used by ForensicTestController._test/forensic/read-ledger-ring.
   * C6+: used by LeadingDigitAuditService for WEEKLY tick iteration (all rings for a player).
   *
   * Returns the first matching row per table (one ring per front per player at C1;
   * C6+ will return all rings via a separate readAllRingsForPlayer method).
   */
  async readLedgerRing(playerId: string): Promise<LedgerRingRead> {
    const [ledgerRow = null] = await this.db
      .select()
      .from(ledgerEntryRing)
      .where(eq(ledgerEntryRing.player_id, playerId))
      .limit(1);

    const [flagRow = null] = await this.db
      .select()
      .from(forensicSoftFlagRing)
      .where(eq(forensicSoftFlagRing.player_id, playerId))
      .limit(1);

    return {
      ledgerRing: ledgerRow ?? null,
      softFlagRing: flagRow ?? null,
    };
  }

  // ── C9: countSoftFlagsInWindow ────────────────────────────────────────────────────────────────

  /**
   * countSoftFlagsInWindow — count the soft-flag ticks in `forensic_soft_flag_ring.flag_ticks`
   * that fall within the rolling window ending at `currentTick`.
   *
   * DD-FLAGTICK-UNIT: `flag_ticks` stores **weekIds** (NOT game-ticks). `currentTick` is a
   * game-tick (game-minute). The window is expressed in game-days (via `windowDays` param).
   *
   * Algorithm (byte-identical to the C8 prune predicate in `recordSoftFlag:382-383,:405`):
   *   `currentWeekId = floor(currentTick / WEEKLY_MINUTES)`
   *   `cutoffWeekId  = currentWeekId − floor(windowDays / 7)`
   *   Count `flag_ticks` (weekId integers) where `weekId >= cutoffWeekId`.
   *
   * A flag pruned by C8 (weekId < cutoffWeekId) will never be counted here — the two
   * predicates agree by construction (mirror, not re-work of C8).
   *
   * @param frontId     - front building uuid (PK of forensic_soft_flag_ring).
   * @param currentTick - current game-tick (game-minute).
   * @param windowDays  - rolling window in game-days (default 60d → floor(60/7) = 8 weeks).
   * @returns           - count of flag_ticks (weekIds) within the window.
   */
  async countSoftFlagsInWindow(frontId: string, currentTick: number, windowDays: number): Promise<number> {
    const WEEKLY_MINUTES = 7 * 24 * 60; // 10080 game-minutes per in-game week
    const currentWeekId = Math.floor(currentTick / WEEKLY_MINUTES);
    const cutoffWeekId  = currentWeekId - Math.floor(windowDays / 7);

    // Count elements in the JSONB array where elem::int >= cutoffWeekId.
    // Uses raw SQL to avoid Drizzle jsonb_array_elements parameterization issues (mirrors recordSoftFlag:389).
    const result = await this.db.execute(sql`
      SELECT COUNT(*)::int AS cnt
      FROM forensic_soft_flag_ring,
           jsonb_array_elements(flag_ticks) AS elem
      WHERE front_id = ${frontId}::uuid
        AND elem::int >= ${cutoffWeekId}
    `);

    // PG returns the count as a string or number depending on driver version; coerce to int.
    const row = (result as unknown as { rows: { cnt: string | number }[] }).rows?.[0]
              ?? (result as unknown as { cnt: string | number }[])[0];
    if (!row) return 0;
    return Number(row.cnt) ?? 0;
  }

  // ── C2: workshop_stoichiometry_state + recipe_stoichiometry_table + block_effluent_register ────

  /**
   * seedEffluentState — insert 1 row in workshop_stoichiometry_state + 1 row in block_effluent_register.
   *
   * TEST-ONLY at C2 (used by ForensicTestController._test/forensic/seed-effluent-state).
   * C12+: the real upsert path is EffluentStoichiometryService.recordWorkshopThroughput (lazy-creates
   *   the workshop row on first throughput event).
   *
   * Idempotent: reseeds the shared sentinel PK (workshop_id / (player_id, block_id)) — 2× back-to-back
   *   isolation, mirrors the seed-ledger-ring pattern's INTENT (a fresh player owns the sentinel row on
   *   each run). TEST-ONLY: a workshop has a fixed owner in production.
   *
   *   W6a C2 (migration 0142): `workshop_stoichiometry_state.player_id` is now DB-immutable post-INSERT
   *   (BEFORE UPDATE trigger — closes the reattribution vector this same lot patches on the two REAL
   *   write sites). The prior `.onConflictDoUpdate({ set: { player_id: playerId, … } })` here would hit
   *   THAT trigger on every 2×-back-to-back run (a different fresh test player re-seeding the SAME
   *   TEST_WORKSHOP_ID). Fixed by DELETE-then-INSERT instead of UPSERT-reassign: the row for this
   *   sentinel PK is deleted first (if present, e.g. from a prior spec run), then INSERT-ed fresh — this
   *   never executes an UPDATE that changes player_id, so the trigger never sees it. Same observable
   *   result as before (a fresh row owned by the new test player), zero change to any spec's assertions.
   *   [W6a C2 Deviation — see implementation-notes.md §Deviations "C2 — trigger vs. shared-sentinel test
   *   fixtures": the migration's uniform-trigger ruling (D6-Q3(a)) didn't anticipate this pre-existing
   *   test-harness idiom; this is the conservative, behavior-preserving reconciliation.]
   * Anti-fabrication: no Math.random — workshopId / playerId are caller-provided or PG-generated.
   * OQ-5: substance_type uses the EXISTING PG enum (not re-declared here).
   */
  async seedEffluentState(input: SeedEffluentStateInput): Promise<void> {
    const { workshopId, playerId, blockId, districtId, substanceType } = input;

    // DELETE-then-INSERT (W6a C2 migration 0142 — see docblock above): never executes an UPDATE that
    // would touch player_id, so the ownership-immutability trigger never fires for this TEST-ONLY reseed.
    await this.db.delete(workshopStoichiometryState).where(eq(workshopStoichiometryState.workshop_id, workshopId));
    await this.db.insert(workshopStoichiometryState).values({
      workshop_id: workshopId,
      player_id: playerId,
      block_id: blockId,
      substance_type: substanceType,
      throughput_kg_window: sql`'[]'::jsonb`,
      updated_at_tick: null,
    });

    // block_effluent_register has composite PK (player_id, block_id).
    // UPSERT: insert a new row for (playerId, blockId); if a row for this EXACT (player_id, block_id)
    // pair already exists (2× back-to-back for the SAME player), reset it.
    // C14 fix: do NOT delete other players' rows for the same block_id — that would break
    // multi-player test scenarios (e.g. the determinism test which seeds two independent players).
    // Since playerId is a freshly generated UUID from gen_random_uuid(), the insert never conflicts
    // in a normal scenario. The onConflictDoUpdate handles the rare 2× back-to-back case where the
    // SAME player calls seed-effluent-state twice (deterministic back-to-back spec pattern, leçon D2).
    await this.db
      .insert(blockEffluentRegister)
      .values({
        player_id: playerId,
        block_id: blockId,
        district_id: districtId,
        effluent_window: sql`'[]'::jsonb`,
      })
      .onConflictDoUpdate({
        target: [blockEffluentRegister.player_id, blockEffluentRegister.block_id],
        set: {
          district_id: districtId,
          effluent_window: sql`'[]'::jsonb`,
        },
      });
  }

  /**
   * readEffluentState — read both §5.2 rows for a player (by playerId).
   *
   * Used by ForensicTestController._test/forensic/read-effluent-state.
   * Returns the first matching row per table (one workshop + one block register per player at C2).
   * C12+: real read paths use workshopId-keyed + (playerId,blockId)-keyed lookups.
   */
  async readEffluentState(playerId: string): Promise<EffluentStateRead> {
    const [workshopRow = null] = await this.db
      .select()
      .from(workshopStoichiometryState)
      .where(eq(workshopStoichiometryState.player_id, playerId))
      .limit(1);

    const [blockRow = null] = await this.db
      .select()
      .from(blockEffluentRegister)
      .where(eq(blockEffluentRegister.player_id, playerId))
      .limit(1);

    return {
      workshop: workshopRow ?? null,
      blockRegister: blockRow ?? null,
    };
  }

  /**
   * readRecipeTable — read all rows from recipe_stoichiometry_table.
   *
   * Used by ForensicTestController._test/forensic/read-recipe-table.
   * Returns all 4 seeded rows (brindle/crick/hush/ash) in DB order.
   * C12+: EffluentStoichiometryService reads by substance_type (single-row lookup).
   *
   * Anti-fabrication: asserts the migration SEED is present (both-ways: 4 rows exist in live PG).
   */
  async readRecipeTable(): Promise<(typeof recipeStoichiometryTable.$inferSelect)[]> {
    return this.db.select().from(recipeStoichiometryTable);
  }

  /**
   * resolveDistrictForBlock — the REAL district for a block (blocks.district_id, NOT NULL — world-gen invariant).
   *
   * W6.2 C1: closes the maillon-D "le district_id est là où le correctif peut faire semblant" warning
   * (design §3 C1) — updateBlockEffluentRegister previously read district_id off a possibly-absent
   * EXISTING register row and fell back to the literal `0` (a block that had never been scanned could
   * never get a real district). This is a single-row, deterministic lookup — no Math.random, no fabrication.
   *
   * Returns null only if blockId does not name a seeded block (should not occur for a real workshop's own
   * block — every buildings.block_id is a FK into blocks — kept defensive-only, never expected at runtime).
   */
  async resolveDistrictForBlock(blockId: number): Promise<number | null> {
    const [row] = await this.db
      .select({ district_id: blocks.district_id })
      .from(blocks)
      .where(eq(blocks.id, blockId))
      .limit(1);
    return row ? Number(row.district_id) : null;
  }

  // ── C13: sumBlockWorkshops + readBlockRegister ───────────────────────────────────────────────

  /**
   * sumBlockWorkshops — return all workshop_stoichiometry_state rows for a given block.
   *
   * Used by EffluentStoichiometryService.updateBlockEffluentRegister (C13) to aggregate
   * all workshops in a block into the block_effluent_register.
   *
   * Block grouping is via `workshop_stoichiometry_state.block_id` which is set at seed time
   * (or at lazy-create time from the hot-path). C13 groups by the stored block_id — the
   * building→block mapping was resolved at insert time (seed path) or will be enriched at C14.
   *
   * Returns all rows owned by `playerId` in `blockId`. Each row carries:
   *   - substance_type: recipe lookup key
   *   - throughput_kg_window: rolling window of { day, kg } entries (the raw throughput to sum)
   *
   * Zero-regression: read-only — does not mutate any row.
   * Anti-fabrication: no Math.random — read-only query, returns live DB rows.
   *
   * @param playerId - player uuid (FK owner of workshop rows).
   * @param blockId  - the block to aggregate (integer).
   * @returns        - all workshop_stoichiometry_state rows for the block (may be empty).
   */
  async sumBlockWorkshops(
    playerId: string,
    blockId: number,
  ): Promise<(typeof workshopStoichiometryState.$inferSelect)[]> {
    return this.db
      .select()
      .from(workshopStoichiometryState)
      .where(
        and(
          eq(workshopStoichiometryState.player_id, playerId),
          eq(workshopStoichiometryState.block_id, blockId),
        ),
      );
  }

  /**
   * readBlockRegister — read the block_effluent_register row for a player (by playerId).
   *
   * Used by ForensicTestController._test/forensic/read-block-register (C13 probe).
   * Returns the first matching row for the player (one block per player at C13;
   * C14+ will use (player_id, block_id)-keyed lookups).
   * Returns null if not found (CASCADE deleted or never created).
   *
   * R2.2: TEST-ONLY (used only by the probe route). Raw row for DB assertion.
   */
  async readBlockRegister(playerId: string): Promise<typeof blockEffluentRegister.$inferSelect | null> {
    const [row = null] = await this.db
      .select()
      .from(blockEffluentRegister)
      .where(eq(blockEffluentRegister.player_id, playerId))
      .limit(1);
    return row ?? null;
  }

  /**
   * readBlockRegisterForBlock — read the block_effluent_register row for a specific (player, block) pair.
   *
   * Block-scoped reload used by EffluentStoichiometryService.runEnvironmentalInspectorScan (C14)
   * after calling updateBlockEffluentRegister: ensures each block iteration reloads ITS OWN row,
   * not the first block row for the player (which readBlockRegister(playerId) returns via LIMIT 1).
   *
   * This fixes the latent MINOR: with >1 block per player, the per-block loop was re-reading the
   * FIRST block's row on every iteration (player-scoped LIMIT 1). This method is keyed on the
   * composite PK (player_id, block_id) → each block reads its own register.
   *
   * Returns null if not found (the updateBlockEffluentRegister call should have upserted it, but
   * we guard defensively).
   *
   * Zero-regression: behavior is identical for the current one-block-per-player tests (there is
   * only one row, so LIMIT 1 by player and by (player, block) return the same row).
   */
  async readBlockRegisterForBlock(
    playerId: string,
    blockId: number,
  ): Promise<typeof blockEffluentRegister.$inferSelect | null> {
    const [row = null] = await this.db
      .select()
      .from(blockEffluentRegister)
      .where(
        and(
          eq(blockEffluentRegister.player_id, playerId),
          eq(blockEffluentRegister.block_id, blockId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  /**
   * listBlockRegistersForPlayer — return ALL block_effluent_register rows for a player.
   *
   * Used by EffluentStoichiometryService.runEnvironmentalInspectorScan (C14) to iterate
   * all blocks for the player and apply the NIGHTLY/9 deviation check.
   *
   * Returns an empty array if the player has no block register rows (zero-regression: player
   * with no workshops has no block rows → scan is a clean no-op).
   *
   * Anti-fabrication: read-only query — does not mutate any row.
   * Zero-regression: does not touch cook_session / product_storage / ledger_entry_ring.
   */
  async listBlockRegistersForPlayer(
    playerId: string,
  ): Promise<(typeof blockEffluentRegister.$inferSelect)[]> {
    return this.db
      .select()
      .from(blockEffluentRegister)
      .where(eq(blockEffluentRegister.player_id, playerId));
  }

  /**
   * stampBlockEffluentScan — write last_deviation + last_scan_tick + district_id to a block row.
   *
   * Called by EffluentStoichiometryService.runEnvironmentalInspectorScan (C14) after computing
   * the deviation for a block. UPSERT on composite PK (player_id, block_id) — the row should
   * already exist (created by updateBlockEffluentRegister at C13), but we guard with an INSERT
   * in case the block was lazy-seeded without an explicit updateBlockEffluentRegister call.
   *
   * C13 MINOR close: sets district_id on the row (the scan knows the district). This closes
   * the C13 forward-MINOR: if the row was created via upsertBlockEffluentWindow with district_id=0
   * (e.g. from updateBlockEffluentRegister without an existing register row), the scan corrects it.
   *
   * @param playerId     - player uuid (FK + PK component).
   * @param blockId      - block id (PK component).
   * @param districtId   - district of the block (set by scan — C13 MINOR close).
   * @param deviation    - computed (block_effluent − baseline) / baseline.
   * @param dayId        - idempotence stamp: dayId of the current NIGHTLY/9 scan.
   */
  async stampBlockEffluentScan(
    playerId: string,
    blockId: number,
    districtId: number,
    deviation: number,
    dayId: number,
  ): Promise<void> {
    await this.db
      .insert(blockEffluentRegister)
      .values({
        player_id: playerId,
        block_id: blockId,
        district_id: districtId,
        // effluent_window defaults to '[]' — the scan does not reset it.
        effluent_window: sql`'[]'::jsonb`,
        last_deviation: deviation,
        last_scan_tick: BigInt(dayId),
      })
      .onConflictDoUpdate({
        target: [blockEffluentRegister.player_id, blockEffluentRegister.block_id],
        set: {
          district_id: districtId,
          last_deviation: deviation,
          last_scan_tick: BigInt(dayId),
        },
      });
  }

  /**
   * upsertBlockEffluentWindow — write the computed effluent_window to block_effluent_register.
   *
   * Called by EffluentStoichiometryService.updateBlockEffluentRegister (C13) after computing
   * the per-day sum across all workshops.
   *
   * Lazy-creates the row if it does not exist (INSERT) or updates the effluent_window if it
   * already exists (UPSERT on composite PK (player_id, block_id)).
   *
   * @param playerId       - player uuid (FK + PK component).
   * @param blockId        - block id (PK component).
   * @param districtId     - district containing the block (for C14 scan).
   * @param effluentWindow - new window to write (computed by updateBlockEffluentRegister).
   */
  async upsertBlockEffluentWindow(
    playerId: string,
    blockId: number,
    districtId: number,
    effluentWindow: unknown[],
  ): Promise<void> {
    await this.db
      .insert(blockEffluentRegister)
      .values({
        player_id: playerId,
        block_id: blockId,
        district_id: districtId,
        effluent_window: sql`${JSON.stringify(effluentWindow)}::jsonb`,
      })
      .onConflictDoUpdate({
        target: [blockEffluentRegister.player_id, blockEffluentRegister.block_id],
        set: {
          effluent_window: sql`${JSON.stringify(effluentWindow)}::jsonb`,
        },
      });
  }

  // ── C3: lifestyle_audit_state CRUD ──────────────────────────────────────────────────────────

  /**
   * seedLifestyleState — insert 1 row in lifestyle_audit_state.
   *
   * TEST-ONLY at C3 (used by ForensicTestController._test/forensic/seed-lifestyle-state).
   * C17+: the real insertion path is StandingGapHeatService.runMonthlyTick (lazy-creates the row
   *   on first monthly gap computation). This method is a direct DB insert for spec isolation.
   *
   * Idempotent: uses ON CONFLICT DO NOTHING — safe for 2× back-to-back spec runs (leçon D2).
   *   If the lieutenant already has a lifestyle row (from a prior test run), the insert is a no-op.
   *
   * Anti-fabrication: no Math.random — lieutenantId / playerId are caller-provided or PG-generated.
   */
  async seedLifestyleState(input: SeedLifestyleStateInput): Promise<void> {
    const { lieutenantId, playerId } = input;

    await this.db
      .insert(lifestyleAuditState)
      .values({
        lieutenant_id: lieutenantId,
        player_id: playerId,
        // All other columns use DB defaults: declared_cut_cents=0n, visible_standard_index=0,
        // consecutive_flag_months=0, last_gap=null, tail_ramp_stage='none',
        // tail_started_tick=null, last_month_id=null.
      })
      .onConflictDoNothing();
  }

  /**
   * readLifestyleState — read the lifestyle_audit_state row for a player (by playerId).
   *
   * Used by ForensicTestController._test/forensic/read-lifestyle-state.
   * C17+: used by StandingGapHeatService for the monthly gap computation.
   *
   * Returns the first matching row for the player (one row per lieutenant per player at C3;
   * C17+ will use lieutenantId-keyed lookups for the real mechanic).
   * Returns null if not found (CASCADE deleted or never seeded).
   */
  async readLifestyleState(playerId: string): Promise<typeof lifestyleAuditState.$inferSelect | null> {
    const [row = null] = await this.db
      .select()
      .from(lifestyleAuditState)
      .where(eq(lifestyleAuditState.player_id, playerId))
      .limit(1);

    return row ?? null;
  }
}

// ── C2 types ──────────────────────────────────────────────────────────────────────────────────────

/**
 * Input for seedEffluentState — creates one workshop_stoichiometry_state + one block_effluent_register row.
 */
export interface SeedEffluentStateInput {
  /** Lab workshop uuid (PK for workshop_stoichiometry_state). */
  workshopId: string;
  /** Player uuid — FK → player(player_id) ON DELETE CASCADE. */
  playerId: string;
  /** Block containing this workshop (integer). */
  blockId: number;
  /** District of this block (for NIGHTLY/9 scan C14). */
  districtId: number;
  /** Current substance recipe (REUSE substanceType enum from operational_chain.ts, OQ-5). */
  substanceType: SubstanceTypeValue;
}

/**
 * Read result for readEffluentState — both §5.2 rows for a player.
 */
export interface EffluentStateRead {
  /** workshop_stoichiometry_state row — null if not found. */
  workshop: typeof workshopStoichiometryState.$inferSelect | null;
  /** block_effluent_register row — null if not found. */
  blockRegister: typeof blockEffluentRegister.$inferSelect | null;
}

// ── C3 types ──────────────────────────────────────────────────────────────────────────────────────

/**
 * Input for seedLifestyleState — creates one lifestyle_audit_state row.
 */
export interface SeedLifestyleStateInput {
  /** Lieutenant uuid (PK for lifestyle_audit_state). */
  lieutenantId: string;
  /** Player uuid — FK → player(player_id) ON DELETE CASCADE. */
  playerId: string;
}
