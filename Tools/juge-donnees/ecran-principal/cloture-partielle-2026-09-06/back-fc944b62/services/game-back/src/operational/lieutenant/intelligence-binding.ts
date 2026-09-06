// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-C-diplomacy-infowar-plan.md Task 3 (C3) Step 5
//             Design: docs/superpowers/specs/2026-06-24-04b-C-diplomacy-infowar-design.md §8 (DD-INTEL)
//             DIV: DIV-C1 option-(i) — C mirrors how B authored MUSCLE (the ArchetypeBinding pattern).
//             Canon: docs/tech/04b_combat_and_conflict/design_principles.md:67-73 (P5/P6)
//                    docs/tech/04b_combat_and_conflict/information_warfare_mechanics.md §8.1 (Dead Reckoning)
//             Mirror: services/game-back/src/operational/lieutenant/muscle-binding.ts (the template)
//             — Diplomacy & Information Warfare C C3 — 2026-06-26 —
//
// `IntelligenceBindingService` — the INTELLIGENCE-archetype adapter the delegation tick calls.
// Mirrors `MuscleBindingService` exactly in shape (buildSnapshot / applyExecuteDefault /
// validateAssignment / salientSignals) — the INTELLIGENCE binding implements `ArchetypeBinding`.
//
// THE BINDING'S ROLE:
//   - `buildSnapshot` resolves the per-tick signals from A's §13 toClientView bands (server↔server,
//     P6 safe): `state.regime_pressure_band` from A's toClientView.regimePressureBand
//     (a 'silent'|'mounting'|'crushing' string — a CLOSED enum, R2.2 / P6: never a raw float).
//     `state.behavioral_indicator` from A's toClientView.behavioralIndicator (a MANY-TO-ONE soft
//     indicator string — the non-invertible rival-state cue the INTELLIGENCE archetype observes).
//     [C9-DEP] `state.belief_band` is STUBBED as 'uncertain' until C9 lands (the DeadReckoningService
//     belief-state read is the C9 seam — recorded as a dependency).
//     The InfoWarTunables are injected to read seed prefixes via the getter (never inline literals).
//   - `applyExecuteDefault` maps a resolved EXECUTE_DEFAULT to an intel-op INTENT → returns
//     'TAKEN'/'NOOP'. The actual surveillance_op row write lands in C9 — C3 SCHEDULES the intent.
//     No side-effect row is written in C3 (the intent is the observable: 'TAKEN' proves the binding
//     resolved the band from A's toClientView and accepted the token).
//   - `validateAssignment` = the recruit gate (mirrors muscle-binding's host-type discipline).
//     [PROV-Y26Q2] Canon is SILENT on the specific building type an Intelligence lieutenant requires.
//     ANY player-owned operational building is accepted for C3.
//   - `salientSignals` mirrors Muscle: one salient — the rival is 'silent' without a script covering it.
//
// EXECUTOR SANDBOX INVARIANT: the executor performs NO side-effect; the binding does.
// The `buildSnapshot` is a pure read; `applyExecuteDefault` is the action surface.
//
// P6 WALL: `state.regime_pressure_band` is a STRING ENUM ('silent'|'mounting'|'crushing'),
// `state.behavioral_indicator` is a STRING ENUM (5 members — 'coordinated'|'holding reserve'|
// 'pressed'|'supply lines thin'|'scattered'); NEITHER is a raw scalar.
// The binding reads A's §13 toClientView — NOT rival_state directly.
//
// C4 DETERMINISM: NO Math.random(), NO Date.now() anywhere in this file.
// ADDITIVE: no existing service modified.

import { Injectable, Logger } from '@nestjs/common';

import type { SignalSnapshot } from '../../dsl/signals';
import { RivalProjectionService } from '../conflict/rival/rival-projection.service';
import { LieutenantRepository } from './lieutenant.repository';
import type { ArchetypeBinding, DelegationLieutenant, SalientSignalSpec } from './archetype-binding';
import { METHOD_BY_ACTION_ID } from '../../exceptions/method-by-action-id';
import { ApiError } from '../../protocol/api-error';
import type { LieutenantArchetype } from './lieutenant-archetype';
import { InfoWarTunables } from '../conflict/infowar/infowar.tunables';
import type { RivalKey } from '../conflict/rival/rival-ai.types';

// ── [PROV-Y26Q2] Host-type: canon-silent — any player-owned operational building accepted ──────
// When canon clarifies the Intelligence lieutenant's building host type, add the type name here
// and enable the INTELLIGENCE_HOST_OPERATIONAL_TYPES guard in validateAssignment.
// Per lieutenant_definition.md §Archetype projection: INTELLIGENCE corresponds to the info-warfare
// operative / surveillance role; 04a lieutenant_role_mapping.md does not mandate a specific
// operational_type for the 'Sector lead' role (the bound catalogue slot, index 12).
// [PROV-Y26Q2]: no building-type gate for C3 — any player-owned operational building accepted.
// const INTELLIGENCE_HOST_OPERATIONAL_TYPES = new Set<string>([]);  // [PROV-Y26Q2] TODO: clarify

// ── Default rival key when the lieutenant has no explicit target stored ────────────────────────
// [PROV-Y26Q2]: C3 defaults to 'tarcum' as the surveillance target rival when the lieutenant has
// no stored target_rival_key. When the C# intel-plan card UI lands (a TD), the player explicitly
// designates the target rival; until then the INTELLIGENCE binding targets the first active rival.
const INTELLIGENCE_DEFAULT_TARGET_RIVAL: RivalKey = 'tarcum';

@Injectable()
export class IntelligenceBindingService implements ArchetypeBinding {
  private readonly logger = new Logger(IntelligenceBindingService.name);

  /** The archetype this binding serves — its registry key (BindingRegistry indexes by it). */
  readonly archetype: LieutenantArchetype = 'INTELLIGENCE';

  constructor(
    private readonly repo: LieutenantRepository,
    private readonly rivalProjection: RivalProjectionService,
    private readonly infoWarTunables: InfoWarTunables,
  ) {}

  /**
   * The RECRUIT-time assignment gate for an INTELLIGENCE lieutenant.
   *
   * [PROV-Y26Q2] Canon is SILENT on the specific building type an Intelligence lieutenant requires.
   * For C3, ANY player-owned operational building is accepted (the building serves as the
   * intelligence lieutenant's safe house / operations base — no production-type constraint like
   * COOK's lab requirement). When canon clarifies, update this method.
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
    // [PROV-Y26Q2] No building-type gate for INTELLIGENCE (canon-silent on host type).
    // When canon clarifies, add: if (!INTELLIGENCE_HOST_OPERATIONAL_TYPES.has(owned.operational_type)) { throw ... }
  }

  /**
   * BUILD the per-tick signal snapshot for a delegated INTELLIGENCE lieutenant from REAL game state.
   *
   * Signals resolved (P6 / R2.2 — all are BANDED or STRING ENUM, never raw scalars):
   *
   *   `state.regime_pressure_band` — the rival's current RegimePressureBucket
   *     ('silent' | 'mounting' | 'crushing') from A's §13 toClientView.
   *     This is a CLOSED ENUM (3 values). NEVER the raw regime_pressure float (P6 wall).
   *     An INTELLIGENCE rule reads: `WHEN STATE(regime_pressure_band,==,mounting) THEN EXECUTE_DEFAULT @100;`
   *
   *   `state.behavioral_indicator` — the rival's soft behavioral cue from A's §13 toClientView.
   *     One of 5 MANY-TO-ONE string values: 'coordinated'|'holding reserve'|'pressed'|
   *     'supply lines thin'|'scattered'. NON-INVERTIBLE: multiple hidden regimes map to the same
   *     indicator — the player cannot decode the rival's true regime from this cue (P5 guarantee).
   *
   *   `state.belief_band` — [C9-DEP] STUBBED as 'uncertain' until DeadReckoningService lands at C9.
   *     When C9 lands, replace with: `await this.deadReckoning.getBeliefBand(playerId, rivalKey)`.
   *     [PROV-Y26Q2]: stub value is 'uncertain' (the default belief state before any surveillance).
   *
   * The InfoWarTunables are consulted for seed prefixes (OQ-C2 seeds via getter — never inline).
   * For C3 the seed prefixes are available but not yet consumed (the actual draw happens at C9
   * when the surveillance_op is written). The tunables inject is kept so C9 can extend this binding.
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

    // [PROV-Y26Q2] Resolve target rival key. For C3, always INTELLIGENCE_DEFAULT_TARGET_RIVAL.
    // When the C# intel-plan card UI lands, the INTELLIGENCE lieutenant's script will carry the
    // target via a state signal — to be resolved then.
    const rivalKey: RivalKey = INTELLIGENCE_DEFAULT_TARGET_RIVAL;

    // ── §13 band read via A's toClientView (P6 safe — server↔server, NOT rival_state directly) ──
    // A's toClientView is the ONLY path from rival_state to ANY consumer. The binding reads it
    // server-side, never exposing raw scalars to the player route.
    // C4: toClientView is deterministic (no Math.random(), no Date.now() — pure DB state + tunables).
    const clientView = await this.rivalProjection.toClientView(playerId, rivalKey);

    // ── Signal 1: regime_pressure_band — CLOSED ENUM (3 values, P6 safe) ────────────────────────
    // NEVER the raw regime_pressure float. The INTELLIGENCE binding observes the rival's pressure
    // BAND — the same banded value the player's DSL script reasons about (P4 legibility).
    if (clientView.regimePressureBand !== null) {
      state.regime_pressure_band = clientView.regimePressureBand; // 'silent' | 'mounting' | 'crushing'
    }
    // (absent if no rival_state row → absence contract: executor treats absent as non-matching)

    // ── Signal 2: behavioral_indicator — MANY-TO-ONE soft cue (5 values, P5/P6 safe) ──────────
    // The non-invertible rival behavioral indicator — multiple hidden regimes produce the same
    // indicator value, so the player cannot decode the rival's true regime (the P5 guarantee).
    if (clientView.behavioralIndicator !== null) {
      state.behavioral_indicator = clientView.behavioralIndicator;
      // 'coordinated'|'holding reserve'|'pressed'|'supply lines thin'|'scattered'
    }

    // ── [C9-DEP] Belief band stub ─────────────────────────────────────────────────────────────
    // Until DeadReckoningService lands at C9, the belief_band is STUBBED as 'uncertain'.
    // When C9 lands, replace this stub with:
    //   const beliefBand = await this.deadReckoning.getBeliefBand(playerId, rivalKey);
    //   if (beliefBand !== null) { state.belief_band = beliefBand; }
    // [PROV-Y26Q2]: stub value is 'uncertain' (default belief state before any surveillance ops).
    state.belief_band = 'uncertain'; // [C9-DEP] stub — remove when DeadReckoningService lands

    // ── InfoWarTunables: seed prefixes available (consumed at C9 for the surveillance draw) ────
    // The getters are accessed via the injected InfoWarTunables — NEVER inlined.
    // [C9-DEP] At C9, the binding (or the surveillance_op writer) will use:
    //   const seedPrefix = this.infoWarTunables.observationDetectionSeedPrefix; // 'obs_detect'
    // For C3, we read the prefix to confirm injection works (no-op — the value is not used yet).
    void this.infoWarTunables.observationDetectionSeedPrefix; // C9 seam — getter-sourced, not inlined

    void lieutenant; // the Intelligence binding does not use assigned_building_id for signal resolution in C3
    return { state, events };
  }

  /**
   * APPLY the INTELLIGENCE archetype's `EXECUTE_DEFAULT` — schedules an intel-op INTENT.
   *
   * C3 CONTRACT: `applyExecuteDefault` returns 'TAKEN' to signal the intent was scheduled.
   * [C9-DEP] The actual `surveillance_op` row write (the observable DB side-effect) lands in C9
   * (the INFO_LOOP_DAILY_TICK / DeadReckoningService.runSurveillanceOp). At C3, the INTELLIGENCE
   * binding RECORDS the intent in a log entry (no table row — the table is a C9 migration).
   *
   * On accept: the binding logs the intent and returns 'TAKEN'.
   * On null building (guard): returns 'NOOP' (no side-effect; the tick's refund path handles it).
   *
   * Note: an INTELLIGENCE script blocking rule fires BEFORE the tick calls `applyExecuteDefault` —
   * the executor returns NONE/PAUSE_OPS for such rules, so this method is only called when the
   * executor has already resolved EXECUTE_DEFAULT.
   *
   * C4 DETERMINISM: no Math.random(), no Date.now().
   */
  async applyExecuteDefault(
    playerId: string,
    lieutenant: DelegationLieutenant,
    _gameMinute: number, // unused — INTELLIGENCE's intel-op INTENT path carries no created_at clock (W6.1 C7, archetype-binding.ts)
  ): Promise<'TAKEN' | 'NOOP'> {
    // [PROV-Y26Q2] Target rival for C3: always INTELLIGENCE_DEFAULT_TARGET_RIVAL.
    const rivalKey: RivalKey = INTELLIGENCE_DEFAULT_TARGET_RIVAL;

    if (!lieutenant.assigned_building_id) {
      // Null building → NOOP (benign guard, no crash).
      this.logger.debug(
        `applyExecuteDefault: NOOP (null assigned_building_id) — lt=${lieutenant.lieutenant_id}`,
      );
      return 'NOOP';
    }

    // ── [C9-DEP] Surveillance op intent (row write deferred to C9) ────────────────────────────
    // When C9 lands (DeadReckoningService.runSurveillanceOp), replace this log with:
    //   const result = await this.deadReckoning.scheduleSurveillanceOp(playerId, rivalKey, lieutenant.lieutenant_id);
    //   if (!result.scheduled) { this.logger.debug(...); return 'NOOP'; }
    // For C3, the intent is LOGGED (observable by the tick's 'TAKEN' return + the logger).
    this.logger.log(
      `applyExecuteDefault: intel-op INTENT SCHEDULED — lt=${lieutenant.lieutenant_id} ` +
        `rival=${rivalKey} player=${playerId}` +
        ` [C9-DEP: surveillance_op row write deferred to C9]`,
    );

    // Return 'TAKEN': the binding accepted the EXECUTE_DEFAULT token (the intent is scheduled).
    // The tick uses 'TAKEN' to gate the autonomy budget decrement (a taken action consumes budget).
    // C9 will add the surveillance_op row write here.
    return 'TAKEN';
  }

  /**
   * SALIENT SIGNALS for the INTELLIGENCE archetype — the teachable exception cards.
   * [PROV-Y26Q2] For C3: one salient signal — `regime_pressure_band='silent'` without a
   * covering rule (the Intelligence lieutenant is not gathering intel while the rival is dormant).
   * The full salient manifest (belief degradation / behavioral indicator threshold) is a C9+ TD.
   */
  salientSignals(): SalientSignalSpec[] {
    return [
      {
        signal: 'regime_pressure_band',
        kind: 'STATE',
        isSalient: (s) => s.state['regime_pressure_band'] === 'silent',
        card: {
          event_descriptor:
            'Rival is dormant (silent regime) — the Intelligence lieutenant may be wasting observation capacity.',
          candidate_actions: [
            {
              id: 'wait',
              label: 'Wait for rival to become active',
              label_i18n: { key: 'exception.lieutenant_intelligence.wait.label', params: {} }, // TD-455
              projected_consequence:
                'The lieutenant idles until the rival enters mounting or crushing regime.',
              projected_consequence_i18n: { key: 'exception.lieutenant_intelligence.wait.projected_consequence', params: {} }, // TD-455
              add_rule_dsl: null,
              method: METHOD_BY_ACTION_ID.wait, // Lot 0 §1 D4 (C2).
            },
            {
              id: 'observe_anyway',
              label: 'Gather intel even when rival is silent',
              label_i18n: { key: 'exception.lieutenant_intelligence.observe_anyway.label', params: {} }, // TD-455
              projected_consequence:
                'The lieutenant runs surveillance even in silent regime, building belief state.',
              projected_consequence_i18n: { key: 'exception.lieutenant_intelligence.observe_anyway.projected_consequence', params: {} }, // TD-455
              add_rule_dsl: `WHEN STATE(regime_pressure_band,==,silent) THEN EXECUTE_DEFAULT @80;`,
              method: METHOD_BY_ACTION_ID.observe_anyway, // Lot 0 §1 D4 (C2).
            },
          ],
          suggested_action: {
            id: 'observe_anyway',
            label: 'Gather intel even when rival is silent',
            label_i18n: { key: 'exception.lieutenant_intelligence.observe_anyway.label', params: {} }, // TD-455
            projected_consequence:
              'The lieutenant runs surveillance even in silent regime, building belief state.',
            projected_consequence_i18n: { key: 'exception.lieutenant_intelligence.observe_anyway.projected_consequence', params: {} }, // TD-455
            add_rule_dsl: `WHEN STATE(regime_pressure_band,==,silent) THEN EXECUTE_DEFAULT @80;`,
            method: METHOD_BY_ACTION_ID.observe_anyway, // Lot 0 §1 D4 (C2).
          },
          confidence: 0.6,
          severity: 40,
          priority: 40,
        },
      },
    ];
  }
}
