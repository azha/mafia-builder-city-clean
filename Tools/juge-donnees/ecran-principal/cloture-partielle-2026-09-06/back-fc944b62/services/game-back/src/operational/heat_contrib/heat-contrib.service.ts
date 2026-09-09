// IMPLEMENTS: docs/tech/04_city_simulation/heat_propagation.md §Consommation des HeatInjectionEvents (the canonical
//             HeatInjectionEvent seam — an operational system emits, System Heat buffers + flushes onto buildings.heat)
//             + docs/tech/04a_operational_systems/production_brindle.md §Heat shadow (a completed cook adds heat to the
//             LAB) + docs/tech/04a_operational_systems/product_storage.md §Storage heat (a building holding product
//             radiates passive heat) + docs/tech/04a_operational_systems/selling_dealers_leks.md §How a deal works
//             (`+heat_per_deal_bucket` per deal at the dealer-spot) +
//             docs/tech/04_city_simulation/tick_schedule_and_memory_budget.md §Full tick schedule (the MINUTE band)
//             -- session:2026-06-04 (Phase 2 Task 7) --
//
// `HeatContribService` — the Phase-2 operational-chain → System-Heat COUPLING. It is the ONE producer that turns
// operational activity (cook / storage / deal) into HeatInjectionEvents on the canonical CityEventBus seam — the
// IDENTICAL path System 10's BufferOverflow re-emit + the production-gated test hook use (heat_propagation.md §Event
// consumers). It WRITES NOTHING to buildings.heat: it emits the qualitative-band event; the Phase-1
// HeatPropagationService (MINUTE/4) SUBSCRIBES, buffers it in-memory, and flushes it onto buildings.heat on its next
// tick (R9.3 — consume the Heat engine, never reimplement decay / propagation / escalation).
//
// THREE CONTRIBUTION POINTS (all on the SAME seam, all qualitative bands — never a raw scalar on the event, R2.2):
//   - COOK (point-emission): ProductionCookAdvanceService calls `emitCookHeat(playerId, labBuildingIds, gameMinute)`
//     AFTER a cook COMPLETES on the COOK_ADVANCE (MINUTE/8) tick — one MICRO injection per completed cook's lab.
//   - DEAL (point-emission): SellingSellService calls `emitDealHeat(playerId, dealerSpotBuildingIds, gameMinute)` AFTER
//     a dealer SELLS on the DEALER_SELL (MINUTE/10) tick — one LOW injection per selling dealer-spot.
//   - STORAGE (tick-driven): this service REGISTERS the MINUTE/12 OPERATIONAL_HEAT_CONTRIB slot; each minute it reads
//     the player's product-HOLDING buildings (product_storage > the min-grams gate) and emits one MICRO injection per
//     holding building — the passive "holding product radiates background heat" contribution.
//
// The magnitude BAND each source emits is a tunable (heat-contrib-tunables.ts — the M1 grounding of the ungrounded
// heat composites; [PROV-Y26Q2], FLAG VETO). The band IS the closed qualitative domain the Heat service maps to its
// internal delta (heat-propagation.service.ts INJECTION_DELTA) — System Heat owns the deltas, this service owns only
// the band choice (no scalar invented or surfaced here).
//
// DETERMINISM (NO RNG): which buildings contribute (cook completed / dealer sold / product held > gate) + the band
// (a fixed tunable) are FIXED functions of the persisted state + the grounded tunables. Organically a no-op (no cook
// completing, no dealer selling, no product held). Batched reads (the Phase-1 determinism discipline — no per-row
// queries); the emission is in-memory (the Heat service does the per-tick DB flush — never a per-event DB write).

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId, type CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import { CityEventBus, type HeatInjectionMagnitude, type HeatSource } from '../../citysim/events/city-event-bus';
import { HeatContribRepository, type BuildingDistrict } from './heat-contrib.repository';
import { heatContribTunables } from './heat-contrib-tunables';

@Injectable()
export class HeatContribService implements OnApplicationBootstrap {
  private readonly logger = new Logger(HeatContribService.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly repo: HeatContribRepository,
    private readonly bus: CityEventBus,
  ) {}

  // ───────────────────────────── bootstrap: registration ─────────────────────────────

  onApplicationBootstrap(): void {
    this.registerCadence();
    this.logger.log(
      'HeatContribService registered at MINUTE/12 (OPERATIONAL_HEAT_CONTRIB) — each in-game minute it emits a ' +
        `${heatContribTunables.storageMagnitude} HeatInjectionEvent per product-holding building (storage heat). The ` +
        `cook-completion (${heatContribTunables.cookCompletionMagnitude}) + per-deal ` +
        `(${heatContribTunables.dealMagnitude}) contributions are point-emissions at COOK_ADVANCE/8 + DEALER_SELL/10. ` +
        'All on the canonical HeatInjection seam — System Heat (MINUTE/4) buffers + flushes onto buildings.heat (this ' +
        'service writes nothing). Organically a no-op (no cook/deal/held product).',
    );
  }

  /** Register the MINUTE/12 = OPERATIONAL_HEAT_CONTRIB slot (the SAME registerSystem path the sell hook uses at /10). */
  private registerCadence(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.OPERATIONAL_HEAT_CONTRIB,
      cadence: Cadence.MINUTE,
      order: 12,
      run: (ctx) => this.runStorageTick(ctx),
    });
  }

  // ───────────────────────────── the registered MINUTE/12 tick (storage heat) ─────────────────────────────

  /**
   * {MINUTE, order 12} — emit a storage-magnitude HeatInjectionEvent per product-HOLDING building (product_storage >
   * the min-grams gate). Batch-reads the holdings (no per-row queries); emits one injection per building on the
   * CityEventBus (the Heat service buffers + flushes them next tick). Deterministic (NO RNG). Organically a no-op
   * (the player holds no product).
   */
  private async runStorageTick(ctx: CitySimTickContext): Promise<void> {
    const holdings = await this.repo.listStorageHoldings(ctx.playerId);
    if (holdings.length === 0) return; // no product held → clean no-op.

    const gate = Math.max(0, heatContribTunables.storageMinGrams);
    for (const h of holdings) {
      if (h.total_grams < gate) continue; // below the presence gate → no background heat this tick.
      this.emitInjection(
        ctx.playerId,
        h.district_id,
        h.building_id,
        heatContribTunables.storageMagnitude,
        'STORAGE_HEAT',
        ctx.gameMinute,
      );
    }
  }

  // ───────────────────────────── point-emissions (called by the cook / deal tick hooks) ─────────────────────────────

  /**
   * Emit a cook-completion HeatInjectionEvent on each completed cook's LAB building (production_brindle.md §Heat
   * shadow — a completed cook adds heat to the lab). Called by ProductionCookAdvanceService AFTER the cook completes
   * on the COOK_ADVANCE (MINUTE/8) tick. Resolves the lab buildings → their host districts (ONE batched query) and
   * emits one `cook_completion_magnitude` injection per lab. No-op for an empty list (no cook completed this tick).
   */
  async emitCookHeat(playerId: string, labBuildingIds: readonly string[], gameMinute: number): Promise<void> {
    await this.emitForBuildings(
      playerId,
      labBuildingIds,
      heatContribTunables.cookCompletionMagnitude,
      'COOK_HEAT',
      gameMinute,
    );
  }

  /**
   * Emit a per-deal HeatInjectionEvent on each selling dealer-spot building (selling_dealers_leks.md §How a deal works
   * — `+heat_per_deal_bucket` per deal). Called by SellingSellService AFTER a dealer sells on the DEALER_SELL
   * (MINUTE/10) tick. Resolves the dealer-spot buildings → their host districts (ONE batched query) and emits one
   * `deal_magnitude` injection per selling dealer-spot. No-op for an empty list (no dealer sold this tick).
   */
  async emitDealHeat(playerId: string, dealerSpotBuildingIds: readonly string[], gameMinute: number): Promise<void> {
    await this.emitForBuildings(
      playerId,
      dealerSpotBuildingIds,
      heatContribTunables.dealMagnitude,
      'LEK_DEAL',
      gameMinute,
    );
  }

  /**
   * Emit a per-tick GROW_HEAT HeatInjectionEvent on each grow_house building with an ACTIVE grow_session (04a/
   * building_types.md §grow_house — an active grow radiates the odeur / abnormal-electricity signature). Called by
   * GrowAdvanceService on the GROW_ADVANCE (MINUTE/18) tick AFTER it resolves which grow_houses currently host an active
   * grow. Resolves the buildings → their host districts (ONE batched query) and emits one `magnitude`-band injection per
   * active grow_house (the band is the caller's grow.heat_magnitude tunable — the R2.2-clean materialization of
   * grow.heat_per_tick_active; the seam carries the band, never the raw scalar). No-op for an empty list (no active grow
   * this tick → idle grow_houses radiate nothing). Behavior-preserving — a NEW attribution source on the SAME seam; the
   * cook/storage/deal emissions are untouched.
   */
  async emitGrowHeat(
    playerId: string,
    growHouseBuildingIds: readonly string[],
    magnitude: HeatInjectionMagnitude,
    gameMinute: number,
  ): Promise<void> {
    await this.emitForBuildings(playerId, growHouseBuildingIds, magnitude, 'GROW_HEAT', gameMinute);
  }

  /**
   * Emit a per-honor ASH_DEAL_HEAT HeatInjectionEvent on the honored appointment's Glass-venue building
   * (lot-4 TD-027 / production_secondaries.md:99: "precinct_alert_bucket Glass augmente d'un palier per deal"). The
   * highest-risk M1 transaction (the Ash luxury channel) now emits heat, closing the risk-inversion audit finding.
   * Called by AshAppointmentService AFTER the honor tx commits (inside `honor()`), with the appointment's
   * `glass_venue_building_id` as the sole building. The seam resolves building → district (ONE query) and emits ONE
   * `ashDealMagnitude` injection (low_medium by default). No-op if the list is empty (defensive — the caller always
   * passes one building). ADDITIVE: a new attribution source on the SAME canonical seam; all other heat sources unchanged.
   * IDEMPOTENCY: honor is single-shot guarded (the repo.executeHonor status='scheduled' flip — only one honor wins);
   * double-honor → 409 at the service level, so this emit is never double-called for the same appointment.
   */
  async emitAshDealHeat(playerId: string, glassVenueBuildingId: string, gameMinute: number): Promise<void> {
    await this.emitForBuildings(
      playerId,
      [glassVenueBuildingId],
      heatContribTunables.ashDealMagnitude,
      'ASH_DEAL_HEAT',
      gameMinute,
    );
  }

  /**
   * Emit a combat-assault HeatInjectionEvent on the raided rival-territory building (combat_mechanics.md §2.1
   * Percolation Break — combat is a NEW heat producer, DIV-B2 C5). Called by PercolationService AFTER the
   * combat raid resolves (REUSE the raid path — the BuildingRaidedEvent seam). ADDITIVE: a new attribution
   * source on the SAME canonical HeatInjection seam; existing producers (emitCookHeat/emitDealHeat/etc.) untouched.
   * C4: deterministic (no Math.random, no Date.now). gameMinute = game-time (NOT wall-clock).
   * P6/DIV-B2: mirrors emitCookHeat — the seam carries a qualitative band, never raw damage.
   * If buildingId is null/empty (dry raid — no building on the block), emits nothing (no heat on phantom buildings).
   */
  async emitCombatHeat(playerId: string, districtId: number, buildingId: string, gameMinute: number): Promise<void> {
    if (!buildingId) return; // dry raid → no building to emit heat on.
    this.emitInjection(playerId, districtId, buildingId, heatContribTunables.combatMagnitude, 'COMBAT_HEAT', gameMinute);
  }

  /**
   * Emit a MAINTENANCE_NEGLECT HeatInjectionEvent per lapsed-maintenance building (04f-A C6, D7 — weekly
   * additive). Called by `MaintenanceHeatService.emitWeeklyNeglectHeat` on the EXISTING WEEKLY/11 tick (no new
   * cadence slot). `magnitude` is resolved by the CALLER from the getter-driven `maintenance.heat_additive_
   * soft/hard_per_week` tunables via a nearest-band match (mirrors `emitGrowHeat`'s own caller-resolves-the-
   * band shape — the injection pipe only carries the closed MICRO/LOW/LOW_MEDIUM/MEDIUM vocabulary). Resolves
   * the buildings → their host districts (ONE batched query) and emits one injection per building. No-op for
   * an empty list (a fully-maintained fleet — the zero-regression contract).
   */
  async emitMaintenanceNeglectHeat(
    playerId: string,
    buildingIds: readonly string[],
    magnitude: HeatInjectionMagnitude,
    gameMinute: number,
  ): Promise<void> {
    await this.emitForBuildings(playerId, buildingIds, magnitude, 'MAINTENANCE_NEGLECT', gameMinute);
  }

  /**
   * Emit an EQUIPMENT_REPAIR HeatInjectionEvent per building currently `structural_state ∈ {'failed',
   * 'repairing'}` (04f-A C6, D7 — the nightly repair-window spike). Called by `MaintenanceHeatService.
   * emitNightlyRepairSpike` on the EXISTING NIGHTLY/21 tick (no new cadence slot). `magnitude` is resolved by
   * the CALLER from the `maintenance.failure_repair_heat_magnitude_band` getter (a direct band-string
   * tunable — mirrors `emitGrowHeat`'s own caller-resolves-the-band shape). Resolves the buildings → their
   * host districts (ONE batched query) and emits one injection per building. No-op for an empty list (no
   * failure/repair in flight — the zero-regression contract). C6 empirically verified this lands DIRECTLY on
   * the failed/repairing building's own building_id (maintenance-heat.service.ts header note): the CITY-STATE
   * `buildings.structural_state` column `HeatRepository.listBuildings` gates the MINUTE/4 flush on is
   * DISTINCT from the operational-chain column this spike targets, and stays 'operational' regardless of the
   * equipment-failure flip — no district-redirect needed.
   */
  async emitEquipmentRepairHeat(
    playerId: string,
    buildingIds: readonly string[],
    magnitude: HeatInjectionMagnitude,
    gameMinute: number,
  ): Promise<void> {
    await this.emitForBuildings(playerId, buildingIds, magnitude, 'EQUIPMENT_REPAIR', gameMinute);
  }

  // ───────────────────────────── internals ─────────────────────────────

  /** Resolve the buildings → districts (batched) and emit one injection of `magnitude`/`source` per resolved building. */
  private async emitForBuildings(
    playerId: string,
    buildingIds: readonly string[],
    magnitude: HeatInjectionMagnitude,
    source: HeatSource,
    gameMinute: number,
  ): Promise<void> {
    if (buildingIds.length === 0) return;
    // De-dupe the building ids (a tick may produce the same building more than once — e.g. two dealers at one spot).
    const unique = [...new Set(buildingIds)];
    const resolved: BuildingDistrict[] = await this.repo.resolveDistricts(playerId, unique);
    for (const b of resolved) {
      this.emitInjection(playerId, b.district_id, b.building_id, magnitude, source, gameMinute);
    }
  }

  /** Emit ONE HeatInjectionEvent on the canonical CityEventBus seam (the Heat service buffers + flushes it next tick). */
  private emitInjection(
    playerId: string,
    districtId: number,
    buildingId: string,
    magnitude: HeatInjectionMagnitude,
    source: HeatSource,
    gameMinute: number,
  ): void {
    this.bus.emitHeatInjection({
      type: 'heat_injection',
      playerId,
      districtId,
      buildingId,
      magnitude,
      source,
      gameMinute,
    });
  }
}
