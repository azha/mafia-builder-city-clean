// IMPLEMENTS: docs/superpowers/plans/2026-07-13-04g-A-constant-hum-plan.md C3
//             Design: docs/superpowers/specs/2026-07-13-04g-A-constant-hum-design.md §6 (BO surfaces)
//             S8 pattern: services/game-back/src/operational/liveops/live-ops-admin.controller.ts
//             (`requireStaffRole` + game-back-direct, DD-C6 Option A) — corrected pointers per
//             `docs/superpowers/plans/2026-07-13-04g-A-C0-reanchor.md` §3: import `:93`, class decl
//             `:134-135`, first `@UseGuards(requireStaffRole('gm'))` usage `:183`.
//             Role mapping: `ops` (design §6/canon) = `gm` in StaffRoleEnum — REUSE the SAME transposition
//             `precursor-market-admin.controller.ts:9,27` / `market-admin.controller.ts` / every other BO
//             admin controller in this codebase already applies (`global_conventions_backoffice.md
//             §role-mapping`).
//             — 04g-A C3 — 2026-07-13
//
// `AmbientAdminController` — 3 GET ops-diagnostic endpoints (role `gm` ≡ `ops`, game-back-direct, S8):
//   GET /v1/admin/ambient/constant-hum/cell-grid/:districtId    — ≤168 cells, RAW baseline_heat_ema
//   GET /v1/admin/ambient/off-hours-drift/active-detections     — recent detections + district correlations
//   GET /v1/admin/ambient/micro-events?gameDay=&districtId=     — diagnostic stream (any status)
//
// P5 BO INVERSION (R2.2 does NOT apply here — this is the ops-diagnostic surface, never forwarded to a
// player; the player surface is `AmbientProjectionService`/`AmbientController`, band-projected, C2): the
// cell-grid endpoint intentionally exposes the RAW `baseline_heat_ema` — the SAME "ops sees raw scalars,
// player never does" inversion `precursor-market-admin.controller.ts`/`market-admin.controller.ts` already
// establish. Role-gated 403-for-non-ops, confirmed by the E2E floor (`ambient_bo.spec.ts`).
//
// NOT test-gated (unlike `AmbientTestController`) — real production BO routes, always registered
// (mirrors `PrecursorMarketAdminController`'s own "NOT test-gated: always registered" posture).

import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';

import { requireStaffRole } from '../../auth/staff-role.guard';
import { ConstantHumRepository } from './constant-hum.repository';
import { AmbientMicroEventRepository } from './ambient-micro-event.repository';
import { OffHoursDriftRepository } from './off-hours-drift.repository';

/** BO diagnostic listing caps (query params NEVER unbounded — mirrors every sibling admin controller's
 *  own pagination-clamp idiom, e.g. `AmbientController`'s FEED_MAX_LIMIT). */
const DETECTIONS_LIST_LIMIT = 100;
const MICRO_EVENTS_DEFAULT_LIMIT = 50;
const MICRO_EVENTS_MAX_LIMIT = 200;

@Controller('admin')
export class AmbientAdminController {
  constructor(
    private readonly constantHumRepo: ConstantHumRepository,
    private readonly microEventRepo: AmbientMicroEventRepository,
    private readonly driftRepo: OffHoursDriftRepository,
  ) {}

  /**
   * `GET /v1/admin/ambient/constant-hum/cell-grid/:districtId`
   *
   * P5 BO INVERSION: every `constant_hum_cell` row for the district (≤168, the structural cap, design
   * §3.1) — RAW `baseline_heat_ema`/`sample_count`/`last_updated_game_day`, an ops diagnostic never
   * surfaced to a player. `:districtId` (not canon's `:regionId` — D2, "la géographie ville EST
   * districts", design §6 divergence assumed).
   *
   * Role: `gm` (≡ `ops`).
   */
  @Get('ambient/constant-hum/cell-grid/:districtId')
  @UseGuards(requireStaffRole('gm'))
  async cellGrid(@Param('districtId') districtIdParam: string) {
    const districtId = Number.parseInt(districtIdParam, 10);
    const cells = await this.constantHumRepo.listCellsForDistrict(districtId);
    return { districtId, cellCount: cells.length, cells };
  }

  /**
   * `GET /v1/admin/ambient/off-hours-drift/active-detections`
   *
   * The most recent `off_hours_drift_detection` rows (≤100, newest first) — RAW `drift_relative`/
   * `cells_over_threshold`/`baseline_snapshot`, PLUS a "correlations" field: the CURRENT set of players
   * owning a building in that district (honesty note: this is the CURRENT correlation, not a snapshot of
   * who was notified AT trip time — `OffHoursDriftDetectorService` does not persist the notified-player
   * list itself, design §4 schema has no such column).
   *
   * Role: `gm` (≡ `ops`).
   */
  @Get('ambient/off-hours-drift/active-detections')
  @UseGuards(requireStaffRole('gm'))
  async activeDetections() {
    const detections = await this.driftRepo.listRecentDetections(DETECTIONS_LIST_LIMIT);
    const withCorrelations = await Promise.all(
      detections.map(async (d) => ({
        id: d.id,
        districtId: d.district_id,
        detectedAtGameDay: d.detected_at_game_day,
        windowDays: d.window_days,
        driftRelative: Number(d.drift_relative),
        cellsOverThreshold: d.cells_over_threshold,
        baselineSnapshot: d.baseline_snapshot,
        createdAt: d.created_at,
        // Honesty note (see method doc): CURRENT correlation, not an at-trip-time snapshot.
        correlatedPlayerIdsNow: await this.driftRepo.listPlayersWithBuildingInDistrict(d.district_id),
      })),
    );
    return { detections: withCorrelations };
  }

  /**
   * `GET /v1/admin/ambient/micro-events?gameDay=&districtId=`
   *
   * The diagnostic micro-event stream — ANY status (`live`/`attended`/`expired`, unlike the player feed
   * which is `live`-only + building-gated). Optional `gameDay`/`districtId` filters; `limit` defaults 50,
   * clamped [1,200].
   *
   * Role: `gm` (≡ `ops`).
   */
  @Get('ambient/micro-events')
  @UseGuards(requireStaffRole('gm'))
  async microEvents(
    @Query('gameDay') gameDayParam: string | undefined,
    @Query('districtId') districtIdParam: string | undefined,
    @Query('limit') limitParam: string | undefined,
  ) {
    const gameDay = gameDayParam !== undefined ? Number.parseInt(gameDayParam, 10) : undefined;
    const districtId = districtIdParam !== undefined ? Number.parseInt(districtIdParam, 10) : undefined;
    const parsedLimit = Number.parseInt(limitParam ?? '', 10);
    const limit = Number.isNaN(parsedLimit) ? MICRO_EVENTS_DEFAULT_LIMIT : Math.min(Math.max(parsedLimit, 1), MICRO_EVENTS_MAX_LIMIT);

    const events = await this.microEventRepo.listForDiagnostic(gameDay, districtId, limit);
    return { events, count: events.length, gameDay: gameDay ?? null, districtId: districtId ?? null };
  }
}
