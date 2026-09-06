// IMPLEMENTS: docs/tech/07_lieutenants_and_behavior/behavior_script_dsl.md §Implications par couche §NestJS — game-back
//             (the per-archetype binding RESOLVES the signal snapshot from real game state + MAPS the resolved action
//             token to the archetype's real side-effect — "Module dsl/executor : … write uniquement via `side_effects`
//             déclarés"; the executor stays archetype-agnostic, the binding is the ONLY archetype-specific code) +
//             docs/tech/07_lieutenants_and_behavior/lieutenant_definition.md §Archetype projection (the SECURITY
//             archetype ↔ the 04a roles `Heat manager` / `Fixer` / `Muscle`) +
//             docs/superpowers/specs/2026-06-08-phase-07-lieutenant-archetypes-design.md §Architecture (the SECURITY
//             binding — `building_damaged` signal + `EXECUTE_DEFAULT` → RepairService.repair the assigned building) +
//             docs/superpowers/specs/2026-06-04-phase-02b-police-risk-raid-design.md §4 (RepairService.repair — the
//             reused recovery action: guarded cash debit → structural_state='repairing') +
//             docs/tech/09_data_model/schema_operational_chain.md §7.4 (building_operational_state.structural_state —
//             operational | damaged | repairing — the `building_damaged` read)
//             -- session:2026-06-08 (Phase 7 vector #7 lieutenant archetypes — Task 2, SECURITY binding) --
//
// `SecurityBindingService` — the SECURITY-archetype adapter the delegation tick + recruit dispatch through. The SECOND
// `ArchetypeBinding` (after the Phase-6 COOK binding, whose SHAPE this MIRRORS): the SAME three methods — `buildSnapshot`
// (resolve THIS archetype's signal from real state) and `applyExecuteDefault` (map `EXECUTE_DEFAULT` to its real action)
// and `validateAssignment` (the recruit-time assignment gate) — and the DSL engine is unchanged.
//
// The SECURITY default is AUTO-REPAIR the assigned building: when the assigned building has been raided into the DAMAGED
// state, the delegated SECURITY lieutenant runs the SAME player-driven repair (RepairService.repair — guarded cash debit
// → structural_state='repairing'; the OPERATIONAL_REPAIR tick later flips it back to operational). The lieutenant simply
// calls the action the player would have called by hand — it reimplements NOTHING (no debit, no state transition here).
//
//   - `buildSnapshot` resolves the one SECURITY signal: `state.building_damaged` = the assigned building's
//     structural_state === 'damaged' (a building free to be repaired → the rule `WHEN STATE(building_damaged,==,true)
//     THEN EXECUTE_DEFAULT` fires). OMITTED when the assigned building (or its operational state) cannot be resolved.
//   - `applyExecuteDefault` consumes RepairService.repair(playerId, assigned_building_id) — the SECURITY archetype's
//     default action.
//
// REUSE (never reinvent): `RepairService.repair` (the guarded repair action — owns the DAMAGED validation + the atomic
// cash debit + the structural-state transition; consumed exactly as the player's POST /repair does),
// `LieutenantRepository.getBuildingStructuralState` (the structural_state read — the SERVICE/repo boundary, NOT a
// duplicated building_operational_state query), `LieutenantRepository.getOwnedOperationalBuilding` (the SAME owned-
// operational gate COOK's validateAssignment uses). DETERMINISTIC, no RNG.

import { Injectable, Logger } from '@nestjs/common';

import { ApiError } from '../../protocol/api-error';
import type { SignalSnapshot } from '../../dsl/signals';
import { RepairService } from '../enforcement/repair.service';
import { LieutenantRepository } from './lieutenant.repository';
import type { ArchetypeBinding, DelegationLieutenant } from './archetype-binding';
import type { LieutenantArchetype } from './lieutenant-archetype';

@Injectable()
export class SecurityBindingService implements ArchetypeBinding {
  private readonly logger = new Logger(SecurityBindingService.name);

  /** The archetype this binding serves — its registry key (BindingRegistry indexes by it). REUSE LieutenantArchetype. */
  readonly archetype: LieutenantArchetype = 'SECURITY';

  constructor(
    private readonly repair: RepairService,
    private readonly repo: LieutenantRepository,
  ) {}

  /**
   * The RECRUIT-time assignment gate for a SECURITY lieutenant: the assigned building must be the player's OWN
   * OPERATIONAL building (not owned / not operational → 404). UNLIKE the COOK archetype (which requires a `lab` host),
   * SECURITY accepts ANY operational building type — any building can later be DAMAGED by a raid and need repairing, so
   * a SECURITY lieutenant protects whichever operational building it is assigned to. The SAME owned-operational read the
   * COOK binding uses (getOwnedOperationalBuilding) — only the type restriction differs (none here). The SECURITY
   * archetype ignores `targetBuildingId` (it has no dispatch destination — that is the LOGISTICS archetype's column). NO
   * mutation — a pure validation read.
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
    // No building-type restriction — a SECURITY lieutenant repairs whatever operational building it guards.
  }

  /**
   * BUILD the per-tick signal snapshot for a delegated SECURITY lieutenant from REAL game state (07 §NestJS — the binding
   * fills the snapshot the executor reads). Resolves the one SECURITY signal:
   *   - `state.building_damaged` = `true` IFF the assigned building's structural_state === 'damaged' (the building has
   *     been raided and is awaiting repair → the rule `WHEN STATE(building_damaged,==,true) THEN EXECUTE_DEFAULT` fires).
   *     Read via the repository boundary (LieutenantRepository.getBuildingStructuralState) — never a duplicated
   *     building_operational_state query. A 'repairing'/'operational' building → false (nothing to repair this tick).
   * Per the ABSENCE CONTRACT (signals.ts): a signal the binding cannot resolve is OMITTED (not set to `undefined`) so the
   * executor treats it as a non-matching trigger. If the assigned building is null/missing (or has no operational state),
   * the signal is OMITTED → an empty snapshot → the executor takes no script-driven action this tick. NO mutation — a
   * pure read.
   */
  async buildSnapshot(
    _playerId: string,
    lieutenant: DelegationLieutenant,
  ): Promise<SignalSnapshot> {
    const state: Record<string, number | boolean> = {};
    const events: Record<string, number | boolean> = {};

    const buildingId = lieutenant.assigned_building_id;
    if (buildingId !== null) {
      const structuralState = await this.repo.getBuildingStructuralState(buildingId);
      if (structuralState !== null) {
        state.building_damaged = structuralState === 'damaged';
      }
      // (a missing building_operational_state → `building_damaged` OMITTED, per the absence contract.)
    }

    return { state, events };
  }

  /**
   * APPLY the SECURITY archetype's `EXECUTE_DEFAULT` (07 §NestJS — the binding maps the resolved token to the archetype's
   * real side-effect; the executor never acts itself). The SECURITY default is REPAIR THE ASSIGNED BUILDING: call
   * RepairService.repair (the SAME guarded action the player's POST /repair runs — it owns the DAMAGED validation + the
   * atomic cash debit + the structural-state → 'repairing' transition; the OPERATIONAL_REPAIR tick later flips it back to
   * operational). NOTHING is reimplemented here.
   *
   * BENIGN 409 NO-OP: a `RESOURCE_STATE_CONFLICT` from repair is EXPECTED in normal delegation — the building may not be
   * DAMAGED this tick (already operational / already repairing) OR the player may have insufficient cash — so it is
   * CAUGHT here and logged as a benign no-op (the tick proceeds normally). Any OTHER error PROPAGATES to the tick's
   * per-lieutenant try/catch (T6) — a genuine fault must not be swallowed. If the assigned building is null, the apply is
   * a benign no-op (nothing to repair — defensive; a delegated SECURITY lieutenant always has an assigned building).
   */
  async applyExecuteDefault(
    playerId: string,
    lieutenant: DelegationLieutenant,
    _gameMinute: number, // unused — SECURITY's repair path carries no created_at clock (W6.1 C7, archetype-binding.ts)
  ): Promise<'TAKEN' | 'NOOP'> {
    const buildingId = lieutenant.assigned_building_id;
    if (buildingId === null) {
      return 'NOOP'; // no delegated building → nothing to repair (defensive — a delegated SECURITY lieutenant always has one).
    }

    try {
      await this.repair.repair(playerId, buildingId);
      return 'TAKEN';
    } catch (err) {
      if (err instanceof ApiError && err.code === 'RESOURCE_STATE_CONFLICT') {
        // Benign: the building is not DAMAGED (already operational / repairing), or there is not enough cash to repair
        // this tick. The delegated lieutenant simply takes no action this tick — NOT an error to propagate.
        this.logger.debug(
          `applyExecuteDefault: benign no-op for lieutenant=${lieutenant.lieutenant_id} ` +
            `building=${buildingId} (${err.message})`,
        );
        return 'NOOP';
      }
      throw err; // any other fault propagates to the tick's per-lieutenant try/catch (T6).
    }
  }
}
