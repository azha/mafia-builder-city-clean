// IMPLEMENTS: docs/superpowers/specs/2026-06-04-phase-02b-police-risk-raid-design.md §6 (Raid-risk band C — a PURE
//             read-time projection; no new persistence) +
//             projects/mafia_city_game/gdd/14_tunable_constants.md §Operational chain — enforcement / raid
//             (operational.raid.risk_band_cutpoints = composite:raid_risk_bands) +
//             docs/tech/04_city_simulation/heat_propagation.md §enum HeatBucket (the REUSED COLD/WARM/HOT/BURNING
//             thresholds — NOT re-invented; the canonical heatBucketNameOf mapping) +
//             docs/tech/04_city_simulation/system_7_unconformity.md §Audit pin (buildings.audit_pin_expires_at) +
//             docs/tech/01_pillars_and_vision/P5_information_asymmetry.md (R2.2 — no raw scalar to the client)
//             -- session:2026-06-04 (Phase 2b Task 4) --
//
// `deriveRaidRiskBand` — the TELEGRAPHED raid-risk band (Phase-2b enrichment C). A PURE read-time projection (NO new
// persistence): from signals ALREADY on the `buildings` row at projection time it derives a closed qualitative band
// `raid_risk ∈ {LOW, ELEVATED, HIGH, IMMINENT}` so the player sees danger BUILD before a raid lands (the raid is then
// never arbitrary — it surfaces "what the player already half-sees").
//
// THE TWO SIGNALS (both directly on the `buildings` row — read-only):
//   - the building's HEAT BAND (buildings.heat float → the HeatBucket COLD/WARM/HOT/BURNING via the CANONICAL
//     heatBucketNameOf mapping — the SAME thresholds heat_propagation uses, REUSED, not re-derived). The raw float is
//     the INPUT but is mapped to a band HERE and NEVER forwarded (R2.2 / Inv 1).
//   - the AUDIT-PIN PRESENCE (buildings.audit_pin_expires_at > now → pinned; System 7 Unconformity sets this — a
//     read-only boolean, never the timestamp).
//
// DEFERRED THIRD SIGNAL — RECENT PATROL OBSERVATION SEVERITY (System 4): the design names it as an input, but System
// 4's belief is the per-precinct suspicion_map (a lossy P5-internal bytea blob) + the per-precinct PoliceBeliefBucket
// projection — there is NO clean READ-ONLY per-building/per-block observation-severity accessor (Inv 6 read-only;
// consuming it would mean cracking the suspicion_map / recomputing suspicion, explicitly forbidden). Heat band + audit
// pin are sufficient and honest (both are "what the player already half-sees"). Observation severity folds in when a
// clean per-building accessor lands — a documented seam, NOT recomputed here.
//
// R2.2: the output is a CLOSED-DOMAIN band string only — never the raw heat float, the sigma, or any suspicion scalar.
// R2.3: the cutpoints come from operational.raid.risk_band_cutpoints (gdd/14, mirrored in raid-tunables.ts) — NO inline
// thresholds. The mapping is a CLEAN TOTAL FUNCTION (every (heatBucket, pinned) pair → exactly one band).

import type { HeatBucket } from '../../citysim/events/city-event-bus';
import { heatBucketNameOf } from '../../citysim/heat/heat-tunables';
import { raidTunables, type RaidRiskBand } from './raid-tunables';

/** Ordinal rank of a raid-risk band (LOW < ELEVATED < HIGH < IMMINENT) — for the monotone "take the higher" combine. */
const RAID_RISK_BAND_ORDER: readonly RaidRiskBand[] = ['LOW', 'ELEVATED', 'HIGH', 'IMMINENT'] as const;

function rankOf(band: RaidRiskBand): number {
  return RAID_RISK_BAND_ORDER.indexOf(band);
}

/** The HIGHER (more dangerous) of two raid-risk bands — danger only ever RISES as signals stack (monotone combine). */
function higherBand(a: RaidRiskBand, b: RaidRiskBand): RaidRiskBand {
  return rankOf(a) >= rankOf(b) ? a : b;
}

/**
 * Map a building's HeatBucket → the raid_risk band floor it implies (the heat-driven component of the composite). The
 * mapping lives in operational.raid.risk_band_cutpoints (gdd/14, mirrored in raid-tunables.ts) — R2.3, not inline.
 */
function bandForHeatBucket(bucket: HeatBucket): RaidRiskBand {
  return raidTunables.riskBandCutpoints.byHeatBucket[bucket];
}

/**
 * Derive the telegraphed raid-risk band for a building from its CURRENT read-time signals (a PURE function — no DB, no
 * persistence, no RNG; same signals → same band, deterministic). Combines the heat-driven floor with the audit-pin
 * floor by taking the HIGHER band (danger only rises): a pinned BURNING building is IMMINENT; a pinned COLD building is
 * HIGH; an un-pinned WARM building is ELEVATED. The raw heat float is the INPUT but is bucketed HERE and never escapes
 * (R2.2). The cutpoints come from gdd/14 (R2.3 — not inline).
 *
 * @param heat       the building's raw heat float [0..1] (buildings.heat) — mapped to a band internally, never forwarded.
 * @param auditPinned whether the building currently has an active audit pin (buildings.audit_pin_expires_at > now).
 */
export function deriveRaidRiskBand(params: { heat: number; auditPinned: boolean }): RaidRiskBand {
  const heatBand = bandForHeatBucket(heatBucketNameOf(params.heat));
  if (!params.auditPinned) return heatBand;
  // An active audit pin (System 7) floors the band at HIGH — combine by taking the higher of the two.
  return higherBand(heatBand, raidTunables.riskBandCutpoints.auditPinFloor);
}

export type { RaidRiskBand };
