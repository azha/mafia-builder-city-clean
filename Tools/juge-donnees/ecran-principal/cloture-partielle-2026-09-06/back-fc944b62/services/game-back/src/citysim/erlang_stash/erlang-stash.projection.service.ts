// IMPLEMENTS: docs/tech/04_city_simulation/system_9_erlang_stash.md
//             §Invariant 5 (current_fill per-slot percent JAMAIS exposé → StashLoadBucket enum composite) + §Inv 1/2
//                          (la courbe Erlang-B / blocking_probability est qualitative — le joueur voit le genou,
//                           jamais le float ni la formule)
//             §Player interaction surface (Safehouse detail screen: slot panel qualitatif, Erlang-B curve widget
//                                          qualitatif "faible/modéré/critique", load indicator StashLoadBucket badge,
//                                          open parcels warning ; PAS d'exposition de blocking_probability brut /
//                                          arrival_rate λ / current_fill exact / cash)
//             + docs/tech/01_pillars_and_vision/P5_information_asymmetry.md (R2.2 — no raw scalar to client)
//             -- session:2026-06-03 (Phase 1 Task 10) --
//
// `ErlangStashProjectionService` — the player-facing projection for System 9 (the Safehouse detail screen — slot
// panel + Erlang-B curve widget + load indicator). Maps the RAW per-safehouse state (slot_count / current_fill /
// arrival_rate floats + the in-memory blocking_probability) → a QUALITATIVE payload: a per-DISTRICT blocking-pressure
// band + per-SAFEHOUSE { StashLoadBucket, StashBlockingBand, high_blocking_alert flag, slot_count identity }.
//
// INV 5 / INV 1/2 / R2.2 — NO RAW BLOCKING FLOAT / PER-SLOT FILL / CASH / ARRIVAL_RATE ESCAPES: the only fields are
// `district` (an identity string), `district_blocking_band` (closed-domain string), `any_high_blocking_alert` (the
// district-summary boolean), and `safehouses[]` of { safehouse_id (a stable identity uuid string), slot_count (a
// STRUCTURAL identity — the slot count, the Erlang-B curve x-axis position, a small int 1..12, NOT a sim scalar —
// echoed like building/district), load_bucket (closed-domain string), blocking_band (closed-domain string),
// high_blocking_alert (the ONE permitted boolean — the open-parcels/saturation warning, P5 player-facing) }. NEVER
// the raw blocking_probability float, the per-slot current_fill, the arrival_rate λ, the slot_capacity cash, or
// open_parcels exact count. The E2E scans the payload recursively and rejects ANY numeric leaf except the
// structural slot_count identity; strings + booleans (+ the slot_count int) only.
//
// ERLANG-B KNEE QUALITATIVELY (the spec wants the knee visible "graphiquement" — but as BANDS, never the float):
// the per-safehouse blocking_band IS the qualitative knee value. A few-slots-high-λ safehouse projects SATURATED;
// adding slots (more C, same λ) collapses the band toward LOW — the diminishing-returns knee is visible in the
// band ORDERING across safehouses (the E2E asserts few-slots blocks MORE than many-slots — proving Erlang-B, not a
// linear approx). The Unity curve widget renders this client-side from the band per slot count.
//
// DISTRICT BLOCKING BAND (the district-level high-altitude signal): the MAX blocking band over the district's
// safehouses (the district is as pressured as its worst safehouse — the ops-relevant aggregate). any_high_blocking_alert
// is the district-summary OR over the per-safehouse alert flags (at least one safehouse over the threshold).
//
// BLOCKING SOURCE (in-memory-with-fallback): the projection reads the in-memory blocking working state the last
// minute tick computed (ErlangStashService.blockingStateFor); if absent (a projection read before the first tick —
// the E2E always advances first, but defensively), it recomputes ON THE FLY from the row (computeBlockingState — a
// pure function, identical to the tick). So the projection is always correct + deterministic, tick-or-not.
//
// SUBSTRATE: `safehouses` had zero application writers before LOT PLANQUE, so a projection for a district with
// none of the player's safehouses is `{ district, district_blocking_band: 'LOW', any_high_blocking_alert: false,
// safehouses: [] }` — that per-district shape stays correct today (the table itself is no longer organically
// empty city-wide, but a given district can still legitimately host none of this player's stashes). The E2E can
// also seed a building + safehouses directly to populate it — exercising the bucket/band/alert surface against
// real rows without going through the grant.

import { Injectable } from '@nestjs/common';

import type { StashLoadBucket, StashBlockingBand } from '../events/city-event-bus';
import { ErlangStashService } from './erlang-stash.service';

/** Ordinal rank of a blocking band (for the district-level MAX aggregate — LOW < MODERATE < HIGH < SATURATED). */
const BLOCKING_BAND_RANK: Record<StashBlockingBand, number> = {
  LOW: 0,
  MODERATE: 1,
  HIGH: 2,
  SATURATED: 3,
};
const BLOCKING_BAND_BY_RANK: StashBlockingBand[] = ['LOW', 'MODERATE', 'HIGH', 'SATURATED'];

/** The per-safehouse qualitative state (the safehouse card — never the raw blocking/fill/cash float). */
export interface SafehouseProjection {
  /** A stable safehouse identity (uuid string) — the client keys the slot panel / curve widget on this. */
  safehouse_id: string;
  /**
   * LOT PLANQUE C2 — the HOST building (uuid string). ⛔ FORME F REFERMÉE : le repository SÉLECTIONNAIT
   * déjà cette colonne (trois sites de lecture) et la projection la JETAIT — la donnée était en base,
   * relue, passée au compositeur, et la surface l'omettait. Un inventaire de routes reste VERT à travers
   * ce trou ; seul l'ensemble de clés de la réponse le détecte.
   * ⇒ Sans elle, un écran ne peut pas relier une planque à son bâtiment, et un parcours qui possède DEUX
   * planques dans le même district n'a aucun discriminant fiable pour choisir sa cible.
   * R2.2 : une POIGNÉE d'entité (le même statut que `safehouse_id`), jamais un scalaire de simulation.
   */
  building_id: string;
  /**
   * The slot count C — a STRUCTURAL IDENTITY (the Erlang-B curve x-axis position, a small int 1..12), NOT a sim
   * scalar. It is the ONE small-int leaf the projection carries so the client can render the knee widget (the
   * curve B(C, A) over slot count) and mark the current slot. Never a raw blocking/fill/cash value.
   */
  slot_count: number;
  /** The qualitative load bucket (EMPTY/LOW/NOMINAL/HIGH/FULL — never the raw per-slot fill; Inv 5). */
  load_bucket: StashLoadBucket;
  /** The qualitative blocking band (LOW/MODERATE/HIGH/SATURATED — never the raw blocking float; Inv 1/2/5). */
  blocking_band: StashBlockingBand;
  /** The high-blocking alert flag (binary — the ONE player-facing boolean; never the raw blocking float; Inv 3). */
  high_blocking_alert: boolean;
}

/**
 * The PLAYER-FACING per-district stash projection (the Safehouse detail screen + Erlang-B curve widget). A
 * per-district blocking-pressure band + a district-summary alert flag + per-safehouse { StashLoadBucket,
 * StashBlockingBand, alert } — NO raw blocking float, NO per-slot fill, NO cash, NO arrival_rate. The Unity
 * safehouse screen + curve widget map these CLIENT-SIDE.
 */
export interface DistrictStashProjection {
  /** Which district this state is about (an identity, not raw sim state) — echoed for the client's overlay. */
  district: string;
  /** The qualitative district-level blocking-pressure band (the MAX over the district's safehouses). */
  district_blocking_band: StashBlockingBand;
  /** Whether at least one safehouse in the district is over the alert threshold (the district-summary flag). */
  any_high_blocking_alert: boolean;
  /** The safehouses in this district + their qualitative StashLoadBucket / StashBlockingBand / alert. */
  safehouses: SafehouseProjection[];
}

@Injectable()
export class ErlangStashProjectionService {
  constructor(private readonly stash: ErlangStashService) {}

  /**
   * Project a player's stash state for ONE district → a fully-qualitative payload. Reads the district's safehouses
   * from the service (the raw floats are the INPUT but NEVER forwarded — Inv 1/2/5 / R2.2), derives each
   * safehouse's StashLoadBucket / StashBlockingBand / alert flag (from the in-memory blocking working state, with
   * an on-the-fly recompute fallback), and the district-level MAX blocking band + summary alert flag. Returns the
   * payload for a VALID, EXISTING district even with no safehouses (an empty per-district shape — the organic
   * Phase-1 reality); the controller 404s only for a non-existent district.
   */
  async projectDistrict(playerId: string, districtId: number): Promise<DistrictStashProjection> {
    const safehouses = await this.stash.listSafehousesForDistrict(playerId, districtId);

    let maxBandRank = 0; // LOW — the floor for an empty district (no pressure).
    let anyAlert = false;

    const projected: SafehouseProjection[] = safehouses.map((s) => {
      // Prefer the in-memory blocking state the last minute tick computed; fall back to an on-the-fly recompute
      // (a pure function of the row — identical to the tick) so the projection is correct tick-or-not.
      const blockingState = this.stash.blockingStateFor(s.safehouse_id) ?? this.stash.computeBlockingState(s);

      const bandRank = BLOCKING_BAND_RANK[blockingState.band];
      if (bandRank > maxBandRank) maxBandRank = bandRank;
      if (blockingState.alertActive) anyAlert = true;

      return {
        safehouse_id: s.safehouse_id,
        building_id: s.building_id,
        // slot_count is a structural identity echo (the Erlang-B curve x-axis position), not a sim scalar.
        slot_count: s.slot_count,
        // Derive the bucket/band/flag from the raw floats HERE; the floats do not leave this method (R2.2).
        load_bucket: this.stash.loadBucket(s.current_fill, s.slot_count),
        blocking_band: blockingState.band,
        high_blocking_alert: blockingState.alertActive,
      };
    });

    return {
      district: `district-${districtId}`,
      district_blocking_band: BLOCKING_BAND_BY_RANK[maxBandRank],
      any_high_blocking_alert: anyAlert,
      safehouses: projected,
    };
  }
}
