// IMPLEMENTS: docs/superpowers/specs/2026-06-10-phase-19-autonomy-ceiling-backend-design.md §3.6 (the resolve service —
//             the player picks A or B on an open report issue; the chosen option's effect_kind dispatches through the
//             AutonomyOptionRegistry to its handler, which runs the SAME operational action the delegated EXECUTE_DEFAULT
//             would have taken; the per-issue decision is recorded + the report closes once every issue is decided)
//             -- Phase-19 L1a Task 6 --
//
// `AutonomyReportsService` — MIRRORS ExceptionsService.resolve's validation ORDER: ownership (404) → issue-exists (404) →
// already-decided (409) → dispatch the handler → record the decision. The handler owns the side-effect (the operational
// call); the service owns the guards + the player_decision write. A report closes (resolved_at = now()) only once EVERY
// issue has a decision (a multi-issue report stays open until the last issue is resolved).

import { Injectable, Logger } from '@nestjs/common';

import { ApiError } from '../../../protocol/api-error';
import { LieutenantRepository } from '../lieutenant.repository';
import { AutonomyReportRepository } from './autonomy-report.repository';
import { AutonomyCeilingRepository } from './autonomy-ceiling.repository';
import { AutonomyOptionRegistry } from './option-handlers/autonomy-option-handler';
import { projectedOutcomeToEventType, type ReportIssue } from './option-pairs';
import { projectReport, type AutonomyReportView } from './autonomy-reports.projection';
import { HiddenCurriculumService } from '../../reputation/hidden-curriculum.service';

@Injectable()
export class AutonomyReportsService {
  private readonly logger = new Logger(AutonomyReportsService.name);
  constructor(
    private readonly repo: AutonomyReportRepository,
    private readonly ltRepo: LieutenantRepository,
    private readonly registry: AutonomyOptionRegistry,
    private readonly ceilingRepo: AutonomyCeilingRepository,
    // W6.2 C0 — the ring d'événements témoins maillon (forme C, design §3 C0). ReputationModule already exports
    // HiddenCurriculumService and LieutenantModule already imports ReputationModule (the DISTRIBUTION binding's
    // LekMemoryService read, file header) — no new module wiring needed, this is a straight constructor injection.
    private readonly hiddenCurriculum: HiddenCurriculumService,
  ) {}

  /** The player's OPEN reports, projected (R2.2). Oldest first. */
  async listOpen(playerId: string): Promise<AutonomyReportView[]> {
    const rows = await this.repo.listOpenByPlayer(playerId);
    const views: AutonomyReportView[] = [];
    const cycles = new Map<string, number>(); // per-call memo — several open reports usually share one lieutenant
    for (const row of rows) {
      let cycle = cycles.get(row.lieutenant_id);
      if (cycle === undefined) { cycle = await this.currentCycleOf(row.lieutenant_id); cycles.set(row.lieutenant_id, cycle); }
      views.push(projectReport(row, cycle));
    }
    return views;
  }

  /** Read the lieutenant's current ceiling cycle_id (for backlog_age_cycles). Returns 0 when no state row exists yet
   *  (the ceiling has not been seeded — the lieutenant has never been gated). A pure READ — no lazy-seed (R2.2). */
  private async currentCycleOf(lieutenantId: string): Promise<number> {
    const row = await this.ceilingRepo.getState(lieutenantId);
    return row?.cycle_id ?? 0;
  }

  /**
   * Resolve ONE issue on a player-owned report: validate ownership (404) + issue-exists (404) + not-already-decided (409),
   * then dispatch the picked option's `effect_kind` through the registry (the handler runs the operational action + returns
   * a qualitative outcome string), record the per-issue decision, and close the report once every issue is decided. The
   * player_id comes from the JWT (the controller resolves it — never the body, R-ID-3).
   */
  async resolveIssue(
    playerId: string,
    reportId: string,
    issueId: string,
    chosen: 'A' | 'B',
  ): Promise<string> {
    const report = await this.repo.getOwnedReport(playerId, reportId);
    if (!report) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'no such report.' });
    }

    const issues = (report.issues as ReportIssue[]) ?? [];
    const issue = issues.find((i) => i.issue_id === issueId);
    if (!issue) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'no such issue.' });
    }

    const decision = (report.player_decision ?? {}) as Record<string, 'A' | 'B'>;
    if (decision[issueId]) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', { message: 'issue already resolved.' });
    }

    const option = chosen === 'A' ? issue.option_a : issue.option_b;

    // Resolve the lieutenant's current delegation buildings (the handler reads them for its operational call). A null row
    // (a deleted lieutenant whose report lingered) → null buildings → the handler guards them → a NOOP outcome.
    const lt = await this.ltRepo.getDelegationRow(report.lieutenant_id);
    const outcome = await this.registry.require(option.effect_kind).apply({
      playerId,
      lieutenantId: report.lieutenant_id,
      assignedBuildingId: lt?.assigned_building_id ?? null,
      targetBuildingId: lt?.target_building_id ?? null,
    });

    decision[issueId] = chosen;
    const allDecided = issues.every((i) => decision[i.issue_id]);
    await this.repo.recordDecision(reportId, decision, allDecided);

    // W6.2 C0 — the witnessed-event seam (design §3 C0): what the house DOES, shaped by what the PLAYER decided
    // (canon reputation_mechanics.md:148). `option.projected_outcome` varies per decision (each ReportIssue's A/B
    // pair carries two DIFFERENT ProjectedOutcomeBucket values, option-pairs.ts) — so the ring genuinely records
    // the player's real choice, not a per-lieutenant constant (the v1/v2 defects this replaces, journal v3/v4).
    // ⚠️ CORRIGÉ 2026-08-13 (revue ⊥, M-1) — NO all-or-nothing guarantee exists here (no ambient
    // transaction wraps this method — `db` is pool-backed, socle ⛔). Ordering is deliberate: written
    // LAST, after `recordDecision` has committed, so that if THIS call throws, the issue is already
    // marked resolved (not re-resolvable — no double-apply of `outcome` above) and only the
    // witnessed-event ring is missing one entry. The inverse order (tried first, reverted) had the
    // WORSE failure mode: a throw here left the issue UNRESOLVED while the effect had already applied,
    // making the SAME issue re-resolvable and re-appliable by the player.
    await this.hiddenCurriculum.appendWitnessedEvent(
      report.lieutenant_id,
      playerId,
      projectedOutcomeToEventType(option.projected_outcome),
    );

    return outcome;
  }

  /**
   * default_on_timeout (§3.6): auto-apply the default option (A) on every UNDECIDED issue of the supplied stale open
   * report. Called by LieutenantTickService.applyDefaultOnTimeout when the report's backlog_age_cycles
   * has reached the backlogCapCycles cap — the player did not resolve it in time. The auto-default applies the A-branch
   * effect for each undecided issue (the same handler `resolveIssue` would call), records the decisions, and closes the
   * report. Audit-logged via the NestJS Logger (the standard audit trail for auto-applied decisions). DETERMINISTIC (no
   * RNG — all state is derived from the persisted report + the handler effects). Defensive: if the report has no undecided
   * issues (already fully decided) this is a no-op (the `allDecided` check closes it and logs).
   */
  async autoDefault(
    report: { report_id: string; lieutenant_id: string; player_id: string; issues: unknown; player_decision: unknown },
    assignedBuildingId: string | null,
    targetBuildingId: string | null,
  ): Promise<void> {
    const issues = (report.issues as ReportIssue[]) ?? [];
    const decision = (report.player_decision ?? {}) as Record<string, 'A' | 'B'>;

    for (const issue of issues) {
      if (decision[issue.issue_id]) continue; // already decided — skip (dedup: only auto-default undecided issues).
      try {
        await this.registry.require(issue.option_a.effect_kind).apply({
          playerId: report.player_id,
          lieutenantId: report.lieutenant_id,
          assignedBuildingId,
          targetBuildingId,
        });
      } catch {
        // A faulting handler (e.g. a transient service error) is logged but does NOT abort the auto-default: the
        // decision is still recorded ('A') so the report closes and does not re-trigger the cap next tick. The
        // operational effect was not applied — the audit log captures this. This is the SAME benign-catch posture the
        // COOK binding's applyExecuteDefault uses (a benign 409 must not block the delegation tick).
        this.logger.error(
          `autonomy auto-default: handler ${issue.option_a.effect_kind} faulted for report=${report.report_id} ` +
            `issue=${issue.issue_id} — decision recorded as A regardless (the report closes).`,
        );
      }
      decision[issue.issue_id] = 'A';
    }

    const allDecided = issues.every((i) => decision[i.issue_id]);
    await this.repo.recordDecision(report.report_id, decision, allDecided);
    this.logger.log(
      `autonomy auto-default (§3.6 default_on_timeout): report=${report.report_id} lieutenant=${report.lieutenant_id} ` +
        `— ${issues.filter((i) => i !== undefined).length} issue(s) auto-defaulted to A, report closed=${String(allDecided)}.`,
    );
  }
}
