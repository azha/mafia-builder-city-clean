// IMPLEMENTS: docs/superpowers/specs/2026-06-07-phase-06-lieutenants-dsl-slice1-design.md §4-T4 (LieutenantService —
//             recruit a COOK lieutenant on a player-owned operational lab [granted_role=executor, mode=delegated],
//             capped by T.lieutenant.max_count_per_player; attach-script = parse+compile+store source+IR+valid;
//             validate = dry-run, no store; all player-owned-guarded + atomic) +
//             docs/tech/07_lieutenants_and_behavior/lieutenant_definition.md §Composite LieutenantArchetype (COOK ↔
//             Operator) + §GrantedRole (executor) + §TaskedVsDelegated (delegated) +
//             docs/tech/07_lieutenants_and_behavior/behavior_script_dsl.md §Composite CompiledScript (the parse→compile
//             pipeline produces the IR stored in behavior_script.rules) +
//             docs/tech/04a_operational_systems/lieutenant_role_mapping.md §Archetype projection (the COOK role_id)
//             -- session:2026-06-08 (Phase 6 vector #6 lieutenants+DSL — Task 4, lieutenant entity) --
//
// D2 R10 — Recruitment polling (consistency_index gate + norm-poll):
//   docs/tech/04c_market_reputation_insurance/reputation_mechanics.md :65 (consistency_index public ledger),
//   :178 (high-tier candidates poll existing lieutenants on house norms)
//   Design §0.2, §2.3, §5.1
//
//   GATE DESIGN (R10):
//     1. consistency_index gate: read BossMirrorService.getConsistencyIndex(playerId).
//        No row = no ledger = neutral (consistency_index implicitly 1.0 on empty world).
//        Maps to consistency_bucket:  'neutral' (index ≥ 0.75) | 'low' (index < 0.75).
//        Zero-regression: empty world has no ledger row → 'neutral' ALWAYS.
//     2. Norm-poll (house culture): read HiddenCurriculumService norms for ALL of the player's
//        existing lieutenants, count total ON flags across the house. house_norm_flag_count = Σ ON flags.
//        Empty roster or no norms rows → house_norm_flag_count = 0.
//     3. The gate is a READ-ONLY pre-check — no state mutation inside the recruit tx.
//        The recruit itself (roster cap + atomic one-tx recruit) is UNCHANGED.
//     4. The result is surfaced as recruit_poll: { consistency_bucket, house_norm_flag_count, gate_ran }.
//        R2.2: NO raw consistency_index scalar forwarded (only the bucket — a qualitative bound).
//        R2.2: NO raw norms flags forwarded (only the count — a composite scalar).
//     5. Dialogue string (retraction-by-name) DEFERRED — dep TD-046 (nom-pool).
//        Cross-ref TD-046 here: the dialogue string for the candidate's first-meeting retraction reference
//        is wired at R13 / deferred to TD-046. The gate is delivered; the string is not.
//
//   NEW TUNABLE (R2.3): The 0.75 cutoff is now DE-INLINED to registry key
//     `reputation.recruitment_consistency_neutral_threshold` (gdd/14 §Reputation, default 0.75,
//     range 0.50..0.90, [PROPOSED DEFAULT][PROV-Y26Q2], added at D2 R10).
//     The threshold is READ from `reputationTunables.recruitmentConsistencyNeutralThreshold`
//     (see line :227) — it is NOT a structural constant / not inline.
//
// `LieutenantService` — the player-triggered actions of the Phase-6 slice-1 lieutenant entity:
//   - RECRUIT (POST /v1/lieutenants): resolve the archetype's binding via the registry (a SUPPORTED archetype — all 6:
//     COOK/SECURITY/BOOKKEEPER/LOGISTICS/LAUNDERING/DISTRIBUTION this build; a garbage/unknown value → 422), run the
//     binding's per-archetype assignment gate (e.g. a COOK requires the player's OWN OPERATIONAL building of a COOK-host
//     type, a `lab`, via the owned-operational gate: not owned/not operational → 404; wrong type → 409), enforce the
//     roster cap T.lieutenant.max_count_per_player (count ≥ cap → 409) → atomic one-tx recruit (empty behavior_script +
//     lieutenant) with role_id = roleIdForArchetype(archetype) (04a), source='civilian', granted_role='executor',
//     mode='delegated', name='Lieutenant' (placeholder — full name-pool deferred), name_locale = the player's locale
//     (else 'en'). Returns { lieutenant_id }.
//   - ATTACH-SCRIPT (POST /v1/lieutenants/:id/behavior-script): player-owned guard (404) → DslParserService.parse →
//     DslCompilerService.compile; ANY diagnostics → 422 VALIDATION_FAILED with details: diagnostics (NO store) → else
//     store source + the compiled IR + valid=true (last_modified_by='player'). Returns { attached: true }. Idempotent
//     (the global interceptor).
//   - VALIDATE (POST /v1/lieutenants/:id/behavior-script/validate): the SAME parse+compile, NO store — dry-run. Still
//     player-owned-guarded (404 otherwise). Returns { valid: true } on success, else 422 + the diagnostics.
//
// REUSE (never reimplement): the DslParserService/DslCompilerService DSL pipeline (the engine T1/T2 — the executor T3 is
// NOT called here, slice-1 T4 does no resolve), the owned-operational-building gate (the SAME join ProductionRepository
// uses), the ApiError + error-code conventions, the idempotency interceptor (the controller's POSTs flow through it). NO
// over-build into T5 (no COOK binding / signals), T6 (no tick / scheduler), or T7 (no projection / band logic). R2.2: the
// responses are plain { lieutenant_id } / { attached: true } / { valid: true } ids/booleans — no raw scalars leaked.

import { Injectable, Logger } from '@nestjs/common';

import { ApiError } from '../../protocol/api-error';
import { DslParserService } from '../../dsl/parser.service';
import { DslCompilerService } from '../../dsl/compiler.service';
import type { DslDiagnostic } from '../../dsl/dsl-errors';
import type { CompiledScript } from '../../dsl/ir';
import { LieutenantRepository, RecruitHireDebitConflictError } from './lieutenant.repository';
import { lieutenantTunables } from './lieutenant-tunables';
import { bucketForStreak, effectsForBucket, disruptionTicks } from './tenure-inertia';
import { archetypeForRoleId, roleIdForArchetype, DSL_PEER_ROLES, type LieutenantArchetype } from './lieutenant-archetype';
import { BindingRegistry } from './binding-registry.service';
import type { LieutenantSourceEnum, LoyaltySeedBucketEnum } from '../../db/schema/lieutenant';
// D2 R10: REUSE ReputationModule (already imported into LieutenantModule by R6).
// Inject BossMirrorService (consistency_index gate, :65) + HiddenCurriculumService (norm-poll, :178).
import { BossMirrorService } from '../reputation/boss-mirror.service';
import { HiddenCurriculumService } from '../reputation/hidden-curriculum.service';
import { reputationTunables } from '../reputation/reputation-tunables';
import { CityEventBus } from '../../citysim/events/city-event-bus';
// 04f-A C7 DD8/D9 — the Facility manager's seeded default script threshold. REUSE the SAME registry getter the
// C1 tunables foundation registered (never re-hardcoded here).
import { maintenanceTunables } from '../maintenance/maintenance-tunables';
import { PLACEHOLDER_NOM_LIEUTENANT } from './lieutenant-name-pool'; 

// D2 R10: consistency_index bucket type (R2.2 — no raw scalar forwarded to client).
// Canon :65: consistency_index ∈ [0, 1]. Bucket boundary at `reputation.recruitment_consistency_neutral_threshold`
//   (registry tunable, de-inlined per Gate-B iv; default 0.75 — natural midpoint).
//   'neutral' → index ≥ threshold (or absent ledger row → 1.0 implicitly → neutral).
//   'low'     → index < threshold (accumulated retractions indicate inconsistency).
// REVIEWER FLAG [R10_BUCKET_THRESHOLD]: confirmed IMPORTANT at gate — de-inlined to registry (R9.3).
export type ConsistencyBucket = 'neutral' | 'low';

/** R10 recruit_poll shape (R2.2: no raw scalar; qualitative bucket + composite count). */
export interface RecruitPoll {
  /** Qualitative bucket derived from the player's consistency_index. Never the raw scalar (R2.2/P5). */
  consistency_bucket: ConsistencyBucket;
  /** Total ON norm flags across all of the player's existing lieutenants (the "house culture" count). */
  house_norm_flag_count: number;
  /** Proof-of-execution: true iff the gate code ran (for test falsifiability). */
  gate_ran: true;
}

/**
 * 04f-B C3 (D4) — the recruitment-quest hire's ADDITIVE extension of `LieutenantService.recruit`. Every
 * field is OPTIONAL; the classic `POST /v1/lieutenants` call site never constructs this object at all (the
 * 5th positional arg stays `undefined`) — byte-identical to before C3.
 */
export interface RecruitmentHireExtension {
  /** The pool's `lieutenant_source` member ('saltline'|'defector'|'civilian'). Absent → 'civilian' (classic). */
  source?: LieutenantSourceEnum;
  /** The `RecruitmentQuestOutcomeMapper`'s compiled seed script — OVERRIDES the C7 FACILITY_MANAGER auto-build. */
  initialScript?: { source: string; rules: CompiledScript };
  /** The negotiated one-time hire debit (cents) — guarded, atomic with the recruit tx. Absent = no debit. */
  hireCostCents?: number;
  /** The C1 `lieutenant.loyalty_seed_bucket` column — set ONCE at hire. Absent = stays NULL. */
  loyaltySeedBucket?: LoyaltySeedBucketEnum;
  /** The C1 `lieutenant.recruitment_quest_id` lineage FK — set ONCE at hire. Absent = stays NULL. */
  recruitmentQuestId?: string;
}

@Injectable()
export class LieutenantService {
  private readonly logger = new Logger(LieutenantService.name);

  constructor(
    private readonly repo: LieutenantRepository,
    private readonly parser: DslParserService,
    private readonly compiler: DslCompilerService,
    private readonly registry: BindingRegistry,
    // D2 R10: REUSE ReputationModule exports (R6 already imported ReputationModule into LieutenantModule).
    private readonly bossMirror: BossMirrorService,
    private readonly hiddenCurriculum: HiddenCurriculumService,
    // Drift C7: CityEventBus (REUSE SchedulerModule already imported into LieutenantModule for the tick).
    // Emits LookoutAssignedEvent ADDITIVELY after a SECURITY recruit tx commits — no change to recruit hot-path.
    private readonly bus: CityEventBus,
  ) {}

  /**
   * RECRUIT a lieutenant of a SUPPORTED archetype on a player-owned building (Phase-7 generalization — the recruit is now
   * archetype-agnostic, dispatching through the binding registry). Validates the archetype (registry.require → 422 if no
   * binding is registered — Phase 8 completed the roster, so this build registers all 6 archetypes
   * (COOK/SECURITY/BOOKKEEPER/LOGISTICS/LAUNDERING/DISTRIBUTION) and only a garbage/unknown archetype 422s, the
   * generalization of the Phase-6 `archetype !== 'COOK'` gate), then the binding's
   * per-archetype assignment gate (validateAssignment — a COOK requires a
   * player-owned operational lab → 404/409), then the roster cap (count ≥ T.lieutenant.max_count_per_player → 409). Then
   * atomically recruits (empty behavior_script + lieutenant) with role_id = roleIdForArchetype(archetype),
   * granted_role='executor', mode='delegated', the assigned building + the (nullable) target building. Returns
   * { lieutenant_id }. `targetBuildingId` defaults null (COOK/SECURITY/BOOKKEEPER ignore it;
   * LOGISTICS/LAUNDERING/DISTRIBUTION require it — their bindings' validateAssignment enforce that).
   *
   * `questExtension` (04f-B C3, D4 — OPTIONAL, ADDITIVE 5th param): the recruitment-quest hire path
   * (`RecruitmentQuestService.finalizeHire`) passes `source: 'saltline'|'defector'|'civilian'`, the mapper's
   * compiled `initialScript` (OVERRIDING the FACILITY_MANAGER auto-build below when both would apply — a
   * quest-hired FACILITY_MANAGER seeds the MAPPER's script, not the C7 default), the negotiated
   * `hireCostCents` (a guarded debit, atomic with the recruit — insufficient balance rolls back the WHOLE
   * tx), and the C1 lineage columns `loyaltySeedBucket`/`recruitmentQuestId`. The CLASSIC endpoint
   * (`POST /v1/lieutenants`, `lieutenant.controller.ts`) NEVER passes this 5th arg → every field below stays
   * `undefined` → `source` defaults 'civilian', `initialScript` falls back to the pre-existing FACILITY_MANAGER
   * check, no debit is attempted, the C1 columns stay NULL — BYTE-IDENTICAL to before C3.
   */
  async recruit(
    playerId: string,
    archetype: string,
    assignedBuildingId: string,
    targetBuildingId: string | null = null,
    questExtension?: RecruitmentHireExtension,
  ): Promise<{ lieutenant_id: string; recruit_poll: RecruitPoll }> {
    // 1) ARCHETYPE — resolve its binding (422 VALIDATION_FAILED if unsupported in this build — now only a garbage/unknown
    //    value). Phase 8 completed the roster: this build registers all 6 archetypes (COOK/SECURITY/BOOKKEEPER/LOGISTICS/
    //    LAUNDERING/DISTRIBUTION), so recruit accepts every real archetype and 422s only a garbage value (the Phase-6
    //    COOK-only gate generalized through the registry).
    const binding = this.registry.require(archetype as LieutenantArchetype);

    // D2 R10: CANDIDATE-POLLING GATES (post-archetype / pre-validateAssignment, canon :65 + :178).
    //
    // READ-ONLY pre-check — no state mutation here; the recruit tx (step 4) is unchanged + atomic.
    // Zero-regression: empty world (no ledger row, no norms rows) → gates pass trivially (neutral).
    //
    // gate A — Boss Mirror consistency_index (canon :65 "candidates poll the public ledger + derived flag"):
    //   Read the player's materialized consistency_index (written by R2b weekly tick).
    //   No ledger row = no declarations/retractions = neutral (1.0 implicitly).
    //   Map to consistency_bucket: 'neutral' if index ≥ reputation.recruitment_consistency_neutral_threshold, else 'low'.
    //   R2.2: the raw index is a server-only scalar; only the bucket is forwarded.
    //   P5: the raw float NEVER leaves this method — only the bucket reaches the response.
    //
    // gate B — Hidden Curriculum norm-poll (canon :178 "high-tier candidates poll existing lieutenants
    //   on house norms before signing"):
    //   Read all existing lieutenants in the player's roster.
    //   For each, read the norms vector and count ON flags.
    //   house_norm_flag_count = Σ ON flags across all existing lieutenants.
    //   Empty roster or no norms rows → 0 (neutral, zero-regression).
    //   R2.2: raw norms flags are server-only; only the total count is forwarded.
    //
    // Dialogue string (retraction-by-name, canon :65 "candidate's first-meeting dialogue references most
    //   recent public retraction by name") DEFERRED — dep TD-046 (nom-pool).
    //   TD-046 cross-ref: route at R13. The gate is delivered; the string is not (Gate B criterion (ii)).
    const recruitPoll = await this.runCandidatePollingGates(playerId);

    // 2) ASSIGNED BUILDING — must be a non-empty building id; the binding's per-archetype gate validates ownership/type
    //    (a COOK → a player-owned operational lab: not owned/operational → 404; wrong type → 409).
    if (typeof assignedBuildingId !== 'string' || !assignedBuildingId) {
      throw new ApiError('VALIDATION_FAILED', {
        message: 'assigned_building_id must be a building id (uuid).',
      });
    }
    await binding.validateAssignment(playerId, assignedBuildingId, targetBuildingId);

    // 3) ROSTER CAP — count ≥ T.lieutenant.max_count_per_player → 409 (nothing recruited).
    const count = await this.repo.countByPlayer(playerId);
    if (count >= lieutenantTunables.maxCountPerPlayer) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message:
          `roster is full (${count}/${lieutenantTunables.maxCountPerPlayer}) — cannot recruit another lieutenant.`,
      });
    }

    // 4) RECRUIT (atomic) — role_id = the grounded role for the archetype (04a, via roleIdForArchetype); the delegation
    //    defaults (granted_role=executor, mode=delegated). target_building_id is set (null for COOK).
    //    04f-A C7 (D9): a FACILITY_MANAGER recruit ALSO seeds its default auto-schedule script atomically (the
    //    SAME recruit transaction — never a separate post-recruit attach); every other archetype passes
    //    `initialScript: undefined` → the pre-C7 empty-script default, byte-identical.
    const nameLocale = await this.resolvePlayerLocale(playerId);
    // 04f-B C3 (D4): the quest's own compiled seed script (when provided) OVERRIDES the C7 FACILITY_MANAGER
    // auto-build — a quest-hired FACILITY_MANAGER seeds the MAPPER's script (its own vocabulary entry ALSO
    // covers FACILITY_MANAGER, decisions §8), not the maintenance-module default.
    const initialScript =
      questExtension?.initialScript ??
      (binding.archetype === 'FACILITY_MANAGER' ? this.buildFacilityManagerDefaultScript() : undefined);
    let result: { lieutenant_id: string };
    try {
      result = await this.repo.recruit({
        playerId,
        roleId: roleIdForArchetype(binding.archetype),
        source: questExtension?.source ?? 'civilian',
        // P4 item 1 (TD-046) — ce n'est plus un placeholder MORT : c'est le DISCRIMINANT que le
        // repository lit pour savoir qu'il doit nommer ce lieutenant depuis le pool de fiction
        // (`lieutenant-name-pool.ts`). Un appelant qui passe un vrai nom garde le sien.
        name: PLACEHOLDER_NOM_LIEUTENANT,
        nameLocale,
        grantedRole: 'executor',
        mode: 'delegated',
        assignedBuildingId,
        targetBuildingId,
        initialScript,
        hireCostCents: questExtension?.hireCostCents,
        loyaltySeedBucket: questExtension?.loyaltySeedBucket,
        recruitmentQuestId: questExtension?.recruitmentQuestId,
      });
    } catch (err) {
      // 04f-B C3 (D4) — the guarded hire debit was refused (insufficient balance): map to the SAME
      // RESOURCE_STATE_CONFLICT 409 every other guarded-debit consumer in this codebase uses (never a raw
      // driver/transaction error reaching the controller). The classic/FACILITY_MANAGER paths never attempt
      // a debit (hireCostCents undefined) so this branch is UNREACHABLE for them — byte-identical.
      if (err instanceof RecruitHireDebitConflictError) {
        throw new ApiError('RESOURCE_STATE_CONFLICT', { message: err.message });
      }
      throw err;
    }

    this.logger.log(
      `recruit: player=${playerId} archetype=${binding.archetype} building=${assignedBuildingId} ` +
        `target=${targetBuildingId ?? 'none'} → lieutenant=${result.lieutenant_id} (granted_role=executor, mode=delegated) ` +
        `poll=consistency_bucket:${recruitPoll.consistency_bucket} house_norms:${recruitPoll.house_norm_flag_count}`,
    );

    // Drift C7: additive SECURITY-gated LookoutAssignedEvent emit (AFTER commit + log; BEFORE return).
    // BYTE-IDENTICAL recruit: no change to the tx / return value / RecruitPoll shape.
    // DD-LOOKOUT-MAPPING: SECURITY lieutenant = lookout (security-binding.ts: "protects operational building").
    // [needs reviewer⊥]: assigning MORE lookouts triggers re-evaluation — coherent resolution: rate is
    // recomputed post-recruit, so even after adding a lookout the player may still be under baseline.
    if (binding.archetype === 'SECURITY') {
      this.bus.emitLookoutAssigned({
        type: 'lookout_assigned',
        playerId,
        lieutenantId: result.lieutenant_id,
        buildingId: assignedBuildingId,
        gameMinute: 0, // player-triggered (no scheduler tick context); mirrors C4 deposit pattern
      });
    }

    // P3-F C2 — additive `DirectHireCompletedEvent` emit for the CLASSIC direct-recruit path ONLY
    // (`questExtension` undefined). LIEUTENANT_HIRING mastery parity closure (C0 §5.3 gap #1): a player
    // who never touches the quest system still earns hiring mastery. Guarded on `!questExtension`
    // because `RecruitmentQuestService.finalizeHire` calls THIS SAME method internally and already emits
    // its OWN `HireCompletedEvent` AFTER `recruit()` returns — firing this unconditionally would
    // double-fire for every quest hire (see `DirectHireCompletedEvent`'s own header, city-event-bus.ts).
    if (!questExtension) {
      this.bus.emitDirectHireCompleted({
        type: 'direct_hire_completed',
        playerId,
        lieutenantId: result.lieutenant_id,
        assignedBuildingId,
        gameMinute: 0, // player-triggered (no scheduler tick context); mirrors the LookoutAssignedEvent emit above
      });
    }

    return { ...result, recruit_poll: recruitPoll };
  }

  /**
   * 04f-A C7 (D9) — build the Facility manager's SEEDED DEFAULT behavior script at recruit time:
   * `WHEN STATE(days_until_maintenance_due, <=, N) THEN schedule_maintenance(most_due) @100;` where `N` is
   * `maintenance.auto_schedule_window_before_due_days` RENDERED AT SEED TIME (design §8 — "the compiled rule
   * pins the current default; the tunable governs new seeds", the same posture as every other seeded default
   * script). Parsed + compiled through the SAME `DslParserService`/`DslCompilerService` pipeline `attachScript`
   * uses (default `unlockedTier=1` — the script is a single Tier-1 `STATE` trigger → `schedule_maintenance`
   * action rule, always compilable at the default tier every player starts with).
   *
   * NEVER fails for a real recruit (the source is FIXED + hand-verified valid against the shipped DSL grammar —
   * §the C7 falsifiable floor's own "recruit → default script compiles valid" proof) — a diagnostic here would
   * be a PROGRAMMING BUG (an internal contract breach between this string and the DSL grammar), so it throws
   * rather than silently recruiting an unscripted Facility manager.
   */
  private buildFacilityManagerDefaultScript(): { source: string; rules: CompiledScript } {
    const windowDays = maintenanceTunables.autoScheduleWindowBeforeDueDays;
    const source = `WHEN STATE(days_until_maintenance_due, <=, ${windowDays}) THEN schedule_maintenance(most_due) @100;`;
    const parsed = this.parser.parse(source);
    if ('diagnostics' in parsed) {
      throw new Error(
        `Facility manager default script failed to PARSE (internal bug — fix the seeded source): ` +
          JSON.stringify(parsed.diagnostics),
      );
    }
    const compiled = this.compiler.compile(parsed.ast);
    if ('diagnostics' in compiled) {
      throw new Error(
        `Facility manager default script failed to COMPILE (internal bug — fix the seeded source): ` +
          JSON.stringify(compiled.diagnostics),
      );
    }
    return { source, rules: compiled.ir };
  }

  // ── D2 R10: private gate helpers ─────────────────────────────────────────────────────────────────

  /**
   * `runCandidatePollingGates(playerId)` — R10 read-only pre-check: consistency_index gate + norm-poll.
   *
   * Called post-archetype / pre-validateAssignment in recruit().
   * Returns a RecruitPoll composite (R2.2 — no raw scalar forwarded, only bucket + count).
   *
   * Zero-regression: empty world (no ledger row, no norms rows) → RecruitPoll with neutral bucket + 0 count.
   * Atomicity: this is a READ-ONLY pre-check; the recruit tx (atomic step 4) is NOT affected.
   * TD-046: the dialogue string (retraction-by-name, canon :65) is deferred to TD-046 (nom-pool).
   *         Cross-ref: route to R13. Gate delivered; dialogue not.
   */
  private async runCandidatePollingGates(playerId: string): Promise<RecruitPoll> {
    // gate A — Boss Mirror consistency_index (canon :65).
    // No ledger row → no history → neutral (1.0 implicitly; zero-regression invariant).
    const ciRow = await this.bossMirror.getConsistencyIndex(playerId);
    let consistencyBucket: ConsistencyBucket;

    if (ciRow === null || ciRow.consistency_index === null) {
      // No ledger row: empty world, fully consistent on empty history → neutral.
      consistencyBucket = 'neutral';
    } else {
      // R2.2 / P5: the raw index is used ONLY for the bucket derivation — never forwarded.
      // Threshold sourced from registry (de-inlined per Gate-B iv): reputation.recruitment_consistency_neutral_threshold.
      consistencyBucket = ciRow.consistency_index >= reputationTunables.recruitmentConsistencyNeutralThreshold ? 'neutral' : 'low';
    }

    // gate B — Hidden Curriculum norm-poll (canon :178).
    // List all of the player's existing lieutenants (the house the candidate is evaluating).
    // For each, read the norms vector and count ON flags. Empty roster → 0 (zero-regression).
    const existingLieutenants = await this.repo.listForPlayer(playerId);
    let houseNormFlagCount = 0;

    for (const lt of existingLieutenants) {
      // W6a C4: mechanical adaptation forced by `readNormsVector`'s new signature — `lt` comes
      // from `this.repo.listForPlayer(playerId)` above, so it is always `playerId`'s own lieutenant.
      const normsVec = await this.hiddenCurriculum.readNormsVector(lt.lieutenant_id, playerId);
      if (normsVec === null) continue; // no norms row yet → contributes 0 flags

      const flags = normsVec.norms_flags;
      // Count ON flags for this lieutenant (the 8 canonical norms).
      // R2.2: raw flags never forwarded; only the count crosses the gate boundary.
      houseNormFlagCount +=
        (flags.punctuality                ? 1 : 0) +
        (flags.silence_at_handoffs        ? 1 : 0) +
        (flags.debt_handling              ? 1 : 0) +
        (flags.escalation_reflex          ? 1 : 0) +
        (flags.fairness_to_subordinates   ? 1 : 0) +
        (flags.discretion_around_civilians? 1 : 0) +
        (flags.restraint_with_force       ? 1 : 0) +
        (flags.ledger_hygiene             ? 1 : 0);
    }

    return {
      consistency_bucket:   consistencyBucket,
      house_norm_flag_count: houseNormFlagCount,
      gate_ran:             true,
    };
  }

  /**
   * REASSIGN a player-owned lieutenant to a new building (Phase-11 A4 — move + reset tenure to FRESH + open the OLD-bucket
   * settling window). The canon: a reassignment forfeits the accumulated tenure (the streak resets to 0 → the bucket
   * DERIVES to FRESH) AND pays a settling cost SIZED TO WHAT YOU HAD (the OLD bucket — computed BEFORE the reset). The flow:
   *   1. OWNERSHIP — load the owned lieutenant's role_id + tenure_score (getOwnedLieutenantForReassign; null → 404). Guard
   *      assignedBuildingId is a non-empty string (mirror recruit → 422 VALIDATION_FAILED).
   *   2. ASSIGNMENT GATE — derive the archetype from role_id (archetypeForRoleId) and REUSE the SAME binding gate recruit
   *      uses (binding.validateAssignment): it throws 404 (building not owned / not operational), 409 (wrong building type
   *      for the archetype), and enforces the target requirement for archetypes that need one
   *      (LOGISTICS/LAUNDERING/DISTRIBUTION). NOT reimplemented here.
   *   3. OLD-BUCKET WINDOW — BEFORE the reset: now = the current game_minute; oldBucket = bucketForStreak(tenure_score);
   *      settlingTicks = disruptionTicks(effectsForBucket(oldBucket).reassignment_disruption). The window scales by the OLD
   *      bucket (you forfeit the tenure AND pay a settling cost sized to it).
   *   4. ATOMIC MOVE + RESET + SETTLING — ONE repo write (repo.reassign): assigned_building_id + target_building_id +
   *      tenure_score=0 + tenure_reset_at_tick=now + settling_until_tick=now+settlingTicks. The bucket → FRESH is DERIVED
   *      from tenure_score=0 (never stored). While settling_until_tick > now the A2 tick SUSPENDS the delegation.
   * BO-only — tenure_score / the tick columns never leak (the endpoint returns the band projection, which at A4 has no
   * tenure bands yet — A5 adds them). The structured logger.log below IS the A4 audit (the persistent audit_trail is
   * system 17, DEFERRED — same as A3's settling log).
   */
  async reassign(
    playerId: string,
    lieutenantId: string,
    assignedBuildingId: string,
    targetBuildingId: string | null = null,
  ): Promise<void> {
    // 1) OWNERSHIP — load the owned lieutenant's role_id + tenure_score (a lean read; no behavior_script join — A4 neither
    //    reads nor revises the script). Not the player's / non-existent → 404 RESOURCE_NOT_FOUND.
    if (typeof lieutenantId !== 'string' || !lieutenantId) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'lieutenant id must be a uuid.' });
    }
    const owned = await this.repo.getOwnedLieutenantForReassign(playerId, lieutenantId);
    if (!owned) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `lieutenant ${lieutenantId} is not owned by this player.`,
      });
    }

    // 2) ASSIGNED BUILDING — must be a non-empty building id (mirror recruit's guard → 422 VALIDATION_FAILED); the
    //    binding's per-archetype gate validates ownership/type/target.
    if (typeof assignedBuildingId !== 'string' || !assignedBuildingId) {
      throw new ApiError('VALIDATION_FAILED', {
        message: 'assigned_building_id must be a building id (uuid).',
      });
    }

    // 2b) REUSE the recruit-time assignment gate (do NOT reimplement the ownership/type/target checks). Derive the
    //     archetype from role_id; resolve the binding (a recruited lieutenant always maps — guard defensively). The gate
    //     throws 404 (not owned / not operational) / 409 (wrong building type) / 422 (a required target missing).
    const archetype = archetypeForRoleId(owned.role_id);
    if (!archetype) {
      // A persisted role_id with no live archetype (none recruitable now — all 6 map) → 422 (defensive; never fires for a
      // recruited lieutenant).
      throw new ApiError('VALIDATION_FAILED', {
        message: `lieutenant ${lieutenantId} has no live archetype for its role — cannot reassign.`,
      });
    }
    const binding = this.registry.require(archetype);
    await binding.validateAssignment(playerId, assignedBuildingId, targetBuildingId);

    // 3) OLD-BUCKET SETTLING WINDOW — computed BEFORE the reset. now = the current game_minute (the tick-space the A2 tick
    //    honors); oldBucket = bucketForStreak(the streak about to be forfeited); settlingTicks = the OLD bucket's
    //    reassignment_disruption window (the canon: forfeit the tenure AND pay a settling cost sized to what you had).
    const now = await this.repo.getCurrentGameMinute(playerId);

    // COOLDOWN (Phase-13 — the canon decision_cooldown): a lieutenant reassigned within `decision_cooldown` ticks cannot be
    // reassigned again (anti-churn friction). tenure_reset_at_tick is the LAST-reassign tick (NULL = never reassigned → no
    // cooldown → first reassign always allowed). Rejected BEFORE the move (no mutation). The raw ticks never leak — the
    // message names no countdown scalar (R2.2).
    if (
      owned.tenure_reset_at_tick !== null &&
      now < owned.tenure_reset_at_tick + lieutenantTunables.tenureInertia.decisionCooldown
    ) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `lieutenant ${lieutenantId} was reassigned too recently — it is on a decision cooldown.`,
      });
    }

    const oldBucket = bucketForStreak(owned.tenure_score, lieutenantTunables.tenureInertia.thresholds);
    const disruption = effectsForBucket(oldBucket).reassignment_disruption;
    const settlingTicks = disruptionTicks(disruption, lieutenantTunables.tenureInertia.reassignmentDisruptionCurve);

    // 4) ATOMIC MOVE + RESET + SETTLING — ONE write: move + tenure_score=0 (→ FRESH, DERIVED) + reset origin + the
    //    settling window end. The bucket is DERIVED from tenure_score=0 (never stored).
    await this.repo.reassign(lieutenantId, {
      assignedBuildingId,
      targetBuildingId,
      tenureResetAtTick: now,
      settlingUntil: now + settlingTicks,
    });

    // P3-D C6 — additive one-line emit (design §9.2/§3.4): the annealing subscriber initiates/compounds
    // settling on the OLD building (owned.assigned_building_id, read BEFORE this move — null if never
    // assigned) AND the NEW building. STRICTLY additive to the Phase-11 write above — carries no tenure/
    // settling-tick scalar (that write, and its OWN semantics, are UNCHANGED by this emit).
    this.bus.emitLieutenantReassigned({
      type: 'lieutenant_reassigned',
      playerId,
      lieutenantId,
      oldBuildingId: owned.assigned_building_id,
      newBuildingId: assignedBuildingId,
      gameMinute: now,
    });

    this.logger.log(
      `reassign LIFECYCLE: lieutenant=${lieutenantId} player=${playerId} from_bucket=${oldBucket} → FRESH ` +
        `building=${assignedBuildingId} target=${targetBuildingId ?? 'none'} settling=${settlingTicks} ` +
        `until=${now + settlingTicks}`,
    );
  }

  /**
   * ATTACH a behavior script (the player-authored DSL source) to a player-owned lieutenant: load the owned lieutenant
   * (+ its 1:1 behavior_script_id) → 404 if not owned; parse → compile; ANY diagnostics → 422 VALIDATION_FAILED with
   * details: diagnostics (NO store — the script stays valid=false); else store source + the compiled IR + valid=true.
   * Returns { attached: true }. Idempotent via the global interceptor.
   */
  async attachScript(
    playerId: string,
    lieutenantId: string,
    source: unknown,
  ): Promise<{ attached: true }> {
    const owned = await this.requireOwnedLieutenant(playerId, lieutenantId);
    const wasValid = owned.valid; // PRIOR script validity — captured BEFORE updateBehaviorScript flips it true below.
    const unlockedTier = await this.repo.getRuleVocabularyTier(playerId);
    const ir = this.parseAndCompile(source, unlockedTier); // throws 422 + details on any diagnostic; never stores.

    // ── DURABILITY GAP (Phase-25 L3 T4 review I1 — DOCUMENTED, not built) ──────────────────────────────────────────────
    // attachScript RECOMPILES `rules` WHOLESALE from `source` (the `ir` above is the entire new rule set, overwriting the
    // prior rules). A standing order that was PROMOTE_TO_DEFAULT'd (StandingOrderService.promoteRuleIntoScript) appended its
    // rule to `behavior_script.rules` but NOT to `source` (the intended source/rules divergence, spec §3.1) — so this
    // re-attach DROPS that promoted rule (it was never in source → the recompile does not regenerate it). This re-attach
    // failure-mode is tracked v1.x debt (re-apply promoted rules on re-attach / a source-provenance flag / a re-attach
    // warning) — M2 accepts the drop; the promote append + this wholesale recompile both write the SAME behavior_script.rules.
    await this.repo.updateBehaviorScript(owned.behavior_script_id, {
      source: source as string, // validated a string by parseAndCompile (a non-string parses to a diagnostic first).
      rules: ir,
      valid: true,
    });

    this.logger.log(`attach-script: player=${playerId} lieutenant=${lieutenantId} script=${owned.behavior_script_id} (valid)`);

    // Phase-11 A3 — the RE-script settling window (tenure-scaled). Open a settling window ONLY on a genuine REVISION
    // (a valid→valid re-script of an already-compiled script): the prior `owned.valid` was true. The FIRST authoring
    // (false→true) opens NO window (no-regression contract — a brand-new delegation must act immediately). The bucket is
    // DERIVED from the persisted tenure_score (canon Invariant 4 — never persisted) and is NOT reset (a revision is a
    // COST, not a reassignment); the window length grows with tenure (the inertia drag). While settling_until_tick > now
    // the A2 tick SUSPENDS the delegation (no accrual, no cook). BO-only — the window never projects in A3 (A5 surfaces
    // the band). The structured logger.log below IS the audit for A3 (the persistent audit_trail is system 17, DEFERRED).
    if (wasValid) {
      const now = await this.repo.getCurrentGameMinute(playerId);
      const bucket = bucketForStreak(owned.tenure_score, lieutenantTunables.tenureInertia.thresholds);
      const disruption = effectsForBucket(bucket).reassignment_disruption;
      const ticks = disruptionTicks(disruption, lieutenantTunables.tenureInertia.reassignmentDisruptionCurve);
      await this.repo.setSettlingUntil(lieutenantId, now + ticks);
      this.logger.log(
        `re-script settling: lieutenant=${lieutenantId} bucket=${bucket} disruption=${disruption} window=${ticks} ` +
          `until_tick=${now + ticks}`,
      );

      // P3-D C6 — additive one-line emit (design §9.2), ALONGSIDE the EXISTING Phase-11 re-script settling-
      // window-open block above — ONLY on a genuine REVISION (wasValid===true), never on the first
      // authoring (the SAME no-regression distinction the Phase-11 window itself already draws here).
      // STRICTLY additive: carries no tenure/settling-tick scalar of its own.
      this.bus.emitScriptAttached({
        type: 'script_attached',
        playerId,
        lieutenantId,
        buildingId: owned.assigned_building_id,
        gameMinute: now,
      });
    }

    return { attached: true };
  }

  /**
   * VALIDATE a behavior script (dry-run): the SAME player-owned guard (404) + parse+compile, but NO store. Returns
   * { valid: true } on success; throws 422 + the diagnostics otherwise (identical verdicts to attach, never persisted).
   */
  async validateScript(
    playerId: string,
    lieutenantId: string,
    source: unknown,
  ): Promise<{ valid: true }> {
    await this.requireOwnedLieutenant(playerId, lieutenantId);
    const unlockedTier = await this.repo.getRuleVocabularyTier(playerId);
    this.parseAndCompile(source, unlockedTier); // throws 422 + details on any diagnostic; no store.
    return { valid: true };
  }

  // ───────────────────────────── private helpers ─────────────────────────────

  /** Load a player-owned lieutenant or throw 404 (the shared attach/validate ownership gate). */
  private async requireOwnedLieutenant(playerId: string, lieutenantId: string) {
    if (typeof lieutenantId !== 'string' || !lieutenantId) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'lieutenant id must be a uuid.' });
    }
    const owned = await this.repo.getOwnedLieutenant(playerId, lieutenantId);
    if (!owned) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `lieutenant ${lieutenantId} is not owned by this player.`,
      });
    }
    return owned;
  }

  /**
   * Run the DSL pipeline (parse → compile) on the player-authored `source`. Returns the compiled IR on full success;
   * throws 422 VALIDATION_FAILED with `details: diagnostics` on ANY parse OR compile failure (a syntax error, a
   * Tier > unlockedTier primitive → TIER_NOT_UNLOCKED, an unsupported Tier-1 primitive → NOT_SUPPORTED_YET, over the rule
   * cap → RULE_COUNT_EXCEEDED, an out-of-bounds priority → PRIORITY_OUT_OF_BOUNDS, …). `unlockedTier` is the player's
   * unlocked DSL vocab tier (from player_progression_state.rule_vocabulary_tier — Phase-12 T3); defaults to 1 so a player
   * with no progression row only unlocks Tier-1 primitives. NEVER stores — the caller decides whether to persist (attach
   * stores; validate does not). A non-string source is rejected as a syntax diagnostic by the parser (it tokenizes
   * `String(source)`-shaped input), so we coerce defensively to a string first.
   */
  private parseAndCompile(source: unknown, unlockedTier: number = 1): CompiledScript {
    if (typeof source !== 'string') {
      throw new ApiError('VALIDATION_FAILED', {
        message: 'behavior-script source must be a string.',
        details: [{ line: 1, col: 1, message: 'source must be a string', kind: 'SYNTAX_ERROR' } satisfies DslDiagnostic],
      });
    }

    const parsed = this.parser.parse(source);
    if ('diagnostics' in parsed) {
      throw new ApiError('VALIDATION_FAILED', {
        message: 'behavior-script failed to parse.',
        details: parsed.diagnostics,
      });
    }

    const compiled = this.compiler.compile(parsed.ast, unlockedTier as 1 | 2 | 3 | 4 | 5 | 6, DSL_PEER_ROLES);
    if ('diagnostics' in compiled) {
      throw new ApiError('VALIDATION_FAILED', {
        message: 'behavior-script failed to compile.',
        details: compiled.diagnostics,
      });
    }

    return compiled.ir;
  }

  /** The player's locale (player.locale) for the lieutenant's name_locale; falls back to 'en' if absent. */
  private async resolvePlayerLocale(playerId: string): Promise<string> {
    return this.repo.getPlayerLocale(playerId);
  }
}
