// IMPLEMENTS: docs/superpowers/plans/2026-07-03-04d-C-meta-market-plan.md C4 (MetaMarketHashService)
//             Canon: docs/tech/04d_meta_market_lawyer_and_internal_affairs/async_meta_market.md :72-73
//             Decision #2 (RATIFIÉ): player_id HMAC-SHA256 hashed before any write — NEVER persisted raw.
//             Decision #2 HMAC: per-region rotating secret (hmac_secret_rotation_days tunable C3).
//             REUSE: node:crypto (createHmac) — available (market-rng.service.ts / forbidden-triad.service.ts).
//             R2.2/Privacy wall (C7): contributor_hash is the ONLY player identifier stored in DB.
//             R2.3: hmac_secret_rotation_days sourced via metaMarketTunables (never inlined).
//             — 04d-C C4 — 2026-07-03
//
// `MetaMarketHashService` — HMAC-SHA256 hasher for player_id anonymization.
//
// The raw player_id is NEVER persisted in meta_market_contributions or meta_market_signals.
// Only `contributor_hash` (the HMAC output) is stored.
//
// Key derivation:
//   hmacKey = baseSecret + '|' + regionId + '|' + rotationEpoch
//   where:
//     baseSecret = process.env.META_MARKET_HMAC_SECRET  (server secret, see below)
//     regionId   = the player's geo-region (e.g. 'eu-west', 'unknown')
//     rotationEpoch = floor(realDaysSinceUnixEpoch / hmacSecretRotationDays)
//       — deterministic: same day-window → same epoch → same rotation slot.
//
// Secret provisioning (env var META_MARKET_HMAC_SECRET):
//   Production: set as a Docker secret or env var in the deployment (ch22).
//   NOT committed. NOT logged. Never persisted beyond the process environment.
//   Dev fallback (META_MARKET_HMAC_SECRET absent): 'dev-hmac-secret-do-not-use-in-prod'.
//   This fallback is dev-only; production deployments MUST set META_MARKET_HMAC_SECRET.
//
// Tunable: `meta_market.hmac_secret_rotation_days` (C3, default 30, range 7..90).
//   The rotation window is a real-world cadence (not game-time): after `rotation_days` real days,
//   the epoch increments → the key changes → historical contributor_hashes cannot be linked.
//   This is DETERMINISTIC: same player_id + same region + same epoch → same hash.
//   Rotation is per-region (different region_ids produce different keys → inter-region isolation).
//
// Determinism invariant (no Math.random, no non-deterministic state):
//   hashPlayerId(p, r) is a pure function of (p, r, rotationEpoch, baseSecret).
//   Within the same rotation window, the same player → the same hash.
//   Different players → different hashes (HMAC-SHA256 is collision-resistant for distinct inputs).
//
// Output: 64-char lowercase hex string (HMAC-SHA256 = 32 bytes = 64 hex chars).

import { createHmac } from 'node:crypto';
import { Injectable } from '@nestjs/common';

import { metaMarketTunables } from './meta-market.tunables';

/** Env key for the base HMAC secret (never inlined, never persisted, never logged). */
const HMAC_SECRET_ENV_KEY = 'META_MARKET_HMAC_SECRET';

/**
 * Dev-only fallback when `META_MARKET_HMAC_SECRET` is absent.
 *
 * ⚠️ This constant is intentionally NOT a secure secret — it is a dev/test placeholder.
 * Production deployments MUST set `META_MARKET_HMAC_SECRET` in the environment.
 * The server logs a warning at startup if this fallback is in use (see module init).
 */
const HMAC_SECRET_DEV_FALLBACK = 'dev-hmac-secret-do-not-use-in-prod';

@Injectable()
export class MetaMarketHashService {
  /**
   * Hash a player_id using HMAC-SHA256 with a per-region, rotating-epoch key.
   *
   * This is the ONLY permitted path to produce a `contributor_hash` for storage.
   * The raw `player_id` MUST NOT be stored or logged (privacy wall, decision #2, C7).
   *
   * Key derivation:
   *   hmacKey  = `${baseSecret}|${regionId}|${rotationEpoch}`
   *   baseSecret = env.META_MARKET_HMAC_SECRET (never inlined)
   *   rotationEpoch = floor(Date.now() / (rotationDays × 86400000))
   *
   * Properties:
   *   - Deterministic: same (playerId, regionId, epoch) → same hash.
   *   - Injective in practice: distinct playerIds → distinct hashes (HMAC-SHA256 is collision-resistant).
   *   - Per-region: hashes for the same player in different regions differ (different keys).
   *   - Rotating: after `rotationDays`, the epoch increments → new key → hashes cannot be linked across windows.
   *
   * @param playerId  — the raw player UUID. NEVER stored after this call.
   * @param regionId  — the player's geo-region (e.g. 'eu-west', 'unknown'). Part of the key.
   * @returns 64-char lowercase hex string (HMAC-SHA256 output).
   */
  hashPlayerId(playerId: string, regionId: string): string {
    const baseSecret = process.env[HMAC_SECRET_ENV_KEY] ?? HMAC_SECRET_DEV_FALLBACK;
    const rotationDays = Math.max(1, metaMarketTunables.hmacSecretRotationDays);
    // rotationEpoch: integer window index (pure function of wall-clock day + rotation_days).
    // Same day-window → same epoch → same HMAC key → same hash for the same player.
    // After rotationDays real days, epoch increments → new key → different hash (key rotation).
    const rotationEpoch = Math.floor(Date.now() / (rotationDays * 24 * 3600 * 1000));
    const hmacKey = `${baseSecret}|${regionId}|${rotationEpoch}`;
    return createHmac('sha256', hmacKey).update(playerId).digest('hex');
  }
}
