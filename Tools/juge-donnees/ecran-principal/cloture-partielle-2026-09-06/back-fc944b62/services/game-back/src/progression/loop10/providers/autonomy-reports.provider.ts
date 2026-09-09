// IMPLEMENTS: docs/superpowers/plans/2026-07-10-p3-A-session-spine-plan.md §C6 (HL provider #4 —
//             AUTONOMY_REPORTS_PENDING)
//             Design: docs/superpowers/specs/2026-07-10-p3-A-session-spine-design.md §8 ("unresolved
//             `autonomy_reports` (LIVE Phase-19/21; urgency ∝ oldest report age)").
//             Substrate (verified this chunk): `autonomy_reports` (`queues_exceptions_cuestack.
//             ts:104-125` — Phase-19 L1a). "Unresolved" = `resolved_at IS NULL` (the SAME definition
//             `AutonomyReportRepository`'s own `listOpen`-backing query uses, `autonomy-report.
//             repository.ts:124` — NOT `player_decision IS NULL`, which the schema's own partial index
//             comment uses for a DIFFERENT hot-path (a report where NO issue has EVER been decided) —
//             a multi-issue report with SOME-but-not-all issues decided still has `resolved_at IS NULL`
//             and IS still "pending" from the player's point of view).
//             — P3-A C6 — 2026-07-10
//
// `AutonomyReportsHlCardProvider` — ONE candidate: the player's OLDEST unresolved report (design's own
// "urgency ∝ OLDEST report age" wording is singular/aggregate, not per-report):
//   impact  = issuesCount / 5 — the schema's OWN documented cap (`queues_exceptions_cuestack.
//     ts:111`: "jsonb 1..5 issues (cap applicatif ... autonomy_report_issues_max=5)"); reusing this
//     EXISTING documented invariant rather than inventing a new core_loops tunable for a Phase-19
//     concept this chunk does not own.
//   urgency = clamp(ageHours / `hl_autonomy_report_urgency_horizon_hours` (C6, 48h default), 0, 1) —
//     real-wall-clock age (mirrors `exception-queue-tick.service.ts`'s OWN real-time-domain reading —
//     `emitted_at` is a real timestamptz, not a game-tick).
// Deterministic (D13): the ONE clock read (`Date.now()`) happens once per call — no Math.random.

import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, isNull } from 'drizzle-orm';

import { DB } from '../../../db/db.module';
import type { DrizzleClient } from '../../../db';
import { autonomyReport } from '../../../db/schema/queues_exceptions_cuestack';
import { coreLoopsTunables } from '../../../core_loops/core-loops-tunables';
import { clamp01, HL_CARD_PROVIDER_CATALOGUE, HlCardProviderType, type HlCardCandidate, type HlCardProvider } from '../hl-card-types';

const CATALOGUE_CODE = HL_CARD_PROVIDER_CATALOGUE.find((e) => e.key === HlCardProviderType.AUTONOMY_REPORTS_PENDING)!.code;

/** The schema's OWN documented issues cap (`queues_exceptions_cuestack.ts:111` —
 *  `autonomy_report_issues_max=5`) — reused verbatim, not a NEW core_loops tunable. */
const AUTONOMY_REPORT_ISSUES_MAX = 5;

@Injectable()
export class AutonomyReportsHlCardProvider implements HlCardProvider {
  readonly providerType = HlCardProviderType.AUTONOMY_REPORTS_PENDING;

  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  async getCandidates(playerId: string): Promise<HlCardCandidate[]> {
    const rows = await this.db
      .select({ reportId: autonomyReport.report_id, issues: autonomyReport.issues, emittedAt: autonomyReport.emitted_at })
      .from(autonomyReport)
      .where(and(eq(autonomyReport.player_id, playerId), isNull(autonomyReport.resolved_at)))
      .orderBy(asc(autonomyReport.emitted_at))
      .limit(1);

    if (rows.length === 0) return [];
    const oldest = rows[0];
    const issuesCount = Array.isArray(oldest.issues) ? oldest.issues.length : 0;
    const ageHours = (Date.now() - oldest.emittedAt.getTime()) / 3_600_000;
    const horizonHours = coreLoopsTunables.hlAutonomyReportUrgencyHorizonHours;

    return [
      {
        providerType: this.providerType,
        decisionTypeCode: CATALOGUE_CODE,
        impact: clamp01(issuesCount / AUTONOMY_REPORT_ISSUES_MAX),
        urgency: clamp01(ageHours / horizonHours),
        targetRef: { entity: 'autonomy_reports', report_id: oldest.reportId },
        options: [
          { label: 'hl.option.autonomy_reports.review_now' },
          { label: 'hl.option.autonomy_reports.leave_pending' },
        ],
      },
    ];
  }
}
