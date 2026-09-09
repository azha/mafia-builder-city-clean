// IMPLEMENTS: docs/superpowers/specs/2026-06-10-phase-17-exception-funnel-progression-design.md §4-T4/§5 (the Tier 1→2
//             writer — the dual gate: distinct(taught_signals) ≥ K AND handled ≥ N. Called once per successful resolve by
//             ExceptionsService. The compile gate reads the tier live, so the unlock is automatic).

import { Injectable } from '@nestjs/common';

import { ProgressionRepository } from './progression.repository';
import { progressionTunables } from './progression-tunables';

@Injectable()
export class ProgressionService {
  constructor(private readonly repo: ProgressionRepository) {}

  /**
   * Record one successful resolution. For an ADD_RULE resolution with a known taught signal, append it (if new) to the
   * player's taught-signal set. Then, if the player is at Tier 1 and BOTH gate halves hold (≥ K distinct taught AND ≥ N
   * handled), raise them to Tier 2. Idempotent + monotonic (re-teaching a known signal is a no-op; the tier never lowers).
   */
  async onResolution(playerId: string, method: string, taughtSignal: string | null): Promise<void> {
    await this.repo.ensureRow(playerId);
    const prog = await this.repo.getProgression(playerId);

    let taught = prog.taught_signals;
    if (method === 'ADD_RULE' && taughtSignal && !taught.includes(taughtSignal)) {
      taught = [...taught, taughtSignal];
      await this.repo.setTaughtSignals(playerId, taught);
    }

    if (prog.rule_vocabulary_tier !== 1) return; // already advanced — nothing to do.
    if (taught.length < progressionTunables.vocabTier2DistinctSignals) return; // breadth gate not met.
    const handled = await this.repo.countHandledExceptions(playerId);
    if (handled < progressionTunables.vocabTier2HandledExceptions) return; // engagement gate not met.

    await this.repo.setVocabularyTier(playerId, 2); // both halves met → unlock Tier 2 (AND/OR/NOT).
  }
}
