// IMPLEMENTS: docs/tech/04_city_simulation/system_5_cohesion_permafrost.md
//             §Invariant 7 (player surface = qualitatif + flag visible — "l'un des rares systèmes où le joueur
//                           a une lecture directe de l'état interne") + §États CohesionState
//             §Player interaction surface (district overview: état qualitatif STABLE/FRAGILE/THAWED + flag
//                                          "Permanent marginal")
//             + docs/tech/01_pillars_and_vision/P5_information_asymmetry.md (R2.2 — no raw scalar to client)
//             -- session:2026-06-02 (Phase 1 Task 6) --
//
// `CohesionPermafrostProjectionService` — the player-facing projection layer for System 5. Maps the RAW
// per-district DistrictCohesion struct (cohesion [0,1] float + the ratcheted thaw threshold float) → a
// QUALITATIVE payload: the closed `CohesionState` band + the `permanent_marginal_flag` boolean.
//
// INV 7 ↔ R2.2 RECONCILIATION (the load-bearing design decision; the spec reviewer will scrutinize this):
//   - Inv 7 says System 5 is one of the FEW systems where the player has a relatively DIRECT read of state
//     (cohesion is a long-term stewardship signal, not a hidden tactical lever) — the player-facing surface
//     exposes the qualitative state, the permanent-marginal flag, and (in the full Unity district-overview
//     screen) a cohesion BAR with a threshold marker.
//   - R2.2 (project-wide, INVERTED) says NO raw scalar escapes the server to the client — the client receives
//     qualitative composites, never raw floats.
//   - RECONCILIATION: this projection exposes the QUALITATIVE `CohesionState` band (STABLE/FRAGILE/THAWED) +
//     the `permanent_marginal_flag` BOOLEAN (a boolean IS player-facing per Inv 7 — it is a closed-domain
//     qualitative state, not a raw scalar), and DOES NOT forward the raw `cohesion` [0,1] float NOR the raw
//     `thaw_threshold_current` float. Inv 7's "direct read" is honoured by giving the player the qualitative
//     BAND + the flag (a coarse, faithful indication of stewardship state) WITHOUT leaking the raw scalar that
//     R2.2 forbids — the server emits the band, the Unity client renders the bar CLIENT-SIDE from the band (the
//     graphical bar/marker of the full overview screen is a client rendering of the band, not a server-sent
//     float; the precise threshold marker stays a backoffice-only read per §Implications Unity "pas
//     d'exposition numérique directe du thaw_threshold_current … le joueur lit le seuil graphiquement").
//
// NO RAW FLOAT ESCAPES: the only fields are `district` (an identity string), `cohesion_state` (a closed-domain
// string), and `permanent_marginal` (a boolean). The E2E scans the payload recursively and rejects ANY numeric
// leaf (a leaked cohesion / threshold float). The boolean is the ONE permitted non-string leaf (Inv 7
// player-facing flag) — the recursive scan permits boolean + string, rejects number.

import { Injectable } from '@nestjs/common';

import type { CohesionState } from '../events/city-event-bus';
import { CohesionPermafrostService } from './cohesion.service';

/**
 * The PLAYER-FACING per-district cohesion projection (Inv 7 + R2.2 reconciled). The qualitative `CohesionState`
 * band + the `permanent_marginal` boolean — NO raw cohesion / threshold float. The Unity district overlay maps
 * the band to its UI CLIENT-SIDE; the server emits only the band + flag (composites only — Inv 1).
 */
export interface DistrictCohesionProjection {
  /** Which district this state is about (an identity, not raw sim state) — echoed for the client's overlay. */
  district: string;
  /** The qualitative cohesion band (STABLE/FRAGILE/THAWED — the only cohesion signal; never the raw float). */
  cohesion_state: CohesionState;
  /** The one-way permanent-marginal flag (Inv 4 / Inv 7 — a player-facing boolean, not a raw scalar). */
  permanent_marginal: boolean;
}

@Injectable()
export class CohesionPermafrostProjectionService {
  constructor(private readonly cohesion: CohesionPermafrostService) {}

  /**
   * Project a player's cohesion for ONE district → a fully-qualitative payload (the band + the flag). Reads the
   * raw struct from the service, derives the CohesionState band (the raw cohesion/threshold floats are the
   * INPUT but NEVER forwarded), and returns the band + the permanent-marginal boolean. Returns null if the
   * district row does not exist (the controller 404s).
   */
  async projectDistrict(
    playerId: string,
    districtId: number,
  ): Promise<DistrictCohesionProjection | null> {
    const raw = await this.cohesion.getCohesionRaw(playerId, districtId);
    if (raw === null) return null;
    return {
      district: `district-${districtId}`,
      // Derive the band from the raw floats HERE; the floats do not leave this method (P5 / R2.2).
      cohesion_state: this.cohesion.cohesionState(raw.cohesion, raw.thaw_threshold_current),
      permanent_marginal: raw.permanent_marginal_flag,
    };
  }
}
