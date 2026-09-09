// IMPLEMENTS: docs/tech/04_city_simulation/system_7_unconformity_ledgers.md
//             §Invariant 1 (deviation_score = composite opaque, JAMAIS sigma brut exposé ; le badge est
//                           AUDIT_PIN_ACTIVE binaire + le deviation bucket qualitatif — jamais la valeur float)
//             §Player interaction surface (badge AUDIT_PIN_ACTIVE ; pas d'exposition de deviation_sigma_bucket
//                                           numérique ni de pinned_until en ticks ; F2 texte + icône)
//             + docs/tech/01_pillars_and_vision/P5_information_asymmetry.md (R2.2 — no raw scalar to client)
//             -- session:2026-06-03 (Phase 1 Task 8) --
//
// `UnconformityLedgerProjectionService` — the player-facing projection for System 7. Maps the RAW promoted-
// building state (the persisted audit_pin_expires_at timestamp + the in-memory deviation bucket) → a QUALITATIVE
// payload: a per-DISTRICT audit-pin PRESENCE band + per-BUILDING { AUDIT_PIN_ACTIVE binary, deviation_bucket }.
//
// INV 1 / R2.2 — NO RAW SIGMA / REVENUE / EXPIRY ESCAPES: the only fields are `district` (an identity string),
// `audit_pin_presence` (a closed-domain string), and `buildings[]` of { building (identity string),
// audit_pin_active (the ONE permitted boolean — the AUDIT_PIN_ACTIVE badge, P5 player-facing), deviation_bucket
// (a closed-domain string) }. NEVER the raw z-score / sigma float, the raw revenue / transaction_profile, the
// exact pinned_until timestamp, or a count. The E2E scans the payload recursively and rejects ANY numeric leaf;
// booleans + strings only (the boolean is the AUDIT_PIN_ACTIVE binary the player sees, like cohesion's
// permanent_marginal flag).
//
// PHASE-1 SHAPE: buildings are P2 entities (the buildings table is empty organically), so a normal Phase-1
// projection is `{ district, audit_pin_presence: 'NONE', buildings: [] }`. The E2E seeds promoted buildings to
// populate it — exercising the AUDIT_PIN_ACTIVE + deviation-bucket surface against real persisted pins.

import { Injectable } from '@nestjs/common';

import type { DeviationSigmaBucket } from '../events/city-event-bus';
import { UnconformityLedgerService } from './unconformity.service';

/**
 * Qualitative per-DISTRICT audit-pin PRESENCE band (R2.2 — never a raw count of pinned buildings). A closed
 * 3-member domain derived from how many of the district's promoted buildings carry an ACTIVE pin:
 *   - NONE        = no promoted building in the district has an active audit pin.
 *   - SOME        = at least one (a minority) carries an active pin.
 *   - WIDESPREAD  = most/all of the district's promoted buildings carry an active pin.
 */
export type AuditPinPresence = 'NONE' | 'SOME' | 'WIDESPREAD';

/** The per-building qualitative state (the AUDIT_PIN_ACTIVE badge + the deviation bucket — never the raw sigma). */
export interface UnconformityBuildingProjection {
  /** Which building this state is about (an identity, not raw sim state) — echoed for the client's overlay. */
  building: string;
  /** The AUDIT_PIN_ACTIVE badge (binary — the ONE player-facing boolean; never the raw sigma float — Inv 1). */
  audit_pin_active: boolean;
  /** The qualitative deviation bucket (NOMINAL/LOW/HIGH/CRITICAL_DEVIATION — never the raw z-score; R2.2). */
  deviation_bucket: DeviationSigmaBucket;
}

/**
 * The PLAYER-FACING per-district unconformity projection (Inv 1 + R2.2). A per-district audit-pin presence band +
 * the per-building { AUDIT_PIN_ACTIVE, deviation_bucket } — NO raw sigma / revenue / expiry / count. The Unity
 * map/badge maps these CLIENT-SIDE.
 */
export interface DistrictUnconformityProjection {
  /** Which district this state is about (an identity, not raw sim state) — echoed for the client's overlay. */
  district: string;
  /** The qualitative per-district audit-pin presence band (never the raw pinned-building count). */
  audit_pin_presence: AuditPinPresence;
  /** The promoted buildings in this district + their qualitative AUDIT_PIN_ACTIVE + deviation bucket. */
  buildings: UnconformityBuildingProjection[];
}

// Presence-band boundary as a FRACTION of the district's promoted buildings (the raw count never escapes).
const WIDESPREAD_FRACTION = 0.5; // >= 50% of promoted buildings pinned → WIDESPREAD.

@Injectable()
export class UnconformityLedgerProjectionService {
  constructor(private readonly unconformity: UnconformityLedgerService) {}

  /**
   * Project a player's unconformity state for ONE district → a fully-qualitative payload. Reads the promoted
   * buildings from the service (the raw audit_pin_expires_at + deviation bucket are the INPUT but NEVER
   * forwarded — Inv 1 / R2.2), derives AUDIT_PIN_ACTIVE (expiry in the future) + the presence band. Returns the
   * payload for a VALID, EXISTING district even with no promoted buildings (an empty per-district shape — the
   * organic Phase-1 reality); the controller 404s only for a non-existent district.
   */
  async projectDistrict(
    playerId: string,
    districtId: number,
  ): Promise<DistrictUnconformityProjection> {
    const promoted = await this.unconformity.listPromotedForDistrict(playerId, districtId);
    const now = Date.now();

    const buildings: UnconformityBuildingProjection[] = promoted.map((b) => {
      const auditPinActive = b.audit_pin_expires_at !== null && b.audit_pin_expires_at.getTime() > now;
      return {
        building: `building-${b.building_id}`,
        // Derive AUDIT_PIN_ACTIVE from the raw expiry HERE; the timestamp does not leave this method (R2.2).
        audit_pin_active: auditPinActive,
        // The bucket is the in-memory ledger's qualitative band (the raw z-score is never read here — Inv 1).
        deviation_bucket: this.unconformity.bucketForBuilding(playerId, b.building_id),
      };
    });

    return {
      district: `district-${districtId}`,
      audit_pin_presence: this.presenceBand(buildings),
      buildings,
    };
  }

  /** Map the per-building pin flags → a qualitative district presence band (the raw count never escapes). */
  private presenceBand(buildings: UnconformityBuildingProjection[]): AuditPinPresence {
    const total = buildings.length;
    if (total === 0) return 'NONE';
    const pinned = buildings.filter((b) => b.audit_pin_active).length;
    if (pinned === 0) return 'NONE';
    if (pinned / total >= WIDESPREAD_FRACTION) return 'WIDESPREAD';
    return 'SOME';
  }
}
