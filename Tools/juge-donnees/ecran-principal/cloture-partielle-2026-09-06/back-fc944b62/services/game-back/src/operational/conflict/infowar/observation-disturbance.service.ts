// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-C-diplomacy-infowar-plan.md Task 9 (C9)
//             Canon: docs/tech/04b_combat_and_conflict/information_warfare_mechanics.md §4.3
//             — Diplomacy & Information Warfare C C9 — 2026-06-26 —
//
// ObservationDisturbanceService — §4.3 Observation-Disturbance mechanic.
//
// runSurveillance(playerId, rivalKey, gameMinute):
//   - gameDay = Math.floor(gameMinute / 1440)
//   - seed = `${tunables.observationDetectionSeedPrefix}:${rivalKey}:${gameDay}`
//   - draw = makeRng(seed).next()
//   - threshold = 0.05 (composite:STANDARD ref from observationDetectionProbabilityPerTickBucket)
//   - Increment detection_probability += 0.01 (per-tick accrual)
//   - IF draw < 0.05 (DETECTED):
//     - Call recon.applyDisinformation(playerId, rivalKey, 'medium')
//     - Call adaptiveSkin.recordAttack(playerId, rivalKey, patternHash, gameMinute)
//     - IF disinfoResult.landed: call erosionRegister.degradeRegisterIntel(playerId, rivalKey, gameMinute)
//     - last_disinfo_landed = disinfoResult.landed
//   - Write surveillance_op row
//   - Return { detected, disinfoResult, draw, gameDay }
//
// The detection threshold is getter-sourced via observationDetectionProbabilityPerTickBucket → OBS_DETECTION_REF_MAP.
// composite:STANDARD resolves to 0.05 (the canon ref). Any DB override of the key retunes behavior.
// NO Math.random(). NO Date.now(). Deterministic.
//
// DD-P5-REALIZATION: disinfo lands iff rival intel_mode='pull' (via A's applyDisinformation).
// The test asserts: Coil PULL → landed=true; Tarcum PUSH → landed=false.

import { Injectable, Logger } from '@nestjs/common';

import { makeRng } from '../../../common/seeded-rng';
import { InfoWarTunables } from './infowar.tunables';
import { InformationWarfareRepository } from './infowar.repository';
import { ReconnaissanceRegimeClassifierService } from '../rival/reconnaissance-regime-classifier.service';
import { AdaptiveSkinService } from '../rival/adaptive-skin.service';
import { ErosionRegisterService } from '../combat/erosion-register.service';
import type { RivalKey } from '../rival/rival-ai.types';
import type { DisinformationResult } from '../rival/reconnaissance-regime-classifier.service';

// ── Composite bucket → ref float resolver ────────────────────────────────────────────────────────
// Pattern mirrors credibility-accumulator.service.ts (the C5 precedent for composite ref resolvers).
// The TunablesStore resolves composite:STANDARD/HIGH/LOW → the registered bucket string.
// We then translate that string to its ref float via the map below.

/** Translate a composite bucket string to its ref float. */
function resolveCompositeRef(bucketString: string, refMap: Record<string, number>): number {
  const key = bucketString.toLowerCase().trim();
  if (key in refMap) return refMap[key]!;
  const parsed = Number(bucketString);
  if (!Number.isNaN(parsed)) return parsed;
  return 0; // safe fallback — a misconfigured bucket becomes a no-op
}

// ── Ref-float maps ─────────────────────────────────────────────────────────────────────────────

// Ref floats for `info_warfare.observation_detection_probability_per_tick_bucket`.
// Canon :117 — composite:STANDARD → 0.05 (detection probability per tick at standard cadence).
// [PROV-Y26Q2] HIGH/LOW values are canon-proposed refs; calibration TD.
const OBS_DETECTION_REF_MAP: Record<string, number> = {
  'composite:standard': 0.05,
  'composite:high':     0.12,
  'composite:low':      0.02,
};

// DETECTION_PROBABILITY_ACCRUAL: canon-structural constant (no gdd/14 registry entry).
// This is intentionally NOT a balance lever — it is a fixed structural parameter of the
// observation model (1/5th of the STANDARD detection threshold, tracking exposure accumulation).
// Canon: information_warfare_mechanics.md §4.3.
// Calibration TD: if this becomes tunable, add a gdd/14 row + InfoWarTunables getter.
const DETECTION_PROBABILITY_ACCRUAL = 0.01;

// Attack pattern hash for adaptive-skin registration (stable per-mechanic identifier).
const OBSERVATION_PATTERN_HASH = 'observation_disturbance:surveillance';

// ─── Service ──────────────────────────────────────────────────────────────────────────────────────

@Injectable()
export class ObservationDisturbanceService {
  private readonly logger = new Logger(ObservationDisturbanceService.name);

  constructor(
    private readonly tunables: InfoWarTunables,
    private readonly repo: InformationWarfareRepository,
    private readonly recon: ReconnaissanceRegimeClassifierService,
    private readonly adaptiveSkin: AdaptiveSkinService,
    private readonly erosionRegister: ErosionRegisterService,
  ) {}

  /**
   * `runSurveillance` — the §4.3 Observation-Disturbance per-tick mechanic.
   *
   * Seeded draw (OQ-C2): seed = `${observationDetectionSeedPrefix}:${rivalKey}:${gameDay}`.
   * Each game-day produces one stable draw — the surveillance window is day-scoped.
   *
   * Detection path (draw < 0.05):
   *   1. applyDisinformation('medium') — the seam into A's §13 contract.
   *   2. recordAttack(...) — the seam into A's Adaptive Skin (§3.6).
   *   3. IF disinfo landed → degradeRegisterIntel — the C9 forward-slot lands.
   *
   * DD-P5-REALIZATION: landed = (rival intel_mode === 'pull').
   *   Coil (PULL) → landed=true; Tarcum (PUSH) → landed=false.
   *   The test spec asserts both directions.
   *
   * DETERMINISM: NO Math.random(). NO Date.now(). Seed = stable game-state derivation.
   *
   * @param playerId   - the player's UUID
   * @param rivalKey   - the rival being surveilled
   * @param gameMinute - the in-game minute (from scheduler context)
   */
  async runSurveillance(
    playerId: string,
    rivalKey: RivalKey,
    gameMinute: number,
  ): Promise<{
    detected: boolean;
    disinfoResult: DisinformationResult | null;
    draw: number;
    gameDay: number;
  }> {
    const gameDay = Math.floor(gameMinute / 1440);

    // OQ-C2: seeded draw — day-scoped (same day→same draw — the replay-safe contract).
    const seedPrefix = this.tunables.observationDetectionSeedPrefix;
    const seed = `${seedPrefix}:${rivalKey}:${gameDay}`;
    const draw = makeRng(seed).next();

    // Detection threshold: getter-sourced from composite bucket → ref float translator.
    // Canon :117 — composite:STANDARD → 0.05. [PROV-Y26Q2] ref.
    const detectionThreshold = resolveCompositeRef(
      this.tunables.observationDetectionProbabilityPerTickBucket,
      OBS_DETECTION_REF_MAP,
    );

    // Read current surveillance state (defaults if no row).
    const existing = await this.repo.readSurveillanceOp(playerId, rivalKey);
    const currentProb = existing?.detection_probability ?? 0;

    // Per-tick accrual (write-amplification: always accrues, even when not detected).
    const newDetectionProbability = Math.min(1, currentProb + DETECTION_PROBABILITY_ACCRUAL);

    const detected = draw < detectionThreshold;
    let disinfoResult: DisinformationResult | null = null;

    if (detected) {
      this.logger.debug(
        `ObservationDisturbance.runSurveillance: DETECTED player=${playerId} rival=${rivalKey} ` +
        `draw=${draw.toFixed(4)} threshold=${detectionThreshold} gameDay=${gameDay}`,
      );

      // 1. applyDisinformation — A's §13 seam (PULL → landed; PUSH → filtered).
      disinfoResult = await this.recon.applyDisinformation(playerId, rivalKey, 'medium');

      // 2. recordAttack — A's Adaptive Skin (§3.6) pattern-resistance accrual.
      await this.adaptiveSkin.recordAttack(
        playerId,
        rivalKey,
        OBSERVATION_PATTERN_HASH,
        gameMinute,
      );

      // 3. If disinfo landed → degrade INTEL erosion register (C9 forward-slot landing).
      if (disinfoResult.landed) {
        await this.erosionRegister.degradeRegisterIntel(playerId, rivalKey, gameMinute);
        this.logger.debug(
          `ObservationDisturbance.runSurveillance: disinfo landed → degradeRegisterIntel ` +
          `player=${playerId} rival=${rivalKey}`,
        );
      }
    }

    // Write surveillance_op row (always — the sticky-accumulator discipline).
    await this.repo.upsertSurveillanceOp(playerId, rivalKey, {
      active:                  true,
      detection_probability:   newDetectionProbability,
      last_detection_game_day: detected ? gameDay : (existing?.last_detection_game_day ?? 0),
      last_disinfo_landed:     detected ? (disinfoResult?.landed ?? false) : (existing?.last_disinfo_landed ?? false),
      last_updated_tick:       gameMinute,
    });

    return { detected, disinfoResult, draw, gameDay };
  }
}
