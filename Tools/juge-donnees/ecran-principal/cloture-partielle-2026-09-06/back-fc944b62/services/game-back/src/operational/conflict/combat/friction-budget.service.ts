// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-B-combat-escalation-plan.md Task 4 (C4)
//             Design: docs/superpowers/specs/2026-06-24-04b-B-combat-escalation-design.md §3.2
//             Canon: docs/tech/04b_combat_and_conflict/combat_mechanics.md:95-136 §2.2
//             Registry: projects/mafia_city_game/gdd/14_tunable_constants.md §Combat / conflict layer — combat-B
//             — Combat & Escalation B C4 — 2026-06-25 —
//
// `FrictionBudgetService` — the C4 anti-dice resolution (§3.2 Friction Budget).
//
// Three public methods:
//   computeFrictionLoad(operationId) → FrictionBand
//     Deterministic function of operation.base_friction_load → the load band.
//     2-action plan (low load) → 'low'; 5-action plan (higher load) → 'high'.
//     Thresholds: base_friction_load < 0.30 → 'low'; < 0.70 → 'medium'; >= 0.70 → 'high'.
//
//   commitActionWithFriction(operationId, actionType, gameMinute) → { band, outcome }
//     Accrues shared_friction_pool by the per-action cost getter (combat.<action>_friction_cost).
//     Resolves the divergence lookup for the NEW pool band.
//     The pool band is P5-partial exception (visible to both parties as a bucket — not a raw float).
//
//   lookupDivergence(frictionBand, actionType) → CombatOutcomeBucket
//     Pure registry lookup — delegates to CombatTunables.getDivergenceOutcome.
//     NEVER Math.random. The canon anti-dice mandate (combat_mechanics.md:114).
//
// P5 / P6: base_friction_load (raw float) is SERVER-ONLY — never returned.
// Only the band (FrictionBand) is returned to callers. The shared_friction_pool band is the P5
// partial exception (visible to both as a bucket per canon :107).
//
// C4 (determinism): NO Math.random(), NO Date.now() anywhere in this file.
// ADDITIVE: touches only combat_operation (existing table); no new table, no migration.

import { Injectable } from '@nestjs/common';
import type { FrictionBand, CombatEventType } from './combat.types';
import { CombatTunables, type CombatOutcomeBucket } from './combat-tunables';
import { CombatRepository } from './combat.repository';
import type { RivalKey } from '../rival/rival-ai.types';

/** Band thresholds for base_friction_load (server-only). */
const FRICTION_LOW_THRESHOLD = 0.30;
const FRICTION_MEDIUM_THRESHOLD = 0.70;

/** Map base_friction_load (raw float, server-only) to a FrictionBand (P5). */
function toBand(load: number): FrictionBand {
  if (load < FRICTION_LOW_THRESHOLD) return 'low';
  if (load < FRICTION_MEDIUM_THRESHOLD) return 'medium';
  return 'high';
}

/** Per-action plan complexity multiplier (server-side constant). */
const ACTION_COMPLEXITY_FRICTION_INCREMENT = 0.12;

export interface FrictionCommitResult {
  /** The shared_friction_pool band after accrual (P5-partial exception — visible to both). */
  poolBand: FrictionBand;
  /** The divergence outcome for the new band + action type. */
  outcome: CombatOutcomeBucket;
}

@Injectable()
export class FrictionBudgetService {
  constructor(
    private readonly tunables: CombatTunables,
    private readonly repo: CombatRepository,
  ) {}

  /**
   * `computeFrictionLoad(playerId, rivalKey)` — deterministic function of the
   * operation's base_friction_load → FrictionBand.
   *
   * The base_friction_load is set at operation creation time (reflects plan complexity;
   * a 2-action plan → lower load, a 5-action plan → higher load). This method reads the
   * current value and returns its band (server-to-server — raw float never forwarded, P6).
   * C4: no Math.random, no Date.now.
   */
  async computeFrictionLoad(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<FrictionBand> {
    const op = await this.repo.readCombatOperation(playerId, rivalKey);
    if (!op) return 'low'; // No operation → minimal friction.
    return toBand(op.base_friction_load);
  }

  /**
   * `commitActionWithFriction(playerId, rivalKey, actionType, gameMinute)` — accrues the
   * `shared_friction_pool` by the getter-sourced `combat.<action>_friction_cost` and resolves
   * the divergence outcome for the new band.
   *
   * Sticky accumulator: repeated calls on the same operation compound the pool.
   * Idempotency note: on the SAME game-minute the same action produces the same accrual
   * (deterministic — no Date.now(), no Math.random()).
   *
   * The raw float is HIDDEN (server-only). Only the pool band (P5-partial exception) is returned.
   *
   * ⛔ CALIBRATION TD (W6.1 C7, BLOCKING-2 of the 3-review gate): `shared_friction_pool` has ZERO
   * production decrementer anywhere in this codebase. This method is its ONLY production writer
   * (`combat-resolution-tick.service.ts:143`, NIGHTLY/13.5) and it is monotone-increasing, clamped
   * at 1.0 (`:107`) — there is no reset, no decay, no daily/nightly tick that lowers it (measured
   * exhaustively: every reader/writer of `combat_operation` — `combat.repository.ts`,
   * `ephemeral-operation.service.ts` (writes `ephemeral_mode` only), `deescalation-tick.service.ts`'s
   * COMBAT_DAILY_TICK — NIGHTLY/14 — (4 decays: `maladaptive-memory.service.ts`,
   * `familiarity-discount.service.ts`, `ephemeral-operation.service.ts`'s purge,
   * `cumulative-attrition.service.ts`, none of which touch `combat_operation`) — was traced; the
   * ONLY other writer is `setBaseFrictionLoad` below, which never touches this column, and the
   * `_test`-gated reset routes in `combat-test.controller.ts`). At the default
   * `combat.assault_friction_cost=0.15` with thresholds 0.30/0.70 (`toBand` above), the pool crosses
   * into the 'high' band on the 5th assault against the SAME (player, rival) and stays there forever
   * (clamped) — `lookupDivergence` then returns the SAME outcome for the SAME actionType on every
   * subsequent assault: **resolution degenerates from anti-dice into a constant** for a rival a
   * player keeps assaulting. This does NOT invalidate C2's anti-fig-leaf falsifiable ("2nd assault
   * differs from 1st") — that comparison sits entirely inside the low→medium transition (assaults
   * 1-2) and stays genuinely discriminating; it is assaults ~5+ that stop discriminating. Pinned by
   * `combat_friction_budget.spec.ts` test (d) — that test is EXPECTED to start failing the day a
   * production decrementer lands (the correct signal to revisit/relax it, never a regression).
   */
  async commitActionWithFriction(
    playerId: string,
    rivalKey: RivalKey,
    actionType: CombatEventType,
    _gameMinute: number,
  ): Promise<FrictionCommitResult> {
    const op = await this.repo.readCombatOperation(playerId, rivalKey);
    const currentPool = op?.shared_friction_pool ?? 0;

    // Get the per-action friction cost from the registry.
    const cost = this.getActionFrictionCost(actionType);

    // Accrue the sticky pool (clamp to [0, 1] — friction is a 0..1 float, :105).
    const newPool = Math.min(1.0, currentPool + cost);

    // Persist the updated pool.
    await this.repo.upsertCombatOperation(playerId, rivalKey, {
      shared_friction_pool: newPool,
    });

    // Derive the band (P5-partial exception: the pool band is visible to both parties).
    const poolBand = toBand(newPool);

    // Look up the divergence outcome (the anti-dice, C4).
    const outcome = this.lookupDivergence(poolBand, actionType);

    return { poolBand, outcome };
  }

  /**
   * `lookupDivergence(frictionBand, actionType)` — pure registry lookup.
   * Delegates to `CombatTunables.getDivergenceOutcome`.
   * NEVER Math.random. This IS the canon anti-dice mandate (:114).
   */
  lookupDivergence(frictionBand: FrictionBand, actionType: CombatEventType): CombatOutcomeBucket {
    return this.tunables.getDivergenceOutcome(frictionBand, actionType);
  }

  // ── Internal helpers ─────────────────────────────────────────────────────────────────────────

  /** Returns the registry-sourced friction cost for the given action type. */
  private getActionFrictionCost(actionType: CombatEventType): number {
    switch (actionType) {
      case 'assault':          return this.tunables.assaultFrictionCost;
      case 'hold':             return this.tunables.holdFrictionCost;
      case 'degrade_register': return this.tunables.degradeRegisterFrictionCost;
    }
  }

  /**
   * `setBaseFrictionLoad(playerId, rivalKey, planActionCount)` — utility for C4 tests.
   * Sets the base_friction_load from plan action count (server-only, never player-facing).
   * Each planned action contributes ACTION_COMPLEXITY_FRICTION_INCREMENT (0.12).
   * 2 actions → 0.24 (load = 'low'); 5 actions → 0.60 (load = 'medium'; 6+ → 'high' territory).
   * C4: no Math.random, no Date.now.
   */
  async setBaseFrictionLoad(
    playerId: string,
    rivalKey: RivalKey,
    planActionCount: number,
  ): Promise<void> {
    const load = Math.min(1.0, planActionCount * ACTION_COMPLEXITY_FRICTION_INCREMENT);
    await this.repo.upsertCombatOperation(playerId, rivalKey, {
      base_friction_load: load,
    });
  }
}
