// IMPLEMENTS: docs/superpowers/plans/2026-07-15-04g-B-random-world-plan.md C2 (player projection)
//             Design: docs/superpowers/specs/2026-07-15-04g-B-random-world-design.md §6.1 (Player
//             surface — P5 projection qualitative, R2.2)
//             P5 pattern seam: `operational/ambient/ambient.projection.service.ts` (04g-A C2's own
//             "raw struct → qualitative bands" template applied here — same grep-zero-raw-scalar posture,
//             same `district-${id}` echo idiom, C2 AC9 pattern precedent).
//             — 04g-B C2 — 2026-07-15
//
// `RandomWorldProjectionService` (canon gdd/15 — NEVER `WorldProjection`) — the player-facing
// projection layer (design §6.1). Maps RAW `random_world_event_active` rows → QUALITATIVE payloads:
// closed-domain band strings + an i18n key only, NEVER a raw scalar (R2.2 — no `contamination`, no
// `recovery_curve_position`, no magnitude float — grep-zero at the floor, mirrors 04g-A C2 AC8's own
// pattern).
//
// BAND DERIVATION (design leaves the exact cut-points to "bandes serveur" — the SAME judgment-call
// class as `ambient.projection.service.ts`'s own inline `fraction > 2/3 ? 'fresh' : ...` thresholds,
// documented here rather than silently assumed):
//   - `phase_band` ('onset'|'unfolding'|'receding'|'lingering'|'permanent'), from `recovery_curve_position`
//     (a `halgren_tannery_hailstorm` event's `contamination` axis, 1.0 = full/onset, → floor = lingering):
//       position >= 0.9        → 'onset'      (still diffusing, near-full contamination)
//       0.5 <= position < 0.9  → 'unfolding'
//       0.15 <= position < 0.5 → 'receding'
//       0 < position < 0.15    → 'lingering'   (small residual, near the permanent-residue floor)
//     `permanent_residue` events (no curve, design §3.4) are always 'permanent'.
//   - `severity_band` ('faint'|'noticeable'|'heavy'), a coarser 3-band lens on the SAME position axis
//     (design: "dérivée des magnitudes composées courantes" — for hailstorm, magnitude IS a direct
//     function of contamination, so severity and phase share the same underlying signal by construction):
//       position < 0.3         → 'faint'
//       0.3 <= position < 0.7  → 'noticeable'
//       position >= 0.7        → 'heavy'
//     `permanent_residue` events are always 'faint' (a fixed permanent trace is the smallest ongoing
//     signal, thematically — never escalates).
//   - `recency_band` ('fresh'|'settling'|'fading'), from `gameDay - started_at_game_day` (mirrors
//     `AmbientProjectionService`'s 3-band recency shape): < 7 days → 'fresh'; < 30 days → 'settling';
//     else → 'fading'.

import { Injectable } from '@nestjs/common';

import { citySimTunables } from '../../citysim/citysim-tunables';
import type { RandomWorldEventActiveRow } from '../../db/schema/random_world';
import type { CouplingDiscoveryCascadeRow } from '../../db/schema/random_world';
import { deriveGameDay } from './random-world-clock';
import { RandomWorldEventRepository } from './random-world-event.repository';
import { tightCouplingPairByKey } from './tight-coupling-pairs';

export type RandomWorldSeverityBand = 'faint' | 'noticeable' | 'heavy';
export type RandomWorldPhaseBand = 'onset' | 'unfolding' | 'receding' | 'lingering' | 'permanent';
export type RandomWorldRecencyBand = 'fresh' | 'settling' | 'fading';

/** ONE active event, player-facing (R2.2 grep-zero: no numeric leaf anywhere). */
export interface RandomWorldActiveEventView {
  readonly event_id: string;
  readonly template_i18n_key: string;
  readonly district: string;
  readonly severity_band: RandomWorldSeverityBand;
  readonly phase_band: RandomWorldPhaseBand;
  readonly recency_band: RandomWorldRecencyBand;
}

/** ONE discovered coupling, player-facing — the "known-dependencies overlay" (design §6.1, C3). R2.2
 *  grep-zero: the pair's EXISTENCE only — NEVER the probability, NEVER the substrate condition (the
 *  Challenge canon "must not become a cheat sheet", CATALOGUE_REPORT.md :570). */
export interface KnownCouplingView {
  readonly pair_i18n_key: string;
  readonly source_system_label: string;
  readonly target_system_label: string;
  readonly discovered_recency_band: RandomWorldRecencyBand;
}

@Injectable()
export class RandomWorldProjectionService {
  constructor(private readonly repo: RandomWorldEventRepository) {}

  /**
   * `GET /v1/random-world/active` projection (design §6.1): the requesting player's `active` events in
   * districts they own ≥1 building in. A player with zero owned buildings gets an empty list
   * (`listPlayerDistrictIds` returns `[]` — L1 natural, C2 AC9's negation).
   */
  async listActive(playerId: string): Promise<{ events: RandomWorldActiveEventView[] }> {
    const districtIds = await this.repo.listPlayerDistrictIds(playerId);
    if (districtIds.length === 0) return { events: [] };

    const gameMinute = await this.repo.getCurrentGameMinute(playerId);
    const gameDay = deriveGameDay(gameMinute, citySimTunables.inGameDayLengthMinutes);

    const rows = await this.repo.listActiveEventsForDistricts(districtIds);
    return { events: rows.map((r) => this.toView(r, gameDay)) };
  }

  /**
   * `GET /v1/random-world/known-couplings` (design §6.1, C3 — the "known-dependencies overlay" canon:
   * "exposed on a 'known dependencies' overlay ... growing over the campaign is a quietly powerful
   * long-arc reward"). `playerId`'s FULL `coupling_discovery_cascade` history — R2.2 grep-zero: the pair
   * EXISTENCE + a recency band ONLY, never the probability nor the substrate condition.
   */
  async listKnownCouplings(playerId: string): Promise<{ couplings: KnownCouplingView[] }> {
    const gameMinute = await this.repo.getCurrentGameMinute(playerId);
    const gameDay = deriveGameDay(gameMinute, citySimTunables.inGameDayLengthMinutes);

    const rows = await this.repo.listCascadesForPlayer(playerId);
    return { couplings: rows.map((r) => this.toKnownCouplingView(r, gameDay)) };
  }

  private toKnownCouplingView(row: CouplingDiscoveryCascadeRow, gameDay: number): KnownCouplingView {
    const pair = tightCouplingPairByKey(row.pair_key);
    return {
      pair_i18n_key: `random_world.coupling.pair.${row.pair_key}`,
      // Defensive fallback labels (should never trigger — pair_key is always written from the closed
      // TIGHT_COUPLING_PAIRS registry at insert time) — never throws on a stale/foreign row.
      source_system_label: pair?.sourceSystem ?? 'Unknown system',
      target_system_label: pair?.targetSystem ?? 'Unknown system',
      discovered_recency_band: this.recencyBandFor(gameDay, row.discovered_at_game_day),
    };
  }

  private toView(row: RandomWorldEventActiveRow, gameDay: number): RandomWorldActiveEventView {
    const isPermanent = row.template_id === 'permanent_residue';
    const position = Number(row.recovery_curve_position);

    return {
      event_id: row.id,
      template_i18n_key: `random_world.template.${row.template_id}`,
      district: `district-${row.district_id}`,
      severity_band: isPermanent ? 'faint' : this.severityBandFor(position),
      phase_band: isPermanent ? 'permanent' : this.phaseBandFor(position),
      recency_band: this.recencyBandFor(gameDay, row.started_at_game_day),
    };
  }

  private severityBandFor(position: number): RandomWorldSeverityBand {
    if (position >= 0.7) return 'heavy';
    if (position >= 0.3) return 'noticeable';
    return 'faint';
  }

  private phaseBandFor(position: number): RandomWorldPhaseBand {
    if (position >= 0.9) return 'onset';
    if (position >= 0.5) return 'unfolding';
    if (position >= 0.15) return 'receding';
    return 'lingering';
  }

  private recencyBandFor(gameDay: number, startedAtGameDay: number): RandomWorldRecencyBand {
    const elapsed = gameDay - startedAtGameDay;
    if (elapsed < 7) return 'fresh';
    if (elapsed < 30) return 'settling';
    return 'fading';
  }
}
