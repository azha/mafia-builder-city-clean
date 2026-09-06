// IMPLEMENTS: docs/tech/17_auth_and_accounts/authorization_rbac.md §Two-person rule (:134-159) +
//             R-RBAC-3 (:245) + R-RBAC-6 (:248)
//             Périmètre: docs/superpowers/specs/2026-09-02-w12a-two-person-perimetre.md §4 pt.2
//             Schema: db/schema/two_person_approval.ts (migration 0152, C1 — already applied/proven,
//             see that migration's own header for the 2 CHECK + 1 partial-unique-index proof).
//             — W1.2-a C2 — 2026-09-02 --
//
// `TwoPersonApprovalRepository` — the ONLY writer of `two_person_approval`. The table's own 3 base-
// level invariants (initiator ≠ approver, state↔presence coherence, one AWAITING_SECOND request per
// context) are NEVER re-implemented here as a pre-check-then-write pair (a TOCTOU under READ
// COMMITTED, the SAME race `named-sequence.repository.ts#saveAtomic`'s header documents at length for
// its own cap-5 invariant) — every write below is a SINGLE guarded statement (`INSERT … WHERE
// count(*) < cap … ON CONFLICT … DO NOTHING` / `UPDATE … WHERE <guard> RETURNING`) so a 0-row outcome
// can NEVER be confused with the base rejecting the write via a raised CHECK exception (property #5 of
// this chunk's brief: "une violation de contrainte de base ne doit pas sortir en 500" — the guards
// below are written so the CHECK constraints are structurally unreachable, never caught).
//
// Precedent this file follows LITERALLY (recopied, not reformulated — CLAUDE.md):
//   - `executor?: TwoPersonTx` + `(executor ?? this.db)` — `friction-budget.repository.ts:87,184,
//     296,335,367` (a repository cannot open ITS OWN transaction and expect it to join an ambient
//     one — `db` is pool-backed, `db/index.ts:30`).
//   - the 2-statement `pg_advisory_xact_lock` THEN guarded `INSERT … WHERE count(*) < cap … ON
//     CONFLICT … DO NOTHING` shape for a per-key row-COUNT cap that cannot be a UNIQUE/CHECK
//     constraint — `named-sequence.repository.ts#saveAtomic` (its own header explains at length why
//     a single statement, or an unreferenced-CTE lock, cannot make this concurrency-safe; ON CONFLICT
//     alone already race-safely arbitrates the SEPARATE duplicate-pending-context race via the table's
//     own partial unique index — no lock needed for that one, same file's own note).
//   - the guarded-UPDATE-then-plain-disambiguation-read idiom (0 rows ⇒ read WHY, never re-decide) —
//     `named-sequence.repository.ts`'s own `SaveOutcome` 3-member discriminated union.
//   - the local `rowsOf` dual-shape raw-execute reader — duplicated per-file across 25 repositories in
//     this codebase (no shared helper exists; `cue-cascade-exception-producer.service.ts`'s own copy
//     is the one every later file's docstring cites).

import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { twoPersonApprovalRow, type TwoPersonStateEnumTs } from '../../db/schema/two_person_approval';

/** Defensive dual-shape read for a raw `db.execute` result (the `cue-cascade-exception-producer.
 *  service.ts#rowsOf` idiom, duplicated per-file across this codebase — no shared helper exists). */
function rowsOf(result: unknown): Array<Record<string, unknown>> {
  return (result as { rows?: Array<Record<string, unknown>> }).rows ?? (result as Array<Record<string, unknown>>);
}

/** The Drizzle transaction-callback client type (verbatim `friction-budget.repository.ts#FrictionTx`'s
 *  own shape — extracted via `Parameters<...>`, never guessed, so it is ALWAYS exactly the type
 *  `this.db.transaction(async (tx) => …)` infers). */
export type TwoPersonTx = Parameters<Parameters<DrizzleClient['transaction']>[0]>[0];

function toNullableId(v: unknown): string | null {
  return v === null || v === undefined ? null : String(v);
}

/** One `two_person_approval` row, the composite `authorization_rbac.md:145-156` verbatim (`target_ref`
 *  materialized as the type+id pair the schema itself uses, ADR already made at C1). Returned by every
 *  write path that produces a row (`insertRequest`'s 'ok' outcome, `decideAtomic`'s 'ok' outcome) and
 *  by `listPending` — ONE shape, no per-endpoint partial projection. */
export interface TwoPersonApprovalRowView {
  readonly approvalId: string;
  readonly initiatorAccountId: string;
  readonly approverAccountId: string | null;
  readonly permissionKey: string;
  readonly targetEntityType: string;
  readonly targetEntityId: string | null;
  readonly state: TwoPersonStateEnumTs;
  readonly requestedAt: Date;
  readonly decidedAt: Date | null;
  readonly expiresAt: Date;
  readonly consumedAt: Date | null;
}

function mapRow(r: Record<string, unknown>): TwoPersonApprovalRowView {
  return {
    approvalId: String(r['approval_id']),
    initiatorAccountId: String(r['initiator_account_id']),
    approverAccountId: toNullableId(r['approver_account_id']),
    permissionKey: String(r['permission_key']),
    targetEntityType: String(r['target_entity_type']),
    targetEntityId: toNullableId(r['target_entity_id']),
    state: r['state'] as TwoPersonStateEnumTs,
    requestedAt: r['requested_at'] as Date,
    decidedAt: (r['decided_at'] as Date | null) ?? null,
    expiresAt: r['expires_at'] as Date,
    consumedAt: (r['consumed_at'] as Date | null) ?? null,
  };
}

export interface RequestInput {
  readonly initiatorAccountId: string;
  readonly permissionKey: string;
  readonly targetEntityType: string;
  readonly targetEntityId: string | null;
}

/** `insertRequest`'s outcome — 0-rows-from-the-guarded-INSERT is disambiguated by a PLAIN read in the
 *  SAME transaction (the guarded write above already decided the real outcome; this never re-decides
 *  anything — the `SaveOutcome` idiom `named-sequence.repository.ts` establishes). */
export type RequestOutcome =
  | { row: TwoPersonApprovalRowView; reason: 'ok' }
  | { row: null; reason: 'cap' }
  | { row: null; reason: 'duplicate_pending' };

/** `decideAtomic`'s outcome. `self` is R-RBAC-3 caught BEFORE the DB CHECK ever could be (the guarded
 *  UPDATE's own `initiator_account_id <> deciderAccountId` clause) — property #5: a violation never
 *  reaches the base to begin with, so there is nothing to catch. `expired` vs `terminal` are two
 *  DIFFERENT reasons a same-shape 0-row result can occur; disambiguated by the SAME plain read. */
export type DecideOutcome =
  | { row: TwoPersonApprovalRowView; reason: 'ok' }
  | { row: null; reason: 'not_found' }
  | { row: null; reason: 'self' }
  | { row: null; reason: 'expired' }
  | { row: null; reason: 'terminal' };

/** `consumeAtomic`'s outcome — usage-once (property #4): a 0-row guarded UPDATE is ALWAYS an error
 *  (never a silent success), disambiguated only as far as "no approval for this context at all" vs
 *  "one exists but is not currently consumable" (wrong state / expired / already consumed). */
export type ConsumeOutcome =
  | { approvalId: string; reason: 'ok' }
  | { approvalId: null; reason: 'not_found' }
  | { approvalId: null; reason: 'not_consumable' };

@Injectable()
export class TwoPersonApprovalRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * Staff A's `POST .../request` (canon `:138`). ONE guarded statement inside a 2-statement
   * transaction (advisory lock ON the initiator, THEN the guarded insert — see file header): the cap
   * (`T.auth.two_person_max_pending_per_initiator`, property #2 of this chunk's brief — impossible in
   * CHECK, a per-initiator row COUNT) is enforced by the `WHERE count(*) < cap` subquery; the SEPARATE
   * "one AWAITING_SECOND request per context" invariant (the table's own partial UNIQUE index) is
   * enforced by `ON CONFLICT … DO NOTHING`, race-safely, with NO lock needed for that one (Postgres's
   * own index arbitrates it — `named-sequence.repository.ts`'s header, verbatim reasoning).
   *
   * `executor`: if the caller already holds a `tx` (none does in THIS lot — `consume()` is the only
   * forward-looking join point later chunks may thread one through), this method runs its 2 statements
   * ON that same tx instead of opening its own — never nests a SECOND `this.db.transaction(...)`.
   */
  async insertRequest(
    input: RequestInput,
    ttlMinutes: number,
    maxPending: number,
    executor?: TwoPersonTx,
  ): Promise<RequestOutcome> {
    const run = async (tx: TwoPersonTx): Promise<RequestOutcome> => {
      // Statement 1 — the REAL advisory-lock acquisition (a plain top-level statement — see
      // `named-sequence.repository.ts`'s header for why a pruned unreferenced-CTE lock does NOT
      // work). Scoped to this initiator: the cap this lock protects is per-initiator.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${input.initiatorAccountId} || ':two_person_pending_cap'))`);

      // Statement 2 — NOW the cap-check-and-insert, as its OWN statement (its READ COMMITTED
      // snapshot is taken fresh, strictly AFTER the lock above was granted).
      const result = await tx.execute(sql`
        INSERT INTO ${twoPersonApprovalRow}
          (initiator_account_id, permission_key, target_entity_type, target_entity_id, expires_at)
        SELECT ${input.initiatorAccountId}::uuid, ${input.permissionKey}, ${input.targetEntityType},
               ${input.targetEntityId}::uuid, now() + (${ttlMinutes} * interval '1 minute')
        WHERE (
          SELECT count(*) FROM ${twoPersonApprovalRow}
          WHERE ${twoPersonApprovalRow.initiator_account_id} = ${input.initiatorAccountId}::uuid
            AND ${twoPersonApprovalRow.state} = 'AWAITING_SECOND'
        ) < ${maxPending}
        ON CONFLICT (initiator_account_id, permission_key, target_entity_type, target_entity_id)
          WHERE state = 'AWAITING_SECOND'
          DO NOTHING
        RETURNING approval_id, initiator_account_id, approver_account_id, permission_key,
                  target_entity_type, target_entity_id, state, requested_at, decided_at,
                  expires_at, consumed_at
      `);
      const row = rowsOf(result)[0];
      if (row) return { row: mapRow(row), reason: 'ok' };

      // Disambiguate the 0-rows outcome IN THE SAME transaction (same lock scope) — a PLAIN read,
      // purely to pick the right error; the guarded statement above already decided the real outcome.
      const countResult = await tx.execute(sql`
        SELECT count(*)::int AS n FROM ${twoPersonApprovalRow}
        WHERE ${twoPersonApprovalRow.initiator_account_id} = ${input.initiatorAccountId}::uuid
          AND ${twoPersonApprovalRow.state} = 'AWAITING_SECOND'
      `);
      const n = Number(rowsOf(countResult)[0]?.['n'] ?? 0);
      if (n >= maxPending) return { row: null, reason: 'cap' };
      return { row: null, reason: 'duplicate_pending' };
    };
    if (executor) return run(executor);
    return this.db.transaction(run);
  }

  /**
   * Staff B's `POST .../:id/decide` (canon `:139-140`). ONE guarded UPDATE — no advisory lock needed
   * (a single-row conditional write, the SAME `route-lifecycle.repository.ts#severIfNotAlready`-class
   * idiom this codebase already uses for "guarded UPDATE … RETURNING, exactly-once"). The guard clause
   * `initiator_account_id <> deciderAccountId` makes R-RBAC-3 (property #1: the approver identity
   * comes from the caller's OWN verified token, never the body — enforced one layer up, at the
   * controller) structurally impossible to violate from THIS write — the DB CHECK
   * `two_person_approval_distinct_ck` backstops it but can never actually fire from here.
   *
   * `expires_at > now()` in the guard is the DB clock, never the Node process clock (property #3).
   */
  async decideAtomic(
    approvalId: string,
    deciderAccountId: string,
    approve: boolean,
    executor?: TwoPersonTx,
  ): Promise<DecideOutcome> {
    const db = executor ?? this.db;
    const targetState: 'APPROVED' | 'DECLINED' = approve ? 'APPROVED' : 'DECLINED';
    const result = await db.execute(sql`
      UPDATE ${twoPersonApprovalRow}
      SET state = ${targetState}, approver_account_id = ${deciderAccountId}::uuid, decided_at = now()
      WHERE ${twoPersonApprovalRow.approval_id} = ${approvalId}::uuid
        AND ${twoPersonApprovalRow.state} = 'AWAITING_SECOND'
        AND ${twoPersonApprovalRow.expires_at} > now()
        AND ${twoPersonApprovalRow.initiator_account_id} <> ${deciderAccountId}::uuid
      RETURNING approval_id, initiator_account_id, approver_account_id, permission_key,
                target_entity_type, target_entity_id, state, requested_at, decided_at,
                expires_at, consumed_at
    `);
    const row = rowsOf(result)[0];
    if (row) return { row: mapRow(row), reason: 'ok' };

    // 0-row disambiguation — a PLAIN read, same executor, never re-decides anything (the guarded
    // UPDATE above already made the real decision). Priority: not_found > self (an identity fault
    // that holds regardless of the row's state) > expired (state still AWAITING_SECOND, TTL passed —
    // the ONLY remaining reason the guard above could have matched 0 rows once self/terminal are
    // ruled out) > terminal (already DECLINED/APPROVED/EXPIRED/CONSUMED by someone else).
    const probe = await db.execute(sql`
      SELECT initiator_account_id, state
      FROM ${twoPersonApprovalRow}
      WHERE ${twoPersonApprovalRow.approval_id} = ${approvalId}::uuid
    `);
    const probeRow = rowsOf(probe)[0];
    if (!probeRow) return { row: null, reason: 'not_found' };
    if (String(probeRow['initiator_account_id']) === deciderAccountId) return { row: null, reason: 'self' };
    if (probeRow['state'] !== 'AWAITING_SECOND') return { row: null, reason: 'terminal' };
    return { row: null, reason: 'expired' };
  }

  /**
   * Usage-once consumption (property #4) — NOT an HTTP route in this lot (no consume endpoint in the
   * canon's 3-route contract, `:138-140`); this is the forward-looking call a FUTURE gated-action
   * handler (W1.2-b..e, recabling the 37 TD-107 endpoints) will make once its own approved two-person
   * approval must be spent. Looked up by CONTEXT (the same `initiator_account_id, permission_key,
   * target_entity_type, target_entity_id` tuple the pending-context unique index keys on) — a future
   * caller knows its own identity + what it is trying to do, not an opaque `approval_id`.
   *
   * ONE guarded UPDATE: a 0-row match is ALWAYS an error (property #4 — "jamais un succès silencieux"),
   * never distinguishes WHICH of {wrong state, expired, already consumed} beyond "not_found" (no row
   * for this context, ever) vs "not_consumable" (a row exists, just not usable right now) — a future
   * caller only needs "can I proceed?", not a finer taxonomy.
   */
  async consumeAtomic(
    initiatorAccountId: string,
    permissionKey: string,
    targetEntityType: string,
    targetEntityId: string | null,
    executor?: TwoPersonTx,
  ): Promise<ConsumeOutcome> {
    const db = executor ?? this.db;
    const result = await db.execute(sql`
      UPDATE ${twoPersonApprovalRow}
      SET state = 'CONSUMED', consumed_at = now()
      WHERE ${twoPersonApprovalRow.initiator_account_id} = ${initiatorAccountId}::uuid
        AND ${twoPersonApprovalRow.permission_key} = ${permissionKey}
        AND ${twoPersonApprovalRow.target_entity_type} = ${targetEntityType}
        AND ${twoPersonApprovalRow.target_entity_id} IS NOT DISTINCT FROM ${targetEntityId}::uuid
        AND ${twoPersonApprovalRow.state} = 'APPROVED'
        AND ${twoPersonApprovalRow.expires_at} > now()
      RETURNING approval_id
    `);
    const row = rowsOf(result)[0];
    if (row) return { approvalId: String(row['approval_id']), reason: 'ok' };

    const probe = await db.execute(sql`
      SELECT approval_id FROM ${twoPersonApprovalRow}
      WHERE ${twoPersonApprovalRow.initiator_account_id} = ${initiatorAccountId}::uuid
        AND ${twoPersonApprovalRow.permission_key} = ${permissionKey}
        AND ${twoPersonApprovalRow.target_entity_type} = ${targetEntityType}
        AND ${twoPersonApprovalRow.target_entity_id} IS NOT DISTINCT FROM ${targetEntityId}::uuid
      ORDER BY requested_at DESC
      LIMIT 1
    `);
    if (!rowsOf(probe)[0]) return { approvalId: null, reason: 'not_found' };
    return { approvalId: null, reason: 'not_consumable' };
  }

  /**
   * Staff B's `GET .../pending` (canon `:139`). AWAITING_SECOND rows only, and — READ-time filter,
   * no state mutation — `expires_at > now()` (DB clock): a request that has silently aged past its
   * TTL is not worth showing (`decideAtomic` would refuse it as `expired` anyway). Newest first
   * (`two_person_approval_pending_idx` — `(state, requested_at DESC)`, C1's own hot-path index).
   */
  async listPending(executor?: TwoPersonTx): Promise<TwoPersonApprovalRowView[]> {
    const rows = await (executor ?? this.db)
      .select({
        approval_id: twoPersonApprovalRow.approval_id,
        initiator_account_id: twoPersonApprovalRow.initiator_account_id,
        approver_account_id: twoPersonApprovalRow.approver_account_id,
        permission_key: twoPersonApprovalRow.permission_key,
        target_entity_type: twoPersonApprovalRow.target_entity_type,
        target_entity_id: twoPersonApprovalRow.target_entity_id,
        state: twoPersonApprovalRow.state,
        requested_at: twoPersonApprovalRow.requested_at,
        decided_at: twoPersonApprovalRow.decided_at,
        expires_at: twoPersonApprovalRow.expires_at,
        consumed_at: twoPersonApprovalRow.consumed_at,
      })
      .from(twoPersonApprovalRow)
      .where(and(eq(twoPersonApprovalRow.state, 'AWAITING_SECOND'), sql`${twoPersonApprovalRow.expires_at} > now()`))
      .orderBy(desc(twoPersonApprovalRow.requested_at));
    return rows.map((r) => mapRow(r as unknown as Record<string, unknown>));
  }
}
