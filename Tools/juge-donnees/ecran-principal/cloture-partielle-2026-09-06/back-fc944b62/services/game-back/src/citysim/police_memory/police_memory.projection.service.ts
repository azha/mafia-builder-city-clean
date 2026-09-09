// IMPLEMENTS: docs/tech/04_city_simulation/system_3_police_memory.md §Invariants (lossy per-precinct;
//             P5 — le joueur NE voit JAMAIS true_state NI la suspicion_map brute; il infère la croyance police)
//             + §Implications Unity ("patrol indicators restent qualitatifs LOW/MEDIUM/HIGH ; aucune exposition
//             de suspicion_map") + docs/tech/01_pillars_and_vision/P5_information_asymmetry.md
//             -- session:2026-06-02 (Phase 1 Task 4) --
//
// `PoliceMemoryProjectionService` — the P5 projection layer for System 3 (copies the SparseCitizens projection
// pattern). Maps the RAW per-precinct belief (the BO-only suspicion_map tile mass — the peak tile + total
// mass) → a QUALITATIVE, fully-string belief bucket the player is allowed to INFER (R2.2 INVERTED — the client
// NEVER receives the raw suspicion_map bytea / true_state / any scalar, only a closed qualitative band).
//
// The player NEVER sees the suspicion_map nor true_state (the P5 headline): they INFER police belief from
// observed behavior. This projection is the qualitative BELIEF band per precinct — a "how suspicious is this
// precinct of me" feel, derived from the precinct's OWN lossy map (per-precinct, never shared). NO tile value,
// NO mass, NO raid_temperature, NO building id escapes this service (the E2E scans the payload recursively and
// rejects ANY non-string leaf).

import { Injectable } from '@nestjs/common';

import { PoliceMemoryService } from './police_memory.service';

/**
 * Per-precinct qualitative police-belief band (P5 — never the raw suspicion_map / tile mass). A closed 4-member
 * domain the player infers from observed BPD behavior (patrol intensity, raids):
 *   - DORMANT    = the precinct has no belief about the player (no observed suspicion).
 *   - WATCHFUL   = early belief accumulating (some observations registered).
 *   - SUSPICIOUS = the precinct is actively building a case (a hot tile is forming).
 *   - HUNTING    = the precinct's belief is near-certain on a target (peak suspicion).
 */
export type PoliceBeliefBucket = 'DORMANT' | 'WATCHFUL' | 'SUSPICIOUS' | 'HUNTING';

/**
 * The PLAYER-FACING per-precinct belief projection (R2.2 inverted). EVERY field is a qualitative string from a
 * closed domain — no tile value, no mass, no raid_temperature, no building id. The Unity patrol overlay maps
 * the band to its UI CLIENT-SIDE; the server emits only the bucket.
 */
export interface PrecinctBeliefProjection {
  /** Which precinct this belief is about (an identity, not raw belief state) — echoed for the client's overlay. */
  precinct: string;
  /** The qualitative police-belief band (the only belief signal the player infers — never the raw map). */
  belief: PoliceBeliefBucket;
}

// Peak-tile band boundaries (in the uint8 0..255 tile domain — the peak NEVER escapes; only the band does).
const WATCHFUL_PEAK = 1; // peak ≥ 1 → WATCHFUL (any observation registered).
const SUSPICIOUS_PEAK = 80; // peak ≥ 80 → SUSPICIOUS (a case is forming).
const HUNTING_PEAK = 180; // peak ≥ 180 → HUNTING (near-certain on a target).

@Injectable()
export class PoliceMemoryProjectionService {
  constructor(private readonly police: PoliceMemoryService) {}

  /**
   * Project a player's belief for ONE precinct → a fully-qualitative payload. Reads the BO-only raw belief
   * (peak tile + total mass) from the service and buckets it. A precinct with no belief (never observed) →
   * DORMANT (the qualitative baseline). Returns null if the precinct row does not exist (the controller 404s).
   */
  async projectPrecinct(playerId: string, precinctId: number): Promise<PrecinctBeliefProjection | null> {
    const raw = await this.police.getPrecinctBeliefRaw(playerId, precinctId);
    if (raw === null) return null;
    return {
      precinct: `precinct-${precinctId}`,
      belief: this.beliefBucket(raw.peakTile),
    };
  }

  /** Map a raw peak tile value → a qualitative belief band (the peak never escapes this method). */
  private beliefBucket(peakTile: number): PoliceBeliefBucket {
    if (peakTile >= HUNTING_PEAK) return 'HUNTING';
    if (peakTile >= SUSPICIOUS_PEAK) return 'SUSPICIOUS';
    if (peakTile >= WATCHFUL_PEAK) return 'WATCHFUL';
    return 'DORMANT';
  }
}
