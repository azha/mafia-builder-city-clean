// IMPLEMENTS: docs/tech/04a_operational_systems/production_secondaries.md §Hush — addiction-loyalty (the per-day
//             addiction-loyalty bucket decay + the WITHDRAWAL_EVENT after a dry window) +
//             docs/superpowers/specs/2026-06-05-phase-02b-hush-addiction-design.md §3 (decay + withdrawal clauses) +
//             docs/tech/04_city_simulation/composition_overview.md §NestJS — backend jeu (the CitySimSystem hook
//             contract — an operational tick-hook plugs into the SAME scheduler at a declared (cadence, order) slot) +
//             docs/tech/09_data_model/schema_operational_chain.md §7.9.2 (hush_addiction — R9.3, READ + mutate)
//             -- session:2026-06-05 (Phase 2b vector #2b — substances/Hush — Task 5) --
//
// `HushAddictionAdvanceService` — the HUSH_ADDICTION decay/withdrawal tick (Phase-2b vector #2b — substances/Hush). It
// is an operational-chain tick-hook (NOT one of the 11 city-sim systems) registered on the EXISTING CitySimScheduler
// at {MINUTE, order 16 = HUSH_ADDICTION} (the next FREE slot after COLD_CHAIN_DEGRADE/15). It mirrors
// ColdChainDegradeService's registration shape EXACTLY (OnApplicationBootstrap → registerCadence via the SAME
// registerSystem path), REPLACING the no-op placeholder there. This is the operational tick-hook PATTERN T1–T4 share.
//
// THE MINUTE/16 TICK (production_secondaries.md §Hush — the addiction bucket decays + a starved DEPENDENT spot
// withdraws), per player, in TWO DISJOINT set-based UPDATEs (NO per-row loop, NO RNG — the HushAddictionRepository owns
// the SQL):
//   - DECAY un-served SUB-DEPENDENT spots: every hush_addiction row that is NOT DEPENDENT (loyalty_score < dependent)
//     and did NOT sell this tick (last_hush_deal_tick < currentTick) loses the per-tick decay (GUARDED ≥ 0) — its
//     loyalty drifts back toward NEW.
//   - WITHDRAW starved DEPENDENT spots: every DEPENDENT row (loyalty_score ≥ dependent) gone dry past the withdrawal
//     window collapses to established−1 + withdrawn=true (the boost lost). A DEPENDENT spot is STICKY — it HOLDS its
//     score until starved past the window, then COLLAPSES (the canon "sticky demand, then sharp withdrawal").
// The two WHERE clauses are DISJOINT (`< dependent` vs `>= dependent`), so the decay-then-withdraw composition is
// correct + both effects observable (design §3 — see the repository header for the full reconciliation). A spot that
// sold THIS tick has last_hush_deal_tick = currentTick (the DEALER_SELL/10 accumulation stamps it earlier in the same
// minute), so the decay correctly SKIPS spots that sold this tick.
//
// DETERMINISM (NO RNG): which rows decay/withdraw (the band + dry condition) + by how much (a fixed integer step / a
// fixed collapse target) are FIXED functions of the persisted loyalty_score / last_hush_deal_tick + the gdd/14 mirror
// values. Organically a no-op (no Hush addiction row — the common case). R2.3: the cut-points / decay / window are read
// ONLY from hushAddictionTunables (gdd/14 mirror); ZERO inline numeric literal here.

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId, type CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import { HushAddictionRepository } from './hush-addiction.repository';
import { hushAddictionTunables } from './hush-addiction-tunables';

@Injectable()
export class HushAddictionAdvanceService implements OnApplicationBootstrap {
  private readonly logger = new Logger(HushAddictionAdvanceService.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly repo: HushAddictionRepository,
  ) {}

  // ───────────────────────────── bootstrap: registration ─────────────────────────────

  onApplicationBootstrap(): void {
    this.registerCadence();
    this.logger.log(
      'HushAddictionAdvanceService registered at MINUTE/16 (HUSH_ADDICTION) — each in-game minute it decays the ' +
        "player's un-served SUB-DEPENDENT Hush loyalty spots toward NEW (GUARDED ≥ 0) and WITHDRAWS any DEPENDENT spot " +
        'starved past the withdrawal window (collapse to established−1 + withdrawn=true, the boost lost), set-based + ' +
        'disjoint (a DEPENDENT spot is sticky — holds until withdrawal). Runs AFTER COLD_CHAIN_DEGRADE/15 + DEALER_SELL' +
        '/10 (the accumulation stamps last_hush_deal_tick=currentTick, so a sold spot never decays this tick). ' +
        'Deterministic (NO RNG). Organically a no-op (no Hush addiction row).',
    );
  }

  /** Register the MINUTE/16 = HUSH_ADDICTION slot (the SAME registerSystem path the cold-chain hook uses at MINUTE/15). */
  private registerCadence(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.HUSH_ADDICTION,
      cadence: Cadence.MINUTE,
      order: 16,
      run: (ctx) => this.runMinuteTick(ctx),
    });
  }

  // ───────────────────────────── the registered MINUTE/16 tick (Hush addiction decay/withdrawal) ─────────────────────────────

  /**
   * {MINUTE, order 16} — decay + withdraw the player's Hush addiction loyalty set-based. Two disjoint batched UPDATEs
   * (decay un-served sub-dependent spots; withdraw starved DEPENDENT spots), both GUARDED ≥ 0. The cut-points / decay
   * step / withdrawal window are read from the gdd/14 mirror (R2.3 — no inline literal). Deterministic (NO RNG).
   * Organically a no-op (no Hush addiction row).
   */
  private async runMinuteTick(ctx: CitySimTickContext): Promise<void> {
    const decayPerTick = Math.max(0, hushAddictionTunables.decayPerTick);
    const dependentScore = hushAddictionTunables.dependentScore;
    const establishedScore = hushAddictionTunables.establishedScore;
    const withdrawalPeriodTicks = Math.max(1, hushAddictionTunables.withdrawalPeriodTicks);

    const { withdrawn, decayed } = await this.repo.decayAndWithdraw(
      ctx.playerId,
      decayPerTick,
      dependentScore,
      withdrawalPeriodTicks,
      ctx.gameMinute,
      establishedScore,
    );

    if (withdrawn > 0 || decayed > 0) {
      this.logger.log(
        `HUSH_ADDICTION: player=${ctx.playerId} tick=${ctx.gameMinute} → ${withdrawn} DEPENDENT spot(s) withdrew ` +
          `(collapse to established−1) + ${decayed} sub-dependent spot(s) decayed (guarded ≥ 0; served spots skipped).`,
      );
    }
  }
}
