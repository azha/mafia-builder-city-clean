// IMPLEMENTS: docs/superpowers/specs/2026-08-09-w1.1c-disclosure-design.md §4 chunk C2 (D10/D7).
//             Canon: docs/tech/11_onboarding/tutorial_system_architecture.md:144-151 (the 7-row
//             `ProgressiveDisclosureSchedule` table, columns "Ligne du canon" / "tutorial_id révélé" /
//             "Classe de déclencheur") + `:157` ("Post-D7 : la main repasse au SYSTEM 08c […]
//             l'orchestration onboarding cède la place" — the frontier D10 encodes).
//             — W1.1-c C2 — 2026-08-12 —
//
// D10 — "La schedule contient les 7 slots du canon, et rien d'autre" (design §1 D10, retained form v5):
// TWO exhaustive `Record`s that constrain each other, both `satisfies … WITHOUT default` (socle règle 7
// — an additional member on EITHER side is a TypeScript compile error, never a silent gap):
//   - `DISCLOSURE_SLOT_TUTORIAL_ID` — `Record<DisclosureSlot, TutorialId>`, the 7 canon slots ⇒ the ONE
//     `TutorialId` each currently occupies. An additional `DisclosureSlot` member with no row here does
//     not compile.
//   - `TUTORIAL_ID_DISPOSITION` — `Record<TutorialId, DisclosureDisposition>`, ALL 11 catalogued ids ⇒
//     whether each is a schedule slot (`SCHEDULE`) or an 08c-native overlay outside the curriculum
//     (`NATIVE_08C`). An additional `TutorialId` with no row here does not compile — the repair of design hole
//     I7 ("l'exhaustivité de la seule DisclosureSlot ne dit rien d'un TutorialId neuf" —
//     `DISCLOSURE_SLOT_TUTORIAL_ID` alone would let a new id silently never rank; this SECOND card forces
//     every id to declare itself, both directions).

import type { TutorialId } from './tutorial-id-catalogue';

// `DisclosureSlot` — 7 literal members, one per canon row (`tutorial_system_architecture.md:144-151`).
// ⛔ CHOSEN here, not given verbatim: the canon names its rows by DAY LABEL only ("D1 step 6 (2nd
// decision)", "D2"…"D7") — the SAME situation `TutorialId` itself already resolved for the 6 W1.1-c C1
// ids (`tutorial-id-catalogue.ts`'s own header). The literals below are the canon's OWN column-1 labels,
// normalized to TS identifiers — never invented prose, never renumbered (design §1's own reading
// convention: "rang 0 = D1 step 6, rang 1 = jour D2, …, rang 6 = jour D7").
export type DisclosureSlot = 'D1_STEP_6' | 'D2' | 'D3' | 'D4' | 'D5' | 'D6' | 'D7';

/**
 * Rank order, LOW to HIGH (design §1's own convention — "rang 0" is the FIRST slot a fresh player can
 * clear). `DisclosureScheduleService` (this chunk) walks this array, never `Object.keys(…)` on the
 * `Record` below (object key insertion order is an implementation detail this file does not want the
 * pointer to depend on).
 */
export const DISCLOSURE_SLOTS_IN_RANK_ORDER: readonly DisclosureSlot[] = ['D1_STEP_6', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'];

/**
 * D10 CARD 1 — `Record<DisclosureSlot, TutorialId>` (design §4 C2). `satisfies`, NO `default`: an
 * additional `DisclosureSlot` union member with no row here is a TypeScript compile error (socle règle 7),
 * mirroring `TUTORIAL_ID_CATALOGUE`'s own `satisfies` form (`tutorial-id-catalogue.ts:174`).
 */
export const DISCLOSURE_SLOT_TUTORIAL_ID = {
  D1_STEP_6: 'tutorial.queue_runs_dry',
  D2: 'tutorial.cue_stack_intro',
  D3: 'tutorial.daily_review_intro',
  D4: 'tutorial.city_map_heat_intro',
  D5: 'tutorial.audit_pin_intro',
  D6: 'tutorial.graduation_eligibility_intro',
  D7: 'tutorial.possibility_horizon_intro',
} satisfies Record<DisclosureSlot, TutorialId>;

/**
 * D7 — "La FORME de la schedule" (design §1 D7, v5 retained): each SCHEDULE-disposed id's trigger
 * classification, union discriminée SANS `default`. `INERT` REMAINS a member (v5 — the v4 draft had
 * dropped it, then had to restore it when rank 4/D5 came back R-D — design §1 D7's own "aller-retour":
 * "on ne laisse pas une case d'union vide « au cas où » ; un membre rentre AVEC son habitant et sa garde,
 * au même commit").
 * ⛔ Deviation (implementation-notes.md § Deviations, item 1): design §4 C2's own prose names ONLY
 * "SCHEDULE(slot) or NATIVE_08C(motif)" for the second card's shape — it does not spell out a THIRD
 * top-level `Record` for D7's mode union. This chunk folds D7's mode classification INTO the `SCHEDULE`
 * variant below (a payload field, not a new Record) rather than inventing a third exhaustive map: the two
 * Records of D10 stay exactly two, and `mode` gives the C2 "INERT ⟺ eligible:false" assertion an
 * INDEPENDENTLY-authored left-hand side to check against `TUTORIAL_ID_CATALOGUE[id].eligible` — without
 * it, that assertion would be checking a predicate against itself (a tautology, never a detector).
 */
export type DisclosureTriggerMode = 'ORDINAL_FLOOR' | 'STATE_PREDICATE' | 'EVENT' | 'INERT';

/**
 * D10 CARD 2's value type (design §4 C2) — EXACTLY two shapes, `SCHEDULE(slot)` or `NATIVE_08C(motif)`.
 * `readonly`, discriminated on `kind`, consumed exhaustively (no `default`) wherever it matters.
 */
export type DisclosureDisposition =
  | { readonly kind: 'SCHEDULE'; readonly slot: DisclosureSlot; readonly mode: DisclosureTriggerMode }
  | { readonly kind: 'NATIVE_08C'; readonly motif: string };

/**
 * D10 CARD 2 — `Record<TutorialId, DisclosureDisposition>` (design §4 C2). `satisfies`, NO `default`: an
 * additional `TutorialId` union member with no row here is a TypeScript compile error. 11 entries — the 7
 * SCHEDULE ids (rank order above, values from CARD 1) + the 4 08c-native overlays (design §0.6's own
 * second table).
 */
export const TUTORIAL_ID_DISPOSITION = {
  // ── 08c-native overlays — OUTSIDE the schedule, no rank, no cap (design §0.6, second table) ────────
  'tutorial.exception_card.onboarding_preseed': {
    kind: 'NATIVE_08C',
    motif:
      'EXCEPTION_TYPE_FIRST_SEEN — canon row "ongoing (post-D7)" (tutorial_system_architecture.md:150). ' +
      'The pre-seed card is a case of this family, never a schedule slot (design §0.6: "la carte de ' +
      'pré-seed y figure dans la ligne « ongoing (post-D7) » en tant qu\'EXCEPTION_TYPE_FIRST_SEEN — pas ' +
      'comme un slot").',
  },
  'tutorial.graduation': {
    kind: 'NATIVE_08C',
    motif: 'MILESTONE_FIRST_REACHED (screen_c8:393) — canon row "ongoing (post-D7)".',
  },
  'tutorial.compression_week': {
    kind: 'NATIVE_08C',
    motif: 'MILESTONE_FIRST_REACHED (screen_c8:393) — canon row "ongoing (post-D7)".',
  },
  'tutorial.vacancy': {
    kind: 'NATIVE_08C',
    motif:
      'MILESTONE_FIRST_REACHED (screen_c8:393) — canon row "ongoing (post-D7)"; ALSO catalogued ' +
      'eligible:false (no measured trigger substrate, tutorial-id-catalogue.ts row) — the ineligibility ' +
      'is orthogonal to the schedule/INERT classification below (design §4 C2\'s own anti-vacuity ' +
      'habitant: an eligible:false id OUTSIDE the schedule, proving the INERT-domain restriction is real).',
  },
  // ── schedule ids — rank order above, D10 CARD 1's own values ────────────────────────────────────────
  'tutorial.queue_runs_dry': { kind: 'SCHEDULE', slot: 'D1_STEP_6', mode: 'EVENT' },
  'tutorial.cue_stack_intro': { kind: 'SCHEDULE', slot: 'D2', mode: 'ORDINAL_FLOOR' },
  'tutorial.daily_review_intro': { kind: 'SCHEDULE', slot: 'D3', mode: 'ORDINAL_FLOOR' },
  'tutorial.city_map_heat_intro': { kind: 'SCHEDULE', slot: 'D4', mode: 'ORDINAL_FLOOR' },
  'tutorial.audit_pin_intro': {
    kind: 'SCHEDULE',
    slot: 'D5',
    // INERT (D7/D11) — rank 4 is R-D: `TUTORIAL_ID_CATALOGUE['tutorial.audit_pin_intro'].eligible` is
    // `false`, and this `mode` MUST stay in lockstep with it (the C2 "INERT ⟺ eligible:false" assertion,
    // in the E2E suite, checks exactly this pair). ⛔ Do NOT flip this to a non-INERT mode independently
    // of the catalogue row — see that row's own `ineligibleReason` and design §1 D11 "Révisable si" for
    // the two ways rank 4 can graduate to R-B, at which point BOTH this `mode` and the catalogue row
    // change TOGETHER, in the same commit.
    mode: 'INERT',
  },
  'tutorial.graduation_eligibility_intro': { kind: 'SCHEDULE', slot: 'D6', mode: 'STATE_PREDICATE' },
  'tutorial.possibility_horizon_intro': { kind: 'SCHEDULE', slot: 'D7', mode: 'EVENT' },
} satisfies Record<TutorialId, DisclosureDisposition>;
