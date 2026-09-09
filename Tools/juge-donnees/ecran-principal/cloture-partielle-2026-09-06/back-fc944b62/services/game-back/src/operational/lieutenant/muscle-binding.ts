// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-B-combat-escalation-plan.md Task 3 (C3) Step 6
//             Design: docs/superpowers/specs/2026-06-24-04b-B-combat-escalation-design.md §8 + §8.1
//             DD: DD-MUSCLE-P4-LEGIBLE §8.1.4 (the P4 legibility refuse surface lives here)
//             Canon: docs/tech/04b_combat_and_conflict/design_principles.md:67-73 (P4/P6)
//             Mirror: services/game-back/src/operational/lieutenant/cook-binding.ts (the template)
//             — Combat & Escalation B C3 — 2026-06-25 (DD-MUSCLE-P4-LEGIBLE fix) —
//
// `MuscleBindingService` — the MUSCLE-archetype adapter the delegation tick calls.
// Mirrors `CookBindingService` exactly in shape (buildSnapshot / applyExecuteDefault /
// validateAssignment / salientSignals) — the MUSCLE binding implements `ArchetypeBinding`.
//
// THE BINDING'S ROLE:
//   - `buildSnapshot` resolves the per-tick signals from A's §13 band methods (server↔server,
//     P6 safe): `state.regime_pressure_band` from RegimeSwitchingService.getRegimePressureBand
//     (a 'silent'|'mounting'|'crushing' string — a CLOSED enum, R2.2 / P6: never a raw float).
//     [C5-DEP] `state.percolation_band` is STUBBED as 'standard' until C5 lands
//     (PercolationService.getActiveLinkFractionBucket is the C5 seam — recorded as a dependency).
//   - `applyExecuteDefault` maps the resolved EXECUTE_DEFAULT token to `CombatService.requestAssault`.
//     The MUSCLE's "default action" IS requesting an assault (the Muscle lieutenant's purpose).
//     On accept: CombatService schedules a `combat_event` (P3) at non-zero heat cost (P2).
//     On structural precondition failure: CombatService returns `{ scheduled: false, reason: 'no_rival_state' }`;
//     the binding logs it and returns 'NOOP' to the tick (no side-effect committed).
//   - `resolveRefuseRef` (§8.1.4 — the P4 legibility surface): given the lieutenant's compiled
//     behavior script + a fresh snapshot, calls `DslExecutorService.resolveToScriptRuleRef` to
//     surface WHY the Muscle lieutenant did NOT assault this tick. The result is a `ScriptRuleRef`:
//     `{ ruleIndex }` (a specific player rule blocked it) or `{ kind:'no_matching_rule' }` (no rule
//     matched). This is NEVER a hardcoded literal — it is derived from the player's actual script.
//   - `validateAssignment` the recruit-time gate: the MUSCLE recruit requires a player-owned
//     operational building (the host-type check). Canon is SILENT on a specific Muscle host-type
//     (lieutenant_definition.md §Archetype projection lists MUSCLE under the SECURITY family;
//     04a §lieutenant_role_mapping.md does not mandate a specific building type for the Muscle
//     role). [PROV-Y26Q2] Therefore, for C3, ANY player-owned operational building is accepted
//     (the building hosts the Muscle's planning space — not a production-specific type like 'lab').
//     Comment: when the canon clarifies the Muscle host-type, update MUSCLE_HOST_OPERATIONAL_TYPES
//     and the validateAssignment check.
//
// EXECUTOR SANDBOX INVARIANT: the executor performs NO side-effect; the binding does.
// The `buildSnapshot` is a pure read; `applyExecuteDefault` + `resolveRefuseRef` are the surface.
//
// P6 WALL: `state.regime_pressure_band` is a STRING ENUM ('silent'|'mounting'|'crushing'),
// never a raw regime_pressure float. The binding reads A's §13 band method — NOT rival_state directly.
//
// C4 DETERMINISM: NO Math.random(), NO Date.now() anywhere in this file.
// ADDITIVE: no existing service modified.

import { Injectable, Logger } from '@nestjs/common';

import type { SignalSnapshot, ScriptRuleRef } from '../../dsl/signals';
import { DslExecutorService } from '../../dsl/executor.service';
import { RegimeSwitchingService } from '../conflict/rival/regime-switching.service';
import { CombatService } from '../conflict/combat/combat.service';
import type { RivalKey } from '../conflict/rival/rival-ai.types';
import { LieutenantRepository } from './lieutenant.repository';
import type { ArchetypeBinding, DelegationLieutenant, SalientSignalSpec } from './archetype-binding';
import { METHOD_BY_ACTION_ID } from '../../exceptions/method-by-action-id';
import { ApiError } from '../../protocol/api-error';
import type { LieutenantArchetype } from './lieutenant-archetype';
import type { CompiledScript } from '../../dsl/ir';

// ── [PROV-Y26Q2] Host-type: canon-silent — any player-owned operational building accepted ──────
// When canon clarifies the Muscle's building host type, add the type name here and enable the
// MUSCLE_HOST_OPERATIONAL_TYPES guard in validateAssignment.
// Per lieutenant_definition.md §Archetype projection: MUSCLE projects under the SECURITY family;
// 04a lieutenant_role_mapping.md does not mandate a specific operational_type for the 'Muscle' role.
// [PROV-Y26Q2]: no building-type gate for C3 — any player-owned operational building accepted.
// const MUSCLE_HOST_OPERATIONAL_TYPES = new Set<string>([]);  // [PROV-Y26Q2] TODO: clarify with canon

// ── Default rival key when the lieutenant has no explicit target stored ────────────────────────
// [PROV-Y26Q2]: C3 defaults to 'tarcum' as the assault target rival when the lieutenant has no
// stored target_rival_key. When the C# assault-plan card UI lands (a TD), the player explicitly
// designates the target rival; until then the MUSCLE binding targets the first active rival.
// The rival key is read from a state signal `state.target_rival_key` if the behavior script
// provides one; otherwise the default is 'tarcum'.
const MUSCLE_DEFAULT_TARGET_RIVAL: RivalKey = 'tarcum';

@Injectable()
export class MuscleBindingService implements ArchetypeBinding {
  private readonly logger = new Logger(MuscleBindingService.name);

  /** The archetype this binding serves — its registry key (BindingRegistry indexes by it). */
  readonly archetype: LieutenantArchetype = 'MUSCLE';

  constructor(
    private readonly repo: LieutenantRepository,
    private readonly regimeSwitching: RegimeSwitchingService,
    private readonly combat: CombatService,
    private readonly executor: DslExecutorService,
  ) {}

  /**
   * The RECRUIT-time assignment gate for a MUSCLE lieutenant.
   *
   * [PROV-Y26Q2] Canon is SILENT on the specific building type a Muscle lieutenant requires.
   * For C3, ANY player-owned operational building is accepted (the building serves as the Muscle's
   * base/planning HQ — no production-type constraint like COOK's lab requirement).
   * When canon clarifies, update this method + add MUSCLE_HOST_OPERATIONAL_TYPES.
   *
   * The existing `getOwnedOperationalBuilding` join enforces player-ownership + operational status;
   * the building-type gate is omitted (PROV annotation, not a permanent skip).
   */
  async validateAssignment(
    playerId: string,
    assignedBuildingId: string,
    _targetBuildingId: string | null,
  ): Promise<void> {
    const owned = await this.repo.getOwnedOperationalBuilding(playerId, assignedBuildingId);
    if (!owned) {
      // Not owned / not converted / not operational → 404.
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message:
          `building ${assignedBuildingId} is not a player-owned operational building for this player.`,
      });
    }
    // [PROV-Y26Q2] No building-type gate for MUSCLE (canon-silent on host type).
    // When canon clarifies, add: if (!MUSCLE_HOST_OPERATIONAL_TYPES.has(owned.operational_type)) { throw ... }
  }

  /**
   * BUILD the per-tick signal snapshot for a delegated MUSCLE lieutenant from REAL game state.
   *
   * Signals resolved (P6 / R2.2 — all are BANDED or BOOLEAN, never raw scalars):
   *
   *   `state.regime_pressure_band` — the rival's current RegimePressureBucket
   *     ('silent' | 'mounting' | 'crushing') from A's §13 `getRegimePressureBand`.
   *     This is a CLOSED ENUM (3 values). NEVER the raw regime_pressure float (P6 wall).
   *     A MUSCLE rule reads: `WHEN STATE(regime_pressure_band,==,mounting) THEN EXECUTE_DEFAULT @100;`
   *
   *   `state.percolation_band` — [C5-DEP] STUBBED as 'standard' until PercolationService lands
   *     at C5. The stub is a [PROV-Y26Q2] placeholder. When C5 lands, replace with:
   *     `await this.percolation.getActiveLinkFractionBucket(playerId, rivalKey)`.
   *
   * The target rival key is read from `state.target_rival_key` if set in the behavior script;
   * [PROV-Y26Q2] defaults to MUSCLE_DEFAULT_TARGET_RIVAL ('tarcum') for C3.
   *
   * Per the ABSENCE CONTRACT (signals.ts): a signal the binding cannot resolve is OMITTED (not
   * set to undefined) so the executor treats it as a non-matching trigger.
   * C4 DETERMINISM: no Math.random(), no Date.now().
   */
  async buildSnapshot(
    playerId: string,
    lieutenant: DelegationLieutenant,
  ): Promise<SignalSnapshot> {
    const state: Record<string, number | boolean | string> = {};
    const events: Record<string, number | boolean> = {};

    // [PROV-Y26Q2] Resolve target rival key. For C3, always MUSCLE_DEFAULT_TARGET_RIVAL.
    // When the C# assault-plan card UI lands, the Muscle lieutenant's script will carry the
    // target via a state signal or assigned_building_id context — to be resolved then.
    const rivalKey: RivalKey = MUSCLE_DEFAULT_TARGET_RIVAL;

    // ── §13 band read: regime_pressure_band (P6 safe — CLOSED enum, not a raw float) ──────────
    // Server↔server read: RegimeSwitchingService.getRegimePressureBand is a §13 method exported
    // by RivalAiModule; the binding consumes it directly (NOT via a player route).
    const regimeBand = await this.regimeSwitching.getRegimePressureBand(playerId, rivalKey);
    if (regimeBand !== null) {
      // `state.regime_pressure_band` is a string enum — admitted by SignalSnapshot (P24 L2b).
      // A DSL rule compares it with '==' or '!=' only (a string has no order in this domain).
      state.regime_pressure_band = regimeBand; // 'silent' | 'mounting' | 'crushing'
    }
    // (absent if no rival_state row → the absence contract: executor treats absent as non-matching)

    // ── [C5-DEP] Percolation band stub ────────────────────────────────────────────────────────
    // Until PercolationService lands at C5, the percolation_band is a STUBBED 'standard'.
    // When C5 lands, replace this stub with:
    //   const percolationBand = await this.percolation.getActiveLinkFractionBucket(playerId, rivalKey);
    //   if (percolationBand !== null) { state.percolation_band = percolationBand; }
    // [PROV-Y26Q2]: stub value is 'standard' (the default percolation state).
    state.percolation_band = 'standard'; // [C5-DEP] stub — remove when PercolationService lands

    void lieutenant; // the Muscle does not use assigned_building_id for signal resolution in C3
    return { state, events };
  }

  /**
   * APPLY the MUSCLE archetype's `EXECUTE_DEFAULT` — calls `CombatService.requestAssault`.
   *
   * The MUSCLE's "default action" IS requesting an assault on the target rival:
   *   - On ACCEPT: CombatService inserts a `combat_event` (type='assault', outcome_bucket=NULL,
   *     heat_increment_bucket='medium') — P3 (scheduled) + P2 (non-free). Returns 'TAKEN'.
   *   - On structural precondition failure (`{ reason: 'no_rival_state' }`): no rival_state row
   *     exists for this player × rival. Returns 'NOOP' (no side-effect; the binding logs it).
   *
   * Note: a MUSCLE script blocking rule fires BEFORE the tick calls `applyExecuteDefault` — the
   * executor returns NONE/PAUSE_OPS for such rules, so this method is only called when the
   * executor has already resolved EXECUTE_DEFAULT (the Muscle says "yes, assault this tick").
   * The P4 legibility ref (`script_rule_that_blocked`) is surfaced by `resolveRefuseRef` (§8.1.4),
   * NOT by this method — `requestAssault` unconditionally schedules when the precondition holds.
   *
   * C4 DETERMINISM: no Math.random(), no Date.now().
   */
  async applyExecuteDefault(
    playerId: string,
    lieutenant: DelegationLieutenant,
    gameMinute: number, // the tick's own clock (W6.1 C7, design §8.1 #3) — threaded into requestAssault's created_at_minute
  ): Promise<'TAKEN' | 'NOOP'> {
    // [PROV-Y26Q2] Target rival for C3: always MUSCLE_DEFAULT_TARGET_RIVAL.
    const rivalKey: RivalKey = MUSCLE_DEFAULT_TARGET_RIVAL;

    const result = await this.combat.requestAssault(
      playerId,
      rivalKey,
      lieutenant.lieutenant_id,
      gameMinute,
      // [C5-DEP] target_register_id is null at C3: the erosion register targeting (target_register_id)
      // is a C5+ concern (PercolationService identifies which register the assault targets). At C3,
      // the MUSCLE lieutenant's assigned_building_id is its HOST (planning HQ), not the erosion register.
      // Passing undefined ensures target_register_id = null in the combat_event row.
      undefined,
    );

    if (result.scheduled) {
      this.logger.log(
        `applyExecuteDefault: assault SCHEDULED — lt=${lieutenant.lieutenant_id} ` +
          `rival=${rivalKey} event=${result.eventId}`,
      );
      return 'TAKEN';
    } else {
      // Structural precondition failure (no_rival_state): the rival is not yet seeded.
      // This is NOT a P4 script block — it is a benign pre-condition guard.
      this.logger.debug(
        `applyExecuteDefault: assault refused (no_rival_state) — lt=${lieutenant.lieutenant_id} rival=${rivalKey}`,
      );
      return 'NOOP'; // the tick's REFUND path will release the autonomy budget unit
    }
  }

  /**
   * The P4 legibility surface (DD-MUSCLE-P4-LEGIBLE §8.1.4).
   *
   * Given the lieutenant's compiled behavior script + the current game-state snapshot, calls
   * `DslExecutorService.resolveToScriptRuleRef` to surface WHY this Muscle lieutenant is NOT
   * assaulting: either a specific player rule blocked it (`{ ruleIndex }`) or no rule matched
   * (`{ kind: 'no_matching_rule' }`).
   *
   * Used by the `_test/combat/resolve-refuse-ref` probe route (and the future player-facing
   * "why didn't my Muscle assault?" endpoint). NEVER a hardcoded literal — the ref is always
   * derived from re-resolving the player's actual script through the real executor.
   *
   * Returns `null` when the script WOULD assault (the executor resolves EXECUTE_DEFAULT) — meaning
   * the Muscle is not refusing; it is about to assault this tick.
   *
   * PURE / DETERMINISTIC: same no-side-effect / no-Math.random / no-Date contract as the executor.
   *
   * @param compiledScript - The Muscle lieutenant's compiled behavior script (from behavior_script table).
   * @param playerId       - The player owning the lieutenant (for snapshot band reads).
   */
  async resolveRefuseRef(
    compiledScript: CompiledScript,
    playerId: string,
  ): Promise<ScriptRuleRef | null> {
    // Build a fresh snapshot (the same band reads as the tick's buildSnapshot — deterministic).
    // Stub the DelegationLieutenant: only `assigned_building_id` is read by buildSnapshot (and
    // the Muscle ignores it — `void lieutenant` in buildSnapshot). Other fields are placeholders.
    const ltStub: import('./archetype-binding').DelegationLieutenant = {
      lieutenant_id: '',
      assigned_building_id: null,
      target_building_id: null,
      role_archetype: 'MUSCLE',
      delegation_paused: false,
      tenure_score: 0,
      rules: { rules: [] },
    };
    const snapshot = await this.buildSnapshot(playerId, ltStub);

    const result = this.executor.resolveToScriptRuleRef(compiledScript, snapshot);
    if (result.wouldAssault) {
      return null; // the script says "assault" — not a refuse
    }
    return result.ref;
  }

  /**
   * SALIENT SIGNALS for the MUSCLE archetype — the teachable exception cards.
   * [PROV-Y26Q2] For C3: one salient signal — `regime_pressure_band='silent'` without a
   * blocking rule in the script (the Muscle is wasting ticks assaulting a dormant rival).
   * The full salient manifest (heat spike + percolation threshold) is a C5+ calibration TD.
   */
  salientSignals(): SalientSignalSpec[] {
    return [
      {
        signal: 'regime_pressure_band',
        kind: 'STATE',
        isSalient: (s) => s.state['regime_pressure_band'] === 'silent',
        card: {
          event_descriptor:
            'Rival is dormant (silent regime) — the Muscle lieutenant cannot schedule an assault.',
          candidate_actions: [
            {
              id: 'wait',
              label: 'Wait for pressure to mount',
              label_i18n: { key: 'exception.lieutenant_muscle.wait.label', params: {} }, // TD-455
              projected_consequence:
                'The lieutenant idles until the rival enters mounting or crushing regime.',
              projected_consequence_i18n: { key: 'exception.lieutenant_muscle.wait.projected_consequence', params: {} }, // TD-455
              add_rule_dsl: null,
              method: METHOD_BY_ACTION_ID.wait, // Lot 0 §1 D4 (C2).
            },
            {
              id: 'block_when_silent',
              label: 'Pause operations while rival is silent',
              label_i18n: { key: 'exception.lieutenant_muscle.block_when_silent.label', params: {} }, // TD-455
              projected_consequence:
                'The lieutenant explicitly pauses when the rival is dormant.',
              projected_consequence_i18n: { key: 'exception.lieutenant_muscle.block_when_silent.projected_consequence', params: {} }, // TD-455
              add_rule_dsl: `WHEN STATE(regime_pressure_band,==,silent) THEN PAUSE_OPS @100;`,
              method: METHOD_BY_ACTION_ID.block_when_silent, // Lot 0 §1 D4 (C2).
            },
          ],
          suggested_action: {
            id: 'block_when_silent',
            label: 'Pause operations while rival is silent',
            label_i18n: { key: 'exception.lieutenant_muscle.block_when_silent.label', params: {} }, // TD-455
            projected_consequence:
              'The lieutenant explicitly pauses when the rival is dormant.',
            projected_consequence_i18n: { key: 'exception.lieutenant_muscle.block_when_silent.projected_consequence', params: {} }, // TD-455
            add_rule_dsl: `WHEN STATE(regime_pressure_band,==,silent) THEN PAUSE_OPS @100;`,
            method: METHOD_BY_ACTION_ID.block_when_silent, // Lot 0 §1 D4 (C2).
          },
          confidence: 0.7,
          severity: 50,
          priority: 50,
        },
      },
    ];
  }
}
