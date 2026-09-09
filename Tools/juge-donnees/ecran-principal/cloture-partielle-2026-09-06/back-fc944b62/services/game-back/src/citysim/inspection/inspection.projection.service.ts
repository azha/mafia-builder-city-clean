// IMPLEMENTS: docs/tech/04_city_simulation/system_6_inspection_queue.md
//             §Invariant 4 (position précise = vérité serveur, JAMAIS exposée ; la projection qualitative
//                           — l'informant fee read — n'expose QUE types + sévérités, pas bâtiments ni positions)
//             §Player interaction surface (queue-load qualitative + DispatcherRegime ; pas d'exposition cascade ;
//                                           entrées CASCADE indistinguables des INFORMANT — P5)
//             + docs/tech/01_pillars_and_vision/P5_information_asymmetry.md (R2.2 — no raw scalar to client)
//             -- session:2026-06-03 (Phase 1 Task 7) --
//
// `InspectionQueueProjectionService` — the player-facing projection for System 6 (the qualitative "informant
// fee read" SURFACE). Maps the RAW per-district InspectionQueue (the entries array + exact length + the building
// ids + the FIFO positions) → a QUALITATIVE payload: a queue-LOAD bucket + the DISTRIBUTION of entry
// TYPES/SEVERITIES as qualitative bands — NEVER building ids, exact positions, or raw counts (Inv 4).
//
// THE INFORMANT-FEE SURFACE (Inv 4 + P5): the informant fee PAYMENT itself is player economy (P2 — DEFERRED).
// This projection is the READ surface that the payment would UNLOCK — so it is built (the read is the value the
// fee buys), exposed player-resolved. What it EXPOSES: a coarse queue-load bucket (how busy the district's MIS
// queue is) + the shape of the queue (which entry TYPES and SEVERITIES dominate — a qualitative distribution).
// What it HIDES (Inv 4 — server truth): the exact numeric queue POSITION of any entry, the building ids, the
// exact entry COUNT. The player learns "this district's MIS queue is BUSY and skewed toward HIGH-severity
// reports" — never "your building #1234 is at position 7 of 19". CASCADE entries are indistinguishable from
// INFORMANT entries in the distribution (the player sees volume rise on a thaw, never that it is a cascade — P5).
//
// NO RAW SCALAR ESCAPES: every field is a qualitative string from a closed domain (a load band, a regime band,
// and per-type/per-severity presence bands). The E2E scans the payload recursively and rejects ANY numeric leaf
// (a leaked length / position / building id / count) — strings only.

import { Injectable } from '@nestjs/common';

import type { DispatcherRegime } from './inspection.service';
import { InspectionQueueService } from './inspection.service';
import type { InspectionQueueState, PriorityBucket, QueueEntrySource } from './inspection.repository';

/**
 * Qualitative queue-LOAD band (Inv 4 — the only load signal; never the exact length / cap ratio float). A
 * closed 5-member domain derived from the queue fill relative to the cap:
 *   - EMPTY      = no entries (the MIS queue is idle for this district).
 *   - LIGHT      = a few entries (routine).
 *   - MODERATE   = a meaningful backlog forming.
 *   - HEAVY      = the queue is busy (approaching the cap — BACKLOGGED territory).
 *   - SATURATED  = the queue is at/over the cap (overflow is dropping entries — Inv 3).
 */
export type QueueLoadBucket = 'EMPTY' | 'LIGHT' | 'MODERATE' | 'HEAVY' | 'SATURATED';

/**
 * Qualitative PRESENCE band for a TYPE/SEVERITY in the distribution (Inv 4 — never a raw count). A closed
 * 4-member domain: how much of the queue a given priority bucket / source occupies, coarsely.
 *   - NONE        = no entries of this kind.
 *   - SOME        = a minority of the queue is this kind.
 *   - MANY        = a substantial share.
 *   - PREDOMINANT = this kind dominates the queue.
 */
export type PresenceBand = 'NONE' | 'SOME' | 'MANY' | 'PREDOMINANT';

/**
 * The PLAYER-FACING per-district inspection projection (Inv 4 — the informant-fee read surface). The qualitative
 * queue-load bucket + the dispatcher regime band + the distribution of entry SEVERITIES and TYPES as presence
 * bands — NO building ids, NO exact positions, NO raw counts. The Unity MIS overview maps these CLIENT-SIDE.
 */
export interface InspectionQueueProjection {
  /** Which district this queue is about (an identity, not raw queue state) — echoed for the client's overlay. */
  district: string;
  /** The qualitative queue-load band (the only load signal — never the exact length / cap ratio). */
  queue_load: QueueLoadBucket;
  /** The qualitative dispatcher regime (NOMINAL/BACKLOGGED/BUDGET_CUT/SURGE — never the raw rate float). */
  dispatcher_regime: DispatcherRegime;
  /** Per-SEVERITY (priority bucket) presence bands — the distribution shape, never raw counts (Inv 4). */
  severity_distribution: Record<PriorityBucket, PresenceBand>;
  /** Per-TYPE (source) presence bands — CASCADE indistinguishable from INFORMANT to the player (P5). */
  type_distribution: Record<QueueEntrySource, PresenceBand>;
}

// Queue-load band boundaries as FRACTIONS of the cap (the exact length never escapes; only the band does).
const LIGHT_FRACTION = 0.0; // > 0 entries → at least LIGHT.
const MODERATE_FRACTION = 0.25; // >= 25% of cap → MODERATE.
const HEAVY_FRACTION = 0.6; // >= 60% of cap → HEAVY.
const SATURATED_FRACTION = 1.0; // >= 100% of cap → SATURATED (overflow active — Inv 3).

// Presence-band boundaries as FRACTIONS of the queue (the raw count never escapes; only the band does).
const SOME_FRACTION = 0.0; // > 0 → at least SOME.
const MANY_FRACTION = 0.25; // >= 25% of the queue → MANY.
const PREDOMINANT_FRACTION = 0.5; // >= 50% of the queue → PREDOMINANT.

const ALL_BUCKETS: PriorityBucket[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
// C21 (additive): 'FORENSIC' added as 6th member — the 5 original values are UNCHANGED (OQ-6).
const ALL_SOURCES: QueueEntrySource[] = ['SCHEDULED', 'INFORMANT', 'FALSE_REPORT', 'GENUINE_REPORT', 'CASCADE', 'FORENSIC'];

@Injectable()
export class InspectionQueueProjectionService {
  constructor(private readonly inspection: InspectionQueueService) {}

  /**
   * Project a player's inspection queue for ONE district → a fully-qualitative payload (the informant-fee read
   * surface). Reads the raw queue from the service, derives the load band + the regime + the type/severity
   * presence-band distribution (the raw positions / building ids / counts are the INPUT but NEVER forwarded —
   * Inv 4 / P5). Returns null if the district row does not exist (the controller 404s).
   */
  async projectDistrict(playerId: string, districtId: number): Promise<InspectionQueueProjection | null> {
    const raw = await this.inspection.getQueueRaw(playerId, districtId);
    if (raw === null) return null;
    return {
      district: `district-${districtId}`,
      queue_load: this.loadBucket(raw.entries.length, districtId),
      dispatcher_regime: this.inspection.dispatcherRegime(raw),
      severity_distribution: this.severityDistribution(raw),
      type_distribution: this.typeDistribution(raw),
    };
  }

  /**
   * Map a raw entry count → a qualitative queue-load band relative to the cap (the count never escapes).
   * `districtId` (04e-A1 C5, §6.1 live MIS-cap lever) threads the scoped cap so a DISTRICT `effect_modifier`
   * shifts this district's load band only.
   */
  private loadBucket(count: number, districtId: number): QueueLoadBucket {
    if (count <= LIGHT_FRACTION) return 'EMPTY';
    const cap = this.inspection.queueCapFor(districtId);
    const frac = count / cap;
    if (frac >= SATURATED_FRACTION) return 'SATURATED';
    if (frac >= HEAVY_FRACTION) return 'HEAVY';
    if (frac >= MODERATE_FRACTION) return 'MODERATE';
    return 'LIGHT';
  }

  /** Per-priority-bucket presence-band distribution (raw counts are the input; only the bands escape — Inv 4). */
  private severityDistribution(state: InspectionQueueState): Record<PriorityBucket, PresenceBand> {
    const total = state.entries.length;
    const counts: Record<PriorityBucket, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    for (const e of state.entries) counts[e.priority_bucket] += 1;
    const out = {} as Record<PriorityBucket, PresenceBand>;
    for (const b of ALL_BUCKETS) out[b] = this.presenceBand(counts[b], total);
    return out;
  }

  /** Per-source presence-band distribution (CASCADE indistinguishable from INFORMANT to the player — P5). */
  private typeDistribution(state: InspectionQueueState): Record<QueueEntrySource, PresenceBand> {
    const total = state.entries.length;
    const counts: Record<QueueEntrySource, number> = {
      SCHEDULED: 0,
      INFORMANT: 0,
      FALSE_REPORT: 0,
      GENUINE_REPORT: 0,
      CASCADE: 0,
      FORENSIC: 0,  // C21 (additive — OQ-6)
    };
    for (const e of state.entries) counts[e.source] += 1;
    const out = {} as Record<QueueEntrySource, PresenceBand>;
    for (const s of ALL_SOURCES) out[s] = this.presenceBand(counts[s], total);
    return out;
  }

  /** Map a raw (count, total) → a qualitative presence band (the raw count never escapes this method). */
  private presenceBand(count: number, total: number): PresenceBand {
    if (count <= 0 || total <= 0) return 'NONE';
    const frac = count / total;
    if (frac >= PREDOMINANT_FRACTION) return 'PREDOMINANT';
    if (frac >= MANY_FRACTION) return 'MANY';
    if (frac > SOME_FRACTION) return 'SOME';
    return 'NONE';
  }
}
