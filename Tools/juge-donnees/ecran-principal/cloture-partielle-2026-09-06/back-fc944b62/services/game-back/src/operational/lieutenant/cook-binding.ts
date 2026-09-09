// IMPLEMENTS: docs/tech/07_lieutenants_and_behavior/behavior_script_dsl.md §Implications par couche §NestJS — game-back
//             (the per-archetype binding RESOLVES the signal snapshot from real game state + MAPS the resolved action
//             token to the archetype's real side-effect — "Module dsl/executor : … write uniquement via `side_effects`
//             déclarés"; the executor stays archetype-agnostic, the binding is the ONLY archetype-specific code) +
//             docs/superpowers/specs/2026-06-07-phase-06-lieutenants-dsl-slice1-design.md §5 (the COOK binding —
//             `cook_idle`/`heat` signals + `EXECUTE_DEFAULT` → restart the cook) +
//             docs/tech/04a_operational_systems/production_brindle.md §NestJS (startCook is the COOK default action) +
//             docs/tech/09_data_model/schema_city_state.md §2 (buildings.heat — the per-building heat magnitude)
//             -- session:2026-06-08 (Phase 6 vector #6 lieutenants+DSL — Task 5, COOK binding) --
//
// `CookBindingService` — the COOK-archetype adapter the delegation tick (T6) calls. It is the ONLY per-archetype module of
// the slice; the DSL engine (`src/dsl/`) is archetype-agnostic. THIS FILE'S SHAPE IS THE TEMPLATE for the 5 follow-up
// archetype vectors (LOGISTICS / DISTRIBUTION / LAUNDERING / SECURITY / BOOKKEEPER): each ships an analogous binding with
// the SAME two methods — `buildSnapshot` (resolve THIS archetype's signals from real state) and `applyExecuteDefault` (map
// the archetype's `EXECUTE_DEFAULT` to its real action) — and the engine is unchanged. Keep it clean and obvious.
//
// The binding sits BETWEEN the pure executor and the real game systems:
//   - `buildSnapshot` reads real state (cook-in-progress + building heat) → a `SignalSnapshot` the executor consumes.
//   - `applyExecuteDefault` consumes a real action (`ProductionService.startCook`) — the COOK archetype's default.
// The executor (T3) decides; the tick (T6) orchestrates (build → resolve → apply); the binding (T5) is the state↔action
// adapter. NO scheduler / no tick loop / no `resolve` call here (that is T6's job) — this is the binding ONLY.
//
// REUSE (never reinvent): `ProductionService.startCook` (the cook action — substance-generic, owns precursor consume +
// cook insert), `ProductionService.hasCookInProgress` (the cook_idle read — the service boundary, NOT a duplicated cook-
// session SQL), `substanceForBuildingType` (the lab→'brindle' resolution — never hardcode 'brindle'),
// `LieutenantRepository.getAssignedBuildingState` (the raw heat + operational_type read). DETERMINISTIC, no RNG.

import { Injectable, Logger } from '@nestjs/common';

import { ApiError } from '../../protocol/api-error';
import type { SignalSnapshot } from '../../dsl/signals';
import { ProductionService } from '../production/production.service';
import { substanceForBuildingType } from '../substance/substance-config';
import { LieutenantRepository } from './lieutenant.repository';
import type { ArchetypeBinding, DelegationLieutenant, SalientSignalSpec } from './archetype-binding';
import { METHOD_BY_ACTION_ID } from '../../exceptions/method-by-action-id';
import { COOK_HOST_OPERATIONAL_TYPES, type LieutenantArchetype } from './lieutenant-archetype';
import { bucketForStreak, effectsForBucket, yieldMultiplier } from './tenure-inertia';
import { lieutenantTunables } from './lieutenant-tunables';
import { productionTunables } from '../production/production-tunables';

/**
 * The MINIMAL owned-lieutenant row the COOK binding reads — exactly the fields the binding consults, nothing more. The
 * delegation tick selects the player's delegated lieutenants and passes each as this row. Phase-7 GENERALIZED the binding
 * seam: the canonical row is now `DelegationLieutenant` (archetype-binding.ts — it also carries `target_building_id` /
 * `role_archetype` / `delegation_paused` / `rules`, which the TICK applies, not the binding). `CookDelegationLieutenant`
 * is retained as a TYPE-ALIAS for back-compat — the COOK binding reads only `lieutenant_id` (for logging) +
 * `assigned_building_id` (the delegated building), so the wider row satisfies it (structural typing). `assigned_building_id`
 * is non-null for a delegated COOK lieutenant (the recruit sets it); the binding guards a null defensively (an absent
 * building → an empty snapshot / a benign no-op apply, never a crash).
 */
export type CookDelegationLieutenant = DelegationLieutenant;

@Injectable()
export class CookBindingService implements ArchetypeBinding {
  private readonly logger = new Logger(CookBindingService.name);

  /** The archetype this binding serves — its registry key (BindingRegistry indexes by it). REUSE LieutenantArchetype. */
  readonly archetype: LieutenantArchetype = 'COOK';

  constructor(
    private readonly production: ProductionService,
    private readonly repo: LieutenantRepository,
  ) {}

  /**
   * The RECRUIT-time assignment gate for a COOK lieutenant — EXACTLY the lab-ownership validation the Phase-6 recruit did
   * INLINE (lifted here verbatim so the recruit is archetype-agnostic): the assigned building must be the player's OWN
   * OPERATIONAL building (not owned / not operational → 404) of a COOK-host type (a `lab`; a wrong type → 409). The COOK
   * archetype ignores `targetBuildingId` (it has no dispatch destination — that is the LOGISTICS archetype's column). NO
   * mutation — a pure validation read (the SAME getOwnedOperationalBuilding read the recruit used).
   */
  async validateAssignment(
    playerId: string,
    assignedBuildingId: string,
    _targetBuildingId: string | null,
  ): Promise<void> {
    const owned = await this.repo.getOwnedOperationalBuilding(playerId, assignedBuildingId);
    if (!owned) {
      // Not owned / not converted / not operational → 404 (cross-player invisible too).
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `building ${assignedBuildingId} is not a player-owned operational building for this player.`,
      });
    }
    if (!COOK_HOST_OPERATIONAL_TYPES.has(owned.operational_type)) {
      // An operational building of the WRONG type for a COOK (only a lab hosts a COOK in slice 1) → 409.
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message:
          `building ${assignedBuildingId} is not a COOK-host building (operational_type='${owned.operational_type}') — ` +
          'a COOK lieutenant assigns to a lab.',
      });
    }
  }

  /**
   * BUILD the per-tick signal snapshot for a delegated COOK lieutenant from REAL game state (07 §NestJS — the binding fills
   * the snapshot the executor reads). Resolves the two slice-1 COOK signals:
   *   - `state.cook_idle` = `true` IFF there is NO cook in progress on the assigned building (the building is free to start
   *     a new cook → the rule `WHEN STATE(cook_idle,==,true) THEN EXECUTE_DEFAULT` fires). Read via the SERVICE boundary
   *     (`ProductionService.hasCookInProgress`) — never a duplicated cook-session query.
   *   - `events.heat` = the assigned building's CURRENT heat magnitude (a RAW read of `buildings.heat` — this is an internal
   *     engine read feeding the executor, NOT a player projection, so the bare number is correct; the rule
   *     `WHEN EVENT(heat,>=,<band>) THEN PAUSE_OPS` compares it). Omitted when the building heat cannot be resolved.
   * Per the ABSENCE CONTRACT (signals.ts): a signal the binding cannot resolve is OMITTED (not set to `undefined`) so the
   * executor treats it as a non-matching trigger. Every other field stays absent (→ a false trigger). NO mutation — pure
   * reads. If the assigned building is null/missing, returns an EMPTY snapshot (no signal resolves → the executor takes no
   * script-driven action this tick).
   */
  async buildSnapshot(
    playerId: string,
    lieutenant: CookDelegationLieutenant,
  ): Promise<SignalSnapshot> {
    const state: Record<string, number | boolean> = {};
    const events: Record<string, number | boolean> = {};

    const buildingId = lieutenant.assigned_building_id;
    if (buildingId !== null) {
      const inProgress = await this.production.hasCookInProgress(playerId, buildingId);
      state.cook_idle = !inProgress;

      const buildingState = await this.repo.getAssignedBuildingState(buildingId);
      if (buildingState !== null) {
        // RAW heat (internal engine read — NOT a player projection; the bare number is correct here).
        events.heat = buildingState.heat;
        // Phase-12 T3: a qualitative heat band for Tier-2 MY_STATE conditions (`state.heat_high`). Derived from the SAME
        // raw heat vs the cook_heat_high_band tunable — exposes a band, not the raw scalar (R2.2-aligned). Absent if the
        // building state is unresolved (above guard ensures buildingState !== null before we land here).
        state.heat_high = buildingState.heat >= lieutenantTunables.cookHeatHighBand;
      }
      // (a missing building_operational_state → `heat` + `heat_high` OMITTED, per the absence contract — never set to undefined.)

      // D1 C7 — deep-cook + escalate-quality signals. Read via getCookSignals (single repo method; NOT a player projection
      // — the binding computes the boolean bands from the raw values). Per the absence contract: all 4 signals are omitted
      // when getCookSignals returns null (no operational state row for this building).
      const cookSignals = await this.repo.getCookSignals(playerId, buildingId);
      if (cookSignals !== null) {
        // `precursor_stock_thalmite_sufficient` — true IFF the building has at least one batch's worth of thalmite.
        state.precursor_stock_thalmite_sufficient =
          cookSignals.thalmiteQuantity >= productionTunables.thalmiteUnitsPerBatch;
        // `precursor_stock_garnet_sufficient` — true IFF the building has at least one batch's worth of garnet salt.
        state.precursor_stock_garnet_sufficient =
          cookSignals.garnetSaltQuantity >= productionTunables.garnetSaltUnitsPerBatch;
        // `equipment_tier_band` — boolean band: true = Tier 2+ (capable of deep cook), false = Tier 1 (baseline).
        // Exposes a band, not the raw tier scalar (R2.2-aligned). A COOK DSL rule reads this as a boolean condition.
        state.equipment_tier_band = cookSignals.equipmentTier >= 2;
        // `precursor_purity_below_escalation` — true IFF ANY brindle in product_storage has purity_grade 'crude' or 'low'
        // (below standard). Banded (R2.2 — no raw purity_grade string exposed). The rule
        // `WHEN STATE(precursor_purity_below_escalation,=,true) THEN REQUEST_PLAYER_INPUT` uses this as the escalation trigger.
        state.precursor_purity_below_escalation = cookSignals.hasBelowStandardBrindle;
      }
    }

    return { state, events };
  }

  /**
   * APPLY the COOK archetype's `EXECUTE_DEFAULT` (07 §NestJS — the binding maps the resolved token to the archetype's real
   * side-effect; the executor never acts itself). The COOK default is RESTART THE COOK: resolve the substance from the
   * assigned building's operational_type via `substanceForBuildingType` (a `lab` → `'brindle'` — registry-driven, never
   * hardcoded) and call `ProductionService.startCook` (the substance-generic cook action — owns the precursor consume + the
   * cook insert, guarded). NO refining passes (slice-1 COOK delegation is Brindle; default 0).
   *
   * TENURE YIELD BONUS (Phase-11b C1 — the COOK efficiency-bonus carrot): BEFORE starting the cook, derive the delegated
   * lieutenant's tenure efficiency-bonus yield MULTIPLIER from its streak (`lieutenant.tenure_score`) — SINGLE-SOURCED via
   * the pure module: `bucketForStreak` → `effectsForBucket(...).role_efficiency_bonus` → `yieldMultiplier(bonus, curve)` —
   * and pass it to startCook as a permille (×1000) int (`opts.delegatedYieldPermille`) so the binding CAPTURES it onto the
   * cook row AT START (a FRESH lieutenant → BONUS_NONE → 1.0 → 1000). This avoids a production→lieutenant circular dep: the
   * binding (which owns the tenure bucket + the curve) computes it once here; a later task (C2) APPLIES it at COOK_ADVANCE
   * completion, reading the stored permille and knowing nothing about tenure. Deterministic (no RNG); the permille is a
   * BO-only computed value. The COOK keeps `refiningPasses` at 0 (slice-1 Brindle delegation).
   *
   * BENIGN 409 NO-OP: a `RESOURCE_STATE_CONFLICT` from startCook (a cook already in progress, or insufficient precursor) is
   * EXPECTED in normal delegation — the lieutenant tries each tick and the building may already be busy or out of precursor
   * — so it is CAUGHT here and logged as a benign no-op (the tick proceeds normally). Any OTHER error PROPAGATES to the
   * tick's per-lieutenant try/catch (T6) — a genuine fault must not be swallowed. If the assigned building is null or hosts
   * no shipped substance (`substanceForBuildingType` → null), the apply is a benign no-op (nothing to cook).
   */
  async applyExecuteDefault(
    playerId: string,
    lieutenant: CookDelegationLieutenant,
    _gameMinute: number, // unused — COOK's startCook path carries no created_at clock (W6.1 C7, archetype-binding.ts)
  ): Promise<'TAKEN' | 'NOOP'> {
    const buildingId = lieutenant.assigned_building_id;
    if (buildingId === null) {
      return 'NOOP'; // no delegated building → nothing to cook (defensive — a delegated COOK lieutenant always has one).
    }

    const buildingState = await this.repo.getAssignedBuildingState(buildingId);
    if (buildingState === null) {
      return 'NOOP'; // the building / its operational state vanished → nothing to cook (benign no-op).
    }

    const substance = substanceForBuildingType(buildingState.operational_type);
    if (substance === null) {
      // The building's operational type hosts no shipped substance (not a COOK-host type) → nothing to cook.
      return 'NOOP';
    }

    // TENURE YIELD BONUS (Phase-11b C1) — derive the captured yield multiplier (permille ×1000) from the lieutenant's
    // streak, SINGLE-SOURCED via the pure module (no re-implementation): streak → bucket → role_efficiency_bonus →
    // multiplier. A delegated COOK always has a real tenure_score (FRESH → BONUS_NONE → yieldMultiplier 1.0 → permille 1000).
    const bucket = bucketForStreak(lieutenant.tenure_score, lieutenantTunables.tenureInertia.thresholds);
    const bonus = effectsForBucket(bucket).role_efficiency_bonus;
    const permille = Math.round(
      yieldMultiplier(bonus, lieutenantTunables.tenureInertia.efficiencyBonusCurve) * 1000,
    );

    try {
      // refiningPasses stays 0 for COOK (slice-1 Brindle); the captured tenure yield permille is passed via opts (CAPTURE-only).
      await this.production.startCook(playerId, buildingId, substance, 0, { delegatedYieldPermille: permille });
      return 'TAKEN';
    } catch (err) {
      if (err instanceof ApiError && err.code === 'RESOURCE_STATE_CONFLICT') {
        // Benign: a cook is already running on the building, or there is not enough precursor to start one this tick.
        // The delegated lieutenant simply takes no action this tick — NOT an error to propagate.
        this.logger.debug(
          `applyExecuteDefault: benign no-op for lieutenant=${lieutenant.lieutenant_id} ` +
            `building=${buildingId} substance=${substance} (${err.message})`,
        );
        return 'NOOP';
      }
      throw err; // any other fault propagates to the tick's per-lieutenant try/catch (T6).
    }
  }

  /** The COOK salient manifest: an uncovered high-heat spike raises the Phase-14 heat card (byte-identical — the same
   *  pause/keep candidates, the same heat→PAUSE rule, the same descriptor + BO scalars). */
  salientSignals(): SalientSignalSpec[] {
    const band = lieutenantTunables.cookHeatHighBand;
    return [
      {
        signal: 'heat',
        kind: 'EVENT',
        isSalient: (s) => typeof s.events.heat === 'number' && s.events.heat >= band,
        card: {
          event_descriptor: 'High heat on the assigned building — the lieutenant has no rule to handle it.',
          candidate_actions: [
            {
              id: 'pause',
              label: 'Pause operations when heat is high',
              label_i18n: { key: 'exception.lieutenant_cook.pause.label', params: {} }, // TD-455
              projected_consequence: 'The lieutenant stops cooking while heat stays high.',
              projected_consequence_i18n: { key: 'exception.lieutenant_cook.pause.projected_consequence', params: {} }, // TD-455
              add_rule_dsl: `WHEN EVENT(heat,>=,${band}) THEN PAUSE_OPS @100;`,
              method: METHOD_BY_ACTION_ID.pause, // Lot 0 §1 D4 (C2).
            },
            {
              id: 'keep',
              label: 'Keep cooking',
              label_i18n: { key: 'exception.lieutenant_cook.keep.label', params: {} }, // TD-455
              projected_consequence: 'The lieutenant ignores the heat and keeps operating.',
              projected_consequence_i18n: { key: 'exception.lieutenant_cook.keep.projected_consequence', params: {} }, // TD-455
              add_rule_dsl: null,
              method: METHOD_BY_ACTION_ID.keep, // Lot 0 §1 D4 (C2).
            },
            // [lot-3 TD-074] 3rd candidate — more tolerant pause: only on extreme heat.
            // DSL note: heat signal is a float [0..1]; user spec said "band+20" as analog but band+20 = 0.5+20 = 20.5
            // which is outside [0..1] valid range. Using 0.9 as the clamped "extreme heat" threshold (closest valid
            // expression to the intent "pause only when heat is extreme"). R9.3 — code controls the candidate set.
            {
              id: 'pause_hard',
              label: 'Pause only on extreme heat',
              label_i18n: { key: 'exception.lieutenant_cook.pause_hard.label', params: {} }, // TD-455
              projected_consequence: 'The lieutenant keeps cooking through moderate heat, pausing only when heat is extreme.',
              projected_consequence_i18n: { key: 'exception.lieutenant_cook.pause_hard.projected_consequence', params: {} }, // TD-455
              add_rule_dsl: `WHEN EVENT(heat,>=,0.9) THEN PAUSE_OPS @100;`,
              method: METHOD_BY_ACTION_ID.pause_hard, // Lot 0 §1 D4 (C2).
            },
          ],
          suggested_action: {
            id: 'pause',
            label: 'Pause operations when heat is high',
            label_i18n: { key: 'exception.lieutenant_cook.pause.label', params: {} }, // TD-455
            projected_consequence: 'The lieutenant stops cooking while heat stays high.',
            projected_consequence_i18n: { key: 'exception.lieutenant_cook.pause.projected_consequence', params: {} }, // TD-455
            add_rule_dsl: `WHEN EVENT(heat,>=,${band}) THEN PAUSE_OPS @100;`,
            method: METHOD_BY_ACTION_ID.pause, // Lot 0 §1 D4 (C2).
          },
          confidence: 0.8,
          severity: 80,
          priority: 80,
        },
      },
    ];
  }
}
