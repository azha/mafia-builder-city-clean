// IMPLEMENTS: docs/tech/04_city_simulation/system_11_deal_lek.md
//             §Invariant 6 (control_state = composite qualitatif, jamais un float nu — LekControlState
//                           CONTROLLED/CONTESTED/DEAD; les valeurs internes lek_score/contest_pressure restent
//                           côté serveur)
//             §Invariant 7 (presence_bucket qualitatif NONE/LOW/MEDIUM/HIGH/OVERWHELMING — jamais le nombre exact)
//             §Player interaction surface (intensité couleur = score band qualitatif ; barre contest_pressure
//                                           qualitative ; jamais la valeur uint8 brute)
//             + docs/tech/01_pillars_and_vision/P5_information_asymmetry.md (R2.2 — no raw scalar to client)
//             -- session:2026-06-03 (Phase 1 Task 12) --
//
// `DealLekProjectionService` — the player-facing projection for System 11 (the qualitative lek-overlay SURFACE).
// Maps the RAW per-district active leks (the deal_lek rows — lek_score / contest_pressure / deals_this_week ints)
// → a QUALITATIVE payload: a LekControlState + a qualitative score band + per-tile presence buckets + a
// contest-pressure band — NEVER the raw lek_score / contest_pressure / deals_this_week int (Inv 6 / Inv 7 / R2.2).
//
// WHAT IT EXPOSES (system_11 §Player interaction surface): per active lek — the LekControlState badge
// (CONTROLLED/CONTESTED/DEAD), a coarse score-intensity band (DORMANT/FAINT/MODERATE/STRONG/DOMINANT — the
// "colour intensity" the player reads, never the uint8), a contest-pressure band (LOW/MEDIUM/HIGH/CRITICAL — the
// qualitative bar, never the uint8), and the presence buckets (self/rival — Inv 7). WHAT IT HIDES (server truth):
// the raw lek_score, the raw contest_pressure, the deals_this_week count, the controller_org_id int.
//
// PRESENCE (Inv 7) — Phase-1 reality: presence assignment is a P2 player action (no Phase-1 producer), so the
// presence buckets are NONE day-1 (no agents assigned). The buckets are surfaced (the read SURFACE the P2 action
// would populate) at their NONE default — honest: the field exists, the producer is deferred (the cohesion /
// inspection informant-fee precedent).
//
// CONTROL STATE (Inv 6): DEAD wins (a lek with no deals for 4 weeks — the service's in-memory weeks counter);
// else CONTESTED if the normalized contest_pressure (contest_pressure/100) >= contest_threshold_presence; else
// CONTROLLED. The DEAD read comes from the service (the weeks counter is in-memory, not a deal_leks column).
//
// NO RAW SCALAR ESCAPES: every field is a qualitative string from a closed domain (a control state, a score band,
// a contest band, presence buckets) + the structural tile identity (a block-tile id — like building/district). The
// E2E scans the payload recursively and rejects ANY raw lek_score / contest_pressure / deals int.

import { Injectable } from '@nestjs/common';

import type { LekControlState } from '../events/city-event-bus';
import { DealLekService } from './deal-lek.service';
import type { DealLekRow } from './deal-lek.repository';

/**
 * Qualitative lek-score INTENSITY band (system_11 §Player interaction surface — the "colour intensity" the player
 * reads; NEVER the raw lek_score uint8). A closed 5-member domain on the 0..100 score:
 *   - DORMANT  = score < 10 (barely a lek — fading).
 *   - FAINT    = 10–30 (a weak attractor).
 *   - MODERATE = 30–60 (an established lek).
 *   - STRONG   = 60–85 (a busy, valuable lek).
 *   - DOMINANT = >= 85 (a chokepoint — the district's prime tile).
 */
export type LekScoreBand = 'DORMANT' | 'FAINT' | 'MODERATE' | 'STRONG' | 'DOMINANT';

/**
 * Qualitative contest-pressure band (system_11 §Player interaction surface — the qualitative contest bar; NEVER
 * the raw contest_pressure uint8). A closed 4-member domain on the 0..100 pressure: LOW < 30; MEDIUM 30–60; HIGH
 * 60–85; CRITICAL >= 85 (a flip is imminent).
 */
export type ContestPressureBand = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Qualitative PRESENCE bucket (system_11 Inv 7 — never the exact agent count). A closed 5-member domain. Phase-1:
 * NONE (presence assignment is P2 — no producer day-1).
 */
export type PresenceBucket = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'OVERWHELMING';

/** The PLAYER-FACING per-tile lek projection (Inv 6 / Inv 7 / R2.2 — qualitative bands only, no raw ints). */
export interface LekProjectionEntry {
  /** The block-tile this lek sits on (a structural identity echo — like building/district; never raw sim state). */
  tile: number;
  /** The qualitative control state (Inv 6 — CONTROLLED/CONTESTED/DEAD; never the raw contest_pressure float). */
  control_state: LekControlState;
  /** The qualitative score-intensity band (R2.2 — never the raw lek_score uint8). */
  score_band: LekScoreBand;
  /** The qualitative contest-pressure band (R2.2 — never the raw contest_pressure uint8). */
  contest_pressure_band: ContestPressureBand;
  /** The player-org presence bucket (Inv 7 — NONE day-1; the P2 presence-assignment read surface). */
  presence_self: PresenceBucket;
  /** The rival-org presence bucket (Inv 7 — NONE day-1). */
  presence_rival: PresenceBucket;
}

/** The PLAYER-FACING per-district lek payload (the lek-overlay surface — qualitative bands only). */
export interface LekDistrictProjection {
  /** Which district this is about (an identity echo — never raw lek state). */
  district: string;
  /** The active leks in this district (sparse — only tiles with a lek row; empty for a quiet district). */
  leks: LekProjectionEntry[];
}

@Injectable()
export class DealLekProjectionService {
  constructor(private readonly deals: DealLekService) {}

  /**
   * Project a player's active leks for ONE district → a fully-qualitative payload (the lek-overlay surface).
   * Reads the raw leks from the service, derives the LekControlState + score band + contest band + presence buckets
   * per tile (the raw lek_score / contest_pressure / deals ints are the INPUT but NEVER forwarded — Inv 6/7 / R2.2).
   * The leks are sorted by score desc then tile asc; only the top-N (leks_per_district) are surfaced as the district's
   * ACTIVE leks (Phase C re-rank — the demoted tiles keep their row but are not the district's attractor markers).
   */
  async projectDistrict(playerId: string, districtId: number): Promise<LekDistrictProjection> {
    const raw = await this.deals.listLeksForDistrict(playerId, districtId);
    // Phase C re-rank (DERIVED): the district's ACTIVE leks are the top-N by score (the attractor markers). Demoted
    // tiles keep their score (the row persists) but are not surfaced as district markers — a soft transition.
    const ranked = [...raw].sort((a, b) => b.lek_score - a.lek_score || a.tile_id - b.tile_id);
    const topN = ranked.slice(0, this.deals.leksPerDistrict);
    return {
      district: `district-${districtId}`,
      leks: topN.map((lek) => this.projectLek(playerId, districtId, lek)),
    };
  }

  /** Map one raw lek row → a qualitative entry (the raw ints are the input; only the bands escape — Inv 6/7).
   *  04g-B C3 (S7 wire): threads `districtId` through to `controlState` — the C0-resolved 2-level thread
   *  (`projectDistrict` → `projectLek` → `controlState`, `2026-07-15-04g-B-C0-reanchor.md` §2). */
  private projectLek(playerId: string, districtId: number, lek: DealLekRow): LekProjectionEntry {
    return {
      tile: lek.tile_id,
      control_state: this.controlState(playerId, districtId, lek),
      score_band: this.scoreBand(lek.lek_score),
      contest_pressure_band: this.contestPressureBand(lek.contest_pressure),
      // Presence assignment is P2 (no Phase-1 producer) — the read surface defaults to NONE (Inv 7).
      presence_self: 'NONE',
      presence_rival: 'NONE',
    };
  }

  /**
   * Map a lek → its LekControlState (Inv 6 — the raw contest_pressure float never escapes; R2.2). DEAD wins (the
   * service's in-memory weeks-without-deals counter >= 4 — Inv 5); else CONTESTED if the normalized contest_pressure
   * (contest_pressure/100) >= contest_threshold_presence; else CONTROLLED.
   *
   * 04g-B C3 (S7 wire, design §3.6/§3.7): reads the DISTRICT-scoped `contestThresholdPresenceFor(districtId)`
   * (was the plain `contestThresholdPresence` getter — now UNCHANGED/byte-identical for any OTHER caller,
   * `deal-lek.service.ts:423-424`). Zero-regression (AC3): with no `effect_modifier` row on this key/district,
   * `contestThresholdPresenceFor` returns the SAME base value the plain getter always returned — the CONTESTED
   * boundary is byte-identical to pre-C3 behavior when no sideways_failure secondary is active on this district.
   */
  private controlState(playerId: string, districtId: number, lek: DealLekRow): LekControlState {
    if (this.deals.isDead(playerId, lek.tile_id)) return 'DEAD';
    const normalized = lek.contest_pressure / 100;
    if (normalized >= this.deals.contestThresholdPresenceFor(districtId)) return 'CONTESTED';
    return 'CONTROLLED';
  }

  /** Map a raw lek_score (0..100) → a qualitative intensity band (the raw int never escapes — R2.2). */
  private scoreBand(score: number): LekScoreBand {
    if (score >= 85) return 'DOMINANT';
    if (score >= 60) return 'STRONG';
    if (score >= 30) return 'MODERATE';
    if (score >= 10) return 'FAINT';
    return 'DORMANT';
  }

  /** Map a raw contest_pressure (0..100) → a qualitative band (the raw int never escapes — R2.2). */
  private contestPressureBand(pressure: number): ContestPressureBand {
    if (pressure >= 85) return 'CRITICAL';
    if (pressure >= 60) return 'HIGH';
    if (pressure >= 30) return 'MEDIUM';
    return 'LOW';
  }
}
