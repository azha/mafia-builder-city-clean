// IMPLEMENTS: docs/superpowers/specs/2026-08-09-w1.1b-overlay-engine-design.md §4 chunk C3 (D3 + its
//             precondition I2).
//             Canon: docs/tech/08c_remaining_screens/screen_c8_first_time_tutorial.md §6/§11
//             (`TutorialIdEnum`, `:210-214` the 3 trigger classes, `:339,344` — `varchar(64)`
//             validated service-side, "jamais une valeur libre non-cataloguée").
//             Pattern (closed catalogue, `Record<K,V>` WITHOUT `default` — socle règle 7, "un
//             résolveur exhaustif sans default fait d'un membre d'enum SUPPLÉMENTAIRE une erreur de
//             compilation"): `meta_progression/task-category-catalogue.ts` (`TASK_CATEGORY_CATALOGUE`,
//             LIVE/RESERVED rows, `futureLot`/honest-ownership-note convention).
//             — W1.1-b C3 — 2026-08-09 —
//
//             W1.1-c C1 (docs/superpowers/specs/2026-08-09-w1.1c-disclosure-design.md §4 chunk C1,
//             D10/D11/D12) adds the SEVEN canon `ProgressiveDisclosureSchedule` slots' remaining SIX
//             ids (D2…D7 — D1 step 6's `tutorial.queue_runs_dry` was C5's own addition, above). Canon:
//             `docs/tech/11_onboarding/tutorial_system_architecture.md:144-151` names each slot by
//             DESCRIPTION only ("Cue Stack intro (copy-slot)", …) — no literal id is catalogued
//             anywhere in 08c for D2-D7, exactly the `tutorial.queue_runs_dry` situation C5 already
//             solved (CHOSEN here, at the SAME commit that wires each trigger, C1). Five enter
//             `eligible: true`; ONE — the D5 Audit Pin slot — enters `eligible: false` (D11: R-D —
//             see the row below for its current measured chain: LOT PLANQUE gave `safehouses` its
//             first application writer, so this is no longer a structural impossibility; it stays
//             `eligible: false` because the amount that chain seeds does not cross the deviation
//             threshold that would produce a pin, a measured fact, not a proof).
//
// `TutorialId` — the v1 CLOSED, LITERAL union (design D3). ⛔ The canon's TWO OPEN id families are NOT
// admitted here: `tutorial.exception_card.<category_key>` (`:212`) and `tutorial.pillar_threshold.
// <threshold_key>` (`:214`, `[PROV-TBD]` — canon's own words: "AUCUN mécanisme amont n'existe encore").
// A key derived at runtime from free text has no compile-time union — exactly the silent-`undefined`
// class D3 exists to abolish (its precondition I2). C3's original 5 ids — whose trigger substrate is
// of CLOSED form (w1.1-b design §0.6) — are:
//   - `tutorial.exception_card.onboarding_preseed` — NOT a member of the open category-key family
//     above; a single, closed id tied to the ONE guaranteed pre-seeded card (`0143:87-89`,
//     `candidate_actions[0].source = 'onboarding_preseed'`, `onboarding-grant.service.ts:145` —
//     `ONBOARDING_PRESEED_SOURCE`). Its substrate is a DB fact (a unique-indexed row), never a
//     derived category string.
//   - `tutorial.graduation` / `tutorial.compression_week` — literal canon ids (`:213`), substrate
//     MEASURED present (design §0.6: `graduation_events` / `compression_week` both exist — "2 sur 3").
//     Consumed by `OnboardingOverlayResolver.triggerSatisfied` (W1.1-b C5, LIVE —
//     onboarding-overlay.resolver.ts:102-105, `case 'tutorial.graduation'` / `case
//     'tutorial.compression_week'`) — catalogued at C3 so C5 did not have to extend this union just
//     to wire an ALREADY-closed-form trigger it did not itself discover.
//   - `tutorial.vacancy` — catalogued but marked `eligible: false` (§0.6: `successor_vacancy` → 0 hits
//     in `db/schema/`) PER EXPLICIT MANDATE, its ineligibility motif WRITTEN HERE, never silent.
//   - `tutorial.queue_runs_dry` — W1.1-b C5 ADDITION (mandate §"un écart réel entre C3 et C5"). Named
//     by canon prose only (`tutorial_system_architecture.md:144`, "overlay « queue runs dry » (id
//     catalogué 08c)") — no literal id was ever catalogued anywhere in 08c (the design's own §8 row:
//     "Aucun catalogue d'ids n'existe"), so this literal is CHOSEN here, at the SAME commit that wires
//     its trigger (C5, `onboarding-overlay.resolver.ts`), mirroring the D3 "an open family enters WITH
//     its mechanism" convention. Substrate is CLOSED and MEASURED: `QUIET_STATE` is a member of the
//     `onboarding_funnel_step` pgEnum (`0143:55-64`) with a LIVE server writer,
//     `OnboardingFunnelRepository.advanceQuietStateIfQueueEmpty` (`onboarding-funnel.repository.ts:119`).
// W1.1-c C1's 6 additions — the REMAINING 6 `ProgressiveDisclosureSchedule` slots (D2…D7, canon
// `tutorial_system_architecture.md:144-151`; rank 0/D1-step-6 is `tutorial.queue_runs_dry` above).
// Every literal below is CHOSEN at this commit (no id was ever catalogued in 08c for these slots —
// same situation `tutorial.queue_runs_dry` already resolved), matching each slot's own canon
// description verbatim:
//   - `tutorial.cue_stack_intro` — rank 1, D2 "Cue Stack intro". Substrate: `gameplay_sessions`
//     ALONE (design §0.6 row 1) — R-A, no other conjoint.
//   - `tutorial.daily_review_intro` — rank 2, D3 "Daily Review intro". Substrate: ordinal ∧ ∃ a
//     `flagged_items` row `resolution='pending'` for the player — R-B (design §0.6 row 2, §0.15):
//     the welcome grant alone never satisfies it (role COOK ∉ the flag-worthy role set), so the slot
//     is REACHABLE but never GUARANTEED; a slot the player never reaches is SKIPPED, never blocking
//     (D5), and reclaimed at its own rank the session the condition becomes true.
//   - `tutorial.city_map_heat_intro` — rank 3, D4 "City Map Heat intro". Substrate: `gameplay_sessions`
//     ALONE (design §0.6 row 3) — R-A, no other conjoint.
//   - `tutorial.audit_pin_intro` — rank 4, D5 "Audit Pin intro". `eligible: false`, mode `INERT`
//     (D7/D11) — see its own catalogue row below for the 4-link chain's current measured state:
//     `safehouses` now has an application writer (LOT PLANQUE), but the amount it seeds a fresh
//     account with sits under the audit-pin deviation threshold, so the chain still never produces
//     a pin for that account today (measured, and revisitable — design §0.14, Q6 HORS document).
//   - `tutorial.graduation_eligibility_intro` — rank 5, D6 "Graduation eligibility intro". Substrate:
//     STATE-PREDICATE, never the ordinal (∃ a LIVE `TASK_CATEGORY_CATALOGUE` category with
//     `delegation_state='SELF'` ∧ `deriveMasteryBucket(score, threshold) === 'ELIGIBLE'`) — R-B,
//     and canon itself calls D6/D7 "targets, not gates" (design §0.6 row 5).
//   - `tutorial.possibility_horizon_intro` — rank 6, D7 "Possibility Horizon intro". Substrate:
//     event-based, ∃ a `graduation_events` row of kind `GRADUATION` — the EXACT SAME query
//     `tutorial.graduation`'s own trigger already runs (design §0.6 row 6: "requête déjà écrite par
//     `hasGraduationEvent`") — R-B, REUSE, never a duplicated formula.
// Excluded entirely (not even catalogued): the two open families above, and anything pillar-threshold
// (canon `[PROV-TBD]` — no upstream mechanism at all, design §2 "HORS W1.1-b").
export type TutorialId =
  | 'tutorial.exception_card.onboarding_preseed'
  | 'tutorial.graduation'
  | 'tutorial.compression_week'
  | 'tutorial.vacancy'
  | 'tutorial.queue_runs_dry'
  | 'tutorial.cue_stack_intro'
  | 'tutorial.daily_review_intro'
  | 'tutorial.city_map_heat_intro'
  | 'tutorial.audit_pin_intro'
  | 'tutorial.graduation_eligibility_intro'
  | 'tutorial.possibility_horizon_intro';

export interface TutorialIdCatalogueEntry {
  readonly id: TutorialId;
  /** Whether C5's `OnboardingOverlayResolver` can currently compute eligibility for this id (a
   *  MEASURED, closed-form trigger substrate exists). `false` = catalogued but permanently inert
   *  until an upstream mechanism lands — never a silent gap (mirrors `TaskCategoryCatalogueEntry.
   *  futureLot`'s "honest ownership note" convention). This field is NOT consumed by this chunk (C3
   *  only validates `markShown()` against catalogue MEMBERSHIP, never against `eligible`) — it exists
   *  so the non-eligibility motif is written in code NOW, at the same commit that admits the id. */
  readonly eligible: boolean;
  /** Non-parsed, human-readable pointer — required when `eligible: false`. */
  readonly ineligibleReason?: string;
}

/**
 * `TUTORIAL_ID_CATALOGUE` — `Record<TutorialId, …>` WITHOUT `default` (socle règle 7): any
 * additional `TutorialId` union member with no matching row here is a TypeScript compile error,
 * never a silent `undefined` at runtime. `satisfies` (not a type annotation) keeps every entry's own
 * literal `id` narrowed for its key, mirroring `TASK_CATEGORY_CATALOGUE`'s exact form.
 */
export const TUTORIAL_ID_CATALOGUE = {
  'tutorial.exception_card.onboarding_preseed': {
    id: 'tutorial.exception_card.onboarding_preseed',
    eligible: true,
  },
  'tutorial.graduation': {
    id: 'tutorial.graduation',
    eligible: true,
  },
  'tutorial.compression_week': {
    id: 'tutorial.compression_week',
    eligible: true,
  },
  'tutorial.vacancy': {
    id: 'tutorial.vacancy',
    eligible: false,
    ineligibleReason:
      'No measured trigger substrate: successor_vacancy has 0 hits in db/schema/ (design §0.6 — the ' +
      'only VacancyEvent-shaped entity in this repo is prose describing a future ch07 lot, never a ' +
      'table). Catalogued per canon screen_c8:213; inert until an upstream vacancy mechanism lands ' +
      '(then it enters WITH its mechanism, D3\'s own condition for the open families too).',
  },
  'tutorial.queue_runs_dry': {
    id: 'tutorial.queue_runs_dry',
    eligible: true,
  },
  // ── W1.1-c C1 — the remaining 6 `ProgressiveDisclosureSchedule` slots (D2…D7) ──────────────────
  'tutorial.cue_stack_intro': {
    id: 'tutorial.cue_stack_intro',
    eligible: true,
  },
  'tutorial.daily_review_intro': {
    id: 'tutorial.daily_review_intro',
    eligible: true,
  },
  'tutorial.city_map_heat_intro': {
    id: 'tutorial.city_map_heat_intro',
    eligible: true,
  },
  'tutorial.audit_pin_intro': {
    id: 'tutorial.audit_pin_intro',
    eligible: false,
    ineligibleReason:
      'MEASURED, 4 links, each application-writer count re-checked after LOT PLANQUE (design D11/' +
      '§0.14, updated by review ⊥ finding B2): buildings.audit_pin_expires_at ← 1 writer ' +
      '(unconformity.repository.ts applyAuditPins, inside the NIGHTLY listPromoted scope) ← ' +
      'buildings.transaction_profile ← 1 writer (laundering.repository.ts, inside applyInject) ← ' +
      'applyInject ← 1 caller, inject ← 4 callers, ALL requiring a pre-existing safehouses row ← ' +
      'safehouses ← now 1 application writer (LaunderingPersistenceService, LOT PLANQUE C1) — the ' +
      'link that was previously closed is now LIVE. POST /v1/operational/laundering/inject ' +
      '(production, JwtAuthGuard) returns 200 for a fresh player, not 404. What keeps this id ' +
      'INERT today is a DIFFERENT, narrower fact: the welcome grant seeds the safehouse with ' +
      '10 000 cents, well under the 250 000-cent baseline the audit-pin deviation check compares ' +
      'against — so a fresh account never produces a pin. Catalogued INERT (D7/D11) rather than ' +
      'R-B: revisit if the seeded amount or the deviation baseline change enough to cross, or per ' +
      'the reopened arbitrage on whether this disposition itself is still the right one (design ' +
      '§13.2 Q6, hors document).',
  },
  'tutorial.graduation_eligibility_intro': {
    id: 'tutorial.graduation_eligibility_intro',
    eligible: true,
  },
  'tutorial.possibility_horizon_intro': {
    id: 'tutorial.possibility_horizon_intro',
    eligible: true,
  },
} satisfies Record<TutorialId, TutorialIdCatalogueEntry>;

/** Runtime membership check for a caller-supplied `tutorial_id` string (`markShown`'s own guard,
 *  `screen_c8:344` — "jamais une valeur libre non-cataloguée"). A type predicate so a caller that
 *  already checked this narrows `string` → `TutorialId` for free. */
export function isKnownTutorialId(value: string): value is TutorialId {
  return Object.prototype.hasOwnProperty.call(TUTORIAL_ID_CATALOGUE, value);
}
