// IMPLEMENTS: docs/superpowers/plans/2026-07-11-p3-B-flag-discipline-plan.md §C5 ("evaluateConvergence:
//             window query over `flagged_items` → `ConvergenceBucket` per design §7 formula INCLUDING
//             low-tenure leniency — pure function direct-importable, getter-backed weights" +
//             "`FlagFrequencyBand` (last-7-game-days) — band mapper, R2.2-safe")
//             Design: docs/superpowers/specs/2026-07-11-p3-B-flag-discipline-design.md §7 (Convergence +
//             bands) + §1 D12 (R2.2 walls, low-tenure leniency) + §14 Glossary (canon term
//             `evaluateConvergence(lieutenantId): ConvergenceBucket`).
//             Pure formulas: `convergence.ts` (decorator-free — direct-importable by
//             `flag_weekly_convergence.spec.ts`, mirrors `generators/deviation-scores.ts`'s own split).
//             — P3-B C5 — 2026-07-11
//
// `FlagConvergenceService` — the IMPURE half of design §7: resolves the window query counts
// (`FlagDisciplineRepository`) + the flagging lieutenant's Phase-11 tenure bucket (`bucketForStreak`
// REUSE — the SAME seam `RoutineItemGenerationService` already reads for the C3 flag-decision threshold),
// then hands them to the PURE `evaluateConvergence`/`frequencyBand` functions (`convergence.ts`) for the
// actual formula. Exposed to E2E via the `evaluate-convergence`/`flag-frequency-band` test seams
// (`CoreLoopsTestController`) — this chunk's ONLY caller; C6/C7 (lieutenant projection band + BO stats)
// become the 2nd/3rd callers later, same methods (Lesson #3 — zero live-vs-test divergence).
//
// P3-B C6 ADDS `trustBudgetBucketForLieutenant` (design §7/§8 D12) — the SAME "resolve counts then hand to
// the pure formula" shape, now for the token-budget band both the flag-review card and the lieutenant
// projection consume. Re-provided DIRECTLY into `LieutenantModule`'s own `providers:` array (the
// `ExceptionsRepository` P3-A C7 precedent — `FlagConvergenceService`'s dependency shape stays trivially
// cycle-safe, `FlagDisciplineRepository` only). — P3-B C6 — 2026-07-11

import { Injectable } from '@nestjs/common';

import { FlagDisciplineRepository } from './flag-discipline.repository';
import { flagDisciplineTunables } from './flag-discipline-tunables';
import {
  evaluateConvergence,
  frequencyBand,
  trustBudgetBucket,
  type ConvergenceBucket,
  type FlagFrequencyBand,
  type TrustBudgetBucket,
} from './convergence';
import { bucketForStreak, type TenureInertiaBucketComposite } from '../../operational/lieutenant/tenure-inertia';
import { lieutenantTunables } from '../../operational/lieutenant/lieutenant-tunables';

/** The 2 low-tenure buckets the leniency multiplier applies to (design §7 — FRESH/ACCLIMATED ONLY, never
 *  SEASONED/SENIOR/ENTRENCHED). */
const LOW_TENURE_BUCKETS: ReadonlySet<TenureInertiaBucketComposite> = new Set(['FRESH', 'ACCLIMATED']);

/** `evaluateConvergenceForLieutenant`'s response — the bucket PLUS the raw counts that produced it (BO-
 *  only shape; this service is never called from a player-facing surface, R2.2/D12). */
export interface ConvergenceEvaluationResult {
  readonly bucket: ConvergenceBucket;
  readonly sample: number;
  readonly dismissedCount: number;
  readonly isLowTenure: boolean;
}

/** `frequencyBandForLieutenant`'s response — the band PLUS the raw count. */
export interface FrequencyBandResult {
  readonly band: FlagFrequencyBand;
  readonly count: number;
}

/** `trustBudgetBucketForLieutenant`'s response — the band PLUS the raw tokens/max (BO-only shape; the
 *  caller — `FlagDisciplineService.listReviewCards` / `LieutenantProjectionService.lieutenantBands` —
 *  forwards ONLY `.bucket` to the client, R2.2). */
export interface TrustBudgetResult {
  readonly bucket: TrustBudgetBucket;
  readonly tokens: number;
  readonly maxTokens: number;
}

@Injectable()
export class FlagConvergenceService {
  constructor(private readonly repo: FlagDisciplineRepository) {}

  /**
   * `evaluateConvergenceForLieutenant(lieutenantId, currentGameDay)` (design §7, canon
   * `evaluateConvergenceLieutenantId): ConvergenceBucket`) — resolves the resolved-flag sample over
   * `flag_convergence_evaluation_window_days` (getter, default 30) ending at `currentGameDay`, the
   * lieutenant's OWN tenure bucket (READ-ONLY `lieutenant.tenure_score` → `bucketForStreak`, D2/D5 REUSE),
   * then scores the PURE `evaluateConvergence` ladder. `still_calibrating` whenever the sample is below
   * `flag_convergence_min_sample` (getter, default 5) — regardless of tenure.
   */
  async evaluateConvergenceForLieutenant(lieutenantId: string, currentGameDay: number): Promise<ConvergenceEvaluationResult> {
    const windowDays = flagDisciplineTunables.flagConvergenceEvaluationWindowDays;
    const sinceGameDay = currentGameDay - windowDays;
    const { sample, dismissedCount } = await this.repo.getConvergenceSampleForLieutenant(lieutenantId, sinceGameDay);

    const tenureScore = await this.repo.getLieutenantTenureScore(lieutenantId);
    const bucket = bucketForStreak(tenureScore ?? 0, lieutenantTunables.tenureInertia.thresholds);
    const isLowTenure = LOW_TENURE_BUCKETS.has(bucket);

    const result = evaluateConvergence(
      { sample, dismissedCount, isLowTenure },
      {
        minSample: flagDisciplineTunables.flagConvergenceMinSample,
        overThreshold: flagDisciplineTunables.flagConvergenceOverThreshold,
        convergedThreshold: flagDisciplineTunables.flagConvergenceConvergedThreshold,
        lowTenureMultiplier: flagDisciplineTunables.flagLowTenureOverflagToleranceMultiplier,
      },
    );

    return { bucket: result, sample, dismissedCount, isLowTenure };
  }

  /**
   * `frequencyBandForLieutenant(lieutenantId, currentGameDay)` (design §7) — counts flags RAISED (any
   * resolution) over the canon "last 7 game-days" window ending at `currentGameDay` (a DIFFERENT, fixed
   * window from the convergence evaluation window above — never the tunable), then bands via the PURE
   * `frequencyBand` function.
   */
  async frequencyBandForLieutenant(lieutenantId: string, currentGameDay: number): Promise<FrequencyBandResult> {
    const sinceGameDay = currentGameDay - 7;
    const count = await this.repo.countFlagsRaisedSinceGameDay(lieutenantId, sinceGameDay);
    const band = frequencyBand(count, flagDisciplineTunables.flagFrequencyBandFrequentMin);
    return { band, count };
  }

  /**
   * `trustBudgetBucketForLieutenant(lieutenantId)` (P3-B C6, design §7/§8, D12) — reads the lieutenant's
   * OWN `credibility_tokens` (READ-ONLY peek, `FlagDisciplineRepository#getTokensForLieutenant` — NEVER
   * lazy-creates a state row), resolves against the max-tokens getter, then bands via the PURE
   * `trustBudgetBucket` ladder. A never-touched lieutenant (no `lieutenant_flag_state` row — never
   * flagged, never generated against) resolves as a FULL/untouched budget (`maxTokens`, never a phantom
   * 0) — the SAME "never lazy-seed" discipline the repository's own read establishes. Consumed by BOTH
   * `FlagDisciplineService.listReviewCards` (the flag-review card's own field) and
   * `LieutenantProjectionService.lieutenantBands` (the projection's +trust_budget_bucket band) — the
   * SAME re-provided instance either way (P3-A C7 precedent), never a duplicated formula.
   */
  async trustBudgetBucketForLieutenant(lieutenantId: string): Promise<TrustBudgetResult> {
    const maxTokens = flagDisciplineTunables.flagCredibilityTokensMaxPerLieutenant;
    const tokens = (await this.repo.getTokensForLieutenant(lieutenantId)) ?? maxTokens;
    const bucket = trustBudgetBucket(tokens, maxTokens, {
      lowRatio: flagDisciplineTunables.flagTrustBudgetLowRatio,
      highRatio: flagDisciplineTunables.flagTrustBudgetHighRatio,
    });
    return { bucket, tokens, maxTokens };
  }
}
