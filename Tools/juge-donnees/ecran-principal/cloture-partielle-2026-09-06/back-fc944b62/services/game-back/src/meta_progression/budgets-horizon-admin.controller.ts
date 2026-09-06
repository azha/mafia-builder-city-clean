// IMPLEMENTS: docs/superpowers/plans/2026-07-19-p3-G-budgets-horizon-plan.md C10 ("BO surface +
//             program-wide P5 inversion sweep" — admin endpoints: design §14's 5 GET + force-clear-debt
//             POST + the cap-column PATCH `PATCH /v1/admin/players/:id/complexity-budget-cap` (the D1
//             BO-override surface — the #18 cap-column-is-source surface) + the P3-F tunables PUT
//             extended (zero code here — REUSE, unchanged); `requireStaffRole` gm/admin split,
//             `f3_deferred`, `AdminAuditLogService` REUSE).
//             Design: docs/superpowers/specs/2026-07-19-p3-G-budgets-horizon-design.md §14 (BO surface,
//             the 8-row endpoint table verbatim, `PUT tunables/meta-progression` REUSE unchanged).
//             C0-reanchor: docs/superpowers/specs/2026-07-19-p3-G-C0-reanchor.md §6 (R7 — "a SIBLING
//             `BudgetsHorizonAdminController`, registered in the NEW `BudgetsHorizonModule`'s own
//             `controllers[]` array — not an extension of `MetaProgressionAdminController`" — the
//             definitive, evidence-backed recommendation this file follows verbatim; the shared
//             `PUT tunables/meta-progression` route stays exactly where it is, on
//             `MetaProgressionAdminController` inside `DelegationRatchetModule` — pure registry-key REUSE,
//             DD-G5, zero controller code touched here).
//             Pattern (structure, guards, audit, f3_deferred convention — mirrored verbatim):
//             `meta-progression-admin.controller.ts` (P3-F C10 — `requireStaffRole('gm')`/`'admin'` split,
//             the pre-read-for-404/409 + atomic-conditional-write "force" mutation shape
//             (`forceCloseWindow`), the CAPS-clamp tunables PUT shape (REUSED, not re-declared here),
//             `AdminAuditLogService.emit` convention, the `sql<number>\`count(*)::int\`` paginated-log
//             idiom (`getGraduationEvents`, mirrored by `getCapabilityAdoptions` below)).
//             — P3-G C10 — 2026-07-23
//
// `BudgetsHorizonAdminController` — the 7 NEW production BO routes for the P3-G ch06 Budgets & Horizon
// surface (design §14; the 8th row, `PUT tunables/meta-progression`, is P3-F's EXISTING route, key-list
// REUSE only — no code here):
//
//   GET   /v1/admin/players/:id/horizon                      — role gm    — TRUE state: EVERY horizon card
//                                                                            (all statuses incl. dismissed,
//                                                                            full predicate snapshots) PLUS
//                                                                            the "why doesn't this surface"
//                                                                            diagnostic — per-clause LIVE
//                                                                            values for EVERY LIVE
//                                                                            capability, surfaced or not
//                                                                            (canon's evaluation-log READ
//                                                                            half, divergence #14).
//   GET   /v1/admin/players/:id/complexity-budget             — role gm    — cap/used/free_units + the
//                                                                            per-category cost breakdown
//                                                                            (P5 inversion of the player's
//                                                                            folded `used` scalar).
//   GET   /v1/admin/meta/capability-adoptions                 — role gm    — paginated adoption log,
//                                                                            filters player/capability
//                                                                            (canon unlock-events audit).
//   GET   /v1/admin/meta/capability-debts                     — role gm    — raw structural_debt/capacity/
//                                                                            decay_path per player ×
//                                                                            capability (optional player_id
//                                                                            filter) + bucket distribution
//                                                                            per cohort (canon miscalibration
//                                                                            signal — REUSE
//                                                                            `computePenaltyBucket`, never a
//                                                                            re-derived cut-point).
//   GET   /v1/admin/meta/vocab-tier-distribution               — role gm    — T1..T6 histogram (canon
//                                                                            `VocabTierDashboard` data).
//   POST  /v1/admin/meta/capability-debt/force-clear           — role admin, f3_deferred, audited — canon
//                                                                            force-clear (support/
//                                                                            compensation, `isostatic_debt.
//                                                                            md:262`); emits the SAME
//                                                                            `CapabilityDebtClearedEvent` an
//                                                                            organic clearing does.
//   PATCH /v1/admin/players/:id/complexity-budget-cap          — role admin, f3_deferred, audited — the D1
//                                                                            per-player cap override (the
//                                                                            column IS the cap — divergence
//                                                                            #18); returns the fresh
//                                                                            recompute-read projection (the
//                                                                            value-sensitivity proof surface
//                                                                            for the cap).
//
// P5 BO INVERSION (R2.2): `horizon`/`complexity-budget`/`capability-debts` above return the RAW
//   server-only scalars the player-facing `HorizonFeedController`/`ComplexityBudgetController`/
//   `CapabilityDebtsController` deliberately bucket/omit away (§13's own forbidden list:
//   `structural_debt`, `capacity`, `complexity_budget_used`, un-surfaced predicate sets, cost constants
//   beyond `free_units`/`cap`/"requires N") — these raw scalars are NEVER forwarded to any player-facing
//   endpoint (the leak-scan `ALLOWED_KEYS` allow-lists in `tests/e2e/meta_progression/r2_projections_leak_
//   sweep.spec.ts` prove the player side stays clean; this file is the deliberate BO-only inversion of
//   that same wall — mirrors `MetaProgressionAdminController`'s own P5 BO INVERSION header verbatim).
//
// F3 two-person-rule: DEFERRED (TD-107 join, decisions §1.14 precedent — "the honest marker, no invented
//   approval flow"). Both mutation endpoints (`force-clear`, `complexity-budget-cap`) are gated by
//   `requireStaffRole('admin')` ONLY until F3 lands; their responses carry `f3_deferred: true`.
//
// requireStaffRole is NON-SPOOFABLE: the role is extracted from the JWT bearer token via server-side HS256
//   verification (`auth/staff-role.guard.ts`) — an `x-staff-role` header is NEVER read.
//
// AUDIT (R9.3 — REUSE `AdminAuditLogService`, never a parallel audit path): every mutation endpoint writes
//   exactly ONE `admin_audit_log` row per call — the acting staff `account_id` from the VERIFIED JWT, never
//   client-supplied. Every GET above is a read-only diagnostic and does NOT audit (mirrors every sibling
//   BO controller, P3-F's own precedent).
//
// NOT conditional on NODE_ENV — these are real production BO routes (always-on). Registered in
// `BudgetsHorizonModule.controllers` (alongside the conditional `BudgetsHorizonTestController`).

import { Body, Controller, Get, HttpCode, Inject, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';

import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { ApiError } from '../protocol/api-error';
import { requireStaffRole } from '../auth/staff-role.guard';
import type { RequestWithAccount } from '../auth/authenticated-request';
import { AdminAuditLogService } from '../db/admin-audit-log.service';
import { playerProgressionState } from '../db/schema/player_progression_state';
import { capabilityDebt } from '../db/schema/budgets_horizon';
import { ProgressionRepository } from '../progression/progression.repository';
import { MasteryScoreRepository } from './mastery-score.repository';
import { CAPABILITY_CATALOGUE, CapabilityKey, capabilityCatalogueEntryForCode, capabilityCatalogueEntryFor } from './capability-catalogue';
import { HorizonPredicateEvaluatorService } from './horizon-predicate-evaluator.service';
import { PossibilityHorizonCardsRepository } from './possibility-horizon-cards.repository';
import { ComplexityBudgetRepository } from './complexity-budget.repository';
import { BudgetRecomputeService } from './budget-recompute.service';
import { computeUsedBreakdown } from './budget-cost';
import { CapabilityAdoptionsRepository } from './capability-adoptions.repository';
import { CapabilityDebtsRepository } from './capability-debts.repository';
import { IsostaticDebtService } from './isostatic-debt.service';
import { computePenaltyBucket, type PenaltyBucket } from './penalty-bucket';

const ADOPTIONS_DEFAULT_LIMIT = 20;
const ADOPTIONS_MAX_LIMIT = 100;

/** REUSE `MetaProgressionAdminController`'s exact clamp shape (design §14's own "paginated" mandate for
 *  `capability-adoptions`) — never a re-derived pagination convention. */
function clampLimit(limitParam: string | undefined): number {
  const parsed = Number.parseInt(limitParam ?? '', 10);
  return Number.isNaN(parsed) ? ADOPTIONS_DEFAULT_LIMIT : Math.min(Math.max(parsed, 1), ADOPTIONS_MAX_LIMIT);
}
function clampOffset(offsetParam: string | undefined): number {
  const parsed = Number.parseInt(offsetParam ?? '', 10);
  return Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
}

/** Resolve a `capabilityKey` query/body string against the closed catalogue — 422 on anything not a
 *  member of `CapabilityKey` (never a silent `undefined`/NaN code lookup). */
function resolveCapabilityKey(raw: unknown): CapabilityKey {
  const known = Object.values(CapabilityKey) as string[];
  if (typeof raw !== 'string' || !known.includes(raw)) {
    throw new ApiError('VALIDATION_FAILED', { message: `Unknown capabilityKey: '${String(raw)}' (must be one of ${known.join(', ')}).` });
  }
  return raw as CapabilityKey;
}

// ─── Response shapes (BO-only — raw, P5-inverted; never round-tripped through a player-facing type) ────

interface AdminHorizonCardRow {
  card_id: string;
  capability_id: number;
  capability_key: CapabilityKey;
  view_status: string;
  predicate_regressed: boolean;
  surfaced_predicate_snapshot: unknown;
  surfaced_at: Date;
  adopted_at: Date | null;
  dismissed_at: Date | null;
}

interface AdminCapabilityDiagnosticClause {
  type: string;
  threshold: number;
  satisfied: boolean;
  actual: number;
}

interface AdminCapabilityDiagnostic {
  capability_code: number;
  capability_key: CapabilityKey;
  all_satisfied: boolean;
  clauses: AdminCapabilityDiagnosticClause[];
}

interface AdminDebtRowView {
  playerId: string;
  capabilityId: number;
  capabilityKey: CapabilityKey;
  capacity: number;
  structuralDebt: number;
  decayPath: string;
  lastUpgradeTick: number | null;
  lastDecayTick: number | null;
}

// ─── Controller ──────────────────────────────────────────────────────────────────────────────────────

/**
 * `BudgetsHorizonAdminController` — production BO routes for the P3-G ch06 Budgets & Horizon surface
 * (design §14).
 *
 * Path prefix: `admin` — with the global `v1` prefix from main.ts → routes at
 * `/v1/admin/players/:id/horizon`, `/v1/admin/players/:id/complexity-budget`,
 * `/v1/admin/meta/capability-adoptions`, `/v1/admin/meta/capability-debts`,
 * `/v1/admin/meta/vocab-tier-distribution`, `/v1/admin/meta/capability-debt/force-clear`,
 * `/v1/admin/players/:id/complexity-budget-cap`.
 *
 * NOT conditional on NODE_ENV — real production BO routes always-on. Registered in
 * `BudgetsHorizonModule.controllers` (alongside the conditional `BudgetsHorizonTestController`).
 */
@Controller('admin')
export class BudgetsHorizonAdminController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly auditLog: AdminAuditLogService,
    private readonly progressionRepo: ProgressionRepository,
    private readonly masteryScoreRepo: MasteryScoreRepository,
    private readonly predicateEvaluator: HorizonPredicateEvaluatorService,
    private readonly cardsRepo: PossibilityHorizonCardsRepository,
    private readonly budgetRepo: ComplexityBudgetRepository,
    private readonly budgetRecompute: BudgetRecomputeService,
    private readonly adoptionsRepo: CapabilityAdoptionsRepository,
    private readonly debtsRepo: CapabilityDebtsRepository,
    private readonly isostaticDebt: IsostaticDebtService,
  ) {}

  // ─── GET /admin/players/:id/horizon — TRUE state + "why doesn't this surface" diagnostic (role `gm`) ──

  /**
   * `GET /v1/admin/players/:id/horizon`
   *
   * `cards`: EVERY `possibility_horizon_cards` row for this player, ANY status (incl. `adopted`/
   * `dismissed` — `PossibilityHorizonCardsRepository.listAllForPlayer`, the SAME read C3/C4 already
   * establish, no new query surface), with the FULL `surfaced_predicate_snapshot` (the frozen-at-surface
   * verdict, design §7.3) — never bucketed, never omitted.
   *
   * `diagnostics`: for EVERY LIVE `CAPABILITY_CATALOGUE` entry (not just already-surfaced ones — this IS
   * the "why doesn't this surface" answer for an un-surfaced capability, plan C10 falsifiable 2), a FRESH
   * re-evaluation (`HorizonPredicateEvaluatorService.evaluateCapabilityWithActuals` — the SAME authoritative
   * dispatch the player-facing `visible_predicates` selection uses) with the RAW `actual` value per clause
   * (§13's own forbidden field, present HERE by design — the deliberate BO-only inversion).
   *
   * Role: `gm` (ops diagnostic surface, no mutation).
   */
  @Get('players/:id/horizon')
  @UseGuards(requireStaffRole('gm'))
  async getPlayerHorizon(@Param('id') playerId: string): Promise<{ cards: AdminHorizonCardRow[]; diagnostics: AdminCapabilityDiagnostic[] }> {
    const rows = await this.cardsRepo.listAllForPlayer(playerId);
    const cards: AdminHorizonCardRow[] = rows.map((row) => ({
      card_id: row.card_id,
      capability_id: row.capability_id,
      capability_key: capabilityCatalogueEntryForCode(row.capability_id).key,
      view_status: row.view_status,
      predicate_regressed: row.predicate_regressed,
      surfaced_predicate_snapshot: row.surfaced_predicate_snapshot,
      surfaced_at: row.surfaced_at,
      adopted_at: row.adopted_at,
      dismissed_at: row.dismissed_at,
    }));

    const liveEntries = CAPABILITY_CATALOGUE.filter((e) => e.live);
    const diagnostics = await Promise.all(
      liveEntries.map(async (entry): Promise<AdminCapabilityDiagnostic> => {
        const clauses = await this.predicateEvaluator.evaluateCapabilityWithActuals(playerId, entry);
        return {
          capability_code: entry.code,
          capability_key: entry.key,
          all_satisfied: clauses.every((c) => c.satisfied),
          clauses: clauses.map((c) => ({ type: c.type, threshold: c.threshold, satisfied: c.satisfied, actual: c.actual })),
        };
      }),
    );

    return { cards, diagnostics };
  }

  // ─── GET /admin/players/:id/complexity-budget — P5 inversion (role `gm`) ───────────────────────────────

  /**
   * `GET /v1/admin/players/:id/complexity-budget`
   *
   * `cap`/`used`/`free_units` (the SAME `getCap`/`computeUsed` sources the player-facing projection reads —
   * never a second, independently-maintained cost model) PLUS `breakdown`: the itemized per-LIVE-task-
   * category cost row (`computeUsedBreakdown` — design §14's own "per-category cost breakdown", the raw P5
   * inversion of the player's folded `used` scalar). `Σ breakdown[].cost === used` by construction.
   *
   * Role: `gm` (ops diagnostic surface, no mutation).
   */
  @Get('players/:id/complexity-budget')
  @UseGuards(requireStaffRole('gm'))
  async getPlayerComplexityBudget(@Param('id') playerId: string) {
    const ctx = { masteryScoreRepo: this.masteryScoreRepo };
    const [cap, breakdown] = await Promise.all([this.budgetRepo.getCap(playerId), computeUsedBreakdown(ctx, playerId)]);
    const used = breakdown.reduce((sum, row) => sum + row.cost, 0);
    return { cap, used, free_units: cap - used, breakdown };
  }

  // ─── GET /admin/meta/capability-adoptions — paginated adoption log (role `gm`) ──────────────────────────

  /**
   * `GET /v1/admin/meta/capability-adoptions?playerId=&capabilityKey=&limit=&offset=`
   *
   * The append-only `capability_adoptions` spine (design §3), newest-first, paginated (`limit` default 20 /
   * max 100, `offset` default 0 — REUSE `MetaProgressionAdminController.getGraduationEvents`'s exact clamp
   * shape). `capabilityKey`, if present, MUST resolve against the closed `CapabilityKey` catalogue (422
   * otherwise, never silently ignored).
   *
   * Role: `gm` (canon unlock-events audit endpoint, no mutation).
   */
  @Get('meta/capability-adoptions')
  @UseGuards(requireStaffRole('gm'))
  async getCapabilityAdoptions(
    @Query('playerId') playerId: string | undefined,
    @Query('capabilityKey') capabilityKeyParam: string | undefined,
    @Query('limit') limitParam: string | undefined,
    @Query('offset') offsetParam: string | undefined,
  ) {
    const capabilityId = capabilityKeyParam !== undefined ? capabilityCatalogueEntryFor(resolveCapabilityKey(capabilityKeyParam)).code : undefined;
    const limit = clampLimit(limitParam);
    const offset = clampOffset(offsetParam);

    const { rows, total } = await this.adoptionsRepo.listAll({ playerId, capabilityId }, limit, offset);
    return {
      adoptions: rows.map((r) => ({
        playerId: r.player_id,
        capabilityId: r.capability_id,
        capabilityKey: capabilityCatalogueEntryForCode(r.capability_id).key,
        adoptedAt: r.adopted_at,
        cardId: r.card_id,
        freeUnitsAtAdoption: r.free_units_at_adoption,
        gameTick: r.game_tick,
      })),
      total,
      limit,
      offset,
    };
  }

  // ─── GET /admin/meta/capability-debts — raw + bucket distribution per cohort (role `gm`) ───────────────

  /**
   * `GET /v1/admin/meta/capability-debts?playerId=`
   *
   * `debts`: RAW `structural_debt`/`capacity`/`decay_path`/tick columns — the P5 inversion of the player-
   * facing `GET /v1/meta/capability-debts` bucket-only projection (`CapabilityDebtsRepository.
   * listAllForAdmin`, NO visibility threshold — every row, sub-threshold included). Optionally filtered to
   * one player.
   *
   * `bucketDistribution`: cross-cohort histogram per LIVE capability (`NONE`/`MILD`/`MODERATE`/`SEVERE` —
   * REUSE `computePenaltyBucket`, the SAME derivation the player projection uses, never a re-derived cut-
   * point), ALWAYS unfiltered (the whole cohort, canon miscalibration signal — mirrors
   * `MetaProgressionAdminController.getMasteryDistribution`'s own cross-player histogram shape). Both
   * `debts` and `bucketDistribution` derive from ONE unfiltered `listAllForAdmin()` call (never two DB
   * round-trips for the SAME row set).
   *
   * Role: `gm` (ops diagnostic surface, no mutation).
   */
  @Get('meta/capability-debts')
  @UseGuards(requireStaffRole('gm'))
  async getCapabilityDebts(@Query('playerId') playerId: string | undefined) {
    const allRows = await this.debtsRepo.listAllForAdmin();
    const debts: AdminDebtRowView[] = (playerId ? allRows.filter((r) => r.playerId === playerId) : allRows).map((r) => ({
      playerId: r.playerId,
      capabilityId: r.capabilityId,
      capabilityKey: capabilityCatalogueEntryForCode(r.capabilityId).key,
      capacity: r.capacity,
      structuralDebt: r.structuralDebt,
      decayPath: r.decayPath,
      lastUpgradeTick: r.lastUpgradeTick,
      lastDecayTick: r.lastDecayTick,
    }));

    const liveEntries = CAPABILITY_CATALOGUE.filter((e) => e.live);
    const bucketDistribution: Record<string, Record<PenaltyBucket, number>> = {};
    for (const entry of liveEntries) {
      bucketDistribution[entry.key] = { NONE: 0, MILD: 0, MODERATE: 0, SEVERE: 0 };
    }
    for (const row of allRows) {
      const key = capabilityCatalogueEntryForCode(row.capabilityId).key;
      if (!bucketDistribution[key]) continue; // RESERVED capability row (never adopted on this base — defensive).
      bucketDistribution[key][computePenaltyBucket(row.structuralDebt)] += 1;
    }

    return { debts, bucketDistribution };
  }

  // ─── GET /admin/meta/vocab-tier-distribution — T1..T6 histogram (role `gm`) ─────────────────────────────

  /**
   * `GET /v1/admin/meta/vocab-tier-distribution`
   *
   * `player_progression_state.rule_vocabulary_tier` histogram, over EVERY row that exists (mirrors
   * `getMasteryDistribution`'s own "every player WITH a row" convention — never a full `player` table
   * scan; a player with no row yet is implicitly T1 but contributes nothing here until a row materializes,
   * the SAME honest convention `mastery-distribution` establishes for `mastery_score`).
   *
   * Role: `gm` (canon `VocabTierDashboard` data, no mutation).
   */
  @Get('meta/vocab-tier-distribution')
  @UseGuards(requireStaffRole('gm'))
  async getVocabTierDistribution() {
    const rows = await this.db
      .select({ tier: playerProgressionState.rule_vocabulary_tier, count: sql<number>`count(*)::int` })
      .from(playerProgressionState)
      .groupBy(playerProgressionState.rule_vocabulary_tier)
      .orderBy(asc(playerProgressionState.rule_vocabulary_tier));
    return { distribution: rows.map((r) => ({ tier: r.tier, count: Number(r.count) })) };
  }

  // ─── POST /admin/meta/capability-debt/force-clear — support override (role `admin`, F3 DEFERRED, audited) ─

  /**
   * `POST /v1/admin/meta/capability-debt/force-clear`
   *
   * Body: `{ playerId, capabilityKey }`. Unknown `capabilityKey` → 422. No `capability_debts` row for this
   * (player, capability) pair → 404. Row exists but `structural_debt <= 0` already → 409 (mirrors
   * `MetaProgressionAdminController.forceCloseWindow`'s own pre-read-for-404/409 + atomic-conditional-write
   * "force" mutation shape verbatim). The atomic write itself (`IsostaticDebtService.forceClear` →
   * `CapabilityDebtsRepository#forceClear`) is the SAME floor-guarded single statement `applyActiveDecay`/
   * `applyPassiveDecayBatch` use — a genuine concurrent racer (the HOURLY tick, or a duplicate force-clear)
   * between the pre-read above and the atomic write reports the SAME honest 409, TOCTOU-zero (this request
   * did not cause the clear, so it never claims credit for — or double-audits — a transition it did not
   * win).
   *
   * Emits the SAME `CapabilityDebtClearedEvent` shape organic clearing does (see `IsostaticDebtService.
   * forceClear`'s own header for the narrow, documented `decay_path='NONE'` edge — no event, honest
   * silence, the debt is still cleared).
   *
   * Returns: `{ playerId, capabilityKey, cleared: true, decayPath, f3_deferred: true }`. Role: `admin`.
   */
  @Post('meta/capability-debt/force-clear')
  @HttpCode(200)
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD-107 join, decisions §1.14 precedent).
  @UseGuards(requireStaffRole('admin'))
  async forceClearDebt(
    @Body() body: { playerId?: string; capabilityKey?: string },
    @Req() req: RequestWithAccount,
  ): Promise<{ playerId: string; capabilityKey: CapabilityKey; cleared: true; decayPath: string; f3_deferred: true }> {
    const playerId = body?.playerId;
    if (!playerId) {
      throw new ApiError('VALIDATION_FAILED', { message: 'playerId is required.' });
    }
    const capabilityKey = resolveCapabilityKey(body?.capabilityKey);
    const capabilityId = capabilityCatalogueEntryFor(capabilityKey).code;

    const [preRead] = await this.db
      .select({ structural_debt: capabilityDebt.structural_debt })
      .from(capabilityDebt)
      .where(and(eq(capabilityDebt.player_id, playerId), eq(capabilityDebt.capability_id, capabilityId)))
      .limit(1);
    if (!preRead) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `No capability_debts row for player=${playerId} capability=${capabilityKey}.` });
    }
    if (Number(preRead.structural_debt) <= 0) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', { message: `capability_debts for player=${playerId} capability=${capabilityKey} is already 0.` });
    }

    const result = await this.isostaticDebt.forceClear(playerId, capabilityId);
    if (!result.cleared) {
      // A concurrent transition (the HOURLY tick, an active-decay event, or a duplicate force-clear) won
      // the race between the pre-read above and the atomic UPDATE — the SAME honest 409, never a claim of
      // credit (see header).
      throw new ApiError('RESOURCE_STATE_CONFLICT', { message: `capability_debts for player=${playerId} capability=${capabilityKey} is already 0.` });
    }

    await this.auditLog.emit({
      adminUserId: req.account!.account_id,
      actionType: 'UPDATE',
      targetPlayerId: playerId,
      targetEntityType: 'capability_debt',
      targetEntityId: null,
      beforeState: { capabilityKey, structuralDebt: Number(preRead.structural_debt) },
      afterState: { capabilityKey, structuralDebt: 0, decayPath: result.decayPath },
    });

    return { playerId, capabilityKey, cleared: true, decayPath: result.decayPath, f3_deferred: true as const };
  }

  // ─── PATCH /admin/players/:id/complexity-budget-cap — the D1 BO override (role `admin`, F3 DEFERRED, audited) ─

  /**
   * `PATCH /v1/admin/players/:id/complexity-budget-cap`
   *
   * Body: `{ cap: number }`. `cap` MUST be a non-negative integer (422 `VALIDATION_FAILED` otherwise — a
   * basic input-sanity guard, NOT a fabricated `meta.*` tunable range: divergence #18 is explicit that no
   * runtime tunable exists for this column, "the COLUMN is the cap"). `ProgressionRepository.ensureRow`
   * first (the SAME "guarantee a row before the single-statement UPDATE" discipline `BudgetRecomputeService.
   * recompute` and `budget_recompute.spec.ts`'s own cap-sensitivity fixture both already establish for this
   * table) then `ComplexityBudgetRepository.setCap` — ONE atomic UPDATE, no read-then-write.
   *
   * Returns the FRESH recompute-read projection (`BudgetRecomputeService.getProjection` — `used` is
   * recomputed fresh, never stale) — the value-sensitivity proof surface for the cap (plan C10 falsifiable
   * 3: patch 100→80 drops `free_units` by 20 AND flips a previously-affordable card unaffordable, observed
   * through the REAL player-facing `GET /v1/meta/horizon-feed`/`GET /v1/meta/complexity-budget` next call).
   *
   * Role: `admin`.
   */
  @Patch('players/:id/complexity-budget-cap')
  @UseGuards(requireStaffRole('admin'))
  async patchComplexityBudgetCap(@Param('id') playerId: string, @Body() body: { cap?: number }, @Req() req: RequestWithAccount) {
    const cap = body?.cap;
    if (typeof cap !== 'number' || !Number.isInteger(cap) || cap < 0) {
      throw new ApiError('VALIDATION_FAILED', { message: `cap must be a non-negative integer (got '${String(cap)}').` });
    }

    const before = await this.budgetRepo.getCap(playerId);
    await this.progressionRepo.ensureRow(playerId);
    await this.budgetRepo.setCap(playerId, cap);

    await this.auditLog.emit({
      adminUserId: req.account!.account_id,
      actionType: 'UPDATE',
      targetPlayerId: playerId,
      targetEntityType: 'complexity_budget_cap',
      targetEntityId: null,
      beforeState: { cap: before },
      afterState: { cap },
    });

    const projection = await this.budgetRecompute.getProjection(playerId);
    return { ...projection, f3_deferred: true as const };
  }
}
