// IMPLEMENTS: docs/superpowers/plans/2026-06-30-04d-A-lawyer-legal-plan.md C3 (service)
//             Canon: docs/tech/04d_meta_market_lawyer_and_internal_affairs/lawyer_legal_system.md §2 (G5)
//             — 04d-A C3 — 2026-06-30
//
// `LegalCaseService` — the core case-creation service for the §2 Lawyer & Legal System.
//
// C3 scope (STRICTLY NON-COURIER):
//   - createCase({playerId, defendantType, defendantId, chargeSeverity, triggerRef, gameMinute})
//     Inserts a legal_cases row:
//       • Tier-1 public_defender lawyer auto-assigned (GRATUIT, RATIFIÉ 2026-06-30 #1)
//         C5 carry-forward #4: REUSE existing public_defender for this player (if one exists),
//         incrementing sessions_active instead of inserting a fresh duplicate.
//       • info_leak_rate = tier1InfoLeakRate (tunable, R2.2/P5 SERVER-ONLY)
//       • case_duration_ticks = resolveCaseDurationTicks(chargeSeverity)  [PROV-Y26Q2]
//       • ticks_remaining = case_duration_ticks
//       • knowledge_set_ref populated (lazy-compute from caller-supplied set)
//       • status = 'active'
//   - Subscribes to BuildingRaidedEvent (onModuleInit):
//       buildingId → findDelegatedByAssignedBuilding → deriveChargeSeverityForLieutenant
//       → buildKnowledgeSetForLieutenant → createCase(defendant_type='lieutenant')
//   - handleMISTailSubpoena(playerId, buildingIdHash, districtId, gameMinute):
//       Called by the ForensicEntryDispatchedEvent bus subscriber (tail_subpoena filter) in onModuleInit.
//       Closes the deferred legal-case TD (§4.3 MIS subpoena → legal referral). Bus-seam approach avoids
//       ForensicSignalingModule→LawyerModule→LieutenantModule→ProductionModule→ForensicSignalingModule cycle.
//       Uses reverse-hash lookup (LegalCaseRepository.findLieutenantForMIS) to resolve the LT.
//   - Declares (no emit) CaseResolvedEvent + LawyerBurnedEvent on city-event-bus.ts (C3).
//
// NOT in C3: courier LAWYER_UP path (C4). dealer reserved-inert (RATIFIÉ #5).
//
// Charge severity derivation [PROV-Y26Q2] for lieutenants:
//   role_id >= ltChargeRoleHighThreshold(10) OR tenure_score >= ltChargeTenureHighThreshold(1000)
//     → 'major_crime'
//   role_id < ltChargeRoleLowThreshold(5) AND tenure_score < ltChargeTenureLowThreshold(300)
//     → 'felony_low'
//   else → 'felony_high'
//
// Knowledge-set items [PROV-Y26Q2] for lieutenants (deterministic — no Math.random):
//   ALL:  'operation_detail'    (importance 0.3)
//   role_id >= roleLow(5):  'stash_location'      (importance 0.5)
//   role_id >= roleHigh(10): 'lieutenant_network' (importance 0.7)
//   tenure >= tenureLow(300): 'financial_flows'   (importance 0.6)
//   tenure >= tenureHigh(1000): 'boss_identity'   (importance 1.0)
//   Item IDs: `${defendantId}:${type}` — stable, no UUID generation needed.
//
// Case duration ticks [PROV-Y26Q2] — from tunables, NOT hardcoded:
//   'misdemeanor'  → caseDurationMisdemeanorTicks  (default: 3 days × 1440 = 4 320)
//   'felony_low'   → caseDurationFelonyLowTicks    (default: 7 days × 1440 = 10 080)
//   'felony_high'  → caseDurationFelonyHighTicks   (default: 14 days × 1440 = 20 160)
//   'major_crime'  → caseDurationMajorCrimeTicks   (default: 30 days × 1440 = 43 200)
//
// R2.2 / P5: info_leak_rate, info_leak_total, burn_risk_score are SERVER-ONLY. createCase writes them;
//   the test controller exposes the case row via an admin-only probe that leaks only to test env (R-EC-2).
// No Math.random. No Date.now(). All IDs from PG defaultRandom(). Pure functions are pure.
// R9.3: ADDITIVE only (no existing tables or paths mutated).
// ZERO regression: BuildingRaidedEvent subscription is additive (the bus isolates all listeners;
//   RaidExceptionProducerService still fires and this listener is independent).

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { ApiError } from '../../protocol/api-error';
import { CityEventBus, type BuildingRaidedEvent, type ForensicEntryDispatchedEvent } from '../../citysim/events/city-event-bus';
import { LieutenantRepository } from '../lieutenant/lieutenant.repository';
import type { KnowledgeItem, KnowledgeSet } from './legal.types';
import type { LegalCaseRow } from '../../db/schema/legal';
import { LegalCaseRepository } from './legal-case.repository';
import { LawyerTunables } from './lawyer.tunables';
import { makeRng } from '../../common/seeded-rng';
import { InfoLeakService } from './info-leak.service';

// ── CreateCase params (internal interface; not a NestJS DTO — no HTTP boundary) ───────────────────
export interface CreateCaseParams {
  readonly playerId: string;
  readonly defendantType: 'courier' | 'lieutenant' | 'dealer';
  readonly defendantId: string;
  readonly chargeSeverity: 'misdemeanor' | 'felony_low' | 'felony_high' | 'major_crime';
  /** Trigger reference — for logging/audit only (no trigger_ref column in legal_cases). */
  readonly triggerRef: string;
  readonly gameMinute: number;
  /** Pre-built knowledge set — caller is responsible for building from defendant's data. */
  readonly knowledgeSet: KnowledgeSet;
}

@Injectable()
export class LegalCaseService implements OnModuleInit {
  private readonly logger = new Logger(LegalCaseService.name);

  constructor(
    private readonly caseRepo: LegalCaseRepository,
    private readonly tunables: LawyerTunables,
    private readonly bus: CityEventBus,
    private readonly lieutenantRepo: LieutenantRepository,
    private readonly infoLeakService: InfoLeakService,
  ) {}

  // ── Lifecycle ─────────────────────────────────────────────────────────────────────────────────

  /**
   * onModuleInit — subscribe to BuildingRaidedEvent.
   *
   * Pattern mirrors RaidExceptionProducerService (raid-exception-producer.service.ts:26-36).
   * The bus isolates listeners: this subscription is ADDITIVE — the existing
   * RaidExceptionProducerService subscription is byte-identical.
   *
   * Zero-regression: buildings with no delegated lieutenant produce no case (bail out fast).
   */
  onModuleInit(): void {
    // ── BuildingRaidedEvent → lieutenant case ──────────────────────────────────────────────────
    // Pattern mirrors RaidExceptionProducerService (raid-exception-producer.service.ts:26-36).
    // The bus isolates listeners: this subscription is ADDITIVE — the existing
    // RaidExceptionProducerService subscription is byte-identical.
    this.bus.onBuildingRaided((e: BuildingRaidedEvent) => {
      // The handler returns Promise<LegalCaseRow | null>; .catch() contains async failures.
      this.handleBuildingRaided(e).catch((err: unknown) =>
        this.logger.error(
          `LegalCaseService BuildingRaided handler failed (contained): ` +
            `${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    });
    this.logger.log(
      'LegalCaseService subscribed to BuildingRaidedEvent — ' +
        'raid → delegated-lieutenant lookup → createCase (defendant_type=lieutenant). ' +
        'ADDITIVE: RaidExceptionProducerService subscription byte-identical. ' +
        'No lieutenant → no-op (zero-regression). C3.',
    );

    // ── ForensicEntryDispatchedEvent → tail_subpoena → MIS legal case ──────────────────────────
    //
    // Wired here (in LawyerModule) rather than in InspectionQueueDispatcherService (ForensicModule)
    // to avoid the circular dependency:
    //   ForensicSignalingModule → LawyerModule → LieutenantModule → ProductionModule → ForensicSignalingModule
    //
    // The bus is the canonical inter-module seam. This subscriber:
    //   - Receives ALL ForensicEntryDispatchedEvents (emitted by InspectionQueueService drain).
    //   - Filters to forensicKind === 'tail_subpoena' (all other kinds are handled by the
    //     InspectionQueueDispatcherService within ForensicSignalingModule — additive / no overlap).
    //   - Calls handleMISTailSubpoena to close the previously-deferred legal-case TD.
    //
    // The buildingId in ForensicEntryDispatchedEvent for tail_subpoena is the INTEGER hash of
    // the lieutenant UUID (StandingGapHeatService.lieutenantBuildingId: first 8 hex chars → 31-bit mask).
    // handleMISTailSubpoena performs the reverse-hash lookup via LegalCaseRepository.findLieutenantForMIS.
    //
    // Zero-regression: filtering on forensicKind means all non-tail_subpoena forensic events are
    // untouched by this subscriber. InspectionQueueDispatcherService handles them byte-identically.
    // ADDITIVE: this subscriber is the ONLY tail_subpoena → legal-case hook (no duplicate).
    this.bus.onForensicEntryDispatched((e: ForensicEntryDispatchedEvent) => {
      if (e.forensicKind !== 'tail_subpoena') return;
      this.handleMISTailSubpoena(e.playerId, e.buildingId, e.districtId, e.gameMinute).catch((err: unknown) =>
        this.logger.error(
          `LegalCaseService tail_subpoena handler failed (contained): ` +
            `playerId=${e.playerId} buildingId=${e.buildingId} districtId=${e.districtId} ` +
            `${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    });
    this.logger.log(
      'LegalCaseService subscribed to ForensicEntryDispatchedEvent (tail_subpoena) — ' +
        'MIS subpoena → reverse-hash lieutenant lookup → createCase (defendant_type=lieutenant). ' +
        'CLOSES the deferred legal-case TD (§4.3 tail_subpoena → legal referral). ' +
        'Bus-seam approach avoids circular ForensicSignalingModule→LawyerModule→...→ForensicSignalingModule. ' +
        'Non-tail_subpoena events early-return (zero-regression). C3.',
    );
  }

  // ── Public API ────────────────────────────────────────────────────────────────────────────────

  /**
   * createCase — inserts a `legal_cases` row with Tier-1 public_defender auto-assigned.
   *
   * Sequence:
   *   1. Insert Tier-1 public_defender lawyer (name='Public Defender'; burn_risk_score=0.0; GRATUIT).
   *   2. Resolve case_duration_ticks from chargeSeverity via tunables [PROV-Y26Q2].
   *   3. Resolve info_leak_rate from tier1InfoLeakRate tunable [PROV-Y26Q2; SERVER-ONLY R2.2/P5].
   *   4. Insert legal_cases row: status='active', ticks_remaining=case_duration_ticks,
   *      knowledge_set_ref=params.knowledgeSet.
   *   5. Return the inserted case row.
   *
   * Idempotency: NOT idempotent (each call inserts a new case). The callers (BuildingRaided + MIS)
   * ensure they only create one case per logical event (no dedup guard needed in C3 — dedup TBD C5+).
   *
   * Anti-fabrication: no Math.random. All PK UUIDs from PG defaultRandom().
   */
  async createCase(params: CreateCaseParams): Promise<LegalCaseRow> {
    const {
      playerId,
      defendantType,
      defendantId,
      chargeSeverity,
      triggerRef,
      gameMinute,
      knowledgeSet,
    } = params;

    // 1. Auto-assign Tier-1 public_defender (GRATUIT, RATIFIÉ 2026-06-30 #1).
    //
    // C5 carry-forward #4 — REUSE existing public_defender per player (anti-proliferation).
    // Before C5: every createCase inserted a FRESH public_defender row → one row per case.
    // After C5: if the player already has a public_defender, increment sessions_active and reuse it.
    //   This keeps the lawyer roster clean (one row per tier per player for Tier-1).
    //   Falsifiable: creating 2 cases → 1 public_defender row with sessions_active=2.
    //
    // burn_risk_score=0.0 (Tier-1 has no burn risk — Tier-3 only).
    const existingPD = await this.caseRepo.findExistingPublicDefenderForPlayer(playerId);
    let lawyerRow: import('../../db/schema/legal').LawyerRow;
    if (existingPD) {
      // Reuse: increment sessions_active by 1.
      lawyerRow = await this.caseRepo.incrementLawyerSessions(existingPD.lawyer_id, 1);
    } else {
      // First case for this player: insert the public_defender row (sessions_active=1).
      lawyerRow = await this.caseRepo.insertLawyer({
        player_id: playerId,
        tier: 'public_defender',
        name: 'Public Defender',
        retainer_active: false,
        burn_risk_score: 0.0,
        sessions_active: 1,
      });
    }
    const lawyer = lawyerRow;

    // 2. Resolve case duration from chargeSeverity — no hardcoded constants (all from tunables).
    //    [PROV-Y26Q2]: ratification by reviewer ⊥ expected; these are the registry defaults.
    const caseDurationTicks = this.resolveCaseDurationTicks(chargeSeverity);

    // 3. Resolve Tier-1 info_leak_rate from tunables.
    //    SERVER-ONLY (R2.2/P5): this scalar is never forwarded to the player client.
    const infoLeakRate = this.tunables.tier1InfoLeakRate;

    // 4. Insert the legal_cases row.
    const caseRow = await this.caseRepo.insertCase({
      player_id: playerId,
      defendant_id: defendantId,
      defendant_type: defendantType,
      lawyer_id: lawyer.lawyer_id,
      charge_severity: chargeSeverity,
      info_leak_rate: infoLeakRate,
      info_leak_total: 0.0,
      case_duration_ticks: caseDurationTicks,
      ticks_remaining: caseDurationTicks,
      status: 'active',
      knowledge_set_ref: knowledgeSet,
      items_leaked: [],
    });

    this.logger.log(
      `LegalCaseService.createCase CREATED ` +
        `caseId=${caseRow.case_id} playerId=${playerId} defendant=${defendantType}:${defendantId} ` +
        `chargeSeverity=${chargeSeverity} caseDurationTicks=${caseDurationTicks} ` +
        `infoLeakRate=${infoLeakRate} lawyerId=${lawyer.lawyer_id} ` +
        `triggerRef=${triggerRef} gameMinute=${gameMinute}`,
    );

    return caseRow;
  }

  /**
   * handleMISTailSubpoena — called by InspectionQueueDispatcherService when forensicKind='tail_subpoena'.
   *
   * Closes the deferred legal-case TD (the §4.3 MIS subpoena → legal referral path that was
   * previously "emit+log_only — MIS subpoena legal-case hook deferred TD").
   *
   * Reverse-hash lookup: the buildingIdHash in ForensicEntryDispatchedEvent is derived from the
   * lieutenant UUID via lieutenantBuildingId() (StandingGapHeatService — first 8 hex chars of UUID,
   * 31-bit mask). `findLieutenantForMIS` replicates the hash to find the match.
   *
   * If no lieutenant matches the hash (impossible in organic flow — every tail_subpoena entry is
   * seeded by StandingGapHeatService from a real lieutenant UUID), log a warning and return null.
   *
   * Returns the created `LegalCaseRow` or `null` (test controller uses the return value to assert
   * the case was created; the production caller — InspectionQueueDispatcherService — ignores it).
   *
   * [PROV-Y26Q2]: charge severity derivation mirrors the raid path.
   */
  async handleMISTailSubpoena(
    playerId: string,
    buildingIdHash: number,
    districtId: number,
    gameMinute: number,
  ): Promise<LegalCaseRow | null> {
    const lt = await this.caseRepo.findLieutenantForMIS(playerId, buildingIdHash);
    if (!lt) {
      this.logger.warn(
        `LegalCaseService.handleMISTailSubpoena: no lieutenant found for ` +
          `playerId=${playerId} buildingIdHash=${buildingIdHash} districtId=${districtId} ` +
          `— impossible in organic prod (every tail_subpoena seeds from a real lieutenant UUID); ` +
          `check E2E seed path. Skipping createCase.`,
      );
      return null;
    }

    const chargeSeverity = this.deriveChargeSeverityForLieutenant(lt.tenure_score, lt.role_id);
    const knowledgeSet = this.buildKnowledgeSetForLieutenant(
      lt.lieutenant_id,
      lt.role_id,
      lt.tenure_score,
    );

    const caseRow = await this.createCase({
      playerId,
      defendantType: 'lieutenant',
      defendantId: lt.lieutenant_id,
      chargeSeverity,
      triggerRef: `tail_subpoena:${buildingIdHash}:district=${districtId}`,
      gameMinute,
      knowledgeSet,
    });

    this.logger.log(
      `LegalCaseService.handleMISTailSubpoena: createCase fired ` +
        `lieutenantId=${lt.lieutenant_id} caseId=${caseRow.case_id} chargeSeverity=${chargeSeverity} ` +
        `buildingIdHash=${buildingIdHash} districtId=${districtId} gameMinute=${gameMinute}`,
    );

    return caseRow;
  }

  // ── C7: LEGAL_NIGHTLY_TICK — resolution sweep ────────────────────────────────────────────────

  /**
   * resolveCasesForPlayer — the NIGHTLY resolution sweep for a single player.
   *
   * Called by LawyerLegalTickService (NIGHTLY/16). Scans all active legal_cases with
   * ticks_remaining <= 0 → resolves each eligible case using a seeded RNG roll gated by
   * tier + charge_severity.
   *
   * L1 empty-state skip: no eligible cases → ZERO writes (zero-regression guarantee).
   * Per-case try/catch — a fault on ONE case never aborts the sweep or another case.
   * Deterministic (makeRng — NO Math.random, NO Date.now).
   *
   * Canon: plan §C7 + lawyer_legal_system.md §Case timeline step 5.
   */
  async resolveCasesForPlayer(ctx: { playerId: string; gameMinute: number }): Promise<void> {
    const eligibleCases = await this.caseRepo.findEligibleCasesForResolution(ctx.playerId);
    if (eligibleCases.length === 0) return; // L1 empty-state skip

    for (const caseRow of eligibleCases) {
      try {
        await this.resolveSingleCase(caseRow, ctx.playerId, ctx.gameMinute);
      } catch (err) {
        this.logger.error(
          `LEGAL_NIGHTLY_TICK: resolve failed for case=${caseRow.case_id} player=${ctx.playerId} gm=${ctx.gameMinute} — ` +
            `contained: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  /**
   * resolveSingleCase — resolve ONE eligible legal_cases row.
   *
   * Resolution algorithm (seeded RNG — NO Math.random):
   *   Seed: `resolve:${caseId}` (deterministic per case — same caseId → same outcome always).
   *
   *   1. Tier-3 (corruption_pipeline) + low severity (misdemeanor/felony_low):
   *      roll chance(dismissProbabilityTier3LowSeverity) → 'dismissed'.
   *      If miss → fall through to base conviction roll.
   *   2. Tier-2 (boutique):
   *      roll chance(pleaDownProbabilityTier2) → 'plea_down'.
   *      If miss → fall through to base conviction roll.
   *   3. Base conviction roll (tier-gated — registry-sourced via LawyerTunables getters):
   *      Tier-1 public_defender: convictionBaseProbabilityTier1 (default 0.70) [PROV-Y26Q2]
   *      Tier-2 boutique:        convictionBaseProbabilityTier2 (default 0.50) [PROV-Y26Q2] (after plea-down miss)
   *      Tier-3 corruption_pipe: convictionBaseProbabilityTier3 (default 0.30) [PROV-Y26Q2] (after dismiss miss)
   *      Registry-sourced tunables: `lawyer.conviction_base_probability_tier1/2/3` (gdd/14 §Lawyer).
   *      Registry-fied in C8 carry-forward #5 (R2.3 — no inline scalars for behavioural parameters).
   *
   * On 'convicted': final-dump ALL remaining knowledge_set items (those NOT yet in items_leaked)
   *   to declaration_ledger via InfoLeakService.recordLeakedItem (REUSE BPD seam, NOT a rebuild).
   *   items_leaked is updated to the full set (all item IDs). info_leak_total reflects total importance.
   *
   * Sessions: decrements lawyer.sessions_active by 1 (the case is no longer active).
   *
   * Emits: CaseResolvedEvent on the city-event-bus (qualitative only — no raw info_leak_total).
   *
   * Idempotent: status guard in resolveAndUpdateCase (WHERE status='active') prevents re-resolve.
   * R2.2/P5: no raw scalar in CaseResolvedEvent. SERVER-ONLY scalars stay DB-only after resolution.
   */
  private async resolveSingleCase(
    caseRow: import('../../db/schema/legal').LegalCaseRow,
    playerId: string,
    gameMinute: number,
  ): Promise<void> {
    const { case_id: caseId, lawyer_id, charge_severity, defendant_type } = caseRow;

    // Resolve lawyer tier (may be null if lawyer was externally deleted — defensive).
    const lawyerRow = lawyer_id ? await this.caseRepo.findLawyerById(lawyer_id) : null;
    const tier = lawyerRow?.tier ?? 'public_defender';

    // Seeded RNG for this case — deterministic per caseId (same seed → same outcome always).
    const rng = makeRng(`resolve:${caseId}`);

    // ── Resolution decision tree ──────────────────────────────────────────────────────────────
    let outcome: 'acquitted' | 'plea_down' | 'convicted' | 'dismissed' | undefined;

    // Step 1: Tier-3 + low severity → try dismiss.
    const LOW_SEVERITY_SET = new Set<string>(['misdemeanor', 'felony_low']);
    if (tier === 'corruption_pipeline' && LOW_SEVERITY_SET.has(charge_severity)) {
      if (rng.chance(this.tunables.dismissProbabilityTier3LowSeverity)) {
        outcome = 'dismissed';
      }
    }

    // Step 2: Tier-2 → try plea-down (if not already dismissed).
    if (outcome === undefined && tier === 'boutique') {
      if (rng.chance(this.tunables.pleaDownProbabilityTier2)) {
        outcome = 'plea_down';
      }
    }

    // Step 3: Base conviction roll (tier-gated [PROV-Y26Q2]).
    //
    // C8 carry-forward #5 — REGISTRY-FICATION: replaces the inline CONVICTED_PROB map with
    // registry getters (R2.3 — no inline scalars for behavioural parameters).
    // gdd/14 §Lawyer Note NEW C8 04d-A: 3 new keys conviction_base_probability_tier1/2/3.
    // Values unchanged (0.70/0.50/0.30 structural ordering maintained).
    if (outcome === undefined) {
      let convictedProb: number;
      switch (tier) {
        case 'public_defender':
          convictedProb = this.tunables.convictionBaseProbabilityTier1; // default 0.70
          break;
        case 'boutique':
          convictedProb = this.tunables.convictionBaseProbabilityTier2; // default 0.50
          break;
        case 'corruption_pipeline':
          convictedProb = this.tunables.convictionBaseProbabilityTier3; // default 0.30
          break;
        default:
          // Defensive fallback: unknown tier → treat as Tier-1 (highest conviction risk).
          convictedProb = this.tunables.convictionBaseProbabilityTier1;
          this.logger.warn(
            `LEGAL_NIGHTLY_TICK: resolveSingleCase — unknown tier '${tier}' (case ${caseId}), ` +
              `falling back to convictionBaseProbabilityTier1=${convictedProb}`,
          );
      }
      if (rng.chance(convictedProb)) {
        outcome = 'convicted';
      } else {
        outcome = 'acquitted';
      }
    }

    // ── C8 carry-forward #6 (transactional order): stamp status FIRST, then final-dump ────────
    //
    // Before C8: items were dumped to declaration_ledger BEFORE the status stamp, so a crash
    //   between dump and stamp left the case in 'active' state with leaked items already written.
    // After C8: stamp first (WHERE status='active' idempotency guard) → if this throws (case
    //   already resolved by another concurrent call), NO items are dumped. Then dump after stamp.
    //
    // ── Step A: Stamp status + resolved_at (idempotency guard: WHERE status='active') ─────────
    await this.caseRepo.resolveAndUpdateCase(caseId, outcome);
    // If resolveAndUpdateCase throws here, the case was already resolved — we stop. No items dump.

    // ── Step B: Conviction final-dump AFTER stamp ─────────────────────────────────────────────
    let finalItemsLeaked: string[] | undefined;
    let finalInfoLeakTotal: number | undefined;

    if (outcome === 'convicted') {
      const knowledgeSet = caseRow.knowledge_set_ref as import('./legal.types').KnowledgeSet | null;
      const allItems: import('./legal.types').KnowledgeItem[] = knowledgeSet?.items ?? [];
      const alreadyLeakedIds = new Set<string>(
        Array.isArray(caseRow.items_leaked) ? (caseRow.items_leaked as string[]) : [],
      );
      const remainingItems = allItems.filter((item) => !alreadyLeakedIds.has(item.id));

      // Dump each remaining item to declaration_ledger (the BPD seam — REUSE, not rebuild).
      for (const item of remainingItems) {
        await this.infoLeakService.recordLeakedItem(
          caseId,
          playerId,
          gameMinute,
          item,
          charge_severity,
        );
      }

      // Build the full items_leaked array (all item IDs — drip + final-dump combined).
      finalItemsLeaked = allItems.map((i) => i.id);
      // info_leak_total = sum of importances of ALL items (complete revelation at conviction).
      finalInfoLeakTotal = allItems.reduce((acc, i) => acc + i.importance, 0);

      // Update the case with the final-dump items (separate from the status stamp).
      await this.caseRepo.updateCaseFinalDumpItems(caseId, finalItemsLeaked, finalInfoLeakTotal);
    }

    // ── Decrement lawyer sessions_active ──────────────────────────────────────────────────────
    if (lawyerRow) {
      await this.caseRepo.incrementLawyerSessions(lawyerRow.lawyer_id, -1);
    }

    // ── Emit CaseResolvedEvent (qualitative only — no raw info_leak_total, R2.2/P5) ─────────
    this.bus.emitCaseResolved({
      type: 'case_resolved',
      playerId,
      caseId,
      defendantType: defendant_type as import('./legal.types').DefendantType,
      outcome,
      gameMinute,
    });

    this.logger.log(
      `LEGAL_NIGHTLY_TICK: case=${caseId} player=${playerId} ` +
        `tier=${tier} charge=${charge_severity} outcome=${outcome} ` +
        `finalDump=${outcome === 'convicted' ? (finalItemsLeaked?.length ?? 0) : 0} items ` +
        `gameMinute=${gameMinute}`,
    );
  }

  /**
   * acceptPleaDeal — player action: accept a plea deal on an active case, resolving it early.
   *
   * Called by the player (via test controller in C7; BO or Exception spine in C10).
   * Resolves the case as 'plea_down' regardless of ticks_remaining (early resolution).
   *
   * Sequence:
   *   1. Read the case (validate it exists + is active).
   *   2. Stamp status='plea_down' + resolved_at=NOW() (no final-dump — plea is negotiated).
   *   3. Decrement lawyer.sessions_active by 1.
   *   4. Emit CaseResolvedEvent(outcome='plea_down').
   *   5. Return the updated case row.
   *
   * Guard: throws if caseId not found or case is not active (already resolved).
   * Idempotent (the status guard in resolveAndUpdateCase prevents double-resolution).
   *
   * No final-dump on plea: plea is a negotiated outcome; the knowledge that leaked via drip
   * (C6) already stands; no additional items are dumped at plea time.
   * Deterministic: no RNG (the outcome is player-chosen, not rolled).
   * Anti-fabrication: no Math.random. No Date.now(). resolved_at is wall-clock (DB timestamp).
   * R2.2/P5: CaseResolvedEvent carries no raw scalars.
   *
   * W6a C4 (P-A, finding #9) — `playerId` is now the FIRST argument, and the case read is joint
   * (`case_id = ? AND player_id = ?`, single round-trip): a case belonging to a DIFFERENT player
   * yields 0 rows ⇒ "not found" (the controller maps this to 404 `RESOURCE_NOT_FOUND`, D2), BEFORE
   * anything is resolved. Pre-fix, this method took no `playerId` at all — `findCaseById(caseId)`
   * alone let ANY caller resolve-via-plea a rival's ACTIVE case.
   *
   * @param playerId   — the caller's player uuid. Must be the ACTUAL owner of `caseId` (W6a C4).
   * @param caseId     — the legal_cases UUID
   * @param gameMinute — current in-game minute
   */
  async acceptPleaDeal(
    playerId: string,
    caseId: string,
    gameMinute: number,
  ): Promise<import('../../db/schema/legal').LegalCaseRow> {
    // 1. Read the case to get playerId + defendantType + lawyer_id for the event + sessions decrement.
    // Scoped to `playerId` (W6a C4): a case owned by someone else is indistinguishable from a
    // non-existent one — same "not found" branch, same downstream 404 (D2 existence-masking).
    // W6.3 C1 fix — this used to `throw new Error(...)` (a bare Error), which GlobalExceptionFilter
    // falls through to its `else` branch (anything NOT ApiError/HttpException) → 500 INTERNAL_ERROR.
    // On a player route (this method's ONLY caller before W6.3 was a `_test` probe) that is a
    // production 500 on an ordinary "already resolved" race. ApiError maps via its own `code`
    // (RESOURCE_NOT_FOUND → 404, RESOURCE_STATE_CONFLICT → 409) — never a 500.
    const caseRow = await this.caseRepo.findCaseByIdScoped(caseId, playerId);
    if (!caseRow) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `LegalCaseService.acceptPleaDeal: case ${caseId} not found`,
      });
    }
    if (caseRow.status !== 'active') {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `LegalCaseService.acceptPleaDeal: case ${caseId} is not active (status=${caseRow.status})`,
      });
    }

    // 2. Stamp status='plea_down' + resolved_at (no final-dump — plea has no information blast).
    const updated = await this.caseRepo.resolveAndUpdateCase(caseId, 'plea_down');

    // 3. Decrement lawyer sessions_active (case no longer active).
    if (caseRow.lawyer_id) {
      const lawyerRow = await this.caseRepo.findLawyerById(caseRow.lawyer_id);
      if (lawyerRow) {
        await this.caseRepo.incrementLawyerSessions(lawyerRow.lawyer_id, -1);
      }
    }

    // 4. Emit CaseResolvedEvent (qualitative only — R2.2/P5).
    // W6a C4: sources `playerId` (the caller, already proven the owner by step 1's joint read),
    // never `caseRow.player_id` — the same discipline C3's `issueTier3Payoff` step 4 applies: the
    // two are provably equal here, but the event stops trusting the ROW for the identity it stamps.
    this.bus.emitCaseResolved({
      type: 'case_resolved',
      playerId,
      caseId,
      defendantType: caseRow.defendant_type as import('./legal.types').DefendantType,
      outcome: 'plea_down',
      gameMinute,
    });

    this.logger.log(
      `LegalCaseService.acceptPleaDeal: ` +
        `caseId=${caseId} player=${playerId} ` +
        `charge=${caseRow.charge_severity} gameMinute=${gameMinute} outcome=plea_down`,
    );

    return updated;
  }

  // ── C10: BO forced-resolve (admin endpoint) ──────────────────────────────────────────────────

  /**
   * forceResolveCase — BO admin forced resolution for an active case.
   *
   * Called by `POST /v1/admin/legal-cases/:id/force-resolution` (F3 DEFERRED — admin role only).
   * Bypasses the NIGHTLY resolution timer — immediately stamps the case with the specified outcome.
   *
   * Sequence (mirrors resolveSingleCase for the conviction final-dump):
   *   1. Read the case (not found → throw).
   *   2. Stamp status = forced outcome via resolveAndUpdateCase (WHERE status='active' guard).
   *   3. If outcome='convicted': final-dump all remaining knowledge_set items to declaration_ledger.
   *   4. Decrement lawyer.sessions_active (case no longer active).
   *   5. Emit CaseResolvedEvent (qualitative only — R2.2/P5).
   *
   * Idempotent: resolveAndUpdateCase's `WHERE status='active'` guard prevents double-resolution.
   * Anti-fabrication: no Math.random. No Date.now(). resolved_at is wall-clock (DB timestamp).
   * R2.2/P5: CaseResolvedEvent carries no raw scalars.
   *
   * @param caseId     — the legal_cases UUID to force-resolve.
   * @param outcome    — the forced terminal status.
   * @param gameMinute — current in-game minute (for CaseResolvedEvent + conviction ledger writes).
   */
  async forceResolveCase(
    caseId: string,
    outcome: 'acquitted' | 'plea_down' | 'convicted' | 'dismissed',
    gameMinute: number,
  ): Promise<void> {
    // 1. Read the case to get playerId + defendantType + lawyer_id + knowledge_set_ref.
    const caseRow = await this.caseRepo.findCaseById(caseId);
    if (!caseRow) {
      throw new Error(`LegalCaseService.forceResolveCase: case ${caseId} not found`);
    }
    const { player_id: playerId, lawyer_id, charge_severity, defendant_type } = caseRow;

    // 2. Stamp status (idempotency guard in resolveAndUpdateCase — WHERE status='active').
    await this.caseRepo.resolveAndUpdateCase(caseId, outcome);

    // 3. Conviction final-dump (mirrors resolveSingleCase step B).
    if (outcome === 'convicted') {
      const knowledgeSet = caseRow.knowledge_set_ref as KnowledgeSet | null;
      const allItems: KnowledgeItem[] = knowledgeSet?.items ?? [];
      const alreadyLeakedIds = new Set<string>(
        Array.isArray(caseRow.items_leaked) ? (caseRow.items_leaked as string[]) : [],
      );
      const remainingItems = allItems.filter((item) => !alreadyLeakedIds.has(item.id));
      for (const item of remainingItems) {
        await this.infoLeakService.recordLeakedItem(caseId, playerId, gameMinute, item, charge_severity);
      }
      const finalItemsLeaked = allItems.map((i) => i.id);
      const finalInfoLeakTotal = allItems.reduce((acc, i) => acc + i.importance, 0);
      await this.caseRepo.updateCaseFinalDumpItems(caseId, finalItemsLeaked, finalInfoLeakTotal);
    }

    // 4. Decrement lawyer sessions_active (case no longer active).
    if (lawyer_id) {
      const lawyerRow = await this.caseRepo.findLawyerById(lawyer_id);
      if (lawyerRow) {
        await this.caseRepo.incrementLawyerSessions(lawyerRow.lawyer_id, -1);
      }
    }

    // 5. Emit CaseResolvedEvent (qualitative only — no raw scalars, R2.2/P5).
    this.bus.emitCaseResolved({
      type: 'case_resolved',
      playerId,
      caseId,
      defendantType: defendant_type as import('./legal.types').DefendantType,
      outcome,
      gameMinute,
    });

    this.logger.log(
      `LegalCaseService.forceResolveCase: caseId=${caseId} player=${playerId} ` +
        `outcome=${outcome} (BO-forced) gameMinute=${gameMinute}`,
    );
  }

  // ── C6: LEGAL_LEAK_TICK tick body ────────────────────────────────────────────────────────────

  /**
   * tickLeakAccumulation — the per-minute per-player body of LEGAL_LEAK_TICK.
   *
   * Called by LawyerLegalTickService (MINUTE/23). Per active case per tick:
   *   1. L1 empty-state skip: no active cases → ZERO writes (zero-regression guarantee).
   *   2. Roll a seeded probability against info_leak_rate.
   *      Seed: `leak:${caseId}:${gameDay}` (gameDay = Math.floor(gameMinute / 1440)).
   *      Same seed per game-day → idempotent: if the tick fires multiple times on the same day,
   *      the same roll occurs. The idempotency guard (items_leaked set) prevents double-leaks.
   *   3. On hit: draw one unleaked item → call InfoLeakService.recordLeakedItem →
   *      update items_leaked + info_leak_total + ticks_remaining.
   *   4. On miss or all-items-leaked: decrement ticks_remaining only (case advances in time).
   *
   * Per-case try/catch — a fault on ONE case never breaks the tick or another case.
   * Deterministic (makeRng seeded — NO Math.random, NO Date.now).
   * Anti-fabrication: no Math.random. No Date.now(). Pure arithmetic + seeded RNG.
   * R2.2 / P5: info_leak_total is SERVER-ONLY. Written here; projected via LeakBandBucket (C9).
   * Canon: plan §C6 + lawyer_legal_system.md §2 info-leak mechanic.
   */
  async tickLeakAccumulation(ctx: { playerId: string; gameMinute: number }): Promise<void> {
    // L1 empty-state skip.
    const activeCases = await this.caseRepo.listActiveCasesForPlayer(ctx.playerId);
    if (activeCases.length === 0) return;

    const gameDay = Math.floor(ctx.gameMinute / 1440);

    for (const caseRow of activeCases) {
      try {
        await this.tickLeakForCase(caseRow, ctx.playerId, gameDay, ctx.gameMinute);
      } catch (err) {
        this.logger.error(
          `LEGAL_LEAK_TICK: case=${caseRow.case_id} (player=${ctx.playerId}, gm=${ctx.gameMinute}) failed — ` +
            `contained: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  /**
   * tickLeakForCase — process ONE active case for a single tick.
   *
   * Seeded RNG `leak:${caseId}:${gameDay}`:
   *   - First draw (rng.chance): hit/miss on info_leak_rate.
   *   - Second draw (rng.int): item selection within ALL items (full list — stable across re-runs).
   * Both draws use the SAME seeded RNG instance → deterministic per (case, day).
   *
   * Idempotency: if the chosen item is already in items_leaked (same-day re-run), skip the leak
   * write and update only ticks_remaining. The items_leaked set is the idempotency guard.
   *
   * ticks_remaining always decrements by 1 (clamped ≥ 0). Time passes every tick.
   */
  private async tickLeakForCase(
    caseRow: LegalCaseRow,
    playerId: string,
    gameDay: number,
    gameMinute: number,
  ): Promise<void> {
    const { case_id: caseId, info_leak_rate, knowledge_set_ref, items_leaked, charge_severity } = caseRow;

    // Seeded RNG for this (case, game-day) pair — same seed = same roll = idempotent leak.
    const rng = makeRng(`leak:${caseId}:${gameDay}`);

    // ticks_remaining always decrements (time passes regardless of leak outcome).
    const newTicksRemaining = Math.max(0, caseRow.ticks_remaining - 1);

    // Roll the leak probability.
    if (!rng.chance(info_leak_rate)) {
      // No hit this tick — decrement ticks_remaining only.
      await this.caseRepo.updateCaseLeakAccrual(
        caseId,
        Array.isArray(items_leaked) ? (items_leaked as string[]) : [],
        caseRow.info_leak_total,
        newTicksRemaining,
      );
      return;
    }

    // HIT: find unleaked items.
    const knowledgeSet = (knowledge_set_ref as KnowledgeSet | null);
    const allItems: KnowledgeItem[] = knowledgeSet?.items ?? [];
    const leakedIds = new Set<string>(
      Array.isArray(items_leaked) ? (items_leaked as string[]) : [],
    );
    const unleakedItems = allItems.filter((item) => !leakedIds.has(item.id));

    if (unleakedItems.length === 0) {
      // All items already leaked (full_dump state) — decrement only.
      await this.caseRepo.updateCaseLeakAccrual(
        caseId,
        Array.isArray(items_leaked) ? (items_leaked as string[]) : [],
        caseRow.info_leak_total,
        newTicksRemaining,
      );
      this.logger.debug(
        `LEGAL_LEAK_TICK: case=${caseId} HIT but all items already leaked (full_dump) — decrement only`,
      );
      return;
    }

    // Deterministic item selection: second draw from the FULL allItems list (stable, not filtered).
    // IMPORTANT: we MUST index into allItems (not unleakedItems) so the int() draw is stable
    // across re-runs on the same game-day. Same seed → same RNG stream → same selectedIdx →
    // same leakedItem. The idempotency guard below then fires if that item was already leaked.
    // If we indexed into unleakedItems (filtered), a re-run would have a shorter list and the
    // same RNG value would select a DIFFERENT item — breaking idempotency.
    const selectedIdx = rng.int(0, allItems.length - 1);
    const leakedItem = allItems[selectedIdx];
    if (!leakedItem) {
      // Defensive (impossible given allItems.length > 0 and valid idx).
      await this.caseRepo.updateCaseLeakAccrual(
        caseId,
        Array.isArray(items_leaked) ? (items_leaked as string[]) : [],
        caseRow.info_leak_total,
        newTicksRemaining,
      );
      return;
    }

    // Idempotency guard: if this item is ALREADY in leakedIds (same-day re-run), skip the write.
    // Same seed → same item → guard fires on re-run → info_leak_total unchanged.
    if (leakedIds.has(leakedItem.id)) {
      await this.caseRepo.updateCaseLeakAccrual(
        caseId,
        Array.isArray(items_leaked) ? (items_leaked as string[]) : [],
        caseRow.info_leak_total,
        newTicksRemaining,
      );
      this.logger.debug(
        `LEGAL_LEAK_TICK: case=${caseId} HIT but item=${leakedItem.id} already leaked (idempotency guard) — decrement only`,
      );
      return;
    }

    // Write to declaration_ledger via the public BPD seam (REUSE active since mig 0052).
    await this.infoLeakService.recordLeakedItem(
      caseId,
      playerId,
      gameMinute,
      leakedItem,
      charge_severity,
    );

    // Update the case: append item id, increment info_leak_total, decrement ticks_remaining.
    const newLeakedIds = [...leakedIds, leakedItem.id];
    const newInfoLeakTotal = caseRow.info_leak_total + leakedItem.importance;

    await this.caseRepo.updateCaseLeakAccrual(
      caseId,
      newLeakedIds,
      newInfoLeakTotal,
      newTicksRemaining,
    );

    this.logger.log(
      `LEGAL_LEAK_TICK: case=${caseId} player=${playerId} day=${gameDay} ` +
        `itemId=${leakedItem.id} itemType=${leakedItem.type} importance=${leakedItem.importance} ` +
        `newInfoLeakTotal=${newInfoLeakTotal} newTicksRemaining=${newTicksRemaining}`,
    );
  }

  // ── Pure helpers (exposed for testability; no side-effects) ───────────────────────────────────

  /**
   * deriveChargeSeverityForCourier — pure function: cargo × reputation_at_catch → charge severity.
   *
   * [PROV-Y26Q2]: cut magnitudes are registry getters (LawyerTunables); ratification by reviewer ⊥.
   * Couriers can only reach `misdemeanor` or `felony_low` (not higher — they are operationally
   * more exposed but don't hold strategic knowledge like lieutenants; sub-decision #3, RATIFIÉ).
   *
   * Rule:
   *   reputation_at_catch >= courierChargeReputationThreshold (10)
   *     OR cargo_cents >= courierChargeCargoCentsThreshold (50000)
   *     → 'felony_low'  (experienced courier or significant cargo → escalate)
   *   else → 'misdemeanor'
   *
   * No Math.random. No Date.now(). Deterministic on inputs.
   *
   * @param cargoCents      — cargo value from courier_shift.cargo_cents
   * @param reputationAtCatch — sessions_active snapshot frozen at catch (caught_exception.reputation_at_catch)
   */
  deriveChargeSeverityForCourier(
    cargoCents: number,
    reputationAtCatch: number,
  ): 'misdemeanor' | 'felony_low' {
    const cargoThreshold   = this.tunables.courierChargeCargoCentsThreshold;
    const reputationThreshold = this.tunables.courierChargeReputationThreshold;
    if (reputationAtCatch >= reputationThreshold || cargoCents >= cargoThreshold) {
      return 'felony_low';
    }
    return 'misdemeanor';
  }

  /**
   * buildKnowledgeSetForCourier — deterministic knowledge-set from courier cargo × reputation.
   *
   * Items [PROV-Y26Q2] (ratification by reviewer ⊥ expected — no Math.random, PURE):
   *   ALL:                    'route_detail'       importance=0.2  (route the courier ran)
   *   cargo >= threshold(50k): 'cargo_detail'      importance=0.4  (cargo exposure → stash usage)
   *   reputation >= threshold(10): 'network_exposure' importance=0.6 (experienced courier knows org)
   *
   * Item ID format: `${courierId}:${type}` — stable, no UUID generation.
   * C6 tick draws from this set by ID; IDs must be stable across game-sessions.
   * No Math.random. Importance values are inline STRUCTURAL orderings (not balance knobs).
   *
   * @param courierId       — the defendant courier UUID
   * @param cargoCents      — cargo value from courier_shift.cargo_cents
   * @param reputationAtCatch — sessions_active snapshot at catch time
   */
  buildKnowledgeSetForCourier(
    courierId: string,
    cargoCents: number,
    reputationAtCatch: number,
  ): KnowledgeSet {
    const items: KnowledgeItem[] = [];

    // ALL couriers expose the route they were running.
    items.push({
      id: `${courierId}:route_detail`,
      type: 'route_detail',
      label: 'Route details',
      importance: 0.2,
    });

    // Significant cargo (>= threshold) exposes the stash usage pattern.
    if (cargoCents >= this.tunables.courierChargeCargoCentsThreshold) {
      items.push({
        id: `${courierId}:cargo_detail`,
        type: 'cargo_detail',
        label: 'Cargo details',
        importance: 0.4,
      });
    }

    // Experienced courier (reputation >= threshold) knows enough about the network.
    if (reputationAtCatch >= this.tunables.courierChargeReputationThreshold) {
      items.push({
        id: `${courierId}:network_exposure`,
        type: 'network_exposure',
        label: 'Network exposure',
        importance: 0.6,
      });
    }

    return { items };
  }

  /**
   * deriveChargeSeverityForLieutenant — pure function: tenure × role → charge severity.
   *
   * Thresholds are [PROV-Y26Q2] registry getters (LawyerTunables). Ratification by reviewer ⊥ expected.
   *
   *   role_id >= ltChargeRoleHighThreshold(10) OR tenure_score >= ltChargeTenureHighThreshold(1000)
   *     → 'major_crime'
   *   role_id < ltChargeRoleLowThreshold(5) AND tenure_score < ltChargeTenureLowThreshold(300)
   *     → 'felony_low'
   *   else
   *     → 'felony_high'
   *
   * No Math.random. No Date.now(). Deterministic on input.
   */
  deriveChargeSeverityForLieutenant(
    tenureScore: number,
    roleId: number,
  ): 'felony_low' | 'felony_high' | 'major_crime' {
    const roleHigh    = this.tunables.ltChargeRoleHighThreshold;
    const roleLow     = this.tunables.ltChargeRoleLowThreshold;
    const tenureHigh  = this.tunables.ltChargeTenureHighThreshold;
    const tenureLow   = this.tunables.ltChargeTenureLowThreshold;

    if (roleId >= roleHigh || tenureScore >= tenureHigh) {
      return 'major_crime';
    }
    if (roleId < roleLow && tenureScore < tenureLow) {
      return 'felony_low';
    }
    return 'felony_high';
  }

  /**
   * buildKnowledgeSetForLieutenant — deterministic knowledge-set from lieutenant role × tenure.
   *
   * Items [PROV-Y26Q2] (ratification by reviewer ⊥ expected — no Math.random, PURE):
   *   ALL:         'operation_detail'    importance=0.3
   *   role ≥ 5:    'stash_location'      importance=0.5
   *   role ≥ 10:   'lieutenant_network'  importance=0.7
   *   tenure ≥ 300: 'financial_flows'    importance=0.6
   *   tenure ≥ 1000: 'boss_identity'     importance=1.0
   *
   * Item ID format: `${lieutenantId}:${type}` — stable, no UUID generation.
   * The C6 tick draws from this set by ID; IDs must be stable across game-sessions.
   * No Math.random. Importance values are INLINE CONSTANTS (not registry keys) since they are
   * structural orderings, not tunable balance knobs.
   */
  buildKnowledgeSetForLieutenant(
    lieutenantId: string,
    roleId: number,
    tenureScore: number,
  ): KnowledgeSet {
    const items: KnowledgeItem[] = [];

    // ALL lieutenants know their own operation details (base knowledge).
    items.push({
      id: `${lieutenantId}:operation_detail`,
      type: 'operation_detail',
      label: 'Operation details',
      importance: 0.3,
    });

    // Lieutenants with a meaningful role (≥ roleLow=5) know stash locations.
    if (roleId >= this.tunables.ltChargeRoleLowThreshold) {
      items.push({
        id: `${lieutenantId}:stash_location`,
        type: 'stash_location',
        label: 'Stash location',
        importance: 0.5,
      });
    }

    // Lieutenants with a senior role (≥ roleHigh=10) know the lieutenant network.
    if (roleId >= this.tunables.ltChargeRoleHighThreshold) {
      items.push({
        id: `${lieutenantId}:lieutenant_network`,
        type: 'lieutenant_network',
        label: 'Lieutenant network',
        importance: 0.7,
      });
    }

    // Experienced lieutenants (tenure ≥ tenureLow=300) know financial flows.
    if (tenureScore >= this.tunables.ltChargeTenureLowThreshold) {
      items.push({
        id: `${lieutenantId}:financial_flows`,
        type: 'financial_flows',
        label: 'Financial flows',
        importance: 0.6,
      });
    }

    // Long-tenured lieutenants (tenure ≥ tenureHigh=1000) know boss identity.
    if (tenureScore >= this.tunables.ltChargeTenureHighThreshold) {
      items.push({
        id: `${lieutenantId}:boss_identity`,
        type: 'boss_identity',
        label: 'Boss identity',
        importance: 1.0,
      });
    }

    return { items };
  }

  /**
   * resolveCaseDurationTicks — map chargeSeverity → game-ticks for the case duration.
   *
   * Reads the composite reference string from the tunables registry (e.g. `'composite:duration_long'`
   * for `felony_high`) and resolves it to a concrete integer via `compositeToTicks`.
   *
   * Two-step approach (C2 intent + C3 materialization):
   *   C2: `caseDurationFelonyHighTicks` returns the composite string from the registry
   *       (`resolveString` → `'composite:duration_long'` or env override). This makes
   *       the composite name the SINGLE SOURCE OF TRUTH in gdd/14.
   *   C3: `compositeToTicks` materializes the composite name → concrete integer [PROV-Y26Q2].
   *       The materialization is defined HERE (not in the tunables getter) per the C2 annotation:
   *       "the actual numeric tick resolution happens via the composite resolver (not inlined here)".
   *
   * [PROV-Y26Q2]: concrete values (4320 / 10080 / 20160 / 43200) are pending reviewer ⊥
   * ratification. No inline integer in this method — all go through compositeToTicks.
   */
  resolveCaseDurationTicks(
    severity: 'misdemeanor' | 'felony_low' | 'felony_high' | 'major_crime',
  ): number {
    switch (severity) {
      case 'misdemeanor':  return this.compositeToTicks(this.tunables.caseDurationMisdemeanorTicks);
      case 'felony_low':   return this.compositeToTicks(this.tunables.caseDurationFelonyLowTicks);
      case 'felony_high':  return this.compositeToTicks(this.tunables.caseDurationFelonyHighTicks);
      case 'major_crime':  return this.compositeToTicks(this.tunables.caseDurationMajorCrimeTicks);
    }
  }

  /**
   * compositeToTicks — resolve a composite duration name to concrete game-ticks.
   *
   * [PROV-Y26Q2]: the concrete tick counts (1 game-day = 1440 ticks) are pending ratification
   * by reviewer ⊥. These are the proposed [PROV-Y26Q2] defaults from gdd/14 + the plan:
   *   'composite:duration_short':     3 days  = 4320 ticks  (misdemeanor — short consequence)
   *   'composite:duration_medium':    7 days  = 10080 ticks (felony_low — standard duration)
   *   'composite:duration_long':      14 days = 20160 ticks (felony_high — extended duration)
   *   'composite:duration_very_long': 30 days = 43200 ticks (major_crime — max duration)
   *
   * R2.2: the composite string is the SSOT in gdd/14 (not the integer). The registry allows
   * overriding the composite name via env (LAWYER_CASE_DURATION_*_TICKS); this resolver then
   * materializes whatever composite name the registry yields. Unknown names fall back to 4320
   * with a warning (defensive — should never occur in organic prod).
   *
   * Pattern: mirrors distribution-tunables.ts materialization of `composite:duration_medium_sessions`
   * → 10 (OQ-12), where canon composites are materialized as concrete integers in the service layer.
   */
  private compositeToTicks(composite: string): number {
    const DAILY_TICKS = 1440; // 1 game-day = 24h × 60min (canonical game-time unit)
    const MAP: Record<string, number> = {
      'composite:duration_short':     3  * DAILY_TICKS, // 4320 ticks  — misdemeanor
      'composite:duration_medium':    7  * DAILY_TICKS, // 10080 ticks — felony_low
      'composite:duration_long':      14 * DAILY_TICKS, // 20160 ticks — felony_high
      'composite:duration_very_long': 30 * DAILY_TICKS, // 43200 ticks — major_crime
    };
    const ticks = MAP[composite];
    if (ticks === undefined) {
      // Unknown composite name — defensive fallback (misdemeanor duration, 3 days).
      // Should never happen in organic prod (the 4 composites above cover all severities;
      // env override of the composite key string would need to match one of these names).
      this.logger.warn(
        `LegalCaseService.compositeToTicks: unknown composite '${composite}' — ` +
          `fallback to 4320 (3d misdemeanor) [PROV-Y26Q2]`,
      );
      return 4320;
    }
    return ticks;
  }

  // ── Raid handler (public for test-controller probe — not bus-facing; the bus calls onModuleInit) ──

  /**
   * handleBuildingRaided — handle a BuildingRaidedEvent → lieutenant legal case.
   *
   * Public so that `LegalTestController.fireRaidCase` can call it directly and await the created
   * case row (the bus fires async and the test would race). The production path goes through the
   * bus subscription registered in `onModuleInit`.
   *
   * Mirrors RaidExceptionProducerService.handle (raid-exception-producer.service.ts:39-57):
   *   - Look up the delegated lieutenant for the damaged building.
   *   - If no delegated lieutenant guards this building → returns null (zero-regression).
   *   - Derive charge severity from lieutenant's tenure × role [PROV-Y26Q2].
   *   - Build knowledge set (deterministic, no Math.random).
   *   - Call createCase(defendant_type='lieutenant').
   *   - Returns the created LegalCaseRow (or null if no lieutenant).
   *
   * DOES NOT check `scriptCoversBuildingDamaged` — the legal case is an unconditional consequence
   * of the raid (the exception script doesn't govern the police's legal response, only the player's
   * operational response). This is additive alongside the existing RaidExceptionProducerService.
   */
  async handleBuildingRaided(e: BuildingRaidedEvent): Promise<LegalCaseRow | null> {
    const lt = await this.lieutenantRepo.findDelegatedByAssignedBuilding(e.playerId, e.buildingId);
    if (!lt) {
      // No delegated lieutenant at this building → no lieutenant case.
      // Zero-regression: buildings without a delegated executor produce no case.
      return null;
    }

    const chargeSeverity = this.deriveChargeSeverityForLieutenant(lt.tenure_score, lt.role_id);
    const knowledgeSet = this.buildKnowledgeSetForLieutenant(
      lt.lieutenant_id,
      lt.role_id,
      lt.tenure_score,
    );

    return this.createCase({
      playerId: e.playerId,
      defendantType: 'lieutenant',
      defendantId: lt.lieutenant_id,
      chargeSeverity,
      triggerRef: `building_raided:${e.buildingId}:district=${e.districtId}:block=${e.blockId}`,
      gameMinute: e.gameMinute,
      knowledgeSet,
    });
  }
}
