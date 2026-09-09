// IMPLEMENTS: docs/superpowers/plans/2026-07-11-p3-B-flag-discipline-plan.md §C2 (token & flag state
//             machine — atomic conditional writes)
//             Design: docs/superpowers/specs/2026-07-11-p3-B-flag-discipline-design.md §4 (token & flag
//             state machine) + §1 D2/D3 (the 04f-B collision wall + the P3-A lot-pattern mandate: every
//             invariant DB-enforced/atomic FROM THE START).
//             Decisions: §1.2 D2 / §1.3 D3 / §1.10 D10 + §6 RULING (#2 net-token-delta / #3 TIMED_OUT
//             returned — the CALLER, FlagDisciplineService, resolves the tunable arithmetic; this file
//             only exposes the single-statement primitives).
//             Pattern (atomic conditional reservation): `structural-decision-governor.repository.ts:25`
//             `reserveStructuralSlot` — copied VERBATIM for `deductTokenAtomic` (a single `UPDATE … WHERE
//             … RETURNING` is atomic in Postgres without an explicit transaction; concurrent UPDATEs to
//             the SAME row serialize via the row-level lock, so a second racer's WHERE re-evaluates
//             against the FIRST racer's already-committed decrement). Pattern (conditional-UPDATE
//             arbiter): the SAME shape for `resolveFlagTransition` (`WHERE resolution = 'pending'`
//             instead of a cap comparison — the loser gets 0 rows, never a race window).
//             — P3-B C2 — 2026-07-11
//
//             P3-B C6 ADDS the player review-surface reads (`listPendingFlagsForPlayer` /
//             `countPendingRoutineItemsForPlayer` / `getTokensForLieutenant`) + the batch-confirm write
//             (`batchConfirmPendingRoutineItems`) + the session-glance count (`countPendingFlagsForPlayer`
//             — re-provided DIRECTLY into `SessionModule`'s own providers, the module-cycle wall, D11).
//             — P3-B C6 — 2026-07-11
//
//             P3-B C7 ADDS the BO stats reads (`listLieutenantsForPlayer` / `getFlagResolutionCounts
//             ForLieutenant` / `countRoutineItemsForLieutenant` / `listFlagHistoryForLieutenant` /
//             `getLieutenantForAdmin`) + the force-token-reset write (`forceResetTokensToMax` — an
//             UPSERT, the SAME atomic-single-statement discipline as every other write in this file, D3)
//             for `flag-discipline-admin.controller.ts` (design §9 D14).
//             — P3-B C7 — 2026-07-11
//
// `FlagDisciplineRepository` — the persisted access layer for the 3 C1 tables (`lieutenant_flag_state`,
// `routine_items`, `flagged_items`). Every state-mutating method here is EITHER a single atomic
// conditional-UPDATE (deductTokenAtomic / creditToken / applyDismissalPenalty / resolveFlagTransition —
// D3: no read-check-then-write shape anywhere) OR a single `db.transaction` (insertFlaggedItemAndMark
// RoutineFlagged — the 2-statement "insert + flip status" pair the design calls "same transaction").

import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gt, gte, inArray, lt, lte, ne, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { citySimClock } from '../../db/schema/city_sim_clock';
import { citySimTunables } from '../../citysim/citysim-tunables';
import { deriveGameDay } from '../../operational/political/political-trigger-evaluators'; // REUSE — the SAME convention session.repository.ts#openFresh already uses to derive a game-day from a raw game_minute read
import { lieutenant } from '../../db/schema/lieutenant'; // C4 — read-only name lookup for the D9 exhaustion-fallback card text (never ALTERed, D2)
import type { I18nRef } from '../../common/i18n-ref'; // Lot 0 §1 D1 — the flag reason the caller supplies is ALWAYS this shape (flag-discipline.service.ts:135's own retyping)
import {
  lieutenantFlagStateRow,
  routineItemRow,
  flaggedItemRow,
  type LieutenantFlagStateRow,
  type RoutineItemRow,
  type FlaggedItemRow,
  type FlaggedItemResolutionEnumTs,
  type RoutineGeneratorEnumTs,
} from '../../db/schema/flag_discipline';

/** The `lieutenant_flag_state.credibility_tokens` column's OWN default (`db/schema/flag_discipline.ts`
 *  `.default(5)`) — named here (C8 ⊥ MINOR-2 fix) so `ensureState`'s initial-grant clamp cites the SAME
 *  number the schema already asserts, rather than a second, independently-typed literal `5` that could
 *  drift from the column default without either site noticing. */
const LIEUTENANT_FLAG_STATE_TOKENS_COLUMN_DEFAULT = 5;

/** Fields `FlagDisciplineService.flagItem` supplies to insert the PENDING flag + flip the routine item in
 *  ONE transaction (design §4 step 2). `routineItemDescriptor` is the SNAPSHOT (prune-proof, design §3). */
export interface InsertFlaggedItemParams {
  readonly playerId: string;
  readonly lieutenantId: string;
  readonly routineItemId: string;
  readonly routineItemDescriptor: unknown;
  readonly flagReason: I18nRef;
  readonly deviationScoreInternal: number;
  readonly emittedTick: number;
  readonly gameDay: number;
}

@Injectable()
export class FlagDisciplineRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * `ensureState` (design §4) — idempotent-create, `ON CONFLICT DO NOTHING` + read-back (the
   * `HlCardRepository#insertActive` / `ProgressionRepository.ensureRow` precedent). Initial tokens =
   * `LEAST(LIEUTENANT_FLAG_STATE_TOKENS_COLUMN_DEFAULT, maxTokens)` — the row's OWN column default is
   * that same named constant (5, `db/schema/flag_discipline.ts`), but a controller-lowered max
   * (tunable, 2..10) must never hand out MORE than the current ceiling to a freshly-touched lieutenant,
   * so the caller-resolved `maxTokens` getter clamps the initial grant explicitly rather than relying on
   * the column default alone. Rows are created LAZILY on first touch (generation, admin read, `set-
   * tokens` test seam) — never eagerly at recruit time (D2/D4).
   */
  async ensureState(lieutenantId: string, playerId: string, maxTokens: number): Promise<LieutenantFlagStateRow> {
    const initialTokens = Math.min(LIEUTENANT_FLAG_STATE_TOKENS_COLUMN_DEFAULT, maxTokens);
    // last_regen_game_day (W1.1-d C1.2 — dropped `.default(0)` TS-side, ANCRE ABSOLUE): stamped to the
    // player's CURRENT game-day at creation (citySimClock.game_minute -> deriveGameDay, the SAME
    // convention session.repository.ts#openFresh already uses) rather than the schema's SQL-level
    // DEFAULT 0. regenAllForPlayer's own regen amount is LEAST-clamped/fixed (not elapsed-scaled), so
    // this is structural consistency, not a live exploit closure here (C1 implementation-notes.md
    // §Deviations has the full reasoning).
    const [clockRow] = await this.db
      .select({ game_minute: citySimClock.game_minute })
      .from(citySimClock)
      .where(eq(citySimClock.player_id, playerId))
      .limit(1);
    const currentGameDay = deriveGameDay(clockRow?.game_minute ?? 0, citySimTunables.inGameDayLengthMinutes);
    await this.db
      .insert(lieutenantFlagStateRow)
      .values({
        lieutenant_id: lieutenantId,
        player_id: playerId,
        credibility_tokens: initialTokens,
        last_regen_game_day: currentGameDay,
      })
      .onConflictDoNothing({ target: lieutenantFlagStateRow.lieutenant_id });
    const [row] = await this.db
      .select()
      .from(lieutenantFlagStateRow)
      .where(eq(lieutenantFlagStateRow.lieutenant_id, lieutenantId))
      .limit(1);
    // Guaranteed to exist post-ensure (either just inserted, or already existed — onConflictDoNothing
    // only skips when a concurrent ensureState/setTokensForTest already won the race).
    return row!;
  }

  /**
   * `deductTokenAtomic` (design §3/§4, D3) — THE `reserveStructuralSlot` copy: ONE conditional `UPDATE …
   * SET credibility_tokens = credibility_tokens - 1 WHERE lieutenant_id = $1 AND credibility_tokens >= 1
   * RETURNING …`. Returns `true` iff a row was actually updated (the token was claimed); `false` iff the
   * lieutenant had zero tokens (the caller falls through to the no-token path — C4's exhaustion fallback,
   * or `already_flagged`/`no_token` in this chunk's `flagItem`). Never a negative balance — the WHERE's
   * own read of the CURRENT row value and the SET's decrement happen as ONE atomic statement under the
   * row's lock; two concurrent callers can NEVER both win when only one token remains (the C2 concurrency
   * gate: two concurrent `flagItem` calls at tokens=1 → exactly one succeeds).
   */
  async deductTokenAtomic(lieutenantId: string): Promise<boolean> {
    const updated = await this.db
      .update(lieutenantFlagStateRow)
      .set({
        credibility_tokens: sql`${lieutenantFlagStateRow.credibility_tokens} - 1`,
        updated_at: sql`now()`,
      })
      .where(
        and(eq(lieutenantFlagStateRow.lieutenant_id, lieutenantId), gte(lieutenantFlagStateRow.credibility_tokens, 1)),
      )
      .returning({ tokens: lieutenantFlagStateRow.credibility_tokens });
    return updated.length > 0;
  }

  /**
   * `creditToken` (design §3/§4, D3) — ONE conditional-free `UPDATE … SET credibility_tokens =
   * LEAST(credibility_tokens + $amount, $maxTokens) …` (the CEILING clamp — `lieutenant_flag_state`
   * deliberately carries NO upper-bound DB CHECK, design §1.3: the cap is a hot-reloadable tunable, so
   * the ceiling lives in this LEAST() clamp, not the schema). Used by: validate (amount=1, token
   * returned), the C4 nightly regen step (amount = the regen getter), and the `flagItem` insert-failure
   * compensation path (amount=1 — the governor `compensateStructuralSlot` precedent, here a CREDIT rather
   * than a decrement since the failed insert never should have cost a token). Returns the token count
   * AFTER the credit (0 if the lieutenant has no state row at all — should never happen post-ensureState).
   */
  async creditToken(lieutenantId: string, amount: number, maxTokens: number): Promise<number> {
    const [row] = await this.db
      .update(lieutenantFlagStateRow)
      .set({
        credibility_tokens: sql`LEAST(${lieutenantFlagStateRow.credibility_tokens} + ${amount}, ${maxTokens})`,
        updated_at: sql`now()`,
      })
      .where(eq(lieutenantFlagStateRow.lieutenant_id, lieutenantId))
      .returning({ tokens: lieutenantFlagStateRow.credibility_tokens });
    return row?.tokens ?? 0;
  }

  /**
   * `applyDismissalPenalty` (design §3/§4, D3, sub-decision #2) — ONE `UPDATE … SET credibility_tokens =
   * LEAST(GREATEST(credibility_tokens - $additionalDelta, 0), $maxTokens) …`. `additionalDelta` is
   * SIGNED: the caller (`FlagDisciplineService.dismissFlag`) resolves it as `|flag_dismissal_trust_
   * penalty_modifier| - 1` (the flag's OWN token was already deducted at flag-creation time — this
   * statement moves ONLY the delta beyond that first token). Positive `additionalDelta` removes more
   * tokens (default modifier -2 -> additionalDelta=1 -> net dismissal cost = 2); a NEGATIVE
   * `additionalDelta` (the modifier=0 degenerate-but-honest edge, decisions §4 divergence #5) CREDITS a
   * token back so the dismissal nets token-neutral (GREATEST floors at 0 either way; LEAST re-clamps the
   * ceiling in case the signed math would otherwise credit past max — defense-in-depth, the "every
   * crediting statement gets the ceiling clamp" discipline, decisions §1.3).
   */
  async applyDismissalPenalty(lieutenantId: string, additionalDelta: number, maxTokens: number): Promise<number> {
    const [row] = await this.db
      .update(lieutenantFlagStateRow)
      .set({
        credibility_tokens: sql`LEAST(GREATEST(${lieutenantFlagStateRow.credibility_tokens} - ${additionalDelta}, 0), ${maxTokens})`,
        updated_at: sql`now()`,
      })
      .where(eq(lieutenantFlagStateRow.lieutenant_id, lieutenantId))
      .returning({ tokens: lieutenantFlagStateRow.credibility_tokens });
    return row?.tokens ?? 0;
  }

  /**
   * `resolveFlagTransition` (design §3/§4, D3) — THE arbiter: ONE conditional `UPDATE flagged_items SET
   * resolution = $resolution, token_returned = $tokenReturned, resolved_at = now(), resolved_at_tick =
   * $resolvedAtTick WHERE flag_id = $1 AND resolution = 'pending' RETURNING *`. A racing 2nd
   * validate/dismiss/timeout against the SAME flag matches ZERO rows (the WHERE's own read of
   * `resolution` and the SET happen as one atomic statement under the row lock) — the loser gets `null`
   * back and the caller 409s WITHOUT ever touching a token (the C2 concurrency gate: double-validate,
   * validate-vs-dismiss race -> exactly one winner). Ownership (`player_id`) is NOT part of this WHERE —
   * the caller establishes ownership via a separate `getOwnedFlag` read FIRST (immutable data, no race
   * risk) so a wrong-player 404 can be told apart from an already-resolved 409 without weakening the
   * arbiter's atomicity for the ACTUAL race this method exists to close.
   */
  async resolveFlagTransition(
    flagId: string,
    resolution: FlaggedItemResolutionEnumTs,
    tokenReturned: boolean,
    resolvedAtTick: number,
  ): Promise<FlaggedItemRow | null> {
    const [updated] = await this.db
      .update(flaggedItemRow)
      .set({
        resolution,
        token_returned: tokenReturned,
        resolved_at: sql`now()`,
        resolved_at_tick: resolvedAtTick,
      })
      .where(and(eq(flaggedItemRow.flag_id, flagId), eq(flaggedItemRow.resolution, 'pending')))
      .returning();
    return updated ?? null;
  }

  /** One flag owned by this player (any resolution) or null — the ownership/existence pre-check
   *  `validateFlag`/`dismissFlag` run BEFORE the atomic arbiter (mirrors `ExceptionsRepository.getOwned`). */
  async getOwnedFlag(playerId: string, flagId: string): Promise<FlaggedItemRow | null> {
    const rows = await this.db
      .select()
      .from(flaggedItemRow)
      .where(and(eq(flaggedItemRow.player_id, playerId), eq(flaggedItemRow.flag_id, flagId)))
      .limit(1);
    return rows[0] ?? null;
  }

  /** One routine item by id, or null — `flagItem`'s read of the candidate `force-flag` targets (the
   *  underlying row is seeded directly by C2's own spec / the C3 generator registry later; this method
   *  never writes). */
  async getRoutineItem(routineItemId: string): Promise<RoutineItemRow | null> {
    const rows = await this.db
      .select()
      .from(routineItemRow)
      .where(eq(routineItemRow.routine_item_id, routineItemId))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * `insertFlaggedItemAndMarkRoutineFlagged` (design §4 step 2) — ONE `db.transaction`: INSERT the
   * PENDING `flagged_items` row + flip the source `routine_items.status = 'flagged'`. The partial UNIQUE
   * index (`flagged_items_pending_unique_idx` on `routine_item_id WHERE resolution='pending'`, mig 0123)
   * rejects a 2nd concurrent INSERT against the SAME `routine_item_id` — the thrown 23505 aborts this
   * WHOLE transaction (neither the insert nor the status flip lands), and the SERVICE catches it to
   * compensate the token already deducted by `deductTokenAtomic` (the governor insert-failure-compensates
   * precedent, `structural-decision-governor.repository.ts`'s own header).
   */
  async insertFlaggedItemAndMarkRoutineFlagged(params: InsertFlaggedItemParams): Promise<FlaggedItemRow> {
    return this.db.transaction(async (tx) => {
      const [flagged] = await tx
        .insert(flaggedItemRow)
        .values({
          player_id: params.playerId,
          lieutenant_id: params.lieutenantId,
          routine_item_id: params.routineItemId,
          routine_item_descriptor: params.routineItemDescriptor,
          flag_reason: params.flagReason,
          deviation_score_internal: params.deviationScoreInternal,
          emitted_tick: params.emittedTick,
          game_day: params.gameDay,
        })
        .returning();
      await tx
        .update(routineItemRow)
        .set({ status: 'flagged' })
        .where(eq(routineItemRow.routine_item_id, params.routineItemId));
      return flagged;
    });
  }

  /** The player's CURRENT in-game tick (`city_sim_clock.game_minute`) — the SAME `getCurrentTick`
   *  precedent every operational repository uses (`precursors.repository.ts:108`,
   *  `ash-appointment.repository.ts:109`, `grow.repository.ts:100`). Returns 0 when the player has no
   *  clock row yet (never a write — the clock row is owned by the scheduler). Used for `flagged_items.
   *  emitted_tick`/`resolved_at_tick` (canon shape, decisions §4 divergence #13). */
  async getCurrentTick(playerId: string): Promise<number> {
    const rows = await this.db
      .select({ game_minute: citySimClock.game_minute })
      .from(citySimClock)
      .where(eq(citySimClock.player_id, playerId))
      .limit(1);
    return rows[0]?.game_minute ?? 0;
  }

  // ── Test-only seams (DD-P4, gated by testControllersEnabled() at the controller layer) ──────────────

  /** `set-tokens` (DD-P4) — direct test-fixture column write (mirrors `set-emitted-at`'s raw-write
   *  convention): ensures the state row exists, then sets `credibility_tokens` to EXACTLY `tokens`
   *  (bypassing the LEAST/GREATEST clamps deliberately — this is a bounded test-only seam for exhaustion
   *  setup, not a production path; the CHECK >= 0 constraint still applies and rejects a negative value,
   *  same as every other write path). Returns the value actually stored. */
  async setTokensForTest(lieutenantId: string, playerId: string, tokens: number, maxTokens: number): Promise<number> {
    await this.ensureState(lieutenantId, playerId, maxTokens);
    const [row] = await this.db
      .update(lieutenantFlagStateRow)
      .set({ credibility_tokens: tokens, updated_at: sql`now()` })
      .where(eq(lieutenantFlagStateRow.lieutenant_id, lieutenantId))
      .returning({ tokens: lieutenantFlagStateRow.credibility_tokens });
    return row?.tokens ?? tokens;
  }

  /** `set-flagged-at` (DD-P4) — the `set-emitted-at` analog: raw test-fixture write of `flagged_at` (ages
   *  a flag deterministically for the C4 timeout falsifiable proofs; this chunk only proves the WRITE
   *  itself, since the timeout consequence is C4's own tick). */
  async setFlaggedAtForTest(flagId: string, flaggedAt: Date): Promise<void> {
    await this.db.update(flaggedItemRow).set({ flagged_at: flaggedAt }).where(eq(flaggedItemRow.flag_id, flagId));
  }

  /**
   * P3-B C3 (D4, D3) — `insertRoutineItemIfAbsent`: the generation entry-point's ONLY write. ONE
   * `INSERT … ON CONFLICT (player_id, game_day, generator, dedup_key) DO NOTHING RETURNING *` against
   * `routine_items_dedup_unique` (mig 0123). Returns the inserted row, or `null` when the constraint
   * absorbed a duplicate — DB-ENFORCED dedup (D3): the caller (`RoutineItemGenerationService`) never
   * pre-checks "did I already generate this today?" itself; even a naive same-day re-run of the FULL
   * enumeration+insert is safe by construction (the falsifiable floor: re-run → zero new rows, proven at
   * the constraint, not an app-side guard that could be forgotten/bypassed).
   */
  async insertRoutineItemIfAbsent(params: {
    playerId: string;
    gameDay: number;
    generator: RoutineGeneratorEnumTs;
    dedupKey: string;
    descriptor: unknown;
    responsibleRoleId: number;
    lieutenantId: string | null;
    deviationScoreInternal: number;
  }): Promise<RoutineItemRow | null> {
    const [row] = await this.db
      .insert(routineItemRow)
      .values({
        player_id: params.playerId,
        game_day: params.gameDay,
        generator: params.generator,
        dedup_key: params.dedupKey,
        descriptor: params.descriptor,
        responsible_role_id: params.responsibleRoleId,
        lieutenant_id: params.lieutenantId,
        deviation_score_internal: params.deviationScoreInternal,
      })
      .onConflictDoNothing({
        target: [routineItemRow.player_id, routineItemRow.game_day, routineItemRow.generator, routineItemRow.dedup_key],
      })
      .returning();
    return row ?? null;
  }

  // ── P3-B C4 (D7 NIGHTLY tick — the 5 ordered steps) ─────────────────────────────────────────────────

  /**
   * D7 step 1 — `RoutineItemAutoConfirmService`'s ONLY write: ONE set-based `UPDATE routine_items SET
   * status='auto_confirmed', confirmed_at=now() WHERE player_id=$1 AND status='pending' AND game_day <
   * $beforeGameDay RETURNING`. "Yesterday's pending items" is realized as `game_day < beforeGameDay`
   * (not `= beforeGameDay - 1`) — a catch-up-safe superset: ANY still-pending row from an EARLIER day
   * (a missed tick, a paused player) also auto-confirms, never just exactly-yesterday. TODAY's own rows
   * (`game_day = beforeGameDay`, generated later in this SAME tick's step 4) never match — the day-1
   * falsifiable floor ("today's pending item provably NOT auto-confirmed"). A flagged item's routine_item
   * row is `status='flagged'`, never `'pending'` — this UPDATE never touches it (only step 2's arbiter
   * resolves a flag's OWN lifecycle). Re-run same day → the previously-updated rows no longer match
   * `status='pending'` → ZERO rows (D3 set-complete idempotency).
   */
  async autoConfirmPendingBeforeDay(playerId: string, beforeGameDay: number): Promise<number> {
    const updated = await this.db
      .update(routineItemRow)
      .set({ status: 'auto_confirmed', confirmed_at: sql`now()` })
      .where(
        and(
          eq(routineItemRow.player_id, playerId),
          eq(routineItemRow.status, 'pending'),
          lt(routineItemRow.game_day, beforeGameDay),
        ),
      )
      .returning({ routine_item_id: routineItemRow.routine_item_id });
    return updated.length;
  }

  /**
   * D7 step 2 — the set-based SELECT half of the timeout step: every PENDING flag whose `flagged_at` is
   * older than `cutoff` (the caller resolves `cutoff = now() - flag_batch_confirm_window_real_hours`,
   * design §6 divergence #9 — the real-clock check). ⊥ C4-fold correction: `flagged_items_pending_
   * unique_idx` is a partial UNIQUE on `routine_item_id` (one pending flag per ROUTINE ITEM, `:211` above
   * — NOT one per lieutenant; a lieutenant can hold MANY simultaneous pending flags, one per distinct
   * routine item). The result here is bounded instead by the SAME economics the flag-creation path itself
   * enforces (D3): a lieutenant can only ever WIN a pending flag by spending a token, `credibility_tokens
   * >= 0` (CHECK) and `flag_credibility_tokens_max_per_lieutenant` (getter, 2..10) capping how many tokens
   * exist to spend between resets — so a player's WHOLE pending-flag set across every lieutenant is
   * bounded by (max tokens × lieutenant count), further thinned by this NIGHTLY tick's own timeout cadence
   * (any flag surviving past the review window resolves here before it can accumulate indefinitely). The
   * per-row loop this result feeds (`FlagDisciplineTickService`) walks that economically-bounded set
   * through the REUSED `resolveFlagTransition` arbiter + `creditToken` per row (D3 concurrency mandate —
   * never a fresh bulk UPDATE bypassing those atomic primitives; the "T3 no-per-row-await-loop" lesson
   * targets UNBOUNDED per-row scans like a production/market sweep, not a token-economics-bounded set like
   * this one). A flag that already transitioned on a prior tick run no longer matches `resolution=
   * 'pending'` here — the re-run-same-day zero-write proof.
   */
  async listTimedOutPendingFlags(
    playerId: string,
    cutoff: Date,
  ): Promise<Array<{ flag_id: string; lieutenant_id: string }>> {
    return this.db
      .select({ flag_id: flaggedItemRow.flag_id, lieutenant_id: flaggedItemRow.lieutenant_id })
      .from(flaggedItemRow)
      .where(
        and(
          eq(flaggedItemRow.player_id, playerId),
          eq(flaggedItemRow.resolution, 'pending'),
          lt(flaggedItemRow.flagged_at, cutoff),
        ),
      );
  }

  /**
   * D7 step 3 — the regen step, set-based across EVERY `lieutenant_flag_state` row this player owns in
   * ONE statement: `UPDATE ... SET credibility_tokens = LEAST(credibility_tokens + $regenAmount,
   * $maxTokens), last_regen_game_day = $gameDay WHERE player_id=$1 AND last_regen_game_day < $gameDay
   * RETURNING`. The guard-and-claim happen in the SAME statement (D3 — mirrors `creditToken`'s own
   * LEAST-clamp discipline, generalized to a WHERE-guarded batch instead of ONE lieutenant_id). A
   * lieutenant already AT max still gets touched (the day guard advances, `updated_at` moves) but its
   * `credibility_tokens` value is unchanged — the LEAST clamp absorbs the addition (the "regen at
   * tokens=max → unchanged" falsifiable floor). Re-run same day → `last_regen_game_day < gameDay` is now
   * false for every row this call touched → ZERO rows (D3 set-complete idempotency).
   */
  async regenAllForPlayer(playerId: string, regenAmount: number, maxTokens: number, gameDay: number): Promise<number> {
    const updated = await this.db
      .update(lieutenantFlagStateRow)
      .set({
        credibility_tokens: sql`LEAST(${lieutenantFlagStateRow.credibility_tokens} + ${regenAmount}, ${maxTokens})`,
        last_regen_game_day: gameDay,
        updated_at: sql`now()`,
      })
      .where(
        and(
          eq(lieutenantFlagStateRow.player_id, playerId),
          lt(lieutenantFlagStateRow.last_regen_game_day, gameDay),
        ),
      )
      .returning({ lieutenant_id: lieutenantFlagStateRow.lieutenant_id });
    return updated.length;
  }

  /**
   * D7 step 5 — prune TERMINAL `routine_items` rows (`auto_confirmed`|`batch_confirmed`|`flagged` —
   * `'pending'` is explicitly excluded from the IN-list, never terminal, never pruned regardless of age)
   * past `flag_routine_items_retention_days`, ONE set-based `DELETE ... RETURNING`. The explicit `NOT
   * EXISTS` guard (mirrors `ephemeral-purge.service.ts`'s own `NOT EXISTS` correlated-subquery idiom)
   * protects a row still referenced by a PENDING flag even though it never should be reachable here in
   * practice (a `'flagged'` row with a live PENDING `flagged_items` row is exactly the descriptor-snapshot
   * case the design calls out — the guard is explicit per design §D4/step 5, not merely inferred safe).
   * `cutoffGameDay = currentGameDay - retentionDays`; `game_day <= cutoffGameDay` (at-or-older than the
   * retention window). Re-run same day → the rows this call already deleted are simply gone (0 rows
   * match) — zero writes (D3 set-complete idempotency).
   */
  async pruneTerminalRoutineItems(playerId: string, currentGameDay: number, retentionDays: number): Promise<number> {
    const cutoffGameDay = currentGameDay - retentionDays;
    const deleted = await this.db
      .delete(routineItemRow)
      .where(
        and(
          eq(routineItemRow.player_id, playerId),
          inArray(routineItemRow.status, ['auto_confirmed', 'batch_confirmed', 'flagged']),
          lte(routineItemRow.game_day, cutoffGameDay),
          sql`NOT EXISTS (
            SELECT 1 FROM "flagged_items" fi
            WHERE fi.routine_item_id = ${routineItemRow.routine_item_id}
              AND fi.resolution = 'pending'
          )`,
        ),
      )
      .returning({ routine_item_id: routineItemRow.routine_item_id });
    return deleted.length;
  }

  /**
   * D9 exhaustion-fallback text seam — the lieutenant's display `name` (READ-ONLY; `lieutenant` is NEVER
   * ALTERed by this lot, D2). Used ONLY to compose the canon-verbatim exception card message ("Lt.
   * {name} has urgent concern but exhausted credibility tokens...", `flag_discipline.md:94`) — `null` on
   * the defensive/should-never-happen case of a lieutenant row vanishing between generation and the
   * fallback insert within the SAME tick call (the caller falls back to a generic label, never throws).
   */
  async getLieutenantName(lieutenantId: string): Promise<string | null> {
    const rows = await this.db
      .select({ name: lieutenant.name })
      .from(lieutenant)
      .where(eq(lieutenant.lieutenant_id, lieutenantId))
      .limit(1);
    return rows[0]?.name ?? null;
  }

  // ── P3-B C5 (D8 weekly reset + convergence/frequency window queries) ───────────────────────────────

  /**
   * D8 — THE weekly reset: ONE epoch-guarded conditional `UPDATE lieutenant_flag_state SET credibility_
   * tokens = $maxTokens, last_weekly_reset_epoch = $epoch, updated_at = now() WHERE player_id = $1 AND
   * last_weekly_reset_epoch < $epoch RETURNING lieutenant_id` — guard and claim in the SAME statement
   * (D3, un-raceable; mirrors `regenAllForPlayer`'s own per-player batched shape). "Reset to max
   * regardless of recent burns" (canon-verbatim): a lieutenant already AT max still matches and gets
   * touched (the epoch guard alone gates the WHERE, never the current token value) — its `credibility_
   * tokens` value is simply reassigned to the SAME max it already held. Re-run with the SAME `epoch` →
   * every row this call already touched no longer matches `last_weekly_reset_epoch < epoch` → ZERO rows
   * (D3 set-complete idempotency, the D8 falsifiable floor). Returns the touched `lieutenant_id`s so the
   * caller (`FlagWeeklyResetTickService`) can emit one `FlagWeeklyResetEvent` per row (mirrors
   * `resolveFlagTransition`'s own RETURNING-drives-the-event discipline).
   */
  async resetTokensToMaxForEpoch(playerId: string, epoch: number, maxTokens: number): Promise<Array<{ lieutenant_id: string }>> {
    return this.db
      .update(lieutenantFlagStateRow)
      .set({
        credibility_tokens: maxTokens,
        last_weekly_reset_epoch: epoch,
        updated_at: sql`now()`,
      })
      .where(
        and(
          eq(lieutenantFlagStateRow.player_id, playerId),
          lt(lieutenantFlagStateRow.last_weekly_reset_epoch, epoch),
        ),
      )
      .returning({ lieutenant_id: lieutenantFlagStateRow.lieutenant_id });
  }

  /**
   * C5 (design §7, D12) — the `ConvergenceBucket` window query: over `flagged_items` rows for this
   * lieutenant with `game_day > sinceGameDay` (the caller resolves `sinceGameDay = currentGameDay -
   * flag_convergence_evaluation_window_days`, the SAME `game_day`-keyed windowing convention
   * `pruneTerminalRoutineItems` already establishes for retention), ONE aggregate query returns BOTH the
   * resolved-flag sample size (`resolution != 'pending'`) and the dismissed-count subset — the 2 raw
   * counts `evaluateConvergence` (the PURE formula, `convergence.ts`) needs. `timed_out` rows count toward
   * `sample` but never toward `dismissedCount` (the pure function's own header explains why — no
   * calibration signal from a timeout, sub-decision #3 carried through here).
   */
  async getConvergenceSampleForLieutenant(
    lieutenantId: string,
    sinceGameDay: number,
  ): Promise<{ sample: number; dismissedCount: number }> {
    const [row] = await this.db
      .select({
        sample: sql<number>`count(*)::int`,
        dismissedCount: sql<number>`count(*) FILTER (WHERE ${flaggedItemRow.resolution} = 'dismissed')::int`,
      })
      .from(flaggedItemRow)
      .where(
        and(
          eq(flaggedItemRow.lieutenant_id, lieutenantId),
          ne(flaggedItemRow.resolution, 'pending'),
          gt(flaggedItemRow.game_day, sinceGameDay),
        ),
      );
    return { sample: row?.sample ?? 0, dismissedCount: row?.dismissedCount ?? 0 };
  }

  /**
   * C5 (design §7, D12) — the `FlagFrequencyBand` window query: count of `flagged_items` rows RAISED
   * (any resolution, including still-`pending`) for this lieutenant with `game_day > sinceGameDay` (the
   * caller resolves `sinceGameDay = currentGameDay - 7`, canon's OWN "last 7 game-days" window — NOT the
   * convergence tunable's 30-day default, a DIFFERENT window on the SAME table). Fed to the PURE
   * `frequencyBand` function (`convergence.ts`).
   */
  async countFlagsRaisedSinceGameDay(lieutenantId: string, sinceGameDay: number): Promise<number> {
    const [row] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(flaggedItemRow)
      .where(and(eq(flaggedItemRow.lieutenant_id, lieutenantId), gt(flaggedItemRow.game_day, sinceGameDay)));
    return row?.n ?? 0;
  }

  /**
   * C5 (design §7, D5 seam REUSE) — the lieutenant's `tenure_score` (READ-ONLY; `lieutenant` is NEVER
   * ALTERed by this lot, D2). Feeds `bucketForStreak` (`tenure-inertia.ts` REUSE) to derive the FRESH/
   * ACCLIMATED/SEASONED/SENIOR/ENTRENCHED bucket the low-tenure-leniency check needs — the SAME seam
   * `RoutineItemGenerationService` already reads for the C3 flag-decision threshold, applied here to
   * convergence instead. `null` on the defensive/should-never-happen case of a vanished lieutenant row
   * (the caller treats it as tenure_score=0 — FRESH, the most lenient bucket, never a throw).
   */
  async getLieutenantTenureScore(lieutenantId: string): Promise<number | null> {
    const rows = await this.db
      .select({ tenure_score: lieutenant.tenure_score })
      .from(lieutenant)
      .where(eq(lieutenant.lieutenant_id, lieutenantId))
      .limit(1);
    return rows[0]?.tenure_score ?? null;
  }

  // ── P3-B C6 (player review surface + session glance + lieutenant-projection bands, D11/D12) ────────

  /**
   * C6 (design §8) — the player's PENDING flag cards, oldest-flagged-first (natural review-queue order,
   * mirrors `ExceptionsRepository.listPending`'s own "queue order" convention), joined with the flagging
   * lieutenant's `name` (READ-ONLY; `lieutenant` NEVER ALTERed, D2) for the `{id, name}` card shape
   * (`FlagCardProjection`, design §8). The caller (`FlagDisciplineService.listReviewCards`) resolves each
   * row's `trust_budget_bucket` separately (`FlagConvergenceService`, per-lieutenant — a card-level band,
   * not a repository concern). `descriptor`/`flag_reason` forward the ALREADY-{key,params}-shaped jsonb
   * columns verbatim (C3's generators author them that way from the start — no filtering needed here);
   * `deviation_score_internal`/`credibility_tokens` are NEVER selected (R2.2 — nothing to leak by omission).
   */
  async listPendingFlagsForPlayer(playerId: string): Promise<
    Array<{
      flag_id: string;
      lieutenant_id: string;
      lieutenant_name: string;
      descriptor: unknown;
      flag_reason: unknown;
      game_day: number;
    }>
  > {
    return this.db
      .select({
        flag_id: flaggedItemRow.flag_id,
        lieutenant_id: flaggedItemRow.lieutenant_id,
        lieutenant_name: lieutenant.name,
        descriptor: flaggedItemRow.routine_item_descriptor,
        flag_reason: flaggedItemRow.flag_reason,
        game_day: flaggedItemRow.game_day,
      })
      .from(flaggedItemRow)
      .innerJoin(lieutenant, eq(lieutenant.lieutenant_id, flaggedItemRow.lieutenant_id))
      .where(and(eq(flaggedItemRow.player_id, playerId), eq(flaggedItemRow.resolution, 'pending')))
      .orderBy(flaggedItemRow.flagged_at);
  }

  /**
   * C6 (design D11/§1.11) — the session-open glance's `pending_review_count`: a lightweight COUNT (the
   * SAME rows `listPendingFlagsForPlayer` would return, but the glance only needs the length — R2.2
   * "own-content list length", never a hidden scalar). Re-provided DIRECTLY into `SessionModule`'s own
   * `providers:` array (the `ExceptionsRepository`/`ExceptionsProjectionService` P3-A C7 precedent —
   * `FlagDisciplineRepository`'s trivial `@Inject(DB)`-only dependency shape is exactly as cycle-safe) —
   * `session-open-sequence.service.ts` calls this DIRECTLY, never through `FlagDisciplineModule` (which
   * imports `SessionModule`, so the reverse import would be the module cycle, D11's own wall).
   */
  async countPendingFlagsForPlayer(playerId: string): Promise<number> {
    const [row] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(flaggedItemRow)
      .where(and(eq(flaggedItemRow.player_id, playerId), eq(flaggedItemRow.resolution, 'pending')));
    return row?.n ?? 0;
  }

  /**
   * C6 (design §8) — the UNFLAGGED-pending routine-item count (`routine_pending_count`, `GET /v1/flag-
   * review`'s own field): items still `status='pending'` (never touched a flag, never auto/batch-
   * confirmed) — exactly the `batch_confirmed`-candidate set `batchConfirmPendingRoutineItems` below acts
   * on.
   */
  async countPendingRoutineItemsForPlayer(playerId: string): Promise<number> {
    const [row] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(routineItemRow)
      .where(and(eq(routineItemRow.player_id, playerId), eq(routineItemRow.status, 'pending')));
    return row?.n ?? 0;
  }

  /**
   * C6 (design §4 "Batch confirm") — `POST /v1/flag-review/batch-confirm`'s ONLY write: ONE set-based
   * `UPDATE routine_items SET status='batch_confirmed', confirmed_at=now() WHERE player_id=$1 AND
   * status='pending' RETURNING`. Idempotent BY CONSTRUCTION (D3 set-complete): a 2nd call finds nothing
   * left at `status='pending'` for the rows this call already confirmed → ZERO rows, no explicit guard
   * column needed. Confirms ONLY unflagged pending items — a `'flagged'` row is never `'pending'` (the
   * state machine flips it at flag-creation time, C2's `insertFlaggedItemAndMarkRoutineFlagged`), so a
   * flag awaiting its OWN verdict is structurally untouched by this statement, no explicit exclusion
   * required (the falsifiable floor: flagged items UNTOUCHED, asserted by the E2E, not merely assumed).
   */
  async batchConfirmPendingRoutineItems(playerId: string): Promise<number> {
    const updated = await this.db
      .update(routineItemRow)
      .set({ status: 'batch_confirmed', confirmed_at: sql`now()` })
      .where(and(eq(routineItemRow.player_id, playerId), eq(routineItemRow.status, 'pending')))
      .returning({ routine_item_id: routineItemRow.routine_item_id });
    return updated.length;
  }

  /**
   * C6 (design §7/§8, D12) — read-only token peek for the `trust_budget_bucket` projection (BOTH the
   * `GET /v1/flag-review` card and the lieutenant projection, `FlagConvergenceService.
   * trustBudgetBucketForLieutenant`). NEVER lazy-creates a `lieutenant_flag_state` row — mirrors the
   * "never lazy-seed" discipline `LieutenantProjectionService`'s autonomy/signal-drift/standing-order
   * bands already establish (that file's own header): a never-touched lieutenant has no row, and the
   * CALLER resolves that as a full/untouched budget (max tokens), never a phantom 0.
   */
  async getTokensForLieutenant(lieutenantId: string): Promise<number | null> {
    const rows = await this.db
      .select({ credibility_tokens: lieutenantFlagStateRow.credibility_tokens })
      .from(lieutenantFlagStateRow)
      .where(eq(lieutenantFlagStateRow.lieutenant_id, lieutenantId))
      .limit(1);
    return rows[0]?.credibility_tokens ?? null;
  }

  // ── P3-B C7 (BO surface, D14) — stats/history reads + the force-token-reset write ──────────────────

  /**
   * C7 (design §9) — one existence/ownership read: the lieutenant's `player_id` (READ-ONLY;
   * `lieutenant` NEVER ALTERed, D2) or `null` if no such lieutenant exists. The `force-token-reset`
   * controller's ONLY existence check (the endpoint's own "unknown lieutenant -> 404" floor) — a
   * SEPARATE read from the write itself (mirrors `getOwnedFlag`-before-`resolveFlagTransition`'s own
   * "ownership/existence check first, atomic write second" discipline).
   */
  async getLieutenantForAdmin(lieutenantId: string): Promise<{ lieutenant_id: string; player_id: string } | null> {
    const rows = await this.db
      .select({ lieutenant_id: lieutenant.lieutenant_id, player_id: lieutenant.player_id })
      .from(lieutenant)
      .where(eq(lieutenant.lieutenant_id, lieutenantId))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * C7 (design §9) — every lieutenant this player holds (READ-ONLY; `lieutenant` NEVER ALTERed, D2) —
   * the `flag-discipline-stats` endpoint's per-lieutenant row set. `name`/`role_id`/`tenure_score` are
   * the RAW fields the stats diagnostic needs (`tenure_score` is the SAME P5-inverted raw scalar the
   * player-facing projection only ever exposes as `tenure_bucket`, `lieutenant.projection.service.ts`'s
   * own header — never leaked player-side, legitimately RAW here).
   */
  async listLieutenantsForPlayer(
    playerId: string,
  ): Promise<Array<{ lieutenant_id: string; name: string; role_id: number; tenure_score: number }>> {
    return this.db
      .select({
        lieutenant_id: lieutenant.lieutenant_id,
        name: lieutenant.name,
        role_id: lieutenant.role_id,
        tenure_score: lieutenant.tenure_score,
      })
      .from(lieutenant)
      .where(eq(lieutenant.player_id, playerId));
  }

  /**
   * C7 (design §9) — the ALL-TIME (never windowed — a DIFFERENT query from C5's `flag_convergence_
   * evaluation_window_days`-bounded `getConvergenceSampleForLieutenant`) resolution breakdown for one
   * lieutenant's `flagged_items`: the 4 raw counts (`pending`/`validated`/`dismissed`/`timedOut`) PLUS
   * `total` — the `flag-discipline-stats` endpoint's validation-rate/dismissal-rate numerator/
   * denominator (RAW, P5 BO inversion — never forwarded to a player-facing surface).
   */
  async getFlagResolutionCountsForLieutenant(
    lieutenantId: string,
  ): Promise<{ pending: number; validated: number; dismissed: number; timedOut: number; total: number }> {
    const [row] = await this.db
      .select({
        pending: sql<number>`count(*) FILTER (WHERE ${flaggedItemRow.resolution} = 'pending')::int`,
        validated: sql<number>`count(*) FILTER (WHERE ${flaggedItemRow.resolution} = 'validated')::int`,
        dismissed: sql<number>`count(*) FILTER (WHERE ${flaggedItemRow.resolution} = 'dismissed')::int`,
        timedOut: sql<number>`count(*) FILTER (WHERE ${flaggedItemRow.resolution} = 'timed_out')::int`,
        total: sql<number>`count(*)::int`,
      })
      .from(flaggedItemRow)
      .where(eq(flaggedItemRow.lieutenant_id, lieutenantId));
    return {
      pending: row?.pending ?? 0,
      validated: row?.validated ?? 0,
      dismissed: row?.dismissed ?? 0,
      timedOut: row?.timedOut ?? 0,
      total: row?.total ?? 0,
    };
  }

  /**
   * C7 (design §9) — the ALL-TIME total `routine_items` row count for one lieutenant (every status) —
   * the `flag-discipline-stats` endpoint's flag-RATE denominator (`flags_raised_total / routine_items_
   * total` — "how often this lieutenant's routine items get flagged at all").
   */
  async countRoutineItemsForLieutenant(lieutenantId: string): Promise<number> {
    const [row] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(routineItemRow)
      .where(eq(routineItemRow.lieutenant_id, lieutenantId));
    return row?.n ?? 0;
  }

  /**
   * C7 (design §9) — the `flag-history` endpoint's ONLY read: every `flagged_items` row for one
   * lieutenant, newest-flagged-first — full raw rows (`deviation_score_internal` INCLUDED, P5 BO
   * inversion — canon "full flag history per lieutenant", `flag_discipline.md:140`). No status filter
   * (every resolution, including still-`pending`) — the "diagnostic balance" canon names. LEFT JOINs
   * `routine_items` for the originating `generator` (never bare-int/bare-enum in the BO surface without
   * provenance — the hard rule this chunk's controller/SFCs honor): `null` when the source row was
   * pruned past retention (D4 — the flag's OWN history survives via `routine_item_descriptor`'s
   * snapshot, but the generator classification lives ONLY on the (possibly-pruned) source row).
   */
  async listFlagHistoryForLieutenant(
    lieutenantId: string,
  ): Promise<Array<FlaggedItemRow & { generator: RoutineGeneratorEnumTs | null }>> {
    return this.db
      .select({
        flag_id: flaggedItemRow.flag_id,
        player_id: flaggedItemRow.player_id,
        lieutenant_id: flaggedItemRow.lieutenant_id,
        routine_item_id: flaggedItemRow.routine_item_id,
        routine_item_descriptor: flaggedItemRow.routine_item_descriptor,
        flag_reason: flaggedItemRow.flag_reason,
        deviation_score_internal: flaggedItemRow.deviation_score_internal,
        emitted_tick: flaggedItemRow.emitted_tick,
        game_day: flaggedItemRow.game_day,
        flagged_at: flaggedItemRow.flagged_at,
        resolution: flaggedItemRow.resolution,
        token_returned: flaggedItemRow.token_returned,
        resolved_at: flaggedItemRow.resolved_at,
        resolved_at_tick: flaggedItemRow.resolved_at_tick,
        generator: routineItemRow.generator,
      })
      .from(flaggedItemRow)
      .leftJoin(routineItemRow, eq(routineItemRow.routine_item_id, flaggedItemRow.routine_item_id))
      .where(eq(flaggedItemRow.lieutenant_id, lieutenantId))
      .orderBy(desc(flaggedItemRow.flagged_at));
  }

  /**
   * `forceResetTokensToMax` (design §9, D14 — "same statement family as D8") — the admin `force-token-
   * reset` mutation's ONLY write: ONE `INSERT … ON CONFLICT (lieutenant_id) DO UPDATE SET credibility_
   * tokens = $maxTokens …` (an UPSERT — the ensureState-and-set-to-max shape, collapsed into a SINGLE
   * atomic statement rather than ensureState-then-creditToken, D3: never a read-check-then-write race).
   * Unlike the epoch/day-guarded ticks (D7/D8), this is an ADMIN FORCE action — it always applies
   * (no guard column to skip a re-run): calling it twice in a row is still safe (idempotent-by-VALUE,
   * simply re-asserting the SAME max both times), just not "zero-write-on-repeat" like the ticks. Works
   * whether the lieutenant has EVER been touched before (never-touched -> the row is created AT max,
   * D2's own lazy-create discipline) or already has a state row (reset to max regardless of the current
   * balance — the SAME "reset to max regardless of recent burns" canon posture D8 carries).
   */
  async forceResetTokensToMax(lieutenantId: string, playerId: string, maxTokens: number): Promise<number> {
    // last_regen_game_day (W1.1-d C1.2 — ANCRE ABSOLUE): only the INSERT branch needs it (a
    // never-touched lieutenant, D2's own lazy-create discipline); the ON CONFLICT UPDATE branch never
    // touches this column (unchanged on reset), same as `ensureState`'s own COALESCE-free direct read.
    const [clockRow] = await this.db
      .select({ game_minute: citySimClock.game_minute })
      .from(citySimClock)
      .where(eq(citySimClock.player_id, playerId))
      .limit(1);
    const currentGameDay = deriveGameDay(clockRow?.game_minute ?? 0, citySimTunables.inGameDayLengthMinutes);
    const [row] = await this.db
      .insert(lieutenantFlagStateRow)
      .values({
        lieutenant_id: lieutenantId,
        player_id: playerId,
        credibility_tokens: maxTokens,
        last_regen_game_day: currentGameDay,
      })
      .onConflictDoUpdate({
        target: lieutenantFlagStateRow.lieutenant_id,
        set: { credibility_tokens: maxTokens, updated_at: sql`now()` },
      })
      .returning({ tokens: lieutenantFlagStateRow.credibility_tokens });
    return row?.tokens ?? maxTokens;
  }
}
