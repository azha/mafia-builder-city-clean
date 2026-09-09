// IMPLEMENTS: docs/superpowers/specs/2026-06-10-phase-17-exception-funnel-progression-design.md §4-T4 (the dual-gate
//             thresholds for Tier 1→2). R2.3: centralized, never inline. PROVISIONAL [PROV-Y26Q2] — small first-slice
//             values so the loop is reachable; calibrate downstream.
//
// Precedence: DB-override > env > default (Phase-23 TunablesStore).
//
// ADAPTATION (P23-T7): the original file had no env helpers; env vars are introduced following the file's namespace
// convention (PROGRESSION_<NAME>): PROGRESSION_VOCAB_TIER2_DISTINCT_SIGNALS,
// PROGRESSION_VOCAB_TIER2_HANDLED_EXCEPTIONS. Keys are PROVISIONAL [PROV-Y26Q2] — not yet consolidated in gdd/14.
// Canonical key pattern: progression.vocab_tier2_distinct_signals / progression.vocab_tier2_handled_exceptions.

import { TunablesStore } from '../config/tunables-store';

export const progressionTunables = {
  /**
   * progression.vocab_tier2_distinct_signals — K: distinct signals the player must have TAUGHT (via ADD_RULE) for the
   * Tier 1→2 gate. Default 2. `[PROV-Y26Q2]`. Env override: PROGRESSION_VOCAB_TIER2_DISTINCT_SIGNALS (test-only).
   * (DB-override > env > default — Phase-23).
   */
  get vocabTier2DistinctSignals(): number {
    return TunablesStore.resolveInt('progression.vocab_tier2_distinct_signals', 'PROGRESSION_VOCAB_TIER2_DISTINCT_SIGNALS', 2);
  },
  /**
   * progression.vocab_tier2_handled_exceptions — N: exceptions the player must have HANDLED (resolved or escalated)
   * for the Tier 1→2 gate. Default 3. `[PROV-Y26Q2]`. Env override: PROGRESSION_VOCAB_TIER2_HANDLED_EXCEPTIONS
   * (test-only). (DB-override > env > default — Phase-23).
   */
  get vocabTier2HandledExceptions(): number {
    return TunablesStore.resolveInt('progression.vocab_tier2_handled_exceptions', 'PROGRESSION_VOCAB_TIER2_HANDLED_EXCEPTIONS', 3);
  },
};
