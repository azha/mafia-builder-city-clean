// IMPLEMENTS: docs/superpowers/plans/2026-07-19-p3-G-budgets-horizon-plan.md C6 ("`VocabTierAdvancementService`
//             ← `CapabilityAdoptedEvent`... monotone WHERE-guarded single-statement advance").
//             Design: docs/superpowers/specs/2026-07-19-p3-G-budgets-horizon-design.md §1 D9 ("adoption of
//             `VOCAB_TIER_N` → single-statement `UPDATE player_progression_state SET rule_vocabulary_tier
//             = :n WHERE player_id=:p AND rule_vocabulary_tier = :n-1` (monotone by construction; a
//             replayed event or out-of-order tier is a zero-write). Strict sequence is doubly held: the
//             `CURRENT_VOCAB_TIER_IS(n−1)` predicate gates surfacing AND the UPDATE's WHERE gates the
//             write.") + §11 (the keystone falsifiable pair) + §3 (data model — "New writers for values
//             3-6 (D9 — the Phase-17 writer keeps owning 1→2). No column change.").
//             Pattern (a small dedicated repository owning ONE column's write concern for a DISJOINT
//             value range, single-statement conditional UPDATE with `.returning()` to detect the actual
//             write — the SAME "single-writer-per-column, scoped per column not per table" discipline
//             `complexity-budget.repository.ts`'s own header documents): `mastery-score.repository.ts
//             #flipToDelegated` (bare-WHERE conditional UPDATE + `.returning()`, no row lock needed — the
//             WHERE's own read and the SET's write happen as ONE atomic statement under Postgres's row-
//             level lock, so two concurrent advancements on the SAME row serialize: the second's WHERE
//             re-evaluates against the FIRST's already-committed tier and matches zero rows).
//             — P3-G C6 — 2026-07-20
//
// `VocabTierAdvancementRepository` — the ONLY writer of `player_progression_state.rule_vocabulary_tier`
// for values 3-6 (Phase-17's OWN `ProgressionRepository.setVocabularyTier` keeps sole ownership of
// 1→2 — deliberately NOT reused here: that method's WHERE is `< tier`, a looser "any increase" guard
// that would let an out-of-order tier (e.g. 3→5) through; D9 requires the STRICT `= tier-1` double wall,
// so this is a genuinely separate writer, never an edit to `progression.repository.ts`). Exactly two
// writers ever exist on this column (hazard 6) — this repository is the second, disjoint by VALUE range,
// never by a second table/module owning the SAME rows.

import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { playerProgressionState } from '../db/schema/player_progression_state';

@Injectable()
export class VocabTierAdvancementRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * D9's monotone WHERE double wall: `UPDATE ... SET rule_vocabulary_tier = :targetTier WHERE player_id
   * = :playerId AND rule_vocabulary_tier = :targetTier - 1 RETURNING rule_vocabulary_tier`. Returns
   * `{advanced:false}` whenever the WHERE fails to match — a replay (tier already == targetTier), an
   * out-of-order tier (current tier < targetTier - 1), a stale/regressed tier, or a missing row (no
   * progression row yet — never a crash, a defensive no-op: a genuinely tier-eligible player always has
   * a row by the time an adoption fires, since the C2 predicate that gated the card's own surfacing
   * already read this SAME column). Two concurrent calls with the SAME `targetTier` on the SAME player
   * serialize at the row level — only the FIRST to commit matches the WHERE; the second re-evaluates
   * against the now-advanced tier and matches zero rows (the concurrency falsifiable — no row lock
   * needed, mirrors `flipToDelegated`'s own bare-WHERE atomicity).
   */
  async advanceTier(playerId: string, targetTier: number): Promise<{ advanced: true; newTier: number } | { advanced: false }> {
    const updated = await this.db
      .update(playerProgressionState)
      .set({ rule_vocabulary_tier: targetTier })
      .where(
        and(
          eq(playerProgressionState.player_id, playerId),
          eq(playerProgressionState.rule_vocabulary_tier, targetTier - 1),
        ),
      )
      .returning({ rule_vocabulary_tier: playerProgressionState.rule_vocabulary_tier });
    if (updated.length === 0) return { advanced: false };
    return { advanced: true, newTier: updated[0]!.rule_vocabulary_tier };
  }
}
