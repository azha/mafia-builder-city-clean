// IMPLEMENTS: TD-534 (chantier "les maillons back des écrans neufs" — 2026-09-03) — the missing
//             player-facing "list my buildings across every district" route. Mesuré : les deux
//             seuls `@Get(…buildings…)` du dépôt sont ADMIN (`maintenance-admin.controller.ts:139,
//             200`) ; pour trouver UN bâtiment, un écran devait appeler `GET /v1/world/districts`
//             (18 districts) puis `GET /v1/city/district/:id/interior` sur chacun (mesuré : c'est
//             ce que font les écrans ㉚/㉘/㉝).
//
// `PlayerBuildingsController` — `GET /v1/me/buildings`, sous `JwtAuthGuard` (le MÊME pont d'identité
// account_id → player_id que chaque contrôleur joueur, dupliqué par convention — jamais un helper
// partagé, `horizon-feed.controller.ts`'s own header). REUSE `DistrictInteriorRepository.
// listPlayerBuildingsAllDistricts` (la sœur de la query 2/5 de C1, filtre de district retiré — TD-534)
// + `listLieutenantAssignments` (déjà scopée par `buildingIds`, aucun filtre de district à retirer) +
// EXACTEMENT le même pipeline `buildingNameRef`/`rankByTypeAndBlock`/`buildingTypeFromRawInt` que
// `DistrictInteriorProjectionService` emploie pour LA MÊME entité (district-interior.projection.
// service.ts), pour que les deux surfaces ne divergent jamais sur le nom d'un même bâtiment.
//
// Le rang (`rankByTypeAndBlock`) partitionne sur (player_id, building_type, block_id) — `blocks.id`
// est une PK GLOBALE simple (`world_geography.ts:49`, "PK simple integer global"), donc un `block_id`
// n'appartient qu'à UN district : calculer le rang sur TOUS les bâtiments du joueur d'un coup (comme
// ci-dessous) rend, pour un bâtiment donné, EXACTEMENT le même rang qu'un calcul scopé à son seul
// district (ce que `DistrictInteriorProjectionService.projectDistrictContent` fait aujourd'hui) — les
// deux routes ne peuvent donc pas afficher deux enseignes différentes pour le même bâtiment.
//
// R2.2 : chaque bâtiment ne porte que des identifiants opaques (building/district_id/lieutenant_ids —
// le MÊME "OWNED-resource handle" que C1 documente pour `lieutenant_ids`) + des bandes/enums fermés
// (`operational_type`) + un `I18nRef` (jamais de texte littéral, jamais de scalaire continu — aucune
// tentation ici, cette route ne lit aucune ligne à valeur continue).
//
// R9.3 : aucun schéma possédé ici — lecture pure via `DistrictInteriorRepository` (déjà provider de
// `DistrictInteriorModule`, où ce contrôleur est enregistré à côté de `DistrictInteriorController`).

import { Controller, Get, Inject, Req, UseGuards } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import { ApiError } from '../../protocol/api-error';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { RequestWithAccount } from '../../auth/authenticated-request';
import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { account } from '../../db/schema/account';
import { player } from '../../db/schema/player';
import { DistrictInteriorRepository, type BuildingOperationalTypeEnumTs } from './district-interior.repository';
import type { I18nRef } from '../../common/i18n-ref';
import { nomDeDistrict } from '../world/district-names'; // P4 item 2
import {
  buildingNameRef,
  buildingTypeFromRawInt,
  rankByTypeAndBlock,
  type RankableBuildingInput,
} from '../../common/fiction-names'; // C3 (D7, L0.5) — the SAME derivator district-interior uses.

/** One of the requesting player's buildings, ANY district — TD-534's `buildings[]` entry. */
export interface PlayerBuildingListEntry {
  /** Building identity (uuid — an opaque handle, R2.2). */
  building: string;
  block_id: number;
  district_id: number;
  /** The district's fiction name (P4 item 2) — so the client can say "à La Lisière" without
   *  re-balayer les 18 districts. Never `''` (falls back to the bare id string — the SAME repli
   *  `/v1/world/districts` and `district-interior.controller.ts:144` already use). */
  district_name: string;
  operational_type: BuildingOperationalTypeEnumTs | '';
  /** The derived fiction name — SAME `buildingNameRef` gabarit district-interior serves for this
   *  entity (D7). */
  name_i18n: I18nRef;
  /** Lieutenants assigned to THIS building (opaque handles, R2.2) — `[]` if none, never `null`
   *  (D10's own "un tableau vide EST une valeur" convention, reused verbatim). */
  lieutenant_ids: string[];
}

export interface PlayerBuildingsResponse {
  buildings: PlayerBuildingListEntry[];
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class PlayerBuildingsController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly repo: DistrictInteriorRepository,
  ) {}

  /**
   * `GET /v1/me/buildings` — TD-534: the requesting player's buildings across EVERY district, one
   * entry per non-demolished building (§1.1a). Requires a PLAYER JWT. Returns `{ buildings: [] }`
   * for a player who owns nothing (never throws on the empty case — same convention every list
   * route in this codebase uses).
   */
  @Get('me/buildings')
  @UseGuards(JwtAuthGuard)
  async list(@Req() req: RequestWithAccount): Promise<PlayerBuildingsResponse> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const rows = await this.repo.listPlayerBuildingsAllDistricts(playerId);
    const buildingIds = rows.map((r) => r.building_id);
    const lieutenantAssignments = await this.repo.listLieutenantAssignments(playerId, buildingIds);

    // SAME stable chronological order `DistrictInteriorProjectionService.projectDistrictContent`
    // uses for `rankByTypeAndBlock` (acquired_at_tick NULLS LAST, building_id tie-break) — a
    // re-sorted COPY, never mutating `rows` itself (the visible `buildings[]` order stays the
    // repository's own `(block_id, building_id)` order, untouched, mirroring the sister route).
    const rankingInput: RankableBuildingInput[] = [...rows]
      .sort((a, b) => {
        const at = a.acquired_at_tick ?? Number.POSITIVE_INFINITY;
        const bt = b.acquired_at_tick ?? Number.POSITIVE_INFINITY;
        if (at !== bt) return at - bt;
        return a.building_id < b.building_id ? -1 : a.building_id > b.building_id ? 1 : 0;
      })
      .map((r) => ({ building_id: r.building_id, player_id: playerId, building_type: r.building_type, block_id: r.block_id }));
    const ranks = rankByTypeAndBlock(rankingInput);

    const buildings: PlayerBuildingListEntry[] = rows.map((row) => {
      const districtName = nomDeDistrict(row.district_id);
      return {
        building: row.building_id,
        block_id: row.block_id,
        district_id: row.district_id,
        district_name: districtName ?? String(row.district_id),
        operational_type: row.operational_type,
        name_i18n: buildingNameRef({
          building_type: buildingTypeFromRawInt(row.building_type),
          district_id: row.district_id,
          district_name: districtName,
          block_id: row.block_id,
          building_id: row.building_id,
          // SAME "cannot be absent from `ranks` by construction" invariant C3's own comment
          // establishes (`district-interior.projection.service.ts:169-177`) — `rankingInput` is
          // derived directly from `rows`, in the SAME map() call `row` is drawn from.
          rank: ranks.get(row.building_id) ?? 1,
        }),
        lieutenant_ids: lieutenantAssignments.byBuilding.get(row.building_id) ?? [],
      };
    });

    return { buildings };
  }

  /** Resolve account_id → player_id via the 1-1 Player↔Account link (the GET /v1/me identity
   *  bridge — duplicated verbatim, the established per-controller convention, never shared). */
  private async resolvePlayerId(accountId: string): Promise<string> {
    const rows = await this.db
      .select({ player_id: player.player_id })
      .from(player)
      .innerJoin(account, eq(account.account_id, player.account_id))
      .where(and(eq(player.account_id, accountId), eq(account.kind, 'PLAYER')))
      .limit(1);
    const playerId = rows[0]?.player_id;
    if (!playerId) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'No player profile for this account.' });
    }
    return playerId;
  }
}
