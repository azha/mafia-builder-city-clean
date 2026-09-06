// IMPLEMENTS: docs/superpowers/plans/2026-06-17-depth-insurance-underwriting-walk-plan.md Task 1 (C1)
//             docs/superpowers/plans/2026-06-18-depth-insurance-coverage-drift-plan.md Task 0 (C0)
//             docs/superpowers/plans/2026-06-18-depth-insurance-coverage-drift-plan.md Task 14 (C14)
//             Pattern: services/game-back/src/operational/reputation/reputation-admin.controller.ts
//             (REPUTATION_TUNABLE_CAPS:83 — direct mirror)
//             — Insurance C1 — 2026-06-17
//             — Insurance Drift C0 — 2026-06-18 (extends INSURANCE_TUNABLE_CAPS with 4 §4.2 canon keys)
//             — Insurance Drift C14 — 2026-06-18 (GET drift-state gm/ops + POST force-hazard-shift admin F3-deferred)
//
// `InsuranceAdminController` — BO admin endpoints for the insurance mechanics (§4.1 P5 inversion).
//
// C1 STANDS UP ONLY THE `INSURANCE_TUNABLE_CAPS` clamper record.
// The 3 BO routes themselves land at C12 (per plan — routes depend on services not yet implemented).
//
// Routes:
//   GET  /v1/admin/players/:id/insurance-state  — true state (gm role) — C12
//   POST /v1/admin/insurance/force-fraud-detection — manual fraud (admin + F3 DEFERRED) — C12
//   PUT  /v1/admin/tunables/insurance — tunable override (admin + F3 DEFERRED) — C12
//   GET  /v1/admin/players/:id/drift-state — §4.2 drift true-state (gm/ops role) — C14
//   POST /v1/admin/insurance/force-hazard-shift — live-ops hazard_shift override (admin + F3 DEFERRED TD-107) — C14
//
// F3 two-person-rule: DEFERRED. Same precedent as D2 reputation-admin.controller.ts:18-25.
// The PUT tunables endpoint (C12) will be gated by `requireStaffRole('admin')` only until F3
// is implemented (ch17 backlog — TD-107 extension from D1b/D1c/D2).
//
// Note on role mapping: `ops` in insurance_mechanics.md :264 = `gm` in StaffRoleEnum
// (global_conventions_backoffice.md §Note — same mapping as ReputationAdminController).
//
// REUSE:
//   - Pattern mirrors `REPUTATION_TUNABLE_CAPS` (reputation-admin.controller.ts:83).
//   - `requireStaffRole` from '../../auth/staff-role.guard' (C12 will import it).
//   - DB singleton (DbModule @Global — no explicit import needed).
//
// IMPORTANT: This file is NOT conditional on NODE_ENV (real BO routes — always-on in production).
//   Registered in InsuranceModule.controllers alongside InsuranceTestController (conditional).
//   C12 will add the controller class and register it here.

// ── BO-allowed tunable keys for PUT /v1/admin/tunables/insurance (C12) ────────────────────────────
//
// REUSE pattern from reputation-admin.controller.ts:83 (REPUTATION_TUNABLE_CAPS).
// These are the `insurance.*` registry keys writable via BO live-ops.
// Capped to registry-resolved bounds (never inline literals — R2.3).
// The 5 §4.1 canon keys + 6 of the 8 NEW C1 keys (the 2 "calibrate" keys are excluded —
//   they have no safe numeric bounds until calibrated at C13 closeout).
//
// Exposed keys (subset of insurance-tunables.ts — the live-ops balance levers):
//   insurance.underwriting_walk_duration_days             range 2..7    (canon :184)
//   insurance.underwriting_base_premium_pct_of_insured_value_per_cycle  range 1..10 (canon :185)
//   insurance.underwriting_c_i_per_finding_min            range 0.1..0.6 (canon :186)
//   insurance.underwriting_c_i_per_finding_max            range 0.1..0.6 (canon :186)
//   insurance.underwriting_fraud_penalty_multiplier       range 3..10   (canon :187)
//   insurance.underwriting_almanac_persistence_days_post_lapse range 30..365 (canon :188)
//   insurance.property_coverage_fraction                  range 0.30..0.90 (design §7)
//   insurance.stash_coverage_fraction                     range 0.20..0.80 (design §7)
//   insurance.courier_cargo_recovery_fraction             range 0.10..0.70 (design §7)
//   insurance.fence_throughput_loss_compensation_fraction range 0.20..0.80 (design §7)
//   insurance.fence_default_exposure_threshold            range 0.50..0.95 (design §7)
//   insurance.wary_premium_surcharge_multiplier           range 1.05..1.50 (design §7)
//
// EXCLUDED from live-ops (calibrate at C13):
//   insurance.courier_lawyer_fee_payout_cents    — (calibrate) no safe range yet
//   insurance.courier_intercept_heat_threshold   — (calibrate) no safe range yet

// ── Imports (C12 — live-ops BO routes) ────────────────────────────────────────────────────────────
//
// All imported here at C12; the file previously only exported INSURANCE_TUNABLE_CAPS (no imports needed).

import { Body, Controller, Get, HttpCode, Inject, Param, Post, Put, UseGuards } from '@nestjs/common';
import { sql, eq } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { tunableOverrides } from '../../db/schema/tunable_overrides';
import { ApiError } from '../../protocol/api-error';
import { requireStaffRole } from '../../auth/staff-role.guard';
import { FraudDetectionService } from './fraud-detection.service';
import {
  underwriterWalkRecord,
  insuranceContract,
  insuranceClaim,
  almanacEntry,
  coverageInducedDriftState,
} from '../../db/schema/insurance';
import { insuranceTunables } from './insurance-tunables';

// ─── Request body shapes ───────────────────────────────────────────────────────

interface ForceFraudDetectionBody {
  /** The claim ID to run fraud detection against. */
  claimId: string;
}

interface PatchTunableBody {
  key: string;
  value: number;
}

interface ForceHazardShiftBody {
  /** The drift_state row ID to update. */
  driftStateId: string;
  /** The desired hazard_shift value (will be clamped to 0..255, REUSE T.bo.economic.hazard_shift_max). */
  value: number;
}

// ─── Controller ───────────────────────────────────────────────────────────────

/**
 * `InsuranceAdminController` — production BO routes for insurance true-state inspection
 * and live-ops actions (P5 BO inversion: ops sees raw hidden state that the player never does).
 *
 * Path prefix: `admin` — with the global `v1` prefix from main.ts `app.setGlobalPrefix('v1')` →
 * routes are reachable at `/v1/admin/players/:id/insurance-state`,
 * `/v1/admin/insurance/force-fraud-detection`, `/v1/admin/tunables/insurance`,
 * `/v1/admin/players/:id/drift-state`, and `/v1/admin/insurance/force-hazard-shift`.
 *
 * NOT conditional on NODE_ENV (unlike InsuranceTestController) — these are real production BO routes
 * that must be available in production (ops and admin staff need them for live monitoring).
 *
 * Mounted always-on in InsuranceModule.controllers (alongside the test-gated InsuranceTestController).
 *
 * F3 two-person-rule: DEFERRED (TD-107). Same precedent as ReputationAdminController:18-25.
 * The 2 action endpoints are gated by `requireStaffRole('admin')` only until F3 is implemented.
 */
@Controller('admin')
export class InsuranceAdminController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly fraudDetection: FraudDetectionService,
  ) {}

  // ─── GET true-state endpoint (role `gm` ≡ ops) ───────────────────────────

  /**
   * `GET /v1/admin/players/:id/insurance-state`
   *
   * P5 BO INVERSION: returns the raw true state for all insurance entities for a player.
   * The raw hidden scalars returned here (findings_bitmask, etc.) are NEVER forwarded to the player
   * (R2.2 P5 invariant). Ops staff uses this for live insurance monitoring.
   *
   * Returns:
   *   - contracts: all insurance_contract rows (including escrow_required_cents from mig 0066)
   *   - walks: all underwriter_walk_record rows (including findings_bitmask as bigint string)
   *   - claims: all insurance_claim rows
   *   - almanac: all almanac_entry rows
   *
   * NO R2.2 banding here — this is the P5 BO inversion: raw server-side state for ops.
   * findings_bitmask is intentionally included (it is the point of the BO route).
   *
   * Role: `gm` (≡ `ops` per global_conventions_backoffice.md §role-mapping).
   */
  @Get('players/:id/insurance-state')
  @UseGuards(requireStaffRole('gm'))
  async getInsuranceState(@Param('id') playerId: string) {
    // P5 BO inversion: aggregate all per-player insurance entities.
    // findings_bitmask is intentionally included (server-only scalar exposed to ops only).

    const contracts = await this.db
      .select()
      .from(insuranceContract)
      .where(eq(insuranceContract.player_id, playerId));

    const walks = await this.db
      .select()
      .from(underwriterWalkRecord)
      .where(eq(underwriterWalkRecord.player_id, playerId));

    const claims = await this.db
      .select()
      .from(insuranceClaim)
      .where(eq(insuranceClaim.player_id, playerId));

    const almanac = await this.db
      .select()
      .from(almanacEntry)
      .where(eq(almanacEntry.player_id, playerId));

    // Serialize bigint fields as strings for JSON transport (JSON.stringify cannot handle bigint).
    function serializeBigints(rows: Record<string, unknown>[]): Record<string, unknown>[] {
      return rows.map((row) => {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(row)) {
          out[k] = typeof v === 'bigint' ? String(v) : v;
        }
        return out;
      });
    }

    return {
      player_id: playerId,
      contracts: serializeBigints(contracts as Record<string, unknown>[]),
      walks: serializeBigints(walks as Record<string, unknown>[]),
      claims: serializeBigints(claims as Record<string, unknown>[]),
      almanac: serializeBigints(almanac as Record<string, unknown>[]),
    };
  }

  // ─── 2 action endpoints (role `admin`, F3 DEFERRED — TD-107) ─────────────────

  /**
   * `POST /v1/admin/insurance/force-fraud-detection`
   *
   * Live-ops action: manually run fraud detection against a filed claim.
   * Calls FraudDetectionService.checkClaimAgainstWalk(playerId, claimId).
   * If fraud is detected, also applies the fraud penalty (applyFraudPenalty).
   *
   * Body: { claimId: string }
   * Returns: { claimId, fraud, contradictedFinding, f3_deferred: true }
   *
   * F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow.
   * Same TD-107 precedent as D1b C7 / D1c B7 / D2 R12a.
   * R13 closeout MUST join this to TD-107.
   *
   * Role: `admin` (only; F3 would add a second-approver check when ch17 is implemented).
   *
   * W6a C4 (findings #12/#13) — `checkClaimAgainstWalk`/`applyFraudPenalty` now require `playerId`
   * as their first argument. This route resolves it from the claim's OWN `player_id` column FIRST
   * (an unscoped read — legitimate here: this route is `requireStaffRole('admin')`-gated, D2's
   * SURFACE axis, not the object-ownership axis the two service methods now guard against
   * unauthenticated PLAYERS). An admin investigating claim X by definition doesn't pre-know which
   * player owns it; resolving the owner from the claim and passing it straight back through is the
   * staff-tooling equivalent of "the caller IS authorized to act on this object", the same way C3's
   * `_test` probes pass a caller-declared `playerId` because no JWT-gated route exists here either.
   */
  @Post('insurance/force-fraud-detection')
  @HttpCode(200)
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD-107 carry-forward from D1b/D1c/D2).
  // F3 TwoPersonApproval: the ch17 workflow shipped in migration 0152; wiring this guard to it is TD-107.
  @UseGuards(requireStaffRole('admin'))
  async forceFraudDetection(@Body() body: ForceFraudDetectionBody) {
    const { claimId } = body;

    // Resolve the claim's owner FIRST (unscoped — legitimate for this staff-gated route, see docblock).
    const [claimOwnerRow] = await this.db
      .select({ player_id: insuranceClaim.player_id })
      .from(insuranceClaim)
      .where(eq(insuranceClaim.id, claimId))
      .limit(1);

    if (!claimOwnerRow) {
      return { claimId, fraud: false, contradictedFinding: null, f3_deferred: true };
    }
    const playerId = claimOwnerRow.player_id;

    // Run fraud detection (same path as organic FraudDetectionService.checkClaimAgainstWalk).
    const { fraud, contradictedFinding } = await this.fraudDetection.checkClaimAgainstWalk(playerId, claimId);

    if (fraud) {
      // Load the contract_id from the claim to pass to applyFraudPenalty.
      // This mirrors the organic fraud path in ClaimsService (C10).
      const [claimRow] = await this.db
        .select({ contract_id: insuranceClaim.contract_id })
        .from(insuranceClaim)
        .where(eq(insuranceClaim.id, claimId))
        .limit(1);

      if (claimRow) {
        // Apply the full fraud consequence: 5× penalty + FRAUDED + POISONED almanac.
        // currentGameTick=0 for the forced-detection path (ops-triggered, not tied to real tick).
        await this.fraudDetection.applyFraudPenalty(playerId, claimRow.contract_id, claimId, 0);
      }
    }

    // F3 DEFERRED marker — same precedent as reputation-admin.controller.ts (D2 R12a).
    return {
      claimId,
      fraud,
      contradictedFinding,
      f3_deferred: true,
    };
  }

  /**
   * `PUT /v1/admin/tunables/insurance`
   *
   * Live-ops tunable edit: upserts an insurance tunable override into the `tunable_overrides` table.
   * The TunablesStore auto-reloads via NOTIFY (postgres LISTEN channel `tunables_changed`).
   *
   * Allowed keys: see INSURANCE_TUNABLE_CAPS (the 12 BO live-ops balance levers).
   * Body: { key: string, value: number }
   * Returns: { key, clampedValue, f3_deferred: true }
   *
   * REUSE pattern: reputation-admin.controller.ts:321-357 (PUT tunables/reputation).
   *
   * // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow.
   * // Same TD-107 precedent. R13 closeout MUST join this to TD-107.
   * Role: `admin` (only; F3 would add a second-approver check when ch17 is implemented).
   */
  @Put('tunables/insurance')
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD-107 carry-forward from D1b/D1c/D2).
  @UseGuards(requireStaffRole('admin'))
  async patchInsuranceTunable(@Body() body: PatchTunableBody) {
    const { key, value } = body;
    const capFn = INSURANCE_TUNABLE_CAPS[key];
    if (!capFn) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `Unknown insurance tunable key: '${key}'. Allowed: ${Object.keys(INSURANCE_TUNABLE_CAPS).join(', ')}`,
      });
    }
    // Apply BO cap (never inline — all magnitudes from ranges in INSURANCE_TUNABLE_CAPS above).
    const clampedValue = capFn(Number(value));

    // Upsert into tunable_overrides (TunablesStore auto-reloads via LISTEN `tunables_changed`).
    // REUSE: reputation-admin.controller.ts upsert pattern.
    await this.db
      .insert(tunableOverrides)
      .values({
        key,
        value: String(clampedValue),
        updated_at: sql`now()`,
        updated_by: 'insurance-admin-c12',
      })
      .onConflictDoUpdate({
        target: [tunableOverrides.key],
        set: {
          value: String(clampedValue),
          updated_at: sql`now()`,
          updated_by: 'insurance-admin-c12',
        },
      });

    // F3 DEFERRED marker — same precedent as reputation-admin.controller.ts:355-356.
    return { key, clampedValue, f3_deferred: true };
  }

  // ─── GET drift-state endpoint (role `gm` ≡ ops) — C14 ───────────────────────

  /**
   * `GET /v1/admin/players/:id/drift-state`
   *
   * §4.2 drift true-state BO readout. P5 BO INVERSION: returns the raw §4.2 drift state for all
   * `coverage_induced_drift_state` rows for a player, plus the `almanac_entry` baseline columns,
   * plus the computed `true_loss_prob` per drift_state row (BO-only — never forwarded to the player).
   *
   * R2.2 wall: the player only sees `TiltLevelBucket` (banded composite, C13). This endpoint
   * intentionally exposes the raw hidden scalars (hazard_shift, fingerprint_*, true_loss_prob)
   * to ops staff (gm role) for live monitoring and calibration.
   *
   * Returns:
   *   - player_id
   *   - driftStates: all coverage_induced_drift_state rows, each augmented with `true_loss_prob`
   *     (computed server-side: base_loss_prob · (1 + α · hazard_shift); null when base is uncalibrated)
   *   - almanac: all almanac_entry rows (includes baseline_fingerprint_* + baseline_persisted_until_tick
   *     from migration 0068 — the 5 additive Tranche C columns)
   *
   * NO R2.2 banding here — this is the P5 BO inversion: raw server-side state for ops.
   *
   * Role: `gm` (≡ `ops` per global_conventions_backoffice.md §role-mapping).
   * NOT F3-gated (read-only, ops monitoring surface — same as §4.1 insurance-state).
   */
  @Get('players/:id/drift-state')
  @UseGuards(requireStaffRole('gm'))
  async getDriftState(@Param('id') playerId: string) {
    // Load all drift_state rows for this player (P5 BO inversion: full raw state).
    const driftRows = await this.db
      .select()
      .from(coverageInducedDriftState)
      .where(eq(coverageInducedDriftState.player_id, playerId));

    // Read tunables for true_loss_prob computation (same formula as CoverageInducedDriftService.runWeeklyTick).
    // Computed server-side, not stored (C10 decision — BO-only readout).
    const alpha = insuranceTunables.coverageDriftAlpha;
    const baseLossProb = insuranceTunables.coverageDriftBaseLossProbPermille; // number | null

    // Augment each drift_state row with true_loss_prob (computed on-demand, BO-only).
    // null when baseLossProb is null (calibrate sentinel — C2).
    const driftStates = driftRows.map((row) => {
      // Serialize bigint fields as strings for JSON transport.
      const serialized: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) {
        serialized[k] = typeof v === 'bigint' ? String(v) : v;
      }
      // Augment with computed true_loss_prob (BO-only — never forwarded to player, R2.2 P5 wall).
      const trueLossProb =
        baseLossProb !== null
          ? Math.round(baseLossProb * (1 + alpha * row.hazard_shift))
          : null;
      serialized['true_loss_prob'] = trueLossProb;
      return serialized;
    });

    // Load almanac_entry rows (includes baseline_fingerprint_* + baseline_persisted_until_tick — mig 0068).
    const almanac = await this.db
      .select()
      .from(almanacEntry)
      .where(eq(almanacEntry.player_id, playerId));

    // Serialize bigint fields in almanac rows.
    function serializeBigints(rows: Record<string, unknown>[]): Record<string, unknown>[] {
      return rows.map((row) => {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(row)) {
          out[k] = typeof v === 'bigint' ? String(v) : v;
        }
        return out;
      });
    }

    return {
      player_id: playerId,
      driftStates,
      almanac: serializeBigints(almanac as Record<string, unknown>[]),
    };
  }

  // ─── POST force-hazard-shift endpoint (role `admin`, F3 DEFERRED — TD-107) — C14 ──

  /**
   * `POST /v1/admin/insurance/force-hazard-shift`
   *
   * Live-ops action: forces a `hazard_shift` value on a `coverage_induced_drift_state` row.
   * The value is clamped to [0..255] (REUSE T.bo.economic.hazard_shift_max — same cap as
   * `CoverageInducedDriftService.onX` handlers and `CoverageInducedDriftService.runWeeklyTick`).
   *
   * Body: { driftStateId: string, value: number }
   * Returns: { driftStateId, clampedValue, f3_deferred: true }
   *
   * F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow.
   * Same TD-107 precedent as D1b C7 / D1c B7 / D2 R12a / insurance-admin C12.
   * R15 closeout MUST join this to TD-107 (the F3 note — TD-107 is EXTENDED, not closed, at C15).
   *
   * Role: `admin` (only; F3 would add a second-approver check when ch17 is implemented).
   *
   * Use case: ops tooling to manually reset or test-drive the drift mechanic in a live game instance.
   * Example: reset a player's hazard_shift to 0 after a live incident, or set it to a test value
   * to observe how renewal re-quoting scales.
   *
   * HAZARD_SHIFT_MAX = 255: REUSE T.bo.economic.hazard_shift_max (canon :2513).
   * Lower-bound 0: hazard_shift cannot be negative (no decay below 0 invariant, C10).
   */
  @Post('insurance/force-hazard-shift')
  @HttpCode(200)
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD-107 carry-forward from D1b/D1c/D2/C12).
  // F3 TwoPersonApproval: the ch17 workflow shipped in migration 0152; wiring this guard to it is TD-107.
  @UseGuards(requireStaffRole('admin'))
  async forceHazardShift(@Body() body: ForceHazardShiftBody) {
    const { driftStateId, value } = body;

    // Clamp to [0..255] — REUSE T.bo.economic.hazard_shift_max = 255 (canon :2513).
    // Lower-bound 0: hazard_shift cannot be negative (decay floors at 0, C10).
    const HAZARD_SHIFT_MAX = 255; // T.bo.economic.hazard_shift_max (REUSE — same as CoverageInducedDriftService:111)
    const clampedValue = Math.min(HAZARD_SHIFT_MAX, Math.max(0, Math.round(Number(value))));

    // Apply the forced hazard_shift to the drift_state row.
    await this.db
      .update(coverageInducedDriftState)
      .set({ hazard_shift: clampedValue, updated_at: new Date() })
      .where(eq(coverageInducedDriftState.id, driftStateId));

    // F3 DEFERRED marker — same precedent as force-fraud-detection and reputation-admin.controller.ts.
    return {
      driftStateId,
      clampedValue,
      f3_deferred: true,
    };
  }
}

// ─── INSURANCE_TUNABLE_CAPS ────────────────────────────────────────────────────

export const INSURANCE_TUNABLE_CAPS: Record<string, (value: number) => number> = {
  // ── §4.1 canon keys (range from insurance_mechanics.md:184-188 — VERBATIM) ──

  // insurance.underwriting_walk_duration_days — range 2..7 (canon :184)
  'insurance.underwriting_walk_duration_days': (v: number) =>
    Math.min(7, Math.max(2, Math.round(v))),

  // insurance.underwriting_base_premium_pct_of_insured_value_per_cycle — range 1..10 (canon :185)
  'insurance.underwriting_base_premium_pct_of_insured_value_per_cycle': (v: number) =>
    Math.min(10, Math.max(1, Math.round(v))),

  // insurance.underwriting_c_i_per_finding_min — range 0.1..0.6 (canon :186)
  'insurance.underwriting_c_i_per_finding_min': (v: number) =>
    Math.min(0.6, Math.max(0.1, Number(v))),

  // insurance.underwriting_c_i_per_finding_max — range 0.1..0.6 (canon :186)
  'insurance.underwriting_c_i_per_finding_max': (v: number) =>
    Math.min(0.6, Math.max(0.1, Number(v))),

  // insurance.underwriting_fraud_penalty_multiplier — range 3..10 (canon :187)
  'insurance.underwriting_fraud_penalty_multiplier': (v: number) =>
    Math.min(10, Math.max(3, Math.round(v))),

  // insurance.underwriting_almanac_persistence_days_post_lapse — range 30..365 (canon :188)
  'insurance.underwriting_almanac_persistence_days_post_lapse': (v: number) =>
    Math.min(365, Math.max(30, Math.round(v))),

  // ── C1 NEW [PROPOSED DEFAULT][PROV-Y26Q2] keys (ranges from design §7 — NOT canon) ──

  // insurance.property_coverage_fraction — range 0.30..0.90 (design §7 §1.3)
  'insurance.property_coverage_fraction': (v: number) =>
    Math.min(0.90, Math.max(0.30, Number(v))),

  // insurance.stash_coverage_fraction — range 0.20..0.80 (design §7 §1.3)
  'insurance.stash_coverage_fraction': (v: number) =>
    Math.min(0.80, Math.max(0.20, Number(v))),

  // insurance.courier_cargo_recovery_fraction — range 0.10..0.70 (design §7 §1.3)
  'insurance.courier_cargo_recovery_fraction': (v: number) =>
    Math.min(0.70, Math.max(0.10, Number(v))),

  // insurance.fence_throughput_loss_compensation_fraction — range 0.20..0.80 (design §7 §1.3)
  'insurance.fence_throughput_loss_compensation_fraction': (v: number) =>
    Math.min(0.80, Math.max(0.20, Number(v))),

  // insurance.fence_default_exposure_threshold — range 0.50..0.95 (design §7 §2.3)
  'insurance.fence_default_exposure_threshold': (v: number) =>
    Math.min(0.95, Math.max(0.50, Number(v))),

  // insurance.wary_premium_surcharge_multiplier — range 1.05..1.50 (design §7 §2.4 DD-WARY)
  'insurance.wary_premium_surcharge_multiplier': (v: number) =>
    Math.min(1.50, Math.max(1.05, Number(v))),

  // NOTE: insurance.courier_lawyer_fee_payout_cents and insurance.courier_intercept_heat_threshold
  // are EXCLUDED — (calibrate) keys with no safe numeric bounds until C13 closeout calibration.

  // ── C14 DD-LAYER1-PROB (2026-06-22) — intercept max prob cap ─────────────────────────────────────
  // insurance.courier_intercept_max_prob — range 0.05..0.50 (design §14.4 [PROV-Y26Q2])
  // Range top 0.50 structurally guarantees intercept_prob < 1.0 at any patrol_heat ∈ [0,1]
  // (you cannot accidentally tune Layer 1 back to a certain catch). Mirror the threshold entry above.
  'insurance.courier_intercept_max_prob': (v: number) =>
    Math.min(0.50, Math.max(0.05, Number(v))),

  // ── §4.2 Coverage-Induced Drift canon keys (Drift C0 — ranges VERBATIM from insurance_mechanics.md :189-192) ──

  // insurance.coverage_drift_alpha_hazard_sensitivity_per_shift_point — range 0.02..0.10 (canon :189)
  'insurance.coverage_drift_alpha_hazard_sensitivity_per_shift_point': (v: number) =>
    Math.min(0.10, Math.max(0.02, Number(v))),

  // insurance.coverage_drift_shift_decay_per_week — range 0..3 (canon :190)
  'insurance.coverage_drift_shift_decay_per_week': (v: number) =>
    Math.min(3, Math.max(0, Math.round(v))),

  // insurance.coverage_drift_coverage_tiers — range 2..5 (canon :191)
  'insurance.coverage_drift_coverage_tiers': (v: number) =>
    Math.min(5, Math.max(2, Math.round(v))),

  // insurance.coverage_drift_behaviour_fingerprint_window_days — range 14..60 (canon :192)
  'insurance.coverage_drift_behaviour_fingerprint_window_days': (v: number) =>
    Math.min(60, Math.max(14, Math.round(v))),

  // insurance.coverage_drift_marginal_deal_heat_threshold — range 1..20 [PROPOSED DEFAULT][PROV-Y26Q2]
  'insurance.coverage_drift_marginal_deal_heat_threshold': (v: number) =>
    Math.min(20, Math.max(1, Math.round(v))),

  // ── §4.2 Coverage-Induced Drift NEW [PROPOSED DEFAULT][PROV-Y26Q2] keys (Drift C2) ──
  // Ranges from design §7 table — NOT canon (canon names the mechanic, not the magnitudes).

  // insurance.coverage_drift_stash_hotter_margin_factor — range 1.2..3.0 (design §7 §1.3)
  'insurance.coverage_drift_stash_hotter_margin_factor': (v: number) =>
    Math.min(3.0, Math.max(1.2, Number(v))),

  // insurance.coverage_drift_courier_cadence_slower_margin_days — range 1..7 (design §7 §1.3)
  'insurance.coverage_drift_courier_cadence_slower_margin_days': (v: number) =>
    Math.min(7, Math.max(1, Math.round(v))),

  // insurance.coverage_drift_marginal_deal_rate_margin_permille — range 50..400 (design §7 §1.3)
  'insurance.coverage_drift_marginal_deal_rate_margin_permille': (v: number) =>
    Math.min(400, Math.max(50, Math.round(v))),

  // insurance.coverage_drift_lookout_rate_margin_permille — range 50..400 (design §7 §1.3)
  'insurance.coverage_drift_lookout_rate_margin_permille': (v: number) =>
    Math.min(400, Math.max(50, Math.round(v))),

  // insurance.coverage_drift_stash_safe_fill_threshold — range 500..950 (design §7 §1.1)
  'insurance.coverage_drift_stash_safe_fill_threshold': (v: number) =>
    Math.min(950, Math.max(500, Math.round(v))),

  // insurance.coverage_drift_contract_term_days — range 7..30 (design §7 §1.5 DD-RENEWAL)
  'insurance.coverage_drift_contract_term_days': (v: number) =>
    Math.min(30, Math.max(7, Math.round(v))),

  // insurance.coverage_drift_tilt_slight_threshold — range 5..60 (design §7 §1.7 [needs reviewer⊥])
  'insurance.coverage_drift_tilt_slight_threshold': (v: number) =>
    Math.min(60, Math.max(5, Math.round(v))),

  // insurance.coverage_drift_tilt_significant_threshold — range 40..150 (design §7 §1.7 [needs reviewer⊥])
  'insurance.coverage_drift_tilt_significant_threshold': (v: number) =>
    Math.min(150, Math.max(40, Math.round(v))),

  // insurance.coverage_drift_tilt_red_threshold — range 100..255 (design §7 §1.7 [needs reviewer⊥])
  'insurance.coverage_drift_tilt_red_threshold': (v: number) =>
    Math.min(255, Math.max(100, Math.round(v))),

  // NOTE: insurance.coverage_drift_base_loss_prob_permille is EXCLUDED from CAPS —
  // it is a (calibrate) sentinel with no safe numeric bounds until C15 closeout calibration.
};
