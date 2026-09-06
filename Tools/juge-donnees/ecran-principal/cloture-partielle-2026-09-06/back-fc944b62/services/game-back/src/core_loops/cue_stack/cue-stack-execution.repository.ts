// IMPLEMENTS: docs/superpowers/plans/2026-07-13-p3-D-cue-annealing-plan.md §C3 ("CUE_STACK_EXECUTE
//             M/29 provisional... promotion, curseur séquentiel... firing → executor.execute → statut+
//             outcome jsonb single-statement" + "CUE_STACK_STALE_SWEEP N/29 provisional")
//             Design: docs/superpowers/specs/2026-07-13-p3-D-cue-annealing-design.md §5.2 (the tick's own
//             SQL shapes: promotion, the I3 atomic claim, the single-statement outcome commit) + §4.1
//             (the 4 bookkeeping columns this file writes — `executing_slot_index`/
//             `executing_slot_started_minute`/`last_executed_game_minute`, all mig 0129/C1).
//             Pattern (claim-then-act): `maintenance.repository.ts`'s own `maintenance_mode IS NULL`
//             claim guard (`city_sim_system.ts:945-947`'s own account) — an atomic UPDATE that BOTH
//             checks AND stamps readiness in one statement, so a concurrent second caller's SAME UPDATE
//             re-evaluates against the ALREADY-stamped row and matches zero rows (Postgres re-checks a
//             WHERE clause against the latest committed row version once it acquires the row lock —
//             `cue-stack.repository.ts`'s own header documents this EXACT guarantee for `composeUpsert`/
//             `commitWithSettlingGuard` [P3-D C7 renamed `commitPending`]).
//             — P3-D C3 — 2026-07-14
//             ★ C9 hardening (C4 MINOR "clobber-window disrupt-vs-fire" carried forward): `commitFiring`
//             below no longer takes a caller-computed FULL `slots` array — see its own header for the
//             race it used to permit and the `jsonb_set`-against-current-value fix (DD-SLOT-JSONB).
//
// `CueStackExecutionRepository` — the persisted writers for the C3 execution tick + stale sweep. SEPARATE
// from `cue-stack.repository.ts` (C2's own file, scoped to compose/reorder/commit + compose-time target
// validation) — this file owns the DISTINCT "post-commit lifecycle" concern (D12 "repositories per
// concern", mirrors `core_loops/supply_chain/`'s own multi-repository layout).
//
// FOUR writers, each a single atomic statement (0-TOCTOU):
//   1. `promoteToExecuting` — `UPDATE ... WHERE state='committed'` (a ONE-TIME transition; I1 already
//      guarantees ≤1 non-terminal row, so no extra concurrency guard is needed beyond the state filter
//      itself — 'committed' never re-occurs once flipped).
//   2. `claimGameMinute` — I3's OWN arbiter. `UPDATE ... WHERE state='executing' AND
//      executing_slot_index=$slotIndex AND last_executed_game_minute IS DISTINCT FROM $gameMinute
//      RETURNING`: a double tick for the SAME gameMinute → only the FIRST claims (0 rows for the second —
//      exactly the guarantee I3 requires, "double tick même gameMinute → un seul firing"). The
//      `executing_slot_index=$slotIndex` conjunct ALSO closes a lost-update window: if the cursor had
//      ALREADY advanced past `$slotIndex` by the time this claim runs (some other concurrent success), the
//      predicate no longer matches — 0 rows, no stale overwrite of newer state.
//   3. `commitFiring` — the single-statement outcome persist (design "statut+outcome jsonb single-
//      statement"): ★ C9 — targeted `jsonb_set` on ONLY the fired slot's index (against `slots`'s CURRENT
//      column value, never a JS-side full-array snapshot — see the method's own header) + advances the
//      cursor (or flips `state='resolved'` on the last slot).
//   4. `staleSweep` — the N/29 crash-safe floor: `UPDATE ... WHERE state='executing' AND
//      (gameMinute - executing_slot_started_minute) >= horizonGameMinutes` force-resolves a stack stuck
//      on its current slot past the horizon. Set-based, per player (mirrors every other NIGHTLY tick's
//      own per-player scan).
//
// `findExecutableStack` is a plain SELECT (I1 guarantees ≤1 non-terminal row) — the tick's OWN "is there
// anything to do" cheap read (the "tick sans stack → 0 write" falsifiable proof, plan §C3).

import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { cueStack, type CueStackRow } from '../../db/schema/queues_exceptions_cuestack';
import type { CueStackSlot } from './slot-type-executor.interface';

/** Defensive dual-shape read for a raw `db.execute` result (the `cue-stack.repository.ts` idiom, copied
 *  verbatim — no shared extraction across repositories, this codebase's own convention). */
function rowsOf(result: unknown): Array<Record<string, unknown>> {
  return (result as { rows?: Array<Record<string, unknown>> }).rows ?? (result as Array<Record<string, unknown>>);
}

@Injectable()
export class CueStackExecutionRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /** The player's ONE non-terminal stack IFF it is `committed` or `executing` (a `pending` stack is not
   *  yet committed — nothing for the tick to do; I1 guarantees at most one match). `null` → the tick's
   *  own 0-write no-op branch. */
  async findExecutableStack(playerId: string): Promise<CueStackRow | null> {
    const result = await this.db.execute(sql`
      SELECT cue_stack_id, player_id, slots, committed_at, state, session_ref,
             executing_slot_index, executing_slot_started_minute, last_executed_game_minute
      FROM ${cueStack}
      WHERE player_id = ${playerId}::uuid AND state IN ('committed', 'executing')
      LIMIT 1
    `);
    const row = rowsOf(result)[0];
    return row ? (row as unknown as CueStackRow) : null;
  }

  /**
   * Promotion (design §5.2 "ou committed → promotion executing au premier tick") — a ONE-TIME
   * `committed → executing` transition, arming the cursor at slot 0 with THIS tick's own `gameMinute` as
   * the first slot's start. Returns `null` if the row was no longer `committed` (a concurrent promotion
   * already won, or the row was somehow force-resolved) — the caller re-reads.
   */
  async promoteToExecuting(cueStackId: string, gameMinute: number): Promise<CueStackRow | null> {
    const result = await this.db.execute(sql`
      UPDATE ${cueStack}
      SET state = 'executing', executing_slot_index = 0, executing_slot_started_minute = ${gameMinute}
      WHERE cue_stack_id = ${cueStackId}::uuid AND state = 'committed'
      RETURNING cue_stack_id, player_id, slots, committed_at, state, session_ref,
                executing_slot_index, executing_slot_started_minute, last_executed_game_minute
    `);
    const row = rowsOf(result)[0];
    return row ? (row as unknown as CueStackRow) : null;
  }

  /**
   * I3's OWN arbiter — the atomic claim gating a firing attempt. Returns the FRESH row (RETURNING) iff
   * this call won the claim for `gameMinute` at `slotIndex`; `null` if either (a) another concurrent call
   * already claimed this EXACT gameMinute first, or (b) the cursor had already moved past `slotIndex`
   * (see file header — the lost-update guard). The caller MUST use this returned row's OWN `slots` for
   * any subsequent mutation (never the pre-claim read) — see file header.
   */
  async claimGameMinute(cueStackId: string, slotIndex: number, gameMinute: number): Promise<CueStackRow | null> {
    const result = await this.db.execute(sql`
      UPDATE ${cueStack}
      SET last_executed_game_minute = ${gameMinute}
      WHERE cue_stack_id = ${cueStackId}::uuid
        AND state = 'executing'
        AND executing_slot_index = ${slotIndex}
        AND last_executed_game_minute IS DISTINCT FROM ${gameMinute}
      RETURNING cue_stack_id, player_id, slots, committed_at, state, session_ref,
                executing_slot_index, executing_slot_started_minute, last_executed_game_minute
    `);
    const row = rowsOf(result)[0];
    return row ? (row as unknown as CueStackRow) : null;
  }

  /**
   * The single-statement outcome commit (design "statut+outcome jsonb single-statement") — ★ C9 hardening
   * (C4 MINOR carried forward, "clobber-window disrupt-vs-fire"): mutates ONLY the fired slot's OWN
   * `status`/`outcome` fields via a targeted `jsonb_set` **against the `slots` column's CURRENT value**
   * (referenced bare in the SET expression, never a JS-computed full-array literal) — every sibling
   * element is left byte-for-byte untouched, by construction, regardless of what any OTHER write did to
   * them in the meantime. `slotIndex=null` is the C3 "malformed cursor" defensive branch (force-resolve,
   * touch NO slot — `slots` stays the bare column reference, a no-op self-assignment).
   *
   * THE BUG THIS REPLACES (pre-C9): the previous shape took a caller-computed `slotsJson` — the FULL
   * array, JS-side, built from `claimedSlots` (I3's OWN claim-time snapshot, `claimGameMinute`'s
   * `RETURNING`) — and blind-overwrote the column with it. Between that claim and THIS write sits an
   * `await executor.execute(...)` (a real verb call, genuine async I/O — `cue-stack-execution-tick.
   * service.ts`'s own step 4). If `CueStackDisruptionService.disruptSlots` (§7/I8, a DIFFERENT slot in the
   * SAME stack, e.g. a heat escalation on another targeted building) committed its OWN write during that
   * window, its effect was captured in the DB but INVISIBLE to `claimedSlots` (already read, before the
   * await) — the old blind write would then silently REVERT that sibling slot back to `pending`, even
   * though `SlotFailedEvent` had already fired for it (an observable "event fired, then the persisted
   * state contradicts it" bug). The mitigation-by-luck was the scheduler's own sequential per-player
   * cadence (the window rarely opens in practice) — never a guarantee. `jsonb_set`-against-current-value
   * makes the ORDER of the two writes irrelevant: whichever commits second always sees the first's effect
   * already baked into `slots` (Postgres' own MVCC read-of-latest-committed-value at UPDATE time), so both
   * survive no matter which interleaves first — the SAME "single-statement conditional guard, no
   * application-side read-modify-write" discipline I3/I8 already establish (DD-SLOT-JSONB, decisions §2).
   * Falsifiable: `cue_stack_cascade.spec.ts` "C9 hardening: a concurrent disruption of a SIBLING slot
   * survives a firing's own commit (no clobber)".
   */
  async commitFiring(
    cueStackId: string,
    slotIndex: number | null,
    newStatusJson: string | null,
    outcomeJson: string | null,
    resolved: boolean,
    nextSlotIndex: number | null,
    gameMinute: number | null,
  ): Promise<void> {
    const slotsExpr =
      slotIndex === null
        ? sql`slots`
        : sql`jsonb_set(jsonb_set(slots, ARRAY[${String(slotIndex)}, 'status'], ${newStatusJson}::jsonb), ARRAY[${String(slotIndex)}, 'outcome'], ${outcomeJson}::jsonb)`;

    if (resolved) {
      await this.db.execute(sql`
        UPDATE ${cueStack}
        SET slots = ${slotsExpr}, state = 'resolved',
            executing_slot_index = NULL, executing_slot_started_minute = NULL
        WHERE cue_stack_id = ${cueStackId}::uuid AND state = 'executing'
      `);
    } else {
      await this.db.execute(sql`
        UPDATE ${cueStack}
        SET slots = ${slotsExpr}, executing_slot_index = ${nextSlotIndex},
            executing_slot_started_minute = ${gameMinute}
        WHERE cue_stack_id = ${cueStackId}::uuid AND state = 'executing'
      `);
    }
  }

  /**
   * `disruptSlots` — C4 §7/I8: atomically transitions every slot whose `slot_id` is IN `slotIds` AND whose
   * `status` is STILL `'pending'` to `'failed_disrupted'`. Returns BOTH the full post-write `slots` array
   * AND `newlyDisruptedSlotIds` — the SUBSET of `slotIds` THIS call ITSELF flipped (as opposed to one
   * already flipped by an earlier/concurrent call) — the caller (`CueStackDisruptionService`) uses this
   * second list, NOT "is the final status failed_disrupted", to decide whether to emit `SlotFailedEvent` /
   * raise a cascade card: emitting on "final status" would fire for EVERY concurrent caller (each would
   * observe the SAME post-transition state), which is NOT exactly-once notification.
   *
   * The I8 guarantee is a `SELECT ... FOR UPDATE` CTE (`locked`) that takes the row lock FIRST: a second,
   * concurrent call's OWN `FOR UPDATE` blocks until the first call's transaction commits, THEN reads the
   * row's ALREADY-updated `slots` — so the second call's own "which of `slotIds` are still `pending`"
   * computation (`computed.newly_disrupted`) is correctly EMPTY (the first call already flipped them) —
   * true serialization, not merely "the final state converges" (the earlier, simpler jsonb_agg-only SQL
   * this method replaced would let EVERY concurrent caller observe the post-transition state and BOTH
   * would have emitted, an over-notification bug caught before landing). `slotIds` NOT matching any
   * element (wrong stack, wrong player, or the slot already fired for real) simply leave that element
   * untouched — never an error. Returns `null` if the row is no longer `cue_stack_id` + `state='executing'`
   * (the stack resolved/wasn't found between the caller's own read and this write) — the caller does
   * nothing further (disruption only applies "pendant qu'un stack est executing", design §7).
   */
  async disruptSlots(
    cueStackId: string,
    slotIds: readonly string[],
    outcomeJson: string,
  ): Promise<{ slots: CueStackSlot[]; newlyDisruptedSlotIds: string[] } | null> {
    if (slotIds.length === 0) return null;
    const idList = sql.join(
      slotIds.map((id) => sql`${id}`),
      sql`, `,
    );
    const result = await this.db.execute(sql`
      WITH locked AS (
        SELECT slots FROM ${cueStack} WHERE cue_stack_id = ${cueStackId}::uuid AND state = 'executing' FOR UPDATE
      ),
      computed AS (
        SELECT
          COALESCE(
            (SELECT jsonb_agg(
               CASE
                 WHEN elem->>'slot_id' IN (${idList}) AND elem->>'status' = 'pending'
                   THEN jsonb_set(jsonb_set(elem, '{status}', '"failed_disrupted"'::jsonb), '{outcome}', ${outcomeJson}::jsonb)
                 ELSE elem
               END
               ORDER BY ord
             )
             FROM jsonb_array_elements(locked.slots) WITH ORDINALITY AS t(elem, ord)),
            '[]'::jsonb
          ) AS new_slots,
          COALESCE(
            (SELECT jsonb_agg(elem->>'slot_id')
             FROM jsonb_array_elements(locked.slots) AS elem
             WHERE elem->>'slot_id' IN (${idList}) AND elem->>'status' = 'pending'),
            '[]'::jsonb
          ) AS newly_disrupted
        FROM locked
      )
      UPDATE ${cueStack}
      SET slots = computed.new_slots
      FROM computed
      WHERE cue_stack_id = ${cueStackId}::uuid AND state = 'executing'
      RETURNING computed.new_slots AS slots, computed.newly_disrupted AS newly_disrupted_slot_ids
    `);
    const row = rowsOf(result)[0];
    if (!row) return null;
    return {
      slots: ((row.slots as unknown as CueStackSlot[]) ?? []) as CueStackSlot[],
      newlyDisruptedSlotIds: ((row.newly_disrupted_slot_ids as unknown as string[]) ?? []) as string[],
    };
  }

  /**
   * C8 — BO force (`POST /admin/cue-stacks/:id/force-cascade`, design §17 "f3_deferred"): forces the
   * stack's OWN first still-`pending` slot into `failed_collision` (an ADMIN OVERRIDE transition, tagged
   * `detail.forcedByAdmin: true` — distinguishes it from an organic collision, mirrors `supply-node-
   * pressure.repository.ts#forceSet`'s own `blocked_sources: ['ADMIN_FORCED']` out-of-domain tag
   * convention), then returns the FORCED slot's identity so the caller (the admin controller) can drive
   * `CueCascadeExceptionProducer.raiseIfClear` — the REAL production cascade-raise verb (mirrors
   * `supply-chain-admin.controller.ts#forceRouteCollapse`'s own "drives the REAL transition, then calls the
   * REAL producer" shape), never a fabricated separate BO-only card path.
   *
   * TWO statements inside ONE `db.transaction` (the `named-sequence.repository.ts#saveAtomic`/
   * `maintenance.repository.ts#debitAndArmSchedule` "more than one statement must share one atomic scope"
   * idiom): `SELECT ... FOR UPDATE` takes the row lock FIRST (blocking a concurrent tick claim on the SAME
   * row until this transaction commits/rolls back), THEN the computed `slots` array is written back. `null`
   * if the stack no longer exists, is already `resolved`, or has ZERO `pending` slots left (nothing
   * eligible to force) — the controller maps this to 404/409.
   */
  async forceFailFirstPendingSlot(
    cueStackId: string,
    outcomeDetail: Record<string, unknown>,
  ): Promise<{ playerId: string; slotId: string; slotType: string; targetRef: CueStackSlot['target_ref'] } | null> {
    return this.db.transaction(async (tx) => {
      const rows = await tx.execute(sql`
        SELECT player_id, slots, state FROM ${cueStack} WHERE cue_stack_id = ${cueStackId}::uuid FOR UPDATE
      `);
      const row = rowsOf(rows)[0];
      if (!row || row.state === 'resolved') return null;

      const slots = (row.slots as unknown as CueStackSlot[]) ?? [];
      const targetIndex = slots.findIndex((s) => s.status === 'pending');
      if (targetIndex === -1) return null;
      const target = slots[targetIndex];

      const outcome = { status: 'failed_collision', detail: outcomeDetail };
      const updatedSlots = slots.map((s, i) => (i === targetIndex ? { ...s, status: 'failed_collision' as const, outcome } : s));
      await tx.execute(sql`
        UPDATE ${cueStack} SET slots = ${JSON.stringify(updatedSlots)}::jsonb WHERE cue_stack_id = ${cueStackId}::uuid
      `);

      return { playerId: String(row.player_id), slotId: target.slot_id, slotType: target.slot_type, targetRef: target.target_ref };
    });
  }

  /**
   * `CUE_STACK_STALE_SWEEP` (N/29) — the crash-safe floor (design §5.2's own note + plan §C3): force-
   * resolves any `executing` stack for this player whose CURRENT slot has sat at the same
   * `executing_slot_started_minute` for ≥ `horizonGameMinutes`. Set-based, per player. Returns the count
   * force-resolved (0 the common healthy case — no event emitted, plan §C3 asks for none).
   */
  async staleSweep(playerId: string, gameMinute: number, horizonGameMinutes: number): Promise<number> {
    const result = await this.db.execute(sql`
      UPDATE ${cueStack}
      SET state = 'resolved', executing_slot_index = NULL, executing_slot_started_minute = NULL
      WHERE player_id = ${playerId}::uuid
        AND state = 'executing'
        AND executing_slot_started_minute IS NOT NULL
        AND (${gameMinute} - executing_slot_started_minute) >= ${horizonGameMinutes}
      RETURNING cue_stack_id
    `);
    return rowsOf(result).length;
  }
}
