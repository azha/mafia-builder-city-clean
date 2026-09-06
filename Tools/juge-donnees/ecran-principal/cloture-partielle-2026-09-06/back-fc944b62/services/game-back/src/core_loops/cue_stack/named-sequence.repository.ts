// IMPLEMENTS: docs/superpowers/plans/2026-07-13-p3-D-cue-annealing-plan.md §C5 (Named Sequences —
//             save/list/apply, cap-5 I4 atomic)
//             Design: docs/superpowers/specs/2026-07-13-p3-D-cue-annealing-design.md §8 (Loop 6 verbatim
//             — the I4 SQL shape: "INSERT … SELECT … WHERE (SELECT count(*) FROM named_sequences WHERE
//             player_id=$1) < cap RETURNING" + UNIQUE (player_id, name)) + §13.2 (table shape, mig 0129).
//             Decisions: §1.7 D7 (NamedSequence = snapshot template, cap 5 = insert conditionnel atomique
//             I4, non exprimable en CHECK).
//             — P3-D C5 — 2026-07-14 / ⊥ FIX (BLOCKING, reviewer-caught) — 2026-07-14
//
// ★ ⊥ FIX — the ORIGINAL `saveAtomic` shipped a `WITH lock AS (SELECT pg_advisory_xact_lock(hashtext(
// player_id))) INSERT … SELECT … WHERE (SELECT count(*) …) < cap ON CONFLICT … RETURNING` single
// statement. THIS DOES NOT WORK: `lock` is a CTE that nothing in the outer INSERT/SELECT/WHERE/RETURNING
// ever REFERENCES — Postgres proves it is dead code and PRUNES it outright (never executes it, never
// evaluates `pg_advisory_xact_lock` at all). Empirically reproduced on THIS stack: `WITH lock AS (SELECT
// pg_advisory_xact_lock(hashtext('x')), pg_sleep(3)) SELECT 1` returns INSTANTLY (the 3s sleep never ran)
// and a concurrent `pg_locks` probe mid-statement shows ZERO advisory locks held. The cap rested on the
// bare `count(*) < cap` subquery ALONE, which is NOT concurrency-safe under READ COMMITTED (each session's
// own statement snapshot is independent — two overlapping callers can both read count=4<5 and both insert,
// landing 6 rows for a cap of 5). Prior header claimed this codebase has "exactly ONE precedent" for the
// unreferenced-CTE-lock shape (`patrol.repository.ts#seedSixPrecincts`) — FALSE: a `pg_advisory_xact_lock`
// wrapped in an unreferenced `WITH` CTE appears at 7+ sites (`patrol.repository.ts`, `sparse_citizens.
// repository.ts`, `deal-lek.repository.ts`, `buffer-bloat.repository.ts`, `police_memory.repository.ts`,
// `cohesion.repository.ts`, `inspection.repository.ts`). ALL of them share the SAME pruning bug (the lock
// never fires there either) — but it is HARMLESS at those 7 sites specifically because each one ALSO
// carries an independent DB-level backstop that makes the invariant hold regardless of the lock (a `NOT
// EXISTS` guard + the target row's own PK/UNIQUE index — `seedSixPrecincts`'s own `WHERE NOT EXISTS (...)`
// guard, e.g.). THIS site had no such backstop for the AGGREGATE cap (a per-player row-COUNT is not
// expressible as a UNIQUE/PK constraint, design §8/D7) — the broken lock was actually LOAD-BEARING here,
// which is why the bug bit. TD candidate noted for C9 closeout (decisions §5): the codebase-wide
// unreferenced-CTE advisory-lock anti-pattern, 7+ sites, currently harmless-by-backstop everywhere else.
//
// THE REAL FIX (reviewer-verified shape, ALSO empirically confirmed on this stack — a bare top-level
// `SELECT pg_advisory_xact_lock(...)` statement DOES show up in `pg_locks`, `mode=ExclusiveLock,
// granted=t`, and a concurrent session attempting the SAME key genuinely blocks on it): `saveAtomic` is now
// an EXPLICIT two-statement transaction (`this.db.transaction`, the `session.repository.ts#openFresh`
// idiom for "more than one statement must share one atomic scope"). Statement 1 is its OWN plain
// top-level `SELECT pg_advisory_xact_lock(hashtext(player_id))` — genuinely executed, genuinely blocking.
// Statement 2 (the INSERT…SELECT…WHERE count<cap…RETURNING) runs SECOND, inside the SAME transaction —
// its READ COMMITTED snapshot is taken FRESH at THAT statement's own start, which is AFTER the lock was
// granted: if this call had to wait behind a concurrent saver holding the SAME player's lock, by the time
// it acquires the lock the other saver has ALREADY COMMITTED (xact-scoped advisory locks release exactly
// at commit/rollback) — so this statement's fresh count(*) correctly observes that committed insert. A
// SINGLE statement can NEVER be fixed this way even with a REFERENCED CTE (verified in review): a
// statement's snapshot is fixed at ITS OWN start, which is BEFORE any lock acquired mid-statement by that
// SAME statement could matter — the lock and the count-read MUST be two separate statements for the
// ordering to do any work. The UNIQUE (player_id, name) race (a genuine duplicate save, not concurrency
// noise) is handled SEPARATELY by `ON CONFLICT (player_id, name) DO NOTHING` — Postgres's own index
// arbitrates that one race-safely with NO lock needed (recruitment.repository.ts's own header: "no
// precedent … for catching a driver-specific 23505" — ON CONFLICT is the established non-catching idiom).
//
// `NamedSequenceRepository` — the persisted access layer for `named_sequences` (migration 0127, C1). ONE
// 0-TOCTOU writer (`saveAtomic`, I4's own arbiter) + 2 plain reads (`listForPlayer`/`findByIdForPlayer`,
// ownership-scoped — the `recruitment.repository.ts#getCandidateForPlayer` "foreign = nonexistent"
// convention: `findByIdForPlayer` for another player's sequence_id returns `null`, identical to a genuinely
// nonexistent id).

import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { namedSequenceRow, type NamedSequenceRow } from '../../db/schema/cue_annealing';

/** Defensive dual-shape read for a raw `db.execute` result (the `cue-stack.repository.ts#rowsOf` idiom). */
function rowsOf(result: unknown): Array<Record<string, unknown>> {
  return (result as { rows?: Array<Record<string, unknown>> }).rows ?? (result as Array<Record<string, unknown>>);
}

/** `saveAtomic`'s outcome on the 0-rows branch — the CALLER (service) needs to know WHY to pick the right
 *  409 code; both facts are already true on disk by the time this disambiguation read runs (it explains a
 *  decision the atomic statement above already made, it never MAKES the decision). 3 members, each with a
 *  SINGLE literal `reason` — NOT `{ row: null; reason: 'cap' | 'duplicate_name' }` (a combined 2-literal
 *  member): TS's discriminated-union narrowing cannot fully eliminate a member across two SEQUENTIAL
 *  `if (x.reason === …) throw` checks on the same multi-literal field (verified: a 2-literal member leaves
 *  `.row` typed `Row | null` after both throws) — 3 single-literal members narrow cleanly. */
export type SaveOutcome =
  | { row: NamedSequenceRow; reason: 'ok' }
  | { row: null; reason: 'cap' }
  | { row: null; reason: 'duplicate_name' };

@Injectable()
export class NamedSequenceRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * I4's own arbiter (design §8 verbatim shape, decisions D7) — see file header for the FULL concurrency
   * argument. `templateJson` is the ALREADY-stripped-of-status `CueStackSlot`-shaped array (the caller,
   * `NamedSequenceService`, builds it) — this method performs ZERO business validation, it is the atomic
   * persist step only. `cap` is resolved by the CALLER (`coreLoopsTunables.cueStackNamedSequencesMax`)
   * BEFORE this call, mirroring `StructuralDecisionGovernorRepository.reserveStructuralSlot`'s own
   * caller-resolves-the-limit convention.
   */
  async saveAtomic(playerId: string, name: string, templateJson: string, cap: number): Promise<SaveOutcome> {
    return this.db.transaction(async (tx): Promise<SaveOutcome> => {
      // Statement 1 — the REAL advisory-lock acquisition (a plain top-level statement, not a pruned CTE —
      // see file header). Blocks until any OTHER tx holding the SAME hashtext(playerId) key has committed
      // or rolled back; auto-released at THIS tx's own commit/rollback (xact-scoped).
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${playerId}))`);

      // Statement 2 — NOW the cap-check-and-insert, as its OWN statement. Its READ COMMITTED snapshot is
      // taken fresh at THIS statement's start — i.e. strictly AFTER the lock above was granted — so a
      // caller that had to wait behind a concurrent saver correctly observes that saver's COMMITTED insert
      // once it finally acquires the lock and runs this count(*).
      const result = await tx.execute(sql`
        INSERT INTO ${namedSequenceRow} (sequence_id, player_id, name, slots_template)
        SELECT gen_random_uuid(), ${playerId}::uuid, ${name}, ${templateJson}::jsonb
        WHERE (SELECT count(*) FROM ${namedSequenceRow} WHERE ${namedSequenceRow.player_id} = ${playerId}::uuid) < ${cap}
        ON CONFLICT (player_id, name) DO NOTHING
        RETURNING sequence_id, player_id, name, slots_template, created_at
      `);
      const row = rowsOf(result)[0];
      if (row) return { row: row as unknown as NamedSequenceRow, reason: 'ok' };

      // Disambiguate the 0-rows outcome, IN THE SAME transaction (same lock scope, same commit boundary) —
      // a PLAIN read, purely for the right error code/message; the atomic gate above already decided the
      // real outcome (this never re-decides anything). KNOWN LIMITATION (MINOR, non-blocking): a
      // concurrent DELETE of the exact (player_id, name) row landing BETWEEN the INSERT above and this
      // read could flip which reason gets reported (`duplicate_name` vs `cap`) — this is a benign race on
      // the WORDING/error-code choice only, never on correctness of the enforcement itself (the write was
      // already, correctly, refused by the statement above before this read ever runs).
      const dup = await tx
        .select({ sequence_id: namedSequenceRow.sequence_id })
        .from(namedSequenceRow)
        .where(and(eq(namedSequenceRow.player_id, playerId), eq(namedSequenceRow.name, name)))
        .limit(1);
      if (dup.length > 0) return { row: null, reason: 'duplicate_name' };
      return { row: null, reason: 'cap' };
    });
  }

  /** `GET .../named-sequences` (design §15.1) — every saved template for this player, oldest first
   *  (creation order — the order the player themselves saved them in). */
  async listForPlayer(playerId: string): Promise<NamedSequenceRow[]> {
    return this.db
      .select()
      .from(namedSequenceRow)
      .where(eq(namedSequenceRow.player_id, playerId))
      .orderBy(asc(namedSequenceRow.created_at));
  }

  /** `POST .../named-sequences/:id/apply` (design §15.1) — ownership-scoped read; a foreign/nonexistent
   *  `sequenceId` is indistinguishable (the `recruitment.repository.ts#getCandidateForPlayer` convention). */
  async findByIdForPlayer(playerId: string, sequenceId: string): Promise<NamedSequenceRow | null> {
    const rows = await this.db
      .select()
      .from(namedSequenceRow)
      .where(and(eq(namedSequenceRow.sequence_id, sequenceId), eq(namedSequenceRow.player_id, playerId)))
      .limit(1);
    return rows[0] ?? null;
  }
}
