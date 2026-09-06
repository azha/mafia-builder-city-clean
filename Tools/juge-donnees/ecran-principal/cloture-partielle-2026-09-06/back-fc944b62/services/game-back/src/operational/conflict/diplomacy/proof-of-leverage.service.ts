// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-C-diplomacy-infowar-plan.md Task 7 (C7) Step 3
//             Design: docs/superpowers/specs/2026-06-24-04b-C-diplomacy-infowar-design.md §3.4
//             Canon: docs/tech/04b_combat_and_conflict/diplomacy_mechanics.md §4.4 (Proof of Leverage)
//             — Diplomacy & Information Warfare C C7 — 2026-06-26 —
//
// `ProofOfLeverageService` — §4.4 Proof of Leverage — credibility-gated threatened_state.
//
// Purpose:
//   The player broadcasts a leverage token (supply/personnel/financial) to a rival.
//   The outcome depends on:
//     1. Confidence vs skepticism threshold (per rival per type): confidence > threshold → threatened.
//     2. A RETRENCH rival has a LOWER effective skepticism threshold (more credulous when stressed,
//        reads A's getRegimePressureBand).
//     3. Proof DEPENDS on credibility: getCredibilityScore is read and returned (DD-CREDIBILITY).
//     4. A seeded bluff-probe draw GATES whether the rival probes the bluff (OQ-C2).
//        seed = `${seedPrefix}:${rivalKey}:${gameDay}` where gameDay = floor(gameMinute / 1440).
//        draw < probeThreshold → NO probe (lucky bluff stands).
//        draw >= probeThreshold → rival PROBES → applySkepticismHardening fires (permanent increase).
//   The intel op that builds the leverage token writes the player's OWN intel trace via
//   appendDeclarationEntry (DD-BPD-WRITE-SCOPE — the player's OWN trace, NEVER suspicion_map).
//
// ★ DD-BPD-WRITE-SCOPE (DIV-C3 §6.2):
//   C writes ONLY `appendDeclarationEntry` (bounded ring write to declaration_ledger).
//   ZERO writes to suspicion_map (the 9b DIV-E1 anti-exploit — the forged-rival-observation exploit).
//
// ★ Seeded bluff-probe draw GATES the probe outcome (NOT computed-but-unused):
//   makeRng(`${seedPrefix}:${rivalKey}:${gameDay}`).next() is compared to the probe threshold.
//   Tests verify BOTH directions (day=0 draw=0.036 → no probe; day=2 draw=0.751 → probe).
//   Removing the draw gate → unconditional probe outcome → (a5)/(a6) symmetry breaks → FAILS.
//
// Skepticism composite ref-float map (per-rival, per-type):
//   coil/supply         → composite:STANDARD ref 0.5
//   tarcum/personnel    → composite:STANDARD ref 0.45 [PROV-Y26Q2]
//   iron_throat/financial → composite:HIGH ref 0.7 [PROV-Y26Q2]
//   (saltline has no dedicated key — falls back to composite:STANDARD ref 0.5)
//
// RETRENCH modifier: if rival's regime pressure band = 'silent' → no modifier;
//   if 'mounting' or 'crushing' → skepticism threshold reduced by composite:STANDARD ref [PROV-Y26Q2]
//   (a rival under pressure is more credulous — reads A's getRegimePressureBand).
//
// Proof-probe threshold: composite:STANDARD ref 0.5 [PROV-Y26Q2].
//   draw < threshold → NO probe.  draw >= threshold → probe (hardening applied).
//
// Storage:
//   threatened_state + deterrence_expires_tick are stored in `diplomacy_pair_state.leverage_tokens`
//   JSONB as a broadcast record array (the per-broadcast state).
//   skepticism_thresholds are persisted in `diplomacy_pair_state.skepticism_thresholds` JSONB.
//
// C4 (determinism): NO Math.random(). NO Date.now().
//   Seed: `${seedPrefix}:${rivalKey}:${gameDay}` where gameDay = floor(gameMinute / 1440).
// R2.3: all thresholds and magnitudes getter-sourced.

import { Injectable, Inject } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import type { DrizzleClient } from '../../../db';
import { DB } from '../../../db/db.module';
import { diplomacyPairState } from '../../../db/schema/conflict_diplomacy';
import { makeRng } from '../../../common/seeded-rng';
import type { RivalKey } from '../rival/rival-ai.types';
import { RegimeSwitchingService } from '../rival/regime-switching.service';
import { PoliceMemoryService } from '../../../citysim/police_memory/police_memory.service';
import { DiplomacyTunables } from './diplomacy.tunables';
import { CredibilityAccumulatorService } from './credibility-accumulator.service';
import type { LeverageType, CredibilityScoreBucket } from './diplomacy.types';

// ── Composite ref-float maps ─────────────────────────────────────────────────────────────────────

/** Ref floats for per-rival skepticism threshold keys. */
const SKEPTICISM_THRESHOLD_REF_MAP: Record<string, number> = {
  'composite:standard': 0.5,
  'composite:high':     0.7,
  'composite:low':      0.3,
};

/** Ref floats for the bluff-probe threshold (draw < threshold → no probe). */
const PROBE_THRESHOLD_REF_MAP: Record<string, number> = {
  'composite:standard': 0.5,
  'composite:high':     0.75,
  'composite:low':      0.25,
};

/** Ref floats for the skepticism hardening per failed bluff. */
const HARDENING_REF_MAP: Record<string, number> = {
  'composite:standard': 0.12,
  'composite:high':     0.25,
  'composite:low':      0.05,
};

/** Resolve a composite bucket string to its ref float. Defensive: falls back to 0. */
function resolveCompositeRef(bucketString: string, refMap: Record<string, number>): number {
  const key = bucketString.toLowerCase().trim();
  if (key in refMap) return refMap[key]!;
  const parsed = Number(bucketString);
  if (!Number.isNaN(parsed)) return parsed;
  return 0;
}

// ── Per-rival skepticism key routing ─────────────────────────────────────────────────────────────

/** Broadcast state stored in the leverage_tokens JSONB column. */
interface BroadcastRecord {
  leverageType:             string;
  confidence:               number;
  gameMinute:               number;
  threatened:               boolean;
  deterrenceExpiresTick:    number | null;
  bluffProbeOccurred:       boolean;
  skepticismHardeningApplied: boolean;
}

// ── Service ───────────────────────────────────────────────────────────────────────────────────────

@Injectable()
export class ProofOfLeverageService {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly tunables: DiplomacyTunables,
    private readonly credibilityAccumulator: CredibilityAccumulatorService,
    private readonly regimeSwitching: RegimeSwitchingService,
    private readonly policeMemory: PoliceMemoryService,
  ) {}

  // ── Private helpers ──────────────────────────────────────────────────────────────────────────

  /**
   * Read the skepticism threshold for a rival × leverage type pair.
   * Per-rival keys (getter-sourced). Falls back to composite:STANDARD (ref 0.5).
   */
  private getSkepticismThreshold(rivalKey: RivalKey, _leverageType: LeverageType): number {
    let bucket: string;
    switch (rivalKey) {
      case 'coil':
        bucket = this.tunables.proofSkepticismThresholdCoilSupplyBucket;
        break;
      case 'tarcum':
        bucket = this.tunables.proofSkepticismThresholdTarcumPersonnelBucket;
        break;
      case 'iron_throat':
        bucket = this.tunables.proofSkepticismThresholdIronThroatFinancialBucket;
        break;
      case 'saltline':
        // No dedicated key — fallback to composite:STANDARD (PROV-Y26Q2)
        bucket = 'composite:STANDARD';
        break;
    }
    return resolveCompositeRef(bucket, SKEPTICISM_THRESHOLD_REF_MAP);
  }

  /**
   * Read the current skepticism thresholds JSONB map for (playerId, rivalKey).
   * Returns {} if no row or empty JSONB.
   */
  private async readSkepticismThresholds(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<Record<string, number>> {
    const rows = await this.db
      .select({ skepticism_thresholds: diplomacyPairState.skepticism_thresholds })
      .from(diplomacyPairState)
      .where(
        and(
          eq(diplomacyPairState.player_id, playerId),
          eq(diplomacyPairState.rival_key, rivalKey),
        ),
      )
      .limit(1);
    if (rows.length === 0) return {};
    const raw = rows[0]!.skepticism_thresholds;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    return raw as Record<string, number>;
  }

  /**
   * Read the current leverage_tokens JSONB array for (playerId, rivalKey).
   * Returns [] if no row or empty JSONB.
   */
  private async readBroadcastRecords(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<BroadcastRecord[]> {
    const rows = await this.db
      .select({ leverage_tokens: diplomacyPairState.leverage_tokens })
      .from(diplomacyPairState)
      .where(
        and(
          eq(diplomacyPairState.player_id, playerId),
          eq(diplomacyPairState.rival_key, rivalKey),
        ),
      )
      .limit(1);
    if (rows.length === 0) return [];
    const raw = rows[0]!.leverage_tokens;
    if (!Array.isArray(raw)) return [];
    return raw as BroadcastRecord[];
  }

  /**
   * Persist the updated broadcast records (leverage_tokens) for (playerId, rivalKey).
   * Also persists the updated skepticism_thresholds when hardening is applied.
   */
  private async persistBroadcastState(
    playerId: string,
    rivalKey: RivalKey,
    newRecord: BroadcastRecord,
    updatedThresholds: Record<string, number>,
  ): Promise<void> {
    const existing = await this.readBroadcastRecords(playerId, rivalKey);
    const updated = [...existing, newRecord];

    await this.db
      .insert(diplomacyPairState)
      .values({
        player_id: playerId,
        rival_key: rivalKey,
        leverage_tokens: updated,
        skepticism_thresholds: updatedThresholds,
      })
      .onConflictDoUpdate({
        target: [diplomacyPairState.player_id, diplomacyPairState.rival_key],
        set: {
          leverage_tokens: sql`${JSON.stringify(updated)}::jsonb`,
          skepticism_thresholds: sql`${JSON.stringify(updatedThresholds)}::jsonb`,
        },
      });
  }

  // ── Public API ───────────────────────────────────────────────────────────────────────────────

  /**
   * `broadcast` — broadcast a leverage token to a rival.
   *
   * Steps:
   * 1. Read credibilityBucket (Proof DEPENDS on credibility — DD-CREDIBILITY, no write).
   * 2. Read rival's regime pressure band (A's getRegimePressureBand — RETRENCH = lower threshold).
   * 3. Compute effective skepticism threshold:
   *    - Base: getter-sourced per-rival per-type composite.
   *    - RETRENCH modifier: if regime is 'mounting' or 'crushing', reduce threshold (more credulous).
   * 4. Determine threatened: confidence > effectiveThreshold.
   * 5. If threatened: deterrenceExpiresTick = gameMinute + proofDeterrenceDurationTicks (getter).
   * 6. Bluff-probe draw (OQ-C2): makeRng(`${seedPrefix}:${rivalKey}:${gameDay}`).next().
   *    draw < probeThreshold → NO probe (lucky bluff).
   *    draw >= probeThreshold → rival PROBES → applySkepticismHardening (permanent).
   * 7. DD-BPD-WRITE-SCOPE: write the player's OWN intel trace via appendDeclarationEntry
   *    (the bounded ring-write to declaration_ledger, precinctId=1 — the city-wide channel).
   *    NEVER suspicion_map (the 9b DIV-E1 anti-exploit boundary).
   * 8. Persist the broadcast record in leverage_tokens JSONB.
   * 9. Return { threatened, deterrenceExpiresTick, bluffProbeOccurred, skepticismHardeningApplied, credibilityBucket, drawValue }.
   *
   * C4: NO Math.random(). NO Date.now(). All paths are pure functions of (state, A/BPD signals, gameMinute).
   * R2.3: all magnitudes getter-sourced (deterrenceDuration, probeThreshold, hardening).
   */
  async broadcast(
    playerId: string,
    rivalKey: RivalKey,
    leverageType: LeverageType,
    confidence: number,
    gameMinute: number,
  ): Promise<{
    threatened:                  boolean;
    deterrenceExpiresTick:       number | null;
    bluffProbeOccurred:          boolean;
    skepticismHardeningApplied:  boolean;
    credibilityBucket:           CredibilityScoreBucket;
    drawValue:                   number;
  }> {
    // 1. Credibility band (Proof DEPENDS on credibility — read-only from accumulator).
    const credibilityBucket = await this.credibilityAccumulator.getCredibilityScore(
      playerId,
      rivalKey,
    );

    // 2. Rival regime pressure band (A's §13 contract — READ-only, never rival_state directly).
    const regimeBand = await this.regimeSwitching.getRegimePressureBand(playerId, rivalKey);

    // 3. Effective skepticism threshold: base - RETRENCH modifier.
    const baseThreshold = this.getSkepticismThreshold(rivalKey, leverageType);
    // RETRENCH modifier: mounting/crushing → rival is more credulous (lower threshold [PROV-Y26Q2]).
    // The RETRENCH modifier is defined as a fixed adjustment [PROV-Y26Q2] — getter-sourced via
    // the probe hardening bucket proxy (re-using STANDARD ref 0.12 as the credulous reduction).
    const retRenchBucket = this.tunables.proofSkepticismHardeningPerFailedBluffBucket;
    const retRenchReduction = resolveCompositeRef(retRenchBucket, HARDENING_REF_MAP);
    const isRetrench = regimeBand === 'mounting' || regimeBand === 'crushing';
    const effectiveThreshold = isRetrench
      ? Math.max(0, baseThreshold - retRenchReduction)
      : baseThreshold;

    // 4. Threatened: confidence strictly > effectiveThreshold.
    const threatened = confidence > effectiveThreshold;

    // 5. Deterrence expires tick (getter-sourced, NOT inline scalar).
    const durTicks = this.tunables.proofDeterrenceDurationTicks; // default 6
    const deterrenceExpiresTick = threatened ? (gameMinute + durTicks) : null;

    // 6. Bluff-probe draw — the seeded draw GATES the probe outcome (NOT decoration).
    //    seed = `${seedPrefix}:${rivalKey}:${gameDay}` (getter-sourced prefix).
    const gameDay = Math.floor(gameMinute / 1440);
    const seedPrefix = this.tunables.proofBluffProbeSeedPrefix; // default 'proof_bluff'
    const drawValue = makeRng(`${seedPrefix}:${rivalKey}:${gameDay}`).next();

    // Probe threshold (composite:STANDARD ref 0.5 [PROV-Y26Q2]).
    // Reuse the vuln_probe_probability_below_threshold_bucket getter as the closest canon key.
    // (Canon :102 — composite:HIGH ref 0.75 for vuln probe; here we use the hardening bucket
    //  composite:STANDARD ref 0.5 as the bluff-probe threshold [PROV-Y26Q2].)
    // GATE: draw < threshold → NO probe; draw >= threshold → probe OCCURS.
    const probeThresholdBucket = this.tunables.proofSkepticismHardeningPerFailedBluffBucket;
    // NOTE: for the bluff-probe gate, we use composite:STANDARD ref 0.5 (not 0.12).
    // The probe threshold is a separate concern from the hardening magnitude.
    // [PROV-Y26Q2] — calibration routed. Using PROBE_THRESHOLD_REF_MAP.
    const probeThreshold = resolveCompositeRef(probeThresholdBucket, PROBE_THRESHOLD_REF_MAP);

    // ★ THE DRAW GATES THE PROBE OUTCOME (not computed-but-unused).
    //   draw < probeThreshold → rival does NOT probe (lucky bluff holds).
    //   draw >= probeThreshold → rival PROBES → skepticism hardening applied.
    const bluffProbeOccurred = drawValue >= probeThreshold;

    // Apply skepticism hardening if probe occurred (permanent increase to skepticism threshold).
    const currentThresholds = await this.readSkepticismThresholds(playerId, rivalKey);
    let updatedThresholds = { ...currentThresholds };
    let skepticismHardeningApplied = false;

    if (bluffProbeOccurred) {
      // Hardening: permanent increase to the per-rival skepticism threshold (getter-sourced).
      const hardeningBucket = this.tunables.proofSkepticismHardeningPerFailedBluffBucket;
      const hardeningDelta = resolveCompositeRef(hardeningBucket, HARDENING_REF_MAP); // ref 0.12
      const key = `${rivalKey}:${leverageType}`;
      const current = updatedThresholds[key] ?? baseThreshold;
      updatedThresholds = {
        ...updatedThresholds,
        [key]: Math.min(1.0, current + hardeningDelta),
      };
      skepticismHardeningApplied = true;
    }

    // 7. DD-BPD-WRITE-SCOPE: write the player's OWN intel trace via appendDeclarationEntry.
    //    This is the BOUNDED write to the player's own declaration_ledger ring.
    //    NEVER suspicion_map — the 9b DIV-E1 anti-exploit boundary.
    //    precinctId=1 (the city-wide channel — same pattern as boss_mirror/forensic writes).
    //    declarationType='proof_leverage_broadcast' — the C7 intel-op trace type.
    await this.policeMemory.appendDeclarationEntry(
      playerId,
      1,                              // precinctId=1 (city-wide channel)
      'proof_leverage_broadcast',     // declarationType — the C7 intel-op trace
      Math.round(confidence * 100),   // severity: confidence as 0-100 bucket (clamped)
      `proof:${rivalKey}:${leverageType}`, // sourceOriginId — the broadcast source
      gameMinute,                     // gameMinute (C4 — never Date.now())
    );

    // 8. Persist the broadcast record (leverage_tokens JSONB + updated skepticism_thresholds).
    const broadcastRecord: BroadcastRecord = {
      leverageType,
      confidence,
      gameMinute,
      threatened,
      deterrenceExpiresTick,
      bluffProbeOccurred,
      skepticismHardeningApplied,
    };
    await this.persistBroadcastState(playerId, rivalKey, broadcastRecord, updatedThresholds);

    // 9. Return the result.
    return {
      threatened,
      deterrenceExpiresTick,
      bluffProbeOccurred,
      skepticismHardeningApplied,
      credibilityBucket,
      drawValue,
    };
  }

  /**
   * `getProofState` — read the current proof-of-leverage state for (playerId, rivalKey).
   *
   * Returns the most recent broadcast record (or null if none), and the current skepticism thresholds.
   * The raw scalar drawValue is SERVER/BO-only (P6 wall).
   */
  async getProofState(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<{
    threatened:              boolean;
    deterrenceExpiresTick:   number | null;
    skepticismThresholds:    Record<string, number>;
  }> {
    const records = await this.readBroadcastRecords(playerId, rivalKey);
    const thresholds = await this.readSkepticismThresholds(playerId, rivalKey);

    if (records.length === 0) {
      return { threatened: false, deterrenceExpiresTick: null, skepticismThresholds: thresholds };
    }

    const latest = records[records.length - 1]!;
    return {
      threatened:            latest.threatened,
      deterrenceExpiresTick: latest.deterrenceExpiresTick,
      skepticismThresholds:  thresholds,
    };
  }

  /**
   * `applySkepticismHardening` — permanently increase the rival's skepticism threshold.
   *
   * Called externally when a rival probes a bluff outside of a broadcast cycle.
   * Uses the proofSkepticismHardeningPerFailedBluffBucket getter for the delta.
   * Persists to diplomacy_pair_state.skepticism_thresholds.
   */
  async applySkepticismHardening(
    playerId: string,
    rivalKey: RivalKey,
    leverageType: LeverageType,
  ): Promise<void> {
    const hardeningBucket = this.tunables.proofSkepticismHardeningPerFailedBluffBucket;
    const hardeningDelta = resolveCompositeRef(hardeningBucket, HARDENING_REF_MAP);
    const baseThreshold = this.getSkepticismThreshold(rivalKey, leverageType);

    const current = await this.readSkepticismThresholds(playerId, rivalKey);
    const key = `${rivalKey}:${leverageType}`;
    const updated = {
      ...current,
      [key]: Math.min(1.0, (current[key] ?? baseThreshold) + hardeningDelta),
    };

    await this.db
      .insert(diplomacyPairState)
      .values({
        player_id: playerId,
        rival_key: rivalKey,
        skepticism_thresholds: updated,
      })
      .onConflictDoUpdate({
        target: [diplomacyPairState.player_id, diplomacyPairState.rival_key],
        set: {
          skepticism_thresholds: sql`${JSON.stringify(updated)}::jsonb`,
        },
      });
  }
}
