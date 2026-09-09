// IMPLEMENTS: docs/superpowers/plans/2026-07-11-p3-B-flag-discipline-plan.md §C4 (NIGHTLY tick step 1 —
//             auto-confirm yesterday's pending routine items, set-based UPDATE)
//             Design: docs/superpowers/specs/2026-07-11-p3-B-flag-discipline-design.md §1 D7 step 1 +
//             §14 Glossary (canon term `RoutineItemAutoConfirmService`, `flag_discipline.md §Glossary`).
//             — P3-B C4 — 2026-07-11
//
// `RoutineItemAutoConfirmService` — the canon-named D7 step-1 seam: unflagged, unreviewed
// `routine_items` rows from an EARLIER game-day quietly auto-confirm at the NIGHTLY boundary (canon
// "unflagged items auto-confirm at end of game-day", D13 — a quiet transition, never an "act now or
// lose" prompt). A thin wrapper over `FlagDisciplineRepository.autoConfirmPendingBeforeDay` (the ONE
// set-based UPDATE, D3) — kept as its OWN injectable service (not inlined into the tick orchestrator)
// so the canon entity has a real, addressable home (R6.1) and so a later chunk (e.g. C6's batch-confirm
// surface) can inject this SAME seam if it ever needs the auto-confirm boundary rather than duplicating
// the repository call.

import { Injectable } from '@nestjs/common';

import { FlagDisciplineRepository } from './flag-discipline.repository';

@Injectable()
export class RoutineItemAutoConfirmService {
  constructor(private readonly repo: FlagDisciplineRepository) {}

  /**
   * Auto-confirm every `routine_items` row still `'pending'` from a game-day STRICTLY BEFORE
   * `currentGameDay` (catch-up-safe superset of "yesterday's" — a missed tick still resolves cleanly).
   * Returns the count actually confirmed (0 = organic no-op — no stale pending rows for this player).
   */
  async autoConfirmYesterday(playerId: string, currentGameDay: number): Promise<number> {
    return this.repo.autoConfirmPendingBeforeDay(playerId, currentGameDay);
  }
}
