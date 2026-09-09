// IMPLEMENTS: docs/superpowers/specs/2026-08-13-w1.3-monetization-design.md §1.10 (the guarded-
//             debit discipline — calqué sur `raid-exception.repository.ts:25-32`, mais avec `tx:
//             Tx` REQUIS, ce précédent étant pool-backed) + §3-C3 (the debit that must never
//             go negative).
// -- W1.3-C3 -- 2026-08-13 -- (debitGuarded — the item-purchase debit.)
// -- W1.3-C4 -- 2026-08-13 -- (creditUnconditional — the receipt-validate credit.)
// -- W1.3-C5 -- 2026-08-13 -- (applyDelta — the BO subvention; ± per schema_player_economy_
//    state.md §9.1 "delta_marks: int".)
// -- W1.3-C6 -- 2026-08-13 -- (clampedDebitForRefund — §5-A3 policy (i), clamp at 0: the player
//    keeps the cosmetic, refund_policy.md:128 "keep them granted if the player likes them".)
// -- FIX (review ⊥ B1, 2026-08-13) -- `creditUnconditional` had NO cardinality check: a missing
//    `economy_states` row made the `UPDATE` match 0 rows SILENTLY (no `.returning()`, no throw) —
//    the caller committed anyway, the receipt (already inserted, unique-indexed) was burned
//    forever, and the route returned `200 { marks_credited }` having credited nothing. The other
//    three write methods in this SAME file already guard cardinality (`debitGuarded` returns
//    false, `applyDelta`/`clampedDebitForRefund` return null) — this was an omission, not a
//    policy. Fixed: `.returning()` + throw `MissingEconomyStateRowError` on 0 rows, which rolls
//    the WHOLE transaction back (the `iap_transactions` insert included) — the receipt is NOT
//    consumed, and the caller can retry once the row exists.
// -- FIX (review ⊥ I4, 2026-08-13) -- `applyDelta` (the BO subvention) applied a signed delta
//    with NO floor — review ⊥ measured design §3-C6 claims F-C6 is "the ONLY path capable of
//    making the balance negative"; an unclamped BO subvention makes that false, in the SAME lot.
//    Not the conservative reading of "delta_marks: int" either (canon silence ≠ license for a
//    state the lot elsewhere declares undesirable, §5-A3). Fixed: `applyDelta` now REFUSES
//    (returns 'INSUFFICIENT') a delta that would drive the balance negative — same posture as
//    `debitGuarded`, not a silent clamp (an operator-requested amount should fail loud, not be
//    silently truncated) — see `iap-economy-admin.controller.ts` for the 409 mapping.
//
// `MarksWalletRepository` — every WRITE this lot makes to `economy_states.marks`. `tx: Tx`
// REQUIRED on every method (never `executor?: Tx` — `friction-budget.repository.ts`'s optional
// form is explicitly the wrong precedent, design §1.10) — the caller always already holds the tx
// that also writes `marks_ledger` in the SAME transaction (the invariant, C2).

import { Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { economyState } from '../../db/schema/player_economy_state';

/** A Drizzle transaction handle (mirrors money-holding.repository.ts:46's own local Tx alias). */
type Tx = Parameters<Parameters<DrizzleClient['transaction']>[0]>[0];

/**
 * Thrown by a WRITE method of this repository when the guarded `UPDATE`/`.returning()` matches 0
 * rows because the player has no `economy_states` row at all (review ⊥ B1) — distinct from an
 * ordinary "insufficient balance" outcome (those return a sentinel value, never throw). Thrown
 * INSIDE the caller's transaction so it rolls the WHOLE attempt back (any `iap_transactions`
 * insert or `iap_entitlement` grant already performed in the SAME tx is undone too).
 */
export class MissingEconomyStateRowError extends Error {
  constructor(public readonly playerId: string) {
    super(`economy_states row missing for player ${playerId} — write matched 0 rows.`);
    this.name = 'MissingEconomyStateRowError';
  }
}

@Injectable()
export class MarksWalletRepository {
  /**
   * GUARDED debit — `UPDATE economy_states SET marks = marks - amount WHERE player_id = ? AND
   * marks >= amount` (the `raid-exception.repository.ts:25-32` predicate, byte-mirrored onto
   * `marks`). Returns false on 0 rows (insufficient balance — the caller 409s; the transaction
   * this runs in rolls back the WHOLE attempt, including any entitlement insert already
   * performed, so a rejected purchase leaves NO state change).
   */
  async debitGuarded(tx: Tx, playerId: string, amount: number): Promise<boolean> {
    const rows = await tx
      .update(economyState)
      .set({ marks: sql`${economyState.marks} - ${amount}` })
      .where(and(eq(economyState.player_id, playerId), sql`${economyState.marks} >= ${amount}`))
      .returning({ marks: economyState.marks });
    return rows.length > 0;
  }

  /**
   * UNCONDITIONAL credit — `UPDATE economy_states SET marks = marks + amount WHERE player_id = ?`.
   * No BALANCE guard needed (a non-negative grant can never drive the balance negative) — but a
   * CARDINALITY guard IS needed (review ⊥ B1): `.returning()` + throw `MissingEconomyStateRowError`
   * on 0 rows, so a missing `economy_states` row rolls the WHOLE caller transaction back instead
   * of silently no-op'ing while the caller commits a burned receipt. The caller
   * (`IapPurchaseValidateService`, C4) writes the paired `marks_ledger` row in the SAME tx.
   */
  async creditUnconditional(tx: Tx, playerId: string, amount: number): Promise<void> {
    const rows = await tx
      .update(economyState)
      .set({ marks: sql`${economyState.marks} + ${amount}` })
      .where(eq(economyState.player_id, playerId))
      .returning({ marks: economyState.marks });
    if (rows.length === 0) {
      throw new MissingEconomyStateRowError(playerId);
    }
  }

  /**
   * BO subvention (`PATCH /admin/players/:id/economy/marks`, C5) — applies a SIGNED delta
   * (positive or negative; `schema_player_economy_state.md §9.1` — `delta_marks: int`). Reads
   * under `FOR UPDATE` so the before/after pair is exact even under concurrent writers. Returns
   * `null` when the player has no economy_states row (the caller 404s) ; returns
   * `'INSUFFICIENT'` (review ⊥ I4) when the delta would drive the balance negative — REFUSED, not
   * silently clamped, so an operator gets a clear rejection rather than a truncated amount. This
   * preserves design §3-C6's claim that the refund clamp is the ONLY path that can approach zero
   * from a spent balance — a BO subvention can no longer manufacture a negative one either.
   */
  async applyDelta(tx: Tx, playerId: string, delta: number): Promise<{ before: number; after: number } | null | 'INSUFFICIENT'> {
    const rows = await tx
      .select({ marks: economyState.marks })
      .from(economyState)
      .where(eq(economyState.player_id, playerId))
      .for('update')
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    const after = row.marks + delta;
    if (after < 0) return 'INSUFFICIENT';
    await tx.update(economyState).set({ marks: after }).where(eq(economyState.player_id, playerId));
    return { before: row.marks, after };
  }

  /**
   * Refund reversal (`POST /admin/iap-transactions/:txn_id/refund`, `restore_in_game=true`, C6).
   * §5-A3 policy (i): CLAMP at 0, never negative — the player already spent some of the grant
   * (design's own dimensioned scenario: 600 credited, 80 spent elsewhere, 570 left ⇒ the refund
   * removes 570, NOT 600). Returns the ACTUAL amount removed (`min(amountToRemove, current)`) so
   * the caller writes a ledger entry matching what really left the wallet — a `−600` entry here
   * would violate `SUM(delta_marks) == marks`. Reads under `FOR UPDATE` (same reasoning as
   * `applyDelta`). Returns null when the player has no economy_states row.
   */
  async clampedDebitForRefund(tx: Tx, playerId: string, amountToRemove: number): Promise<{ actualDelta: number; after: number } | null> {
    const rows = await tx
      .select({ marks: economyState.marks })
      .from(economyState)
      .where(eq(economyState.player_id, playerId))
      .for('update')
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    const actualDelta = Math.min(amountToRemove, row.marks);
    const after = row.marks - actualDelta;
    await tx.update(economyState).set({ marks: after }).where(eq(economyState.player_id, playerId));
    return { actualDelta, after };
  }
}
