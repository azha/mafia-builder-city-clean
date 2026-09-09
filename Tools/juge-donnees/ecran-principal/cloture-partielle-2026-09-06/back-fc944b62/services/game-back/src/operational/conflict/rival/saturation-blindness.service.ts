// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-A-rival-foundation-plan.md Task 4 (C4)
//             Design: docs/superpowers/specs/2026-06-24-04b-A-rival-foundation-design.md §3.3
//             Canon: docs/tech/04b_combat_and_conflict/rival_ai_mechanics.md :155-175
//             — Rival AI Foundation C4 — 2026-06-24 —
//
// `SaturationBlindnessService` — §3.3 the biphasic saturation_pressure register.
//
// Mechanics (canonical):
//   getCurrentBand: biphasic threshold compare on saturation_pressure.
//     silent    → pressure < saturationTrainedThreshold   (composite:STANDARD ref 0.3)
//     trained   → pressure >= 0.3 AND < saturationSuppressionThreshold (ref 1.4)
//     suppressed→ pressure >= 1.4
//     Thresholds sourced from getters → resolved via named STANDARD_REF constants (anti-fabrication).
//
//   incrementSaturation: adds a magnitude delta to saturation_pressure (the B write-hook).
//     'small'       → +SATURATION_INCREMENT_SMALL  (0.1 — 4 small → 0.4 → trained ✓)
//     'concentrated'→ +SATURATION_INCREMENT_CONCENTRATED (1.5 — 1 hit → 1.5 → suppressed ✓)
//     Both increments are local NAMED constants (not inline bare floats).
//     These are DELTA values, distinct from the threshold CUTS (anti-confusion: B ≠ cut).
//     Clamps result to [0, MAX_SATURATION] (2.0 — generous headroom above suppressed 1.4).
//
//   decayPassive: applies -saturationPassiveDecayRatePerTick (default 0.05) per decay tick.
//     The decay rate is getter-sourced (never inline). Floors at 0.
//
// Composite threshold resolution (same pattern as tempo-exposure.service.ts):
//   saturationTrainedThresholdBucket = 'composite:STANDARD' → SATURATION_TRAINED_STANDARD_REF (0.3)
//   saturationSuppressionThresholdBucket = 'composite:STANDARD' → SATURATION_SUPPRESSED_STANDARD_REF (1.4)
//   Named constants — no bare inline float in any compute path (gate constraint C4).
//
// C4 (determinism): NO Math.random(), NO Date.now().
// R2.2/P5: saturation_pressure is server-only. getCurrentBand returns a band string only.

import { Injectable, Logger } from '@nestjs/common';

import { RivalAiTunables } from './rival-ai.tunables';
import { RivalStateRepository } from './rival-state.repository';
import type { RivalKey } from './rival-ai.types';

// ── Composite threshold STANDARD REF constants ─────────────────────────────────────────────────
// canon: rival_ai_mechanics.md:459-460. Named constants — no bare inline float in compute paths.
// If the composite tier changes, update this constant + gdd/14 in the SAME commit (R9.3).
const SATURATION_TRAINED_STANDARD_REF   = 0.3;  // rival_ai_mechanics.md:459 — trained cut (composite:STANDARD)
const SATURATION_SUPPRESSED_STANDARD_REF = 1.4; // rival_ai_mechanics.md:460 — suppressed cut (composite:STANDARD)

// ── Act-magnitude INCREMENT deltas ────────────────────────────────────────────────────────────
// These are the DELTA steps (not cuts). Distinct from the CUTS above (B ≠ cut anti-confusion).
// Calibrated so: 4 × small (= 0.4) → trained (>= 0.3, < 1.4) ✓
//                1 × concentrated (= 1.5) → suppressed (>= 1.4) ✓
// [PROV-Y26Q2] — provisory. No tunable key registered at C4 (NEW tunables = NONE for this chunk).
// When B calibrates, these constants are updated here + gdd/14 in the same commit (R9.3).
const SATURATION_INCREMENT_SMALL        = 0.1;  // 4 × 0.1 = 0.4 → trained band ✓
const SATURATION_INCREMENT_CONCENTRATED = 1.5;  // 1 × 1.5 → suppressed band ✓

// ── Saturation clamp ceiling ───────────────────────────────────────────────────────────────────
// Generous headroom above suppressed_cut (1.4) — prevents unbounded growth with concentrated hits.
const MAX_SATURATION = 2.0;

/** The biphasic saturation band (§3.3). */
export type SaturationBand = 'silent' | 'trained' | 'suppressed';

/** Act-magnitude bucket for incrementSaturation (the B write-hook, §13). */
export type ActMagnitudeBucket = 'small' | 'concentrated';

@Injectable()
export class SaturationBlindnessService {
  private readonly logger = new Logger(SaturationBlindnessService.name);

  constructor(
    private readonly rivalStateRepo: RivalStateRepository,
    private readonly tunables: RivalAiTunables,
  ) {}

  /**
   * `getCurrentBand` — biphasic threshold compare on saturation_pressure.
   *
   * silent    → pressure < trainedThreshold (composite:STANDARD ref 0.3)
   * trained   → trainedThreshold <= pressure < suppressedThreshold (ref 1.4)
   * suppressed→ pressure >= suppressedThreshold (ref 1.4)
   *
   * Thresholds are sourced from getters + resolved via named STANDARD_REF constants.
   * Returns null if no rival row exists for this player × rival.
   * NO Math.random. NO Date.now.
   */
  async getCurrentBand(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<SaturationBand | null> {
    const row = await this.rivalStateRepo.readRivalState(playerId, rivalKey);
    if (!row) return null;

    const pressure = row.saturation_pressure;
    const trainedThreshold     = this.resolveTrainedThreshold();
    const suppressedThreshold  = this.resolveSuppressionThreshold();

    if (pressure >= suppressedThreshold) return 'suppressed';
    if (pressure >= trainedThreshold)    return 'trained';
    return 'silent';
  }

  /**
   * `incrementSaturation` — the §13 B write-hook.
   *
   * Adds the magnitude delta for the given actMagnitudeBucket to saturation_pressure.
   * Clamps result to [0, MAX_SATURATION].
   * Returns the NEW saturation_pressure value.
   * NO Math.random. NO Date.now.
   */
  async incrementSaturation(
    playerId: string,
    rivalKey: RivalKey,
    actMagnitudeBucket: ActMagnitudeBucket,
  ): Promise<number> {
    const row = await this.rivalStateRepo.readRivalState(playerId, rivalKey);
    if (!row) {
      this.logger.warn(
        `SaturationBlindness.incrementSaturation: no rival_state row for player=${playerId} rival=${rivalKey} — skip`,
      );
      return 0;
    }

    const delta = this.magnitudeDeltaForBucket(actMagnitudeBucket);
    const newPressure = Math.min(MAX_SATURATION, Math.max(0, row.saturation_pressure + delta));

    await this.rivalStateRepo.updateSaturation(playerId, rivalKey, newPressure);
    return newPressure;
  }

  /**
   * `getSaturationBand` — §13 B/C alias for getCurrentBand.
   *
   * The §13 contract names this method `getSaturationBand`; internally it reuses
   * the same threshold logic as `getCurrentBand` (the same method, aliased for
   * the stable cross-lot interface). Both names are public.
   *
   * Returns null if no rival_state row exists for this player × rival.
   * C4: NO Math.random. NO Date.now.
   */
  async getSaturationBand(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<SaturationBand | null> {
    return this.getCurrentBand(playerId, rivalKey);
  }

  /**
   * `decayPassive` — passive saturation decay per tick.
   *
   * Applies -saturationPassiveDecayRatePerTick (default 0.05) to saturation_pressure.
   * Floors at 0. The decay rate is getter-sourced (never inline).
   * Returns the NEW saturation_pressure value after decay.
   * NO Math.random. NO Date.now.
   */
  async decayPassive(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<number> {
    const row = await this.rivalStateRepo.readRivalState(playerId, rivalKey);
    if (!row) return 0;

    // Getter-sourced decay rate (default 0.05 — NEVER inline).
    const decayRate   = this.tunables.saturationPassiveDecayRatePerTick;
    const newPressure = Math.max(0, row.saturation_pressure - decayRate);

    await this.rivalStateRepo.updateSaturation(playerId, rivalKey, newPressure);
    return newPressure;
  }

  // ─── private helpers ──────────────────────────────────────────────────────────

  /**
   * Resolve the 'trained' saturation threshold from the composite bucket string.
   * 'composite:STANDARD' → SATURATION_TRAINED_STANDARD_REF (0.3).
   * Anti-fabrication: 0.3 never appears bare in any compute path — always via this helper.
   */
  private resolveTrainedThreshold(): number {
    const bucketStr = this.tunables.saturationTrainedThresholdBucket; // 'composite:STANDARD'
    if (bucketStr === 'composite:STANDARD') {
      return SATURATION_TRAINED_STANDARD_REF;
    }
    this.logger.warn(
      `SaturationBlindness: unknown trained threshold bucket '${bucketStr}' → falling back to STANDARD_REF`,
    );
    return SATURATION_TRAINED_STANDARD_REF;
  }

  /**
   * Resolve the 'suppressed' saturation threshold from the composite bucket string.
   * 'composite:STANDARD' → SATURATION_SUPPRESSED_STANDARD_REF (1.4).
   * Anti-fabrication: 1.4 never appears bare in any compute path — always via this helper.
   */
  private resolveSuppressionThreshold(): number {
    const bucketStr = this.tunables.saturationSuppressionThresholdBucket; // 'composite:STANDARD'
    if (bucketStr === 'composite:STANDARD') {
      return SATURATION_SUPPRESSED_STANDARD_REF;
    }
    this.logger.warn(
      `SaturationBlindness: unknown suppressed threshold bucket '${bucketStr}' → falling back to STANDARD_REF`,
    );
    return SATURATION_SUPPRESSED_STANDARD_REF;
  }

  /**
   * Map an act-magnitude bucket to its INCREMENT delta.
   * Anti-confusion: these are DELTA values (B), not threshold CUTS (the STANDARD_REF above).
   * Named constants — no bare inline float in this method.
   */
  private magnitudeDeltaForBucket(bucket: ActMagnitudeBucket): number {
    switch (bucket) {
      case 'small':        return SATURATION_INCREMENT_SMALL;
      case 'concentrated': return SATURATION_INCREMENT_CONCENTRATED;
    }
  }
}
