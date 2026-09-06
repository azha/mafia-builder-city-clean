// IMPLEMENTS: docs/superpowers/plans/2026-07-11-04f-B-recruitment-plan.md C4 (Civilian affinity scan, D7)
//             + C6 (Civilian quest DEPTH — identification/courting/initiation step flow + the D11
//             norms-inheritance couple's PURE inputs)
//             Design: docs/superpowers/specs/2026-07-11-04f-B-recruitment-design.md §9 (availability tick
//             step 3) + §7 (D7 predicate: "alive=true AND satisfaction >= affinity-high threshold AND
//             (loyalty_dealer_id IS NOT NULL OR demographic='connector')") + §5 (the Civilian 4-step flow)
//             Decisions: docs/superpowers/specs/2026-07-11-04f-B-recruitment-decisions.md D7 (affinity =
//             DERIVED predicate over EXISTING rich_citizens columns, no new schema) + D11 (seeded
//             determinism; civilian norms-inheritance = "copy the ON flags of the chosen affinity-source
//             lieutenant's readNormsVector... source-sensitive")
//             Pattern: services/game-back/src/operational/political/political-trigger-evaluators.ts
//             (`BPD_AGGREGATE_TRIGGER_REF` / `resolveBpdAggregateTriggerRank` — the SAME "decompose an
//             ALREADY-REGISTERED composite:<band> string into a concrete threshold via a LOCAL ref map,
//             NOT a new registry key" pattern this file's `AFFINITY_THRESHOLD_REF` /
//             `resolveAffinitySatisfactionThreshold` mirrors) + saltline-recruitment.service.ts
//             (`buildCandidateRows` — the seeded-profile-generation shape `buildCandidateRow` mirrors) +
//             defector-recruitment.service.ts (C5 — the SAME "gated step table (DD-R2) stays ZERO-DI /
//             pure; DI-requiring side effects orchestrated by RecruitmentQuestService" architecture note
//             this file's C6 extension mirrors verbatim)
//             — 04f-B C4 — 2026-07-11 | C6 extension — 2026-07-11
//
// `CivilianRecruitmentService` — the Civilian pool's C4 surfacing concern (unchanged) + C6's step-machine/
// roll/mapping PURE logic:
//   (1) `resolveAffinitySatisfactionThreshold` + `isAffinityEligible` — the D7 predicate itself, EXPORTED
//       as plain pure functions (not class methods) so an E2E spec can direct-import + precompute
//       eligibility for a citizen's live columns BEFORE calling the real tick (the raid-bribe precompute
//       pattern) — never a re-typed literal threshold in a test.
//   (2) `CivilianRecruitmentService.buildCandidateRow` — the ONE candidate row a qualifying citizen
//       produces (the availability tick owns the ELIGIBILITY gate + dedup against already-surfaced
//       `citizen_id`s, `RecruitmentRepository`; this service owns ONLY the candidate's qualitative
//       CONTENT — the SAME split `SaltlineRecruitmentService`/`DefectorRecruitmentService` establish).
//   (3) C6 — the gated step table (`stepSequence`/`finalGatedStep`/`validateDecision`, DD-R2, mirrors
//       `DefectorRecruitmentService` verbatim), the decision-extraction helpers, the PRESSING-twice decline
//       predicate (pure count over `decisions_made`), and the initiation/demographic fit check (D11's
//       "loyalty-seed shift", design §5 step 3'). ★ ARCHITECTURE NOTE (mirrors C5's own, verbatim): this
//       class stays ZERO-DI — no constructor, direct-instantiable `new CivilianRecruitmentService()` in a
//       pure precompute test. The DI-requiring SIDE EFFECTS this pure logic feeds (the `affinity_source`
//       CLOSED-LIST ownership check against `LieutenantRepository`'s player-scoped roster; the
//       `HiddenCurriculumService.readNormsVector`/`setNormsFlags` norms-COPY write; the citizen-demographic
//       read for the initiation fit check) are orchestrated DIRECTLY by `RecruitmentQuestService` — the
//       SAME split that service already uses for defector's D9/D10/D13 DI-requiring couples.
//
// ★ C6 STEP-COUNT MODEL (a documented, code-owned resolution of a genuine design-doc arithmetic gap — the
// SAME kind of resolution `SaltlineRecruitmentService`'s own header + `DefectorRecruitmentService.
// stepSequence`'s own header already document for their pools; see the C6 handoff report to the
// controller for the full reasoning). Design §5 lists FOUR civilian decision points (`affinity_source` at
// "1. Identification"; `courting_tone` ×`civilian_courting_sessions` at "2-3."; `initiation_task` at
// "3'.") — UNLIKE Saltline's "Open" / Defector's "Trigger" (both explicitly decision-FREE, non-gated
// bookends), civilian's own "1. Identification" step TEXTUALLY carries a real decision
// (`affinity_source`). Reconciling this against the registered `civilian_quest_steps` (3..6, default 4)
// range under the SAME "-2 bookend" arithmetic Saltline/Defector use (`stepsTotal - 2` gated decisions at
// default) does not fit (`4 - 2 = 2` gated slots vs 4 real civilian decision points at default settings —
// a genuine drafting gap, not a coder invention). The resolution honored here: civilian has exactly ONE
// non-gated bookend (Hire — `finalizeHire`, a SEPARATE action never consuming a `current_step` slot,
// identical to Saltline/Defector); `affinity_source` is treated as a NORMAL, SESSION-GATED, FIRST gated
// decision (task instructions: "Session-gated (REUSE C2)" names the WHOLE flow, no per-step carve-out) —
// so `gatedCount = Math.max(3, stepsTotal - 1)`, reserving `affinity_source`(1) + `initiation_task`(1) as
// FIXED single-occurrence gated decisions and letting `civilian_courting_sessions` (the AUTHORITATIVE
// repeat count — the EXACT `defector_vetting_sessions` doctrine, `DefectorRecruitmentService.
// stepSequence`'s own header) fill the rest, `Math.min`-clamped to the room `stepsTotal` leaves (a
// defensive floor — NOT a promise the registered default `civilian_courting_sessions=2` always runs BOTH
// sessions; at the registered DEFAULT combination (`civilian_quest_steps=4`, `civilian_courting_sessions=
// 2`) exactly 1 courting repeat fits — flipping `civilian_quest_steps` up (5 or 6) unlocks the 2nd, a
// value-sensitivity property the C6 floor tests directly, mirroring how `DefectorRecruitmentService`'s own
// formula ALSO does not satisfy `defectorVettingSessions` at ITS registered minimum `stepsTotal=4`).
//
// ★ `civilian_affinity_threshold_for_candidacy` (recruitment-tunables.ts) is a `composite:<band>` POINTER
// string (R2.3 registered, C1) — this file is its FIRST consumer (per the tunables file's own comment:
// "dereferenced by the C4 predicate, not validated here"). `AFFINITY_THRESHOLD_REF` below decomposes it
// into a concrete `satisfaction` cut — a LOCAL ref map, NOT a new registry key (mirrors
// `BPD_AGGREGATE_TRIGGER_REF`'s own posture verbatim). `70` is anchored on the SAME table's own existing
// "high" convention (`rich_citizens_whisper_active_partial_idx ... WHERE whisper_pressure >= 70`,
// sparse_citizens.ts — the established `[0..100]`-domain "activation" cut on this exact table) — a
// satisfied citizen scoring at or above the SAME cut every other rich_citizens mechanic treats as "high"
// is the observable-behavior-grounded reading of "affinity_high" (design §7 P4 note). [PROV-Y26Q2].

import { Injectable } from '@nestjs/common';

import { makeRng } from '../../common/seeded-rng';
import { recruitmentTunables } from './recruitment-tunables';
import type { RecruitmentCandidateInsert } from '../../db/schema/recruitment';
import type { RichCitizenRow } from '../../db/schema/sparse_citizens';
import type { RecruitmentDecisionEntry } from './recruitment.repository';

/**
 * `AFFINITY_THRESHOLD_REF` — resolves the ALREADY-REGISTERED composite string
 * `recruitmentTunables.civilianAffinityThresholdForCandidacy` (C1, default `'composite:affinity_high'`)
 * to a concrete `rich_citizens.satisfaction` cut (the `[0..100]` domain, design §7). `[PROV-Y26Q2]` — a
 * LOCAL ref map (the SAME `BPD_AGGREGATE_TRIGGER_REF`-style pattern), NOT a new registry key (the
 * composite key itself is already registered; this only decomposes it). `affinity_moderate` is
 * HEADROOM (the SAME "future stricter/looser override" posture `BPD_AGGREGATE_TRIGGER_REF` documents
 * for `aggregate_extreme`) — a BO/tuning override that widens candidacy without touching the registered
 * default. An unrecognized override string falls back to `70` (never silently 0/always-true — the
 * political-events precedent's own posture).
 */
const AFFINITY_THRESHOLD_REF: Readonly<Record<string, number>> = {
  'composite:affinity_high': 70, // [PROV-Y26Q2] — anchored on rich_citizens' own existing "high" cut (sparse_citizens.ts whisper partial index).
  'composite:affinity_moderate': 50, // [PROV-Y26Q2] — headroom: a looser override (== the schema default satisfaction baseline).
};
const AFFINITY_THRESHOLD_FALLBACK = 70;

/** Resolve `recruitmentTunables.civilianAffinityThresholdForCandidacy` to its concrete satisfaction cut
 *  (falls back to 70 — see `AFFINITY_THRESHOLD_REF` doc above). Flipping the tunable to an unrecognized
 *  string does NOT silently disable the predicate — it lands on the same documented fallback. */
export function resolveAffinitySatisfactionThreshold(compositeThreshold: string): number {
  return AFFINITY_THRESHOLD_REF[compositeThreshold] ?? AFFINITY_THRESHOLD_FALLBACK;
}

/** The minimal citizen-state shape the D7 predicate reads — matches `rich_citizens`' live columns
 *  (design §7: "alive=true AND satisfaction >= affinity-high threshold AND (loyalty_dealer_id IS NOT
 *  NULL OR demographic='connector')"). Exported so an E2E spec can precompute eligibility directly. */
export interface AffinityCitizenState {
  alive: boolean;
  satisfaction: number;
  loyalty_dealer_id: string | null;
  demographic: string;
}

/** The D7 predicate itself — PURE, no DB read (the caller supplies the already-fetched citizen row +
 *  the already-resolved threshold). Direct-importable for the raid-bribe precompute pattern. */
export function isAffinityEligible(citizen: AffinityCitizenState, satisfactionThreshold: number): boolean {
  return (
    citizen.alive &&
    citizen.satisfaction >= satisfactionThreshold &&
    (citizen.loyalty_dealer_id !== null || citizen.demographic === 'connector')
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// C6 — the gated step domain (DD-R2, code-owned closed domain — mirrors DefectorRecruitmentService)
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/** `CourtingTone` — design §5 steps 2-3. Closed 2-member domain. PRESSING accelerates but feeds the
 *  decline predicate (`declinePredicateFires` below) — "entering the criminal economy is a big ask". */
export const COURTING_TONE_DOMAIN = ['PATIENT', 'PRESSING'] as const;
export type CourtingTone = (typeof COURTING_TONE_DOMAIN)[number];

/** `InitiationTask` — design §5 step 3' (the gdd/07:738-743 bookkeeper ledger-trial variant = LEDGER). */
export const INITIATION_TASK_DOMAIN = ['ERRAND', 'LEDGER', 'LOOKOUT'] as const;
export type InitiationTask = (typeof INITIATION_TASK_DOMAIN)[number];

/** The literal `affinity_source` value meaning "no specific lieutenant — orbiting the player" (design §5
 *  step 1: `affinity_source ∈ {player} ∪ {existing lieutenant ids}`). Any OTHER string value is validated
 *  as an owned lieutenant id by `RecruitmentQuestService` (a DB-touching check, kept OUT of this pure
 *  class — see the file header ARCHITECTURE NOTE). */
export const AFFINITY_SOURCE_PLAYER = 'player';

/** One gated step's decision contract (DD-R2). */
export type CivilianDecisionType = 'affinity_source' | 'courting_session' | 'initiation_task';

export interface CivilianStepSpec {
  /** 1-indexed position in the gated sequence (NOT `current_step` — mirrors `DefectorStepSpec.index`). */
  index: number;
  decisionType: CivilianDecisionType;
}

/** The courting-session decision bundle (design §5 steps 2-3, "decision per session courting_tone"). */
export interface CourtingSessionDecisionValue {
  courting_tone: CourtingTone;
}

/** `ERRAND_FIT_DEMOGRAPHICS` — [PROV-Y26Q2], the ERRAND initiation task's demographic "fit" set (design
 *  §5 step 3': "a failed-fit (task vs demographic mismatch, deterministic) drops to `tested`"; the
 *  design's OWN worked example — "ERRAND on a `glass_client` demographic" — mismatches). ERRAND is
 *  legwork (moving through the district on the player's behalf) — a fit for the mobile/engaged
 *  demographics (`routine`/`spike`/`connector`, the citizens who are OUT in the district per their own
 *  `citizenDemographic` shipped semantics); `whisper` (a rumor-network node, not a courier) and
 *  `glass_client` (the design's own named mismatch — a high-value/insulated buyer, not legwork material)
 *  fail the fit. LEDGER/LOOKOUT have NO fit check at all — design §5 states plainly "LEDGER/LOOKOUT keep
 *  `seeded`" (unconditional) — `initiationMismatch` below returns `false` for both regardless of
 *  demographic. */
const ERRAND_FIT_DEMOGRAPHICS: ReadonlySet<string> = new Set(['routine', 'spike', 'connector']);

@Injectable()
export class CivilianRecruitmentService {
  /**
   * Build the ONE `recruitment_candidates` row a qualifying citizen (D7) surfaces for `(playerId,
   * citizen, gameDay)`. `pool='civilian'`, `citizen_id=citizen.citizen_id`, `source_rival_key=null`. The
   * qualitative profile mirrors the SAME 4-field shape `SaltlineRecruitmentService.buildCandidateRows`/
   * `DefectorRecruitmentService.buildCandidateRow` use, seeded on `(playerId, citizenId, gameDay)` — the
   * citizen's OWN real state is never leaked into the profile content (D14 anosmia: qualitative bands
   * only, no stat sheet).
   */
  buildCandidateRow(playerId: string, citizen: RichCitizenRow, gameDay: number): RecruitmentCandidateInsert {
    const seed = `recruitment-civilian-candidate:${playerId}:${citizen.citizen_id}:${gameDay}`;
    const rng = makeRng(seed);
    const familiarityBands = ['LOW', 'MEDIUM', 'HIGH'] as const;
    const experienceBands = ['NONE', 'SOME', 'VETERAN'] as const;
    const askBands = ['LOW', 'FAIR', 'HIGH'] as const;
    return {
      player_id: playerId,
      pool: 'civilian',
      citizen_id: citizen.citizen_id,
      source_rival_key: null,
      profile: {
        name: 'Civilian Prospect', // TD-046 placeholder (no invented nom-pool)
        district_familiarity: familiarityBands[rng.int(0, familiarityBands.length - 1)],
        experience: experienceBands[rng.int(0, experienceBands.length - 1)],
        ask_band: askBands[rng.int(0, askBands.length - 1)],
      },
      status: 'available',
      surfaced_at_game_day: gameDay,
      expires_at_game_day: gameDay + recruitmentTunables.candidateExpiryGameDays,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // C6 — the gated step table (mirrors DefectorRecruitmentService.stepSequence/finalGatedStep verbatim,
  // per the file-header's documented step-count-model resolution)
  // ═══════════════════════════════════════════════════════════════════════════════════════════

  /**
   * The ordered gated-decision sequence for `(stepsTotal, courtingSessions)` — design §5 civilian steps
   * "1. Identification" (`affinity_source`) / "2-3. Conversation/courting" (`courting_session`
   * ×`courtingSessions`) / "3'. Initiation" (`initiation_task`); step "4. Hire" is the non-gated bookend
   * (`finalizeHire`, a separate action — never a `current_step` value here, mirrors Saltline/Defector's
   * OWN Hire bookend). See the file header's "★ C6 STEP-COUNT MODEL" note for the full arithmetic
   * reasoning: `gatedCount` reserves `affinity_source`(1) + `initiation_task`(1) as fixed single-occurrence
   * decisions; `courtingSessions` is the AUTHORITATIVE repeat count (the `defectorVettingSessions`
   * doctrine), `stepsTotal` a defensive floor only.
   */
  stepSequence(stepsTotal: number, courtingSessions: number): CivilianStepSpec[] {
    const gatedCount = Math.max(3, stepsTotal - 1); // reserve affinity_source(1) + >=1 courting + initiation_task(1); ONE non-gated bookend (Hire)
    const courtingRepeats = Math.max(1, Math.min(courtingSessions, gatedCount - 2));
    const out: CivilianStepSpec[] = [];
    out.push({ index: 1, decisionType: 'affinity_source' });
    for (let i = 0; i < courtingRepeats; i += 1) {
      out.push({ index: out.length + 1, decisionType: 'courting_session' });
    }
    out.push({ index: out.length + 1, decisionType: 'initiation_task' });
    return out;
  }

  /** `current_step` value once ALL gated decisions for `(stepsTotal, courtingSessions)` are consumed (the
   *  "ready for hire" marker — mirrors `DefectorRecruitmentService.finalGatedStep` verbatim). */
  finalGatedStep(stepsTotal: number, courtingSessions: number): number {
    return this.stepSequence(stepsTotal, courtingSessions).length + 1;
  }

  /**
   * Validate `decisionType`/`decisionValue` against `spec`'s closed domain (DD-R2 — mirrors
   * `DefectorRecruitmentService.validateDecision`). SHAPE-ONLY for `affinity_source` (a non-empty string —
   * the closed-list OWNERSHIP check against the player's real roster is a DB-touching concern kept OUT of
   * this pure class, orchestrated by `RecruitmentQuestService`, the file header's ARCHITECTURE NOTE).
   * Throws a plain `Error` — the service layer maps it to 422 VALIDATION_FAILED (mirrors Saltline/Defector).
   */
  validateDecision(spec: CivilianStepSpec, decisionType: string, decisionValue: unknown): void {
    if (decisionType !== spec.decisionType) {
      throw new Error(`expected decision_type '${spec.decisionType}' at this step, got '${decisionType}'`);
    }
    switch (spec.decisionType) {
      case 'affinity_source':
        if (typeof decisionValue !== 'string' || decisionValue.length === 0) {
          throw new Error(`affinity_source must be a non-empty string ('${AFFINITY_SOURCE_PLAYER}' or an existing lieutenant id).`);
        }
        return;
      case 'courting_session': {
        const v = decisionValue as Partial<CourtingSessionDecisionValue> | null | undefined;
        if (!v || typeof v !== 'object' || !COURTING_TONE_DOMAIN.includes(v.courting_tone as CourtingTone)) {
          throw new Error(`courting_session decision_value must be an object { courting_tone: ${COURTING_TONE_DOMAIN.join('|')} }`);
        }
        return;
      }
      case 'initiation_task':
        if (!INITIATION_TASK_DOMAIN.includes(decisionValue as InitiationTask)) {
          throw new Error(`initiation_task must be one of ${INITIATION_TASK_DOMAIN.join('|')}`);
        }
        return;
    }
  }

  /** The latest `affinity_source` decision recorded in `decisions_made` (the D11 norms-inheritance input
   *  at hire). `undefined` if absent/garbage — the caller falls back to the clean/neutral `{}` convention
   *  (never a crash; a quest can only reach `finalizeHire` after this step was validated). */
  extractAffinitySource(decisions: RecruitmentDecisionEntry[]): string | undefined {
    for (let i = decisions.length - 1; i >= 0; i -= 1) {
      if (decisions[i].decision_type === 'affinity_source') {
        const v = decisions[i].decision_value;
        if (typeof v === 'string' && v.length > 0) return v;
      }
    }
    return undefined;
  }

  /** The latest `initiation_task` decision recorded in `decisions_made` (the loyalty-seed-shift input at
   *  hire, design §5 step 3'). `undefined` if absent/garbage. */
  extractInitiationTask(decisions: RecruitmentDecisionEntry[]): InitiationTask | undefined {
    for (let i = decisions.length - 1; i >= 0; i -= 1) {
      if (decisions[i].decision_type === 'initiation_task') {
        const v = decisions[i].decision_value;
        if (INITIATION_TASK_DOMAIN.includes(v as InitiationTask)) return v as InitiationTask;
      }
    }
    return undefined;
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // C6 — the PRESSING-twice decline predicate (design §5 steps 2-3: "PRESSING accelerates but feeds the
  // decline predicate — entering the criminal economy is a big ask") — PURE, no RNG, no clock.
  // ═══════════════════════════════════════════════════════════════════════════════════════════

  /** Count of `courting_session` decisions whose `courting_tone` was `PRESSING`, over the WHOLE decision
   *  log (not just consecutive — "PRESSING tone twice" read as "PRESSING chosen in 2 of the courting
   *  sessions", the design's own literal wording). */
  pressingCount(decisions: RecruitmentDecisionEntry[]): number {
    return decisions.filter((d) => {
      if (d.decision_type !== 'courting_session') return false;
      const v = d.decision_value as Partial<CourtingSessionDecisionValue> | null | undefined;
      return v?.courting_tone === 'PRESSING';
    }).length;
  }

  /** The decline predicate itself: fires once `pressingCount` reaches 2 (design's own "PRESSING tone
   *  twice" wording). `RecruitmentQuestService.advanceStep` checks this AFTER a `courting_session`
   *  decision is durably recorded and, if it fires, ends the quest `declined_candidate` immediately (the
   *  candidate NEVER reverts to `available`). */
  declinePredicateFires(decisions: RecruitmentDecisionEntry[]): boolean {
    return this.pressingCount(decisions) >= 2;
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // C6 D11 — the initiation-task/demographic fit check (design §5 step 3': the loyalty-seed shift)
  // ═══════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `true` when `task`/`demographic` is a "failed fit" (design §5: "LEDGER/LOOKOUT keep `seeded`; a
   * failed-fit (task vs demographic mismatch, deterministic) drops to `tested`"). LEDGER/LOOKOUT NEVER
   * mismatch (unconditional, per the design's own wording — bookkeeping/watch-duty need no field
   * mobility). ERRAND mismatches for any demographic NOT in `ERRAND_FIT_DEMOGRAPHICS` (see that const's own
   * doc — the design's own worked example, `glass_client`, is a mismatch here).
   */
  initiationMismatch(task: InitiationTask, demographic: string): boolean {
    if (task === 'LEDGER' || task === 'LOOKOUT') return false;
    return !ERRAND_FIT_DEMOGRAPHICS.has(demographic);
  }
}
