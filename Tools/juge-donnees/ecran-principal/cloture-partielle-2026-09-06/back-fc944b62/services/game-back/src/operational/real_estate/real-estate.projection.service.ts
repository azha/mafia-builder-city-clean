// IMPLEMENTS: docs/tech/04a_operational_systems/conversion_setup.md §Stage 3 (qualitative stage progress — "jamais
//             des pourcentages numériques exposés directement (P5 — pas de true_state)") + Inv 1/2
//             + docs/tech/01_pillars_and_vision/P5_information_asymmetry.md (R2.2 — no raw scalar to client)
//             + docs/tech/09_data_model/schema_operational_chain.md §8 (P5 projection convention)
//             -- session:2026-06-03 (Phase 2 Task 1) --
//
// `RealEstateProjectionService` — the player-facing projection for a building's operational state (the Building Card
// surface). Maps the RAW persisted fields (conversion_stage / cover_quality / structural_state + the existence of a
// building_operational_state row) → a QUALITATIVE payload: a setup-state band + a cover-quality band + an operational
// boolean + (Phase-2b) the structural-state band + a recent-raid flag + a seized-amount band. It NEVER forwards a raw
// scalar — no setup_remaining_ticks (the timer), no equipment_tier number, no price, no progress %, no raw grams. R2.2.
//
// THE BANDS (all closed qualitative domains — the only operational signal exposed):
//   - setup_state: NOT_CONVERTED (acquired, no operational state) | IN_SETUP (conversion underway — gutting/
//     installing/testing) | OPERATIONAL (setup complete). Derived from conversion_stage: 'none'/absent →
//     NOT_CONVERTED; 'operational' → OPERATIONAL; anything else (gutting/installing/testing) → IN_SETUP.
//   - cover_band: NONE (not converted) | WEAK | STANDARD | STRONG (the cover_quality enum — already qualitative).
//   - operational: a boolean (setup_state === OPERATIONAL) — the load-bearing "can this building exercise its
//     function" flag the client gates on.
//   - operational_type: the qualitative building type (a closed enum domain) — echoed for the client's Building Card
//     so it can label the building (lab/stash/front_shop/refinery/…). NOT a sim scalar. Empty string when not converted.
//   - cold_storage_capable (Phase-2b vector #2): a boolean — whether the building can host a cold chain (set at
//     conversion; refinery cold-by-nature / opt-in stash). A flag, never a raw temperature/scalar; R2.2.
//   - structural_state (Phase-2b raid/repair): OPERATIONAL | DAMAGED | REPAIRING — the qualitative band of the
//     building_operational_state.structural_state enum (DISTINCT from buildings.structural_state). The load-bearing
//     "has this building been raided / is it under repair" signal. 'operational' when no operational row yet.
//   - recently_raided (Phase-2b, lot-5 TD-093): a boolean — whether this building was raided RECENTLY (within
//     operational.raid.recently_raided_window_ticks MINUTE ticks of the current tick). A raid older than the window
//     no longer flags recently_raided (the heat trail has dissipated). A flag, never a count. [PROV-Y26Q2]
//   - seized_amount (Phase-2b): NONE | LOW | MODERATE | HIGH — a qualitative BAND of the most-recent raid's
//     grams_seized (R2.2 — NEVER the raw grams). NONE when never raided.
//   - repair_cost (Phase-2b T3): NONE | MINOR | MODERATE | MAJOR — a qualitative BAND of the cash cost to repair this
//     building, ANCHORED like the wallet bands on the M1 $ scale (NEVER the raw cents; R2.2). NONE when the building is
//     not DAMAGED (no repair to pay for); otherwise the band of the grounded repair cost (operational.repair.cost_ratio
//     × the conversion reference). It tells the player "how much will this repair sting" without ever exposing cents.
//   - raid_risk (Phase-2b T4): LOW | ELEVATED | HIGH | IMMINENT — a derived TELEGRAPH band so the player sees danger
//     BUILD before a raid (the raid is never arbitrary). A PURE read-time projection (no new persistence): derived from
//     the building's CURRENT heat band (buildings.heat → HeatBucket, REUSING the heat_propagation thresholds) + its
//     audit-pin presence (buildings.audit_pin_expires_at > now → System 7). The cutpoints live in
//     operational.raid.risk_band_cutpoints (gdd/14; deriveRaidRiskBand). R2.2: the raw heat float / the pin timestamp
//     NEVER escape — only the band. (Recent patrol observation severity is a DEFERRED third input — no clean
//     read-only per-building accessor exists; see raid-risk.ts.)
//
// R2.2 RAW-LEAK GUARANTEE: the payload contains ONLY closed-domain strings + booleans + the building uuid identity
// — NEVER setup_remaining_ticks, equipment_tier, maintenance_due_in_days, any price/cents, grams, the raw heat float,
// the audit-pin timestamp, a suspicion sigma/score, or a numeric progress. The E2E scans the payload recursively and
// rejects any unexpected raw scalar — EXCEPT the deliberately whitelisted top-level ints: `days_until_maintenance_due`
// (04f-A C2, a signed day-count) and, since C3 (D6, L0.4 forme F), `block_id`/`district_id` (identifiers — the
// district/block geography, D1 §1.4's own "hors-P5" precedent — never a sim scalar).

import { Injectable } from '@nestjs/common';

import { RealEstateRepository, type OperationalStructuralStateEnumTs } from './real-estate.repository';
import { RaidRepository } from '../enforcement/raid.repository';
import { raidTunables } from '../enforcement/raid-tunables';
import { repairCostCents } from '../enforcement/repair-tunables';
import { deriveRaidRiskBand, type RaidRiskBand } from '../enforcement/raid-risk';
import { DistributionProjectionService, type RosterBand } from '../distribution/distribution.projection.service';
// 04f-A C2 (D1/R2.2) — the pure D1 derivation (days_overdue/phase) + the SAME game-day derivation the D1
// anchor uses (deriveGameDay).
import { MaintenancePhaseService, type LapsePhase } from '../maintenance/maintenance-phase.service';
import { citySimTunables } from '../../citysim/citysim-tunables';
import { deriveGameDay } from '../political/political-trigger-evaluators';
import { nomDeDistrict } from '../../citysim/world/district-names';
import {
  MoneyHoldingProjectionService,
  NEUTRAL_MONEY_HOLDING_BANDS,
  type CapacityBand,
  type ForfeitureBand,
  type HeldBand,
  type MoneyHoldingTierBand,
  type YieldBand,
} from '../money_holding/money-holding.projection.service';
import type { I18nRef } from '../../common/i18n-ref'; // C3 (D7) — name_i18n's type.
import { buildingNameRef, buildingTypeFromRawInt, rankByTypeAndBlock } from '../../common/fiction-names'; // C3 (D7)

/** Re-exported for the building-card consumers (the qualitative roster band — Phase-4 vector #4 T6; see RosterBand). */
export type { RosterBand };

/** Re-exported for the building-card consumers (the money_holding bands — Phase-5 vector #5a T6). */
export type { MoneyHoldingTierBand, HeldBand, CapacityBand, YieldBand, ForfeitureBand };

/** The qualitative setup-state band (the only setup signal exposed — never the raw setup_remaining_ticks timer). */
export type SetupStateBand = 'NOT_CONVERTED' | 'IN_SETUP' | 'OPERATIONAL';

/** The qualitative cover band (the cover_quality enum, surfaced as a band; NONE when not converted). */
export type CoverBand = 'NONE' | 'WEAK' | 'STANDARD' | 'STRONG';

/**
 * The qualitative structural-state band (Phase-2b raid/repair — building_operational_state.structural_state
 * enum). ⛔ W3.U2 C2 (D5-bis) — `FAILED` added: the enum has a 4th member (`failed`, written in production
 * by `maintenance.repository.ts:475`, the equipment-failure surface) that `structuralStateBand` used to
 * swallow into `OPERATIONAL` via a `default` branch — see that method's header comment.
 */
export type StructuralStateBand = 'OPERATIONAL' | 'DAMAGED' | 'REPAIRING' | 'FAILED';

/** The qualitative seized-amount band (the most-recent raid's grams_seized as a band — NEVER raw grams; R2.2). */
export type SeizedAmountBand = 'NONE' | 'LOW' | 'MODERATE' | 'HIGH';

/** The qualitative repair-cost band (the cash cost to repair a DAMAGED building as a band — NEVER raw cents; R2.2). */
export type RepairCostBand = 'NONE' | 'MINOR' | 'MODERATE' | 'MAJOR';

/**
 * The qualitative lab-tier band (Phase-2c vector #2c — Ash; the specialized_lab.lab_tier lever as a band — NEVER the raw
 * int; R2.2). A specialized_lab's tier (1..max_tier) is surfaced as a closed qualitative domain so the player sees the
 * lab's STANDING without ever reading the raw integer. NONE = not a specialized_lab (no tier lever to surface). The
 * tier→band mapping is a presentation-only bucketing (not a balance tunable — it buckets the already-persisted lab_tier):
 * 1 → BASIC, 2 → REFINED, ≥3 → MASTER (a higher tier yields purer Ash batches — the AshPurityService lab-tier lever).
 */
export type LabTierBand = 'NONE' | 'BASIC' | 'REFINED' | 'MASTER';

/**
 * 04f-A C2 (D1/D14/R2.2) — the qualitative D1 lapse-phase bucket (the `LapsePhaseBucket` composite the design
 * names — distinct from the internal `LapsePhase` pgEnum literal): WITHIN_WINDOW / SOFT / HARD / CRITICAL.
 * NEVER the raw days_overdue / output multiplier / failure probability (R2.2 — D14 grep-zero player-facing).
 * Every OPERATIONAL building has one; a not-yet-operational building projects WITHIN_WINDOW (the neutral
 * default — the SAME convention lab_tier_band/hub_tier_band use for a non-applicable building, "no lapse yet").
 */
export type LapsePhaseBucket = 'WITHIN_WINDOW' | 'SOFT' | 'HARD' | 'CRITICAL';

/**
 * The qualitative hub-tier band (Phase-4 vector #4 — distribution_hub; the building_operational_state.hub_tier lever as
 * a band — NEVER the raw int; R2.2). A distribution_hub's tier (1..max_tier) is surfaced as a closed qualitative domain
 * so the player sees the hub's STANDING (which scales the courier roster cap) without ever reading the raw integer. NONE
 * = not a distribution_hub (no tier lever to surface). The tier→band mapping is a presentation-only bucketing (not a
 * balance tunable — it buckets the already-persisted hub_tier): 1 → SMALL, 2 → MEDIUM, 3 → LARGE, 4 → MAJOR, ≥5 → MAX
 * (the cap at distribution.hub_max_tier 5 — a higher tier ⇒ a larger courier roster cap, the HubRosterService lever).
 */
export type HubTierBand = 'NONE' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'MAJOR' | 'MAX';

/** The PLAYER-FACING per-building operational projection (the Building Card surface — qualitative bands only). */
export interface BuildingOperationalProjection {
  /** The building identity (a uuid string — echoed for the client's Building Card; NOT a sim scalar). */
  building: string;
  /**
   * C3 (D6, L0.4 forme F — back.md's own "où est-il ?") — the block this building sits on. An
   * IDENTIFIER, not a sim scalar (D1 §1.4 precedent — geography ints are hors-P5); `real-estate.
   * repository.ts` already read it internally, it was simply never projected. Lets the client answer
   * "where is this building" without a 2nd round-trip.
   */
  block_id: number;
  /** C3 (D6, L0.4 forme F) — the district `block_id` belongs to (same "où est-il ?" fix, same identifier
   *  status as `block_id`). Already read internally (`RealEstateRepository.getBuildingOperationalState`'s
   *  own `blocks` JOIN) — simply never projected. */
  district_id: number;
  /**
   * C3 (D7, L0.5) — the derived fiction name (buildings have no `name` column, D7's own measured state):
   * `buildingNameRef({ building_type, district_id, block_id, rank })` — an ICU `select` gabarit on
   * `type`, resolved client-side. `rank` is the 1-based ordinal intra (player, building_type, block_id),
   * via `rankByTypeAndBlock` (fiction-names.ts) — computed from `listBuildingsForRanking`'s OWN read,
   * never from this row alone (ranking requires knowing this building's siblings).
   */
  name_i18n: I18nRef;
  /** The qualitative setup-state band (NOT_CONVERTED / IN_SETUP / OPERATIONAL — never the raw timer; R2.2). */
  setup_state: SetupStateBand;
  /** The qualitative cover band (NONE / WEAK / STANDARD / STRONG — the cover_quality enum as a band). */
  cover_band: CoverBand;
  /** Whether the building's conversion is complete (setup_state === OPERATIONAL) — the function-enable flag. */
  operational: boolean;
  /** The qualitative operational type (closed enum domain — lab/stash/front_shop/refinery/… ; '' when not converted). */
  operational_type: string;
  /**
   * Phase-2b vector #2 — whether this building can host a cold chain (building_operational_state.cold_storage_capable,
   * set at conversion). A boolean flag (already qualitative — NOT a raw scalar; R2.2), so the client's Building Card
   * knows whether the building keeps a cold-chain substance (Crick) OPTIMAL_COLD. false when not converted / ordinary.
   */
  cold_storage_capable: boolean;
  /** The qualitative structural-state band (Phase-2b — OPERATIONAL / DAMAGED / REPAIRING; never the raw enum/timer). */
  structural_state: StructuralStateBand;
  /**
   * Whether this building was raided recently — within `operational.raid.recently_raided_window_ticks` MINUTE ticks
   * of the current tick (lot-5 TD-093, gdd/14, R2.3). A building raided long ago (beyond the window) returns false;
   * a freshly-raided building returns true. A flag, never a count. False when never raided.
   */
  recently_raided: boolean;
  /** The qualitative seized-amount band of the latest raid (NONE when never raided; NEVER the raw grams; R2.2). */
  seized_amount: SeizedAmountBand;
  /** The qualitative repair-cost band (NONE when not DAMAGED; the grounded repair cost as a band — NEVER cents; R2.2). */
  repair_cost: RepairCostBand;
  /**
   * Phase-2c vector #2c (Ash — T5) — the qualitative lab-tier band of a specialized_lab (NONE / BASIC / REFINED /
   * MASTER). The specialized_lab.lab_tier lever as a closed band — NEVER the raw int (R2.2). NONE for any non-specialized
   * _lab building (no tier lever). It tells the player the lab's STANDING (a higher band → purer Ash batches) without
   * ever exposing the raw tier integer.
   */
  lab_tier_band: LabTierBand;
  /**
   * Phase-4 vector #4 (distribution_hub — T2) — the qualitative hub-tier band of a distribution_hub (NONE / SMALL /
   * MEDIUM / LARGE / MAJOR / MAX). The building_operational_state.hub_tier lever as a closed band — NEVER the raw int
   * (R2.2). NONE for any non-distribution_hub building (no tier lever). It tells the player the hub's STANDING (a higher
   * band → a larger courier roster cap — the HubRosterService lever, T3) without ever exposing the raw tier integer.
   */
  hub_tier_band: HubTierBand;
  /**
   * Phase-4 vector #4 (distribution_hub — T6) — the qualitative ROSTER band: the player's courier-roster occupancy
   * (their in-transit shipment count vs the hub-scaled concurrency cap) as a closed band (OPEN / BUSY / FULL — NEVER
   * the raw count nor the raw cap; R2.2). NONE for any non-distribution_hub building (the roster band is meaningful only
   * on a hub card — the SAME neutral-NONE convention hub_tier_band uses for a non-hub building). It tells the player how
   * much of their concurrent-shipment capacity is in use (FULL ⇒ a further dispatch is refused 409 OVER_CAPACITY, T4).
   */
  roster_band: RosterBand;
  /**
   * Phase-4 vector #4 (distribution_hub — T6) — the unlocked VEHICLE set as CATEGORICAL labels (e.g. ['FOOT','BIKE',
   * 'CAR'] on a hub card; ['FOOT'] otherwise). R2.2-safe — these are vehicle-mode NAMES (uppercase, matching the courier
   * projection's vehicle_type convention), NEVER raw speeds. An operational distribution_hub unlocks the wheeled modes
   * (lever B — T5); a player with no operational hub can only walk (['FOOT']). On a non-hub card it is the neutral foot-
   * only set (foot is always available), since the unlocked set is a player-wide capability surfaced on the hub card.
   */
  available_vehicles: string[];
  /**
   * Phase-5 vector #5a (money_holding — T6) — the qualitative money_holding_tier band (NONE / SMALL / MEDIUM / LARGE /
   * MAJOR / MAX). The money_holding.money_holding_tier lever as a closed band — NEVER the raw int (R2.2). NONE for any
   * non-money_holding building (no tier lever). The BYTE-MIRROR of hub_tier_band / lab_tier_band; a higher band ⇒ a
   * larger deposit capacity (the capacityCentsForTier lever).
   */
  money_holding_tier_band: MoneyHoldingTierBand;
  /**
   * Phase-5 vector #5a (money_holding — T6) — the qualitative HELD-magnitude band (NONE / LOW / MODERATE / HIGH /
   * MASSIVE) of the EFFECTIVE held clean cash (held_cents + the live-accrued yield, read-only). NEVER the raw cents
   * (R2.2). NONE for a non-money_holding building / an empty holding. It tells the player how much clean cash the vault
   * is sitting on (a MASSIVE hold is what the audit-forfeiture eyes) without ever exposing the cents.
   */
  held_band: HeldBand;
  /**
   * Phase-5 vector #5a (money_holding — T6) — the qualitative CAPACITY fill band (NONE / OPEN / BUSY / FULL): the
   * EFFECTIVE held vs the tier capacity. NEVER the raw held/cap (R2.2). The BYTE-MIRROR of the distribution_hub
   * roster_band semantics — FULL ⇒ a further deposit is refused 409 OVER_CAPACITY (T3). NONE for a non-money_holding card.
   */
  capacity_band: CapacityBand;
  /**
   * Phase-5 vector #5a (money_holding — T6) — the qualitative YIELD band (NONE / IDLE / EARNING). IDLE when nothing is
   * held; EARNING when the holding accrues the passive yield. NEVER the raw rate / accrued cents (R2.2). NONE for a
   * non-money_holding card.
   */
  yield_band: YieldBand;
  /**
   * Phase-5 vector #5a (money_holding — T6) — the qualitative FORFEITURE telegraph band (NONE / PENDING / IMMINENT). It
   * telegraphs the value-driven audit-forfeiture (T5b) so the player can react: NONE when none armed; PENDING when armed
   * with the deadline comfortably ahead; IMMINENT when the deadline is near/at/past now. NEVER the raw
   * forfeiture_scheduled_at_tick / the current tick (R2.2). NONE for a non-money_holding card.
   */
  forfeiture_band: ForfeitureBand;
  /**
   * The derived TELEGRAPHED raid-risk band (Phase-2b T4 — LOW / ELEVATED / HIGH / IMMINENT). A PURE read-time
   * projection from the building's current heat band + audit-pin presence (NEVER the raw heat float / pin timestamp /
   * any suspicion scalar; R2.2). It surfaces the danger the player already half-sees so the raid reads as earned.
   */
  raid_risk: RaidRiskBand;
  /**
   * 04f-A C2 (D1/D14) — the qualitative D1 lapse-phase bucket (WITHIN_WINDOW/SOFT/HARD/CRITICAL). NEVER the raw
   * days_overdue / output multiplier / failure probability (R2.2 — D14 grep-zero). WITHIN_WINDOW for a
   * not-yet-operational building (no lapse to surface).
   */
  lapse_phase_bucket: LapsePhaseBucket;
  /**
   * 04f-A C2 (D1/D14) — the SIGNED days until the per-building maintenance due date (negative = overdue). The
   * ONLY numeric maintenance signal exposed (R2.2 — the raw output multiplier / failure probability / heat
   * additive NEVER escape). 0 for a not-yet-operational building (no due date yet).
   */
  days_until_maintenance_due: number;
  /**
   * 04f-A C2 (D13/D14) — whether a scheduled-maintenance job is CURRENTLY armed on this building (D13:
   * scheduling ≠ halt — the building keeps operating while true). NEVER the raw completion game-day (R2.2).
   * false for a not-yet-operational building.
   */
  maintenance_in_progress: boolean;
}

// The seized-amount band cutpoints + repair-cost band cutpoints were previously inline constants here. They have been
// externalized to gdd/14 §Operational chain — enforcement / raid as `operational.raid.seized_band_cutpoints` and
// `operational.raid.repair_band_cutpoints` (lot-5 TD-094 — R2.3 parity with `risk_band_cutpoints`). The canonical
// homes are now `raidTunables.seizedBandCutpoints` and `raidTunables.repairBandCutpoints` (raid-tunables.ts), which
// this projection consumes. VALUES ARE VERBATIM (100/400 g, 10_000×100/50_000×100 cents — R9.3, no recalibration).

@Injectable()
export class RealEstateProjectionService {
  constructor(
    private readonly repo: RealEstateRepository,
    private readonly raidRepo: RaidRepository,
    // Phase-4 vector #4 (distribution_hub — T6) — DistributionModule EXPORTS this; the building-card projection calls
    // hubDispatchBands(playerId) for a distribution_hub card's roster_band + available_vehicles (R2.2 — qualitative
    // bands only). Clean one-way import (DistributionModule does not import RealEstateModule → no cycle).
    private readonly distributionProjection: DistributionProjectionService,
    // Phase-5 vector #5a (money_holding — T6) — MoneyHoldingModule EXPORTS this; the building-card projection calls
    // moneyHoldingBands(playerId, buildingId) for a money_holding card's tier/held/capacity/yield/forfeiture bands
    // (R2.2 — qualitative bands only). The SAME clean one-way import (MoneyHoldingModule does not import RealEstateModule
    // → no cycle).
    private readonly moneyHoldingProjection: MoneyHoldingProjectionService,
    // 04f-A C2 (D1/R2.2) — MaintenanceModule EXPORTS this; the building-card projection calls the pure
    // deriveLapsePhase/deriveDaysUntilDue derivations for the LapsePhaseBucket + days_until_maintenance_due
    // fields. The SAME clean one-way import (MaintenanceModule does not import RealEstateModule → no cycle).
    private readonly maintenancePhase: MaintenancePhaseService,
  ) {}

  /**
   * Project a player's building operational state → a fully-qualitative payload. Reads the building + its operational
   * row from the repository (the raw conversion_stage / cover_quality are the INPUT but are mapped to BANDS — the raw
   * setup_remaining_ticks / equipment_tier are NEVER even read here; R2.2). The Phase-2b raid surface reads the latest
   * building_raid row (the recent-raid flag + the seized-amount band — never the raw grams). Returns null when the
   * building is not the player's / does not exist (the controller maps that to a 404).
   */
  async projectBuilding(playerId: string, buildingId: string): Promise<BuildingOperationalProjection | null> {
    const state = await this.repo.getBuildingOperationalState(playerId, buildingId);
    if (!state) return null;

    const [latestRaid, currentTick, rankingRows] = await Promise.all([
      this.raidRepo.getLatestRaidForBuilding(playerId, buildingId),
      this.raidRepo.getCurrentTick(playerId),
      // C3 (D7) — ALL the player's non-demolished buildings in THIS district, so `rankByTypeAndBlock` sees
      // every sibling of the SAME (type, block) partition (ranking one row alone is impossible — it needs
      // to know where it falls among its siblings).
      this.repo.listBuildingsForRanking(playerId, state.district_id),
    ]);
    // r1-C3/M1 — the comment this replaced declared `state.building_id` "always present" in
    // `rankingRows`; it is not. `getBuildingOperationalState` (above) does NOT filter `structural_state`,
    // but `listBuildingsForRanking` excludes `demolished` (real-estate.repository.ts, `ne(structural_state,
    // 'demolished')`) — and `demolished` is reachable in production (two writers:
    // `equipment-failure-exception.repository.ts`, `decommission.repository.ts`'s player-facing route),
    // the row is never deleted (`db/schema/city_state.ts`'s own comment: kept post-decommission). A
    // demolished building therefore falls OUT of `rankingRows` while still being readable HERE — the
    // lookup misses, and `?? 1` used to paper over that with the single most PLAUSIBLE wrong value (every
    // real scenario's rank 1 looks identical to this one). `0` is never a real rank (1-based) — an
    // observable sentinel, not a guess — the falsifiable for this fallback asserts `params.rank === '0'`
    // on a demolished building, which a regression back to `?? 1` would silently satisfy as '1' instead.
    const rank = rankByTypeAndBlock(rankingRows).get(buildingId) ?? 0;
    const setupState = this.setupStateBand(state.conversion_stage);
    const structuralState = this.structuralStateBand(state.op_structural_state);
    // 04f-A C2 (D1) — the D1 derivation, REUSING the SAME currentTick already fetched above (no extra DB
    // round-trip). null anchor (no operational row yet) → deriveDaysOverdue/deriveDaysUntilDue's own
    // null-safe defaults (0 overdue / maintenanceDueInDays until-due) — the neutral within_window reading.
    const currentGameDay = deriveGameDay(currentTick, citySimTunables.inGameDayLengthMinutes);
    const daysOverdue = this.maintenancePhase.deriveDaysOverdue(
      currentGameDay,
      state.last_maintained_at_game_day,
      state.maintenance_due_in_days,
    );
    const lapsePhase = this.maintenancePhase.deriveLapsePhase(daysOverdue);
    // Phase-4 vector #4 (distribution_hub — T6) — the hub-dispatch bands (roster occupancy + unlocked vehicle set) are
    // MEANINGFUL only on a distribution_hub card; compute them ONLY for a distribution_hub (the hubDispatchBands reads
    // are player-wide, so skipping them for a non-hub avoids a needless DB round-trip). A non-hub card surfaces the
    // neutral default — roster_band NONE + the foot-only set — the SAME neutral convention hub_tier_band uses (NONE).
    const hubBands =
      state.operational_type === 'distribution_hub'
        ? await this.distributionProjection.hubDispatchBands(playerId)
        : { roster_band: 'NONE' as RosterBand, available_vehicles: ['FOOT'] };
    // Phase-5 vector #5a (money_holding — T6) — the money_holding bands (tier/held/capacity/yield/forfeiture) are
    // MEANINGFUL only on a money_holding card; compute them ONLY for a money_holding (so a non-money_holding card avoids
    // a needless DB round-trip). A non-money_holding card surfaces the neutral NONE defaults — the SAME neutral
    // convention hub_tier_band / roster_band use. The bands read the money_holding row for THIS building (the tier lives
    // on the dedicated money_holding table, NOT building_operational_state).
    const moneyHoldingBands =
      state.operational_type === 'money_holding'
        ? await this.moneyHoldingProjection.moneyHoldingBands(playerId, buildingId)
        : NEUTRAL_MONEY_HOLDING_BANDS;
    return {
      building: state.building_id,
      // C3 (D6, L0.4 forme F) — the "où est-il ?" fix: already-read raw identifiers, simply not projected before.
      block_id: state.block_id,
      district_id: state.district_id,
      // C3 (D7, L0.5) — the derived fiction name.
      name_i18n: buildingNameRef({
        building_type: buildingTypeFromRawInt(state.building_type),
        district_id: state.district_id,
        district_name: nomDeDistrict(state.district_id), // P4 item 2
        block_id: state.block_id,
        rank,
        building_id: state.building_id, // P4 item 3 — l'enseigne
      }),
      setup_state: setupState,
      cover_band: this.coverBand(state.cover_quality, setupState),
      operational: setupState === 'OPERATIONAL',
      operational_type: state.operational_type, // already a closed enum domain ('' if not converted).
      // Phase-2b vector #2 — the cold-storage capability flag (a boolean — already qualitative, safe to forward; R2.2).
      cold_storage_capable: state.cold_storage_capable,
      structural_state: structuralState,
      // lot-5 TD-093: recently_raided is time-bound by operational.raid.recently_raided_window_ticks (gdd/14, R2.3).
      // A raid is "recent" only if currentTick − raided_at_tick ≤ window. A raid older than the window is NOT recent.
      // The currentTick + raided_at_tick are INTERNAL inputs — NEVER forwarded raw (R2.2); only the boolean escapes.
      recently_raided:
        latestRaid !== null &&
        currentTick - latestRaid.raided_at_tick <= raidTunables.recentlyRaidedWindowTicks,
      seized_amount: this.seizedAmountBand(latestRaid?.grams_seized ?? null),
      repair_cost: this.repairCostBand(structuralState),
      // Phase-2c vector #2c (Ash — T5) — the specialized_lab lab-tier band (R2.2 — the raw lab_tier int never escapes;
      // NONE for any non-specialized_lab building). The raw int is the INPUT but is mapped to the closed band here.
      lab_tier_band: this.labTierBand(state.operational_type, state.lab_tier),
      // Phase-4 vector #4 (distribution_hub — T2) — the distribution_hub hub-tier band (R2.2 — the raw hub_tier int
      // never escapes; NONE for any non-distribution_hub building). The raw int is the INPUT but is mapped to the closed
      // band here.
      hub_tier_band: this.hubTierBand(state.operational_type, state.hub_tier),
      // Phase-4 vector #4 (distribution_hub — T6) — the qualitative roster occupancy band + the unlocked vehicle set
      // (R2.2 — the raw in-transit count / cap / vehicle speed NEVER escape; only the band + categorical labels). For a
      // non-distribution_hub building these are the neutral default (NONE / foot-only) computed above.
      roster_band: hubBands.roster_band,
      available_vehicles: hubBands.available_vehicles,
      // Phase-5 vector #5a (money_holding — T6) — the money_holding bands (R2.2 — the raw held_cents / tier int / yield
      // rate / tick / forfeiture_scheduled_at_tick NEVER escape; only the closed bands). For a non-money_holding
      // building these are the neutral NONE defaults computed above.
      money_holding_tier_band: moneyHoldingBands.money_holding_tier_band,
      held_band: moneyHoldingBands.held_band,
      capacity_band: moneyHoldingBands.capacity_band,
      yield_band: moneyHoldingBands.yield_band,
      forfeiture_band: moneyHoldingBands.forfeiture_band,
      // The TELEGRAPHED raid-risk band (Phase-2b T4) — a PURE read-time derivation from the building's CURRENT heat
      // band + audit-pin presence (both directly on the buildings row; R2.2 — the raw heat float / pin timestamp are
      // the INPUT but never escape, only the band). Cutpoints from operational.raid.risk_band_cutpoints (gdd/14).
      raid_risk: deriveRaidRiskBand({ heat: state.heat, auditPinned: state.audit_pinned }),
      // 04f-A C2 (D1/D14) — the qualitative lapse-phase bucket + the SIGNED days-until-due + the armed-job flag
      // (R2.2 — the raw days_overdue / output multiplier / failure probability NEVER escape; only the bucket +
      // the ONE whitelisted int + the boolean).
      lapse_phase_bucket: this.lapsePhaseBucket(lapsePhase),
      days_until_maintenance_due: this.maintenancePhase.deriveDaysUntilDue(
        currentGameDay,
        state.last_maintained_at_game_day,
        state.maintenance_due_in_days,
      ),
      maintenance_in_progress: state.maintenance_completes_at_day !== null,
    };
  }

  /**
   * Map the building's structural-state band → the qualitative repair-cost band (Phase-2b T3; R2.2 — the raw cents
   * NEVER escape). Only a DAMAGED building has a repair to pay for → NONE for any other state (operational/repairing —
   * no fresh repair cost surfaced). When DAMAGED, the grounded repair cost (operational.repair.cost_ratio × the
   * conversion reference — repairCostCents) is bucketed into the closed band by the cutpoints from
   * operational.raid.repair_band_cutpoints (gdd/14, lot-5 TD-094 — R2.3). The cost is a fixed deterministic value at
   * the shipped tunables, so a DAMAGED building's band is stable.
   */
  private repairCostBand(structuralState: StructuralStateBand): RepairCostBand {
    if (structuralState !== 'DAMAGED') return 'NONE';
    const costCents = Number(repairCostCents());
    const { majorFloorCents, moderateFloorCents } = raidTunables.repairBandCutpoints;
    if (costCents >= majorFloorCents) return 'MAJOR';
    if (costCents >= moderateFloorCents) return 'MODERATE';
    return 'MINOR';
  }

  /**
   * Map a specialized_lab's raw lab_tier int → the qualitative lab-tier band (Phase-2c vector #2c — Ash; R2.2 — the raw
   * int NEVER escapes). Only a specialized_lab has a lab_tier lever → NONE for any other operational type (no tier to
   * surface). For a specialized_lab the band buckets the tier: 1 → BASIC, 2 → REFINED, ≥3 → MASTER (the cap at the
   * shipped max_tier 3). A higher band means a purer-batch lab (the AshPurityService lab-tier lever). Presentation-only
   * (not a balance tunable — it buckets the already-persisted lab_tier).
   */
  private labTierBand(operationalType: string, labTier: number): LabTierBand {
    if (operationalType !== 'specialized_lab') return 'NONE'; // no lab-tier lever on a non-specialized_lab.
    if (labTier >= 3) return 'MASTER';
    if (labTier === 2) return 'REFINED';
    return 'BASIC'; // tier 1 (the build default) and any defensive lower value.
  }

  /**
   * Map a distribution_hub's raw hub_tier int → the qualitative hub-tier band (Phase-4 vector #4 — distribution_hub;
   * R2.2 — the raw int NEVER escapes). Only a distribution_hub has a hub_tier lever → NONE for any other operational
   * type (no tier to surface) — the SAME convention labTierBand uses for a non-specialized_lab, so a non-hub building's
   * projection is byte-identical. For a distribution_hub the band buckets the tier: 1 → SMALL, 2 → MEDIUM, 3 → LARGE,
   * 4 → MAJOR, ≥5 → MAX (the cap at distribution.hub_max_tier 5). A higher band means a larger courier roster cap (the
   * HubRosterService hub-tier lever, T3). Presentation-only (not a balance tunable — it buckets the already-persisted
   * hub_tier).
   */
  private hubTierBand(operationalType: string, hubTier: number): HubTierBand {
    if (operationalType !== 'distribution_hub') return 'NONE'; // no hub-tier lever on a non-distribution_hub.
    if (hubTier >= 5) return 'MAX';
    if (hubTier === 4) return 'MAJOR';
    if (hubTier === 3) return 'LARGE';
    if (hubTier === 2) return 'MEDIUM';
    return 'SMALL'; // tier 1 (the build default) and any defensive lower value.
  }

  /**
   * Map the raw building_operational_state.structural_state enum → the qualitative band (Phase-2b raid/repair). The
   * enum is ALREADY a closed qualitative domain (operational|damaged|repairing|failed) — uppercased for the band
   * convention. 'operational' when the building has no operational row yet — the repository coalesces the absent
   * LEFT JOIN row to 'operational' BEFORE this method ever sees it (real-estate.repository.ts), so there is no
   * "absent value" case left to default on here.
   *
   * ⛔ W3.U2 C2 (D5-bis) — defect fixed: this switch used to fall through a `default: return 'OPERATIONAL'`, which
   * silently swallowed the enum's 4th member (`failed`, written in production by
   * `maintenance.repository.ts:475` — the equipment-failure surface) into the SAME band as a genuinely healthy
   * building. `structuralState` is now the CLOSED union (`OperationalStructuralStateEnumTs`, not `string`) and the
   * switch is EXHAUSTIVE with NO `default` — a 5th enum member is a compile error here, not a silent band (the
   * SAME discipline D2 applies to `shell_state`/`condition_band` in the district-interior resolvers).
   */
  private structuralStateBand(structuralState: OperationalStructuralStateEnumTs): StructuralStateBand {
    switch (structuralState) {
      case 'operational':
        return 'OPERATIONAL';
      case 'damaged':
        return 'DAMAGED';
      case 'repairing':
        return 'REPAIRING';
      case 'failed':
        return 'FAILED';
    }
  }

  /**
   * 04f-A C2 (D1/D14) — map the internal `LapsePhase` (the `building_lapse_phase` pgEnum literal, lowercase) →
   * the player-facing `LapsePhaseBucket` (uppercase — R2.2 band convention, the SAME uppercasing
   * `structuralStateBand` applies).
   */
  private lapsePhaseBucket(phase: LapsePhase): LapsePhaseBucket {
    switch (phase) {
      case 'soft':
        return 'SOFT';
      case 'hard':
        return 'HARD';
      case 'critical':
        return 'CRITICAL';
      default:
        return 'WITHIN_WINDOW';
    }
  }

  /**
   * Map the latest raid's grams_seized → the qualitative seized-amount band (R2.2 — the raw grams NEVER escape). null
   * (never raided) → NONE. The cutpoints are anchored on the M1 200 g cook yield; they live in
   * operational.raid.seized_band_cutpoints (gdd/14, lot-5 TD-094 — R2.3).
   */
  private seizedAmountBand(gramsSeized: number | null): SeizedAmountBand {
    if (gramsSeized === null) return 'NONE';
    const { highFloorGrams, moderateFloorGrams } = raidTunables.seizedBandCutpoints;
    if (gramsSeized >= highFloorGrams) return 'HIGH';
    if (gramsSeized >= moderateFloorGrams) return 'MODERATE';
    return 'LOW';
  }

  /**
   * Map the raw conversion_stage enum → the qualitative setup-state band (R2.2). 'none'/absent → NOT_CONVERTED;
   * 'operational' → OPERATIONAL; any intra-setup stage (gutting/installing/testing) → IN_SETUP. The intra-setup
   * granularity is intentionally collapsed to a single IN_SETUP band — the player sees "under setup", never a
   * numeric progress (conversion_setup.md §Stage 3).
   */
  private setupStateBand(conversionStage: string): SetupStateBand {
    if (conversionStage === 'operational') return 'OPERATIONAL';
    if (conversionStage === 'none' || conversionStage === '') return 'NOT_CONVERTED';
    return 'IN_SETUP'; // gutting / installing / testing.
  }

  /** Map the raw cover_quality enum → the qualitative cover band (NONE when the building is not yet converted). */
  private coverBand(coverQuality: string, setupState: SetupStateBand): CoverBand {
    if (setupState === 'NOT_CONVERTED') return 'NONE';
    switch (coverQuality) {
      case 'weak':
        return 'WEAK';
      case 'standard':
        return 'STANDARD';
      case 'strong':
        return 'STRONG';
      default:
        return 'NONE';
    }
  }
}
