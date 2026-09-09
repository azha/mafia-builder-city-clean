// IMPLEMENTS: docs/superpowers/specs/2026-06-06-phase-03-grow-house-design.md §4-T7 (the player-facing grow projections —
//             grow_stage_band + husbandry_band + tend_due; the building's raid-risk band is REUSED from vector #1, not
//             re-derived) + §9 (R2.2 — qualitative bands only, no raw grams/tick/tend_count/heat to the client) +
//             projects/mafia_city_game/gdd/14_tunable_constants.md §Phase-3 vector #3 (grow_house) T0 (grow.stage_count /
//             grow.withered_max_tends — the husbandry trajectory cut-points, R2.3 via GrowYieldService) +
//             docs/tech/01_pillars_and_vision/P5_information_asymmetry.md (R2.2 — no raw scalar to the client)
//             -- session:2026-06-06 (Phase 3 vector #3 — grow_house — Task 7) --
//
// `GrowProjectionService` — the PLAYER-FACING projection for an in-progress grow_session (the grow-house cultivation
// surface on the Building Card). Maps the RAW persisted grow_session fields (current_stage / tend_count / tended_in_stage)
// → a fully-QUALITATIVE payload. It NEVER forwards a raw scalar — no tend_count, no stage clock (started/
// stage_started_at_tick), no harvest grams, no heat float, no stage integer. R2.2 (inverted).
//
// THE BANDS (all closed qualitative domains — the only grow signal exposed):
//   - grow_stage_band: EARLY (stage_1) | MID (stage_2) | LATE (stage_3) | DONE (completed). A FIXED presentation
//     bucketing of the grow_stage enum (the SAME EARLY/MID/LATE vocabulary the cook_stage_band projection uses) — the
//     player sees the qualitative growth phase, NEVER a raw "stage 1 of 3" count.
//   - husbandry_band: WITHERED | ON_TRACK | THRIVING — the qualitative TRAJECTORY of the grow's husbandry, derived from
//     the recorded tend_count via the SAME GrowYieldService.yieldTier the harvest uses (R2.3 — REUSE, not re-derived):
//     the yield tier WITHERED → WITHERED (neglected — heading for the low yield), STANDARD → ON_TRACK (partial
//     husbandry — a middling yield), BUMPER → THRIVING (full husbandry — every stage tended, the top yield). It tells the
//     player how their crop is FARING without ever exposing the raw tend_count or the harvest grams. (A completed grow
//     shows the trajectory it FINISHED at — the band the harvest will / did realize.)
//   - tend_due: a boolean — whether the CURRENT stage is still un-tended (tended_in_stage IS DISTINCT FROM current_stage,
//     the SAME predicate the T4 tend guard uses). true ⇒ the player can/should tend NOW (a fresh stage, or a stage they
//     have not yet tended); false ⇒ already tended this stage (or the grow is completed — no tendable stage left). The
//     load-bearing "is there a tend action available" flag the client gates the tend button on. NOT a count — a flag.
//
// THE BUILDING'S RAID-RISK BAND (REUSE — vector #1): an active grow makes the grow_house HOT (T6) → its raid-risk band
// climbs. That band is ALREADY surfaced by the existing real-estate building projection (GET /v1/operational/building/:id
// → raid_risk, deriveRaidRiskBand) — T7 does NOT duplicate it here. The grow projection is grow_session-scoped (the grow
// lifecycle bands); the building card reads the raid-risk band off the SAME building endpoint the cook/storage cards use.
//
// R2.2 RAW-LEAK GUARANTEE: the payload contains ONLY closed-domain strings + a boolean + the grow_session uuid identity —
// NEVER tend_count, the stage clock ticks, the harvest grams, the raw heat float, or a stage integer. The E2E scans the
// payload recursively and rejects any unexpected raw scalar (the R2.2 gate). Read-only / additive — NO schema change (R9.3).

import { Injectable } from '@nestjs/common';

import { GrowRepository } from './grow.repository';
import { GrowYieldService, type GrowYieldTier } from './grow-yield.service';
import { growTunables } from './grow-tunables';

/** The qualitative grow-stage band (the only growth-phase signal exposed — never the raw stage clock / count; R2.2). */
export type GrowStageBand = 'EARLY' | 'MID' | 'LATE' | 'DONE';

/** The qualitative husbandry TRAJECTORY band (the tend_count → yield-tier trajectory as a band — never the raw count;
 *  R2.2). WITHERED (neglected — low yield) < ON_TRACK (partial — middling) < THRIVING (full husbandry — top yield). */
export type HusbandryBand = 'WITHERED' | 'ON_TRACK' | 'THRIVING';

/** The PLAYER-FACING grow-session projection (the grow-house cultivation surface — qualitative bands + a flag only). */
export interface GrowSessionProjection {
  /** The grow_session identity (a uuid string — echoed for the client's grow card; NOT a sim scalar). */
  grow_session: string;
  /** The qualitative grow-stage band (EARLY / MID / LATE / DONE — never the raw stage clock / count; R2.2). */
  grow_stage_band: GrowStageBand;
  /** The qualitative husbandry trajectory (WITHERED / ON_TRACK / THRIVING — the tend trajectory; never tend_count). */
  husbandry_band: HusbandryBand;
  /** Whether the CURRENT stage is still un-tended (a tend action is available now) — a flag, never a count; R2.2. */
  tend_due: boolean;
}

@Injectable()
export class GrowProjectionService {
  constructor(
    private readonly repo: GrowRepository,
    private readonly yieldService: GrowYieldService,
  ) {}

  /**
   * Project a player-owned grow_session → a fully-qualitative payload (R2.2 — bands + a flag only). Reads the
   * grow_session's projection-relevant raw fields (current_stage / tend_count / tended_in_stage are the INPUT but are
   * mapped to BANDS / a flag here — the raw tend_count / stage clock are NEVER forwarded). Returns null when the
   * grow_session is not the player's / does not exist (the controller maps that to a 404 — cross-player invisible, the
   * SAME player-scope guard the tend action uses). The building's raid-risk band is REUSED from the building projection
   * (GET /v1/operational/building/:id), not re-derived here.
   */
  async projectGrowSession(playerId: string, growSessionId: string): Promise<GrowSessionProjection | null> {
    const state = await this.repo.getGrowProjectionState(playerId, growSessionId);
    if (!state) return null;

    return {
      grow_session: state.grow_session_id,
      grow_stage_band: this.growStageBand(state.current_stage),
      // The husbandry trajectory band — derived from the recorded tend_count via the SAME GrowYieldService.yieldTier the
      // harvest uses (R2.3 — REUSE the gdd/14 cut-points, not re-derived). The raw tend_count is the INPUT, never escapes.
      husbandry_band: this.husbandryBand(state.tend_count),
      // tend_due — the CURRENT stage is un-tended (the SAME `tended_in_stage IS DISTINCT FROM current_stage` predicate the
      // T4 tend guard uses). A completed grow has no tendable stage → false (no current stage to tend).
      tend_due: this.tendDue(state.current_stage, state.tended_in_stage),
    };
  }

  /**
   * Map the raw grow_stage enum → the qualitative grow-stage band (R2.2). stage_1 → EARLY; stage_2 → MID; stage_3 →
   * LATE; completed → DONE. A FIXED presentation bucketing (the SAME EARLY/MID/LATE vocabulary the cook_stage_band uses)
   * — the player sees the growth PHASE, never a raw stage count. A defensive default of EARLY covers an unexpected value.
   */
  private growStageBand(currentStage: string): GrowStageBand {
    switch (currentStage) {
      case 'stage_2':
        return 'MID';
      case 'stage_3':
        return 'LATE';
      case 'completed':
        return 'DONE';
      // stage_1 (the plant default) and any defensive value → EARLY.
      default:
        return 'EARLY';
    }
  }

  /**
   * Map the recorded tend_count → the qualitative husbandry TRAJECTORY band (R2.2 — the raw count never escapes). The
   * trajectory is derived from the SAME pure GrowYieldService.yieldTier the harvest uses (R2.3 — REUSE the gdd/14
   * cut-points, NOT a fresh inline threshold): the yield tier the grow is CURRENTLY heading for (from its tend_count
   * vs grow.stage_count) maps to the player-facing trajectory band —
   *   - WITHERED tier → WITHERED band (neglect — heading for the low yield).
   *   - STANDARD tier → ON_TRACK band (partial husbandry — a middling yield).
   *   - BUMPER   tier → THRIVING band (full husbandry — every stage tended, the top yield).
   * It surfaces how the crop is FARING (the husbandry payoff trajectory) without ever exposing the raw tend_count or the
   * harvest grams. A completed grow shows the trajectory it FINISHED at (the band the harvest realized).
   */
  private husbandryBand(tendCount: number): HusbandryBand {
    const tier: GrowYieldTier = this.yieldService.yieldTier(tendCount, growTunables.stageCount);
    switch (tier) {
      case 'BUMPER':
        return 'THRIVING';
      case 'STANDARD':
        return 'ON_TRACK';
      // WITHERED (neglect) → the low-yield trajectory.
      default:
        return 'WITHERED';
    }
  }

  /**
   * Whether the CURRENT stage is still un-tended → a tend action is available (R2.2 — a boolean flag, never a count). The
   * SAME `tended_in_stage IS DISTINCT FROM current_stage` predicate the T4 tend guard enforces: tended_in_stage NULL
   * (a fresh stage — the GROW_ADVANCE tick clears it on each new stage) or a PREVIOUS stage → tend_due true; ==
   * current_stage → already tended this stage → false. A COMPLETED grow has no tendable stage left → false (no current
   * stage to tend; the harvest awaits, not a tend). The client gates the tend button on this flag.
   */
  private tendDue(currentStage: string, tendedInStage: string | null): boolean {
    if (currentStage === 'completed') return false; // a completed grow has no tendable stage — the harvest awaits.
    // IS DISTINCT FROM semantics: NULL (un-tended fresh stage) or a previous stage → un-tended → due. == current → false.
    return tendedInStage !== currentStage;
  }
}
