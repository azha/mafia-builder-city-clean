// IMPLEMENTS: docs/tech/04c_market_reputation_insurance/market_mechanics.md §2.4 (Carrying-Capacity Haze)
//             docs/tech/09_data_model/schema_market_district_capacity_state.md §2 (R9.3 backport)
//             — D1b C5 — 2026-06-16
//
// TABLES:
//   district_capacity_state — per-district hidden carrying-capacity state.
//     K: k_baseline (world-gen seeded, NEVER increased) + k_current (permanently damaged by overshoot).
//     Q_total: rolling throughput sum (server-side, hidden). T_over: consecutive ticks above λ=1.0 (hidden).
//     has_civic_investment: flag for partial K-recovery on next tick.
//     PK: district_id. FK: district_id → districts(id) ON DELETE CASCADE.
//     k_current CHECK: k_current >= 0 (non-negative). K NEVER exposed to client (R2.2 P5 invariant).
//
// R9.3: this file matches the SQL migration 0041_market_district_capacity_state.sql byte-for-meaning.
//       The ch09 mirror is docs/tech/09_data_model/schema_market_district_capacity_state.md.

import { pgTable, integer, real, boolean, timestamp, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { districts } from './world_geography';

// ===== Table: district_capacity_state — per-district hidden K state =====
//
// One row per district (global, not per-player — same as lane_pricing_state).
// K (k_baseline + k_current): hidden throughput ceiling seeded from block_count demographics
//   (market_mechanics.md:157-161). k_baseline is the world-gen seed (NEVER increased).
//   k_current starts at k_baseline and may be permanently damaged below it.
// Q_total (q_total): rolling 14-day throughput sum (player + rivals) — hidden server-side.
// T_over (t_over): consecutive daily ticks above λ=1.0 — hidden server-side.
// has_civic_investment: flag set by civic-investment hook; cleared after applying partial recovery.
//
// R2.2 HARD INVARIANT: k_baseline, k_current, q_total, t_over are NEVER forwarded to the client.
//   Player surface = district-scene art-asset cues + lambda_bucket (via MarketProjectionService.toBuckets)
//   + district_capacity_damage_bucket (§3.3 emission contract). NO K tooltip.
//
// K SEED: k_baseline = block_count × 100 × (0.95 + 0.10 × rng.seedFromDay(districtId, 0)).
//   Grounds K in the district's block_count (world_geography.ts); ±5% RNG drift uses
//   MarketRngService (NO Math.random — C4 determinism rule). Never expose k_baseline.
//
// Note: `k_current <= k_baseline` is application-enforced (not a DB CHECK referencing sibling columns).
//   The only DB-level CHECK on k_current is `k_current >= 0` (non-negative). There is no upper-bound
//   CHECK constraint in the DB; the irreversibility bound (k_current ≤ k_baseline) is enforced in
//   the service layer (carrying-capacity-haze.service.ts, ensureDistrictCapacity + tickDailyK).
export const districtCapacityState = pgTable(
  'district_capacity_state',
  {
    /**
     * district_id — FK → districts(id) ON DELETE CASCADE. PK.
     * One capacity row per district (global state — not per-player).
     */
    district_id: integer('district_id')
      .primaryKey()
      .references(() => districts.id, { onDelete: 'cascade' }),

    /**
     * k_baseline — world-gen seeded K (NEVER increased above this value).
     * Initialized once at world-gen: block_count × 100 × ±5% RNG drift.
     * Irreversibility primitive: k_current may be permanently lowered below k_baseline,
     * but k_current NEVER returns above k_baseline (market_mechanics.md:176 hard invariant).
     */
    k_baseline: real('k_baseline').notNull(),

    /**
     * k_current — current K (starts at k_baseline; permanently damaged by overshoot).
     * Permanent damage formula: k_current ← k_current × (1 − δ_K) when T_over ≥ grace.
     * CHECK: k_current >= 0 (non-negative; application enforces k_current ≤ k_baseline).
     * Guard at 0.001 minimum (in service) to avoid λ division by zero.
     */
    k_current: real('k_current').notNull(),

    /**
     * q_total — rolling 14-day throughput sum (player + rivals) (market_mechanics.md:157).
     * Hidden server-side — NEVER forwarded to client (R2.2 P5 invariant).
     * Used only to compute λ = q_total / k_current.
     */
    q_total: real('q_total').notNull().default(0),

    /**
     * t_over — consecutive daily ticks above λ=1.0 (market_mechanics.md:172).
     * Reset to 0 when a day has λ ≤ 1.0. Accumulated otherwise.
     * When t_over ≥ districtKOvershootGraceDays AND λ > 1.0 → permanent K-damage.
     * Hidden server-side — NEVER forwarded to client.
     */
    t_over: integer('t_over').notNull().default(0),

    /**
     * has_civic_investment — flag set by the civic-investment hook (market_mechanics.md:211).
     * When true AND λ < 0.5 on the next daily tick, partial K-recovery is applied:
     *   k_current ← min(k_current + k_baseline × civicRecoveryRate, k_baseline).
     * Flag is cleared (set to false) after recovery is applied.
     */
    has_civic_investment: boolean('has_civic_investment').notNull().default(false),

    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    k_current_non_negative_chk: check(
      'district_capacity_state_k_current_non_negative_chk',
      sql`${table.k_current} >= 0`,
    ),
    t_over_non_negative_chk: check(
      'district_capacity_state_t_over_non_negative_chk',
      sql`${table.t_over} >= 0`,
    ),
  }),
);

// ===== Inferred Drizzle types =====
export type DistrictCapacityStateRow = typeof districtCapacityState.$inferSelect;
export type DistrictCapacityStateInsert = typeof districtCapacityState.$inferInsert;
