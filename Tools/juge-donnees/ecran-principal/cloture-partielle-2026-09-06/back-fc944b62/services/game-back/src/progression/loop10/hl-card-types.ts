// IMPLEMENTS: docs/superpowers/plans/2026-07-10-p3-A-session-spine-plan.md §C6 (HighestLeverageCard —
//             provider registry + the 5 LIVE providers, D11/sub-decision #4)
//             Design: docs/superpowers/specs/2026-07-10-p3-A-session-spine-design.md §8
//             (HighestLeverageCard) + §1 D11 + §3 (data model — `highest_leverage_cards.decision_type`).
//             Decisions: §1.11 D11 + §6 RULING #4 (the 5 LIVE providers).
//             — P3-A C6 — 2026-07-10
//
// P3-C C8 ADDITION (2026-07-13) — docs/superpowers/plans/2026-07-12-p3-C-supply-chain-plan.md §C8 +
//             docs/superpowers/specs/2026-07-12-p3-C-supply-chain-design.md §8.4 + decisions §6.9
//             RULING #9 ("+2, codes 106-107, tactiques advisory"): 2 MORE v1 LIVE providers
//             (`BACKPRESSURE_CRITICAL_TRACE` / `MYCELIAL_STRESSED_LEG`), same aggregate-1-candidate shape
//             as `SeveredRouteHlCardProvider`, codes 106-107 — SAME numbering space as 101-105 below
//             (disjoint from `StructuralDecisionType` 1-14, file header rationale below UNCHANGED: both
//             new providers are tactical/advisory, never structural).
//
// P3-D C7 ADDITION (2026-07-15) — docs/superpowers/plans/2026-07-13-p3-D-cue-annealing-plan.md §C7 +
//             docs/superpowers/specs/2026-07-13-p3-D-cue-annealing-design.md §11 + decisions §6.4 RULING
//             #4 ("(a) L'ajouter — realizes canon GDD L253 'next session opens with these as primary
//             cards'"): 1 MORE v1 LIVE provider (`CUE_CASCADE_FALLOUT`), the SAME aggregate-1-candidate
//             shape, code 108 — SAME numbering space, codes 101-107 INTOUCHÉS (ruling #4's own constraint).
//
// `hl-card-types.ts` — the shared shapes every C6 provider/scorer/service imports.
//
// ★ CODER-REALIZED DESIGN CHOICE (decision_type numbering — genuinely underspecified by the 3 P3-A
// authoring docs, surfaced honestly rather than guessed silently): design §3 says `highest_leverage_
// cards.decision_type` is "aligned with `structural_decisions_audit.decision_type`" — read literally
// as SAME numeric space, none of the 5 v1 HL providers below actually corresponds to one of the 6 LIVE
// `StructuralDecisionType` codes (BUILDING_ACQUISITION/CONVERT, LIEUTENANT_RECRUIT/ROLE_REASSIGN,
// BEHAVIOR_SCRIPT_REPLACE, AUTONOMY_TIER_CHANGE — none is "repair a building" / "reroute a route" /
// "review an escalation" / "resolve an autonomy report" / "decide a legal case"), and design's OWN
// worked example confirms v1 tactical-ness explicitly: "SEVERED_ROUTE_REBUILD full-reset = structural
// WHEN P3-C LANDS, v1 minimal-reroute = tactical" — i.e. the 5 v1 providers are ALL tactical today by
// the SAME closed-world rule D7 uses for the Loop 10 catalogue ("tactical = everything else... NOT
// being in the structural catalogue"). Reading "aligned" as "same INT COLUMN TYPE + same append-only
// catalogue CONVENTION" (not "same value space") resolves this cleanly: the 5 HL provider types get
// their OWN small closed registry (`HL_CARD_PROVIDER_CATALOGUE` below), with codes chosen OUTSIDE the
// `StructuralDecisionType` 1-14 range specifically so `isCatalogueStructuralDecisionType` (below) never
// confuses a v1 tactical HL card for a Loop 10 structural one. When a FUTURE lot (P3-C landing
// SINUOSITY_FULL_RESET, say) wires a provider that DOES map onto a live catalogue code, that provider
// simply emits `decisionTypeCode: StructuralDecisionType-code-for-that-entry` instead of one of the 5
// codes below — the classifier (`isCatalogueStructuralDecisionType`) already handles that case (a code
// found live in `STRUCTURAL_DECISION_CATALOGUE`) with zero changes needed here. Flagged for reviewer/C9
// reconciliation (mirrors `core-loops-tunables.ts`'s own `one_decision_consider_window_seconds` honesty
// note — an R2.3-adjacent gap found and closed during implementation, not invented).

import {
  STRUCTURAL_DECISION_CATALOGUE,
  type StructuralDecisionCatalogueEntry,
} from './structural-decision-catalogue';

/** Clamp a raw float to [0, 1] — every provider's impact/urgency MUST be pre-normalized (R2.2 — the
 *  raw floats are BO-only, design §3; clamping here is a defensive floor/ceiling, not a substitute for
 *  each provider's own normalization reasoning, documented per-provider). */
export function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/** The 8 v1 LIVE HL card provider identities (5 decisions §6 RULING #4 [P3-A] + 2 P3-C C8 ruling #9 + 1
 *  P3-D C7 ruling #4). Distinct from `StructuralDecisionType` (Loop 10's OWN closed catalogue, C5) — see
 *  file header. */
export enum HlCardProviderType {
  DAMAGED_BUILDING_REPAIR = 'DAMAGED_BUILDING_REPAIR',
  SEVERED_ROUTE_REBUILD = 'SEVERED_ROUTE_REBUILD',
  ESCALATION_BACKLOG_REVIEW = 'ESCALATION_BACKLOG_REVIEW',
  AUTONOMY_REPORTS_PENDING = 'AUTONOMY_REPORTS_PENDING',
  LEGAL_CASE_DECISION = 'LEGAL_CASE_DECISION',
  // P3-C C8 (ruling #9, design §8.4).
  BACKPRESSURE_CRITICAL_TRACE = 'BACKPRESSURE_CRITICAL_TRACE',
  MYCELIAL_STRESSED_LEG = 'MYCELIAL_STRESSED_LEG',
  // P3-D C7 (ruling #4, design §11) — codes 101-107 INTOUCHÉS.
  CUE_CASCADE_FALLOUT = 'CUE_CASCADE_FALLOUT',
}

/** One HL-provider catalogue row — the int `code` persisted verbatim to `highest_leverage_cards.
 *  decision_type` for every v1 candidate this provider emits (see file header — a SEPARATE numbering
 *  space from `StructuralDecisionType`, chosen ≥ 101 to never collide with the Loop 10 1-14 range). */
export interface HlCardProviderCatalogueEntry {
  readonly code: number;
  readonly key: HlCardProviderType;
}

/** The closed v1 HL provider catalogue — 8 entries, 1:1 with `HlCardProviderType`. Codes 101-108
 *  (never in 1-14, so `isCatalogueStructuralDecisionType` below always classifies a v1 HL card as
 *  TACTICAL/advisory — honest, matches design §8's own SEVERED_ROUTE_REBUILD worked example). */
export const HL_CARD_PROVIDER_CATALOGUE: readonly HlCardProviderCatalogueEntry[] = [
  { code: 101, key: HlCardProviderType.DAMAGED_BUILDING_REPAIR },
  { code: 102, key: HlCardProviderType.SEVERED_ROUTE_REBUILD },
  { code: 103, key: HlCardProviderType.ESCALATION_BACKLOG_REVIEW },
  { code: 104, key: HlCardProviderType.AUTONOMY_REPORTS_PENDING },
  { code: 105, key: HlCardProviderType.LEGAL_CASE_DECISION },
  // P3-C C8 (ruling #9, design §8.4) — 2 more tactical advisory providers, SAME numbering space.
  { code: 106, key: HlCardProviderType.BACKPRESSURE_CRITICAL_TRACE },
  { code: 107, key: HlCardProviderType.MYCELIAL_STRESSED_LEG },
  // P3-D C7 (ruling #4, design §11) — codes 101-107 INTOUCHÉS, 108 is the ONLY new entry.
  { code: 108, key: HlCardProviderType.CUE_CASCADE_FALLOUT },
];

/** 2..4 qualitative decision options (design §3 `options jsonb` — glossary §15 `DecisionOption`,
 *  R2.2 — an i18n label key ONLY, never a raw scalar). No functional consequence this chunk (commit/
 *  skip are the only 2 real actions); this is descriptive flavor content for the future Unity surface
 *  (design §14 TD) and the BO diagnostic (C8). */
export interface DecisionOption {
  readonly label: string;
}

/** One scored candidate a provider emits — impact/urgency are ALREADY normalized [0,1] floats (R2.2 —
 *  BO-only raw values; the player never sees these, only bucket projections, C7). */
export interface HlCardCandidate {
  readonly providerType: HlCardProviderType;
  /** Persisted verbatim to `highest_leverage_cards.decision_type` — see file header. */
  readonly decisionTypeCode: number;
  readonly impact: number;
  readonly urgency: number;
  /** Provider-owned compact ref (design §3 — 2-5 fields, never a full snapshot). */
  readonly targetRef: Record<string, unknown>;
  readonly options: readonly DecisionOption[];
}

/** The provider contract (design §8 — "each registered provider... returns 0..n candidates"). */
export interface HlCardProvider {
  readonly providerType: HlCardProviderType;
  getCandidates(playerId: string): Promise<HlCardCandidate[]>;
}

/**
 * D7/D8 closed-world classifier, REUSED for HL cards: is `decisionTypeCode` a LIVE entry in the Loop 10
 * `StructuralDecisionType` catalogue? If so, committing a card carrying this code IS catalogue-structural
 * (routes through the governor, consumes the per-session budget — design §8 "only catalogue-structural
 * card types route through the governor's cap"). None of the 5 v1 providers' own codes (101-105) ever
 * match (disjoint numbering, file header) — so EVERY real v1 HL card is advisory. A structural HL card
 * is only producible today via a direct-DB test seed (`hl_card.spec.ts`'s own falsifiable proof of the
 * COMMIT ENDPOINT'S routing logic — the mechanism, not a real v1 provider output) OR by a FUTURE
 * provider (post-P3-C etc.) that deliberately emits a live `StructuralDecisionType` code.
 */
export function catalogueStructuralEntryFor(decisionTypeCode: number): StructuralDecisionCatalogueEntry | undefined {
  return STRUCTURAL_DECISION_CATALOGUE.find((e) => e.code === decisionTypeCode && e.live);
}
