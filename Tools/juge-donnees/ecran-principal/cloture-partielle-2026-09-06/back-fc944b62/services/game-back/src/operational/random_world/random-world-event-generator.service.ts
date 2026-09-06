// IMPLEMENTS: docs/superpowers/plans/2026-07-15-04g-B-random-world-plan.md C2 (generator core +
//             NIGHTLY/28 + halgren_tannery_hailstorm + permanent_residue)
//             Design: docs/superpowers/specs/2026-07-15-04g-B-random-world-design.md §3.2 (generator
//             phases 0-5) + §3.5.1 (halgren_tannery_hailstorm) + §3.5.2 (permanent_residue) + §3.7
//             (D6 gates) + §3.3 (DD-RW1 siblings, the crash-safety axis)
//             Scheduler seam S9: NIGHTLY/28 (`CitySystemId.RANDOM_WORLD_DAILY_TICK`, city_sim_system.ts
//             + city_sim_scheduler.service.ts, 2-step registration added this chunk).
//             Pattern: mirrors `operational/ambient/ambient-micro-event.service.ts` (per-run claim +
//             tick-body direct-probe idiom) + `operational/political/political-calendar-tick.service.ts`
//             (revert-before-gate ordering, gate-then-activate shape).
//             — 04g-B C2 — 2026-07-15
//             — 04g-B C5 — 2026-07-15 (BO force-template dispatcher: `forceActivate` + the
//               `ForceableRandomWorldTemplateId`/`isForceableRandomWorldTemplateId` guard — `activateHailstorm`/
//               `activateHollow` now RETURN the created row, additive signature change, byte-unchanged bodies)
//
// `RandomWorldEventGeneratorService` — the daily tick (design §3.2, canon name gdd/15:1852 —
// `RandomWorldEventGenerator`, never `WorldEventGenerator`). PER-PLAYER-FIRING, CITY-GLOBAL-STATE (S10):
// `run(ctx)` fires once per player's own NIGHTLY boundary crossing; phase 0's claim (the row itself,
// `random_world_daily_run` PK `game_day`) deduplicates so only the FIRST firing for a given `game_day`
// evaluates anything — every other/later firing is a pure no-op (AC1).
//
// PHASES (fixed order, design §3.2 — see `CitySystemId.RANDOM_WORLD_DAILY_TICK`'s own doc comment,
// city_sim_system.ts, for the cross-referenced summary):
//   0. claim the game_day (repo.claimDay) — abort (no-op) if lost.
//   1. resolve-expired — GENERIC, template-agnostic hard-ceiling sweep (`expires_at_game_day <=
//      gameDay`), idempotent even if the political NIGHTLY/19.5 `revertExpired` sweep already reaped
//      the effect rows (defense in depth — design §3.2/§3.3, AC8 crash-safety).
//   2. `applyRecoveryCurve` — for each `active` `halgren_tannery_hailstorm` event: recompute
//      `contamination(d)`; below `hailstorm_detection_threshold` → the FULL close-out (resolve +
//      revert 3 rows + apply 1 permanent residue row, `expiresAtGameDay: null` — AC5's crash-safety
//      target); else, if the magnitude genuinely changed vs. the persisted `recovery_curve_position` →
//      `reapplyRandomWorldEvent`; else → 0 writes (AC4 no-op day).
//   3. `evaluateActivationTriggersDaily` — iterates the 6 LIVE templates in registry order, capped at
//      `random_world.daily_activation_evaluation_batch_size`. C2 wires 2 real evaluators:
//      `halgren_tannery_hailstorm` (hum-weighted daily roll, S13) and `permanent_residue` (successor
//      roll per resolved-and-unsuccessored hailstorm parent — design §3.2 phase-1 note: "évaluées phase
//      3 du MÊME tick ou des suivants", so a same-tick resolve-then-successor chain is explicit design
//      intent, not a bug). Both are gated by D6 (district cooldown + concurrent cap) before persisting.
//      C3 adds the 3rd: `sideways_failure` — iterates BOTH `TIGHT_COUPLING_PAIRS` (P1 `erlang_stash__
//      deal_lek`, P2 `offhours_hum__bpd_attention`); the SUBSTRATE PREDICATE gates whether a roll is even
//      attempted (design table's own "condition primary" column precedes "roll" — mirrors
//      `evaluatePermanentResidueSuccessors`'s own "eligible parents first, THEN roll per eligible" shape,
//      never an unconditional daily draw the way hailstorm's city-wide weighted pick is). A single
//      registry entry (`sideways_failure`) can activate 0, 1, or 2 events on the SAME tick (one per
//      eligible+rolled pair) — `evaluatedTemplateCount` still increments by exactly 1 for the template
//      (design counts TEMPLATES evaluated, not pairs). `apparent_recovery`/`hollow_at_the_corner`/
//      `quorum_on_stadler_row` remain evaluated (counted) with no trigger predicate yet — C4 scope (the
//      SAME "N getters at C1, consumers land later" honest-scaffolding precedent).
//   4. sideways secondary shifts due (C3) — every `active` `sideways_failure` event whose
//      `payload.secondaryFiresAtGameDay === gameDay` (delay drawn seeded ∈ {1,2} at activation, design
//      D4): apply the secondary DISTRICT modifier row on the paired lever (S7 for P1, the already
//      scope-aware `raid_target_temperature` for P2) at magnitude `primary × 0.6` exact, mark the event's
//      payload `secondaryApplied` (AC9 idempotence guard — a crash-replay of the SAME gameDay is a
//      no-op), THEN fan out `RandomWorldCouplingService.applyCouplingDiscovery` to every candidate player
//      (building in X or Y) for the cap-gated cascade + Exception card (§3.6, S14).
//   5. `random_world_daily_run` counters update (evaluated/activation/gated-cascade counts +
//      `saturated_district_ids` — C3 adds the latter two; diagnostic, BO C5).
//
// ★ Coder judgment call (D6 gate scope for `permanent_residue`'s successor roll): the design's own
// Challenge-citation for the district cooldown ("Permanent residue can feel punishing if it accumulates
// without bound", design §3.7) argues the gate exists to prevent independent, REPEATED primary
// activations from piling up in the same district — not to block a successor from chaining off its OWN
// still-fresh parent (a successor is thematically the aftermath of the SAME incident, not a new one).
// Gating the successor against its own parent's district-cooldown window would make AC6 (successor firing
// shortly after a forced fast resolution) structurally unsatisfiable under any realistic parameter
// override, which the design's own falsifiable acceptance criterion cannot have intended. This chunk
// therefore gates `permanent_residue`'s successor activation with the GLOBAL concurrent cap ONLY, never
// the per-district cooldown; `halgren_tannery_hailstorm`'s own fresh daily roll IS gated by both
// (design §3.7's literal reading for a genuinely NEW primary activation). Documented here rather than
// silently assumed — a future chunk revisiting D6's exact successor scope should update this note.
//
// ★ TD-351 (2026-08-08, prod-defect fix — `activateQuorum` shipped with NO D6 gate at all, the ONE
// activation path out of 6 that didn't mirror this section's own discipline): now gated by the GLOBAL
// concurrent cap ONLY, the SAME choice as `permanent_residue`/`apparent_recovery` above, for an ANALOGOUS
// but DISTINCT reason — not because a flip is a successor (it has no `parentEventId`), but because it is
// ALREADY self-paced by its own threshold/hysteresis state machine (`applyQuorumAdoptionAndFlips` Step B/
// its own doc comment), and the district cooldown is template-AGNOSTIC (repository.ts's own
// `hasRecentActivationInDistrict` doc comment, "any template, any status"), so applying it here would
// gate a quorum flip on an unrelated OTHER template's recent activation in the same district — a coupling
// design §3.5.6/§3.7 D11-revised never asks for. See `applyQuorumAdoptionAndFlips`'s own Step D comment
// for the full reasoning.
//
// Determinism: NO `Math.random()`/`Date.now()` anywhere in this file — the ONLY draw source is
// `makeRng` (S11), seeded `random_world:{game_day}:{template_id}` (activation rolls) and
// `random_world:{game_day}:permanent_residue:{parent_id}` (successor rolls, design §8).
//
// C3 addendum — sideways_failure seeds + draw order (design §8's own "ordre de tirage FIXE documenté par
// service" discipline; ★ coder judgment call, documented rather than silently assumed): the canonical
// `random_world:{game_day}:{template_id}` seed shape is EXTENDED with a `:{pairKey}` suffix —
// `random_world:{game_day}:sideways_failure:{pairKey}` — the SAME per-sub-entity-suffix precedent
// `permanent_residue`'s own `:{parent_id}` extension already established (2 pairs sharing one
// registry-entry's daily evaluation slot need INDEPENDENT, uncorrelated draw streams). ONE rng instance
// per pair per day, consumed in this FIXED order on a successful activation: (1) `chance(p)` — the
// activation roll; (2) `int(0, N-1)` — the district-Y pick among `adjacentDistrictIds(X)` candidates
// (D11); (3) `int(1, 2)` — the secondary-fire delay in game-days (D4). District X itself is NEVER an RNG
// draw — it is the deterministic LOWEST-id member of the substrate-eligible set (the predicate decides
// eligibility, not a lottery; documented in `eligibleSidewaysDistricts`'s own doc comment).

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { Cadence, CitySystemId } from '../../citysim/scheduler/city_sim_system';
import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { citySimTunables } from '../../citysim/citysim-tunables';
import { makeRng, type Rng } from '../../common/seeded-rng';
import { EffectModifierService } from '../effect_engine/effect-modifier.service';
import type { EffectModifierInput } from '../effect_engine/effect-engine.types';
import { ConstantHumRepository } from '../ambient/constant-hum.repository';
import { OffHoursDriftRepository } from '../ambient/off-hours-drift.repository';
import { ErlangStashService } from '../../citysim/erlang_stash/erlang-stash.service';
import type { RandomWorldEventActiveRow } from '../../db/schema/random_world';

import { deriveGameDay } from './random-world-clock';
import { randomWorldTunables } from './random-world.tunables';
import { liveRandomWorldTemplates } from './random-world-template-registry';
import { contamination, threePhaseMultiplier, type ScarCurveParams, type ThreePhaseCurveParams } from './recovery-curve';
import { drawScarPolygon } from './scar-polygon';
import { districtHumWeights, drawWeightedDistrict } from './district-hum-weighting';
import { RandomWorldEventRepository } from './random-world-event.repository';
import { getDistrictAdjacencyGraph, adjacentDistrictIds } from './district-adjacency';
import { TIGHT_COUPLING_PAIRS, tightCouplingPairByKey, type TightCouplingPairKey } from './tight-coupling-pairs';
import { RandomWorldCouplingService } from './random-world-coupling.service';
import { RandomWorldCohesionMutationService } from './random-world-cohesion.service';
import {
  districtAdoptionSignal,
  nextAdoption,
  drawQuorumThreshold,
  cascadeExcess,
  isNearOwnThresholdFromBelow,
  clamp01,
  type DistrictHumObservation as QuorumHumObservation,
} from './quorum-adoption';

/** The NIGHTLY slot this tick registers at — MUST match the SCHEDULE entry (city_sim_scheduler.service.ts)
 *  or `registerSystem` throws at boot. Next free after `AMBIENT_DAILY_TICK`/27, S9. */
export const RANDOM_WORLD_DAILY_TICK_ORDER = 28;

/** The 3 S6 DISTRICT-scoped, scope-aware levers this lot's 2 C2 templates target (design §3.5.1/§3.5.2 —
 *  the ONLY 3 levers where a DISTRICT `effect_modifier` row can bite today, C0 re-anchor S6). */
export const HAILSTORM_LEVER_KEYS = {
  cohesionRecoveryRatePerDay: 'T.city.cohesion_recovery_rate_per_day',
  inspectionQueueCap: 'T.city.inspection_queue_cap',
  raidTargetTemperature: 'T.city.raid_target_temperature',
} as const;

/** One `halgren_tannery_hailstorm` activation/reapply's 3 DISTRICT modifier rows at a given
 *  `contamination` value (design §3.5.1 — magnitudes at `contamination=1.0` are the activation-day
 *  values). Exported for precompute-then-observe E2E assertions. */
export function buildHailstormEffectModifiers(
  districtId: number,
  contaminationValue: number,
  appliedAtGameDay: number,
  expiresAtGameDay: number | null,
): EffectModifierInput[] {
  const scopeRef = String(districtId);
  return [
    {
      scopeType: 'DISTRICT',
      scopeRef,
      tunableKey: HAILSTORM_LEVER_KEYS.cohesionRecoveryRatePerDay,
      op: 'MULTIPLY',
      magnitude: 1 - randomWorldTunables.hailstormCohesionDragFactor * contaminationValue,
      appliedAtGameDay,
      expiresAtGameDay,
    },
    {
      scopeType: 'DISTRICT',
      scopeRef,
      tunableKey: HAILSTORM_LEVER_KEYS.inspectionQueueCap,
      op: 'MULTIPLY',
      magnitude: 1 + randomWorldTunables.hailstormInspectionIntensityFactor * contaminationValue,
      appliedAtGameDay,
      expiresAtGameDay,
    },
    {
      scopeType: 'DISTRICT',
      scopeRef,
      tunableKey: HAILSTORM_LEVER_KEYS.raidTargetTemperature,
      op: 'MULTIPLY',
      magnitude: 1 - randomWorldTunables.hailstormBpdAttentionFactor * contaminationValue,
      appliedAtGameDay,
      expiresAtGameDay,
    },
  ];
}

/** Seeded pick of `count` DISTINCT items from `items` (Fisher-Yates-style partial shuffle — WITHOUT
 *  replacement, consumes exactly `count` `rng.int` draws). Exported for precompute-then-observe E2E
 *  assertions (the `permanent_residue` lever-selection draw, design §3.5.2 "tirées seedé parmi les 3
 *  levers"). */
export function drawDistinct<T>(items: readonly T[], count: number, rng: Rng): T[] {
  const pool = [...items];
  const chosen: T[] = [];
  for (let i = 0; i < count && pool.length > 0; i += 1) {
    const idx = rng.int(0, pool.length - 1);
    chosen.push(pool[idx]!);
    pool.splice(idx, 1);
  }
  return chosen;
}

/** One `permanent_residue` lever draw, materialized into the event payload (design §4.1 "tirages
 *  seedés matérialisés dans payload"). */
export interface PermanentResidueLeverDraw {
  readonly tunableKey: string;
  readonly sign: 1 | -1;
}

/** A `sideways_failure` event's materialized payload (design §4.1: "secondary_fires_at_game_day/
 *  secondary_district_id/pair_key" + the AC9 idempotence guard field). Exported for precompute-then-
 *  observe E2E assertions (mirrors `PermanentResidueLeverDraw`'s own export). */
export interface SidewaysFailurePayload {
  readonly pairKey: TightCouplingPairKey;
  readonly sourceDistrictId: number;
  readonly secondaryDistrictId: number;
  readonly secondaryFiresAtGameDay: number;
  readonly secondaryApplied: boolean;
}

/** A `hollow_at_the_corner` event's materialized payload (design §4.1: "funeral_attended_by[], fork
 *  outcome"; §3.5.4 — C4). `closureAtGameDay` is the deterministic 5-week window-end this event's phase
 *  2 fork evaluation compares `gameDay` against (★ judgment call, see `activateHollow`'s own doc comment
 *  for why `expiresAtGameDay` itself stays `null` rather than carrying this value). `forkOutcome` is
 *  written only AT closure (undefined while the event is still open). Exported for precompute-then-
 *  observe E2E assertions (mirrors `SidewaysFailurePayload`'s own export). */
export interface HollowPayload {
  readonly closureAtGameDay: number;
  readonly funeralAttendedBy: readonly string[];
  readonly forkOutcome?: 'reweave' | 'drift';
}

/** An `apparent_recovery` event's materialized payload (design §4.1 — minimal: which parent template
 *  seeded this successor, diagnostic only, never read by any game logic). */
export interface ApparentRecoveryPayload {
  readonly parentTemplateId: string;
}

/** The 2 LIVE templates `RandomWorldAdminController`'s `POST force-template` (C5, design §6.2/D16) can
 *  drive — the ONLY 2 whose real activation is a self-contained function of `(districtId, gameDay)`
 *  alone (see `forceActivate`'s own doc comment for why the other 4 LIVE templates are excluded). */
export type ForceableRandomWorldTemplateId = 'halgren_tannery_hailstorm' | 'hollow_at_the_corner';

/** Runtime guard for {@link ForceableRandomWorldTemplateId} — the controller's own gate BEFORE calling
 *  `forceActivate` (a `live` template outside this set gets its own explicit 422, never a silent
 *  fall-through). */
export function isForceableRandomWorldTemplateId(id: string): id is ForceableRandomWorldTemplateId {
  return id === 'halgren_tannery_hailstorm' || id === 'hollow_at_the_corner';
}

export interface RandomWorldDailyTickResult {
  readonly gameDay: number;
  readonly claimed: boolean;
  /** Phase 1 — generic hard-ceiling resolutions (template-agnostic). */
  readonly expiredResolvedCount: number;
  /** Phase 2 — detection-threshold resolutions (`halgren_tannery_hailstorm` only, C2). */
  readonly curveResolvedCount: number;
  /** Phase 2 — magnitude reapplies (day-over-day curve updates that actually changed). */
  readonly reappliedCount: number;
  /** Phase 3 — templates evaluated this run (≤ `daily_activation_evaluation_batch_size`). */
  readonly evaluatedTemplateCount: number;
  /** Phase 3 — activations (fresh + successor + sideways_failure per-pair) that actually persisted a
   *  new event row. */
  readonly activationCount: number;
  /** Phase 4 (C3) — `sideways_failure` secondary shifts fired (due today) this run. */
  readonly secondaryFiredCount: number;
  /** Phase 4 (C3) — cascade rows ADMITTED (fresh INSERT + card) across all secondaries fired this run. */
  readonly admittedCascadeCount: number;
  /** Phase 4 (C3) — cascade attempts GATED by the 30-day per-player cap this run (design §3.6,
   *  E2E-RW-02 — the SAME value persisted to `random_world_daily_run.gated_cascade_attempts`). */
  readonly gatedCascadeAttempts: number;
  /** Phase 2 (C4) — `hollow_at_the_corner` fork closures resolved this run (reweave OR drift, both
   *  count — design §3.5.4). */
  readonly hollowClosureResolvedCount: number;
  /** Phase 2 (C4) — `apparent_recovery` resolutions (residue + permanent drag) this run (design §3.5.3). */
  readonly apparentRecoveryResolvedCount: number;
  /** Phase 2 (C4) — `apparent_recovery` magnitude reapplies (day-over-day 3-phase curve updates that
   *  actually changed) this run. */
  readonly apparentRecoveryReappliedCount: number;
  /** Phase 2 (C4) — `quorum_on_stadler_row` districts that FLIPPED (fresh activation) this run. */
  readonly quorumFlipCount: number;
  /** Phase 2 (C4) — `quorum_on_stadler_row` districts RESOLVED (hysteresis floor crossed) this run. */
  readonly quorumResolvedCount: number;
}

@Injectable()
export class RandomWorldEventGeneratorService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RandomWorldEventGeneratorService.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly repo: RandomWorldEventRepository,
    private readonly effectModifierService: EffectModifierService,
    private readonly constantHumRepository: ConstantHumRepository,
    // C3 additions — the sideways_failure coupling machinery (design §3.6):
    private readonly erlangStash: ErlangStashService, // S8 predicate (P1 — stash-FULL districts).
    private readonly offHoursDriftRepository: OffHoursDriftRepository, // S13 predicate (P2 — drift freshness).
    private readonly couplingService: RandomWorldCouplingService, // cap gate + exposure + card fan-out.
    // C4 addition — the cohesion-curve family (design §3.5.3/§3.5.4):
    private readonly cohesionMutations: RandomWorldCohesionMutationService, // S17 seam — hollow drop/restore, apparent_recovery residue.
  ) {}

  /** Register `RANDOM_WORLD_DAILY_TICK` at NIGHTLY/28 (S9, 2-step registration — the SCHEDULE entry +
   *  CitySystemId member land in the SAME commit, see city_sim_system.ts / city_sim_scheduler.service.ts). */
  onApplicationBootstrap(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.RANDOM_WORLD_DAILY_TICK,
      cadence: Cadence.NIGHTLY,
      order: RANDOM_WORLD_DAILY_TICK_ORDER,
      // City-global stream — ctx.playerId is never read (mirrors AMBIENT_DAILY_TICK's own shape).
      run: async (ctx) => {
        const gameDay = deriveGameDay(ctx.gameMinute, citySimTunables.inGameDayLengthMinutes);
        await this.runDailyTick(gameDay);
      },
    });
    this.logger.log(
      `RandomWorldEventGeneratorService: registered RANDOM_WORLD_DAILY_TICK at NIGHTLY/${RANDOM_WORLD_DAILY_TICK_ORDER}.`,
    );
  }

  /**
   * The tick body — a function of `gameDay` alone (+ persisted, deterministic DB state). Called by the
   * real scheduler registration above AND directly by the gated test-only `run-daily-tick` probe
   * (`random-world-test.controller.ts`), the SAME direct-probe idiom `AmbientMicroEventService.
   * runDailyTick` established. Unlike the political watermark claim, THIS claim has no ordering
   * requirement — `gameDay` values may be evaluated in any order/with gaps (see repo.claimDay's own
   * doc comment) since every downstream computation is a pure function of `(gameDay − started_at,
   * persisted rows)`, never of tick-call history.
   */
  async runDailyTick(gameDay: number): Promise<RandomWorldDailyTickResult> {
    const claim = await this.repo.claimDay(gameDay);
    if (!claim.claimed) {
      return {
        gameDay,
        claimed: false,
        expiredResolvedCount: 0,
        curveResolvedCount: 0,
        reappliedCount: 0,
        evaluatedTemplateCount: 0,
        activationCount: 0,
        secondaryFiredCount: 0,
        admittedCascadeCount: 0,
        gatedCascadeAttempts: 0,
        hollowClosureResolvedCount: 0,
        apparentRecoveryResolvedCount: 0,
        apparentRecoveryReappliedCount: 0,
        quorumFlipCount: 0,
        quorumResolvedCount: 0,
      };
    }

    // Phase 1 — generic hard-ceiling resolve-expired (defense in depth — design §3.2/§3.3).
    const expiredResolvedCount = await this.resolveExpiredEvents(gameDay);

    // Phase 2 — recovery curve (halgren_tannery_hailstorm only, C2).
    const curve = await this.applyRecoveryCurves(gameDay);

    // Phase 2 (C4) — hollow_at_the_corner fork closures (design §3.5.4 — the "courbe" is the window
    // pending + the issue, design §3.4). Evaluated BEFORE the plateau/apparent_recovery step below is
    // irrelevant to ordering here (hollow's own closure never reads apparent_recovery state).
    const hollowClosures = await this.applyHollowClosures(gameDay);

    // Phase 2 (C4) — apparent_recovery 3-phase curve (design §3.4/§3.5.3). Returns the SAME-tick
    // "which districts are currently in their plateau week (4-6)" set — computed from the SAME
    // already-fetched active-event list, ZERO extra query — consumed by phase 3's hollow evaluator below
    // (design AC5's plateau amplifier: "un autre template's activation prob ×1.5").
    const apparentRecoveryCurve = await this.applyApparentRecoveryCurves(gameDay);

    // Phase 2 (C4) — quorum_on_stadler_row adoption accumulation + state-driven flip/hysteresis (design
    // §3.5.6). ONE hum-observation fetch (S13, reused across all 18 districts — F4 discipline, "1 lecture
    // hum agrégée … réutilisée, pas dupliquée").
    const humObservationsForQuorum = await this.constantHumRepository.aggregateAvgHeatByDistrict();
    const quorum = await this.applyQuorumAdoptionAndFlips(gameDay, humObservationsForQuorum);

    // C3: today's LIVE stash-FULL district set (S8) — computed ONCE per tick, consumed by phase 3's
    // sideways_failure P1 predicate below AND persisted at phase 5 for TOMORROW's "sustained 2-day" read
    // (design §3.2 phase 5 / §3.6). A pure function of the CURRENTLY persisted `safehouses.current_fill`
    // (no RNG, no tick-history dependency — S8/`ErlangStashService.listDistrictsWithFullBand`).
    const todaySaturatedDistrictIds = await this.erlangStash.listDistrictsWithFullBand();

    // Phase 3 — daily activation triggers (registry order, batch-capped).
    const liveTemplates = liveRandomWorldTemplates().slice(0, randomWorldTunables.dailyActivationEvaluationBatchSize);
    let evaluatedTemplateCount = 0;
    let activationCount = 0;
    for (const entry of liveTemplates) {
      evaluatedTemplateCount += 1;
      if (entry.templateId === 'halgren_tannery_hailstorm') {
        const activated = await this.evaluateHailstormTrigger(gameDay);
        if (activated) activationCount += 1;
      } else if (entry.templateId === 'permanent_residue') {
        activationCount += await this.evaluatePermanentResidueSuccessors(gameDay);
      } else if (entry.templateId === 'sideways_failure') {
        activationCount += await this.evaluateSidewaysFailureTrigger(gameDay, todaySaturatedDistrictIds);
      } else if (entry.templateId === 'hollow_at_the_corner') {
        // C4: per-eligible-district daily roll (design §3.5.4) — amplified on a district CURRENTLY in an
        // apparent_recovery plateau week (design AC5, the plateau-amplifier's own falsifiable target).
        activationCount += await this.evaluateHollowTrigger(gameDay, apparentRecoveryCurve.plateauDistrictIds);
      } else if (entry.templateId === 'apparent_recovery') {
        // C4: successor of a resolved cohesion-dropping parent, time-windowed R+7..R+21 (design AC4).
        activationCount += await this.evaluateApparentRecoverySuccessors(gameDay);
      }
      // quorum_on_stadler_row: no phase-3 trigger — its activation is STATE-DRIVEN (phase 2's own
      // `applyQuorumAdoptionAndFlips` above), never a phase-3 roll (design §3.5.6). Still counted here
      // (evaluatedTemplateCount) — matches the registry-order batch-cap discipline every other template
      // observes.
    }

    // Phase 4 (C3) — sideways secondary shifts due today: apply the secondary modifier row + fan out the
    // coupling-discovery cascade/card to candidate players (design §3.2 phase 4 / §3.6).
    const secondary = await this.applyDueSidewaysSecondaries(gameDay);

    // Phase 5 — daily_run counters (C3 extends with gatedCascadeAttempts + saturatedDistrictIds; C4 adds
    // quorumAdoption — the rolling per-district vector TOMORROW's tick reads back as "yesterday's" state).
    await this.repo.finalizeDailyRun(gameDay, {
      evaluatedTemplateCount,
      activationCount,
      gatedCascadeAttempts: secondary.gatedCascadeAttempts,
      saturatedDistrictIds: todaySaturatedDistrictIds,
      quorumAdoption: quorum.quorumAdoption,
    });

    return {
      gameDay,
      claimed: true,
      expiredResolvedCount,
      curveResolvedCount: curve.resolvedCount,
      reappliedCount: curve.reappliedCount,
      evaluatedTemplateCount,
      activationCount,
      secondaryFiredCount: secondary.firedCount,
      admittedCascadeCount: secondary.admittedCascadeCount,
      gatedCascadeAttempts: secondary.gatedCascadeAttempts,
      hollowClosureResolvedCount: hollowClosures.resolvedCount,
      apparentRecoveryResolvedCount: apparentRecoveryCurve.resolvedCount,
      apparentRecoveryReappliedCount: apparentRecoveryCurve.reappliedCount,
      quorumFlipCount: quorum.flipCount,
      quorumResolvedCount: quorum.resolvedCount,
    };
  }

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // C5 — BO force-template (design §6.2/D16): the SAME code-path as the tick, never a bypass INSERT.
  // ════════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `forceActivate` — `RandomWorldAdminController.forceTemplate`'s ONE call into this service (design
   * §6.2/D16: "force `activateWorldEvent` par le MÊME code-path que le tick"). Dispatches to the SAME
   * private per-template activation method the tick's own phase 3 calls (`activateHailstorm`/
   * `activateHollow`) — never a direct `repo.insertEvent` from the controller (anti-fig-leaf, D14's own
   * discipline extended to the LIVE side: the controller never touches the repository directly).
   *
   * SCOPE (★ coder judgment call, documented rather than silently assumed): only the 2 LIVE templates
   * whose real activation is a self-contained function of `(districtId, gameDay)` alone are force-able
   * through this generic endpoint — `halgren_tannery_hailstorm` and `hollow_at_the_corner`
   * ({@link ForceableRandomWorldTemplateId}). The other 4 LIVE templates have NO "activate on district D"
   * standalone semantics in canon: `permanent_residue`/`apparent_recovery` are successor-only (they
   * require an already-resolved PARENT event, chosen by the generator's own eligibility query, not an
   * admin-picked district) ; `sideways_failure` requires a `TightCouplingPair` selection the generic body
   * shape here has no field for ; `quorum_on_stadler_row` has no discrete activation call at all (D10 —
   * state-driven, phase-2 only). Forcing any of those 4 would mean either fabricating a scenario canon
   * does not describe, or silently ignoring required inputs this endpoint's shape can't carry — the
   * SAME anti-fig-leaf discipline D14 applies to registry-only templates, extended honestly to these 4
   * LIVE-but-not-generically-forceable ones (routed as a TD at the C5 closeout, never a silent gap).
   * `RandomWorldAdminController` rejects the other 4 (422) BEFORE calling this method.
   *
   * `gameDay` is the CONTROLLER's own read of the most recent `random_world_daily_run.game_day` watermark
   * — never client-supplied (mirrors `PoliticalAdminController.forceActivate`'s own "REAL calendar
   * gameDay, never client-supplied" discipline: an admin cannot backdate/future-date an activation whose
   * expiry math depends on `gameDay`).
   *
   * RNG seed: `random_world:{gameDay}:force:{templateId}:{districtId}` — a namespace DISTINCT from the
   * tick's own natural per-template seed (`random_world:{gameDay}:{templateId}`). Force skips the
   * trigger's own `chance()`/weighted-district draws entirely (districtId is GIVEN, not rolled), so
   * reusing the tick's seed string would desync the draw sequence from what a real activation's RNG state
   * looks like at the point `activateHailstorm` is called — this endpoint's own falsifiable guarantee is
   * "same code path, same row shape" (design AC2), never "byte-identical RNG trace" (no such claim exists
   * in the design). `hollow_at_the_corner` draws no RNG at activation time (only later, at fork closure)
   * so the seed is unused on that branch — harmless, kept for a uniform call shape.
   */
  async forceActivate(
    templateId: ForceableRandomWorldTemplateId,
    districtId: number,
    gameDay: number,
  ): Promise<RandomWorldEventActiveRow> {
    if (templateId === 'halgren_tannery_hailstorm') {
      const rng = makeRng(`random_world:${gameDay}:force:${templateId}:${districtId}`);
      return this.activateHailstorm(districtId, gameDay, rng);
    }
    return this.activateHollow(districtId, gameDay);
  }

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // Phase 1 — resolve-expired (generic, template-agnostic).
  // ════════════════════════════════════════════════════════════════════════════════════════════════

  private async resolveExpiredEvents(gameDay: number): Promise<number> {
    const due = await this.repo.findActiveEventsPastExpiry(gameDay);
    for (const row of due) {
      // Idempotent even if the political NIGHTLY/19.5 revertExpired sweep already reaped these rows
      // (0 deletions — AC8 crash-safety).
      await this.effectModifierService.revertRandomWorldEvent(row.id);
      await this.repo.markResolved(row.id, gameDay);
    }
    return due.length;
  }

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // Phase 2 — halgren_tannery_hailstorm recovery curve (design §3.4/§3.5.1).
  // ════════════════════════════════════════════════════════════════════════════════════════════════

  private async applyRecoveryCurves(gameDay: number): Promise<{ resolvedCount: number; reappliedCount: number }> {
    const activeEvents = await this.repo.findActiveEventsByTemplate('halgren_tannery_hailstorm');
    let resolvedCount = 0;
    let reappliedCount = 0;

    for (const event of activeEvents) {
      const d = gameDay - event.started_at_game_day;
      const params: ScarCurveParams = {
        diffusionDays: randomWorldTunables.hailstormDiffusionDays,
        halfLifeDays: randomWorldTunables.hailstormRecoveryHalfLifeDays,
        floor: randomWorldTunables.hailstormPermanentResidueMagnitude,
        exponentK: randomWorldTunables.recoveryCurveExponentDefault,
      };
      const c = contamination(d, params);

      if (c < randomWorldTunables.hailstormDetectionThreshold) {
        // Full close-out: resolve + revert the 3 curve rows + apply 1 PERMANENT residue row
        // (expiresAtGameDay: null — AC5's target: the political revertExpired sweep filters
        // `expires_at_game_day IS NOT NULL`, so a null-expiry row is structurally invisible to it).
        await this.effectModifierService.revertRandomWorldEvent(event.id);
        await this.repo.markResolved(event.id, gameDay);
        await this.repo.updateCurvePosition(event.id, c);
        await this.effectModifierService.applyRandomWorldEvent(event.id, [
          {
            scopeType: 'DISTRICT',
            scopeRef: String(event.district_id),
            tunableKey: HAILSTORM_LEVER_KEYS.cohesionRecoveryRatePerDay,
            op: 'MULTIPLY',
            magnitude: 1 - randomWorldTunables.hailstormPermanentResidueMagnitude,
            appliedAtGameDay: gameDay,
            expiresAtGameDay: null,
          },
        ]);
        resolvedCount += 1;
        continue;
      }

      const persistedPosition = Number(event.recovery_curve_position);
      if (c !== persistedPosition) {
        const modifiers = buildHailstormEffectModifiers(event.district_id, c, gameDay, event.expires_at_game_day);
        await this.effectModifierService.reapplyRandomWorldEvent(event.id, modifiers);
        await this.repo.updateCurvePosition(event.id, c);
        reappliedCount += 1;
      }
      // else: byte-identical no-op day (AC4) — 0 writes.
    }

    return { resolvedCount, reappliedCount };
  }

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // Phase 3a — halgren_tannery_hailstorm activation trigger (design §3.5.1).
  // ════════════════════════════════════════════════════════════════════════════════════════════════

  private async evaluateHailstormTrigger(gameDay: number): Promise<boolean> {
    const seed = `random_world:${gameDay}:halgren_tannery_hailstorm`;
    const rng = makeRng(seed);

    const rolled = rng.chance(randomWorldTunables.hailstormActivationProbabilityDaily);
    if (!rolled) return false;

    const allDistrictIds = await this.repo.listAllDistrictIds();
    const observations = await this.constantHumRepository.aggregateAvgHeatByDistrict();
    const weights = districtHumWeights(
      observations.map((o) => ({ districtId: o.districtId, avgHeat: o.avgHeat })),
      allDistrictIds,
      randomWorldTunables.hailstormHumConditionWeight,
    );
    const districtId = drawWeightedDistrict(weights, rng);

    const gated = await this.isFreshActivationGated(districtId, gameDay);
    if (gated) return false; // "tirage réussi absorbé par la gate" — AC7: counted (evaluated), not activated.

    await this.activateHailstorm(districtId, gameDay, rng);
    return true;
  }

  /** D6 gates for a FRESH (non-successor) activation: district cooldown + global concurrent cap. */
  private async isFreshActivationGated(districtId: number, gameDay: number): Promise<boolean> {
    const cooldownBlocked = await this.repo.hasRecentActivationInDistrict(
      districtId,
      gameDay,
      randomWorldTunables.districtActivationCooldownDays,
    );
    if (cooldownBlocked) return true;
    return this.isConcurrentCapGated();
  }

  private async isConcurrentCapGated(): Promise<boolean> {
    // TD-255 (W0.2) — occupation du cap, `permanent_residue` EXCLU. Il ne se résout jamais (design
    // §3.5.2) : le compter revenait à laisser le cap se refermer définitivement au fil des résidus,
    // jusqu'à l'arrêt total de la génération d'événements. Voir le bloc doc du repository.
    const activeCount = await this.repo.countConcurrencyCapOccupancy();
    return activeCount >= randomWorldTunables.maxConcurrentActiveEvents;
  }

  private async activateHailstorm(districtId: number, gameDay: number, rng: Rng): Promise<RandomWorldEventActiveRow> {
    const hardExpiry = gameDay + randomWorldTunables.hailstormMaxDurationDays;
    const districtBlocks = await this.repo.listBlocksForDistrict(districtId);
    const scarBlockIds = drawScarPolygon(districtBlocks, rng, randomWorldTunables.hailstormScarBlockCount);

    // contamination(0) === 1.0 always (diffusionDays is always > 0, registry range 7..14) — the
    // activation-day magnitudes below use this SAME constant, never re-derived.
    const initialContamination = 1.0;

    const event = await this.repo.insertEvent({
      templateId: 'halgren_tannery_hailstorm',
      districtId,
      startedAtGameDay: gameDay,
      expiresAtGameDay: hardExpiry,
      initialCurvePosition: initialContamination,
      payload: { scarPolygon: scarBlockIds },
    });

    const modifiers = buildHailstormEffectModifiers(districtId, initialContamination, gameDay, hardExpiry);
    await this.effectModifierService.applyRandomWorldEvent(event.id, modifiers);
    // Returned (C5 addition) — `forceActivate` below (the BO force-template dispatcher) needs the created
    // row; the tick's own caller (`evaluateHailstormTrigger`) simply ignores it. Zero-regression: the
    // method BODY is byte-unchanged, only the signature/tail `return event;` are additive.
    return event;
  }

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // Phase 3b — permanent_residue successor trigger (design §3.5.2).
  // ════════════════════════════════════════════════════════════════════════════════════════════════

  private async evaluatePermanentResidueSuccessors(gameDay: number): Promise<number> {
    const eligibleParents = await this.repo.findResolvedHailstormParentsNeedingSuccessor();
    let activatedCount = 0;

    for (const parent of eligibleParents) {
      const seed = `random_world:${gameDay}:permanent_residue:${parent.id}`;
      const rng = makeRng(seed);

      const rolled = rng.chance(randomWorldTunables.permanentResidueSuccessorProbability);
      if (!rolled) continue;

      // Successor exemption from the district cooldown — see file header "coder judgment call".
      if (await this.isConcurrentCapGated()) continue;

      await this.activatePermanentResidue(parent, gameDay, rng);
      activatedCount += 1;
    }

    return activatedCount;
  }

  private async activatePermanentResidue(
    parent: RandomWorldEventActiveRow,
    gameDay: number,
    rng: Rng,
  ): Promise<void> {
    const leverCount = randomWorldTunables.permanentResidueLeverCount;
    const leverKeys = [
      HAILSTORM_LEVER_KEYS.cohesionRecoveryRatePerDay,
      HAILSTORM_LEVER_KEYS.inspectionQueueCap,
      HAILSTORM_LEVER_KEYS.raidTargetTemperature,
    ];
    const chosenLeverKeys = drawDistinct(leverKeys, leverCount, rng);

    // Sign per row (design §3.5.2 "signe tiré seedé par row" — "not always a penalty"). A fair 50/50
    // coin is a STRUCTURAL mechanism constant (uniform = no directional bias), the same R2.3 exemption
    // class as recovery-curve.ts's pure-math shape constants (1.0/2/0) — not a balance magnitude a
    // designer would retune independently; no `random_world.*` tunable exists for it (design §5's NEW
    // table has no such key).
    const leverDraws: PermanentResidueLeverDraw[] = chosenLeverKeys.map((tunableKey) => ({
      tunableKey,
      sign: rng.chance(0.5) ? 1 : -1,
    }));

    const parentPayload = (parent.payload ?? {}) as { scarPolygon?: readonly number[] };

    const event = await this.repo.insertEvent({
      templateId: 'permanent_residue',
      districtId: parent.district_id,
      startedAtGameDay: gameDay,
      expiresAtGameDay: null, // JAMAIS résolution (design §3.5.2).
      initialCurvePosition: 0, // no RecoveryCurve for this template (design §3.4) — position inert.
      parentEventId: parent.id,
      payload: {
        scarPolygon: parentPayload.scarPolygon ?? [],
        levers: leverDraws,
      },
    });

    const magnitude = randomWorldTunables.permanentResidueModifierMagnitude;
    const modifiers: EffectModifierInput[] = leverDraws.map((draw) => ({
      scopeType: 'DISTRICT',
      scopeRef: String(parent.district_id),
      tunableKey: draw.tunableKey,
      op: 'MULTIPLY',
      magnitude: draw.sign === 1 ? 1 + magnitude : 1 - magnitude,
      appliedAtGameDay: gameDay,
      expiresAtGameDay: null,
    }));
    await this.effectModifierService.applyRandomWorldEvent(event.id, modifiers);
  }

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // Phase 3c — sideways_failure activation trigger (design §3.5.5/§3.6, C3).
  // ════════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * Iterates BOTH `TIGHT_COUPLING_PAIRS` in registry order (P1 then P2 — deterministic). Per pair:
   * resolve the substrate-predicate ELIGIBLE-district set FIRST (no eligible district ⇒ NO roll at all —
   * mirrors `evaluatePermanentResidueSuccessors`'s own "eligible parents first, THEN roll per eligible"
   * shape; the design's own §3.6 table lists "condition primary" BEFORE "roll") — then ONE seeded roll
   * (see the file-header C3 addendum for the exact seed shape + draw order) against
   * `sideways_failure_coupling_probability_baseline` (REUSE, gdd/14:1713 "per tight-coupling pair daily
   * probability"). District X = the LOWEST-id eligible district (deterministic — the predicate decides
   * eligibility, never a weighted lottery; no separate "pick among eligible" instruction exists in the
   * design, so no extra RNG draw is spent on it). D6 gates (district cooldown on X + global concurrent
   * cap) apply AFTER the roll succeeds — the SAME shape hailstorm's own trigger uses.
   */
  private async evaluateSidewaysFailureTrigger(
    gameDay: number,
    todaySaturatedDistrictIds: readonly number[],
  ): Promise<number> {
    let activatedCount = 0;
    for (const pair of TIGHT_COUPLING_PAIRS) {
      const eligibleDistrictIds = await this.eligibleSidewaysDistricts(pair.pairKey, gameDay, todaySaturatedDistrictIds);
      if (eligibleDistrictIds.length === 0) continue; // predicate gates the roll — nothing to draw for.

      const seed = `random_world:${gameDay}:sideways_failure:${pair.pairKey}`;
      const rng = makeRng(seed);
      const rolled = rng.chance(randomWorldTunables.sidewaysFailureCouplingProbabilityBaseline);
      if (!rolled) continue;

      const districtX = eligibleDistrictIds[0]!; // lowest id — deterministic, see doc comment above.
      const gated = await this.isFreshActivationGated(districtX, gameDay);
      if (gated) continue; // roll succeeded but absorbed by D6 (counted as evaluated, not activated).

      await this.activateSidewaysFailure(pair.pairKey, districtX, gameDay, rng);
      activatedCount += 1;
    }
    return activatedCount;
  }

  /**
   * The 2 `TightCouplingPair` substrate predicates (design §3.6 table). Returns the SORTED-ascending set
   * of districts eligible to be primary district X for `pairKey` on `gameDay` (empty ⇒ ineligible, no
   * roll attempted this pair this tick).
   */
  private async eligibleSidewaysDistricts(
    pairKey: TightCouplingPairKey,
    gameDay: number,
    todaySaturatedDistrictIds: readonly number[],
  ): Promise<number[]> {
    if (pairKey === 'erlang_stash__deal_lek') {
      // P1: stash band FULL sustained 2 days (S8) — TODAY's live set (already computed this tick, phase
      // 3 preamble) ∩ YESTERDAY's set (read back from the PRIOR day's stored `random_world_daily_run.
      // saturated_district_ids` — design §3.2 phase 5 / §3.6). No row for yesterday ⇒ empty set (the
      // AC1 negation: FULL on day G only, not G−1, is structurally ineligible).
      const yesterday = await this.repo.readDailyRun(gameDay - 1);
      const yesterdaySaturated = new Set<number>((yesterday?.saturated_district_ids as number[] | undefined) ?? []);
      return todaySaturatedDistrictIds.filter((d) => yesterdaySaturated.has(d)).sort((a, b) => a - b);
    }

    // P2 (offhours_hum__bpd_attention): a FRESH (≤ sidewaysP2DetectionWindowDays) off_hours_drift_detection
    // row (04g-A substrate, S13) — the ★F4 BATCHED read (ONE query for all 18 districts,
    // off-hours-drift.repository.ts's own precedent — never re-implemented per-district).
    const latestByDistrict = await this.offHoursDriftRepository.listLatestPriorDetectionForEveryDistrict();
    const windowDays = randomWorldTunables.sidewaysP2DetectionWindowDays;
    const eligible: number[] = [];
    for (const [districtId, row] of latestByDistrict) {
      if (row.detected_at_game_day <= gameDay && row.detected_at_game_day > gameDay - windowDays) {
        eligible.push(districtId);
      }
    }
    return eligible.sort((a, b) => a - b);
  }

  private async activateSidewaysFailure(
    pairKey: TightCouplingPairKey,
    districtX: number,
    gameDay: number,
    rng: Rng,
  ): Promise<void> {
    const graph = await getDistrictAdjacencyGraph(() => this.fetchAdjacencySeed());
    const candidateYs = adjacentDistrictIds(graph, districtX); // sorted ascending, ALWAYS ≥2 (D11 rev invariant, C3 AC8).
    const districtY = candidateYs[rng.int(0, candidateYs.length - 1)]!;
    const delayDays = rng.int(1, 2); // D4 — canon "12-48 hours" at day granularity.
    const secondaryFiresAtGameDay = gameDay + delayDays;

    const primaryMagnitude = randomWorldTunables.sidewaysPrimaryMagnitude;
    const primaryExpiry = gameDay + randomWorldTunables.sidewaysPrimaryDurationDays;
    // The EVENT's own expiry must outlive BOTH shifts (the primary row decays on ITS OWN row-level
    // expiry above; the secondary row — applied later, phase 4 — decays on ITS OWN row-level expiry
    // too) so phase 1's generic resolve-expired sweep never reaps the whole event (and reverts a
    // not-yet-fired secondary) before the delayed secondary has even fired — the event-level analog of
    // design §3.2 phase 1's "défense en profondeur".
    const eventExpiry = secondaryFiresAtGameDay + randomWorldTunables.sidewaysSecondaryDurationDays;

    const payload: SidewaysFailurePayload = {
      pairKey,
      sourceDistrictId: districtX,
      secondaryDistrictId: districtY,
      secondaryFiresAtGameDay,
      secondaryApplied: false,
    };

    const event = await this.repo.insertEvent({
      templateId: 'sideways_failure',
      districtId: districtX,
      startedAtGameDay: gameDay,
      expiresAtGameDay: eventExpiry,
      // No RecoveryCurve for this template (design §3.4) — a discrete primary+secondary shift pair, not
      // a continuously-recomputed magnitude; position stays inert at 0.
      initialCurvePosition: 0,
      payload: payload as unknown as Record<string, unknown>,
    });

    await this.effectModifierService.applyRandomWorldEvent(event.id, [
      {
        scopeType: 'DISTRICT',
        scopeRef: String(districtX),
        tunableKey: HAILSTORM_LEVER_KEYS.raidTargetTemperature, // the SHARED primary lever, both pairs (design §3.6).
        op: 'MULTIPLY',
        magnitude: 1 - primaryMagnitude,
        appliedAtGameDay: gameDay,
        expiresAtGameDay: primaryExpiry,
      },
    ]);
  }

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // Phase 4 — sideways secondary shifts due (design §3.2 phase 4 / §3.6, C3).
  // ════════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * For every `active` `sideways_failure` event whose secondary is due TODAY (`repo.
   * findActiveSidewaysEventsDueForSecondary` — the AC9 idempotence guard on `payload.secondaryApplied`
   * lives in that query): apply the secondary DISTRICT modifier row (magnitude = `sideways_primary_
   * magnitude × sideways_secondary_magnitude_ratio` exact, on the PAIR-SPECIFIC lever — S7 for P1, the
   * already scope-aware `raid_target_temperature` for P2), mark the payload guard, THEN fan out the
   * cap-gated cascade/card via `RandomWorldCouplingService` (§3.6, S14).
   */
  private async applyDueSidewaysSecondaries(
    gameDay: number,
  ): Promise<{ firedCount: number; admittedCascadeCount: number; gatedCascadeAttempts: number }> {
    const due = await this.repo.findActiveSidewaysEventsDueForSecondary(gameDay);
    let firedCount = 0;
    let admittedCascadeCount = 0;
    let gatedCascadeAttempts = 0;

    for (const event of due) {
      const payload = event.payload as unknown as SidewaysFailurePayload;
      const pair = tightCouplingPairByKey(payload.pairKey);
      if (!pair) continue; // defensive — payload is always written by activateSidewaysFailure above.

      const secondaryMagnitude = randomWorldTunables.sidewaysPrimaryMagnitude * randomWorldTunables.sidewaysSecondaryMagnitudeRatio;
      const secondaryExpiry = gameDay + randomWorldTunables.sidewaysSecondaryDurationDays;

      await this.effectModifierService.applyRandomWorldEvent(event.id, [
        {
          scopeType: 'DISTRICT',
          scopeRef: String(payload.secondaryDistrictId),
          tunableKey: pair.secondaryTunableKey,
          op: 'MULTIPLY',
          magnitude: 1 - secondaryMagnitude,
          appliedAtGameDay: gameDay,
          expiresAtGameDay: secondaryExpiry,
        },
      ]);
      await this.repo.markSidewaysSecondaryApplied(event.id);
      firedCount += 1;

      const result = await this.couplingService.applyCouplingDiscovery({
        pairKey: pair.pairKey,
        sourceEventId: event.id,
        sourceDistrictId: payload.sourceDistrictId,
        cascadeTargetDistrictId: payload.secondaryDistrictId,
        gameDay,
      });
      admittedCascadeCount += result.admittedPlayerIds.length;
      gatedCascadeAttempts += result.gatedCount;
    }

    return { firedCount, admittedCascadeCount, gatedCascadeAttempts };
  }

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // Phase 2/3 (C4) — hollow_at_the_corner: per-district daily roll + fork closure (design §3.4/§3.5.4).
  // ════════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * Per-ELIGIBLE-district daily roll (design §3.5.4: "roll quotidien seedé < p par district ÉLIGIBLE
   * (cooldown D6)"). D6 is applied as a PRE-roll eligibility filter here (★ judgment call, distinct from
   * hailstorm's own "any district, weighted pick, THEN gate" shape, `isFreshActivationGated`'s doc
   * comment) — this template's own canon text explicitly qualifies "district éligible" as the roll's
   * scope, unlike hailstorm's text which has no such qualifier. `plateauDistrictIds` (design AC5) comes
   * from the SAME-tick `applyApparentRecoveryCurves` call, ZERO extra query.
   */
  private async evaluateHollowTrigger(gameDay: number, plateauDistrictIds: ReadonlySet<number>): Promise<number> {
    const allDistrictIds = await this.repo.listAllDistrictIds();
    let activatedCount = 0;
    for (const districtId of allDistrictIds) {
      if (await this.isFreshActivationGated(districtId, gameDay)) continue;

      const amplified = plateauDistrictIds.has(districtId);
      const p = randomWorldTunables.hollowActivationProbabilityDaily * (amplified ? randomWorldTunables.apparentRecoveryPlateauAmplifier : 1);
      const rng = makeRng(`random_world:${gameDay}:hollow_at_the_corner:${districtId}`);
      if (!rng.chance(Math.min(1, p))) continue;

      await this.activateHollow(districtId, gameDay);
      activatedCount += 1;
    }
    return activatedCount;
  }

  private async activateHollow(districtId: number, gameDay: number): Promise<RandomWorldEventActiveRow> {
    // expiresAtGameDay: null (★ judgment call, ★ resolution-reachability note) — unlike
    // halgren_tannery_hailstorm, no independent "hard duration ceiling" tunable exists for hollow
    // (design §5's NEW table has no `hollow_max_duration_days`-shaped key; `hollow_closure_window_weeks`
    // IS the resolution trigger itself, not a backstop distinct from it). If `expiresAtGameDay` instead
    // carried the closure day directly, phase 1's GENERIC hard-ceiling sweep (which runs strictly
    // BEFORE phase 2 in EVERY tick, same gameDay, fixed sequential order) would race and WIN the closure
    // day's own bare-revert-no-fork path EVERY single time — the fork logic below would never fire.
    // NULL sidesteps the race entirely (phase 1's WHERE clause is `isNotNull(expires_at_game_day)`,
    // structurally excluding this row — mirrors how the hailstorm PERMANENT residue row's own
    // `expiresAtGameDay: null` is already "structurally invisible" to that sweep, AC5's own precedent).
    // The closure instead fires via THIS template's OWN phase-2 step (`applyHollowClosures`) comparing
    // `gameDay >= payload.closureAtGameDay` — genuinely REACHABLE every day the tick runs (no competing
    // ceiling to lose a race against, UNLIKE hailstorm's own curve-vs-hard-cap conflict — see the C4
    // chunk report's ★ resolution-reachability finding).
    const closureAtGameDay = gameDay + randomWorldTunables.hollowClosureWindowWeeks * 7;
    const payload: HollowPayload = { closureAtGameDay, funeralAttendedBy: [] };

    const event = await this.repo.insertEvent({
      templateId: 'hollow_at_the_corner',
      districtId,
      startedAtGameDay: gameDay,
      expiresAtGameDay: null,
      initialCurvePosition: 0, // no continuous curve (design §3.4) — inert.
      payload: payload as unknown as Record<string, unknown>,
    });

    await this.effectModifierService.applyRandomWorldEvent(event.id, [
      {
        scopeType: 'DISTRICT',
        scopeRef: String(districtId),
        tunableKey: HAILSTORM_LEVER_KEYS.raidTargetTemperature,
        op: 'MULTIPLY',
        magnitude: 1 + randomWorldTunables.hollowBpdThinningFactor,
        appliedAtGameDay: gameDay,
        expiresAtGameDay: null,
      },
    ]);

    // S17 immediate drop (design AC1) — every player with ≥1 building in `districtId`, re-queried fresh
    // (never a frozen roster) via `RandomWorldCohesionMutationService` (no direct SQL, R2.2 AC10).
    await this.cohesionMutations.applyDeltaToDistrictPlayers(districtId, -randomWorldTunables.hollowCohesionDropMagnitude);
    // Returned (C5 addition, same rationale as activateHailstorm's own — `forceActivate` below).
    return event;
  }

  /**
   * Phase 2: fork closure at the 5-week window end (design §3.5.4/AC2/AC3). The bonus MORDS
   * (design AC3): a funeral logged on THIS event (per-event, not per-player — "dès qu'AU MOINS un
   * joueur a assisté") lifts the fork roll's probability by `hollow_funeral_reweave_bonus`.
   */
  private async applyHollowClosures(gameDay: number): Promise<{ resolvedCount: number }> {
    const activeHollows = await this.repo.findActiveEventsByTemplate('hollow_at_the_corner');
    let resolvedCount = 0;

    for (const event of activeHollows) {
      const payload = (event.payload ?? {}) as unknown as HollowPayload;
      if (gameDay < payload.closureAtGameDay) continue; // window still open — no-op day.

      const funeralAttended = (payload.funeralAttendedBy ?? []).length > 0;
      const p = randomWorldTunables.hollowReweaveProbability + (funeralAttended ? randomWorldTunables.hollowFuneralReweaveBonus : 0);
      // Seed `random_world:{event_id}:fork` — design §8's own canonical per-event seed list names
      // "fork" explicitly; consumed EXACTLY once, at closure.
      const rng = makeRng(`random_world:${event.id}:fork`);
      const reweave = rng.chance(Math.min(1, p));

      await this.effectModifierService.revertRandomWorldEvent(event.id);

      if (reweave) {
        // Reweave: baseline restored — the INVERSE of the activation drop (design AC2 "+0.18 exact").
        await this.cohesionMutations.applyDeltaToDistrictPlayers(event.district_id, randomWorldTunables.hollowCohesionDropMagnitude);
      } else {
        // Drift: NO restoration — 1 permanent drag row instead (design AC2 "1 − 0.02, expires NULL").
        await this.effectModifierService.applyRandomWorldEvent(event.id, [
          {
            scopeType: 'DISTRICT',
            scopeRef: String(event.district_id),
            tunableKey: HAILSTORM_LEVER_KEYS.cohesionRecoveryRatePerDay,
            op: 'MULTIPLY',
            magnitude: 1 - randomWorldTunables.hollowDriftPermanentDrag,
            appliedAtGameDay: gameDay,
            expiresAtGameDay: null,
          },
        ]);
      }

      await this.repo.recordHollowForkOutcome(event.id, reweave ? 'reweave' : 'drift');
      await this.repo.markResolved(event.id, gameDay);
      resolvedCount += 1;
    }

    return { resolvedCount };
  }

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // Phase 2/3 (C4) — apparent_recovery: 3-phase curve + plateau amplifier + residue (design §3.4/§3.5.3).
  // ════════════════════════════════════════════════════════════════════════════════════════════════

  /** The 2 week-boundary fields (`bounceEndWeek`/`plateauEndWeek`) are CANON-FIXED structural bounds
   *  ("bounce weeks 1-3 / plateau 4-6", `random_world_templates.md` §3.5.3 verbatim —
   *  `recovery-curve.ts`'s own `ThreePhaseCurveParams` doc comment) — NOT registry tunables (design §5's
   *  NEW table has no key for either; the C4 R2.3 sweep classifies these 2 literals as documented
   *  structural canon, the SAME allowance class `recovery-curve.ts`'s own C1-R23-3 sweep already
   *  established for its {0,1,2} formula-shape constants). */
  private apparentRecoveryCurveParams(): ThreePhaseCurveParams {
    return {
      bounceEndWeek: 3,
      plateauEndWeek: 6,
      durationWeeks: randomWorldTunables.apparentRecoveryDurationWeeks,
      bounceAmplitude: randomWorldTunables.apparentRecoveryBounceAmplitude,
      dipAmplitude: randomWorldTunables.apparentRecoveryDipAmplitude,
      exponentK: randomWorldTunables.recoveryCurveExponentDefault,
    };
  }

  /** 1-indexed week elapsed since `startedAtGameDay` (`recovery-curve.ts`'s own `threePhaseMultiplier`
   *  doc comment: "w = weeks elapsed … 1-indexed") — day 0..6 = week 1, day 7..13 = week 2, etc. */
  private weeksElapsed(gameDay: number, startedAtGameDay: number): number {
    return Math.floor((gameDay - startedAtGameDay) / 7) + 1;
  }

  private async applyApparentRecoveryCurves(
    gameDay: number,
  ): Promise<{ resolvedCount: number; reappliedCount: number; plateauDistrictIds: ReadonlySet<number> }> {
    const activeEvents = await this.repo.findActiveEventsByTemplate('apparent_recovery');
    const params = this.apparentRecoveryCurveParams();
    let resolvedCount = 0;
    let reappliedCount = 0;
    const plateauDistrictIds = new Set<number>();

    for (const event of activeEvents) {
      const w = this.weeksElapsed(gameDay, event.started_at_game_day);

      if (w > params.bounceEndWeek && w <= params.plateauEndWeek) {
        plateauDistrictIds.add(event.district_id);
      }

      if (w >= params.durationWeeks) {
        // Resolution (design §3.5.3/AC6): revert the curve row, apply the ONE-TIME S17 residue mutation
        // + 1 PERMANENT drag row (expires NULL — mirrors `activateHollow`'s own null-race reasoning:
        // this event's `expiresAtGameDay` was ALREADY null since activation, so there is no race to
        // sidestep here; NULL on the residue row simply matches the "permanent forever" semantics D9
        // calls for).
        await this.effectModifierService.revertRandomWorldEvent(event.id);
        await this.cohesionMutations.applyDeltaToDistrictPlayers(
          event.district_id,
          -randomWorldTunables.apparentRecoveryResidualFloorDelta,
        );
        await this.effectModifierService.applyRandomWorldEvent(event.id, [
          {
            scopeType: 'DISTRICT',
            scopeRef: String(event.district_id),
            tunableKey: HAILSTORM_LEVER_KEYS.cohesionRecoveryRatePerDay,
            op: 'MULTIPLY',
            magnitude: 1 - randomWorldTunables.apparentRecoveryPermanentDrag,
            appliedAtGameDay: gameDay,
            expiresAtGameDay: null,
          },
        ]);
        await this.repo.markResolved(event.id, gameDay);
        resolvedCount += 1;
        continue;
      }

      const m = threePhaseMultiplier(w, params);
      const persisted = Number(event.recovery_curve_position);
      if (m !== persisted) {
        await this.effectModifierService.reapplyRandomWorldEvent(event.id, [
          {
            scopeType: 'DISTRICT',
            scopeRef: String(event.district_id),
            tunableKey: HAILSTORM_LEVER_KEYS.cohesionRecoveryRatePerDay,
            op: 'MULTIPLY',
            magnitude: m,
            appliedAtGameDay: gameDay,
            expiresAtGameDay: null,
          },
        ]);
        await this.repo.updateCurvePosition(event.id, m);
        reappliedCount += 1;
      }
      // else: byte-identical no-op day (mirrors hailstorm's own AC4 no-op day) — 0 writes.
    }

    return { resolvedCount, reappliedCount, plateauDistrictIds };
  }

  /**
   * Successor trigger (design §3.5.3/AC4): eligible parents (`findApparentRecoveryEligibleParents`,
   * R+7..R+21) each get ONE seeded roll. Successor exemption from the district cooldown gate — the SAME
   * ★ judgment call `evaluatePermanentResidueSuccessors` already documents (file header, C2): a
   * successor is the aftermath of the SAME incident, never an independent new one; only the GLOBAL
   * concurrent cap applies.
   */
  private async evaluateApparentRecoverySuccessors(gameDay: number): Promise<number> {
    const eligibleParents = await this.repo.findApparentRecoveryEligibleParents(gameDay, 7, 21);
    let activatedCount = 0;

    for (const parent of eligibleParents) {
      const seed = `random_world:${gameDay}:apparent_recovery:${parent.id}`;
      const rng = makeRng(seed);
      if (!rng.chance(randomWorldTunables.apparentRecoverySuccessorProbability)) continue;
      if (await this.isConcurrentCapGated()) continue;

      await this.activateApparentRecovery(parent, gameDay);
      activatedCount += 1;
    }

    return activatedCount;
  }

  private async activateApparentRecovery(parent: RandomWorldEventActiveRow, gameDay: number): Promise<void> {
    const params = this.apparentRecoveryCurveParams();
    const initialM = threePhaseMultiplier(1, params); // activation day is week 1 (1-indexed).
    const payload: ApparentRecoveryPayload = { parentTemplateId: parent.template_id };

    const event = await this.repo.insertEvent({
      templateId: 'apparent_recovery',
      districtId: parent.district_id,
      startedAtGameDay: gameDay,
      // expiresAtGameDay: null — the SAME judgment call as `activateHollow`'s own doc comment: no
      // independent hard-duration tunable exists for apparent_recovery either; `duration_weeks` IS the
      // resolution trigger, evaluated by this template's OWN phase-2 step, never a competing hard cap.
      expiresAtGameDay: null,
      initialCurvePosition: initialM,
      parentEventId: parent.id,
      payload: payload as unknown as Record<string, unknown>,
    });

    await this.effectModifierService.applyRandomWorldEvent(event.id, [
      {
        scopeType: 'DISTRICT',
        scopeRef: String(parent.district_id),
        tunableKey: HAILSTORM_LEVER_KEYS.cohesionRecoveryRatePerDay,
        op: 'MULTIPLY',
        magnitude: initialM,
        appliedAtGameDay: gameDay,
        expiresAtGameDay: null,
      },
    ]);
  }

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // Phase 2 (C4) — quorum_on_stadler_row: rolling adoption + state-driven flip/cascade/hysteresis
  // (design §3.5.6/§3.7 D11 revised).
  // ════════════════════════════════════════════════════════════════════════════════════════════════

  /** The per-district seeded threshold — computed FRESH on demand every call (never persisted, design
   *  §8 "stable campagne": the SAME seed always reproduces the SAME value, `quorum-adoption.ts`'s own
   *  file header). */
  private quorumThresholdFor(districtId: number): number {
    const rng = makeRng(`quorum:${districtId}`);
    return drawQuorumThreshold(
      rng,
      randomWorldTunables.quorumThresholdMean,
      randomWorldTunables.quorumThresholdVariance,
      0.2,
      0.8,
    );
  }

  /**
   * Phase 2 (design §3.5.6): (A) accumulate every district's adoption from YESTERDAY's persisted
   * `random_world_daily_run.quorum_adoption` + today's hum signal (S13); (B) determine TODAY's fresh
   * flips (districts with NO currently-`active` quorum event whose adoption just crossed their OWN
   * seeded threshold — ascending district id, deterministic order); (C) cascade EACH flip along the
   * D11-revised adjacency graph ONLY (never a fabricated/complete graph — the AC8 locality negation is
   * structural here, not a special-cased skip) to neighbors near THEIR OWN threshold from below; (D)
   * persist the flips (activation) + evaluate hysteresis resolutions for already-`active` districts.
   * Cascade boosts land in THIS tick's `quorumAdoption` output (picked up as "yesterday's" state by
   * TOMORROW's tick) — never chained into an immediate SAME-tick re-flip (★ judgment call: design AC8's
   * own "valeur exacte dans le jsonb du run suivant" phrasing reads most naturally as "the value shows
   * up in the persisted state a subsequent tick reads back", not literally specified either way).
   */
  private async applyQuorumAdoptionAndFlips(
    gameDay: number,
    humObservations: readonly QuorumHumObservation[],
  ): Promise<{ quorumAdoption: Record<number, number>; flipCount: number; resolvedCount: number }> {
    const allDistrictIds = await this.repo.listAllDistrictIds();
    const yesterday = await this.repo.readDailyRun(gameDay - 1);
    const prevAdoptionRaw = (yesterday?.quorum_adoption as Record<string, number> | undefined) ?? {};
    const activeQuorumEvents = await this.repo.findActiveEventsByTemplate('quorum_on_stadler_row');
    const activeByDistrict = new Map(activeQuorumEvents.map((e) => [e.district_id, e] as const));

    // Step A — base accumulation for every district (a pure function of yesterday's value + today's signal).
    const working = new Map<number, number>();
    for (const districtId of allDistrictIds) {
      const prev = prevAdoptionRaw[districtId] ?? prevAdoptionRaw[String(districtId)] ?? 0;
      const signal = districtAdoptionSignal(humObservations, allDistrictIds, districtId);
      working.set(districtId, nextAdoption(prev, randomWorldTunables.quorumAdoptionAccumulationRate, signal));
    }

    // Step B — today's fresh flips (districts with no active event whose adoption just crossed threshold).
    const flips: number[] = [];
    for (const districtId of allDistrictIds) {
      if (activeByDistrict.has(districtId)) continue;
      if (working.get(districtId)! >= this.quorumThresholdFor(districtId)) flips.push(districtId);
    }

    // Step C — cascade along the D11-revised adjacency graph ONLY (C3's `district-adjacency.ts`, REUSED).
    if (flips.length > 0) {
      const graph = await getDistrictAdjacencyGraph(() => this.fetchAdjacencySeed());
      for (const flippedId of flips) {
        const excess = cascadeExcess(working.get(flippedId)!, this.quorumThresholdFor(flippedId));
        for (const neighborId of adjacentDistrictIds(graph, flippedId)) {
          if (activeByDistrict.has(neighborId)) continue;
          const neighborAdoption = working.get(neighborId)!;
          const neighborThreshold = this.quorumThresholdFor(neighborId);
          if (isNearOwnThresholdFromBelow(neighborAdoption, neighborThreshold, randomWorldTunables.quorumNearThresholdBand)) {
            working.set(neighborId, clamp01(neighborAdoption + randomWorldTunables.quorumCascadeDampening * excess));
          }
        }
      }
    }

    // Step D — persist flips (activation, D6 concurrent-cap GATED — TD-351) + hysteresis resolutions.
    // ★ Coder judgment call (D6 gate scope for `activateQuorum`, TD-351 — the file-header's own :59-70
    // note is the precedent this mirrors, not a fresh invention): `isConcurrentCapGated()` ONLY, never
    // `isFreshActivationGated()`'s district cooldown. The cooldown exists "to prevent independent,
    // REPEATED primary activations from piling up in the same district" (:60-63) — but a quorum flip is
    // ALREADY self-paced by its OWN state machine: Step B above excludes any district with a currently-
    // active event, and re-flipping after a hysteresis-floor resolution requires organically re-crossing
    // the district's OWN seeded threshold again, not a bare time-based cooldown. Worse, `hasRecentActiva
    // tionInDistrict` is template-AGNOSTIC (repository.ts :224-226, "any template, any status — the gate
    // is about pacing NEW incidents") — gating quorum with it would block a flip because of an UNRELATED
    // hailstorm/hollow/sideways activation in the SAME district, a cross-template coupling design §3.5.6/
    // §3.7 D11-revised never specifies. The concurrent cap alone closes the defect (quorum can no longer
    // insert past `max_concurrent_active_events`) without adding a constraint the canon doesn't ask for.
    let activatedFlipCount = 0;
    for (const districtId of flips) {
      if (await this.isConcurrentCapGated()) continue; // absorbed by D6 — counted as a flip, not activated.
      await this.activateQuorum(districtId, gameDay);
      activatedFlipCount += 1;
    }
    let resolvedCount = 0;
    for (const [districtId, event] of activeByDistrict) {
      if (working.get(districtId)! < randomWorldTunables.quorumHysteresisFloor) {
        await this.effectModifierService.revertRandomWorldEvent(event.id);
        await this.repo.markResolved(event.id, gameDay);
        resolvedCount += 1;
      }
      // else: PERSISTS even if adoption has dropped below ITS OWN threshold but stayed above the
      // hysteresis floor (design AC9 — path-back ≠ path-in, the structural payoff of a SEPARATE floor
      // tunable distinct from the threshold).
    }

    const quorumAdoption: Record<number, number> = {};
    for (const districtId of allDistrictIds) quorumAdoption[districtId] = working.get(districtId)!;
    // `flipCount` reports ACTUAL activations (mirrors `activationCount`'s discipline elsewhere in this
    // file, e.g. `evaluatePermanentResidueSuccessors`/`evaluateApparentRecoverySuccessors`'s own
    // `activatedCount`, never `eligibleParents.length`) — a cap-gated flip did NOT happen, so it must not
    // be counted as one (TD-351: pre-fix, this equalled `flips.length` unconditionally, since nothing
    // could ever gate it).
    return { quorumAdoption, flipCount: activatedFlipCount, resolvedCount };
  }

  private async activateQuorum(districtId: number, gameDay: number): Promise<void> {
    const event = await this.repo.insertEvent({
      templateId: 'quorum_on_stadler_row',
      districtId,
      startedAtGameDay: gameDay,
      expiresAtGameDay: null, // state-driven (design §4.1/D13 — canon-named NULL case, alongside permanent_residue).
      initialCurvePosition: 0, // not a RecoveryCurve axis (design §3.4) — position IS the adoption state, tracked in daily_run.
      payload: {},
    });

    await this.effectModifierService.applyRandomWorldEvent(event.id, [
      {
        scopeType: 'DISTRICT',
        scopeRef: String(districtId),
        tunableKey: HAILSTORM_LEVER_KEYS.raidTargetTemperature,
        op: 'MULTIPLY',
        magnitude: 1 - randomWorldTunables.quorumBpdAttentionFactor,
        appliedAtGameDay: gameDay,
        expiresAtGameDay: null,
      },
      {
        scopeType: 'DISTRICT',
        scopeRef: String(districtId),
        tunableKey: HAILSTORM_LEVER_KEYS.cohesionRecoveryRatePerDay,
        op: 'MULTIPLY',
        magnitude: 1 + randomWorldTunables.quorumCohesionShiftFactor,
        appliedAtGameDay: gameDay,
        expiresAtGameDay: null,
      },
    ]);
  }

  /** Combined fetch for `district-adjacency.ts`'s module-level cache (2 GLOBAL-static-table reads, one
   *  `Promise.all` — kept OUT of that pure module so it stays zero-I/O, see its own file header). */
  private async fetchAdjacencySeed(): Promise<{
    districts: Awaited<ReturnType<RandomWorldEventRepository['listDistrictBankSides']>>;
    threnny: Awaited<ReturnType<RandomWorldEventRepository['listThrennyEdgesRaw']>>;
  }> {
    const [districtRows, thrennyRows] = await Promise.all([
      this.repo.listDistrictBankSides(),
      this.repo.listThrennyEdgesRaw(),
    ]);
    return { districts: districtRows, threnny: thrennyRows };
  }
}
