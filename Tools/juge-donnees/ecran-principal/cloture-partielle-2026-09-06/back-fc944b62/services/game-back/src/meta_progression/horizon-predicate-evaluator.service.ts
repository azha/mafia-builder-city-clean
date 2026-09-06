// IMPLEMENTS: docs/superpowers/plans/2026-07-19-p3-G-budgets-horizon-plan.md C2
//             ("HorizonPredicateEvaluatorService.evaluateForPlayer as a PURE evaluation surface (returns
//             per-capability per-clause verdicts; no card writes this chunk — the P3-F C4 pure-pipeline
//             shape)").
//             Design: docs/superpowers/specs/2026-07-19-p3-G-budgets-horizon-design.md §7.3 ("For each
//             LIVE catalogue capability... evaluate; if ALL clauses true AND feed has a free slot: INSERT
//             card... For each EXISTING non-terminal card: re-evaluate; set/clear predicate_regressed" —
//             C2 scope is the EVALUATE half only; the surfacing/regression-marking half is C3's, D5).
//             Pattern (pure pipeline, NO writes this chunk, a test-only compile/evaluate surface):
//             `graduation-seed-mapper.ts` (P3-F C4 — "pure pipeline + a test-only compile surface").
//             Pattern (iterate the LIVE catalogue rows in catalogue order, one result per row,
//             deterministic): `meta-progression.projection.service.ts#taskCategoryProjection`.
//             — P3-G C2 — 2026-07-20
//
// `HorizonPredicateEvaluatorService.evaluateForPlayer` — the C2 PURE evaluation surface: for every LIVE
// `CAPABILITY_CATALOGUE` entry, evaluates every predicate clause (AND-strict, §7.2) and returns the
// per-clause verdicts + the aggregate `allSatisfied`. NO card read, NO card write, NO capacity check —
// C3's `HorizonFeedService` consumes this result to do the INSERT-if-absent surfacing + the
// `predicate_regressed` overlay (design D6/§7.3). Deterministic + idempotent: two calls over unchanged
// player state return byte-identical verdicts (pure reads, no RNG, no write, no clock read).

import { Inject, Injectable } from '@nestjs/common';

import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { ProgressionRepository } from '../progression/progression.repository';
import { LieutenantRepository } from '../operational/lieutenant/lieutenant.repository';
import { MasteryScoreRepository } from './mastery-score.repository';
import { CAPABILITY_CATALOGUE, type CapabilityCatalogueEntry, type CapabilityKey } from './capability-catalogue';
import { evaluatePredicateClause, getPredicateActualValue, type PredicateEvalContext, type PredicateType } from './predicate-evaluators';

/** One clause's verdict — the type/threshold echoed alongside the boolean so a consumer (C3's surfaced-
 *  card `surfaced_predicate_snapshot`, design §7.3) never has to re-zip against the catalogue. */
export interface PredicateClauseVerdict {
  readonly type: PredicateType;
  readonly threshold: number;
  readonly satisfied: boolean;
}

/** One LIVE capability's full evaluation — every clause's verdict + the AND-strict aggregate. */
export interface CapabilityEvaluationResult {
  readonly capabilityCode: number;
  readonly capabilityKey: CapabilityKey;
  readonly clauses: readonly PredicateClauseVerdict[];
  readonly allSatisfied: boolean;
}

/** P3-G C9 — a clause verdict PLUS the raw `actual` value it was compared against (never player-facing —
 *  §13's ALLOWED_KEYS wall forbids every raw predicate number; this is the `visible_predicates`
 *  freshness-ranking input, `predicate-evaluators.ts#predicateFreshnessMargin` consumes it). */
export interface PredicateClauseWithActual extends PredicateClauseVerdict {
  readonly actual: number;
}

@Injectable()
export class HorizonPredicateEvaluatorService {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly progressionRepo: ProgressionRepository,
    private readonly masteryScoreRepo: MasteryScoreRepository,
    private readonly lieutenantRepo: LieutenantRepository,
  ) {}

  /**
   * Evaluate EVERY LIVE `CAPABILITY_CATALOGUE` entry for `playerId`, catalogue order (deterministic —
   * mirrors `MetaProgressionProjectionService.taskCategoryProjection`'s own "4 LIVE rows in catalogue
   * order" idiom). A fresh player (no progression/mastery/session/lieutenant rows at all) evaluates
   * every clause conservatively false — never a throw (every read below defaults a missing row to its
   * honest zero-state, see `predicate-evaluators.ts`'s own header).
   */
  async evaluateForPlayer(playerId: string): Promise<CapabilityEvaluationResult[]> {
    const ctx: PredicateEvalContext = {
      playerId,
      db: this.db,
      progressionRepo: this.progressionRepo,
      masteryScoreRepo: this.masteryScoreRepo,
      lieutenantRepo: this.lieutenantRepo,
    };
    const liveEntries = CAPABILITY_CATALOGUE.filter((e) => e.live);
    return Promise.all(liveEntries.map((entry) => this.evaluateEntry(ctx, entry)));
  }

  private async evaluateEntry(
    ctx: PredicateEvalContext,
    entry: CapabilityCatalogueEntry,
  ): Promise<CapabilityEvaluationResult> {
    const clauses = await Promise.all(
      entry.predicates.map(
        async (clause): Promise<PredicateClauseVerdict> => ({
          type: clause.type,
          threshold: clause.threshold,
          satisfied: await evaluatePredicateClause(ctx, clause),
        }),
      ),
    );
    return {
      capabilityCode: entry.code,
      capabilityKey: entry.key,
      clauses,
      allSatisfied: clauses.every((c) => c.satisfied), // AND-strict conjunction (§7.2).
    };
  }

  /**
   * P3-G C9 — every clause verdict for ONE ALREADY-SURFACED capability, PLUS the raw `actual` value
   * (`predicate-evaluators.ts#getPredicateActualValue`) `HorizonFeedService`'s `visible_predicates`
   * freshness ranking needs (design §8.1/§13). A FRESH re-evaluation — NEVER the frozen `surfaced_
   * predicate_snapshot` column (`possibility-horizon-cards.repository.ts` only ever WRITES that column
   * at INSERT time, all-true by construction, see that file's own header — it goes stale the instant a
   * card regresses) — the SAME "derive don't store" posture `getProjection`/`getDebtProjection` already
   * establish elsewhere in this lot. `satisfied` is read via the SAME authoritative `evaluatePredicateClause`
   * dispatch `evaluateForPlayer` above uses (zero second comparison-semantics implementation); `actual`
   * is the ADDITIONAL raw-value read `getPredicateActualValue` provides. Never called for a NOT-yet-
   * surfaced capability (no caller in this lot does — `HorizonFeedService.getFeed` only iterates a
   * player's OWN existing card rows).
   */
  async evaluateCapabilityWithActuals(playerId: string, entry: CapabilityCatalogueEntry): Promise<PredicateClauseWithActual[]> {
    const ctx: PredicateEvalContext = {
      playerId,
      db: this.db,
      progressionRepo: this.progressionRepo,
      masteryScoreRepo: this.masteryScoreRepo,
      lieutenantRepo: this.lieutenantRepo,
    };
    return Promise.all(
      entry.predicates.map(async (clause): Promise<PredicateClauseWithActual> => {
        const [satisfied, actual] = await Promise.all([evaluatePredicateClause(ctx, clause), getPredicateActualValue(ctx, clause)]);
        return { type: clause.type, threshold: clause.threshold, satisfied, actual };
      }),
    );
  }
}
