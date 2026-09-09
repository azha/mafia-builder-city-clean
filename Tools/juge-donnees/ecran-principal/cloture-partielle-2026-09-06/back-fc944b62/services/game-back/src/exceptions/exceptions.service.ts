// IMPLEMENTS: docs/superpowers/specs/2026-06-09-phase-16-raid-exception-design.md §4-T2 (resolve dispatches `method`
//             through the ExceptionEffectRegistry — the legacy ONE_TIME/ESCALATE/ADD_RULE are now handlers, joined by the
//             raid effects REPAIR/BRIBE/LAY_LOW) + Phase-14 §T4/§5 (listQueue band projection; resolve ownership/pending
//             guards). The handlers own their side-effects + markResolved; resolve returns the qualitative outcome enum.

import { Injectable } from '@nestjs/common';

import { ApiError } from '../protocol/api-error';
import { ExceptionsRepository } from './exceptions.repository';
import {
  ExceptionsProjectionService,
  queuePressureBand,
  backlogBadge,
  scriptComplexityBand,
  suggestedDisposition,
  type ExceptionCardProjection,
  type CandidateActionView,
  type EffectType,
  type QueuePressureBand,
  type ScriptComplexityBand,
} from './exceptions.projection.service';
import { ExceptionEffectRegistry } from './effects/exception-effect-registry.service';
import { ProgressionService } from '../progression/progression.service';
import { SessionService } from '../session/session.service';
import { LieutenantRepository } from '../operational/lieutenant/lieutenant.repository';
import { coreLoopsTunables } from '../core_loops/core-loops-tunables';
import { MasteryAccumulatorService } from '../meta_progression/mastery-accumulator.service';
import { IsostaticDebtService } from '../meta_progression/isostatic-debt.service';
import { OnboardingFunnelRepository } from '../onboarding/onboarding-funnel.repository';

/** The resolution method = the effect type (validated by the registry; an unknown value → 422). */
export type ResolveMethod = EffectType;

/** `listQueue`'s return shape (P3-A C3, design §5): the band-projected cards PLUS the two NEW
 *  queue-level projections (`queue_pressure_band` per-lieutenant-scope worst-case, `backlog_badge`
 *  player-wide total) — R2.2 bands only, thresholds from getters. */
export interface ExceptionQueueView {
  cards: ExceptionCardProjection[];
  queuePressureBand: QueuePressureBand;
  backlogBadge: boolean;
}

/** `listEscalations`'s return shape (P3-A C4, D6): the player's `escalated` cards, band-projected,
 *  newest first, PLUS `total` — the escalations GET's pagination math (design §5 "Escalation surface"). */
export interface ExceptionEscalationsView {
  escalations: ExceptionCardProjection[];
  total: number;
}

@Injectable()
export class ExceptionsService {
  constructor(
    private readonly repo: ExceptionsRepository,
    private readonly projection: ExceptionsProjectionService,
    private readonly registry: ExceptionEffectRegistry,
    private readonly progression: ProgressionService,
    // P3-A C2 (D2/D3, additive) — the session counter seam. `src/exceptions/` resolve contract is
    // otherwise byte-untouched: same signature, same guards, same return value; ONE added line below.
    private readonly sessions: SessionService,
    // P3-A C4 (additive) — the script-complexity band seam (design §5): reads a card's owning
    // lieutenant's compiled rule count. REUSE — `AddRuleHandler` (effects/add-rule.handler.ts) already
    // injects the SAME `LieutenantRepository` from the SAME already-imported `LieutenantModule`
    // (exceptions.module.ts), so this adds zero new module-level wiring.
    private readonly lieutenantRepo: LieutenantRepository,
    // P3-F C2 (additive) — the R6 resolve-hook sibling seam (C0 §6): a heat-pressure-sourced resolved
    // card feeds HEAT_MANAGEMENT +1. Same posture as `sessions`/`progression` above — a plain injected
    // service, additive at the SAME hook point, resolve()'s own contract byte-untouched.
    private readonly masteryAccumulator: MasteryAccumulatorService,
    // P3-G C7 (additive) — the R8 resolve-hook sibling seam (C0-reanchor §7): an ADD_RULE resolution
    // decays isostatic debt for every LIVE capability sharing that decay binding. Same posture as
    // `masteryAccumulator` above — a plain injected service, additive at the SAME hook point, resolve()'s
    // own contract byte-untouched (hazard 3 — the existing resolve path stays byte-identical).
    private readonly isostaticDebt: IsostaticDebtService,
    // W1.1-a C6 (additive) — the funnel-state resolve-hook sibling seam (design D3/IM-2): FIRST_COMMIT/
    // SECOND_DECISION, account-scoped (never `gameplay_session.exceptions_resolved` — a sessionless
    // `signup → resolve` must still advance the funnel, IM-2). Same posture as `masteryAccumulator`/
    // `isostaticDebt` above — a plain injected repository, additive at the SAME hook point, resolve()'s
    // own contract byte-untouched.
    private readonly onboardingFunnel: OnboardingFunnelRepository,
  ) {}

  /**
   * The player's PENDING cards, band-projected (R2.2 — the raw confidence/priority/severity never
   * escape), PLUS the two P3-A C3 queue-level projections (design §5):
   *   - `queuePressureBand` — the WORST (most saturated) `QueuePressureBand` across the player's
   *     distinct lieutenant-scopes (grouping the SAME rows already fetched here — zero extra DB query;
   *     each scope's own pending count is compared against `core_loops.
   *     exception_queue_cap_per_lieutenant`/`.exceptionQueueWarnThresholdPerLieutenant`, the SAME
   *     thresholds `ExceptionsRepository.insert`'s D5 cap guard reads).
   *   - `backlogBadge` — the player's TOTAL pending count (every scope combined — canon "home screen"
   *     signal, distinct from the per-lieutenant band above) vs `core_loops.
   *     exception_backlog_badge_threshold`.
   * PLUS the two P3-A C4 PER-CARD projections (design §5, ADDITIVE — every OTHER card field is
   * byte-untouched):
   *   - `suggested_disposition` — `'ESCALATE'` when the card's raw confidence is below the getter
   *     threshold, else omitted (R2.2 — `ExceptionsProjectionService.suggestedDisposition`, PURE).
   *   - `script_complexity_band` — on ADD_RULE-capable cards owned by a lieutenant only: the
   *     lieutenant's compiled rule count (`LieutenantRepository.getProjectionRow`, REUSE) vs
   *     `core_loops.exception_max_rules_per_lieutenant`, banded. Cached per-lieutenant WITHIN this one
   *     call (a `Map`) so a lieutenant with several ADD_RULE-capable cards costs ONE extra read, not N.
   */
  async listQueue(playerId: string): Promise<ExceptionQueueView> {
    const rows = await this.repo.listPending(playerId);
    // C3 (D7) — resolve every referenced lieutenant's name ONCE, before projecting any card.
    const names = await this.resolveLieutenantNames(playerId, rows);

    const confidenceThreshold = coreLoopsTunables.exceptionSuggestedActionConfidenceThreshold;
    const maxRules = coreLoopsTunables.exceptionMaxRulesPerLieutenant;
    const complexityByLieutenant = new Map<string, ScriptComplexityBand>();

    const cards: ExceptionCardProjection[] = [];
    for (const r of rows) {
      const card = this.projection.projectCard(r, names);
      card.suggested_disposition = suggestedDisposition(r.confidence, confidenceThreshold);
      if (r.lieutenant_id && this.isAddRuleCapable(card)) {
        let band = complexityByLieutenant.get(r.lieutenant_id);
        if (band === undefined) {
          band = await this.scriptComplexityBandForLieutenant(playerId, r.lieutenant_id, maxRules);
          complexityByLieutenant.set(r.lieutenant_id, band);
        }
        card.script_complexity_band = band;
      }
      cards.push(card);
    }

    const cap = coreLoopsTunables.exceptionQueueCapPerLieutenant;
    const warn = coreLoopsTunables.exceptionQueueWarnThresholdPerLieutenant;
    const byScope = new Map<string, number>();
    for (const r of rows) {
      const key = r.lieutenant_id ?? '__player_level__';
      byScope.set(key, (byScope.get(key) ?? 0) + 1);
    }
    let worst: QueuePressureBand = 'normal';
    for (const count of byScope.values()) {
      const band = queuePressureBand(count, cap, warn);
      if (band === 'saturated') {
        worst = 'saturated';
        break; // saturated is the worst possible band — no later scope can push it further.
      }
      if (band === 'warning') worst = 'warning';
    }

    const backlog = backlogBadge(rows.length, coreLoopsTunables.exceptionBacklogBadgeThreshold);

    return { cards, queuePressureBand: worst, backlogBadge: backlog };
  }

  /**
   * P3-A C4 (D6) — the player's `escalated` cards, band-projected, newest first, paginated (`limit`/
   * `offset` — the caller, `ExceptionsController.escalations`, clamps them). PLAIN `projectCard` only
   * (no `suggested_disposition`/`script_complexity_band` overlay — those are PENDING-card decision aids;
   * an escalated card is already-resolved history, so the ADD_RULE-capability / confidence-threshold
   * signals it would compute are moot).
   */
  async listEscalations(playerId: string, limit: number, offset: number): Promise<ExceptionEscalationsView> {
    const [rows, total] = await Promise.all([
      this.repo.listEscalated(playerId, limit, offset),
      this.repo.countEscalated(playerId),
    ]);
    // C3 (D7) — resolve every referenced lieutenant's name ONCE, before projecting any card.
    const names = await this.resolveLieutenantNames(playerId, rows);
    return { escalations: rows.map((r) => this.projection.projectCard(r, names)), total };
  }

  /**
   * C3 (D7, L0.5) — the shared `listQueue`/`listEscalations` name-resolution step: the DISTINCT non-null
   * `lieutenant_id`s across `rows`, resolved via `LieutenantRepository.namesByIds` (player-scoped), size-
   * checked against the requested id set. A shortfall means one of `rows`' `lieutenant_id`s belongs to
   * another player (or no player) — D7's own "un id étranger devient une absence détectable et refusée":
   * the WHOLE listing is refused (never a partial card silently missing its name).
   */
  private async resolveLieutenantNames(
    playerId: string,
    rows: readonly { lieutenant_id: string | null }[],
  ): Promise<ReadonlyMap<string, string>> {
    const ids = [...new Set(rows.map((r) => r.lieutenant_id).filter((id): id is string => id !== null))];
    const names = await this.lieutenantRepo.namesByIds(playerId, ids);
    if (names.size !== ids.length) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: 'An exception card references a lieutenant that is not this player\'s.',
      });
    }
    return names;
  }

  /** ADD_RULE-capable: a candidate OR the suggested action carries a non-null `add_rule_dsl` (the SAME
   *  addability test `AddRuleHandler` enforces at resolve time — a card with no addable action can never
   *  reach this true, so `script_complexity_band` never appears on a card ADD_RULE would 422 on anyway).
   *  `suggested_action` is `null` on a card with no real suggestion (D4, r1-C2/MAJOR-2) — never capable. */
  private isAddRuleCapable(card: ExceptionCardProjection): boolean {
    if (card.suggested_action?.add_rule_dsl != null) return true;
    return card.candidate_actions.some((a) => a.add_rule_dsl != null);
  }

  /** The lieutenant's compiled rule count (via the existing `LieutenantRepository.getProjectionRow` —
   *  REUSE, no new query shape) → `scriptComplexityBand`. A missing/malformed row defends to 0 rules
   *  (`ok`) — this is a WARNING surface, never a hard gate, so a defensive default never blocks anything. */
  private async scriptComplexityBandForLieutenant(
    playerId: string,
    lieutenantId: string,
    maxRules: number,
  ): Promise<ScriptComplexityBand> {
    const row = await this.lieutenantRepo.getProjectionRow(playerId, lieutenantId);
    const ruleCount = row && Array.isArray(row.rules?.rules) ? row.rules.rules.length : 0;
    return scriptComplexityBand(ruleCount, maxRules);
  }

  /**
   * Resolve ONE owned, PENDING card. Validates the method ∈ the registered effect types (else 422) BEFORE any DB read,
   * then the ownership (404) + pending (409) guards, resolves the chosen candidate (or undefined — the handler decides),
   * and dispatches to the handler. The handler performs the side-effects + markResolved; resolve returns its qualitative
   * outcome enum.
   */
  async resolve(playerId: string, exceptionId: string, method: ResolveMethod, chosenActionId: string): Promise<string> {
    const handler = this.registry.require(method); // unknown method → 422 (before any DB read).

    const row = await this.repo.getOwned(playerId, exceptionId);
    if (!row) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `no such exception ${exceptionId} for this player.` });
    }
    if (row.resolution_status !== 'pending') {
      throw new ApiError('RESOURCE_STATE_CONFLICT', { message: 'exception already resolved.' });
    }

    const candidates = (row.candidate_actions as CandidateActionView[]) ?? [];
    const chosenAction = candidates.find((c) => c.id === chosenActionId);

    const outcome = await handler.apply({ playerId, row, chosenActionId, chosenAction });

    // PHASE-17 — record the resolution for progression: count it (handled), and for an ADD_RULE teach record the taught
    // signal (distinct-count). The dual gate (K distinct taught AND N handled) may flip the player to Tier 2 here.
    const taughtSignal =
      method === 'ADD_RULE' && chosenAction?.add_rule_dsl ? extractTaughtSignal(chosenAction.add_rule_dsl) : null;
    await this.progression.onResolution(playerId, method, taughtSignal);

    // P3-A C2 (D2) — server-authoritative session counters: `exceptions_resolved` + `decisions_made`,
    // ONE atomic increment (SAME hook point as the Phase-17 progression call above). No active session
    // → no-op (D9 zero-regression — a sessionless resolve writes NO counter anywhere).
    await this.sessions.recordExceptionResolved(playerId);

    // P3-F C2 (additive, R6) — the mastery resolve-hook sibling call: a heat-pressure-sourced card feeds
    // HEAT_MANAGEMENT +1 (design §7.2). A structured no-op for every OTHER resolved card (no recognized
    // `candidate_actions[0].source` tag) — see `MasteryAccumulatorService.onExceptionResolved`'s own
    // header for the full contract. An aged-out card NEVER reaches this line (aged-out is a separate
    // `markAgedOut` set-based UPDATE that never calls `resolve()` — the "aged-out card produces NO delta"
    // falsifiable holds by construction, not by an extra guard here).
    await this.masteryAccumulator.onExceptionResolved(playerId, row.candidate_actions);

    // P3-G C7 (additive, R8) — the isostatic-debt resolve-hook sibling call: an ADD_RULE resolution
    // (structured no-op for every OTHER method) decays `structural_debt` for every LIVE capability sharing
    // that decay binding. See `IsostaticDebtService.onExceptionResolved`'s own header for the full
    // contract (including why THIS call fetches a real game tick rather than the `gameMinute: 0`
    // convention the sibling calls above use).
    await this.isostaticDebt.onExceptionResolved(playerId, method);

    // W1.1-a C6 (design D3/IM-2) — the funnel-state resolve-hook sibling call: TWO guarded UPDATEs
    // (FIRST_COMMIT then, on a later resolve, SECOND_DECISION — I6, no read-then-write). Account-scoped
    // discriminant (`first_decision_at IS NULL`), deliberately NOT `gameplay_session.exceptions_resolved`
    // (IM-2 — a sessionless `signup → resolve` would otherwise leave the funnel stuck at LAUNCH forever,
    // `session.service.ts:178-179`'s own "no active session → no-op"). A structured no-op past the
    // account's second-ever decision (neither guard matches).
    await this.onboardingFunnel.recordDecision(playerId);

    return outcome;
  }
}

/** Extract the DSL signal a generated ADD_RULE rule teaches (the controlled `WHEN (STATE|EVENT)(<signal>,…)` format). */
export function extractTaughtSignal(dsl: string): string | null {
  const m = /WHEN\s+(?:STATE|EVENT)\(\s*([A-Za-z_][A-Za-z0-9_]*)/.exec(dsl);
  return m ? m[1] : null;
}
