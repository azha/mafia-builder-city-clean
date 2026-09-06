// IMPLEMENTS: docs/superpowers/plans/2026-07-18-p3-F-delegation-ratchet-plan.md C4 ("Per-category
//             decision-log extractors (audit rows + resolved cards — R3/R6 field mapping; newest-first,
//             cap N = seed-depth getter)").
//             Design: docs/superpowers/specs/2026-07-18-p3-F-delegation-ratchet-design.md D5 ("Per-
//             category decision-log extractors read ONLY persisted decision records:
//             structural_decisions_audit rows... + resolved exception_queue rows... newest-first").
//             C0 re-anchor: docs/superpowers/specs/2026-07-18-p3-F-C0-reanchor.md §6 R6 ("no first-class
//             category_id/producer column — the only producer/category-identifying field is the jsonb
//             candidate_actions[].source tag... a jsonb-based lookup mirroring hasPendingForBuilding's
//             exact EXISTS-over-jsonb_array_elements pattern, not a first-class column join").
//             Pattern (EXISTS-over-jsonb_array_elements): `exceptions.repository.ts#hasPendingForBuilding`
//             (`:241-249`) — the SAME idiom, here reading RESOLVED/ESCALATED rows instead of PENDING ones.
//             — P3-F C4 — 2026-07-19
//
// `CategoryDecisionLogRepository` — the read-only extractor over the TWO real decision-log sources
// (`structural_decisions_audit` + `exception_queue`), merged newest-first and capped at N. Pure reads —
// no write method exists on this class (extraction never mutates a decision record).

import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';

import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { structuralDecisionAuditRow } from '../db/schema/progression_structural';
import { CATEGORY_DECISION_BINDINGS } from './category-decision-bindings';
import { taskCategoryCatalogueEntryForCode } from './task-category-catalogue';

/** One extracted decision-log entry, source-agnostic (the mapper's typed input). `occurredAt` is the
 *  ordering key (`decided_at` for a structural row, `resolved_at` for a resolved/escalated exception
 *  row). `provenance` is BO-only forensic detail (never surfaced to the player — R2.2): the
 *  `StructuralDecisionType` int code for a `STRUCTURAL_DECISION`, or the resolution's `method` (an
 *  `EffectType` string, e.g. `'ONE_TIME'`/`'ESCALATE'`) for a `RESOLVED_EXCEPTION`. `chosenActionId` is
 *  present only for a `RESOLVED_EXCEPTION` (the player's actual candidate pick — every handler's
 *  `markResolved` payload always carries it, `exceptions/effects/*.handler.ts`). */
export interface CategoryDecisionEntry {
  readonly kind: 'STRUCTURAL_DECISION' | 'RESOLVED_EXCEPTION';
  readonly occurredAt: Date;
  readonly provenance: number | string;
  readonly chosenActionId?: string;
}

interface ResolvedExceptionRow {
  // The raw `db.execute(sql...)` path (unlike a typed Drizzle `.select()`) returns a `timestamptz` column
  // as an ISO STRING, not a hydrated `Date` — the mapper below normalizes it.
  resolved_at: string;
  resolution: { method?: string; chosen_action_id?: string } | null;
}

@Injectable()
export class CategoryDecisionLogRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /** `structural_decisions_audit` rows whose `decision_type` is one of `decisionTypes`, newest first,
   *  capped at `limit`. Empty `decisionTypes` (a category with no structural binding, e.g.
   *  HEAT_MANAGEMENT) short-circuits — no query issued. */
  async extractStructuralDecisions(
    playerId: string,
    decisionTypes: readonly number[],
    limit: number,
  ): Promise<CategoryDecisionEntry[]> {
    if (decisionTypes.length === 0) return [];
    const rows = await this.db
      .select({
        decision_type: structuralDecisionAuditRow.decision_type,
        decided_at: structuralDecisionAuditRow.decided_at,
      })
      .from(structuralDecisionAuditRow)
      .where(
        and(
          eq(structuralDecisionAuditRow.player_id, playerId),
          inArray(structuralDecisionAuditRow.decision_type, [...decisionTypes]),
        ),
      )
      .orderBy(desc(structuralDecisionAuditRow.decided_at))
      .limit(limit);
    return rows.map((r) => ({
      kind: 'STRUCTURAL_DECISION' as const,
      occurredAt: r.decided_at,
      provenance: r.decision_type,
    }));
  }

  /** `exception_queue` rows in a decided terminal state (`resolved` OR `escalated` — an aged-out card is
   *  NOT a player decision, excluded; a pending card has no resolution yet, excluded) whose
   *  `candidate_actions[].source` tag matches one of `sourceTags` (the R6 jsonb scan — `hasPendingFor
   *  Building`'s own EXISTS-over-jsonb_array_elements idiom, correlated so a card carrying MULTIPLE
   *  matching candidates never double-counts), newest first (`resolved_at DESC`), capped at `limit`.
   *  Empty `sourceTags` short-circuits — no query issued. */
  async extractResolvedExceptionDecisions(
    playerId: string,
    sourceTags: readonly string[],
    limit: number,
  ): Promise<CategoryDecisionEntry[]> {
    if (sourceTags.length === 0) return [];
    const tagConditions = sql.join(
      sourceTags.map((t) => sql`elem->>'source' = ${t}`),
      sql` OR `,
    );
    const result = await this.db.execute(sql`
      SELECT resolved_at, resolution
      FROM exception_queue AS eq
      WHERE eq.player_id = ${playerId}::uuid
        AND eq.resolution_status IN ('resolved', 'escalated')
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(eq.candidate_actions) AS elem WHERE ${tagConditions}
        )
      ORDER BY eq.resolved_at DESC
      LIMIT ${limit}
    `);
    // PG driver returns either { rows: [...] } or a bare array depending on version (the
    // `hasPendingForBuilding` precedent) — defensively accept either shape. Unlike a typed Drizzle
    // `.select()` (which auto-hydrates a `timestamptz` column to a `Date`), the RAW `db.execute(sql...)`
    // path returns `resolved_at` as an ISO STRING — `new Date(...)` normalizes it so `occurredAt` is
    // ALWAYS a real `Date` for both extractor methods (the merge/sort in `extractCategoryDecisions` below
    // calls `.getTime()` on it — a bare string would throw there).
    const rows = ((result as unknown as { rows?: unknown[] }).rows ??
      (result as unknown as unknown[])) as ResolvedExceptionRow[];
    return rows.map((r) => ({
      kind: 'RESOLVED_EXCEPTION' as const,
      occurredAt: new Date(r.resolved_at),
      provenance: r.resolution?.method ?? 'UNKNOWN',
      chosenActionId: r.resolution?.chosen_action_id,
    }));
  }

  /**
   * The merged, newest-first, N-capped decision log for ONE category (D5's "last N real decisions" —
   * `mapPlayerDecisionsToSeedScript`'s own input). Looks up the category's binding via
   * `CATEGORY_DECISION_BINDINGS` (keyed by `TaskCategoryKey`, resolved from `categoryCode` through the
   * SAME catalogue code↔key lookup the rest of this module uses — never a parallel numeric table).
   * Fetches BOTH sources at `limit` each (never MORE than `limit` total is needed, and this bounds each
   * query independently — cheaper than fetching everything then truncating), merges, re-sorts by
   * `occurredAt` DESC (a structural row and a resolved-card row from the SAME instant sort by array
   * insertion order — deterministic, since `Array.prototype.sort` is stable in V8/Node), and truncates to
   * `limit`.
   */
  async extractCategoryDecisions(
    playerId: string,
    categoryCode: number,
    limit: number,
  ): Promise<CategoryDecisionEntry[]> {
    const key = taskCategoryCatalogueEntryForCode(categoryCode).key;
    const binding = CATEGORY_DECISION_BINDINGS[key];
    const [structural, resolved] = await Promise.all([
      this.extractStructuralDecisions(playerId, binding.structuralDecisionTypes, limit),
      this.extractResolvedExceptionDecisions(playerId, binding.resolvedExceptionSourceTags, limit),
    ]);
    return [...structural, ...resolved]
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
      .slice(0, limit);
  }
}
