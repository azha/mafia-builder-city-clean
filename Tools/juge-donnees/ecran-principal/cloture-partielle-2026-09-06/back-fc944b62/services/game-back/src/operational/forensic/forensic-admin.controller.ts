// IMPLEMENTS: docs/superpowers/plans/2026-06-19-depth-forensic-signaling-plan.md Task 4 (C4) + Task 25 (C25)
//             docs/superpowers/specs/2026-06-19-depth-forensic-signaling-design.md §9 (OQ-13)
//             Pattern: services/game-back/src/operational/insurance/insurance-admin.controller.ts
//             (INSURANCE_TUNABLE_CAPS + requireStaffRole guard — direct mirror)
//             Pattern: services/game-back/src/operational/reputation/reputation-admin.controller.ts
//             (REPUTATION_TUNABLE_CAPS:83 — direct mirror)
//             — Forensic C4 — 2026-06-19
//             — Forensic C25 — 2026-06-20 (adds the 3 BO routes)
//
// `ForensicAdminController` — BO admin endpoints for the forensic signaling mechanics (§5 P5 inversion).
//
// C4 STANDS UP ONLY THE `FORENSIC_TUNABLE_CAPS` clamper record.
// The 3 BO routes themselves land at C25 (per plan — routes depend on services not yet implemented):
//   GET  /v1/admin/players/:id/forensic-state  — true state (gm role) — C25
//   POST /v1/admin/players/:id/force-soft-flag — manual soft-flag (admin + F3 DEFERRED) — C25
//   PUT  /v1/admin/tunables/forensic           — tunable override (admin + F3 DEFERRED) — C25
//
// F3 two-person-rule: DEFERRED (TD-107 extension). Same precedent as InsuranceAdminController:21-24.
// The PUT tunables endpoint (C25) will be gated by `requireStaffRole('admin')` only until F3 is
// implemented (ch17 backlog).
//
// Note on role mapping: `ops` (if named in forensic_signaling_mechanics.md) = `gm` in StaffRoleEnum
// (global_conventions_backoffice.md §Note — same mapping as InsuranceAdminController:26-28).
// OQ-13: canon-says-`ops` divergence vs gm/admin (precedent); reconciled at C26 closeout.
//
// REUSE:
//   - Pattern mirrors `REPUTATION_TUNABLE_CAPS` (reputation-admin.controller.ts:83).
//   - `requireStaffRole` from '../../auth/staff-role.guard' (C25 routes).
//   - DB singleton (DbModule @Global — no explicit import needed).
//
// IMPORTANT: This file is NOT conditional on NODE_ENV (real BO routes — always-on in production).
//   Registered in ForensicSignalingModule.controllers alongside ForensicTestController (conditional).

// ── BO-allowed tunable keys for PUT /v1/admin/tunables/forensic (C25) ────────────────────────────
//
// REUSE pattern from reputation-admin.controller.ts:83 (REPUTATION_TUNABLE_CAPS).
// These are the T.forensic.* registry keys writable via BO live-ops.
// Capped to registry-resolved bounds (never inline literals — R2.3).
// The §7.1 canon keys + the §7.2 numeric dispatcher/projection keys.
// The 3 bucket-threshold rows (OQ-12) are EXCLUDED from live-ops caps (calibrate sentinel — no range).
//
// Key legend (runtime key → cap function bounded on gdd/14 §7.1/§7.2 ranges):
//   T.forensic.benford_chi2_threshold_H              range 8.0..24.0   (canon :228)
//   T.forensic.benford_ring_buffer_length            range 32..256     (canon :229, int)
//   T.forensic.benford_bookkeeper_cut_pct            range 3..15       (canon :230, int)
//   T.forensic.benford_audit_tick_days               range 3..14       (canon :231, int)
//   T.forensic.benford_hard_audit_softflags_window   (composite — not in live-ops caps; split via getters)
//   T.forensic.effluent_sigma_inspector_threshold    range 0.8..3.0    (canon :233)
//   T.forensic.effluent_baseline_per_district_normalised range 0.4..2.0 (canon :234)
//   T.forensic.effluent_window_days                  range 7..30       (canon :235, int)
//   T.forensic.effluent_recipe_count                 range 3..12       (canon :236, int)
//   T.forensic.standing_gap_G_threshold_mult         range 1.3..3.0    (canon :237)
//   T.forensic.standing_gap_consecutive_months       range 1..4        (canon :238, int)
//   T.forensic.standing_gap_typical_savings_rate     range 0.10..0.40  (canon :239)
//   T.forensic.standing_gap_tail_ramp_weeks          range 3..12       (canon :240, int)
//   T.forensic.front_dark_weeks_min                  range 1..4        (§7.2 [PROPOSED DEFAULT])
//   T.forensic.front_dark_weeks_max                  range 2..8        (§7.2 [PROPOSED DEFAULT])
//   T.forensic.days_per_month                        range 28..31      (§7.2 OQ-9)
//   T.forensic.dispatch_effluent_priority_high_deviation range 1.5..4.0  (§7.2 [PROPOSED DEFAULT])
//   T.forensic.hard_audit_seizure_pct                   range 0.05..0.75 (§7.2 C9 DD-SEIZURE-MAGNITUDE)
//
// EXCLUDED from live-ops (calibrate / OQ-12 reviewer⊥ pending):
//   T.forensic.audit_risk_bucket_thresholds          — (calibrate) OQ-12
//   T.forensic.effluent_visibility_bucket_thresholds — (calibrate) OQ-12
//   T.forensic.lifestyle_alarm_bucket_thresholds     — (calibrate) OQ-12

// ── Imports (C25 — live-ops BO routes) ────────────────────────────────────────────────────────────
//
// All imported here at C25; the file previously only exported FORENSIC_TUNABLE_CAPS (no imports needed).

import { Body, Controller, Get, HttpCode, Inject, Param, Post, Put, UseGuards } from '@nestjs/common';
import { sql, eq } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { tunableOverrides } from '../../db/schema/tunable_overrides';
import { ApiError } from '../../protocol/api-error';
import { requireStaffRole } from '../../auth/staff-role.guard';
import { LeadingDigitAuditService } from './leading-digit-audit.service';
import {
  ledgerEntryRing,
  blockEffluentRegister,
  lifestyleAuditState,
} from '../../db/schema/forensic';

// ── Soft-flag increment helper ────────────────────────────────────────────────
//
// `recordSoftFlag` (LeadingDigitAuditService) writes to forensic_soft_flag_ring + BPD memory,
// but does NOT increment ledger_entry_ring.soft_flag_count — that increment is done in
// runWeeklyAuditTick (the organic path) immediately before calling recordSoftFlag.
//
// For the force-soft-flag BO route, we replicate the organic sequence:
//   (a) increment soft_flag_count on ledger_entry_ring (if the front row exists),
//   (b) call recordSoftFlag (dual-write: BPD memory + flag_ticks ring).
// This is the REUSE approach (same path as the WEEKLY tick), not an invention.

// ─── Request body shapes ───────────────────────────────────────────────────────

interface ForceSoftFlagBody {
  /** The front building uuid to force a soft-flag on. */
  frontId: string;
}

interface PatchTunableBody {
  key: string;
  value: number;
}

// ─── Controller ───────────────────────────────────────────────────────────────

/**
 * `ForensicAdminController` — production BO routes for forensic true-state inspection
 * and live-ops actions (P5 BO inversion: ops sees raw hidden state that the player never does).
 *
 * Path prefix: `admin` — with the global `v1` prefix from main.ts `app.setGlobalPrefix('v1')` →
 * routes are reachable at `/v1/admin/players/:id/forensic-state`,
 * `/v1/admin/players/:id/force-soft-flag`, and `/v1/admin/tunables/forensic`.
 *
 * NOT conditional on NODE_ENV (unlike ForensicTestController) — these are real production BO routes
 * that must be available in production (ops and admin staff need them for live monitoring).
 *
 * Mounted always-on in ForensicSignalingModule.controllers (alongside the test-gated ForensicTestController).
 *
 * F3 two-person-rule: DEFERRED (TD-107 carry-forward from D1b/D1c/D2/Insurance §4.1/§4.2).
 * The 2 action endpoints are gated by `requireStaffRole('admin')` only until F3 is implemented.
 *
 * OQ-13 note: canon `:191` names `ops` for this surface; gm/admin per last-6-lots precedent used here.
 * Reconciled at C26 closeout (the ops-vs-gm divergence is documented, not a blocker).
 */
@Controller('admin')
export class ForensicAdminController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly leadingDigitAudit: LeadingDigitAuditService,
  ) {}

  // ─── GET true-state endpoint (role `gm` ≡ ops) ───────────────────────────

  /**
   * `GET /v1/admin/players/:id/forensic-state`
   *
   * P5 BO INVERSION: returns the raw true state for all forensic entities for a player.
   * The raw hidden scalars returned here (last_chi_square, soft_flag_count, last_deviation,
   * last_gap, tail_ramp_stage) are NEVER forwarded to the player (R2.2 P5 invariant).
   * Ops staff uses this for live forensic monitoring.
   *
   * Returns:
   *   - player_id
   *   - fronts: all ledger_entry_ring rows (per-front χ² + soft_flag_count + dark horizon)
   *   - blocks: all block_effluent_register rows (per-block deviation + effluent window)
   *   - lieutenants: all lifestyle_audit_state rows (per-lieutenant gap + tail stage)
   *
   * NO R2.2 banding here — this is the P5 BO inversion: raw server-side state for ops.
   * last_chi_square, last_deviation, last_gap are intentionally included (they are the point of the BO route).
   *
   * Role: `gm` (≡ `ops` per global_conventions_backoffice.md §role-mapping; OQ-13 divergence at C26).
   * NOT F3-gated (read-only, ops monitoring surface — same as §4.1 insurance-state / §4.2 drift-state).
   */
  @Get('players/:id/forensic-state')
  @UseGuards(requireStaffRole('gm'))
  async getForensicState(@Param('id') playerId: string) {
    // P5 BO inversion: aggregate all per-player forensic entities.
    // Raw scalars (last_chi_square, last_deviation, last_gap) are intentionally included (BO-only).

    const fronts = await this.db
      .select()
      .from(ledgerEntryRing)
      .where(eq(ledgerEntryRing.player_id, playerId));

    const blocks = await this.db
      .select()
      .from(blockEffluentRegister)
      .where(eq(blockEffluentRegister.player_id, playerId));

    const lieutenants = await this.db
      .select()
      .from(lifestyleAuditState)
      .where(eq(lifestyleAuditState.player_id, playerId));

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
      fronts: serializeBigints(fronts as Record<string, unknown>[]),
      blocks: serializeBigints(blocks as Record<string, unknown>[]),
      lieutenants: serializeBigints(lieutenants as Record<string, unknown>[]),
    };
  }

  // ─── 2 action endpoints (role `admin`, F3 DEFERRED — TD-107 carry-forward) ───────────────────

  /**
   * `POST /v1/admin/players/:id/force-soft-flag`
   *
   * Live-ops action: forces a soft-flag on a given front for a player.
   * Calls LeadingDigitAuditService.recordSoftFlag (the same path as the organic WEEKLY/9 soft-flag).
   * The force uses weekId=0 and precinctId=1 (sentinel values for the BO forced path;
   * no real game-tick context, mirrors InsuranceAdminController.forceFraudDetection:currentGameTick=0).
   *
   * This increments soft_flag_count and writes to the forensic_soft_flag_ring.
   * If the windowed flag count >= benfordHardAuditSoftflagsCount (3), also triggers a hard audit.
   *
   * Body: { frontId: string }
   * Returns: { playerId, frontId, f3_deferred: true }
   *
   * F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow.
   * Same TD-107 precedent as D1b C7 / D1c B7 / D2 R12a / InsuranceAdminController C12.
   * R26 closeout MUST join this to TD-107.
   *
   * Role: `admin` (only; F3 would add a second-approver check when ch17 is implemented).
   *
   * OQ-13 note: canon-says-`ops` vs gm/admin precedent. Reconciled at C26.
   */
  @Post('players/:id/force-soft-flag')
  @HttpCode(200)
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD-107 carry-forward from D1b/D1c/D2/C12/C14).
  // F3 TwoPersonApproval: the ch17 workflow shipped in migration 0152; wiring this guard to it is TD-107.
  @UseGuards(requireStaffRole('admin'))
  async forceSoftFlag(@Param('id') playerId: string, @Body() body: ForceSoftFlagBody) {
    const { frontId } = body;

    // REUSE the organic soft-flag sequence (mirrors runWeeklyAuditTick, C7):
    //   (a) increment soft_flag_count on ledger_entry_ring (organic: runWeeklyAuditTick:339).
    //   (b) dual-write via recordSoftFlag (organic: runWeeklyAuditTick:344).
    // weekId=0: sentinel for BO forced path (no real game-tick context — mirrors InsuranceAdminController:238).
    // precinctId=1: sentinel for BO forced path (no district-to-precinct lookup in this context;
    //   the production path derives precinctId from front geography, C23; the BO override uses 1).
    const FORCED_WEEK_ID = 0;
    const FORCED_PRECINCT_ID = 1;

    // (a) Increment soft_flag_count on the ledger_entry_ring row for this front.
    //     The organic path (runWeeklyAuditTick:339) does this BEFORE calling recordSoftFlag.
    //     We replicate the sequence: increment first, then dual-write.
    //     If the front has no ring row (player not yet tracked), this is a no-op (mirrors no-op organic).
    await this.db
      .update(ledgerEntryRing)
      .set({
        soft_flag_count: sql`${ledgerEntryRing.soft_flag_count} + 1`,
      })
      .where(eq(ledgerEntryRing.front_id, frontId));

    // (b) Dual-write via recordSoftFlag: BPD memory (appendDeclarationEntry) + flag_ticks ring.
    //     REUSE the exact same code path as the organic WEEKLY/9 tick (C8/C9).
    await this.leadingDigitAudit.recordSoftFlag(playerId, frontId, FORCED_PRECINCT_ID, FORCED_WEEK_ID);

    // F3 DEFERRED marker — same precedent as InsuranceAdminController:246-248.
    return {
      playerId,
      frontId,
      f3_deferred: true,
    };
  }

  /**
   * `PUT /v1/admin/tunables/forensic`
   *
   * Live-ops tunable edit: upserts a forensic tunable override into the `tunable_overrides` table.
   * The TunablesStore auto-reloads via NOTIFY (postgres LISTEN channel `tunables_changed`).
   *
   * Allowed keys: see FORENSIC_TUNABLE_CAPS (the BO live-ops balance levers).
   * Body: { key: string, value: number }
   * Returns: { key, clampedValue, f3_deferred: true }
   *
   * REUSE pattern: insurance-admin.controller.ts:267-302 (PUT tunables/insurance).
   *
   * // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow.
   * // Same TD-107 precedent. R26 closeout MUST join this to TD-107.
   * Role: `admin` (only; F3 would add a second-approver check when ch17 is implemented).
   *
   * OQ-13 note: canon-says-`ops` vs gm/admin precedent. Reconciled at C26.
   */
  @Put('tunables/forensic')
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD-107 carry-forward from D1b/D1c/D2/C12/C14).
  @UseGuards(requireStaffRole('admin'))
  async patchForensicTunable(@Body() body: PatchTunableBody) {
    const { key, value } = body;
    const capFn = FORENSIC_TUNABLE_CAPS[key];
    if (!capFn) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `Unknown forensic tunable key: '${key}'. Allowed: ${Object.keys(FORENSIC_TUNABLE_CAPS).join(', ')}`,
      });
    }
    // Apply BO cap (never inline — all magnitudes from ranges in FORENSIC_TUNABLE_CAPS above).
    const clampedValue = capFn(Number(value));

    // Upsert into tunable_overrides (TunablesStore auto-reloads via LISTEN `tunables_changed`).
    // REUSE: insurance-admin.controller.ts upsert pattern.
    await this.db
      .insert(tunableOverrides)
      .values({
        key,
        value: String(clampedValue),
        updated_at: sql`now()`,
        updated_by: 'forensic-admin-c25',
      })
      .onConflictDoUpdate({
        target: [tunableOverrides.key],
        set: {
          value: String(clampedValue),
          updated_at: sql`now()`,
          updated_by: 'forensic-admin-c25',
        },
      });

    // F3 DEFERRED marker — same precedent as insurance-admin.controller.ts:300-302.
    return { key, clampedValue, f3_deferred: true };
  }
}

// ── FORENSIC_TUNABLE_CAPS ──────────────────────────────────────────────────────

export const FORENSIC_TUNABLE_CAPS: Record<string, (value: number) => number> = {
  // canon :228 — float range 8.0..24.0
  'T.forensic.benford_chi2_threshold_H': (v: number) =>
    Math.min(24.0, Math.max(8.0, Number(v))),

  // canon :229 — int range 32..256
  'T.forensic.benford_ring_buffer_length': (v: number) =>
    Math.min(256, Math.max(32, Math.round(v))),

  // canon :230 — int range 3..15
  'T.forensic.benford_bookkeeper_cut_pct': (v: number) =>
    Math.min(15, Math.max(3, Math.round(v))),

  // canon :231 — int range 3..14
  'T.forensic.benford_audit_tick_days': (v: number) =>
    Math.min(14, Math.max(3, Math.round(v))),

  // canon :233 — float range 0.8..3.0
  'T.forensic.effluent_sigma_inspector_threshold': (v: number) =>
    Math.min(3.0, Math.max(0.8, Number(v))),

  // canon :234 — float range 0.4..2.0
  'T.forensic.effluent_baseline_per_district_normalised': (v: number) =>
    Math.min(2.0, Math.max(0.4, Number(v))),

  // §7.2 [PROPOSED DEFAULT][PROV-Y26Q2] — DD-BASELINE-PERTURBATION (C14) — float range 0.0..0.5
  'T.forensic.effluent_baseline_day_perturbation_band': (v: number) =>
    Math.min(0.5, Math.max(0.0, Number(v))),

  // canon :235 — int range 7..30
  'T.forensic.effluent_window_days': (v: number) =>
    Math.min(30, Math.max(7, Math.round(v))),

  // canon :236 — int range 3..12
  'T.forensic.effluent_recipe_count': (v: number) =>
    Math.min(12, Math.max(3, Math.round(v))),

  // canon :237 — float range 1.3..3.0
  'T.forensic.standing_gap_G_threshold_mult': (v: number) =>
    Math.min(3.0, Math.max(1.3, Number(v))),

  // canon :238 — int range 1..4
  'T.forensic.standing_gap_consecutive_months': (v: number) =>
    Math.min(4, Math.max(1, Math.round(v))),

  // canon :239 — float range 0.10..0.40
  'T.forensic.standing_gap_typical_savings_rate': (v: number) =>
    Math.min(0.40, Math.max(0.10, Number(v))),

  // canon :240 — int range 3..12
  'T.forensic.standing_gap_tail_ramp_weeks': (v: number) =>
    Math.min(12, Math.max(3, Math.round(v))),

  // §7.2 [PROPOSED DEFAULT][PROV-Y26Q2] — int range 1..4
  'T.forensic.front_dark_weeks_min': (v: number) =>
    Math.min(4, Math.max(1, Math.round(v))),

  // §7.2 [PROPOSED DEFAULT][PROV-Y26Q2] — int range 2..8
  'T.forensic.front_dark_weeks_max': (v: number) =>
    Math.min(8, Math.max(2, Math.round(v))),

  // §7.2 OQ-9 — int range 28..31
  'T.forensic.days_per_month': (v: number) =>
    Math.min(31, Math.max(28, Math.round(v))),

  // §7.2 [PROPOSED DEFAULT][PROV-Y26Q2] — float range 1.5..4.0
  'T.forensic.dispatch_effluent_priority_high_deviation': (v: number) =>
    Math.min(4.0, Math.max(1.5, Number(v))),

  // §7.2 C9 [PROPOSED DEFAULT][PROV-Y26Q2] — float range 0.05..0.75
  'T.forensic.hard_audit_seizure_pct': (v: number) =>
    Math.min(0.75, Math.max(0.05, Number(v))),

  // §7.2 C16 [PROPOSED DEFAULT][PROV-Y26Q2] — int range 5000..50000
  // DD-VISIBLE-STANDARD-COST: visible_standard_cost = visible_standard_index × centsPerIndex.
  // Default 10000 ($100/tier step). PROVISIONAL linear model (canon says tier table, not cost-per-index;
  // the real tier table is the calibration-TD deliverable at C26). Mirrors the C14 band entry at :98.
  'T.forensic.standing_gap_visible_standard_cents_per_index': (v: number) =>
    Math.min(50000, Math.max(5000, Math.round(v))),

  // §7.2 C20 [PROPOSED DEFAULT][PROV-Y26Q2] — float range 1.05..2.0 (DD-SEVERITY-BAND A medium)
  'T.forensic.benford_chi2_band_medium_mult': (v: number) =>
    Math.min(2.0, Math.max(1.05, Number(v))),

  // §7.2 C20 [PROPOSED DEFAULT][PROV-Y26Q2] — float range 1.5..4.0 (DD-SEVERITY-BAND A high)
  'T.forensic.benford_chi2_band_high_mult': (v: number) =>
    Math.min(4.0, Math.max(1.5, Number(v))),

  // §7.2 C20 [PROPOSED DEFAULT][PROV-Y26Q2] — float range 2.5..8.0 (DD-SEVERITY-BAND A critical)
  'T.forensic.benford_chi2_band_critical_mult': (v: number) =>
    Math.min(8.0, Math.max(2.5, Number(v))),

  // §7.2 C20 [PROPOSED DEFAULT][PROV-Y26Q2] — float range 1.05..1.66 (DD-SEVERITY-BAND B medium × σ)
  'T.forensic.effluent_deviation_band_medium_mult': (v: number) =>
    Math.min(1.66, Math.max(1.05, Number(v))),

  // §7.2 C20 [PROPOSED DEFAULT][PROV-Y26Q2] — float range 1.66..4.0 (DD-SEVERITY-BAND B critical × σ)
  'T.forensic.effluent_deviation_band_critical_mult': (v: number) =>
    Math.min(4.0, Math.max(1.66, Number(v))),

  // NOTE: T.forensic.audit_risk_bucket_thresholds, T.forensic.effluent_visibility_bucket_thresholds,
  // and T.forensic.lifestyle_alarm_bucket_thresholds are EXCLUDED from CAPS —
  // they are (calibrate) placeholders with no safe numeric bounds (OQ-12).
};
