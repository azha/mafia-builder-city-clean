// IMPLEMENTS: docs/tech/07_lieutenants_and_behavior/behavior_script_dsl.md §Implications par couche §NestJS — game-back
//             (the per-archetype binding RESOLVES the signal snapshot from real game state + MAPS the resolved action
//             token to the archetype's real side-effect — "Module dsl/executor : … write uniquement via `side_effects`
//             déclarés"; the executor stays archetype-agnostic, the binding is the ONLY archetype-specific code) +
//             docs/tech/07_lieutenants_and_behavior/lieutenant_definition.md §Composite LieutenantArchetype +
//             §Archetype projection (the LAUNDERING archetype ↔ the 04a roles `Front shop manager` / `Pipeline
//             accountant` — the front-shop laundering family; this DELEGATED binding is grounded on `Front shop
//             manager` — see lieutenant-archetype.ts LAUNDERING_ROLE_ID) +
//             docs/superpowers/specs/2026-06-08-phase-08-laundering-distribution-archetypes-design.md §Architecture
//             (the LAUNDERING binding — `safehouse_filled` + `node_has_capacity` signals + `EXECUTE_DEFAULT` →
//             LaunderingService.inject safehouse→front-shop Stage-1 node, a tunable amount policy) +
//             docs/tech/04a_operational_systems/laundering_pipeline.md §Stage 1 — cash into front shop (the reused
//             inject action — drain a safehouse into a front-shop's Stage-1 node; §Contrainte fondamentale Unconformity
//             — injection ≤ the front-shop's legitimate baseline, else a deviation → System 7 audit pin) +
//             docs/tech/09_data_model/schema_pipeline_and_laundering.md §2 (laundering_node.building_id +
//             safehouse.building_id — the entity↔building FKs the resolution rides on; R9.3 — READ, never redefine) +
//             projects/mafia_city_game/gdd/14_tunable_constants.md §Lieutenants + DSL
//             (lieutenant.laundering_respect_baseline — the conservative-mode flag, NEW Phase-8 T1)
//             -- session:2026-06-08 (Phase 8 vector #8 lieutenant archetypes LAUNDERING + DISTRIBUTION — Task 1) --
//
// `LaunderingBindingService` — the LAUNDERING-archetype adapter the delegation tick + recruit dispatch through. The SIXTH
// `ArchetypeBinding` (after COOK + SECURITY + BOOKKEEPER + LOGISTICS, whose SHAPE this MIRRORS): the SAME three methods —
// `buildSnapshot` (resolve THIS archetype's signals from real state), `applyExecuteDefault` (map `EXECUTE_DEFAULT` to its
// real action), and `validateAssignment` (the recruit-time assignment gate) — and the DSL engine is unchanged. Like
// LOGISTICS, this archetype needs TWO buildings: the lieutenant's ASSIGNED (front-shop, the Stage-1 laundering host) AND
// its `target_building_id` (the SAFEHOUSE the cash is drained FROM — the Phase-7 T0 column, reused here, NO schema change).
//
// The LAUNDERING default is AUTO-INJECT safehouse cash into the front-shop's Stage-1 node: when the safehouse holds cash
// and the node has room, the delegated LAUNDERING lieutenant runs the SAME player-driven inject (LaunderingService.inject
// — drains the safehouse's System-9 slot model into the front-shop's Stage-1 node buffer [tail_risk current_occupancy],
// seeds System 10's row, and feeds System 7's deviation input, all atomic; the System-8 cleaning + LAUNDER_OUTPUT release
// ticks later move the laundered cash to the wallet). The lieutenant simply calls the action the player would have called
// by hand — it reimplements NOTHING (no slot drain, no node credit, no deviation profile, no capacity guard here; the
// inject owns all of that).
//
//   - `buildSnapshot` resolves TWO LAUNDERING signals:
//       · `state.safehouse_filled` = the target safehouse's reconstructed held cents > 0 (the safehouse has cash to
//         inject → the rule `WHEN STATE(safehouse_filled,==,true) THEN EXECUTE_DEFAULT` fires). OMITTED when the target
//         safehouse cannot be resolved (no target building / not the player's safehouse).
//       · `state.node_has_capacity` = the assigned front-shop's Stage-1 node `current_occupancy` (cents) < its capacity
//         (the node can still take cash). OMITTED when the assigned building has no Stage-1 node yet (no inject has run —
//         the node is created on the first inject; until then there IS free capacity, but rather than synthesize a
//         signal off an absent node we OMIT it, per the absence contract — the safehouse_filled trigger still fires the
//         first inject, which the inject's own capacity guard then admits).
//   - `applyExecuteDefault` consumes LaunderingService.inject(playerId, frontShopBuildingId, safehouseBuildingId, amount)
//     — the LAUNDERING archetype's default action — with the amount policy below.
//
// THE AMOUNT POLICY (documented):
//   amount = min( safehouseHeldCents ,  nodeFreeCapacityCents [, frontShopLegitBaselineCents when conservative] )
// i.e. inject as much as the safehouse holds AND as much as the node can still take; and — when
// `lieutenant.laundering_respect_baseline` is true (the default, CONSERVATIVE mode) — additionally cap each per-tick
// inject at the front-shop's LEGITIMATE BASELINE (`launderingTunables.frontShopLegitBaselineCents`) so the delegated
// lieutenant NEVER trips the System-7 deviation/audit-pin by over-injecting (a baseline-busting single inject is a
// suspicious spike → audit pin; the conservative lieutenant launders within the plausible declared-revenue ceiling each
// tick, draining the safehouse over MORE ticks rather than risking a pin). When the flag is false (AGGRESSIVE mode) the
// baseline cap is dropped — the lieutenant injects the full min(held, free-capacity), accepting that a > baseline inject
// is flagged as a deviation (the inject still SUCCEEDS — the deviation is a risk surface, not a hard block). The amount
// is a PURE function of (held, free-capacity, baseline, the flag) — DETERMINISTIC, no RNG. `amount <= 0` (the safehouse
// is empty or the node is full) → a benign no-op (no inject attempted).
//
// CENTS ARITHMETIC: the relevant cents are NUMBER (not bigint) — safehouses.slot_capacity_cents is `integer`,
// tail_risk_estimates.current_occupancy is `real` (a float4 holding integer cents, exact for M1 magnitudes < ~16.7M),
// and the node CENTS capacity = dwell_time inventory_cap_per_node × 100 is an int. So the min() is plain Number math (no
// BigInt needed here, UNLIKE the BOOKKEEPER deposit whose held_cents/cash_cents columns are bigint). `inject` requires a
// POSITIVE INTEGER amount, so the policy result is floored to an integer before the call (it already is — all inputs are
// integer cents — but Math.floor guards a stray float).
//
// REUSE (never reinvent): `LaunderingService.inject` (the Stage-1 inject action — owns the positive-amount validation +
// the System-9 slot drain + the node credit + the System-7 deviation feed + the per-node capacity guard; consumed exactly
// as the player's POST /v1/operational/laundering/inject does). NB the inject's TWO id args are ASYMMETRIC: `frontShopId`
// is the front-shop BUILDING id (it resolves getOwnedOperationalFrontShop + getStage1Node by building_id) but `safehouseId`
// is the safehouse ENTITY id (it resolves getOwnedSafehouse by safehouse_id, NOT building_id). The lieutenant only stores
// the safehouse BUILDING id (target_building_id), so the binding resolves the safehouse ENTITY id from the building id via
// getSafehouseForBuilding and passes THAT to inject. Also REUSE `launderingTunables.frontShopLegitBaselineCents` (the SAME
// legit baseline the inject's own deviation decision uses — never a re-derived ceiling), `LieutenantRepository.
// getSafehouseForBuilding` (the safehouse entity-id + reconstructed held-cents read) + `getStage1NodeOccupancyForBuilding`
// (the node occupancy/capacity read — the repo boundary, NOT duplicated slot-reconstruction / tail-risk SQL),
// `LieutenantRepository.getOwnedOperationalBuilding` (the SAME owned-operational gate COOK/SECURITY/BOOKKEEPER/LOGISTICS
// use — applied to the front-shop; the safehouse is gated by getSafehouseForBuilding's ownership filter). DETERMINISTIC, no RNG.

import { Injectable, Logger } from '@nestjs/common';

import { ApiError } from '../../protocol/api-error';
import type { SignalSnapshot } from '../../dsl/signals';
import { LaunderingService } from '../laundering/laundering.service';
import { launderingTunables } from '../laundering/laundering-tunables';
import { LieutenantRepository } from './lieutenant.repository';
import { lieutenantTunables } from './lieutenant-tunables';
import type { ArchetypeBinding, DelegationLieutenant } from './archetype-binding';
import type { LieutenantArchetype } from './lieutenant-archetype';

/** The operational_type a LAUNDERING lieutenant assigns to — only a `front_shop` hosts a Stage-1 laundering node. */
const LAUNDERING_HOST_OPERATIONAL_TYPE = 'front_shop';

@Injectable()
export class LaunderingBindingService implements ArchetypeBinding {
  private readonly logger = new Logger(LaunderingBindingService.name);

  /** The archetype this binding serves — its registry key (BindingRegistry indexes by it). REUSE LieutenantArchetype. */
  readonly archetype: LieutenantArchetype = 'LAUNDERING';

  constructor(
    private readonly laundering: LaunderingService,
    private readonly repo: LieutenantRepository,
  ) {}

  /**
   * The RECRUIT-time assignment gate for a LAUNDERING lieutenant — like LOGISTICS, the archetype needs TWO buildings:
   *   - the ASSIGNED (front-shop) building must be the player's OWN OPERATIONAL building (not owned / not operational →
   *     404) of the `front_shop` type (a wrong type → 409 — only a front_shop hosts a Stage-1 laundering node) that
   *     ACTUALLY hosts a Stage-1 laundering node (a front_shop with no node yet → 409: there is no Stage-1 node to inject
   *     into — the player must first inject by hand to create it, or the node-create flow must run; the delegated binding
   *     never auto-creates the node). REUSE getOwnedOperationalBuilding (the SAME owned-operational gate the other
   *     bindings use) + getStage1NodeOccupancyForBuilding (the node-existence check).
   *   - the `targetBuildingId` is REQUIRED (the SAFEHOUSE the cash is drained from; LAUNDERING reuses the Phase-7 T0
   *     target_building_id column): a null/empty target → 422 VALIDATION_FAILED. The target must be the player's OWN
   *     safehouse building (resolve `safehouse` by building_id → 404 if it is not the player's safehouse).
   * NO mutation — pure validation reads.
   */
  async validateAssignment(
    playerId: string,
    assignedBuildingId: string,
    targetBuildingId: string | null,
  ): Promise<void> {
    // FRONT-SHOP — the player's OWN operational building of the front_shop type that hosts a Stage-1 laundering node.
    const owned = await this.repo.getOwnedOperationalBuilding(playerId, assignedBuildingId);
    if (!owned) {
      // Not owned / not converted / not operational → 404 (cross-player invisible too).
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `building ${assignedBuildingId} is not a player-owned operational building for this player.`,
      });
    }
    if (owned.operational_type !== LAUNDERING_HOST_OPERATIONAL_TYPE) {
      // An operational building of the WRONG type for a LAUNDERING lieutenant (only a front_shop hosts a Stage-1 node).
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message:
          `building ${assignedBuildingId} is not a front_shop (operational_type='${owned.operational_type}') — ` +
          'a LAUNDERING lieutenant assigns to a front_shop that hosts a Stage-1 laundering node.',
      });
    }
    const node = await this.repo.getStage1NodeOccupancyForBuilding(playerId, assignedBuildingId);
    if (node === null) {
      // The front_shop hosts no Stage-1 laundering node yet → there is nothing to inject into (the node is created on the
      // first inject; the delegated binding never auto-creates it). The player must inject once by hand first.
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message:
          `front-shop ${assignedBuildingId} has no Stage-1 laundering node — ` +
          'create one (inject once) before delegating a LAUNDERING lieutenant to it.',
      });
    }

    // SAFEHOUSE — REQUIRED for LAUNDERING (the cash source; the column LAUNDERING reuses for the safehouse).
    if (typeof targetBuildingId !== 'string' || !targetBuildingId) {
      throw new ApiError('VALIDATION_FAILED', {
        message: 'LAUNDERING requires a target_building_id (safehouse).',
      });
    }
    const safehouse = await this.repo.getSafehouseForBuilding(playerId, targetBuildingId);
    if (safehouse === null) {
      // The target is not the player's safehouse (no safehouse row on that building for this player) → 404.
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `target_building ${targetBuildingId} is not a player-owned safehouse for this player.`,
      });
    }
  }

  /**
   * BUILD the per-tick signal snapshot for a delegated LAUNDERING lieutenant from REAL game state (07 §NestJS — the binding
   * fills the snapshot the executor reads). Resolves the two LAUNDERING signals:
   *   - `state.safehouse_filled` = the target safehouse's reconstructed held cents > 0 (the rule
   *     `WHEN STATE(safehouse_filled,==,true) THEN EXECUTE_DEFAULT` fires when there is cash to inject). Read via the
   *     repository boundary (getSafehouseHeldCentsForBuilding) — never a duplicated slot-reconstruction query. OMITTED
   *     when the target building cannot be resolved to the player's safehouse (no target / not the player's).
   *   - `state.node_has_capacity` = the assigned front-shop's Stage-1 node occupancy (cents) < its capacity. Read via the
   *     repository boundary (getStage1NodeOccupancyForBuilding). OMITTED when the node does not exist yet (no inject has
   *     run — the absence contract; the safehouse_filled trigger still fires the first inject, whose own capacity guard
   *     admits it).
   * Per the ABSENCE CONTRACT (signals.ts): a signal the binding cannot resolve is OMITTED (not set to `undefined`). NO
   * mutation — pure reads.
   */
  async buildSnapshot(
    playerId: string,
    lieutenant: DelegationLieutenant,
  ): Promise<SignalSnapshot> {
    const state: Record<string, number | boolean> = {};
    const events: Record<string, number | boolean> = {};

    const safehouseBuildingId = lieutenant.target_building_id;
    if (safehouseBuildingId !== null) {
      const safehouse = await this.repo.getSafehouseForBuilding(playerId, safehouseBuildingId);
      if (safehouse !== null) {
        state.safehouse_filled = safehouse.held_cents > 0;
      }
      // (no safehouse row → `safehouse_filled` OMITTED, per the absence contract — never set to undefined.)
    }

    const frontShopBuildingId = lieutenant.assigned_building_id;
    if (frontShopBuildingId !== null) {
      const node = await this.repo.getStage1NodeOccupancyForBuilding(playerId, frontShopBuildingId);
      if (node !== null) {
        state.node_has_capacity = node.occupancy_cents < node.capacity_cents;
      }
      // (no Stage-1 node yet → `node_has_capacity` OMITTED, per the absence contract — never set to undefined.)
    }

    return { state, events };
  }

  /**
   * APPLY the LAUNDERING archetype's `EXECUTE_DEFAULT` (07 §NestJS — the binding maps the resolved token to the archetype's
   * real side-effect; the executor never acts itself). The LAUNDERING default is AUTO-INJECT safehouse cash into the
   * front-shop's Stage-1 node with the amount policy:
   *   amount = min( safehouseHeldCents , nodeFreeCapacityCents [, frontShopLegitBaselineCents when conservative] )
   * `amount > 0` → call LaunderingService.inject(playerId, frontShopBuildingId, safehouseEntityId, amount) — the SAME
   * guarded action the player's POST /inject runs (the `frontShopId` arg is the front-shop BUILDING id; the `safehouseId`
   * arg is the safehouse ENTITY id, resolved from target_building_id via getSafehouseForBuilding — see the header; the
   * inject drains the System-9 slots, credits the Stage-1 node, and feeds System 7). `amount <= 0` (empty safehouse, or
   * full node) → a benign no-op (nothing to inject).
   * NOTHING is reimplemented here; the per-node capacity + the deviation decision are the inject's own (the policy only
   * SIZES the inject + keeps it conservative). DETERMINISTIC (pure min over reads + a tunable flag; no RNG).
   *
   * CONSERVATIVE CAP (lieutenant.laundering_respect_baseline, default true): the per-tick inject is additionally capped at
   * the front-shop's legitimate baseline so a delegated lieutenant never trips the System-7 audit pin by over-injecting.
   * In aggressive mode (flag false) the cap is dropped — a > baseline inject succeeds but is flagged a deviation (a risk
   * surface, not a hard block).
   *
   * BENIGN 409 NO-OP: a `RESOURCE_STATE_CONFLICT` from inject (the node hit capacity, or a RACE drained the safehouse
   * between this binding's read and the inject's guarded drain — a concurrent player inject/withdraw, or the safehouse
   * fill changed mid-inject) is EXPECTED-rare in normal delegation, so it is CAUGHT here and logged as a benign no-op (the
   * tick proceeds normally — the lieutenant simply retries next tick on the fresh state). Any OTHER error PROPAGATES to
   * the tick's per-lieutenant try/catch (T6) — a genuine fault must not be swallowed. If the assigned (front-shop) or
   * target (safehouse) building is null, or the node/safehouse vanished, the apply is a benign no-op (defensive; a
   * delegated LAUNDERING lieutenant always has both buildings — validateAssignment enforced them at recruit).
   */
  async applyExecuteDefault(
    playerId: string,
    lieutenant: DelegationLieutenant,
    _gameMinute: number, // unused — LAUNDERING's inject path carries no created_at clock (W6.1 C7, archetype-binding.ts)
  ): Promise<'TAKEN' | 'NOOP'> {
    const frontShopBuildingId = lieutenant.assigned_building_id;
    if (frontShopBuildingId === null) {
      return 'NOOP'; // no front-shop building → nothing to inject into (defensive — a delegated LAUNDERING lieutenant has one).
    }
    const safehouseBuildingId = lieutenant.target_building_id;
    if (safehouseBuildingId === null) {
      // target_building_id is REQUIRED at recruit (validateAssignment), so this is a defensive impossibility. Log + no-op
      // rather than crash the tick (never throw on a structural invariant the recruit already enforced).
      this.logger.warn(
        `applyExecuteDefault: LAUNDERING lieutenant=${lieutenant.lieutenant_id} has a null target_building_id ` +
          `(front_shop=${frontShopBuildingId}) — no inject (the safehouse target is required at recruit; should not happen).`,
      );
      return 'NOOP';
    }

    const safehouse = await this.repo.getSafehouseForBuilding(playerId, safehouseBuildingId);
    if (safehouse === null) {
      return 'NOOP'; // the target safehouse vanished → nothing to inject (benign no-op).
    }
    const node = await this.repo.getStage1NodeOccupancyForBuilding(playerId, frontShopBuildingId);
    if (node === null) {
      return 'NOOP'; // the Stage-1 node vanished → nothing to inject into (benign no-op; recruit required it to exist).
    }

    // AMOUNT POLICY: min(held, node free capacity, [baseline when conservative]). All inputs are integer cents (Number,
    // not bigint — the cents columns here are integer/float4 holding integer cents). The free capacity floors at 0.
    const freeCapacityCents = Math.max(0, node.capacity_cents - node.occupancy_cents);
    let amount = Math.min(safehouse.held_cents, freeCapacityCents);
    if (lieutenantTunables.launderingRespectBaseline) {
      // CONSERVATIVE: cap each per-tick inject at the front-shop's legitimate baseline so it never trips the System-7
      // deviation/audit-pin (REUSE the SAME baseline the inject's own deviation decision uses — never a re-derived cap).
      amount = Math.min(amount, launderingTunables.frontShopLegitBaselineCents);
    }
    amount = Math.floor(amount); // inject requires a positive INTEGER (inputs are already integer cents; floor guards a stray float).

    if (amount <= 0) {
      // Empty safehouse, or the node is at capacity (or, conservative, the baseline is ≤ 0) → a benign no-op (no inject).
      return 'NOOP';
    }

    try {
      // inject's `frontShopId` is the front-shop BUILDING id (it resolves getOwnedOperationalFrontShop + getStage1Node by
      // building_id), but its `safehouseId` is the safehouse ENTITY id (it resolves getOwnedSafehouse by safehouse_id —
      // NOT building_id). The lieutenant only stores the safehouse BUILDING id (target_building_id), so the binding passes
      // the front-shop building id directly + the resolved safehouse.safehouse_id (the entity id) here.
      await this.laundering.inject(playerId, frontShopBuildingId, safehouse.safehouse_id, amount);
      return 'TAKEN';
    } catch (err) {
      if (err instanceof ApiError && err.code === 'RESOURCE_STATE_CONFLICT') {
        // Benign: the node hit capacity, or a RACE changed the safehouse fill between this binding's read and the inject's
        // guarded drain (a concurrent player inject/withdraw). The delegated lieutenant simply takes no action this tick
        // (the inject tx rolled back, nothing moved) — NOT an error to propagate.
        this.logger.debug(
          `applyExecuteDefault: benign no-op for lieutenant=${lieutenant.lieutenant_id} ` +
            `front_shop=${frontShopBuildingId} safehouse=${safehouse.safehouse_id} amount=${amount} (${err.message})`,
        );
        return 'NOOP';
      }
      throw err; // any other fault propagates to the tick's per-lieutenant try/catch (T6).
    }
  }
}
