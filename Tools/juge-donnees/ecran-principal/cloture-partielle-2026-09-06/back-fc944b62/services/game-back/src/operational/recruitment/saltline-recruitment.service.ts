// IMPLEMENTS: docs/superpowers/plans/2026-07-11-04f-B-recruitment-plan.md C2 (Quest machine + Saltline pool)
//             Design: docs/superpowers/specs/2026-07-11-04f-B-recruitment-design.md §5 (the Saltline 5-step
//             flow + variations) + §12 (`saltline_candidates_per_pool` / `saltline_quest_steps`)
//             Decisions: docs/superpowers/specs/2026-07-11-04f-B-recruitment-decisions.md DD-R2 (step
//             tables are code-owned closed domains, NOT a DB table) + gdd/15:2943 (`TrialAxisBucket` REUSE)
//             Determinism: services/game-back/src/common/seeded-rng.ts (`makeRng` — the raid-bribe
//             precompute-proof precedent; NO `Math.random` anywhere in this lot, D9 posture)
//             — 04f-B C2 — 2026-07-11
//
// `SaltlineRecruitmentService` — the Saltline pool's OWN mechanics: (a) the code-owned step table (DD-R2 —
// which `decision_type` is legal at which `current_step`, and its closed `decision_value` domain); (b)
// deterministic candidate generation seeded `(player_id, game_day, slot)` up to
// `saltlineCandidatesPerPool`; (c) the `TrialAxisBucket` reveal (gdd/15:2943 — "the candidate's strongest
// axis, revealed by the trial task", a REAL per-candidate deterministic property, independent of which task
// the player actually picks).
//
// ★ SCOPE BOUNDARY (C2/C3, guardrails): this service produces REAL decision records (opening_line /
// trial_task+revealed_axis / negotiation) for `RecruitmentQuestService` to log into `decisions_made` — it
// does NOT touch `expected_outcome` (DD-R3: that jsonb leg is maintained by the SAME mapper code that seeds
// the final script, `RecruitmentQuestOutcomeMapper` — C3's build) and does NOT compute `HireQualityBucket` /
// `LoyaltySeedBucket` (D5/D6/D7, also C3). A quest that reaches its final gated step here is left in an
// honest "ready for hire" state (`current_step === finalGatedStep(stepsTotal)`) — `finalizeHire` itself is
// C3's endpoint, not stubbed here.
//
// ★ STEP-COUNT MODEL (a documented, code-owned resolution of a genuine design-doc ambiguity — see the C2
// handoff report to the controller): design §4 states "a 5-step Saltline quest takes >= 4 session-gaps of
// in-game time" while §5 lists exactly 3 decision-bearing stages (Conversation/opening_line,
// Trial/trial_task, Negotiate/salary+autonomy) between the non-gated bookends Open (resolved by
// `startQuest` itself) and Hire (a SEPARATE `finalizeHire` action, C3 — no decision domain of its own). This
// file resolves it as: 3 gated decisions for the default `stepsTotal=5` (matching the plan's own
// falsifiable-floor language, which names exactly 3 decision categories: "opening-line / trial-type /
// terms"); the ">=4 session-gaps" prose is satisfied end-to-end because `finalizeHire` (C3) ALSO respects
// the SAME session gate off `last_advanced_at_game_minute` before hiring — i.e. 3 gated advances here + 1
// more gap before hire = >=4 elapsed session-durations of game time by the time a lieutenant is actually
// hired, without inventing a 4th, undocumented decision type. `current_step` therefore ranges
// `1..(stepsTotal-1)`: it starts at 1 (Open, resolved by `startQuest`) and each gated advance increments it
// by exactly 1, reaching `stepsTotal-1` (the last decision-bearing step, "Negotiate") once all gated
// decisions are consumed — `stepsTotal` itself (`Hire`) is never a value `current_step` takes via
// `advanceStep`. Tuning `stepsTotal` up (6..7) inserts EXTRA Trial-repeat sessions (design §5: "steps
// 3..(n-2) are additional trial sessions") — `saltlineTrialRepeatCount` below implements that.

import { Injectable } from '@nestjs/common';

import { makeRng } from '../../common/seeded-rng';
import { recruitmentTunables } from './recruitment-tunables';
import type { RecruitmentCandidateInsert } from '../../db/schema/recruitment';

/** `OpeningLine` — gdd/15 (Conversation step). Closed 3-member domain. */
export const OPENING_LINE_DOMAIN = ['CURIOUS', 'DIRECT', 'CAUTIOUS'] as const;
export type OpeningLine = (typeof OPENING_LINE_DOMAIN)[number];

/** `TrialTaskType` — gdd/15 (Trial step). Closed 3-member domain, ALIGNED on `TrialAxisBucket` (gdd/15:2943
 *  — identical member set, REUSE per the design's own note). */
export const TRIAL_TASK_DOMAIN = ['LOGISTICS', 'MUSCLE', 'FIXER'] as const;
export type TrialTaskType = (typeof TRIAL_TASK_DOMAIN)[number];

/** Salary/autonomy negotiation sliders (Negotiate step). Closed 3-member domains each. */
export const SALARY_BAND_DOMAIN = ['LOW', 'FAIR', 'GENEROUS'] as const;
export type SalaryBand = (typeof SALARY_BAND_DOMAIN)[number];
export const AUTONOMY_BAND_DOMAIN = ['TIGHT', 'BALANCED', 'LOOSE'] as const;
export type AutonomyBand = (typeof AUTONOMY_BAND_DOMAIN)[number];

/** One gated step's decision contract (DD-R2 — the code-owned closed domain). */
export type SaltlineDecisionType = 'opening_line' | 'trial_task' | 'negotiation';

export interface SaltlineStepSpec {
  /** 1-indexed position in the gated sequence (NOT `current_step` — see `stepForGatedIndex`). */
  index: number;
  decisionType: SaltlineDecisionType;
}

/** Negotiation bundle shape (the 2 sliders submitted together as ONE gated decision, design §5 step 4 —
 *  "decisions salary_band + autonomy_band (closed sliders)", ONE `advanceStep` call). */
export interface NegotiationDecisionValue {
  salary_band: SalaryBand;
  autonomy_band: AutonomyBand;
}

@Injectable()
export class SaltlineRecruitmentService {
  /**
   * The ordered gated-decision sequence for a given `stepsTotal` (the `saltlineQuestSteps` getter value,
   * default 5, range 3..7). Length = `stepsTotal - 2` (Open + Hire are the non-gated bookends): position 1 =
   * `opening_line`; positions 2..(length-1) = `trial_task` repeated (design §5 "steps 3..(n-2)" — extra
   * Trial-refinement sessions when `stepsTotal > 5`, clamped to a minimum of 1 repeat so the sequence never
   * loses the Trial stage entirely); the LAST position = `negotiation`. `current_step` starts at 1 and
   * reaches `1 + sequence.length === stepsTotal - 1` after all gated decisions are consumed.
   */
  stepSequence(stepsTotal: number): SaltlineStepSpec[] {
    const gatedCount = Math.max(2, stepsTotal - 2); // floor of 2 (opening_line + negotiation) at the extreme low end
    const trialRepeats = Math.max(1, gatedCount - 2); // opening_line(1) + negotiation(1) reserved; the rest is Trial
    const out: SaltlineStepSpec[] = [];
    out.push({ index: 1, decisionType: 'opening_line' });
    for (let i = 0; i < trialRepeats; i += 1) {
      out.push({ index: out.length + 1, decisionType: 'trial_task' });
    }
    out.push({ index: out.length + 1, decisionType: 'negotiation' });
    return out;
  }

  /** The `current_step` value a quest is AT before its `gatedIndex`-th (0-based) decision is submitted:
   *  `current_step = gatedIndex + 1` (quest starts at `current_step=1`). */
  currentStepForGatedIndex(gatedIndex: number): number {
    return gatedIndex + 1;
  }

  /** `current_step` value once ALL gated decisions for `stepsTotal` are consumed (the "ready for hire,
   *  C3" marker — never reaches `stepsTotal` itself, see the file header note). */
  finalGatedStep(stepsTotal: number): number {
    return this.stepSequence(stepsTotal).length + 1;
  }

  /**
   * Validate `decisionType`/`decisionValue` against `spec`'s closed domain. Throws a plain `Error` with a
   * diagnostic message on any mismatch — the service layer maps it to 422 VALIDATION_FAILED (DD-R2: "an
   * out-of-domain decision -> 422 with a diagnostic, the DSL compiler's closed-domain discipline mirrored").
   */
  validateDecision(spec: SaltlineStepSpec, decisionType: string, decisionValue: unknown): void {
    if (decisionType !== spec.decisionType) {
      throw new Error(`expected decision_type '${spec.decisionType}' at this step, got '${decisionType}'`);
    }
    switch (spec.decisionType) {
      case 'opening_line':
        if (!OPENING_LINE_DOMAIN.includes(decisionValue as OpeningLine)) {
          throw new Error(`opening_line must be one of ${OPENING_LINE_DOMAIN.join('|')}`);
        }
        return;
      case 'trial_task':
        if (!TRIAL_TASK_DOMAIN.includes(decisionValue as TrialTaskType)) {
          throw new Error(`trial_task must be one of ${TRIAL_TASK_DOMAIN.join('|')}`);
        }
        return;
      case 'negotiation': {
        const v = decisionValue as Partial<NegotiationDecisionValue> | null | undefined;
        if (!v || typeof v !== 'object') {
          throw new Error('negotiation decision_value must be an object { salary_band, autonomy_band }');
        }
        if (!SALARY_BAND_DOMAIN.includes(v.salary_band as SalaryBand)) {
          throw new Error(`negotiation.salary_band must be one of ${SALARY_BAND_DOMAIN.join('|')}`);
        }
        if (!AUTONOMY_BAND_DOMAIN.includes(v.autonomy_band as AutonomyBand)) {
          throw new Error(`negotiation.autonomy_band must be one of ${AUTONOMY_BAND_DOMAIN.join('|')}`);
        }
        return;
      }
    }
  }

  /**
   * `TrialAxisBucket` reveal (gdd/15:2943) — the candidate's "strongest axis", deterministically seeded off
   * the CANDIDATE's own id (not the task the player picked — the same candidate always reveals the same
   * axis, "revealed BY the trial task", not "equal to the trial task"). Seeded per D9's precompute posture:
   * NO `Math.random`; the SAME `makeRng(candidateId)` stream reproduces identically on replay/re-test.
   */
  revealTrialAxis(candidateId: string): TrialTaskType {
    const rng = makeRng(`saltline-trial-axis:${candidateId}`);
    return TRIAL_TASK_DOMAIN[rng.int(0, TRIAL_TASK_DOMAIN.length - 1)];
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // Candidate generation (design §5/§9 — deterministic, seeded (player_id, game_day, slot); the REAL
  // method C4's NIGHTLY/23 tick will later call for the organic replenish — this IS that method, not a
  // stand-in, per plan §C2's own "SaltlineRecruitmentService... deterministic candidate generation" scope)
  // ═══════════════════════════════════════════════════════════════════════════════════════════

  /**
   * Build up to `count` NEW candidate rows for `(playerId, gameDay)`, filling SLOTS `startSlot..startSlot+
   * count-1`. Deterministic: the SAME `(playerId, gameDay, slot)` always yields the SAME profile (a
   * same-day re-run that calls this again for the SAME slots is a byte-identical re-derivation — the
   * regeneration-determinism proof, plan §C2). Qualitative profile ONLY (D14 anosmia — no stat sheet): a
   * placeholder name (TD-046 nom-pool posture — no invented name pool, mirrors the existing
   * `name: 'Lieutenant'` placeholder precedent, `lieutenant.service.ts`), `district_familiarity` /
   * `experience` / `ask_band` qualitative bands.
   */
  buildCandidateRows(playerId: string, gameDay: number, startSlot: number, count: number): RecruitmentCandidateInsert[] {
    const out: RecruitmentCandidateInsert[] = [];
    for (let i = 0; i < count; i += 1) {
      const slot = startSlot + i;
      const seed = `saltline-candidate:${playerId}:${gameDay}:${slot}`;
      const rng = makeRng(seed);
      const familiarityBands = ['LOW', 'MEDIUM', 'HIGH'] as const;
      const experienceBands = ['NONE', 'SOME', 'VETERAN'] as const;
      const askBands = ['LOW', 'FAIR', 'HIGH'] as const;
      out.push({
        player_id: playerId,
        pool: 'saltline',
        citizen_id: null,
        source_rival_key: null,
        profile: {
          name: `Saltline Candidate #${slot}`, // TD-046 placeholder (no invented nom-pool)
          district_familiarity: familiarityBands[rng.int(0, familiarityBands.length - 1)],
          experience: experienceBands[rng.int(0, experienceBands.length - 1)],
          ask_band: askBands[rng.int(0, askBands.length - 1)],
        },
        status: 'available',
        surfaced_at_game_day: gameDay,
        expires_at_game_day: gameDay + recruitmentTunables.candidateExpiryGameDays,
      });
    }
    return out;
  }
}
