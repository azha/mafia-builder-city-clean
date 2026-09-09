// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-A-rival-foundation-plan.md Task 4 (C4)
//             Design: docs/superpowers/specs/2026-06-24-04b-A-rival-foundation-design.md §3.2
//             Canon: docs/tech/04b_combat_and_conflict/rival_ai_mechanics.md :120-150
//             — Rival AI Foundation C4 — 2026-06-24 —
//
// `TempoExposureService` — §3.2 per-rival observe/orient/commit tempo + cohesion couple.
//
// Mechanics (canonical):
//   getOrientLatencyWindow: returns the effective orient_latency_ticks for a rival.
//     Normally = rival_state.orient_latency_ticks (read from DB row).
//     Cohesion couple: if district_cohesion for the rival's home district drops below
//     cohesionTempoPenaltyThreshold (composite:STANDARD, ref 0.40), orient_latency is
//     LENGTHENED by +1 tick (the penalty for district unrest).
//     READ-only on district_cohesion — NEVER writes to that table.
//
//   shouldFireObserveTick: returns true if gameMinute % observe_interval_ticks === 0.
//   shouldFireCommitTick:  returns true if gameMinute % commit_delay_ticks === 0
//                          (only meaningful if commit_delay_ticks > 0).
//
// Per-rival home district map (canon-silent, no dedicated tunable):
//   coil → district 1, tarcum → district 2, iron_throat → district 3, saltline → district 4
//   Static deterministic assignment (no RNG, no DB lookup, no FK).
//
// C4 (determinism): NO Math.random(), NO Date.now(). game-time via gameMinute param.
// Composite threshold resolution pattern (mirrors regime-switching.service.ts comment :22):
//   cohesionTempoPenaltyThresholdBucket = 'composite:STANDARD' → standard ref 0.40.
//   The service resolves this via COHESION_TEMPO_PENALTY_THRESHOLD_STANDARD_REF (named constant).
//   Anti-fabrication: the constant is named AFTER the composite/standard pattern — no bare float.
// R2.2/P5: district_cohesion is server-only. Cohesion values are NEVER exposed to client via this service.

import { Injectable, Inject, Logger } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import type { DrizzleClient } from '../../../db';
import { DB } from '../../../db/db.module';
import { districtCohesion } from '../../../db/schema/city_state';
import { RivalAiTunables } from './rival-ai.tunables';
import { RivalStateRepository } from './rival-state.repository';
import type { RivalKey } from './rival-ai.types';

// ── Composite threshold resolution ─────────────────────────────────────────────────────────────
// cohesionTempoPenaltyThresholdBucket = 'composite:STANDARD' → the STANDARD reference is 0.40.
// Named constant — no bare inline float (anti-fabrication; mirrors the DD-BLOCK-RHO pattern).
// If the composite tier value changes (hotfix), update this constant + gdd/14 in the SAME commit (R9.3).
const COHESION_TEMPO_PENALTY_THRESHOLD_STANDARD_REF = 0.40;

// ── Per-rival home district (canon-silent static map) ──────────────────────────────────────────
// No FK, no DB lookup, no RNG. District IDs are 1-based integers (districts.id = 1..18 world_geography).
const RIVAL_HOME_DISTRICT: Record<RivalKey, number> = {
  coil:        1,
  tarcum:      2,
  iron_throat: 3,
  saltline:    4,
};

@Injectable()
export class TempoExposureService {
  private readonly logger = new Logger(TempoExposureService.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly rivalStateRepo: RivalStateRepository,
    private readonly tunables: RivalAiTunables,
  ) {}

  /**
   * `getOrientLatencyWindow` — the §3.2 orient-window probe.
   *
   * Returns the EFFECTIVE orient_latency_ticks for the rival:
   *   base = rival_state.orient_latency_ticks (from DB)
   *   cohesion couple: if district_cohesion < COHESION_TEMPO_PENALTY_THRESHOLD → base + 1
   *
   * The threshold is sourced from the getter (cohesionTempoPenaltyThresholdBucket) which returns
   * 'composite:STANDARD'. The actual float STANDARD_REF (0.40) is resolved via the named constant.
   * Anti-fabrication: the getter is called (validates no registry override) even if the composite
   * string itself is not a float — the STANDARD_REF constant IS the authoritative numeric value.
   *
   * READ-ONLY on district_cohesion — NEVER writes.
   * Returns null if no rival row exists for this player × rival.
   * NO Math.random. NO Date.now.
   */
  async getOrientLatencyWindow(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<number | null> {
    const row = await this.rivalStateRepo.readRivalState(playerId, rivalKey);
    if (!row) return null;

    const baseOrientLatency = row.orient_latency_ticks;

    // Resolve the cohesion penalty threshold (composite → STANDARD_REF float).
    // The getter validates no registry override changed the composite tier name.
    const bucketStr = this.tunables.cohesionTempoPenaltyThresholdBucket; // 'composite:STANDARD'
    const cohesionThreshold = this.resolveCohesionTempoPenaltyThreshold(bucketStr);

    // Read cohesion for this rival's home district (READ-ONLY, no write).
    const homeDistrictId = RIVAL_HOME_DISTRICT[rivalKey];
    const cohesionValue  = await this.readDistrictCohesion(playerId, homeDistrictId);

    // Apply the couple: cohesion < threshold → lengthen by +1.
    if (cohesionValue !== null && cohesionValue < cohesionThreshold) {
      return baseOrientLatency + 1;
    }
    return baseOrientLatency;
  }

  /**
   * `shouldFireObserveTick` — returns true if this game-minute is an observe boundary.
   *
   * observe_interval_ticks is read from the rival_state row (seeded at baseline).
   * The modulo: gameMinute % observe_interval_ticks === 0.
   * guard: if observe_interval_ticks === 0, returns false (division-by-zero guard).
   * NO RNG. NO Date.now.
   */
  async shouldFireObserveTick(
    playerId: string,
    rivalKey: RivalKey,
    gameMinute: number,
  ): Promise<boolean> {
    const row = await this.rivalStateRepo.readRivalState(playerId, rivalKey);
    if (!row) return false;
    const interval = row.observe_interval_ticks;
    if (interval <= 0) return false;
    return gameMinute % interval === 0;
  }

  /**
   * `shouldFireCommitTick` — returns true if this game-minute is a commit boundary.
   *
   * commit_delay_ticks is read from the rival_state row (seeded at baseline).
   * The modulo: gameMinute % commit_delay_ticks === 0.
   * guard: if commit_delay_ticks === 0, returns false.
   * NO RNG. NO Date.now.
   */
  async shouldFireCommitTick(
    playerId: string,
    rivalKey: RivalKey,
    gameMinute: number,
  ): Promise<boolean> {
    const row = await this.rivalStateRepo.readRivalState(playerId, rivalKey);
    if (!row) return false;
    const delay = row.commit_delay_ticks;
    if (delay <= 0) return false;
    return gameMinute % delay === 0;
  }

  // ─── private helpers ──────────────────────────────────────────────────────────

  /**
   * Resolve the cohesion tempo penalty threshold from the composite bucket string.
   * 'composite:STANDARD' → COHESION_TEMPO_PENALTY_THRESHOLD_STANDARD_REF (0.40).
   * If an unexpected tier arrives (future extension), falls back to the STANDARD_REF.
   * Anti-fabrication: the float is NEVER inlined in the caller — always resolved here.
   */
  private resolveCohesionTempoPenaltyThreshold(bucketStr: string): number {
    // The only tier defined at A is STANDARD (ref 0.40). Future HIGH/LOW tiers may land in B/C.
    if (bucketStr === 'composite:STANDARD') {
      return COHESION_TEMPO_PENALTY_THRESHOLD_STANDARD_REF;
    }
    // Fallback: unknown tier → use STANDARD_REF (safe default, logs a warning).
    this.logger.warn(
      `TempoExposure: unknown cohesion tempo penalty bucket '${bucketStr}' → falling back to STANDARD_REF`,
    );
    return COHESION_TEMPO_PENALTY_THRESHOLD_STANDARD_REF;
  }

  /**
   * Read the cohesion float for (playerId, districtId) from district_cohesion.
   * READ-ONLY — NEVER writes to district_cohesion.
   * Returns null if no row exists (e.g., the player has no cohesion data seeded yet).
   * The cohesion column is a float default 0.7 (city_state.ts:30).
   */
  private async readDistrictCohesion(
    playerId: string,
    districtId: number,
  ): Promise<number | null> {
    const rows = await this.db
      .select({ cohesion: districtCohesion.cohesion })
      .from(districtCohesion)
      .where(
        and(
          eq(districtCohesion.player_id, playerId),
          eq(districtCohesion.district_id, districtId),
        ),
      )
      .limit(1);
    if (rows.length === 0) return null;
    return rows[0]!.cohesion;
  }
}
