// IMPLEMENTS: docs/tech/04c_market_reputation_insurance/reputation_mechanics.md §NestJS-BO :264-266
//             docs/superpowers/plans/2026-06-16-depth-d2-impl-plan.md Task R12a
//             — D2 R12a — 2026-06-17
//
// `ReputationAdminController` — BO true-state endpoints for the 5 reputation mechanics (P5 inversion:
// ops sees raw hidden scalars; player never does — reputation_mechanics.md §R2.2).
//
// 1 GET true-state endpoint, role `gm` (≡ `ops` per global_conventions_backoffice.md §role-mapping):
//   GET /v1/admin/players/:id/reputation-state  — true state aggregating:
//     - violation rings (boss_mirror_violation_ring per-lieutenant for the player)
//     - restraint ratios/offer_terms (restraint_dispute_ring per-counterparty for the player)
//     - lek memory aggregate (lek_memory_cell_state — per-cell position memory)
//     - curriculum flags (hidden_curriculum_norms_vector per-lieutenant for the player)
//     - triad pairs/anomaly_pressure (forbidden_triad_pair_state for the player)
//     - divergence cue (per-lieutenant cross-mechanic divergence)
//
// 2 action endpoints, role `admin`:
//   POST /v1/admin/players/:id/force-rule-violation — live-ops manual violation (admin + F3 DEFERRED)
//   PUT  /v1/admin/tunables/reputation              — live-ops tunable override (admin + F3 DEFERRED)
//
// F3 two-person-rule: DEFERRED. this route is NOT WIRED to the ch17 approval workflow present in the
// codebase (same precedent as D1b C7 / D1c B7 — market-admin.controller.ts:18-21 / precursor-market-admin.controller.ts:21-25).
// The 2 action endpoints are gated by `requireStaffRole('admin')` only.
// Wiring this to the ch17 workflow (TD-107) means replacing the admin-role-only guard with the two-person approval check.
// This is the 5th+ F3-deferred endpoint chain (joining TD-107 from D1b/D1c) — MUST be noted at R13 gate.
//
// Note on role mapping: `ops` in reputation_mechanics.md :264 = `gm` in StaffRoleEnum
// (global_conventions_backoffice.md §Note: "placeholder `ops` (lecture étendue) est mappé à `gm`").
// `admin` in reputation_mechanics.md :265-266 = `admin` in StaffRoleEnum (ordinal 3).
//
// R2.2: the GET is the ONLY surface that exposes raw hidden scalars (violation_slots, rings, ratios,
// lek aggregate, curriculum flags, triad pairs/anomaly_pressure) to a real caller.
// Player routes NEVER expose these (P5 inversion — BO-only surface).
//
// REUSE:
//   - `requireStaffRole` from '../../auth/staff-role.guard' — exactly as market-admin + precursor-admin controllers.
//   - `BossMirrorService.recordViolation` (R2a) — live-ops manual violation lands on the DB ring.
//   - `BossMirrorService.getDivergenceCue` (R11) — per-lieutenant divergence cue.
//   - TunablesStore upsert pattern (market-admin.controller.ts:294-310) for PUT tunables/reputation.
//   - DB singleton (DbModule @Global — no explicit import needed).
//
// NOT conditional on NODE_ENV (unlike ReputationTestController) — these are real production BO routes
// that must be available in production (ops and admin staff need them for live monitoring).
// Mounted as a separate controller in ReputationModule.controllers always-on.

import { Body, Controller, Get, Inject, Param, Post, Put, UseGuards } from '@nestjs/common';
import { sql, eq } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { tunableOverrides } from '../../db/schema/tunable_overrides';
import { ApiError } from '../../protocol/api-error';
import { requireStaffRole } from '../../auth/staff-role.guard';
import { BossMirrorService } from './boss-mirror.service';
import { RestraintIndexService } from './restraint-index.service';
import { LekMemoryService } from './lek-memory.service';
import { HiddenCurriculumService } from './hidden-curriculum.service';
import { ForbiddenTriadDetectionService } from './forbidden-triad.service';
import {
  bossMirrorViolationRing,
  restraintDisputeRing,
  lekMemoryCellState,
  hiddenCurriculumNormsVector,
  forbiddenTriadPairState,
} from '../../db/schema/reputation_state';

// ── BO-allowed tunable keys for PUT /v1/admin/tunables/reputation ─────────────────────────────────
//
// REUSE pattern from market-admin.controller.ts:55-80 (MARKET_TUNABLE_CAPS).
// These are the `reputation.*` registry keys writable via BO live-ops.
// Capped to registry-resolved bounds (TunablesStore.resolve* — never inline literals).
// R2.3: all values route through TunablesStore; defaults match gdd/14 §Reputation.
//
// Exposed keys (subset of reputation-tunables.ts — the live-ops balance levers):
//   reputation.boss_mirror_violation_ring_size      range 3..10  (gdd/14:953)
//   reputation.boss_mirror_max_public_rules         range 2..8   (gdd/14:955)
//   reputation.restraint_base_terms                 range 0.5..2.0
//   reputation.divergence_salience_min_norms        range 1..4
//   reputation.forbidden_triad_n_strong_cap         range 6..20

import { TunablesStore } from '../../config/tunables-store';

const REPUTATION_TUNABLE_CAPS: Record<string, (value: number) => number> = {
  // reputation.boss_mirror_violation_ring_size — range 3..10 (gdd/14:953)
  'reputation.boss_mirror_violation_ring_size': (v: number) =>
    Math.min(10, Math.max(3, Math.round(v))),

  // reputation.boss_mirror_max_public_rules — range 2..8 (gdd/14:955)
  'reputation.boss_mirror_max_public_rules': (v: number) =>
    Math.min(8, Math.max(2, Math.round(v))),

  // reputation.restraint_base_terms — range 0.5..2.0
  'reputation.restraint_base_terms': (v: number) =>
    Math.min(2.0, Math.max(0.5, Number(v))),

  // reputation.divergence_salience_min_norms — range 1..4
  'reputation.divergence_salience_min_norms': (v: number) =>
    Math.min(4, Math.max(1, Math.round(v))),

  // reputation.forbidden_triad_n_strong_cap — range 6..20 (gdd/14)
  'reputation.forbidden_triad_n_strong_cap': (v: number) =>
    Math.min(20, Math.max(6, Math.round(v))),
};

// ─── Request body shapes ───────────────────────────────────────────────────────

interface ForceRuleViolationBody {
  /** The lieutenant ID to record the violation on. */
  lieutenantId: string;
  /** The rule ID that was violated. */
  ruleId: string;
  /** Severity bucket (0-3). */
  severityBucket: number;
}

interface PatchTunableBody {
  key: string;
  value: number;
}

// ─── Controller ───────────────────────────────────────────────────────────────

/**
 * `ReputationAdminController` — production BO routes for reputation true-state inspection
 * and live-ops actions.
 *
 * Path prefix: `admin` — with the global `v1` prefix from main.ts `app.setGlobalPrefix('v1')` →
 * routes are reachable at `/v1/admin/players/:id/reputation-state` and `/v1/admin/tunables/reputation`.
 *
 * NOT conditional on NODE_ENV (unlike ReputationTestController) — these are real production BO routes
 * that must be available in production (ops and admin staff need them for live monitoring).
 *
 * Mounted always-on in ReputationModule.controllers (alongside the test-gated ReputationTestController).
 */
@Controller('admin')
export class ReputationAdminController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly bossMirror: BossMirrorService,
    private readonly restraintIndex: RestraintIndexService,
    private readonly lekMemory: LekMemoryService,
    private readonly hiddenCurriculum: HiddenCurriculumService,
    private readonly forbiddenTriad: ForbiddenTriadDetectionService,
  ) {}

  // ─── GET true-state endpoint (role `gm` ≡ ops) ───────────────────────────

  /**
   * `GET /v1/admin/players/:id/reputation-state`
   *
   * P5 BO INVERSION: returns the raw true state aggregating all 5 reputation mechanics for a player.
   * The raw hidden scalars returned here are NEVER forwarded to the player (R2.2 P5 invariant).
   * Ops staff uses this for live reputation monitoring.
   *
   * Aggregates:
   *   - violation_rings: all boss_mirror_violation_ring rows for the player (per-lieutenant)
   *   - restraint_rings: all restraint_dispute_ring rows for the player (per-counterparty)
   *   - lek_cell_states: all lek_memory_cell_state rows for the player (per-cell)
   *   - curriculum_vectors: all hidden_curriculum_norms_vector rows for the player (per-lieutenant)
   *   - triad_pairs: all forbidden_triad_pair_state rows for the player (excluding sentinel)
   *   - divergence: per-lieutenant divergence cue array
   *   - consistency_index: boss mirror consistency_index for the player (from declaration ledger)
   *
   * Role: `gm` (≡ `ops` per global_conventions_backoffice.md §role-mapping).
   */
  @Get('players/:id/reputation-state')
  @UseGuards(requireStaffRole('gm'))
  async getReputationState(@Param('id') playerId: string) {
    // P5 BO inversion: aggregate all per-player reputation scalars from the 5 tables.
    // These are raw server-side scalars never forwarded to the player surface (R2.2).

    // 1. violation_rings — boss_mirror_violation_ring rows for this player (per-lieutenant)
    const violationRings = await this.db
      .select()
      .from(bossMirrorViolationRing)
      .where(eq(bossMirrorViolationRing.player_id, playerId));

    // 2. restraint_rings — restraint_dispute_ring rows for this player (per-counterparty)
    const restraintRings = await this.db
      .select()
      .from(restraintDisputeRing)
      .where(eq(restraintDisputeRing.player_id, playerId));

    // 3. lek_cell_states — lek_memory_cell_state rows for this player (per-cell)
    const lekCellStates = await this.db
      .select()
      .from(lekMemoryCellState)
      .where(eq(lekMemoryCellState.player_id, playerId));

    // 4. curriculum_vectors — hidden_curriculum_norms_vector rows for this player (per-lieutenant)
    const curriculumVectors = await this.db
      .select()
      .from(hiddenCurriculumNormsVector)
      .where(eq(hiddenCurriculumNormsVector.player_id, playerId));

    // 5. triad_pairs — forbidden_triad_pair_state rows for this player (excluding sentinel)
    const { pairs: triadPairs, pairCount } = await this.forbiddenTriad.getPairStates(playerId);

    // 6. consistency_index — from the boss mirror declaration ledger (R2b derived scalar)
    const consistencyIndexRow = await this.bossMirror.getConsistencyIndex(playerId);

    // 7. divergence cue — per-lieutenant (one per curriculum vector row)
    //    Each lieutenant that has a norms vector entry gets a divergence cue.
    const divergenceCues = await Promise.all(
      curriculumVectors.map(async (row) => {
        const cue = await this.bossMirror.getDivergenceCue(playerId, row.lieutenant_id);
        return {
          lieutenant_id: row.lieutenant_id,
          divergence_count: cue.divergence_count,
          cue: cue.cue,
        };
      }),
    );

    // P5 BO inversion: expose raw hidden scalars to ops.
    // The player surface NEVER includes violation_slots, restraint_ratio, norms_flags,
    // anomaly_pressure_bucket, divergence_count, or consistency_index.
    return {
      player_id: playerId,
      violation_rings: violationRings.map((r) => ({
        lieutenant_id:       r.lieutenant_id,
        violation_slots:     r.violation_slots,
        ring_head:           r.ring_head,
        violation_density:   r.violation_density ?? null,
        defection_tolerance: r.defection_tolerance ?? null,
        last_tick_week:      r.last_tick_week ?? null,
      })),
      restraint_rings: restraintRings.map((r) => ({
        counterparty_id:   r.counterparty_id,
        dispute_slots:     r.dispute_slots,
        ring_head:         r.ring_head,
        restraint_ratio:   r.restraint_ratio ?? null,
        offer_terms:       r.offer_terms ?? null,
        wary_active:       r.wary_active ?? null,
        collateral_amount: r.collateral_amount ?? null,
        last_tick_week:    r.last_tick_week ?? null,
      })),
      lek_cell_states: lekCellStates.map((r) => ({
        tile_id:                      r.tile_id,
        trailing_operator_ids:        r.trailing_operator_ids,
        trailing_fairness_signatures: r.trailing_fairness_signatures,
        last_active_tick:             r.last_active_tick,
        lambda_weight:                r.lambda_weight,
        decay_state:                  r.decay_state,
        last_decay_week:              r.last_decay_week ?? null,
      })),
      curriculum_vectors: curriculumVectors.map((r) => ({
        lieutenant_id:        r.lieutenant_id,
        norms_flags:          r.norms_flags,
        ring_head:            r.ring_head,
        last_review_week:     r.last_review_week ?? null,
      })),
      triad_pairs:         triadPairs,
      triad_pair_count:    pairCount,
      consistency_index:   consistencyIndexRow?.consistency_index ?? null,
      divergence:          divergenceCues,
    };
  }

  // ─── 2 action endpoints (role `admin`, F3 DEFERRED) ─────────────────────────

  /**
   * `POST /v1/admin/players/:id/force-rule-violation`
   *
   * Live-ops action: manually land a Boss Mirror violation on the given lieutenant.
   * The DB ring grows (REUSE BossMirrorService.recordViolation — the same path as organic violations).
   *
   * Body: { lieutenantId: string, ruleId: string, severityBucket: number }
   * Returns: { playerId, lieutenantId, ruleId, severityBucket, f3_deferred: true }
   *
   * // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow.
   * // Same TD-107 precedent as D1b C7 / D1c B7. R13 closeout MUST join this to TD-107.
   * Role: `admin` (only; F3 would add a second-approver check when ch17 is implemented).
   */
  @Post('players/:id/force-rule-violation')
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD-107 carry-forward from D1b/D1c).
  @UseGuards(requireStaffRole('admin'))
  async forceRuleViolation(
    @Param('id') playerId: string,
    @Body() body: ForceRuleViolationBody,
  ) {
    const { lieutenantId, ruleId, severityBucket } = body;
    // REUSE BossMirrorService.recordViolation — same DB ring write as the organic path (R2a).
    // W6a C3: `playerId` (the target player from the URL param) is now the first argument — this
    // admin route already names its target explicitly, so this is a mechanical adaptation.
    await this.bossMirror.recordViolation(
      playerId,
      String(lieutenantId ?? ''),
      String(ruleId ?? ''),
      Number(severityBucket ?? 0),
    );
    // F3 DEFERRED marker — same precedent as market-admin.controller.ts:256 (D1b C7).
    return {
      playerId,
      lieutenantId,
      ruleId,
      severityBucket: Number(severityBucket ?? 0),
      f3_deferred: true,
    };
  }

  /**
   * `PUT /v1/admin/tunables/reputation`
   *
   * Live-ops tunable edit: upserts a reputation tunable override into the `tunable_overrides` table.
   * The TunablesStore auto-reloads via NOTIFY (postgres LISTEN channel `tunables_changed`).
   *
   * Allowed keys (BO live-ops balance levers):
   *   - reputation.boss_mirror_violation_ring_size (3..10)
   *   - reputation.boss_mirror_max_public_rules (2..8)
   *   - reputation.restraint_base_terms (0.5..2.0)
   *   - reputation.divergence_salience_min_norms (1..4)
   *   - reputation.forbidden_triad_n_strong_cap (6..20)
   *
   * Body: { key: string, value: number }
   * Returns: { key, value } where value is the BO-capped accepted value + f3_deferred: true.
   *
   * REUSE pattern: market-admin.controller.ts:277-311 (PUT tunables/market).
   *
   * // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow.
   * // Same TD-107 precedent. R13 closeout MUST join this to TD-107.
   * Role: `admin` (only; F3 would add a second-approver check when ch17 is implemented).
   */
  @Put('tunables/reputation')
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD-107 carry-forward from D1b/D1c).
  @UseGuards(requireStaffRole('admin'))
  async patchReputationTunable(@Body() body: PatchTunableBody) {
    const { key, value } = body;
    const capFn = REPUTATION_TUNABLE_CAPS[key];
    if (!capFn) {
      // Unknown key — reject. Only the 5 BO reputation keys are writable via this endpoint.
      throw new ApiError('VALIDATION_FAILED', {
        message: `Unknown reputation tunable key: '${key}'. Allowed: ${Object.keys(REPUTATION_TUNABLE_CAPS).join(', ')}`,
      });
    }
    // Apply BO cap (never inline — all magnitudes derived from ranges documented in REPUTATION_TUNABLE_CAPS).
    const cappedValue = capFn(Number(value));

    // Upsert into tunable_overrides (TunablesStore auto-reloads via LISTEN `tunables_changed`).
    // REUSE: market-admin.controller.ts:294-310 upsert pattern.
    await this.db
      .insert(tunableOverrides)
      .values({
        key,
        value: String(cappedValue),
        updated_at: sql`now()`,
        updated_by: 'reputation-admin-r12a',
      })
      .onConflictDoUpdate({
        target: [tunableOverrides.key],
        set: {
          value: String(cappedValue),
          updated_at: sql`now()`,
          updated_by: 'reputation-admin-r12a',
        },
      });

    // F3 DEFERRED marker — same precedent as market-admin.controller.ts:311.
    return { key, value: cappedValue, f3_deferred: true };
  }
}
