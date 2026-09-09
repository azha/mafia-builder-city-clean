// IMPLEMENTS: docs/tech/09_data_model/schema_iap_monetization.md §2 (marks_ledger) + design §3-C2
//             (the invariant — every mutation of economy_states.marks writes exactly one row here,
//             in the SAME transaction).
// -- W1.3-C2 -- 2026-08-13 --
//
// `MarksLedgerRepository` — the KNOWN writer of `marks_ledger` for every mutation issued through
// this module (review ⊥ M1, fixed: "the ONLY writer" was false in the very lot that writes it —
// `auth.service.ts`'s `signup` inlines its own INSERT on `tx` for the welcome grant, precedent
// `:409-412`, by design — not a second, uncoordinated writer, but a second CALL SITE. Migration
// 0148's backfill is a third. "Unique" ages faster than the fact it qualifies — write "known
// writer", never "only"). `tx: Tx` REQUIRED (first parameter,
// precedent `money-holding.repository.ts:283-284` — a repository cannot join an ambient transaction
// on this pool-backed `db`, `db/index.ts:30`; the caller ALWAYS already holds the tx that debits/
// credits `economy_states.marks`, and this insert MUST land in that SAME transaction or the
// invariant `SUM(delta_marks) == marks` can drift). Never an `executor?: Tx` optional form
// (`friction-budget.repository.ts`'s `?:` pattern is explicitly the WRONG precedent here — an
// omitted arg would silently insert outside the guarding transaction).

import { Injectable } from '@nestjs/common';

import type { DrizzleClient } from '../../db';
import { marksLedger } from '../../db/schema/iap_ledger';

/** A Drizzle transaction handle (mirrors money-holding.repository.ts:46's own local Tx alias). */
type Tx = Parameters<Parameters<DrizzleClient['transaction']>[0]>[0];

export interface MarksLedgerEntry {
  playerId: string;
  deltaMarks: number;
  reasonSku: string;
  receiptHash?: string | null;
}

@Injectable()
export class MarksLedgerRepository {
  async insert(tx: Tx, entry: MarksLedgerEntry): Promise<void> {
    await tx.insert(marksLedger).values({
      player_id: entry.playerId,
      delta_marks: entry.deltaMarks,
      reason_sku: entry.reasonSku,
      receipt_hash: entry.receiptHash ?? null,
    });
  }
}
