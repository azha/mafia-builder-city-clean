// IMPLEMENTS: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md §C7 (`ProblemAggregator`
//             — "Mapping tiers exact figé au plan C7 (formules par source, C0-reserve R3/R4 pour les
//             colonnes)" — the SAME "the coder fixes the concrete formula SUR PIÈCES, from the concrete
//             columns/buckets C0 already resolved" latitude `compression-stress-signal.ts`'s own header
//             documents for the C6 §8.1/§8.2 formula).
//             Design: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §10.1 (the
//             9-row source table — tiers minor|moderate|critical, "Severity ≥ 100 : tier initial +1
//             cran", "leur tier DÉGRADÉ" for persisted carryover) + §10.4 (downgrade tooth (i): tier+1
//             cran per unaddressed entry, `compression_problem_downgrade_per_unaddressed_tiers`).
//             Pattern: `compression-stress-signal.ts` (PURE, no-DB, no-DI reduction functions — reused
//             verbatim by BOTH the real aggregator AND the E2E spec, zero formula drift) + the EXISTING
//             `BackpressureBucket`/`SinuosityStressBucket`/`DebtBucket` pure bucket functions (P3-C,
//             REPLICATED-mapping not re-derived — this file maps each bucket's OWN discrete values to a
//             tier, it never re-derives the bucket cut-points themselves) + `exceptions.projection.
//             service.ts`'s OWN `PriorityBucket` cut-points (20/50/80, [PROV-Y26Q2], REPLICATED here per
//             this codebase's "REUSE the SAME literal cut-points, never a NEW getter, never a shared
//             export across modules" convention — `friction-threshold-exception-producer.service.ts`'s
//             own header cites the identical discipline for its hardcoded severity/priority literals).
//             — P3-E C7 — 2026-07-18
//
// `problem-tier.ts` — the ENTIRE §10.1 tier-mapping arithmetic as PURE functions (no DB, no Nest DI): one
// function per board source, each realized from the concrete bucket/column C0 already resolved (frozen
// at the plan). `bumpTierBy` is the ONE shared "+N tiers, clamp at critical" primitive BOTH the severity
// fire (§9.2c, +1 cran) and the finalize downgrade tooth (§10.4.1, +N cran per
// `compression_problem_downgrade_per_unaddressed_tiers`) share — zero duplicated crank logic.

/** The board's 3-value tier (design §10.1/§13.2 CHECK `tier IN ('minor','moderate','critical')`). */
export type ProblemTier = 'minor' | 'moderate' | 'critical';

const TIER_ORDER: readonly ProblemTier[] = ['minor', 'moderate', 'critical'];

/** `+N` tiers, clamped at `'critical'` (never wraps, never goes negative — `n` is always >= 0 at every
 *  call site: the severity fire's `compressionSeverityMultiplierAt100Stress` crank (default 1) and the
 *  finalize downgrade's `compressionProblemDowngradePerUnaddressedTiers` crank (default 1), both CAPS
 *  registry values >= 1). */
export function bumpTierBy(tier: ProblemTier, n: number): ProblemTier {
  const idx = Math.min(TIER_ORDER.length - 1, TIER_ORDER.indexOf(tier) + Math.max(0, n));
  return TIER_ORDER[idx]!;
}

/**
 * `ExceptionQueue cards` (design §10.1 row 1) — "mappé de la priorité/âge". `exception_queue.priority`
 * is ALREADY an age-adjusted composite (`queues_exceptions_cuestack.ts:53` — "int (severity × age REUSE
 * 05 §Spine)"), so mapping directly off `priority` honors BOTH halves of "priorité/âge" with zero 2nd
 * age computation. Cut-points REPLICATE `exceptions.projection.service.ts`'s OWN `PriorityBucket`
 * boundaries verbatim (silent<20, watching[20,50), urgent[50,80), critical>=80) — `critical`→'critical',
 * `urgent`→'moderate', `watching`/`silent`→'minor'.
 */
export function exceptionPriorityEntryTier(priority: number): ProblemTier {
  if (priority >= 80) return 'critical';
  if (priority >= 50) return 'moderate';
  return 'minor';
}

/**
 * `FlaggedItems pending` (design §10.1 row 2) — "minor→moderate selon âge". No canon/design number
 * given for the age cut; `flagged_items` carries no OTHER age-adjusted scalar to REUSE (unlike exception
 * priority above) — realized here as a literal 1-week (7 in-game-day) cut, the SAME cadence this lot's
 * OWN W/14 quiet-decay tick already anchors to (`flag-weekly-reset-tick.service.ts`'s sibling W/13 —
 * REUSING the established weekly rhythm rather than inventing a new numeric tunable, mirrors
 * `frictionPenaltyActiveSignal`'s own literal 0.85/0.15 band, `compression-stress-signal.ts`).
 */
const FLAG_MODERATE_AT_GAME_DAYS = 7;

export function flagAgeEntryTier(flagGameDay: number, currentGameDay: number): ProblemTier {
  return currentGameDay - flagGameDay >= FLAG_MODERATE_AT_GAME_DAYS ? 'moderate' : 'minor';
}

/**
 * `BackpressureCritical nodes` (design §10.1 row 3) — the aggregator's OWN source query already scopes
 * to `backpressure_index > criticalThreshold` (the SAME `BackpressureBucket.critical` cut C6's
 * `CompressionSignalRepository` uses); the row's "moderate/critical" tier SPAN is realized as a severity
 * split WITHIN that critical band — the top half (closer to the [criticalThreshold, 1] ceiling) is
 * 'critical', the bottom half 'moderate'. Mirrors `frictionPenaltyActiveSignal`'s own "ratio banded
 * within [threshold, 1]" idiom (`compression-stress-signal.ts`) — no new tunable, the SAME
 * `backpressureCriticalThreshold` getter the source query already resolved.
 */
export function backpressureEntryTier(index: number, criticalThreshold: number): 'moderate' | 'critical' {
  const midpoint = criticalThreshold + (1 - criticalThreshold) / 2;
  return index >= midpoint ? 'critical' : 'moderate';
}

/**
 * `Severed/critical routes` (design §10.1 row 4) — `SinuosityStressBucket` ALREADY carries 2 discrete
 * bad values (`'critical'` / `'severed'`) exactly matching the row's own "moderate/critical" span —
 * `severed` (route retired, D10) → 'critical'; `critical` (still routable, but over the stress cut) →
 * 'moderate'. Zero new split needed (unlike backpressure above, which has only ONE bad bucket).
 */
export function sinuosityBucketEntryTier(bucket: 'critical' | 'severed'): ProblemTier {
  return bucket === 'severed' ? 'critical' : 'moderate';
}

/**
 * `Stressed/fractured legs` (design §10.1 row 5) — `DebtBucket` ALREADY carries 2 discrete bad values
 * (`'stressed'` / `'fractured'`) exactly matching the row's own "moderate/critical" span — `fractured`
 * (at the debt cap) → 'critical'; `stressed` (over the stress threshold, below the cap) → 'moderate'.
 */
export function debtBucketEntryTier(bucket: 'stressed' | 'fractured'): ProblemTier {
  return bucket === 'fractured' ? 'critical' : 'moderate';
}

/**
 * `Settling-overload nodes` (design §10.1 row 7) — "minor/moderate", realized off
 * `annealing_state.changes_during_settling` (the SAME "compounding" counter C6's own
 * `annealingCompoundingStrainSignal` reads, decisions §8 row 9): exactly 1 compounding change → 'minor'
 * (the FIRST overlap, the canon-named trigger for the compounding penalty itself); >= 2 → 'moderate'
 * (repeated compounding — a worse organizational signal than a single overlap).
 */
export function settlingOverloadEntryTier(changesDuringSettling: number): ProblemTier {
  return changesDuringSettling >= 2 ? 'moderate' : 'minor';
}

/**
 * `Failed cue stack slots` (design §10.1 row 6, the slot-failure half) — a single failed slot alone is
 * always 'minor' (the row's own "minor/moderate" span puts the WORSE half on the escalated cascade CARD
 * — `cueCascadeEntryTier` below — not on the raw slot failure itself).
 */
export function cueStackFailedSlotEntryTier(): ProblemTier {
  return 'minor';
}

/**
 * `... + cascades PENDING` (design §10.1 row 6, the cascade-card half) — a `CUE_CASCADE`-tagged spine
 * card is the ESCALATED consequence of a failed slot (raised by `CueCascadeExceptionProducer` only once
 * the raw slot failure already fired) — always 'moderate', the worse half of the row's "minor/moderate"
 * span.
 */
export function cueCascadeEntryTier(): ProblemTier {
  return 'moderate';
}

/**
 * `Friction-penalty active` (design §10.1 row 8) — "moderate (1 entrée globale)", a fixed literal tier
 * (no severity split — the penalty is a single boolean-active aggregate state, §5.1).
 */
export function frictionPenaltyEntryTier(): ProblemTier {
  return 'moderate';
}
