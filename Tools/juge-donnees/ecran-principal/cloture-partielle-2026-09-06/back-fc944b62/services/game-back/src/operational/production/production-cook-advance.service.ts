// IMPLEMENTS: docs/tech/04a_operational_systems/production_brindle.md §NestJS — backend jeu
//             (ProductionBrindleService.advanceStage "appelé par le tick-scheduler à expiration de la durée du stage
//             actif … transite vers stage suivant" + finalizeCook "Stage 4 finalisation, produit FinishedBrindleBatch
//             dans le LAB inventory") + §Vue d'ensemble du pipeline 4-stage (the uniform stage clock) + §Tick-scheduler
//             integration (stage transitions are scheduled events on the tick-scheduler) +
//             docs/tech/04a_operational_systems/production_secondaries.md §Crick (the refinery 1-stage refine clock) +
//             docs/tech/04_city_simulation/tick_schedule_and_memory_budget.md §Full tick schedule (the MINUTE band) +
//             docs/tech/09_data_model/schema_operational_chain.md §2/§3 (cook_session / product_storage — R9.3)
//             -- session:2026-06-04 (Phase 2b vector #2 — substances/Crick — Task 3) --
//
// `ProductionCookAdvanceService` — the OPERATIONAL tick-hook that ADVANCES in-progress cooks. It is NOT one of the 11
// city-sim systems; it is an operational-chain advancer that plugs into the SAME CitySimScheduler (the registry
// contract). It mirrors PrecursorArrivalService's / ConversionSetupService's registration shape EXACTLY
// (OnApplicationBootstrap → registerCadence via the SAME registerSystem path), REPLACING the no-op placeholder the
// scheduler seeds at the MINUTE/8 = COOK_ADVANCE slot (after PRECURSOR_ARRIVAL at MINUTE/7). This is the tick-hook
// PATTERN T1–T3 share.
//
// The advance is SUBSTANCE-GENERIC: each cook's stage clock / stage count / yield are read PER-COOK from its
// substance descriptor (substance-config.ts), NOT from a single global Brindle constant. So one batched loop drives
// a Brindle cook (4 stages × 30 ticks → 200 g), a Crick cook (1 stage × 180 ticks → 200 g), a Hush cook (2 × 75 → 200 g)
// AND an Ash cook (3 × 3000 → 200 g). The Brindle descriptor equals the M1 globals by construction (substance-tunables.ts
// re-reads the same env vars), so the Brindle behavior — the 4-stage cascade, the destinations, the heat coupling — is
// byte-identical to the pre-generic path.
//
// ASH adds the REFINING-PASS lever (the Ash luxury vector, T3 — the time↔purity lever): the chosen refining_passes
// (persisted on the cook row at startCook) lengthen the FIRST functional stage by refining_passes ×
// descriptor.refiningPassDurationTicks, so the TOTAL Ash cook = stageDurationTicks × cookStageCount + refining_passes ×
// refiningPassDurationTicks (more passes ⇒ a strictly longer cook). Brindle/Crick/Hush have refining_passes=0 and no
// refiningPassDurationTicks → the extra term is 0 → their clock is byte-identical (the refining lever is Ash-only).
//
// THE MINUTE/8 TICK (production_brindle.md §Vue d'ensemble — the cook runs in the background, P1 slow-tick; the player
// is NOT blocked behind the timer), per player:
//   - BATCH-READ all in-progress cook_sessions (current_stage IN the 4 functional stages) in ONE query (the Phase-1
//     determinism discipline: batched read, no per-row queries). Each row carries its substance_type.
//   - For each cook, resolve its substance descriptor and compute the elapsed ticks since stage_started_at_tick. If a
//     FULL per-stage duration (descriptor.stageDurationTicks — Brindle 30, Crick 180) has elapsed:
//       * not yet at the substance's LAST functional stage (stage_{cookStageCount}) : ADVANCE one functional stage
//         (re-anchor the stage clock at the current tick), OR
//       * the LAST functional stage elapsed : COMPLETE — mark current_stage='completed' (+ stamp the deterministic
//         cut bucket) AND yield the substance's flat output (descriptor.yieldGrams) into product_storage on the cook's
//         building (substance_type = the cook's substance), in ONE transaction.
//   - No RNG: which cooks advance/complete (elapsed >= stage duration) + the yield (a fixed gram count) are FIXED
//     functions of the persisted stage_started_at_tick + the clock + the per-substance grounded tunables.
//
// DETERMINISM (NO RNG): two players with identical cooks + identical advances land on identical product. Organically a
// no-op (no in-progress cook). Each MINUTE tick advances AT MOST one stage per cook (a stage is ≥ 1 tick); a
// span-advance fires the MINUTE handler once per crossed minute boundary, so a Brindle cook's 4 stages cascade over
// 120 ticks (stage_1 elapses @+30, …, stage_4 completes @+120) and a Crick cook completes @+180 (stage_1 is its last).
//
// P3-E C3 (★#2) — the demolition-mandate EFFICIENCY-PENALTY TEETH: this is Site 1 of EXACTLY 2 frozen output sites
// (R13, C0/plan §C3 — the OTHER is the laundering terminal credit). When the OWNING player's `friction_budget_state.
// efficiency_penalty_active` is true (DemolitionModule C2 — the friction-budget threshold crossing), the completing
// cook's yield is scaled by `demolitionEfficiencyPenaltyMultiplierBaseline` (default 0.85, core-loops-tunables.ts —
// DERIVED at the point of realization, NEVER stored, D4/divergence #2), folded INTO the SAME single Math.round the
// tenure permille + maintenance multiplier already share (design §5.2 — one rounding, no double-round drift). The
// flag is read ONCE per tick (player-keyed, not per-cook — `friction_budget_state` is a 1-1 cache, §4.3); a player
// who never ticked the friction engine (no row) reads as inactive (multiplier 1, byte-identical zero-regression).

import { Inject, Injectable, Logger, OnApplicationBootstrap, Optional } from '@nestjs/common';

import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId, type CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import {
  FUNCTIONAL_COOK_STAGES,
  ProductionRepository,
  type FunctionalCookStage,
  type InProgressCook,
  type ProductSubstanceType,
} from './production.repository';
import { M1_DEFAULT_CUT_PURITY_BUCKET, M1_DEFAULT_PURITY_GRADE, productionTunables, yieldGramsForEquipmentTier } from './production-tunables';
import { substanceDescriptor, type SubstanceDescriptor } from '../substance/substance-config';
import { HeatContribService } from '../heat_contrib/heat-contrib.service';
import { AshPurityService } from '../ash/ash-purity.service';
import { EffluentStoichiometryService } from '../forensic/effluent-stoichiometry.service';
// 04f-A C2 (D1/D5) — the pure output-fold multiplier + the SAME game-day derivation the D1 anchor uses
// (deriveGameDay — the effect-engine/political-calendar/ConversionSetupService shared convention).
import { MaintenancePhaseService } from '../maintenance/maintenance-phase.service';
import { citySimTunables } from '../../citysim/citysim-tunables';
import { deriveGameDay } from '../political/political-trigger-evaluators';
// P3-E C3 (★#2) — Site 1 of the 2 R13-frozen output sites: FrictionBudgetRepository.getRow reads the player-keyed
// `efficiency_penalty_active` flag (DemolitionModule, C2) and coreLoopsTunables derives the baseline multiplier
// (never stored — D4/divergence #2, DD-E3 — no effect-engine PLAYER-scope row).
import { FrictionBudgetRepository } from '../../core_loops/demolition/friction-budget.repository';
import { coreLoopsTunables } from '../../core_loops/core-loops-tunables';

/** The permille base (×1000) for the captured tenure yield multiplier (Phase-11b C2). A cook with NULL
 *  delegated_yield_permille (a player-manual / non-bonus cook) defaults to this → ×1 → the flat descriptor yield,
 *  byte-identical. The single source of the bonus→multiplier derivation stays in the lieutenant module's pure
 *  `yieldMultiplier` + curve (captured at startCook); this module only divides back out of permille at completion. */
const DEFAULT_YIELD_PERMILLE = 1000;

@Injectable()
export class ProductionCookAdvanceService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ProductionCookAdvanceService.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly repo: ProductionRepository,
    private readonly heatContrib: HeatContribService,
    // The PURE Ash purity derivation (T6 — the distinct Ash mechanic). Injected to compute the 3-lever deterministic
    // purity_score at an Ash (luxuryChannel) cook completion, which the repo stamps onto the produced batch (set-based,
    // once). Non-luxuryChannel cooks never call it (the completion path gates on descriptor.luxuryChannel) — so their
    // completion is byte-identical (no purity_score computed, no batch_purity row).
    private readonly ashPurity: AshPurityService,
    // C12 (§5.2 Forensic Signaling) — ADDITIVE: recordWorkshopThroughput is called AFTER the cook's
    // yield write + precursor decrement + emitCookHeat (byte-identical). @Optional: if ForensicSignalingModule
    // is not wired into ProductionModule (test environments without the full module graph), the hook
    // is skipped gracefully (zero-regression). ProductionModule imports ForensicSignalingModule (C12).
    //
    // W6.2 C1 — DI FIX (measured, not a redesign): `foo: T | undefined` is an EXPLICIT UNION type, and
    // TypeScript's `emitDecoratorMetadata` serializes a union `design:paramtypes` entry as the bare
    // `Object` constructor (it cannot emit a single class reference for a union type) — Nest's DI then
    // has no concrete token to resolve for this parameter from reflection alone and, being
    // `@Optional()`, silently binds `undefined` REGARDLESS of whether ForensicSignalingModule is wired
    // (confirmed live: an E2E run logging `effluentDefined` at entry measured `false` even with the
    // module correctly imported). `?:` (dropping the explicit union) is Nest's other common fix, but it
    // is not usable here — this constructor has REQUIRED parameters after this one, and TS forbids a
    // required parameter following an optional one. The fix that preserves parameter order: an EXPLICIT
    // `@Inject(EffluentStoichiometryService)` token, so Nest never needs the (broken) reflected type at
    // all. Same runtime type (`EffluentStoichiometryService | undefined`) — a DI-correctness fix, not a
    // behavior change to what "optional" means here.
    @Optional() @Inject(EffluentStoichiometryService) private readonly effluentStoichiometry: EffluentStoichiometryService | undefined,
    // 04f-A C2 (D1/D5) — the PURE output-fold multiplier (the sibling of AshPurityService: no persistence, no
    // RNG). Injected to scale a completing cook's yield by maintenanceOutputMultiplier(days_overdue) — exactly
    // 1.0 for a maintained lab (byte-identical, the C2 zero-regression contract). ProductionModule imports
    // MaintenanceModule (C2, which EXPORTS this service).
    private readonly maintenancePhase: MaintenancePhaseService,
    // P3-E C3 (★#2) — the friction-penalty flag read (player-keyed, DemolitionModule C2, EXPORTS
    // FrictionBudgetRepository). Required (not @Optional): DemolitionModule is unconditionally wired
    // app-wide (app.module.ts) and ProductionModule imports it directly for this dependency — every
    // environment that boots ProductionModule has it available.
    private readonly frictionBudget: FrictionBudgetRepository,
  ) {}

  // ───────────────────────────── bootstrap: registration ─────────────────────────────

  onApplicationBootstrap(): void {
    this.registerCadence();
    this.logger.log(
      'ProductionCookAdvanceService registered at MINUTE/8 (COOK_ADVANCE) — advances in-progress cook_sessions one ' +
        "functional stage per elapsed PER-SUBSTANCE stage duration each in-game minute; on a cook's LAST functional " +
        "stage completion yields the substance's flat output into product_storage. Per-cook substance descriptor " +
        '(substance-config.ts) drives stage count / duration / yield (Brindle 4×30→200 g, Crick 1×180→200 g, ' +
        'Hush 2×75→200 g, Ash 3×3000→200 g). Ash ALSO lengthens stage_1 by refining_passes × refiningPassDurationTicks ' +
        '(the time↔purity lever — total cook grows with the chosen passes). Batched read/write (Phase-1 determinism). ' +
        'Organically a no-op (no in-progress cook).',
    );
  }

  /** Register the MINUTE/8 = COOK_ADVANCE slot (the SAME registerSystem path the arrival hook uses at MINUTE/7). */
  private registerCadence(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.COOK_ADVANCE,
      cadence: Cadence.MINUTE,
      order: 8,
      run: (ctx) => this.runMinuteTick(ctx),
    });
  }

  // ───────────────────────────── the registered MINUTE/8 tick ─────────────────────────────

  /**
   * {MINUTE, order 8} — advance the player's in-progress cooks. ctx.gameMinute is the current in-game tick (the minute
   * boundary firing). Batch-reads the in-progress cooks; for each whose current stage's uniform duration has elapsed,
   * advances one functional stage OR completes the cook (yields product into product_storage). Deterministic (NO RNG).
   * Organically a no-op (no in-progress cook).
   */
  private async runMinuteTick(ctx: CitySimTickContext): Promise<void> {
    const inProgress = await this.repo.listInProgressCooks(ctx.playerId);
    if (inProgress.length === 0) return; // no cook in progress → clean no-op.

    // 04f-A C2 (D1) — the SAME current-game-day for every cook completing THIS tick (batch-level, not
    // per-row — mirrors ConversionSetupService's own single gameDay-per-batch convention).
    const currentGameDay = deriveGameDay(ctx.gameMinute, citySimTunables.inGameDayLengthMinutes);

    // P3-E C3 (★#2) — ONE read of the player's friction-penalty flag for the WHOLE tick (the flag is
    // player-keyed, not per-cook — `friction_budget_state` is a 1-1 cache, §4.3). Every cook completing
    // THIS tick for this player shares the SAME multiplier value (the concurrency floor: no cook's yield
    // is "half-penalized" against a different in-flight read). A player who never ticked the friction
    // engine (getRow → null) reads as inactive — the safe, zero-regression default.
    const frictionRow = await this.frictionBudget.getRow(ctx.playerId);
    const penaltyMultiplier = frictionRow?.efficiency_penalty_active
      ? coreLoopsTunables.demolitionEfficiencyPenaltyMultiplierBaseline
      : 1;

    // The buildings whose cook COMPLETED this tick (the heat-contribution targets — production_brindle.md §Heat shadow:
    // a completed cook adds heat to its building). Collected here, emitted AFTER the loop in ONE batched seam call. Heat
    // is substance-agnostic (a completed cook adds heat to its building — reuse the existing seam, not reimplemented).
    const completedBuildingIds: string[] = [];
    // C12 (§5.2 Forensic Signaling) — ADDITIVE collection for recordWorkshopThroughput.
    // Collected alongside completedBuildingIds; emitted AFTER emitCookHeat (byte-identical).
    // Each entry carries the lab building (= workshopId), substanceType, and quantityGrams for the
    // forensic throughput accumulator. The cook hot-path (yield / decrement / heat) is UNCHANGED.
    const completedForensic: Array<{ workshopId: string; substanceType: string; quantityGrams: number }> = [];

    for (const cook of inProgress) {
      const descriptor = substanceDescriptor(cook.substance_type);
      if (descriptor === null) continue; // defensive no-op: an unconfigured substance has no cook clock (never this slice).

      const elapsed = ctx.gameMinute - cook.stage_started_at_tick;
      if (elapsed < this.stageDuration(cook, descriptor)) continue; // current stage not yet finished → leave it.

      const next = this.nextStage(cook.current_stage, descriptor);
      if (next === null) {
        // current_stage is the substance's LAST functional stage and its duration elapsed → COMPLETE: yield the flat
        // per-substance output into the building's product_storage. One transaction (session + product).
        //
        // ASH PURITY STAMP (T6 — the distinct Ash mechanic): for a luxuryChannel (Ash) cook ONLY, derive the batch's
        // purity_score from the THREE recorded player levers — the lab's lab_tier (T5), the cook's refining_passes (T3),
        // and its damaged_pauses_during_cook (T4) — via the PURE AshPurityService (deterministic, clamped 0..100), and
        // pass it through so the repo stamps it onto the produced batch_purity row IN the same completion tx. A
        // NON-luxuryChannel substance leaves purity_score UNDEFINED → no batch_purity row (Brindle/Crick/Hush
        // byte-identical). The gate is the single seam the whole T6 slice keys off.
        const purityScore = descriptor.luxuryChannel
          ? this.ashPurity.purityScore(cook.lab_tier, cook.refining_passes, cook.damaged_pauses_during_cook)
          : undefined;
        // D1 C6 — EQUIPMENT-TIER YIELD SCALING (Brindle only): for a Brindle cook, the yield scales by the
        // building's equipment_tier (yieldGramsForEquipmentTier — tier_1=200, tier_2=400, tier_3=800, tier_4=1200,
        // tier_5=2000). For non-Brindle (Crick/Hush/Ash), use the descriptor's flat yieldGrams (byte-identical —
        // their tier scaling is DEFERRED). The TENURE YIELD BONUS (Phase-11b C2) is APPLIED ON TOP of the tier-scaled
        // base yield (stacking): yieldBase × permille / 1000.
        const baseYieldGrams =
          cook.substance_type === 'brindle'
            ? yieldGramsForEquipmentTier(cook.equipment_tier)
            : descriptor.yieldGrams;
        // TENURE YIELD BONUS (Phase-11b C2 — APPLY the captured carrot): scale the base yield by the
        // multiplier the COOK delegation binding CAPTURED at startCook (delegated_yield_permille, ×1000). This module
        // imports NOTHING from the lieutenant module — it knows nothing of tenure/buckets; it reads ONLY the stored
        // permille. NULL (a player-MANUAL cook, or a non-bonus delegated cook) → DEFAULT_YIELD_PERMILLE (×1) → the yield is
        // baseYieldGrams UNCHANGED (manual cooks stay byte-identical — no-regression). A delegated COOK whose
        // lieutenant accrued tenure carries a permille > 1000 → strictly more grams. Deterministic (NO RNG — a fixed
        // function of the persisted permille + the equipment_tier + the descriptor yield).
        const yieldPermille = cook.delegated_yield_permille ?? DEFAULT_YIELD_PERMILLE;
        // 04f-A C2 (D5) — the OUTPUT-FOLD: scale by maintenanceOutputMultiplier(days_overdue), folded INTO the
        // SAME single Math.round as the tenure permille (design §4: "round(base × yieldPermille/1000 ×
        // maintenanceOutputMultiplier(days_overdue))" — never a second, separately-rounded multiply). At
        // days_overdue=0 (a maintained lab) the multiplier is EXACTLY 1.0 → quantityGrams is BYTE-IDENTICAL to
        // the pre-04f-A value (the zero-regression contract, design §13).
        const daysOverdue = this.maintenancePhase.deriveDaysOverdue(
          currentGameDay,
          cook.last_maintained_at_game_day,
          cook.maintenance_due_in_days,
        );
        const maintenanceMultiplier = this.maintenancePhase.maintenanceOutputMultiplier(daysOverdue);
        // P3-E C3 (★#2) — folded INTO the SAME single Math.round (design §5.2: direct multiplication at the
        // output site, never stored). penaltyMultiplier is EXACTLY 1 when the flag is inactive → quantityGrams
        // is BYTE-IDENTICAL to the pre-C3 value (zero-regression, mirrors the 04f-A D5 fold contract above).
        const quantityGrams = Math.round(
          (baseYieldGrams * yieldPermille * maintenanceMultiplier * penaltyMultiplier) / DEFAULT_YIELD_PERMILLE,
        );
        await this.repo.completeCookWithYield(ctx.playerId, cook.cook_session_id, {
          building_id: cook.lab_building_id,
          substance_type: cook.substance_type as ProductSubstanceType,
          quantity_grams: quantityGrams,
          purity_grade: M1_DEFAULT_PURITY_GRADE,
          cut_purity_bucket: M1_DEFAULT_CUT_PURITY_BUCKET,
          purity_score: purityScore,
        });
        completedBuildingIds.push(cook.lab_building_id);
        completedForensic.push({ workshopId: cook.lab_building_id, substanceType: cook.substance_type, quantityGrams });
      } else {
        // D1 C4 — SECONDARY PRECURSOR CONSUME AT STAGE ADVANCE (production_brindle.md §Stage 2 / §Stage 3 +
        // precursors_supply_chain.md §156 "cook blocked if stock insufficient"). For a BRINDLE cook entering
        // stage_2 (Thalmite) or stage_3 (Garnet salt), consume the per-batch amount from precursor_stock before
        // advancing. If the stock is insufficient (defensive — upfront validation at startCook should prevent this),
        // SKIP the stage advance (the cook remains at its current stage; no decrement, no stage transition). Non-
        // brindle cooks + non-stage_2/stage_3 transitions are byte-identical (no secondary precursor consumed).
        if (cook.substance_type === 'brindle') {
          if (next === 'stage_2') {
            const consumed = await this.repo.guardedConsumePrecursor(
              ctx.playerId,
              cook.lab_building_id,
              'thalmite',
              productionTunables.thalmiteUnitsPerBatch,
            );
            if (!consumed) {
              // Insufficient Thalmite — stage blocked. Log and skip (the cook stays at stage_1 until re-stocked).
              this.logger.warn(
                `COOK_ADVANCE: cook=${cook.cook_session_id} blocked at stage_1→stage_2: insufficient thalmite ` +
                  `(requires ${productionTunables.thalmiteUnitsPerBatch} units)`,
              );
              continue;
            }
          } else if (next === 'stage_3') {
            const consumed = await this.repo.guardedConsumePrecursor(
              ctx.playerId,
              cook.lab_building_id,
              'garnet_salt',
              productionTunables.garnetSaltUnitsPerBatch,
            );
            if (!consumed) {
              // Insufficient Garnet salt — stage blocked. Log and skip (the cook stays at stage_2 until re-stocked).
              this.logger.warn(
                `COOK_ADVANCE: cook=${cook.cook_session_id} blocked at stage_2→stage_3: insufficient garnet_salt ` +
                  `(requires ${productionTunables.garnetSaltUnitsPerBatch} units)`,
              );
              continue;
            }
          }
        }
        // ADVANCE one functional stage; re-anchor the stage clock at the current tick.
        await this.repo.advanceCookStage(ctx.playerId, cook.cook_session_id, next, ctx.gameMinute);
      }
    }

    // COUPLING (System Heat): each completed cook ADDS heat to its building — emit a HeatInjectionEvent on the canonical
    // CityEventBus seam (System Heat buffers + flushes it onto buildings.heat; this service writes no heat — R9.3).
    if (completedBuildingIds.length > 0) {
      await this.heatContrib.emitCookHeat(ctx.playerId, completedBuildingIds, ctx.gameMinute);
    }
    // C12 (§5.2 Forensic Signaling) — ADDITIVE hook: recordWorkshopThroughput called AFTER
    // the yield write + precursor decrement + emitCookHeat (ABOVE — byte-identical).
    // Zero-regression invariant (§1.3): if effluentStoichiometry is not wired (@Optional, default
    // undefined) or there are no completions this tick, this block is a clean no-op. The cook
    // hot-path (yield / decrement / heat) has ALREADY COMPLETED before this block runs.
    // @Optional: graceful skip if ForensicSignalingModule is absent (e.g. test environments that
    // instantiate ProductionCookAdvanceService without the full module graph).
    if (this.effluentStoichiometry !== undefined && completedForensic.length > 0) {
      const GRAMS_PER_KG = 1000;
      for (const { workshopId, substanceType, quantityGrams } of completedForensic) {
        // kg = quantityGrams / 1000 (grams → kilograms; no Math.round — exact division).
        await this.effluentStoichiometry.recordWorkshopThroughput(
          ctx.playerId,
          workshopId,
          substanceType,
          quantityGrams / GRAMS_PER_KG,
          ctx.gameMinute,
        );
      }
    }
  }

  /**
   * The next FUNCTIONAL stage after `current` for a substance, or null if `current` is the substance's LAST functional
   * stage (stage_{cookStageCount} → the next transition is COMPLETION, not another stage). The functional stages for a
   * substance are the FIRST `descriptor.cookStageCount` of FUNCTIONAL_COOK_STAGES: Brindle (count=4) walks stage_1→
   * stage_2→stage_3→stage_4 then completes; Ash (count=3) walks stage_1→stage_2→stage_3 then completes (stage_3 is its
   * last, NOT stage_4 — lastFunctionalIdx=2); Hush (count=2) walks stage_1→stage_2 then completes (stage_2 is its last,
   * NOT stage_4 — lastFunctionalIdx=1); Crick (count=1) walks stage_1 alone then completes (stage_1 is its last).
   * The stage_2_intermediate sub-state + the aborted terminal are not used (no intermediate-decay / abort path).
   * Defensive: an unexpected stage value, or a stage at/past the substance's last functional stage, yields null
   * (completion / no-op rather than throw).
   */
  private nextStage(current: string, descriptor: SubstanceDescriptor): FunctionalCookStage | null {
    const idx = (FUNCTIONAL_COOK_STAGES as readonly string[]).indexOf(current);
    if (idx < 0) return null; // not a functional stage (completed/aborted/intermediate) → no advance.
    // The substance's last functional stage index = cookStageCount - 1 (clamped to the array's real bounds).
    const lastFunctionalIdx = Math.min(descriptor.cookStageCount, FUNCTIONAL_COOK_STAGES.length) - 1;
    if (idx >= lastFunctionalIdx) return null; // at/past the substance's last stage → completion path.
    return FUNCTIONAL_COOK_STAGES[idx + 1];
  }

  /**
   * The duration (in ticks) the cook's CURRENT stage must run before it advances/completes. Normally the substance's
   * uniform `descriptor.stageDurationTicks`. ASH adds its REFINING-PASS time (T3 — the time↔purity lever) to the FIRST
   * functional stage ONLY: the chosen `refining_passes × descriptor.refiningPassDurationTicks` lengthen stage_1, so the
   * TOTAL cook = stageDurationTicks × cookStageCount + refining_passes × refiningPassDurationTicks (more passes ⇒ a
   * strictly longer cook). Stages 2..N keep the uniform duration. Behavior-PRESERVING for Brindle/Crick/Hush: their
   * `refining_passes` is 0 (and they have no `refiningPassDurationTicks`), so the extra term is 0 → the duration is the
   * uniform value, byte-identical to the pre-T3 clock.
   */
  private stageDuration(cook: InProgressCook, descriptor: SubstanceDescriptor): number {
    const base = descriptor.stageDurationTicks;
    const isFirstStage = cook.current_stage === FUNCTIONAL_COOK_STAGES[0]; // 'stage_1'
    const perPass = descriptor.refiningPassDurationTicks ?? 0;
    if (!isFirstStage || perPass === 0 || cook.refining_passes <= 0) return base;
    return base + cook.refining_passes * perPass;
  }
}

// Re-export the InProgressCook type locally so the module wiring + tests can reason about the tick input shape.
export type { InProgressCook };
