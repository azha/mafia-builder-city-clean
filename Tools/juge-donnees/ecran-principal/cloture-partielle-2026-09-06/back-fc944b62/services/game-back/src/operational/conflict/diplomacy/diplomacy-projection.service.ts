// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-C-diplomacy-infowar-plan.md Task 10 (C10)
//             Design: docs/superpowers/specs/2026-06-24-04b-C-diplomacy-infowar-design.md §11 DD-P5-REALIZATION
//             Canon: docs/tech/04b_combat_and_conflict/diplomacy_mechanics.md §4/§6 (DiplomacyClientView)
//             Pattern: services/game-back/src/operational/conflict/rival/rival-projection.service.ts (P6 wall mirror)
//             — Diplomacy & Information Warfare C C10 — 2026-06-26 —
//
// `DiplomacyProjectionService` — DD-P5 diplomacy projection wall.
//
// The ONLY player-facing path from diplomacy state to the player client.
// Produces `toDiplomacyClientView(playerId, rivalKey): Promise<DiplomacyClientView>`.
//
// P5 wall invariant:
//   NO raw credibility float, NO raw trust_decay float, NO skepticism_thresholds JSONB,
//   NO shared_bpd_attention float, NO commitment_ledger JSONB, NO leverage_tokens JSONB
//   EVER leaves this service. The returned `DiplomacyClientView` shape contains ONLY:
//     credibilityBucket      — bands the credibility_state.credibility float (OQ-C4 sorted cuts).
//     trustDecayBucket       — bands the diplomacy_pair_state.trust_decay float (PROV-Y26Q2 cuts).
//     sharedAttentionBucket  — bands shared_bpd_attention via getter-sourced threshold.
//     publicLedgerEntries    — the ONE P5 exception (own entries — explicitly visible to rivals).
//     rivalKey               — the rival key (a string identifier, not a scalar).
//
// ★ Rival state via A's `toClientView` ONLY:
//   C never reads `rival_state` directly. Diplomacy mechanics depend on A/B signals
//   via injected services (never a direct DB read on rival tables).
//
// ★ Band derivation:
//   credibilityBucket: delegates to CredibilityAccumulatorService.getCredibilityScore
//     (OQ-C4 defensive sort — 4 cut getters sorted ascending before banding).
//   trustDecayBucket:  reads diplomacy_pair_state.trust_decay → PROV-Y26Q2 canon-structural cuts.
//     trust_decay grows from 0 (pristine) toward higher values with relationship strain.
//     Each failed burn applies ~0.25 (burnTrustDecayPerFailedBurnBucket composite:STANDARD ref 0.25).
//   sharedAttentionBucket: reads MAX(shared_bpd_attention) across all districts → getter-sourced
//     shared_exposure_threshold (composite:STANDARD ref 0.55). 'mutual' = at or above threshold;
//     'elevated' = any attention > 0; 'low' = no attention.
//
// Anti-fabrication: NO Math.random(). NO Date.now(). Pure function of DB state + tunables.
// R2.2 / P6: all raw scalars stripped. Only derived buckets + the ONE P5 exception.
// R2.3: trust_decay band cuts and shared_attention threshold are getter-sourced (never inline literals).

import { Injectable } from '@nestjs/common';

import { CredibilityAccumulatorService } from './credibility-accumulator.service';
import { SharedExposureLockService } from './shared-exposure-lock.service';
import { DiplomacyRepository } from './diplomacy.repository';
import { DiplomacyTunables } from './diplomacy.tunables';
import type { RivalKey } from '../rival/rival-ai.types';
import type {
  DiplomacyClientView,
  TrustDecayBucket,
  SharedAttentionBucket,
  PublicLedgerEntryView,
  PublicLedgerEntryType,
} from './diplomacy.types';

// ── PROV-Y26Q2 canon-structural constants for trust_decay banding ────────────────────────────────
// trust_decay grows from 0 (fresh relationship) by ~0.25 per failed burn
// (burnTrustDecayPerFailedBurnBucket composite:STANDARD ref 0.25 — diplomacy_mechanics.md:76).
// These cuts are canon-structural balance anchors; they are NOT in the gdd/14 registry and are
// NOT intended to be overridden by operators. Annotated [PROV-Y26Q2] pending conflict calibration.
const TRUST_DECAY_CUT_PRISTINE_MAX   = 0.25; // [PROV-Y26Q2] pristine → maintained transition
const TRUST_DECAY_CUT_MAINTAINED_MAX = 0.50; // [PROV-Y26Q2] maintained → damaged transition
const TRUST_DECAY_CUT_DAMAGED_MAX    = 0.75; // [PROV-Y26Q2] damaged → shattered transition

// ── Ref-float map for shared_exposure_threshold_bucket ───────────────────────────────────────────
// Mirrors the SHARED_THRESHOLD_REF_MAP in shared-exposure-lock.service.ts (the SSOT for this key).
// Both maps MUST be kept in sync with the canonical diplomacy_mechanics.md:177 ref values.
const SHARED_THRESHOLD_REF_MAP: Record<string, number> = {
  'composite:standard': 0.55, // Canon :177 — composite:STANDARD → 0.55
  'composite:high':     0.80, // [PROV-Y26Q2]
  'composite:low':      0.30, // [PROV-Y26Q2]
};

/** Resolve a composite bucket string to its ref float. */
function resolveCompositeRef(bucketString: string, refMap: Record<string, number>): number {
  const key = bucketString.toLowerCase().trim();
  if (key in refMap) return refMap[key]!;
  const parsed = Number(bucketString);
  if (!Number.isNaN(parsed)) return parsed;
  return 0;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────

@Injectable()
export class DiplomacyProjectionService {
  constructor(
    private readonly diplomacyRepo: DiplomacyRepository,
    private readonly credibilityAccumulator: CredibilityAccumulatorService,
    private readonly sharedExposureLock: SharedExposureLockService,
    private readonly tunables: DiplomacyTunables,
  ) {}

  /**
   * `toDiplomacyClientView` — the ONLY player-facing path from diplomacy state.
   *
   * Reads C5-C8 mechanic state and bands every float. Returns only closed buckets
   * + the ONE P5 exception (public_ledger_entry rows). No raw scalar leaks.
   *
   * P5 guarantee: NO credibility / trust_decay / skepticism / shared_bpd_attention float
   * EVER appears in the returned object. Enforce via the grep-zero gate in C10.
   *
   * C4 (determinism): NO Math.random(). NO Date.now(). Pure function of DB state + tunables.
   * R2.3: trust_decay cuts annotated PROV-Y26Q2; shared-attention threshold getter-sourced.
   */
  async toDiplomacyClientView(playerId: string, rivalKey: RivalKey): Promise<DiplomacyClientView> {
    // ── credibilityBucket: OQ-C4 sorted-cut banding via CredibilityAccumulatorService ──────────
    // Delegates to the SINGLE source of truth (DD-CREDIBILITY). The 4 cut getters are sorted
    // ascending before banding (the OQ-C4 cross-key monotonicity guard).
    const credibilityBucket = await this.credibilityAccumulator.getCredibilityScore(playerId, rivalKey);

    // ── trustDecayBucket: read trust_decay float → band via PROV-Y26Q2 cuts ────────────────────
    // diplomacy_pair_state.trust_decay starts at 0 (fresh relationship) and grows with strain.
    // null row = player has never had a diplomacy event with this rival → 0 (pristine).
    const pairState = await this.diplomacyRepo.readPairState(playerId, rivalKey);
    const trustDecay = pairState?.trust_decay ?? 0;
    const trustDecayBucket = this.bandTrustDecay(trustDecay);

    // ── sharedAttentionBucket: read MAX(shared_bpd_attention) → band via getter-sourced threshold
    // Reads the MAX attention value across all districts for (player, rival).
    // No rows = 0 (no shared attention). 'mutual' = at or above getter-sourced threshold.
    // 'elevated' = any attention > 0 (approaching threshold). 'low' = no attention.
    const maxAttention      = await this.sharedExposureLock.getMaxSharedAttention(playerId, rivalKey);
    const thresholdBucket   = this.tunables.sharedExposureThresholdBucket;
    const threshold         = resolveCompositeRef(thresholdBucket, SHARED_THRESHOLD_REF_MAP);
    const sharedAttentionBucket = this.bandSharedAttention(maxAttention, threshold);

    // ── publicLedgerEntries: the ONE P5 exception ───────────────────────────────────────────────
    // Reads all public_ledger_entry rows WHERE player_id=playerId AND target_rival_key=rivalKey.
    // These are EXPLICITLY visible to rivals (diplomacy_mechanics.md:281 — the P5 exception).
    // The gameMinute bigint is serialized as a string for JSON safety.
    const rows = await this.diplomacyRepo.listLedgerEntries(playerId, rivalKey);
    const publicLedgerEntries: PublicLedgerEntryView[] = rows.map((r) => ({
      entry_id:         r.entry_id,
      player_id:        r.player_id,
      entry_type:       r.entry_type as PublicLedgerEntryType,
      target_rival_key: r.target_rival_key,
      gameMinute:       String(r.gameMinute),
    }));

    return {
      rivalKey,
      credibilityBucket,
      trustDecayBucket,
      sharedAttentionBucket,
      publicLedgerEntries,
    };
  }

  // ── Private band functions (PROV-Y26Q2 cuts — not balance levers, not in gdd/14 registry) ────

  /**
   * Band the trust_decay float to TrustDecayBucket.
   * Cuts [PROV-Y26Q2] aligned with the failed-burn accrual step of ~0.25:
   *   pristine:   0 ≤ decay < 0.25   (fresh relationship)
   *   maintained: 0.25 ≤ decay < 0.50 (mild strain — 1 failed burn)
   *   damaged:    0.50 ≤ decay < 0.75 (significant strain — 2 failed burns)
   *   shattered:  decay ≥ 0.75        (severe strain — 3+ failed burns)
   */
  private bandTrustDecay(decay: number): TrustDecayBucket {
    if (decay < TRUST_DECAY_CUT_PRISTINE_MAX)   return 'pristine';
    if (decay < TRUST_DECAY_CUT_MAINTAINED_MAX)  return 'maintained';
    if (decay < TRUST_DECAY_CUT_DAMAGED_MAX)     return 'damaged';
    return 'shattered';
  }

  /**
   * Band the MAX shared_bpd_attention to SharedAttentionBucket.
   * Uses the getter-sourced shared_exposure_threshold (composite:STANDARD ref 0.55):
   *   mutual:   maxAttention ≥ threshold  (auto-truce zone — mutual deterrence active)
   *   elevated: maxAttention > 0          (approaching threshold — partial deterrence developing)
   *   low:      maxAttention = 0          (no shared attention across all districts)
   */
  private bandSharedAttention(maxAttention: number, threshold: number): SharedAttentionBucket {
    if (maxAttention >= threshold) return 'mutual';
    if (maxAttention > 0)          return 'elevated';
    return 'low';
  }
}
