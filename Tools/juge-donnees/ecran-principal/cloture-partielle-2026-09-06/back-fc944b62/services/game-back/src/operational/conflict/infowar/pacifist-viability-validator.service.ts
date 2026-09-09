// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-C-diplomacy-infowar-plan.md Task 12 (C12) Step 5
//             Design: docs/superpowers/specs/2026-06-24-04b-C-diplomacy-infowar-design.md §11.3
//             Canon: docs/tech/04b_combat_and_conflict/pacifist_run_viability.md:76-85
//             — Diplomacy & Information Warfare C C12 — 2026-06-26 —
//
// `PacifistViabilityValidator` — the brand-commitment gate (DD-PACIFIST-E2E).
//
// Canon (pacifist_run_viability.md:17): "Pacifist viability = brand brief non-négociable: un joueur
// qui refuse toute violence doit pouvoir jouer end-to-end et atteindre LATE phase."
//
// `runE2EScenario(playerId, gameMinute)`:
//   Checks the 5 brand-brief invariants (pacifist_run_viability.md:76-85):
//   (a) Player reaches LATE phase — proxy: gameMinute >= LATE_PHASE_GAME_MINUTES (129600 = 90 days).
//       The spec drives the tick-advance harness to a LATE game-minute before calling this validator.
//       No real-time polling. Deterministic game-time threshold only.
//   (b) No combat_event of type 'assault' for this player. (Direct DB query — falsifiable.)
//   (c) No RivalEliminatedEvent. Proxy: elimination REQUIRES the §9.1 assault cascade (assault count=0
//       → no cascade → no elimination possible). Documented proxy; no dedicated table exists.
//   (d) No Muscle arrest during combat. Proxy: same as (c) — no assault → no combat → no arrest.
//       Documented proxy; no dedicated table exists.
//   (e) Diplomacy/info-warfare mechanics used ≥ 1. Proxy: at least one row in credibility_state OR
//       dead_reckoning_belief for this player (any mechanic write creates a row).
//
// Brand-gate: if passed=false, this is a brand-brief violation → blocking gate.
//
// Determinism: NO Math.random(). NO Date.now(). All checks are pure DB queries + game-minute threshold.
// P5: no raw scalars exposed; only the PacifistViabilityReport (qualitative only).
// Anti-fabrication: LATE_PHASE_GAME_MINUTES = 129600 is an INLINE canon-derived constant.
//   This service does NOT inject DiplomacyTunables — it has no getter dependency.
//   Canon source: operational_loop_progression.md:43 — LATE phase = "Month 3+" = 90 in-game days.
//   Arithmetic: 90 days × 1440 game-minutes/day = 129,600. Inline, not getter-sourced.
//   [PROV-Y26Q2]: this is a test-only brand-gate (not a production gameplay path); calibration
//   of the production LATE-phase threshold routes to the conflict-layer calibration TD.

import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and, gt } from 'drizzle-orm';

import type { DrizzleClient } from '../../../db';
import { DB } from '../../../db/db.module';
import { combatEvent } from '../../../db/schema/conflict_combat';
import { credibilityState } from '../../../db/schema/conflict_diplomacy';
import { deadReckoningBelief } from '../../../db/schema/conflict_infowar';

// ─── LATE phase game-minute threshold ────────────────────────────────────────────────────────────
//
// Canon: operational_loop_progression.md:43 — LATE phase = "Month 3+" = 90 in-game days.
// 90 days × 1440 game-minutes/day = 129,600 game-minutes.
// [PROV-Y26Q2]: calibration-routed via the conflict-layer calibration TD.
// The spec drives tick-advance to this minute (NOT real-time). No Math.random().
//
const LATE_PHASE_GAME_MINUTES = 129_600;

// ─── Types ───────────────────────────────────────────────────────────────────────────────────────

export type PacifistPhase = 'EARLY' | 'MID' | 'LATE';

/**
 * `PacifistViabilityReport` — the composite result of `runE2EScenario`.
 *
 * Canon: pacifist_run_viability.md:97-101.
 * P5: no raw scalar. All fields are qualitative (bucket / boolean / count ≥ 0 integer only).
 */
export interface PacifistViabilityReport {
  /** (a) Which phase the game-minute resolves to (EARLY / MID / LATE). */
  readonly phaseReached: PacifistPhase;
  /** (b+c+d) Total violent event count (assault combat events). 0 = no violence. */
  readonly violentEventsCount: number;
  /** (e) Whether at least one diplomacy or info-warfare mechanic row exists for the player. */
  readonly mechanicsUsed: boolean;
  /** Composite: all 5 criteria pass → true. Failure = brand-brief violation. */
  readonly passed: boolean;
  /** Verbatim brand-brief compliance flag (alias of passed, per pacifist_run_viability.md:101). */
  readonly brandBriefCompliance: boolean;
}

// ─── Service ─────────────────────────────────────────────────────────────────────────────────────

@Injectable()
export class PacifistViabilityValidator {
  private readonly logger = new Logger(PacifistViabilityValidator.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
  ) {}

  /**
   * `runE2EScenario` — the brand-commitment gate.
   *
   * Canon: pacifist_run_viability.md:58 + :76-85 + :97.
   * DD-PACIFIST-E2E: deterministic, seeded, tick-advance-driven (NOT real-time).
   *
   * The caller (the E2E spec via the _test route) drives the tick-advance harness first:
   *   - Advances info-loop ticks to a LATE game-minute (gameMinute >= LATE_PHASE_GAME_MINUTES)
   *   - Seeds diplomacy/info-warfare mechanic rows for the player
   *   - Takes NO violent actions (no assault events)
   * Then calls this validator with the final game-minute.
   *
   * @param playerId - the player UUID
   * @param gameMinute - the current game-time (driven by the test harness; NOT Date.now())
   * @returns PacifistViabilityReport — passed=false is a blocking brand-brief violation
   */
  async runE2EScenario(
    playerId: string,
    gameMinute: number,
  ): Promise<PacifistViabilityReport> {
    this.logger.log(
      `[PacifistViabilityValidator] runE2EScenario player=${playerId} gameMinute=${gameMinute}`,
    );

    // ── (a) LATE phase check ──────────────────────────────────────────────────────────────────
    // Proxy: game-minute threshold. The spec tick-advances to LATE_PHASE_GAME_MINUTES.
    // Real-time equivalent: NOT used. No Date.now(). Pure game-time.
    let phaseReached: PacifistPhase;
    if (gameMinute >= LATE_PHASE_GAME_MINUTES) {
      phaseReached = 'LATE';
    } else if (gameMinute >= 43_200) {
      // MID: 30 in-game days × 1440 min/day = 43,200 (canon EARLY → MID boundary approximation)
      phaseReached = 'MID';
    } else {
      phaseReached = 'EARLY';
    }

    // ── (b) No assault combat events ──────────────────────────────────────────────────────────
    // Direct DB query — falsifiable. If any assault combat_event exists, the run was violent.
    const assaultRows = await this.db
      .select({ id: combatEvent.id })
      .from(combatEvent)
      .where(
        and(
          eq(combatEvent.player_id, playerId),
          eq(combatEvent.type, 'assault'),
        ),
      );
    const violentEventsCount = assaultRows.length;

    // ── (c) No RivalEliminatedEvent ────────────────────────────────────────────────────────────
    // Proxy: the §9.2 elimination cascade REQUIRES the §9.1 assault cascade as prerequisite.
    // assault_count=0 → no §9.1 cascade → no §9.2 elimination → no RivalEliminatedEvent.
    // No dedicated persisted elimination table exists; this proxy is documented per charte honesty.
    // (The RivalEliminatedEvent is emitted on the in-memory CityEventBus, not persisted to DB.)

    // ── (d) No Muscle arrest ───────────────────────────────────────────────────────────────────
    // Proxy: LieutenantCaughtDuringCombat/MuscleArrested events are triggered by the assault cascade
    // (§9.1 layer 4 via CombatService). assault_count=0 → no cascade → no Muscle arrest possible.
    // No dedicated Muscle arrest table exists; same proxy as (c), documented.

    // ── (e) Diplomacy/info-warfare mechanics used ≥ 1 ──────────────────────────────────────────
    // Proxy: at least one row in credibility_state with credibility > 0 (diplomacy mechanic
    // RAISES credibility above the 0-baseline via recordBackedCommitment) OR at least one row
    // in dead_reckoning_belief with last_updated_tick > 0 (info-warfare mechanic writes a
    // non-zero tick via updateBelief).
    //
    // WHY the > 0 guard:
    //   - resetInfowar() UPSERTs dead_reckoning_belief rows with last_updated_tick=0 (baseline).
    //   - resetCredibility() UPSERTs credibility_state rows with credibility=0 (baseline).
    //   Baseline rows exist for isolation purposes but do NOT signal mechanic usage.
    //   A real mechanic call raises credibility > 0 (CredibilityAccumulatorService.recordBackedCommitment)
    //   or advances last_updated_tick > 0 (DeadReckoningService.updateBeliefState with gameMinute > 0).
    const credibilityRows = await this.db
      .select({ player_id: credibilityState.player_id })
      .from(credibilityState)
      .where(
        and(
          eq(credibilityState.player_id, playerId),
          gt(credibilityState.credibility, 0),
        ),
      )
      .limit(1);

    let mechanicsUsed = credibilityRows.length > 0;

    if (!mechanicsUsed) {
      // Check info-warfare: any dead_reckoning_belief row where last_updated_tick > 0
      const beliefRows = await this.db
        .select({ player_id: deadReckoningBelief.player_id })
        .from(deadReckoningBelief)
        .where(
          and(
            eq(deadReckoningBelief.player_id, playerId),
            gt(deadReckoningBelief.last_updated_tick, 0),
          ),
        )
        .limit(1);
      mechanicsUsed = beliefRows.length > 0;
    }

    // ── Composite result ──────────────────────────────────────────────────────────────────────
    // All 5 criteria must pass for brand-brief compliance.
    const passed =
      phaseReached === 'LATE' &&   // (a)
      violentEventsCount === 0 &&  // (b+c+d)
      mechanicsUsed;               // (e)

    const report: PacifistViabilityReport = {
      phaseReached,
      violentEventsCount,
      mechanicsUsed,
      passed,
      brandBriefCompliance: passed,
    };

    if (!passed) {
      this.logger.warn(
        `[PacifistViabilityValidator] BRAND-BRIEF VIOLATION player=${playerId}: ` +
        `phase=${phaseReached} violent=${violentEventsCount} mechanicsUsed=${mechanicsUsed}`,
      );
    } else {
      this.logger.log(
        `[PacifistViabilityValidator] PASSED: player=${playerId} phase=${phaseReached} ` +
        `violent=0 mechanicsUsed=${mechanicsUsed}`,
      );
    }

    return report;
  }
}
