// IMPLEMENTS: docs/superpowers/plans/2026-08-17-w3u2-district-nuit-design.md §C2 (B-3 — la route, le
//             wiring, day_phase, correctif du default) + §D1 (JwtAuthGuard, account_id → player_id, le
//             pont d'identité maison) + §D2 (les clés de la projection : géographie numérique, état en
//             bandes) + §D8 (B-6 — day_phase, résolveur exhaustif à 4 membres, source unique partagée)
//             -- session:2026-08-17 (W3.U2 C2) --
//
// `DistrictInteriorController` — the PLAYER-FACING route for the district-interior diorama:
//   `GET /v1/city/district/:id/interior`, under `JwtAuthGuard` (the SAME identity bridge every city-sim
//   controller uses — account_id → player_id via the 1-1 Player↔Account link, HeatController's precedent).
//
// ASSEMBLES the response from THREE sources, all scoped to the SAME player/district, ONE extra round-trip
// beyond C1's 4 fixed reads (D1 §1.3's budget was C1's CONTENT only — this route's OWN concern):
//   - `DistrictInteriorProjectionService.projectDistrictContent` (C1, consumed AS-IS, not re-opened) — the
//     grid + the 9 per-building bands.
//   - the district's static metadata row (`districts` — profile/name_canonical/bank_side; D1 §1.4, hors P5,
//     the SAME public-geography convention `world.controller.ts` already exercises).
//   - binding 5 (`lapse_phase_bucket`/`maintenance_in_progress`) + `day_phase` (D8) — BOTH need the
//     player's CURRENT tick (`MaintenanceRepository.getCurrentGameDayAndMinute`, ONE query, shared by
//     both). C1 explicitly deferred these two to C2 (none of C1's 4 queries fetch the clock — see
//     district-interior.repository.ts's header + 2026-08-17-w3u2-c1-notes.md §Deviations #3).
//
// R9.3: reads the EXISTING `districts` schema + the EXISTING `MaintenanceRepository`/`MaintenancePhaseService`
// (MaintenanceModule already exports both for exactly this cross-module-read purpose —
// `RealEstateProjectionService`'s building-card projection is the precedent this controller mirrors for
// binding 5; `day_phase` is the ONE new derivation, and it shares `../day-phase-quarter.ts` with
// `DealLekService` rather than recomputing quarter boundaries a third time).

import { Controller, Get, Inject, Param, Req, UseGuards } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import { ApiError } from '../../protocol/api-error';
import { IntParam } from '../../common/param-pipes';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { RequestWithAccount } from '../../auth/authenticated-request';
import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { account } from '../../db/schema/account';
import { player } from '../../db/schema/player';
import { districts, type DistrictProfileEnumTs, type BankSideEnumTs } from '../../db/schema/world_geography';
import {
  DistrictInteriorProjectionService,
  type DistrictInteriorBlock,
  type DistrictInteriorBuildingContent,
} from './district-interior.projection.service';
import { MaintenanceRepository } from '../../operational/maintenance/maintenance.repository';
import { MaintenancePhaseService, type LapsePhase } from '../../operational/maintenance/maintenance-phase.service';
import type { LapsePhaseBucket } from '../../operational/real_estate/real-estate.projection.service';
import { quarterIndexForGameMinute } from '../day-phase-quarter';
import { nomDeDistrict } from '../world/district-names'; // P4 item 2 — le nom de fiction

/** D8 — engagement 1's 4-paliers cycle (DAWN/DAY/DUSK/NIGHT). Resolved below, exhaustive, NO `default`. */
export type DayPhase = 'DAWN' | 'DAY' | 'DUSK' | 'NIGHT';

/** C1's per-building content PLUS binding 5 (D2 — `lapse_phase_bucket`/`maintenance_in_progress`). */
export interface DistrictInteriorBuildingResponse extends DistrictInteriorBuildingContent {
  lapse_phase_bucket: LapsePhaseBucket;
  maintenance_in_progress: boolean;
}

/** The full `GET .../interior` response payload (D2 — district-level keys + `buildings[]`). */
export interface DistrictInteriorResponse {
  district: string;
  district_id: number;
  profile: DistrictProfileEnumTs;
  name_canonical: string;
  /** P4 item 2 / P3 parcours ② — le nom de FICTION du district. ⛔ Ajouté ici parce que le parcours a
   *  mesuré l'incohérence : cet écran servait « Tidewater-1 » pendant que la carte de bâtiment du MÊME
   *  écran affichait « Les Bassins » (le nom voyage dans les params de `game.fiction.building.name`).
   *  Deux noms du même district dans une seule vue — invisible à qui ne regarde qu'une route. */
  name: string;
  bank_side: BankSideEnumTs;
  grid: { width: number; height: number };
  blocks: DistrictInteriorBlock[];
  day_phase: DayPhase;
  buildings: DistrictInteriorBuildingResponse[];
  /** C3 (D7, L0.5) — the flat `{lieutenant_id, name}` roster (C1's own `contentResult`, consumed AS-IS). */
  lieutenants: Array<{ lieutenant_id: string; name: string }>;
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class DistrictInteriorController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly content: DistrictInteriorProjectionService,
    private readonly maintenanceRepo: MaintenanceRepository,
    private readonly maintenancePhase: MaintenancePhaseService,
  ) {}

  /**
   * `GET /v1/city/district/:id/interior` — the requesting player's district-interior diorama payload
   * (D1/D2). An id that names no row in `districts` → `VALIDATION_FAILED` (the SAME response class
   * `HeatController` uses for an out-of-range district id; this route derives validity from the actual
   * seeded rows rather than a duplicated district-count tunable — the 18 rows ARE the domain).
   */
  @Get('city/district/:id/interior')
  @UseGuards(JwtAuthGuard)
  async interior(@Param('id', IntParam) districtId: number, @Req() req: RequestWithAccount): Promise<DistrictInteriorResponse> {
    // L0.3 (D5) — IntParam bounds to int4 BEFORE this lookup runs (this route's own out-of-int4-range 500,
    // Postgres 22003, is the one 5xx the magnitude bound exists to close — D5 "Magnitude").
    const districtRow = await this.getDistrictRow(districtId);
    if (!districtRow) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `district id must reference an existing district (got "${districtId}").`,
      });
    }

    const accountId = req.account!.account_id; // populated by JwtAuthGuard (verified claims, never the body).
    const playerId = await this.resolvePlayerId(accountId);
    if (!playerId) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'No player profile for this account.' });
    }

    // Both C1's CONTENT (buildings + grid, player-scoped) and the current clock read are needed before
    // binding 5 can be derived; the clock read does not depend on the content, so run them together.
    const [contentResult, { gameMinute, currentGameDay }] = await Promise.all([
      this.content.projectDistrictContent(playerId, districtId),
      this.maintenanceRepo.getCurrentGameDayAndMinute(playerId),
    ]);
    const buildingIds = contentResult.buildings.map((b) => b.building);
    const maintenanceState = await this.maintenanceRepo.getMaintenanceStateForBuildings(buildingIds);

    const buildings: DistrictInteriorBuildingResponse[] = contentResult.buildings.map((b) => {
      const anchor = maintenanceState.get(b.building);
      const daysOverdue = this.maintenancePhase.deriveDaysOverdue(
        currentGameDay,
        anchor?.lastMaintainedAtGameDay ?? null,
        anchor?.maintenanceDueInDays ?? 0,
      );
      return {
        ...b,
        lapse_phase_bucket: this.lapsePhaseBucket(this.maintenancePhase.deriveLapsePhase(daysOverdue)),
        maintenance_in_progress: anchor?.maintenanceInProgress ?? false,
      };
    });

    return {
      district: `district-${districtId}`, // REUSE of heat.projection.service.ts:87's convention (D2).
      district_id: districtId,
      profile: districtRow.profile,
      name_canonical: districtRow.name_canonical,
      // Repli sur le nom de travail si le district n'est pas nommé — jamais une chaîne vide, que le
      // client afficherait comme une donnée manquante (même règle que `/v1/world/districts`).
      name: nomDeDistrict(districtId) ?? districtRow.name_canonical,
      bank_side: districtRow.bank_side,
      grid: contentResult.grid,
      blocks: contentResult.blocks,
      day_phase: this.dayPhase(gameMinute),
      buildings,
      lieutenants: contentResult.lieutenants, // C3 (D7)
    };
  }

  /** The district's static metadata row (D1 §1.4 — hors P5, public geography). null for an unknown id. */
  private async getDistrictRow(
    districtId: number,
  ): Promise<{ profile: DistrictProfileEnumTs; name_canonical: string; bank_side: BankSideEnumTs } | null> {
    const rows = await this.db
      .select({
        profile: districts.profile,
        name_canonical: districts.name_canonical,
        bank_side: districts.bank_side,
      })
      .from(districts)
      .where(eq(districts.id, districtId))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * `day_phase` (D8 — B-6) — exhaustive over the 4 members, NO `default` (the D5-bis discipline: the
   * shared `quarterIndexForGameMinute` is the ONLY place the quarter arithmetic lives; this switch just
   * names the 4 quarters for THIS surface — a widening of `QuarterIndex` is a compile error here too).
   */
  private dayPhase(gameMinute: number): DayPhase {
    switch (quarterIndexForGameMinute(gameMinute)) {
      case 0:
        return 'DAWN';
      case 1:
        return 'DAY';
      case 2:
        return 'DUSK';
      case 3:
        return 'NIGHT';
    }
  }

  /**
   * D1/D14 uppercasing convention — mirrors `RealEstateProjectionService.lapsePhaseBucket` (private
   * there; NOT imported — the SAME "REUSE the TYPE, not the private method" choice C1 made for
   * `conversionBand`, see implementation-notes.md §Deviations). Exhaustive, no `default`.
   */
  private lapsePhaseBucket(phase: LapsePhase): LapsePhaseBucket {
    switch (phase) {
      case 'within_window':
        return 'WITHIN_WINDOW';
      case 'soft':
        return 'SOFT';
      case 'hard':
        return 'HARD';
      case 'critical':
        return 'CRITICAL';
    }
  }

  /** Resolve account_id → player_id via the 1-1 Player↔Account link (the GET /v1/me identity bridge). */
  private async resolvePlayerId(accountId: string): Promise<string | null> {
    const rows = await this.db
      .select({ player_id: player.player_id })
      .from(player)
      .innerJoin(account, eq(account.account_id, player.account_id))
      .where(and(eq(player.account_id, accountId), eq(account.kind, 'PLAYER')))
      .limit(1);
    return rows[0]?.player_id ?? null;
  }
}
