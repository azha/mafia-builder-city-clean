// IMPLEMENTS: docs/tech/04a_operational_systems/precursors_supply_chain.md §Dynamique de prix des précurseurs
//             ("Jamais de valeurs numériques exactes exposées au joueur (P5 — information asymmetry)") +
//             §Implications par couche / Unity (lead time qualitative, stock as a qualitative surface) +
//             docs/tech/01_pillars_and_vision/P5_information_asymmetry.md (R2.2 — no raw scalar to client) +
//             docs/tech/09_data_model/schema_operational_chain.md §8 (P5 projection convention)
//             -- session:2026-06-03 (Phase 2 Task 2) --
//
// `PrecursorsProjectionService` — the player-facing projection for a building's precursor stock + orders (the
// Precursor surface). The surfaced precursor is REGISTRY-DRIVEN (resolved from the building's operational type via the
// substance registry — a refinery → Crick → verdant_root_extract, a lab → Brindle → pyralin; never hardcoded pyralin).
// Maps the RAW persisted fields (precursor_stock.quantity_units + the precursor_order statuses) → a QUALITATIVE
// payload: a stock BAND + an order-state summary. It NEVER forwards a raw scalar — no quantity_units (the stock
// count), no price/cents, no arrives_at_tick/ordered_at_tick (the timer). R2.2.
//
// THE BANDS (closed qualitative domains — the only stock/order signal exposed):
//   - stock_band: NONE (no stock) | LOW | MEDIUM | HIGH. Derived from precursor_stock.quantity_units by fixed
//     bucket cut-points (a PRESENTATION bucketing — like T1's setup-state band derivation; NOT a sim tunable, no
//     numeric balance value is involved, only the closed-domain band label is exposed).
//   - pending_orders / arrived_orders: qualitative booleans — whether the player has any order still PENDING (in
//     transit) and whether any order has ARRIVED (delivered). Derived from the precursor_order statuses; never the
//     raw ticks. (delivered = arrived; pending = still in transit; seized is not produced in the M1 legit channel.)
//
// R2.2 RAW-LEAK GUARANTEE: the payload contains ONLY closed-domain strings + booleans + the building uuid identity —
// NEVER quantity_units, any price/cents, ordered_at_tick / arrives_at_tick, or an order count. The E2E scans the
// payload recursively and rejects any unexpected raw scalar.

import { Injectable } from '@nestjs/common';

import { defaultPrecursorType, precursorForBuildingType, type PrecursorType } from '../substance/substance-config';
import { productionTunables } from '../production/production-tunables';
import { PrecursorsRepository } from './precursors.repository';
import { PrecursorMarketStateService, type PriceTrendBucket } from './precursor-market.service';
import { SupplierPressureService, type SupplierPressureBand } from './precursor-supplier-pressure.service';

/** The qualitative stock band (the only stock signal exposed — never the raw quantity_units). */
export type StockBand = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * The canonical EN PrecursorType label surfaced to the client — the precursor enum member uppercased (pyralin →
 * `PYRALIN`, verdant_root_extract → `VERDANT_ROOT_EXTRACT`, lull_resin → `LULL_RESIN`, glass_lily → `GLASS_LILY`;
 * precursors_supply_chain.md §Glossary — PrecursorType). A closed-domain string (NOT a raw scalar). Derived from the enum member (uppercased),
 * so it stays consistent as precursors ship — never an exhaustive switch over precursor literals.
 */
function precursorEnumLabel(precursorType: PrecursorType): string {
  return precursorType.toUpperCase();
}

/** The PLAYER-FACING per-building precursor projection (qualitative bands only — R2.2; registry-resolved precursor). */
export interface PrecursorProjection {
  /** The building identity (a uuid string — echoed for the client's Precursor surface; NOT a sim scalar). */
  building: string;
  /** The qualitative precursor type (a closed enum domain — 'PYRALIN' / 'VERDANT_ROOT_EXTRACT' / 'LULL_RESIN' / 'GLASS_LILY'; registry-resolved). */
  precursor_type: string;
  /** The qualitative stock band (NONE / LOW / MEDIUM / HIGH — never the raw quantity_units; R2.2). */
  stock_band: StockBand;
  /** Whether the player has any order still in transit (status='pending') — never the raw arrives_at_tick timer. */
  has_pending_order: boolean;
  /** Whether the player has any order that has arrived (status='delivered'). */
  has_arrived_order: boolean;
  /**
   * [D1 C5 — TD-031 label-only] The DISPLAY LABEL for the stock quantity in liters — a BAND-RANGE CAPTION (e.g.
   * "11–50 L") derived from the stock band's unit BOUNDS × `production.brindle.liters_per_unit`, NOT from the raw
   * `quantity_units`. A closed-domain PRESENTATION string (R2.2): two different exact counts in the same band produce
   * the IDENTICAL label, making it structurally non-invertible to the exact count. The raw quantity_units is NEVER
   * forwarded. Introduces no inventory mechanic (DD6=(a)).
   */
  stock_liters_label: string;
  // ── D1c B7 — R2.2 market projection extension (P5 surfaces) ────────────────────────────────────
  /**
   * [D1c B7] The banded market price-trend (UP / STABLE / DOWN).
   * Routed through R2.2: the raw `price_trend` enum scalar and `demand_accumulator` are NEVER
   * forwarded. Source: `precursor_market_state.price_trend` for the building's precursor type,
   * read from `PrecursorMarketStateService` and projected here. Falls back to STABLE if the
   * market state row does not yet exist (zero-regression baseline).
   */
  price_trend_bucket: PriceTrendBucket;
  /**
   * [D1c B7] The supply-disruption scarcity badge (boolean).
   * R2.2: the client sees ONLY this boolean badge — NEVER the raw `scarcity_multiplier` float or
   * the `disruption_event_id` / `disruption_start_day`. Source: `precursor_market_state.scarcity_active`
   * for the building's precursor type. Falls back to false if no market state row exists.
   */
  scarcity_active: boolean;
  /**
   * [D1c B7] The aggregate supplier pressure bucket (FRESH / USED / STRAINED).
   * Routed through R2.2 banding: the raw `pressure_counter` is NEVER forwarded. Source: the
   * worst-case `pressure_counter` across all of the player's (player × supplier) rows, projected
   * via `SupplierPressureService.getAggregatePressureBucket`. Falls back to FRESH if no supplier
   * pressure has been accumulated yet (zero-pressure baseline, counter=0 → FRESH).
   * DD-SP: zero price coupling — this field is observable-only, not wired into the buy-path price.
   */
  supplier_pressure_bucket: SupplierPressureBand;
}

// Stock band cut-points (units). A PRESENTATION bucketing of the raw quantity_units into the qualitative band domain
// — the player only ever sees the BAND, never the count (R2.2). These are not sim-balance tunables (no timing/cost/
// drop-rate/threshold is exposed); they are the closed-domain band boundaries, analogous to T1's setup-state band.
const STOCK_BAND_LOW_MAX = 10; // 1..10 units → LOW
const STOCK_BAND_MEDIUM_MAX = 50; // 11..50 units → MEDIUM; > 50 → HIGH

@Injectable()
export class PrecursorsProjectionService {
  constructor(
    private readonly repo: PrecursorsRepository,
    // D1c B7: inject PrecursorMarketStateService (price_trend + scarcity_active) and
    // SupplierPressureService (aggregate pressure bucket). Both are provided by PrecursorMarketModule
    // (exported + imported into PrecursorsModule). REUSE — NOT re-hosted here.
    private readonly marketState: PrecursorMarketStateService,
    private readonly supplierPressure: SupplierPressureService,
  ) {}

  /**
   * Project a player's precursor stock + orders for a building → a fully-qualitative payload. The surfaced precursor
   * is REGISTRY-DRIVEN: resolved from the building's operational TYPE via the substance registry (a refinery → Crick →
   * verdant_root_extract; a lab → Brindle → pyralin — substance-config.ts), never hardcoded pyralin. A building whose
   * type hosts NO shipped substance (a generic stash — precursor storage is allowed there) falls back to the default
   * (Brindle/M1) substance's precursor, also from the registry (the legacy M1 stash→Pyralin surface — never a bare
   * literal). Reads the raw stock quantity + the order statuses for THAT precursor from the repository (the raw
   * quantity / statuses are the INPUT but are mapped to BANDS / booleans — the raw quantity_units / ticks are NEVER
   * forwarded; R2.2). Returns null only when the building is not the player's OPERATIONAL building (controller → 404).
   */
  async projectBuilding(playerId: string, buildingId: string): Promise<PrecursorProjection | null> {
    const owned = await this.repo.getOwnedOperationalBuilding(playerId, buildingId);
    if (!owned) return null;

    // Resolve the precursor this building's operational type sources (registry-driven — never hardcoded pyralin); a
    // generic-storage type that hosts no substance falls back to the default (Brindle/M1) precursor, also registry-read.
    // LIMITATION: this per-type view assumes the order-side precursor↔building-type binding (owned by T3 `startCook`);
    // until that lands, a deliberately MISMATCHED precursor order into a building would not be reflected in this stock view.
    const type = precursorForBuildingType(owned.operational_type) ?? defaultPrecursorType();

    const quantity = await this.repo.getStockQuantity(playerId, buildingId, type);
    const statuses = await this.repo.listOrderStatuses(playerId, buildingId, type);

    const band = this.stockBand(quantity);

    // ── D1c B7 — R2.2 market projection extension (P5 surfaces) ─────────────────────────────────
    // Read the market state row for this building's precursor type.
    // Falls back to STABLE/false if the row does not yet exist (zero-regression baseline).
    const marketRow = await this.marketState.readMarketStateRow(type);
    const priceTrendBucket: PriceTrendBucket = (marketRow?.price_trend as PriceTrendBucket) ?? 'STABLE';
    const scarcityActive: boolean = marketRow?.scarcity_active ?? false;

    // Read the aggregate supplier pressure bucket for this player (worst-case across all suppliers).
    // Falls back to FRESH if no pressure rows exist (zero-pressure baseline — DD-SP, no supplier on
    // the production order path in D1c; pressure is only accumulated via the _test route).
    const supplierPressureBucket: SupplierPressureBand =
      await this.supplierPressure.getAggregatePressureBucket(playerId);

    return {
      building: buildingId,
      precursor_type: precursorEnumLabel(type), // the canonical EN enum value (§Glossary — PrecursorType).
      stock_band: band,
      has_pending_order: statuses.some((s) => s.status === 'pending'),
      has_arrived_order: statuses.some((s) => s.status === 'delivered'),
      // [D1 C5 — TD-031 label-only] Band-derived liters display label: a liters-denominated range caption that mirrors
      // the SAME band stock_band already shows — derived from the band's UNIT BOUNDS × liters_per_unit, never from the
      // raw quantity_units (R2.2 fix). Two different exact counts in the same band produce the IDENTICAL label, so the
      // label is structurally non-invertible to the exact count. No inventory mechanic introduced (DD6=(a)).
      stock_liters_label: this.stockLitersLabel(band, productionTunables.litersPerUnit),
      // ── D1c B7 — the 3 R2.2 market-state buckets (P5 surfaces) ─────────────────────────────────
      // price_trend_bucket: UP/STABLE/DOWN — banded from the raw price_trend (never the raw enum forwarded).
      // scarcity_active: boolean badge — the client sees only this flag (never the raw scarcity_multiplier float).
      // supplier_pressure_bucket: FRESH/USED/STRAINED — banded from the worst-case pressure_counter (never the raw count).
      price_trend_bucket: priceTrendBucket,
      scarcity_active: scarcityActive,
      supplier_pressure_bucket: supplierPressureBucket,
    };
  }

  /**
   * Map the raw quantity_units → the qualitative stock band (R2.2). 0 → NONE; 1..LOW_MAX → LOW; ..MEDIUM_MAX →
   * MEDIUM; above → HIGH. The player sees the BAND, never the count.
   */
  private stockBand(quantityUnits: number): StockBand {
    if (quantityUnits <= 0) return 'NONE';
    if (quantityUnits <= STOCK_BAND_LOW_MAX) return 'LOW';
    if (quantityUnits <= STOCK_BAND_MEDIUM_MAX) return 'MEDIUM';
    return 'HIGH';
  }

  /**
   * Compute the liters display label from the BAND (not the exact count). The label is a range caption derived from
   * the band's unit BOUNDARIES × liters_per_unit — so it mirrors stock_band and is structurally non-invertible to the
   * exact quantity (R2.2: two counts in the same band → identical label). The liters_per_unit tunable scales the BAND
   * BOUNDS (not the raw count).
   *
   * Band → unit bounds → liters caption:
   *   NONE   → 0 units         → "0 L"
   *   LOW    → 1..10 units     → "1–<LOW_MAX × lpu> L"
   *   MEDIUM → 11..50 units    → "<LOW_MAX+1>–<MEDIUM_MAX × lpu> L"  (expressed as "<lo>–<hi> L")
   *   HIGH   → > 50 units      → "<MEDIUM_MAX+1>+ L"                 (open-ended, no upper bound)
   *
   * All arithmetic is on the BAND CUT-POINTS (constants), never on the raw quantity_units.
   */
  private stockLitersLabel(band: StockBand, litersPerUnit: number): string {
    switch (band) {
      case 'NONE':
        return '0 L';
      case 'LOW':
        // LOW: 1..STOCK_BAND_LOW_MAX units → "1–<LOW_MAX × lpu> L"
        return `1–${STOCK_BAND_LOW_MAX * litersPerUnit} L`;
      case 'MEDIUM':
        // MEDIUM: (LOW_MAX+1)..MEDIUM_MAX units → "<lo>–<hi> L"
        return `${(STOCK_BAND_LOW_MAX + 1) * litersPerUnit}–${STOCK_BAND_MEDIUM_MAX * litersPerUnit} L`;
      case 'HIGH':
        // HIGH: > MEDIUM_MAX units → "<MEDIUM_MAX+1>+ L" (open-ended)
        return `${(STOCK_BAND_MEDIUM_MAX + 1) * litersPerUnit}+ L`;
    }
  }
}
