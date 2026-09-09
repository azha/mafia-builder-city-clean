// IMPLEMENTS: docs/tech/04c_market_reputation_insurance/market_mechanics.md §2.1 (Lane Collapse Pricing)
//             docs/tech/09_data_model/schema_market_lane_pricing_state.md §2 (R9.3 backport)
//             — D1b C2 — 2026-06-16
//
// `lane_pricing_state` — GLOBAL market state per (district_id × substance_type).
//
// NOT per-player: the market self-organises into stable price lanes shared by all participants
// (market_mechanics.md §2.1 "self-organise into stable price lanes"). This mirrors the `districts`
// table pattern — a global reference table, no player_id.
//
// R9.3: this file matches the SQL migration 0038_market_lane_pricing_state.sql byte-for-byte.
//       The ch09 mirror is docs/tech/09_data_model/schema_market_lane_pricing_state.md.

import { pgTable, integer, real, timestamp, check, primaryKey } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { districts } from './world_geography';
import { substanceType } from './operational_chain';

// ===== Table: lane_pricing_state — global market lane state per district × substance =====
// PK: composite (district_id, substance_type) — one row per market lane.
// FK to districts(id) ON DELETE CASCADE — if a district is removed, its lanes go too.
// REUSE: `substanceType` pgEnum from operational_chain.ts (already exists; R9.3 consume-not-reimplement).
export const lanePricingState = pgTable(
  'lane_pricing_state',
  {
    /**
     * FK → districts.id (ON DELETE CASCADE). Soft-ref pattern: district rows are GLOBAL static (world_geography.ts),
     * so a real FK here is legitimate (both tables are global, not per-player — same pattern as blocks → districts).
     */
    district_id: integer('district_id')
      .notNull()
      .references(() => districts.id, { onDelete: 'cascade' }),

    /** REUSE existing `substance_type` pgEnum from operational_chain.ts — ['brindle', 'crick', 'hush', 'ash']. */
    substance_type: substanceType('substance_type').notNull(),

    /**
     * p_cents — modal lane price P in cents (4B integer). SEEDED from the brindle_deal_value_cents_per_gram
     * selling tunable default (= 2500¢ = 25.00 per gram, the modal flat for D1b day-1).
     * [DESIGN DECISION — MODAL_P_SEED]: the lane P is seeded at init from the selling tunable
     * `selling.brindle_deal_value_cents_per_gram` default (= 2500). This is flagged rather than
     * silently hardcoded — see LaneCollapsePricingService.ensureLane().
     * C2-F1 fix (D1b C6): comment corrected from phantom `market.brindle_deal_value_cents_per_gram`.
     */
    p_cents: integer('p_cents').notNull(),

    /**
     * w_cents — lane half-width W in cents (4B integer). Determines the ±W band that classifies a deal
     * as in-lane vs off-lane (market_mechanics.md:52-56). SEEDED from P × W_SEED_FRACTION.
     * [DESIGN DECISION — W_SEED_FRACTION]: W = P × 0.10 (±10% of the modal P at init; 250¢ for P=2500¢).
     * The fraction is env-overridable via MARKET_LANE_HALFWIDTH_SEED_FRACTION for E2E test control.
     */
    w_cents: integer('w_cents').notNull(),

    /**
     * c — lane confidence EMA ∈ [0,1] (real / float4 — precision sufficient for a probability).
     * Initialised at 0.5 (midpoint — neither trusted nor dismissed).
     * Updated per-deal by the update rule (market_mechanics.md:52-56):
     *   in-lane  → c ← c + α·(1−c)
     *   off-lane → c ← c·(1−κ)
     * Constrained [0, 1] by DB CHECK.
     */
    c: real('c').notNull().default(0.5),

    /**
     * t_refractory_minutes — jam timer in in-game minutes (integer ≥ 0). Armed to T_jam on off-lane collapse
     * (market_mechanics.md:56: "t_refractory ← T_jam"). Decremented by 60 per HOURLY clearing tick.
     * While > 0, the lane is in jam / scatter mode (market_mechanics.md:63).
     */
    t_refractory_minutes: integer('t_refractory_minutes').notNull().default(0),

    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.district_id, table.substance_type] }),
    c_range_chk: check('lane_pricing_state_c_range_chk', sql`${table.c} >= 0 AND ${table.c} <= 1`),
    t_refractory_non_negative_chk: check(
      'lane_pricing_state_t_refractory_non_negative_chk',
      sql`${table.t_refractory_minutes} >= 0`,
    ),
  }),
);

// ===== Inferred Drizzle types =====
export type LanePricingStateRow = typeof lanePricingState.$inferSelect;
export type LanePricingStateInsert = typeof lanePricingState.$inferInsert;
