// IMPLEMENTS: docs/superpowers/specs/2026-06-10-phase-19-autonomy-ceiling-backend-design.md §3.4/§3.5
//             (the autonomy_reports queue — one OPEN report per (lieutenant, cycle); the producer appends issues, one per
//             refused category) -- Phase-19 L1a Task 5 (autonomy report repository) --
//
// `AutonomyReportRepository` — the persisted access layer for the Phase-19 L1a `autonomy_reports` entity (09's
// schema_queues_exceptions_cuestack.ts — the `autonomyReport` table). A DEDICATED repo (kept SEPARATE from
// AutonomyCeilingRepository — one-responsibility-per-file: the ceiling-state repo owns the budget, this owns the report
// queue). R9.3: 09 is the source of truth; this file IMPORTS the schema and NEVER re-declares it. The runtime role app_rw
// has SELECT/INSERT/UPDATE on autonomy_reports. PARAMETERIZED binds (no string interpolation), DETERMINISTIC (no RNG —
// the report_id is the schema's defaultRandom(); the issue_id is the producer's randomUUID).
//
// SCOPE: getOpenReport + insertReport + appendIssues are the T5 producer's read-then-append path. getOwnedReport +
// recordDecision (the T6 player-facing resolve path) are added below alongside the resolve endpoint.

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull, lte, sql } from 'drizzle-orm';

import { DB } from '../../../db/db.module';
import type { DrizzleClient } from '../../../db';
import { autonomyReport, type AutonomyReportRow } from '../../../db/schema/queues_exceptions_cuestack';
import type { ReportIssue } from './option-pairs';

// The DB enforces `1 <= jsonb_array_length(issues) <= 5` (ar_issues_length_chk) — a report ALWAYS carries at least one
// issue (an empty report has no meaning). So insertReport opens the report WITH its first issue (never an empty array),
// and appendIssues only ever grows it (the producer's cap guard keeps it ≤ reportIssuesMax, within the DB's ≤ 5).

@Injectable()
export class AutonomyReportRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * Read the lieutenant's OPEN report for the given cycle (resolved_at IS NULL AND cycle_id = …), or null when none is
   * open yet (the producer then inserts one). NOT player-scoped: the tick has already resolved the player-owned
   * lieutenant, so this is an internal post-ownership read (the SAME convention the ceiling repo's tick reads use). A
   * READ — no state change.
   */
  async getOpenReport(lieutenantId: string, cycleId: number): Promise<AutonomyReportRow | null> {
    const rows = await this.db
      .select()
      .from(autonomyReport)
      .where(
        and(
          eq(autonomyReport.lieutenant_id, lieutenantId),
          eq(autonomyReport.cycle_id, cycleId),
          isNull(autonomyReport.resolved_at),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * INSERT a fresh OPEN report for the (player, lieutenant, cycle) seeded WITH its first issue(s) — the DB's
   * ar_issues_length_chk (1..5) forbids an empty report, so the producer opens the report on the FIRST refused category
   * with that issue already present (length 1). emitted_at/report_id keep their schema DEFAULTs (now() / defaultRandom());
   * resolved_at stays null (open). Returns the inserted row. PARAMETERIZED. DETERMINISTIC.
   */
  async insertReport(
    playerId: string,
    lieutenantId: string,
    cycleId: number,
    issues: ReportIssue[],
  ): Promise<AutonomyReportRow> {
    const [created] = await this.db
      .insert(autonomyReport)
      .values({ player_id: playerId, lieutenant_id: lieutenantId, cycle_id: cycleId, issues })
      .returning();
    return created;
  }

  /**
   * OVERWRITE the report's issues jsonb with the supplied array (the producer reads the current issues, pushes one, and
   * writes the whole array back — a per-(lieutenant,cycle) single-row write; the tick is single-threaded over a player's
   * lieutenants, so the read-modify-write is safe). Keyed by report_id (the PK). PARAMETERIZED. DETERMINISTIC.
   */
  async appendIssues(reportId: string, issues: ReportIssue[]): Promise<void> {
    await this.db.update(autonomyReport).set({ issues }).where(eq(autonomyReport.report_id, reportId));
  }

  /**
   * Read a PLAYER-OWNED report by id (the T6 resolve ownership gate): the report row WHERE report_id = … AND
   * player_id = … (so another player's report is invisible → null → the service throws 404, never a cross-player leak /
   * mutation). UNLIKE getOpenReport (the internal post-ownership tick read), this is the PLAYER-facing path — it is
   * player-scoped, and it does NOT filter resolved_at (a fully-resolved report is still owned; the per-issue conflict guard
   * lives in the service over player_decision, not over resolved_at). Returns the row or null. A READ — no state change.
   */
  async getOwnedReport(playerId: string, reportId: string): Promise<AutonomyReportRow | null> {
    const rows = await this.db
      .select()
      .from(autonomyReport)
      .where(and(eq(autonomyReport.report_id, reportId), eq(autonomyReport.player_id, playerId)))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * Find the OLDEST stale OPEN report for a lieutenant whose cycle_id is <= maxCycleId (i.e. it has been open for at
   * least `currentCycle - report.cycle_id` cycles, which is >= backlogCapCycles when maxCycleId = currentCycle -
   * backlogCapCycles). Returns the first such row (oldest by emitted_at), or null when no stale open report exists.
   * This is the default_on_timeout guard: the report's backlog_age_cycles has reached the cap. A READ — no state change.
   */
  async findStaleOpenReport(lieutenantId: string, maxCycleId: number): Promise<AutonomyReportRow | null> {
    const rows = await this.db
      .select()
      .from(autonomyReport)
      .where(
        and(
          eq(autonomyReport.lieutenant_id, lieutenantId),
          isNull(autonomyReport.resolved_at),
          lte(autonomyReport.cycle_id, maxCycleId),
        ),
      )
      .orderBy(autonomyReport.emitted_at)
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * All OPEN (resolved_at IS NULL) reports for a player, oldest first (the inbox read — Phase-21 T1). NOT lieutenant-scoped:
   * returns the full open queue for the player (all their lieutenants' open reports). A READ — no state change.
   */
  async listOpenByPlayer(playerId: string) {
    return this.db.select().from(autonomyReport)
      .where(and(eq(autonomyReport.player_id, playerId), isNull(autonomyReport.resolved_at)))
      .orderBy(autonomyReport.emitted_at);
  }

  /**
   * RECORD the player's per-issue decision (the T6 resolve write): OVERWRITE the report's player_decision jsonb with the
   * supplied map (issue_id → 'A'|'B' — the service read-modified it: the prior decisions plus this issue's choice), and —
   * when `resolved` (EVERY issue now has a decision) — stamp resolved_at = now() (the report leaves the OPEN queue). When
   * `resolved` is false (issues remain undecided) resolved_at stays null (the report stays open for the rest). Keyed by
   * report_id (the PK; the service already resolved the player-owned row via getOwnedReport). PARAMETERIZED. DETERMINISTIC.
   */
  async recordDecision(
    reportId: string,
    playerDecision: Record<string, 'A' | 'B'>,
    resolved: boolean,
  ): Promise<void> {
    // LIMITATION(v1.x): full-overwrite of player_decision — a concurrent resolve of two issues on the same multi-issue
    // report would lose-update. Cannot manifest in L1a (1 archetype = 1 category = 1 issue/cycle). Use jsonb merge / row
    // lock when multi-issue resolve lands.
    await this.db
      .update(autonomyReport)
      .set({
        player_decision: playerDecision,
        ...(resolved ? { resolved_at: sql`now()` } : {}),
      })
      .where(eq(autonomyReport.report_id, reportId));
  }
}
