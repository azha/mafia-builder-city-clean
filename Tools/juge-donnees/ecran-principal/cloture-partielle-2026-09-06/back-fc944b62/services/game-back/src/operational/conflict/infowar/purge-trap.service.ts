// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-C-diplomacy-infowar-plan.md Task 9 (C9)
//             Canon: docs/tech/04b_combat_and_conflict/information_warfare_mechanics.md §4.4
//             — Diplomacy & Information Warfare C C9 — 2026-06-26 —
//
// PurgeTrapService — §4.4 Purge Trap mechanic.
//
// plantEmbedSignal(playerId, rivalKey, isBluff, gameMinute):
//   - Read current purge_trap_state (init defaults if no row)
//   - gameDay = Math.floor(gameMinute / 1440)
//   - infiltrationIncrease = resolveCompositeRef(purgeSuspicionIncreasePerSignalBucket, ...) [STANDARD ref 0.15]
//   - Increase suspected_infiltration_level += infiltrationIncrease; clamp to [0..1]
//   - purgeThreshold = resolveCompositeRef(purgeThresholdBucket, ...) [STANDARD ref 0.55]
//   - IF suspected_infiltration_level >= purgeThreshold AND not already purging:
//     - internal_purge_active = true
//     - Call regimeSwitching.recordPressure(playerId, rivalKey, 'territory', 'medium')
//   - IF isBluff:
//     - bluff_active = true
//     - bluffDraw = makeRng(`${tunables.purgeBluffDiscoverySeedPrefix}:${rivalKey}:${gameDay}`).next()
//     - bluffDetectionThreshold = resolveCompositeRef(purgeBluffDetectionProbabilityPerTickBucket, ...) [STANDARD ref 0.10]
//     - IF bluffDraw < bluffDetectionThreshold: bluff_discovered = true
//   - Write back purge_trap_state
//   - Return { infiltrationLevel, purgeActive, bluffDiscovered, draw }
//     (draw = bluffDraw if isBluff, else null)
//
// evalPurge(playerId, rivalKey, gameMinute):
//   - Minimal no-op check: reads state and if already purging, no additional action.
//   - Used by the orchestrator's tick loop.

import { Injectable, Logger } from '@nestjs/common';

import { makeRng } from '../../../common/seeded-rng';
import { InfoWarTunables } from './infowar.tunables';
import { InformationWarfareRepository } from './infowar.repository';
import { RegimeSwitchingService } from '../rival/regime-switching.service';
import type { PressureSource } from '../rival/regime-switching.service';
import type { RivalKey } from '../rival/rival-ai.types';

// ── Composite bucket → ref float resolver ────────────────────────────────────────────────────────
// Pattern mirrors credibility-accumulator.service.ts (the C5 precedent for composite ref resolvers).

/** Translate a composite bucket string to its ref float. */
function resolveCompositeRef(bucketString: string, refMap: Record<string, number>): number {
  const key = bucketString.toLowerCase().trim();
  if (key in refMap) return refMap[key]!;
  const parsed = Number(bucketString);
  if (!Number.isNaN(parsed)) return parsed;
  return 0; // safe fallback — a misconfigured bucket becomes a no-op
}

// ── Ref-float maps ────────────────────────────────────────────────────────────────────────────────

// Ref floats for `info_warfare.purge_suspicion_increase_per_signal_bucket`.
// Canon :140 — composite:STANDARD → +0.15. [PROV-Y26Q2] HIGH/LOW refs below.
const PURGE_SUSPICION_REF_MAP: Record<string, number> = {
  'composite:standard': 0.15,
  'composite:high':     0.25,
  'composite:low':      0.08,
};

// Ref floats for `info_warfare.purge_threshold_bucket`.
// Canon :141 — composite:STANDARD → 0.55. [PROV-Y26Q2] HIGH/LOW refs below.
const PURGE_THRESHOLD_REF_MAP: Record<string, number> = {
  'composite:standard': 0.55,
  'composite:high':     0.70,
  'composite:low':      0.35,
};

// Ref floats for `info_warfare.purge_bluff_detection_probability_per_tick_bucket`.
// Canon :143 — composite:STANDARD → 0.10. [PROV-Y26Q2] HIGH/LOW refs below.
const PURGE_BLUFF_DETECTION_REF_MAP: Record<string, number> = {
  'composite:standard': 0.10,
  'composite:high':     0.20,
  'composite:low':      0.04,
};

// ─── Service ──────────────────────────────────────────────────────────────────────────────────────

@Injectable()
export class PurgeTrapService {
  private readonly logger = new Logger(PurgeTrapService.name);

  constructor(
    private readonly tunables: InfoWarTunables,
    private readonly repo: InformationWarfareRepository,
    private readonly regimeSwitching: RegimeSwitchingService,
  ) {}

  /**
   * `plantEmbedSignal` — the §4.4 Purge Trap plant operation.
   *
   * Increases the rival's suspected_infiltration_level each time the player plants a signal.
   * Once the level crosses the purge threshold (0.55), an internal_purge_active fires,
   * calling A's recordPressure (the regime-switch seam — territory pressure, medium magnitude).
   *
   * isBluff path: the player can declare the embed signal a bluff. The rival may discover the bluff
   * with probability 0.10 per tick (seeded draw — day-scoped, OQ-C2 pattern).
   *
   * DETERMINISM: NO Math.random(). NO Date.now(). Seed = stable game-state derivation.
   * Sticky-accumulator: suspected_infiltration_level only increases (floor at 0, cap at 1).
   *
   * @param playerId   - the player's UUID
   * @param rivalKey   - the rival being targeted
   * @param isBluff    - whether this embed signal is a deliberate bluff
   * @param gameMinute - the in-game minute (from the caller context)
   */
  async plantEmbedSignal(
    playerId: string,
    rivalKey: RivalKey,
    isBluff: boolean,
    gameMinute: number,
  ): Promise<{
    infiltrationLevel: number;
    purgeActive: boolean;
    bluffDiscovered: boolean;
    draw: number | null;
  }> {
    const gameDay = Math.floor(gameMinute / 1440);

    // Resolve getter-sourced thresholds (composite bucket → ref float — no inline literals on the compute path).
    // Canon :140 / :141 / :143. [PROV-Y26Q2] refs.
    const infiltrationIncrease = resolveCompositeRef(
      this.tunables.purgeSuspicionIncreasePerSignalBucket,
      PURGE_SUSPICION_REF_MAP,
    );
    const purgeThreshold = resolveCompositeRef(
      this.tunables.purgeThresholdBucket,
      PURGE_THRESHOLD_REF_MAP,
    );
    const bluffDetectionThreshold = resolveCompositeRef(
      this.tunables.purgeBluffDetectionProbabilityPerTickBucket,
      PURGE_BLUFF_DETECTION_REF_MAP,
    );

    // Read current state (default if no row exists).
    const existing = await this.repo.readPurgeTrapState(playerId, rivalKey);
    const currentLevel       = existing?.suspected_infiltration_level ?? 0;
    const alreadyPurging     = existing?.internal_purge_active ?? false;
    const currentBluffActive = existing?.bluff_active ?? false;

    // Increase suspected infiltration level (getter-sourced — STANDARD ref = +0.15).
    const newLevel = Math.min(1, currentLevel + infiltrationIncrease);

    // Check purge threshold (getter-sourced — STANDARD ref = 0.55) — only trigger once (guard alreadyPurging).
    let purgeActive = alreadyPurging;
    if (newLevel >= purgeThreshold && !alreadyPurging) {
      purgeActive = true;
      this.logger.debug(
        `PurgeTrap.plantEmbedSignal: PURGE TRIGGERED player=${playerId} rival=${rivalKey} ` +
        `infiltrationLevel=${newLevel.toFixed(3)} threshold=${purgeThreshold}`,
      );
      // A's §3.1 seam: territory pressure, mounting magnitude (regime shift trigger).
      // PressureMagnitudeBucket = 'silent' | 'mounting' | 'crushing' — 'mounting' = medium.
      const pressureSource: PressureSource = 'territory';
      await this.regimeSwitching.recordPressure(playerId, rivalKey, pressureSource, 'mounting');
    }

    // Bluff path (OQ-C2 seeded draw).
    let bluffDiscovered = false;
    let draw: number | null = null;

    if (isBluff) {
      // OQ-C2: day-scoped seed for bluff-discovery.
      const seedPrefix = this.tunables.purgeBluffDiscoverySeedPrefix;
      const seed = `${seedPrefix}:${rivalKey}:${gameDay}`;
      draw = makeRng(seed).next();
      bluffDiscovered = draw < bluffDetectionThreshold;

      if (bluffDiscovered) {
        this.logger.debug(
          `PurgeTrap.plantEmbedSignal: BLUFF DISCOVERED player=${playerId} rival=${rivalKey} ` +
          `draw=${draw.toFixed(4)} threshold=${bluffDetectionThreshold}`,
        );
      }
    }

    // Write back purge_trap_state.
    await this.repo.upsertPurgeTrapState(playerId, rivalKey, {
      suspected_infiltration_level: newLevel,
      internal_purge_active:        purgeActive,
      bluff_active:                 isBluff ? true : currentBluffActive,
      bluff_discovered:             bluffDiscovered,
      last_updated_tick:            gameMinute,
    });

    return { infiltrationLevel: newLevel, purgeActive, bluffDiscovered, draw };
  }

  /**
   * `evalPurge` — the §4.4 orchestrator tick check (no-op if already purging).
   *
   * Called by the InformationWarfareOrchestratorService on each NIGHTLY tick.
   * In the current scope (C9): reads the state and logs if a purge is active.
   * The heavy purge-drain mechanic (purge_capacity_drain_per_tick_bucket) is
   * deferred to a future calibration pass (the TunablesStore getter exists at C2).
   *
   * L1 write-amplification: if no row exists (player never planted a signal), skip entirely.
   */
  async evalPurge(
    playerId: string,
    rivalKey: RivalKey,
    gameMinute: number,
  ): Promise<void> {
    const state = await this.repo.readPurgeTrapState(playerId, rivalKey);
    if (!state) {
      // No row — player has never planted a signal for this rival. No-op.
      return;
    }

    if (state.internal_purge_active) {
      // Purge is ongoing — future capacity-drain mechanic fires here (calibration TD).
      this.logger.debug(
        `PurgeTrap.evalPurge: purge ACTIVE player=${playerId} rival=${rivalKey} ` +
        `infiltration=${state.suspected_infiltration_level.toFixed(3)} tick=${gameMinute}`,
      );
    }
  }
}
