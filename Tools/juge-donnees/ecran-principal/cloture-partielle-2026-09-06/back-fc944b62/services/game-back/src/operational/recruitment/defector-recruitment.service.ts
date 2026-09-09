// IMPLEMENTS: docs/superpowers/plans/2026-07-11-04f-B-recruitment-plan.md C4 (Defector regime scan, D8)
//             + C5 (Defector quest depth — approach/vetting/onboarding step flow)
//             Design: docs/superpowers/specs/2026-07-11-04f-B-recruitment-design.md §9 (availability tick
//             step 2) + §5 (Defector pool step 1 "Trigger — no Open step: the candidate EXISTS only
//             because D8 surfaced it"; steps 2-6 approach/vetting/negotiation/onboarding)
//             Decisions: docs/superpowers/specs/2026-07-11-04f-B-recruitment-decisions.md D8 (regime-LIVE
//             trigger) + D9 (vetting/double-agent seeded, consequence-thin) + D10 (Maladaptive thin) +
//             D11 (flavor lineage, no non-deterministic RNG) + D13 (IA clerk severity/timing)
//             Pattern: services/game-back/src/operational/recruitment/saltline-recruitment.service.ts
//             (`buildCandidateRows` — the SAME seeded-profile-generation shape this file's
//             `buildCandidateRow` mirrors for a SINGLE candidate keyed on the qualifying rival instead of
//             a slot ordinal; `stepSequence`/`finalGatedStep`/`validateDecision` — the DD-R2 code-owned
//             closed-domain step table shape C5 mirrors verbatim, zero DI, direct-instantiable in tests)
//             + civilian-recruitment.service.ts (`AFFINITY_THRESHOLD_REF` — the `composite:<band>` LOCAL
//             ref-map pattern `MALADAPTIVE_INHERITANCE_STRENGTH_REF` below mirrors)
//             — 04f-B C4 — 2026-07-11 | C5 extension — 2026-07-11
//
// `DefectorRecruitmentService` — the Defector pool's surfacing (C4) + step-machine/rolls (C5) concern.
//
// C4 (unchanged): build the ONE candidate row a qualifying rival (`rival_state.regime ∈ {bleeding,
// retrench}`, D8) produces. The availability tick (`RecruitmentAvailabilityTickService`) owns the
// ELIGIBILITY gate (which rivals qualify + the dedup check against already-surfaced `source_rival_key`s,
// `RecruitmentRepository`) — this service owns ONLY the candidate's CONTENT (the qualitative profile).
//
// C5 (this extension): the 6-step flow's PURE domain logic — the gated step table (DD-R2, mirrors
// `SaltlineRecruitmentService` shape 1:1), the D9 seeded vetting/double-agent rolls, the D10 Maladaptive
// band→settling mapping, and the D11 approach→norms-flavor mapping. ★ ARCHITECTURE NOTE: this class stays
// ZERO-DI (exactly like `SaltlineRecruitmentService` — no constructor, direct-instantiable
// `new DefectorRecruitmentService()` in a pure precompute test, the raid-bribe pattern). The DI-requiring
// SIDE EFFECTS this pure logic feeds (`IATargetService.recordCorruptUse` at the approach step,
// `MaladaptiveMemoryService.getEscalationDepth` + `CombatRepository.readEscalationPair` at onboarding,
// `LieutenantRepository.setSettlingUntil` post-hire) are orchestrated DIRECTLY by
// `RecruitmentQuestService` — the SAME split that service already uses for the D11 pool-agnostic couples
// (`HiddenCurriculumService`/`ForbiddenTriadDetectionService` injected there, not routed through a pool
// service). Keeping this file DI-free is what makes its step/roll/mapping logic testable via bare
// instantiation (see `recruitment_defector_depth.spec.ts`'s PURE describe block).
//
// SEEDED DETERMINISM (D9/D11, the raid-bribe precompute pattern): every roll below is a PURE function of
// its inputs via `makeRng` — the SAME seed a caller can direct-import + reproduce (no DB read, no
// non-deterministic RNG call, no wall-clock read). Grep-checked clean by the C5 floor.

import { Injectable } from '@nestjs/common';

import { makeRng } from '../../common/seeded-rng';
import { recruitmentTunables } from './recruitment-tunables';
import type { RecruitmentCandidateInsert } from '../../db/schema/recruitment';
import type { RecruitmentDecisionEntry } from './recruitment.repository';
import {
  SALARY_BAND_DOMAIN,
  AUTONOMY_BAND_DOMAIN,
  type NegotiationDecisionValue,
  type SalaryBand,
  type AutonomyBand,
} from './saltline-recruitment.service';
import type { ReassignmentDisruptionComposite } from '../lieutenant/tenure-inertia';
import type { NormsFlags } from '../reputation/hidden-curriculum.service';

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// C5 — the gated step domain (DD-R2, code-owned closed domain — mirrors SaltlineRecruitmentService)
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/** `DefectorApproach` — design §5 step 2. Closed 3-member domain. */
export const DEFECTOR_APPROACH_DOMAIN = ['SALTLINE_INTERMEDIARY', 'DIRECT', 'CORRUPT_CLERK'] as const;
export type DefectorApproach = (typeof DEFECTOR_APPROACH_DOMAIN)[number];

/** One gated step's decision contract (DD-R2). */
export type DefectorDecisionType = 'approach' | 'vetting_session' | 'negotiation';

export interface DefectorStepSpec {
  /** 1-indexed position in the gated sequence (NOT `current_step` — mirrors `SaltlineStepSpec.index`). */
  index: number;
  decisionType: DefectorDecisionType;
}

/** The vetting-session decision bundle (design §5 steps 3-4 — "Skipping vetting steps is allowed
 *  (advance with `skip_vetting`) — the residual risk stays at base"). `skip=true` → no debit, no roll, no
 *  `vetting_sessions_run` increment (an informed-risk opt-out); `skip=false` → the REAL intel-op (guarded
 *  debit + a seeded per-session detection roll, D9). */
export interface VettingDecisionValue {
  skip: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// C5 D10 — the Maladaptive band → Phase-11 settling-duration mapping (composite:<band> LOCAL ref map)
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * `MALADAPTIVE_INHERITANCE_STRENGTH_REF` — resolves the ALREADY-REGISTERED composite string
 * `recruitmentTunables.maladaptiveMemoryInheritanceStrengthPerDefectorOriginConflict` (C1, default
 * `'composite:strength_moderate'`) to a `ReassignmentDisruptionComposite` — the SAME Phase-11 band
 * `disruptionTicks` (`tenure-inertia.ts`) already consumes for the REAL settling window
 * (`lieutenant.settling_until_tick`). `[PROV-Y26Q2]` — a LOCAL ref map (mirrors
 * `civilian-recruitment.service.ts`'s `AFFINITY_THRESHOLD_REF` posture verbatim), NOT a new registry key
 * (the composite key itself is already registered; this only decomposes it). Unrecognized override falls
 * back to `DISRUPT_MED` (never silently unarmed/zero).
 */
const MALADAPTIVE_INHERITANCE_STRENGTH_REF: Readonly<Record<string, ReassignmentDisruptionComposite>> = {
  'composite:strength_low': 'DISRUPT_SHORT', // [PROV-Y26Q2] headroom — a looser BO override
  'composite:strength_moderate': 'DISRUPT_MED', // [PROV-Y26Q2] the registered default
  'composite:strength_severe': 'DISRUPT_LONG', // [PROV-Y26Q2] headroom — a harsher BO override
};
const MALADAPTIVE_INHERITANCE_STRENGTH_FALLBACK: ReassignmentDisruptionComposite = 'DISRUPT_MED';

@Injectable()
export class DefectorRecruitmentService {
  /**
   * Build the ONE `recruitment_candidates` row a qualifying rival (D8) surfaces for `(playerId, rivalKey,
   * gameDay)`. `pool='defector'`, `source_rival_key=rivalKey`, `citizen_id=null`. The qualitative profile
   * (design §3 "district familiarity band / prior-experience descriptor / ask band — NO stats, D14")
   * mirrors the SAME 4-field shape `SaltlineRecruitmentService.buildCandidateRows` uses, seeded on
   * `(playerId, rivalKey, gameDay)` — no `slot` ordinal needed (D8: at most ONE defector candidate per
   * qualifying rival, dedup-gated by the tick, never multiple simultaneous candidates off the same rival).
   */
  buildCandidateRow(playerId: string, rivalKey: string, gameDay: number): RecruitmentCandidateInsert {
    const seed = `recruitment-defector-candidate:${playerId}:${rivalKey}:${gameDay}`;
    const rng = makeRng(seed);
    const familiarityBands = ['LOW', 'MEDIUM', 'HIGH'] as const;
    const experienceBands = ['NONE', 'SOME', 'VETERAN'] as const;
    const askBands = ['LOW', 'FAIR', 'HIGH'] as const;
    return {
      player_id: playerId,
      pool: 'defector',
      citizen_id: null,
      source_rival_key: rivalKey,
      profile: {
        name: `Defector Contact (${rivalKey})`, // TD-046 placeholder (no invented nom-pool)
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
  // C5 — the gated step table (mirrors SaltlineRecruitmentService.stepSequence/finalGatedStep verbatim)
  // ═══════════════════════════════════════════════════════════════════════════════════════════

  /**
   * The ordered gated-decision sequence for `(stepsTotal, vettingSessions)` — design §5 defector steps
   * 2-5 ("2. Approach" / "3-4. Vetting (×`defector_vetting_sessions`)" / "5. Negotiate"); step 1 "Trigger"
   * (the candidate's existence, resolved by the D8 tick BEFORE `startQuest`) and step 6 "Onboarding +
   * hire" (the D10/D9 reveal, resolved by `finalizeHire`) are the non-gated bookends — mirrors Saltline's
   * own Open/Hire bookend shape verbatim.
   *
   * `vettingSessions` (the registered `defector_vetting_sessions` getter — design's own step-count
   * notation "×N") is the AUTHORITATIVE repeat count; `stepsTotal` (the registered `defector_quest_steps`
   * getter) is consulted ONLY as a defensive floor (mirrors Saltline's own documented `stepsTotal`-
   * ambiguity resolution, `saltline-recruitment.service.ts`'s header note) so a badly-tuned
   * `defector_quest_steps` override can never shrink the sequence below the 1 approach + 1 vetting + 1
   * negotiation minimum. At the registered defaults (stepsTotal=6, vettingSessions=2): gatedCount=4,
   * vettingRepeats=2 — EXACTLY the design's own "steps 3-4" reading; `current_step` reaches
   * `stepsTotal-1`=5 after all 4 gated decisions, matching Saltline's identical
   * "current_step reaches stepsTotal-1" invariant.
   */
  stepSequence(stepsTotal: number, vettingSessions: number): DefectorStepSpec[] {
    const gatedCount = Math.max(3, stepsTotal - 2); // reserve approach(1) + >=1 vetting + negotiation(1)
    const vettingRepeats = Math.max(1, Math.min(vettingSessions, gatedCount - 2));
    const out: DefectorStepSpec[] = [];
    out.push({ index: 1, decisionType: 'approach' });
    for (let i = 0; i < vettingRepeats; i += 1) {
      out.push({ index: out.length + 1, decisionType: 'vetting_session' });
    }
    out.push({ index: out.length + 1, decisionType: 'negotiation' });
    return out;
  }

  /** `current_step` value once ALL gated decisions for `(stepsTotal, vettingSessions)` are consumed — the
   *  "ready for hire" marker (mirrors `SaltlineRecruitmentService.finalGatedStep` verbatim). */
  finalGatedStep(stepsTotal: number, vettingSessions: number): number {
    return this.stepSequence(stepsTotal, vettingSessions).length + 1;
  }

  /**
   * Validate `decisionType`/`decisionValue` against `spec`'s closed domain (DD-R2 — mirrors
   * `SaltlineRecruitmentService.validateDecision`; `negotiation` REUSES the Saltline
   * `SALARY_BAND_DOMAIN`/`AUTONOMY_BAND_DOMAIN` verbatim, DRY — design §5 "Negotiation — as Saltline but
   * floor-shifted"; the floor-shift CONSEQUENCE — "a LOW offer = a decline-predicate input" — is an
   * honestly deferred TD, design §15 "decline-predicate depth"; C5 does not invent a live decline here).
   * Throws a plain `Error` — the service layer maps it to 422 VALIDATION_FAILED (mirrors Saltline).
   */
  validateDecision(spec: DefectorStepSpec, decisionType: string, decisionValue: unknown): void {
    if (decisionType !== spec.decisionType) {
      throw new Error(`expected decision_type '${spec.decisionType}' at this step, got '${decisionType}'`);
    }
    switch (spec.decisionType) {
      case 'approach':
        if (!DEFECTOR_APPROACH_DOMAIN.includes(decisionValue as DefectorApproach)) {
          throw new Error(`approach must be one of ${DEFECTOR_APPROACH_DOMAIN.join('|')}`);
        }
        return;
      case 'vetting_session': {
        const v = decisionValue as Partial<VettingDecisionValue> | null | undefined;
        if (!v || typeof v !== 'object' || typeof v.skip !== 'boolean') {
          throw new Error('vetting_session decision_value must be an object { skip: boolean }');
        }
        return;
      }
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

  /** The latest `approach` decision recorded in `decisions_made` (the D11 flavor-lineage input at hire).
   *  Absent/garbage → `undefined` (the caller falls back to the neutral DIRECT-shaped `{}` — never a
   *  crash; a quest can only reach `finalizeHire` after its approach step was validated, so this should
   *  always resolve on a real quest — defensive only). */
  extractApproach(decisions: RecruitmentDecisionEntry[]): DefectorApproach | undefined {
    for (let i = decisions.length - 1; i >= 0; i -= 1) {
      if (decisions[i].decision_type === 'approach') {
        const v = decisions[i].decision_value;
        if (DEFECTOR_APPROACH_DOMAIN.includes(v as DefectorApproach)) return v as DefectorApproach;
      }
    }
    return undefined;
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // C5 D9 — seeded vetting/double-agent rolls (deterministic via makeRng, the raid-bribe precompute pattern)
  // ═══════════════════════════════════════════════════════════════════════════════════════════

  /**
   * The residual double-agent probability AT HIRE (D9): `baseProbability`
   * (`defector_double_agent_probability_base`) reduced MULTIPLICATIVELY by `(1 - perSessionReduction)`
   * (`defector_vetting_double_agent_detection_probability_per_session`) for EACH vetting session ACTUALLY
   * RUN (`vettingSessionsRun` — `recruitment_quests.vetting_sessions_run`, never incremented by a skipped
   * session — "the residual risk stays at base" per a skip, design §5). Pure — the E2E floor's precompute
   * target: 0 vs N sessions run → N sessions strictly LOWER the result (deterministic, no RNG here — the
   * RNG only decides the ROLL below, not this probability).
   */
  computeResidualDoubleAgentProbability(
    baseProbability: number,
    perSessionReduction: number,
    vettingSessionsRun: number,
  ): number {
    const runs = Math.max(0, vettingSessionsRun);
    return baseProbability * Math.pow(1 - perSessionReduction, runs);
  }

  /**
   * The per-session detection roll (D9), seeded `(quest_id, session_n)` —
   * `defector_vetting_double_agent_detection_probability_per_session` is the roll's probability. A
   * qualitative "you caught wind of something" signal for THIS session — independent of the eventual
   * residual truth, which is rolled ONCE at hire (`rollDoubleAgent` below): vetting BUYS DOWN the residual
   * risk (`computeResidualDoubleAgentProbability`), it does not pre-reveal the final verdict.
   */
  rollVettingDetection(questId: string, sessionN: number, probability: number): boolean {
    return makeRng(`recruitment-defector-vetting-detection:${questId}:${sessionN}`).chance(probability);
  }

  /** The residual double-agent roll (D9), seeded `(quest_id)` — fired ONCE at `finalizeHire` against
   *  `computeResidualDoubleAgentProbability`'s output (the vetting-reduced probability). */
  rollDoubleAgent(questId: string, probability: number): boolean {
    return makeRng(`recruitment-defector-double-agent:${questId}`).chance(probability);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // C5 D10 — Maladaptive inheritance (THIN transposition onto the REAL Phase-11 settling window)
  // ═══════════════════════════════════════════════════════════════════════════════════════════

  /** Band ≥ `moderate` fires inheritance (design D10 — "band ≥ moderate -> inheritance fires"); `none`/
   *  `low` do not. Pure — `band` is `MaladaptiveMemoryService.getEscalationDepth`'s own output string. */
  maladaptiveInheritanceFires(band: string): boolean {
    return band === 'moderate' || band === 'deep';
  }

  /**
   * Resolve the registered `recruitment.maladaptive_memory_inheritance_strength_per_defector_origin_conflict`
   * composite (C1, default `'composite:strength_moderate'`) to a `ReassignmentDisruptionComposite` — the
   * SAME Phase-11 band `disruptionTicks` (`tenure-inertia.ts`) already consumes for the REAL settling
   * window (REUSE — the magnitude is calibrated by the EXISTING tenure-inertia curve, never a fresh
   * invented tick count). See `MALADAPTIVE_INHERITANCE_STRENGTH_REF` above for the ref table.
   */
  resolveMaladaptiveInheritanceDisruption(compositeThreshold: string): ReassignmentDisruptionComposite {
    return MALADAPTIVE_INHERITANCE_STRENGTH_REF[compositeThreshold] ?? MALADAPTIVE_INHERITANCE_STRENGTH_FALLBACK;
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // C5 D11 — flavor lineage (the approach's flag subset over the SHIPPED 8-flag vocabulary)
  // ═══════════════════════════════════════════════════════════════════════════════════════════

  /**
   * The lineage flag subset `HiddenCurriculumService.setNormsFlags` writes at hire for `approach` (design
   * §5 step 2 + decisions §1.11 — "exact flag selections... not invented member names"; all 3 keys below
   * ARE shipped `NormsFlags` members, `hidden-curriculum.service.ts:133-142`). `DIRECT` → `{}` (clean/no
   * write — Saltline's OWN neutral-base convention, C3); `SALTLINE_INTERMEDIARY` → a MIXED subset (a
   * vetted broker channel: discreet AND punctual); `CORRUPT_CLERK` → a narrower CORRUPTED subset
   * (secretive ONLY — discretion without the accompanying punctuality a clean channel earns). All defaults
   * are `false` (`DEFAULT_NORMS_FLAGS`) — the subset below is exactly which flags this approach turns ON.
   */
  normsFlagsForApproach(approach: DefectorApproach): Partial<NormsFlags> {
    switch (approach) {
      case 'DIRECT':
        return {};
      case 'SALTLINE_INTERMEDIARY':
        return { discretion_around_civilians: true, punctuality: true };
      case 'CORRUPT_CLERK':
        return { discretion_around_civilians: true };
    }
  }
}
