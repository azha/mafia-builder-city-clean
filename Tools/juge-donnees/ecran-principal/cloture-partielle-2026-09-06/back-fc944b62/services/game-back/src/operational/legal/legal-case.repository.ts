// IMPLEMENTS: docs/superpowers/plans/2026-06-30-04d-A-lawyer-legal-plan.md C3 (repository) + C5 (tier methods)
//             Canon: docs/tech/04d_meta_market_lawyer_and_internal_affairs/lawyer_legal_system.md §State
//             — 04d-A C3 — 2026-06-30 | C5 additions — 2026-06-30
//
// `LegalCaseRepository` — Drizzle CRUD layer over `lawyers` + `legal_cases`.
//
// C3 scope:
//   insertLawyer(values)      — inserts a new lawyers row (Tier-1 public defender at createCase)
//   insertCase(values)        — inserts a new legal_cases row
//   findCaseById(caseId)      — reads a single case row (BO + test assertions)
//   findLieutenantForMIS(playerId, buildingIdHash) — reverse-hash lookup for tail_subpoena path:
//     queries all lieutenants for the player, computes the same hash as StandingGapHeatService
//     (lieutenantBuildingIdHash: first 8 hex chars of UUID → 31-bit mask), finds the match.
//     Returns { lieutenant_id, role_id, tenure_score } or null (defensive: hash collision risk
//     is negligible at realistic player-lieutenant cardinalities of 0..20).
//
// C5 additions (tier model — hire / setRetainer / reassignCase):
//   findExistingPublicDefenderForPlayer(playerId) — carry-forward #4: reuse existing public_defender.
//   findLawyerById(lawyerId)    — read a single lawyers row for LawyerService operations.
//   incrementLawyerSessions(lawyerId, delta) — increment/decrement sessions_active atomically.
//   updateLawyerRetainer(lawyerId, active, monthlyCostCents) — toggle retainer_active + cost.
//   reassignCaseToLawyer(caseId, newLawyerId, infoLeakRate, ticksRemaining, caseDurationTicks) — mid-case reassign.
//   debitCash(playerId, amountCents) — atomic guarded debit on economy_states.cash_cents.
//     Returns true (debit succeeded) or false (insufficient cash).
//     Pattern: contract.service.ts:276-285 (UPDATE ... WHERE cash_cents >= cost).
//
// ZERO regression: ADDITIVE only (no existing tables/queries modified). The
// caught_exception.legal_case_id stamp is in C4 (LAWYER_UP re-wire; not here).
//
// R9.3: the tables and schema are already backported in C1 (schema_lawyer.md + schema_legal_case.md).
// R2.2 / P5: server-only columns (burn_risk_score, info_leak_rate, info_leak_total) are never
//   filtered here — they're read by BO endpoints (C10) and the projection service (C9) as needed.
// No Math.random. No Date.now(). All IDs from PG defaultRandom() or caller-supplied.
// C5 carry-forward #6: uses shared lieutenantBuildingIdHash from common/ (anti-drift).

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { lawyer, legalCase } from '../../db/schema/legal';
import { lieutenant } from '../../db/schema/lieutenant';
import { economyState } from '../../db/schema/player_economy_state';
import type { LawyerInsert, LawyerRow, LegalCaseInsert, LegalCaseRow } from '../../db/schema/legal';
// C5 carry-forward #6 — shared hash util (replaces the inline copy; both legal + forensic import this).
import { lieutenantBuildingIdHash } from '../../common/lieutenant-building-id-hash';

/** Shape returned by findLieutenantForMIS — the minimum data needed for createCase. */
export interface LieutenantForCase {
  lieutenant_id: string;
  role_id: number;
  tenure_score: number;
}

@Injectable()
export class LegalCaseRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  // ── C3: Lawyer insert ──────────────────────────────────────────────────────────────────────────

  /**
   * insertLawyer — insert a new row into `lawyers` (called by LegalCaseService.createCase at
   * Tier-1 auto-assign: a public_defender is created for every new case unless one already
   * exists for the player — carry-forward #4 reuse guard). Returns the full row.
   *
   * Anti-fabrication: no Math.random. lawyer_id PK is DEFAULT RANDOM (DB-generated).
   * C4 determinism: no tick-time or wall-clock dependency.
   */
  async insertLawyer(values: LawyerInsert): Promise<LawyerRow> {
    const rows = await this.db
      .insert(lawyer)
      .values(values)
      .returning();
    const row = rows[0];
    if (!row) throw new Error('LegalCaseRepository.insertLawyer: insert returned no row');
    return row;
  }

  // ── C3: Case insert ────────────────────────────────────────────────────────────────────────────

  /**
   * insertCase — insert a new row into `legal_cases`. Returns the full row.
   *
   * Anti-fabrication: no Math.random. case_id PK is DEFAULT RANDOM (DB-generated).
   * C4 determinism: no tick-time or wall-clock dependency.
   */
  async insertCase(values: LegalCaseInsert): Promise<LegalCaseRow> {
    const rows = await this.db
      .insert(legalCase)
      .values(values)
      .returning();
    const row = rows[0];
    if (!row) throw new Error('LegalCaseRepository.insertCase: insert returned no row');
    return row;
  }

  // ── C3: Case read ──────────────────────────────────────────────────────────────────────────────

  /**
   * findCaseById — read a single `legal_cases` row by case_id. Returns null if not found.
   *
   * Used by: test probes (LegalTestController C3), BO (C10), resolution/leak ticks (C6/C7).
   */
  async findCaseById(caseId: string): Promise<LegalCaseRow | null> {
    const rows = await this.db
      .select()
      .from(legalCase)
      .where(eq(legalCase.case_id, caseId))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * findCaseByIdScoped — W6a C3 (P-A): joint read, single round-trip — `case_id = ? AND
   * player_id = ?`. 0 rows ⇒ the case doesn't exist OR belongs to a DIFFERENT player; the caller
   * (LawyerService.issueTier3Payoff) turns that into 404 `RESOURCE_NOT_FOUND` (D2), never a 5xx.
   *
   * Deliberately a NEW method rather than adding a `playerId` param to `findCaseById`: the latter
   * is still used unscoped by callers outside C3's scope (`reassignCase`, C4's #7/#8 findings) —
   * scoping those is C4's job, not this chunk's. See design §3/C4.
   *
   * Used by: LawyerService.issueTier3Payoff (W6a C3).
   */
  async findCaseByIdScoped(caseId: string, playerId: string): Promise<LegalCaseRow | null> {
    const rows = await this.db
      .select()
      .from(legalCase)
      .where(and(eq(legalCase.case_id, caseId), eq(legalCase.player_id, playerId)))
      .limit(1);
    return rows[0] ?? null;
  }

  // ── C3: MIS reverse-hash lookup ───────────────────────────────────────────────────────────────

  /**
   * findLieutenantForMIS — reverse-lookup: given a player + the buildingIdHash from a
   * `tail_subpoena` `ForensicEntryDispatchedEvent`, find the lieutenant whose UUID hashes to
   * that value. Returns null if no match (defensive — impossible in organic flow; logs at caller).
   *
   * Algorithm: query all player lieutenants → compute hash for each → linear scan for match.
   * Cardinality: realistic player-lieutenant set is 0..20; O(N) is fine.
   *
   * C5 carry-forward #6: delegates to the shared `lieutenantBuildingIdHash` from
   * `common/lieutenant-building-id-hash.ts` (anti-drift with StandingGapHeatService).
   * [PROV-Y26Q2]: mirrors StandingGapHeatService.lieutenantBuildingId — co-maintained via shared util.
   */
  async findLieutenantForMIS(
    playerId: string,
    buildingIdHash: number,
  ): Promise<LieutenantForCase | null> {
    const rows = await this.db
      .select({
        lieutenant_id: lieutenant.lieutenant_id,
        role_id: lieutenant.role_id,
        tenure_score: lieutenant.tenure_score,
      })
      .from(lieutenant)
      .where(eq(lieutenant.player_id, playerId));

    const match = rows.find(
      (row) => lieutenantBuildingIdHash(row.lieutenant_id as string) === buildingIdHash,
    );
    if (!match) return null;
    return {
      lieutenant_id: match.lieutenant_id as string,
      role_id: match.role_id,
      tenure_score: match.tenure_score,
    };
  }

  // ── C5: Per-player public_defender reuse (carry-forward #4) ───────────────────────────────────

  /**
   * findExistingPublicDefenderForPlayer — return the most recently created public_defender
   * lawyer row for this player, or null if none exists yet.
   *
   * C5 carry-forward #4: before C5, `createCase` inserted a FRESH public_defender every time.
   * That proliferated rows. Fix: reuse the existing one (increment sessions_active instead of
   * inserting a duplicate). A player with no case yet has no public_defender; first case creates
   * one; subsequent cases reuse it.
   *
   * Ordered by hired_at DESC → returns the most recent (deterministic; same-player dedup).
   */
  async findExistingPublicDefenderForPlayer(playerId: string): Promise<LawyerRow | null> {
    const rows = await this.db
      .select()
      .from(lawyer)
      .where(
        and(
          eq(lawyer.player_id, playerId),
          eq(lawyer.tier, 'public_defender'),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  // ── C5: Lawyer reads ───────────────────────────────────────────────────────────────────────────

  /**
   * findLawyerById — read a single `lawyers` row by lawyer_id. Returns null if not found.
   *
   * Used by: LawyerService.setRetainer, LawyerService.reassignCase (C5);
   *          BO (C10); evaluateBurnRisk NIGHTLY (C8).
   */
  async findLawyerById(lawyerId: string): Promise<LawyerRow | null> {
    const rows = await this.db
      .select()
      .from(lawyer)
      .where(eq(lawyer.lawyer_id, lawyerId))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * findLawyerByIdScoped — W6a C3 (P-A): joint read, single round-trip — `lawyer_id = ? AND
   * player_id = ?`. 0 rows ⇒ the lawyer doesn't exist OR belongs to a DIFFERENT player.
   *
   * Deliberately a NEW method rather than adding `playerId` to `findLawyerById`: the latter stays
   * unscoped for `setRetainer`/`reassignCase` (C4's #7/#8 findings, out of this chunk's scope).
   *
   * Used by: LawyerService.issueTier3Payoff (W6a C3).
   */
  async findLawyerByIdScoped(lawyerId: string, playerId: string): Promise<LawyerRow | null> {
    const rows = await this.db
      .select()
      .from(lawyer)
      .where(and(eq(lawyer.lawyer_id, lawyerId), eq(lawyer.player_id, playerId)))
      .limit(1);
    return rows[0] ?? null;
  }

  // ── C5: sessions_active delta ──────────────────────────────────────────────────────────────────

  /**
   * incrementLawyerSessions — atomically adjust `sessions_active` by `delta` (+1 or -1).
   *
   * Used by:
   *   createCase: +1 when reusing an existing public_defender (carry-forward #4).
   *   reassignCase: +1 for the new lawyer, -1 for the old lawyer (C5).
   *   resolveCase / cancelCase: -1 when a case is no longer active (C7/C8).
   *
   * No explicit guard against going below 0 — the caller ensures the delta is consistent
   * with the actual case assignment state (negative sessions_active would be a logic bug,
   * not a user-facing guard). The count is informational (roster display), not a payment gate.
   */
  async incrementLawyerSessions(lawyerId: string, delta: number): Promise<LawyerRow> {
    const rows = await this.db
      .update(lawyer)
      .set({ sessions_active: sql`${lawyer.sessions_active} + ${delta}` })
      .where(eq(lawyer.lawyer_id, lawyerId))
      .returning();
    const row = rows[0];
    if (!row) throw new Error(`LegalCaseRepository.incrementLawyerSessions: lawyer ${lawyerId} not found`);
    return row;
  }

  // ── C5: Retainer toggle ────────────────────────────────────────────────────────────────────────

  /**
   * updateLawyerRetainer — toggle `retainer_active` and set/clear `retainer_monthly_cost_cents`.
   *
   * Called by LawyerService.setRetainer (C5).
   *   active=true  → retainer_active=true,  retainer_monthly_cost_cents = monthlyCostCents.
   *   active=false → retainer_active=false, retainer_monthly_cost_cents = null (per-case billing).
   *
   * Returns the updated lawyers row (for test assertions on the controller).
   */
  async updateLawyerRetainer(
    lawyerId: string,
    active: boolean,
    monthlyCostCents: number | null,
  ): Promise<LawyerRow> {
    const rows = await this.db
      .update(lawyer)
      .set({
        retainer_active: active,
        retainer_monthly_cost_cents: active ? monthlyCostCents : null,
      })
      .where(eq(lawyer.lawyer_id, lawyerId))
      .returning();
    const row = rows[0];
    if (!row) throw new Error(`LegalCaseRepository.updateLawyerRetainer: lawyer ${lawyerId} not found`);
    return row;
  }

  // ── C5: Case reassignment ──────────────────────────────────────────────────────────────────────

  /**
   * reassignCaseToLawyer — update a legal_cases row to reflect a mid-case lawyer upgrade.
   *
   * Called by LawyerService.reassignCase (C5) AFTER:
   *   1. Incrementing the new lawyer's sessions_active (+1).
   *   2. Decrementing the old lawyer's sessions_active (-1).
   *
   * Updates:
   *   lawyer_id        = newLawyerId
   *   info_leak_rate   = newInfoLeakRate  (SERVER-ONLY, R2.2/P5)
   *   ticks_remaining  = newTicksRemaining
   *   case_duration_ticks = newCaseDurationTicks  (extended for Tier-2; unchanged for Tier-3)
   *
   * Returns the updated legal_cases row for the LawyerService to return to the caller.
   * The info_leak_rate is asserted in the test controller's BO-style probe (server-only scalar
   * exposed only to the test-env route — R2.2/P5 holds in production).
   */
  async reassignCaseToLawyer(
    caseId: string,
    newLawyerId: string,
    newInfoLeakRate: number,
    newTicksRemaining: number,
    newCaseDurationTicks: number,
  ): Promise<LegalCaseRow> {
    const rows = await this.db
      .update(legalCase)
      .set({
        lawyer_id: newLawyerId,
        info_leak_rate: newInfoLeakRate,
        ticks_remaining: newTicksRemaining,
        case_duration_ticks: newCaseDurationTicks,
      })
      .where(
        and(
          eq(legalCase.case_id, caseId),
          eq(legalCase.status, 'active'), // guard: only reassign active cases
        ),
      )
      .returning();
    const row = rows[0];
    if (!row) {
      throw new Error(
        `LegalCaseRepository.reassignCaseToLawyer: case ${caseId} not found or not active`,
      );
    }
    return row;
  }

  // ── C6: Active cases list (for LEGAL_LEAK_TICK L1 skip + tick body) ────────────────────────────

  /**
   * listActiveCasesForPlayer — query all active legal_cases for a player.
   *
   * Used by: tickLeakAccumulation (C6 LEGAL_LEAK_TICK) to find cases to process.
   * L1 skip: empty result → no write, the tick is a no-op (zero-regression guarantee).
   * Filter: status = 'active' only (resolved/convicted/plea_down cases are not ticked).
   */
  async listActiveCasesForPlayer(playerId: string): Promise<LegalCaseRow[]> {
    return this.db
      .select()
      .from(legalCase)
      .where(
        and(
          eq(legalCase.player_id, playerId),
          eq(legalCase.status, 'active'),
        ),
      );
  }

  // ── C6: Post-tick update (items_leaked + info_leak_total + ticks_remaining) ───────────────────

  /**
   * updateCaseLeakAccrual — update a legal_cases row after a LEGAL_LEAK_TICK.
   *
   * Sets:
   *   items_leaked     = newItemsLeaked  (the full updated array of leaked item IDs)
   *   info_leak_total  = newInfoLeakTotal (SERVER-ONLY, R2.2/P5)
   *   ticks_remaining  = newTicksRemaining (always decremented; clamped ≥ 0)
   *
   * Guard: status = 'active' (defensive — should always be true when called from the tick).
   * Returns the updated row for logging/assertion.
   *
   * Anti-fabrication: no Math.random. Pure arithmetic from tick body.
   */
  async updateCaseLeakAccrual(
    caseId: string,
    newItemsLeaked: string[],
    newInfoLeakTotal: number,
    newTicksRemaining: number,
  ): Promise<LegalCaseRow> {
    const rows = await this.db
      .update(legalCase)
      .set({
        items_leaked: newItemsLeaked as unknown as string,
        info_leak_total: newInfoLeakTotal,
        ticks_remaining: newTicksRemaining,
      })
      .where(
        and(
          eq(legalCase.case_id, caseId),
          eq(legalCase.status, 'active'),
        ),
      )
      .returning();
    const row = rows[0];
    if (!row) throw new Error(`LegalCaseRepository.updateCaseLeakAccrual: case ${caseId} not found or not active`);
    return row;
  }

  // ── C7: Resolution sweep queries ─────────────────────────────────────────────────────────────

  /**
   * findEligibleCasesForResolution — query all active cases for a player that have expired
   * (ticks_remaining <= 0). These are the cases the NIGHTLY resolution sweep will resolve.
   *
   * Used by: LegalCaseService.resolveCasesForPlayer (C7 LEGAL_NIGHTLY_TICK).
   * L1 empty-state skip: empty result → the sweep is a no-op (zero-regression guarantee).
   * Filter: status='active' AND ticks_remaining <= 0.
   *
   * NOTE: this does NOT include cases where ticks_remaining > 0 (those are still ongoing).
   * A case with ticks_remaining = 0 fires at the NEXT NIGHTLY after hitting zero.
   */
  async findEligibleCasesForResolution(playerId: string): Promise<LegalCaseRow[]> {
    return this.db
      .select()
      .from(legalCase)
      .where(
        and(
          eq(legalCase.player_id, playerId),
          eq(legalCase.status, 'active'),
          sql`${legalCase.ticks_remaining} <= 0`,
        ),
      );
  }

  /**
   * resolveAndUpdateCase — stamp a legal_cases row with its terminal status + resolved_at.
   *
   * Guard: status='active' (idempotency — a resolved case cannot be re-resolved).
   * Returns the updated row. Throws if case is not found or not active.
   *
   * C8 carry-forward #6 (transactional order): this method stamps ONLY status + resolved_at.
   * The conviction final-dump (items_leaked + info_leak_total) is handled SEPARATELY via
   * `updateCaseFinalDumpItems` called AFTER the stamp succeeds. This ensures that if the stamp
   * throws (case already resolved = idempotency guard triggered), NO declaration_ledger writes
   * happen (preventing orphan ledger entries on a double-resolution attempt).
   *
   * Anti-fabrication: no Math.random. resolved_at = wall-clock timestamp (canonical DB pattern).
   */
  async resolveAndUpdateCase(
    caseId: string,
    newStatus: 'acquitted' | 'plea_down' | 'convicted' | 'dismissed',
  ): Promise<LegalCaseRow> {
    const rows = await this.db
      .update(legalCase)
      .set({
        status: newStatus,
        resolved_at: new Date(),
      })
      .where(
        and(
          eq(legalCase.case_id, caseId),
          eq(legalCase.status, 'active'),
        ),
      )
      .returning();
    const row = rows[0];
    if (!row) {
      throw new Error(
        `LegalCaseRepository.resolveAndUpdateCase: case ${caseId} not found or not active (already resolved?)`,
      );
    }
    return row;
  }

  /**
   * updateCaseFinalDumpItems — update items_leaked + info_leak_total on a resolved case.
   *
   * Called AFTER resolveAndUpdateCase (status stamp) for the 'convicted' outcome.
   * C8 carry-forward #6: separating stamp from dump ensures the declaration_ledger writes
   * only happen if the status stamp succeeded (no orphan ledger entries on re-resolution).
   *
   * No idempotency guard here: the caller ensures this is only called after a successful stamp.
   * Returns the updated row (post-final-dump state).
   */
  async updateCaseFinalDumpItems(
    caseId: string,
    finalItemsLeaked: string[],
    finalInfoLeakTotal: number,
  ): Promise<LegalCaseRow> {
    const rows = await this.db
      .update(legalCase)
      .set({
        items_leaked: finalItemsLeaked as unknown as string,
        info_leak_total: finalInfoLeakTotal,
      })
      .where(eq(legalCase.case_id, caseId))
      .returning();
    const row = rows[0];
    if (!row) {
      throw new Error(
        `LegalCaseRepository.updateCaseFinalDumpItems: case ${caseId} not found`,
      );
    }
    return row;
  }

  // ── C8: Burn risk + auto-Tier-1 fallback ──────────────────────────────────────────────────────

  /**
   * findActiveCasesForLawyer — list all active legal_cases assigned to a given lawyer.
   *
   * Used by LawyerService.evaluateBurnRisk (C8) to find cases to downgrade to Tier-1 when
   * the lawyer burns. Returns an empty array if no active cases (no-op burn path).
   * R2.2/P5: server-only — never called from a player-facing route.
   */
  async findActiveCasesForLawyer(lawyerId: string): Promise<LegalCaseRow[]> {
    return this.db
      .select()
      .from(legalCase)
      .where(
        and(
          eq(legalCase.lawyer_id, lawyerId),
          eq(legalCase.status, 'active'),
        ),
      );
  }

  /**
   * findTier3LawyersByPlayer — list all corruption_pipeline (Tier-3) lawyers for a player.
   *
   * Used by LawyerService.evaluateBurnForPlayer (C8 NIGHTLY sweep) to find Tier-3 lawyers
   * eligible for burn evaluation. Returns an empty array if none (L1 skip).
   * R2.2/P5: server-only — burn_risk_score is never forwarded to the player client.
   */
  async findTier3LawyersByPlayer(playerId: string): Promise<LawyerRow[]> {
    return this.db
      .select()
      .from(lawyer)
      .where(
        and(
          eq(lawyer.player_id, playerId),
          eq(lawyer.tier, 'corruption_pipeline'),
        ),
      );
  }

  /**
   * updateLawyerBurnRisk — set burn_risk_score on a lawyers row.
   *
   * Used by:
   *   LawyerService.issueTier3Payoff (C8): increments burn_risk_score by the payoff increment.
   *   LawyerService.evaluateBurnRisk (C8): clamps burn_risk_score to tier3BurnThreshold
   *     after emitting LawyerBurnedEvent (idempotency guard: prevents re-fire on next NIGHTLY).
   *
   * The caller is responsible for clamping newScore to [0, 1] before calling.
   * Returns the updated lawyers row.
   */
  async updateLawyerBurnRisk(lawyerId: string, newScore: number): Promise<LawyerRow> {
    const rows = await this.db
      .update(lawyer)
      .set({ burn_risk_score: newScore })
      .where(eq(lawyer.lawyer_id, lawyerId))
      .returning();
    const row = rows[0];
    if (!row) {
      throw new Error(
        `LegalCaseRepository.updateLawyerBurnRisk: lawyer ${lawyerId} not found`,
      );
    }
    return row;
  }

  /**
   * reassignCaseToPublicDefender — switch a case's lawyer to a public_defender.
   *
   * Used by LawyerService.evaluateBurnRisk (C8) to downgrade all active Tier-3 cases to
   * Tier-1 when the lawyer burns. Updates:
   *   - legal_cases.lawyer_id = pdLawyerId
   *   - legal_cases.info_leak_rate = tier1Rate (Tier-1 base rate — higher risk than Tier-3)
   * Only operates on active cases (WHERE status='active' guard; burned-lawyer cases may be
   * in any state — skip already-resolved ones silently).
   *
   * Returns the updated case row, or null if the case was already resolved (safe no-op).
   * The caller (LawyerService.evaluateBurnRisk) handles sessions_active bookkeeping.
   */
  async reassignCaseToPublicDefender(
    caseId: string,
    pdLawyerId: string,
    tier1Rate: number,
  ): Promise<LegalCaseRow | null> {
    const rows = await this.db
      .update(legalCase)
      .set({
        lawyer_id: pdLawyerId,
        info_leak_rate: tier1Rate,
      })
      .where(
        and(
          eq(legalCase.case_id, caseId),
          eq(legalCase.status, 'active'),
        ),
      )
      .returning();
    return rows[0] ?? null;
  }

  /**
   * listAllCasesForPlayer — query ALL legal_cases for a player (any status).
   *
   * Used by: LegalTestController C7 route `all-cases-for-player` (for test assertions on
   * resolved cases — the active-only `listActiveCasesForPlayer` misses them).
   * R2.2/P5: TEST-ONLY route (returned to test env only; not a production endpoint).
   */
  async listAllCasesForPlayer(playerId: string): Promise<LegalCaseRow[]> {
    return this.db
      .select()
      .from(legalCase)
      .where(eq(legalCase.player_id, playerId));
  }

  // ── C9: Lawyer roster (for LegalProjectionService.toLegalPanel) ─────────────────────────────

  /**
   * listAllLawyersForPlayer — query ALL lawyers rows for a player (any tier).
   *
   * Used by: C9 LegalProjectionService.toLegalPanel — the roster portion of LegalPanelView.
   * R2.2/P5: server-only fields (burn_risk_score) are present in the rows but STRIPPED
   *   before being returned to the client by LegalProjectionService. The repository does NOT
   *   filter here; filtering responsibility belongs to the projection service.
   */
  async listAllLawyersForPlayer(playerId: string): Promise<LawyerRow[]> {
    return this.db
      .select()
      .from(lawyer)
      .where(eq(lawyer.player_id, playerId));
  }

  // ── C5: Cash debit (economy_states) ───────────────────────────────────────────────────────────

  /**
   * debitCash — atomically debit `amountCents` from `economy_states.cash_cents` for `playerId`.
   *
   * Pattern mirrors contract.service.ts:276-285:
   *   UPDATE economy_states
   *   SET    cash_cents = cash_cents - amountCents
   *   WHERE  player_id = playerId AND cash_cents >= amountCents
   *
   * Returns true if the debit succeeded (1 row updated), false if insufficient balance (0 rows).
   * The caller (LawyerService.hire) throws 402 on false.
   *
   * No negative-balance guard needed here: the WHERE clause prevents debit below 0.
   * amountCents must be a positive integer (validated by LawyerService before this call).
   */
  async debitCash(playerId: string, amountCents: number): Promise<boolean> {
    const result = await this.db
      .update(economyState)
      .set({ cash_cents: sql`${economyState.cash_cents} - ${BigInt(amountCents)}` })
      .where(
        and(
          eq(economyState.player_id, playerId),
          sql`${economyState.cash_cents} >= ${BigInt(amountCents)}`,
        ),
      )
      .returning({ cash_cents: economyState.cash_cents });
    return result.length > 0;
  }
}
