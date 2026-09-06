// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-C-diplomacy-infowar-plan.md Task 1 (C1)
//             "Shared signatures" §Types
//             Design: docs/superpowers/specs/2026-06-24-04b-C-diplomacy-infowar-design.md §9
//             Canon: docs/tech/04b_combat_and_conflict/diplomacy_mechanics.md §4/§6 (types)
//             — Diplomacy & Information Warfare C C1 — 2026-06-26 —
//
// `diplomacy.types.ts` — the client-view types + bucket enums the later chunks consume.
//
// R2.2 / P6 — P5 wall:
//   These types expose ONLY the player-facing buckets / composite views.
//   The raw floats (credibility, trust_decay, skepticism_thresholds, shared_bpd_attention)
//   are SERVER-ONLY and do NOT appear here (they live in the schema columns, never forwarded).
//   The CredibilityScoreBucket / TrustDecayBucket / SharedAttentionBucket are the projection
//   surface (derived server-side from the hidden floats).
//
// Anti-fabrication: no Math.random(), no Date.now(). Pure type definitions.
// DD-CREDIBILITY: CredibilityScoreBucket is the ONLY credibility-related player-facing type.
//   The raw float lives in credibility_state.credibility (schema) and stays BO-only.
//
// Types exported here (per plan §Shared signatures):
//   CredibilityScoreBucket — 'shattered' | 'damaged' | 'maintained' | 'pristine'
//   TrustDecayBucket       — 'pristine' | 'maintained' | 'damaged' | 'shattered'
//   SharedAttentionBucket  — 'low' | 'elevated' | 'mutual'
//   GiftType               — pgEnum values (client-side const union)
//   BurnType               — pgEnum values
//   LeverageType           — pgEnum values
//   RivalIntentType        — pgEnum values
//   InterpretationBadge    — pgEnum values
//   PublicLedgerEntryType  — pgEnum values
//   TargetHash             — the DD-SEALED-HASH commitment (opaque string)
//   DiplomacyClientView    — the banded projection (no raw scalar)

// ─── pgEnum value mirrors (const unions matching the SQL enums) ────────────────────────────────

/** Gift categories for Potlatch Bind (§4.3). Canon: diplomacy_mechanics.md :111. */
export type GiftType =
  | 'resource_transfer'
  | 'territory_concession'
  | 'supply_route_opening';

/** Burn commitment types for Burn Notice (§4.1). Canon: diplomacy_mechanics.md :67. */
export type BurnType =
  | 'route_burn'
  | 'asset_burn'
  | 'intermediary_burn';

/** Leverage token categories for Proof of Leverage (§4.4). Canon: diplomacy_mechanics.md :370. */
export type LeverageType =
  | 'supply'
  | 'personnel'
  | 'financial';

/** Inferred rival intent in Revelation Trap (§4.6). Canon: diplomacy_mechanics.md :372. */
export type RivalIntentType =
  | 'honor_intent'
  | 'defect_intent';

/** How the rival reads a Vulnerability Display (§4.2). Canon: information_warfare_mechanics.md :84-87. */
export type InterpretationBadge =
  | 'posture'
  | 'preparation'
  | 'ambiguous';

/** Public ledger entry categories (§4.3/4.4/4.7 — the P5 exception). Canon: diplomacy_mechanics.md :281. */
export type PublicLedgerEntryType =
  | 'potlatch_gift'
  | 'sealed_commitment'
  | 'proof_broadcast';

// ─── Bucket types (the player-facing projections — no raw scalar) ─────────────────────────────

/**
 * `CredibilityScoreBucket` — the player-facing credibility band.
 * Derived from the hidden `credibility_state.credibility` float vs the OQ-C4 sorted cuts
 * ([PROV-Y26Q2] calibration-routed — runtime implementation in credibility-accumulator.service.ts).
 * Canon: diplomacy_mechanics.md §4.2 (CredibilityScoreBucket composite).
 *
 * RUNTIME cuts (credibility-accumulator.service.ts bandCredibility() — authoritative):
 *   shattered:  credibility ≤ credibilityBucketCutVeryLowMax  (getter default -0.25)
 *   damaged:    credibility ≤ credibilityBucketCutLowMax      (getter default  0.0)
 *   maintained: credibility ≤ credibilityBucketCutStandardMax (getter default  0.25)
 *   pristine:   credibility > credibilityBucketCutStandardMax (getter default  0.25)
 *
 * NOTE: the cut values are [PROV-Y26Q2] and route to the conflict-layer calibration TD.
 * Doc drift corrected at C12 (C11 had fabricated getter names — see Finding 2):
 *   real getters: credibilityBucketCutVeryLowMax/LowMax/StandardMax/HighMax
 *   (diplomacy.tunables.ts:593/606/619/632; verified grep 2026-06-26).
 */
export type CredibilityScoreBucket =
  | 'shattered'
  | 'damaged'
  | 'maintained'
  | 'pristine';

/**
 * `TrustDecayBucket` — the player-facing trust-decay band.
 * Derived from the hidden `diplomacy_pair_state.trust_decay` float.
 * Canon: diplomacy_mechanics.md :61 — TrustDecayBucket composite.
 *
 * pristine:   trust_decay ≈ 0 (no decay — fresh relationship)
 * maintained: mild decay (relationship under mild strain)
 * damaged:    moderate decay (significant strain)
 * shattered:  severe decay (near-broken relationship)
 */
export type TrustDecayBucket =
  | 'pristine'
  | 'maintained'
  | 'damaged'
  | 'shattered';

/**
 * `SharedAttentionBucket` — the player-facing shared BPD attention band.
 * Derived from `shared_exposure_lock.shared_bpd_attention` float.
 * Canon: diplomacy_mechanics.md :164 — SharedAttentionBucket composite.
 *
 * low:      below the shared-exposure threshold (no mutual deterrence)
 * elevated: approaching threshold (partial deterrence developing)
 * mutual:   at or above threshold (auto-truce zone — auto_truce_active)
 */
export type SharedAttentionBucket =
  | 'low'
  | 'elevated'
  | 'mutual';

/**
 * `TargetHash` — the DD-SEALED-HASH deterministic commitment (opaque string to the player).
 * A hash of (committed target, per-commit seeded salt) — stored server-side.
 * NOT RNG (C4-clean — deterministic commit-reveal, DD-SEALED-HASH).
 * The player sees the hash as an opaque commitment token; the reveal is a deadline compare.
 */
export type TargetHash = string;

// ─── Player-facing ledger entry view (the P5 exception) ───────────────────────────────────────

/**
 * `PublicLedgerEntryView` — the ONE P5 exception (explicitly visible to rivals).
 * Canon: diplomacy_mechanics.md :281.
 * All fields here are intentionally public (no hidden float).
 */
export interface PublicLedgerEntryView {
  entry_id: string;
  player_id: string;
  entry_type: PublicLedgerEntryType;
  target_rival_key: string;
  /** bigint serialized as string in JSON */
  gameMinute: string;
}

// ─── Diplomacy client view (the P5 wall — no raw scalar) ──────────────────────────────────────

/**
 * `DiplomacyClientView` — the banded projection of the player's diplomacy state.
 * Used by `DiplomacyProjectionService.toDiplomacyClientView` (C10).
 *
 * P5 wall: NO raw float exposed (credibility / trust_decay / shared_bpd_attention /
 *   skepticism_thresholds are all stripped). Only the derived buckets + the public ledger.
 *
 * A/B reads: rival state bands come from A's `toClientView` (C never bypasses A's wall).
 */
export interface DiplomacyClientView {
  rivalKey: string;
  /** Player-facing credibility band (derived from the hidden float — DD-CREDIBILITY) */
  credibilityBucket: CredibilityScoreBucket;
  /** Player-facing trust-decay band */
  trustDecayBucket: TrustDecayBucket;
  /** Player-facing shared attention band (per-district — SharedAttentionBucket) */
  sharedAttentionBucket: SharedAttentionBucket;
  /** The public ledger view — the ONE P5 exception (own entries) */
  publicLedgerEntries: PublicLedgerEntryView[];
}
