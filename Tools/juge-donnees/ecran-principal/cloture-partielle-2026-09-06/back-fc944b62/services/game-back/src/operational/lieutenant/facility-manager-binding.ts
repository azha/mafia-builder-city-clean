// IMPLEMENTS: docs/tech/07_lieutenants_and_behavior/behavior_script_dsl.md §Implications par couche §NestJS — game-back
//             (the per-archetype binding RESOLVES the signal snapshot from real game state + MAPS the resolved action
//             token to the archetype's real side-effect — "Module dsl/executor : … write uniquement via `side_effects`
//             déclarés"; the executor stays archetype-agnostic, the binding is the ONLY archetype-specific code) +
//             docs/superpowers/specs/2026-07-10-04f-A-maintenance-design.md §8 (Facility manager + DSL — D8/D9: the
//             `days_until_maintenance_due` MIN signal, the `schedule_maintenance(most_due)` apply → REUSE
//             MaintenanceService.scheduleMaintenance, insufficient-cash no-op) +
//             docs/superpowers/plans/2026-07-10-04f-A-maintenance-plan.md C7 (Facility manager + DSL additive action)
//             — 04f-A C7 — 2026-07-10
//
// `FacilityManagerBindingService` — the FACILITY_MANAGER-archetype adapter the delegation tick + recruit dispatch
// through. The 9th `ArchetypeBinding` (after COOK/SECURITY/BOOKKEEPER/LOGISTICS/LAUNDERING/DISTRIBUTION/MUSCLE/
// INTELLIGENCE, whose SHAPE this MIRRORS): the SAME three required methods — `buildSnapshot` (resolve THIS
// archetype's signal from real state), `applyExecuteDefault` (map `EXECUTE_DEFAULT` to its real action), and
// `validateAssignment` (the recruit-time assignment gate) — plus an EXTRA `applyResolvedAction` method (the
// LogisticsBindingService precedent, `logistics-binding.ts:319` — consumed by a NARROW branch this chunk adds to
// `LieutenantTickService.applyForLieutenant`, since the Facility manager's canonical action, `SCHEDULE_MAINTENANCE`,
// is arg-bearing, not the nullary `EXECUTE_DEFAULT` the tick already dispatches).
//
// The FACILITY_MANAGER canonical behavior (D9) is "keep the fleet maintained": each tick it observes
// `days_until_maintenance_due` (the MIN, signed days-until-due across the player's OPERATIONAL buildings — the
// binding-populated flat signal, ZERO DSL-compiler change) and, when its seeded default script's rule fires
// (`WHEN STATE(days_until_maintenance_due, <=, N) THEN schedule_maintenance(most_due) @100;`), resolves the closed
// `most_due` selector to the SINGLE most-overdue-or-soonest-due operational building (deterministic tie-break by
// building_id) and calls the SAME `MaintenanceService.scheduleMaintenance` the player's own POST endpoint runs (C3
// REUSE — the guarded atomic debit + 1-day job arm; NOTHING reimplemented here). Insufficient cash / an
// already-armed job / a failed-and-not-yet-resolved building all surface as the SAME 409 RESOURCE_STATE_CONFLICT the
// player endpoint throws — caught here as a BENIGN no-op (never a crash, never partial state; the next tick simply
// re-observes the same still-due building and retries, D9's "next tick retries" contract).
//
// `applyExecuteDefault` is aliased to the SAME "schedule the most-due building" behavior: the interface REQUIRES an
// implementation, and the archetype's single canonical action IS scheduling the most-due building — there is no
// second, distinct "default" behavior to invent. The shipped seeded default script never resolves EXECUTE_DEFAULT
// (it always names `schedule_maintenance(most_due)` explicitly), so this alias is a defensive/consistency choice
// (a hand-authored `THEN EXECUTE_DEFAULT` rule behaves identically), not part of the D9 falsifiable floor.
//
// REUSE (never reinvent): `MaintenanceRepository.listOperationalBuildingsForPhaseTick` (the SAME batched
// OPERATIONAL-buildings read the NIGHTLY/21 tick uses) + `MaintenanceRepository.getCurrentGameDayAndMinute` (the
// SAME clock read C3's scheduleMaintenance uses) + `MaintenancePhaseService.deriveDaysUntilDue` (the D1 pure
// derivation — the SIGNED days-until-due, never re-derived here) + `MaintenanceService.scheduleMaintenance` (the C3
// guarded schedule action) + `LieutenantRepository.getOwnedOperationalBuilding` (the SAME owned-operational
// recruit-time gate every other archetype uses). DETERMINISTIC, no RNG.

import { Injectable, Logger } from '@nestjs/common';

import { ApiError } from '../../protocol/api-error';
import type { SignalSnapshot } from '../../dsl/signals';
import type { ResolvedAction } from '../../dsl/signals';
import { MaintenanceRepository } from '../maintenance/maintenance.repository';
import { MaintenancePhaseService } from '../maintenance/maintenance-phase.service';
import { MaintenanceService } from '../maintenance/maintenance.service';
import { LieutenantRepository } from './lieutenant.repository';
import type { ArchetypeBinding, DelegationLieutenant } from './archetype-binding';
import type { LieutenantArchetype } from './lieutenant-archetype';

@Injectable()
export class FacilityManagerBindingService implements ArchetypeBinding {
  private readonly logger = new Logger(FacilityManagerBindingService.name);

  /** The archetype this binding serves — its registry key (BindingRegistry indexes by it). REUSE LieutenantArchetype. */
  readonly archetype: LieutenantArchetype = 'FACILITY_MANAGER';

  constructor(
    private readonly maintenanceRepo: MaintenanceRepository,
    private readonly phase: MaintenancePhaseService,
    private readonly maintenanceService: MaintenanceService,
    private readonly repo: LieutenantRepository,
  ) {}

  /**
   * The RECRUIT-time assignment gate for a FACILITY_MANAGER lieutenant: the assigned building must be the
   * player's OWN OPERATIONAL building (not owned / not converted / not operational → 404). UNLIKE COOK (which
   * requires a `lab` host), FACILITY_MANAGER accepts ANY operational building type — the `assigned_building_id`
   * only establishes recruit-time ownership; the auto-schedule signal (buildSnapshot) and the `most_due`
   * selector both range over ALL of the player's operational buildings, not just this one (design §8 — the
   * signal is a player-wide MIN, not per-assigned-building). The archetype ignores `targetBuildingId` (it has
   * no dispatch destination — the LOGISTICS/LAUNDERING/DISTRIBUTION column). NO mutation — a pure validation read.
   */
  async validateAssignment(
    playerId: string,
    assignedBuildingId: string,
    _targetBuildingId: string | null,
  ): Promise<void> {
    const owned = await this.repo.getOwnedOperationalBuilding(playerId, assignedBuildingId);
    if (!owned) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `building ${assignedBuildingId} is not a player-owned operational building for this player.`,
      });
    }
    // No building-type restriction — a Facility manager oversees the player's WHOLE operational fleet.
  }

  /**
   * BUILD the per-tick signal snapshot for a delegated FACILITY_MANAGER lieutenant from REAL game state (07
   * §NestJS — the binding fills the snapshot the executor reads). Resolves the ONE FACILITY_MANAGER signal
   * (design §8):
   *   - `state.days_until_maintenance_due` = the MIN of `MaintenancePhaseService.deriveDaysUntilDue(...)` (D1,
   *     the SIGNED days-until-due — negative when overdue) across the player's OPERATIONAL buildings (the SAME
   *     batched read `MaintenancePhaseTickService` uses). Numeric — ZERO DSL-compiler change (a flat bare STATE
   *     key, per the ABSENCE CONTRACT / signals.ts).
   * Per the ABSENCE CONTRACT: OMITTED (not set to `undefined`) when the player has NO operational buildings (the
   * MIN is undefined over an empty set) — an empty snapshot means the executor takes no script-driven action
   * this tick (the rule simply never matches). NO mutation — pure reads.
   */
  async buildSnapshot(
    playerId: string,
    _lieutenant: DelegationLieutenant,
  ): Promise<SignalSnapshot> {
    const state: Record<string, number | boolean> = {};
    const events: Record<string, number | boolean> = {};

    const minDaysUntilDue = await this.resolveMinDaysUntilDue(playerId);
    if (minDaysUntilDue !== null) {
      state.days_until_maintenance_due = minDaysUntilDue;
    }
    // (no operational buildings → `days_until_maintenance_due` OMITTED, per the absence contract.)

    return { state, events };
  }

  /**
   * APPLY the FACILITY_MANAGER archetype's `EXECUTE_DEFAULT` — aliased to the SAME "schedule the most-due
   * building" behavior `applyResolvedAction(SCHEDULE_MAINTENANCE)` runs (see the file header — the archetype has
   * one canonical action; the shipped default script never actually resolves this token, see D9).
   */
  async applyExecuteDefault(
    playerId: string,
    _lieutenant: DelegationLieutenant,
    _gameMinute: number, // unused — FACILITY_MANAGER's schedule path carries no created_at clock (W6.1 C7, archetype-binding.ts)
  ): Promise<'TAKEN' | 'NOOP'> {
    return this.scheduleMostDue(playerId);
  }

  /**
   * APPLY the resolved `SCHEDULE_MAINTENANCE` token (D9 — the arg-bearing action `schedule_maintenance(most_due)`
   * compiles to). `action.maintenanceTarget` is currently always `'most_due'` (the ONLY closed-domain member,
   * R2.2 — the compiler never lowers any other token to IR); the selector is resolved HERE, server-side, from
   * REAL game state — never a raw building uuid crosses the DSL boundary. Any other resolved action kind
   * (EXECUTE_DEFAULT / PAUSE_OPS / REQUEST_PLAYER_INPUT / NONE / a 9c coordinator token — none of which the
   * Facility-manager's own script ever resolves) is a benign no-op here; `LieutenantTickService`'s narrow
   * SCHEDULE_MAINTENANCE dispatch branch only calls this method when `resolved.kind === 'SCHEDULE_MAINTENANCE'`,
   * so the switch below is defensive completeness, not a live path.
   */
  async applyResolvedAction(
    playerId: string,
    _lieutenant: DelegationLieutenant,
    action: ResolvedAction,
  ): Promise<'TAKEN' | 'NOOP'> {
    if (action.kind !== 'SCHEDULE_MAINTENANCE') {
      return 'NOOP';
    }
    return this.scheduleMostDue(playerId);
  }

  /**
   * Resolve the `most_due` selector (the operational building with the SMALLEST days-until-due — i.e. the most
   * overdue, or if none are overdue, the soonest-due; deterministic tie-break by building_id, design §8) and
   * call the SAME guarded `MaintenanceService.scheduleMaintenance` the player's POST endpoint runs (C3 REUSE —
   * atomic debit + 1-day job arm). No operational building at all → benign no-op (nothing to schedule).
   * Insufficient cash / the target already `'failed'`/`'repairing'`/job-armed → the SAME 409
   * RESOURCE_STATE_CONFLICT the endpoint throws, caught here as a BENIGN no-op (D9 — "insufficient cash → no-op
   * + logged, never a crash; next tick retries" — the building simply stays un-scheduled and the next tick
   * re-observes the SAME state). Any OTHER error propagates to the tick's per-lieutenant try/catch — a genuine
   * fault must not be swallowed.
   */
  private async scheduleMostDue(playerId: string): Promise<'TAKEN' | 'NOOP'> {
    const buildingId = await this.resolveMostDueBuildingId(playerId);
    if (buildingId === null) {
      return 'NOOP'; // no operational building → nothing to schedule.
    }
    try {
      await this.maintenanceService.scheduleMaintenance(playerId, buildingId);
      return 'TAKEN';
    } catch (err) {
      if (
        err instanceof ApiError &&
        (err.code === 'RESOURCE_STATE_CONFLICT' || err.code === 'RESOURCE_NOT_FOUND')
      ) {
        // Benign: insufficient cash, a job already armed, a not-yet-resolved 'failed'/'repairing' building (all
        // RESOURCE_STATE_CONFLICT), or a defensive race where the building vanished between the read and the
        // schedule call (RESOURCE_NOT_FOUND). The Facility manager simply takes no action this tick — the sim
        // stays intact, no partial state (the guarded debit is all-or-nothing), and the NEXT tick retries
        // against the fresh state (D9's explicit no-crash / retry contract).
        this.logger.debug(
          `scheduleMostDue: benign no-op for player=${playerId} building=${buildingId} (${err.message})`,
        );
        return 'NOOP';
      }
      throw err; // any other fault propagates to the tick's per-lieutenant try/catch.
    }
  }

  /**
   * The MIN signed days-until-due across the player's operational buildings (the `days_until_maintenance_due`
   * signal), or `null` when the player has none. REUSE: `MaintenanceRepository.listOperationalBuildingsForPhaseTick`
   * (the SAME batched read the NIGHTLY/21 tick uses) + `MaintenancePhaseService.deriveDaysUntilDue` (D1 — never
   * re-derived here).
   */
  private async resolveMinDaysUntilDue(playerId: string): Promise<number | null> {
    const rows = await this.maintenanceRepo.listOperationalBuildingsForPhaseTick(playerId);
    if (rows.length === 0) return null;
    const { currentGameDay } = await this.maintenanceRepo.getCurrentGameDayAndMinute(playerId);
    let min: number | null = null;
    for (const row of rows) {
      const daysUntilDue = this.phase.deriveDaysUntilDue(
        currentGameDay,
        row.last_maintained_at_game_day,
        row.maintenance_due_in_days,
      );
      if (min === null || daysUntilDue < min) min = daysUntilDue;
    }
    return min;
  }

  /**
   * Resolve the `most_due` closed selector (design §8): the operational building with the SMALLEST
   * days-until-due (most overdue first; if none overdue, the soonest-due), deterministic tie-break by the
   * SMALLER `building_id` (a stable total order — never a random/arbitrary pick). `null` when the player has no
   * operational building. Written EXPLICITLY (not relying on the repo's own building_id ORDER BY) so the
   * tie-break is structural, not an incidental consequence of query ordering.
   */
  private async resolveMostDueBuildingId(playerId: string): Promise<string | null> {
    const rows = await this.maintenanceRepo.listOperationalBuildingsForPhaseTick(playerId);
    if (rows.length === 0) return null;
    const { currentGameDay } = await this.maintenanceRepo.getCurrentGameDayAndMinute(playerId);

    let best: { buildingId: string; daysUntilDue: number } | null = null;
    for (const row of rows) {
      const daysUntilDue = this.phase.deriveDaysUntilDue(
        currentGameDay,
        row.last_maintained_at_game_day,
        row.maintenance_due_in_days,
      );
      if (
        best === null ||
        daysUntilDue < best.daysUntilDue ||
        (daysUntilDue === best.daysUntilDue && row.building_id < best.buildingId)
      ) {
        best = { buildingId: row.building_id, daysUntilDue };
      }
    }
    return best === null ? null : best.buildingId;
  }
}
