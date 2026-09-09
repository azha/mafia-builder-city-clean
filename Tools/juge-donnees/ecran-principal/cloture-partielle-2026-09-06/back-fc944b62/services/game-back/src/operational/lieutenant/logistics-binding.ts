// IMPLEMENTS: docs/tech/07_lieutenants_and_behavior/behavior_script_dsl.md §Implications par couche §NestJS — game-back
//             (the per-archetype binding RESOLVES the signal snapshot from real game state + MAPS the resolved action
//             token to the archetype's real side-effect — "Module dsl/executor : … write uniquement via `side_effects`
//             déclarés"; the executor stays archetype-agnostic, the binding is the ONLY archetype-specific code) +
//             docs/tech/07_lieutenants_and_behavior/lieutenant_definition.md §Archetype projection (the LOGISTICS
//             archetype ↔ the 04a roles `Stash keeper` / `Courier coordinator` / `Procurement specialist`; the dispatch
//             binding is grounded on `Courier coordinator` — see lieutenant-archetype.ts LOGISTICS_ROLE_ID) +
//             docs/superpowers/specs/2026-06-08-phase-07-lieutenant-archetypes-design.md §Architecture (the LOGISTICS
//             binding — `source_has_product` signal + `EXECUTE_DEFAULT` → DistributionService.dispatch source→target) +
//             docs/tech/04a_operational_systems/distribution_couriers_runners.md §`Courier`/§`Route` (the reused dispatch
//             action — a foot courier carrying source product to a destination building) +
//             docs/tech/09_data_model/schema_operational_chain.md §2 (product_storage.quantity_grams — the
//             `source_has_product` read; courier / route / courier_shift — the dispatch's writes) + schema_lieutenant.md
//             §2/§4 (lieutenant.target_building_id — the Phase-7 T0 dispatch DESTINATION column, the ONLY archetype that
//             uses it) + projects/mafia_city_game/gdd/14_tunable_constants.md §Lieutenants + DSL
//             (lieutenant.logistics_dispatch_cargo_grams — the per-dispatch cargo, NEW Phase-7 T0)
//             -- session:2026-06-08 (Phase 7 vector #7 lieutenant archetypes — Task 4, LOGISTICS binding) --
//
// `LogisticsBindingService` — the LOGISTICS-archetype adapter the delegation tick + recruit dispatch through. The FOURTH
// `ArchetypeBinding` (after COOK + SECURITY + BOOKKEEPER, whose SHAPE this MIRRORS): the SAME three methods —
// `buildSnapshot` (resolve THIS archetype's signal from real state), `applyExecuteDefault` (map `EXECUTE_DEFAULT` to its
// real action), and `validateAssignment` (the recruit-time assignment gate) — and the DSL engine is unchanged. This is the
// archetype that needs TWO buildings: the lieutenant's assigned (SOURCE) building AND its `target_building_id` (the
// dispatch DESTINATION — the Phase-7 T0 column; LOGISTICS is the ONLY archetype that uses it).
//
// The LOGISTICS default is AUTO-DISPATCH a courier source→target: when the assigned (source) building holds product, the
// delegated LOGISTICS lieutenant runs the SAME player-driven dispatch (DistributionService.dispatch — sources cargo from
// the source product_storage [guarded decrement], creates a route + a FOOT courier [in_transit] + a courier_shift carrying
// the cargo, all atomic; the COURIER_TRANSIT tick later walks the route + deposits the cargo at the destination). The
// lieutenant simply calls the action the player would have called by hand — it reimplements NOTHING (no decrement, no
// route/courier/shift creation, no roster-cap gate here; the dispatch owns all of that).
//
//   - `buildSnapshot` resolves the one LOGISTICS signal: `state.source_has_product` = the assigned (source) building's
//     total product_storage grams > 0 (the source has cargo to dispatch → the rule `WHEN STATE(source_has_product,==,true)
//     THEN EXECUTE_DEFAULT` fires). OMITTED when the assigned building cannot be resolved (no assigned building).
//   - `applyExecuteDefault` consumes DistributionService.dispatch(playerId, source, target, cargo, 'foot') with
//     cargo = min(logisticsDispatchCargoGrams, source available grams) — the LOGISTICS archetype's default action.
//
// THE CARGO POLICY (documented): cargo = min( T.lieutenant.logistics_dispatch_cargo_grams (default 200) , source total
// grams ). A pure min over a tunable batch size and the actual source stock — DETERMINISTIC, no RNG. So the binding never
// asks the dispatch for more than the source physically holds (the dispatch's own per-substance guard then re-validates
// the single substance it picks; a race that drains the source between this read and the dispatch's guarded decrement
// surfaces as a benign 409 — see below). `cargo <= 0` (the source is empty) → a benign no-op (nothing to dispatch).
//
// COURIER-AVAILABLE SIGNAL — EMITTED from `DistributionService.isCourierSlotAvailable` (the spec names
// `state.courier_available`; it was omitted at T4 pending a clean read): `true` when the player's in-transit
// courier count is below the effective roster cap (a fresh dispatch would pass); `false` when the cap is reached
// (a dispatch attempt would 409 OVER_CAPACITY). The clean read is provided by `DistributionService.isCourierSlotAvailable`
// — a named method on the ALREADY-INJECTED `DistributionService` that reuses the SAME two reads the dispatch hot path
// makes (getOwnedOperationalHub + countInTransitShifts + HubRosterService.effectiveCap), without exporting
// HubRosterService or DistributionRepository across the module boundary. NO new DB query types; NO new cross-module
// exports. The cap is STILL enforced by the dispatch's own cap gate (atomically, on the EXECUTE_DEFAULT path) — the signal
// is now the PROACTIVE read that lets the DSL rule avoid even trying when the cap is reached (the benign-409 catch below
// remains as a defense in depth for the race where cap changes between buildSnapshot and applyExecuteDefault).
//
// REUSE (never reinvent): `DistributionService.dispatch` (the dispatch action — owns the cargo sizing per-substance + the
// guarded source decrement + the route/courier/shift creation + the roster-cap + vehicle gates; consumed exactly as the
// player's POST /dispatch does), `LieutenantRepository.getSourceProductGrams` (the source total-grams read — the repo
// boundary, NOT a duplicated product_storage query), `LieutenantRepository.getOwnedOperationalBuilding` (the SAME owned-
// operational gate COOK/SECURITY/BOOKKEEPER use — applied to BOTH the source AND the target). DETERMINISTIC, no RNG.

import { Inject, Injectable, Logger, Optional } from '@nestjs/common';

import { ApiError } from '../../protocol/api-error';
import type { SignalSnapshot } from '../../dsl/signals';
import type { ResolvedAction } from '../../dsl/signals';
import { DistributionService } from '../distribution/distribution.service';
import { LieutenantRepository } from './lieutenant.repository';
import { RouteRequestRepository } from '../distribution/route-request.repository';
import { lieutenantTunables } from './lieutenant-tunables';
import type { ArchetypeBinding, DelegationLieutenant, SalientSignalSpec } from './archetype-binding';
import { METHOD_BY_ACTION_ID } from '../../exceptions/method-by-action-id';
import type { LieutenantArchetype } from './lieutenant-archetype';

@Injectable()
export class LogisticsBindingService implements ArchetypeBinding {
  private readonly logger = new Logger(LogisticsBindingService.name);

  /** The archetype this binding serves — its registry key (BindingRegistry indexes by it). REUSE LieutenantArchetype. */
  readonly archetype: LieutenantArchetype = 'LOGISTICS';

  /**
   * System 9c C6 — DD-COORD-CONFIG (OQ-A6): per-hub transient config mutated by `SET_STANCE` /
   * `TOGGLE_EPHEMERAL` actions during a single coordinator evaluation. Reset to defaults by
   * `resetHubConfig()` at the start of each `CoordinatorExecutionService.handleRouteRequest` so every
   * `fire-request` starts with the canonical defaults. NOT persisted (no new schema — OQ-A6).
   */
  private _hubConfig = { stance: 'balanced' as string, vehicle: 'foot' as string, ephemeral: false };

  /**
   * Reset the per-hub transient config to defaults. Called by `CoordinatorExecutionService` at the
   * start of each coordinator evaluation (before processing any rules from `resolveAll`).
   * DETERMINISTIC: no RNG, no I/O.
   */
  resetHubConfig(): void {
    this._hubConfig = { stance: 'balanced', vehicle: 'foot', ephemeral: false };
  }

  constructor(
    private readonly distribution: DistributionService,
    private readonly repo: LieutenantRepository,
    // System 9c C5 — RouteRequestRepository is @Optional() as a safety net. In practice, both the
    // DistributionModule and LieutenantModule contexts inject a non-null instance: DistributionModule
    // provides RouteRequestRepository directly; LieutenantModule imports DistributionModule which exports
    // RouteRequestRepository, so the repo is resolved in both contexts. The @Optional() prevents a hard
    // crash if the dep graph ever changes, but routeRequestRepo is effectively always non-null at runtime.
    // The tick-driven LOGISTICS path (lab/stash lieutenants in LieutenantModule) never queries route_request
    // because those lieutenants have no hub rows — the guard `if (this.routeRequestRepo)` inside
    // buildSnapshot is the correct boundary (not an absent injection).
    @Optional() @Inject(RouteRequestRepository) private readonly routeRequestRepo: RouteRequestRepository | null,
  ) {}

  /**
   * The RECRUIT-time assignment gate for a LOGISTICS lieutenant — the ONLY archetype that needs TWO buildings:
   *   - the ASSIGNED (source) building must be the player's OWN OPERATIONAL building (not owned / not operational → 404).
   *     Any operational type may be a dispatch SOURCE (whatever building holds the product to move), so — like SECURITY —
   *     there is NO host-type restriction on the source (the dispatch's own per-substance source guard validates that the
   *     source actually holds shippable product at dispatch time).
   *   - the `targetBuildingId` is REQUIRED (this is the archetype that USES the Phase-7 T0 column): a null/empty target →
   *     422 VALIDATION_FAILED. The target (dispatch DESTINATION) must ALSO be the player's OWN OPERATIONAL building
   *     (invalid → 404, via the SAME getOwnedOperationalBuilding read). Source and target must DIFFER (a same-building
   *     dispatch is meaningless — the dispatch's route CHECK origin≠destination would reject it; caught here at recruit so
   *     a self-dispatch lieutenant is never created → 409).
   * The SAME owned-operational read COOK/SECURITY/BOOKKEEPER use (getOwnedOperationalBuilding). NO mutation — pure reads.
   */
  async validateAssignment(
    playerId: string,
    assignedBuildingId: string,
    targetBuildingId: string | null,
  ): Promise<void> {
    // SOURCE — the player's OWN operational building (any operational type may hold product to dispatch).
    const source = await this.repo.getOwnedOperationalBuilding(playerId, assignedBuildingId);
    if (!source) {
      // Not owned / not converted / not operational → 404 (cross-player invisible too).
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `building ${assignedBuildingId} is not a player-owned operational building for this player.`,
      });
    }

    // System 9c C5 — DD-COORD-PER-HUB (OQ-A1/OQ-A3): when the assigned building IS a distribution_hub,
    // at most ONE coordinator may be assigned per hub. A second LOGISTICS lieutenant on the same hub is
    // rejected qualitatively (409 RESOURCE_STATE_CONFLICT). Non-hub LOGISTICS (labs/stash — the tick-driven
    // path, preserved from pre-C5) skip this check and proceed directly to the target gate below.
    // OQ-A3 (hub MUST be used for coordinator recruit) is enforced in the coordinator-specific recruit entry
    // point (test route _test/coordinator/recruit-assign for C5; the production coordinator endpoint in C7+).
    if (source.operational_type === 'distribution_hub') {
      const existing = await this.repo.findCoordinatorForHub(playerId, assignedBuildingId);
      if (existing !== null) {
        throw new ApiError('RESOURCE_STATE_CONFLICT', {
          message: `hub ${assignedBuildingId} already has a Courier coordinator (lieutenant_id=${existing.lieutenant_id}) — only one coordinator per hub is allowed (OQ-A1).`,
        });
      }
    }

    // TARGET — REQUIRED for LOGISTICS (the dispatch destination; the ONLY archetype that uses target_building_id).
    if (typeof targetBuildingId !== 'string' || !targetBuildingId) {
      throw new ApiError('VALIDATION_FAILED', {
        message: 'LOGISTICS requires a target_building_id (dispatch destination).',
      });
    }
    if (targetBuildingId === assignedBuildingId) {
      // A courier from a building to itself moves nothing (the dispatch route CHECK origin≠destination forbids it too).
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message:
          'target_building_id must differ from the assigned (source) building — a courier route cannot start and end at the same building.',
      });
    }
    const target = await this.repo.getOwnedOperationalBuilding(playerId, targetBuildingId);
    if (!target) {
      // The target is not the player's / not operational → 404 (the SAME gate the source used).
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `target_building ${targetBuildingId} is not a player-owned operational building for this player.`,
      });
    }
  }

  /**
   * BUILD the per-tick signal snapshot for a delegated LOGISTICS lieutenant from REAL game state (07 §NestJS — the binding
   * fills the snapshot the executor reads). Resolves the two LOGISTICS signals:
   *   - `state.source_has_product` = `true` IFF the assigned (source) building holds product (total product_storage grams
   *     > 0 → the source has cargo to dispatch → the rule `WHEN STATE(source_has_product,==,true) THEN EXECUTE_DEFAULT`
   *     fires). Read via the repository boundary (LieutenantRepository.getSourceProductGrams) — never a duplicated
   *     product_storage query. An empty source → false (nothing to dispatch this tick).
   *   - `state.courier_available` = `true` IFF the player's in-transit courier count is below the effective roster cap (a
   *     fresh dispatch would pass the OVER_CAPACITY gate); `false` when the cap is reached (an attempted dispatch would
   *     409). Read via `DistributionService.isCourierSlotAvailable` — the clean cap check on the already-injected service
   *     (see the file header). Always set (no null guard needed — it is a global player-level read, not building-scoped).
   * Per the ABSENCE CONTRACT (signals.ts): a signal the binding cannot resolve is OMITTED (not set to `undefined`). If the
   * assigned building is null/missing, `source_has_product` is OMITTED → an empty snapshot → the executor takes no
   * script-driven action this tick. `courier_available` is still set (it is building-independent). NO mutation — pure reads.
   */
  async buildSnapshot(
    playerId: string,
    lieutenant: DelegationLieutenant,
  ): Promise<SignalSnapshot> {
    const state: Record<string, number | boolean> = {};
    const events: Record<string, number | boolean> = {};

    const sourceId = lieutenant.assigned_building_id;
    if (sourceId !== null) {
      const grams = await this.repo.getSourceProductGrams(sourceId);
      state.source_has_product = grams > 0;
      // System 9c C5 — DD-COORD-PER-HUB (OQ-A5): `product_ready` = alias for `source_has_product` in the coordinator
      // context (a hub has product ready when the source holds stock). Separate signal name for the coordinator DSL.
      state.product_ready = state.source_has_product;

      // System 9c C5 — DD-COORD-TRIGGER: `events.shipment_pending = true` when at least one pending route_request exists
      // for this hub. Only populated when RouteRequestRepository is available (it is @Optional() — null in LieutenantModule
      // context where RouteRequestRepository is not exported, non-null in DistributionModule context). OQ-A5 / OQ-RR1.
      if (this.routeRequestRepo !== null) {
        const pending = await this.routeRequestRepo.readPendingForHubOldestFirst(playerId, sourceId);
        if (pending.length > 0) {
          events.shipment_pending = true;
        }
      }
      // (When routeRequestRepo is null: `shipment_pending` OMITTED per the absence contract — never set to undefined.
      //  A LOGISTICS lieutenant in the old tick-driven path runs in LieutenantModule context; that is fine — it does
      //  not use the coordinator event-driven path and has no route_request rows anyway.)
    }
    // (a null assigned building → `source_has_product`, `product_ready`, `shipment_pending` OMITTED — absence contract.)

    // COURIER-AVAILABLE SIGNAL (spec §3 — see the file header): `true` when a roster slot is free; `false` at/over cap.
    // Mirrors the COOK binding's `heat_high` pattern: derived from the SAME cap reads the dispatch already performs,
    // exposed by `DistributionService.isCourierSlotAvailable` without exporting new cross-module dependencies.
    state.courier_available = await this.distribution.isCourierSlotAvailable(playerId);

    return { state, events };
  }

  /**
   * APPLY the LOGISTICS archetype's `EXECUTE_DEFAULT` (07 §NestJS — the binding maps the resolved token to the archetype's
   * real side-effect; the executor never acts itself). The LOGISTICS default is DISPATCH A COURIER source→target: call
   * DistributionService.dispatch (the SAME guarded action the player's POST /dispatch runs — it sources the cargo from the
   * source product_storage [guarded decrement], creates the route + the FOOT courier + the courier_shift, atomic; the
   * COURIER_TRANSIT tick later delivers it). NOTHING is reimplemented here.
   *
   * CARGO POLICY (documented in the file header): cargo = min( T.lieutenant.logistics_dispatch_cargo_grams (default 200) ,
   * source total grams ). A pure min — DETERMINISTIC, no RNG. `cargo <= 0` (the source is empty) → a benign no-op (nothing
   * to dispatch). The vehicle is 'foot' (the always-allowed M1 mode — a no-hub player can still dispatch; a hub player
   * could later unlock bike/car, deferred).
   *
   * GUARD: `target_building_id` is REQUIRED for a LOGISTICS lieutenant (validateAssignment enforced it at recruit, so it is
   * always set here). If it is null at apply-time (a defensive impossibility), the apply is a benign logged no-op (nothing
   * to dispatch to) — never a crash.
   *
   * BENIGN 409 NO-OP: a `RESOURCE_STATE_CONFLICT` from dispatch is EXPECTED in normal delegation —
   *   - OVER_CAPACITY: the player is at their concurrent in-transit roster cap (no operational hub → cap 2) → the dispatch
   *     is refused until a shipment arrives + frees a slot. The `courier_available` signal (now emitted by buildSnapshot)
   *     provides the PROACTIVE read; this catch is a defense-in-depth for the race where the cap fills between buildSnapshot
   *     and this apply (a concurrent player dispatch that passed the pre-tx check first);
   *   - insufficient product: a race drained the source between buildSnapshot/getSourceProductGrams and the guarded
   *     decrement (a concurrent player dispatch);
   *   - same source=dest: validateAssignment already forbade it, but the dispatch re-guards it defensively.
   * — so it is CAUGHT here and logged as a benign no-op (the tick proceeds normally — the lieutenant retries next tick on
   * the fresh state). Any OTHER error PROPAGATES to the tick's per-lieutenant try/catch (T6) — a genuine fault must not be
   * swallowed. If the assigned (source) building is null, the apply is a benign no-op (defensive; a delegated LOGISTICS
   * lieutenant always has both buildings).
   */
  async applyExecuteDefault(
    playerId: string,
    lieutenant: DelegationLieutenant,
    _gameMinute: number, // unused — LOGISTICS's dispatch path carries no created_at clock (W6.1 C7, archetype-binding.ts)
  ): Promise<'TAKEN' | 'NOOP'> {
    const sourceId = lieutenant.assigned_building_id;
    if (sourceId === null) {
      return 'NOOP'; // no source building → nothing to dispatch (defensive — a delegated LOGISTICS lieutenant always has one).
    }

    const targetId = lieutenant.target_building_id;
    if (targetId === null) {
      // target_building_id is REQUIRED at recruit (validateAssignment), so this is a defensive impossibility. Log + no-op
      // rather than crash the tick (never throw on a structural invariant the recruit already enforced).
      this.logger.warn(
        `applyExecuteDefault: LOGISTICS lieutenant=${lieutenant.lieutenant_id} has a null target_building_id ` +
          `(source=${sourceId}) — no dispatch (target is required at recruit; this should not happen).`,
      );
      return 'NOOP';
    }

    // CARGO POLICY: min(tunable batch, source total grams). 0 (empty source) → benign no-op.
    const sourceGrams = await this.repo.getSourceProductGrams(sourceId);
    const cargo = Math.min(lieutenantTunables.logisticsDispatchCargoGrams, sourceGrams);
    if (cargo <= 0) {
      // The source holds no product → nothing to dispatch (a benign no-op — the rule fires but there is nothing to move).
      return 'NOOP';
    }

    try {
      await this.distribution.dispatch(playerId, sourceId, targetId, cargo, 'foot');
      return 'TAKEN';
    } catch (err) {
      if (err instanceof ApiError && err.code === 'RESOURCE_STATE_CONFLICT') {
        // Benign: the player is at the concurrent in-transit roster cap (OVER_CAPACITY), or a race drained the source
        // (insufficient product), or the same source=dest (re-guarded). The delegated lieutenant simply takes no action
        // this tick (the dispatch tx rolled back, nothing moved) — NOT an error to propagate.
        this.logger.debug(
          `applyExecuteDefault: benign no-op for lieutenant=${lieutenant.lieutenant_id} ` +
            `source=${sourceId} target=${targetId} cargo=${cargo} (${err.message})`,
        );
        return 'NOOP';
      }
      throw err; // any other fault propagates to the tick's per-lieutenant try/catch (T6).
    }
  }

  /**
   * System 9c C5 — DD-COORD-TRIGGER: apply the resolved action from the event-driven `CoordinatorExecutionService`
   * path. For `EXECUTE_DEFAULT` → the existing `applyExecuteDefault` VERBATIM (the degenerate case — `foot` /
   * `min(200, source)` cargo, byte-identical to today's LOGISTICS lieutenant). For the arg-bearing variants
   * (`DISPATCH_COURIER` / `SET_STANCE` / `TOGGLE_EPHEMERAL`) — C6 lands those branches. For `PAUSE_OPS` /
   * `REQUEST_PLAYER_INPUT` / `NONE` → no operational action (same as the tick's write-on-transition behavior).
   *
   * Returns `'TAKEN'` when a courier was dispatched (the dispatch succeeded) or `'NOOP'` when no dispatch
   * occurred (over-cap benign-409 / arg-bearing C6-deferred no-op / non-dispatching action). The caller
   * (`CoordinatorExecutionService`) uses this signal to decide whether to flip the pending `route_request` to
   * `fulfilled`: only a `'TAKEN'` dispatch fulfils the request; a `'NOOP'` leaves it `pending` for the next
   * tick (§3.4/§3.6 — a benign-409 over-cap leaves the request pending, per the design contract).
   *
   * DETERMINISTIC. NO `Math.random`, NO `Date.now`.
   */
  async applyResolvedAction(
    playerId: string,
    lieutenant: DelegationLieutenant,
    action: ResolvedAction,
    _gameMinute: number,
  ): Promise<'TAKEN' | 'NOOP'> {
    switch (action.kind) {
      case 'EXECUTE_DEFAULT':
        // The degenerate case: the coordinator's script fired EXECUTE_DEFAULT → dispatch with the
        // current per-hub stance (mutated by SET_STANCE, or 'balanced' by default). This is byte-identical
        // to the tick-driven LOGISTICS path when no SET_STANCE has fired (_hubConfig.stance='balanced').
        return this.applyExecuteDefaultWithConfig(playerId, lieutenant);

      case 'DISPATCH_COURIER': {
        // System 9c C6 — DD-COORD-GRAMMAR: arg-bearing dispatch using parsed route/vehicle/stance args.
        // The arg-bearing DISPATCH_COURIER calls the SAME DistributionService.dispatch() as EXECUTE_DEFAULT —
        // the coordinator is NOT a gate-bypass (roster-cap, vehicle gate, ownsVehicle, capacity all apply).
        const dcAction = action as { kind: 'DISPATCH_COURIER'; route?: string; vehicle?: string; stance?: string };
        const vehicleArg = dcAction.vehicle;
        const stanceArg = dcAction.stance;

        // OQ-A2b: route selector resolved to target_building_id (the assigned dispatch destination).
        // to_primary_stash and to_dealer_spots both resolve to lieutenant.target_building_id for now
        // (only one target per coordinator — per the design, additional selectors extend this in v1.x).
        const routeArg = dcAction.route; // 'to_primary_stash' | 'to_dealer_spots' | undefined
        void routeArg; // selector → target_building_id for all current selectors

        const targetId = lieutenant.target_building_id;
        const sourceId = lieutenant.assigned_building_id;
        if (!sourceId || !targetId) return 'NOOP';

        // Cargo policy: min(logisticsDispatchCargoGrams, source grams) — same as applyExecuteDefault.
        const sourceGrams = await this.repo.getSourceProductGrams(sourceId);
        const cargo = Math.min(lieutenantTunables.logisticsDispatchCargoGrams, sourceGrams);
        if (cargo <= 0) return 'NOOP';

        // Resolve vehicle/stance from action args (explicit) → fall back to _hubConfig defaults.
        const resolvedVehicle = vehicleArg ?? this._hubConfig.vehicle;
        const resolvedStance = stanceArg ?? this._hubConfig.stance;
        const resolvedEphemeral = this._hubConfig.ephemeral;

        try {
          await this.distribution.dispatch(
            playerId,
            sourceId,
            targetId,
            cargo,
            resolvedVehicle,
            resolvedEphemeral,
            resolvedStance,
          );
          return 'TAKEN';
        } catch (err) {
          if (err instanceof ApiError) {
            // Benign vehicle-gate (§3.6 — un-owned-vehicle is a NOOP, not a propagated error):
            //   vehicle not unlocked: 422 VALIDATION_FAILED, message "dispatch refused: vehicle \"<v>\" not unlocked ..."
            //     (hub=null → bike/car not in allowedVehicles → thrown BEFORE ownsVehicle check).
            //   vehicle not in pool:  409 RESOURCE_STATE_CONFLICT, message "dispatch refused: vehicle \"<v>\" not in your vehicle pool ..."
            //     (vehicle_inventory miss → thrown by ownsVehicle gate).
            // Both are detected by `err.message.startsWith('dispatch refused: vehicle "')` (precise — no other
            // dispatch gate uses this prefix). Either of these → 'NOOP'; request stays pending.
            //
            // Also benign (unchanged from original): ALL 409 RESOURCE_STATE_CONFLICT — over-cap ("dispatch refused:
            // the player is at/over..."), insufficient product, same-building route. These were already NOOP before.
            //
            // NOT benign (still throws): 422 VALIDATION_FAILED for cargo capacity ("dispatch refused: cargo Ng exceeds...")
            // and any other unexpected error.
            const isVehicleGate =
              (err.code === 'VALIDATION_FAILED' || err.code === 'RESOURCE_STATE_CONFLICT') &&
              err.message.startsWith('dispatch refused: vehicle "');
            const isOverCap = err.code === 'RESOURCE_STATE_CONFLICT';
            if (isVehicleGate || isOverCap) {
              this.logger.debug(
                `applyResolvedAction DISPATCH_COURIER: benign no-op for lt=${lieutenant.lieutenant_id} (${err.message})`,
              );
              return 'NOOP';
            }
          }
          throw err;
        }
      }

      case 'SET_STANCE': {
        // System 9c C6 — DD-COORD-CONFIG: mutate the per-hub default stance (transient, OQ-A6).
        // The CoordinatorExecutionService processes all matching rules in priority order; SET_STANCE
        // fires as a config-setting side effect BEFORE the terminal dispatch action.
        const stanceArg = (action as { kind: 'SET_STANCE'; stance: string }).stance;
        this._hubConfig = { ...this._hubConfig, stance: stanceArg };
        this.logger.debug(
          `applyResolvedAction SET_STANCE: per-hub default stance → ${stanceArg} (transient, OQ-A6)`,
        );
        return 'TAKEN';
      }

      case 'TOGGLE_EPHEMERAL': {
        // System 9c C6 — DD-COORD-CONFIG: mutate the per-hub ephemeral flag (transient, OQ-A6).
        const valueArg = (action as { kind: 'TOGGLE_EPHEMERAL'; value: boolean }).value;
        this._hubConfig = { ...this._hubConfig, ephemeral: valueArg };
        this.logger.debug(
          `applyResolvedAction TOGGLE_EPHEMERAL: per-hub ephemeral → ${valueArg} (transient, OQ-A6)`,
        );
        return 'TAKEN';
      }

      case 'PAUSE_OPS':
      case 'REQUEST_PLAYER_INPUT':
      case 'NONE':
      // 04f-A C7 (D9) — ADDITIVE: `SCHEDULE_MAINTENANCE` is the Facility-manager auto-schedule action; it is
      // meaningless for the LOGISTICS coordinator (this binding never wires it to any real effect) — falls
      // through to the SAME no-op every other non-dispatching token already resolves to. `ResolvedAction`
      // exhaustiveness (TS2366) requires a case here; behavior for every pre-existing token is UNCHANGED.
      case 'SCHEDULE_MAINTENANCE':
        // No operational action — mirrors the tick's behavior for these tokens.
        // OQ-B8 = option (ii): the Muscle resolves EXECUTE_DEFAULT; there is no dedicated assault
        // action. REQUEST_ASSAULT is removed as dead (DD-MUSCLE-P4-LEGIBLE §8.1.5).
        return 'NOOP';
    }
  }

  /**
   * Apply EXECUTE_DEFAULT using the current per-hub transient config (C6 — DD-COORD-CONFIG).
   * When _hubConfig is at defaults (stance='balanced', vehicle='foot', ephemeral=false), this is
   * byte-identical to the original `applyExecuteDefault` called from the tick-driven path.
   * The tick-driven path continues to call `applyExecuteDefault` directly (unchanged).
   */
  private async applyExecuteDefaultWithConfig(
    playerId: string,
    lieutenant: DelegationLieutenant,
  ): Promise<'TAKEN' | 'NOOP'> {
    const sourceId = lieutenant.assigned_building_id;
    if (sourceId === null) return 'NOOP';

    const targetId = lieutenant.target_building_id;
    if (targetId === null) {
      this.logger.warn(
        `applyExecuteDefaultWithConfig: LOGISTICS lieutenant=${lieutenant.lieutenant_id} has a null target_building_id ` +
          `(source=${sourceId}) — no dispatch (target is required at recruit; this should not happen).`,
      );
      return 'NOOP';
    }

    const sourceGrams = await this.repo.getSourceProductGrams(sourceId);
    const cargo = Math.min(lieutenantTunables.logisticsDispatchCargoGrams, sourceGrams);
    if (cargo <= 0) return 'NOOP';

    try {
      await this.distribution.dispatch(
        playerId,
        sourceId,
        targetId,
        cargo,
        this._hubConfig.vehicle,
        this._hubConfig.ephemeral,
        this._hubConfig.stance,
      );
      return 'TAKEN';
    } catch (err) {
      if (err instanceof ApiError) {
        // Benign vehicle-gate (§3.6 — un-owned-vehicle is a NOOP, not a propagated error):
        //   vehicle not unlocked: 422 VALIDATION_FAILED, "dispatch refused: vehicle \"<v>\" not unlocked ..."
        //   vehicle not in pool:  409 RESOURCE_STATE_CONFLICT, "dispatch refused: vehicle \"<v>\" not in your vehicle pool ..."
        // Detected precisely by `err.message.startsWith('dispatch refused: vehicle "')`.
        // Also benign (unchanged): ALL 409 RESOURCE_STATE_CONFLICT (over-cap, insufficient product, same-building).
        // NOT benign: 422 for cargo capacity ("dispatch refused: cargo Ng exceeds...") or unexpected errors.
        const isVehicleGate =
          (err.code === 'VALIDATION_FAILED' || err.code === 'RESOURCE_STATE_CONFLICT') &&
          err.message.startsWith('dispatch refused: vehicle "');
        const isOverCap = err.code === 'RESOURCE_STATE_CONFLICT';
        if (isVehicleGate || isOverCap) {
          this.logger.debug(
            `applyExecuteDefaultWithConfig: benign no-op for lieutenant=${lieutenant.lieutenant_id} ` +
              `source=${sourceId} target=${targetId} cargo=${cargo} (${err.message})`,
          );
          return 'NOOP';
        }
      }
      throw err;
    }
  }

  /** LOGISTICS salient manifest: product piling up at the source with no dispatch rule → a teachable card. */
  salientSignals(): SalientSignalSpec[] {
    const dispatch = {
      id: 'dispatch',
      label: 'Dispatch product automatically',
      label_i18n: { key: 'exception.lieutenant_logistics.dispatch.label', params: {} }, // TD-455
      projected_consequence: 'The lieutenant routes product onward whenever the source holds stock.',
      projected_consequence_i18n: { key: 'exception.lieutenant_logistics.dispatch.projected_consequence', params: {} }, // TD-455
      add_rule_dsl: 'WHEN STATE(source_has_product,==,true) THEN EXECUTE_DEFAULT @100;',
      method: METHOD_BY_ACTION_ID.dispatch, // Lot 0 §1 D4 (C2).
    };
    return [
      {
        signal: 'source_has_product',
        kind: 'STATE' as const,
        isSalient: (s) => s.state.source_has_product === true,
        card: {
          event_descriptor: 'Product is piling up at the source — the lieutenant has no dispatch rule.',
          candidate_actions: [
            dispatch,
            {
              id: 'acknowledge',
              label: 'Leave it for now',
              label_i18n: { key: 'exception.lieutenant_logistics.acknowledge.label', params: {} }, // TD-455
              projected_consequence: 'No rule is added; the product keeps piling up.',
              projected_consequence_i18n: { key: 'exception.lieutenant_logistics.acknowledge.projected_consequence', params: {} }, // TD-455
              add_rule_dsl: null,
              method: METHOD_BY_ACTION_ID.acknowledge, // Lot 0 §1 D4 (C2).
            },
            // [lot-3 TD-074] 3rd candidate — dispatch only when stock is high (deliberate manual-only choice).
            // DSL grammar note: the LOGISTICS snapshot exposes `source_has_product` (boolean) — there is no numeric
            // quantity state field in the current snapshot, so a threshold-conditional DSL rule cannot be expressed.
            // Closest valid expression: add_rule_dsl: null (ONE_TIME — the player triggers dispatch once manually
            // when they judge stock is high enough, without creating a standing rule that fires on every product tick).
            {
              id: 'dispatch_high',
              label: 'Dispatch only when the stock is high',
              label_i18n: { key: 'exception.lieutenant_logistics.dispatch_high.label', params: {} }, // TD-455
              projected_consequence: 'The lieutenant lets product accumulate and only dispatches when the stock is high.',
              projected_consequence_i18n: { key: 'exception.lieutenant_logistics.dispatch_high.projected_consequence', params: {} }, // TD-455
              add_rule_dsl: null,
              method: METHOD_BY_ACTION_ID.dispatch_high, // Lot 0 §1 D4 (C2) — matches the comment above verbatim.
            },
          ],
          suggested_action: dispatch,
          confidence: 0.8,
          severity: 60,
          priority: 60,
        },
      },
    ];
  }
}
