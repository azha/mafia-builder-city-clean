// IMPLEMENTS: projects/mafia_city_game/gdd/14_tunable_constants.md §Operational chain — enforcement / raid
//             (the `operational.raid.*` registry keys, added Phase-2b T0) +
//             docs/superpowers/specs/2026-06-04-phase-02b-police-risk-raid-design.md §7 (config & tunables, R2.3)
//             -- session:2026-06-04 (Phase 2b Task 1) --
//             lot-5 TD-094: `operational.raid.seized_band_cutpoints` + `operational.raid.repair_band_cutpoints`
//             NEW composites (code→canon R2.3 — the inline SEIZED_BAND_*/REPAIR_BAND_* literals externalized, parity
//             with risk_band_cutpoints; values verbatim: 100/400 g seized floors, 1_000_000/5_000_000 cents repair
//             floors). Consumed by RealEstateProjectionService.seizedAmountBand / repairCostBand.
//
// Raid (enforcement — Phase-2b vector #1) tunables — the `operational.raid.*` keys THIS slice consumes: the SEIZURE
// FRACTION (the fraction of a raided building's stored product seized, T1) + the RAID-RISK-BAND CUTPOINTS (the
// qualitative composite mapping (heat band + audit-pin presence) → the raid_risk band, T4 — the telegraph the player
// reads BEFORE a raid) + the SEIZED-BAND CUTPOINTS (grams floors → seized_amount band, lot-5 TD-094) + the REPAIR-
// BAND CUTPOINTS (cents floors → repair_cost band, lot-5 TD-094). Phase-2b T1 = a RaidExecutionService consumes the
// existing RaidPlannedEvent (System 4) → seizes the product in the player's operational product-holding buildings on
// the raided block + transitions them DAMAGED. Phase-2b T4 = a PURE read-time projection that maps the building's
// CURRENT heat band + audit pin into a closed raid_risk band on the building card (no new persistence). The repair
// tunables (operational.repair.cost_ratio / duration_ticks) are CONSUMED by T3 (RepairService) and mirrored in
// repair-tunables.ts — NOT here.
//
// R2.3 (NO inline numeric balance/config): the consumed registry key is referenced from gdd/14 §Operational chain —
// enforcement / raid (cited per key, with the upstream design-spec source). It is surfaced as an env-overridable
// fallback so this file stays a faithful MIRROR of the single source of truth. If the registry value changes, update
// this map in the SAME commit (R9.3 propagation: gdd/14 ↔ code).
//
// ── THE SEIZURE FRACTION GROUNDING (operational.raid.seizure_fraction — gdd/14 §Operational chain — enforcement /
//    raid). The fraction of `product_storage.quantity_grams` removed when a building is raided: the surviving
//    quantity = round(quantity_grams × (1 - seizure_fraction)). Default 1.0 = total seizure (a raid empties the
//    stored product). Range 0..1 (a fraction — R2.3). NOT `[PROV]`: 1.0 is the deliberate "a raid is a real loss"
//    design default (design §3). The contextual modulation (CRACKDOWN +50%, equipment_tier, district) is a DEFERRED
//    documented seam (design §6/§11) — the base value is a flat global tunable.
//
// ── THE RAID-RISK-BAND CUTPOINTS (operational.raid.risk_band_cutpoints = `composite:raid_risk_bands` — gdd/14
//    §Operational chain — enforcement / raid). A QUALITATIVE COMPOSITE (NEVER a scalar — gdd/14 registers it as
//    `composite`): the cutpoints that map (the building's HeatBucket + audit-pin presence) → the closed raid_risk
//    band `LOW | ELEVATED | HIGH | IMMINENT`. The monotone mapping (design §6, the task's reasonable mapping): a
//    building's risk = max(heat-driven floor, pin-driven floor) so DANGER only ever RISES with each signal —
//      heat band:  COLD → LOW ; WARM → ELEVATED ; HOT → HIGH ; BURNING → IMMINENT,
//      audit pin present → at least HIGH (System 7 Unconformity pinned this building → an inspector is coming),
//    the two combined by taking the HIGHER band (a pinned BURNING building is IMMINENT; a pinned COLD building is
//    HIGH). A CLEAN TOTAL FUNCTION (every (heatBucket, pinned) pair maps to exactly one band). The cutpoints are
//    FLAT/global (the band is per-building because it reads THAT building's heat/audit, but the boundaries are not
//    modulated — contextual modulation is the SAME deferred seam, design §6/§11). RECENT PATROL OBSERVATION SEVERITY
//    is a THIRD documented input in the design (System 4) but is DEFERRED here: System 4's belief is the per-precinct
//    suspicion_map (a lossy P5-internal bytea blob) + the per-precinct PoliceBeliefBucket projection — there is NO
//    clean READ-ONLY per-building/per-block observation-severity accessor to consume (Inv 6 read-only; reading it
//    would mean cracking the suspicion_map / recomputing suspicion, explicitly forbidden). Heat band + audit pin are
//    BOTH directly on the `buildings` row and ARE "what the player already half-sees" — sufficient and honest for the
//    telegraph. Observation severity folds in when a clean per-building accessor lands (a documented seam).
//
// ── THE SEIZED-BAND CUTPOINTS (operational.raid.seized_band_cutpoints = `composite:seized_band_floors` — gdd/14
//    §Operational chain — enforcement / raid, lot-5 TD-094). A QUALITATIVE COMPOSITE (NEVER a scalar — R2.2: the raw
//    grams_seized NEVER escapes; the player sees the band). The cutpoints map the most-recent raid's grams_seized →
//    the closed seized_amount band `NONE | LOW | MODERATE | HIGH`: LOW < 100 g (sub-cook), MODERATE 100–400 g
//    (~one-to-two M1 Tier-1 cooks), HIGH ≥ 400 g (a serious seizure). Anchored on the M1 cook yield (200 g). The
//    cutpoints are FLAT/global (presentation-only — they bucket an already-persisted figure, not a balance tunable).
//    Consumed by RealEstateProjectionService.seizedAmountBand (via raidTunables.seizedBandCutpoints). VALUES
//    VERBATIM from the previous inline constants (100/400 grams — R9.3, no recalibration in scope).
//
// ── THE REPAIR-BAND CUTPOINTS (operational.raid.repair_band_cutpoints = `composite:repair_band_floors` — gdd/14
//    §Operational chain — enforcement / raid, lot-5 TD-094). A QUALITATIVE COMPOSITE (NEVER a scalar — R2.2: the raw
//    cents NEVER escape; the player sees the band). The cutpoints map the grounded repair cost in cents → the closed
//    repair_cost band `NONE | MINOR | MODERATE | MAJOR`: MINOR < 1_000_000 c ($10k), MODERATE 1_000_000–5_000_000 c
//    ($10k–$50k), MAJOR ≥ 5_000_000 c ($50k). Anchored on the M1 wallet-bands scale. Consumed by
//    RealEstateProjectionService.repairCostBand (via raidTunables.repairBandCutpoints). VALUES VERBATIM from the
//    previous inline constants (10_000 × 100 / 50_000 × 100 cents — R9.3, no recalibration in scope).
//
// Precedence: DB-override > env > default (Phase-23 TunablesStore).

import { TunablesStore } from '../../config/tunables-store';
import type { HeatBucket } from '../../citysim/events/city-event-bus';

/** The closed raid-risk band domain (the telegraph the player reads BEFORE a raid — qualitative, never a scalar). */
export type RaidRiskBand = 'LOW' | 'ELEVATED' | 'HIGH' | 'IMMINENT';

/**
 * operational.raid.risk_band_cutpoints (= `composite:raid_risk_bands`, gdd/14 §Operational chain — enforcement / raid)
 * MATERIALIZED — the qualitative composite mapping (NOT a scalar, R2.2/R2.3): each HeatBucket → its raid_risk band
 * floor, plus the audit-pin floor. The faithful in-code mirror of the registry composite (the band derivation reads
 * THIS — never inline thresholds). Monotone: COLD<WARM<HOT<BURNING maps to LOW<ELEVATED<HIGH<IMMINENT; a present
 * audit pin floors the band at HIGH. R2.3 — the single source of the mapping is gdd/14; this is the mirror.
 */
const RAID_RISK_BAND_CUTPOINTS = {
  /** The raid_risk band floor implied by each HeatBucket (the heat-driven component of the composite). */
  byHeatBucket: ({ COLD: 'LOW', WARM: 'ELEVATED', HOT: 'HIGH', BURNING: 'IMMINENT' } as const) satisfies Record<HeatBucket, RaidRiskBand>,
  /** The raid_risk band floor a PRESENT audit pin imposes (System 7 pinned → an inspector is coming → at least HIGH). */
  auditPinFloor: 'HIGH' as RaidRiskBand,
} as const;

/**
 * operational.raid.seized_band_cutpoints (= `composite:seized_band_floors`, gdd/14 §Operational chain — enforcement /
 * raid, lot-5 TD-094) MATERIALIZED — the qualitative composite mapping (NOT a scalar, R2.2/R2.3): the grams-seized
 * floor values that bucket the most-recent raid's grams_seized → the closed seized_amount band
 * `NONE | LOW | MODERATE | HIGH`. The faithful in-code mirror of the registry composite (seizedAmountBand reads THIS
 * — never inline thresholds). VALUES VERBATIM from the previous inline constants (R9.3 — no recalibration):
 *   LOW    < 100 g  (sub-cook)                         — moderateFloorGrams (inclusive) starts MODERATE
 *   MODERATE 100–400 g  (~one-to-two M1 Tier-1 cooks) — highFloorGrams (inclusive) starts HIGH
 *   HIGH   ≥ 400 g  (a serious seizure)
 * R2.3 — the single source of the floors is gdd/14; this is the mirror.
 */
const SEIZED_BAND_CUTPOINTS = {
  /** The grams_seized floor (inclusive) at which the band becomes MODERATE (100 g — one sub-cook threshold). */
  moderateFloorGrams: 100,
  /** The grams_seized floor (inclusive) at which the band becomes HIGH (400 g — ~two M1 Tier-1 cooks). */
  highFloorGrams: 400,
} as const;

/**
 * operational.raid.repair_band_cutpoints (= `composite:repair_band_floors`, gdd/14 §Operational chain — enforcement /
 * raid, lot-5 TD-094) MATERIALIZED — the qualitative composite mapping (NOT a scalar, R2.2/R2.3): the repair-cost
 * floor values in cents that bucket the grounded repair cost → the closed repair_cost band
 * `NONE | MINOR | MODERATE | MAJOR`. The faithful in-code mirror of the registry composite (repairCostBand reads
 * THIS — never inline thresholds). VALUES VERBATIM from the previous inline constants (R9.3 — no recalibration):
 *   MINOR    < 1_000_000 c ($10k)               — moderateFloorCents (inclusive) starts MODERATE
 *   MODERATE 1_000_000–5_000_000 c ($10k–$50k)  — majorFloorCents (inclusive) starts MAJOR
 *   MAJOR   ≥ 5_000_000 c ($50k)
 * Expressed in cents (the cash_cents domain — M1 wallet-bands scale). R2.3 — the single source is gdd/14; this is
 * the mirror.
 */
const REPAIR_BAND_CUTPOINTS = {
  /** The repair cost floor in cents (inclusive) at which the band becomes MODERATE ($10k = 10_000 × 100 cents). */
  moderateFloorCents: 10_000 * 100,
  /** The repair cost floor in cents (inclusive) at which the band becomes MAJOR ($50k = 50_000 × 100 cents). */
  majorFloorCents: 50_000 * 100,
} as const;

/**
 * Resolved raid tunables. The keys this slice consumes: the SEIZURE FRACTION (T1) + the RAID-RISK-BAND CUTPOINTS (T4 —
 * the composite mapping the read-time raid_risk band reads) + the RECENTLY-RAIDED WINDOW (lot-5 TD-093 — the recency
 * bound on the recently_raided projection flag). R2.3 — NOT inline; mirrored from gdd/14.
 * DB-override > env > default (Phase-23).
 */
export const raidTunables = {
  /**
   * operational.raid.seizure_fraction — the fraction of a raided building's `product_storage.quantity_grams` seized
   * (the surviving quantity = round(quantity_grams × (1 - this))). Default 1.0 (total seizure). Env override:
   * OPERATIONAL_RAID_SEIZURE_FRACTION (test-only). The contextual modulation (CRACKDOWN / tier / district) is a
   * DEFERRED documented seam — this is the flat global base. (DB-override > env > default — Phase-23).
   */
  get seizureFraction(): number {
    return TunablesStore.resolveFloat(
      'operational.raid.seizure_fraction',
      'OPERATIONAL_RAID_SEIZURE_FRACTION',
      1.0,
    );
  },
  /**
   * operational.raid.recently_raided_window_ticks — the MINUTE-tick recency window for the `recently_raided`
   * projection flag (lot-5 TD-093, gdd/14 §Operational chain — enforcement / raid). A building's raid is "recent"
   * if `currentTick - raided_at_tick <= this`. Default 2880 = 2 in-game days (2 × clock.in_game_day_length_minutes
   * 1440) — the telegraphed post-raid danger window: a building raided ≤ 2 days ago is flagged recent so the player
   * knows to stay cautious; older raids are no longer recent (the heat trail has dissipated). Env override:
   * OPERATIONAL_RECENTLY_RAIDED_WINDOW_TICKS (test-only — shrink to a handful of ticks). [PROV-Y26Q2]
   * (DB-override > env > default — Phase-23).
   */
  get recentlyRaidedWindowTicks(): number {
    return TunablesStore.resolveInt(
      'operational.raid.recently_raided_window_ticks',
      'OPERATIONAL_RECENTLY_RAIDED_WINDOW_TICKS',
      2880,
    );
  },
  /**
   * operational.raid.risk_band_cutpoints — the qualitative composite mapping (heat band + audit pin) → the raid_risk
   * band (T4 read-time projection). A composite (no env override — it is a structural mapping, not a scalar knob).
   * Consumed by deriveRaidRiskBand() (raid-risk.ts) → the building-card projection's raid_risk band.
   */
  riskBandCutpoints: RAID_RISK_BAND_CUTPOINTS,
  /**
   * operational.raid.seized_band_cutpoints — the qualitative composite mapping (grams_seized floors) →
   * seized_amount band (lot-5 TD-094, gdd/14 §Operational chain — enforcement / raid). A composite (no env override
   * — it is a structural mapping, not a scalar knob). Consumed by RealEstateProjectionService.seizedAmountBand.
   * VALUES VERBATIM from the previous inline constants (100/400 g — R9.3, no recalibration).
   */
  seizedBandCutpoints: SEIZED_BAND_CUTPOINTS,
  /**
   * operational.raid.repair_band_cutpoints — the qualitative composite mapping (repair cost cents floors) →
   * repair_cost band (lot-5 TD-094, gdd/14 §Operational chain — enforcement / raid). A composite (no env override
   * — it is a structural mapping, not a scalar knob). Consumed by RealEstateProjectionService.repairCostBand.
   * VALUES VERBATIM from the previous inline constants (10_000×100 / 50_000×100 cents — R9.3, no recalibration).
   */
  repairBandCutpoints: REPAIR_BAND_CUTPOINTS,
};
