// IMPLEMENTS: docs/superpowers/plans/2026-06-16-depth-d2-impl-plan.md Task R0 + Task R1 + Task R2a + Task R2b + Task R3a + Task R4a + Task R5a + Task R7a + Task R7b + Task R8a + Task R8b + Task R9 + Task R11 + Task R12b
//             Pattern: services/game-back/src/operational/market/market-test.controller.ts (R-EC-2)
//             — D2 R0 + R1 + R2a — 2026-06-17; D2 R2b — 2026-06-17; D2 R4a — 2026-06-17; D2 R5a — 2026-06-17; D2 R7a — 2026-06-17; D2 R7b — 2026-06-17; D2 R9 — 2026-06-17; D2 R11 — 2026-06-17; D2 R12b — 2026-06-17
//
// `ReputationTestController` — TEST-ONLY probe routes for R0 module-wiring + R1 persistence verification
// + R2a BossMirrorService mechanic operations + R2b weekly tick force-trigger + scalar reads
// + R3a declaration-ledger JSONB ring on precinct_memory + 2 Boss Mirror bus events.
//
// GATING: mounted ONLY when NODE_ENV !== 'production' (registered conditionally in
// ReputationModule — same pattern as MarketTestController / CitySimTestController).
// In production this controller is simply not registered → 404.
// The E2E compose stack runs NODE_ENV=development so routes are available.
//
// R0 Routes:
//   GET /v1/_test/reputation/ping — returns { ok: true } if the module is in the graph.
//     This is the SOLE R0 E2E assertion target: 404 = module NOT wired, 200 = wired.
//
// R1 Routes (persistence proof — DB upserts/reads, no mechanic logic):
//   POST /v1/_test/reputation/upsert-all-entities
//     { playerId, lieutenantId, counterpartyId, tileId, pairKey }
//     — upserts one row of each of the 6 reputation entities into the DB.
//     Returns { boss_mirror_violation_ring, boss_mirror_declaration_ledger,
//               restraint_dispute_ring, lek_memory_cell_state,
//               hidden_curriculum_norms_vector, forbidden_triad_pair_state }
//     with the upserted row data. TEST-ONLY — exposes server-side hidden state.
//
//   GET /v1/_test/reputation/read-entities
//     ?playerId=<id>&lieutenantId=<id>&counterpartyId=<id>&tileId=<n>&pairKey=<key>
//     — reads all 6 rows from the DB and returns them.
//     TEST-ONLY DB assertion surface.
//
// R2a Routes (BossMirrorService mechanic — TEST-ONLY):
//   POST /v1/_test/reputation/boss-mirror/declare-rule
//     { playerId, ruleId } — invokes BossMirrorService.declareRule().
//     Returns { ok: true } or { ok: false, reason: 'AT_CAP', cap, current }.
//
//   POST /v1/_test/reputation/boss-mirror/retract-rule
//     { playerId, ruleId } — invokes BossMirrorService.retractRule().
//     Returns { ok: true } or { ok: false, reason: 'NOT_FOUND' }.
//
//   POST /v1/_test/reputation/boss-mirror/record-violation
//     { lieutenantId, ruleId, severityBucket } — invokes BossMirrorService.recordViolation().
//     Returns { ok: true }.
//
//   GET /v1/_test/reputation/boss-mirror/ledger?playerId=<id>
//     — reads the raw boss_mirror_declaration_ledger row for DB assertion.
//     Returns { player_id, declared_rules, retraction_history } or null.
//     R2.2: declared_rules is the public observable; retraction_history is server-side.
//     NOTE: does NOT include consistency_index (that is a server-only scalar — separate R2b route).
//
//   GET /v1/_test/reputation/boss-mirror/ring?lieutenantId=<id>
//     — reads the raw boss_mirror_violation_ring row for DB assertion.
//     Returns { lieutenant_id, player_id, violation_slots, ring_head } or null.
//     R2.2: violation_slots is server-side private (never forwarded to real client).
//     NOTE: does NOT include violation_density / defection_tolerance (server-only scalars — separate R2b route).
//
// R2b Routes (Boss Mirror weekly tick force-trigger + scalar reads — TEST-ONLY):
//   POST /v1/_test/reputation/boss-mirror/force-weekly-tick
//     { playerId, weekId } — invokes BossMirrorService.runWeeklyTick() DIRECTLY.
//     Does NOT advance 7 game-days tick-by-tick (fast path for specs).
//     The real scheduler route fires via onApplicationBootstrap + Cadence.WEEKLY.
//     Returns { ok: true, weekId }.
//
//   GET /v1/_test/reputation/boss-mirror/tick-scalars?lieutenantId=<id>
//     — reads server-only derived scalars on the per-lieutenant ring row:
//     { lieutenant_id, violation_density, defection_tolerance, last_tick_week }.
//     R2.2: server-only — never forwarded to a real client.
//
//   GET /v1/_test/reputation/boss-mirror/consistency-index?playerId=<id>
//     — reads server-only consistency_index on the per-player ledger row:
//     { player_id, consistency_index, last_consistency_week }.
//     R2.2: server-only — never forwarded to a real client.
//
// R4a Routes (RestraintIndexService — TEST-ONLY):
//   POST /v1/_test/reputation/restraint/record-outcome
//     { playerId, counterpartyId, claimable, claimed }
//     — invokes RestraintIndexService.recordDisputeOutcome().
//     Returns { ok: true }.
//
// R4b Routes (DD-BRIDGE — TEST-ONLY):
//   POST /v1/_test/reputation/restraint/record-outcome-bridge
//     { playerId, counterpartyId, claimable, claimed, lieutenantId? }
//     — invokes RestraintIndexService.recordDisputeOutcome() with the optional lieutenantId
//       for the DD-BRIDGE breach-check (Restraint→Boss Mirror deterministic write).
//     Returns { ok: true }.
//
//   POST /v1/_test/reputation/restraint/force-weekly-tick
//     { playerId, weekId } — invokes RestraintIndexService.runWeeklyTick() DIRECTLY.
//     Does NOT advance 7 game-days tick-by-tick (fast path for specs).
//     Returns { ok: true, weekId }.
//
//   GET /v1/_test/reputation/restraint/ring?playerId=<id>&counterpartyId=<id>
//     — reads the full server-side ring state for DB assertion:
//     { dispute_slots, ring_head, restraint_ratio, offer_terms, wary_active,
//       collateral_amount, last_tick_week }
//     R2.2: server-only — never forwarded to real client.
//
//   GET /v1/_test/reputation/restraint/offer-terms?playerId=<id>&counterpartyId=<id>
//     — the CLIENT-FACING surface: calls computeOfferTerms() and returns
//     { offer_posture: 'standard' | 'wary', marginalia: string[] }
//     R2.2 invariant: NO raw restraint_ratio in this response.
//
// W6a C5 Routes (DD-MAGNITUDE-BOUND clamp-bound probes — TEST-ONLY, design §3/C5):
//   GET /v1/_test/reputation/boss-mirror/tunables-probe
//     — returns { severity_bucket_min, severity_bucket_max }, the LIVE registry values
//     `recordViolation` clamps `severityBucket` against. Read BEFORE/AFTER a tunable_overrides
//     flip to prove the clamp's bascule point moves with the registry (not a hardcoded constant).
//
//   GET /v1/_test/reputation/restraint/tunables-probe
//     — returns { claim_amount_min, claim_amount_max }, the LIVE registry values
//     `recordDisputeOutcome` clamps `claimable`/`claimed` against. Same sensitivity-test use as above.
//
// R3a Routes (declaration_ledger JSONB ring + 2 Boss Mirror bus events — TEST-ONLY):
//   POST /v1/_test/reputation/boss-mirror/emit-rule-declared
//     { playerId, ruleId, declarationType, gameMinute }
//     — emits a BossMirrorRuleDeclaredEvent on the CityEventBus (public signal, no ring write).
//     Returns the event payload for field-shape assertion.
//
//   POST /v1/_test/reputation/boss-mirror/emit-rule-retracted
//     { playerId, ruleId, declarationType, gameMinute }
//     — emits a BossMirrorRuleRetractedEvent on the CityEventBus (public signal, no ring write).
//     Returns the event payload for field-shape assertion.
//
//   POST /v1/_test/reputation/declaration-ledger/append
//     { playerId, precinctId, buildingId, declarationType, severity, sourceOriginId }
//     — appends a DeclarationEntry to precinct_memory.declaration_ledger ring (FIFO).
//     Ring depth bounded by declaration_ledger_size_per_precinct + max_entries_per_building (registry).
//     Returns { ok: true, entryId, totalEntries }.
//
//   GET /v1/_test/reputation/declaration-ledger/read
//     ?playerId=<id>&precinctId=<n>
//     — reads the declaration_ledger ring for a precinct from the real DB.
//     Returns { player_id, precinct_id, entries: DeclarationEntry[] } or 404.
//
// FLAG (a) event→write mapping: BossMirrorRuleDeclared/Retracted = PUBLIC SIGNAL only (no ring write).
//   The write primitive (POST /append) = violation → ring path (declaration_type = boss_mirror_violation).
//   police_memory subscription + Tick scoring = R3b.
//
// FLAG (b) [PROV-Y26Q2] scope/magnitude_bucket: NOT included. Only severity (0-100) on each entry.
//   Deferred — needs design review before canonical coding (system_3:127).
//
// R7a Routes (HiddenCurriculumService — TEST-ONLY):
//   POST /v1/_test/reputation/curriculum/set-flags
//     { lieutenantId, playerId, flags: Partial<NormsFlags> }
//     — upsert (create or overwrite) norms_flags for a lieutenant.
//     Returns { ok: true }.
//
//   POST /v1/_test/reputation/curriculum/append-event
//     { lieutenantId, playerId, eventType: 0-3 }
//     — appends one witnessed event to the FIFO ring.
//     Returns { ok: true, ringLength }.
//
//   POST /v1/_test/reputation/curriculum/force-weekly-tick
//     { playerId, weekId } — invokes HiddenCurriculumService.runWeeklyReviewTick() DIRECTLY.
//     Does NOT advance 7 game-days tick-by-tick (fast path for specs).
//     Returns { ok: true, weekId }.
//
//   GET /v1/_test/reputation/curriculum/norms-vector?lieutenantId=<id>
//     — reads the full server-side norms vector for DB assertion.
//     Returns { lieutenant_id, player_id, norms_flags, witnessed_event_ring, ring_head, last_review_week }
//     R2.2: server-only — never forwarded to a real client.
//
// R7b Routes (HiddenCurriculumService uniform-tell projection — TEST-ONLY):
//   GET /v1/_test/reputation/curriculum/uniform-tells?lieutenantId=<id>
//     — invokes HiddenCurriculumService.projectUniformTells() and returns the R2.2-compliant
//     presentation enums: { collar, sleeves, watch, gloves }.
//     NEVER includes raw NormsFlags keys (R2.2 invariant — no punctuality/ledger_hygiene/etc.).
//     If no row exists for the lieutenant, returns neutral tells:
//       { collar: 'open', sleeves: 'down', watch: 'hidden', gloves: 'dirty' }.
//     R2.2: uniform tells are the ONLY form in which norm information reaches a client route.
//
// R9 Routes (MIS routing — ForbiddenTriadInterestFlag bias + HiddenCurriculumLeakMIS inject — TEST-ONLY):
//   POST /v1/_test/reputation/mis/emit-leak-mis
//     { playerId, lieutenantId, districtId, gameMinute }
//     — emits a HiddenCurriculumLeakMISEvent on the CityEventBus (MIS routing seam for R9).
//     InspectionQueueService will inject a high-priority INFORMANT entry on the next dispatch tick.
//     Returns { ok: true, event }.
//
//   POST /v1/_test/reputation/mis/emit-triad-flag
//     { playerId, pairKey, gameMinute }
//     — emits a ForbiddenTriadInterestFlagEvent on the CityEventBus (direct inject, bypasses weekly tick).
//     InspectionQueueService will latch the pairKey bias on the next dispatch tick.
//     Returns { ok: true, event }.
//
//   GET /v1/_test/reputation/mis/last-leak-mis-event
//     ?playerId=<id>&districtId=<n>
//     — returns the last HiddenCurriculumLeakMISEvent recorded from the bus for the given player+district.
//     Returns { recorded: boolean, event: HiddenCurriculumLeakMISEvent | null }.
//     R2.2: server-only event — never forwarded to real client.
//
// R11 Routes (cross-mechanic divergence — declared rules vs absorbed norms — TEST-ONLY):
//   GET /v1/_test/reputation/divergence-cue?playerId=<id>&lieutenantId=<id>
//     — invokes BossMirrorService.getDivergenceCue().
//     Returns { divergence_count: number, cue: 'diverging' | 'aligned' | 'indeterminate' }.
//     divergence_count: server-only raw scalar (R2.2 — never forwarded to real client).
//     cue: the public observable band (the only form in which divergence reaches a real client, R12b).
//     Mapping: declared ruleId ∈ canonical norm names → commits to that norm.
//     Divergence: committed norm absorbed OFF by the lieutenant → count += 1.
//     Threshold: reputation.divergence_salience_min_norms (registry, [PROPOSED DEFAULT=1][PROV-Y26Q2]).
//     Canon :180: "declared rules vs absorbed norms can diverge; divergence itself is observable publicly."
//
// R2.2: declaration_ledger is BPD server-internal — never forwarded to real client.
// These routes do NOT bypass auth in production because they are not registered.

import { Body, Controller, Get, HttpCode, Inject, Post, Query } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { Cadence } from '../../citysim/scheduler/city_sim_system';
import type { CitySimTickContext } from '../../citysim/scheduler/city_sim_system';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { ApiError } from '../../protocol/api-error';
import { BossMirrorService } from './boss-mirror.service';
import { RestraintIndexService } from './restraint-index.service';
import { LekMemoryService } from './lek-memory.service';
import { HiddenCurriculumService } from './hidden-curriculum.service';
import type { NormsFlags, UniformTellProjection } from './hidden-curriculum.service';
import { ForbiddenTriadDetectionService } from './forbidden-triad.service';
import { ReputationHubService, type ReputationHubProjection } from './reputation-hub.service'; // R12b
import {
  CityEventBus,
  BossMirrorDeclarationType,
  type BossMirrorRuleDeclaredEvent,
  type BossMirrorRuleRetractedEvent,
  type ForbiddenTriadInterestFlagEvent,
  type HiddenCurriculumLeakMISEvent,
} from '../../citysim/events/city-event-bus';
import { precinctMemory } from '../../db/schema/city_state';
import { reputationTunables } from './reputation-tunables';
import {
  bossMirrorViolationRing,
  bossMirrorDeclarationLedger,
  restraintDisputeRing,
  hiddenCurriculumNormsVector,
  forbiddenTriadPairState,
  lekMemoryCellState,
  type BossMirrorViolationRingRow,
  type BossMirrorDeclarationLedgerRow,
  type RestraintDisputeRingRow,
  type HiddenCurriculumNormsVectorRow,
  type ForbiddenTriadPairStateRow,
  type LekMemoryCellStateRow,
} from '../../db/schema/reputation_state';

/** R1: upsert request body. */
interface UpsertAllEntitiesBody {
  playerId: string;
  lieutenantId: string;
  counterpartyId: string;
  tileId: number;
  pairKey: string;
}

/** R1: the 6 entity rows returned after upsert or read. TEST-ONLY — raw server state. */
interface AllEntitiesResponse {
  boss_mirror_violation_ring:     BossMirrorViolationRingRow | null;
  boss_mirror_declaration_ledger: BossMirrorDeclarationLedgerRow | null;
  restraint_dispute_ring:         RestraintDisputeRingRow | null;
  lek_memory_cell_state:          LekMemoryCellStateRow | null;
  hidden_curriculum_norms_vector: HiddenCurriculumNormsVectorRow | null;
  forbidden_triad_pair_state:     ForbiddenTriadPairStateRow | null;
}

// ── R2a request body types ──────────────────────────────────────────────────────────────────────

/** R2a: declare/retract rule body. */
interface BossMirrorRuleBody {
  playerId: string;
  ruleId: string;
}

/** R2a: record-violation body. W6a C3: `playerId` is now REQUIRED (P-A ownership guard). */
interface BossMirrorViolationBody {
  playerId: string;
  lieutenantId: string;
  ruleId: string;
  severityBucket: number;
}

/** R2b: force-weekly-tick body. */
interface BossMirrorForceTickBody {
  playerId: string;
  weekId: number;
}

// ── R4a request body types ──────────────────────────────────────────────────────────────────────

/** R4a: record dispute outcome body. */
interface RestraintRecordOutcomeBody {
  playerId: string;
  counterpartyId: string;
  claimable: number;
  claimed: number;
}

/** R4a: force weekly tick body (same shape as R2b for consistency). */
interface RestraintForceTickBody {
  playerId: string;
  weekId: number;
}

/** R4b: record dispute outcome with optional lieutenantId for DD-BRIDGE breach-check. */
interface RestraintRecordOutcomeBridgeBody {
  playerId: string;
  counterpartyId: string;
  claimable: number;
  claimed: number;
  /** Optional lieutenant context for the DD-BRIDGE Restraint→Boss Mirror write (R4b). */
  lieutenantId?: string;
}

// ── R3a request body types ──────────────────────────────────────────────────────────────────────

/** R3a: emit-rule-declared / emit-rule-retracted body. */
interface BossMirrorEmitEventBody {
  playerId: string;
  ruleId: string;
  declarationType: string;
  gameMinute: number;
}

// ── R5a request body types ──────────────────────────────────────────────────────────────────────

/** R5a: bind-operator body. */
interface LekBindOperatorBody {
  playerId:   string;
  cellId:     number;
  operatorId: string;
}

/** R5a: record-deal-fairness body. */
interface LekRecordFairnessBody {
  playerId:          string;
  cellId:            number;
  operatorId:        string;
  /** Nibble [0-15]: 0-3=negative/short-pay, 4-11=neutral, 12-15=fair. */
  fairnessSignature: number;
}

/** R5a: force-decay-tick body. */
interface LekForceDecayTickBody {
  playerId: string;
  weekId:   number;
}

// ── R7a request body types ──────────────────────────────────────────────────────────────────────

/** R7a: set-flags body. */
interface CurriculumSetFlagsBody {
  lieutenantId: string;
  playerId:     string;
  flags:        Partial<NormsFlags>;
}

/** R7a: append-event body. */
interface CurriculumAppendEventBody {
  lieutenantId: string;
  playerId:     string;
  /** 2-bit event type code (0-3). Each type exhibits 2 of the 8 norms. */
  eventType:    number;
}

/** R7a: force-weekly-tick body (same shape as R2b/R5a for consistency). */
interface CurriculumForceTickBody {
  playerId: string;
  weekId:   number;
}

// ── R3a request body types ──────────────────────────────────────────────────────────────────────

/** R3a: append-declaration-entry body. */
interface AppendDeclarationEntryBody {
  playerId: string;
  precinctId: number;
  buildingId: number;
  declarationType: string;
  severity: number;
  sourceOriginId: string;
}

/**
 * A single entry in the declaration_ledger JSONB ring (G31 — system_3_police_memory.md :87-99).
 * FLAG (b): only severity (0-100) is included. [PROV-Y26Q2] scope/magnitude_bucket DEFERRED.
 */
interface DeclarationEntry {
  entry_id: string;           // uuid generated at write
  building_id: number;        // building_id (G31 :91)
  declaration_type: string;   // DeclarationType enum value (G31 :92)
  severity: number;           // 0-100 integer bucket (G31 :93) — NOT a raw float
  source_origin_id: string;   // courier / lieutenant / legal_case ID (G31 :94)
  written_at: number;         // gameMinute timestamp (G31 :95 written_at tick)
}

// ── R8a request body types ──────────────────────────────────────────────────────────────────────

/** R8a: update-membership body. */
interface TriadUpdateMembershipBody {
  playerId:          string;
  contactId:         string;
  interactionsCount: number;
}

// ── R8b request body types ──────────────────────────────────────────────────────────────────────

/** R8b: force-weekly-tick body (mirrors R2b/R5a/R7a pattern). */
interface TriadForceTickBody {
  playerId: string;
  weekId:   number;
}

/** R8b: introduce-pair dissolve action body. */
interface TriadIntroducePairBody {
  playerId:   string;
  contactIdA: string;
  contactIdB: string;
}

/** R8b: drop-contact dissolve action body. */
interface TriadDropContactBody {
  playerId:  string;
  contactId: string;
}

// ── R9 request body types ──────────────────────────────────────────────────────────────────────

/** R9: emit-leak-mis body. */
interface MISEmitLeakMISBody {
  playerId:      string;
  lieutenantId:  string;
  districtId:    number;
  gameMinute:    number;
}

/** R9: emit-triad-flag body (direct emit, bypasses weekly tick). */
interface MISEmitTriadFlagBody {
  playerId:   string;
  pairKey:    string;
  gameMinute: number;
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class ReputationTestController {
  /**
   * R8b: in-memory recorder for ForbiddenTriadInterestFlag events emitted on the CityEventBus.
   * Keyed by pairKey → last event received.
   * Allows the GET /triad/last-interest-flag-event route to assert bus emission without a real R9 consumer.
   * TEST-ONLY: this map lives in the controller instance (single process, same container).
   * R2.2: this recorder exists solely for E2E DB/bus assertion — never forwarded to a real client.
   */
  private readonly interestFlagEvents = new Map<string, ForbiddenTriadInterestFlagEvent>();

  /**
   * R9: in-memory recorder for HiddenCurriculumLeakMIS events emitted on the CityEventBus.
   * Keyed by `${playerId}:${districtId}` → last event received.
   * Allows the GET /mis/last-leak-mis-event route to assert bus emission.
   * TEST-ONLY: this map lives in the controller instance (single process, same container).
   * R2.2: recorder exists solely for E2E bus assertion — never forwarded to a real client.
   */
  private readonly leakMISEvents = new Map<string, HiddenCurriculumLeakMISEvent>();

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly bossMirrorService: BossMirrorService,
    private readonly restraintIndexService: RestraintIndexService,
    private readonly lekMemoryService: LekMemoryService,
    private readonly hiddenCurriculumService: HiddenCurriculumService,
    private readonly forbiddenTriadService: ForbiddenTriadDetectionService,
    private readonly cityEventBus: CityEventBus,
    private readonly reputationHubService: ReputationHubService, // R12b: unified player-facing projection
  ) {
    // R8b: subscribe to ForbiddenTriadInterestFlag events for TEST-ONLY assertion.
    // Records the last event per pairKey — the GET /triad/last-interest-flag-event probe reads this.
    this.cityEventBus.onForbiddenTriadInterestFlag((event) => {
      this.interestFlagEvents.set(event.pairKey, event);
    });
    // R9: subscribe to HiddenCurriculumLeakMIS events for TEST-ONLY assertion.
    // Records the last event per `${playerId}:${districtId}` — the GET /mis/last-leak-mis-event probe reads this.
    this.cityEventBus.onHiddenCurriculumLeakMIS((event) => {
      this.leakMISEvents.set(`${event.playerId}:${event.districtId}`, event);
    });
  }

  /** R0 connectivity probe: returns { ok: true } if ReputationModule is in the graph. */
  @Get('_test/reputation/ping')
  ping(): { ok: true } {
    return { ok: true };
  }

  /**
   * `POST /v1/_test/reputation/upsert-all-entities` — R1 persistence proof.
   *
   * Upserts one row of each of the 6 reputation entities.
   * Neutral/empty default values — no mechanic logic applied (R1 is persistence-only).
   * Returns all 6 rows after upsert for DB-layer E2E assertion.
   *
   * R2.2: TEST-ONLY route (not registered in production). Internal state returned
   * only for E2E DB assertion — never forwarded to real client.
   */
  @Post('_test/reputation/upsert-all-entities')
  async upsertAllEntities(
    @Body() body: UpsertAllEntitiesBody,
  ): Promise<AllEntitiesResponse> {
    const { playerId, lieutenantId, counterpartyId, tileId, pairKey } = body;

    // 1. boss_mirror_violation_ring (per-lieutenant)
    const [violationRingRow] = await this.db
      .insert(bossMirrorViolationRing)
      .values({
        lieutenant_id:   lieutenantId,
        player_id:       playerId,
        violation_slots: [],
        ring_head:       0,
      })
      .onConflictDoUpdate({
        target:  bossMirrorViolationRing.lieutenant_id,
        set:     { updated_at: new Date() },
      })
      .returning();

    // 2. boss_mirror_declaration_ledger (per-player — DD-ENT: per-player, :65)
    const [declarationLedgerRow] = await this.db
      .insert(bossMirrorDeclarationLedger)
      .values({
        player_id:          playerId,
        declared_rules:     [],
        retraction_history: [],
      })
      .onConflictDoUpdate({
        target: bossMirrorDeclarationLedger.player_id,
        set:    { updated_at: new Date() },
      })
      .returning();

    // 3. restraint_dispute_ring (per-counterparty)
    const [disputeRingRow] = await this.db
      .insert(restraintDisputeRing)
      .values({
        player_id:       playerId,
        counterparty_id: counterpartyId,
        dispute_slots:   [],
        ring_head:       0,
      })
      .onConflictDoUpdate({
        target:  [restraintDisputeRing.player_id, restraintDisputeRing.counterparty_id],
        set:     { updated_at: new Date() },
      })
      .returning();

    // 4. lek_memory_cell_state (sibling table — DD-LEK-LOC)
    const [lekMemoryRow] = await this.db
      .insert(lekMemoryCellState)
      .values({
        player_id:                    playerId,
        tile_id:                      tileId,
        trailing_operator_ids:        [],
        trailing_fairness_signatures: [],
        last_active_tick:             0,
        lambda_weight:                0,
        decay_state:                  0,
      })
      .onConflictDoUpdate({
        target:  [lekMemoryCellState.player_id, lekMemoryCellState.tile_id],
        set:     { updated_at: new Date() },
      })
      .returning();

    // 5. hidden_curriculum_norms_vector (per-lieutenant)
    const [normsVectorRow] = await this.db
      .insert(hiddenCurriculumNormsVector)
      .values({
        lieutenant_id:          lieutenantId,
        player_id:              playerId,
        norms_flags:            {
          punctuality: false, silence_at_handoffs: false, debt_handling: false,
          escalation_reflex: false, fairness_to_subordinates: false,
          discretion_around_civilians: false, restraint_with_force: false,
          ledger_hygiene: false,
        },
        witnessed_event_ring:   [],
        ring_head:              0,
      })
      .onConflictDoUpdate({
        target:  hiddenCurriculumNormsVector.lieutenant_id,
        set:     { updated_at: new Date() },
      })
      .returning();

    // 6. forbidden_triad_pair_state (per strong-tied pair)
    const [triadPairRow] = await this.db
      .insert(forbiddenTriadPairState)
      .values({
        player_id:               playerId,
        pair_key:                pairKey,
        triadic_state:           0,  // 0 = UNMET
        anomaly_pressure_bucket: 0,
        last_event_tick:         0,
      })
      .onConflictDoUpdate({
        target:  [forbiddenTriadPairState.player_id, forbiddenTriadPairState.pair_key],
        set:     { updated_at: new Date() },
      })
      .returning();

    return {
      boss_mirror_violation_ring:     violationRingRow ?? null,
      boss_mirror_declaration_ledger: declarationLedgerRow ?? null,
      restraint_dispute_ring:         disputeRingRow ?? null,
      lek_memory_cell_state:          lekMemoryRow ?? null,
      hidden_curriculum_norms_vector: normsVectorRow ?? null,
      forbidden_triad_pair_state:     triadPairRow ?? null,
    };
  }

  /**
   * `GET /v1/_test/reputation/read-entities` — R1 persistence proof.
   *
   * Reads all 6 reputation rows for the given (playerId, lieutenantId, counterpartyId, tileId, pairKey).
   * Returns null for missing rows.
   *
   * R2.2: TEST-ONLY route (not registered in production). Raw internal state returned
   * only for E2E DB assertion.
   */
  @Get('_test/reputation/read-entities')
  async readEntities(
    @Query('playerId')       playerId: string,
    @Query('lieutenantId')   lieutenantId: string,
    @Query('counterpartyId') counterpartyId: string,
    @Query('tileId')         tileIdStr: string,
    @Query('pairKey')        pairKey: string,
  ): Promise<AllEntitiesResponse> {
    const tileId = parseInt(tileIdStr, 10);

    const [violationRingRow] = await this.db
      .select()
      .from(bossMirrorViolationRing)
      .where(eq(bossMirrorViolationRing.lieutenant_id, lieutenantId))
      .limit(1);

    const [declarationLedgerRow] = await this.db
      .select()
      .from(bossMirrorDeclarationLedger)
      .where(eq(bossMirrorDeclarationLedger.player_id, playerId))
      .limit(1);

    const [disputeRingRow] = await this.db
      .select()
      .from(restraintDisputeRing)
      .where(and(
        eq(restraintDisputeRing.player_id, playerId),
        eq(restraintDisputeRing.counterparty_id, counterpartyId),
      ))
      .limit(1);

    const [lekMemoryRow] = await this.db
      .select()
      .from(lekMemoryCellState)
      .where(and(
        eq(lekMemoryCellState.player_id, playerId),
        eq(lekMemoryCellState.tile_id, tileId),
      ))
      .limit(1);

    const [normsVectorRow] = await this.db
      .select()
      .from(hiddenCurriculumNormsVector)
      .where(eq(hiddenCurriculumNormsVector.lieutenant_id, lieutenantId))
      .limit(1);

    const [triadPairRow] = await this.db
      .select()
      .from(forbiddenTriadPairState)
      .where(and(
        eq(forbiddenTriadPairState.player_id, playerId),
        eq(forbiddenTriadPairState.pair_key, pairKey),
      ))
      .limit(1);

    return {
      boss_mirror_violation_ring:     violationRingRow ?? null,
      boss_mirror_declaration_ledger: declarationLedgerRow ?? null,
      restraint_dispute_ring:         disputeRingRow ?? null,
      lek_memory_cell_state:          lekMemoryRow ?? null,
      hidden_curriculum_norms_vector: normsVectorRow ?? null,
      forbidden_triad_pair_state:     triadPairRow ?? null,
    };
  }

  // ── R2a: BossMirrorService mechanic routes ─────────────────────────────────────────────────────

  /**
   * `POST /v1/_test/reputation/boss-mirror/declare-rule` — R2a BossMirrorService.declareRule().
   *
   * Returns 200 { ok: true } on success.
   * Throws ApiError('RESOURCE_STATE_CONFLICT') (409) when player is at the cap
   * (boss_mirror_max_public_rules, registry-resolved, DD-REG-NAME).
   *
   * TEST-ONLY route. R2.2: declared_rules is the public observable — this is the engagement surface.
   */
  @Post('_test/reputation/boss-mirror/declare-rule')
  @HttpCode(200)
  async bossMirrorDeclareRule(
    @Body() body: BossMirrorRuleBody,
  ): Promise<{ ok: true }> {
    const result = await this.bossMirrorService.declareRule(body.playerId, body.ruleId);
    if (!result.ok) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `BossMirror cap reached: ${result.current}/${result.cap} simultaneous declared rules (boss_mirror_max_public_rules)`,
        details: { reason: result.reason, cap: result.cap, current: result.current },
      });
    }
    return { ok: true };
  }

  /**
   * `POST /v1/_test/reputation/boss-mirror/retract-rule` — R2a BossMirrorService.retractRule().
   *
   * Returns 200 { ok: true } on success.
   * Throws ApiError('RESOURCE_NOT_FOUND') (404) when rule not in active ledger.
   *
   * TEST-ONLY route. R2.2: retraction is itself a public observable event (:63).
   */
  @Post('_test/reputation/boss-mirror/retract-rule')
  @HttpCode(200)
  async bossMirrorRetractRule(
    @Body() body: BossMirrorRuleBody,
  ): Promise<{ ok: true }> {
    const result = await this.bossMirrorService.retractRule(body.playerId, body.ruleId);
    if (!result.ok) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `BossMirror retract: rule '${body.ruleId}' not found in active ledger for player ${body.playerId}`,
      });
    }
    return { ok: true };
  }

  /**
   * `POST /v1/_test/reputation/boss-mirror/record-violation` — R2a BossMirrorService.recordViolation().
   *
   * Appends a violation slot to the per-lieutenant FIFO ring (size from registry, DD-REG-NAME).
   * Returns 200 { ok: true }.
   *
   * W6a C3: `playerId` is now REQUIRED in the body — the service throws 404 `RESOURCE_NOT_FOUND`
   * (caught and re-thrown here unchanged by the GlobalExceptionFilter) if `lieutenantId` does not
   * belong to `playerId`.
   *
   * TEST-ONLY route. R2.2: violation_slots is server-side private (never forwarded to real client).
   */
  @Post('_test/reputation/boss-mirror/record-violation')
  @HttpCode(200)
  async bossMirrorRecordViolation(
    @Body() body: BossMirrorViolationBody,
  ): Promise<{ ok: true }> {
    await this.bossMirrorService.recordViolation(
      body.playerId,
      body.lieutenantId,
      body.ruleId,
      body.severityBucket,
    );
    return { ok: true };
  }

  /**
   * `GET /v1/_test/reputation/boss-mirror/tunables-probe` — W6a C5 (DD-MAGNITUDE-BOUND) probe.
   *
   * Returns the `severityBucket` clamp bounds `recordViolation` reads from the registry
   * (design §3/C5). The E2E sensitivity test reads this BEFORE and AFTER a `tunable_overrides`
   * DB-flip to prove the clamp's bascule point actually moves with the registry — the falsifiable
   * that separates "bounded" from "decorative" (design §3/C5 "Ce que la spec E2E doit prouver" #2).
   *
   * TEST-ONLY route. R2.2: bound values are configuration, not player state — safe to expose.
   */
  @Get('_test/reputation/boss-mirror/tunables-probe')
  bossMirrorTunablesProbe(): { severity_bucket_min: number; severity_bucket_max: number } {
    return {
      severity_bucket_min: reputationTunables.bossMirrorSeverityBucketMin,
      severity_bucket_max: reputationTunables.bossMirrorSeverityBucketMax,
    };
  }

  /**
   * `GET /v1/_test/reputation/boss-mirror/ledger?playerId=<id>` — R2a read ledger.
   *
   * Returns the raw boss_mirror_declaration_ledger row for DB assertion.
   * TEST-ONLY: declared_rules is the public observable; retraction_history is server-side.
   * R2.2: never forwarded to real client.
   */
  @Get('_test/reputation/boss-mirror/ledger')
  async bossMirrorReadLedger(
    @Query('playerId') playerId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.bossMirrorService.getLedger(playerId) as Promise<Record<string, unknown> | null>;
  }

  /**
   * `GET /v1/_test/reputation/boss-mirror/ring?lieutenantId=<id>` — R2a read ring.
   *
   * Returns the raw boss_mirror_violation_ring row for DB assertion.
   * TEST-ONLY: violation_slots is server-side private (never forwarded to real client).
   * R2.2 invariant maintained.
   * NOTE: does NOT include violation_density / defection_tolerance (those are R2b server-only scalars
   * returned by /tick-scalars — separate route to maintain clean surface boundaries).
   */
  @Get('_test/reputation/boss-mirror/ring')
  async bossMirrorReadRing(
    @Query('lieutenantId') lieutenantId: string,
    @Query('playerId') playerId: string,
  ): Promise<Record<string, unknown> | null> {
    // W6a C4 (finding #15) — `playerId` is now a required query param, joint-scoped inside
    // `getRing`. A ring belonging to a DIFFERENT player now hits the SAME null-on-absence branch
    // this route already returned for "no ring row at all" (D2 — byte-identical for both cases;
    // a 200+null success payload masks existence just as completely as a 404 would). Kept as the
    // pre-existing 200+null idiom deliberately — see the C4 implementation notes § Deviations:
    // an EXISTING attack test (`w6a_c3_worst_findings.spec.ts`'s `recordViolation` non-effect
    // assertion) already depends on this exact shape (`toBeNull()` on absence), and this route's
    // OTHER callers throughout the E2E suite never test the "row not found → 404" case — converting
    // to a throw here would be a broader behavior change than this finding requires.
    return this.bossMirrorService.getRing(lieutenantId, playerId) as Promise<Record<string, unknown> | null>;
  }

  // ── R2b: Boss Mirror weekly tick force-trigger + scalar reads ──────────────────────────────────

  /**
   * `POST /v1/_test/reputation/boss-mirror/force-weekly-tick` — R2b force-trigger.
   *
   * Invokes `BossMirrorService.runWeeklyTick()` DIRECTLY for the given player + weekId.
   * Does NOT advance 7 game-days tick-by-tick (the idempotent fast path for specs).
   * The REAL scheduler fires this via `onApplicationBootstrap` + `Cadence.WEEKLY`.
   *
   * Returns { ok: true, weekId }.
   *
   * TEST-ONLY route. R2.2: derived scalars are computed server-side; never forwarded to real client.
   * The weekId must be provided by the caller (avoids coupling the fast-path to a game clock).
   */
  @Post('_test/reputation/boss-mirror/force-weekly-tick')
  @HttpCode(200)
  async bossMirrorForceWeeklyTick(
    @Body() body: BossMirrorForceTickBody,
  ): Promise<{ ok: true; weekId: number }> {
    if (!body.playerId || typeof body.weekId !== 'number') {
      throw new ApiError(
        'VALIDATION_FAILED',
        { message: 'force-weekly-tick requires { playerId: string, weekId: number }' },
      );
    }
    // Build a minimal CitySimTickContext for the tick (only playerId + cadence + gameMinute used).
    const ctx: CitySimTickContext = {
      playerId:   body.playerId,
      cadence:    Cadence.WEEKLY,
      gameMinute: body.weekId * 7 * 24 * 60, // synthetic gameMinute consistent with weekId
    };
    await this.bossMirrorService.runWeeklyTick(ctx, body.weekId);
    return { ok: true, weekId: body.weekId };
  }

  /**
   * `GET /v1/_test/reputation/boss-mirror/tick-scalars?lieutenantId=<id>` — R2b read server scalars.
   *
   * Returns the derived server-only tick scalars on the per-lieutenant ring row:
   * { lieutenant_id, violation_density, defection_tolerance, last_tick_week } or null.
   *
   * TEST-ONLY: server-side private (never forwarded to a real client — R2.2/P5).
   * Real client gets posture/band only (R12b — future).
   */
  @Get('_test/reputation/boss-mirror/tick-scalars')
  async bossMirrorReadTickScalars(
    @Query('lieutenantId') lieutenantId: string,
    @Query('playerId') playerId: string,
  ): Promise<Record<string, unknown> | null> {
    // W6a C4 (finding #16) — same treatment (and same reasoning) as `bossMirrorReadRing` above:
    // `playerId` required, joint-scoped, kept as the pre-existing 200+null idiom.
    return this.bossMirrorService.getTickScalars(lieutenantId, playerId) as Promise<Record<string, unknown> | null>;
  }

  /**
   * `GET /v1/_test/reputation/boss-mirror/consistency-index?playerId=<id>` — R2b read consistency_index.
   *
   * Returns { player_id, consistency_index, last_consistency_week } or null.
   *
   * TEST-ONLY: server-side private (never forwarded to a real client — R2.2/P5).
   * Materialized for R10 recruitment poll (not a client scalar — R2.2).
   */
  @Get('_test/reputation/boss-mirror/consistency-index')
  async bossMirrorReadConsistencyIndex(
    @Query('playerId') playerId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.bossMirrorService.getConsistencyIndex(playerId) as Promise<Record<string, unknown> | null>;
  }

  // ── R4a: RestraintIndexService routes ──────────────────────────────────────────────────────────

  /**
   * `POST /v1/_test/reputation/restraint/record-outcome` — R4a: record a dispute outcome.
   *
   * Appends a slot to the per-(player, counterparty) FIFO ring buffer (ring size from registry,
   * DD-REG-NAME: `restraint_window_disputes`).
   * Returns { ok: true }.
   *
   * TEST-ONLY. R2.2: dispute_slots is server-side private (never forwarded to real client).
   */
  @Post('_test/reputation/restraint/record-outcome')
  @HttpCode(200)
  async restraintRecordOutcome(
    @Body() body: RestraintRecordOutcomeBody,
  ): Promise<{ ok: true }> {
    if (!body.playerId || !body.counterpartyId || body.claimable == null || body.claimed == null) {
      throw new ApiError('VALIDATION_FAILED', {
        message: 'record-outcome requires { playerId, counterpartyId, claimable, claimed }',
      });
    }
    await this.restraintIndexService.recordDisputeOutcome(
      body.playerId,
      body.counterpartyId,
      body.claimable,
      body.claimed,
    );
    return { ok: true };
  }

  /**
   * `GET /v1/_test/reputation/restraint/tunables-probe` — W6a C5 (DD-MAGNITUDE-BOUND) probe.
   *
   * Returns the `claimable`/`claimed` clamp bounds `recordDisputeOutcome` reads from the registry
   * (design §3/C5). Same sensitivity-test use as `boss-mirror/tunables-probe` (see its own docblock).
   *
   * TEST-ONLY route. R2.2: bound values are configuration, not player state — safe to expose.
   */
  @Get('_test/reputation/restraint/tunables-probe')
  restraintTunablesProbe(): { claim_amount_min: number; claim_amount_max: number } {
    return {
      claim_amount_min: reputationTunables.restraintClaimAmountMin,
      claim_amount_max: reputationTunables.restraintClaimAmountMax,
    };
  }

  /**
   * `POST /v1/_test/reputation/restraint/record-outcome-bridge` — R4b DD-BRIDGE route.
   *
   * Extended version of record-outcome that also accepts an optional `lieutenantId` for the
   * DD-BRIDGE breach-check (Restraint→Boss Mirror deterministic write, canon :101).
   *
   * Invokes `RestraintIndexService.recordDisputeOutcome(playerId, counterpartyId, claimable,
   *   claimed, lieutenantId?)`.
   *
   * If `lieutenantId` is provided AND the outcome contradicts a currently-declared "settle_fair"
   * rule for the player, the bridge fires: a BossMirrorViolationRing slot is written for that
   * lieutenant (deterministically AFTER the RestraintDisputeRing write — DD-BRIDGE order).
   *
   * Returns { ok: true }.
   *
   * TEST-ONLY. R2.2: both rings are server-only (never forwarded to real client).
   * DD-BRIDGE: this route is the canonical test surface for R4b bridge assertions.
   */
  @Post('_test/reputation/restraint/record-outcome-bridge')
  @HttpCode(200)
  async restraintRecordOutcomeBridge(
    @Body() body: RestraintRecordOutcomeBridgeBody,
  ): Promise<{ ok: true }> {
    if (!body.playerId || !body.counterpartyId || body.claimable == null || body.claimed == null) {
      throw new ApiError('VALIDATION_FAILED', {
        message: 'record-outcome-bridge requires { playerId, counterpartyId, claimable, claimed }',
      });
    }
    await this.restraintIndexService.recordDisputeOutcome(
      body.playerId,
      body.counterpartyId,
      body.claimable,
      body.claimed,
      body.lieutenantId, // optional — undefined skips the bridge
    );
    return { ok: true };
  }

  /**
   * `POST /v1/_test/reputation/restraint/force-weekly-tick` — R4a force-trigger.
   *
   * Invokes `RestraintIndexService.runWeeklyTick()` DIRECTLY for the given player + weekId.
   * Does NOT advance 7 game-days tick-by-tick (the idempotent fast path for specs).
   * The REAL scheduler fires this via `onApplicationBootstrap` + `Cadence.WEEKLY`.
   *
   * Returns { ok: true, weekId }.
   *
   * TEST-ONLY. R2.2: derived scalars computed server-side; never forwarded to real client.
   */
  @Post('_test/reputation/restraint/force-weekly-tick')
  @HttpCode(200)
  async restraintForceWeeklyTick(
    @Body() body: RestraintForceTickBody,
  ): Promise<{ ok: true; weekId: number }> {
    if (!body.playerId || typeof body.weekId !== 'number') {
      throw new ApiError('VALIDATION_FAILED', {
        message: 'force-weekly-tick requires { playerId: string, weekId: number }',
      });
    }
    const ctx: CitySimTickContext = {
      playerId:   body.playerId,
      cadence:    Cadence.WEEKLY,
      gameMinute: body.weekId * 7 * 24 * 60, // synthetic gameMinute consistent with weekId
    };
    await this.restraintIndexService.runWeeklyTick(ctx, body.weekId);
    return { ok: true, weekId: body.weekId };
  }

  /**
   * `GET /v1/_test/reputation/restraint/ring?playerId=<id>&counterpartyId=<id>` — R4a read ring.
   *
   * Returns the full server-only ring state for DB assertion:
   * { dispute_slots, ring_head, restraint_ratio, offer_terms, wary_active,
   *   collateral_amount, last_tick_week }
   *
   * TEST-ONLY: server-side private (never forwarded to a real client — R2.2/P5).
   * Returns 404 if no row found for this (player, counterparty) pair.
   */
  @Get('_test/reputation/restraint/ring')
  async restraintReadRing(
    @Query('playerId')       playerId: string,
    @Query('counterpartyId') counterpartyId: string,
  ): Promise<Record<string, unknown>> {
    const state = await this.restraintIndexService.getRingState(playerId, counterpartyId);
    if (!state) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `No restraint_dispute_ring row for player ${playerId} counterparty ${counterpartyId}`,
      });
    }
    return state as Record<string, unknown>;
  }

  /**
   * `GET /v1/_test/reputation/restraint/offer-terms?playerId=<id>&counterpartyId=<id>` — R4a client surface.
   *
   * Returns the R2.2-compliant client-facing offer terms:
   * { offer_posture: 'standard' | 'wary', marginalia: string[] }
   *
   * R2.2 invariant: NO raw restraint_ratio in this response.
   * Calls RestraintIndexService.computeOfferTerms() which enforces the projection.
   *
   * This route represents the named marginalia + offer posture surface exposed to clients (:95).
   */
  @Get('_test/reputation/restraint/offer-terms')
  async restraintReadOfferTerms(
    @Query('playerId')       playerId: string,
    @Query('counterpartyId') counterpartyId: string,
  ): Promise<Record<string, unknown>> {
    return this.restraintIndexService.computeOfferTerms(
      playerId,
      counterpartyId,
    ) as unknown as Promise<Record<string, unknown>>;
  }

  // ── R3a: Boss Mirror bus events + declaration_ledger write primitive ──────────────────────────

  /**
   * `POST /v1/_test/reputation/boss-mirror/emit-rule-declared` — R3a: emit BossMirrorRuleDeclaredEvent.
   *
   * Emits a BossMirrorRuleDeclaredEvent on the CityEventBus (PUBLIC SIGNAL — no ring write).
   * Returns the event payload for E2E field-shape assertion (closed enum, no raw float).
   *
   * FLAG (a): this is the public signal channel. The violation → ring write is a separate path
   * (writeDeclarationEntry, POST /declaration-ledger/append). police_memory subscription = R3b.
   *
   * TEST-ONLY. R2.2: no scalars forwarded.
   */
  @Post('_test/reputation/boss-mirror/emit-rule-declared')
  @HttpCode(200)
  bossMirrorEmitRuleDeclared(
    @Body() body: BossMirrorEmitEventBody,
  ): BossMirrorRuleDeclaredEvent {
    const event: BossMirrorRuleDeclaredEvent = {
      type:            'boss_mirror_rule_declared',
      playerId:        body.playerId,
      ruleId:          body.ruleId,
      declarationType: BossMirrorDeclarationType.RULE_DECLARED,
      gameMinute:      Math.trunc(body.gameMinute), // integer — no raw float crossing the seam (P5)
    };
    this.cityEventBus.emitBossMirrorRuleDeclared(event);
    return event;
  }

  /**
   * `POST /v1/_test/reputation/boss-mirror/emit-rule-retracted` — R3a: emit BossMirrorRuleRetractedEvent.
   *
   * Emits a BossMirrorRuleRetractedEvent on the CityEventBus (PUBLIC SIGNAL — no ring write).
   * Returns the event payload for E2E field-shape assertion (closed enum, no raw float).
   *
   * FLAG (a): public signal channel only — not a ring write. police_memory subscription = R3b.
   *
   * TEST-ONLY. R2.2: no scalars forwarded.
   */
  @Post('_test/reputation/boss-mirror/emit-rule-retracted')
  @HttpCode(200)
  bossMirrorEmitRuleRetracted(
    @Body() body: BossMirrorEmitEventBody,
  ): BossMirrorRuleRetractedEvent {
    const event: BossMirrorRuleRetractedEvent = {
      type:            'boss_mirror_rule_retracted',
      playerId:        body.playerId,
      ruleId:          body.ruleId,
      declarationType: BossMirrorDeclarationType.RULE_RETRACTED,
      gameMinute:      Math.trunc(body.gameMinute), // integer — no raw float (P5)
    };
    this.cityEventBus.emitBossMirrorRuleRetracted(event);
    return event;
  }

  /**
   * `POST /v1/_test/reputation/declaration-ledger/append` — R3a write primitive.
   *
   * Appends a DeclarationEntry to precinct_memory.declaration_ledger ring (FIFO).
   * Creates the precinct_memory row if absent (lazy seed via advisory lock, idempotent).
   * Ring depth bounded by:
   *   - declaration_ledger_size_per_precinct (total ring, registry default 64)
   *   - declaration_ledger.max_entries_per_building (per-building FIFO cap, registry default 50)
   * Both read from registry via reputationTunables — NO inline numeric bounds (DD-REG-NAME).
   *
   * FLAG (b) [PROV-Y26Q2]: only severity (0-100) included on the entry. scope/magnitude_bucket DEFERRED.
   *
   * Returns { ok: true, entryId, totalEntries }.
   * TEST-ONLY. R2.2: declaration_ledger is BPD server-internal.
   */
  @Post('_test/reputation/declaration-ledger/append')
  @HttpCode(200)
  async declarationLedgerAppend(
    @Body() body: AppendDeclarationEntryBody,
  ): Promise<{ ok: true; entryId: string; totalEntries: number }> {
    const { playerId, precinctId, buildingId, declarationType, severity, sourceOriginId } = body;

    if (!playerId || precinctId == null || buildingId == null || !declarationType || severity == null) {
      throw new ApiError('VALIDATION_FAILED', {
        message: 'append requires { playerId, precinctId, buildingId, declarationType, severity, sourceOriginId }',
      });
    }

    // severity must be an integer 0-100 (not a raw float — P5/R2.2).
    const clampedSeverity = Math.min(100, Math.max(0, Math.trunc(severity)));

    const entryId   = randomUUID();
    const writtenAt = Date.now(); // wall-clock ms as the tick timestamp proxy for R3a

    const maxPrecinct    = reputationTunables.declarationLedgerSizePerPrecinct;
    const maxPerBuilding = reputationTunables.declarationLedgerMaxEntriesPerBuilding;

    const newEntry: DeclarationEntry = {
      entry_id:         entryId,
      building_id:      buildingId,
      declaration_type: declarationType,
      severity:         clampedSeverity,
      source_origin_id: sourceOriginId ?? '',
      written_at:       writtenAt,
    };

    // Atomic JSONB append using a CTE:
    //   1. Lock the row advisory-style (player-scoped).
    //   2. Read the existing declaration_ledger (null → empty array).
    //   3. Filter per-building entries to enforce max_entries_per_building FIFO cap.
    //   4. Append the new entry, then truncate to declaration_ledger_size_per_precinct (ring FIFO).
    //   5. UPSERT the row: insert if missing (lazy seed), update if present.
    //
    // Implemented as two operations for clarity (read → compute → write), protected by the row-level
    // SELECT FOR UPDATE in the same transaction for correctness under concurrency.
    await this.db.execute(sql`
      WITH lock AS (SELECT pg_advisory_xact_lock(hashtext(${playerId}))),
      existing AS (
        SELECT declaration_ledger
        FROM ${precinctMemory}
        WHERE player_id = ${playerId}::uuid AND precinct_id = ${precinctId}::int
        FOR UPDATE
      )
      INSERT INTO ${precinctMemory} (player_id, precinct_id, suspicion_map, declaration_ledger)
      SELECT
        ${playerId}::uuid,
        ${precinctId}::int,
        ${'\\x' + Buffer.alloc(1024).toString('hex')}::bytea,
        (
          SELECT jsonb_agg(e)
          FROM (
            SELECT e
            FROM (
              SELECT e,
                     row_number() OVER (PARTITION BY (e->>'building_id')::int ORDER BY (e->>'written_at')::bigint DESC) AS rn_building,
                     row_number() OVER (ORDER BY (e->>'written_at')::bigint DESC) AS rn_total
              FROM   jsonb_array_elements(
                       COALESCE((SELECT declaration_ledger FROM existing), '[]'::jsonb) || ${JSON.stringify([newEntry])}::jsonb
                     ) AS e
            ) ranked
            WHERE rn_building <= ${maxPerBuilding} AND rn_total <= ${maxPrecinct}
            ORDER BY (e->>'written_at')::bigint ASC
          ) final_entries
        )
      ON CONFLICT (player_id, precinct_id) DO UPDATE
        SET declaration_ledger = EXCLUDED.declaration_ledger
    `);

    // Read back to count total entries.
    const rows = await this.db
      .select({ declaration_ledger: precinctMemory.declaration_ledger })
      .from(precinctMemory)
      .where(and(
        eq(precinctMemory.player_id, playerId),
        eq(precinctMemory.precinct_id, precinctId),
      ))
      .limit(1);

    const ledger = (rows[0]?.declaration_ledger ?? []) as DeclarationEntry[];
    return { ok: true, entryId, totalEntries: Array.isArray(ledger) ? ledger.length : 0 };
  }

  /**
   * `GET /v1/_test/reputation/declaration-ledger/read` — R3a read primitive.
   *
   * Reads the declaration_ledger JSONB ring for a precinct from the real DB.
   * Returns { player_id, precinct_id, entries: DeclarationEntry[] } or 404 if row not found.
   *
   * TEST-ONLY. R2.2: declaration_ledger is BPD server-internal.
   */
  @Get('_test/reputation/declaration-ledger/read')
  async declarationLedgerRead(
    @Query('playerId')   playerId: string,
    @Query('precinctId') precinctIdStr: string,
  ): Promise<{ player_id: string; precinct_id: number; entries: DeclarationEntry[] }> {
    const precinctId = parseInt(precinctIdStr, 10);
    const rows = await this.db
      .select({
        player_id:          precinctMemory.player_id,
        precinct_id:        precinctMemory.precinct_id,
        declaration_ledger: precinctMemory.declaration_ledger,
      })
      .from(precinctMemory)
      .where(and(
        eq(precinctMemory.player_id, playerId),
        eq(precinctMemory.precinct_id, precinctId),
      ))
      .limit(1);

    const row = rows[0];
    if (!row) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `No precinct_memory row for player ${playerId} precinct ${precinctId}`,
      });
    }

    const entries = Array.isArray(row.declaration_ledger)
      ? (row.declaration_ledger as DeclarationEntry[])
      : [];
    return {
      player_id:  row.player_id,
      precinct_id: row.precinct_id,
      entries,
    };
  }

  // ── R5a: LekMemoryService routes ───────────────────────────────────────────────────────────────

  /**
   * `POST /v1/_test/reputation/lek/bind-operator` — R5a: bindOperator().
   *
   * Push an operator onto the trailing-op FIFO for a lek cell.
   * FIFO depth bounded by `lek_inheritance_slots` (registry, DD-REG-NAME).
   * On first bind: creates the cell row + initialises lambda_weight = lek_position_weight_lambda.
   * Returns { ok: true }.
   *
   * TEST-ONLY. R2.2: trailing_operator_ids is server-side private.
   */
  @Post('_test/reputation/lek/bind-operator')
  @HttpCode(200)
  async lekBindOperator(
    @Body() body: LekBindOperatorBody,
  ): Promise<{ ok: true }> {
    if (!body.playerId || body.cellId == null || !body.operatorId) {
      throw new ApiError('VALIDATION_FAILED', {
        message: 'bind-operator requires { playerId: string, cellId: number, operatorId: string }',
      });
    }
    await this.lekMemoryService.bindOperator(body.playerId, body.cellId, body.operatorId);
    return { ok: true };
  }

  /**
   * `POST /v1/_test/reputation/lek/record-fairness` — R5a: recordDealFairness().
   *
   * Stamp a nibble fairness signature on a lek cell for an operator's deal.
   * Nibble [0-15]: 0-3 = negative/short-pay (canon :129), 4-11 = neutral, 12-15 = fair.
   * Short-pay / failed deals MUST pass fairnessSignature ∈ [0, 3].
   * Returns { ok: true }.
   *
   * TEST-ONLY. R2.2: trailing_fairness_signatures is server-side private.
   * Value-sensitivity: short-pay (nibble 0-3) stamps a NEGATIVE signature → aggregate falls.
   */
  @Post('_test/reputation/lek/record-fairness')
  @HttpCode(200)
  async lekRecordFairness(
    @Body() body: LekRecordFairnessBody,
  ): Promise<{ ok: true }> {
    if (!body.playerId || body.cellId == null || !body.operatorId || body.fairnessSignature == null) {
      throw new ApiError('VALIDATION_FAILED', {
        message: 'record-fairness requires { playerId, cellId, operatorId, fairnessSignature }',
      });
    }
    await this.lekMemoryService.recordDealFairness(
      body.playerId,
      body.cellId,
      body.operatorId,
      body.fairnessSignature,
    );
    return { ok: true };
  }

  /**
   * `POST /v1/_test/reputation/lek/force-decay-tick` — R5a: force-trigger runDecayTick().
   *
   * Invokes `LekMemoryService.runDecayTick()` DIRECTLY for the given player + weekId.
   * Does NOT advance 7 real game-days tick-by-tick (fast path for specs).
   * The REAL scheduler fires this via `onApplicationBootstrap` + `Cadence.WEEKLY`.
   *
   * Returns { ok: true, weekId }.
   *
   * TEST-ONLY. R2.2: lambda_weight decay is server-only (never forwarded to real client).
   */
  @Post('_test/reputation/lek/force-decay-tick')
  @HttpCode(200)
  async lekForceDecayTick(
    @Body() body: LekForceDecayTickBody,
  ): Promise<{ ok: true; weekId: number }> {
    if (!body.playerId || typeof body.weekId !== 'number') {
      throw new ApiError('VALIDATION_FAILED', {
        message: 'force-decay-tick requires { playerId: string, weekId: number }',
      });
    }
    const ctx: CitySimTickContext = {
      playerId:   body.playerId,
      cadence:    Cadence.WEEKLY,
      gameMinute: body.weekId * 7 * 24 * 60, // synthetic gameMinute consistent with weekId
    };
    await this.lekMemoryService.runDecayTick(ctx, body.weekId);
    return { ok: true, weekId: body.weekId };
  }

  /**
   * `GET /v1/_test/reputation/lek/aggregate?playerId=<id>&cellId=<n>` — R5a: read position aggregate.
   *
   * Returns the R2.2-compliant client surface of getPositionMemoryAggregate():
   * { bucket, textual_tag } — NO raw aggregate_fraction.
   *
   * R2.2: aggregate_fraction is SERVER-ONLY. This route exposes only the bucketed + textual surface.
   * The raw aggregate_fraction is available via /lek/true-state (TEST-ONLY DB assertion surface).
   */
  @Get('_test/reputation/lek/aggregate')
  async lekReadAggregate(
    @Query('playerId') playerId: string,
    @Query('cellId')   cellIdStr: string,
  ): Promise<{ bucket: string; textual_tag: string }> {
    const cellId = parseInt(cellIdStr, 10);
    const result = await this.lekMemoryService.getPositionMemoryAggregate(playerId, cellId);
    // R2.2: only return bucket + textual_tag (no raw aggregate_fraction to real clients).
    return { bucket: result.bucket, textual_tag: result.textual_tag };
  }

  /**
   * `GET /v1/_test/reputation/lek/true-state?playerId=<id>&cellId=<n>` — R5a: full server state.
   *
   * Returns the full server-side cell state for DB assertion:
   * { player_id, tile_id, trailing_operator_ids, trailing_fairness_signatures,
   *   last_active_tick, lambda_weight, decay_state, last_decay_week }
   *
   * Also includes the derived aggregate_fraction for value-sensitivity assertion.
   *
   * TEST-ONLY: server-side raw state (R2.2 — never forwarded to real client).
   * Returns 404 if no row found for this (player, cellId) pair.
   */
  @Get('_test/reputation/lek/true-state')
  async lekReadTrueState(
    @Query('playerId') playerId: string,
    @Query('cellId')   cellIdStr: string,
  ): Promise<Record<string, unknown>> {
    const cellId = parseInt(cellIdStr, 10);
    const state = await this.lekMemoryService.getCellState(playerId, cellId);
    if (!state) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `No lek_memory_cell_state row for player ${playerId} cell ${cellId}`,
      });
    }
    // Include the derived aggregate for value-sensitivity test assertions (TEST-ONLY).
    const aggregate = await this.lekMemoryService.getPositionMemoryAggregate(playerId, cellId);
    return {
      ...state,
      aggregate_fraction: aggregate.aggregate_fraction,
      bucket:             aggregate.bucket,
      textual_tag:        aggregate.textual_tag,
    };
  }

  // ── R7a: HiddenCurriculumService routes ───────────────────────────────────────────────────────

  /**
   * `POST /v1/_test/reputation/curriculum/set-flags` — R7a: upsert norms_flags.
   *
   * Creates the row if absent (first call for this lieutenant) or overwrites norms_flags.
   * Used for test seeding pre-conditions (E2E specs). Witnessed ring is NOT touched on update.
   * Returns { ok: true }.
   *
   * TEST-ONLY. R2.2: norms_flags is server-side private (never forwarded to real client).
   * DD-HC-GREENFIELD: HiddenCurriculumService is built greenfield by D2 R7a (04a ch14 primary owner).
   */
  @Post('_test/reputation/curriculum/set-flags')
  @HttpCode(200)
  async curriculumSetFlags(
    @Body() body: CurriculumSetFlagsBody,
  ): Promise<{ ok: true }> {
    if (!body.lieutenantId || !body.playerId || !body.flags) {
      throw new ApiError('VALIDATION_FAILED', {
        message: 'set-flags requires { lieutenantId: string, playerId: string, flags: Partial<NormsFlags> }',
      });
    }
    await this.hiddenCurriculumService.setNormsFlags(
      body.lieutenantId,
      body.playerId,
      body.flags,
    );
    return { ok: true };
  }

  /**
   * `POST /v1/_test/reputation/curriculum/append-event` — R7a: append a witnessed event.
   *
   * Appends one event to the per-lieutenant witnessed_event_ring (FIFO, evicts oldest when full).
   * event_type must be 0-3 (2-bit code — see EVENT_TYPE_TO_NORMS in HiddenCurriculumService).
   * Buffer size from registry `curriculum_witnessed_event_buffer` (no inline — DD-REG-NAME).
   * Returns { ok: true, ringLength }.
   *
   * TEST-ONLY. R2.2: witnessed_event_ring is server-side private.
   */
  @Post('_test/reputation/curriculum/append-event')
  @HttpCode(200)
  async curriculumAppendEvent(
    @Body() body: CurriculumAppendEventBody,
  ): Promise<{ ok: true; ringLength: number }> {
    if (!body.lieutenantId || !body.playerId || body.eventType == null) {
      throw new ApiError('VALIDATION_FAILED', {
        message: 'append-event requires { lieutenantId: string, playerId: string, eventType: number (0-3) }',
      });
    }
    if (body.eventType < 0 || body.eventType > 3) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `append-event: eventType must be 0-3, got ${body.eventType}`,
      });
    }
    const result = await this.hiddenCurriculumService.appendWitnessedEvent(
      body.lieutenantId,
      body.playerId,
      body.eventType,
    );
    return { ok: true, ringLength: result.ringLength };
  }

  /**
   * `POST /v1/_test/reputation/curriculum/force-weekly-tick` — R7a: force-trigger weekly review tick.
   *
   * Invokes `HiddenCurriculumService.runWeeklyReviewTick()` DIRECTLY for the given player + weekId.
   * Does NOT advance 7 real game-days tick-by-tick (fast path for specs).
   * The REAL scheduler fires this via `onApplicationBootstrap` + `Cadence.WEEKLY` (order 6).
   *
   * Returns { ok: true, weekId }.
   *
   * TEST-ONLY. R2.2: norms_flags computation is server-only (never forwarded to real client).
   */
  @Post('_test/reputation/curriculum/force-weekly-tick')
  @HttpCode(200)
  async curriculumForceWeeklyTick(
    @Body() body: CurriculumForceTickBody,
  ): Promise<{ ok: true; weekId: number }> {
    if (!body.playerId || typeof body.weekId !== 'number') {
      throw new ApiError('VALIDATION_FAILED', {
        message: 'force-weekly-tick requires { playerId: string, weekId: number }',
      });
    }
    const ctx: CitySimTickContext = {
      playerId:   body.playerId,
      cadence:    Cadence.WEEKLY,
      gameMinute: body.weekId * 7 * 24 * 60, // synthetic gameMinute consistent with weekId
    };
    await this.hiddenCurriculumService.runWeeklyReviewTick(ctx, body.weekId);
    return { ok: true, weekId: body.weekId };
  }

  /**
   * `GET /v1/_test/reputation/curriculum/norms-vector?lieutenantId=<id>` — R7a: read full norms vector.
   *
   * Returns the full server-side per-lieutenant norms vector for DB assertion:
   * { lieutenant_id, player_id, norms_flags, witnessed_event_ring, ring_head, last_review_week }
   *
   * Returns 404 if no row found for this lieutenant.
   *
   * TEST-ONLY: server-side raw state (R2.2 — never forwarded to real client).
   * Real client gets uniform tells per portrait (R7b — below).
   */
  @Get('_test/reputation/curriculum/norms-vector')
  async curriculumReadNormsVector(
    @Query('lieutenantId') lieutenantId: string,
    @Query('playerId') playerId: string,
  ): Promise<Record<string, unknown>> {
    // W6a C4 (finding #17) — `playerId` is now a required query param, joint-scoped inside
    // `readNormsVector`. A lieutenant belonging to a DIFFERENT player now hits this SAME 404
    // branch that already fired for "no row at all" (D2 — byte-identical for both cases).
    const vector = await this.hiddenCurriculumService.readNormsVector(lieutenantId, playerId);
    if (!vector) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `No hidden_curriculum_norms_vector row for lieutenant ${lieutenantId}`,
      });
    }
    return vector as unknown as Record<string, unknown>;
  }

  // ── R7b: HiddenCurriculumService uniform-tell projection ──────────────────────────────────────

  /**
   * `GET /v1/_test/reputation/curriculum/uniform-tells?lieutenantId=<id>` — R7b: uniform-tell projection.
   *
   * Invokes `HiddenCurriculumService.projectUniformTells()` and returns the R2.2-compliant
   * presentation enums:
   *   { collar: 'buttoned'|'open', sleeves: 'rolled'|'down', watch: 'visible'|'hidden', gloves: 'clean'|'dirty' }
   *
   * R2.2 invariant: NEVER includes raw NormsFlags keys (no `punctuality`, `ledger_hygiene`, etc.).
   * The 4 non-tell flags (silence_at_handoffs, debt_handling, escalation_reflex, restraint_with_force)
   * are downstream-effect hooks — they do NOT appear in this response.
   *
   * Flag → tell enum mapping (canon :170):
   *   collar  ← ledger_hygiene              (true → 'buttoned', false → 'open')
   *   sleeves ← fairness_to_subordinates    (true → 'rolled',   false → 'down')
   *   watch   ← punctuality                 (true → 'visible',  false → 'hidden')
   *   gloves  ← discretion_around_civilians (true → 'clean',    false → 'dirty')
   *
   * If no row exists for the lieutenant, returns NEUTRAL tells (all flags = false):
   *   { collar: 'open', sleeves: 'down', watch: 'hidden', gloves: 'dirty' }
   *   (No 404 — neutral-on-absent is correct behaviour for the projection surface.)
   *
   * TEST-ONLY route. R2.2: this is the projection surface — the only form in which norm
   * information reaches a client route (never the raw vector).
   *
   * NO new tunables — uniform tells are a closed qualitative presentation domain (not sim-balance).
   */
  @Get('_test/reputation/curriculum/uniform-tells')
  async curriculumReadUniformTells(
    @Query('lieutenantId') lieutenantId: string,
    @Query('playerId') playerId: string,
  ): Promise<UniformTellProjection> {
    // W6a C4 (finding #17 cascade) — `playerId` is now a required query param. A lieutenant
    // belonging to a DIFFERENT player now hits the SAME neutral-tells branch as "no row at all"
    // (this route's own established idiom — a client-facing PROJECTION surface where absence
    // already means neutral, not 404; see the docblock above).
    const projection = await this.hiddenCurriculumService.projectUniformTells(lieutenantId, playerId);

    // Absent row → neutral tells (all flags = false). Not a 404 — neutral-on-absent is correct.
    if (!projection) {
      return { collar: 'open', sleeves: 'down', watch: 'hidden', gloves: 'dirty' };
    }

    return projection;
  }

  // ── R8a: ForbiddenTriadDetectionService routes ────────────────────────────────────────────────

  /**
   * `POST /v1/_test/reputation/triad/update-membership` — R8a: updateStrongTieMembership().
   *
   * Canon signature (:250): `updateStrongTieMembership(playerId, contactId, interactionsCount)`.
   * Promotes `contactId` iff interactionsCount >= `triad_strong_tie_threshold` (registry REUSE gdd/14 L975).
   * Enforces N_strong cap: `reputation.forbidden_triad_n_strong_cap` (registry NEW gdd/14 D2-R8a).
   * Evicts OLDEST contact when 13th qualifies; removes evicted contact's pair-state rows.
   * Creates pair-state rows for new_contact <-> each surviving member (UNMET start state).
   *
   * Returns { ok: true, promoted, setSize, pairCount }.
   *
   * TEST-ONLY. R2.2: strong_tie_members + pair-state raw scalars are server-only.
   * DD-REG-NAME: no inline numeric literals for threshold or cap — all from registry.
   */
  @Post('_test/reputation/triad/update-membership')
  @HttpCode(200)
  async triadUpdateMembership(
    @Body() body: TriadUpdateMembershipBody,
  ): Promise<{ ok: true; promoted: boolean; setSize: number; pairCount: number }> {
    if (!body.playerId || !body.contactId || body.interactionsCount == null) {
      throw new ApiError('VALIDATION_FAILED', {
        message: 'update-membership requires { playerId: string, contactId: string, interactionsCount: number }',
      });
    }
    const result = await this.forbiddenTriadService.updateStrongTieMembership(
      body.playerId,
      body.contactId,
      body.interactionsCount,
    );
    return { ok: true, ...result };
  }

  /**
   * `GET /v1/_test/reputation/triad/strong-tie-set?playerId=<id>` — R8a: read strong-tie set.
   *
   * Returns the current ordered strong-tie set for a player:
   *   { playerId, members: string[], setSize: number }
   *
   * members: ordered array of contact UUIDs (oldest first = eviction order).
   * setSize: count of members (bounded by reputation.forbidden_triad_n_strong_cap).
   *
   * TEST-ONLY: server-side raw state (R2.2 — never forwarded to real client).
   * Returns empty set (setSize=0, members=[]) if no strong-tied contacts yet.
   */
  @Get('_test/reputation/triad/strong-tie-set')
  async triadReadStrongTieSet(
    @Query('playerId') playerId: string,
  ): Promise<{ playerId: string; members: string[]; setSize: number }> {
    if (!playerId) {
      throw new ApiError('VALIDATION_FAILED', { message: 'strong-tie-set requires playerId' });
    }
    const result = await this.forbiddenTriadService.getStrongTieSet(playerId);
    return { playerId, ...result };
  }

  /**
   * `GET /v1/_test/reputation/triad/pair-states?playerId=<id>` — R8a+R8b: read pair-state rows.
   *
   * Returns all pair-state rows for a player (excluding the sentinel row):
   *   { playerId, pairs: Array<{ pair_key, triadic_state, anomaly_pressure_bucket, last_event_tick,
   *     observer_interest_flag, last_eval_week }>, pairCount }
   *
   * R8b fields: observer_interest_flag (boolean) + last_eval_week (number|null).
   * pairCount: count of pairs (bounded by C(N_strong,2) <= 66 for N_strong <= 12).
   *
   * TEST-ONLY: server-side raw state (R2.2 — never forwarded to real client).
   * anomaly_pressure_bucket + observer_interest_flag are server-only.
   * Returns empty pairs array if no strong-tied contacts have been promoted yet.
   */
  @Get('_test/reputation/triad/pair-states')
  async triadReadPairStates(
    @Query('playerId') playerId: string,
  ): Promise<{ playerId: string; pairs: Array<Record<string, unknown>>; pairCount: number }> {
    if (!playerId) {
      throw new ApiError('VALIDATION_FAILED', { message: 'pair-states requires playerId' });
    }
    const result = await this.forbiddenTriadService.getPairStates(playerId);
    return { playerId, ...result };
  }

  // ── R8b: ForbiddenTriadDetectionService weekly tick + dissolve actions ────────────────────────

  /**
   * `POST /v1/_test/reputation/triad/force-weekly-tick` — R8b: force-trigger evaluatePairs().
   *
   * Invokes `ForbiddenTriadDetectionService.evaluatePairs()` DIRECTLY for the given player + weekId.
   * Does NOT advance 7 real game-days tick-by-tick (fast path for specs).
   * The REAL scheduler fires this via `onApplicationBootstrap` + `Cadence.WEEKLY` (order 7).
   *
   * Returns { ok: true, weekId }.
   *
   * TEST-ONLY. R2.2: anomaly_pressure_bucket + observer_interest_flag are server-only.
   */
  @Post('_test/reputation/triad/force-weekly-tick')
  @HttpCode(200)
  async triadForceWeeklyTick(
    @Body() body: TriadForceTickBody,
  ): Promise<{ ok: true; weekId: number }> {
    if (!body.playerId || typeof body.weekId !== 'number') {
      throw new ApiError('VALIDATION_FAILED', {
        message: 'force-weekly-tick requires { playerId: string, weekId: number }',
      });
    }
    const ctx: CitySimTickContext = {
      playerId:   body.playerId,
      cadence:    Cadence.WEEKLY,
      gameMinute: body.weekId * 7 * 24 * 60, // synthetic gameMinute consistent with weekId
    };
    await this.forbiddenTriadService.evaluatePairs(body.playerId, ctx, body.weekId);
    return { ok: true, weekId: body.weekId };
  }

  /**
   * `POST /v1/_test/reputation/triad/introduce-pair` — R8b: dissolve action introducePair().
   *
   * Invokes `ForbiddenTriadDetectionService.introducePair(playerId, contactIdA, contactIdB)`.
   * Transitions the pair's `triadic_state` to BONDED (2) + decays anomaly_pressure_bucket by
   * `triadPressureDecayAcknowledgedWeekly` (registry, no inline).
   *
   * Canon :210: "Introducing the pair (after which they may bond and start cutting side deals)."
   *
   * Returns { ok: true }.
   *
   * TEST-ONLY. R2.2: pair state is server-only.
   */
  @Post('_test/reputation/triad/introduce-pair')
  @HttpCode(200)
  async triadIntroducePair(
    @Body() body: TriadIntroducePairBody,
  ): Promise<{ ok: true }> {
    if (!body.playerId || !body.contactIdA || !body.contactIdB) {
      throw new ApiError('VALIDATION_FAILED', {
        message: 'introduce-pair requires { playerId: string, contactIdA: string, contactIdB: string }',
      });
    }
    await this.forbiddenTriadService.introducePair(body.playerId, body.contactIdA, body.contactIdB);
    return { ok: true };
  }

  /**
   * `POST /v1/_test/reputation/triad/drop-contact` — R8b: dissolve action dropContact().
   *
   * Invokes `ForbiddenTriadDetectionService.dropContact(playerId, contactId)`.
   * Removes the contact from the strong-tie set + deletes all its pair-state rows.
   * REUSE R8a eviction path (_deleteContactPairs + _saveStrongTieMembers).
   *
   * Canon :212: "Quietly retiring one of the contacts."
   *
   * Returns { ok: true }.
   *
   * TEST-ONLY. R2.2: strong-tie set is server-only.
   */
  @Post('_test/reputation/triad/drop-contact')
  @HttpCode(200)
  async triadDropContact(
    @Body() body: TriadDropContactBody,
  ): Promise<{ ok: true }> {
    if (!body.playerId || !body.contactId) {
      throw new ApiError('VALIDATION_FAILED', {
        message: 'drop-contact requires { playerId: string, contactId: string }',
      });
    }
    await this.forbiddenTriadService.dropContact(body.playerId, body.contactId);
    return { ok: true };
  }

  /**
   * `GET /v1/_test/reputation/triad/last-interest-flag-event` — R8b: bus emission probe.
   *
   * Returns the last `ForbiddenTriadInterestFlag` event recorded from the CityEventBus for
   * the given player + pairKey combination. The controller's in-memory subscriber (`interestFlagEvents`
   * map) records every emitted event — this route reads the latest one for the given pairKey.
   *
   * Returns { recorded: boolean, event: ForbiddenTriadInterestFlagEvent | null }.
   *   recorded=true  → an event was emitted for this pairKey at least once.
   *   recorded=false → no event emitted yet for this pairKey.
   *
   * TEST-ONLY assertion surface for Gate B criterion (iv): the bus event is actually emitted when
   * the pressure crosses H_observer. R2.2: server-only event — never forwarded to real client.
   *
   * P5: the event itself carries no raw anomaly_pressure_bucket (server-only) — ONLY pairKey +
   * gameMinute. The spec asserts `event.anomaly_pressure_bucket` is undefined.
   */
  @Get('_test/reputation/triad/last-interest-flag-event')
  triadLastInterestFlagEvent(
    @Query('playerId') playerId: string,
    @Query('pairKey')  pairKey: string,
  ): { recorded: boolean; event: ForbiddenTriadInterestFlagEvent | null } {
    if (!playerId || !pairKey) {
      throw new ApiError('VALIDATION_FAILED', {
        message: 'last-interest-flag-event requires playerId and pairKey query params',
      });
    }
    const event = this.interestFlagEvents.get(pairKey) ?? null;
    // Only return events for the requested playerId (defense-in-depth — pairKey is per-player in practice).
    if (event !== null && event.playerId !== playerId) {
      return { recorded: false, event: null };
    }
    return { recorded: event !== null, event };
  }

  // ────────────────────────────────── R9 MIS ROUTING ROUTES ──────────────────────────────────────

  /**
   * `POST /v1/_test/reputation/mis/emit-leak-mis` — R9: emit HiddenCurriculumLeakMISEvent on the bus.
   *
   * Emits a HiddenCurriculumLeakMISEvent directly onto the CityEventBus. InspectionQueueService
   * will latch the pending inject in `pendingMISLeakInjects` and consume it at the next dispatch tick
   * (triggered by a POST /_test/citysim/advance with 720 ticks = 12h).
   *
   * Returns { ok: true, event } — the exact event emitted (for field-shape assertion).
   * TEST-ONLY — not registered in production.
   *
   * P5/R2.2: the event carries ONLY qualitative identity (playerId + lieutenantId + districtId +
   * gameMinute) — NEVER the raw norms_flags vector. This route is the test-seam equivalent of
   * what HiddenCurriculumService.runWeeklyReviewTick() would emit in production for a lieutenant
   * with silence_at_handoffs=OFF (the full organic wiring is deferred to R13 — no district at that
   * production site; this test hook provides the grounded E2E path).
   */
  @Post('_test/reputation/mis/emit-leak-mis')
  @HttpCode(200)
  misEmitLeakMIS(
    @Body() body: MISEmitLeakMISBody,
  ): { ok: true; event: HiddenCurriculumLeakMISEvent } {
    if (!body.playerId || !body.lieutenantId || body.districtId === undefined || body.gameMinute === undefined) {
      throw new ApiError('VALIDATION_FAILED', {
        message: 'emit-leak-mis requires { playerId, lieutenantId, districtId, gameMinute }',
      });
    }
    const event: HiddenCurriculumLeakMISEvent = {
      type: 'hidden_curriculum_leak_mis',
      playerId:     body.playerId,
      lieutenantId: body.lieutenantId,
      districtId:   body.districtId,
      gameMinute:   body.gameMinute,
    };
    this.cityEventBus.emitHiddenCurriculumLeakMIS(event);
    return { ok: true, event };
  }

  /**
   * `POST /v1/_test/reputation/mis/emit-triad-flag` — R9: directly emit ForbiddenTriadInterestFlagEvent.
   *
   * Emits a ForbiddenTriadInterestFlagEvent directly onto the CityEventBus, bypassing the weekly tick.
   * InspectionQueueService will latch the pairKey bias in `latchedTriadPairs` for use on the next
   * dispatch tick. Useful for E2E tests that want to assert the bias effect without needing to advance
   * enough game-weeks to cross H_observer naturally.
   *
   * Returns { ok: true, event }.
   * TEST-ONLY — not registered in production.
   *
   * P5/R2.2: the event carries ONLY qualitative identity (playerId + pairKey + gameMinute) — NEVER the
   * raw anomaly_pressure_bucket. The R8b weekly tick path produces the same event shape.
   */
  @Post('_test/reputation/mis/emit-triad-flag')
  @HttpCode(200)
  misEmitTriadFlag(
    @Body() body: MISEmitTriadFlagBody,
  ): { ok: true; event: ForbiddenTriadInterestFlagEvent } {
    if (!body.playerId || !body.pairKey || body.gameMinute === undefined) {
      throw new ApiError('VALIDATION_FAILED', {
        message: 'emit-triad-flag requires { playerId, pairKey, gameMinute }',
      });
    }
    const event: ForbiddenTriadInterestFlagEvent = {
      type: 'forbidden_triad_interest_flag',
      playerId:   body.playerId,
      pairKey:    body.pairKey,
      gameMinute: body.gameMinute,
    };
    this.cityEventBus.emitForbiddenTriadInterestFlag(event);
    return { ok: true, event };
  }

  /**
   * `GET /v1/_test/reputation/mis/last-leak-mis-event` — R9: bus emission probe.
   *
   * Returns the last `HiddenCurriculumLeakMIS` event recorded from the CityEventBus for the given
   * player + districtId. The controller's in-memory subscriber (`leakMISEvents` map) records every
   * emitted event — this route reads the latest one for the given key.
   *
   * Returns { recorded: boolean, event: HiddenCurriculumLeakMISEvent | null }.
   *   recorded=true  → an event was emitted for this player+district at least once.
   *   recorded=false → no event emitted yet.
   *
   * TEST-ONLY assertion surface for R9: the bus event is emitted when emitHiddenCurriculumLeakMIS fires.
   * R2.2: server-only event — never forwarded to real client.
   *
   * P5: event carries ONLY qualitative identity (no raw norms_flags vector).
   */
  @Get('_test/reputation/mis/last-leak-mis-event')
  misLastLeakMISEvent(
    @Query('playerId')   playerId: string,
    @Query('districtId') districtIdQuery: string,
  ): { recorded: boolean; event: HiddenCurriculumLeakMISEvent | null } {
    if (!playerId || !districtIdQuery) {
      throw new ApiError('VALIDATION_FAILED', {
        message: 'last-leak-mis-event requires playerId and districtId query params',
      });
    }
    const districtId = Number.parseInt(districtIdQuery, 10);
    if (Number.isNaN(districtId)) {
      throw new ApiError('VALIDATION_FAILED', { message: 'districtId must be an integer' });
    }
    const key = `${playerId}:${districtId}`;
    const event = this.leakMISEvents.get(key) ?? null;
    return { recorded: event !== null, event };
  }

  // ── R11: Cross-mechanic divergence cue — declared rules vs absorbed norms (:180) ─────────────

  /**
   * `GET /v1/_test/reputation/divergence-cue?playerId=<id>&lieutenantId=<id>` — R11 probe.
   *
   * Returns the divergence cue for a (player, lieutenant) pair:
   *   {
   *     divergence_count: number,           // server-only raw scalar (R2.2 — TEST-ONLY route)
   *     cue: 'diverging' | 'aligned' | 'indeterminate',  // the public observable band (P5)
   *   }
   *
   * **Mapping:** a declared ruleId ∈ canonical norm names commits the player to that norm.
   *   divergence_count = count of committed norms that the lieutenant has absorbed OFF.
   *   cue = 'diverging' iff divergence_count ≥ reputation.divergence_salience_min_norms (registry).
   *   cue = 'aligned' iff divergence_count < threshold (and at least one norm commitment exists).
   *   cue = 'indeterminate' iff no declared rules map to a canonical norm name (no basis).
   *
   * **R2.2:** the raw divergence_count is exposed here ONLY because this is a TEST-ONLY route.
   *   A real client route (R12b) would surface ONLY the cue band (never the count).
   *   divergence_count is server-only (never forwarded to a real client).
   *
   * **No fabricated mechanic:** the comparison is purely derived from:
   *   - bossMirrorDeclarationLedger (declared_rules from R2a)
   *   - hiddenCurriculumNormsVector (norms_flags from R7a)
   *   No new scalar is persisted — computed on-the-fly per-request.
   *
   * Canon `:180`: "declared rules vs absorbed norms can diverge; divergence itself is observable publicly."
   * Tunable: `reputation.divergence_salience_min_norms` [PROPOSED DEFAULT=1][PROV-Y26Q2].
   */
  @Get('_test/reputation/divergence-cue')
  async reputationDivergenceCue(
    @Query('playerId')      playerId: string,
    @Query('lieutenantId')  lieutenantId: string,
  ): Promise<{ divergence_count: number; cue: 'diverging' | 'aligned' | 'indeterminate' }> {
    if (!playerId || !lieutenantId) {
      throw new ApiError('VALIDATION_FAILED', {
        message: 'divergence-cue requires playerId and lieutenantId query params',
      });
    }
    return this.bossMirrorService.getDivergenceCue(playerId, lieutenantId);
  }

  // ── R12b: Unified PLAYER-FACING Reputation Hub projection ────────────────────────────────────────

  /**
   * `GET /v1/_test/reputation/hub/projection` — R12b: unified player-facing R2.2 projection.
   *
   * Returns the banded composite reputation projection for a player — the B3 Reputation Hub surface.
   * This is the "player route" that a game client would call to populate the Reputation Hub screen.
   *
   * P5 CENTRAL: ZERO raw reputation scalar in the response:
   *   - No violation_density, defection_tolerance, consistency_index
   *   - No restraint_ratio, offer_terms float, collateral_amount
   *   - No position_memory_aggregate, lambda, fairness_signature
   *   - No anomaly_pressure float, observer_interest_flag raw bool
   *   - No divergence_count, norms_flags raw vector
   * Only banded/qualitative surfaces reach the player:
   *   - portrait_posture (band) + declared_rules (canon-public :65) + consistency_cue (band)
   *   - offer_posture ('standard'|'wary') + marginalia (canon-public :95)
   *   - footprint_mark (bool) + textual_tag (LekTileReputationBucket string — B5 REUSE)
   *   - uniform_tells (4 portrait cues — R7b REUSE)
   *   - dotted_line_pairs + observer_cue
   *
   * Query params:
   *   playerId       — the player
   *   lieutenantId   — lieutenant to read Boss Mirror + Curriculum cues for
   *   counterpartyId — counterparty to read Restraint offer terms for
   *   cellId         — lek cell tile_id to read B5 footprint+tag for
   *
   * TEST-ONLY surface: in production this route is not registered; the real client would hit the
   * game-back player route (to be added to endpoint_catalogue.md at R13 closeout).
   * The projection logic lives in `ReputationHubService` (always-on service, not test-gated).
   *
   * R2.2: this is the ONLY player-facing surface for all 5 reputation sub-mechanics.
   *        The true state (raw scalars) lives only behind the R12a BO ops endpoint.
   */
  @Get('_test/reputation/hub/projection')
  async reputationHubProjection(
    @Query('playerId')        playerId:        string,
    @Query('lieutenantId')    lieutenantId:    string,
    @Query('counterpartyId')  counterpartyId:  string,
    @Query('cellId')          cellIdStr:       string,
  ): Promise<ReputationHubProjection> {
    if (!playerId || !lieutenantId || !counterpartyId || !cellIdStr) {
      throw new ApiError('VALIDATION_FAILED', {
        message: 'hub/projection requires playerId, lieutenantId, counterpartyId, and cellId query params',
      });
    }
    const cellId = parseInt(cellIdStr, 10);
    if (isNaN(cellId)) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `hub/projection: cellId must be an integer, got "${cellIdStr}"`,
      });
    }
    return this.reputationHubService.projectReputationHub(playerId, lieutenantId, counterpartyId, cellId);
  }

}
