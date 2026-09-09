// IMPLEMENTS: docs/superpowers/plans/2026-07-01-04d-B-internal-affairs-plan.md C0 (boot probe) + C1 (schema probe)
//             + C4 (investigation lifecycle probes — evaluate-threshold + run-surveillance + investigation-opened-events)
//             + C5 (forward cascade probes — force-discovery + discovered-events)
//             + C6 (decay probes — apply-decay direct probe for idempotency + cool-off + use-spreading proofs)
//             + C7 (intel-op probe — buy-intel; burn-action DEFERRED TD)
//             Pattern: services/game-back/src/operational/legal/legal-test.controller.ts
//             — 04d-B C0 — 2026-07-01 | C1 additions — 2026-07-01 | C4 additions — 2026-07-02 | C5 additions — 2026-07-02 | C6 additions — 2026-07-02 | C7 additions — 2026-07-02
//
// `IATestController` — TEST-ONLY probe routes for InternalAffairsModule.
//
// C0 Routes:
//   GET /v1/_test/ia/ping — returns { ok: true } if InternalAffairsModule is in the DI graph.
//     This is the SOLE C0 E2E assertion target: 404 = module NOT wired, 200 = wired.
//     The constructor injects LawyerService + LegalProjectionService — if either fails to
//     resolve, NestJS bootstrap fails before this handler can return, proving §13 DI resolution.
//
// C2 Routes (tunables probes — 04d-B C2):
//   GET /v1/_test/ia/read-tunables
//     Returns all IATunables getter values as a plain object.
//     Used by ia_tunables_bootstrap.spec.ts to assert value-sensitive defaults.
//     Anti-fabrication: reads REAL getter output via the live server — not hardcoded echoes.
//
//   POST /v1/_test/ia/probe-clamp
//     Body: { key: string, value: number }
//     Returns: { clamped: number }
//     Applies clampIAToRange(key, value). FALSIFIABLE: value=999 for a capped key → clamped.
//
// C1 Routes (schema persistence probes — 04d-B C1):
//   POST /v1/_test/ia/seed-target
//     Body: { targetType?: string } — default 'lawyer'.
//     Creates an internal_affairs_targets row (target_npc_id = TEST_IA_NPCID sentinel).
//     Returns: { targetId: string }
//
//   GET /v1/_test/ia/read-target?targetId=<uuid>
//     Returns the full internal_affairs_targets row (serialized — bigint → string).
//     404 if not found.
//
//   POST /v1/_test/ia/seed-investigation
//     Body: { targetId: string }
//     Creates an ia_investigations row (closes_at = now + 21 days).
//     Returns: { investigationId: string, targetId: string }
//
//   GET /v1/_test/ia/read-investigation?investigationId=<uuid>
//     Returns the full ia_investigations row (serialized).
//     404 if not found.
//
//   POST /v1/_test/ia/seed-intel-purchase
//     Body: { targetId: string }
//     Creates a test player + account, then an ia_intel_purchases row.
//     Returns: { purchaseId: string, playerId: string, targetId: string }
//
//   GET /v1/_test/ia/read-intel-purchase?purchaseId=<uuid>
//     Returns the full ia_intel_purchases row (serialized — cost_cents bigint → string).
//     404 if not found.
//
//   POST /v1/_test/ia/delete-player
//     Body: { playerId: string }
//     Deletes the player (CASCADE removes ia_intel_purchases rows).
//     Returns: { deleted: true }
//
// C3+ Routes: probe routes for recordCorruptUse, investigation lifecycle, etc.
// C4 Routes:
//   GET  /v1/_test/ia/investigation-opened-events — returns captured InvestigationOpenedEvents since server start.
//   POST /v1/_test/ia/evaluate-threshold — direct probe: call evaluateThresholdCrossing({ gameMinute }).
//   POST /v1/_test/ia/run-surveillance   — direct probe: call runSurveillanceWindow({ investigationId, gameDay, playerId?, gameMinute? }).
// C5 Routes:
//   GET  /v1/_test/ia/discovered-events — returns captured IATargetDiscoveredEvents since server start.
//   POST /v1/_test/ia/force-discovery   — direct discovery probe: call executeDiscovery({ targetId, gameMinute }).
//     Anti-fig-leaf driver for reserved types (C5 plan); also used for the double-condition falsifiable proof.
// C6 Routes:
//   POST /v1/_test/ia/apply-decay — direct decay probe: call applyWeeklySuspicionDecay({ gameMinute }).
//     Returns { decayed: number, weekId: number }.
//     Used by ia_decay_mitigations.spec.ts for: idempotency (2× same gameMinute = no-op),
//     cool-off (active-this-week target NOT decayed), falsifiable rate (different rate → different decay).
// C7 Routes:
//   POST /v1/_test/ia/buy-intel — Fixer intel-op probe: call IAIntelPurchaseService.buyApproxBandReveal.
//     Body: { playerId: string, targetId: string }
//     Returns: { purchaseId, band, costCents } (NEVER suspicion_level — R2.2/P5).
//     Direct service call (projection-only Fixer label, NO DSL binding — plan gap #6).
//     R2.3: ALL band cuts registry-sourced (intelBandCutWatching [PROV-Y26Q2] + 2 reused).
//     Proof (a): debit → balance before/after; 402 on insufficient funds; ia_intel_purchases row written.
//     DEFERRED: execute-burn (IABurnActionService) — burn-action requires real heat/rep seams + durable
//       neutralize fix (discovered_at/NIGHTLY-scan conflict). TD routed in plan §C7.
// C8 Routes:
//   POST /v1/_test/ia/actor-status — actor status probe: call IAProjectionService.getActorStatus.
//     Body: { playerId: string, targetNpcId: string }
//     Returns: { status: 'steady'|'nervous'|'unavailable'|'gone' } — NEVER suspicion_level (R2.2/P5).
//     Player isolation: only returns non-steady if playerId is in cooperators (server-side check).
// C9+ Routes: BO admin endpoint probes.

import { Controller, Get, Post, Body, Query, HttpException, HttpStatus, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { sql, eq } from 'drizzle-orm';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import { LawyerService } from '../legal/lawyer.service';
import { LegalProjectionService } from '../legal/legal-projection.service';
import { CityEventBus } from '../../citysim/events/city-event-bus';
import type {
  Tier3LawyerUsedEvent,
  InvestigationOpenedEvent,
  IATargetDiscoveredEvent,
} from '../../citysim/events/city-event-bus';
import { IAInvestigationService } from './ia-investigation.service';
import { IADiscoveryService } from './ia-discovery.service';
import { IADecayService } from './ia-decay.service';
import { IAIntelPurchaseService } from './ia-intel-purchase.service';
import { IAProjectionService } from './ia-projection.service';
import type { ActorStatusIndicator } from './ia-projection.service';
import { IATunables, clampIAToRange } from './ia.tunables';
import { IATargetService } from './ia-target.service';
import type { IATargetType, IAActionSeverity } from './ia-target.service';
import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import {
  internalAffairsTarget,
  iaInvestigation,
  iaIntelPurchase,
} from '../../db/schema/internal_affairs';
import { player } from '../../db/schema/player';
import { account } from '../../db/schema/account';

// ── C1 module-level helpers ──────────────────────────────────────────────────────────────────────

/** Monotone callsign counter — prevents unique_constraint violations on player.callsign. */
let _iaTestCallsignCounter = 0;
function nextIATestCallsign(): string {
  const n = ++_iaTestCallsignCounter;
  return `ia-${(Date.now() % 100_000_000).toString().padStart(8, '0')}-${n.toString().padStart(4, '0')}`;
}

/**
 * Serialize a DB row for JSON transport: converts BigInt values to string.
 * Required because JSON.stringify() throws on BigInt (bigint columns like cost_cents).
 */
function serializeRow(row: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!row) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = typeof v === 'bigint' ? String(v) : v;
  }
  return out;
}

/** Sentinel NPC uuid used by seed-target (no real NPC needed for C1 schema tests). */
const TEST_IA_NPCID = '00000000-0000-0000-0000-000000004d01';

// ── Valid target type members (mirrors ia_target_type enum) ─────────────────────────────────────
const VALID_TARGET_TYPES = new Set<string>([
  'clerk', 'port_inspector', 'lawyer', 'broker', 'judge_aide',
]);

// ── C3 — captured Tier3LawyerUsedEvent in-memory store (TEST-ONLY, R-EC-2) ─────────────────────
// Pattern mirrors LegalTestController._capturedLawyerBurnedEvents (legal-test.controller.ts:186).
// The bus subscriber in onModuleInit appends to this array on each event.
// Routes: GET /v1/_test/ia/tier3-used-events → { count, events[] }.

interface CapturedTier3LawyerUsedEvent {
  readonly playerId: string;
  readonly lawyerId: string;
  readonly gameMinute: number;
  readonly capturedAt: number; // process.hrtime.bigint() cast to number for JSON
}

// ── C4 — captured InvestigationOpenedEvent in-memory store (TEST-ONLY, R-EC-2) ─────────────────
// Pattern mirrors _capturedTier3LawyerUsedEvents above.
// Routes: GET /v1/_test/ia/investigation-opened-events → { count, events[] }.

interface CapturedInvestigationOpenedEvent {
  readonly targetId: string;
  readonly targetType: string;
  readonly gameMinute: number;
  readonly capturedAt: number; // process.hrtime.bigint() cast to number for JSON
}

// ── C5 — captured IATargetDiscoveredEvent in-memory store (TEST-ONLY, R-EC-2) ──────────────────
// Pattern mirrors _capturedInvestigationOpenedEvents above.
// Routes: GET /v1/_test/ia/discovered-events → { count, events[] }.

interface CapturedIATargetDiscoveredEvent {
  readonly targetId: string;
  readonly targetType: string;
  readonly gameMinute: number;
  readonly capturedAt: number; // process.hrtime.bigint() cast to number for JSON
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class IATestController implements OnModuleInit {
  private readonly logger = new Logger(IATestController.name);

  // C3: in-memory capture of Tier3LawyerUsedEvents for E2E chain proof.
  private readonly _capturedTier3LawyerUsedEvents: CapturedTier3LawyerUsedEvent[] = [];

  // C4: in-memory capture of InvestigationOpenedEvents for E2E chain proof.
  private readonly _capturedInvestigationOpenedEvents: CapturedInvestigationOpenedEvent[] = [];

  // C5: in-memory capture of IATargetDiscoveredEvents for E2E chain proof.
  private readonly _capturedIATargetDiscoveredEvents: CapturedIATargetDiscoveredEvent[] = [];

  constructor(
    // §13 seam injection — proves DI graph resolves the merged 04d-A contract.
    // If either service is missing from the DI graph, bootstrap fails here
    // (not at ping-time), giving a clear boot error rather than a 500 at route call.
    private readonly lawyerService: LawyerService,
    private readonly legalProjection: LegalProjectionService,
    // C2: IATunables injection — registry-mirrored getters for 16 internal_affairs.* keys.
    private readonly tunables: IATunables,
    // C1: DB injection for schema persistence probes. DB is @Global() — no module import needed.
    @Inject(DB) private readonly db: DrizzleClient,
    // C3: IATargetService for direct recordCorruptUse probe.
    private readonly iaTargetService: IATargetService,
    // C4: IAInvestigationService for direct evaluate-threshold + run-surveillance probes.
    private readonly iaInvestigationService: IAInvestigationService,
    // C5: IADiscoveryService for direct force-discovery probe (anti-fig-leaf + double-condition).
    private readonly iaDiscoveryService: IADiscoveryService,
    // C6: IADecayService for direct apply-decay probe (decay + idempotency + cool-off proofs).
    private readonly iaDecayService: IADecayService,
    // C7: IAIntelPurchaseService for buy-intel probe (Fixer-mediated intel-op, direct service).
    private readonly iaIntelPurchaseService: IAIntelPurchaseService,
    // C8: IAProjectionService for actor-status probe (P5 wall — getActorStatus direct call).
    private readonly iaProjectionService: IAProjectionService,
    // C3: CityEventBus for Tier3LawyerUsedEvent subscription (chain proof).
    private readonly bus: CityEventBus,
  ) {}

  /**
   * C3: onModuleInit — subscribe to Tier3LawyerUsedEvent for in-memory capture.
   *
   * Pattern mirrors LegalTestController.onModuleInit (legal-test.controller.ts:167).
   * The captured events allow the floor test to assert:
   *   (b) LIVE chain: issueTier3Payoff(A) → event fires (this capture) → DB row updated (by IATargetService).
   *
   * The IATestController subscribes SEPARATELY from IATargetService — the bus supports multiple
   * listeners (EventEmitter multicast). Both receive the same event independently.
   * Capture-only: no side effects. The accrual is performed by IATargetService's own subscription.
   */
  onModuleInit(): void {
    // C3: capture Tier3LawyerUsedEvents for chain proof.
    this.bus.onTier3LawyerUsed((event: Tier3LawyerUsedEvent) => {
      this._capturedTier3LawyerUsedEvents.push({
        playerId:   event.playerId,
        lawyerId:   event.lawyerId,
        gameMinute: event.gameMinute,
        capturedAt: Number(process.hrtime.bigint() / 1_000_000n), // ms since process start
      });
    });

    // C4: capture InvestigationOpenedEvents for chain proof (scheduler → service → bus → capture).
    this.bus.onInvestigationOpened((event: InvestigationOpenedEvent) => {
      this._capturedInvestigationOpenedEvents.push({
        targetId:   event.targetId,
        targetType: event.targetType,
        gameMinute: event.gameMinute,
        capturedAt: Number(process.hrtime.bigint() / 1_000_000n),
      });
      this.logger.debug(
        `[IATestController] captured InvestigationOpenedEvent ` +
          `targetId=${event.targetId} targetType=${event.targetType} gameMinute=${event.gameMinute}`,
      );
    });

    // C5: capture IATargetDiscoveredEvents for E2E chain proof (executeDiscovery → bus → capture).
    this.bus.onIATargetDiscovered((event: IATargetDiscoveredEvent) => {
      this._capturedIATargetDiscoveredEvents.push({
        targetId:   event.targetId,
        targetType: event.targetType,
        gameMinute: event.gameMinute,
        capturedAt: Number(process.hrtime.bigint() / 1_000_000n),
      });
      this.logger.debug(
        `[IATestController] captured IATargetDiscoveredEvent ` +
          `targetId=${event.targetId} targetType=${event.targetType} gameMinute=${event.gameMinute}`,
      );
    });
  }

  // ── C0 ──────────────────────────────────────────────────────────────────────────────────────

  /** C0 connectivity probe: returns { ok: true } if InternalAffairsModule is in the DI graph. */
  @Get('_test/ia/ping')
  ping(): { ok: true } {
    // Suppress unused-variable lint for the §13 injections (they are used implicitly
    // at boot time to prove DI resolution; they will have active callers at C3/C5+).
    void this.lawyerService;
    void this.legalProjection;
    return { ok: true };
  }

  // ── C2 ──────────────────────────────────────────────────────────────────────────────────────

  /**
   * GET /v1/_test/ia/read-tunables
   *
   * Returns all IATunables getter values as a plain object.
   * Used by `ia_tunables_bootstrap.spec.ts` C2 to assert value-sensitive defaults.
   *
   * Anti-fabrication: the assertions read REAL getter output via the live server — not
   * hardcoded echoes. The tunables are sourced from TunablesStore.resolve* (DB → env → default).
   * C4-determinism: NO Math.random(), NO Date.now().
   * R2.2/P5: the raw scalars here are tunables registry values (not player-facing data);
   *   the server-only `suspicion_level` / `cooperators` / `weight_per_player` / `detection_events`
   *   are NEVER returned by this route (those appear in the schema probes only, per test-only carve-out).
   */
  @Get('_test/ia/read-tunables')
  readTunables(): Record<string, unknown> {
    return {
      // ── Canon scalars — investigation lifecycle ──────────────────────────────────────────────
      openInvestigationThreshold:                   this.tunables.openInvestigationThreshold,
      investigationDurationDays:                    this.tunables.investigationDurationDays,
      decayRatePerWeek:                             this.tunables.decayRatePerWeek,
      discoveryProbabilityPerActionDuringWindow:    this.tunables.discoveryProbabilityPerActionDuringWindow,
      intelPurchaseCostCents:                       this.tunables.intelPurchaseCostCents,
      // ── C7: intel-op band cuts (all 3 registry-sourced, R2.3) ───────────────────────────────
      // Lower cut: NEW key [PROV-Y26Q2] (0.30). Middle + upper cuts: reused existing keys.
      intelBandCutWatching:                         this.tunables.intelBandCutWatching,
      // bandCutInvestigating = openInvestigationThreshold (already returned above)
      // bandCutRevealing     = discoverySecondSuspicionThreshold (returned below)
      // ── Canon scalars — accrual formula ─────────────────────────────────────────────────────
      frequencyMultiplierCurveExponent:             this.tunables.frequencyMultiplierCurveExponent,
      // ── NEW [PROV-Y26Q2] — W6a C3-bis.3 per-act increment cap ───────────────────────────────
      maxSuspicionIncrementPerAct:                  this.tunables.maxSuspicionIncrementPerAct,
      // ── Composites [PROV-Y26Q2] — severity ladder ───────────────────────────────────────────
      actionSeverityWeightSmallBribe:               this.tunables.actionSeverityWeightSmallBribe,
      actionSeverityWeightBigBribe:                 this.tunables.actionSeverityWeightBigBribe,
      actionSeverityWeightClerkMutation:            this.tunables.actionSeverityWeightClerkMutation,
      actionSeverityWeightLawyerPayoff:             this.tunables.actionSeverityWeightLawyerPayoff,
      // ── Composites [PROV-Y26Q2] — player profile weights ────────────────────────────────────
      playerProfileWeightLowRep:                    this.tunables.playerProfileWeightLowRep,
      playerProfileWeightHighRep:                   this.tunables.playerProfileWeightHighRep,
      // ── Composites [PROV-Y26Q2] — burn-action costs ─────────────────────────────────────────
      burnActionHeatIncrement:                      this.tunables.burnActionHeatIncrement,
      burnActionReputationCostBucket:               this.tunables.burnActionReputationCostBucket,
      // ── NEW discovery double-condition [PROV-Y26Q2] (decision #3) ───────────────────────────
      discoveryDetectionEventsThreshold:            this.tunables.discoveryDetectionEventsThreshold,
      discoverySecondSuspicionThreshold:            this.tunables.discoverySecondSuspicionThreshold,
    };
  }

  /**
   * POST /v1/_test/ia/probe-clamp
   *
   * Body: { key: string, value: number }
   * Returns: { clamped: number }
   *
   * Applies `clampIAToRange(key, value)` and returns the result.
   * FALSIFIABLE: posting { key: 'internal_affairs.open_investigation_threshold', value: 999 }
   * returns { clamped: 0.85 } because the range cap is 0.85 (not 999).
   * C4: NO Math.random(), NO Date.now().
   */
  @Post('_test/ia/probe-clamp')
  probeClamp(@Body() body: { key?: string; value?: number }): { clamped: number } {
    const key = body?.key;
    const value = body?.value;
    if (typeof key !== 'string' || key.length === 0) {
      throw new HttpException('key is required', HttpStatus.BAD_REQUEST);
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new HttpException('value must be a finite number', HttpStatus.BAD_REQUEST);
    }
    const clamped = clampIAToRange(key, value);
    return { clamped };
  }

  // ── C1 ──────────────────────────────────────────────────────────────────────────────────────

  /**
   * POST /v1/_test/ia/seed-target
   *
   * C1 schema probe: insert an internal_affairs_targets row.
   *
   * Body: { targetType?: string } — default 'lawyer'.
   *   - 'lawyer'/'clerk': LIVE types (§13 hook / 04f-B — ⚠️ CORRIGÉ 2026-08-08, `clerk` was
   *     mislabeled reserved-inert here, see `ia-target.service.ts` file header). Other 3 members:
   *     genuinely reserved-inert (RATIFIÉ #4).
   *   - All 5 enum members are accepted by THIS route — it inserts directly into
   *     `internal_affairs_targets`, bypassing `IATargetService.recordCorruptUse`'s referent guard
   *     entirely (W6a C3-bis.1 does not apply here; this route only proves the DB schema accepts
   *     all 5 enum members, a C1-era decision unrelated to who may legitimately CALL
   *     `recordCorruptUse` for each type).
   *
   * target_npc_id is fixed to the sentinel TEST_IA_NPCID (schema test — no real NPC needed).
   *
   * FALSIFIABLE: a seed-target with targetType='judge_aide' (genuinely reserved-inert) must
   *   succeed (201) proving the enum member is declared and the table accepts it.
   *
   * Returns: { targetId: string }
   */
  @Post('_test/ia/seed-target')
  async seedTarget(
    @Body() body: { targetType?: string },
  ): Promise<{ targetId: string }> {
    const targetType = body?.targetType ?? 'lawyer';
    if (!VALID_TARGET_TYPES.has(targetType)) {
      throw new HttpException(
        `targetType must be one of: ${[...VALID_TARGET_TYPES].join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const rows = await this.db
      .insert(internalAffairsTarget)
      .values({
        target_type: targetType as 'clerk' | 'port_inspector' | 'lawyer' | 'broker' | 'judge_aide',
        target_npc_id: TEST_IA_NPCID,
      })
      .returning({ target_id: internalAffairsTarget.target_id });

    return { targetId: rows[0].target_id };
  }

  /**
   * GET /v1/_test/ia/read-target?targetId=<uuid>
   *
   * C1 schema probe: read an internal_affairs_targets row by target_id.
   *
   * Returns the FULL row (all columns, serialized — bigint → string).
   * R2.2/P5: suspicion_level, cooperators, weight_per_player are returned here because this is
   *   a TEST-ONLY route. Production routes never expose these raw scalars.
   * FALSIFIABLE:
   *   - target_type === 'lawyer' for a lawyer seed.
   *   - suspicion_level === 0 (default at creation).
   *   - cooperators === [] (default at creation).
   *   - weight_per_player === {} (default at creation).
   *   - NO player_id property (GLOBAL table — proves no player FK column exists).
   *
   * Returns 404 if the target does not exist.
   */
  @Get('_test/ia/read-target')
  async readTarget(
    @Query('targetId') targetId: string,
  ): Promise<Record<string, unknown>> {
    if (!targetId || typeof targetId !== 'string') {
      throw new HttpException('targetId query param required', HttpStatus.BAD_REQUEST);
    }

    const rows = await this.db
      .select()
      .from(internalAffairsTarget)
      .where(eq(internalAffairsTarget.target_id, targetId))
      .limit(1);

    if (!rows[0]) {
      throw new HttpException(`target ${targetId} not found`, HttpStatus.NOT_FOUND);
    }

    return serializeRow(rows[0] as Record<string, unknown>) ?? {};
  }

  /**
   * POST /v1/_test/ia/seed-investigation
   *
   * C1 schema probe: insert an ia_investigations row for a given target.
   *
   * Body: { targetId: string }
   *   closes_at = now + 21 days (investigation_duration_days default [PROV-Y26Q2]).
   *
   * FALSIFIABLE:
   *   - status === 'active' (default at creation).
   *   - detection_events === [] (default at creation).
   *   - target_id matches the provided targetId.
   *   - closes_at is in the future.
   *
   * Returns: { investigationId: string, targetId: string }
   */
  @Post('_test/ia/seed-investigation')
  async seedInvestigation(
    @Body() body: { targetId?: string },
  ): Promise<{ investigationId: string; targetId: string }> {
    const { targetId } = body ?? {};
    if (!targetId || typeof targetId !== 'string') {
      throw new HttpException('targetId required', HttpStatus.BAD_REQUEST);
    }

    // closes_at = now + 21 days (investigation_duration_days default).
    const closesAt = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000);

    const rows = await this.db
      .insert(iaInvestigation)
      .values({
        target_id: targetId,
        closes_at: closesAt,
      })
      .returning({ investigation_id: iaInvestigation.investigation_id });

    return { investigationId: rows[0].investigation_id, targetId };
  }

  /**
   * GET /v1/_test/ia/read-investigation?investigationId=<uuid>
   *
   * C1 schema probe: read an ia_investigations row by investigation_id.
   *
   * Returns the FULL row (serialized). detection_events is SERVER-ONLY but returned here
   * because this is a TEST-ONLY route (R2.2/P5: production routes never expose it).
   *
   * Returns 404 if the investigation does not exist.
   */
  @Get('_test/ia/read-investigation')
  async readInvestigation(
    @Query('investigationId') investigationId: string,
  ): Promise<Record<string, unknown>> {
    if (!investigationId || typeof investigationId !== 'string') {
      throw new HttpException('investigationId query param required', HttpStatus.BAD_REQUEST);
    }

    const rows = await this.db
      .select()
      .from(iaInvestigation)
      .where(eq(iaInvestigation.investigation_id, investigationId))
      .limit(1);

    if (!rows[0]) {
      throw new HttpException(`investigation ${investigationId} not found`, HttpStatus.NOT_FOUND);
    }

    return serializeRow(rows[0] as Record<string, unknown>) ?? {};
  }

  /**
   * POST /v1/_test/ia/seed-intel-purchase
   *
   * C1 schema probe: create a test player + account, then insert an ia_intel_purchases row.
   *
   * Body: { targetId: string }
   *   Creates: account (kind=PLAYER, lifecycle_state=ACTIVE) → player (callsign via counter).
   *   Then: ia_intel_purchases row (revealed_band='silent', cost_cents=1000n).
   *
   * FALSIFIABLE:
   *   - revealed_band === 'silent' (first valid band value).
   *   - cost_cents serialized as '1000' (bigint → string via serializeRow).
   *   - player_id FK works (player can be deleted → CASCADE removes purchase — C1-4).
   *
   * Returns: { purchaseId: string, playerId: string, targetId: string }
   */
  @Post('_test/ia/seed-intel-purchase')
  async seedIntelPurchase(
    @Body() body: { targetId?: string },
  ): Promise<{ purchaseId: string; playerId: string; targetId: string }> {
    const { targetId } = body ?? {};
    if (!targetId || typeof targetId !== 'string') {
      throw new HttpException('targetId required', HttpStatus.BAD_REQUEST);
    }

    // Step 1: create a test account.
    const accountRows = await this.db
      .insert(account)
      .values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })
      .returning({ account_id: account.account_id });
    const accountId = accountRows[0].account_id;

    // Step 2: create a test player (unique callsign via counter).
    const callsign = nextIATestCallsign();
    const playerRows = await this.db
      .insert(player)
      .values({
        account_id: accountId,
        callsign,
        email: `${callsign}@ia-test.invalid`,
        locale: 'en',
      })
      .returning({ player_id: player.player_id });
    const playerId = playerRows[0].player_id;

    // Step 3: create the intel purchase row.
    const purchaseRows = await this.db
      .insert(iaIntelPurchase)
      .values({
        player_id: playerId,
        target_id: targetId,
        revealed_band: 'silent',
        cost_cents: 1000n,
      })
      .returning({ purchase_id: iaIntelPurchase.purchase_id });

    return { purchaseId: purchaseRows[0].purchase_id, playerId, targetId };
  }

  /**
   * GET /v1/_test/ia/read-intel-purchase?purchaseId=<uuid>
   *
   * C1 schema probe: read an ia_intel_purchases row by purchase_id.
   *
   * Returns the FULL row (serialized — cost_cents bigint → string via serializeRow).
   * FALSIFIABLE:
   *   - revealed_band === 'silent'.
   *   - cost_cents === '1000' (bigint serialized as string).
   *   - After player DELETE, this route returns 404 (CASCADE proof — C1-4).
   *
   * Returns 404 if the purchase does not exist (including after CASCADE delete).
   */
  @Get('_test/ia/read-intel-purchase')
  async readIntelPurchase(
    @Query('purchaseId') purchaseId: string,
  ): Promise<Record<string, unknown>> {
    if (!purchaseId || typeof purchaseId !== 'string') {
      throw new HttpException('purchaseId query param required', HttpStatus.BAD_REQUEST);
    }

    const rows = await this.db
      .select()
      .from(iaIntelPurchase)
      .where(eq(iaIntelPurchase.purchase_id, purchaseId))
      .limit(1);

    if (!rows[0]) {
      throw new HttpException(`purchase ${purchaseId} not found`, HttpStatus.NOT_FOUND);
    }

    return serializeRow(rows[0] as Record<string, unknown>) ?? {};
  }

  /**
   * POST /v1/_test/ia/delete-player
   *
   * C1 CASCADE test: delete a test player to prove ia_intel_purchases CASCADE behavior.
   *
   * Body: { playerId: string }
   *   Deletes the player (player ON DELETE CASCADE → ia_intel_purchases rows are removed).
   *
   * FALSIFIABLE: after this call, GET /read-intel-purchase?purchaseId=<uuid> returns 404.
   *
   * Returns: { deleted: true }
   */
  @Post('_test/ia/delete-player')
  async deletePlayer(
    @Body() body: { playerId?: string },
  ): Promise<{ deleted: true }> {
    const { playerId } = body ?? {};
    if (!playerId || typeof playerId !== 'string') {
      throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    }

    await this.db
      .delete(player)
      .where(eq(player.player_id, playerId));

    return { deleted: true };
  }

  // ── C3 ──────────────────────────────────────────────────────────────────────────────────────

  /**
   * POST /v1/_test/ia/record-corrupt-use
   *
   * C3 direct probe: call `IATargetService.recordCorruptUse` directly (bypasses the bus).
   * Used to prove the 3-factor formula is value-sensitive and that cooperators/weight_per_player
   * are populated correctly.
   *
   * Body: {
   *   playerId: string,
   *   targetNpcId: string,
   *   targetType?: IATargetType (default 'lawyer'),
   *   actionSeverity?: IAActionSeverity (default 'lawyer_payoff'),
   *   gameMinute?: number (default 0)
   * }
   *
   * ⚠️ W6a C3-bis (2026-08-08): `playerReputationBucket` is REMOVED from this body — the method
   *   resolves it internally now (`BossMirrorService.getConsistencyIndex`), so there is nothing
   *   left for a caller (including this test probe) to supply. `targetNpcId` must now name a REAL
   *   referent `playerId` legitimately controls (a `lawyers` row for `targetType='lawyer'`, a
   *   `recruitment_candidates` row for `targetType='clerk'`) — a synthetic UUID, or ANY UUID for
   *   `port_inspector`/`broker`/`judge_aide` (no referent table exists), now 404s (deny-by-default,
   *   C3-bis.1). `actionSeverity` stays a body field: it never reached HTTP on any PRODUCTION
   *   surface (the two live producers each declare their own act server-side), so removing it from
   *   this TEST-ONLY seam would not close any exposure — it would only make the formula's factor-1
   *   value-sensitivity (FALSIFIABLE (a) below) untestable via this probe.
   *
   * Returns: { targetId, newSuspicionLevel, cooperators, weightPerPlayer }
   *
   * FALSIFIABLE:
   *   (a) Different actionSeverity → different newSuspicionLevel (factor 1 value-sensitive).
   *   (b) Different playerReputationBucket (now driven by the CALLER's seeded consistency_index,
   *       not a body field) → different newSuspicionLevel (factor 3 value-sensitive).
   *   (c) Repeated calls (same player, same target, same window) → non-linear increase (factor 2),
   *       bounded by `maxSuspicionIncrementPerAct` per call (W6a C3-bis.3).
   *   (d) Type 'clerk' now requires a REAL `recruitment_candidates` referent (LIVE since 04f-B —
   *       see file header). `port_inspector`/`broker`/`judge_aide` are deny-by-default 404 — see
   *       `w6a_c3_worst_findings.spec.ts` stimulus 3 for the anti-fig-leaf coverage of that path.
   *
   * R2.2/P5: suspicion_level + cooperators + weight_per_player returned here because this is a
   *   TEST-ONLY route (R-EC-2). Production routes never expose these raw server-side scalars.
   */
  @Post('_test/ia/record-corrupt-use')
  async recordCorruptUseProbe(
    @Body() body: {
      playerId?: string;
      targetNpcId?: string;
      targetType?: string;
      actionSeverity?: string;
      gameMinute?: number;
    },
  ): Promise<{
    targetId: string;
    newSuspicionLevel: number;
    cooperators: string[];
    weightPerPlayer: Record<string, unknown>;
  }> {
    const {
      playerId,
      targetNpcId,
      targetType = 'lawyer',
      actionSeverity = 'lawyer_payoff',
      gameMinute = 0,
    } = body ?? {};

    if (!playerId || typeof playerId !== 'string') {
      throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    }
    if (!targetNpcId || typeof targetNpcId !== 'string') {
      throw new HttpException('targetNpcId required', HttpStatus.BAD_REQUEST);
    }

    const VALID_TARGET_TYPES_C3 = new Set<string>([
      'clerk', 'port_inspector', 'lawyer', 'broker', 'judge_aide',
    ]);
    const VALID_SEVERITIES = new Set<string>([
      'small_bribe', 'big_bribe', 'clerk_mutation', 'lawyer_payoff',
    ]);

    if (!VALID_TARGET_TYPES_C3.has(targetType)) {
      throw new HttpException(
        `targetType must be one of: ${[...VALID_TARGET_TYPES_C3].join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!VALID_SEVERITIES.has(actionSeverity)) {
      throw new HttpException(
        `actionSeverity must be one of: ${[...VALID_SEVERITIES].join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    if (typeof gameMinute !== 'number' || !Number.isFinite(gameMinute)) {
      throw new HttpException('gameMinute must be a finite number', HttpStatus.BAD_REQUEST);
    }

    const { targetId, newSuspicionLevel } = await this.iaTargetService.recordCorruptUse(
      playerId,
      targetNpcId,
      targetType as IATargetType,
      actionSeverity as IAActionSeverity,
      gameMinute,
    );

    // Read the updated row to return cooperators + weight_per_player for test assertions.
    const [row] = await this.db
      .select({
        cooperators:       internalAffairsTarget.cooperators,
        weight_per_player: internalAffairsTarget.weight_per_player,
      })
      .from(internalAffairsTarget)
      .where(eq(internalAffairsTarget.target_id, targetId))
      .limit(1);

    return {
      targetId,
      newSuspicionLevel,
      cooperators:       (row?.cooperators as string[]) ?? [],
      weightPerPlayer:   (row?.weight_per_player as Record<string, unknown>) ?? {},
    };
  }

  /**
   * GET /v1/_test/ia/read-target-by-npc?targetNpcId=<uuid>&targetType=<type>
   *
   * C3 schema probe: read an internal_affairs_targets row by (target_npc_id, target_type).
   *
   * Returns the full row (serialized) — suspicion_level + cooperators + weight_per_player.
   * Used by the LIVE chain proof: after issueTier3Payoff, the bus handler updates the row;
   * this endpoint lets the test poll for suspicion_level > 0 WITHOUT knowing target_id ahead of time.
   *
   * R2.2/P5: returns raw scalars because this is a TEST-ONLY route (R-EC-2).
   *
   * Returns 404 if no row found.
   */
  @Get('_test/ia/read-target-by-npc')
  async readTargetByNpc(
    @Query('targetNpcId') targetNpcId: string,
    @Query('targetType') targetType: string,
  ): Promise<Record<string, unknown>> {
    if (!targetNpcId || typeof targetNpcId !== 'string') {
      throw new HttpException('targetNpcId query param required', HttpStatus.BAD_REQUEST);
    }
    if (!targetType || typeof targetType !== 'string') {
      throw new HttpException('targetType query param required', HttpStatus.BAD_REQUEST);
    }

    const rows = await this.db
      .select()
      .from(internalAffairsTarget)
      .where(
        sql`${internalAffairsTarget.target_npc_id} = ${targetNpcId}::uuid
         AND ${internalAffairsTarget.target_type} = ${targetType}::ia_target_type`,
      )
      .limit(1);

    if (!rows[0]) {
      throw new HttpException(`no target found for npc=${targetNpcId} type=${targetType}`, HttpStatus.NOT_FOUND);
    }

    return serializeRow(rows[0] as Record<string, unknown>) ?? {};
  }

  /**
   * GET /v1/_test/ia/tier3-used-events
   *
   * C3 chain-proof probe: return captured Tier3LawyerUsedEvents since server start.
   * Filtered by lawyerId query param (optional).
   *
   * Route: GET /v1/_test/ia/tier3-used-events?lawyerId=<uuid>
   *
   * Returns: { count: number, events: CapturedTier3LawyerUsedEvent[] }
   *
   * FALSIFIABLE (chain proof):
   *   Before issueTier3Payoff: count = 0.
   *   After issueTier3Payoff: count >= 1 AND events[0].lawyerId === lawyerId.
   *   The count asserts A (emitter) → bus → this capture path is LIVE (event fired).
   *   Combined with the DB row check (via record-corrupt-use or read-target), the full
   *   chain (A emits → B consumes → DB updated) is proven.
   *
   * R2.2/P5: no raw suspicion_level returned here — only lawyerId/playerId/gameMinute
   *   (the same qualitative payload as the event itself).
   */
  @Get('_test/ia/tier3-used-events')
  getTier3UsedEvents(
    @Query('lawyerId') lawyerId?: string,
  ): { count: number; events: CapturedTier3LawyerUsedEvent[] } {
    const events = lawyerId
      ? this._capturedTier3LawyerUsedEvents.filter((e) => e.lawyerId === lawyerId)
      : [...this._capturedTier3LawyerUsedEvents];
    return { count: events.length, events };
  }

  // ── C4 ──────────────────────────────────────────────────────────────────────────────────────

  /**
   * GET /v1/_test/ia/investigation-opened-events
   *
   * C4 chain-proof probe: return captured InvestigationOpenedEvents since server start.
   * Filtered by targetId query param (optional).
   *
   * Returns: { count: number, events: CapturedInvestigationOpenedEvent[] }
   *
   * FALSIFIABLE (chain proof — NIGHTLY/17 tick path):
   *   Before advance 1440: count = 0.
   *   After advance 1440 (threshold crossed): count >= 1 AND events[0].targetId = <expected>.
   *   After second advance 1440 (same target, already has investigation_id): count unchanged
   *     (idempotent — investigation_id IS NULL guard blocks second open).
   *
   * R2.2/P5: no raw suspicion_level returned — only targetId/targetType/gameMinute
   *   (the same qualitative payload as the InvestigationOpenedEvent itself).
   */
  @Get('_test/ia/investigation-opened-events')
  getInvestigationOpenedEvents(
    @Query('targetId') targetId?: string,
  ): { count: number; events: CapturedInvestigationOpenedEvent[] } {
    const events = targetId
      ? this._capturedInvestigationOpenedEvents.filter((e) => e.targetId === targetId)
      : [...this._capturedInvestigationOpenedEvents];
    return { count: events.length, events };
  }

  /**
   * POST /v1/_test/ia/evaluate-threshold
   *
   * C4 direct probe: call `IAInvestigationService.evaluateThresholdCrossing` with a synthetic
   * CitySimTickContext (gameMinute from body). Bypasses the NIGHTLY scheduler — allows the E2E
   * spec to assert the mechanic without advancing 1440 ticks.
   *
   * Body: { gameMinute: number }
   * Returns: { opened: number }
   *
   * FALSIFIABLE:
   *   (a) No qualifying targets → opened === 0 (L1 skip — ZERO writes).
   *   (b) Target with suspicion_level >= threshold AND investigation_id IS NULL → opened === 1.
   *   (c) Second call same target (now investigation_id IS NOT NULL) → opened === 0 (idempotent).
   *   (d) InvestigationOpenedEvent emitted on bus → GET investigation-opened-events returns count >= 1.
   *
   * Deterministic: NO Math.random, NO Date.now (opens on threshold alone).
   * R2.2/P5: no raw suspicion_level returned.
   */
  @Post('_test/ia/evaluate-threshold')
  async evaluateThresholdProbe(
    @Body() body: { gameMinute?: number },
  ): Promise<{ opened: number }> {
    const gameMinute = body?.gameMinute ?? 0;
    if (typeof gameMinute !== 'number' || !Number.isFinite(gameMinute)) {
      throw new HttpException('gameMinute must be a finite number', HttpStatus.BAD_REQUEST);
    }

    // Synthetic CitySimTickContext: playerId is empty-string (GLOBAL table scan — no player FK).
    // cadence and order are irrelevant to IAInvestigationService (only ctx.gameMinute is used).
    const { Cadence } = await import('../../citysim/scheduler/city_sim_system');
    const ctx = {
      playerId: '',
      cadence: Cadence.NIGHTLY,
      gameMinute,
    };

    return this.iaInvestigationService.evaluateThresholdCrossing(ctx);
  }

  /**
   * POST /v1/_test/ia/run-surveillance
   *
   * C4 direct probe: call `IAInvestigationService.runSurveillanceWindow` directly.
   * Used by the E2E spec to assert the seeded detection roll without going through the full
   * recordCorruptUse stack.
   *
   * Body: {
   *   playerId: string,
   *   investigationId: string,
   *   gameDay: number,
   *   gameMinute?: number
   * }
   * Returns: { detected: boolean }
   *
   * W6a C3: `playerId` is now REQUIRED — the service throws 404 `RESOURCE_NOT_FOUND` if `playerId`
   * is not a recorded cooperator (`internal_affairs_targets.cooperators`) of the investigation's
   * target. Pre-C3 this probe took an optional `playerId` used only as DetectionEvent payload.
   *
   * FALSIFIABLE:
   *   (a) Same (investigationId, gameDay) always → same detected outcome (seeded determinism).
   *   (b) detected=true → GET read-investigation shows detection_events.length increased.
   *   (c) detected=false → GET read-investigation shows detection_events unchanged (ZERO writes).
   *   (d) W6a C3: playerId not a cooperator on the investigation's target → 404, detection_events
   *       unchanged.
   *
   * R2.2/P5: detection_events is SERVER-ONLY; only the boolean `detected` is returned here.
   *   The read-investigation TEST-ONLY route exposes detection_events for the E2E spec.
   */
  @Post('_test/ia/run-surveillance')
  async runSurveillanceProbe(
    @Body() body: {
      playerId?: string;
      investigationId?: string;
      gameDay?: number;
      gameMinute?: number;
    },
  ): Promise<{ detected: boolean }> {
    const { playerId, investigationId, gameDay, gameMinute } = body ?? {};

    if (!playerId || typeof playerId !== 'string') {
      throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    }
    if (!investigationId || typeof investigationId !== 'string') {
      throw new HttpException('investigationId required', HttpStatus.BAD_REQUEST);
    }
    if (typeof gameDay !== 'number' || !Number.isFinite(gameDay)) {
      throw new HttpException('gameDay must be a finite number', HttpStatus.BAD_REQUEST);
    }

    return this.iaInvestigationService.runSurveillanceWindow(
      playerId,
      investigationId,
      gameDay,
      gameMinute,
    );
  }

  // ── C5 ──────────────────────────────────────────────────────────────────────────────────────

  /**
   * POST /v1/_test/ia/run-discovery-pass
   *
   * C5 direct probe: call `IADiscoveryService.runDiscoveryPass` directly.
   * This exercises the REAL production path (same method called by IATickService NIGHTLY/17),
   * but bypasses the scheduler to avoid requiring a 1440-tick advance in the real-path proof.
   *
   * Body: { gameMinute?: number }
   * Returns: { discovered: number }
   *
   * FALSIFIABLE:
   *   Before seeding: discovered=0 (L1 skip).
   *   After seeding a target above double-condition with open investigation: discovered>=1.
   *
   * The real-path proof uses: evaluate-threshold → run-discovery-pass
   * (NO call to force-discovery). Proves the NIGHTLY sweep auto-fires discovery.
   *
   * Deterministic: NO Math.random(), NO Date.now() in the discovery decision.
   * R2.2/P5: only `discovered` count returned (no raw scalars).
   */
  @Post('_test/ia/run-discovery-pass')
  async runDiscoveryPassProbe(
    @Body() body: { gameMinute?: number },
  ): Promise<{ discovered: number }> {
    const gameMinute = body?.gameMinute ?? 0;
    if (typeof gameMinute !== 'number' || !Number.isFinite(gameMinute)) {
      throw new HttpException('gameMinute must be a finite number', HttpStatus.BAD_REQUEST);
    }
    return this.iaDiscoveryService.runDiscoveryPass(gameMinute);
  }

  /**
   * GET /v1/_test/ia/discovered-events
   *
   * C5 chain-proof probe: return captured IATargetDiscoveredEvents since server start.
   * Filtered by targetId query param (optional).
   *
   * Returns: { count: number, events: CapturedIATargetDiscoveredEvent[] }
   *
   * FALSIFIABLE (chain proof):
   *   Before executeDiscovery: count = 0.
   *   After executeDiscovery (conditions met): count >= 1 AND events[0].targetId = <expected>.
   *   After second executeDiscovery (idempotent — already_discovered): count unchanged.
   *
   * R2.2/P5: no raw suspicion_level or detection_events returned — only targetId/targetType/
   *   gameMinute (the same qualitative payload as the IATargetDiscoveredEvent itself).
   */
  @Get('_test/ia/discovered-events')
  getDiscoveredEvents(
    @Query('targetId') targetId?: string,
  ): { count: number; events: CapturedIATargetDiscoveredEvent[] } {
    const events = targetId
      ? this._capturedIATargetDiscoveredEvents.filter((e) => e.targetId === targetId)
      : [...this._capturedIATargetDiscoveredEvents];
    return { count: events.length, events };
  }

  /**
   * POST /v1/_test/ia/force-discovery
   *
   * C5 direct probe: call `IADiscoveryService.executeDiscovery` with a given targetId.
   *
   * Body: { targetId: string, gameMinute?: number }
   * Returns: IADiscoveryResult (triggered, reason?, targetType?, conditionMet?, burned?,
   *   casesRerouted?, declarationWritten?)
   *
   * **Anti-fig-leaf driver (RATIFIÉ #4):** This route exercises the reserved-type forward hook:
   *   a 'clerk'|'port_inspector'|'broker'|'judge_aide' target passed here triggers discovery
   *   (if conditions met), emits IATargetDiscoveredEvent, but calls NO A-service (inert hook).
   *   This proves the reserved-type path is exercised and the event fires (not a dead stub).
   *
   * **Double-condition falsifiable (decision #3):**
   *   Pass a target with detection_events count >= threshold (condition 1 only) → conditionMet='detection_events'.
   *   Pass a target with suspicion_level >= threshold (condition 2 only) → conditionMet='suspicion_level'.
   *   Pass a target below both thresholds → triggered=false, reason='conditions_not_met'.
   *
   * **Idempotent:** calling twice on the same (already-discovered) target → triggered=false, reason='already_discovered'.
   *
   * Deterministic: NO Math.random(), NO Date.now() in the discovery decision.
   * R2.2/P5: returns only client-safe fields (no raw suspicion_level/detection_events/cooperators).
   */
  @Post('_test/ia/force-discovery')
  async forceDiscoveryProbe(
    @Body() body: { targetId?: string; gameMinute?: number },
  ): Promise<Record<string, unknown>> {
    const { targetId, gameMinute = 0 } = body ?? {};

    if (!targetId || typeof targetId !== 'string') {
      throw new HttpException('targetId required', HttpStatus.BAD_REQUEST);
    }
    if (typeof gameMinute !== 'number' || !Number.isFinite(gameMinute)) {
      throw new HttpException('gameMinute must be a finite number', HttpStatus.BAD_REQUEST);
    }

    return this.iaDiscoveryService.executeDiscovery(targetId, gameMinute) as unknown as Promise<Record<string, unknown>>;
  }

  // ── C6 ──────────────────────────────────────────────────────────────────────────────────────

  /**
   * POST /v1/_test/ia/apply-decay
   *
   * C6 direct decay probe: call `IADecayService.applyWeeklySuspicionDecay(gameMinute)`.
   *
   * Body: { gameMinute: number }
   * Returns: { decayed: number, weekId: number }
   *
   * **Falsifiable proofs enabled by this route:**
   *   (a) Idle target decays by exactly `decay_rate_per_week` (value-sensitive DB assertion).
   *   (b) Active-this-week target (stamped by recordCorruptUse with same weekId) does NOT decay
   *       (cool-off: decayed=0 for that target).
   *   (c) Idempotency: call twice with same gameMinute → first call returns decayed>0,
   *       second call returns decayed=0 (targets already stamped at thisWeekEpoch).
   *   (d) Rate-sensitivity: change decay_rate_per_week in tunables → different new suspicion_level.
   *   (e) Clamp ≥0: target with suspicion_level < rate → decayed to exactly 0 (not negative).
   *   (f) Use-spreading: separate targets (each with lower per-actor suspicion) accrue slower
   *       than one target used twice — asserted via different suspicion_levels before decay.
   *
   * Deterministic: NO Math.random(), NO Date.now() — depends only on gameMinute.
   * R2.2/P5: suspicion_level SERVER-ONLY; this route returns only { decayed, weekId } (qualitative).
   *   The test spec reads the raw suspicion_level via direct SQL probe (runsql) for value-sensitive
   *   assertion — not via this route.
   */
  @Post('_test/ia/apply-decay')
  async applyDecayProbe(
    @Body() body: { gameMinute?: number },
  ): Promise<{ decayed: number; weekId: number }> {
    const { gameMinute = 0 } = body ?? {};

    if (typeof gameMinute !== 'number' || !Number.isFinite(gameMinute) || gameMinute < 0) {
      throw new HttpException('gameMinute must be a non-negative finite number', HttpStatus.BAD_REQUEST);
    }

    const result = await this.iaDecayService.applyWeeklySuspicionDecay(gameMinute);
    return { decayed: result.decayed, weekId: result.weekId };
  }

  // ── C7 ──────────────────────────────────────────────────────────────────────────────────────

  /**
   * POST /v1/_test/ia/buy-intel
   *
   * C7 direct probe: call `IAIntelPurchaseService.buyApproxBandReveal(playerId, actorRef, actorType)`.
   *
   * ⚠️ W6.3 C4 — BREAKING CHANGE to this probe's body, mechanically forced by the new guard: the
   * service no longer accepts a raw `targetId` (the OLD shape was exactly the IDOR-shaped call the
   * W6.3 design names as "not to be hoisted onto a player route as-is" — `internal_affairs_
   * targets.target_id` is an internal pivot with no ownership check). Body is now `{ playerId,
   * actorRef, actorType }` — `actorRef` MUST be a referent `playerId` legitimately owns (a
   * `lawyers.lawyer_id` or `recruitment_candidates.candidate_id` row for THIS player), mirroring
   * exactly what a real caller (the C4 production route) must supply. `tsc` rougit on the old
   * 2-arg call — this is the intended compile-time signal (W6.3 "optionnel" rule: a required
   * parameter, never optional).
   *
   * Body: { playerId: string, actorRef: string, actorType: IATargetType }
   * Returns: { purchaseId: string, band: string, costCents: number }
   *
   * The Fixer is a projection-only label (lieutenant-archetype.ts:65 role_id 11) with NO DSL
   * binding — this route calls the service DIRECTLY (plan gap #6). The E2E test proves that
   * "Fixer-mediated" = "direct service call", not "DSL binding invocation".
   *
   * FALSIFIABLE proofs (required by C7 scope, unaffected by the W6.3 signature change):
   *   (a-debit)   Before call: seedEconomyState(playerId, cost). After call: balance == 0.
   *               Insufficient-balance variant: start with < cost → HTTP 402.
   *   (a-row)     ia_intel_purchases row exists after call: SELECT WHERE purchase_id=result.purchaseId.
   *   (a-band)    result.band is one of { silent, watching, investigating, revealing } — NOT a float.
   *               Two targets with suspicion_level straddling 0.30/0.60/0.85 → different bands.
   *   (d-direct)  This route proves the Fixer op is a DIRECT service (no DSL path to assert — plan gap #6).
   *               The route itself IS the evidence: a DSL binding would require a different call path.
   *
   * Errors:
   *   404 — `playerId` does not own `actorRef`, or no target row exists for it (W6.3 C4 guard).
   *   402 — player has insufficient funds (cash_cents < intelPurchaseCostCents).
   *   400 — missing required fields.
   *
   * R2.2/P5: `suspicion_level` is ABSENT from the response (only `band` is returned).
   * R2.3: the cost in the response comes from the registry getter (tunables.intelPurchaseCostCents).
   */
  @Post('_test/ia/buy-intel')
  async buyIntelProbe(
    @Body() body: { playerId?: string; actorRef?: string; actorType?: string },
  ): Promise<{ purchaseId: string; band: string; costCents: number }> {
    const { playerId, actorRef, actorType } = body ?? {};

    if (!playerId || typeof playerId !== 'string') {
      throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    }
    if (!actorRef || typeof actorRef !== 'string') {
      throw new HttpException('actorRef required', HttpStatus.BAD_REQUEST);
    }
    const IA_TARGET_TYPES = new Set<string>(['clerk', 'port_inspector', 'lawyer', 'broker', 'judge_aide']);
    if (!actorType || !IA_TARGET_TYPES.has(actorType)) {
      throw new HttpException('actorType must be a valid IATargetType', HttpStatus.BAD_REQUEST);
    }

    // IAIntelPurchaseService throws ApiError(RESOURCE_NOT_FOUND) / HttpException(402) — pass through.
    const result = await this.iaIntelPurchaseService.buyApproxBandReveal(
      playerId,
      actorRef,
      actorType as IATargetType,
    );
    return {
      purchaseId: result.purchaseId,
      band:       result.band,
      costCents:  result.costCents,
    };
  }
  // DEFERRED: POST /v1/_test/ia/execute-burn (IABurnActionService.executeBurn) — burn-action
  // requires real heat/rep seams (existing building/district heat + lieutenant rep do not map
  // directly to a player-initiated NPC burn) + durable neutralize fix (discovered_at shared with
  // NIGHTLY C4 re-investigation scan → a burned NPC must not be re-scanned). TD routed in plan.

  // ── C8 ──────────────────────────────────────────────────────────────────────────────────────

  /**
   * POST /v1/_test/ia/actor-status
   *
   * C8 direct probe: call `IAProjectionService.getActorStatus(playerId, targetNpcId)`.
   *
   * Body: { playerId: string, targetNpcId: string }
   * Returns: { status: 'steady' | 'nervous' | 'unavailable' | 'gone' }
   *
   * The response carries ONLY the qualitative `status` bucket — NEVER `suspicion_level`,
   * `cooperators`, `weight_per_player`, `detection_events`, or any raw IA scalar (R2.2/P5 wall).
   *
   * Player isolation proof:
   *   - If playerId is NOT in the target's cooperators list (or if no target exists for targetNpcId),
   *     the route returns { status: 'steady' } — the player sees a stable actor, not a leaked state.
   *   - If playerId IS in cooperators, the status reflects the real server-side state.
   *
   * FALSIFIABLE proofs (required by C8 scope):
   *   (a-bands) Projection returns band + actor status (not scalar):
   *     result.status is one of { 'steady', 'nervous', 'unavailable', 'gone' }
   *     result has NO key 'suspicion_level' / 'cooperators' / 'weight_per_player' / 'detection_events'.
   *   (b-grep-zero) Structural: the response DTO carries NO forbidden scalars.
   *     Asserted recursively by ia_p5_wall.spec.ts (JSON.stringify + recursive key scan).
   *   (c-falsifiable) Different suspicion → different status:
   *     - target.suspicion_level < intelBandCutWatching → 'steady'
   *     - target.suspicion_level >= intelBandCutWatching (no investigation) → 'nervous'
   *     - target with investigation_id set (discovered_at IS NULL) → 'unavailable'
   *     - target with discovered_at set → 'gone'
   *   (d-isolation) Player NOT in cooperators → 'steady' (no leak of IA state).
   *     Player A cooperates with actor; Player B does not → Player B sees 'steady'.
   *
   * R2.2/P5: `suspicion_level` is ABSENT from the response (only `status` is returned).
   * R2.3: the `intelBandCutWatching` threshold is registry-sourced in the service (not inline).
   * Deterministic: NO Math.random(), NO Date.now() — pure function of DB state + registry.
   */
  @Post('_test/ia/actor-status')
  async actorStatusProbe(
    @Body() body: { playerId?: string; targetNpcId?: string },
  ): Promise<{ status: ActorStatusIndicator }> {
    const { playerId, targetNpcId } = body ?? {};

    if (!playerId || typeof playerId !== 'string') {
      throw new HttpException('playerId required', HttpStatus.BAD_REQUEST);
    }
    if (!targetNpcId || typeof targetNpcId !== 'string') {
      throw new HttpException('targetNpcId required', HttpStatus.BAD_REQUEST);
    }

    // IAProjectionService.getActorStatus: pure function of DB state + registry (no throws).
    // Returns { status: ActorStatusIndicator } — NEVER suspicion_level or raw scalars (R2.2/P5).
    const result = await this.iaProjectionService.getActorStatus(playerId, targetNpcId);

    // Return ONLY the status bucket — structural grep-zero guaranteed here.
    // If 'suspicion_level' / 'cooperators' / etc. appear, it is a P5 violation caught by the spec.
    return { status: result.status };
  }
}
