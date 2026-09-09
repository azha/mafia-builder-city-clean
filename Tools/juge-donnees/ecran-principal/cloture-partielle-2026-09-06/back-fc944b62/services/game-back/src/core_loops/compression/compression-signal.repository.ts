// IMPLEMENTS: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md §C6 (the 7 §8.2
//             sources — B/C/D live signals: flags-pending, backpressure-critical, failed-collision slots)
//             Design: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §8.2 (the
//             per-source raw column/query, C0-reserve R2/R3/R4 — decisions §8.5 FROZEN evidence).
//             Decisions: R2 (`flagged_items` pending, `flag_discipline.ts:108-120`) ; R3 (backpressure
//             `BackpressureBucket`/sinuosity `SinuosityStressBucket`/mycelial `DebtBucket` cut-points) ;
//             R4 (cue-stack `CueStackSlotStatus` jsonb array + `exception_queue` `source='CUE_CASCADE'`
//             tag, itself INSIDE `candidate_actions` jsonb — NOT a top-level column, `cue-cascade-
//             exception-producer.service.ts`'s own `hasPendingForSlot` idiom REPLICATED here).
//             Pattern: `supply-node-pressure.repository.ts#readAllRaw` (defensive dual-shape `rowsOf` raw-
//             execute read) + `cue-cascade-exception-producer.service.ts#hasPendingForSlot` (the
//             `jsonb_array_elements` EXISTS/COUNT idiom over `candidate_actions`, REPLICATED not imported —
//             D3, never a new sibling method on that producer's own file).
//             — P3-E C6 — 2026-07-17
//
// `CompressionSignalRepository` — READ-ONLY across 3 OTHER lots' own tables (P3-B `flagged_items`, P3-C
// `supply_node_pressure`/`route`/`supply_chain_legs`, P3-D `cue_stacks`/`exception_queue`) + THIS lot's own
// `annealing_state` (P3-D table, Loop 7 — read-only here too, C6 never writes it). One-way: this module
// reads REPOSITORIES' underlying tables directly (never those modules' own repository/service classes —
// the SAME "lecture REPOSITORIES, pas services" discipline decisions §3 transposition-registry mandates
// for the C7 `ProblemAggregator`, applied here one chunk early since C6 needs the SAME raw counts) — zero
// module-cycle coupling, zero write surface on any of these 3 lots' own tables.

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { flaggedItemRow } from '../../db/schema/flag_discipline';
import { supplyNodePressureRow } from '../../db/schema/supply_chain_loops';
import { route } from '../../db/schema/operational_chain';
import { supplyChainLegRow } from '../../db/schema/supply_chain_loops';
import { cueStack, exceptionQueueRow } from '../../db/schema/queues_exceptions_cuestack';
import { annealingStateRow } from '../../db/schema/cue_annealing';
import type { SupplyChainSignalCounts } from './compression-stress-signal';

/** §8.2 row 4 raw inputs — `CueStackSlot.status` (jsonb) count + `exception_queue` `source='CUE_CASCADE'`
 *  pending count (R4). */
export interface CueStackSignalCounts {
  readonly failedSlotCount: number;
  readonly pendingCascadeCardCount: number;
}

/** §8.2 row 7 raw inputs — `annealing_state` non-settled rows this player owns, and the subset with
 *  `changes_during_settling >= 1` (the "compounding" signal). */
export interface AnnealingSignalCounts {
  readonly compoundingCount: number;
  readonly totalNonSettledCount: number;
}

/** Defensive dual-shape read for a raw `db.execute` result (the `exceptions.repository.ts#hasPendingFor
 *  Building` idiom, copied verbatim — no shared extraction across repositories, this codebase's own
 *  convention). */
function rowsOf(result: unknown): Array<Record<string, unknown>> {
  return (result as { rows?: Array<Record<string, unknown>> }).rows ?? (result as Array<Record<string, unknown>>);
}

@Injectable()
export class CompressionSignalRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * §8.2 row 1 — the 3 sub-domain (bad, total) pairs `supplyChainCapacityPressureSignal` reduces. ONE
   * 3-CTE query (mirrors `FrictionBudgetRepository.fetchPerimeterNodes`'s own set-based CTE shape) —
   * `backpressure_index > criticalThreshold` (`BackpressureBucket.critical`, R3) ; routes `state=
   * 'severed' OR sinuosity_index >= stressedCriticalCut` (`SinuosityStressBucket` 'critical'|'severed',
   * R3) ; legs `debt_load > stressThreshold` (`DebtBucket` 'stressed'|'fractured', R3). Thresholds are
   * ALWAYS getter-resolved by the CALLER (R2.3) — never inlined here.
   */
  async readSupplyChainSignalCounts(
    playerId: string,
    backpressureCriticalThreshold: number,
    sinuosityStressedCriticalCut: number,
    mycelialStressThreshold: number,
  ): Promise<SupplyChainSignalCounts> {
    const result = await this.db.execute(sql`
      WITH bp AS (
        SELECT
          count(*) FILTER (WHERE backpressure_index > ${backpressureCriticalThreshold})::int AS bad,
          count(*)::int AS total
        FROM ${supplyNodePressureRow}
        WHERE player_id = ${playerId}::uuid
      ),
      rt AS (
        SELECT
          count(*) FILTER (WHERE state = 'severed' OR sinuosity_index >= ${sinuosityStressedCriticalCut})::int AS bad,
          count(*)::int AS total
        FROM ${route}
        WHERE player_id = ${playerId}::uuid
      ),
      lg AS (
        SELECT
          count(*) FILTER (WHERE debt_load > ${mycelialStressThreshold})::int AS bad,
          count(*)::int AS total
        FROM ${supplyChainLegRow}
        WHERE player_id = ${playerId}::uuid
      )
      SELECT bp.bad AS bp_bad, bp.total AS bp_total, rt.bad AS rt_bad, rt.total AS rt_total, lg.bad AS lg_bad, lg.total AS lg_total
      FROM bp, rt, lg
    `);
    const row = rowsOf(result)[0] ?? {};
    return {
      backpressureCriticalCount: Number(row['bp_bad'] ?? 0),
      backpressureTotalCount: Number(row['bp_total'] ?? 0),
      routeBadCount: Number(row['rt_bad'] ?? 0),
      routeTotalCount: Number(row['rt_total'] ?? 0),
      legBadCount: Number(row['lg_bad'] ?? 0),
      legTotalCount: Number(row['lg_total'] ?? 0),
    };
  }

  /** §8.2 row 3 — `flagged_items` pending count for this player (R2, `flag_discipline.ts:108-120`). */
  async countPendingFlags(playerId: string): Promise<number> {
    const rows = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(flaggedItemRow)
      .where(and(eq(flaggedItemRow.player_id, playerId), eq(flaggedItemRow.resolution, 'pending')));
    return rows[0]?.n ?? 0;
  }

  /**
   * §8.2 row 4 (R4) — the player's CURRENT non-terminal `cue_stacks` row (I1: at most 1) failed-slot
   * count (`status IN ('failed_collision','failed_disrupted')`, a per-slot status INSIDE the `slots`
   * jsonb array, `CueStackSlotStatus`) + `exception_queue` rows with a `candidate_actions[].source =
   * 'CUE_CASCADE'` tag (`CUE_CASCADE_SOURCE`) AND `resolution_status='pending'` (the `hasPendingForSlot`
   * idiom, `DISTINCT exception_id` — each cascade card carries 2 candidate actions both tagged
   * `CUE_CASCADE`, so a plain row count would double-count). A resolved/terminal cue_stack's OWN failed
   * slots do NOT count (design's own "depuis la dernière session" framing — a stack the player has
   * already resolved/moved past no longer stresses the org; the non-terminal-only scope is this chunk's
   * own C6 realization of that framing, honestly narrower than a literal timestamped "since last session"
   * window, which no substrate here supports — TD closeout note).
   */
  async readCueStackSignalCounts(playerId: string): Promise<CueStackSignalCounts> {
    const stackRows = await this.db
      .select({ slots: cueStack.slots })
      .from(cueStack)
      .where(and(eq(cueStack.player_id, playerId), sql`${cueStack.state} IN ('pending', 'committed', 'executing')`))
      .limit(1);
    const slots = (stackRows[0]?.slots as Array<{ status?: string }> | undefined) ?? [];
    const failedSlotCount = slots.filter((s) => s.status === 'failed_collision' || s.status === 'failed_disrupted').length;

    const cascadeResult = await this.db.execute(sql`
      SELECT count(DISTINCT exception_id)::int AS n
      FROM ${exceptionQueueRow}, jsonb_array_elements(candidate_actions) AS elem
      WHERE player_id = ${playerId}::uuid
        AND resolution_status = 'pending'
        AND elem->>'source' = 'CUE_CASCADE'
    `);
    const pendingCascadeCardCount = Number(rowsOf(cascadeResult)[0]?.['n'] ?? 0);

    return { failedSlotCount, pendingCascadeCardCount };
  }

  /** §8.2 row 7 — `annealing_state` non-settled rows this player owns, and the "compounding"
   *  (`changes_during_settling >= 1`) subset (C0-reserve, decisions §8 row 9). */
  async readAnnealingSignalCounts(playerId: string): Promise<AnnealingSignalCounts> {
    const rows = await this.db
      .select({
        total: sql<number>`count(*)::int`,
        compounding: sql<number>`count(*) FILTER (WHERE ${annealingStateRow.changes_during_settling} >= 1)::int`,
      })
      .from(annealingStateRow)
      .where(and(eq(annealingStateRow.player_id, playerId), eq(annealingStateRow.settled, false)));
    return {
      compoundingCount: Number(rows[0]?.compounding ?? 0),
      totalNonSettledCount: Number(rows[0]?.total ?? 0),
    };
  }
}
