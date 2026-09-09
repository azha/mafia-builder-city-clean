// IMPLEMENTS: docs/superpowers/plans/2026-07-03-04d-C-meta-market-plan.md C1b (RegionService)
//             Plan §2.2 — assignRegionFromIp + getRegion + lazy backfill
//             Decision #1: geo-IP→country→region_id (MaxMindGeoIpService, RGPD derive-then-discard, decision #b)
//             Decision #c: country granularity (region_country_map lookup, no subdivision)
//             R9.3: tables region + region_country_map + player.region_id → schema_region.md (same-commit)
//             RGPD: IP is transient; only region_id is persisted (ch26 conform-par-construction)
//             — 04d-C C1b — 2026-07-03
//
// `RegionService` — geo-IP derivation + player region assignment for MetaMarketModule (C1b).
//
// Methods:
//   `assignRegionFromIp(playerId, ip)` — resolves IP → country (MaxMindGeoIpService) → region_id
//     (region_country_map lookup) → UPDATE player.region_id. RGPD: IP is discarded after lookup.
//     Returns the resolved region_id (falls back to 'unknown' if no reader / no mapping).
//
//   `setRegion(playerId, regionId)` — direct assignment (test-only path; used by X-Test-Force-Region
//     route in MetaMarketTestController). Validates that regionId exists in the region table.
//
//   `getRegion(playerId)` — returns player.region_id or null (unassigned players return null;
//     callers treat null as 'unknown' pending the next assignment).
//
// Lazy backfill (plan §2.2): pre-C1b players have NULL region_id. On next login/action, the
// caller (RegionService via signup/login hook — C1b wire) assigns 'unknown' or re-geolocates.
// No migration-time backfill is performed (ADDITIVE null column — zero-regression invariant).
//
// Zero-regression: ADDITIVE — no existing service, tick, or event is modified here.
// The login/signup hook is left as a seam (MetaMarketTestController C1b routes exercise assignment
// directly; the production hook lands with the auth-integration seam in a follow-up if wired there).

import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { player } from '../../db/schema/player';
import { regionCountryMap } from '../../db/schema/region';
import { MaxMindGeoIpService } from './maxmind-geoip.service';

/**
 * The fallback region_id for players whose IP cannot be resolved (private ranges, loopback,
 * absent `.mmdb`, or country not in region_country_map). Seeded in migration 0102.
 *
 * [PROV-Y26Q2] — 'unknown' is a canon-analog fallback identity defined by this lot.
 */
export const REGION_FALLBACK = 'unknown';

@Injectable()
export class RegionService {
  private readonly logger = new Logger(RegionService.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly geoIp: MaxMindGeoIpService,
  ) {}

  /**
   * Derive the player's region from an IP address and persist it to `player.region_id`.
   *
   * Flow:
   *   1. `MaxMindGeoIpService.lookupCountry(ip)` → ISO country code or `null`.
   *   2. `null` → fallback `'unknown'` (no reader / private IP / unknown IP).
   *   3. country → `region_country_map` lookup → `region_id`.
   *   4. No mapping → fallback `'unknown'`.
   *   5. UPDATE `player.region_id = resolvedRegionId`.
   *
   * RGPD (decision #b, ch26): the IP is consumed in step 1 and NEVER written anywhere.
   * Only `region_id` is persisted. The caller MUST discard the IP after passing it here.
   *
   * Deterministic (per game-rules): same IP → same country → same region_id (given stable mmdb + map).
   * No `Math.random()`, no `Date.now()` in the derivation path.
   *
   * @param playerId — the target player's UUID (player_id).
   * @param ip — transient client IP (IPv4 or IPv6 string). RGPD: not persisted.
   * @returns the region_id assigned to the player ('unknown' on all fallback paths).
   */
  async assignRegionFromIp(playerId: string, ip: string): Promise<string> {
    // Step 1: IP → country (RGPD: ip is transient; lookupCountry returns code only).
    const country = this.geoIp.lookupCountry(ip);

    // Step 2 + 3 + 4: country → region_id via region_country_map (or fallback).
    const regionId = await this.resolveRegionId(country);

    // Step 5: persist only region_id (IP already discarded after step 1).
    await this.db
      .update(player)
      .set({ region_id: regionId })
      .where(eq(player.player_id, playerId));

    this.logger.debug(
      `assignRegionFromIp: player=${playerId} country=${country ?? 'null'} region=${regionId}`,
    );

    return regionId;
  }

  /**
   * Directly set a player's region_id (bypasses geo-IP lookup).
   *
   * Used by `MetaMarketTestController` when `X-Test-Force-Region` header is present —
   * the test directly controls the assigned region without going through geo-IP.
   * In production code, `assignRegionFromIp` is used instead.
   *
   * Does NOT validate that `regionId` exists in the `region` table — the FK constraint
   * on `player.region_id` at the Postgres level enforces validity.
   *
   * @param playerId — the target player's UUID.
   * @param regionId — the region_id to assign (must exist in the `region` table; FK enforced by PG).
   */
  async setRegion(playerId: string, regionId: string): Promise<void> {
    await this.db
      .update(player)
      .set({ region_id: regionId })
      .where(eq(player.player_id, playerId));

    this.logger.debug(`setRegion: player=${playerId} region=${regionId} (force-set)`);
  }

  /**
   * Look up a player's current `region_id`.
   *
   * Returns `null` for pre-C1b players (region_id is NULL until first assignment).
   * Callers SHOULD treat `null` as pending lazy backfill (assign 'unknown' or trigger
   * `assignRegionFromIp` on first action).
   *
   * @param playerId — the target player's UUID.
   * @returns region_id string or `null` (unassigned).
   */
  async getRegion(playerId: string): Promise<string | null> {
    const rows = await this.db
      .select({ region_id: player.region_id })
      .from(player)
      .where(eq(player.player_id, playerId))
      .limit(1);

    return rows[0]?.region_id ?? null;
  }

  // ── Private helpers ──────────────────────────────────────────────────────────────────────────────

  /**
   * Resolve a country code to a `region_id` via `region_country_map`.
   *
   * Returns `REGION_FALLBACK` ('unknown') when:
   *   - `country` is null (no reader / private IP)
   *   - the country code has no mapping in `region_country_map`
   *
   * @param country — ISO-3166-1-alpha-2 country code (e.g. 'SE', 'US') or null.
   * @returns region_id string (always a non-null value; fallback = 'unknown').
   */
  private async resolveRegionId(country: string | null): Promise<string> {
    if (!country) return REGION_FALLBACK;

    const rows = await this.db
      .select({ region_id: regionCountryMap.region_id })
      .from(regionCountryMap)
      .where(eq(regionCountryMap.country_code, country))
      .limit(1);

    return rows[0]?.region_id ?? REGION_FALLBACK;
  }
}
