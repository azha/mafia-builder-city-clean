// IMPLEMENTS: docs/superpowers/plans/2026-07-03-04d-C-meta-market-plan.md C1 (MaxMindGeoIpService)
//             Decision #1: IP-geolocation in-process (MaxMind GeoLite2-Country .mmdb, zero external runtime call)
//             Ch21/22 self-hosted posture: no external API call; .mmdb loaded once at boot into memory.
//             RGPD derive-then-discard (decision #1/#b, ch26): IP resolved → country, IP NEVER persisted.
//             Provisioning §2.1: prod = deploy-secret/GEOIP_MMDB_PATH; dev/test = committed fixture auto-selected.
//             — 04d-C C1 — 2026-07-03

import * as path from 'node:path';
import { existsSync } from 'node:fs';
import type { IncomingMessage } from 'node:http';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { open, type CountryResponse, type Reader } from 'maxmind';

/**
 * `MaxMindGeoIpService` — in-process GeoLite2-Country IP→country lookup (04d-C C1, decision #1).
 *
 * Loads a MaxMind GeoLite2-Country `.mmdb` database at module bootstrap once into memory.
 * All subsequent lookups are CPU-only (no network, no disk I/O after init) — self-hosted posture
 * (ch21/22). Zero external call at runtime.
 *
 * RGPD derive-then-discard (decision #1/#b, ch26):
 *   The raw IP address is transient. `lookupCountry()` receives an IP, resolves it to an ISO
 *   country code, and returns the code only. The IP is NEVER written to any DB column, contribution
 *   row, or application log. The caller persists ONLY the derived `region_id` (C1b:
 *   `RegionService.assignRegionFromIp`). No IP field exists anywhere in the data model (grep-zero).
 *
 * Provisioning (decision #d — §2.1 plan):
 *   PROD: the `.mmdb` is downloaded at build/deploy via a MaxMind license key mounted as a Docker
 *     secret (ch22 Docker secrets posture). Set `GEOIP_MMDB_PATH` to the mounted file path, e.g.:
 *       GEOIP_MMDB_PATH=/run/secrets/geolite2_country_mmdb
 *     or mount a Docker volume at `/app/assets/geoip/GeoLite2-Country.mmdb`.
 *     The production `.mmdb` is NOT committed (.gitignored — size + MaxMind per-licensee policy).
 *   TEST/DEV: committed fixture `assets/geoip/GeoLite2-Country-TEST.mmdb` is auto-selected when
 *     `NODE_ENV !== 'production'` and `GEOIP_MMDB_PATH` is unset. The fixture contains a small
 *     subset of IPs with known country codes (sourced from MaxMind-DB public test data).
 *
 * Fallback: if the `.mmdb` is absent (dev without license, CI without file) → the reader stays
 *   `null`, `lookupCountry()` returns `null` → caller maps to `unknown` region (C1b). The service
 *   NEVER throws or crashes boot; it logs a WARN and degrades gracefully.
 */
@Injectable()
export class MaxMindGeoIpService implements OnModuleInit {
  private readonly logger = new Logger(MaxMindGeoIpService.name);
  private reader: Reader<CountryResponse> | null = null;

  async onModuleInit(): Promise<void> {
    const mmdbPath = this.resolveMmdbPath();
    if (!existsSync(mmdbPath)) {
      this.logger.warn(
        `GEOIP: .mmdb not found at "${mmdbPath}" — lookupCountry() returns null ` +
          `(fallback 'unknown' region active). ` +
          `PROD: set GEOIP_MMDB_PATH to the mounted GeoLite2-Country.mmdb path (Docker secret/volume, ch22). ` +
          `TEST/DEV: committed fixture assets/geoip/GeoLite2-Country-TEST.mmdb is auto-selected in non-production.`,
      );
      return;
    }
    this.reader = await open<CountryResponse>(mmdbPath);
    this.logger.log(`GEOIP: MaxMind GeoLite2-Country reader loaded from "${mmdbPath}"`);
  }

  /**
   * Resolve the `.mmdb` file path (priority order):
   *   1. `GEOIP_MMDB_PATH` env var — explicit override for prod deploys (Docker secret/volume path).
   *   2. Non-production only: `assets/geoip/GeoLite2-Country-TEST.mmdb` (committed test fixture).
   *   3. Default: `assets/geoip/GeoLite2-Country.mmdb` (production path — not committed, deploy-provisioned).
   *
   * `process.cwd()` = `/app` in the container (Dockerfile WORKDIR). `assets/` is COPY-d into the
   * runtime image (Dockerfile: `COPY assets ./assets` — 04d-C C1 addition).
   */
  private resolveMmdbPath(): string {
    const overridePath = process.env['GEOIP_MMDB_PATH'];
    if (overridePath) return overridePath;

    const assetsGeoip = path.resolve(process.cwd(), 'assets', 'geoip');

    if (process.env.NODE_ENV !== 'production') {
      const testFixturePath = path.join(assetsGeoip, 'GeoLite2-Country-TEST.mmdb');
      if (existsSync(testFixturePath)) return testFixturePath;
    }

    // Default production path — provisioned at deploy, NOT committed.
    return path.join(assetsGeoip, 'GeoLite2-Country.mmdb');
  }

  /**
   * Resolve an IP address to an ISO 3166-1 alpha-2 country code (e.g. `'FR'`, `'US'`, `'SE'`).
   *
   * Returns `null` when:
   *   - the `.mmdb` reader is unavailable (fallback → `unknown` region, C1b), OR
   *   - the IP is not in the database (private ranges 10.x/192.168.x/127.x, loopback, unallocated).
   *
   * RGPD: the IP is consumed here and NEVER persisted. Only the returned country code propagates.
   * The caller (`RegionService`, C1b) derives `region_id` from this code and updates `player.region_id`.
   * No IP field is written anywhere in the data model (RGPD derive-then-discard, ch26).
   *
   * @param ip IPv4 or IPv6 address string — extracted by the caller or by `extractIpFromRequest`.
   */
  lookupCountry(ip: string): string | null {
    if (!this.reader) return null;
    const result = this.reader.get(ip);
    // `country` = the responding country (preferred), `registered_country` = network registrant (fallback).
    // Private/loopback/unallocated IPs produce `null` from reader.get().
    return result?.country?.iso_code ?? result?.registered_country?.iso_code ?? null;
  }

  /**
   * Extract the client IP from an HTTP request (Traefik / X-Forwarded-For posture, ch22).
   *
   * Traefik sets `X-Forwarded-For` with the real client IP as the LEFTMOST entry (leftmost-trusted
   * model). This method takes the first comma-separated IP and trims whitespace.
   * Falls back to `req.socket.remoteAddress` (TCP connection IP) when `X-Forwarded-For` is absent.
   *
   * Returns `null` only if no IP can be determined (socketless edge case, does not occur in practice).
   *
   * RGPD: the returned IP is transient — the caller MUST pass it to `lookupCountry()` and discard
   * it immediately. It MUST NOT be stored in any DB column, log entry, or contribution row.
   *
   * @param req Node.js `IncomingMessage` (NestJS/Express request, or any object with `headers` + `socket`).
   */
  extractIpFromRequest(req: Pick<IncomingMessage, 'headers' | 'socket'>): string | null {
    const xff = req.headers['x-forwarded-for'];
    if (xff) {
      // X-Forwarded-For may be a string ("ip1, ip2") or an array (["ip1", "ip2"]).
      const raw = Array.isArray(xff) ? xff[0] : xff;
      const leftmost = raw.split(',')[0]?.trim();
      if (leftmost) return leftmost;
    }
    // Fallback: TCP connection address (direct connections without Traefik, e.g. dev/test).
    return req.socket?.remoteAddress ?? null;
  }
}
