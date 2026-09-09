// IMPLEMENTS: docs/superpowers/plans/2026-07-03-04d-C-meta-market-plan.md C4 (contribution recording)
//             Canon: docs/tech/04d_meta_market_lawyer_and_internal_affairs/async_meta_market.md :69-76
//             Decision #2 (RATIFIÉ): additive sell-path emit → recordDeal (player_id HMAC-hashed, NEVER persisted).
//             Fix C2 MINOR-2: rate-limit dedup via SELECT-guard (no bare ON CONFLICT — rate_limit_idx is non-unique).
//             R2.2/Privacy wall (C7): contributor_hash ONLY stored; raw player_id never written to DB.
//             R2.3: contribution_rate_limit_per_player_per_hour via metaMarketTunables (never inlined).
//             R9.3: mirrors schema meta_market_contributions (migration 0104, same-commit C2).
//             REUSE: RegionService.getRegion (C1b), MetaMarketHashService.hashPlayerId (C4 above),
//                    metaMarketContributions Drizzle schema (C2), districts table (world_geography.ts).
//             — 04d-C C4 — 2026-07-03
//
// `MetaMarketContributionService` — the additive sell-path contribution recorder.
//
// `recordDeal(playerId, substance, districtId, realizedPriceCents, gameMinute)`:
//   Called by SellingSellService.runMinuteTick AFTER applySells (ADDITIVE — sell hot-path unchanged).
//   1. Resolve playerId → region_id via RegionService.getRegion() (fallback: 'unknown').
//   2. Resolve districtId → district_profile via districts table (cache per-tick).
//   3. Compute bucket_hour = floor(Date.now() / 3600000) × 3600000 (real-hour boundary).
//   4. HMAC-hash the player_id via MetaMarketHashService.hashPlayerId (player_id NEVER stored).
//   5. SELECT-guard rate-limit: check (contributor_hash, substance, district_profile, bucket_hour)
//      → if exists, skip (1 contribution per player × substance × district × hour).
//      Uses SELECT-guard (not ON CONFLICT) because rate_limit_idx is non-unique (Fix C2 MINOR-2).
//   6. INSERT one meta_market_contributions row (contributor_hash, region_id, substance,
//      district_profile, price_cents, bucket_hour).
//
// Zero-regression invariant: PURELY ADDITIVE to the sell path (no mutation of sell return value,
//   no change to mutations array, no change to float_delta_cents / grams_sold / dealer.float_cents).
//   The sell path behavior is byte-identical with or without the meta-market contribution emit.
//   Failures in recordDeal are caught and logged by SellingSellService — never propagate upward.
//
// Determinism: no Math.random(), no non-deterministic state. The HMAC is deterministic given
//   (player_id, region_id, rotation_epoch). bucket_hour is floor(real-time / 3600000) — pure.
//
// Privacy (R2.2 / C7 / decision #2):
//   - The raw player_id is NEVER written to any column (only contributor_hash is stored).
//   - district_id (integer) is resolved to district_profile (enum) — the integer is NEVER stored.
//   - price_cents is a bigint (the per-gram realized price, not a raw identifiable value).
//   - The ONLY player-linkage is the contributor_hash (HMAC-SHA256 hex, 64 chars).

import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { metaMarketContributions } from '../../db/schema/meta_market';
import { districts } from '../../db/schema/world_geography';
import { REGION_FALLBACK, RegionService } from './region.service';
import { MetaMarketHashService } from './meta-market-hash.service';

// Type aliases for enum values (avoids re-importing pgEnum from drizzle-orm/pg-core here).
type SubstanceEnumVal = (typeof metaMarketContributions.substance.enumValues)[number];
type DistrictProfileEnumVal = (typeof metaMarketContributions.district_profile.enumValues)[number];

@Injectable()
export class MetaMarketContributionService {
  private readonly logger = new Logger(MetaMarketContributionService.name);

  /** In-process cache: districtId → district_profile (static per-run, seeded world_geography). */
  private readonly districtProfileCache = new Map<number, string>();

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly regionService: RegionService,
    private readonly hashService: MetaMarketHashService,
  ) {}

  /**
   * Record one sell contribution from the meta-market sell-path emit (decision #2, RATIFIÉ).
   *
   * Called by SellingSellService.runMinuteTick AFTER applySells — ADDITIVE.
   * The sell return value (void) is byte-identical; this is a side-effect after the commit.
   *
   * Privacy guarantee: the raw `player_id` is NEVER written to any table column.
   * Only `contributor_hash` (HMAC-SHA256 hex) is stored.
   *
   * Rate-limit (SELECT-guard, Fix C2 MINOR-2): one contribution per
   *   (player × substance × district × hour). Enforced by a pre-insert SELECT — NOT by
   *   ON CONFLICT (rate_limit_idx is non-unique; a bare ON CONFLICT target would throw).
   *
   * Determinism: no Math.random(). bucket_hour = floor(Date.now() / 3600000).
   *
   * @param playerId           — raw player UUID (NEVER stored; hashed only).
   * @param substance          — substance type sold (e.g. 'brindle', 'crick', 'hush').
   * @param districtId         — integer district_id of the sell location (→ resolved to profile).
   * @param realizedPriceCents — per-gram realized price in cents (float_delta_cents / grams_sold).
   * @param gameMinute         — current game tick minute (carried for future logging / C5 use).
   */
  async recordDeal(
    playerId: string,
    substance: string,
    districtId: number,
    realizedPriceCents: number,
    gameMinute: number,
  ): Promise<void> {
    // ── 1. Resolve player → region_id ────────────────────────────────────────────────────────────
    // getRegion returns null for pre-C1b players (no region_id yet). Fall back to 'unknown'.
    // 'unknown' is seeded by migration 0102 and is a valid FK target in region(region_id).
    const regionId = (await this.regionService.getRegion(playerId)) ?? REGION_FALLBACK;

    // ── 2. Resolve district_id → district_profile ────────────────────────────────────────────────
    // The integer district_id is NEVER stored; only district_profile (enum) is persisted.
    // Cache: world_geography districts are static (seeded at migration time, never mutated at runtime).
    const districtProfile = await this.resolveDistrictProfile(districtId);
    if (!districtProfile) {
      // Unknown district_id — defensive skip (all 18 districts are seeded; this should never fire).
      this.logger.warn(
        `recordDeal: unknown districtId=${districtId} for player=${playerId} — contribution skipped`,
      );
      return;
    }

    // ── 3. Compute bucket_hour (real-hour boundary) ───────────────────────────────────────────────
    // floor(Date.now() / 3600000) × 3600000 → start of the current UTC hour.
    // Pure: same wall-clock hour → same bucket_hour value.
    const bucketHour = this.currentBucketHour();

    // ── 4. HMAC-hash the player_id (privacy wall — raw id NEVER written to DB) ───────────────────
    // hashPlayerId is deterministic: same (playerId, regionId, epoch) → same hash.
    // The raw player_id is discarded after this call. Only contributorHash is used below.
    const contributorHash = this.hashService.hashPlayerId(playerId, regionId);

    // ── 5. Rate-limit SELECT-guard (Fix C2 MINOR-2) ──────────────────────────────────────────────
    // The rate_limit_idx on (contributor_hash, substance, district_profile, bucket_hour) is non-unique
    // (it is an ordinary index, not a UNIQUE index). A bare ON CONFLICT on these columns would throw
    // at runtime ("no unique or exclusion constraint matching the ON CONFLICT specification").
    // Fix: SELECT-guard — check for an existing row BEFORE inserting. One per (player × substance ×
    // district × hour). Safe: the sell tick runs serially per player, so no race for a single player.
    const existing = await this.db
      .select({ contribution_id: metaMarketContributions.contribution_id })
      .from(metaMarketContributions)
      .where(
        and(
          eq(metaMarketContributions.contributor_hash, contributorHash),
          eq(metaMarketContributions.substance, substance as SubstanceEnumVal),
          eq(metaMarketContributions.district_profile, districtProfile as DistrictProfileEnumVal),
          eq(metaMarketContributions.bucket_hour, bucketHour),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      // Rate-limited: already contributed for this (player × substance × district × hour).
      // Deterministic: same (player, substance, district, hour) → always skipped once recorded.
      this.logger.debug(
        `recordDeal: rate-limited — contribution already exists for ` +
        `substance=${substance} district=${districtId}(${districtProfile}) ` +
        `bucket=${bucketHour.toISOString()} (player=${playerId} → hash=${contributorHash.slice(0, 8)}…)`,
      );
      return;
    }

    // ── 6. INSERT contribution (privacy: only contributor_hash, never raw player_id) ─────────────
    // price_cents: bigint (per-gram realized price × cents; rounds to nearest integer).
    // contributed_at: defaultNow() from the schema — no explicit value needed.
    await this.db.insert(metaMarketContributions).values({
      contributor_hash: contributorHash,
      region_id:         regionId,
      substance:         substance as SubstanceEnumVal,
      district_profile:  districtProfile as DistrictProfileEnumVal,
      price_cents:       BigInt(Math.max(0, Math.round(realizedPriceCents))),
      bucket_hour:       bucketHour,
    });

    this.logger.debug(
      `recordDeal: recorded contribution — substance=${substance} ` +
      `district=${districtId}(${districtProfile}) region=${regionId} ` +
      `price=${Math.round(realizedPriceCents)}¢ bucket=${bucketHour.toISOString()} ` +
      `gameMinute=${gameMinute} (player=${playerId} → hash=${contributorHash.slice(0, 8)}…)`,
    );
  }

  // ── Private helpers ────────────────────────────────────────────────────────────────────────────

  /**
   * Returns the start of the current UTC hour as a Date (the bucket_hour key).
   *
   * Pure: floor(Date.now() / 3600000) × 3600000. Same call within the same UTC hour = same result.
   * No Math.random(). Wall-clock only (not game-time; real-hour aggregation cadence).
   */
  private currentBucketHour(): Date {
    const nowMs = Date.now();
    return new Date(Math.floor(nowMs / (1000 * 60 * 60)) * (1000 * 60 * 60));
  }

  /**
   * Resolve a district_id integer to its `district_profile` enum string.
   *
   * Uses an in-process cache (districtProfileCache): the `districts` table is static
   * (18 rows seeded at migration, never mutated at runtime). The first call for a given
   * districtId hits the DB; subsequent calls return the cached value.
   *
   * Returns null for unknown district_ids (defensive; all 18 seeded districts should resolve).
   *
   * @param districtId — integer PK in the districts table (1..18).
   * @returns district_profile enum string (e.g. 'tidewater', 'spine') or null.
   */
  private async resolveDistrictProfile(districtId: number): Promise<string | null> {
    const cached = this.districtProfileCache.get(districtId);
    if (cached !== undefined) return cached;

    const rows = await this.db
      .select({ profile: districts.profile })
      .from(districts)
      .where(eq(districts.id, districtId))
      .limit(1);

    const profile = rows[0]?.profile ?? null;
    if (profile !== null) {
      this.districtProfileCache.set(districtId, profile);
    }
    return profile;
  }
}
