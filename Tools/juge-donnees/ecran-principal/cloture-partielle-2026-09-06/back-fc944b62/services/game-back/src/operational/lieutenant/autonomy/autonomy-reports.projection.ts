// IMPLEMENTS: docs/superpowers/specs/2026-06-10-phase-21-autonomy-inbox-design.md §4-T1 — the player-facing
// autonomy-report projection (R2.2/P5: option buckets + texts only; the budget counter/cap NEVER appear here).
import type { ReportIssue, AutonomyOption } from './option-pairs';

export interface AutonomyOptionView { label_key: string; effect_kind: string; projected_outcome: string; }
export interface AutonomyIssueView {
  issue_id: string; category: string; refused_action: string;
  /** 'A' | 'B' once decided, null before — null surfaces as "" through Unity JsonUtility (the consumer checks string-empty). */
  decided: 'A' | 'B' | null;
  option_a: AutonomyOptionView; option_b: AutonomyOptionView;
}
export interface AutonomyReportView {
  report_id: string; lieutenant_id: string;
  /** Legible queue-age count (canon c7 §2): current ceiling cycle − the report's cycle, floored at 0. */
  backlog_age_cycles: number;
  issues: AutonomyIssueView[];
}

const optionView = (o: AutonomyOption): AutonomyOptionView =>
  ({ label_key: o.label_key, effect_kind: o.effect_kind, projected_outcome: o.projected_outcome });

/** Project one open report row (+ the lieutenant's CURRENT ceiling cycle) to its player view. */
export function projectReport(
  row: { report_id: string; lieutenant_id: string; cycle_id: number; issues: unknown; player_decision: unknown },
  currentCycle: number,
): AutonomyReportView {
  const decisions = (row.player_decision as Record<string, 'A' | 'B'>) ?? {};
  const issues = ((row.issues as ReportIssue[]) ?? []).map((i) => ({
    issue_id: i.issue_id, category: i.category, refused_action: i.refused_action,
    decided: decisions[i.issue_id] ?? null,
    option_a: optionView(i.option_a), option_b: optionView(i.option_b),
  }));
  return {
    report_id: row.report_id, lieutenant_id: row.lieutenant_id,
    backlog_age_cycles: Math.max(0, currentCycle - row.cycle_id),
    issues,
  };
}
