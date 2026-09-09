// IMPLEMENTS: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md §C8 ("le C2-deferred
//             output_to_friction_ratio_bucket").
//             Design: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §4.3/§6.1
//             ("Per-node : OutputValueBucket, FrictionLoadBucket, OutputToFrictionRatioBucket,
//             DecommissionCostBucket — qualitatifs STRICTS").
//             Pattern: `friction-budget-bucket.ts`'s own SCOPE NOTE (a CODER-REALIZED bucket over 2
//             ALREADY-qualitative inputs, no canon numeric range given — the SAME honesty convention).
//             — P3-E C8 — 2026-07-18
//
// `outputToFrictionRatioBucket` — the LAST of the 4 §6.1 panel buckets (`output_value_bucket` REUSES
// `capacityBucketForType`, `friction_load_bucket` REUSES `frictionLoadBucket`, C2/C5 — BOTH already
// qualitative). Canon names this bucket type but gives it NO numeric formula at all (unlike the aggregate
// friction bucket's own "0.5/0.85/1.0" cutpoints) — a genuinely CODER-REALIZED derivation, so this file
// does NOT invent a NEW scalar ratio (that would smuggle a raw float through a bucket-shaped door,
// exactly the fig-leaf `replacement-option-scorer.ts`'s own header already rejects for the analogous
// output-side gap). Instead it collapses the 2 EXISTING qualitative bands to a common 0..3 ordinal scale
// and takes their DIFFERENCE — a "how much output for how much friction" READING that is honest about
// its own bucket-of-buckets nature (zero new tunable, zero fabricated precision).

import type { CapacityBucket } from './replacement-option-scorer';
import type { FrictionLoadBucket } from './friction-budget-bucket';

export type OutputToFrictionRatioBucket = 'poor' | 'fair' | 'good' | 'excellent';

/** `CapacityBucket` collapsed onto the SAME 0..3 ordinal scale `FrictionLoadBucket` already uses (5
 *  values → 4 levels — `very_low`/`low` share level 0, since neither `M1_TYPES` member sits at the
 *  bottom rung of BOTH scales symmetrically; this is a coder-realized collapse, documented, not a canon
 *  value). */
const OUTPUT_ORDINAL: Record<CapacityBucket, number> = {
  very_low: 0,
  low: 0,
  medium: 1,
  high: 2,
  very_high: 3,
};

const FRICTION_LOAD_ORDINAL: Record<FrictionLoadBucket, number> = {
  light: 0,
  balanced: 1,
  strained: 2,
  overloaded: 3,
};

/**
 * `score = outputOrdinal(0..3) - frictionOrdinal(0..3)` (range -3..3): a node with HIGH output and LOW
 * friction load reads `excellent`; LOW output carrying HIGH friction reads `poor`. 4 bands over the 7
 * possible score values (N-1 rule, 2 cutpoints).
 */
export function outputToFrictionRatioBucket(output: CapacityBucket, frictionLoad: FrictionLoadBucket): OutputToFrictionRatioBucket {
  const score = OUTPUT_ORDINAL[output] - FRICTION_LOAD_ORDINAL[frictionLoad];
  if (score <= -2) return 'poor';
  if (score <= 0) return 'fair';
  if (score === 1) return 'good';
  return 'excellent';
}
