// IMPLEMENTS: docs/tech/04_city_simulation/system_4_patrol_doctrine.md §Player interaction surface
//             ("Le joueur ne voit PAS le contenu de la queue" — il voit `Precinct activity: HIGH/MEDIUM/LOW`,
//             un résumé QUALITATIF de la longueur de queue : LOW = <25% capacity, MEDIUM = 25-75%, HIGH = >75%)
//             + §Invariant 5 (composites only — jamais un scalaire `activity_level: int`)
//             + docs/tech/01_pillars_and_vision/P5_information_asymmetry.md (ObservationQueue ops-only)
//             -- session:2026-06-02 (Phase 1 Task 5) --
//
// `PatrolDoctrineProjectionService` — the P5 projection layer for System 4 (copies the PoliceMemory projection
// pattern). Maps the RAW per-precinct patrol load (the BO-only ObservationQueue active-entry count vs capacity)
// → a QUALITATIVE, fully-string patrol-heat band the player is allowed to INFER (R2.2 INVERTED — the client
// NEVER receives the raw entries / queue length / head / tail / cluster scores, only a closed qualitative band).
//
// The player NEVER sees the ObservationQueue contents (system_4 §Player interaction surface — the P5 headline):
// they see only a qualitative `Precinct activity` band. This projection is that band per precinct — a "how
// active are the patrols watching this precinct" feel, derived from the precinct's OWN ring-buffer fill ratio
// (per-precinct, never shared). NO entry count, NO head/tail, NO cluster score, NO severity escapes this
// service (the E2E scans the payload recursively and rejects ANY non-string leaf).

import { Injectable } from '@nestjs/common';

import { PatrolDoctrineService } from './patrol.service';

/**
 * Per-precinct qualitative patrol-heat band (P5 — never the raw queue length / entries / scores). A closed
 * 4-member domain the player infers from observed BPD activity (system_4 §Player interaction surface
 * LOW/MEDIUM/HIGH, with QUIET for an empty queue — the qualitative baseline before any observation):
 *   - QUIET   = the precinct's patrols have registered no current observations (empty ring).
 *   - LOW     = light patrol activity ( < 25% of ring capacity ).
 *   - MEDIUM  = moderate patrol activity ( 25–75% of ring capacity ).
 *   - HIGH    = heavy patrol activity ( > 75% of ring capacity ) — the precinct is watching closely.
 */
export type PatrolHeatBucket = 'QUIET' | 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * The PLAYER-FACING per-precinct patrol-heat projection (R2.2 inverted). EVERY field is a qualitative string
 * from a closed domain — no entry count, no head/tail, no cluster score. The Unity patrol overlay maps the
 * band to its UI CLIENT-SIDE; the server emits only the bucket (composites only — Inv 5).
 */
export interface PrecinctPatrolProjection {
  /** Which precinct this heat is about (an identity, not raw queue state) — echoed for the client's overlay. */
  precinct: string;
  /** The qualitative patrol-heat band (the only patrol signal the player infers — never the raw queue). */
  patrol_heat: PatrolHeatBucket;
}

// Fill-ratio band boundaries (system_4 §Player interaction surface: LOW <25%, MEDIUM 25–75%, HIGH >75%). The
// ratio NEVER escapes; only the band does.
const MEDIUM_FILL = 0.25; // ratio >= 0.25 → MEDIUM
const HIGH_FILL = 0.75; // ratio > 0.75 → HIGH

@Injectable()
export class PatrolDoctrineProjectionService {
  constructor(private readonly patrol: PatrolDoctrineService) {}

  /**
   * Project a player's patrol heat for ONE precinct → a fully-qualitative payload. Reads the BO-only raw load
   * (active entry count + capacity) from the service and buckets the fill ratio. An empty queue → QUIET (the
   * qualitative baseline). Returns null if the precinct queue row does not exist (the controller 404s).
   */
  async projectPrecinct(playerId: string, precinctId: number): Promise<PrecinctPatrolProjection | null> {
    const raw = await this.patrol.getPatrolLoadRaw(playerId, precinctId);
    if (raw === null) return null;
    return {
      precinct: `precinct-${precinctId}`,
      patrol_heat: this.heatBucket(raw.activeCount, raw.capacity),
    };
  }

  /** Map a raw (activeCount, capacity) → a qualitative patrol-heat band (the ratio never escapes this method). */
  private heatBucket(activeCount: number, capacity: number): PatrolHeatBucket {
    if (activeCount <= 0 || capacity <= 0) return 'QUIET';
    const ratio = activeCount / capacity;
    if (ratio > HIGH_FILL) return 'HIGH';
    if (ratio >= MEDIUM_FILL) return 'MEDIUM';
    return 'LOW';
  }
}
