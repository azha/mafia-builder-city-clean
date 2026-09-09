// IMPLEMENTS: docs/superpowers/plans/2026-07-10-p3-A-session-spine-plan.md §C7 (session-open sequence +
//             P5 wall — the HighestLeverageCard's PLAYER-FACING projection, honestly closing the C2
//             `{ session_id }` skeleton disclaimer)
//             Design: docs/superpowers/specs/2026-07-10-p3-A-session-spine-design.md §9 (session-open
//             sequence + projections — `HighestLeverageCardProjection = {card_id, decision_type_key,
//             impact_bucket, urgency_bucket, options[2..4], structural: bool}`) + §8 (HL card lifecycle,
//             "the payload carries `hl_card: null` honestly" for the empty state).
//             Canon: docs/tech/08_ui_screens/screen_1a_decision_detail.md §Glossary R6.1
//             (`ImpactEstimateBucket`/`UrgencyBucket` — "Bucket [...] qualitatif [...] pas de float
//             brut — P5"). `projects/mafia_city_game/gdd/14_tunable_constants.md` §"Core loops —
//             Session Spine..." bottom row (`one_decision_impact_estimate_accuracy` — a DESIGN
//             INVARIANT, not a store key: "encodée par la projection ImpactEstimateBucket/UrgencyBucket
//             elle-même, P3-A C7" — THIS file is that projection).
//             — P3-A C7 — 2026-07-10
//
// `hl-card-projection.ts` — the R2.2 player-facing projection for the persisted
// `HighestLeverageCardRow`: maps the RAW server-only `impact_internal`/`urgency_internal` [0..1] floats
// → closed qualitative bucket labels (mirrors `exceptions.projection.service.ts`'s discipline — the ONLY
// mapper for these two scalars; the raw floats NEVER escape past this file, R2.2). `decision_type` (the
// raw catalogue int persisted on the row — either an HL-provider-local code 101-105, or a live
// `StructuralDecisionType` code 1-14 for a FUTURE provider per `hl-card-types.ts`'s own file-header
// note) resolves to a human-readable `decision_type_key` string via BOTH catalogues: a v1 provider code
// always resolves via `HL_CARD_PROVIDER_CATALOGUE`; a future provider emitting a live structural code
// would resolve via `STRUCTURAL_DECISION_CATALOGUE` instead. `'UNKNOWN'` is a defensive fallback that
// should be unreachable given the two catalogues' current disjoint coverage — but this sits on a
// player-facing READ path (the session-open sequence), so a genuinely unclassifiable code degrades to a
// label rather than throwing (never 500 the whole `open()` request over a diagnostic string).
//
// CUT-POINTS [PROV-Y26Q2] — canon gives NO numeric magnitude for `ImpactEstimateBucket`/`UrgencyBucket`
// (`one_decision_per_session.md §Tunables`: `one_decision_impact_estimate_accuracy = order_of_magnitude`,
// a qualitative design invariant, NOT a store key — decisions §4.4, gdd/14 same row). Mirrors the
// ALREADY-established 3-band confidence-bucket convention `exceptions.projection.service.ts#
// confidenceBand` uses (tentative<0.4 / likely[0.4,0.7) / confident≥0.7) for consistency across the
// whole ch05 surface:
//   impact_bucket  : minor<0.4      ; moderate[0.4,0.7)   ; major≥0.7.
//   urgency_bucket : low<0.4        ; elevated[0.4,0.7)   ; pressing≥0.7.

import { catalogueStructuralEntryFor, HL_CARD_PROVIDER_CATALOGUE, type DecisionOption } from './hl-card-types';
import { STRUCTURAL_DECISION_CATALOGUE } from './structural-decision-catalogue';
import type { HighestLeverageCardRow } from '../../db/schema/core_loops';

/** ImpactEstimateBucket — R2.2 qualitative bucket for `impact_internal` (canon `one_decision_per_session.md
 *  §Glossary` — "order_of_magnitude" qualitative accuracy, no raw float ever escapes). */
export type ImpactEstimateBucket = 'minor' | 'moderate' | 'major';
/** UrgencyBucket — R2.2 qualitative bucket for `urgency_internal` (SAME canon glossary entry). */
export type UrgencyBucket = 'low' | 'elevated' | 'pressing';

/** impact [0..1] → ImpactEstimateBucket. minor<0.4 ; moderate[0.4,0.7) ; major≥0.7 [PROV-Y26Q2 — see
 *  file header, mirrors the confidence-bucket 3-band convention]. */
export function impactBucket(impact: number): ImpactEstimateBucket {
  if (impact >= 0.7) return 'major';
  if (impact >= 0.4) return 'moderate';
  return 'minor';
}

/** urgency [0..1] → UrgencyBucket. low<0.4 ; elevated[0.4,0.7) ; pressing≥0.7 [PROV-Y26Q2 — see file
 *  header]. */
export function urgencyBucket(urgency: number): UrgencyBucket {
  if (urgency >= 0.7) return 'pressing';
  if (urgency >= 0.4) return 'elevated';
  return 'low';
}

/**
 * ★ C8 (design §10, forward-note from the C6 ruling): which of the two disjoint catalogues a persisted
 * `decision_type` int was drawn from. A bare int is meaningless on a BO render surface without this —
 * `highest_leverage_cards.decision_type` spans BOTH the HL-provider-local catalogue (101-105,
 * `hl-card-types.ts`) and the Loop 10 `StructuralDecisionType` catalogue (1-14,
 * `structural-decision-catalogue.ts`); `structural_decisions_audit.decision_type` (the OTHER C8 BO
 * surface, the structural-decisions timeline) only ever carries the latter — but the SAME resolver is
 * reused for both (never a second catalogue-lookup written for the audit table), so its `'UNKNOWN'`
 * defensive branch stays exercised by construction rather than by convention alone.
 */
export type DecisionTypeCatalogueProvenance = 'HL_ADVISORY' | 'STRUCTURAL' | 'UNKNOWN';

/** A decision-type int resolved to its render key PLUS which catalogue it came from (C8 — never a bare int, never a key with no provenance). */
export interface DecisionTypeLabel {
  readonly key: string;
  readonly catalogue: DecisionTypeCatalogueProvenance;
}

/**
 * Resolve a persisted `decision_type` int to its {key, catalogue} pair. Checks the HL-provider-local
 * catalogue FIRST (101-105 — every REAL v1 provider output, `hl-card-types.ts` file header), then the
 * Loop 10 `StructuralDecisionType` catalogue (1-14 — a FUTURE provider that deliberately emits a live
 * structural code, per that SAME file header's own forward note). `'UNKNOWN'` — defensive, should be
 * unreachable given the two catalogues' current disjoint coverage — never throws (this sits on both a
 * player-facing read, via `decisionTypeKeyFor` below, and a BO read, C8).
 */
export function decisionTypeLabelFor(code: number): DecisionTypeLabel {
  const providerEntry = HL_CARD_PROVIDER_CATALOGUE.find((e) => e.code === code);
  if (providerEntry) return { key: providerEntry.key, catalogue: 'HL_ADVISORY' };
  const structuralEntry = STRUCTURAL_DECISION_CATALOGUE.find((e) => e.code === code);
  if (structuralEntry) return { key: structuralEntry.key, catalogue: 'STRUCTURAL' };
  return { key: 'UNKNOWN', catalogue: 'UNKNOWN' };
}

/**
 * Resolve a persisted `decision_type` int to its human-readable key string ONLY — `projectHlCard`'s
 * existing (key-only) player-facing contract, kept byte-identical. A thin wrapper over
 * `decisionTypeLabelFor` (C8 — single source of catalogue-lookup logic, never duplicated).
 */
export function decisionTypeKeyFor(code: number): string {
  return decisionTypeLabelFor(code).key;
}

/**
 * The player-facing HighestLeverageCard (design §9 — bucket-only + text + a structural/advisory flag,
 * NEVER the raw `impact_internal`/`urgency_internal` floats, R2.2). `structural` mirrors
 * `catalogueStructuralEntryFor`'s OWN closed-world rule (`hl-card-types.ts`) — true iff committing this
 * card would route through the Loop 10 governor (consumes the per-session structural budget); every REAL
 * v1 provider output is `false` (advisory) today, honestly.
 */
export interface HighestLeverageCardProjection {
  card_id: string;
  decision_type_key: string;
  impact_bucket: ImpactEstimateBucket;
  urgency_bucket: UrgencyBucket;
  options: DecisionOption[];
  structural: boolean;
}

/** Project one raw persisted row to its band-only card (R2.2 — the raw impact/urgency scalars are
 *  consumed here and NEVER forwarded). Pure — no DB/IO, mirrors `ExceptionsProjectionService#projectCard`'s
 *  discipline. */
export function projectHlCard(row: HighestLeverageCardRow): HighestLeverageCardProjection {
  return {
    card_id: row.card_id,
    decision_type_key: decisionTypeKeyFor(row.decision_type),
    impact_bucket: impactBucket(row.impact_internal),
    urgency_bucket: urgencyBucket(row.urgency_internal),
    options: (row.options as DecisionOption[]) ?? [],
    structural: catalogueStructuralEntryFor(row.decision_type) !== undefined,
  };
}
