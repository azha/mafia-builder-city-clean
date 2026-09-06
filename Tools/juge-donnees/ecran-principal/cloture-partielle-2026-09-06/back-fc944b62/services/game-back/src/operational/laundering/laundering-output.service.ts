// IMPLEMENTS: docs/tech/04a_operational_systems/laundering_pipeline.md §Stage 2 — front shop output ("Une fois cash
//             absorbé par le front (recorded as legitimate revenue), il move au stage suivant avec cleanliness") +
//             §Stage 4 — clean cash holding (cash atteint cleanliness ≥ full_clean_threshold → holdable, credited to
//              the player's balance) + §Throughput Trilemma (the dwell-tax = the modest cut, "pay en dwell") +
//             docs/tech/04_city_simulation/system_8_dwell_time_tax.md §Update tick (the cleanliness_at_output the
//              clean-output tick READS — CONSUMED, never recomputed) +
//             docs/tech/04_city_simulation/tick_schedule_and_memory_budget.md §Full tick schedule (the MINUTE band) +
//             docs/tech/09_data_model/schema_pipeline_and_laundering.md §2 (laundering_nodes — R9.3) +
//             docs/tech/09_data_model/schema_player_economy_state.md §2 (economy_states.cash_cents — R9.3)
//             -- session:2026-06-03 (Phase 2 Task 6) --
//
// `LaunderingOutputService` — the OPERATIONAL tick-hook that RELEASES laundered Stage-1 cash to the wallet. It is NOT
// one of the 11 city-sim systems; it is an operational-chain advancer that plugs into the SAME CitySimScheduler (the
// registry contract). It mirrors SellingSellService's / DistributionTransitService's registration shape EXACTLY
// (OnApplicationBootstrap → registerCadence via the SAME registerSystem path), REPLACING the no-op placeholder the
// scheduler seeds at the MINUTE/11 = LAUNDER_OUTPUT slot (after DEALER_SELL at MINUTE/10). This is the tick-hook
// PATTERN T1–T5 share.
//
// THE MINUTE/11 TICK (laundering_pipeline.md §Stage 2 / §Stage 3 / §Stage 4 — cash flows stage→stage, cleaning as it
// goes, until the terminal node releases it to the wallet), per player — TWO ordered phases:
//
//   PHASE A — ROUTE (Phase 2b — the non-terminal hops; §Stage 2 "il move au stage suivant" + §Stage 3 node→node):
//     BATCH-READ every NON-TERMINAL node's buffered cash ready to move ONE hop downstream (a node with an outgoing
//     laundering_edge AND current_occupancy > 0 — listRoutableHops, ONE query). For each hop, DRAIN the from-node to 0
//     and CREDIT the to-node by the routed cents = buffered − the per-HOP dwell-tax cut (the SAME modest cut the
//     §Throughput Trilemma "pay en dwell" levies each hop; the cut is RETAINED/consumed, never re-credited). Applied in
//     ONE batched, set-based transaction (applyRoutes). The cleanliness GAIN is NOT written here — it is a DETERMINISTIC
//     function of the to-node's stage_index (pipelineCleanlinessForStage; System 8 owns the per-node cleanliness_at_output
//     float, which it clobbers each MINUTE/2 — so the pipeline progression is derived, not stored).
//
//   PHASE B — RELEASE (the terminal node — §Stage 4, clean cash reaches the wallet; T6's UNCHANGED behavior):
//     BATCH-READ all RELEASABLE TERMINAL nodes (NO outgoing edge AND current_occupancy > 0 AND cleanliness_at_output >=
//     the clean band — listReleasableNodes, ONE query). The cleanliness_at_output is the [0,1] float SYSTEM 8 RECOMPUTES
//     every MINUTE/2 tick (CONSUMED — this tick READS it, NEVER recomputes Little's Law / dwell / cleanliness; that math
//     lives in DwellTimeService). For each, split the buffered cents (`current_occupancy`) into the WALLET CREDIT + the
//     DWELL-TAX CUT (the modest laundering cost — the cut is RETAINED/consumed), credit economy_states.cash_cents by the
//     sum of the wallet credits and zero each node's `tail_risk_estimates.current_occupancy` — in ONE batched, set-based
//     transaction (`buffer_load` re-syncs to 0 on System 10's next MINUTE/3 tick). The cut math is a DETERMINISTIC
//     integer-cents floor (see below) so cash conserves exactly.
//
// PHASE ORDER (A before B) — a routed hop's cash lands at the to-node THIS tick but is NOT released in the SAME tick:
// the to-node's cleanliness_at_output (the release gate) is recomputed by System 8 (MINUTE/2) BEFORE this MINUTE/11
// tick reads it, but the routed cash arrives only DURING Phase A here — so the routed cents sit at the to-node until the
// NEXT advance cleans + (if terminal) releases them. A cent therefore visibly walks the pipeline ONE node per tick
// (deterministic hop-by-hop), reaching the wallet only at the terminal node, exactly as the spec's Stage-by-Stage model.
//
// CASH CONSERVATION (the load-bearing invariant of the capstone loop): for each node, buffered_cents = wallet_credit +
// dwell_tax_cut, where dwell_tax_cut = floor(buffered_cents × dwell_tax_rate) and wallet_credit = buffered_cents -
// dwell_tax_cut. The split is INTEGER cents (floor), so NO fractional cent is created or lost: every cent that entered
// the node (from the safehouse drain at inject) leaves it either to the wallet (cleaned) or as the retained cut (the
// laundering fee — consumed, never re-credited). The safehouse→node→wallet path conserves cash to the cent.
//
// WHY THE NODE CLEANS WITHOUT A CONTINUOUS INFLOW (System 8 CONSUMED): an M1 Stage-1 node has throughput_in_per_hour=0
// (a single inject, no continuous λ). System 8's idle-node dwell guard sets dwell = dwell_time_per_node_hr (the cash
// sits at rest), so cleanliness_at_output = min(1, dwell / dwell_time_per_node_hr) = 1.0 — the cash is fully laundered
// after the next MINUTE/2 tick. So a single inject + one advance past System 8's tick → the node reaches CLEAN and
// this tick releases it. The dwell-time MECHANIC (the laundered-over-time cost) is System 8's; this tick only gates
// the release on the band System 8 produced. NO RNG.
//
// DETERMINISM (NO RNG): which nodes release (current_occupancy > 0 + cleanliness >= band) + how much (the floor
// split) are FIXED functions of the persisted node floats + the grounded tunables. Organically a no-op (no releasable
// node).
//
// P3-E C3 (★#2) — the demolition-mandate EFFICIENCY-PENALTY TEETH: this is Site 2 of EXACTLY 2 frozen output sites
// (R13, C0/plan §C3 — the OTHER is the production cook yield). The terminal RELEASE (Phase B — "le payout
// front-shop EST ce crédit", NOT a 3rd site) is the ONE laundering output site: when the OWNING player's
// `friction_budget_state.efficiency_penalty_active` is true (DemolitionModule C2), each releasing node's clean
// credit is scaled by `demolitionEfficiencyPenaltyMultiplierBaseline` (default 0.85 — DERIVED, NEVER stored,
// D4/divergence #2), rounded the SAME way the cook-yield fold rounds (Math.round). PHASE A (the inter-node routing
// hops) is untouched — it is not an output realization, only the terminal release is.

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId, type CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import { LaunderingRepository } from './laundering.repository';
import { launderingTunables, pipelineCleanlinessForStage } from './laundering-tunables';
// P3-E C3 (★#2) — Site 2 of the 2 R13-frozen output sites: FrictionBudgetRepository.getRow reads the player-keyed
// `efficiency_penalty_active` flag (DemolitionModule, C2) and coreLoopsTunables derives the baseline multiplier
// (never stored — D4/divergence #2, DD-E3 — no effect-engine PLAYER-scope row).
import { FrictionBudgetRepository } from '../../core_loops/demolition/friction-budget.repository';
import { coreLoopsTunables } from '../../core_loops/core-loops-tunables';

@Injectable()
export class LaunderingOutputService implements OnApplicationBootstrap {
  private readonly logger = new Logger(LaunderingOutputService.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly repo: LaunderingRepository,
    // P3-E C3 (★#2) — the friction-penalty flag read (player-keyed, DemolitionModule C2, EXPORTS
    // FrictionBudgetRepository). Required (not @Optional): DemolitionModule is unconditionally wired
    // app-wide (app.module.ts) and LaunderingModule imports it directly for this dependency — every
    // environment that boots LaunderingModule has it available.
    private readonly frictionBudget: FrictionBudgetRepository,
  ) {}

  // ───────────────────────────── bootstrap: registration ─────────────────────────────

  onApplicationBootstrap(): void {
    this.registerCadence();
    this.logger.log(
      'LaunderingOutputService registered at MINUTE/11 (LAUNDER_OUTPUT) — each in-game minute it (A) ROUTES every ' +
        'non-terminal pipeline node\'s buffered cash ONE hop downstream (drain the from-node, credit the next by ' +
        'buffered × (1 - dwell_tax_rate); the per-hop cut retained) and (B) RELEASES the laundered cash of every ' +
        'TERMINAL node whose cleanliness_at_output (System 8 — CONSUMED, read not recomputed) reached the clean band: ' +
        'credits economy_states.cash_cents by buffered_cents × (1 - dwell_tax_rate) and zeroes ' +
        'tail_risk_estimates.current_occupancy (buffer_load re-syncs to 0 on System 10\'s next tick), in batched ' +
        'set-based SQL (Phase-1 determinism). A lone Stage-1 node is terminal (no outgoing edge) → it releases exactly ' +
        'as in T6. Organically a no-op (no routable hop AND no releasable terminal node).',
    );
  }

  /** Register the MINUTE/11 = LAUNDER_OUTPUT slot (the SAME registerSystem path the sell hook uses at MINUTE/10). */
  private registerCadence(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.LAUNDER_OUTPUT,
      cadence: Cadence.MINUTE,
      order: 11,
      run: (ctx) => this.runMinuteTick(ctx),
    });
  }

  // ───────────────────────────── the registered MINUTE/11 tick ─────────────────────────────

  /**
   * {MINUTE, order 11} — advance the laundering pipeline ONE hop + release terminal clean cash. TWO ordered phases:
   *
   *   PHASE A — ROUTE (Phase 2b): batch-read every NON-TERMINAL node's buffered cash ready to move one hop downstream
   *     (an outgoing edge + current_occupancy > 0); for each, route buffered − the per-HOP dwell-tax cut to the next
   *     node, draining the from-node — in ONE batched transaction (the cut is retained/consumed each hop).
   *   PHASE B — RELEASE (T6 UNCHANGED): batch-read the releasable TERMINAL nodes (no outgoing edge + current_occupancy
   *     > 0 + cleanliness_at_output >= the clean band, the System-8 float CONSUMED); for each, split the buffered cents
   *     into the wallet credit + the retained dwell-tax cut (deterministic integer floor — cash conserves), credit the
   *     wallet by the total and zero each node's `tail_risk_estimates.current_occupancy` — in ONE batched transaction
   *     (buffer_load re-syncs to 0 on System 10's next MINUTE/3 tick).
   *
   * The SAME deterministic integer-floor cut governs BOTH a routing hop AND the terminal release — every cent that
   * entered a node leaves it either onward/to-the-wallet or as the retained cut, so cash conserves to the cent end to
   * end (a 4-stage pipeline pays the cut 3× over the hops + 1× at the terminal release). Deterministic (NO RNG).
   * Organically a no-op (no routable hop AND no releasable terminal node).
   */
  private async runMinuteTick(ctx: CitySimTickContext): Promise<void> {
    const rate = Math.max(0, Math.min(1, launderingTunables.dwellTaxRate));

    // ── PHASE A — ROUTE one hop downstream (Phase 2b — non-terminal nodes). Drain each from-node, credit the next.
    const hops = await this.repo.listRoutableHops(ctx.playerId);
    if (hops.length > 0) {
      const routes = hops.map((h) => {
        // DETERMINISTIC integer split (cash conservation per hop): cut = floor(buffered × rate); routed = buffered − cut.
        const cut = Math.floor(h.buffered_cents * rate);
        const routedCents = h.buffered_cents - cut; // moves to the next stage; the cut is retained (consumed).
        return { from_node: h.from_node, to_node: h.to_node, routed_cents: routedCents };
      });
      await this.repo.applyRoutes(ctx.playerId, routes);
    }

    // ── PHASE B — RELEASE the terminal nodes whose cash reached the clean band.
    // lot-4 TD-023: DUAL GATE — (1) the System-8 cleanliness_at_output float (consumed from DwellTimeService) AND
    // (2) the STAGE-DERIVED cleanliness (pipelineCleanlinessForStage(stage_index) >= fullCleanThreshold). The stage gate
    // ensures a Stage-1 (0.40) or Stage-2 (0.65) node cannot release even if System 8's float is anomalously high.
    // With the calibrated gain 0.25 (Option A 2026-06-14 — borne haute canon 15-25%, honoring inv.4 + inv.11):
    //   Stage-1 (0.40) et Stage-2 (0.65) ne libèrent PAS (< seuil 0.90).
    //   Stage-3 (0.90, gain 0.25) ≥ seuil → RELEASE : un pipeline 3-stages (front + 2 mid-tier + money holding)
    //   atteint STAGE_3_CLEAN_90_PCT+ dès le terminal Stage-3, conforme à laundering_pipeline.md inv.4 + inv.11.
    //   Stage-4 (1.00) ≥ seuil → RELEASE aussi (4-stages toujours viable, inv.6 seuil 0.90 INCHANGÉ).
    // System-8 gate kept as the PRIMARY (consumed float) guard; the stage gate adds structural defense against
    // per-stage premature release. La tension de calibration (gain 0.20 → Stage-3=0.80 < 0.90) est RÉSOLUE.
    const threshold = Math.max(0, launderingTunables.fullCleanThreshold);
    const allTerminal = await this.repo.listReleasableNodes(ctx.playerId, threshold);
    // Apply the per-stage cleanliness guard (lot-4 TD-023): filter to nodes where the stage-derived cleanliness ≥ threshold.
    const releasable = allTerminal.filter((n) => pipelineCleanlinessForStage(n.stage_index) >= threshold);
    if (releasable.length === 0) return; // no terminal node ready → release no-op.

    // P3-E C3 (★#2) — ONE read of the player's friction-penalty flag for the WHOLE tick (the flag is player-keyed,
    // not per-node — `friction_budget_state` is a 1-1 cache, §4.3), read AFTER the no-op early-return above so a
    // tick with nothing releasable stays a clean no-op (no extra query). Every node releasing THIS tick for this
    // player shares the SAME multiplier value (the concurrency floor: no release is "half-penalized" against a
    // different in-flight read). getRow → null (never ticked the friction engine) reads as inactive/nominal.
    const frictionRow = await this.frictionBudget.getRow(ctx.playerId);
    const penaltyMultiplier = frictionRow?.efficiency_penalty_active
      ? coreLoopsTunables.demolitionEfficiencyPenaltyMultiplierBaseline
      : 1;

    const releases = releasable.map((n) => {
      // DETERMINISTIC integer split (cash conservation): cut = floor(buffered × rate); wallet credit = buffered - cut.
      const cut = Math.floor(n.buffered_cents * rate);
      // P3-E C3 (★#2) — the direct-multiplication penalty teeth applied to the TERMINAL credit (design §5.2: "le
      // payout front-shop EST ce crédit" — the ONLY laundering output site, R13). Rounded the SAME way the
      // cook-yield fold rounds (Math.round) — the dwell-tax split above stays an exact integer floor (unchanged, a
      // different mechanic); penaltyMultiplier is EXACTLY 1 when inactive → cleanCents is BYTE-IDENTICAL to the
      // pre-C3 value (zero-regression).
      const cleanCents = Math.round((n.buffered_cents - cut) * penaltyMultiplier); // the laundered output reaching the wallet (the retained cut is consumed).
      return { node_id: n.node_id, clean_cents: cleanCents };
    });

    await this.repo.applyReleases(ctx.playerId, releases);
  }
}
