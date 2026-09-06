// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-C-diplomacy-infowar-plan.md Task 11 (C11)
//             Design: docs/superpowers/specs/2026-06-24-04b-C-diplomacy-infowar-design.md §11
//             Pattern: services/game-back/src/operational/insurance/insurance-admin.controller.ts
//             — Diplomacy & Information Warfare C C11 — 2026-06-26 —
//
// `DiplomacyAdminController` — production BO routes for diplomacy true-state inspection (P5 BO inversion).
//
// Routes:
//   GET  /v1/admin/players/:id/diplomacy-state — ops true-state (requireStaffRole('gm') ≡ ops)
//
// F3 two-person-rule DEFERRED (TD-107):
//   POST /v1/admin/diplomacy/force-credibility-adjust — admin-gated (F3 DEFERRED, NOT implemented)
//   → NOT implemented. A real comment, not a silent omission. Documented here so reviewer ⊥ can
//     confirm the F3 mutators are traceable (plan §C11 + TD-107 extension from D2/D1b/insurance).
//
// P5 BO INVERSION (R2.2):
//   GET returns raw hidden scalars (credibility float, trust_decay, commitment_ledger,
//   leverage_tokens, etc.) that the player NEVER sees. Ops staff uses this for live monitoring.
//   These are the server-side values the projection strips before the player sees them.
//   NO player route returns raw scalars — only this BO endpoint carries true state.
//
// Role mapping: `ops` in diplomacy_mechanics.md ≡ `gm` in StaffRoleEnum
//   (global_conventions_backoffice.md §Note — same mapping as InsuranceAdminController:26).
//
// NOT conditional on NODE_ENV (real BO routes — always-on in production).
//   Registered in DiplomacyModule.controllers alongside DiplomacyTestController (conditional).
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
  diplomacyPairState,
  credibilityState,
  publicLedgerEntry,
  sharedExposureLock,
} from '../../../db/schema/conflict_diplomacy';
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
 * `DiplomacyAdminController` — production BO routes for diplomacy true-state inspection.
 *
 * Path prefix: `admin` — with the global `v1` prefix from main.ts `app.setGlobalPrefix('v1')` →
 * routes are reachable at `/v1/admin/players/:id/diplomacy-state`.
 *
 * NOT conditional on NODE_ENV (unlike DiplomacyTestController) — real production BO routes.
 * F3 two-person-rule: DEFERRED (TD-107). Same precedent as InsuranceAdminController:121.
 */
@Controller('admin')
export class DiplomacyAdminController {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  // ─── GET true-state endpoint (role `gm` ≡ ops) ──────────────────────────────────────────────

  /**
   * `GET /v1/admin/players/:id/diplomacy-state`
   *
   * P5 BO INVERSION: returns the raw true state for all diplomacy entities for a player.
   * The raw hidden scalars (credibility float, trust_decay, commitment_ledger, leverage_tokens,
   * skepticism_thresholds, shared_bpd_attention) are NEVER forwarded to the player (R2.2 P5).
   * Ops staff uses this for live diplomacy monitoring.
   *
   * Returns (all arrays — multi-rival players will have multiple rows):
   *   - pair_states:           all diplomacy_pair_state rows (trust_decay, commitment_ledger, etc.)
   *   - credibility_states:    all credibility_state rows (the raw credibility float)
   *   - ledger_entries:        all public_ledger_entry rows (the ONE P5 exception — visible to rivals)
   *   - shared_exposure_locks: all shared_exposure_lock rows (shared_bpd_attention float)
   *
   * NO R2.2 banding here — P5 BO inversion: raw server-side state for ops.
   * Role: `gm` (≡ `ops` per global_conventions_backoffice.md §role-mapping).
   *
   * F3 DEFERRED MUTATOR (NOT IMPLEMENTED — TD-107):
   *   POST /v1/admin/diplomacy/force-credibility-adjust
   *   → documented-deferred; not a silent omission; requires F3 two-person-rule (ch17 backlog).
   */
  @Get('players/:id/diplomacy-state')
  @UseGuards(requireStaffRole('gm'))
  async getDiplomacyState(@Param('id') playerId: string) {
    // P5 BO inversion: aggregate all per-player diplomacy entities.
    // All raw server-side scalars are intentionally included (it is the point of the BO route).

    const pairStates = await this.db
      .select()
      .from(diplomacyPairState)
      .where(eq(diplomacyPairState.player_id, playerId));

    const credibilityStates = await this.db
      .select()
      .from(credibilityState)
      .where(eq(credibilityState.player_id, playerId));

    const ledgerEntries = await this.db
      .select()
      .from(publicLedgerEntry)
      .where(eq(publicLedgerEntry.player_id, playerId));

    const sharedExposureLocks = await this.db
      .select()
      .from(sharedExposureLock)
      .where(eq(sharedExposureLock.player_id, playerId));

    // Serialize bigint fields as strings for JSON transport (JSON.stringify cannot handle bigint).
    return {
      player_id:             playerId,
      pair_states:           serializeBigints(pairStates as Record<string, unknown>[]),
      credibility_states:    serializeBigints(credibilityStates as Record<string, unknown>[]),
      ledger_entries:        serializeBigints(ledgerEntries as Record<string, unknown>[]),
      shared_exposure_locks: serializeBigints(sharedExposureLocks as Record<string, unknown>[]),
      // F3 DEFERRED mutators (not implemented — TD-107 extend):
      //   POST /v1/admin/diplomacy/force-credibility-adjust — requireStaffRole('admin')
      //   Requires F3 two-person-rule (ch17 backlog). Same precedent as InsuranceAdminController:121.
    };
  }
}
