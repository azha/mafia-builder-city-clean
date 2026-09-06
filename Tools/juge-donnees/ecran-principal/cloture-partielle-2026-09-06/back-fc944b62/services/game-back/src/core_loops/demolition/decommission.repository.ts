// IMPLEMENTS: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md §C4 (write-path
//             DD-E1 généralisé + gardes §6.2 + la tx §6.3 complète)
//             Design: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §3.3
//             (réconciliation write-path — decommissionOwnedNode, DD-E1) + §6.2 (gardes, chacune
//             falsifiable) + §6.3 (la tx atomique — voisins pré-calculés, garde+mutation I2, débit I3,
//             sever routes D10, re-eval friction synchrone f, audit gouverneur/last_decommission_at_tick).
//             Decisions: D7 (lieutenant assigné → 409, jamais d'auto-unassign) ; D8 (friction_org_size==1
//             → 409 LAST_NODE) ; D9 (basis = setup_cost si converti sinon prix d'acquisition) ; D10
//             (sever via le mécanisme EXISTANT, jamais DELETE brut) ; D19 (éligibilité = TOUT node
//             possédé non-'demolished') ; DD-E1 (méthode repo ADDITIVE, `demolishAndClear` INTOUCHÉ) ;
//             R1 (route-sever + garde-lieutenant sont des AJOUTS P3-E, `demolishAndClear` ne les fait
//             PAS) ; R14 (sever = `RouteLifecycleRepository.severIfNotAlready`'s OWN semantics — a
//             set-based sibling HERE, not a cross-repository tx-sharing call, R14's own "coder's call at
//             C4, not a blocker either way") ; R17 (op-row DELETE-if-exists — 0-row LÉGITIME).
//             Pattern: `equipment-failure-exception.repository.ts#demolishAndClear` (the mutation SET
//             this generalizes) + `real-estate.repository.ts#debitAndInsertPlayerBuilding` (the guarded
//             single-statement debit, I3) + `route-lifecycle.repository.ts#severIfNotAlready` (the
//             per-route sever semantics, batched here) + `friction-budget.repository.ts#
//             reevaluateAndTransitionLocked` (★ C4 — the SAME tx shares this call, design §6.3(f)).
//             — P3-E C4 — 2026-07-17
//
// `DecommissionRepository.decommissionOwnedNode` — the ONE transaction (design §6.3): every guard that
// can refuse the decommission THROWS an `ApiError` from WITHIN the transaction callback — Drizzle rolls
// the WHOLE transaction back on any throw (the SAME "return null on a failed guarded debit" shape
// `debitAndInsertPlayerBuilding` uses, just via throw since there are 5 DISTINCT refusal reasons here,
// each needing its OWN error code) — so "ZERO mutation on refusal" holds regardless of HOW FAR a losing
// concurrent racer got before its OWN guard finally caught the race (I2/I3, the concurrency proof).
//
// TWO DOORS, ONE MUTATION SET (DD-E1): `demolishAndClear` (04f-A, equipment-failure-exception.repository.
// ts) stays INTOUCHED — gated on the operational-chain 'failed' state, zero routes/lieutenant handling
// (R1). This method is the SECOND door (D19 — eligibility widened to TOUT node possédé non-'demolished',
// the ★#1 all-owned périmètre) — the SAME terminal mutation (`buildings.structural_state='demolished'` +
// operational-row DELETE) PLUS the 2 GENUINELY NEW additions R1 flags: route-sever (§6.3.d) and the
// lieutenant guard (§6.2/D7).

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { ApiError } from '../../protocol/api-error';
import { building } from '../../db/schema/city_state';
import { buildingOperationalState } from '../../db/schema/operational_chain';
import { lieutenant } from '../../db/schema/lieutenant';
import { economyState } from '../../db/schema/player_economy_state';
import { citySimClock } from '../../db/schema/city_sim_clock';
import { blocks, districts } from '../../db/schema/world_geography';
import type { CoverQuality, M1OperationalType } from '../../operational/real_estate/conversion-tunables';
import { FrictionBudgetRepository, type FrictionFormulaTunables, type FrictionReevalResult } from './friction-budget.repository';
import { gameDaysToTicks } from './friction-formula';
import { scoreReplacementCandidates } from './replacement-option-scorer';
import { ReplacementOptionRepository } from './replacement-option.repository';
// P3-E C8 (extracted, DRY — this file's own header note): the D9 basis/cost formula now lives in ONE
// place, shared verbatim with the C8 panel preview (`friction-projection.service.ts`) — zero drift risk.
import { decommissionBasisCents, decommissionCostCents } from './decommission-cost';

/** Defensive dual-shape read for a raw `db.execute` result (the `exceptions.repository.ts#hasPendingFor
 *  Building` idiom, copied verbatim — no shared extraction across repositories, this codebase's own
 *  convention). */
function rowsOf(result: unknown): Array<Record<string, unknown>> {
  return (result as { rows?: Array<Record<string, unknown>> }).rows ?? (result as Array<Record<string, unknown>>);
}

/** The full falsifiable proof surface `decommissionOwnedNode` returns. */
export interface DecommissionResult {
  readonly buildingId: string;
  readonly freedBlockId: number;
  readonly costCentsCharged: bigint;
  readonly neighborBuildingIds: string[];
  readonly opRowDeleted: boolean;
  readonly gameMinute: number;
  readonly frictionResult: FrictionReevalResult;
}

@Injectable()
export class DecommissionRepository {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly frictionRepo: FrictionBudgetRepository,
    // P3-E C5 (design §6.3(e)/§7, additive) — the 2 replacement_option rows created at the END of THIS
    // SAME tx, sharing `tx` (never a separate transaction — `createPair` takes the caller's `tx` directly,
    // mirrors `FrictionBudgetRepository`'s own `executor?`-threading shape one level up: here it is not
    // optional because this call site ALWAYS shares the decommission's own already-open tx).
    private readonly replacementOptionRepo: ReplacementOptionRepository,
  ) {}

  /**
   * The design §6.3 tx, guards §6.2 included. `costFraction` is
   * `coreLoopsTunables.demolitionDecommissionCostFractionOfSetup` (R2.3 — resolved by the SERVICE layer,
   * this repository takes a plain number); `formula` is the SAME `FrictionFormulaTunables` bundle
   * `FrictionBudgetTickService.resolveFrictionFormulaTunables()` returns (zero drift risk, one registry).
   * `replacementOptionsCount`/`replacementOptionExpiryGameDays` are P3-E C5 additions (R2.3 — resolved by
   * the SERVICE layer from `coreLoopsTunables.demolitionReplacementOptionsCount`/
   * `demolitionReplacementOptionExpiryGameDays`), consumed ONLY by the additive replacement-options step at
   * the end of this method — every C4 guard/mutation above is UNTOUCHED.
   */
  async decommissionOwnedNode(params: {
    playerId: string;
    buildingId: string;
    costFraction: number;
    formula: FrictionFormulaTunables;
    replacementOptionsCount: number;
    replacementOptionExpiryGameDays: number;
  }): Promise<DecommissionResult> {
    const { playerId, buildingId, costFraction, formula, replacementOptionsCount, replacementOptionExpiryGameDays } = params;

    return this.db.transaction(async (tx) => {
      // The player's current game-minute (the SAME `COALESCE(... , 0)` fallback
      // `real-estate.repository.ts#debitAndInsertPlayerBuilding` already establishes for a player with no
      // city_sim_clock row yet) — stamps `last_decommission_at_tick` + anchors the friction re-eval below.
      const clockRows = await tx
        .select({ game_minute: citySimClock.game_minute })
        .from(citySimClock)
        .where(eq(citySimClock.player_id, playerId))
        .limit(1);
      const gameMinute = clockRows[0]?.game_minute ?? 0;

      // §6.2 guard 1 — node ∉ périmètre (pas au joueur) → 404. LEFT JOIN the operational row (D9 basis —
      // a converted node's operational_type/cover_quality; NULL for a purchased-but-unconverted node,
      // R17 — its basis is the ACQUISITION price instead, below).
      const nodeRows = await tx
        .select({
          buildingId: building.building_id,
          blockId: building.block_id,
          buildingType: building.building_type,
          structuralState: building.structural_state,
          operationalType: buildingOperationalState.operational_type,
          coverQuality: buildingOperationalState.cover_quality,
        })
        .from(building)
        .leftJoin(buildingOperationalState, eq(buildingOperationalState.building_id, building.building_id))
        .where(and(eq(building.building_id, buildingId), eq(building.player_id, playerId), eq(building.ownership, 'player')))
        .limit(1);
      const node = nodeRows[0];
      if (!node) {
        throw new ApiError('RESOURCE_NOT_FOUND', {
          message: `building ${buildingId} is not a player-owned building for this player.`,
        });
      }

      // §6.2 guard 1b — déjà 'demolished' → 409 (the OBVIOUS pre-check; the REAL exactly-once atomicity
      // gate under a genuine concurrent racer is the guarded UPDATE below, I2).
      if (node.structuralState === 'demolished') {
        throw new ApiError('RESOURCE_STATE_CONFLICT', {
          message: `building ${buildingId} is already 'demolished'.`,
        });
      }

      // §6.2 guard 2 — LIEUTENANT_ASSIGNED (D7: no auto-unassign; the player reassigns first).
      const lieutenantRows = await tx
        .select({ lieutenantId: lieutenant.lieutenant_id })
        .from(lieutenant)
        .where(and(eq(lieutenant.player_id, playerId), eq(lieutenant.assigned_building_id, buildingId)))
        .limit(1);
      if (lieutenantRows.length > 0) {
        throw new ApiError('LIEUTENANT_ASSIGNED', {
          message: `building ${buildingId} has a lieutenant assigned — reassign them before decommissioning.`,
        });
      }

      // §6.2 guard 3 — LAST_NODE (D8): the CURRENT §4.1 périmètre count (before this node is removed).
      // friction_org_size==1 means THIS node is the org's ONLY one — refuse (a 0-node org is degenerate,
      // no v1 rattrapage). This is a best-effort pre-check (a genuinely concurrent decommission of a
      // DIFFERENT node racing this SAME count is out of this chunk's proven concurrency surface — the
      // SAME-node races are what I2/I3 harden, above/below).
      const countRows = await tx.execute(sql`
        SELECT count(*)::int AS cnt FROM buildings
        WHERE player_id = ${playerId}::uuid AND ownership = 'player' AND structural_state != 'demolished'
      `);
      const orgSizeBefore = Number(rowsOf(countRows)[0]?.['cnt'] ?? 0);
      if (orgSizeBefore === 1) {
        throw new ApiError('LAST_NODE', {
          message: 'this is the last node in the friction perimeter — decommissioning it would leave a degenerate 0-node org.',
        });
      }

      // D9 — decommission_cost = basis × costFraction. basis = the type's setup_cost (the SAME grounded
      // conversion-cost fn conversionCostCents/groundedConversionCostCents already computes, at the
      // building's OWN operational_type+cover_quality) if converted; else the acquisition price
      // (acquisitionPriceCents, the SAME fn purchase() already used, derived from buildings.building_type
      // via the SAME canonical BUILDING_TYPE_ORDER real-estate.service.ts exports) for a
      // purchased-but-unconverted node (périmètre §4.1 — it is ALREADY a real owned node).
      const basisCents = decommissionBasisCents(
        node.operationalType as M1OperationalType | null,
        node.coverQuality as CoverQuality | null,
        node.buildingType,
      );
      const costCents = decommissionCostCents(basisCents, costFraction);

      // §6.3(c) — debit ONE-TIME, guarded single-statement (I3): insufficient balance → 409, ZERO mutation.
      const debited = await tx
        .update(economyState)
        .set({ cash_cents: sql`${economyState.cash_cents} - ${costCents}` })
        .where(and(eq(economyState.player_id, playerId), sql`${economyState.cash_cents} >= ${costCents}`))
        .returning({ cash_cents: economyState.cash_cents });
      if (debited.length === 0) {
        throw new ApiError('RESOURCE_STATE_CONFLICT', {
          message: 'Insufficient cash to cover the decommission cost.',
        });
      }

      // §6.3(a) — voisins PRÉ-CALCULÉS, AVANT le retrait des routes (design §3.2): every OTHER building
      // sharing a non-severed route with this node (origin OR destination) — embedded in the post-commit
      // event (D16), never re-queried by the annealing subscriber (0-race by construction).
      const neighborRows = await tx.execute(sql`
        SELECT DISTINCT other_building_id FROM (
          SELECT destination_building_id AS other_building_id FROM route
            WHERE player_id = ${playerId}::uuid AND origin_building_id = ${buildingId}::uuid AND state != 'severed'
          UNION
          SELECT origin_building_id AS other_building_id FROM route
            WHERE player_id = ${playerId}::uuid AND destination_building_id = ${buildingId}::uuid AND state != 'severed'
        ) neighbors
      `);
      const neighborBuildingIds = rowsOf(neighborRows).map((r) => String(r['other_building_id']));

      // §6.3(b) — the write-path DD-E1 guard+mutation (I2): `structural_state != 'demolished' →
      // 'demolished'` RETURNING — 0 rows = a concurrent racer already won this SAME node (throws, rolls
      // back the debit above too — the ENTIRE tx, not just this statement).
      const demolished = await tx
        .update(building)
        .set({ structural_state: 'demolished' })
        .where(and(eq(building.building_id, buildingId), eq(building.player_id, playerId), sql`${building.structural_state} != 'demolished'`))
        .returning({ buildingId: building.building_id });
      if (demolished.length === 0) {
        throw new ApiError('RESOURCE_STATE_CONFLICT', {
          message: `building ${buildingId} was demolished by a concurrent request.`,
        });
      }

      // DELETE-if-exists the operational row (R17 — 0-row LEGITIMATE for a purchased-but-unconverted node).
      const opDeletedRows = await tx
        .delete(buildingOperationalState)
        .where(and(eq(buildingOperationalState.building_id, buildingId), eq(buildingOperationalState.player_id, playerId)))
        .returning({ buildingId: buildingOperationalState.building_id });

      // §6.3(d) — sever every route touching this node (D10: never a raw DELETE — 'severed' is the
      // retirement state). Set-based (R14 — `RouteLifecycleRepository.severIfNotAlready`'s OWN semantics,
      // `UPDATE ... WHERE state != 'severed'`, batched to every matched route_id in ONE statement rather
      // than a per-route_id call — a cross-repository call from inside THIS tx would not share `tx`'s own
      // connection/lock scope, the SAME "restructuring repo boundaries is out of scope" precedent
      // `route-lifecycle.repository.ts#claimRebuild`'s own header already documents for this identical
      // shape; R14 itself names this "coder's call at C4, not a blocker either way").
      await tx.execute(sql`
        UPDATE route SET state = 'severed'
        WHERE player_id = ${playerId}::uuid
          AND (origin_building_id = ${buildingId}::uuid OR destination_building_id = ${buildingId}::uuid)
          AND state != 'severed'
      `);

      // §6.3(f) — the ★ C4 synchronous friction re-eval, SHARING this SAME tx (design §6.3: "UNE
      // transaction" — the friction cache refresh + any immediate penalty revert commit/roll back
      // ATOMICALLY with everything above). Reads the périmètre AFTER the demolish UPDATE above (this SAME
      // transaction, read-your-own-writes) — the just-demolished node is correctly EXCLUDED.
      const frictionResult = await this.frictionRepo.reevaluateAndTransitionLocked(tx, playerId, gameMinute, formula, gameMinute);

      // §6.3(e)/§7 — P3-E C5 ADDITION: 2 `replacement_option` rows (rank 1/2), SHARING this SAME tx (never
      // a separate transaction — a throw anywhere above this point still rolls back the WHOLE thing,
      // including nothing having been inserted here yet). Runs LAST, after the friction re-eval (f), so the
      // scorer's own `frictionThresholdAfterDecommission`/`frictionOrgSizeAfterDecommission` inputs are the
      // FRESH post-decommission numbers `frictionResult` just computed (read-your-own-writes, same tx).
      // ZERO alteration of any C4 guard/mutation above this line.
      const freedBlockDistrictRows = await tx
        .select({ profile: districts.profile })
        .from(blocks)
        .innerJoin(districts, eq(districts.id, blocks.district_id))
        .where(eq(blocks.id, node.blockId))
        .limit(1);
      const freedBlockDistrictProfile = freedBlockDistrictRows[0]?.profile ?? null;

      const scored = scoreReplacementCandidates({
        districtProfile: freedBlockDistrictProfile,
        // "connexions projetées" (design §7) — the freed LOCATION's own pre-existing route-topology signal:
        // REUSE `neighborBuildingIds` (§6.3(a), computed above BEFORE the routes were severed) rather than
        // fabricating a separate projection — 0 recompute, a defensible proxy for "how connected a new
        // building here would likely become again".
        projectedConnectionCount: neighborBuildingIds.length,
        formula,
        frictionThresholdAfterDecommission: frictionResult.frictionThreshold,
        frictionOrgSizeAfterDecommission: frictionResult.frictionOrgSize,
        maxOptions: replacementOptionsCount,
      });
      await this.replacementOptionRepo.createPair(tx, {
        playerId,
        sourceBuildingId: buildingId,
        freedBlockId: node.blockId,
        createdAtTick: gameMinute,
        expiresAtTick: gameMinute + gameDaysToTicks(replacementOptionExpiryGameDays),
        scored,
      });

      return {
        buildingId,
        freedBlockId: node.blockId,
        costCentsCharged: costCents,
        neighborBuildingIds,
        opRowDeleted: opDeletedRows.length > 0,
        gameMinute,
        frictionResult,
      };
    });
  }
}
