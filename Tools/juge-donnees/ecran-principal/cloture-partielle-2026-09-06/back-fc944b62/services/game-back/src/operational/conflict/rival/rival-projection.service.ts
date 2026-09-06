// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-A-rival-foundation-plan.md Task 8 (C8)
//             Design: docs/superpowers/specs/2026-06-24-04b-A-rival-foundation-design.md §5.1 DD-P6-WALL
//             Canon: rival_ai_mechanics.md:402 (toClientView strips ALL hidden fields)
//             Pattern: police_memory.projection.service.ts (R2.2 raw-scalar → closed-bucket projection)
//             — Rival AI Foundation C8 — 2026-06-24 —
//
// `RivalProjectionService` — DD-P6-WALL: the ONLY path from `RivalState` to the player client.
//
// P6 wall invariant (§5.1):
//   `toClientView(playerId, rivalKey)` reads the HIDDEN server-side `RivalState` scalars and derives
//   EXACTLY 5 player-facing closed bands / soft indicators. NO raw scalar, NO regime enum value,
//   NO intel_mode, NO resistance map, NO enforcement_pressure, NO flip_threshold EVER leaves this
//   service. The returned `RivalClientView` shape is the frozen projection contract B/C build on.
//
// The 5 player-facing fields (§5.1 table):
//   1. behavioralIndicator   — a soft indicator string (MANY-TO-ONE: multiple distinct hidden regimes
//                              can collide on the same value → non-invertible; player can't decode regime).
//   2. regimePressureBand    — from the 0-100 regime_pressure float vs the getter-sourced band cuts
//                              (regimeBandSilentMax=33, regimeBandMountingMax=66).
//   3. saturationBand        — from the 0.0-2.0 saturation_pressure float via SaturationBlindnessService.
//   4. routeIntegrityBand    — Coil only (DistributedHoldService.getRouteIntegrity); null for the 3 others.
//   5. trophicSuppression    — soft indicator via TrophicGapService.getTrophicSuppression; null if no pairs.
//
// The behavioralIndicator is MANY-TO-ONE (the anti-invertibility guarantee):
//   Derived from (regime-family × saturation-band × pressure-posture). The 6-regime enum collapses
//   to 3 posture families: 'expansive' (expansionary), 'consolidating' (consolidating + defensive),
//   'contracting' (bleeding + retrench + withdrawal). Combined with saturation-band (3 values) + pressure
//   posture (2 buckets: low=silent, high=mounting+crushing) → the indicator space has at most
//   3 × 3 × 2 = 18 cells, but the closed string set has only 5 members — ensuring many-to-one collision.
//
//   Example collision pair (the falsifiable P5 test): 'consolidating' + saturation 'silent' + pressure
//   'silent' → "holding reserve"; 'defensive' + saturation 'silent' + pressure 'silent' → "holding reserve".
//   These are DIFFERENT hidden regimes in the SAME posture family ('consolidating') that produce the
//   SAME indicator value — the player cannot invert. (expansionary → "coordinated", which DIFFERS.)
//
// Band cuts are GETTER-SOURCED (never inline):
//   regimePressureBand uses rivalAiTunables.regimeBandSilentMax and regimeBandMountingMax.
//   Saturation uses SaturationBlindnessService.getCurrentBand (getter-sourced internally via tunables).
//
// C4 (determinism): NO Math.random(). NO Date.now(). Pure function of DB state + tunables.
// R2.2: all raw scalar reads stay server-side; the returned RivalClientView has zero raw scalars.
// Zero-regression: PURELY ADDITIVE — reads from existing services; no live mechanic modified.

import { Injectable } from '@nestjs/common';

import { RivalAiTunables } from './rival-ai.tunables';
import { RivalStateRepository } from './rival-state.repository';
import { SaturationBlindnessService } from './saturation-blindness.service';
import { DistributedHoldService } from './distributed-hold.service';
import { TrophicGapService } from './trophic-gap.service';
import type { RivalKey, RivalRegime, RegimePressureBucket, RivalClientView } from './rival-ai.types';

// ── Regime-family collapse (the many-to-one coarsening) ───────────────────────
// 6 hidden regimes → 3 posture families. MULTIPLE regimes map to the same family,
// ensuring the behavioralIndicator is non-invertible from the family alone.
//
// 'expansive':    expansionary                  (growth / territorial push)
// 'consolidating': consolidating + defensive    (holding / fortifying)
// 'contracting':  bleeding + retrench + withdrawal (retreat / under pressure)
//
// This is the heart of the many-to-one guarantee: 'consolidating' and 'defensive' are DIFFERENT
// hidden regimes but the SAME posture family → the player cannot tell them apart from the indicator.
const REGIME_TO_POSTURE_FAMILY: Record<RivalRegime, 'expansive' | 'consolidating' | 'contracting'> = {
  expansionary: 'expansive',
  consolidating: 'consolidating',
  bleeding:      'contracting',
  defensive:     'consolidating',  // ← collides with 'consolidating' → same family, different regime
  retrench:      'contracting',
  withdrawal:    'contracting',
};

// ── Closed behavioral indicator set (5 members — §5.1 design table) ────────────
// Derived from (posture-family × saturation-band × pressure-posture). Always fewer than
// the 6×3×2=36 logical cells → guarantees many-to-one (non-invertible from regime alone).
//
// Indicator values (canon-anchored soft cues, rival_ai_mechanics.md:378):
//   "coordinated"   — low pressure, not saturated, expansive or consolidating (strong operational footing)
//   "holding reserve" — low pressure, not saturated, consolidating posture (conserving capacity)
//   "pressed"       — high pressure or saturation mounting (under strain)
//   "supply lines thin" — contracting family (retreating / bleeding)
//   "scattered"     — suppressed saturation (maximum degradation)
//
// The table below is many-to-one on the regime enum: both 'consolidating' and 'defensive' produce the
// same indicator given the same saturation-band + pressure-posture → the player cannot distinguish them.
type SatBand = 'silent' | 'trained' | 'suppressed';
type PressurePosture = 'low' | 'high';

function deriveIndicator(
  posture: 'expansive' | 'consolidating' | 'contracting',
  sat: SatBand,
  pressurePosture: PressurePosture,
): string {
  // Suppressed saturation always → 'scattered' regardless of regime or pressure.
  if (sat === 'suppressed') return 'scattered';
  // Contracting posture → 'supply lines thin' (the retreat signal).
  if (posture === 'contracting') return 'supply lines thin';
  // Saturated / trained under high pressure → 'pressed'.
  if (sat === 'trained' || pressurePosture === 'high') return 'pressed';
  // Low pressure, silent saturation: expansive → 'coordinated'; consolidating → 'holding reserve'.
  if (posture === 'expansive') return 'coordinated';
  return 'holding reserve'; // consolidating + defensive both land here at low pressure, silent sat
}

// ── RegimePressureBucket from the 0-100 float ──────────────────────────────────
// Band cuts are GETTER-SOURCED — no inline 33/66. Called with the live getter values.
function pressureToRegimeBand(
  pressure: number,
  silentMax: number,
  mountingMax: number,
): RegimePressureBucket {
  if (pressure <= silentMax)  return 'silent';
  if (pressure <= mountingMax) return 'mounting';
  return 'crushing';
}

@Injectable()
export class RivalProjectionService {
  constructor(
    private readonly rivalStateRepo: RivalStateRepository,
    private readonly tunables: RivalAiTunables,
    private readonly saturationSvc: SaturationBlindnessService,
    private readonly distributedHoldSvc: DistributedHoldService,
    private readonly trophicSvc: TrophicGapService,
  ) {}

  /**
   * `toClientView` — the ONLY path from `RivalState` to the player client.
   *
   * Reads the HIDDEN server-side scalars; derives the 5 closed player-facing bands.
   * STRIPS every hidden field — the returned object's keys are EXACTLY:
   *   behavioralIndicator, regimePressureBand, saturationBand, routeIntegrityBand, trophicSuppression.
   * NO `regime` enum, NO `regime_pressure` float, NO `saturation_pressure` float,
   * NO `intel_mode`, NO `attack_pattern_resistance` map, NO `enforcement_pressure`,
   * NO `flip_threshold`, NO raw tempo interval.
   *
   * C4: NO Math.random(). NO Date.now(). Pure function of DB state + tunables.
   * R2.2: zero raw scalar in the returned RivalClientView.
   */
  async toClientView(playerId: string, rivalKey: RivalKey): Promise<RivalClientView> {
    // ── Read the HIDDEN raw row (server-side only) ──────────────────────────────
    const row = await this.rivalStateRepo.readRivalState(playerId, rivalKey);

    // If no row exists, return the safe default (the wall holds even for absent rivals).
    if (!row) {
      return {
        behavioralIndicator: 'coordinated',
        regimePressureBand:  'silent',
        saturationBand:      'silent',
        routeIntegrityBand:  null,
        trophicSuppression:  null,
      };
    }

    // ── 1. regimePressureBand — from the 0-100 regime_pressure via getter-sourced cuts ──────────
    // Band cuts are from the tunables (OQ-A11, getter-sourced, NEVER inline 33/66).
    const silentMax   = this.tunables.regimeBandSilentMax;   // default 33
    const mountingMax = this.tunables.regimeBandMountingMax; // default 66
    const regimePressureBand = pressureToRegimeBand(row.regime_pressure, silentMax, mountingMax);

    // ── 2. saturationBand — reuse SaturationBlindnessService.getCurrentBand (C4 getter-sourced) ──
    const satBand = await this.saturationSvc.getCurrentBand(playerId, rivalKey) ?? 'silent';

    // ── 3. routeIntegrityBand — Coil only (null for the 3 non-Coil rivals) ───────────────────────
    const routeIntegrityBand = await this.distributedHoldSvc.getRouteIntegrity(playerId, rivalKey);

    // ── 4. trophicSuppression — soft indicator (never the enforcement_pressure raw float) ─────────
    const trophicRaw = await this.trophicSvc.getTrophicSuppression(playerId, rivalKey);
    // Convert to the RivalClientView trophicSuppression shape; if no pair → null.
    const trophicSuppression =
      trophicRaw.suppressedRival !== null
        ? {
            suppressedRival: trophicRaw.suppressedRival as RivalKey,
            indicator:       trophicRaw.indicator,
          }
        : null;

    // ── 5. behavioralIndicator — MANY-TO-ONE (non-invertible; regime enum NEVER in output) ────────
    // Collapse the 6-regime enum to 3 posture families, then combine with saturation + pressure
    // to derive a coarsened soft indicator. Multiple regimes map to the same indicator value.
    const postureFamily = REGIME_TO_POSTURE_FAMILY[row.regime];
    // Pressure posture: 'low' = silent band; 'high' = mounting or crushing.
    const pressurePosture: PressurePosture = regimePressureBand === 'silent' ? 'low' : 'high';
    const behavioralIndicator = deriveIndicator(postureFamily, satBand, pressurePosture);

    // ── Return ONLY the 5 closed bands — the P6 wall ─────────────────────────────────────────────
    // The object literal has EXACTLY the 5 RivalClientView keys. No hidden field escapes.
    return {
      behavioralIndicator,
      regimePressureBand,
      saturationBand: satBand,
      routeIntegrityBand,
      trophicSuppression,
    };
  }
}
