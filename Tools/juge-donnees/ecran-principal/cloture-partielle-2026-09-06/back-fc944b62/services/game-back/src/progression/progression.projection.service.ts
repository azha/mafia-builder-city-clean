// IMPLEMENTS: docs/superpowers/specs/2026-06-10-phase-17-exception-funnel-progression-design.md §4-T6 (R2.2 — the player
//             surface is the tier LEVEL + a qualitative progress band; the raw distinct/handled counts never escape).
//             C3 (L0.4, D6, docs/superpowers/specs/2026-08-25-lot0-conventions-design.md) ADDS `next_tier` +
//             `tier_label_i18n` — back.md's own "barre impossible" forme-F fix: `player_progression_state.
//             rule_vocabulary_tier` is ALREADY READ here (the sole DB round-trip this service's caller makes),
//             both new fields are a PURE derivation of it, zero new query.

import { Injectable } from '@nestjs/common';

import type { I18nRef } from '../common/i18n-ref';

/** The progress toward the next vocab tier — a closed qualitative band (R2.2). */
export type ProgressToNext = 'LOCKED' | 'IN_PROGRESS' | 'UNLOCKED';

/** C3 (D6) — the top vocab tier (`player_progression_state.rule_vocabulary_tier`'s own CHECK constraint,
 *  `db/migrations/0002_player_progression_state.sql:35`, `BETWEEN 1 AND 6`; ch09 = the source of truth,
 *  R9.3 — this is a CITATION of that bound, not a 2nd independently-decided one). */
const VOCAB_TIER_MAX = 6;

export interface ProgressionView {
  /** The player-facing vocabulary tier LEVEL (1..6) — a progression level, not a hidden BO scalar. */
  vocabulary_tier: number;
  /** Qualitative progress toward the next tier (R2.2 — never the raw K/N counts). */
  progress_to_next: ProgressToNext;
  /**
   * C3 (D6, L0.4) — the tier the player is progressing TOWARD, capped at `VOCAB_TIER_MAX` (a player
   * already AT the max tier has no further tier to name — `next_tier` stays 6, the SAME "at the ceiling"
   * reading `tier_label_i18n` below gives; consigned as a Deviation — the design does not spell out the
   * at-ceiling case, this is the conservative, minimal-surface reading of it).
   */
  next_tier: number;
  /**
   * C3 (D6, L0.4) — the i18n-safe label of `next_tier` (`game.progression.tier_label`, ICU `select` on
   * `tier` — the SAME convention `buildingNameRef`/`dealerNameRef`/`routeNameRef` establish, D7: a KEY +
   * structured params, never inline text; the bundle VALUES are C4's own job, L0.1).
   */
  tier_label_i18n: I18nRef;
}

@Injectable()
export class ProgressionProjectionService {
  /**
   * Project the raw progression to the R2.2 view. At Tier ≥ 2 the next unlock is UNLOCKED (the meaningful one landed).
   * At Tier 1: IN_PROGRESS if the player has taught ≥1 distinct signal OR handled ≥1 exception (engaged), else LOCKED.
   * The raw distinct/handled counts are consumed here and NEVER forwarded.
   */
  project(raw: { rule_vocabulary_tier: number; taught_signals: string[]; handled: number }): ProgressionView {
    const tier = raw.rule_vocabulary_tier;
    let band: ProgressToNext;
    if (tier >= 2) {
      band = 'UNLOCKED';
    } else if (raw.taught_signals.length > 0 || raw.handled > 0) {
      band = 'IN_PROGRESS';
    } else {
      band = 'LOCKED';
    }
    const nextTier = Math.min(tier + 1, VOCAB_TIER_MAX);
    return {
      vocabulary_tier: tier,
      progress_to_next: band,
      next_tier: nextTier,
      tier_label_i18n: { key: 'game.progression.tier_label', params: { tier: String(nextTier) } },
    };
  }
}
