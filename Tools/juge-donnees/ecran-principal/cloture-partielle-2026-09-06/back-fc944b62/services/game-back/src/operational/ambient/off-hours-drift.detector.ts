// IMPLEMENTS: docs/superpowers/plans/2026-07-13-04g-A-constant-hum-plan.md C3
//             Design: docs/superpowers/specs/2026-07-13-04g-A-constant-hum-design.md §3.4
//             (OffHoursDriftDetector) + §4 (off_hours_drift_detection schema) + D10 (decisions doc)
//             Scheduler seam S1: `AMBIENT_DAILY_TICK` (NIGHTLY/27) — this is PHASE 2 of the SAME tick
//             `ambient-micro-event.service.ts` (C2) registers phase 1 on; `ambient-micro-event.service.ts`
//             invokes `runDetection` AFTER its own `runDailyTick` (C2's own header foretold this exact
//             wiring — "C3 amends onApplicationBootstrap's run callback to also invoke the detector").
//             Bus seam: `CityEventBus.emitOffHoursDriftDetected` (`city-event-bus.ts`, ADDITIVE C3 event).
//             — 04g-A C3 — 2026-07-13
//
// `OffHoursDriftDetectorService` — the first falsifiable CONSUMER of the Constant Hum substrate (design
// §0): per district, compares the CURRENT off-hours `constant_hum_cell` EMAs to a PERSISTED rolling
// baseline; on a significant drift (design §3.4/D10: ≥3 mature off-hours cells each ≥0.25 relative drift),
// inserts an `off_hours_drift_detection` row and emits one `OffHoursDriftDetectedEvent` PER PLAYER owning a
// building in the drifted district (the S5 exception-producer fan-out).
//
// ★ D10 MECHANICS RESOLUTION (coder C3 — [needs reviewer⊥], the ONE genuinely underspecified mechanic in
// the design): D10 says the baseline is "a rolling snapshot persisted by the detector itself
// (off_hours_drift_detection.baseline_snapshot jsonb) — avoiding a dedicated time-series table" but does
// NOT literally define what backs the very FIRST comparison for a district that has never been detected
// before (a real time-series ["the value the same cells had window_days ago"] cannot be read back from a
// single continuously-folding EMA column — no history is retained by `constant_hum_cell` itself, by
// design, D3/§3.1). This resolution:
//   1. The baseline for district D = the `baseline_snapshot` of the MOST RECENT PRIOR `off_hours_drift_
//      detection` row for D (`OffHoursDriftRepository.getLatestPriorDetection`) — a genuinely ROLLING
//      reference (D10 verbatim "roulant"): each trip's own snapshot becomes the next comparison's baseline.
//   2. COLD START (no prior row for D at all, but D has ≥1 mature off-hours cell): rather than leaving the
//      detector PERMANENTLY inert for every district forever (a structural fig-leaf far worse than an
//      honest TD — design §0 explicitly frames this detector as "the first falsifiable consumer of the
//      substrate"), the detector writes ONE CALIBRATION row (`drift_relative='0'`, `cells_over_threshold=0`,
//      `baseline_snapshot` = the CURRENT cell readings) — establishing the reference for the NEXT run,
//      WITHOUT raising a card (0 < min_cells by construction, so no special-casing is needed: the trip
//      condition simply never fires on a calibration pass). This is the coder's own defensible reading of
//      an underspecified bootstrap path — flagged for reviewer⊥, TD-245 (closeout).
//   3. Test fixtures may seed a PRIOR `off_hours_drift_detection` row directly (the SAME "direct SQL seed"
//      idiom `constant_hum.spec.ts`'s own AC2-AC5 already use) to bypass the cold-start calibration pass
//      and exercise a genuine SAME-RUN trip (C3 AC1/AC2/AC3) — this is standard E2E fixture control, not a
//      production code path.
//
// ★ F4 fix (caught during the C3 E2E floor, same-commit): the ORIGINAL shape of `runDetection` issued 2
// queries PER DISTRICT (`listMatureOffHoursCells` + `getLatestPriorDetection`, up to 18×2 = 36 round-trips
// per NIGHTLY firing) — a real regression against the design's own §8 F4 budget ("détection sur ≤ 42×18
// cells lues en 1 query"). Every REAL NIGHTLY/27 firing (any player's own boundary crossing, C1/C2's own
// "per-player-firing, city-global-state" shape) now pays this cost, so the per-district shape measurably
// slowed the whole C3 E2E floor. Fixed to 2 BATCHED queries total (`listAllMatureOffHoursCellsGroupedByDistrict`
// + `listLatestPriorDetectionForEveryDistrict`, `off-hours-drift.repository.ts`) — see below.
//
// Determinism: NO `Math.random()`/`Date.now()` anywhere in this file — a pure function of persisted DB
// state + `gameDay` (threaded by the caller, `ambient-micro-event.service.ts`'s `deriveGameDay`).

import { Injectable, Logger } from '@nestjs/common';

import { CityEventBus } from '../../citysim/events/city-event-bus';
import { ambientTunables, OFF_HOURS_DRIFT_SIGNIFICANT_RELATIVE_THRESHOLD } from './ambient.tunables';
import { AmbientMicroEventRepository } from './ambient-micro-event.repository';
import { OffHoursDriftRepository, type MatureOffHoursCell } from './off-hours-drift.repository';

/** One district's outcome this detector pass (logged + returned by the gated test-only direct-probe
 *  route, `ambient-test.controller.ts`, falsifiable assertions). */
export interface DistrictDriftResult {
  readonly districtId: number;
  readonly outcome: 'tripped' | 'not_tripped' | 'baseline_established' | 'no_mature_cells' | 'no_prior_baseline_skipped';
  readonly detectionId?: string;
  readonly driftRelative?: number;
  readonly cellsOverThreshold?: number;
  readonly playersNotified?: number;
}

/** Result of one `runDetection` call (all 18 districts, one NIGHTLY/27 phase-2 pass). */
export interface OffHoursDriftDetectionResult {
  readonly gameDay: number;
  readonly districts: readonly DistrictDriftResult[];
}

@Injectable()
export class OffHoursDriftDetectorService {
  private readonly logger = new Logger(OffHoursDriftDetectorService.name);

  constructor(
    private readonly repo: OffHoursDriftRepository,
    private readonly microEventRepo: AmbientMicroEventRepository, // REUSE listAllDistrictIds (DRY, no duplicated district-enumeration query)
    private readonly bus: CityEventBus,
  ) {}

  /**
   * The detector pass — a function of `gameDay` alone (+ persisted, deterministic DB state). Called by
   * `AmbientMicroEventService`'s `AMBIENT_DAILY_TICK` `run(ctx)` callback AFTER phase 1 (real production
   * path) AND directly by the gated test-only `run-off-hours-drift-detector` probe
   * (`ambient-test.controller.ts`), the SAME direct-probe idiom C1/C2 established.
   */
  async runDetection(gameDay: number): Promise<OffHoursDriftDetectionResult> {
    const hourBandEnd = ambientTunables.offHoursHourBandEnd;
    const minCells = ambientTunables.offHoursDriftMinCells;
    const windowDays = ambientTunables.offHoursDriftDetectionWindowDays;

    // ★ F4 (design §8 "1 query" budget — see off-hours-drift.repository.ts's own header for the C3
    // floor-caught regression this batching fixes): 3 queries TOTAL for the whole pass (district
    // enumeration + all-districts cells + all-districts latest-prior), NEVER N×2 per-district round-trips.
    const districtIds = await this.microEventRepo.listAllDistrictIds();
    const cellsByDistrict = await this.repo.listAllMatureOffHoursCellsGroupedByDistrict(hourBandEnd);
    const priorByDistrict = await this.repo.listLatestPriorDetectionForEveryDistrict();
    const districts: DistrictDriftResult[] = [];

    for (const districtId of districtIds) {
      const cells = cellsByDistrict.get(districtId) ?? [];
      if (cells.length === 0) {
        districts.push({ districtId, outcome: 'no_mature_cells' });
        continue;
      }

      const prior = priorByDistrict.get(districtId);
      if (!prior) {
        // Cold start (see file header §2 resolution): establish the reference, no card.
        const snapshot = this.snapshotOf(cells);
        const detectionId = await this.repo.insertDetection({
          districtId,
          detectedAtGameDay: gameDay,
          windowDays,
          driftRelative: 0,
          cellsOverThreshold: 0,
          baselineSnapshot: snapshot,
        });
        this.logger.log(
          `OffHoursDriftDetectorService: district=${districtId} gameDay=${gameDay} — COLD START, ` +
            `no prior baseline; calibration row ${detectionId} written, no card (D10 resolution, see file header).`,
        );
        districts.push({ districtId, outcome: 'baseline_established', detectionId });
        continue;
      }

      const baselineMap = prior.baseline_snapshot as Record<string, number>;
      const overThreshold: MatureOffHoursCell[] = [];
      for (const cell of cells) {
        const baselineEma = baselineMap[String(cell.hourOfWeek)];
        if (baselineEma === undefined || baselineEma === 0) continue; // no comparable baseline / div-by-zero guard
        const driftRelative = (cell.baselineHeatEma - baselineEma) / baselineEma;
        if (driftRelative >= OFF_HOURS_DRIFT_SIGNIFICANT_RELATIVE_THRESHOLD) overThreshold.push(cell);
      }

      if (overThreshold.length < minCells) {
        districts.push({ districtId, outcome: 'not_tripped' });
        continue;
      }

      // TRIP — compute the stored aggregate drift_relative as the AVERAGE of the over-threshold cells'
      // own per-cell drift (each individually ≥ 0.25, so the average is also ≥ 0.25 — the AC1 assertion
      // "drift_relative ≥ 0.25" holds by construction, never by chance).
      const avgDrift =
        overThreshold.reduce((sum, cell) => {
          const baselineEma = baselineMap[String(cell.hourOfWeek)]!;
          return sum + (cell.baselineHeatEma - baselineEma) / baselineEma;
        }, 0) / overThreshold.length;
      const newSnapshot = this.snapshotOf(cells); // rolling forward — this trip's own reading becomes the NEXT baseline.

      const detectionId = await this.repo.insertDetection({
        districtId,
        detectedAtGameDay: gameDay,
        windowDays,
        driftRelative: avgDrift,
        cellsOverThreshold: overThreshold.length,
        baselineSnapshot: newSnapshot,
      });

      // Exception-card fan-out — one OffHoursDriftDetectedEvent per player owning a building in the
      // drifted district (design §3.4). AmbientDriftExceptionProducerService (S5 pattern) applies the
      // hasPendingPlayerLevelCard dedup per player — this detector never checks dedup itself.
      const playerIds = await this.repo.listPlayersWithBuildingInDistrict(districtId);
      for (const playerId of playerIds) {
        this.bus.emitOffHoursDriftDetected({ type: 'off_hours_drift_detected', playerId, districtId, gameDay });
      }

      this.logger.log(
        `OffHoursDriftDetectorService: district=${districtId} gameDay=${gameDay} — TRIPPED ` +
          `(drift_relative=${avgDrift.toFixed(4)}, cells_over_threshold=${overThreshold.length}, ` +
          `detection=${detectionId}, playersNotified=${playerIds.length}).`,
      );
      districts.push({
        districtId,
        outcome: 'tripped',
        detectionId,
        driftRelative: avgDrift,
        cellsOverThreshold: overThreshold.length,
        playersNotified: playerIds.length,
      });
    }

    return { gameDay, districts };
  }

  /** `{hourOfWeek: ema}` snapshot of the given mature cells — the persisted `baseline_snapshot` payload
   *  (design §3.4/§4, D10). */
  private snapshotOf(cells: readonly MatureOffHoursCell[]): Record<string, number> {
    const snapshot: Record<string, number> = {};
    for (const cell of cells) snapshot[String(cell.hourOfWeek)] = cell.baselineHeatEma;
    return snapshot;
  }
}
