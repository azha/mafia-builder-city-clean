// IMPLEMENTS: docs/superpowers/specs/2026-08-09-w1.1a-onboarding-funnel-design.md §4 chunk C2 (R2.3)
//             + projects/mafia_city_game/gdd/14_tunable_constants.md:3283-3290 "## Onboarding — Day 1
//             funnel" (`T.onboard.*`)
//             -- W1.1-a C2 -- 2026-08-09 --
//
//             W1.1-c C1 (docs/superpowers/specs/2026-08-09-w1.1c-disclosure-design.md D7 v5,
//             §4 chunk C1) adds THREE more `T.onboard.*_intro_day` keys — ranks 1-3 of the
//             `ProgressiveDisclosureSchedule` (D2/D3/D4, `gdd/14:3299-3301`). ⛔ `audit_pin_intro_day`
//             (`gdd/14:3302`, rank 4/D5) is DELIBERATELY NOT surfaced, after THREE reversals recorded
//             in the design (v3 drop / v4 restore / v5 drop again) — write the motif in full so the
//             next lot does not "restore it by symmetry" from a stale v4 reading: rank 4 is `INERT`
//             (D7/D11) — a slot in `INERT` mode cannot structurally carry a plancher (type-level, not
//             a review convention), and BOTH catalogue regimes leave the getter dead — under
//             `eligible: false` the `case` never runs (the guard at `onboarding-overlay.resolver.ts`
//             short-circuits first); under a hypothetical `eligible: true` the 2nd trigger conjoint
//             (∃ pin) still measures false FOR A FRESH ACCOUNT TODAY — `safehouses` now has its
//             first application writer (LOT PLANQUE, §0.14 updated by review ⊥ B2), but the amount
//             it seeds sits under the audit-pin deviation baseline, so no pin materializes — an
//             operator moving the key across its whole `4..8` range would still change nothing
//             observable AT THAT SEEDED AMOUNT. "A tunable
//             enters at the commit that consumes it" — and "consumes" means "its value can change an
//             observable result", not "a line reads it" (D7 v5). Revisit ONLY if the rank 4 catalogue
//             row above stops being `INERT` (its own comment names the two ways that can happen) — the
//             getter re-enters in THAT SAME commit, never speculatively ahead of it.
//             `first_delegation_target_days` / `first_graduation_target_days` (D6/D7) are ALSO not
//             surfaced: those two slots trigger on a STATE-PREDICATE, never the ordinal (canon calls
//             them "targets, not gates") — see `onboarding-overlay.resolver.ts`'s rank 5/6 cases.
//             `snooze_duration_h` / `max_hints_per_session` stay Unity-side presentation (w1.1-b §0.13).
//
// Onboarding-layer tunables (`T.onboard.*`). The OTHER two canon keys in this gdd/14 section —
// `first_decision_target_s` and `overlay_max_block_ms` — are NOT surfaced here: the canon's own
// `used_by` column assigns both to Unity / ch20 telemetry, NEVER the game-back server (design §0.9,
// §3 point 4 — 5 canon ancres cited there). "Un tunable sans consommateur est une carte qui ment"
// (design §0.9) — if a server consumer for either ever lands, add its getter in THAT commit, not
// speculatively here.
//
// R2.3: numeric config values live ONLY in the registry. Every DEFAULT below is the backported
// registry value (gdd/14, cited verbatim, NOT invented). DB-override > env > default (Phase-23
// TunablesStore).

import { TunablesStore } from '../config/tunables-store';

export const onboardingTunables = {
  /**
   * T.onboard.preseed_exception_count — the count of onboarding-scoped Exception cards a fresh
   * signup targets (design D9: the CONSUMER, C5, clamps this to `min(tunable, k)` where k = the
   * authored-card list length — the clamp itself lives in C5, not here).
   * gdd/14:3290. Range 1..3. Default 1.
   * Env override: `ONBOARD_PRESEED_EXCEPTION_COUNT`. (DB-override > env > default — Phase-23).
   */
  get preseedExceptionCount(): number {
    return TunablesStore.resolveInt('T.onboard.preseed_exception_count', 'ONBOARD_PRESEED_EXCEPTION_COUNT', 1);
  },

  /**
   * T.onboard.cue_stack_intro_day — the session-ordinal floor for the D2 "Cue Stack intro" slot
   * (rank 1, `tutorial.cue_stack_intro`). Consumer: `OnboardingOverlayResolver.triggerSatisfied` (this
   * chunk, C1) — the sole conjoint of an R-A trigger (design §0.6 row 1: `gameplay_sessions` alone,
   * no other substrate).
   * gdd/14:3299. Range 2..4. Default 2.
   * Env override: `ONBOARD_CUE_STACK_INTRO_DAY`. (DB-override > env > default — Phase-23).
   */
  get cueStackIntroDay(): number {
    return TunablesStore.resolveInt('T.onboard.cue_stack_intro_day', 'ONBOARD_CUE_STACK_INTRO_DAY', 2);
  },

  /**
   * T.onboard.daily_review_intro_day — the session-ordinal floor for the D3 "Daily Review intro" slot
   * (rank 2, `tutorial.daily_review_intro`). Consumer: `OnboardingOverlayResolver.triggerSatisfied`
   * (this chunk, C1) — ONE of two conjoints (design §0.6 row 2, R-B): the ordinal AND ∃ a
   * `flagged_items` row `resolution='pending'` for the player.
   * gdd/14:3300. Range 3..5. Default 3.
   * Env override: `ONBOARD_DAILY_REVIEW_INTRO_DAY`. (DB-override > env > default — Phase-23).
   */
  get dailyReviewIntroDay(): number {
    return TunablesStore.resolveInt('T.onboard.daily_review_intro_day', 'ONBOARD_DAILY_REVIEW_INTRO_DAY', 3);
  },

  /**
   * T.onboard.city_map_heat_intro_day — the session-ordinal floor for the D4 "City Map Heat intro"
   * slot (rank 3, `tutorial.city_map_heat_intro`). Consumer: `OnboardingOverlayResolver
   * .triggerSatisfied` (this chunk, C1) — the sole conjoint of an R-A trigger (design §0.6 row 3:
   * `gameplay_sessions` alone, no other substrate).
   * gdd/14:3301. Range 3..6. Default 4.
   * Env override: `ONBOARD_CITY_MAP_HEAT_INTRO_DAY`. (DB-override > env > default — Phase-23).
   */
  get cityMapHeatIntroDay(): number {
    return TunablesStore.resolveInt('T.onboard.city_map_heat_intro_day', 'ONBOARD_CITY_MAP_HEAT_INTRO_DAY', 4);
  },
};
