// IMPLEMENTS: docs/superpowers/plans/2026-06-16-depth-d2-impl-plan.md Task R2a + Task R2b + Task R3a + Task R3b + Task R4a + Task R5a + Task R7a + Task R8a
//             docs/tech/04c_market_reputation_insurance/reputation_mechanics.md §3.1 (Tunables :73-77)
//             docs/tech/04c_market_reputation_insurance/reputation_mechanics.md §3.2 (Tunables :103-107)
//             docs/tech/04c_market_reputation_insurance/reputation_mechanics.md §3.3 (Tunables :140-144) [R5a]
//             docs/tech/04c_market_reputation_insurance/reputation_mechanics.md §3.4 (Tunables :184-188) [R7a]
//             projects/mafia_city_game/gdd/14_tunable_constants.md §Reputation (from 04c §3) (:950-973,4163-4182)
//             — D2 R2a — 2026-06-17; D2 R2b — 2026-06-17; D2 R3b — 2026-06-17; D2 R4a — 2026-06-17; D2 R5a — 2026-06-17; D2 R7a — 2026-06-17
//
// `reputation-tunables.ts` — REUSE getters for the `reputation.*` registry keys consumed by
// the D2 reputation mechanics. Pattern mirrors `market-tunables.ts` exactly.
//
// R2.3 (NO inline numeric value for any `reputation.*` key): all values route through
// TunablesStore.resolve* with the registry key name as the first arg. The defaults cited here
// are verbatim from gdd/14 §Reputation (from 04c §3) (:950-970) — the single source of truth.
// If the registry values change, update gdd/14 + this file in the SAME commit (R9.3 propagation).
//
// DD-REG-NAME (registry-wins): the code consumes the SHORT registry key names from gdd/14 §Reputation.
// The T.reputation.* alias names in gdd/14:4163-4182 are the migration-map targets (not the store keys).
// The store key passed to TunablesStore.resolveInt is the namespaced form `reputation.<key>` matching
// the market pattern (`market.lane_confidence_gain_alpha`, etc.).
//
// R2a SCOPE: only the two keys directly consumed by BossMirrorService are exposed here.
// R2b SCOPE adds 3 new getters:
//   - bossMirrorRecencyDecayWeekly (recency_weight per ring slot, REUSE from gdd/14:953)
//   - bossMirrorSeverityToleranceGamma (γ multiplier in defection_tolerance formula, REUSE from gdd/14:954)
//   - bossMirrorBaseDefectionTolerance (NEW tunable — base_tolerance in the formula `:56`,
//       NOT in gdd/14 at R2b; added as [PROPOSED DEFAULT][PROV-Y26Q2] registry-first with anchor.
//       base_tolerance = the "neutral" defection threshold with no violations: 1.0 (unitless scalar).
//       Range 0.5..2.0 (reviewer-set at gate). This tunable MUST be added to gdd/14 §Reputation
//       by R2b's commit (R9.3 propagation — done in the same commit).
//       Reviewer flag: [BASE_TOLERANCE_NEW_TUNABLE] — NEW tunable, not in gdd/14 pre-R2b.
//
// Precedence: DB-override > env > gdd/14 default (TunablesStore).

import { TunablesStore } from '../../config/tunables-store';

/** Registry-mirrored getters for the R2a+R2b-consumed `reputation.*` tunable keys. */
export const reputationTunables = {

  // ── 3.1 Boss Mirror — 2 keys consumed by R2a ─────────────────────────────────────────────────

  /**
   * `reputation.boss_mirror_max_public_rules` — maximum simultaneous declared operating rules.
   * Canon `:47`: "publicly commit up to 4 simultaneous operating rules".
   * Default 4, range 2..8 (gdd/14:955 §Reputation — boss_mirror_max_public_rules).
   * Env-override: REPUTATION_BOSS_MIRROR_MAX_PUBLIC_RULES (test-only).
   */
  get bossMirrorMaxPublicRules(): number {
    return TunablesStore.resolveInt(
      'reputation.boss_mirror_max_public_rules',
      'REPUTATION_BOSS_MIRROR_MAX_PUBLIC_RULES',
      4,
    );
  },

  /**
   * `reputation.boss_mirror_violation_ring_size` — FIFO ring capacity per lieutenant.
   * Canon `:73`: ring 5 slots (rule_id + severity per slot).
   * Default 5, range 3..10 (gdd/14:953 §Reputation — boss_mirror_violation_ring_size).
   * Env-override: REPUTATION_BOSS_MIRROR_VIOLATION_RING_SIZE (test-only).
   */
  get bossMirrorViolationRingSize(): number {
    return TunablesStore.resolveInt(
      'reputation.boss_mirror_violation_ring_size',
      'REPUTATION_BOSS_MIRROR_VIOLATION_RING_SIZE',
      5,
    );
  },

  // ── 3.1 Boss Mirror — 3 keys consumed by R2b (weekly tick) ──────────────────────────────────

  /**
   * `reputation.boss_mirror_recency_decay_weekly` — per-slot recency_weight decay factor.
   * Canon `:75`: "boss_mirror_per_week_recency_decay default 0.08".
   * Applied per ring slot to weight recent violations more heavily than older ones.
   * Slot i (0 = most recent): recency_weight_i = (1 − decay)^i.
   * Default 0.08, range 0.03..0.20 (gdd/14:953 §Reputation — boss_mirror_recency_decay_weekly).
   * DD-REG-NAME: stored key is `reputation.boss_mirror_recency_decay_weekly` (no inline literal).
   * Env-override: REPUTATION_BOSS_MIRROR_RECENCY_DECAY_WEEKLY (test-only).
   */
  get bossMirrorRecencyDecayWeekly(): number {
    return TunablesStore.resolveFloat(
      'reputation.boss_mirror_recency_decay_weekly',
      'REPUTATION_BOSS_MIRROR_RECENCY_DECAY_WEEKLY',
      0.08,
    );
  },

  /**
   * `reputation.boss_mirror_severity_tolerance_gamma` — γ multiplier in the defection_tolerance formula.
   * Canon `:76`: "boss_mirror_gamma_severity_to_tolerance_multiplier default 1.0".
   * Used in: defection_tolerance = base_tolerance · (1 + γ · violation_density).
   * Default 1.0, range 0.5..2.0 (gdd/14:954 §Reputation — boss_mirror_severity_tolerance_gamma).
   * DD-REG-NAME: stored key is `reputation.boss_mirror_severity_tolerance_gamma` (no inline literal).
   * Env-override: REPUTATION_BOSS_MIRROR_SEVERITY_TOLERANCE_GAMMA (test-only).
   */
  get bossMirrorSeverityToleranceGamma(): number {
    return TunablesStore.resolveFloat(
      'reputation.boss_mirror_severity_tolerance_gamma',
      'REPUTATION_BOSS_MIRROR_SEVERITY_TOLERANCE_GAMMA',
      1.0,
    );
  },

  /**
   * `reputation.boss_mirror_base_defection_tolerance` — base_tolerance in the defection_tolerance formula.
   * Canon `:56`: "defection_tolerance = base_tolerance · (1 + γ · violation_density)".
   * base_tolerance = the "neutral" defection threshold when the ring is empty (zero-regression invariant:
   * an empty ring produces defection_tolerance = base_tolerance exactly).
   *
   * [PROPOSED DEFAULT][PROV-Y26Q2]: 1.0 (unitless scalar, multiplicative neutral).
   * Range: 0.5..2.0 (reviewer-set at gate; same range as γ for symmetry).
   * NOT in gdd/14 pre-R2b — this is a NEW registry key added by this commit (R9.3 propagation).
   * Reviewer flag: [BASE_TOLERANCE_NEW_TUNABLE] — the reviewer must confirm the proposed default + range.
   *
   * DD-REG-NAME: key is `reputation.boss_mirror_base_defection_tolerance` (no inline 1.0 in formula code).
   * Env-override: REPUTATION_BOSS_MIRROR_BASE_DEFECTION_TOLERANCE (test-only).
   */
  get bossMirrorBaseDefectionTolerance(): number {
    return TunablesStore.resolveFloat(
      'reputation.boss_mirror_base_defection_tolerance',
      'REPUTATION_BOSS_MIRROR_BASE_DEFECTION_TOLERANCE',
      1.0,
    );
  },

  // ── W6a C5 (DD-MAGNITUDE-BOUND): recordViolation severityBucket clamp — design §3/C5 + §D5 ────
  //
  // `recordViolation`'s `severityBucket` (boss-mirror.service.ts, was `:269` at spec-authoring time —
  // re-verified `:283` today, C3 having inserted its own ownership-guard docblock above it) is a
  // caller-supplied magnitude with NO bound — a validation defect (D5), distinct from the ownership
  // defect C3 closed on this SAME method.
  //
  // ★ DEVIATION (flagged loud for reviewer⊥ — see this file's own header comment §3.1 `:57`, canon
  // `reputation_mechanics.md:50`): the docblock 2 lines above THIS method's own canon citation says
  // "severity 4 bits" (a 0-15 domain). Measured before choosing a default: the domain the docblock
  // implies is CONTRADICTED by the only 2 real (non-`_test`) producers in the codebase, both of which
  // emit up to 100 under the EXPLICIT, user-locked R4b "REUSE 0-100 integer bucket" convention:
  //   - `restraint-index.service.ts:261` (DD-BRIDGE): `Math.round(extractionRatio * 100)`.
  //   - `promotion-lock.service.ts:458` (`applyReversalDamage`): `Math.round(1.0 * 100)` = 100 EXACTLY.
  // A ceiling of 15 would CLAMP AWAY the second of these on every single call — a self-inflicted
  // regression on already-shipped production behavior, not a security fix. Chose the WIDER, measured-
  // compatible default (100) as the conservative option (least behavior change) rather than the
  // narrower docblock-implied one. The stale "4 bits" comment needs reconciling by reviewer⊥/C13 — NOT
  // done here (out of C5's scope: a comment fix on a DIFFERENT method's docblock, not a magnitude bound).

  /**
   * `reputation.boss_mirror_severity_bucket_min` — [PROPOSED DEFAULT][PROV-Y26Q2].
   * Lower clamp bound for `recordViolation`'s caller-supplied `severityBucket`.
   * Default 0 (no such thing as negative violation severity). Range 0..10 (reviewer-set at gate).
   * Env-override: REPUTATION_BOSS_MIRROR_SEVERITY_BUCKET_MIN (test-only).
   */
  get bossMirrorSeverityBucketMin(): number {
    return TunablesStore.resolveInt(
      'reputation.boss_mirror_severity_bucket_min',
      'REPUTATION_BOSS_MIRROR_SEVERITY_BUCKET_MIN',
      0,
    );
  },

  /**
   * `reputation.boss_mirror_severity_bucket_max` — [PROPOSED DEFAULT][PROV-Y26Q2].
   * Upper clamp bound for `recordViolation`'s caller-supplied `severityBucket`.
   * Default 100 — see the ★ DEVIATION note above this block: measured to match the "REUSE 0-100
   * integer bucket" convention the 2 real producers already use (NOT the 0-15 "4 bits" domain the
   * (stale) docblock 2 methods below implies — that would clamp away shipped behavior).
   * Range 15..255 (reviewer-set at gate; floor kept at the docblock's own 4-bit reading in case that
   * turns out to be the one to fix instead).
   * Env-override: REPUTATION_BOSS_MIRROR_SEVERITY_BUCKET_MAX (test-only).
   */
  get bossMirrorSeverityBucketMax(): number {
    return TunablesStore.resolveInt(
      'reputation.boss_mirror_severity_bucket_max',
      'REPUTATION_BOSS_MIRROR_SEVERITY_BUCKET_MAX',
      100,
    );
  },

  // ── G31 declaration_ledger — 2 keys consumed by R3a write primitive ──────────────────────────
  // REUSE-confirm: both keys already exist in gdd/14 (binary-rg verified in R3a report).
  //
  // DUAL-SPELLING RECONCILIATION (R3a): gdd/14 has TWO spellings for the ring-size key:
  //   - `declaration_ledger_size_per_precinct` (gdd/14 L95, L3811 alias) — WITHOUT dot prefix.
  //   - `declaration_ledger.max_entries_per_building` (gdd/14 L97, L3808 alias) — WITH dot prefix.
  //   The underscore spelling is canonical in gdd/14 §City — Asymmetric Police Memory (L95 row);
  //   the dotted keys (L96-L104) are the G31 sub-namespace. The registry key is
  //   `declaration_ledger_size_per_precinct` (NOT `declaration_ledger.size_per_precinct`).
  //   The write primitive reads `declaration_ledger_size_per_precinct` for the TOTAL ring bound
  //   and `declaration_ledger.max_entries_per_building` for the per-building FIFO cap.
  //   These are NOT re-added (R9.3 REUSE-only). Confirmed absent from police-memory-tunables.ts
  //   (deferred there — gdd/14 L46-49 «DEFERRED»). Activated here in R3a.

  /**
   * `declaration_ledger_size_per_precinct` — total ring buffer depth per precinct (FIFO slots).
   * System 3 G31 (:81): DeclarationEntry[64] ring. Default 64, range 32..256 (gdd/14 L95).
   * REUSE (not re-added — R9.3): key already present in registry.
   * Env-override: DECLARATION_LEDGER_SIZE_PER_PRECINCT (test-only).
   */
  get declarationLedgerSizePerPrecinct(): number {
    return TunablesStore.resolveInt(
      'declaration_ledger_size_per_precinct',
      'DECLARATION_LEDGER_SIZE_PER_PRECINCT',
      64,
    );
  },

  /**
   * `declaration_ledger.max_entries_per_building` — per-building FIFO cap within the ring.
   * System 3 G31 (:165): max entries_actives per bâtiment. Default 50, range 10..500 (gdd/14 L97).
   * REUSE (not re-added — R9.3): key already present in registry.
   * Env-override: DECLARATION_LEDGER_MAX_ENTRIES_PER_BUILDING (test-only).
   */
  get declarationLedgerMaxEntriesPerBuilding(): number {
    return TunablesStore.resolveInt(
      'declaration_ledger.max_entries_per_building',
      'DECLARATION_LEDGER_MAX_ENTRIES_PER_BUILDING',
      50,
    );
  },

  // ── G31 declaration_ledger — keys consumed by R3b (police_memory acceptor) ──────────────────
  // REUSE-confirm: all keys already exist in gdd/14 (binary-rg verified, L96-L101).
  // Activated here in R3b for Tick2 decay + Tick3 G31 scoring.

  /**
   * `declaration_ledger.weight_vs_patrol` — G31 scoring weight for declarations vs patrol observations.
   * Canon (:151): `final_tile_score = patrol_observation_score + weight_vs_patrol × declaration_severity_sum`.
   * Default 0.6, range 0.3..0.9 (gdd/14 L99).
   * REUSE (not re-added — R9.3): key already present in registry.
   * Env-override: DECLARATION_LEDGER_WEIGHT_VS_PATROL (test-only).
   */
  get declarationLedgerWeightVsPatrol(): number {
    return TunablesStore.resolveFloat(
      'declaration_ledger.weight_vs_patrol',
      'DECLARATION_LEDGER_WEIGHT_VS_PATROL',
      0.6,
    );
  },

  /**
   * `declaration_ledger.half_life_boss_mirror_days` — exponential decay half-life in in-game days
   * for `boss_mirror_violation` declaration entries (Tick2 decay sweep, :144-146).
   * Default 30, range 14..90 (gdd/14 L101).
   * REUSE (not re-added — R9.3): key already present in registry.
   * Env-override: DECLARATION_LEDGER_HALF_LIFE_BOSS_MIRROR_DAYS (test-only).
   */
  get declarationLedgerHalfLifeBossMirrorDays(): number {
    return TunablesStore.resolveInt(
      'declaration_ledger.half_life_boss_mirror_days',
      'DECLARATION_LEDGER_HALF_LIFE_BOSS_MIRROR_DAYS',
      30,
    );
  },

  /**
   * `declaration_ledger.entry_retention_days` — entries with severity ≤ 0 after decay are swept
   * (retired) if they are older than this many in-game days.
   * Default 365, range 90..1825 (gdd/14 L96).
   * REUSE (not re-added — R9.3): key already present in registry.
   * Env-override: DECLARATION_LEDGER_ENTRY_RETENTION_DAYS (test-only).
   */
  get declarationLedgerEntryRetentionDays(): number {
    return TunablesStore.resolveInt(
      'declaration_ledger.entry_retention_days',
      'DECLARATION_LEDGER_ENTRY_RETENTION_DAYS',
      365,
    );
  },

  /**
   * `declaration_ledger.write_hook_throttle_per_minute` — max writes/minute per precinct (anti-spam,
   * G31 :163). The subscription handler enforces this to prevent event-storm flooding the ring.
   * Default 10, range 1..100 (gdd/14 L98).
   * REUSE (not re-added — R9.3): key already present in registry.
   * Env-override: DECLARATION_LEDGER_WRITE_HOOK_THROTTLE_PER_MINUTE (test-only).
   */
  get declarationLedgerWriteHookThrottlePerMinute(): number {
    return TunablesStore.resolveInt(
      'declaration_ledger.write_hook_throttle_per_minute',
      'DECLARATION_LEDGER_WRITE_HOOK_THROTTLE_PER_MINUTE',
      10,
    );
  },

  // ── 3.2 Restraint Index — 5 keys consumed by R4a (dispute ring + weekly tick) ─────────────────
  //
  // 4 of the 5 keys REUSE existing gdd/14 entries at lines 957-960 (no re-add required — R9.3).
  // 1 key (restraint_base_terms) is NEW — added to gdd/14 §Reputation by this commit (R4a R9.3 backport).
  //
  // Canon §3.2 (:103-107): tunables are spelled in the tech-doc as:
  //   `reputation.restraint_delta_terms_coefficient`  (tech-doc name)
  //   `reputation.restraint_t_wary_threshold`         (tech-doc name)
  //   `reputation.restraint_window_depth_disputes`    (tech-doc name)
  //   `reputation.restraint_collateral_inflation_under_wary` (tech-doc name)
  // But gdd/14 lines 957-960 has the SHORT registry names:
  //   `restraint_terms_coefficient_delta`, `restraint_wary_threshold`,
  //   `restraint_window_disputes`, `restraint_collateral_inflation_wary`
  // DD-REG-NAME: the code uses the SHORT gdd/14 names (the registry keys), not the tech-doc names.
  // REVIEWER FLAG: [RESTRAINT_TUNABLE_NAMES] — confirm the short keys are the canonical store keys.

  /**
   * `reputation.restraint_terms_coefficient_delta` (δ) — multiplier for restraint_ratio effect on
   * offer_terms. Canon :104 tech-doc as `restraint_delta_terms_coefficient`, gdd/14 L957 as
   * `restraint_terms_coefficient_delta`. Store key follows gdd/14 (DD-REG-NAME).
   * Used in: offer_terms = base_terms · (1 + δ · restraint_ratio).
   * Default 0.35, range 0.10..0.60 (gdd/14:957).
   * REUSE — not re-added to gdd/14 (pre-existing at L957).
   * Env-override: REPUTATION_RESTRAINT_TERMS_COEFFICIENT_DELTA (test-only).
   */
  get restraintTermsCoefficientDelta(): number {
    return TunablesStore.resolveFloat(
      'restraint_terms_coefficient_delta',
      'REPUTATION_RESTRAINT_TERMS_COEFFICIENT_DELTA',
      0.35,
    );
  },

  /**
   * `reputation.restraint_wary_threshold` (T_wary) — threshold below which counterparty pool shifts to
   * "wary" configuration demanding collateral up front. Canon :105 tech-doc as `restraint_t_wary_threshold`,
   * gdd/14 L958 as `restraint_wary_threshold`. Store key follows gdd/14 (DD-REG-NAME).
   * When restraint_ratio < T_wary → wary config.
   * Default 0.15, range 0.00..0.30 (gdd/14:958).
   * REUSE — not re-added to gdd/14 (pre-existing at L958).
   * Env-override: REPUTATION_RESTRAINT_WARY_THRESHOLD (test-only).
   */
  get restraintWaryThreshold(): number {
    return TunablesStore.resolveFloat(
      'restraint_wary_threshold',
      'REPUTATION_RESTRAINT_WARY_THRESHOLD',
      0.15,
    );
  },

  /**
   * `reputation.restraint_window_disputes` — FIFO ring capacity (number of dispute slots).
   * Canon :106 tech-doc as `restraint_window_depth_disputes`, gdd/14 L959 as `restraint_window_disputes`.
   * Store key follows gdd/14 (DD-REG-NAME).
   * Default 6, range 3..12 (gdd/14:959).
   * REUSE — not re-added to gdd/14 (pre-existing at L959).
   * Env-override: REPUTATION_RESTRAINT_WINDOW_DISPUTES (test-only).
   */
  get restraintWindowDisputes(): number {
    return TunablesStore.resolveInt(
      'restraint_window_disputes',
      'REPUTATION_RESTRAINT_WINDOW_DISPUTES',
      6,
    );
  },

  /**
   * `reputation.restraint_collateral_inflation_wary` — escrow inflation multiplier applied when
   * the counterparty is in wary config. Canon :107 tech-doc as `restraint_collateral_inflation_under_wary`,
   * gdd/14 L960 as `restraint_collateral_inflation_wary`. Store key follows gdd/14 (DD-REG-NAME).
   * collateral_amount = offer_terms · restraint_collateral_inflation_wary.
   * Default 1.4, range 1.1..2.0 (gdd/14:960).
   * REUSE — not re-added to gdd/14 (pre-existing at L960).
   * Env-override: REPUTATION_RESTRAINT_COLLATERAL_INFLATION_WARY (test-only).
   */
  get restraintCollateralInflationWary(): number {
    return TunablesStore.resolveFloat(
      'restraint_collateral_inflation_wary',
      'REPUTATION_RESTRAINT_COLLATERAL_INFLATION_WARY',
      1.4,
    );
  },

  /**
   * `reputation.restraint_base_terms` — base multiplier applied to offer terms when restraint_ratio=0.
   * Canon :90: offer_terms = base_terms · (1 + δ · restraint_ratio).
   * base_terms = the "neutral" offer level when the ring is empty (zero-regression invariant:
   * an empty ring → restraint_ratio=0 → offer_terms = base_terms exactly).
   *
   * [PROPOSED DEFAULT][PROV-Y26Q2]: 1.0 (unitless multiplicative scalar — neutral baseline).
   * Range: 0.5..2.0 (reviewer-set at gate).
   * NOT in gdd/14 pre-R4a — this is a NEW registry key added by this commit (R9.3 backport).
   * REVIEWER FLAG: [BASE_TERMS_NEW_TUNABLE] — NEW tunable not in gdd/14 before R4a.
   *   Proposed default 1.0 (neutral — empty ring produces offer_terms = 1.0 exactly).
   *   The reviewer must confirm the proposed default + range.
   *
   * DD-REG-NAME: store key is `reputation.restraint_base_terms` (no inline 1.0 in formula code).
   * Env-override: REPUTATION_RESTRAINT_BASE_TERMS (test-only).
   */
  get restraintBaseTerms(): number {
    return TunablesStore.resolveFloat(
      'reputation.restraint_base_terms',
      'REPUTATION_RESTRAINT_BASE_TERMS',
      1.0,
    );
  },

  // ── W6a C5 (DD-MAGNITUDE-BOUND): recordDisputeOutcome claimable/claimed clamp — design §3/C5+§D5 ─
  //
  // `recordDisputeOutcome`'s `claimable`/`claimed` (restraint-index.service.ts:165-166 — re-verified
  // today, unmoved by C2/C3/C4) are caller-supplied magnitudes with NO bound — a validation defect
  // (D5), independent of any ownership fix in this lot.
  //
  // Anchors (measured before choosing a default, not deduced from the field name): canon
  // `reputation_mechanics.md:83` gives the STRUCTURAL ceiling — "each slot 4 B (`claimable_amount` 2 B
  // + `claimed_amount` 2 B)" — i.e. an unsigned 2-byte domain, 0..65535. The REAL scale actually used
  // in shipped code is far smaller: `promotion-lock.service.ts`'s `SEVERANCE_WEIGHT` table (the only
  // non-`_test` producer) is `{LOW:5, MEDIUM:10, HIGH:20, RUINOUS:40}`, times at most
  // `metaProgressionTunables.promotionLockReversalCostMultiplier` (default 3, range 1..10) ⇒ a
  // measured maximum of 400. Every E2E fixture (`reputation_restraint_index.spec.ts`,
  // `promotion_lock_recall.spec.ts`) stays in the 5..100 range. The default below sits ~25× above the
  // highest MEASURED legitimate value, comfortably inside the canon 2-byte ceiling.

  /**
   * `reputation.restraint_claim_amount_min` — [PROPOSED DEFAULT][PROV-Y26Q2].
   * Lower clamp bound for `recordDisputeOutcome`'s caller-supplied `claimable`/`claimed` (both use
   * the SAME bound — they are the same magnitude domain, an amount extracted from a dispute).
   * Default 0 — `claimable=0` is an already-supported degenerate case (`recordDisputeOutcome`'s own
   * caller, `runWeeklyTick`, treats Σclaimable=0 as restraint_ratio=0, not an error). Negative has no
   * meaning in this domain. Range 0..50 (reviewer-set at gate).
   * Env-override: REPUTATION_RESTRAINT_CLAIM_AMOUNT_MIN (test-only).
   */
  get restraintClaimAmountMin(): number {
    return TunablesStore.resolveInt(
      'reputation.restraint_claim_amount_min',
      'REPUTATION_RESTRAINT_CLAIM_AMOUNT_MIN',
      0,
    );
  },

  /**
   * `reputation.restraint_claim_amount_max` — [PROPOSED DEFAULT][PROV-Y26Q2].
   * Upper clamp bound for `recordDisputeOutcome`'s caller-supplied `claimable`/`claimed`.
   * Default 10_000 — see the anchor note above this block: ~25× the highest MEASURED legitimate
   * value (400, `SEVERANCE_WEIGHT.RUINOUS × max reversal multiplier`), safely under the canon 2-byte
   * structural ceiling (65535). Range 1_000..65_535 (reviewer-set at gate; the range TOP is the canon
   * 2-byte domain itself — the tunable cannot be raised past what the schema's own byte-budget means).
   * Env-override: REPUTATION_RESTRAINT_CLAIM_AMOUNT_MAX (test-only).
   */
  get restraintClaimAmountMax(): number {
    return TunablesStore.resolveInt(
      'reputation.restraint_claim_amount_max',
      'REPUTATION_RESTRAINT_CLAIM_AMOUNT_MAX',
      10_000,
    );
  },

  // ── 3.3 Lek Memory — 4 keys consumed by R5a (bind/record + decay tick) ─────────────────────────
  //
  // All 4 keys REUSE existing gdd/14 entries at lines 962-965 (no re-add required — R9.3).
  //
  // Canon §3.3 (:140-144): tunables are spelled in the tech-doc as:
  //   `reputation.lek_memory_lambda_position_weight`  (tech-doc name)
  //   `reputation.lek_memory_tau_half_life_days`      (tech-doc name)
  //   `reputation.lek_memory_inheritance_slots`       (tech-doc name)
  //   `reputation.lek_memory_decay_rate_per_day`      (tech-doc name)
  // But gdd/14 lines 962-965 has the SHORT registry names:
  //   `lek_position_weight_lambda`, `lek_memory_halflife_days`,
  //   `lek_inheritance_slots`, `lek_memory_decay_per_day`
  // DD-REG-NAME: the code uses the SHORT gdd/14 names (the registry keys), not the tech-doc names.
  // REVIEWER FLAG: [LEK_TUNABLE_NAMES] — confirm the short keys are the canonical store keys.

  /**
   * `lek_position_weight_lambda` (λ) — base inheritance weight for position memory.
   * Canon :141: "reputation.lek_memory_lambda_position_weight default 0.35".
   * Used in: effective_trust = personal_baseline · (1 − λ_now) + position_memory_aggregate · λ_now.
   * Initial value when first operator binds a cell (λ_now = λ on first bind).
   * Default 0.35, range 0.10..0.60 (gdd/14:962).
   * REUSE — not re-added to gdd/14 (pre-existing at L962).
   * Env-override: LEK_POSITION_WEIGHT_LAMBDA (test-only).
   */
  get lekPositionWeightLambda(): number {
    return TunablesStore.resolveFloat(
      'lek_position_weight_lambda',
      'LEK_POSITION_WEIGHT_LAMBDA',
      0.35,
    );
  },

  /**
   * `lek_memory_halflife_days` (τ) — memory half-life in in-game days.
   * Canon :142: "reputation.lek_memory_tau_half_life_days default 28".
   * Used in: λ_now = λ · exp(−Δt / τ_memory). With τ=28 days, the weekly decay factor is
   *   exp(−7 / 28) = exp(−0.25) ≈ 0.7788 per week.
   * Default 28, range 7..90 (gdd/14:963).
   * REUSE — not re-added to gdd/14 (pre-existing at L963).
   * Env-override: LEK_MEMORY_HALFLIFE_DAYS (test-only).
   */
  get lekMemoryHalflifeDays(): number {
    return TunablesStore.resolveFloat(
      'lek_memory_halflife_days',
      'LEK_MEMORY_HALFLIFE_DAYS',
      28,
    );
  },

  /**
   * `lek_inheritance_slots` — FIFO depth for trailing operators (and fairness signatures).
   * Canon :143: "reputation.lek_memory_inheritance_slots default 4".
   * Used in: bindOperator() FIFO eviction bound + recordDealFairness() nibble FIFO bound.
   * Default 4, range 2..8 (gdd/14:964).
   * REUSE — not re-added to gdd/14 (pre-existing at L964).
   * Env-override: LEK_INHERITANCE_SLOTS (test-only).
   */
  get lekInheritanceSlots(): number {
    return TunablesStore.resolveInt(
      'lek_inheritance_slots',
      'LEK_INHERITANCE_SLOTS',
      4,
    );
  },

  /**
   * `lek_memory_decay_per_day` — alternative per-day decay coefficient (supplemental to τ half-life).
   * Canon :144: "reputation.lek_memory_decay_rate_per_day default 0.012".
   * The weekly decay tick uses the τ half-life formula (exp(−7/τ)) as the primary decay.
   * This coefficient is the registry anchor for future fine-grained decay applications.
   * Default 0.012, range 0.004..0.05 (gdd/14:965).
   * REUSE — not re-added to gdd/14 (pre-existing at L965).
   * Env-override: LEK_MEMORY_DECAY_PER_DAY (test-only).
   */
  get lekMemoryDecayPerDay(): number {
    return TunablesStore.resolveFloat(
      'lek_memory_decay_per_day',
      'LEK_MEMORY_DECAY_PER_DAY',
      0.012,
    );
  },

  // ── 3.3 Lek Memory / D1b contract — 2 NEW tunables added by R5b ─────────────────────────────
  //
  // The canon (:136) gives the DIRECTION "stack multiplicatively" but no bound on the hostility
  // factor magnitudes. These are NEW registry keys (not in gdd/14 pre-R5b) — added to gdd/14 §Reputation
  // by this commit (R9.3 propagation — same-commit as R5b implementation).
  //
  // DESIGN DECISION: hostility factors REDUCE the effective aggregate (hostile district → lower trust).
  //   NONE   = ×1.0 (zero-regression identity — not a knob).
  //   MILD   = × lek_haze_hostility_mild   (default 0.85 — mild structural hostility, 15% reduction).
  //   SEVERE = × lek_haze_hostility_severe (default 0.70 — severe structural hostility, 30% reduction).
  // Constraint: lek_haze_hostility_severe < lek_haze_hostility_mild < 1.0 (monotonically more hostile).
  //
  // DD-REG-NAME: code consumes the namespaced store key `reputation.lek_haze_hostility_*`.
  // REVIEWER FLAG: [LEK_HAZE_HOSTILITY_NEW_TUNABLES] — NEW in gdd/14 at D2 R5b.
  //   Proposed defaults 0.85 / 0.70 (moderate/strong hostility; reviewer must confirm).
  //   The severe threshold (×0.70) corresponds to ≥10% k_damage → structural neighbourhood hostility
  //   is a meaningful gameplay signal (leks in heavily-damaged districts become harder to operate).

  /**
   * `reputation.lek_haze_hostility_mild` — multiplicative hostility factor for MILD damage bucket.
   * Applied when `district_capacity_damage_bucket = 'MILD'` (D1b §3.3 emission contract).
   * The MILD bucket = 0 < damageFraction < 0.10 (subtle structural hostility).
   *
   * [PROPOSED DEFAULT][PROV-Y26Q2]: 0.85 (15% aggregate reduction under mild structural damage).
   * Range: 0.60..0.99 (reviewer-set at gate; must be < 1.0 so MILD is always more hostile than NONE).
   * NOT in gdd/14 pre-R5b — NEW registry key added by this commit (R9.3 propagation).
   * REVIEWER FLAG: [LEK_HAZE_HOSTILITY_NEW_TUNABLES] — NEW tunable, confirm default + range.
   *
   * Constraint: lekHazeHostilityMild > lekHazeHostilitySevere (mild < severe hostility).
   * DD-REG-NAME: store key is `reputation.lek_haze_hostility_mild` (no inline 0.85 in formula code).
   * Env-override: REPUTATION_LEK_HAZE_HOSTILITY_MILD (test-only).
   */
  get lekHazeHostilityMild(): number {
    return TunablesStore.resolveFloat(
      'reputation.lek_haze_hostility_mild',
      'REPUTATION_LEK_HAZE_HOSTILITY_MILD',
      0.85,
    );
  },

  /**
   * `reputation.lek_haze_hostility_severe` — multiplicative hostility factor for SEVERE damage bucket.
   * Applied when `district_capacity_damage_bucket = 'SEVERE'` (D1b §3.3 emission contract).
   * The SEVERE bucket = damageFraction ≥ 0.10 (strong structural hostility).
   *
   * [PROPOSED DEFAULT][PROV-Y26Q2]: 0.70 (30% aggregate reduction under severe structural damage).
   * Range: 0.40..0.95 (reviewer-set at gate; must be < lekHazeHostilityMild to be more hostile).
   * NOT in gdd/14 pre-R5b — NEW registry key added by this commit (R9.3 propagation).
   * REVIEWER FLAG: [LEK_HAZE_HOSTILITY_NEW_TUNABLES] — NEW tunable, confirm default + range.
   *
   * Constraint: lekHazeHostilitySevere < lekHazeHostilityMild (severe > mild hostility).
   * DD-REG-NAME: store key is `reputation.lek_haze_hostility_severe` (no inline 0.70 in formula code).
   * Env-override: REPUTATION_LEK_HAZE_HOSTILITY_SEVERE (test-only).
   */
  get lekHazeHostilitySevere(): number {
    return TunablesStore.resolveFloat(
      'reputation.lek_haze_hostility_severe',
      'REPUTATION_LEK_HAZE_HOSTILITY_SEVERE',
      0.70,
    );
  },

  // ── 3.4 Hidden Curriculum — 4 keys consumed by R7a (weekly review tick) ─────────────────────────
  //
  // All 4 keys REUSE existing gdd/14 entries at lines 969-972 (no re-add required — R9.3).
  //
  // Canon §3.4 (:182-188): tunables are spelled in the tech-doc as:
  //   `reputation.hidden_curriculum_observation_window_days`  (tech-doc name)
  //   `reputation.hidden_curriculum_flip_on_threshold`        (tech-doc name)
  //   `reputation.hidden_curriculum_flip_off_threshold`       (tech-doc name)
  //   `reputation.hidden_curriculum_witnessed_event_buffer_size` (tech-doc name)
  // But gdd/14 lines 969-972 has the SHORT registry names:
  //   `curriculum_observation_window_days`, `curriculum_flip_on_threshold`,
  //   `curriculum_flip_off_threshold`, `curriculum_witnessed_event_buffer`
  // DD-REG-NAME: the code uses the SHORT gdd/14 names (the registry keys), not the tech-doc names.

  /**
   * `curriculum_flip_on_threshold` — ratio threshold above which a norm flag flips ON.
   * Canon `:165`: "if ratio > 0.60: flag ← ON".
   * Used in: if (ratio > curriculum_flip_on_threshold) → flag ON.
   * Default 0.60, range 0.50..0.80 (gdd/14:970).
   * REUSE — not re-added to gdd/14 (pre-existing at L970).
   * Env-override: REPUTATION_CURRICULUM_FLIP_ON_THRESHOLD (test-only).
   */
  get curriculumFlipOnThreshold(): number {
    return TunablesStore.resolveFloat(
      'curriculum_flip_on_threshold',
      'REPUTATION_CURRICULUM_FLIP_ON_THRESHOLD',
      0.60,
    );
  },

  /**
   * `curriculum_flip_off_threshold` — ratio threshold below which a norm flag flips OFF.
   * Canon `:166`: "if ratio < 0.30: flag ← OFF".
   * Used in: if (ratio < curriculum_flip_off_threshold) → flag OFF.
   * Default 0.30, range 0.10..0.45 (gdd/14:971).
   * REUSE — not re-added to gdd/14 (pre-existing at L971).
   * Env-override: REPUTATION_CURRICULUM_FLIP_OFF_THRESHOLD (test-only).
   */
  get curriculumFlipOffThreshold(): number {
    return TunablesStore.resolveFloat(
      'curriculum_flip_off_threshold',
      'REPUTATION_CURRICULUM_FLIP_OFF_THRESHOLD',
      0.30,
    );
  },

  /**
   * `curriculum_observation_window_days` — observation window in days (informational, not yet
   * used in the flip logic — the witnessed_event_ring IS the window; this tunable governs future
   * time-based windowing). Default 30, range 7..90 (gdd/14:969).
   * REUSE — not re-added to gdd/14 (pre-existing at L969).
   * Env-override: REPUTATION_CURRICULUM_OBSERVATION_WINDOW_DAYS (test-only).
   */
  get curriculumObservationWindowDays(): number {
    return TunablesStore.resolveInt(
      'curriculum_observation_window_days',
      'REPUTATION_CURRICULUM_OBSERVATION_WINDOW_DAYS',
      30,
    );
  },

  /**
   * `curriculum_witnessed_event_buffer` — FIFO ring capacity (number of witnessed event slots).
   * Canon `:160`: "last 16 events as 2-bit type codes". 16 = default buffer size.
   * Used in: witnessed_event_ring FIFO eviction when ring is full.
   * Default 16, range 8..32 (gdd/14:972).
   * REUSE — not re-added to gdd/14 (pre-existing at L972).
   * Env-override: REPUTATION_CURRICULUM_WITNESSED_EVENT_BUFFER (test-only).
   */
  get curriculumWitnessedEventBuffer(): number {
    return TunablesStore.resolveInt(
      'curriculum_witnessed_event_buffer',
      'REPUTATION_CURRICULUM_WITNESSED_EVENT_BUFFER',
      16,
    );
  },

  // ── 3.3 Lek↔lieutenant performance — 1 NEW tunable added by R6 ─────────────────────────────────
  //
  // Canon :135: "lieutenant inheriting a strong corner outperforms baseline; on stigmatised corner
  // underperforms". The canon gives the DIRECTION but not the MAGNITUDE of the performance deviation.
  // This tunable controls the sensitivity of the multiplier to the aggregate_fraction deviation from
  // neutral (NEUTRAL_FRACTION = 8/15). It is NEW in gdd/14 (not pre-existing) — registry-add R6.
  //
  // Multiplier formula:
  //   multiplier = clamp(1.0 + strength × (aggregate_fraction − NEUTRAL_FRACTION) / NEUTRAL_FRACTION, 0.5, 2.0)
  // where NEUTRAL_FRACTION = 8/15 ≈ 0.5333 (= NEUTRAL_NIBBLE / NIBBLE_MAX from lek-memory.service.ts).
  // 1.0-neutral invariant: aggregate_fraction = NEUTRAL_FRACTION → multiplier = 1.0 EXACTLY (no-Lek case).
  //
  // REVIEWER FLAG: [LEK_LIEUTENANT_PERF_STRENGTH_NEW_TUNABLE] — NEW in gdd/14 at D2 R6.
  //   Proposed default 0.30 (±30% max deviation at the aggregate extremes — mild but significant).
  //   At strength=0.30: strong tile (high nibble 14/15, fraction ≈ 0.933) → multiplier ≈ 1.225 (+22.5%).
  //                     stigmatized tile (low nibble 1/15, fraction ≈ 0.067) → multiplier ≈ 0.738 (−26.2%).
  //   The reviewer must confirm the proposed default + range.

  /**
   * `reputation.lek_lieutenant_perf_strength` — sensitivity of the Lek↔lieutenant performance
   * multiplier to aggregate_fraction deviation from neutral (NEUTRAL_FRACTION = 8/15).
   *
   * Used in: multiplier = clamp(1.0 + strength × (aggregate_fraction − NEUTRAL_FRACTION) / NEUTRAL_FRACTION, 0.5, 2.0)
   * A strong corner (fraction > NEUTRAL) → multiplier > 1 → over-performs.
   * A stigmatized corner (fraction < NEUTRAL) → multiplier < 1 → under-performs.
   * fraction = NEUTRAL_FRACTION → multiplier = 1.0 EXACTLY (zero-regression identity for no-Lek tiles).
   *
   * [PROPOSED DEFAULT][PROV-Y26Q2]: 0.30 (±~25% max performance deviation at aggregate extremes).
   * Range: 0.05..0.80 (reviewer-set at gate; upper bound avoids pathological ×2 on moderate aggregate).
   * NOT in gdd/14 pre-R6 — NEW registry key added by this commit (R9.3 propagation).
   * REVIEWER FLAG: [LEK_LIEUTENANT_PERF_STRENGTH_NEW_TUNABLE] — NEW tunable, confirm default + range.
   *
   * The 1.0-neutral identity is NOT a knob (NEUTRAL_FRACTION is a constant, not a tunable).
   * DD-REG-NAME: key is `reputation.lek_lieutenant_perf_strength` (no inline 0.30 in formula code).
   * Env-override: REPUTATION_LEK_LIEUTENANT_PERF_STRENGTH (test-only).
   */
  get lekLieutenantPerfStrength(): number {
    return TunablesStore.resolveFloat(
      'reputation.lek_lieutenant_perf_strength',
      'REPUTATION_LEK_LIEUTENANT_PERF_STRENGTH',
      0.30,
    );
  },

  // ── 3.5 Forbidden-Triad Detection — 2 keys consumed by R8a ──────────────────────────────────
  //
  // `triad_strong_tie_threshold` REUSE (pre-existing gdd/14 L975 — no re-add required, R9.3).
  // `reputation.forbidden_triad_n_strong_cap` NEW — registry-FIRST (DD-REG-NAME, gdd/14 D2-R8a add).
  //
  // Canon §3.5 (:194, :220-225): tunables are:
  //   `reputation.forbidden_triad_strong_tie_threshold_interactions_per_quarter` (tech-doc name)
  //   `reputation.forbidden_triad_n_strong_cap` (tech-doc name)
  // But gdd/14 L975 has the SHORT registry name `triad_strong_tie_threshold`.
  // DD-REG-NAME: the code uses the SHORT gdd/14 name for `triad_strong_tie_threshold` (the registry key).
  // REVIEWER FLAG: [TRIAD_TUNABLE_NAMES] — confirm the short key is the canonical store key.

  /**
   * `triad_strong_tie_threshold` — minimum interactions/quarter for a contact to be "strong-tied".
   * Canon :194: "≥ 12 interactions per quarter" qualifies strong-tied.
   * Canon :223: `reputation.forbidden_triad_strong_tie_threshold_interactions_per_quarter` default 12.
   * gdd/14 L975 SHORT key: `triad_strong_tie_threshold`.
   * Used in: updateStrongTieMembership() — promote iff interactionsCount >= this value.
   * Default 12 (interactions/quarter), range 6..24 (gdd/14:975).
   * REUSE — not re-added to gdd/14 (pre-existing at L975).
   * Env-override: TRIAD_STRONG_TIE_THRESHOLD (test-only).
   */
  get triadStrongTieThreshold(): number {
    return TunablesStore.resolveInt(
      'triad_strong_tie_threshold',
      'TRIAD_STRONG_TIE_THRESHOLD',
      12,
    );
  },

  /**
   * `reputation.forbidden_triad_n_strong_cap` — hard cap on the strong-tied set size per player.
   * Canon :194: "System caps player's strong-tied set at N_strong = 12 (oldest entry evicts when
   *   13th qualifies). Hard cap because mechanic is quadratic: N=12 → 66 pairs; N=30 → 435 pairs."
   * Canon :224: range `8..18`.
   * Used in: updateStrongTieMembership() — evict the oldest contact when the 13th qualifies.
   * Also the bound for the quadratic pair-state count: max_pairs = N_strong × (N_strong-1) / 2.
   *
   * [PROPOSED DEFAULT][PROV-Y26Q2]: 12 (the canon quadratic hard-cap :194).
   * Range: 8..18 (per canon :224).
   * NOT in gdd/14 pre-R8a — NEW registry key added by this commit (R9.3 propagation — DD-REG-NAME).
   * REVIEWER FLAG: [TRIAD_N_STRONG_CAP_NEW_TUNABLE] — the 21st missing key (DD-REG-NAME confirmed by R0).
   *   Proposed default 12 (the canon hard-cap). The reviewer must confirm the proposed default + range.
   *
   * DD-REG-NAME: store key is `reputation.forbidden_triad_n_strong_cap` (no inline 12 in the service).
   * Env-override: REPUTATION_FORBIDDEN_TRIAD_N_STRONG_CAP (test-only).
   */
  get forbiddenTriadNStrongCap(): number {
    return TunablesStore.resolveInt(
      'reputation.forbidden_triad_n_strong_cap',
      'REPUTATION_FORBIDDEN_TRIAD_N_STRONG_CAP',
      12,
    );
  },

  // ── 3.5 Forbidden-Triad Detection — 3 keys consumed by R8b ──────────────────────────────────
  //
  // All 3 are REUSE from the registry (gdd/14 + reputation_mechanics.md §3.5 tunables table).
  // Short registry names come from design spec table §5.1:
  //   `triad_H_observer_weeks`, `triad_observer_attention_share`, `triad_pressure_decay_acknowledged_weekly`.
  // Canon long names (reputation_mechanics.md:222-225):
  //   `reputation.forbidden_triad_h_observer_weeks_disjoint_strong`  → short: `triad_H_observer_weeks`
  //   `reputation.forbidden_triad_observer_attention_share`           → short: `triad_observer_attention_share`
  //   `reputation.forbidden_triad_pressure_decay_on_acknowledged_meeting_per_week` → short: `triad_pressure_decay_acknowledged_weekly`
  //
  // DD-REG-NAME: the code uses the SHORT design-spec registry names (matching gdd/14 D2-R8b add).
  // NO inline numeric literals for these values in the service.

  /**
   * `triad_H_observer_weeks` — H_observer threshold: after how many Δ accumulations (weeks)
   * of UNMET pressure the designated observer NPC flips its interest_flag.
   *
   * Canon :206: "If anomaly_pressure_bucket ≥ H_observer, observer NPC flips interest_flag".
   * Canon :220: `reputation.forbidden_triad_h_observer_weeks_disjoint_strong` default `14`, range `6..32`.
   * Design spec §5.1 short key: `triad_H_observer_weeks`.
   *
   * Used in: ForbiddenTriadDetectionService.evaluatePairs() — flip condition.
   * Default 14 (weeks of UNMET pressure accumulation before observer notices), range 6..32.
   * Env-override: TRIAD_H_OBSERVER_WEEKS (test-only — allows accelerated testing without 117 ticks).
   */
  get triadHObserverWeeks(): number {
    return TunablesStore.resolveFloat(
      'triad_H_observer_weeks',
      'TRIAD_H_OBSERVER_WEEKS',
      14,
    );
  },

  /**
   * `triad_observer_attention_share` — Δ per week: the anomaly_pressure increment added each
   * weekly tick for an UNMET pair. Acts as the accrual rate toward H_observer.
   *
   * Canon :203: `anomaly_pressure_bucket ← anomaly_pressure_bucket + Δ_per_week`.
   * Canon :225: `reputation.forbidden_triad_observer_attention_share` default `0.12`, range `0.04..0.30`.
   * Design spec §5.1 short key: `triad_observer_attention_share`.
   *
   * Used in: ForbiddenTriadDetectionService.evaluatePairs() — accrual per week for UNMET pairs.
   * Default 0.12 (fraction of attention), range 0.04..0.30.
   * Env-override: TRIAD_OBSERVER_ATTENTION_SHARE (test-only — e.g. 2.0 to reach H_observer in 7 ticks).
   */
  get triadObserverAttentionShare(): number {
    return TunablesStore.resolveFloat(
      'triad_observer_attention_share',
      'TRIAD_OBSERVER_ATTENTION_SHARE',
      0.12,
    );
  },

  /**
   * `triad_pressure_decay_acknowledged_weekly` — decay on acknowledged meeting: the fraction by
   * which anomaly_pressure is reduced when the player introduces the pair (dissolve action).
   *
   * Canon :222: `reputation.forbidden_triad_pressure_decay_on_acknowledged_meeting_per_week` default `0.06`, range `0.02..0.20`.
   * Design spec §5.1 short key: `triad_pressure_decay_acknowledged_weekly`.
   *
   * Used in: ForbiddenTriadDetectionService.introducePair() — pressure decay on introduction.
   * Default 0.06 (6% decay per acknowledged meeting), range 0.02..0.20.
   * Env-override: TRIAD_PRESSURE_DECAY_ACKNOWLEDGED_WEEKLY (test-only).
   */
  get triadPressureDecayAcknowledgedWeekly(): number {
    return TunablesStore.resolveFloat(
      'triad_pressure_decay_acknowledged_weekly',
      'TRIAD_PRESSURE_DECAY_ACKNOWLEDGED_WEEKLY',
      0.06,
    );
  },

  // ── 3.1 Boss Mirror / Recruitment Polling — 1 NEW tunable added by R10 ──────────────────────
  //
  // Canon :65: consistency_index ∈ [0, 1]. The neutral/low bucket boundary was inlined as the
  // structural constant 0.75 in the original R10 implementation. The reviewer (Gate-B iv) required
  // this to be a registry tunable — de-inlined here.
  //
  // [PROPOSED DEFAULT][PROV-Y26Q2]: 0.75 (natural midpoint on [0,1]; index ≥ threshold → 'neutral',
  //   index < threshold → 'low'). Range 0.50..0.90 (reviewer-set at gate).
  // NOT in gdd/14 pre-R10 — NEW registry key added by this commit (R9.3 propagation — DD-REG-NAME).
  //
  // DD-REG-NAME: store key is `reputation.recruitment_consistency_neutral_threshold`
  //   (no inline 0.75 remains in lieutenant.service.ts after this de-inline commit).
  // Env-override: REPUTATION_RECRUITMENT_CONSISTENCY_NEUTRAL_THRESHOLD (test-only).
  // REVIEWER FLAG: [R10_BUCKET_THRESHOLD] — confirmed by reviewer as IMPORTANT (Gate-B iv).
  //   Proposed default 0.75 (the canon structural midpoint; reviewer must confirm).

  // ── 3.1 Boss Mirror / Divergence Salience — 1 NEW tunable added by R11 ─────────────────────────
  //
  // The divergence cue (R11 `:180`) compares declared rules vs absorbed norms per lieutenant.
  // Each declared ruleId that equals one of the 8 canonical norm names "commits to" that norm;
  // if that norm is absorbed OFF → that is one diverging norm.
  //
  // The divergence_salience_min_norms tunable controls the minimum number of diverging declared
  // norms required before the cue shifts from 'aligned' to 'diverging'.
  //
  // Decision (R11): a threshold IS needed here because:
  //   (a) The R10 lesson requires any contemplated cutoff to be registry-flagged.
  //   (b) The canonical formula requires a salience gate (some minor discrepancies may be noise;
  //       the design `:180` says divergence is observable "publicly" as a legibility signal —
  //       implying at least 1 diverging norm is sufficient, but the threshold keeps it extensible).
  //   (c) default = 1 (any divergence = salient); range = 1..4 (max = cap on declared rules).
  //
  // [PROPOSED DEFAULT][PROV-Y26Q2]: 1 (any declared rule contradicted by absorbed norm = salient).
  // Range: 1..4 (reviewer-set at gate; max 4 = boss_mirror_max_public_rules default cap).
  // NOT in gdd/14 pre-R11 — NEW registry key added by this commit (R9.3 propagation).
  // REVIEWER FLAG: [R11_DIVERGENCE_SALIENCE_THRESHOLD] — NEW tunable, confirm default + range.
  //
  // DD-REG-NAME: key is `reputation.divergence_salience_min_norms`
  //   (no inline 1 in the divergence-cue logic).
  // Env-override: REPUTATION_DIVERGENCE_SALIENCE_MIN_NORMS (test-only).

  /**
   * `reputation.divergence_salience_min_norms` — minimum count of diverging declared norms
   * required for the divergence cue to shift from 'aligned' to 'diverging'.
   *
   * divergence_count ≥ threshold → cue = 'diverging'; < threshold → cue = 'aligned'.
   * No declared rules at all → cue = 'indeterminate' (threshold not consulted).
   *
   * [PROPOSED DEFAULT][PROV-Y26Q2]: 1 (any norm divergence is salient — matches the canon :180
   *   premise that divergence is "observable publicly" as soon as it exists).
   * Range: 1..4 (reviewer-set at gate; upper bound = default declared-rule cap).
   * NOT in gdd/14 pre-R11 — NEW registry key added by this commit (R9.3 propagation).
   * REVIEWER FLAG: [R11_DIVERGENCE_SALIENCE_THRESHOLD] — NEW tunable, confirm default + range.
   *
   * DD-REG-NAME: store key is `reputation.divergence_salience_min_norms`.
   * Env-override: REPUTATION_DIVERGENCE_SALIENCE_MIN_NORMS (test-only).
   */
  get divergenceSalienceMinNorms(): number {
    return TunablesStore.resolveInt(
      'reputation.divergence_salience_min_norms',
      'REPUTATION_DIVERGENCE_SALIENCE_MIN_NORMS',
      1,
    );
  },

  /**
   * `reputation.recruitment_consistency_neutral_threshold` — cutpoint separating 'neutral' from 'low'
   * consistency buckets in the R10 candidate-polling gate (gate A, canon :65).
   *
   * consistency_index ≥ threshold → 'neutral'; consistency_index < threshold → 'low'.
   * Empty world (no ledger row) → neutral (zero-regression invariant, unaffected by threshold value).
   *
   * [PROPOSED DEFAULT][PROV-Y26Q2]: 0.75 (natural midpoint on [0,1]).
   * Range: 0.50..0.90 (reviewer-set at gate; must be > 0.50 so 'low' is meaningfully below neutral).
   * NOT in gdd/14 pre-R10 — NEW registry key added by this commit (R9.3 propagation).
   * REVIEWER FLAG: [R10_BUCKET_THRESHOLD] — de-inline required by gate-B(iv). Confirm default + range.
   *
   * DD-REG-NAME: store key is `reputation.recruitment_consistency_neutral_threshold`.
   * Env-override: REPUTATION_RECRUITMENT_CONSISTENCY_NEUTRAL_THRESHOLD (test-only).
   */
  get recruitmentConsistencyNeutralThreshold(): number {
    return TunablesStore.resolveFloat(
      'reputation.recruitment_consistency_neutral_threshold',
      'REPUTATION_RECRUITMENT_CONSISTENCY_NEUTRAL_THRESHOLD',
      0.75,
    );
  },
};
