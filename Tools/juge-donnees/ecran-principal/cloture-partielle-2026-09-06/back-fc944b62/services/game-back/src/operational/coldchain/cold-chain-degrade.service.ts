// IMPLEMENTS: docs/tech/04a_operational_systems/production_secondaries.md §Crick — cold-chain stimulant (a Crick
//             holding/cargo kept too warm loses grams over time; a cold building / refrigerated van preserves it) +
//             projects/mafia_city_game/gdd/14_tunable_constants.md §Operational chain — production
//             (coldchain.crick.degrade_grams_per_tick_{moderate,hot} — the M1 per-tick grams grounding, T5) +
//             docs/tech/04_city_simulation/composition_overview.md §NestJS — backend jeu (the CitySimSystem hook
//             contract — an operational tick-hook plugs into the SAME scheduler at a declared (cadence, order) slot) +
//             docs/tech/09_data_model/schema_operational_chain.md §2/§3 (product_storage / courier_shift — R9.3)
//             -- session:2026-06-04 (Phase 2b vector #2 — substances/Crick — Task 5) --
//
// `ColdChainDegradeService` — the COLD_CHAIN degrade tick (Phase-2b vector #2 — substances/Crick). It is an
// operational-chain tick-hook (NOT one of the 11 city-sim systems) registered on the EXISTING CitySimScheduler at
// {MINUTE, order 15 = COLD_CHAIN_DEGRADE} (the next FREE slot after OPERATIONAL_REPAIR/14 — verified against the
// canonical SCHEDULE). It mirrors OperationalRepairService's registration shape EXACTLY (OnApplicationBootstrap →
// registerCadence via the SAME registerSystem path), REPLACING the no-op placeholder there. This is the tick-hook
// PATTERN T1–T4 + the enforcement repair tick share.
//
// THE MINUTE/15 TICK (production_secondaries.md §Crick — cold-chain), per player, in TWO set-based UPDATEs (NO per-row
// loop, NO RNG — the ColdChainRepository owns the SQL):
//   - degrade WARM STORED Crick: every product_storage row of a COLD-CHAIN substance (registry-derived — Crick;
//     Brindle excluded) in a building that is NOT cold_storage_capable loses the MODERATE per-tick grams rate
//     (coldchain.crick.degrade_grams_per_tick_moderate), GUARDED ≥ 0.
//   - degrade WARM IN-TRANSIT Crick cargo: every in-transit courier_shift of a cold-chain substance on a courier that
//     is NOT a refrigerated_van loses the HOT per-tick grams rate (coldchain.crick.degrade_grams_per_tick_hot),
//     GUARDED ≥ 0 (HOT > MODERATE — the canon "exposed in transit degrades faster" ordering).
//   - COLD holdings (cold_storage_capable — a refinery / cold-opted stash) + refrigerated_van cargo are SKIPPED
//     (preserved — OPTIMAL_COLD). Brindle (coldChain=false) is NEVER selected.
//
// DETERMINISM (NO RNG): which rows degrade (the warm condition) + by how much (a fixed grams/tick from the grounded
// tunable) are FIXED functions of the persisted cold_storage_capable / vehicle_type + the grounded rates. Organically
// a no-op (no warm Crick — the common case: no Crick, or all Crick kept cold). R2.3: the rates are read ONLY from
// coldChainTunables (gdd/14 mirror — coldchain-tunables.ts); ZERO inline numeric literal here.

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId, type CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import { ColdChainRepository } from './cold-chain.repository';
import { coldChainTunables } from './coldchain-tunables';

@Injectable()
export class ColdChainDegradeService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ColdChainDegradeService.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly repo: ColdChainRepository,
  ) {}

  // ───────────────────────────── bootstrap: registration ─────────────────────────────

  onApplicationBootstrap(): void {
    this.registerCadence();
    this.logger.log(
      'ColdChainDegradeService registered at MINUTE/15 (COLD_CHAIN_DEGRADE) — each in-game minute it degrades the ' +
        "player's WARM cold-chain product set-based: a STORED Crick holding in a non-cold building loses the MODERATE " +
        'per-tick grams rate; an IN-TRANSIT Crick cargo on a non-refrigerated courier loses the HOT per-tick grams rate ' +
        '(both GUARDED ≥ 0). Cold holdings + refrigerated_van cargo are preserved; Brindle (coldChain=false) is never ' +
        'touched. Deterministic (NO RNG). Organically a no-op (no warm Crick).',
    );
  }

  /** Register the MINUTE/15 = COLD_CHAIN_DEGRADE slot (the SAME registerSystem path the repair hook uses at MINUTE/14). */
  private registerCadence(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.COLD_CHAIN_DEGRADE,
      cadence: Cadence.MINUTE,
      order: 15,
      run: (ctx) => this.runMinuteTick(ctx),
    });
  }

  // ───────────────────────────── the registered MINUTE/15 tick (cold-chain degrade) ─────────────────────────────

  /**
   * {MINUTE, order 15} — degrade the player's warm cold-chain product set-based. Two batched UPDATEs (warm stored
   * holdings at the MODERATE rate; warm in-transit cargo at the HOT rate), each GUARDED ≥ 0 and scoped to cold-chain
   * substances only (Brindle excluded). The rates are read from the gdd/14 mirror (R2.3 — no inline literal).
   * Deterministic (NO RNG). Organically a no-op (no warm Crick).
   */
  private async runMinuteTick(ctx: CitySimTickContext): Promise<void> {
    const moderate = Math.max(0, coldChainTunables.degradeGramsPerTickModerate);
    const hot = Math.max(0, coldChainTunables.degradeGramsPerTickHot);

    const holdingsDegraded = await this.repo.degradeWarmHoldings(ctx.playerId, moderate);
    const cargoDegraded = await this.repo.degradeWarmCargo(ctx.playerId, hot);

    if (holdingsDegraded > 0 || cargoDegraded > 0) {
      this.logger.log(
        `COLD_CHAIN_DEGRADE: player=${ctx.playerId} tick=${ctx.gameMinute} → ${holdingsDegraded} warm holding(s) ` +
          `(MODERATE) + ${cargoDegraded} warm cargo(es) (HOT) degraded (guarded ≥ 0; cold/refrigerated preserved).`,
      );
    }
  }
}
