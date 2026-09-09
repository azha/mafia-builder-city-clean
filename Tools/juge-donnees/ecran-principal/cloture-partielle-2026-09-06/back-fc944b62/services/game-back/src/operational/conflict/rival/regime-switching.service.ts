// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-A-rival-foundation-plan.md Task 3 (C3)
//             Design: docs/superpowers/specs/2026-06-24-04b-A-rival-foundation-design.md §3.1
//             Canon: docs/tech/04b_combat_and_conflict/rival_ai_mechanics.md :56-107
//             — Rival AI Foundation C3 — 2026-06-24 —
//
// `RegimeSwitchingService` — §3.1 the foundational 6-regime state machine.
//
// Mechanics (canonical):
//   recomputeRegimePressure: 3-source weighted accrual (territory/casualty/revenue) + peaceful-decay
//     (-2/day = -1 per 12h sweep = per TWELVE_H tick). All weights from getters (NEVER inlined).
//   flipRegime: deterministic threshold compare vs flip_threshold (pressure >= threshold → flip); emits RegimeTransitionEvent.
//   getActiveDecisionPolicy: returns the regime→policy ref string (B/C reads this — §13).
//   recordPressure: B/C write-hook for injecting territory/casualty/revenue pressure inputs.
//
// DD-REGIME-PRESSURE-INPUTS (§3.1): 3 sources + peaceful-decay. Weights [PROV-Y26Q2] from
//   regimePressureWeight* getters. Per-source magnitude bucket → pressure delta (sealed enum).
//
// C4 (determinism): NO Math.random(), NO Date.now(). The flip is a deterministic >= compare against the
//   DB-stored flip_threshold — no tie-break RNG needed (>= is unambiguous; there is no tie to resolve).
// R2.2/P6: RegimeTransitionEvent carries NO regime label, NO raw pressure scalar.
// Anti-fabrication: every regime-threshold / pressure-weight magnitude is getter-sourced.
//   The composite 'STANDARD' flip_threshold resolves to 70 via the row's stored flip_threshold — NOT
//   re-inlined here (the row was seeded with 70 by RivalSeedService; this service reads it from the DB).

import { Injectable, Logger } from '@nestjs/common';
import { CityEventBus, RegimeTransitionEvent } from '../../../citysim/events/city-event-bus';
import { RivalAiTunables } from './rival-ai.tunables';
import { RivalStateRepository } from './rival-state.repository';
import type { RivalKey, RivalRegime, DecisionPolicyRef, RegimePressureBucket } from './rival-ai.types';

/**
 * Pressure magnitude buckets for the recordPressure write-hook (§13 — B/C call this).
 * 'silent': minimal pressure (small contribution).
 * 'mounting': moderate pressure (medium contribution).
 * 'crushing': maximal pressure (large contribution — past the flip threshold in 3 sources).
 * [PROV-Y26Q2] delta magnitudes: calibration TD. Deterministic (no RNG).
 */
export type PressureMagnitudeBucket = 'silent' | 'mounting' | 'crushing';


/** Pressure source discriminator (the 3 canonical inputs, §3.1). */
export type PressureSource = 'territory' | 'casualty' | 'revenue';

/** Regime → decision policy reference map. Server-side only (the §13 contract for B/C). */
const REGIME_DECISION_POLICY: Record<RivalRegime, DecisionPolicyRef> = {
  expansionary: 'policy_expansionary_v1',
  consolidating: 'policy_consolidating_v1',
  bleeding:      'policy_bleeding_v1',
  defensive:     'policy_defensive_v1',
  retrench:      'policy_retrench_v1',
  withdrawal:    'policy_withdrawal_v1',
};

/** The ordered regime cycle for a forced flip when threshold is crossed (6-regime machine). */
const REGIME_CYCLE: readonly RivalRegime[] = [
  'expansionary',
  'consolidating',
  'bleeding',
  'defensive',
  'retrench',
  'withdrawal',
] as const;

@Injectable()
export class RegimeSwitchingService {
  private readonly logger = new Logger(RegimeSwitchingService.name);

  constructor(
    private readonly rivalStateRepo: RivalStateRepository,
    private readonly tunables: RivalAiTunables,
    private readonly bus: CityEventBus,
  ) {}

  /**
   * `recordPressure` — the B/C write-hook (§13, DD-REGIME-PRESSURE-INPUTS).
   *
   * Accumulates a weighted pressure delta from one source onto the rival's regime_pressure.
   * The weight is sourced from the tunables getter (NEVER inlined). The magnitude is a closed
   * enum bucket (silent/mounting/crushing) — the delta mapping is [PROV-Y26Q2].
   *
   * B calls this when: a territory district is seized (source='territory'), a rival lieutenant
   * is removed (source='casualty'), or revenue degrades (source='revenue'). In A, the test
   * controller calls this directly to seed falsifiable pressure for the spec.
   *
   * C4: deterministic (no RNG). Write-amplification: WRITES on every call (pressure is sticky
   * until the TWELVE_H decay sweeps it; the B/C callers control the tempo).
   */
  async recordPressure(
    playerId: string,
    rivalKey: RivalKey,
    source: PressureSource,
    magnitudeBucket: PressureMagnitudeBucket,
  ): Promise<void> {
    const row = await this.rivalStateRepo.readRivalState(playerId, rivalKey);
    if (!row) {
      this.logger.warn(
        `RegimeSwitching.recordPressure: no rival_state row for player=${playerId} rival=${rivalKey} — skip`,
      );
      return;
    }

    // Source the correct weight getter (NEVER inline the float — anti-fabrication).
    const weight = this.sourceWeightForPressureSource(source);
    const delta  = this.magnitudeDeltaForBucket(magnitudeBucket) * weight;
    const newPressure = Math.min(100, Math.max(0, row.regime_pressure + delta));

    await this.rivalStateRepo.updateRegime(playerId, rivalKey, row.regime, newPressure, 0);
  }

  /**
   * `recomputeRegimePressure` — the TWELVE_H pressure recompute.
   *
   * At each 12-game-hour sweep: applies the peaceful-decay term (the regime_pressure_decay_rate_peaceful_per_day
   * getter, default -2/day, applied as half-decay since TWELVE_H = half a day). The 3-source inputs are
   * accumulated continuously via recordPressure; this sweep only applies the decay.
   *
   * Returns the new pressure value. Clamps to [0, 100].
   * gameMinute: the ctx.gameMinute from the scheduler tick (game-time, NOT Date.now()).
   * C4: deterministic. Getter-sourced. NO Math.random. NO Date.now.
   */
  async recomputeRegimePressure(
    playerId: string,
    rivalKey: RivalKey,
    gameMinute: number,
  ): Promise<number> {
    const row = await this.rivalStateRepo.readRivalState(playerId, rivalKey);
    if (!row) return 0;

    // Peaceful-decay: -2/day → at TWELVE_H = -1 per tick (half a day).
    // Source: regimePressureDecayRatePeacefulPerDay getter (default -2, range 0..-5, NEGATIVE = decay).
    // Divide by 2 because this tick fires every 12h (= half a day).
    const decayPerDay = this.tunables.regimePressureDecayRatePeacefulPerDay; // e.g. -2
    const decayThisTick = decayPerDay / 2; // e.g. -1 per TWELVE_H sweep
    const newPressure = Math.min(100, Math.max(0, row.regime_pressure + decayThisTick));

    await this.rivalStateRepo.updateRegime(playerId, rivalKey, row.regime, newPressure, gameMinute);
    return newPressure;
  }

  /**
   * `flipRegime` — deterministic threshold compare + RegimeTransitionEvent emit.
   *
   * Reads the current regime_pressure and flip_threshold from the DB row. If pressure >= flip_threshold,
   * the regime advances to the next in the 6-cycle. Emits RegimeTransitionEvent (NO regime label,
   * NO raw pressure in payload — P6/R2.2). Returns whether a flip occurred.
   *
   * The flip is a deterministic >= compare — `pressure >= threshold`. There is no boundary ambiguity
   * (>= is unambiguous: equal means flip). No RNG of any kind is used or needed.
   *
   * gameMinute: ctx.gameMinute (GAME-TIME, NOT wall-clock / Date.now()).
   * C4: NO makeRng, NO Math.random, NO Date.now.
   */
  async flipRegime(
    playerId: string,
    rivalKey: RivalKey,
    gameMinute: number,
  ): Promise<boolean> {
    const row = await this.rivalStateRepo.readRivalState(playerId, rivalKey);
    if (!row) return false;

    const pressure      = row.regime_pressure;
    const threshold     = row.flip_threshold; // read from DB (seeded as 70 — composite STANDARD ref float)
    const shouldFlip    = pressure >= threshold;

    if (!shouldFlip) return false;

    // Advance regime to the next in the 6-cycle (deterministic).
    const currentIdx  = REGIME_CYCLE.indexOf(row.regime);
    const nextIdx     = (currentIdx + 1) % REGIME_CYCLE.length;
    const newRegime   = REGIME_CYCLE[nextIdx]!;

    // After a flip, pressure resets toward 0 (the regime-transition resets the pressure context).
    const pressureAfterFlip = 0;
    await this.rivalStateRepo.updateRegime(playerId, rivalKey, newRegime, pressureAfterFlip, gameMinute);

    // Emit RegimeTransitionEvent — qualitative only, NO regime label, NO raw pressure (P6/R2.2).
    const event: RegimeTransitionEvent = {
      type:        'regime_transition',
      playerId,
      rivalKey,
      gameMinute,
    };
    this.bus.emitRegimeTransition(event);

    this.logger.log(
      `RegimeSwitching.flipRegime: player=${playerId} rival=${rivalKey} regime=${row.regime}→${newRegime} ` +
      `at gm=${gameMinute} (pressure was ${pressure.toFixed(1)} >= threshold ${threshold.toFixed(1)})`,
    );
    return true;
  }

  /**
   * `getActiveDecisionPolicy` — the §13 signal B/C mechanics read.
   *
   * Returns the DecisionPolicyRef for the rival's current regime. Server-side only (NEVER exposed to client).
   * The regime is read from the DB row. The policy map is a fixed enum→ref string (no RNG, no DB write).
   */
  async getActiveDecisionPolicy(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<DecisionPolicyRef | null> {
    const row = await this.rivalStateRepo.readRivalState(playerId, rivalKey);
    if (!row) return null;
    return REGIME_DECISION_POLICY[row.regime] ?? null;
  }

  /**
   * `getRegimePressureBand` — the §13 read method B/C consume (band, NOT raw float).
   *
   * Returns the RegimePressureBucket for the rival's current regime_pressure.
   * Band cuts are getter-sourced (regimeBandSilentMax / regimeBandMountingMax).
   * P6-safe: returns a closed bucket string, never the raw regime_pressure float.
   * Returns null if no rival_state row exists for this player × rival.
   * C4: NO Math.random. NO Date.now.
   */
  async getRegimePressureBand(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<RegimePressureBucket | null> {
    const row = await this.rivalStateRepo.readRivalState(playerId, rivalKey);
    if (!row) return null;
    const silentMax   = this.tunables.regimeBandSilentMax;   // default 33
    const mountingMax = this.tunables.regimeBandMountingMax; // default 66
    if (row.regime_pressure <= silentMax)   return 'silent';
    if (row.regime_pressure <= mountingMax) return 'mounting';
    return 'crushing';
  }

  // ─── private helpers ──────────────────────────────────────────────────────────

  /**
   * Source the weight getter for the given pressure source.
   * Anti-fabrication: all 3 weight getters are from RivalAiTunables — NO inline float.
   * The getter names: regimePressureWeightTerritory / regimePressureWeightCasualty / regimePressureWeightRevenue.
   */
  private sourceWeightForPressureSource(source: PressureSource): number {
    switch (source) {
      case 'territory': return this.tunables.regimePressureWeightTerritory;
      case 'casualty':  return this.tunables.regimePressureWeightCasualty;
      case 'revenue':   return this.tunables.regimePressureWeightRevenue;
    }
  }

  /**
   * Map a magnitude bucket to its registry-sourced pressure delta.
   * Anti-fabrication: all 3 delta getters are from RivalAiTunables — NO inline float.
   * DD-REGIME-PRESSURE-MAGNITUDE (§3.1): these are INPUT deltas (accrual step), distinct
   * from the OUTPUT band-cut getters (regimeBandSilentMax / regimeBandMountingMax).
   */
  private magnitudeDeltaForBucket(bucket: PressureMagnitudeBucket): number {
    switch (bucket) {
      case 'silent':   return this.tunables.regimePressureMagnitudeDeltaSilent;
      case 'mounting': return this.tunables.regimePressureMagnitudeDeltaMounting;
      case 'crushing': return this.tunables.regimePressureMagnitudeDeltaCrushing;
    }
  }
}
