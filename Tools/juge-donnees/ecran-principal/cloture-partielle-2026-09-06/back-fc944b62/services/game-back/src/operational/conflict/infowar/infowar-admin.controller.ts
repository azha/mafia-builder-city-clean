// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-C-diplomacy-infowar-plan.md Task 11 (C11)
//             Design: docs/superpowers/specs/2026-06-24-04b-C-diplomacy-infowar-design.md §11
//             Pattern: services/game-back/src/operational/insurance/insurance-admin.controller.ts
//             — Diplomacy & Information Warfare C C11 — 2026-06-26 —
//
// `InformationWarfareAdminController` — production BO routes for info-warfare true-state inspection.
//
// Routes:
//   GET  /v1/admin/players/:id/info-warfare-state — ops true-state (requireStaffRole('gm') ≡ ops)
//
// F3 two-person-rule DEFERRED (TD-107):
//   POST /v1/admin/infowar/force-rival-detection — admin-gated (F3 DEFERRED, NOT implemented)
//   → NOT implemented. A real comment, not a silent omission. Documented here so reviewer ⊥ can
//     confirm the F3 mutators are traceable (plan §C11 + TD-107 extension from D2/D1b/insurance).
//
// P5 BO INVERSION (R2.2):
//   GET returns raw hidden scalars (detection_probability, rival_interpretation_bias,
//   suspected_infiltration_level, coil_corruption_applied) that the player NEVER sees.
//   Ops staff uses this for live info-warfare monitoring.
//   NO player route returns raw scalars — only this BO endpoint carries true state.
//
// Role mapping: `ops` in information_warfare_mechanics.md ≡ `gm` in StaffRoleEnum
//   (global_conventions_backoffice.md §Note — same mapping as InsuranceAdminController:26).
//
// NOT conditional on NODE_ENV (real BO routes — always-on in production).
//   Registered in InformationWarfareModule.controllers alongside InformationWarfareTestController.
//
// REUSE:
//   Pattern mirrors `InsuranceAdminController` (insurance-admin.controller.ts).
//   `requireStaffRole` from '../../auth/staff-role.guard' — JWT-based, NOT a spoofable header
//   (the D2/9b/9c BO-spoof lesson: x-staff-role header is never trusted; guard reads Bearer JWT).

import { Controller, Get, Inject, Param, UseGuards } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import type { DrizzleClient } from '../../../db';
import { DB } from '../../../db/db.module';
import {
  deadReckoningBelief,
  dualUseSignalState,
  surveillanceOp,
  purgeTrapState,
} from '../../../db/schema/conflict_infowar';
import { requireStaffRole } from '../../../auth/staff-role.guard';

// ─── Utility: serialize bigint fields as strings for JSON transport ─────────────────────────────
// Pattern mirrors InsuranceAdminController:178-186 (serializeBigints).
function serializeBigints(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      out[k] = typeof v === 'bigint' ? String(v) : v;
    }
    return out;
  });
}

// ─── Controller ────────────────────────────────────────────────────────────────────────────────

/**
 * `InformationWarfareAdminController` — production BO routes for info-warfare true-state inspection.
 *
 * Path prefix: `admin` — with the global `v1` prefix from main.ts `app.setGlobalPrefix('v1')` →
 * routes are reachable at `/v1/admin/players/:id/info-warfare-state`.
 *
 * NOT conditional on NODE_ENV (unlike InformationWarfareTestController) — real production BO routes.
 * F3 two-person-rule: DEFERRED (TD-107). Same precedent as InsuranceAdminController:121.
 */
@Controller('admin')
export class InformationWarfareAdminController {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  // ─── GET true-state endpoint (role `gm` ≡ ops) ──────────────────────────────────────────────

  /**
   * `GET /v1/admin/players/:id/info-warfare-state`
   *
   * P5 BO INVERSION: returns the raw true state for all info-warfare entities for a player.
   * The raw hidden scalars (detection_probability, rival_interpretation_bias,
   * suspected_infiltration_level, coil_corruption_applied, last_bpd_prior_mass)
   * are NEVER forwarded to the player (R2.2 P5). Ops staff uses this for live monitoring.
   *
   * Returns (all arrays — multi-rival players will have multiple rows):
   *   - belief_states:      all dead_reckoning_belief rows (incl. coil_corruption_applied + 6 bands)
   *   - dual_use_states:    all dual_use_signal_state rows (incl. rival_interpretation_bias float)
   *   - surveillance_ops:   all surveillance_op rows (incl. detection_probability float)
   *   - purge_trap_states:  all purge_trap_state rows (incl. suspected_infiltration_level float)
   *
   * NO R2.2 banding here — P5 BO inversion: raw server-side state for ops.
   * Role: `gm` (≡ `ops` per global_conventions_backoffice.md §role-mapping).
   *
   * F3 DEFERRED MUTATOR (NOT IMPLEMENTED — TD-107):
   *   POST /v1/admin/infowar/force-rival-detection
   *   → documented-deferred; not a silent omission; requires F3 two-person-rule (ch17 backlog).
   */
  @Get('players/:id/info-warfare-state')
  @UseGuards(requireStaffRole('gm'))
  async getInfoWarState(@Param('id') playerId: string) {
    // P5 BO inversion: aggregate all per-player info-warfare entities.
    // Raw scalars (detection_probability, rival_interpretation_bias, etc.) are intentionally included.

    const beliefStates = await this.db
      .select()
      .from(deadReckoningBelief)
      .where(eq(deadReckoningBelief.player_id, playerId));

    const dualUseStates = await this.db
      .select()
      .from(dualUseSignalState)
      .where(eq(dualUseSignalState.player_id, playerId));

    const surveillanceOps = await this.db
      .select()
      .from(surveillanceOp)
      .where(eq(surveillanceOp.player_id, playerId));

    const purgeTrapStates = await this.db
      .select()
      .from(purgeTrapState)
      .where(eq(purgeTrapState.player_id, playerId));

    // Serialize bigint fields as strings for JSON transport (JSON.stringify cannot handle bigint).
    return {
      player_id:          playerId,
      belief_states:      serializeBigints(beliefStates as Record<string, unknown>[]),
      dual_use_states:    serializeBigints(dualUseStates as Record<string, unknown>[]),
      surveillance_ops:   serializeBigints(surveillanceOps as Record<string, unknown>[]),
      purge_trap_states:  serializeBigints(purgeTrapStates as Record<string, unknown>[]),
      // F3 DEFERRED mutators (not implemented — TD-107 extend):
      //   POST /v1/admin/infowar/force-rival-detection — requireStaffRole('admin')
      //   Requires F3 two-person-rule (ch17 backlog). Same precedent as InsuranceAdminController:121.
    };
  }
}
