// IMPLEMENTS: docs/superpowers/plans/2026-07-13-p3-D-cue-annealing-plan.md §C6 ("AnnealingRepository+
//             AnnealingService : initiation/compounding UPSERT I5 (D10 — arithmétique SQL commutative) ;
//             ANNEALING_SETTLE_SWEEP ... real-clock constatif I6").
//             Design: docs/superpowers/specs/2026-07-13-p3-D-cue-annealing-design.md §9.1 (table shape) +
//             §9.3 (I5 — "Row absente/settled → initiation ... Row settling ACTIVE → compounding ...
//             L'arithmétique est portée par UN UPDATE (calcul en SQL sur les colonnes de la row)") + §9.4
//             (I6 — "UPDATE ... SET settled=true, throughput_multiplier=1.0, last_sweep_at=now() WHERE
//             settled=false AND settling_ends_at <= now() RETURNING").
//             Decisions: §1.10 D10 (compounding en UN UPDATE SQL commutatif) + §1.9 D9 (settling dérivé,
//             sweep constatif, minutes RÉELLES).
//             Schema: services/game-back/src/db/schema/cue_annealing.ts (`annealingStateRow`, mig 0129, C1).
//             — P3-D C6 — 2026-07-14
//
// `AnnealingRepository` — the persisted access layer for `annealing_state`. TWO atomic writers (0-TOCTOU):
//
//   1. `initiateOrCompound` — the I5 arbiter (design §9.3 verbatim SQL shape). ONE `INSERT ... ON CONFLICT
//      (player_id, building_id) DO UPDATE` statement whose EVERY `SET` expression is a `CASE` referencing
//      the TARGET table's own (pre-update) columns (`annealing_state.settled`/`annealing_state.
//      settling_ends_at`/etc. — Postgres's OWN semantics for an `ON CONFLICT DO UPDATE`'s `SET` clause:
//      these reference the ROW ABOUT TO BE UPDATED, i.e. the conflicting row's CURRENT committed values)
//      vs `EXCLUDED.*` (the values that WOULD have been inserted — i.e. a FRESH-initiation row). Postgres
//      takes a ROW-LEVEL LOCK on the conflicting unique-index entry BEFORE evaluating any `SET` expression,
//      so two genuinely concurrent callers targeting the SAME `(player_id, building_id)` SERIALIZE: the
//      second caller's `CASE` conditions are evaluated against the FIRST caller's ALREADY-COMMITTED new
//      values (the row is re-read fresh once the lock is acquired) — this is what makes "two concurrent
//      changes → 2 exact applications, ends_at reflects BOTH" (I5) true WITHOUT any extra advisory lock
//      (unlike `named-sequence.repository.ts#saveAtomic`'s own C5 fix, whose cap condition was NOT
//      row-scoped — THIS condition IS row-scoped, so the UPSERT's own row lock is the entire mechanism).
//   2. `sweepSettled` — the I6 arbiter (design §9.4 verbatim SQL shape). A GLOBAL (no player filter, mirrors
//      `LiveOpsSchedulerService.sweepExpiredEvents`'s own MINUTE/24 precedent) conditional
//      `UPDATE ... WHERE settled=false AND settling_ends_at<=now() RETURNING` — a row a CONCURRENT sweep
//      already flipped no longer matches `settled=false` by the time a second sweep's OWN UPDATE runs (the
//      SAME "re-evaluates the WHERE clause against the latest committed row version" guarantee this
//      codebase's other exactly-once UPDATEs already rely on, e.g. `cue-stack-execution.repository.ts`'s own
//      header) — "2 concurrent sweeps → ONE event per row" (I6) falls out for free.
//
// The compounding-history append is capped to the last `ANNEALING_COMPOUNDING_HISTORY_MAX_ENTRIES` entries
// via the jsonb `-` (remove-element-at-index) operator INSIDE the same UPSERT statement (DD-ANNEAL-SINGLETON
// — "l'historique va dans compounding_history jsonb BORNÉ… PAS de table d'événements", design §DD register) —
// a structural code constant (NOT a §14 tunable — this is a memory-budget/diagnostic-shape cap, not a
// game-balance knob, mirrors `resonant-cadence.service.ts#RESPONSE_HISTORY_MAX`'s own "local structural
// constant, not a registry key" precedent).
//
// P3-D C7 ADDITION (2026-07-15) — 2 more READ methods (`findActiveSettling`/`listActiveSettlingForPlayer`),
// both realizing the SAME design §9.1 derived predicate (`NOT settled AND settling_ends_at > now()`) at the
// SQL level (never re-derived off a possibly-stale JS read — clock-skew-safe): the C7 dispatch-compose seam
// (`distribution.service.ts`, single-building lookup ×2) + the C7 rolling-queue/session-glance readers
// (`annealing-rolling-queue.service.ts`/`session-open-sequence.service.ts`, whole-player scan). Neither
// writes. ALSO (documentation-only, no code here): a THIRD *writer* of this table now exists OUTSIDE this
// file — `CueStackRepository#commitWithSettlingGuard` (I7, design §10.2) directly touches `annealing_state`
// for the commit-triggered compounding-ONLY branch, because that write MUST share the exact same DB
// transaction as the `cue_stacks` I2 commit UPDATE (design: "MÊME transaction que I2") — a cross-repository
// shared-transaction has no precedent anywhere in this codebase (verified: no repository method anywhere
// accepts an external `tx` parameter), whereas a SINGLE method touching two tables inside ONE explicit
// `db.transaction(...)` is an ALREADY-established idiom (`maintenance.repository.ts#debitAndArmSchedule`,
// touching `economy_states` + `building_operational_state` together). This diverges from this same lot's OWN
// C6-authored anticipation in `annealing.module.ts` ("C7's own future commit-guard integration" — written
// expecting a `CueStackModule` → `AnnealingModule` import); surfaced honestly rather than silently landing
// something else — see `cue-stack.repository.ts#commitWithSettlingGuard`'s own header for the full account.

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { annealingStateRow, type AnnealingStateRow } from '../../db/schema/cue_annealing';
import type { LiveChangeType } from './initiating-change.catalogue';

/** Diagnostic history cap (BO-only, DD-ANNEAL-SINGLETON) — NOT a §14 tunable (a shape/memory-budget
 *  constant, mirrors `resonant-cadence.service.ts#RESPONSE_HISTORY_MAX`). */
export const ANNEALING_COMPOUNDING_HISTORY_MAX_ENTRIES = 10;

/** Defensive dual-shape read for a raw `db.execute` result (the `cue-stack.repository.ts`/`cue-stack-
 *  execution.repository.ts` idiom, copied verbatim — no shared extraction across repositories, this
 *  codebase's own convention). */
function rowsOf(result: unknown): Array<Record<string, unknown>> {
  return (result as { rows?: Array<Record<string, unknown>> }).rows ?? (result as Array<Record<string, unknown>>);
}

export interface InitiateOrCompoundParams {
  readonly playerId: string;
  readonly buildingId: string;
  readonly changeType: LiveChangeType;
  readonly ref: string;
  /** `coreLoopsTunables.annealingBaseSettlingMinutes` (getter-resolved by the CALLER, R2.3 — never inlined
   *  here). */
  readonly baseSettlingMinutes: number;
  /** `coreLoopsTunables.annealingCompoundingMultiplier` (getter-resolved by the CALLER). */
  readonly compoundingMultiplier: number;
  /** `coreLoopsTunables.annealingCompoundingThroughputPenalty` (getter-resolved by the CALLER). */
  readonly throughputPenalty: number;
}

@Injectable()
export class AnnealingRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * The I5 arbiter — ONE UPSERT, both branches (design §9.3 verbatim). See file header for the full
   * concurrency argument. Returns the FINAL row after this call's OWN application; the caller derives
   * "was this an initiation or a compounding" from `changes_during_settling` alone (`0` ⟺ this call took
   * the fresh-initiation branch — a re-init ALWAYS resets it to `0`; a compounding ALWAYS increments the
   * prior value, which is `>= 0`, to something `>= 1` — the two branches partition disjointly on this ONE
   * returned column, no extra read needed, no TOCTOU between "which branch fired" and "what got written").
   */
  async initiateOrCompound(params: InitiateOrCompoundParams): Promise<AnnealingStateRow> {
    const { playerId, buildingId, changeType, ref, baseSettlingMinutes, compoundingMultiplier, throughputPenalty } = params;
    const initiatingChangeJson = JSON.stringify({ change_type: changeType, ref });

    // The "is this row CURRENTLY actively settling" predicate, evaluated against the CONFLICTING row's
    // pre-update columns (design §9.3: "Row absente/settled → initiation ... Row settling ACTIVE →
    // compounding"). Repeated verbatim in every SET's CASE (Postgres evaluates each independently; there is
    // no shared "let" inside a single INSERT statement).
    const isActive = sql`(NOT ${annealingStateRow.settled} AND ${annealingStateRow.settling_ends_at} > now())`;

    const result = await this.db.execute(sql`
      INSERT INTO ${annealingStateRow} (
        player_id, building_id, initiating_change, settling_started_at, settling_ends_at,
        changes_during_settling, throughput_multiplier, compounding_history, settled, last_sweep_at
      ) VALUES (
        ${playerId}::uuid, ${buildingId}::uuid, ${initiatingChangeJson}::jsonb, now(),
        now() + (${baseSettlingMinutes}::numeric * interval '1 minute'),
        0, 0.9, '[]'::jsonb, false, NULL
      )
      ON CONFLICT (player_id, building_id) DO UPDATE SET
        initiating_change = CASE WHEN ${isActive} THEN ${annealingStateRow.initiating_change} ELSE EXCLUDED.initiating_change END,
        settling_started_at = CASE WHEN ${isActive} THEN ${annealingStateRow.settling_started_at} ELSE EXCLUDED.settling_started_at END,
        settling_ends_at = CASE
          WHEN ${isActive}
            THEN now() + (${annealingStateRow.settling_ends_at} - now()) * ${compoundingMultiplier}::float8
          ELSE EXCLUDED.settling_ends_at
        END,
        changes_during_settling = CASE
          WHEN ${isActive} THEN ${annealingStateRow.changes_during_settling} + 1
          ELSE 0
        END,
        throughput_multiplier = CASE
          WHEN ${isActive} THEN ${annealingStateRow.throughput_multiplier} * (1 - ${throughputPenalty}::float8)
          ELSE EXCLUDED.throughput_multiplier
        END,
        compounding_history = CASE
          WHEN ${isActive}
            THEN (
              CASE WHEN jsonb_array_length(${annealingStateRow.compounding_history}) >= ${ANNEALING_COMPOUNDING_HISTORY_MAX_ENTRIES}::int
                THEN (${annealingStateRow.compounding_history} - 0)
                ELSE ${annealingStateRow.compounding_history}
              END
            ) || jsonb_build_array(jsonb_build_object('change_type', ${changeType}::text, 'ref', ${ref}::text, 'at', now()))
          ELSE EXCLUDED.compounding_history
        END,
        settled = false,
        last_sweep_at = CASE WHEN ${isActive} THEN ${annealingStateRow.last_sweep_at} ELSE NULL END
      RETURNING player_id, building_id, initiating_change, settling_started_at, settling_ends_at,
                changes_during_settling, throughput_multiplier, compounding_history, settled, last_sweep_at
    `);
    const row = rowsOf(result)[0];
    return row as unknown as AnnealingStateRow;
  }

  /**
   * The I6 arbiter — the GLOBAL real-clock sweep (design §9.4 verbatim SQL shape; file header for the
   * concurrency argument). Touches ONLY the 3 columns design §9.4 names — nothing else (`changes_during_
   * settling`/`compounding_history`/`initiating_change` are left as a historical diagnostic record until
   * the NEXT `initiateOrCompound` call overwrites them fresh). Returns exactly the rows THIS call flipped —
   * the caller emits `SettlingCompletedEvent` for each (I6 exactly-once, the RETURNING gates the emit).
   */
  async sweepSettled(): Promise<Array<{ player_id: string; building_id: string }>> {
    const result = await this.db.execute(sql`
      UPDATE ${annealingStateRow}
      SET settled = true, throughput_multiplier = 1.0, last_sweep_at = now()
      WHERE settled = false AND settling_ends_at <= now()
      RETURNING player_id, building_id
    `);
    return rowsOf(result) as unknown as Array<{ player_id: string; building_id: string }>;
  }

  /**
   * C7 — the "is (player, building) CURRENTLY actively settling" read (design §9.1 derived predicate,
   * `NOT settled AND settling_ends_at > now()`, evaluated AT THE DATABASE — never off a JS-side read of a
   * possibly-stale `settled` column). `null` for EITHER "no row ever created" OR "settled/expired" — both
   * read identically as "not currently settling", the ONE derived boolean design §9.1 names. Used by the C7
   * dispatch-compose seam (`distribution.service.ts`): origin/destination each get ONE call.
   */
  async findActiveSettling(playerId: string, buildingId: string): Promise<AnnealingStateRow | null> {
    const rows = await this.db
      .select()
      .from(annealingStateRow)
      .where(
        sql`${annealingStateRow.player_id} = ${playerId}::uuid AND ${annealingStateRow.building_id} = ${buildingId}::uuid
            AND ${annealingStateRow.settled} = false AND ${annealingStateRow.settling_ends_at} > now()`,
      )
      .limit(1);
    return (rows[0] as AnnealingStateRow | undefined) ?? null;
  }

  /**
   * C7 — every row for `playerId` CURRENTLY actively settling (the SAME derived predicate as
   * `findActiveSettling`, batched). Small per-player cardinality (F4 memory budget — "~5 settling"). Used
   * by the rolling-queue projection (`settling` array + `touchable` exclusion set) and the session-open
   * `settling_glance` count — BOTH need "how many/which buildings are settling RIGHT NOW", never merely
   * "has a row ever been created" (a settled/expired row must NOT count).
   */
  async listActiveSettlingForPlayer(playerId: string): Promise<AnnealingStateRow[]> {
    return this.db
      .select()
      .from(annealingStateRow)
      .where(
        sql`${annealingStateRow.player_id} = ${playerId}::uuid AND ${annealingStateRow.settled} = false AND ${annealingStateRow.settling_ends_at} > now()`,
      ) as unknown as Promise<AnnealingStateRow[]>;
  }

  /** Plain read — one (player, building) row, or `null`. Used by the BO surfaces (later chunks) + the
   *  `_test` read routes this chunk's own falsifiable floor exercises. */
  async findState(playerId: string, buildingId: string): Promise<AnnealingStateRow | null> {
    const rows = await this.db
      .select()
      .from(annealingStateRow)
      .where(and(eq(annealingStateRow.player_id, playerId), eq(annealingStateRow.building_id, buildingId)))
      .limit(1);
    return (rows[0] as AnnealingStateRow | undefined) ?? null;
  }

  /** Plain read — every annealing row for a player (unordered; small per-player cardinality, F4 memory
   *  budget note design §Récap mémoire). Used by the `_test` read routes + (later) the rolling-queue C7. */
  async listStatesForPlayer(playerId: string): Promise<AnnealingStateRow[]> {
    return this.db.select().from(annealingStateRow).where(eq(annealingStateRow.player_id, playerId)) as unknown as Promise<
      AnnealingStateRow[]
    >;
  }

  /**
   * TEST-ONLY escape hatch (mirrors `legal-test.controller.ts#forceExpireCase`'s own "directly set a
   * column to make it eligible" idiom): backdates `settling_ends_at` on a row directly — the state-not-timer
   * falsifiable seam (design §9.4: "le test AVANCE l'horloge de la row ... jamais un sleep"). A REAL write
   * (no fig-leaf), but ONLY ever called from `AnnealingTestController` (never a production code path — there
   * is no legitimate PLAYER/BO verb that backdates a timestamp).
   */
  async testBackdateEndsAt(playerId: string, buildingId: string, endsAt: Date): Promise<void> {
    await this.db
      .update(annealingStateRow)
      .set({ settling_ends_at: endsAt })
      .where(and(eq(annealingStateRow.player_id, playerId), eq(annealingStateRow.building_id, buildingId)));
  }

  /**
   * C8 — BO force (`POST /admin/nodes/:id/force-settling-end`, design §17 "f3_deferred"): the SAME 3-column
   * I6 completion write `sweepSettled` performs (`settled=true, throughput_multiplier=1.0,
   * last_sweep_at=now()`), scoped to ONE `(player_id, building_id)` row REGARDLESS of `settling_ends_at`
   * (a live-ops "end this node's settling right now" reproduction tool — mirrors `supply-chain-admin.
   * controller.ts#forceBackpressure`'s own "ADMIN_FORCED, real write, real column" convention). Guarded by
   * `settled = false` (0-TOCTOU — a row already settled, or a concurrent I6 sweep that just settled it,
   * both correctly return `null`; the controller's OWN pre-check distinguishes "no such row at all" from
   * "already settled" for the 404 vs 409 split). Never touches `changes_during_settling`/
   * `compounding_history`/`initiating_change` (the SAME "historical diagnostic record, left as-is" posture
   * `sweepSettled` itself documents).
   */
  async forceSettleOne(playerId: string, buildingId: string): Promise<{ playerId: string; buildingId: string } | null> {
    const result = await this.db.execute(sql`
      UPDATE ${annealingStateRow}
      SET settled = true, throughput_multiplier = 1.0, last_sweep_at = now()
      WHERE player_id = ${playerId}::uuid AND building_id = ${buildingId}::uuid AND settled = false
      RETURNING player_id, building_id
    `);
    const row = rowsOf(result)[0];
    return row ? { playerId: String(row.player_id), buildingId: String(row.building_id) } : null;
  }
}
