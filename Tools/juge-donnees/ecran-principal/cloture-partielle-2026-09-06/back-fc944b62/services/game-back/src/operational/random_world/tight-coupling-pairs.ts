// IMPLEMENTS: docs/superpowers/plans/2026-07-15-04g-B-random-world-plan.md C3 (tight-coupling-pairs.ts —
//             the 2 pairs, D5)
//             Design: docs/superpowers/specs/2026-07-15-04g-B-random-world-design.md §3.6 (Coupling —
//             TightCouplingPair registry) + the pairKey table therein
//             Decisions: docs/superpowers/specs/2026-07-15-04g-B-random-world-decisions.md D5 (★ RULING
//             — the 2 TightCouplingPair day-1)
//             Glossary: gdd/15:1855 `TightCouplingPair` (REUSE canon term).
//             — 04g-B C3 — 2026-07-15
//
// `TIGHT_COUPLING_PAIRS` — the static 2-entry registry (D5 — P1 canon `erlang_stash__deal_lek` + P2
// [PROV] `offhours_hum__bpd_attention`), form mirrors `random-world-template-registry.ts`'s catalogue
// shape (a plain TS array, no DB-side table — `pair_key` is a soft-ref text column on both
// `coupling_discovery_cascade` (migration 0128, C1) and `random_world_event_active.payload.pairKey`).
//
// This file holds ONLY the static METADATA (which systems, which secondary lever, catalogue citation) —
// the PREDICATE EVALUATION itself (S8 stash-band sustained-2-day query; S13 off-hours-drift freshness
// query) lives in `random-world-event-generator.service.ts` (C3's `eligibleSidewaysDistricts`), mirroring
// how `random-world-template-registry.ts`'s own entries are pure catalogue rows while the ACTUAL trigger
// logic for `halgren_tannery_hailstorm`/`permanent_residue` lives in the generator (C2 precedent — the
// registry is never the place DB-reading logic lives).

/** The 2 canon `pairKey` strings (gdd/15:1855 `TightCouplingPair`, D5 — day-1 exactly 2, never more). */
export type TightCouplingPairKey = 'erlang_stash__deal_lek' | 'offhours_hum__bpd_attention';

/** One static `TightCouplingPair` catalogue entry (design §3.6 shape: `{ pairKey, sourceSystem,
 *  targetSystem, secondaryTunableKey, catalogueRef }` — the `condition` predicate itself is NOT stored
 *  here, see file header). */
export interface TightCouplingPair {
  readonly pairKey: TightCouplingPairKey;
  /** Display label for the primary/source system (player-facing `known-couplings` surface, §6.1 — a
   *  descriptive label, never a raw scalar — R2.2 concerns numeric leakage, not system names). */
  readonly sourceSystem: string;
  /** Display label for the target system the secondary shift lands on. */
  readonly targetSystem: string;
  /** The overlay-routed tunable key the secondary shift MULTIPLYs (design §3.6 table — S7 for P1,
   *  the already-scope-aware `raid_target_temperature` S6 lever for P2). */
  readonly secondaryTunableKey: string;
  /** The exact catalogue/tech-doc citation this pair's canon (or [PROV] argument) traces to. */
  readonly catalogueRef: string;
}

/**
 * The 2-entry static registry (D5 ★ RULING). Order matches the design §3.6 table (P1 then P2) — the
 * generator's `evaluateSidewaysFailureTrigger` iterates this array in order (deterministic, design §8's
 * own "ordre de tirage FIXE documenté par service" discipline): P1 is evaluated before P2 every tick.
 */
export const TIGHT_COUPLING_PAIRS: readonly TightCouplingPair[] = [
  {
    pairKey: 'erlang_stash__deal_lek',
    sourceSystem: 'System 9 — Erlang Stash (saturation)',
    targetSystem: 'System 11 — Deal Lek (contest presence)',
    secondaryTunableKey: 'T.city.contest_threshold_presence',
    catalogueRef: 'CATALOGUE_REPORT.md:552-573 (Flow 1 verbatim, P1 canon)',
  },
  {
    pairKey: 'offhours_hum__bpd_attention',
    sourceSystem: '04g-A Off-Hours Drift Detector (off_hours_drift_detection)',
    targetSystem: 'System 3 — Police Memory (raid target temperature)',
    secondaryTunableKey: 'T.city.raid_target_temperature',
    catalogueRef: 'random_world_templates.md:215 ([PROV] substrate pairing, D5 — 04g-A drift as producer)',
  },
];

const TIGHT_COUPLING_PAIRS_BY_KEY: ReadonlyMap<TightCouplingPairKey, TightCouplingPair> = new Map(
  TIGHT_COUPLING_PAIRS.map((pair) => [pair.pairKey, pair]),
);

/** Look up a pair by its soft-ref key (from `payload.pairKey` — never a DB enum, D10 posture). Returns
 *  `undefined` for any key outside the 2-entry closed domain (defensive — payload is always written by
 *  this SAME module's own activation path, so an unknown key here would indicate DB corruption, never a
 *  legitimate runtime case). */
export function tightCouplingPairByKey(key: string): TightCouplingPair | undefined {
  return TIGHT_COUPLING_PAIRS_BY_KEY.get(key as TightCouplingPairKey);
}
