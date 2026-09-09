// IMPLEMENTS: docs/superpowers/plans/2026-07-13-p3-D-cue-annealing-plan.md §C2 (compose-UPSERT D2,
//             reorder full-replace WHERE pending, commit atomic I2 + session_ref)
//             Design: docs/superpowers/specs/2026-07-13-p3-D-cue-annealing-design.md §4.1 (I1 the partial
//             UNIQUE index arbiter) + §4.3 (the 3 verbs' exact SQL shapes, verbatim below) + §5.1
//             (target-existence validation — "target_ref existant et actionnable").
//             Decisions: §1.2 D2 (compose = tableau complet, UPSERT of the pending row) + the 0-TOCTOU
//             discipline (plan §0.4/§C2): compose = ONE UPSERT `ON CONFLICT ... DO UPDATE ... WHERE`
//             (I1 the arbiter), commit = ONE conditional `UPDATE ... WHERE state='pending' RETURNING`
//             (I2 the arbiter) — never a read-then-write.
//             Pattern (batched-upsert raw SQL): `supply-node-pressure.repository.ts#accrueSources` (the
//             `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` idiom this file's `composeUpsert` copies,
//             adapted to a PARTIAL unique index target with an additional DO-UPDATE guard clause) +
//             `recruitment.repository.ts#getCandidateForPlayer`/`maintenance.repository.ts#
//             getScheduleTargetState` (the ownership-scoped existence-read idiom `routeExistsForPlayer`/
//             `operationalBuildingExistsForPlayer`/`availableCandidateExistsForPlayer` below copy).
//             — P3-D C2 — 2026-07-14
//
// `CueStackRepository` — the persisted access layer for `cue_stacks` (migration 0007, activated C1) +
// the compose-time target-existence reads (design §5.1's own "validateTarget" concern, C2's stub — see
// `slot-type-executor.interface.ts`'s header for the C2/C3 split). THREE 0-TOCTOU writers:
//
//   1. `composeUpsert` — I1's OWN arbiter. ONE `INSERT ... ON CONFLICT (player_id) WHERE state IN
//      (pending,committed,executing) DO UPDATE ... WHERE cue_stacks.state = 'pending'`: a fresh compose
//      (no existing non-terminal row) INSERTs; a re-compose while PENDING REPLACES the same row's slots
//      (D2 — "un compose sur pending existant REMPLACE"); a compose while the player's ONE non-terminal
//      stack is COMMITTED/EXECUTING (not pending) hits the conflict target but the DO-UPDATE's OWN
//      `WHERE state='pending'` guard evaluates false — ZERO rows written, ZERO rows RETURNING — the
//      caller (service) reads that as "you already have an active stack, compose is not available"
//      (409 `CUE_STACK_ALREADY_ACTIVE` — I1 protecting a stack that has moved past pending, not just the
//      insert-vs-insert race the plan's own falsifiable list calls out). 2 CONCURRENT composes for the
//      SAME player (no existing row) → the partial index arbitrates: exactly ONE wins the INSERT branch,
//      the loser's statement waits on the row lock then applies as an UPDATE against the winner's OWN
//      fresh 'pending' row (Postgres `INSERT ... ON CONFLICT` blocks on a concurrent inserter's row lock
//      rather than raising 23505 — the SAME "the reviewer WILL race it" guarantee `supply_node_pressure`
//      accrual's own ON CONFLICT idiom relies on) — exactly 1 row survives either way.
//   2. `reorderPending` — a plain `UPDATE ... WHERE player_id=$1 AND state='pending' RETURNING` (no
//      INSERT branch at all — reorder NEVER creates a row, design §4.3 "remplacement du tableau complet
//      WHERE state='pending'"). 0 rows RETURNING = no pending stack to reorder (409, generic state
//      conflict — either never composed, or already committed/executing/resolved).
//   3. `commitWithSettlingGuard` — I2's OWN arbiter, GROWN (P3-D C7, design §10.2) into I7's ALSO: the
//      SAME `UPDATE ... SET state='committed', committed_at=now(), session_ref=$2 WHERE player_id=$1 AND
//      state='pending' RETURNING` (I2, unchanged shape — scoped by player_id, I1 already guarantees at
//      most one row can ever match), now preceded by the settling guard-check and followed by the
//      compounding-ONLY branch, ALL inside ONE explicit `db.transaction` (design: "MÊME transaction que
//      I2") — see that method's own header for the full account (this REPLACES the pre-C7 `commitPending`
//      — one authoritative commit-write path, never a second unguarded one a caller could bypass I7
//      through). 2 CONCURRENT commits for the SAME player → the `WHERE state='pending'` guard means only
//      the FIRST to commit's UPDATE actually flips the row; the second's WHERE clause no longer matches
//      (state is now 'committed') → 0 rows, 0 RETURNING → `no_pending` (I2) — and, since the compounding
//      branch is gated on THIS call's OWN RETURNING, the loser never reaches it (I7).
//
// `findCurrent` is a plain SELECT (I1 guarantees ≤1 non-terminal row) — the GET current read, buckets-only
// projection assembled by the SERVICE (this repository returns the raw row).

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { cueStack, exceptionQueueRow, type CueStackRow } from '../../db/schema/queues_exceptions_cuestack';
import { route, buildingOperationalState } from '../../db/schema/operational_chain';
import { recruitmentCandidates } from '../../db/schema/recruitment';
import { citySimClock } from '../../db/schema/city_sim_clock';
import { ExceptionsRepository } from '../../exceptions/exceptions.repository';
// P3-D C7 — I7 (design §10.2): `annealing_state` schema + its history-cap constant, imported DIRECTLY
// (never `AnnealingRepository` the class) — see `commitWithSettlingGuard`'s own header for the full
// "why this file touches a table it does not own" account.
import { annealingStateRow } from '../../db/schema/cue_annealing';
import { ANNEALING_COMPOUNDING_HISTORY_MAX_ENTRIES } from '../annealing/annealing.repository';
import type { CueStackSlot } from './slot-type-executor.interface';

/** Defensive dual-shape read for a raw `db.execute` result (the `forensic.repository.ts`/
 *  `supply-node-pressure.repository.ts` idiom). */
function rowsOf(result: unknown): Array<Record<string, unknown>> {
  return (result as { rows?: Array<Record<string, unknown>> }).rows ?? (result as Array<Record<string, unknown>>);
}

/** C7 (I7) — the descriptive `compounding_history[].change_type` tag a commit-triggered compound records.
 *  DELIBERATELY a plain string OUTSIDE the closed 7-member `LiveChangeType` catalogue (`initiating-change.
 *  catalogue.ts`) — see `commitWithSettlingGuard`'s own header for why a commit-triggered compound is not a
 *  member of that "initiating change" registry at all (it never initiates, only compounds an ALREADY-active
 *  row). */
const COMMIT_COMPOUND_CHANGE_TAG = 'CUE_STACK_COMMIT_COMPOUND';

/** C7 (I7) — `commitWithSettlingGuard`'s 3-outcome result (mirrors the honest 3-outcome shape every OTHER
 *  core_loops producer/repository in this lot returns, e.g. `CueCascadeExceptionOutcome`):
 *   - `no_pending`: nothing to commit (never composed, already committed/executing/resolved, OR the LOSING
 *     side of a concurrent commit race, I2).
 *   - `settling_guard_required`: ≥1 targeted building is actively settling and the caller did not
 *     acknowledge — ZERO writes; `settling` is `{buildingId, settlingEndsAt}` per targeted-settling
 *     building (the SERVICE derives the qualitative band and NEVER forwards `settlingEndsAt` further, R2.2).
 *   - `committed`: the I2 commit succeeded; `compoundedBuildingIds` are the buildings THIS call's own
 *     compounding branch actually flipped (I7, RETURNING-gated — may be `[]` when nothing was settling, or
 *     when `acknowledgeCompounding` was sent but nothing needed it).
 */
export type CommitWithSettlingGuardResult =
  | { readonly kind: 'no_pending' }
  | { readonly kind: 'settling_guard_required'; readonly settling: ReadonlyArray<{ buildingId: string; settlingEndsAt: Date }> }
  | { readonly kind: 'committed'; readonly row: CueStackRow; readonly compoundedBuildingIds: readonly string[] };

@Injectable()
export class CueStackRepository {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    // Duplicate-provided directly by CueStackModule (NOT via importing ExceptionsModule) — the SAME
    // stateless-DB-only-class precedent `SessionModule`/`SupplyChainModule` both establish for this
    // EXACT class, for the SAME reason (empirically-fraught transitive module imports, see
    // `structural-decision-governor.token.ts`'s header for the fuller account of why this codebase
    // prefers duplicate-providing a trivially stateless `@Inject(DB)`-only class over a module import).
    private readonly exceptionsRepo: ExceptionsRepository,
  ) {}

  /**
   * compose (design §4.3, D2) — I1's own arbiter. `slotsJson` is the ALREADY-validated, fully-normalized
   * `CueStackSlot[]` (JSON-stringified by the caller) — this method performs ZERO business validation, it
   * is the atomic persist step only. Returns the resulting row, or `null` if the conflict target matched a
   * row whose state is NOT 'pending' (a committed/executing stack already occupies the player's ONE
   * non-terminal slot — I1 refusing compose, not a fresh-vs-fresh race).
   */
  async composeUpsert(playerId: string, slotsJson: string): Promise<CueStackRow | null> {
    const result = await this.db.execute(sql`
      INSERT INTO ${cueStack} (cue_stack_id, player_id, slots, state)
      VALUES (gen_random_uuid(), ${playerId}::uuid, ${slotsJson}::jsonb, 'pending')
      ON CONFLICT (player_id) WHERE state IN ('pending', 'committed', 'executing')
      DO UPDATE SET slots = EXCLUDED.slots
      WHERE ${cueStack.state} = 'pending'
      RETURNING cue_stack_id, player_id, slots, committed_at, state, session_ref,
                executing_slot_index, executing_slot_started_minute, last_executed_game_minute
    `);
    const row = rowsOf(result)[0];
    return row ? (row as unknown as CueStackRow) : null;
  }

  /**
   * reorder (design §4.3, D2) — full-replace `WHERE state='pending'`. NO insert branch (D2: reorder never
   * creates a row). Returns `null` if no pending row exists for this player (409, generic state conflict).
   */
  async reorderPending(playerId: string, slotsJson: string): Promise<CueStackRow | null> {
    const result = await this.db.execute(sql`
      UPDATE ${cueStack}
      SET slots = ${slotsJson}::jsonb
      WHERE player_id = ${playerId}::uuid AND state = 'pending'
      RETURNING cue_stack_id, player_id, slots, committed_at, state, session_ref,
                executing_slot_index, executing_slot_started_minute, last_executed_game_minute
    `);
    const row = rowsOf(result)[0];
    return row ? (row as unknown as CueStackRow) : null;
  }

  /**
   * C7 — I7: the commit-time settling guard + compounding-ONLY branch, ALL inside ONE explicit DB
   * transaction (design §10.2: "MÊME transaction que I2"). `sessionRef` is `null` for a sessionless commit
   * (D9 zero-regression, unchanged from the pre-C7 `commitPending`). `compoundingMultiplier`/
   * `throughputPenalty` are getter-resolved by the CALLER (R2.3 — the SERVICE resolves tunables, the
   * REPOSITORY takes plain numbers, mirrors `AnnealingService`/`AnnealingRepository`'s own split).
   *
   * Steps, all against the SAME `tx`:
   *   1. Read the player's pending row (`cue_stack_id` + `slots`) — a plain SELECT. `commitPending`'s own
   *      conditional UPDATE (step 4 below) re-evaluates its OWN `WHERE state='pending'` against the
   *      LATEST committed row regardless of what this pre-read saw, so a stale pre-read cannot itself
   *      cause an incorrect write — it exists ONLY to resolve which buildings this stack's slots target.
   *      No pending row at all → `{kind:'no_pending'}` (zero writes).
   *   2. Resolve the DISTINCT building_id set the stack's slots target: `MAINTENANCE_BATCH`/
   *      `EXCEPTION_BATCH_RESOLUTION` (`target_ref.kind==='building'`) directly; `DISTRIBUTION_RUN`
   *      (`target_ref.kind==='route'`) via the route's OWN origin/destination — the SAME resolution
   *      `CueStackDisruptionService#targetsBuilding` already establishes for §7 (verbatim reasoning: a
   *      route that no longer resolves contributes nothing, same honesty as that method). `RECRUITMENT_
   *      STEP` (`kind==='candidate'`) never resolves to a building — excluded, same as §7.
   *   3. Query `annealing_state` for THOSE buildings, `WHERE settled=false AND settling_ends_at>now()`
   *      (the SAME design §9.1 derived predicate `AnnealingRepository`'s own read methods use) — the
   *      "targeted AND actively settling" subset, THIS call's OWN authoritative snapshot.
   *   4. ≥1 such building AND `!acknowledgeCompounding` → `{kind:'settling_guard_required', settling}` —
   *      ZERO writes at all (the transaction commits a no-op; `settling` carries `buildingId` +
   *      `settlingEndsAt` — the SERVICE derives the qualitative band from it and NEVER forwards the raw
   *      timestamp into the 409 body, R2.2/P5).
   *   5. Else: the I2 conditional `UPDATE ... WHERE state='pending' RETURNING` (unchanged shape). 0 rows →
   *      `{kind:'no_pending'}` — a genuine race (I7's OWN concurrency floor: the LOSING side of 2
   *      concurrent acknowledged commits lands here, never reaching step 6 — compounding stays gated on
   *      THIS call's own RETURNING).
   *   6. For each DISTINCT building from step 3 (already known actively-settling moments earlier in this
   *      SAME transaction): a compounding-ONLY conditional `UPDATE ... WHERE settled=false AND
   *      settling_ends_at>now()` — re-guarded (defense-in-depth against the vanishingly narrow window
   *      where a concurrent sweep/re-init touched the SAME row between steps 3 and 6; a 0-row result there
   *      is a silent no-op, never an error, never a retro-initiation of a building that stopped settling).
   *      This is the SAME I5 compounding arithmetic `AnnealingRepository#initiateOrCompound`'s ACTIVE
   *      branch uses, duplicated here per this codebase's own no-shared-extraction convention (see that
   *      file's header) — necessarily so, since it lives in a DIFFERENT repository/table boundary (see
   *      this method's OWN "why here" note below). `changeTag`/`ref` record
   *      `COMMIT_COMPOUND_CHANGE_TAG`/the committed `cue_stack_id` into `compounding_history` — a plain
   *      descriptive jsonb string, DELIBERATELY OUTSIDE the closed 7-member `LiveChangeType` catalogue
   *      (`initiating-change.catalogue.ts`): a commit-triggered compound never INITIATES a fresh settling
   *      window (this branch only ever touches an ALREADY-active row), so it is not a member of that
   *      registry's "initiating change" domain at all. No bus event is emitted for this branch (no NEW
   *      `ChangeType`/event was ratified for it in the design/plan) — the DB row IS the observable proof
   *      (`_test/annealing/state` + the BO `compounding_history` surface, C8).
   *   7. Returns `{kind:'committed', row, compoundedBuildingIds}` — the ids THIS call itself flipped
   *      (RETURNING-gated, never "is the row NOW compounded" — which would double-count under concurrency).
   *
   * WHY THIS TOUCHES `annealing_state` DIRECTLY (crossing `AnnealingRepository`'s own table boundary)
   * rather than calling into that class: design mandates the compounding write share the EXACT SAME DB
   * transaction as the `cue_stacks` I2 commit UPDATE. This codebase has NO precedent anywhere of a
   * repository method accepting an externally-opened transaction client (verified: zero hits for a `tx`/
   * `client` parameter across every repository's own method signatures) — the ESTABLISHED idiom for "one
   * atomic operation spans two tables" is a SINGLE method, in the repository owning the PRIMARY verb,
   * importing the second table's schema directly and running every statement through the SAME `tx`
   * (verbatim `maintenance.repository.ts#debitAndArmSchedule`, which touches `economy_states` +
   * `building_operational_state` together this exact way). This diverges from `annealing.module.ts`'s own
   * C6-authored anticipation ("C7's own future commit-guard integration" — written expecting a
   * `CueStackModule` → `AnnealingModule` import); surfaced honestly here AND in that file's own C7-addition
   * note, never silently landed differently from what the prior chunk's comment expected.
   */
  async commitWithSettlingGuard(
    playerId: string,
    sessionRef: string | null,
    acknowledgeCompounding: boolean,
    compoundingMultiplier: number,
    throughputPenalty: number,
  ): Promise<CommitWithSettlingGuardResult> {
    return this.db.transaction(async (tx) => {
      const pendingRows = await tx
        .select({ cue_stack_id: cueStack.cue_stack_id, slots: cueStack.slots })
        .from(cueStack)
        .where(sql`${cueStack.player_id} = ${playerId}::uuid AND ${cueStack.state} = 'pending'`)
        .limit(1);
      const pending = pendingRows[0];
      if (!pending) {
        return { kind: 'no_pending' as const };
      }

      // Step 2 — resolve the DISTINCT targeted building_id set (see header — mirrors
      // CueStackDisruptionService#targetsBuilding's own resolution, in reverse).
      const slots = (pending.slots as unknown as CueStackSlot[]) ?? [];
      const directBuildingIds = new Set<string>();
      const routeIds = new Set<string>();
      for (const slot of slots) {
        if (slot.target_ref.kind === 'building') {
          directBuildingIds.add(slot.target_ref.id);
        } else if (slot.target_ref.kind === 'route') {
          routeIds.add(slot.target_ref.id);
        }
        // 'candidate' (RECRUITMENT_STEP) never resolves to a building — excluded, same as §7.
      }
      if (routeIds.size > 0) {
        // `inArray` (the drizzle query-builder helper) — the ESTABLISHED convention for "match a SET of
        // ids" in this codebase (`raid.repository.ts` verbatim, e.g. `inArray(productStorage.building_id,
        // buildingIds)`), never a raw `= ANY($array::uuid[])` template (unverified array-parameter
        // binding shape through a raw `sql` tag — this file never risks it).
        const routeRows = await tx
          .select({ origin: route.origin_building_id, destination: route.destination_building_id })
          .from(route)
          .where(inArray(route.route_id, [...routeIds]));
        for (const r of routeRows) {
          if (r.origin) directBuildingIds.add(r.origin);
          if (r.destination) directBuildingIds.add(r.destination);
        }
      }
      const targetedBuildingIds = [...directBuildingIds];

      // Step 3 — the "targeted AND actively settling" subset (design §9.1 derived predicate). Query
      // builder (`inArray` + `and`/`eq`), NOT a raw `sql.execute` — the SAME "match a set of ids" idiom
      // as the route lookup just above.
      let activeSettling: Array<{ building_id: string; settling_ends_at: Date }> = [];
      if (targetedBuildingIds.length > 0) {
        const settlingRows = await tx
          .select({ building_id: annealingStateRow.building_id, settling_ends_at: annealingStateRow.settling_ends_at })
          .from(annealingStateRow)
          .where(
            and(
              eq(annealingStateRow.player_id, playerId),
              inArray(annealingStateRow.building_id, targetedBuildingIds),
              eq(annealingStateRow.settled, false),
              sql`${annealingStateRow.settling_ends_at} > now()`,
            ),
          );
        activeSettling = settlingRows as unknown as Array<{ building_id: string; settling_ends_at: Date }>;
      }

      // Step 4 — the guard: ≥1 targeted building actively settling, no ack → block, zero writes.
      if (activeSettling.length > 0 && !acknowledgeCompounding) {
        return {
          kind: 'settling_guard_required' as const,
          settling: activeSettling.map((r) => ({ buildingId: r.building_id, settlingEndsAt: new Date(r.settling_ends_at) })),
        };
      }

      // Step 5 — I2, unchanged shape.
      const committedResult = await tx.execute(sql`
        UPDATE ${cueStack}
        SET state = 'committed', committed_at = now(), session_ref = ${sessionRef}::uuid
        WHERE player_id = ${playerId}::uuid AND state = 'pending'
        RETURNING cue_stack_id, player_id, slots, committed_at, state, session_ref,
                  executing_slot_index, executing_slot_started_minute, last_executed_game_minute
      `);
      const committedRow = rowsOf(committedResult)[0];
      if (!committedRow) {
        // I7 concurrency: the LOSING side of 2 concurrent commits (I2 itself already arbitrated this —
        // see the class header). Compounding stays gated on OUR OWN RETURNING, so we stop here.
        return { kind: 'no_pending' as const };
      }

      // Step 6 — compounding-ONLY, per DISTINCT building, re-guarded (defense-in-depth, see header).
      const compoundedBuildingIds: string[] = [];
      for (const buildingId of new Set(activeSettling.map((r) => r.building_id))) {
        const compoundResult = await tx.execute(sql`
          UPDATE ${annealingStateRow}
          SET settling_ends_at = now() + (${annealingStateRow.settling_ends_at} - now()) * ${compoundingMultiplier}::float8,
              changes_during_settling = ${annealingStateRow.changes_during_settling} + 1,
              throughput_multiplier = ${annealingStateRow.throughput_multiplier} * (1 - ${throughputPenalty}::float8),
              compounding_history = (
                CASE WHEN jsonb_array_length(${annealingStateRow.compounding_history}) >= ${ANNEALING_COMPOUNDING_HISTORY_MAX_ENTRIES}::int
                  THEN (${annealingStateRow.compounding_history} - 0)
                  ELSE ${annealingStateRow.compounding_history}
                END
              ) || jsonb_build_array(jsonb_build_object('change_type', ${COMMIT_COMPOUND_CHANGE_TAG}::text, 'ref', ${committedRow.cue_stack_id}::text, 'at', now()))
          WHERE player_id = ${playerId}::uuid AND building_id = ${buildingId}::uuid
            AND settled = false AND settling_ends_at > now()
          RETURNING building_id
        `);
        if (rowsOf(compoundResult).length > 0) {
          compoundedBuildingIds.push(buildingId);
        }
      }

      return { kind: 'committed' as const, row: committedRow as unknown as CueStackRow, compoundedBuildingIds };
    });
  }

  /** GET current (design §15.1) — the player's ONE non-terminal stack, or `null` (no current stack —
   *  either never composed, or the last one resolved). I1 guarantees at most one match. */
  async findCurrent(playerId: string): Promise<CueStackRow | null> {
    const rows = await this.db
      .select()
      .from(cueStack)
      .where(sql`${cueStack.player_id} = ${playerId}::uuid AND ${cueStack.state} IN ('pending', 'committed', 'executing')`)
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * C5 (design §8 verbatim — "save (depuis le stack pending/committed du joueur)") — the named-sequence
   * SAVE source read: narrower than `findCurrent` above (which also matches `executing`). A stack mid-tick
   * is deliberately NOT a legitimate save source (design §8 names only the two pre-execution states) —
   * `null` here while `findCurrent` would still find a row means "your current stack is executing,
   * recompose/wait before saving it as a template" (the service maps that to the same generic
   * `RESOURCE_STATE_CONFLICT` reorder/commit already use for "nothing usable right now").
   */
  async findSaveableStack(playerId: string): Promise<CueStackRow | null> {
    const rows = await this.db
      .select()
      .from(cueStack)
      .where(sql`${cueStack.player_id} = ${playerId}::uuid AND ${cueStack.state} IN ('pending', 'committed')`)
      .limit(1);
    return rows[0] ?? null;
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // Compose-time target-existence validation (design §5.1's "validateTarget", THIS chunk's stub —
  // see slot-type-executor.interface.ts's header for the C2/C3 split). Ownership-scoped: a target
  // that exists for ANOTHER player is treated identically to a target that does not exist at all
  // (never distinguishes "not yours" from "does not exist" — the `recruitment.repository.ts#
  // getCandidateForPlayer` precedent).
  // ═══════════════════════════════════════════════════════════════════════════════════════════

  /** `DISTRIBUTION_RUN` target: a SAVED route (design table — "dispatch sur la saved route ciblée",
   *  `distribution.service.ts:134`'s own `savedRouteId` dent) owned by this player. An AD-HOC
   *  (`is_saved=false`) route is not a legitimate cue-stack target — it is a per-dispatch ephemeral
   *  artifact, not a plannable one. */
  async routeExistsForPlayer(playerId: string, routeId: string): Promise<boolean> {
    const rows = await this.db
      .select({ route_id: route.route_id })
      .from(route)
      .where(sql`${route.route_id} = ${routeId}::uuid AND ${route.player_id} = ${playerId}::uuid AND ${route.is_saved} = true`)
      .limit(1);
    return rows.length > 0;
  }

  /** `MAINTENANCE_BATCH` target: a player-owned OPERATIONAL building (`building_operational_state`, the
   *  `maintenance.repository.ts#getScheduleTargetState` ownership shape). */
  async operationalBuildingExistsForPlayer(playerId: string, buildingId: string): Promise<boolean> {
    const rows = await this.db
      .select({ building_id: buildingOperationalState.building_id })
      .from(buildingOperationalState)
      .where(
        sql`${buildingOperationalState.building_id} = ${buildingId}::uuid AND ${buildingOperationalState.player_id} = ${playerId}::uuid`,
      )
      .limit(1);
    return rows.length > 0;
  }

  /** `EXCEPTION_BATCH_RESOLUTION` target: a player-owned OPERATIONAL building that CURRENTLY has ≥1
   *  PENDING card (`ExceptionsRepository.hasPendingForBuilding` REUSE, decisions §0 row 6) — "actionnable"
   *  (design §5.1) means there is an actual batch to resolve right now, not merely a building that
   *  exists. A building with zero pending cards is not yet a legitimate target (the batch may appear
   *  later — the player recomposes then). */
  async buildingHasPendingExceptionBatch(playerId: string, buildingId: string): Promise<boolean> {
    const owned = await this.operationalBuildingExistsForPlayer(playerId, buildingId);
    if (!owned) return false;
    return this.exceptionsRepo.hasPendingForBuilding(playerId, buildingId);
  }

  /** `RECRUITMENT_STEP` target: an `available` candidate owned by this player
   *  (`recruitment.repository.ts#getCandidateForPlayer`'s own ownership-scoped read + `startQuest`'s own
   *  `status !== 'available'` guard, decisions §0 row 15 — an in-quest/hired/expired candidate is not
   *  currently "actionnable"). */
  async availableCandidateExistsForPlayer(playerId: string, candidateId: string): Promise<boolean> {
    const rows = await this.db
      .select({ candidate_id: recruitmentCandidates.candidate_id })
      .from(recruitmentCandidates)
      .where(
        sql`${recruitmentCandidates.candidate_id} = ${candidateId}::uuid AND ${recruitmentCandidates.player_id} = ${playerId}::uuid AND ${recruitmentCandidates.status} = 'available'`,
      )
      .limit(1);
    return rows.length > 0;
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // C3 — firing-time reads (design §5.1's own executors' `execute` bodies; NEVER a business-rule guard —
  // those live in the REAL production verbs the executors call, this file only resolves the extra data
  // an executor needs to CALL that verb).
  // ═══════════════════════════════════════════════════════════════════════════════════════════

  /** `RECRUITMENT_STEP`'s own `questType` param (`RecruitmentQuestService.startQuest` requires it to
   *  MATCH `candidate.pool` — its own guard, `recruitment-quest.service.ts:118-121`). Ownership-scoped;
   *  `null` if the candidate no longer resolves for this player (the executor treats this as a genuine
   *  firing-time failure — the target existed at compose, may have vanished by firing). */
  async getCandidatePoolForPlayer(playerId: string, candidateId: string): Promise<string | null> {
    const rows = await this.db
      .select({ pool: recruitmentCandidates.pool })
      .from(recruitmentCandidates)
      .where(sql`${recruitmentCandidates.candidate_id} = ${candidateId}::uuid AND ${recruitmentCandidates.player_id} = ${playerId}::uuid`)
      .limit(1);
    return rows[0]?.pool ?? null;
  }

  /**
   * `EXCEPTION_BATCH_RESOLUTION`'s own firing-time read (design §5.1 table row 4, divergence #9 — the
   * ONE_TIME-only narrowing REALIZED as a SQL predicate): every currently-PENDING exception for this
   * player whose `candidate_actions` contains a member targeting `buildingId` (the SAME jsonb membership
   * test `hasPendingForBuilding` uses, :241-247 — "does this card belong to this building's batch at
   * all") AND whose `suggested_action.effect.type = 'ONE_TIME'` (the narrowing itself — a card whose
   * suggested action is `ESCALATE`/structural is NEVER auto-resolved, decisions §4.9: "une escalade est
   * une décision joueur, jamais automatisable par un slot"). `chosenActionId` is the suggested action's
   * OWN `id` (`OneTimeHandler.apply` records it into the resolution jsonb but does not itself validate it
   * — `one-time.handler.ts:13-18`). D3-compliant: a READ against the SHARED `exception_queue` table
   * schema (`db/schema/queues_exceptions_cuestack.ts`), zero edit / zero new query inside `src/exceptions/`.
   */
  async listPendingOneTimeExceptionsForBuilding(
    playerId: string,
    buildingId: string,
  ): Promise<Array<{ exceptionId: string; chosenActionId: string }>> {
    const result = await this.db.execute(sql`
      SELECT exception_id, coalesce(suggested_action->>'id', '') AS chosen_action_id
      FROM ${exceptionQueueRow}
      WHERE player_id = ${playerId}::uuid
        AND resolution_status = 'pending'
        AND suggested_action->'effect'->>'type' = 'ONE_TIME'
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(candidate_actions) AS elem
          WHERE elem->'effect'->>'target_building_id' = ${buildingId}
        )
    `);
    return rowsOf(result).map((r) => ({
      exceptionId: r['exception_id'] as string,
      chosenActionId: r['chosen_action_id'] as string,
    }));
  }

  /** The current game-minute for `StackCommittedEvent`'s own stamp (the `recruitment.repository.ts#
   *  getCurrentGameMinute` idiom, copied verbatim — no shared extraction across repositories is this
   *  codebase's established convention, distribution.controller.ts's own header). */
  async getCurrentGameMinute(playerId: string): Promise<number> {
    const rows = await this.db
      .select({ game_minute: citySimClock.game_minute })
      .from(citySimClock)
      .where(sql`${citySimClock.player_id} = ${playerId}::uuid`)
      .limit(1);
    return rows[0]?.game_minute ?? 0;
  }
}
