// IMPLEMENTS: docs/superpowers/plans/2026-07-13-p3-D-cue-annealing-plan.md §C6 ("bandes `SettlingBandBucket`
//             dérivées").
//             Design: docs/superpowers/specs/2026-07-13-p3-D-cue-annealing-design.md §9.5 ("SettlingBandBucket
//             = short|medium|long dérivé du restant vs bornes canon (10/30/120 min, tunables §14)").
//             Canon: docs/tech/05_player_core_loops/annealing_window.md §"Settling band determination"
//             (the band's OWN literal 2-cutpoint definition, verbatim: "short: remaining < 10 minutes.
//             medium: 10-30 minutes. long: > 30 minutes.").
//             — P3-D C6 — 2026-07-14
//
// `deriveSettlingBandBucket` — the PURE (no DB, no RNG) canon bucket derivation, getter-backed boundaries
// (mirrors `core_loops/supply_chain/backpressure-bucket.ts`'s own "thresholds are ALWAYS getter-resolved by
// the CALLER, never inlined here" shape, R2.3).
//
// ★ SURFACED JUDGMENT CALL (non-blocking, C1's own tunables table vs the canon prose): design §14 registers
// THREE band tunables (`annealing_band_short_upper_minutes`=10, `..._medium_upper_minutes`=30,
// `..._long_upper_minutes`=120) — but the canon's OWN band-determination prose (`annealing_window.md`
// above) defines the 3-member `short|medium|long` domain with only TWO cutpoints ("short < 10", "medium
// 10-30", "long > 30" — no upper bound stated for "long", and P5/§9.5 close the domain at exactly 3
// members, never a 4th). This function follows the CANON'S own more-specific textual definition (R9.3 —
// canon wins where the two disagree on a NON-structural implementation detail): `annealingBandLongUpperMinutes`
// is accepted as a parameter for future BO-diagnostic use (a display/validation ceiling, TD-worthy if ever
// needed) but is NOT consumed as a 3rd cutpoint here — "long" is simply `>= mediumUpperMinutes`, with no
// upper bound, matching the canon prose exactly. Surfaced for reviewer attention, not silently resolved.
export type SettlingBandBucket = 'short' | 'medium' | 'long';

/**
 * Map a raw remaining-settling-minutes scalar (real minutes — NEVER surfaced beyond this function's own
 * caller, P1/P5 strict) to its qualitative `SettlingBandBucket` (design §9.5, canon `annealing_window.md`
 * "Settling band determination"). `remainingMinutes <= 0` (already past due, pre-sweep) still buckets
 * `'short'` (the strict `< shortUpperMinutes` branch below), never a distinct "expired" member — a settled/
 * about-to-settle node reads as the tightest band, never a 4th domain value.
 */
export function deriveSettlingBandBucket(
  remainingMinutes: number,
  shortUpperMinutes: number,
  mediumUpperMinutes: number,
): SettlingBandBucket {
  if (remainingMinutes < shortUpperMinutes) return 'short';
  if (remainingMinutes < mediumUpperMinutes) return 'medium';
  return 'long';
}
