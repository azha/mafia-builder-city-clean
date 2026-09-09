// IMPLEMENTS: docs/tech/04a_operational_systems/precursors_supply_chain.md §True-state BO :137,:139
//             docs/superpowers/plans/2026-06-16-depth-d1c-impl-plan.md Task 7 (B7)
//             Pattern REUSE: services/game-back/src/operational/market/market-admin.controller.ts
//             — D1c B7 — 2026-06-16
//
// `PrecursorMarketAdminController` — BO true-state endpoints for the precursor market (P5 inversion:
// ops sees raw scalars; player never does — precursors_supply_chain.md §R2.2/P5).
//
// 2 GET true-state endpoints, role `gm` (≡ `ops` per global_conventions_backoffice.md §role-mapping
//   §Note: "placeholder `ops` (lecture étendue) est mappé à `gm`"):
//   GET /v1/admin/precursors/market-state          — raw price_trend / demand_accumulator /
//                                                     scarcity_active / disruption_event_id per type
//                                                     (:137, role ops ≡ gm)
//   GET /v1/admin/precursors/supplier-pressure     — raw pressure_counter for (playerId, supplierId)
//                                                     (role ops ≡ gm — hidden server-side scalar)
//
// 1 action endpoint, role `admin`:
//   POST /v1/admin/precursors/trigger-disruption   — BO live-ops trigger for supply disruption (DD-S)
//                                                     (:139, role admin)
//
// F3 two-person-rule: DEFERRED. this route is NOT WIRED to the ch17 approval workflow present in the
// codebase (same precedent as D1b C7 — market-admin.controller.ts:18-21). The trigger-disruption
// endpoint is gated by `requireStaffRole('admin')` only. When F3 is implemented (ch17 backlog),
// replace the admin-role-only guard with the two-person approval check. This is the 3rd F3-deferred
// endpoint (joining the D1b C7 TD-107 — dep ch17) and MUST be noted in the B8 closeout gate.
//
// Note on role mapping: `ops` in precursors_supply_chain.md:137 = `gm` in StaffRoleEnum
// (global_conventions_backoffice.md §Note: "placeholder `ops` (lecture étendue) est mappé à `gm`").
// `admin` in precursors_supply_chain.md:139 = `admin` in StaffRoleEnum (ordinal 3).
//
// REUSE: `requireStaffRole` from '../../auth/staff-role.guard' — exactly as market-admin.controller.ts:46.
// REUSE: `PrecursorMarketStateService.readMarketStateRow` (B2 persistence) — all rows via DB.
// REUSE: `PrecursorMarketStateService.onSupplyDisruption` (B4 DD-S trigger) — called by BO action.
// REUSE: `SupplierPressureService.readPressureRow` (B2 persistence) — true raw counter.
//
// NOT test-gated (unlike PrecursorMarketTestController): always registered (real production BO routes
// that must be available in production for ops/admin staff live monitoring).

import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';

import { requireStaffRole } from '../../auth/staff-role.guard';
import { PrecursorMarketStateService } from './precursor-market.service';
import { SupplierPressureService } from './precursor-supplier-pressure.service';

// ─── Request body shapes ───────────────────────────────────────────────────────

interface TriggerDisruptionBody {
  precursorType: string;
  eventId: string;
  durationDays?: number;
}

// ─── Controller ───────────────────────────────────────────────────────────────

/**
 * `PrecursorMarketAdminController` — production BO routes for precursor market true-state inspection
 * and live-ops supply-disruption action.
 *
 * Path prefix: `admin` — with the global `v1` prefix from main.ts `app.setGlobalPrefix('v1')` →
 * these routes are reachable at `/v1/admin/precursors/...`.
 *
 * NOT conditional on NODE_ENV (unlike PrecursorMarketTestController) — these are real production BO
 * routes needed for live ops monitoring (mirrors MarketAdminController registration in MarketModule).
 *
 * Registered in PrecursorMarketModule.controllers always-on (alongside PrecursorMarketTestController
 * which is test-gated; the admin controller is NOT test-gated — role-guarded instead).
 */
@Controller('admin')
export class PrecursorMarketAdminController {
  constructor(
    private readonly marketState: PrecursorMarketStateService,
    private readonly supplierPressure: SupplierPressureService,
  ) {}

  // ─── GET true-state endpoints (role `gm` ≡ ops) ─────────────────────────────

  /**
   * `GET /v1/admin/precursors/market-state`
   *
   * P5 BO INVERSION: returns all `precursor_market_state` rows — the raw hidden scalars that are
   * NEVER forwarded to the player (precursors_supply_chain.md:137, role `ops` ≡ `gm`):
   *   - precursor_type   (the row PK)
   *   - price_trend      (UP/STABLE/DOWN raw enum — player sees only the banded bucket)
   *   - demand_accumulator (hidden float — player never sees this)
   *   - scarcity_active  (boolean — the badge the player sees is this, but BO sees the full row)
   *   - disruption_event_id (null if no active disruption — hidden from player)
   *   - disruption_start_day (null if no active disruption — hidden from player)
   *   - last_inference_day (idempotence guard — server-side)
   *
   * Reads all rows from `precursor_market_state` via `readMarketStateRow` per known precursor types.
   * Returns an array of the raw row objects (BO-inversion: ops sees the hidden state).
   *
   * Role: `gm` (≡ `ops` per global_conventions_backoffice.md §role-mapping).
   */
  @Get('precursors/market-state')
  @UseGuards(requireStaffRole('gm'))
  async getMarketState() {
    // Read all rows from precursor_market_state (the 4 precursor types seeded at migration time).
    // The service provides readMarketStateRow per-type; we query all known types.
    // This is a BO-only inversion: the raw scalars are never forwarded to the player (P5).
    const PRECURSOR_TYPES = ['pyralin', 'thalmite', 'garnet_salt', 'verdant_root_extract', 'lull_resin', 'glass_lily'];
    const rows = await Promise.all(
      PRECURSOR_TYPES.map((type) => this.marketState.readMarketStateRow(type)),
    );
    // Filter out undefined (types not yet seeded) — return only the rows that exist.
    return rows.filter((r) => r !== undefined);
  }

  /**
   * `GET /v1/admin/precursors/supplier-pressure?playerId=<uuid>&supplierId=<uuid>`
   *
   * P5 BO INVERSION: returns the raw `pressure_counter` for a (player × supplier) pair —
   * the hidden server-side scalar that is NEVER forwarded to the player (R2.2, role `ops` ≡ `gm`).
   * The player sees only the banded `supplier_pressure_bucket` (FRESH/USED/STRAINED).
   *
   * Query params:
   *   - `playerId`   — the player UUID.
   *   - `supplierId` — the supplier UUID.
   *
   * Returns: `{ pressure_counter: number | null }` — null if no row exists yet for this pair.
   * Role: `gm` (≡ `ops` per global_conventions_backoffice.md §role-mapping).
   */
  @Get('precursors/supplier-pressure')
  @UseGuards(requireStaffRole('gm'))
  async getSupplierPressure(
    @Query('playerId') playerId: string,
    @Query('supplierId') supplierId: string,
  ) {
    const row = await this.supplierPressure.readPressureRow(
      playerId ?? '',
      supplierId ?? '',
    );
    // P5 BO inversion: expose raw pressure_counter to ops (null if no row exists yet).
    return { pressure_counter: row?.pressure_counter ?? null };
  }

  // ─── Action endpoint (role `admin`, F3 DEFERRED) ────────────────────────────

  /**
   * `POST /v1/admin/precursors/trigger-disruption`
   *
   * Live-ops action: trigger a supply disruption for a precursor type (DD-S exogenous shock).
   * Sets `scarcity_active=true` + `disruption_event_id` + `disruption_start_day` in
   * `precursor_market_state` via `PrecursorMarketStateService.onSupplyDisruption`.
   *
   * Body: { precursorType: string, eventId: string, durationDays?: number }
   *   - `precursorType` — the precursor type to disrupt (e.g. 'pyralin').
   *   - `eventId`       — the UUID of the SupplyDisruptionEvent (stored for live-ops tracing).
   *   - `durationDays`  — optional per-event duration (game-days); absent → NIGHTLY tick reads the
   *                       tunable `precursorTunables.supplyDisruptionDurationDays`.
   *
   * Returns: { precursorType, eventId, scarcity_active: true, f3_deferred: true }
   *
   * // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow.
   * // This is the 3rd F3-deferred endpoint (joining D1b C7 TD-107 — dep ch17). B8 closeout MUST
   * // record this deferral and join it to TD-107 for reviewer⊥ confirmation.
   * Role: `admin` (only; F3 would add a second-approver check on top when ch17 is implemented).
   */
  @Post('precursors/trigger-disruption')
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (D1b C7 carry-forward TD-107).
  @UseGuards(requireStaffRole('admin'))
  async triggerDisruption(@Body() body: TriggerDisruptionBody) {
    const { precursorType, eventId, durationDays } = body;
    // Trigger the DD-S exogenous supply disruption (B4 logic — onSupplyDisruption sets scarcity_active=true).
    const updatedRow = await this.marketState.onSupplyDisruption(
      String(precursorType ?? ''),
      String(eventId ?? ''),
      durationDays !== undefined ? Number(durationDays) : undefined,
    );
    // F3 DEFERRED marker — same precedent as market-admin.controller.ts:256 (D1b C7).
    return {
      precursorType,
      eventId,
      scarcity_active: updatedRow.scarcity_active,
      f3_deferred: true,
    };
  }
}
