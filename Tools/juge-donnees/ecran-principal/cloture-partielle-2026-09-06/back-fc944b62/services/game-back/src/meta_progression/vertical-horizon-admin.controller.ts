// IMPLEMENTS: docs/superpowers/plans/2026-07-24-p3-H-vertical-horizon-plan.md C9 ("BO surface +
//             program-wide P5 inversion sweep" — admin endpoints: design §11's 3 player-state GETs + 2
//             distribution GETs + horizon/pressure force-advance/force-set POSTs + the P3-F/G tunables PUT
//             extended (zero code here — REUSE, unchanged); `requireStaffRole('gm')`/`'admin'` split,
//             `f3_deferred`, `AdminAuditLogService` REUSE).
//             Design: docs/superpowers/specs/2026-07-24-p3-H-vertical-horizon-design.md §11 (BO surface,
//             the 8-row endpoint table).
//             C0-reanchor: docs/superpowers/specs/2026-07-24-p3-H-C0-reanchor.md §15/R14 ("a sibling
//             `VerticalHorizonAdminController` inside `VerticalHorizonModule`'s own `controllers[]`, NOT an
//             extension of any existing controller" — the definitive R14 recommendation this file follows
//             verbatim, mirrors the P3-G precedent `BudgetsHorizonAdminController` doubly re-confirms).
//             Pattern (structure, guards, audit, f3_deferred convention — mirrored verbatim):
//             `budgets-horizon-admin.controller.ts` (P3-G C10 — `requireStaffRole('gm')`/`'admin'` split,
//             the pre-read-for-404/409 + atomic-conditional-write "force" mutation shape, `AdminAuditLogService.
//             emit` convention).
//             — P3-H C9 — 2026-07-25
//
// ★ DISCLOSED ROUTE-PATH DIVERGENCE (decisions §4, appended #15 — NONE-SILENT): design §11's literal path
//   for the FIRST GET row ("GET /v1/admin/players/:id/horizon") COLLIDES with the ALREADY-SHIPPED P3-G
//   `BudgetsHorizonAdminController#getPlayerHorizon` (`budgets-horizon-admin.controller.ts:228`,
//   `@Get('players/:id/horizon')`, registered under the SAME `@Controller('admin')` prefix, its OWNING
//   module imported BEFORE `VerticalHorizonModule` in `app.module.ts`) — a genuine, exact {method,path}
//   duplicate (grep-verified this chunk: `players/:id/horizon` had exactly ONE prior hit repo-wide, THAT
//   one). Registering the SAME route a second time would make P3-H's own handler permanently unreachable
//   (Express/Nest resolves to the FIRST-registered match; the SECOND is silently dead code) — breaking the
//   ★ headline P5-inversion falsifiable this route exists to prove. None of the C0-reanchor's R1-R14
//   reserves caught this (R14 verified the CONTROLLER-vs-extend shape, not the literal path string against
//   P3-G's shipped surface). Realized here as `GET /v1/admin/players/:id/decision-horizon` — drawn directly
//   from the mechanic's OWN canonical name used everywhere else in this lot (`decision_horizon_tier`, the
//   `decision_horizon_lock.md` chapter title, the design's OWN `<DecisionHorizonDashboard>` SFC name,
//   §11) — a pure path-string disambiguation, ZERO change to the endpoint's role/response contract/
//   semantics. A no-gating-on-obvious-defaults call (the fix is mechanical, not a product/balance
//   judgment); flagged here + in the decisions doc for the ⊥ reviewer.
//
// `VerticalHorizonAdminController` — the 7 NEW production BO routes for the P3-H ch06 Vertical Horizon
// surface (design §11; the 8th row, `PUT tunables/meta-progression`, is P3-F's EXISTING route, key-list
// REUSE only — DD-H5, no code here, the SAME REUSE posture DD-G5 already establishes for P3-G's own keys):
//
//   GET   /v1/admin/players/:id/decision-horizon     — role gm    — TRUE state (★ the P5 inversion
//                                                                    headline): `decision_horizon_tier`,
//                                                                    EVERY plan (any lieutenant, any
//                                                                    status) with RAW slots (incl.
//                                                                    `deviation_record`/`committed_action_
//                                                                    ref`/`expected_constraints`), RAW
//                                                                    `script_stability_counters` rows per
//                                                                    lieutenant.
//   GET   /v1/admin/players/:id/pressure             — role gm    — `pressure_tier`, RAW `graduation_
//                                                                    count_since_last_pressure_unlock`, the
//                                                                    RAW `tier4_observation_until_tick`
//                                                                    timestamp, the enforced-cap resolution
//                                                                    (`structuralCapForPlayer` + used +
//                                                                    remaining — the D7 diagnostic).
//   GET   /v1/admin/players/:id/benchmark            — role gm    — RAW `player_metric_benchmarks` rows
//                                                                    (`baseline_value`/`drift_accumulator`
//                                                                    exact, `baseline_source`/`last_auto_
//                                                                    update_tick` — the closest honest
//                                                                    realization of "silent-invalidation
//                                                                    log" this substrate carries, see
//                                                                    below) + the RAW `player_reanchor_
//                                                                    quotas` row.
//   GET   /v1/admin/meta/horizon-tier-distribution    — role gm    — T1..T3 histogram (canon
//                                                                    `DecisionHorizonDashboard` data).
//   GET   /v1/admin/meta/pressure-tier-distribution   — role gm    — T1..T4 histogram + a budget-
//                                                                    exhaustion rate (canon
//                                                                    `PressureInverseDashboard` data).
//   POST  /v1/admin/meta/horizon-tier/force-advance   — role admin, f3_deferred, audited — canon
//                                                                    force-advance (compensation/debug);
//                                                                    emits the SAME `HorizonTierAdvancedEvent`
//                                                                    shape an organic advance does.
//   POST  /v1/admin/meta/pressure-tier/force-set      — role admin, f3_deferred, audited — pressure tier
//                                                                    override (compensation/debug) — the D7
//                                                                    value-sensitivity surface (set tier,
//                                                                    observe the REAL cap collapse).
//   PUT   /v1/admin/tunables/meta-progression         — role admin, f3_deferred, audited — REUSE the
//                                                                    P3-F/G endpoint — the registry already
//                                                                    carries the P3-H C1 `meta.*` keys, zero
//                                                                    handler change (seam §2 row 11,
//                                                                    C0-reanchor confirmed).
//
// ★ HONEST GAP (the benchmark GET's own "silent-invalidation log" / "lagging reveals" framing, design §11):
//   no persisted append-only event-log table exists for `BaselineAutoUpdatedEvent`/`LaggingIndicatorRevealedEvent`
//   (mig 0141 ships exactly 5 tables, none an event journal — DD-H4, no NEW migration authorized at C9). The
//   RAW `player_metric_benchmarks` row's OWN provenance stamp (`baseline_source`/`last_auto_update_tick`) IS
//   the closest honest realization the substrate carries — it answers "did this metric's baseline last move
//   via AUTO_UPDATE, and when" for the CURRENT row, but is NOT a full historical log (each row holds only its
//   OWN latest transition, never a list of every past crossing). A full log is a named TD (ch20 telemetry
//   export, decisions §5) — never fabricated here.
//
// P5 BO INVERSION (R2.2): `players/:id/decision-horizon`/`players/:id/pressure`/`players/:id/benchmark`
//   above return the RAW server-only scalars the player-facing `ExecutionPlanController#listTimeline`/
//   `PressureTierController#getPressure`/`BenchmarkDriftController#getBenchmark` deliberately bucket/omit
//   away (design §10's own forbidden list: `consecutive_no_deviation_cycles` raw, `drift_accumulator` raw
//   pct, `baseline_value`, `deviation_severity` internals, un-surfaced `expected_constraints`) — these raw
//   scalars are NEVER forwarded to any player-facing endpoint (`vertical_horizon_projections_leak_sweep.
//   spec.ts`'s own ALLOWED_KEYS scanner, C8, proves the player side stays clean; this file is the
//   deliberate BO-only inversion of that same wall — mirrors `BudgetsHorizonAdminController`'s own P5 BO
//   INVERSION header verbatim).
//
// F3 two-person-rule: DEFERRED (TD-107 join, the SAME honest-marker precedent every sibling admin
//   controller in this codebase follows). Both mutation endpoints (`force-advance`, `force-set`) are gated
//   by `requireStaffRole('admin')` ONLY until F3 lands; their responses carry `f3_deferred: true`.
//
// requireStaffRole is NON-SPOOFABLE: the role is extracted from the JWT bearer token via server-side HS256
//   verification (`auth/staff-role.guard.ts`) — an `x-staff-role` header is NEVER read.
//
// AUDIT (R9.3 — REUSE `AdminAuditLogService`, never a parallel audit path): every mutation endpoint writes
//   exactly ONE `admin_audit_log` row per call — the acting staff `account_id` from the VERIFIED JWT, never
//   client-supplied. Every GET above is a read-only diagnostic and does NOT audit (mirrors every sibling BO
//   controller).
//
// NOT conditional on NODE_ENV — these are real production BO routes (always-on). Registered in
// `VerticalHorizonModule.controllers`.

import { Body, Controller, Get, HttpCode, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { asc, sql } from 'drizzle-orm';

import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { ApiError } from '../protocol/api-error';
import { requireStaffRole } from '../auth/staff-role.guard';
import type { RequestWithAccount } from '../auth/authenticated-request';
import { AdminAuditLogService } from '../db/admin-audit-log.service';
import { playerProgressionState } from '../db/schema/player_progression_state';
import { coreLoopsTunables } from '../core_loops/core-loops-tunables';
import { ProgressionRepository } from '../progression/progression.repository';
import { ExecutionPlansRepository } from './execution-plans.repository';
import { ScriptStabilityCountersRepository } from './script-stability-counters.repository';
import { PlayerMetricBenchmarksRepository } from './player-metric-benchmarks.repository';
import { PlayerReanchorQuotasRepository } from './player-reanchor-quotas.repository';
import { PressureTierService } from './pressure-tier.service';
import { HorizonTierAdvancementService, type AdvanceTierResult } from './horizon-tier-advancement.service';

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ApiError('VALIDATION_FAILED', { message: `${field} must be a non-empty string.` });
  }
  return value;
}

/** `force-set`'s own `tier` validation (1..4, integer — the pps `pressure_tier` domain, mig 0141's own
 *  `pps_pressure_tier_chk`). NEVER trusts the client past this — a value outside the CHECK domain would
 *  fail the DB write anyway, but this reports the honest 422 BEFORE any write is attempted. */
function requirePressureTier(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 4) {
    throw new ApiError('VALIDATION_FAILED', { message: `tier must be an integer in 1..4 (got '${String(value)}').` });
  }
  return value;
}

// ─── Response shapes (BO-only — raw, P5-inverted; never round-tripped through a player-facing type) ────

interface AdminSlotView {
  slot_id: string;
  slot_index: number;
  cycle_tick: number;
  committed_action_ref: unknown;
  expected_constraints: unknown;
  slot_status: string;
  deviation_record: unknown;
}

interface AdminPlanView {
  plan_id: string;
  lieutenant_id: string;
  standing_order_id: string;
  execution_window: number;
  deviation_rule: string;
  deviation_threshold: string;
  plan_status: string;
  created_at_tick: number;
  abort_recovery_cost_ref: unknown;
  slots: AdminSlotView[];
}

interface AdminStabilityCounterView {
  lieutenant_id: string;
  consecutive_no_deviation_cycles: number;
  tier_target: number | null;
  last_deviation_tick: number | null;
  last_reset_tick: number | null;
}

// ─── Controller ──────────────────────────────────────────────────────────────────────────────────────

/**
 * `VerticalHorizonAdminController` — production BO routes for the P3-H ch06 Vertical Horizon surface
 * (design §11).
 *
 * Path prefix: `admin` — with the global `v1` prefix from main.ts → routes at
 * `/v1/admin/players/:id/decision-horizon`, `/v1/admin/players/:id/pressure`,
 * `/v1/admin/players/:id/benchmark`, `/v1/admin/meta/horizon-tier-distribution`,
 * `/v1/admin/meta/pressure-tier-distribution`, `/v1/admin/meta/horizon-tier/force-advance`,
 * `/v1/admin/meta/pressure-tier/force-set`.
 *
 * NOT conditional on NODE_ENV — real production BO routes always-on. Registered in
 * `VerticalHorizonModule.controllers` (alongside the conditional `VerticalHorizonTestController`).
 */
@Controller('admin')
export class VerticalHorizonAdminController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly auditLog: AdminAuditLogService,
    private readonly progressionRepo: ProgressionRepository,
    private readonly plansRepo: ExecutionPlansRepository,
    private readonly counterRepo: ScriptStabilityCountersRepository,
    private readonly benchmarksRepo: PlayerMetricBenchmarksRepository,
    private readonly quotaRepo: PlayerReanchorQuotasRepository,
    private readonly pressureTier: PressureTierService,
    private readonly horizonTierAdvancement: HorizonTierAdvancementService,
  ) {}

  // ─── GET /admin/players/:id/decision-horizon — ★ TRUE state, the P5 inversion headline (role `gm`) ────

  /**
   * `GET /v1/admin/players/:id/decision-horizon`
   *
   * `decision_horizon_tier`: the player-shared tier (D1), the SAME `ProgressionRepository.
   * getDecisionHorizonTier` read the player-facing timeline GET consumes.
   *
   * `plans`: EVERY `execution_plans` row for this player, ANY lieutenant, ANY status
   * (`ExecutionPlansRepository.listAllForPlayer`, C9 — NEVER filtered to one lieutenant, unlike the
   * player-facing `GET .../execution-plans?lieutenant_id=`), with EVERY slot's RAW `committed_action_ref`/
   * `expected_constraints`/`deviation_record` — never player-walled (§10/D15's own R2.2 wall applies ONLY
   * to `ExecutionPlanService#projectPlan`, C2; this admin read bypasses that projection entirely, the
   * deliberate BO-only inversion).
   *
   * `stability_counters`: EVERY `script_stability_counters` row for this player, ANY lieutenant
   * (`ScriptStabilityCountersRepository.listAllForPlayer`, C9) — RAW `consecutive_no_deviation_cycles`,
   * never the derived `StabilityBucketEnum` the player-facing timeline GET shows instead for the ONE
   * lieutenant it was queried with.
   *
   * Role: `gm` (ops diagnostic surface, no mutation).
   */
  @Get('players/:id/decision-horizon')
  @UseGuards(requireStaffRole('gm'))
  async getPlayerDecisionHorizon(
    @Param('id') playerId: string,
  ): Promise<{ decision_horizon_tier: number; plans: AdminPlanView[]; stability_counters: AdminStabilityCounterView[] }> {
    const [tier, planRows, counterRows] = await Promise.all([
      this.progressionRepo.getDecisionHorizonTier(playerId),
      this.plansRepo.listAllForPlayer(playerId),
      this.counterRepo.listAllForPlayer(playerId),
    ]);

    const plans: AdminPlanView[] = planRows.map(({ plan, slots }) => ({
      plan_id: plan.plan_id,
      lieutenant_id: plan.lieutenant_id,
      standing_order_id: plan.standing_order_id,
      execution_window: plan.execution_window,
      deviation_rule: plan.deviation_rule,
      deviation_threshold: plan.deviation_threshold,
      plan_status: plan.plan_status,
      created_at_tick: plan.created_at_tick,
      abort_recovery_cost_ref: plan.abort_recovery_cost_ref,
      slots: slots.map((s) => ({
        slot_id: s.slot_id,
        slot_index: s.slot_index,
        cycle_tick: s.cycle_tick,
        committed_action_ref: s.committed_action_ref,
        expected_constraints: s.expected_constraints,
        slot_status: s.slot_status,
        deviation_record: s.deviation_record,
      })),
    }));

    const stability_counters: AdminStabilityCounterView[] = counterRows.map((c) => ({
      lieutenant_id: c.lieutenant_id,
      consecutive_no_deviation_cycles: c.consecutive_no_deviation_cycles,
      tier_target: c.tier_target,
      last_deviation_tick: c.last_deviation_tick,
      last_reset_tick: c.last_reset_tick,
    }));

    return { decision_horizon_tier: tier, plans, stability_counters };
  }

  // ─── GET /admin/players/:id/pressure — RAW ratchet state + the D7 enforced-cap diagnostic (role `gm`) ──

  /**
   * `GET /v1/admin/players/:id/pressure`
   *
   * `pressure_tier`/`graduation_count_since_last_pressure_unlock`/`tier4_observation_until_tick`: the RAW
   * `player_progression_state` pressure columns (`ProgressionRepository.getPressureState`) — the player-
   * facing `GET /v1/meta/pressure` never surfaces the raw graduation count or the raw observation
   * timestamp (only a rounded `observation_remaining_h`, omitted entirely when no window is open).
   *
   * `enforced_cap`/`structural_decisions_this_session`/`decisions_remaining`: the D7 diagnostic — the SAME
   * canonical `structuralCapForPlayer` getter (DD-H2 single-reader-of-truth) the governor itself enforces,
   * alongside the REAL session-scoped usage — the "why is this player's cap what it is" answer.
   *
   * Role: `gm` (ops diagnostic surface, no mutation).
   */
  @Get('players/:id/pressure')
  @UseGuards(requireStaffRole('gm'))
  async getPlayerPressure(@Param('id') playerId: string): Promise<{
    pressure_tier: number;
    graduation_count_since_last_pressure_unlock: number;
    tier4_observation_until_tick: Date | null;
    enforced_cap: number;
    structural_decisions_this_session: number;
    decisions_remaining: number;
  }> {
    const [state, used] = await Promise.all([
      this.progressionRepo.getPressureState(playerId),
      this.progressionRepo.getStructuralDecisionsThisSession(playerId),
    ]);
    const cap = coreLoopsTunables.structuralCapForPlayer(playerId);
    return {
      pressure_tier: state.pressureTier,
      graduation_count_since_last_pressure_unlock: state.graduationCount,
      tier4_observation_until_tick: state.tier4ObservationUntilTick,
      enforced_cap: cap,
      structural_decisions_this_session: used,
      decisions_remaining: Math.max(0, cap - used),
    };
  }

  // ─── GET /admin/players/:id/benchmark — RAW baselines + quota (role `gm`) ──────────────────────────────

  /**
   * `GET /v1/admin/players/:id/benchmark`
   *
   * `metrics`: EVERY `player_metric_benchmarks` row this player holds (`PlayerMetricBenchmarksRepository.
   * listForPlayer` — the SAME raw read the `_test/vertical-horizon/benchmark-raw` probe already uses,
   * reused DIRECTLY here rather than re-derived) — `baseline_value`/`drift_accumulator` EXACT, never the
   * player-facing `DriftBucketEnum` bucket; `baseline_source`/`last_auto_update_tick` are the closest
   * honest realization of "silent-invalidation log" this substrate carries (see this file's own header —
   * no persisted event-log table exists, DD-H4).
   *
   * `quota`: the RAW `player_reanchor_quotas` row (`PlayerReanchorQuotasRepository.readRaw`) — `null` for a
   * player who has never touched benchmark/reanchor (lazy-created on first real touch, the SAME organic-
   * empty posture every sibling repository establishes).
   *
   * Role: `gm` (ops diagnostic surface, no mutation).
   */
  @Get('players/:id/benchmark')
  @UseGuards(requireStaffRole('gm'))
  async getPlayerBenchmark(@Param('id') playerId: string) {
    const [metrics, quota] = await Promise.all([this.benchmarksRepo.listForPlayer(playerId), this.quotaRepo.readRaw(playerId)]);
    return { metrics, quota };
  }

  // ─── GET /admin/meta/horizon-tier-distribution — T1..T3 histogram (role `gm`) ────────────────────────

  /**
   * `GET /v1/admin/meta/horizon-tier-distribution`
   *
   * `player_progression_state.decision_horizon_tier` histogram, over EVERY row that exists (mirrors
   * `MetaProgressionAdminController.getVocabTierDistribution`'s own "every player WITH a row" convention —
   * never a full `player` table scan). Role: `gm` (canon `DecisionHorizonDashboard` data, no mutation).
   */
  @Get('meta/horizon-tier-distribution')
  @UseGuards(requireStaffRole('gm'))
  async getHorizonTierDistribution(): Promise<{ distribution: Array<{ tier: number; count: number }> }> {
    const rows = await this.db
      .select({ tier: playerProgressionState.decision_horizon_tier, count: sql<number>`count(*)::int` })
      .from(playerProgressionState)
      .groupBy(playerProgressionState.decision_horizon_tier)
      .orderBy(asc(playerProgressionState.decision_horizon_tier));
    return { distribution: rows.map((r) => ({ tier: r.tier, count: Number(r.count) })) };
  }

  // ─── GET /admin/meta/pressure-tier-distribution — T1..T4 histogram + exhaustion rate (role `gm`) ──────

  /**
   * `GET /v1/admin/meta/pressure-tier-distribution`
   *
   * `distribution`: `pressure_tier` histogram, ALL 4 domain values ALWAYS present (`0` for an empty band —
   * never a sparse/missing key, the honest "every tier accounted for" shape). `budget_exhaustion_rate`: ★
   * DISCLOSED CODER REALIZATION (design names the axis, "budget-exhaustion rate", but no formula) — the
   * fraction of players (with a progression row) whose `structural_decisions_this_session >=
   * structuralCapForPlayer(playerId)` RIGHT NOW (the SAME canonical getter the D7 per-player diagnostic
   * above reads, DD-H2 — never a re-derived shadow cap), `0` when zero players have a row. Role: `gm`
   * (canon `PressureInverseDashboard` data, no mutation).
   */
  @Get('meta/pressure-tier-distribution')
  @UseGuards(requireStaffRole('gm'))
  async getPressureTierDistribution(): Promise<{ distribution: Array<{ tier: number; count: number }>; budget_exhaustion_rate: number }> {
    const rows = await this.db
      .select({
        player_id: playerProgressionState.player_id,
        pressure_tier: playerProgressionState.pressure_tier,
        structural_decisions_this_session: playerProgressionState.structural_decisions_this_session,
      })
      .from(playerProgressionState);

    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    let exhaustedCount = 0;
    for (const row of rows) {
      counts[row.pressure_tier] = (counts[row.pressure_tier] ?? 0) + 1;
      const cap = coreLoopsTunables.structuralCapForPlayer(row.player_id);
      if (row.structural_decisions_this_session >= cap) exhaustedCount++;
    }

    return {
      distribution: [1, 2, 3, 4].map((tier) => ({ tier, count: counts[tier] ?? 0 })),
      budget_exhaustion_rate: rows.length > 0 ? exhaustedCount / rows.length : 0,
    };
  }

  // ─── POST /admin/meta/horizon-tier/force-advance — compensation/debug (role `admin`, F3 DEFERRED, audited) ─

  /**
   * `POST /v1/admin/meta/horizon-tier/force-advance`
   *
   * Body: `{ playerId, lieutenantId }`. Advances the player's SHARED `decision_horizon_tier` by exactly ONE
   * (409 `HORIZON_TIER_ALREADY_MAXIMUM` at tier 3), bypassing the `ScriptStabilityCounter` threshold gate
   * `HorizonTierAdvancementService.advance` enforces (`HorizonTierAdvancementService.forceAdvance`, C9 —
   * see that method's own header for the full "force = gate-bypassed, domain-wall-intact" account). Emits
   * the SAME `HorizonTierAdvancedEvent` shape the organic advance does.
   *
   * Returns: `{ playerId, tier, f3_deferred: true }`. Role: `admin`.
   */
  @Post('meta/horizon-tier/force-advance')
  @HttpCode(200)
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD-107 join, decisions §1.14 precedent).
  @UseGuards(requireStaffRole('admin'))
  async forceAdvanceHorizonTier(
    @Body() body: { playerId?: string; lieutenantId?: string },
    @Req() req: RequestWithAccount,
  ): Promise<{ playerId: string; tier: number; f3_deferred: true }> {
    const playerId = requireNonEmptyString(body?.playerId, 'playerId');
    const lieutenantId = requireNonEmptyString(body?.lieutenantId, 'lieutenantId');

    const before = await this.progressionRepo.getDecisionHorizonTier(playerId);
    const result: AdvanceTierResult = await this.horizonTierAdvancement.forceAdvance(playerId, lieutenantId);

    await this.auditLog.emit({
      adminUserId: req.account!.account_id,
      actionType: 'UPDATE',
      targetPlayerId: playerId,
      targetEntityType: 'decision_horizon_tier',
      targetEntityId: null,
      beforeState: { tier: before, lieutenantId },
      afterState: { tier: result.tier },
    });

    return { playerId, tier: result.tier, f3_deferred: true as const };
  }

  // ─── POST /admin/meta/pressure-tier/force-set — the ★H-1 value-sensitivity surface (role `admin`, F3 DEFERRED, audited) ─

  /**
   * `POST /v1/admin/meta/pressure-tier/force-set`
   *
   * Body: `{ playerId, tier }`. `tier` MUST be an integer 1..4 (422 `VALIDATION_FAILED` otherwise). An
   * UNCONDITIONAL override (`PressureTierService.forceSetTier` — see its own header): sets `pressure_tier`
   * to the requested value; a force-set to 4 ALSO opens a REAL T4 observation window (the ONLY thing
   * `structuralCapForPlayer` actually reads, design §8.2), a force-set to 1..3 clears any pre-existing
   * window. Write-throughs `pressureCapCache` synchronously — the very NEXT `structuralCapForPlayer` call
   * (even the REAL governor's, on the very next request) already observes the fresh value.
   *
   * Returns: `{ playerId, pressureTier, observationOpen, f3_deferred: true }`. Role: `admin`.
   */
  @Post('meta/pressure-tier/force-set')
  @HttpCode(200)
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD-107 join, decisions §1.14 precedent).
  @UseGuards(requireStaffRole('admin'))
  async forceSetPressureTier(
    @Body() body: { playerId?: string; tier?: number },
    @Req() req: RequestWithAccount,
  ): Promise<{ playerId: string; pressureTier: number; observationOpen: boolean; f3_deferred: true }> {
    const playerId = requireNonEmptyString(body?.playerId, 'playerId');
    const tier = requirePressureTier(body?.tier);

    const before = await this.progressionRepo.getPressureState(playerId);
    const result = await this.pressureTier.forceSetTier(playerId, tier);

    await this.auditLog.emit({
      adminUserId: req.account!.account_id,
      actionType: 'UPDATE',
      targetPlayerId: playerId,
      targetEntityType: 'pressure_tier',
      targetEntityId: null,
      beforeState: { pressureTier: before.pressureTier, tier4ObservationUntilTick: before.tier4ObservationUntilTick?.toISOString() ?? null },
      afterState: { pressureTier: result.pressureTier, tier4ObservationUntilTick: result.tier4ObservationUntilTick?.toISOString() ?? null },
    });

    return {
      playerId,
      pressureTier: result.pressureTier,
      observationOpen: result.tier4ObservationUntilTick !== null,
      f3_deferred: true as const,
    };
  }
}
