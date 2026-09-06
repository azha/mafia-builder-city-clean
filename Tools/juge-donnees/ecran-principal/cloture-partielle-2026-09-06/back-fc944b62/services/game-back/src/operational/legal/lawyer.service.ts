// IMPLEMENTS: docs/superpowers/plans/2026-06-30-04d-A-lawyer-legal-plan.md C5 + C8
//             Canon: docs/tech/04d_meta_market_lawyer_and_internal_affairs/lawyer_legal_system.md §2 (G5)
//             — 04d-A C5 — 2026-06-30 | C8 additions — 2026-06-30
//
// `LawyerService` — the 3-tier defense model operations.
//
// C5 scope:
//   hire(playerId, tier, opts?)      — create a Tier-2/3 lawyer row + atomic guarded debit.
//   setRetainer(lawyerId, active)    — toggle retainer_active + set/clear monthly cost.
//   reassignCase(caseId, newLawyerId) — mid-case tier upgrade: recompute info_leak_rate + extend duration.
//
// C8 additions (Tier-3 burn + the IA-flip consequence):
//   issueTier3Payoff(caseId, gameMinute) — Tier-3 only + low-severity only:
//     dismiss the charge via the corrupt-clerk path, then burn_risk_score += tier3PayoffBurnRiskIncrement.
//     Deducts tier3PayoffDropChargeCostCents from the player's cash (atomic guard).
//     Emits CaseResolvedEvent(outcome='dismissed') on the city-event-bus.
//     ⚠️ suspicion_map clerk mutation DEFERRED (TD) — clerk substrate absent (city_state.ts:65 NULL).
//   evaluateBurnRisk(lawyerId, gameMinute) — NIGHTLY per-lawyer:
//     if burn_risk_score > tier3BurnThreshold:
//       → emit LawyerBurnedEvent (the 04d-B IA §13 flip entry-point).
//       → cancel all active Tier-3 cases (switch to auto-Tier-1 public_defender).
//       → clamp burn_risk_score = tier3BurnThreshold (idempotency guard: prevents re-fire).
//     Idempotent: after clamping, next NIGHTLY call sees score ≤ threshold → no re-fire.
//   evaluateBurnForPlayer(ctx) — NIGHTLY per-player: finds all Tier-3 lawyers + calls evaluateBurnRisk.
//
// Tier model (unified cost ladder, decision #7 RATIFIÉ 2026-06-30):
//   Tier-1 public_defender: GRATUIT ($0) — auto-assigned by LegalCaseService.createCase; NOT via hire().
//   Tier-2 boutique:        per-case fee = tier2PerCaseCostCentsMin (deterministic in C5, seeded draw in C6+).
//                           OR retainer at tier2RetainerMonthlyCostCents (setRetainer path).
//   Tier-3 corruption_pipeline: base fee = tier3CorruptionLawyerBaseCostCents.
//
// Tier effects on reassignCase (plan §C5):
//   Tier-2 boutique:           info_leak_rate = tier1Rate × (1 − tier2InfoLeakReduction) [−40%]
//                              ticks extended: old_ticks × tier2CaseDurationMultiplier    [+30%]
//   Tier-3 corruption_pipeline: info_leak_rate = tier1Rate × (1 − tier3InfoLeakReduction) [−80%]
//                              no duration extension (dismiss low-severity is a C7 resolution effect).
//
// Cost debit (hire): atomic guarded via LegalCaseRepository.debitCash (UPDATE ... WHERE cash_cents >= cost).
//   Insufficient balance → HttpException 402 (matching contract.service.ts pattern).
//   Tier-1 GRATUIT: hire() rejects 'public_defender' tier (auto-assigned only via createCase).
//
// Tier-3 quest gate (RATIFIÉ plan §C5): `opts.questId` is accepted by the backend.
//   The Unity quest UI is deferred (TD); the backend stores `created_via_quest_id` if provided.
//   No live quest validation in C5 (the quest system is not yet built); the field is nullable FK.
//   A production guard (quest validation) is a future Unity/quests-system addition.
//
// R2.2 / P5: info_leak_rate, burn_risk_score are SERVER-ONLY. Never forwarded to the player client.
//   burn_risk_score → BurnRiskBucket (composite, decision #6, C9); the player sees only the
//   qualitative Exception ("lawyer acting nervous") when approaching 'critical'.
// No Math.random. No Date.now(). Pure debit arithmetic + seeded RNG not used here (payoff is deterministic).
// R9.3: ADDITIVE only.

import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';

import type { LawyerRow, LegalCaseRow } from '../../db/schema/legal';
import { LegalCaseRepository } from './legal-case.repository';
import { LawyerTunables } from './lawyer.tunables';
import { CityEventBus } from '../../citysim/events/city-event-bus';
import type { Tier3LawyerUsedEvent } from '../../citysim/events/city-event-bus';
import type { LawyerBurnedEvent, CaseResolvedEvent, DefendantType } from './legal.types';

/** Options for LawyerService.hire (Tier-3 quest gate backend-side). */
export interface HireOpts {
  /**
   * questId — the recruitment quest UUID that introduced this Tier-2/3 lawyer.
   * Optional in C5 (the Unity quest UI is deferred TD); stored as created_via_quest_id.
   * No live quest validation in C5.
   */
  readonly questId?: string;
  /**
   * name — display name for the hired lawyer (optional; defaults to tier label).
   * Tier-2: 'Boutique Counsel'. Tier-3: 'Corruption Pipeline'. Overridable by caller.
   */
  readonly name?: string;
}

@Injectable()
export class LawyerService {
  private readonly logger = new Logger(LawyerService.name);

  constructor(
    private readonly caseRepo: LegalCaseRepository,
    private readonly tunables: LawyerTunables,
    private readonly bus: CityEventBus,
  ) {}

  // ── C5: hire ────────────────────────────────────────────────────────────────────────────────

  /**
   * hire — create a Tier-2 or Tier-3 lawyer for the player + atomically debit the case fee.
   *
   * Sequence:
   *   1. Validate tier: 'boutique' or 'corruption_pipeline' only.
   *      'public_defender' is auto-assigned by createCase (NOT via hire) → 400 guard.
   *   2. Resolve cost:
   *      Tier-2 boutique: tier2PerCaseCostCentsMin (the minimum per-case fee; deterministic in C5).
   *      Tier-3 corruption_pipeline: tier3CorruptionLawyerBaseCostCents (base $40k).
   *   3. Debit atomically via debitCash (UPDATE ... WHERE cash_cents >= cost):
   *      Insufficient balance → throw 402 (matches contract.service.ts:287 pattern).
   *   4. Insert lawyers row (sessions_active=0; no cases assigned yet — the caller must call
   *      reassignCase separately to attach the lawyer to a specific case).
   *   5. Return the inserted lawyers row.
   *
   * [PROV-Y26Q2]: the per-case fee range (Tier-2: 500k..1500k) has min/max registry keys.
   *   C5 uses the min as the deterministic hire cost. Seeded draw from [min, max] is C6+ scope.
   *
   * Anti-fabrication: no Math.random. lawyer_id PK is DB defaultRandom().
   * R2.2/P5: burn_risk_score=0.0 at hire (no risk until C8 Tier-3 payoffs accumulate).
   */
  async hire(
    playerId: string,
    tier: 'boutique' | 'corruption_pipeline',
    opts?: HireOpts,
  ): Promise<LawyerRow> {
    // 1. Validate tier — public_defender is NOT hirable (auto-assigned only).
    if ((tier as string) === 'public_defender') {
      throw new HttpException(
        'Tier-1 public_defender is auto-assigned at LAWYER_UP and cannot be hired explicitly. ' +
          'Use LegalCaseService.createCase (LAWYER_UP path) instead.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // 2. Resolve per-case cost from the unified cost ladder (decision #7).
    const costCents = this.resolveCostForTier(tier);

    // 3. Atomic guarded debit.
    const debited = await this.caseRepo.debitCash(playerId, costCents);
    if (!debited) {
      throw new HttpException(
        `Insufficient cash to hire a ${tier} lawyer (cost: ${costCents} cents). ` +
          `Top up the player's wallet and retry.`,
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    // 4. Insert the lawyers row.
    //    sessions_active=0: the lawyer has no active cases at hire time.
    //    The caller must call reassignCase separately to attach the lawyer to a specific case.
    const defaultName = tier === 'boutique' ? 'Boutique Counsel' : 'Corruption Pipeline';
    const lawyerRow = await this.caseRepo.insertLawyer({
      player_id: playerId,
      tier,
      name: opts?.name ?? defaultName,
      retainer_active: false,
      burn_risk_score: 0.0,
      sessions_active: 0,
      created_via_quest_id: opts?.questId ?? undefined,
    });

    this.logger.log(
      `LawyerService.hire CREATED lawyerId=${lawyerRow.lawyer_id} ` +
        `playerId=${playerId} tier=${tier} costCents=${costCents} ` +
        `questId=${opts?.questId ?? 'none'}`,
    );

    return lawyerRow;
  }

  // ── C5: setRetainer ─────────────────────────────────────────────────────────────────────────

  /**
   * setRetainer — toggle the monthly retainer arrangement for a Tier-2 (or Tier-3) lawyer.
   *
   * Sequence:
   *   1. Fetch the lawyer row (404 if not found).
   *   2. Validate: Tier-1 public_defender cannot have a retainer (no-cost Tier-1 = no fee model).
   *   3. Set retainer_active = active.
   *   4. If active=true: set retainer_monthly_cost_cents = tier2RetainerMonthlyCostCents.
   *      If active=false: clear retainer_monthly_cost_cents (null; back to per-case billing).
   *   5. Return the updated lawyers row.
   *
   * Note: setRetainer does NOT debit anything in C5 — the monthly retainer is billed by the
   * NIGHTLY sweep (C7/C8). This method only updates the billing model flag.
   *
   * Falsifiable: after setRetainer(id, true), the lawyers row has retainer_active=true AND
   *   retainer_monthly_cost_cents = tier2RetainerMonthlyCostCents (200000 by default).
   *
   * W6a C4 (P-A, finding #7) — `playerId` is now the FIRST argument, and the lawyer read is joint
   * (`lawyer_id = ? AND player_id = ?`, single round-trip): a lawyer belonging to a DIFFERENT
   * player yields 0 rows ⇒ 404 `RESOURCE_NOT_FOUND` (D2), BEFORE the retainer is ever toggled.
   * Pre-fix, this method took no `playerId` at all — `findLawyerById(lawyerId)` alone let ANY
   * caller activate/deactivate the retainer of a rival's lawyer.
   *
   * @param playerId — the caller's player uuid. Must be the ACTUAL owner of `lawyerId` (W6a C4).
   * @param lawyerId — the lawyers.lawyer_id to toggle.
   * @param active   — the desired retainer_active state.
   */
  async setRetainer(playerId: string, lawyerId: string, active: boolean): Promise<LawyerRow> {
    // 1. Fetch lawyer — scoped to `playerId` (W6a C4).
    const existing = await this.caseRepo.findLawyerByIdScoped(lawyerId, playerId);
    if (!existing) {
      throw new HttpException(
        `Lawyer ${lawyerId} not found.`,
        HttpStatus.NOT_FOUND,
      );
    }

    // 2. Guard: Tier-1 public_defender has no retainer model.
    if (existing.tier === 'public_defender') {
      throw new HttpException(
        'Tier-1 public_defender does not support a retainer arrangement (GRATUIT per-case only).',
        HttpStatus.BAD_REQUEST,
      );
    }

    // 3. Resolve the monthly cost (only set when active=true).
    const monthlyCostCents = active ? this.tunables.tier2RetainerMonthlyCostCents : null;

    // 4. Persist.
    const updated = await this.caseRepo.updateLawyerRetainer(lawyerId, active, monthlyCostCents);

    this.logger.log(
      `LawyerService.setRetainer lawyerId=${lawyerId} active=${active} ` +
        `monthlyCostCents=${monthlyCostCents ?? 'null'}`,
    );

    return updated;
  }

  // ── C5: reassignCase ────────────────────────────────────────────────────────────────────────

  /**
   * reassignCase — mid-case lawyer upgrade: reassign a legal_cases row to a different (higher)
   * tier lawyer, recomputing info_leak_rate and extending duration if Tier-2.
   *
   * Sequence:
   *   1. Fetch the case (404 if not found; 400 if not 'active' — can only reassign active cases).
   *   2. Fetch the new lawyer (404 if not found; must belong to the same player).
   *   3. Compute new info_leak_rate from the new tier (from the canonical Tier-1 base rate):
   *      Tier-1 public_defender: tier1InfoLeakRate             (unchanged; no reduction)
   *      Tier-2 boutique:        tier1Rate × (1 − tier2InfoLeakReduction)  [−40%]
   *      Tier-3 corruption_pipeline: tier1Rate × (1 − tier3InfoLeakReduction) [−80%]
   *   4. Compute new ticks:
   *      Tier-2: ticks_remaining × tier2CaseDurationMultiplier  [+30% remaining time]
   *              case_duration_ticks × tier2CaseDurationMultiplier
   *      Tier-3: no duration extension (dismiss low-severity is C7 resolution; not a duration bonus).
   *   5. Reassign in DB: update lawyer_id, info_leak_rate, ticks_remaining, case_duration_ticks.
   *   6. Decrement old lawyer's sessions_active (-1).
   *   7. Increment new lawyer's sessions_active (+1).
   *   8. Return the updated case row.
   *
   * R2.2/P5: info_leak_rate is SERVER-ONLY. The updated rate is written here; never
   *   forwarded to the player client (only asserted in test-env BO probe).
   *
   * Anti-fabrication: all arithmetic from registry tunables (no inline constants).
   * No Math.random. No Date.now().
   *
   * W6a C4 (P-A, finding #8) — `playerId` is now the FIRST argument, and BOTH reads below are
   * joint (`… = ? AND player_id = ?`, single round-trip each): a case OR a lawyer belonging to a
   * DIFFERENT player yields 0 rows ⇒ 404 `RESOURCE_NOT_FOUND` (D2), BEFORE anything is written.
   * Pre-fix, this method took no `playerId` at all — `findCaseById(caseId)` alone let ANY caller
   * reassign a rival's case (the old `newLawyer.player_id !== caseRow.player_id` check only
   * verified the TWO OBJECTS agreed with EACH OTHER, never with the CALLER — a couple
   * `(caseId: rival's, newLawyerId: that SAME rival's OTHER lawyer)` satisfied it trivially).
   * That cross-check is now REDUNDANT (both reads are already scoped to `playerId`, so
   * `caseRow.player_id === playerId === newLawyer.player_id` holds by construction) — removed
   * rather than kept as dead code that could mislead a future reader into thinking it's still
   * the guard.
   *
   * @param playerId    — the caller's player uuid. Must be the ACTUAL owner of BOTH `caseId` and
   *                      `newLawyerId` (W6a C4 joint reads).
   * @param caseId      — the legal_cases.case_id to reassign.
   * @param newLawyerId — the lawyers.lawyer_id to assign.
   */
  async reassignCase(playerId: string, caseId: string, newLawyerId: string): Promise<LegalCaseRow> {
    // 1. Fetch the case — scoped to `playerId` (W6a C4).
    const caseRow = await this.caseRepo.findCaseByIdScoped(caseId, playerId);
    if (!caseRow) {
      throw new HttpException(`Case ${caseId} not found.`, HttpStatus.NOT_FOUND);
    }
    if (caseRow.status !== 'active') {
      throw new HttpException(
        `Case ${caseId} is ${caseRow.status} — only active cases can be reassigned.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // 2. Fetch the new lawyer — scoped to `playerId` (W6a C4). Replaces the old cross-object
    //    `newLawyer.player_id !== caseRow.player_id` check (see docblock above).
    const newLawyer = await this.caseRepo.findLawyerByIdScoped(newLawyerId, playerId);
    if (!newLawyer) {
      throw new HttpException(`Lawyer ${newLawyerId} not found.`, HttpStatus.NOT_FOUND);
    }

    // 3. Compute new info_leak_rate.
    const newInfoLeakRate = this.computeLeakRateForTier(newLawyer.tier);

    // 4. Compute new ticks (only extended for Tier-2).
    let newTicksRemaining = caseRow.ticks_remaining;
    let newCaseDurationTicks = caseRow.case_duration_ticks;
    if (newLawyer.tier === 'boutique') {
      const mult = this.tunables.tier2CaseDurationMultiplier;
      newTicksRemaining = Math.round(caseRow.ticks_remaining * mult);
      newCaseDurationTicks = Math.round(caseRow.case_duration_ticks * mult);
    }

    // 5. Persist the reassignment atomically.
    const updatedCase = await this.caseRepo.reassignCaseToLawyer(
      caseId,
      newLawyerId,
      newInfoLeakRate,
      newTicksRemaining,
      newCaseDurationTicks,
    );

    // 6. Decrement old lawyer's sessions_active (if a lawyer was previously assigned).
    if (caseRow.lawyer_id && caseRow.lawyer_id !== newLawyerId) {
      await this.caseRepo.incrementLawyerSessions(caseRow.lawyer_id, -1);
    }

    // 7. Increment new lawyer's sessions_active.
    await this.caseRepo.incrementLawyerSessions(newLawyerId, 1);

    this.logger.log(
      `LawyerService.reassignCase caseId=${caseId} ` +
        `oldLawyerId=${caseRow.lawyer_id ?? 'none'} newLawyerId=${newLawyerId} ` +
        `newTier=${newLawyer.tier} newInfoLeakRate=${newInfoLeakRate.toFixed(4)} ` +
        `newTicksRemaining=${newTicksRemaining} newCaseDurationTicks=${newCaseDurationTicks}`,
    );

    return updatedCase;
  }

  // ── Pure helpers ─────────────────────────────────────────────────────────────────────────────

  /**
   * resolveCostForTier — return the hire cost in cents for the given tier.
   *
   * Tier-2 boutique: tier2PerCaseCostCentsMin (the minimum per-case fee; deterministic in C5).
   *   [PROV-Y26Q2]: C6+ scope will use a seeded draw from [min, max] for per-case fee.
   * Tier-3 corruption_pipeline: tier3CorruptionLawyerBaseCostCents (base $40k).
   *
   * Only called for non-Tier-1 tiers (Tier-1 is GRATUIT, not hirable via this service).
   * Anti-fabrication: all values from registry tunables (no inline constants).
   */
  resolveCostForTier(tier: 'boutique' | 'corruption_pipeline'): number {
    switch (tier) {
      case 'boutique':
        return this.tunables.tier2PerCaseCostCentsMin;
      case 'corruption_pipeline':
        return this.tunables.tier3CorruptionLawyerBaseCostCents;
    }
  }

  /**
   * computeLeakRateForTier — compute info_leak_rate for a given lawyer tier.
   *
   * Formula (from canonical tunables, plan §C5):
   *   Tier-1 public_defender: tier1InfoLeakRate                                  (base rate)
   *   Tier-2 boutique:        tier1InfoLeakRate × (1 − tier2InfoLeakReduction)   [−40%]
   *   Tier-3 corruption_pipeline: tier1InfoLeakRate × (1 − tier3InfoLeakReduction) [−80%]
   *
   * R2.2/P5: the returned rate is a SERVER-ONLY scalar (never forwarded to the player client).
   * Anti-fabrication: tier2InfoLeakReduction = 0.40, tier3InfoLeakReduction = 0.80 (registry).
   *
   * @param tier — the new lawyer tier.
   * @returns info_leak_rate as a float in [0, 1).
   */
  computeLeakRateForTier(tier: 'public_defender' | 'boutique' | 'corruption_pipeline'): number {
    const base = this.tunables.tier1InfoLeakRate;
    switch (tier) {
      case 'public_defender':
        return base;
      case 'boutique':
        return base * (1 - this.tunables.tier2InfoLeakReduction);
      case 'corruption_pipeline':
        return base * (1 - this.tunables.tier3InfoLeakReduction);
    }
  }

  // ── C8: issueTier3Payoff + evaluateBurnRisk + auto-Tier-1 fallback ─────────────────────────

  /**
   * issueTier3Payoff — issue a corrupt-clerk payoff to dismiss a low-severity charge.
   *
   * Preconditions (validates all, throws 400/402 on violation):
   *   1. The case must be 'active'.
   *   2. The case's lawyer must be Tier-3 (corruption_pipeline).
   *   3. The charge must be low-severity (misdemeanor or felony_low) — Tier-3 payoffs cannot
   *      dismiss felony_high or major_crime.
   *   4. Player must have sufficient cash (tier3PayoffDropChargeCostCents).
   *
   * Sequence (on success):
   *   1. Atomic guarded debit of tier3PayoffDropChargeCostCents from the player's cash.
   *   2. Dismiss the case via resolveAndUpdateCase (status='dismissed', WHERE status='active').
   *   3. Increment burn_risk_score by tier3PayoffBurnRiskIncrement (clamped [0, 1]).
   *   4. Emit CaseResolvedEvent(outcome='dismissed') on the city-event-bus.
   *
   * ⚠️ suspicion_map clerk mutation DEFERRED (TD): the clerk substrate (city_state.ts:65
   *   corruption_clerk_id) is NULL in v1 — the payoff does the charge-dismiss but NOT the
   *   suspicion_map update. This is a forward-deferred mechanic per the plan §C8.
   *
   * R2.2/P5: burn_risk_score is SERVER-ONLY — incremented here but never returned to the client.
   *   The client sees only the qualitative Exception from BurnRiskBucket (C9 projection).
   * Anti-fabrication: no Math.random. No Date.now(). Deterministic debit + dismiss.
   *
   * Returns: an object with { case, lawyerRow } after the payoff.
   *
   * W6a C3 (P-A) — `playerId` is now the FIRST argument, and both reads below are joint
   * (`… = ? AND player_id = ?`, single round-trip): a case or lawyer belonging to a DIFFERENT
   * player yields 0 rows ⇒ 404 `RESOURCE_NOT_FOUND` (D2), BEFORE the debit at step 4. Pre-fix, this
   * method took no `playerId` at all — `findCaseById(caseId)` alone let ANY caller dismiss ANY
   * player's case, debit THEIR cash, and burn THEIR lawyer.
   *
   * @param playerId   — the caller's player uuid. Must be the ACTUAL owner of `caseId` (and,
   *                     transitively, of its assigned lawyer) — W6a C3 joint read.
   * @param caseId     — the legal_cases.case_id to dismiss via payoff.
   * @param gameMinute — current in-game minute (for CaseResolvedEvent).
   */
  async issueTier3Payoff(
    playerId: string,
    caseId: string,
    gameMinute: number,
  ): Promise<{ caseRow: LegalCaseRow; lawyerRow: LawyerRow }> {
    // 1. Read the case to validate preconditions — scoped to `playerId` (W6a C3).
    const caseRow = await this.caseRepo.findCaseByIdScoped(caseId, playerId);
    if (!caseRow) {
      throw new HttpException(`Case ${caseId} not found.`, HttpStatus.NOT_FOUND);
    }
    if (caseRow.status !== 'active') {
      throw new HttpException(
        `Case ${caseId} is ${caseRow.status} — issueTier3Payoff requires an active case.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // 2. Validate Tier-3 lawyer — scoped too (belt-and-suspenders; `caseRow` is already proven
    //    `playerId`'s own by step 1, but the lawyer read re-states the predicate rather than
    //    trusting `caseRow.lawyer_id` alone a second time — W6a C3).
    const lawyerRow = caseRow.lawyer_id
      ? await this.caseRepo.findLawyerByIdScoped(caseRow.lawyer_id, playerId)
      : null;
    if (!lawyerRow || lawyerRow.tier !== 'corruption_pipeline') {
      throw new HttpException(
        `Case ${caseId} does not have a Tier-3 (corruption_pipeline) lawyer — ` +
          `issueTier3Payoff is a Tier-3-only action.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // 3. Validate low-severity (misdemeanor or felony_low only).
    const LOW_SEVERITY_SET = new Set<string>(['misdemeanor', 'felony_low']);
    if (!LOW_SEVERITY_SET.has(caseRow.charge_severity)) {
      throw new HttpException(
        `issueTier3Payoff cannot dismiss ${caseRow.charge_severity} charges — ` +
          `only misdemeanor or felony_low charges can be dismissed via payoff (plan §C8).`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // 4. Atomic guarded debit — sources `playerId` (the caller, W6a C3), never `caseRow.player_id`.
    //    Both are provably equal after step 1's joint read, but the debit stops trusting the ROW
    //    for the identity it debits — the exact discipline the pire finding was missing.
    const costCents = this.tunables.tier3PayoffDropChargeCostCents;
    const debited = await this.caseRepo.debitCash(playerId, costCents);
    if (!debited) {
      throw new HttpException(
        `Insufficient cash to issue a Tier-3 payoff for case ${caseId} ` +
          `(cost: ${costCents} cents). Top up the player's wallet and retry.`,
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    // 5. Dismiss the case (stamp status='dismissed', WHERE status='active').
    const dismissedCase = await this.caseRepo.resolveAndUpdateCase(caseId, 'dismissed');

    // 6. Decrement lawyer sessions_active (case is no longer active).
    await this.caseRepo.incrementLawyerSessions(lawyerRow.lawyer_id, -1);

    // 7. Increment burn_risk_score by tier3PayoffBurnRiskIncrement (clamped [0, 1]).
    const increment = this.tunables.tier3PayoffBurnRiskIncrement;
    const newScore = Math.min(1.0, lawyerRow.burn_risk_score + increment);
    const updatedLawyer = await this.caseRepo.updateLawyerBurnRisk(lawyerRow.lawyer_id, newScore);

    // 8. Emit CaseResolvedEvent(outcome='dismissed') — qualitative only (R2.2/P5).
    const resolvedEvent: CaseResolvedEvent = {
      type: 'case_resolved',
      playerId: caseRow.player_id,
      caseId,
      defendantType: caseRow.defendant_type as DefendantType,
      outcome: 'dismissed',
      gameMinute,
    };
    this.bus.emitCaseResolved(resolvedEvent);

    // 9. [04d-B C3 ADDITIVE] Emit Tier3LawyerUsedEvent — IATargetService subscribes (decision #2).
    // Bus-decoupled: no import of IATargetService (avoids circular dependency).
    // IATargetService.onModuleInit subscribes → recordCorruptUse (IA accrual) + recordTier3Use (reverse bump).
    // R2.2/P5: NO raw burn_risk_score or suspicion_level in this event payload.
    const tier3UsedEvent: Tier3LawyerUsedEvent = {
      type: 'tier3_lawyer_used',
      playerId: caseRow.player_id,
      lawyerId: lawyerRow.lawyer_id,
      gameMinute,
    };
    this.bus.emitTier3LawyerUsed(tier3UsedEvent);

    this.logger.log(
      `LawyerService.issueTier3Payoff FIRED: caseId=${caseId} player=${caseRow.player_id} ` +
        `charge=${caseRow.charge_severity} lawyerId=${lawyerRow.lawyer_id} ` +
        `costCents=${costCents} burnRisk=${lawyerRow.burn_risk_score.toFixed(3)}→${newScore.toFixed(3)} ` +
        `gameMinute=${gameMinute} — Tier3LawyerUsedEvent emitted (04d-B C3 ADDITIVE).`,
    );

    return { caseRow: dismissedCase, lawyerRow: updatedLawyer };
  }

  /**
   * evaluateBurnRisk — NIGHTLY per-lawyer burn check.
   *
   * If burn_risk_score > tier3BurnThreshold:
   *   1. Emit LawyerBurnedEvent (the 04d-B IA §13 flip entry-point — FIRST fire here in C8).
   *   2. Find all active cases assigned to this lawyer → switch each to a Tier-1 public_defender.
   *   3. Clamp burn_risk_score = tier3BurnThreshold (idempotency guard: next NIGHTLY call
   *      sees score == threshold → score > threshold is FALSE → no re-fire).
   *
   * Idempotency: after clamping, `score > threshold` is false on the next call. If the player
   * then issues more payoffs via a different case (impossible — cases were switched to Tier-1),
   * the score would increment above threshold again and fire once more. In practice: after
   * burning, all cases are Tier-1 (no Tier-3 cases to issue payoffs on), so no re-increment.
   *
   * If burn_risk_score <= tier3BurnThreshold: no-op (returns { burned: false }).
   *
   * R2.2/P5: burn_risk_score and LawyerBurnedEvent carry NO raw scalars.
   *   The player sees only the qualitative Exception ("lawyer acting nervous") from BurnRiskBucket.
   * Anti-fabrication: no Math.random. No Date.now(). Deterministic threshold check.
   *
   * @param lawyerId   — the lawyers.lawyer_id to evaluate.
   * @param gameMinute — current in-game minute (for LawyerBurnedEvent).
   * @returns { burned: boolean; casesRerouted: number }
   */
  async evaluateBurnRisk(
    lawyerId: string,
    gameMinute: number,
  ): Promise<{ burned: boolean; casesRerouted: number }> {
    const lawyerRow = await this.caseRepo.findLawyerById(lawyerId);
    if (!lawyerRow) {
      this.logger.warn(`LawyerService.evaluateBurnRisk: lawyer ${lawyerId} not found — skipping.`);
      return { burned: false, casesRerouted: 0 };
    }

    // Only Tier-3 lawyers can burn (burn_risk accumulates only via Tier-3 payoffs).
    if (lawyerRow.tier !== 'corruption_pipeline') {
      return { burned: false, casesRerouted: 0 };
    }

    // Threshold check.
    const threshold = this.tunables.tier3BurnThreshold;
    if (lawyerRow.burn_risk_score <= threshold) {
      return { burned: false, casesRerouted: 0 };
    }

    // ── BURN: burn_risk_score > threshold ────────────────────────────────────────────────────

    // 1. Emit LawyerBurnedEvent (the IA-B §13 flip entry-point).
    const burnEvent: LawyerBurnedEvent = {
      type: 'lawyer_burned',
      playerId: lawyerRow.player_id,
      lawyerId,
      gameMinute,
    };
    this.bus.emitLawyerBurned(burnEvent);

    this.logger.warn(
      `LawyerService.evaluateBurnRisk BURNED: lawyerId=${lawyerId} ` +
        `player=${lawyerRow.player_id} burnRiskScore=${lawyerRow.burn_risk_score.toFixed(3)} ` +
        `> threshold=${threshold} → LawyerBurnedEvent emitted. ` +
        `Switching active Tier-3 cases to Tier-1. gameMinute=${gameMinute}`,
    );

    // 2. Find all active cases assigned to this lawyer → switch each to Tier-1.
    const activeCases = await this.caseRepo.findActiveCasesForLawyer(lawyerId);
    let casesRerouted = 0;
    for (const caseRow of activeCases) {
      try {
        await this.downgradeCaseToPublicDefender(caseRow, lawyerRow.player_id);
        casesRerouted += 1;
      } catch (err) {
        this.logger.error(
          `LawyerService.evaluateBurnRisk: failed to downgrade case ${caseRow.case_id} ` +
            `to Tier-1 — contained: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // 3. Clamp burn_risk_score = tier3BurnThreshold (idempotency guard).
    await this.caseRepo.updateLawyerBurnRisk(lawyerId, threshold);

    this.logger.warn(
      `LawyerService.evaluateBurnRisk: ${casesRerouted} case(s) rerouted to Tier-1; ` +
        `burn_risk_score clamped to ${threshold} (idempotency guard).`,
    );

    return { burned: true, casesRerouted };
  }

  /**
   * evaluateBurnForPlayer — NIGHTLY per-player burn sweep.
   *
   * Finds all Tier-3 (corruption_pipeline) lawyers for the player and calls
   * evaluateBurnRisk on each. L1 empty-state skip: no Tier-3 lawyers → ZERO writes.
   *
   * Called by LawyerLegalTickService.runNightlyTick (after resolveCasesForPlayer).
   * Per-lawyer try/catch: a fault on one lawyer never aborts the sweep for other lawyers.
   * Deterministic: threshold check is pure; no Math.random.
   *
   * @param ctx — { playerId, gameMinute } from the NIGHTLY CitySimTickContext.
   */
  async evaluateBurnForPlayer(ctx: { playerId: string; gameMinute: number }): Promise<void> {
    const tier3Lawyers = await this.caseRepo.findTier3LawyersByPlayer(ctx.playerId);
    if (tier3Lawyers.length === 0) return; // L1 empty-state skip

    for (const lawyerRow of tier3Lawyers) {
      try {
        await this.evaluateBurnRisk(lawyerRow.lawyer_id, ctx.gameMinute);
      } catch (err) {
        this.logger.error(
          `LEGAL_NIGHTLY_TICK burn sweep: evaluateBurnRisk failed for ` +
            `lawyerId=${lawyerRow.lawyer_id} player=${ctx.playerId} gm=${ctx.gameMinute} — ` +
            `contained: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  // ── §13 contract surface for 04d-B ───────────────────────────────────────────────────────────

  /**
   * `recordTier3Use` — §13 contract surface for 04d-B (IA module).
   *
   * Called by B's `recordCorruptUse` when IA detects a Tier-3 lawyer being used
   * in a corrupt context (suspicion accumulation path). This method provides A's
   * side of the hook: it increments `burn_risk_score` by a small amount
   * (`tier3PayoffBurnRiskIncrement` clamped to [0..1]) to model the lawyer's
   * cumulative exposure risk from IA-detected corrupt usage.
   *
   * This is a STUB in C10 — B will wire its `recordCorruptUse` to call this in B's C3.
   * The increment is the same tunable as `issueTier3Payoff` (reuse — IA detection
   * of usage carries the same burn-risk weight as an explicit payoff).
   *
   * Idempotent: if the lawyer is not found or is not Tier-3, no-op.
   * No Math.random / Date.now — pure registry-based increment.
   *
   * @param lawyerId   — the UUID of the Tier-3 lawyer being reported to IA.
   * @param gameMinute — current game-time (for audit/logging; not used in computation).
   */
  async recordTier3Use(lawyerId: string, gameMinute: number): Promise<void> {
    const lawyerRow = await this.caseRepo.findLawyerById(lawyerId);
    if (!lawyerRow || lawyerRow.tier !== 'corruption_pipeline') {
      // Not a Tier-3 lawyer or not found — no-op (reserved for other tier types, RATIFIÉ #5).
      return;
    }
    const increment = this.tunables.tier3PayoffBurnRiskIncrement;
    const newScore = Math.min(1.0, (lawyerRow.burn_risk_score ?? 0) + increment);
    await this.caseRepo.updateLawyerBurnRisk(lawyerId, newScore);
    this.logger.log(
      `[§13 recordTier3Use] lawyerId=${lawyerId} gameMinute=${gameMinute} ` +
      `burn_risk ${(lawyerRow.burn_risk_score ?? 0).toFixed(3)}→${newScore.toFixed(3)}`,
    );
  }

  /**
   * `forceBurnLawyer` — BO admin forced burn for a Tier-3 lawyer (C10 admin endpoint).
   *
   * Bypasses the burn_risk_score threshold check — unconditionally burns the lawyer.
   * Used by `POST /v1/admin/lawyers/:id/force-burn` (F3 DEFERRED — admin role only).
   *
   * Sequence (mirrors evaluateBurnRisk but without the threshold check):
   *   1. Read lawyer row (not found → { burned: false }).
   *   2. Not Tier-3 → { burned: false }.
   *   3. Emit LawyerBurnedEvent (the IA-B §13 flip entry-point).
   *   4. Downgrade all active Tier-3 cases to Tier-1.
   *   5. Clamp burn_risk_score = tier3BurnThreshold (idempotency guard).
   *
   * Anti-fabrication: no Math.random. No Date.now(). Deterministic.
   * R2.2/P5: burn_risk_score is SERVER-ONLY — never returned to client.
   *
   * @param lawyerId   — the UUID of the lawyer to forcibly burn.
   * @param gameMinute — current game-time (for LawyerBurnedEvent).
   * @returns { burned: boolean, casesRerouted: number }
   */
  async forceBurnLawyer(
    lawyerId: string,
    gameMinute: number,
  ): Promise<{ burned: boolean; casesRerouted: number }> {
    const lawyerRow = await this.caseRepo.findLawyerById(lawyerId);
    if (!lawyerRow) {
      this.logger.warn(`LawyerService.forceBurnLawyer: lawyer ${lawyerId} not found — no-op.`);
      return { burned: false, casesRerouted: 0 };
    }
    if (lawyerRow.tier !== 'corruption_pipeline') {
      this.logger.warn(
        `LawyerService.forceBurnLawyer: lawyer ${lawyerId} is ${lawyerRow.tier} (not Tier-3) — no-op.`,
      );
      return { burned: false, casesRerouted: 0 };
    }

    // 1. Emit LawyerBurnedEvent (BO-forced — same event as NIGHTLY evaluateBurnRisk).
    const burnEvent: LawyerBurnedEvent = {
      type: 'lawyer_burned',
      playerId: lawyerRow.player_id,
      lawyerId,
      gameMinute,
    };
    this.bus.emitLawyerBurned(burnEvent);

    this.logger.warn(
      `LawyerService.forceBurnLawyer (BO-forced): lawyerId=${lawyerId} ` +
        `player=${lawyerRow.player_id} burnRiskScore=${lawyerRow.burn_risk_score.toFixed(3)} ` +
        `gameMinute=${gameMinute}`,
    );

    // 2. Downgrade all active Tier-3 cases to Tier-1.
    const activeCases = await this.caseRepo.findActiveCasesForLawyer(lawyerId);
    let casesRerouted = 0;
    for (const caseRow of activeCases) {
      try {
        await this.downgradeCaseToPublicDefender(caseRow, lawyerRow.player_id);
        casesRerouted += 1;
      } catch (err) {
        this.logger.error(
          `LawyerService.forceBurnLawyer: failed to downgrade case ${caseRow.case_id} ` +
            `to Tier-1 — contained: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // 3. Clamp burn_risk_score = tier3BurnThreshold (idempotency guard: same as evaluateBurnRisk).
    await this.caseRepo.updateLawyerBurnRisk(lawyerId, this.tunables.tier3BurnThreshold);

    this.logger.warn(
      `LawyerService.forceBurnLawyer: ${casesRerouted} case(s) rerouted to Tier-1; ` +
        `burn_risk_score clamped to ${this.tunables.tier3BurnThreshold}.`,
    );

    return { burned: true, casesRerouted };
  }

  // ── Private helpers ───────────────────────────────────────────────────────────────────────────

  /**
   * downgradeCaseToPublicDefender — switch a single active case to a Tier-1 public_defender.
   *
   * Sequence:
   *   1. Find or create the Tier-1 public_defender for the player (reuse existing PD, same pattern
   *      as LegalCaseService.createCase carry-forward #4).
   *   2. Update case: lawyer_id = pdLawyerId, info_leak_rate = tier1InfoLeakRate.
   *      Only active cases are updated (WHERE status='active' guard in the repo).
   *   3. Decrement the burned lawyer's sessions_active (-1).
   *   4. If the case was active (reassignment succeeded): increment PD sessions_active (+1).
   *
   * Called by evaluateBurnRisk for each active case of the burned lawyer.
   * Per-case error contained by the caller (evaluateBurnRisk).
   * Anti-fabrication: no Math.random.
   */
  private async downgradeCaseToPublicDefender(
    caseRow: LegalCaseRow,
    playerId: string,
  ): Promise<void> {
    const { case_id: caseId, lawyer_id: burnedLawyerId } = caseRow;

    // 1. Find or create the public_defender for this player (anti-proliferation, same as createCase).
    let pdRow = await this.caseRepo.findExistingPublicDefenderForPlayer(playerId);
    if (!pdRow) {
      pdRow = await this.caseRepo.insertLawyer({
        player_id: playerId,
        tier: 'public_defender',
        name: 'Public Defender',
        retainer_active: false,
        burn_risk_score: 0.0,
        sessions_active: 0,
      });
    }

    // 2. Tier-1 info_leak_rate (base rate, no reduction).
    const tier1Rate = this.tunables.tier1InfoLeakRate;

    // 3. Reassign the case to the public_defender (active guard in repo).
    const reassigned = await this.caseRepo.reassignCaseToPublicDefender(
      caseId,
      pdRow.lawyer_id,
      tier1Rate,
    );

    if (reassigned !== null) {
      // 4a. Decrement the burned lawyer's sessions_active.
      if (burnedLawyerId) {
        await this.caseRepo.incrementLawyerSessions(burnedLawyerId, -1);
      }
      // 4b. Increment PD's sessions_active.
      await this.caseRepo.incrementLawyerSessions(pdRow.lawyer_id, 1);

      this.logger.log(
        `LawyerService.downgradeCaseToPublicDefender: caseId=${caseId} player=${playerId} ` +
          `burnedLawyerId=${burnedLawyerId ?? 'none'} → pdLawyerId=${pdRow.lawyer_id} ` +
          `tier1Rate=${tier1Rate}`,
      );
    } else {
      // Case was already resolved (rare: concurrent resolution during burn sweep).
      this.logger.debug(
        `LawyerService.downgradeCaseToPublicDefender: caseId=${caseId} was already resolved ` +
          `(no-op reassignment) — concurrent resolution during burn sweep.`,
      );
    }
  }
}
