// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-A-rival-foundation-plan.md Task 3 (C3)
//             Design: docs/superpowers/specs/2026-06-24-04b-A-rival-foundation-design.md §3.7
//             Canon: docs/tech/04b_combat_and_conflict/rival_ai_mechanics.md :326-370, :342-344
//             — Rival AI Foundation C3 — 2026-06-24 —
//
// `ReconnaissanceRegimeClassifierService` — §3.7 the PULL/PUSH intel-mode classifier.
//
// Mechanics (canonical):
//   getIntelMode: returns the current intel_mode for the rival (SERVER-SIDE ONLY — P6, §13 C-method).
//   setIntelMode: force-sets the intel_mode (the BO force-path + test controller path).
//   applyDisinformation: lands iff intel_mode='pull'; filtered iff 'push'.
//     FALSIFIABLE both-ways: Coil (PULL) landed=true; Tarcum (PUSH) landed=false.
//   Mode-flip on evidence accumulation: triggered by the 12h sweep in RivalTickService.
//
// Per-rival defaults (canon :342-344):
//   Coil      = 'pull' (adapts to new info)
//   Tarcum    = 'push' (confirms existing decisions)
//   Iron Throat = 'push' (then 'pull' on Glass-specific signals — not yet implemented at A)
//   Saltline  = [PROV-Y26Q2] = 'push' (from saltlineIntelMode getter)
//
// C4 (determinism): NO Math.random(), NO Date.now().
// P6 / R2.2: getIntelMode is SERVER-SIDE only — no player route returns intel_mode.
// Anti-fabrication: mode-flip threshold from intelModeSwitchThresholdPerRivalBucket getter.

import { Injectable, Logger } from '@nestjs/common';
import { RivalAiTunables } from './rival-ai.tunables';
import { RivalStateRepository } from './rival-state.repository';
import type { RivalKey, IntelMode } from './rival-ai.types';

/** Disinformation magnitude bucket (C-mechanic input from lot C info-warfare). */
export type DisinfoBucket = 'low' | 'medium' | 'high';

/** Result of applyDisinformation: whether the disinfo landed on the rival's decision-making. */
export interface DisinformationResult {
  /** True iff intel_mode='pull' (the rival re-planned based on the injected false data). */
  readonly landed: boolean;
  /** The rival's current intel_mode at the time of the apply attempt. */
  readonly intelMode: IntelMode;
}

@Injectable()
export class ReconnaissanceRegimeClassifierService {
  private readonly logger = new Logger(ReconnaissanceRegimeClassifierService.name);

  constructor(
    private readonly rivalStateRepo: RivalStateRepository,
    private readonly tunables: RivalAiTunables,
  ) {}

  /**
   * `getIntelMode` — the §13 C-method (SERVER-SIDE ONLY — P6).
   *
   * Returns the rival's current intel_mode ('pull' | 'push'). This is the signal the C info-warfare
   * layer reads to decide whether a Mirrored Memory / Dual-Use disinfo attack lands or is filtered.
   * NEVER exposed to the player (no player route returns intel_mode — P6 invariant checked at Step 7 gate).
   *
   * Returns null if no rival_state row exists for the player × rival.
   */
  async getIntelMode(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<IntelMode | null> {
    const row = await this.rivalStateRepo.readRivalState(playerId, rivalKey);
    return row?.intel_mode ?? null;
  }

  /**
   * `setIntelMode` — the BO force-path + test-controller path.
   *
   * Force-sets the rival's intel_mode and resets mode_stability_ticks to 0. Used by:
   *   - The BO admin force-path (C9 endpoint — F3-deferred).
   *   - The test controller POST /v1/_test/rival/set-intel-mode route (C3 spec).
   * C4: deterministic (no RNG). NO Math.random. NO Date.now.
   */
  async setIntelMode(
    playerId: string,
    rivalKey: RivalKey,
    intelMode: IntelMode,
  ): Promise<void> {
    const row = await this.rivalStateRepo.readRivalState(playerId, rivalKey);
    if (!row) {
      this.logger.warn(
        `ReconClassifier.setIntelMode: no rival_state row for player=${playerId} rival=${rivalKey} — skip`,
      );
      return;
    }
    await this.rivalStateRepo.updateIntelMode(playerId, rivalKey, intelMode, 0);
  }

  /**
   * `applyDisinformation` — the §13 disinfo hook C calls (FALSIFIABLE both-ways).
   *
   * PULL rival (Coil) → landed=true (the rival re-plans based on the injected false data).
   * PUSH rival (Tarcum) → landed=false (the rival filters intel that contradicts the current plan).
   *
   * This is the core §3.7 property: the mode DETERMINES whether C's info-warfare attacks corrupt rival
   * decision-making OR are filtered out (rival_ai_mechanics.md :332, :362).
   *
   * C4: deterministic. The disinfoBucket is accepted for future calibration (C's mechanic picks the
   * magnitude) but at A, the landing is binary on mode — not magnitude-modulated. NO Math.random.
   *
   * Returns a DisinformationResult with landed + the current intelMode (the test spec reads both).
   */
  async applyDisinformation(
    playerId: string,
    rivalKey: RivalKey,
    disinfoBucket: DisinfoBucket,
  ): Promise<DisinformationResult> {
    const row = await this.rivalStateRepo.readRivalState(playerId, rivalKey);
    if (!row) {
      this.logger.warn(
        `ReconClassifier.applyDisinformation: no rival_state row for player=${playerId} rival=${rivalKey}`,
      );
      return { landed: false, intelMode: 'push' };
    }

    const intelMode = row.intel_mode;
    // PULL: the rival adapts to new info → disinformation lands.
    // PUSH: the rival confirms existing decisions → disinformation is filtered.
    // The disinfoBucket is logged for C calibration (not the landing gate at lot-A scope).
    const landed = intelMode === 'pull';

    this.logger.debug(
      `ReconClassifier.applyDisinformation: player=${playerId} rival=${rivalKey} ` +
      `mode=${intelMode} bucket=${disinfoBucket} → landed=${landed}`,
    );
    return { landed, intelMode };
  }

  /**
   * `runIntelModeFlip` — the 12h sweep intel-mode re-evaluation.
   *
   * Called by RivalTickService.runRegimeTick (the TWELVE_H sweep shares the same 12h cadence).
   * Increments mode_stability_ticks; if the rival has accumulated enough evidence (stability ticks >=
   * the switch threshold), the mode can flip. The threshold is getter-sourced (intelModeSwitchThresholdPerRivalBucket).
   *
   * At lot-A scope: the evidence accumulation is driven by the stability-tick counter only (the C-mechanic
   * that actively feeds evidence is deferred to lot C). The flip fires deterministically once the ticks
   * exceed the threshold-derived value. C4: no RNG, no Date.now.
   *
   * [PROV-Y26Q2] flip behavior: at lot A, mode stays stable (no evidence accumulation source yet —
   * the C-lot info-warfare mechanic seeds the accumulator). The tick increments mode_stability_ticks
   * without triggering a flip (the accumulator doesn't grow). This is the honest no-op for pre-C worlds.
   */
  async runIntelModeFlip(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<void> {
    const row = await this.rivalStateRepo.readRivalState(playerId, rivalKey);
    if (!row) return;

    // Increment stability ticks (the evidence-accumulation counter).
    const newStabilityTicks = row.mode_stability_ticks + 1;

    // The switch threshold is a composite getter (STANDARD = 0.7 ref, resolved as a string bucket).
    // At lot-A scope, the flip gate requires a numeric accumulator that lot-C fills. Pre-C: no flip.
    // We persist the incremented ticks (the accumulator grows) but do NOT flip (no C-evidence yet).
    // [PROV-Y26Q2]: lot-C will compare newStabilityTicks against the resolved composite ref float.
    await this.rivalStateRepo.updateIntelMode(playerId, rivalKey, row.intel_mode, newStabilityTicks);
  }
}
