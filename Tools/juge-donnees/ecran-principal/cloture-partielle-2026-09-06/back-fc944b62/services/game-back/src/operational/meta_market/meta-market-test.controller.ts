// IMPLEMENTS: docs/superpowers/plans/2026-07-03-04d-C-meta-market-plan.md C0 (boot probe)
//             docs/superpowers/plans/2026-07-03-04d-C-meta-market-plan.md C1 (geo-IP test injection)
//             docs/superpowers/plans/2026-07-03-04d-C-meta-market-plan.md C1b (region assignment test routes)
//             docs/superpowers/plans/2026-07-03-04d-C-meta-market-plan.md C2 (schema probe routes)
//             docs/superpowers/plans/2026-07-03-04d-C-meta-market-plan.md C3 (tunables probe routes)
//             docs/superpowers/plans/2026-07-03-04d-C-meta-market-plan.md C4 (contribution recording + HMAC + rate-limit probe routes)
//             docs/superpowers/plans/2026-07-03-04d-C-meta-market-plan.md C5 (aggregation + retention probe routes)
//             docs/superpowers/plans/2026-07-03-04d-C-meta-market-plan.md C6 (read API + sample-floor + anti-cheat probe routes)
//             docs/superpowers/plans/2026-07-03-04d-C-meta-market-plan.md C8 (visibility toggle probe routes)
//             Pattern: R-EC-2 test-only controller (market-test.controller.ts, ia-test.controller.ts)
//             — 04d-C C0 — 2026-07-03
//             — 04d-C C1 — 2026-07-03 (geoip-lookup + forwarded-for routes added)
//             — 04d-C C1b — 2026-07-03 (seed-player + assign-region + get-region + delete-player routes added)
//             — 04d-C C2 — 2026-07-03 (seed-signal + seed-contribution + seed-cohort-flag + list-contribution-columns routes added)
//             — 04d-C C3 — 2026-07-03 (read-tunables + probe-clamp routes added)
//             — 04d-C C4 — 2026-07-03 (record-deal + hash-player + count-contributions-for-bucket routes added)
//             — 04d-C C5 — 2026-07-03 (run-aggregation + run-retention + list-signals + compute-stats routes added)
//             — 04d-C C8 — 2026-07-03 (set-visibility + get-signal-with-visibility probe routes added)
//
// `MetaMarketTestController` — TEST-ONLY probe routes for MetaMarketModule.
// Mounted ONLY when NODE_ENV !== 'production' (R-EC-2, testControllersEnabled() gate).
//
// C0 routes:
//   GET /v1/_test/meta-market/ping
//     → { ok: true }  — proves MetaMarketModule is in the DI graph.
//
// C1 routes (geo-IP test injection — decision #1, §2.1 plan):
//   GET /v1/_test/meta-market/geoip-lookup
//     Headers: X-Test-Geo-Ip: <ip>   (optional — IP to resolve via MaxMindGeoIpService.lookupCountry)
//     Falls back to X-Forwarded-For (leftmost), then connection IP when header absent.
//     → { country: string | null }
//     Used by geoip_lookup.spec.ts to assert IP-X → country-Y deterministically (test fixture).
//
//   GET /v1/_test/meta-market/forwarded-for
//     Tests X-Forwarded-For extraction: reads the header, returns { ip: string | null }.
//     Falsifiable: send X-Forwarded-For: A, B → ip: A (leftmost).
//
// C1b routes (region assignment):
//   POST /v1/_test/meta-market/seed-player
//     Body: {} (no required fields)
//     Creates a test account + player (no region_id — NULL on creation, proving rétro-compat).
//     → { playerId: string }
//
//   POST /v1/_test/meta-market/assign-region
//     Body: { playerId: string }
//     Headers (optional):
//       X-Test-Force-Region: <regionId>  — bypass geo-IP, assign region directly.
//       X-Test-Geo-Ip: <ip>              — use this IP for the real geo-IP lookup path.
//       (Neither header → uses extractIpFromRequest → falls back to 'unknown' for private IPs in E2E.)
//     Calls RegionService.setRegion (force-region) or RegionService.assignRegionFromIp (geo-IP).
//     RGPD: IP is never persisted; only region_id is written to player.region_id.
//     → { playerId: string, regionId: string }
//
//   GET /v1/_test/meta-market/get-region?playerId=<uuid>
//     Returns player.region_id (null for unassigned pre-C1b players).
//     → { playerId: string, regionId: string | null }
//
//   POST /v1/_test/meta-market/delete-player
//     Body: { playerId: string }
//     Deletes the test player + account (cascade). Test cleanup.
//     → { deleted: true }
//
// C1+ routes will be added here as each chunk adds services. No route is ever removed.
//
// RGPD (C1/C1b): no endpoint persists a raw IP. The IP header is transient — lookupCountry() or
//   assignRegionFromIp() discard it after deriving the region/country. Only region_id is written.
//
// C2 routes (schema persistence probe — migrations 0103-0104):
//   POST /v1/_test/meta-market/seed-signal
//     Body: { regionId: string, substance: string, districtProfile: string, aggregatedAt: string (ISO),
//             sampleCount: number, medianPriceCents: number, p10PriceCents: number, p90PriceCents: number }
//     Inserts one meta_market_signals row (requires region row exists — use 'eu-west').
//     → { regionId, substance, districtProfile, aggregatedAt, sampleCount, medianPriceCents (bigint→string) }
//
//   POST /v1/_test/meta-market/seed-contribution
//     Body: { contributorHash: string, regionId: string, substance: string, districtProfile: string,
//             priceCents: number, bucketHour: string (ISO) }
//     Inserts one meta_market_contributions row. No player_id in body or DB (privacy proof).
//     → the inserted row (contributor_hash present, NO player_id key in response)
//
//   POST /v1/_test/meta-market/seed-cohort-flag
//     Body: { regionId: string, substance: string, districtProfile?: string,
//             flaggedPattern: string, cohortSize: number }
//     Inserts one meta_market_cohort_flags row. → the inserted row.
//
//   GET /v1/_test/meta-market/list-contribution-columns
//     Returns the column names of meta_market_contributions (as reported by the DB).
//     → { columns: string[] }
//     Falsifiable privacy proof: 'contributor_hash' is in columns; 'player_id' is NOT.
//
// C3 routes (tunables probe — 9 canon meta_market.* + 2 perf_budget.* + 2 region keys [PROV-Y26Q2]):
//   GET /v1/_test/meta-market/read-tunables
//     Returns all MetaMarketTunables getter values as a plain object.
//     Used by meta_market_tunables_bootstrap.spec.ts to assert value-sensitive defaults.
//     Anti-fabrication: reads REAL getter output via the live server — not hardcoded echoes.
//     13 keys total: sample_floor, trim_pct, bucket_duration_minutes, retention_days,
//       default_visibility, aggregation_worker_count, contribution_rate_limit_per_player_per_hour,
//       hmac_secret_rotation_days, coordinated_cohort_detection_threshold_accounts,
//       perfBudget04dMaxKbPerPlayer, perfBudgetMetaMarketMaxRowsTotal,
//       region_count, default_region_id.
//
//   POST /v1/_test/meta-market/probe-clamp
//     Body: { key: string, value: number }
//     Returns: { clamped: number }
//     Applies clampMetaMarketToRange(key, value). FALSIFIABLE: value=999 for a capped key → clamped.
//
// C5 routes (aggregation + retention probe):
//   POST /v1/_test/meta-market/run-aggregation
//     Body: {} (no params needed — aggregates ALL pending contributions in the DB)
//     Calls MetaMarketAggregationService.runHourlyAggregation() directly.
//     Returns: { signalsUpserted: number, contributionsCleared: number, aggregatedAt: string (ISO) }
//     Falsifiable: seed N contributions → run-aggregation → list-signals shows the new signal with
//       correct median/p10/p90. Also used to probe the L1 skip (seed 0 contributions → returns 0/0).
//
//   GET /v1/_test/meta-market/list-signals
//     Query: regionId? substance? districtProfile? (all optional — returns all matching signals)
//     Returns: { signals: Array<{ regionId, substance, districtProfile, aggregatedAt, sampleCount,
//                medianPriceCents, p10PriceCents, p90PriceCents }> }
//     Falsifiable: after run-aggregation, the signal appears here with exact stats.
//
//   POST /v1/_test/meta-market/run-retention
//     Body: { retentionDays?: number } — optional override for the purge window (default: tunables value)
//     Calls MetaMarketRetentionService.purgeOlderThan(retentionDays) directly.
//     Returns: { signalsDeleted: number, contributionsDeleted: number }
//     Falsifiable: seed an old signal (aggregatedAt in the past) → run-retention → signal gone;
//       seed a recent signal → run-retention → signal remains.
//
//   POST /v1/_test/meta-market/compute-stats
//     Body: { prices: number[], trimPct?: number }
//     Calls MetaMarketAggregationService.computeStats(prices, trimPct) directly.
//     Returns: { median: number, p10: number, p90: number, sampleCount: number }
//     Falsifiable: known prices + known trimPct → exact median/p10/p90. The trim removes outliers
//       deterministically: verify median/p10/p90 change when outliers are present/absent.

// C8 routes (visibility toggle probe — mig 0105, per-player preference gate):
//   POST /v1/_test/meta-market/set-visibility
//     Body: { playerId: string, enabled: boolean | null }
//     Sets player.meta_market_visibility_enabled for test isolation + falsifiability.
//     NULL = use tunable default (effective ON). TRUE = opt in. FALSE = opt out.
//     → { playerId, visibilityEnabled: boolean | null }
//
//   GET /v1/_test/meta-market/get-signal-with-visibility
//     Query: playerId regionId substance districtProfile
//     Calls MetaMarketReadService.getSignalWithVisibility(playerId, regionId, substance, districtProfile).
//     Returns: { result: MetaMarketSignalView | 'insufficient_signal' }
//     Falsifiable: set-visibility(FALSE) → get-signal-with-visibility → 'insufficient_signal'.
//       set-visibility(TRUE or NULL) + aggregated signal above floor → returns the signal view.

import { Body, Controller, Get, Headers, HttpCode, HttpException, HttpStatus, Post, Query, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { Inject } from '@nestjs/common';
import { and, eq, sql, type SQL } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { player } from '../../db/schema/player';
import { account } from '../../db/schema/account';
import { metaMarketSignals, metaMarketContributions, metaMarketCohortFlags } from '../../db/schema/meta_market';
import { substanceType } from '../../db/schema/operational_chain';
import { districtProfile as districtProfileEnum } from '../../db/schema/world_geography';

// Local type aliases for enum casts in C2 seed routes (not re-exported — controller-only).
type SubstanceEnumVal = (typeof substanceType.enumValues)[number];
type DistrictProfileEnumVal = (typeof districtProfileEnum.enumValues)[number];
import { MetaMarketStubService } from './meta-market-stub.service';
import { MaxMindGeoIpService } from './maxmind-geoip.service';
import { RegionService } from './region.service';
import { MetaMarketTunables, clampMetaMarketToRange } from './meta-market.tunables';
import { MetaMarketHashService } from './meta-market-hash.service';
import { MetaMarketContributionService } from './meta-market-contribution.service';
import { MetaMarketAggregationService } from './meta-market-aggregation.service';
import { MetaMarketRetentionService } from './meta-market-retention.service';
import { MetaMarketReadService } from './meta-market-read.service';
import { MetaMarketAntiCheatService } from './meta-market-anti-cheat.service';

// Counter for unique C1b test callsigns (module-level, monotonically increasing).
let _regionTestCallsignCounter = 0;
function nextRegionTestCallsign(): string {
  return `rgn${Date.now().toString(36).slice(-8)}${(++_regionTestCallsignCounter).toString(36)}`;
}

/**
 * Test-only probe controller for MetaMarketModule.
 *
 * All routes live under the `/v1/_test/meta-market/` prefix.
 * Mounted conditionally by MetaMarketModule (only when testControllersEnabled()).
 *
 * @see testControllersEnabled (../../protocol/test-routes-gate)
 */
@Controller()
export class MetaMarketTestController {
  constructor(
    // C0: DI anchor stub (will have active callers at C1+).
    private readonly stub: MetaMarketStubService,
    // C1: in-process GeoLite2 reader — IP → country (decision #1, zero external runtime call).
    private readonly geoIp: MaxMindGeoIpService,
    // C1b: region assignment service.
    private readonly regionService: RegionService,
    // C1b: direct DB access for seed-player + delete-player routes.
    @Inject(DB) private readonly db: DrizzleClient,
    // C3: MetaMarketTunables — registry-mirrored getters for 13 keys (9 canon + 2 perf_budget + 2 region).
    private readonly tunables: MetaMarketTunables,
    // C4: MetaMarketHashService — HMAC-SHA256 hasher probe (determinism + player_id-never-persisted proofs).
    private readonly hashService: MetaMarketHashService,
    // C4: MetaMarketContributionService — recordDeal probe for contribution chain test.
    private readonly contributionService: MetaMarketContributionService,
    // C5: MetaMarketAggregationService — run-aggregation + compute-stats probes.
    private readonly aggregationService: MetaMarketAggregationService,
    // C5: MetaMarketRetentionService — run-retention probe.
    private readonly retentionService: MetaMarketRetentionService,
    // C6: MetaMarketReadService — getSignal (clear aggregate + sample-floor insufficient_signal) + 7d trend probe.
    private readonly readService: MetaMarketReadService,
    // C6: MetaMarketAntiCheatService — detectCoordinatedCohort → meta_market_cohort_flags probe.
    private readonly antiCheatService: MetaMarketAntiCheatService,
  ) {}

  // ── C0 ──────────────────────────────────────────────────────────────────────────────────────

  /** C0 connectivity probe: returns { ok: true } if MetaMarketModule is in the DI graph. */
  @Get('_test/meta-market/ping')
  ping(): { ok: true } {
    void this.stub;
    return { ok: true };
  }

  // ── C1 — Geo-IP test injection (decision #1, §2.1 plan) ─────────────────────────────────────

  /**
   * C1 geo-IP lookup probe.
   *
   * Resolution order:
   *   1. If `X-Test-Geo-Ip` header is present → use that IP directly with `lookupCountry()`.
   *      This exercises the real MaxMind lookup path deterministically via the test fixture.
   *   2. Otherwise → extract the IP via `extractIpFromRequest(req)` (reads `X-Forwarded-For`
   *      leftmost, then connection IP) and look it up. This covers the XFF-extraction test case.
   *
   * RGPD: the IP is passed to `lookupCountry()` and immediately discarded. Nothing is persisted.
   *
   * @returns `{ country: string | null }` — ISO 3166-1 alpha-2 code or null (not found / no reader).
   */
  @Get('_test/meta-market/geoip-lookup')
  geoipLookup(
    @Headers('x-test-geo-ip') testGeoIp: string | undefined,
    @Req() req: IncomingMessage,
  ): { country: string | null } {
    // Prefer the explicit test header (deterministic fixture path); fall back to XFF/connection.
    const ip = testGeoIp?.trim() ?? this.geoIp.extractIpFromRequest(req);
    if (!ip) return { country: null };
    // RGPD: ip is transient — lookupCountry() returns country code only; ip is never persisted.
    const country = this.geoIp.lookupCountry(ip);
    return { country };
  }

  /**
   * C1 X-Forwarded-For extraction probe.
   *
   * Exercises `MaxMindGeoIpService.extractIpFromRequest()` directly — returns the extracted IP
   * (before the lookup), so tests can assert leftmost-XFF extraction independently of the `.mmdb`.
   *
   * Send `X-Forwarded-For: A, B` → `{ ip: 'A' }` (leftmost).
   * No header → `{ ip: '<connection IP>' }` (TCP connection address from the E2E shard network).
   *
   * RGPD: this endpoint returns the IP for test assertion only. The IP is never persisted.
   * Only used by E2E tests (gated — never mounted in production).
   *
   * @returns `{ ip: string | null }` — the extracted client IP (NOT a country code).
   */
  @Get('_test/meta-market/forwarded-for')
  forwardedForProbe(@Req() req: IncomingMessage): { ip: string | null } {
    const ip = this.geoIp.extractIpFromRequest(req);
    return { ip };
  }

  // ── C1b — Region substrate (region assignment + player seed/cleanup) ─────────────────────────────

  /**
   * POST /v1/_test/meta-market/seed-player
   *
   * C1b schema probe: create a test account + player WITHOUT a region_id (NULL).
   *
   * Proves retro-compat: existing player INSERT without region_id succeeds (nullable additive column).
   *
   * Creates: account (kind=PLAYER, lifecycle_state=ACTIVE) → player (unique callsign, no region_id).
   * The player.region_id is explicitly NOT set — it will be NULL in the DB (rétro-compat proof).
   *
   * @returns `{ playerId: string }` — the new player's UUID.
   */
  @Post('_test/meta-market/seed-player')
  @HttpCode(201)
  async seedPlayer(): Promise<{ playerId: string }> {
    // Step 1: create test account.
    const accountRows = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const accountId = accountRows[0]!.account_id;

    // Step 2: create test player — NO region_id (null, proving rétro-compat insertion).
    const callsign = nextRegionTestCallsign();
    const playerRows = await this.db
      .insert(player)
      .values({
        account_id: accountId,
        callsign,
        email: `${callsign}@rgn-test.invalid`,
        locale: 'en',
        // region_id intentionally omitted → NULL (rétro-compat proof: additive nullable column)
      })
      .returning({ player_id: player.player_id });

    return { playerId: playerRows[0]!.player_id };
  }

  /**
   * POST /v1/_test/meta-market/assign-region
   *
   * C1b floor probe: assign a region to a player via RegionService.
   *
   * Header priority (test injection — §2.1 plan):
   *   1. `X-Test-Force-Region: <regionId>` → calls `RegionService.setRegion(playerId, regionId)`.
   *      Bypasses geo-IP — tests the assignment wire directly.
   *   2. `X-Test-Geo-Ip: <ip>` → calls `RegionService.assignRegionFromIp(playerId, ip)`.
   *      Tests the REAL geo-IP lookup path (IP→country→region via test fixture mmdb).
   *   3. Neither header → calls `assignRegionFromIp` with IP from extractIpFromRequest(req).
   *      In E2E (container network), the connection IP is private (10.x/172.x) → `null` from mmdb
   *      → fallback 'unknown'. This proves the fallback path.
   *
   * RGPD: the IP (from X-Test-Geo-Ip or XFF/connection) is NEVER persisted.
   * Only `region_id` is written to `player.region_id`.
   *
   * Body: `{ playerId: string }`
   * @returns `{ playerId: string, regionId: string }`
   */
  @Post('_test/meta-market/assign-region')
  @HttpCode(HttpStatus.OK)
  async assignRegion(
    @Body() body: { playerId?: string },
    @Headers('x-test-force-region') forceRegion: string | undefined,
    @Headers('x-test-geo-ip') testGeoIp: string | undefined,
    @Req() req: IncomingMessage,
  ): Promise<{ playerId: string; regionId: string }> {
    const { playerId } = body ?? {};
    if (!playerId || typeof playerId !== 'string') {
      throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    }

    let regionId: string;

    if (forceRegion?.trim()) {
      // Path 1: X-Test-Force-Region → direct assignment (bypasses geo-IP).
      regionId = forceRegion.trim();
      await this.regionService.setRegion(playerId, regionId);
    } else {
      // Path 2/3: geo-IP path (real lookup or XFF/connection fallback).
      // RGPD: ip is transient — assignRegionFromIp resolves it to region_id and discards it.
      const ip = testGeoIp?.trim() ?? this.geoIp.extractIpFromRequest(req) ?? '';
      regionId = await this.regionService.assignRegionFromIp(playerId, ip);
    }

    return { playerId, regionId };
  }

  /**
   * GET /v1/_test/meta-market/get-region?playerId=<uuid>
   *
   * C1b floor probe: read a player's `region_id` from the DB.
   *
   * Returns null for pre-C1b players (region_id is NULL until first assignment).
   * Falsifiable: after assign-region, getRegion returns the assigned value.
   *
   * @returns `{ playerId: string, regionId: string | null }`
   */
  @Get('_test/meta-market/get-region')
  async getRegion(
    @Query('playerId') playerId: string | undefined,
  ): Promise<{ playerId: string; regionId: string | null }> {
    if (!playerId || typeof playerId !== 'string') {
      throw new HttpException('playerId query param required', HttpStatus.BAD_REQUEST);
    }

    const regionId = await this.regionService.getRegion(playerId);
    return { playerId, regionId };
  }

  /**
   * POST /v1/_test/meta-market/delete-player
   *
   * C1b floor probe cleanup: delete a test player + its account (CASCADE via player FK).
   *
   * Body: `{ playerId: string }`
   * @returns `{ deleted: true }`
   */
  @Post('_test/meta-market/delete-player')
  @HttpCode(HttpStatus.OK)
  async deletePlayer(@Body() body: { playerId?: string }): Promise<{ deleted: true }> {
    const { playerId } = body ?? {};
    if (!playerId || typeof playerId !== 'string') {
      throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    }

    // Fetch account_id before deleting player (to clean up the account row).
    const rows = await this.db
      .select({ account_id: player.account_id })
      .from(player)
      .where(eq(player.player_id, playerId))
      .limit(1);

    const accountId = rows[0]?.account_id;

    // Delete player first (child FK → account, but CASCADE is on downstream children only).
    await this.db.delete(player).where(eq(player.player_id, playerId));

    // Then delete account if found.
    if (accountId) {
      await this.db.delete(account).where(eq(account.account_id, accountId));
    }

    return { deleted: true };
  }

  // ── C2 — Schema persistence probe (migrations 0103-0104) ────────────────────────────────────

  /**
   * POST /v1/_test/meta-market/seed-signal
   *
   * C2 schema probe: insert one meta_market_signals row and read it back.
   *
   * Proves: migration 0103 applied (table exists), composite PK works,
   * bigint columns (median/p10/p90) round-trip through Drizzle, and
   * NO player_id column exists (GLOBAL aggregate table).
   *
   * Body: {
   *   regionId: string,       — must exist in region table (e.g. 'eu-west')
   *   substance: string,      — substance_type enum value (e.g. 'brindle')
   *   districtProfile: string,— district_profile enum value (e.g. 'tidewater')
   *   aggregatedAt: string,   — ISO 8601 timestamp (e.g. '2026-07-03T12:00:00.000Z')
   *   sampleCount: number,
   *   medianPriceCents: number,
   *   p10PriceCents: number,
   *   p90PriceCents: number,
   * }
   * @returns the inserted row (bigint fields as strings in JSON — Drizzle bigint mode: 'bigint' serializes to BigInt → JSON string)
   */
  @Post('_test/meta-market/seed-signal')
  @HttpCode(201)
  async seedSignal(@Body() body: {
    regionId?: string;
    substance?: string;
    districtProfile?: string;
    aggregatedAt?: string;
    sampleCount?: number;
    medianPriceCents?: number;
    p10PriceCents?: number;
    p90PriceCents?: number;
  }): Promise<Record<string, unknown>> {
    const {
      regionId,
      substance,
      districtProfile,
      aggregatedAt,
      sampleCount,
      medianPriceCents,
      p10PriceCents,
      p90PriceCents,
    } = body ?? {};

    if (!regionId || !substance || !districtProfile || !aggregatedAt
        || sampleCount === undefined || medianPriceCents === undefined
        || p10PriceCents === undefined || p90PriceCents === undefined) {
      throw new HttpException(
        'regionId, substance, districtProfile, aggregatedAt, sampleCount, medianPriceCents, p10PriceCents, p90PriceCents required',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Insert the signal row (ON CONFLICT DO NOTHING to allow idempotent re-runs).
    await this.db
      .insert(metaMarketSignals)
      .values({
        region_id:           regionId,
        substance:           substance as SubstanceEnumVal,
        district_profile:    districtProfile as DistrictProfileEnumVal,
        aggregated_at:       new Date(aggregatedAt),
        sample_count:        sampleCount,
        median_price_cents:  BigInt(medianPriceCents),
        p10_price_cents:     BigInt(p10PriceCents),
        p90_price_cents:     BigInt(p90PriceCents),
      })
      .onConflictDoNothing();

    // Read back the row to prove persistence.
    const rows = await this.db
      .select()
      .from(metaMarketSignals)
      .where(
        sql`${metaMarketSignals.region_id} = ${regionId}
          AND ${metaMarketSignals.substance} = ${substance}::substance_type
          AND ${metaMarketSignals.district_profile} = ${districtProfile}::district_profile
          AND ${metaMarketSignals.aggregated_at} = ${new Date(aggregatedAt)}`,
      )
      .limit(1);

    if (!rows[0]) {
      throw new HttpException('signal row not found after insert', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // Serialize: BigInt values → string for JSON transport.
    const row = rows[0] as Record<string, unknown>;
    return {
      region_id:           row['region_id'],
      substance:           row['substance'],
      district_profile:    row['district_profile'],
      aggregated_at:       (row['aggregated_at'] as Date).toISOString(),
      sample_count:        row['sample_count'],
      median_price_cents:  String(row['median_price_cents']),
      p10_price_cents:     String(row['p10_price_cents']),
      p90_price_cents:     String(row['p90_price_cents']),
    };
  }

  /**
   * POST /v1/_test/meta-market/seed-contribution
   *
   * C2 schema probe: insert one meta_market_contributions row and read it back.
   *
   * PRIVACY PROOF: the body uses `contributorHash` (not `playerId`). The DB row has
   * `contributor_hash` column and NO `player_id` column (enforced by the Drizzle schema).
   *
   * Proves: migration 0104 applied (table exists), contributor_hash column present,
   * NO player_id column in the row (privacy by schema).
   *
   * Body: {
   *   contributorHash: string,  — 64-char HMAC-SHA256 hex (test: any 64-char hex string)
   *   regionId: string,
   *   substance: string,
   *   districtProfile: string,
   *   priceCents: number,
   *   bucketHour: string,       — ISO 8601 timestamp
   * }
   * @returns the inserted row (price_cents as string; contributor_hash present; NO player_id)
   */
  @Post('_test/meta-market/seed-contribution')
  @HttpCode(201)
  async seedContribution(@Body() body: {
    contributorHash?: string;
    regionId?: string;
    substance?: string;
    districtProfile?: string;
    priceCents?: number;
    bucketHour?: string;
  }): Promise<Record<string, unknown>> {
    const {
      contributorHash,
      regionId,
      substance,
      districtProfile,
      priceCents,
      bucketHour,
    } = body ?? {};

    if (!contributorHash || !regionId || !substance || !districtProfile
        || priceCents === undefined || !bucketHour) {
      throw new HttpException(
        'contributorHash, regionId, substance, districtProfile, priceCents, bucketHour required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const inserted = await this.db
      .insert(metaMarketContributions)
      .values({
        contributor_hash: contributorHash,
        region_id:        regionId,
        substance:        substance as SubstanceEnumVal,
        district_profile: districtProfile as DistrictProfileEnumVal,
        price_cents:      BigInt(priceCents),
        bucket_hour:      new Date(bucketHour),
      })
      .returning();

    const row = inserted[0] as Record<string, unknown>;
    if (!row) {
      throw new HttpException('contribution row not inserted', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // Serialize for JSON transport. Privacy proof: no 'player_id' key in this object.
    return {
      contribution_id:   row['contribution_id'],
      contributor_hash:  row['contributor_hash'],   // present — HMAC hash
      region_id:         row['region_id'],
      substance:         row['substance'],
      district_profile:  row['district_profile'],
      price_cents:       String(row['price_cents']), // bigint → string
      contributed_at:    (row['contributed_at'] as Date).toISOString(),
      bucket_hour:       (row['bucket_hour'] as Date).toISOString(),
      // NOTE: no 'player_id' key — it does not exist in this table (privacy wall).
    };
  }

  /**
   * POST /v1/_test/meta-market/seed-cohort-flag
   *
   * C2 schema probe: insert one meta_market_cohort_flags row and read it back.
   *
   * Proves: migration 0104 applied (table exists), district_profile is nullable,
   * flagged_pattern and cohort_size persist correctly.
   *
   * Body: {
   *   regionId: string,
   *   substance: string,
   *   districtProfile?: string,   — nullable
   *   flaggedPattern: string,
   *   cohortSize: number,
   * }
   * @returns the inserted row (detected_at as ISO string)
   */
  @Post('_test/meta-market/seed-cohort-flag')
  @HttpCode(201)
  async seedCohortFlag(@Body() body: {
    regionId?: string;
    substance?: string;
    districtProfile?: string;
    flaggedPattern?: string;
    cohortSize?: number;
  }): Promise<Record<string, unknown>> {
    const { regionId, substance, districtProfile, flaggedPattern, cohortSize } = body ?? {};

    if (!regionId || !substance || !flaggedPattern || cohortSize === undefined) {
      throw new HttpException(
        'regionId, substance, flaggedPattern, cohortSize required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const inserted = await this.db
      .insert(metaMarketCohortFlags)
      .values({
        region_id:       regionId,
        substance:       substance as SubstanceEnumVal,
        district_profile: districtProfile ? (districtProfile as DistrictProfileEnumVal) : undefined,
        flagged_pattern: flaggedPattern,
        cohort_size:     cohortSize,
      })
      .returning();

    const row = inserted[0] as Record<string, unknown>;
    if (!row) {
      throw new HttpException('cohort flag row not inserted', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return {
      flag_id:          row['flag_id'],
      region_id:        row['region_id'],
      substance:        row['substance'],
      district_profile: row['district_profile'] ?? null,
      flagged_pattern:  row['flagged_pattern'],
      cohort_size:      row['cohort_size'],
      detected_at:      (row['detected_at'] as Date).toISOString(),
    };
  }

  /**
   * GET /v1/_test/meta-market/list-contribution-columns
   *
   * C2 privacy proof: query information_schema to get column names for meta_market_contributions.
   *
   * Returns `{ columns: string[] }` — the actual column names as reported by PostgreSQL.
   *
   * Falsifiable privacy proof:
   *   - 'contributor_hash' is in columns (the HMAC hash column IS present).
   *   - 'player_id' is NOT in columns (the raw player_id is NOT stored — privacy by schema).
   *   - 'ip_address' (and similar IP-named columns) are NOT in columns (RGPD derive-then-discard).
   *
   * This complements the structural assertion in the Drizzle schema (no player_id column declared)
   * with a live DB introspection — even if the schema file were wrong, the real DB would show it.
   */
  @Get('_test/meta-market/list-contribution-columns')
  async listContributionColumns(): Promise<{ columns: string[] }> {
    const result = await this.db.execute(
      sql`SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'meta_market_contributions'
          ORDER BY ordinal_position`,
    );

    // drizzle.execute() returns { rows: Array<Record<string, unknown>> }.
    const rows = (result as { rows: Array<Record<string, unknown>> }).rows;
    const columns = rows.map((r) => String(r['column_name']));
    return { columns };
  }

  // ── C3 — Tunables probe routes ───────────────────────────────────────────────────────────────

  /**
   * GET /v1/_test/meta-market/read-tunables
   *
   * Returns all MetaMarketTunables getter values as a plain object.
   * Used by `meta_market_tunables_bootstrap.spec.ts` C3 to assert value-sensitive defaults.
   *
   * Anti-fabrication: the assertions read REAL getter output via the live server — not
   * hardcoded echoes. The tunables are sourced from TunablesStore.resolve* (DB → env → default).
   * C3-determinism: NO Math.random(), NO Date.now().
   * R2.2/P5: these are tunables registry values (not player-facing data); safe to expose via _test.
   *
   * 13 keys total:
   *   9 canon meta_market.* (async_meta_market.md :171-181)
   *   2 perf_budget.* (memory_budget_meta_market.md :98-99)
   *   2 region keys [PROV-Y26Q2]
   */
  @Get('_test/meta-market/read-tunables')
  readTunables(): Record<string, unknown> {
    return {
      // ── 9 canon meta_market.* scalars (signal quality + privacy wall) ──────────────────────
      sampleFloor:                                    this.tunables.sampleFloor,
      trimPct:                                        this.tunables.trimPct,
      bucketDurationMinutes:                          this.tunables.bucketDurationMinutes,
      retentionDays:                                  this.tunables.retentionDays,
      defaultVisibility:                              this.tunables.defaultVisibility,
      aggregationWorkerCount:                         this.tunables.aggregationWorkerCount,
      contributionRateLimitPerPlayerPerHour:          this.tunables.contributionRateLimitPerPlayerPerHour,
      hmacSecretRotationDays:                         this.tunables.hmacSecretRotationDays,
      coordinatedCohortDetectionThresholdAccounts:    this.tunables.coordinatedCohortDetectionThresholdAccounts,
      // ── 2 perf_budget.* scalars ─────────────────────────────────────────────────────────────
      perfBudget04dMaxKbPerPlayer:                    this.tunables.perfBudget04dMaxKbPerPlayer,
      perfBudgetMetaMarketMaxRowsTotal:               this.tunables.perfBudgetMetaMarketMaxRowsTotal,
      // ── 2 region keys [PROV-Y26Q2] ──────────────────────────────────────────────────────────
      regionCount:                                    this.tunables.regionCount,
      defaultRegionId:                                this.tunables.defaultRegionId,
    };
  }

  /**
   * POST /v1/_test/meta-market/probe-clamp
   *
   * Body: { key: string, value: number }
   * Returns: { clamped: number }
   *
   * Applies `clampMetaMarketToRange(key, value)` and returns the result.
   * FALSIFIABLE: posting { key: 'meta_market.sample_floor', value: 999 }
   * returns { clamped: 20 } because the range cap is max=20 (not 999).
   * C3: NO Math.random(), NO Date.now().
   */
  @Post('_test/meta-market/probe-clamp')
  @HttpCode(200)
  probeClamp(@Body() body: { key?: string; value?: number }): { clamped: number } {
    const key = body?.key;
    const value = body?.value;
    if (typeof key !== 'string' || key.length === 0) {
      throw new HttpException('key is required', HttpStatus.BAD_REQUEST);
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new HttpException('value must be a finite number', HttpStatus.BAD_REQUEST);
    }
    const clamped = clampMetaMarketToRange(key, value);
    return { clamped };
  }

  // ── C4 — Contribution recording probe routes ─────────────────────────────────────────────────
  //
  // C4 routes:
  //   POST /v1/_test/meta-market/record-deal
  //     Body: { playerId: string, substance: string, districtId: number, realizedPriceCents: number, gameMinute: number }
  //     Calls MetaMarketContributionService.recordDeal directly.
  //     → { ok: true, bucketHour: string (ISO) } — confirms the call succeeded.
  //     Falsifiable chain proof: after this call, a meta_market_contributions row exists
  //       (verified by count-contributions-for-bucket below).
  //
  //   GET /v1/_test/meta-market/hash-player?playerId=<uuid>&regionId=<regionId>
  //     Returns { contributorHash: string } — the HMAC-SHA256 hash of playerId for regionId.
  //     Falsifiable determinism: same params → same hash (call twice); different playerIds → different hashes.
  //     Privacy: player_id is received transiently; only the hash is returned (never persisted here).
  //
  //   GET /v1/_test/meta-market/count-contributions-for-bucket
  //     Query: regionId, substance, districtProfile, bucketHour (ISO string)
  //     Returns { count: number } — how many contributions match this (region, substance, profile, bucket).
  //     Falsifiable rate-limit proof: after two record-deal calls for same (player, substance, district, hour),
  //       count is still 1 (second call rate-limited).

  /**
   * POST /v1/_test/meta-market/record-deal
   *
   * C4 probe: directly calls `MetaMarketContributionService.recordDeal` with provided parameters.
   *
   * This is the core contribution chain test: proves that `recordDeal` writes a correct row to
   * `meta_market_contributions` with `contributor_hash` present and `player_id` absent.
   *
   * Body: {
   *   playerId: string,           — the player UUID (NEVER stored; only the HMAC hash is persisted)
   *   substance: string,          — substance_type enum value (e.g. 'brindle')
   *   districtId: number,         — integer district_id (e.g. 2 for block 101)
   *   realizedPriceCents: number, — per-gram realized sell price in cents (e.g. 2500)
   *   gameMinute: number,         — current game tick minute (e.g. 5000)
   * }
   * @returns { ok: true, bucketHour: string }
   *   bucketHour: the ISO UTC hour boundary this contribution was bucketed to (for verification).
   */
  @Post('_test/meta-market/record-deal')
  @HttpCode(200)
  async recordDeal(@Body() body: {
    playerId?: string;
    substance?: string;
    districtId?: number;
    realizedPriceCents?: number;
    gameMinute?: number;
  }): Promise<{ ok: true; bucketHour: string }> {
    const { playerId, substance, districtId, realizedPriceCents, gameMinute } = body ?? {};

    if (!playerId || typeof playerId !== 'string') {
      throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    }
    if (!substance || typeof substance !== 'string') {
      throw new HttpException('substance required', HttpStatus.BAD_REQUEST);
    }
    if (districtId === undefined || typeof districtId !== 'number') {
      throw new HttpException('districtId (number) required', HttpStatus.BAD_REQUEST);
    }
    if (realizedPriceCents === undefined || typeof realizedPriceCents !== 'number') {
      throw new HttpException('realizedPriceCents (number) required', HttpStatus.BAD_REQUEST);
    }
    if (gameMinute === undefined || typeof gameMinute !== 'number') {
      throw new HttpException('gameMinute (number) required', HttpStatus.BAD_REQUEST);
    }

    // Call the REAL service — this is what SellingSellService.runMinuteTick calls after applySells.
    await this.contributionService.recordDeal(playerId, substance, districtId, realizedPriceCents, gameMinute);

    // Compute the bucket hour so the caller can use it in count-contributions-for-bucket.
    const nowMs = Date.now();
    const bucketHour = new Date(Math.floor(nowMs / (1000 * 60 * 60)) * (1000 * 60 * 60));

    return { ok: true, bucketHour: bucketHour.toISOString() };
  }

  /**
   * GET /v1/_test/meta-market/hash-player?playerId=<uuid>&regionId=<regionId>
   *
   * C4 HMAC probe: returns the `contributor_hash` for a given (playerId, regionId) pair.
   *
   * Used to prove:
   *   - HMAC determinism: same params → same hash (call twice).
   *   - Different players → different hashes (two calls with different playerId).
   *   - The hash is 64 lowercase hex chars (valid HMAC-SHA256 output format).
   *
   * RGPD: playerId is received transiently and hashed only — never stored by this route.
   *
   * @returns { contributorHash: string } — the 64-char HMAC-SHA256 hex hash.
   */
  @Get('_test/meta-market/hash-player')
  hashPlayer(
    @Query('playerId') playerId: string | undefined,
    @Query('regionId') regionId: string | undefined,
  ): { contributorHash: string } {
    if (!playerId || typeof playerId !== 'string') {
      throw new HttpException('playerId query param required', HttpStatus.BAD_REQUEST);
    }
    if (!regionId || typeof regionId !== 'string') {
      throw new HttpException('regionId query param required', HttpStatus.BAD_REQUEST);
    }
    const contributorHash = this.hashService.hashPlayerId(playerId, regionId);
    return { contributorHash };
  }

  /**
   * GET /v1/_test/meta-market/count-contributions-for-bucket
   *
   * C4 rate-limit + chain proof: count contributions matching the given bucket parameters.
   *
   * Query params:
   *   regionId:        string — e.g. 'eu-west', 'unknown'
   *   substance:       string — substance_type enum value
   *   districtProfile: string — district_profile enum value
   *   bucketHour:      string — ISO 8601 UTC hour boundary
   *
   * @returns { count: number }
   *   count=1 after first record-deal for (player, substance, district, hour).
   *   count=1 STILL after second record-deal for same params (rate-limited — only 1 row allowed).
   */
  @Get('_test/meta-market/count-contributions-for-bucket')
  async countContributionsForBucket(
    @Query('regionId') regionId: string | undefined,
    @Query('substance') substance: string | undefined,
    @Query('districtProfile') districtProfile: string | undefined,
    @Query('bucketHour') bucketHour: string | undefined,
  ): Promise<{ count: number }> {
    if (!regionId || !substance || !districtProfile || !bucketHour) {
      throw new HttpException(
        'regionId, substance, districtProfile, bucketHour query params required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const result = await this.db.execute(
      sql`SELECT COUNT(*) AS cnt
          FROM meta_market_contributions
          WHERE region_id = ${regionId}
            AND substance = ${substance}::substance_type
            AND district_profile = ${districtProfile}::district_profile
            AND bucket_hour = ${new Date(bucketHour)}`,
    );
    const rows = (result as { rows: Array<Record<string, unknown>> }).rows;
    const cnt = Number(rows[0]?.['cnt'] ?? 0);
    return { count: cnt };
  }

  // ── C5 — Aggregation + retention probe routes ────────────────────────────────────────────────

  /**
   * POST /v1/_test/meta-market/run-aggregation
   *
   * C5 aggregation probe: directly calls `MetaMarketAggregationService.runHourlyAggregation()`.
   *
   * Used to:
   *   (a) Prove trim/median/p10/p90 falsifiability: seed N contributions with known prices →
   *       run-aggregation → list-signals shows the correct stats.
   *   (b) Prove L1 skip: 0 pending contributions → runs in no-op mode (no DB writes).
   *   (c) Prove idempotency: run twice with same contributions → same output.
   *
   * Returns: {
   *   ok: true,
   *   aggregatedAt: string — the UTC hour boundary key written to meta_market_signals.
   * }
   *
   * Note: this route bypasses the scheduler. To prove the TICK FIRES via the real scheduler,
   * use the `advance` harness (see meta_market_aggregation.spec.ts C5-1 scheduler test).
   */
  @Post('_test/meta-market/run-aggregation')
  @HttpCode(200)
  async runAggregation(): Promise<{ ok: true; aggregatedAt: string }> {
    await this.aggregationService.runHourlyAggregation();
    const aggregatedAt = this.aggregationService.currentAggregationBucket();
    return { ok: true, aggregatedAt: aggregatedAt.toISOString() };
  }

  /**
   * GET /v1/_test/meta-market/list-signals
   *
   * C5 signal probe: returns all `meta_market_signals` rows matching optional filters.
   *
   * Query params (all optional):
   *   regionId:        filter by region_id (e.g. 'eu-west')
   *   substance:       filter by substance (e.g. 'brindle')
   *   districtProfile: filter by district_profile (e.g. 'tidewater')
   *
   * Returns: { signals: Array<{
   *   regionId, substance, districtProfile, aggregatedAt: string (ISO),
   *   sampleCount: number,
   *   medianPriceCents: string (bigint as string),
   *   p10PriceCents: string (bigint as string),
   *   p90PriceCents: string (bigint as string),
   * }> }
   *
   * Falsifiable: after run-aggregation, exactly one signal appears per bucket with the exact
   * median/p10/p90 derived from the seeded contributions.
   */
  @Get('_test/meta-market/list-signals')
  async listSignals(
    @Query('regionId')        regionId: string | undefined,
    @Query('substance')       substance: string | undefined,
    @Query('districtProfile') districtProfile: string | undefined,
  ): Promise<{ signals: Array<Record<string, unknown>> }> {
    const conditions: SQL[] = [];
    if (regionId) {
      conditions.push(eq(metaMarketSignals.region_id, regionId));
    }
    if (substance) {
      conditions.push(eq(metaMarketSignals.substance, substance as SubstanceEnumVal));
    }
    if (districtProfile) {
      conditions.push(eq(metaMarketSignals.district_profile, districtProfile as DistrictProfileEnumVal));
    }

    const rows = conditions.length > 0
      ? await this.db.select().from(metaMarketSignals).where(and(...conditions))
      : await this.db.select().from(metaMarketSignals);

    const signals = rows.map((r) => ({
      regionId:         r.region_id,
      substance:        r.substance,
      districtProfile:  r.district_profile,
      aggregatedAt:     r.aggregated_at.toISOString(),
      sampleCount:      r.sample_count,
      // bigint → string (JSON cannot represent bigint natively).
      medianPriceCents: r.median_price_cents.toString(),
      p10PriceCents:    r.p10_price_cents.toString(),
      p90PriceCents:    r.p90_price_cents.toString(),
    }));

    return { signals };
  }

  /**
   * POST /v1/_test/meta-market/run-retention
   *
   * C5 retention probe: directly calls `MetaMarketRetentionService.purgeOlderThan(retentionDays)`.
   *
   * Body: { retentionDays?: number } — optional override (default: MetaMarketTunables.retentionDays = 30).
   *   Pass a small value (e.g. 0) to force purging of all signals regardless of age.
   *   Pass a large value (e.g. 999999) to prove no signals are purged (all are "recent").
   *
   * Returns: { signalsDeleted: number, contributionsDeleted: number }
   *
   * Falsifiable retention proof:
   *   - Seed an old signal (aggregatedAt in the far past) + a recent signal.
   *   - run-retention with retentionDays=30 → old signal deleted, recent signal remains.
   *   - run-retention again (idempotent) → same result (0 more deletions).
   */
  @Post('_test/meta-market/run-retention')
  @HttpCode(200)
  async runRetention(
    @Body() body: { retentionDays?: number },
  ): Promise<{ signalsDeleted: number; contributionsDeleted: number }> {
    const retentionDays = (typeof body?.retentionDays === 'number' && Number.isFinite(body.retentionDays))
      ? body.retentionDays
      : this.tunables.retentionDays;

    return this.retentionService.purgeOlderThan(retentionDays);
  }

  /**
   * POST /v1/_test/meta-market/compute-stats
   *
   * C5 stats probe: calls `MetaMarketAggregationService.computeStats(prices, trimPct)` directly.
   *
   * Body: { prices: number[], trimPct?: number }
   *   prices:  array of price values (cents). Must be non-empty.
   *   trimPct: optional override for the trim percentage (default: MetaMarketTunables.trimPct = 5).
   *
   * Returns: { median: number, p10: number, p90: number, sampleCount: number }
   *
   * Falsifiable trim proof:
   *   - 20 values: [1, low_outlier, ...middle..., high_outlier, 99999]
   *   - With trimPct=5%: trimCount=1 → outliers removed → median/p10/p90 from inner 18 values.
   *   - Without trim (trimPct=0): include outliers → different p10/p90.
   *   The difference PROVES trim removes outliers deterministically.
   */
  @Post('_test/meta-market/compute-stats')
  @HttpCode(200)
  computeStats(
    @Body() body: { prices?: number[]; trimPct?: number },
  ): { median: number; p10: number; p90: number; sampleCount: number } {
    const prices = body?.prices;
    if (!Array.isArray(prices) || prices.length === 0) {
      throw new HttpException('prices must be a non-empty array of numbers', HttpStatus.BAD_REQUEST);
    }
    if (!prices.every((p) => typeof p === 'number' && Number.isFinite(p))) {
      throw new HttpException('all prices must be finite numbers', HttpStatus.BAD_REQUEST);
    }

    const trimPct = (typeof body?.trimPct === 'number' && Number.isFinite(body.trimPct))
      ? body.trimPct
      : this.tunables.trimPct;

    return this.aggregationService.computeStats(prices, trimPct);
  }

  // ── C6 — Read API + sample-floor + anti-cheat ──────────────────────────────────────────────────

  /**
   * GET /v1/_test/meta-market/get-signal
   *
   * C6 read API probe: calls `MetaMarketReadService.getSignal(regionId, substance, districtProfile)`.
   *
   * Query params: regionId, substance, districtProfile
   *
   * Returns:
   *   - { signal: 'insufficient_signal' }  — if no signal row OR sample_count < sampleFloor.
   *   - { signal: { medianCents, p10Cents, p90Cents, sampleCount, lastAggregatedAt, trend } }
   *     where bigint fields are serialized as strings (JSON cannot represent bigint natively).
   *
   * Falsifiable sample-floor proof:
   *   - Seed a signal with sampleCount >= floor (5) → signal is returned.
   *   - Seed a signal with sampleCount < floor (4) → 'insufficient_signal'.
   *   The threshold is the same tunables value (default=5), making the floor observable.
   */
  @Get('_test/meta-market/get-signal')
  async getSignal(
    @Query('regionId') regionId: string,
    @Query('substance') substance: string,
    @Query('districtProfile') districtProfile: string,
  ): Promise<{ signal: 'insufficient_signal' | Record<string, unknown> }> {
    if (!regionId || !substance || !districtProfile) {
      throw new HttpException('regionId, substance, districtProfile are required', HttpStatus.BAD_REQUEST);
    }

    const result = await this.readService.getSignal(regionId, substance, districtProfile);

    if (result === 'insufficient_signal') {
      return { signal: 'insufficient_signal' };
    }

    return {
      signal: {
        // bigint → string (JSON cannot represent bigint natively).
        medianCents:      result.medianCents.toString(),
        p10Cents:         result.p10Cents.toString(),
        p90Cents:         result.p90Cents.toString(),
        sampleCount:      result.sampleCount,
        lastAggregatedAt: result.lastAggregatedAt.toISOString(),
        trend:            result.trend,
      },
    };
  }

  /**
   * POST /v1/_test/meta-market/detect-cohort
   *
   * C6 anti-cheat probe: calls `MetaMarketAntiCheatService.detectCoordinatedCohort()` directly.
   *
   * No body required.
   *
   * Returns: { flagsWritten: number }
   *
   * Falsifiable detection proof:
   *   - Seed N contributions with DISTINCT contributor_hash values (N >= threshold 100) for the same
   *     (region_id, substance) in the last 24h → detect-cohort → flagsWritten=1.
   *   - Seed N < threshold → flagsWritten=0 (no flag).
   */
  @Post('_test/meta-market/detect-cohort')
  @HttpCode(200)
  async detectCohort(): Promise<{ flagsWritten: number }> {
    const flagsWritten = await this.antiCheatService.detectCoordinatedCohort();
    return { flagsWritten };
  }

  /**
   * GET /v1/_test/meta-market/list-cohort-flags
   *
   * C6 flags listing probe: queries `meta_market_cohort_flags` with optional filters.
   *
   * Query params: regionId? substance?
   *
   * Returns: { flags: Array<{ flagId, regionId, substance, districtProfile, flaggedPattern, cohortSize, detectedAt }> }
   *
   * Used by C6-4 E2E test to assert exactly 1 flag with cohortSize >= threshold after detect-cohort.
   */
  @Get('_test/meta-market/list-cohort-flags')
  async listCohortFlags(
    @Query('regionId') regionId?: string,
    @Query('substance') substance?: string,
  ): Promise<{ flags: Array<Record<string, unknown>> }> {
    const conditions: ReturnType<typeof eq>[] = [];
    if (regionId) {
      conditions.push(eq(metaMarketCohortFlags.region_id, regionId));
    }
    if (substance) {
      conditions.push(eq(metaMarketCohortFlags.substance, substance as (typeof metaMarketCohortFlags.substance.enumValues)[number]));
    }

    const rows = conditions.length > 0
      ? await this.db.select().from(metaMarketCohortFlags).where(and(...conditions))
      : await this.db.select().from(metaMarketCohortFlags);

    const flags = rows.map((r) => ({
      flagId:          r.flag_id,
      regionId:        r.region_id,
      substance:       r.substance,
      districtProfile: r.district_profile,
      flaggedPattern:  r.flagged_pattern,
      cohortSize:      r.cohort_size,
      detectedAt:      r.detected_at.toISOString(),
    }));

    return { flags };
  }

  /**
   * POST /v1/_test/meta-market/clear-contributions
   *
   * C6 test isolation: DELETE all rows from `meta_market_contributions`.
   * Used to ensure a clean state before C6-4 (detectCoordinatedCohort) and C6-5 (dedup proof) tests.
   *
   * Returns: { deleted: number }
   */
  @Post('_test/meta-market/clear-contributions')
  @HttpCode(200)
  async clearContributions(): Promise<{ deleted: number }> {
    const result = await this.db.execute<{ count: string }>(
      sql`DELETE FROM meta_market_contributions RETURNING 1`,
    );
    const rows = (result.rows ?? result) as unknown[];
    return { deleted: rows.length };
  }

  /**
   * POST /v1/_test/meta-market/clear-cohort-flags
   *
   * C6 test isolation: DELETE all rows from `meta_market_cohort_flags`.
   * Used to ensure a clean state before C6-4 (detectCoordinatedCohort) tests.
   *
   * Returns: { deleted: number }
   */
  @Post('_test/meta-market/clear-cohort-flags')
  @HttpCode(200)
  async clearCohortFlags(): Promise<{ deleted: number }> {
    const result = await this.db.execute<{ count: string }>(
      sql`DELETE FROM meta_market_cohort_flags RETURNING 1`,
    );
    const rows = (result.rows ?? result) as unknown[];
    return { deleted: rows.length };
  }

  // ── C8 ──────────────────────────────────────────────────────────────────────────────────────

  /**
   * POST /v1/_test/meta-market/set-visibility
   *
   * C8 test isolation: sets `player.meta_market_visibility_enabled` for a player.
   *
   * Body: { playerId: string, enabled: boolean | null }
   *   enabled=null  → NULL (use tunable default, effective ON)
   *   enabled=true  → explicitly opted in
   *   enabled=false → explicitly opted out (triggers privacy wall in getSignalWithVisibility)
   *
   * Returns: { playerId: string, visibilityEnabled: boolean | null }
   *
   * Falsifiable proof: set enabled=false → get-signal-with-visibility → 'insufficient_signal'
   * even when there is an aggregated signal above the sample_floor.
   */
  @Post('_test/meta-market/set-visibility')
  @HttpCode(200)
  async setVisibility(
    @Body() body: { playerId: string; enabled: boolean | null },
  ): Promise<{ playerId: string; visibilityEnabled: boolean | null }> {
    const { playerId, enabled } = body ?? {};
    if (typeof playerId !== 'string' || !playerId) {
      throw new HttpException('playerId must be a non-empty string', HttpStatus.BAD_REQUEST);
    }
    if (enabled !== null && typeof enabled !== 'boolean') {
      throw new HttpException('enabled must be boolean or null', HttpStatus.BAD_REQUEST);
    }

    // UPDATE player.meta_market_visibility_enabled for this player.
    await this.db
      .update(player)
      .set({ meta_market_visibility_enabled: enabled })
      .where(eq(player.player_id, playerId));

    return { playerId, visibilityEnabled: enabled };
  }

  /**
   * GET /v1/_test/meta-market/get-signal-with-visibility
   *
   * C8 probe: calls MetaMarketReadService.getSignalWithVisibility(playerId, regionId, substance, districtProfile).
   *
   * Query: playerId regionId substance districtProfile
   *
   * Returns: { result: MetaMarketSignalView | 'insufficient_signal' }
   *
   * Falsifiable determinism proof:
   *   - set-visibility(enabled=false) → this route → 'insufficient_signal' (privacy wall, toggled OFF).
   *   - set-visibility(enabled=true or null) + seeded signal above sample_floor → returns the signal.
   */
  @Get('_test/meta-market/get-signal-with-visibility')
  async getSignalWithVisibility(
    @Query('playerId') playerId: string,
    @Query('regionId') regionId: string,
    @Query('substance') substance: string,
    @Query('districtProfile') districtProfile: string,
  ): Promise<{ result: unknown }> {
    if (!playerId || !regionId || !substance || !districtProfile) {
      throw new HttpException(
        'playerId, regionId, substance, districtProfile query params are required',
        HttpStatus.BAD_REQUEST,
      );
    }
    const raw = await this.readService.getSignalWithVisibility(playerId, regionId, substance, districtProfile);
    if (raw === 'insufficient_signal') {
      return { result: 'insufficient_signal' };
    }
    return {
      result: {
        medianCents:      String(raw.medianCents),
        p10Cents:         String(raw.p10Cents),
        p90Cents:         String(raw.p90Cents),
        sampleCount:      raw.sampleCount,
        lastAggregatedAt: raw.lastAggregatedAt.toISOString(),
        trend:            raw.trend,
      },
    };
  }
}
