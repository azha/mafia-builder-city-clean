// IMPLEMENTS: docs/tech/04a_operational_systems/distribution_couriers_runners.md §Pillar checklist (R4.3) — "aucun
//             scalar … reputation_bucket du courier = bucket transitions, jamais float (R2.2)" + §Implications par
//             couche / Unity ("Couriers list panel : colonnes qualitatives … current_state … filtres par état idle
//             vs in_transit") + docs/tech/01_pillars_and_vision/P5_information_asymmetry.md (R2.2 — no raw scalar to
//             client) + docs/tech/09_data_model/schema_operational_chain.md §8 (P5 projection convention)
//             -- session:2026-06-03 (Phase 2 Task 4) --
//             -- session:2026-06-21 (System 9 §9 Detection & Consequence C11 — R2.2 projection) --
//
// `DistributionProjectionService` — the player-facing projection for the player's foot couriers (the Distribution
// surface). Maps the RAW persisted fields (courier.current_state + the active courier_shift.status) → a QUALITATIVE
// courier-state BAND. It NEVER forwards a raw scalar — no path_blocks / block ids / coordinates, no cargo grams, no
// current_segment_index, no started_at_tick / transit ticks. R2.2.
//
// THE BAND (closed qualitative domain — the only courier signal exposed):
//   - transit_band: IDLE (no active trip — courier idle / never dispatched) | IN_TRANSIT (walking a route) | ARRIVED
//     (reached the destination — cargo delivered). Derived from the courier_state enum + the active shift_status by a
//     fixed mapping (a PRESENTATION bucketing — like T1's setup-state band; NOT a sim tunable, only the closed-domain
//     band label is exposed). caught / compromised map to a terminal-ish band but M1 produces neither (no detection
//     roll — they collapse to the courier's own state via the default).
//
// C11 (System 9 §9 Detection & Consequence — R2.2 projection):
//   - `DetectionRiskBucket`: the player-facing detection risk band derived from `patrol_heat` via the
//     `patrol_heat_elevated_band` / `patrol_heat_critical_band` registry getters (OQ-22). NEVER the raw
//     `patrol_heat` / detection probability. 'silent' | 'elevated' | 'critical' (closed domain, canon :301).
//   - `CourierReputationBucket`: REUSE the C7 `reputationBucket(sessions_active)` helper (canon :303).
//     'rookie' | 'seasoned' | 'expert' (closed domain). Never the raw `sessions_active` integer.
//   - `caught_state`: derived from `caught_exception.status` (or 'none' if no pending exception).
//     `CaughtExceptionStatus | 'none'`. Never the raw exception row.
//
// P5 WALL: the `CourierStateProjection` return type has EXACTLY these 3 new fields — none of which carry
//   a raw scalar (patrol_heat / detection_prob / leak_magnitude / sessions_active). The TypeScript type
//   enforces the wall at compile time.
//
// Bucket threshold anchors (OQ-22 — DetectionRisk band cuts are registry rows, not presentation-only):
//   - `patrolHeatBandElevated` (`distribution.patrol_heat_elevated_band`) → sourced via getter (default 0.33).
//   - `patrolHeatBandCritical` (`distribution.patrol_heat_critical_band`) → sourced via getter (default 0.66).
//   - Reputation thresholds: REUSE `reputationThresholdSeasoned` (10) / `reputationThresholdExpert` (40) via
//     `CourierDetectionService.reputationBucket()` (C7 — no duplication; single source of truth).
//
// R2.2 RAW-LEAK GUARANTEE: each courier payload contains ONLY closed-domain strings + the courier uuid identity —
// NEVER coordinates / block ids / cargo grams / the segment index / the transit tick clock. The E2E scans the payload
// recursively and rejects any unexpected raw scalar.

import { Injectable, Inject } from '@nestjs/common';
import { and, eq, gt } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { caughtException, courier, courierShift, route, vehicleInventory } from '../../db/schema/operational_chain';
import type { CaughtExceptionStatus } from '../../db/schema/operational_chain';
import { DistributionRepository } from './distribution.repository';
import { HubRosterService } from './hub-roster.service';
import { ColdChainService, type TemperatureStatus } from '../coldchain/cold-chain.service';
import { CourierDetectionService } from './courier-detection.service';
import type { CourierReputationBucket } from './courier-detection.service';
import { distributionDetectionTunables, distributionAutomationHubsTunables } from './distribution-tunables';
import { RouteFinderService } from './route-finder.service';
import { LieutenantRepository } from '../lieutenant/lieutenant.repository';
import type { CompiledScript } from '../../dsl/ir';

// Re-export CourierReputationBucket so callers can import from this projection module
export type { CourierReputationBucket } from './courier-detection.service';
// Re-export SinuosityBucket so C13+ consumers can import from this projection module (C5)
export type { SinuosityBucket } from './route-finder.service';

// ── C13: RiverCrossingsBucket + RouteLifecycleBands ──────────────────────────────────────────────

/**
 * `RiverCrossingsBucket` — the player-facing river-crossings band (C13, R2.2, P5 wall).
 *
 * Derived from `route.river_crossings` (a raw integer — NEVER forwarded; P5 wall):
 *   none:     river_crossings === 0 — no river crossing on this route.
 *   single:   river_crossings === 1 — one river crossing.
 *   multiple: river_crossings >= 2  — two or more river crossings.
 *
 * A PRESENTATION-ONLY bucketing — NOT a balance tunable (the cutpoints are 0/1, not registry rows).
 * The raw `river_crossings` integer is server-only (BO-only for gm endpoints in C13).
 */
export type RiverCrossingsBucket = 'none' | 'single' | 'multiple';

/**
 * `RouteLifecycleBands` — the player-facing route-lifecycle projection (C13, R2.2, P5 wall).
 *
 * Contains ONLY the 4 banded/categorical fields PLUS route identity (route_id, and — TD-551 — the 2
 * endpoint building ids) — NEVER raw scalars.
 * P5 wall (TypeScript compile-time enforcement):
 *   ✓ sinuosity_bucket          — 'direct'|'meandering'|'gnarled' (never raw sinuosity_index)
 *   ✓ river_crossings_count_bucket — 'none'|'single'|'multiple' (never raw river_crossings)
 *   ✓ route_state               — 'draft'|'active'|'saturated'|'severed' (closed enum)
 *   ✓ available_vehicles        — categorical string[] (FOOT always; others if count > 0)
 *   ✓ from_building_id/to_building_id — TD-551, opaque uuid HANDLES (the SAME "OWNED-resource
 *     handle" carve-out `route_id` itself already exercises here — R2.2 bars raw SCALARS, not
 *     identifiers; identical convention to `district-interior.projection.service.ts`'s
 *     `lieutenant_ids`) — see this interface's own `from_building_id` comment for why.
 *   ✗ sinuosity_index           — NEVER (server-only, BO-only raw scalar)
 *   ✗ straight_line_distance    — NEVER (server-only, BO-only raw scalar)
 *   ✗ river_crossings           — NEVER (server-only, BO-only raw integer)
 *   ✗ debt_magnitude            — NEVER (BO-only from corridor_debt)
 *   ✗ corridor_debt             — NEVER (BO-only)
 *   ✗ count                     — NEVER (vehicle_inventory raw count, BO-only)
 */
export interface RouteLifecycleBands {
  /** Route identity (uuid — echoed for the client's route panel; NOT a sim scalar). */
  route_id: string;
  /**
   * TD-551 — the route's endpoint buildings (`route.origin_building_id`/`route.destination_
   * building_id`, straight pass-through — the SAME columns `DistributionService.dispatch` writes
   * `from_building_id`/`to_building_id` into, `distribution.repository.ts:385`). ADDED because
   * `POST /v1/operational/distribution/dispatch`'s body takes `{from_building_id, to_building_id,
   * cargo_grams}` while this projection, until this chunk, echoed NEITHER — the client could not
   * dispatch ON the route it was displaying, only re-derive a heuristic destination (measured,
   * TD-551 brief). Additive: existing consumers reading only the 4 bands above see no change.
   */
  from_building_id: string;
  to_building_id: string;
  /**
   * The player-facing sinuosity band (C13, R2.2). Derived from `route.sinuosity_index` via
   * `RouteFinderService.sinuosityBucket` (C5 — getter-sourced cuts, DD-SINUOSITY §3.5).
   * 'direct' | 'meandering' | 'gnarled'. NEVER the raw sinuosity_index float.
   */
  sinuosity_bucket: import('./route-finder.service').SinuosityBucket;
  /**
   * The player-facing river-crossings band (C13, R2.2). Derived from `route.river_crossings`:
   * 0→'none' | 1→'single' | >=2→'multiple'. NEVER the raw integer.
   */
  river_crossings_count_bucket: RiverCrossingsBucket;
  /**
   * The route lifecycle state (C13, R2.2). A closed enum domain ('draft'|'active'|'saturated'|'severed').
   * Passed through from `route.state` (the route_state enum column). NOT a raw scalar.
   */
  route_state: string;
  /**
   * The player's available vehicle set (C13, R2.2). Categorical labels (never raw speeds/counts).
   * 'FOOT' is ALWAYS included (OQ-RS4 — foot default-allow). Other types included if the player
   * has count > 0 in vehicle_inventory (DD-ROSTER §5.1 capability-unlock model).
   * Same list for ALL routes for the player (vehicle availability is player-scoped, not per-route).
   */
  available_vehicles: string[];
}

// ── C11: DetectionRiskBucket ──────────────────────────────────────────────────────────────────────

/**
 * `DetectionRiskBucket` — the player-facing detection risk band (C11, R2.2, P5 wall).
 *
 * Closed presentation domain — NEVER exposes the raw `patrol_heat` or detection probability.
 * Canon :301 (`DetectionProbabilityBucket` semantics — named `DetectionRiskBucket` in this codebase
 * per the Shared signatures / plan line 388-391).
 *
 * Derived server-side from `courier_shift.patrol_heat` via the registry cut-points (OQ-22):
 *   silent:   patrol_heat < patrol_heat_elevated_band (0.33 default) — low ambient detection risk.
 *   elevated: patrol_heat_elevated_band ≤ patrol_heat < patrol_heat_critical_band (0.33..0.66) — notable.
 *   critical: patrol_heat ≥ patrol_heat_critical_band (0.66 default) — high ambient detection risk.
 *
 * The cut-points (`patrolHeatBandElevated` / `patrolHeatBandCritical`) are registry rows (OQ-22,
 * balance-relevant — sourced via `distributionDetectionTunables` getters, NOT presentation-only constants).
 * This distinguishes the DetectionRisk band from the PRESENTATION-only forensic bucket precedent (which uses
 * hard-coded constants). The reviewer⊥ ratifies registry-vs-presentation status per OQ-22.
 */
export type DetectionRiskBucket = 'silent' | 'elevated' | 'critical';

// ── C11: CourierStateProjection ───────────────────────────────────────────────────────────────────

/**
 * `CourierStateProjection` — the player-facing projection for a courier's detection / reputation /
 * caught state (C11, R2.2, P5 wall).
 *
 * Contains ONLY the 3 banded buckets — NEVER raw scalars.
 * P5 wall (TypeScript compile-time enforcement):
 *   ✓ detection_risk_bucket   — closed domain DetectionRiskBucket (never raw patrol_heat or detection_prob)
 *   ✓ courier_reputation_bucket — closed domain CourierReputationBucket (never raw sessions_active)
 *   ✓ caught_state            — CaughtExceptionStatus | 'none' (never the raw exception row)
 *   ✗ patrol_heat             — NEVER (server-side only, BO-only for C12)
 *   ✗ detection_prob          — NEVER (server-side only, derived in computeDetectionProb)
 *   ✗ leak_magnitude          — NEVER (server-side only, BO-only per R2.2)
 *   ✗ sessions_active         — NEVER (server-side only, BO-only)
 */
export interface CourierStateProjection {
  /**
   * The coarse detection risk band derived from `patrol_heat` (NEVER the raw float — P5 wall).
   * 'silent' | 'elevated' | 'critical' (closed domain, canon :301, OQ-22 registry cuts).
   */
  detection_risk_bucket: DetectionRiskBucket;

  /**
   * The courier reputation band derived from `sessions_active` (NEVER the raw integer — P5 wall).
   * 'rookie' | 'seasoned' | 'expert' (closed domain, canon :303, C7 reputationBucket REUSE).
   */
  courier_reputation_bucket: CourierReputationBucket;

  /**
   * The caught-exception state (CaughtExceptionStatus if a pending exception exists, else 'none').
   * Derived from the player's most-recent `caught_exception.status` (NEVER the raw exception row).
   * 'pending' | 'lawyered' | 'abandoned' | 'silenced' | 'none'.
   */
  caught_state: CaughtExceptionStatus | 'none';
}

/** The qualitative courier-transit band (the only courier-progress signal exposed — never the raw transit clock). */
export type CourierTransitBand = 'IDLE' | 'IN_TRANSIT' | 'ARRIVED';

/**
 * The qualitative ROSTER band (Phase-4 vector #4 — distribution_hub T6; the player's courier-roster occupancy as a
 * closed band — NEVER the raw in-transit shift COUNT nor the raw cap number; R2.2). It tells the player how much of
 * their concurrent-shipment capacity is in use without ever exposing either integer:
 *   - OPEN  — no shipment in transit (count === 0; the roster is idle, dispatch freely).
 *   - BUSY  — some shipments in transit but below the cap (0 < count < cap; capacity remains).
 *   - FULL  — the roster is at/over the cap (count >= cap; a further dispatch is refused 409 OVER_CAPACITY, T4).
 *   - NONE  — surfaced for a NON-distribution_hub building card (the roster band is meaningful only on a hub card —
 *             the SAME neutral-NONE convention hub_tier_band uses for a non-hub building; T6 projection assembly).
 * The OPEN/BUSY/FULL cutpoints (count==0 / count>=cap) are a PRESENTATION-ONLY bucketing of already-derived figures
 * (the in-transit count + the HubRosterService cap) — NOT a balance tunable (like the seized/repair band cutpoints in
 * the building-card projection), so no gdd/14 edit is needed.
 */
export type RosterBand = 'NONE' | 'OPEN' | 'BUSY' | 'FULL';

/**
 * The player's hub-dispatch bands (Phase-4 vector #4 — distribution_hub T6): the qualitative roster occupancy + the
 * unlocked vehicle set, surfaced on a distribution_hub Building Card (R2.2 — closed-domain labels only). See
 * `RosterBand` for the roster_band semantics; `available_vehicles` is the categorical set of unlocked vehicle labels.
 */
export interface HubDispatchBands {
  /** The qualitative roster-occupancy band (OPEN / BUSY / FULL — never the raw count/cap; R2.2). */
  roster_band: RosterBand;
  /** The unlocked vehicle set as CATEGORICAL labels (e.g. ['FOOT','BIKE','CAR'] — NOT raw speeds; R2.2-safe). */
  available_vehicles: string[];
}

// ── C9: CoordinatorProjection types ──────────────────────────────────────────────────────────────

/**
 * `HubTierBandCoordinator` — the coordinator hub-tier as a closed band (C9, R2.2, P5 wall).
 *
 * Derived from `building_operational_state.hub_tier` (NEVER forwarded raw — P5 wall):
 *   none:       hub_tier is null or 0 — no operational hub.
 *   basic:      hub_tier = 1
 *   established: hub_tier = 2
 *   advanced:   hub_tier = 3
 *   flagship:   hub_tier >= 4
 *
 * PRESENTATION-ONLY (the real-estate band uses 'SMALL'/'MEDIUM' etc — these are DIFFERENT names
 * for the coordinator projection surface). NOT a balance tunable — the 1→5 tier labels are fixed.
 * [PROV-Y26Q2]
 */
export type HubTierBandCoordinator = 'none' | 'basic' | 'established' | 'advanced' | 'flagship';

/**
 * `FleetOccupancyBand` — the per-vehicle-type in-transit occupancy band (C9, R2.2, P5 wall).
 *
 * Derived from `countInTransitShiftsByType` vs `fleetCapInTransit` (NEVER raw count/cap — P5 wall):
 *   fleet_room:  count === 0 — no vehicle of this type in transit.
 *   fleet_tight: 0 < count < cap — some in transit, capacity remains.
 *   fleet_full:  count >= cap — at/over cap.
 *
 * PRESENTATION-ONLY (not a balance tunable — the 0/cap cutpoints are already-derived figures).
 * [PROV-Y26Q2]
 */
export type FleetOccupancyBand = 'fleet_room' | 'fleet_tight' | 'fleet_full';

/**
 * `ScriptComplexityBucket` — the coordinator's autonomy badge (C9, R2.2, P5 wall).
 *
 * Derived from the coordinator's behavior_script rule-count (NEVER the raw count — P5 wall):
 *   manual:     rule_count === 0 — no rules, coordinator is manual.
 *   basic:      1 <= rule_count <= 9 — simple automation.
 *   autonomous: rule_count >= 10 — highly automated.
 *
 * PRESENTATION-ONLY (the cutpoints 0/10 are fixed labels, not balance tunables). [PROV-Y26Q2]
 */
export type ScriptComplexityBucket = 'manual' | 'basic' | 'autonomous';

/**
 * `CoordinatorProjection` — the player-facing coordinator-state projection (C9, R2.2, P5 wall).
 *
 * Contains ONLY the 5 banded/categorical fields — NEVER raw scalars.
 * P5 wall (TypeScript compile-time enforcement):
 *   ✓ hub_tier_band          — closed domain HubTierBandCoordinator (never raw hub_tier int)
 *   ✓ roster_band            — REUSE RosterBand (OPEN/BUSY/FULL — never raw count/cap)
 *   ✓ fleet_occupancy_band   — per-vehicle-type FleetOccupancyBand (never raw count/cap)
 *   ✓ script_complexity_bucket — coordinator autonomy bucket (never raw rule_count)
 *   ✓ available_vehicles     — categorical labels (never raw speeds/counts)
 *   ✗ hub_tier               — NEVER (raw int, BO-only)
 *   ✗ in_transit_count       — NEVER (raw count, BO-only)
 *   ✗ fleet_cap              — NEVER (raw cap, BO-only)
 *   ✗ rule_count             — NEVER (raw count, BO-only)
 */
export interface CoordinatorProjection {
  /** Hub tier as a closed band (never the raw integer). */
  hub_tier_band: HubTierBandCoordinator;
  /** Roster occupancy band (REUSE existing RosterBand — OPEN/BUSY/FULL). */
  roster_band: RosterBand;
  /** Per-vehicle-type in-transit occupancy band (never raw count/cap). */
  fleet_occupancy_band: Record<string, FleetOccupancyBand>;
  /** Coordinator's rule-count bucketed as autonomy badge (never raw count). */
  script_complexity_bucket: ScriptComplexityBucket;
  /** Unlocked vehicle set as categorical labels (never raw speeds/counts). */
  available_vehicles: string[];
}

/** The PLAYER-FACING per-courier projection (qualitative band only — R2.2). */
export interface CourierProjection {
  /** The courier identity (a uuid string — echoed for the client's Couriers panel; NOT a sim scalar). */
  courier: string;
  /** The qualitative vehicle mode (a closed enum domain — FOOT / BIKE / CAR / REFRIGERATED_VAN; the canonical EN label). */
  vehicle_type: string;
  /** The qualitative transit band (IDLE / IN_TRANSIT / ARRIVED — never the raw segment/clock/coords; R2.2). */
  transit_band: CourierTransitBand;
  /**
   * Phase-2b vector #2 — the cold-chain temperature_status BAND for an IN-TRANSIT COLD-CHAIN cargo (Crick):
   * OPTIMAL_COLD (a refrigerated_van — preserved) | HOT (an ordinary foot/bike/car courier — degrading). A closed band
   * (R2.2 — never a raw °C). NULL when the cargo is not cold-chain (Brindle), or the courier is not in transit.
   */
  temperature_status: TemperatureStatus | null;
  /**
   * Phase-2b vector #2 — whether the in-transit cold-chain cargo is actively DEGRADING (a boolean band, R2.2): true for
   * a HOT cargo (a non-refrigerated courier — losing grams each COLD_CHAIN tick), false otherwise. NEVER the raw rate.
   */
  degrading: boolean;
}

@Injectable()
export class DistributionProjectionService {
  constructor(
    private readonly repo: DistributionRepository,
    private readonly coldChain: ColdChainService,
    // Phase-4 vector #4 (distribution_hub — T6) — the PURE roster-cap derivation (lever A, same module). The dispatch
    // bands read the player's effective cap through it (no DB inside the service; the count/owns-hub DB reads are the
    // repository's job) so the roster_band buckets the SAME cap the T4 dispatch gate enforces.
    private readonly hubRoster: HubRosterService,
    // C11 — CourierDetectionService: REUSE reputationBucket(sessionsActive) (C7) — single source of truth for the
    // reputation threshold derivation. No duplication of the threshold constants here.
    private readonly courierDetection: CourierDetectionService,
    // C11 — DB: read patrol_heat from the active courier_shift + sessions_active from courier +
    //   caught_exception.status for the caught-state band. Read-only (no mutation).
    @Inject(DB) private readonly db: DrizzleClient,
    // C13 — RouteFinderService: REUSE sinuosityBucket(sinuosityIndex) for the P5 route projection.
    // Single source of truth for the sinuosity cut derivation (DD-SINUOSITY §3.5, getter-sourced cuts).
    private readonly routeFinder: RouteFinderService,
    // C9 — LieutenantRepository: DIRECTLY injected (not via LieutenantModule — circular dep avoidance;
    // same pattern as CoordinatorExecutionService). Used to read the coordinator's behavior_script
    // rule-count for script_complexity_bucket derivation (P5 wall — never raw rule_count).
    private readonly lieutenantRepo: LieutenantRepository,
  ) {}

  /**
   * Project ALL of a player's foot couriers → fully-qualitative payloads (R2.2). Reads each courier's raw state + its
   * latest shift status from the repository (the raw state is the INPUT but is mapped to a BAND — the raw segment
   * index / cargo / clock are NEVER forwarded; R2.2). Returns [] when the player has no couriers. M1 surfaces FOOT
   * couriers only.
   */
  async listCouriers(playerId: string): Promise<CourierProjection[]> {
    const rows = await this.repo.listCourierStates(playerId);
    return rows.map((r) => {
      const transit_band = this.transitBand(r.current_state, r.shift_status);
      // Cold-chain (Phase-2b vector #2): a temperature_status applies ONLY to an IN-TRANSIT cold-chain cargo (Crick) —
      // OPTIMAL_COLD on a refrigerated_van, else HOT (exposed). NULL for a non-cold-chain cargo (Brindle), a courier
      // with no shift cargo, or a courier not in transit (idle/arrived have no live exposure). A closed band (R2.2).
      const temperature_status =
        transit_band === 'IN_TRANSIT'
          ? this.coldChain.cargoTemperatureStatus(r.shift_substance_type ?? '', r.vehicle_type)
          : null;
      return {
        courier: r.courier_id,
        // The canonical EN vehicle label (foot/bike/car/refrigerated_van → FOOT/…; distribution_couriers_runners.md —
        // VehicleType). The refrigerated_van is the cold-chain in transit; everything else exposes a Crick cargo.
        vehicle_type: r.vehicle_type.toUpperCase(),
        transit_band,
        temperature_status,
        degrading: this.coldChain.isDegrading(temperature_status),
      };
    });
  }

  /**
   * Map the courier_state enum + the active shift_status → the qualitative transit band (R2.2). in_transit → IN_TRANSIT;
   * at_destination (or a completed shift) → ARRIVED; idle / returning / anything else → IDLE. The player sees the BAND,
   * never the raw segment index / coordinates / clock. M1 produces no caught/compromised (no detection roll), so those
   * fall to the default IDLE band.
   */
  private transitBand(currentState: string, shiftStatus: string | null): CourierTransitBand {
    if (currentState === 'in_transit') return 'IN_TRANSIT';
    if (currentState === 'at_destination' || shiftStatus === 'completed') return 'ARRIVED';
    // idle / returning / caught / compromised (M1 produces none of the latter) → no active trip → IDLE.
    return 'IDLE';
  }

  /**
   * Project the player's HUB-DISPATCH bands (Phase-4 vector #4 — distribution_hub T6): the qualitative roster occupancy
   * + the unlocked vehicle set, for a distribution_hub Building Card (R2.2 — closed-domain labels only; the raw count /
   * cap / vehicle speed NEVER escape). Reads the player's BEST operational hub (getOwnedOperationalHub), derives the
   * effective concurrency cap (HubRosterService — the SAME cap the T4 dispatch gate enforces), and counts the in-transit
   * courier_shifts (countInTransitShifts) — three READS, NO state change.
   *   - roster_band: OPEN (count === 0) | FULL (count >= cap) | BUSY (between) — a PRESENTATION bucketing of the count
   *     vs the cap (NOT a balance tunable; R2.2 — neither integer is exposed, only the band). The cap is whole-player
   *     (effectiveCap on the player's best hub tier — null → the meagre no-hub cap), so the band reflects the player's
   *     overall dispatch headroom, matching what the dispatch gate actually enforces.
   *   - available_vehicles: the unlocked vehicle set as CATEGORICAL labels (R2.2-safe — these are mode names, NOT raw
   *     speeds). A player with NO operational hub can only walk → ['FOOT']; owning an operational hub unlocks the
   *     wheeled modes → ['FOOT','BIKE','CAR'] (lever B — T5; the hub gates bike/car). Uppercase labels match the
   *     vehicle_type.toUpperCase() convention listCouriers already uses (distribution_couriers_runners.md — VehicleType).
   */
  async hubDispatchBands(playerId: string): Promise<HubDispatchBands> {
    const hub = await this.repo.getOwnedOperationalHub(playerId);
    // The effective concurrency cap (the SAME derivation the T4 dispatch gate consumes): null hub → the no-hub cap;
    // else the per-tier roster cap. PURE (the raw cap is the INPUT but is bucketed to a band — never exposed; R2.2).
    const cap = this.hubRoster.effectiveCap(hub?.hubTier ?? null);
    const count = await this.repo.countInTransitShifts(playerId);
    return {
      roster_band: this.rosterBand(count, cap),
      // A hub unlocks the wheeled modes (lever B — T5); no hub → foot only. Categorical labels, never speeds (R2.2).
      available_vehicles: hub === null ? ['FOOT'] : ['FOOT', 'BIKE', 'CAR'],
    };
  }

  // ── C9: projectCoordinatorState — the R2.2 P5-wall coordinator projection ────────────────────

  /**
   * `projectCoordinatorState(playerId)` — C9 R2.2 P5-wall coordinator projection.
   *
   * Returns `CoordinatorProjection` — ONLY the 5 banded/categorical fields:
   *   - hub_tier_band          (HubTierBandCoordinator — 'none'|'basic'|'established'|'advanced'|'flagship')
   *   - roster_band            (RosterBand — OPEN/BUSY/FULL; same as hubDispatchBands)
   *   - fleet_occupancy_band   (per-vehicle-type — foot/bike/car/van → 'fleet_room'|'fleet_tight'|'fleet_full')
   *   - script_complexity_bucket (ScriptComplexityBucket — 'manual'|'basic'|'autonomous')
   *   - available_vehicles     (categorical string[] — FOOT always; others if count > 0)
   *
   * Strategy:
   *   1. Get the player's best operational hub → hubTier raw integer.
   *   2. Derive hub_tier_band (PRESENTATION-ONLY label map; null/0→'none', 1→'basic', ..., ≥4→'flagship').
   *   3. Count in-transit shifts (global) → roster_band (REUSE hubDispatchBands logic).
   *   4. Count in-transit shifts per type (foot/bike/car/van) vs fleet cap → fleet_occupancy_band.
   *   5. Load the LOGISTICS coordinator lieutenant for the hub → read behavior_script rule-count
   *      → script_complexity_bucket (0→'manual', 1-9→'basic', ≥10→'autonomous').
   *   6. Query vehicle_inventory count > 0 → available_vehicles (categorical labels; FOOT always).
   *
   * P5 WALL: the return type `CoordinatorProjection` enforces the wall at compile time.
   *   NEVER: hub_tier (raw int), in_transit_count, fleet_cap, rule_count — none in the return type.
   *
   * All band cuts are PRESENTATION-ONLY (non-registry labels; [PROV-Y26Q2]).
   * Safe defaults: no hub → 'none'; no coordinator → 'manual'; no vehicles → ['FOOT'].
   * Read-only: NO state mutations.
   *
   * @param playerId — the player's UUID.
   * @returns `CoordinatorProjection` — the 5-field P5-compliant coordinator projection.
   */
  async projectCoordinatorState(playerId: string): Promise<CoordinatorProjection> {
    // ── Step 1: Get the player's best operational hub ──────────────────────────────────────────────
    // Read ONLY hub_tier and building_id — the raw hub_tier integer is used internally for banding.
    const hub = await this.repo.getOwnedOperationalHub(playerId);
    const rawHubTier: number | null = hub?.hubTier ?? null;

    // ── Step 2: Derive hub_tier_band (PRESENTATION-ONLY; [PROV-Y26Q2]) ───────────────────────────
    const hub_tier_band: HubTierBandCoordinator = deriveHubTierBandCoordinator(rawHubTier);

    // ── Step 3: Global in-transit count → roster_band (REUSE existing logic) ────────────────────
    const cap = this.hubRoster.effectiveCap(rawHubTier);
    const globalInTransit = await this.repo.countInTransitShifts(playerId);
    const roster_band: RosterBand = this.rosterBand(globalInTransit, cap);

    // ── Step 4: Per-type in-transit counts → fleet_occupancy_band ─────────────────────────────────
    // PRESENTATION-ONLY: count=0 → 'fleet_room'; 0<count<cap → 'fleet_tight'; count≥cap → 'fleet_full'.
    // Vehicle types: foot, bike, car, refrigerated_van (the actual DB vehicle_type enum values).
    // 'van' is NOT a valid vehicle_type enum value — use 'refrigerated_van' (the canonical cold-chain type).
    const vehicleTypes = ['foot', 'bike', 'car', 'refrigerated_van'] as const;
    const fleet_occupancy_band: Record<string, FleetOccupancyBand> = {};
    for (const vtype of vehicleTypes) {
      // Read raw count internally — NEVER forwarded (P5 wall).
      const rawCount = await this.repo.countInTransitShiftsByType(playerId, vtype);
      // Read fleet cap from tunables — NEVER forwarded (P5 wall).
      const rawCap = distributionAutomationHubsTunables.fleetCapInTransit(vtype);
      fleet_occupancy_band[vtype] = deriveFleetOccupancyBand(rawCount, rawCap);
    }

    // ── Step 5: Coordinator lieutenant → script_complexity_bucket ─────────────────────────────────
    // Load the LOGISTICS coordinator for this hub (findDelegatedByAssignedBuilding).
    // Read ONLY the rules (CompiledScript) — extract rule-count internally; NEVER forwarded (P5 wall).
    let rawRuleCount = 0;
    if (hub !== null) {
      const lt = await this.lieutenantRepo.findDelegatedByAssignedBuilding(playerId, hub.buildingId);
      if (lt !== null && lt.rules !== null) {
        const compiled = lt.rules as unknown as CompiledScript;
        rawRuleCount = compiled?.rules?.length ?? 0;
      }
    }
    // bucket: 0→'manual', 1-9→'basic', ≥10→'autonomous'. PRESENTATION-ONLY. [PROV-Y26Q2].
    const script_complexity_bucket: ScriptComplexityBucket = deriveScriptComplexityBucket(rawRuleCount);

    // ── Step 6: Available vehicles (categorical labels — FOOT always; others if count > 0) ────────
    // Query vehicle_inventory WHERE player_id = playerId AND count > 0 → collect vehicle_type values.
    // NEVER forward the raw count (P5 wall — only the categorical type label is included).
    const inventoryRows = await this.db
      .select({
        vehicle_type: vehicleInventory.vehicle_type,
        // NOTE: count NOT selected (P5 wall — used only as filter below).
      })
      .from(vehicleInventory)
      .where(
        and(
          eq(vehicleInventory.player_id, playerId),
          gt(vehicleInventory.count, 0),
        ),
      );
    const ownedTypes = inventoryRows
      .map((r) => r.vehicle_type.toUpperCase())
      .filter((t) => t !== 'FOOT');
    const available_vehicles: string[] = ['FOOT', ...ownedTypes];

    // ── Step 7: Assemble CoordinatorProjection (P5 FINAL CHECK) ──────────────────────────────────
    //   ✓ hub_tier_band          — banded (closed 5-value domain, PRESENTATION-ONLY)
    //   ✓ roster_band            — banded (OPEN/BUSY/FULL — REUSE existing logic)
    //   ✓ fleet_occupancy_band   — per-type band (fleet_room|fleet_tight|fleet_full, PRESENTATION-ONLY)
    //   ✓ script_complexity_bucket — bucketed (manual|basic|autonomous, PRESENTATION-ONLY)
    //   ✓ available_vehicles     — categorical labels (never raw count/speed)
    //   ✗ hub_tier               — NEVER (read internally; NEVER forwarded)
    //   ✗ in_transit_count       — NEVER (read internally; NEVER forwarded)
    //   ✗ fleet_cap              — NEVER (read internally; NEVER forwarded)
    //   ✗ rule_count             — NEVER (read internally; NEVER forwarded)
    return {
      hub_tier_band,
      roster_band,
      fleet_occupancy_band,
      script_complexity_bucket,
      available_vehicles,
    };
  }

  /**
   * Map the player's in-transit shift COUNT + their effective roster CAP → the qualitative roster band (T6; R2.2 — the
   * raw count/cap NEVER escape, only the band). OPEN when idle (count === 0); FULL at/over the cap (count >= cap — the
   * dispatch gate would refuse a further shipment 409 OVER_CAPACITY); BUSY in between (capacity remains). A
   * PRESENTATION-ONLY bucketing of already-derived figures (like the seized/repair band cutpoints in the building-card
   * projection) — NOT a balance tunable. NONE is reserved for a NON-hub building card (assigned at the projection
   * assembly site, never here — this method only buckets a hub's live occupancy).
   */
  private rosterBand(inTransitCount: number, cap: number): RosterBand {
    if (inTransitCount === 0) return 'OPEN';
    if (inTransitCount >= cap) return 'FULL';
    return 'BUSY';
  }

  // ── C11: projectCourierState — the R2.2 P5-wall projection ────────────────────────────────────

  /**
   * `projectCourierState(playerId)` — the C11 R2.2 P5-wall detection projection.
   *
   * Returns `CourierStateProjection` — ONLY the 3 banded buckets:
   *   - detection_risk_bucket     (DetectionRiskBucket — 'silent'|'elevated'|'critical')
   *   - courier_reputation_bucket (CourierReputationBucket — 'rookie'|'seasoned'|'expert')
   *   - caught_state              (CaughtExceptionStatus|'none')
   *
   * Strategy:
   *   1. Read the player's active courier_shift (the most-recent in_transit shift) → `patrol_heat`.
   *   2. Read the player's courier → `sessions_active`.
   *   3. Read the player's most-recent caught_exception → `.status` (or 'none' if not found).
   *   4. Derive the 3 buckets — read the raw scalars INTERNALLY, NEVER include them in the return.
   *
   * Safe defaults: a player with no shift → 'silent' (no patrol exposure yet); no courier → 'rookie';
   *   no caught_exception → 'none'. Zero-regression invariant (purely additive read-only).
   *
   * P5 wall: the return type `CourierStateProjection` enforces the wall at compile time.
   *   NEVER: patrol_heat, sessions_active, leak_magnitude, detection_prob (none in the return type).
   *
   * @param playerId — the player's UUID.
   * @returns `CourierStateProjection` — the 3-bucket P5-compliant detection projection.
   */
  async projectCourierState(playerId: string): Promise<CourierStateProjection> {
    // ── Step 1: Load the active courier's patrol_heat from the most-recent in_transit shift ────────
    //
    // Strategy: select the most-recent courier_shift (by started_at_tick DESC) for this player.
    // Read ONLY patrol_heat — the raw scalar is read internally for banding; NEVER forwarded.
    const shiftRows = await this.db
      .select({
        patrol_heat: courierShift.patrol_heat,
        // NOTE: patrol_heat read internally only — NEVER forwarded (P5 wall).
        // status, started_at_tick, cargo_grams, current_segment_index, etc = NOT selected (server-only).
      })
      .from(courierShift)
      .where(eq(courierShift.player_id, playerId))
      .orderBy(courierShift.started_at_tick)
      .limit(1);

    // Take the most recent shift's patrol_heat (null → default 0.0 — no patrol exposure).
    const rawPatrolHeat: number = shiftRows[0]?.patrol_heat ?? 0.0;

    // ── Step 2: Load the player's courier sessions_active ─────────────────────────────────────────
    //
    // Strategy: select the player's courier (M1 has one courier per dispatch; pick the first/most-recent).
    // Read ONLY sessions_active — the raw integer is used internally for banding; NEVER forwarded.
    const courierRows = await this.db
      .select({
        sessions_active: courier.sessions_active,
        // NOTE: sessions_active read internally only — NEVER forwarded (P5 wall).
      })
      .from(courier)
      .where(eq(courier.player_id, playerId))
      .orderBy(courier.courier_id)
      .limit(1);

    // Take the first courier's sessions_active (null → 0 — no sessions yet → rookie).
    const rawSessionsActive: number = courierRows[0]?.sessions_active ?? 0;

    // ── Step 3: Load the player's most-recent caught_exception status ─────────────────────────────
    //
    // Strategy: select the most-recent caught_exception for this player.
    // Read ONLY status — the caught-state band is a direct mapping of the status enum value.
    const excRows = await this.db
      .select({
        status: caughtException.status,
        // NOTE: status read internally; exception_id/caught_at_tick/leak_magnitude/etc NOT selected.
      })
      .from(caughtException)
      .where(eq(caughtException.player_id, playerId))
      .limit(1);

    // The caught_state: if an exception exists → use its status; else 'none'.
    const rawCaughtState: CaughtExceptionStatus | 'none' =
      excRows.length > 0 && excRows[0]?.status != null ? excRows[0].status : 'none';

    // ── Step 4: Derive the 3 buckets (registry-sourced band cuts / REUSE C7 thresholds) ──────────
    //
    // The raw scalars (rawPatrolHeat, rawSessionsActive, rawCaughtState.status) are read internally
    // but NEVER included in the return shape (P5 wall).
    const detectionRiskBucket = deriveDetectionRiskBucket(rawPatrolHeat);
    const courierReputationBucket = this.courierDetection.reputationBucket(rawSessionsActive);
    const caught_state: CaughtExceptionStatus | 'none' = rawCaughtState;

    // ── Step 5: Assemble and return CourierStateProjection ────────────────────────────────────────
    //
    // P5 FINAL CHECK (the return type `CourierStateProjection` enforces the wall at compile time):
    //   ✓ detection_risk_bucket     — banded (closed 3-value domain)
    //   ✓ courier_reputation_bucket — banded (closed 3-value domain)
    //   ✓ caught_state              — status string or 'none' (closed domain)
    //   ✗ patrol_heat               — NEVER (read internally; NEVER forwarded)
    //   ✗ detection_prob            — NEVER (not computed here; BO-only)
    //   ✗ leak_magnitude            — NEVER (NOT selected from DB)
    //   ✗ sessions_active           — NEVER (read internally as number; NEVER forwarded)
    return {
      detection_risk_bucket: detectionRiskBucket,
      courier_reputation_bucket: courierReputationBucket,
      caught_state,
    };
  }

  // ── C13: listRouteProjections — R2.2 P5-wall route-lifecycle projection ──────────────────────

  /**
   * `listRouteProjections(playerId)` — C13 R2.2 P5-wall route-lifecycle projection.
   *
   * Returns `RouteLifecycleBands[]` — one entry per route for the player — with ONLY the 4 banded
   * / categorical fields (sinuosity_bucket, river_crossings_count_bucket, route_state,
   * available_vehicles). NEVER raw scalars (sinuosity_index, straight_line_distance, river_crossings,
   * debt_magnitude, count — none appear in the return type; P5 wall enforced at compile time).
   *
   * Strategy:
   *   1. Query `route` WHERE player_id = playerId → raw sinuosity_index / river_crossings / state.
   *   2. Derive sinuosity_bucket via `RouteFinderService.sinuosityBucket` (C5 REUSE — getter-sourced cuts).
   *   3. Derive river_crossings_count_bucket: 0→'none' | 1→'single' | >=2→'multiple'.
   *   4. route_state: direct pass-through of route.state (closed enum — already qualitative).
   *   5. available_vehicles: query vehicleInventory WHERE player_id AND count > 0 → uppercase type labels.
   *      FOOT always included (OQ-RS4 default-allow). Same list for ALL routes (player-scoped).
   *
   * P5 WALL: the internal raw reads (sinuosity_index, river_crossings, count) are used INTERNALLY
   * for banding only — NEVER forwarded in the return type. TypeScript compile-time enforcement.
   *
   * Safe default: a player with no routes → returns []. NEVER throws for an empty state.
   * Read-only: NO state mutations.
   *
   * @param playerId — the player's UUID.
   * @returns `RouteLifecycleBands[]` — one banded entry per route (may be empty).
   */
  async listRouteProjections(playerId: string): Promise<RouteLifecycleBands[]> {
    // ── Step 1: Load all route rows for the player ────────────────────────────────────────────────
    // Read the fields needed for banding (sinuosity_index, river_crossings, state, route_id) PLUS —
    // TD-551 — the 2 endpoint building ids (`origin_building_id`/`destination_building_id`), echoed
    // as-is (opaque handles, R2.2 — not the P5 wall's target). straight_line_distance, path_blocks,
    // vehicle_type, etc. are still NOT selected (P5 wall unchanged for those).
    const routeRows = await this.db
      .select({
        route_id: route.route_id,
        origin_building_id: route.origin_building_id,           // TD-551 — echoed, never a scalar.
        destination_building_id: route.destination_building_id, // TD-551 — echoed, never a scalar.
        sinuosity_index: route.sinuosity_index,    // NOTE: read internally for banding; NEVER forwarded.
        river_crossings: route.river_crossings,     // NOTE: read internally for banding; NEVER forwarded.
        state: route.state,                         // route_state enum — qualitative, passed through.
      })
      .from(route)
      .where(eq(route.player_id, playerId));

    if (routeRows.length === 0) {
      return [];
    }

    // ── Step 2: Load the player's available vehicles (player-scoped — same for ALL routes) ───────
    // Query vehicleInventory WHERE player_id = playerId AND count > 0 → collect vehicle_type values.
    // NEVER forward the raw count (P5 wall — only the categorical type label is included).
    const inventoryRows = await this.db
      .select({
        vehicle_type: vehicleInventory.vehicle_type,  // categorical label (foot/bike/car/refrigerated_van)
        // NOTE: count read internally (filter > 0); NEVER forwarded (P5 wall — not in RouteLifecycleBands).
      })
      .from(vehicleInventory)
      .where(
        and(
          eq(vehicleInventory.player_id, playerId),
          gt(vehicleInventory.count, 0),
        ),
      );

    // Derive available_vehicles: FOOT is ALWAYS included (OQ-RS4 default-allow).
    // Other types included only if count > 0 in vehicle_inventory (capability-unlock model, DD-ROSTER §5.1).
    // Uppercase labels (consistent with listCouriers convention — vehicle_type.toUpperCase()).
    const ownedVehicles = inventoryRows
      .map((r) => r.vehicle_type.toUpperCase())
      .filter((t) => t !== 'FOOT'); // exclude FOOT from the inventory list (always-added below)
    const available_vehicles: string[] = ['FOOT', ...ownedVehicles];

    // ── Step 3: Derive the 4 banded fields for each route row ────────────────────────────────────
    // P5 FINAL CHECK — the loop reads raw scalars INTERNALLY for banding; NEVER includes them in the output.
    return routeRows.map((r) => {
      // sinuosity_bucket: REUSE C5 RouteFinderService.sinuosityBucket (getter-sourced cuts — DD-SINUOSITY §3.5).
      // The raw sinuosity_index is used as INPUT but is NEVER forwarded (P5 wall).
      const sinuosity_bucket = this.routeFinder.sinuosityBucket(r.sinuosity_index ?? 1.0);

      // river_crossings_count_bucket: derived from raw river_crossings (integer — NEVER forwarded).
      // 0 → 'none' | 1 → 'single' | >= 2 → 'multiple'. PRESENTATION-ONLY (not a balance tunable).
      const rawRiverCrossings = r.river_crossings ?? 0;
      const river_crossings_count_bucket: RiverCrossingsBucket =
        rawRiverCrossings === 0 ? 'none'
        : rawRiverCrossings === 1 ? 'single'
        : 'multiple';

      // route_state: pass through the route_state enum value (already a closed qualitative domain).
      // NOT a raw scalar — this is the lifecycle state enum ('draft'|'active'|'saturated'|'severed').
      const route_state: string = r.state ?? 'active';

      // P5 FINAL CHECK — return type RouteLifecycleBands enforces no raw scalars:
      //   ✓ route_id                     — uuid identity (not a sim scalar)
      //   ✓ from_building_id/to_building_id — TD-551, uuid identities (not sim scalars)
      //   ✓ sinuosity_bucket             — banded (3-value domain, getter-sourced cuts)
      //   ✓ river_crossings_count_bucket — banded (3-value domain, presentation-only)
      //   ✓ route_state                  — closed enum string (qualitative)
      //   ✓ available_vehicles           — categorical labels (never raw count/speed)
      //   ✗ sinuosity_index              — NEVER (read internally; NEVER forwarded)
      //   ✗ straight_line_distance       — NEVER (NOT selected from DB)
      //   ✗ river_crossings              — NEVER (read internally for banding; NEVER forwarded)
      //   ✗ debt_magnitude               — NEVER (NOT queried here)
      //   ✗ count                        — NEVER (NOT selected from inventory; used only as filter)
      return {
        route_id: r.route_id,
        from_building_id: r.origin_building_id,      // TD-551
        to_building_id: r.destination_building_id,   // TD-551
        sinuosity_bucket,
        river_crossings_count_bucket,
        route_state,
        available_vehicles,
      };
    });
  }
}

// ── Private derivation helpers (pure, no DB) ────────────────────────────────────────────────────

/**
 * `deriveDetectionRiskBucket` — maps `patrol_heat` to a `DetectionRiskBucket`.
 *
 * Reads the band cuts from `distributionDetectionTunables` (OQ-22 — registry rows, balance-relevant;
 * NOT presentation-only constants — mirrors the insurance/forensic projection precedent but uses the
 * registry instead of hardcoded PRESENTATION constants, per the plan's OQ-22 resolution).
 *
 * Mapping rule:
 *   patrol_heat < elevated_band (0.33)  → 'silent'   (low ambient detection risk)
 *   elevated_band ≤ patrol_heat < critical_band (0.66) → 'elevated' (notable risk)
 *   patrol_heat ≥ critical_band (0.66)  → 'critical'  (high ambient detection risk)
 *
 * BOTH-WAYS reachable:
 *   patrol_heat=0.05 (cold precinct)  → 'silent'. ✓
 *   patrol_heat=0.50 (mid-load)       → 'elevated'. ✓
 *   patrol_heat=0.95 (hot precinct)   → 'critical'. ✓
 *
 * @param patrolHeat — `courier_shift.patrol_heat` (read internally; NEVER forwarded — P5 wall).
 * @returns DetectionRiskBucket — the coarse detection risk band.
 */
function deriveDetectionRiskBucket(patrolHeat: number): DetectionRiskBucket {
  // OQ-22: registry cuts (balance-relevant, [PROV-Y26Q2], sourced via getters — NOT hardcoded here).
  const elevatedBand = distributionDetectionTunables.patrolHeatBandElevated; // default 0.33
  const criticalBand = distributionDetectionTunables.patrolHeatBandCritical; // default 0.66

  if (patrolHeat >= criticalBand) return 'critical';
  if (patrolHeat >= elevatedBand) return 'elevated';
  return 'silent';
}

// ── C9: coordinator projection helpers (PRESENTATION-ONLY; [PROV-Y26Q2]) ───────────────────────

/**
 * `deriveHubTierBandCoordinator` — maps the raw `hub_tier` integer → `HubTierBandCoordinator`.
 *
 * PRESENTATION-ONLY label mapping (NOT a balance tunable — the 1→5 tier labels are fixed labels).
 * [PROV-Y26Q2] — provisional names; routed to the System 9 calibration TD.
 * Different label set from the real-estate `HubTierBand` ('SMALL'/'MEDIUM' etc) — these are the
 * coordinator projection surface names (design §10, `hub_tier_band` field).
 *
 * Mapping:
 *   null | 0 → 'none'       (no operational hub)
 *   1        → 'basic'
 *   2        → 'established'
 *   3        → 'advanced'
 *   >= 4     → 'flagship'
 *
 * @param hubTier — raw `building_operational_state.hub_tier` (null or int; NEVER forwarded — P5 wall).
 * @returns HubTierBandCoordinator — the closed coordinator hub-tier band.
 */
function deriveHubTierBandCoordinator(hubTier: number | null): HubTierBandCoordinator {
  if (hubTier === null || hubTier <= 0) return 'none';
  if (hubTier === 1) return 'basic';
  if (hubTier === 2) return 'established';
  if (hubTier === 3) return 'advanced';
  return 'flagship'; // hubTier >= 4
}

/**
 * `deriveFleetOccupancyBand` — maps the raw in-transit count + cap → `FleetOccupancyBand`.
 *
 * PRESENTATION-ONLY bucketing of already-derived figures. NOT a balance tunable. [PROV-Y26Q2].
 *
 * Mapping:
 *   count === 0       → 'fleet_room'  (no vehicle of this type in transit)
 *   0 < count < cap   → 'fleet_tight' (some in transit; capacity remains)
 *   count >= cap      → 'fleet_full'  (at/over cap)
 *
 * @param count — raw in-transit count for the vehicle type (NEVER forwarded — P5 wall).
 * @param cap   — fleet cap for the vehicle type (NEVER forwarded — P5 wall).
 * @returns FleetOccupancyBand — the closed fleet occupancy band.
 */
function deriveFleetOccupancyBand(count: number, cap: number): FleetOccupancyBand {
  if (count <= 0) return 'fleet_room';
  if (count >= cap) return 'fleet_full';
  return 'fleet_tight';
}

/**
 * `deriveScriptComplexityBucket` — maps the coordinator's behavior_script rule-count →
 * `ScriptComplexityBucket`.
 *
 * PRESENTATION-ONLY bucketing (the cutpoints 0/10 are fixed — NOT balance tunables). [PROV-Y26Q2].
 *
 * Mapping:
 *   rule_count === 0     → 'manual'     (no rules; coordinator is purely manual)
 *   1 <= rule_count <= 9 → 'basic'      (simple automation)
 *   rule_count >= 10     → 'autonomous' (highly automated)
 *
 * @param ruleCount — raw behavior_script rule-count (NEVER forwarded — P5 wall).
 * @returns ScriptComplexityBucket — the coordinator autonomy bucket.
 */
function deriveScriptComplexityBucket(ruleCount: number): ScriptComplexityBucket {
  if (ruleCount <= 0) return 'manual';
  if (ruleCount >= 10) return 'autonomous';
  return 'basic';
}
