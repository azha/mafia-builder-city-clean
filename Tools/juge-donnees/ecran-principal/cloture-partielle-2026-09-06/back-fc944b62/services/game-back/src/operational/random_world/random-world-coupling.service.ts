// IMPLEMENTS: docs/superpowers/plans/2026-07-15-04g-B-random-world-plan.md C3
//             (random-world-coupling.service.ts — applyCouplingDiscovery, cap gate, exposure UNIQUE)
//             Design: docs/superpowers/specs/2026-07-15-04g-B-random-world-design.md §3.6 (Coupling —
//             cap + exposure + Exception card fan-out)
//             — 04g-B C3 — 2026-07-15
//
// `RandomWorldCouplingService` — the per-player cascade admission gate (design §3.6, "à la frappe
// (phase 4) : apply du secondary row + pour chaque joueur avec ≥ 1 building en X ou Y : gate cap ... si
// non plein ET paire pas déjà exposée pour ce joueur (UNIQUE) : INSERT row cascade + Exception card").
//
// Called by `RandomWorldEventGeneratorService`'s phase 4 (the secondary-fire step) with the pair that
// JUST struck + its source/target districts — fans out to every candidate player (building in X OR Y)
// and, per player, applies exactly ONE of three outcomes:
//   1. ALREADY EXPOSED (UNIQUE(player_id, pair_key) already holds) — silent no-op. NOT counted as a
//      "gated attempt" (design §4.2: the exposure is permanent — re-striking the SAME pair for a player
//      who already knows it is not a rejected ATTEMPT, there is simply nothing new to discover; this is
//      also the AC9 crash-replay idempotence guard's SECOND layer, on top of the event payload's own
//      `secondaryApplied` guard).
//   2. CAP REACHED (`countCascadesForPlayerSince(playerId, gameDay − 30) >= cap`) — silently gated, but
//      COUNTED (`gatedCascadeAttempts`, design §3.6 "rejette silencieusement ... mais COMPTÉES",
//      E2E-RW-02). The daily_run's `gated_cascade_attempts` column persists the per-tick SUM.
//   3. ADMITTED — INSERT the cascade row, then emit `CouplingDiscoveryExposedEvent` (S14 producer
//      pattern — `RandomWorldExceptionProducerService` reacts with its OWN dedup,
//      `hasPendingPlayerLevelCard`).
//
// The 30-day window (`COUPLING_DISCOVERY_CASCADE_WINDOW_DAYS`) is a FIXED structural constant, NOT a
// registry tunable — it is baked into the REUSE tunable's own name
// (`random_world.coupling_discoveries_per_player_per_30days_cap`, "_per_30days_") the SAME way
// `off-hours-drift.repository.ts`'s `OFF_HOURS_DRIFT_MATURITY_MIN_SAMPLES` is a documented fixed
// characteristic rather than a separate registry key — no separate `..._window_days` tunable exists in
// gdd/14 §Ambient World Event Templates — Random world for this axis (only the COUNT is configurable).

import { Injectable } from '@nestjs/common';

import { CityEventBus } from '../../citysim/events/city-event-bus';
import { RandomWorldEventRepository } from './random-world-event.repository';
import { randomWorldTunables } from './random-world.tunables';
import type { TightCouplingPairKey } from './tight-coupling-pairs';

/** The FIXED rolling-window width the `..._per_30days_cap` REUSE tunable's own name bakes in (see file
 *  header — not a registry key). */
export const COUPLING_DISCOVERY_CASCADE_WINDOW_DAYS = 30;

export interface ApplyCouplingDiscoveryParams {
  readonly pairKey: TightCouplingPairKey;
  readonly sourceEventId: string;
  readonly sourceDistrictId: number;
  readonly cascadeTargetDistrictId: number;
  readonly gameDay: number;
}

export interface ApplyCouplingDiscoveryResult {
  /** Player ids that got a FRESH cascade row this call (each also got a `CouplingDiscoveryExposedEvent`). */
  readonly admittedPlayerIds: readonly string[];
  /** Count of candidate players GATED by the 30-day cap this call (design §3.6 — the E2E-RW-02 counter). */
  readonly gatedCount: number;
}

@Injectable()
export class RandomWorldCouplingService {
  constructor(
    private readonly repo: RandomWorldEventRepository,
    private readonly bus: CityEventBus,
  ) {}

  /**
   * Fan out to every player with ≥1 building in `sourceDistrictId` OR `cascadeTargetDistrictId` (design
   * §3.6) and apply the per-player admit/gate/already-exposed decision (see file header). Deterministic
   * player iteration order (the union, de-duplicated, in repository read order — no RNG anywhere in this
   * service, the cap/exposure decision is a pure function of persisted state).
   */
  async applyCouplingDiscovery(params: ApplyCouplingDiscoveryParams): Promise<ApplyCouplingDiscoveryResult> {
    const [playersX, playersY] = await Promise.all([
      this.repo.listPlayersWithBuildingInDistrict(params.sourceDistrictId),
      this.repo.listPlayersWithBuildingInDistrict(params.cascadeTargetDistrictId),
    ]);
    const candidateIds = Array.from(new Set([...playersX, ...playersY]));

    const cap = randomWorldTunables.couplingDiscoveriesPerPlayerPer30DaysCap;
    const sinceGameDayExclusive = params.gameDay - COUPLING_DISCOVERY_CASCADE_WINDOW_DAYS;

    const admittedPlayerIds: string[] = [];
    let gatedCount = 0;

    for (const playerId of candidateIds) {
      // Outcome 1 — ALREADY EXPOSED (UNIQUE(player_id, pair_key), design §4.2 "never forgotten"): silent
      // no-op, not a gated attempt (AC6/AC9).
      const alreadyExposed = await this.repo.hasCascadeForPlayerAndPair(playerId, params.pairKey);
      if (alreadyExposed) continue;

      // Outcome 2 — CAP REACHED: silently gated, COUNTED (E2E-RW-02).
      const recentCount = await this.repo.countCascadesForPlayerSince(playerId, sinceGameDayExclusive);
      if (recentCount >= cap) {
        gatedCount += 1;
        continue;
      }

      // Outcome 3 — ADMITTED: INSERT + emit (S14 producer reacts).
      const cascadeId = await this.repo.insertCascade({
        playerId,
        pairKey: params.pairKey,
        sourceEventId: params.sourceEventId,
        discoveredAtGameDay: params.gameDay,
      });
      admittedPlayerIds.push(playerId);
      this.bus.emitCouplingDiscoveryExposed({
        type: 'coupling_discovery_exposed',
        playerId,
        pairKey: params.pairKey,
        cascadeId,
        gameDay: params.gameDay,
      });
    }

    return { admittedPlayerIds, gatedCount };
  }
}
