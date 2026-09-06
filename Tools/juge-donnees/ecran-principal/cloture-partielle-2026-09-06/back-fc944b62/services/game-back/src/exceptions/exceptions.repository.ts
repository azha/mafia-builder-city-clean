// IMPLEMENTS: docs/superpowers/specs/2026-06-09-phase-14-exception-queue-design.md §Repository
//             (exception_queue CRUD — the persistence layer for the Exception Queue primary verb)
//             -- session:2026-06-09 (Phase-14 T1 — exceptions repository + module skeleton) --
//
// `ExceptionsRepository` — the persisted access layer for the `exception_queue` table (migration 0007).
// Copies the persisted-system repository template (EconomyRepository / PrecursorsRepository): a thin
// `*.repository.ts` owning the raw Drizzle reads/writes, paired with the projection service (T2) that
// holds the raw→band mappings (R2.2 — raw scalars stay in this layer).
//
// R9.3: 09 is the source of truth for `exception_queue` (migration 0007). This file IMPORTS the existing
// schema and NEVER re-declares it. The runtime role app_rw has SELECT/INSERT/UPDATE on exception_queue.

import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';

import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import {
  exceptionQueueRow,
  exceptionQueueRefusal,
  type ExceptionQueueRow,
  type ExceptionQueueInsert,
} from '../db/schema/queues_exceptions_cuestack';
import { coreLoopsTunables } from '../core_loops/core-loops-tunables';

/** ★ W1.1-a C5 (design §0.11, IM-1) — the Drizzle transaction-callback client type, extracted via
 *  `Parameters<...>` off the REAL `DrizzleClient['transaction']` signature (never guessed) — the SAME
 *  house idiom `core_loops/demolition/friction-budget.repository.ts:86`'s `FrictionTx` /
 *  `onboarding/onboarding-grant.repository.ts:36`'s `OnboardingGrantTx` /
 *  `operational/lieutenant/lieutenant.repository.ts`'s `LieutenantTx` already name. */
export type ExceptionsTx = Parameters<Parameters<DrizzleClient['transaction']>[0]>[0];

/** The `producer` value recorded for a refused insert whose `candidate_actions` carry no `source` tag —
 *  6 of the 15 current callers (raid / equipment-failure / the original Phase-14 `exception-producer.
 *  service.ts` / ambient-drift / random-world / lieutenant-tick) predate that convention (W1.1-d C5's own
 *  implementation-notes.md documents the honest gap — never mis-attributed to a guessed producer). */
const UNKNOWN_PRODUCER = 'UNKNOWN';

/** Repository for the exception_queue table (migration 0007). Raw rows only — the projection buckets the BO scalars. */
@Injectable()
export class ExceptionsRepository {
  private readonly logger = new Logger(ExceptionsRepository.name);

  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * Insert one exception card; returns its id, or `null` if REFUSED by the P3-A C3 queue cap (D5):
   * `countPendingForLieutenant` for THIS row's (player, lieutenant) scope is already `>=`
   * `core_loops.exception_queue_cap_per_lieutenant` (20 default). Refuse-insert (sub-decision #5
   * ratified) — the 21st card is refused, the 20th (and every existing pending card) is untouched; the
   * queue NEVER destroys a visible card to make room. Producers are BYTE-UNTOUCHED (D3): all 15 current
   * callers (★ corrected count — "all 3 existing callers" was accurate at P3-A C3 origin but stale by the
   * time 12 more producers landed across later lots; grepped exhaustively, W1.1-d C5) `await this.repo.
   * insert({...})` and discard the return value — the widened `string | null` return type is a silent,
   * backward-compatible superset.
   *
   * `executor` (W1.1-a C5, design §0.11/C5 — OPTIONAL, ADDITIVE): the house `executor?: Tx` idiom.
   * Omitted (every pre-existing caller) → every statement below runs on `this.db`, byte-identical to
   * before C5. Threaded (the welcome-grant pre-seed, C5) → the cap-guard read
   * (`countPendingForLieutenant`), this INSERT, AND the W1.1-d C5 refusal trace (`recordRefusal`, next
   * paragraph) ALL run on the CALLER's already-open transaction — the ⊥ consigne this chunk exists to
   * satisfy: threading only a SUBSET of the method's statements and leaving another on `this.db` would
   * let it act on a connection BLIND to (or invisible from) the grant's own in-flight writes.
   *
   * W1.1-d C5 (closes TD-203, `docs_int/tech_debt_inventory.md`): a refusal now leaves a queryable TRACE
   * (`recordRefusal` below) — before this chunk, the ONLY signal was `logger.warn`, invisible in
   * production once the log line scrolls past (I6, design §C5). Existing cards + the refuse-insert
   * contract itself are UNCHANGED — this only adds where the FACT of a refusal is persisted.
   * `recordRefusal` is threaded through the SAME `executor` as the cap-guard read and the INSERT (merge
   * of W1.1-a C5 + W1.1-d C5 at the cumulative-branch merge, 2026-08-09) — a refusal recorded on a
   * pre-seed's ambient transaction must roll back WITH that transaction, not survive it on a separate
   * connection.
   */
  async insert(row: ExceptionQueueInsert, executor?: ExceptionsTx): Promise<string | null> {
    const tx = executor ?? this.db;
    const pendingCount = await this.countPendingForLieutenant(row.player_id, row.lieutenant_id ?? null, executor);
    const cap = coreLoopsTunables.exceptionQueueCapPerLieutenant;
    if (pendingCount >= cap) {
      const producer = this.extractProducerTag(row);
      this.logger.warn(
        `insert REFUSED (queue cap D5): player_id=${row.player_id} lieutenant_id=${row.lieutenant_id ?? 'null'} ` +
          `producer=${producer} pending=${pendingCount} >= cap=${cap}. Existing pending cards are untouched ` +
          `(refuse-insert, sub-decision #5).`,
      );
      await this.recordRefusal(row.player_id, producer, executor);
      return null;
    }
    const [created] = await tx.insert(exceptionQueueRow).values(row).returning({ id: exceptionQueueRow.exception_id });
    return created.id;
  }

  /**
   * W1.1-d C5 — the producer identity for a refused insert, read back from `row.candidate_actions[].
   * source` — the ALREADY-established jsonb "source tag" convention 9 of the 15 current producers stamp
   * on every candidate action (`FRICTION_THRESHOLD_SOURCE`/`HEAT_PRESSURE_SOURCE`/`CUE_CASCADE_SOURCE`/...,
   * `city_sim_system.ts:1266`'s own "source tag" framing) — never a NEW parameter forced onto every call
   * site (D3's own "byte-untouched producers" discipline, extended here). Falls back to `UNKNOWN_PRODUCER`
   * for the 6 producers that predate the convention — an honest gap, not a silent mis-attribution.
   */
  private extractProducerTag(row: ExceptionQueueInsert): string {
    const actions = Array.isArray(row.candidate_actions)
      ? (row.candidate_actions as ReadonlyArray<{ source?: unknown }>)
      : [];
    const tagged = actions.find((a) => typeof a?.source === 'string' && a.source.length > 0);
    return (tagged?.source as string | undefined) ?? UNKNOWN_PRODUCER;
  }

  /**
   * W1.1-d C5 — record ONE refusal against the (player, producer) aggregate counter (closes TD-203).
   * UPSERT: the first refusal for a (player, producer) pair inserts `refused_count=1`; every later one
   * increments it + stamps `last_refused_at`. Bounded growth (one row per DISTINCT (player,producer) pair
   * that has EVER hit the cap, never one row per refusal event — "combien refusées, par quel producteur"
   * asks for a count, not an unbounded audit log).
   *
   * `executor` (merged W1.1-a C5 + W1.1-d C5, cumulative-branch merge) — see `insert`'s own header:
   * threaded together with the cap-guard read and the INSERT, never left alone on `this.db`.
   */
  private async recordRefusal(playerId: string, producer: string, executor?: ExceptionsTx): Promise<void> {
    const tx = executor ?? this.db;
    await tx
      .insert(exceptionQueueRefusal)
      .values({ player_id: playerId, producer, refused_count: 1 })
      .onConflictDoUpdate({
        target: [exceptionQueueRefusal.player_id, exceptionQueueRefusal.producer],
        set: {
          refused_count: sql`${exceptionQueueRefusal.refused_count} + 1`,
          last_refused_at: sql`now()`,
        },
      });
  }

  /**
   * Count PENDING cards for a (player, lieutenant) scope — the D5 cap-guard denominator AND the C3
   * `queue_pressure_band` per-lieutenant metric (design §5). `lieutenantId=null` scopes to the
   * player-level (non-lieutenant) cards — the SAME cap key protects both scopes (design §5: "player-
   * level (lieutenant_id NULL) cards capped by the same key against the player's null-lieutenant set").
   *
   * `executor` (W1.1-a C5) — see `insert`'s own header: threaded together with `insert`'s, never alone.
   */
  async countPendingForLieutenant(playerId: string, lieutenantId: string | null, executor?: ExceptionsTx): Promise<number> {
    const tx = executor ?? this.db;
    const rows = await tx
      .select({ id: exceptionQueueRow.exception_id })
      .from(exceptionQueueRow)
      .where(
        and(
          eq(exceptionQueueRow.player_id, playerId),
          eq(exceptionQueueRow.resolution_status, 'pending'),
          lieutenantId === null
            ? isNull(exceptionQueueRow.lieutenant_id)
            : eq(exceptionQueueRow.lieutenant_id, lieutenantId),
        ),
      );
    return rows.length;
  }

  /**
   * Set-based batched re-priority UPDATE (D4) — ONE round-trip via `UPDATE … FROM (VALUES …)` (the
   * `selling.repository.ts applySells` batched-write pattern; the Phase-1 determinism discipline: NEVER
   * a per-row `await` loop). `updates` is PRE-FILTERED by the caller (`ExceptionQueueTickService`) to
   * rows whose recomputed priority actually differs from the stored value — an empty array here means
   * the tick already determined "zero-write" and this method is a genuine no-op (no DB round-trip at
   * all), the idempotency guarantee design §5 calls "zero-write when unchanged".
   *
   * ★ (⊥ C3 MINOR-2 fold) `WHERE ... AND eq.resolution_status = 'pending'` — the tick's `ids` were
   * pending at the moment it read them (`listPending`), but a concurrent resolve can flip a row's
   * status BEFORE this UPDATE executes (the two are separate awaited round-trips, so Node's event loop
   * can interleave another request's resolve in between). Without the guard, this SET-based UPDATE would
   * still stamp a NEW `priority` onto a row that has since become `resolved`/`escalated`/`aged_out` — a
   * stale write into an already-finalized card. The guard makes the UPDATE self-correcting: a row whose
   * status raced away from `pending` is excluded, full stop, independent of timing (structurally proven
   * by the WHERE clause itself — this method never touches `resolution_status`, so unlike
   * `markAgedOut` below there is no clobber-to-`aged_out` risk here; the guard closes the milder
   * "stale priority write on a finalized card" gap instead, for the SAME race window).
   */
  async updatePriorities(updates: ReadonlyArray<{ exceptionId: string; newPriority: number }>): Promise<number> {
    if (updates.length === 0) return 0;
    const rows = updates.map((u) => sql`(${u.exceptionId}::uuid, ${u.newPriority}::int)`);
    await this.db.execute(sql`
      UPDATE exception_queue AS eq
      SET priority = v.new_priority
      FROM (VALUES ${sql.join(rows, sql`, `)}) AS v(exception_id, new_priority)
      WHERE eq.exception_id = v.exception_id AND eq.resolution_status = 'pending'
    `);
    // ★ TD-205 (return-contract precision, allocated at C9 closeout) — this returns the ATTEMPTED count
    // (the input array's length), NOT a verified affected-row count. Under the exact race the
    // `resolution_status = 'pending'` guard above defends against (a card resolves between the tick's
    // `listPending` read and this write), a row can be silently excluded from the UPDATE yet still
    // counted here — `ExceptionQueueTickResult.repriced`'s "ACTUALLY updated" doc contract can overclaim
    // by the raced-away count in that narrow window. A `RETURNING`-based affected-row count would close
    // it; deferred rather than rushed at C9 (a real change to a hot batched-write path).
    return updates.length;
  }

  /**
   * Set-based aged-out transition (D4) — ONE `UPDATE … WHERE exception_id IN (…) RETURNING`, the SAME
   * new values for every row (unlike `updatePriorities`, no per-row VALUES join needed here). Returns
   * the (id, lieutenantId) pairs actually transitioned (0 in the common case — organically a no-op,
   * design §13) so the caller (`ExceptionQueueTickService`) can emit exactly one
   * `ExceptionAgedOutEvent` per archived card — with its `lieutenantId` — WITHOUT a second query.
   *
   * ★ (⊥ C3 MINOR-2 fold) `resolution_status = 'pending'` is now ALSO part of the WHERE (not just the
   * `exception_id IN (…)` membership test): `exceptionIds` were pending when the tick read them
   * (`listPending`), but a racing `resolve()` for the SAME card can complete BEFORE this UPDATE runs
   * (two separate awaited round-trips within one `runTick` call — Node can interleave another request's
   * resolve in the gap). Without the guard, this UPDATE would clobber an already-`resolved`/`escalated`
   * card back to `aged_out` (overwriting its real resolution + firing a spurious
   * `ExceptionAgedOutEvent` for a card the player already handled). WITH the guard, a card that raced
   * away from `pending` is excluded from `RETURNING` — it stays exactly as the resolve left it, and the
   * caller emits zero events for it. This is structurally proven by the WHERE clause: no interleaving
   * timing can make a non-pending row match `resolution_status = 'pending'`.
   */
  async markAgedOut(
    exceptionIds: ReadonlyArray<string>,
  ): Promise<Array<{ id: string; lieutenantId: string | null }>> {
    if (exceptionIds.length === 0) return [];
    const updated = await this.db
      .update(exceptionQueueRow)
      .set({
        resolution_status: 'aged_out',
        resolution: { method: 'AGED_OUT', fallback: 'NO_OP' },
        resolved_at: sql`now()`,
      })
      .where(
        and(
          inArray(exceptionQueueRow.exception_id, [...exceptionIds]),
          eq(exceptionQueueRow.resolution_status, 'pending'),
        ),
      )
      .returning({ id: exceptionQueueRow.exception_id, lieutenant_id: exceptionQueueRow.lieutenant_id });
    return updated.map((r) => ({ id: r.id, lieutenantId: r.lieutenant_id }));
  }

  /** The player's PENDING cards, hottest first (priority DESC, then emitted_at — the hot-path index). */
  async listPending(playerId: string): Promise<ExceptionQueueRow[]> {
    return this.db
      .select()
      .from(exceptionQueueRow)
      .where(and(eq(exceptionQueueRow.player_id, playerId), eq(exceptionQueueRow.resolution_status, 'pending')))
      .orderBy(desc(exceptionQueueRow.priority), exceptionQueueRow.emitted_at);
  }

  /**
   * P3-A C4 (D6) — the player's `escalated` cards, NEWEST FIRST (`resolved_at DESC` — the moment the
   * player escalated, not the emit time), paginated via `limit`/`offset`. This IS the canon "separate
   * Escalation log for long-session review": a PROJECTION over the existing `resolution_status='escalated'`
   * rows (no new table — D6, sub-decision #2). Mirrors `listPending`'s shape (same table, same
   * index-friendly `(player_id, resolution_status)` filter — `exception_queue_player_status_idx`).
   */
  async listEscalated(playerId: string, limit: number, offset: number): Promise<ExceptionQueueRow[]> {
    return this.db
      .select()
      .from(exceptionQueueRow)
      .where(and(eq(exceptionQueueRow.player_id, playerId), eq(exceptionQueueRow.resolution_status, 'escalated')))
      .orderBy(desc(exceptionQueueRow.resolved_at))
      .limit(limit)
      .offset(offset);
  }

  /** The player's TOTAL `escalated` card count (the escalations GET's `total`, for the caller's pagination math). */
  async countEscalated(playerId: string): Promise<number> {
    const rows = await this.db
      .select({ id: exceptionQueueRow.exception_id })
      .from(exceptionQueueRow)
      .where(and(eq(exceptionQueueRow.player_id, playerId), eq(exceptionQueueRow.resolution_status, 'escalated')));
    return rows.length;
  }

  /** One owned card (any status) or null — the player reads/resolves only their own. */
  async getOwned(playerId: string, exceptionId: string): Promise<ExceptionQueueRow | null> {
    const rows = await this.db
      .select()
      .from(exceptionQueueRow)
      .where(and(eq(exceptionQueueRow.player_id, playerId), eq(exceptionQueueRow.exception_id, exceptionId)))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Whether the lieutenant already has a PENDING card (the producer dedup — anti-flood). */
  async hasPendingForLieutenant(playerId: string, lieutenantId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: exceptionQueueRow.exception_id })
      .from(exceptionQueueRow)
      .where(
        and(
          eq(exceptionQueueRow.player_id, playerId),
          eq(exceptionQueueRow.lieutenant_id, lieutenantId),
          eq(exceptionQueueRow.resolution_status, 'pending'),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  /** Whether the player already has a PENDING player-level (non-lieutenant) card (the citywide-producer dedup). */
  async hasPendingPlayerLevelCard(playerId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: exceptionQueueRow.exception_id })
      .from(exceptionQueueRow)
      .where(
        and(
          eq(exceptionQueueRow.player_id, playerId),
          isNull(exceptionQueueRow.lieutenant_id),
          eq(exceptionQueueRow.resolution_status, 'pending'),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  /**
   * 04f-A C5 (D4) — whether the player already has a PENDING card whose `candidate_actions[].effect.
   * target_building_id` matches `buildingId` (the equipment-failure producer's dedup gate — one pending card per
   * failed building, the `hasPendingForLieutenant`/`hasPendingPlayerLevelCard` sibling). `target_building_id` is
   * NOT a first-class column (the card row has no building_id — 04a-verbatim schema, R9.3), so this queries the
   * jsonb `candidate_actions` array directly (the `jsonb_array_elements` EXISTS pattern —
   * `forensic.repository.ts`'s `countRecentSoftFlags` precedent). Used by BOTH the on-new-failure producer AND
   * the periodic re-emission sweep (design §4 step 5) — the SAME dedup gate either way.
   */
  async hasPendingForBuilding(playerId: string, buildingId: string): Promise<boolean> {
    const result = await this.db.execute(sql`
      SELECT 1 AS hit
      FROM ${exceptionQueueRow}, jsonb_array_elements(candidate_actions) AS elem
      WHERE player_id = ${playerId}::uuid
        AND resolution_status = 'pending'
        AND elem->'effect'->>'target_building_id' = ${buildingId}
      LIMIT 1
    `);
    // PG driver returns either { rows: [...] } or a bare array depending on version (the forensic.repository.ts
    // countRecentSoftFlags precedent) — defensively accept either shape.
    const rows = (result as unknown as { rows?: unknown[] }).rows ?? (result as unknown as unknown[]);
    return Array.isArray(rows) && rows.length > 0;
  }

  /** Mark a card resolved/escalated with the player's resolution payload. */
  async markResolved(
    exceptionId: string,
    status: 'resolved' | 'escalated',
    resolution: Record<string, unknown>,
  ): Promise<void> {
    await this.db
      .update(exceptionQueueRow)
      .set({ resolution_status: status, resolution, resolved_at: new Date() })
      .where(eq(exceptionQueueRow.exception_id, exceptionId));
  }
}
