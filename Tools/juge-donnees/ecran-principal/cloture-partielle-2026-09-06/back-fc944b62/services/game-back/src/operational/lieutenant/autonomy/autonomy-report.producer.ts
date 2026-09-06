// IMPLEMENTS: docs/superpowers/specs/2026-06-10-phase-19-autonomy-ceiling-backend-design.md §3.4/§3.5
//             (the decoupled refusal → autonomy_reports producer — subscribes to AutonomyCeilingRefusalEvent, dedups per
//             (cycle, category), appends an issue with the per-archetype A/B options) -- Phase-19 L1a Task 5 --
//
// `AutonomyReportProducer` — the Phase-19 L1a refusal producer. Mirrors ExceptionProducerService EXACTLY: an
// OnModuleInit that SUBSCRIBES (onModuleInit) to the AutonomyCeilingRefusalEvent the LIEUTENANT_TICK emits when a
// delegated lieutenant's autonomous EXECUTE_DEFAULT is refused (its primary category's budget is depleted), and appends
// an issue (the per-archetype OPTION_PAIRS A/B pair) onto the lieutenant's OPEN autonomy_reports report.
//
// DECOUPLING: the LIEUTENANT_TICK imports NOTHING from this producer — it emits onto the shared CityEventBus and THIS
// (decoupled) producer subscribes (one-way coupling lieutenant → bus ← reports). The SAME seam the exception producers use.
//
// CONTAINMENT: the bus isolates each listener in its own try/catch (a throwing handler can't break the tick or a sibling
// listener — city-event-bus.ts §dispatch). On top of that, the subscriber callback is synchronous but the work is async,
// so the returned promise's rejection is caught HERE (the `.catch` on onModuleInit) and logged as a contained fault — an
// async failure (e.g. a transient DB error) never surfaces as an unhandled rejection.
//
// DEDUP + BACKLOG CAP: the refusal event fires on EVERY depleted EXECUTE_DEFAULT tick, so a naive append would flood the
// report. Two guards (both per the OPEN report for the lieutenant's current cycle): (1) BACKLOG CAP — at most
// `reportIssuesMax` issues per report (extra refusals are dropped once the backlog is full); (2) DEDUP per (cycle,
// category) — at most ONE issue per refused category per cycle (a category already in the report is skipped). Together:
// exactly one issue per category per cycle, capped at the backlog max.

import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { CityEventBus, type AutonomyCeilingRefusalEvent } from '../../../citysim/events/city-event-bus';
import { lieutenantTunables } from '../lieutenant-tunables';
import type { LieutenantArchetype } from '../lieutenant-archetype';
import { AutonomyCeilingRepository } from './autonomy-ceiling.repository';
import { AutonomyReportRepository } from './autonomy-report.repository';
import { OPTION_PAIRS, type ReportIssue } from './option-pairs';

/** Subscribes to the LIEUTENANT_TICK's autonomy-ceiling refusal event and appends a report issue (Phase-19 L1a producer). */
@Injectable()
export class AutonomyReportProducer implements OnModuleInit {
  private readonly logger = new Logger(AutonomyReportProducer.name);

  constructor(
    private readonly bus: CityEventBus,
    private readonly reports: AutonomyReportRepository,
    private readonly ceiling: AutonomyCeilingRepository,
  ) {}

  onModuleInit(): void {
    this.bus.onAutonomyCeilingRefusal((e) => {
      // The bus delivers synchronously + isolates listeners; the producer's own async work is contained here so a
      // transient DB fault can never bubble out as an unhandled rejection (it is logged and the queue stays consistent).
      this.handle(e).catch((err) =>
        this.logger.error(
          `autonomy report producer failed (contained): ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    });
  }

  /** Resolve the OPEN report for the lieutenant's current cycle and record the refused category's issue: OPEN a new report
   *  (seeded with this issue) when none is open, else APPEND onto the existing one — guarded by the backlog cap + the
   *  per-(cycle, category) dedup (the DB forbids an empty report, so the first issue is inserted, not appended-to-empty). */
  private async handle(e: AutonomyCeilingRefusalEvent): Promise<void> {
    const state = await this.ceiling.getState(e.lieutenantId);
    if (!state) return; // a refused lieutenant always has a seeded state row; defensive no-op if not.
    const cycleId = state.cycle_id;

    const pair = OPTION_PAIRS[e.archetype as LieutenantArchetype];
    const issue: ReportIssue = {
      issue_id: randomUUID(),
      category: e.category,
      refused_action: e.archetype,
      option_a: pair.option_a,
      option_b: pair.option_b,
    };

    const report = await this.reports.getOpenReport(e.lieutenantId, cycleId);
    if (!report) {
      // No open report for this cycle → open one seeded with this first issue (length 1 — satisfies the DB's 1..5 check).
      await this.reports.insertReport(e.playerId, e.lieutenantId, cycleId, [issue]);
      return;
    }

    const issues = (report.issues as ReportIssue[]) ?? [];
    if (issues.length >= lieutenantTunables.autonomyCeiling.reportIssuesMax) return; // backlog cap.
    if (issues.some((i) => i.category === e.category)) return; // dedup per (cycle, category).
    await this.reports.appendIssues(report.report_id, [...issues, issue]);
  }
}
