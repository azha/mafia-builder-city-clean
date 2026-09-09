// IMPLEMENTS: docs/tech/04_city_simulation/system_2_sparse_citizens.md §invariant 4 (whisper_state composite,
//             jamais le float whisper_pressure brut) + §P5 (le joueur voit la distribution aggregate, pas les
//             whisper_pressure individuels) + docs/tech/01_pillars_and_vision/P5_information_asymmetry.md
//             -- session:2026-06-02 (Phase 1 Task 3) --
//
// `SparseCitizensProjectionService` — the P5 projection layer for System 2 (copies the Flow Cells projection
// pattern). Maps RAW per-player whisper-state aggregate (the BO-only counts/pressures) → a QUALITATIVE,
// fully-string payload the player is allowed to see (R2.2 INVERTED — the client NEVER receives raw scalars/
// counts/floats, only a closed qualitative domain).
//
// TWO levels of qualitative output, both fully string:
//   1. `whisper_index`           — a per-player OVERALL band (CALM / STIRRING / ALERT) derived from the
//                                  PROPORTION of ACTIVE citizens (an aggregate "how stirred is the city"
//                                  feel — never the count, never the raw pressures).
//   2. `whisper_state_distribution` — the {DORMANT, PRESSURE, ACTIVE} split (the spec's canonical 3-member
//                                  WhisperBucket domain) as MAGNITUDE buckets (NONE/FEW/SOME/MANY) —
//                                  qualitative "how many" bands, NEVER the raw counts.
// NO whisper_pressure, NO satisfaction, NO citizen_id, NO raw count escapes this service (the E2E scans the
// whole payload recursively and rejects ANY non-string leaf).

import { Injectable } from '@nestjs/common';

import { SparseCitizensService, WhisperStateBucket } from './sparse_citizens.service';

/** Overall per-player whisper band (P5 — never a count / proportion float). */
export type WhisperIndexBucket = 'CALM' | 'STIRRING' | 'ALERT';

/** Qualitative magnitude band for a whisper_state group's size (P5 — never a raw count). */
export type MagnitudeBucket = 'NONE' | 'FEW' | 'SOME' | 'MANY';

/**
 * The PLAYER-FACING citizen whisper projection (R2.2 inverted). EVERY field is a qualitative string drawn
 * from a closed domain — no count, no pressure, no satisfaction. The Unity demographic/whisper overlay maps
 * these bands to its UI CLIENT-SIDE; the server emits only the buckets.
 */
export interface CitizenWhisperProjection {
  /** Overall band of how "stirred" the city's informant pressure is (proportion of ACTIVE → qualitative). */
  whisper_index: WhisperIndexBucket;
  /** Per-whisper_state magnitude band, keyed by the closed {DORMANT, PRESSURE, ACTIVE} domain. */
  whisper_state_distribution: Record<WhisperStateBucket, MagnitudeBucket>;
}

/** Proportion-of-ACTIVE → overall whisper_index band boundaries (qualitative; the proportion never escapes). */
const STIRRING_PROPORTION = 0.05; // ≥5% ACTIVE → STIRRING (the city is starting to talk).
const ALERT_PROPORTION = 0.2; // ≥20% ACTIVE → ALERT (a wave of informants is emerging).

/** Group-size → MAGNITUDE band boundaries (qualitative "how many" — the raw count never escapes). */
const FEW_MAX = 10; // 1..10 → FEW
const SOME_MAX = 100; // 11..100 → SOME; >100 → MANY

@Injectable()
export class SparseCitizensProjectionService {
  constructor(private readonly sparse: SparseCitizensService) {}

  /**
   * Project a player's citizen whisper state → a fully-qualitative payload. Reads the BO-only raw aggregate
   * (counts split at the activation threshold) from the repository and buckets EVERYTHING. A player with no
   * seeded population (never ticked) → CALM + all-NONE (the qualitative baseline).
   */
  async projectWhisper(playerId: string): Promise<CitizenWhisperProjection> {
    const counts = await this.sparse.repository.whisperStateCounts(
      playerId,
      this.sparse.whisperActivationThreshold,
    );

    // Per-band raw counts keyed by the canonical 3-member domain — the distribution is built by mapping over
    // the bucket values so it ALWAYS covers the full {DORMANT, PRESSURE, ACTIVE} key-set (no band can be
    // silently dropped). Raw counts are bucketed to magnitude bands here; they never escape this service.
    const rawByBucket: Record<WhisperStateBucket, number> = {
      [WhisperStateBucket.DORMANT]: counts.dormant,
      [WhisperStateBucket.PRESSURE]: counts.pressure,
      [WhisperStateBucket.ACTIVE]: counts.active,
    };
    const whisper_state_distribution = Object.fromEntries(
      Object.values(WhisperStateBucket).map((bucket) => [bucket, this.magnitudeBucket(rawByBucket[bucket])]),
    ) as Record<WhisperStateBucket, MagnitudeBucket>;

    return {
      whisper_index: this.indexBucket(counts.total, counts.active),
      whisper_state_distribution,
    };
  }

  /** Overall band from the PROPORTION of ACTIVE citizens (the proportion is computed here, never exposed). */
  private indexBucket(total: number, active: number): WhisperIndexBucket {
    if (total === 0) return 'CALM';
    const proportion = active / total;
    if (proportion >= ALERT_PROPORTION) return 'ALERT';
    if (proportion >= STIRRING_PROPORTION) return 'STIRRING';
    return 'CALM';
  }

  /** Map a raw group size → a qualitative magnitude band (the count never escapes this method). */
  private magnitudeBucket(n: number): MagnitudeBucket {
    if (n <= 0) return 'NONE';
    if (n <= FEW_MAX) return 'FEW';
    if (n <= SOME_MAX) return 'SOME';
    return 'MANY';
  }
}
