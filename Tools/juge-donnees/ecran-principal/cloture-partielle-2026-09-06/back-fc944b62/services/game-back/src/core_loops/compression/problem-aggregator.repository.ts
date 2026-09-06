// IMPLEMENTS: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md §C7 (`ProblemAggregator`
//             — "lecture REPOSITORIES §10.1 — formules figées C0)
//             Design: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §10.1 (the
//             9-source table, snapshot-at-fire D11) + §10.3 (reveal-secondary re-scan, D14).
//             Decisions: D11 (board = snapshot, not a live view) ; decisions §3 transposition-registry
//             ("ProblemAggregator … lecture REPOSITORIES (pas services) — pas de couplage module-cycle,
//             leçon P3-A C7 re-provide") — REPLICATED here exactly as `CompressionSignalRepository`
//             already establishes one chunk early (that file's own header: "applied here one chunk
//             early since C6 needs the SAME raw counts").
//             Pattern: `CompressionSignalRepository` (READ-ONLY across 3 other lots' own tables, the
//             SAME set-based/`rowsOf` idioms REPLICATED here) + `friction-threshold-exception-producer.
//             service.ts#hasPendingForSource` (the `jsonb_array_elements` EXISTS/tag-filter idiom, reused
//             here to EXCLUDE — not detect — the 5 internally-tagged cards already covered by their OWN
//             dedicated board rows, see `INTERNALLY_TAGGED_SOURCES` below).
//             — P3-E C7 — 2026-07-18
//
// `ProblemAggregatorRepository` — ONE scan method per §10.1 board source (READ-ONLY across P3-A/B/C/D's
// own tables, zero write to any of them — mirrors `CompressionSignalRepository`'s identical posture) +
// the persisted-carryover read (§10.1 last row) + the batched `compression_problem_entry` INSERT this
// lot itself owns. Each scan is a SEPARATE round-trip (no shared tx threaded through all 9 — the board
// seed is a 2-step sequence: the engage/fire/forced transition commits FIRST (compression-board.
// repository.ts), THEN this repository's reads + ONE insert-batch run as a follow-up — a small window
// where `compression_events.state='active'` exists with zero entries is the accepted, INTENTIONALLY
// simple trade-off, mirrors `DecommissionService`'s own "guarded tx commits, THEN a post-commit
// follow-up" ordering elsewhere in this lot).

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { flaggedItemRow } from '../../db/schema/flag_discipline';
import { supplyNodePressureRow, supplyChainLegRow } from '../../db/schema/supply_chain_loops';
import { route } from '../../db/schema/operational_chain';
import { cueStack, exceptionQueueRow, type ExceptionQueueRow } from '../../db/schema/queues_exceptions_cuestack';
import { annealingStateRow } from '../../db/schema/cue_annealing';
import { frictionBudgetState } from '../../db/schema/demolition_compression';
import { compressionEvent, compressionProblemEntry, type CompressionProblemEntryRow } from '../../db/schema/demolition_compression';
import { FRICTION_THRESHOLD_SOURCE } from '../demolition/friction-threshold-exception-producer.service';
import { CUE_CASCADE_SOURCE } from '../cue_stack/cue-cascade-exception-producer.service';
import { BACKPRESSURE_CRITICAL_SOURCE } from '../supply_chain/backpressure-exception-producer.service';
import { MYCELIAL_PERSISTENT_STRESS_SOURCE } from '../supply_chain/mycelial-stress-exception-producer.service';
import { ROUTE_COLLAPSE_SOURCE } from '../supply_chain/route-collapse-exception-producer.service';
import type { ProblemTier } from './problem-tier';

/** The board's closed `source_kind` registry (design §10.1's 9 conceptual rows — row 6 "Failed cue stack
 *  slots + cascades PENDING" is realized as 2 distinct kinds, see `problem-tier.ts`'s own header). A
 *  bounded runtime registry, NOT a pgEnum (D1) — mirrors `source_kind varchar(32)`'s own comment. */
export const PROBLEM_SOURCE_KINDS = [
  'exception_card',
  'flag',
  'backpressure_node',
  'severed_route',
  'stressed_leg',
  'cue_stack_failed_slot',
  'cue_cascade_card',
  'settling_overload',
  'friction_penalty',
] as const;
export type ProblemSourceKind = (typeof PROBLEM_SOURCE_KINDS)[number];

/** The 5 internally-tagged exception_queue `candidate_actions[].source` values ALREADY covered by their
 *  OWN dedicated board row (backpressure/route/leg/cue-cascade/friction — each reads its OWN domain
 *  table directly, design §10.1). The GENERIC `exception_card` scan below EXCLUDES cards carrying any of
 *  these 5 tags — otherwise the SAME underlying problem would double-represent on the board (once via
 *  its dedicated row, once via the generic exception-queue sweep). `FLAG_TOKEN_EXHAUSTION` and any other
 *  untagged/other-tagged card are NOT excluded — they flow through the generic row (there is no
 *  dedicated board row for them). */
const INTERNALLY_TAGGED_SOURCES: readonly string[] = [
  FRICTION_THRESHOLD_SOURCE,
  CUE_CASCADE_SOURCE,
  BACKPRESSURE_CRITICAL_SOURCE,
  MYCELIAL_PERSISTENT_STRESS_SOURCE,
  ROUTE_COLLAPSE_SOURCE,
];

export interface RawProblem {
  readonly problemKey: string;
  readonly sourceKind: ProblemSourceKind;
  readonly tier: ProblemTier;
  readonly targetRef: Record<string, unknown>;
}

/** Defensive dual-shape read for a raw `db.execute` result (this codebase's own convention, REPLICATED
 *  verbatim — `exceptions.repository.ts#hasPendingForBuilding` idiom). */
function rowsOf(result: unknown): Array<Record<string, unknown>> {
  return (result as { rows?: Array<Record<string, unknown>> }).rows ?? (result as Array<Record<string, unknown>>);
}

@Injectable()
export class ProblemAggregatorRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  // ───────────────────────────── §10.1 row 1 — ExceptionQueue cards (generic) ─────────────────────────

  /** Every PENDING card for `playerId` NOT carrying one of the 5 internally-tagged sources (see
   *  `INTERNALLY_TAGGED_SOURCES` above — those are covered by their OWN dedicated rows below). */
  async scanExceptionCards(playerId: string): Promise<ExceptionQueueRow[]> {
    const rows = await this.db
      .select()
      .from(exceptionQueueRow)
      .where(and(eq(exceptionQueueRow.player_id, playerId), eq(exceptionQueueRow.resolution_status, 'pending')));
    return rows.filter((r) => {
      const actions = (r.candidate_actions as Array<{ source?: string }>) ?? [];
      return !actions.some((a) => a.source != null && INTERNALLY_TAGGED_SOURCES.includes(a.source));
    });
  }

  // ───────────────────────────── §10.1 row 2 — FlaggedItems pending ───────────────────────────────────

  async scanPendingFlags(playerId: string): Promise<Array<{ flagId: string; gameDay: number }>> {
    const rows = await this.db
      .select({ flag_id: flaggedItemRow.flag_id, game_day: flaggedItemRow.game_day })
      .from(flaggedItemRow)
      .where(and(eq(flaggedItemRow.player_id, playerId), eq(flaggedItemRow.resolution, 'pending')));
    return rows.map((r) => ({ flagId: r.flag_id, gameDay: r.game_day }));
  }

  // ───────────────────────────── §10.1 row 3 — BackpressureCritical nodes ─────────────────────────────

  async scanBackpressureCriticalNodes(
    playerId: string,
    criticalThreshold: number,
  ): Promise<Array<{ buildingId: string; index: number }>> {
    const rows = await this.db
      .select({ building_id: supplyNodePressureRow.building_id, backpressure_index: supplyNodePressureRow.backpressure_index })
      .from(supplyNodePressureRow)
      .where(and(eq(supplyNodePressureRow.player_id, playerId), sql`${supplyNodePressureRow.backpressure_index} > ${criticalThreshold}`));
    return rows.map((r) => ({ buildingId: r.building_id, index: r.backpressure_index }));
  }

  // ───────────────────────────── §10.1 row 4 — Severed/critical routes ────────────────────────────────

  async scanBadRoutes(
    playerId: string,
    stressedCriticalCut: number,
  ): Promise<Array<{ routeId: string; originBuildingId: string; destinationBuildingId: string; state: string; sinuosityIndex: number }>> {
    const rows = await this.db
      .select({
        route_id: route.route_id,
        origin_building_id: route.origin_building_id,
        destination_building_id: route.destination_building_id,
        state: route.state,
        sinuosity_index: route.sinuosity_index,
      })
      .from(route)
      .where(and(eq(route.player_id, playerId), sql`(${route.state} = 'severed' OR ${route.sinuosity_index} >= ${stressedCriticalCut})`));
    return rows.map((r) => ({
      routeId: r.route_id,
      originBuildingId: r.origin_building_id,
      destinationBuildingId: r.destination_building_id,
      state: r.state,
      sinuosityIndex: r.sinuosity_index,
    }));
  }

  // ───────────────────────────── §10.1 row 5 — Stressed/fractured legs ────────────────────────────────

  async scanBadLegs(
    playerId: string,
    stressThreshold: number,
  ): Promise<Array<{ legId: string; originBuildingId: string; destinationBuildingId: string; debtLoad: number }>> {
    const rows = await this.db
      .select({
        leg_id: supplyChainLegRow.leg_id,
        origin_building_id: supplyChainLegRow.origin_building_id,
        destination_building_id: supplyChainLegRow.destination_building_id,
        debt_load: supplyChainLegRow.debt_load,
      })
      .from(supplyChainLegRow)
      .where(and(eq(supplyChainLegRow.player_id, playerId), sql`${supplyChainLegRow.debt_load} > ${stressThreshold}`));
    return rows.map((r) => ({
      legId: r.leg_id,
      originBuildingId: r.origin_building_id,
      destinationBuildingId: r.destination_building_id,
      debtLoad: r.debt_load,
    }));
  }

  // ───────────────────────────── §10.1 row 6 — Failed cue-stack slots + cascades PENDING ─────────────

  /** The player's CURRENT non-terminal `cue_stacks` row (I1: at most 1) — `failed_collision`/
   *  `failed_disrupted` slots (mirrors `CompressionSignalRepository#readCueStackSignalCounts`'s OWN
   *  scope, "the non-terminal-only scope is this chunk's own C6 realization", REPLICATED here). */
  async scanFailedCueStackSlots(playerId: string): Promise<Array<{ cueStackId: string; slotId: string }>> {
    const stackRows = await this.db
      .select({ cue_stack_id: cueStack.cue_stack_id, slots: cueStack.slots })
      .from(cueStack)
      .where(and(eq(cueStack.player_id, playerId), sql`${cueStack.state} IN ('pending', 'committed', 'executing')`))
      .limit(1);
    const stack = stackRows[0];
    if (!stack) return [];
    const slots = (stack.slots as Array<{ slot_id?: string; status?: string }>) ?? [];
    return slots
      .filter((s) => s.status === 'failed_collision' || s.status === 'failed_disrupted')
      .map((s) => ({ cueStackId: stack.cue_stack_id, slotId: String(s.slot_id) }));
  }

  /** Pending `exception_queue` cards tagged `CUE_CASCADE` (`cue-cascade-exception-producer.service.ts`'s
   *  own `hasPendingForSlot` idiom, REPLICATED at player-scope rather than per-slot — one row per
   *  matching exception_id, `DISTINCT` since a cascade card carries 2 candidate actions both tagged). */
  async scanCueCascadeCards(playerId: string): Promise<Array<{ exceptionId: string }>> {
    const result = await this.db.execute(sql`
      SELECT DISTINCT exception_id
      FROM ${exceptionQueueRow}, jsonb_array_elements(candidate_actions) AS elem
      WHERE player_id = ${playerId}::uuid
        AND resolution_status = 'pending'
        AND elem->>'source' = ${CUE_CASCADE_SOURCE}
    `);
    return rowsOf(result).map((r) => ({ exceptionId: String(r['exception_id']) }));
  }

  // ───────────────────────────── §10.1 row 7 — Settling-overload nodes ────────────────────────────────

  async scanSettlingOverload(playerId: string): Promise<Array<{ buildingId: string; changesDuringSettling: number }>> {
    const rows = await this.db
      .select({ building_id: annealingStateRow.building_id, changes: annealingStateRow.changes_during_settling })
      .from(annealingStateRow)
      .where(and(eq(annealingStateRow.player_id, playerId), eq(annealingStateRow.settled, false), sql`${annealingStateRow.changes_during_settling} >= 1`));
    return rows.map((r) => ({ buildingId: r.building_id, changesDuringSettling: r.changes }));
  }

  // ───────────────────────────── §10.1 row 8 — Friction-penalty active (1 global entry) ────────────────

  async readFrictionPenaltyActive(playerId: string): Promise<boolean> {
    const rows = await this.db
      .select({ active: frictionBudgetState.efficiency_penalty_active })
      .from(frictionBudgetState)
      .where(eq(frictionBudgetState.player_id, playerId))
      .limit(1);
    return rows[0]?.active ?? false;
  }

  // ───────────────────────────── §10.1 row 9 — Problèmes PERSISTÉS du cycle précédent ───────────────────

  /** The player's MOST RECENT terminal (`'finalized'`/`'expired'`) `compression_events` row's OWN entries
   *  where `persisted=true` (already tier-degraded AT THAT finalize, §10.4.1 — this method does NOT
   *  degrade again, it re-presents them AS-IS for the new cycle). Empty array for a player's FIRST-ever
   *  cycle (no prior terminal row) — organically 0-rows, never an error. */
  async readPersistedCarryover(playerId: string): Promise<RawProblem[]> {
    const priorRows = await this.db
      .select({ id: compressionEvent.id })
      .from(compressionEvent)
      .where(and(eq(compressionEvent.player_id, playerId), sql`${compressionEvent.state} IN ('finalized', 'expired')`))
      .orderBy(sql`${compressionEvent.finalized_at_tick} DESC NULLS LAST`)
      .limit(1);
    const priorEventId = priorRows[0]?.id;
    if (!priorEventId) return [];

    const entries = await this.db
      .select()
      .from(compressionProblemEntry)
      .where(and(eq(compressionProblemEntry.compression_event_id, priorEventId), eq(compressionProblemEntry.persisted, true)));

    return entries.map((e) => ({
      problemKey: e.problem_key,
      sourceKind: e.source_kind as ProblemSourceKind,
      tier: e.tier as ProblemTier,
      targetRef: (e.target_ref as Record<string, unknown>) ?? {},
    }));
  }

  // ───────────────────────────── Writes this lot owns ──────────────────────────────────────────────────

  /** Batched INSERT of the seeded board (idempotent — `ON CONFLICT (compression_event_id, problem_key) DO
   *  NOTHING`, the SAME unique constraint I1-sibling already DB-enforces, mig 0133: a re-run of THIS
   *  method for the SAME `compressionEventId` is a safe 0-write for any already-inserted problem_key —
   *  belt-and-suspenders against a retried seed call, never a caller requirement). Returns the count
   *  actually inserted (best-effort — the batched VALUES insert doesn't distinguish "already existed"
   *  from "this call's own row" per-row without a RETURNING diff; the count is the ATTEMPTED size, the
   *  SAME "attempted, not verified-affected" honest contract `ExceptionsRepository#updatePriorities`
   *  documents for its own batched write, TD-205 precedent). */
  async insertEntries(compressionEventId: string, playerId: string, problems: readonly RawProblem[]): Promise<number> {
    if (problems.length === 0) return 0;
    await this.db
      .insert(compressionProblemEntry)
      .values(
        problems.map((p) => ({
          compression_event_id: compressionEventId,
          player_id: playerId,
          problem_key: p.problemKey,
          source_kind: p.sourceKind,
          tier: p.tier,
          target_ref: p.targetRef,
        })),
      )
      .onConflictDoNothing({ target: [compressionProblemEntry.compression_event_id, compressionProblemEntry.problem_key] });
    return problems.length;
  }

  /** All board entries for `compressionEventId` (`GET /v1/compression/board`). */
  async listEntries(compressionEventId: string): Promise<CompressionProblemEntryRow[]> {
    return this.db.select().from(compressionProblemEntry).where(eq(compressionProblemEntry.compression_event_id, compressionEventId));
  }

  /** ONE owned, board entry (`decide`'s own ownership/existence guard — the actual addressed-guard is a
   *  SEPARATE single-statement UPDATE, `compression-board.repository.ts#applyDecision`). */
  async getOwnedEntry(compressionEventId: string, playerId: string, entryId: string): Promise<CompressionProblemEntryRow | null> {
    const rows = await this.db
      .select()
      .from(compressionProblemEntry)
      .where(
        and(
          eq(compressionProblemEntry.id, entryId),
          eq(compressionProblemEntry.compression_event_id, compressionEventId),
          eq(compressionProblemEntry.player_id, playerId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  /** Count of unaddressed entries for this cycle (the "toutes entries addressed" auto-finalize trigger,
   *  §10.4). */
  async countUnaddressed(compressionEventId: string): Promise<number> {
    const rows = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(compressionProblemEntry)
      .where(and(eq(compressionProblemEntry.compression_event_id, compressionEventId), sql`${compressionProblemEntry.addressed_at} IS NULL`));
    return rows[0]?.n ?? 0;
  }
}
