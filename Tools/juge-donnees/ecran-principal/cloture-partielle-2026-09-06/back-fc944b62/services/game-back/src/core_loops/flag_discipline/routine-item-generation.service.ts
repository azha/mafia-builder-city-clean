// IMPLEMENTS: docs/superpowers/plans/2026-07-11-p3-B-flag-discipline-plan.md §C3 (generation
//             entry-point — idempotent, DB-enforced dedup, exposed via test seam `run-generation`
//             driving the REAL registry, NOT the tick — that is C4's) + §C4 (D9 exhaustion fallback —
//             a NO-TOKEN candidate that ALSO clears the urgency threshold is surfaced to the tick as an
//             `ExhaustionFallbackCandidate`, additive to the C3 return shape — never a duplicated
//             enumerate/cap/flag loop, C4 REUSES this exact method).
//             Design: docs/superpowers/specs/2026-07-11-p3-B-flag-discipline-design.md §5 (routine
//             generation) + §1 D4/D5/D6/D9.
//             — P3-B C3 — 2026-07-11 / C4 (D9 exhaustion-candidate surfacing + gameMinute threading) —
//             2026-07-11
//
// `RoutineItemGenerationService` — the generation entry-point (D4): for each of the 5 registered
// generators, enumerate → stable top-K cap (getter-backed) → persist (UNIQUE + ON CONFLICT DO NOTHING,
// DB-enforced dedup — D3) → for every FRESHLY-INSERTED candidate with a resolved `lieutenant_id`, derive
// the Phase-11 tenure bucket from the holder's OWN `tenure_score` and compare `deviationScore` against
// `flag_deviation_threshold_base × conservatismForBucket(bucket)` (D5); a candidate clearing the
// threshold is flagged via the REAL `FlagDisciplineService.flagItem` path (atomic token economy — C2,
// unchanged). A candidate with NO resolved `lieutenant_id` (D6 honest gap — role_id 2/9 today) is
// PERSISTED but never considered for flagging — no token movement, no `flagItem` call at all.
//
// C4 (D9) — a candidate that CLEARS the flag threshold but loses `flagItem` to `reason: 'no_token'` is
// re-checked against `flag_exhaustion_exception_urgency_threshold`: at/above it, the candidate is pushed
// onto that generator's `exhaustionCandidates` (an ADDITIVE field on `GeneratorRunResult` — existing
// `candidateCount`/`insertedCount`/`flaggedCount` consumers, including the C3 `run-generation` test route
// + `flag_generators.spec.ts`, are byte-unaffected); below it, the concern is dropped silently (canon:
// "only genuinely-urgent concerns fall through", design §5). The actual Exception-spine INSERT is NOT
// this service's job (D3 wall — `src/exceptions/` stays additive-only, zero producer edits HERE) — the
// CALLER (`FlagDisciplineTickService`, C4) turns qualifying candidates into real cards via the dedicated
// `FlagExhaustionFallbackService`.
//
// Idempotency (D3, the falsifiable floor): this method NEVER pre-checks "did I already generate today?"
// — it always runs the FULL enumerate→cap→insert pipeline. A same-day re-run naturally produces ZERO new
// `routine_items` rows (the UNIQUE constraint absorbs every duplicate) and therefore ZERO new
// `flagItem` calls (flagging only ever considers freshly-inserted rows) — the dedup guarantee lives at
// the DB constraint, not in this orchestration.

import { Injectable } from '@nestjs/common';

import { RoutineItemGeneratorRegistry, selectStableTopK, type I18nRef } from './generators/routine-item-generator';
import { FlagDisciplineRepository } from './flag-discipline.repository';
import { FlagDisciplineService } from './flag-discipline.service';
import { flagDisciplineTunables } from './flag-discipline-tunables';
import { bucketForStreak, type TenureInertiaBucketComposite } from '../../operational/lieutenant/tenure-inertia';
import { lieutenantTunables } from '../../operational/lieutenant/lieutenant-tunables';
import type { RoutineGeneratorEnumTs } from '../../db/schema/flag_discipline';

/** C4 (D9) — a candidate that cleared the flag threshold, lost `flagItem` to `no_token`, AND cleared the
 *  exhaustion urgency threshold: everything `FlagExhaustionFallbackService` needs to raise (or dedupe)
 *  the real spine card, without re-deriving anything already computed here. */
export interface ExhaustionFallbackCandidate {
  readonly lieutenantId: string;
  readonly routineItemId: string;
  readonly generator: RoutineGeneratorEnumTs;
  readonly descriptor: I18nRef;
  readonly flagReason: I18nRef;
  readonly deviationScore: number;
}

/** One generator's run outcome — the falsifiable proof surface (plan §C3): candidate/inserted/flagged
 *  counts, each independently assertable (e.g. "candidateCount=12, insertedCount=cap(10)"). C4 ADDS
 *  `exhaustionCandidates` (readonly array, defaults to an empty array on every existing call site's own
 *  read — additive, byte-unaffected for consumers that only ever read the 3 original scalar counts). */
export interface GeneratorRunResult {
  readonly candidateCount: number;
  readonly insertedCount: number;
  readonly flaggedCount: number;
  readonly exhaustionCandidates: readonly ExhaustionFallbackCandidate[];
}

export type RunGenerationResult = Record<string, GeneratorRunResult>;

@Injectable()
export class RoutineItemGenerationService {
  constructor(
    private readonly registry: RoutineItemGeneratorRegistry,
    private readonly repo: FlagDisciplineRepository,
    private readonly flagDiscipline: FlagDisciplineService,
  ) {}

  /**
   * `runGeneration(playerId, gameDay, gameMinute?)` — the test seam this chunk exposes (`run-generation`,
   * DD-P4); the C4 NIGHTLY tick becomes the 2nd caller (same method, its own
   * `deriveGameDay(ctx.gameMinute, …)` for `gameDay` AND its own `ctx.gameMinute` for the 3rd param —
   * additive optional, default 0 preserves the EXISTING 2-arg `run-generation` test-route call
   * byte-identical). Runs the 5 registered generators in registration order (deterministic — D13); each
   * generator's own candidates are capped/persisted/flagged independently (one generator's cap never
   * starves another's).
   */
  async runGeneration(playerId: string, gameDay: number, gameMinute = 0): Promise<RunGenerationResult> {
    const result: RunGenerationResult = {};
    const cap = flagDisciplineTunables.flagRoutineItemsPerGeneratorDailyCap;
    const thresholdBase = flagDisciplineTunables.flagDeviationThresholdBase;
    const urgencyThreshold = flagDisciplineTunables.flagExhaustionExceptionUrgencyThreshold;

    for (const generator of this.registry.all()) {
      const candidates = await generator.enumerate(playerId, gameDay);
      const capped = selectStableTopK(candidates, cap);

      let insertedCount = 0;
      let flaggedCount = 0;
      const exhaustionCandidates: ExhaustionFallbackCandidate[] = [];
      for (const candidate of capped) {
        const inserted = await this.repo.insertRoutineItemIfAbsent({
          playerId,
          gameDay,
          generator: generator.generator as RoutineGeneratorEnumTs,
          dedupKey: candidate.dedupKey,
          descriptor: candidate.descriptor,
          responsibleRoleId: candidate.responsibleRoleId,
          lieutenantId: candidate.lieutenantId,
          deviationScoreInternal: candidate.deviationScore,
        });
        if (!inserted) continue; // DB-enforced dedup absorbed a duplicate (D3) — never re-considered.
        insertedCount++;

        // D6 honest gap: no role-holder resolved → no flag path at all (never even a threshold check).
        if (candidate.lieutenantId === null || candidate.tenureScore === null) continue;

        const bucket: TenureInertiaBucketComposite = bucketForStreak(
          candidate.tenureScore,
          lieutenantTunables.tenureInertia.thresholds,
        );
        const threshold = thresholdBase * flagDisciplineTunables.conservatismForBucket(bucket);
        if (candidate.deviationScore < threshold) continue;

        const flagResult = await this.flagDiscipline.flagItem(inserted.routine_item_id, gameMinute, candidate.flagReason);
        if (flagResult.flagged) {
          flaggedCount++;
        } else if (flagResult.reason === 'no_token' && candidate.deviationScore >= urgencyThreshold) {
          // D9 — genuinely urgent (score cleared BOTH the flag threshold above AND the urgency floor)
          // but no token to spend: surfaced to the caller, never inserted here (D3 wall — `src/
          // exceptions/` stays additive-only; `candidate.lieutenantId` is non-null, guarded above).
          exhaustionCandidates.push({
            lieutenantId: candidate.lieutenantId,
            routineItemId: inserted.routine_item_id,
            generator: generator.generator as RoutineGeneratorEnumTs,
            descriptor: candidate.descriptor,
            flagReason: candidate.flagReason,
            deviationScore: candidate.deviationScore,
          });
        }
        // else: `not_found`/`already_flagged` (structurally impossible for a routine_item_id just
        // freshly inserted THIS call) or `no_token` below the urgency floor — dropped silently, D9/§5.
      }

      result[generator.generator] = { candidateCount: candidates.length, insertedCount, flaggedCount, exhaustionCandidates };
    }

    return result;
  }
}
