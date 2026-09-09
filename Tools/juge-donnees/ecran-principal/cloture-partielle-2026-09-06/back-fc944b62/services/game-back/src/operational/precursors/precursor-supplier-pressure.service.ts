// IMPLEMENTS: docs/superpowers/plans/2026-06-16-depth-d1c-impl-plan.md Task 1 (B1) + Task 2 (B2) + Task 5 (B5)
//             docs/tech/04a_operational_systems/precursors_supply_chain.md §player_supplier_pressure
//             docs/tech/09_data_model/schema_precursor_market_state.md §2 (R9.3 backport — B2)
//             — D1c B1+B2+B5 — 2026-06-16
//
// `SupplierPressureService` — persistence accessors + pressure accumulation + observable bucket (B5).
//
// B1 = EMPTY SHELL: registered as a provider so PrecursorMarketModule wires without error.
//
// B2 = PERSISTENCE: adds repository read/upsert for `precursor_supplier_pressure` rows.
//   - `readPressureRow(playerId, supplierId)` — reads a specific (player × supplier) pressure row.
//   - `upsertPressureRow(playerId, supplierId, pressureCounter)` — INSERT ... ON CONFLICT DO UPDATE
//     to set the pressure_counter for a given (player × supplier) pair.
//
// B5 = ACCUMULATION + OBSERVABLE BUCKET:
//   - `recordSupplierOrder(playerId, supplierId)` — atomically increments `pressure_counter`
//     (SQL SET pressure_counter = pressure_counter + 1, upsert if absent). Analogous to
//     recordOrderDemand (B3 accumulator pattern). Server-side only — the raw counter is NEVER
//     forwarded to the client (R2.2 P5, like reputation_risk_counter :127,256).
//   - `getSupplierPressure(playerId, supplierId): SupplierPressureBucket` — projects the hidden
//     counter → FRESH/USED/STRAINED via the banding cut-points (presentation band, R2.2). The
//     BUCKET is the ONLY observable (not the counter). ZERO price coupling — this service is NOT
//     called from the buy-path price helper (DD-SP). Observable-only contract: the consumer of the
//     bucket (the Reputation lot) lives elsewhere.
//
// CUT-POINTS — PRESENTATION BAND DECISION:
//   FRESH/USED/STRAINED boundaries are a closed qualitative domain (like StockBand cut-points at
//   precursors.projection.service.ts:71-72). They are NOT sim-balance tunables (no timing/cost/
//   drop-rate/threshold exposed). Analogous to STOCK_BAND_LOW_MAX=10 / STOCK_BAND_MEDIUM_MAX=50.
//   Inlined as presentation-band constants (not flagged [PROPOSED DEFAULT] because they control
//   only the observable label, not any simulation parameter).
//   FRESH  : counter  0..PRESSURE_USED_MIN-1   (first/light contact — supplier barely knows the player)
//   USED   : counter  PRESSURE_USED_MIN..PRESSURE_STRAINED_MIN-1 (regular contact — relationship warming)
//   STRAINED: counter ≥ PRESSURE_STRAINED_MIN   (heavy contact — supplier under pressure)
//
// R2.2: pressure_counter is HIDDEN server-side.
//   Player surface: SupplierPressureBucket (FRESH/USED/STRAINED) — this service maps the counter.
//   BO true-state: GET /admin/precursors/market-state (role ops).
//
// DD-SP: ZERO price coupling. `SupplierPressureService` is NOT imported or called from
//   `precursor-market.service.ts` price methods (`getEffectiveScarcityMultiplier` / B6 buy path).
//   The price↔pressure coupling is reserved for a future Reputation lot.

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, max, sql } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import {
  precursorSupplierPressure,
  type PrecursorSupplierPressureRow,
} from '../../db/schema/precursor_market_state';

/** The R2.2-compliant supplier pressure band (precursors_supply_chain.md:129).
 *  CLOSED DOMAIN — only these three values are valid. The raw counter is NEVER forwarded. */
export type SupplierPressureBand = 'FRESH' | 'USED' | 'STRAINED';

/** The R2.2 observable bucket returned to callers (client-facing shape — counter hidden). */
export interface SupplierPressureBucket {
  /** Closed qualitative domain: FRESH | USED | STRAINED. The counter is server-side only (P5). */
  supplier_pressure_bucket: SupplierPressureBand;
}

// ── Presentation band cut-points (analogous to STOCK_BAND_* in precursors.projection.service.ts:71-72) ──
// These control the observable label ONLY — not any simulation parameter. Not flagged [PROPOSED DEFAULT]
// because they are a closed presentation domain (like StockBand), not a sim-balance tunable.
//   0..4        → FRESH   (first/light contact — supplier barely knows the player)
//   5..14       → USED    (regular contact — relationship warming)
//   15+         → STRAINED (heavy contact — supplier under pressure)
const PRESSURE_USED_MIN = 5;     // counter ≥ 5 → USED
const PRESSURE_STRAINED_MIN = 15; // counter ≥ 15 → STRAINED

@Injectable()
export class SupplierPressureService {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  // ─────────────────────── persistence accessors (B2) ────────────────────────

  /**
   * `readPressureRow(playerId, supplierId)` — reads the `precursor_supplier_pressure` row for (player × supplier).
   *
   * Returns the row if it exists, or undefined if no pressure has been accumulated yet.
   * The row is the server-side true-state (hidden from the client per R2.2 — bucket only exposed).
   */
  async readPressureRow(
    playerId: string,
    supplierId: string,
  ): Promise<PrecursorSupplierPressureRow | undefined> {
    const [row] = await this.db
      .select()
      .from(precursorSupplierPressure)
      .where(
        and(
          eq(precursorSupplierPressure.player_id, playerId),
          eq(precursorSupplierPressure.supplier_id, supplierId),
        ),
      );
    return row;
  }

  /**
   * `upsertPressureRow(playerId, supplierId, pressureCounter)` — upsert the pressure counter.
   *
   * INSERT ... ON CONFLICT (player_id, supplier_id) DO UPDATE SET pressure_counter = excluded.pressure_counter
   * so callers can set a specific counter value (B5 will own accumulation logic and call with the
   * incremented value; B2 simply exposes the persistence layer for E2E verification).
   *
   * The pressure_counter is a hidden server-side scalar (R2.2 — never forwarded raw to the client).
   * Returns the updated row after upsert.
   */
  async upsertPressureRow(
    playerId: string,
    supplierId: string,
    pressureCounter: number,
  ): Promise<PrecursorSupplierPressureRow> {
    await this.db
      .insert(precursorSupplierPressure)
      .values({
        player_id: playerId,
        supplier_id: supplierId,
        pressure_counter: pressureCounter,
      })
      .onConflictDoUpdate({
        target: [precursorSupplierPressure.player_id, precursorSupplierPressure.supplier_id],
        set: {
          pressure_counter: pressureCounter,
          updated_at: new Date(),
        },
      });

    const row = await this.readPressureRow(playerId, supplierId);
    if (!row) throw new Error(`upsertPressureRow: row missing after upsert for (${playerId}, ${supplierId})`);
    return row;
  }

  // ─────────────────────── B5: accumulation + observable bucket ─────────────────

  /**
   * `recordSupplierOrder(playerId, supplierId)` — atomically increments `pressure_counter` for
   * the (player × supplier) pair, upserting the row if it does not yet exist.
   *
   * Uses a SQL-level atomic increment (`SET pressure_counter = pressure_counter + 1`) — analogous
   * to `recordOrderDemand`'s accumulator pattern (B3). Never reads the counter before writing:
   * the DB handles the increment atomically (no lost-update race).
   *
   * The raw counter is NEVER returned to the client (R2.2 P5). The player-facing observable
   * is `getSupplierPressure()` which projects the counter → FRESH/USED/STRAINED.
   *
   * TRIGGER PATH (D1c): driven via the `_test` route only (no supplier_id exists on the order path
   * in D1c — precursors.service.ts confirms zero supplier refs). The production buy path will call
   * this in a future Reputation lot.
   *
   * @param playerId — the player UUID (FK → player(player_id)).
   * @param supplierId — the supplier UUID identity (no supplier table in D1c).
   */
  async recordSupplierOrder(playerId: string, supplierId: string): Promise<void> {
    // Atomic upsert: INSERT row with counter=1 if absent; else increment by 1.
    // This is the same single-SQL-statement atomic increment pattern used by recordOrderDemand (B3).
    await this.db
      .insert(precursorSupplierPressure)
      .values({
        player_id: playerId,
        supplier_id: supplierId,
        pressure_counter: 1,
      })
      .onConflictDoUpdate({
        target: [precursorSupplierPressure.player_id, precursorSupplierPressure.supplier_id],
        set: {
          pressure_counter: sql`${precursorSupplierPressure.pressure_counter} + 1`,
          updated_at: new Date(),
        },
      });
  }

  /**
   * `getSupplierPressure(playerId, supplierId): SupplierPressureBucket` — projects the hidden
   * `pressure_counter` → `FRESH | USED | STRAINED` via the presentation-band cut-points.
   *
   * R2.2: only the `supplier_pressure_bucket` is returned — the raw `pressure_counter` is NEVER
   * forwarded (P5, analogous to `reputation_risk_counter`). The player sees the BAND, not the count.
   *
   * ZERO PRICE COUPLING (DD-SP): this method reads supplier pressure ONLY. It does NOT read
   * `precursor_market_state` and is NOT called from the buy-path price helper. The price computation
   * (`getEffectiveScarcityMultiplier` / B6) has zero dependency on `SupplierPressureService`.
   *
   * If no row exists for (playerId, supplierId) — the supplier has never been ordered from — the
   * implicit counter is 0 and the bucket is FRESH.
   *
   * @param playerId — the player UUID.
   * @param supplierId — the supplier UUID.
   * @returns the observable bucket (closed domain FRESH/USED/STRAINED). Counter is hidden.
   */
  async getSupplierPressure(playerId: string, supplierId: string): Promise<SupplierPressureBucket> {
    const row = await this.readPressureRow(playerId, supplierId);
    const counter = row?.pressure_counter ?? 0;

    // Project counter → band via the presentation cut-points.
    // Monotone: STRAINED is checked first so higher thresholds take precedence.
    let band: SupplierPressureBand;
    if (counter >= PRESSURE_STRAINED_MIN) {
      band = 'STRAINED';
    } else if (counter >= PRESSURE_USED_MIN) {
      band = 'USED';
    } else {
      band = 'FRESH';
    }

    return { supplier_pressure_bucket: band };
  }

  /**
   * `getAggregatePressureBucket(playerId)` — R2.2 player-level pressure posture for the projection.
   *
   * Projects the WORST-CASE supplier pressure across ALL of the player's (player × supplier) rows
   * → the highest pressure band (STRAINED > USED > FRESH). If the player has no pressure rows
   * (no supplier orders accumulated yet), the implicit bucket is FRESH (counter=0 → baseline).
   *
   * Called by `PrecursorsProjectionService.projectBuilding` to expose the `supplier_pressure_bucket`
   * field in the player-facing projection (D1c B7 — R2.2 extension).
   *
   * RATIONALE: in D1c there is no supplier identity on the production order path (supplierId is not
   * attached to precursor_order rows — DD-SP deferred to the Reputation lot). The projection needs
   * a player-level aggregate that captures the global supplier pressure posture without a specific
   * supplierId context. Worst-case (MAX counter) is the conservative observable: if any supplier
   * relationship is STRAINED, the player's overall pressure surface reflects that.
   *
   * R2.2: only the bucket is returned — the raw pressure_counter is NEVER forwarded to the player.
   * DD-SP: zero price coupling — this method reads pressure state only; it does NOT read
   *   `precursor_market_state` and is NOT called from the buy-path price helper.
   *
   * @param playerId — the player UUID.
   * @returns the aggregate (worst-case) pressure bucket across all of the player's supplier rows.
   */
  async getAggregatePressureBucket(playerId: string): Promise<SupplierPressureBand> {
    // Query the MAX pressure_counter across all of this player's supplier rows.
    // If no rows exist (no supplier pressure accumulated), maxCounter is null → default 0 (FRESH).
    const [result] = await this.db
      .select({ maxCounter: max(precursorSupplierPressure.pressure_counter) })
      .from(precursorSupplierPressure)
      .where(eq(precursorSupplierPressure.player_id, playerId));

    const maxCounter = result?.maxCounter ?? 0;

    // Project the worst-case counter → band (same cut-points as getSupplierPressure).
    if (maxCounter >= PRESSURE_STRAINED_MIN) return 'STRAINED';
    if (maxCounter >= PRESSURE_USED_MIN) return 'USED';
    return 'FRESH';
  }
}
