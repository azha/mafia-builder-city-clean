// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-C-diplomacy-infowar-plan.md Task 10 (C10)
//             Design: docs/superpowers/specs/2026-06-24-04b-C-diplomacy-infowar-design.md §11 DD-P5-REALIZATION
//             Canon: docs/tech/04b_combat_and_conflict/information_warfare_mechanics.md §4 (InfoWarClientView)
//             Pattern: services/game-back/src/operational/conflict/rival/rival-projection.service.ts (P6 wall mirror)
//             — Diplomacy & Information Warfare C C10 — 2026-06-26 —
//
// `InformationWarfareProjectionService` — DD-P5 info-warfare projection wall.
//
// The ONLY player-facing path from info-warfare state to the player client.
// Produces `toInfoWarClientView(playerId, rivalKey): Promise<InfoWarClientView>`.
//
// P5 wall invariant:
//   NO raw suspected_infiltration_level float, NO raw detection_probability float,
//   NO raw rival_interpretation_bias float, NO raw last_bpd_prior_mass float,
//   NO coil_corruption_applied boolean (server-only internal flag — player infers via 'low' band)
//   EVER leaves this service. The returned `InfoWarClientView` shape contains ONLY:
//     deadReckoningBelief      — the 6-component SideChannelSignatureComposite (all band strings;
//                                DELIBERATELY NOISY — not the true RivalState — DD-P5-REALIZATION).
//     suspectedInfiltrationBucket — bands the purge_trap_state.suspected_infiltration_level float.
//     surveillanceActive       — boolean from surveillance_op.active (not a scalar).
//     interpretationBadge      — ★ C11 carry: the closed-domain badge from dual_use_signal_state
//                                ('posture'|'preparation'|'ambiguous'; the underlying
//                                rival_interpretation_bias float stays server-only). null if no row.
//     rivalKey                 — the rival key (string identifier, not a scalar).
//
// ★ DD-P5-REALIZATION (the heart of the info-warfare P5 contract):
//   The `deadReckoningBelief` is a deliberately-noisy estimate of the rival's posture.
//   It is NOT the true RivalState (never reads rival_state directly).
//   The Dead Reckoning belief diverges from the truth when:
//     - Coil's deception corruption applies (coil_corruption_applied=true in DB, never exposed).
//     - The orchestrator's decay routine has stepped belief toward floor bands.
//     - Disinformation landed (PULL rival) and shifted the rival's decision.
//   The player INFERS; the player NEVER reads the rival's true regime/intel_mode/pressure.
//
// ★ suspectedInfiltrationBucket band derivation (PROV-Y26Q2 cuts):
//   purge_trap_state.suspected_infiltration_level grows from 0 by ~0.15 per signal.
//   purge_threshold = composite:STANDARD ref 0.55 (purge triggers when crossed).
//   Band cuts [PROV-Y26Q2]:
//     'silent':  level = 0                        (no infiltration detected)
//     'watchful': 0 < level < 0.40               (some presence, below alarmed floor)
//     'alarmed':  0.40 ≤ level < purge_threshold  (nearing purge — high suspicion)
//     'purging':  internal_purge_active = true     (purge triggered)
//
// Anti-fabrication: NO Math.random(). NO Date.now(). Pure function of DB state.
// R2.2 / P6: all raw scalars stripped. Only derived buckets + boolean.
// Zero-regression: PURELY ADDITIVE — reads from InformationWarfareRepository only; no writes.

import { Injectable } from '@nestjs/common';

import { InformationWarfareRepository } from './infowar.repository';
import type { RivalKey } from '../rival/rival-ai.types';
import type {
  InfoWarClientView,
  SuspectedInfiltrationBucket,
  SideChannelSignatureComposite,
  InterpretationBadge,
} from './infowar.types';

// ── PROV-Y26Q2 canon-structural constant for infiltration band cut ────────────────────────────────
// The 'alarmed' threshold: 0.40 (approaching the purge_threshold of 0.55).
// Not in the gdd/14 registry — canon-structural balance anchor, [PROV-Y26Q2].
// Each signal adds ~0.15 (purgeSuspicionIncreasePerSignalBucket composite:STANDARD ref 0.15).
// At 0.40, 2-3 signals are in (roughly 2.7 signals at STANDARD) → rival is 'alarmed'.
const INFILTRATION_ALARMED_THRESHOLD = 0.40; // [PROV-Y26Q2]

// ─────────────────────────────────────────────────────────────────────────────────────────────────

@Injectable()
export class InformationWarfareProjectionService {
  constructor(private readonly repo: InformationWarfareRepository) {}

  /**
   * `toInfoWarClientView` — the ONLY player-facing path from info-warfare state.
   *
   * Reads C9 mechanic state and strips all raw scalars. Returns only closed buckets
   * + a boolean. No raw float leaks.
   *
   * P5 guarantee: NO suspected_infiltration_level / detection_probability /
   *   rival_interpretation_bias / last_bpd_prior_mass / coil_corruption_applied
   *   EVER appears in the returned object. Enforced via grep-zero gate in C10.
   *
   * DD-P5-REALIZATION: the `deadReckoningBelief` is a NOISY ESTIMATE.
   *   It is derived from the infowar layer's belief updates (Dead Reckoning, §4.1).
   *   The true rival regime/intel_mode/pressure never leaks.
   *
   * C4 (determinism): NO Math.random(). NO Date.now(). Pure DB read.
   * Zero-regression: PURELY ADDITIVE — no writes.
   */
  async toInfoWarClientView(playerId: string, rivalKey: RivalKey): Promise<InfoWarClientView> {
    // ── deadReckoningBelief: read dead_reckoning_belief → map 6 band columns ─────────────────
    // The 6 band columns ARE the player's belief (already banded in the DB — never a raw float).
    // null if no belief row exists (player has never triggered a Dead-Reckoning update).
    // ★ coil_corruption_applied is NOT forwarded — it is a server-only internal flag.
    //   Its effect is visible ONLY via the 'operationalTempoBand' being 'low' (the corruption floor).
    const beliefRow = await this.repo.readBelief(playerId, rivalKey);
    const deadReckoningBelief: SideChannelSignatureComposite | null = beliefRow
      ? {
          operationalTempoBand:
            beliefRow.operational_tempo_band as SideChannelSignatureComposite['operationalTempoBand'],
          resourceMobilizationBand:
            beliefRow.resource_mobilization_band as SideChannelSignatureComposite['resourceMobilizationBand'],
          personnelConcentrationBand:
            beliefRow.personnel_concentration_band as SideChannelSignatureComposite['personnelConcentrationBand'],
          communicationPatternBand:
            beliefRow.communication_pattern_band as SideChannelSignatureComposite['communicationPatternBand'],
          territorialReachBand:
            beliefRow.territorial_reach_band as SideChannelSignatureComposite['territorialReachBand'],
          logisticsIntensityBand:
            beliefRow.logistics_intensity_band as SideChannelSignatureComposite['logisticsIntensityBand'],
        }
      : null;

    // ── suspectedInfiltrationBucket: read purge_trap_state → band ───────────────────────────
    // The raw suspected_infiltration_level float is SERVER-ONLY.
    // internal_purge_active overrides to 'purging' (the trigger state).
    const purgeRow          = await this.repo.readPurgeTrapState(playerId, rivalKey);
    const infiltrationLevel = purgeRow?.suspected_infiltration_level ?? 0;
    const purgeActive       = purgeRow?.internal_purge_active ?? false;
    const suspectedInfiltrationBucket = this.bandInfiltration(infiltrationLevel, purgeActive);

    // ── surveillanceActive: read surveillance_op.active (boolean — not a scalar) ────────────
    // The raw detection_probability float is SERVER-ONLY. The player sees only the boolean flag.
    const survRow         = await this.repo.readSurveillanceOp(playerId, rivalKey);
    const surveillanceActive = survRow?.active ?? false;

    // ── interpretationBadge (★ C11 carry — the omitted C10 field): read interpretation_badge ─
    // dual_use_signal_state.interpretation_badge is already a closed-domain string
    // ('posture' | 'preparation' | 'ambiguous') — P5-safe (the underlying
    // rival_interpretation_bias float stays hidden and is never forwarded).
    // null if no Dual-Use state has been recorded for this rival yet.
    const dualUseRow = await this.repo.readDualUseState(playerId, rivalKey);
    const interpretationBadge: InterpretationBadge | null =
      dualUseRow ? (dualUseRow.interpretation_badge as InterpretationBadge) : null;

    return {
      rivalKey,
      deadReckoningBelief,
      suspectedInfiltrationBucket,
      surveillanceActive,
      interpretationBadge,
    };
  }

  // ── Private band function (PROV-Y26Q2 cuts — not balance levers, not in gdd/14 registry) ────

  /**
   * Band the suspected_infiltration_level + internal_purge_active to SuspectedInfiltrationBucket.
   * Cuts [PROV-Y26Q2]:
   *   'purging':  internal_purge_active = true     (embed presence disrupted — triggered state)
   *   'alarmed':  level ≥ 0.40                     (approaching purge threshold of ~0.55)
   *   'watchful': 0 < level < 0.40                 (some embed presence, not yet alarming)
   *   'silent':   level = 0                        (no infiltration detected)
   */
  private bandInfiltration(level: number, purgeActive: boolean): SuspectedInfiltrationBucket {
    if (purgeActive)                          return 'purging';
    if (level >= INFILTRATION_ALARMED_THRESHOLD) return 'alarmed';
    if (level > 0)                            return 'watchful';
    return 'silent';
  }
}
