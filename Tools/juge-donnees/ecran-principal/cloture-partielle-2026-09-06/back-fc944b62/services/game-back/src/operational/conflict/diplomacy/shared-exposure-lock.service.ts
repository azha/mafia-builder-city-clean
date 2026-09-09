// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-C-diplomacy-infowar-plan.md Task 7 (C7) Step 3
//             Design: docs/superpowers/specs/2026-06-24-04b-C-diplomacy-infowar-design.md §3.5
//             Canon: docs/tech/04b_combat_and_conflict/diplomacy_mechanics.md §4.5 (Shared Exposure Lock)
//             — Diplomacy & Information Warfare C C7 — 2026-06-26 —
//
// `SharedExposureLockService` — §4.5 Shared Exposure Lock — BPD-coupled mutual deterrence.
//
// Purpose:
//   When both the player and a rival are visible to the BPD in the same district
//   (both above the shared-attention threshold), mutual restraint becomes auto-enforcing.
//   The auto-truce is derived from the live BPD reads via getPrecinctBeliefRaw.
//
// Method:
//   recomputeAutoTruce(district, playerId, rivalKey, playerBPDAttention, rivalBPDAttention)
//     — Compares both BPD attention values to the shared_exposure_threshold (getter-sourced).
//     — If BOTH above threshold → mutual_exposure_flag = true + auto_truce_active = true.
//     — Persists the result to shared_exposure_lock table.
//     — Returns { autoTruceActive, mutualExposureFlag }.
//
// ★ READ-ONLY on BPD (the hard invariant):
//   recomputeAutoTruce READS attention values (passed in from caller who called getPrecinctBeliefRaw)
//   and writes to the C-OWNED `shared_exposure_lock` table.
//   NEVER writes to the player's suspicion_map (the 9b DIV-E1 anti-exploit boundary).
//   NEVER calls appendDeclarationEntry (no BPD write from Shared Exposure — DIV-C3).
//   The flag lives in the C-owned `shared_exposure_lock` table, not in the BPD.
//
// ★ DD-SHARED-EXPOSURE-BPD:
//   Shared Exposure READS the live BPD `suspicion_map` per district (the shared attention).
//   The actual getPrecinctBeliefRaw call is done by the caller / the daily tick (C9).
//   In C7, the _test route passes the BPD attention values directly to keep the route thin.
//
// Shared attention threshold: composite:STANDARD ref 0.55 (getter-sourced).
//
// C4 (determinism): NO Math.random(). NO Date.now().
//   The auto-truce recompute is a deterministic threshold compare on the BPD read.
// R2.3: all thresholds getter-sourced (sharedExposureThresholdBucket → composite:STANDARD ref 0.55).

import { Injectable, Inject } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import type { DrizzleClient } from '../../../db';
import { DB } from '../../../db/db.module';
import { sharedExposureLock } from '../../../db/schema/conflict_diplomacy';
import type { RivalKey } from '../rival/rival-ai.types';
import { DiplomacyTunables } from './diplomacy.tunables';

// ── Composite ref-float map ──────────────────────────────────────────────────────────────────────

/** Ref floats for shared_exposure_threshold_bucket. */
const SHARED_THRESHOLD_REF_MAP: Record<string, number> = {
  'composite:standard': 0.55,
  'composite:high':     0.80,
  'composite:low':      0.30,
};

/** Resolve a composite bucket string to its ref float. */
function resolveCompositeRef(bucketString: string, refMap: Record<string, number>): number {
  const key = bucketString.toLowerCase().trim();
  if (key in refMap) return refMap[key]!;
  const parsed = Number(bucketString);
  if (!Number.isNaN(parsed)) return parsed;
  return 0;
}

// ── Service ───────────────────────────────────────────────────────────────────────────────────────

@Injectable()
export class SharedExposureLockService {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly tunables: DiplomacyTunables,
  ) {}

  /**
   * `recomputeAutoTruce` — recompute the auto-truce for a district.
   *
   * Steps:
   * 1. Read the shared-attention threshold (getter-sourced, composite:STANDARD ref 0.55).
   * 2. Compare both BPD attention values to the threshold.
   * 3. mutual_exposure_flag = BOTH above threshold.
   * 4. auto_truce_active = mutual_exposure_flag.
   * 5. Persist to shared_exposure_lock (UPSERT by player_id × rival_key × district_id).
   * 6. Return { autoTruceActive, mutualExposureFlag }.
   *
   * ★ READ-ONLY on BPD: no write to suspicion_map, no appendDeclarationEntry call.
   *   The flag lives in the C-owned shared_exposure_lock table ONLY.
   *
   * @param districtId  — the district soft-ref (int, no FK to districts — the 9b discipline).
   * @param playerId    — the player UUID.
   * @param rivalKey    — the rival key.
   * @param playerBPDAttention — the player's BPD totalMass in this district (from getPrecinctBeliefRaw).
   * @param rivalBPDAttention  — the rival's BPD totalMass in this district (from getPrecinctBeliefRaw).
   *
   * C4: NO Math.random(). NO Date.now(). Pure threshold compare.
   * R2.3: threshold getter-sourced (sharedExposureThresholdBucket — never inline).
   */
  async recomputeAutoTruce(
    districtId: number,
    playerId: string,
    rivalKey: RivalKey,
    playerBPDAttention: number,
    rivalBPDAttention: number,
  ): Promise<{ autoTruceActive: boolean; mutualExposureFlag: boolean }> {
    // 1. Shared-attention threshold (getter-sourced — NOT inline scalar).
    const thresholdBucket = this.tunables.sharedExposureThresholdBucket;
    const threshold = resolveCompositeRef(thresholdBucket, SHARED_THRESHOLD_REF_MAP);

    // 2. Compare both attention values to the threshold.
    //    ★ READ-ONLY: these values come from getPrecinctBeliefRaw (the caller's read).
    //    Shared Exposure never writes to the BPD.
    const playerAbove = playerBPDAttention >= threshold;
    const rivalAbove  = rivalBPDAttention >= threshold;

    // 3. Mutual exposure: BOTH must be above threshold.
    const mutualExposureFlag = playerAbove && rivalAbove;

    // 4. Auto-truce: derived directly from mutual_exposure_flag.
    const autoTruceActive = mutualExposureFlag;

    // 5. Persist to shared_exposure_lock (C-owned table — NOT the BPD).
    //    UPSERT by (player_id, rival_key, district_id).
    //    The shared_bpd_attention column stores the player's own attention (the input).
    await this.db
      .insert(sharedExposureLock)
      .values({
        player_id:            playerId,
        rival_key:            rivalKey,
        district_id:          districtId,
        shared_bpd_attention: playerBPDAttention,
        mutual_exposure_flag: mutualExposureFlag,
        auto_truce_active:    autoTruceActive,
      })
      .onConflictDoUpdate({
        target: [
          sharedExposureLock.player_id,
          sharedExposureLock.rival_key,
          sharedExposureLock.district_id,
        ],
        set: {
          shared_bpd_attention: playerBPDAttention,
          mutual_exposure_flag: mutualExposureFlag,
          auto_truce_active:    autoTruceActive,
        },
      });

    // 6. Return the derived state.
    return { autoTruceActive, mutualExposureFlag };
  }

  /**
   * `readSharedExposure` — read the current shared_exposure_lock row for (player, rival, district).
   * Returns null if no row exists.
   */
  async readSharedExposure(
    playerId: string,
    rivalKey: RivalKey,
    districtId: number,
  ): Promise<{
    shared_bpd_attention: number;
    mutual_exposure_flag: boolean;
    auto_truce_active:    boolean;
  } | null> {
    const rows = await this.db
      .select({
        shared_bpd_attention: sharedExposureLock.shared_bpd_attention,
        mutual_exposure_flag: sharedExposureLock.mutual_exposure_flag,
        auto_truce_active:    sharedExposureLock.auto_truce_active,
      })
      .from(sharedExposureLock)
      .where(
        and(
          eq(sharedExposureLock.player_id,   playerId),
          eq(sharedExposureLock.rival_key,   rivalKey),
          eq(sharedExposureLock.district_id, districtId),
        ),
      )
      .limit(1);

    if (rows.length === 0) return null;
    const r = rows[0]!;
    return {
      shared_bpd_attention: r.shared_bpd_attention,
      mutual_exposure_flag: r.mutual_exposure_flag,
      auto_truce_active:    r.auto_truce_active,
    };
  }

  /**
   * `getMaxSharedAttention` — return the MAX shared_bpd_attention across ALL districts
   * for (player, rival). Used by DiplomacyProjectionService (C10) to band the
   * sharedAttentionBucket: 'mutual' if max ≥ threshold; 'elevated' if max > 0; 'low' if 0.
   *
   * Returns 0 if no shared_exposure_lock rows exist for this (player, rival) pair.
   * C4: NO Math.random(). NO Date.now(). Pure DB read.
   */
  async getMaxSharedAttention(playerId: string, rivalKey: RivalKey): Promise<number> {
    const rows = await this.db
      .select({ shared_bpd_attention: sharedExposureLock.shared_bpd_attention })
      .from(sharedExposureLock)
      .where(
        and(
          eq(sharedExposureLock.player_id, playerId),
          eq(sharedExposureLock.rival_key, rivalKey),
        ),
      );
    if (rows.length === 0) return 0;
    return Math.max(...rows.map((r) => r.shared_bpd_attention));
  }

  /**
   * `isAutoTruceActive` — quick boolean check for a district.
   * Returns false if no row exists.
   * Called by B's negotiateDeactivation to check for an active truce condition.
   */
  async isAutoTruceActive(
    playerId: string,
    rivalKey: RivalKey,
    districtId?: number,
  ): Promise<boolean> {
    // If districtId not provided, check if ANY district has auto_truce_active=true
    if (districtId === undefined) {
      const rows = await this.db
        .select({ auto_truce_active: sharedExposureLock.auto_truce_active })
        .from(sharedExposureLock)
        .where(
          and(
            eq(sharedExposureLock.player_id, playerId),
            eq(sharedExposureLock.rival_key, rivalKey),
          ),
        );
      return rows.some((r) => r.auto_truce_active);
    }

    const row = await this.readSharedExposure(playerId, rivalKey, districtId);
    return row?.auto_truce_active ?? false;
  }
}
