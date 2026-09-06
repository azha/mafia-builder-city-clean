// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-A-rival-foundation-plan.md Task 1 (C1) Step 3
//             Design: docs/superpowers/specs/2026-06-24-04b-A-rival-foundation-design.md §Repository
//             — Rival AI Foundation C1 — 2026-06-24 —
//
// `RivalStateRepository` — the persistence layer for rival_state rows.
//
// Methods (C1):
//   ensurePlayerRivals(playerId)         — delegates to RivalSeedService.ensurePlayerRivals (DD-RIVAL-SEED).
//   readRivalState(playerId, rivalKey)   — SELECT single rival_state row (or null if absent).
//   updateRegime(...)                    — UPDATE regime + regime_pressure (C3 regime tick).
//   updateSaturation(...)               — UPDATE saturation_pressure (C4 saturation tick).
//   updateIntelMode(...)                — UPDATE intel_mode + mode_stability_ticks (C4 intel tick).
//   updateRouteIntegrity(...)           — UPDATE route_integrity (C5 Coil Distributed Hold).
//
// R2.2 / P6: all rival_state scalar fields are server-only. This repository is consumed by
//   server-side mechanics services only — never by a player-facing projection route directly.
// OQ-A8: dominance_rank + vulnerable_axis are written by lot B (not updated here).
// Anti-fabrication: no Math.random(). Purely deterministic updates.
// Zero-regression: ADDITIVE only — no existing tables touched.

import { Injectable, Inject } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import type { DrizzleClient } from '../../../db';
import { DB } from '../../../db/db.module';
import { rivalState } from '../../../db/schema/conflict_rival';
import type { RivalKey, RivalRegime, IntelMode, RivalStateRow } from './rival-ai.types';
import { RivalSeedService } from './rival-seed.service';

@Injectable()
export class RivalStateRepository {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly seedService: RivalSeedService,
  ) {}

  /**
   * DD-RIVAL-SEED: UPSERT all 4 rivals for the player.
   * Delegates to RivalSeedService (idempotent — DO NOTHING on conflict).
   */
  async ensurePlayerRivals(playerId: string): Promise<void> {
    return this.seedService.ensurePlayerRivals(playerId);
  }

  /**
   * SELECT a single rival_state row. Returns null if the player has no row for this rival.
   * (The test controller uses this to assert persistence after ensure.)
   */
  async readRivalState(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<RivalStateRow | null> {
    const rows = await this.db
      .select()
      .from(rivalState)
      .where(
        and(
          eq(rivalState.player_id, playerId),
          eq(rivalState.rival_key, rivalKey),
        ),
      )
      .limit(1);
    if (rows.length === 0) return null;
    const row = rows[0]!;
    return {
      player_id:              row.player_id,
      rival_key:              row.rival_key as RivalKey,
      regime:                 row.regime as RivalRegime,
      regime_pressure:        row.regime_pressure,
      flip_threshold:         row.flip_threshold,
      observe_interval_ticks: row.observe_interval_ticks,
      orient_latency_ticks:   row.orient_latency_ticks,
      commit_delay_ticks:     row.commit_delay_ticks,
      saturation_pressure:    row.saturation_pressure,
      intel_mode:             row.intel_mode as IntelMode,
      mode_stability_ticks:   row.mode_stability_ticks,
      route_integrity:        row.route_integrity ?? null,
      dominance_rank:         row.dominance_rank ?? null,
      vulnerable_axis:        (row.vulnerable_axis ?? null) as RivalStateRow['vulnerable_axis'],
    };
  }

  /**
   * UPDATE regime + regime_pressure after a regime tick (C3).
   * gameMinute is accepted for future audit/logging but not persisted here (no audit column at C1).
   */
  async updateRegime(
    playerId: string,
    rivalKey: RivalKey,
    regime: RivalRegime,
    regimePressure: number,
    _gameMinute: number,
  ): Promise<void> {
    await this.db
      .update(rivalState)
      .set({ regime, regime_pressure: regimePressure })
      .where(
        and(
          eq(rivalState.player_id, playerId),
          eq(rivalState.rival_key, rivalKey),
        ),
      );
  }

  /**
   * UPDATE saturation_pressure (C4 saturation tick).
   */
  async updateSaturation(
    playerId: string,
    rivalKey: RivalKey,
    saturationPressure: number,
  ): Promise<void> {
    await this.db
      .update(rivalState)
      .set({ saturation_pressure: saturationPressure })
      .where(
        and(
          eq(rivalState.player_id, playerId),
          eq(rivalState.rival_key, rivalKey),
        ),
      );
  }

  /**
   * UPDATE intel_mode + mode_stability_ticks (C4 intel mode tick).
   */
  async updateIntelMode(
    playerId: string,
    rivalKey: RivalKey,
    intelModeVal: IntelMode,
    modeStabilityTicks: number,
  ): Promise<void> {
    await this.db
      .update(rivalState)
      .set({ intel_mode: intelModeVal, mode_stability_ticks: modeStabilityTicks })
      .where(
        and(
          eq(rivalState.player_id, playerId),
          eq(rivalState.rival_key, rivalKey),
        ),
      );
  }

  /**
   * UPDATE route_integrity (C5 Coil Distributed Hold).
   * Accepts null to reset the integrity metric (e.g., after full route disruption).
   */
  async updateRouteIntegrity(
    playerId: string,
    rivalKey: RivalKey,
    routeIntegrity: number | null,
  ): Promise<void> {
    await this.db
      .update(rivalState)
      .set({ route_integrity: routeIntegrity })
      .where(
        and(
          eq(rivalState.player_id, playerId),
          eq(rivalState.rival_key, rivalKey),
        ),
      );
  }
}
