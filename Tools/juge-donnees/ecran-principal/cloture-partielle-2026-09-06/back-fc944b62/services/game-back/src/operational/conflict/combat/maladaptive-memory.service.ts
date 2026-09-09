// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-B-combat-escalation-plan.md Task 9 (C-esc)
//             Design: docs/superpowers/specs/2026-06-24-04b-B-combat-escalation-design.md §4.2
//             Canon: docs/tech/04b_combat_and_conflict/escalation_mechanics.md §4.2 (Maladaptive Coupling)
//             — C-esc — 2026-06-25 —
//
// `MaladaptiveMemoryService` — the §4.2 Maladaptive Memory mechanic.
//
// Maintains per-(player, rival) conflict_memory_depth — an entrenching counter that rises with each
// conflict event and decays slowly during quiet stretches.
//
// Methods:
//   `incrementDepth`             — adds maladaptiveDepthPerConflict (getter-sourced, default 1)
//                                   to conflict_memory_depth, capped at 10. Upserts the pair row.
//   `decayDepthOnQuietTicks`     — subtracts floor(quietTickCount/10) × maladaptiveDepthDecayPerQuietTicks
//                                   per quiet 10-tick period. Only decays if quietTickCount >= 10.
//                                   Floor at 0 (depth never goes negative).
//   `getEscalationDepth`         — maps depth int → qualitative string band.
//
// Determinism: NO Math.random(). NO Date.now(). All thresholds getter-sourced.
// ADDITIVE: only reads/upserts escalation_pair_state. Zero-regression.

import { Injectable, Logger } from '@nestjs/common';

import { CombatRepository } from './combat.repository';
import { CombatTunables } from './combat-tunables';
import type { RivalKey } from '../rival/rival-ai.types';

/** Maximum depth cap (canon §4.2 :188 — depth is bounded [0, 10]). */
const DEPTH_MAX = 10;

/** Minimum quiet-tick count before any decay is applied (per-10-tick window). */
const QUIET_TICKS_WINDOW = 10;

@Injectable()
export class MaladaptiveMemoryService {
  private readonly logger = new Logger(MaladaptiveMemoryService.name);

  constructor(
    private readonly combatRepo: CombatRepository,
    private readonly tunables: CombatTunables,
  ) {}

  /**
   * `incrementDepth` — increment conflict_memory_depth by `maladaptiveDepthPerConflict` (default 1).
   *
   * Capped at DEPTH_MAX (10). Creates the pair row if absent (upsert semantics).
   * Called by the conflict-event pathway (each assault / confrontation increments depth).
   *
   * Determinism: NO Math.random(). NO Date.now(). Increment sourced from getter.
   */
  async incrementDepth(playerId: string, rivalKey: RivalKey): Promise<void> {
    const pair = await this.combatRepo.readEscalationPair(playerId, rivalKey);
    const currentDepth = pair?.conflict_memory_depth ?? 0;
    const increment = this.tunables.maladaptiveDepthPerConflict; // default 1
    const newDepth = Math.min(DEPTH_MAX, currentDepth + increment);
    await this.combatRepo.upsertEscalationPair(playerId, rivalKey, {
      conflict_memory_depth: newDepth,
    });
  }

  /**
   * `decayDepthOnQuietTicks` — decay conflict_memory_depth during quiet stretches.
   *
   * Only decays if quietTickCount >= QUIET_TICKS_WINDOW (10). Applies one decay step per
   * complete 10-tick window: decayAmount = floor(quietTickCount / 10) × maladaptiveDepthDecayPerQuietTicks.
   * Floor at 0 (depth never negative).
   *
   * Determinism: NO Math.random(). NO Date.now(). Decay sourced from getter.
   */
  async decayDepthOnQuietTicks(
    playerId: string,
    rivalKey: RivalKey,
    quietTickCount: number,
  ): Promise<void> {
    if (quietTickCount < QUIET_TICKS_WINDOW) return; // no decay for short quiet stretches

    const pair = await this.combatRepo.readEscalationPair(playerId, rivalKey);
    if (!pair) return; // no row → nothing to decay

    const currentDepth = pair.conflict_memory_depth;
    const decayPerWindow = this.tunables.maladaptiveDepthDecayPerQuietTicks; // default 1
    const windows = Math.floor(quietTickCount / QUIET_TICKS_WINDOW);
    const decayAmount = windows * decayPerWindow;
    const newDepth = Math.max(0, currentDepth - decayAmount);

    await this.combatRepo.upsertEscalationPair(playerId, rivalKey, {
      conflict_memory_depth: newDepth,
    });
  }

  /**
   * `getEscalationDepth` — maps conflict_memory_depth integer to a qualitative band string.
   *
   * P5 / R2.2: the player sees ONLY the band string, never the raw depth integer.
   *   none     → depth = 0
   *   low      → 1 <= depth <= 3
   *   moderate → 4 <= depth <= 6
   *   deep     → depth >= 7
   */
  getEscalationDepth(depth: number): string {
    if (depth === 0) return 'none';
    if (depth <= 3) return 'low';
    if (depth <= 6) return 'moderate';
    return 'deep';
  }
}
