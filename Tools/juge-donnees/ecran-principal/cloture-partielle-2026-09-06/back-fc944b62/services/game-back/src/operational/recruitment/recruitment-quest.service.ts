// IMPLEMENTS: docs/superpowers/plans/2026-07-11-04f-B-recruitment-plan.md C2 (Quest machine + Saltline
//             pool — start/advance/abandon + the D2 session gate)
//             Design: docs/superpowers/specs/2026-07-11-04f-B-recruitment-design.md §4 (the quest state
//             machine — D1/D2) + §10 (player endpoints) + §14 (zero-regression contract)
//             Decisions: D2 (§1.2 — the session gate is GAME time, anti-one-click) / DD-R2 (step tables) /
//             DD-R3 (`expected_outcome` untouched here, C3's mapper leg)
//             — 04f-B C2 — 2026-07-11
//
// `RecruitmentQuestService` — the SHARED quest state machine (design calls it the machine every pool rides;
// C2 wired it for the Saltline pool; C5 (this extension) wires the Defector pool onto the SAME
// `advanceStep`/`finalizeHire` engine, pool-dispatched, not rebuilt per-pool — civilian is C6's own
// addition). `startQuest` / `advanceStep` / `abandon` / `finalizeHire`.
//
// R2.2 PROJECTION: `projectQuest`/`projectCandidate` return ONLY qualitative/closed-domain fields. Saltline's
// decision domains (CURIOUS/DIRECT/CAUTIOUS, LOGISTICS/MUSCLE/FIXER, LOW/FAIR/GENEROUS, TIGHT/BALANCED/LOOSE)
// never carry a sensitive field, so its player projection is the RAW `decisions_made` content (no leak-scan
// risk). Defector's `vetting_session` entries DO carry server-only D9 internals (`detected`/`session_n`) —
// `sanitizeDecisionsForProjection` (C5, below) strips them at the projection boundary; `double_agent` itself
// lives only on the quest row (never part of `QuestProjection` at all — R2.2-clean by construction).

import { Injectable } from '@nestjs/common';
import { CityEventBus } from '../../citysim/events/city-event-bus';

import { ApiError } from '../../protocol/api-error';
import { isUuid } from '../../common/param-pipes';
import { lieutenantTunables } from '../lieutenant/lieutenant-tunables';
import { LieutenantService } from '../lieutenant/lieutenant.service';
import { LieutenantRepository } from '../lieutenant/lieutenant.repository';
import type { LieutenantArchetype } from '../lieutenant/lieutenant-archetype';
import { disruptionTicks } from '../lieutenant/tenure-inertia';
import { HiddenCurriculumService } from '../reputation/hidden-curriculum.service';
import type { NormsFlags } from '../reputation/hidden-curriculum.service';
import { ForbiddenTriadDetectionService } from '../reputation/forbidden-triad.service';
// C5 (D13) — the IA couple: `recordCorruptUse` activates the 'clerk' target type at the
// CORRUPT_CLERK approach step. ⚠️ CORRIGÉ 2026-08-08 (W6a C3-bis) — `clerk` was mislabeled
// "reserved-inert" here; it is LIVE (this is its production caller — see `ia-target.service.ts`
// file header for the correction history). C5 (D10) — the Maladaptive couple: `getEscalationDepth`
// (pure) + the per-(player,rival) depth read (`CombatRepository.readEscalationPair`) feed the
// onboarding band-read.
import { IATargetService } from '../internal_affairs/ia-target.service';
import { MaladaptiveMemoryService } from '../conflict/combat/maladaptive-memory.service';
import { CombatRepository } from '../conflict/combat/combat.repository';
import type { RivalKey } from '../conflict/rival/rival-ai.types';
import { recruitmentTunables } from './recruitment-tunables';
import { RecruitmentConflictError, RecruitmentRepository, type RecruitmentDecisionEntry } from './recruitment.repository';
import { SaltlineRecruitmentService, type NegotiationDecisionValue, type SaltlineStepSpec } from './saltline-recruitment.service';
import { DefectorRecruitmentService, type DefectorStepSpec, type DefectorApproach } from './defector-recruitment.service';
import { CivilianRecruitmentService, AFFINITY_SOURCE_PLAYER, type CivilianStepSpec, type InitiationTask } from './civilian-recruitment.service';
import {
  RecruitmentQuestOutcomeMapper,
  MAPPER_KNOWN_ARCHETYPES,
  SALARY_BAND_MULTIPLIER,
  computeHireQualityBucket,
  computeLoyaltySeedBucket,
  extractNegotiationDecision,
  extractRevealedAxis,
} from './recruitment-quest-outcome-mapper';
import type { RecruitmentCandidateRow, RecruitmentQuestRow } from '../../db/schema/recruitment';

/** The pool types this service KNOWS about. `saltline` (C2/C3) + `defector` (C5) + `civilian` (C6, this
 *  chunk) — all 3 `lieutenant_source` enum members (REUSE, DD-R1) now wired end-to-end. */
const SUPPORTED_QUEST_TYPES = new Set(['saltline', 'defector', 'civilian']);

export interface QuestProjection {
  quest_id: string;
  pool: string;
  candidate_id: string;
  current_step: number;
  steps_total: number;
  final_gated_step: number;
  sessions_consumed: number;
  session_ready: boolean;
  next_session_ready_at_game_minute: number | null;
  decisions: RecruitmentDecisionEntry[];
  outcome: string | null;
}

@Injectable()
export class RecruitmentQuestService {
  constructor(
    private readonly repo: RecruitmentRepository,
    private readonly saltline: SaltlineRecruitmentService,
    // C5 — the defector pool's PURE step/roll/mapping logic (zero-DI, mirrors SaltlineRecruitmentService).
    private readonly defector: DefectorRecruitmentService,
    // C6 — the civilian pool's PURE step/decline/fit logic (zero-DI, mirrors DefectorRecruitmentService).
    private readonly civilian: CivilianRecruitmentService,
    // C3 — finalizeHire's dependencies: the mapper (D3) + the recruit gate chain REUSE (D4, the C7 seam) +
    // the 2 pool-agnostic couples (D11 — REUSE the R10-reserved exports, never re-implemented).
    private readonly mapper: RecruitmentQuestOutcomeMapper,
    private readonly lieutenants: LieutenantService,
    private readonly hiddenCurriculum: HiddenCurriculumService,
    private readonly forbiddenTriad: ForbiddenTriadDetectionService,
    // C5 — the defector-only DI-requiring couples (kept OUT of DefectorRecruitmentService so its pure step/
    // roll logic stays bare-instantiable in tests — see that file's header "ARCHITECTURE NOTE").
    // D13: the IA corrupt-clerk couple (`recordCorruptUse`, fired at the approach step). ⚠️ W6a C3-bis
    // (2026-08-08): the rep-bucket resolver (BossMirrorService) USED to be injected here too, to
    // replicate `IATargetService.handleTier3LawyerUsed`'s own resolution VERBATIM before calling
    // `recordCorruptUse` — `recordCorruptUse` now resolves it internally, so that duplicate lookup
    // (and its DI) is REMOVED here, not moved (C3-bis.2 — "supprime la copie").
    private readonly iaTarget: IATargetService,
    // D10: the Maladaptive band read (getEscalationDepth over the REAL per-(player,rival) depth) at
    // onboarding + D10's settling-window arm (LieutenantRepository.setSettlingUntil, the Phase-11 seam).
    private readonly maladaptiveMemory: MaladaptiveMemoryService,
    private readonly combatRepo: CombatRepository,
    private readonly lieutenantRepo: LieutenantRepository,
    // P3-D C6 — CityEventBus (from SchedulerModule, already imported into RecruitmentModule for C4's
    // NIGHTLY/23 availability tick — no new import needed): emits HIRE_COMPLETED for the annealing
    // subscriber (design §9.2), pool-agnostic (saltline/defector/civilian all funnel through finalizeHire).
    private readonly bus: CityEventBus,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // startQuest
  // ═══════════════════════════════════════════════════════════════════════════════════════════

  async startQuest(playerId: string, candidateId: string, questType: string): Promise<QuestProjection> {
    if (!SUPPORTED_QUEST_TYPES.has(questType)) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `quest_type '${questType}' is not a supported pool yet (saltline/defector only — civilian is C6).`,
      });
    }
    const candidate = await this.repo.getCandidateForPlayer(playerId, candidateId);
    if (!candidate) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'No such candidate for this player.' });
    }
    if (candidate.pool !== questType) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `quest_type '${questType}' does not match the candidate's pool '${candidate.pool}'.`,
      });
    }
    if (candidate.status !== 'available') {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `candidate is not available (status='${candidate.status}').`,
      });
    }
    // Roster-cap PRE-CHECK courtesy (design §4 — "the BINDING gate at hire is authoritative"; this is a
    // cheap read-only guard so a doomed quest is never even started, not a substitute for C3's real gate).
    const rosterCount = await this.repo.countLieutenants(playerId);
    if (rosterCount >= lieutenantTunables.maxCountPerPlayer) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `roster is full (${rosterCount}/${lieutenantTunables.maxCountPerPlayer}) — cannot start a recruitment quest.`,
      });
    }
    const gameMinuteNow = await this.repo.getCurrentGameMinute(playerId);
    let quest: RecruitmentQuestRow;
    try {
      quest = await this.repo.startQuestAtomic({ playerId, candidateId, questType, gameMinuteNow });
    } catch (err) {
      if (err instanceof RecruitmentConflictError) {
        throw new ApiError('RESOURCE_STATE_CONFLICT', { message: err.message });
      }
      throw err;
    }
    return this.projectQuest(quest, gameMinuteNow);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // advanceStep — the D2 session gate + the closed decision-domain wall
  // ═══════════════════════════════════════════════════════════════════════════════════════════

  async advanceStep(
    playerId: string,
    questId: string,
    decisionType: string,
    decisionValue: unknown,
  ): Promise<QuestProjection> {
    const quest = await this.repo.getQuestForPlayer(playerId, questId);
    if (!quest) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'No such recruitment quest for this player.' });
    }
    if (quest.outcome !== null) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', { message: `quest already ended (outcome='${quest.outcome}').` });
    }
    // Pool dispatch (C5/C6 — saltline + defector + civilian all wired; SUPPORTED_QUEST_TYPES guards
    // startQuest, so an existing quest's quest_type is always one of these three today — the else-branch
    // is belt-and-braces only).
    const isDefector = quest.quest_type === 'defector';
    const isCivilian = quest.quest_type === 'civilian';
    let stepsTotal: number;
    let sequence: Array<{ index: number; decisionType: string }>;
    if (quest.quest_type === 'saltline') {
      stepsTotal = recruitmentTunables.saltlineQuestSteps;
      sequence = this.saltline.stepSequence(stepsTotal);
    } else if (isDefector) {
      stepsTotal = recruitmentTunables.defectorQuestSteps;
      sequence = this.defector.stepSequence(stepsTotal, recruitmentTunables.defectorVettingSessions);
    } else if (isCivilian) {
      stepsTotal = recruitmentTunables.civilianQuestSteps;
      sequence = this.civilian.stepSequence(stepsTotal, recruitmentTunables.civilianCourtingSessions);
    } else {
      throw new ApiError('VALIDATION_FAILED', { message: `pool '${quest.quest_type}' is not wired yet.` });
    }
    const gatedIndex = quest.current_step - 1; // 0-based index into `sequence`
    if (gatedIndex < 0 || gatedIndex >= sequence.length) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: 'quest has no further gated decisions — ready for hire (a separate action).',
      });
    }
    const spec = sequence[gatedIndex];

    // ★ THE D2 SESSION GATE (the anti-one-click keystone) — GAME time only, never wall-clock. REUSE across
    // BOTH pools (C5 "session-gate on the 6 steps" — the SAME formula, no pool-specific carve-out).
    const gameMinuteNow = await this.repo.getCurrentGameMinute(playerId);
    const sessionMinutes = recruitmentTunables.questSessionDurationInGameHours * 60;
    const elapsed = gameMinuteNow - (quest.last_advanced_at_game_minute ?? gameMinuteNow);
    if (elapsed < sessionMinutes) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message:
          `session not ready: ${elapsed} game-minutes elapsed since the last advance, ` +
          `${sessionMinutes} required.`,
        payloadVars: { elapsed_game_minutes: elapsed, required_game_minutes: sessionMinutes },
      });
    }

    try {
      if (isDefector) {
        this.defector.validateDecision(spec as DefectorStepSpec, decisionType, decisionValue);
      } else if (isCivilian) {
        this.civilian.validateDecision(spec as CivilianStepSpec, decisionType, decisionValue);
      } else {
        this.saltline.validateDecision(spec as SaltlineStepSpec, decisionType, decisionValue);
      }
    } catch (err) {
      throw new ApiError('VALIDATION_FAILED', { message: err instanceof Error ? err.message : String(err) });
    }

    // C6 — the `affinity_source` closed-list OWNERSHIP check (design §5 step 1: "closed list of the
    // player's OWN lieutenants") — a DB-touching check kept OUT of `CivilianRecruitmentService.
    // validateDecision` (that method stays pure/shape-only; the defector ARCHITECTURE NOTE's SAME
    // discipline: DI-requiring checks are orchestrated here). `AFFINITY_SOURCE_PLAYER` ('player') is
    // always legal (no lieutenant — the D11 clean/neutral inheritance case, below).
    if (isCivilian && spec.decisionType === 'affinity_source' && decisionValue !== AFFINITY_SOURCE_PLAYER) {
      // r2/BLOCKING-1(b) — `decisionValue` is polymorphic (design §5: a uuid in THIS branch, a literal
      // elsewhere), so it stays classified `libre` at the table's top level — but IN this branch it
      // reaches `playerOwnsLieutenant`'s `eq(lieutenant.lieutenant_id, ...)`, a `uuid` column
      // (lieutenant.ts). `CivilianRecruitmentService.validateDecision` only checks "a non-empty string"
      // (shape-only, by design — it stays DI-free/pure) BEFORE this DB-touching check runs — a
      // non-uuid-shaped string reached the query unguarded (Postgres 22P02). Format-gate HERE, at the
      // one call site that actually treats this value as a uuid.
      if (!isUuid(decisionValue)) {
        throw new ApiError('VALIDATION_FAILED', {
          message: `affinity_source must be '${AFFINITY_SOURCE_PLAYER}' or one of the player's own lieutenant ids (a uuid).`,
          details: { param: 'decision_value' },
        });
      }
      const owns = await this.repo.playerOwnsLieutenant(playerId, decisionValue);
      if (!owns) {
        throw new ApiError('VALIDATION_FAILED', {
          message: `affinity_source must be '${AFFINITY_SOURCE_PLAYER}' or one of the player's own lieutenant ids.`,
        });
      }
    }

    const decisionEntry: RecruitmentDecisionEntry = {
      step: quest.current_step,
      decision_type: decisionType,
      decision_value: decisionValue,
      at_game_minute: gameMinuteNow,
    };
    // The TrialAxisBucket reveal (gdd/15:2943) — a REAL mechanical output of resolving the Trial step,
    // recorded alongside (not inside) the player's own closed-domain input.
    if (spec.decisionType === 'trial_task') {
      decisionEntry.revealed_axis = this.saltline.revealTrialAxis(quest.candidate_id);
    }

    // C5 D9 — the vetting intel-op: a REAL (non-skipped) vetting_session decision guards a debit +
    // performs a seeded per-session detection roll (`(quest_id, session_n)`), recorded server-side on the
    // decision entry (`detected`/`session_n` — masked out of the PLAYER projection, `projectQuest`'s own
    // "D9 masking pass" below). A `skip:true` decision touches NEITHER (design §5 — "the residual risk
    // stays at base").
    let debit: { playerId: string; costCents: number } | undefined;
    let incrementVettingSessionsRun = false;
    if (isDefector && spec.decisionType === 'vetting_session') {
      const v = decisionValue as { skip?: boolean };
      if (v?.skip === true) {
        decisionEntry.skipped = true;
      } else {
        const sessionN = quest.vetting_sessions_run + 1;
        const detectionProbability = recruitmentTunables.defectorVettingDoubleAgentDetectionProbabilityPerSession;
        decisionEntry.detected = this.defector.rollVettingDetection(questId, sessionN, detectionProbability);
        decisionEntry.session_n = sessionN;
        debit = { playerId, costCents: recruitmentTunables.defectorVettingCostCents };
        incrementVettingSessionsRun = true;
      }
    }

    let updated: RecruitmentQuestRow | null;
    try {
      updated = await this.repo.advanceQuestAtomic({
        questId,
        expectedCurrentStep: quest.current_step,
        decisionEntry,
        gameMinuteNow,
        debit,
        incrementVettingSessionsRun,
      });
    } catch (err) {
      if (err instanceof RecruitmentConflictError) {
        throw new ApiError('RESOURCE_STATE_CONFLICT', { message: err.message });
      }
      throw err;
    }
    if (!updated) {
      // A concurrent advance won the race between our read and our write — a clean conflict, not a crash.
      throw new ApiError('RESOURCE_STATE_CONFLICT', { message: 'quest was concurrently advanced — retry.' });
    }

    // C5 D13 — the IA corrupt-clerk couple. Fires AFTER the decision is DURABLY recorded (never before —
    // a raced/retried advance that loses the guarded UPDATE must NEVER have already burned the IA
    // suspicion cost). "the suspicion cost is incurred at the approach, not at hire" (design §5/D13) — a
    // player who abandons the quest right after HAS still burned the clerk exposure.
    if (isDefector && spec.decisionType === 'approach' && decisionValue === 'CORRUPT_CLERK') {
      await this.recordCorruptClerkApproach(playerId, quest.candidate_id, gameMinuteNow);
    }

    // C6 — the PRESSING-twice decline predicate (design §5 steps 2-3: "PRESSING accelerates but feeds the
    // decline predicate — entering the criminal economy is a big ask"). Fires AFTER the decision is
    // DURABLY recorded (the SAME "never before a durable write" discipline the D13 IA couple uses, above)
    // — ends the quest IMMEDIATELY (`declined_candidate`; the candidate NEVER reverts to `available` —
    // the design's own "candidate NOT re-available" wording).
    if (
      isCivilian &&
      spec.decisionType === 'courting_session' &&
      this.civilian.declinePredicateFires((updated.decisions_made as unknown as RecruitmentDecisionEntry[]) ?? [])
    ) {
      const declined = await this.repo.declineQuestAtomic(questId, updated.candidate_id);
      if (declined) {
        return this.projectQuest(declined, gameMinuteNow);
      }
    }

    return this.projectQuest(updated, gameMinuteNow);
  }

  /**
   * D13 — the IA couple: `IATargetService.recordCorruptUse(playerId, clerkRef, 'clerk', 'small_bribe',
   * gameMinute)` — `'clerk'`'s production activation. `clerkRef` (the "soft ref" `targetNpcId` —
   * `internal_affairs_targets.target_npc_id` has NO DB FK, `internal_affairs.ts:172`) is the DEFECTOR
   * CANDIDATE's own id (`recruitment_candidates.candidate_id`): the corrupt clerk being bribed IS the
   * one who can surface / vouch for THIS specific candidate — a stable, deterministic target (never
   * re-derived/random), so repeated players bribing the same candidate's clerk accrue onto the SAME
   * target row (the shipped cooperators/weight_per_player semantics, untouched).
   *
   * ⚠️ W6a C3-bis (2026-08-08): this method USED to resolve `playerReputationBucket` itself
   * (`getConsistencyIndex` → `IA_HIGH_REP_THRESHOLD` split), replicating `IATargetService
   * .handleTier3LawyerUsed`'s own resolution VERBATIM (that lookup was `@internal` there, not
   * exported). `recordCorruptUse` now does that resolution INTERNALLY (C3-bis.2) — this call site
   * drops the duplicate rather than keep feeding it a now-nonexistent parameter.
   *
   * ★ This call is also `recordCorruptUse`'s referent guard's LIVE positive case for `clerk`
   * (C3-bis.1): `candidateId` is `quest.candidate_id`, and `getQuestForPlayer(playerId, questId)`
   * (`:344` below, in `advance`) already proved `playerId` owns this quest/candidate before this
   * method is ever reached — so the guard's DB round-trip re-confirms an ownership this call site
   * already established, rather than gating anything new on THIS path (defense-in-depth, not the
   * primary defense — the primary defense is `getQuestForPlayer`).
   */
  private async recordCorruptClerkApproach(playerId: string, candidateId: string, gameMinute: number): Promise<void> {
    await this.iaTarget.recordCorruptUse(playerId, candidateId, 'clerk', 'small_bribe', gameMinute);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // abandon
  // ═══════════════════════════════════════════════════════════════════════════════════════════

  async abandon(playerId: string, questId: string): Promise<{ quest_id: string; outcome: 'abandoned' }> {
    const quest = await this.repo.getQuestForPlayer(playerId, questId);
    if (!quest) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'No such recruitment quest for this player.' });
    }
    if (quest.outcome !== null) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', { message: `quest already ended (outcome='${quest.outcome}').` });
    }
    const result = await this.repo.abandonQuestAtomic(questId, quest.candidate_id);
    if (!result) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', { message: 'quest already ended.' });
    }
    return { quest_id: result.quest_id, outcome: 'abandoned' };
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // finalizeHire (C3 — the ★ C7 seam consumer: D3 mapper → D4 recruit extension → D5/D6 buckets → D11 couples)
  // ═══════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `finalizeHire(playerId, questId, archetype, assignedBuildingId, targetBuildingId)` — pool-dispatched
   * (C5: saltline + defector; civilian = C6), only legal at the quest's final gated step (409 otherwise —
   * floor point (i)), AND only once the SAME D2 session gate that guards every `advanceStep` has ALSO
   * elapsed since the last advance (the "4th D2 gap" — 3-4 gated advances + 1 more session gap before hire).
   * Builds the seed script (D3, the mapper — parsed + compiled BEFORE any tx, `valid=true` asserted or this
   * method throws — the C7 contract); for defector ONLY, ALSO resolves the D10 Maladaptive onboarding
   * reveal (band read → loyalty downgrade + settling-window arm) and the D9 seeded residual double-agent
   * roll (vetting-reduced probability → flag + a further downgrade) BEFORE the recruit call. Computes the
   * negotiated hire debit (salary_band × `saltlineHireCostCents`, REUSED by both pools) + the composite
   * buckets (D5/D6), then calls `LieutenantService.recruit` with the D4 additive extension
   * (`source=quest.quest_type`, the compiled `initialScript`, the debit, the buckets) — the SAME atomic
   * gate chain (binding registry / R10 poll / roster cap / guarded debit) every classic recruit runs; a
   * roster-cap 409 (or any other recruit-gate refusal) propagates WITHOUT any quest mutation attempted
   * (floor point (i)). On success: the 2 pool-agnostic couples (D11) run — `updateStrongTieMembership`
   * (all pools, sessions-as-interactions) + `setNormsFlags` (Saltline: the BASE/neutral row `{}`; defector:
   * the approach-conditioned flavor subset, C5 — civilian's affinity-source flavor lands at C6) — then, for
   * defector, the D10 settling-window ARM (if the Maladaptive band fired) — then the quest row is atomically
   * finalized (`outcome='hired'`, `hire_quality_bucket`, `expected_outcome`, `double_agent` for defector) +
   * the candidate → `'hired'`.
   */
  async finalizeHire(
    playerId: string,
    questId: string,
    archetype: string,
    assignedBuildingId: string,
    targetBuildingId: string | null,
  ): Promise<{
    quest_id: string;
    outcome: 'hired';
    lieutenant_id: string;
    hire_quality_bucket: string;
    loyalty_seed_bucket: string;
  }> {
    const quest = await this.repo.getQuestForPlayer(playerId, questId);
    if (!quest) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'No such recruitment quest for this player.' });
    }
    if (quest.outcome !== null) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', { message: `quest already ended (outcome='${quest.outcome}').` });
    }
    const isDefector = quest.quest_type === 'defector';
    const isCivilian = quest.quest_type === 'civilian';
    if (quest.quest_type !== 'saltline' && !isDefector && !isCivilian) {
      throw new ApiError('VALIDATION_FAILED', { message: `pool '${quest.quest_type}' hire is not wired yet.` });
    }
    const stepsTotal = isDefector
      ? recruitmentTunables.defectorQuestSteps
      : isCivilian
        ? recruitmentTunables.civilianQuestSteps
        : recruitmentTunables.saltlineQuestSteps;
    const finalGatedStep = isDefector
      ? this.defector.finalGatedStep(stepsTotal, recruitmentTunables.defectorVettingSessions)
      : isCivilian
        ? this.civilian.finalGatedStep(stepsTotal, recruitmentTunables.civilianCourtingSessions)
        : this.saltline.finalGatedStep(stepsTotal);
    if (quest.current_step !== finalGatedStep) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `quest is not ready for hire (current_step=${quest.current_step}, needs ${finalGatedStep} — gated decisions remain).`,
      });
    }
    if (!MAPPER_KNOWN_ARCHETYPES.includes(archetype as LieutenantArchetype)) {
      throw new ApiError('VALIDATION_FAILED', { message: `archetype '${archetype}' is not a supported archetype.` });
    }

    // ★ THE 4th D2 GAP — the hire itself is session-gated, the SAME formula `advanceStep` uses (GAME time,
    // never wall-clock). A quest that JUST reached its final gated step still needs one more session before
    // the hire itself lands.
    const gameMinuteNow = await this.repo.getCurrentGameMinute(playerId);
    const sessionMinutes = recruitmentTunables.questSessionDurationInGameHours * 60;
    const elapsed = gameMinuteNow - (quest.last_advanced_at_game_minute ?? gameMinuteNow);
    if (elapsed < sessionMinutes) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message:
          `hire session not ready: ${elapsed} game-minutes elapsed since the last advance, ` +
          `${sessionMinutes} required.`,
        payloadVars: { elapsed_game_minutes: elapsed, required_game_minutes: sessionMinutes },
      });
    }

    const decisions = (quest.decisions_made as unknown as RecruitmentDecisionEntry[]) ?? [];
    const targetArchetype = archetype as LieutenantArchetype;

    // D3 — the seed script. Compiled BEFORE any tx (the C7 contract): a diagnostic here is an internal bug
    // (the vocabulary table is closed/C0-verified) and THROWS (500) — never a hire with an unseeded/invalid
    // script. (Defector decisions carry NO `opening_line` — the mapper's own extractor falls back to
    // 'CURIOUS'/exploratory, unchanged C3 behavior; C5 does not add a defector-specific script archetype —
    // out of this chunk's scope, REUSE verbatim per the handoff.) C6 — civilian uses its OWN fixed-shape
    // SHORT script (`mapCivilianSeedScript`, design §5 "the SHORTER script variant... no prior experience")
    // instead of the decisions-driven mapper (civilian's decision vocabulary has no `opening_line`/
    // `trial_task`/`negotiation` to branch on at all).
    const seedScript = isCivilian
      ? this.mapper.mapCivilianSeedScript(targetArchetype)
      : this.mapper.mapDecisionsToSeedScript(decisions, targetArchetype);

    // ─── C5 D10/D9 — onboarding (defector ONLY): the Maladaptive band read + the residual double-agent
    // roll. Both run BEFORE the recruit call (the loyalty-seed bucket + the settling-arm decision both need
    // to be resolved before/alongside the atomic recruit; the settling ARM itself needs `recruited.
    // lieutenant_id`, so it is applied AFTER recruit succeeds, below). ───────────────────────────────────
    let downgrade = false;
    let settlingTicks: number | undefined;
    let doubleAgent: boolean | undefined;
    if (isDefector) {
      // D10 — the onboarding Maladaptive reveal: band read for (player, source_rival_key) off the REAL
      // per-(player,rival) depth (`escalation_pair_state.conflict_memory_depth`, REUSE — no per-lieutenant
      // memory store invented). A candidate with no `source_rival_key` (should never happen — every D8-
      // surfaced defector candidate carries one, C4) degrades to 'none' (no inheritance) rather than crash.
      const candidate = await this.repo.getCandidateForPlayer(playerId, quest.candidate_id);
      const rivalKey = candidate?.source_rival_key ?? null;
      if (rivalKey) {
        const pair = await this.combatRepo.readEscalationPair(playerId, rivalKey as RivalKey);
        const depth = pair?.conflict_memory_depth ?? 0;
        const band = this.maladaptiveMemory.getEscalationDepth(depth);
        if (this.defector.maladaptiveInheritanceFires(band)) {
          downgrade = true;
          const disruption = this.defector.resolveMaladaptiveInheritanceDisruption(
            recruitmentTunables.maladaptiveMemoryInheritanceStrengthPerDefectorOriginConflict,
          );
          settlingTicks = disruptionTicks(disruption, lieutenantTunables.tenureInertia.reassignmentDisruptionCurve);
        }
      }

      // D9 — the residual double-agent roll, seeded `(quest_id)`, at the vetting-reduced probability
      // (`vetting_sessions_run` — REAL sessions only, skipped ones never reduce it).
      const residualProbability = this.defector.computeResidualDoubleAgentProbability(
        recruitmentTunables.defectorDoubleAgentProbabilityBase,
        recruitmentTunables.defectorVettingDoubleAgentDetectionProbabilityPerSession,
        quest.vetting_sessions_run,
      );
      doubleAgent = this.defector.rollDoubleAgent(questId, residualProbability);
      if (doubleAgent) downgrade = true; // D9 — a double agent ALSO downgrades the loyalty seed (D5).
    }

    // C6 — the civilian initiation-task/demographic fit check (design §5 step 3': "LEDGER/LOOKOUT keep
    // `seeded`; a failed-fit... drops to `tested`"). Reads the candidate's citizen demographic (D7's own
    // surfaced row) — a candidate with no `citizen_id` (should never happen, C4 always sets it for a
    // civilian candidate) degrades to no-mismatch rather than crash; an unresolved `initiation_task`
    // (should never happen either — `finalGatedStep` guards it above) falls back to `LEDGER` (never
    // mismatches — the SAFE fallback, never a spurious downgrade from a defensive branch).
    let civilianInitiationMismatch = false;
    if (isCivilian) {
      const candidate = await this.repo.getCandidateForPlayer(playerId, quest.candidate_id);
      const initiationTask: InitiationTask = this.civilian.extractInitiationTask(decisions) ?? 'LEDGER';
      if (candidate?.citizen_id) {
        const demographic = await this.repo.getCitizenDemographic(candidate.citizen_id);
        civilianInitiationMismatch = this.civilian.initiationMismatch(initiationTask, demographic ?? 'routine');
      }
    }

    // D5/D6 — the composite buckets (server-only weights; only the bucket crosses the player boundary).
    // `bucketDowngrade` is pool-conditioned: defector's D9/D10 down-move (`downgrade`, computed above) or
    // civilian's initiation-mismatch down-move (`civilianInitiationMismatch`, computed above); ignored for
    // saltline (`computeLoyaltySeedBucket`'s own pool-conditioned meaning — see its own doc).
    const hireQualityBucket = computeHireQualityBucket(decisions, targetArchetype);
    const bucketDowngrade = isCivilian ? civilianInitiationMismatch : downgrade;
    const loyaltySeedBucket = computeLoyaltySeedBucket(quest.quest_type, bucketDowngrade);

    // D4 — the negotiated one-time hire debit (salary_band × the registered base). `negotiation` is always
    // present by the time a quest reaches `finalGatedStep` (it is the LAST gated decision for both pools)
    // — the fallback is defensive, never expected to fire on a valid quest. Defector REUSES the SAME
    // `saltlineHireCostCents` base (design §12/C1 — "the design names only ONE concrete key"; the
    // defector-demands-more floor-shift is the honestly-deferred decline-predicate input, not a 2nd key).
    const negotiation = extractNegotiationDecision(decisions);
    const salaryBand = negotiation?.salary_band ?? 'FAIR';
    const hireCostCents = Math.round(recruitmentTunables.saltlineHireCostCents * SALARY_BAND_MULTIPLIER[salaryBand]);

    // D4 — the SAME recruit gate chain every classic recruit runs (binding registry / R10 poll / roster cap
    // / the guarded debit, now atomic with the recruit tx). Any refusal (404/409/422) propagates HERE —
    // BEFORE any quest-row mutation is attempted (floor point (i): "roster cap full → 409 with NO quest
    // mutation").
    const recruited = await this.lieutenants.recruit(playerId, archetype, assignedBuildingId, targetBuildingId, {
      source: quest.quest_type,
      initialScript: { source: seedScript.source, rules: seedScript.rules },
      hireCostCents,
      loyaltySeedBucket,
      recruitmentQuestId: questId,
    });

    // D11 — the pool-agnostic couple: `updateStrongTieMembership`, sessions-as-interactions, ALL pools
    // (design §8 row 2).
    await this.forbiddenTriad.updateStrongTieMembership(playerId, recruited.lieutenant_id, quest.sessions_consumed);

    // D11 — flavor lineage: Saltline writes the BASE/neutral row (`{}`, C3 — no flavor mapping of its own);
    // defector's approach-conditioned flag subset (C5) UPDATES that same convention with a REAL flavor;
    // civilian's affinity-source NORMS-COPY (C6) does likewise with the chosen source lieutenant's flags.
    if (isDefector) {
      const approach = this.defector.extractApproach(decisions) ?? 'DIRECT';
      const flags = this.defector.normsFlagsForApproach(approach);
      await this.hiddenCurriculum.setNormsFlags(recruited.lieutenant_id, playerId, flags);
      // D10 — the settling-window ARM (the REAL Phase-11 disruption penalty): only when the Maladaptive
      // band fired above. Runs AFTER recruit (needs `recruited.lieutenant_id`) — `gameMinuteNow` here is
      // the SAME already-elapsed-4th-D2-gap reading used for the session-gate check above (no extra clock
      // read; the arm is stamped at the moment of hire, per D10's "armed at hire" wording).
      if (settlingTicks !== undefined) {
        await this.lieutenantRepo.setSettlingUntil(recruited.lieutenant_id, gameMinuteNow + settlingTicks);
      }
    } else if (isCivilian) {
      // D11 — norms inheritance (design §5 step 1 + decisions §1.11): "copy the ON flags of the chosen
      // affinity-source lieutenant's `readNormsVector`... source-sensitive — a different source yields
      // different flags." `affinity_source='player'` (no specific lieutenant — orbiting the player) OR an
      // affinity-source lieutenant with NO norms row yet (never reviewed / classic pre-04f-B recruit that
      // never went through `setNormsFlags`) → the SAME clean/neutral `{}` convention Saltline's own base
      // write uses (never a crash — `readNormsVector` returns `null` for a row-less lieutenant).
      const affinitySource = this.civilian.extractAffinitySource(decisions);
      let inheritedFlags: Partial<NormsFlags> = {};
      if (affinitySource && affinitySource !== AFFINITY_SOURCE_PLAYER) {
        // W6a C4: mechanical adaptation forced by `readNormsVector`'s new signature — the
        // affinity-source lieutenant is always one of `playerId`'s OWN existing lieutenants
        // (D11 "orbiting the player"), so this is not itself a correctness change.
        const sourceVector = await this.hiddenCurriculum.readNormsVector(affinitySource, playerId);
        if (sourceVector) inheritedFlags = sourceVector.norms_flags;
      }
      await this.hiddenCurriculum.setNormsFlags(recruited.lieutenant_id, playerId, inheritedFlags);
    } else {
      await this.hiddenCurriculum.setNormsFlags(recruited.lieutenant_id, playerId, {});
    }

    const expectedOutcome = {
      script_style: seedScript.scriptStyle,
      axis: extractRevealedAxis(decisions) ?? null,
      quality_preview: hireQualityBucket,
    };
    const finalized = await this.repo.finalizeHireAtomic({
      questId,
      candidateId: quest.candidate_id,
      hireQualityBucket,
      expectedOutcome,
      doubleAgent,
    });
    if (!finalized) {
      // A concurrent abandon/hire won the race on the quest row AFTER the lieutenant was already created
      // (the documented sequential-tx boundary, C3 handoff report) — surface as a conflict for THIS caller.
      throw new ApiError('RESOURCE_STATE_CONFLICT', { message: 'quest was concurrently ended.' });
    }

    // P3-D C6 — additive one-line emit (design §9.2): the annealing subscriber initiates/compounds
    // settling on the newly-hired lieutenant's assigned building. Fires ONLY on the winning branch of the
    // RETURNING above (never on the concurrent-conflict 409 just above).
    this.bus.emitHireCompleted({
      type: 'hire_completed',
      playerId,
      lieutenantId: recruited.lieutenant_id,
      assignedBuildingId,
      gameMinute: gameMinuteNow,
    });

    return {
      quest_id: finalized.quest_id,
      outcome: 'hired',
      lieutenant_id: recruited.lieutenant_id,
      hire_quality_bucket: hireQualityBucket,
      loyalty_seed_bucket: loyaltySeedBucket,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // Reads
  // ═══════════════════════════════════════════════════════════════════════════════════════════

  async listCandidates(playerId: string, pool?: string): Promise<RecruitmentCandidateRow[]> {
    return this.repo.listAvailableCandidates(playerId, pool);
  }

  async listQuests(playerId: string, status: 'active' | 'history'): Promise<QuestProjection[]> {
    const rows = await this.repo.listQuests(playerId, status);
    if (rows.length === 0) return [];
    const nowGameMinute = await this.repo.getCurrentGameMinute(playerId);
    return rows.map((r) => this.projectQuest(r, nowGameMinute));
  }

  async getQuest(playerId: string, questId: string): Promise<QuestProjection> {
    const quest = await this.repo.getQuestForPlayer(playerId, questId);
    if (!quest) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'No such recruitment quest for this player.' });
    }
    const nowGameMinute = await this.repo.getCurrentGameMinute(playerId);
    return this.projectQuest(quest, nowGameMinute);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // Projection (R2.2 — see the file header note on Saltline's decisions being leak-free by construction)
  // ═══════════════════════════════════════════════════════════════════════════════════════════

  /** `nowGameMinute` is the player's CURRENT clock reading (the caller already read it for the gate check /
   *  has a cheap extra read available) — used to compute a genuinely LIVE `session_ready` (whether the
   *  NEXT `advanceStep` call would pass the gate RIGHT NOW), not a static approximation. */
  private projectQuest(quest: RecruitmentQuestRow, nowGameMinute: number): QuestProjection {
    // C5/C6 — pool-generic steps_total/final_gated_step (was saltline-only pre-C5; each pool's own
    // projection reads its OWN pool's step machine).
    const isDefector = quest.quest_type === 'defector';
    const isCivilian = quest.quest_type === 'civilian';
    const stepsTotal = isDefector
      ? recruitmentTunables.defectorQuestSteps
      : isCivilian
        ? recruitmentTunables.civilianQuestSteps
        : recruitmentTunables.saltlineQuestSteps;
    const finalGatedStep = isDefector
      ? this.defector.finalGatedStep(stepsTotal, recruitmentTunables.defectorVettingSessions)
      : isCivilian
        ? this.civilian.finalGatedStep(stepsTotal, recruitmentTunables.civilianCourtingSessions)
        : this.saltline.finalGatedStep(stepsTotal);
    const sessionMinutes = recruitmentTunables.questSessionDurationInGameHours * 60;
    const lastAdvance = quest.last_advanced_at_game_minute ?? nowGameMinute;
    const hasMoreGatedSteps = quest.current_step < finalGatedStep;
    return {
      quest_id: quest.quest_id,
      pool: quest.quest_type,
      candidate_id: quest.candidate_id,
      current_step: quest.current_step,
      steps_total: stepsTotal,
      final_gated_step: finalGatedStep,
      sessions_consumed: quest.sessions_consumed,
      session_ready:
        quest.outcome === null && hasMoreGatedSteps && nowGameMinute - lastAdvance >= sessionMinutes,
      next_session_ready_at_game_minute: quest.outcome === null ? lastAdvance + sessionMinutes : null,
      decisions: this.sanitizeDecisionsForProjection(
        quest.quest_type,
        (quest.decisions_made as unknown as RecruitmentDecisionEntry[]) ?? [],
      ),
      outcome: quest.outcome,
    };
  }

  /**
   * D9's "OWN masking pass" (the C2 file-header note this file itself flagged as a forward gap for C5):
   * Saltline's `decisions_made` never carries a sensitive field (unchanged, RAW passthrough — R2.2-clean
   * by construction, per this file's own original header comment). Defector's `vetting_session` entries
   * DO carry server-only D9 internals (`detected` — the per-session detection roll outcome; `session_n`)
   * written by `advanceStep` above — grep-zero player-facing (R2.2: "detection/base probabilities...
   * `double_agent`"). Strip them here, ONCE, at the projection boundary — the DB row keeps full fidelity
   * (server/BO reads the raw `decisions_made` column directly, never through this method).
   */
  private sanitizeDecisionsForProjection(
    pool: RecruitmentQuestRow['quest_type'],
    decisions: RecruitmentDecisionEntry[],
  ): RecruitmentDecisionEntry[] {
    if (pool !== 'defector') return decisions;
    return decisions.map((d) => {
      const { detected, session_n, ...safe } = d;
      return safe as RecruitmentDecisionEntry;
    });
  }
}
