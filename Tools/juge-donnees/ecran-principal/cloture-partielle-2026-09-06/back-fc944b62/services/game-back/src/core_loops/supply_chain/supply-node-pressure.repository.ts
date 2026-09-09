// IMPLEMENTS: docs/superpowers/plans/2026-07-12-p3-C-supply-chain-plan.md §C5 (`BACKPRESSURE_UPDATE` —
//             source accrual + BFS propagation + relief)
//             Design: docs/superpowers/specs/2026-07-12-p3-C-supply-chain-design.md §6.2 (the 3-step
//             tick) + §10.2 (`supply_node_pressure` schema) + §15 I5 (bounds + one-propagation-per-tick).
//             Pattern (batched multi-row upsert, EXCLUDED-referencing raw SQL): `deal-lek.repository.ts
//             formLeks` (`INSERT ... SELECT ... FROM (VALUES ...) ON CONFLICT DO UPDATE SET x = LEAST(cap,
//             x + EXCLUDED.x)` — the SAME idiom this file's `accrueSources`/`applyPropagation` copy
//             verbatim) + `LegRepository.applyNightlyDecayAndStressEval`'s own day/tick-keyed idempotency
//             CASE-guard shape (here: `last_propagation_tick = $gameMinute` guards EVERY write, I5).
//             — P3-C C5 — 2026-07-12
//
// `SupplyNodePressureRepository` — the persisted access layer for `supply_node_pressure` (Loop 3 —
// Backpressure Trace). THREE set-based (T3) writers, one per `BACKPRESSURE_UPDATE` tick step (design
// §6.2), each independently I5-idempotent via the SAME `last_propagation_tick = $gameMinute` CASE-guard
// (a same-gameMinute re-run of ANY of the 3 touches ZERO additional state on a row already stamped this
// tick):
//   1. `accrueSources`    — step 1: `backpressure_index += delta` (delta already weight-adjusted by the
//      caller — full or half-weight, design §8.3), capped LEAST(...,1.0); `is_blocked_output=true`;
//      `blocked_sources` = the union of this tick's diagnostic tags; arrow/hops cleared (a SOURCE has no
//      arrow — it IS the source).
//   2. `applyPropagation` — step 2: `backpressure_index` is SET (never added — the caller already
//      resolved the winning BFS candidate's floored value) to the propagated value; `is_blocked_output=
//      false` (a propagated node is not itself a diagnosed source); arrow/hops set to the BFS winner.
//   3. `applyRelief`      — step 3: every OTHER existing row for this player (excluded: every building
//      touched by 1 or 2 this tick) decays `backpressure_index` by `reliefPerTick` (floor 0), clearing
//      `is_blocked_output`/arrow/hops IMMEDIATELY (design §6.2's own "se nettoient quand la condition
//      tombe" — the condition falls the MOMENT a node stops being reached, not gradually as the index
//      itself decays).
// A player with NO blocked sources AND NO existing `supply_node_pressure` rows sees all 3 statements match
// ZERO rows — the "tick no-op, 0 writes" falsifiable case (plan §C5), the SAME "L1 natural" idiom every
// sibling tick in this codebase already documents.

import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { supplyNodePressureRow } from '../../db/schema/supply_chain_loops';

// TD-550 — le handle de transaction pour `seedCalmNode` (welcome grant, threadé). Même dérivation que
// `Tx` (money-holding.repository.ts:46) / `LaunderingPersistenceTx` (laundering-persistence.service.ts:38)
// — le patron maison à `tx` OBLIGATOIRE, jamais `executor?:` (CLAUDE.md "OPTIONNEL est un marqueur qui
// convertit une erreur de compilation en comportement silencieux" — un paramètre optionnel qu'un
// appelant oublie devient une branche morte muette, exactement le risque ici : `db` est pool-backed,
// `db/index.ts:30`).
export type SupplyNodePressureTx = Parameters<Parameters<DrizzleClient['transaction']>[0]>[0];

/** ONE source-accrual write (design §6.2 step 1) — `delta` is ALREADY weight-adjusted + pre-cap. */
export interface SourceAccrual {
  readonly buildingId: string;
  readonly delta: number;
  readonly sourceTags: readonly string[];
}

/** ONE propagation write (design §6.2 step 2) — `receivedIndex` is ALREADY floored (the final value). */
export interface PropagatedWrite {
  readonly buildingId: string;
  readonly receivedIndex: number;
  readonly arrowToBuildingId: string;
  readonly hops: number;
}

/** The raw persisted row (BO-only R2.2 — TEST-ONLY / internal consumption; never returned to a player). */
export interface RawNodePressureRow {
  buildingId: string;
  backpressureIndex: number;
  isBlockedOutput: boolean;
  blockedSources: string[];
  arrowToBuildingId: string | null;
  sourceDistanceHops: number | null;
  lastPropagationTick: number | null;
}

/** Defensive dual-shape read for a raw `db.execute` result (the `forensic.repository.ts` idiom). */
function rowsOf(result: unknown): Array<Record<string, unknown>> {
  return (result as { rows?: Array<Record<string, unknown>> }).rows ?? (result as Array<Record<string, unknown>>);
}

@Injectable()
export class SupplyNodePressureRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * Step 1 (design §6.2) — batched source accrual. ONE `INSERT ... SELECT ... FROM (VALUES ...) ON
   * CONFLICT DO UPDATE` (the `deal-lek.repository.ts formLeks` idiom) across every currently-blocked
   * building this tick. I5: the `backpressure_index` increment (and the `last_propagation_tick` stamp) is
   * skipped on a row ALREADY stamped `= gameMinute` (a same-gameMinute re-run adds nothing a second time);
   * `is_blocked_output`/`blocked_sources` are re-asserted unconditionally (idempotent — the SAME tags
   * re-written twice is harmless). Organic no-op for an empty `accruals` array (0 statements sent).
   *
   * RETURNS the POST-accrual `backpressure_index` per building (`RETURNING`) — `BackpressureUpdateService`
   * needs THIS tick's resultant source magnitude (not the pre-accrual value) as the BFS propagation's own
   * `source_pressure` input (design §6.2 step 2 runs AFTER step 1 in the same tick).
   */
  async accrueSources(
    playerId: string,
    gameMinute: number,
    accruals: readonly SourceAccrual[],
  ): Promise<Array<{ buildingId: string; backpressureIndex: number }>> {
    if (accruals.length === 0) return [];
    const valueRows = accruals.map(
      (a) =>
        sql`(${a.buildingId}::uuid, ${Math.min(Math.max(a.delta, 0), 1.0)}::real, ${JSON.stringify([...a.sourceTags])}::jsonb)`,
    );
    const result = await this.db.execute(sql`
      INSERT INTO ${supplyNodePressureRow} (player_id, building_id, backpressure_index, is_blocked_output, blocked_sources, last_propagation_tick)
      SELECT ${playerId}::uuid, v.building_id, v.delta, true, v.sources, ${gameMinute}::bigint
      FROM (VALUES ${sql.join(valueRows, sql`, `)})
        AS v(building_id, delta, sources)
      ON CONFLICT (player_id, building_id) DO UPDATE SET
        backpressure_index = CASE
          WHEN ${supplyNodePressureRow.last_propagation_tick} = ${gameMinute}::bigint
            THEN ${supplyNodePressureRow.backpressure_index}
          ELSE LEAST(${supplyNodePressureRow.backpressure_index} + EXCLUDED.backpressure_index, 1.0)
        END,
        is_blocked_output = true,
        blocked_sources = EXCLUDED.blocked_sources,
        arrow_to_building_id = NULL,
        source_distance_hops = NULL,
        last_propagation_tick = ${gameMinute}::bigint
      RETURNING building_id, backpressure_index
    `);
    return rowsOf(result).map((r) => ({ buildingId: String(r.building_id), backpressureIndex: Number(r.backpressure_index) }));
  }

  /**
   * Step 2 (design §6.2) — batched propagation writes. ONE `INSERT ... SELECT ... FROM (VALUES ...) ON
   * CONFLICT DO UPDATE`, the SAME shape as `accrueSources` except `backpressure_index` is a plain SET
   * (never additive — the BFS winner's value already reflects the CURRENT source's magnitude decayed by
   * hop distance; re-adding it tick after tick would defeat the decay). I5: same guard. Organic no-op for
   * an empty `writes` array.
   */
  async applyPropagation(playerId: string, gameMinute: number, writes: readonly PropagatedWrite[]): Promise<void> {
    if (writes.length === 0) return;
    const valueRows = writes.map(
      (w) => sql`(${w.buildingId}::uuid, ${w.receivedIndex}::real, ${w.arrowToBuildingId}::uuid, ${w.hops}::smallint)`,
    );
    await this.db.execute(sql`
      INSERT INTO ${supplyNodePressureRow} (player_id, building_id, backpressure_index, is_blocked_output, blocked_sources, arrow_to_building_id, source_distance_hops, last_propagation_tick)
      SELECT ${playerId}::uuid, v.building_id, v.received, false, '[]'::jsonb, v.arrow_to, v.hops, ${gameMinute}::bigint
      FROM (VALUES ${sql.join(valueRows, sql`, `)})
        AS v(building_id, received, arrow_to, hops)
      ON CONFLICT (player_id, building_id) DO UPDATE SET
        backpressure_index = CASE
          WHEN ${supplyNodePressureRow.last_propagation_tick} = ${gameMinute}::bigint
            THEN ${supplyNodePressureRow.backpressure_index}
          ELSE EXCLUDED.backpressure_index
        END,
        is_blocked_output = false,
        blocked_sources = '[]'::jsonb,
        arrow_to_building_id = EXCLUDED.arrow_to_building_id,
        source_distance_hops = EXCLUDED.source_distance_hops,
        last_propagation_tick = ${gameMinute}::bigint
    `);
  }

  /**
   * Step 3 (design §6.2 / D8) — relief. ONE set-based `UPDATE ... WHERE` across every OTHER row this
   * player owns (`building_id != ALL(excludeBuildingIds)` — every building steps 1/2 touched THIS tick):
   * `backpressure_index = GREATEST(0, index - reliefPerTick)`; `is_blocked_output`/arrow/hops clear
   * IMMEDIATELY (design's own "se nettoient quand la condition tombe" — the moment the node stops being
   * reached, not gradually). I5: guarded by the SAME `last_propagation_tick != gameMinute` predicate (a
   * row already relieved THIS gameMinute is excluded from a second relief pass). Organic no-op when the
   * player has no `supply_node_pressure` rows at all (0 rows matched — the "tick no-op" falsifiable case).
   */
  async applyRelief(
    playerId: string,
    gameMinute: number,
    reliefPerTick: number,
    excludeBuildingIds: readonly string[],
  ): Promise<void> {
    const excludeArray =
      excludeBuildingIds.length > 0
        ? sql`ARRAY[${sql.join(
            excludeBuildingIds.map((id) => sql`${id}::uuid`),
            sql`, `,
          )}]::uuid[]`
        : sql`ARRAY[]::uuid[]`;
    await this.db.execute(sql`
      UPDATE ${supplyNodePressureRow}
      SET
        backpressure_index = GREATEST(0, ${supplyNodePressureRow.backpressure_index} - ${reliefPerTick}::real),
        is_blocked_output = false,
        arrow_to_building_id = NULL,
        source_distance_hops = NULL,
        last_propagation_tick = ${gameMinute}::bigint
      WHERE ${supplyNodePressureRow.player_id} = ${playerId}::uuid
        AND ${supplyNodePressureRow.building_id} != ALL(${excludeArray})
        AND (${supplyNodePressureRow.last_propagation_tick} IS NULL
          OR ${supplyNodePressureRow.last_propagation_tick} != ${gameMinute}::bigint)
    `);
  }

  /**
   * `findOne` (P3-C C6, design §6.3 — the trace verb's per-hop read) — the RAW row for ONE (player,
   * building) pair, or `null` if none exists yet (a building with zero backpressure signal — never a
   * source, never reached by propagation). `BackpressureTraceService` is the ONLY production consumer:
   * `traceStep`/`resolve` gate EVERY "is this genuinely a source right now" decision on `isBlockedOutput`
   * here, NEVER on `blockedSources` (the C5 ⊥ MINOR-2 finding — `applyRelief` above clears
   * `is_blocked_output`/`arrow_to_building_id` IMMEDIATELY but deliberately leaves `blocked_sources` at
   * its last-written value, so a relieved node's `blockedSources` array can be STALE; reading it as a
   * "currently blocked" signal would silently resurrect a node that has already relieved). A missing row
   * is treated by the caller as the same zero-state `readAllRaw` implies for an untouched building
   * (index 0, not blocked, no arrow) — NOT a 404; a building this player has never touched carries no
   * backpressure signal, which is itself a valid, traceable answer ("silent, no arrow").
   */
  async findOne(playerId: string, buildingId: string): Promise<RawNodePressureRow | null> {
    const result = await this.db.execute(sql`
      SELECT building_id, backpressure_index, is_blocked_output, blocked_sources, arrow_to_building_id,
             source_distance_hops, last_propagation_tick
      FROM ${supplyNodePressureRow}
      WHERE player_id = ${playerId}::uuid AND building_id = ${buildingId}::uuid
      LIMIT 1
    `);
    const row = rowsOf(result)[0];
    if (!row) return null;
    return {
      buildingId: String(row.building_id),
      backpressureIndex: Number(row.backpressure_index),
      isBlockedOutput: Boolean(row.is_blocked_output),
      blockedSources: Array.isArray(row.blocked_sources) ? (row.blocked_sources as string[]) : [],
      arrowToBuildingId: row.arrow_to_building_id === null ? null : String(row.arrow_to_building_id),
      sourceDistanceHops: row.source_distance_hops === null ? null : Number(row.source_distance_hops),
      lastPropagationTick: row.last_propagation_tick === null ? null : Number(row.last_propagation_tick),
    };
  }

  /**
   * `forceSet` (P3-C C9, design §14 — the BO `POST /admin/nodes/:id/force-backpressure` live-ops force)
   * — an ADMIN OVERRIDE write, bypassing the normal accrual/BFS pipeline entirely (mirrors 04f-A's own
   * "force-phase = anchor-set" precedent: a direct, single-purpose admin poke, not a re-derivation).
   * Tags `blocked_sources = ['ADMIN_FORCED']` — a deliberately OUT-OF-DOMAIN marker (never one of the 6
   * real `BlockedOutputSource` members) so any BO diagnostic reading `blocked_sources` back can tell an
   * admin-forced state apart from an organically-detected one at a glance. `index` is clamped to [0,1]
   * by the CALLER (the admin controller) before this method ever sees it — this method trusts its input,
   * the SAME "resolved-values-in, atomic-statement-out" shape `LegRepository.upsertThroughput` documents.
   */
  async forceSet(
    playerId: string,
    buildingId: string,
    index: number,
    gameMinute: number,
  ): Promise<{ buildingId: string; backpressureIndex: number }> {
    const [row] = await this.db
      .insert(supplyNodePressureRow)
      .values({
        player_id: playerId,
        building_id: buildingId,
        backpressure_index: index,
        is_blocked_output: true,
        blocked_sources: ['ADMIN_FORCED'],
        arrow_to_building_id: null,
        source_distance_hops: null,
        last_propagation_tick: gameMinute,
      })
      .onConflictDoUpdate({
        target: [supplyNodePressureRow.player_id, supplyNodePressureRow.building_id],
        set: {
          backpressure_index: index,
          is_blocked_output: true,
          blocked_sources: ['ADMIN_FORCED'],
          arrow_to_building_id: null,
          source_distance_hops: null,
          last_propagation_tick: gameMinute,
        },
      })
      .returning({ buildingId: supplyNodePressureRow.building_id, backpressureIndex: supplyNodePressureRow.backpressure_index });
    return { buildingId: row!.buildingId, backpressureIndex: row!.backpressureIndex };
  }

  /**
   * `readAllRaw` (TEST-ONLY, DD-P3 — "lire l'état brut BO-only R2.2 TEST-ONLY") — every
   * `supply_node_pressure` row this player owns, RAW (never surfaced to a player — R2.2; C6/C9 build the
   * bucket-only production reads). Used by `SupplyChainTestController`'s own gated route AND (P3-C C6)
   * `BackpressureTraceService.resolve`'s `next_warmest_cluster` ranking (readAllRaw's own raw index is
   * used ONLY to rank server-side — the response projects `{building_id, bucket}` only, never the index).
   */
  async readAllRaw(playerId: string): Promise<RawNodePressureRow[]> {
    const result = await this.db.execute(sql`
      SELECT building_id, backpressure_index, is_blocked_output, blocked_sources, arrow_to_building_id,
             source_distance_hops, last_propagation_tick
      FROM ${supplyNodePressureRow}
      WHERE player_id = ${playerId}::uuid
    `);
    return rowsOf(result).map((r) => ({
      buildingId: String(r.building_id),
      backpressureIndex: Number(r.backpressure_index),
      isBlockedOutput: Boolean(r.is_blocked_output),
      blockedSources: Array.isArray(r.blocked_sources) ? (r.blocked_sources as string[]) : [],
      arrowToBuildingId: r.arrow_to_building_id === null ? null : String(r.arrow_to_building_id),
      sourceDistanceHops: r.source_distance_hops === null ? null : Number(r.source_distance_hops),
      lastPropagationTick: r.last_propagation_tick === null ? null : Number(r.last_propagation_tick),
    }));
  }

  /**
   * `seedCalmNode` (TD-550, welcome grant) — crée la ligne `supply_node_pressure` d'UN bâtiment
   * fraîchement octroyé, DANS la transaction de l'appelant, à l'état CALME :
   * `backpressure_index=0`, `is_blocked_output=false`, `blocked_sources=[]`,
   * `arrow_to_building_id=null`, `source_distance_hops=null`, `last_propagation_tick=null` —
   * EXACTEMENT les DEFAULT de la table (migration 0125_supply_chain.sql:152-162) et EXACTEMENT
   * l'état "jamais touché" que `findOne` documente déjà pour une ligne absente ("index 0, not
   * blocked, no arrow"). Aucune valeur inventée : ce sont les SEULES valeurs qu'une ligne neuve
   * peut honnêtement porter avant qu'un tick `BACKPRESSURE_UPDATE` ne l'ait jamais vue — et ce tick
   * ne tourne PAS sur cette pile (`CITYSIM_CONTINUOUS_LOOPS` n'est posé que sur staging).
   *
   * SANS cette ligne, `SupplyChainGraphService.getGraph` (`readAllRaw`, ci-dessus) ne rend `nodes: []`
   * pour AUCUN joueur avant le premier tick réel — TD-550 : la section "LA CHAÎNE, EN REMONTANT" de
   * l'écran ㉚ n'a alors AUCUNE source, et les 3 routes qui prennent un `building_id` de nœud
   * (`nodes/:id/backpressure`, `trace-step`, `resolve`) sont inatteignables faute d'id à passer.
   *
   * ⛔ `tx` OBLIGATOIRE, EN PREMIER : `db` est pool-backed (`db/index.ts:30`). Appelée sans le `tx`
   * du grant, cette écriture prendrait une AUTRE connexion — invisible à la revendication
   * à-au-plus-une-fois du grant (D1.1 pt 1), et perdue si le grant échoue ensuite. Même risque, même
   * forme que `LaunderingPersistenceService.createSafehouse` (`tx` obligatoire en premier paramètre),
   * appelé sur LA MÊME transaction, dans LA MÊME boucle.
   *
   * IDEMPOTENT (`ON CONFLICT DO NOTHING`) — un second appel pour le même (player, building) (le
   * repair-seam de `session/open`, D1.1 pt 3) n'écrase JAMAIS un état réel qu'un tick aurait depuis
   * fait évoluer : la PK existe déjà, l'INSERT ne fait rien.
   */
  async seedCalmNode(tx: SupplyNodePressureTx, playerId: string, buildingId: string): Promise<void> {
    await tx.execute(sql`
      INSERT INTO ${supplyNodePressureRow} (player_id, building_id)
      VALUES (${playerId}::uuid, ${buildingId}::uuid)
      ON CONFLICT (player_id, building_id) DO NOTHING
    `);
  }
}
