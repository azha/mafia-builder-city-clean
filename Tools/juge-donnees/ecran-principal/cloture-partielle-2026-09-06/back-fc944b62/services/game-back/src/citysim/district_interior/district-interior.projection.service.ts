// IMPLEMENTS: docs/superpowers/plans/2026-08-17-w3u2-district-nuit-design.md §C1 (B-2 — les 5
//             résolveurs de bandes) + §D2 (les clés de la projection : géographie numérique, état en
//             bandes) + §D3 (revenue_band DONNÉE / revenue_chain TYPE — trois dispositifs, trois
//             classes) -- session:2026-08-17 (W3.U2 C1) --
//
// `DistrictInteriorProjectionService` — assembles the district-interior CONTENT (the grid + the
// per-building bands) from `DistrictInteriorRepository`'s 5 batched reads (D10/§C2-bis added the 5th —
// `listLieutenantAssignments`, B-7). R2.2: every building-level field is a closed-domain string (or the
// geography ints D1 §1.4 carves out as hors-P5, or an opaque OWNED-resource handle — `lieutenant_ids`,
// D10 — never a raw scalar) (no held_cents, no conversion_stage string, no structural_state enum leaks raw).
//
// THE 5 RESOLVERS (B-2 — D2's own classification, "5ᵉ membre d'énum ⇒ erreur de compilation", NO
// `default` branch anywhere below — D5-bis is exactly the `default` bug this discipline avoids):
//   - shellState     (classe TYPE — exhaustif sur les 4 membres de `buildings.structural_state`)
//   - conditionBand  (classe TYPE — exhaustif sur les 4 membres de `building_operational_state.structural_state`)
//   - revenueChain   (classe TYPE — D3 — exhaustif sur les 12 membres de `building_operational_type` + '')
//   - revenueBand    (classe DONNÉE — D3 — dérivé des lignes réelles : money_holding.held_cents /
//                      dealer.current_state='working'. `front_shop`/`cash_safehouse` résolvent
//                      toujours IDLE ici : leur seule source possible (safehouses/transaction_profile,
//                      TD-358) n'a AUCUN écrivain de production — voir implementation-notes.md
//                      §Deviations pour la mesure qui fonde ce choix.)
//   - activityBand   (classe DONNÉE — D2 v2 MAJOR R4 — dérivé de cook_session/grow_session/dealer)
//
// `conversion_band` REUSES the `SetupStateBand` TYPE (D2 — "REUSE SetupStateBand") from
// `RealEstateProjectionService`; its 3-line mapping is NOT imported (that method is private, and that
// file is D5-bis's target in C2 — touching it here would create an avoidable cross-chunk edit). The
// mapping is the SAME logic, kept local and small — see implementation-notes.md §Deviations.

import { Injectable } from '@nestjs/common';

import {
  DistrictInteriorRepository,
  type BuildingCityStructuralStateEnumTs,
  type BuildingOperationalStructuralStateEnumTs,
  type BuildingOperationalTypeEnumTs,
} from './district-interior.repository';
import type { SetupStateBand } from '../../operational/real_estate/real-estate.projection.service';
import { nomDeDistrict } from '../world/district-names';
import type { I18nRef } from '../../common/i18n-ref'; // C3 (D7) — name_i18n's type.
import { buildingNameRef, buildingTypeFromRawInt, rankByTypeAndBlock, type RankableBuildingInput } from '../../common/fiction-names'; // C3 (D7)

/** `buildings.structural_state` as a shell presence band (D2 — `STANDING | GONE`). */
export type ShellStateBand = 'STANDING' | 'GONE';

/** `building_operational_state.structural_state` as a band (D2 — `SOUND | DAMAGED | REPAIRING | FAILED`). */
export type ConditionBand = 'SOUND' | 'DAMAGED' | 'REPAIRING' | 'FAILED';

/** Whether this building's TYPE has a revenue chain wired in the code (D3 — classe TYPE). */
export type RevenueChainBand = 'WIRED' | 'UNWIRED';

/** Whether this building is earning cash RIGHT NOW (D3 — classe DONNÉE). */
export type RevenueBand = 'IDLE' | 'EARNING';

/** Whether this building has an operation currently running (D2 v2 MAJOR R4 — classe DONNÉE). */
export type ActivityBand = 'IDLE' | 'ACTIVE';

/** One block of the district grid — pure static geography (D1 §1.4 — hors P5). */
export interface DistrictInteriorBlock {
  block_id: number;
  x: number;
  y: number;
}

/**
 * One building's content for the district-interior payload — D2's `buildings[]` keys this chunk owns.
 * `lapse_phase_bucket` / `maintenance_in_progress` (binding 5) and `day_phase` (D8, district-level) are
 * DELIBERATELY absent — C2 adds them (they need the current tick, which day_phase ALSO needs; C1's 4
 * queries do not fetch it, so folding binding 5 in here would make it a 5th query).
 */
export interface DistrictInteriorBuildingContent {
  building: string;
  block_id: number;
  /**
   * C3 (D7, L0.5) — the derived fiction name (buildings have no `name` column). `buildingNameRef` fed by
   * `district_id` (the caller's OWN route param — no extra column needed), `block_id` (above), the raw
   * `building_type` resolved via `buildingTypeFromRawInt`, and `rank` (`rankByTypeAndBlock`, computed
   * from ALL this district's non-demolished buildings, chronologically ordered — see
   * `DistrictInteriorProjectionService.projectDistrictContent`).
   */
  name_i18n: I18nRef;
  operational_type: BuildingOperationalTypeEnumTs | '';
  conversion_band: SetupStateBand;
  shell_state: ShellStateBand;
  condition_band: ConditionBand;
  revenue_band: RevenueBand;
  revenue_chain: RevenueChainBand;
  activity_band: ActivityBand;
  /**
   * D10/§C2-bis (B-7) — the lieutenants assigned to THIS building (opaque OWNED-resource handles, R2.2 —
   * NOT a raw scalar; same "poignée" framing `lieutenant_id` already carries on the roster). `[]` if none
   * — never `null` (D10: a tableau vide EST une valeur, une clé absente est un trou). NOT a band: this key
   * is a passthrough of identifiers, not one of the 5 resolvers above.
   */
  lieutenant_ids: string[];
}

/** The district-interior CONTENT — the grid + the per-building bands (C2 adds `day_phase` + district metadata). */
export interface DistrictInteriorContent {
  grid: { width: number; height: number };
  blocks: DistrictInteriorBlock[];
  buildings: DistrictInteriorBuildingContent[];
  /**
   * C3 (D7, L0.5 registry: `DistrictInteriorBuildingContent (+ lieutenants[])`) — the FLAT roster of the
   * lieutenants assigned to any of this district's buildings (`{lieutenant_id, name}`, a real DB column
   * — never derived, unlike `name_i18n` above). A lookup table sibling to `buildings[].lieutenant_ids`
   * (the existing opaque-handle passthrough, unchanged): the client resolves a handle against THIS list
   * rather than each building repeating its assignee's name. `[]` when the player has no lieutenant
   * assigned in this district (never `null` — D10's own "un tableau vide EST une valeur" convention).
   */
  lieutenants: Array<{ lieutenant_id: string; name: string }>;
}

@Injectable()
export class DistrictInteriorProjectionService {
  constructor(private readonly repo: DistrictInteriorRepository) {}

  /**
   * Assemble the district-interior CONTENT for one player/district — the 5 batched reads (D1's fixed
   * cardinality, D10/§C2-bis added the 5th; ⛔ NEVER a per-building query — `projectBuilding` looped is
   * exactly what D1 forbids), then the 5 resolvers + the lieutenant_ids passthrough over the in-memory
   * rows. Returns an empty `buildings`/`blocks` shape for a district the player owns nothing in (the
   * organic Phase-1 reality — same convention `HeatProjectionService` uses).
   */
  async projectDistrictContent(playerId: string, districtId: number): Promise<DistrictInteriorContent> {
    // Query 1/4 — the grid (no player scoping — static public geography, D1 §1.4).
    const blockRows = await this.repo.listBlocks(districtId);
    // Query 2/4 — the player's buildings in this district (INNER JOIN blocks + LEFT JOIN building_operational_state).
    const buildingRows = await this.repo.listPlayerBuildings(playerId, districtId);
    const buildingIds = buildingRows.map((b) => b.building_id);
    // Query 3/5 (3 reads, one fixed round-trip family) + Query 4/5 + Query 5/5 (D10/§C2-bis) — run
    // together, all keyed by the SAME buildingIds batch (no per-building fan-out).
    const [activityLinks, heldCentsByBuilding, lieutenantAssignments] = await Promise.all([
      this.repo.listActivityLinks(playerId, buildingIds),
      this.repo.listMoneyHoldingHeldCents(playerId, buildingIds),
      this.repo.listLieutenantAssignments(playerId, buildingIds),
    ]);
    const lieutenantIdsByBuilding = lieutenantAssignments.byBuilding;

    // C3 (D7) — `rankByTypeAndBlock` needs a STABLE chronological order (fiction-names.ts's own header:
    // `acquired_at_tick` NULLS LAST, `building_id` tie-break), NOT the `(block_id, building_id)` order
    // `listPlayerBuildings` returns (unchanged — the VISIBLE `buildings[]` order is out of this chunk's
    // scope). A re-sorted COPY, never mutating `buildingRows` itself.
    const rankingInput: RankableBuildingInput[] = [...buildingRows]
      .sort((a, b) => {
        const at = a.acquired_at_tick ?? Number.POSITIVE_INFINITY;
        const bt = b.acquired_at_tick ?? Number.POSITIVE_INFINITY;
        if (at !== bt) return at - bt;
        return a.building_id < b.building_id ? -1 : a.building_id > b.building_id ? 1 : 0;
      })
      .map((r) => ({ building_id: r.building_id, player_id: playerId, building_type: r.building_type, block_id: r.block_id }));
    const ranks = rankByTypeAndBlock(rankingInput);

    const buildings: DistrictInteriorBuildingContent[] = buildingRows.map((row) => {
      const hasActiveCook = activityLinks.activeCookBuildingIds.has(row.building_id);
      const hasActiveGrow = activityLinks.activeGrowBuildingIds.has(row.building_id);
      const hasWorkingDealer = activityLinks.workingDealerBuildingIds.has(row.building_id);
      const heldCentsPositive = (heldCentsByBuilding.get(row.building_id) ?? 0n) > 0n;
      return {
        building: row.building_id,
        block_id: row.block_id,
        // C3 (D7, L0.5) — the derived fiction name. `districtId` is the caller's OWN route param (no
        // extra column needed — see DistrictInteriorBuildingContent's own comment).
        name_i18n: buildingNameRef({
          building_type: buildingTypeFromRawInt(row.building_type),
          district_id: districtId,
          district_name: nomDeDistrict(districtId), // P4 item 2
          block_id: row.block_id,
          building_id: row.building_id, // P4 item 3 — l'enseigne
          // r2-C3/m3-r2 — `?? 1` stays PLAUSIBLE, not M1's `?? 0` sentinel: `rankingInput` (the
          // caller's OWN construction, just above) is derived DIRECTLY from `buildingRows` — the exact
          // array `row` is drawn from, in the SAME map() call — so `row.building_id` cannot be absent
          // from `ranks` by construction, not merely by argument. `rankByTypeAndBlock` assigns a rank to
          // EVERY input row unconditionally (no filter inside it — fiction-names.ts). If that were ever
          // untrue this would go silently wrong exactly like the gap M1 fixed; not hardened here because
          // there is no runtime input that can violate the invariant, only a code change that would also
          // change `rankingInput`'s own construction two lines above.
          rank: ranks.get(row.building_id) ?? 1,
        }),
        operational_type: row.operational_type,
        conversion_band: this.conversionBand(row.conversion_stage),
        shell_state: this.shellState(row.structural_state),
        condition_band: this.conditionBand(row.op_structural_state),
        revenue_band: this.revenueBand(row.operational_type, heldCentsPositive, hasWorkingDealer),
        revenue_chain: this.revenueChain(row.operational_type),
        activity_band: this.activityBand(row.operational_type, hasActiveCook, hasActiveGrow, hasWorkingDealer),
        lieutenant_ids: lieutenantIdsByBuilding.get(row.building_id) ?? [], // D10/§C2-bis — [] never null.
      };
    });

    return {
      grid: this.computeGrid(blockRows),
      blocks: blockRows.map((b) => ({ block_id: b.block_id, x: b.x, y: b.y })),
      buildings,
      lieutenants: lieutenantAssignments.assigned, // C3 (D7) — the flat {lieutenant_id, name} roster.
    };
  }

  /**
   * `grid` = `{width, height}`, calculé côté serveur depuis les blocs RÉELS (D2 — jamais une formule
   * recopiée côté client). Bounding box des coordonnées (x,y) des blocs du district ; `{0,0}` pour un
   * district sans blocs (défensif — n'arrive pas en production, la géographie est seedée statiquement).
   */
  private computeGrid(blockRows: readonly { x: number; y: number }[]): { width: number; height: number } {
    if (blockRows.length === 0) return { width: 0, height: 0 };
    let minX = blockRows[0].x, maxX = blockRows[0].x, minY = blockRows[0].y, maxY = blockRows[0].y;
    for (const b of blockRows) {
      if (b.x < minX) minX = b.x;
      if (b.x > maxX) maxX = b.x;
      if (b.y < minY) minY = b.y;
      if (b.y > maxY) maxY = b.y;
    }
    return { width: maxX - minX + 1, height: maxY - minY + 1 };
  }

  /**
   * `conversion_band` — REUSE of `SetupStateBand`'s domain (D2). Mirrors
   * `RealEstateProjectionService.setupStateBand` (private, not imported — see file header). 'none'/''
   * (no operational row) → NOT_CONVERTED; 'operational' → OPERATIONAL; any intra-setup stage → IN_SETUP.
   */
  private conversionBand(conversionStage: string): SetupStateBand {
    if (conversionStage === 'operational') return 'OPERATIONAL';
    if (conversionStage === 'none' || conversionStage === '') return 'NOT_CONVERTED';
    return 'IN_SETUP';
  }

  /**
   * `shell_state` (B-2, resolver 1/5) — exhaustive over the 4 `buildings.structural_state` members, NO
   * `default` (D2 v2 MINOR R9 / the D5-bis discipline — a 5th member must be a compile error, not a
   * silent band). D1's query filters OUT 'demolished' already (§1.1a), so this branch is unreachable in
   * production TODAY — it is kept for the SAME reason `equipmentFailureBaselinePerWeek` keeps its
   * excluded-type branches: TS exhaustiveness, not a live path.
   */
  private shellState(structuralState: BuildingCityStructuralStateEnumTs): ShellStateBand {
    switch (structuralState) {
      case 'operational':
      case 'damaged':
      case 'seized':
        return 'STANDING';
      case 'demolished':
        return 'GONE';
    }
  }

  /**
   * `condition_band` (B-2, resolver 2/5) — exhaustive over the 4 `building_operational_state.structural_state`
   * members, NO `default` (D2 — "c'est exactement le `default` qui a créé le défaut de production que
   * D5-bis corrige"). 1-1 mapping, uppercased (the R2.2 band convention).
   */
  private conditionBand(opStructuralState: BuildingOperationalStructuralStateEnumTs): ConditionBand {
    switch (opStructuralState) {
      case 'operational':
        return 'SOUND';
      case 'damaged':
        return 'DAMAGED';
      case 'repairing':
        return 'REPAIRING';
      case 'failed':
        return 'FAILED';
    }
  }

  /**
   * `revenue_chain` (B-2, resolver 3/5 — D3, classe TYPE) — exhaustive over the 12
   * `building_operational_type` members PLUS `''` (not yet converted — 13 branches total, NO `default`;
   * mirrors the "13ᵉ valeur" convention D2/C6-F4 name for `operational_type`'s wire domain). `WIRED` iff
   * the type has a REAL revenue-writing code path today: `money_holding` (deposit/withdraw,
   * `money-holding.repository.ts`) and `dealer_spot_front` (a working `dealer`). Every other type —
   * INCLUDING `front_shop`/`cash_safehouse` — is still `UNWIRED` HERE: this switch is not yet updated
   * to read them, even though BOTH their would-be sources are now reachable end-to-end (review ⊥
   * finding B3, see implementation-notes.md § Deviations) — `safehouses` has its first application
   * writer (LOT PLANQUE, TD-358), and `buildings.transaction_profile` already had one
   * (`laundering.repository.ts` applyInject, step (d)) that was simply unreachable while `inject`
   * required a safehouse nothing ever created. A future fix would flip both by editing THIS switch to
   * read them, never by a caller pretending otherwise — left UNWIRED here deliberately: deciding what
   * "revenue" means for these two types is a product/design call this fix does not make on its own.
   */
  private revenueChain(operationalType: BuildingOperationalTypeEnumTs | ''): RevenueChainBand {
    switch (operationalType) {
      case 'money_holding':
      case 'dealer_spot_front':
        return 'WIRED';
      case 'front_shop':
      case 'cash_safehouse':
      case 'stash':
      case 'lab':
      case 'grow_house':
      case 'refinery':
      case 'press_house':
      case 'distribution_hub':
      case 'office':
      case 'specialized_lab':
      case '':
        return 'UNWIRED';
    }
  }

  /**
   * `revenue_band` (B-2, resolver 4/5 — D3, classe DONNÉE) — "ce bâtiment encaisse-t-il, maintenant ?",
   * dérivé des lignes réelles (jamais d'une table de types) : `money_holding` → `held_cents > 0` ;
   * `dealer_spot_front` → un dealer attaché est `working` (le MÊME prédicat qu'`activity_band` — vendre
   * EST à la fois l'activité et le revenu de ce type). Toute autre type (dont `front_shop` /
   * `cash_safehouse`, `UNWIRED` ci-dessus) résout `IDLE` — ce résolveur ne LIT encore aucune ligne pour
   * eux, pas parce qu'aucune ligne ne peut exister : les DEUX chaînes sont désormais joignables de bout
   * en bout (revue ⊥ finding B3, voir implementation-notes.md § Deviations) — `safehouses` a son
   * premier écrivain applicatif (LOT PLANQUE, TD-358), et `buildings.transaction_profile` en avait déjà
   * un (`laundering.repository.ts` applyInject, étape (d)) resté inatteignable tant qu'`inject`
   * exigeait une safehouse que rien ne créait jamais.
   */
  private revenueBand(
    operationalType: BuildingOperationalTypeEnumTs | '',
    heldCentsPositive: boolean,
    hasWorkingDealer: boolean,
  ): RevenueBand {
    switch (operationalType) {
      case 'money_holding':
        return heldCentsPositive ? 'EARNING' : 'IDLE';
      case 'dealer_spot_front':
        return hasWorkingDealer ? 'EARNING' : 'IDLE';
      case 'front_shop':
      case 'cash_safehouse':
      case 'stash':
      case 'lab':
      case 'grow_house':
      case 'refinery':
      case 'press_house':
      case 'distribution_hub':
      case 'office':
      case 'specialized_lab':
      case '':
        return 'IDLE';
    }
  }

  /**
   * `activity_band` (B-2, resolver 5/5 — D2 v2 MAJOR R4, classe DONNÉE) — the rule table verbatim:
   * `lab`/`refinery`/`specialized_lab`/`press_house` → ACTIVE iff a non-terminal `cook_session` exists ;
   * `grow_house` → ACTIVE iff a non-terminal `grow_session` exists ; `dealer_spot_front` → ACTIVE iff a
   * `working` dealer is attached ; every other type never ACTIVE (no notion of an in-progress operation).
   */
  private activityBand(
    operationalType: BuildingOperationalTypeEnumTs | '',
    hasActiveCook: boolean,
    hasActiveGrow: boolean,
    hasWorkingDealer: boolean,
  ): ActivityBand {
    switch (operationalType) {
      case 'lab':
      case 'refinery':
      case 'specialized_lab':
      case 'press_house':
        return hasActiveCook ? 'ACTIVE' : 'IDLE';
      case 'grow_house':
        return hasActiveGrow ? 'ACTIVE' : 'IDLE';
      case 'dealer_spot_front':
        return hasWorkingDealer ? 'ACTIVE' : 'IDLE';
      case 'front_shop':
      case 'cash_safehouse':
      case 'stash':
      case 'distribution_hub':
      case 'office':
      case 'money_holding':
      case '':
        return 'IDLE';
    }
  }
}
