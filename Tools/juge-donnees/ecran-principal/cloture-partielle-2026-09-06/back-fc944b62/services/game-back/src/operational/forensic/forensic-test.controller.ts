// IMPLEMENTS: docs/superpowers/plans/2026-06-19-depth-forensic-signaling-plan.md Task 1 (C1) + Task 2 (C2) + Task 3 (C3) + Task 4 (C4) Step 3 + Task 16 (C16) + Task 18 (C18)
//             Pattern: services/game-back/src/operational/insurance/insurance-test.controller.ts (R-EC-2)
//             — Forensic Signaling C1 + C2 + C3 — 2026-06-19
//
// `ForensicTestController` — TEST-ONLY probe routes for C1 + C2 + C3 persistence verification.
//
// GATING: mounted ONLY when NODE_ENV !== 'production' (registered conditionally in
// ForensicSignalingModule via testControllersEnabled() — same pattern as InsuranceTestController /
// ReputationTestController / MarketTestController).
// In production this controller is simply not registered → 404.
// The E2E compose stack runs NODE_ENV=development so routes are available.
//
// C1 Routes (persistence proof — DB inserts/reads, no mechanic logic):
//   POST /v1/_test/forensic/seed-ledger-ring
//     — creates a fresh test player + account row; inserts 1 row per §5.1 table
//       (ledger_entry_ring + forensic_soft_flag_ring) for a deterministic test frontId.
//       Returns { playerId, frontId }.
//       The E2E uses these IDs to read back the rows and assert column defaults.
//       Idempotent: uses ON CONFLICT DO NOTHING (safe for 2× back-to-back spec runs).
//
//   GET /v1/_test/forensic/read-ledger-ring?playerId=<uuid>
//     — reads both ring rows for the player.
//       Returns { ledgerRing: row | null, softFlagRing: row | null }.
//       R2.2: TEST-ONLY (not registered in production). Raw rows for DB assertion only.
//       Bigint columns are serialized as strings (JSON bigint safe).
//
//   POST /v1/_test/forensic/delete-player
//     — deletes the test player row; player FK CASCADE should remove both ring rows + §5.2 rows.
//       Body: { playerId: string }.
//       Returns { deleted: true }.
//       The E2E re-reads after delete to assert CASCADE behavior.
//
// C2 Routes (§5.2 Effluent Stoichiometry persistence proof — DB inserts/reads, no mechanic logic):
//   GET /v1/_test/forensic/read-recipe-table
//     — reads all rows from recipe_stoichiometry_table (4 SEED rows [PROV-Y26Q2]).
//       Returns { recipes: row[] }.
//       Asserts migration 0072 SEED is present (4 substances: brindle/crick/hush/ash).
//
//   POST /v1/_test/forensic/seed-effluent-state
//     — creates a fresh test player + account row; inserts 1 workshop_stoichiometry_state row +
//       1 block_effluent_register row for the player.
//       Body: { substanceType: 'brindle' | 'crick' | 'hush' | 'ash' }.
//       Returns { playerId, workshopId, blockId }.
//       Idempotent: uses ON CONFLICT DO NOTHING.
//
//   GET /v1/_test/forensic/read-effluent-state?playerId=<uuid>
//     — reads workshop_stoichiometry_state + block_effluent_register for the player.
//       Returns { workshop: row | null, blockRegister: row | null }.
//       R2.2: TEST-ONLY. Raw rows for DB assertion only. Bigint columns as strings.
//
//   POST /v1/_test/forensic/seed-lab-building  (C13 production-path proof)
//     — creates a fresh test player + account row; inserts a buildings row at block_id=7
//       WITHOUT inserting a workshop_stoichiometry_state row. The E2E then calls
//       record-throughput with the returned buildingId to prove the production lazy-create
//       path derives block_id from buildings.block_id (not 0).
//       Returns { playerId, buildingId, blockId }.
//
// Anti-fabrication: no Math.random in this file — frontId and workshopId are deterministic sentinel
//   uuids (00000000-...); playerId is PG gen_random_uuid() (DB-side, not Math.random).
// R2.2: all routes are TEST-ONLY (not registered in production). Raw state for DB assertion.
// Zero-regression invariant (§1.3): no mechanic logic here — persistence proof only.
// OQ-5: substanceType is the EXISTING PG enum (not re-declared). C2 test accepts 4 valid values.
//
// C4 Routes (tunables probe — registry-resolved T.forensic.* values, no DB):
//   GET /v1/_test/forensic/tunables-probe
//     — returns all resolved T.forensic.* tunable values via forensicTunables getters.
//       Returns a flat object: { benford_chi2_threshold_H, benford_ring_buffer_length, ... }
//       R2.2: TEST-ONLY. Proves the materialized registry keys resolve with canon-doc defaults.
//       Anti-fabrication: values come from TunablesStore.resolve* (real stack, no mocking).
//       OQ-11: benford_hard_audit_softflags_count + benford_hard_audit_window_days (composite split).
//       OQ-9: days_per_month (genuinely NEW key, no clock.* reuse).
//       Note: bucket-threshold rows (OQ-12) are [PROPOSED DEFAULT]/calibrate — not in this probe.

import { Body, Controller, Get, HttpException, HttpStatus, Inject, Logger, Optional, Post, Query } from '@nestjs/common';
import { CityEventBus } from '../../citysim/events/city-event-bus';
import type { ForensicSoftFlagDetectedEvent, EffluentFlagDetectedEvent, LifestyleGapFlagEvent, ForensicEntryDispatchedEvent, HeatInjectionEvent } from '../../citysim/events/city-event-bus';
import { forensicTunables } from './forensic-tunables';
import { eq, inArray, sql, and } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import { ledgerEntryRing, forensicSoftFlagRing, workshopStoichiometryState, lifestyleAuditState } from '../../db/schema/forensic';
import { lieutenant, behaviorScript } from '../../db/schema/lieutenant';
import { BOOKKEEPER_ROLE_ID } from '../lieutenant/lieutenant-archetype';
import { player } from '../../db/schema/player';
import { account } from '../../db/schema/account';
import { precinctMemory, building, inspectionQueue } from '../../db/schema/city_state';
import { economyState } from '../../db/schema/player_economy_state';
import { ForensicRepository } from './forensic.repository';
import type { SubstanceTypeValue, SeedLifestyleStateInput } from './forensic.repository';
import { LeadingDigitAuditService } from './leading-digit-audit.service';
import { EffluentStoichiometryService } from './effluent-stoichiometry.service';
import { StandingGapHeatService } from './standing-gap-heat.service';
import { Cadence } from '../../citysim/scheduler/city_sim_system';
import type { CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import type { ForensicKind } from './forensic-severity';
import type { QueueEntrySource, QueueEntry } from '../../citysim/inspection/inspection.repository';
import { InspectionQueueService } from '../../citysim/inspection/inspection.service';
import { ForensicProjectionService } from './forensic.projection.service';
import type { ForensicClientProjection } from './forensic.projection.service';

// ── Helpers ───────────────────────────────────────────────────────────────────────────────────────

/**
 * Monotone counter for test callsign uniqueness.
 * Prevents callsign collisions when multiple test requests arrive in the same millisecond.
 * No Math.random — just a per-process integer counter (safe for test-only use).
 * Mirrors the insurance-test.controller.ts nextTestCallsign pattern.
 */
let _testCallsignCounter = 0;
function nextTestCallsign(prefix: string): string {
  const n = ++_testCallsignCounter;
  return `${prefix}-${(Date.now() % 100_000_000).toString().padStart(8, '0')}-${n.toString().padStart(4, '0')}`;
}

/**
 * Serialize a DB row for JSON (convert BigInt → string, keep everything else as-is).
 * Bigint columns (last_audit_tick, front_dark_until_tick) serialize as strings per plan line 153.
 * Mirrors the insurance-test.controller.ts serializeRow pattern.
 */
function serializeRow(row: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!row) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = typeof v === 'bigint' ? String(v) : v;
  }
  return out;
}

/** In-process event capture store: playerId → list of captured events. C20 probe. */
const capturedEvents = new Map<string, Array<Record<string, unknown>>>();

/**
 * W6a C2 (D3.c) — true iff a thrown DB error is the ownership-immutability trigger violation
 * (migration 0142, custom SQLSTATE 'OW001'). Mirrors the `isUniqueViolation` idiom already
 * established by `standing-order.service.ts` / `flag-discipline.service.ts` /
 * `degraded-category-pressure-producer.service.ts` — "each service/repository keeps its own copy",
 * never a shared extraction (SAME copy as `leading-digit-audit.service.ts` / `standing-gap-heat.
 * service.ts`). Used only by `attempt-ownership-mutation` below, where hitting the trigger is the
 * EXPECTED, correct outcome the route is designed to observe.
 */
function isOwnershipImmutableViolation(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } } | null;
  return err?.code === 'OW001' || err?.cause?.code === 'OW001';
}

/**
 * Deterministic test front uuid sentinel.
 * Used as the frontId for C1 seed — deterministic, no Math.random.
 * Mirrors the TEST_UNDERWRITER_ID sentinel in insurance-test.controller.ts.
 */
const TEST_FRONT_ID = '00000000-0000-0000-0000-000000000f01';

/**
 * Deterministic test workshop uuid sentinel (C2).
 * Used as the workshopId for seed-effluent-state — deterministic, no Math.random.
 */
const TEST_WORKSHOP_ID = '00000000-0000-0000-0000-000000000f02';

/**
 * Deterministic test workshop uuid sentinel 2 (C13).
 * Used as the second workshopId when twoWorkshops=true — deterministic, no Math.random.
 * Both workshops are seeded in the same TEST_BLOCK_ID block for block-level aggregation testing.
 */
const TEST_WORKSHOP_ID_2 = '00000000-0000-0000-0000-000000000f03';

/**
 * Test block id + district id for C2 seed (fixed, deterministic).
 * Block 1001 in district 1 — arbitrary but consistent across test runs.
 */
const TEST_BLOCK_ID = 1001;
const TEST_DISTRICT_ID = 1;

// ── C2 request/response shapes ────────────────────────────────────────────────────────────────────

/** Body for POST /v1/_test/forensic/seed-effluent-state */
interface SeedEffluentStateBody {
  substanceType: SubstanceTypeValue;
  /**
   * twoWorkshops (C13) — if true, seeds TWO workshops (TEST_WORKSHOP_ID + TEST_WORKSHOP_ID_2)
   * in the same TEST_BLOCK_ID block. Both workshops are pre-seeded with the same substanceType.
   * The response carries both workshopId and workshopId2 for the C13 E2E aggregation test.
   */
  twoWorkshops?: boolean;
  /**
   * highThroughputKg (C14) — if provided, pre-seeds the workshop with the given kg throughput
   * by calling recordWorkshopThroughput + updateBlockEffluentRegister after the row seed.
   * This allows the C14 E2E to control block_effluent level for the both-ways falsifiable test.
   * gameMinute used: DAILY_MINUTES × 50 (a stable game-day 50 value → day=50).
   * Anti-fabrication: routes through the real EffluentStoichiometryService → real PG rows.
   * No Math.random — gameMinute is a deterministic constant.
   */
  highThroughputKg?: number;
  /** C20 probe: if true, register event capture listeners for this player after seeding. */
  captureEvents?: boolean;
}

/** Response for POST /v1/_test/forensic/seed-effluent-state */
interface SeedEffluentStateResponse {
  playerId: string;
  workshopId: string;
  blockId: number;
  /** District id for the seeded block (TEST_DISTRICT_ID=1, deterministic sentinel). Always present (C15). */
  districtId: number;
  /**
   * C23: precinctId derived from districtId via the ⌈districtId/3⌉ grouping (System 3 canon).
   * For TEST_DISTRICT_ID=1: precinctId = Math.min(6, Math.ceil(1/3)) = 1.
   * The C23 E2E reads the declaration_ledger for this precinctId to assert durable entries.
   */
  precinctId: number;
  /** Present only when twoWorkshops=true (C13). Second workshop sentinel uuid. */
  workshopId2?: string;
}

/** Response for GET /v1/_test/forensic/read-effluent-state */
interface ReadEffluentStateResponse {
  workshop: Record<string, unknown> | null;
  blockRegister: Record<string, unknown> | null;
}

/** Response for GET /v1/_test/forensic/read-recipe-table */
interface ReadRecipeTableResponse {
  recipes: Record<string, unknown>[];
}

// ── C1 request/response shapes ────────────────────────────────────────────────────────────────────

/** Response for POST /v1/_test/forensic/seed-ledger-ring */
interface SeedLedgerRingResponse {
  playerId: string;
  frontId: string;
}

/** Body for POST /v1/_test/forensic/delete-player */
interface DeletePlayerBody {
  playerId: string;
}

/** Response for GET /v1/_test/forensic/read-ledger-ring */
interface ReadLedgerRingResponse {
  ledgerRing: Record<string, unknown> | null;
  softFlagRing: Record<string, unknown> | null;
}

// ── C3 request/response shapes ────────────────────────────────────────────────────────────────────

/** Response for POST /v1/_test/forensic/seed-lifestyle-state */
interface SeedLifestyleStateResponse {
  playerId: string;
  lieutenantId: string;
}

/** Response for GET /v1/_test/forensic/read-lifestyle-state */
interface ReadLifestyleStateResponse {
  lifestyle: Record<string, unknown> | null;
}

// ── C16 request/response shapes ───────────────────────────────────────────────────────────────────

/** Body for POST /v1/_test/forensic/populate-lifestyle */
interface PopulateLifestyleBody {
  /** Lieutenant's declared cut in cents (number). */
  declaredCutCents: number;
  /** Visible standard tier index (smallint, housing/transport/dependents). */
  visibleStandardIndex: number;
  /**
   * Optional: re-populate existing player (skip player/lieutenant creation).
   * When provided, UPSERTs the lifestyle row for the existing lieutenantId instead.
   * Used for the decrement test: populate with high-cut params first (to set last_gap),
   * then call again with low-cut params to change last_gap for the decrement tick.
   * NOT used in C17 — seedConsecutive below is the decrement fixture seam.
   */
  playerId?: string;
  /**
   * C17 seedConsecutive — if provided, seeds consecutive_flag_months to this value
   * (after the UPSERT of the lifestyle row). Allows the decrement E2E to pre-seed the
   * counter without running multiple ticks. TEST-ONLY knob.
   * Value is clamped to [0, 32767] (smallint range).
   */
  seedConsecutive?: number;
  /**
   * C18 tailStartedTick — if provided, seeds tail_started_tick to this game-minute value
   * directly after the UPSERT. Allows the C18 E2E to pre-seed a spawned tail at a specific
   * game-minute WITHOUT running runMonthlyTick. TEST-ONLY seed knob.
   * Value: game-minute (non-negative integer). 0 = tail spawned at game-start.
   */
  tailStartedTick?: number;
  /**
   * C18 tailRampStage — if provided, seeds tail_ramp_stage to this value directly after
   * the UPSERT. Allows the C18 E2E to set the starting stage explicitly (e.g. 'passive')
   * WITHOUT running runMonthlyTick. TEST-ONLY seed knob.
   * Valid values: 'none' | 'passive' | 'tailing' | 'subpoena' (TailRampStage).
   */
  tailRampStage?: 'none' | 'passive' | 'tailing' | 'subpoena';
  /**
   * C19 review⊥ IMPORTANT — seedQueueEntry: if true, writes a single SCHEDULED entry into
   * the lifestyle player's existing district-1 queue row AFTER the inspection_queues row is
   * seeded. This lets the entries-preserved test place a non-FORENSIC entry on the SAME player
   * + district the forensic emission targets, making the clobber-guard assertion genuinely
   * falsifiable (if applyQueues replaced instead of appended, the SCHEDULED entry would vanish).
   * The entry shape matches QueueEntry exactly: building_id sentinel 1001, priority_bucket LOW,
   * age_in_ticks 0, decay_accumulator 0 — no fabricated fields.
   * TEST-ONLY: never used in production paths.
   */
  seedQueueEntry?: boolean;
  /** C20 probe: if true, register event capture listeners for this player after seeding. */
  captureEvents?: boolean;
}

// ── C17 request/response shapes ───────────────────────────────────────────────────────────────────

/** Body for POST /v1/_test/forensic/run-monthly-tick */
interface RunMonthlyTickBody {
  /** Player uuid for whom the monthly tick runs. */
  playerId: string;
  /** monthId = floor(dayId / daysPerMonth) — the idempotence key (OQ-9). */
  monthId: number;
}

/** Response for POST /v1/_test/forensic/run-monthly-tick */
interface RunMonthlyTickResponse {
  ticked: boolean;
}

/** Response for POST /v1/_test/forensic/populate-lifestyle */
interface PopulateLifestyleResponse {
  playerId: string;
  lieutenantId: string;
  /** last_gap value computed and stamped by populateLifestyleState (gap = cost − cut·(1−savings)). */
  lastGap: number;
  /**
   * districtId — the inspection_queues district seeded for C19 queue-emission tests.
   * Always TEST_DISTRICT_ID=1 (deterministic sentinel). Seeded in populate-lifestyle so that
   * advance-tail-ramp's C19 applyQueues call has a queue row to write into (same pattern as
   * seed-effluent-state seeding the queue row for C15 effluent_inspection tests).
   */
  districtId: number;
}

// ── C18 request/response shapes ───────────────────────────────────────────────────────────────────

/** Body for POST /v1/_test/forensic/advance-tail-ramp */
interface AdvanceTailRampBody {
  /** Player uuid for whom the tail ramp is advanced. */
  playerId: string;
  /**
   * dayId — in-game day id. The service derives:
   *   currentGameMinute = dayId × TICKS_PER_DAY (1440)
   *   daysSinceSpawn = (currentGameMinute − tail_started_tick) / TICKS_PER_DAY
   * Mirrors the dayId arg in runEnvironmentalInspectorScan (NIGHTLY/9 pattern).
   */
  dayId: number;
  /** C20 probe: if true, register event capture listeners for this player before advancing. */
  captureEvents?: boolean;
}

/** Response for POST /v1/_test/forensic/advance-tail-ramp */
interface AdvanceTailRampResponse {
  advanced: boolean;
}

// ── C6 request/response shapes ────────────────────────────────────────────────────────────────────

/** Body for POST /v1/_test/forensic/record-receipt */
interface RecordReceiptBody {
  playerId: string;
  frontId: string;
  amountCents: number;
}

/** Response for POST /v1/_test/forensic/record-receipt */
interface RecordReceiptResponse {
  recorded: boolean;
}

// ── C7 request/response shapes ────────────────────────────────────────────────────────────────────

/**
 * Body for POST /v1/_test/forensic/seed-ring-digits
 *
 * Seeds a fresh player + ring row with the provided digit array.
 * Returns { playerId, frontId } for subsequent tick + read assertions.
 */
interface SeedRingDigitsBody {
  /** Array of leading digits 1..9 to write directly into the ring column (TEST-ONLY). */
  digits: number[];
  /** C20 probe: if true, register event capture listeners for this player after seeding. */
  captureEvents?: boolean;
}

/** Response for POST /v1/_test/forensic/seed-ring-digits */
interface SeedRingDigitsResponse {
  playerId: string;
  frontId: string;
  /** Deterministic precinct id (1) for declaration_ledger C8 read assertion. */
  precinctId: number;
}

// ── C8 request/response shapes ────────────────────────────────────────────────────────────────────

/**
 * Response for GET /v1/_test/forensic/read-soft-flag-ring
 *
 * Returns the forensic_soft_flag_ring row for the player (by player_id, front=TEST_FRONT_ID).
 * The flag_ticks JSONB array is the 3-in-60d windowed counter for hard-audit (C9).
 * R2.2: TEST-ONLY. Raw row for DB assertion only.
 */
interface ReadSoftFlagRingResponse {
  front_id: string;
  player_id: string;
  flag_ticks: number[];
}

/**
 * Response for GET /v1/_test/forensic/read-declaration-ledger
 *
 * Returns the declaration_ledger JSONB ring from precinct_memory for the given player + precinct.
 * The ledger array carries DeclarationEntry objects including 'forensic_benford_soft_flag' entries.
 * R2.2: TEST-ONLY. Raw JSONB for DB assertion only (BPD memory is server-internal).
 */
interface ReadDeclarationLedgerResponse {
  ledger: Record<string, unknown>[];
}

/**
 * Body for POST /v1/_test/forensic/run-weekly-audit-tick
 *
 * Triggers LeadingDigitAuditService.runWeeklyAuditTick for the given player + weekId.
 * Allows the E2E to drive the WEEKLY/9 tick without waiting for the real scheduler.
 */
interface RunWeeklyAuditTickBody {
  playerId: string;
  weekId: number;
}

/** Response for POST /v1/_test/forensic/run-weekly-audit-tick */
interface RunWeeklyAuditTickResponse {
  ticked: boolean;
}

// ── Controller ────────────────────────────────────────────────────────────────────────────────────

@Controller({ version: String(CURRENT_API_MAJOR) })
export class ForensicTestController {
  private readonly logger = new Logger(ForensicTestController.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly forensicRepository: ForensicRepository,
    // C6: injected for record-receipt probe route.
    private readonly leadingDigitAudit: LeadingDigitAuditService,
    // C12: injected for record-throughput probe route.
    @Optional() private readonly effluentStoichiometry: EffluentStoichiometryService,
    // C16: injected for populate-lifestyle probe route.
    @Optional() private readonly standingGapHeat: StandingGapHeatService,
    // C20: injected for event-capture probe route.
    @Optional() private readonly cityEventBus?: CityEventBus,
    // C22: injected for dispatch-queue probe route (calls runDispatchTickForTest).
    @Optional() private readonly inspectionQueueService?: InspectionQueueService,
    // C24: injected for read-projection probe route.
    @Optional() private readonly forensicProjection?: ForensicProjectionService,
  ) {}

  /**
   * registerEventCapture — register in-process listeners for all 3 forensic bus events for this player.
   *
   * C20 probe (TEST-ONLY): accumulates events in the module-level `capturedEvents` map.
   * Safe to call multiple times for the same playerId (additional listeners accumulate events,
   * but the 2× back-to-back guard resets the map via the seed routes — not via this method).
   *
   * @param playerId - the player UUID to capture events for.
   */
  private registerEventCapture(playerId: string): void {
    if (!this.cityEventBus) return;
    if (!capturedEvents.has(playerId)) {
      capturedEvents.set(playerId, []);
    }
    // Register one-time listeners for this player (additive — other listeners unaffected).
    this.cityEventBus.onForensicSoftFlagDetected((e: ForensicSoftFlagDetectedEvent) => {
      if (e.playerId === playerId) {
        capturedEvents.get(playerId)!.push({ ...e });
      }
    });
    this.cityEventBus.onEffluentFlagDetected((e: EffluentFlagDetectedEvent) => {
      if (e.playerId === playerId) {
        capturedEvents.get(playerId)!.push({ ...e });
      }
    });
    this.cityEventBus.onLifestyleGapFlag((e: LifestyleGapFlagEvent) => {
      if (e.playerId === playerId) {
        capturedEvents.get(playerId)!.push({ ...e });
      }
    });
    // C22: also capture ForensicEntryDispatchedEvent (emitted by InspectionQueueService at dispatch-time
    // for FORENSIC entries). Proves the dispatcher was called with the correct forensicKind.
    this.cityEventBus.onForensicEntryDispatched((e: ForensicEntryDispatchedEvent) => {
      if (e.playerId === playerId) {
        capturedEvents.get(playerId)!.push({ ...e });
      }
    });
    // C22 review⊥ IMPORTANT: also capture HeatInjectionEvent (emitted by InspectionQueueDispatcherService
    // for effluent_inspection + tail_active). Proves the dispatcher's heat-bump consequence fires
    // (i.e. the dispatcher called bus.emitHeatInjection), not just that the upstream producer event was
    // captured. This is the falsifiable seam: a log-only/no-op effluent_inspection or tail_active branch
    // would NOT emit HeatInjectionEvent → captured heat_injection array stays empty → assertion fails.
    this.cityEventBus.onHeatInjection((e: HeatInjectionEvent) => {
      if (e.playerId === playerId) {
        capturedEvents.get(playerId)!.push({ ...e });
      }
    });
  }

  // ── C1 Routes ─────────────────────────────────────────────────────────────────────────────────

  /**
   * `POST /v1/_test/forensic/seed-ledger-ring` — C1 persistence proof (TEST-ONLY).
   *
   * Creates a fresh test account + player row; inserts 1 row in ledger_entry_ring and 1 row in
   * forensic_soft_flag_ring for the sentinel TEST_FRONT_ID.
   * Returns { playerId, frontId } for the E2E read + cascade-delete assertion.
   *
   * Column values use DB defaults — no mechanic logic (persistence-only at C1).
   * Idempotent: the ledger_entry_ring / forensic_soft_flag_ring rows are DELETE-then-INSERT-ed
   * (W6a C2 — migration 0142 makes their player_id DB-immutable post-INSERT, so an UPSERT-reassign
   * would hit that trigger on every 2× back-to-back run).
   * Anti-fabrication: frontId is a deterministic sentinel; playerId is PG gen_random_uuid().
   * No Math.random.
   *
   * W6a C7: also UPSERTs a matching `buildings` row for the sentinel (see inline comment below) —
   * `recordReceipt`'s new ownership-at-creation guard requires it before any downstream
   * `record-receipt` call against this frontId will succeed.
   *
   * C10 extension: optional body `{ walletCents?: number }` — if provided, seeds
   * `economy_states.cash_cents` so the Bookkeeper cut debit is observable.
   * Mirrors the seed-soft-flag-ring walletCents seeding pattern (C9).
   */
  @Post('_test/forensic/seed-ledger-ring')
  async seedLedgerRing(@Body() body?: { walletCents?: number }): Promise<SeedLedgerRingResponse> {
    // 1. Create a test account + player row.
    //    Pattern mirrors insurance-test.controller.ts seedEntities() — insert account first.
    const [accountRow] = await this.db
      .insert(account)
      .values({
        kind: 'PLAYER',
        lifecycle_state: 'ACTIVE',
      })
      .returning({ account_id: account.account_id });
    if (!accountRow) {
      throw new HttpException('Failed to create test account', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const testAccountId = accountRow.account_id;

    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: testAccountId,
        callsign: nextTestCallsign('frc'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    if (!playerRow) {
      throw new HttpException('Failed to create test player', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const playerId = playerRow.player_id;
    const frontId = TEST_FRONT_ID;

    // 2. Insert 1 row per §5.1 table.
    //    ledger_entry_ring / forensic_soft_flag_ring: reseed the shared sentinel PK (TEST_FRONT_ID) so
    //    the row is fresh and owned by the new test player each run — REQUIRED for 2× back-to-back
    //    runs (ON CONFLICT DO NOTHING alone would leave the OLD player's ring intact, breaking
    //    subsequent reads by the new player's id).
    //
    //    W6a C2 (migration 0142): `player_id` on both tables is now DB-immutable post-INSERT (BEFORE
    //    UPDATE trigger). The prior `.onConflictDoUpdate({ set: { player_id: playerId, … } })` here
    //    would hit THAT trigger on every 2×-back-to-back run. Fixed by DELETE-then-INSERT instead of
    //    UPSERT-reassign: never executes an UPDATE that changes player_id, so the trigger never sees
    //    it. Same observable result (a fresh row owned by the new test player), zero change to any
    //    spec's assertions. [W6a C2 Deviation — implementation-notes.md §Deviations "C2 — trigger vs.
    //    shared-sentinel test fixtures".]
    await this.db.delete(ledgerEntryRing).where(eq(ledgerEntryRing.front_id, frontId));
    await this.db.insert(ledgerEntryRing).values({
      front_id: frontId,
      player_id: playerId,
      // ring='[]'::jsonb, ring_head=0, soft_flag_count=0, last_chi_square=null,
      // last_audit_tick=null, front_dark_until_tick=null (DB defaults).
    });

    await this.db.delete(forensicSoftFlagRing).where(eq(forensicSoftFlagRing.front_id, frontId));
    await this.db.insert(forensicSoftFlagRing).values({
      front_id: frontId,
      player_id: playerId,
      // flag_ticks='[]' (DB default).
    });

    // W6a C7 (P-A′, ownership-at-creation guard) — `recordReceipt` now requires `frontId` to
    // resolve to a REAL `buildings` row with `player_id = playerId AND ownership = 'player'`
    // BEFORE it will touch `ledger_entry_ring` (leading-digit-audit.service.ts). Reassign the
    // sentinel building to the fresh test player too, so downstream `record-receipt` calls
    // against `frontId` (below, and in every spec that calls this route) still satisfy the
    // guard — mirrors the ledger_entry_ring / forensic_soft_flag_ring reassignment just above,
    // EXCEPT `buildings` carries no ownership-immutability trigger (migration 0142 targets only
    // the 4 forensic tables), so a plain UPSERT is enough — no DELETE-then-INSERT needed here.
    await this.db
      .insert(building)
      .values({
        building_id: frontId,
        player_id: playerId,
        block_id: 0,
        building_type: 1,
        ownership: 'player',
        structural_state: 'operational',
      })
      .onConflictDoUpdate({
        target: building.building_id,
        set: { player_id: playerId, ownership: 'player' },
      });

    // C10 extension: optionally seed economy_states.cash_cents so the Bookkeeper cut is observable.
    // Mirrors seed-soft-flag-ring walletCents seeding pattern (C9 :1116-1128).
    const walletCents = body?.walletCents;
    if (walletCents !== undefined && Number.isFinite(walletCents) && walletCents >= 0) {
      await this.db
        .insert(economyState)
        .values({
          player_id: playerId,
          cash_cents: BigInt(Math.round(walletCents)),
        })
        .onConflictDoUpdate({
          target: economyState.player_id,
          set: {
            cash_cents: BigInt(Math.round(walletCents)),
          },
        });
    }

    return { playerId, frontId };
  }

  /**
   * `GET /v1/_test/forensic/read-ledger-ring?playerId=<uuid>` — C1 persistence proof (TEST-ONLY).
   *
   * Reads both §5.1 ring rows for the given player.
   * Returns { ledgerRing: row | null, softFlagRing: row | null }.
   * Bigint columns (last_audit_tick, front_dark_until_tick) are serialized as strings.
   *
   * E2E assertion: the returned shapes prove column defaults (ring='[]', ring_head=0,
   *   soft_flag_count=0, last_chi_square=null, last_audit_tick=null, front_dark_until_tick=null,
   *   flag_ticks='[]') and FK CASCADE (returns null after player is deleted).
   * R2.2: TEST-ONLY (not registered in production). Raw rows for DB assertion only.
   */
  @Get('_test/forensic/read-ledger-ring')
  async readLedgerRing(
    @Query('playerId') playerId: string,
  ): Promise<ReadLedgerRingResponse> {
    if (!playerId) {
      throw new HttpException('playerId query param required', HttpStatus.BAD_REQUEST);
    }

    const [ledgerRow = null] = await this.db
      .select()
      .from(ledgerEntryRing)
      .where(eq(ledgerEntryRing.player_id, playerId))
      .limit(1);

    const [flagRow = null] = await this.db
      .select()
      .from(forensicSoftFlagRing)
      .where(eq(forensicSoftFlagRing.player_id, playerId))
      .limit(1);

    return {
      ledgerRing: serializeRow(ledgerRow as Record<string, unknown> | null),
      softFlagRing: serializeRow(flagRow as Record<string, unknown> | null),
    };
  }

  /**
   * `POST /v1/_test/forensic/delete-player` — C1 + C2 FK CASCADE proof (TEST-ONLY).
   *
   * Deletes the test player row. The player FK CASCADE should remove all forensic rows
   * (ledger_entry_ring, forensic_soft_flag_ring, workshop_stoichiometry_state, block_effluent_register).
   * The E2E then re-reads and asserts all rows are null.
   *
   * R2.2: TEST-ONLY (not registered in production). Used ONLY to assert CASCADE behavior.
   */
  @Post('_test/forensic/delete-player')
  async deletePlayer(@Body() body: DeletePlayerBody): Promise<{ deleted: boolean }> {
    const { playerId } = body;
    if (!playerId) {
      throw new HttpException('playerId required in body', HttpStatus.BAD_REQUEST);
    }
    // Delete lieutenants + their behavior_scripts first (lieutenant.player_id RESTRICT).
    // 1. Collect script ids before deleting lieutenants.
    const lts = await this.db
      .select({ lieutenant_id: lieutenant.lieutenant_id, behavior_script_id: lieutenant.behavior_script_id })
      .from(lieutenant)
      .where(eq(lieutenant.player_id, playerId));
    const scriptIds = lts.map(r => r.behavior_script_id);
    // 2. Delete lieutenants (lifestyle_audit_state.lieutenant_id CASCADE will clean up lifestyle rows).
    if (lts.length > 0) {
      await this.db
        .delete(lieutenant)
        .where(eq(lieutenant.player_id, playerId));
    }
    // 3. Delete orphan behavior_scripts (no more lieutenant FK).
    if (scriptIds.length > 0) {
      await this.db
        .delete(behaviorScript)
        .where(inArray(behaviorScript.script_id, scriptIds));
    }
    // 4. Delete player (all remaining CASCADE tables: ledger rings, stoichiometry, etc.).
    await this.db
      .delete(player)
      .where(eq(player.player_id, playerId));
    return { deleted: true };
  }

  // ── C2 Routes ─────────────────────────────────────────────────────────────────────────────────

  /**
   * `GET /v1/_test/forensic/read-recipe-table` — C2 SEED proof (TEST-ONLY).
   *
   * Reads all rows from recipe_stoichiometry_table.
   * Returns { recipes: row[] } — expects 4 rows (brindle/crick/hush/ash) [PROV-Y26Q2].
   * Asserts the migration 0072 SEED applied correctly.
   *
   * Anti-fabrication (OQ-5): the SEED values are [PROV-Y26Q2] and come from the live PG table —
   *   this route proves they are PRESENT in the real database, not mocked.
   * R2.2: TEST-ONLY (not registered in production). Designer reference data, not player state.
   */
  @Get('_test/forensic/read-recipe-table')
  async readRecipeTable(): Promise<ReadRecipeTableResponse> {
    const rows = await this.forensicRepository.readRecipeTable();
    return {
      recipes: rows.map(r => r as unknown as Record<string, unknown>),
    };
  }

  /**
   * `POST /v1/_test/forensic/seed-effluent-state` — C2 persistence proof (TEST-ONLY).
   *
   * Creates a fresh test account + player row; inserts 1 workshop_stoichiometry_state row
   * + 1 block_effluent_register row for the player (using deterministic sentinel ids).
   * Returns { playerId, workshopId, blockId } for the E2E read + cascade-delete assertion.
   *
   * Body: { substanceType: 'brindle' | 'crick' | 'hush' | 'ash' }
   *
   * Idempotent: ForensicRepository.seedEffluentState uses ON CONFLICT DO NOTHING.
   * Anti-fabrication: workshopId is a deterministic sentinel; playerId is PG gen_random_uuid().
   *   substanceType is the EXISTING PG enum (OQ-5). No Math.random.
   */
  @Post('_test/forensic/seed-effluent-state')
  async seedEffluentState(@Body() body: SeedEffluentStateBody): Promise<SeedEffluentStateResponse> {
    const { substanceType, twoWorkshops = false, highThroughputKg, captureEvents: shouldCapture } = body;
    if (!substanceType || !['brindle', 'crick', 'hush', 'ash'].includes(substanceType)) {
      throw new HttpException(
        'substanceType must be one of: brindle, crick, hush, ash',
        HttpStatus.BAD_REQUEST,
      );
    }

    // 1. Create a test account + player row (mirrors C1 pattern).
    const [accountRow] = await this.db
      .insert(account)
      .values({
        kind: 'PLAYER',
        lifecycle_state: 'ACTIVE',
      })
      .returning({ account_id: account.account_id });
    if (!accountRow) {
      throw new HttpException('Failed to create test account', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow.account_id,
        callsign: nextTestCallsign('frc2'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    if (!playerRow) {
      throw new HttpException('Failed to create test player', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const playerId = playerRow.player_id;

    // C20 event-capture probe: register listeners before any scan is fired.
    if (shouldCapture) {
      this.registerEventCapture(playerId);
    }

    // 2. Insert 1 row per §5.2 table (ON CONFLICT DO NOTHING — idempotent for 2× back-to-back).
    //    seedEffluentState seeds workshopStoichiometryState row 1 + block_effluent_register row.
    await this.forensicRepository.seedEffluentState({
      workshopId: TEST_WORKSHOP_ID,
      playerId,
      blockId: TEST_BLOCK_ID,
      districtId: TEST_DISTRICT_ID,
      substanceType,
    });

    // C15 extension: seed the inspection_queues row for (playerId, TEST_DISTRICT_ID=1) so that
    // C15's applyQueues emission has a row to write into. Without this seed the getQueue read
    // returns null (the queue is lazily seeded at player-setup tick) and the emission is skipped.
    // Idempotent: ON CONFLICT DO NOTHING — safe for 2× back-to-back (leçon D2).
    // Mirrors the C21 push-queue-entry seed pattern (same INSERT ON CONFLICT DO NOTHING).
    await this.db.execute(sql`
      INSERT INTO ${inspectionQueue} (player_id, district_id, entries, length, processing_rate_per_day, budget_modifier)
      VALUES (${playerId}::uuid, ${TEST_DISTRICT_ID}::int, '[]'::jsonb, 0, 4, 0)
      ON CONFLICT DO NOTHING
    `);

    // C13 extension: if twoWorkshops=true, seed a SECOND workshop (TEST_WORKSHOP_ID_2) in the same block.
    // Both workshops belong to the same playerId + blockId (TEST_BLOCK_ID) so updateBlockEffluentRegister
    // will aggregate both.
    //
    // Note: seedEffluentState does DELETE-then-INSERT on block_effluent_register (by blockId).
    // The second call would delete the register row inserted by the first call, then re-insert it.
    // To avoid this, we insert the second workshop row directly (workshop_stoichiometry_state only —
    // the block_effluent_register was already created by the first seedEffluentState call).
    //
    // W6a C2 (migration 0142): `workshop_stoichiometry_state.player_id` is DB-immutable post-INSERT —
    // DELETE-then-INSERT here too (same reasoning as `ForensicRepository#seedEffluentState`'s own
    // DELETE-then-INSERT on `block_effluent_register`, just above — this table now needs the SAME
    // treatment for the SAME reason). [W6a C2 Deviation — implementation-notes.md §Deviations
    // "C2 — trigger vs. shared-sentinel test fixtures".]
    if (twoWorkshops) {
      await this.db
        .delete(workshopStoichiometryState)
        .where(eq(workshopStoichiometryState.workshop_id, TEST_WORKSHOP_ID_2));
      await this.db.insert(workshopStoichiometryState).values({
        workshop_id: TEST_WORKSHOP_ID_2,
        player_id: playerId,
        block_id: TEST_BLOCK_ID,
        substance_type: substanceType,
        throughput_kg_window: sql`'[]'::jsonb`,
        updated_at_tick: null,
      });

      // C23: precinctId derived from districtId (⌈d/3⌉ grouping, same as PoliceMemoryService).
      const twoWorkshopPrecinctId = Math.min(6, Math.ceil(TEST_DISTRICT_ID / 3));
      return {
        playerId,
        workshopId: TEST_WORKSHOP_ID,
        workshopId2: TEST_WORKSHOP_ID_2,
        blockId: TEST_BLOCK_ID,
        districtId: TEST_DISTRICT_ID,
        precinctId: twoWorkshopPrecinctId,
      };
    }

    // C14 extension: if highThroughputKg is provided, pre-seed throughput via real service path.
    // This drives block_effluent high enough to trigger deviation > sigma (both-ways falsifiable).
    // gameMinute = DAILY_MINUTES × 50 → dayId = 50 (deterministic, no Math.random).
    if (highThroughputKg !== undefined && Number.isFinite(highThroughputKg) && highThroughputKg > 0) {
      const DAILY_MINUTES = 1440;
      const gameMinute = DAILY_MINUTES * 50; // stable game-day 50 → dayId 50
      await this.effluentStoichiometry.recordWorkshopThroughput(
        playerId,
        TEST_WORKSHOP_ID,
        substanceType,
        highThroughputKg,
        gameMinute,
      );
      await this.effluentStoichiometry.updateBlockEffluentRegister(playerId, TEST_BLOCK_ID);
    }

    // C23: precinctId derived from districtId (⌈d/3⌉ grouping, same as PoliceMemoryService.loadGeographyMapping).
    // For TEST_DISTRICT_ID=1: precinctId = Math.min(6, Math.ceil(1/3)) = 1.
    const precinctId = Math.min(6, Math.ceil(TEST_DISTRICT_ID / 3));
    return { playerId, workshopId: TEST_WORKSHOP_ID, blockId: TEST_BLOCK_ID, districtId: TEST_DISTRICT_ID, precinctId };
  }

  /**
   * `GET /v1/_test/forensic/read-effluent-state?playerId=<uuid>` — C2 persistence proof (TEST-ONLY).
   *
   * Reads workshop_stoichiometry_state + block_effluent_register for the given player.
   * Returns { workshop: row | null, blockRegister: row | null }.
   * Bigint columns (updated_at_tick, last_scan_tick) are serialized as strings.
   *
   * R2.2: TEST-ONLY (not registered in production). Raw rows for DB assertion only.
   *   baseline_effluent + last_deviation are server-only scalars — never client-projected.
   */
  @Get('_test/forensic/read-effluent-state')
  async readEffluentState(
    @Query('playerId') playerId: string,
  ): Promise<ReadEffluentStateResponse> {
    if (!playerId) {
      throw new HttpException('playerId query param required', HttpStatus.BAD_REQUEST);
    }

    const { workshop, blockRegister } = await this.forensicRepository.readEffluentState(playerId);

    return {
      workshop: serializeRow(workshop as Record<string, unknown> | null),
      blockRegister: serializeRow(blockRegister as Record<string, unknown> | null),
    };
  }

  // ── C3 Routes ─────────────────────────────────────────────────────────────────────────────

  /**
   * `POST /v1/_test/forensic/seed-lifestyle-state` — C3 persistence proof (TEST-ONLY).
   *
   * Creates a fresh test account + player row + a deterministic lieutenant row + 1 row in
   * lifestyle_audit_state for the sentinel TEST_LIEUTENANT_ID.
   * Returns { playerId, lieutenantId } for the E2E read + cascade-delete assertion.
   *
   * Column values use DB defaults — no mechanic logic (persistence-only at C3).
   * Idempotent: ForensicRepository.seedLifestyleState uses ON CONFLICT DO NOTHING.
   * Anti-fabrication: lieutenantId is a deterministic sentinel; playerId is PG gen_random_uuid().
   * No Math.random.
   */
  @Post('_test/forensic/seed-lifestyle-state')
  async seedLifestyleState(): Promise<SeedLifestyleStateResponse> {
    // 1. Create a test account + player row (mirrors C1/C2 pattern).
    const [accountRow] = await this.db
      .insert(account)
      .values({
        kind: 'PLAYER',
        lifecycle_state: 'ACTIVE',
      })
      .returning({ account_id: account.account_id });
    if (!accountRow) {
      throw new HttpException('Failed to create test account', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow.account_id,
        callsign: nextTestCallsign('frc3'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    if (!playerRow) {
      throw new HttpException('Failed to create test player', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const playerId = playerRow.player_id;

    // 2. Create a test behavior_script row + lieutenant row (2-step atomic pattern mirrors
    //    insurance-test.controller.ts:  behaviorScript INSERT first → lieutenant INSERT).
    //    The lieutenant is the FK target for lifestyle_audit_state.lieutenant_id.
    const [scriptRow] = await this.db
      .insert(behaviorScript)
      .values({
        // All defaults: rules='{"rules":[]}', source='', valid=false, last_modified_by='system'.
      })
      .returning({ script_id: behaviorScript.script_id });
    if (!scriptRow) {
      throw new HttpException('Failed to create test behavior_script', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const [ltRow] = await this.db
      .insert(lieutenant)
      .values({
        player_id: playerId,
        role_id: 1,             // BOOKKEEPER-adjacent; any valid role_id works for C3 persistence.
        source: 'civilian',
        name: 'TestLt',
        name_locale: 'en',
        behavior_script_id: scriptRow.script_id,
        // Remaining columns use DB defaults (granted_role='advisory', mode='tasked', etc.).
      })
      .returning({ lieutenant_id: lieutenant.lieutenant_id });
    if (!ltRow) {
      throw new HttpException('Failed to create test lieutenant', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const lieutenantId = ltRow.lieutenant_id;

    // 3. Insert 1 row in lifestyle_audit_state (ON CONFLICT DO NOTHING — idempotent).
    await this.forensicRepository.seedLifestyleState({
      lieutenantId,
      playerId,
    } as SeedLifestyleStateInput);

    return { playerId, lieutenantId };
  }

  /**
   * `GET /v1/_test/forensic/read-lifestyle-state?playerId=<uuid>` — C3 persistence proof (TEST-ONLY).
   *
   * Reads the lifestyle_audit_state row for the given player (first match by player_id).
   * Returns { lifestyle: row | null }.
   * Bigint columns (tail_started_tick, declared_cut_cents) are serialized as strings.
   *
   * E2E assertion: proves defaults (consecutive_flag_months=0, tail_ramp_stage='none',
   *   last_gap=null, tail_started_tick=null, last_month_id=null) and FK CASCADE (null after delete).
   * R2.2: TEST-ONLY (not registered in production). Raw rows for DB assertion only.
   *   last_gap is server-only — asserted null here (C16 writes it).
   */
  @Get('_test/forensic/read-lifestyle-state')
  async readLifestyleState(
    @Query('playerId') playerId: string,
  ): Promise<ReadLifestyleStateResponse> {
    if (!playerId) {
      throw new HttpException('playerId query param required', HttpStatus.BAD_REQUEST);
    }

    const row = await this.forensicRepository.readLifestyleState(playerId);

    return {
      lifestyle: serializeRow(row as Record<string, unknown> | null),
    };
  }

  // ── C4 Routes ──────────────────────────────────────────────────────────────────────────────

  /**
   * `GET /v1/_test/forensic/tunables-probe` — C4 tunables probe (TEST-ONLY).
   *
   * Returns all resolved T.forensic.* tunable values via forensicTunables getters.
   * Values come from TunablesStore.resolve* (real stack — DB-override > env > default).
   * When no override is present, returns the canon-doc default values.
   *
   * Returns a flat object:
   *   { benford_chi2_threshold_H, benford_ring_buffer_length, benford_bookkeeper_cut_pct,
   *     benford_audit_tick_days, benford_hard_audit_softflags_count, benford_hard_audit_window_days,
   *     effluent_sigma_inspector_threshold, effluent_baseline_per_district_normalised,
   *     effluent_window_days, effluent_recipe_count,
   *     standing_gap_G_threshold_mult, standing_gap_consecutive_months,
   *     standing_gap_typical_savings_rate, standing_gap_tail_ramp_weeks,
   *     front_dark_weeks_min, front_dark_weeks_max, days_per_month,
   *     dispatch_effluent_priority_high_deviation, hard_audit_seizure_pct,
   *     effluent_baseline_day_perturbation_band }
   *
   * Anti-fabrication: values are resolved from the live TunablesStore — no mocked/hardcoded values.
   *   The probe proves that the materialized gdd/14 rows + the forensic-tunables.ts getters
   *   resolve with the canon-doc defaults when no override is present.
   * OQ-11 (composite): benford_hard_audit_softflags_window splits into count (3) + window (60d).
   * OQ-9 (days_per_month): genuinely NEW key — no clock.* months helper exists.
   * R2.2: TEST-ONLY (not registered in production). No raw hidden state — tunables are public config.
   * Zero-regression invariant (§1.3): no mechanic logic — reads config only, never mutates state.
   * No Math.random.
   */
  @Get('_test/forensic/tunables-probe')
  tunablesProbe(): Record<string, number> {
    return {
      // §7.1 — 12 existing rows materialized (canon-verbatim)
      benford_chi2_threshold_H:              forensicTunables.benfordChi2ThresholdH,
      benford_ring_buffer_length:            forensicTunables.benfordRingBufferLength,
      benford_bookkeeper_cut_pct:            forensicTunables.benfordBookkeeperCutPct,
      benford_audit_tick_days:               forensicTunables.benfordAuditTickDays,
      // OQ-11 composite split:
      benford_hard_audit_softflags_count:    forensicTunables.benfordHardAuditSoftflagsCount,
      benford_hard_audit_window_days:        forensicTunables.benfordHardAuditWindowDays,
      effluent_sigma_inspector_threshold:    forensicTunables.effluentSigmaInspectorThreshold,
      // 1 missing canon key (added as NEW registry row):
      effluent_baseline_per_district_normalised: forensicTunables.effluentBaselinePerDistrictNormalised,
      effluent_window_days:                  forensicTunables.effluentWindowDays,
      effluent_recipe_count:                 forensicTunables.effluentRecipeCount,
      standing_gap_G_threshold_mult:         forensicTunables.standingGapGThresholdMult,
      standing_gap_consecutive_months:       forensicTunables.standingGapConsecutiveMonths,
      standing_gap_typical_savings_rate:     forensicTunables.standingGapTypicalSavingsRate,
      standing_gap_tail_ramp_weeks:          forensicTunables.standingGapTailRampWeeks,
      // §7.2 NEW dispatcher/projection keys ([PROPOSED DEFAULT][PROV-Y26Q2])
      front_dark_weeks_min:                  forensicTunables.frontDarkWeeksMin,
      front_dark_weeks_max:                  forensicTunables.frontDarkWeeksMax,
      days_per_month:                        forensicTunables.daysPerMonth,
      dispatch_effluent_priority_high_deviation: forensicTunables.dispatchEffluentPriorityHighDeviation,
      // §7.2 C9 new key — hard-audit seizure fraction (materialized at C9):
      hard_audit_seizure_pct:                forensicTunables.hardAuditSeizurePct,
      // §7.2 C14 fix new key — DD-BASELINE-PERTURBATION baseline day-seed band (default 0.2):
      effluent_baseline_day_perturbation_band: forensicTunables.effluentBaselineDayPerturbationBand,
      // §7.2 C16 new key — DD-VISIBLE-STANDARD-COST visible-standard cost-per-index (default 10000):
      standing_gap_visible_standard_cents_per_index: forensicTunables.standingGapVisibleStandardCentsPerIndex,
      // Note: bucket-threshold rows (OQ-12) are [PROPOSED DEFAULT]/calibrate — not probed here.
    };
  }

  // ── C6 Routes ─────────────────────────────────────────────────────────────────────────────

  /**
   * `POST /v1/_test/forensic/record-receipt` — C6 ring-append probe (TEST-ONLY).
   *
   * Drives LeadingDigitAuditService.recordReceipt directly (the seam the laundering inject
   * uses, and the same code path the E2E exercises against the real stack).
   *
   * Body: { playerId: string; frontId: string; amountCents: number }
   *   — playerId: the player uuid (FK owner of the ring row).
   *   — frontId: the front building uuid (PK of ledger_entry_ring; sentinel TEST_FRONT_ID used
   *     by the spec via seed-ledger-ring).
   *   — amountCents: positive integer amount in cents (firstDigit extracted + pushed into ring).
   *
   * Returns: { recorded: true }
   *
   * Anti-fabrication: hits the real LeadingDigitAuditService → real PG ring row (no mock).
   * Zero-regression: this call does NOT mutate any laundering row; it is an ADDITIVE write
   *   to ledger_entry_ring only (lazy-create + FIFO append/overwrite).
   * R2.2: TEST-ONLY (not registered in production). Raw ring state for DB assertion.
   * OQ-10: ring stores first-digits 1..9 — proven by the companion read-ledger-ring route.
   * No Math.random.
   */
  @Post('_test/forensic/record-receipt')
  async recordReceipt(@Body() body: RecordReceiptBody): Promise<RecordReceiptResponse> {
    const { playerId, frontId, amountCents } = body;
    if (!playerId || !frontId) {
      throw new HttpException('playerId and frontId are required', HttpStatus.BAD_REQUEST);
    }
    if (!Number.isInteger(amountCents) || amountCents < 1) {
      throw new HttpException('amountCents must be a positive integer', HttpStatus.BAD_REQUEST);
    }
    await this.leadingDigitAudit.recordReceipt(playerId, frontId, amountCents);
    return { recorded: true };
  }

  // ── C7 Routes ─────────────────────────────────────────────────────────────────────────────

  /**
   * `POST /v1/_test/forensic/seed-ring-digits` — C7 χ² tick test fixture (TEST-ONLY).
   *
   * Creates a fresh test account + player; inserts a ledger_entry_ring row whose `ring`
   * column is set directly to the provided digit array (bypassing the FIFO recordReceipt path —
   * the E2E needs precise control over ring contents to prove both-ways χ² behaviour).
   *
   * Returns { playerId, frontId } for subsequent tick + read assertions.
   *
   * Anti-fabrication: frontId is a deterministic sentinel (shared TEST_FRONT_ID); playerId is
   *   PG gen_random_uuid(). The ring content is caller-controlled (no Math.random).
   * Zero-regression: does NOT mutate any laundering, reputation, or insurance row.
   * R2.2: TEST-ONLY. The ring contents + chi-square are server-only scalars.
   * OQ-10: ring stores digits 1..9 (column type `jsonb` array of integers).
   * Idempotent: the DELETE-then-INSERT pattern mirrors seed-ledger-ring (W6a C2, migration 0142 —
   *   `player_id` is DB-immutable post-INSERT, so a reseed of the shared sentinel PK deletes the prior
   *   row instead of UPSERT-reassigning it). TEST-ONLY: reassignment would be wrong in production
   *   anyway (a front has a fixed owner) — this is a pure isolation mechanism for back-to-back runs.
   */
  @Post('_test/forensic/seed-ring-digits')
  async seedRingDigits(@Body() body: SeedRingDigitsBody): Promise<SeedRingDigitsResponse> {
    const { digits, captureEvents: shouldCapture } = body;
    if (!Array.isArray(digits) || digits.length === 0) {
      throw new HttpException('digits must be a non-empty array', HttpStatus.BAD_REQUEST);
    }
    if (!digits.every(d => Number.isInteger(d) && d >= 1 && d <= 9)) {
      throw new HttpException('all digits must be integers in 1..9', HttpStatus.BAD_REQUEST);
    }

    // 1. Create a fresh test account + player (mirrors C1/C6 pattern).
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    if (!accountRow) {
      throw new HttpException('Failed to create test account', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow.account_id,
        callsign: nextTestCallsign('frc7'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    if (!playerRow) {
      throw new HttpException('Failed to create test player', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const playerId = playerRow.player_id;
    const frontId = TEST_FRONT_ID;

    // C20 event-capture probe: register listeners before any tick is fired (so events from
    // the subsequent run-weekly-audit-tick call are captured in-process).
    if (shouldCapture) {
      this.registerEventCapture(playerId);
    }

    // 2. Reseed the ledger_entry_ring row with the provided digit array (shared sentinel PK).
    //    Ring is stored as JSONB (an array of ints 1..9).
    //    ring_head = digits.length (pointing past the last written digit — consistent with
    //    the FIFO semantics: head = next write position = current length while ring is filling).
    //
    //    W6a C2 (migration 0142): `player_id` is now DB-immutable post-INSERT (BEFORE UPDATE trigger)
    //    on both tables below. DELETE-then-INSERT (not UPSERT-reassign) — see seed-ledger-ring's
    //    docblock for the full rationale. [W6a C2 Deviation — implementation-notes.md §Deviations
    //    "C2 — trigger vs. shared-sentinel test fixtures".]
    await this.db.delete(ledgerEntryRing).where(eq(ledgerEntryRing.front_id, frontId));
    await this.db.insert(ledgerEntryRing).values({
      front_id: frontId,
      player_id: playerId,
      ring: digits as unknown as string, // Drizzle jsonb column accepts any JSON-serializable value.
      ring_head: digits.length,
      soft_flag_count: 0,
      last_chi_square: null,
      last_audit_tick: null,
      front_dark_until_tick: null,
    });

    // 3. Reseed the forensic_soft_flag_ring row (C8 dual-write prerequisite, shared sentinel PK).
    //    Seeds a fresh flag ring for this player's front — flag_ticks starts empty.
    //    The C8 recordSoftFlag will UPSERT into this table on each soft-flag fire.
    await this.db.delete(forensicSoftFlagRing).where(eq(forensicSoftFlagRing.front_id, frontId));
    await this.db.insert(forensicSoftFlagRing).values({
      front_id: frontId,
      player_id: playerId,
      // flag_ticks='[]'::jsonb (DB default — start fresh for each test run).
    });

    // 4. Return playerId + frontId + a deterministic precinctId (1) for C8 declaration_ledger assertion.
    //    precinctId=1 mirrors the BPD precinct-1 that recordSoftFlag writes to.
    //    The service writes to a specific precinctId derived from the frontId's geography — for the
    //    test, precinct 1 is used as the canonical test precinct (same constant used in recordSoftFlag).
    const precinctId = 1;
    return { playerId, frontId, precinctId };
  }

  /**
   * `POST /v1/_test/forensic/run-weekly-audit-tick` — C7 WEEKLY tick trigger (TEST-ONLY).
   *
   * Drives LeadingDigitAuditService.runWeeklyAuditTick(ctx, weekId) directly, without waiting
   * for the real WEEKLY/9 scheduler to fire.
   *
   * Body: { playerId: string, weekId: number }
   *
   * Simulates the CitySimTickContext with the minimum required fields:
   *   ctx.playerId = playerId (from body)
   *   ctx.gameMinute = weekId × WEEKLY_MINUTES (consistent with weekId derivation in
   *   forensic.module.ts onApplicationBootstrap: weekId = floor(gameMinute / WEEKLY_MINUTES))
   *   ctx.cadence = Cadence.WEEKLY (for audit tick — matches the real scheduler call)
   *
   * Returns { ticked: true } on success.
   *
   * Anti-fabrication: hits the real LeadingDigitAuditService → real PG ring row.
   * R2.2: TEST-ONLY. last_chi_square is a server-only scalar — asserted only via read-ledger-ring.
   * OQ-7: same weekId 2× → idempotent (second call is a no-op per ring).
   * No Math.random.
   */
  @Post('_test/forensic/run-weekly-audit-tick')
  async runWeeklyAuditTick(@Body() body: RunWeeklyAuditTickBody): Promise<RunWeeklyAuditTickResponse> {
    const { playerId, weekId } = body;
    if (!playerId) {
      throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    }
    if (!Number.isInteger(weekId) || weekId < 0) {
      throw new HttpException('weekId must be a non-negative integer', HttpStatus.BAD_REQUEST);
    }

    // Simulate the CitySimTickContext (mirrors the real WEEKLY/9 scheduler context).
    // gameMinute = weekId × WEEKLY_MINUTES is consistent with how the module derives weekId:
    //   weekId = floor(ctx.gameMinute / WEEKLY_MINUTES) → weekId × WEEKLY_MINUTES round-trips.
    const WEEKLY_MINUTES = 7 * 24 * 60; // 10080 game-minutes per in-game week
    const ctx: CitySimTickContext = {
      playerId,
      cadence: Cadence.WEEKLY,
      gameMinute: weekId * WEEKLY_MINUTES,
    };

    await this.leadingDigitAudit.runWeeklyAuditTick(ctx, weekId);
    return { ticked: true };
  }

  // ── C8 Routes ─────────────────────────────────────────────────────────────────────────────────

  /**
   * `GET /v1/_test/forensic/read-soft-flag-ring?playerId=<uuid>` — C8 windowed counter proof (TEST-ONLY).
   *
   * Reads the forensic_soft_flag_ring row for the test player (front_id = TEST_FRONT_ID).
   * Returns { front_id, player_id, flag_ticks } — the JSONB array of tick integers.
   * The C8 E2E asserts flag_ticks.length = 1 after a UNIFORM ring fires (FALSIFIABLE).
   * The C8 E2E asserts flag_ticks.length = 0 after a BENFORD ring does NOT fire (both-ways).
   *
   * R2.2: TEST-ONLY (not registered in production). Raw ring state for DB assertion.
   * OQ-4: flag_ticks is the authoritative 3-in-60d windowed counter (not soft_flag_count which is cumulative).
   * Anti-fabrication: no Math.random. Returns empty ring (flag_ticks=[]) if the row has no ticks yet.
   */
  @Get('_test/forensic/read-soft-flag-ring')
  async readSoftFlagRing(
    @Query('playerId') playerId: string,
  ): Promise<ReadSoftFlagRingResponse> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }

    const frontId = TEST_FRONT_ID;
    const rows = await this.db
      .select()
      .from(forensicSoftFlagRing)
      .where(
        and(
          eq(forensicSoftFlagRing.front_id, frontId),
          eq(forensicSoftFlagRing.player_id, playerId),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row) {
      // No ring row yet (hasn't fired) — return empty flag_ticks.
      return { front_id: frontId, player_id: playerId, flag_ticks: [] };
    }

    const flagTicks = Array.isArray(row.flag_ticks) ? (row.flag_ticks as number[]) : [];
    return {
      front_id: row.front_id,
      player_id: row.player_id,
      flag_ticks: flagTicks,
    };
  }

  /**
   * `GET /v1/_test/forensic/read-declaration-ledger?playerId=<uuid>&precinctId=<int>` — C8 BPD memory proof (TEST-ONLY).
   *
   * Reads the declaration_ledger JSONB ring from precinct_memory for the given player + precinct.
   * Returns { ledger: DeclarationEntry[] } — the JSONB ring of all declaration entries.
   * The C8 E2E asserts at least one entry has declaration_type='forensic_benford_soft_flag' after UNIFORM fire.
   * The C8 E2E asserts NO such entry after a BENFORD-conform ring does NOT fire (both-ways).
   *
   * R2.2: TEST-ONLY (not registered in production). Raw BPD server-internal state for DB assertion.
   * Anti-fabrication: no Math.random. Returns empty ledger if no precinct_memory row exists yet.
   */
  @Get('_test/forensic/read-declaration-ledger')
  async readDeclarationLedger(
    @Query('playerId')   playerId: string,
    @Query('precinctId') precinctIdStr: string,
  ): Promise<ReadDeclarationLedgerResponse> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    const precinctId = parseInt(precinctIdStr, 10);
    if (!Number.isInteger(precinctId) || precinctId < 1) {
      throw new HttpException('precinctId must be a positive integer', HttpStatus.BAD_REQUEST);
    }

    const rows = await this.db
      .select({ declaration_ledger: precinctMemory.declaration_ledger })
      .from(precinctMemory)
      .where(
        and(
          eq(precinctMemory.player_id, playerId),
          eq(precinctMemory.precinct_id, precinctId),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row || row.declaration_ledger == null) {
      // No precinct_memory row yet → empty ledger (the BENFORD-conform path creates no row).
      return { ledger: [] };
    }

    const ledger = Array.isArray(row.declaration_ledger)
      ? (row.declaration_ledger as Record<string, unknown>[])
      : [];
    return { ledger };
  }

  // ── C9 Routes ─────────────────────────────────────────────────────────────────────────────

  /**
   * `POST /v1/_test/forensic/seed-soft-flag-ring` — C9 hard-audit test fixture (TEST-ONLY).
   *
   * Creates a fresh test account + player; UPSERTs a `forensic_soft_flag_ring` row with
   * `flag_ticks = flagTicks` (the provided weekIds verbatim, no FIFO); UPSERTs a
   * `ledger_entry_ring` row (fresh, `front_dark_until_tick = null`); seeds an
   * `economy_states` row with `cash_cents = walletCents` for the new player.
   *
   * Body: { flagTicks: number[] (weekIds), walletCents: number }
   * Returns: { playerId, frontId }
   *
   * Anti-fabrication: frontId is the deterministic sentinel TEST_FRONT_ID (shared).
   *   playerId is PG gen_random_uuid(). No Math.random.
   * Idempotent: DELETE-then-INSERT handles the shared sentinel PK across 2× back-to-back runs
   *   (mirrors seed-ring-digits — W6a C2, migration 0142: `player_id` is DB-immutable post-INSERT,
   *   so a reseed deletes the prior row instead of UPSERT-reassigning it).
   * DD-FLAGTICK-UNIT: flagTicks are weekIds (integers), NOT game-ticks.
   * Zero-regression: does NOT mutate any laundering, insurance, or reputation row.
   * R2.2: TEST-ONLY (not registered in production).
   */
  @Post('_test/forensic/seed-soft-flag-ring')
  async seedSoftFlagRing(
    @Body() body: { flagTicks: number[]; walletCents: number },
  ): Promise<{ playerId: string; frontId: string }> {
    const { flagTicks, walletCents } = body;
    if (!Array.isArray(flagTicks)) {
      throw new HttpException('flagTicks must be an array of integers (weekIds)', HttpStatus.BAD_REQUEST);
    }
    if (!Number.isFinite(walletCents) || walletCents < 0) {
      throw new HttpException('walletCents must be a non-negative number', HttpStatus.BAD_REQUEST);
    }

    // 1. Create a fresh test account + player (mirrors C7 seed-ring-digits pattern).
    const [accountRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    if (!accountRow) {
      throw new HttpException('Failed to create test account', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow.account_id,
        callsign: nextTestCallsign('frc9'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    if (!playerRow) {
      throw new HttpException('Failed to create test player', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const playerId = playerRow.player_id;
    const frontId = TEST_FRONT_ID;

    // 2. Reseed ledger_entry_ring — fresh row, front_dark_until_tick = null (shared sentinel PK).
    //    W6a C2 (migration 0142): `player_id` is DB-immutable post-INSERT (BEFORE UPDATE trigger) —
    //    DELETE-then-INSERT instead of UPSERT-reassign (see seed-ledger-ring's docblock for the full
    //    rationale). [W6a C2 Deviation — implementation-notes.md §Deviations "C2 — trigger vs.
    //    shared-sentinel test fixtures".]
    await this.db.delete(ledgerEntryRing).where(eq(ledgerEntryRing.front_id, frontId));
    await this.db.insert(ledgerEntryRing).values({
      front_id: frontId,
      player_id: playerId,
      ring: [] as unknown as string,
      ring_head: 0,
      soft_flag_count: 0,
      last_chi_square: null,
      last_audit_tick: null,
      front_dark_until_tick: null,
    });

    // 3. Reseed forensic_soft_flag_ring with the provided weekIds verbatim (shared sentinel PK).
    //    DD-FLAGTICK-UNIT: flag_ticks stores weekIds (NOT game-ticks). No FIFO — direct seed.
    await this.db.delete(forensicSoftFlagRing).where(eq(forensicSoftFlagRing.front_id, frontId));
    await this.db.insert(forensicSoftFlagRing).values({
      front_id: frontId,
      player_id: playerId,
      flag_ticks: flagTicks as unknown as string,
    });

    // 4. Seed economy_states with the provided walletCents.
    //    Mirrors §4.1 insurance test seeding (INSERT … ON CONFLICT DO UPDATE).
    //    cash_cents is bigint in the schema.
    await this.db
      .insert(economyState)
      .values({
        player_id: playerId,
        cash_cents: BigInt(Math.round(walletCents)),
      })
      .onConflictDoUpdate({
        target: economyState.player_id,
        set: {
          cash_cents: BigInt(Math.round(walletCents)),
        },
      });

    return { playerId, frontId };
  }

  /**
   * `POST /v1/_test/forensic/trigger-hard-audit-check` — C9 production-path hard-audit trigger (TEST-ONLY).
   *
   * Mimics the production caller path in `recordSoftFlag`: first checks
   * `countSoftFlagsInWindow(frontId, currentTick, benfordHardAuditWindowDays) >= benfordHardAuditSoftflagsCount`
   * and only calls `triggerHardAudit` if the threshold is met.
   *
   * This is the TEST seam for the hard-audit consequence (cash seizure + front dark).
   * It proves BOTH-WAYS: fires when count >= threshold; does NOT fire when count < threshold or flags are
   * outside the window. The dispatcher route for the production async path lands at C22.
   *
   * Body: { playerId: string; frontId: string; currentTick: number }
   * Returns: { triggered: boolean } — true if hard audit fired, false if count below threshold.
   *
   * DD-FLAGTICK-UNIT: currentTick is a game-tick (game-minute), NOT a weekId.
   *   countSoftFlagsInWindow derives currentWeekId = floor(currentTick / WEEKLY_MINUTES) internally.
   * Anti-fabrication: calls the real repository + real service → real PG writes (no mock).
   * Zero-regression: only fires when count threshold is met.
   * R2.2: TEST-ONLY (not registered in production).
   */
  @Post('_test/forensic/trigger-hard-audit-check')
  async triggerHardAuditCheck(
    @Body() body: { playerId: string; frontId: string; currentTick: number },
  ): Promise<{ triggered: boolean }> {
    const { playerId, frontId, currentTick } = body;
    if (!playerId) throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    if (!frontId)  throw new HttpException('frontId required', HttpStatus.BAD_REQUEST);
    if (!Number.isFinite(currentTick) || currentTick < 0) {
      throw new HttpException('currentTick must be a non-negative number', HttpStatus.BAD_REQUEST);
    }

    // Mimic the production caller in recordSoftFlag: count check BEFORE calling triggerHardAudit.
    // Uses the same tunables as the production path (benfordHardAuditWindowDays + benfordHardAuditSoftflagsCount).
    const count = await this.forensicRepository.countSoftFlagsInWindow(
      frontId,
      currentTick,
      forensicTunables.benfordHardAuditWindowDays,
    );

    if (count >= forensicTunables.benfordHardAuditSoftflagsCount) {
      await this.leadingDigitAudit.triggerHardAudit(playerId, frontId, currentTick);
      return { triggered: true };
    }

    return { triggered: false };
  }

  /**
   * `GET /v1/_test/forensic/read-wallet?playerId=<uuid>` — C9 wallet read (TEST-ONLY).
   *
   * Returns the player's current `economy_states.cash_cents` value.
   * The E2E uses this to assert (a) seizure magnitude after hard-audit fires, and
   * (b) no second debit on the single-fire guard path.
   *
   * Returns: { cents: string | number } — bigint serialized as string for JSON safety.
   *
   * Anti-fabrication: reads the real PG row (no mock).
   * R2.2: TEST-ONLY (not registered in production). Raw server state for DB assertion.
   */
  @Get('_test/forensic/read-wallet')
  async readWallet(
    @Query('playerId') playerId: string,
  ): Promise<{ cents: string }> {
    if (!playerId) {
      throw new HttpException('playerId query param required', HttpStatus.BAD_REQUEST);
    }

    const rows = await this.db
      .select({ cash_cents: economyState.cash_cents })
      .from(economyState)
      .where(eq(economyState.player_id, playerId))
      .limit(1);

    if (!rows[0]) {
      // No economy_states row → player has no wallet (likely not seeded).
      throw new HttpException(`No economy_states row for player ${playerId}`, HttpStatus.NOT_FOUND);
    }

    // BigInt → string for JSON safety.
    return { cents: String(rows[0].cash_cents) };
  }

    // ── C12 Routes ─────────────────────────────────────────────────────────────────────────────────

  /**
   * `POST /v1/_test/forensic/record-throughput` — C12 throughput accumulation probe (TEST-ONLY).
   *
   * Drives EffluentStoichiometryService.recordWorkshopThroughput directly.
   * Body: { playerId: string; workshopId: string; substanceType: string; kg: number; gameMinute: number }
   * Returns { recorded: true }.
   *
   * Anti-fabrication: hits the real EffluentStoichiometryService → real PG workshop row.
   * Zero-regression: does NOT touch any cook_session / product_storage row.
   * R2.2: TEST-ONLY (not registered in production). throughput_kg_window is server-only.
   * No Math.random.
   */
  @Post('_test/forensic/record-throughput')
  async recordThroughput(
    @Body() body: { playerId: string; workshopId: string; substanceType: string; kg: number; gameMinute: number },
  ): Promise<{ recorded: boolean }> {
    const { playerId, workshopId, substanceType, kg, gameMinute } = body;
    if (!playerId) throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    if (!workshopId) throw new HttpException('workshopId required', HttpStatus.BAD_REQUEST);
    if (!substanceType || !['brindle', 'crick', 'hush', 'ash'].includes(substanceType)) {
      throw new HttpException('substanceType must be one of: brindle, crick, hush, ash', HttpStatus.BAD_REQUEST);
    }
    if (!Number.isFinite(kg) || kg <= 0) {
      throw new HttpException('kg must be a positive number', HttpStatus.BAD_REQUEST);
    }
    if (!Number.isFinite(gameMinute) || gameMinute < 0) {
      throw new HttpException('gameMinute must be a non-negative number', HttpStatus.BAD_REQUEST);
    }
    await this.effluentStoichiometry.recordWorkshopThroughput(playerId, workshopId, substanceType, kg, gameMinute);
    return { recorded: true };
  }

  /**
   * `GET /v1/_test/forensic/read-workshop-state?playerId=<uuid>` — C12 throughput state probe (TEST-ONLY).
   *
   * Reads the workshop_stoichiometry_state row for the first workshop owned by the given player.
   * Returns { workshop: row | null }.
   * throughput_kg_window is the rolling window of { day, kg } entries.
   *
   * R2.2: TEST-ONLY (not registered in production). Raw row for DB assertion only.
   * No Math.random.
   */
  @Get('_test/forensic/read-workshop-state')
  async readWorkshopState(
    @Query('playerId') playerId: string,
  ): Promise<{ workshop: Record<string, unknown> | null }> {
    if (!playerId) {
      throw new HttpException('playerId query param required', HttpStatus.BAD_REQUEST);
    }
    const { workshop } = await this.forensicRepository.readEffluentState(playerId);
    return {
      workshop: serializeRow(workshop as Record<string, unknown> | null),
    };
  }

  // ── C13 Routes ─────────────────────────────────────────────────────────────────────────────────

  /**
   * `POST /v1/_test/forensic/update-block-register` — C13 block register aggregation probe (TEST-ONLY).
   *
   * Drives EffluentStoichiometryService.updateBlockEffluentRegister(playerId, blockId) directly.
   * Body: { playerId: string; blockId: number }
   * Returns { updated: true }.
   *
   * This triggers the C13 aggregation: sums all workshop_stoichiometry_state rows for the block →
   * applies kg × (solvent/vapour/water)_out_per_kg from recipe_stoichiometry_table →
   * writes the rolling effluent_window to block_effluent_register.
   *
   * Anti-fabrication: hits the real EffluentStoichiometryService → real PG block register row.
   * Zero-regression: does NOT touch any cook_session / product_storage / ledger_entry_ring row.
   * R2.2: TEST-ONLY (not registered in production). effluent_window is server-only.
   * No Math.random.
   */
  @Post('_test/forensic/update-block-register')
  async updateBlockRegister(
    @Body() body: { playerId: string; blockId: number },
  ): Promise<{ updated: boolean }> {
    const { playerId, blockId } = body;
    if (!playerId) throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    if (typeof blockId !== 'number' || !Number.isInteger(blockId)) {
      throw new HttpException('blockId must be an integer', HttpStatus.BAD_REQUEST);
    }
    await this.effluentStoichiometry.updateBlockEffluentRegister(playerId, blockId);
    return { updated: true };
  }

  /**
   * `GET /v1/_test/forensic/read-block-register?playerId=<uuid>` — C13 block register probe (TEST-ONLY).
   *
   * Reads the block_effluent_register row for the first block owned by the given player.
   * Returns { blockRegister: row | null }.
   * effluent_window is the JSONB array of { day, solvent, vapour, water } entries.
   *
   * The C13 E2E asserts the sums Σ kg × recipe coefficient per channel (FALSIFIABLE).
   *
   * R2.2: TEST-ONLY (not registered in production). Raw row for DB assertion only.
   *   baseline_effluent + last_deviation are server-only scalars — never client-projected.
   * No Math.random.
   */
  @Get('_test/forensic/read-block-register')
  async readBlockRegister(
    @Query('playerId') playerId: string,
  ): Promise<{ blockRegister: Record<string, unknown> | null }> {
    if (!playerId) {
      throw new HttpException('playerId query param required', HttpStatus.BAD_REQUEST);
    }
    const row = await this.forensicRepository.readBlockRegister(playerId);
    return {
      blockRegister: serializeRow(row as Record<string, unknown> | null),
    };
  }

  /**
   * `POST /v1/_test/forensic/seed-lab-building` — C13 production-path proof (TEST-ONLY).
   *
   * Creates a fresh test player + account row, then inserts a `buildings` row at a deterministic
   * block_id WITHOUT inserting any workshop_stoichiometry_state row. This simulates the
   * production lazy-create path: a cook's lab building exists in the `buildings` table but has
   * never been used as a workshop (no workshop_stoichiometry_state row exists yet).
   *
   * The test then calls record-throughput with the returned buildingId — the production hot-path
   * must derive block_id from buildings.block_id (not default to 0).
   *
   * Returns { playerId, buildingId, blockId } so the E2E can assert block_id enrichment.
   *
   * Anti-fabrication: no Math.random. buildingId is PG gen_random_uuid() (defaultRandom in schema).
   *   blockId is a deterministic sentinel (TEST_LAB_BLOCK_ID = 7, distinct from TEST_BLOCK_ID=1001).
   * R2.2: TEST-ONLY (not registered in production).
   */
  @Post('_test/forensic/seed-lab-building')
  async seedLabBuilding(): Promise<{ playerId: string; buildingId: string; blockId: number }> {
    // Sentinel block id for the production-path test — distinct from TEST_BLOCK_ID (1001)
    // so the two test paths cannot cross-contaminate.
    const TEST_LAB_BLOCK_ID = 7;

    // 1. Create a fresh test account + player.
    const [accountRow] = await this.db
      .insert(account)
      .values({
        kind: 'PLAYER',
        lifecycle_state: 'ACTIVE',
      })
      .returning({ account_id: account.account_id });
    if (!accountRow) {
      throw new HttpException('Failed to create test account', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow.account_id,
        callsign: nextTestCallsign('frc-lab'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    if (!playerRow) {
      throw new HttpException('Failed to create test player', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const playerId = playerRow.player_id;

    // 2. Insert a buildings row for the lab (the building that will be used as workshopId).
    //    block_id = TEST_LAB_BLOCK_ID (7) — what recordWorkshopThroughput must derive.
    //    building_type = 2 (cook lab stub — logical FK, no DB validation).
    //    No workshop_stoichiometry_state row is inserted — the lazy-create path is tested.
    const [buildingRow] = await this.db
      .insert(building)
      .values({
        player_id: playerId,
        block_id: TEST_LAB_BLOCK_ID,
        building_type: 2,         // cook lab stub (logical FK — no DB validation)
        ownership: 'player',
        structural_state: 'operational',
      })
      .returning({ building_id: building.building_id });
    if (!buildingRow) {
      throw new HttpException('Failed to create lab building', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return {
      playerId,
      buildingId: buildingRow.building_id,
      blockId: TEST_LAB_BLOCK_ID,
    };
  }

  // ── C10 Routes ─────────────────────────────────────────────────────────────────────────────────

  /**
   * `POST /v1/_test/forensic/assign-bookkeeper` — C10 Bookkeeper noise-injection setup (TEST-ONLY).
   *
   * Assigns a BOOKKEEPER lieutenant (role_id=BOOKKEEPER_ROLE_ID) to `frontId` by inserting a
   * behavior_script row + lieutenant row with `assigned_building_id = frontId`. This simulates the
   * production recruit + assign flow in one direct DB insert, bypassing `validateAssignment` (which
   * would require a real building row in the operational_chain tables).
   *
   * After this call, `BookkeeperLieutenantService.injectStructurallyRealisticNoise(playerId, frontId, ...)`
   * will find the lieutenant row and activate the Benford noise-injection path.
   *
   * Body: { playerId: string, frontId: string }
   * Returns: { lieutenantId: string }
   *
   * Idempotent-ish: each call inserts a NEW lieutenant + behavior_script. For back-to-back runs,
   * the `seed-ledger-ring` UPSERT resets the player (new playerId), so the old lieutenant is
   * garbage-collected by the FK cascade on player delete.
   *
   * Anti-fabrication: no Math.random; playerId/frontId from the caller (test-provided).
   * R2.2: TEST-ONLY (not registered in production).
   * OQ-1/DIV-1: the EXISTING BOOKKEEPER archetype (role_id=3) gets a NEW capability on a front.
   */
  @Post('_test/forensic/assign-bookkeeper')
  async assignBookkeeper(
    @Body() body: { playerId: string; frontId: string },
  ): Promise<{ lieutenantId: string }> {
    const { playerId, frontId } = body;
    if (!playerId || !frontId) {
      throw new HttpException('playerId and frontId required in body', HttpStatus.BAD_REQUEST);
    }

    // 1. Insert a buildings row for the frontId (required FK for lieutenant.assigned_building_id).
    //    The TEST_FRONT_ID sentinel is not a real building, so we insert a stub row.
    //    ON CONFLICT DO NOTHING: safe for 2× back-to-back calls on the shared sentinel PK.
    //    The building_type integer is a logical FK to the building_type enum (applicative —
    //    no DB table for building_type). We use 1 as the stub value (front_shop = type 1 per
    //    GDD L238 convention; the test only needs the FK to exist, not the type to be checked).
    await this.db
      .insert(building)
      .values({
        building_id: frontId,
        player_id: playerId,
        block_id: 1,            // deterministic test block id (no FK in this table)
        building_type: 1,       // front_shop stub (logical FK — no DB validation)
        ownership: 'player',
        structural_state: 'operational',
      })
      .onConflictDoUpdate({
        target: building.building_id,
        set: {
          player_id: playerId,  // reassign to current test player on 2× back-to-back runs
          structural_state: 'operational',
        },
      });

    // 2. Create a behavior_script row (required FK for the lieutenant row).
    //    Mirrors the C3 seed-lifestyle-state pattern.
    const [scriptRow] = await this.db
      .insert(behaviorScript)
      .values({
        // All defaults: rules='{"rules":[]}', source='', valid=false, last_modified_by='system'.
      })
      .returning({ script_id: behaviorScript.script_id });
    if (!scriptRow) {
      throw new HttpException('Failed to create behavior_script for BOOKKEEPER', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // 3. Insert a BOOKKEEPER lieutenant (role_id=BOOKKEEPER_ROLE_ID) with assigned_building_id=frontId.
    //    This is the DB assignment that `BookkeeperLieutenantService.injectStructurallyRealisticNoise`
    //    queries to detect whether a BOOKKEEPER is protecting the front.
    //    NOT mode='delegated' — the delegation tick is irrelevant for C10 (noise-injection is inline).
    const [ltRow] = await this.db
      .insert(lieutenant)
      .values({
        player_id: playerId,
        role_id: BOOKKEEPER_ROLE_ID,  // 3 — BOOKKEEPER (cash custodian, captain-level)
        source: 'civilian',
        name: 'BookkeeperNoise',
        name_locale: 'en',
        behavior_script_id: scriptRow.script_id,
        assigned_building_id: frontId,  // OQ-1: front assignment → noise-injection path
        // Remaining columns: DB defaults (granted_role='advisory', mode='tasked', etc.)
      })
      .returning({ lieutenant_id: lieutenant.lieutenant_id });
    if (!ltRow) {
      throw new HttpException('Failed to create BOOKKEEPER lieutenant', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    this.logger.debug(
      `assign-bookkeeper: playerId=${playerId} frontId=${frontId} ` +
        `lieutenantId=${ltRow.lieutenant_id} role_id=${BOOKKEEPER_ROLE_ID} ` +
        `(BOOKKEEPER noise-injection capability, C10/OQ-1)`,
    );

    return { lieutenantId: ltRow.lieutenant_id };
  }

  // ── C14 Routes ──────────────────────────────────────────────────────────────────────────────────

  /**
   * `POST /v1/_test/forensic/run-inspector-scan` — C14 NIGHTLY/9 inspector scan probe (TEST-ONLY).
   *
   * Triggers `runEnvironmentalInspectorScan(ctx, dayId)` for the given player + day.
   * This is the direct production-path call that the NIGHTLY/9 scheduler fires.
   *
   * Body: { playerId: string; dayId: number }
   * Returns: { scanned: boolean }
   *
   * Idempotent per day: if last_scan_tick === dayId the block is skipped (no-op guard).
   * Anti-fabrication: routes through real EffluentStoichiometryService (no mocking).
   * R2.2: TEST-ONLY — not registered in production.
   * No Math.random: dayId is caller-supplied; baseline seed is SHA-256 (MarketRngService).
   */
  @Post('_test/forensic/run-inspector-scan')
  async runInspectorScan(
    @Body() body: { playerId: string; dayId: number },
  ): Promise<{ scanned: boolean }> {
    const { playerId, dayId } = body;
    if (!playerId) {
      throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    }
    if (!Number.isInteger(dayId) || dayId < 0) {
      throw new HttpException('dayId must be a non-negative integer', HttpStatus.BAD_REQUEST);
    }

    const DAILY_MINUTES = 1440;
    const ctx: CitySimTickContext = {
      playerId,
      cadence: Cadence.NIGHTLY,
      gameMinute: dayId * DAILY_MINUTES,
    };

    await this.effluentStoichiometry.runEnvironmentalInspectorScan(ctx, dayId);
    return { scanned: true };
  }

  // ── C23 Routes ─────────────────────────────────────────────────────────────────────────────────

  /**
   * `POST /v1/_test/forensic/drop-inspection-queue` — C23 MINOR-1 hoist test fixture (TEST-ONLY).
   *
   * Deletes the inspection_queues row for the given (playerId, districtId).
   * Used by the C23 MINOR-1 hoist test (Test 4) to simulate the "unseeded queue" scenario:
   * a flagged block whose inspection_queues row has not been lazy-seeded yet (queueState=null).
   *
   * Pre-MINOR-1 (emit inside queue guard): EffluentFlagDetected is NOT emitted when queueState=null
   *   → C23 subscriber never fires → no 'forensic_effluent_flag' declaration entry.
   * Post-MINOR-1 (emit hoisted above queue guard): EffluentFlagDetected fires on the FLAG decision,
   *   BEFORE the queue guard → C23 subscriber fires → 'forensic_effluent_flag' entry appears.
   *
   * Body: { playerId: string; districtId: number }
   * Returns: { dropped: boolean }
   *
   * Anti-fabrication: deletes from the real inspection_queues table (no mock).
   * R2.2: TEST-ONLY (not registered in production).
   * Zero-regression: no other table is modified.
   */
  @Post('_test/forensic/drop-inspection-queue')
  async dropInspectionQueue(
    @Body() body: { playerId: string; districtId: number },
  ): Promise<{ dropped: boolean }> {
    const { playerId, districtId } = body;
    if (!playerId) {
      throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    }
    if (!Number.isInteger(districtId) || districtId < 0) {
      throw new HttpException('districtId must be a non-negative integer', HttpStatus.BAD_REQUEST);
    }
    await this.db.execute(sql`
      DELETE FROM ${inspectionQueue}
      WHERE player_id = ${playerId}::uuid
        AND district_id = ${districtId}::int
    `);
    return { dropped: true };
  }

  // ── C16 Routes ─────────────────────────────────────────────────────────────────────────────────

  /**
   * `POST /v1/_test/forensic/populate-lifestyle` — C16 gap formula proof (TEST-ONLY).
   *
   * Creates a fresh test player + lieutenant row, then calls
   * `StandingGapHeatService.populateLifestyleState(playerId, lieutenantId, declaredCutCents,
   * visibleStandardIndex)` to:
   *   1. Convert index→cost: visible_standard_cost = visibleStandardIndex ×
   *        forensicTunables.standingGapVisibleStandardCentsPerIndex (DD-VISIBLE-STANDARD-COST).
   *   2. Compute gap = visible_standard_cost − declaredCutCents·(1−standingGapTypicalSavingsRate).
   *   3. UPSERT lifestyle_audit_state: stamp declared_cut_cents, visible_standard_index, last_gap.
   *
   * Returns { playerId, lieutenantId, lastGap } for the E2E read-lifestyle-state assertion.
   *
   * Both-ways FALSIFIABLE:
   *   (positive) visibleStandardIndex=9, declaredCutCents=100000 → gap = 90000 − 75000 = +15000
   *   (negative) visibleStandardIndex=9, declaredCutCents=200000 → gap = 90000 − 150000 = −60000
   *
   * Body: { declaredCutCents: number; visibleStandardIndex: number }
   * Returns: { playerId, lieutenantId, lastGap }
   *
   * Anti-fabrication:
   *   - No Math.random — playerId is PG gen_random_uuid(); declaredCutCents/visibleStandardIndex
   *     are caller-provided (test-controlled, deterministic).
   *   - index→cost conversion SOURCES forensicTunables.standingGapVisibleStandardCentsPerIndex
   *     (the getter), NOT an inline `× 10000` literal.
   *   - computeGap PURE (no DB, no Math.random inside the service method).
   * R2.2: TEST-ONLY (not registered in production). last_gap is server-only — raw DB read for assertion.
   * OQ-8: StandingGapHeatService is full greenfield (no prior lifestyle service extended).
   * DD-VISIBLE-STANDARD-COST: provisional linear model — reviewer⊥ ratifies provenance + range.
   * No Math.random.
   */
  @Post('_test/forensic/populate-lifestyle')
  async populateLifestyle(
    @Body() body: PopulateLifestyleBody,
  ): Promise<PopulateLifestyleResponse> {
    const { declaredCutCents, visibleStandardIndex, seedConsecutive, tailStartedTick, tailRampStage, seedQueueEntry, captureEvents: shouldCapture } = body;
    if (!Number.isFinite(declaredCutCents) || declaredCutCents < 0) {
      throw new HttpException('declaredCutCents must be a non-negative number', HttpStatus.BAD_REQUEST);
    }
    if (!Number.isInteger(visibleStandardIndex) || visibleStandardIndex < 0) {
      throw new HttpException('visibleStandardIndex must be a non-negative integer', HttpStatus.BAD_REQUEST);
    }
    if (!this.standingGapHeat) {
      throw new HttpException('StandingGapHeatService not available (C16 not yet wired)', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // 1. Create a fresh test account + player row.
    const [accountRow] = await this.db
      .insert(account)
      .values({
        kind: 'PLAYER',
        lifecycle_state: 'ACTIVE',
      })
      .returning({ account_id: account.account_id });
    if (!accountRow) {
      throw new HttpException('Failed to create test account', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const [playerRow] = await this.db
      .insert(player)
      .values({
        account_id: accountRow.account_id,
        callsign: nextTestCallsign('frc16'),
        tier: 1,
        active_branches: 1,
      })
      .returning({ player_id: player.player_id });
    if (!playerRow) {
      throw new HttpException('Failed to create test player', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const playerId = playerRow.player_id;

    // C20 event-capture probe: register listeners before tail-ramp advance is fired.
    if (shouldCapture) {
      this.registerEventCapture(playerId);
    }

    // 2. Create a behavior_script row + lieutenant row (FK prerequisite for lifestyle_audit_state).
    //    Mirrors C3 seed-lifestyle-state pattern.
    const [scriptRow] = await this.db
      .insert(behaviorScript)
      .values({
        // All defaults: rules='{"rules":[]}', source='', valid=false, last_modified_by='system'.
      })
      .returning({ script_id: behaviorScript.script_id });
    if (!scriptRow) {
      throw new HttpException('Failed to create behavior_script', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const [ltRow] = await this.db
      .insert(lieutenant)
      .values({
        player_id: playerId,
        role_id: 1,             // any valid role_id for test purposes (not BOOKKEEPER-specific here)
        source: 'civilian',
        name: 'GapTestLt',
        name_locale: 'en',
        behavior_script_id: scriptRow.script_id,
        // Remaining columns: DB defaults (granted_role='advisory', mode='tasked', etc.)
      })
      .returning({ lieutenant_id: lieutenant.lieutenant_id });
    if (!ltRow) {
      throw new HttpException('Failed to create test lieutenant', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const lieutenantId = ltRow.lieutenant_id;

    // 3. Call populateLifestyleState — computes the gap and stamps last_gap.
    //    This is the production-path call: index→cost via getter → computeGap → UPSERT row.
    await this.standingGapHeat.populateLifestyleState(
      playerId,
      lieutenantId,
      declaredCutCents,
      visibleStandardIndex,
    );

    // C17: seedConsecutive — if provided, force consecutive_flag_months to the given value.
    // This is the decrement test fixture knob: pre-seeds the counter WITHOUT running tick logic.
    // TEST-ONLY: never used in production paths. Clamped to [0, 32767] (smallint range).
    // Mirrors the pattern in seed-ring-digits where ring contents are directly seeded.
    if (seedConsecutive !== undefined && Number.isInteger(seedConsecutive) && seedConsecutive >= 0) {
      const clampedConsecutive = Math.min(Math.max(0, seedConsecutive), 32767);
      await this.db
        .update(lifestyleAuditState)
        .set({ consecutive_flag_months: clampedConsecutive })
        .where(eq(lifestyleAuditState.lieutenant_id, lieutenantId));
      this.logger.debug(
        `populate-lifestyle: seedConsecutive=${seedConsecutive} → consecutive_flag_months=${clampedConsecutive} ` +
          `(lieutenantId=${lieutenantId} playerId=${playerId} — C17 decrement fixture knob)`,
      );
    }

    // C18: tailStartedTick + tailRampStage — if provided, seed the tail state directly.
    // These knobs allow the C18 E2E to pre-seed a spawned tail without running runMonthlyTick.
    // tailStartedTick: game-minute when the tail was "spawned" (mirrors C17 ctx.gameMinute stamp).
    // tailRampStage: starting stage ('passive' for a freshly spawned tail, per canon :139).
    // TEST-ONLY: the production path sets these via runMonthlyTick (C17 spawn), not via this route.
    // Both are applied together in a single UPDATE to avoid partial-state inconsistency.
    if (tailStartedTick !== undefined || tailRampStage !== undefined) {
      const validStages: ReadonlyArray<string> = ['none', 'passive', 'tailing', 'subpoena'];
      if (tailRampStage !== undefined && !validStages.includes(tailRampStage)) {
        throw new HttpException(
          `tailRampStage must be one of: ${validStages.join(', ')}`,
          HttpStatus.BAD_REQUEST,
        );
      }
      if (tailStartedTick !== undefined && (!Number.isFinite(tailStartedTick) || tailStartedTick < 0)) {
        throw new HttpException(
          'tailStartedTick must be a non-negative number (game-minute)',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Build the Drizzle update set object. Both columns can be updated simultaneously.
      // tail_started_tick: bigint column → pass BigInt. tail_ramp_stage: pgEnum column.
      const tailUpdateSet: {
        tail_started_tick?: bigint;
        tail_ramp_stage?: 'none' | 'passive' | 'tailing' | 'subpoena';
      } = {};
      if (tailStartedTick !== undefined) {
        tailUpdateSet.tail_started_tick = BigInt(Math.round(tailStartedTick));
      }
      if (tailRampStage !== undefined) {
        tailUpdateSet.tail_ramp_stage = tailRampStage;
      }

      await this.db
        .update(lifestyleAuditState)
        .set(tailUpdateSet)
        .where(eq(lifestyleAuditState.lieutenant_id, lieutenantId));

      this.logger.debug(
        `populate-lifestyle: C18 tail seed — lieutenantId=${lieutenantId} playerId=${playerId} ` +
          `tailStartedTick=${tailStartedTick ?? 'unchanged'} tailRampStage=${tailRampStage ?? 'unchanged'} ` +
          `(C18 advance-tail-ramp fixture knob)`,
      );
    }

    // 4. Read back last_gap for the response (the E2E also reads via read-lifestyle-state).
    //    The gap formula: visible_standard_cost − declaredCutCents·(1−standingGapTypicalSavingsRate).
    const centsPerIndex = forensicTunables.standingGapVisibleStandardCentsPerIndex;
    const visibleStandardCost = visibleStandardIndex * centsPerIndex;
    const lastGap = this.standingGapHeat.computeGap(declaredCutCents, visibleStandardCost);

    // C19 extension: seed the inspection_queues row for (playerId, TEST_DISTRICT_ID=1) so that
    // advance-tail-ramp's C19 applyQueues emission has a queue row to write into.
    // Without this seed, listQueues returns [] and the C19 emission is a no-op (warn-and-skip).
    // Mirrors the C15 seed-effluent-state pattern (C15 also seeds the inspection_queues row).
    // Idempotent: ON CONFLICT DO NOTHING — safe for 2× back-to-back (leçon D2).
    await this.db.execute(sql`
      INSERT INTO ${inspectionQueue} (player_id, district_id, entries, length, processing_rate_per_day, budget_modifier)
      VALUES (${playerId}::uuid, ${TEST_DISTRICT_ID}::int, '[]'::jsonb, 0, 4, 0)
      ON CONFLICT DO NOTHING
    `);

    // C19 review⊥ IMPORTANT fix: if seedQueueEntry=true, write a pre-existing SCHEDULED entry
    // into the lifestyle player's district-1 queue row (the same row that advance-tail-ramp will
    // append a FORENSIC entry into). This makes the entries-preserved test genuinely falsifiable:
    // if applyQueues replaced (clobbered) instead of appended, the SCHEDULED entry would vanish
    // and the assertion would FAIL. The entry shape is the exact QueueEntry interface — no
    // fabricated fields. building_id=1001 is the sentinel used by push-queue-entry (consistent).
    if (seedQueueEntry === true) {
      const scheduledEntry: QueueEntry = {
        building_id: 1001,
        priority_bucket: 'LOW',
        age_in_ticks: 0,
        source: 'SCHEDULED',
        decay_accumulator: 0,
      };
      const scheduledEntries: QueueEntry[] = [scheduledEntry];
      await this.db.execute(sql`
        UPDATE ${inspectionQueue}
        SET entries = ${JSON.stringify(scheduledEntries)}::jsonb,
            length = 1
        WHERE player_id = ${playerId}::uuid AND district_id = ${TEST_DISTRICT_ID}::int
      `);
      this.logger.debug(
        `populate-lifestyle: seedQueueEntry=true — wrote SCHEDULED entry into (player=${playerId}, district=${TEST_DISTRICT_ID}) queue ` +
          `(C19 review⊥ IMPORTANT: entries-preserved clobber-guard test fixture)`,
      );
    }

    this.logger.debug(
      `populate-lifestyle: playerId=${playerId} lieutenantId=${lieutenantId} ` +
        `declaredCutCents=${declaredCutCents} visibleStandardIndex=${visibleStandardIndex} ` +
        `centsPerIndex=${centsPerIndex} cost=${visibleStandardCost} lastGap=${lastGap}` +
        (seedConsecutive !== undefined ? ` seedConsecutive=${seedConsecutive}` : '') +
        ` districtId=${TEST_DISTRICT_ID} (C19: inspection_queues row seeded for advance-tail-ramp emission)`,
    );

    return { playerId, lieutenantId, lastGap, districtId: TEST_DISTRICT_ID };
  }

  // ── C17 Routes ─────────────────────────────────────────────────────────────────────────────────

  /**
   * `POST /v1/_test/forensic/run-monthly-tick` — C17 monthly-tick trigger (TEST-ONLY).
   *
   * Triggers `StandingGapHeatService.runMonthlyTick(ctx, monthId)` for the given player + monthId.
   * This is the direct production-path call that the NIGHTLY/9 chain fires after
   * `runEnvironmentalInspectorScan` (DD-MONTHLY-ON-NIGHTLY, OQ-9).
   *
   * Body: { playerId: string, monthId: number }
   * Returns: { ticked: true }
   *
   * Idempotent per monthId: if last_month_id == monthId the update is a no-op (OQ-9).
   * Anti-fabrication: routes through the real StandingGapHeatService → real PG rows.
   * R2.2: consecutive_flag_months, tail_ramp_stage, last_month_id = server-only — asserted via
   *   read-lifestyle-state (TEST-ONLY route, not client-projected).
   * No Math.random.
   */
  @Post('_test/forensic/run-monthly-tick')
  async runMonthlyTick(@Body() body: RunMonthlyTickBody): Promise<RunMonthlyTickResponse> {
    const { playerId, monthId } = body;
    if (!playerId) {
      throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    }
    if (!Number.isInteger(monthId) || monthId < 0) {
      throw new HttpException('monthId must be a non-negative integer', HttpStatus.BAD_REQUEST);
    }
    if (!this.standingGapHeat) {
      throw new HttpException('StandingGapHeatService not available', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // Simulate the CitySimTickContext for the monthly tick.
    // gameMinute = monthId × daysPerMonth × DAILY_MINUTES — consistent with how forensic.module.ts
    // derives monthId: monthId = floor(dayId / daysPerMonth) = floor(gameMinute / DAILY_MINUTES / daysPerMonth).
    // This ensures tail_started_tick = ctx.gameMinute is a deterministic, non-zero game-minute.
    // No Math.random — deterministic from monthId.
    const DAILY_MINUTES = 1440; // game-minutes per in-game day (matches forensic.module.ts)
    const daysPerMonth = forensicTunables.daysPerMonth; // default 30, OQ-9

    const ctx: CitySimTickContext = {
      playerId,
      cadence: Cadence.NIGHTLY,
      gameMinute: monthId * daysPerMonth * DAILY_MINUTES,
    };

    await this.standingGapHeat.runMonthlyTick(ctx, monthId);
    return { ticked: true };
  }

  // ── C18 Routes ─────────────────────────────────────────────────────────────────────────────────

  /**
   * `POST /v1/_test/forensic/advance-tail-ramp` — C18 tail-ramp advance trigger (TEST-ONLY).
   *
   * Drives `StandingGapHeatService.advanceTailRamp(ctx, dayId)` directly, without waiting
   * for the real NIGHTLY/9 scheduler to fire.
   *
   * This is the TEST seam for the C18 tail-ramp stage advance. It proves:
   *   - passive→tailing→subpoena as game-days pass (FALSIFIABLE).
   *   - determinism: same dayId twice → same stage (no double-advance).
   *   - monotone non-decreasing: earlier dayId does NOT regress the stage.
   *   - no-op for all-none rows or fresh players with no lifestyle row.
   *
   * Body: { playerId: string, dayId: number }
   * Returns: { advanced: true }
   *
   * The simulated CitySimTickContext uses:
   *   ctx.playerId = playerId
   *   ctx.cadence = Cadence.NIGHTLY (matches FORENSIC_INSPECTOR_SCAN NIGHTLY/9)
   *   ctx.gameMinute = dayId × DAILY_MINUTES (consistent with NIGHTLY/9 derivation in forensic.module.ts)
   *   (Note: advanceTailRamp uses dayId × TICKS_PER_DAY internally — TICKS_PER_DAY=DAILY_MINUTES=1440.
   *    ctx.gameMinute is NOT used by advanceTailRamp — it uses dayId directly. Passed for DI shape.)
   *
   * Anti-fabrication: routes through the real StandingGapHeatService → real PG lifestyle rows.
   * R2.2: tail_ramp_stage is server-only — asserted via read-lifestyle-state (TEST-ONLY route).
   * No Math.random. dayId is caller-supplied (deterministic, game-time only).
   */
  @Post('_test/forensic/advance-tail-ramp')
  async advanceTailRamp(@Body() body: AdvanceTailRampBody): Promise<AdvanceTailRampResponse> {
    const { playerId, dayId, captureEvents: shouldCapture } = body;
    if (!playerId) {
      throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    }
    if (!Number.isInteger(dayId) || dayId < 0) {
      throw new HttpException('dayId must be a non-negative integer', HttpStatus.BAD_REQUEST);
    }
    if (!this.standingGapHeat) {
      throw new HttpException('StandingGapHeatService not available (C18 not yet wired)', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // C20 event-capture probe: register listeners if requested (the player may have registered
    // already via populate-lifestyle; this handles the case where advance-tail-ramp is called
    // with captureEvents but the seed route was not called with captureEvents).
    if (shouldCapture) {
      this.registerEventCapture(playerId);
    }

    // Simulate the CitySimTickContext for the NIGHTLY/9 tick.
    // gameMinute = dayId × DAILY_MINUTES — consistent with how forensic.module.ts derives dayId:
    //   dayId = floor(ctx.gameMinute / DAILY_MINUTES) → dayId × DAILY_MINUTES round-trips.
    // advanceTailRamp uses dayId directly (not ctx.gameMinute) — ctx is passed for DI shape only.
    const DAILY_MINUTES = 1440; // game-minutes per in-game day (RE-ANCHOR C18: TICKS_PER_DAY=1440)
    const ctx: CitySimTickContext = {
      playerId,
      cadence: Cadence.NIGHTLY,
      gameMinute: dayId * DAILY_MINUTES,
    };

    await this.standingGapHeat.advanceTailRamp(ctx, dayId);
    return { advanced: true };
  }

  // ── C21 Routes ─────────────────────────────────────────────────────────────────────────────────

  /**
   * `POST /v1/_test/forensic/push-queue-entry` — C21 QueueEntrySource += 'FORENSIC' probe (TEST-ONLY).
   *
   * Seeds a fresh test player + one inspection_queues row for TEST_DISTRICT_ID (district 1), then
   * writes a single QueueEntry with the requested source (and optional forensicKind + priorityBucket)
   * into the entries jsonb column via a direct UPDATE (mirrors the applyQueues pattern — atomic,
   * parameterized, no string interpolation in the SQL values).
   *
   * Body: { source: QueueEntrySource; forensicKind?: ForensicKind; priorityBucket?: PriorityBucket }
   * Returns: { playerId, districtId }
   *
   * Idempotent: each call creates a FRESH player (gen_random_uuid()) so 2× back-to-back runs don't
   * collide. The player row is not deleted — CASCADE on player removal cleans the inspection_queues row.
   *
   * Anti-fabrication: no Math.random — playerId from PG gen_random_uuid(); building_id is a fixed
   * deterministic sentinel (1001). The test only asserts the source + forensic_kind round-trip.
   *
   * R2.2: TEST-ONLY (not registered in production).
   * C21 decision: entries is jsonb; QueueEntrySource is a TS type only — NO DB enum/check. No migration 0074.
   *
   * C22 EXTENSION: adds `walletCents?: number` body param. When provided AND forensicKind='hard_audit',
   * seeds economy_states + ledger_entry_ring + forensic_soft_flag_ring rows for this player so that
   * the C22 dispatch-queue test route can drive the full hard_audit consequence (cash seizure + front dark).
   * The `InspectionQueueDispatcherService.onForensicEntryDispatched` for hard_audit queries
   * `ledger_entry_ring` by playerId to resolve `front_id` — so a ring row MUST exist before dispatch.
   * Anti-fabrication: TEST_FRONT_ID sentinel uuid (same as seed-ledger-ring — no Math.random).
   */
  @Post('_test/forensic/push-queue-entry')
  async pushQueueEntry(
    @Body() body: { source: QueueEntrySource; forensicKind?: ForensicKind; priorityBucket?: string; walletCents?: number },
  ): Promise<{ playerId: string; districtId: number }> {
    const { source, forensicKind, priorityBucket = 'LOW', walletCents } = body;

    if (!source) {
      throw new HttpException('source required', HttpStatus.BAD_REQUEST);
    }

    // 1. Create a fresh test account + player row (mirrors seed-ledger-ring pattern).
    //    nextTestCallsign provides a per-process monotone counter — no Math.random (banned).
    //    C22: prefix 'c22' used when forensicKind is hard_audit to distinguish in logs.
    const callsignPrefix = forensicKind === 'hard_audit' ? 'c22' : 'c21';
    const [acctRow] = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    if (!acctRow) {
      throw new HttpException('Failed to create test account', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const [playerRow] = await this.db
      .insert(player)
      .values({ account_id: acctRow.account_id, callsign: nextTestCallsign(callsignPrefix), tier: 1, active_branches: 1 })
      .returning({ player_id: player.player_id });
    if (!playerRow) {
      throw new HttpException('Failed to create test player', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const playerId = playerRow.player_id as string;
    const districtId = TEST_DISTRICT_ID; // deterministic sentinel: district 1

    // 2. Seed the inspection_queues row for (playerId, districtId) — empty entries initially.
    await this.db.execute(sql`
      INSERT INTO ${inspectionQueue} (player_id, district_id, entries, length, processing_rate_per_day, budget_modifier)
      VALUES (${playerId}::uuid, ${districtId}::int, '[]'::jsonb, 0, 4, 0)
      ON CONFLICT DO NOTHING
    `);

    // 3. C22 EXTENSION: when walletCents is provided AND forensicKind === 'hard_audit', seed
    //    the rows that InspectionQueueDispatcherService requires to route the hard_audit consequence:
    //    (a) economy_states — so triggerHardAudit has a wallet to seize from.
    //    (b) ledger_entry_ring — so the dispatcher can resolve front_id by playerId.
    //    (c) forensic_soft_flag_ring — so the single-fire guard read is unblocked (null dark-tick).
    //    Uses TEST_FRONT_ID sentinel (same deterministic sentinel as seed-ledger-ring, no Math.random).
    //
    //    W6a C2 (migration 0142): (b) and (c) below reseed the SAME TEST_FRONT_ID sentinel `player_id`
    //    is now DB-immutable post-INSERT for — DELETE-then-INSERT instead of UPSERT-reassign (see
    //    seed-ledger-ring's docblock for the full rationale). (a) is untouched — economy_states isn't
    //    one of the 4 tables migration 0142 protects. [W6a C2 Deviation — implementation-notes.md
    //    §Deviations "C2 — trigger vs. shared-sentinel test fixtures".]
    if (walletCents !== undefined && forensicKind === 'hard_audit') {
      // (a) economy_states — seed or reset the wallet.
      await this.db
        .insert(economyState)
        .values({
          player_id: playerId,
          cash_cents: BigInt(Math.round(walletCents)),
        })
        .onConflictDoUpdate({
          target: economyState.player_id,
          set: { cash_cents: BigInt(Math.round(walletCents)) },
        });

      // (b) ledger_entry_ring — seed with TEST_FRONT_ID.
      //     front_dark_until_tick NULL (the hard-audit must fire, not skip).
      //     The dispatcher queries WHERE player_id = playerId → finds this row → uses TEST_FRONT_ID.
      await this.db.delete(ledgerEntryRing).where(eq(ledgerEntryRing.front_id, TEST_FRONT_ID));
      await this.db.insert(ledgerEntryRing).values({
        front_id: TEST_FRONT_ID,
        player_id: playerId,
        // front_dark_until_tick defaults to null (DB default) — the hard-audit must fire, not skip.
      });

      // (c) forensic_soft_flag_ring — sibling row required by the triggerHardAudit reset path
      //     (it resets soft_flag_count on ledger_entry_ring.front_id — but reads forensicSoftFlagRing
      //     indirectly via recordSoftFlag callers in production). Seed with empty flag_ticks.
      await this.db.delete(forensicSoftFlagRing).where(eq(forensicSoftFlagRing.front_id, TEST_FRONT_ID));
      await this.db.insert(forensicSoftFlagRing).values({
        front_id: TEST_FRONT_ID,
        player_id: playerId,
        flag_ticks: [] as unknown as string,
      });

      this.logger.debug(
        `push-queue-entry C22 hard_audit: seeded wallet+ring for playerId=${playerId} walletCents=${walletCents} frontId=${TEST_FRONT_ID}`,
      );
    }

    // 4. Build the QueueEntry to write. forensic_kind is included only when present (FORENSIC source).
    //    No Math.random — building_id is a fixed deterministic sentinel (1001).
    const entry: QueueEntry = {
      building_id: 1001,
      priority_bucket: (priorityBucket as QueueEntry['priority_bucket']) ?? 'LOW',
      age_in_ticks: 0,
      source,
      decay_accumulator: 0,
      ...(forensicKind !== undefined ? { forensic_kind: forensicKind } : {}),
    };
    const entries = [entry];

    // 5. Write the single entry atomically via UPDATE (mirrors applyQueues batch-write pattern).
    //    JSON.stringify → ::jsonb cast — never string-interpolated. Parameterized bind params only.
    await this.db.execute(sql`
      UPDATE ${inspectionQueue}
      SET entries = ${JSON.stringify(entries)}::jsonb,
          length = 1
      WHERE player_id = ${playerId}::uuid AND district_id = ${districtId}::int
    `);

    this.logger.debug(
      `push-queue-entry: playerId=${playerId} districtId=${districtId} source=${source} forensicKind=${forensicKind ?? 'none'} priorityBucket=${priorityBucket} walletCents=${walletCents ?? 'none'} (C21/C22/OQ-6)`,
    );

    return { playerId, districtId };
  }

  /**
   * `POST /v1/_test/forensic/dispatch-queue` — C22 real-dispatch trigger probe (TEST-ONLY).
   *
   * Drives the REAL `InspectionQueueService.runDispatchTickForTest(playerId, gameMinute)` directly,
   * without waiting for the TWELVE_H/2 scheduler to fire. The dispatch loop runs Phase A/B/C for
   * the player's 18 districts — FORENSIC entries in Phase B emit `ForensicEntryDispatchedEvent`
   * on the CityEventBus, which wires to `InspectionQueueDispatcherService.onForensicEntryDispatched`
   * (via the `bus.onForensicEntryDispatched` subscriber registered in `ForensicSignalingModule`).
   * The §4.3 consequences fire immediately (synchronous bus + async IIFE wrapper in the module).
   *
   * Body: { playerId: string; gameMinute?: number }
   * Returns: { dispatched: true }
   *
   * Anti-fabrication: routes through the REAL `InspectionQueueService` → real PG writes, real
   * bus emissions, real `triggerHardAudit` / `emitHeatInjection` paths. No mock, no shortcut.
   * R2.2: TEST-ONLY (not registered in production).
   * No Math.random. gameMinute defaults to 0 (deterministic sentinel).
   *
   * IMPORTANT: call AFTER `push-queue-entry` so the FORENSIC entry is already in the queue.
   * The dispatch-queue route does NOT seed rows — it just drives the dispatch tick.
   *
   * C22 idempotence: for hard_audit, `triggerHardAudit` has a single-fire guard (front_dark_until_tick).
   * Running dispatch 2× on the same player after ONE hard_audit entry was pushed → the 2nd dispatch
   * finds an empty queue (entry was consumed in dispatch) → the subscriber is not called a 2nd time.
   * If the test pushes a NEW entry and dispatches again → the ring row now has front_dark_until_tick
   * set → the guard fires → no double-seizure. Both paths are assertable (the back-to-back test).
   */
  @Post('_test/forensic/dispatch-queue')
  async dispatchQueue(
    @Body() body: { playerId: string; gameMinute?: number; captureEvents?: boolean },
  ): Promise<{ dispatched: boolean }> {
    if (!body?.playerId) {
      throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    }
    if (!this.inspectionQueueService) {
      throw new HttpException('InspectionQueueService not available', HttpStatus.NOT_IMPLEMENTED);
    }

    const gameMinute = typeof body.gameMinute === 'number' ? body.gameMinute : 0;

    // C22: captureEvents — register the ForensicEntryDispatchedEvent capture BEFORE dispatch
    // so the event is captured as it fires synchronously in the bus dispatch loop.
    if (body.captureEvents) {
      this.registerEventCapture(body.playerId);
    }

    this.logger.debug(
      `dispatch-queue: playerId=${body.playerId} gameMinute=${gameMinute} captureEvents=${body.captureEvents ?? false} (C22 real-dispatch trigger)`,
    );

    await this.inspectionQueueService.runDispatchTickForTest(body.playerId, gameMinute);

    // C22 async-consequence drain: the InspectionQueueDispatcherService.onForensicEntryDispatched
    // is wired as a fire-and-forget Promise via the bus subscriber (insurance module pattern).
    // The dispatch tick emits the event synchronously, but the async consequence (triggerHardAudit /
    // emitHeatInjection) resolves in a subsequent microtask. This await drains the microtask queue
    // so the E2E test can immediately assert the DB trace (front_dark_until_tick / wallet debit)
    // without an additional HTTP poll loop.
    //
    // 200ms: conservative upper bound for a single triggerHardAudit DB round-trip on the local stack
    // (typical latency: <10ms). TEST-ONLY: the production bus subscriber is always fire-and-forget
    // (the non-test dispatch path does not block the tick on consequence completion — city sim cadence).
    await new Promise<void>((resolve) => setTimeout(resolve, 200));

    return { dispatched: true };
  }

  /**
   * `GET /v1/_test/forensic/read-inspection-queue` — C21 queue read-back probe (TEST-ONLY).
   *
   * Reads the inspection_queues row for (playerId, districtId) and returns the raw entries array
   * for DB assertion. Used by the C21 E2E to assert FORENSIC source + forensic_kind persist.
   *
   * Query: ?playerId=<uuid>&districtId=<int>
   * Returns: { entries: QueueEntry[] }
   *
   * R2.2: TEST-ONLY. Raw entries array for DB assertion (no projection — the raw jsonb content).
   */
  @Get('_test/forensic/read-inspection-queue')
  async readInspectionQueue(
    @Query('playerId') playerId: string,
    @Query('districtId') districtIdStr: string,
  ): Promise<{ entries: QueueEntry[] }> {
    if (!playerId) {
      throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    }
    const districtId = Number.parseInt(districtIdStr, 10);
    if (!Number.isFinite(districtId)) {
      throw new HttpException('districtId must be an integer', HttpStatus.BAD_REQUEST);
    }

    const rows = await this.db
      .select({ entries: inspectionQueue.entries })
      .from(inspectionQueue)
      .where(and(eq(inspectionQueue.player_id, playerId), eq(inspectionQueue.district_id, districtId)))
      .limit(1);

    const row = rows[0];
    const entries = Array.isArray(row?.entries) ? (row.entries as QueueEntry[]) : [];
    return { entries };
  }

  // ── C20 Routes ─────────────────────────────────────────────────────────────────────────────────

  /**
   * `GET /v1/_test/forensic/captured-events` — C20 event-capture probe (TEST-ONLY).
   *
   * Returns all events captured for the given playerId via the in-process event bus.
   * Used by forensic_events_bus.spec.ts to assert that emitX fired with correct shapes.
   *
   * Query: ?playerId=<uuid>
   * Returns: { events: Array<Record<string, unknown>> }
   * R2.2: TEST-ONLY.
   */
  @Get('_test/forensic/captured-events')
  async getCapturedEvents(
    @Query('playerId') playerId: string,
  ): Promise<{ events: Array<Record<string, unknown>> }> {
    if (!playerId) {
      throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    }
    const events = capturedEvents.get(playerId) ?? [];
    return { events };
  }

  /**
   * `POST /v1/_test/forensic/run-environmental-scan` — C14 inspector scan probe (TEST-ONLY).
   *
   * Drives `EffluentStoichiometryService.runEnvironmentalInspectorScan(ctx, dayId)` directly,
   * without waiting for the real NIGHTLY/9 scheduler to fire.
   *
   * Body: { playerId: string, dayId: number, captureEvents?: boolean }
   * Returns: { scanned: true }
   *
   * Anti-fabrication: routes through the real EffluentStoichiometryService → real PG rows.
   * R2.2: TEST-ONLY. Deviation scalar is server-only (asserted via event bus capture at C20).
   * No Math.random.
   */
  @Post('_test/forensic/run-environmental-scan')
  async runEnvironmentalScan(
    @Body() body: { playerId: string; dayId: number; captureEvents?: boolean },
  ): Promise<{ scanned: boolean }> {
    if (!body?.playerId) {
      throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    }
    if (!this.effluentStoichiometry) {
      throw new HttpException('EffluentStoichiometryService not available', HttpStatus.NOT_IMPLEMENTED);
    }
    if (body.captureEvents) {
      this.registerEventCapture(body.playerId);
    }
    const DAILY_MINUTES = 1440;
    const ctx: CitySimTickContext = {
      playerId: body.playerId,
      cadence: Cadence.NIGHTLY,
      gameMinute: body.dayId * DAILY_MINUTES,
    };
    await this.effluentStoichiometry.runEnvironmentalInspectorScan(ctx, body.dayId);
    return { scanned: true };
  }

  // ── C24 Routes ─────────────────────────────────────────────────────────────────────────────────

  /**
   * `GET /v1/_test/forensic/read-projection?playerId=<uuid>` — C24 R2.2 projection probe (TEST-ONLY).
   *
   * Returns the ForensicClientProjection for the given player.
   * The projection contains ONLY the 3 banded buckets (P5 wall, R2.2 canon :185):
   *   - audit_risk_bucket          (AuditRiskBucket — 'clean'|'watched'|'flagged'|'audited')
   *   - effluent_visibility_bucket (EffluentVisibilityBucket — 'clear'|'faint'|'visible'|'glaring')
   *   - lifestyle_alarm_bucket     (LifestyleAlarmBucket — 'quiet'|'noticed'|'watched'|'subpoenaed')
   *
   * NEVER exposes: last_chi_square, last_deviation, last_gap, front_dark_until_tick,
   *   soft_flag_count, or any other internal scalar (P5 wall — assert via E2E grep-zero).
   *
   * R2.2: TEST-ONLY route. The player-facing production endpoint (C25 scope) is NOT implemented here.
   *   This test probe routes directly to ForensicProjectionService.projectForensicState(playerId).
   *   The production controller will add auth + player-ownership guard.
   * Anti-fabrication: routes through the real ForensicProjectionService → real PG rows.
   * Zero-regression: read-only; no DB mutations.
   */
  @Get('_test/forensic/read-projection')
  async readProjection(
    @Query('playerId') playerId: string,
  ): Promise<ForensicClientProjection> {
    if (!playerId) {
      throw new HttpException('playerId query param required', HttpStatus.BAD_REQUEST);
    }
    if (!this.forensicProjection) {
      throw new HttpException('ForensicProjectionService not available', HttpStatus.NOT_IMPLEMENTED);
    }
    return this.forensicProjection.projectForensicState(playerId);
  }

  // ── W6a C2 Routes (authz remediation — ownership immutability) ──────────────────────────────────

  /**
   * `POST /v1/_test/forensic/record-soft-flag` — W6a C2 attack probe for `recordSoftFlag` (TEST-ONLY).
   *
   * Drives `LeadingDigitAuditService.recordSoftFlag(playerId, frontId, precinctId, tick)` DIRECTLY with
   * caller-supplied `playerId` + `frontId` — mirrors the existing `trigger-hard-audit-check` (C9) test
   * seam that exposes `triggerHardAudit` the same way. This is the E2E entry point for the C2 attack: a
   * `frontId` already owned by a DIFFERENT player exercises the D3.b ownership guard end-to-end (real
   * service call, real PG write attempt) without needing the production `POST /v1/admin/players/:id/
   * force-soft-flag` route's staff-role gate (an unrelated axis — W6a C2 is about the SERVICE-level
   * ownership predicate, not who is allowed to call the admin action).
   *
   * Body: { playerId: string, frontId: string, precinctId: number, tick: number }
   * Returns: { recorded: true } on success (front owned by playerId — the contrôle positif path).
   *
   * On a mismatched owner, `recordSoftFlag` throws `ApiError('RESOURCE_NOT_FOUND')` (D2) — this
   * propagates through the SAME GlobalExceptionFilter as every other route (no try/catch here), so the
   * E2E observes a real 404 `RESOURCE_NOT_FOUND`, not a synthetic probe response.
   *
   * Anti-fabrication: no Math.random. Calls the real service → real PG write (or real 404).
   * R2.2: TEST-ONLY (not registered in production).
   */
  @Post('_test/forensic/record-soft-flag')
  async recordSoftFlagTest(
    @Body() body: { playerId: string; frontId: string; precinctId: number; tick: number },
  ): Promise<{ recorded: true }> {
    const { playerId, frontId, precinctId, tick } = body;
    if (!playerId || !frontId) {
      throw new HttpException('playerId and frontId required', HttpStatus.BAD_REQUEST);
    }
    if (!Number.isInteger(precinctId) || precinctId < 1) {
      throw new HttpException('precinctId must be a positive integer', HttpStatus.BAD_REQUEST);
    }
    if (!Number.isInteger(tick) || tick < 0) {
      throw new HttpException('tick must be a non-negative integer', HttpStatus.BAD_REQUEST);
    }
    await this.leadingDigitAudit.recordSoftFlag(playerId, frontId, precinctId, tick);
    return { recorded: true };
  }

  /**
   * `POST /v1/_test/forensic/populate-lifestyle-existing` — W6a C2 attack probe for
   * `populateLifestyleState` (TEST-ONLY).
   *
   * Drives `StandingGapHeatService.populateLifestyleState(playerId, lieutenantId, declaredCutCents,
   * visibleStandardIndex)` DIRECTLY against an EXISTING `lieutenantId` — unlike `populate-lifestyle`
   * (C16), which ALWAYS creates a fresh player + lieutenant pair internally and therefore can never
   * reach the mismatched-owner branch. Mirrors `trigger-hard-audit-check`'s pass-through shape. This is
   * the E2E entry point for the C2 attack on `lifestyle_audit_state`: a `lieutenantId` already owned by
   * a DIFFERENT player exercises the D3.b ownership guard end-to-end.
   *
   * Body: { playerId: string, lieutenantId: string, declaredCutCents: number, visibleStandardIndex: number }
   * Returns: { populated: true } on success (lieutenant owned by playerId — the contrôle positif path).
   *
   * On a mismatched owner, `populateLifestyleState` throws `ApiError('RESOURCE_NOT_FOUND')` (D2) —
   * propagates through the SAME GlobalExceptionFilter (no try/catch here), so the E2E observes a real
   * 404 `RESOURCE_NOT_FOUND`.
   *
   * Anti-fabrication: no Math.random. Calls the real service → real PG write (or real 404).
   * R2.2: TEST-ONLY (not registered in production).
   */
  @Post('_test/forensic/populate-lifestyle-existing')
  async populateLifestyleExisting(
    @Body() body: { playerId: string; lieutenantId: string; declaredCutCents: number; visibleStandardIndex: number },
  ): Promise<{ populated: true }> {
    const { playerId, lieutenantId, declaredCutCents, visibleStandardIndex } = body;
    if (!playerId || !lieutenantId) {
      throw new HttpException('playerId and lieutenantId required', HttpStatus.BAD_REQUEST);
    }
    if (!Number.isFinite(declaredCutCents) || declaredCutCents < 0) {
      throw new HttpException('declaredCutCents must be a non-negative number', HttpStatus.BAD_REQUEST);
    }
    if (!Number.isInteger(visibleStandardIndex) || visibleStandardIndex < 0) {
      throw new HttpException('visibleStandardIndex must be a non-negative integer', HttpStatus.BAD_REQUEST);
    }
    if (!this.standingGapHeat) {
      throw new HttpException('StandingGapHeatService not available (C16 not yet wired)', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    await this.standingGapHeat.populateLifestyleState(playerId, lieutenantId, declaredCutCents, visibleStandardIndex);
    return { populated: true };
  }

  /**
   * `POST /v1/_test/forensic/attempt-ownership-mutation` — W6a C2 DB-immutability proof (TEST-ONLY).
   *
   * Attempts a DIRECT `UPDATE <table> SET player_id = $newPlayerId WHERE <pk> = $pkValue` on one of the
   * 4 tables migration 0142 protects. This BYPASSES `recordSoftFlag` / `populateLifestyleState`
   * entirely — it proves the DB-ENFORCED layer (the BEFORE UPDATE trigger, migration 0142), not the
   * app-layer predicate those two methods apply. A caller with unmediated write access (a future writer
   * that doesn't know about this constraint, an ops one-off query) is exactly what the trigger — not the
   * app-layer guard — exists to stop (D3.c).
   *
   * Body: { table: 'ledger_entry_ring' | 'forensic_soft_flag_ring' | 'workshop_stoichiometry_state' |
   *   'lifestyle_audit_state', pkValue: string, newPlayerId: string }
   * Returns: { blocked: true } when the trigger raised (the expected, correct outcome — this route maps
   *   it to a clean 200 response, never lets it surface as a 5xx, per D2/C2 §3 "violation de contrainte
   *   ⇒ 404, jamais 5xx" — here the whole POINT of the route is to observe the block, so the observable
   *   IS the 200 body, not an HTTP error status).
   * Returns: { blocked: false } if the UPDATE went through — a BROKEN migration. The E2E asserts
   *   `blocked === true` and fails loudly if this branch is ever reached.
   *
   * Table/column are resolved via a fixed switch over Drizzle table objects — never string-interpolated
   * into raw SQL (no injection surface), and the `table` body param cannot select an arbitrary table.
   *
   * R2.2: TEST-ONLY (not registered in production).
   */
  @Post('_test/forensic/attempt-ownership-mutation')
  async attemptOwnershipMutation(
    @Body()
    body: {
      table: 'ledger_entry_ring' | 'forensic_soft_flag_ring' | 'workshop_stoichiometry_state' | 'lifestyle_audit_state';
      pkValue: string;
      newPlayerId: string;
    },
  ): Promise<{ blocked: boolean }> {
    const { table, pkValue, newPlayerId } = body;
    if (!pkValue || !newPlayerId) {
      throw new HttpException('pkValue and newPlayerId required', HttpStatus.BAD_REQUEST);
    }
    try {
      switch (table) {
        case 'ledger_entry_ring':
          await this.db.update(ledgerEntryRing).set({ player_id: newPlayerId }).where(eq(ledgerEntryRing.front_id, pkValue));
          break;
        case 'forensic_soft_flag_ring':
          await this.db.update(forensicSoftFlagRing).set({ player_id: newPlayerId }).where(eq(forensicSoftFlagRing.front_id, pkValue));
          break;
        case 'workshop_stoichiometry_state':
          await this.db.update(workshopStoichiometryState).set({ player_id: newPlayerId }).where(eq(workshopStoichiometryState.workshop_id, pkValue));
          break;
        case 'lifestyle_audit_state':
          await this.db.update(lifestyleAuditState).set({ player_id: newPlayerId }).where(eq(lifestyleAuditState.lieutenant_id, pkValue));
          break;
        default:
          throw new HttpException(`Unknown table: ${table as string}`, HttpStatus.BAD_REQUEST);
      }
      // Reached only if the UPDATE succeeded — the trigger FAILED to block it (migration broken).
      return { blocked: false };
    } catch (e) {
      if (e instanceof HttpException) {
        throw e;
      }
      if (isOwnershipImmutableViolation(e)) {
        return { blocked: true };
      }
      throw e;
    }
  }
}
