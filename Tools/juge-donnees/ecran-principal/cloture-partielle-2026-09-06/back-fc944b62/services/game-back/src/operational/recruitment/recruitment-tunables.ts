// IMPLEMENTS: docs/superpowers/plans/2026-07-11-04f-B-recruitment-plan.md C1 (R2.3 — registry-first
//             `recruitment.*` keys + getters)
//             Design: docs/superpowers/specs/2026-07-11-04f-B-recruitment-design.md §12 (Tunables) + §3
//             (data model — the R2.2 civilian_loyalty_starting_bucket getter these buckets seed, C3+)
//             Decisions: docs/superpowers/specs/2026-07-11-04f-B-recruitment-decisions.md D6 (the 0.85 ->
//             seeded R2.2 migration) / D9 (defector_vetting_cost_cents REUSE) / §4 divergence items 1/7
//             Registry: projects/mafia_city_game/gdd/14_tunable_constants.md §Recruitment (04f) (14 NEW
//             rows registered SAME commit, R2.3 registry-FIRST — appended to the EXISTING §Recruitment
//             section that already carries `defector_vetting_cost_cents`)
//             Pattern: mirrors services/game-back/src/operational/maintenance/maintenance-tunables.ts
//             (CAPS map + clamp function + frozen getter object — the "register ALL keys at the
//             registry-first chunk even though most are unconsumed until later chunks" precedent; C1 is a
//             pure data-model + tunables chunk, the quest machine / mapper / availability tick / defector
//             + civilian depth consumers land C2-C6).
//             — 04f-B C1 — 2026-07-11
//
// `recruitment-tunables.ts` — registry-mirrored getters for the `recruitment.*` keys 04f-B needs (R2.3:
// NO inline numeric balance/config anywhere downstream — every default below is verbatim from gdd/14
// §Recruitment, itself verbatim from the tech doc's own registry table, modulo the 2 honest
// `[PROV-Y26Q2]` additions design §12 names). If a registry value ever changes, update gdd/14 + this file
// in the SAME commit (R9.3).
//
// ★ Count note (surfaced honestly, not silently resolved — see the C1 handoff report to the controller):
// design §12 opens with a "NEW (12 keys)" header but its OWN enumerated list is 12 canon-sourced keys
// PLUS 2 further `[PROV-Y26Q2]` additions it explicitly mandates registering (`candidate_expiry_game_
// days` + the hire-cost base key) — i.e. 14 NEW keys, not 12. The plan's headline ("13 getters: 12 NEW +
// 1 REUSE") undercounts the same 2 PROV additions. This file implements design §12's actual enumerated
// CONTENT in full (14 NEW + 1 REUSE = 15 getters) rather than truncating to the headline label — a
// registry that silently dropped 2 of its own [PROV-Y26Q2]-mandated keys would be the R2.3 violation, not
// this getter count.
//
// ★ `recruitment.defector_vetting_cost_cents` is NOT re-registered here as a NEW row (D9, decisions §0/
// §4 item 1) — it is ALREADY registered (`14_tunable_constants.md:1787`, backport 2026-05-25, value
// 1500000, range 500000..3000000). This file's `defectorVettingCostCents` getter is simply the FIRST CODE
// READER of that already-registered key — no gdd/14 edit accompanies it.
//
// ★ R2.2 (server-only / never player-projected): `defectorDoubleAgentProbabilityBase`,
// `defectorVettingDoubleAgentDetectionProbabilityPerSession` — raw probabilities never reach a player
// response (D6/D9 grep-zero contract; C5's floor asserts this on the wire).
//
// ★ Closed-domain validation (the ONE composite key that needs it at C1): `civilianLoyaltyStartingBucket`
// is the D6 R2.2 migration target for the canon GDD §2.8 scalar `civilian_loyalty_starting_value: 0.85` —
// an out-of-domain DB override here would silently break the bucket contract with no consumer yet built
// (C3) to catch it, so THIS getter validates against the real 4-member `LoyaltySeedBucket` domain and
// clamps to the registered default on any miss (plan §C1 falsifiable floor: "an out-of-domain
// civilian_loyalty_starting_bucket override is clamped/rejected"). The other 2 composite band keys
// (`civilianAffinityThresholdForCandidacy` / `maladaptiveMemoryInheritanceStrengthPerDefectorOriginConflict`)
// are `composite:<band>` POINTER strings (the same convention as `political_events.
// epol11_bpd_memory_aggregate_trigger` / `liveops.aggression_score_bucket_thresholds` — free-form,
// dereferenced by a FUTURE consuming service, not validated here) — mirrors
// `maintenanceTunables.failureRepairHeatMagnitudeBand`'s own posture (plain resolveString; the domain
// check for THAT key lives in the CONSUMING service, `maintenance-heat.service.ts`, which does not exist
// yet for these two — C4/C5's job).

import { TunablesStore } from '../../config/tunables-store';

/** Min/max clamp range per key (mirrors `MaintenanceTunableRange`). */
export interface RecruitmentTunableRange {
  readonly min: number;
  readonly max: number;
}

/**
 * `RECRUITMENT_TUNABLE_CAPS` — the per-key allowed range for DB overrides, verbatim from the gdd/14 Range
 * column. Used internally by every NUMERIC getter below (defense-in-depth: the getter itself never
 * returns an out-of-bounds value even if a raw DB override was written out of range). The 3 composite
 * STRING keys (`civilian_loyalty_starting_bucket` / `civilian_affinity_threshold_for_candidacy` /
 * `maladaptive_memory_inheritance_strength_per_defector_origin_conflict`) are excluded — mirrors
 * `MAINTENANCE_TUNABLE_CAPS`'s own exclusion of `failure_repair_heat_magnitude_band`.
 */
export const RECRUITMENT_TUNABLE_CAPS: Record<string, RecruitmentTunableRange> = {
  // ── Quest-machine step counts (D2) ──────────────────────────────────────────────────────────────────
  'recruitment.saltline_quest_steps':                  { min: 3,      max: 7       },
  'recruitment.defector_quest_steps':                  { min: 4,      max: 8       },
  'recruitment.civilian_quest_steps':                  { min: 3,      max: 6       },
  // ── Session gate (D2 — the anti-one-click invariant) ────────────────────────────────────────────────
  'recruitment.quest_session_duration_in_game_hours':  { min: 6,      max: 24      },
  // ── Defector double-agent (D9 — server-only, R2.2) ──────────────────────────────────────────────────
  'recruitment.defector_double_agent_probability_base': { min: 0.01,  max: 0.10    },
  // ── Candidate pool sizing ────────────────────────────────────────────────────────────────────────────
  'recruitment.saltline_candidates_per_pool':          { min: 3,      max: 6       },
  // ── Vetting (D9) ─────────────────────────────────────────────────────────────────────────────────────
  'recruitment.defector_vetting_double_agent_detection_probability_per_session': { min: 0.2, max: 0.7 },
  'recruitment.defector_vetting_sessions':             { min: 1,      max: 4       },
  // ── Civilian courting ────────────────────────────────────────────────────────────────────────────────
  'recruitment.civilian_courting_sessions':            { min: 1,      max: 4       },
  // ── Candidate expiry ([PROV-Y26Q2] — design §12 addition 1) ─────────────────────────────────────────
  'recruitment.candidate_expiry_game_days':            { min: 7,      max: 30      },
  // ── Hire cost base ([PROV-Y26Q2] — design §12 addition 2) ───────────────────────────────────────────
  'recruitment.saltline_hire_cost_cents':              { min: 200000, max: 2000000 },
  // ── REUSE (already registered, gdd/14:1787 — this file's getter is the first code reader) ────────────
  'recruitment.defector_vetting_cost_cents':           { min: 500000, max: 3000000 },
};

/**
 * Clamp a numeric value to the registered range for the given key (mirrors
 * `clampMaintenanceTunableToRange`). Used internally by every numeric getter below. Returns the value
 * unchanged if no range is registered for the key.
 */
export function clampRecruitmentTunableToRange(key: string, value: number): number {
  const range = RECRUITMENT_TUNABLE_CAPS[key];
  if (!range) return value;
  return Math.min(range.max, Math.max(range.min, value));
}

/**
 * The real 4-member `LoyaltySeedBucket` domain (mirrors `loyaltySeedBucketPg.enumValues` — kept as a
 * plain literal array here rather than importing the Drizzle schema, so this tunables module stays
 * dependency-light like every other `*-tunables.ts` file; the E2E floor cross-checks this literal against
 * the LIVE pg_enum domain, so a drift between the two would fail the test, not silently pass).
 */
export const LOYALTY_SEED_BUCKET_DOMAIN = ['seeded', 'tested', 'tempered', 'fractured'] as const;

/**
 * Validate a resolved string against the closed `LoyaltySeedBucket` domain (defense-in-depth against a
 * bad DB override — the D6 R2.2 migration target has no consuming service yet at C1 to catch a garbage
 * value, so this getter validates inline; mirrors `maintenanceTunables`'s numeric CAPS clamp, but for a
 * closed STRING domain instead of a numeric range).
 */
function clampToLoyaltySeedBucketDomain(raw: string, fallback: string): string {
  return (LOYALTY_SEED_BUCKET_DOMAIN as readonly string[]).includes(raw) ? raw : fallback;
}

/** Registry-mirrored getters for all 15 `recruitment.*` keys (C1 — 14 NEW + 1 REUSE). */
export const recruitmentTunables = {

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // Quest-machine step counts (D2 — the tunable stretches the variable trial/courting middle phase)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** saltline_quest_steps — the Saltline pool's step count. Default 5, range 3..7. */
  get saltlineQuestSteps(): number {
    return clampRecruitmentTunableToRange('recruitment.saltline_quest_steps',
      TunablesStore.resolveInt('recruitment.saltline_quest_steps', 'RECRUITMENT_SALTLINE_QUEST_STEPS', 5));
  },
  /** defector_quest_steps — the Defector pool's step count. Default 6, range 4..8. */
  get defectorQuestSteps(): number {
    return clampRecruitmentTunableToRange('recruitment.defector_quest_steps',
      TunablesStore.resolveInt('recruitment.defector_quest_steps', 'RECRUITMENT_DEFECTOR_QUEST_STEPS', 6));
  },
  /** civilian_quest_steps — the Civilian pool's step count. Default 4, range 3..6. */
  get civilianQuestSteps(): number {
    return clampRecruitmentTunableToRange('recruitment.civilian_quest_steps',
      TunablesStore.resolveInt('recruitment.civilian_quest_steps', 'RECRUITMENT_CIVILIAN_QUEST_STEPS', 4));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // Session gate (D2 — the anti-one-click invariant; GAME time, never wall-clock)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** quest_session_duration_in_game_hours — the D2 session-gate window. Default 12, range 6..24. */
  get questSessionDurationInGameHours(): number {
    return clampRecruitmentTunableToRange('recruitment.quest_session_duration_in_game_hours',
      TunablesStore.resolveInt('recruitment.quest_session_duration_in_game_hours', 'RECRUITMENT_QUEST_SESSION_DURATION_IN_GAME_HOURS', 12));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // Candidate pool sizing
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** saltline_candidates_per_pool — the C4 tick tops the pool up to this. Default 4, range 3..6. */
  get saltlineCandidatesPerPool(): number {
    return clampRecruitmentTunableToRange('recruitment.saltline_candidates_per_pool',
      TunablesStore.resolveInt('recruitment.saltline_candidates_per_pool', 'RECRUITMENT_SALTLINE_CANDIDATES_PER_POOL', 4));
  },
  /** candidate_expiry_game_days — [PROV-Y26Q2] (design §12 addition 1): the C4 tick's candidate shelf-life; canon paces quests but never named a candidate expiry. Default 14, range 7..30. */
  get candidateExpiryGameDays(): number {
    return clampRecruitmentTunableToRange('recruitment.candidate_expiry_game_days',
      TunablesStore.resolveInt('recruitment.candidate_expiry_game_days', 'RECRUITMENT_CANDIDATE_EXPIRY_GAME_DAYS', 14));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // Loyalty seed composite (D6 — the R2.2 migration of the canon 0.85 scalar; closed-domain validated)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * civilian_loyalty_starting_bucket — the R2.2-migrated composite (D6): the canon
   * `civilian_loyalty_starting_value: 0.85` scalar maps to `'seeded'`, never a float key. Closed-domain
   * validated against the real 4-member `LoyaltySeedBucket` (`seeded|tested|tempered|fractured`) — an
   * out-of-domain override (or any garbage string) CLAMPS to the registered default `'seeded'`, never
   * passes through raw. Default `'seeded'`.
   */
  get civilianLoyaltyStartingBucket(): string {
    const raw = TunablesStore.resolveString(
      'recruitment.civilian_loyalty_starting_bucket', 'RECRUITMENT_CIVILIAN_LOYALTY_STARTING_BUCKET', 'seeded',
    );
    return clampToLoyaltySeedBucketDomain(raw, 'seeded');
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // Defector — double-agent + vetting (D9 — seeded-deterministic, server-only, R2.2)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** defector_double_agent_probability_base — the residual roll base (D9). SERVER-ONLY (R2.2 grep-zero). Default 0.03, range 0.01..0.10. */
  get defectorDoubleAgentProbabilityBase(): number {
    return clampRecruitmentTunableToRange('recruitment.defector_double_agent_probability_base',
      TunablesStore.resolveFloat('recruitment.defector_double_agent_probability_base', 'RECRUITMENT_DEFECTOR_DOUBLE_AGENT_PROBABILITY_BASE', 0.03));
  },
  /** defector_vetting_double_agent_detection_probability_per_session — the per-session detection roll (D9). SERVER-ONLY (R2.2). Default 0.4, range 0.2..0.7. */
  get defectorVettingDoubleAgentDetectionProbabilityPerSession(): number {
    return clampRecruitmentTunableToRange('recruitment.defector_vetting_double_agent_detection_probability_per_session',
      TunablesStore.resolveFloat('recruitment.defector_vetting_double_agent_detection_probability_per_session', 'RECRUITMENT_DEFECTOR_VETTING_DOUBLE_AGENT_DETECTION_PROBABILITY_PER_SESSION', 0.4));
  },
  /** defector_vetting_sessions — the max vetting session count (D9). Default 2, range 1..4. */
  get defectorVettingSessions(): number {
    return clampRecruitmentTunableToRange('recruitment.defector_vetting_sessions',
      TunablesStore.resolveInt('recruitment.defector_vetting_sessions', 'RECRUITMENT_DEFECTOR_VETTING_SESSIONS', 2));
  },
  /**
   * defector_vetting_cost_cents — REUSE (NOT re-registered — ALREADY at gdd/14:1787, backport
   * 2026-05-25). This getter is the FIRST code reader of the already-registered key. Default 1500000,
   * range 500000..3000000 (verbatim gdd/14).
   */
  get defectorVettingCostCents(): number {
    return clampRecruitmentTunableToRange('recruitment.defector_vetting_cost_cents',
      TunablesStore.resolveInt('recruitment.defector_vetting_cost_cents', 'RECRUITMENT_DEFECTOR_VETTING_COST_CENTS', 1500000));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // Civilian — affinity + courting
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * civilian_affinity_threshold_for_candidacy — [PROV-Y26Q2] (D7): the composite band the D7 derived
   * predicate's satisfaction threshold consumes (`composite:<band>` pointer convention — mirrors
   * `political_events.epol11_bpd_memory_aggregate_trigger` / `liveops.aggression_score_bucket_thresholds`;
   * dereferenced by the C4 predicate, not validated here — plain resolveString). Default
   * `'composite:affinity_high'`.
   */
  get civilianAffinityThresholdForCandidacy(): string {
    return TunablesStore.resolveString(
      'recruitment.civilian_affinity_threshold_for_candidacy', 'RECRUITMENT_CIVILIAN_AFFINITY_THRESHOLD_FOR_CANDIDACY', 'composite:affinity_high',
    );
  },
  /** civilian_courting_sessions — the courting-session count (design §5). Default 2, range 1..4. */
  get civilianCourtingSessions(): number {
    return clampRecruitmentTunableToRange('recruitment.civilian_courting_sessions',
      TunablesStore.resolveInt('recruitment.civilian_courting_sessions', 'RECRUITMENT_CIVILIAN_COURTING_SESSIONS', 2));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // Maladaptive inheritance (D10 — the band→settling-duration mapping)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * maladaptive_memory_inheritance_strength_per_defector_origin_conflict — the composite band→settling-
   * duration mapping (D10; `composite:<band>` pointer convention, same posture as
   * `civilianAffinityThresholdForCandidacy` above — dereferenced by C5's onboarding step, plain
   * resolveString). Default `'composite:strength_moderate'`.
   */
  get maladaptiveMemoryInheritanceStrengthPerDefectorOriginConflict(): string {
    return TunablesStore.resolveString(
      'recruitment.maladaptive_memory_inheritance_strength_per_defector_origin_conflict',
      'RECRUITMENT_MALADAPTIVE_MEMORY_INHERITANCE_STRENGTH_PER_DEFECTOR_ORIGIN_CONFLICT',
      'composite:strength_moderate',
    );
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // Hire cost base ([PROV-Y26Q2] — design §12 addition 2, "exact key split finalized at C1 registration")
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * saltline_hire_cost_cents — [PROV-Y26Q2] (D4): the ONE-TIME Saltline hire debit base (canon gives
   * salary BANDS but no base cents; design §12 names this exact key verbatim and defers the value to C1
   * registration). No existing "classic recruit" cost precedent exists in this codebase to derive from
   * (the classic `POST /v1/lieutenants` path is free) — this value is a fresh, order-of-magnitude-matched
   * placeholder against the already-registered `defector_vetting_cost_cents` (1,500,000 = a defector
   * vetting OPERATION cost; a Saltline HIRE is a smaller one-time ask). C3's `finalizeHire` multiplies
   * this base by the negotiated `salary_band` (LOW|FAIR|GENEROUS — D4). Defector's higher salary-band
   * floor (design §5 — "defectors demand more") is a forward C3/C5 consumption note, not a second
   * registered key here (design names only ONE concrete key; inventing a second `defector_hire_cost_cents`
   * key beyond what design enumerated would overshoot this chunk's registry-first scope). Default 500000,
   * range 200000..2000000.
   */
  get saltlineHireCostCents(): number {
    return clampRecruitmentTunableToRange('recruitment.saltline_hire_cost_cents',
      TunablesStore.resolveInt('recruitment.saltline_hire_cost_cents', 'RECRUITMENT_SALTLINE_HIRE_COST_CENTS', 500000));
  },
};
