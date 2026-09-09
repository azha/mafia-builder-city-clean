// IMPLEMENTS: docs/superpowers/plans/2026-07-03-04d-C-meta-market-plan.md C3 (tunables)
//             Canon: docs/tech/04d_meta_market_lawyer_and_internal_affairs/async_meta_market.md :171-181
//             Memory budget: docs/tech/04d_meta_market_lawyer_and_internal_affairs/memory_budget_meta_market.md :98-99
//             Registry: projects/mafia_city_game/gdd/14_tunable_constants.md §Meta-Market (C3 04d-C 2026-07-03)
//             Pattern: mirrors services/game-back/src/operational/internal_affairs/ia.tunables.ts exactly.
//             — 04d-C C3 — 2026-07-03
//
// `meta-market.tunables.ts` — Registry-mirrored getters for all `meta_market.*` and `perf_budget.*`
// tunable keys consumed by the MetaMarketModule (C4+ mechanics, C5 aggregation, C6 read, C7 privacy).
//
// R2.3 (NO inline numeric value for any meta_market.* or perf_budget.* key): all values route through
// TunablesStore.resolve* with the exact registry key name as the first arg. The defaults cited here
// are verbatim from gdd/14 §Meta-Market and §Performance Budget — the single source of truth.
// If registry values change, update gdd/14 + this file in the SAME commit (R9.3).
//
// Registry-FIRST contract: every key here has a gdd/14 row that PRECEDES this getter
// (the gdd/14 §Meta-Market section was added in this same commit, same chunk C3).
//
// Keys shipped at C3 (13 total):
//   9 canon meta_market.* scalars (async_meta_market.md :171-181):
//     sample_floor, trim_pct, bucket_duration_minutes, retention_days, default_visibility (string),
//     aggregation_worker_count, contribution_rate_limit_per_player_per_hour,
//     hmac_secret_rotation_days, coordinated_cohort_detection_threshold_accounts.
//   2 perf_budget.* scalars (memory_budget_meta_market.md :98-99):
//     04d_max_kb_per_player, meta_market_max_rows_total.
//   2 NEW region keys [PROV-Y26Q2]:
//     region_count (int, ~10 active regions), default_region_id (string, 'unknown' fallback).
//
// CAPS: only numeric scalar keys (no cap for string keys default_visibility + default_region_id).
//   11 numeric keys appear in META_MARKET_TUNABLE_CAPS.

import { TunablesStore } from '../../config/tunables-store';

// ── Range constants for numeric keys (used by META_MARKET_TUNABLE_CAPS) ─────────────────────────
// These bounds mirror the gdd/14 Range column (registry-FIRST: defined before caps export).

/** Min/max clamp range per key. Used by META_MARKET_TUNABLE_CAPS. */
export interface TunableRange {
  readonly min: number;
  readonly max: number;
}

/**
 * `META_MARKET_TUNABLE_CAPS` — the per-key allowed range for DB overrides.
 * Used by the _test `probe-clamp` route and by C4+ mechanic services to clamp overrides.
 * Each entry mirrors the gdd/14 Range column verbatim.
 *
 * NOTE: string keys (default_visibility, default_region_id) have no numeric range.
 *       Only numeric scalar keys appear here.
 */
export const META_MARKET_TUNABLE_CAPS: Record<string, TunableRange> = {
  // ── 8 canon meta_market.* numeric scalars (async_meta_market.md :171-181; the 9th canon key
  //    default_visibility is a string, excluded from CAPS — see the header note) ────────────────
  'meta_market.sample_floor':                                          { min: 3,       max: 20       },
  'meta_market.trim_pct':                                              { min: 2.5,     max: 15       },
  'meta_market.bucket_duration_minutes':                               { min: 15,      max: 360      },
  'meta_market.retention_days':                                        { min: 7,       max: 90       },
  'meta_market.aggregation_worker_count':                              { min: 1,       max: 4        },
  'meta_market.contribution_rate_limit_per_player_per_hour':           { min: 1,       max: 3        },
  'meta_market.hmac_secret_rotation_days':                             { min: 7,       max: 90       },
  'meta_market.coordinated_cohort_detection_threshold_accounts':       { min: 50,      max: 200      },

  // ── 2 perf_budget.* numeric scalars (memory_budget_meta_market.md :98-99) ──────────────────
  'perf_budget.04d_max_kb_per_player':                                 { min: 2,       max: 10       },
  'perf_budget.meta_market_max_rows_total':                            { min: 100000,  max: 500000   },

  // ── NEW region key numeric [PROV-Y26Q2] ─────────────────────────────────────────────────────
  'meta_market.region_count':                                          { min: 2,       max: 50       },

  // string keys excluded (default_visibility, default_region_id have no numeric range)
};

/**
 * Clamp a numeric value to the registered range for the given key.
 * Used by probe-clamp route + C4+ services when applying DB overrides.
 * Returns the original value unchanged if no range is registered for the key.
 */
export function clampMetaMarketToRange(key: string, value: number): number {
  const range = META_MARKET_TUNABLE_CAPS[key];
  if (!range) return value;
  return Math.min(range.max, Math.max(range.min, value));
}

/** Registry-mirrored getters for all `meta_market.*` and `perf_budget.*` tunable keys (C3+). */
export const metaMarketTunables = {

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // Canon scalars — Signal quality + privacy wall (async_meta_market.md :173-174, GDD §1.11)
  // ════════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `meta_market.sample_floor` — minimum distinct contributor count per bucket to surface the signal.
   * Canon :173 / GDD §1.11 / gdd/14 §Meta-Market. Default 5, range 3..20.
   * Buckets with `sample_count < sample_floor` return `'insufficient_signal'` (C6).
   * Lower = de-anonymization risk. The privacy wall (C7) enforces this server-side.
   * R2.2/P5: this floor is NEVER sent to the client — the client only receives the aggregate OR
   *   `'insufficient_signal'`; the raw sample_count is BO-only (C8).
   */
  get sampleFloor(): number {
    return TunablesStore.resolveInt(
      'meta_market.sample_floor',
      'META_MARKET_SAMPLE_FLOOR',
      5,
    );
  },

  /**
   * `meta_market.trim_pct` — top/bottom percentile trim before computing median/p10/p90.
   * Canon :174 / GDD §1.11 / gdd/14 §Meta-Market. Default 5, range 2.5..15.
   * Applied by `MetaMarketAggregationService.runHourlyAggregation` (C5).
   * Higher = robust to outliers (single aberrant deal cannot move median >~0.5%).
   * Anti-fig-leaf: trim is a REAL float (e.g. 2.5 is valid); use resolveFloat.
   */
  get trimPct(): number {
    return TunablesStore.resolveFloat(
      'meta_market.trim_pct',
      'META_MARKET_TRIM_PCT',
      5,
    );
  },

  /**
   * `meta_market.bucket_duration_minutes` — aggregation bucket granularity in REAL minutes.
   * Canon :175 / GDD §1.11 / gdd/14 §Meta-Market. Default 60, range 15..360.
   * The HOURLY cadence (`META_MARKET_AGGREGATION_TICK` HOURLY/1) fires every 60 real minutes
   * by default. The bucket_hour in `meta_market_contributions` is floor(unix_min / 60).
   * `MetaMarketAggregationService` (C5) uses this to compute the bucket key.
   */
  get bucketDurationMinutes(): number {
    return TunablesStore.resolveInt(
      'meta_market.bucket_duration_minutes',
      'META_MARKET_BUCKET_DURATION_MINUTES',
      60,
    );
  },

  /**
   * `meta_market.retention_days` — signal retention window in real days (NIGHTLY purge).
   * Canon :176 / GDD §1.11 / gdd/14 §Meta-Market. Default 30, range 7..90.
   * `MetaMarketRetentionService.purgeOlderThan` (C5) deletes signals older than this.
   * Lower = less storage but loses long-term trends; higher = more storage, longer trend view.
   */
  get retentionDays(): number {
    return TunablesStore.resolveInt(
      'meta_market.retention_days',
      'META_MARKET_RETENTION_DAYS',
      30,
    );
  },

  /**
   * `meta_market.default_visibility` — per-player visibility toggle default.
   * Canon :177 / GDD §1.11 / gdd/14 §Meta-Market. Default `'on'`, values `'on'/'off'`.
   * Brand commitment: ship visible by default (players opt OUT, not opt in).
   * String value used by `MetaMarketReadService` (C6) to initialize the per-player toggle.
   * C3-determinism: string comparison is pure — no RNG.
   */
  get defaultVisibility(): string {
    return TunablesStore.resolveString(
      'meta_market.default_visibility',
      'META_MARKET_DEFAULT_VISIBILITY',
      'on',
    );
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // Canon scalars — Aggregation + engineering (async_meta_market.md :178, GDD §1.9)
  // ════════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `meta_market.aggregation_worker_count` — number of parallel aggregation workers (C5).
   * Canon :178 / GDD §1.9 / gdd/14 §Meta-Market. Default 1, range 1..4.
   * `MetaMarketAggregationService.runHourlyAggregation` (C5) partitions pending contributions
   * across this many workers. Default 1 (single-worker, no parallel overhead at launch scale).
   * Scale with player count.
   */
  get aggregationWorkerCount(): number {
    return TunablesStore.resolveInt(
      'meta_market.aggregation_worker_count',
      'META_MARKET_AGGREGATION_WORKER_COUNT',
      1,
    );
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // Canon scalars — Contribution rate-limit + HMAC (async_meta_market.md :179-180, GDD §1.5)
  // ════════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `meta_market.contribution_rate_limit_per_player_per_hour` — max contributions per
   * (player × substance × district × hour). Canon :179 / GDD §1.5 / gdd/14 §Meta-Market.
   * Default 1, range 1..3.
   * `MetaMarketContributionService.recordDeal` (C4) enforces this via hour-bucket deduplication.
   * With rate-limit=1: a 2nd sell in the same (substance, district, hour) → NO 2nd row.
   * C4-determinism: rate-limit is pure (hour-bucket key comparison, no RNG).
   */
  get contributionRateLimitPerPlayerPerHour(): number {
    return TunablesStore.resolveInt(
      'meta_market.contribution_rate_limit_per_player_per_hour',
      'META_MARKET_CONTRIBUTION_RATE_LIMIT_PER_PLAYER_PER_HOUR',
      1,
    );
  },

  /**
   * `meta_market.hmac_secret_rotation_days` — per-region HMAC secret rotation cadence (real days).
   * Canon :180 / gdd/14 §Meta-Market. Default 30, range 7..90.
   * `MetaMarketHashService.hashPlayerId` (C4) rotates the per-region HMAC-SHA256 secret on this
   * cadence. Shorter = harder to correlate contributors across time. Rotation is deterministic
   * (key = region_id + floor(day / rotation_days) — pure function of game-time).
   * C4-determinism: HMAC-SHA256 is deterministic given (key, data); rotation window is pure.
   */
  get hmacSecretRotationDays(): number {
    return TunablesStore.resolveInt(
      'meta_market.hmac_secret_rotation_days',
      'META_MARKET_HMAC_SECRET_ROTATION_DAYS',
      30,
    );
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // Canon scalar — Anti-cheat cohort detection (async_meta_market.md :181, GDD §1.10)
  // ════════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `meta_market.coordinated_cohort_detection_threshold_accounts` — daily contribution-volume
   * spike threshold for coordinated-cohort anti-cheat alert. Canon :181 / GDD §1.10.
   * Default 100, range 50..200.
   * `MetaMarketAntiCheatService.detectCoordinatedCohort` (C6): if a region+substance sees
   * >= threshold DISTINCT hashed contributors in one day → flag a `meta_market_cohort_flags` row.
   * R2.2/C7: the cohort flag is BO-only; the player read path never exposes it.
   */
  get coordinatedCohortDetectionThresholdAccounts(): number {
    return TunablesStore.resolveInt(
      'meta_market.coordinated_cohort_detection_threshold_accounts',
      'META_MARKET_COORDINATED_COHORT_DETECTION_THRESHOLD_ACCOUNTS',
      100,
    );
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // perf_budget.* scalars — Meta-market memory budget (memory_budget_meta_market.md :98-99)
  // ════════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `perf_budget.04d_max_kb_per_player` — F4 budget alert threshold for per-player
   * meta-market data (KB). Source: memory_budget_meta_market.md :98 / gdd/14 §Performance Budget.
   * Default 5, range 2..10.
   * The server-side F4 alert fires when the rolling per-player meta-market storage exceeds
   * this threshold. Consumed by the storage-metrics BO endpoint (C8).
   */
  get perfBudget04dMaxKbPerPlayer(): number {
    return TunablesStore.resolveInt(
      'perf_budget.04d_max_kb_per_player',
      'PERF_BUDGET_04D_MAX_KB_PER_PLAYER',
      5,
    );
  },

  /**
   * `perf_budget.meta_market_max_rows_total` — global `meta_market_signals` row count alert
   * threshold. Source: memory_budget_meta_market.md :99 / gdd/14 §Performance Budget.
   * Default 200000, range 100000..500000.
   * ~170k cardinality at launch (10 regions × 4 substances × 6 district_profiles × 30d × 24h =
   * 172800). The BO storage-metrics endpoint (C8) monitors row count vs this cap.
   * Consumed by `MetaMarketAdminController` (C8).
   */
  get perfBudgetMetaMarketMaxRowsTotal(): number {
    return TunablesStore.resolveInt(
      'perf_budget.meta_market_max_rows_total',
      'PERF_BUDGET_META_MARKET_MAX_ROWS_TOTAL',
      200000,
    );
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // NEW region keys [PROV-Y26Q2] — geo-region substrate (C1b, 04d-C)
  //
  // These keys are genuinely NEW (no prior geo-region substrate existed).
  // Their magnitudes are [PROV-Y26Q2]: the EXISTENCE is canon (§2.2 region substrate design),
  // the exact values are provisionally frozen by the spec author.
  // ════════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `meta_market.region_count` — expected number of active geo-regions seeded at C1b.
   * [PROV-Y26Q2] / gdd/14 §Meta-Market. Default 10, range 2..50.
   * ~10 canon-analog identities: `eu-west|us-east|sea|latam|oce|…` + `unknown` fallback.
   * Used by `MetaMarketAntiCheatService` (C6) to normalize per-region contribution volume.
   * The ACTUAL region count is the `region` table row count; this key is the expected/nominal count
   * for capacity planning and the storage-metrics calculation.
   */
  get regionCount(): number {
    return TunablesStore.resolveInt(
      'meta_market.region_count',
      'META_MARKET_REGION_COUNT',
      10,
    );
  },

  /**
   * `meta_market.default_region_id` — fallback `region_id` when geo-IP lookup returns null.
   * [PROV-Y26Q2] / gdd/14 §Meta-Market. Default `'unknown'`, string.
   * Assigned by `RegionService.assignRegionFromIp` (C1b) when the MaxMind `.mmdb` is absent
   * OR the country code is not in `region_country_map`. MUST match the `unknown` seed row
   * in the `region` table (mig 0102 seeds `region_id = 'unknown'`).
   * RGPD: only `region_id` is persisted, never the raw IP.
   */
  get defaultRegionId(): string {
    return TunablesStore.resolveString(
      'meta_market.default_region_id',
      'META_MARKET_DEFAULT_REGION_ID',
      'unknown',
    );
  },

};

// ── NestJS Injectable wrapper (same pattern as IATunables in ia.tunables.ts) ─────────────────────

/** Named alias used in NestJS DI (C3). Wraps `metaMarketTunables` so services can inject it. */
export class MetaMarketTunables {
  // Expose all getters as instance methods so NestJS can inject the class.
  // The underlying implementation delegates to the module-level object above.

  // ── Canon scalars — signal quality + privacy wall ───────────────────────────────────────────
  get sampleFloor()                                       { return metaMarketTunables.sampleFloor; }
  get trimPct()                                           { return metaMarketTunables.trimPct; }
  get bucketDurationMinutes()                             { return metaMarketTunables.bucketDurationMinutes; }
  get retentionDays()                                     { return metaMarketTunables.retentionDays; }
  get defaultVisibility()                                 { return metaMarketTunables.defaultVisibility; }

  // ── Canon scalars — aggregation ─────────────────────────────────────────────────────────────
  get aggregationWorkerCount()                            { return metaMarketTunables.aggregationWorkerCount; }

  // ── Canon scalars — contribution rate-limit + HMAC ─────────────────────────────────────────
  get contributionRateLimitPerPlayerPerHour()             { return metaMarketTunables.contributionRateLimitPerPlayerPerHour; }
  get hmacSecretRotationDays()                            { return metaMarketTunables.hmacSecretRotationDays; }

  // ── Canon scalars — anti-cheat ──────────────────────────────────────────────────────────────
  get coordinatedCohortDetectionThresholdAccounts()       { return metaMarketTunables.coordinatedCohortDetectionThresholdAccounts; }

  // ── perf_budget.* scalars ───────────────────────────────────────────────────────────────────
  get perfBudget04dMaxKbPerPlayer()                       { return metaMarketTunables.perfBudget04dMaxKbPerPlayer; }
  get perfBudgetMetaMarketMaxRowsTotal()                  { return metaMarketTunables.perfBudgetMetaMarketMaxRowsTotal; }

  // ── NEW region keys [PROV-Y26Q2] ────────────────────────────────────────────────────────────
  get regionCount()                                       { return metaMarketTunables.regionCount; }
  get defaultRegionId()                                   { return metaMarketTunables.defaultRegionId; }
}
