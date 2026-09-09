// IMPLEMENTS: docs/superpowers/plans/2026-07-18-p3-F-delegation-ratchet-plan.md C8 ("Promotion Lock
//             (recall pipeline + window lifecycle)" — `PromotionLockService` per design §9 governed tx
//             steps 1-9 incl. realization §10.3, re-delegation ×3 surface (D12), the recall-preview read).
//             Design: docs/superpowers/specs/2026-07-18-p3-F-delegation-ratchet-design.md §9 (Promotion
//             Lock, D7/D10/D12) + §10.3 (realization) + §11 (recall-preview buckets).
//             Decisions: docs/superpowers/specs/2026-07-18-p3-F-delegation-ratchet-decisions.md
//             divergence #20 (recall_debt_total reset-to-0 at realization) + #23 (severance from tenure
//             bands) + divergence #27/§4 (the compensation-based winner-gate shape THIS site MUST build
//             on) + divergence #28 (scar/double-recall derived ONLY from graduation_events/
//             promotion_locks histories, NEVER player_proficiency counters).
//             C0 re-anchor: docs/superpowers/specs/2026-07-18-p3-F-C0-reanchor.md §3 R1 (04c accord —
//             DEFINITIVE LIVE branch) + §4 R2 (tenure reset — DEFINITIVE `resetTenureOnly` branch) + §8
//             R9 (the real-day->tick helper, pinned).
//             Pattern (winner-gate-first, compensation-based, the REVERSE of C5's flip): `graduation.
//             service.ts#executeGraduation` — THIS service mirrors its EXACT shape: validate (read-only)
//             -> atomic conditional flip (THE winner gate) -> only the winner proceeds -> a LATER failure
//             compensates the flip back, never a half-recalled row.
//             — P3-F C8 — 2026-07-19
//
// ⊥ IMPORTANT-C8-1 fix (2026-07-19, `.review-c8/VERDICT.md`) — `meta.promotion_lock_reversal_cost_
// multiplier` was registered (C1) but never consumed (grep-confirmed: only echoed by the test-tunables
// route), making the C1 getter's own "used_by (C8+)" comment false and a GM override a no-op — a
// registered fig-leaf knob, forbidden by the lot's anti-fig-leaf invariant. RESOLUTION: WIRE it (branch 2
// of the remediation, not de-register) — canon `promotion_lock.md` §Transform step 7 explicitly says the
// reversal cost "est multiplié par" this exact tunable; design D12 echoes "× the in-fiction cost surface".
// See `applyReversalDamage`'s own header for the full mechanism (multiplies `SEVERANCE_WEIGHT` on a
// re-delegation recall ONLY, additive to the already-⊥-approved band-escalation, zero regression to a
// first-ever recall's DEFAULT behavior).
//
// `PromotionLockService.requestRecall` — the `POST /v1/meta/recall`'s `mutateFn` (`meta-progression.
// controller.ts#recall`, governed by `governor.commit(TASK_RECALL, ...)`).
//
// ★ STEP-ORDERING (mirrors `graduation.service.ts`'s own ★ STEP-ORDERING DIVERGENCE note — decisions §4
// #27 EXPLICITLY mandates this site build on the SAME shape, not design §9.1's literal step list): design
// §9.1 numbers the mastery_score SELF-flip as step (5), AFTER computeReversalCost/FallbackQualityBucket/
// realization (steps 2-4). Followed literally, two concurrent recalls on the SAME category would BOTH
// pass validate (both read DELEGATED), both compute buckets/realization, THEN race the flip — the loser
// would have already written a (later-orphaned) `player_proficiency` realization / consulted history
// that's about to change underneath it. This implementation REORDERS exactly as C5 did: the atomic
// conditional `flipToSelfForRecall` (mastery_score WHERE delegation_state='DELEGATED' AND
// delegated_to_lieutenant_id=:current) runs FIRST, immediately after validate — THE WINNER GATE. Only the
// WINNER proceeds to compute buckets, realize debt, write the lock + RECALL event rows, unbind tenure,
// and apply accord damage. A LATER failure (the induced-failure proof: a fault-injector-corrupted
// post-flip lieutenant id 404s on the real ownership lookup) triggers `revertToDelegatedForRecall` — the
// SAME "atomic claim + compensate-on-failure" idiom C5 established at the sibling site. See
// `mastery-score.repository.ts#flipToSelfForRecall`/`#revertToDelegatedForRecall` for the mechanism.

import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { ApiError } from '../protocol/api-error';
import { CityEventBus } from '../citysim/events/city-event-bus';
import { citySimTunables } from '../citysim/citysim-tunables';
import { LieutenantRepository } from '../operational/lieutenant/lieutenant.repository';
import { lieutenantTunables } from '../operational/lieutenant/lieutenant-tunables';
import { bucketForStreak } from '../operational/lieutenant/tenure-inertia';
import { RestraintIndexService } from '../operational/reputation/restraint-index.service';
import { BossMirrorService } from '../operational/reputation/boss-mirror.service';
import { TASK_CATEGORY_CATALOGUE, type TaskCategoryCatalogueEntry } from './task-category-catalogue';
import { metaProgressionTunables } from './meta-progression-tunables';
import { MasteryScoreRepository } from './mastery-score.repository';
import { PromotionLocksRepository } from './promotion-locks.repository';
import { PlayerProficiencyRepository } from './player-proficiency.repository';
import { GraduationEventsRepository } from './graduation-events.repository';
import { RecallFaultInjector } from './recall-fault-injector';
import { deriveRecallDebtSignal, type RecallDebtSignal } from './recall-debt-signal';
import { computeFallbackBucket, type FallbackQualityBucket } from './fallback-quality-bucket';
import { severanceBucketForTenure, escalateSeveranceBucket, type SeveranceBucket } from './severance-bucket';
import { recoveryPeriodRemainingSessions } from './recovery-period';
import { realDaysToTicks } from './real-day-tick-conversion';

/** The composite jsonb payload persisted on BOTH `promotion_locks.reversal_cost` (NOT NULL) and the
 *  RECALL `graduation_events.reversal_cost` row (design §9.1 step 2's `ReversalCostComposite`) — BO
 *  forensics only (R2.2 — this shape is NEVER serialized to any player-facing payload; the player-facing
 *  `recall-preview` endpoint below derives its OWN closed-domain-only projection from the SAME inputs,
 *  never by re-serializing this object). */
export interface ReversalCostComposite {
  readonly severance_bucket: SeveranceBucket;
  readonly re_delegation_penalty: boolean;
  readonly accord_degradation_target: 'RESTRAINT_INDEX' | 'BOSS_MIRROR';
  readonly accord_degradation_severity: number;
  /** ⊥ IMPORTANT-C8-1 fix — the ACTUAL numeric weight fed into the 04c accord ring
   *  (`restraint_dispute_ring.claimable_amount`/`claimed_amount`, or the BOSS_MIRROR severity's own input
   *  scale), POST re-delegation-cost-multiplier. `SEVERANCE_WEIGHT[severance_bucket]` on a first-ever
   *  recall (`re_delegation_penalty:false`, multiplier NOT applied — canon's own "si le joueur tente de
   *  re-déléguer" scoping, `promotion_lock.md` §Transform step 7); `SEVERANCE_WEIGHT[severance_bucket] ×
   *  meta.promotion_lock_reversal_cost_multiplier` when `re_delegation_penalty:true`. BO-only (R2.2 — never
   *  serialized to any player-facing payload). */
  readonly accord_extraction_weight: number;
  readonly realization: {
    readonly debt_before: number;
    readonly frozen_proficiency: number;
    readonly effective_proficiency: number;
    readonly recovery_period_remaining: number;
  };
}

export interface RecallResult {
  readonly recalled: true;
  readonly category_id: number;
  readonly lieutenant_id: string;
}

/** `GET /v1/meta/recall-preview/:categoryId` response (design §11 verbatim field list — R2.2: buckets/
 *  bands only, NEVER a raw debt/tick/multiplier value). */
export interface RecallPreview {
  readonly drop_bucket: 'FAIBLE' | 'MOYEN' | 'ELEVE';
  readonly recovery_bucket: 'COURT' | 'MOYEN' | 'LONG';
  readonly severance_bucket: SeveranceBucket;
  readonly window_days_band: 'SHORT' | 'STANDARD' | 'EXTENDED';
  readonly suspended_successor_key?: string;
  readonly re_delegation_penalty: boolean;
}

const DROP_BUCKET_BY_SIGNAL: Readonly<Record<RecallDebtSignal, RecallPreview['drop_bucket']>> = {
  LOW: 'FAIBLE',
  MEDIUM: 'MOYEN',
  HIGH: 'ELEVE',
};

/**
 * `RestraintIndexService.recordDisputeOutcome`'s DD-BRIDGE breach prefix (`restraint-index.service.ts`'s
 * OWN established mechanism, REUSED at this NEW site — mirrors that file's `BRIDGE_SETTLE_FAIR_PREFIX`).
 * No canon declared-rule vocabulary names a "treat lieutenants fairly on recall" rule specifically — this
 * is a NEW prefix scoped to THIS lot's own domain (a player who has never declared a matching rule simply
 * never trips the BOSS_MIRROR branch, honestly — `isDeclaredRuleContradictedBy` genuinely evaluates every
 * time, it is not a fig-leaf check against nothing).
 */
const RECALL_SEVERANCE_FAIR_PREFIX = 'recall_severance_fair';

/** Severance-bucket -> the `claimable`/`claimed` weight recorded in the accord ring (BO/internal only —
 *  R2.2 protects the raw restraint_ratio too; canon gives no exact numbers, divergence #23's own
 *  "concretization" — coder-discretion constants, disclosed). Every recall claims the FULL weight
 *  (`claimed === claimable`, extraction ratio 1.0) — a recall is, by construction, the org taking
 *  everything back from the lieutenant with zero generosity (`reputation_mechanics.md:85`'s own
 *  `restraint_ratio = Σ(claimable−claimed)/Σclaimable` formula: this slot's own contribution is exactly
 *  0, the worst-case single-dispute generosity). */
const SEVERANCE_WEIGHT: Readonly<Record<SeveranceBucket, number>> = {
  LOW: 5,
  MEDIUM: 10,
  HIGH: 20,
  RUINOUS: 40,
};

@Injectable()
export class PromotionLockService {
  private readonly logger = new Logger(PromotionLockService.name);

  constructor(
    private readonly masteryScoreRepo: MasteryScoreRepository,
    private readonly promotionLocksRepo: PromotionLocksRepository,
    private readonly playerProficiencyRepo: PlayerProficiencyRepository,
    private readonly graduationEventsRepo: GraduationEventsRepository,
    private readonly lieutenantRepo: LieutenantRepository,
    private readonly restraintIndex: RestraintIndexService,
    private readonly bossMirror: BossMirrorService,
    private readonly faultInjector: RecallFaultInjector,
    private readonly bus: CityEventBus,
  ) {}

  /**
   * `POST /v1/meta/recall`'s `mutateFn` (design §9.1). `categoryId` is the `TaskCategoryCatalogue` code.
   * Validation is ALWAYS server-re-derived. Throws `ApiError` on any refusal — the governor's OWN
   * catch-and-compensate (structural cap slot) fires regardless of which step throws.
   */
  async requestRecall(playerId: string, categoryId: number): Promise<RecallResult> {
    const { entry, recalledLieutenantId } = await this.validateRecallEligible(playerId, categoryId);

    // ★ Fault-injector hook (post-validate — mirrors `GraduationLieutenantFaultInjector`'s EXACT contract
    // at the sibling C5 site): the request GENUINELY passed every real precondition above. Armed ->
    // substitute an unowned UUID for every step AFTER the winner gate (the ownership lookup, the accord
    // counterparty, the tenure reset, the recorded rows' lieutenant_id) — a REAL 404 on the real ownership
    // query, never a fabricated throw.
    const effectiveLieutenantId = this.faultInjector.consumeIfArmed(playerId) ? randomUUID() : recalledLieutenantId;

    // ★ THE WINNER GATE (see file header). Scoped to the REAL current occupant (`recalledLieutenantId`,
    // read at validate) — a concurrent second recall on the SAME category that already won leaves this as
    // a genuine 409: NO bucket computation, NO history read, NO write ever runs for the loser.
    const flip = await this.masteryScoreRepo.flipToSelfForRecall(playerId, entry.code, recalledLieutenantId);
    if (!flip.flipped) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: 'Category is no longer DELEGATED (a concurrent recall won the race, or the row changed underneath this request).',
        payloadVars: { category_id: entry.code },
      });
    }

    let fallbackBucket: FallbackQualityBucket;
    let accordApplied: boolean;
    let accordTarget: 'RESTRAINT_INDEX' | 'BOSS_MIRROR';
    let accordSeverity: number;
    let accordWeight: number;

    try {
      // Tenure lookup (§9.1 step 2's own severance input) — the SAME real ownership query the graduation
      // validate path enforces (`getOwnedLieutenant`), on the (possibly fault-injector-corrupted)
      // `effectiveLieutenantId`. A 404 here IS the induced-failure proof's natural trigger.
      const owned = await this.lieutenantRepo.getOwnedLieutenant(playerId, effectiveLieutenantId);
      if (!owned) {
        throw new ApiError('RESOURCE_NOT_FOUND', {
          message: `lieutenant ${effectiveLieutenantId} is not owned by this player.`,
        });
      }

      // D12 — re-delegation history (ANY promotion_locks row, ACTIVE or CLOSED — decisions §4 #28: NEVER
      // player_proficiency counters). Checked BEFORE this recall's own lock row is inserted.
      const hasPriorLock = await this.promotionLocksRepo.hasAnyLockForCategory(playerId, entry.code);
      const tenureBucket = bucketForStreak(owned.tenure_score, lieutenantTunables.tenureInertia.thresholds);
      const severanceBucket = hasPriorLock
        ? escalateSeveranceBucket(severanceBucketForTenure(tenureBucket))
        : severanceBucketForTenure(tenureBucket);

      // §9.3 — accord coupling (REUSE-where-live; C0 R1 DEFINITIVE LIVE branch). ALWAYS attempted, ALWAYS
      // traced (AccordDegradationEvent, post-commit below — "never skipped"). `hasPriorLock` gates the
      // ⊥ IMPORTANT-C8-1 fix — canon's own re-delegation cost multiplier (promotion_lock.md §Transform
      // step 7) applies ONLY when this recall follows a prior one on the SAME category.
      const accord = await this.applyReversalDamage(playerId, effectiveLieutenantId, severanceBucket, hasPriorLock);
      accordApplied = accord.applied;
      accordTarget = accord.target;
      accordSeverity = accord.severity;
      accordWeight = accord.weight;

      // §9.1 step 3 — FallbackQualityBucket (decisions §4 #28: MINIMAL derived from graduation_events,
      // NEVER player_proficiency). Checked BEFORE this recall's own RECALL row is inserted.
      const hasPriorRecall = await this.graduationEventsRepo.hasRecallEvent(playerId, entry.code);
      const proficiencyRow = await this.playerProficiencyRepo.getRow(playerId, entry.code);
      const debtBefore = proficiencyRow?.recall_debt_total ?? 0;
      const frozenProficiency = proficiencyRow?.player_proficiency ?? 0;
      const cap = metaProgressionTunables.recallDebtMax;
      const debtSignal = deriveRecallDebtSignal(debtBefore, cap);
      fallbackBucket = computeFallbackBucket(hasPriorRecall, debtSignal);

      // §10.3 — realization: effective = max(0, frozen - debt) (BO forensics only); recovery_period =
      // base + floor(debt/10)*scaling (canon verbatim); recall_debt_total resets to 0 (divergence #20 —
      // "the debt is REALIZED — spent into the recovery period"). The read above is safe here (no
      // read-then-write TOCTOU): it happens strictly AFTER the winner gate already flipped this category
      // off DELEGATED, and the accrual UPDATE only ever touches DELEGATED rows (player-proficiency.
      // repository.ts#realizeAtRecall's own header carries the full account).
      const effectiveProficiency = Math.max(0, frozenProficiency - debtBefore);
      const recoveryPeriodRemaining = recoveryPeriodRemainingSessions(
        debtBefore,
        metaProgressionTunables.recoveryPeriodBaseSessions,
        metaProgressionTunables.recoveryPeriodScalingPerDebt,
      );
      await this.playerProficiencyRepo.realizeAtRecall(playerId, entry.code, recoveryPeriodRemaining);

      // §9.1 step 7 — the unmanaged window (C0 R9 helper — NEVER a re-derived constant).
      const nowTick = await this.lieutenantRepo.getCurrentGameMinute(playerId);
      const windowDays = metaProgressionTunables.promotionLockReversalWindowDays;
      const windowTicks = realDaysToTicks(windowDays, citySimTunables.realSecondsPerGameMinute);
      const windowStartTick = nowTick;
      const windowEndTick = nowTick + windowTicks;

      const reversalCost: ReversalCostComposite = {
        severance_bucket: severanceBucket,
        re_delegation_penalty: hasPriorLock,
        accord_degradation_target: accordTarget,
        accord_degradation_severity: accordSeverity,
        accord_extraction_weight: accordWeight,
        realization: {
          debt_before: debtBefore,
          frozen_proficiency: frozenProficiency,
          effective_proficiency: effectiveProficiency,
          recovery_period_remaining: recoveryPeriodRemaining,
        },
      };

      // §9.1 steps 7-8 — the ACTIVE lock row + the append-only RECALL row.
      await this.promotionLocksRepo.insertRecall({
        playerId,
        categoryId: entry.code,
        recalledLtId: effectiveLieutenantId,
        windowStartTick,
        windowEndTick,
        suspendedHigherOrderCategoryId: entry.successorCode,
        fallbackQualityBucket: fallbackBucket,
        reversalCost: reversalCost as unknown as Record<string, unknown>,
        accordDegradationApplied: accordApplied,
      });
      await this.graduationEventsRepo.recordRecall({
        playerId,
        categoryId: entry.code,
        lieutenantId: effectiveLieutenantId,
        masteryAtEvent: flip.masteryAtEvent,
        successorCategoryId: entry.successorCode,
        reversalCost: reversalCost as unknown as Record<string, unknown>,
        sessionRef: null, // BO-forensics-only field, MINOR-C5-1 continuity (unpopulated v1, joins via the audit row).
        gameTick: windowStartTick,
      });

      // §9.1 step 6 — lieutenant unbinding + tenure reset (C0 R2 DEFINITIVE branch: `resetTenureOnly`,
      // NEVER `reassign` wholesale — recall does not move the lieutenant). No settling window is invented
      // for a move that never happened (`settlingUntil = tenureResetAtTick`, i.e. already-expired/inert).
      await this.lieutenantRepo.resetTenureOnly(effectiveLieutenantId, {
        tenureResetAtTick: nowTick,
        settlingUntil: nowTick,
      });
    } catch (err) {
      // ★ Compensation (mirrors `graduation.service.ts`'s own — see file header): a failure AFTER the
      // winner gate must leave mastery_score net-UNTOUCHED (back to DELEGATED, the SAME lieutenant),
      // never a half-recalled row.
      await this.masteryScoreRepo.revertToDelegatedForRecall(playerId, entry.code, recalledLieutenantId);
      throw err;
    }

    this.bus.emitRecallInitiated({
      type: 'recall_initiated',
      playerId,
      categoryId: entry.code,
      lieutenantId: effectiveLieutenantId,
      fallbackQualityBucket: fallbackBucket,
      gameMinute: 0, // player-triggered HTTP — no scheduler ctx (the SAME convention GraduationCommittedEvent's own emit uses).
    });
    this.bus.emitAccordDegradation({
      type: 'accord_degradation',
      playerId,
      categoryId: entry.code,
      applied: accordApplied,
      target: accordTarget,
      severity: accordSeverity,
      gameMinute: 0,
    });

    this.logger.log(
      `recall COMMITTED: player=${playerId} category=${entry.code} lieutenant=${effectiveLieutenantId} ` +
        `fallback_bucket=${fallbackBucket} accord_target=${accordTarget} accord_applied=${accordApplied}.`,
    );

    return { recalled: true, category_id: entry.code, lieutenant_id: effectiveLieutenantId };
  }

  /**
   * `GET /v1/meta/recall-preview/:categoryId` (design §11) — the canon pre-decision warning: CONSULTATIVE,
   * a pure read, NEVER a gate, NEVER a mutation. Requires the category to be CURRENTLY DELEGATED (there is
   * no lieutenant/tenure to preview severance FROM otherwise) — refuses 409 on a non-DELEGATED category,
   * the SAME `RESOURCE_STATE_CONFLICT` code the real recall's own validate uses for the identical state
   * class. Shares its severance/re-delegation-penalty derivation with `requestRecall` (the SAME
   * `hasAnyLockForCategory` + `severanceBucketForTenure`/`escalateSeveranceBucket` calls) — never a second
   * implementation of the SAME rule.
   */
  async previewRecall(playerId: string, categoryId: number): Promise<RecallPreview> {
    const entry = TASK_CATEGORY_CATALOGUE.find((e) => e.code === categoryId);
    if (!entry || !entry.live) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `category ${categoryId} is not a LIVE TaskCategory.`,
        payloadVars: { category_id: categoryId },
      });
    }
    const masteryRow = await this.masteryScoreRepo.getRow(playerId, entry.code);
    if (!masteryRow || masteryRow.delegation_state !== 'DELEGATED' || !masteryRow.delegated_to_lieutenant_id) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `category ${categoryId} is not DELEGATED for this player — no recall to preview.`,
        payloadVars: { category_id: categoryId },
      });
    }

    const owned = await this.lieutenantRepo.getOwnedLieutenant(playerId, masteryRow.delegated_to_lieutenant_id);
    const tenureBucket = owned
      ? bucketForStreak(owned.tenure_score, lieutenantTunables.tenureInertia.thresholds)
      : 'FRESH';
    const hasPriorLock = await this.promotionLocksRepo.hasAnyLockForCategory(playerId, entry.code);
    const severanceBucket = hasPriorLock
      ? escalateSeveranceBucket(severanceBucketForTenure(tenureBucket))
      : severanceBucketForTenure(tenureBucket);

    const proficiencyRow = await this.playerProficiencyRepo.getRow(playerId, entry.code);
    const debt = proficiencyRow?.recall_debt_total ?? 0;
    const cap = metaProgressionTunables.recallDebtMax;
    const debtSignal = deriveRecallDebtSignal(debt, cap);

    const windowDays = metaProgressionTunables.promotionLockReversalWindowDays;

    return {
      drop_bucket: DROP_BUCKET_BY_SIGNAL[debtSignal],
      recovery_bucket: this.recoveryBandFromDebt(debt),
      severance_bucket: severanceBucket,
      window_days_band: this.windowDaysBand(windowDays),
      suspended_successor_key: entry.successorCode !== null
        ? TASK_CATEGORY_CATALOGUE.find((e) => e.code === entry.successorCode)?.key
        : undefined,
      re_delegation_penalty: hasPriorLock,
    };
  }

  /**
   * Design §9.1 step 1 — re-validate DELEGATED + no ACTIVE lock, entirely server-side (never trusted from
   * the client — the request carries only `{category_id}`). Returns the catalogue entry + the CURRENT
   * delegated lieutenant id (read here, BEFORE the winner gate — the flip's own WHERE re-checks this exact
   * value, so a stale read here only ever costs a genuine 409, never a wrong write).
   */
  private async validateRecallEligible(
    playerId: string,
    categoryId: number,
  ): Promise<{ entry: TaskCategoryCatalogueEntry; recalledLieutenantId: string }> {
    const entry = TASK_CATEGORY_CATALOGUE.find((e) => e.code === categoryId);
    if (!entry || !entry.live) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `category ${categoryId} is not a LIVE TaskCategory.`,
        payloadVars: { category_id: categoryId },
      });
    }

    const masteryRow = await this.masteryScoreRepo.getRow(playerId, entry.code);
    if (!masteryRow || masteryRow.delegation_state !== 'DELEGATED' || !masteryRow.delegated_to_lieutenant_id) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `category ${categoryId} is not DELEGATED for this player — nothing to recall.`,
        payloadVars: { category_id: categoryId },
      });
    }

    const activeLock = await this.promotionLocksRepo.findActiveForCategory(playerId, entry.code);
    if (activeLock !== null) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `category ${categoryId} already has an ACTIVE promotion lock — a second recall is refused until it closes.`,
        payloadVars: { category_id: categoryId },
      });
    }

    return { entry, recalledLieutenantId: masteryRow.delegated_to_lieutenant_id };
  }

  /**
   * Design §9.3 — accord coupling (REUSE-where-live). C0 R1 DEFINITIVE: the LIVE branch. This method's
   * OWN direct target (the `target` it returns, and therefore `accord_degradation_target` on the
   * public event — PINNED `'RESTRAINT_INDEX'` by `promotion_lock_recall.spec.ts:553`, union unchanged)
   * is decided FIRST and ONLY by the check just below: BOSS_MIRROR iff a declared rule matching
   * `RECALL_SEVERANCE_FAIR_PREFIX` is contradicted (`isDeclaredRuleContradictedBy`, the SAME lookup
   * the codebase's OWN R4b DD-BRIDGE already establishes at a sibling call site, REUSED verbatim);
   * RESTRAINT_INDEX otherwise, via `recordDisputeOutcome`.
   *
   * ⚠️ CORRIGÉ 2026-08-13 (W6.2 BLOCKING-3) — ce docblock affirmait que l'omission du paramètre
   * `lieutenantId` sur l'appel `recordDisputeOutcome` était volontaire, pour éviter un double-write
   * avec le DD-BRIDGE interne de cette méthode. C'était une lecture partielle : le bridge INTERNE de
   * `recordDisputeOutcome` teste un préfixe de règle déclarée DIFFÉRENT (`settle_fair`, disjoint de
   * `RECALL_SEVERANCE_FAIR_PREFIX` testé ci-dessus) — les deux checks ne peuvent jamais matcher la
   * MÊME règle déclarée, donc rien ne pouvait doubler. Fournir `recalledLieutenantId` en 5ᵉ argument
   * rend simplement ce bridge interne ATTEIGNABLE (il était structurellement mort auparavant, seul
   * appelant de production, W6.2 §1.2) : si le joueur a par ailleurs déclaré une règle `settle_fair`
   * contredite par cette sortie, `BossMirrorService.recordViolation` s'exécute EN PLUS de l'écriture
   * RESTRAINT_INDEX ci-dessous — une conséquence EN AVAL de `recordDisputeOutcome`, jamais un second
   * `target` de cette méthode : le `target` qu'elle retourne reste décidé par le SEUL check ci-dessus.
   *
   * ⊥ IMPORTANT-C8-1 fix (2026-07-19) — `meta.promotion_lock_reversal_cost_multiplier` CONSUMED here.
   * Canon `promotion_lock.md` §Transform step 7 (verbatim): *"pendant la fenêtre unmanaged, si le joueur
   * tente de re-déléguer la catégorie, le coût (en sévérance fictive + temps de formation) est multiplié
   * par {{tunable:T.meta.promotion_lock_reversal_cost_multiplier}}"* — the reversal-cost getter literally
   * MULTIPLIES the fictional-severance cost on a re-delegation. Design D12 echoes it: "re-graduates at
   * meta.promotion_lock_reversal_cost_multiplier × the in-fiction cost surface" — `SEVERANCE_WEIGHT` (the
   * numeric cost surface C8 invented to feed the REAL 04c ring) IS that surface. `reDelegationPenalty`
   * (`hasPriorLock`, the SAME D12 signal that drives `escalateSeveranceBucket`) gates it: FIRST-ever
   * recall -> `weight` UNCHANGED (multiplier not consumed, canon's own "si le joueur tente de
   * re-déléguer" scoping — nothing to multiply on a first recall); re-delegation recall -> `weight ×
   * metaProgressionTunables.promotionLockReversalCostMultiplier` (default 3, so 3× — the canon default;
   * DB/env-override within the registered 1..10 clamp moves this proportionally, GM-tunable, no code
   * change). This is ADDITIVE to (never a replacement for) the ALREADY-⊥-approved qualitative
   * `escalateSeveranceBucket` band step (Ruling #1, `.review-c8/VERDICT.md`) — the band answers "how bad",
   * the multiplier answers "by how much the underlying cost scales", both derived from the SAME
   * `hasPriorLock` signal, matching D12's own "v1 realization = [band] AND [multiplier band]" dual clause.
   */
  private async applyReversalDamage(
    playerId: string,
    recalledLieutenantId: string,
    severanceBucket: SeveranceBucket,
    reDelegationPenalty: boolean,
  ): Promise<{ applied: true; target: 'RESTRAINT_INDEX' | 'BOSS_MIRROR'; severity: number; weight: number }> {
    const baseWeight = SEVERANCE_WEIGHT[severanceBucket];
    const weight = reDelegationPenalty ? baseWeight * metaProgressionTunables.promotionLockReversalCostMultiplier : baseWeight;
    const extractionRatio = 1.0; // claimed === claimable, by construction (SEVERANCE_WEIGHT's own header).
    const severity = Math.round(extractionRatio * 100);

    const matchedRuleId = await this.bossMirror.isDeclaredRuleContradictedBy(
      playerId,
      RECALL_SEVERANCE_FAIR_PREFIX,
      extractionRatio,
    );
    if (matchedRuleId !== null) {
      await this.bossMirror.recordViolation(playerId, recalledLieutenantId, matchedRuleId, severity);
      return { applied: true, target: 'BOSS_MIRROR', severity, weight };
    }

    // W6.2 C4-bis — DI-adjacent DEVIATION (measured, not a redesign): `recordDisputeOutcome`'s own
    // docblock (restraint-index.service.ts:145-147) is explicit — "lieutenantId (optional): when
    // provided, the breach-check uses it as the ring key for the BossMirrorViolationRing write.
    // Without it, the bridge is structurally skipped." This call omitted the 5th argument, so
    // Step 2's bridge (BRIDGE_SETTLE_FAIR_PREFIX check → recordViolation) could NEVER fire from
    // this — the ONLY production call site (confirmed by grep, W6.2 §1.2) — regardless of any
    // declared rule or extraction ratio. `recalledLieutenantId` is already in scope and IS a
    // lieutenant id (the same role `recordViolation`'s own `lieutenantId` param expects) — passing
    // it here is not a new decision, it supplies the parameter the callee's own contract already
    // names. Without this, C4-bis's own falsifiable (boss_mirror_violation_ring non-empty after a
    // POST /v1/meta/recall under max-extract, extractionRatio=1.0 by construction just above,
    // §3 C4-bis) could never pass — the chunk's core claim ("ressuscite deux tables d'un coup").
    //
    // ⚠️ CORRIGÉ 2026-08-13 (revue ⊥, BLOCKING-3) — cette Deviation n'avait lu que le docblock du
    // CALLEE (ci-dessus). Le docblock du CALLER (juste au-dessus de `applyReversalDamage`, avant
    // correction) documentait l'omission comme DÉLIBÉRÉE pour un motif propre : c'était donc un
    // conflit avec une décision documentée, pas un imprévu — le socle demande STOP, pas une
    // Deviation silencieuse. Revue ⊥ tranchée : le correctif reste (fondé — préfixes de règle
    // disjoints, voir le docblock du caller reformulé), la documentation du caller est reformulée
    // pour dire le contrat réel, `accord_degradation_target` n'est pas touché (reste le target
    // DIRECT décidé par le check ci-dessus, PINNED `promotion_lock_recall.spec.ts:553`).
    await this.restraintIndex.recordDisputeOutcome(playerId, recalledLieutenantId, weight, weight, recalledLieutenantId);
    return { applied: true, target: 'RESTRAINT_INDEX', severity, weight };
  }

  /** `recovery_bucket` band (design §11 — coder-discretion thresholds, canon gives no numbers, see file
   *  header): reuses the SAME `floor(debt/10)` term the realization formula (`recovery-period.ts`) already
   *  computes — 0 extra sessions (debt < 10) -> COURT; 1 extra session (10 <= debt < 20) -> MOYEN; 2+
   *  extra sessions (debt >= 20) -> LONG. No new constant beyond what the realization formula already
   *  uses. */
  private recoveryBandFromDebt(debt: number): RecallPreview['recovery_bucket'] {
    const extraSessions = Math.floor(debt / 10);
    if (extraSessions <= 0) return 'COURT';
    if (extraSessions === 1) return 'MOYEN';
    return 'LONG';
  }

  /** `window_days_band` (design §11 — coder-discretion thresholds over the REGISTERED
   *  `meta.promotion_lock_reversal_window_days` range, 1..30, `meta-progression-tunables.ts`): a coarse
   *  thirds-style band, mirrors `progressBandForMasteryBucket`'s own "coarse band over a registered range"
   *  posture — value-sensitive (a tunable flip moves the band). */
  private windowDaysBand(days: number): RecallPreview['window_days_band'] {
    if (days <= 7) return 'SHORT';
    if (days <= 14) return 'STANDARD';
    return 'EXTENDED';
  }
}
