// IMPLEMENTS: docs/superpowers/plans/2026-07-13-p3-D-cue-annealing-plan.md §C7 ("GET /v1/annealing/
//             rolling-queue (settling bands + touchable ≥ min getter + Phase-11 lieutenants-settling as
//             BANDS, read-only)").
//             Design: docs/superpowers/specs/2026-07-13-p3-D-cue-annealing-design.md §10.3 ("Rolling
//             decision queue ... GET /v1/annealing/rolling-queue : {settling: [{building_ref, band,
//             initiating_change_type}], touchable: [building_ref…] (≥ min 3 tunable), lieutenants_settling:
//             [{lieutenant_ref, band}]} — la lecture UNIFIÉE des deux dimensions ; les lieutenants settling
//             Phase-11 sont projetés en bande depuis settling_until_tick (lecture seule, aucune écriture sur
//             la table lieutenant)") + §3.4 (D8 — coexistence disjointe, "l'unification est projective,
//             jamais persistée").
//             Canon: `annealing_window.md` "Hook return value (rolling decision queue)" ("Which nodes are
//             settling NOW. Which nodes are NOT settling (productively-touchable). Surfaces 'what I can do
//             right now' — NOT a wait screen.").
//             — P3-D C7 — 2026-07-15
//
// `AnnealingRollingQueueService` — the READ-ONLY projection composing THREE sources (never writing to
// ANY of them, D8/design §3.4 "aucune écriture sur la table lieutenant"):
//   - `AnnealingRepository.listActiveSettlingForPlayer` (Loop 7 building dimension, C7-new) → `settling`.
//   - `building_operational_state` (this player's operational buildings) MINUS the settling set →
//     `touchable` (canon: "the touchable list IS the main content, never a wait screen").
//   - `lieutenant.settling_until_tick` (Phase-11, READ directly off the schema table — mirrors the HL card
//     providers' own "import the schema table directly, never the sibling module's service/repository
//     class" convention, e.g. `mycelial-stressed-leg.provider.ts` importing `supplyChainLegRow` directly)
//     → `lieutenants_settling`, PROJECTED into the SAME qualitative band vocabulary as the building side
//     via the real-time sim ratio (★ C9 resolution below — see that block's own header for the cross-scale
//     game-minute → real-minute conversion and why, ratification pending decisions §6).

import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { buildingOperationalState } from '../../db/schema/operational_chain';
import { citySimClock } from '../../db/schema/city_sim_clock';
import { citySimTunables } from '../../citysim/citysim-tunables';
import { lieutenant } from '../../db/schema/lieutenant';
import { coreLoopsTunables } from '../core-loops-tunables';
import { AnnealingRepository } from './annealing.repository';
import { deriveSettlingBandBucket, type SettlingBandBucket } from './settling-band-bucket';

export interface RollingQueueRef {
  readonly kind: 'building' | 'lieutenant';
  readonly id: string;
}

export interface RollingQueueSettlingEntry {
  readonly building_ref: RollingQueueRef;
  readonly band: SettlingBandBucket;
  readonly initiating_change_type: string;
}

export interface RollingQueueLieutenantEntry {
  readonly lieutenant_ref: RollingQueueRef;
  readonly band: SettlingBandBucket;
}

export interface RollingQueueView {
  readonly settling: readonly RollingQueueSettlingEntry[];
  readonly touchable: readonly RollingQueueRef[];
  readonly lieutenants_settling: readonly RollingQueueLieutenantEntry[];
}

@Injectable()
export class AnnealingRollingQueueService {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly annealingRepo: AnnealingRepository,
  ) {}

  /**
   * The whole projection (design §10.3). THREE independent reads composed, zero write anywhere. Called by
   * `AnnealingController`'s `GET /v1/annealing/rolling-queue` (the player-facing route) — no `_test` bypass
   * needed (a plain read, Lesson #3's "zero live-vs-test divergence" concern only applies to VERBS with
   * side effects).
   */
  async getRollingQueue(playerId: string): Promise<RollingQueueView> {
    const [settlingRows, operationalBuildingIds, currentGameMinute] = await Promise.all([
      this.annealingRepo.listActiveSettlingForPlayer(playerId),
      this.listOperationalBuildingIds(playerId),
      this.getCurrentGameMinute(playerId),
    ]);

    const settlingBuildingIds = new Set(settlingRows.map((r) => r.building_id));
    const settling: RollingQueueSettlingEntry[] = settlingRows.map((r) => ({
      building_ref: { kind: 'building', id: r.building_id },
      band: deriveSettlingBandBucket(
        (new Date(r.settling_ends_at).getTime() - Date.now()) / 60_000,
        coreLoopsTunables.annealingBandShortUpperMinutes,
        coreLoopsTunables.annealingBandMediumUpperMinutes,
      ),
      initiating_change_type: (r.initiating_change as { change_type: string }).change_type,
    }));

    // `touchable` (canon: "which nodes are NOT settling (productively-touchable)" — "the touchable list IS
    // the main content, NEVER a wait screen"): every OPERATIONAL building minus the actively-settling set,
    // UNBOUNDED.
    //
    // ★ SURFACED JUDGMENT CALL (non-blocking): design §14/canon names `annealing_touchable_minimum_count`
    // (default 3) as "min nodes shown in rolling queue" — but neither the design's own §10.3 falsifiable
    // list nor the plan's C7 falsifiable list ever exercises a minimum-COUNT assertion (both only test
    // presence/absence + band-bucketing), and there is no secondary pool to pad `touchable` FROM without
    // fabricating buildings that do not exist. Read as the C8 BO `RollingDecisionQueueEffectivenessMonitor`
    // SFC's own diagnostic threshold (design §17 names that surface) rather than a v1 player-endpoint
    // truncation/padding mechanic — this endpoint returns the FULL non-settling set. Surfaced for C9
    // closeout (mirrors the "NON portés v1, none-silent" divergence convention, decisions §4).
    const touchable: RollingQueueRef[] = operationalBuildingIds
      .filter((id) => !settlingBuildingIds.has(id))
      .map((id) => ({ kind: 'building', id }));

    const settlingLieutenants = await this.listSettlingLieutenants(playerId, currentGameMinute);
    const lieutenantsSettling: RollingQueueLieutenantEntry[] = settlingLieutenants.map((r) => ({
      lieutenant_ref: { kind: 'lieutenant', id: r.lieutenantId },
      // ★ C9 RESOLUTION (C7 IMPORTANT finding, "bande lieutenant cross-échelle" — carried forward): Phase-11's
      // OWN settling clock runs in GAME-MINUTE ticks (`settling_until_tick` vs `city_sim_clock.game_minute`)
      // — a DIFFERENT scale from Loop 7's building settling (REAL-clock minutes, ruling #10). Design §3.4
      // mandates only a PROJECTIVE, read-only unification ("l'unification est projective, jamais persistée")
      // without specifying a cross-scale band FORMULA — the design is silent on the conversion itself. The
      // C7 landing compared the raw remaining-tick delta AS IF it were real minutes (an honest but incorrect
      // unitless comparison — game-minutes and real-minutes are NOT interchangeable). RESOLVED here via the
      // ONE conversion factor that already exists in this codebase for exactly this game-time↔real-time
      // translation (never invented, never a NEW tunable): `citySimTunables.realSecondsPerGameMinute` (the
      // master sim ratio every OTHER cross-clock comparison in the repo defers to, e.g.
      // `claims.service.ts`'s own "wall-clock diverges from game-time by the sim ratio" note). A
      // remaining-tick delta of `d` game-minutes is `d * realSecondsPerGameMinute / 60` REAL minutes —
      // THAT value (never the raw tick count) feeds the SAME `deriveSettlingBandBucket` cutpoints the
      // building side uses, keeping both dimensions genuinely commensurable at the ONE place they are
      // unified. Under the current tunable defaults (disrupt curve 2..8 ticks × 2s/game-minute), a
      // freshly-reassigned lieutenant's settling window is a few REAL SECONDS — it converts to a tiny
      // fraction of a real minute and therefore always lands in the `short` band (this is an HONEST
      // consequence of Phase-11's own short, anti-churn-only settling window vs Loop 7's 10-120-real-minute
      // one — not a bug in the conversion). ★ SURFACED for C9 closeout ratification (decisions §6, the
      // EstimatedTimeBucket-cutpoints precedent) — a genuine judgment call on WHICH conversion source to
      // trust, not a silently-invented one; falsifiable: `annealing_teeth.spec.ts` G1 "a Phase-11-reassigned
      // lieutenant appears in lieutenants_settling with a real-time-derived band, and disappears once its
      // game-minute window elapses" (end-to-end presence/band/exit; a band-DISCRIMINATING falsifier vs the
      // pre-conversion code would need a synthetic settling_until_tick seam — noted ⊥ C9, optional).
      band: deriveSettlingBandBucket(
        ((r.settlingUntilTick - currentGameMinute) * citySimTunables.realSecondsPerGameMinute) / 60,
        coreLoopsTunables.annealingBandShortUpperMinutes,
        coreLoopsTunables.annealingBandMediumUpperMinutes,
      ),
    }));

    return { settling, touchable, lieutenants_settling: lieutenantsSettling };
  }

  private async listOperationalBuildingIds(playerId: string): Promise<string[]> {
    const rows = await this.db
      .select({ building_id: buildingOperationalState.building_id })
      .from(buildingOperationalState)
      .where(eq(buildingOperationalState.player_id, playerId));
    return rows.map((r) => r.building_id);
  }

  private async getCurrentGameMinute(playerId: string): Promise<number> {
    const rows = await this.db
      .select({ game_minute: citySimClock.game_minute })
      .from(citySimClock)
      .where(eq(citySimClock.player_id, playerId))
      .limit(1);
    return rows[0]?.game_minute ?? 0;
  }

  /** Phase-11 lieutenants CURRENTLY settling (`settling_until_tick > currentGameMinute`) — a plain READ
   *  against the schema table directly (no `LieutenantRepository`/`LieutenantModule` import, D8 "aucune
   *  écriture" + the HL-card-provider "schema table directly" convention). */
  private async listSettlingLieutenants(
    playerId: string,
    currentGameMinute: number,
  ): Promise<Array<{ lieutenantId: string; settlingUntilTick: number }>> {
    const rows = await this.db
      .select({ lieutenant_id: lieutenant.lieutenant_id, settling_until_tick: lieutenant.settling_until_tick })
      .from(lieutenant)
      .where(
        sql`${lieutenant.player_id} = ${playerId}::uuid AND ${lieutenant.settling_until_tick} IS NOT NULL
            AND ${lieutenant.settling_until_tick} > ${currentGameMinute}`,
      );
    return rows
      .filter((r): r is { lieutenant_id: string; settling_until_tick: number } => r.settling_until_tick !== null)
      .map((r) => ({ lieutenantId: r.lieutenant_id, settlingUntilTick: r.settling_until_tick }));
  }
}
