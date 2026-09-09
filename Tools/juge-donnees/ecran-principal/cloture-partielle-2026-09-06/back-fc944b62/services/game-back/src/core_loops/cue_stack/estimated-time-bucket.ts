// IMPLEMENTS: docs/superpowers/plans/2026-07-13-p3-D-cue-annealing-plan.md §C8 ("EstimatedTimeBucket ...
//             slot 15 min vs 25 min dérivées → buckets d'estimation distincts mais JAMAIS la minute").
//             Design: docs/superpowers/specs/2026-07-13-p3-D-cue-annealing-design.md §15.1 ("payloads
//             joueur : slots avec ... EstimatedTimeBucket (short|medium|long dérivé)") + §16 (R2.2/P5 wall
//             — `estimated_execution_time_minutes` is a FORBIDDEN key in any player payload).
//             Canon: docs/tech/08_ui_screens/screen_8_cue_stack.md §Glossary ("`EstimatedTimeBucket` —
//             enum NEW-in-chunk: `VERY_QUICK | QUICK | MODERATE | LONG | VERY_LONG`. Bucket qualitatif du
//             temps d'exécution estimé d'un slot ... GDD L709 « 30 in-game min » → bucket QUICK.") —
//             ratified verbatim in `gdd/15_glossary.md` (the ch15 NORMALIZE chunk already fixed these 5
//             exact UPPERCASE member spellings; this file MUST match them, not `SettlingBandBucket`'s own
//             lowercase `short|medium|long` sibling — canon ratifies casing PER bucket, not uniformly).
//             — P3-D C8 — 2026-07-15
//
// `deriveEstimatedTimeBucket` — the PURE (no DB, no RNG) bucket derivation for a slot's per-type BASE
// duration (`slot-duration.ts#durationMinutesFor`, the SAME lookup C3's tick uses — never a re-derived or
// re-guessed number). Mirrors `settling-band-bucket.ts#deriveSettlingBandBucket`'s own "pure function,
// hardcoded structural cutpoints" shape — but UNLIKE that sibling, this bucket's cutpoints are NOT
// tunable-backed: design §14's own registered `core_loops.*` catalogue (C1, closed at exactly 16 keys)
// carries THREE registered boundary getters for `SettlingBandBucket` (`annealing_band_short/medium/
// long_upper_minutes`) but ZERO for `EstimatedTimeBucket` — read as DELIBERATE (mirrors the design's OWN
// "`cue_stack_dependency_strictness_bits` EN DUR" / "`annealing.display_granularity` EN DUR" precedent:
// some qualitative mappings are registered tunables, others are fixed structural code, and design §14
// never reserved a slot for this one) rather than a missing tunable to add now (adding NEW `core_loops.*`
// keys here would violate C1's own closed count, decisions §0/§14).
//
// ★ SURFACED JUDGMENT CALL (non-blocking): canon gives exactly ONE numeric anchor for the 5-member domain
// (`screen_8_cue_stack.md`'s own worked example, "GDD L709 « 30 in-game min » → bucket QUICK" — a generic
// UI-mockup illustration authored BEFORE this lot's own C1 per-type minute defaults existed, not a binding
// per-slot-type contract) — no full cutpoint table exists anywhere. The 4 cutpoints below are chosen to (a)
// keep that ONE anchor true (30 minutes lands `QUICK`), and (b) guarantee the plan's OWN falsifiable
// ("slot 15 min vs 25 min dérivées → buckets d'estimation distincts") holds with margin: the tightest gap
// between any 2 of the 4 LIVE per-type defaults (`slot-duration.ts`, 10/15/20/25) is 5 minutes
// (DISTRIBUTION_RUN=15 vs MAINTENANCE_BATCH=20), and the first cutpoint (20) sits exactly on that boundary
// — 15 buckets `VERY_QUICK`, 20/25/30 all bucket `QUICK` (a WIDER band deliberately, since 3 of the 4 live
// defaults + the canon anchor all cluster there). LONG/VERY_LONG are reachable only via a tunable override
// pushing a per-type duration toward the shared CAPS ceiling (60 minutes, `core-loops-tunables.ts`) — never
// hit by any v1 default. Flagged for reviewer/C9 reconciliation, none-silent.
export type EstimatedTimeBucket = 'VERY_QUICK' | 'QUICK' | 'MODERATE' | 'LONG' | 'VERY_LONG';

const VERY_QUICK_UPPER_MINUTES = 20;
const QUICK_UPPER_MINUTES = 35;
const MODERATE_UPPER_MINUTES = 45;
const LONG_UPPER_MINUTES = 55;

/**
 * Map a raw per-type BASE duration (real game-minutes — NEVER surfaced beyond this function's own caller,
 * R2.2/P5 strict) to its qualitative `EstimatedTimeBucket`. Cutpoints are LOCAL structural constants (see
 * file header — deliberately NOT getter-parameterized, unlike `deriveSettlingBandBucket`'s own
 * getter-resolved-by-the-caller shape): design §14 never registers a tunable for this bucket's boundaries.
 */
export function deriveEstimatedTimeBucket(minutes: number): EstimatedTimeBucket {
  if (minutes < VERY_QUICK_UPPER_MINUTES) return 'VERY_QUICK';
  if (minutes < QUICK_UPPER_MINUTES) return 'QUICK';
  if (minutes < MODERATE_UPPER_MINUTES) return 'MODERATE';
  if (minutes < LONG_UPPER_MINUTES) return 'LONG';
  return 'VERY_LONG';
}
