// IMPLEMENTS: docs/superpowers/specs/2026-06-06-phase-03-grow-house-design.md §4-T3 (the GROW_ADVANCE tick @ MINUTE/18
//             — a planted grow_session walks stage_1→stage_2→stage_3→completed by grow.stage_duration_ticks; mirrors
//             cook-advance) + §6 (tick ordering: MINUTE/18, after APPOINTMENT_EXPIRE/17, the next free slot; set-based
//             single sweep; guarded; no RNG; deterministic) +
//             docs/tech/04_city_simulation/composition_overview.md §NestJS — backend jeu (the CitySimSystem hook
//             contract — an operational tick-hook plugs into the SAME scheduler at a declared (cadence, order) slot) +
//             docs/tech/09_data_model/schema_operational_chain.md §7.11 (grow_session — R9.3, READ + mutate; the table
//             T0 landed) + projects/mafia_city_game/gdd/14_tunable_constants.md §Phase-3 vector #3 (grow_house) T0
//             (grow.stage_duration_ticks — R2.3, the per-stage clock; the test stack shrinks it via the
//             GROW_STAGE_DURATION_TICKS env knob)
//             -- session:2026-06-06 (Phase 3 vector #3 — grow_house — Task 3) --
//
// `GrowAdvanceService` — the GROW_ADVANCE grow-cycle tick (Phase-3 vector #3 — grow_house cultivation). It is an
// operational-chain tick-hook (NOT one of the 11 city-sim systems) registered on the EXISTING CitySimScheduler at
// {MINUTE, order 18 = GROW_ADVANCE} (the next FREE slot after APPOINTMENT_EXPIRE/17). It mirrors
// AshAppointmentAdvanceService's registration shape EXACTLY (OnApplicationBootstrap → registerCadence via the SAME
// registerSystem path), REPLACING the no-op placeholder there. This is the operational tick-hook PATTERN the
// cook-advance / cold-chain / hush / appointment / precursor-arrival hooks share.
//
// THE GROW MACHINE IS THE SIBLING OF COOK-ADVANCE (NOT a fork): a grow_session is to precursor_stock what a cook_session
// is to product_storage — the same tick-driven stage-machine shape. THIS service ships the STAGE WALK (T3) + the HARVEST
// (T5): each in-game minute it advances every in-progress grow_session (current_stage <> 'completed') whose CURRENT
// stage's uniform duration (grow.stage_duration_ticks) has elapsed, by EXACTLY ONE grow stage, in ONE set-based UPDATE
// (the GrowRepository owns the SQL — a deterministic CASE: stage_1→stage_2→stage_3→completed; re-anchor
// stage_started_at_tick = currentTick; CLEAR tended_in_stage = NULL so the new stage is tendable again).
//
// HARVEST (T5 — the husbandry payoff, lever B): the grows that TRANSITION to 'completed' THIS tick (the advance UPDATE
// returns the per-row new stage) are HARVESTED in the SAME tick: the PURE GrowYieldService derives each one's yield
// grams from its persisted tend_count (tend_count → WITHERED/STANDARD/BUMPER tier → grow.yield_grams[tier], R2.3 from
// gdd/14; deterministic, NO RNG), the repo UPSERTs those grams into precursor_stock for the grow's (player, building,
// precursor_type) — MIRRORING the precursor-arrival upsert (source-agnostic; the harvest is just ANOTHER writer of
// precursor_stock, feeding the existing Crick/Hush/Ash cook chains) — and DELETES the grow_session (finalize; the
// building is free to re-plant). Set-based, once per completing grow, atomic (a grow is never deleted without its grams
// landing). CRITICAL: only grows that TRANSITIONED to 'completed' this tick are harvested — a grow seeded directly at
// 'completed' that the tick never transitioned is NEVER selected (it is excluded by the advance's
// current_stage <> 'completed' predicate), preserving the T3 "COMPLETED STOPS" guarantee.
//
// DETERMINISM (NO RNG): which grows advance (the elapsed predicate) + the next stage (the fixed CASE) are a FIXED
// function of the persisted stage_started_at_tick + the player's current tick + the grounded grow.stage_duration_ticks
// (R2.3 — read from the registry/env, never inline). Organically a no-op (no in-progress grow — the common case: no
// grow_house planted, or every grow still inside its current stage's clock). A partial advance (the stage clock NOT yet
// elapsed) NEVER skips a stage; each MINUTE tick advances AT MOST one stage per grow, so a 3-stage grow cascades over its
// full cycle (stage_1 @+duration → stage_2, …, stage_3 @+3×duration → completed). Brindle/Crick/Hush/Ash have no
// grow_session → never touched (no behavioral change to any existing tick). R9.3: reads ONLY the persisted grow_session
// row — ZERO schema change (T0 landed the table).

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId, type CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import { HeatContribService } from '../heat_contrib/heat-contrib.service';
import { GrowRepository, type GrowHarvest } from './grow.repository';
import { GrowYieldService } from './grow-yield.service';
import { growTunables } from './grow-tunables';
// 04f-A C2 (D1/D5) — the pure output-fold multiplier + its batched D1-anchor lookup (GROW_ADVANCE's
// stage-walk UPDATE does not already JOIN building_operational_state, unlike COOK_ADVANCE) + the SAME
// game-day derivation the D1 anchor uses (deriveGameDay).
import { MaintenanceRepository } from '../maintenance/maintenance.repository';
import { MaintenancePhaseService } from '../maintenance/maintenance-phase.service';
import { citySimTunables } from '../../citysim/citysim-tunables';
import { deriveGameDay } from '../political/political-trigger-evaluators';

@Injectable()
export class GrowAdvanceService implements OnApplicationBootstrap {
  private readonly logger = new Logger(GrowAdvanceService.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly repo: GrowRepository,
    private readonly yield_: GrowYieldService,
    // T6 — the A stakes (heat): REUSE the Phase-2 operational → System-Heat coupling. The grow tick emits a GROW_HEAT
    // HeatInjectionEvent per active grow_house on the SAME canonical seam the cook/storage/deal contributions use; the
    // Phase-1 Heat service buffers + flushes it onto buildings.heat (this service writes NO heat — R9.3, no new heat logic).
    private readonly heatContrib: HeatContribService,
    // 04f-A C2 (D1/D5) — the batched D1-anchor lookup for the completing grows' buildings + the PURE output-fold
    // multiplier. GrowModule imports MaintenanceModule (C2, which EXPORTS both).
    private readonly maintenanceRepo: MaintenanceRepository,
    private readonly maintenancePhase: MaintenancePhaseService,
  ) {}

  // ───────────────────────────── bootstrap: registration ─────────────────────────────

  onApplicationBootstrap(): void {
    this.registerCadence();
    this.logger.log(
      'GrowAdvanceService registered at MINUTE/18 (GROW_ADVANCE) — each in-game minute it advances every in-progress ' +
        "grow_session (current_stage <> 'completed') whose stage clock has elapsed (stage_started_at_tick + " +
        'grow.stage_duration_ticks <= currentTick) ONE grow stage (stage_1→stage_2→stage_3→completed), set-based (ONE ' +
        'UPDATE; a deterministic CASE), re-anchoring stage_started_at_tick = currentTick + clearing tended_in_stage ' +
        '(the new stage is tendable again). Runs AFTER APPOINTMENT_EXPIRE/17. A grow that TRANSITIONS to completed this ' +
        'tick is HARVESTED (T5): its yield grams (tend_count → WITHERED/STANDARD/BUMPER tier, pure/deterministic) are ' +
        'UPSERTed into precursor_stock + the session is finalized (deleted). Sibling of COOK_ADVANCE/8 (yields a ' +
        'precursor, not a product). Deterministic (NO RNG). Organically a no-op (no in-progress grow).',
    );
  }

  /** Register the MINUTE/18 = GROW_ADVANCE slot (the SAME registerSystem path the appointment hook uses at MINUTE/17). */
  private registerCadence(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.GROW_ADVANCE,
      cadence: Cadence.MINUTE,
      order: 18,
      run: (ctx) => this.runMinuteTick(ctx),
    });
  }

  // ───────────────────────────── the registered MINUTE/18 tick (grow-cycle advance) ─────────────────────────────

  /**
   * {MINUTE, order 18} — advance the player's in-progress grows one stage set-based. ONE batched UPDATE (the
   * GrowRepository owns the SQL), GUARDED by the current_stage <> 'completed' AND stage-clock-elapsed predicate.
   * Deterministic (NO RNG). Organically a no-op (no in-progress grow whose stage clock has elapsed). ctx.gameMinute is
   * the in-game minute AFTER this boundary — the same tick value a grow's stage_started_at_tick is anchored against
   * (started_at_tick = stage_started_at_tick = the clock's game_minute at plant time). grow.stage_duration_ticks is read
   * from the registry/env (R2.3 — the test stack shrinks it via GROW_STAGE_DURATION_TICKS so the cycle is observable
   * fast; prod default 1800 byte-unchanged). HARVEST of a completed grow (the yield into precursor_stock) is T5, NOT here.
   */
  private async runMinuteTick(ctx: CitySimTickContext): Promise<void> {
    // 0) HEAT (T6 — the make-vs-buy A stakes): emit a GROW_HEAT HeatInjectionEvent per grow_house with an ACTIVE grow
    //    (current_stage <> 'completed', on an OPERATIONAL building) on the canonical seam — REUSING the Phase-2 coupling
    //    (HeatContribService); the Heat service buffers + flushes it onto buildings.heat next tick, climbing the building's
    //    raid-risk band above an idle grow_house. The band is grow.heat_magnitude (R2.3, the R2.2-clean materialization of
    //    grow.heat_per_tick_active — the seam carries the band, never the raw scalar). Read BEFORE the advance/harvest so a
    //    grow active THIS tick still radiated (a grow completing this tick was hot up to its harvest). Idle / DAMAGED
    //    grow_houses (the list gates on active + operational) radiate nothing → organically a no-op. Behavior-preserving:
    //    a NEW source on the existing seam; the cook/storage/deal heat is untouched.
    const activeGrowBuildingIds = await this.repo.listActiveGrowBuildingIds(ctx.playerId);
    if (activeGrowBuildingIds.length > 0) {
      await this.heatContrib.emitGrowHeat(
        ctx.playerId,
        activeGrowBuildingIds,
        growTunables.heatMagnitude,
        ctx.gameMinute,
      );
    }

    // 1) STAGE WALK (T3): advance every in-progress grow whose stage clock has elapsed ONE stage (NOW gated on the
    //    grow_house being structurally OPERATIONAL — a DAMAGED grow_house PAUSES its grow, cook-style; T6). Returns the
    //    advanced rows with their POST-update stage + the harvest-relevant columns.
    const advanced = await this.repo.advanceGrowStagesDue(
      ctx.playerId,
      ctx.gameMinute,
      growTunables.stageDurationTicks,
    );
    if (advanced.length === 0) return; // clean no-op (no advanceable grow — none elapsed, or all on DAMAGED buildings).

    // 2) HARVEST (T5): the grows that TRANSITIONED to 'completed' THIS tick (NOT a sweep of pre-existing 'completed'
    //    rows — preserving the T3 "COMPLETED STOPS" guarantee). For each, derive the yield grams from its tend_count via
    //    the PURE GrowYieldService (tend_count → tier → grams; deterministic, R2.3) and UPSERT them into precursor_stock
    //    + finalize (delete) the grow_session — set-based, once per completing grow, atomic.
    const completing = advanced.filter((g) => g.new_stage === 'completed');
    // 04f-A C2 (D1/D5) — the OUTPUT FOLD, the grow-harvest equivalent of the cook-advance fold: a batched D1-anchor
    // lookup for exactly the completing buildings (GROW_ADVANCE's stage-walk UPDATE does not already JOIN
    // building_operational_state, unlike COOK_ADVANCE — one extra query, still batched, never per-row). Empty input
    // → empty Map, no query issued.
    const maintenanceAnchors =
      completing.length > 0
        ? await this.maintenanceRepo.getAnchorsForBuildings(completing.map((g) => g.building_id))
        : new Map();
    const currentGameDay = deriveGameDay(ctx.gameMinute, citySimTunables.inGameDayLengthMinutes);
    const harvests: GrowHarvest[] = completing.map((g) => {
      // The yield grams = a PURE function of (tend_count, grow.stage_count) — the husbandry payoff (WITHERED/STANDARD/
      // BUMPER → grow.yield_grams[tier], R2.3 from gdd/14; no RNG). The harvested grams land in precursor_stock.
      const baseYieldGrams = this.yield_.yieldGramsForTendCount(g.tend_count, growTunables.stageCount);
      const anchor = maintenanceAnchors.get(g.building_id);
      const daysOverdue = this.maintenancePhase.deriveDaysOverdue(
        currentGameDay,
        anchor?.lastMaintainedAtGameDay ?? null,
        anchor?.maintenanceDueInDays ?? 0,
      );
      // At days_overdue=0 (a maintained grow_house) the multiplier is EXACTLY 1.0 → yield_grams is BYTE-IDENTICAL
      // to the pre-04f-A value (the zero-regression contract, design §13).
      const yieldGrams = Math.round(baseYieldGrams * this.maintenancePhase.maintenanceOutputMultiplier(daysOverdue));
      return {
        grow_session_id: g.grow_session_id,
        building_id: g.building_id,
        precursor_type: g.precursor_type,
        yield_grams: yieldGrams,
      };
    });

    const stagesAdvanced = advanced.length;
    let harvested = 0;
    if (harvests.length > 0) {
      harvested = await this.repo.applyHarvestBatch(ctx.playerId, harvests);
    }

    this.logger.log(
      `GROW_ADVANCE: player=${ctx.playerId} tick=${ctx.gameMinute} → ${stagesAdvanced} grow_session(s) advanced one ` +
        `stage (tended_in_stage cleared)` +
        (harvested > 0
          ? `; ${harvested} reached completed → HARVESTED (yield grams by tend_count tier UPSERTed into precursor_stock, ` +
            'session finalized — building free to re-plant).'
          : '.'),
    );
  }
}
