// IMPLEMENTS: docs/superpowers/plans/2026-07-24-p3-H-vertical-horizon-plan.md C4 ("`HorizonTierAdvancementService`:
//             `POST /v1/meta/horizon/advance-tier {lieutenant_id}` -> counter gate ... -> monotone `UPDATE
//             decision_horizon_tier = :n WHERE = :n-1` -> counter reset -> `HorizonTierAdvancedEvent`").
//             Design: docs/superpowers/specs/2026-07-24-p3-H-vertical-horizon-design.md D6 ("single-
//             statement `UPDATE player_progression_state SET decision_horizon_tier = :n WHERE player_id=:p
//             AND decision_horizon_tier = :n-1` (monotone by construction; a replayed/out-of-order advance
//             is a zero-write)").
//             Pattern (a small dedicated repository owning ONE column's write concern via a monotone
//             double-wall WHERE, `.returning()` to detect the actual write — the EXACT P3-G vocab-advance
//             precedent this design decision is modeled on verbatim): `vocab-tier-advancement.repository.ts
//             #advanceTier` (`rule_vocabulary_tier`, D9 — the SAME `WHERE col = targetTier - 1` shape,
//             transplanted here for `decision_horizon_tier`, D1's OWN player-shared, 1..3-domain column).
//             Pattern (per-substrate local `getCurrentGameMinute` copy, NEVER a shared helper): `execution-
//             plans.repository.ts#getCurrentGameMinute` (this lot's OWN sibling copy, C2) /
//             `lieutenant.repository.ts:318` / `leg.repository.ts:146` / `cue-stack.repository.ts:471`.
//             — P3-H C4 — 2026-07-24
//
// `HorizonTierAdvancementRepository` — the REAL first WRITER of `player_progression_state.decision_horizon_
// tier` (D1/D6 — the column has been DORMANT since mig 0002, read-only since C2's `ProgressionRepository.
// getDecisionHorizonTier`). `advanceTier` is ALSO exposed to a `_test`-only route (Lesson #3-adjacent — a
// direct repository probe, not a shared "one method both real+test call" shape, since the REAL business
// flow always derives `targetTier = currentTier + 1` while the replay/out-of-order falsifiables need an
// EXPLICIT, arbitrary `targetTier` — the design's own "(test hook)" annotation on the out-of-order
// falsifiable, plan C4) so the E2E floor can exercise the monotone WHERE double-wall directly, independent
// of the counter gate.

import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { citySimClock } from '../db/schema/city_sim_clock';
import { playerProgressionState } from '../db/schema/player_progression_state';

@Injectable()
export class HorizonTierAdvancementRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * The player's CURRENT in-game tick (`city_sim_clock.game_minute`) — a per-substrate LOCAL copy of the
   * established `getCurrentGameMinute` convention (this codebase deliberately never shares this read
   * across repositories — see this file's own header). Returns 0 when the player has no clock row yet. A
   * READ — no state change.
   */
  async getCurrentGameMinute(playerId: string): Promise<number> {
    const rows = await this.db
      .select({ game_minute: citySimClock.game_minute })
      .from(citySimClock)
      .where(eq(citySimClock.player_id, playerId))
      .limit(1);
    return rows[0]?.game_minute ?? 0;
  }

  /**
   * D6's monotone WHERE double wall: `UPDATE player_progression_state SET decision_horizon_tier =
   * :targetTier WHERE player_id = :playerId AND decision_horizon_tier = :targetTier - 1 RETURNING
   * decision_horizon_tier` — the EXACT `VocabTierAdvancementRepository.advanceTier` shape transplanted to
   * this column (that file's own header explains the "genuinely separate writer" reasoning verbatim; the
   * SAME reasoning applies here: `HorizonTierAdvancementService`'s COUNTER-GATED real flow needs the
   * STRICT `= tier-1` double wall, never a looser "any increase" guard, so an out-of-order request — e.g.
   * hand-advance T1 directly to T3 — is refused rather than silently skipping a tier). Returns
   * `{advanced:false}` whenever the WHERE fails to match — a replay (tier already == targetTier), an
   * out-of-order tier (current tier < targetTier - 1), a stale/regressed tier, OR a missing row entirely
   * (a bare `UPDATE ... WHERE` matches ZERO rows against a player with no `player_progression_state` row
   * at all — indistinguishable, by design, from a genuine WHERE mismatch; never a crash, always a
   * defensive no-op). ★ CORRECTED (this method does NOT itself guarantee row existence, unlike an
   * earlier draft of this comment claimed): `HorizonTierAdvancementService.advance` calls
   * `ProgressionRepository.ensureRow(playerId)` immediately before calling this method (the SAME
   * `structural-decision-governor.service.ts:96`/`budget-recompute.service.ts:110` precedent every OTHER
   * `player_progression_state` writer follows) — THAT is what makes the missing-row case unreachable on
   * the REAL business flow. The `_test/vertical-horizon/advance-tier-direct` probe calls THIS method
   * directly, bypassing the service's `ensureRow` — a caller of that hook is responsible for its own
   * fixture row (e.g. via the pre-existing `set-decision-horizon-tier` test route), the horizon_tier_
   * advancement.spec.ts's own C4 lesson (empirically found: tests (4)/(5) initially failed on a
   * raw-SQL-seeded player with no row at all, not on the WHERE guard). Two concurrent calls with the SAME
   * `targetTier` on the SAME player serialize at the row level — only the FIRST to commit matches the
   * WHERE; the second re-evaluates against the now-advanced tier and matches zero rows (the concurrency
   * falsifiable — no row lock needed, mirrors `flipToDelegated`'s/the vocab precedent's own bare-WHERE
   * atomicity).
   */
  async advanceTier(playerId: string, targetTier: number): Promise<{ advanced: true; newTier: number } | { advanced: false }> {
    const updated = await this.db
      .update(playerProgressionState)
      .set({ decision_horizon_tier: targetTier })
      .where(
        and(
          eq(playerProgressionState.player_id, playerId),
          eq(playerProgressionState.decision_horizon_tier, targetTier - 1),
        ),
      )
      .returning({ decision_horizon_tier: playerProgressionState.decision_horizon_tier });
    if (updated.length === 0) return { advanced: false };
    return { advanced: true, newTier: updated[0]!.decision_horizon_tier };
  }
}
